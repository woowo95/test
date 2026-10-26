import { ageOf, count, log, stat, think } from './folk';
import { sedEvent } from './seder';
import { rnd } from './slump';
import { kronika } from './historik';
import { amountOf } from './lager';
import { isTool } from './saker';
import { tingOf } from './agande';
import { Act, HOUR, Person, State } from './typer';

// ---------- teknik ----------
// Ingen föds med kunskapen om hur man gör en yxa. Den som arbetar med något kommer så småningom på hur det kan göras
// bättre: ju nyfiknare, desto oftare funderar hen på det, och ju intelligentare, desto fortare går det. Det som kommits
// på kan var och en bara själv, tills hen lärt någon annan i samtal. Dör den som kan något utan att ha lärt ut det är
// kunskapen borta.
export interface Tek {
  id: string; namn: string; text: string; effekt: string;
  omr: Act[]; // arbete där man kommer på den
  krav: string[]; // teknik man måste kunna först
  material: string[][]; // det som måste finnas i byn: en av sakerna i varje grupp
  tid: number; // arbetstimmar för en person med medelmåttig nyfikenhet och intelligens
}
export const TEKNIK: Tek[] = [
  { id: 'korg', namn: 'Korg', text: 'En korg flätad av hö.', effekt: 'Man bär hem mer från varje tur och spiller mindre bär.',
    omr: ['samla', 'hantverk'], krav: [], material: [['torrgras']], tid: 24 },
  { id: 'yxa', namn: 'Flintyxa', text: 'En vass flintsten bunden vid en pinne.', effekt: 'Med yxa kan man fälla träd och hugga trä.',
    omr: ['samla', 'ved', 'hantverk'], krav: [], material: [['flinta'], ['grenar']], tid: 10 },
  { id: 'fiskespjut', namn: 'Träspjut', text: 'En pinne som täljts spetsig med en flintsten eller en yxa.', effekt: 'Ger mycket mer fisk än händerna och hjälper på jakten, men slits fort.',
    omr: ['fiske', 'ved'], krav: [], material: [['grenar'], ['flinta', 'yxa']], tid: 20 },
  { id: 'rep', namn: 'Rep', text: 'Växtfibrer som tvinnas till rep på kvällen vid elden. Senor från slaktat vilt blir också rep.', effekt: 'Rep behövs till flintspjut och metspö.',
    omr: ['hantverk', 'samla'], krav: [], material: [['torrgras']], tid: 16 },
  { id: 'flintspjut', namn: 'Flintspjut', text: 'En flintspets som surras fast med rep vid en pinne.', effekt: 'Håller fyra gånger så länge som ett träspjut.',
    omr: ['fiske', 'jakt', 'hantverk'], krav: ['fiskespjut', 'rep'], material: [['flinta'], ['rep']], tid: 16 },
  { id: 'metspo', namn: 'Metspö', text: 'Ett spö med ett rep och en krok av ben från slaktat vilt. Mask grävs fram och sätts på kroken.', effekt: 'Fisken nappar oftare och sitter kvar bättre än på spjutet.',
    omr: ['fiske'], krav: ['rep'], material: [['rep'], ['ben']], tid: 20 },
  { id: 'kniv', namn: 'Flintkniv', text: 'En vass flintskärva med ett skaft av trä.', effekt: 'Med kniv slaktas vilt till mer kött, ben, skinn och senor.',
    omr: ['jakt', 'hantverk'], krav: [], material: [['flinta']], tid: 14 },
  { id: 'timmervagg', namn: 'Timmerhus', text: 'Stockar som huggs till och läggs på varandra till en vägg, och trä som läggs som golv.', effekt: 'Byn kan bygga hus att sova i, med väggar och golv av trä.',
    omr: ['ved', 'falla', 'hugga', 'hantverk'], krav: ['yxa'], material: [['yxa']], tid: 5 },
];
export const TEK = Object.fromEntries(TEKNIK.map(t => [t.id, t])) as Record<string, Tek>;

export const knows = (p: Person, id: string) => (p.tek?.[id] ?? 0) >= 1;
// ett redskap räknas om det finns, hur slitet det än är; annat räknas i mängd
export const hasMaterial = (s: State, t: Tek) => t.material.every(g => g.some(k => isTool(k) ? tingOf(s).some(q => q.k === k) : amountOf(s, k) >= 1));
const canThink = (p: Person, t: Tek) => !knows(p, t.id) && t.krav.every(k => knows(p, k));

// den som kommer på eller lär sig något
function learn(s: State, p: Person, t: Tek, from?: Person) {
  p.tek![t.id] = 1;
  if (from) { log(s, `${p.name} har lärt sig av ${from.name} att göra ${t.namn.toLowerCase()}.`, 'skill', [p.id, from.id]); return; }
  const first = !s.people.some(q => q !== p && knows(q, t.id)) && !(s.stat?.['tek_' + t.id]);
  count(s, 'tek_' + t.id);
  if (first) kronika(s, `${p.name} kom på ${t.namn.toLowerCase()}.`);
  log(s, `${p.name} kom på hur man gör ${t.namn.toLowerCase()}. ${t.effekt}`, 'skill', [p.id]);
  think(p, `Kom på hur man gör ${t.namn.toLowerCase()}`, 0.15, s.now, 12 * HOUR);
  if (first) { p.fame.push(`Kom på ${t.namn.toLowerCase()}`); sedEvent(s, 'nyfikenhet', 0.04); }
}

// arbete för tankarna framåt mot det som hör till arbetet (omr). Andra handlingar ger inga idéer
const OMR = new Set(TEKNIK.flatMap(t => t.omr));
export function thinkWhileWorking(s: State, p: Person, act: Act, dtSec: number) {
  if (!OMR.has(act) || ageOf(p, s.now) < 12) return;
  const nyf = stat(p, 'nyfikenhet', s.now) / 10, intel = stat(p, 'intelligens', s.now) / 10;
  for (const t of TEKNIK) {
    if (!t.omr.includes(act) || !canThink(p, t) || !hasMaterial(s, t)) continue;
    p.tek ??= {};
    const d = Math.min(1 - (p.tek[t.id] ?? 0), dtSec / 3600 / t.tid * nyf * intel);
    p.tek[t.id] = (p.tek[t.id] ?? 0) + d; count(s, 'tekTankt', d);
    if (p.tek[t.id] >= 1) learn(s, p, t);
  }
}

// i samtal lär den som kan något ut det, och den som lyssnar lär sig fortare ju intelligentare hen är
export function teach(s: State, a: Person, b: Person, kind: string) {
  if (!a.tek || ageOf(b, s.now) < 8) return;
  for (const t of TEKNIK) {
    if (!knows(a, t.id) || knows(b, t.id) || !t.krav.every(k => knows(b, k))) continue;
    if (rnd(s, 'kunskap', a) > (kind === 'berättelse' || kind === 'djupt samtal' ? 0.5 : 0.2)) continue;
    b.tek ??= {};
    const d = Math.min(1 - (b.tek[t.id] ?? 0), 0.2 * (0.5 + stat(b, 'intelligens', s.now) / 20));
    b.tek[t.id] = (b.tek[t.id] ?? 0) + d; count(s, 'tekLart', d);
    if (b.tek[t.id] >= 1) learn(s, b, t, a);
  }
}

// äldre sparfiler: den som redan gjort yxor eller spjut kan det
export function migrateTek(s: State) {
  for (const p of s.people) {
    if ((p.habit?.yxa ?? 0) > 0 || p.fame.some(f => f.includes('första yxa'))) (p.tek ??= {}).yxa = 1;
    if ((p.habit?.spjut ?? 0) > 0) (p.tek ??= {}).fiskespjut = 1;
  }
}
