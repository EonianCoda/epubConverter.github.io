// main.js
import { EPUB } from './epub.js';

const fileInput = document.getElementById("fileInput");
const patternInput = document.getElementById("patternInput");
const maxTitleLengthInput = document.getElementById("maxTitleLength");
const fileNameInput = document.getElementById("fileNameInput");
const chapterPreview = document.getElementById("chapterPreview");
const chapterCleanup = document.getElementById("chapterCleanup"); // 新增刪除關鍵字輸入框
const generateBtn = document.getElementById("generateBtn");

let chapterTitles = [];
let chapterContents = [];
let rawText = "";
let filteredIndices = [];
let selectedChapterIndex = null; // 儲存目前選中的章節索引

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("patternInput").value = `(\\d)+[章卷話]
第[一二三四五六七八九十千百零兩]+[章卷話]
序章`;
  document.getElementById("maxTitleLength").value = 35;
});

fileInput.addEventListener("change", async function () {
  const file = fileInput.files[0];
  if (!file) return;
  fileNameInput.value = file.name.replace(/\.txt$/i, ".epub");

  // 嘗試使用不同編碼讀取檔案
  const text = await tryReadFile(file);
  const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
  rawText = await converter(text);
  parseChapters(rawText);
});

if (refreshBtn) {
  refreshBtn.addEventListener("click", function () {
    if (rawText) parseChapters(rawText);
  });
}

generateBtn.addEventListener("click", function () {
  const fileName = fileNameInput.value.trim() || "output.epub";

  const epub = new EPUB();
  for (let i = 0; i < chapterTitles.length; i++) {
    epub.add_chapter(chapterTitles[i], chapterContents[i]);
  }
  epub.generate(fileName);
});

function parseChapters(text) {
  const lines = text.split(/\r?\n/);
  const patterns = patternInput.value.split(/\r?\n/).map(p => new RegExp(p));
  const maxLength = parseInt(maxTitleLengthInput.value) || 15;
  const keywordsToRemove = chapterCleanup.value
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);

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
      if (buffer.length > 0 && buffer.some(line => line.trim() !== "")) {
        chapterContents.push(buffer.join("\n"));
      }
      buffer = [];
      currentTitle = line;

      for (const keyword of keywordsToRemove) {
        if (currentTitle.includes(keyword)) {
          currentTitle = currentTitle.replaceAll(keyword, "");
        }
      }

      chapterTitles.push(currentTitle);
    } else {
      buffer.push(line);
    }
  }

  if (buffer.length > 0 && buffer.some(line => line.trim() !== "")) {
    chapterContents.push(buffer.join("\n"));
  }
  
  initChapterList();
}

function updateChapterPreview() {
  const listContainer = document.getElementById("chapterList");
  const contentViewer = document.getElementById("chapterContent");
  listContainer.innerHTML = "";
  contentViewer.textContent = "";

  filteredIndices.forEach(i => {
    const btn = document.createElement("button");
    btn.textContent = `${i + 1}. ${chapterTitles[i]}`;
    btn.className = "list-group-item list-group-item-action";
    btn.dataset.index = i;

    if (i === selectedChapterIndex) {
      btn.classList.add("active");
    }

    btn.addEventListener("click", () => {
      // 更新選中的索引與內容
      selectedChapterIndex = i;
      contentViewer.textContent = chapterContents[i];

      // 移除所有高亮
      document.querySelectorAll("#chapterList button").forEach(b => {
        b.classList.remove("active");
      });
      // 新增目前的高亮
      btn.classList.add("active");
    });

    listContainer.appendChild(btn);
  });

  // 若有已選中的章節，預設顯示內容
  if (selectedChapterIndex !== null) {
    contentViewer.textContent = chapterContents[selectedChapterIndex];
  }
}



// 初始化 filteredIndices 並更新畫面
function initChapterList() {
  filteredIndices = chapterTitles.map((_, i) => i);
  updateChapterPreview();
}

// 搜尋功能
document.getElementById("searchChapterInput").addEventListener("input", function () {
  const query = this.value.trim().toLowerCase();
  filteredIndices = chapterTitles
    .map((title, i) => ({ title, i }))
    .filter(obj => obj.title.toLowerCase().includes(query))
    .map(obj => obj.i);
  updateChapterPreview();
});

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
          console.error(`讀取文件錯誤（${encoding}）: `, e);
          index++;
          readNextEncoding();
        };

        reader.readAsArrayBuffer(file);
      } else {
        reject('無法使用指定的編碼讀取檔案');
      }
    }

    readNextEncoding();
  });
}
