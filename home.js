
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
let currentRefLang = null;
let dictionaries = [];
let homeDirectionTargetToRef = true;

// elements
const refLangButton = document.getElementById('refLangButton');
const refLangFlag = document.getElementById('refLangFlag');
const refLangName = document.getElementById('refLangName');

const dictListEl = document.getElementById('dictList');
const emptyStateEl = document.getElementById('emptyState');

const refLangSheet = document.getElementById('refLangSheet');
const refLangOptions = document.getElementById('refLangOptions');
const btnCancelRefLang = document.getElementById('btnCancelRefLang');

const newLangSheet = document.getElementById('newLangSheet');
const newLangSelect = document.getElementById('newLangSelect');
const btnCancelNewLang = document.getElementById('btnCancelNewLang');
const btnConfirmNewLang = document.getElementById('btnConfirmNewLang');

const addWordSheet = document.getElementById('addWordSheet');
const dictSelectForWord = document.getElementById('dictSelectForWord');
const btnSwapHomeDir = document.getElementById('btnSwapHomeDir');
const dirHomeLeftFlag = document.getElementById('dirHomeLeftFlag');
const dirHomeLeftName = document.getElementById('dirHomeLeftName');
const dirHomeRightFlag = document.getElementById('dirHomeRightFlag');
const dirHomeRightName = document.getElementById('dirHomeRightName');
const labelHomeFrom = document.getElementById('labelHomeFrom');
const labelHomeTo = document.getElementById('labelHomeTo');
const srcTermHome = document.getElementById('srcTermHome');
const dstTermHome = document.getElementById('dstTermHome');
const btnCancelAddWord = document.getElementById('btnCancelAddWord');
const btnConfirmAddWord = document.getElementById('btnConfirmAddWord');
const btnExportBackup = document.getElementById('btnExportBackup');
const btnImportBackup = document.getElementById('btnImportBackup');
const backupFileInput = document.getElementById('backupFileInput');


// text holders
const txtSectionStudied = document.getElementById('txtSectionStudied');
const txtRefLangTitle = document.getElementById('txtRefLangTitle');
const txtRefLangSub = document.getElementById('txtRefLangSub');
const txtNewLangTitle = document.getElementById('txtNewLangTitle');
const txtNewLangSub = document.getElementById('txtNewLangSub');
const txtLabelLangToLearn = document.getElementById('txtLabelLangToLearn');
const txtAddWordTitle = document.getElementById('txtAddWordTitle');
const txtAddWordSub = document.getElementById('txtAddWordSub');
const txtLabelSelectDict = document.getElementById('txtLabelSelectDict');

// buttons
const btnAddLanguage = document.getElementById('btnAddLanguage');
const btnAddWord = document.getElementById('btnAddWord');

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
  if (!STR) return;
  txtSectionStudied.textContent = STR.section_studied_langs || txtSectionStudied.textContent;
  txtRefLangTitle.textContent = STR.sheet_ref_lang_title || txtRefLangTitle.textContent;
  txtRefLangSub.textContent = STR.sheet_ref_lang_subtitle || txtRefLangSub.textContent;
  btnCancelRefLang.textContent = STR.sheet_cancel || btnCancelRefLang.textContent;
  txtNewLangTitle.textContent = STR.sheet_new_lang_title || txtNewLangTitle.textContent;
  txtNewLangSub.textContent = STR.sheet_new_lang_subtitle || txtNewLangSub.textContent;
  txtLabelLangToLearn.textContent = STR.label_language_to_learn || txtLabelLangToLearn.textContent;
  btnCancelNewLang.textContent = STR.sheet_cancel || btnCancelNewLang.textContent;
  btnConfirmNewLang.textContent = STR.sheet_new_lang_confirm || btnConfirmNewLang.textContent;
  txtAddWordTitle.textContent = STR.sheet_add_word_title || txtAddWordTitle.textContent;
  txtAddWordSub.textContent = STR.sheet_add_word_subtitle || txtAddWordSub.textContent;
  txtLabelSelectDict.textContent = STR.label_select_dictionary || txtLabelSelectDict.textContent;
  labelHomeFrom.textContent = STR.label_from || labelHomeFrom.textContent;
  labelHomeTo.textContent = STR.label_to || labelHomeTo.textContent;
  btnCancelAddWord.textContent = STR.sheet_cancel || btnCancelAddWord.textContent;
  btnConfirmAddWord.textContent = STR.sheet_add_word_save || btnConfirmAddWord.textContent;
  emptyStateEl.textContent = STR.empty_no_langs || emptyStateEl.textContent;
}

function tryInit() {
  if (!dbReady || !stringsReady) return;
  initRefLang();
  buildRefLangSheet();
  buildNewLangOptions();
  loadDictionaries();
  attachEvents();
}

function initRefLang() {
  const saved = localStorage.getItem('refLangCode');
  let lang = LANGS[saved || 'it'];
  if (!lang) lang = LANGS['it'];
  currentRefLang = lang;
  updateRefLangDisplay();
}
function updateRefLangDisplay() {
  refLangFlag.textContent = currentRefLang.flag;
  refLangName.textContent = currentRefLang.name;
}

// REF LANG SHEET
function buildRefLangSheet() {
  refLangOptions.innerHTML = '';
  Object.values(LANGS)
    .sort((a, b) => a.name.localeCompare(b.name, 'it'))
    .forEach(lang => {
      const row = document.createElement('div');
      row.className = 'lang-row';
      row.innerHTML = `
        <div class="lang-left">
          <span class="lang-flag">${lang.flag}</span>
          <div>
            <div class="lang-name">${lang.name}</div>
            <div class="lang-code">${lang.code.toUpperCase()}</div>
          </div>
        </div>
        ${currentRefLang.code === lang.code ? `<span style="font-size:12px;color:#22c55e;">${STR.label_active || 'Attiva'}</span>` : ''}
      `;
      row.addEventListener('click', () => setRefLang(lang.code));
      refLangOptions.appendChild(row);
    });
}
function setRefLang(code) {
  const lang = LANGS[code];
  if (!lang) return;
  currentRefLang = lang;
  localStorage.setItem('refLangCode', code);
  updateRefLangDisplay();
  buildRefLangSheet();
  buildNewLangOptions();
  renderDictList();
  hideRefLangSheet();
}
function showRefLangSheet() { refLangSheet.classList.remove('hidden'); }
function hideRefLangSheet() { refLangSheet.classList.add('hidden'); }

// NEW LANG
function buildNewLangOptions() {
  newLangSelect.innerHTML = '';
  Object.values(LANGS)
    .filter(l => l.code !== currentRefLang.code)
    .sort((a, b) => a.name.localeCompare(b.name, 'it'))
    .forEach(lang => {
      const opt = document.createElement('option');
      opt.value = lang.code;
      opt.textContent = `${lang.name} ${lang.flag}`;
      newLangSelect.appendChild(opt);
    });
}
function showNewLangSheet() { newLangSheet.classList.remove('hidden'); }
function hideNewLangSheet() { newLangSheet.classList.add('hidden'); }

// ADD WORD FROM HOME
function showAddWordSheet() {
  const visibleDicts = dictionaries.filter(d => d.refLang === currentRefLang.code);
  if (!visibleDicts.length) {
    alert('Prima crea una lingua da imparare per questa lingua di riferimento.');
    return;
  }
  dictSelectForWord.innerHTML = '';
  visibleDicts.forEach(d => {
    const lang = LANGS[d.targetLang] || { name: d.targetLang, flag: '📘' };
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = `${lang.name} ${lang.flag}`;
    dictSelectForWord.appendChild(opt);
  });
  homeDirectionTargetToRef = true;
  srcTermHome.value = '';
  dstTermHome.value = '';
  updateHomeDirectionUI();
  addWordSheet.classList.remove('hidden');
}
function hideAddWordSheet() { addWordSheet.classList.add('hidden'); }

function updateHomeDirectionUI() {
  const id = Number(dictSelectForWord.value);
  const dict = dictionaries.find(d => d.id === id);
  if (!dict) return;
  const target = LANGS[dict.targetLang] || { name: dict.targetLang, flag: '📘' };
  const ref = LANGS[dict.refLang] || currentRefLang;

  const srcLang = homeDirectionTargetToRef ? target : ref;
  const dstLang = homeDirectionTargetToRef ? ref : target;

  dirHomeLeftFlag.textContent = srcLang.flag;
  dirHomeLeftName.textContent = srcLang.name;
  dirHomeRightFlag.textContent = dstLang.flag;
  dirHomeRightName.textContent = dstLang.name;

  labelHomeFrom.textContent = `${STR.label_from || 'Da'} (${srcLang.name})`;
  labelHomeTo.textContent = `${STR.label_to || 'A'} (${dstLang.name})`;

  srcTermHome.placeholder = srcLang.name;
  dstTermHome.placeholder = dstLang.name;
}

dictSelectForWord.addEventListener('change', updateHomeDirectionUI);
btnSwapHomeDir.addEventListener('click', () => {
  homeDirectionTargetToRef = !homeDirectionTargetToRef;
  updateHomeDirectionUI();
});

btnConfirmAddWord.addEventListener('click', () => {
  const id = Number(dictSelectForWord.value);
  const dict = dictionaries.find(d => d.id === id);
  if (!dict) return;

  const src = srcTermHome.value.trim();
  const dst = dstTermHome.value.trim();
  if (!src || !dst) return;

  let termRef, termTarget;
  if (homeDirectionTargetToRef) {
    termTarget = src;
    termRef = dst;
  } else {
    termRef = src;
    termTarget = dst;
  }

  const tx = db.transaction('words', 'readwrite');
  const store = tx.objectStore('words');
  store.add({
    dictId: dict.id,
    termRef,
    termTarget,
    createdAt: Date.now()
  });
  tx.oncomplete = () => {
    hideAddWordSheet();
    loadDictionaries();
  };
});

// DICTIONARIES
function loadDictionaries() {
  const tx = db.transaction('dictionaries', 'readonly');
  const store = tx.objectStore('dictionaries');
  const req = store.getAll();
  req.onsuccess = () => {
    dictionaries = req.result.sort((a, b) => {
      const la = LANGS[a.targetLang]?.name || a.targetLang;
      const lb = LANGS[b.targetLang]?.name || b.targetLang;
      return la.localeCompare(lb, 'it');
    });
    renderDictList();
  };
}

function getWordCountForDict(id) {
  return new Promise(resolve => {
    const tx = db.transaction('words', 'readonly');
    const store = tx.objectStore('words');
    const index = store.index('by_dict');
    const range = IDBKeyRange.only(id);
    let count = 0;
    index.openCursor(range).onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        count++;
        cursor.continue();
      } else {
        resolve(count);
      }
    };
  });
}

async function renderDictList() {
  dictListEl.innerHTML = '';
  const visibleDicts = dictionaries.filter(d => d.refLang === currentRefLang.code);
  if (!visibleDicts.length) {
    emptyStateEl.style.display = 'block';
    return;
  }
  emptyStateEl.style.display = 'none';

  for (const dict of visibleDicts) {
    const lang = LANGS[dict.targetLang] || { name: dict.targetLang, flag: '📘' };
    const ref = LANGS[dict.refLang] || currentRefLang;
    const count = await getWordCountForDict(dict.id);

    const card = document.createElement('div');
    card.className = 'dict-card';
    card.dataset.id = dict.id;

    const inner = document.createElement('div');
    inner.className = 'dict-card-inner';
    inner.innerHTML = `
      <div class="dict-main">
        <div class="dict-flag">${lang.flag}</div>
        <div class="dict-text">
          <div class="dict-name">${lang.name}</div>
          <div class="dict-sub">${ref.name} ↔ ${lang.name}</div>
        </div>
      </div>
      <div class="dict-meta">
        <div class="pill-count">${count} vocaboli</div>
        <svg class="chevron" viewBox="0 0 20 20" fill="currentColor">
          <path d="M7.22 4.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 11-1.06-1.06L10.94 10 7.22 6.28a.75.75 0 010-1.06z"/>
        </svg>
      </div>
    `;

    const actions = document.createElement('div');
    actions.className = 'dict-actions';

    const delBtn = document.createElement('button');
    delBtn.className = 'dict-btn delete';
    delBtn.textContent = 'Cancella';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteDictionary(dict.id);
    });
    actions.appendChild(delBtn);

    card.appendChild(actions);
    card.appendChild(inner);

    setupDictSwipe(card);
    dictListEl.appendChild(card);
  }
}

function deleteDictionary(id) {
  if (!confirm('Eliminare questo dizionario? Verranno rimossi anche i vocaboli associati.')) return;
  const tx = db.transaction(['dictionaries','words'], 'readwrite');
  const dictStore = tx.objectStore('dictionaries');
  const wordStore = tx.objectStore('words');
  const index = wordStore.index('by_dict');
  const range = IDBKeyRange.only(id);

  index.openCursor(range).onsuccess = (e) => {
    const cursor = e.target.result;
    if (cursor) {
      wordStore.delete(cursor.primaryKey);
      cursor.continue();
    }
  };
  dictStore.delete(id);
  tx.oncomplete = () => {
    loadDictionaries();
  };
}

// swipe helpers
function setupDictSwipe(card) {
  let startX = 0;
  let currentX = 0;

  card.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    startX = t.clientX;
    currentX = startX;
    document.querySelectorAll('.dict-card.dict-swiped').forEach(el => {
      if (el !== card) el.classList.remove('dict-swiped');
    });
  });

  card.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    currentX = t.clientX;
  });

  card.addEventListener('touchend', () => {
    const dx = currentX - startX;
    if (dx < -40) {
      card.classList.add('dict-swiped');
    } else if (dx > 40) {
      card.classList.remove('dict-swiped');
    }
  });
}

// NEW DICT
btnConfirmNewLang.addEventListener('click', () => {
  const code = newLangSelect.value;
  if (!code) return;
  const tx = db.transaction('dictionaries', 'readwrite');
  const store = tx.objectStore('dictionaries');
  const getReq = store.getAll();
  getReq.onsuccess = (ev) => {
    const list = ev.target.result || [];
    const exists = list.some(d => d.targetLang === code && d.refLang === currentRefLang.code);
    if (exists) {
      alert('Questo vocabolario esiste già.');
      return;
    }
    const dict = {
      targetLang: code,
      refLang: currentRefLang.code,
      createdAt: Date.now()
    };
    const req = store.add(dict);
    req.onsuccess = () => {
      hideNewLangSheet();
      loadDictionaries();
    };
  };
});

// NAV
function openDict(id) {
  window.location.href = `dict.html?id=${id}`;
}

// EVENTS
function attachEvents() {
  refLangButton.addEventListener('click', showRefLangSheet);
  btnCancelRefLang.addEventListener('click', hideRefLangSheet);
  refLangSheet.addEventListener('click', (e) => {
    if (e.target === refLangSheet) hideRefLangSheet();
  });

  btnAddLanguage.addEventListener('click', showNewLangSheet);
  btnCancelNewLang.addEventListener('click', hideNewLangSheet);
  newLangSheet.addEventListener('click', (e) => {
    if (e.target === newLangSheet) hideNewLangSheet();
  });

  btnAddWord.addEventListener('click', showAddWordSheet);
  btnCancelAddWord.addEventListener('click', hideAddWordSheet);
  addWordSheet.addEventListener('click', (e) => {
    if (e.target === addWordSheet) hideAddWordSheet();
  });
  if (btnExportBackup) {
    btnExportBackup.addEventListener('click', exportBackup);
  }
  if (btnImportBackup) {
    btnImportBackup.addEventListener('click', () => backupFileInput && backupFileInput.click());
  }
  if (backupFileInput) {
    backupFileInput.addEventListener('change', handleBackupFileSelection);
  }

}

// BACKUP EXPORT / IMPORT
function exportBackup() {
  if (!db) {
    alert('Database non pronto.');
    return;
  }
  const tx = db.transaction(['dictionaries','words'], 'readonly');
  const dictStore = tx.objectStore('dictionaries');
  const wordStore = tx.objectStore('words');
  const backup = { version: 1, createdAt: Date.now(), dictionaries: [], words: [] };

  const dictReq = dictStore.getAll();
  const wordReq = wordStore.getAll();

  tx.oncomplete = () => {
    backup.dictionaries = dictReq.result || [];
    backup.words = wordReq.result || [];

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0,10);
    a.href = url;
    a.download = 'lang_trainer_backup_' + dateStr + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  tx.onerror = () => {
    alert('Errore durante la creazione del backup.');
  };
}

function handleBackupFileSelection() {
  const file = backupFileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      importBackupData(data);
    } catch (e) {
      console.error(e);
      alert('Backup non valido.');
    } finally {
      backupFileInput.value = '';
    }
  };
  reader.readAsText(file);
}

function importBackupData(data) {
  if (!db) {
    alert('Database non pronto.');
    return;
  }
  if (!data || !Array.isArray(data.dictionaries) || !Array.isArray(data.words)) {
    alert('Backup non valido.');
    return;
  }

  // Step 1: leggi stato attuale
  const tx1 = db.transaction(['dictionaries','words'], 'readonly');
  const dictStore1 = tx1.objectStore('dictionaries');
  const wordStore1 = tx1.objectStore('words');
  const dictReq1 = dictStore1.getAll();
  const wordReq1 = wordStore1.getAll();

  tx1.oncomplete = () => {
    const existingDicts = dictReq1.result || [];
    const existingWords = wordReq1.result || [];

    const dictIdMap = {};

    // Step 2: crea nuovi dizionari se necessario
    const tx2 = db.transaction('dictionaries', 'readwrite');
    const dictStore2 = tx2.objectStore('dictionaries');

    data.dictionaries.forEach(bd => {
      if (!bd || !bd.targetLang || !bd.refLang) return;
      const match = existingDicts.find(d => d.targetLang === bd.targetLang && d.refLang === bd.refLang);
      if (match) {
        dictIdMap[bd.id] = match.id;
      } else {
        const addReq = dictStore2.add({
          targetLang: bd.targetLang,
          refLang: bd.refLang,
          createdAt: bd.createdAt || Date.now()
        });
        addReq.onsuccess = (ev) => {
          dictIdMap[bd.id] = ev.target.result;
        };
      }
    });

    tx2.oncomplete = () => {
      // Step 3: importa parole
      const tx3 = db.transaction('words', 'readwrite');
      const wordStore2 = tx3.objectStore('words');
      const currentWords = existingWords.slice();

      data.words.forEach(bw => {
        if (!bw || typeof bw.dictId === 'undefined') return;
        const newDictId = dictIdMap[bw.dictId];
        if (!newDictId) return;
        const termRef = bw.termRef || bw.sourceTerm;
        const termTarget = bw.termTarget || bw.targetTerm;
        if (!termRef || !termTarget) return;

        const duplicate = currentWords.some(w =>
          w.dictId === newDictId &&
          w.termRef === termRef &&
          w.termTarget === termTarget
        );
        if (duplicate) return;

        const addReq = wordStore2.add({
          dictId: newDictId,
          termRef,
          termTarget,
          createdAt: bw.createdAt || Date.now()
        });
        addReq.onsuccess = (ev) => {
          currentWords.push({
            id: ev.target.result,
            dictId: newDictId,
            termRef,
            termTarget,
            createdAt: bw.createdAt || Date.now()
          });
        };
      });

      tx3.oncomplete = () => {
        alert('Backup importato con successo.');
        loadDictionaries();
      };
      tx3.onerror = () => {
        alert('Errore durante l\'import del backup (parole).');
      };
    };

    tx2.onerror = () => {
      alert('Errore durante l\'import del backup (dizionari).');
    };
  };

  tx1.onerror = () => {
    alert('Errore durante la lettura del database per l\'import.');
  };
}
