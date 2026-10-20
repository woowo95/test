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

export type Act = 'samla' | 'jakt' | 'fiske' | 'ved' | 'leka' | 'vila' | 'samtal' | 'beratta' | 'hantverk' | 'vakt' | 'sova' | 'elda' | 'tanda' | 'varma';
export const ACT_NAMES: Record<Act, string> = {
  samla: 'Samlar bär och rötter', jakt: 'Jagar', fiske: 'Fiskar', ved: 'Hugger ved', leka: 'Leker',
  vila: 'Vilar', samtal: 'Samtalar vid elden', beratta: 'Berättar vid elden', hantverk: 'Gör handarbete',
  vakt: 'Håller vakt', sova: 'Sover', elda: 'Lägger ved på elden', tanda: 'Försöker tända elden', varma: 'Värmer sig vid elden',
};
const WORK: Act[] = ['samla', 'jakt', 'fiske', 'ved'];

export interface Thought { text: string; v: number; until: number }
export interface Task { act: Act; phase: 'go' | 'do' | 'back'; tx: number; ty: number; until: number; carry: number; items?: Record<string, number> }

export interface Person {
  id: number; name: string; sex: 'm' | 'k';
  born: number; died?: number; cause?: string; left?: number;
  mother?: number; father?: number; partner?: number;
  pot: Record<Stat, number>; skill: Record<Skill, number>;
  hunger: number; rest: number; social: number; health: number;
  warm: number; // kroppsvärme 0–1
  sickUntil?: number; pregnantSince?: number; lastBirth?: number;
  thoughts: Thought[];
  x: number; y: number; task?: Task;
  fame: string[];
  hue: number;
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
}

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
export const ITEM_NAMES: Record<string, string> = { gniststen: 'Gniststen', torrgras: 'Torrt gräs', pinnar: 'Små pinnar' };

export interface FireLog { t: number; k: 'tänd' | 'fyll' | 'slocknade' | 'glöd' | 'sprack'; id?: number; n?: number }
export interface Fire {
  hearth: string; fuel: number; lit: boolean; emberUntil?: number;
  litAt?: number; litBy?: number; burned: number; // denna eld
  totalBurned: number; litSec: number; lightings: number; outs: number;
  tries: number; tryTotal: number; tryProg: number; // försök sedan elden senast brann, totalt, sekunder in i pågående försök
  fills: Record<string, number>; log: FireLog[];
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
    pot, skill, hunger: 0.8, rest: 0.9, social: 0.7, health: 1, warm: 1, thoughts: [],
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
  const s: State = { v: 1, seed, rng: seed, founded: now, now, people: [], rels: {}, nextId: 1, food: 60, wood: 25, log: [], lastAgeIdx: 1, lastGuardDay: -1, items: {}, fire: newFire() };
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
  }
  if (!s.items) s.items = { gniststen: 1, torrgras: 8, pinnar: 8 };
  if (!s.fire) {
    s.fire = newFire();
    Object.assign(s.fire, { lit: true, fuel: 4, litAt: s.founded, lightings: 1, litSec: (s.now - s.founded) / SEC });
    s.fire.log.push({ t: s.founded, k: 'tänd' });
  }
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
// hur mycket ved invånarna vill ha på elden: mest i istiden och på natten
export function fireTarget(s: State) {
  const ai = ageIndex(s), light = isLight(s.now);
  return hearthOf(s.fire).maxFuel * (ai === 0 ? 1 : !light ? 0.7 : ai === 2 ? 0.25 : 0.4);
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
  fireLog(s, { k: 'tänd', id: p.id, n: f.tries });
  log(s, `${p.name} lyckades tända elden${f.tries > 1 ? ` efter ${f.tries} försök` : ''}.`, 'world', [p.id]);
  think(p, 'Tände elden', 0.15, s.now, DAY / 2);
  if (f.lightings === 1) p.fame.push('Tände byns första eld');
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
function assign(s: State, p: Person, act: Act, tx: number, ty: number, dur: number, live: boolean) {
  if (!live) { p.x = tx; p.y = ty; }
  p.task = { act, phase: live ? 'go' : 'do', tx, ty, until: s.now + dur, carry: 0 };
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
  if (f.emberUntil !== undefined && !f.lit && f.emberUntil <= now) f.emberUntil = undefined;
  // påfyllning: en person i taget hämtar ved i förrådet
  const tgt = fireTarget(s);
  if ((f.lit || emberOn(s)) && f.fuel < tgt * 0.5 && s.wood >= 0.5 && !ppl.some(p => p.task?.act === 'elda')) {
    const cands = ppl.filter(p => awake(s, p, 8));
    const fx = m.fire.x + 0.5, fy = m.fire.y + 0.5;
    cands.sort((a, b) => (Math.hypot(a.x - fx, a.y - fy) - (a.task?.act === 'vakt' ? 50 : 0)) - (Math.hypot(b.x - fx, b.y - fy) - (b.task?.act === 'vakt' ? 50 : 0)));
    const p = cands[0];
    if (p) {
      const n = Math.min(3, tgt - f.fuel, s.wood);
      if (live) { assign(s, p, 'elda', m.stock.x + 0.5 + rnd(s) * 1.5, m.stock.y + 0.5 + rnd(s), HOUR, true); }
      else { s.wood -= n; addFuel(s, p, n); }
    }
  }
  // tändning: en person i taget försöker när elden är släckt och tändmaterial finns
  if (!f.lit && !emberOn(s) && canLight(s) && !ppl.some(p => p.task?.act === 'tanda')) {
    const cands = ppl.filter(p => awake(s, p, 12)).sort((a, b) => (b.skill.elda + stat(b, 'flit', now) / 2 + rnd(s) * 3) - (a.skill.elda + stat(a, 'flit', now) / 2 + rnd(s) * 3));
    const p = cands[0];
    if (p) assign(s, p, 'tanda', m.fire.x + 0.5 + (rnd(s) - 0.5) * 1.2, m.fire.y + 1.3, 3 * HOUR, live);
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

// ---------- val av aktivitet ----------
function spotFor(s: State, act: Act, p: Person): { x: number; y: number } {
  const m = getMap(s.seed);
  const f = m.fire;
  if (act === 'samtal' || act === 'beratta' || act === 'hantverk' || act === 'vakt' || act === 'varma') {
    const ang = rnd(s) * Math.PI * 2, r = act === 'vakt' ? 2.6 : 1.3 + rnd(s) * 0.9;
    return { x: f.x + 0.5 + Math.cos(ang) * r, y: f.y + 0.5 + Math.sin(ang) * r };
  }
  if (act === 'sova' || act === 'vila') { const h = m.huts[p.id % m.huts.length]; return { x: h.x + 0.6 + rnd(s) * 0.8, y: h.y + 0.6 + rnd(s) * 0.8 }; }
  if (act === 'leka') return { x: f.x + (rnd(s) - 0.5) * 8, y: f.y + 3 + rnd(s) * 3 };
  const want = (t: number, x: number, y: number) => {
    if (act === 'fiske') {
      if (t === T.Vatten) return false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && m.tiles[yy * W + xx] === T.Vatten) return true; }
      return false;
    }
    if (act === 'samla') return t === T.Gras || t === T.Skog;
    return t === T.Skog;
  };
  const cands: { x: number; y: number; d: number }[] = [];
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(f.x + (rnd(s) - 0.5) * 34), y = Math.floor(f.y + (rnd(s) - 0.5) * 26);
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const d = Math.hypot(x - f.x, y - f.y);
    if (d < (act === 'samla' ? 5 : 4)) continue;
    if (want(m.tiles[y * W + x], x, y)) cands.push({ x, y, d });
  }
  cands.sort((a, b) => a.d - b.d);
  const c = cands[Math.floor(rnd(s) * Math.min(6, cands.length))] ?? { x: f.x + 6, y: f.y };
  return { x: c.x + 0.5, y: c.y + 0.5 };
}

function chooseTask(s: State, p: Person, live: boolean) {
  const a = ageOf(p, s.now);
  const light = isLight(s.now);
  const sick = p.sickUntil !== undefined && p.sickUntil > s.now;
  let act: Act;
  let dur = (20 + rnd(s) * 40) * 60 * SEC; // 20–60 min
  if (a < 3 || sick || (!light && a > 68 && rnd(s) < 0.6) || p.health < 0.4) act = 'sova';
  else if (p.warm < 0.45 && s.fire.lit) act = 'varma';
  else if (light) {
    if (a < 8) act = 'leka';
    else if (p.rest < 0.25 || rnd(s) < 0.22 - stat(p, 'flit', s.now) / 110) act = 'vila';
    else if (a < 14) {
      act = rnd(s) < 0.45 ? 'leka' : pick(s, WORK);
    } else if (foodDays(s) > 14 && woodDays(s) > 4 && rnd(s) < 0.45) {
      act = 'hantverk'; // överflöd ger tid för hantverk och kultur
    } else {
      const fd = foodDays(s), wd = woodDays(s);
      const ai = ageIndex(s);
      const wFood = clamp(3.2 - fd / 2.5, 0.4, 3.5);
      const wWood = clamp(2.5 - wd / 2, 0.15, 3);
      const opts: [Act, number][] = WORK.map(w => {
        const need = w === 'ved' ? wWood : wFood;
        const tinder = w === 'samla' && needTinder(s);
        const sf = w === 'ved' ? 1 : tinder ? Math.max(0.8, SEASON[w][ai]) * 3 : SEASON[w][ai];
        const like = 4 + p.skill[w as Skill] + stat(p, WORK_STAT[w], s.now) / 3;
        return [w, need * sf * like * (0.6 + rnd(s) * 0.8)];
      });
      opts.sort((x, y) => y[1] - x[1]);
      act = opts[0][0];
      dur = (60 + rnd(s) * 120) * 60 * SEC;
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
    if ((p as any)._guard === guardDay && a >= 16) act = 'vakt';
    else if (p.rest < 0.2) act = 'vila';
    else {
      const r = rnd(s);
      const story = (p.skill.berattande + (a > 50 ? 6 : 0)) / 40;
      const craft = (p.skill.hantverk + stat(p, 'flit', s.now)) / 70;
      act = a < 8 ? (r < 0.6 ? 'samtal' : 'sova') : r < story ? 'beratta' : r < story + craft ? 'hantverk' : r < 0.9 ? 'samtal' : 'vila';
    }
  }
  const sp = spotFor(s, act, p);
  if (!live) { p.x = sp.x; p.y = sp.y; }
  p.task = { act, phase: live ? 'go' : 'do', tx: sp.x, ty: sp.y, until: s.now + dur, carry: 0 };
}

// ---------- samtal ----------
export interface TalkEvent { a: number; b: number; kind: string; good: boolean; t: number }
const SOCIAL: Act[] = ['samtal', 'beratta', 'hantverk', 'vakt', 'leka', 'varma'];
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
      const f = (pop >= 26 ? 0.15 : 1) * clamp(foodDays(s) / 4, 0.15, 1);
      if (chance(s, 0.3 * f / 86400, dtSec)) { p.pregnantSince = now; (p as any)._by = p.partner; }
    }
    // uppgift
    const t = p.task;
    const phaseFlip = t && (WORK.includes(t.act) || t.act === 'leka' ? !light : light && (t.act === 'samtal' || t.act === 'beratta' || t.act === 'hantverk' || t.act === 'vakt'));
    const lightDone = t?.act === 'tanda' && (s.fire.lit || !canLight(s));
    if (!t || (t.until < now && t.phase !== 'back') || (phaseFlip && t.phase !== 'back') || lightDone) {
      if (t && (t.carry > 0 || t.items) && t.act !== 'elda' && live) { t.phase = 'back'; const m = getMap(s.seed); t.tx = m.stock.x + 0.5 + rnd(s) * 1.5; t.ty = m.stock.y + 0.5 + rnd(s); }
      else chooseTask(s, p, live);
    }
    const tk = p.task!;
    if (live) {
      if (tk.phase === 'go' || tk.phase === 'back') {
        const dx = tk.tx - p.x, dy = tk.ty - p.y, d = Math.hypot(dx, dy);
        const sp = (a < 6 ? 0.9 : a > 65 ? 1 : 1.6) * dtSec;
        if (d <= sp) {
          p.x = tk.tx; p.y = tk.ty;
          if (tk.act === 'elda') {
            if (tk.phase === 'go') {
              // vid förrådet: ta en famn ved och gå till elden
              const m = getMap(s.seed), n = Math.min(3, Math.max(0, fireTarget(s) - s.fire.fuel), s.wood);
              if (n <= 0) p.task = undefined;
              else { s.wood -= n; tk.carry = n; tk.phase = 'back'; tk.tx = m.fire.x + 0.5 + (rnd(s) - 0.5) * 1.2; tk.ty = m.fire.y + 1.2; }
            } else { addFuel(s, p, tk.carry); tk.carry = 0; p.task = undefined; }
          } else if (tk.phase === 'back') {
            if (tk.act === 'ved') s.wood += tk.carry; else s.food += tk.carry;
            if (tk.items) addItems(s, tk.items);
            tk.carry = 0; p.task = undefined;
          } else tk.phase = 'do';
        } else { p.x += dx / d * sp; p.y += dy / d * sp; }
      } else if (tk.act !== 'sova' && tk.act !== 'vakt' && tk.act !== 'hantverk') {
        // småjustering så att de rör sig lite
        if (rnd(s) < dtSec * 0.08) { p.x += (rnd(s) - 0.5) * 0.4; p.y += (rnd(s) - 0.5) * 0.4; }
      }
    }
    if (tk.phase === 'do' && WORK.includes(tk.act)) {
      const y = workRate(s, p, tk.act) * dtSec * (live ? 1 : 0.8);
      if (live) tk.carry += y; else if (tk.act === 'ved') s.wood += y; else s.food += y;
      if (tk.act === 'samla') {
        const got = forageItems(s, p, dtSec);
        if (got) { if (live) { tk.items ??= {}; for (const k in got) tk.items[k] = (tk.items[k] ?? 0) + got[k]; } else addItems(s, got); }
      }
      const sk = tk.act as Skill;
      const before = p.skill[sk];
      p.skill[sk] = clamp(p.skill[sk] + dtSec / 3600 * 0.12 * (0.4 + stat(p, 'intelligens', now) / 20) * (1 - p.skill[sk] / 21), 0, 20);
      if (before < 16 && p.skill[sk] >= 16) { p.fame.push(`Mästare i ${SKILL_NAMES[sk].toLowerCase()}`); log(s, `${p.name} har blivit en mästare i ${SKILL_NAMES[sk].toLowerCase()}.`, 'skill', [p.id]); }
    }
    if (tk.phase === 'do' && tk.act === 'tanda' && canLight(s)) {
      s.fire.tryProg += dtSec;
      const per = igniterOf(s)!.minutes * 60;
      while (s.fire.tryProg >= per && canLight(s) && !s.fire.lit) { s.fire.tryProg -= per; if (tryLight(s, p)) { p.task = undefined; break; } }
    }
    if (tk.phase === 'do' && tk.act === 'hantverk') p.skill.hantverk = clamp(p.skill.hantverk + dtSec / 3600 * 0.1 * (1 - p.skill.hantverk / 21), 0, 20);
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
