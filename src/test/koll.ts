// npm run koll: allt som ska kontrolleras efter en ändring, på en gång och med kort utskrift.
// Typkontroll, de tre testbyarna mot facit, alla scenarier och samma-kollen körs samtidigt. Scenarier som går igenom visas bara
// som en siffra. "Annan utveckling" är väntat när spelet ändrats med avsikt (spara då med npm run facit), annars ett fel.
import { fileURLToPath } from 'node:url';
import { korProcess, korSkript } from './pool';

const tsc = fileURLToPath(new URL('../../node_modules/typescript/bin/tsc', import.meta.url));
const t0 = Date.now();
const [typ, test, scen, samma] = await Promise.all([
  korProcess(process.execPath, [tsc, '-p', fileURLToPath(new URL('../../', import.meta.url))]),
  korSkript('test.ts'),
  korSkript('scenario.ts'),
  korSkript('samma.ts'),
]);
const rader = (t: string) => t.split('\n').filter(r => r.trim());
console.log(typ.code ? 'TYPFEL:\n' + rader(typ.out).slice(0, 20).join('\n') : 'Typkontroll: inga fel.');
console.log(test.out.trim() || 'TESTET KRASCHADE:\n' + test.err.slice(-1500));
const sr = rader(scen.out), ok = sr.filter(r => r.startsWith('OK')).length;
const fel = sr.filter(r => !r.startsWith('OK') && !r.includes('scenario misslyckades'));
console.log(`Scenarier: ${ok} av ${ok + sr.filter(r => r.startsWith('FEL')).length} OK.${fel.length ? '\n' + fel.join('\n') : ''}${scen.code && !sr.length ? '\nSCENARIERNA KRASCHADE:\n' + scen.err.slice(-1500) : ''}`);
console.log(samma.out.split('\n').filter(r => r.trim() && !r.startsWith('(')).join('\n') || 'SAMMA-KOLLEN KRASCHADE:\n' + samma.err.slice(-800));
console.log(`(${((Date.now() - t0) / 1000).toFixed(0)} s)`);
if (typ.code || test.code || scen.code) process.exitCode = 1;
