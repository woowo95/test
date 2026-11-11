// npm run kostnad -- [minuter]: datortiden per system i TAKTER och per aktivitet (steg 10.2.14, "Klockan och slagen" i fliken
// Läget). De sparade testbyarna (test/facit-byar/) stegas [minuter] minuter i spelet (120 om inget anges) som spelet gör det,
// slag för slag (nastaSteg), och tiden per rad skrivs ut, dyrast först, i ms per minut i spelet och by och som andel av allt.
// Fasens kodgenomgång går igenom listan uppifrån tills resten tillsammans tar mindre än en tiondel.
import './utc';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { nastaSteg, step } from '../sim';
import { KOSTNAD, kostNoll } from '../sim/kostnad';
import { lasBy } from './delby';

const DIR = fileURLToPath(new URL('../../test/facit-byar/', import.meta.url));
const minuter = Number(process.argv[2]) || 120;
const byar = readdirSync(DIR).filter(f => f.endsWith('.json.gz')).sort().map(f => lasBy(DIR + f));
kostNoll(); KOSTNAD.pa = true;
let slag = 0;
const t0 = performance.now();
for (const s of byar) { const slut = s.now + minuter * 60000; while (s.now < slut) { step(s, nastaSteg(s)); slag++; } }
const allt = performance.now() - t0;
KOSTNAD.pa = false;
const per = (ms: number) => ms / minuter / byar.length;
// systemen och aktiviteterna (raden aktiviteterna är summan av aktiviteterna och visas inte för sig)
const rader = [...KOSTNAD.ms].filter(([k]) => k !== 'aktiviteterna').sort((a, b) => b[1] - a[1]);
const summa = rader.reduce((a, [, v]) => a + v, 0);
console.log(`${byar.length} byar i ${minuter} minuter i spelet, ${slag} slag (${(slag / byar.length / minuter).toFixed(1)} per minut och by). Datorns tid: ${(allt / 1000).toFixed(1)} s, ${per(allt).toFixed(1)} ms per minut i spelet och by.`);
console.log('rad\tms per min och by\tandel\tanrop\tsumma av resten');
let kvar = summa;
for (const [k, v] of rader) {
  console.log(`${k}\t${per(v).toFixed(2)}\t${(100 * v / summa).toFixed(1)} %\t${KOSTNAD.n.get(k) ?? 0}\t${(100 * kvar / summa).toFixed(0)} %`);
  kvar -= v;
}
