// npm run jamfor -- [dygn = 35] [högst antal byar = 64] [--mot gren = main]
// Jämför koden som den är nu (med det som inte är committat) med en tidigare version, by för by på samma byar.
// Varje by körs i båda versionerna, och skillnaden räknas per by. Det tar bort det mesta av bruset mellan byar
// (en by på en dålig karta är dålig i båda). Byarna körs åtta åt gången tills varje nyckeltal är avgjort:
// klart bättre, klart sämre, lika, eller i varje fall ingen stor skillnad. Då slutar körningen, så det mesta avgörs
// på 16–32 byar och bara det som är oklart körs längre.
// Bruset sitter i spelet: små byar står på gränsen till svält, och minsta ändring kan avgöra om en by klarar sig.
// Därför går små skillnader (några hungertimmar) inte att mäta snabbt; testet svarar på om något blivit klart sämre.
// Resultaten sparas i node_modules/.cache/jamfor: den tidigare versionens per commit och den nuvarandes per innehållet
// i src, så att en by aldrig körs två gånger med samma kod.
// 35 dygn räcker för grundandet och den första vintern (istiden tar slut efter 34 dygn).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { korProcess, pool, sistaJson } from './pool';
import type { Nyckeltal } from './kor';

const arg = process.argv.slice(2);
const motI = arg.indexOf('--mot'), mot = motI >= 0 ? arg.splice(motI, 2)[1] : 'main';
const [dagar = 35, maxByar = 64] = arg.map(Number);
const ROT = fileURLToPath(new URL('../..', import.meta.url));
const git = (...a: string[]) => execFileSync('git', a, { cwd: ROT, encoding: 'utf8' }).trim();
const SATS = 8; // byar per omgång

// nyckeltalen som jämförs: namn, om högre är bättre, hur stor skillnad i snitt per by som inte spelar någon roll (lika),
// och hur stor skillnad som är stor (stor = lika gånger tre)
// En by som dör ut räknas en gång, hur många gånger den än grundas på nytt: annars väger en enda by för tungt.
const MATT: { k: keyof Nyckeltal; namn: string; bra: 1 | -1; lika: number; tal?: (v: number) => string; v?: (n: Nyckeltal) => number }[] = [
  { k: 'atergrundad', namn: 'byar som dog ut', bra: -1, lika: 0.05, tal: v => Math.round(v * 100) + ' %', v: n => n.atergrundad > 0 ? 1 : 0 },
  { k: 'pop', namn: 'invånare', bra: 1, lika: 1 },
  { k: 'doda', namn: 'döda', bra: -1, lika: 1 },
  { k: 'svalt', namn: 'svalt ihjäl', bra: -1, lika: 0.5 },
  { k: 'kyla', namn: 'frös ihjäl', bra: -1, lika: 0.5 },
  { k: 'hunger', namn: 'hungertimmar', bra: -1, lika: 3 },
  { k: 'humor', namn: 'humör', bra: 1, lika: 0.01, tal: v => v.toFixed(3) },
  { k: 'vintermat', namn: 'mat efter vintern', bra: 1, lika: 10 },
  { k: 'vinterved', namn: 'ved efter vintern', bra: 1, lika: 10 },
  { k: 'eld', namn: 'eld brann %', bra: 1, lika: 2 },
];

// den tidigare versionen: en egen utcheckning per commit, med samma node_modules
const bas = git('rev-parse', mot), kort = bas.slice(0, 7);
const andrat = git('status', '--porcelain', '--untracked-files=no', '--', 'src') !== '';
if (git('rev-parse', 'HEAD') === bas && !andrat) { console.log(`Inget att jämföra: koden är samma som ${mot} (${kort}).`); process.exit(0); }
const trad = join(tmpdir(), 'samhalle-jamfor', bas);
if (!existsSync(join(trad, 'src'))) {
  mkdirSync(join(tmpdir(), 'samhalle-jamfor'), { recursive: true });
  git('worktree', 'add', '--detach', '--force', trad, bas);
  symlinkSync(join(ROT, 'node_modules'), join(trad, 'node_modules'));
}
const cacheDir = join(ROT, 'node_modules', '.cache', 'jamfor');
mkdirSync(cacheDir, { recursive: true });
type Ut = { seed: number; n: Nyckeltal; vakter: string[] };
const hash = createHash('sha1');
for (const f of (readdirSync(join(ROT, 'src'), { recursive: true }) as string[]).sort()) { const v = join(ROT, 'src', f); try { hash.update(f).update(readFileSync(v)); } catch { /* en mapp */ } }
const fil = (namn: string) => join(cacheDir, `${namn}-${dagar}.json`);
const las = (namn: string): Record<number, Ut> => existsSync(fil(namn)) ? JSON.parse(readFileSync(fil(namn), 'utf8')) : {};
const forenamn = bas, nunamn = 'nu-' + hash.digest('hex');
const sparat = las(forenamn), sparatNu = las(nunamn);

const korBy = async (dir: string, seed: number): Promise<Ut> => {
  const u = await korProcess(process.execPath, ['--import', 'tsx', join(dir, 'src/test/en.ts'), String(seed), String(dagar)]);
  if (u.code) throw new Error(`by ${seed} (${dir === ROT ? 'nu' : kort}): ${u.err.slice(-500)}`);
  return sistaJson<Ut>(u);
};

// ett 95 %-intervall för snittet av skillnaderna, genom att dra byarna om och om igen (samma dragning varje gång)
function intervall(d: number[]): [number, number, number] {
  const snitt = d.reduce((a, b) => a + b, 0) / d.length;
  let x = 12345;
  const rnd = () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
  const s: number[] = [];
  for (let i = 0; i < 2000; i++) { let t = 0; for (let j = 0; j < d.length; j++) t += d[Math.floor(rnd() * d.length)]; s.push(t / d.length); }
  s.sort((a, b) => a - b);
  return [snitt, s[50], s[1949]];
}
// lika: hela intervallet ligger inom det som inte spelar någon roll; bättre eller sämre: hela intervallet åt ett håll
// ingen stor: hela intervallet ligger inom tre gånger det som inte spelar någon roll
type Dom = 'bättre' | 'sämre' | 'lika' | 'ingen stor' | 'oklart';
function doma(m: typeof MATT[number], lo: number, hi: number): Dom {
  if (lo >= -m.lika && hi <= m.lika) return 'lika';
  if (lo > 0) return m.bra > 0 ? 'bättre' : 'sämre';
  if (hi < 0) return m.bra > 0 ? 'sämre' : 'bättre';
  if (lo >= -3 * m.lika && hi <= 3 * m.lika) return 'ingen stor';
  return 'oklart';
}

const t0 = Date.now();
const par: { seed: number; fore: Ut; nu: Ut }[] = [];
let domar: { m: typeof MATT[number]; d: [number, number, number]; dom: Dom; fore: number; nu: number }[] = [];
while (par.length < maxByar) {
  const seeds = Array.from({ length: SATS }, (_, i) => 1001 + (par.length + i) * 7919);
  const jobb = seeds.flatMap(seed => [
    ...(sparatNu[seed] ? [] : [async () => ({ seed, nu: await korBy(ROT, seed) })]),
    ...(sparat[seed] ? [] : [async () => ({ seed, fore: await korBy(trad, seed) })])]);
  const svar = await pool<{ seed: number; nu?: Ut; fore?: Ut }>(jobb);
  for (const r of svar) { if (r.fore) sparat[r.seed] = r.fore; if (r.nu) sparatNu[r.seed] = r.nu; }
  writeFileSync(fil(forenamn), JSON.stringify(sparat)); writeFileSync(fil(nunamn), JSON.stringify(sparatNu));
  for (const seed of seeds) par.push({ seed, fore: sparat[seed], nu: sparatNu[seed] });
  domar = MATT.map(m => {
    const v = m.v ?? ((n: Nyckeltal) => n[m.k]);
    const ok = par.filter(p => v(p.fore.n) >= 0 && v(p.nu.n) >= 0); // -1 = mättes inte (ingen vinter hann ta slut)
    if (!ok.length) return { m, d: [0, 0, 0] as [number, number, number], dom: 'lika' as Dom, fore: 0, nu: 0 };
    const d = intervall(ok.map(p => v(p.nu.n) - v(p.fore.n)));
    const snitt = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
    return { m, d, dom: doma(m, d[1], d[2]), fore: snitt(ok.map(p => v(p.fore.n))), nu: snitt(ok.map(p => v(p.nu.n))) };
  });
  // minst två omgångar, sedan tills inget är oklart
  if (par.length >= 2 * SATS && domar.every(x => x.dom !== 'oklart')) break;
}

const f = (m: typeof MATT[number], v: number) => (m.tal ?? (x => x.toFixed(1)))(v);
console.log(`Jämfört med ${mot} (${kort})${andrat ? ', med det som inte är committat' : ''}: ${par.length} byar i ${dagar} dygn, snitt per by (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
console.log('                        före       nu   skillnad (95 %)          ');
const MARK: Record<Dom, string> = { bättre: '✓ bättre', sämre: '✗ SÄMRE', lika: '= lika', 'ingen stor': '≈ ingen stor skillnad', oklart: '? oklart' };
for (const { m, d, dom, fore, nu } of domar) {
  const sk = `${d[0] >= 0 ? '+' : ''}${f(m, d[0])} (${f(m, d[1])} … ${f(m, d[2])})`;
  console.log(m.namn.padEnd(22) + f(m, fore).padStart(7) + f(m, nu).padStart(9) + '   ' + sk.padEnd(26) + MARK[dom]);
}
// byar som ändrats mycket: där finns ofta orsaken till en verklig skillnad
// sådana byar finns nästan alltid, åt båda hållen; först när de flesta går åt samma håll säger det något
const stora = par.filter(p => p.fore.n.atergrundad !== p.nu.n.atergrundad || Math.abs(p.nu.n.hunger - p.fore.n.hunger) >= 20 || (p.fore.n.pop < 6) !== (p.nu.n.pop < 6));
const varre = stora.filter(p => p.nu.n.atergrundad - p.fore.n.atergrundad + (p.nu.n.hunger - p.fore.n.hunger) / 50 > 0);
if (stora.length) console.log(`Byar som ändrats mycket: ${varre.length} sämre, ${stora.length - varre.length} bättre (undersök med npm run detaljer -- by)\n  ` + stora.map(p =>
  `${varre.includes(p) ? '✗' : '✓'} by ${p.seed}: utdöd ${p.fore.n.atergrundad} → ${p.nu.n.atergrundad} ggr, hunger ${p.fore.n.hunger} → ${p.nu.n.hunger} h, invånare ${p.fore.n.pop} → ${p.nu.n.pop}`).join('\n  '));
const vakter = par.flatMap(p => p.nu.vakter.filter(v => !p.fore.vakter.includes(v)).map(v => `by ${p.seed}: ${v}`));
console.log(vakter.length ? 'NYA VAKTLARM:\n  ' + vakter.join('\n  ') : 'Inga nya vaktlarm.');
const ms = (k: 'fore' | 'nu') => par.reduce((a, p) => a + p[k].n.ms, 0) / par.length;
console.log(`körtid per by: ${(ms('fore') / 1000).toFixed(0)} s → ${(ms('nu') / 1000).toFixed(0)} s (datorns tid)`);
