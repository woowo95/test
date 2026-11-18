// npm run vacktmatt -- [världar] (8 om inget anges, några sekunder datortid): mätverktyget för den väckta byn (steg 11.13.3,
// Flera samhällen: Den väckta byn i tal). Varje levande by i världarna väcks (vackBy i vackt.ts), och den byggda byn ställs
// bredvid sin rad och bredvid testbyarna i samma storlek (test/radfacit.json: medianen det dygn då testbyarnas folk ligger
// närmast): folk, mat i dygn, rikedom per person, tekniker, hus (radens hus är deras värde) och relationer per person. Sist datortiden för ett bygge.
import './utc';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import type { State } from '../sim';
const SIM = await import('../sim');

type Kv = [number, number, number];
interface Per { dygn: number; folk: Kv; matDygn: Kv; rikPer: Kv; tek: Record<string, Kv> }
const facit = JSON.parse(readFileSync(new URL('../../test/radfacit.json', import.meta.url), 'utf8')) as { seeds: number[]; per: Per[] };
const varldar = Number(process.argv[2]) || 8;
const r1 = (v: number) => Math.round(v * 10) / 10;
// testbyarnas median det dygn då folket ligger närmast n
const testby = (n: number) => facit.per.reduce((b, p) => Math.abs(p.folk[1] - n) < Math.abs(b.folk[1] - n) ? p : b);
interface Matt { folk: number; matDygn: number; rikPer: number; tek: number; hus: number; rel: number }
function matt(b: State): Matt {
  const tal = SIM.lasRad(b), kan = new Set<string>();
  for (const p of b.people) for (const id in p.tek ?? {}) if ((p.tek![id] ?? 0) >= 1) kan.add(id);
  return { folk: tal.folk, matDygn: SIM.foodDays(b), rikPer: tal.rikedom / Math.max(1, tal.folk), tek: kan.size, hus: (b.hus ?? []).length, rel: Object.keys(b.rels).length / Math.max(1, tal.folk) };
}
const rader: string[][] = [['värld', 'by', 'folk', 'mat dygn', 'rik/pers', 'tekniker', 'hus', 'rel/pers', 'ms']];
const tider: number[] = [];
for (const seed of facit.seeds.slice(0, varldar)) {
  const s = SIM.createState(seed, Date.UTC(2026, 0, 1)), vl = s.varld!;
  for (const r of vl.rader!.filter(q => q.sort === 'by' && SIM.lever(vl, q))) {
    const t0 = performance.now(), b = SIM.vackBy(s, r.nr)!, ms = performance.now() - t0;
    tider.push(ms);
    const m = matt(b), f = testby(r.tal.folk), ftek = Object.values(f.tek).reduce((a, k) => a + k[1], 0);
    const v = (byggd: number, rad: number | string, test: number | string) => `${r1(byggd)} (${rad} | ${test})`;
    rader.push([String(seed), r.namn, v(m.folk, r.tal.folk, f.folk[1]), v(m.matDygn, r1(SIM.matDygn(r)), f.matDygn[1]), v(m.rikPer, r1(r.tal.rikedom / Math.max(1, r.tal.folk)), f.rikPer[1]), v(m.tek, r.tek.length, r1(ftek)), v(m.hus, r.hus ?? '–', '–'), String(r1(m.rel)), String(Math.round(ms))]);
  }
}
const bredd = rader[0].map((_, i) => Math.max(...rader.map(r => r[i].length)));
console.log('byggd (raden | testbyarna i samma storlek); hus: antal (husens värde i raden)\n');
for (const r of rader) console.log(r.map((c, i) => c.padEnd(bredd[i])).join('  '));
tider.sort((a, b) => a - b);
console.log(`\n${tider.length} byar väckta: median ${Math.round(tider[tider.length >> 1] ?? 0)} ms, längst ${Math.round(tider[tider.length - 1] ?? 0)} ms per bygge`);
