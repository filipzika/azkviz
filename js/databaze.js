/* ==========================================================
   Databáze otázek.
   Pracovní kopie je v localStorage prohlížeče, výchozí otázky
   z js/otazky.js se do ní automaticky doplňují (kromě smazaných).
   ========================================================== */
const Otazky = (() => {
  const KEY = 'azkviz-otazky-db';
  const TYPES = { otazka: 'Běžná', anone: 'ANO / NE' };
  let db = { themes: [], deleted: [] };
  const listeners = [];

  const clone = o => JSON.parse(JSON.stringify(o));
  const newId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function load() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY)); } catch {}
    db = saved && Array.isArray(saved.themes) ? saved : { themes: [], deleted: [] };
    db.deleted ||= [];
    if (mergeDefaults()) persist();
  }

  // Doplní výchozí témata a otázky, které v databázi chybí a nebyly smazány.
  function mergeDefaults() {
    if (typeof VYCHOZI_TEMATA === 'undefined') return false;
    const del = new Set(db.deleted);
    const have = new Set(db.themes.flatMap(t => t.questions.map(q => q.id)));
    let changed = false;
    for (const t of VYCHOZI_TEMATA) {
      let th = db.themes.find(x => x.id === t.id);
      if (!th) {
        if (del.has(t.id)) continue;
        th = { id: t.id, name: t.name, questions: [] };
        db.themes.push(th); changed = true;
      }
      for (const q of t.questions)
        if (!have.has(q.id) && !del.has(q.id)) { th.questions.push(clone(q)); changed = true; }
    }
    return changed;
  }

  function persist() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} }
  function save() { persist(); listeners.forEach(f => f()); }
  addEventListener('storage', e => { if (e.key === KEY) { load(); listeners.forEach(f => f()); } });

  const theme = id => db.themes.find(t => t.id === id);
  function locate(qid) {
    for (const t of db.themes) { const i = t.questions.findIndex(q => q.id === qid); if (i >= 0) return { t, i, q: t.questions[i] }; }
    return null;
  }

  // ---------- čtení ----------
  const themes = () => db.themes;
  const all = () => db.themes.flatMap(t => t.questions.map(q => ({ ...q, themeId: t.id, themeName: t.name })));
  function cats(themeId) {
    const qs = themeId ? (theme(themeId)?.questions || []) : db.themes.flatMap(t => t.questions);
    return [...new Set(qs.map(q => q.cat).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'cs'));
  }
  const isYesNo = a => /^\s*(ANO|NE)\b/i.test(a);

  // ---------- témata ----------
  function addTheme(name) {
    const t = { id: newId('t'), name: name.trim() || 'Nové téma', questions: [] };
    db.themes.push(t); save(); return t.id;
  }
  function renameTheme(id, name) { const t = theme(id); if (t && name.trim()) { t.name = name.trim(); save(); } }
  function deleteTheme(id) {
    const t = theme(id); if (!t) return;
    db.deleted.push(id, ...t.questions.map(q => q.id));
    db.themes = db.themes.filter(x => x !== t); save();
  }

  // ---------- otázky ----------
  function normalize(f) {
    return { type: f.type === 'anone' ? 'anone' : 'otazka', cat: (f.cat || '').trim() || 'Obecné', q: (f.q || '').trim(), a: (f.a || '').trim() };
  }
  function addQuestion(themeId, f) {
    const t = theme(themeId); if (!t) return null;
    const q = { id: newId('q'), ...normalize(f) };
    t.questions.push(q); save(); return q.id;
  }
  function addMany(themeId, list) {
    const t = theme(themeId); if (!t) return 0;
    for (const f of list) t.questions.push({ id: newId('q'), ...normalize(f) });
    save(); return list.length;
  }
  function updateQuestion(qid, f, themeId) {
    const loc = locate(qid); if (!loc) return;
    Object.assign(loc.q, normalize(f));
    if (themeId && themeId !== loc.t.id && theme(themeId)) {
      loc.t.questions.splice(loc.i, 1); theme(themeId).questions.push(loc.q);
    }
    save();
  }
  function deleteQuestion(qid) {
    const loc = locate(qid); if (!loc) return;
    loc.t.questions.splice(loc.i, 1); db.deleted.push(qid); save();
  }

  // ---------- import / export ----------
  function exportData(themeId) {
    const ts = themeId ? [theme(themeId)] : db.themes;
    return { format: 'hexkviz-otazky', version: 1, themes: clone(ts) };
  }
  function importData(data) {
    const ts = Array.isArray(data) ? data : data?.themes;
    if (!Array.isArray(ts)) throw new Error('Soubor neobsahuje žádná témata.');
    let nt = 0, nq = 0;
    for (const t of ts) {
      if (!t || !Array.isArray(t.questions)) continue;
      let th = t.id && theme(t.id);
      if (!th) { th = { id: t.id || newId('t'), name: t.name || 'Importované téma', questions: [] }; db.themes.push(th); nt++; }
      db.deleted = db.deleted.filter(d => d !== th.id);
      for (const q of t.questions) {
        if (!q?.q) continue;
        const id = q.id || newId('q');
        const loc = locate(id);
        if (loc) Object.assign(loc.q, normalize(q));
        else { th.questions.push({ id, ...normalize(q) }); nq++; }
        db.deleted = db.deleted.filter(d => d !== id);
      }
    }
    save();
    return { themes: nt, questions: nq };
  }
  function resetDefaults() { db = { themes: [], deleted: [] }; mergeDefaults(); save(); }

  // Vygeneruje obsah souboru js/otazky.js z aktuální databáze.
  function toJsFile() {
    const J = JSON.stringify;
    let out = `/* ==========================================================
   VÝCHOZÍ OTÁZKY
   Témata → otázky. Typ 'otazka' = běžná otázka, 'anone' = otázka
   ANO / NE pro černá pole (odpověď začíná ANO nebo NE).
   Otázky se pohodlně upravují ve hře (Správa otázek). Tento soubor
   lze přegenerovat tlačítkem „Exportovat jako otazky.js“.
   ========================================================== */
const VYCHOZI_TEMATA = [\n`;
    for (const t of db.themes) {
      out += `  {\n    id: ${J(t.id)},\n    name: ${J(t.name)},\n    questions: [\n`;
      for (const q of t.questions)
        out += `      { id: ${J(q.id)}, type: ${J(q.type)}, cat: ${J(q.cat)}, q: ${J(q.q)}, a: ${J(q.a)} },\n`;
      out += `    ],\n  },\n`;
    }
    return out + `];\n`;
  }

  // ---------- barvy okruhů ----------
  const FIXED = { 'Obecně': '#7f8c8d', 'Obecné': '#7f8c8d', 'Monitor': '#2f5fb3', 'Projektor': '#8e44ad', 'Myš': '#16a085', 'Klávesnice': '#d35400', 'Zvuk': '#c0392b' };
  const PALETTE = ['#2f5fb3', '#8e44ad', '#16a085', '#d35400', '#c0392b', '#27ae60', '#b7950b', '#1f8a9e', '#a23d7a', '#5d6d7e'];
  function colorFor(cat) {
    if (FIXED[cat]) return FIXED[cat];
    let h = 0; for (const ch of String(cat)) h = (h * 31 + ch.charCodeAt(0)) | 0;
    return PALETTE[Math.abs(h) % PALETTE.length];
  }

  load();
  return {
    TYPES, themes, theme, all, cats, isYesNo, find: id => locate(id)?.q,
    addTheme, renameTheme, deleteTheme,
    addQuestion, addMany, updateQuestion, deleteQuestion,
    exportData, importData, resetDefaults, toJsFile, colorFor,
    onChange: f => listeners.push(f),
  };
})();
