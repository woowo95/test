// npm run koll: allt som ska kontrolleras efter en ändring, på en gång och med kort utskrift.
// Typkontroll, de tre testbyarna mot facit, alla scenarier och samma-kollen körs samtidigt. Scenarier som går igenom visas bara
// som en siffra. "Annan utveckling" är väntat när spelet ändrats med avsikt. När allt är grönt (typkontrollen, inga vaktlarm,
// ingen krasch och alla scenarier) sparas dagens utfall som nytt facit och ny samma-koll, så att byarna inte körs en gång till
// med npm run facit.
import './utc';
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { korSkript, scenarioSammanfattning, sek, typkontroll, typRad } from './pool';

const rot = (f: string) => fileURLToPath(new URL('../../' + f, import.meta.url));
// utkasten i en egen fil per körning, så att två koll samtidigt (t.ex. i en kopia med länkad node_modules) inte blandas ihop
const DIR = rot('node_modules/.cache/koll/'), FACIT = `${DIR}facit-${process.pid}.json`, SAMMA = `${DIR}samma-${process.pid}.json`;
mkdirSync(DIR, { recursive: true });
for (const f of [FACIT, SAMMA]) rmSync(f, { force: true });

const t0 = Date.now();
const [typ, test, scen, samma] = await Promise.all([typkontroll(), korSkript('test.ts', ['--utkast', FACIT]), korSkript('scenario.ts'), korSkript('samma.ts', ['--utkast', SAMMA])]);
console.log(typRad(typ));
console.log(test.out.trim() || 'TESTET KRASCHADE:\n' + test.err.slice(-1500));
console.log(scenarioSammanfattning(scen));
console.log(samma.out.split('\n').filter(r => r.trim() && !r.startsWith('(')).join('\n') || 'SAMMA-KOLLEN KRASCHADE:\n' + samma.err.slice(-800));
// nytt facit bara när allt är grönt; utkasten finns bara om testbyarna och samma-kollen gick utan krasch och vaktlarm
const gront = !typ.code && !test.code && !scen.code && existsSync(FACIT) && existsSync(SAMMA);
if (gront) { copyFileSync(FACIT, rot('test/facit.json')); copyFileSync(SAMMA, rot('test/samma.json')); console.log('Allt grönt: nytt facit sparat (test/facit.json och test/samma.json).'); }
else console.log('Facit sparas inte, eftersom något är rött.');
for (const f of [FACIT, SAMMA]) rmSync(f, { force: true });
console.log(`(${sek(t0)} s, datorns tid)`);
if (typ.code || test.code || scen.code) process.exitCode = 1; // samma-kollens "annan utveckling" är väntad efter en ändring i spelet
