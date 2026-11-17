// Provet för steg 9.2.60 (scenariot processgrupp): en process som startar en till och aldrig blir klar stoppas efter
// tidsgränsen, och då stoppas också den den startade. Och pulsen (testkedjan efter v530): en by som hängt sig stoppas när inget
// slag räknats på en stund (här HANGT_S = 4 s), men en långsam by som räknar slag längre än så stoppas inte.
// Skriver sista raden som JSON: barnbarnets pid, om det lever kvar och hur det gick för byarna
import { readFileSync } from 'node:fs';
import { korProcess, korSkript } from './pool';

// en stoppad process som ingen har hämtat (en zombie) lever inte: i en behållare i molnet hämtar process 1 inte barnen, och då
// finns pid:et kvar fast processen är stoppad. /proc finns bara i Linux; annars gäller svaret från kill
const zombie = (pid: number) => { try { return readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ').pop()?.[0] === 'Z'; } catch { return false; } };

const kod = "const c = require('child_process').spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' }); console.log(c.pid); setInterval(() => {}, 1000);";
const u = await korProcess(process.execPath, ['-e', kod], {}, 0, 1500);
const pid = Number(u.out.trim().split('\n')[0]);
await new Promise(r => setTimeout(r, 300));
let kvar = false;
try { process.kill(pid, 0); kvar = !zombie(pid); } catch { kvar = false; }
if (kvar) try { process.kill(pid, 'SIGKILL'); } catch { /* */ }
process.env.HANGT_S = '4';
const [hang, langsam] = await Promise.all([korSkript('pulsprov.ts', ['hang']), korSkript('pulsprov.ts', ['langsam', '10'])]);
console.log(JSON.stringify({ pid, kvar, stoppad: /stoppad efter/.test(u.err), hangStoppad: /hängde sig/.test(hang.err), langsamKlar: !langsam.code && langsam.out.includes('klar') }));
