// npm run samma: utvecklas byarna exakt som förut? För ombyggnader som inte ska ändra något i spelet.
// Tre byar: två i 30 dygn och en i 2 dygn. Hela byns tillstånd jämförs med test/samma.json.
// npm run samma -- --spara sparar dagens utfall när en ändring i spelet är avsiktlig (görs också av npm run facit).
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BEAT, createState, serialize, step } from '../sim';
import { START } from './kor';
import { korSkript } from './pool';

const BYAR: [seed: number, dygn: number][] = [[42, 30], [1, 30], [3, 2]];
const FIL = fileURLToPath(new URL('../../test/samma.json', import.meta.url));
const namn = ([seed, dygn]: (typeof BYAR)[number]) => `by ${seed}, ${dygn} dygn`;

const i = process.argv.indexOf('--by');
if (i >= 0) { // en by i en egen process
  const [seed, dygn] = BYAR[Number(process.argv[i + 1])], dt = BEAT;
  const s = createState(seed, START);
  for (let k = 0; k < dygn * 86400 / dt; k++) step(s, dt);
  console.log(createHash('md5').update(serialize(s)).digest('hex').slice(0, 12));
} else {
  const t0 = Date.now();
  const nu = (await Promise.all(BYAR.map((_, k) => korSkript('samma.ts', ['--by', String(k)])))).map(u => u.out.trim() || 'KRASCH: ' + u.err.slice(-300));
  if (process.argv.includes('--spara')) { writeFileSync(FIL, JSON.stringify(nu) + '\n'); console.log('Sparat.'); }
  else {
    let forr: string[] = [];
    try { forr = JSON.parse(readFileSync(FIL, 'utf8')); } catch { /* inget sparat ännu */ }
    const olika = BYAR.map((b, k) => nu[k] === forr[k] ? '' : `${namn(b)}: ${forr[k] ?? '–'} → ${nu[k]}`).filter(x => x);
    console.log(olika.length ? `ANNAN UTVECKLING:\n${olika.join('\n')}` : 'Samma utveckling som förut.');
    if (olika.length) process.exitCode = 1;
  }
  console.log(`(${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
