// Förbereder byarna för mätningen i webbläsaren: sparade testbyar räknas fram till rätt klockslag och väder
// och sparas som JSON (byns delar, serializeParts) med tiden. Svensk tid, som webbläsaren.
process.env.TZ = 'Europe/Stockholm';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { living, ageIndex, hourOf, vaderNu, HOUR, nastaSteg, step, serializeParts, snoPaMarken, lightLevel } from '../../../src/sim';
import { lasBy } from '../../../src/test/delby';
const HAR = dirname(fileURLToPath(import.meta.url));
const SCENER = [
  { namn: 'dag', by: process.env.BY ?? '1511-40', tim: 5 },
  { namn: 'natt', by: '1511-40', tim: 15 },
  { namn: 'regn', by: '1-35', tim: 4.5 },
  { namn: 'sno', by: '1511-25', tim: 4.5 },
  { namn: 'istid', by: '1-25', tim: 5 },
];
const val = process.argv.slice(2);
mkdirSync(resolve(HAR, 'byar'), { recursive: true });
for (const sc of SCENER.filter(s => !val.length || val.includes(s.namn))) {
  const s = lasBy(resolve(HAR, `../../../test/facit-byar/${sc.by}.json.gz`));
  const mal = s.now + sc.tim * HOUR, t0 = performance.now();
  while (s.now < mal) step(s, nastaSteg(s));
  const v = vaderNu(s), txt = JSON.stringify({ t: s.now, delar: serializeParts(s) }); // byns delar som spelet sparar dem i webbläsarens databas (ladda.cjs)
  writeFileSync(resolve(HAR, `byar/${sc.namn}.json`), txt);
  console.log(sc.namn, sc.by, 'inv', living(s).length, 'ai', ageIndex(s), 'kl', hourOf(s.now).toFixed(2), 'ljus', lightLevel(s.now), 'väder', v.lage, v.nb.toFixed(2), 'snö på marken', snoPaMarken(s).toFixed(2), 'KB', (txt.length / 1024).toFixed(0), 'räknad på', ((performance.now() - t0) / 1000).toFixed(1), 's');
}
