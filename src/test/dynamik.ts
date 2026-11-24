// npm run dynamik -- [antal byar = 16] [dygn = 70]
// Hur byarna förändras (steg 13.9.1, Gränserna för balansen: Byarnas förändring): sederna, styret och tron i varje by.
// Spridningen (hur många byar som är mittenbyar i varje område), olikheten (hur mycket två byar skiljer sig i genomsnitt),
// rörelsen (vad som hänt och den längsta tiden utan något) och arbetsdelningen ur timmarna var och en lagt på varje sorts arbete.
import './utc';
import { korJson, pool, seedAv, sek } from './pool';
import { median } from './nyckeltal';

const [antal = 16, dagar = 70] = process.argv.slice(2).map(Number);
const seeds = Array.from({ length: antal }, (_, i) => seedAv(i));
type Omr = 'seder' | 'styre' | 'tro';
const OMR: Omr[] = ['seder', 'styre', 'tro'];
const NAMN: Record<Omr, string> = { seder: 'Sederna', styre: 'Styret', tro: 'Tron' };
type Lage = Record<Omr, number[]>;
type Ut = { seed: number; pop: number; dygn: { d: number; folk: number; tek: number; lage: Lage }[]; handelser: Record<string, number>; langst: Record<Omr, number>; antal: Record<Omr, number>;
  arbete: { flitig: Record<string, number>; vuxna: number; utanMat: number; matPerDygn: number[]; kopMat: number; gavMat: number; handlare: number; varandra: number; bygga: number; hantverk: number };
  vakter: number; larm: string[] };
const MITT = 0.5, GRANS_MITT = 1 / 3, GRANS_TYST = 10; // mittenbyn står inte längre ut än så här; högst en tredjedel får vara det; något händer minst var tionde dygn
const t0 = Date.now();
const rs = await pool(seeds.map(seed => () => korJson<Ut>('dynamik-en.ts', [String(seed), String(dagar)], `by ${seed}`)));
const slut = (r: Ut) => r.dygn.at(-1)!.lage;
const pct = (n: number) => `${Math.round(n * 100)} %`;
console.log(`${antal} byar, ${dagar} dygn (${dagar} år i spelet, ${(dagar / 7).toFixed(0)} veckor i verkligheten), ${sek(t0)} s datorns tid`);

console.log('\nBYARNAS FÖRÄNDRING      mittenbyar   olikhet   händelser per by (median)   längsta tystnad (median / värsta, dygn)');
const fel: string[] = [];
for (const o of OMR) {
  const mitt = rs.filter(r => slut(r)[o].every(v => Math.abs(v) <= MITT)).length / rs.length;
  let sum = 0, par = 0;
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = slut(rs[i]!)[o], b = slut(rs[j]!)[o]; sum += a.reduce((x, v, k) => x + Math.abs(v - (b[k] ?? 0)), 0) / Math.max(1, a.length); par++; }
  const olik = par ? sum / par : 0, tyst = rs.map(r => r.langst[o]), varst = Math.max(...tyst);
  console.log(`${NAMN[o].padEnd(24)}${pct(mitt).padStart(10)}${olik.toFixed(2).padStart(10)}${String(median(rs.map(r => r.antal[o]))).padStart(28)}${`${median(tyst).toFixed(0)} / ${varst.toFixed(0)}`.padStart(38)}`);
  if (mitt > GRANS_MITT) fel.push(`${NAMN[o]}: ${pct(mitt)} av byarna är mittenbyar (högst ${pct(GRANS_MITT)})`);
  if (varst > GRANS_TYST) fel.push(`${NAMN[o]}: ${rs.filter(r => r.langst[o] > GRANS_TYST).length} byar har gått mer än ${GRANS_TYST} dygn utan något (längst ${varst.toFixed(0)})`);
}
console.log('\nHÄNDELSERNA (totalt, byar där det hänt)');
for (const k of [...new Set(rs.flatMap(r => Object.keys(r.handelser)))].sort()) console.log(`  ${k.padEnd(44)}${String(rs.reduce((a, r) => a + (r.handelser[k] ?? 0), 0)).padStart(6)}${`${rs.filter(r => r.handelser[k]).length}/${antal}`.padStart(8)}`);

console.log('\nARBETSDELNINGEN (median per by)');
const med = (fn: (r: Ut) => number) => median(rs.map(fn));
for (const k of [...new Set(rs.flatMap(r => Object.keys(r.arbete.flitig)))].sort()) console.log(`  ${`den flitigaste femtedelens del av ${k}`.padEnd(48)}${pct(med(r => r.arbete.flitig[k] ?? 0)).padStart(6)}`);
console.log(`  ${'vuxna med under en tiondel av timmarna i maten'.padEnd(48)}${`${med(r => r.arbete.utanMat)} av ${med(r => r.arbete.vuxna)}`.padStart(10)}`);
const mat = (r: Ut, d: number) => r.arbete.matPerDygn[Math.min(d, r.arbete.matPerDygn.length - 1)] ?? 0;
console.log(`  matens timmar per invånare och dygn: ${[0, 9, 24, 49, dagar - 1].filter(d => d < dagar).map(d => `dygn ${d + 1}: ${med(r => mat(r, d)).toFixed(1)}`).join(', ')}`);
console.log(`  ${'mat köpt av andra bybor / given (enheter)'.padEnd(48)}${`${med(r => r.arbete.kopMat)} / ${med(r => r.arbete.gavMat)}`.padStart(10)}`);
console.log(`  ${'köpt av handlaren / av varandra (enheter)'.padEnd(48)}${`${med(r => r.arbete.handlare)} / ${med(r => r.arbete.varandra)}`.padStart(10)}`);
console.log(`  ${'timmar i bygget / hantverket'.padEnd(48)}${`${med(r => r.arbete.bygga)} / ${med(r => r.arbete.hantverk)}`.padStart(10)}`);
console.log('\nper by: seed, invånare, tekniker, händelser (seder/styre/tro), längsta tystnad, mittenby');
for (const r of rs) { const d = r.dygn.at(-1)!; console.log(`  by ${String(r.seed).padEnd(6)} ${String(r.pop).padStart(3)} inv ${String(d.tek).padStart(3)} tek  ${OMR.map(o => r.antal[o]).join('/')}  ${OMR.map(o => r.langst[o].toFixed(0)).join('/')} dygn  ${OMR.filter(o => d.lage[o].every(v => Math.abs(v) <= MITT)).map(o => NAMN[o]).join(', ') || '–'}`); }
console.log(fel.length ? '\nGRÄNSERNA BRYTS:\n  ' + fel.join('\n  ') : '\nGränserna för byarnas förändring håller.');
const v = rs.reduce((a, r) => a + r.vakter, 0);
console.log(v ? 'VAKTER LARMAR:\n  ' + rs.flatMap(r => r.larm.map(l => `by ${r.seed}: ${l}`)).join('\n  ') : 'Vakter: inga fel.');
if (fel.length || v) process.exitCode = 1;
