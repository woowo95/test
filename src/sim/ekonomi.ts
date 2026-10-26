import { ageOf, isSick, living, stat } from './folk';
import { ageIndex } from './tid';
import { ACTS, SNABBARE } from './handlingar';
import { Act, HOUR_S, Person, State } from './typer';
import { foodOf } from './lager';

// ---------- ekonomi ----------
// enheter per arbetstimme. Grundtakten, årstiden och egenskapen som hjälper står i handlingar.ts; att fälla och hugga
// är vedarbete och räknas som ved
// arbetsförmågan: ålder (barn och gamla orkar mindre) gånger sjukdom. workRate multiplicerar de två delarna var för sig
// sist i sin kedja; (kedja * a) * b är inte alltid samma flyttal som kedja * (a * b)
export const ageFactor = (a: number) => a < 14 ? 0.3 : a > 60 ? 0.6 : 1;
export const sickFactor = (p: Person, now: number) => isSick(p, now) ? 0.3 : 1;
// hur mycket en färdighet (0–20) hjälper i arbetet: 0,6 utan färdighet, 1,4 med högsta
export const kunnighet = (skill: number) => 0.6 + skill / 25;
export const arbetsformaga = (p: Person, a: number, now: number) => ageFactor(a) * sickFactor(p, now);
export function workRate(s: State, p: Person, act: Act) {
  const a = ageOf(p, s.now);
  const sk = ACTS[act].arbete!, d = ACTS[sk as Act];
  return d.bas! * SNABBARE / HOUR_S * d.sasong![ageIndex(s)] * (0.45 + p.skill[sk] / 20 + stat(p, d.egenskap!, s.now) / 40) * ageFactor(a) * sickFactor(p, s.now);
}
export function foodDays(s: State) { const n = living(s).length || 1; return foodOf(s) / (n * 1.6); }
