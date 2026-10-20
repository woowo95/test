import { hearthOf } from './eld';
import { ageOf, living, stat } from './folk';
import { ageIndex } from './tid';
import { Act, Person, Skill, Stat, State } from './typer';

// ---------- ekonomi ----------
export const SEASON: Record<string, number[]> = { samla: [0.08, 0.7, 1.25, 1.6], jakt: [0.7, 0.9, 1.0, 1.15], fiske: [0.45, 1.0, 1.1, 1.0], ved: [0.9, 1, 1, 1] };
const BASE: Record<string, number> = { samla: 0.65, jakt: 0.7, fiske: 0.65, ved: 1.3 }; // enheter per timme
export const WORK_STAT: Record<string, Stat> = { samla: 'uthallighet', jakt: 'mod', fiske: 'uthallighet', ved: 'styrka' };
export function workRate(s: State, p: Person, act: Act) {
  const a = ageOf(p, s.now);
  const ageF = a < 14 ? 0.3 : a > 60 ? 0.6 : 1;
  const sk = act as Skill;
  return BASE[act] / 3600 * SEASON[act][ageIndex(s)] * (0.45 + p.skill[sk] / 20 + stat(p, WORK_STAT[act], s.now) / 40) * ageF * (p.sickUntil && p.sickUntil > s.now ? 0.3 : 1);
}
export function foodDays(s: State) { const n = living(s).length || 1; return s.food / (n * 1.6); }
export function woodDays(s: State) { return s.wood / (hearthOf(s.fire).burn * 24); }
