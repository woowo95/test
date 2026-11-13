import * as SIM from '../../sim';
import { START } from '../kor';
const s = SIM.createState(42, START); const why = new Map<string, number>();
for (let d = 0; d < 8; d++) for (let k = 0; k < 288; k++) { SIM.step(s, 300); for (const p of SIM.living(s)) if ((p.task?.act === 'hugga' || p.task?.act === 'falla') && p.task.phase === 'do') { const k2 = p.task.act + ': ' + (p.task.why ?? '?').replace(/[0-9]+/g, 'N'); why.set(k2, (why.get(k2) ?? 0) + 1); } }
console.log([...why].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => n + ' ' + k).join('\n'));
console.log('ved', SIM.amountOf(s, 'ved'), 'dygn', SIM.woodDays(s).toFixed(0), 'buffert', SIM.buffert(s, 'ved').toFixed(1), 'tak', SIM.lyxtak(s, 'ved').toFixed(0), 'stammar', (s.stockar ?? []).length, 'virke', SIM.amountOf(s, 'virke'));
