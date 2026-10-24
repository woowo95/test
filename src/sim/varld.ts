import { migrateTek } from './teknik';
import { setStock, storeFromSums } from './lager';
import { isTool } from './saker';
import { inFas, nyKalender } from './tid';
import { ageOf, getRel, log, newPerson, think } from './folk';
import { newSeder, sederTarget, TAGS } from './seder';
import { clamp, gauss, rnd } from './slump';
import { DAY, Fire, NEW_H, NEW_W, Person, SEC, SKILLS, State, useMap } from './typer';

// ---------- skapa värld ----------
export function createState(seed: number, now: number): State {
  // en liten koloni: två par och ett barn, utan eld och med lite mat och grenar
  const s: State = { v: 1, seed, founded: now, now, people: [], rels: {}, nextId: 1, log: [], lastAgeIdx: 1, lastGuardDay: -1, items: {}, fire: newFire(), seder: newSeder(), W: NEW_W, H: NEW_H, kal: nyKalender(now) };
  useMap(s);
  setStock(s, { bar: 30, grenar: 20 });
  const adults: [string, number][] = [['m', 30], ['k', 27], ['m', 23], ['k', 21]];
  for (const [sex, age] of adults) s.people.push(newPerson(s, sex as 'm' | 'k', now - (age + rnd(s, 'folk')) * DAY));
  const [a, b, c, d] = s.people;
  pair(s, a, b, true); pair(s, c, d, true);
  s.people.push(newPerson(s, rnd(s, 'folk') < 0.5 ? 'm' : 'k', now - (4 + rnd(s, 'folk') * 0.5) * DAY, b, a));
  // startfärdigheter efter ålder
  for (const p of s.people) {
    const a = ageOf(p, now);
    for (const k of SKILLS) p.skill[k] = clamp((a - 8) * 0.25 * (0.4 + rnd(s, 'folk')) * (p.pot.intelligens / 12), 0, 12);
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
  useMap(s);
  for (const p of s.people) {
    if (p.skill.elda === undefined) p.skill.elda = clamp((ageOf(p, s.now) - 10) * 0.15, 0, 6);
    if (p.warm === undefined) p.warm = 1;
    if (p.toa === undefined) p.toa = 1;
    if (!p.habit) p.habit = {};
    if (p.pot.minne === undefined) p.pot.minne = clamp(10 + gauss(s, 'folk') * 7, 1, 20);
    // äldre sparfiler: fälten hette _by och _guard
    const o = p as Person & { _by?: number; _guard?: number };
    if (o._by !== undefined) { p.pregnantBy ??= o._by; delete o._by; }
    if (o._guard !== undefined) { p.guardDay ??= o._guard; delete o._guard; }
    // byns gemensamma kunskap om svamp flyttas till var och en
    if (s.kunskap?.svamp && p.died === undefined && !p.kunskap?.svamp) p.kunskap = { ...p.kunskap, svamp: { v: s.kunskap.svamp, t: s.now } };
  }
  delete s.kunskap;
  s.kal ??= inFas(s); // byar från före kalendern kommer i fas med veckan
  // äldre sparfiler: det som räknades ur loggen räknas nu i statistiken
  if (s.log.some(l => l.text.includes('byns första yxa'))) (s.stat ??= {}).yxa1 ??= 1;
  for (const l of s.log) if (l.kind === 'skill') { const m = l.text.match(/ kallas nu för (.+)\.$/), p = s.people.find(q => q.id === l.ids?.[0]); const tag = m && p && TAGS.find(t => t.tag.toLowerCase() === m[1])?.tag; if (tag && !p.kallad?.includes(tag)) (p.kallad ??= []).push(tag); }
  migrateTek(s);
  if (!s.items) s.items = { flinta: 1, torrgras: 8, grenar: 8 };
  // gniststenen finns inte längre: elden tänds med flinta
  if (s.items.gniststen) { s.items.flinta = (s.items.flinta ?? 0) + s.items.gniststen; delete s.items.gniststen; }
  for (const a of s.stackar ?? []) if (a.k === 'gniststen') a.k = 'flinta';
  // små pinnar finns inte längre: de räknas som grenar
  if (s.items.pinnar) { s.items.grenar = (s.items.grenar ?? 0) + s.items.pinnar; delete s.items.pinnar; }
  for (const a of s.stackar ?? []) if (a.k === 'pinnar') a.k = 'grenar';
  if ('food' in s || s.mat || s.egna || Object.keys(s.items).some(k => !isTool(k))) storeFromSums(s); // äldre sparfiler (före v40): summorna blir stackar
  for (const p of s.people) { const t = p.task; if (t?.items?.pinnar) { t.items.grenar = (t.items.grenar ?? 0) + t.items.pinnar; delete t.items.pinnar; if (t.cond?.pinnar !== undefined) { t.cond.grenar ??= t.cond.pinnar; delete t.cond.pinnar; } } }
  if (!s.fire) {
    s.fire = newFire();
    Object.assign(s.fire, { lit: true, fuel: 4, litAt: s.founded, lightings: 1, litSec: (s.now - s.founded) / SEC });
    s.fire.log.push({ t: s.founded, k: 'tänd' });
  }
  s.fire.ring ??= s.fire.lightings > 0; // en by som redan haft eld har sin stenring
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
