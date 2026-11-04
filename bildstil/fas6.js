// fas 6:s nya saker, djur och ljus (Björn 2026-11-04: "rita bilderna till fas 6"): tre versioner av varje i valdelen.
// Allt byggs av former som vargen i djur.js (ellipser, kilar och tjocka linjer, konturen läggs runt om efteråt), i
// paletten och 16 punkter per ruta. Styckdelen är en generell bild med bokstäver för pälsens toner, som får olika
// färger efter djuret (Björn 2026-11-04); fåglarna är en form med tre utseenden (steg 6.5.1.3).
(() => {
  // ---------- formerna ----------
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
  const och = (...f) => (x, y) => f.some(g => g(x, y));
  const utan = (f, g) => (x, y) => f(x, y) && !g(x, y);
  const punkt = (px, py) => (x, y) => Math.floor(x) === px && Math.floor(y) === py;
  const rakt = (x0, y0, x1, y1) => (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
  // formerna i ordning (de senare ovanpå), med en ton eller en funktion som ger tonen; konturen 'o' runt allt
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

  // ---------- att rita på kortet ----------
  // en bild på marken: bilden mitt i, med en skugga under den nedersta raden
  function lagg(B, rader, legend, x0, y0, skugga = true) {
    ritaSprite(B, rader, { o: 'kol0', ...legend }, x0, y0);
    if (!skugga) return;
    const sista = rader.length - 1;
    [...rader[sista]].forEach((c, x) => { if (c !== '.') { B.morka(x0 + x, y0 + sista + 1); } });
  }
  // en sak eller ett djur på marken, i ett kort som är bilden plus marginal
  const PA_MARK = (text, rader, legend, m = 4) => {
    const w = bredd(rader) + m * 2, h = rader.length + m * 2;
    return { text, w, h, rita: (B) => lagg(B, rader, legend, m, m) };
  };
  // samma bild flera gånger bredvid varandra med olika färger (fåglarna, styckdelen): legenderna i en lista
  const I_FARGER = (text, rader, legender, m = 4) => {
    const bw = bredd(rader), w = bw * legender.length + m * (legender.length + 1), h = rader.length + m * 2;
    return { text, w, h, rita: (B) => legender.forEach((l, i) => lagg(B, rader, l, m + i * (bw + m), m)) };
  };
  const KORT = (id, namn, vad, versioner, extra = {}) => ({ id, namn, typ: 'tre', vad, versioner, ...extra });
  const morkt = (B, cx, cy, r) => { // natten runt ljuset: allt utanför r mörkare, i två steg
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) { const d = Math.hypot(x - cx, y - cy) / r, n = Math.floor(d * 2 + ((x + y) % 2) * 0.5 + ((x * 3 + y) % 4) * 0.12) - 1; for (let i = 0; i < Math.min(4, n); i++) B.morka(x, y); }
  };
  function laga(B, x, y, hojd = 5) { // en liten låga med foten i (x, y): ljus kärna, gul mitt och röd spets
    for (let i = 0; i < hojd; i++) {
      const [ramp, ton] = i === 0 ? ['ben', 3] : i < hojd - 2 ? ['senap', 3 - (i > 2)] : ['rost', 2];
      B.satt(x, y - i, B.P.i(ramp, ton), true);
      if (i > 0 && i < hojd - 2) B.satt(x + (i % 2 ? -1 : 1), y - i, B.P.i('senap', 2), true);
    }
  }
  // ---------- 6.2.1.3 byns gräns i testläget ----------
  const GRANS_PUNKTER = (() => { const p = []; for (let a = 0; a < 360; a += 3) { const r = a * Math.PI / 180, k = 1 + 0.08 * Math.sin(r * 3) + 0.05 * Math.cos(r * 5); p.push([48 + Math.cos(r) * 36 * k, 28 + Math.sin(r) * 18 * k]); } return p; })();
  function grans(B, v) {
    const P = B.P, sedda = new Set();
    GRANS_PUNKTER.forEach(([x, y], i) => {
      const k = Math.round(x) + ',' + Math.round(y); if (sedda.has(k)) return; sedda.add(k);
      const n = sedda.size;
      if (v === 0 && n % 2) B.satt(x, y, P.i('ben', 3)); // prickar
      if (v === 1) { B.satt(x, y, P.i('ben', 3)); B.morka(x, y + 1); } // tunn hel linje med skugga
      if (v === 2 && n % 5 < 3) B.satt(x, y, P.i('rost', 3)); // streck
    });
    // stugan och elden i mitten, så att man ser vad som är byn
    ritaSprite(B, ['..oooo..', '.oSSSSo.', 'oSSSSSSo', 'oJjjjjJo', 'oJjkkjJo', 'oJjkkjJo', 'oooooooo'], { o: 'kol0', S: 'senap1', J: 'jord1', j: 'jord2', k: 'kol0' }, 36, 20);
    laga(B, 58, 31, 4);
  }
  const GRANS = (text, v) => ({ text, w: 96, h: 56, rita: (B) => grans(B, v) });

  // ---------- 6.3.1.3 näver ----------
  const NAV_L = { W: 'ben3', w: 'ben2', k: 'kol1', s: 'senap2', S: 'senap1', r: 'rost2' };
  const NAVER = [
    former(11, 5, [[rakt(0, 0, 10, 5), (x, y) => (Math.floor(x) * 3 + Math.floor(y)) % 7 === 0 ? 'k' : y < 2 ? 'W' : 'w'], [ell(9.5, 2.5, 1.6, 2.5), 'S'], [ell(9.5, 2.5, 0.8, 1.2), 's']]).map(r => r),
    former(12, 5, [[linje([[1, 3.5], [5, 2], [9, 2.5], [11, 1]], 1.1, 0.8), (x, y) => (Math.floor(x) * 5) % 9 === 0 ? 'k' : y < 2.6 ? 'W' : 'w'], [linje([[9.5, 2.2], [11, 1]], 0.7), 's']]),
    former(11, 7, [[linje([[0.8, 5.4], [9.8, 5.4]], 1.1), (x, y) => Math.floor(x) % 4 === 1 ? 'k' : 'w'], [linje([[1.5, 3.4], [9.5, 3.2]], 1.0), (x, y) => Math.floor(x) % 5 === 2 ? 'k' : 'W'], [linje([[2.5, 1.4], [8.5, 1.6]], 0.9), (x, y) => x > 7.5 ? 's' : 'W']]),
  ];

  // ---------- 6.3.2.2 talg ----------
  const TALG_L = { W: 'ben3', w: 'ben2', v: 'ben1', y: 'senap3', r: 'rost3', j: 'jord1' };
  const TALG = [
    former(7, 5, [[ell(3.5, 2.8, 3.3, 2.3), (x, y) => x < 3 && y < 2.5 ? 'W' : x > 5 || y > 4 ? 'v' : 'w'], [punkt(2, 1), 'W']]),
    former(8, 5, [[rakt(0.5, 0.6, 7.5, 4.6), (x, y) => y < 1.6 ? 'W' : x > 6 ? 'v' : 'w'], [punkt(5, 2), 'y'], [punkt(2, 3), 'y']]),
    former(9, 6, [[ell(4.5, 3.6, 4.3, 2.2), 'j'], [ell(4.5, 3, 3.4, 1.7), (x, y) => x < 4 ? 'W' : 'w'], [punkt(6, 3), 'y']]),
  ];
  const TALG_TEXT = ['En rund klump stelnat fett, ljus på ovansidan och gulvit i skuggan.', 'Ett kantigt block talg med gula stänk, som skurits ur en större bit.', 'Talg som stelnat i en näverskål.'];

  // ---------- 6.3.2.3 facklan som sak ----------
  const FACK_L = { j: 'jord1', J: 'jord2', g: 'senap1', G: 'senap2', y: 'senap3', w: 'ben2', W: 'ben3', r: 'jord3', n: 'ben3', k: 'kol1' };
  const FACKLA = [
    former(12, 12, [[linje([[1, 11], [7.5, 4.5]], 0.8), (x, y) => (x + y) % 3 < 1 ? 'j' : 'J'], [linje([[7, 5], [10, 2]], 1.6, 1.3), (x, y) => x + y < 11.5 ? 'g' : 'G'], [linje([[6.7, 5.7], [7.9, 4.5]], 1.7), 'r'], [punkt(9, 2), 'w'], [punkt(10, 3), 'w']]),
    former(12, 12, [[linje([[1, 11], [7.5, 4.5]], 0.9, 1.1), (x, y) => (x + y) % 4 < 1 ? 'j' : 'J'], [ell(9, 3, 2.4, 2.2), (x, y) => x + y < 11 ? 'W' : x + y < 13 ? 'w' : 'G'], [punkt(8, 2), 'y']]),
    former(12, 12, [[linje([[1, 11], [7.5, 4.5]], 0.8), (x, y) => (x + y) % 3 < 1 ? 'j' : 'J'], [linje([[6.5, 5.5], [10, 2]], 1.5), (x, y) => (Math.floor(x) + Math.floor(y)) % 3 === 0 ? 'k' : 'n'], [linje([[9.5, 2.5], [10.6, 1.4]], 0.9), 'G']]),
  ];

  // ---------- 6.3.2.4 uppsatta facklor, tända i mörkret ----------
  function uppsatt(B, v) {
    const P = B.P, x = 24, fot = 34;
    if (v === 1) { // på en husvägg: stockarna bakom
      for (let y = 4; y < 30; y++) for (let xx = 4; xx < 44; xx++) B.satt(xx, y, P.i('jord', (y % 5 === 0) ? 0 : (y % 5 < 3 ? 2 : 1)));
      for (let xx = 4; xx < 44; xx++) B.morka(xx, 30);
      for (let y = 12; y <= 20; y++) { B.satt(x, y, P.i('jord', 1)); B.satt(x + 1, y, P.i('jord', 2)); } // skaftet, stucket i en springa mellan stockarna
      for (let y = 9; y <= 12; y++) for (let dx = -1; dx <= 2; dx++) B.satt(x + dx, y, P.i('senap', dx < 1 ? 1 : 2));
      laga(B, x, 8, 6); laga(B, x + 1, 8, 4);
      morkt(B, x, 8, 13); return;
    }
    for (let y = fot - 16; y <= fot; y++) { B.satt(x, y, P.i('jord', 1)); B.satt(x + 1, y, P.i('jord', 2)); }
    for (let y = fot - 20; y <= fot - 17; y++) for (let dx = -1; dx <= 2; dx++) B.satt(x + dx, y, P.i('senap', dx < 1 ? 1 : 2));
    laga(B, x, fot - 21, 6); laga(B, x + 1, fot - 21, 4);
    for (let dx = -2; dx <= 3; dx++) B.morka(x + dx, fot + 1);
    if (v === 2) for (const [sx, sy] of [[-3, 0], [3, 0], [-2, 1], [2, 1], [0, 1], [4, 1]]) { B.satt(x + sx, fot + sy, P.i('skiffer', 2)); B.satt(x + sx + 1, fot + sy, P.i('skiffer', 1)); } // stenar packade runt foten
    morkt(B, x, fot - 18, 14);
  }
  const UPPSATT = (text, v) => ({ text, w: 48, h: 40, rita: (B) => uppsatt(B, v) });

  // ---------- 6.3.2.5 talgljuset på ett bord ----------
  function ljus(B, v) {
    const P = B.P, x = 20, bord = 26;
    for (let y = bord; y < B.h; y++) for (let xx = 0; xx < B.w; xx++) B.satt(xx, y, P.i('jord', y === bord ? 3 : (xx % 13 === 0 ? 0 : 2)));
    for (let y = 0; y < bord; y++) for (let xx = 0; xx < B.w; xx++) B.satt(xx, y, P.i('jord', (y % 6 === 0) ? 0 : 1));
    const rad = (y, x0, x1, ramp, ton) => { for (let xx = x0; xx <= x1; xx++) B.satt(xx, y, P.i(ramp, typeof ton === 'function' ? ton(xx) : ton)); };
    if (v === 0) { // ett kort tjockt ljus på en flat sten
      rad(bord, x - 4, x + 4, 'skiffer', 1); rad(bord - 1, x - 3, x + 3, 'skiffer', 2);
      for (let y = bord - 7; y <= bord - 2; y++) rad(y, x - 2, x + 2, 'ben', xx => xx < x ? 3 : xx === x + 2 ? 1 : 2);
      B.satt(x - 2, bord - 6, P.i('ben', 3)); B.satt(x + 1, bord - 4, P.i('ben', 3)); // rinnande talg
      B.satt(x, bord - 8, P.i('kol', 0)); laga(B, x, bord - 9, 4);
    } else if (v === 1) { // ett smalt ljus i en lerskål
      rad(bord, x - 4, x + 4, 'rost', 0); rad(bord - 1, x - 5, x + 5, 'rost', 1); rad(bord - 2, x - 5, x + 5, 'rost', xx => xx < x ? 2 : 1);
      for (let y = bord - 10; y <= bord - 3; y++) rad(y, x - 1, x + 1, 'ben', xx => xx < x ? 3 : xx > x ? 1 : 2);
      B.satt(x, bord - 11, P.i('kol', 0)); laga(B, x, bord - 12, 5);
    } else { // en talglampa: en skål med smält talg och en veke på kanten
      rad(bord, x - 3, x + 3, 'skiffer', 0); rad(bord - 1, x - 5, x + 5, 'skiffer', 1); rad(bord - 2, x - 6, x + 6, 'skiffer', 2);
      rad(bord - 3, x - 5, x + 5, 'ben', xx => xx < x ? 3 : 2);
      B.satt(x + 5, bord - 4, P.i('kol', 0)); laga(B, x + 5, bord - 5, 4);
    }
    morkt(B, x, bord - 10, 12);
  }
  const LJUS = (text, v) => ({ text, w: 40, h: 32, rita: (B) => ljus(B, v) });

  // ---------- 6.4.1.3 och 6.4.1.4 buskarna ----------
  const BUSK_L = { d: 'barr1', m: 'oliv1', l: 'oliv2', L: 'oliv3', g: 'jord1', r: 'rost3', R: 'rost2', b: 'skiffer1', B: 'skiffer2' };
  function busk(v, bar, s = 1) {
    const w = Math.round(16 * s), h = Math.round(13 * s), c = w / 2;
    const ton = (x, y) => { const u = (y - 1) / (h - 2), sida = (x - c) / c; return u > 0.75 ? 'd' : u + sida * 0.35 > 0.55 ? 'm' : u + sida * 0.35 < 0.1 ? 'L' : 'l'; };
    let kropp;
    if (v === 0) kropp = och(ell(c, h * 0.58, c - 0.8, h * 0.42), ell(c - 3 * s, h * 0.45, 3.6 * s, 3.4 * s), ell(c + 3 * s, h * 0.4, 3.8 * s, 3.6 * s)); // rund och tät
    if (v === 1) kropp = och(ell(c - 3.5 * s, h * 0.5, 3.2 * s, 3.4 * s), ell(c + 2.5 * s, h * 0.35, 3.4 * s, 3 * s), ell(c + 4 * s, h * 0.7, 2.8 * s, 2.4 * s), ell(c - 1 * s, h * 0.78, 3.4 * s, 2 * s)); // gles med luckor
    if (v === 2) kropp = och(ell(c - 3.5 * s, h * 0.68, 4 * s, h * 0.3), ell(c + 3.5 * s, h * 0.7, 3.8 * s, h * 0.28), ell(c, h * 0.55, 3.2 * s, h * 0.32)); // låg och bred
    const lista = [];
    if (v === 1) lista.push([och(linje([[c, h - 0.5], [c - 3.5 * s, h * 0.45]], 0.5), linje([[c, h - 0.5], [c + 3 * s, h * 0.3]], 0.5), linje([[c, h - 0.5], [c + 4.2 * s, h * 0.72]], 0.45)), 'g']);
    lista.push([kropp, ton]);
    if (v === 1) lista.push([och(linje([[c, h - 0.5], [c - 2 * s, h * 0.62]], 0.45), linje([[c, h - 0.5], [c + 1.6 * s, h * 0.5]], 0.45)), 'g']);
    if (bar) { // bären i klungor om två eller tre, på ljussidan och i kanten
      const plats = [[0.3, 0.42], [0.62, 0.3], [0.75, 0.62], [0.42, 0.7], [0.2, 0.62], [0.55, 0.5]];
      plats.forEach(([fx, fy], i) => {
        const x = Math.floor(fx * w), y = Math.floor(fy * h), [m, l] = bar === 'lingon' || (bar === 'bada' && i % 2) ? ['R', 'r'] : ['b', 'B'];
        lista.push([och(punkt(x, y), punkt(x + 1, y + 1)), (xx) => xx < x + 0.9 ? l : m], [punkt(x - 1, y + 1), m]);
      });
    }
    return former(w, h, lista);
  }
  const BUSKSCEN = (text, v, bar) => ({ text, w: 64, h: 32, rita: (B) => { lagg(B, busk(v, bar, 1.25), BUSK_L, 4, 6); lagg(B, busk(v, bar, 0.85), BUSK_L, 30, 12); lagg(B, busk(v, bar, 1), BUSK_L, 44, 4); } });

  // ---------- 6.5.1.1 styckdelen: en generell bild som får djurets färger ----------
  // d, m och l är pälsens mörka, mellersta och ljusa ton; köttet, fettet och benet är lika för alla djur
  const STYCK_FAST = { r: 'rost1', R: 'rost2', f: 'ben2', b: 'ben3', k: 'kol0', s: 'senap2' };
  const PALS6 = {
    radjur: { namn: 'rådjur', d: 'jord1', m: 'jord2', l: 'jord3' },
    varg: { namn: 'varg', d: 'skiffer1', m: 'skiffer2', l: 'skiffer3' },
    bjorn: { namn: 'björn', d: 'jord0', m: 'jord1', l: 'jord2' },
  };
  const styckL = k => ({ ...STYCK_FAST, ...PALS6[k] });
  const STYCK = [
    // ett lår: päls utanpå, kött och en benknota i den avskurna änden, och benet ner till klöven eller tassen
    former(14, 9, [[linje([[3, 6.5], [9, 6.8], [12.5, 7.6]], 1.0, 0.8), (x) => x > 12 ? 'k' : 'm'], [ell(5, 4.2, 4.6, 3.8), (x, y) => y < 2.4 ? 'd' : y > 6 ? 'l' : 'm'], [ell(1.6, 4.3, 1.3, 3.2), (x, y) => y < 3 ? 'R' : 'r'], [punkt(1, 4), 'b']]),
    // en hög: ett lår och en bit revben med skinnet kvar
    former(15, 9, [[ell(10.5, 6.2, 4.2, 2.6), (x, y) => y < 5 ? 'd' : 'm'], [och(linje([[8, 5.5], [8, 8]], 0.4), linje([[10, 5], [10, 8.2]], 0.4), linje([[12, 5], [12, 8]], 0.4)), 'f'], [ell(4.6, 4.6, 4.2, 3.6), (x, y) => y < 2.8 ? 'd' : y > 6.6 ? 'l' : 'm'], [ell(1.2, 4.6, 1.0, 2.6), 'r'], [punkt(1, 4), 'b']]),
    // ett bylte: köttet inlindat i en bit av skinnet och knutet med rep
    former(13, 9, [[ell(6.5, 4.8, 6, 4), (x, y) => y < 2.6 ? 'd' : y > 7 ? 'd' : x < 4 ? 'l' : 'm'], [ell(10.6, 3.2, 1.6, 1.4), 'r'], [linje([[6.5, 0.8], [6.5, 8.6]], 0.55), 's'], [punkt(6, 0), 's']]),
  ];
  const STYCK_TEXT = ['Ett lår med pälsen utanpå och köttet och benknotan i den avskurna änden.', 'En liten hög: ett lår och en bit revben med skinnet kvar.', 'Ett bylte: köttet inlindat i en bit av skinnet och knutet med rep.'];

  // ---------- 6.5.1.2 rådjuret ----------
  const RAD_L = { d: 'jord1', m: 'jord2', l: 'jord3', c: 'ben3', k: 'kol0', h: 'ben1' };
  function radjur(v) {
    const W = 24, H = 22, fot = H - 0.5, bot = fot - 8, mitt = bot - 3.2, rygg = mitt - 3.4;
    const bet = v === 1, bock = v === 2;
    const hx = bet ? 21 : 19.6, hy = bet ? fot - 2.6 : rygg - 3.6;
    const kropp = och(ell(10, mitt, 6.2, 3.4), ell(14.6, mitt - 0.4, 3.4, 3.6), ell(5.6, mitt - 0.4, 3, 3.4));
    const hals = linje([[15.2, mitt - 1.2], [hx - 0.6, hy + 0.8]], 1.9, 1.3);
    const huvud = och(ell(hx, hy, 1.9, 1.7), tri([hx, hy - 1.1], [hx + 3.6, hy + 0.9], [hx, hy + 1.6]));
    const ora = x0 => tri([x0 - 1.1, hy - 0.8], [x0 + 1.1, hy - 0.8], [x0 - 0.9, hy - 3.8]);
    const ben = (x, d = 0, bak = false) => bak ? linje([[x + 0.6, bot - 1.4], [x - 0.8, bot + 3], [x, fot - 0.6]], 1.0, 0.45) : linje([[x, bot - 1], [x + 0.3 + d, bot + 4], [x + d, fot - 0.6]], 0.7, 0.45);
    const lista = [
      [och(ben(14.2, 0.3), ben(5.4, 0, true)), 'd'],
      [kropp, (x, y) => x < 3.8 && y > rygg + 1.6 ? 'c' : y < rygg + 1.8 ? 'd' : y > bot - 1.8 ? 'l' : 'm'], // vit spegel bak
      [hals, (x, y) => y > hy + 1.6 && x > hx - 3 ? 'l' : 'm'],
      [och(ben(16, 0), ben(7.2, 0, true)), (x, y) => y > fot - 1.6 ? 'k' : 'm'],
      [och(ora(hx - 0.6), ora(hx + 0.6)), 'm'],
      [huvud, (x, y) => x > hx + 2.4 ? 'k' : y > hy + 0.6 ? 'l' : 'm'],
      [punkt(Math.floor(hx + 0.4), Math.floor(hy - 0.2)), 'k'],
    ];
    if (bock) lista.push([och(linje([[hx - 0.2, hy - 1.4], [hx - 0.6, hy - 4.6]], 0.45), linje([[hx - 0.5, hy - 3.2], [hx + 0.8, hy - 4]], 0.4)), 'h']);
    return former(W, H, lista).filter(r => /[^.]/.test(r));
  }
  function radjurFallt(v) {
    const W = 24, H = 12;
    const kropp = ell(10, 6.4, 6.6, 3.2), ton = (x, y) => x < 4.6 && y > 5 ? 'c' : y < 4.6 ? 'd' : y > 8 ? 'l' : 'm';
    const huvud = (hx, hy, vand = 1) => [[och(ell(hx, hy, 1.7, 1.5), tri([hx, hy - 1], [hx + 3.2 * vand, hy + 0.8], [hx, hy + 1.4])), (x) => (x - hx) * vand > 2.4 ? 'k' : 'm'], [tri([hx - 1.4 * vand, hy - 0.6], [hx - 0.2 * vand, hy - 1.2], [hx - 2.6 * vand, hy - 3.2]), 'd'], [punkt(Math.floor(hx + 0.4 * vand), Math.floor(hy - 0.2)), 'k']];
    const ben = (a, b) => linje([a, b], 0.6, 0.45), klov = (x, y) => (x > 20.4 || x < 2.2) ? 'k' : 'd';
    const lista = v === 0 ? [ // på sidan med benen utsträckta åt samma håll
      [och(ben([13.5, 8.4], [20.8, 11.2]), ben([14.6, 7.8], [21.6, 9.6]), ben([6.4, 8.6], [1.8, 11.2]), ben([5.4, 8], [1, 9.8])), klov],
      [kropp, ton], [linje([[15.6, 5], [18.6, 3.2]], 1.4, 1.1), 'm'], ...huvud(19.2, 2.8),
    ] : v === 1 ? [ // med benen hopvikta under kroppen och huvudet bakåt över ryggen
      [och(ben([12.6, 8.8], [16.6, 10.6]), ben([6.2, 9], [10, 10.8])), (x) => x > 16 || (x > 9.4 && x < 10.6) ? 'k' : 'd'],
      [kropp, ton], [linje([[15.6, 4.6], [17, 2.4]], 1.3, 1.1), 'm'], ...huvud(15.6, 1.8, -1),
    ] : [ // benen bundna ihop med rep, klart att bäras på axeln
      [och(ben([13, 7.6], [17.4, 3.6]), ben([7, 7.6], [16.8, 3.4])), (x) => x > 17 ? 'k' : 'd'],
      [kropp, ton], [rakt(15.6, 2.8, 17.8, 4.6), 'r'],
      [linje([[3.8, 5.4], [1.8, 4]], 1.3, 1.1), 'm'], ...huvud(2.2, 3.4, -1),
    ];
    return former(W, H, lista.map(([f, t]) => [(x, y) => f(x - (v === 2 ? -1.8 : 0), y), typeof t === 'function' ? (x, y) => t(x - (v === 2 ? -1.8 : 0), y) : t])).filter(r => /[^.]/.test(r));
  }
  const RADSKINN = [
    former(13, 10, [[och(ell(6.5, 5, 4, 3.8), linje([[3, 2], [1, 0.6]], 0.7), linje([[10, 2], [12, 0.6]], 0.7), linje([[3, 8], [1, 9.4]], 0.7), linje([[10, 8], [12, 9.4]], 0.7)), (x, y) => y > 8 && x > 5 && x < 8 ? 'c' : Math.abs(x - 6.5) < 1 ? 'd' : 'm'], [ell(6.5, 9, 1.2, 0.9), 'c']]),
    former(12, 7, [[ell(6, 3.5, 5.6, 3), (x, y) => y < 2 ? 'd' : 'm'], [ell(1.6, 3.5, 1.2, 2.4), (x, y) => y < 3.6 ? 'c' : 'l'], [och(linje([[4.5, 0.6], [4.5, 6.4]], 0.5), linje([[8.5, 0.6], [8.5, 6.4]], 0.5)), 'r']]),
    former(14, 8, [[rakt(0.5, 2, 13.5, 7.5), (x, y) => y < 3.5 ? 'd' : (Math.floor(x) + Math.floor(y)) % 6 === 0 ? 'l' : 'm'], [rakt(1, 0.5, 13, 2), 'm'], [linje([[0.6, 7], [13.4, 7]], 0.5), 'c']]),
  ];
  const RADSKINN_L = { ...RAD_L, r: 'senap2' };

  // ---------- 6.5.1.3 fåglarna: en form, tre utseenden ----------
  // d mörk, m mellan, l ljus, n näbb och ben, a ögonbrynet (orrens röda, ripans röda kam)
  const FAGEL_UTSEENDE = [
    { namn: 'orre', d: 'kol0', m: 'kol2', l: 'ben3', n: 'kol1', a: 'rost2' },
    { namn: 'ripa', d: 'jord2', m: 'ben2', l: 'ben3', n: 'kol1', a: 'rost2' },
    { namn: 'skogsduva', d: 'skiffer1', m: 'skiffer2', l: 'oliv2', n: 'rost3', a: 'skiffer2' },
  ];
  function fagel(v) {
    const W = 12, H = 10, fot = H - 0.5;
    const kropp = v === 0 ? ell(5.6, 5.4, 3.6, 2.6) : v === 1 ? ell(5.8, 6, 3.4, 2.8) : ell(5.6, 5, 3.4, 2.2);
    const hx = v === 2 ? 9 : 8.6, hy = v === 2 ? 1.8 : v === 1 ? 4 : 2.8;
    const lista = [
      [v === 2 ? tri([2.6, 4.4], [0, 7.4], [1.2, 3.4]) : tri([2.6, 4.6], [0, 6.2], [0.8, 3.6]), 'd'], // stjärten
      [kropp, (x, y) => y < 4.4 ? 'd' : y > 6.6 ? 'l' : 'm'],
      [linje([[3.6, 4.8], [7, 5.6]], 0.9), (x) => x > 6 ? 'l' : 'd'], // vingen
      [linje([[7.4, 4.6], [hx, hy + 0.8]], 1.1), 'd'], [ell(hx, hy, 1.3, 1.2), 'd'],
      [tri([hx + 1, hy - 0.4], [hx + 2.6, hy + 0.4], [hx + 1, hy + 0.8]), 'n'],
      [punkt(Math.floor(hx), Math.floor(hy - 0.8)), 'a'],
      [och(linje([[5.4, 7.6], [5.2, fot - 0.3]], 0.35), linje([[7, 7.6], [7.4, fot - 0.3]], 0.35)), 'n'],
    ];
    if (v === 1) lista.splice(6, 1); // utan ben: den trycker på marken
    return former(W, H, lista).filter(r => /[^.]/.test(r));
  }
  function fagelFalld(v) {
    const W = 13, H = 7;
    const lista = v === 0 ? [ // på sidan med vingen ute
      [tri([4, 1.6], [11, 0.2], [9, 3.2]), (x) => x > 9 ? 'l' : 'm'], [ell(5.4, 4.2, 3.6, 2.2), (x, y) => y < 3.6 ? 'd' : 'l'], [tri([2, 3.6], [0, 5.6], [1, 2.6]), 'd'],
      [ell(9.8, 4.8, 1.2, 1.1), 'd'], [tri([10.6, 4.8], [12.4, 5.6], [10.6, 5.8]), 'n'], [och(linje([[5, 6.2], [6.6, 6.8]], 0.3)), 'n'],
    ] : v === 1 ? [ // på rygg med fötterna upp
      [ell(6, 4.4, 4, 2.2), (x, y) => y < 3.6 ? 'l' : 'd'], [tri([2, 4], [0, 6], [0.6, 3]), 'd'], [ell(10.6, 4.8, 1.2, 1.1), 'd'], [tri([11.4, 4.8], [12.8, 5.4], [11.4, 5.8]), 'n'],
      [och(linje([[5.4, 2.4], [5, 0.4]], 0.35), linje([[7, 2.4], [7.6, 0.4]], 0.35)), 'n'],
    ] : [ // hängande i fötterna, huvudet ner
      [ell(6.5, 3.6, 2.2, 3.2), (x) => x < 6 ? 'd' : 'm'], [tri([5.4, 0.8], [7.6, 0.8], [6.5, -0.4]), 'n'], [ell(6.6, 6.2, 1.1, 1.0), 'd'], [punkt(6, 7), 'n'],
      [rakt(4, 0, 9, 0.7), 'r'],
    ];
    return former(W, v === 2 ? 8 : H, lista).filter(r => /[^.]/.test(r));
  }
  const FAGEL_L = FAGEL_UTSEENDE.map(u => ({ ...u, r: 'senap2' }));

  // ---------- fjädrar och ägg (6.5.1.3) ----------
  const FJ_L = { d: 'kol1', m: 'skiffer2', l: 'ben3', w: 'ben2', s: 'senap2', b: 'jord2' };
  const FJADRAR = [
    former(10, 6, [[linje([[0.6, 5.4], [9, 0.8]], 0.3), 'w'], [linje([[2.4, 4.2], [8.4, 1]], 1.4, 0.6), (x, y) => (Math.floor(x) + Math.floor(y)) % 4 === 0 ? 'd' : x + y < 8 ? 'm' : 'l']]),
    former(11, 7, [[linje([[1, 6.4], [6, 0.6]], 1.1, 0.5), (x) => x < 3 ? 'd' : 'm'], [linje([[1, 6.4], [9, 2]], 1.2, 0.5), (x) => x > 6 ? 'l' : 'w'], [linje([[1, 6.4], [10, 5]], 1, 0.5), (x) => x > 7 ? 'b' : 'd'], [ell(1.2, 6, 1, 0.8), 's']]),
    former(11, 7, [[och(linje([[5.5, 6.4], [1, 1.2]], 1, 0.6), linje([[5.5, 6.4], [5.5, 0.6]], 1, 0.6), linje([[5.5, 6.4], [10, 1.2]], 1, 0.6)), (x, y) => y < 2.4 ? 'd' : Math.abs(x - 5.5) < 1 ? 'l' : 'm'], [rakt(4.2, 5, 7, 6.6), 's']]),
  ];
  const AGG_L = { e: 'ben3', E: 'ben2', p: 'jord2', g: 'senap1', G: 'senap2' };
  const AGG = [
    former(11, 6, [[ell(5.5, 4.4, 5.2, 1.6), (x) => (Math.floor(x) % 2 ? 'g' : 'G')], [ell(3.6, 3, 1.6, 2), (x, y) => x < 3.4 && y < 2.6 ? 'e' : 'E'], [ell(7.2, 3.2, 1.6, 2), (x, y) => x < 7 && y < 2.8 ? 'e' : 'E']]),
    former(13, 5, [[ell(2.2, 2.6, 1.7, 2.2), (x, y) => (Math.floor(x) * 3 + Math.floor(y)) % 5 === 0 ? 'p' : x < 2 ? 'e' : 'E'], [ell(6.5, 2.6, 1.7, 2.2), (x, y) => (Math.floor(x) * 3 + Math.floor(y)) % 5 === 1 ? 'p' : x < 6.1 ? 'e' : 'E'], [ell(10.8, 2.6, 1.7, 2.2), (x, y) => (Math.floor(x) * 3 + Math.floor(y)) % 5 === 2 ? 'p' : x < 10.4 ? 'e' : 'E']]),
    former(5, 6, [[ell(2.5, 3.2, 2.1, 2.7), (x, y) => x < 2.2 && y < 2.6 ? 'e' : 'E']]),
  ];

  // ---------- 6.5.2.2 kastträet ----------
  const KAST_L = { j: 'jord1', J: 'jord2', l: 'jord3', r: 'senap2' };
  const KASTTRA = [
    former(12, 6, [[linje([[0.8, 4.6], [5.6, 1.4], [11.2, 4.4]], 0.8), (x, y) => y < 2.4 ? 'l' : 'J']]),
    former(12, 5, [[linje([[0.8, 3.6], [10, 2]], 0.6, 1.4), (x, y) => y < 2.2 ? 'l' : x > 8 ? 'j' : 'J']]),
    former(12, 6, [[linje([[0.8, 5], [4.8, 2.6], [11.2, 1.6]], 0.7), (x, y) => y < 2.4 ? 'l' : 'J'], [linje([[0.8, 5], [2.8, 3.8]], 0.8), 'r']]),
  ];

  // ---------- 6.5.3 björnen, idet och fällen ----------
  const BJ_L = { d: 'jord0', m: 'jord1', l: 'jord2', n: 'jord3', k: 'kol0', b: 'ben2' };
  function bjorn(v) {
    const W = 36, H = 24, fot = H - 0.5, bot = fot - 6, mitt = bot - 4.4;
    const t = [{ puckel: 2.2, huvud: 0, lag: 0 }, { puckel: 1.6, huvud: 1, lag: 8 }, { puckel: 3.0, huvud: 0, lag: 0.6 }][v];
    const kropp = och(ell(13, mitt, 10, 5), ell(20.5, mitt - 1 - t.puckel * 0.4, 5.6, 5 + t.puckel * 0.4), ell(7, mitt + 0.4, 5.6, 5));
    const hx = 28.5, hy = mitt - 3 + t.lag;
    const hals = linje([[22, mitt - 1], [hx - 1, hy + 0.5]], 3.4, 2.6);
    const huvud = och(ell(hx, hy, 2.8, 2.5), ell(hx + 3, hy + 0.9, 1.8, 1.3));
    const ora = x0 => ell(x0, hy - 2.4, 1, 0.9);
    const ben = (x) => linje([[x, bot - 2], [x + 0.2, fot - 1]], 1.6, 1.5);
    const lista = [
      [och(ben(9.6), ben(20.4)), 'd'],
      [kropp, (x, y) => y < mitt - 3.4 ? 'l' : y > bot - 1.4 ? 'd' : 'm'],
      [hals, (x, y) => y < hy - 0.8 ? 'l' : 'm'],
      [och(ben(5.4), ben(23)), (x, y) => y > fot - 1.4 ? 'd' : 'm'],
      [och(ora(hx - 1.4), ora(hx + 1.2)), 'd'],
      [huvud, (x, y) => x > hx + 2.6 ? 'n' : y < hy - 0.6 ? 'l' : 'm'],
      [punkt(Math.floor(hx + 4.3), Math.floor(hy + 0.4)), 'k'], [punkt(Math.floor(hx + 1), Math.floor(hy - 0.4)), 'k'],
    ];
    if (v === 2) lista.push([och(punkt(5, Math.floor(fot - 1)), punkt(23, Math.floor(fot - 1)), punkt(24, Math.floor(fot - 1))), 'b']); // klorna syns
    return former(W, H, lista).filter(r => /[^.]/.test(r));
  }
  function ide(B, v) {
    const P = B.P, cx = 24, fot = 34;
    const stack = (f, ramp, ton) => { for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) if (f(x + 0.5, y + 0.5)) B.satt(x, y, P.i(ramp, typeof ton === 'function' ? ton(x, y) : ton)); };
    if (v === 0) { // en jordkula under en omkullfallen gran, med rötterna i en båge över öppningen
      stack(ell(cx, fot, 18, 12), 'jord', (x, y) => y < fot - 8 ? 3 : x > cx + 6 ? 1 : 2);
      stack(linje([[2, 18], [cx + 4, 14], [46, 10]], 2.2, 1.6), 'jord', (x, y) => y < 13 ? 2 : 1);
      for (const [a, b] of [[[cx - 6, 20], [cx - 9, 30]], [[cx + 2, 18], [cx + 6, 28]], [[cx - 2, 19], [cx - 3, 26]]]) stack(linje([a, b], 0.7), 'jord', 0);
    } else if (v === 1) { // under ett stort block, med jord och mossa runt om
      stack(ell(cx, fot, 18, 9), 'jord', (x, y) => y < fot - 6 ? 2 : 1);
      stack(ell(cx, fot - 6, 16, 10), 'skiffer', (x, y) => y < fot - 12 ? 3 : x > cx + 5 ? 1 : 2);
      stack(ell(cx - 6, fot - 14, 6, 2.5), 'oliv', 2);
    } else { // en låg hög under snön med ett andningshål
      stack(ell(cx, fot, 20, 11), 'ben', (x, y) => y < fot - 7 ? 3 : x > cx + 7 ? 1 : 2);
      stack(ell(cx + 4, fot - 9, 1.4, 1), 'kol', 0);
      for (let i = 0; i < 4; i++) B.satt(cx + 4 + (i % 2), fot - 11 - i, P.i('ben', 3), true); // ånga ur hålet
    }
    if (v < 2) { stack(ell(cx, fot - 0.5, 5, 5), 'kol', 0); stack(ell(cx - 1, fot - 1.5, 3.4, 3.6), 'kol', 1); } // öppningen
    for (let x = cx - 18; x <= cx + 18; x++) B.morka(x, fot + 1);
  }
  const IDE = (text, v) => ({ text, w: 48, h: 40, rita: (B) => ide(B, v) });
  const FALL = [
    former(18, 14, [[och(ell(9, 7.6, 5.6, 4.6), linje([[5, 4.6], [1.4, 2]], 1.2, 0.9), linje([[13, 4.6], [16.6, 2]], 1.2, 0.9), linje([[5, 10.6], [1.4, 13]], 1.2, 0.9), linje([[13, 10.6], [16.6, 13]], 1.2, 0.9)), (x, y) => Math.abs(x - 9) < 1.2 ? 'd' : (x < 2.2 || x > 15.8) && (y < 2.8 || y > 12.2) ? 'b' : 'm'], [ell(9, 2.4, 2.6, 2.2), (x, y) => y > 3.4 ? 'n' : 'l'], [och(ell(7, 0.6, 0.9, 0.8), ell(11, 0.6, 0.9, 0.8)), 'd'], [och(punkt(8, 2), punkt(10, 2)), 'k']]),
    former(17, 12, [[och(ell(8.5, 6, 6, 4.8), linje([[4, 2.8], [1.2, 0.8]], 1.1), linje([[13, 2.8], [15.8, 0.8]], 1.1), linje([[4, 9.2], [1.2, 11.2]], 1.1), linje([[13, 9.2], [15.8, 11.2]], 1.1)), (x, y) => Math.abs(x - 8.5) < 1.2 ? 'd' : (Math.floor(x) * 3 + Math.floor(y)) % 7 === 0 ? 'l' : 'm']]),
    former(16, 9, [[rakt(0.5, 2.6, 15.5, 8.5), (x, y) => y < 4 ? 'l' : (Math.floor(x) + Math.floor(y) * 2) % 7 === 0 ? 'd' : 'm'], [rakt(1.5, 0.6, 14.5, 2.6), 'm'], [linje([[1.5, 1.6], [14.5, 1.6]], 0.4), 'l']]),
  ];

  // ---------- korten ----------
  const S = 'Steg ';
  VAL.push(
    KORT('f6_grans', 'Byns gräns i testläget', S + '6.2.1.3: i testläget syns byns gräns som en tunn linje på kartan, så att du ser vad som räknas som byn. Stugan och elden i mitten är bara för att visa platsen.', [
      GRANS('Vita prickar, så att marken syns mellan dem.', 0), GRANS('En tunn vit linje med en mörk skugga under.', 1), GRANS('Korta röda streck.', 2)]),
    KORT('f6_naver', 'Näver', S + '6.3.1.3: en ny sak, som görs av ved och tänds lättare än torrgräs. Vit näver med mörka streck, i sakens storlek (16 punkter per ruta).', [
      PA_MARK('En hoprullad bit näver, med den bruna insidan synlig i änden.', NAVER[0], NAV_L), PA_MARK('En lös remsa som rullar sig i ena änden.', NAVER[1], NAV_L), PA_MARK('Tre remsor i en liten hög.', NAVER[2], NAV_L)]),
    KORT('f6_talg', 'Talg', S + '6.3.2.2: en ny sak från slakten, djurfettet, som blir facklor och ljus.', TALG.map((r, i) => PA_MARK(TALG_TEXT[i], r, TALG_L))),
    KORT('f6_fackla', 'Facklan', S + '6.3.2.3: facklan som sak, när den ligger i förrådet eller bärs. En gren, torrgräs och talg.', [
      PA_MARK('En gren med en bunt torrgräs som surrats fast med en ljus rand.', FACKLA[0], FACK_L), PA_MARK('Ett tjockt huvud som doppats i talg.', FACKLA[1], FACK_L), PA_MARK('Huvudet lindat med näver.', FACKLA[2], FACK_L)]),
    KORT('f6_uppsatt', 'Uppsatt fackla', S + '6.3.2.4: en tänd fackla som satts upp i marken eller på en husvägg och lyser upp natten runt sig.', [
      UPPSATT('Stucken rakt ner i marken.', 0), UPPSATT('Instucken mellan stockarna på en husvägg.', 1), UPPSATT('I marken, med stenar packade runt foten.', 2)]),
    KORT('f6_ljus', 'Talgljuset', S + '6.3.2.5: ljuset som står på ett bord eller en hylla inne och lyser upp rummet.', [
      LJUS('Ett kort, tjockt ljus på en flat sten, med talg som runnit.', 0), LJUS('Ett smalt ljus i en lerskål.', 1), LJUS('En talglampa: en stenskål med smält talg och en veke på kanten.', 2)]),
    KORT('f6_buske', 'Busken', S + '6.4.1.3: den nya sortens mark mellan högt gräs och ungskog. Tre buskar i olika storlek.', [
      BUSKSCEN('Rund och tät.', 0, null), BUSKSCEN('Gles, med grenarna synliga mellan bladen.', 1, null), BUSKSCEN('Låg och bred.', 2, null)]),
    KORT('f6_barbuske', 'Bärbusken', S + '6.4.1.4: samma slags buske som ger bär. Formen följer busken du väljer; här visas bären.', [
      BUSKSCEN('Röda lingon på den runda busken.', 0, 'lingon'), BUSKSCEN('Blåbär på den glesa busken.', 1, 'blabar'), BUSKSCEN('Båda sorterna på den låga busken.', 2, 'bada')]),
    KORT('f6_styckdel', 'Styckdelen', S + '6.5.1.1: en bit av ett styckat djur. En enda bild för alla djur som får djurets färger (du, 2026-11-04): pälsens tre toner byts, köttet och benet är lika. Varje version visas som rådjur, varg och björn.',
      STYCK.map((r, i) => I_FARGER(STYCK_TEXT[i], r, ['radjur', 'varg', 'bjorn'].map(styckL)))),
    KORT('f6_radjur', 'Rådjuret', S + '6.5.1.2 (ditt beslut väntar, steget är ett förslag): rådjuret på kartan, sett från sidan, med den vita spegeln bak.', [
      PA_MARK('Står med huvudet högt och lyssnar.', radjur(0), RAD_L), PA_MARK('Betar med huvudet nere.', radjur(1), RAD_L), PA_MARK('En bock med små horn.', radjur(2), RAD_L)]),
    KORT('f6_radjur_fallt', 'Fällt rådjur', S + '6.5.1.2: det fällda rådjuret som bärs hem eller styckas.', [
      PA_MARK('På sidan med benen utsträckta.', radjurFallt(0), RAD_L), PA_MARK('På sidan med benen hopvikta.', radjurFallt(1), RAD_L), PA_MARK('Med benen bundna ihop, klart att bäras.', radjurFallt(2), { ...RAD_L, r: 'senap2' })]),
    KORT('f6_radjursskinn', 'Rådjursskinn', S + '6.5.1.2: skinnet från slakten.', [
      PA_MARK('Utbrett, med en ljus fläck där spegeln satt.', RADSKINN[0], RADSKINN_L), PA_MARK('Hoprullat och knutet.', RADSKINN[1], RADSKINN_L), PA_MARK('Hopvikt.', RADSKINN[2], RADSKINN_L)]),
    KORT('f6_fagel', 'Fågeln', S + '6.5.1.3: en enda fågel med tre utseenden, som orre, ripa och skogsduva. Varje version är en form, visad i alla tre färgerna.', [
      I_FARGER('Rund, med stjärten rakt bak.', fagel(0), FAGEL_L), I_FARGER('Trycker mot marken, utan ben.', fagel(1), FAGEL_L), I_FARGER('Smalare, med halsen sträckt och lång stjärt.', fagel(2), FAGEL_L)]),
    KORT('f6_fagel_falld', 'Fälld fågel', S + '6.5.1.3: den fällda fågeln, i samma tre färger.', [
      I_FARGER('På sidan med vingen ute.', fagelFalld(0), FAGEL_L), I_FARGER('På rygg med fötterna upp.', fagelFalld(1), FAGEL_L), I_FARGER('Hängande i fötterna i en snodd.', fagelFalld(2), FAGEL_L)]),
    KORT('f6_fjadrar', 'Fjädrar', S + '6.5.1.3: en ny sak från fåglarna, till pilar och prydnader senare.', [
      PA_MARK('En enda fjäder.', FJADRAR[0], FJ_L), PA_MARK('Tre fjädrar i olika färger.', FJADRAR[1], FJ_L), PA_MARK('En liten solfjäder av fjädrar, knuten nertill.', FJADRAR[2], FJ_L)]),
    KORT('f6_agg', 'Ägg', S + '6.5.1.3: ägg som hittas på våren när man samlar, en ny mat.', [
      PA_MARK('Två ägg i ett litet bo av gräs.', AGG[0], AGG_L), PA_MARK('Tre prickiga ägg på rad.', AGG[1], AGG_L), PA_MARK('Ett enda ägg.', AGG[2], AGG_L)]),
    KORT('f6_kasttra', 'Kastträet', S + '6.5.2.2: kastvapnet mot fåglar och harar, som ligger kvar på marken efter kastet.', [
      PA_MARK('Ett böjt kastträ.', KASTTRA[0], KAST_L), PA_MARK('En rak käpp med tjock ände.', KASTTRA[1], KAST_L), PA_MARK('En böjd käpp med rep lindat om handtaget.', KASTTRA[2], KAST_L)]),
    KORT('f6_bjorn', 'Björnen', S + '6.5.3: björnen på kartan, sedd från sidan, i samma storlek mot människan som vargen.', [
      PA_MARK('Går, med en puckel över axlarna.', bjorn(0), BJ_L), PA_MARK('Nosar med huvudet lågt.', bjorn(1), BJ_L), PA_MARK('En stor hanne med hög puckel och klorna synliga.', bjorn(2), BJ_L)]),
    KORT('f6_ide', 'Idet', S + '6.5.3.1: där björnen sover på vintern.', [
      IDE('Under en omkullfallen gran, med rötterna över öppningen.', 0), IDE('Under ett stort stenblock.', 1), IDE('En hög under snön, med ånga ur andningshålet.', 2)]),
    KORT('f6_bjornskinn', 'Björnfällen', S + '6.5.3.3: björnskinnet som slakten ger.', [
      PA_MARK('Utbredd med huvudet och klorna kvar.', FALL[0], BJ_L), PA_MARK('Utbredd utan huvud.', FALL[1], BJ_L), PA_MARK('Hopvikt.', FALL[2], BJ_L)]),
  );
})();
