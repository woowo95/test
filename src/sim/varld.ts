import { migrateTek } from './teknik';
import { stepDelning } from './delning';
import { setStock, storeFromSums } from './lager';
import { isTool } from './saker';
import { migrateTools, toolsFromItems } from './agande';
import { migrateFalt } from './odling';
import { behoverStorreKarta, storreKarta } from './kartflytt';
import { VAR, inFas, nyKalender } from './tid';
import { ageOf, alive, byId, getRel, log, newPerson, startSkills, stridSkills, think } from './folk';
import { newSeder, sederTarget, TAGS } from './seder';
import { clamp, gauss, rnd } from './slump';
import { DAY, Fire, NEW_H, NEW_W, Person, SEC, State, simulera, useMap } from './typer';
import { startSmak } from './rykten';

// ---------- skapa värld ----------
// storlek: kartans storlek, för testerna av äldre byar (en ny by får alltid NEW_W × NEW_H)
export function createState(seed: number, now: number, storlek = { W: NEW_W, H: NEW_H }): State { return simulera(() => skapaBy(seed, now, storlek)); } // som simuleringen (typer.ts)
function skapaBy(seed: number, now: number, storlek: { W: number; H: number }): State {
  // en liten koloni: två par och ett barn, utan eld och med lite mat och grenar
  const s: State = { v: SPARVERSION, seed, founded: now, now, people: [], rels: {}, nextId: 1, log: [], lastAgeIdx: VAR, fire: newFire(), seder: newSeder(), W: storlek.W, H: storlek.H, kal: nyKalender(now) };
  useMap(s);
  setStock(s, { bar: 30, grenar: 20 });
  const adults: [string, number][] = [['m', 30], ['k', 27], ['m', 23], ['k', 21]];
  for (const [sex, age] of adults) s.people.push(newPerson(s, sex as 'm' | 'k', now - (age + rnd(s, 'folk')) * DAY));
  const [a, b, c, d] = s.people;
  for (const p of s.people) p.grundare = true;
  pair(s, a, b, true); pair(s, c, d, true);
  s.people.push(newPerson(s, rnd(s, 'folk') < 0.5 ? 'm' : 'k', now - (4 + rnd(s, 'folk') * 0.5) * DAY, b, a));
  // startfärdigheter efter ålder
  for (const p of s.people) { startSkills(s, p, ageOf(p, now)); startSmak(s, p); }
  s.seder.v = sederTarget(s);
  stepDelning(s); // en ny by är fattig och delar nästan allt
  log(s, `${s.people.length} människor slog sig ner vid sjön. De har ingen eld ännu.`, 'world');
  return s;
}

function newFire(): Fire {
  return { hearth: 'lagereld', fuel: 0, lit: false, burned: 0, totalBurned: 0, litSec: 0, lightings: 0, outs: 0, tries: 0, tryTotal: 0, tryProg: 0, fills: {}, log: [] };
}

// ---------- uppgradering av sparade byar ----------
// Varje ändring av hur en by sparas får en rad här, med nästa nummer. s.v är numret på den senaste uppgraderingen
// byn fått; migrate kör de som är nyare, i nummerordning. En ny by får det senaste numret och behöver inga.
const UPPGRADERINGAR: [number, string, (s: State) => void][] = [
  [2, 'allt före v40: äldre fält, sammanslagna saker, redskap som ting och en brinnande eld i de allra första byarna', s => {
    for (const p of s.people) {
      const sk = p.skill as Record<string, number>; // eldkonsten, som inte är en färdighet sedan steg 3.10.8 (uppgradering 14)
      if (sk.elda === undefined) sk.elda = clamp((ageOf(p, s.now) - 10) * 0.15, 0, 6);
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
    for (const l of s.log) if (l.kind === 'skill') { const m = l.text.match(/ kallas nu för (.+)\.$/), p = byId(s, l.ids?.[0]); const tag = m && p && TAGS.find(t => t.tag.toLowerCase() === m[1])?.tag; if (tag && !p.kallad?.includes(tag)) (p.kallad ??= []).push(tag); }
    migrateTek(s);
    if (!s.items && !s.stackar && !s.marken) s.items = { flinta: 1, torrgras: 8, grenar: 8 }; // de allra första sparfilerna
    s.items ??= {};
    // gniststenen finns inte längre: elden tänds med flinta
    if (s.items.gniststen) { s.items.flinta = (s.items.flinta ?? 0) + s.items.gniststen; delete s.items.gniststen; }
    for (const a of s.stackar ?? []) if (a.k === 'gniststen') a.k = 'flinta';
    // små pinnar finns inte längre: de räknas som grenar
    if (s.items.pinnar) { s.items.grenar = (s.items.grenar ?? 0) + s.items.pinnar; delete s.items.pinnar; }
    for (const a of s.stackar ?? []) if (a.k === 'pinnar') a.k = 'grenar';
    if (!s.ting) toolsFromItems(s); // först, eftersom stackarna skapar en tom lista med ting
    if ('food' in s || s.mat || s.egna || Object.keys(s.items).some(k => !isTool(k))) storeFromSums(s); // äldre sparfiler (före v40): summorna blir stackar
    migrateTools(s); // och redskapen bara ting
    if (s.stackar) s.stackar = s.stackar.filter(a => !isTool(a.k));
    for (const p of s.people) { const t = p.task; if (t?.items?.pinnar) { t.items.grenar = (t.items.grenar ?? 0) + t.items.pinnar; delete t.items.pinnar; if (t.cond?.pinnar !== undefined) { t.cond.grenar ??= t.cond.pinnar; delete t.cond.pinnar; } } }
    if (!s.fire) {
      s.fire = newFire();
      Object.assign(s.fire, { lit: true, fuel: 4, litAt: s.founded, lightings: 1, litSec: (s.now - s.founded) / SEC });
      s.fire.log.push({ t: s.founded, k: 'tänd' });
    }
    s.fire.ring ??= s.fire.lightings > 0; // en by som redan haft eld har sin stenring
    if (!s.seder) { s.seder = newSeder(); s.seder.v = sederTarget(s); }
  }],
  [3, 'v40: femminuterstakten. Gamla fält för gång i levande läget och fynd per tur tas bort', s => {
    for (const p of s.people) {
      const t = p.task as (Record<string, unknown> & object) | undefined;
      if (t) for (const k of ['fynd', 'wx', 'wy', 'hold', 'stint']) delete t[k];
      if (p.rngs) delete (p.rngs as Record<string, unknown>).levande; // följden för det levande läget finns inte längre
    }
    if (s.rngs) delete (s.rngs as Record<string, unknown>).levande;
  }],
  [4, 'v48: vaktdygnet räknas efter kalendern (byts kl. 7), inte från grundandet. De gamla vaktdygnen glöms och en ny vakt väljs', s => {
    delete s.lastGuardDay;
    for (const p of s.people) delete p.guardDay;
  }],
  [5, 'v58: stationerna är tekniker (steg 2.2.11). Står en station i byn kan de som kunde det som räckte förut (kniven, korgen eller repet) bygga den', s => {
    const forut: Record<string, string[]> = { slaktbank: ['kniv'], flatarbank: ['korg', 'rep'] };
    for (const st of s.stationer ?? []) for (const p of s.people) if (forut[st.k]?.some(k => (p.tek?.[k] ?? 0) >= 1)) (p.tek ??= {})[st.k] = 1;
    // den som kunde korg utan att kunna slöjdbänken kan fortfarande korg; tekniken lärs ut bara till den som kan bänken
  }],
  [6, 'v79: törsten (steg 2.4.1). Alla börjar otörstiga', s => {
    for (const p of s.people) if (p.torst === undefined) p.torst = 1;
  }],
  [7, 'v80: kroppen (steg 2.5.1). Alla har allt sitt blod och inga skador', s => {
    for (const p of s.people) if (p.blod === undefined) p.blod = 1;
  }],
  [8, 'v87: matlagningen (steg 2.8.1). Färdigheten Matlagning är snittet av samling och eldkonst', s => {
    for (const p of s.people) if (p.skill.matlagning === undefined) p.skill.matlagning = (p.skill.samla + (p.skill as Record<string, number>).elda) / 2;
  }],
  [9, 'v110: fälten görs ruta för ruta (steg 2.10.13). Ett äldre fält blir 2 × 2 rutor', s => migrateFalt(s)],
  [10, 'v124: matens dygn räknas av vad byn äter (steg 2.12.4), ungefär 0,45 av de gamla dygnen. Snittet räknas om lika mycket', s => { if (s.matSnitt !== undefined) s.matSnitt *= 0.45; }],
  [11, 'v143: seden Jämlikhet – Rangordning (steg 3.5.1) börjar på 0', s => { s.seder.v.rang ??= 0; s.seder.ev.rang ??= 0; }],
  [12, 'v146: egenskaperna Smidighet och Aggression (steg 3.7.6) slumpas för dem som redan finns', s => {
    for (const p of s.people) for (const k of ['smidighet', 'aggression'] as const) {
      if (p.pot[k] === undefined) p.pot[k] = clamp(10 + gauss(s, 'anlag') * 5, 1, 20);
      if (p.anlag && p.anlag[k] === undefined) p.anlag[k] = p.pot[k];
    }
  }],
  [13, 'v148: färdigheterna Närstrid och Träffsäkerhet (steg 3.7.2) efter ålder för dem som redan finns', s => {
    for (const p of s.people) if (p.skill.narstrid === undefined) { if (alive(p)) stridSkills(s, p, ageOf(p, s.now)); else p.skill.narstrid = p.skill.traff = 0; }
  }],
  [14, 'v190: eldkonsten är ingen färdighet (steg 3.10.8). Den tas bort, och den som hade en mentor i att elda har ingen', s => {
    for (const p of s.people) {
      delete (p.skill as Record<string, number>).elda;
      if ((p.mentorSk as string | undefined) === 'elda') { p.mentor = undefined; p.mentorSk = undefined; }
    }
  }],
];
export const SPARVERSION = UPPGRADERINGAR[UPPGRADERINGAR.length - 1][0];
export function migrate(s: State) { return simulera(() => uppgradera(s)); }
function uppgradera(s: State) {
  useMap(s);
  if (behoverStorreKarta(s)) storreKarta(s); // först av allt, innan något räknats på den gamla kartan (steg 2.10.9, kartflytt.ts)
  for (const [n, , gor] of UPPGRADERINGAR) if ((s.v ?? 1) < n) { gor(s); s.v = n; }
  return s;
}
export function pair(s: State, a: Person, b: Person, silent = false) {
  a.partner = b.id; b.partner = a.id;
  const r = getRel(s, a, b); r.op = Math.max(r.op, 55); r.rom = Math.max(r.rom, 75);
  r.par = s.now; r.gift = silent ? s.now : undefined; // de som kommer som par (de första och de som vandrar in) är redan gifta (steg 3.1.1)
  if (!silent) {
    log(s, `${a.name} och ${b.name} blev ett par.`, 'rel', [a.id, b.id]);
    think(a, `Blev tillsammans med ${b.name}`, 0.15, s.now, DAY);
    think(b, `Blev tillsammans med ${a.name}`, 0.15, s.now, DAY);
  }
}
