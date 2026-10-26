// npm run takt -- [by = 3] [live|snabb] [timmar = 24]: hur mycket en arbetstimme ger i varje arbete som bär hem något, hur många
// turer hem som gjorts (s.stat.turer) och hur många jordrutor som är stigar (bar jord enligt markslag i mark.ts).
// Ordet live eller snabb får stå med, men betyder inget sedan v29: levande läge och snabbläget räknar likadant (npm run likhet)
import { ACTS, Act, BEAT, createState, step, living } from '../sim';
import { START, STEG_TIM, markStat } from './kor';

const arg = process.argv.slice(2).filter(a => a !== 'live' && a !== 'snabb');
const [seed, timmar] = [Number(arg[0] ?? 3), Number(arg[1] ?? 24)];
if (arg.length > 2 || !Number.isInteger(seed) || !(timmar > 0)) { console.log('Användning: npm run takt -- [by] [live|snabb] [timmar], by ett heltal och timmar ett tal större än 0'); process.exit(1); }
const ARBETE = new Set((Object.keys(ACTS) as Act[]).filter(a => ACTS[a].arbete && ACTS[a].ger)); // arbete för byn som bär hem något: samla, jakt, fiske, ved, hugga
const s = createState(seed, START);
const tid: Record<string, number> = {};
for (let i = 0; i < timmar * STEG_TIM; i++) {
  step(s, BEAT);
  for (const p of living(s)) if (p.task && ARBETE.has(p.task.act)) tid[p.task.act] = (tid[p.task.act] ?? 0) + BEAT / 3600;
}
const st = s.stat ?? {};
const eff = Object.fromEntries(Object.keys(tid).map(k => [k, +(((st['prod_' + k] as number) ?? 0) / tid[k]).toFixed(2)]));
console.log("stigar = jordrutor med nött marktäcke utan ungskog (markslag 'bar'). Det gamla talet 'bar' räknade också nött mark under ungskog och blev större");
console.log(JSON.stringify({ seed, timmar, stigar: markStat(s).bar, eff, tim: Object.fromEntries(Object.entries(tid).map(([k, v]) => [k, Math.round(v)])), turer: st.turer ?? 0 }));
