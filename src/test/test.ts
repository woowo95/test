// npm test: tre byar i 90 dygn, en rad per by. Jämför med facit och skriver bara ut det som ändrats.
// Byarna går i bitar (steg 9.2.17, delby.ts): facit sparar varje testby vid bitarnas gränser (test/facit-byar/), och testet kör
// alla bitar samtidigt från de sparade byarna, den bit som tog längst tid förra gången först, och lägger ihop dem till en rad per by.
// npm run facit (--spara) kör byarna hela vägen, sparar dem vid varje delgräns och väljer gränserna så att bitarna tar ungefär
// lika lång tid. npm run koll (--utkast fil) sparar slutet av varje bit bredvid utkastet; när allt är grönt blir det nytt facit,
// så att nästa körning börjar bitarna från byarna som den här koden byggt.
import './utc';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { rad } from './kor';
import { NYCKELTAL, Nyckeltal } from './nyckeltal';
import { ALLVARLIGT, korJson, pool, prioAv } from './pool';
import { BitSvar, DEL, laggIhop } from './delby';
import { IAKTTAGARE } from './scenarier/iakttagare';

const FACIT = new URL('../../test/facit.json', import.meta.url), BYDIR = fileURLToPath(new URL('../../test/facit-byar/', import.meta.url));
// JOBB: byarnas bitar delas så att ingen bit tar mer än en JOBB-del av alla byars tid tillsammans, så att inget jobb i det
// stora testet är mycket längre än de andra (steg 10.2.104): en lång by får fler bitar än en kort
// by 1511 och 4634 får alla motgångar (MOTGANGAR) inom testets tid, så att samma-kollen ur testbyarna kör dem alla (steg 10.2.105)
// DAGAR: 50 dygn (50 år i spelet, sju veckor i verkligheten); hela 90 dygn körs i fasens Balans med TESTDYGN=90 npm test
// (steg 10.2.107), som jämför med facit men aldrig sparar något. Byarna efter 50 dygn sparas (SLUT, testkedjan efter v530), och
// 90-dygnstestet kör de första 50 dygnen i bitar som vanligt och fortsätter samtidigt från den sparade byn efter 50 dygn, i
// stället för att köra varje by hela vägen i en bit. Saknas den sparade byn (koden har ändrats sedan facit) går den sista
// biten hela vägen till slutet
const SLUT = fileURLToPath(new URL('../../node_modules/.cache/slutbyar/', import.meta.url));
const slutFil = (seed: number, hash: string) => `${SLUT}${seed}-${hash}.json.gz`;
const UNGA = [5, 10, 15, 20, 25, 30, 40]; // dygnen scenarierna läser en testby vid (testBy i hjalp.ts)
const FACITDYGN = 50, DAGAR = Number(process.env.TESTDYGN ?? FACITDYGN), BYAR = [1, 1511, 4634], JOBB = 20;
if (DAGAR !== FACITDYGN && (process.argv.includes('--spara') || process.argv.includes('--utkast'))) { console.log(`Facit gäller ${FACITDYGN} dygn; med TESTDYGN=${DAGAR} sparas inget.`); process.exit(1); }
// hur mycket ett tal får ändras innan det räknas som en ändring står i registret (facit i nyckeltal.ts):
// körtiden jämförs inte och sparfilens storlek får variera lite; allt annat ska vara exakt lika
const lika = (a: number, b: number) => a === b;

// facit: per by bitarnas gränser (dygn), hur lång tid varje bit tog (ms, datorns tid), nyckeltalen och hela byns hash i slutet av
// varje bit (samma-kollen, steg 10.2.105). Ett äldre facit är bara nyckeltalen
interface FacitBy { granser: number[]; bitMs: number[]; n: Nyckeltal; hash?: string[] }
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

type Jobb = { seed: number; fran: number; till: number; in: string; ut: string; forra: number; kand: boolean; lang?: boolean };
let allaBitar: BitSvar[] = [];
let res: { seed: number; n: Nyckeltal; vakter: string[] }[], nytt: Facit = { byar: {} }, jobbtider: { namn: string; ms: number }[] = [];
const facit = lasFacit();

if (spara) {
  // hela vägen för varje by, sparad vid varje delgräns; gränserna väljs sedan bland delgränserna så att bitarna tar ungefär lika lång tid, fler bitar i en lång by
  const tmp = `${tmpdir()}/facit-byar-${process.pid}/`;
  mkdirSync(tmp, { recursive: true });
  mkdirSync(SLUT, { recursive: true });
  const hela = await pool(BYAR.map(seed => () => korJson<BitSvar>('delby.ts', ['--bit', String(seed), '0', String(DAGAR), '-', slutTmp(seed), '--alla', tmp], `by ${seed}`)
    .catch((e: Error) => { console.log(e.message); process.exit(ALLVARLIGT); })));
  sparaSlut(hela);
  res = hela.map(b => ({ seed: b.seed, ...laggIhop([b]) }));
  allaBitar = hela;
  for (const [seed, b] of Object.entries(valjBitar(hela))) nytt.byar[seed] = { ...b, n: res.find(r => r.seed === +seed)!.n };
  if (!res.some(r => r.vakter.length)) {
    rmSync(BYDIR, { recursive: true, force: true }); mkdirSync(BYDIR, { recursive: true });
    for (const [seed, b] of Object.entries(nytt.byar)) for (const g of b.granser.slice(1, -1)) copyFileSync(byFil(tmp, +seed, g), byFil(BYDIR, +seed, g));
  }
  rmSync(tmp, { recursive: true, force: true });
} else {
  // bitarna från facits sparade byar; saknas en sparad by går den byn hela vägen i en bit. Med --utkast sparas byn vid varje
  // delgräns, och bitarna väljs om efter hur lång tid delarna tog nu, så att nästa körning delar det som blivit långsamt (steg 10.11.24)
  const ut = utkast ? `${utkast}.byar/` : undefined;
  if (ut) mkdirSync(ut, { recursive: true });
  const jobb: Jobb[] = [], bas = Math.min(DAGAR, FACITDYGN);
  mkdirSync(SLUT, { recursive: true });
  for (const seed of BYAR) {
    const f = facit?.byar[seed];
    const granser = f && f.granser.at(-1) === bas && f.granser.slice(1, -1).every(g => existsSync(byFil(BYDIR, seed, g))) ? f.granser : [0, bas];
    granser.slice(1).forEach((till, i) => jobb.push({ seed, fran: granser[i], till, in: i ? byFil(BYDIR, seed, granser[i]) : '-', ut: ut && till < DAGAR ? byFil(ut, seed, till) : till === FACITDYGN && DAGAR === FACITDYGN ? slutTmp(seed) : '-', forra: granser === f?.granser ? f.bitMs[i] ?? 0 : till - granser[i], kand: granser === f?.granser && f.bitMs[i] !== undefined }));
    if (DAGAR > bas) { // 90-dygnstestet: från den sparade byn efter 50 dygn, eller den sista biten hela vägen
      const h = f?.hash?.at(-1), sparad = h && f!.granser.at(-1) === bas ? slutFil(seed, h) : undefined;
      if (sparad && existsSync(sparad)) jobb.push({ seed, fran: bas, till: DAGAR, in: sparad, ut: '-', forra: 1e12, kand: false, lang: true });
      else Object.assign(jobb[jobb.length - 1]!, { till: DAGAR, forra: 1e12, lang: true });
    }
  }
  const ordning = [...jobb].sort((a, b) => b.forra - a.forra); // den som tog längst tid förra gången först
  const f = (j: Jobb) => j.lang ? 0 : prioAv(j.kand ? j.forra / 1000 : undefined); // de korta bitarna med lägre prioritet (steg 9.2.64)
  // ingen tidsgräns efter förra gångens tid: en bit som hängt sig stoppas av pulsen (pool.ts), en långsam aldrig
  const svar = await pool(ordning.map(j => () => korJson<BitSvar>('delby.ts', ['--bit', String(j.seed), String(j.fran), String(j.till), j.in, j.ut, ...(ut ? ['--alla', ut] : [])], `by ${j.seed}, dygn ${j.fran}–${j.till}`, {}, f(j))
    .catch((e: Error) => { console.log(e.message); process.exit(ALLVARLIGT); })));
  allaBitar = svar;
  if (DAGAR === FACITDYGN) sparaSlut(svar.filter(b => b.till === FACITDYGN));
  const hela = BYAR.map(seed => svar.filter(b => b.seed === seed).sort((a, b) => a.fran - b.fran));
  // utan --utkast behålls bitarna; samma-kollen jämför då med facits hash vid samma gränser
  const valda = ut ? valjBitar(hela.map(bitar => ({ seed: bitar[0].seed, delMs: bitar.flatMap(b => b.delMs), delHash: bitar.flatMap(b => b.delHash) }))) : undefined;
  res = hela.map(bitar => {
    const seed = bitar[0].seed;
    nytt.byar[seed] = { ...(valda?.[seed] ?? { granser: [0, ...bitar.map(b => b.till)], bitMs: bitar.map(b => b.ms), hash: bitar.map(b => b.delHash[b.delHash.length - 1]) }), n: laggIhop(bitar).n };
    return { seed, ...laggIhop(bitar) };
  });
  // bara byarna vid de nya gränserna blir kvar bredvid utkastet (koll gör dem till facits sparade byar)
  if (ut && valda) for (const fil of readdirSync(ut)) { const m = /^(\d+)-(\d+)\.json\.gz$/.exec(fil); if (!m || !valda[+m[1]]?.granser.slice(1, -1).includes(+m[2])) rmSync(ut + fil); }
  jobbtider = svar.map(b => ({ namn: `by ${b.seed}, dygn ${b.fran}–${b.till}`, ms: b.ms }));
}

for (const r of res) console.log(rad(r));
// återgrundning skrivs alltid ut, så att det syns om en by dött ut och börjat om
const ater = res.filter(r => r.n.atergrundad > 0);
// vakten för sparfilens storlek (steg 11.2.2): varje del har en gräns (SPARGRANS i steg.ts)
const over = res.filter(r => r.n.sparAndel > 100);
if (over.length) { console.log(`FEL sparstorlek: en del av sparfilen har vuxit över sin gräns (SPARGRANS i steg.ts): ${over.map(r => `by ${r.seed} ${r.n.sparAndel} %`).join(', ')}. Delarna visas med npm run scenario -- sparstorlek`); process.exitCode = 1; }
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
  const andr: string[] = [], samma: string[] = [];
  for (const r of res) {
    const f = facit.byar[r.seed]?.n;
    if (!f) { andr.push(`by ${r.seed}: saknas i facit`); continue; }
    const d = NYCKELTAL.filter(m => !(m.facit ?? lika)(r.n[m.k], f[m.k])).map(m => `${m.kort} ${f[m.k]} → ${r.n[m.k]}`);
    if (d.length) andr.push(`by ${r.seed}: ${d.join(', ')}`);
    // samma-kollen (steg 10.2.105): hela byns tillstånd i slutet av varje bit, också det som inget nyckeltal visar
    // gränserna kan ha valts om (steg 10.11.24): hashen jämförs vid de gränser som finns i båda
    const fb = facit.byar[r.seed], nh = svarHash(r.seed);
    const olik = fb.granser.slice(1).filter((g, i) => fb.hash?.[i] !== undefined && nh.has(g) && nh.get(g) !== fb.hash[i]);
    if (olik.length) samma.push(`by ${r.seed} efter dygn ${olik.join(', ')}`);
  }
  console.log(andr.length ? 'Ändrat mot facit:\n  ' + andr.join('\n  ') : 'Facit: oförändrat.');
  console.log(samma.length ? 'ANNAN UTVECKLING (hela byn): ' + samma.join('; ') : 'Samma utveckling som förut (hela byn).');
}

// iakttagarna (steg 10.2.106): bitarna i följd läggs ihop per by, och kontrollerna skrivs som scenarierna (OK/FEL namn)
const bitarAv: Record<number, BitSvar[]> = {};
for (const b of allaBitar) (bitarAv[b.seed] ??= []).push(b);
for (const [namn, i] of Object.entries(IAKTTAGARE)) {
  const byar = BYAR.map(seed => ({ seed, m: bitarAv[seed]!.sort((a, b) => a.fran - b.fran).map(b => b.iakt[namn]).reduce((a, b) => i.ihop(a, b)) }));
  const k = i.kolla(byar), fel = k.filter(x => !x[1]);
  console.log(fel.length ? `FEL ${namn}: ${i.text}\n${fel.map(x => '  ✗ ' + x[0]).join('\n')}` : `OK ${namn}`);
  if (process.env.ALLA) for (const x of k.filter(x => x[1])) console.log('  ✓ ' + x[0]);
  if (fel.length) process.exitCode = 1;
}

console.log(vakter.length ? 'VAKTER LARMAR:\n  ' + vakter.join('\n  ') : 'Vakter: inga fel.');
if (vakter.length) process.exitCode = ALLVARLIGT; // kedjan stannar: något omöjligt har hänt i byarna

// byn efter 50 dygn sparas under en tillfällig namn och får sedan hashen av hela byn som namn, så att 90-dygnstestet hittar den
// by som hör till facit. De som är äldre än en vecka tas bort
function slutTmp(seed: number) { return `${SLUT}${seed}-tmp${process.pid}.json.gz`; }
function sparaSlut(bitar: BitSvar[]) {
  for (const b of bitar) if (existsSync(slutTmp(b.seed))) renameSync(slutTmp(b.seed), slutFil(b.seed, b.delHash.at(-1)!));
  for (const fil of readdirSync(SLUT)) if (Date.now() - statSync(SLUT + fil).mtimeMs > 7 * 86_400_000) rmSync(SLUT + fil, { force: true });
}

// hela byns hash efter varje del (dygn → hash), ur bitarna som kördes
function svarHash(seed: number): Map<number, string> {
  const m = new Map<number, string>();
  for (const b of allaBitar) if (b.seed === seed) b.delHash.forEach((h, i) => m.set(Math.min(b.till, b.fran + (i + 1) * DEL), h));
  return m;
}
// bitarnas gränser efter delarnas tider: ingen bit tar mer än en JOBB-del av alla byars tid tillsammans, så en by som blivit
// långsam delas i fler bitar nästa gång (steg 10.2.104 och 10.11.24)
function valjBitar(byar: { seed: number; delMs: number[]; delHash: string[] }[]): Record<number, Omit<FacitBy, 'n'>> {
  const mal = byar.reduce((a, b) => a + b.delMs.reduce((x, y) => x + y, 0), 0) / JOBB, ut: Record<number, Omit<FacitBy, 'n'>> = {};
  for (const b of byar) {
    const bitar = Math.max(1, Math.ceil(b.delMs.reduce((x, y) => x + y, 0) / mal));
    // by 1 sparas alltid vid dygnen scenarierna ber om: de som läser en testby (testBy i hjalp.ts) får då samma by varje
    // gång, i stället för en annan by när bitarnas gränser flyttas
    const g = basta(b.delMs, bitar), granser = [...new Set([0, ...(b.seed === 1 ? UNGA.filter(d => d < DAGAR) : []), ...g.map(i => i * DEL), DAGAR])].sort((x, y) => x - y);
    const bitMs = granser.slice(1).map((t, i) => b.delMs.slice(granser[i] / DEL, Math.ceil(t / DEL)).reduce((a, x) => a + x, 0));
    ut[b.seed] = { granser, bitMs, hash: granser.slice(1).map(t => b.delHash[Math.ceil(t / DEL) - 1]) };
  }
  return ut;
}
// gränserna (som delindex) som delar delarnas tider i bitar (så många) i följd med den kortaste längsta biten
function basta(ms: number[], bitar: number): number[] {
  const n = ms.length, sum = (a: number, b: number) => ms.slice(a, b).reduce((x, y) => x + y, 0);
  let bast: number[] = [], bm = Infinity;
  const prova = (start: number, kvar: number, valda: number[]) => {
    if (kvar === 1) { const m = Math.max(...[...valda, n].map((g, i, a) => sum(i ? a[i - 1] : 0, g))); if (m < bm) { bm = m; bast = valda; } return; }
    for (let g = start + 1; g <= n - kvar + 1; g++) prova(g, kvar - 1, [...valda, g]);
  };
  prova(0, Math.min(bitar, n), []);
  return bast;
}
