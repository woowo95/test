// npm test: tre byar i 90 dygn, en rad per by. Jämför med facit och skriver bara ut det som ändrats.
// Byarna går i bitar (steg 9.2.17, delby.ts): facit sparar varje testby vid bitarnas gränser (test/facit-byar/), och testet kör
// alla bitar samtidigt från de sparade byarna, den bit som tog längst tid förra gången först, och lägger ihop dem till en rad per by.
// npm run facit (--spara) kör byarna hela vägen, sparar dem vid varje delgräns och väljer gränserna så att bitarna tar ungefär
// lika lång tid. npm run koll (--utkast fil) sparar slutet av varje bit bredvid utkastet; när allt är grönt blir det nytt facit,
// så att nästa körning börjar bitarna från byarna som den här koden byggt.
import './utc';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { DOK_KB, rad } from './kor';
import { NYCKELTAL, Nyckeltal } from './nyckeltal';
import { korJson, pool } from './pool';
import { BitSvar, DEL, laggIhop } from './delby';

const FACIT = new URL('../../test/facit.json', import.meta.url), BYDIR = fileURLToPath(new URL('../../test/facit-byar/', import.meta.url));
const BYAR = [1, 42, 777], DAGAR = 90, BITAR = 3;
// hur mycket ett tal får ändras innan det räknas som en ändring står i registret (facit i nyckeltal.ts):
// körtiden jämförs inte och sparfilens storlek får variera lite; allt annat ska vara exakt lika
const lika = (a: number, b: number) => a === b;

// facit: per by bitarnas gränser (dygn), hur lång tid varje bit tog (ms, datorns tid) och nyckeltalen. Ett äldre facit är bara nyckeltalen
interface FacitBy { granser: number[]; bitMs: number[]; n: Nyckeltal }
interface Facit { byar: Record<string, FacitBy> }
const lasFacit = (): Facit | undefined => {
  if (!existsSync(FACIT)) return undefined;
  const f = JSON.parse(readFileSync(FACIT, 'utf8'));
  return f.byar ? f : { byar: Object.fromEntries(Object.entries(f).map(([k, n]) => [k, { granser: [0, DAGAR], bitMs: [], n: n as Nyckeltal }])) };
};
const byFil = (dir: string, seed: number, dag: number) => `${dir}${seed}-${dag}.json.gz`;
const utan = (n: Nyckeltal) => JSON.parse(JSON.stringify(n, (k, v) => k === 'ms' ? undefined : v)) as Nyckeltal; // körtiden står inte i facit
const facitText = (f: Facit) => JSON.stringify({ byar: Object.fromEntries(Object.entries(f.byar).map(([k, b]) => [k, { ...b, n: utan(b.n) }])) }, null, 1) + '\n';
const spara = process.argv.includes('--spara'), utkastI = process.argv.indexOf('--utkast'), utkast = utkastI >= 0 ? process.argv[utkastI + 1] : undefined;

type Jobb = { seed: number; fran: number; till: number; in: string; ut: string; forra: number };
let res: { seed: number; n: Nyckeltal; vakter: string[] }[], nytt: Facit = { byar: {} }, jobbtider: { namn: string; ms: number }[] = [];
const facit = lasFacit();

if (spara) {
  // hela vägen för varje by, sparad vid varje delgräns; gränserna väljs sedan bland delgränserna så att BITAR bitar tar ungefär lika lång tid
  const tmp = `${tmpdir()}/facit-byar-${process.pid}/`;
  mkdirSync(tmp, { recursive: true });
  const hela = await pool(BYAR.map(seed => () => korJson<BitSvar>('delby.ts', ['--bit', String(seed), '0', String(DAGAR), '-', '-', '--alla', tmp], `by ${seed}`)
    .catch((e: Error) => { console.log(e.message); process.exit(1); })));
  res = hela.map(b => ({ seed: b.seed, ...laggIhop([b]) }));
  for (const b of hela) {
    const g = basta(b.delMs), granser = [0, ...g.map(i => i * DEL), DAGAR];
    const bitMs = granser.slice(1).map((t, i) => b.delMs.slice(granser[i] / DEL, t / DEL).reduce((a, x) => a + x, 0));
    nytt.byar[b.seed] = { granser, bitMs, n: res.find(r => r.seed === b.seed)!.n };
  }
  if (!res.some(r => r.vakter.length)) {
    rmSync(BYDIR, { recursive: true, force: true }); mkdirSync(BYDIR, { recursive: true });
    for (const [seed, b] of Object.entries(nytt.byar)) for (const g of b.granser.slice(1, -1)) copyFileSync(byFil(tmp, +seed, g), byFil(BYDIR, +seed, g));
  }
  rmSync(tmp, { recursive: true, force: true });
} else {
  // bitarna från facits sparade byar; saknas en sparad by går den byn hela vägen i en bit
  const ut = utkast ? `${utkast}.byar/` : undefined;
  if (ut) mkdirSync(ut, { recursive: true });
  const jobb: Jobb[] = [];
  for (const seed of BYAR) {
    const f = facit?.byar[seed];
    const granser = f && f.granser.slice(1, -1).every(g => existsSync(byFil(BYDIR, seed, g))) ? f.granser : [0, DAGAR];
    granser.slice(1).forEach((till, i) => jobb.push({ seed, fran: granser[i], till, in: i ? byFil(BYDIR, seed, granser[i]) : '-', ut: ut && till < DAGAR ? byFil(ut, seed, till) : '-', forra: f?.bitMs[i] ?? till - granser[i] }));
  }
  const ordning = [...jobb].sort((a, b) => b.forra - a.forra); // den som tog längst tid förra gången först
  const svar = await pool(ordning.map(j => () => korJson<BitSvar>('delby.ts', ['--bit', String(j.seed), String(j.fran), String(j.till), j.in, j.ut], `by ${j.seed}, dygn ${j.fran}–${j.till}`)
    .catch((e: Error) => { console.log(e.message); process.exit(1); })));
  res = BYAR.map(seed => {
    const bitar = svar.filter(b => b.seed === seed).sort((a, b) => a.fran - b.fran);
    nytt.byar[seed] = { granser: [0, ...bitar.map(b => b.till)], bitMs: bitar.map(b => b.ms), n: laggIhop(bitar).n };
    return { seed, ...laggIhop(bitar) };
  });
  jobbtider = svar.map(b => ({ namn: `by ${b.seed}, dygn ${b.fran}–${b.till}`, ms: b.ms }));
}

for (const r of res) console.log(rad(r));
// återgrundning skrivs alltid ut, så att det syns om en by dött ut och börjat om
const ater = res.filter(r => r.n.atergrundad > 0);
const storst = Math.max(...res.map(r => r.n.delKb));
if (storst > DOK_KB * 0.75) console.log(`VARNING: en del av sparfilen är ${storst} KB, och ett dokument i molnet rymmer ${DOK_KB} KB. Delen sparas i bitar, men dela gärna upp den (DELAR i steg.ts).`);
console.log(ater.length ? 'ÅTERGRUNDADE BYAR: ' + ater.map(r => `by ${r.seed} (${r.n.atergrundad} ggr)`).join(', ') : 'Återgrundade byar: inga.');
const vakter = res.flatMap(r => r.vakter.map(v => `by ${r.seed}: ${v}`));

// npm run koll ger --utkast och en fil: dagens resultat skrivs dit (och byarna i slutet av bitarna bredvid), och koll gör det till facit när allt är grönt
if (utkast && !vakter.length) writeFileSync(utkast, facitText(nytt));
if (utkast) console.log('@@jobb ' + JSON.stringify(jobbtider)); // bitarnas tider, så att koll kan skriva de längsta jobben
if (spara) {
  // en by där något omöjligt hänt blir inte facit (och npm run facit stannar då före samma-kollen)
  if (vakter.length) console.log('Facit sparas inte, eftersom vakterna larmar (se nedan).');
  else { writeFileSync(FACIT, facitText(nytt)); console.log(`Facit sparat, med byarna sparade vid ${Object.entries(nytt.byar).map(([s, b]) => `by ${s}: ${b.granser.slice(1, -1).join(' och ')} dygn`).join(', ')}.`); }
} else if (!facit) {
  console.log('Inget facit ännu. Spara med: npm run facit');
} else {
  const andr: string[] = [];
  for (const r of res) {
    const f = facit.byar[r.seed]?.n;
    if (!f) { andr.push(`by ${r.seed}: saknas i facit`); continue; }
    const d = NYCKELTAL.filter(m => !(m.facit ?? lika)(r.n[m.k], f[m.k])).map(m => `${m.kort} ${f[m.k]} → ${r.n[m.k]}`);
    if (d.length) andr.push(`by ${r.seed}: ${d.join(', ')}`);
  }
  console.log(andr.length ? 'Ändrat mot facit:\n  ' + andr.join('\n  ') : 'Facit: oförändrat.');
}

console.log(vakter.length ? 'VAKTER LARMAR:\n  ' + vakter.join('\n  ') : 'Vakter: inga fel.');
if (vakter.length) process.exitCode = 1;

// gränserna (som delindex) som delar delarnas tider i BITAR bitar i följd med den kortaste längsta biten
function basta(ms: number[]): number[] {
  const n = ms.length, sum = (a: number, b: number) => ms.slice(a, b).reduce((x, y) => x + y, 0);
  let bast: number[] = [], bm = Infinity;
  const prova = (start: number, kvar: number, valda: number[]) => {
    if (kvar === 1) { const m = Math.max(...[...valda, n].map((g, i, a) => sum(i ? a[i - 1] : 0, g))); if (m < bm) { bm = m; bast = valda; } return; }
    for (let g = start + 1; g <= n - kvar + 1; g++) prova(g, kvar - 1, [...valda, g]);
  };
  prova(0, Math.min(BITAR, n), []);
  return bast;
}
