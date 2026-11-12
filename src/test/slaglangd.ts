// Slagets längd ändrar inte byn (steg 10.2.15, "Klockan och slagen (Varningen)" i fliken Läget): samma byar körs med två
// slaglängder (KLOCKA.slag satt med BALANS, i var sin process samtidigt), och antalet händelser av varje slag (byns
// statistik, s.stat) jämförs. Allt räknas per tid, så en händelse som blir mycket vanligare med kortare slag räknas per
// anrop och är ett fel. Används av scenariot slaglangd och npm run slaglangd -- [timmar] [sek] [sek]
import './utc';
import { execFile, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import { step, State } from '../sim';
import { lasBy } from './delby';

export type Skillnad = { namn: string; a: number; b: number };
// det som hänt: summan för alla byar och varje by för sig
export type Kor = { sum: Record<string, number>; byar: Record<string, number>[] };
const FIL = fileURLToPath(import.meta.url), DIR = fileURLToPath(new URL('../../test/facit-byar/', import.meta.url));
const BYAR = readdirSync(DIR).filter(f => f.endsWith('.json.gz')).sort();
// det som hänt i de sparade testbyarna (test/facit-byar/) under timmar i spelet med slaget sek sekunder, i en egen process
export function korMed(timmar: number, sek: number): Promise<Kor> {
  return new Promise((ok, fel) => execFile('npx', ['tsx', FIL, '--kor', String(timmar)], { env: { ...process.env, BALANS: `klocka.slag=${sek}` }, maxBuffer: 1 << 26 },
    (e, ut) => e ? fel(e) : ok(JSON.parse(ut.trim().split('\n').pop()!))));
}
// detsamma utan att vänta (scenariot slaglangd)
export const korMedNu = (timmar: number, sek: number): Kor =>
  JSON.parse(execFileSync('npx', ['tsx', FIL, '--kor', String(timmar)], { env: { ...process.env, BALANS: `klocka.slag=${sek}` }, maxBuffer: 1 << 26 }).toString().trim().split('\n').pop()!);
// händelserna som skiljer sig mycket: minst min gånger i någon av körningarna och mer än faktor gånger fler i den ena, och
// åt samma håll i de flesta byar där det händer (minst BY_MIN gånger). Två slaglängder ger två förlopp: redan efter några
// minuter slutar ett samtal vid olika tid, och sedan väljer någon ett annat arbete. Då kan en enda person i en by ge en
// stor skillnad i summan (veden i by 1 efter v513). Det som räknas per anrop blir vanligare i varje by där det händer
const BY_MIN = 5, BY_KVOT = 1.5;
export function skillnader(ka: Kor, kb: Kor, min = 30, faktor = 2): Skillnad[] {
  const a = ka.sum, b = kb.sum, kvot = (x: number, y: number) => Math.max(x, y) / Math.max(1, Math.min(x, y)), ut: Skillnad[] = [];
  for (const namn of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const d = { namn, a: a[namn] ?? 0, b: b[namn] ?? 0 };
    if (Math.max(d.a, d.b) < min || kvot(d.a, d.b) <= faktor) continue;
    const byar = ka.byar.map((x, i) => ({ a: x[namn] ?? 0, b: kb.byar[i]?.[namn] ?? 0 })).filter(x => Math.max(x.a, x.b) >= BY_MIN);
    const samma = byar.filter(x => (x.b > x.a) === (d.b > d.a) && kvot(x.a, x.b) > BY_KVOT).length;
    if (!byar.length || samma * 2 > byar.length) ut.push(d);
  }
  return ut.sort((p, q) => kvot(q.a, q.b) - kvot(p.a, p.b));
}
const arg = process.argv.slice(2);
if (arg[0] === '--kor') {
  const sum: Record<string, number> = {}, byar: Record<string, number>[] = [];
  for (const f of BYAR) {
    const s: State = lasBy(DIR + f), fore = { ...(s.stat ?? {}) } as Record<string, unknown>, by: Record<string, number> = {};
    for (let i = 0; i < Number(arg[1]) * 12; i++) step(s, 300);
    for (const [k, v] of Object.entries(s.stat ?? {})) if (typeof v === 'number') { by[k] = v - (typeof fore[k] === 'number' ? fore[k] as number : 0); sum[k] = (sum[k] ?? 0) + by[k]; }
    byar.push(by);
  }
  console.log(JSON.stringify({ sum, byar }));
} else if (process.argv[1] === FIL) {
  const timmar = Number(arg[0]) || 12, x = Number(arg[1]) || 2, y = Number(arg[2]) || 1;
  const [a, b] = await Promise.all([korMed(timmar, x), korMed(timmar, y)]);
  console.log(`${BYAR.length} sparade testbyar i ${timmar} timmar med slag om ${x} s och ${y} s: händelserna som skiljer sig mer än dubbelt, och åt samma håll i de flesta byar där de händer`);
  for (const d of skillnader(a, b)) console.log(`${d.namn}\t${d.a}\t${d.b}`);
}
