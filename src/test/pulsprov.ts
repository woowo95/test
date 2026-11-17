// Provet för pulsen (scenariot processgrupp, testkedjan efter v530): en by som räknar slag i spelet en stund och sedan antingen
// hänger sig (hang: en evig slinga utan slag) eller blir klar (langsam: slag i mer än den korta tiden för en hängd process)
//   node --import tsx src/test/pulsprov.ts hang|langsam <sekunder>
import { createState, step } from '../sim';
import { START } from './kor';

const [lage, sek] = [process.argv[2], Number(process.argv[3] ?? 10)];
const s = createState(5, START), t0 = Date.now();
if (lage === 'hang') { step(s, 600); for (;;) { /* hänger sig: inga fler slag */ } }
while (Date.now() - t0 < sek * 1000) step(s, 60);
console.log('klar');
