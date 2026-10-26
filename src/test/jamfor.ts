// npm run jamfor -- [dygn = 35] [byar] [--mot main | en version som v43 | en commit | --satt … | --svep …]
// Jämför koden som den är nu (med det som inte är committat) med en tidigare version, by för by på samma byar.
// Varje by körs i båda versionerna, och skillnaden räknas per by. Det tar bort det mesta av bruset mellan byar
// (en by på en dålig karta är dålig i båda). Byarna körs åtta åt gången tills varje nyckeltal är avgjort:
// klart bättre, klart sämre, lika, eller i varje fall ingen stor skillnad. Då slutar körningen, så det mesta avgörs
// på 16–32 byar och bara det som är oklart körs längre (byar = högst så många, 64 om inget anges).
// Bruset sitter i spelet: små byar står på gränsen till svält, och minsta ändring kan avgöra om en by klarar sig.
// Därför går små skillnader (några hungertimmar) inte att mäta snabbt; testet svarar på om något blivit klart sämre.
// Vilka nyckeltal som jämförs, åt vilket håll de är bättre och hur stor skillnad som spelar roll står i registret
// NYCKELTAL (nyckeltal.ts). Ett tal som bara är information (elden) visas som högre eller lägre, aldrig som bättre eller
// sämre, och styr inte hur länge det körs.
//
// --satt system.namn=tal[,…]: samma byar med koden nu, utan och med de balanstalen (namnen visar npm run talen; en lista
//   skrivs tal/tal/tal). Samma statistik och samma stopp som mot en äldre version: blev det bättre eller sämre med dem?
// --svep system.namn=a/b/c (eller a:b:steg, från a till b): samma byar för varje värde på ett balanstal, och för värdet i
//   koden. En tabell med en kolumn per värde och medianen per by (och den sämsta byn för döda, svält och kyla); det värde
//   som skiljer sig mest från koden markeras på varje rad. Inget stopp: byar = byar per värde, 16 om inget anges.
// BALANS före kommandot gäller alla körningar (båda versionerna, eller utan och med --satt).
//
// Resultaten sparas i node_modules/.cache/jamfor, så att en by aldrig körs två gånger med samma kod: den tidigare
// versionens per commit, och den nuvarandes per innehållet i det som avgör byarna (en.ts och allt den importerar,
// tsconfig.json och node-versionen). En ändring i scenarierna eller gränssnittet kör alltså inte om något. Balanstalen
// står i filnamnet, så körningen utan dem är densamma för jamfor, --satt och --svep.
// 35 dygn räcker för grundandet och den första vintern (istiden tar slut efter 34 dygn).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { korProcess, pool, seedAv, sek, sistaJson } from './pool';
import { NYCKELTAL, Matt, Nyckeltal, STOR, median, medel, snittTal, vardeAv } from './nyckeltal';

const ROT = fileURLToPath(new URL('../..', import.meta.url));
const SATS = 8; // byar per omgång
const SVEP_BYAR = 16; // byar per värde i --svep, om inget anges
const SVEP_MAX = 12; // högst så många värden i ett svep
const VINTER_DYGN = 35; // först efter så många dygn har den första istiden tagit slut, så att mat och ved efter vintern mäts
// "byar som ändrats mycket": så här många hungertimmar mer eller mindre är mycket, så många hungertimmar väger lika
// mycket som en by som dör ut, och under så många invånare är byn liten
const MYCKET_HUNGER = 20, HUNGER_PER_UTDOD = 50, LITEN_BY = 6;

const stopp = (text: string): never => { console.log(text); process.exit(1); };
const git = (...a: string[]) => execFileSync('git', a, { cwd: ROT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

// argumenten
const arg = process.argv.slice(2);
const flagga = (namn: string) => {
  const i = arg.indexOf(namn);
  if (i < 0) return undefined;
  const v = arg.splice(i, 2)[1];
  return v === undefined || v.startsWith('--') ? stopp(`${namn} behöver ett värde (se kommentaren överst i src/test/jamfor.ts).`) : v;
};
const motArg = flagga('--mot'), satt = flagga('--satt'), svep = flagga('--svep');
if ([motArg, satt, svep].filter(x => x !== undefined).length > 1) stopp('--mot, --satt och --svep går inte att blanda.');
const tal = arg.map(Number);
if (tal.length > 2 || tal.some(x => !Number.isInteger(x) || x < 1)) stopp(`Okänt: ${arg.join(' ')}. Skriv npm run jamfor -- [dygn] [byar] [--mot … | --satt … | --svep …].`);
const [dagar = 35, byar = svep ? SVEP_BYAR : 64] = tal;

// balanstalen (BALANS i src/sim/balans.ts): namn → tal eller lista, varje namn en gång (det sista gäller, som i balans.ts)
type Tal = number | readonly number[];
type Satt = Map<string, Tal>;
const BAS = (process.env.BALANS ?? '').trim();
const visaTal = (v: Tal) => Array.isArray(v) ? v.join('/') : String(v);
function lasBalans(text: string, kalla: string): Satt {
  const m: Satt = new Map();
  for (const del of text.split(',')) {
    if (!del.trim()) continue;
    const [namn, v, ...rest] = del.split('=').map(x => x.trim());
    const t = (v ?? '').split('/').map(x => x.trim() ? Number(x) : NaN);
    if (!namn || !v || rest.length || t.some(x => !Number.isFinite(x))) stopp(`${kalla}: "${del}" ska vara system.namn=tal (eller tal/tal/tal för en lista).`);
    m.set(namn, t.length === 1 ? t[0] : t);
  }
  return m;
}
// som text för BALANS, i bokstavsordning, så att samma tal alltid ger samma cache
const balansText = (m: Satt) => [...m].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${k}=${visaTal(v)}`).join(',');
const blanda = (...m: Satt[]): Satt => new Map(m.flatMap(x => [...x]));
// balanstalen som de är nu (i koden, med BALANS), per fullt namn. Simuleringen laddas bara för --satt och --svep
async function talenNu(): Promise<Record<string, Tal>> {
  const { balansTal, okandaBalans } = await import('../sim');
  const okanda = okandaBalans();
  if (okanda.length) stopp(`BALANS: inget balanstal heter ${okanda.join(', ')} (se npm run talen).`);
  const alla: Record<string, Tal> = {};
  for (const [sys, t] of Object.entries(balansTal())) for (const [k, v] of Object.entries(t)) alla[sys + '.' + k] = v;
  return alla;
}
const kollaNamn = (kalla: string, namn: string, nu: Record<string, Tal>) => nu[namn] ?? stopp(`${kalla}: inget balanstal heter ${namn} (se npm run talen -- ${namn.split('.')[0]}).`);

// det som avgör hur byarna går med koden nu: en.ts och allt den importerar, fil för fil, och tsconfig.json och node-versionen
function kodHash(): string {
  const filer = new Set<string>(), ko = [join(ROT, 'src/test/en.ts')];
  const hitta = (dir: string, s: string) => {
    const p = resolve(dir, s);
    for (const f of [p, p + '.ts', join(p, 'index.ts')]) if (existsSync(f) && statSync(f).isFile()) return f;
    return stopp(`jamfor: hittar inte '${s}', som importeras i ${relative(ROT, dir)}.`);
  };
  while (ko.length) {
    const f = ko.pop()!;
    if (filer.has(f)) continue;
    filer.add(f);
    for (const [, s] of readFileSync(f, 'utf8').matchAll(/(?:from|import)\s*\(?\s*['"](\.\.?\/[^'"]+)['"]/g)) ko.push(hitta(dirname(f), s));
  }
  const h = createHash('sha1').update(process.version);
  for (const f of [...filer, join(ROT, 'tsconfig.json')].sort()) h.update(relative(ROT, f)).update(readFileSync(f));
  return 'nu-' + h.digest('hex');
}

// en sida är en kod och en uppsättning balanstal, med de byar som redan körts
type Ut = { seed: number; n: Nyckeltal; vakter: string[] };
interface Sida { namn: string; dir: string; balans: string; fil: string; ut: Record<number, Ut> }
const cacheDir = join(ROT, 'node_modules', '.cache', 'jamfor');
mkdirSync(cacheDir, { recursive: true });
function sida(namn: string, dir: string, kod: string, balans: string): Sida {
  let b = balans.replace(/[^\w.=,-]/g, '_');
  if (b.length > 100) b = createHash('sha1').update(balans).digest('hex');
  const fil = join(cacheDir, `${kod}${balans ? '-med-' + b : ''}-${dagar}.json`);
  return { namn, dir, balans, fil, ut: existsSync(fil) ? JSON.parse(readFileSync(fil, 'utf8')) : {} };
}
let korda = 0;
// kör de byar som inte redan är sparade, för alla sidor samtidigt, och sparar dem (också om någon by kraschar)
async function kor(sidor: Sida[], seeds: number[]) {
  const fel: string[] = [];
  await pool(sidor.flatMap(s => seeds.filter(seed => !s.ut[seed]).map(seed => async () => {
    const u = await korProcess(process.execPath, ['--import', 'tsx', join(s.dir, 'src/test/en.ts'), String(seed), String(dagar)], { BALANS: s.balans });
    if (u.code) fel.push(`by ${seed} (${s.namn}): ${u.err.slice(-500)}`);
    else { s.ut[seed] = sistaJson<Ut>(u); korda++; }
  })));
  for (const s of new Set(sidor)) writeFileSync(s.fil, JSON.stringify(s.ut));
  if (fel.length) stopp('BYAR KRASCHADE:\n' + fel.join('\n'));
}

// ett 95 %-intervall för snittet av skillnaderna, genom att dra byarna om och om igen (samma dragning varje gång)
function intervall(d: number[]): [number, number, number] {
  const snitt = medel(d);
  let x = 12345;
  const rnd = () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
  const s: number[] = [];
  for (let i = 0; i < 2000; i++) { let t = 0; for (let j = 0; j < d.length; j++) t += d[Math.floor(rnd() * d.length)]; s.push(t / d.length); }
  s.sort((a, b) => a - b);
  return [snitt, s[50], s[1949]];
}
// lika: hela intervallet ligger inom det som inte spelar någon roll; bättre eller sämre: hela intervallet åt ett håll
// (högre eller lägre för ett tal som bara är information); ingen stor: hela intervallet ligger inom STOR gånger det som inte
// spelar någon roll. Ej mätt: ingen by mätte talet (mat och ved efter vintern på färre än 35 dygn)
type Dom = 'bättre' | 'sämre' | 'högre' | 'lägre' | 'lika' | 'ingen stor' | 'oklart' | 'ej mätt';
function doma(m: Matt, lo: number, hi: number): Dom {
  const lika = m.lika!;
  if (lo >= -lika && hi <= lika) return 'lika';
  if (lo > 0) return m.bra > 0 ? 'bättre' : m.bra < 0 ? 'sämre' : 'högre';
  if (hi < 0) return m.bra > 0 ? 'sämre' : m.bra < 0 ? 'bättre' : 'lägre';
  if (lo >= -STOR * lika && hi <= STOR * lika) return 'ingen stor';
  return 'oklart';
}
const MARK: Record<Dom, string> = { bättre: '✓ bättre', sämre: '✗ SÄMRE', högre: '↑ högre', lägre: '↓ lägre', lika: '= lika', 'ingen stor': '≈ ingen stor skillnad', oklart: '? oklart', 'ej mätt': '– ej mätt' };
const JAMFORS = NYCKELTAL.filter(m => m.lika !== undefined);

// två sidor by för by (en äldre version mot koden nu, eller utan mot med --satt), tills varje nyckeltal är avgjort
async function jamforTva(a: Sida, b: Sida, rubrik: (byar: string) => string, detaljer: string) {
  const t0 = Date.now();
  type Par = { seed: number; a: Ut; b: Ut };
  const par: Par[] = [];
  let rader: { m: Matt; d: [number, number, number]; dom: Dom; a: number; b: number; n: number }[] = [];
  while (par.length < byar) {
    const seeds = Array.from({ length: Math.min(SATS, byar - par.length) }, (_, i) => seedAv(par.length + i));
    await kor([a, b], seeds);
    for (const seed of seeds) par.push({ seed, a: a.ut[seed], b: b.ut[seed] });
    rader = JAMFORS.map(m => {
      const ok = par.flatMap(p => { const x = vardeAv(m, p.a.n), y = vardeAv(m, p.b.n); return x === undefined || y === undefined ? [] : [[x, y]]; });
      if (!ok.length) return { m, d: [0, 0, 0], dom: 'ej mätt', a: 0, b: 0, n: 0 };
      const d = intervall(ok.map(([x, y]) => y - x));
      return { m, d, dom: doma(m, d[1], d[2]), a: medel(ok.map(x => x[0])), b: medel(ok.map(x => x[1])), n: ok.length };
    });
    // minst två omgångar, sedan tills inget är oklart (det som bara är information räknas inte)
    if (par.length >= 2 * SATS && rader.every(r => r.m.bra === 0 || r.dom !== 'oklart')) break;
  }

  console.log(rubrik(`${par.length} byar i ${dagar} dygn (${dagar} år i spelet), snitt per by (${sek(t0)} s, datorns tid)`));
  console.log(''.padEnd(22) + a.namn.padStart(7) + b.namn.padStart(9) + '   skillnad (95 %)');
  for (const r of rader) {
    const f = (v: number) => snittTal(r.m, v);
    const sk = r.n ? `${r.d[0] >= 0 ? '+' : ''}${f(r.d[0])} (${f(r.d[1])} … ${f(r.d[2])})` : '';
    const extra = (r.m.bra === 0 ? ' (bara information)' : '') + (r.n && r.n < par.length ? ` (mätt i ${r.n} byar)` : '');
    console.log(r.m.namn.padEnd(22) + (r.n ? f(r.a) : '–').padStart(7) + (r.n ? f(r.b) : '–').padStart(9) + '   ' + sk.padEnd(26) + MARK[r.dom] + extra);
  }
  const info = JAMFORS.filter(m => m.bra === 0).map(m => m.namn);
  if (info.length) console.log(`Bara information, aldrig bättre eller sämre, och styr inte hur länge det körs: ${info.join(', ')} (elden är ett verktyg, inte ett mål).`);
  if (dagar < VINTER_DYGN && JAMFORS.some(m => m.saknas)) console.log(`Obs: mat och ved efter vintern mäts först när den första istiden tagit slut, efter ${VINTER_DYGN - 1} dygn. Kör minst ${VINTER_DYGN} dygn för att mäta dem.`);
  // byar som ändrats mycket: där finns ofta orsaken till en verklig skillnad
  // sådana byar finns nästan alltid, åt båda hållen; först när de flesta går åt samma håll säger det något
  const liten = (u: Ut) => u.n.pop < LITEN_BY ? 1 : 0;
  const stora = par.filter(p => p.a.n.atergrundad !== p.b.n.atergrundad || Math.abs(p.b.n.hunger - p.a.n.hunger) >= MYCKET_HUNGER || liten(p.a) !== liten(p.b));
  // sämre: fler gånger utdöd, mer hunger, eller krympt under LITEN_BY invånare (och tvärtom)
  const varre = stora.filter(p => p.b.n.atergrundad - p.a.n.atergrundad + (p.b.n.hunger - p.a.n.hunger) / HUNGER_PER_UTDOD + liten(p.b) - liten(p.a) > 0);
  if (stora.length) console.log(`Byar som ändrats mycket: ${varre.length} sämre, ${stora.length - varre.length} bättre (undersök med ${detaljer} -- by)\n  ` + stora.map(p =>
    `${varre.includes(p) ? '✗' : '✓'} by ${p.seed}: utdöd ${p.a.n.atergrundad} → ${p.b.n.atergrundad} ggr, hunger ${p.a.n.hunger} → ${p.b.n.hunger} h, invånare ${p.a.n.pop} → ${p.b.n.pop}`).join('\n  '));
  const vakter = par.flatMap(p => p.b.vakter.filter(v => !p.a.vakter.includes(v)).map(v => `by ${p.seed}: ${v}`));
  console.log(vakter.length ? 'NYA VAKTLARM:\n  ' + vakter.join('\n  ') : 'Inga nya vaktlarm.');
  const ms = (k: 'a' | 'b') => medel(par.map(p => p[k].n.ms));
  console.log(`körtid per by: ${(ms('a') / 1000).toFixed(0)} s → ${(ms('b') / 1000).toFixed(0)} s (datorns tid)`);
}

// den tidigare versionen: en egen utcheckning per commit, med samma node_modules
// en version (v43) är den senaste commit vars meddelande säger "(v43)", som när den publicerades: först i den här
// grenens historia, sedan i alla grenar (en version som publicerats på main efter att grenen gjordes)
function hittaCommit(mot: string): string {
  if (/^v\d+$/.test(mot)) {
    const sok = (var_: string) => git('log', '-1', '--format=%H', '--fixed-strings', `--grep=(${mot})`, var_);
    return sok('HEAD') || sok('--branches') || stopp(`Hittar ingen commit som säger "(${mot})", varken i den här grenen eller i någon annan.`);
  }
  try { return git('rev-parse', '--verify', mot + '^{commit}'); } catch { return stopp(`Hittar ingen gren, version (som v43) eller commit som heter '${mot}'.`); }
}

async function motVersion(mot: string) {
  const bas = hittaCommit(mot), kort = bas.slice(0, 7);
  const andrat = git('status', '--porcelain', '--untracked-files=no', '--', 'src') !== '';
  if (git('rev-parse', 'HEAD') === bas && !andrat) { console.log(`Inget att jämföra: koden är samma som ${mot} (${kort}).`); process.exit(0); }
  const trad = join(tmpdir(), 'samhalle-jamfor', bas);
  if (!existsSync(join(trad, 'src'))) {
    mkdirSync(join(tmpdir(), 'samhalle-jamfor'), { recursive: true });
    git('worktree', 'add', '--detach', '--force', trad, bas);
    symlinkSync(join(ROT, 'node_modules'), join(trad, 'node_modules'));
  }
  const bal = balansText(lasBalans(BAS, 'BALANS'));
  await jamforTva(sida('före', trad, bas, bal), sida('nu', ROT, kodHash(), bal),
    t => `Jämfört med ${mot} (${kort})${andrat ? ', med det som inte är committat' : ''}${bal ? `, med BALANS=${bal} i båda` : ''}: ${t}`, 'npm run detaljer');
}

async function medSatt(text: string) {
  const nu = await talenNu(), extra = lasBalans(text, '--satt'), bas = lasBalans(BAS, 'BALANS');
  if (!extra.size) stopp('--satt: inga balanstal angivna.');
  for (const [k, v] of extra) {
    const i = kollaNamn('--satt', k, nu);
    if (Array.isArray(i) !== Array.isArray(v) || (Array.isArray(i) && i.length !== (v as readonly number[]).length)) stopp(`--satt: ${k} ska ha samma form som i koden (${visaTal(i)}).`);
  }
  const forut = [...extra.keys()].map(k => `${k} = ${visaTal(nu[k])}`).join(', ');
  if ([...extra].every(([k, v]) => visaTal(v) === visaTal(nu[k]))) { console.log(`Inget att jämföra: ${forut} gäller redan.`); process.exit(0); }
  const kod = kodHash(), utan = balansText(bas), med = balansText(blanda(bas, extra));
  await jamforTva(sida('utan', ROT, kod, utan), sida('med', ROT, kod, med),
    t => `Med ${balansText(extra)} jämfört med utan (nu ${forut})${utan ? `, med BALANS=${utan} i båda` : ''}: ${t}`, `BALANS="${med}" npm run detaljer`);
}

async function medSvep(text: string) {
  const t0 = Date.now();
  const nu = await talenNu(), bas = lasBalans(BAS, 'BALANS');
  const [namn, spec, ...rest] = text.split('=').map(x => x.trim());
  if (!namn || !spec || rest.length) stopp(`--svep: "${text}" ska vara system.namn=a/b/c eller system.namn=a:b:steg.`);
  const kodV = kollaNamn('--svep', namn, nu);
  if (typeof kodV !== 'number') return stopp(`--svep prövar ett tal i taget, och ${namn} är en lista (${visaTal(kodV)}). Pröva hela listor med --satt.`);
  let varden: number[];
  if (spec.includes(':')) {
    const [a, b, steg, ...mer] = spec.split(':').map(x => x.trim() ? Number(x) : NaN);
    if (mer.length || ![a, b, steg].every(Number.isFinite) || !(steg > 0) || b < a) stopp(`--svep: "${spec}" ska vara a:b:steg, med a ≤ b och steg > 0.`);
    // avrundat, så att 0,2 + 3 · 0,05 blir 0,35 och inte 0,35000000000000003
    varden = Array.from({ length: Math.floor((b - a) / steg + 1e-9) + 1 }, (_, i) => +(a + i * steg).toPrecision(12));
  } else varden = spec.split('/').map(x => x.trim() ? Number(x) : NaN);
  if (!varden.every(Number.isFinite)) stopp(`--svep: "${spec}" ska vara tal (a/b/c eller a:b:steg).`);
  varden = [...new Set([...varden, kodV])].sort((a, b) => a - b);
  if (varden.length > SVEP_MAX) stopp(`--svep: ${varden.length} värden är för många (högst ${SVEP_MAX}).`);
  const kod = kodHash(), kodI = varden.indexOf(kodV);
  const sidor = varden.map(v => sida(String(v), ROT, kod, balansText(v === kodV ? bas : blanda(bas, new Map([[namn, v]])))));
  const seeds = Array.from({ length: byar }, (_, i) => seedAv(i));
  await kor(sidor, seeds);

  const B = 10; // kolumnbredd
  console.log(`Svep av ${namn} (${visaTal(kodV)} nu, markerat *)${bas.size ? ` med BALANS=${balansText(bas)}` : ''}: ${byar} byar per värde i ${dagar} dygn (${dagar} år i spelet), median per by`);
  console.log('värde'.padEnd(22) + varden.map((v, i) => (String(v) + (i === kodI ? '*' : ' ')).padStart(B)).join(''));
  // en rad: ett värde per kolumn, och det som skiljer sig mest från värdet nu markeras (✓ bättre, ✗ sämre, · bara information)
  const rad = (m: Matt, etikett: string, varde: (v: number[]) => number) => {
    const cell = sidor.map(s => { const v = seeds.map(seed => vardeAv(m, s.ut[seed].n)).filter((x): x is number => x !== undefined); return v.length ? varde(v) : undefined; });
    const k = cell[kodI];
    const avst = cell.map(c => c === undefined || k === undefined ? 0 : Math.abs(c - k)), mest = avst.indexOf(Math.max(...avst));
    const mark = (i: number) => i !== mest || !avst[i] ? ' ' : m.bra === 0 ? '·' : (cell[i]! - k!) * m.bra > 0 ? '✓' : '✗';
    console.log(etikett.padEnd(22) + cell.map((c, i) => ((c === undefined ? '–' : snittTal(m, c, 0)) + mark(i)).padStart(B)).join(''));
  };
  for (const m of NYCKELTAL.filter(m => !m.dator)) {
    rad(m, m.namn, m.andel ? medel : median);
    if (m.samst) rad(m, '  sämsta by', v => m.bra < 0 ? Math.max(...v) : Math.min(...v));
  }
  const tid = sidor.map(s => median(seeds.map(seed => s.ut[seed].n.ms)) / 1000);
  console.log('körtid per by, s'.padEnd(22) + tid.map(t => (t.toFixed(1) + ' ').padStart(B)).join(''));
  console.log('✓ bättre, ✗ sämre, · bara information: det värde på raden som skiljer sig mest från värdet nu (*).');
  console.log('Medianen av få byar är brusig: pröva ett värde som ser bra ut med --satt, som räknar skillnaden by för by.');
  if (dagar < VINTER_DYGN) console.log(`Obs: mat och ved efter vintern mäts först när den första istiden tagit slut, efter ${VINTER_DYGN - 1} dygn.`);
  const vakter = sidor.flatMap(s => seeds.flatMap(seed => s.ut[seed].vakter.map(v => `${namn}=${s.namn}, by ${seed}: ${v}`)));
  console.log(vakter.length ? 'VAKTLARM:\n  ' + vakter.join('\n  ') : 'Inga vaktlarm.');
  console.log(`(${sek(t0)} s, datorns tid: ${korda} byar kördes, ${sidor.length * byar - korda} fanns sparade)`);
}

if (satt !== undefined) await medSatt(satt);
else if (svep !== undefined) await medSvep(svep);
else await motVersion(motArg ?? 'main');
