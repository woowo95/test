// npm run koll: allt som ska kontrolleras efter en ändring, på en gång och med kort utskrift.
// Typkontroll, de tre testbyarna mot facit, alla scenarier och samma-kollen körs samtidigt. Scenarier som går igenom visas bara
// som en siffra. "Annan utveckling" är väntat när spelet ändrats med avsikt (spara då med npm run facit), annars ett fel.
import { korSkript, scenarioSammanfattning, sek, typkontroll, typRad } from './pool';

const t0 = Date.now();
const [typ, test, scen, samma] = await Promise.all([typkontroll(), korSkript('test.ts'), korSkript('scenario.ts'), korSkript('samma.ts')]);
console.log(typRad(typ));
console.log(test.out.trim() || 'TESTET KRASCHADE:\n' + test.err.slice(-1500));
console.log(scenarioSammanfattning(scen));
console.log(samma.out.split('\n').filter(r => r.trim() && !r.startsWith('(')).join('\n') || 'SAMMA-KOLLEN KRASCHADE:\n' + samma.err.slice(-800));
console.log(`(${sek(t0)} s, datorns tid)`);
if (typ.code || test.code || scen.code) process.exitCode = 1; // samma-kollens "annan utveckling" är väntad efter en ändring i spelet
