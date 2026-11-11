// npm run kortsteg -- [minuter]: vad korta slag kostar (steg 10.1.1 och 10.2.13, "Klockan och slagen" i designdokumentet).
// Samma sparade testbyar (test/facit-byar/) stegas i [minuter] minuter (10 om inget anges) med olika slaglängd, och datorns
// tid per minut i spelet skrivs ut. Sedan vad varje del av slaget kostar (KOSTNAD i kostnad.ts) vid några längder, och en
// uppskattning av vad slaget kostar när bara det som rör sig räknas varje slag och resten på en glesare tid (GLES sekunder).
// Inget i spelet ändras: mätningen visar vad det kostar.
import './utc';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cloneState, living, step } from '../sim';
import { KOSTNAD, kostNoll } from '../sim/kostnad';
import { lasBy } from './delby';

const DIR = fileURLToPath(new URL('../../test/facit-byar/', import.meta.url));
const minuter = Number(process.argv[2]) || 10, STEG = [300, 60, 30, 10, 5, 2, 1, 0.5, 0.25], DELAR = [60, 10, 2, 1], GLES = 60;
// det som rör sig och möts räknas varje slag; resten kan gå glesare
const VARJE = (namn: string) => namn.startsWith('aktivitet') || namn === 'samtalen' || namn === 'striden och gästerna' || namn === 'rummen och åldern';
const filer = readdirSync(DIR).filter(f => f.endsWith('.json.gz')).sort();
const byar = filer.map(f => { const s = lasBy(DIR + f); for (let i = 0; i < 12; i++) step(s, 300); return { namn: f.replace('.json.gz', ''), s }; }); // en timme först, så att allt är uppvärmt
const kor = (s0: ReturnType<typeof lasBy>, d: number) => { const s = cloneState(s0), n = Math.round(minuter * 60 / d), t0 = performance.now(); for (let k = 0; k < n; k++) step(s, d); return performance.now() - t0; };

console.log(`Datorns tid (ms) för ${minuter} minuter i spelet, per slaglängd; inom parentes ms per minut i spelet.`);
console.log(['by', 'folk', ...STEG.map(d => `${d} s`)].join('\t'));
const summa = STEG.map(() => 0);
for (const b of byar) {
  const rad = STEG.map((d, i) => { const ms = kor(b.s, d); summa[i] += ms; return `${ms.toFixed(0)} (${(ms / minuter).toFixed(1)})`; });
  console.log([b.namn, living(b.s).length, ...rad].join('\t'));
}
const perMin = summa.map(ms => ms / minuter / byar.length);
console.log(['medel', '', ...perMin.map(x => x.toFixed(1))].join('\t'));

// vad varje del kostar, i ms per minut i spelet och by
const delar = new Map<number, Map<string, number>>();
KOSTNAD.pa = true;
for (const d of DELAR) {
  kostNoll();
  for (const b of byar) kor(b.s, d);
  delar.set(d, new Map([...KOSTNAD.ms].map(([k, v]) => [k, v / minuter / byar.length])));
}
KOSTNAD.pa = false;
const namn = [...delar.get(DELAR[DELAR.length - 1])!].sort((a, b) => b[1] - a[1]).map(x => x[0]);
for (const n of delar.get(DELAR[0])!.keys()) if (!namn.includes(n)) namn.push(n);
console.log(`\nVad delarna kostar (ms per minut i spelet och by), dyrast vid ${DELAR[DELAR.length - 1]} s först. * = räknas varje slag i uppskattningen`);
console.log(['del', ...DELAR.map(d => `${d} s`)].join('\t'));
for (const n of namn) console.log([(VARJE(n) ? '* ' : '  ') + n, ...DELAR.map(d => (delar.get(d)!.get(n) ?? 0).toFixed(2))].join('\t'));
// uppskattning: det med * som det är vid slaget d, resten som vid slag om GLES sekunder (samma kostnad per minut som då)
console.log(`\nUppskattning när bara det med * räknas varje slag och resten var ${GLES}:e sekund (ms per minut i spelet och by):`);
const gles = new Map<number, number>();
for (const d of DELAR) {
  let sum = 0;
  for (const [n, v] of delar.get(d)!) sum += VARJE(n) ? v : (delar.get(GLES)?.get(n) ?? v);
  gles.set(d, sum);
  console.log(`  ${d} s: ${sum.toFixed(1)}`);
}
// ikappräkningen efter en vecka borta och testerna, skalade efter kostnaden mot slag om 300 s
const vecka = 7 * 24 * 60, bas = perMin[0];
console.log(`\nIkappräkningen efter en vecka borta (sju dygn, sju år i spelet) för en by som testbyarna, datorns tid:`);
const tid = (ms: number) => ms < 60000 ? `${(ms / 1000).toFixed(0)} s` : ms < 3600000 ? `${(ms / 60000).toFixed(1)} min` : `${(ms / 3600000).toFixed(1)} h`;
STEG.forEach((d, i) => console.log(`  ${d} s som i dag: ${tid(perMin[i] * vecka)}${gles.has(d) ? `, glest: ${tid(gles.get(d)! * vecka)}` : ''}  (×${(perMin[i] / bas).toFixed(1)} mot 300 s)`));
