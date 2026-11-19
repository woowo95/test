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
// en symbol på en knapp: 24 × 24 punkter i panelens färg med en ram, och bilden (16 × 16, färgerna i L) i mitten
const symbolKnapp = (text, rader, L) => ({ text, w: 24, h: 24, rita: (B) => {
  const bg = B.P.i('kol', 1), ram = B.P.i('kol', 2);
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) B.satt(x, y, bg);
  for (let i = 0; i < 24; i++) { B.satt(i, 0, ram); B.satt(i, 23, ram); B.satt(0, i, ram); B.satt(23, i, ram); }
  ritaSprite(B, rader, L, 4, 4);
} });

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
  const H = (opt && opt.lagor) || [2, 4, 7, 9, 6, 4, 2]; // lågornas höjd; animationerna (anim.js) ger andra per ruta
  H.forEach((hh, k) => {
    const x = cx - 3 + k;
    for (let j = 0; j < hh; j++) {
      const f = j / hh, y = cy - j;
      const v = f > 0.75 ? P.i('rost', 2) : f > 0.45 ? P.i('senap', 2) : (k >= 2 && k <= 4 && j < 3) ? P.i('ben', 3) : P.i('senap', 3);
      B.satt(x, y, v, true);
    }
  });
  if (!(opt && opt.lagor)) { B.satt(cx - 1, cy - 10, P.i('rost', 1), true); B.satt(cx + 2, cy - 8, P.i('rost', 2), true); }
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
  const saker = ['bar', 'rotter', 'kott', 'kanin', 'fisk', 'abborre', 'svamp', 'spindling', 'ved', 'grenar', 'torrgras', 'kol', 'flinta', 'sten', 'yxa', 'rep', 'ben', 'kniv', 'skinn', 'vargskinn', 'rock_kaninskinn', 'rock_vargskinn', 'skor_kaninskinn', 'skor_vargskinn', 'balte_rep', 'grillfisk', 'torrkott', 'metspo', 'fiskespjut', 'bensyl', 'korg'].filter(k => IKONER.PIX[k]);
  const kol = 7, S = kolBild(kol * 9 + 1, Math.ceil(saker.length / kol) * 9 + 1, P);
  saker.forEach((k, j) => ritaIkon(S, k, 1 + (j % kol) * 9, 1 + Math.floor(j / kol) * 9));
  tillCanvas(S, $('#pk'), 0);
  for (const [id, tid] of [['#pd', 'dag'], ['#pn', 'natt'], ['#pi', 'istid']]) tillCanvas(ritaScen(P, { tid }), $(id), 0);
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

// ---------- Björns önskemål efter v245 (steg 4.5.2): nya versioner räknade punkt för punkt ----------
// figur(f) ger rader W × H: f(satt) fyller, och med kant läggs en mörk kontur ('o') runt det som fyllts; efter(satt) ritas ovanpå
function punkter(f, { kant = true, W = 16, H = 16, efter } = {}) {
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const satt = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
  f(satt);
  const ut = g.map(r => [...r]);
  if (kant) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const c = g[y + dy]?.[x + dx]; return c && c !== '.' && c !== 'z'; })) ut[y][x] = 'o';
  if (efter) efter((x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < W && y >= 0 && y < H) ut[y][x] = c; });
  return ut.map(r => r.join(''));
}
// en rund sak: ljus uppe till vänster och mörk nere till höger
function klot(satt, cx, cy, r, [mork, mitt, ljus], ry = r) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
    const u = (x - cx) / r, v = (y - cy) / ry; if (u * u + v * v > 1.05) continue;
    satt(x, y, u + v < -0.7 ? ljus : u + v > 0.6 ? mork : mitt);
  }
}
const linje = (satt, pts, c) => { for (let i = 1; i < pts.length; i++) { const [a, b] = [pts[i - 1], pts[i]], n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); for (let k = 0; k <= n; k++) satt(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, c); } };
// en spelare: den vanliga kartfiguren (14 × 20 punkter, karaktärsgeneratorn i skapare.js) med fötterna på raden fot, vänd
// åt höger eller vänster efter hur den lutar eller vilket lag den hör till. Personerna ritas som de brukar, inte på ett nytt
// sätt för sporten (Björn efter v287); bara sportens saker är nya. Utan skaparen (innan den laddats) ritas inget
let SPELARE_N = 0;
function spelare(B, x, fot, luta, lag, arm = 'hanga', ben = 'sta') {
  if (!window.BYBO) return;
  const vast = luta > 0 || lag === 'skiffer', F = window.BYBO(1000 + (SPELARE_N++ % 40) * 7919, vast ? 'vast' : 'sida', ben, arm);
  for (let y = 0; y < F.h; y++) for (let dx = 0; dx < F.w; dx++) { const v = F.px[y * F.w + dx]; if (v >= 0) B.satt(Math.round(x) - (F.w >> 1) + dx, fot - F.h + 1 + y, v); }
  for (let dx = -3; dx <= 3; dx++) B.morka(Math.round(x) + dx + 1, fot + 1);
}
const VAL = [
  // sporterna och dragkampen (4.5.6.10–4.5.6.11) är inbyggda i spelet (5.5.2, v373) och borttagna ur valdelen
];
// Björns val som är bestämda men inte inbyggda i spelet: de visas under Valt med den valda versionen (0 = förut-versionen
// behålls) och steget där de byggs in. När saken är inbyggd tas raden bort här och ur VAL, och dess dokument i samlingen 'val'
const BESLUT = {
};
// räknas när valdelen ritas, så att korten från filerna efter denna (mark.js, djur.js, gui.js) också kommer med
const VALT = [];
function delaVal() { for (const s of VAL.filter(s => BESLUT[s.id])) { VALT.push(s); VAL.splice(VAL.indexOf(s), 1); } }
// en version ritas stor och i kartans storlek (två skärmpunkter per punkt, som i spelet)
// en animation (steg 5.2.4.8): rutor är hur många bilder, takt millisekunder per bild och rita(B, P, ruta) ritar en av dem.
// En klocka för hela sidan byter bild på alla kort som syns; kort som byggts om (inte längre på sidan) släpps
const ANIM = [];
setInterval(() => {
  const nu = performance.now();
  for (let i = ANIM.length - 1; i >= 0; i--) {
    const a = ANIM[i]; if (!a.c[0].isConnected) { if (a.sedd) ANIM.splice(i, 1); continue; }
    a.sedd = true; if (nu - a.t < (a.v.takt || 250)) continue;
    a.t = nu; a.ruta = (a.ruta + 1) % a.v.rutor; const B = a.ny(); a.v.rita(B, a.P, a.ruta); a.c.forEach(c => tillCanvas(B, c, 0));
  }
}, 40);
function valBild(v, P) {
  const ny = () => v.kol ? kolBild(v.w, v.h, P) : markBild(v.w, v.h, P), B = ny();
  v.rita(B, P, 0);
  const anim = c => { if (v.rutor > 1) ANIM.push({ v, P, ny, c, ruta: 0, t: performance.now() }); };
  if (v.stor) { // en stor scen (marken och träden, 5.2.4.5): en bild över hela kortets bredd, i jämna skalor
    const c = document.createElement('canvas'); tillCanvas(B, c, 0); c.className = 'scen'; c.style.width = v.w * 3 + 'px'; c.setAttribute('aria-label', 'Scenen');
    const d = document.createElement('div'); d.className = 'bilder'; d.append(c);
    const ut = [c];
    if (v.liten) { const l = document.createElement('canvas'); tillCanvas(B, l, 0); l.style.width = v.w + 'px'; l.setAttribute('aria-label', 'I kartans storlek'); d.append(l); ut.push(l); }
    anim(ut); return d;
  }
  const stor = document.createElement('canvas'), liten = document.createElement('canvas');
  tillCanvas(B, stor, 0); tillCanvas(B, liten, 0);
  const s = Math.max(2, Math.min(8, Math.floor(260 / v.w)));
  stor.style.width = v.w * s + 'px'; liten.style.width = v.w * 2 + 'px';
  stor.setAttribute('aria-label', 'Stor'); liten.setAttribute('aria-label', 'I kartans storlek');
  anim([stor, liten]);
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
// att rita på ett förslag (Björn 2026-11-04): versionen ritas utan bakgrund (bara det som är nytt; scenerna har sin mark
// kvar) och öppnas i ritaren. Det sparade visas på kortet som Din ritning, och Claude läser det i samlingen ritningar
function ritaKnapp(s, v, i, P) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'rita-pa'; b.textContent = '✏️';
  const namn = s.namn + (s.versioner.length > 1 ? ', version ' + (i + 1) : '');
  b.title = 'Rita på ' + namn; b.setAttribute('aria-label', b.title);
  b.onclick = () => {
    if (!window.RITA_PA) return;
    const B = Bild(Math.min(128, v.w), Math.min(128, v.h), P); v.rita(B, P, 0);
    window.RITA_PA({ w: B.w, h: B.h, px: Array.from(B.px) }, 'val:' + s.id + ':' + (i + 1), namn);
  };
  return b;
}
let SISTA_RITNINGAR = null;
window.VAL_RITNINGAR = ritningar => {
  SISTA_RITNINGAR = ritningar;
  document.querySelectorAll('#vallista figure.din').forEach(f => f.remove());
  for (const [id, r] of Object.entries(ritningar)) {
    const m = /^val:([^:]+):(\d+)$/.exec(r.fran || ''); if (!m || !window.RITA_BILD) continue;
    const alt = document.querySelector('#val-' + m[1] + ' .alternativ'); if (!alt) continue;
    const bild = window.RITA_BILD(r), B = Bild(bild.w, bild.h, PAL); bild.px.forEach((v, k) => { B.px[k] = v; });
    const f = document.createElement('figure'); f.className = 'alt din';
    f.append(valBild({ w: B.w, h: B.h, rita: (D) => { for (let k = 0; k < B.px.length; k++) if (B.px[k] >= 0) D.px[k] = B.px[k]; } }, PAL));
    const cap = document.createElement('figcaption'); cap.innerHTML = '<b>Din ritning</b>'; cap.append('Efter version ' + m[2] + (r.kommentar ? ': ' + r.kommentar : '.'));
    f.append(cap); alt.append(f);
  }
};
const SVAR = {}; // det som finns sparat i databasen, per sak
let DB = null;
function byggVal(P) {
  const lista = $('#vallista'); lista.textContent = '';
  if (!VAL.length) { lista.innerHTML = '<p class="not">Inget att välja just nu.</p>'; return; }
  for (const s of VAL) {
    const kort = document.createElement('article'); kort.className = 'valkort' + (s.stor ? ' stor' : ''); kort.id = 'val-' + s.id;
    kort.innerHTML = `<header><span class="typ">${s.typ === 'tre' ? 'Ny sak · välj en av ' + (['', 'en', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta'][s.versioner.length] || s.versioner.length) : 'Görs om · ja eller nej'}</span><h3>${s.namn}</h3><p class="not">${s.vad}</p></header><div class="alternativ"></div><div class="svar" role="group" aria-label="Ditt val för ${s.namn}"></div><label>Kommentar: vad ska ändras?<textarea rows="3" placeholder="Till exempel: nej, gör locket mörkare och låset större"></textarea></label><div class="sparat" aria-live="polite"></div>`;
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
      f.insertAdjacentHTML('beforeend', `<figcaption><b>${s.typ === 'tre' ? 'Version ' + (i + 1) : 'Ny'}</b>${v.text}</figcaption>`);
      f.append(ritaKnapp(s, v, i, P)); alt.append(f);
    });
    const knappar = s.typ === 'tre' ? s.versioner.map((_, i) => [String(i + 1), 'Version ' + (i + 1)]).concat([['nej', 'Ingen']]) : [['ja', 'Ja'], ['nej', 'Nej']];
    kort.querySelector('.svar').innerHTML = knappar.map(([v, t]) => `<button type="button" data-svar="${v}" data-sak="${s.id}"${v === 'nej' ? ' class="nej"' : ''}>${t}</button>`).join('');
    const ta = kort.querySelector('textarea'); ta.dataset.sak = s.id;
    ta.addEventListener('change', () => spara(s.id, { kommentar: ta.value.trim() }));
    lista.append(kort);
    // kontrollerna och sammanhanget (kontroll.js), samma för allt som ritas, oavsett varifrån
    if (window.KONTROLL) setTimeout(() => window.KONTROLL.visa(s, kort, P), 0);
  }
  visaSvar();
  if (SISTA_RITNINGAR) window.VAL_RITNINGAR(SISTA_RITNINGAR);
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
  document.addEventListener('click', e => {
    const b = e.target.closest('button[data-tid]'); if (!b) return;
    lage.tid = b.dataset.tid; ritaHuvud();
  });
  ritaHuvud();
  ritaPalett(PAL);
  ritaPanel(PAL);
  // valdelen ritas när skaparen laddats, så att folket på korten är de vanliga kartfigurerna (window.BYBO)
  const val = () => { delaVal(); byggValt(PAL); byggVal(PAL); startaVal(); };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', val); else val();
  addEventListener('resize', () => heltalsskala($('#huvud'), SC.W));
}
bygg();
