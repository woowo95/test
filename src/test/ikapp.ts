// npm run ikapp -- [dygn] [fil]: hur lång tid ikappräkningen tar (steg 10.2.108, Gränsen för ikappräkningen i fliken Läget).
// En sparad testby (test/facit-byar/) med närmast MAL invånare räknas [dygn] dygn framåt (7 om inget anges: en vecka borta,
// sju år i spelet) som spelet räknar ikapp (step med nastaSteg, som catchUp i ui/spara.ts), och datorns tid skrivs ut per dygn
// och för hela veckan. Över GRANS_MIN minuter för en vecka larmar den. Sist de dyraste delarna (KOSTNAD, som npm run kostnad).
// Inget i spelet ändras.
import './utc';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DAY, living, nastaSteg, step, storStridNu } from '../sim';
import { KOSTNAD, kostNoll } from '../sim/kostnad';
import { lasBy } from './delby';

const DIR = fileURLToPath(new URL('../../test/facit-byar/', import.meta.url));
const MAL = 20, GRANS_MIN = 3, VECKA = 7;
const dygn = Number(process.argv[2]) || VECKA, valdFil = process.argv[3];
const filer = valdFil ? [valdFil] : readdirSync(DIR).filter(f => f.endsWith('.json.gz'));
const byar = filer.map(f => ({ f, n: living(lasBy(DIR + f)).length })).sort((a, b) => Math.abs(a.n - MAL) - Math.abs(b.n - MAL));
const { f } = byar[0]!, s = lasBy(DIR + f);
console.log(`By ${f.replace('.json.gz', '')} med ${living(s).length} invånare räknas ${dygn} dygn framåt (${dygn} år i spelet).`);

KOSTNAD.pa = true; kostNoll();
const t0 = performance.now(), mal = s.now + dygn * DAY;
let nasta = s.now + DAY, d = 1, strid = 0;
while (s.now < mal) {
  if (storStridNu(s)) strid++; // spelet visar en stor strid i levande läge; här räknas den vidare
  step(s, nastaSteg(s));
  if (s.now >= nasta) { console.log(`  dygn ${d}: ${((performance.now() - t0) / 1000).toFixed(0)} s, ${living(s).length} invånare`); nasta += DAY; d++; }
}
KOSTNAD.pa = false;
const ms = performance.now() - t0, vecka = ms * VECKA / dygn;
console.log(`Datorns tid: ${(ms / 1000).toFixed(0)} s för ${dygn} dygn; en vecka borta tar ${(vecka / 60000).toFixed(1)} min (gränsen ${GRANS_MIN} min).${strid ? ` (${strid} slag med en stor strid)` : ''}`);
const rader = [...KOSTNAD.ms].sort((a, b) => b[1] - a[1]), sum = rader.reduce((a, r) => a + r[1], 0);
console.log('De dyraste delarna:');
for (const [namn, t] of rader.slice(0, 12)) console.log(`  ${namn}\t${(t / 1000).toFixed(1)} s\t${(t / sum * 100).toFixed(1)} %`);
if (vecka > GRANS_MIN * 60000) { console.log(`IKAPP: en vecka tar ${(vecka / 60000).toFixed(1)} min, mer än gränsen ${GRANS_MIN} min (datorns tid).`); process.exitCode = 1; }
