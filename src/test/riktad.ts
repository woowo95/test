// npm run riktad -- [--mot ref] [--visa] [scenarier]: den riktade kollen. Kör bara de scenarier som använder det som ändrats sedan ref
// (HEAD om inget anges, alltså det som inte är committat; --mot HEAD~1 efter en commit), också de långa, och dessutom
// typkontrollen och, när simuleringen ändrats, vakterna i fyra byar under de första 12 dygnen (12 år i spelet) som i snabbkollen.
// --visa skriver bara vilka scenarier som skulle köras. npm run riktad -- --karta bygger om kartan: alla scenarier körs en gång med V8:s täckning (vilka funktioner de kör), ca 4 min
// datorns tid. Kartan sparas i node_modules/.cache/riktad och är inte med i git.
// Så väljs scenarierna: en ändrad rad hör till den innersta funktionen med namn runt den; de scenarier som körde den funktionen
// körs. En rad utanför alla funktioner (ett register, ett balansblock) eller i en funktion som kartan inte känner (en ny)
// väljer alla scenarier som körde någon funktion i filen. En ändring inne i ett scenario väljer det scenariot, och scenarier
// som saknas i kartan (nya) körs alltid. Kartan blir gammal när koden ändras: bygg om den efter det stora testet.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { korJson, korSkript, pool, scenarioSammanfattning, seedAv, sek, typkontroll, typRad } from './pool';
import './scenarier/grund';
import './scenarier/sparning';
import './scenarier/redskap';
import './scenarier/projekt';
import './scenarier/agande';
import './scenarier/behov';
import './scenarier/natur';
import './scenarier/byggnader';
import './scenarier/folk';
import './scenarier/kontroll';
import { SCENARIER } from './scenarier/hjalp';

const ROT = fileURLToPath(new URL('../../', import.meta.url));
const CACHE = ROT + 'node_modules/.cache/riktad/', KARTA = CACHE + 'karta.json';
const BYAR = [0, 1, 2, 3].map(seedAv), DAGAR = 12;
// funktioner som V8 räknar men som inte är koden: modulen själv, tsx:s hjälpare och klassernas initierare
const BRUS = new Set(['', '__name', '<static_initializer>']);
interface Karta { commit: string; funk: string[]; scen: Record<string, { f: number[] }> } // funk: "fil#namn"

const git = (...a: string[]) => execFileSync('git', a, { cwd: ROT, encoding: 'utf8' });
const arg = process.argv.slice(2), t0 = Date.now();

if (arg[0] === '--karta') {
  // alla scenarier, de långa först, med täckningen i en egen mapp per scenario som läses och tas bort direkt
  const namn = Object.keys(SCENARIER).sort((a, b) => Number(!!SCENARIER[b]!.lang) - Number(!!SCENARIER[a]!.lang));
  const funk: string[] = [], nr = new Map<string, number>(), scen: Karta['scen'] = {}, fel: string[] = [];
  await pool(namn.map(n => async () => {
    const dir = `${CACHE}tmp/${n}`;
    rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
    const u = await korSkript('scenario.ts', [n], { ...SCENARIER[n]!.env, NODE_V8_COVERAGE: dir });
    if (u.code) fel.push(n);
    const f = new Set<number>();
    for (const fil of readdirSync(dir)) for (const r of JSON.parse(readFileSync(dir + '/' + fil, 'utf8')).result) {
      const m = /^file:\/\/.*?\/(src\/.*\.ts)$/.exec(r.url);
      if (!m || m[1].startsWith('src/test/')) continue; // testernas egna funktioner körs av alla (läsningen av scenarierna)
      for (const fn of r.functions) if (!BRUS.has(fn.functionName) && fn.ranges[0].count > 0) {
        const k = `${m[1]}#${fn.functionName}`;
        if (!nr.has(k)) { nr.set(k, funk.length); funk.push(k); }
        f.add(nr.get(k)!);
      }
    }
    rmSync(dir, { recursive: true, force: true });
    scen[n] = { f: [...f].sort((a, b) => a - b) };
  }));
  rmSync(CACHE + 'tmp', { recursive: true, force: true });
  writeFileSync(KARTA, JSON.stringify({ commit: git('rev-parse', '--short', 'HEAD').trim(), funk, scen } satisfies Karta));
  console.log(`Kartan byggd: ${namn.length} scenarier och ${funk.length} funktioner (${sek(t0)} s, datorns tid).${fel.length ? ` Misslyckades (kartan har dem ändå): ${fel.join(', ')}` : ''}`);
  process.exit(0);
}

if (!existsSync(KARTA)) { console.log('Ingen karta ännu. Bygg den med: npm run riktad -- --karta'); process.exit(1); }
const karta: Karta = JSON.parse(readFileSync(KARTA, 'utf8'));
const mi = arg.indexOf('--mot'), mot = mi >= 0 ? arg[mi + 1] : 'HEAD';
const visa = arg.includes('--visa'), namnda = arg.filter((a, i) => a !== '--mot' && a !== '--visa' && (mi < 0 || i !== mi + 1));

// de ändrade raderna per fil (i den nya versionen) sedan mot, och de nya filerna som inte är med i git än. En rad som bara är
// en kommentar eller tom räknas inte; borttagna rader räknas på raden där de stod
const kod = (t: string) => { const r = t.trim(); return r !== '' && !r.startsWith('//') && !r.startsWith('/*') && !r.startsWith('*'); };
const andrat = new Map<string, number[]>();
let fil = '', pos = 0, start = 0, bort = false, lagt = false;
const hunkSlut = () => { if (bort && !lagt) andrat.get(fil)!.push(start); bort = lagt = false; }; // bara borttaget: raden där det stod
for (const r of git('diff', '-U0', mot, '--', 'src').split('\n')) {
  if (r.startsWith('diff ')) { hunkSlut(); continue; }
  if (r.startsWith('+++ ')) { fil = r.slice(6); if (!andrat.has(fil)) andrat.set(fil, []); continue; }
  if (r.startsWith('--- ') || r.startsWith('index ') || r.startsWith('new file') || r.startsWith('deleted file')) continue;
  const h = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(r);
  if (h) { hunkSlut(); pos = start = Number(h[1]) + (h[2] === '0' ? 1 : 0); continue; }
  if (r.startsWith('+')) { if (kod(r.slice(1))) { andrat.get(fil)!.push(pos); lagt = true; } pos++; }
  else if (r.startsWith('-') && kod(r.slice(1))) bort = true;
}
hunkSlut();
for (const f of git('ls-files', '--others', '--exclude-standard', 'src').split('\n').filter(Boolean)) andrat.set(f, [-1]);

// funktionerna med namn i en fil och deras rader, de innersta sist
function funktioner(path: string) {
  const sf = ts.createSourceFile(path, readFileSync(ROT + path, 'utf8'), ts.ScriptTarget.Latest, true), ut: { a: number; b: number; namn: string; scen?: boolean; typ?: boolean }[] = [];
  const rad = (p: number) => sf.getLineAndCharacterOfPosition(p).line + 1;
  const namnPa = (n: ts.Node): string | undefined => {
    if ((ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) && n.name) return n.name.getText(sf);
    if (ts.isGetAccessor(n)) return 'get ' + n.name.getText(sf);
    if (ts.isSetAccessor(n)) return 'set ' + n.name.getText(sf);
    if ((ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && (ts.isVariableDeclaration(n.parent) || ts.isPropertyAssignment(n.parent))) return n.parent.name.getText(sf);
    return undefined;
  };
  const besok = (n: ts.Node) => {
    if (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) { ut.push({ a: rad(n.getStart(sf)), b: rad(n.end), namn: '', typ: true }); return; }
    const namn = namnPa(n);
    if (namn) ut.push({ a: rad(n.getStart(sf)), b: rad(n.end), namn });
    // ett scenario: SCENARIER.namn = { … } eller SCENARIER['namn'] = { … }
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const v = n.left;
      if (ts.isPropertyAccessExpression(v) && v.expression.getText(sf) === 'SCENARIER') ut.push({ a: rad(n.getStart(sf)), b: rad(n.end), namn: v.name.text, scen: true });
      if (ts.isElementAccessExpression(v) && v.expression.getText(sf) === 'SCENARIER' && ts.isStringLiteral(v.argumentExpression)) ut.push({ a: rad(n.getStart(sf)), b: rad(n.end), namn: v.argumentExpression.text, scen: true });
    }
    ts.forEachChild(n, besok);
  };
  besok(sf);
  return ut;
}

// scenarierna som körde någon av funktionerna (index i karta.funk)
const korde = (f: Set<number>) => Object.keys(karta.scen).filter(n => karta.scen[n]!.f.some(i => f.has(i)));
const valda = new Set<string>(namnda.filter(n => SCENARIER[n]));
const skal: string[] = [], otackt: string[] = [];
let alla = false, sim = false;
for (const [f, rader] of andrat) {
  if (!f.endsWith('.ts')) continue;
  if (f.startsWith('src/sim') || f === 'src/test/kor.ts') sim = true;
  // testernas gemensamma delar: alla scenarier
  if (['src/test/scenarier/hjalp.ts', 'src/test/kor.ts', 'src/test/scenario.ts', 'src/test/pool.ts'].includes(f)) { alla = true; skal.push(`${f}: alla`); continue; }
  if (f.startsWith('src/test/') && !f.startsWith('src/test/scenarier/')) continue; // andra testverktyg (jamfor, balans …)
  const fns = existsSync(ROT + f) ? funktioner(f) : [];
  const iFil = karta.funk.flatMap((k, i) => k.startsWith(f + '#') ? [i] : []);
  // hela filen: de scenarier som körde någon funktion i den. En fil i simuleringen där inget scenario kör en funktion (ett
  // register som saker.ts) läses av allt: alla scenarier
  const hela = () => { const v = iFil.length || !f.startsWith('src/sim') ? korde(new Set(iFil)) : Object.keys(karta.scen); v.forEach(n => valda.add(n)); return v; };
  if (rader[0] === -1) { const v = hela(); skal.push(`${f}: ny fil (${v.length})`); if (!v.length && !f.startsWith('src/test/')) otackt.push(f); continue; }
  for (const r of new Set(rader)) {
    const runt = fns.filter(x => x.a <= r && r <= x.b).sort((x, y) => (y.a - x.a) || (x.b - y.b)); // innersta först
    if (runt.some(x => x.typ)) continue; // bara typer: typkontrollen räcker
    const sc = runt.find(x => x.scen);
    if (sc && SCENARIER[sc.namn]) { valda.add(sc.namn); continue; }
    if (f.startsWith('src/test/scenarier/')) { // en hjälpfunktion i scenariernas fil: alla scenarier i filen
      const v = fns.filter(x => x.scen && SCENARIER[x.namn]).map(x => x.namn);
      v.forEach(n => valda.add(n)); skal.push(`${f}:${r} utanför scenarierna (${v.length})`); continue;
    }
    let traff: Set<number> | undefined, vem = '';
    for (const x of runt.filter(x => !x.scen)) {
      const m = iFil.filter(i => { const n = karta.funk[i]!.slice(f.length + 1); return n === x.namn || n.endsWith('.' + x.namn); });
      if (m.length) { traff = new Set(m); vem = x.namn; break; }
    }
    const v = traff ? korde(traff) : hela();
    v.forEach(n => valda.add(n));
    skal.push(`${f}:${r} ${traff ? vem : 'utanför funktionerna eller ny'} (${v.length})`);
    if (!v.length && !f.startsWith('src/test/')) otackt.push(`${f}:${r}`);
  }
}
const nya = Object.keys(SCENARIER).filter(n => !karta.scen[n]);
nya.forEach(n => valda.add(n));
const kor = alla ? Object.keys(SCENARIER) : Object.keys(SCENARIER).filter(n => valda.has(n));

const bakom = Number(git('rev-list', '--count', `${karta.commit}..HEAD`).trim());
console.log(`Ändrat sedan ${mot}: ${[...andrat.keys()].filter(f => f.endsWith('.ts')).join(', ') || 'inget'}. Kartan är från ${karta.commit}${bakom ? `, ${bakom} commits sedan` : ''}.`);
if (process.env.ALLA) console.log(skal.join('\n'));
console.log(`Scenarier: ${kor.length} av ${Object.keys(SCENARIER).length}${nya.length ? `, nya som kartan inte känner: ${nya.join(', ')}` : ''}.`);
if (otackt.length) console.log(`Inget scenario kör: ${[...new Set(otackt)].slice(0, 12).join(', ')}`);
if (visa) { console.log(kor.join(' ')); process.exit(0); } // --visa: bara vilka som skulle köras
const [typ, scen, byar] = await Promise.all([
  typkontroll(),
  kor.length ? korSkript('scenario.ts', kor) : Promise.resolve(undefined),
  sim ? pool(BYAR.map(seed => () => korJson<{ vakter: string[] }>('en.ts', [String(seed), String(DAGAR)], `BY ${seed}`).catch((e: Error) => e)), 2) : Promise.resolve([]),
]);
console.log(typRad(typ));
if (scen) console.log(scenarioSammanfattning(scen));
const vakter: string[] = [];
let krasch = false;
for (const [i, r] of byar.entries()) {
  if (r instanceof Error) { krasch = true; console.log(r.message); continue; }
  vakter.push(...r.vakter.map(v => `by ${BYAR[i]}: ${v}`));
}
if (sim) console.log(vakter.length ? 'VAKTER LARMAR:\n  ' + vakter.join('\n  ') : `Vakter: inga fel (${BYAR.length} byar i ${DAGAR} dygn).`);
console.log(`(${sek(t0)} s, datorns tid)`);
if (typ.code || scen?.code || krasch || vakter.length) process.exitCode = 1;
