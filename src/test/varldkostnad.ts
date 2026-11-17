// npm run varldkostnad -- [timmar] (24 timmar om inget anges, ett dygn: ett år i spelet): världens datortid bredvid huvudbyns
// (steg 11.2.18, Flera samhällen: Världens kostnad och lagringen). De sparade testbyarna (test/facit-byar/) får var sin värld
// och stegas [timmar] timmar som spelet gör det. Tiden för varje rad i PERIODRADER och varje sort i kön (KOHANDELSER) mäts per
// period, och världen tillsammans jämförs med byns tid. Över gränsen (VARLDKOSTNAD.andel) larmar kommandot och felkoden blir 1.
// Ikappräkningen från byns grundande till nu (en sparad by som öppnas) mäts för sig.
import './utc';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { KOHANDELSER, PERIODRADER, VARLDKOSTNAD, medVarld, nastaSteg, step, varldSteg } from '../sim';
import { lasBy } from './delby';

const DIR = fileURLToPath(new URL('../../test/facit-byar/', import.meta.url));
const timmar = Number(process.argv[2]) || 24;
const ms = new Map<string, number>(), n = new Map<string, number>();
const mat = (k: string, t0: number) => { ms.set(k, (ms.get(k) ?? 0) + performance.now() - t0); n.set(k, (n.get(k) ?? 0) + 1); };
// varje rad och varje sort i kön mäts för sig
for (const r of PERIODRADER) { const fn = r.fn; r.fn = (s, vl, p) => { const t0 = performance.now(); fn(s, vl, p); mat(`${r.period}: ${r.namn}`, t0); }; }
for (const [k, fn] of Object.entries(KOHANDELSER)) KOHANDELSER[k] = (s, vl, p) => { const t0 = performance.now(); fn(s, vl, p); mat(`kön: ${k}`, t0); };

const byar = readdirSync(DIR).filter(f => f.endsWith('.json.gz')).sort().map(f => lasBy(DIR + f));
let skapa = 0, ikapp = 0;
for (const s of byar) { let t0 = performance.now(); medVarld(s); skapa += performance.now() - t0; t0 = performance.now(); varldSteg(s); ikapp += performance.now() - t0; }
const fore = new Map(ms); ms.clear(); n.clear();
let allt = 0, varld = 0;
for (const s of byar) {
  const slut = s.now + timmar * 3600e3;
  while (s.now < slut) {
    const t0 = performance.now(); step(s, nastaSteg(s)); allt += performance.now() - t0;
    const t1 = performance.now(); varldSteg(s); varld += performance.now() - t1; // redan räknat i steget: bara kontrollen att inget är kvar
  }
}
const rader = [...ms].sort((a, b) => b[1] - a[1]), radSumma = rader.reduce((a, [, v]) => a + v, 0);
const byn = allt - radSumma, andel = byn > 0 ? radSumma / byn : 0;
console.log(`${byar.length} byar i ${timmar} timmar (${(timmar / 24).toFixed(1)} år i spelet). Byns datortid ${(byn / 1000).toFixed(1)} s, världens rader ${radSumma.toFixed(1)} ms (${(100 * andel).toFixed(2)} %, gränsen ${100 * VARLDKOSTNAD.andel} %).`);
console.log(`Världen skapas: ${(skapa / byar.length).toFixed(0)} ms per by. Ikappräkningen från grundandet: ${(ikapp / byar.length).toFixed(1)} ms per by${fore.size ? ` (${[...fore].map(([k, v]) => `${k} ${v.toFixed(1)} ms`).join(', ')})` : ''}.`);
console.log(`Kontrollen efter steget: ${(varld / 1000).toFixed(2)} s.`);
if (!rader.length) console.log('Världen har inga rader som räknas varje period än (PERIODRADER och KOHANDELSER är tomma).');
else {
  console.log('rad\tms per period\tperioder\tandel av byn');
  for (const [k, v] of rader) console.log(`${k}\t${(v / (n.get(k) || 1)).toFixed(3)}\t${n.get(k)}\t${(100 * v / byn).toFixed(2)} %`);
}
if (andel > VARLDKOSTNAD.andel) { console.log(`LARM: världen kostar ${(100 * andel).toFixed(2)} % av byns datortid, över gränsen ${100 * VARLDKOSTNAD.andel} %.`); process.exitCode = 1; }
