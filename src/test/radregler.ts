// npm run radregler -- [byar] (byarna i test/radfacit.json om inget anges): radens regler körs från samma start som testbyarna
// och skrivs ut bredvid facit (steg 11.3.14, Flera samhällen: Raden mäts mot testbyarna). Varje frö i facit får en värld utan
// förhistoria; varje levande by i den börjar som en nygrundad by (folket som testbyarna efter ett dygn, startmaten, ingen
// rikedom, nivå 1 av teknikerna och ingen tro), och världen går lika många dygn som facit. Medianen och fjärdedelarna per dygn (ett
// år i spelet) för byarna som fanns från början, samma tal som facit: folk, mat i dygn, rikedom per person, tekniker per nivå,
// andelen med en tro och andelen som dött ut.
import './utc';
import { readFileSync } from 'node:fs';
process.env.BALANS = [process.env.BALANS, 'forhist.ar=0'].filter(Boolean).join(',');
const SIM = await import('../sim');

type Kv = [number, number, number];
interface Per { dygn: number; folk: Kv; matDygn: Kv; rikPer: Kv; tek: Record<string, Kv>; tro: Kv; dott: number }
const facit = JSON.parse(readFileSync(new URL('../../test/radfacit.json', import.meta.url), 'utf8')) as { byar: number; dygn: number; seeds: number[]; per: Per[] };
const seeds = facit.seeds.slice(0, Number(process.argv[2]) || facit.seeds.length), dygn = facit.dygn;
const kv = (l: number[]): Kv => {
  const v = l.slice().sort((a, b) => a - b);
  if (!v.length) return [0, 0, 0];
  const q = (f: number) => { const i = f * (v.length - 1), a = Math.floor(i); return v[a]! + (v[Math.min(a + 1, v.length - 1)]! - v[a]!) * (i - a); };
  return [q(0.25), q(0.5), q(0.75)].map(x => Math.round(x * 100) / 100) as Kv;
};
interface Matt { folk: number; matDygn: number; rikPer: number; tek: Record<number, number>; tro: number; dott: number }
const per: Matt[][] = Array.from({ length: dygn }, () => []);
const startFolk = facit.per[0]!.folk[1];
for (const seed of seeds) {
  const s = SIM.createState(seed, Date.UTC(2026, 0, 1)), vl = s.varld!;
  const egna = vl.rader!.filter(r => SIM.lever(vl, r) && r.sort === 'by');
  for (const r of egna) {
    r.grundad = s.now; r.tal.folk = startFolk; r.tal.mat = SIM.radKrok.startMat(startFolk); r.tal.rikedom = 0; r.tal.styrka = 0;
    r.tek = SIM.startTek(); delete r.tro; delete r.svalt;
  }
  const dott = new Set<number>();
  for (let d = 0; d < dygn; d++) {
    SIM.varldTill(s, s.now += SIM.DAY);
    for (const r of egna) {
      if (!SIM.lever(vl, r)) dott.add(r.nr);
      if (dott.has(r.nr)) { per[d]!.push({ folk: 0, matDygn: 0, rikPer: 0, tek: {}, tro: 0, dott: 1 }); continue; }
      const tek: Record<number, number> = {};
      for (const id of r.tek) { const n = SIM.TEK[id]?.niva; if (n) tek[n] = (tek[n] ?? 0) + 1; }
      per[d]!.push({ folk: r.tal.folk, matDygn: SIM.matDygn(r), rikPer: r.tal.rikedom / Math.max(1, r.tal.folk), tek, tro: ((r.tro?.andel ?? 0) + (r.tro?.annan?.andel ?? 0)) / 100, dott: 0 });
    }
  }
}
const f = (t: Kv, d = 0) => `${t[1].toFixed(d)} (${t[0].toFixed(d)}–${t[2].toFixed(d)})`;
const nivaer = Object.keys(facit.per[0]!.tek).map(Number);
console.log(`radens regler i ${seeds.length} världar (${per[0]!.length} byar) i ${dygn} dygn (${dygn} år i spelet), bredvid facit (testbyarna, test/radfacit.json); median (fjärdedelarna), de levande byarna`);
console.log('dygn       folk            mat i dygn        rikedom/person      tekniker per nivå           tro              dött ut');
for (let d = 0; d < dygn; d++) {
  if (!(d === 0 || (d + 1) % 5 === 0 || d === dygn - 1)) continue;
  const l = per[d]!, lev = l.filter(x => !x.dott), fp = facit.per[d]!;
  const rad: Per = { dygn: d + 1, folk: kv(lev.map(x => x.folk)), matDygn: kv(lev.map(x => x.matDygn)), rikPer: kv(lev.map(x => x.rikPer)), tek: Object.fromEntries(nivaer.map(n => [n, kv(lev.map(x => x.tek[n] ?? 0))])), tro: kv(lev.map(x => x.tro)), dott: l.filter(x => x.dott).length / Math.max(1, l.length) };
  for (const [namn, p] of [['facit', fp], ['raden', rad]] as const)
    console.log(`${String(d + 1).padStart(4)} ${namn}  ${f(p.folk).padEnd(15)} ${f(p.matDygn, 1).padEnd(17)} ${f(p.rikPer).padEnd(19)} ${nivaer.map(n => `${n}:${p.tek[n]![1]}`).join(' ').padEnd(27)} ${f(p.tro, 2).padEnd(16)} ${Math.round(p.dott * 100)} %`);
}
