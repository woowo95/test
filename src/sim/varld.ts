import { ageOf, getRel, log, newPerson, think } from './folk';
import { newSeder, sederTarget } from './seder';
import { clamp, gauss, rnd } from './slump';
import { DAY, Fire, Person, SEC, SKILLS, State } from './typer';

// ---------- skapa värld ----------
export function createState(seed: number, now: number): State {
  const s: State = { v: 1, seed, rng: seed, founded: now, now, people: [], rels: {}, nextId: 1, food: 60, wood: 0, log: [], lastAgeIdx: 1, lastGuardDay: -1, items: { grenar: 40 }, fire: newFire(), seder: newSeder() };
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
    if (p.pot.minne === undefined) p.pot.minne = clamp(10 + gauss(s) * 7, 1, 20);
    // byns gemensamma kunskap om svamp flyttas till var och en
    if (s.kunskap?.svamp && p.died === undefined && !p.kunskap?.svamp) p.kunskap = { ...p.kunskap, svamp: { v: s.kunskap.svamp, t: s.now } };
  }
  delete s.kunskap;
  if (!s.items) s.items = { gniststen: 1, torrgras: 8, grenar: 8 };
  // små pinnar finns inte längre: de räknas som grenar
  if (s.items.pinnar) { s.items.grenar = (s.items.grenar ?? 0) + s.items.pinnar; delete s.items.pinnar; }
  for (const a of s.stackar ?? []) if (a.k === 'pinnar') a.k = 'grenar';
  for (const p of s.people) { const t = p.task; if (t?.items?.pinnar) { t.items.grenar = (t.items.grenar ?? 0) + t.items.pinnar; delete t.items.pinnar; if (t.cond?.pinnar !== undefined) { t.cond.grenar ??= t.cond.pinnar; delete t.cond.pinnar; } } }
  if (!s.fire) {
    s.fire = newFire();
    Object.assign(s.fire, { lit: true, fuel: 4, litAt: s.founded, lightings: 1, litSec: (s.now - s.founded) / SEC });
    s.fire.log.push({ t: s.founded, k: 'tänd' });
  }
  if (!s.seder) { s.seder = newSeder(); s.seder.v = sederTarget(s); }
  return s;
}
export function pair(s: State, a: Person, b: Person, silent = false) {
  a.partner = b.id; b.partner = a.id;
  const r = getRel(s, a, b); r.op = Math.max(r.op, 55); r.rom = Math.max(r.rom, 75);
  if (!silent) {
    log(s, `${a.name} och ${b.name} blev ett par.`, 'rel', [a.id, b.id]);
    think(a, `Blev tillsammans med ${b.name}`, 0.15, s.now, DAY);
    think(b, `Blev tillsammans med ${a.name}`, 0.15, s.now, DAY);
  }
}
