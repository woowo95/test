// npm run balans -- [antal byar = 20] [dygn = 90]
// Kör många slumpade byar parallellt och visar median, sämsta och bästa värde för varje nyckeltal.
import { korSkript, pool, sistaJson } from './pool';
import type { Nyckeltal } from './kor';

const [antal = 20, dagar = 90] = process.argv.slice(2).map(Number);
const seeds = Array.from({ length: antal }, (_, i) => 1001 + i * 7919);
type Ut = { seed: number; n: Nyckeltal; vakter: string[] };

const t0 = Date.now();
const res = await pool(seeds.map(seed => async () => {
  const u = await korSkript('en.ts', [String(seed), String(dagar)]);
  if (u.code) throw new Error(`by ${seed}: ${u.err.slice(-500)}`);
  return sistaJson<Ut>(u);
}));

const NAMN: [keyof Nyckeltal, string][] = [['pop', 'invånare'], ['invandrade', 'invandrade'], ['utvandrade', 'utvandrade'], ['fodda', 'födda'], ['doda', 'döda'], ['svalt', 'svalt ihjäl'], ['kyla', 'frös ihjäl'],
  ['hunger', 'hungertimmar'], ['humor', 'humör'], ['vintermat', 'mat efter vintern'], ['vinterved', 'ved efter vintern'], ['eld', 'eld brann %'], ['ms', 'körtid ms']];
console.log(`${antal} byar, ${dagar} dygn (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
console.log('                     median   sämst    bäst');
for (const [k, namn] of NAMN) {
  const v = res.map(r => r.n[k]).sort((a, b) => a - b);
  const med = v[Math.floor(v.length / 2)];
  const hogBra = !['doda', 'svalt', 'kyla', 'hunger', 'ms'].includes(k);
  const f = (x: number) => (k === 'humor' ? x.toFixed(2) : String(Math.round(x))).padStart(8);
  console.log(namn.padEnd(20) + f(med) + f(hogBra ? v[0] : v[v.length - 1]) + f(hogBra ? v[v.length - 1] : v[0]));
}
const utdoda = res.filter(r => r.n.atergrundad > 0).map(r => `${r.seed}: ${r.n.atergrundad} ggr`);
console.log(`utdöda och återgrundade byar: ${utdoda.length}${utdoda.length ? ' (' + utdoda.join(', ') + ')' : ''}, under 6 invånare: ${res.filter(r => r.n.pop < 6).length}`);
const vakter = res.flatMap(r => r.vakter.map(v => `by ${r.seed}: ${v}`));
console.log(vakter.length ? 'VAKTER LARMAR:\n  ' + vakter.join('\n  ') : 'Vakter: inga fel.');
