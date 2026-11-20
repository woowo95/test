// Mätskript för prestandaförslagen: en sparad testby stegas som ikappräkningen gör, och datorns tid och en kontrollsumma skrivs.
//   npx tsx granskning/prestanda/mat-sim.ts stor|ikapp
// stor = byn 1511-40 i 2 dygn, ikapp = byn 1-35 i 2 dygn (2 år i spelet). Tiden är datorns tid.
import '../../src/test/utc';
import { createHash } from 'node:crypto';
import { DAY, serialize, step } from '../../src/sim';
import { nastaSteg } from '../../src/sim/kartstrid';
import { lasBy } from '../../src/test/delby';
import { kanonisk } from '../../src/test/pool';

const FALL: Record<string, { fil: string; dygn: number }> = { stor: { fil: 'test/facit-byar/1511-40.json.gz', dygn: 2 }, ikapp: { fil: 'test/facit-byar/1-35.json.gz', dygn: 2 } };
const f = FALL[process.argv[2] ?? 'stor'];
if (!f) throw new Error('fall: stor eller ikapp');
const s = lasBy(f.fil);
const slut = s.now + f.dygn * DAY;
const t0 = performance.now();
while (s.now < slut) step(s, nastaSteg(s));
const ms = performance.now() - t0;
const sum = createHash('md5').update(kanonisk(serialize(s))).digest('hex').slice(0, 12);
console.log(`${process.argv[2] ?? 'stor'} ${(ms / 1000).toFixed(2)} s ${sum}`);
