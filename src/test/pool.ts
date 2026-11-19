// Kör testskript i egna processer, flera samtidigt (en per processorkärna), så att testerna går fortare.
// Här finns också det som flera testskript delar: typkontrollen, scenariernas sammanfattning och testbyarnas frön.
// Filen importerar inget från simuleringen.
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { cpus, setPriority, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

export interface Utfall { code: number; out: string; err: string }
// Felkoderna som kedjan (npm run kedja) går efter: 1 = något är rött (ett scenario, en by som inte är lika), och kedjan går
// vidare och samlar felen; ALLVARLIGT = det som gör resten av testerna meningslösa (typfel, en krasch eller ett vaktlarm i
// byarna), och kedjan stannar genast
export const ALLVARLIGT = 2;
// de scenarier som var röda senast många scenarier kördes (scenario.ts skriver, npm run riktad -- --roda läser)
export const RODA = fileURLToPath(new URL('../../node_modules/.cache/scenario/roda.json', import.meta.url));
// en process som inte är klar efter så här lång tid (datorns tid) stoppas och räknas som kraschad. Den gäller bara som sista
// skydd: det som hänger sig stoppas av pulsen nedan långt innan
const TIDSGRANS_MIN = 150;
// Pulsen (testkedjan efter v530): en process som kör byar skriver ett tecken på liv när ett slag i spelet räknats (puls.ts,
// högst en gång i sekunden), i en egen mapp per process; det den själv startar skriver i mappar inuti. Har inget slag räknats på
// HANGT_MIN minuter, i processen eller något den startat, har den hängt sig och stoppas. En långsam process stoppas aldrig så
// länge spelets klocka går. En process som inte kör spelet (typkontrollen, en äldre version i jamfor) har ingen puls, och då
// gäller bara TIDSGRANS_MIN
const HANGT_MIN = 10;
// i sekunder; provet för pulsen (processgrupp.ts) sätter en kortare tid med HANGT_S
const hangtMs = () => Number(process.env.HANGT_S ?? HANGT_MIN * 60) * 1000;
const PULS = fileURLToPath(new URL('./puls.ts', import.meta.url));
let pulsNr = 0;
const pulsBas = process.env.PULS_DIR ?? `${tmpdir()}/puls/${process.pid}`;
// det senaste livstecknet i mappen och mapparna inuti (ms), eller undefined om inget skrivits än
function senastePuls(dir: string): number | undefined {
  let t: number | undefined;
  try { for (const f of readdirSync(dir, { recursive: true }) as string[]) if (f.endsWith('.puls')) { const m = statSync(`${dir}/${f}`).mtimeMs; if (t === undefined || m > t) t = m; } } catch { /* mappen borta */ }
  return t;
}

// Kärnorna till de långa jobben (steg 9.2.64): ett jobb som tog kortare tid än LANGT_JOBB_S förra gången körs med lägre
// prioritet (LAG_PRIO, som nice), så att de långa jobben, som avgör när testet blir klart, får hela kärnor och de korta fyller
// det som blir över. Mätt på Macen: med 25 processer på 10 kärnor fick varje jobb under en halv kärna
const LANGT_JOBB_S = 100;
export const LAG_PRIO = 10;
export const prioAv = (forraS: number | undefined) => forraS !== undefined && forraS >= LANGT_JOBB_S ? 0 : LAG_PRIO;
// ett skript i src/test, kört med tsx i en egen process (env läggs till datorns miljö, t.ex. { TIDSZON: 'Europe/Stockholm' }).
// prio: 0 vanlig, högre är lägre prioritet (som nice)
// grans: tidsgränsen i ms (TIDSGRANS_MIN om inget anges)
export function korSkript(fil: string, args: string[] = [], env: Record<string, string> = {}, prio = 0, grans?: number): Promise<Utfall> {
  const path = fileURLToPath(new URL('./' + fil, import.meta.url));
  return korProcess(process.execPath, ['--import', 'tsx', path, ...args], env, prio, grans);
}
// processerna som går just nu (var och en i sin egen grupp): avbryts testet (Ctrl-C) eller stoppas det stoppas de också, eftersom
// de inte längre är i samma grupp som testet. De får först SIGTERM, så att de hinner stoppa det de själva startat (som har egna
// grupper), och SIGKILL efter några sekunder om de inte slutat (en process som hängt sig kör inget eget när den får SIGTERM)
const igang = new Set<number>();
const signal = (pid: number, sig: NodeJS.Signals) => { try { process.kill(process.platform === 'win32' ? pid : -pid, sig); } catch { /* redan borta */ } };
const vanta = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
// stoppa alla processer som går (koll använder den när ett allvarligt fel gör resten meningslöst)
export function stoppaAlla() {
  if (!igang.size) return;
  for (const pid of igang) signal(pid, 'SIGTERM');
  vanta(2000);
  for (const pid of igang) signal(pid, 'SIGKILL');
  igang.clear();
}
process.on('exit', () => { for (const pid of igang) signal(pid, 'SIGKILL'); rmSync(pulsBas, { recursive: true, force: true }); });
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) process.on(sig, () => { stoppaAlla(); process.exit(130); });
// grans: tidsgränsen i ms (TIDSGRANS_MIN om inget anges). Processen startas i en egen grupp, så att hela gruppen (det den själv
// startat, som ett scenario med egen miljö) stoppas när den hängt sig eller tiden är ute (steg 9.2.60). En process med tsx får
// pulsen (puls.ts)
export function korProcess(cmd: string, args: string[], env: Record<string, string> = {}, prio = 0, grans: number = TIDSGRANS_MIN * 60_000): Promise<Utfall> {
  const dir = `${pulsBas}/${++pulsNr}`;
  mkdirSync(dir, { recursive: true });
  const tsx = cmd === process.execPath && args[0] === '--import' && args[1] === 'tsx';
  return new Promise(ok => {
    let out = '', err = '', klar = false, stoppad = false;
    const c = spawn(cmd, tsx ? ['--import', 'tsx', '--import', PULS, ...args.slice(2)] : args, { env: { ...process.env, MATARE_BARN: '1', ...env, PULS_DIR: dir }, detached: process.platform !== 'win32' });
    if (c.pid) igang.add(c.pid);
    if (prio && c.pid) try { setPriority(c.pid, prio); } catch { /* går det inte körs jobbet med vanlig prioritet */ }
    const sluta = (code: number) => { if (!klar) { klar = true; clearTimeout(tid); clearInterval(puls); if (c.pid) igang.delete(c.pid); rmSync(dir, { recursive: true, force: true }); ok({ code, out, err }); } };
    const stoppa = (varfor: string) => {
      if (stoppad || !c.pid) return;
      stoppad = true; err += `\n(${varfor})`;
      signal(c.pid, 'SIGTERM');
      setTimeout(() => signal(c.pid!, 'SIGKILL'), 5000).unref(); // hela gruppen
    };
    const tid = setTimeout(() => stoppa(`stoppad efter ${Math.round(grans / 60_000)} min, datorns tid`), grans);
    const start = Date.now();
    const hangt = hangtMs();
    const puls = setInterval(() => {
      const t = senastePuls(dir);
      if (t !== undefined && Date.now() - Math.max(t, start) > hangt) stoppa(`stoppad: den hängde sig, inget slag i spelet på ${Math.round(hangt / 60_000)} min (datorns tid)`);
    }, Math.min(30_000, hangt / 4));
    puls.unref();
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
export async function korJson<T>(fil: string, args: string[], namn: string, env: Record<string, string> = {}, prio = 0, grans?: number): Promise<T> {
  const u = await korSkript(fil, args, env, prio, grans);
  if (u.code) throw new Error(`${namn} kraschade:\n${u.err.slice(-1500)}`);
  return sistaJson<T>(u);
}

// sekunder sedan t0 (datorns tid), utan decimaler
export const sek = (t0: number) => ((Date.now() - t0) / 1000).toFixed(0);
// testbyarnas frön (balans, jamfor, natur och snabbkoll): by nummer i, räknat från 0
export const seedAv = (i: number) => 1001 + i * 7919;
// vakterna i fyra byar under de första 12 dygnen (12 år i spelet), som snabbkoll och riktad kör: texten att skriva ut och
// om en by kraschade eller en vakt larmade
export async function vaktByar() {
  const seeds = [0, 1, 2, 3].map(seedAv), dygn = 12;
  const byar = await pool(seeds.map(seed => () => korJson<{ vakter: string[] }>('en.ts', [String(seed), String(dygn)], `BY ${seed}`).catch((e: Error) => e)), 2);
  const vakter: string[] = [], rader: string[] = [];
  let krasch = false;
  for (const [i, r] of byar.entries()) {
    if (r instanceof Error) { krasch = true; rader.push(r.message); continue; }
    vakter.push(...r.vakter.map(v => `by ${seeds[i]}: ${v}`));
  }
  rader.push(vakter.length ? 'VAKTER LARMAR:\n  ' + vakter.join('\n  ') : `Vakter: inga fel (${seeds.length} byar i ${dygn} dygn).`);
  return { text: rader.join('\n'), fel: krasch || vakter.length > 0 };
}

const rader = (t: string) => t.split('\n').filter(r => r.trim());
// typkontrollen (tsc) av hela projektet
export const typkontroll = () => korProcess(process.execPath, [fileURLToPath(new URL('../../node_modules/typescript/bin/tsc', import.meta.url)), '-p', fileURLToPath(new URL('../../', import.meta.url))]);
export const typRad = (u: Utfall) => u.code ? 'TYPFEL:\n' + rader(u.out || u.err).slice(0, 20).join('\n') : 'Typkontroll: inga fel.';
// scenariernas utskrift i kort form: hur många som gick igenom, och alla andra rader (FEL, ✗ och VARNING)
export function scenarioSammanfattning(u: Utfall): string {
  const sr = rader(u.out), ok = sr.filter(r => r.startsWith('OK')).length, hoppade = sr.find(r => r.startsWith('(hoppade'));
  const fel = sr.filter(r => !r.startsWith('OK') && !r.includes('scenario misslyckades') && !r.startsWith('(hoppade') && !r.startsWith('(kartan')), karta = sr.find(r => r.startsWith('(kartan'));
  return `Scenarier: ${ok} av ${ok + sr.filter(r => r.startsWith('FEL')).length} OK.${fel.length ? '\n' + fel.join('\n') : ''}`
    + (u.code && !sr.length ? '\nSCENARIERNA KRASCHADE:\n' + u.err.slice(-1500) : '') + (hoppade ? '\n' + hoppade : '') + (karta ? '\n' + karta : '');
}

// JSON med nycklarna i bokstavsordning: en jämförelse gäller då innehållet och inte i vilken ordning fälten skrevs
// (serialize skriver fälten i den ordning de kom till i byn). Används av likhet och samma
export const kanonisk = (json: string) => JSON.stringify(JSON.parse(json), (_, v) =>
  v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : v);
