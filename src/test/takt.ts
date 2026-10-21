// jämför hur mycket som samlas per dygn i levande läge (med gång) och i snabbläge
import { createState, step, living, groundOf } from '../sim';
import { START } from './kor';
const [seed, live, timmar] = [Number(process.argv[2] ?? 3), process.argv[3] !== 'snabb', Number(process.argv[4] ?? 24)];
const s = createState(seed, START);

const dt = live ? 0.5 : 60;
const tid: Record<string, number> = {};
let trips = 0, prev = new Map<number, string>();
for (let i = 0; i < timmar * 3600 / dt; i++) {
  step(s, dt, live);
  for (const p of living(s)) { if (p.task && ['samla', 'jakt', 'ved', 'hugga'].includes(p.task.act)) tid[p.task.act] = (tid[p.task.act] ?? 0) + dt / 3600; const ph = p.task?.phase ?? ''; if (prev.get(p.id) === 'do' && ph === 'back') trips++; prev.set(p.id, ph); }
}
const st = s.stat ?? {};
const eff = Object.fromEntries(Object.keys(tid).map(k => [k, +(((st['prod_' + k] as number) ?? 0) / tid[k]).toFixed(2)]));
const g = groundOf(s); let bar = 0; for (let i = 0; i < g.cover.length; i++) if ((g.tiles[i] === 2 || g.tiles[i] === 3) && g.cover[i] < 0.3) bar++;
console.log(JSON.stringify({ seed, live, bar, eff, tim: Object.fromEntries(Object.entries(tid).map(([k, v]) => [k, Math.round(v)])), trips }));
