// npm run talen [-- system]: alla balanstal (balans() i src/sim/balans.ts), per system, med värdet som gäller nu.
// Ett annat värde prövas med miljövariabeln BALANS före ett testkommando, t.ex. BALANS="val.fryser=0.3" npm run balans.
// jamfor har ännu inget --satt: där gäller BALANS båda versionerna, så den jämför inte med och utan.
import { balansTal, okandaBalans } from '../sim';

const bara = process.argv[2];
const alla = balansTal();
const system = Object.keys(alla).sort().filter(k => !bara || k === bara);
if (!system.length) console.log(bara ? `Inget system heter '${bara}'. Systemen: ${Object.keys(alla).sort().join(', ')}` : 'Inga balanstal ännu.');
for (const k of system) {
  console.log(k);
  for (const [n, v] of Object.entries(alla[k])) console.log(`  ${(k + '.' + n).padEnd(32)} ${Array.isArray(v) ? v.join('/') : v}`);
}
const okanda = okandaBalans();
if (okanda.length) console.log(`\nBALANS nämner tal som inte finns: ${okanda.join(', ')}`);
