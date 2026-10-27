// Isen på sjöarna (steg 2.11.3). Vattnet har en egen temperatur som följer luftens långsamt, med ungefär två dygns
// fördröjning (två år i spelet). När vattnet kyls under noll lägger sig isen, och den växer fortare ju kallare det är och
// ju tunnare den är (tjock is skyddar vattnet under); snö på isen gör att den växer långsammare. Över noll smälter den.
// Det ger ungefär 15 cm när istiden börjar och 35–40 cm som mest, och isen går upp i början av våren. Alla sjöar har
// samma is. Allt räknas varje timme i stepIs (steg.ts), likadant i spelet och i ikappräkningen.
// Den som fiskar eller dricker när isen ligger hugger först upp ett hål (registret ISHAL): tunn is med händerna, tjockare
// med en sten, och yxan, spjutet och spaden tar sig genom all is. Det sista är tillfälligt: när isborren kommer (steg
// 7.4.4) tar bara den sig genom den tjockaste isen. Fisket genom hålet är pimpling; det ger lika mycket som fisket från
// stranden efter årstiden
import { balans } from './balans';
import { amountOf } from './lager';
import { freeOfKinds, SPJUT } from './redskap';
import { snoPaMarken, temperature } from './vader';
import { Person, State } from './typer';

export const IS = balans('is', {
  vattenTim: 48, // vattnets temperatur närmar sig luftens så här långsamt (timmar)
  forst: 0.5, // när vattnet kyls under noll blir isen så här många cm per grad under noll
  vaxer: 1, // isen växer vaxer × köld / (bas + tjockleken) cm per timme (köld = grader under noll) ...
  bas: 2,
  snoSkyddar: 0.5, // ... och upp till så här mycket långsammare med snö på isen
  smalter: 0.3, // cm per timme och grad över noll
});
export interface IsMinne { vatten: number; cm: number } // vattnets temperatur (grader) och isens tjocklek (cm)

// sätten att hugga upp ett hål i isen (registret), det snabbaste först: hur tjock is det går igenom (cm), minuter per cm
// och om personen har det. Redskapet behöver inte vara ledigt länge, så det tas inte ifrån någon
interface HalDef { id: string; namn: string; max: number; minPerCm: number; har: (s: State, p: Person) => boolean }
const harRedskap = (s: State, p: Person, ks: string[]) => ks.includes(p.task?.tool ?? '') || !!freeOfKinds(s, p, ks);
export const ISHAL: HalDef[] = [
  // tillfälligt: yxan, spjutet och spaden tar sig genom all is tills isborren kommer (steg 7.4.4)
  { id: 'yxa', namn: 'yxan', max: Infinity, minPerCm: 0.3, har: (s, p) => harRedskap(s, p, ['yxa']) },
  { id: 'spjut', namn: 'spjutet', max: Infinity, minPerCm: 0.5, har: (s, p) => harRedskap(s, p, SPJUT) },
  { id: 'benspade', namn: 'spaden', max: Infinity, minPerCm: 0.5, har: (s, p) => harRedskap(s, p, ['benspade']) },
  { id: 'sten', namn: 'en sten', max: 15, minPerCm: 0.6, har: s => amountOf(s, 'sten') >= 1 },
  { id: 'hand', namn: 'händerna', max: 5, minPerCm: 1, har: () => true },
];

const minneOf = (s: State) => (s.is ??= { vatten: Math.max(0, temperature(s)), cm: 0 });
// isens tjocklek i cm (0 = öppet vatten) och vattnets temperatur
export const isCm = (s: State) => s.is?.cm ?? 0;
export const islagt = (s: State) => isCm(s) > 0;
export const vattenGrader = (s: State) => s.is?.vatten ?? Math.max(0, temperature(s)); // ändrar inget (gränssnittet frågar)

// varje timme (steg.ts)
export function stepIs(s: State) {
  const m = minneOf(s), t = temperature(s);
  if (m.cm <= 0) {
    m.vatten += (t - m.vatten) / IS.vattenTim;
    if (m.vatten < 0) { m.cm = -m.vatten * IS.forst; m.vatten = 0; }
  } else if (t < 0) m.cm += IS.vaxer * -t / (IS.bas + m.cm) * (1 - IS.snoSkyddar * snoPaMarken(s));
  else m.cm = Math.max(0, m.cm - IS.smalter * t);
}

// hur p hugger upp ett hål i isen just nu: det snabbaste sättet hen har som går igenom isen. undefined = det går inte
// (eller isen ligger inte: då behövs inget hål, se halMin)
export function halVal(s: State, p: Person) {
  const cm = isCm(s);
  return cm > 0 ? ISHAL.find(h => h.max >= cm && h.har(s, p)) : undefined;
}
// kan p nå vattnet: isen ligger inte, eller hen kan hugga upp ett hål
export const naVattnet = (s: State, p: Person) => !islagt(s) || !!halVal(s, p);
// så många minuter det tar för p att hugga upp hålet (0 när isen inte ligger eller det inte går)
export function halMin(s: State, p: Person) {
  const h = halVal(s, p);
  return h ? h.minPerCm * isCm(s) : 0;
}
