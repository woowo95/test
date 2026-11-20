// Mätskript (förslag 511): en sparad testby stegas som ikappräkningen gör (step(s, nastaSteg(s))) och datorns tid skrivs ut.
// npx tsx granskning/prestanda/mat-sim.ts [stor|ikapp] [dygn]
//   stor  = byn 1511-40 i 2 dygn (2 år i spelet), ikapp = byn 1-35 i 2 dygn
import '../../src/test/utc';
import { fileURLToPath } from 'node:url';
import { STRID, kartStrider, nastaSteg, step } from '../../src/sim';
import { lasBy } from '../../src/test/delby';

const fall = process.argv[2] ?? 'stor', dygn = Number(process.argv[3]) || 2;
const fil = fall === 'stor' ? '1511-40' : '1-35';
const s = lasBy(fileURLToPath(new URL(`../../test/facit-byar/${fil}.json.gz`, import.meta.url)));
const slut = s.now + dygn * 86400e3, b0 = s.stat?.brottningar ?? 0;
let slag = 0, korta = 0, kortaLek = 0;
const t0 = performance.now();
while (s.now < slut) {
  const dt = nastaSteg(s);
  if (dt === STRID.kortSteg) { korta++; if (kartStrider(s).length && kartStrider(s).every(g => g.st.avsikt === 'brottning' || g.st.avsikt === 'lek')) kortaLek++; }
  step(s, dt); slag++;
}
const ms = performance.now() - t0;
console.log(JSON.stringify({ fall, by: fil, dygn, sek: +(ms / 1000).toFixed(2), slag, korta, kortaBaraLekBrottning: kortaLek, brottningar: (s.stat?.brottningar ?? 0) - b0 }));
