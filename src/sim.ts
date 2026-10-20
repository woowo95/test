import { findPath, pathTree, speedAt, wear, regrow, encodeCover, decodeCover } from './vag';
// Samhällssimulatorn – simuleringskärna (ingen grafik här)
// Tidsmodell: 1 verkligt dygn = 1 levnadsår. En tidsålder = 1 vecka. Ljus tid 07–19 lokal tid.

export const SEC = 1000;
export const HOUR = 3600 * SEC;
export const DAY = 24 * HOUR; // = ett levnadsår
export const WEEK = 7 * DAY; // = en tidsålder

export const W = 64;
export const H = 40;

export enum T { Vatten, Sand, Gras, Skog, Sten }

export const STATS = ['styrka', 'uthallighet', 'intelligens', 'nyfikenhet', 'vanlighet', 'karisma', 'skonhet', 'flit', 'empati', 'mod'] as const;
export type Stat = typeof STATS[number];
export const STAT_NAMES: Record<Stat, string> = {
  styrka: 'Styrka', uthallighet: 'Uthållighet', intelligens: 'Intelligens', nyfikenhet: 'Nyfikenhet',
  vanlighet: 'Vänlighet', karisma: 'Karisma', skonhet: 'Skönhet', flit: 'Flit', empati: 'Empati', mod: 'Mod',
};
export const SKILLS = ['samla', 'jakt', 'fiske', 'ved', 'hantverk', 'berattande', 'elda'] as const;
export type Skill = typeof SKILLS[number];
export const SKILL_NAMES: Record<Skill, string> = {
  samla: 'Insamling', jakt: 'Jakt', fiske: 'Fiske', ved: 'Vedhuggning', hantverk: 'Hantverk', berattande: 'Berättande', elda: 'Eldkonst',
};

export const AGES = ['Istid', 'Vårtid', 'Sommartid', 'Hösttid'];

export type Act = 'samla' | 'jakt' | 'fiske' | 'ved' | 'leka' | 'vila' | 'samtal' | 'beratta' | 'hantverk' | 'vakt' | 'sova' | 'elda' | 'tanda' | 'varma' | 'toa' | 'kol';
export const ACT_NAMES: Record<Act, string> = {
  samla: 'Samlar bär och rötter', jakt: 'Jagar', fiske: 'Fiskar', ved: 'Hugger ved', leka: 'Leker',
  vila: 'Vilar', samtal: 'Samtalar vid elden', beratta: 'Berättar vid elden', hantverk: 'Gör handarbete',
  vakt: 'Håller vakt', sova: 'Sover', elda: 'Lägger ved på elden', tanda: 'Försöker tända elden', varma: 'Värmer sig vid elden',
  toa: 'Går avsides på toa', kol: 'Hämtar kol ur den slocknade elden',
};
const WORK: Act[] = ['samla', 'jakt', 'fiske', 'ved'];

export interface Thought { text: string; v: number; until: number }
// why = varför personen valde uppgiften, dark = påbörjad under mörk tid
export interface Task { act: Act; phase: 'go' | 'do' | 'back'; tx: number; ty: number; until: number; carry: number; items?: Record<string, number>; why?: string; dark?: boolean; path?: number[]; pk?: string }

export interface Person {
  id: number; name: string; sex: 'm' | 'k';
  born: number; died?: number; cause?: string; left?: number;
  mother?: number; father?: number; partner?: number;
  pot: Record<Stat, number>; skill: Record<Skill, number>;
  hunger: number; rest: number; social: number; health: number;
  warm: number; // kroppsvärme 0–1
  toa: number; // 1 = inget behov, 0 = olycka
  habit: Record<string, number>; // timmar per aktivitet, bleknar med tiden (ger yrkestaggar)
  sickUntil?: number; pregnantSince?: number; lastBirth?: number;
  thoughts: Thought[];
  x: number; y: number; task?: Task;
  fame: string[];
  hue: number;
  tag?: string; // yrkestagg efter vad personen ägnar mest tid åt
}

export interface Rel { chem: number; op: number; rom: number; talks: number; flags: number }
// flags: 1 = nära vänner loggat, 2 = ovänner loggat

export interface LogEntry { t: number; text: string; kind: 'birth' | 'death' | 'rel' | 'skill' | 'world' | 'move'; ids: number[] }

export interface State {
  v: 1; seed: number; rng: number; founded: number; now: number;
  people: Person[]; rels: Record<string, Rel>; nextId: number;
  food: number; wood: number; log: LogEntry[];
  lastAgeIdx: number; lastGuardDay: number;
  items: Record<string, number>; // föremål i förrådet, t.ex. gniststen, torrt gräs, små pinnar
  fire: Fire;
  seder: Seder;
  mark?: string; // markens grästäcke per ruta (stigar), packat
}

// ---------- seder ----------
// Byns gemensamma värderingar, -1..1. Växer fram ur invånarnas personlighet och det byn varit med om.
export const SEDER = ['arbete', 'gemenskap', 'barn', 'nyfikenhet', 'forsiktighet'] as const;
export type Sed = typeof SEDER[number];
export const SED_INFO: Record<Sed, { pos: string; neg: string; effect: string }> = {
  arbete: { pos: 'Arbete', neg: 'Lugn', effect: 'Pliktkänsla: hur mycket man jobbar för byn och hur mycket man vilar.' },
  gemenskap: { pos: 'Gemenskap', neg: 'Var och en för sig', effect: 'Hur mycket man bryr sig om att andra fryser och hjälper dem med elden.' },
  barn: { pos: 'Barnkär', neg: 'Barnsnål', effect: 'Hur gärna par skaffar barn, och om barnen får leka eller måste hjälpa till.' },
  nyfikenhet: { pos: 'Nyfikenhet', neg: 'Tradition', effect: 'Hur snabbt invånarna lär sig nya färdigheter.' },
  forsiktighet: { pos: 'Försiktighet', neg: 'Leva i nuet', effect: 'Hur stora förråd byn vill ha innan man slappnar av, och om elden hålls vid liv.' },
};
// v = sederna nu, ev = tillskott från händelser (bleknar), at = senaste omräkning
export interface Seder { v: Record<Sed, number>; ev: Record<Sed, number>; log: { t: number; text: string }[]; at?: number }

// ---------- eldstäder och tänddon ----------
// Bara lägerelden går att ha i dag. De andra är förberedda och byggs när bygg- och teknikträdet finns.
// spread = relativ risk att elden tar sig ut i omgivningen (används när brandsystemet finns).
export interface Hearth { id: string; name: string; desc: string; indoor: boolean; maxFuel: number; burn: number; radius: number; comfort: number; spread: number; requires: string }
export const HEARTHS: Hearth[] = [
  { id: 'lagereld', name: 'Lägereld', desc: 'Ved staplad direkt på marken. Lätt att göra, men mycket värme går förlorad och den kan inte stå inomhus.', indoor: false, maxFuel: 6, burn: 0.5, radius: 5, comfort: 0.04, spread: 1, requires: 'Eld' },
  { id: 'stenring', name: 'Stenring', desc: 'Elden ligger i en ring av stenar som håller glöden samlad och stänger ute vinden.', indoor: false, maxFuel: 8, burn: 0.45, radius: 5.5, comfort: 0.05, spread: 0.5, requires: 'Stenhuggning' },
  { id: 'hard', name: 'Härd', desc: 'Stensatt härd i golvet med rökhål i taket. Den första elden som går att ha inomhus.', indoor: true, maxFuel: 10, burn: 0.4, radius: 6, comfort: 0.07, spread: 0.3, requires: 'Bofast by' },
  { id: 'murad', name: 'Murad eldstad', desc: 'Eldstad av sten och lera med rökgång. Röken leds ut och värmen stannar i rummet.', indoor: true, maxFuel: 14, burn: 0.35, radius: 7, comfort: 0.09, spread: 0.12, requires: 'Murning' },
  { id: 'kakelugn', name: 'Kakelugn', desc: 'Lagrar värmen i tegel och kakel och värmer länge efter att veden brunnit ut.', indoor: true, maxFuel: 18, burn: 0.3, radius: 8, comfort: 0.11, spread: 0.03, requires: 'Keramik, murning' },
];
// chance = chans per försök, grass/sticks = tändmaterial per försök, minutes = tid per försök
export interface Igniter { id: string; name: string; desc: string; chance: number; grass: number; sticks: number; minutes: number; requires: string }
export const IGNITERS: Igniter[] = [
  { id: 'gniststen', name: 'Gniststen', desc: 'Slås mot en annan sten så att gnistor faller i tändmaterialet. Kräver tålamod och mycket tändmaterial.', chance: 0.025, grass: 3, sticks: 3, minutes: 15, requires: '–' },
  { id: 'bagborr', name: 'Bågborr', desc: 'En pinne snurras snabbt mot en träskiva med hjälp av en båge tills glöd bildas.', chance: 0.2, grass: 2, sticks: 1, minutes: 10, requires: 'Träbearbetning' },
  { id: 'eldstal', name: 'Eldstål och flinta', desc: 'Stål mot flinta ger heta gnistor som fångas i fnöske.', chance: 0.45, grass: 1, sticks: 1, minutes: 5, requires: 'Smide' },
  { id: 'tandstickor', name: 'Tändstickor', desc: 'Tänds med ett drag.', chance: 0.9, grass: 0.5, sticks: 0.5, minutes: 1, requires: 'Kemi' },
];
export const ITEM_NAMES: Record<string, string> = { gniststen: 'Gniststen', torrgras: 'Torrt gräs', pinnar: 'Små pinnar', kol: 'Kol' };

export interface FireLog { t: number; k: 'tänd' | 'fyll' | 'slocknade' | 'glöd' | 'sprack'; id?: number; n?: number }
export interface Fire {
  hearth: string; fuel: number; lit: boolean; emberUntil?: number;
  litAt?: number; litBy?: number; burned: number; // denna eld
  totalBurned: number; litSec: number; lightings: number; outs: number;
  tries: number; tryTotal: number; tryProg: number; // försök sedan elden senast brann, totalt, sekunder in i pågående försök
  fills: Record<string, number>; log: FireLog[];
  want?: number; wantBy?: number; wantWhy?: string; // största önskan om ved på elden just nu, och vems
  ash?: number; ashUntil?: number; // kolhög efter en utbrunnen eld
}

// ---------- slump ----------
export function rnd(s: State): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
function gauss(s: State) { return (rnd(s) + rnd(s) + rnd(s) - 1.5) / 1.5; }
function pick<X>(s: State, arr: X[]): X { return arr[Math.floor(rnd(s) * arr.length)]; }
function chance(s: State, ratePerSec: number, dtSec: number) { return rnd(s) < 1 - Math.exp(-ratePerSec * dtSec); }

// ---------- karta ----------
function hash(seed: number, x: number, y: number) {
  let h = seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(seed: number, x: number, y: number) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(seed, x0, y0), b = hash(seed, x0 + 1, y0), c = hash(seed, x0, y0 + 1), d = hash(seed, x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
function fbm(seed: number, x: number, y: number) {
  return vnoise(seed, x / 12, y / 12) * 0.55 + vnoise(seed + 7, x / 6, y / 6) * 0.3 + vnoise(seed + 13, x / 3, y / 3) * 0.15;
}

export interface MapData { tiles: Uint8Array; fire: { x: number; y: number }; huts: { x: number; y: number }[]; stock: { x: number; y: number }; shade: Float32Array }

const mapCache = new Map<number, MapData>();
export function getMap(seed: number): MapData {
  const c = mapCache.get(seed);
  if (c) return c;
  const tiles = new Uint8Array(W * H);
  const shade = new Float32Array(W * H);
  const lx = W * (0.3 + hash(seed, 1, 1) * 0.4), ly = H * (0.25 + hash(seed, 2, 2) * 0.5);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - lx) / 1.4, y - ly);
    const lake = Math.max(0, 1 - d / 9);
    const h = fbm(seed, x, y) - lake * 0.55;
    const f = fbm(seed + 99, x, y);
    let t: T;
    if (h < 0.22) t = T.Vatten;
    else if (h < 0.27) t = T.Sand;
    else if (h > 0.72) t = T.Sten;
    else if (f > 0.55) t = T.Skog;
    else t = T.Gras;
    tiles[y * W + x] = t;
    shade[y * W + x] = hash(seed + 5, x, y);
  }
  // byplats: gräs nära vatten och skog, nära mitten
  let best = { x: W >> 1, y: H >> 1 }, bs = -1e9;
  for (let y = 5; y < H - 5; y++) for (let x = 6; x < W - 6; x++) {
    if (tiles[y * W + x] !== T.Gras) continue;
    let water = 99, forest = 99, okArea = true;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const t = tiles[(y + dy) * W + x + dx];
      if (t === T.Vatten || t === T.Sten) okArea = false;
    }
    if (!okArea) continue;
    for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const t = tiles[yy * W + xx], d = Math.hypot(dx, dy);
      if (t === T.Vatten) water = Math.min(water, d);
      if (t === T.Skog) forest = Math.min(forest, d);
    }
    const sc = -Math.abs(water - 6) * 2 - Math.abs(forest - 6) - Math.hypot(x - W / 2, y - H / 2) * 0.3;
    if (sc > bs) { bs = sc; best = { x, y }; }
  }
  const f = best;
  const huts = [{ x: f.x - 3, y: f.y - 3 }, { x: f.x + 2, y: f.y - 3 }, { x: f.x - 3, y: f.y + 2 }, { x: f.x + 2, y: f.y + 2 }];
  const m: MapData = { tiles, fire: f, huts, stock: { x: f.x + 4, y: f.y - 1 }, shade };
  mapCache.set(seed, m);
  return m;
}

// ---------- mark och stigar ----------
const covers = new WeakMap<State, Float32Array>();
export function coverOf(s: State) {
  let c = covers.get(s);
  if (!c) { c = decodeCover(s.mark); covers.set(s, c); }
  return c;
}
const GROW = [0.1, 1.2, 1, 0.6]; // grästillväxt per tidsålder
const WEAR = 0.008; // slitage när någon går över en ruta
const tileOf = (x: number, y: number) => Math.max(0, Math.min(H - 1, Math.floor(y))) * W + Math.max(0, Math.min(W - 1, Math.floor(x)));
let tree: { key: string; came: Int32Array } | undefined;
// vid ikappräkning går ingen på riktigt: slitaget läggs längs bästa vägen mellan elden och målet
function tread(s: State, tx: number, ty: number, trips: number) {
  const m = getMap(s.seed), cov = coverOf(s), key = `${s.seed}:${Math.floor(s.now / (4 * HOUR))}`;
  if (tree?.key !== key) tree = { key, came: pathTree(m.tiles, cov, m.fire.x, m.fire.y) };
  for (let i = tileOf(tx, ty), n = 0; i >= 0 && n < 200; i = tree.came[i], n++) wear(m.tiles, cov, i, WEAR * trips);
}

// ---------- namn ----------
const N1 = ['A', 'Bo', 'Da', 'E', 'Fa', 'Gu', 'Ha', 'I', 'Ka', 'Lo', 'Ma', 'Ny', 'O', 'Ra', 'Si', 'Tu', 'U', 'Ve', 'Y', 'Å', 'Ste', 'Tor', 'Al', 'Ger'];
const N2 = ['r', 'n', 'l', 'rk', 'nd', 'st', 'g', 'v', 'm', 'sk', 'lv', 'rn', 'k', 'd'];
const NK = ['a', 'e', 'ja', 'ra', 'dis', 'run', 'hild', 'frid', 'ny', 'vi', 'ka'];
const NM = ['e', 'o', 'ar', 'ik', 'ulf', 'mund', 'björn', 'vid', 'stig', 'ger', 'an'];
function makeName(s: State, sex: 'm' | 'k') {
  for (let i = 0; i < 20; i++) {
    const n = pick(s, N1) + (rnd(s) < 0.7 ? pick(s, N2) : '') + pick(s, sex === 'k' ? NK : NM);
    const nn = n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
    if (nn.length >= 3 && nn.length <= 9 && !s.people.some(p => p.name === nn && alive(p))) return nn;
  }
  return pick(s, N1) + pick(s, sex === 'k' ? NK : NM);
}

// ---------- personer ----------
export const alive = (p: Person) => p.died === undefined && p.left === undefined;
export const ageOf = (p: Person, now: number) => ((p.died ?? p.left ?? now) - p.born) / DAY;
export function living(s: State) { return s.people.filter(alive); }
export function byId(s: State, id?: number) { return id === undefined ? undefined : s.people.find(p => p.id === id); }

export function stat(p: Person, k: Stat, now: number) {
  const a = ageOf(p, now);
  let g = clamp(0.06 + a / 18, 0.06, 1);
  if ((k === 'styrka' || k === 'uthallighet') && a > 45) g *= clamp(1 - (a - 45) / 50, 0.3, 1);
  if (k === 'skonhet' && a > 40) g *= clamp(1 - (a - 40) / 70, 0.5, 1);
  return p.pot[k] * g;
}

function newPerson(s: State, sex: 'm' | 'k', born: number, mother?: Person, father?: Person): Person {
  const pot = {} as Record<Stat, number>;
  for (const k of STATS) {
    const base = mother && father ? (mother.pot[k] + father.pot[k]) / 2 : 10;
    const spread = mother && father ? 3 : 4.5;
    pot[k] = clamp(base + gauss(s) * spread * 1.6, 1, 20);
  }
  const skill = {} as Record<Skill, number>;
  for (const k of SKILLS) skill[k] = 0;
  const m = getMap(s.seed);
  const p: Person = {
    id: s.nextId++, name: '', sex, born, mother: mother?.id, father: father?.id,
    pot, skill, hunger: 0.8, rest: 0.9, social: 0.7, health: 1, warm: 1, toa: 0.6 + rnd(s) * 0.4, habit: {}, thoughts: [],
    x: m.fire.x + (rnd(s) - 0.5) * 3, y: m.fire.y + (rnd(s) - 0.5) * 3, fame: [],
    hue: Math.floor(rnd(s) * 360),
  };
  p.name = makeName(s, sex);
  return p;
}

export function relKey(a: number, b: number) { return a < b ? a + '-' + b : b + '-' + a; }
export function getRel(s: State, a: Person, b: Person): Rel {
  const k = relKey(a.id, b.id);
  let r = s.rels[k];
  if (!r) {
    r = { chem: clamp(gauss(s) * 0.6, -1, 1), op: 0, rom: 0, talks: 0, flags: 0 };
    if (isKin(a, b)) r.op = 25;
    s.rels[k] = r;
  }
  return r;
}
export function isKin(a: Person, b: Person) {
  return a.mother === b.id || a.father === b.id || b.mother === a.id || b.father === a.id ||
    (a.mother !== undefined && a.mother === b.mother) || (a.father !== undefined && a.father === b.father);
}
function similarity(a: Person, b: Person) {
  let d = 0;
  for (const k of ['nyfikenhet', 'vanlighet', 'flit', 'empati', 'mod'] as Stat[]) d += Math.abs(a.pot[k] - b.pot[k]);
  return 1 - d / 50; // ~ -0.5..1
}

export function log(s: State, text: string, kind: LogEntry['kind'], ids: number[] = []) {
  s.log.push({ t: s.now, text, kind, ids });
  if (s.log.length > 400) s.log.splice(0, s.log.length - 400);
}
function think(p: Person, text: string, v: number, now: number, dur: number) {
  p.thoughts = p.thoughts.filter(t => t.text !== text);
  p.thoughts.push({ text, v, until: now + dur });
}

// ---------- tid ----------
export function ageIndex(s: State, t = s.now) { return (((1 + Math.floor((t - s.founded) / WEEK)) % 4) + 4) % 4; }
export function ageDay(s: State, t = s.now) { return Math.floor(((t - s.founded) % WEEK) / DAY) + 1; }
export function yearNo(s: State, t = s.now) { return Math.floor((t - s.founded) / DAY) + 1; }
export function isLight(t: number) { const h = new Date(t).getHours(); return h >= 7 && h < 19; }
export function lightLevel(t: number) {
  const d = new Date(t); const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 7.5 && h < 18.5) return 1;
  if (h >= 6.5 && h < 7.5) return (h - 6.5);
  if (h >= 18.5 && h < 19.5) return 1 - (h - 18.5);
  return 0;
}
export function timeLabel(s: State, t: number) {
  if (t < s.founded) { const y = Math.ceil((s.founded - t) / DAY); return `${y} år före grundandet`; }
  return `År ${yearNo(s, t)}, ${AGES[ageIndex(s, t)].toLowerCase()}`;
}

// ---------- skapa värld ----------
export function createState(seed: number, now: number): State {
  const s: State = { v: 1, seed, rng: seed, founded: now, now, people: [], rels: {}, nextId: 1, food: 60, wood: 25, log: [], lastAgeIdx: 1, lastGuardDay: -1, items: {}, fire: newFire(), seder: newSeder() };
  const adults: [string, number][] = [['m', 38], ['k', 35], ['m', 27], ['k', 25], ['m', 22], ['k', 21], ['m', 44], ['k', 19]];
  for (const [sex, age] of adults) s.people.push(newPerson(s, sex as 'm' | 'k', now - (age + rnd(s)) * DAY));
  const [a, b, c, d] = s.people;
  pair(s, a, b, true); pair(s, c, d, true);
  for (const [mo, fa, age] of [[b, a, 9], [b, a, 4], [d, c, 1]] as [Person, Person, number][]) {
    const ch = newPerson(s, rnd(s) < 0.5 ? 'm' : 'k', now - (age + rnd(s) * 0.5) * DAY, mo, fa);
    s.people.push(ch);
  }
  // startfärdigheter efter ålder
  for (const p of s.people) {
    const a = ageOf(p, now);
    for (const k of SKILLS) p.skill[k] = clamp((a - 8) * 0.25 * (0.4 + rnd(s)) * (p.pot.intelligens / 12), 0, 12);
  }
  s.seder.v = sederTarget(s);
  log(s, `${s.people.length} människor slog sig ner vid sjön. De har ingen eld ännu.`, 'world');
  return s;
}

function newFire(): Fire {
  return { hearth: 'lagereld', fuel: 0, lit: false, burned: 0, totalBurned: 0, litSec: 0, lightings: 0, outs: 0, tries: 0, tryTotal: 0, tryProg: 0, fills: {}, log: [] };
}

// äldre sparfiler: byn har redan en brinnande lägereld och lite tändmaterial
export function migrate(s: State) {
  for (const p of s.people) {
    if (p.skill.elda === undefined) p.skill.elda = clamp((ageOf(p, s.now) - 10) * 0.15, 0, 6);
    if (p.warm === undefined) p.warm = 1;
    if (p.toa === undefined) p.toa = 1;
    if (!p.habit) p.habit = {};
  }
  if (!s.items) s.items = { gniststen: 1, torrgras: 8, pinnar: 8 };
  if (!s.fire) {
    s.fire = newFire();
    Object.assign(s.fire, { lit: true, fuel: 4, litAt: s.founded, lightings: 1, litSec: (s.now - s.founded) / SEC });
    s.fire.log.push({ t: s.founded, k: 'tänd' });
  }
  if (!s.seder) { s.seder = newSeder(); s.seder.v = sederTarget(s); }
  return s;
}
function pair(s: State, a: Person, b: Person, silent = false) {
  a.partner = b.id; b.partner = a.id;
  const r = getRel(s, a, b); r.op = Math.max(r.op, 55); r.rom = Math.max(r.rom, 75);
  if (!silent) {
    log(s, `${a.name} och ${b.name} blev ett par.`, 'rel', [a.id, b.id]);
    think(a, `Blev tillsammans med ${b.name}`, 0.15, s.now, DAY);
    think(b, `Blev tillsammans med ${a.name}`, 0.15, s.now, DAY);
  }
}

// ---------- ekonomi ----------
const SEASON: Record<string, number[]> = { samla: [0.08, 0.7, 1.25, 1.6], jakt: [0.7, 0.9, 1.0, 1.15], fiske: [0.45, 1.0, 1.1, 1.0], ved: [0.9, 1, 1, 1] };
const BASE: Record<string, number> = { samla: 0.65, jakt: 0.7, fiske: 0.65, ved: 1.3 }; // enheter per timme
const WORK_STAT: Record<string, Stat> = { samla: 'uthallighet', jakt: 'mod', fiske: 'uthallighet', ved: 'styrka' };
function workRate(s: State, p: Person, act: Act) {
  const a = ageOf(p, s.now);
  const ageF = a < 14 ? 0.3 : a > 60 ? 0.6 : 1;
  const sk = act as Skill;
  return BASE[act] / 3600 * SEASON[act][ageIndex(s)] * (0.45 + p.skill[sk] / 20 + stat(p, WORK_STAT[act], s.now) / 40) * ageF * (p.sickUntil && p.sickUntil > s.now ? 0.3 : 1);
}
export function foodDays(s: State) { const n = living(s).length || 1; return s.food / (n * 1.6); }
export function woodDays(s: State) { return s.wood / (hearthOf(s.fire).burn * 24); }

// ---------- eld ----------
export const hearthOf = (f: Fire) => HEARTHS.find(h => h.id === f.hearth) ?? HEARTHS[0];
export const igniterOf = (s: State) => IGNITERS.find(i => (s.items[i.id] ?? 0) >= 1);
const item = (s: State, k: string) => s.items[k] ?? 0;
function fireLog(s: State, e: Omit<FireLog, 't'>) { s.fire.log.push({ t: s.now, ...e }); if (s.fire.log.length > 80) s.fire.log.splice(0, s.fire.log.length - 80); }
export const emberOn = (s: State) => !s.fire.lit && s.fire.emberUntil !== undefined && s.fire.emberUntil > s.now;
// eldens styrka 0–1 efter hur mycket ved som brinner
export function fireHeat(s: State) { const f = s.fire; return f.lit ? clamp(f.fuel / hearthOf(f).maxFuel * 1.4, 0.15, 1) : 0; }
export function heatRadius(s: State) { return hearthOf(s.fire).radius * (0.5 + 0.5 * fireHeat(s)); }
export function heatAt(s: State, x: number, y: number) {
  const I = fireHeat(s); if (!I) return 0;
  const m = getMap(s.seed), r = heatRadius(s);
  const d = Math.hypot(x - (m.fire.x + 0.5), y - (m.fire.y + 0.5));
  return d >= r ? 0 : I * (1 - d / r);
}
// hur mycket ved som önskas på elden just nu (den som vill ha mest)
export const fireWant = (s: State) => s.fire.want ?? 0;
export interface Wish { v: number; why: string }
const relightHard = (s: State) => 1 - (igniterOf(s) ?? IGNITERS[0]).chance;
// varje invånares egen önskan om ved på elden; vc = hur mycket byn fryser 0–1
export function fireWish(s: State, p: Person, vc: number): Wish {
  const light = isLight(s.now), cold = COLD[ageIndex(s)][light ? 0 : 1], sd = s.seder.v;
  const opts: Wish[] = [
    { v: clamp((1 - p.warm) * 1.2 + cold * 2.4, 0, 1), why: p.warm < 0.5 ? 'Fryser och vill ha mer värme' : 'Det är kallt och hen vill hålla värmen' },
    { v: clamp(vc * (p.pot.empati / 10) * (0.6 + 0.4 * sd.gemenskap), 0, 1), why: 'Andra i byn fryser' },
    { v: (light ? 0.12 : 0.55) * clamp(1.5 - moodOf(p, s.now), 0.4, 1), why: light ? 'Vill ha en trivsam eld' : 'Vill ha en trivsam eld att samlas kring i mörkret' },
    { v: clamp((p.pot.intelligens - 11) / 9, 0, 1) * relightHard(s) * (0.6 + 0.4 * sd.forsiktighet) * 0.14, why: 'Vill inte att elden slocknar, den är svår att tända igen' },
  ];
  if (!s.fire.lightings) opts.push({ v: 0.3 * (0.6 + p.pot.nyfikenhet / 25), why: 'Byn har aldrig haft eld' });
  const b = opts.reduce((a, o) => (o.v > a.v ? o : a));
  return { v: b.v * hearthOf(s.fire).maxFuel, why: b.why };
}
// tändmaterial som invånarna vill ha i förrådet
const tinderWant = (s: State) => (s.fire.lit ? 12 : 36);
export function canLight(s: State) {
  const ig = igniterOf(s);
  return !!ig && item(s, 'torrgras') >= ig.grass && item(s, 'pinnar') >= ig.sticks && s.wood >= 1;
}
export function needTinder(s: State) {
  return !s.fire.lit && !emberOn(s) && (item(s, 'gniststen') < 1 || item(s, 'torrgras') < 12 || item(s, 'pinnar') < 12);
}
function durText(sec: number) { const h = sec / 3600; return h >= 24 ? `${(h / 24).toFixed(1).replace('.', ',')} dygn` : h >= 1 ? `${Math.round(h)} timmar` : `${Math.round(sec / 60)} minuter`; }
function lightFire(s: State, p: Person) {
  const f = s.fire, start = Math.min(2, s.wood);
  s.wood -= start;
  Object.assign(f, { lit: true, fuel: start, litAt: s.now, litBy: p.id, burned: 0, emberUntil: undefined, tryProg: 0 });
  f.lightings++;
  if (f.ash) { takeCoal(s, p, 'krattade undan'); }
  fireLog(s, { k: 'tänd', id: p.id, n: f.tries });
  log(s, `${p.name} lyckades tända elden${f.tries > 1 ? ` efter ${f.tries} försök` : ''}.`, 'world', [p.id]);
  think(p, 'Tände elden', 0.15, s.now, DAY / 2);
  if (f.lightings === 1) { p.fame.push('Tände byns första eld'); sedEvent(s, 'nyfikenhet', 0.1, 'Elden har gjort byn nyfiken på vad mer som går att lära sig.'); }
  f.tries = 0;
}
// ett försök att tända med det bästa tänddonet i förrådet
function tryLight(s: State, p: Person) {
  const ig = igniterOf(s)!, f = s.fire;
  s.items.torrgras = item(s, 'torrgras') - ig.grass; s.items.pinnar = item(s, 'pinnar') - ig.sticks;
  f.tries++; f.tryTotal++;
  p.skill.elda = clamp(p.skill.elda + 0.08 * (0.5 + p.pot.intelligens / 20) * (1 - p.skill.elda / 21), 0, 20);
  const c = ig.chance * (0.5 + p.skill.elda / 20 + stat(p, 'intelligens', s.now) / 40) * (ageIndex(s) === 0 ? 0.6 : 1);
  if (rnd(s) < c) { lightFire(s, p); return true; }
  if (ig.id === 'gniststen' && rnd(s) < 0.01) {
    s.items.gniststen--; fireLog(s, { k: 'sprack', id: p.id });
    log(s, `${p.name}s gniststen sprack.`, 'world', [p.id]);
  }
  return false;
}
function takeCoal(s: State, p: Person, verb: string) {
  const n = s.fire.ash ?? 0;
  if (n < 1) return;
  addItems(s, { kol: n });
  s.fire.ash = 0; s.fire.ashUntil = undefined;
  log(s, `${p.name} ${verb} ${n} kol ur den gamla elden och lade dem i förrådet.`, 'world', [p.id]);
}
function addFuel(s: State, p: Person, n: number) {
  const f = s.fire, h = hearthOf(f);
  if (!f.lit && !emberOn(s)) { s.wood += n; return; } // elden hann slockna: veden går tillbaka
  if (!f.lit) {
    f.lit = true; f.emberUntil = undefined;
    fireLog(s, { k: 'glöd', id: p.id });
    log(s, `${p.name} blåste liv i glöden och elden brinner igen.`, 'world', [p.id]);
  }
  const put = Math.min(n, h.maxFuel - f.fuel);
  f.fuel += put; s.wood += n - put;
  f.fills[p.id] = (f.fills[p.id] ?? 0) + 1;
  fireLog(s, { k: 'fyll', id: p.id, n: put });
  p.skill.elda = clamp(p.skill.elda + 0.01 * (1 - p.skill.elda / 21), 0, 20);
}
function assign(s: State, p: Person, act: Act, tx: number, ty: number, dur: number, live: boolean, why: string) {
  if (!live) { p.x = tx; p.y = ty; tread(s, tx, ty, 1); }
  p.task = { act, phase: live ? 'go' : 'do', tx, ty, until: s.now + dur, carry: 0, why, dark: !isLight(s.now) };
}
const awake = (s: State, p: Person, minAge: number) => {
  const t = p.task;
  return ageOf(p, s.now) >= minAge && !(p.sickUntil && p.sickUntil > s.now) && p.health >= 0.4 &&
    (!t || (t.act !== 'sova' && !(t.phase === 'back' && t.carry > 0) && !t.items));
};
function stepFire(s: State, dtSec: number, live: boolean, ppl: Person[]) {
  const f = s.fire, h = hearthOf(f), m = getMap(s.seed), now = s.now;
  if (f.lit) {
    const b = Math.min(f.fuel, h.burn / 3600 * dtSec);
    f.fuel -= b; f.burned += b; f.totalBurned += b; f.litSec += dtSec;
    if (f.fuel <= 1e-6) {
      f.fuel = 0; f.lit = false; f.emberUntil = now + HOUR; f.outs++;
      fireLog(s, { k: 'slocknade', n: f.burned });
      log(s, `Elden slocknade efter att ha brunnit i ${durText((now - (f.litAt ?? now)) / SEC)}. Glöden lever en stund till.`, 'world');
    }
  }
  if (f.emberUntil !== undefined && !f.lit && f.emberUntil <= now) {
    // glöden dog: kvar blir en svart hög med lite kol, som ligger några dygn
    f.emberUntil = undefined;
    const coal = Math.min(8, Math.round(f.burned * 0.05));
    if (coal >= 1) { f.ash = (f.ash ?? 0) + coal; f.ashUntil = now + 3 * DAY; log(s, `Elden har brunnit ut. Kvar ligger en svart hög med ${coal} kol.`, 'world'); }
  }
  if (f.ash && (f.ashUntil ?? 0) <= now) { f.ash = 0; f.ashUntil = undefined; }
  // vilja: varje vaken invånare vill ha olika mycket ved på elden
  const vc = ppl.reduce((a, p) => a + clamp(0.6 - p.warm, 0, 0.6) / 0.6, 0) / (ppl.length || 1);
  const cands: { p: Person; w: Wish }[] = [];
  let top: { p: Person; w: Wish } | undefined;
  for (const p of ppl) {
    if (!awake(s, p, 8)) continue;
    const c = { p, w: fireWish(s, p, vc) };
    cands.push(c);
    if (!top || c.w.v > top.w.v) top = c;
  }
  f.want = top?.w.v ?? 0; f.wantBy = top?.p.id; f.wantWhy = top?.w.why;
  // påfyllning: den som vill ha klart mer ved än det som ligger på hämtar, plikttrogna och nära först
  if ((f.lit || emberOn(s)) && s.wood >= 0.5 && !ppl.some(p => p.task?.act === 'elda')) {
    const fx = m.fire.x + 0.5, fy = m.fire.y + 0.5;
    let best: { p: Person; w: Wish } | undefined, bs = -1e9;
    for (const c of cands) {
      if (c.w.v < f.fuel * 2 + 0.2) continue;
      const sc = (c.w.v - f.fuel) / h.maxFuel * (0.4 + duty(s, c.p)) - Math.hypot(c.p.x - fx, c.p.y - fy) / 25 + (c.p.task?.act === 'vakt' ? 0.3 : 0) + rnd(s) * 0.1;
      if (sc > bs) { bs = sc; best = c; }
    }
    if (best) {
      const p = best.p, n = Math.min(3, Math.max(1, best.w.v - f.fuel), s.wood);
      if (live) assign(s, p, 'elda', m.stock.x + 0.5 + rnd(s) * 1.5, m.stock.y + 0.5 + rnd(s), HOUR, true, best.w.why);
      else { s.wood -= n; addFuel(s, p, n); }
    }
  }
  // tändning: när elden är släckt och någon vill ha eld försöker en person i taget
  if (!f.lit && !emberOn(s) && canLight(s) && f.want >= h.maxFuel * 0.1 && !ppl.some(p => p.task?.act === 'tanda')) {
    const ok = cands.filter(c => ageOf(c.p, now) >= 12 && c.w.v >= h.maxFuel * 0.05)
      .sort((a, b) => (b.p.skill.elda + stat(b.p, 'flit', now) / 2 + rnd(s) * 3) - (a.p.skill.elda + stat(a.p, 'flit', now) / 2 + rnd(s) * 3));
    const c = ok[0];
    if (c) assign(s, c.p, 'tanda', m.fire.x + 0.5 + (rnd(s) - 0.5) * 1.2, m.fire.y + 1.3, 3 * HOUR, live, `Vill ha eld. ${c.w.why}`);
  }
}
// värmeförlust per timme utan eld: [ljus tid, mörk tid] per tidsålder
const COLD = [[1 / 5, 1 / 3], [0, 1 / 12], [0, 0], [0, 1 / 10]];
// insamling hittar tändmaterial och gniststen när förrådet behöver det
const GRASS_SEASON = [0.25, 0.6, 1, 1.3];
function forageItems(s: State, p: Person, dtSec: number): Record<string, number> | undefined {
  const ai = ageIndex(s), want = tinderWant(s), hrs = dtSec / 3600;
  const sk = 0.6 + p.skill.samla / 25;
  const got: Record<string, number> = {};
  if (item(s, 'torrgras') < want) got.torrgras = 3 * GRASS_SEASON[ai] * sk * hrs;
  if (item(s, 'pinnar') < want) got.pinnar = 3 * (ai === 0 ? 0.6 : 1) * sk * hrs;
  if (item(s, 'gniststen') < 2 && chance(s, 0.08 * sk / 3600, dtSec)) {
    got.gniststen = 1;
    log(s, `${p.name} hittade en gniststen.`, 'world', [p.id]);
  }
  return Object.keys(got).length ? got : undefined;
}
function addItems(s: State, got: Record<string, number>) { for (const k in got) s.items[k] = item(s, k) + got[k]; }

// ---------- seder ----------
function newSeder(): Seder {
  const z = () => ({ arbete: 0, gemenskap: 0, barn: 0, nyfikenhet: 0, forsiktighet: 0 });
  return { v: z(), ev: z(), log: [] };
}
const dev = (v: number) => (v - 10) / 6;
// åt vilket håll personen drar sederna, efter sin personlighet
export function personSeder(s: State, p: Person): Record<Sed, number> {
  const q = p.pot, kids = s.people.some(c => c.mother === p.id || c.father === p.id);
  return {
    arbete: dev(q.flit),
    gemenskap: dev((q.empati + q.vanlighet) / 2),
    barn: dev(q.empati) * 0.5 + dev(q.vanlighet) * 0.3 + (kids ? 0.1 : 0),
    nyfikenhet: dev((q.nyfikenhet + q.intelligens) / 2),
    forsiktighet: -dev(q.mod) * 0.7 + dev(q.intelligens) * 0.3,
  };
}
// inflytande över sederna: vuxna och äldre väger mest, karismatiska hörs mer
export function influence(s: State, p: Person) {
  const a = ageOf(p, s.now);
  return (a < 14 ? 0 : a < 20 ? 0.5 : a > 50 ? 1.5 : 1) * (0.5 + p.pot.karisma / 20);
}
function sederTarget(s: State): Record<Sed, number> {
  const t = { arbete: 0, gemenskap: 0, barn: 0, nyfikenhet: 0, forsiktighet: 0 };
  let tw = 0;
  for (const p of living(s)) {
    const w = influence(s, p); if (!w) continue;
    tw += w; const ps = personSeder(s, p);
    for (const k of SEDER) t[k] += ps[k] * w;
  }
  for (const k of SEDER) t[k] = clamp((tw ? t[k] / tw : 0) * 1.8 + s.seder.ev[k], -1, 1);
  return t;
}
// händelser som formar sederna; effekten bleknar under några veckor
function sedEvent(s: State, k: Sed, d: number, text?: string) {
  s.seder.ev[k] = clamp(s.seder.ev[k] + d, -0.4, 0.4);
  if (text) { s.seder.log.push({ t: s.now, text }); if (s.seder.log.length > 30) s.seder.log.splice(0, s.seder.log.length - 30); }
}
// sederna rör sig långsamt mot det invånarna och händelserna drar mot
function stepSeder(s: State) {
  const sd = s.seder, dt = s.now - (sd.at ?? s.now);
  sd.at = s.now;
  if (dt <= 0) return;
  const kd = Math.exp(-dt / (6 * DAY));
  for (const k of SEDER) sd.ev[k] *= kd;
  if (foodDays(s) > 20) sedEvent(s, 'arbete', -0.0005 * dt / HOUR); // långt överflöd gör byn lugnare
  const t = sederTarget(s), f = 1 - Math.exp(-dt / (2 * DAY));
  for (const k of SEDER) sd.v[k] += (t[k] - sd.v[k]) * f;
}

// ---------- vilja ----------
// pliktkänsla 0–1: hur mycket personen jobbar för byn i stället för sig själv
export function duty(s: State, p: Person) {
  return clamp(0.6 + (p.pot.flit - 10) * 0.035 + (p.pot.empati - 10) * 0.015 + s.seder.v.arbete * 0.08, 0.05, 0.98);
}
// tid räknas mot yrkestaggar och bleknar, så att de senaste åren väger mest
const HABIT_FADE = 4 * DAY;
export const habitTotal = (p: Person) => { let t = 0; for (const k in p.habit) t += p.habit[k]; return t; };
export const habitShare = (p: Person, acts: Act[], tot = habitTotal(p)) => tot > 0 ? acts.reduce((a, k) => a + (p.habit[k] ?? 0), 0) / tot : 0;
export const TAGS: { tag: string; acts: Act[]; min: number }[] = [
  { tag: 'Jägare', acts: ['jakt'], min: 0.2 },
  { tag: 'Fiskare', acts: ['fiske'], min: 0.2 },
  { tag: 'Samlare', acts: ['samla'], min: 0.2 },
  { tag: 'Vedhuggare', acts: ['ved'], min: 0.15 },
  { tag: 'Hantverkare', acts: ['hantverk'], min: 0.15 },
  { tag: 'Berättare', acts: ['beratta'], min: 0.06 },
  { tag: 'Eldvaktare', acts: ['elda', 'tanda'], min: 0.02 },
  { tag: 'Väktare', acts: ['vakt'], min: 0.08 },
  { tag: 'Dagdrivare', acts: ['vila'], min: 0.3 },
];
// taggen går till den som gör något klart mer än andra i byn; den som redan har en tagg behåller den lättare
function updateTags(s: State) {
  const ppl = living(s).filter(p => ageOf(p, s.now) >= 14);
  const tot = new Map(ppl.map(p => [p, habitTotal(p)]));
  const avg = TAGS.map(t => ppl.reduce((a, p) => a + habitShare(p, t.acts, tot.get(p)), 0) / (ppl.length || 1));
  for (const p of ppl) {
    let best: string | undefined, br = 0;
    if (tot.get(p)! >= 24) TAGS.forEach((t, i) => {
      const sh = habitShare(p, t.acts, tot.get(p)), keep = p.tag === t.tag, r = sh / (avg[i] || 1e-9);
      if (sh >= t.min * (keep ? 0.8 : 1) && r >= (keep ? 1.2 : 1.5) && r * (keep ? 1.3 : 1) > br) { best = t.tag; br = r * (keep ? 1.3 : 1); }
    });
    if (best !== p.tag) {
      p.tag = best;
      const txt = `${p.name} kallas nu för ${best?.toLowerCase()}.`;
      if (best && best !== 'Dagdrivare' && !s.log.some(l => l.text === txt)) log(s, txt, 'skill', [p.id]);
    }
  }
}
const dygn = (v: number) => `${v >= 10 ? Math.round(v) : v.toFixed(1).replace('.', ',')} dygn`;

// ---------- val av aktivitet ----------
function spotFor(s: State, act: Act, p: Person): { x: number; y: number } {
  const m = getMap(s.seed);
  const f = m.fire;
  if (act === 'samtal' || act === 'beratta' || act === 'hantverk' || act === 'vakt' || act === 'varma') {
    const ang = rnd(s) * Math.PI * 2, r = act === 'vakt' ? 2.6 : 1.3 + rnd(s) * 0.9;
    return { x: f.x + 0.5 + Math.cos(ang) * r, y: f.y + 0.5 + Math.sin(ang) * r };
  }
  if (act === 'kol') return { x: f.x + 0.5 + (rnd(s) - 0.5) * 0.6, y: f.y + 1.1 };
  if (act === 'sova' || act === 'vila') { const h = m.huts[p.id % m.huts.length]; return { x: h.x + 0.6 + rnd(s) * 0.8, y: h.y + 0.6 + rnd(s) * 0.8 }; }
  if (act === 'leka') { // lekplatsen ligger söder om elden, men aldrig i vattnet
    for (let k = 0; k < 12; k++) {
      const x = f.x + (rnd(s) - 0.5) * 8, y = f.y + 3 + rnd(s) * 3;
      if (x >= 0 && y >= 0 && x < W && y < H && m.tiles[Math.floor(y) * W + Math.floor(x)] !== T.Vatten) return { x, y };
    }
    return { x: f.x + 0.5, y: f.y + 1.5 };
  }
  const want = (t: number, x: number, y: number) => {
    if (act === 'fiske') {
      if (t === T.Vatten) return false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && m.tiles[yy * W + xx] === T.Vatten) return true; }
      return false;
    }
    if (act === 'samla') return t === T.Gras || t === T.Skog;
    if (act === 'toa') return t === T.Gras || t === T.Skog || t === T.Sand;
    return t === T.Skog;
  };
  const cands: { x: number; y: number; d: number }[] = [];
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(f.x + (rnd(s) - 0.5) * 34), y = Math.floor(f.y + (rnd(s) - 0.5) * 26);
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const d = Math.hypot(x - f.x, y - f.y);
    if (d < (act === 'samla' || act === 'toa' ? 5 : 4) || (act === 'toa' && d > 9)) continue;
    if (want(m.tiles[y * W + x], x, y)) cands.push({ x, y, d });
  }
  cands.sort((a, b) => a.d - b.d);
  const c = cands[Math.floor(rnd(s) * Math.min(6, cands.length))] ?? { x: f.x + 6, y: f.y };
  return { x: c.x + 0.5, y: c.y + 0.5 };
}

// Viljan i tre steg:
// 1. Nöd: sjuk, svag, fryser farligt eller måste på toa genast. Inget annat räknas.
// 2. Grundbehov: toa, värme och vila. En lat person tillgodoser dem tidigare än en flitig.
// 3. Byns behov mot egen lust, vägda med pliktkänslan.
function chooseTask(s: State, p: Person, live: boolean) {
  const a = ageOf(p, s.now), now = s.now;
  const light = isLight(now);
  const sick = p.sickUntil !== undefined && p.sickUntil > now;
  const lazy = 1 - duty(s, p), lit = s.fire.lit, sd = s.seder.v;
  let act: Act, why: string;
  let dur = (20 + rnd(s) * 40) * 60 * SEC; // 20–60 min
  const set = (x: Act, w: string) => { act = x; why = w; };
  if (a < 3) set('sova', 'Är ett litet barn');
  else if (p.toa < 0.12) set('toa', 'Måste gå på toa genast');
  else if (sick) set('sova', 'Är sjuk');
  else if (p.health < 0.4) set('sova', 'Är för svag för att orka något');
  else if (p.warm < 0.25 && lit) set('varma', 'Fryser farligt');
  else if (!light && a > 68 && rnd(s) < 0.6) set('sova', 'Är gammal och sover på natten');
  else if (p.toa < 0.25 + 0.1 * lazy) set('toa', 'Behöver gå på toa');
  else if (p.warm < 0.4 + 0.15 * lazy && lit) set('varma', 'Fryser');
  else if (p.rest < (light ? 0.15 : 0.12) + 0.2 * lazy) set('vila', 'Är trött');
  else if (light) {
    if (a < 8) set('leka', 'Är barn och leker');
    else {
      const fd = foodDays(s), wd = woodDays(s), ai = ageIndex(s);
      const fs = 1 + 0.25 * sd.forsiktighet; // en försiktig by vill ha större förråd
      const wFood = clamp(3.2 - fd / (2.5 * fs), 0.4, 3.5);
      const wWood = clamp(2.5 - wd / (2 * fs), 0.15, 3);
      const tot = habitTotal(p);
      let best: Act = 'samla', bs = -1, burg = 0;
      for (const w of WORK) {
        const need = w === 'ved' ? wWood : wFood;
        const tinder = w === 'samla' && needTinder(s);
        const col = need * (w === 'ved' ? 1 : tinder ? Math.max(0.8, SEASON[w][ai]) * 3 : SEASON[w][ai]); // nytta för byn
        const like = (4 + p.skill[w as Skill] + stat(p, WORK_STAT[w], now) / 3) * (1 + 2 * habitShare(p, [w], tot)); // egen lust och vana
        const sc = col * like * (0.6 + rnd(s) * 0.8);
        burg = Math.max(burg, col);
        if (sc > bs) { bs = sc; best = w; }
      }
      const u = clamp(burg / 3, 0, 1); // hur akut byn behöver arbete
      const sat = Math.min(p.hunger, p.rest, p.social); // hur väl de egna behoven är fyllda
      const what = best === 'ved' ? `Byn behöver ved, förrådet räcker ${dygn(wd)}` : best === 'samla' && needTinder(s) ? 'Byn behöver tändmaterial till elden' : `Byn behöver mat, förrådet räcker ${dygn(fd)}`;
      const workWhy = () => what + (lazy < 0.2 ? '. Plikttrogen.' : habitShare(p, [best], tot) > 0.25 ? '. Brukar göra det.' : p.skill[best as Skill] > 10 ? '. Skicklig på det.' : '.');
      if (a >= 12 && (s.fire.ash ?? 0) >= 1 && !lit && !emberOn(s) && rnd(s) < 0.2 && !living(s).some(q => q.task?.act === 'kol')) {
        set('kol', 'Det ligger kol kvar i den slocknade elden');
        dur = 10 * 60 * SEC;
      } else if (a < 14) {
        if (rnd(s) < 0.45 + 0.2 * sd.barn) set('leka', 'Är barn och leker');
        else set(best, `Hjälper till. ${what}.`);
      } else if (rnd(s) < (1 - lazy) * (0.88 + 0.12 * u) + lazy * sat * (0.6 + 0.4 * u)) {
        set(best, workWhy());
        dur = (60 + rnd(s) * 120) * 60 * SEC;
      } else {
        // egen lust: vila, hantverk eller umgänge
        const wv = (1 - p.rest) * 2 + lazy * 0.6;
        const wh = (p.skill.hantverk / 10 + p.pot.flit / 20) * (u < 0.25 ? 1.5 : 0.6);
        const wsoc = (1 - p.social) * 2;
        const r = rnd(s) * (wv + wh + wsoc);
        if (r < wv) set('vila', lazy > 0.5 ? 'Har det bra och tar det lugnt' : 'Tar en paus');
        else if (r < wv + wh) set('hantverk', u < 0.25 ? 'Byn har det gott ställt, det finns tid för hantverk' : 'Tycker om att göra handarbete');
        else set('samtal', 'Vill umgås');
      }
    }
  } else {
    const guardDay = Math.floor((s.now - s.founded - 7 * HOUR) / DAY);
    const adults = living(s).filter(q => ageOf(q, s.now) >= 16 && ageOf(q, s.now) < 60);
    if (guardDay !== s.lastGuardDay && adults.length) {
      // välj nattens vakt (modigast med lite slump), byts varje natt
      s.lastGuardDay = guardDay;
      const g = adults.sort((x, y) => (y.pot.mod + rnd(s) * 8) - (x.pot.mod + rnd(s) * 8))[0];
      g.task = undefined; (g as any)._guard = guardDay;
    }
    if ((p as any)._guard === guardDay && a >= 16) set('vakt', 'Håller vakt i natt');
    else {
      const r = rnd(s);
      const story = (p.skill.berattande + (a > 50 ? 6 : 0)) / 40;
      const craft = (p.skill.hantverk + stat(p, 'flit', s.now)) / 70;
      if (a < 8) { if (r < 0.6) set('samtal', 'Mörkt, sitter med de vuxna vid elden'); else set('sova', 'Barn sover på natten'); }
      else if (r < story) set('beratta', 'Mörkt, berättar för de andra vid elden');
      else if (r < story + craft) set('hantverk', 'Mörkt, gör handarbete vid elden');
      else if (r < 0.9) set('samtal', 'Mörkt, umgås vid elden');
      else set('vila', 'Mörkt, vilar i hyddan');
    }
  }
  if (act! === 'toa') dur = (4 + rnd(s) * 4) * 60 * SEC;
  const sp = spotFor(s, act!, p);
  if (!live) { p.x = sp.x; p.y = sp.y; tread(s, sp.x, sp.y, WORK.includes(act!) ? 2 : 1); }
  p.task = { act: act!, phase: live ? 'go' : 'do', tx: sp.x, ty: sp.y, until: s.now + dur, carry: 0, why: why!, dark: !light };
}

// ---------- samtal ----------
export interface TalkEvent { a: number; b: number; kind: string; good: boolean; t: number }
const SOCIAL: Act[] = ['samtal', 'beratta', 'hantverk', 'vakt', 'leka', 'varma'];
// uppgifter som avbryts när dag blir natt eller natt blir dag
const FLIP: Act[] = ['samla', 'jakt', 'fiske', 'ved', 'leka', 'samtal', 'beratta', 'hantverk', 'vakt', 'vila'];
function converse(s: State, a: Person, others: Person[], events?: TalkEvent[]) {
  const now = s.now;
  if (!others.length) return;
  // välj samtalspartner viktad efter relation
  let tot = 0;
  const w = others.map(b => { const r = getRel(s, a, b); const v = Math.max(0.1, 1 + r.op / 40 + r.chem * 0.5 + (b.partner === a.id ? 1.5 : 0)); tot += v; return v; });
  let x = rnd(s) * tot, b = others[0];
  for (let i = 0; i < others.length; i++) { x -= w[i]; if (x <= 0) { b = others[i]; break; } }
  const r = getRel(s, a, b);
  const aa = ageOf(a, now), ba = ageOf(b, now);
  const mood = moodOf(a, now);
  let kind: string;
  const canFlirt = aa >= 16 && ba >= 16 && a.sex !== b.sex && !isKin(a, b) && Math.abs(aa - ba) < 18 &&
    ((a.partner === undefined && b.partner === undefined) || a.partner === b.id);
  if ((mood < 0.3 && rnd(s) < 0.35) || (r.op < -25 && rnd(s) < 0.5)) kind = 'gräl';
  else if (a.task?.act === 'beratta') kind = 'berättelse';
  else if (canFlirt && rnd(s) < 0.12 + r.rom / 250 + (r.chem > 0.3 ? 0.08 : 0)) kind = 'flirt';
  else if (moodOf(b, now) < 0.35 && rnd(s) < stat(a, 'empati', now) / 25) kind = 'tröst';
  else if (r.op > 30 && rnd(s) < 0.3) kind = 'djupt samtal';
  else if (rnd(s) < 0.25) kind = 'skämt';
  else kind = 'småprat';

  let out = r.chem * 1.1 + similarity(a, b) * 0.7 + (stat(a, 'vanlighet', now) + stat(b, 'vanlighet', now)) / 40 - 0.55 + (rnd(s) - 0.5) * 1.3;
  if (isKin(a, b)) out += 0.35;
  const mult: Record<string, number> = { 'småprat': 1, 'skämt': 1.6, 'djupt samtal': 2.6, 'tröst': 2.2, 'berättelse': 1.2, 'flirt': 1, 'gräl': 0 };
  if (kind === 'gräl') {
    r.op -= 3 + rnd(s) * 3;
    think(a, `Grälade med ${b.name}`, -0.08, now, 6 * HOUR);
    think(b, `Grälade med ${a.name}`, -0.1, now, 6 * HOUR);
  } else {
    r.op += mult[kind] * out * (kind === 'skämt' && out < 0 ? 1.2 : 1);
    if (kind === 'tröst' && out > -0.3) think(b, `Tröstades av ${a.name}`, 0.08, now, 4 * HOUR);
    if (kind === 'berättelse') { a.skill.berattande = clamp(a.skill.berattande + 0.04 * (0.5 + a.pot.intelligens / 20), 0, 20); }
    if (kind === 'flirt') {
      const att = (stat(b, 'skonhet', now) + stat(b, 'karisma', now)) / 40;
      r.rom = clamp(r.rom + (out + att) * 4, 0, 100);
    }
  }
  r.op = clamp(r.op, -100, 100);
  r.talks++;
  a.social = clamp(a.social + 0.06, 0, 1); b.social = clamp(b.social + 0.06, 0, 1);
  events?.push({ a: a.id, b: b.id, kind, good: kind !== 'gräl' && out > 0, t: now });

  if (r.op > 60 && !(r.flags & 1) && !isKin(a, b) && a.partner !== b.id) { r.flags |= 1; log(s, `${a.name} och ${b.name} har blivit nära vänner.`, 'rel', [a.id, b.id]); }
  if (r.op < -45 && !(r.flags & 2)) { r.flags |= 2; log(s, `${a.name} och ${b.name} har blivit ovänner.`, 'rel', [a.id, b.id]); }
  if (r.rom > 70 && r.op > 30 && a.partner === undefined && b.partner === undefined && canFlirt) pair(s, a, b);
  if (a.partner === b.id && r.op < -25) {
    a.partner = undefined; b.partner = undefined; r.rom = 10;
    log(s, `${a.name} och ${b.name} gick skilda vägar.`, 'rel', [a.id, b.id]);
    think(a, `Separerade från ${b.name}`, -0.15, now, DAY); think(b, `Separerade från ${a.name}`, -0.15, now, DAY);
  }
}

export function moodOf(p: Person, now: number) {
  let m = 0.55;
  if (p.hunger < 0.2) m -= 0.2; else if (p.hunger > 0.6) m += 0.05;
  if (p.rest < 0.2) m -= 0.12;
  if (p.social < 0.2) m -= 0.1; else if (p.social > 0.7) m += 0.05;
  if (p.health < 0.6) m -= 0.12;
  for (const t of p.thoughts) if (t.until > now) m += t.v;
  return clamp(m, 0, 1);
}

// ---------- död, födsel, flytt ----------
function die(s: State, p: Person, cause: string) {
  p.died = s.now; p.cause = cause; p.task = undefined;
  const a = Math.floor(ageOf(p, s.now));
  log(s, `${p.name} dog ${cause}, ${a} år gammal.`, 'death', [p.id]);
  if (cause === 'av svält') sedEvent(s, 'forsiktighet', 0.15, `${p.name} svalt ihjäl. Byn har blivit mer försiktig.`);
  else if (cause === 'av kyla') sedEvent(s, 'forsiktighet', 0.1, `${p.name} frös ihjäl. Byn har blivit mer försiktig.`);
  else if (cause === 'under en jakt') sedEvent(s, 'forsiktighet', 0.04, `${p.name} dog under en jakt. Byn blev lite försiktigare.`);
  if (a < 5) sedEvent(s, 'barn', 0.08, `Byn sörjer barnet ${p.name} och värnar mer om sina barn.`);
  if (a >= 70) p.fame.push(`Blev ${a} år gammal`);
  for (const q of living(s)) {
    if (q.partner === p.id) { q.partner = undefined; think(q, `Sörjer ${p.name}`, -0.3, s.now, 1.2 * DAY); }
    else if (q.mother === p.id || q.father === p.id || p.mother === q.id || p.father === q.id) think(q, `Sörjer ${p.name}`, -0.25, s.now, DAY);
    else { const r = s.rels[relKey(p.id, q.id)]; if (r && r.op > 40) think(q, `Saknar ${p.name}`, -0.12, s.now, 0.6 * DAY); }
  }
}

function birth(s: State, mother: Person) {
  const father = byId(s, mother.partner) ?? byId(s, (mother as any)._by);
  mother.pregnantSince = undefined; mother.lastBirth = s.now;
  const ch = newPerson(s, rnd(s) < 0.5 ? 'm' : 'k', s.now, mother, father);
  ch.x = mother.x; ch.y = mother.y;
  s.people.push(ch);
  log(s, `${ch.name} föddes, ${ch.sex === 'k' ? 'dotter' : 'son'} till ${mother.name}${father ? ' och ' + father.name : ''}.`, 'birth', [ch.id, mother.id, ...(father ? [father.id] : [])]);
  think(mother, `Fick barnet ${ch.name}`, 0.2, s.now, DAY);
  if (father && alive(father)) think(father, `Fick barnet ${ch.name}`, 0.18, s.now, DAY);
  const kids = s.people.filter(q => q.mother === mother.id).length;
  if (kids === 6) mother.fame.push('Mor till många barn');
  if (rnd(s) < 0.025) die(s, mother, 'i barnsäng');
}

function emigrate(s: State) {
  const now = s.now;
  const cands = living(s).filter(p => p.partner !== undefined && ageOf(p, now) > 18 && ageOf(p, now) < 38);
  if (!cands.length) return;
  const a = pick(s, cands), b = byId(s, a.partner)!;
  const group = [a, b, ...living(s).filter(c => (c.mother === a.id || c.father === a.id || c.mother === b.id || c.father === b.id) && ageOf(c, now) < 14)];
  for (const g of group) { g.left = now; g.task = undefined; }
  const n = group.length - 2;
  log(s, `Byn blev trång. ${a.name} och ${b.name} lämnade byn${n ? ` med ${n} barn` : ''} för att grunda en egen boplats.`, 'move', group.map(g => g.id));
  for (const q of living(s)) for (const g of group) { const r = s.rels[relKey(q.id, g.id)]; if (r && r.op > 40) { think(q, `Saknar ${g.name}`, -0.08, now, 0.5 * DAY); break; } }
}

// ---------- huvudsteg ----------
// dt i sekunder. live=true: personer går och bär; live=false: grovt steg (ikappräkning/snabbspolning)
export function step(s: State, dtSec: number, live: boolean, events?: TalkEvent[]) {
  s.now += dtSec * SEC;
  const now = s.now;
  const ai = ageIndex(s);
  if (ai !== s.lastAgeIdx) {
    s.lastAgeIdx = ai;
    const msg = ['Istiden har börjat. Sjön fryser och maten blir knapp.', 'Vårtiden har kommit. Isen släpper och marken tinar.', 'Sommartiden är här. Bär och fisk finns i överflöd.', 'Hösttiden har börjat. Nu gäller det att samla inför istiden.'][ai];
    log(s, msg, 'world');
  }
  const ppl = living(s);
  const light = isLight(now);
  // förråd: ruttning och ved
  s.food = Math.max(0, s.food * Math.exp(-0.003 * (1 + s.food / 250) / 3600 * dtSec * (ai === 0 ? 0.5 : 1)));
  stepFire(s, dtSec, live, ppl);
  const fh = hearthOf(s.fire), coldRate = COLD[ai][light ? 0 : 1];
  const learn = 1 + 0.1 * s.seder.v.nyfikenhet; // en nyfiken by lär sig snabbare
  if (Math.floor(now / HOUR) !== Math.floor((now - dtSec * SEC) / HOUR)) {
    stepSeder(s); updateTags(s);
    const m = getMap(s.seed); regrow(m.tiles, coverOf(s), 1, GROW[ai], [m.fire.y * W + m.fire.x]);
  }

  const social: Person[] = [];
  for (const p of ppl) {
    const a = ageOf(p, now);
    // behov
    p.hunger = clamp(p.hunger - dtSec / (16 * 3600) * (a < 10 ? 0.7 : 1), 0, 1);
    const working = p.task && WORK.includes(p.task.act) && p.task.phase === 'do';
    const resting = p.task && (p.task.act === 'vila' || p.task.act === 'sova' || p.task.act === 'samtal' || p.task.act === 'hantverk' || p.task.act === 'varma');
    p.rest = clamp(p.rest + dtSec / 3600 * (resting ? 0.09 : working ? -0.06 : -0.03), 0, 1);
    // värme: elden värmer i ett område, hyddan skyddar mot halva kylan
    const heat = heatAt(s, p.x, p.y);
    const inHut = p.task?.phase === 'do' && (p.task.act === 'sova' || p.task.act === 'vila');
    p.warm = clamp(p.warm + dtSec / 3600 * (heat * 2 - coldRate * (inHut ? 0.5 : 1) + (coldRate === 0 ? 0.5 : 0)), 0, 1);
    if (heat > 0.15) {
      think(p, 'Värms av elden', fh.comfort, now, HOUR);
      p.rest = clamp(p.rest + dtSec / 3600 * fh.comfort * heat, 0, 1); // avslappning vid elden
    }
    if (p.warm < 0.35) think(p, 'Fryser', -0.12, now, HOUR);
    p.social = clamp(p.social - dtSec / (18 * 3600), 0, 1);
    // toa: behovet växer på ungefär sju timmar, långsammare i sömnen
    p.toa = clamp(p.toa - dtSec / (7 * 3600) * (p.task?.act === 'sova' ? 0.5 : 1), 0, 1);
    if (p.toa <= 0) { p.toa = 1; if (a >= 3) think(p, 'Kissade på sig', -0.12, now, 4 * HOUR); }
    if (p.hunger < 0.45 && s.food >= 0.6) { const portion = a < 10 ? 0.6 : 1; s.food -= portion; p.hunger = clamp(p.hunger + 0.55, 0, 1); }
    // hälsa
    if (p.hunger <= 0) { p.health -= dtSec / (5 * 3600); if (rnd(s) < dtSec / 7200) think(p, 'Svälter', -0.25, now, 3 * HOUR); }
    else if (p.warm < 0.12) p.health -= dtSec / (20 * 3600);
    else if (p.hunger > 0.3 && !(p.sickUntil && p.sickUntil > now)) p.health = clamp(p.health + dtSec / (10 * 3600), 0, 1);
    if (p.sickUntil && p.sickUntil > now) p.health -= dtSec / (40 * 3600);
    if (!p.sickUntil || p.sickUntil < now) {
      if (chance(s, (ai === 0 ? 0.12 : 0.05) / 86400, dtSec)) { const dur = (3 + rnd(s) * 8) * HOUR; p.sickUntil = now + dur; if (dur > 8 * HOUR) log(s, `${p.name} blev svårt sjuk.`, 'world', [p.id]); }
    }
    if (p.health <= 0) { die(s, p, p.hunger <= 0 ? 'av svält' : p.warm < 0.12 ? 'av kyla' : 'av sjukdom'); continue; }
    // ålderdom och olyckor (Gompertz, per år = per dygn)
    const q = 0.0015 + 0.00004 * Math.exp(0.105 * a) + (a < 5 ? 0.02 : 0);
    if (chance(s, q / 86400, dtSec)) { die(s, p, a > 55 ? 'av ålderdom' : a < 5 ? 'av en barnsjukdom' : 'i en olycka'); continue; }
    if (p.task && (p.task.act === 'jakt') && p.task.phase === 'do' && chance(s, 0.0008 * (1 - p.skill.jakt / 25) / 3600, dtSec)) { die(s, p, 'under en jakt'); continue; }
    // graviditet
    if (p.pregnantSince !== undefined) { if (now - p.pregnantSince > 0.75 * DAY) birth(s, p); }
    else if (p.sex === 'k' && p.partner !== undefined && a >= 17 && a <= 43 && (!p.lastBirth || now - p.lastBirth > 1.6 * DAY)) {
      const pop = ppl.length;
      const f = (pop >= 26 ? 0.15 : 1) * clamp(foodDays(s) / 4, 0.15, 1) * (1 + 0.2 * s.seder.v.barn);
      if (chance(s, 0.3 * f / 86400, dtSec)) { p.pregnantSince = now; (p as any)._by = p.partner; }
    }
    // uppgift
    const t = p.task;
    const phaseFlip = t && t.dark !== !light && FLIP.includes(t.act); // dag blev natt eller tvärtom
    const lightDone = t?.act === 'tanda' && (s.fire.lit || !canLight(s));
    const mustGo = t && p.toa < 0.08 && t.act !== 'toa' && a >= 3; // nöden avbryter det man håller på med
    if (!t || (t.until < now && t.phase !== 'back') || ((phaseFlip || mustGo) && t.phase !== 'back') || lightDone) {
      if (t && (t.carry > 0 || t.items) && t.act !== 'elda' && live) { t.phase = 'back'; const m = getMap(s.seed); t.tx = m.stock.x + 0.5 + rnd(s) * 1.5; t.ty = m.stock.y + 0.5 + rnd(s); }
      else chooseTask(s, p, live);
    }
    const tk = p.task!;
    if (live) {
      if (tk.phase === 'go' || tk.phase === 'back') {
        // vägsökning: gå ruta för ruta runt vatten, gärna längs stigar
        const m = getMap(s.seed), cov = coverOf(s);
        const key = `${tk.tx.toFixed(2)},${tk.ty.toFixed(2)}`;
        if (tk.pk !== key) { tk.pk = key; tk.path = findPath(m.tiles, cov, p.x, p.y, tk.tx, tk.ty) ?? []; }
        const off = (((p.id * 37) % 7) - 3) * 0.06; // var och en går lite vid sidan av, så att de inte täcker varandra
        let budget = (a < 6 ? 0.9 : a > 65 ? 1 : 1.6) * dtSec;
        while (tk.path && tk.path.length && budget > 0) {
          const i = tk.path[0], wx = (i % W) + 0.5 + off, wy = Math.floor(i / W) + 0.5 - off;
          const ci = tileOf(p.x, p.y), sp = speedAt(m.tiles, cov, ci) || 1;
          const dx = wx - p.x, dy = wy - p.y, d = Math.hypot(dx, dy), can = budget * sp;
          const mv = Math.min(d, can);
          wear(m.tiles, cov, ci, WEAR * mv);
          if (d <= can) { p.x = wx; p.y = wy; tk.path.shift(); budget -= d / sp; }
          else { p.x += dx / d * can; p.y += dy / d * can; budget = 0; }
        }
        const ci = tileOf(p.x, p.y), spd = speedAt(m.tiles, cov, ci) || 1;
        const dx = tk.tx - p.x, dy = tk.ty - p.y, d = Math.hypot(dx, dy);
        const sp = budget * spd;
        if (budget <= 0) { /* väntar på nästa steg */ }
        else if (d <= sp) {
          tk.path = undefined; tk.pk = undefined;
          p.x = tk.tx; p.y = tk.ty;
          if (tk.act === 'elda') {
            if (tk.phase === 'go') {
              // vid förrådet: ta en famn ved och gå till elden
              const m = getMap(s.seed), n = s.fire.fuel >= fireWant(s) ? 0 : Math.min(3, Math.max(1, fireWant(s) - s.fire.fuel), s.wood);
              if (n <= 0) p.task = undefined;
              else { s.wood -= n; tk.carry = n; tk.phase = 'back'; tk.tx = m.fire.x + 0.5 + (rnd(s) - 0.5) * 1.2; tk.ty = m.fire.y + 1.2; }
            } else { addFuel(s, p, tk.carry); tk.carry = 0; p.task = undefined; }
          } else if (tk.phase === 'back') {
            if (tk.act === 'ved') s.wood += tk.carry; else s.food += tk.carry;
            if (tk.items) addItems(s, tk.items);
            tk.carry = 0; p.task = undefined;
          } else tk.phase = 'do';
        } else { wear(m.tiles, cov, ci, WEAR * sp); p.x += dx / d * sp; p.y += dy / d * sp; }
      } else if (tk.act !== 'sova' && tk.act !== 'vakt' && tk.act !== 'hantverk') {
        // småjustering så att de rör sig lite
        if (rnd(s) < dtSec * 0.08) { const nx = p.x + (rnd(s) - 0.5) * 0.4, ny = p.y + (rnd(s) - 0.5) * 0.4; if (getMap(s.seed).tiles[tileOf(nx, ny)] !== T.Vatten) { p.x = nx; p.y = ny; } }
      }
    }
    if (tk.phase === 'do' && tk.act === 'toa') p.toa = 1;
    if (tk.phase === 'do' && tk.act === 'kol') takeCoal(s, p, 'hämtade');
    // vana: tiden räknas mot yrkestaggar
    const hf = Math.exp(-dtSec * SEC / HABIT_FADE);
    for (const k in p.habit) p.habit[k] *= hf;
    p.habit[tk.act] = (p.habit[tk.act] ?? 0) + dtSec / 3600;
    if (tk.phase === 'do' && WORK.includes(tk.act)) {
      const y = workRate(s, p, tk.act) * dtSec * (live ? 1 : 0.8);
      if (live) tk.carry += y; else if (tk.act === 'ved') s.wood += y; else s.food += y;
      if (tk.act === 'samla') {
        const got = forageItems(s, p, dtSec);
        if (got) { if (live) { tk.items ??= {}; for (const k in got) tk.items[k] = (tk.items[k] ?? 0) + got[k]; } else addItems(s, got); }
      }
      const sk = tk.act as Skill;
      const before = p.skill[sk];
      p.skill[sk] = clamp(p.skill[sk] + dtSec / 3600 * 0.12 * learn * (0.4 + stat(p, 'intelligens', now) / 20) * (1 - p.skill[sk] / 21), 0, 20);
      if (before < 16 && p.skill[sk] >= 16) {
        const title = `Mästare i ${SKILL_NAMES[sk].toLowerCase()}`, first = !s.people.some(q => q.fame.includes(title));
        p.fame.push(title); log(s, `${p.name} har blivit en mästare i ${SKILL_NAMES[sk].toLowerCase()}.`, 'skill', [p.id]);
        sedEvent(s, 'nyfikenhet', first ? 0.06 : 0.01, first ? `${p.name} blev byns första mästare i ${SKILL_NAMES[sk].toLowerCase()}. Byn ser vad kunskap kan ge.` : undefined);
      }
    }
    if (tk.phase === 'do' && tk.act === 'tanda' && canLight(s)) {
      s.fire.tryProg += dtSec;
      const per = igniterOf(s)!.minutes * 60;
      while (s.fire.tryProg >= per && canLight(s) && !s.fire.lit) { s.fire.tryProg -= per; if (tryLight(s, p)) { p.task = undefined; break; } }
    }
    if (tk.phase === 'do' && tk.act === 'hantverk') p.skill.hantverk = clamp(p.skill.hantverk + dtSec / 3600 * 0.1 * learn * (1 - p.skill.hantverk / 21), 0, 20);
    if (tk.phase === 'do' && SOCIAL.includes(tk.act)) social.push(p);
    p.thoughts = p.thoughts.filter(x => x.until > now);
  }
  // samtal: ca ett per 4 minuter per person i social aktivitet
  if (social.length > 1) {
    for (const p of social) {
      if (!alive(p)) continue;
      const expect = dtSec / 240 * (0.6 + stat(p, 'vanlighet', now) / 25);
      let n = Math.floor(expect); if (rnd(s) < expect - n) n++;
      const others = social.filter(q => q !== p && alive(q) && (!live || Math.hypot(q.x - p.x, q.y - p.y) < 4));
      for (let i = 0; i < n; i++) converse(s, p, others, live ? events : undefined);
    }
  }
  // relationer bleknar långsamt utan umgänge
  if (rnd(s) < dtSec / 600) {
    const k = Math.exp(-0.04 * (600 / 86400));
    for (const key in s.rels) { const r = s.rels[key]; r.op *= k; r.rom *= k; }
  }
  if (living(s).length > 30) emigrate(s);
  if (living(s).length === 0 && !s.log.some(l => l.text.startsWith('Byn är tom'))) log(s, 'Byn är tom. Ingen finns kvar vid elden.', 'world');
  for (const k in s.items) if (s.items[k] < 1e-6) delete s.items[k];
}

export function serialize(s: State) {
  s.mark = encodeCover(coverOf(s));
  return JSON.stringify(s, (k, v) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1000) / 1000 : v));
}

// rensa gammal historik så att sparfilen hålls liten
export function compact(s: State) {
  const gone = s.people.filter(p => !alive(p)).sort((a, b) => (b.died ?? b.left ?? 0) - (a.died ?? a.left ?? 0));
  if (gone.length > 120) {
    const drop = new Set(gone.slice(120).map(p => p.id));
    s.people = s.people.filter(p => !drop.has(p.id));
  }
  const ids = new Set(s.people.filter(alive).map(p => p.id));
  for (const k in s.rels) { const [a, b] = k.split('-').map(Number); if (!ids.has(a) && !ids.has(b)) delete s.rels[k]; }
}
