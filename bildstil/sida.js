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

// ---------- i dag mot förslaget ----------
const Z = 6;

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
const LED_M = (p, l) => ({ w: 74, h: 52, kol: true, rita: (B, P) => { ritaSprite(B, p, { o: 'kol0', ...l }, 3, 3); ritaSprite(B, p.flatMap(r => { const rr = [...r].map(c => c.repeat(3)).join(''); return [rr, rr, rr]; }), { o: 'kol0', ...l }, 22, 2); } });
// grillen i fler varianter (Björn efter v193: "Prova fler varianter", steg 3.10.13): 48 × 32 punkter (tre rutor), mörk kant och skugga under fötterna
function grillStil(stil, kontur = true) {
  const W = 48, H = 32, fot = 27, sy = stil === 'kors' ? 6 : 4, g = Array.from({ length: H }, () => Array(W).fill('.'));
  const satt = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
  const fotter = [];
  for (let x = 3; x <= 44; x++) { satt(x, sy, 'O'); satt(x, sy + 1, 'L'); }
  for (const px of stil === 'kors' ? [10, 37] : [9, 38]) {
    if (stil === 'kors') {
      for (let y = sy - 4; y <= fot; y++) { const d = (y - sy - 1) * 0.3; satt(Math.round(px - d), y, 'w'); satt(Math.round(px - d) + 1, y, 'W'); satt(Math.round(px + 1 + d), y, 'W'); satt(Math.round(px + 1 + d) - 1, y, 'w'); }
      for (const fx of [Math.round(px - (fot - sy - 1) * 0.3) - 1, Math.round(px + 1 + (fot - sy - 1) * 0.3) - 1]) { for (let dx = 0; dx < 4; dx++) { satt(fx + dx, fot, dx % 3 ? 'S' : 's'); satt(fx + dx, fot - 1, dx % 3 ? 'S' : 's'); } fotter.push(fx + 1); }
    } else {
      for (let y = stil === 'rep' ? sy - 2 : sy + 2; y <= fot; y++) { satt(px, y, 'w'); satt(px + 1, y, y % 3 ? 'W' : 'w'); }
      if (stil === 'klyka') for (const [y, d] of [[sy + 1, 1], [sy, 1], [sy - 1, 2], [sy - 2, 2]]) { satt(px - d, y, 'w'); satt(px + 1 + d, y, 'W'); }
      if (stil === 'rep') { for (const y of [sy - 1, sy + 2]) for (let x = px - 1; x <= px + 2; x++) satt(x, y, 'r'); for (let dx = -3; dx <= 4; dx++) for (let y = fot - 2 + (Math.abs(dx - 0.5) > 2.5); y <= fot; y++) satt(px + dx, y, dx < 0 ? 's' : 'S'); }
      fotter.push(px);
    }
  }
  if (stil === 'klyka') { for (let y = sy + 1; y <= sy + 5; y++) satt(44, y, 'w'); for (let x = 44; x <= 46; x++) satt(x, sy + 5, 'q'); }
  if (stil === 'rep') { for (let y = sy + 2; y <= sy + 5; y++) satt(23, y, 'q'); satt(24, sy + 5, 'q'); satt(25, sy + 4, 'q'); }
  if (stil === 'kors') { satt(44, sy + 1, 'w'); satt(44, sy + 2, 'w'); satt(45, sy + 2, 'q'); }
  const ut = g.map(r => [...r]);
  if (kontur) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (g[y + dy]?.[x + dx] ?? '.') !== '.')) ut[y][x] = 'o';
  for (const fx of fotter) for (let dx = -3; dx <= 4; dx++) for (const y of [fot + 1, fot + 2]) if (ut[y][fx + dx] === '.') ut[y][fx + dx] = 'z';
  return ut.map(r => r.join(''));
}
const GRILL_L = { o: 'kol0', w: 'jord1', W: 'jord2', L: 'jord0', O: 'jord3', q: 'jord1', s: 'skiffer1', S: 'skiffer2', r: 'senap2', z: 'skugga' };
const SIKTA_BAGE = ['.ww...aa', '..aww.aa', '...a.w..', '....a.w.', '...a.aw.', '..a...aw', 'aa.....w', 'aa......'];
const SMYG_SPAR = ['....w.w.', '....www.', '....www.', '.....w..', 'w.w.....', 'www.....', 'www.....', '.w......'];
const SMYG_KRYP = ['........', '........', '......ww', '......ww', '.wwwwww.', 'w.w..w.w', '........', 'aaaaaaaa'];
const SMYG_TA = ['.....ww.', '.....ww.', '....ww..', '...www.w', '..w.ww..', '...w..w.', '..w....w', '.w......'];
// jaktens och kaninernas nya symboler (Björn efter v159), 8 × 8 punkter som de andra symbolerna i spelet: till vänster i rätt
// storlek, till höger fyra gånger större
const SYM8_M = (p, l) => ({ w: 48, h: 38, kol: true, rita: (B, P) => { ritaSprite(B, p, l, 2, 2); ritaSprite(B, p.flatMap(r => { const rr = [...r].map(c => c.repeat(4)).join(''); return [rr, rr, rr, rr]; }), l, 13, 3); } });
const AKT_L = { w: 'ben3', a: 'skiffer3' }, KANIN_L = { b: 'jord2', B: 'jord3', w: 'ben3', k: 'kol0', r: 'rost2', y: 'senap3' };
// torkan och den torra sjöbottnen (steg 3.8.2)
const TK_L = { o: 'kol0', y: 'senap2', Y: 'senap3', r: 'rost2', j: 'jord2', J: 'jord3', k: 'jord0', v: 'skiffer2', V: 'skiffer3', g: 'oliv1', G: 'oliv2', b: 'jord1' };
// Eldsvådan (steg 3.8.5): lågorna på en ruta som brinner
const BR_L = { r: 'rost1', R: 'rost2', y: 'senap2', Y: 'senap3', k: 'kol1', s: 'skiffer2', S: 'skiffer1', g: 'oliv1' };
const BR_TUNGOR = ['.......o........', '......oRo.......', '......oRo...o...', '..o..oRYRo.oRo..', '.oRo.oRYRo.oRo..', '.oRRooRYYRooRRo.', 'oRYRooRYYRooRYRo', 'oRYRRoRYYYRoRYRo', 'oRYYRRYYYYRRYYRo', 'oRYYYRYYYYRYYYRo', '.oRYYYYYYYYYYRo.', '.orRYYYYYYYYRro.', '..orRRYYYYRRro..', '..okrrRRRRrrko..', '.okkkkkkkkkkkko.', '..oooooooooooo..'];
const BR_ROK = ['.....sSs........', '....sSSSs..s....', '.....sSs..sSs...', '.......o...s....', '......oRo.......', '.....oRRRo......', '.....oRYRo..o...', '....oRYYRo.oRo..', '...oRRYYYRooRo..', '...oRYYYYYRRRo..', '..oRYYYYYYYRYRo.', '..oRYYYYYYYYYRo.', '..orRYYYYYYYRro.', '...orRRYYYRRro..', '...okrrRRRrrko..', '....oooooooooo..'];
const BR_GRAS = ['................', '................', '................', '................', '...o.......o....', '..oRo..o..oRo...', '..oRo.oRo.oRo.o.', '.oRYRooRo.oYRoRo', '.oRYRoRYRooYRoRo', 'goRYYRYYRoRYYRRo', 'goRYYYYYYRYYYYRo', 'gorRRYYYRRRYYRro', '.okrrRRRrrrRRrko', 'g.oykoykkoykkyo.', 'gg.oooooooooooo.', '................'];
// Tornadon (steg 3.8.4): symbolen i kalendern och tornadon på kartan (32 × 48 punkter, 2 × 3 rutor)
const TN_L = { o: 'kol0', g: 'skiffer2', G: 'ben2', d: 'jord1', D: 'ben3', k: 'kol1', K: 'kol2', l: 'oliv1', j: 'jord2', J: 'jord3' };
const TN_KART_M = p => ({ w: 104, h: 100, rita: (B, P) => { ritaSprite(B, p, TN_L, 2, 50); ritaSprite(B, p.flatMap(r => { const rr = [...r].map(c => c.repeat(2)).join(''); return [rr, rr]; }), TN_L, 38, 2); } });
// kulturen i fas 4 (steg 4.3.1, 4.3.2 och 4.3.4): tre förslag på varje ny sak. Färgerna: trä (a–e), lera och rödockra
// (r, R, T, t), rep och gräs (s, S, y), ben och skinn (w, W, v), sten (g, G, h), blad (n, L) och skuggan på marken (z)
const SCEN_HOJD = ["..........................", ".oooooooooooooooooooooooo.", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbaaabeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbaaabeccbo", "oaaabeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbaaabeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbaaabo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbaaabeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbaaabeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbaaabeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oaaabeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbaaabeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbaaabeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbaaabo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oeccbeccbeccbeccbeccbeccbo", "oaaaaaaaaaaaaaaaaaaaaaaaao", "obbbbbbbbbbbbbbbbbbbbbbbbo", "obbbbbbbbbbbbbbbbbbbbbbbbo", ".ooooeeeeeoooeeeeeooooooo.", "....occccco.occccco.......", ".....ooooo...ooooo........"];
const KULT_L = { a: 'jord0', b: 'jord1', c: 'jord2', e: 'jord3', r: 'rost0', R: 'rost1', t: 'rost2', T: 'rost3', s: 'senap1', S: 'senap2', y: 'senap3', w: 'ben1', W: 'ben2', v: 'ben3', k: 'kol1', g: 'skiffer1', G: 'skiffer2', h: 'skiffer3', n: 'barr1', L: 'oliv2', z: 'skugga' };
const KULT = {"boll": [{"text": "En boll av sytt läder, brun med söm i kors.", "rader": ["................", ".....oooooo.....", "....oeeaecco....", "...oeeeecccco...", "..oeeeeaccccco..", "..oeeeccccccco..", ".oeeeccaccccbbo.", ".oeacacacacabao.", ".oeccccaccbbbbo.", "..occccccbbbbo..", "..occccabbbbbo..", "...occcbbbbbo...", "....ocbabbbo....", ".....oooooo.....", "....zzzzzzzzzz..", ".......zzzz....."]}, {"text": "En boll av flätat torrgräs, gul med ett rutigt mönster.", "rader": ["................", ".....oooooo.....", "....oyssySso....", "...oyyssSsSso...", "..oyssySsSSsso..", "..oyssSsSssSSo..", ".ossySsSSssSsso.", ".ossSsSssSSssso.", ".oySsSSssSsssso.", "..osSssSSsssso..", "..oSSssSssssso..", "...osSSssssso...", "....oSssssso....", ".....oooooo.....", "....zzzzzzzzzz..", ".......zzzz....."]}, {"text": "En ljus boll av kaninskinn med en röd rand runt.", "rader": ["................", ".....oooooo.....", "....ovvvvWWo....", "...ovvvvWWWWo...", "..ovvvvWWWWWWo..", "..ovvvWWWWWWWo..", ".ovvvWWWWWWWwwo.", ".oTTTRRRRRRRRRo.", ".oTTTRRRRRRRRRo.", "..oWWWWWWwwwwo..", "..oWWWWWwwwwwo..", "...oWWWwwwwwo...", "....oWwwwwwo....", ".....oooooo.....", "....zzzzzzzzzz..", ".......zzzz....."]}], "slagtra": [{"text": "Ett slätt slagträ av trä som blir tjockare mot änden, med rep lindat kring handtaget.", "rader": ["................", "...........oo...", "..........oeeo..", ".........oeecbo.", ".........oecbbo.", "........oecbbo..", ".......oecboo...", "......oecbo.....", ".....oecbo......", "....oecbo.......", "...oSsbo........", "..osSSo.........", ".oSsso..........", ".osSo...........", "..oo............", ".zzzzzzzzzzzzz.."]}, {"text": "En knotig gren med en tung klubba i änden, som den är från skogen.", "rader": ["................", "...........oo...", "..........ocao..", ".........occbao.", "........oacbbao.", ".......occabao..", ".......ocbbao...", "......ocbbao....", ".....ocbboo.....", "....ocbbo.......", "...ocbbo........", "..ocbbo.........", ".ocbbo..........", ".obbo...........", "..oo............", ".zzzzzzzzzzzzz.."]}, {"text": "Ett platt slagträ som en paddel, ljust trä med en röd ring och rep kring handtaget.", "rader": ["...........o....", "..........ovo...", ".........ovveo..", "........ovveeeo.", ".......ovveeecco", "......ovteeecco.", ".....ovvetecco..", "....ovveeetco...", ".....oeeecco....", "....oeeecco.....", "...oSseoco......", "..osSSo.o.......", ".oSsso..........", ".osSo...........", "..oo............", ".zzzzzzzzzzzzz.."]}], "mal": [{"text": "En ring av böjda grenar, bunden med rep, på en påle.", "rader": ["......oooo......", "....ooeeScoo....", "...oSeeooccSo...", "...oeoo..ooco...", "..oeeo....ocbo..", "..oeo......obo..", "..oSo......oSo..", "..occo....obbo..", "...ocoo..oobo...", "...occcoobbbo...", "....oobbSboo....", "......ocbo......", "......ocbo......", "......ocbo......", "......ocbo......", ".....zocbozz...."]}, {"text": "Två stolpar med en ribba över och ett nät av rep emellan.", "rader": ["................", "..oooooooooooo..", ".oeeeeeeeeeeeeo.", ".occcccccccccco.", ".oSSwwowwowwSSo.", ".ocbww.ww.wwcbo.", ".ocbo.w..w.ocbo.", ".ocbww.ww.wwcbo.", ".ocbww.ww.wwcbo.", ".ocbo.w..w.ocbo.", ".ocbww.ww.wwcbo.", ".ocbww.ww.wwcbo.", ".ocbo.w..w.ocbo.", ".ocbww.ww.wwcbo.", ".ocbo......ocbo.", ".zoozzzzzzzzoozz"]}, {"text": "Ett skinn spänt i en ring av trä, med en röd prick och en röd ring att sikta på, på en påle.", "rader": [".....oooooo.....", "....oeeeecco....", "...oeevvvWcco...", "..oeevttttWcco..", "..oevtvWWWtWco..", ".oeevtWRRWtWbbo.", ".oevvWRRRRWwwbo.", ".oecWtWRRWtwbbo.", "..ocWtWWWwtwbo..", "..occWttttwbbo..", "...occWwwwbbo...", "....ocbbbbbo....", ".....oocboo.....", "......ocbo......", "......ocbo......", ".....zocbozz...."]}], "trumma": [{"text": "En hög trumma av trä med ett ljust skinn över och snören av rep i sicksack runt.", "rader": ["................", "......oooo......", "...ooovWWWooo...", "..ovvvvWWWWWWo..", "..ovvvvWWWWWWo..", "..oSecvWWWcbbo..", "..ocScccScSbbo..", "..oceScScccSbo..", "..ocecSccccbSo..", "..oceScScccSbo..", "..ocScccScSbbo..", "..oSeccccScbbo..", "..ocScccScSbbo..", "..oceScScccSbo..", "..oaaaaaaaaaao..", "...ooooooooooz.."]}, {"text": "En flat trumma som ett skinn i en ram av trä, och en käpp med ett benhuvud att slå med.", "rader": ["................", "....oooooo......", "...occcbbbo.....", "..ocvvvWWWbo....", ".ocvvvWWWWWbo...", ".ocvvWWRWWWbo...", "ocvvWWWWWWWwbo..", "ocvWWWWRWWwwbo..", "ocWWWWWWWwwwbWoo", ".ocWWWWRwwwboWWW", ".ocWWWWwwwwbccWo", "..ocWWwwwwbocoo.", "...occcbbboco...", "....oooooocco...", ".........oco....", "...zzzzzzzozz..."]}, {"text": "En urholkad stock med en spricka på ovansidan, och två pinnar att slå på den med.", "rader": ["......o..o......", ".....ocooco.....", "....occoocco....", "...occo..occo...", "...oco....oco...", "..oco......oco..", ".oooooooooooooo.", "oeeeeeeeeeeeeeeo", "oecckkkkkkkkccco", "oecckkkkkkkkccco", "occcccccccccccco", "ocbbbbbbbbbbbbbo", "ocaaaaaaaaaaaaao", ".oooooooooooooo.", ".zzzzzzzzzzzzzzz", "................"]}], "benflojt": [{"text": "Ett ljust ben på snedden med tre hål och knutiga ändar, som det är.", "rader": ["................", "............oo..", "...........oWWo.", "..........ovwWo.", ".........ovwwo..", "........ovkwo...", ".......ovwwo....", "......ovkwo.....", ".....ovwwo......", "....ovkwo.......", "...ovwwo........", "..ovwwo.........", ".oWwwo..........", ".oWWo...........", "..oo............", "..zzzzzzzzzzzzz."]}, {"text": "En panflöjt: sex rör av ben, kortare och kortare, bundna ihop med rep.", "rader": ["................", "................", "..oooooooooooo..", ".okkkkkkkkkkkko.", ".ovwvwvwvwvwvwo.", ".ovwvwvwvwvwvwo.", ".ovwvwvwvwvwvwo.", ".oSSSSSSSSSSSSo.", ".osssssssssssso.", ".ovwvwvwvwvwvwo.", ".ovwvwvwvwvwoo..", ".ovwvwvwvwoo....", ".ovwvwvwoo......", ".ovwvwoo........", ".ovwoo..........", "..oozzzzzzzzz..."]}, {"text": "En rak flöjt av ben på tvären, med fyra hål och en röd rand vid varje ände.", "rader": ["................", "................", "................", "................", "................", "oo............oo", "WWooooooooooooWW", "WWvRvkvkvkvkRvWW", "WWwRwwwwwwwwRwWW", "WWooooooooooooWW", "oo............oo", ".....zzzzzzz....", ".....zzzzzzz....", "................", "................", "................"]}], "lyra": [{"text": "En fyrkantig ram av trä med en låda nertill och tre strängar av rep.", "rader": ["................", "...oooooooooo...", "..oeeeeeeeeeeo..", "..occcccccccco..", "..ocbyoyoyocbo..", "..ocby.y.yocbo..", "..ocby.y.yocbo..", "..ocby.y.yocbo..", "..ocby.y.yocbo..", "..ocby.y.yocbo..", "..ocby.y.yocbo..", "..ocbyoyoyocbo..", ".occcccccccccco.", ".obbbbbbbbbbbbo.", ".obbbbbbbbbbbbo.", "..oooooooooooo.."]}, {"text": "Två böjda horn som armar, en ribba av trä överst och en låda av skinn nertill.", "rader": ["....oo.....oo...", "...ovwo...ovwo..", "...ovwooooovwo..", "..occccccccccco.", "..ovwoyoyoyovwo.", "..ovwoy.y.yovwo.", ".ovwo.y.y.y.ovwo", ".ovwo.y.y.y.ovwo", "..ovwoy.y.yovwo.", "..ovwoyoyoyovwo.", "..ovwWyWywyovwo.", "..oWWWyWywywwo..", ".oWWWWWWwwwwwwo.", "..oWWWWWwwwwwo..", "...ooWWWwwwoo...", "....zoooooozz..."]}, {"text": "En trekantig ram av trä, som en liten harpa, med strängar som blir kortare och en röd tofs överst.", "rader": ["...oo...........", "..otto..........", "..occo..........", "..occco.........", "..ocbcco........", "..ocboyo........", "..ocboyco.......", "..ocboycyo......", "..ocboyoyco.....", "..ocboy.ycco....", "..ocboy.yoyco...", "..ocboyoyoycco..", "..occcccccccco..", "..obbbbbbbbbbo..", "...oooooooooo...", "..zzzzzzzzzzzzz."]}], "kruka": [{"text": "En rund kruka av rödbränd lera med en mörk rand av prickar runt magen.", "rader": ["................", "................", "................", ".....oooooo.....", "....orrrrrro....", "...oTRRRRRRRo...", "..oTTTTRRRRRRo..", "..oTTTRRRRRRro..", "..oTkRkRkRkrko..", "..okRkRkRkrkro..", "..oRRRRRRrrrro..", "..oRRRRRrrrrro..", "...oRRRrrrrro...", "....oRrrrrro....", ".....oooooo.....", "...zzzzzzzzzzz.."]}, {"text": "En hög kruka med smal hals, två öron och inristade ränder.", "rader": ["................", "......oooo......", ".....orrrro.....", ".....oTRRro.....", "...o.oTRRro.o...", "..oRoTTRRrroRo..", "..oRrrrrrrrrRo..", "..oRTTRRRRrrRo..", "..oTTTRRRRrrro..", "..oTTTRRRRrrro..", "...orrrrrrrro...", "...oTTRRRRrro...", "....oTTRRRro....", ".....oTRRro.....", "......oooo......", "......zzzzz....."]}, {"text": "En låg skål av lera med vita prickar och en kvist med blad och blommor i.", "rader": ["................", ".........o......", "......o.oyo.....", ".....oyo.oL.....", ".....Lo..L.L....", "....L.L.ono.....", ".....onono......", "......ono.......", "..ooooonoooooo..", ".oTTTTRRRRRrrro.", "..oTvTvRvRvrvo..", "...oTTRRRRRro...", "...oTTRRRRRro...", "....oTRRRRRo....", ".....oooooo.....", ".....zzzzzzz...."]}], "bonad": [{"text": "Ett ljust skinn på en käpp, med en röd romb och en mörk mitt, och fransar nertill.", "rader": [".oooooooooooooo.", "ocbbbbbbbbbbbbbo", ".oovWWWWWWWWwoo.", "..ovWWWRRWWWwo..", "..ovWWRWWRWWwo..", "..ovWRWWWWRWwo..", "..ovRWWkkWWRwo..", "..ovRWWkkWWRwo..", "..ovWRWWWWRWwo..", "..ovWWRWWRWWwo..", "..ovWWWRRWWWwo..", "..ovWWWWWWWWwo..", "..ovWWWWWWWWwo..", "..owowowowowo...", "..owowowowowo...", "...o.o.o.o.o...."]}, {"text": "Ett brunt skinn med en hjort målad i rödockra, som en hällristning, och fransar av rep.", "rader": [".oooooooooooooo.", "ocbbbbbbbbbbbbbo", ".oeccccccccccbo.", ".oeccctccctccbo.", ".oecccctctcccbo.", ".oecccccttcccbo.", ".oeccccctttccbo.", ".oecctttttcccbo.", ".oecttttttcccbo.", ".oecctccctcccbo.", ".oecctccctcccbo.", ".oeccccccccccbo.", ".oeccccccccccbo.", ".oSoSoSoSoSoSo..", ".oSoSoSoSoSoSo..", "..o.o.o.o.o.o..."]}, {"text": "En vävd bonad av rep i ränder av gult, rött och ljust, med tofsar nertill.", "rader": [".oooooooooooooo.", "ocbbbbbbbbbbbbbo", ".oosSSsSSsSSsoo.", "..osSSsSSsSSso..", "..orRRrRRrRRro..", "..orRRrRRrRRro..", "..owWWwWWwWWwo..", "..owWWwWWwWWwo..", "..osSSsSSsSSso..", "..osSSsSSsSSso..", "..orRRrRRrRRro..", "..orRRrRRrRRro..", "..owWWwWWwWWwo..", "..oSooSooSooSo..", "..oSooSooSooSo..", "...o..o..o..o..."]}], "vaggbrade": [{"text": "En hylla med en uddig kant och inristade märken, på två konsoler, med en liten kruka på.", "rader": ["................", "................", "......ooo.......", ".....oRRro......", "....oRRRrro.....", ".ooooRRRrrooooo.", "oeeeeeeeeeeeeeeo", "occcaccaccacccco", "obobobobobobobo.", ".obboo.o.o.obbo.", "..obo......obo..", "..obo......obo..", "...o....z...o...", "........z.......", "................", "................"]}, {"text": "Ett stående bräde med en sol inristad i mitten och prickar i ändarna.", "rader": ["....oooooooo....", "...oeccccccbo...", "...oecaccacbo...", "...oeccccccbo...", "...oeccccccbo...", "...oecaccacbo...", "...oeaccccabo...", "...oeacaacabo...", "...oeaccccabo...", "...oecaccacbo...", "...oeccccccbo...", "...oeccccccbo...", "...oeccccccbo...", "...oecaccacbo...", "...oeccccccbo...", "....oooooooo...."]}, {"text": "Ett bräde på tvären med snidade hästhuvuden i båda ändarna.", "rader": ["................", "................", "ooo..........ooo", "ecco........occe", "okco........ocko", "occoooooooooocco", ".obeeeeeeeeeebo.", ".obcacacacaccbo.", ".obbbbbbbbbbbbo.", "..oooboooobooo..", "....obo..obo....", ".....o....o.....", ".....zzzzzzz....", "................", "................", "................"]}], "scen": [{"text": "Golvet av stockar på längden, en kant av hela stockar framtill och två trappsteg ner mot publiken.", "rader": ["................................................", ".oooooooooooooooooooooooooooooooooooooooooooooo.", "oeeeeeeeeeeeeeeeeeeeeeeaeeeeeeeeeeeeeeeeeeeeeeao", "occccccccccccccccccccccaccccccccccccccccccccccao", "occccccccccccccccccccccaccccccccccccccccccccccao", "obbbbbbbbbbbbbbbbbbbbbbabbbbbbbbbbbbbbbbbbbbbbao", "oeeeeeeaeeeeeeeeeeeeeeeeeeeeeeaeeeeeeeeeeeeeeeeo", "occccccaccccccccccccccccccccccacccccccccccccccco", "occccccaccccccccccccccccccccccacccccccccccccccco", "obbbbbbabbbbbbbbbbbbbbbbbbbbbbabbbbbbbbbbbbbbbbo", "oeeeeeeeeeeeeeaeeeeeeeeeeeeeeeeeeeeeeaeeeeeeeeeo", "occcccccccccccaccccccccccccccccccccccaccccccccco", "occcccccccccccaccccccccccccccccccccccaccccccccco", "obbbbbbbbbbbbbabbbbbbbbbbbbbbbbbbbbbbabbbbbbbbbo", "oeeeeeeeeeeeeeeeeeeeeaeeeeeeeeeeeeeeeeeeeeeeaeeo", "occccccccccccccccccccaccccccccccccccccccccccacco", "occccccccccccccccccccaccccccccccccccccccccccacco", "obbbbbbbbbbbbbbbbbbbbabbbbbbbbbbbbbbbbbbbbbbabbo", "oeeeeaeeeeeeeeeeeeeeeeeeeeeeaeeeeeeeeeeeeeeeeeeo", "occccaccccccccccccccccccccccacccccccccccccccccco", "occccaccccccccccccccccccccccacccccccccccccccccco", "obbbbabbbbbbbbbbbbbbbbbbbbbbabbbbbbbbbbbbbbbbbbo", "oeeeeeeeeeeeaeeeeeeeeeeeeeeeeeeeeeeaeeeeeeeeeeeo", "occcccccccccaccccccccccccccccccccccaccccccccccco", "occcccccccccaccccccccccccccccccccccaccccccccccco", "obbbbbbbbbbbabbbbbbbbbbbbbbbbbbbbbbabbbbbbbbbbbo", "oaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaao", "obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo", "obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo", ".oooooooooooooooooeeeeeoooeeeeeoooooooooooooooo.", ".................occccco.occccco................", "..................ooooo...ooooo................."]}, {"text": "Golvet av kluvna stockar på tvären, och bakom en ribba på två stolpar med skinn som hänger ner som en fond.", "rader": ["..oooooooooooooooooooooooooooooooooooooooooooo..", ".obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo.", ".oaaoWrRRRRRwWWWWWrRRRRRwWWWWWrRRRRRwWWWWWroaao.", ".oaaoWrRRRRRwWWWWWrRRRRRwWWWWWrRRRRRwWWWWWroaao.", ".oaaoWrRRRRRwWWWWWrRRRRRwWWWWWrRRRRRwWWWWWroaao.", ".oaaoWoooooowWWWWWoooooowWWWWWoooooowWWWWWooaao.", "oeaaccbeccccbeccccbeccccbeccccbeccccbeccccbeaaco", "oeccccbeccccbeccccbeccccbeccccbeccccbeccccbeccco", "oeccccbeccccbeccccbeccccbeccccbeccccbeccccbeccco", "oeccccbeccccbeccccbeccccbeccccbeccccbeccccbeccco", "oeccccbeccccbeccccbeccccbeccccbeccccbeccccbeccco", "oeccccbeccccbeccccbeccccbeccccbeccccbeccccbeccco", "oeccccbeccccbeccccbeccccbeccccbeccccbeccccbeccco", "oeccccbeccccbeccccbeccccbeccccbeccccbeccccbeccco", "oeccccbeccccbeccccbeccccbeccccbeccccbeccccbeccco", "oeccccbeccccbeccccbeccccbeccccbeccccbeccccbeccco", "oeccccbeccccbeccccbeccccbeccccbeccccbeccccbeccco", "oeccccbeccccbeccccbeccccbeccccbeccccbeccccbeccco", "oeccccbeccccbeccccbeccccbeccccbeccccbeccccbeccco", "oeccccbeccccbeccccbeccccbeccccbeccccbeccccbeccco", "oeccccbeccccbeccccbeccccbeccccbeccccbeccccbeccco", "oeccccbeccccbeccccbeccccbeccccbeccccbeccccbeccco", "oeccccbeccccbeccccbeccccbeccccbeccccbeccccbeccco", "oeccccbeccccbeccccbeccccbeccccbeccccbeccccbeccco", "oeccccbeccccbeccccbeccccbeccccbeccccbeccccbeccco", "oeccccbeccccbeccccbeccccbeccccbeccccbeccccbeccco", "oeccccbeccccbeccccbeccccbeccccbeccccbeccccbeccco", "oaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaao", "obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo", "obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo", ".oooooooooooooooooooooooooooooooooooooooooooooo.", "................................................"]}, {"text": "Ett runt golv av kluvna stockar med en ring av stenar runt kanten.", "rader": ["................oooooooooooooooo................", "............ooooGgGGhGGgGGhGGgGGoooo............", "..........ooGhGGhGGhecccbecchGGhGGhGoo..........", "........ooGGhGGecccbecccbecccbeccgGGhGoo........", ".......ohGGhccbecccbecccbecccbecccbeGGhGo.......", ".....oogGGecccbecccbecccbecccbecccbeccGGhoo.....", "....oGhGGbecccbecccbecccbecccbecccbeccchGGho....", "...oGgGGcbecccbecccbecccbecccbecccbecccbGgGGo...", "..oGhGcccbecccbecccbecccbecccbecccbecccbecGhGo..", "..ogGGcccbecccbecccbecccbecccbecccbecccbechGGo..", ".ohGGecccbecccbecccbecccbecccbecccbecccbeccGhGo.", ".oGGbecccbecccbecccbecccbecccbecccbecccbecccGGo.", "oGGhbecccbecccbecccbecccbecccbecccbecccbecccGhGo", "oGhGbecccbecccbecccbecccbecccbecccbecccbeccchGGo", "ohGGbecccbecccbecccbecccbecccbecccbecccbecccGGho", "oGGgbecccbecccbecccbecccbecccbecccbecccbecccGgGo", "oGhGbecccbecccbecccbecccbecccbecccbecccbeccchGGo", "ogGGbecccbecccbecccbecccbecccbecccbecccbecccGGho", ".oGhbecccbecccbecccbecccbecccbecccbecccbecccGho.", ".ohGGecccbecccbecccbecccbecccbecccbecccbeccGhGo.", "..oGhGcccbecccbecccbecccbecccbecccbecccbecGhGo..", "..ogGGcccbecccbecccbecccbecccbecccbecccbechGGo..", "...oGhGGcbecccbecccbecccbecccbecccbecccbGhGGo...", "....oGGgGbecccbecccbecccbecccbecccbecccGhGGo....", ".....ooGGhecccbecccbecccbecccbecccbeccGhGoo.....", ".......ohGGgccbecccbecccbecccbecccbeGGhGo.......", "........oohGGhGecccbecccbecccbeccGhGGhoo........", "..........oohGGgGGhGecccbeccGGhGGgGGoo..........", "............ooooGhGGhGGhGGhGGhGGoooo............", "................oooooooooooooooo................", "................................................", "................................................"]}]};
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
// torkan efter version 1 (Björn: "Gör tre nya versioner baserat på 1"): en het sol över sprucken mark
function torka({ sol, varme = false, tuva = false, sprickor }) {
  return punkter(s => {
    klot(s, sol[0], sol[1], sol[2], ['y', 'Y', 'Y']);
    for (let y = 11; y < 16; y++) for (let x = 0; x < 16; x++) s(x, y, hash(x, y, 31) < 0.3 ? 'J' : 'j');
    for (const l of sprickor) linje(s, l, 'k');
    if (tuva) { linje(s, [[3, 10], [2, 7], [1, 6], [0, 7]], 'b'); linje(s, [[4, 10], [5, 6], [7, 5], [8, 6]], 'G'); linje(s, [[5, 10], [6, 8], [8, 8]], 'b'); }
  }, { efter: s => {
    const [cx, cy, r] = sol; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; s(cx + Math.cos(a) * (r + 2), cy + Math.sin(a) * (r + 2), 'o'); }
    if (varme) for (const y0 of [5, 8]) for (let x = 8; x <= 14; x++) s(x, y0 + [0, 1, 1, 0][x % 4] - (x % 4 === 2 ? 0 : 0), 'r');
  } });
}
const TK_SOL2 = torka({ sol: [6, 4.5, 3.4], sprickor: [[[1, 11], [3, 13], [2, 15]], [[3, 13], [7, 12], [9, 14], [8, 15]], [[7, 12], [8, 11]], [[9, 14], [13, 13], [15, 14]], [[13, 13], [12, 11]]] });
const TK_VARME = torka({ sol: [4, 4, 2.8], varme: true, sprickor: [[[0, 13], [4, 12], [6, 14], [5, 15]], [[6, 14], [10, 12], [11, 11]], [[10, 12], [14, 14], [15, 12]]] });
const TK_TUVA = torka({ sol: [11, 4.5, 3.4], tuva: true, sprickor: [[[2, 11], [4, 13], [3, 15]], [[4, 13], [8, 12], [10, 15]], [[8, 12], [9, 11]], [[10, 13], [14, 12], [15, 15]]] });
// tornadon lite mer uppifrån (Björn: "Gör den lite mer i ett ovanför perspektiv"), 32 × 48 punkter
const virvel = (x, y, cx, cy, a, b, vrid) => { const u = (x - cx) / a, v = (y - cy) / b, rr = Math.hypot(u, v), ang = Math.atan2(v, u); return { rr, band: ((ang / (2 * Math.PI) * 3 + rr * vrid) % 1 + 1) % 1 < 0.5 ? 'g' : 'G' }; };
function tnUppifran(stil) {
  return punkter(s => {
    const damm = (cy, a, b) => { for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) { const e = ((x - 15.5) / a) ** 2 + ((y - cy) / b) ** 2; if (e < 1) s(x, y, hash(x, y, 5) < 0.35 ? 'D' : 'd'); } };
    if (stil === 'moln') {
      damm(43, 13, 4);
      for (let y = 14; y < 43; y++) { const u = (y - 14) / 28, w = 9 - 6 * u, cx = 15.5 + Math.sin(u * 4) * 1.5; for (let x = Math.round(cx - w / 2); x <= Math.round(cx + w / 2); x++) s(x, y, ((x + y) % 5) < 2 ? 'g' : 'G'); }
      for (let y = 0; y < 20; y++) for (let x = 0; x < 32; x++) { const { rr, band } = virvel(x, y, 15.5, 9, 15, 8.5, 2.2); if (rr < 1) s(x, y, rr < 0.18 ? 'k' : rr > 0.85 ? 'K' : band); }
    } else if (stil === 'ovan') {
      damm(34, 15.5, 11);
      for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) { const { rr, band } = virvel(x, y, 15.5, 30, 13, 10, 2.8); if (rr < 1 && hash(x, y, 8) < 1.25 - rr) s(x, y, rr < 0.14 ? 'k' : rr < 0.25 ? 'K' : band); }
    } else {
      damm(44, 12, 3.6);
      const ringar = [[9, 14, 5.5], [18, 10, 4], [26, 7, 3], [33, 4.6, 2.2], [39, 3, 1.6]];
      for (let i = 0; i < ringar.length - 1; i++) { const [y0, a0] = ringar[i], [y1, a1] = ringar[i + 1]; for (let y = y0; y <= y1; y++) { const w = a0 + (a1 - a0) * (y - y0) / (y1 - y0); for (let x = Math.round(15.5 - w * 0.8); x <= Math.round(15.5 + w * 0.8); x++) s(x, y, 'G'); } }
      for (const [cy, a, b] of ringar) for (let y = Math.floor(cy - b); y <= Math.ceil(cy + b); y++) for (let x = 0; x < 32; x++) { const { rr, band } = virvel(x, y, 15.5, cy, a, b, 1.5); if (rr < 1) s(x, y, rr > 0.8 ? 'g' : band); }
      for (let y = 39; y < 43; y++) { s(15, y, 'g'); s(16, y, 'G'); }
    }
    for (const [x, y, c] of [[2, 30, 'l'], [3, 30, 'l'], [28, 22, 'j'], [29, 23, 'j'], [5, 40, 'J'], [27, 38, 'l'], [24, 44, 'j']]) s(x, y, c);
  }, { W: 32, H: 48 });
}
const TN_UPP1 = tnUppifran('moln'), TN_UPP2 = tnUppifran('ovan'), TN_UPP3 = tnUppifran('ringar');
// att gå på toa (Björn: "Gör 3 nya versioner. Gör en bajshög"), 8 × 8 punkter
const TOA_L = { w: 'ben3', a: 'skiffer3', b: 'jord1', B: 'jord2', c: 'jord3' };
const TOA_HOG = ['........', '....b...', '...bBb..', '...bcb..', '..bBBbb.', '..bcBBb.', '.bBcBBbb', '.bbbbbbb'];
const TOA_STANK = ['.w....w.', 'w....w..', '.w....w.', '...bb...', '..bcBb..', '.bBcBbb.', '.bcBBBb.', 'bbbbbbbb'];
const TOA_HUKHOG = ['...ww...', '...ww...', '..www...', '.www....', 'ww.w....', 'w..w....', '.....bc.', '....bBbb'];
// eldsvådan i ett sammanhang (Björn: "Jag måste se elden i ett sammanhang"): sex × tre rutor gräs, två granar och en
// timmervägg; lågorna på fem av rutorna, de andra brinner inte
function ritaBrandSammanhang(B, P, rader) {
  for (let y = 32; y < 48; y++) for (let x = 0; x < 32; x++) { const r = (y - 32) % 4; B.satt(x, y, P.i('jord', r === 0 ? 0 : r === 1 ? 3 : 2)); }
  ritaGran(B, 72, 31, 26, P, { tid: 'dag' }); ritaGran(B, 88, 22, 20, P, { tid: 'dag' });
  for (const [tx, ty] of [[16, 32], [32, 16], [32, 32], [48, 32], [64, 16]]) ritaSprite(B, rader, { o: 'kol0', ...BR_L }, tx, ty);
}
const BRAND_M = rader => ({ w: 96, h: 48, rita: (B, P) => ritaBrandSammanhang(B, P, rader) });
// dragkampen (steg 4.5.6.10): två lag på en rad på var sin sida om ett streck med repet mellan sig, 16 punkter per ruta,
// en ruta mellan spelarna. v väljer hur repet, strecket och lagen ser ut
function ritaDragkamp(B, v) {
  const P = B.P, W = B.w, H = B.h, my = 30, mx = W >> 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) B.satt(x, y, P.i('oliv', ((x * 7 + y * 13) % 11 === 0) ? 1 : 2)); // gräset
  if (v === 0) for (let y = my - 9; y <= my + 9; y++) { B.satt(mx, y, P.i('jord', 0)); B.satt(mx + 1, y, P.i('jord', 1)); } // ett ristat streck
  if (v === 1) for (let y = my - 10; y <= my + 10; y += 4) { B.satt(mx, y, P.i('skiffer', 3)); B.satt(mx + 1, y, P.i('skiffer', 2)); B.satt(mx, y + 1, P.i('skiffer', 1)); B.satt(mx + 1, y + 1, P.i('skiffer', 0)); } // stenar på rad
  if (v === 2) for (let y = my - 10; y <= my + 10; y++) { B.satt(mx - 1, y, P.i('jord', 2)); B.satt(mx, y, P.i('jord', 0)); B.satt(mx + 1, y, P.i('jord', 0)); B.satt(mx + 2, y, P.i('jord', 2)); } // en fåra
  const glid = 3, xs = [-1, -2, -3].map(i => mx + glid + i * 16 - 2).concat([1, 2, 3].map(i => mx + glid + i * 16 + 2));
  const ry = (x) => v === 2 ? my - 6 + Math.round(Math.abs(x - mx) < 40 ? (1 - ((x - mx) / 40) ** 2) * 1.5 : 0) : my - 6;
  for (let x = Math.min(...xs) - 3; x <= Math.max(...xs) + 3; x++) { B.satt(x, ry(x), P.i('jord', 2)); B.satt(x, ry(x) + 1, P.i('jord', 1)); } // repet
  const tx = mx + glid;
  if (v === 2) { B.satt(tx, ry(tx) - 1, P.i('jord', 3)); B.satt(tx - 1, ry(tx), P.i('jord', 3)); B.satt(tx + 1, ry(tx), P.i('jord', 3)); B.satt(tx, ry(tx) + 2, P.i('jord', 1)); } // en knut
  else for (let y = -1; y <= 3; y++) { B.satt(tx, ry(tx) + y, P.i('rost', 2)); B.satt(tx + 1, ry(tx) + y, P.i('rost', 1)); } // tofsen
  SPELARE_N = 0;
  xs.forEach((x, i) => spelare(B, x, my + 1, i < 3 ? -1 : 1, i < 3 ? 'rost' : 'skiffer', 'framfor')); // båda lagen håller i repet
}
const DRAG_BILD = (v) => ({ w: 128, h: 40, rita: (B) => ritaDragkamp(B, v) });
// de andra sporterna (steg 4.5.6.11), som dragkampen: gräs eller snö, figurer på en rad sedda från sidan, och det som kastas
// i en båge. k är sporten och v förslaget
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
function bage(B, ax, ay, bx, by, h, n, ramp, ton) { // det som flyger, n prickar längs bågen (den sista störst)
  const P = B.P;
  for (let i = 1; i <= n; i++) { const f = i / (n + 1) + 0.15, x = Math.round(ax + (bx - ax) * f), y = Math.round(ay + (by - ay) * f - h * 4 * f * (1 - f));
    if (i < n) { B.morka(x, y); continue; } // spåret
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const r = Math.abs(dx) + Math.abs(dy); if (r <= 2 || (Math.abs(dx) < 2 && Math.abs(dy) < 2)) B.satt(x + dx, y + dy, r >= 2 && !(Math.abs(dx) === 1 && Math.abs(dy) === 1) ? P.i('kol', 0) : P.i(ramp, dx + dy < 0 ? ton : Math.max(0, ton - 1))); }
  }
}
function ritaSporten(B, k, v) {
  const P = B.P, W = B.w, H = B.h, fot = 32, mx = W >> 1, sno = k === 'snoboll';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) B.satt(x, y, sno ? P.i('ben', ((x * 7 + y * 13) % 9 === 0) ? 2 : 3) : P.i('oliv', ((x * 7 + y * 13) % 11 === 0) ? 1 : 2));
  if (k === 'brottning') {
    if (v === 1) for (let a = 0; a < 20; a++) { const x = Math.round(mx + Math.cos(a / 20 * 6.28) * 30), y = Math.round(fot + Math.sin(a / 20 * 6.28) * 6); B.satt(x, y, P.i('skiffer', 2)); B.satt(x + 1, y, P.i('skiffer', 1)); } // en ring av stenar
    if (v === 2) for (let y = -6; y <= 6; y++) for (let x = -30; x <= 30; x++) if ((x / 30) ** 2 + (y / 6) ** 2 <= 1) B.satt(mx + x, fot + y, P.i('jord', ((x + y) % 5) ? 3 : 2)); // en trampad plan
    [14, 30, 98, 114].forEach((x, i) => spelare(B, x, fot - (i % 2 ? 3 : 0), 0, v === 1 ? 'skiffer' : 'jord')); // de som hejar
    spelare(B, mx - 5, fot + 2, 3, v === 0 ? 'jord' : 'rost'); spelare(B, mx + 5, fot + 2, -3, v === 0 ? 'jord' : 'skiffer'); // brottarna trycker mot varandra
    if (v === 0) for (const x of [14, 114]) { B.satt(x - 4, fot - 13, P.i('senap', 2)); B.satt(x + 4, fot - 13, P.i('senap', 2)); } // armarna i luften
  } else if (k === 'kast') {
    const mal = W - 18;
    if (v === 2) for (let y = fot - 8; y <= fot + 4; y++) B.satt(34, y, P.i('jord', 0)); // strecket man kastar från
    ritaIkon(B, 'mal', mal - 8, fot - 14);
    [14, 26].forEach(x => spelare(B, x, fot, 0, 'jord')); spelare(B, 40, fot, -2, 'jord'); // den som kastar lutar sig bakåt
    bage(B, 44, fot - 14, mal, fot - 8, 10, 6, v === 1 ? 'jord' : 'skiffer', v === 1 ? 2 : 3);
    if (v === 1) for (const x of [mal - 14, mal + 6, mal - 9]) { B.satt(x, fot + 2, P.i('jord', 2)); B.satt(x + 1, fot + 2, P.i('jord', 1)); B.satt(x + 2, fot + 2, P.i('jord', 2)); } // pinnar som missat
    if (v === 0) for (const x of [mal - 12, mal + 8]) { B.satt(x, fot + 1, P.i('skiffer', 2)); B.satt(x + 1, fot + 1, P.i('skiffer', 1)); }
  } else if (k === 'snoboll') {
    for (const sida of [-1, 1]) {
      const vx = mx + sida * 24;
      for (let y = fot - (v === 1 ? 10 : 6); y <= fot + 2; y++) for (let dx = -3; dx <= 3; dx++) {
        if (v === 2 && Math.abs(dx) + (fot + 2 - y) * 0.6 > 6) continue; // en rundad hög
        const kant = Math.abs(dx) === 3 || y === fot - (v === 1 ? 10 : 6) || (v === 2 && Math.abs(dx) + (fot + 2 - y) * 0.6 > 5);
        B.satt(vx + dx, y, kant ? P.i('skiffer', 1) : v === 1 && (y % 3 === 0 || (dx + (y % 6 < 3 ? 0 : 2)) % 4 === 0) ? P.i('skiffer', 2) : P.i('ben', dx < 0 ? 2 : 3)); // block eller vall
      }
      for (let dx = -3; dx <= 3; dx++) B.morka(vx + dx, fot + 3);
      [36, 52].forEach((d, i) => spelare(B, mx + sida * d, fot - i * 2, i ? sida * -1 : 0, sida < 0 ? 'rost' : 'skiffer'));
    }
    bage(B, mx - 34, fot - 15, mx + 34, fot - 12, 8, 5, 'ben', 3);
    bage(B, mx + 50, fot - 16, mx - 50, fot - 14, 6, 4, 'ben', 3);
  } else if (k === 'bollspel') {
    if (v === 1) for (const x of [10, 60, 108]) { B.satt(x, fot + 1, P.i('skiffer', 2)); B.satt(x + 1, fot + 1, P.i('skiffer', 1)); B.satt(x, fot + 2, P.i('skiffer', 1)); } // stenar som mål
    if (v === 2) for (let x = 0; x < W; x += 3) B.satt(x, fot + 4, P.i('jord', 1)); // en linje på planen
    spelare(B, 16, fot, -1, 'rost'); ritaIkon(B, 'slagtra', 18, fot - 20); // den som slår
    [64, 88, 110].forEach((x, i) => spelare(B, x, fot - (i % 2 ? 3 : 0), i ? -3 : 3, 'skiffer', i % 2 ? 'gang2' : 'gang1', i % 2 ? 'gang2' : 'gang1')); // de som springer efter bollen
    bage(B, 26, fot - 16, 78, fot - 4, 14, 7, 'jord', 2);
  }
}
const SPORT_BILD = (k, v) => ({ w: 128, h: 40, rita: (B) => ritaSporten(B, k, v) });
const SPORT_JA = (k, namn, vad, text, komm) => ({ id: 'sport_' + k, namn, typ: 'janej', vad: 'Steg 4.5.6.11: ' + vad + ' ' + komm, versioner: [{ text: 'Version 1: ' + text, ...SPORT_BILD(k, 0) }] });
const SPORT_VAL = (k, namn, vad, idag, texter) => ({ id: 'sport_' + k, namn, typ: 'tre', vad: 'Steg 4.5.6.11: ' + vad + ' Sedd från sidan i rätt storlek. I spelet nu: ' + idag,
  idag: SPORT_BILD(k, 0), idagText: 'Platshållaren i spelet är enklare: ' + idag, versioner: texter.map((text, v) => ({ text, ...SPORT_BILD(k, v) })) });
const VAL = [
  SPORT_JA('brottning', 'Brottningen', 'två brottas i mitten och trycker mot varandra, och de andra står i en ring runt om och hejar.', 'Bara folket: brottarna i mitten och de som hejar.', 'Din kommentar förra gången (du valde version 1): ”Personerna ska ritas som dem brukar inte göras om.”. Nu ritas personerna som de brukar på kartan, och bara sportens saker är nya.'),
  SPORT_JA('kast', 'Kast mot målet', 'de står på en rad och kastar i tur och ordning mot målet en bit bort.', 'En sten flyger mot målet, och några stenar som missat ligger i gräset.', 'Din kommentar förra gången (du valde version 1): ”Personerna ska ritas som dem brukar inte göras om”. Nu ritas personerna som de brukar på kartan, och bara sportens saker är nya.'),
  SPORT_JA('snoboll', 'Snöbollskriget', 'två lag bakom var sin snövall kastar snöbollar på varandra.', 'Låga vallar av snö.', 'Din kommentar förra gången (du valde version 1): ”Personerna ska ritas som dem brukar inte göras om”. Nu ritas personerna som de brukar på kartan, och bara sportens saker är nya.'),
  SPORT_JA('bollspel', 'Bollspelet', 'den som slår står i ena änden med slagträet, bollen flyger ut på planen och de andra springer efter den.', 'Slagträet, bollen i luften och de som springer.', 'Din kommentar förra gången (du valde version 1): ”personerna ska ritas som dem brukar inte göras om”. Nu ritas personerna som de brukar på kartan, och bara sportens saker är nya.'),
  { id: 'dragkamp', namn: 'Dragkampen', typ: 'janej', vad: 'Steg 4.5.6.10: dragkampen syns. Två lag på var sin sida om strecket håller i repet. Din kommentar förra gången (du valde version 1): ”Hur har du tänkt här? karaktärerna kan inte ritas på ett helt nytt sätt bara för att dom gör en sport. bara repet ska ha ett nytt utseende karaktärerna ska ritas på samma sätt som dem alltid gör”. Nu ritas personerna som de brukar på kartan, och bara sportens saker är nya.',
    versioner: [{ text: 'Version 1: ett streck ristat i marken och en röd tofs mitt på repet. Folket är de vanliga kartfigurerna, med händerna framför sig på repet.', ...DRAG_BILD(0) }] },
  { id: 'm_torka', namn: 'Torkan', vad: 'Ny symbol (steg 3.8.2), 16 × 16 punkter, i kalendern bredvid temperaturen när en torka pågår (blek när de äldsta i byn bara anar den). Tre nya versioner efter version 1, solen över sprucken mark. I spelet nu: version 1 (platshållare). Din kommentar förra gången: ”Gör tre nya versioner baserat på 1”.', typ: 'tre',
    versioner: [
      { text: 'En större sol, och marken sprucken i flak.', ...LED_M(TK_SOL2, TK_L) },
      { text: 'En mindre sol, och värmen som dallrar i röda vågor ovanför den spruckna marken.', ...LED_M(TK_VARME, TK_L) },
      { text: 'Solen till höger, och en vissen tuva som hänger över den spruckna marken.', ...LED_M(TK_TUVA, TK_L) },
    ] },
  { id: 'a_toa', namn: 'Att gå på toa', vad: 'Ny symbol över huvudet (steg 3.10.3), 8 × 8 punkter som de andra handlingarna: den som gått avsides eller sitter i latrinen. Tre nya versioner, alla med en bajshög. I spelet nu: version 1 (platshållare). Din kommentar förra gången: ”Gör 3 nya versinner. Gör en bajshög”.', typ: 'tre',
    versioner: [
      { text: 'En brun bajshög i varv.', ...SYM8_M(TOA_HOG, TOA_L) },
      { text: 'En bajshög med stanken som stiger.', ...SYM8_M(TOA_STANK, TOA_L) },
      { text: 'En människa på huk med en liten hög bakom sig.', ...SYM8_M(TOA_HUKHOG, TOA_L) },
    ] },
  { id: 'a_smyga', namn: 'Att smyga', vad: 'Ny symbol över huvudet (Björn efter v159), 8 × 8 punkter som de andra handlingarna: jägaren smyger fram mot en kanin. Tre helt nya versioner. Din kommentar förra gången: ”Gör tre nya”. I spelet nu: förra version 1 (platshållare).', typ: 'tre',
    versioner: [
      { text: 'Två fotspår på tå, ett framför det andra.', ...SYM8_M(SMYG_SPAR, AKT_L) },
      { text: 'En människa som kryper fram lågt på marken.', ...SYM8_M(SMYG_KRYP, AKT_L) },
      { text: 'En människa på tå med långa försiktiga steg, lutad framåt.', ...SYM8_M(SMYG_TA, AKT_L) },
    ] },
  { id: 'a_sikta', namn: 'Att sikta', vad: 'Ny symbol över huvudet (Björn efter v159), 8 × 8 punkter: jägaren har stannat och siktar innan hen kastar. Version 1, pilbågen, ritad om utan att vara spänd. Din kommentar förra gången: ”version 1 fast att den inte är spänd”. I spelet nu: förra version 1 (platshållare).', typ: 'janej',
    versioner: [{ text: 'Pilbågen snett, med rak sträng och pilen lagd mot den, inte spänd.', ...SYM8_M(SIKTA_BAGE, AKT_L) }] },
];
// Björns val som är bestämda men inte inbyggda i spelet: de visas under Valt med den valda versionen (0 = förut-versionen
// behålls) och steget där de byggs in. När saken är inbyggd tas raden bort här och ur VAL, och dess dokument i samlingen 'val'
const BESLUT = {
  m_torka: { val: 1, steg: '5.3.2.1' }, a_toa: { val: 2, steg: '5.3.2.1' },
  a_sikta: { val: 1, steg: '5.3.2.1' }, a_smyga: { val: 3, steg: '5.3.2.1' }, dragkamp: { val: 1, steg: '5.1.2' },
  sport_brottning: { val: 1, steg: '5.1.2' }, sport_kast: { val: 1, steg: '5.1.2' }, sport_snoboll: { val: 1, steg: '5.1.2' }, sport_bollspel: { val: 1, steg: '5.1.2' },
  q_tro: { val: 1, steg: '5.3.3.1' }, q_person: { val: 1, steg: '5.3.3.1' }, q_grannar: { val: 1, steg: '5.3.3.1' },
  g_runsten: { val: 1, steg: '5.3.3.1' }, g_band: { val: 1, steg: '5.3.3.1' }, g_vag: { val: 1, steg: '5.3.1.2' },
  g_horn: { val: 1, text: 'Ormen. Ring med blad och Dubbel ögla sparas (i gui.json) om du ångrar dig. Byggs in i steg 5.3.1.4.' },
  a_tornado: { val: 1, text: 'Byggs in i steg 5.1.9.1 (tornadon på kartan).' }, a_brand: { val: 1, text: 'Byggs in i steg 5.1.9.1 (rutor som brinner på kartan).' },
  a_rorelser: { val: 1, text: 'Byggs in i steg 5.1.9.4 (arbetena) och 5.1.9.5 (striden).' }, a_effekter: { val: 1, text: 'Byggs in i steg 5.1.9.1 (elden och röken) och 5.1.9.2 (vågorna och stranden).' },
  f6_grans: { val: 1, steg: '6.2.1.3' }, f6_talg: { val: 3, steg: '6.3.2.2' }, f6_agg: { val: 3, steg: '6.5.1.3' },
  f6_radjursskinn: { val: 1, steg: '6.5.1.2' }, f6_bjornskinn: { val: 1, steg: '6.5.3.3' },
  f6_naver: { val: 1, text: 'Byggs in i steg 6.3.1.3 efter din ritning: tre remsor utan mörk kontur (den lösa mörka punkten till höger tas bort).' },
  f6_ljus: { val: 1, text: 'Version 1 och 2 används båda, som variationer (ljuset på stenen och i lerskålen). Byggs in i steg 6.3.2.5.' },
  f6_buske: { val: 1, text: 'Alla tre används, som variationer (rund, gles och låg). Byggs in i steg 6.4.1.3.' },
  f6_styckdel: { val: 1, text: 'Version 1 och 2 används båda, som variationer (låret och högen), i djurets färger. Byggs in i steg 6.5.1.1.' },
  v_framsteg: { val: 1, steg: '5.3.2.2' }, v_ring: { val: 1, steg: '5.3.2.2' }, v_tart: { val: 1, steg: '5.3.2.2' },
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
