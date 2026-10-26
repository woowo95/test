import { ageOf, alive, byId, count, isParent, living, log, newPerson, relKey, startSkills, think } from './folk';
import { sedEvent } from './seder';
import { pair } from './varld';
import { avgMood } from './samtal';
import { chance, clamp, pick, rnd } from './slump';
import { DAY, Person, SEC, State } from './typer';
import { foodDays } from './ekonomi';
import { put, releaseOwner } from './lager';
import { kronika } from './historik';
import { inherit, packUp } from './arv';

// ---------- död, födsel, flytt ----------
export function die(s: State, p: Person, cause: string) {
  p.died = s.now; p.cause = cause; p.task = undefined;
  inherit(s, p); // arvingarna får det hen ägde (arv.ts)
  releaseOwner(s, p.id); // det som blev kvar blir byns
  const a = Math.floor(ageOf(p, s.now));
  log(s, `${p.name} dog ${cause}, ${a} år gammal.`, 'death', [p.id]);
  count(s, 'doda'); count(s, 'dog ' + cause); kronika(s, `${p.name} dog ${cause}, ${a} år gammal.`);
  if (cause === 'av svält') sedEvent(s, 'forsiktighet', 0.15, `${p.name} svalt ihjäl. Byn har blivit mer försiktig.`);
  else if (cause === 'av kyla') sedEvent(s, 'forsiktighet', 0.1, `${p.name} frös ihjäl. Byn har blivit mer försiktig.`);
  else if (cause === 'under en jakt') sedEvent(s, 'forsiktighet', 0.04, `${p.name} dog under en jakt. Byn blev lite försiktigare.`);
  if (a < 5) sedEvent(s, 'barn', 0.08, `Byn sörjer barnet ${p.name} och värnar mer om sina barn.`);
  if (a >= 70) p.fame.push(`Blev ${a} år gammal`);
  for (const q of living(s)) {
    if (q.partner === p.id) { q.partner = undefined; think(q, `Sörjer ${p.name}`, -0.3, s.now, 1.2 * DAY); }
    else if (isParent(p, q) || isParent(q, p)) think(q, `Sörjer ${p.name}`, -0.25, s.now, DAY);
    else { const r = s.rels[relKey(p.id, q.id)]; if (r && r.op > 40) think(q, `Saknar ${p.name}`, -0.12, s.now, 0.6 * DAY); }
  }
}

export function birth(s: State, mother: Person) {
  const father = byId(s, mother.partner) ?? byId(s, mother.pregnantBy);
  mother.pregnantSince = undefined; mother.lastBirth = s.now;
  const ch = newPerson(s, rnd(s, 'folk') < 0.5 ? 'm' : 'k', s.now, mother, father);
  ch.x = mother.x; ch.y = mother.y;
  s.people.push(ch);
  log(s, `${ch.name} föddes, ${ch.sex === 'k' ? 'dotter' : 'son'} till ${mother.name}${father ? ' och ' + father.name : ''}.`, 'birth', [ch.id, mother.id, ...(father ? [father.id] : [])]);
  count(s, 'fodda'); kronika(s, `${ch.name} föddes.`);
  think(mother, `Fick barnet ${ch.name}`, 0.2, s.now, DAY);
  if (father && alive(father)) think(father, `Fick barnet ${ch.name}`, 0.18, s.now, DAY);
  const kids = s.people.filter(q => q.mother === mother.id).length;
  if (kids === 6) mother.fame.push('Mor till många barn');
  if (rnd(s, 'halsa', mother) < 0.025) die(s, mother, 'i barnsäng');
}

// ---------- befolkningen regleras ----------
// En stor by blir trång: fler flyttar ut och färre vill ha barn. En liten by lockar nybyggare och barn blir viktigare.
// Att hålla nere befolkningen är starkare än att höja den. Nöjda invånare stannar, så en välfungerande by kan bli stor.
// När byn är liten spelar humöret mindre roll för om folk flyttar.
const crowd = (pop: number) => clamp((pop - 14) / 16, 0, 3); // 0 upp till 14 invånare, 1 vid 30
export function birthWish(pop: number) { return pop <= 10 ? 1 + 0.03 * (10 - pop) : clamp(1 - (pop - 16) * 0.035, 0.15, 1); }
export function emigrationRate(pop: number, mood: number) { // flyttar per dygn
  const unhappy = clamp((0.6 - mood) * 4, 0, 1.5), w = clamp((pop - 6) / 20, 0.1, 1);
  return crowd(pop) ** 2 * (0.3 + 2.5 * unhappy * w) + 0.12 * unhappy * w;
}
export const immigrationRate = (pop: number) => pop < 10 ? 0.3 * (10 - pop) / 10 : 0; // nybyggare per dygn
// Hur gott om mat byn har haft (steg 1.7.2): maten i förrådet räknad i dygn för alla, som ett glidande snitt över ungefär
// ett dygn (ett år i spelet) så att årstiderna jämnas ut. 0 vid 3 dygns mat i snitt, 1 vid 9 eller mer. Är maten knapp
// föds färre barn (barnMat), fler flyttar (hungerFlytt) och färre nybyggare stannar: så når byn det tak som marken och redskapen kan föda, utan
// att folk svälter ihjäl. En by på sju eller färre flyttar inte för maten
const MAT_SNITT = DAY;
export const matGott = (s: State) => clamp(((s.matSnitt ?? 9) - 3) / 6, 0, 1);
export const barnMat = (s: State, pop: number) => 1 - 0.6 * (1 - matGott(s)) * clamp((pop - 6) / 4, 0, 1); // färre barn: från sju invånare
export const hungerFlytt = (s: State, pop: number) => 0.6 * (1 - matGott(s)) * clamp((pop - 7) / 4, 0, 1); // flyttar per dygn
export function regulate(s: State, dtSec: number) {
  const pop = living(s).length;
  if (pop === 0) { refound(s); return; }
  const fd = foodDays(s);
  s.matSnitt = s.matSnitt === undefined ? fd : s.matSnitt + (fd - s.matSnitt) * Math.min(1, dtSec * SEC / MAT_SNITT);
  if (rnd(s, 'flytt') < dtSec / 3600) { // humöret räknas om ungefär en gång i timmen
    const rate = emigrationRate(pop, avgMood(s, 0.6)) + hungerFlytt(s, pop);
    if (chance(s, rate / 86400, 3600, 'flytt')) emigrate(s);
  }
  if (chance(s, immigrationRate(pop) * (0.3 + 0.7 * matGott(s)) / 86400, dtSec, 'flytt')) immigrate(s, false);
}
// en nybyggare (ibland ett par) kommer vandrande och slår sig ner, med lite rötter (ungefär ett dygns mat, ett år i spelet)
const MEDHAVD = 2;
function immigrate(s: State, alone: boolean) {
  const mk = (sex: 'm' | 'k') => {
    const age = 17 + rnd(s, 'folk') * 18, p = newPerson(s, sex, s.now - age * DAY);
    startSkills(s, p, age);
    s.people.push(p);
    put(s, 'rotter', MEDHAVD, { [p.id]: MEDHAVD }); // lite mat från vandringen, så att man hinner samla innan man svälter
    return p;
  };
  const a = mk(rnd(s, 'folk') < 0.5 ? 'm' : 'k');
  if (!alone && rnd(s, 'flytt') < 0.35) {
    const b = mk(a.sex === 'm' ? 'k' : 'm');
    pair(s, a, b, true);
    log(s, `${a.name} och ${b.name} kom vandrande och slog sig ner i byn.`, 'move', [a.id, b.id]);
  } else log(s, `${a.name} kom vandrande och slog sig ner i byn.`, 'move', [a.id]);
  count(s, 'invandrade');
  return a;
}
// alla är borta: en vandrare hittar den övergivna boplatsen och grundar byn på nytt
function refound(s: State) {
  const p = immigrate(s, true);
  count(s, 'atergrundad'); kronika(s, `${p.name} grundade byn på nytt.`);
  log(s, `${p.name} hittade den övergivna boplatsen och grundade byn på nytt.`, 'world', [p.id]);
}

// p lämnar byn och tar med sig det hen orkar bära (arv.ts); resten blir byns
function leave(s: State, p: Person, now: number) { p.left = now; p.task = undefined; packUp(s, p); releaseOwner(s, p.id); }

function emigrate(s: State) {
  const now = s.now;
  const cands = living(s).filter(p => p.partner !== undefined && ageOf(p, now) > 18 && ageOf(p, now) < 38);
  if (!cands.length) { // inget ungt par: en ensam vuxen ger sig av
    const one = living(s).filter(p => p.partner === undefined && ageOf(p, now) >= 16 && ageOf(p, now) < 40);
    if (!one.length) return;
    const p = pick(s, one, 'flytt'); leave(s, p, now);
    log(s, `${p.name} lämnade byn för att söka lyckan på annat håll.`, 'move', [p.id]);
    count(s, 'utvandrade');
    return;
  }
  const a = pick(s, cands, 'flytt'), b = byId(s, a.partner)!;
  const group = [a, b, ...living(s).filter(c => (isParent(a, c) || isParent(b, c)) && ageOf(c, now) < 14)];
  for (const g of group) leave(s, g, now);
  const n = group.length - 2;
  count(s, 'utvandrade', group.length);
  log(s, `Byn blev trång. ${a.name} och ${b.name} lämnade byn${n ? ` med ${n} barn` : ''} för att grunda en egen boplats.`, 'move', group.map(g => g.id));
  for (const q of living(s)) for (const g of group) { const r = s.rels[relKey(q.id, g.id)]; if (r && r.op > 40) { think(q, `Saknar ${g.name}`, -0.08, now, 0.5 * DAY); break; } }
}
