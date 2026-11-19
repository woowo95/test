// npm run snabbkoll -- [scenarier]: den snabba kollen efter varje steg (ca 40 s, datorns tid).
// Typkontroll, alla scenarier utom de långa (och de långa som nämns, t.ex. npm run snabbkoll -- gava ved) och vakterna i
// fyra byar under de första 12 dygnen (12 år i spelet, knappt två veckor i verkligheten). Den hittar fel medan de är färska.
// Den mäter inte balansen och jämför inget med facit: det gör det stora testet efter en grupp steg (npm run koll, jamfor, likhet).
import './utc';
import { ALLVARLIGT, korSkript, scenarioSammanfattning, sek, typkontroll, typRad, vaktByar } from './pool';
import { matUnderTestet } from './matare';
matUnderTestet(); // datorns kärnor och minne under testet (steg 9.2.61)

const t0 = Date.now();
const [typ, scen, byar] = await Promise.all([
  typkontroll(),
  korSkript('scenario.ts', ['--snabb', ...process.argv.slice(2)]),
  vaktByar(),
]);
console.log(typRad(typ));
console.log(scenarioSammanfattning(scen));
console.log(byar.text);
console.log(`(${sek(t0)} s, datorns tid)`);
// typfel, en krasch eller ett vaktlarm gör resten meningslöst: kedjan stannar (ALLVARLIGT); ett rött scenario samlas
process.exitCode = typ.code || byar.fel ? ALLVARLIGT : scen.code ? 1 : 0;
