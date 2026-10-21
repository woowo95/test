// Kör testskript i egna processer, flera samtidigt (en per processorkärna), så att testerna går fortare.
import { spawn } from 'node:child_process';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';

export interface Utfall { code: number; out: string; err: string; ms: number }

// ett skript i src/test, kört med tsx i en egen process
export function korSkript(fil: string, args: string[] = [], env: Record<string, string> = {}): Promise<Utfall> {
  const path = fileURLToPath(new URL('./' + fil, import.meta.url));
  return korProcess(process.execPath, ['--import', 'tsx', path, ...args], env);
}
export function korProcess(cmd: string, args: string[], env: Record<string, string> = {}): Promise<Utfall> {
  const t0 = Date.now();
  return new Promise(ok => {
    const c = spawn(cmd, args, { env: { ...process.env, ...env } });
    let out = '', err = '';
    c.stdout.on('data', d => out += d); c.stderr.on('data', d => err += d);
    c.on('close', code => ok({ code: code ?? 1, out, err, ms: Date.now() - t0 }));
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
