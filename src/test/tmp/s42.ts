import * as SIM from '../../sim';
import { START } from '../kor';
const BEAT = 300;
const s = SIM.createState(42, START);
for (let d = 0; d < 30; d++) { const a = performance.now(); for (let k = 0; k < 86400 / BEAT; k++) SIM.step(s, BEAT); console.log('dygn', d, ((performance.now() - a) / 1000).toFixed(1), 's folk', SIM.living(s).length, 'stackar', (s.stackar ?? []).length, 'ved', Math.round(SIM.amountOf(s, 'ved'))); }
