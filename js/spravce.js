/* ==========================================================
   Správa otázek – okno pro přidávání, úpravy a mazání otázek
   a témat, hromadné vložení, import a export.
   Spravce.init({ getUsed, unuse }) a Spravce.open(themeId?).
   ========================================================== */
const Spravce = (() => {
  let opts = { getUsed: () => ({}), unuse: () => {} };
  let cur = null;          // vybrané téma
  let editId = null;       // upravovaná otázka
  const F = { text: '', type: '', cat: '', state: '' };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const html = `
  <div class="modal" id="mSpravce">
    <div class="card sp">
      <div class="head">
        <h2>Správa otázek</h2>
        <div class="row">
          <button class="btn" id="spImport" title="Načte témata a otázky ze souboru .json">⭳ Import</button>
          <button class="btn" id="spExportAll" title="Uloží všechna témata do souboru .json">⭱ Export vše</button>
          <button class="btn" id="spExportJs" title="Soubor pro nahrazení js/otazky.js v repozitáři">⭱ Export jako otazky.js</button>
          <button class="btn red" id="spReset" title="Smaže všechny úpravy a vrátí otázky z js/otazky.js">Obnovit výchozí</button>
          <button class="grey" data-close>Zavřít<kbd>Esc</kbd></button>
        </div>
      </div>
      <input type="file" id="spFile" accept=".json,application/json" hidden>
      <div class="sp-body">
        <aside>
          <div class="sp-themes" id="spThemes"></div>
          <button class="btn" id="spAddTheme">＋ Nové téma</button>
        </aside>
        <section id="spMain">
          <div class="sp-theme-head">
            <input id="spThemeName" title="Název tématu – uloží se po opuštění pole">
            <button class="grey" id="spExportTheme">⭱ Export tématu</button>
            <button class="btn red" id="spDelTheme">Smazat téma</button>
          </div>

          <form class="sp-form" id="spForm" autocomplete="off">
            <div class="sp-form-title" id="spFormTitle">Nová otázka</div>
            <div class="sp-grid">
              <label>Typ<select id="fType"><option value="otazka">Běžná</option><option value="anone">ANO / NE (černé pole)</option></select></label>
              <label>Okruh<input id="fCat" list="spCats" placeholder="např. Monitor"></label>
              <label class="sp-move hidden" id="fThemeWrap">Téma<select id="fTheme"></select></label>
              <label class="wide">Otázka<textarea id="fQ" rows="2" placeholder="Znění otázky"></textarea></label>
              <label class="wide">Správná odpověď<input id="fA" placeholder="Odpověď"></label>
            </div>
            <div class="row">
              <button type="submit" class="btn" id="fSubmit">＋ Přidat otázku</button>
              <button type="button" class="grey hidden" id="fCancel">Zrušit úpravy</button>
              <span class="sp-msg" id="fMsg"></span>
            </div>
            <datalist id="spCats"></datalist>
          </form>

          <details class="sp-bulk">
            <summary>Hromadné vložení</summary>
            <div>Jedna otázka na řádek: <code>Okruh | Otázka | Odpověď</code> (okruh lze vynechat: <code>Otázka | Odpověď</code>).</div>
            <textarea id="bText" rows="5" placeholder="Monitor | Jaké rozlišení má Full HD? | 1920 × 1080"></textarea>
            <div class="row">
              <select id="bType"><option value="otazka">Běžné otázky</option><option value="anone">ANO / NE otázky</option></select>
              <button class="btn" id="bAdd">Vložit</button>
              <span class="sp-msg" id="bMsg"></span>
            </div>
          </details>

          <div class="sp-filter">
            <input id="flText" placeholder="🔍 Hledat v otázkách a odpovědích">
            <select id="flType"><option value="">Všechny typy</option><option value="otazka">Běžné</option><option value="anone">ANO / NE</option></select>
            <select id="flCat"></select>
            <select id="flState"><option value="">Použité i volné</option><option value="free">Jen volné</option><option value="used">Jen použité</option></select>
            <span id="flCount"></span>
          </div>
          <div class="scroll sp-table"><table>
            <thead><tr><th>Typ</th><th>Okruh</th><th>Otázka</th><th>Odpověď</th><th>Stav</th><th></th></tr></thead>
            <tbody id="spRows"></tbody>
          </table></div>
        </section>
        <section id="spEmpty" class="sp-empty hidden">Zatím tu není žádné téma. Vytvoř ho tlačítkem <b>＋ Nové téma</b>.</section>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  const $ = id => document.getElementById(id);
  $('mSpravce').querySelector('[data-close]').onclick = close;

  // ---------- vykreslení ----------
  function render() {
    const themes = Otazky.themes();
    if (!themes.find(t => t.id === cur)) cur = themes[0]?.id || null;
    const used = opts.getUsed();
    $('spThemes').innerHTML = themes.map(t => {
      const n = t.questions.filter(q => q.type === 'otazka').length, y = t.questions.length - n;
      const free = t.questions.filter(q => !(q.id in used)).length;
      return `<button class="sp-theme ${t.id === cur ? 'on' : ''}" data-t="${esc(t.id)}">
        <b>${esc(t.name)}</b><small>${n} běžných · ${y} ANO/NE · ${free} volných</small></button>`;
    }).join('');
    $('spThemes').querySelectorAll('[data-t]').forEach(b => b.onclick = () => { cur = b.dataset.t; cancelEdit(); render(); });
    $('spMain').classList.toggle('hidden', !cur);
    $('spEmpty').classList.toggle('hidden', !!cur);
    if (!cur) return;

    const t = Otazky.theme(cur);
    if (document.activeElement !== $('spThemeName')) $('spThemeName').value = t.name;
    const cats = Otazky.cats(cur);
    $('spCats').innerHTML = Otazky.cats().map(c => `<option value="${esc(c)}">`).join('');
    $('flCat').innerHTML = `<option value="">Všechny okruhy</option>` + cats.map(c => `<option ${c === F.cat ? 'selected' : ''}>${esc(c)}</option>`).join('');
    $('fTheme').innerHTML = themes.map(x => `<option value="${esc(x.id)}" ${x.id === cur ? 'selected' : ''}>${esc(x.name)}</option>`).join('');

    const needle = F.text.toLowerCase();
    const rows = t.questions.filter(q =>
      (!F.type || q.type === F.type) && (!F.cat || q.cat === F.cat) &&
      (!F.state || (F.state === 'used') === (q.id in used)) &&
      (!needle || (q.q + ' ' + q.a + ' ' + q.cat).toLowerCase().includes(needle)));
    $('flCount').textContent = `${rows.length} z ${t.questions.length}`;
    $('spRows').innerHTML = rows.map(q => {
      const u = q.id in used;
      return `<tr class="${u ? 'used' : ''} ${q.id === editId ? 'editing' : ''}">
        <td><span class="sp-type ${q.type}">${q.type === 'anone' ? 'ANO/NE' : 'Běžná'}</span></td>
        <td><span class="cat" style="background:${Otazky.colorFor(q.cat)}">${esc(q.cat)}</span></td>
        <td>${esc(q.q)}</td><td><b>${esc(q.a)}</b></td>
        <td>${u ? `použitá <button class="mini" data-unuse="${esc(q.id)}" title="Vrátit otázku do hry">↺</button>` : 'volná'}</td>
        <td class="sp-act"><button class="mini" data-edit="${esc(q.id)}" title="Upravit">✎</button><button class="mini red" data-del="${esc(q.id)}" title="Smazat">🗑</button></td>
      </tr>`;
    }).join('') || `<tr><td colspan="6" class="sp-none">Žádné otázky${t.questions.length ? ' neodpovídají filtru' : ' – přidej první formulářem výše'}.</td></tr>`;
    $('spRows').querySelectorAll('[data-edit]').forEach(b => b.onclick = () => startEdit(b.dataset.edit));
    $('spRows').querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      const q = Otazky.find(b.dataset.del);
      if (q && confirm(`Smazat otázku?\n\n${q.q}`)) { if (editId === q.id) cancelEdit(); Otazky.deleteQuestion(q.id); }
    });
    $('spRows').querySelectorAll('[data-unuse]').forEach(b => b.onclick = () => { opts.unuse(b.dataset.unuse); render(); });
  }

  // ---------- formulář ----------
  function msg(id, text, bad) { $(id).textContent = text; $(id).classList.toggle('bad', !!bad); if (text) setTimeout(() => { if ($(id).textContent === text) $(id).textContent = ''; }, 4000); }
  function readForm() { return { type: $('fType').value, cat: $('fCat').value, q: $('fQ').value, a: $('fA').value }; }
  function validate(f) {
    if (!f.q.trim()) return 'Vyplň znění otázky.';
    if (!f.a.trim()) return 'Vyplň správnou odpověď.';
    if (f.type === 'anone' && !Otazky.isYesNo(f.a)) return 'Odpověď na ANO / NE otázku musí začínat slovem ANO nebo NE.';
    return '';
  }
  function updateHint() { $('fA').placeholder = $('fType').value === 'anone' ? 'ANO nebo NE (může následovat vysvětlení)' : 'Odpověď'; }
  $('fType').onchange = updateHint;

  $('spForm').onsubmit = e => {
    e.preventDefault();
    const f = readForm(), err = validate(f);
    if (err) return msg('fMsg', err, true);
    if (editId) { Otazky.updateQuestion(editId, f, $('fTheme').value); msg('fMsg', 'Uloženo.'); cancelEdit(); }
    else {
      Otazky.addQuestion(cur, f); msg('fMsg', 'Otázka přidána.');
      $('fQ').value = ''; $('fA').value = ''; $('fQ').focus();
    }
  };
  function startEdit(id) {
    const q = Otazky.find(id); if (!q) return;
    editId = id;
    $('fType').value = q.type; $('fCat').value = q.cat; $('fQ').value = q.q; $('fA').value = q.a;
    $('spFormTitle').textContent = 'Úprava otázky';
    $('fSubmit').textContent = '✔ Uložit změny';
    $('fCancel').classList.remove('hidden');
    $('fThemeWrap').classList.remove('hidden');
    $('spForm').classList.add('editing');
    updateHint(); render();
    $('spForm').scrollIntoView({ block: 'nearest' }); $('fQ').focus();
  }
  function cancelEdit() {
    editId = null;
    $('fQ').value = ''; $('fA').value = '';
    $('spFormTitle').textContent = 'Nová otázka';
    $('fSubmit').textContent = '＋ Přidat otázku';
    $('fCancel').classList.add('hidden');
    $('fThemeWrap').classList.add('hidden');
    $('spForm').classList.remove('editing');
  }
  $('fCancel').onclick = () => { cancelEdit(); render(); };

  // ---------- hromadné vložení ----------
  $('bAdd').onclick = () => {
    const type = $('bType').value, list = [], bad = [];
    $('bText').value.split('\n').forEach((line, n) => {
      if (!line.trim()) return;
      const p = line.split('|').map(s => s.trim());
      const f = p.length >= 3 ? { type, cat: p[0], q: p[1], a: p.slice(2).join(' | ') }
        : p.length === 2 ? { type, cat: $('fCat').value || 'Obecné', q: p[0], a: p[1] } : null;
      if (!f || validate(f)) bad.push(n + 1); else list.push(f);
    });
    if (bad.length) return msg('bMsg', `Chyba na řádcích: ${bad.join(', ')} – nic nebylo vloženo.`, true);
    if (!list.length) return msg('bMsg', 'Není co vložit.', true);
    Otazky.addMany(cur, list);
    $('bText').value = '';
    msg('bMsg', `Vloženo ${list.length} otázek.`);
  };

  // ---------- témata ----------
  $('spAddTheme').onclick = () => {
    const name = prompt('Název nového tématu:', '');
    if (name === null) return;
    cur = Otazky.addTheme(name); cancelEdit(); render();
    $('spThemeName').focus(); $('spThemeName').select();
  };
  $('spThemeName').onchange = () => Otazky.renameTheme(cur, $('spThemeName').value);
  $('spDelTheme').onclick = () => {
    const t = Otazky.theme(cur);
    if (!t || !confirm(`Opravdu smazat téma „${t.name}“ se všemi ${t.questions.length} otázkami?\n\nTip: nejdřív si ho můžeš uložit tlačítkem Export tématu.`)) return;
    Otazky.deleteTheme(cur); cur = null; cancelEdit();
  };

  // ---------- filtr ----------
  $('flText').oninput = () => { F.text = $('flText').value; render(); };
  $('flType').onchange = () => { F.type = $('flType').value; render(); };
  $('flCat').onchange = () => { F.cat = $('flCat').value; render(); };
  $('flState').onchange = () => { F.state = $('flState').value; render(); };

  // ---------- import / export ----------
  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tema';
  $('spExportAll').onclick = () => download('hexkviz-otazky.json', JSON.stringify(Otazky.exportData(), null, 2), 'application/json');
  $('spExportTheme').onclick = () => { const t = Otazky.theme(cur); download(`tema-${slug(t.name)}.json`, JSON.stringify(Otazky.exportData(cur), null, 2), 'application/json'); };
  $('spExportJs').onclick = () => download('otazky.js', Otazky.toJsFile(), 'text/javascript');
  $('spImport').onclick = () => $('spFile').click();
  $('spFile').onchange = async () => {
    const file = $('spFile').files[0]; $('spFile').value = '';
    if (!file) return;
    try {
      const r = Otazky.importData(JSON.parse(await file.text()));
      alert(`Import hotov: ${r.themes} nových témat, ${r.questions} nových otázek (existující otázky se stejným ID byly aktualizovány).`);
    } catch (err) { alert('Soubor se nepodařilo načíst: ' + err.message); }
  };
  $('spReset').onclick = () => {
    if (!confirm('Opravdu zahodit všechny úpravy, vlastní témata a otázky a vrátit výchozí otázky z js/otazky.js?\n\nTip: nejdřív si vše ulož přes Export vše.')) return;
    Otazky.resetDefaults(); cur = null; cancelEdit();
  };

  Otazky.onChange(() => { if ($('mSpravce').classList.contains('open')) render(); });

  function open(themeId) { if (themeId) cur = themeId; cancelEdit(); render(); $('mSpravce').classList.add('open'); }
  function close() { $('mSpravce').classList.remove('open'); cancelEdit(); opts.onClose?.(); }
  return { init: o => Object.assign(opts, o), open, close, isOpen: () => $('mSpravce').classList.contains('open') };
})();
