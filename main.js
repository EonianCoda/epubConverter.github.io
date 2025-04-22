// main.js
import { EPUB } from './epub.js';

const fileInput = document.getElementById("fileInput");
const patternInput = document.getElementById("patternInput");
const maxTitleLengthInput = document.getElementById("maxTitleLength");
const titleInput = document.getElementById("titleInput");
const fileNameInput = document.getElementById("fileNameInput");
const chapterPreview = document.getElementById("chapterPreview");
const generateBtn = document.getElementById("generateBtn");

let chapterTitles = [];
let chapterContents = [];

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("patternInput").value = `(\d)+[章卷話]
第[一二三四五六七八九十千百零兩]+[章卷話]
序章`;
  document.getElementById("maxTitleLength").value = 15;
});

fileInput.addEventListener("change", async function () {
  const file = fileInput.files[0];
  if (!file) return;
  fileNameInput.value = file.name.replace(/\.txt$/i, ".epub");

  // 嘗試使用不同編碼讀取檔案
  const text = await tryReadFile(file);
  const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
  const convertedText = await converter(text);
  parseChapters(convertedText);
});

generateBtn.addEventListener("click", function () {
  const bookTitle = titleInput.value.trim() || "未命名作品";
  const fileName = fileNameInput.value.trim() || "output.epub";

  const epub = new EPUB(bookTitle);
  for (let i = 0; i < chapterTitles.length; i++) {
    epub.add_chapter(chapterTitles[i], chapterContents[i]);
  }
  epub.generate(fileName);
});

function parseChapters(text) {
  const lines = text.split(/\r?\n/);
  const patterns = patternInput.value.split(/\r?\n/).map(p => new RegExp(p));
  const maxLength = parseInt(maxTitleLengthInput.value) || 15;

  chapterTitles = [];
  chapterContents = [];

  let currentTitle = "前言";
  let buffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    let isMatch = false;

    for (let pattern of patterns) {
      if (pattern.test(line) && line.length <= maxLength) {
        isMatch = true;
        break;
      }
    }

    if (isMatch) {
      // 當 buffer 內有內容時，將內容加入章節，如果 buffer 只包含空行則跳過
      if (buffer.length > 0 && buffer.some(line => line.trim() !== "")) {
        chapterContents.push(buffer.join("\n"));
      }
      buffer = [];
      currentTitle = line;
      chapterTitles.push(currentTitle);
    } else {
      buffer.push(line);
    }
  }

  // 如果 buffer 內有非空行內容，則加入最後的章節
  if (buffer.length > 0 && buffer.some(line => line.trim() !== "")) {
    chapterContents.push(buffer.join("\n"));
  }

  // Preview update
  chapterPreview.textContent = chapterTitles.map((t, i) => `${i + 1}. ${t}`).join("\n");
}

// 嘗試使用不同編碼讀取檔案的函數
function tryReadFile(file) {
  const encodings = ['utf-8', 'gbk', 'big5', 'utf-16', 'utf-16-le', 'utf-16-be'];
  const reader = new FileReader();
  let index = 0;

  return new Promise((resolve, reject) => {
    function readNextEncoding() {
      if (index < encodings.length) {
        const encoding = encodings[index];
        console.log(`嘗試使用編碼: ${encoding}`); // 輸出當前嘗試的編碼

        // 使用 FileReader 將檔案讀取為 ArrayBuffer
        reader.onload = function (event) {
          try {
            const arrayBuffer = event.target.result;
            const decoder = new TextDecoder(encoding, { fatal: true });
            const content = decoder.decode(arrayBuffer); // 使用 TextDecoder 解碼內容

            console.log(`成功使用編碼 ${encoding} 讀取檔案`); // 輸出成功訊息

            resolve(content); // 成功讀取，返回內容
          } catch (e) {
            console.error(`讀取文件時出錯（${encoding}）: `, e); // 輸出錯誤訊息
            // 解析錯誤，繼續嘗試下一個編碼
            index++;
            readNextEncoding();
          }
        };
        reader.onerror = function (e) {
          console.error(`讀取文件錯誤（${encoding}）: `, e); // 輸出錯誤訊息
          // 讀取錯誤時，繼續嘗試下一個編碼
          index++;
          readNextEncoding();
        };

        // 將檔案讀取為 ArrayBuffer
        reader.readAsArrayBuffer(file);
      } else {
        reject('無法使用指定的編碼讀取檔案');
      }
    }

    readNextEncoding();
  });
}