// fas 7:s nya bilder i valdelen, tre versioner av varje, i paletten och 16 punkter per ruta.
// Den här filen har det gemensamma: formerna, att lägga en bild på marken och korten. Varje system i fas 7 har sin egen
// fil i fas7/ (7.1-bara.js, 7.3-skjul.js …), som bygg.cjs läser i nummerordning efter den här, och som hämtar det
// gemensamma ur window.F7.
(() => {
  const hash = (a, b, c = 0) => { let n = (a * 374761393 + b * 668265263 + c * 1274126177) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const KORT = (id, namn, vad, versioner, extra = {}) => ({ id, namn, typ: 'tre', vad, versioner, ...extra });

  // ---------- formerna (som vargen i djur.js) ----------
  // varje form är en funktion (x, y) => sant inne i formen; former() fyller dem i ordning (de senare ovanpå) med en
  // bokstav eller en funktion som ger bokstaven, och lägger konturen 'o' runt allt
  const ell = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const linje = (pts, r0, r1 = r0) => (x, y) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)), r = r0 + (r1 - r0) * (i + t) / (pts.length - 1);
      if ((x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2 <= r * r) return true;
    }
    return false;
  };
  const tri = (a, b, c) => (x, y) => { const s = (p, q) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]); const d1 = s(a, b), d2 = s(b, c), d3 = s(c, a); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
  const poly = pts => (x, y) => { let inne = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inne = !inne; } return inne; };
  const och = (...f) => (x, y) => f.some(g => g(x, y));
  const utan = (f, g) => (x, y) => f(x, y) && !g(x, y);
  const punkt = (px, py) => (x, y) => Math.floor(x) === px && Math.floor(y) === py;
  const rakt = (x0, y0, x1, y1) => (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
  function former(w, h, lista, kontur = true) {
    const g = Array.from({ length: h }, () => Array(w).fill('.'));
    for (const [inne, ton] of lista) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!inne(x + 0.5, y + 0.5)) continue;
      const c = typeof ton === 'function' ? ton(x + 0.5, y + 0.5) : ton; if (c) g[y][x] = c;
    }
    if (!kontur) return g.map(r => r.join(''));
    const ut = g.map(r => r.slice());
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx] && g[y + dy][x + dx] !== '.')) ut[y][x] = 'o';
    return ut.map(r => r.join(''));
  }
  const bredd = r => r.reduce((m, s) => Math.max(m, s.length), 0);
  // en färdig rad-bild får samma mörka kontur som allt som ritas med former
  const MED_KONTUR = rader => former(rader[0].length + 2, rader.length + 2, [[(x, y) => (rader[Math.floor(y) - 1] || '')[Math.floor(x) - 1] > '.', (x, y) => rader[Math.floor(y) - 1][Math.floor(x) - 1]]]).filter(r => /[^.]/.test(r));

  // ---------- att rita på kortet ----------
  // legenden: bokstav till 'ramp' + ton (0 mörkast, 3 ljusast), t.ex. { w: 'ben3', j: 'jord1' }; 'o' är konturen (kol0)
  function lagg(B, rader, legend, x0, y0, skugga = true) {
    ritaSprite(B, rader, { o: 'kol0', ...legend }, x0, y0);
    if (!skugga) return;
    const sista = rader.length - 1;
    [...rader[sista]].forEach((c, x) => { if (c !== '.') { B.morka(x0 + x, y0 + sista + 1); } });
  }
  // en sak på marken, i ett kort som är bilden plus marginal
  const PA_MARK = (text, rader, legend, m = 4) => {
    const w = bredd(rader) + m * 2, h = rader.length + m * 2;
    return { text, w, h, rita: (B) => lagg(B, rader, legend, m, m) };
  };
  // en rad bilder bredvid varandra, fötterna på samma rad: [rader, legend] per bild
  const PA_RAD = (text, bilder, m = 4, mellan = 4) => {
    const w = bilder.reduce((s, [r]) => s + bredd(r), 0) + mellan * (bilder.length - 1) + m * 2, h = Math.max(...bilder.map(([r]) => r.length)) + m * 2;
    return { text, w, h, rita: (B) => { let x = m; for (const [r, L] of bilder) { lagg(B, r, L, x, h - m - r.length); x += bredd(r) + mellan; } } };
  };
  // en godkänd bild ur bildstil/bilder (BILDFILER, t.ex. 'ved', 'tork', 'timmervagg') ritad i (x0, y0)
  const bildfil = (B, id, x0, y0) => { const o = BILDFILER[id]; if (!o) return; o.rader.forEach((r, y) => [...r].forEach((ch, x) => { const c = o.pal[ch]; if (ch === '.' || !c) return; if (c.startsWith('rgba')) B.morka(x0 + x, y0 + y); else B.satt(x0 + x, y0 + y, B.P.fran(c)); })); };
  // marken: gräs (och strand och vatten) som i spelet, ur mark.js
  const gras = (B, x0 = 0, y0 = 0, w = B.w, h = B.h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) B.satt(x, y, window.MARK.grasPunkt(x, y, B.P, 0)); };

  const R = 16; // punkter per ruta

  // det gemensamma till filerna i fas7/
  window.F7 = { hash, KORT, ell, linje, tri, poly, och, utan, punkt, rakt, former, bredd, MED_KONTUR, lagg, PA_MARK, PA_RAD, bildfil, gras, R };
})();
