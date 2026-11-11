// Berusningen (steg 9.6.14, Mat, matlagning och dryck: Alkohol och droger). Ett tillstånd i hälsosystemet: p.rus växer med
// varje dryck med alkohol (registret ALKOHOL) och sjunker med tiden. Det sänker förmågorna mer ju mer man druckit: gånghastigheten
// (rorlighet i halsa.ts), handlaget i arbetet (handighet), smidigheten och träffsäkerheten i striden (strid.ts). Den som dricker
// mycket under lång tid (p.supit, ett minne som bleknar) får sämre hälsa. Man dricker på kvällen vid elden när byn har vin eller öl.
import { balans } from './balans';
import { ALDER, ageOf, count, forstaGang, log, think } from './folk';
import { clamp } from './slump';
import { HOUR, HOUR_S, Person, State } from './typer';
import { isLight } from './tid';
type VatskaId = import('./vatskor').VatskaId;
// vätskorna i krukorna (vatskor.ts sätter kroken, så att den här filen inte laddar vatskor.ts och halsa.ts i en ring)
export const alkoholKrok = { finns: (_s: State, _v: VatskaId) => false, ta: (_s: State, _v: VatskaId) => false };

export const RUS = balans('rus', {
  sjunker: 0.15, // så mycket av ruset går över i timmen
  fart: 0.35, // gången och händigheten sjunker så här mycket per hel rus (1 = mycket full) ...
  smid: 6, traff: 4, // ... smidigheten och träffsäkerheten i striden så här många poäng per hel rus
  golv: 0.4, // aldrig under så här stor del av förmågan
  kvall: 0.3, // chansen att den vuxne som är hemma på kvällen väljer att ta en dryck när hen väljer fritid och byn har ...
  mest: 0.8, // ... och inte redan är så här full
  supit: 0.02, // så mycket av det man supit glöms i timmen ...
  skadligt: 3, // ... och över så här mycket blir hälsan sämre ...
  halsa: 0.004, // ... med så här mycket i timmen
  glad: 0.04, gladTim: 4, // tanken av att dricka
  // ruset i byn (steg 9.6.15): spärrarna släpper
  gral: 1.5, // den berusade grälar 1 + gral × ruset gånger oftare ...
  flirt: 0.3, // ... flirtar med så här mycket större chans per hel rus ...
  slag: 2, // ... och väljer hårda utbrott (slag) 1 + slag × ruset gånger hellre
  fylla: 0.6, // den som var så här full får bakfylla när ruset gått över ...
  bakTim: 8, bak: -0.08, bakFaktor: 0.85, // ... i så många timmar: tanken, och förmågorna gånger bakFaktor
  supa: 3, // så många drycker dricker den som super (utbrottet supa)
});
// dryckerna med alkohol och hur mycket rus en del ger
export const ALKOHOL: Partial<Record<VatskaId, number>> = { ol: 0.25, vin: 0.35 };
export const rusAv = (p: Person) => p.rus ?? 0;
// förmågan gånger detta (gången och händigheten)
export const rusFaktor = (p: Person) => Math.max(RUS.golv, 1 - RUS.fart * rusAv(p)) * (p.bak ? RUS.bakFaktor : 1); // och bakfyllan (steg 9.6.15)
export const rusSmid = (p: Person) => RUS.smid * rusAv(p);
export const rusTraff = (p: Person) => RUS.traff * rusAv(p);
// p dricker en dryck med alkohol
export function drickAlkohol(s: State, p: Person, v: VatskaId) {
  if (!alkoholKrok.ta(s, v)) return false;
  const a = ALKOHOL[v] ?? 0;
  p.rus = clamp(rusAv(p) + a, 0, 2); p.supit = (p.supit ?? 0) + a;
  think(p, v === 'vin' ? 'Drack vin' : 'Drack öl', RUS.glad, s.now, RUS.gladTim * HOUR);
  count(s, 'drack_' + v);
  if (forstaGang(s, 'alkohol')) log(s, `${p.name} drack byns första ${v === 'vin' ? 'vin' : 'öl'} vid elden.`, 'world', [p.id]);
  return true;
}
// i hälsans takt (steg.ts): ruset går över och det man supit glöms
export function rusSteg(s: State, p: Person, dtSec: number) {
  const h = dtSec / HOUR_S;
  if (p.bak) { p.bak = Math.max(0, p.bak - h); if (p.bak <= 1e-6) p.bak = undefined; }
  if (p.rus) {
    if (p.rus >= RUS.fylla) p.fylla = 1; // hen var full i kväll (steg 9.6.15)
    p.rus = Math.max(0, p.rus - RUS.sjunker * h);
    if (p.rus <= 1e-6) { p.rus = undefined; if (p.fylla) { p.fylla = undefined; p.bak = RUS.bakTim; think(p, 'Bakfull', RUS.bak, s.now, RUS.bakTim * HOUR); count(s, 'bakfylla'); } }
  }
  if (p.supit) {
    if (p.supit > RUS.skadligt) p.health = Math.max(0, p.health - RUS.halsa * h);
    p.supit = Math.max(0, p.supit - RUS.supit * h); if (p.supit <= 1e-6) p.supit = undefined;
  }
}
// vill p ta en dryck med alkohol i kväll (steg 10.2.34: ett val, raden kvallsdryck i val.ts): en vuxen som är hemma när det är
// mörkt och inte druckit för mycket, när byn har vin eller öl. Svarar med drycken
export function kvallsDryck(s: State, p: Person, hemma: boolean): VatskaId | undefined {
  if (!hemma || isLight(s.now) || ageOf(p, s.now) < ALDER.vuxen || rusAv(p) >= RUS.mest) return undefined;
  return (Object.keys(ALKOHOL) as VatskaId[]).find(k => alkoholKrok.finns(s, k));
}
// supandet (utbrottet supa i humor.ts): den som mår dåligt super sig full när byn har något att dricka
export const kanSupa = (s: State) => (Object.keys(ALKOHOL) as VatskaId[]).some(k => alkoholKrok.finns(s, k));
export function supa(s: State, p: Person) {
  for (let i = 0; i < RUS.supa; i++) { const v = (Object.keys(ALKOHOL) as VatskaId[]).find(k => alkoholKrok.finns(s, k)); if (!v) break; drickAlkohol(s, p, v); }
}
