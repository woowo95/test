// Kör testskript i egna processer, flera samtidigt (en per processorkärna), så att testerna går fortare.
// Här finns också det som flera testskript delar: typkontrollen, scenariernas sammanfattning och testbyarnas frön.
// Filen importerar inget från simuleringen.
import { spawn } from 'node:child_process';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';

export interface Utfall { code: number; out: string; err: string }
// en process som inte är klar efter så här lång tid (datorns tid) stoppas och räknas som kraschad
const TIDSGRANS_MIN = 20;

// ett skript i src/test, kört med tsx i en egen process (env läggs till datorns miljö, t.ex. { TZ: 'Europe/Stockholm' })
export function korSkript(fil: string, args: string[] = [], env: Record<string, string> = {}): Promise<Utfall> {
  const path = fileURLToPath(new URL('./' + fil, import.meta.url));
  return korProcess(process.execPath, ['--import', 'tsx', path, ...args], env);
}
export function korProcess(cmd: string, args: string[], env: Record<string, string> = {}): Promise<Utfall> {
  return new Promise(ok => {
    let out = '', err = '', klar = false;
    const c = spawn(cmd, args, { env: { ...process.env, ...env } });
    const sluta = (code: number) => { if (!klar) { klar = true; clearTimeout(tid); ok({ code, out, err }); } };
    const tid = setTimeout(() => { err += `\n(stoppad efter ${TIDSGRANS_MIN} min, datorns tid)`; c.kill('SIGKILL'); }, TIDSGRANS_MIN * 60_000);
    // som text, så att å, ä och ö inte delas mellan två bitar av utskriften
    c.stdout.setEncoding('utf8'); c.stderr.setEncoding('utf8');
    c.stdout.on('data', d => out += d); c.stderr.on('data', d => err += d);
    c.on('error', e => { err += `\n${e.message}`; sluta(1); }); // t.ex. om processen inte gick att starta
    c.on('close', code => sluta(code ?? 1));
  });
}
// kör jobben med högst n samtidigt och ger svaren i samma ordning som jobben
export async function pool<T>(jobb: (() => Promise<T>)[], n = cpus().length): Promise<T[]> {
  const svar: T[] = new Array(jobb.length);
  let nasta = 0;
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, jobb.length)) }, async () => {
    while (nasta < jobb.length) { const i = nasta++; svar[i] = await jobb[i](); }
  }));
  return svar;
}
// sista raden i utskriften tolkad som JSON
export const sistaJson = <T>(u: Utfall): T => JSON.parse(u.out.trim().split('\n').pop()!);
// ett skript som skriver sitt svar som JSON på sista raden. Kraschar det kastas ett fel med slutet av felutskriften
export async function korJson<T>(fil: string, args: string[], namn: string): Promise<T> {
  const u = await korSkript(fil, args);
  if (u.code) throw new Error(`${namn} kraschade:\n${u.err.slice(-1500)}`);
  return sistaJson<T>(u);
}

// sekunder sedan t0 (datorns tid), utan decimaler
export const sek = (t0: number) => ((Date.now() - t0) / 1000).toFixed(0);
// testbyarnas frön (balans, jamfor, natur och snabbkoll): by nummer i, räknat från 0
export const seedAv = (i: number) => 1001 + i * 7919;

const rader = (t: string) => t.split('\n').filter(r => r.trim());
// typkontrollen (tsc) av hela projektet
export const typkontroll = () => korProcess(process.execPath, [fileURLToPath(new URL('../../node_modules/typescript/bin/tsc', import.meta.url)), '-p', fileURLToPath(new URL('../../', import.meta.url))]);
export const typRad = (u: Utfall) => u.code ? 'TYPFEL:\n' + rader(u.out || u.err).slice(0, 20).join('\n') : 'Typkontroll: inga fel.';
// scenariernas utskrift i kort form: hur många som gick igenom, och alla andra rader (FEL, ✗ och VARNING)
export function scenarioSammanfattning(u: Utfall): string {
  const sr = rader(u.out), ok = sr.filter(r => r.startsWith('OK')).length, hoppade = sr.find(r => r.startsWith('(hoppade'));
  const fel = sr.filter(r => !r.startsWith('OK') && !r.includes('scenario misslyckades') && !r.startsWith('(hoppade'));
  return `Scenarier: ${ok} av ${ok + sr.filter(r => r.startsWith('FEL')).length} OK.${fel.length ? '\n' + fel.join('\n') : ''}`
    + (u.code && !sr.length ? '\nSCENARIERNA KRASCHADE:\n' + u.err.slice(-1500) : '') + (hoppade ? '\n' + hoppade : '');
}

// JSON med nycklarna i bokstavsordning: en jämförelse gäller då innehållet och inte i vilken ordning fälten skrevs
// (serialize skriver fälten i den ordning de kom till i byn). Används av likhet och samma
export const kanonisk = (json: string) => JSON.stringify(JSON.parse(json), (_, v) =>
  v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : v);
