import { EPUB } from './epub.js';
import { DEFAULT_ENCODINGS, DEFAULT_PATTERNS, DEFAULT_MAX_TITLE_LENGTH } from './constant.js';

const fileInput = document.getElementById("fileInput");
const fileSelector = document.getElementById("fileSelector");
const patternInput = document.getElementById("patternInput");
const maxTitleLengthInput = document.getElementById("maxTitleLength");
const chapterCleanup = document.getElementById("chapterCleanup");
const refreshBtn = document.getElementById("refreshBtn");
const generateBtn = document.getElementById("generateBtn");
const fileNameContainer = document.getElementById("fileNameInput");
const toggleBtn = document.getElementById("togglePreview");
const previewSection = document.getElementById("previewSection");
const toggleIcon = document.getElementById("toggleIcon");

let isOpen = true;
let files = [];
let fileDataMap = new Map();
let orderedFileNames = [];     // 儲存有序檔名


document.addEventListener("DOMContentLoaded", () => {
  patternInput.value = DEFAULT_PATTERNS;
  maxTitleLengthInput.value = DEFAULT_MAX_TITLE_LENGTH;
});

zipCheckbox.addEventListener("change", () => {
  zipNameInput.style.display = zipCheckbox.checked ? "block" : "none";
  // 若選取 zip，取消 merge 並觸發其 change
  if (zipCheckbox.checked && mergeCheckbox.checked) {
    mergeCheckbox.checked = false;
    mergeCheckbox.dispatchEvent(new Event("change"));
  }
});

mergeCheckbox.addEventListener("change", () => {
  const shouldMerge = mergeCheckbox.checked;
  // disable all file inputs if merge is selected
  fileNameContainer.querySelectorAll("input[type='text']").forEach(input => {
    input.disabled = shouldMerge ? true : false;
  });

  mergedNameInput.style.display = shouldMerge ? "block" : "none";
  // 若選取 merge，取消 zip 並觸發其 change
  if (shouldMerge && zipCheckbox.checked) {
    zipCheckbox.checked = false;
    zipCheckbox.dispatchEvent(new Event("change"));
  }
});


toggleBtn.addEventListener("click", (e) => {
  e.preventDefault();
  isOpen = !isOpen;
  if (isOpen) {
    previewSection.style.display = "block";
    previewSection.style.maxHeight = previewSection.scrollHeight + "px";
    toggleIcon.textContent = "▲";
  } else {
    previewSection.style.maxHeight = "0px";
    toggleIcon.textContent = "▼";
    // 延遲隱藏整個元素，等動畫結束
    setTimeout(() => {
      if (!isOpen) previewSection.style.display = "none";
    }, 400);
  }
});

fileInput.addEventListener("change", async () => {
  files = Array.from(fileInput.files);
  fileSelector.innerHTML = `<option selected disabled>請選擇檔案</option>`;
  fileNameContainer.innerHTML = "";
  fileDataMap.clear();

  for (const file of files) {
    const text = await tryReadFile(file);
    const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
    const convertedText = await converter(text);
    let baseName = file.name.replace(/\.txt$/i, "");

    baseName = await converter(baseName);

    fileDataMap.set(file.name, {
      rawText: convertedText,
      chapterTitles: [],
      chapterContents: [],
      outputName: `${baseName}.epub`
    });
    orderedFileNames.push(file.name); // 加入順序

    const group = document.createElement("div");
    group.className = "d-flex align-items-center mb-2 gap-2 draggable";
    group.dataset.filename = file.name;

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

    appendFileSelectorOption(file.name);
    parseChapters(fileDataMap.get(file.name));
  }

  fileSelector.value = files[0].name;
  const firstFileData = fileDataMap.get(files[0].name);
  if (firstFileData) {
    initChapterList(firstFileData);
  }

  makeSortable(fileNameContainer);
});

// 加入拖曳排序功能
function makeSortable(container) {
  new Sortable(container, {
    animation: 150,
    ghostClass: "sortable-ghost",
    onEnd: function () {
      const newOrder = [];
      const children = container.querySelectorAll(".draggable");
      children.forEach(child => {
        const name = child.dataset.filename;
        const file = files.find(f => f.name === name);
        if (file) newOrder.push(file);
        orderedFileNames = Array.from(container.querySelectorAll("input[data-filename]")).map(input => input.dataset.filename);
        console.log(orderedFileNames);
      });
      files = newOrder;
    }
  });
}

// ➕ 加入檔案選單選項
function appendFileSelectorOption(fileName) {
  const option = document.createElement("option");
  option.value = fileName;
  option.textContent = fileName;
  fileSelector.appendChild(option);
}

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
  const merge = mergeCheckbox.checked;
  const zip = zipCheckbox.checked;

  if (merge) {
    const merged = new EPUB();
    let mergedName = mergedNameInput.value.trim() || "merged.epub";
    // add extension if not exist
    if (!mergedName.endsWith(".epub")) {
      mergedName += ".epub";
    }
    else if (mergedName.endsWith(".zip")) {
      mergedName = mergedName.slice(0, -4) + ".epub";
    }

    for (const fileName of orderedFileNames) {
      const data = fileDataMap.get(fileName);
      for (let i = 0; i < data.chapterTitles.length; i++) {
        merged.add_chapter(data.chapterTitles[i], data.chapterContents[i]);
      }
    }
    merged.generate(mergedName);
    return;
  }

  if (zip) {
    const zipInstance = new JSZip();
    for (const fileName of orderedFileNames) {
      const data = fileDataMap.get(fileName);
      const epub = new EPUB();
      for (let i = 0; i < data.chapterTitles.length; i++) {
        epub.add_chapter(data.chapterTitles[i], data.chapterContents[i]);
      }
      const blob = epub.generateBlob();
      zipInstance.file(data.outputName, blob);
    }
    zipInstance.generateAsync({ type: "blob" }).then(content => {
      const a = document.createElement("a");
      const url = URL.createObjectURL(content);
      a.href = url;
      a.download = (zipNameInput.value.trim() || "output") + ".zip";
      a.click();
      URL.revokeObjectURL(url);
    });
    return;
  }

  for (const fileName of orderedFileNames) {
    const data = fileDataMap.get(fileName);
    const epub = new EPUB();
    for (let i = 0; i < data.chapterTitles.length; i++) {
      epub.add_chapter(data.chapterTitles[i], data.chapterContents[i]);
    }
    epub.generate(data.outputName);
  }
});

function parseChapters(data) {
  const lines = data.rawText.split(/\r?\n/);

  const patternInputs = patternInput.value.split(/\r?\n/);
  const patterns = (patternInputs.length === 1 && patternInputs[0] === "")
    ? new Array()
    : patternInputs.map(p => new RegExp(p));
  
  const maxLength = parseInt(maxTitleLengthInput.value) || DEFAULT_MAX_TITLE_LENGTH;
  const keywordsToRemove = chapterCleanup.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

  data.chapterTitles = [];
  data.chapterContents = [];

  let currentTitle = data.name;
  let lastTitle = "";
  let buffer = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty patterns
    let isMatch = (patterns.length == 0) ? false : patterns.some(pat => pat.test(line) && line.length <= maxLength);
    if (isMatch) {
      // 僅獲得符合模式的部分
      currentTitle = patterns.reduce((acc, pat) => {
        const match = line.match(pat);
        return match ? match[0] : acc;
      }, line.trim());
      
      if (lastTitle === currentTitle) {
        continue;
      }

      if (lastTitle != "" && buffer.some(line => line.trim())) {
        data.chapterContents.push(buffer.join("\n"));
        buffer = [];
      }
      lastTitle = currentTitle;
      for (const keyword of keywordsToRemove) {
        currentTitle = currentTitle.replaceAll(keyword, "");
      }

      data.chapterTitles.push(currentTitle);
    } 
    else {
      buffer.push(line);
    }
  }
  if (data.chapterTitles.length === 0) {
    data.chapterTitles.push(lines[0].trim());
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
    filteredIndices = data.chapterTitles.map((title, i) => ({ title, i }))
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