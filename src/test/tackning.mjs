// Täckningen för kartan till npm run riktad (kartan.ts, steg 12.1.130): vilka funktioner som kördes, inget mer. Laddas först i
// processen (NODE_OPTIONS=--import, så att också det processen själv startar får den) när TACKNING säger i vilken mapp den ska
// skrivas. V8 räknar då bara om en funktion körts (binär täckning per funktion), inte hur många gånger varje block körts som
// NODE_V8_COVERAGE gör, som gjorde scenarierna ungefär dubbelt så långsamma. Filen skrivs när processen slutar, i samma form
// som NODE_V8_COVERAGE ({ result: [{ url, functions: [{ functionName, ranges: [{ count }] }] }] }).
// Vanlig JavaScript, eftersom den laddas före tsx.
import { Session } from 'node:inspector';
import { writeFileSync } from 'node:fs';

const dir = process.env.TACKNING;
if (dir) {
  const s = new Session();
  s.connect();
  s.post('Profiler.enable');
  s.post('Profiler.startPreciseCoverage', { callCount: false, detailed: false });
  process.on('exit', () => {
    // svaret kommer direkt, i samma tråd, så att filen hinner skrivas innan processen är borta
    s.post('Profiler.takePreciseCoverage', (e, r) => { if (!e) writeFileSync(`${dir}/tackning-${process.pid}-${Date.now()}.json`, JSON.stringify(r)); });
  });
}
