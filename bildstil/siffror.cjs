// Siffrorna (steg 6.9.19): Björns val i bildstilen (f6_siffror, version 2) blir typsnittet "Siffror" i spelet. Skriptet bygger
// en TrueType-fil direkt ur pixlarna (varje punkt en fyrkant) och skriver den som base64 i src/template.html, där typsnittet står
// före Pixelify Sans för siffrorna 0–9 och kolonet. Kör från repots rot: node bildstil/siffror.cjs
const fs = require('fs'), path = require('path');
// de egenritade siffrorna: sju punkter höga som de stora bokstäverna i Pixelify Sans och alla fem breda, så att talen står i
// raka kolumner, med en punkt mellan (samma som SIFF_EGEN i bildstil/svar/a-fas6.js). Kolonet är två punkter
const SIFFROR = {
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'], 1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'], 3: ['.###.', '#...#', '....#', '..##.', '....#', '#...#', '.###.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'], 5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'], 7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'], 9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ':': ['.', '.', '#', '.', '.', '#', '.'],
};
// en punkt är 100 enheter, och em är 1081 enheter: i den storlek där Pixelify Sans har sina punkter på hela skärmpunkter
// (10,8 px, som i bildstilen) blir siffrornas punkter också hela
const P = 100, EM = 1081, H = 7;
const tecken = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':'];
const glyfer = [{ rader: null, adv: 600 }, ...tecken.map(c => ({ rader: SIFFROR[c], adv: (SIFFROR[c][0].length + 1) * P }))];

// ---------- binär skrivning ----------
const u8 = v => [v & 255], u16 = v => [(v >> 8) & 255, v & 255], i16 = v => u16(v < 0 ? v + 65536 : v), u32 = v => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
const tag = s => [...s].map(c => c.charCodeAt(0));
const pad4 = a => { while (a.length % 4) a.push(0); return a; };
const summa = a => { const b = pad4([...a]); let s = 0; for (let i = 0; i < b.length; i += 4) s = (s + ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3])) >>> 0; return s; };

// ---------- glyf och loca: en fyrkant (fyra punkter medsols) per punkt ----------
const glyf = [], loca = [];
let maxPts = 0, maxKont = 0, xMax = 0;
for (const g of glyfer) {
  loca.push(glyf.length);
  if (!g.rader) continue;
  const fyr = [];
  g.rader.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '#') fyr.push([i * P, (H - 1 - j) * P, (i + 1) * P, (H - j) * P]); }));
  const pts = fyr.flatMap(([x0, y0, x1, y1]) => [[x0, y0], [x0, y1], [x1, y1], [x1, y0]]); // medsols: ytterkontur i TrueType
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const d = [...i16(fyr.length), ...i16(Math.min(...xs)), ...i16(Math.min(...ys)), ...i16(Math.max(...xs)), ...i16(Math.max(...ys))];
  fyr.forEach((_, k) => d.push(...u16(k * 4 + 3)));
  d.push(...u16(0)); // inga instruktioner
  pts.forEach(() => d.push(1)); // alla på kurvan, x och y som 16-bitars skillnader
  let px = 0, py = 0;
  for (const [x] of pts) { d.push(...i16(x - px)); px = x; }
  for (const [, y] of pts) { d.push(...i16(y - py)); py = y; }
  glyf.push(...pad4(d));
  maxPts = Math.max(maxPts, pts.length); maxKont = Math.max(maxKont, fyr.length); xMax = Math.max(xMax, ...xs);
}
loca.push(glyf.length);
const n = glyfer.length;

// ---------- de andra tabellerna ----------
const head = [...u32(0x00010000), ...u32(0x00010000), ...u32(0), ...u32(0x5F0F3CF5), ...u16(0x000B), ...u16(EM), ...u32(0), ...u32(0), ...u32(0), ...u32(0),
  ...i16(0), ...i16(0), ...i16(xMax), ...i16(H * P), ...u16(0), ...u16(8), ...i16(2), ...i16(1), ...i16(0)];
const hhea = [...u32(0x00010000), ...i16(900), ...i16(-200), ...i16(0), ...u16(Math.max(...glyfer.map(g => g.adv))), ...i16(0), ...i16(0), ...i16(xMax),
  ...i16(1), ...i16(0), ...i16(0), ...i16(0), ...i16(0), ...i16(0), ...i16(0), ...i16(0), ...u16(n)];
const maxp = [...u32(0x00010000), ...u16(n), ...u16(maxPts), ...u16(maxKont), ...u16(0), ...u16(0), ...u16(2), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u16(0)];
const hmtx = glyfer.flatMap(g => [...u16(g.adv), ...i16(0)]);
const os2 = [...u16(4), ...i16(600), ...u16(400), ...u16(5), ...u16(0), ...i16(650), ...i16(700), ...i16(0), ...i16(140), ...i16(650), ...i16(700), ...i16(0), ...i16(480),
  ...i16(50), ...i16(250), ...i16(0), ...Array(10).fill(0), ...u32(1), ...u32(0), ...u32(0), ...u32(0), ...tag('SAMH'), ...u16(0x40), ...u16(0x30), ...u16(0x3A),
  ...i16(900), ...i16(-200), ...i16(0), ...u16(900), ...u16(200), ...u32(1), ...u32(0), ...i16(500), ...i16(700), ...u16(0), ...u16(32), ...u16(1)];
// cmap: 0–9 och kolonet (0x30–0x3A) är glyf 1–11
const seg = [[0x30, 0x3A, 1 - 0x30], [0xFFFF, 0xFFFF, 1]];
const f4 = [...u16(4), ...u16(16 + seg.length * 8), ...u16(0), ...u16(seg.length * 2), ...u16(4), ...u16(1), ...u16(0),
  ...seg.flatMap(s => u16(s[1])), ...u16(0), ...seg.flatMap(s => u16(s[0])), ...seg.flatMap(s => i16(s[2])), ...seg.flatMap(() => u16(0))];
const cmap = [...u16(0), ...u16(1), ...u16(3), ...u16(1), ...u32(12), ...f4];
const namn = { 1: 'Siffror', 2: 'Regular', 3: 'Siffror 1.0', 4: 'Siffror', 5: 'Version 1.0', 6: 'Siffror' };
const str = Object.values(namn).map(t => [...t].flatMap(c => u16(c.charCodeAt(0))));
let off = 0;
const rec = Object.keys(namn).map((id, k) => { const r = [...u16(3), ...u16(1), ...u16(0x409), ...u16(+id), ...u16(str[k].length), ...u16(off)]; off += str[k].length; return r; });
const name = [...u16(0), ...u16(rec.length), ...u16(6 + rec.length * 12), ...rec.flat(), ...str.flat()];
const post = [...u32(0x00030000), ...u32(0), ...i16(-100), ...i16(50), ...u32(0), ...u32(0), ...u32(0), ...u32(0), ...u32(0)];
const locaB = loca.flatMap(o => u32(o));

// ---------- filen: tabellkatalogen och tabellerna i bokstavsordning ----------
const tabeller = { 'OS/2': os2, cmap, glyf, head, hhea, hmtx, loca: locaB, maxp, name, post };
const namnen = Object.keys(tabeller).sort();
const nt = namnen.length, es = Math.floor(Math.log2(nt)), sr = 2 ** es * 16;
const ut = [...u32(0x00010000), ...u16(nt), ...u16(sr), ...u16(es), ...u16(nt * 16 - sr)];
let pos = 12 + nt * 16;
const kropp = [], headPos = {};
for (const t of namnen) {
  const d = tabeller[t];
  ut.push(...tag(t), ...u32(summa(d)), ...u32(pos), ...u32(d.length));
  if (t === 'head') headPos.at = pos;
  kropp.push(...pad4([...d])); pos = 12 + nt * 16 + kropp.length;
}
const fil = [...ut, ...kropp];
const just = (0xB1B0AFBA - summa(fil)) >>> 0; // checkSumAdjustment i head
fil.splice(headPos.at + 8, 4, ...u32(just));
const b64 = Buffer.from(fil).toString('base64');

// ---------- in i template.html ----------
const mall = path.join(__dirname, '..', 'src', 'template.html');
let t = fs.readFileSync(mall, 'utf8');
const ny = `/* Siffrorna (steg 6.9.18–6.9.19): Björns egna siffror (bildstilens val f6_siffror, version 2): sju punkter höga och alla lika breda,
   i ett eget typsnitt med bara 0–9 och kolonet som står före Pixelify Sans. Byggt av node bildstil/siffror.cjs */
@font-face { font-family: "Siffror"; font-weight: 100 900; unicode-range: U+30-3A; src: url(data:font/ttf;base64,${b64}) format("truetype"); }`;
const i = t.indexOf('/* Siffrorna (steg 6.9.18'), j = t.indexOf('\n', t.lastIndexOf('@font-face { font-family: "Siffror"'));
if (i < 0 || j < 0) throw new Error('hittar inte typsnittet Siffror i template.html');
t = t.slice(0, i) + ny + t.slice(j);
fs.writeFileSync(mall, t);
console.log('Siffror:', fil.length, 'byte,', n, 'glyfer');
