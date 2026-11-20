// Kartan för den riktade kollen (npm run riktad): vilka funktioner i src varje scenario kör, ur V8:s täckning (tackning.mjs, steg
// 12.1.130: bara om en funktion körts, inte NODE_V8_COVERAGE:s räknare i varje block, som gjorde scenarierna dubbelt så långsamma).
// Den byggs under det stora testets scenarier (npm run koll, testkedjan efter v530), där korta scenarier går i grupper: en grupps
// funktioner räknas då för alla scenarier i gruppen, så att riktad hellre kör ett scenario för mycket än ett för lite. npm run
// riktad -- --karta bygger den ensam, ett scenario i taget. Kartan sparas i node_modules/.cache/riktad och är inte med i git.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROT = fileURLToPath(new URL('../../', import.meta.url));
export const CACHE = ROT + 'node_modules/.cache/riktad/', KARTA = CACHE + 'karta.json';
// funktioner som V8 räknar men som inte är koden: modulen själv, tsx:s hjälpare och klassernas initierare
const BRUS = new Set(['', '__name', '<static_initializer>']);
export interface Karta { commit: string; funk: string[]; scen: Record<string, { f: number[] }> } // funk: "fil#namn"

// en tom mapp för täckningen från en process (och det den startar)
export function tackningsMapp(namn: string): string {
  const dir = `${CACHE}tmp-${process.pid}/${namn}`;
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  return dir;
}
// miljön som ger en process (och det den startar) täckningen i mappen dir
const TACKNING = new URL('./tackning.mjs', import.meta.url).href;
export const tackningsMiljo = (dir: string): Record<string, string> => ({ TACKNING: dir, NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${TACKNING}`].filter(Boolean).join(' ') });
// funktionerna ("fil#namn") som kördes enligt täckningen i mappen; mappen tas bort
export function lasTackning(dir: string): Set<string> {
  const f = new Set<string>();
  for (const fil of readdirSync(dir)) for (const r of JSON.parse(readFileSync(dir + '/' + fil, 'utf8')).result) {
    const m = /^file:\/\/.*?\/(src\/.*\.ts)$/.exec(r.url);
    if (!m || m[1].startsWith('src/test/')) continue; // testernas egna funktioner körs av alla (läsningen av scenarierna)
    for (const fn of r.functions) if (!BRUS.has(fn.functionName) && fn.ranges[0].count > 0) f.add(`${m[1]}#${fn.functionName}`);
  }
  rmSync(dir, { recursive: true, force: true });
  return f;
}
// kartan av funktionerna per scenario, med commiten den gäller
export function sparaKarta(scen: Record<string, Set<string>>) {
  const funk: string[] = [], nr = new Map<string, number>(), ut: Karta['scen'] = {};
  for (const [n, f] of Object.entries(scen)) ut[n] = { f: [...f].map(k => { if (!nr.has(k)) { nr.set(k, funk.length); funk.push(k); } return nr.get(k)!; }).sort((a, b) => a - b) };
  rmSync(`${CACHE}tmp-${process.pid}`, { recursive: true, force: true });
  const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROT, encoding: 'utf8' }).trim();
  writeFileSync(KARTA, JSON.stringify({ commit, funk, scen: ut } satisfies Karta));
  return { scenarier: Object.keys(ut).length, funktioner: funk.length };
}
