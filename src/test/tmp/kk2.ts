import '../scenarier/storlek';
import * as SIM from '../../sim';
import { START } from '../kor';
import { klockan, medHus, nyInvanare } from '../scenarier/hjalp';
const s = SIM.createState(6, START); klockan(s);
const h1 = medHus(s); console.log('h1', h1?.fn, h1?.w, h1?.h, SIM.housesOf(s).length);
for (let j = 0; j < 6; j++) nyInvanare(s, j % 2 ? 'm' : 'k', 25);
console.log('behov', JSON.stringify(SIM.byggbehov(s).map(b => [b.fn, b.a.v.toFixed(2), b.a.plats])));
for (let k = 0; k < 12 * 12; k++) SIM.step(s, 300); s.byggSok = undefined; const h2 = medHus(s); console.log('h2', h2?.fn, SIM.housesOf(s).map(h => [h.fn, h.klar ? 1 : 0]));
