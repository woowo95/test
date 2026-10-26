import { getMap } from './karta';
import { freeNear } from './byggnad';
import { clamp, gauss, pick, rnd } from './slump';
import { Act, DAY, LogEntry, Person, Rel, SKILLS, STATS, Skill, Stat, State } from './typer';

// ---------- namn ----------
const N1 = ['A', 'Bo', 'Da', 'E', 'Fa', 'Gu', 'Ha', 'I', 'Ka', 'Lo', 'Ma', 'Ny', 'O', 'Ra', 'Si', 'Tu', 'U', 'Ve', 'Y', 'Å', 'Ste', 'Tor', 'Al', 'Ger'];
const N2 = ['r', 'n', 'l', 'rk', 'nd', 'st', 'g', 'v', 'm', 'sk', 'lv', 'rn', 'k', 'd'];
const NK = ['a', 'e', 'ja', 'ra', 'dis', 'run', 'hild', 'frid', 'ny', 'vi', 'ka'];
const NM = ['e', 'o', 'ar', 'ik', 'ulf', 'mund', 'björn', 'vid', 'stig', 'ger', 'an'];
function makeName(s: State, sex: 'm' | 'k') {
  for (let i = 0; i < 20; i++) {
    const n = pick(s, N1, 'folk') + (rnd(s, 'folk') < 0.7 ? pick(s, N2, 'folk') : '') + pick(s, sex === 'k' ? NK : NM, 'folk');
    const nn = n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
    if (nn.length >= 3 && nn.length <= 9 && !s.people.some(p => p.name === nn && alive(p))) return nn;
  }
  return pick(s, N1, 'folk') + pick(s, sex === 'k' ? NK : NM, 'folk');
}

// ---------- personer ----------
export const alive = (p: Person) => p.died === undefined && p.left === undefined;
export const ageOf = (p: Person, now: number) => ((p.died ?? p.left ?? now) - p.born) / DAY;
export function living(s: State) { return s.people.filter(alive); }
// sjuk just nu (sickUntil är aldrig 0 eller NaN i spelet; då ger uttrycket ändå samma svar som !!sickUntil &&)
export const isSick = (p: Person, now: number) => p.sickUntil !== undefined && p.sickUntil > now;
export function byId(s: State, id?: number) { return id === undefined ? undefined : s.people.find(p => p.id === id); }
// gör någon levande (utom `utom`) handlingen act just nu? (drar ingen slump)
export function doingAct(s: State, act: Act, utom?: Person) {
  for (const q of s.people) if (q !== utom && alive(q) && q.task?.act === act) return true;
  return false;
}

export function stat(p: Person, k: Stat, now: number) {
  const a = ageOf(p, now);
  let g = clamp(0.06 + a / 18, 0.06, 1);
  // åldrande: minne, styrka och uthållighet backar först och fortast, det mesta annat långsamt efter 60
  if ((k === 'styrka' || k === 'uthallighet') && a > 45) g *= clamp(1 - (a - 45) / 45, 0.25, 1);
  else if (k === 'minne' && a > 50) g *= clamp(1 - (a - 50) / 40, 0.3, 1);
  else if (k === 'skonhet' && a > 40) g *= clamp(1 - (a - 40) / 70, 0.5, 1);
  else if ((k === 'intelligens' || k === 'nyfikenhet' || k === 'flit' || k === 'mod') && a > 60) g *= clamp(1 - (a - 60) / 60, 0.5, 1);
  return p.pot[k] * g;
}

// färdigheterna en nykomling har efter sin ålder (en dragning ur 'folk' per färdighet, i SKILLS ordning)
export function startSkills(s: State, p: Person, age: number) {
  for (const k of SKILLS) p.skill[k] = clamp((age - 8) * 0.25 * (0.4 + rnd(s, 'folk')) * (p.pot.intelligens / 12), 0, 12);
}

export function newPerson(s: State, sex: 'm' | 'k', born: number, mother?: Person, father?: Person): Person {
  const pot = {} as Record<Stat, number>;
  for (const k of STATS) {
    const base = mother && father ? (mother.pot[k] + father.pot[k]) / 2 : 10;
    const spread = mother && father ? 3 : 4.5;
    pot[k] = clamp(base + gauss(s, 'folk') * spread * 1.6, 1, 20);
  }
  const skill = {} as Record<Skill, number>;
  for (const k of SKILLS) skill[k] = 0;
  const m = getMap(s.seed);
  const p: Person = {
    id: s.nextId++, name: '', sex, born, mother: mother?.id, father: father?.id,
    pot, skill, hunger: 0.8, rest: 0.9, social: 0.7, health: 1, warm: 1, toa: 0.6 + rnd(s, 'folk') * 0.4, habit: {}, thoughts: [],
    x: m.fire.x + (rnd(s, 'folk') - 0.5) * 3, y: m.fire.y + (rnd(s, 'folk') - 0.5) * 3, fame: [],
    hue: Math.floor(rnd(s, 'folk') * 360),
  };
  p.name = makeName(s, sex);
  const at = freeNear(s, p.x, p.y); p.x = at.x; p.y = at.y; // inte i en husvägg
  return p;
}

export function relKey(a: number, b: number) { return a < b ? a + '-' + b : b + '-' + a; }
export function getRel(s: State, a: Person, b: Person): Rel {
  const k = relKey(a.id, b.id);
  let r = s.rels[k];
  if (!r) {
    r = { chem: clamp(gauss(s, 'samtal') * 0.6, -1, 1), op: 0, rom: 0, talks: 0, flags: 0 };
    if (isKin(a, b)) r.op = 25;
    s.rels[k] = r;
  }
  return r;
}
// p är förälder till c, och p:s barn bland alla i byn (också döda och bortflyttade)
export const isParent = (p: Person, c: Person) => c.mother === p.id || c.father === p.id;
export const childrenOf = (s: State, p: Person) => s.people.filter(c => isParent(p, c));
export function isKin(a: Person, b: Person) {
  return isParent(b, a) || isParent(a, b) ||
    (a.mother !== undefined && a.mother === b.mother) || (a.father !== undefined && a.father === b.father);
}
export function similarity(a: Person, b: Person) {
  let d = 0;
  for (const k of ['nyfikenhet', 'flit', 'empati', 'mod'] as Stat[]) d += Math.abs(a.pot[k] - b.pot[k]);
  return 1 - d / 40; // ~ -0.5..1
}

export function log(s: State, text: string, kind: LogEntry['kind'], ids: number[] = []) {
  s.log.push({ t: s.now, text, kind, ids });
  if (s.log.length > 400) s.log.splice(0, s.log.length - 400);
}
// räknar det som händer i byn (statistiken i s.stat)
export const count = (s: State, k: string, n = 1) => { (s.stat ??= {})[k] = (s.stat[k] ?? 0) + n; };
export function think(p: Person, text: string, v: number, now: number, dur: number) {
  p.thoughts = p.thoughts.filter(t => t.text !== text);
  p.thoughts.push({ text, v, until: now + dur });
}
