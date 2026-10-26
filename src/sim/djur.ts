import { FYND, fyndAt, setNarvaro, vaxerAt } from './fynd';
import { hash } from './karta';
import { clamp } from './slump';
import { living } from './folk';
import { H, HOUR, SEC, State, W, inMap, mapKey } from './typer';

// ---------- djur: kaniner i grupper ----------
// Viltlagret (fynd.ts) är kartan över var förhållandena är bra för kaniner. Själva kaninerna finns i några få små grupper
// som dyker upp där kartan är hög, håller ihop och rör sig mot en bättre plats i närheten. En grupp lever en tid (LIV) och
// dyker sedan upp på en ny plats. Den krymper när den jagas (där lagret är tömt), och en grupp som jagats slut kommer
// tillbaka först när dess tid är slut, på en ny plats. Allt räknas fram ur kartan och klockan, så att kaninerna är
// desamma i spelet och vid ikappräkning och inget behöver sparas.
// Fångsten beror på hur nära en grupp jaktplatsen är (narvaro, som fynd.ts väger in i richness).
// En kanin sitter still en stund och skuttar sedan en bit. Den som kommer nära får den att hoppa undan en bit och sitta
// still där. De enskilda kaninerna ritas bara; jakten ger mest nära en grupp (`narvaroAt`, via richness). Fler arter
// (rådjur, fågel) blir egna lager och grupper senare.
export interface Djur { id: number; art: 'kanin'; x: number; y: number }
interface Kaningrupp { id: number; x: number; y: number; n: number } // n: så många kaniner gruppen har just nu
export const GRUPPER_MAX = 4; // högst så många grupper på kartan samtidigt
export const STORLEK = [2, 6]; // kaniner i en grupp som inte jagats
const LIV = 12 * HOUR; // så länge en grupp håller till i samma trakt innan den dyker upp någon annanstans
const VANDRA = 5; // så långt (rutor) gruppen kan röra sig mot en bättre plats under sin tid
const SPRIDD = 1.4; // så långt från gruppens mitt kaninerna sitter
const SKUTT = 9 * SEC; // så ofta en kanin skuttar, ungefär
const RADD = 2.2; // så nära en människa kommer innan kaninen hoppar undan
const HOPP = 3; // så långt den hoppar undan
const NARV_R = 5; // så långt från gruppen jakten ger något
const NARV_BAS = 0.4; // fångsten långt från grupperna (en och annan kanin för sig själv), mot kartan ensam
const NARV_K = 1.6; // så mycket mer det ger mitt i en full grupp

interface Start { x0: number; y0: number; x1: number; y1: number; n0: number }
const starter = new WeakMap<State, Map<string, Start | null>>();
const tidAv = (k: number) => (k * LIV) / GRUPPER_MAX; // grupperna byter plats en i taget
const epokOf = (s: State, k: number) => Math.floor((s.now - tidAv(k)) / LIV);
// var grupp k dyker upp under sin tid e: en ruta där kartan är hög (slumpad med vikt efter kartan), en bit från de andra
// grupperna, och den bästa platsen i närheten som den rör sig mot
function start(s: State, k: number, e: number): Start | null {
  let m = starter.get(s);
  if (!m) starter.set(s, m = new Map());
  const key = `${mapKey(s.seed)},${k},${e}`;
  if (m.has(key)) return m.get(key)!;
  const topp = FYND.jakt.topp, salt = s.seed * 31 + k * 977 + e * 7919;
  const andra: { x: number; y: number }[] = [];
  for (let j = 0; j < k; j++) { const g = mitt(s, j); if (g) andra.push(g); }
  let bi = -1, bs = -Infinity;
  for (let i = 0; i < W * H; i++) {
    const v = vaxerAt(s, 'jakt', i) / topp;
    if (v < 0.3) continue;
    const x = (i % W) + 0.5, y = Math.floor(i / W) + 0.5;
    if (andra.some(a => Math.hypot(a.x - x, a.y - y) < 8)) continue;
    const sc = Math.log(hash(salt, i, 7) || 1e-9) / (v * v); // större v: större chans
    if (sc > bs) { bs = sc; bi = i; }
  }
  let st: Start | null = null;
  if (bi >= 0) {
    const x0 = bi % W, y0 = Math.floor(bi / W);
    let gi = bi, gs = -1;
    for (let dy = -VANDRA; dy <= VANDRA; dy++) for (let dx = -VANDRA; dx <= VANDRA; dx++) {
      const x = x0 + dx, y = y0 + dy;
      if (!inMap(x, y) || Math.hypot(dx, dy) > VANDRA) continue;
      const j = y * W + x, v = vaxerAt(s, 'jakt', j) * (0.8 + 0.4 * hash(salt, j, 9));
      if (v > gs) { gs = v; gi = j; }
    }
    st = { x0: x0 + 0.5, y0: y0 + 0.5, x1: (gi % W) + 0.5, y1: Math.floor(gi / W) + 0.5, n0: STORLEK[0] + Math.floor(hash(salt, 1, 3) * (STORLEK[1] - STORLEK[0] + 1)) };
  }
  if (m.size > 64) m.clear();
  m.set(key, st);
  return st;
}
// gruppens mitt just nu: den glider mot den bättre platsen under första delen av sin tid
function mitt(s: State, k: number) {
  const e = epokOf(s, k), st = start(s, k, e);
  if (!st) return undefined;
  const f = Math.min(1, ((s.now - tidAv(k)) / LIV - e) * 1.5), g = f * f * (3 - 2 * f);
  return { x: st.x0 + (st.x1 - st.x0) * g, y: st.y0 + (st.y1 - st.y0) * g, e, st };
}
// varje steg: en grupp som får en ny tid väljer sin plats direkt, så att platsen blir densamma i båda lägena
export function djurSteg(s: State) { for (let k = 0; k < GRUPPER_MAX; k++) mitt(s, k); }
// grupperna just nu. En grupp krymper där lagret är tömt (där man jagat), och är tom när det jagats slut
export function grupperOf(s: State): Kaningrupp[] {
  const ut: Kaningrupp[] = [];
  for (let k = 0; k < GRUPPER_MAX; k++) {
    const c = mitt(s, k);
    if (!c) continue;
    let har = 0, kan = 0;
    const cx = Math.floor(c.x), cy = Math.floor(c.y);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const x = cx + dx, y = cy + dy;
      if (!inMap(x, y)) continue;
      const i = y * W + x; har += fyndAt(s, 'jakt', i); kan += vaxerAt(s, 'jakt', i);
    }
    const n = kan > 0 ? Math.round(c.st.n0 * Math.min(1, har / kan)) : 0;
    ut.push({ id: c.e * GRUPPER_MAX + k, x: c.x, y: c.y, n });
  }
  return ut;
}
// hur mycket jakten ger på rutan, mot kartan: NARV_BAS långt från alla grupper, NARV_BAS + NARV_K mitt i en full grupp.
// Räknas om varje timme
const narv = new WeakMap<State, { key: string; v: Float32Array }>();
function narvaroAt(s: State, i: number) {
  const key = `${mapKey(s.seed)},${Math.floor(s.now / HOUR)}`;
  let c = narv.get(s);
  if (!c || c.key !== key) {
    const v = new Float32Array(W * H).fill(NARV_BAS);
    for (const g of grupperOf(s)) {
      if (g.n <= 0) continue;
      const w = NARV_K * g.n / STORLEK[1];
      for (let y = Math.max(0, Math.floor(g.y - NARV_R)); y <= Math.min(H - 1, Math.ceil(g.y + NARV_R)); y++)
        for (let x = Math.max(0, Math.floor(g.x - NARV_R)); x <= Math.min(W - 1, Math.ceil(g.x + NARV_R)); x++) {
          const d = Math.hypot(x + 0.5 - g.x, y + 0.5 - g.y);
          if (d < NARV_R) v[y * W + x] += w * (1 - d / NARV_R);
        }
    }
    narv.set(s, c = { key, v });
  }
  return c.v[i];
}
setNarvaro('jakt', narvaroAt);
// var kaninerna är just nu: nära gruppens mitt, ett skutt i taget, och undan från folk som kommer nära
export function djurOf(s: State): Djur[] {
  const ppl = living(s), out: Djur[] = [];
  for (const g of grupperOf(s)) for (let j = 0; j < g.n; j++) {
    const id = g.id * 8 + j, ang = hash(id, 4, 11) * Math.PI * 2, r = SPRIDD * Math.sqrt(hash(id, 5, 13));
    const hx = g.x + Math.cos(ang) * r, hy = g.y + Math.sin(ang) * r;
    const t = s.now / SKUTT + hash(id, 3, 5) * 10, k = Math.floor(t), f = t - k;
    const at = (n: number) => ({ x: hx + (hash(id, n, 1) - 0.5) * 1.2, y: hy + (hash(id, n, 2) - 0.5) * 1.2 });
    const a = at(k), b = at(k + 1), hop = f > 0.85 ? (f - 0.85) / 0.15 : 0; // sitter still, sedan ett snabbt skutt
    let x = a.x + (b.x - a.x) * hop, y = a.y + (b.y - a.y) * hop;
    // den som kommer nära får kaninen att hoppa undan en bit, rakt bort i en av åtta riktningar, och sitta still där
    for (let n = 0; n < 2; n++) {
      let near: { x: number; y: number } | undefined, nd = RADD;
      for (const p of ppl) { const d = Math.hypot(x - p.x, y - p.y); if (d < nd) { nd = d; near = p; } }
      if (!near) break;
      const v = Math.round(Math.atan2(y - near.y, x - near.x) / (Math.PI / 4)) * (Math.PI / 4);
      x += Math.cos(v) * HOPP; y += Math.sin(v) * HOPP;
    }
    out.push({ id, art: 'kanin', x: clamp(x, 0.2, W - 0.2), y: clamp(y, 0.2, H - 0.2) });
  }
  return out;
}
