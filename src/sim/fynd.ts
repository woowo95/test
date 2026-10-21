import { campCenter, campDist } from './plats';
import { count, stat, log, think } from './folk';
import { getMap, hash } from './karta';
import { groundOf } from './mark';
import { sedEvent } from './seder';
import { chance, clamp, rnd } from './slump';
import { kn, learnK, useK } from './kunskap';
import { ageIndex } from './tid';
import { DAY, H, HOUR, Person, State, T, W, inMap } from './typer';
import { BAR, FOREST, HIGH, isSoil } from './vag';

// ---------- fynd: mat och saker finns på olika platser ----------
// Varje ruta har en egen rikedom av bär och rötter, vilt och fisk. Den som samlar, jagar eller fiskar tar ur platsen,
// och den växer långsamt tillbaka. Därför går invånarna vidare till nya platser när det tar slut nära byn.
export type Kind = 'samla' | 'jakt' | 'fiske';
export const KINDS: Kind[] = ['samla', 'jakt', 'fiske'];
const FULL: Record<Kind, number> = { samla: 1.2, jakt: 6, fiske: 4 }; // så mycket mat en full plats ger innan den är tom
const REACH: Record<Kind, number> = { samla: 1, jakt: 3, fiske: 1 }; // vilt springer: jakt tömmer ett större område
// hur fort en plats växer tillbaka, del per timme och tidsålder (istid, vår, sommar, höst).
// Bären mognar fortast på sommaren och hösten, så buskarna bär igen även där man plockat.
const REGROW: Record<Kind, number[]> = { samla: [0, 1 / 70, 1 / 24, 1 / 32], jakt: [1 / 300, 1 / 160, 1 / 160, 1 / 200], fiske: [1 / 300, 1 / 100, 1 / 100, 1 / 140] };

const store = new WeakMap<State, Record<Kind, Float32Array>>();
// uttag per ruta: 0 = orörd, 1 = tom
export function takenOf(s: State) {
  let d = store.get(s);
  if (!d) {
    d = { samla: new Float32Array(W * H), jakt: new Float32Array(W * H), fiske: new Float32Array(W * H) };
    if (s.fynd) try {
      const bin = atob(s.fynd);
      KINDS.forEach((k, j) => { for (let i = 0; i < W * H && j * W * H + i < bin.length; i++) d![k][i] = bin.charCodeAt(j * W * H + i) / 255; });
    } catch { /* ny mark */ }
    store.set(s, d);
  }
  return d;
}
export function packFynd(s: State) {
  const d = takenOf(s);
  let bin = '';
  for (const k of KINDS) for (let i = 0; i < W * H; i++) bin += String.fromCharCode(Math.round(clamp(d[k][i], 0, 1) * 255));
  s.fynd = btoa(bin);
}

const shoreCache = new Map<number, Uint8Array>();
// strand: land intill vatten, där man kan fiska
export function shoreOf(seed: number) {
  let b = shoreCache.get(seed);
  if (b) return b;
  const t = getMap(seed).tiles; b = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (t[y * W + x] === T.Vatten) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (inMap(xx, yy) && t[yy * W + xx] === T.Vatten) b[y * W + x] = 1; }
  }
  shoreCache.set(seed, b);
  return b;
}
const stoneCache = new Map<number, Uint8Array>();
// avstånd i rutor till närmaste sten (högst 9)
export function stoneDist(seed: number) {
  let b = stoneCache.get(seed);
  if (b) return b;
  const t = getMap(seed).tiles; b = new Uint8Array(W * H).fill(9);
  for (let i = 0; i < W * H; i++) if (t[i] === T.Sten) {
    const x0 = i % W, y0 = Math.floor(i / W);
    for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
      const x = x0 + dx, y = y0 + dy;
      if (inMap(x, y)) b[y * W + x] = Math.min(b[y * W + x], Math.round(Math.hypot(dx, dy)));
    }
  }
  stoneCache.set(seed, b);
  return b;
}

// hur mycket en orörd ruta ger: bär i högt gräs och på hyggen, svamp och blåbär i skogen, vilt i skogen, fisk vid stranden
export function capOf(s: State, k: Kind, i: number) {
  const g = groundOf(s), t = g.tiles[i], x = i % W, y = Math.floor(i / W);
  const v = 0.6 + 0.8 * hash(s.seed + (k === 'samla' ? 71 : k === 'jakt' ? 73 : 79), x >> 1, y >> 1); // rikare och fattigare fläckar
  if (k === 'fiske') return shoreOf(s.seed)[i] ? v : 0;
  if (!isSoil(t)) return 0;
  const tr = g.trees[i], c = g.cover[i];
  if (k === 'jakt') return v * (tr >= FOREST ? 1 : tr > 0 || c >= HIGH ? 0.45 : 0.1);
  return v * (tr >= FOREST ? 0.7 : tr >= 0.15 ? 1.1 : c >= HIGH ? 1 : c >= BAR ? 0.5 : 0.15);
}
// vad platsen ger just nu, 0 = inget
export function richness(s: State, k: Kind, x: number, y: number) {
  const i = Math.floor(clamp(y, 0, H - 1)) * W + Math.floor(clamp(x, 0, W - 1));
  return capOf(s, k, i) * (1 - takenOf(s)[k][i]);
}
// ta mat ur en plats: mest ur rutan, lite ur grannarna
export function takeFrom(s: State, k: Kind, x: number, y: number, amount: number) {
  const d = takenOf(s)[k], r = REACH[k], cx = Math.floor(x), cy = Math.floor(y);
  let sum = 0;
  const w = (dx: number, dy: number) => Math.max(0, 1 - Math.hypot(dx, dy) / (r + 1));
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) sum += w(dx, dy);
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const xx = cx + dx, yy = cy + dy;
    if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
    const i = yy * W + xx;
    d[i] = Math.min(1, d[i] + amount * w(dx, dy) / sum * (r + 1) / FULL[k]);
  }
}
// en timme: platserna växer tillbaka
export function growFynd(s: State, hours: number, season: number) {
  const d = takenOf(s);
  for (const k of KINDS) {
    const f = Math.exp(-REGROW[k][season] * hours), a = d[k];
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
// fiske med händerna ger ungefär så mycket som insamling på en lagom rik plats gånger detta
export const HAND_FISH = 0.55;

// ---------- flinta ----------
// flinta hittas oftast vid stenarna, ibland i sanden vid stranden och sällan annars
export function flintFactor(s: State, x: number, y: number) {
  const i = Math.floor(clamp(y, 0, H - 1)) * W + Math.floor(clamp(x, 0, W - 1));
  return stoneDist(s.seed)[i] <= 2 ? 4 : getMap(s.seed).tiles[i] === T.Sand ? 1.5 : 0.4;
}
// byn behöver flinta till en yxa
export const wantsFlint = (s: State) => (s.items.flinta ?? 0) + (s.items.yxa ?? 0) < 1;
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
const SVAMP_SEASON = [0, 0.15, 0.8, 1.5];
export const GIFT = 'giftsvamp'; // giftig svamp som av misstag hamnat i förrådet (syns inte för invånarna)
// svamp som hittas under en stund av insamling i skogen; ger hur mycket ätlig mat som hittades
export function pickMushrooms(s: State, p: Person, x: number, y: number, dtSec: number, got: Record<string, number>) {
  const g = groundOf(s), i = Math.floor(y) * W + Math.floor(x);
  if (!isSoil(g.tiles[i]) || g.trees[i] < 0.15) return 0;
  const rate = 0.5 * SVAMP_SEASON[ageIndex(s)] * (0.6 + p.skill.samla / 25) * Math.max(0.2, richness(s, 'samla', x, y));
  if (!chance(s, rate / 3600, dtSec)) return 0;
  takeFrom(s, 'samla', x, y, 0.5);
  if (rnd(s) < 0.7) {
    count(s, 'svamp');
    if (!s.stat!.svamp1) { s.stat!.svamp1 = 1; log(s, `${p.name} hittade kantareller i skogen.`, 'world', [p.id]); }
    return 1;
  }
  // den giftiga: känner man igen den låter man den stå
  const sure = clamp(kn(p, 'svamp') + p.skill.samla / 40 + stat(p, 'intelligens', s.now) / 100, 0, 0.98);
  if (rnd(s) < sure) { count(s, 'giftsvampKand'); useK(p, 'svamp', s.now); return 0; }
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
export function handFish(s: State, p: Person, x: number, y: number, ageF: number, spear = false) {
  const st = (p.fiske ??= { f: 0, n: 0, k: 0 });
  st.f++; count(s, 'fiskeForsok'); if (spear) count(s, 'spjutForsok');
  const ai = ageIndex(s), season = [0.45, 1, 1.1, 1][ai];
  if (rnd(s) >= (spear ? 0.13 : 0.08) * season * Math.min(1.3, richness(s, 'fiske', x, y)) * ageF) return 0;
  st.n++; count(s, 'fiskeNapp');
  const hold = (spear ? 0.5 : 0.2) + p.skill.fiske / 40 + stat(p, 'uthallighet', s.now) / 100;
  if (rnd(s) >= hold) return 0;
  st.k++; count(s, 'fisk'); if (spear) count(s, 'spjutFisk');
  takeFrom(s, 'fiske', x, y, 1);
  if (s.stat!.fisk === 1) log(s, `${p.name} fångade byns första fisk ${spear ? 'med spjut' : 'med händerna'}, efter ${s.stat!.fiskeForsok} försök.`, 'world', [p.id]);
  return 1;
}
