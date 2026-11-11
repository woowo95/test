// npm run kortsteg -- [minuter]: vad korta steg kostar (steg 10.1.1, "Korta steg när faran är nära" i designdokumentet).
// Samma sparade testbyar (test/facit-byar/) stegas i [minuter] minuter (10 om inget anges) med olika steglängd, och datorns
// tid per minut i spelet skrivs ut. Inget i spelet ändras: mätningen visar vad det kostar när hela byn går i korta steg.
import './utc';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cloneState, living, step } from '../sim';
import { lasBy } from './delby';

const DIR = fileURLToPath(new URL('../../test/facit-byar/', import.meta.url));
const minuter = Number(process.argv[2]) || 10, STEG = [300, 10, 5, 2, 1, 0.5];
const filer = readdirSync(DIR).filter(f => f.endsWith('.json.gz')).sort();
console.log(`Datorns tid (ms) för ${minuter} minuter i spelet, per steglängd; inom parentes ms per minut i spelet.`);
console.log(['by', 'folk', ...STEG.map(d => `${d} s`)].join('\t'));
const summa = STEG.map(() => 0);
for (const f of filer) {
  const s0 = lasBy(DIR + f);
  for (let i = 0; i < 12; i++) step(s0, 300); // en timme först, så att allt är uppvärmt och alla har en uppgift
  const rad = STEG.map((d, i) => {
    const s = cloneState(s0), n = Math.round(minuter * 60 / d), t0 = performance.now();
    for (let k = 0; k < n; k++) step(s, d);
    const ms = performance.now() - t0; summa[i] += ms;
    return `${ms.toFixed(0)} (${(ms / minuter).toFixed(1)})`;
  });
  console.log([f.replace('.json.gz', ''), living(s0).length, ...rad].join('\t'));
}
console.log(['summa', '', ...summa.map(ms => `${ms.toFixed(0)} (${(ms / minuter / filer.length).toFixed(1)} per by och minut)`)].join('\t'));
