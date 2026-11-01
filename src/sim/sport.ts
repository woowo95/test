// Sporten (steg 4.3.1, Kultur, sport och konst): barnens lekar blir sport för de vuxna. Några sociala sporter med enkla
// föremål, när byn har ett överskott av mat och ved och folk har fritid. Sporten ger glädje och tränar bara färdigheter
// (brottning och dragkamp närstrid, kast och bollspel träffsäkerhet), aldrig egenskaperna. Den är ingen stor del av spelet.
// En match i taget: den som har fritid börjar en på lekplatsen eller går med i den som väntar på spelare, och den spelas på
// dagen. Sporterna är rader i registret SPORTER; föremålen de kräver är saker i saker.ts som byn måste ha.
import { ALDER, ageOf, alive, count, living, ovning, stat, think } from './folk';
import { foodDays } from './ekonomi';
import { woodDays } from './eld';
import { amountOf, avbryt } from './lager';
import { lekplats } from './stationer';
import { freeNear } from './byggnad';
import { rnd } from './slump';
import { hourOf } from './tid';
import { balans } from './balans';
import { HOUR, HOUR_S, MIN, Person, Skill, State, Task } from './typer';

export interface SportDef {
  id: string; namn: string;
  text: string; // vad man ser när den spelas
  foremal: string[]; // sakerna byn måste ha (saker.ts)
  skill: Skill; // färdigheten den tränar
  min: number; max: number; // så många spelare som behövs och som får vara med
}
export const SPORTER: SportDef[] = [
  { id: 'brottning', namn: 'Brottning', text: 'Två brottas i gräset tills den ena ligger på rygg, och de andra står runt om och hejar.', foremal: [], skill: 'narstrid', min: 2, max: 6 },
  { id: 'dragkamp', namn: 'Dragkamp', text: 'Två lag drar i var sin ände av ett rep, tills det ena laget dras över strecket.', foremal: ['rep'], skill: 'narstrid', min: 4, max: 10 },
];
export const SPORT_AV: Record<string, SportDef> = Object.fromEntries(SPORTER.map(d => [d.id, d]));

export const SPORT = balans('sport', {
  vikt: 0.4, // vikten i fritiden (leisure i val.ts) att börja en match, gånger lugnet och (styrka + smidighet) / 20 ...
  med: 12, // ... och gånger så här mycket när en match väntar på spelare
  mat: 1.1, ved: 2, // bara när maten räcker så här många dygn och veden så här många (byn har ett överskott)
  alderTill: 50, // över detta spelar man inte
  minuter: 50, spann: 40, // en match varar så här många minuter, plus upp till spann
  vanta: 30, // minuter: har inte tillräckligt många kommit fram så här länge efter starten, blir det ingen match
  sent: 15, // minuter: så här nära slutet går ingen ny med
  folj: 0.8, nara: 20, // den som har fritid (FRITID) och är högst nara rutor från lekplatsen när en match börjar följer med så här ofta, gånger (styrka + smidighet) / 20
  ovning: 0.15, // övning i sportens färdighet per timme man spelar
  gladje: 0.08, gladjeTim: 8, // tanken efter en match (minst gladjeMin timmar spelat): så här glad i så här många timmar
  gladjeMin: 0.25,
});

// matchen som pågår eller väntar på spelare: sporten, platsen, när den började (spelarnas task.ref) och slutar
export interface Match { k: string; x: number; y: number; start: number; slut: number; spelat?: true }

// de som spelar i matchen (framme = de som kommit fram)
const spelare = (s: State, m: Match, framme: boolean) => s.people.filter(q => alive(q) && q.task?.act === 'sport' && q.task.ref === m.start && (!framme || q.task.phase === 'do'));
// sporter byn kan spela nu: föremålen finns, och det finns vuxna nog
const kanSpela = (s: State, d: SportDef, vuxna: number) => vuxna >= d.min && d.foremal.every(k => amountOf(s, k) >= 1);
// matchen som går att gå med i (den som är slut glöms)
function oppen(s: State) {
  const m = s.sport;
  if (m && s.now >= m.slut) { s.sport = undefined; return undefined; }
  return m && s.now < m.slut - SPORT.sent * MIN && spelare(s, m, false).length < SPORT_AV[m.k].max ? m : undefined;
}
const vuxna = (s: State) => living(s).filter(q => { const a = ageOf(q, s.now); return a >= ALDER.vuxen && a <= SPORT.alderTill; }).length;

// vikten för sport i fritiden (leisure i val.ts): calm är lugnet där (1 när byn inte behöver arbete)
export function sportVikt(s: State, p: Person, calm: number) {
  const a = ageOf(p, s.now);
  if (a < ALDER.vuxen || a > SPORT.alderTill) return 0;
  const m = oppen(s);
  if (!m && !SPORTER.some(d => kanSpela(s, d, vuxna(s)))) return 0;
  if (foodDays(s) < SPORT.mat || woodDays(s) < SPORT.ved) return 0;
  return SPORT.vikt * calm * (m ? SPORT.med : 1) * (stat(p, 'styrka', s.now) + stat(p, 'smidighet', s.now)) / 20;
}
// att spela: gå med i matchen som väntar, annars börja en ny med en sport byn kan spela
export function sportVal(s: State, p: Person): { why: string; spot: { x: number; y: number }; dur: number; ref: number; tool: string } | undefined {
  let m = oppen(s);
  const ny = !m;
  if (!m) {
    // den som börjar en match samlar folk; följer ingen med blir det ingen match
    const folj = foljare(s, p), n = vuxna(s);
    const kan = SPORTER.filter(d => d.min <= folj.length + 1 && kanSpela(s, d, n));
    const morkt = s.now + (19 - hourOf(s.now)) * HOUR; // sporten spelas på dagen (isLight i tid.ts): matchen slutar när det blir mörkt
    if (!kan.length || morkt - s.now < SPORT.minuter * MIN) return undefined;
    const d = kan[Math.floor(rnd(s, 'sport', p) * kan.length)], l = lekplats(s);
    m = s.sport = { k: d.id, x: l.x + l.w / 2, y: l.y + l.h / 2, start: s.now, slut: Math.min(morkt, s.now + (SPORT.minuter + rnd(s, 'sport', p) * SPORT.spann) * MIN) };
    count(s, 'sportMatcher');
    for (const q of folj.slice(0, d.max - 1)) {
      const u = plats(s, q, m);
      avbryt(s, q);
      q.task = { act: 'sport', phase: 'go', tx: u.x, ty: u.y, until: m.slut, carry: 0, ref: m.start, tool: d.id, dark: false, why: `Följer med ${p.name} och spelar ${d.namn.toLowerCase()}` };
    }
  }
  const d = SPORT_AV[m.k];
  return { why: ny ? `Vill ha ${d.namn.toLowerCase()} och samlar folk` : `Går med i ${d.namn.toLowerCase()}en`, spot: plats(s, p, m), dur: m.slut - s.now, ref: m.start, tool: d.id };
}
const plats = (s: State, p: Person, m: Match) => freeNear(s, m.x + (rnd(s, 'sport', p) - 0.5) * 2, m.y + (rnd(s, 'sport', p) - 0.5) * 2); // aldrig i en vägg
// de som följer med den som börjar en match: de vuxna som har fritid (vilar på dagen, samtalar, sitter vid stranden,
// promenerar), de starka och smidiga oftare
const FRITID = new Set<string>(['vila', 'samtal', 'strand', 'promenad']);
const foljare = (s: State, p: Person) => { const l = lekplats(s), mx = l.x + l.w / 2, my = l.y + l.h / 2; return living(s).filter(q => {
  const t = q.task;
  return q !== p && Math.hypot(q.x - mx, q.y - my) <= SPORT.nara && !!t && FRITID.has(t.act) && t.phase !== 'back' && !t.dark && sportVikt(s, q, 1) > 0
    && rnd(s, 'sport', q) < SPORT.folj * (stat(q, 'styrka', s.now) + stat(q, 'smidighet', s.now)) / 20;
}); };
// medan man spelar (MEDAN i steg.ts): övning när det är spelare nog. Kommer det inte nog, blir det ingen match
export function sportSteg(s: State, p: Person, t: Task, dtSec: number) {
  const m = s.sport;
  if (!m || m.start !== t.ref || s.now >= m.slut) { t.until = Math.min(t.until, s.now); return; }
  let d = SPORT_AV[m.k];
  const har = spelare(s, m, true);
  if (har.length < d.min) {
    if (s.now <= m.start + SPORT.vanta * MIN) return;
    if (m.spelat) { s.sport = undefined; t.until = s.now; return; } // de andra har gått: matchen är slut
    // det kom för få: de som kom spelar en sport som räcker till dem, eller går därifrån
    const annan = SPORTER.find(e => e.min <= har.length && kanSpela(s, e, har.length));
    if (!annan) { s.sport = undefined; count(s, 'sportInstalld'); t.until = s.now; return; }
    m.k = annan.id; d = annan;
    for (const q of spelare(s, m, false)) q.task!.tool = annan.id;
  }
  const h = dtSec / HOUR_S;
  m.spelat = true;
  ovning(p, d.skill, SPORT.ovning * h);
  t.prog = (t.prog ?? 0) + h;
  count(s, 'sportTim', h);
}
// efter matchen (KLAR i steg.ts): glädjen hos den som spelade en stund
export function sportKlar(s: State, p: Person, t: Task) {
  const d = t.tool ? SPORT_AV[t.tool] : undefined;
  if (d && (t.prog ?? 0) >= SPORT.gladjeMin) think(p, `Spelade ${d.namn.toLowerCase()}`, SPORT.gladje, s.now, SPORT.gladjeTim * HOUR);
}
