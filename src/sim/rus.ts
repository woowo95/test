// Berusningen (steg 9.6.14, Mat, matlagning och dryck: Alkohol och droger). Ett tillstånd i hälsosystemet: p.rus växer med
// varje dryck med alkohol (registret ALKOHOL) och sjunker med tiden. Det sänker förmågorna mer ju mer man druckit: gånghastigheten
// (rorlighet i halsa.ts), handlaget i arbetet (handighet), smidigheten och träffsäkerheten i striden (strid.ts). Den som dricker
// mycket under lång tid (p.supit, ett minne som bleknar) får sämre hälsa. Man dricker på kvällen vid elden när byn har vin eller öl.
import { balans } from './balans';
import { ALDER, ageOf, count, forstaGang, log, living, isParent } from './folk';
import { chansPer, clamp } from './slump';
import { HOUR, HOUR_S, Person, State } from './typer';
import { hourOf, isLight } from './tid';
import { budBrutet, budHindrar } from './kyrka';
import { tanke } from './tankar';
import { upplev } from './uppvaxt';
import { handelse } from './rykten';
import { moodOf } from './humor';
type VatskaId = import('./vatskor').VatskaId;
// vätskorna i krukorna (vatskor.ts sätter kroken, så att den här filen inte laddar vatskor.ts och halsa.ts i en ring)
// alkohol = hur mycket rus en del ger, drycker = dryckerna med alkohol och kvall = den p helst tar på kvällen (raderna i VATSKOR, steg 10.7.23)
export const alkoholKrok = {
  finns: (_s: State, _v: VatskaId) => false, ta: (_s: State, _v: VatskaId) => false, kv: (_s: State, _v: VatskaId) => 2, alkohol: (_v: VatskaId) => 0, namn: (_v: VatskaId) => '',
  drycker: (): VatskaId[] => [], // kv = kvaliteten på drycken som tas (mognaden, tunna.ts, steg 12.4.6)
  kvall: (_s: State, _p: Person): VatskaId | undefined => undefined,
};

export const RUS = balans('rus', {
  sjunker: 0.15, // så mycket av ruset går över i timmen
  kanns: 0.1, // en dryck med mindre alkohol än så här ger ingen glädje av ruset (svagdrickan, steg 10.7.24)
  fart: 0.35, // gången och händigheten sjunker så här mycket per hel rus (1 = mycket full) ...
  smid: 6, traff: 4, // ... smidigheten och träffsäkerheten i striden så här många poäng per hel rus
  golv: 0.4, // aldrig under så här stor del av förmågan
  kvall: 0.3, // chansen per timme att den vuxne som är hemma på kvällen tar en dryck när byn har (steg 10.7.23: per tid, kvallsChans), gånger lusten ...
  // lusten till rus (steg 12.1.175, rusLust): 1 + humör + vana − plikt + uppväxt, mellan lustMin och lustMax
  lustHumor: 0.6, // den som mår dåligt (humöret 0) dricker så här mycket hellre, den som mår bra (1) så här mycket mindre
  lustVana: 0.8, vanaFull: 3, // vanan: det man supit (p.supit, glöms med supit i timmen), full vid vanaFull, ger så här mycket mer lust
  lustSed: 0.4, // byns sed Plikt drar ner lusten så här mycket (Lättja upp)
  lustUpp: 0.15, // per poäng i uppväxten (upplevelsen Såg en förälder supa, ±2)
  lustMin: 0.2, lustMax: 3,
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
  serR: 8, // barnen inom så här många rutor ser föräldern supa (steg 12.1.133)
});
export const rusAv = (p: Person) => p.rus ?? 0;
// förmågan gånger detta (gången och händigheten)
export const rusFaktor = (p: Person) => Math.max(RUS.golv, 1 - RUS.fart * rusAv(p)) * (p.bak ? RUS.bakFaktor : 1); // och bakfyllan (steg 9.6.15)
export const rusSmid = (p: Person) => RUS.smid * rusAv(p);
export const rusTraff = (p: Person) => RUS.traff * rusAv(p);
// p dricker en dryck med alkohol
// följer p budet Inget rus nu (steg 10.3.22): då tas ingen dryck med alkohol (vatskor.ts)
export const ingetRus = (s: State, p: Person) => budHindrar(s, p, 'ingetRus');
export function drickAlkohol(s: State, p: Person, v: VatskaId, tagen = false) { // tagen: drycken är redan tagen ur sin kruka (kyrkans öl, steg 10.3.23)
  const kv = tagen ? 2 : alkoholKrok.kv(s, v); // ett mognat vin eller mjöd är godare (steg 12.4.6)
  if (!tagen && !alkoholKrok.ta(s, v)) return false;
  const a = alkoholKrok.alkohol(v), namn = alkoholKrok.namn(v).toLowerCase();
  p.rus = clamp(rusAv(p) + a, 0, 2); p.supit = (p.supit ?? 0) + a;
  if (a >= RUS.kanns) tanke(p, 'drack', s.now, { dryck: namn, v: RUS.glad * (1 + TUNNA.mognGlad * Math.max(0, kv - 2)), tid: RUS.gladTim * HOUR }); // svagdrickan känns inte (steg 10.7.24)
  count(s, 'drack_' + v);
  if (forstaGang(s, 'alkohol')) log(s, `${p.name} drack byns första ${namn} vid elden.`, 'world', [p.id]);
  return true;
}
// i hälsans takt (steg.ts): ruset går över och det man supit glöms
export function rusSteg(s: State, p: Person, dtSec: number) {
  const h = dtSec / HOUR_S;
  if (p.bak) { p.bak = Math.max(0, p.bak - h); if (p.bak <= 1e-6) p.bak = undefined; }
  if (p.rus) {
    if (p.rus >= RUS.fylla && !p.fylla) { p.fylla = 1; handelse(s, p, 'full'); } // hen var full i kväll (steg 9.6.15), och de som ser det minns det (steg 12.1.134)
    p.rus = Math.max(0, p.rus - RUS.sjunker * h);
    if (p.rus <= 1e-6) { p.rus = undefined; if (p.fylla) { p.fylla = undefined; p.bak = RUS.bakTim; tanke(p, 'bakfull', s.now, { v: RUS.bak, tid: RUS.bakTim * HOUR }); count(s, 'bakfylla'); } }
  }
  if (p.supit) {
    if (p.supit > RUS.skadligt) p.health = Math.max(0, p.health - RUS.halsa * h);
    p.supit = Math.max(0, p.supit - RUS.supit * h); if (p.supit <= 1e-6) p.supit = undefined;
  }
}
// vill p ta en dryck med alkohol i kväll (steg 10.2.34: ett val, raden kvallsdryck i val.ts): en vuxen som är hemma när det är
// mörkt och inte druckit för mycket, när byn har en dryck med alkohol. Svarar med den hen helst tar (kvällens värde och smaken)
export function kvallsDryck(s: State, p: Person, hemma: boolean): VatskaId | undefined {
  if (!hemma || isLight(s.now) || ageOf(p, s.now) < ALDER.vuxen || rusAv(p) >= RUS.mest || budHindrar(s, p, 'ingetRus')) return undefined; // budet inget rus (steg 10.3.22)
  return alkoholKrok.kvall(s, p);
}
// tar p en dryck nu (steg 10.7.23): chansen RUS.kvall per timme av kvällen sedan hen sist frågade sig (mörkret kommer klockan 19)
export function kvallsChans(s: State, p: Person) {
  const dt = Math.min(s.now - (p.kvallT ?? -Infinity), ((hourOf(s.now) - 19 + 24) % 24) * HOUR);
  p.kvallT = s.now;
  return dt > 0 && chansPer(s, RUS.kvall * rusLust(s, p), HOUR_S, dt / 1000, 'val', p);
}
// lusten till rus (steg 12.1.175): en faktor på chansen att ta en dryck på kvällen, ur humöret, vanan, byns seder och uppväxten
export function rusLust(s: State, p: Person) {
  const humor = (0.5 - moodOf(p, s.now)) * 2, vana = Math.min(1, (p.supit ?? 0) / RUS.vanaFull), sed = s.seder?.v.arbete ?? 0;
  const upp = (p.upp ?? []).reduce((a, u) => a + (u.rus ?? 0), 0);
  return clamp(1 + RUS.lustHumor * humor + RUS.lustVana * vana - RUS.lustSed * sed + RUS.lustUpp * upp, RUS.lustMin, RUS.lustMax);
}
// supandet (utbrottet supa i humor.ts): den som mår dåligt super sig full när byn har något att dricka, det starkaste först
const starkast = (s: State) => alkoholKrok.drycker().filter(k => alkoholKrok.finns(s, k)).sort((a, b) => alkoholKrok.alkohol(b) - alkoholKrok.alkohol(a))[0];
export const kanSupa = (s: State) => !!starkast(s);
export function supa(s: State, p: Person) {
  if (budHindrar(s, p, 'ingetRus') && kanSupa(s)) budBrutet(s, p, 'ingetRus'); // utbrottet går före budet (steg 10.3.22)
  for (let i = 0; i < RUS.supa; i++) { const v = starkast(s); if (!v) break; drickAlkohol(s, p, v); }
  for (const c of living(s)) if (isParent(p, c) && c.task?.act !== 'sova' && Math.hypot(c.x - p.x, c.y - p.y) <= RUS.serR) upplev(s, c, 'foralderSop', p.name); // barnen som ser det (steg 12.1.133)
}
import { TUNNA } from './tunna';
