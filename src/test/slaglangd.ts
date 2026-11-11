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
const FIL = fileURLToPath(import.meta.url), DIR = fileURLToPath(new URL('../../test/facit-byar/', import.meta.url));
const BYAR = readdirSync(DIR).filter(f => f.endsWith('.json.gz')).sort();
// det som hänt i de sparade testbyarna (test/facit-byar/) under timmar i spelet med slaget sek sekunder, i en egen process
export function korMed(timmar: number, sek: number): Promise<Record<string, number>> {
  return new Promise((ok, fel) => execFile('npx', ['tsx', FIL, '--kor', String(timmar)], { env: { ...process.env, BALANS: `klocka.slag=${sek}` }, maxBuffer: 1 << 26 },
    (e, ut) => e ? fel(e) : ok(JSON.parse(ut.trim().split('\n').pop()!))));
}
// detsamma utan att vänta (scenariot slaglangd)
export const korMedNu = (timmar: number, sek: number): Record<string, number> =>
  JSON.parse(execFileSync('npx', ['tsx', FIL, '--kor', String(timmar)], { env: { ...process.env, BALANS: `klocka.slag=${sek}` }, maxBuffer: 1 << 26 }).toString().trim().split('\n').pop()!);
// händelserna som skiljer sig mycket: minst min gånger i någon av körningarna och mer än faktor gånger fler i den ena
export function skillnader(a: Record<string, number>, b: Record<string, number>, min = 30, faktor = 2): Skillnad[] {
  const kvot = (d: Skillnad) => Math.max(d.a, d.b) / Math.max(1, Math.min(d.a, d.b)), ut: Skillnad[] = [];
  for (const namn of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const d = { namn, a: a[namn] ?? 0, b: b[namn] ?? 0 };
    if (Math.max(d.a, d.b) >= min && kvot(d) > faktor) ut.push(d);
  }
  return ut.sort((p, q) => kvot(q) - kvot(p));
}
const arg = process.argv.slice(2);
if (arg[0] === '--kor') {
  const sum: Record<string, number> = {};
  for (const f of BYAR) {
    const s: State = lasBy(DIR + f), fore = { ...(s.stat ?? {}) } as Record<string, unknown>;
    for (let i = 0; i < Number(arg[1]) * 12; i++) step(s, 300);
    for (const [k, v] of Object.entries(s.stat ?? {})) if (typeof v === 'number') sum[k] = (sum[k] ?? 0) + v - (typeof fore[k] === 'number' ? fore[k] as number : 0);
  }
  console.log(JSON.stringify(sum));
} else if (process.argv[1] === FIL) {
  const timmar = Number(arg[0]) || 12, x = Number(arg[1]) || 2, y = Number(arg[2]) || 1;
  const [a, b] = await Promise.all([korMed(timmar, x), korMed(timmar, y)]);
  console.log(`${BYAR.length} sparade testbyar i ${timmar} timmar med slag om ${x} s och ${y} s: händelserna som skiljer sig mer än dubbelt`);
  for (const d of skillnader(a, b)) console.log(`${d.namn}\t${d.a}\t${d.b}`);
}
