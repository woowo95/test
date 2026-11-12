// En by med eller utan lärdomarna om var saker finns (provet i steg 10.2.64, BALANS="minne.platser=0" stänger av dem).
// Skriver som JSON: för samla, jakt och fiske hur långt utanför byn arbetet görs (median av timmarna), hur mycket det gav
// per arbetstimme och hur många timmar det tog, och byns invånare och hunger
import './utc';
import { STEG_TIM, korBy } from './kor';
import { utanforByn, living } from '../sim';

const [seed, dagar] = process.argv.slice(2).map(Number);
const ACTS = ['samla', 'jakt', 'fiske'] as const;
const avst: Record<string, number[]> = { samla: [], jakt: [], fiske: [] }, tim: Record<string, number> = { samla: 0, jakt: 0, fiske: 0 };
let steg = 0;
const r = korBy(seed, dagar, s => {
  if (++steg % (STEG_TIM / 4)) return; // var femtonde minut
  for (const p of living(s)) { const a = p.task?.act; if (p.task?.phase === 'do' && a && a in avst) { avst[a]!.push(utanforByn(s, p.x, p.y)); tim[a] = tim[a]! + 0.25; } }
});
const med = (l: number[]) => { if (!l.length) return 0; const v = l.slice().sort((a, b) => a - b); return v[Math.floor(v.length / 2)]!; };
const st = r.s.stat ?? {};
console.log(JSON.stringify({ seed, pop: r.n.pop, hunger: r.n.hunger, ...Object.fromEntries(ACTS.flatMap(a => [[a + 'Avst', med(avst[a]!)], [a + 'Tim', tim[a]], [a + 'Ger', Number(st['prod_' + a] ?? 0)]])) }));
