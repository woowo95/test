import { ALDER, KROPP, ageOf, isSick, living, stat } from './folk';
import { handighet } from './halsa';
import { ageIndex } from './tid';
import { ACTS, SNABBARE } from './handlingar';
import { Act, HOUR_S, Person, State } from './typer';
import { matSomHaller } from './lager';
import { balans } from './balans';
import { RELT } from './relationer';

// ---------- ekonomi ----------
// Balanstalen (regel 8). Den som ger mat till någon utanför familjen behåller matPerDygn själv (MAT.kvar i behov.ts), och
// torkställningen lämnar så mycket per person (TORK.spara). Hur länge förrådet räcker räknas av vad byn äter (foodDays)
export const EKONOMI = balans('ekonomi', {
  matPerDygn: 1.6, // portioner mat per person som man behåller när man ger bort mat
  atGlid: 1 / 24, // det byn äter per person och dygn är ett glidande snitt som byts ut så här mycket i timmen (ungefär ett dygn, ett år i spelet)
  barnArbete: 0.3, // ett barn (under ALDER.vuxen) orkar så här stor del av en vuxens arbete ...
  gammalArbete: 0.6, // ... och en gammal (över ALDER.gammal) så här stor del
  sjukArbete: 0.3, // den som är sjuk orkar så här stor del
  kunnigBas: 0.6, // en färdighet (0–20) hjälper i arbetet med kunnigBas + färdigheten / kunnigSteg: 0,6 utan, 1,4 med högsta
  kunnigSteg: 25,
  taktBas: 0.45, // arbetstakten gånger taktBas + färdigheten / taktFardighet + egenskapen som hjälper / taktEgenskap
  taktFardighet: 20,
  taktEgenskap: 40,
});
// Reserver: det som lämnas kvar i förrådet till elden, och tändmaterialet byn vill ha. Mängder i förrådets enheter
export const RESERV = balans('reserv', {
  // sparas till elden när något byggs eller tvinnas (bygg.ts, redskap.ts)
  ved: 6, // trä
  grenar: 15, // grenar
  torrgras: 6, // hö
  torrgrasKyla: 12, // hö som sparas till elden inför och under istiden och när det är kallt: en korg flätas först av det som är över (val.ts, redskap.ts)
  // tändmaterial (eld.ts)
  tandBrist: 12, // byn behöver samla tändmaterial när hö eller grenar är färre än så och elden är släckt
  tandVill: 12, // så mycket hö och grenar samlas det till när elden brinner
  tandVillSlocknad: 36, // ... och när elden är släckt
});
// det som lämnas kvar i förrådet till elden av slaget k när något byggs (bygg.ts, stationer.ts)
export const sparas = (k: string) => k === 'ved' ? RESERV.ved : k === 'grenar' ? RESERV.grenar : k === 'torrgras' ? RESERV.torrgras : 0;
// enheter per arbetstimme. Grundtakten, årstiden och egenskapen som hjälper står i handlingar.ts; att fälla och hugga
// är vedarbete och räknas som ved
// arbetsförmågan: ålder (barn och gamla orkar mindre) gånger sjukdom. workRate multiplicerar de två delarna var för sig
// sist i sin kedja; (kedja * a) * b är inte alltid samma flyttal som kedja * (a * b)
export const ageFactor = (a: number) => a < ALDER.vuxen ? EKONOMI.barnArbete : a > ALDER.gammal ? EKONOMI.gammalArbete : 1;
export const sickFactor = (p: Person, now: number) => isSick(p, now) ? EKONOMI.sjukArbete : 1;
// hur mycket en färdighet (0–20) hjälper i arbetet
export const kunnighet = (skill: number) => EKONOMI.kunnigBas + skill / EKONOMI.kunnigSteg;
export const arbetsformaga = (p: Person, a: number, now: number) => ageFactor(a) * sickFactor(p, now);
export function workRate(s: State, p: Person, act: Act) {
  const a = ageOf(p, s.now);
  const sk = ACTS[act].arbete!, d = ACTS[sk as Act];
  return d.bas! * (d.fart ?? 1) * SNABBARE / HOUR_S * d.sasong![ageIndex(s)] * (EKONOMI.taktBas + p.skill[sk] / EKONOMI.taktFardighet + stat(p, d.egenskap!, s.now) / EKONOMI.taktEgenskap) * ageFactor(a) * sickFactor(p, s.now) * handighet(p) // skadade armar och händer arbetar långsammare (halsa.ts)
    * (p.rivalom && ACTS[act].yrke === p.rivalom ? 1 + RELT.rivalFlit : 1); // den som har en rival i sitt yrke arbetar lite hårdare (steg 3.1.1)
}
// det p äter på ett dygn enligt kroppen: mättnaden sjunker 1 / hungerTim i timmen (ett barn långsammare) och en portion god mat
// höjer den KROPP.mattar. Ett barn äter en mindre portion som mättar lika mycket
export function kroppensMat(p: Person, now: number) {
  const barn = ageOf(p, now) < ALDER.matBarn;
  return 24 / KROPP.hungerTim * (barn ? KROPP.hungerBarn : 1) / KROPP.mattar * (barn ? KROPP.portionBarn : 1);
}
// en gång i timmen (steg.ts): det byn ätit sedan förra timmen (räknaren atit, behov.ts) per person och dygn, som ett glidande snitt.
// Snittet börjar på det kroppen behöver
export function atSteg(s: State) {
  const ppl = living(s), atit = s.stat?.atit ?? 0;
  if (ppl.length && s.atSist !== undefined) {
    const nu = (atit - s.atSist) * 24 / ppl.length;
    s.atTakt = s.atTakt === undefined ? ppl.reduce((t, p) => t + kroppensMat(p, s.now), 0) / ppl.length : s.atTakt;
    s.atTakt += (nu - s.atTakt) * EKONOMI.atGlid;
  }
  s.atSist = atit;
}
// hur många dygn maten i förrådet räcker (steg 2.12.4): räknat av det byn faktiskt äter per person (atSteg), och aldrig av mindre
// än kroppen behöver, så att en by som inte har något att äta inte tror att maten räcker längre. Bara den mat räknas som hinner
// ätas innan den ruttnar (steg 3.10.9, matSomHaller i lager.ts): ett fullt förråd av fisk som ruttnar i morgon räcker inte länge
export function foodDays(s: State) {
  const ppl = living(s), kropp = ppl.length ? ppl.reduce((t, p) => t + kroppensMat(p, s.now), 0) : 24 / KROPP.hungerTim / KROPP.mattar; // en tom by räknas som en vuxen
  const perDygn = Math.max(kropp, ppl.length * (s.atTakt ?? 0));
  return matSomHaller(s, perDygn / 24) / perDygn;
}
