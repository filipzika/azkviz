/* ==========================================================
   Sdílená deska: trojúhelník z 28 hexagonů, logika výhry
   a vykreslení do SVG. Používá ji moderátor i projektor.
   ========================================================== */
const Deska = (() => {
  const ROWS = 7, SIZE = 58, W = Math.sqrt(3) * SIZE, VS = SIZE * 1.5, PAD = 16;
  const BLACK = '#2a2a2e';

  const cells = [];
  for (let r = 0, id = 1; r < ROWS; r++) for (let c = 0; c <= r; c++) cells.push({ id: id++, r, c });
  const N = cells.length;
  const idx = (r, c) => (r < 0 || r >= ROWS || c < 0 || c > r) ? -1 : r * (r + 1) / 2 + c;
  const neighbors = cells.map(({ r, c }) =>
    [[r, c - 1], [r, c + 1], [r - 1, c - 1], [r - 1, c], [r + 1, c], [r + 1, c + 1]]
      .map(([a, b]) => idx(a, b)).filter(i => i >= 0));

  // Vyhrává tým, jehož souvislá skupina polí se dotýká všech tří stran.
  function findWinner(owner) {
    for (const team of [1, 2]) {
      const seen = new Set();
      for (let i = 0; i < N; i++) {
        if (owner[i] !== team || seen.has(i)) continue;
        const comp = [], stack = [i];
        seen.add(i);
        let L = false, R = false, B = false;
        while (stack.length) {
          const j = stack.pop();
          comp.push(j);
          const { r, c } = cells[j];
          L ||= c === 0; R ||= c === r; B ||= r === ROWS - 1;
          for (const k of neighbors[j]) if (!seen.has(k) && owner[k] === team) { seen.add(k); stack.push(k); }
        }
        if (L && R && B) return { winner: team, winSet: comp };
      }
    }
    return { winner: 0, winSet: [] };
  }

  const colorOf = (v, c1, c2) => v === 1 ? c1 : v === 2 ? c2 : v === 3 ? BLACK : null;

  const hexPts = (cx, cy, s) => Array.from({ length: 6 }, (_, k) => {
    const a = Math.PI / 180 * (60 * k - 90);
    return `${(cx + s * Math.cos(a)).toFixed(1)},${(cy + s * Math.sin(a)).toFixed(1)}`;
  }).join(' ');

  function create(svg, { onClick, onContext } = {}) {
    const width = ROWS * W + PAD * 2, height = (ROWS - 1) * VS + SIZE * 2 + PAD * 2;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('board');
    svg.innerHTML = `<defs>
      <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".45"/>
        <stop offset=".5" stop-color="#fff" stop-opacity=".08"/>
        <stop offset="1" stop-color="#000" stop-opacity=".15"/>
      </linearGradient>
      <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity=".35"/>
      </filter></defs>`;
    const els = cells.map((cell, i) => {
      const cx = width / 2 + (cell.c - cell.r / 2) * W, cy = PAD + SIZE + cell.r * VS;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('hex');
      g.innerHTML = `<polygon class="base" filter="url(#sh)" points="${hexPts(cx, cy, SIZE - 3)}"/>
        <polygon class="gloss" fill="url(#gloss)" points="${hexPts(cx, cy, SIZE - 7)}"/>
        <text x="${cx}" y="${cy}">${cell.id}</text>`;
      if (onClick) g.addEventListener('click', e => onClick(i, e));
      if (onContext) g.addEventListener('contextmenu', e => { e.preventDefault(); onContext(i, e); });
      g.addEventListener('animationend', e => { if (e.animationName === 'pop') g.classList.remove('pop'); });
      svg.appendChild(g);
      return g;
    });

    function render({ owner, c1, c2, winSet = [], selected = -1 }) {
      const win = new Set(winSet);
      els.forEach((g, i) => {
        const v = owner[i];
        const p = g.querySelector('.base'), t = g.querySelector('text');
        p.setAttribute('fill', v ? colorOf(v, c1, c2) : 'var(--empty, #e9edf5)');
        p.setAttribute('stroke', v ? 'rgba(255,255,255,.9)' : 'var(--empty-stroke, #9aa7c2)');
        t.setAttribute('fill', v ? '#fff' : '#1d2b4f');
        g.classList.toggle('win', win.has(i));
        g.classList.toggle('sel', i === selected);
        g.classList.toggle('empty', !v);
      });
    }

    function pop(i) {
      const g = els[i];
      if (!g) return;
      g.classList.remove('pop');
      void g.getBBox();
      g.classList.add('pop');
    }

    return { render, pop };
  }

  return { N, cells, findWinner, create, colorOf, BLACK };
})();
