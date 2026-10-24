// hur mycket en arbetstimme ger, hur många turer hem och hur mycket mark som nötts (npm run takt -- [by] [timmar])
import { BEAT, createState, step, living, groundOf } from '../sim';
import { START } from './kor';
const [seed, timmar] = [Number(process.argv[2] ?? 3), Number(process.argv[process.argv.length > 4 ? 4 : 3] ?? 24)];
const s = createState(seed, START);
const tid: Record<string, number> = {};
let trips = 0;
const prev = new Map<number, string>();
for (let i = 0; i < timmar * 3600 / BEAT; i++) {
  step(s, BEAT);
  for (const p of living(s)) { if (p.task && ['samla', 'jakt', 'ved', 'hugga', 'fiske'].includes(p.task.act)) tid[p.task.act] = (tid[p.task.act] ?? 0) + BEAT / 3600; const ph = p.task?.phase ?? ''; if (prev.get(p.id) === 'do' && ph === 'back') trips++; prev.set(p.id, ph); }
}
const st = s.stat ?? {};
const eff = Object.fromEntries(Object.keys(tid).map(k => [k, +(((st['prod_' + k] as number) ?? 0) / tid[k]).toFixed(2)]));
const g = groundOf(s); let bar = 0; for (let i = 0; i < g.cover.length; i++) if ((g.tiles[i] === 2 || g.tiles[i] === 3) && g.cover[i] < 0.3) bar++;
console.log(JSON.stringify({ seed, bar, eff, tim: Object.fromEntries(Object.entries(tid).map(([k, v]) => [k, Math.round(v)])), trips }));
