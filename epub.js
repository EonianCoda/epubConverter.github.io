export class EPUB {
    constructor() {
      this.zip = new JSZip();
      this.chapters = [];
      this.uuid = this.generate_uuid();
      this.title = "My Book";
      this.author = "Unknown";
    }
  
    add_chapter(title, content) {
      const index = this.chapters.length + 1;
      this.chapters.push({
        id: `chapter${index}`,
        title,
        content: this.wrap_html(title, content),
        filename: `chapter${index}.xhtml`
      });
    }
  
    wrap_html(title, content) {
      return `<?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE html>
  <html xmlns="http://www.w3.org/1999/xhtml" lang="zh-Hant">
    <head>
      <meta charset="utf-8"/>
      <title>${title}</title>
    </head>
    <body>
      <h2>${title}</h2>
      <p>${content.replace(/\n+/g, "</p><p>")}</p>
    </body>
  </html>`;
    }
  
    async generate_epub() {
      this.zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  
      // META-INF/container.xml
      this.zip.folder("META-INF").file("container.xml", `<?xml version="1.0" encoding="UTF-8"?>
  <container version="1.0"
      xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
      <rootfile full-path="OEBPS/package.opf"
          media-type="application/oebps-package+xml"/>
    </rootfiles>
  </container>`);
  
      const oebps = this.zip.folder("OEBPS");
  
      // 章節內容檔案
      for (const chapter of this.chapters) {
        oebps.file(chapter.filename, chapter.content);
      }
  
      // toc.xhtml (目錄)
      oebps.file("toc.xhtml", this.generate_toc());
  
      // package.opf
      oebps.file("package.opf", this.generate_opf());
  
      return this.zip;
    }
  
    generate_toc() {
      const navItems = this.chapters.map(c => `
        <li><a href="${c.filename}">${c.title}</a></li>`).join("\n");
  
      return `<?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE html>
  <html xmlns="http://www.w3.org/1999/xhtml"
        xmlns:epub="http://www.idpf.org/2007/ops">
    <head><title>目錄</title></head>
    <body>
      <nav epub:type="toc" id="toc">
        <h1>目錄</h1>
        <ol>
          ${navItems}
        </ol>
      </nav>
    </body>
  </html>`;
    }
  
    generate_opf() {
      const manifestItems = this.chapters.map(c => `
      <item id="${c.id}" href="${c.filename}" media-type="application/xhtml+xml"/>`).join("\n");
  
      const spineItems = this.chapters.map(c => `
      <itemref idref="${c.id}"/>`).join("\n");
  
      return `<?xml version="1.0" encoding="UTF-8"?>
  <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:identifier id="bookid">${this.uuid}</dc:identifier>
      <dc:title>${this.title}</dc:title>
      <dc:language>zh-Hant</dc:language>
      <dc:creator>${this.author}</dc:creator>
    </metadata>
    <manifest>
      <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
      ${manifestItems}
    </manifest>
    <spine>
      <itemref idref="toc"/>
      ${spineItems}
    </spine>
  </package>`;
    }
  
    generate_uuid() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  }
  