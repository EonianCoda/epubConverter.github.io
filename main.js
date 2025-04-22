import { EPUB } from "./epub.js";

document.getElementById("convertBtn").addEventListener("click", async () => {
  const fileInput = document.getElementById("txtFile");
  const patterns = document.getElementById("chapterPatterns").value.trim().split("\n").map(p => p.trim());
  const fileNameInput = document.getElementById("outputName").value.trim() || "output";

  if (!fileInput.files.length) {
    alert("請選擇一個 TXT 檔案！");
    return;
  }

  const file = fileInput.files[0];
  const text = await file.text();

  // 使用 opencc-js 進行簡轉繁
  const converter = await OpenCC.Converter({ from: 'cn', to: 'tw' });
  const convertedText = await converter(text);

  // 建立 EPUB 實例
  const epub = new EPUB();

  // 使用章節 pattern 分段
  const chapterRegex = new RegExp(`(${patterns.join('|')})`, 'g');
  const parts = convertedText.split(chapterRegex); // 包含章節標題與內容，交錯排列

  let currentTitle = null;
  let buffer = "";
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part == null || part.trim() === "") continue;
  
    if (patterns.some(p => new RegExp(`^${p}$`).test(part.trim()))) {
      if (currentTitle && buffer.trim()) {
        epub.add_chapter(currentTitle, buffer.trim());
      }
      currentTitle = part.trim();
      buffer = "";
    } else {
      buffer += part;
    }
  }
  
  if (currentTitle && buffer.trim()) {
    epub.add_chapter(currentTitle, buffer.trim());
  }
  

  // 產生並下載 EPUB
  const zip = await epub.generate_epub();
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${fileNameInput}.epub`;
  a.click();
});
