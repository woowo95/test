// ---------- giftermål med grannarna (steg 11.3.6, Flera samhällen: Hur byarna påverkar varandra) ----------
// Den som inte finner någon i byn att bli ett par med (en vuxen utan partner, och ingen i byn av det andra könet utan partner,
// i en ålder man kan flirta med och som inte är släkt) kan gifta sig med någon i en vänlig grannby: en chans per dygn (GIFT.chans),
// med grannbyarna som är vänliga mot byn (relationen minst GIFT.minRel), oftare den som ligger nära (narhet). En av de två
// flyttar (GIFT.ut att bybon flyttar dit): bybon lämnar byn med sina barn och läggs till grannbyns folk, eller den nya kommer
// till byn och blir hens partner, och grannbyn har en färre. Varje giftermål är ett släktband mellan byarna (byrel.ts), som
// höjer grundläget för relationen.
import { balans } from './balans';
import { nyttSlaktband } from './byrel';
import { ALDER, ageOf, count, isKin, isParent, living, log, newPerson, startSkills } from './folk';
import { Klan, klanerOf, narhet } from './klaner';
import { leave } from './liv';
import { notis } from './notiser';
import { kronika } from './historik';
import { startSmak } from './rykten';
import { chance, pickViktat, rnd } from './slump';
import { pair } from './varld';
import { DAY, Person, State } from './typer';

export const GIFT = balans('gift', {
  chans: 0.15, // chansen per dygn (ett år i spelet) att den som inte finner någon i byn gifter sig med någon i en grannby
  minRel: 15, // grannbyn är vänlig mot byn (relationen minst så mycket)
  ut: 0.5, // chansen att bybon flyttar dit; annars kommer den nya hit
  alder: 6, // den nya är högst så många år yngre eller äldre
});

const vuxen = (s: State, p: Person) => ageOf(p, s.now) >= ALDER.flirtFran;
// kan p bli ett par med någon i byn?
function harNagon(s: State, p: Person, folk: Person[]) {
  const a = ageOf(p, s.now);
  return folk.some(q => q !== p && q.sex !== p.sex && q.partner === undefined && vuxen(s, q) && !isKin(p, q) && Math.abs(ageOf(q, s.now) - a) < ALDER.flirtSkillnad);
}
// de som inte finner någon i byn
export const utanNagon = (s: State) => { const folk = living(s); return folk.filter(p => p.partner === undefined && vuxen(s, p) && !p.gast && !harNagon(s, p, folk)); };
// grannbyarna man kan gifta sig in i: vänliga, med folk, och med en rad i världen
export const giftBar = (s: State) => klanerOf(s).filter(k => k.inst >= GIFT.minRel && k.rad !== undefined && (s.varld?.rader?.find(r => r.nr === k.rad)?.tal.folk ?? 0) >= 2);

// p gifter sig med någon i grannbyn k
export function giftermal(s: State, p: Person, k: Klan, ut = rnd(s, 'gift') < GIFT.ut) {
  const vl = s.varld!, r = vl.rader!.find(x => x.nr === k.rad)!;
  const sex = p.sex === 'm' ? 'k' : 'm', alder = Math.max(ALDER.flirtFran, ageOf(p, s.now) + (rnd(s, 'gift') * 2 - 1) * GIFT.alder);
  if (vl.huvud !== undefined) nyttSlaktband(vl, vl.huvud, r.nr);
  count(s, 'giftermal');
  if (ut) { // bybon flyttar dit, med sina barn
    const med = [p, ...living(s).filter(c => isParent(p, c) && ageOf(c, s.now) < ALDER.vuxen)];
    leave(s, ...med);
    r.tal.folk += med.length;
    const text = `${p.name} gifte sig med någon i ${k.namn} och flyttade dit${med.length > 1 ? ` med ${med.length - 1} barn` : ''}.`;
    log(s, text, 'move', med.map(q => q.id)); notis(s, 'utflytt', text, med.map(q => q.id)); kronika(s, text, 'utflytt');
    count(s, 'giftUt', med.length);
    return undefined;
  }
  const q = newPerson(s, sex, s.now - alder * DAY);
  startSkills(s, q, alder); startSmak(s, q);
  q.fran = k.id;
  s.people.push(q);
  r.tal.folk -= 1;
  pair(s, p, q, true);
  const text = `${q.name} från ${k.namn} gifte sig med ${p.name} och flyttade till byn.`;
  log(s, text, 'move', [p.id, q.id]); kronika(s, text, 'utflytt');
  count(s, 'giftIn');
  return q;
}

// en gång i timmen (TAKTER i steg.ts): var och en som inte finner någon i byn kan gifta sig med någon i en vänlig grannby
export function giftSteg(s: State, dtSec: number) {
  if (!s.varld) return;
  const kan = giftBar(s);
  if (!kan.length) return;
  for (const p of utanNagon(s)) {
    if (!chance(s, GIFT.chans / 86400, dtSec, 'gift')) continue;
    const k = pickViktat(s, kan, kan.map(narhet), 'gift');
    giftermal(s, p, k);
  }
}
