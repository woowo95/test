// npm run koll: allt som ska kontrolleras efter en ändring, på en gång och med kort utskrift.
// Typkontroll, de tre testbyarna mot facit, alla scenarier och samma-kollen körs samtidigt. Scenarier som går igenom visas bara
// som en siffra. "Annan utveckling" är väntat när spelet ändrats med avsikt. När allt är grönt (typkontrollen, inga vaktlarm,
// ingen krasch och alla scenarier) sparas dagens utfall som nytt facit och ny samma-koll, så att byarna inte körs en gång till
// med npm run facit.
import './utc';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { korSkript, scenarioSammanfattning, sek, typkontroll, typRad } from './pool';

const rot = (f: string) => fileURLToPath(new URL('../../' + f, import.meta.url));
// utkasten i en egen fil per körning, så att två koll samtidigt (t.ex. i en kopia med länkad node_modules) inte blandas ihop
const DIR = rot('node_modules/.cache/koll/'), FACIT = `${DIR}facit-${process.pid}.json`, SAMMA = `${DIR}samma-${process.pid}.json`;
mkdirSync(DIR, { recursive: true });
for (const f of [FACIT, SAMMA]) rmSync(f, { force: true });

const t0 = Date.now();
// varje del tas tid på, så att koll sist kan skriva de fem längsta jobben (steg 9.2.17)
const tid = async <T>(f: Promise<T>) => { const a = Date.now(); const v = await f; return { v, ms: Date.now() - a }; };
const [typT, testT, scenT, sammaT] = await Promise.all([tid(typkontroll()), tid(korSkript('test.ts', ['--utkast', FACIT])), tid(korSkript('scenario.ts')), tid(korSkript('samma.ts', ['--utkast', SAMMA]))]);
const typ = typT.v, test = testT.v, scen = scenT.v, samma = sammaT.v;
console.log(typRad(typ));
const jobbRad = test.out.split('\n').find(r => r.startsWith('@@jobb '));
console.log(test.out.split('\n').filter(r => !r.startsWith('@@jobb ')).join('\n').trim() || 'TESTET KRASCHADE:\n' + test.err.slice(-1500));
console.log(scenarioSammanfattning(scen));
console.log(samma.out.split('\n').filter(r => r.trim() && !r.startsWith('(')).join('\n') || 'SAMMA-KOLLEN KRASCHADE:\n' + samma.err.slice(-800));
// nytt facit bara när allt är grönt; utkasten finns bara om testbyarna och samma-kollen gick utan krasch och vaktlarm
const gront = !typ.code && !test.code && !scen.code && existsSync(FACIT) && existsSync(SAMMA);
if (gront) {
  copyFileSync(FACIT, rot('test/facit.json')); copyFileSync(SAMMA, rot('test/samma.json'));
  // byarna i slutet av bitarna blir de sparade byarna som nästa körning börjar bitarna från (steg 9.2.17)
  const byar = rot('test/facit-byar/');
  if (existsSync(FACIT + '.byar/')) { rmSync(byar, { recursive: true, force: true }); mkdirSync(byar, { recursive: true }); for (const f of readdirSync(FACIT + '.byar/')) copyFileSync(FACIT + '.byar/' + f, byar + f); }
  console.log('Allt grönt: nytt facit sparat (test/facit.json, test/facit-byar/ och test/samma.json).');
} else console.log('Facit sparas inte, eftersom något är rött.');
for (const f of [FACIT, SAMMA]) rmSync(f, { force: true });
rmSync(FACIT + '.byar/', { recursive: true, force: true });
// de fem längsta jobben: testbyarnas bitar, scenarierna (processorns tid ur deras rader), typkontrollen och samma-kollen
const jobb: { namn: string; ms: number }[] = [...(jobbRad ? JSON.parse(jobbRad.slice(7)) : []), { namn: 'typkontrollen', ms: typT.ms }, { namn: 'samma-kollen', ms: sammaT.ms }];
for (const m of scen.out.matchAll(/^(?:OK|FEL) +(\S+) \((\d+) s\)/gm)) jobb.push({ namn: 'scenariot ' + m[1], ms: +m[2] * 1000 });
console.log('De fem längsta jobben: ' + jobb.sort((a, b) => b.ms - a.ms).slice(0, 5).map(j => `${j.namn} ${Math.round(j.ms / 1000)} s`).join(', ') + '.');
console.log(`(${sek(t0)} s, datorns tid)`);
if (typ.code || test.code || scen.code) process.exitCode = 1; // samma-kollens "annan utveckling" är väntad efter en ändring i spelet
