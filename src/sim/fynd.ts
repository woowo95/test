import { campCenter, campDist } from './plats';
import { count, stat, log, think } from './folk';
import { getMap, hash, vnoise } from './karta';
import { groundOf } from './mark';
import { sedEvent } from './seder';
import { chance, clamp, rnd } from './slump';
import { kn, learnK, useK } from './kunskap';
import { ageIndex } from './tid';
import { DAY, H, HOUR, Person, State, T, W, inMap, mapKey } from './typer';
import { BAR, FOREST, HIGH, isSoil } from './vag';

// ---------- fynd: mat och saker finns på olika platser ----------
// Varje ruta har en egen rikedom av bär, rötter, vilt och fisk. Den som samlar, jagar eller fiskar tar ur platsen,
// och den växer långsamt tillbaka. Därför går invånarna vidare till nya platser när det tar slut nära byn.
export type Kind = 'samla' | 'jakt' | 'fiske';
export const KINDS: Kind[] = ['samla', 'jakt', 'fiske'];

// ---------- värmekartor: ett lager per sorts resurs ----------
// Varje lager har ett värde per ruta: hur mycket som finns där just nu. Det är sanningen; vad invånarna tror står i
// deras lärdomar (minne.ts). Två saker hålls isär: var det växer (marken gånger ett dolt mönster som sakta kryper
// över kartan) och hur mycket som finns kvar just nu (uttaget, som växer tillbaka efter årstiden).
// Ett nytt lager är en ny rad i FYND. Filtret på kartan, rutan i hörnet och sparningen följer med.
export type Grupp = 'vaxter' | 'djur' | 'sten';
// filtren på kartan: varje grupp visar alla sina lager samtidigt, ett i taget med egen färg
export const GRUPPER: Record<Grupp, { namn: string; ikon: string }> = {
  vaxter: { namn: 'Växter', ikon: 'bar' },
  djur: { namn: 'Djur', ikon: 'kanin' },
  sten: { namn: 'Sten', ikon: 'flinta' },
};
interface Uttag {
  full: number; // så mycket en full plats ger innan den är tom
  reach: number; // hur stort område ett uttag tömmer (vilt springer)
  regrow: number[]; // hur fort platsen växer tillbaka, del per timme och tidsålder (istid, vår, sommar, höst)
}
// Var på marken det växer: fläckar av slumpat brus som sakta byter form. Under tröskeln växer inget.
interface Monster {
  salt: number;
  skala: number; // fläckarnas storlek i rutor
  period: number; // dygn tills mönstret bytts ut (fläckar kryper, krymper, försvinner och dyker upp); 0 = står still
  troskel: number; // 0–1, högre = mindre och färre fläckar
  gles?: number; // del av rutorna i en fläck där det växer (svamp står utspridd)
}
interface FyndDef {
  namn: string;
  grupp: Grupp;
  ikon: string;
  farg: number; // färgen i filtret
  topp: number; // ungefär vad en mycket rik ruta har; full färg i filtret
  // vad en orörd ruta ger: m är mönstret (0–1) på rutan. Med mönstrets snitt i stället blir det vad marken
  // ser ut att kunna ge för den som inte varit där (skog, äng, vatten syns på håll, fläckarna gör det inte).
  bas(s: State, i: number, m: number): number;
  monster?: Monster;
  arstid?: number[]; // hur mycket som finns per tidsålder (istid, vår, sommar, höst), annars lika året om
  uttag?: Uttag;
  vatten?: number; // lagret finns i vattnet; man står på stranden och når så många rutor ut
}
const SVAMP_SEASON = [0, 0.15, 0.8, 1.5];
const SVAMP_UTTAG: Uttag = { full: 2.5, reach: 1, regrow: [1 / 400, 1 / 150, 1 / 40, 1 / 40] };
const land = (s: State, i: number) => isSoil(groundOf(s).tiles[i]);
// Ordningen bland lagren med uttag är ordningen i sparfilen: nya lager med uttag läggs sist.
const DEF = {
  // bärbuskar i små täta snår i skog och högt gräs; de flyttar sig mycket långsamt. Inga bär i istiden
  bar: {
    namn: 'Bär', grupp: 'vaxter', ikon: 'bar', farg: 0x9a5cff, topp: 3, arstid: [0, 0.5, 1, 1.15],
    monster: { salt: 71, skala: 2.5, period: 56, troskel: 0.68 },
    bas(s, i, m) {
      if (!land(s, i)) return 0;
      const g = groundOf(s), tr = g.trees[i];
      return (tr >= FOREST ? 0.8 : tr >= 0.15 || g.cover[i] >= HIGH ? 1 : 0) * 4 * m;
    },
    uttag: { full: 1.2, reach: 1, regrow: [0, 1 / 70, 1 / 24, 1 / 32] },
  },
  // kaniner trivs bäst i gräs, högt eller lågt, men finns också i skogen. Glest över stora områden som vandrar
  jakt: {
    namn: 'Kaniner', grupp: 'djur', ikon: 'kanin', farg: 0xc89a60, topp: 1.4,
    monster: { salt: 73, skala: 7, period: 7, troskel: 0.25 },
    bas(s, i, m) {
      if (!land(s, i)) return 0;
      const g = groundOf(s), tr = g.trees[i];
      return (tr >= FOREST ? 0.85 : tr >= 0.15 ? 0.9 : g.cover[i] >= BAR ? 1 : 0.3) * (0.15 + 1.3 * m) * skyggOf(s)[i];
    },
    uttag: { full: 6, reach: 3, regrow: [1 / 400, 1 / 240, 1 / 240, 1 / 300] },
  },
  // fisken har sina favoritplatser i vattnet. Man fiskar från stranden och når ett par rutor ut
  fiske: {
    namn: 'Fisk', grupp: 'djur', ikon: 'fisk', farg: 0x2f7fd0, topp: 1.6, vatten: 2,
    monster: { salt: 79, skala: 3, period: 14, troskel: 0.3 },
    bas: (s, i, m) => getMap(s.seed).tiles[i] === T.Vatten ? 0.5 + 1.4 * m : 0,
    uttag: { full: 3, reach: 1, regrow: [1 / 300, 1 / 100, 1 / 100, 1 / 140] },
  },
  // kantarellen växer bara i skogen, utspridd över större områden som vandrar långsamt. Mest på hösten
  kantarell: {
    namn: 'Kantarell', grupp: 'vaxter', ikon: 'svamp', farg: 0xffd21f, topp: 0.8, arstid: SVAMP_SEASON,
    monster: { salt: 83, skala: 8, period: 28, troskel: 0.3, gles: 0.5 },
    bas: (s, i, m) => land(s, i) && groundOf(s).trees[i] >= FOREST ? 0.9 * m : 0,
    uttag: SVAMP_UTTAG,
  },
  // den giftiga orangea spindlingen liknar kantarellen. Den har egna områden som kan gå in i kantarellens
  spindling: {
    namn: 'Orange spindling (giftig)', grupp: 'vaxter', ikon: 'spindling', farg: 0xff2d6f, topp: 0.8, arstid: SVAMP_SEASON,
    monster: { salt: 89, skala: 8, period: 28, troskel: 0.4, gles: 0.35 },
    bas: (s, i, m) => land(s, i) && groundOf(s).trees[i] >= FOREST ? 0.9 * m : 0,
    uttag: SVAMP_UTTAG,
  },
  // flinta vid stenarna, ibland i sanden vid stranden och sällan annars. Den växer sakta tillbaka och flyttar sig aldrig
  flinta: {
    namn: 'Flinta', grupp: 'sten', ikon: 'flinta', farg: 0xe8eef2, topp: 4,
    bas: (s, i) => getMap(s.seed).tiles[i] === T.Vatten ? 0 : stoneDist(s.seed)[i] <= 2 ? 4 : getMap(s.seed).tiles[i] === T.Sand ? 1.5 : 0.4,
    uttag: { full: 2, reach: 1, regrow: [1 / 500, 1 / 300, 1 / 300, 1 / 300] },
  },
  // rötter finns mycket glest men nästan överallt på jorden. De ger minst, men finns kvar i istiden när bär och svamp är borta
  rotter: {
    namn: 'Rötter', grupp: 'vaxter', ikon: 'rotter', farg: 0xf2d9a0, topp: 0.5, arstid: [0.6, 1, 0.8, 1],
    monster: { salt: 97, skala: 3, period: 84, troskel: 0, gles: 0.25 },
    bas(s, i, m) {
      if (!land(s, i)) return 0;
      const g = groundOf(s), c = g.cover[i];
      return (g.trees[i] >= 0.15 || c >= HIGH ? 0.5 : c >= BAR ? 0.4 : 0.1) * m;
    },
    uttag: { full: 0.6, reach: 1, regrow: [1 / 200, 1 / 60, 1 / 60, 1 / 80] },
  },
} satisfies Record<string, FyndDef>;
export type FyndId = keyof typeof DEF;
export const FYND: Record<FyndId, FyndDef> = DEF;
export const FYND_IDS = Object.keys(FYND) as FyndId[];
const UTTAG_IDS = FYND_IDS.filter(k => FYND[k].uttag);
// en handling kan ta ur flera lager: den som samlar tar både bär och rötter
export type Lager = FyndId | Kind;
const LAGREN: Partial<Record<Lager, FyndId[]>> = { samla: ['bar', 'rotter'] };
export const lagren = (k: Lager): FyndId[] => LAGREN[k] ?? [k as FyndId];
const summa = (k: Lager, fn: (j: FyndId) => number) => { let v = 0; for (const j of lagren(k)) v += fn(j); return v; };
// ungefär vad en mycket rik ruta har, och hur fort platsen växer tillbaka (det snabbaste lagret)
export const toppOf = (k: Lager) => summa(k, j => FYND[j].topp);
export const regrowOf = (k: Lager, ai: number) => Math.max(...lagren(k).map(j => FYND[j].uttag?.regrow[ai] ?? 0));

// mönstret räknas om en gång per dygn (det kryper långsamt) och är detsamma i levande läge och snabbläget
const monstren = new WeakMap<State, { dag: number; v: Partial<Record<FyndId, { m: Float32Array; snitt: number }>> }>();
function monsterOf(s: State, k: FyndId) {
  const dag = Math.floor(s.now / DAY);
  let c = monstren.get(s);
  if (!c || c.dag !== dag) { c = { dag, v: {} }; monstren.set(s, c); }
  let e = c.v[k];
  if (!e) {
    const mo = FYND[k].monster!, m = new Float32Array(W * H), seed = s.seed + mo.salt * 101;
    const t = mo.period ? dag / mo.period : 0, t0 = Math.floor(t), ft = t - t0, st = ft * ft * (3 - 2 * ft);
    let sum = 0;
    for (let i = 0; i < W * H; i++) {
      // två mönster tonas över i varandra medan de glider lite åt var sitt håll
      const x = (i % W) / mo.skala, y = Math.floor(i / W) / mo.skala;
      const a = vnoise(seed + t0 * 7919, x + ft * 0.6, y), b = vnoise(seed + (t0 + 1) * 7919, x - (1 - ft) * 0.6, y);
      let v = Math.max(0, (a + (b - a) * st - mo.troskel) / (1 - mo.troskel));
      if (mo.gles !== undefined && hash(seed + 3, i % W, Math.floor(i / W)) > mo.gles) v *= 0.15;
      m[i] = Math.min(1, v * 1.6);
      sum += m[i];
    }
    e = c.v[k] = { m, snitt: sum / (W * H) };
  }
  return e;
}
// i byns läger växer inget: allt är redan hämtat och marken nött. Lägret växer när byn får fler lagerplatser
export const LAGER_R = 3;
const iLagret = (s: State, i: number) => campDist(s, i % W, Math.floor(i / W)) < LAGER_R && getMap(s.seed).tiles[i] !== T.Vatten;
// vilt skyr människor: ett stort område runt lägret, och marken där många går (stigar och nött mark).
// Räknas om en gång per dygn.
export const SKYGG_R = 7; // rutor utanför lägret innan vilt vågar sig fram helt
const skygghet = new WeakMap<State, { dag: number; v: Float32Array }>();
export function skyggOf(s: State) {
  const dag = Math.floor(s.now / DAY);
  let c = skygghet.get(s);
  if (c?.dag === dag) return c.v;
  const g = groundOf(s), v = new Float32Array(W * H), nott = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) nott[i] = isSoil(g.tiles[i]) && g.trees[i] < 0.15 && g.cover[i] < BAR ? 1 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = clamp((campDist(s, x, y) - LAGER_R) / SKYGG_R, 0, 1);
    let n = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (inMap(x + dx, y + dy)) n += nott[(y + dy) * W + x + dx];
    v[y * W + x] = d * d * (3 - 2 * d) * (1 - Math.min(0.8, n / 10));
  }
  skygghet.set(s, c = { dag, v });
  return v;
}
// vad en orörd ruta ger nu (utan årstid och uttag)
export function capOf(s: State, k: FyndId, i: number) {
  if (iLagret(s, i)) return 0;
  const f = FYND[k];
  return f.bas(s, i, f.monster ? monsterOf(s, k).m[i] : 1);
}
// vad rutan ser ut att kunna ge på håll: marken syns, men inte var fläckarna är
export function synsOf(s: State, k: Lager, i: number): number {
  if (iLagret(s, i)) return 0;
  return summa(k, j => { const f = FYND[j]; return f.bas(s, i, f.monster ? monsterOf(s, j).snitt : 1) * sasong(s, j); });
}
const sasong = (s: State, k: FyndId) => FYND[k].arstid?.[ageIndex(s)] ?? 1;
// var det växer just nu, med årstiden men utan uttaget: det man ser av buskar och spår även när det är plockat
export const vaxerAt = (s: State, k: Lager, i: number) => summa(k, j => capOf(s, j, i) * sasong(s, j));
const store = new WeakMap<State, Partial<Record<FyndId, Float32Array>>>();
// uttag per ruta: 0 = orörd, 1 = tom
export function takenOf(s: State) {
  let d = store.get(s);
  if (!d) {
    d = {};
    for (const k of UTTAG_IDS) d[k] = new Float32Array(W * H);
    if (s.fynd) try {
      const bin = atob(s.fynd);
      UTTAG_IDS.forEach((k, j) => { for (let i = 0; i < W * H && j * W * H + i < bin.length; i++) d![k]![i] = bin.charCodeAt(j * W * H + i) / 255; });
    } catch { /* ny mark */ }
    store.set(s, d);
  }
  return d;
}
export function packFynd(s: State) {
  const d = takenOf(s);
  let bin = '';
  for (const k of UTTAG_IDS) for (let i = 0; i < W * H; i++) bin += String.fromCharCode(Math.round(clamp(d[k]![i], 0, 1) * 255));
  s.fynd = btoa(bin);
}

const shoreCache = new Map<string, Uint8Array>();
// strand: land intill vatten, där man kan fiska
export function shoreOf(seed: number) {
  let b = shoreCache.get(mapKey(seed));
  if (b) return b;
  const t = getMap(seed).tiles; b = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (t[y * W + x] === T.Vatten) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (inMap(xx, yy) && t[yy * W + xx] === T.Vatten) b[y * W + x] = 1; }
  }
  shoreCache.set(mapKey(seed), b);
  return b;
}
const stoneCache = new Map<string, Uint8Array>();
// avstånd i rutor till närmaste sten (högst 9)
export function stoneDist(seed: number) {
  let b = stoneCache.get(mapKey(seed));
  if (b) return b;
  const t = getMap(seed).tiles; b = new Uint8Array(W * H).fill(9);
  for (let i = 0; i < W * H; i++) if (t[i] === T.Sten) {
    const x0 = i % W, y0 = Math.floor(i / W);
    for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
      const x = x0 + dx, y = y0 + dy;
      if (inMap(x, y)) b[y * W + x] = Math.min(b[y * W + x], Math.round(Math.hypot(dx, dy)));
    }
  }
  stoneCache.set(mapKey(seed), b);
  return b;
}

// vad lagret har på rutan just nu: det filtret visar
export function fyndAt(s: State, k: Lager, i: number) {
  const d = takenOf(s);
  return summa(k, j => { const t = d[j]; return vaxerAt(s, j, i) * (t ? 1 - t[i] : 1); });
}
// rutorna i vattnet som man når från stranden, med vikt efter avståndet
function vattenRunt(s: State, k: FyndId, cx: number, cy: number, fn: (i: number, w: number) => void) {
  const r = FYND[k].vatten!, tiles = getMap(s.seed).tiles;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = cx + dx, y = cy + dy, w = 1 - Math.hypot(dx, dy) / (r + 1);
    if (w > 0 && inMap(x, y) && tiles[y * W + x] === T.Vatten) fn(y * W + x, w);
  }
}
// vad den som står på rutan når av ett mått per ruta (fn). För fisk: snittet ute i vattnet framför stranden
export function standAt(s: State, k: Lager, x: number, y: number, fn: (i: number) => number) {
  const cx = Math.floor(clamp(x, 0, W - 1)), cy = Math.floor(clamp(y, 0, H - 1)), i = cy * W + cx;
  if (!FYND[lagren(k)[0]].vatten) return fn(i);
  if (getMap(s.seed).tiles[i] === T.Vatten) return 0;
  let sum = 0, n = 0;
  vattenRunt(s, lagren(k)[0], cx, cy, (j, w) => { sum += fn(j) * w; n += w; });
  return n ? sum / n : 0;
}
// vad platsen ger den som står där just nu, 0 = inget
export const richness = (s: State, k: Lager, x: number, y: number) => standAt(s, k, x, y, i => fyndAt(s, k, i));
// ta ur en plats: mest ur rutan, lite ur grannarna. Fisk tas ur vattnet framför stranden.
// Tar man ur flera lager (bär och rötter) delas uttaget efter hur mycket av vart och ett som finns där.
export function takeFrom(s: State, k: Lager, x: number, y: number, amount: number) {
  const ls = lagren(k);
  if (ls.length > 1) {
    const r = ls.map(j => richness(s, j, x, y)), sum = r.reduce((a, b) => a + b, 0);
    if (sum > 0) ls.forEach((j, n) => { if (r[n] > 0) takeFrom(s, j, x, y, amount * r[n] / sum); });
    return;
  }
  k = ls[0];
  const d = takenOf(s)[k], u = FYND[k].uttag;
  if (!d || !u) return;
  const cx = Math.floor(x), cy = Math.floor(y);
  if (FYND[k].vatten) {
    let n = 0;
    vattenRunt(s, k, cx, cy, (_, w) => { n += w; });
    if (n) vattenRunt(s, k, cx, cy, (j, w) => { d[j] = Math.min(1, d[j] + amount * w / n / u.full); });
    return;
  }
  const r = u.reach;
  let sum = 0;
  const w = (dx: number, dy: number) => Math.max(0, 1 - Math.hypot(dx, dy) / (r + 1));
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) sum += w(dx, dy);
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const xx = cx + dx, yy = cy + dy;
    if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
    const i = yy * W + xx;
    d[i] = Math.min(1, d[i] + amount * w(dx, dy) / sum * (r + 1) / u.full);
  }
}
// en timme: platserna växer tillbaka
export function growFynd(s: State, hours: number, season: number) {
  const d = takenOf(s);
  for (const k of UTTAG_IDS) {
    const f = Math.exp(-FYND[k].uttag!.regrow[season] * hours), a = d[k]!;
    if (f < 1) for (let i = 0; i < a.length; i++) if (a[i] > 0) a[i] = a[i] * f < 0.004 ? 0 : a[i] * f;
  }
}
// hur mycket de bästa platserna inom räckhåll ger just nu (snitt av de tio bästa), räknas om en gång i timmen
const prospects = new WeakMap<State, { hr: number; v: Partial<Record<string, number>> }>();
export function prospect(s: State, k: Kind, r = 99) {
  const hr = Math.floor(s.now / HOUR);
  let c = prospects.get(s);
  if (!c || c.hr !== hr) { c = { hr, v: {} }; prospects.set(s, c); }
  const key = k + r;
  if (c.v[key] === undefined) {
    const f = campCenter(s), top: number[] = [];
    for (let y = Math.max(0, f.y - 13); y < Math.min(H, f.y + 14); y++) for (let x = Math.max(0, f.x - 17); x < Math.min(W, f.x + 18); x++) {
      const d = campDist(s, x, y);
      if (d > r) continue;
      const v = richness(s, k, x + 0.5, y + 0.5) - d * 0.03;
      if (v > 0) top.push(v);
    }
    top.sort((a, b) => b - a);
    const n = Math.min(10, top.length);
    c.v[key] = n ? top.slice(0, n).reduce((a, b) => a + b, 0) / n : 0;
  }
  return c.v[key]!;
}
// fiske med händerna ger ungefär så mycket som samling på en lagom rik plats gånger detta
export const HAND_FISH = 0.55;

// ---------- flinta ----------
// flinta hittas oftast vid stenarna, ibland i sanden vid stranden och sällan annars
// hur lätt det är att hitta flinta på platsen just nu: platser där man hittat flinta har mindre kvar ett tag
export const flintFactor = (s: State, x: number, y: number) => richness(s, 'flinta', x, y);
// byn behöver flinta att tända eld med och till en yxa
export const wantsFlint = (s: State) => (s.items.flinta ?? 0) < 1 || (s.items.flinta ?? 0) + (s.items.yxa ?? 0) < 2;
// en plats att samla på nära stenarna, där flinta är vanlig
export function flintSpot(s: State, area?: (x: number, y: number) => boolean): { x: number; y: number } | undefined {
  const m = getMap(s.seed), sd = stoneDist(s.seed), c: { x: number; y: number; d: number }[] = [];
  for (let i = 0; i < W * H; i++) {
    if (sd[i] < 1 || sd[i] > 2 || m.tiles[i] === T.Vatten || m.tiles[i] === T.Sten) continue;
    const x = i % W, y = Math.floor(i / W), d = campDist(s, x, y);
    if (d < 30 && (!area || area(x, y))) c.push({ x, y, d });
  }
  if (!c.length) return undefined;
  c.sort((a, b) => a.d - b.d);
  const p = c[Math.floor(rnd(s) * Math.min(8, c.length))];
  return { x: p.x + 0.5, y: p.y + 0.5 };
}

// ---------- räknare ----------

// ---------- svamp ----------
// Kantarellen är god. Den orangea spindlingen liknar den men är giftig. Den som blir förgiftad lär sig skilja dem åt
// och kan sedan lära andra (kunskap.ts, minne.ts).
export const GIFT = 'giftsvamp'; // giftig svamp som av misstag hamnat i förrådet (syns inte för invånarna)
// svamp som hittas under en stund av samling i skogen; ger hur mycket ätlig mat som hittades.
// Kantarellen och spindlingen har var sitt lager, så de växer på olika ställen.
export function pickMushrooms(s: State, p: Person, x: number, y: number, dtSec: number, got: Record<string, number>) {
  const kv = richness(s, 'kantarell', x, y), gv = richness(s, 'spindling', x, y);
  if (kv + gv <= 0) return 0;
  const rate = 0.5 * (0.6 + p.skill.samla / 25) * (kv + gv);
  if (!chance(s, rate / 3600, dtSec)) return 0;
  if (rnd(s) < kv / (kv + gv)) {
    takeFrom(s, 'kantarell', x, y, 0.5);
    count(s, 'svamp');
    if (!s.stat!.svamp1) { s.stat!.svamp1 = 1; log(s, `${p.name} hittade kantareller i skogen.`, 'world', [p.id]); }
    return 1;
  }
  // den giftiga: känner man igen den låter man den stå
  const sure = clamp(kn(p, 'svamp') + p.skill.samla / 40 + stat(p, 'intelligens', s.now) / 100, 0, 0.98);
  if (rnd(s) < sure) { count(s, 'giftsvampKand'); useK(p, 'svamp', s.now); return 0; }
  takeFrom(s, 'spindling', x, y, 0.5);
  count(s, GIFT);
  got[GIFT] = (got[GIFT] ?? 0) + 1;
  return 1; // den ser ut som mat och läggs i förrådet
}
// när någon äter: finns giftig svamp i förrådet kan hen få i sig den
export function eatPoison(s: State, p: Person) {
  const gift = s.items[GIFT] ?? 0;
  if (gift < 1 || rnd(s) >= Math.min(0.6, gift / Math.max(1, s.food) * 4)) return;
  s.items[GIFT] = gift - 1;
  count(s, 'forgiftad');
  p.sickUntil = Math.max(p.sickUntil ?? 0, s.now + (6 + rnd(s) * 10) * HOUR);
  p.poisonUntil = p.sickUntil; p.sickWhy = 'Förgiftad av svamp';
  p.health = clamp(p.health - 0.25, 0, 1);
  think(p, 'Blev förgiftad av en svamp', -0.3, s.now, DAY / 2);
  const before = kn(p, 'svamp'), v = learnK(p, 'svamp', 0.4, s.now);
  log(s, `${p.name} blev förgiftad av svamp ur förrådet.`, 'world', [p.id]);
  if ((s.stat!.forgiftad ?? 0) <= 1) {
    log(s, 'Byn misstänker att en av svamparna är giftig.', 'world');
    sedEvent(s, 'forsiktighet', 0.05, 'Någon blev förgiftad av svamp. Byn har blivit försiktigare med vad den äter.');
  }
  if (before < 0.75 && v >= 0.75) log(s, `${p.name} har lärt sig skilja kantarellen från den giftiga orangea spindlingen.`, 'skill', [p.id]);
  // det hen nu vet: den giftiga svampen sorteras bort ur förrådet
  s.items[GIFT] = (s.items[GIFT] ?? 0) * (1 - v);
}

// ---------- fiske med händerna ----------
// Man står i strandkanten och försöker gripa fisken. Ett försök tar fem minuter. Ibland nappar det, alltså att man
// får tag i en fisk, men oftast slinker den ur händerna. Skickliga fiskare håller fast oftare.
export const TRY_SEC = 300;
// Med fiskespjut träffar man fisken oftare och den sitter kvar på spjutet.
export const SPEAR_FISH = 2.4; // ungefär så mycket mer ett spjut ger än händerna
// med metspö nappar fisken oftare och sitter kvar bättre på kroken (masken grävs fram i steg.ts)
export type Fiskedon = 'hand' | 'spjut' | 'metspo';
const NAPP: Record<Fiskedon, number> = { hand: 0.08, spjut: 0.13, metspo: 0.17 }, HALL: Record<Fiskedon, number> = { hand: 0.2, spjut: 0.5, metspo: 0.65 };
export function handFish(s: State, p: Person, x: number, y: number, ageF: number, gear: Fiskedon = 'hand') {
  const st = (p.fiske ??= { f: 0, n: 0, k: 0 }), spear = gear === 'spjut';
  st.f++; count(s, 'fiskeForsok'); if (spear) count(s, 'spjutForsok'); if (gear === 'metspo') count(s, 'metForsok');
  const ai = ageIndex(s), season = [0.45, 1, 1.1, 1][ai];
  if (rnd(s) >= NAPP[gear] * season * Math.min(1.3, richness(s, 'fiske', x, y)) * ageF) return 0;
  st.n++; count(s, 'fiskeNapp');
  const hold = HALL[gear] + p.skill.fiske / 40 + stat(p, 'uthallighet', s.now) / 100;
  if (rnd(s) >= hold) return 0;
  st.k++; count(s, 'fisk'); if (spear) count(s, 'spjutFisk'); if (gear === 'metspo') count(s, 'metFisk');
  takeFrom(s, 'fiske', x, y, 1);
  if (s.stat!.fisk === 1) log(s, `${p.name} fångade byns första fisk ${spear ? 'med spjut' : gear === 'metspo' ? 'med metspö' : 'med händerna'}, efter ${s.stat!.fiskeForsok} försök.`, 'world', [p.id]);
  return 1;
}
