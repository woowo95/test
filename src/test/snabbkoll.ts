// npm run snabbkoll -- [scenarier]: den snabba kollen efter varje steg (ca 40 s, datorns tid).
// Typkontroll, alla scenarier utom de långa (och de långa som nämns, t.ex. npm run snabbkoll -- gava ved) och vakterna i
// fyra byar under de första 12 dygnen (12 år i spelet, knappt två veckor i verkligheten). Den hittar fel medan de är färska.
// Den mäter inte balansen och jämför inget med facit: det gör det stora testet efter en grupp steg (npm run koll, jamfor, likhet).
import { korJson, korSkript, pool, scenarioSammanfattning, seedAv, sek, typkontroll, typRad } from './pool';

const BYAR = [0, 1, 2, 3].map(seedAv), DAGAR = 12;
const t0 = Date.now();
const [typ, scen, byar] = await Promise.all([
  typkontroll(),
  korSkript('scenario.ts', ['--snabb', ...process.argv.slice(2)]),
  pool(BYAR.map(seed => () => korJson<{ vakter: string[] }>('en.ts', [String(seed), String(DAGAR)], `BY ${seed}`).catch((e: Error) => e)), 2),
]);
console.log(typRad(typ));
console.log(scenarioSammanfattning(scen));
const vakter: string[] = [];
let krasch = false;
for (const [i, r] of byar.entries()) {
  if (r instanceof Error) { krasch = true; console.log(r.message); continue; }
  vakter.push(...r.vakter.map(v => `by ${BYAR[i]}: ${v}`));
}
console.log(vakter.length ? 'VAKTER LARMAR:\n  ' + vakter.join('\n  ') : `Vakter: inga fel (${BYAR.length} byar i ${DAGAR} dygn).`);
console.log(`(${sek(t0)} s, datorns tid)`);
if (typ.code || scen.code || krasch || vakter.length) process.exitCode = 1;
