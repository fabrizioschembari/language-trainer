
const LANGS = {
  it: { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  en: { code: 'en', name: 'Inglese', flag: '🇬🇧' },
  es: { code: 'es', name: 'Spagnolo', flag: '🇪🇸' },
  fr: { code: 'fr', name: 'Francese', flag: '🇫🇷' },
  de: { code: 'de', name: 'Tedesco', flag: '🇩🇪' },
  ja: { code: 'ja', name: 'Giapponese', flag: '🇯🇵' },
  zh: { code: 'zh', name: 'Cinese', flag: '🇨🇳' },
  ko: { code: 'ko', name: 'Coreano', flag: '🇰🇷' },
  pt: { code: 'pt', name: 'Portoghese', flag: '🇵🇹' },
  ru: { code: 'ru', name: 'Russo', flag: '🇷🇺' },
  ar: { code: 'ar', name: 'Arabo', flag: '🇸🇦' },
  hi: { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  nl: { code: 'nl', name: 'Olandese', flag: '🇳🇱' },
  sv: { code: 'sv', name: 'Svedese', flag: '🇸🇪' },
  no: { code: 'no', name: 'Norvegese', flag: '🇳🇴' },
  da: { code: 'da', name: 'Danese', flag: '🇩🇰' },
  fi: { code: 'fi', name: 'Finlandese', flag: '🇫🇮' },
  pl: { code: 'pl', name: 'Polacco', flag: '🇵🇱' },
  tr: { code: 'tr', name: 'Turco', flag: '🇹🇷' },
  el: { code: 'el', name: 'Greco', flag: '🇬🇷' },
  he: { code: 'he', name: 'Ebraico', flag: '🇮🇱' }
};

const DB_NAME = 'langTrainerDB';
const DB_VERSION = 1;

let STR = {};
let db = null;
let dbReady = false;
let stringsReady = false;
let dictionary = null;
let refLang = null;
let allWords = [];
let directionTargetToRef = true;
let editingWordId = null;

const params = new URLSearchParams(window.location.search);
const dictId = Number(params.get('id'));

const dictTitle = document.getElementById('dictTitle');
const dictSubtitle = document.getElementById('dictSubtitle');
const searchInput = document.getElementById('searchInput');
const chaptersEl = document.getElementById('chapters');
const backBtn = document.getElementById('backBtn');

const btnAddWordDict = document.getElementById('btnAddWordDict');

const leftFlag = document.getElementById('leftFlag');
const leftName = document.getElementById('leftName');
const rightFlag = document.getElementById('rightFlag');
const rightName = document.getElementById('rightName');
const swapBtn = document.getElementById('swapBtn');

const addWordSheet = document.getElementById('addWordSheetDict');
const txtDictAddWordTitle = document.getElementById('txtDictAddWordTitle');
const txtDictAddWordSubtitle = document.getElementById('txtDictAddWordSubtitle');
const sheetSrcLabel = document.getElementById('sheetSrcLabel');
const sheetDstLabel = document.getElementById('sheetDstLabel');
const sheetSrcTerm = document.getElementById('sheetSrcTerm');
const sheetDstTerm = document.getElementById('sheetDstTerm');
const cancelAddWordDict = document.getElementById('cancelAddWordDict');
const confirmAddWordDict = document.getElementById('confirmAddWordDict');

// strings
fetch('strings.json')
  .then(r => r.json())
  .then(data => {
    STR = data;
    stringsReady = true;
    applyStrings();
    tryInit();
  })
  .catch(() => {
    STR = {};
    stringsReady = true;
    tryInit();
  });

// DB
const openReq = indexedDB.open(DB_NAME, DB_VERSION);
openReq.onupgradeneeded = (e) => {
  db = e.target.result;
  if (!db.objectStoreNames.contains('dictionaries')) {
    db.createObjectStore('dictionaries', { keyPath: 'id', autoIncrement: true });
  }
  if (!db.objectStoreNames.contains('words')) {
    const w = db.createObjectStore('words', { keyPath: 'id', autoIncrement: true });
    w.createIndex('by_dict', 'dictId');
  }
};
openReq.onsuccess = (e) => {
  db = e.target.result;
  dbReady = true;
  tryInit();
};
openReq.onerror = () => console.error('DB error');

function applyStrings() {
  searchInput.placeholder = STR.dict_search_placeholder || searchInput.placeholder;
  btnAddWordDict.textContent = STR.dict_btn_add_word || btnAddWordDict.textContent;
  txtDictAddWordTitle.textContent = STR.sheet_dict_add_word_title || txtDictAddWordTitle.textContent;
  sheetSrcLabel.textContent = STR.label_from || sheetSrcLabel.textContent;
  sheetDstLabel.textContent = STR.label_to || sheetDstLabel.textContent;
  cancelAddWordDict.textContent = STR.sheet_dict_add_word_cancel || cancelAddWordDict.textContent;
  confirmAddWordDict.textContent = STR.sheet_dict_add_word_save || confirmAddWordDict.textContent;
}

function tryInit() {
  if (!dbReady || !stringsReady) return;
  if (!dictId) {
    window.location.href = 'index.html';
    return;
  }
  loadDictionary();
}

function loadDictionary() {
  const tx = db.transaction('dictionaries', 'readonly');
  const store = tx.objectStore('dictionaries');
  const req = store.get(dictId);
  req.onsuccess = () => {
    dictionary = req.result;
    if (!dictionary) {
      alert('Dizionario non trovato');
      window.location.href = 'index.html';
      return;
    }
    const refCode = dictionary.refLang || 'it';
    refLang = LANGS[refCode] || { code: refCode, name: refCode, flag: '📗' };
    const targetLang = LANGS[dictionary.targetLang] || { code: dictionary.targetLang, name: dictionary.targetLang, flag: '📘' };

    dictTitle.textContent = targetLang.name;
    dictSubtitle.textContent = `${targetLang.name} ↔ ${refLang.name}`;

    leftFlag.textContent = targetLang.flag;
    leftName.textContent = targetLang.name;
    rightFlag.textContent = refLang.flag;
    rightName.textContent = refLang.name;

    updateAddWordSubtitle();
    loadWords();
    attachEvents();
  };
}

function loadWords() {
  const tx = db.transaction('words', 'readonly');
  const store = tx.objectStore('words');
  const index = store.index('by_dict');
  const range = IDBKeyRange.only(dictId);
  const arr = [];
  index.openCursor(range).onsuccess = (e) => {
    const cursor = e.target.result;
    if (cursor) {
      arr.push(cursor.value);
      cursor.continue();
    } else {
      allWords = arr;
      renderChapters();
    }
  };
}

function viewPair(word) {
  if (directionTargetToRef) {
    return {
      id: word.id,
      sourceTerm: word.termTarget,
      targetTerm: word.termRef,
      termRef: word.termRef,
      termTarget: word.termTarget
    };
  } else {
    return {
      id: word.id,
      sourceTerm: word.termRef,
      targetTerm: word.termTarget,
      termRef: word.termRef,
      termTarget: word.termTarget
    };
  }
}

function renderChapters() {
  const q = (searchInput.value || '').toLowerCase();
  const pairs = allWords
    .map(w => viewPair(w))
    .filter(p => {
      if (!q) return true;
      return (p.sourceTerm || '').toLowerCase().includes(q);
    })
    .sort((a, b) => (a.sourceTerm || '').localeCompare(b.sourceTerm || '', 'it'));

  const grouped = {};
  pairs.forEach(p => {
    const ch = (p.sourceTerm || '').charAt(0).toUpperCase() || '#';
    if (!grouped[ch]) grouped[ch] = [];
    grouped[ch].push(p);
  });

  chaptersEl.innerHTML = '';
  Object.keys(grouped).sort().forEach(letter => {
    const card = document.createElement('div');
    card.className = 'chapter-card';
    const header = document.createElement('div');
    header.className = 'chapter-header';
    header.innerHTML = `
      <div class="chapter-letter">${letter}</div>
      <div class="chapter-count">${grouped[letter].length} ${(STR.dict_chapter_entries_suffix || 'voci')}</div>
    `;
    card.appendChild(header);

    grouped[letter].forEach(p => {
      const row = document.createElement('div');
      row.className = 'entry';
      row.dataset.id = p.id;

      const actions = document.createElement('div');
      actions.className = 'entry-actions';
      const editBtn = document.createElement('button');
      editBtn.className = 'entry-btn edit';
      editBtn.textContent = 'Modifica';
      const delBtn = document.createElement('button');
      delBtn.className = 'entry-btn delete';
      delBtn.textContent = 'Cancella';

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      const main = document.createElement('div');
      main.className = 'entry-main';
      main.innerHTML = `
        <div class="entry-source">${p.sourceTerm || ''}</div>
        <div class="entry-target">${p.targetTerm || ''}</div>
      `;

      row.appendChild(actions);
      row.appendChild(main);
      card.appendChild(row);

      setupEntrySwipe(row);
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startEditWord(p.id);
      });
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteWord(p.id);
      });

      row.addEventListener('click', () => {
        if (row.classList.contains('entry-swiped')) {
          row.classList.remove('entry-swiped');
        } else {
          startEditWord(p.id);
        }
      });
    });

    chaptersEl.appendChild(card);
  });
}

function updateDirectionUI() {
  const targetLang = LANGS[dictionary.targetLang] || { name: dictionary.targetLang, flag: '📘' };
  if (directionTargetToRef) {
    leftFlag.textContent = targetLang.flag;
    leftName.textContent = targetLang.name;
    rightFlag.textContent = refLang.flag;
    rightName.textContent = refLang.name;
  } else {
    leftFlag.textContent = refLang.flag;
    leftName.textContent = refLang.name;
    rightFlag.textContent = targetLang.flag;
    rightName.textContent = targetLang.name;
  }
  updateAddWordSubtitle();
  renderChapters();
}

function updateAddWordSubtitle() {
  const targetLang = LANGS[dictionary.targetLang] || { name: dictionary.targetLang };
  const srcLang = directionTargetToRef ? targetLang : refLang;
  const dstLang = directionTargetToRef ? refLang : targetLang;

  txtDictAddWordSubtitle.textContent = `Da ${srcLang.name} a ${dstLang.name}`;
  sheetSrcLabel.textContent = `${STR.label_from || 'Da'} (${srcLang.name})`;
  sheetDstLabel.textContent = `${STR.label_to || 'A'} (${dstLang.name})`;
  sheetSrcTerm.placeholder = srcLang.name;
  sheetDstTerm.placeholder = dstLang.name;
}

function startEditWord(id) {
  const w = allWords.find(w => w.id === id);
  if (!w) return;
  editingWordId = id;
  if (directionTargetToRef) {
    sheetSrcTerm.value = w.termTarget || '';
    sheetDstTerm.value = w.termRef || '';
  } else {
    sheetSrcTerm.value = w.termRef || '';
    sheetDstTerm.value = w.termTarget || '';
  }
  updateAddWordSubtitle();
  addWordSheet.classList.remove('hidden');
}

function deleteWord(id) {
  if (!confirm('Eliminare questa parola?')) return;
  const tx = db.transaction('words', 'readwrite');
  const store = tx.objectStore('words');
  store.delete(id);
  tx.oncomplete = () => {
    allWords = allWords.filter(w => w.id !== id);
    renderChapters();
  };
}

// swipe helper per righe vocaboli
function setupEntrySwipe(row) {
  let startX = 0;
  let currentX = 0;

  row.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    startX = t.clientX;
    currentX = startX;
    document.querySelectorAll('.entry.entry-swiped').forEach(el => {
      if (el !== row) el.classList.remove('entry-swiped');
    });
  });

  row.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    currentX = t.clientX;
  });

  row.addEventListener('touchend', () => {
    const dx = currentX - startX;
    if (dx < -40) {
      row.classList.add('entry-swiped');
    } else if (dx > 40) {
      row.classList.remove('entry-swiped');
    }
  });
}

// events
function attachEvents() {
  backBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  searchInput.addEventListener('input', renderChapters);

  swapBtn.addEventListener('click', () => {
    directionTargetToRef = !directionTargetToRef;
    updateDirectionUI();
  });

  btnAddWordDict.addEventListener('click', () => {
    editingWordId = null;
    sheetSrcTerm.value = '';
    sheetDstTerm.value = '';
    updateAddWordSubtitle();
    addWordSheet.classList.remove('hidden');
  });

  cancelAddWordDict.addEventListener('click', () => {
    addWordSheet.classList.add('hidden');
    editingWordId = null;
  });

  addWordSheet.addEventListener('click', (e) => {
    if (e.target === addWordSheet) {
      addWordSheet.classList.add('hidden');
      editingWordId = null;
    }
  });

  confirmAddWordDict.addEventListener('click', () => {
    const src = sheetSrcTerm.value.trim();
    const dst = sheetDstTerm.value.trim();
    if (!src || !dst) return;

    let termRef, termTarget;
    if (directionTargetToRef) {
      termTarget = src;
      termRef = dst;
    } else {
      termRef = src;
      termTarget = dst;
    }

    const tx = db.transaction('words', 'readwrite');
    const store = tx.objectStore('words');

    if (editingWordId != null) {
      const existing = allWords.find(w => w.id === editingWordId);
      if (!existing) return;
      existing.termRef = termRef;
      existing.termTarget = termTarget;
      store.put(existing);
    } else {
      store.add({
        dictId,
        termRef,
        termTarget,
        createdAt: Date.now()
      });
    }

    tx.oncomplete = () => {
      addWordSheet.classList.add('hidden');
      editingWordId = null;
      loadWords();
    };
  });
}
