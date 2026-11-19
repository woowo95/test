// npm run koll: allt som ska kontrolleras efter en ändring, på en gång och med kort utskrift.
// Typkontroll, de tre testbyarna mot facit (med samma-kollen, som jämför hela byns tillstånd i slutet av varje bit, steg
// 10.2.105) och alla scenarier körs samtidigt. Scenarier som går igenom visas bara
// som en siffra. "Annan utveckling" är väntat när spelet ändrats med avsikt. När allt är grönt (typkontrollen, inga vaktlarm,
// ingen krasch och alla scenarier) sparas dagens utfall som nytt facit, så att byarna inte körs en gång till med npm run facit.
// npm run samma (egna byar, för ombyggnad) körs inte här. Kartan för npm run riktad byggs under scenarierna (kartan.ts).
// Typfel, en krasch eller ett vaktlarm i testbyarna gör resten meningslöst: då stoppas det som går genast, och felkoden blir
// ALLVARLIGT, så att kedjan stannar. Ett rött scenario eller en iakttagare samlas, och felkoden blir 1 (testkedjan efter v530).
import './utc';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ALLVARLIGT, korSkript, scenarioSammanfattning, sek, stoppaAlla, typkontroll, typRad } from './pool';
import { matUnderTestet } from './matare';
matUnderTestet(); // datorns kärnor och minne under testet (steg 9.2.61)

const rot = (f: string) => fileURLToPath(new URL('../../' + f, import.meta.url));
// utkasten i en egen fil per körning, så att två koll samtidigt (t.ex. i en kopia med länkad node_modules) inte blandas ihop
const DIR = rot('node_modules/.cache/koll/'), FACIT = `${DIR}facit-${process.pid}.json`;
mkdirSync(DIR, { recursive: true });
rmSync(FACIT, { force: true });

const t0 = Date.now();
// varje del tas tid på, så att koll sist kan skriva de fem längsta jobben (steg 9.2.17)
const tid = async <T>(f: Promise<T>) => { const a = Date.now(); const v = await f; return { v, ms: Date.now() - a }; };
let avbrutet = '';
const avbryt = (varfor: string) => { if (!avbrutet) { avbrutet = varfor; stoppaAlla(); } };
const [typT, testT, scenT] = await Promise.all([
  tid(typkontroll().then(u => { if (u.code) avbryt('typfel'); return u; })),
  tid(korSkript('test.ts', ['--utkast', FACIT]).then(u => { if (u.code === ALLVARLIGT || (u.code && !u.out.includes('Vakter: inga fel.'))) avbryt('en krasch eller ett vaktlarm i testbyarna'); return u; })),
  tid(korSkript('scenario.ts', ['--karta'])),
]);
const typ = typT.v, test = testT.v, scen = scenT.v;
console.log(typRad(typ));
if (avbrutet) {
  // det som stoppades har inget att säga: bara felet som stoppade det skrivs ut
  if (avbrutet !== 'typfel') console.log(test.out.split('\n').filter(r => !r.startsWith('@@jobb ')).join('\n').trim() || 'TESTET KRASCHADE:\n' + test.err.slice(-1500));
  console.log(`AVBRUTET efter ${sek(t0)} s (datorns tid): ${avbrutet}. Scenarierna stoppades, eftersom resten inte säger något förrän det är rättat. Facit sparas inte.`);
  rmSync(FACIT, { force: true }); rmSync(FACIT + '.byar/', { recursive: true, force: true });
  await new Promise(r => process.stdout.write('', r)); // utskriften till en pipe hinner annars inte ut före exit (den tappade allt efter 64 kB)
  process.exit(ALLVARLIGT);
}
const jobbRad = test.out.split('\n').find(r => r.startsWith('@@jobb '));
console.log(test.out.split('\n').filter(r => !r.startsWith('@@jobb ')).join('\n').trim() || 'TESTET KRASCHADE:\n' + test.err.slice(-1500));
console.log(scenarioSammanfattning(scen));
// nytt facit bara när allt är grönt; utkastet finns bara om testbyarna gick utan krasch och vaktlarm
const gront = !typ.code && !test.code && !scen.code && existsSync(FACIT);
if (gront) {
  copyFileSync(FACIT, rot('test/facit.json'));
  // byarna i slutet av bitarna blir de sparade byarna som nästa körning börjar bitarna från (steg 9.2.17)
  const byar = rot('test/facit-byar/');
  if (existsSync(FACIT + '.byar/')) { rmSync(byar, { recursive: true, force: true }); mkdirSync(byar, { recursive: true }); for (const f of readdirSync(FACIT + '.byar/')) copyFileSync(FACIT + '.byar/' + f, byar + f); }
  console.log('Allt grönt: nytt facit sparat (test/facit.json och test/facit-byar/).');
} else console.log('Facit sparas inte, eftersom något är rött.');
rmSync(FACIT, { force: true });
rmSync(FACIT + '.byar/', { recursive: true, force: true });
// de fem längsta jobben: testbyarnas bitar, scenarierna (processorns tid ur deras rader) och typkontrollen
const jobb: { namn: string; ms: number }[] = [...(jobbRad ? JSON.parse(jobbRad.slice(7)) : []), { namn: 'typkontrollen', ms: typT.ms }];
for (const m of scen.out.matchAll(/^(?:OK|FEL) +(\S+) \((\d+) s\)/gm)) jobb.push({ namn: 'scenariot ' + m[1], ms: +m[2] * 1000 });
const langst = 'De fem längsta jobben: ' + jobb.sort((a, b) => b.ms - a.ms).slice(0, 5).map(j => `${j.namn} ${Math.round(j.ms / 1000)} s`).join(', ') + '.';
console.log(langst);
console.log(`(${sek(t0)} s, datorns tid)`);
// tidsvakten (steg 10.2.103, Testerna och deras tid i fliken Läget): testet ska ta högst GRANS_MIN minuter i klocktid. Det
// avbryts inte och inga tester stryks; larmet säger att nästa steg blir att göra spelet eller testerna snabbare
const GRANS_MIN = 20, min = (Date.now() - t0) / 60_000;
if (min > GRANS_MIN) console.log(`TIDSVAKT: det stora testet tog ${Math.round(min)} min klocktid, mer än gränsen ${GRANS_MIN} min (datorns tid). ${langst} Gör spelet eller testerna snabbare (Testerna och deras tid i fliken Läget).`);
process.exitCode = typ.code || test.code === ALLVARLIGT ? ALLVARLIGT : test.code || scen.code ? 1 : 0; // "annan utveckling" är väntad efter en ändring i spelet
