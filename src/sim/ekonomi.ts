import { ageOf, living, stat } from './folk';
import { ageIndex } from './tid';
import { ACTS } from './handlingar';
import { Act, Person, State } from './typer';

// ---------- ekonomi ----------
// enheter per arbetstimme. Grundtakten, årstiden och egenskapen som hjälper står i handlingar.ts; att fälla och hugga
// är vedarbete och räknas som ved
export function workRate(s: State, p: Person, act: Act) {
  const a = ageOf(p, s.now);
  const ageF = a < 14 ? 0.3 : a > 60 ? 0.6 : 1;
  const sk = ACTS[act].arbete!, d = ACTS[sk as Act];
  return d.bas! / 3600 * d.sasong![ageIndex(s)] * (0.45 + p.skill[sk] / 20 + stat(p, d.egenskap!, s.now) / 40) * ageF * (p.sickUntil && p.sickUntil > s.now ? 0.3 : 1);
}
export function foodDays(s: State) { const n = living(s).length || 1; return s.food / (n * 1.6); }
