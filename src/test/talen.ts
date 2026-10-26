// npm run talen [-- filter …]: alla balanstal (balans() i src/sim/balans.ts), per system, med värdet som gäller nu.
// Med filter visas bara det som matchar: ett filter som är namnet på ett system visar hela systemet, och annars visas de tal
// vars fulla namn (system.namn) innehåller filtret, utan hänsyn till stora och små bokstäver. T.ex. `npm run talen -- val`
// (systemet val) eller `npm run talen -- fryser eld.slockna` (alla tal om att frysa och när elden slocknar).
// Ett annat värde prövas med miljövariabeln BALANS före ett testkommando, t.ex. BALANS="kropp.fryser=0.3" npm run balans,
// och jämförs by för by med npm run jamfor -- --satt kropp.fryser=0.3 (flera värden: --svep kropp.fryser=0.25/0.3/0.4).
import { balansTal, okandaBalans } from '../sim';

const filter = process.argv.slice(2).map(f => f.toLowerCase());
const alla = balansTal();
const system = new Set(Object.keys(alla).map(k => k.toLowerCase()));
const passar = (k: string, n: string) => filter.some(f => system.has(f) ? f === k.toLowerCase() : (k + '.' + n).toLowerCase().includes(f));
let visade = 0;
for (const k of Object.keys(alla).sort()) {
  const rader = Object.entries(alla[k]).filter(([n]) => !filter.length || passar(k, n));
  if (!rader.length) continue;
  console.log(k);
  for (const [n, v] of rader) console.log(`  ${(k + '.' + n).padEnd(32)} ${Array.isArray(v) ? v.join('/') : v}`);
  visade += rader.length;
}
if (!visade) console.log(filter.length ? `Inget balanstal matchar ${filter.join(', ')}. Systemen: ${Object.keys(alla).sort().join(', ')}` : 'Inga balanstal ännu.');
const okanda = okandaBalans();
if (okanda.length) console.log(`\nBALANS nämner tal som inte finns: ${okanda.join(', ')}`);
