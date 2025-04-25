import { EPUB } from './epub.js';
import { DEFAULT_ENCODINGS, DEFAULT_PATTERNS, DEFAULT_MAX_TITLE_LENGTH } from './constant.js';
const fileInput = document.getElementById("fileInput");
const fileSelector = document.getElementById("fileSelector");
const patternInput = document.getElementById("patternInput");
const maxTitleLengthInput = document.getElementById("maxTitleLength");
const chapterCleanup = document.getElementById("chapterCleanup");
const refreshBtn = document.getElementById("refreshBtn");
const generateBtn = document.getElementById("generateBtn");
const fileNameContainer = document.getElementById("fileNameInput"); // 將其視為容器

let files = [];
let fileDataMap = new Map(); // 每個檔案對應章節與設定

document.addEventListener("DOMContentLoaded", () => {
  patternInput.value = DEFAULT_PATTERNS;
  maxTitleLengthInput.value = DEFAULT_MAX_TITLE_LENGTH;
});

// ⬆️ 當使用者上傳多個檔案
fileInput.addEventListener("change", async () => {
  files = Array.from(fileInput.files);
  fileSelector.innerHTML = `<option selected disabled>請選擇檔案</option>`;
  fileNameContainer.innerHTML = "";

  fileDataMap.clear();
  for (const file of files) {
    const text = await tryReadFile(file);
    const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
    const convertedText = await converter(text);
    const baseName = file.name.replace(/\.txt$/i, "");

    fileDataMap.set(file.name, {
      rawText: convertedText,
      chapterTitles: [],
      chapterContents: [],
      outputName: `${baseName}.epub`
    });

    const option = document.createElement("option");
    option.value = file.name;
    option.textContent = file.name;
    fileSelector.appendChild(option);

    const group = document.createElement("div");
    group.className = "d-flex align-items-center mb-2 gap-2";

    const label = document.createElement("span");
    label.textContent = file.name;
    label.className = "badge bg-secondary";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control";
    input.value = `${baseName}.epub`;
    input.dataset.filename = file.name;

    input.addEventListener("input", () => {
      fileDataMap.get(file.name).outputName = input.value.trim();
    });

    group.appendChild(label);
    group.appendChild(input);
    fileNameContainer.appendChild(group);

    parseChapters(fileDataMap.get(file.name));
  }
  fileSelector.value = files[0].name; // 預設選擇第一個檔案
  const firstFileData = fileDataMap.get(files[0].name);
  if (firstFileData) {
    initChapterList(firstFileData);
  }
});

// ⬇️ 檔案切換下拉選單
fileSelector.addEventListener("change", () => {
  const selectedFile = fileSelector.value;
  const fileData = fileDataMap.get(selectedFile);
  if (!fileData) return;
  parseChapters(fileData);
  initChapterList(fileData);
});

refreshBtn.addEventListener("click", () => {
  const selectedFile = fileSelector.value;
  const fileData = fileDataMap.get(selectedFile);
  if (fileData) {
    parseChapters(fileData);
    initChapterList(fileData);
  }
});

generateBtn.addEventListener("click", () => {
  for (const [filename, data] of fileDataMap.entries()) {
    const epub = new EPUB();
    for (let i = 0; i < data.chapterTitles.length; i++) {
      epub.add_chapter(data.chapterTitles[i], data.chapterContents[i]);
    }
    epub.generate(data.outputName);
  }
});

function parseChapters(data) {
  const lines = data.rawText.split(/\r?\n/);
  const patterns = patternInput.value.split(/\r?\n/).map(p => new RegExp(p));
  const maxLength = parseInt(maxTitleLengthInput.value) || 35;
  const keywordsToRemove = chapterCleanup.value
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);

  data.chapterTitles = [];
  data.chapterContents = [];

  let currentTitle = "前言";
  let buffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    let isMatch = patterns.some(pat => pat.test(line) && line.length <= maxLength);

    if (isMatch) {
      if (buffer.some(line => line.trim())) {
        data.chapterContents.push(buffer.join("\n"));
      }
      buffer = [];
      currentTitle = line;

      for (const keyword of keywordsToRemove) {
        currentTitle = currentTitle.replaceAll(keyword, "");
      }

      data.chapterTitles.push(currentTitle);
    } else {
      buffer.push(line);
    }
  }

  if (buffer.some(line => line.trim())) {
    data.chapterContents.push(buffer.join("\n"));
  }
}

function initChapterList(data) {
  const listContainer = document.getElementById("chapterList");
  const contentViewer = document.getElementById("chapterContent");
  const searchInput = document.getElementById("searchChapterInput");

  listContainer.innerHTML = "";
  contentViewer.textContent = "";
  let filteredIndices = data.chapterTitles.map((_, i) => i);

  function updateChapterPreview() {
    listContainer.innerHTML = "";
    contentViewer.textContent = "";
    filteredIndices.forEach(i => {
      const btn = document.createElement("button");
      btn.textContent = `${i + 1}. ${data.chapterTitles[i]}`;
      btn.className = "list-group-item list-group-item-action";
      btn.addEventListener("click", () => {
        contentViewer.textContent = data.chapterContents[i];
        listContainer.querySelectorAll("button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
      listContainer.appendChild(btn);
    });
  }

  searchInput.addEventListener("input", function () {
    const query = this.value.trim().toLowerCase();
    filteredIndices = data.chapterTitles
      .map((title, i) => ({ title, i }))
      .filter(obj => obj.title.toLowerCase().includes(query))
      .map(obj => obj.i);
    updateChapterPreview();
  });

  updateChapterPreview();
}

function tryReadFile(file) {
  let index = 0;
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    function readNextEncoding() {
      if (index < DEFAULT_ENCODINGS.length) {
        const encoding = DEFAULT_ENCODINGS[index];
        reader.onload = function (event) {
          try {
            const arrayBuffer = event.target.result;
            const decoder = new TextDecoder(encoding, { fatal: true });
            resolve(decoder.decode(arrayBuffer));
          } catch (e) {
            index++;
            readNextEncoding();
          }
        };
        reader.onerror = () => {
          index++;
          readNextEncoding();
        };
        reader.readAsArrayBuffer(file);
      } else {
        reject("無法使用指定的編碼讀取檔案");
      }
    }
    readNextEncoding();
  });
}
