// ---------- färger: OKLab ----------
const hex2rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); const n = parseInt(h.slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const gam = c => { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; return Math.round(Math.min(1, Math.max(0, v)) * 255); };
function rgb2lab([r, g, b]) {
  r = lin(r); g = lin(g); b = lin(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function lab2lin([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
function lch2hex(L, C, h) {
  let c = C;
  for (let i = 0; i < 40; i++, c *= 0.92) {
    const r = lab2lin([L, c * Math.cos(h * Math.PI / 180), c * Math.sin(h * Math.PI / 180)]);
    if (r.every(v => v >= -0.0005 && v <= 1.0005)) return '#' + r.map(v => gam(v).toString(16).padStart(2, '0')).join('');
  }
  return '#' + lab2lin([L, 0, 0]).map(v => gam(v).toString(16).padStart(2, '0')).join('');
}
const toward = (h, t, d) => { const diff = ((t - h + 540) % 360) - 180; return h + Math.sign(diff) * Math.min(Math.abs(diff), d); };

// ---------- paletten: åtta ramper med fyra toner, mörk till ljus ----------
const RAMPER = [
  ['kol', 'skugga, kol, konturer', [0.15, 0.21, 0.28, 0.36]],
  ['jord', 'jord, stigar, läder, mörkt trä', [0.29, 0.39, 0.5, 0.61]],
  ['senap', 'torrt gräs, halm, rep, eld', [0.43, 0.56, 0.67, 0.78]],
  ['rost', 'blod, kött, lera, bär, hud', [0.29, 0.39, 0.51, 0.63]],
  ['oliv', 'gräs, mossa, löv', [0.31, 0.41, 0.52, 0.62]],
  ['barr', 'granar, mörk skog, djupt vatten', [0.21, 0.29, 0.37, 0.46]],
  ['skiffer', 'sten, vatten, flinta, järn', [0.3, 0.42, 0.55, 0.68]],
  ['ben', 'ben, snö, ljus hud, glans', [0.56, 0.67, 0.77, 0.86]],
];
const RI = Object.fromEntries(RAMPER.map((r, i) => [r[0], i]));
const SKUGGA = 25, LJUS = 85; // skuggorna drar mot rödbrunt, ljuset mot gult

// palett B, Avokado och rost (Björn valde den efter v94). Inget är fulltonssvart: den mörkaste färgen är SVART,
// kolets toner är fasta och ingen annan färg är mörkare än GOLV
const PALETT = { id: 'B', namn: 'Avokado och rost', ide: 'Köket på sjuttiotalets tröskel: avokadogrönt, skördeguld och bränd orange.', ord: ['grön', 'guld', 'orange', 'livlig'],
  r: { kol: [70, 0.02], jord: [60, 0.06], senap: [92, 0.13], rost: [48, 0.135], oliv: [118, 0.1], barr: [135, 0.06], skiffer: [210, 0.025], ben: [88, 0.035] } };
const SVART = '#24201d', GOLV = 0.265, KOL = [0, 0.275, 0.31, 0.38];
function gorPalett(def) {
  const cols = [];
  RAMPER.forEach(([namn, , Ls]) => {
    const [h, C] = def.r[namn];
    for (let i = 0; i < 4; i++) {
      const hh = i === 0 ? toward(h, SKUGGA, 12) : i === 1 ? toward(h, SKUGGA, 5) : i === 3 ? toward(h, LJUS, 8) : h;
      const L = namn === 'kol' ? KOL[i] : Math.max(Ls[i], GOLV);
      const hex = namn === 'kol' && i === 0 ? SVART : lch2hex(L, C * [0.8, 1, 1, 0.85][i], hh);
      const rgb = hex2rgb(hex);
      cols.push({ hex, rgb, lab: rgb2lab(rgb) });
    }
  });
  const near = lab => { let bi = 0, bd = 1e9; cols.forEach((c, i) => { const d = (c.lab[0] - lab[0]) ** 2 * 1.3 + (c.lab[1] - lab[1]) ** 2 + (c.lab[2] - lab[2]) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi; };
  const omr = f => cols.map(c => near(f(c.lab)));
  const P = { ...def, cols, near, cache: new Map() };
  P.i = (ramp, ton) => RI[ramp] * 4 + ton;
  // samma färg ett steg mörkare (smuts, skugga)
  P.smuts = omr(([L, a, b]) => [L * 0.8, a * 0.85, b * 0.85 + 0.004]);
  // ljuset från elden på natten, i steg utåt: varmt sken, skymning, kväll och natt (blåare och mörkast)
  P.sken = omr(([L, a, b]) => [L * SKEN[0], a * 0.95 + SKEN[1], b * 0.95 + SKEN[2]]);
  P.skymn = omr(([L, a, b]) => [L * 0.68, a * 0.8, b * 0.8 - 0.012]);
  P.kvall = omr(([L, a, b]) => [L * 0.59, a * 0.62, b * 0.62 - 0.02]);
  P.natt = omr(([L, a, b]) => [L * NATT, a * 0.45 - 0.004, b * 0.45 - 0.028]);
  // en färg ur spelets bilder: lite mörkare och gråare, och sedan närmaste färgen i paletten
  P.fran = hex => {
    if (P.cache.has(hex)) return P.cache.get(hex);
    const [L, a, b] = rgb2lab(hex2rgb(hex)), v = near([L * 0.93, a * 0.78, b * 0.78 + 0.004]);
    P.cache.set(hex, v); return v;
  };
  // en färg som den är, utan att göras dovare (porträtten är redan dova)
  P.av = hex => { const k = '=' + hex; if (!P.cache.has(k)) P.cache.set(k, near(rgb2lab(hex2rgb(hex)))); return P.cache.get(k); };
  return P;
}
const NATT = 0.5, SKEN = [0.86, 0.012, 0.03];
const PAL = gorPalett(PALETT);

// ---------- slump som bara beror på platsen ----------
const hash = (x, y, s = 0) => { const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); };
function vn(x, y, sk, s) {
  const fx = x / sk, fy = y / sk, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
  const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

// ---------- en bild i punkter: varje punkt är en färg i paletten ----------
function Bild(w, h, P) {
  const b = { w, h, P, px: new Int16Array(w * h).fill(-1), sken: new Uint8Array(w * h) };
  b.satt = (x, y, i, lyser = false) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= w || y >= h || i < 0) return; b.px[y * w + x] = i; b.sken[y * w + x] = lyser ? 1 : 0; };
  b.get = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? -1 : b.px[y * w + x];
  b.morka = (x, y) => { x |= 0; y |= 0; const v = b.get(x, y); if (v >= 0) b.px[y * w + x] = P.smuts[v]; };
  return b;
}
// spelets pixelbild k (8 × 8, eller större för stationerna) i palettens färger; halvgenomskinligt blir skugga
function ritaIkon(B, k, x0, y0) {
  const rows = IKONER.PIX[k], pal = IKONER.PAL[k] || {};
  if (!rows) return;
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || !pal[ch]) return;
    const c = pal[ch];
    if (c.startsWith('rgba')) { B.morka(x0 + x, y0 + y); return; }
    B.satt(x0 + x, y0 + y, B.P.fran(c));
  }));
}
// en handritad bild: tecknen pekar på ramp och ton, t.ex. j2
function ritaSprite(B, rader, legend, x0, y0, lyser = '') {
  rader.forEach((row, y) => [...row].forEach((ch, x) => {
    const t = legend[ch]; if (!t) return;
    if (t === 'skugga') { B.morka(x0 + x, y0 + y); return; }
    B.satt(x0 + x, y0 + y, B.P.i(t.slice(0, -1), +t.slice(-1)), lyser.includes(ch));
  }));
}

// ---------- folket: fem personer, en figur på kartan (14 × 20 punkter) och ett porträtt (64 × 64) ----------
// figuren är framifrån och ungefär en ruta bred. Färgerna byts mot närmaste färg i paletten, konturen är kolets
// mörkaste ton och skugg- och ljussidan är ett steg ner och upp i samma ramp
const PERSONER = [
  { namn: 'Arn', text: 'Stark jägare, 30 år, glad', eye: '#5a3a1e', age: 30, skin: '#c98e62', hair: '#1e1712', hs: 'short', beard: 'full', mood: 0.8, beauty: 0.2, str: 1, tool: 'spjut', cloth: '#7a5634' },
  { namn: 'Ylva', text: 'Vacker och uthållig, 19 år', eye: '#3f7a4a', age: 19, fem: 1, skin: '#f1d3b8', hair: '#b4471f', hs: 'long', beard: 'none', mood: 0.45, beauty: 1, end: 1, cloth: '#5f6b3a' },
  { namn: 'Gorm', text: 'Gammal, ärr från en strid', eye: '#4a5d6e', age: 66, skin: '#9a6644', hair: '#cfcac1', hs: 'thin', beard: 'grey', mood: 0, beauty: 0, scar: 1, cloth: '#4f4a44' },
  { namn: 'Tova', text: 'Barn, 6 år', eye: '#3a2414', age: 6, fem: 1, skin: '#6b4428', hair: '#16110d', hs: 'curly', mood: 0.9, beauty: 0.4, cloth: '#8a6a48' },
  { namn: 'Bodvar', text: 'Ful och ledsen, skadad', eye: '#6b7f8c', age: 40, skin: '#e2b893', hair: '#c9a55a', hs: 'messy', beard: 'stubble', mood: -0.9, beauty: -1, bandage: 1, blemish: 1, tool: 'yxa', cloth: '#6e5a44' },
];
const FW = 14, FH = 20;
const hx2 = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const tillHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const blanda = (a, b, t) => { const x = hx2(a), y = hx2(b); return tillHex(x.map((v, i) => v + (y[i] - v) * t)); };
const morkare = (c, f) => tillHex(hx2(c).map(v => v * f));
// figuren som i Porträttstilar: en lista med färger (hex) eller null
function figur(P) {
  const g = Array(FW * FH).fill(null), set = (x, y, c) => { if (x >= 0 && x < FW && y >= 0 && y < FH) g[y * FW + x] = c; };
  const rect = (x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, c); };
  const child = P.age < 12, old = P.age > 55, top = child ? 6 : 1;
  const legC = morkare(P.cloth, 0.6), foot = '#3a2a1c', hair = P.hair;
  if (child) { rect(5, 16, 2, 3, P.skin); rect(8, 16, 2, 3, P.skin); rect(4, 19, 3, 1, foot); rect(8, 19, 3, 1, foot); }
  else { rect(5, 14, 2, 5, legC); rect(8, 14, 2, 5, legC); rect(4, 19, 3, 1, foot); rect(8, 19, 3, 1, foot); }
  const tw = child ? 5 : P.str ? 8 : P.end ? 5 : 6, x0 = Math.round(7 - tw / 2), ty = top + 6, th = child ? 4 : 7;
  rect(x0, ty, tw, th, P.cloth);
  if (P.fem && !child) rect(x0 - 1, ty + 5, tw + 2, 4, P.cloth);
  const aw = P.str ? 2 : 1, armC = P.str ? P.skin : P.cloth;
  rect(x0 - aw, ty, aw, th - 1, armC); rect(x0 + tw, ty, aw, th - 1, armC);
  set(x0 - 1, ty + th - 1, P.skin); set(x0 + tw + aw - 1, ty + th - 1, P.skin);
  if (P.str) rect(x0 + 2, ty, tw - 4, 3, P.skin);
  rect(4, top, 6, 6, P.skin);
  if (old) { set(4, top, null); set(9, top, null); }
  if (P.hs === 'short') { rect(4, top, 6, 1, hair); set(4, top + 1, hair); set(9, top + 1, hair); }
  if (P.hs === 'messy') { rect(4, top, 6, 1, hair); set(4, top + 1, hair); set(9, top + 1, hair); set(5, top - 1, hair); set(7, top - 1, hair); set(9, top - 1, hair); }
  if (P.hs === 'long') { rect(4, top, 6, 1, hair); rect(3, top, 1, 9, hair); rect(10, top, 1, 9, hair); set(4, top + 1, hair); set(9, top + 1, hair); }
  if (P.hs === 'curly') { rect(3, top - 1, 8, 2, hair); rect(3, top + 1, 1, 3, hair); rect(10, top + 1, 1, 3, hair); set(3, top - 1, null); set(10, top - 1, null); }
  if (P.hs === 'thin') { set(4, top + 1, hair); set(9, top + 1, hair); set(4, top + 2, hair); set(9, top + 2, hair); }
  set(5, top + 3, '#141010'); set(8, top + 3, '#141010');
  if (P.beard === 'full' || P.beard === 'grey') { const b = P.beard === 'grey' ? '#d8d4cc' : P.hair; rect(4, top + 4, 6, 2, b); rect(5, top + 6, 4, 1, b); }
  else { set(6, top + 5, P.mood < 0 ? morkare(P.skin, 0.55) : blanda(P.skin, '#7a2a24', 0.5)); set(7, top + 5, blanda(P.skin, '#7a2a24', 0.5)); }
  if (P.beard === 'stubble') { set(4, top + 5, blanda(P.skin, P.hair, 0.4)); set(9, top + 5, blanda(P.skin, P.hair, 0.4)); }
  if (P.blemish) { set(5, top + 4, blanda(P.skin, '#a03a30', 0.5)); set(9, top + 2, blanda(P.skin, '#a03a30', 0.5)); }
  if (P.scar) { set(8, top + 2, '#f0b4ac'); set(9, top + 4, '#e8a8a0'); }
  if (P.bandage) { rect(4, top + 1, 6, 1, '#ebe3cf'); set(8, top + 1, '#9a2a20'); }
  if (P.tool === 'spjut') { rect(12, 2, 1, 17, '#7a5a36'); set(12, 0, '#b0b4b8'); set(12, 1, '#8c9093'); set(11, ty + 4, P.skin); }
  if (P.tool === 'yxa') { rect(12, ty + 1, 1, 7, '#7a5a36'); rect(12, ty - 1, 2, 2, '#8c9093'); set(13, ty + 1, '#8c9093'); }
  return g;
}
// figuren i paletten, med kontur, skuggsida och ljussida
function ritaPerson(B, n, x0, y0) {
  const P = B.P, g = figur(PERSONER[n]).map(c => c && P.fran(c));
  const upp = v => v % 4 < 3 ? v + 1 : v, ner = v => v % 4 > 0 ? v - 1 : v;
  // skuggan på marken
  for (let x = 2; x < FW + 1; x++) if ((x + y0) % 2 === 0) { B.morka(x0 + x, y0 + FH); B.morka(x0 + x + 1, y0 + FH - 1); }
  for (let y = -1; y <= FH; y++) for (let x = -1; x <= FW; x++) {
    const at = (a, b) => (x + a >= 0 && x + a < FW && y + b >= 0 && y + b < FH) ? g[(y + b) * FW + x + a] : null;
    let v = at(0, 0);
    if (v === null) { if (at(1, 0) !== null || at(-1, 0) !== null || at(0, 1) !== null || at(0, -1) !== null) B.satt(x0 + x, y0 + y, P.i('kol', 0)); continue; }
    if (at(1, 0) !== v && x > 6) v = ner(v); // skuggsidan till höger
    else if (at(-1, 0) !== v && x < 7) v = upp(v); // ljuset från vänster
    B.satt(x0 + x, y0 + y, v);
  }
}

// ---------- granen ----------
function ritaGran(B, cx, by, h, P, opt) {
  const w2 = Math.round(h * 0.28), hc = h - 3, sno = opt.tid === 'istid';
  // skuggan på marken, snett till höger
  for (let dy = -2; dy <= 2; dy++) for (let dx = 0; dx <= w2 * 2; dx++) if ((dx + dy + by) % 2 === 0 && (dx - w2) ** 2 / (w2 * w2 + 1) + dy * dy / 5 < 1) B.morka(cx + dx, by + dy);
  for (let y = 0; y < 3; y++) { B.satt(cx, by - y, P.i('jord', 0)); B.satt(cx - 1, by - y, P.i('jord', 1)); }
  for (let r = 0; r < hc; r++) {
    const tier = (r % 5) / 4, hw = Math.max(0, Math.round((r / hc) * w2 * (0.55 + 0.45 * tier)));
    const y = by - h + r + 1;
    for (let dx = -hw; dx <= hw; dx++) {
      const kant = Math.abs(dx) === hw || (r % 5 === 4 && hash(cx + dx, y, 3) < 0.5);
      const rel = hw ? dx / hw : 0;
      let s = 0.55 - rel * 0.35 - tier * 0.25 + (hash(cx + dx, y, 4) - 0.5) * 0.18;
      let v = kant ? P.i('barr', 0) : s > 0.62 ? P.i('barr', 3) : s > 0.4 ? P.i('barr', 2) : s > 0.18 ? P.i('barr', 1) : P.i('barr', 0);
      if (sno && (r % 5 === 0 || r % 5 === 1) && rel < 0.5 && hash(cx + dx, y, 6) < 0.7) v = r % 5 === 0 ? P.i('ben', 3) : P.i('ben', 2);
      B.satt(cx + dx, y, v);
    }
  }
}

// ---------- lägerelden: stenring, ved, aska och lågor ----------
function ritaEld(B, cx, cy, P, opt) {
  for (let y = -5; y <= 5; y++) for (let x = -6; x <= 6; x++) {
    const d = x * x / 30 + y * y / 18;
    if (d < 1) B.satt(cx + x, cy + y, hash(cx + x, cy + y, 2) < 0.45 ? P.i('kol', 2) : hash(cx + x, cy + y, 3) < 0.6 ? P.i('kol', 1) : P.i('kol', 3));
  }
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * Math.PI * 2 + 0.3, sx = Math.round(cx + Math.cos(a) * 7), sy = Math.round(cy + Math.sin(a) * 5.2);
    const sten = [[-1, 0, 2], [0, 0, 2], [1, 0, 1], [-1, -1, 3], [0, -1, 2], [1, -1, 2], [-1, 1, 1], [0, 1, 1], [1, 1, 0]];
    for (const [dx, dy, t] of sten) B.satt(sx + dx, sy + dy, P.i('skiffer', t));
    B.satt(sx, sy + 2, P.i('kol', 0)); B.satt(sx - 1, sy + 2, P.i('kol', 1)); B.satt(sx + 1, sy + 2, P.i('kol', 0));
  }
  for (let i = -4; i <= 4; i++) { B.satt(cx + i, cy + Math.round(i * 0.5) + 1, P.i('jord', 1)); B.satt(cx + i, cy + Math.round(i * 0.5) + 2, P.i('jord', 0)); B.satt(cx + i, cy - Math.round(i * 0.4) + 1, P.i('jord', 2)); }
  // lågorna: höjd per kolumn, glöd längst ner
  const H = [2, 4, 7, 9, 6, 4, 2];
  H.forEach((hh, k) => {
    const x = cx - 3 + k;
    for (let j = 0; j < hh; j++) {
      const f = j / hh, y = cy - j;
      const v = f > 0.75 ? P.i('rost', 2) : f > 0.45 ? P.i('senap', 2) : (k >= 2 && k <= 4 && j < 3) ? P.i('ben', 3) : P.i('senap', 3);
      B.satt(x, y, v, true);
    }
  });
  B.satt(cx - 1, cy - 10, P.i('rost', 1), true); B.satt(cx + 2, cy - 8, P.i('rost', 2), true);
}

// ---------- kistan, 16 × 16 ----------
function ritaKista(B, x0, y0, P) {
  const o = P.i('kol', 1);
  for (let y = 2; y <= 14; y++) for (let x = 1; x <= 14; x++) {
    const kant = x === 1 || x === 14 || y === 2 || y === 14;
    let v;
    if (kant) v = o;
    else if (y <= 6) v = y === 3 ? P.i('jord', 3) : (x % 5 === 0 ? P.i('jord', 1) : P.i('jord', 2)); // locket, sett ovanifrån
    else if (y === 7) v = x <= 3 ? P.i('skiffer', 3) : P.i('skiffer', 1); // järnbandet
    else v = x >= 12 ? P.i('jord', 0) : (x % 5 === 0 ? P.i('kol', 3) : P.i('jord', 1)); // framsidan i skugga
    if (!kant && hash(x0 + x, y0 + y, 7) < 0.05) v = P.smuts[v];
    B.satt(x0 + x, y0 + y, v);
  }
  B.satt(x0 + 7, y0 + 8, P.i('senap', 2)); B.satt(x0 + 8, y0 + 8, P.i('senap', 1)); B.satt(x0 + 7, y0 + 9, P.i('senap', 0)); B.satt(x0 + 8, y0 + 9, P.i('kol', 1));
  for (let x = 2; x <= 15; x++) if (x % 2 === 0) B.morka(x0 + x, y0 + 15);
}

// ---------- slaktbänken, 32 × 16, med saker på ----------
function ritaBank(B, x0, y0, P) {
  for (let y = 5; y <= 13; y++) for (let x = 1; x <= 30; x++) {
    const kant = x === 1 || x === 30 || y === 5 || y === 13;
    let v = kant ? P.i('kol', 1) : y <= 9 ? (y === 6 ? P.i('jord', 3) : (y === 8 ? P.i('jord', 1) : P.i('jord', 2))) : P.i('jord', 0);
    const blod = hash(x0 + x, y0 + y, 113) < (vn(x0 + x, y0 + y, 6, 8) - 0.45) * 1.1; // blodet i träet som korn
    if (!kant && y <= 9 && blod) v = P.i('jord', 1);
    B.satt(x0 + x, y0 + y, v);
  }
  for (const lx of [3, 27]) for (let y = 14; y <= 15; y++) { B.satt(x0 + lx, y0 + y, P.i('kol', 1)); B.satt(x0 + lx + 1, y0 + y, P.i('jord', 0)); }
  for (let x = 2; x <= 31; x++) if (x % 2 === 1) B.morka(x0 + x, y0 + 15);
  ritaIkon(B, 'kniv', x0 + 4, y0 + 0);
  ritaIkon(B, 'kott', x0 + 15, y0 + 1);
}

// ---------- slaktbänken i tre versioner, tre rutor = 48 × 24 punkter (Björn efter v95: pröva ett par andra) ----------
// alla tre bygger på Björns val efter v55: den kluvna stocken med benen synliga och mer blod.
// 1 kluven stock på pinnben, 2 stock på två bockar med en blodränna, 3 tjock planka på två stubbar
function ritaSlakt(B, x0, y0, P, ver, horn = false) {
  const J = t => P.i('jord', t), K = t => P.i('kol', t), R = t => P.i('rost', t), Bn = t => P.i('ben', t);
  const s = (x, y, v) => B.satt(x0 + x, y0 + y, v);
  const slit = (x, y, v) => hash(x0 + x, y0 + y, 121) < 0.04 ? P.smuts[v] : v;
  const ben2 = (x, y1, y2) => { for (let y = y1; y <= y2; y++) { s(x, y, J(2)); s(x + 1, y, J(1)); s(x + 2, y, J(0)); } };
  const skugga = (xa, xb, ya, yb) => { for (let y = ya; y <= yb; y++) for (let x = xa + (y - ya); x <= xb + (y - ya); x++) B.morka(x0 + x, y0 + y); };
  // blod i träet: stora fläckar som korn, mörkast i mitten
  const blodTra = (x, y, v, cx, r) => { const d = Math.abs(x - cx) / r, n = vn(x0 + x, y0 + y, 3, 131) - d * 0.55; return n > 0.42 ? R(0) : n > 0.3 ? R(1) : v; };
  // en pöl på marken med mörk kant och en blank punkt
  const pol = (cx, cy, rx, ry) => {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
      const d = (x / rx) ** 2 + (y / ry) ** 2 + (vn(x0 + cx + x, y0 + cy + y, 2, 133) - 0.5) * 0.5;
      if (d <= 1) s(cx + x, cy + y, d > 0.72 ? R(0) : R(1));
    }
    s(cx - 1, cy - 1, R(2));
  };
  const dropp = (x, y1, y2) => { for (let y = y1; y <= y2; y++) s(x, y, y === y2 ? R(0) : R(1)); };
  if (ver === 1) {
    skugga(4, 45, 16, 21);
    if (horn) {
      // de bakre benen lite innanför och kortare (längre bort), de främre i ändarna
      for (const lx of [7, 37]) for (let y = 15; y <= 18; y++) { s(lx, y, J(1)); s(lx + 1, y, J(0)); s(lx + 2, y, K(1)); }
      for (const lx of [3, 42]) ben2(lx, 15, 21);
    } else for (const lx of [6, 39]) { ben2(lx, 15, 21); ben2(lx + 3, 15, 20); }
    // den kluvna ytan uppåt, barken framtill
    for (let y = 5; y <= 15; y++) for (let x = 2; x <= 45; x++) {
      const kant = y === 5 || x === 2 || x === 45 || y === 15;
      let v;
      if (kant) v = J(0);
      else if (y <= 11) { v = y === 6 ? J(3) : hash(Math.floor((x + y * 5) / 4), y, 122) < 0.25 ? J(2) : J(3); if (x <= 4) v = (x + y) % 3 ? J(2) : J(1); v = blodTra(x, y, v, 24, 16); }
      else v = y === 12 ? K(1) : hash(x, Math.floor(y / 2), 123) < 0.3 ? K(1) : J(0);
      if (!kant) v = slit(x, y, v);
      s(x, y, v);
    }
    for (const x of [19, 25, 30]) dropp(x, 12, 15 + (x % 3));
    pol(25, 19, 7, 2);
    for (const [x, y] of [[33, 8], [35, 9], [37, 8]]) s(x, y, J(1)); // knivmärken
    ritaIkon(B, 'kniv', x0 + 34, y0 + 1);
    ritaIkon(B, 'kott', x0 + 13, y0 + 3);
  } else if (ver === 2) {
    skugga(3, 46, 15, 22);
    const bock = cx => { for (let t = 0; t <= 14; t++) { const y = 7 + t; for (const [x, v] of [[cx - 4 + Math.round(t * 0.6), J(1)], [cx + 4 - Math.round(t * 0.6), J(2)]]) { s(x, y, v); s(x + 1, y, J(0)); } } };
    bock(7); bock(40);
    // stocken: runda sidor, kluven yta med en ränna i mitten där blodet rinner åt höger
    for (let y = 6; y <= 14; y++) for (let x = 1; x <= 46; x++) {
      const kant = y === 6 || y === 14 || x === 1 || x === 46;
      let v;
      if (kant) v = J(0);
      else if (y === 7) v = K(1);
      else if (y === 13) v = J(0);
      else if (y === 10) v = x > 12 ? R(x > 30 ? 0 : 1) : J(1); // rännan
      else { v = hash(Math.floor((x + y * 7) / 5), y, 124) < 0.22 ? J(2) : J(3); v = blodTra(x, y, v, 22, 12); }
      if (!kant && y !== 10) v = slit(x, y, v);
      s(x, y, v);
    }
    for (const y of [8, 9, 11, 12]) { s(2, y, J(1)); s(3, y, (y & 1) ? J(2) : J(1)); } // årsringarna i änden
    dropp(46, 11, 17); dropp(45, 14, 16);
    pol(43, 20, 4, 2); pol(22, 18, 3, 1);
    ritaIkon(B, 'skinn', x0 + 26, y0 + 8);
    ritaIkon(B, 'kniv', x0 + 12, y0 + 2);
  } else {
    skugga(4, 45, 17, 23);
    // två stubbar under plankan: barken med fåror, ljus till vänster, och rötterna ut i marken
    for (const cx of [9, 38]) {
      for (let y = 14; y <= 21; y++) for (let x = cx - 4; x <= cx + 4; x++) {
        if (y === 21 && Math.abs(x - cx) === 4) continue;
        const kant = Math.abs(x - cx) === 4 || y === 21;
        s(x, y, kant ? J(0) : (x - cx) % 3 === 0 ? J(0) : x < cx ? J(1) : K(1));
      }
      for (const [x, y] of [[cx - 5, 21], [cx - 6, 22], [cx + 5, 21], [cx + 6, 22]]) s(x, y, J(0));
    }
    // plankan: tjock och kort, med två fogar och mörkt blod som runnit in i mitten
    for (let y = 4; y <= 15; y++) for (let x = 1; x <= 46; x++) {
      const kant = y === 4 || x === 1 || x === 46;
      let v;
      if (kant) v = J(0);
      else if (y >= 13) v = y === 15 ? J(0) : J(1); // framkanten i skugga
      else if (y === 8) v = J(0); // fogen
      else { v = y === 5 || y === 9 ? J(3) : (hash(Math.floor((x + y * 3) / 3), y, 125) < 0.2 ? J(1) : J(2)); v = blodTra(x, y, v, 26, 14); }
      if (!kant && y !== 8) v = slit(x, y, v);
      s(x, y, v);
    }
    for (const [x, y] of [[14, 6], [15, 7], [17, 6], [18, 7], [36, 10], [37, 11]]) s(x, y, J(0)); // huggmärken
    for (const x of [22, 27, 31]) dropp(x, 13, 16 + (x % 2));
    pol(26, 20, 6, 2);
    ritaIkon(B, 'kniv', x0 + 6, y0 + 4);
    ritaIkon(B, 'ben', x0 + 30, y0 + 3);
    // ett ben på marken
    for (const [x, y] of [[44, 21], [45, 21], [46, 22]]) s(x, y, Bn(3));
  }
}

// ---------- slöjdbänken (flätarbänken), två rutor = 32 × 32 punkter ----------
// samma bänk som i spelet (Björn valde 4a efter v55): två plankor på raka ben, två stolpar med ett rep spänt emellan
// och en skåra framtill där bensylen ligger. Med dubbelt så många punkter får träet ådring, kvistar och knivmärken,
// repet får sin tvinning och sakerna på bänken har samma punktstorlek som bänken
// spant = true (Björn efter v95): repet spänt rakt mellan stolparna, utan trådar som hänger ner
function ritaSlojdbank(B, x0, y0, P, spant = false) {
  const J = t => P.i('jord', t), S = t => P.i('senap', t), K = t => P.i('kol', t);
  const s = (x, y, v) => B.satt(x0 + x, y0 + y, v);
  const slit = (x, y, v) => hash(x0 + x, y0 + y, 111) < 0.04 ? P.smuts[v] : v;
  // skuggan på marken, snett nedåt till höger
  for (let y = 23; y <= 31; y++) for (let x = 3; x <= 31; x++) if ((x + y) % 2 === 0 && y - 23 <= x - 1) B.morka(x0 + x, y0 + y);
  // stolparna: runda grenar, ljusa till vänster
  for (const p of [4, 25]) {
    s(p + 1, 0, J(0)); s(p + 2, 0, J(0));
    s(p, 1, J(0)); s(p + 1, 1, J(3)); s(p + 2, 1, J(2)); s(p + 3, 1, J(0));
    for (let y = 2; y <= 13; y++) { s(p, y, J(0)); s(p + 1, y, slit(p + 1, y, J(2))); s(p + 2, y, slit(p + 2, y, J(1))); s(p + 3, y, J(0)); }
    s(p + 1, 6, J(1)); s(p + 2, 9, J(0)); // en kvist och en spricka
  }
  // repet mellan stolparna, lite slakt eller spänt, tvinnat (var tredje punkt byter ton)
  for (let x = 8; x <= 24; x++) {
    const y = spant ? 4 : 4 + Math.round(Math.sin(((x - 8) / 16) * Math.PI) * 1.4), t = (x % 3) === 0;
    s(x, y, t ? S(1) : S(2)); s(x, y + 1, t ? S(2) : S(0));
  }
  for (const p of [4, 25]) for (let y = 3; y <= 6; y++) s(p + 1 + (y % 2), y, y % 2 ? S(1) : S(0)); // varven runt stolparna
  if (!spant) for (const [x, l] of [[13, 4], [14, 3], [19, 5]]) for (let j = 0; j < l; j++) s(x + (j > 1 ? 1 : 0), 7 + j, j === l - 1 ? S(0) : S(1)); // fibrer som hänger ner
  // skivan: två plankor sedda ovanifrån
  for (let y = 13; y <= 21; y++) for (let x = 1; x <= 30; x++) {
    let v;
    if (y === 13 || x === 1 || x === 30) v = J(0);
    else if (y === 17) v = J(0); // fogen mellan plankorna
    else if (y === 14 || y === 18) v = x > 26 ? J(2) : J(3); // plankans övre kant tar ljuset
    else {
      v = x > 26 ? J(1) : J(2);
      if (hash(Math.floor((x + y * 3) / 3), y, 112) < 0.2) v = J(1); // ådring i korta drag
    }
    if (y !== 13 && y !== 17 && x !== 1 && x !== 30) v = slit(x, y, v);
    s(x, y, v);
  }
  s(9, 15, J(0)); s(10, 15, J(1)); s(9, 16, J(1)); // en kvist
  for (const [x, y] of [[21, 15], [22, 16], [23, 15], [24, 16]]) s(x, y, J(1)); // knivmärken
  for (let x = 17; x <= 27; x++) { s(x, 19, K(1)); s(x, 20, x === 17 ? K(1) : J(1)); } // skåran framtill
  // framsidan i skugga och benen
  for (let x = 1; x <= 30; x++) { s(x, 22, slit(x, 22, x === 1 ? J(0) : J(1))); s(x, 23, x % 6 === 0 ? J(1) : J(0)); }
  for (const p of [3, 26]) for (let y = 24; y <= 29; y++) { s(p, y, J(1)); s(p + 1, y, J(2)); s(p + 2, y, J(0)); }
  // sakerna på bänken i sin vanliga storlek: ett nystan rep, en tuss hö och bensylen i skåran
  ritaIkon(B, 'rep', x0 + 3, y0 + 10);
  ritaIkon(B, 'torrgras', x0 + 10, y0 + 11);
  ritaIkon(B, 'bensyl', x0 + 18, y0 + 14);
}
// spelets slöjdbänk som den ser ut i dag: 16 × 16 punkter på två rutor (8 per ruta), förstorad två gånger
function ritaSlojdbankIdag(B, x0, y0, P) {
  const L = Bild(16, 16, P);
  ritaIkon(L, 'flatarbank_karta', 0, 0);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const v = L.px[(y >> 1) * 16 + (x >> 1)];
    if (v >= 0) B.satt(x0 + x, y0 + y, v);
    else if (IKONER.PIX.flatarbank_karta[y >> 1][x >> 1] === 'x') B.morka(x0 + x, y0 + y);
  }
}

// ---------- blod på marken, 16 punkter på rutan ----------
function ritaBlod(B, cx, cy, P) {
  for (let y = -3; y <= 3; y++) for (let x = -5; x <= 5; x++) {
    const d = x * x / 18 + y * y / 6 + (hash(cx + x, cy + y, 11) - 0.5) * 0.5;
    if (d < 0.55) B.satt(cx + x, cy + y, P.i('rost', 0));
    else if (d < 1) B.satt(cx + x, cy + y, P.i('kol', 1));
  }
  B.satt(cx - 2, cy - 1, P.i('rost', 1)); B.satt(cx - 1, cy - 1, P.i('rost', 1));
  for (let k = 0; k < 9; k++) B.satt(cx + Math.round((hash(k, cy, 12) - 0.5) * 18), cy + Math.round((hash(k, cx, 13) - 0.5) * 9), P.i('rost', 0));
}

// ---------- marken ----------
const SC = { W: 224, H: 144 }; // 14 × 9 rutor
const STIG = [[[104, 74], [124, 64], [140, 58]], [[104, 74], [92, 90], [82, 104]], [[104, 74], [130, 92], [168, 112]]];
function stigAvst(x, y) {
  let best = 1e9;
  for (const linje of STIG) for (let i = 0; i < linje.length - 1; i++) {
    const [ax, ay] = linje[i], [bx, by] = linje[i + 1], dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return best;
}
const GRANAR = (() => {
  const ut = [];
  for (let ty = 0; ty < 10; ty++) for (let tx = 0; tx < 3; tx++) if (hash(tx, ty, 21) < 0.9 - tx * 0.22) ut.push([tx * 16 + 4 + Math.floor(hash(tx, ty, 22) * 9), ty * 16 + 10 + Math.floor(hash(tx, ty, 23) * 6), 20 + Math.floor(hash(tx, ty, 24) * 9)]);
  for (let tx = 3; tx < 9; tx++) if (hash(tx, 0, 25) < 0.75) ut.push([tx * 16 + 3 + Math.floor(hash(tx, 0, 26) * 10), 12 + Math.floor(hash(tx, 0, 27) * 5), 18 + Math.floor(hash(tx, 0, 28) * 8)]);
  ut.push([196, 20, 22], [210, 30, 26], [118, 132, 18]);
  return ut;
})();
// hur långt in i skogen en punkt är (över 0 i skogen, under 0 ute på gräset)
function skogE(x, y) {
  const e1 = 50 + (vn(x, y, 12, 61) - 0.5) * 16 - x;
  const e2 = Math.min(24 + (vn(x, y, 9, 63) - 0.5) * 12 - y, 150 + (vn(x, y, 8, 64) - 0.5) * 14 - x);
  return Math.max(e1, e2);
}
// unga granar och buskar i skogskanten (version 2)
const UNGGRAN = (() => {
  const ut = [];
  for (let y = 8; y < 140; y += 7) for (let x = 6; x < 170; x += 9) {
    const px = x + Math.floor(hash(x, y, 101) * 6), py = y + Math.floor(hash(x, y, 102) * 5), e = skogE(px, py);
    if (e > -9 && e < -2 && hash(x, y, 103) < 0.42 && stigAvst(px, py) > 10) ut.push([px, py, 8 + Math.floor(hash(x, y, 104) * 5)]);
  }
  // inte där folket, bänkarna och elden står
  const fritt = [[76, 50, 98, 84], [44, 88, 86, 116], [50, 30, 92, 72], [90, 60, 118, 84]];
  return ut.filter(([x, y]) => !fritt.some(([a, b, c, d]) => x > a && x < c && y > b && y < d + 4));
})();
// vattnet och stranden, korn i stället för fläckar, och en skogskant i steg. Gräset och skogsmarken har låg kontrast
function mark(B, x, y, P, opt) {
  const is = opt.tid === 'istid';
  const vd = ((x - 222) / 74) ** 2 + ((y - 152) / 58) ** 2 + (vn(x, y, 7, 1) - 0.5) * 0.22;
  // tonen väljs mest punkt för punkt (korn) och bara lite av större fält
  const nn = vn(x, y, 7, 2) * 0.35 + hash(x, y, 3) * 0.65;
  const ton = (lo, mid, hi) => nn < 0.24 ? lo : nn > 0.8 ? hi : mid;
  const tonY = (lo, mid, hi) => nn < 0.12 ? lo : nn > 0.91 ? hi : mid; // gräset och skogsmarken: färre ljusa och mörka punkter
  const slump = s => hash(x, y, s);
  if (vd < 1) {
    if (is) {
      let v = ton(P.i('skiffer', 2), P.i('skiffer', 3), P.i('ben', 1));
      if (Math.abs(vn(x, y, 9, 31) - 0.5) < 0.025) v = P.i('skiffer', 1);
      return v;
    }
    const djup = vd < 0.55 ? (bayer(x, y) < (0.55 - vd) * 3 ? P.i('barr', 0) : P.i('skiffer', 0)) : vd < 0.85 ? P.i('skiffer', 1) : P.i('skiffer', 2);
    if (y % 5 === 0 && vn(x, y, 4, 33) > 0.62) return vd < 0.6 ? P.i('skiffer', 1) : P.i('skiffer', 3);
    return djup;
  }
  if (vd < 1.16) return is ? ton(P.i('ben', 0), P.i('ben', 1), P.i('ben', 2)) : ton(P.i('jord', 2), P.i('senap', 0), P.i('senap', 1));
  const sv = Math.hypot((x - 168) / 13, (y - 26) / 9) + (vn(x, y, 4, 41) - 0.5) * 0.5;
  if (sv < 1) return sv < 0.35 ? P.i('skiffer', 3) : ton(P.i('skiffer', 1), P.i('skiffer', 2), P.i('skiffer', 3));
  const sd = stigAvst(x, y) - (vn(x, y, 5, 51) - 0.5) * 4;
  const e = skogE(x, y);
  if (sd < 4) {
    if (is) return bayer(x, y) < 0.45 ? P.i('jord', 1) : ton(P.i('ben', 0), P.i('jord', 2), P.i('ben', 0));
    return ton(P.i('jord', 1), P.i('jord', 2), P.i('jord', 3));
  }
  if (sd < 7 && slump(53) < (7 - sd) / 3.5) return is ? P.i('ben', 0) : P.i('jord', 2);
  if (is) {
    let v = ton(P.i('ben', 1), P.i('ben', 2), P.i('ben', 3));
    if (e > 0 && slump(66) < Math.min(1, e / 8) * 0.35) v = P.i('ben', 0); // skuggigare snö under granarna
    return v;
  }
  // barr 1 och oliv 0 blandas till skogsmarkens mellanton: olika kulör men nästan samma ljushet
  const skogsmark = () => { let v = tonY(P.i('barr', 1), hash(x, y, 87) < 0.5 ? P.i('barr', 1) : P.i('oliv', 0), P.i('oliv', 1)); if (hash(x, y, 62) < 0.04) v = P.i('jord', 1); return v; };
  const morktGras = () => tonY(P.i('oliv', 0), P.i('oliv', 1), P.i('oliv', 2));
  const gras = () => tonY(P.i('oliv', 1), P.i('oliv', 2), P.i('oliv', 3));
  // skogskanten i steg: skogsmark, skogsmark med gräs, mörkt högt gräs med barr, och gräs som ljusnar
  if (e > 4) return skogsmark();
  if (e > 0) return slump(67) < 0.3 + (4 - e) * 0.08 ? morktGras() : skogsmark();
  if (e > -5) return slump(68) < 0.18 ? skogsmark() : morktGras();
  if (e > -12) return slump(69) < (e + 12) / 7 * 0.6 ? morktGras() : gras();
  return gras();
}
function strån(B, P, opt) {
  if (opt.tid === 'istid') return;
  for (let k = 0; k < 90; k++) {
    const x = Math.floor(hash(k, 1, 91) * SC.W), y = Math.floor(hash(k, 2, 92) * SC.H);
    const bas = B.get(x, y);
    if (bas !== P.i('oliv', 2) && bas !== P.i('oliv', 1)) continue;
    const top = P.i('oliv', 3);
    B.satt(x, y, P.i('oliv', 0)); B.satt(x, y - 1, top); B.satt(x + 1, y - 1, P.i('oliv', 0)); B.satt(x + 1, y - 2, top);
  }
  // högt mörkt gräs längs skogskanten
  for (let k = 0; k < 400; k++) {
    const x = Math.floor(hash(k, 5, 93) * 170), y = Math.floor(hash(k, 6, 94) * SC.H), e = skogE(x, y);
    if (e > 1 || e < -10 || stigAvst(x, y) < 6) continue;
    const bas = B.get(x, y);
    if (![P.i('oliv', 0), P.i('oliv', 1), P.i('oliv', 2)].includes(bas)) continue;
    const top = hash(k, 7) < 0.25 ? P.i('senap', 0) : P.i('oliv', 2);
    B.satt(x, y, P.i('barr', 0)); B.satt(x, y - 1, P.i('oliv', 0)); B.satt(x, y - 2, top);
    if (hash(k, 8) < 0.5) { B.satt(x - 1, y - 1, P.i('oliv', 0)); B.satt(x - 1, y - 2, top); }
  }
}

// ---------- hela scenen ----------
function ritaScen(P, opt) {
  const B = Bild(SC.W, SC.H, P);
  for (let y = 0; y < SC.H; y++) for (let x = 0; x < SC.W; x++) B.satt(x, y, mark(B, x, y, P, opt));
  strån(B, P, opt);
  if (opt.tid !== 'istid') ritaBlod(B, 74, 116, P);
  // saker i ordning uppifrån, så att det som står längre ner hamnar framför
  const ting = [];
  for (const [x, y, h] of GRANAR) ting.push([y, () => ritaGran(B, x, y, h, P, opt)]);
  for (const [x, y, h] of UNGGRAN) ting.push([y, () => ritaGran(B, x, y, h, P, opt)]);
  ting.push([66, () => ritaSlojdbank(B, 56, 34, P)]);
  ting.push([80, () => ritaEld(B, 104, 74, P, opt)]);
  ting.push([62, () => { // förrådet: fyra saker på varje ruta
    const hog = [['ved', 'ved', 'grenar', 'torrgras'], ['sten', 'flinta', 'svamp', 'fisk']];
    hog.forEach((l, t) => l.forEach((k, j) => ritaIkon(B, k, 128 + t * 16 + (j % 2) * 8, 44 + Math.floor(j / 2) * 8)));
  }]);
  ting.push([90, () => ritaKista(B, 160, 72, P)]);
  ting.push([110, () => ritaBank(B, 50, 96, P)]);
  // de fem, och var de står
  ting.push([84, () => ritaPerson(B, 0, 80, 64)]); // Arn med spjutet vid elden
  ting.push([56, () => ritaPerson(B, 1, 92, 38)]); // Ylva vid slöjdbänken
  ting.push([110, () => ritaPerson(B, 2, 84, 90)]); // Gorm vid slaktbänken
  ting.push([98, () => ritaPerson(B, 3, 112, 78)]); // Tova vid elden
  ting.push([102, () => { ritaPerson(B, 4, 140, 82); ritaIkon(B, 'ved', 141, 92); }]); // Bodvar bär ved
  ting.push([30, () => ritaIkon(B, 'kanin', 186, 44)]);
  ting.push([40, () => ritaIkon(B, 'kanin', 198, 50)]);
  ting.sort((a, b) => a[0] - b[0]).forEach(t => t[1]());
  ljus(B, P, opt);
  return B;
}
// natten: varje punkt byts mot en mörkare färg ur paletten, utom nära elden. Ljuset från elden sprids i steg utåt:
// dagsfärger närmast, sedan ett varmt sken, skymning, kväll och natt. Övergången mellan två steg ritas med ett fast
// rastermönster i stället för en mjuk toning
const LJUSSTEG = [14, 28, 46, 68, 96]; // avstånd i punkter där nästa steg är helt framme
function ljus(B, P, opt) {
  if (opt.tid !== 'natt') return;
  const { w, h } = B, steg = [null, P.sken, P.skymn, P.kvall, P.natt];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x, v = B.px[k];
    if (v < 0 || B.sken[k]) continue;
    const d = Math.hypot(x - 104, (y - 72) * 1.15);
    let n = LJUSSTEG.findIndex(r => d < r);
    if (n < 0) n = steg.length - 1;
    else if (n > 0 && bayer(x, y) >= (d - LJUSSTEG[n - 1]) / (LJUSSTEG[n] - LJUSSTEG[n - 1])) n--;
    if (n > 0) B.px[k] = steg[n][v];
  }
}
function tillCanvas(B, c, skala = 1) {
  c.width = B.w; c.height = B.h;
  const g = c.getContext('2d'), im = g.createImageData(B.w, B.h);
  for (let i = 0; i < B.px.length; i++) {
    const v = B.px[i]; if (v < 0) continue;
    const [r, gg, b] = B.P.cols[v].rgb; im.data.set([r, gg, b, 255], i * 4);
  }
  g.putImageData(im, 0, 0);
  if (skala) c.style.width = B.w * skala + 'px';
}
function utsnitt(B, x0, y0, w, h) {
  const U = Bild(w, h, B.P);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) U.px[y * w + x] = B.px[(y0 + y) * B.w + x0 + x];
  return U;
}

// ---------- i dag mot förslaget ----------
const Z = 6; // skärmpunkter per spelpunkt i jämförelsen
function rutnat(g, x0, n, sida) {
  g.strokeStyle = 'rgba(255,240,210,0.16)'; g.lineWidth = 1;
  for (let i = 1; i < n; i++) { const p = Math.round(x0 + (i * sida) / n) + 0.5; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, sida); g.stroke(); g.beginPath(); g.moveTo(x0, Math.round((i * sida) / n) + 0.5); g.lineTo(x0 + sida, Math.round((i * sida) / n) + 0.5); g.stroke(); }
}
function ikonPa(g, k, x, y, punkt) {
  const rows = IKONER.PIX[k], pal = IKONER.PAL[k] || {};
  rows.forEach((row, yy) => [...row].forEach((ch, xx) => { if (ch !== '.' && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x + xx * punkt, y + yy * punkt, punkt, punkt); } }));
}
function ritaIdag(c) {
  const T = 16 * Z; c.width = T * 3 + 16; c.height = T;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  [0, 1, 2].forEach(i => { g.fillStyle = '#8daa5f'; g.fillRect(i * (T + 8), 0, T, T); });
  ikonPa(g, 'kista_karta', 0, 0, T / 8); rutnat(g, 0, 8, T);
  ['ved', 'flinta', 'svamp', 'fisk'].forEach((k, j) => ikonPa(g, k, T + 8 + (j % 2) * T / 2, Math.floor(j / 2) * T / 2, T / 16));
  rutnat(g, T + 8, 16, T);
  const x0 = 2 * (T + 8);
  g.fillStyle = '#355e33';
  g.beginPath(); g.moveTo(x0 + T * 0.3, T * 0.12); g.lineTo(x0 + T * 0.08, T * 0.62); g.lineTo(x0 + T * 0.52, T * 0.62); g.fill();
  g.fillStyle = '#c99a6a'; g.beginPath(); g.arc(x0 + T * 0.68, T * 0.5, T * 0.13, 0, 7); g.fill();
  g.fillStyle = '#6a8ab0'; g.beginPath(); g.arc(x0 + T * 0.68, T * 0.72, T * 0.17, 0, 7); g.fill();
}
function ritaForslag(c, P) {
  const B = Bild(16 * 3 + 2, 16, P);
  for (let y = 0; y < 16; y++) for (let x = 0; x < B.w; x++) {
    if (x === 16 || x === 17 || x === 34 || x === 35) continue;
    const n = vn(x, y, 3.5, 2) * 0.72 + hash(x, y, 3) * 0.28;
    B.satt(x, y, n < 0.28 ? P.i('oliv', 1) : n > 0.78 ? P.i('oliv', 3) : P.i('oliv', 2));
  }
  ritaKista(B, 0, 0, P);
  ['ved', 'flinta', 'svamp', 'fisk'].forEach((k, j) => ritaIkon(B, k, 18 + (j % 2) * 8, Math.floor(j / 2) * 8));
  ritaGran(B, 40, 15, 16, P, { tid: 'dag' });
  ritaPerson(B, 3, 36, -5);
  const T = 16 * Z; c.width = T * 3 + 16; c.height = T;
  const g = c.getContext('2d');
  for (let y = 0; y < 16; y++) for (let x = 0; x < B.w; x++) {
    const v = B.px[y * B.w + x]; if (v < 0) continue;
    const sx = x < 16 ? x * Z : x < 34 ? T + 8 + (x - 18) * Z : 2 * (T + 8) + (x - 36) * Z;
    g.fillStyle = P.cols[v].hex; g.fillRect(sx, y * Z, Z, Z);
  }
  [0, T + 8, 2 * (T + 8)].forEach(x0 => rutnat(g, x0, 16, T));
}

// ---------- symbolerna i pixlar, 8 × 8 ----------
const SYMBOLER = [
  { namn: 'Hälsa', ers: '❤', l: { o: 'rost0', r: 'rost2', R: 'rost3', w: 'ben3' }, p: ['.oo..oo.', 'orRoorro', 'oRwrrrro', 'orrrrrro', '.orrrro.', '..orro..', '...oo...', '........'] },
  { namn: 'Törst', ers: '💧', l: { o: 'skiffer0', b: 'skiffer2', B: 'skiffer3', w: 'ben3' }, p: ['...o....', '...oo...', '..obbo..', '..obbo..', '.obBbbo.', '.oBwbbo.', '.obbbbo.', '..oooo..'] },
  { namn: 'Kyla', ers: '❄', l: { w: 'ben3', W: 'skiffer3' }, p: ['...w....', '.w.w.w..', '..wWw...', 'wwWWWww.', '..wWw...', '.w.w.w..', '...w....', '........'] },
  { namn: 'Eld', ers: '🔥', l: { o: 'rost0', r: 'rost2', s: 'senap2', y: 'senap3', w: 'ben3' }, p: ['....o...', '...oro..', '..orro..', '.orsrro.', '.orsysro', 'orsyyyro', 'orsywyso', '.orrrro.'] },
  { namn: 'Temperatur', ers: '🌡', l: { o: 'kol1', g: 'skiffer3', r: 'rost2', R: 'rost3' }, p: ['...oo...', '..oggo..', '..ogro..', '..ogro..', '..orro..', '.orRrro.', '.orrrro.', '..oooo..'] },
  { namn: 'Död', ers: '☠', l: { o: 'kol1', w: 'ben2', W: 'ben3', k: 'kol0' }, p: ['..oooo..', '.oWwwwo.', 'oWwwwwwo', 'owkwwkwo', 'owkwwkwo', '.owwwwo.', '..wkwk..', '..owwo..'] },
  { namn: 'Sömn', ers: '💤', l: { z: 'ben2', Z: 'skiffer3' }, p: ['.zzzzz..', '....z...', '...z....', '..z.....', '.zzzzz..', '.....ZZZ', '......Z.', '.....ZZZ'] },
  { namn: 'Måltid', ers: '🍽', l: { o: 'kol1', j: 'jord1', J: 'jord2', s: 'senap2', S: 'senap3', e: 'ben1' }, p: ['.e..e...', '..e..e..', '........', 'osSSSSso', 'ojJJJJjo', '.ojJJjo.', '..ojjo..', '...oo...'] },
];
function ritaSymbol(c, s, P) {
  const B = Bild(8, 8, P);
  ritaSprite(B, s.p, s.l, 0, 0);
  tillCanvas(B, c, 0);
}

// ---------- porträtten ur Porträttstilar ----------
// en person blir en lista av former i en ruta 100 × 100 (e = ellips, p = polygon, l = linje); det = detaljnivå
const hex = hx2, mix = blanda, shade = morkare;
function former(P) {
  const S = [], child = P.age < 12, old = P.age > 55, ugly = P.beauty < 0, d = ugly ? 1.8 : 0;
  const hx = 50, hy = child ? 50 : 44, rx = child ? 21 : P.str ? 20 : P.fem ? 17 : 18, ry = child ? 21 : 25;
  const skinD = shade(P.skin, 0.8), lip = mix(P.skin, '#a8423a', 0.5), lipD = mix(P.skin, '#3a1612', 0.7), brow = mix(P.hair, '#000000', 0.3);
  const e = (cx, cy, rx, ry, c, o = {}) => S.push({ t: 'e', cx, cy, rx, ry, c, ...o });
  const p = (pts, c, o = {}) => S.push({ t: 'p', pts, c, ...o });
  const l = (pts, w, c, o = {}) => S.push({ t: 'l', pts, w, c, ...o });
  const sw = child ? 26 : P.str ? 46 : P.end ? 31 : 37;
  // bakre håret
  if (P.hs === 'long') { e(hx, hy + 14, rx + 6, ry + 14, P.hair, { sh: 1 }); }
  // kroppen
  if (P.str) {
    e(50, 104, sw, 26, P.skin, { sh: 1, skin: 1 });
    e(50 - sw * 0.7, 88, 11, 10, P.skin, { sh: 1 }); e(50 + sw * 0.7, 88, 11, 10, P.skin, { sh: 1 });
    l([[50 - sw * 0.35, 92], [50 - 3, 96]], 1.2, skinD, { det: 2 }); l([[50 + sw * 0.35, 92], [50 + 3, 96]], 1.2, skinD, { det: 2 });
    p([[50 - sw - 2, 101], [50 - sw * 0.75, 84], [50 - sw * 0.4, 80], [50 - 9, 101]], P.cloth, { sh: 1 });
    p([[50 + sw + 2, 101], [50 + sw * 0.75, 84], [50 + sw * 0.4, 80], [50 + 9, 101]], P.cloth, { sh: 1 });
  } else {
    e(50, 106, sw, 28, P.cloth, { sh: 1 });
    p([[50 - 8, 79], [50 + 8, 79], [50, 92]], P.skin);
    if (!child) l([[50 - sw * 0.8, 92], [50 - sw * 0.3, 86]], 1, shade(P.cloth, 0.75), { det: 2 });
  }
  // hals
  const nw = P.str ? 10 : child ? 6 : 7;
  p([[hx - nw, hy + 12], [hx + nw, hy + 12], [hx + nw + 1, 84], [hx - nw - 1, 84]], skinD, { skin: 1 });
  // smycken: tandhalsband för jägaren, pärlor för den unga kvinnan
  if (P.str) for (let i = 0; i < 7; i++) { const t = Math.PI * (0.2 + i * 0.1); p([[50 - 12 * Math.cos(t) - 1, 76 + 7 * Math.sin(t)], [50 - 12 * Math.cos(t) + 1, 76 + 7 * Math.sin(t)], [50 - 12 * Math.cos(t), 79.5 + 7 * Math.sin(t)]], '#e8dcc0', { det: 2, sh: 1 }); }
  if (P.fem && !child) for (let i = 0; i < 9; i++) { const t = Math.PI * (0.15 + i * 0.0875); e(50 - 10 * Math.cos(t), 78 + 5 * Math.sin(t), 1.1, 1.1, i % 2 ? '#b8543a' : '#d9c79a', { det: 2 }); }
  if (!P.str && !child) { l([[50 - sw * 0.75, 96], [50 - sw * 0.55, 90], [50 - sw * 0.35, 86]], 0.7, shade(P.cloth, 1.25), { det: 3 }); l([[50 + sw * 0.3, 95], [50 + sw * 0.6, 92]], 0.7, shade(P.cloth, 0.7), { det: 3 }); }
  // öron
  const er = ugly ? 1.3 : 1;
  e(hx - rx + 0.5, hy + 3, 3.5 * er, 6 * er, P.skin, { sh: 1, det: 2 }); e(hx + rx - 0.5, hy + 3 + d, 3.5 * er * 1.1, 6 * er, P.skin, { sh: 1, det: 2 });
  // huvud och käke
  e(hx, hy, rx, ry, P.skin, { sh: 1, skin: 1, head: 1 });
  if (P.str) p([[hx - rx + 0.5, hy + 4], [hx + rx - 0.5, hy + 4], [hx + rx - 3, hy + ry - 5], [hx + 7, hy + ry + 0.5], [hx - 7, hy + ry + 0.5], [hx - rx + 3, hy + ry - 5]], P.skin, { sh: 1, skin: 1, cx: hx, cy: hy, rx, ry });
  if (ugly) e(hx + 3, hy + 6, rx - 4, ry - 8, P.skin, { sh: 1, skin: 1, cx: hx, cy: hy, rx, ry });
  // skuggor: insjunkna ögonhålor och kindben, mörkare hos gamla och trötta
  if (!child) {
    const so = old || ugly ? 0.86 : 0.91;
    e(hx - (child ? 8 : 7.5), hy - 0.5, 5.2, 3.6, shade(P.skin, so), { det: 2, soc: 1 }); e(hx + 7.5, hy - 0.5 + d, 5.2, 3.6, shade(P.skin, so), { det: 2, soc: 1 });
    l([[hx - rx + 3, hy + 5], [hx - 9, hy + 12]], 1.6, shade(P.skin, 0.85), { det: 2, a: 0.35 }); l([[hx + rx - 3, hy + 5 + d], [hx + 9, hy + 12 + d]], 1.6, shade(P.skin, 0.8), { det: 2, a: 0.35 });
    l([[hx - 5, hy + 9], [hx - 7.5, hy + 15]], 0.8, shade(P.skin, 0.82), { det: 3 }); l([[hx + 5, hy + 9], [hx + 7.5, hy + 15]], 0.8, shade(P.skin, 0.82), { det: 3 });
  } else {}
  // kinder
  e(hx - 10, hy + 9, 4.5, 3, '#e0707a', { a: child ? 0.3 : 0.18, det: 3 }); e(hx + 10, hy + 9 + d, 4.5, 3, '#e0707a', { a: child ? 0.3 : 0.18, det: 3 });
  // ålder
  if (old) {
    l([[hx - 9, hy - ry * 0.38], [hx + 9, hy - ry * 0.42]], 0.8, skinD, { det: 2 }); l([[hx - 7, hy - ry * 0.25], [hx + 7, hy - ry * 0.28]], 0.8, skinD, { det: 3 });
    l([[hx - 5, hy + 8], [hx - 8, hy + 15]], 0.8, skinD, { det: 2 }); l([[hx + 5, hy + 8], [hx + 8, hy + 15]], 0.8, skinD, { det: 2 });
  }
  if (P.blemish) for (const [x, y, r] of [[-11, 8, 1.2], [-8, 11, 0.9], [12, 6, 1], [9, 12, 1.3], [3, -12, 1], [-4, -14, 0.8]]) e(hx + x, hy + y, r, r, mix(P.skin, '#a03a30', 0.45), { det: 2 });
  // skägg
  const beardPts = [[hx - rx + 0.5, hy + 1], [hx - rx + 3, hy + ry - 4], [hx - 7, hy + ry + 5], [hx + 7, hy + ry + 5], [hx + rx - 3, hy + ry - 4], [hx + rx - 0.5, hy + 1], [hx + rx - 6, hy + 9], [hx + 5, hy + 11], [hx - 5, hy + 11], [hx - rx + 6, hy + 9]];
  if (P.beard === 'full' || P.beard === 'grey') {
    p(beardPts, P.beard === 'grey' ? '#d8d4cc' : P.hair, { sh: 1, cx: hx, cy: hy + 12, rx, ry: 14 });
    p([[hx - 8, hy + 14], [hx, hy + 11], [hx + 8, hy + 14], [hx + 7, hy + 16], [hx, hy + 13.5], [hx - 7, hy + 16]], P.beard === 'grey' ? '#c2bdb4' : P.hair);
  }
  if (P.beard === 'stubble') p(beardPts, P.hair, { a: 0.35 });
  // ögon
  const eyY = hy + (child ? 2 : 0), edx = child ? 8 : 7.5, ew = child ? 4 : 3.4, eh = child ? 3 : 2.1;
  for (const [s, dy, k] of [[-1, 0, 1], [1, d, ugly ? 0.85 : 1]]) {
    const x = hx + s * edx, y = eyY + dy;
    e(x, y, ew * k, eh * k, '#f4efe6');
    e(x, y, eh * 0.95 * k, eh * 0.95 * k, P.eye);
    e(x, y, eh * 0.45 * k, eh * 0.45 * k, '#141010');
    e(x - 0.6, y - 0.6, 0.45, 0.45, '#ffffff', { det: 3 });
    l([[x - ew * k, y], [x - ew * 0.5 * k, y - eh * k], [x + ew * 0.5 * k, y - eh * k], [x + ew * k, y]], 0.7, skinD, { det: 2 });
    if (P.beauty > 0.5) l([[x - s * ew * k, y - 0.2], [x - s * ew * 0.3, y - eh - 0.4], [x + s * ew * 0.6, y - eh - 0.2], [x + s * (ew + 1.6), y - eh - 1.2]], 1.2, '#1a1210');
    if (old) l([[x - ew * 0.7, y + eh + 1.2], [x + ew * 0.7, y + eh + 1.2]], 0.6, skinD, { det: 3 });
  }
  // ögonbryn: ledsen = insidan upp, glad = välvt
  const bY = eyY - (child ? 6 : 6.5), sad = Math.max(0, -P.mood), arch = Math.max(0, P.mood) * 1.2, bw = P.fem || child ? 1.4 : 2.2;
  for (const [s, dy] of [[-1, 0], [1, d]]) {
    const x = hx + s * edx;
    l([[x + s * 4, bY + dy + 1 + sad * 0.5], [x, bY + dy - arch], [x - s * 4, bY + dy - sad * 2.5]], bw, P.hs === 'thin' ? '#bdb7ad' : brow);
  }
  // näsa
  const nY = hy + (child ? 8 : 9), nb = ugly ? 1.5 : P.fem || child ? 0.75 : 1;
  l([[hx + 0.5 + (ugly ? 1 : 0), nY - 7], [hx + 1.5 * nb + (ugly ? 1 : 0), nY - 0.5]], 0.9, skinD, { det: 2 });
  e(hx + (ugly ? 1 : 0), nY, 3 * nb, 1.8 * nb, mix(P.skin, skinD, 0.5));
  e(hx - 1.4 * nb + (ugly ? 1 : 0), nY + 0.4, 0.8, 0.6, shade(P.skin, 0.55), { det: 2 }); e(hx + 1.4 * nb + (ugly ? 1 : 0), nY + 0.4, 0.8, 0.6, shade(P.skin, 0.55), { det: 2 });
  // mun: hörnen upp eller ner efter humöret
  const mY = hy + (child ? 13.5 : 15.5), mw = child ? 5 : 5.5, m = P.mood;
  if (P.beauty > 0.5) { e(hx, mY + 1.4, mw * 0.7, 1.9, lip); p([[hx - mw * 0.9, mY - m * 1.2], [hx - 1.5, mY - 1.6], [hx, mY - 1], [hx + 1.5, mY - 1.6], [hx + mw * 0.9, mY - m * 1.2], [hx, mY + 0.4]], lip); }
  l([[hx - mw, mY - m * 1.6], [hx - mw * 0.4, mY + m * 0.9], [hx + mw * 0.4, mY + m * 0.9 + d * 0.3], [hx + mw, mY - m * 1.6 + d * 0.7]], 1.3, lipD);
  if (m > 0.7 && child) e(hx, mY + 1.6, mw * 0.55, 1.2, '#f4efe6', { det: 2 });
  // hår fram
  const cap = (extra = 1.5, spik = 0) => {
    const pts = [];
    for (let i = 0; i <= 14; i++) { const t = Math.PI + (i / 14) * Math.PI, r = spik && i % 2 ? extra + spik : extra; pts.push([hx + (rx + r) * Math.cos(t), hy + (ry + r) * Math.sin(t)]); }
    return pts;
  };
  if (P.hs === 'short') p([...cap(), [hx + rx, hy - ry * 0.3], [hx + rx * 0.4, hy - ry * 0.55], [hx, hy - ry * 0.5], [hx - rx * 0.5, hy - ry * 0.6], [hx - rx, hy - ry * 0.25]], P.hair, { sh: 1, cx: hx, cy: hy, rx, ry });
  if (P.hs === 'messy') p([...cap(1.5, 4), [hx + rx + 1, hy - ry * 0.2], [hx + rx * 0.5, hy - ry * 0.45], [hx + 3, hy - ry * 0.65], [hx - 2, hy - ry * 0.4], [hx - rx * 0.6, hy - ry * 0.55], [hx - rx - 1, hy - ry * 0.15]], P.hair, { sh: 1, cx: hx, cy: hy, rx, ry });
  if (P.hs === 'long') {
    p([...cap(2), [hx + rx + 1, hy - ry * 0.1], [hx + rx * 0.6, hy - ry * 0.6], [hx - 2, hy - ry * 0.75], [hx - rx * 0.8, hy - ry * 0.35], [hx - rx - 1, hy - ry * 0.05]], P.hair, { sh: 1, cx: hx, cy: hy, rx, ry });
    p([[hx - rx - 1.5, hy - 6], [hx - rx - 4, hy + ry + 10], [hx - rx + 4, hy + ry + 4], [hx - rx + 2, hy + 2]], P.hair, { sh: 1, cx: hx, cy: hy, rx, ry });
    p([[hx + rx + 1.5, hy - 6], [hx + rx + 4, hy + ry + 10], [hx + rx - 4, hy + ry + 4], [hx + rx - 2, hy + 2]], P.hair, { sh: 1, cx: hx, cy: hy, rx, ry });
  }
  if (P.hs === 'curly') {
    p([...cap(1.5), [hx + rx, hy - ry * 0.35], [hx, hy - ry * 0.55], [hx - rx, hy - ry * 0.35]], P.hair);
    for (let i = 0; i <= 10; i++) { const t = Math.PI * 0.92 + (i / 10) * Math.PI * 1.16; e(hx + (rx + 1) * Math.cos(t), hy - 2 + (ry + 1) * Math.sin(t), 5, 5, P.hair, { sh: 1 }); }
  }
  if (P.hs === 'thin') {
    e(hx - rx + 1, hy - 5, 4, 8, P.hair, { sh: 1 }); e(hx + rx - 1, hy - 5, 4, 8, P.hair, { sh: 1 });
    l([[hx - 6, hy - ry + 1], [hx - 1, hy - ry - 1.5], [hx + 5, hy - ry + 0.5]], 0.8, P.hair, { det: 2 });
  }
  // ärr och förband
  if (P.scar) {
    const sc = mix(P.skin, '#f0b4ac', 0.55), x = hx + edx;
    l([[x - 5, eyY - 10], [x + 4, eyY + 9]], 1.5, sc);
    for (const t of [0.25, 0.5, 0.75]) { const cx = x - 5 + 9 * t, cy = eyY - 10 + 19 * t; l([[cx - 1.6, cy + 0.6], [cx + 1.6, cy - 0.6]], 0.6, shade(sc, 0.7), { det: 3 }); }
    l([[hx - 14, hy + 13], [hx - 9, hy + 17]], 1.1, sc, { det: 2 });
  }
  if (P.bandage) {
    const b = '#ebe3cf';
    p([[hx - rx - 1.5, hy - ry * 0.4], [hx + rx + 1.5, hy - ry * 0.58], [hx + rx + 1.5, hy - ry * 0.32], [hx - rx - 1.5, hy - ry * 0.12]], b, { sh: 1, cx: hx, cy: hy, rx, ry });
    l([[hx - 8, hy - ry * 0.42], [hx - 5, hy - ry * 0.22]], 0.6, shade(b, 0.75), { det: 3 }); l([[hx + 4, hy - ry * 0.5], [hx + 7, hy - ry * 0.3]], 0.6, shade(b, 0.75), { det: 3 });
    e(hx + rx * 0.45, hy - ry * 0.4, 3, 2, '#9a2a20');
  }
  // verktyg
  if (P.tool === 'spjut') { l([[80, 101], [91, 9]], 2.2, '#7a5a36'); p([[88, 15], [94, 14.5], [91.8, 1]], '#9a9ea2', { sh: 1, cx: 91, cy: 10, rx: 3, ry: 7 }); l([[88.6, 17], [93.4, 16.4]], 1.2, '#c9b07a', { det: 2 }); }
  if (P.tool === 'yxa') { l([[79, 101], [88, 52]], 3, '#7a5a36'); p([[84, 53], [95, 46], [98, 60], [88, 61]], '#8c9093', { sh: 1, cx: 91, cy: 55, rx: 7, ry: 7 }); l([[85, 55], [90, 56]], 1.4, '#c9b07a', { det: 2 }); }
  return S;
}

const lum = c => { const [r, g, b] = hex(c); return 0.3 * r + 0.59 * g + 0.11 * b; };
// dov färg: mindre mättad och lite mörkare, dragen mot brungrått
const dov = (c, t = 0.28) => { const [r, g, b] = hex(c), L = 0.3 * r + 0.59 * g + 0.11 * b; return shade(toHex([r, g, b].map(v => v + (L - v) * t)), 0.9); };

function inside(f, u, v, px) {
  if (f.t === 'e') { if (!f.rx) return false; const rx = Math.max(f.rx, px * 0.5), ry = Math.max(f.ry, px * 0.5); return ((u - f.cx) / rx) ** 2 + ((v - f.cy) / ry) ** 2 <= 1; }
  if (f.t === 'p') { let c = false; const P = f.pts; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { if ((P[i][1] > v) !== (P[j][1] > v) && u < (P[j][0] - P[i][0]) * (v - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; } return c; }
  const w = Math.max(f.w / 2, px * 0.55);
  for (let i = 1; i < f.pts.length; i++) {
    const [ax, ay] = f.pts[i - 1], [bx, by] = f.pts[i], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((u - ax) * dx + (v - ay) * dy) / L));
    if (Math.hypot(u - ax - t * dx, v - ay - t * dy) <= w) return true;
  }
  return false;
}
function center(f) {
  if (f.cx !== undefined && f.rx !== undefined) return f;
  const xs = f.pts.map(p => p[0]), ys = f.pts.map(p => p[1]);
  const a = Math.min(...xs), b = Math.max(...xs), c = Math.min(...ys), d = Math.max(...ys);
  return { cx: (a + b) / 2, cy: (c + d) / 2, rx: (b - a) / 2 || 1, ry: (d - c) / 2 || 1 };
}

// porträttet, 64 × 64 punkter: formerna ritas i punkter med hårt ljus uppifrån vänster och varmt sken från elden,
// och varje punkt byts sedan mot närmaste färg i paletten. Konturen är kolets mörkaste ton och bakgrunden kolets ramp.
// Ljuset ligger i hela band utan rutmönster, och håret och skägget har strån i klungor längs växtriktningen
// (Björn efter v95: mindre schackrutigt). gammal = true ritar som före v95, för jämförelsen i valdelen
function ritaPortratt(Pal, P, N = 64, gammal = false) {
  const VX = 13, VY = 10, VW = 74, px = VW / N, F = former(P).filter(f => (f.det ?? 1) <= 3), g = Array(N * N).fill(null), id = Array(N * N).fill(-1), hud = Array(N * N).fill(0), harm = Array(N * N).fill(0), stra = new Int8Array(N * N);
  const seed = P.namn.length * 7 + P.age, smuts = 0.012 + (P.beauty < 0 ? 0.05 : 0) + (P.age > 55 ? 0.03 : 0);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u = VX + (i + 0.5) * px, v = VY + (j + 0.5) * px, k0 = j * N + i;
    F.forEach((f, n) => {
      if (!inside(f, u, v, px)) return;
      let c = dov(f.c, 0.18);
      const har = [P.hair, '#d8d4cc', '#c2bdb4'].includes(f.c);
      if (f.sh) {
        // hårt ljus snett uppifrån vänster: ljus, mellan, rastrerad övergång, skugga
        const m = center(f), k = (u - m.cx) / m.rx * 0.65 + (v - m.cy) / m.ry * 0.7;
        const dark = mix(shade(c, 0.64), '#2a2238', 0.15), mid = shade(c, 0.84);
        if (gammal) c = k > 0.7 ? dark : k > 0.55 ? ((i + j) % 2 ? dark : mid) : k > 0.1 ? mid : k < -0.6 ? mix(c, '#ffe2b0', 0.14) : c;
        else c = k > 0.62 ? dark : k > 0.1 ? mid : k < -0.6 ? mix(c, '#ffe2b0', 0.14) : c;
      }
      if (har && gammal) { const s = (i * 2 + j + Math.floor(hash(i, 0, 1) * 2)) % 6; if (s === 0) c = mix(c, '#fff0d0', 0.16); else if (s === 3) c = shade(c, 0.85); }
      else if (har) {
        // strån i klungor: smala och långa nedåt, så att ljuset följer hårets riktning i stället för ett mönster
        // (ett steg ljusare eller mörkare i samma ramp i paletten, så att färgen inte byter ton)
        const s = vn(i / 1.7, j / 5, 1, seed + 3 + (f.c === P.hair ? 0 : 9));
        stra[k0] = s > 0.72 ? 1 : s < 0.22 ? -1 : 0;
      }
      if (f.a) { if (g[k0]) g[k0] = mix(g[k0], c, f.a); return; }
      g[k0] = c; id[k0] = n; hud[k0] = f.skin ? 1 : 0; harm[k0] = har ? 1 : 0; if (!har) stra[k0] = 0;
    });
    // smuts och fläckar i huden
    if (hud[k0]) { const h = hash(i, j, seed); if (h < smuts) g[k0] = shade(g[k0], 0.92); else if (P.blemish && h > 0.993) g[k0] = mix(g[k0], '#9a3a30', 0.3); }
  }
  const B = Bild(N, N, Pal), K = t => Pal.i('kol', t);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k0 = j * N + i; let c = g[k0];
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => (i + a >= 0 && i + a < N && j + b >= 0 && j + b < N) ? k0 + b * N + a : -1);
    if (!c) {
      if (nb.some(n => n >= 0 && g[n])) { B.satt(i, j, K(0)); continue; }
      // bakgrunden ljusnar svagt mot mitten, med rastrering
      const r = Math.hypot(i - N * 0.3, j - N * 0.45) / N, b = gammal ? (r < 0.35 ? 2 : r < 0.45 ? ((i + j) % 2 ? 2 : 1) : r < 0.62 ? 1 : r < 0.7 ? ((i + j) % 2 ? 1 : 0) : 0) : (r < 0.4 ? 2 : r < 0.66 ? 1 : 0);
      B.satt(i, j, K(b)); continue;
    }
    // inre konturer där två former med olika ljushet möts
    const r = nb[0], dn = nb[2];
    if ((r >= 0 && g[r] && id[r] !== id[k0] && Math.abs(lum(g[r]) - lum(c)) > 55) || (dn >= 0 && g[dn] && id[dn] !== id[k0] && Math.abs(lum(g[dn]) - lum(c)) > 55)) c = mix(c, SVART, 0.4);
    // varmt sken från elden till vänster
    else if (nb[1] >= 0 && !g[nb[1]]) c = mix(c, '#f0a050', 0.3);
    let v = Pal.av(c);
    if (stra[k0] > 0 && v % 4 < 3) v++; else if (stra[k0] < 0 && v % 4 > 0) v--;
    B.satt(i, j, v);
  }
  // ensamma punkter i håret och skägget tar grannarnas färg, så att inget rutmönster blir kvar
  if (!gammal) for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
    if (!harm[j * N + i]) continue;
    const v = B.get(i, j), l = B.get(i - 1, j), r = B.get(i + 1, j), u = B.get(i, j - 1), d = B.get(i, j + 1);
    if (v !== l && l === r && (u === l || d === l)) B.px[j * N + i] = l;
    else if (v !== u && u === d && (l === u || r === u)) B.px[j * N + i] = u;
  }
  // rostig järnram med nitar
  for (let k = 0; k < N; k++) for (const [x, y] of [[k, 0], [k, 1], [k, N - 2], [k, N - 1], [0, k], [1, k], [N - 2, k], [N - 1, k]]) B.satt(x, y, Pal.i('jord', 0));
  for (const [a, b] of [[0, 0], [N - 2, 0], [0, N - 2], [N - 2, N - 2]]) for (let k = 0; k < 4; k++) B.satt(a + (k & 1), b + (k >> 1), Pal.i('rost', 1));
  return B;
}

// ---------- sidan ----------
const toHex = tillHex;
const $ = s => document.querySelector(s);
const lage = { tid: 'dag' };
try { const v = JSON.parse(localStorage.getItem('bildstil4') || '{}'); if (['dag', 'natt', 'istid'].includes(v.tid)) lage.tid = v.tid; } catch (e) { /* inget sparat */ }
const kolBild = (w, h, P) => { const B = Bild(w, h, P); for (let i = 0; i < B.px.length; i++) B.px[i] = P.i('kol', 0); return B; };
const markBild = (w, h, P, dx = 400, dy = 400) => { const B = Bild(w, h, P), opt = { tid: 'dag' }; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) B.satt(x, y, mark(B, x + dx, y + dy, P, opt)); return B; };
// personrutan för Arn: Silkscreen i rubrikerna, Pixelify Sans i all annan text, mätare i tio rutor
function ritaPanel(P) {
  const el = $('#panelprov'), c = (r, t) => P.cols[P.i(r, t)].hex;
  for (const [k, r, t] of [['k0', 'kol', 0], ['k1', 'kol', 1], ['k2', 'kol', 2], ['j0', 'jord', 0], ['b1', 'ben', 1], ['b2', 'ben', 2], ['b3', 'ben', 3], ['s2', 'senap', 2], ['s3', 'senap', 3]]) el.style.setProperty('--' + k, c(r, t));
  const B = Bild(16, 22, P); ritaPerson(B, 0, 1, 1); tillCanvas(B, $('#provgubbe'), 0);
  const MAT = [[0, 'Hälsa', 82, 'rost'], [1, 'Törst', 40, 'skiffer'], [2, 'Kyla', 65, 'ben'], [6, 'Sömn', 30, 'oliv'], [7, 'Mat', 55, 'senap']];
  $('#matare').innerHTML = MAT.map(([si, namn, v, ramp], i) => `<div class="mat"><canvas id="msym${i}" width="8" height="8" aria-hidden="true"></canvas><span>${namn}</span><span class="stapel">${Array.from({ length: 10 }, (_, k) => `<i style="background:${k < Math.round(v / 10) ? c(ramp, 2) : c('kol', 2)}"></i>`).join('')}</span><b>${v}</b></div>`).join('');
  MAT.forEach(([si], i) => ritaSymbol($('#msym' + i), SYMBOLER[si], P));
}
// paletten: ramperna, byn på dagen, natten och i istiden, och sakerna ur spelet
function ritaPalett(P) {
  $('#ramp').innerHTML = RAMPER.map(([n, anv], ri) => `<div class="ramp" title="${n}: ${anv}"><span>${n}</span>${[0, 1, 2, 3].map(t => `<i style="background:${P.cols[ri * 4 + t].hex}" title="${n} ${t}: ${P.cols[ri * 4 + t].hex}"></i>`).join('')}</div>`).join('');
  const saker = ['bar', 'rotter', 'kott', 'kanin', 'fisk', 'abborre', 'svamp', 'spindling', 'ved', 'grenar', 'torrgras', 'kol', 'flinta', 'sten', 'yxa', 'rep', 'ben', 'kniv', 'skinn', 'skinnrock', 'skinnskor', 'balte', 'grillfisk', 'torrkott', 'metspo', 'fiskespjut', 'bensyl', 'korg'].filter(k => IKONER.PIX[k]);
  const kol = 7, S = kolBild(kol * 9 + 1, Math.ceil(saker.length / kol) * 9 + 1, P);
  saker.forEach((k, j) => ritaIkon(S, k, 1 + (j % kol) * 9, 1 + Math.floor(j / kol) * 9));
  tillCanvas(S, $('#pk'), 0);
  for (const [id, tid] of [['#pd', 'dag'], ['#pn', 'natt'], ['#pi', 'istid']]) tillCanvas(ritaScen(P, { tid }), $(id), 0);
}
// slöjdbänken i dag och med 16 punkter per ruta, på samma mark (tre × tre rutor)
function ritaBankerna(P) {
  for (const [id, ny] of [['#bankidag', false], ['#bankny', true]]) {
    const B = markBild(48, 48, P);
    if (ny) ritaSlojdbank(B, 8, 8, P); else ritaSlojdbankIdag(B, 8, 8, P);
    tillCanvas(B, $(id), 0);
  }
}
// folket: porträttet och figuren på gräset
function ritaFolket(P) {
  PERSONER.forEach((p, i) => {
    tillCanvas(ritaPortratt(P, p), $('#por' + i), 0);
    const B = markBild(16, 22, P, 176, 62); ritaPerson(B, i, 1, 0); tillCanvas(B, $('#fig' + i), 0);
  });
}
function heltalsskala(c, w) {
  const bredd = c.parentElement.clientWidth - 20, s = Math.floor(bredd / w);
  c.style.width = (s >= 2 ? w * s : bredd) + 'px';
}
function ritaHuvud() {
  const c = $('#huvud');
  tillCanvas(ritaScen(PAL, lage), c, 0); heltalsskala(c, SC.W);
  document.querySelectorAll('[data-tid]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tid === lage.tid)));
  try { localStorage.setItem('bildstil4', JSON.stringify(lage)); } catch (e) { /* går inte att spara */ }
}

// ---------- att välja ----------
// en bild som spelet ritar den i dag: 8 punkter per ruta, förstorad två gånger så att den får samma storlek som den nya
function forstorad(B, k, x0, y0) {
  const rows = IKONER.PIX[k]; if (!rows) return;
  const L = Bild(rows[0].length, rows.length, B.P); ritaIkon(L, k, 0, 0);
  for (let y = 0; y < L.h * 2; y++) for (let x = 0; x < L.w * 2; x++) {
    const v = L.px[(y >> 1) * L.w + (x >> 1)];
    if (v >= 0) B.satt(x0 + x, y0 + y, v);
    else if (IKONER.PAL[k]?.[rows[y >> 1][x >> 1]]?.startsWith('rgba')) B.morka(x0 + x, y0 + y);
  }
}
// registret över det Björn ska välja: typ 'janej' (en ny version mot den i dag) eller 'tre' (tre nya versioner).
// Varje version är en bild { w, h, rita(B, P) } på marken. När valet är inbyggt i spelet tas raden bort, och dess
// dokument i databasens samling 'val' tas bort
const VATTENSACK = { o: 'kol0', j: 'jord1', J: 'jord2', L: 'jord3', k: 'jord0', s: 'senap1', y: 'senap2', w: 'ben2', b: 'skiffer2', B: 'skiffer3' };
const VILDKORN = { s: 'senap0', y: 'senap1', Y: 'senap2', L: 'senap3', o: 'oliv1', O: 'oliv2', G: 'oliv3' };
const FRON = { k: 'jord0', j: 'jord1', J: 'jord2', B: 'jord3', y: 'senap1', Y: 'senap2', L: 'senap3', g: 'oliv2', G: 'oliv3', o: 'kol0' };
const ODLING = { k: 'jord0', j: 'jord1', J: 'jord2', B: 'jord3', g: 'oliv1', G: 'oliv2', H: 'oliv3', y: 'senap2', Y: 'senap3' };
const ROVOR = { o: 'oliv0', g: 'oliv1', G: 'oliv2', L: 'oliv3', r: 'rost1', R: 'rost2', b: 'ben1', B: 'ben2', W: 'ben3', k: 'jord0', j: 'jord1', J: 'jord2' };
const KORN = { s: 'senap0', y: 'senap1', Y: 'senap2', L: 'senap3', k: 'jord0', j: 'jord1', J: 'jord2' };
const TOA = { v: 'senap3', V: 'oliv3', c: 'jord1', C: 'jord2', k: 'jord0' };
// vädrets symboler (steg 2.11.4): klart, mulet, regn, snö, blåst och åska, 8 × 8 punkter
const VS_L = { a: 'senap1', b: 'senap2', c: 'senap3', w: 'ben1', W: 'ben3', d: 'skiffer3', s: 'ben2', S: 'ben3', k: 'skiffer1', K: 'skiffer2', y: 'senap3', v: 'ben2' };
const VS = [
  ['...a....', '.a.b.a..', '..bcb...', 'abcccba.', '..bcb...', '.a.b.a..', '...a....', '........'],
  ['........', '...ww...', '..wWWw..', '.wWWWWw.', 'wWWWWWWw', 'wwwwwwww', '........', '........'],
  ['..ww....', '.wWWww..', 'wWWWWWw.', 'wwwwwww.', '.d..d...', '..d..d..', '.d..d...', '........'],
  ['...s....', '.s.s.s..', '..sss...', 'sssSsss.', '..sss...', '.s.s.s..', '...s....', '........'],
  ['........', 'vvvvv...', '.....v..', 'vvvvvv..', '........', '..vvvvvv', '.v......', '..vv....'],
  ['..kk....', '.kKKkk..', 'kKKKKKk.', 'kkkykkk.', '...yy...', '..yy....', '...y....', '..y.....'],
];
// en mörk kontur runt symbolen (10 × 10)
const konturera = rader => Array.from({ length: 10 }, (_, y) => Array.from({ length: 10 }, (_, x) => {
  const c = (rader[y - 1] || '')[x - 1];
  if (c && c !== '.') return c;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (rader[y - 1 + dy] || '')[x - 1 + dx]; if (n && n !== '.') return 'o'; }
  return '.';
}).join(''));
// symbolen på en liten himmel med marken under (10 × 10): himlens färg efter vädret
const HIMMEL = ['skiffer3', 'skiffer2', 'skiffer1', 'skiffer2', 'skiffer3', 'kol3'];
const VS_RAD = (lista, sida) => ({ w: lista.length * (sida + 2) + 2, h: sida + 4, kol: true, rita: (B, P) => lista.forEach((r, i) => r(B, P, 2 + i * (sida + 2), 2)) });
const regnKarta = (stil) => ({ w: 64, h: 32, rita: (B, P) => {
  const d = P.i('skiffer', 3), l = P.i('ben', 1), sn = P.i('ben', 3);
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(hash(i, 1, 7) * 30), y = Math.floor(hash(i, 2, 7) * 28);
    if (stil === 1) for (let k = 0; k < 3; k++) B.satt(x, y + k, d);
    else if (stil === 2) { for (let k = 0; k < 4; k++) B.satt(x + (k >> 1), y + k, d); if (i % 4 === 0) { B.satt(x - 1, 31, l); B.satt(x + 1, 31, l); B.satt(x, 30, l); } }
    else { B.satt(x, y, l); B.satt(x, y + 1, d); }
  }
  for (let i = 0; i < 22; i++) {
    const x = 34 + Math.floor(hash(i, 3, 7) * 28), y = Math.floor(hash(i, 4, 7) * 30);
    if (stil === 3) { B.satt(x, y, sn); B.satt(x - 1, y, l); B.satt(x + 1, y, l); B.satt(x, y - 1, l); B.satt(x, y + 1, l); }
    else if (stil === 2) { B.satt(x, y, sn); B.satt(x + 1, y, sn); B.satt(x, y + 1, sn); B.satt(x + 1, y + 1, l); }
    else B.satt(x, y, sn);
  }
} });
// utbrottens symboler (steg 3.2.2–3.2.4): motiven ritas bara med fyllning, och kanten (o), skuggan (z) och brickan läggs på i koden
const UTB_KANT = rader => rader.map((row, y) => [...row].map((ch, x) => ch !== '.' ? ch : [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => { const c = rader[y + dy]?.[x + dx]; return c && c !== '.' && c !== 'o'; }) ? 'o' : '.').join(''));
const UTB_SKUGGA = rader => rader.map((row, y) => [...row].map((ch, x) => ch === '.' && y > 0 && x > 0 && rader[y - 1][x - 1] !== '.' ? 'z' : ch).join(''));
const UTB_ANSIKTE = ['................', '.....oooooo.....', '...oowwaaaaoo...', '..owaaaaaaaaao..', '.owaaaaaaaaaaao.', '.oaaaaaaaaaaaao.', 'oaaaaaaaaaaaaaao', 'oaaaaaaaaaaaaaao', 'oaaaaaaaaaaaaaao', 'oaaaaaaaaaaaaaao', 'oaaaaaaaaaaaaaao', '.oaaaaaaaaaaaao.', '.obaaaaaaaaaabo.', '..obbaaaaaabbo..', '...oobbbbbboo...', '.....oooooo.....'];
const UTB_DRAG = drag => UTB_ANSIKTE.map((row, y) => drag[y] ? [...row].map((ch, x) => drag[y][x] && drag[y][x] !== ' ' ? drag[y][x] : ch).join('') : row);
const UTB_MOTIV = [
  { namn: 'gråta', grad: 1, l: { a: 'ben2', w: 'ben3', b: 'ben1', t: 'skiffer3' }, p: UTB_DRAG({ 6: '   oo      oo   ', 7: '            t   ', 8: '            t   ', 9: '           tt   ', 11: '      oooo      ', 12: '     o    o     ' }) },
  { namn: 'tjura', grad: 1, l: { a: 'ben2', w: 'ben3', b: 'ben1' }, p: UTB_DRAG({ 4: '   o        o   ', 5: '    oo    oo    ', 6: '     o    o     ', 11: '     oooooo     ', 12: 'w              w', 13: 'ww            ww', 14: ' w            w ' }) },
  { namn: 'vara elak', grad: 2, l: { a: 'rost3', w: 'senap3', b: 'rost2' }, p: UTB_DRAG({ 4: '   o        o   ', 5: '    oo    oo    ', 6: '    oo    oo    ', 10: '     oooooo     ', 11: '     owowow     ', 12: '     oooooo     ' }) },
  { namn: 'slå sönder något', grad: 2, l: { a: 'jord3', b: 'jord2', w: 'senap3' }, p: UTB_KANT(['................', '..a.....b....a..', '...a...b....a...', '.....b.....b....', '................', '................', '.aaaaaa...aaaaa.', '.waaaaa..aaaaaw.', '..aaaaaa.aaaaa..', '..aaaaa.aaaaaa..', '...aaaaa.aaaa...', '...bbbb.bbbbb...', '....bbbb.bbb....', '......bb.bb.....', '................', '................']) },
  { namn: 'springa iväg', grad: 2, l: { a: 'skiffer2' }, p: UTB_KANT(['..........aa....', '.........aaaa...', '.........aaaa...', '..........aa....', '......aaaaa.....', '.....a..aaa.....', '....a...aaaa....', '........aa..a...', '........aa...a..', '.......aaa......', '......a...a.....', '.....a.....a....', '....a.......aa..', '...a............', '..aa............', '................']) },
  { namn: 'ligga kvar i bädden', grad: 3, l: { h: 'ben2', w: 'ben3', b: 'oliv2', d: 'jord2' }, p: UTB_KANT(['................', '................', '................', '................', '................', '................', '..hhh...........', '.whhhhbbbbbbbb..', '.wwhhbbbbbbbbbb.', '.wwwbbbbbbbbbbb.', '.dddddddddddddd.', '.d............d.', '.d............d.', '................', '................', '................']) },
  { namn: 'göra slut', grad: 3, l: { a: 'rost2' }, p: UTB_KANT(['................', '................', '..aaaa....aaaa..', '.aaaaaa..aaaaaa.', '.aaaaaaa.aaaaaa.', '.aaaaaa.aaaaaaa.', '.aaaaaaa.aaaaaa.', '..aaaaa.aaaaaa..', '...aaaaa.aaaa...', '....aaa.aaaa....', '.....aaa.aa.....', '......a.aa......', '.......aa.......', '................', '................', '................']) },
  { namn: 'slå', grad: 3, l: { a: 'ben2', b: 'ben1' }, p: UTB_KANT(['................', '................', '................', '...aabaabaabaa..', '..aaabaabaabaaa.', '..aaabaabaabaaa.', '..aaaaaaaaaaaaa.', '..abbbbbbaaaaaa.', '..aaaaaaabaaaaa.', '..aaaaaaaaaaaaa.', '...aaaaaaaaaaa..', '....aaaaaaaaa...', '.....aaaaaaa....', '.....aaaaaaa....', '.....aaaaaaa....', '................']) },
  { namn: 'skrika (barn)', grad: 1, l: { a: 'ben2', w: 'ben3', b: 'ben1', t: 'skiffer3', r: 'rost2' }, p: UTB_DRAG({ 6: '   oo      oo   ', 7: '  t          t  ', 8: '  t          t  ', 9: '  t   oooo   t  ', 10: '  t  obbbbo  t  ', 11: '     obrrbo     ', 12: '      oooo      ' }) },
  { namn: 'blåmärket', grad: 0, l: { a: 'ben2', r: 'rost1', b: 'skiffer2', c: 'skiffer1' }, p: UTB_KANT(['................', '................', '...aaaaaaaaaa...', '..aaaaaaaaaaaa..', '.aaaaarrraaaaaa.', '.aaaarbbbraaaaa.', '.aaarbbcbbraaaa.', '.aaarbcccbraaaa.', '.aaaarbcbbraaaa.', '.aaaaarbbraaaaa.', '.aaaaaarraaaaaa.', '.aaaaaaaaaaaaaa.', '..aaaaaaaaaaaa..', '...aaaaaaaaaa...', '................', '................']) },
];
// intryckens och ryktenas symboler (steg 3.3–3.4): motiven ritas med fyllning, och kanten, skuggan eller brickan läggs på i koden (som utbrotten)
const IK_MOTIV = [
  { namn: 'våldsam', t: -1, l: { a: 'ben2', b: 'ben1' }, p: UTB_MOTIV[7].p },
  { namn: 'tjuv', t: -1, l: { a: 'jord3', b: 'jord2', c: 'kol2' }, p: UTB_KANT(['................', '................', '.......cc.......', '......c..c......', '.......cc.......', '......aaaa......', '.....aaaaaa.....', '....aaaaaaaa....', '...aaaaaaaaaa...', '...aaaabbaaaa...', '..aaaaabbaaaaa..', '..aaaaaaaaaaaa..', '..aaaaaaaaaaaa..', '...bbbbbbbbbb...', '................', '................']) },
  { namn: 'elak', t: -1, l: { a: 'rost3', w: 'senap3', b: 'rost2' }, p: UTB_MOTIV[2].p },
  { namn: 'lögnare', t: -1, l: { a: 'ben2', w: 'ben3', b: 'ben1', n: 'rost2' }, p: UTB_DRAG({ 5: '    o     o     ', 7: '        nnnnnnnn', 8: '        nnnnnnnn', 11: '     oooo       ' }) },
  { namn: 'klåpare', t: -1, l: { a: 'jord3', b: 'jord2', c: 'skiffer2' }, p: UTB_KANT(['................', '................', '..cccc..........', '..ccccc.........', '...ccaa.........', '.....aa.........', '......aa........', '.......aa.......', '................', '.........aa.....', '..........aa....', '...........aa...', '............aa..', '.............b..', '................', '................']) },
  { namn: 'lat', t: -1, l: { a: 'skiffer3', b: 'ben2', c: 'ben1' }, p: UTB_KANT(['................', '.........aaaa...', '...........a....', '..........a.....', '.........aaaa...', '....aaa.........', '.....a..........', '....aaa.........', '................', '................', '..bbbbbbbbbbbb..', '.bbbbbbbbbbbbbb.', '.bbbbbbbbbbbbbb.', '.cccccccccccccc.', '................', '................']) },
  { namn: 'fattig', t: -1, l: { a: 'jord2', b: 'jord1', w: 'jord3' }, p: UTB_KANT(['................', '................', '................', '................', '................', '................', '..wwwwwwwwwwww..', '..aaaaaaaaaaaa..', '..aaaaaaaaaaaa..', '...aaaaaaaaaa...', '....aaaaaaaa....', '.....bbbbbb.....', '......bbbb......', '................', '................', '................']) },
  { namn: 'generös', t: 1, l: { a: 'oliv2', b: 'oliv1', r: 'rost2', w: 'oliv3' }, p: UTB_KANT(['................', '.....rr..rr.....', '....r..rr..r....', '.....rrrrrr.....', '..aaaaarraaaaa..', '..wwwwwrrwwwww..', '..aaaaarraaaaa..', '................', '...aaaarraaaa...', '...aaaarraaaa...', '...aaaarraaaa...', '...aaaarraaaa...', '...bbbbrrbbbb...', '...bbbbrrbbbb...', '................', '................']) },
  { namn: 'hjälpsam', t: 1, l: { a: 'ben2', b: 'ben1', c: 'senap2' }, p: UTB_KANT(['................', '................', '................', '................', '.cc..........cc.', '.cca........acc.', '.ccaaa....aaacc.', '.ccaaaaaaaaaacc.', '.ccaabaabaabacc.', '.cc.aaaaaaaa.cc.', '.cc..aaaaaa..cc.', '.cc...bbbb...cc.', '................', '................', '................', '................']) },
  { namn: 'skicklig', t: 1, l: { a: 'senap3', b: 'senap2', w: 'ben3' }, p: UTB_KANT(['................', '.......aa.......', '.......aa.......', '......awaa......', '......aaaa......', '.aaaaaaaaaaaaaa.', '..aaaaawaaaaaa..', '...aaaaaaaaaa...', '....aaaaaaaa....', '....aaaaaaaa....', '...aaaabbaaaa...', '...aaab..baaa...', '..aaab....baaa..', '..abb......bba..', '................', '................']) },
  { namn: 'flitig', t: 1, l: { a: 'skiffer3', b: 'skiffer2', h: 'jord3', d: 'jord2', t: 'skiffer3' }, p: UTB_KANT(['................', '..aaaaaaa.......', '.aaaaaaaaa...t..', '.abbbbbbba..t...', '.....hh......t..', '.....hh.........', '.....hh.........', '.....hh.........', '.....hh.........', '.....hh.........', '.....dd.........', '.....hh.........', '.....hh.........', '.....dd.........', '................', '................']) },
  { namn: 'rik', t: 1, l: { a: 'jord3', b: 'jord2', r: 'rost2', R: 'rost3', g: 'oliv2' }, p: UTB_KANT(['................', '................', '.....g..g.......', '....rRrrRrr.....', '...rrrRrrrRrr...', '..RrrrrRrrrrrR..', '..aaaaaaaaaaaa..', '..abababababba..', '..aaaaaaaaaaaa..', '..abababababba..', '...aaaaaaaaaa...', '...abababababa..', '....aaaaaaaa....', '....bbbbbbbb....', '................', '................']) },
  { namn: 'legend', t: 1, l: { a: 'senap3', b: 'senap2', w: 'ben3', g: 'senap1' }, p: UTB_KANT(['..g....g.....g..', '.......aa.......', '.......aa.......', '......awaa......', '.g....aaaa....g.', '.aaaaaaaaaaaaaa.', '..aaaaawaaaaaa..', '...aaaaaaaaaa...', '....aaaaaaaa....', '....aaaaaaaa....', '...aaaabbaaaa...', '...aaab..baaa...', '..aaab....baaa..', '..abb......bba..', '.g............g.', '................']) },
  { namn: 'ökänd', t: -1, l: { a: 'ben3', b: 'ben1', k: 'kol1' }, p: UTB_KANT(['................', '....aaaaaaaa....', '...aaaaaaaaaa...', '..aaaaaaaaaaaa..', '..aaaaaaaaaaaa..', '..akkkaaaakkka..', '..akkkaaaakkka..', '..aakaaaaaakaa..', '...aaaakkaaaa...', '....aaaaaaaa....', '.....abababa....', '.....aaaaaaa....', '......bbbbb.....', '................', '................', '................']) },
  { namn: 'gott anseende', t: 1, l: { a: 'ben2', w: 'ben3', b: 'ben1', g: 'senap3' }, p: UTB_DRAG({ 0: '...gggggggggg...', 6: '    o      o    ', 10: '    o      o    ', 11: '     oooooo     ' }) },
  { namn: 'blandat anseende', t: 0, l: { a: 'ben2', w: 'ben3', b: 'ben1' }, p: UTB_DRAG({ 6: '    o      o    ', 11: '     oooooo     ' }) },
  { namn: 'dåligt anseende', t: -1, l: { a: 'rost2', w: 'rost3', b: 'rost1', h: 'kol1' }, p: UTB_DRAG({ 0: '..h..........h..', 1: '..hh........hh..', 5: '    oo    oo    ', 6: '     o    o     ', 10: '     oooooo     ', 11: '    o      o    ' }) },
  { namn: 'farlig plats', t: -1, l: { a: 'senap2', b: 'senap1', k: 'kol0' }, p: UTB_KANT(['................', '.......aa.......', '.......aa.......', '......aaaa......', '......akka......', '.....aakkaa.....', '.....aakkaa.....', '....aaakkaaa....', '....aaakkaaa....', '...aaaakkaaaa...', '...aaaaaaaaaa...', '..aaaaakkaaaaa..', '..aaaaakkaaaaa..', '.aaaaaaaaaaaaaa.', '.bbbbbbbbbbbbbb.', '................']) },
];
// utbrotten förenklade (efter v143): en symbol per allvarsgrad 1–5, ur motiven ovan. 'skugga', 'bricka' (ljust motiv på en
// bricka i gradens färg) eller 'ansikte' (bara ansiktet, argare och rödare för varje grad)
const UTB5_FARG = ['oliv2', 'senap2', 'rost3', 'rost1', 'kol2'];
const UTB5_MOTIV = [UTB_MOTIV[0], UTB_MOTIV[2], UTB_MOTIV[6], UTB_MOTIV[7], IK_MOTIV[13]];
const UTB5_ANSIKTE = [
  UTB_MOTIV[0],
  { l: { a: 'senap3', w: 'ben3', b: 'senap2' }, p: UTB_DRAG({ 4: '   o        o   ', 5: '    oo    oo    ', 6: '     o    o     ', 11: '     oooooo     ' }) },
  { l: { a: 'rost3', w: 'senap3', b: 'rost2' }, p: UTB_MOTIV[2].p },
  { l: { a: 'rost2', w: 'ben3', b: 'rost1' }, p: UTB_DRAG({ 4: '   o        o   ', 5: '    oo    oo    ', 6: '    oo    oo    ', 10: '     oooooo     ', 11: '     owowow     ', 12: 'w    oooooo    w', 13: 'ww            ww', 14: ' w            w ' }) },
  IK_MOTIV[13],
];
const UTB5_M = satt => ({ w: 5 * 22 + 2, h: 22, kol: true, rita: (B, P) => (satt === 'ansikte' ? UTB5_ANSIKTE : UTB5_MOTIV).forEach((m, i) => {
  const x0 = 3 + i * 22, y0 = 3;
  if (satt === 'bricka') {
    const tile = Array.from({ length: 20 }, (_, y) => Array.from({ length: 20 }, (_, x) => { const kx = Math.min(x, 19 - x), ky = Math.min(y, 19 - y); return kx + ky < 2 ? '.' : kx === 0 || ky === 0 || kx + ky === 2 ? 'k' : 'g'; }).join(''));
    ritaSprite(B, tile, { k: 'kol0', g: UTB5_FARG[i] }, x0 - 2, y0 - 2);
    const ljus = Object.fromEntries(Object.keys(m.l).map(k => [k, ['a', 'h', 'w'].includes(k) ? 'ben3' : 'ben1']));
    ritaSprite(B, m.p, { o: 'kol0', ...ljus }, x0, y0);
  } else ritaSprite(B, UTB_SKUGGA(m.p), { o: 'kol0', z: 'skugga', ...m.l }, x0, y0);
}) });
const LED_STAV = UTB_KANT(['................', '.......ss.......', '......sSSs......', '..ww..sSSs..ww..', '..wW..jjjj..Ww..', '...wW.rrrr.Ww...', '....wWjJJjWw....', '......jJJj......', '.......Jj.......', '.......Jj.......', '.......Jj.......', '.......Jj.......', '.......Jj.......', '.......Jj.......', '.......jj.......', '................']);
const LED_KRONA = UTB_KANT(['................', '.......W........', '...W..wWw...W...', '..wWw.wWw..wWw..', '..wWw.wWw..wWw..', '..wWw.wWw..wWw..', '..rWw.wWw..wWr..', '...rr.wrw..rr...', '......rrr.......', '.ssssssssssssss.', '.sSySsSySsSySss.', '.ssssssssssssss.', '................', '................', '................', '................']);
const LED_FOLK = UTB_KANT(['................', '......aaaa......', '......aaaa......', '......aaaa......', '...a...aa...a...', '....aaaaaaaa....', '......aaaa......', '......aaaa......', '......aaaa......', '..bb..a..a..bb..', '.bbbb.a..a.bbbb.', '..bb..a..a..bb..', '.bbbb.a..a.bbbb.', '.bbbb......bbbb.', '.b..b......b..b.', '................']);
// en symbol i rätt storlek och tre gånger större bredvid
const LED_M = (p, l) => ({ w: 74, h: 52, kol: true, rita: (B, P) => { ritaSprite(B, p, { o: 'kol0', ...l }, 3, 3); ritaSprite(B, p.flatMap(r => { const rr = [...r].map(c => c.repeat(3)).join(''); return [rr, rr, rr]; }), { o: 'kol0', ...l }, 22, 2); } });
// grillen omritad (steg 3.6.7): kartbilden förstorad till 16 punkter per ruta, med en mörk kant runt klykorna och spettet
// och en skugga under klykorna, så att den syns mot marken
function grillNy() {
  const g = IKONER.PIX.grill_karta.flatMap(r => { const rr = [...r].map(c => c + c).join(''); return [rr, rr]; }).map(r => [...r]);
  const H = g.length, W = g[0].length, ut = g.map(r => r.map(c => c === 'x' ? '.' : c));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ut[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const c = g[y + dy]?.[x + dx]; return c && c !== '.' && c !== 'x'; })) ut[y][x] = 'o';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === 'x') for (let dx = -2; dx <= 3; dx++) if (ut[y + 1]?.[x + dx] === '.') { ut[y][x + dx] = 'z'; ut[y + 1][x + dx] = 'z'; }
  return ut.map(r => r.join(''));
}
// dimman (steg 3.7.11): vädersymbol 10 × 10 punkter, i rätt storlek och tre gånger större
const DIM_M = (p, l) => ({ w: 48, h: 36, kol: true, rita: (B, P) => { ritaSprite(B, p, { o: 'kol0', ...l }, 2, 2); ritaSprite(B, p.flatMap(r => { const rr = [...r].map(c => c.repeat(3)).join(''); return [rr, rr, rr]; }), { o: 'kol0', ...l }, 15, 3); } });
const DIM_BAND = ['..........', '.ovvvvvvo.', '..........', 'ovvvvvvvvo', '..........', '.ovvvvvvo.', '..........', 'ovvvvvvvvo', '..........', '..ovvvvo..'];
const DIM_SOL = ['...oooo...', '..oyyyyo..', '.oyyyyyyo.', 'oWWWWWWWWo', '.oyyyyyyo.', 'oWWWWWWWWo', '..ovvvvo..', '.oWWWWWWo.', '..........', 'ovvvvvvvvo'];
const DIM_TRAD = ['....dd....', '...dddd...', 'oWWWWWWWWo', '..dddddd..', '.oWWWWWWo.', '.dddddddd.', 'oWWWWWWWWo', '....dd....', 'ovvvvvvvvo', '..........'];
// vargens bilder (Björns val efter v159) (steg 3.7.1 och 3.7.14), 16 × 16 punkter
const VARG_STAR = [
  '................',
  '.o.o............',
  'oGoGo...........',
  'oGGGGo..........',
  'kkGkGGo.........',
  'oWWGGGGooooooo..',
  '.ooWGGGGHHHHGGo.',
  '...oGGGHHHHHGGGo',
  '...oGGGGGGGGgoGo',
  '...oWgGGGGGgo.oo',
  '....ogWWggggGo..',
  '....oGo.o..oGo..',
  '....oGo....oGo..',
  '....ogo....ogo..',
  '....oo.....oo...',
  '................',
];
const VARG_FRAM = [
  '..o..........o..',
  '.oGo........oGo.',
  '.oGGo......oGGo.',
  '.oGdGooooooGdGo.',
  '.oGGGGHHHHGGGGo.',
  'oGGGHHHHHHHHGGGo',
  'oGHHkyHHHHykHHGo',
  'oGHHHHHHHHHHHHGo',
  '.oGHHHWWWWHHHGo.',
  '..oGHWWkkWWHGo..',
  '..oGGWWWWWWGGo..',
  '...oGWWrrWWGo...',
  '...ooGWWWWGoo...',
  '..oGGoGWWGoGGo..',
  '.oGGGGoooGGGGGo.',
  '................',
];
const VARG_MORK = [
  '................',
  '..o.o...........',
  '.odod...........',
  '.odddo..........',
  'kkdyddo.........',
  'oWWdddddooooo...',
  '.oowddddDDDDdoo.',
  '...oddDDDDDDDddo',
  '...odddddddddodo',
  '...oWWddddddo.oo',
  '....oWWWWWWddo..',
  '...odo.o..odo...',
  '..odo.....o.do..',
  '..oo.......o.do.',
  '.............oo.',
  '................',
];
const KOTT_BIT = [
  '................',
  '................',
  '....oooooo......',
  '..ooRRRRrroo....',
  '.oRRrrrrrrrro...',
  '.oRrrwwrrrrrroo.',
  'oRrrrrwwwrrrrro.',
  'orrrrrrrwwrrrro.',
  'orrwwrrrrrwrrro.',
  'orrrwwwrrrrrrro.',
  '.orrrrwwrrrrro..',
  '.oqrrrrrrrrrqo..',
  '..ooqqqqqqqoo...',
  '....ooooooo.....',
  '................',
  '................',
];
const KOTT_LAR = [
  '................',
  '..........oo....',
  '.........oWWo.oo',
  '........oWwwWoWo',
  '.......oRoWwwWWo',
  '.....ooRRroWWoo.',
  '...ooRRRrrro....',
  '..oRRRrrrrro....',
  '.oRRrrwwrrro....',
  'oRRrrrrwrrro....',
  'oRrrrrrrrrro....',
  'orrrrrrrrrqo....',
  'orrrrrrrrqo.....',
  '.oqrrrrqqo......',
  '..ooqqqoo.......',
  '................',
];
const KOTT_REMSOR = [
  '................',
  'jjjjjjjjjjjjjjjj',
  '.o.....o.....o..',
  'oRo...oRo...oRo.',
  'oro...oro...oro.',
  'orwo..orro..owro',
  'orro..owro..orro',
  'orro..orro..orro',
  'owro..orwo..orro',
  'orro..orro..orwo',
  'orro..orro..orro',
  'oqro..oqro..oqro',
  '.oqo..oqo...oqo.',
  '..o....o.....o..',
  '................',
  '................',
];
const SKINN_UTBRETT = [
  '......oooo......',
  'oo...oGddGo...oo',
  'oGo..oGGGGo..oGo',
  '.oGooGGGGGGooGo.',
  '..oGGGHHHHGGGo..',
  '...oGHHHHHHGo...',
  '...oGHHddHHGo...',
  '...oGHHddHHGo...',
  '...oGHHHHHHGo...',
  '...oGHHHHHHGo...',
  '..oGGGHHHHGGGo..',
  '.oGooGGGGGGooGo.',
  'oGo..oGGGGo..oGo',
  'oo....oGGo....oo',
  '.......oGo......',
  '........oo......',
];
const SKINN_RULLE = [
  '................',
  '................',
  '................',
  '...oooooooooo...',
  '..oGGGGGGGGGGo..',
  '.oGHHHHHHHHHHGo.',
  'oGHddoooooodHHGo',
  'oGHdojjjjjjodHGo',
  'oGHdojJJJJjodHGo',
  'oGHddoooooodHHGo',
  '.oGHHHHHHHHHHGo.',
  '..oGGGGGGGGGGo..',
  '...ooooooooooo..',
  '...oGGo...oGGo..',
  '....oo.....oo...',
  '................',
];
const SKINN_RAM = [
  'jj............jj',
  'jJoooooooooooJJj',
  'jJ.oGGGGGGGGo.Jj',
  'jJoGGHHHHHHGGoJj',
  'jJoGHHHHHHHHGoJj',
  'jJoGHHHddHHHGoJj',
  'jJ.oGHHddHHGo.Jj',
  'jJ.oGHHHHHHGo.Jj',
  'jJ.oGHHHHHHGo.Jj',
  'jJoGHHHHHHHHGoJj',
  'jJoGGHHHHHHGGoJj',
  'jJ.oGGGGGGGGo.Jj',
  'jJooo.oGGo.oooJj',
  'jJ.....oo.....Jj',
  'jJoooooooooooJJj',
  'jj............jj',
];
const PALS_HUVA = [
  '...o.o..o.o.....',
  '..oGoGooGoGo....',
  '..oGGkGGkGGo....',
  '..oGHHHHHHGo....',
  '.oGHWooooWHGo...',
  '.oGHo....oHGo...',
  'oGGHo....oHGGo..',
  'oGHHHooooHHHGo..',
  'oGHHHHHHHHHHGo..',
  'oGHHHHHHHHHHHGo.',
  'oGHHHHHHHHHHHGo.',
  'oGHHHHHHHHHHHHGo',
  'oGGHHHHHHHHHHGGo',
  'oGWGWGWGWGWGWGGo',
  '.oooooooooooooo.',
  '................',
];
const PALS_ROCK = [
  '....oooooooo....',
  '..ooWWWWWWWWoo..',
  '.oWWWWooooWWWWo.',
  'oGWWGo....oGWWGo',
  'oGGGGo....oGGGGo',
  'oGHGGGoo.oGGGHGo',
  'oGHGGHGo.oGHGHGo',
  'oGHGoGGo.oGGoHGo',
  'oGGGoGHGoGHGoGGo',
  'oWWoOGHHdHHGoWWo',
  '.oo.oGHHdHHGo.oo',
  '....oGHHdHHGo...',
  '....oGGHdHGGo...',
  '....oWGWdWGWo...',
  '....ooooooooo...',
  '................',
];
const PALS_KAPPA = [
  '................',
  '....oooooooo....',
  '..ooGGHHHHGGoo..',
  '.oGGHHHHHHHHGGo.',
  'oGHHHHHHHHHHHHGo',
  'oGHHHHrrrrHHHHGo',
  'oGHHHHrRRrHHHHGo',
  'oGHHHHHrrHHHHHGo',
  'oGGHHHHHHHHHHGGo',
  '.oGHHHHHHHHHHGo.',
  '.oGGHHHHHHHHGGo.',
  '..oGHHHHHHHHGo..',
  '..oGoGHHHHGoGo..',
  '.oGo.oGGGGo.oGo.',
  '.oo...oooo...oo.',
  '................',
];
const FALLD_SIDA = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '.......ooooooo..',
  '.o.o.ooGGGGGGGoo',
  'oGoGoGGHHHHHHGGo',
  'oGxGGGHHHHHHHHGo',
  'oWWGGGGGGGGGGGGo',
  '.oWWoWWWWWWGGoGo',
  '..oo.ooWoWoGo.oo',
  '...or..oo.oo....',
  '................',
  '................',
  '................',
];
const FALLD_STANG = [
  'jjjjjjjjjjjjjjjj',
  'JJJJJJJJJJJJJJJJ',
  '..oGo......oGo..',
  '..oGo......oGo..',
  '..oGGoooooooGo..',
  '..oGGGGHHHHGGo..',
  '..oGHHHHHHHHGo..',
  '...oGHHHHHHGo...',
  '...oGHHHHHHGo...',
  '...oWGGGGGGGo...',
  '..oGWWWWWGGGoo..',
  '..oGWo..oGGo.oo.',
  '.oGxGo...oGo.oGo',
  '.oWGGo....oo..oo',
  '..oro...........',
  '...o............',
];
const FALLD_BLOD = [
  '................',
  '................',
  '................',
  '................',
  '.......ooooooo..',
  '.o.o.ooGGGGGGGoo',
  'oGoGoGGHHHHHHGGo',
  'oGxGGGHHHHHHHHGo',
  'oWWGGGGGGGGGGGGo',
  '.oWWoWWWWWWGGoGo',
  '..oo.ooWoWoGo.oo',
  '..rRRrr..oo.oo..',
  '.rRRRRrr........',
  '..rrRrr.........',
  '................',
  '................',
];
const VARG_L = { G: 'skiffer2', H: 'skiffer3', g: 'skiffer1', d: 'skiffer0', W: 'ben3', w: 'ben3', k: 'kol0', y: 'senap3', r: 'rost1', R: 'rost2', q: 'rost0', j: 'jord1', J: 'jord2', x: 'kol1', O: 'jord2' }, VARG_M = { d: 'kol2', D: 'kol3', W: 'ben2', w: 'ben2', k: 'kol0', y: 'senap3' }, KOTT_L = { R: 'rost2', r: 'rost1', q: 'rost0', w: 'ben3', W: 'ben3', j: 'jord1', J: 'jord2' };
// jaktens och kaninernas nya symboler (Björn efter v159), 8 × 8 punkter som de andra symbolerna i spelet: till vänster i rätt
// storlek, till höger fyra gånger större
const SYM8_M = (p, l) => ({ w: 48, h: 38, kol: true, rita: (B, P) => { ritaSprite(B, p, l, 2, 2); ritaSprite(B, p.flatMap(r => { const rr = [...r].map(c => c.repeat(4)).join(''); return [rr, rr, rr, rr]; }), l, 13, 3); } });
const AKT_L = { w: 'ben3', a: 'skiffer3' }, KANIN_L = { b: 'jord2', B: 'jord3', w: 'ben3', k: 'kol0', r: 'rost2', y: 'senap3' };
const SMYG_TA = ['........', '.w...w..', '........', '...ww...', '..wwww..', '..www...', '.ww.....', '........'];
const SMYG_HUK = ['........', '....ww..', '....ww..', '.wwwww..', 'w.www...', '..w.w...', '.w...w..', '........'];
const SMYG_SPAR = ['.....ww.', '.....ww.', '......w.', '.ww.....', '.ww.....', '..w.....', '....ww..', '....ww..'];
const SIKTA_SPJUT = ['......aw', '.....aw.', '....w...', '...w....', '..w.....', '.w......', 'w.......', '........'];
const SIKTA_KAST = ['.ww.....', '.ww...wa', '..w..w..', '.wwww...', '..w.....', '..w.....', '.w.w....', 'w...w...'];
const SIKTA_OGA = ['........', '.wwwww..', 'w.waw.w.', '.wwwww..', '........', '...a....', '....a...', '.....aaa'];
const LARM_GUL = ['..kyyk..', '..kyyk..', '..kyyk..', '..kyyk..', '...kk...', '..kyyk..', '..kyyk..', '...kk...'];
const LARM_ROD = ['..rrrr..', '.rrwwrr.', 'rrrwwrrr', 'rrrwwrrr', 'rrrwwrrr', 'rrrrrrrr', '.rrwwrr.', '..rrrr..'];
const LARM_BUBBLA = ['kkkkkkk.', 'kkkwkkk.', 'kkkwkkk.', 'kkkwkkk.', 'kkkkkkk.', 'kkkwkkk.', 'kkkkkkk.', '.kk.....'];
const DOD_SIDA = ['........', '........', '........', '.bb.....', 'bkBbbbb.', 'bBBBBBBw', '.bBBrBb.', '..bbbb..'];
const DOD_HANGER = ['..b.b...', '..bbb...', '..bBb...', '.bBBBb..', '.bBBBb..', '.bBBBb..', '..bkb...', '..b.b...'];
const DOD_BLOD = ['........', '........', '.bb.....', 'bkBbbbb.', 'bBBBBBBw', '.bbbbbb.', '.rrrrr..', 'rrrrrrr.'];
// trädörren (steg 3.7.21), 16 × 16 punkter som en vägg
const DORR_REP = [
  'oooooooooooooooo', 'oJjoJjoJjoJjoJjo', 'oJjoJjoJjoJjoJjo', 'oyyyyyyyyyyyyyyo', 'oJjoJjoJjoJjoJjo', 'oJjoJjoJjoJjoJjo', 'oJjoJjoJjoJjoJjo', 'oJjoJjoJjoJjoJjo',
  'oJjoJjoJjoJjkkjo', 'oJjoJjoJjoJjkkjo', 'oJjoJjoJjoJjoJjo', 'oJjoJjoJjoJjoJjo', 'oyyyyyyyyyyyyyyo', 'oJjoJjoJjoJjoJjo', 'oJjoJjoJjoJjoJjo', 'oooooooooooooooo',
];
const DORR_Z = [
  'oooooooooooooooo', 'oJjJjJjJjJjJjJjo', 'oWWWWWWWWWWWWWWo', 'oJjJjJjJjJjJWWjo', 'oJjJjJjJjJjWWJjo', 'oJjJjJjJjJWWjJjo', 'oJjJjJjJjWWJjJjo', 'oJjJjJjJWWjJjJjo',
  'oJjJjJjWWJjJjkko', 'oJjJjJWWjJjJjkko', 'oJjJjWWJjJjJjJjo', 'oJjJWWjJjJjJjJjo', 'oJjWWJjJjJjJjJjo', 'oWWWWWWWWWWWWWWo', 'oJjJjJjJjJjJjJjo', 'oooooooooooooooo',
];
const DORR_BOM = [
  'oooooooooooooooo', 'oJjoJjoJjoJjoJjo', 'oJjoJjoJjoJjoJjo', 'oJjoJjoJjoJjoJjo', 'oJjoJjoJjoJjoJjo', 'oJjoJjoJjoJjoJjo', 'ssJjoJjoJjoJjoss', 'oSSSSSSSSSSSSSSo',
  'oSSSSSSSSSSSSSSo', 'ssJjoJjoJjoJjoss', 'oJjoJjoJjoJjoJjo', 'oJjoJjoJjoJjoJjo', 'oJjoJjoJjoJjoJjo', 'oJjoJjoJjoJjoJjo', 'oJjoJjoJjoJjoJjo', 'oooooooooooooooo',
];
const HV_L = { o: 'kol0', s: 'ben2', S: 'ben3', b: 'skiffer2', B: 'skiffer3', k: 'skiffer1', r: 'rost1' };
const HV_FLINGA = ['.......o........', '....o.oso.o.....', '....osoSoso.....', '.o...osSso...o..', 'oso...oSo...oso.', '.osooooSooooso..', '..oSSSSSSSSSo...', '.osooooSooooso..', 'oso...oSo...ooo.', '.o...osSso..oBo.', '....osoSoso.oBo.', '....o.oso.o.oBo.', '.......o...ooboo', '...........obbbo', '...........obbbo', '............ooo.'];
const HV_ANSIKTE = ['.....oooooo.....', '...oobbbbbboo...', '..obbBBBBBBbbo..', '.obBBBBBBBBBBbo.', '.obBBoBBBBoBBbo.', 'obBBBBBBBBBBBBbo', 'obBBBBBBBBBBBBbo', 'obBBoSoSoSoBBBbo', 'obBBoooooooBBBbo', '.obBBBBBBBBBBbo.', '.obbBBBBBBBBbbo.', '..oSbbbbbbbbSo..', '..oS.oooooo.So..', '...o........o...', '..oSo..oo..oSo..', '...o...oo...o...'];
const HV_ISTAPP = ['oooooooooooooooo', 'oSSSSSSSSSSSSSSo', 'oSSSsSSSSSsSSSSo', '.osSSosSSsoSSSo.', '.oSSo.oSSo.oSso.', '.oSso.oSso..oSo.', '..oSo.osSo..oSo.', '..oso..oSo..oo..', '..oSo..oso......', '...o...oSo......', '.......oSo......', '........o.......', '....o.....o.....', '...oso...oso....', '....o.....o.....', '................'];
const DORR_L = { J: 'jord2', j: 'jord1', W: 'jord3', y: 'senap2', k: 'kol0', S: 'jord3', s: 'skiffer1' };
const BN_L = { o: 'kol0', g: 'senap2', G: 'senap1', y: 'senap3', r: 'rost2', R: 'rost1', w: 'ben3', W: 'ben2', k: 'kol2', K: 'kol1', b: 'skiffer2', B: 'skiffer1', l: 'oliv2', L: 'oliv1' };
const BN_2 = p => p.flatMap(r => { const rr = [...r].map(c => c.repeat(2)).join(''); return [rr, rr]; });
const BN_MEDALJ = ['...oo......oo...', '...orro..oRRo...', '....orRooRro....', '.....orRRro.....', '......oRRo......', '.....oooooo.....', '....oggggggo....', '...ogGggggGgo...', '...oggGggGggo...', '...ogggGGgggo...', '...oggGggGggo...', '...ogGggggGgo...', '....oggggggo....', '.....oooooo.....', '................', '................'];
const BN_KRANS = ['................', '.....oo..oo.....', '...oolo..oloo...', '..olLo....oLlo..', '.olLo......oLlo.', '.olo........olo.', 'olLo........oLlo', 'olo..........olo', 'olLo........oLlo', '.olo........olo.', '.olLo......oLlo.', '..olLo....oLlo..', '...oolo..oloo...', '.....oRrrRo.....', '....oRo..oRo....', '.....o....o.....'];
const BN_STJARNA = ['.......oo.......', '.......og.......', '...o..ogyo..o...', '....o.ogyo.o....', '.......gy.......', '..ooooogyooooo..', '.oyyyyyyyyyyyyo.', '..oggyyyyyyggo..', '...ogggyyggggo..', '....ogggggggo...', '....oggoogggo...', '...oggo..oggo...', '...ogo....ogo...', '..ooo......ooo..', '..o..........o..', '................'];
const BN_BUBBLA = ['................', '..oooooooooooo..', '.owwwwwwwwwwwwo.', '.owwrwwwwwwrwwo.', '.owwwrwwwwrwwwo.', '.owwwwrwwrwwwwo.', '.owwwwwrrwwwwwo.', '.owwwwwrrwwwwwo.', '.owwwwrwwrwwwwo.', '.owwwrwwwwrwwwo.', '.owwrwwwwwwrwwo.', '.owwwwwwwwwwwwo.', '..ooookwoooooo..', '.....okwo.......', '.....oko........', '.....oo.........'];
const BN_MOLN = ['................', '.....oooo.......', '...ooBBBBoo.....', '..oBBbbbbBBooo..', '.oBbbbbbbbbBBBo.', 'oBbbbbbbbbbbbbBo', 'oBbbbbbbbbbbbbBo', '.oBBBBBBBBBBBBo.', '..oooooyooooo...', '......oyo.......', '.....oyo........', '....oyyyyo......', '......oyo.......', '.....oyo........', '.....oo.........', '................'];
const BN_SPRUCKEN = ['................', '.....oooooo.....', '....oBBBBBBo....', '...oBbbbobbBo...', '..oBbbbbobbbBo..', '..oBbbbobbbbBo..', '..oBbbboobbbBo..', '..oBbbbbobbbBo..', '..oBbbbobbbbBo..', '..oBbbobbbbbBo..', '...oBbobbbbBo...', '....oBobBBBo....', '.....oooooo.....', '................', '................', '................'];
// torkan och den torra sjöbottnen (steg 3.8.2)
const TK_L = { o: 'kol0', y: 'senap2', Y: 'senap3', r: 'rost2', j: 'jord2', J: 'jord3', k: 'jord0', v: 'skiffer2', V: 'skiffer3', g: 'oliv1', G: 'oliv2', b: 'jord1' };
const TK_SOL = ['.....o..o.......', '..o..oyyo..o....', '...ooyYYyoo.....', '...oyYYYYyo.....', 'ooyYYYYYYYYyoo..', '...oyYYYYyo.....', '...ooyYYyoo.....', '..o..oyyo..o....', '.....o..o.......', '................', 'oooooooooooooooo', 'ojJJjkJJJjJJkJjo', 'ojjkjjkJjjjkjjjo', 'okjjkjjjkjkjjkjo', 'ojkjjjrjjkjjjjko', 'oooooooooooooooo'];
const TK_SJO = ['................', '...oooooooooo...', '..ojJJjjJJJjjo..', '.ojJkjjJjjkJjjo.', 'ojjkjjoooojjkjjo', 'ojJjjovVVvojjJjo', 'ojjkjovvvvojkjjo', 'ojJjjjoooojjjJjo', '.ojjkjjJjkjjjjo.', '..ojjjkjjjJjjo..', '...oooooooooo...', '................', '..o..........o..', '.oyo........oyo.', '..o..........o..', '................'];
const TK_VISSEN = ['................', '.......o........', '......oGo.......', '.....oGgo..o....', '....ogo.o.oyo...', '....oo..oyyo....', '........obo.....', '.....oyyob......', '....oyo.ob......', '....oo..ob......', '........ob......', 'oooooooooooooooo', 'ojJjkjjJjkjjJjjo', 'ojkjjJjkjjjkjjko', 'okjjjkjjjJjkjjjo', 'oooooooooooooooo'];
const LE_L = { o: 'kol0', j: 'jord1', J: 'jord2', k: 'jord0', l: 'jord3', s: 'skiffer1', S: 'skiffer2', v: 'skiffer2', V: 'skiffer3' };
const LE_SPRICK = ['JJJjJJJJkJJJJjJJ', 'JJjJJJJkJJJjJJJJ', 'kkJJJJkJJJJJJJkk', 'JJkkJkJJJJJJkkJJ', 'JJJJkJJJJJJkJJJJ', 'JJJJkJJJJkkJJJJJ', 'JJJkJkkkkJJJJJJJ', 'JJkJJJJJkJJJJJJJ', 'JkJJJJJJJkJJJJJJ', 'kJJJJJJJJkkJJJkk', 'JJJJJJJJkJJkkkJJ', 'JJJJJJJkJJJJJkJJ', 'JJJJJkkJJJJJJJkJ', 'JJJJkJJJJJJJJJJk', 'JJJkJJJJJJJJJJJJ', 'JJkJJJJJJJJJJJJJ'];
const LE_STEN = ['JJJJJJJJJJJJJJJJ', 'JJlJJJJJJJJJJJJJ', 'JJJJJJsSJJJJJJJJ', 'JJJJJJssJJJJlJJJ', 'JJJJJJJJJJJJJJJJ', 'JJJjJJJJJJJJJJJJ', 'JJjjjJJJJJJsJJJJ', 'JJJjJJJJJJJJJJJJ', 'JJJJJJJJJlJJJJJJ', 'JJJJJJJJJJJJJjJJ', 'JsSJJJJJJJJJjjjJ', 'JssJJJJJJJJJJjJJ', 'JJJJJJlJJJJJJJJJ', 'JJJJJJJJJJJsSJJJ', 'JJJJJJJJJJJssJJJ', 'JJJJJJJJJJJJJJJJ'];
const LE_FUKT = ['JJJJJJJJJJJJJJJJ', 'JJJJJJJJJJJjJJJJ', 'JJJjJJJJJJJJJJJJ', 'JJJJJJJJjJJJJJJJ', 'JJJJJJjjjjjJJJJJ', 'JJJJjjjvvvjjjJJJ', 'JJJjjvvVVvvvjJJJ', 'JJJjjvVVVVvjjJJJ', 'JJJJjjvvvvjjJJJJ', 'JJJJJjjjjjjJJJJJ', 'JJJJJJJJJJJJJjJJ', 'JjJJJJJJJJJJJJJJ', 'JJJJJJJJJjJJJJJJ', 'JJJJJJJJJJJJJJJJ', 'JJJJjJJJJJJJJJJJ', 'JJJJJJJJJJJJJJJJ'];
// Översvämningen (steg 3.8.3)
const FL_L = { o: 'kol0', b: 'skiffer1', B: 'skiffer2', l: 'skiffer3', g: 'oliv1', G: 'oliv2', k: 'jord0', j: 'jord1', J: 'jord2', Y: 'ben3' };
const FL_STRAND = ['................', '..........G.....', '.........GgG....', '..........g.....', 'oooooooo..g.....', 'ogGgGgGgo.g.....', 'okkkkkkkko......', '..l..l...l..l...', '.lBl.lBl.lBl.lB.', 'lBbBlBbBlBbBlBbB', 'BbbbBbbbBbgbBbbb', 'bbbbbbbbbbgbbbbb', 'bBbbbbBbbbbbBbbb', 'bbbbBbbbbbBbbbbb', 'bbBbbbbbBbbbbbBb', 'oooooooooooooooo'];
const FL_HUS = ['................', '.......oo.......', '......ojjo......', '.....ojJJjo.....', '....ojJJJJjo....', '...ojJJJJJJjo...', '..oooooooooooo..', '...okkkkkkkko...', '...okkkoookko...', '...okkkobbokko..', 'l.lokkkobboklo.l', 'BlBlBlBlBlBlBlBl', 'bBbbbbBbbbbbBbbb', 'bbbbBbbbbbBbbbbb', 'bbBbbbbbBbbbbbBb', 'oooooooooooooooo'];
const FL_STOLPE = ['......oo........', '.....oYYo.......', '....oYYYYo......', '......Yk........', '......kk....o...', '......kk...oYo..', '......Ykl..oYo..', '......kk...oYo..', '......kk...oYo..', 'llllllkklllllll.', 'BlBlBlkkBlBlBlBl', 'bbbbbbkkbbbbbbbb', 'bBbbbbkkbbbbBbbb', 'bbbbBbkkbbBbbbbb', 'bbBbbbkkBbbbbbBb', 'oooooooooooooooo'];
// Samtalens ämnen (steg 3.9.5)
const AM_L = { o: 'kol0', b: 'jord2', B: 'jord1', k: 'rost1', w: 'ben2', W: 'ben3', h: 'rost2', H: 'rost1', s: 'skiffer2', S: 'skiffer3', g: 'oliv2', G: 'oliv1', y: 'senap2' };
const AM_MAT1 = ['................', '................', '......w..w......', '.....w..w.......', '......w..w......', '................', '...oooooooooo...', '..okkkkkkkkkko..', '..obbbbbbbbbbo..', '...obbbbbbbbo...', '...oBbbbbbbBo...', '....oBBBBBBo....', '.....oooooo.....', '................', '................', '................'];
const AM_MAT2 = ['................', '.........oo.....', '........obbo....', '.......obbo.....', '......obbo......', '.....obbo.......', '..oooobooooooo..', '.okkkkkkkkkkkko.', '.oyykkyykkyykko.', '..obbbbbbbbbbo..', '..oBbbbbbbbbBo..', '...oBbbbbbbBo...', '....oBBBBBBo....', '.....oooooo.....', '................', '................'];
const AM_MAT3 = ['................', '................', '.....oooooo.....', '...ooyyyyyyoo...', '..oyyyyyyyyyyo..', '..oyyyoyyoyyyo..', '..oyyyyyyyyyyo..', '...oyyyyyyyyo...', '....oooooooo....', '.....okkkko.....', '....okkkkkko....', '....okkkkkko....', '.....okkkko.....', '......oooo......', '................', '................'];
const AM_TROST1 = ['................', '................', '................', '...ooo....ooo...', '..ohhho..oHHHo..', '..ohhhhooHHHHo..', '..ohhhhhHHHHHo..', '...ohhhhHHHHo...', '....ohhhHHHo....', '.....ohhHHo.....', '......ohHo......', '.......oo.......', '................', '................', '................', '................'];
const AM_TROST2 = ['................', '.....oooo.......', '....ohhhho......', '....ohhhho......', '.....oooo.oooo..', '..ooohhhooHHHHo.', '.ohhhhhhhoHHHHo.', '.ohhhhhhhhooooo.', '.ohhhhhhhHHHHHo.', '..ohhhhhHHHHHo..', '..ohhhhhHHHHHo..', '..ohhhhoHHHHHo..', '..ohhhho.oHHHo..', '..oooooo.ooooo..', '................', '................'];
const AM_TROST3 = ['................', '...oo....oo.....', '..okko..okko....', '..okkkookkkko...', '..okkkkkkkkko...', '...okkkkkkkko...', '....okkkkkko....', '.....okkkko.....', '......okko......', '.......oo.......', '..oooooooooooo..', '.ohhhhhhhhhhhho.', '.ohhhhhhhhhhhho.', '..oooooooooooo..', '................', '................'];
const AM_DOD1 = ['................', '................', '.....oooooo.....', '....oWWWWWWo....', '...oWWWoWWWWo...', '...oWWoooWWWo...', '...oWWWoWWWwo...', '...oWWWoWWWwo...', '...oWWWWWWWwo...', '...oWWWWWWwwo...', '...oWwwwwwwwo...', '..goooooooooog..', '.gggggggggggggg.', '................', '................', '................'];
const AM_DOD2 = ['................', '.......oo.......', '.......ob.......', '.....oooboo.....', '.....obbbbo.....', '.....oooboo.....', '.......ob.......', '.......ob.......', '.......ob.......', '.......ob.......', '.......ob.......', '....ooooBooo....', '...osssssssso...', '..ossssssssss...', '.gggggggggggggg.', '................'];
const AM_DOD3 = ['................', '................', '......oooo......', '.....oyyyyo.....', '.....oyyyyo.....', '......oyyo......', '.......oo.......', '.......ob.......', '......oBBo......', '.....oBBBBo.....', '.....oBBBBo.....', '.....oBBBBo.....', '.....oBBBBo.....', '......oooo......', '................', '................'];
const AM_BARN1 = ['................', '................', '......oooo......', '.....oBBBBo.....', '.....ohhhho.....', '.....ohhhho.....', '......oooo......', '.....owwwwo.....', '....owwwwwwo....', '....owowwowo....', '....oowwwwoo....', '......owwo......', '......o..o......', '......o..o......', '................', '................'];
const AM_BARN2 = ['................', '....oooo........', '...oBBBBo.......', '...ohhhho.......', '...ohhhho...ooo.', '....oooo...oBBBo', '...owwwwo..ohhho', '..owwwwwwo.ohhho', '..owowwowo..ooo.', '...owwwwo..owwwo', '....owwo..owwwwo', '....o..o..owwwwo', '....o..o...o..o.', '...oo..oo..o..o.', '................', '................'];
const AM_BARN3 = ['................', '................', '................', '......oooo......', '.....okkkko.....', '....okkkkkko....', '...okkhhhhkko...', '...okhhhhhhko...', '...okhohhohko...', '...okhhhhhhko...', '...okkhhhhkko...', '....okkkkkko....', '.....oooooo.....', '................', '................', '................'];
const VAL = [
  { id: 's_mat', namn: 'Samtal om mat', vad: 'Ny symbol (steg 3.9.5), 16 × 16 punkter, i pratbubblan och personrutan när två pratar om maten eller längtar efter något att äta. Till vänster i rätt storlek, till höger tre gånger större. I spelet nu: version 1 (platshållare).', typ: 'tre',
    versioner: [
      { text: 'En skål med ångande mat.', ...LED_M(AM_MAT1, AM_L) },
      { text: 'En skål med gryta och en träslev.', ...LED_M(AM_MAT2, AM_L) },
      { text: 'Ett gyllene bröd ovanpå en köttbit.', ...LED_M(AM_MAT3, AM_L) },
    ] },
  { id: 's_trost', namn: 'Samtal som tröstar', vad: 'Ny symbol (steg 3.9.5), 16 × 16 punkter, när någon tröstar någon annan. I spelet nu: version 1 (platshållare).', typ: 'tre',
    versioner: [
      { text: 'Två händer som håller om varandra.', ...LED_M(AM_TROST1, AM_L) },
      { text: 'Två människor där den ena lägger armen om den andra.', ...LED_M(AM_TROST2, AM_L) },
      { text: 'Ett hjärta som vilar i en öppen hand.', ...LED_M(AM_TROST3, AM_L) },
    ] },
  { id: 's_dod', namn: 'Samtal om en död', vad: 'Ny symbol (steg 3.9.5), 16 × 16 punkter, när byn pratar om någon som dött nyss. I spelet nu: version 1 (platshållare).', typ: 'tre',
    versioner: [
      { text: 'En gravsten med ett kors i gräset.', ...LED_M(AM_DOD1, AM_L) },
      { text: 'Ett träkors på en stenhög.', ...LED_M(AM_DOD2, AM_L) },
      { text: 'Ett tänt ljus i minne av den döda.', ...LED_M(AM_DOD3, AM_L) },
    ] },
  { id: 's_barn', namn: 'Samtal om barnen', vad: 'Ny symbol (steg 3.9.5), 16 × 16 punkter, när två pratar om barnen. I spelet nu: version 1 (platshållare).', typ: 'tre',
    versioner: [
      { text: 'Ett litet barn i vit särk.', ...LED_M(AM_BARN1, AM_L) },
      { text: 'Två barn bredvid varandra.', ...LED_M(AM_BARN2, AM_L) },
      { text: 'Ett spädbarns ansikte i en filt.', ...LED_M(AM_BARN3, AM_L) },
    ] },

  { id: 'binamn', namn: 'Hedersnamn och öknamn', vad: 'Två nya symboler (steg 3.9.1), 16 × 16 punkter, i personrutan efter namnet när byn gett någon ett hedersnamn ("Brand den flitige") eller ett öknamn ("Ask Tjuven"). Varje version har ett par: heder överst och skam under, och till höger dubbelt så stora. I spelet nu: medaljen och pratbubblan med kryss (platshållare).', typ: 'tre',
    versioner: [
      { text: 'Heder: en guldmedalj i ett rött band. Skam: en pratbubbla med ett rött kryss.', w: 92, h: 38, kol: true, rita: (B, P) => { ritaSprite(B, BN_MEDALJ, BN_L, 2, 2); ritaSprite(B, BN_BUBBLA, BN_L, 2, 20); ritaSprite(B, BN_2(BN_MEDALJ), BN_L, 22, 3); ritaSprite(B, BN_2(BN_BUBBLA), BN_L, 58, 3); } },
      { text: 'Heder: en lagerkrans med ett band. Skam: ett mörkt moln med en blixt (byns skvaller).', w: 92, h: 38, kol: true, rita: (B, P) => { ritaSprite(B, BN_KRANS, BN_L, 2, 2); ritaSprite(B, BN_MOLN, BN_L, 2, 20); ritaSprite(B, BN_2(BN_KRANS), BN_L, 22, 3); ritaSprite(B, BN_2(BN_MOLN), BN_L, 58, 3); } },
      { text: 'Heder: en guldstjärna som strålar. Skam: ett spräckt grått mynt.', w: 92, h: 38, kol: true, rita: (B, P) => { ritaSprite(B, BN_STJARNA, BN_L, 2, 2); ritaSprite(B, BN_SPRUCKEN, BN_L, 2, 20); ritaSprite(B, BN_2(BN_STJARNA), BN_L, 22, 3); ritaSprite(B, BN_2(BN_SPRUCKEN), BN_L, 58, 3); } },
    ] },

  { id: 'm_hardVinter', namn: 'Den hårda vintern', vad: 'Ny symbol (steg 3.8.1), 16 × 16 punkter, i kalendern bredvid temperaturen när en hård vinter pågår (blek när de äldsta i byn bara anar den). I spelet nu: version 1 (platshållare).', typ: 'tre',
    versioner: [
      { text: 'En snöflinga med en kall termometer bredvid.', ...LED_M(HV_FLINGA, HV_L) },
      { text: 'Ett blått, frusande ansikte med hackande tänder och snö på hakan.', ...LED_M(HV_ANSIKTE, HV_L) },
      { text: 'Istappar som hänger från en takkant, med snöflingor under.', ...LED_M(HV_ISTAPP, HV_L) },
    ] },

  { id: 'm_oversvamning', namn: 'Översvämningen', vad: 'Ny symbol (steg 3.8.3), 16 × 16 punkter, i kalendern bredvid temperaturen när en översvämning pågår. I spelet nu: version 1 (platshållare).', typ: 'tre',
    versioner: [
      { text: 'Vågor som stiger över en grässtrand, med ett grässtrå som sticker upp ur vattnet.', ...LED_M(FL_STRAND, FL_L) },
      { text: 'Ett hus som står till hälften i vatten.', ...LED_M(FL_HUS, FL_L) },
      { text: 'En märkt påle i vattnet och en pil uppåt: vattnet stiger.', ...LED_M(FL_STOLPE, FL_L) },
    ] },
  { id: 'm_torka', namn: 'Torkan', vad: 'Ny symbol (steg 3.8.2), 16 × 16 punkter, i kalendern bredvid temperaturen när en torka pågår (blek när de äldsta i byn bara anar den). I spelet nu: version 1 (platshållare).', typ: 'tre',
    versioner: [
      { text: 'En het sol över sprucken mark.', ...LED_M(TK_SOL, TK_L) },
      { text: 'En uttorkad sjö med en sista liten pöl i mitten, under solen.', ...LED_M(TK_SJO, TK_L) },
      { text: 'En vissen växt som hänger med bladen i torr jord.', ...LED_M(TK_VISSEN, TK_L) },
    ] },
  { id: 'lera', namn: 'Torr sjöbotten', vad: 'Ny mark (steg 3.8.2), 16 × 16 punkter per ruta, där sjön dragit sig tillbaka under torkan. Det går att gå på den, och vattnet kommer tillbaka när det regnar. I spelet nu: en grå-brun ruta (platshållare).', typ: 'tre',
    versioner: [
      { text: 'Brun lera med mörka sprickor i ett nät.', ...LED_M(LE_SPRICK, LE_L) },
      { text: 'Slät lera med småsten och torra fläckar.', ...LED_M(LE_STEN, LE_L) },
      { text: 'Lera med en sista fuktig, blågrå fläck.', ...LED_M(LE_FUKT, LE_L) },
    ] },

  { id: 'tradorr', namn: 'Trädörren', vad: 'Ny dörr (steg 3.7.21), 16 × 16 punkter, i husets dörröppning. Den stängs när någon gömmer sig i huset, och vargarna kommer inte in. Till vänster i rätt storlek, till höger tre gånger större. I spelet nu: plankor med två rader rep (platshållare).', typ: 'tre',
    versioner: [
      { text: 'Lodräta plankor med mörka springor, bundna med två rader rep och ett handtag av trä.', ...LED_M(DORR_REP, DORR_L) },
      { text: 'Plankor med en ljus regel upptill och nedtill och en sned regel emellan, som en Z-dörr.', ...LED_M(DORR_Z, DORR_L) },
      { text: 'Plankor med en tjock bom av trä tvärs över, i två hållare av sten, som när dörren är stängd.', ...LED_M(DORR_BOM, DORR_L) },
    ] },

  { id: 'a_smyga', namn: 'Att smyga', vad: 'Ny symbol över huvudet (Björn efter v159), 8 × 8 punkter som de andra handlingarna: jägaren smyger fram mot en kanin. I spelet nu: version 1 (platshållare).', typ: 'tre',
    versioner: [
      { text: 'En fot på tå med två tysta prickar.', ...SYM8_M(SMYG_TA, AKT_L) },
      { text: 'En människa som hukar sig framåt.', ...SYM8_M(SMYG_HUK, AKT_L) },
      { text: 'Tre fotspår i rad.', ...SYM8_M(SMYG_SPAR, AKT_L) },
    ] },
  { id: 'a_sikta', namn: 'Att sikta', vad: 'Ny symbol över huvudet (Björn efter v159), 8 × 8 punkter: jägaren har stannat och siktar innan hen kastar. I spelet nu: version 1 (platshållare).', typ: 'tre',
    versioner: [
      { text: 'Ett spjut snett uppåt med spetsen åt höger.', ...SYM8_M(SIKTA_SPJUT, AKT_L) },
      { text: 'En människa med armen bakåt och spjutet redo att kastas.', ...SYM8_M(SIKTA_KAST, AKT_L) },
      { text: 'Ett öga som tittar längs en linje mot målet.', ...SYM8_M(SIKTA_OGA, AKT_L) },
    ] },
  { id: 'kanin_larm', namn: 'Kaninen har sett någon', vad: 'Ny symbol (Björn efter v159), 8 × 8 punkter, över en kanin som ser en människa och flyr. I spelet nu: version 1 (platshållare).', typ: 'tre',
    versioner: [
      { text: 'Ett gult utropstecken med mörk kant.', ...SYM8_M(LARM_GUL, KANIN_L) },
      { text: 'Ett vitt utropstecken på en röd bricka.', ...SYM8_M(LARM_ROD, KANIN_L) },
      { text: 'Ett vitt utropstecken i en mörk pratbubbla.', ...SYM8_M(LARM_BUBBLA, KANIN_L) },
    ] },
  { id: 'kanin_dod', namn: 'Den fångade kaninen', vad: 'Ny bild (Björn efter v159), 8 × 8 punkter som kaninen: kaninen som jägaren fångat ligger kvar tills hen hämtar den. I spelet nu: version 1 (platshållare).', typ: 'tre',
    versioner: [
      { text: 'Kaninen på sidan med en röd fläck.', ...SYM8_M(DOD_SIDA, KANIN_L) },
      { text: 'Kaninen som hänger i bakbenen.', ...SYM8_M(DOD_HANGER, KANIN_L) },
      { text: 'Kaninen på sidan med en blodpöl under.', ...SYM8_M(DOD_BLOD, KANIN_L) },
    ] },
  { id: 'varg', namn: 'Vargen', vad: 'Nytt djur (steg 3.7.1), 16 × 16 punkter, på kartan när en flock stryker runt byn. Till vänster i rätt storlek, till höger tre gånger större. I spelet nu: den fällda vargens platshållare.', typ: 'tre',
    versioner: [
      { text: 'En grå varg från sidan med spetsiga öron, ljus nos och bröst och en buskig svans.', ...LED_M(VARG_STAR, VARG_L) },
      { text: 'Vargens huvud framifrån med gula ögon, ljus nos och ett rött gap, som en symbol.', ...LED_M(VARG_FRAM, VARG_L) },
      { text: 'En mörk varg från sidan med gula ögon och ljust bröst, som syns bra mot snön.', ...LED_M(VARG_MORK, VARG_M) },
    ] },
  { id: 'vargkott', namn: 'Vargköttet', vad: 'Ny sak (steg 3.7.14), 16 × 16 punkter, i förrådet när en varg slaktats. I spelet nu: en röd bit med ett ben (platshållare).', typ: 'tre',
    versioner: [
      { text: 'En mörkröd köttbit med vita fettstrimmor.', ...LED_M(KOTT_BIT, KOTT_L) },
      { text: 'Ett lår med benet som sticker ut.', ...LED_M(KOTT_LAR, KOTT_L) },
      { text: 'Tre remsor kött som hänger på en pinne.', ...LED_M(KOTT_REMSOR, KOTT_L) },
    ] },
  { id: 'vargskinn', namn: 'Vargskinnet', vad: 'Ny sak (steg 3.7.14), 16 × 16 punkter, i förrådet när en varg slaktats. I spelet nu: ett grått utbrett skinn (platshållare).', typ: 'tre',
    versioner: [
      { text: 'Ett utbrett grått skinn med huvud, fyra ben och svans.', ...LED_M(SKINN_UTBRETT, VARG_L) },
      { text: 'Ett hoprullat skinn med ett läderband runt.', ...LED_M(SKINN_RULLE, VARG_L) },
      { text: 'Ett skinn som spänts upp i en ram av trä.', ...LED_M(SKINN_RAM, VARG_L) },
    ] },
  { id: 'vargpals', namn: 'Vargpälsen', vad: 'Nytt plagg (steg 3.7.14), 16 × 16 punkter, i utrustningen och förrådet. I spelet nu: en grå päls med ljus krage (platshållare).', typ: 'tre',
    versioner: [
      { text: 'En päls med huva av vargens huvud, med öron och ögon.', ...LED_M(PALS_HUVA, VARG_L) },
      { text: 'En grå pälsrock med ljus krage och ljusa ärmslut.', ...LED_M(PALS_ROCK, VARG_L) },
      { text: 'En kappa över axlarna med ett rött spänne och tassarna som hänger ner.', ...LED_M(PALS_KAPPA, VARG_L) },
    ] },
  { id: 'falldvarg', namn: 'Den fällda vargen', vad: 'Ny sak (steg 3.7.14), 16 × 16 punkter: vargen som byn fällt och bär hem för slakt. I spelet nu: en liten grå varg på sidan (platshållare, 8 × 8 punkter).', typ: 'tre',
    versioner: [
      { text: 'Vargen ligger på sidan med slutet öga och benen ut.', ...LED_M(FALLD_SIDA, VARG_L) },
      { text: 'Vargen hänger i benen från en stång, som när den bärs hem.', ...LED_M(FALLD_STANG, VARG_L) },
      { text: 'Vargen på sidan med en blodpöl under huvudet.', ...LED_M(FALLD_BLOD, VARG_L) },
    ] },
  { id: 'dimma', namn: 'Dimman', vad: 'Ny vädersymbol (steg 3.7.11), 10 × 10 punkter som de andra vädersymbolerna, i panelen bredvid temperaturen. Till vänster i rätt storlek, till höger tre gånger större. I spelet nu: dimbanden (version 1) som platshållare, och kartan blir ljusare och blekare i dimman.', typ: 'tre',
    versioner: [
      { text: 'Bara dimman: ljusa band i olika längd ovanför varandra.', ...DIM_M(DIM_BAND, { v: 'ben2' }) },
      { text: 'En blek sol bakom dimbanden.', ...DIM_M(DIM_SOL, { y: 'senap3', W: 'ben3', v: 'ben2' }) },
      { text: 'En gran som försvinner i dimman: mörka grenar mellan ljusa band.', ...DIM_M(DIM_TRAD, { d: 'skiffer2', W: 'ben3', v: 'ben2' }) },
    ] },
  { id: 'ledarskap', namn: 'Ledarskapets symbol', vad: 'Ny symbol (steg 3.5), 16 × 16 punkter, för tekniken Ledarskap i teknikträdet och fliken Styre. Till vänster i rätt storlek, till höger tre gånger större. I spelet nu: hövdingastaven (version 1) som platshållare.', typ: 'tre',
    versioner: [
      { text: 'En hövdingastav i trä med en guldknopp, ett rött band och två vita fjädrar.', ...LED_M(LED_STAV, { s: 'senap2', S: 'senap3', w: 'ben2', W: 'ben3', j: 'jord1', J: 'jord2', r: 'rost2' }) },
      { text: 'En fjäderkrona: tre vita fjädrar med röda spetsar i ett pannband med guldpärlor.', ...LED_M(LED_KRONA, { w: 'ben2', W: 'ben3', r: 'rost2', s: 'jord2', S: 'jord3', y: 'senap3' }) },
      { text: 'Ledaren och folket: en stor människa med armarna ut mellan två mindre, i ljust mot de mörkare.', ...LED_M(LED_FOLK, { a: 'senap3', b: 'skiffer2' }) },
    ] },
  { id: 'utbrott', namn: 'Utbrottens symboler', vad: 'Nya symboler (steg 3.2.2–3.2.4), 16 × 16 punkter, i stället för emojierna som visar vad någon gör. Förenklade efter din kommentar: en symbol för varje allvarsgrad. Från vänster: grad 1 (gråta, tjura, skrika), grad 2 (vara elak, slå sönder något, springa iväg), grad 3 (ligga kvar i bädden, göra slut, slå), grad 4 (misshandla, lämna byn) och grad 5 (dråp).', typ: 'tre',
    versioner: [
      { text: 'Ett motiv per grad med mörk kant och skugga: tårar, arga ögonbryn, ett brustet hjärta, en knuten näve och en dödskalle.', ...UTB5_M('skugga') },
      { text: 'Samma motiv i ljust på en bricka i gradens färg: grönt, guld, orange, rost och mörkt.', ...UTB5_M('bricka') },
      { text: 'Bara ansiktet, som blir argare och rödare för varje grad: ledset med en tår, surt i guld, argt med tänder i orange, rasande i rost med ånga och en dödskalle för dråpet.', ...UTB5_M('ansikte') },
    ] },
  { id: 'grill', namn: 'Grillen', vad: 'Station, tre rutor (steg 3.6.7). Omritad så att den syns bättre mot marken.', typ: 'janej',
    idag: { w: 52, h: 36, rita: (B, P) => forstorad(B, 'grill_karta', 2, 2) }, idagText: 'Grillen som den ser ut i spelet nu.',
    versioner: [{ text: 'En mörk kant runt klykorna och spettet, ljusare trä och en skugga på marken under klykorna.', w: 52, h: 36, rita: (B, P) => ritaSprite(B, grillNy(), { o: 'kol0', D: 'kol0', w: 'jord2', W: 'jord3', L: 'jord3', O: 'ben3', q: 'jord1', z: 'skugga' }, 2, 2) }] },
  { id: 'slaktbank', namn: 'Slaktbänken', vad: 'Station, tre rutor. Version 1 som du valde, med benen flyttade efter din kommentar.', typ: 'janej',
    idag: { w: 52, h: 28, rita: (B, P) => ritaSlakt(B, 2, 2, P, 1) }, idagText: 'Version 1 som du valde.',
    versioner: [{ text: 'Benen står i bordets fyra hörn: de främre längst ut i ändarna, de bakre lite innanför och kortare, som om de står längre bort.', w: 52, h: 28, rita: (B, P) => ritaSlakt(B, 2, 2, P, 1, true) }] },
  { id: 'slojdbank', namn: 'Slöjdbänken', vad: 'Station, två rutor. Omritad med 16 punkter per ruta.', typ: 'janej',
    idag: { w: 36, h: 36, rita: (B, P) => ritaSlojdbank(B, 2, 2, P) }, idagText: 'Förra versionen, som du sa nej till.',
    versioner: [{ text: 'Efter din kommentar: repet spänt rakt mellan stolparna, utan trådar som hänger ner.', w: 36, h: 36, rita: (B, P) => ritaSlojdbank(B, 2, 2, P, true) }] },
  { id: 'portratt', namn: 'Porträtten', vad: 'Personens porträtt i personrutan, 64 × 64 punkter. Mindre schackrutiga efter din kommentar; alla fem syns under Folket ovanför.', typ: 'janej',
    idag: { w: 64, h: 64, kol: true, rita: (B, P) => { const R = ritaPortratt(P, PERSONER[0], 64, true); B.px.set(R.px); } }, idagText: 'Förra versionen, som du sa nej till.',
    versioner: [{ text: 'Ljuset i hela band utan rutmönster, och håret och skägget med strån i klungor längs växtriktningen.', w: 64, h: 64, kol: true, rita: (B, P) => { const R = ritaPortratt(P, PERSONER[0]); B.px.set(R.px); } }] },
  { id: 'kista', namn: 'Kistan', vad: 'Station, en ruta. Omritad med 16 punkter per ruta.', typ: 'janej',
    idag: { w: 20, h: 20, rita: (B, P) => forstorad(B, 'kista_karta', 2, 2) },
    versioner: [{ text: 'Lock med ljus kant, järnband och lås i senap.', w: 20, h: 20, rita: (B, P) => ritaKista(B, 2, 2, P) }] },
  { id: 'lagereld', namn: 'Lägerelden', vad: 'Lägerelden i pixlar. I dag ritas den med cirklar.', typ: 'janej',
    versioner: [{ text: 'Stenring i skiffer, ved, aska och lågor med glöd längst ner.', w: 28, h: 26, rita: (B, P) => ritaEld(B, 14, 15, P, { tid: 'dag' }) }] },
  { id: 'symboler', namn: 'Symbolerna', vad: 'De första åtta pixelsymbolerna, 8 × 8 punkter, i stället för emojier.', typ: 'janej',
    idag: { text: SYMBOLER.map(s => s.ers).join(' ') },
    versioner: [{ text: SYMBOLER.map(s => s.namn).join(', ') + '.', w: SYMBOLER.length * 10 + 2, h: 12, kol: true, rita: (B, P) => SYMBOLER.forEach((s, i) => ritaSprite(B, s.p, s.l, 2 + i * 10, 2)) }] },
];
// Björns val som är bestämda men inte inbyggda i spelet: de visas under Valt med den valda versionen (0 = förut-versionen
// behålls) och steget där de byggs in. När saken är inbyggd tas raden bort här och ur VAL, och dess dokument i samlingen 'val'
const BESLUT = {
  kista: { val: 1, steg: '5.1.8' }, lagereld: { val: 1, steg: '5.1.8' }, symboler: { val: 1, steg: '5.1.8' }, slojdbank: { val: 1, steg: '5.1.8' },
  slaktbank: { val: 1, steg: '5.1.8' }, portratt: { val: 1, steg: '5.2.3', text: 'Sparas som förebild till karaktärsgeneratorn.' },
};
const VALT = VAL.filter(s => BESLUT[s.id]);
for (const s of VALT) VAL.splice(VAL.indexOf(s), 1);
// en version ritas stor och i kartans storlek (två skärmpunkter per punkt, som i spelet)
function valBild(v, P) {
  const B = v.kol ? kolBild(v.w, v.h, P) : markBild(v.w, v.h, P);
  v.rita(B, P);
  const stor = document.createElement('canvas'), liten = document.createElement('canvas');
  tillCanvas(B, stor, 0); tillCanvas(B, liten, 0);
  const s = Math.max(2, Math.min(8, Math.floor(260 / v.w)));
  stor.style.width = v.w * s + 'px'; liten.style.width = v.w * 2 + 'px';
  stor.setAttribute('aria-label', 'Stor'); liten.setAttribute('aria-label', 'I kartans storlek');
  const d = document.createElement('div'); d.className = 'bilder'; d.append(stor, liten); return d;
}
// det valda, med versionen Björn valde och steget där det byggs in
function byggValt(P) {
  const lista = $('#valt'); lista.textContent = '';
  for (const s of VALT) {
    const b = BESLUT[s.id], v = b.val === 0 ? s.idag : s.versioner[b.val - 1];
    const f = document.createElement('figure'); f.className = 'alt';
    if (v.rita) f.append(valBild(v, P));
    const vilken = b.val === 0 ? 'Förut-versionen behålls' : s.typ === 'tre' ? 'Version ' + b.val : 'Ja';
    f.insertAdjacentHTML('beforeend', `<figcaption><b>${s.namn}</b>${vilken}. ${b.text || 'Byggs in i steg ' + b.steg + '.'}</figcaption>`);
    lista.append(f);
  }
}
const SVAR = {}; // det som finns sparat i databasen, per sak
let DB = null;
function byggVal(P) {
  const lista = $('#vallista'); lista.textContent = '';
  if (!VAL.length) { lista.innerHTML = '<p class="not">Inget att välja just nu.</p>'; return; }
  for (const s of VAL) {
    const kort = document.createElement('article'); kort.className = 'valkort'; kort.id = 'val-' + s.id;
    kort.innerHTML = `<header><span class="typ">${s.typ === 'tre' ? 'Ny sak · välj en av tre' : 'Görs om · ja eller nej'}</span><h3>${s.namn}</h3><p class="not">${s.vad}</p></header><div class="alternativ"></div><div class="svar" role="group" aria-label="Ditt val för ${s.namn}"></div><label>Kommentar: vad ska ändras?<textarea rows="3" placeholder="Till exempel: nej, gör locket mörkare och låset större"></textarea></label><div class="sparat" aria-live="polite"></div>`;
    const alt = kort.querySelector('.alternativ');
    if (s.idag) {
      const f = document.createElement('figure'); f.className = 'alt idag';
      if (s.idag.rita) f.append(valBild(s.idag, P));
      else { const t = document.createElement('div'); t.className = 'emojilista'; t.innerHTML = `<span>${s.idag.text}</span>`; f.append(t); }
      f.insertAdjacentHTML('beforeend', `<figcaption><b>${s.idagText ? 'Förut' : 'I dag'}</b>${s.idagText || 'Som spelet ritar den nu.'}</figcaption>`); alt.append(f);
    }
    s.versioner.forEach((v, i) => {
      const f = document.createElement('figure'); f.className = 'alt';
      f.append(valBild(v, P));
      f.insertAdjacentHTML('beforeend', `<figcaption><b>${s.typ === 'tre' ? 'Version ' + (i + 1) : 'Ny'}</b>${v.text}</figcaption>`); alt.append(f);
    });
    const knappar = s.typ === 'tre' ? s.versioner.map((_, i) => [String(i + 1), 'Version ' + (i + 1)]).concat([['nej', 'Ingen']]) : [['ja', 'Ja'], ['nej', 'Nej']];
    kort.querySelector('.svar').innerHTML = knappar.map(([v, t]) => `<button type="button" data-svar="${v}" data-sak="${s.id}"${v === 'nej' ? ' class="nej"' : ''}>${t}</button>`).join('');
    const ta = kort.querySelector('textarea'); ta.dataset.sak = s.id;
    ta.addEventListener('change', () => spara(s.id, { kommentar: ta.value.trim() }));
    lista.append(kort);
  }
  visaSvar();
}
function visaSvar() {
  for (const s of VAL) {
    const kort = $('#val-' + s.id); if (!kort) continue;
    const d = SVAR[s.id] || {};
    kort.querySelectorAll('[data-svar]').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.svar === d.svar)); b.disabled = !DB; });
    const ta = kort.querySelector('textarea'); ta.disabled = !DB;
    if (document.activeElement !== ta) ta.value = d.kommentar || '';
    kort.classList.toggle('svarat', !!d.svar);
    kort.querySelector('.sparat').textContent = d.svar ? `Sparat: ${d.svar === 'ja' ? 'ja' : d.svar === 'nej' ? 'nej' : 'version ' + d.svar}${d.kommentar ? ', med kommentar' : ''}.` : '';
  }
}
// ett dokument per sak i samlingen 'val': { svar: '1' | '2' | '3' | 'ja' | 'nej', kommentar, nar }
async function spara(id, andring) {
  if (!DB) return;
  const nytt = { ...(SVAR[id] || {}), ...andring, nar: new Date().toISOString() };
  SVAR[id] = nytt; visaSvar();
  try { await DB.doc('val/' + id).set(nytt); }
  catch (e) { const k = $('#val-' + id + ' .sparat'); if (k) k.textContent = 'Kunde inte spara. Har du rätt att ändra sidan?'; }
}
async function startaVal() {
  document.addEventListener('click', e => {
    const b = e.target.closest('button[data-svar]'); if (!b) return;
    const ta = $('#val-' + b.dataset.sak + ' textarea');
    spara(b.dataset.sak, { svar: b.dataset.svar, kommentar: ta ? ta.value.trim() : '' });
  });
  const status = $('#valstatus');
  status.textContent = 'Ansluter till sidans databas …';
  try { DB = await window.claude?.use?.('db'); } catch (e) { DB = null; }
  if (!DB) { status.textContent = 'Valen går bara att göra när sidan är öppen i Claude och du är inloggad.'; visaSvar(); return; }
  status.textContent = 'Ditt val sparas direkt.';
  DB.collection('val').onSnapshot(snap => {
    for (const k of Object.keys(SVAR)) delete SVAR[k];
    snap.docs.forEach(d => { if (d.exists) SVAR[d.id] = d.data(); });
    visaSvar();
  }, () => { status.textContent = 'Kontakten med databasen bröts. Ladda om sidan.'; });
  visaSvar();
}
function bygg() {
  $('#folk').innerHTML = PERSONER.map((p, i) => `
    <figure class="person">
      <canvas id="por${i}" class="portratt" aria-label="Porträtt av ${p.namn}"></canvas>
      <div class="pfig"><canvas id="fig${i}" aria-label="${p.namn} på kartan"></canvas><figcaption><b>${p.namn}</b>${p.text}</figcaption></div>
    </figure>`).join('');
  $('#symboler').innerHTML = SYMBOLER.map((s, i) => `<figure><canvas id="sym${i}" width="8" height="8" aria-label="${s.namn}"></canvas><figcaption><em>${s.ers}</em>${s.namn}</figcaption></figure>`).join('');
  document.addEventListener('click', e => {
    const b = e.target.closest('button[data-tid]'); if (!b) return;
    lage.tid = b.dataset.tid; ritaHuvud();
  });
  ritaIdag($('#idag'));
  ritaForslag($('#forslag'), PAL);
  ritaHuvud();
  ritaFolket(PAL);
  ritaBankerna(PAL);
  ritaPalett(PAL);
  ritaPanel(PAL);
  SYMBOLER.forEach((s, i) => ritaSymbol($('#sym' + i), s, PAL));
  byggValt(PAL);
  byggVal(PAL);
  startaVal();
  addEventListener('resize', () => heltalsskala($('#huvud'), SC.W));
}
bygg();
