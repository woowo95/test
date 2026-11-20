// Mätskript för prestandaförslag 781 (Person i en fast form). Läser en sparad testby, stegar den som ikappräkningen gör
// (step(s, nastaSteg(s))) i ett antal dygn och skriver datorns tid, en kontrollsumma av byn och hur många olika former
// (dolda klasser i V8) de levande personerna har.
//   node --allow-natives-syntax --import tsx granskning/prestanda/mat-sim.ts <stor|liten> [dygn]
import '../../src/test/utc';
import '../../src/sim';
import { createHash } from 'node:crypto';
import { DAY, living, nastaSteg, serialize, step, type Person } from '../../src/sim';
import { lasBy } from '../../src/test/delby';
import { kanonisk } from '../../src/test/pool';

const fall = process.argv[2] ?? 'stor', dygn = Number(process.argv[3] ?? 2);
const fil = fall === 'stor' ? 'test/facit-byar/1511-40.json.gz' : 'test/facit-byar/1-15.json.gz';
const s = lasBy(fil);
const slut = s.now + dygn * DAY;
const former = (folk: Person[]) => {
  const nycklar = new Set(folk.map(p => Object.keys(p).join()));
  let v8: number | string = '-', dict: number | string = '-';
  try {
    const same = new Function('a', 'b', 'return %HaveSameMap(a, b)') as (a: object, b: object) => boolean;
    const snabb = new Function('a', 'return %HasFastProperties(a)') as (a: object) => boolean;
    const grupper: Person[] = [];
    for (const p of folk) if (!grupper.some(g => same(g, p))) grupper.push(p);
    v8 = grupper.length; dict = folk.filter(p => !snabb(p)).length;
  } catch { /* utan --allow-natives-syntax */ }
  return `${nycklar.size} nyckelordningar, ${v8} V8-former, ${dict} i dictionary-läge, ${folk.length} levande`;
};
const fore = former(living(s));
const t0 = performance.now();
while (s.now < slut) step(s, nastaSteg(s));
const ms = performance.now() - t0;
const hash = createHash('md5').update(kanonisk(serialize(s))).digest('hex').slice(0, 12);
console.log(`${fall} ${dygn} dygn: ${(ms / 1000).toFixed(2)} s, kontrollsumma ${hash}; former före: ${fore}; efter: ${former(living(s))}`);
