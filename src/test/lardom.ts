// npm run lardom -- [byar] [dygn] (8 byar i 20 dygn om inget anges): gör lärdomarna om var saker finns skillnad? (steg 10.2.64)
// Samma byar med och utan dem (BALANS="minne.platser=0"), och medianen per by av var och hur mycket de samlar, jagar och fiskar
import './utc';
import { korSkript, pool } from './pool';

const byar = Number(process.argv[2]) || 8, dygn = Number(process.argv[3]) || 20;
type Rad = Record<string, number>;
const kor = (seed: number, utan: boolean) => async () => {
  const u = await korSkript('lardom-en.ts', [String(seed), String(dygn)], utan ? { BALANS: 'minne.platser=0' } : {});
  return JSON.parse(u.out.trim().split('\n').pop()!) as Rad;
};
const seeds = Array.from({ length: byar }, (_, i) => 1001 + i * 7919);
const svar = await pool([...seeds.map(s => kor(s, false)), ...seeds.map(s => kor(s, true))]);
const med = (l: number[]) => { const v = l.slice().sort((a, b) => a - b); return v.length % 2 ? v[(v.length - 1) / 2]! : (v[v.length / 2 - 1]! + v[v.length / 2]!) / 2; };
const med1 = svar.slice(0, byar), utan = svar.slice(byar);
console.log(`${byar} byar i ${dygn} dygn (${dygn} år i spelet), median per by, med lärdomarna / utan:`);
for (const k of Object.keys(med1[0]!).filter(k => k !== 'seed')) {
  const a = med(med1.map(r => r[k]!)), b = med(utan.map(r => r[k]!));
  const per = k.endsWith('Ger') ? ` (per timme ${(a / Math.max(1, med(med1.map(r => r[k.replace('Ger', 'Tim')]!)))).toFixed(1)} / ${(b / Math.max(1, med(utan.map(r => r[k.replace('Ger', 'Tim')]!)))).toFixed(1)})` : '';
  console.log(`  ${k.padEnd(10)} ${a.toFixed(1).padStart(8)} / ${b.toFixed(1).padStart(8)}${per}`);
}
