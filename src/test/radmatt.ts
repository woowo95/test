// npm run radmatt -- [byar] [dygn] (16 byar i 35 dygn om inget anges): raden mäts mot testbyarna (steg 11.2.10, Flera samhällen:
// Raden mäts mot testbyarna). Många testbyar sammanfattas med RADTAL en gång per dygn (ett år i spelet), och medianen och
// fjärdedelarna per ålder (byns dygn) för folk, mat i dygn, rikedom per person, antal tekniker per nivå, andelen med en tro och
// andelen som dött ut sparas i test/radfacit.json, facit för radens regler (RAD, fas 11.3). Radens regler körs från samma start och
// skrivs ut bredvid med npm run radregler (radregler.ts, steg 11.3.14).
import './utc';
import { writeFileSync } from 'node:fs';
import { korJson, pool } from './pool';
import type { RadMatt } from './radmatt-en';

const byar = Number(process.argv[2]) || 16, dygn = Number(process.argv[3]) || 35;
const seeds = Array.from({ length: byar }, (_, i) => 1001 + i * 7919);
const svar = await pool(seeds.map(seed => () => korJson<{ seed: number; dygn: RadMatt[] }>('radmatt-en.ts', [String(seed), String(dygn)], `by ${seed}`)));
// fjärdedelarna: [nedre, median, övre]
const kv = (l: number[]): [number, number, number] => {
  const v = l.slice().sort((a, b) => a - b), q = (f: number) => { const i = f * (v.length - 1), a = Math.floor(i); return v[a]! + (v[Math.min(a + 1, v.length - 1)]! - v[a]!) * (i - a); };
  return [q(0.25), q(0.5), q(0.75)].map(x => Math.round(x * 100) / 100) as [number, number, number];
};
const nivaer = [...new Set(svar.flatMap(b => b.dygn.flatMap(d => Object.keys(d.tek).map(Number))))].sort((a, b) => a - b);
const per = Array.from({ length: dygn }, (_, d) => {
  const r = svar.map(b => b.dygn[d]).filter((x): x is RadMatt => !!x);
  return {
    dygn: d + 1,
    folk: kv(r.map(x => x.folk)), matDygn: kv(r.map(x => x.matDygn)), rikPer: kv(r.map(x => x.rikPer)),
    tek: Object.fromEntries(nivaer.map(n => [n, kv(r.map(x => x.tek[n] ?? 0))])),
    tro: kv(r.map(x => x.tro)), dott: Math.round(r.reduce((a, x) => a + x.dott, 0) / Math.max(1, r.length) * 100) / 100,
  };
});
writeFileSync(new URL('../../test/radfacit.json', import.meta.url), JSON.stringify({ byar, dygn, seeds, per }, null, 1) + '\n');
const f = (t: [number, number, number], d = 0) => `${t[1].toFixed(d)} (${t[0].toFixed(d)}–${t[2].toFixed(d)})`;
console.log(`${byar} byar i ${dygn} dygn (${dygn} år i spelet), median (fjärdedelarna) per dygn; sparat i test/radfacit.json`);
console.log('dygn  folk            mat i dygn      rikedom/person      tekniker per nivå           tro              dött ut');
for (const p of per) if (p.dygn === 1 || p.dygn % 5 === 0 || p.dygn === dygn)
  console.log(`${String(p.dygn).padStart(4)}  ${f(p.folk).padEnd(15)} ${f(p.matDygn, 1).padEnd(15)} ${f(p.rikPer).padEnd(19)} ${nivaer.map(n => `${n}:${p.tek[n]![1]}`).join(' ').padEnd(27)} ${f(p.tro, 2).padEnd(16)} ${Math.round(p.dott * 100)} %`);
