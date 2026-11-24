// Batteripausen i kedjan: är datorns batteri under PAUS_UNDER procent pausas allt kedjan startat, och det fortsätter där det var
// när batteriet är över FORTSATT_OVER procent. Processerna stannas och fortsätter med signaler (SIGSTOP och SIGCONT), så inget
// räknas om. Pulsen och tidsgränsen i pool.ts räknar bara vaken tid och tar inte en paus för ett häng. En dator utan batteri
// (hemservern, molnet) pausas aldrig. BATTERI_FIL: en fil med procenten i stället för datorns batteri, för provet
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
export const PAUS_UNDER = 10, FORTSATT_OVER = 50;
const KOLLA_MS = 30_000;
// batteriet i procent, eller undefined om datorn inte har något
export function batteri(): number | undefined {
  const fil = process.env.BATTERI_FIL;
  if (fil) return Number(readFileSync(fil, 'utf8'));
  if (process.platform !== 'darwin') return undefined;
  const m = /(\d+)%/.exec(spawnSync('pmset', ['-g', 'batt'], { encoding: 'utf8' }).stdout ?? '');
  return m ? Number(m[1]) : undefined;
}
// pausen följer batteriet: den som är pausad fortsätter först över FORTSATT_OVER
export const skaPausas = (nu: number | undefined, pausad: boolean) => nu !== undefined && (pausad ? nu <= FORTSATT_OVER : nu < PAUS_UNDER);
// alla processer som rot startat, i alla led (de kan ha egna grupper)
function under(rot: number): number[] {
  const barn = new Map<number, number[]>();
  for (const r of (spawnSync('ps', ['-axo', 'pid=,ppid='], { encoding: 'utf8' }).stdout ?? '').split('\n')) {
    const [p, f] = r.trim().split(/\s+/).map(Number);
    if (p) barn.set(f, [...(barn.get(f) ?? []), p]);
  }
  const ut: number[] = [];
  for (const ko = [rot]; ko.length;) for (const p of barn.get(ko.pop()!) ?? []) { ut.push(p); ko.push(p); }
  return ut;
}
const signal = (sig: NodeJS.Signals) => { for (const p of under(process.pid)) try { process.kill(p, sig); } catch { /* redan borta */ } };
// följ batteriet så länge kedjan går; skriv när den pausar och fortsätter
export function foljBatteriet(skriv: (rad: string) => void) {
  let pausad = false;
  const kolla = () => {
    const nu = batteri(), ny = skaPausas(nu, pausad);
    if (ny) signal('SIGSTOP'); // varje gång, så att inget som hann starta i samma stund går vidare
    else if (pausad) signal('SIGCONT');
    if (ny !== pausad) skriv(ny ? `PAUS: batteriet är på ${nu} %, fortsätter över ${FORTSATT_OVER} %` : `FORTSÄTTER: batteriet är på ${nu} %`);
    pausad = ny;
  };
  setInterval(kolla, process.env.BATTERI_FIL ? 500 : KOLLA_MS).unref();
  kolla();
  // en stannad process tar inte emot SIGTERM förrän den får fortsätta, så de släpps när kedjan avbryts
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) process.on(sig, () => { signal('SIGTERM'); signal('SIGCONT'); process.exit(130); });
}
