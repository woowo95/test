// sjöarna: varje sammanhängande vatten på kartan är en sjö. Byn räknar fiskeförsök, fångster och bad per sjö
// när de händer, och personrutan visar dem när man trycker på vattnet (ui/flikar/sjo.ts)
import { getMap, perKarta, vnoise } from './karta';
import { H, OX, OY, Person, State, T, W, inMap } from './typer';
import { clamp } from './slump';
import { balans } from './balans';

export interface SjoLogg { t: number; id: number; k: 'fisk' | 'bad' }
export interface SjoStat {
  forsok: number; napp: number; fisk: number; bad: number;
  fiskare: Record<number, number>; badare: Record<number, number>; // fångade fiskar och bad per person
  log: SjoLogg[]; // de senaste fångsterna och baden
}
export const SJO_LOGG = 60; // så många händelser per sjö sparas

// sjöns nummer för varje ruta vatten (0 = den största), -1 på land. storlek = rutor per sjö, mitt = sjöns mittpunkt
export const sjoarna = perKarta(seed => {
  const t = getMap(seed).tiles, id = new Int16Array(W * H).fill(-1), delar: number[][] = [];
  for (let i = 0; i < W * H; i++) if (t[i] === T.Vatten && id[i] < 0) {
    const del: number[] = [i], st = [i]; id[i] = 0;
    while (st.length) {
      const j = st.pop()!, x = j % W, y = (j - x) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy, k = yy * W + xx;
        if (inMap(xx, yy) && t[k] === T.Vatten && id[k] < 0) { id[k] = 0; del.push(k); st.push(k); }
      }
    }
    delar.push(del);
  }
  delar.sort((a, b) => b.length - a.length || a[0] - b[0]);
  delar.forEach((d, n) => { for (const j of d) id[j] = n; });
  const mitt = delar.map(d => { let x = 0, y = 0; for (const j of d) { x += j % W; y += Math.floor(j / W); } return { x: x / d.length, y: y / d.length }; });
  return { id, rutor: delar, mitt };
});

// hur smutsigt vattnet är vid varje ruta på land intill vattnet (steg 2.4.1): 0 = rent, 1 = mycket smutsigt, och 0 på
// rutor som inte ligger vid vattnet. Ett mjukt mönster över kartan, så att smutsen följer stränder och vikar (törsten i torst.ts)
export const VATTEN = balans('vatten', {
  skala: 7, // mönstrets storlek i rutor
  fran: 0.35, spann: 0.5, // smutsen börjar där bruset (0–1) är fran och är full vid fran + spann
});
export const smutsOf = perKarta(seed => {
  const t = getMap(seed).tiles, v = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // på vattnet också: där blir stranden när sjön sjunker under en torka (steg 3.8.2)
    let vid = t[y * W + x] === T.Vatten;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (inMap(xx, yy) && t[yy * W + xx] === T.Vatten) vid = true; }
    if (vid) v[y * W + x] = clamp((vnoise(seed ^ 0x5a17, (x - OX) / VATTEN.skala, (y - OY) / VATTEN.skala) - VATTEN.fran) / VATTEN.spann, 0, 1);
  }
  return v;
});

// sjön som rutan ligger i, eller närmast den som står på stranden (två rutor ut), -1 om inget vatten är nära
export function sjoVid(s: State, x: number, y: number) {
  const { id } = sjoarna(s.seed), cx = Math.floor(x), cy = Math.floor(y);
  let bast = -1, bd = 99;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const xx = cx + dx, yy = cy + dy, d = dx * dx + dy * dy;
    if (inMap(xx, yy) && id[yy * W + xx] >= 0 && d < bd) { bd = d; bast = id[yy * W + xx]; }
  }
  return bast;
}

// sjöns namn: den största heter Sjön, de andra efter väderstrecket från elden. Ligger flera åt samma håll heter de
// mindre Andra, Tredje ... tjärnen
const ORDNING = ['', 'Andra', 'Tredje', 'Fjärde', 'Femte'];
export function sjoNamn(s: State, n: number) {
  if (n === 0) return 'Sjön';
  const { mitt } = sjoarna(s.seed), f = getMap(s.seed).fire;
  const hall = (m: { x: number; y: number }) => { const dx = m.x - f.x, dy = m.y - f.y; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'öster' : 'väster') : dy > 0 ? 'söder' : 'norr'; };
  const h = hall(mitt[n]), i = mitt.slice(1, n).filter(m => hall(m) === h).length;
  return i ? `${ORDNING[i] ?? `${i + 1}:e`} tjärnen i ${h}` : `Tjärnen i ${h}`;
}

// räkna det som hände vid sjön där personen står (x, y): ett fiskeförsök, ett napp, en fångad fisk eller ett bad
export function sjoRakna(s: State, x: number, y: number, k: 'forsok' | 'napp' | 'fisk' | 'bad', p: Person) {
  const n = sjoVid(s, x, y);
  if (n < 0) return;
  const st = ((s.sjoar ??= {})[n] ??= { forsok: 0, napp: 0, fisk: 0, bad: 0, fiskare: {}, badare: {}, log: [] });
  st[k]++;
  if (k === 'fisk' || k === 'bad') {
    const vem = k === 'fisk' ? st.fiskare : st.badare;
    vem[p.id] = (vem[p.id] ?? 0) + 1;
    st.log.push({ t: s.now, id: p.id, k });
    if (st.log.length > SJO_LOGG) st.log.splice(0, st.log.length - SJO_LOGG);
  }
}

// ---------- torkan (steg 3.8.2, torka.ts) ----------
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// strand: land intill vatten, där man dricker och fiskar, för kartan tiles
export function strandAv(t: Uint8Array) {
  const b = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (t[y * W + x] === T.Vatten) continue;
    for (const [dx, dy] of D4) { const xx = x + dx, yy = y + dy; if (inMap(xx, yy) && t[yy * W + xx] === T.Vatten) { b[y * W + x] = 1; break; } }
  }
  return b;
}
// hur långt ut i sjön varje vattenruta ligger (1 = vid stranden), sjöns största avstånd, och för land hur långt det är
// till vattnet (högst 255)
export const djupOf = perKarta(seed => {
  const t = getMap(seed).tiles, d = new Uint8Array(W * H), land = new Uint8Array(W * H).fill(255), q: number[] = [], ql: number[] = [];
  for (let i = 0; i < W * H; i++) {
    const x = i % W, y = (i - x) / W;
    for (const [dx, dy] of D4) {
      const xx = x + dx, yy = y + dy;
      if (!inMap(xx, yy) || (t[yy * W + xx] === T.Vatten) === (t[i] === T.Vatten)) continue;
      if (t[i] === T.Vatten) { d[i] = 1; q.push(i); } else { land[i] = 1; ql.push(i); }
      break;
    }
  }
  for (const [kö, v, vatten] of [[q, d, true], [ql, land, false]] as const) for (let n = 0; n < kö.length; n++) {
    const j = kö[n], x = j % W, y = (j - x) / W;
    for (const [dx, dy] of D4) {
      const xx = x + dx, yy = y + dy, k = yy * W + xx;
      if (!inMap(xx, yy) || (t[k] === T.Vatten) !== vatten || (vatten ? v[k] : v[k] < 255)) continue;
      v[k] = Math.min(254, v[j] + 1); kö.push(k);
    }
  }
  const max = sjoarna(seed).rutor.map(r => { let m = 0; for (const i of r) m = Math.max(m, d[i]); return m; });
  return { d, max, land };
});
// vattnet som det är nu: under en torka är kanten av sjöarna torr sjöbotten (T.Lera) så många rutor ut som nivån säger,
// men aldrig sjöns djupaste del, och en sjö som torkat ut är lera helt. Utan torka kartans eget vatten
// Under en översvämning (flod.ts) står vattnet så många rutor upp på land som nivån säger (utom på stenarna)
const nu = new WeakMap<State, { v: number; tiles: Uint8Array; strand: Uint8Array }>();
function vattenOf(s: State) {
  const st = s.sjoTorr, fl = s.flod?.niva ?? 0, v = (st ? st.v : -1) * 4 + fl;
  let c = nu.get(s);
  if (c?.v === v) return c;
  const m = getMap(s.seed).tiles;
  let tiles = m;
  if (st && (st.niva || st.tomma.length)) {
    tiles = m.slice();
    const { d, max } = djupOf(s.seed), { id } = sjoarna(s.seed), tom = new Set(st.tomma);
    for (let i = 0; i < W * H; i++) if (m[i] === T.Vatten && (tom.has(id[i]) || d[i] <= st.niva && d[i] < max[id[i]])) tiles[i] = T.Lera;
  }
  if (fl) {
    if (tiles === m) tiles = m.slice();
    const { land } = djupOf(s.seed);
    for (let i = 0; i < W * H; i++) if (m[i] !== T.Vatten && m[i] !== T.Sten && land[i] <= fl) tiles[i] = T.Vatten;
  }
  c = { v, tiles, strand: tiles === m ? strandStart(s.seed) : strandAv(tiles) };
  nu.set(s, c);
  return c;
}
const strandStart = perKarta(seed => strandAv(getMap(seed).tiles));
export const vattenNu = (s: State) => vattenOf(s).tiles;
export const strandNu = (s: State) => vattenOf(s).strand;
// är rutan i vatten just nu (kartans vatten utom den torra sjöbottnen, och översvämningens vatten)
export const iVattnetNu = (s: State, i: number) => vattenOf(s).tiles[i] === T.Vatten;
