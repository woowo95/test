// npm run snabbkoll -- [scenarier]: den snabba kollen efter varje steg (ca en halv minut, datorns tid).
// Typkontroll, alla scenarier utom de långa (och de långa som nämns, t.ex. npm run snabbkoll -- gava ved) och vakterna i
// fyra byar under de första 12 dygnen (12 år i spelet, knappt två veckor i verkligheten). Den hittar fel medan de är färska.
// Den mäter inte balansen och jämför inget med facit: det gör det stora testet efter en grupp steg (npm run koll, jamfor, likhet).
import { fileURLToPath } from 'node:url';
import { korProcess, korSkript, pool, sistaJson } from './pool';

const BYAR = [1001, 8920, 16839, 24758], DAGAR = 12;
const tsc = fileURLToPath(new URL('../../node_modules/typescript/bin/tsc', import.meta.url));
const t0 = Date.now();
const [typ, scen, byar] = await Promise.all([
  korProcess(process.execPath, [tsc, '-p', fileURLToPath(new URL('../../', import.meta.url))]),
  korSkript('scenario.ts', ['--snabb', ...process.argv.slice(2)]),
  pool(BYAR.map(seed => () => korSkript('en.ts', [String(seed), String(DAGAR)])), 2),
]);
const rader = (t: string) => t.split('\n').filter(r => r.trim());
console.log(typ.code ? 'TYPFEL:\n' + rader(typ.out).slice(0, 20).join('\n') : 'Typkontroll: inga fel.');
const sr = rader(scen.out), ok = sr.filter(r => r.startsWith('OK')).length;
const fel = sr.filter(r => !r.startsWith('OK') && !r.includes('scenario misslyckades') && !r.startsWith('(hoppade'));
console.log(`Scenarier: ${ok} av ${ok + sr.filter(r => r.startsWith('FEL')).length} OK.${fel.length ? '\n' + fel.join('\n') : ''}${scen.code && !sr.length ? '\nSCENARIERNA KRASCHADE:\n' + scen.err.slice(-1500) : ''}`);
console.log(sr.find(r => r.startsWith('(hoppade')) ?? '');
const vakter: string[] = [];
let krasch = false;
for (const [i, u] of byar.entries()) {
  if (u.code) { krasch = true; console.log(`BY ${BYAR[i]} KRASCHADE:\n${u.err.slice(-1500)}`); continue; }
  vakter.push(...sistaJson<{ vakter: string[] }>(u).vakter.map(v => `by ${BYAR[i]}: ${v}`));
}
console.log(vakter.length ? 'VAKTER LARMAR:\n  ' + vakter.join('\n  ') : `Vakter: inga fel (${BYAR.length} byar i ${DAGAR} dygn).`);
console.log(`(${((Date.now() - t0) / 1000).toFixed(0)} s, datorns tid)`);
if (typ.code || scen.code || krasch || vakter.length) process.exitCode = 1;
