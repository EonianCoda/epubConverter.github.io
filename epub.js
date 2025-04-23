// epub.js
import JSZip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm";

export class EPUB {
  constructor() {
    this.zip = new JSZip();
    this.chapters = [];
  }

  add_chapter(title, content) {
    this.chapters.push({ title, content });
  }

  async generate(fileName = "output.epub") {
    this.title = fileName.replace(/\.epub$/, "");
    this.#generate_structure();

    const blob = await this.zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  #generate_structure() {
    this.zip.file("mimetype", "application/epub+zip");
    const META_INF = this.zip.folder("META-INF");
    META_INF.file("container.xml", `<?xml version='1.0' encoding='utf-8'?>
  <container version='1.0' xmlns='urn:oasis:names:tc:opendocument:xmlns:container'>
    <rootfiles>
      <rootfile full-path='OEBPS/content.opf' media-type='application/oebps-package+xml'/>
    </rootfiles>
  </container>`);
  
    const OEBPS = this.zip.folder("OEBPS");
    const tocItems = [];
    const manifestItems = [];
    const spineItems = [];
  
    this.chapters.forEach((chap, index) => {
      // 檢查 content 是否有效，若無效則跳過
      if (!chap.content) {
        console.warn(`Chapter ${index + 1} content is undefined or empty, skipping this chapter.`);
        return; // 跳過此章節
      }
  
      const paragraphs = chap.content
        .split(/\n+/) // 將章節內容分割成段落
        .map(line => line.trim())
        .filter(line => line)
        .map(line => `<p>${line}</p>`) // 每行變成一段落以增加行距
        .join("\n");
  
      const html = `<?xml version='1.0' encoding='utf-8'?>
  <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <title>${chap.title}</title>
    </head>
    <body>
      <h2>${chap.title}</h2>
      ${paragraphs}
    </body>
  </html>`;
      OEBPS.file(`chap${index + 1}.xhtml`, html);
  
      tocItems.push(`<navPoint id='chap${index + 1}' playOrder='${index + 1}'>
    <navLabel><text>${chap.title}</text></navLabel>
    <content src='chap${index + 1}.xhtml'/>
  </navPoint>`);
      manifestItems.push(`<item id='chap${index + 1}' href='chap${index + 1}.xhtml' media-type='application/xhtml+xml'/>`);
      spineItems.push(`<itemref idref='chap${index + 1}'/>`);
    });
  
    // TOC
    OEBPS.file("toc.ncx", `<?xml version='1.0' encoding='UTF-8'?>
  <ncx xmlns='http://www.daisy.org/z3986/2005/ncx/' version='2005-1'>
    <head>
      <meta name='dtb:uid' content='id123456'/>
      <meta name='dtb:depth' content='1'/>
      <meta name='dtb:totalPageCount' content='0'/>
      <meta name='dtb:maxPageNumber' content='0'/>
    </head>
    <docTitle><text>${this.title}</text></docTitle>
    <navMap>
      ${tocItems.join("\n")}
    </navMap>
  </ncx>`);
  
    // content.opf
    OEBPS.file("content.opf", `<?xml version='1.0' encoding='utf-8'?>
  <package xmlns='http://www.idpf.org/2007/opf' version='3.0' unique-identifier='BookId'>
    <metadata xmlns:dc='http://purl.org/dc/elements/1.1/'>
      <dc:title>${this.title}</dc:title>
      <dc:language>zh</dc:language>
      <dc:identifier id='BookId'>id123456</dc:identifier>
    </metadata>
    <manifest>
      <item id='ncx' href='toc.ncx' media-type='application/x-dtbncx+xml'/>
      ${manifestItems.join("\n")}
    </manifest>
    <spine toc='ncx'>
      ${spineItems.join("\n")}
    </spine>
  </package>`);
  }
}
