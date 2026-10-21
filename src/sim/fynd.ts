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

// ---------- värmekartor: ett lager per sorts resurs ----------
// Varje lager har ett värde per ruta: hur mycket som finns där just nu. Det är sanningen; vad invånarna tror står i
// deras lärdomar (minne.ts). Ett lager med uttag töms där man tar och växer tillbaka efter årstiden.
// Ett nytt lager är en ny rad i FYND. Filtret på kartan, rutan i hörnet och sparningen följer med.
export type Grupp = 'vaxter' | 'djur' | 'sten';
// filtren på kartan: varje grupp visar alla sina lager samtidigt, ett i taget med egen färg
export const GRUPPER: Record<Grupp, { namn: string; ikon: string }> = {
  vaxter: { namn: 'Växter', ikon: 'bar' },
  djur: { namn: 'Djur', ikon: 'kott' },
  sten: { namn: 'Sten', ikon: 'flinta' },
};
interface Uttag {
  full: number; // så mycket en full plats ger innan den är tom
  reach: number; // hur stort område ett uttag tömmer (vilt springer)
  regrow: number[]; // hur fort platsen växer tillbaka, del per timme och tidsålder (istid, vår, sommar, höst)
}
interface FyndDef {
  namn: string;
  grupp: Grupp;
  ikon: string;
  farg: number; // färgen i filtret
  topp: number; // ungefär vad en mycket rik ruta har; full färg i filtret
  bas(s: State, i: number): number; // vad en orörd ruta kan ge, efter marken
  arstid?: number[]; // hur mycket som finns per tidsålder (istid, vår, sommar, höst), annars lika året om
  uttag?: Uttag;
}
// rikare och fattigare fläckar, två rutor stora
const flack = (s: State, salt: number, i: number) => 0.6 + 0.8 * hash(s.seed + salt, (i % W) >> 1, Math.floor(i / W) >> 1);
// glesa fläckar, fyra rutor stora: noll på drygt halva marken
const glesFlack = (s: State, salt: number, i: number) => Math.max(0, hash(s.seed + salt, (i % W) >> 2, Math.floor(i / W) >> 2) - 0.45) / 0.55 * 1.4;
const SVAMP_SEASON = [0, 0.15, 0.8, 1.5];
const SVAMP_UTTAG: Uttag = { full: 2.5, reach: 1, regrow: [1 / 400, 1 / 150, 1 / 40, 1 / 40] };
// Ordningen är ordningen i sparfilen: nya lager läggs sist.
const DEF = {
  // bär i högt gräs och på hyggen, blåbär i skogen, rötter året om
  samla: {
    namn: 'Bär och rötter', grupp: 'vaxter', ikon: 'bar', farg: 0x7a4ce0, topp: 1.2,
    bas(s, i) {
      const g = groundOf(s);
      if (!isSoil(g.tiles[i])) return 0;
      const tr = g.trees[i], c = g.cover[i];
      return flack(s, 71, i) * (tr >= FOREST ? 0.7 : tr >= 0.15 ? 1.1 : c >= HIGH ? 1 : c >= BAR ? 0.5 : 0.15);
    },
    uttag: { full: 1.2, reach: 1, regrow: [0, 1 / 70, 1 / 24, 1 / 32] },
  },
  // vilt i skogen, lite i ungskog och högt gräs
  jakt: {
    namn: 'Vilt', grupp: 'djur', ikon: 'kott', farg: 0x8a4a1c, topp: 1.2,
    bas(s, i) {
      const g = groundOf(s);
      if (!isSoil(g.tiles[i])) return 0;
      const tr = g.trees[i];
      return flack(s, 73, i) * (tr >= FOREST ? 1 : tr > 0 || g.cover[i] >= HIGH ? 0.45 : 0.1);
    },
    uttag: { full: 6, reach: 3, regrow: [1 / 300, 1 / 160, 1 / 160, 1 / 200] },
  },
  // fisk vid stranden
  fiske: {
    namn: 'Fisk', grupp: 'djur', ikon: 'fisk', farg: 0x2f7fd0, topp: 1.2,
    bas: (s, i) => shoreOf(s.seed)[i] ? flack(s, 79, i) : 0,
    uttag: { full: 4, reach: 1, regrow: [1 / 300, 1 / 100, 1 / 100, 1 / 140] },
  },
  // flinta vid stenarna, ibland i sanden vid stranden och sällan annars. Den tar inte slut
  flinta: {
    namn: 'Flinta', grupp: 'sten', ikon: 'flinta', farg: 0xe8eef2, topp: 4,
    bas: (s, i) => getMap(s.seed).tiles[i] === T.Vatten ? 0 : flintAt(s, i),
  },
  // kantarellen växer i mossig gammal skog, mest på hösten
  kantarell: {
    namn: 'Kantarell', grupp: 'vaxter', ikon: 'svamp', farg: 0xf0b020, topp: 1.2, arstid: SVAMP_SEASON,
    bas(s, i) {
      const g = groundOf(s), tr = g.trees[i];
      return isSoil(g.tiles[i]) && tr >= 0.15 ? flack(s, 83, i) * (tr >= FOREST ? 0.45 : 0.35) : 0;
    },
    uttag: SVAMP_UTTAG,
  },
  // den giftiga orangea spindlingen liknar kantarellen. Den växer i glesa fläckar, helst i ung skog
  spindling: {
    namn: 'Orange spindling (giftig)', grupp: 'vaxter', ikon: 'spindling', farg: 0xe02818, topp: 0.8, arstid: SVAMP_SEASON,
    bas(s, i) {
      const g = groundOf(s), tr = g.trees[i];
      return isSoil(g.tiles[i]) && tr >= 0.15 ? glesFlack(s, 89, i) * (tr >= FOREST ? 0.5 : 0.8) : 0;
    },
    uttag: SVAMP_UTTAG,
  },
} satisfies Record<string, FyndDef>;
export type FyndId = keyof typeof DEF;
export const FYND: Record<FyndId, FyndDef> = DEF;
export const FYND_IDS = Object.keys(FYND) as FyndId[];
const UTTAG_IDS = FYND_IDS.filter(k => FYND[k].uttag);

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
  return d as Record<Kind, Float32Array> & Partial<Record<FyndId, Float32Array>>;
}
export function packFynd(s: State) {
  const d = takenOf(s);
  let bin = '';
  for (const k of UTTAG_IDS) for (let i = 0; i < W * H; i++) bin += String.fromCharCode(Math.round(clamp(d[k]![i], 0, 1) * 255));
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

// hur mycket en orörd ruta ger
export const capOf = (s: State, k: FyndId, i: number) => FYND[k].bas(s, i);
// vad lagret har på rutan just nu: det filtret visar
export function fyndAt(s: State, k: FyndId, i: number) {
  const f = FYND[k], t = takenOf(s)[k];
  return f.bas(s, i) * (f.arstid ? f.arstid[ageIndex(s)] : 1) * (t ? 1 - t[i] : 1);
}
// vad platsen ger just nu, 0 = inget
export const richness = (s: State, k: FyndId, x: number, y: number) => fyndAt(s, k, Math.floor(clamp(y, 0, H - 1)) * W + Math.floor(clamp(x, 0, W - 1)));
// ta mat ur en plats: mest ur rutan, lite ur grannarna
export function takeFrom(s: State, k: FyndId, x: number, y: number, amount: number) {
  const d = takenOf(s)[k], u = FYND[k].uttag;
  if (!d || !u) return;
  const r = u.reach, cx = Math.floor(x), cy = Math.floor(y);
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
// fiske med händerna ger ungefär så mycket som insamling på en lagom rik plats gånger detta
export const HAND_FISH = 0.55;

// ---------- flinta ----------
// flinta hittas oftast vid stenarna, ibland i sanden vid stranden och sällan annars
const flintAt = (s: State, i: number) => stoneDist(s.seed)[i] <= 2 ? 4 : getMap(s.seed).tiles[i] === T.Sand ? 1.5 : 0.4;
export const flintFactor = (s: State, x: number, y: number) => flintAt(s, Math.floor(clamp(y, 0, H - 1)) * W + Math.floor(clamp(x, 0, W - 1)));
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
export const GIFT = 'giftsvamp'; // giftig svamp som av misstag hamnat i förrådet (syns inte för invånarna)
// svamp som hittas under en stund av insamling i skogen; ger hur mycket ätlig mat som hittades.
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
