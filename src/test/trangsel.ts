// npm run trangsel -- [antal byar = 8] [dygn = 10]
// Trängseln (steg B.8): var byborna står tätt i onödan, alltså inom en ruta från någon annan utan att göra samma sak på samma
// ställe. Per handling och per plats: hur stor del av tiden den som gör det har någon tätt inpå sig
import './utc';
import { korJson, pool, seedAv, sek } from './pool';
const [antal = 8, dagar = 10] = process.argv.slice(2).map(Number);
type Ut = { seed: number; pop: number; per: Record<string, { n: number; tatt: number }>; plats: Record<string, { n: number; tatt: number }>; vakter: number };
const t0 = Date.now();
const rs = await pool(Array.from({ length: antal }, (_, i) => seedAv(i)).map(seed => () => korJson<Ut>('trangsel-en.ts', [String(seed), String(dagar)], `by ${seed}`)));
console.log(`${antal} byar, ${dagar} dygn (${dagar} år i spelet), ${sek(t0)} s datorns tid`);
const sum = (f: (r: Ut) => Record<string, { n: number; tatt: number }>) => {
  const a: Record<string, { n: number; tatt: number }> = {};
  for (const r of rs) for (const [k, v] of Object.entries(f(r))) { const x = a[k] ??= { n: 0, tatt: 0 }; x.n += v.n; x.tatt += v.tatt; }
  return Object.entries(a).sort((x, y) => y[1].tatt - x[1].tatt);
};
const allt = sum(r => r.plats).reduce((a, [, v]) => ({ n: a.n + v.n, tatt: a.tatt + v.tatt }), { n: 0, tatt: 0 });
console.log(`\nAlla: ${(100 * allt.tatt / Math.max(1, allt.n)).toFixed(1)} % av tiden har någon tätt inpå sig (${allt.tatt} av ${allt.n} prov)`);
console.log('\nPLATSEN          tätt   andel av tiden   andel av all trängsel');
for (const [k, v] of sum(r => r.plats)) console.log(k.padEnd(16) + String(v.tatt).padStart(5) + `${(100 * v.tatt / v.n).toFixed(1)} %`.padStart(17) + `${(100 * v.tatt / Math.max(1, allt.tatt)).toFixed(1)} %`.padStart(24));
console.log('\nHANDLINGEN       tätt   andel av tiden   andel av all trängsel');
for (const [k, v] of sum(r => r.per).slice(0, 25)) if (v.tatt) console.log(k.padEnd(16) + String(v.tatt).padStart(5) + `${(100 * v.tatt / v.n).toFixed(1)} %`.padStart(17) + `${(100 * v.tatt / Math.max(1, allt.tatt)).toFixed(1)} %`.padStart(24));
const v = rs.reduce((a, r) => a + r.vakter, 0);
if (v) console.log(`\nVAKTER: ${v} larm`);
