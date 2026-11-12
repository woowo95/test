// Kör en by med eller utan gångstråken (provet i steg 6.2.6) och skriver husens placering, stråken och en karta över byn
// som JSON på sista raden (används av prov.ts). Utan stråken: BALANS="strak.pa=0", då räknas och ritas de men hindrar inget.
import './utc';
import { korBy } from './kor';
import { bitsOf, eldPlats, getMap, groundOf, housesOf, markslag, omrade, stationerOf, storlekAv, straken, STRAK, zonesOf, faltAt, H, W, T } from '../sim';

const [seed, dagar] = process.argv.slice(2).map(Number), utan = !STRAK.pa;
const r = korBy(seed, dagar), s = r.s, st = s.stat ?? {};
// byns mitt för provet är husens och lagrets mitt (omrade), inte torget: torget kan hamna i utkanten när mitten är full
const o = omrade(s), m = o.mitt, hus = housesOf(s).filter(h => h.klar);
const mitt = (h: { x: number; y: number; w: number; h: number }) => ({ x: h.x + h.w / 2, y: h.y + h.h / 2 });
const fran = hus.map(h => Math.hypot(mitt(h).x - m.x, mitt(h).y - m.y));
// avståndet mellan två hus: rutorna mellan väggarna (0 = vägg i vägg)
const mellan = (a: typeof hus[0], b: typeof hus[0]) => Math.max(0, Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)), Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
const narmast = hus.map(a => Math.min(...hus.filter(b => b !== a).map(b => mellan(a, b))));
const sk = straken(s), snitt = (mal: string) => { const v = sk.vagar.filter(x => x.mal === mal); return v.length ? v.reduce((a, x) => a + x.len, 0) / v.length : 0; };
// kartan: en bokstav per ruta i rutan runt byn (± 6 rutor), med husen, fälten, lagren, stationerna, elden, stråken och gränsen
const P = 6, x0 = Math.max(0, o.x0 - P), y0 = Math.max(0, o.y0 - P), x1 = Math.min(W - 1, o.x1 + P), y1 = Math.min(H - 1, o.y1 + P);
const g = groundOf(s), tiles = getMap(s.seed).tiles, ruta: string[] = [];
const bit = new Map(bitsOf(s).map(b => [b.y * W + b.x, b.k]));
const fl = new Set<number>(), zn = new Set<number>(), stn = new Set<number>();
for (const z of zonesOf(s)) for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) zn.add(y * W + x);
for (const t of stationerOf(s)) { const { w, h } = storlekAv(t); for (let y = t.y; y < t.y + h; y++) for (let x = t.x; x < t.x + w; x++) stn.add(y * W + x); }
const e = eldPlats(s);
for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (faltAt(s, x, y)) fl.add(y * W + x);
for (let y = y0; y <= y1; y++) {
  let rad = '';
  for (let x = x0; x <= x1; x++) {
    const i = y * W + x, b = bit.get(i), t = tiles[i];
    // V vatten, S sten, T skog, . mark, # vägg, + golv, D öppning, F fält, L lager, X station, E eld
    rad += x === e.x && y === e.y ? 'E' : b === 'vagg' ? '#' : b === 'golv' ? '+' : b === 'oppning' ? 'D' : stn.has(i) ? 'X' : zn.has(i) ? 'L' : fl.has(i) ? 'F'
      : t === T.Vatten ? 'V' : t === T.Sten ? 'S' : markslag(g, i) === 'skog' ? 'T' : '.';
  }
  ruta.push(rad);
}
// stråken (0, 1 eller 2 = rutan framför en dörr) och byns område (1 = innanför), en siffra per ruta, rad för rad
let strak = '', inne = '';
for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * W + x; strak += sk.ruta[i]; inne += o.inne[i]; }
const med = (v: number[]) => { const a = [...v].sort((p, q) => p - q); return a.length ? a[a.length >> 1] : 0; };
console.log(JSON.stringify({
  seed, utan, pop: r.n.pop, hus: hus.length, fran: fran.length ? Math.max(...fran) : 0, franMed: med(fran), mellan: med(narmast.filter(isFinite)), mellanMin: narmast.filter(isFinite).length ? Math.min(...narmast.filter(isFinite)) : 0,
  samre: st.strakSamre ?? 0, ingen: st.strakIngen ?? 0, om: st.strakOm ?? 0, eld: snitt('eld'), lager: snitt('lager'), yta: o.n,
  karta: { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1, ruta, strak, inne, mitt: { x: m.x - x0, y: m.y - y0 } }, vakter: r.vakter,
}));
