// Provet för steg 9.2.60 (scenariot processgrupp): en process som startar en till och aldrig blir klar stoppas efter
// tidsgränsen, och då stoppas också den den startade. Skriver sista raden som JSON: barnbarnets pid och om det lever kvar
import { korProcess } from './pool';

const kod = "const c = require('child_process').spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' }); console.log(c.pid); setInterval(() => {}, 1000);";
const u = await korProcess(process.execPath, ['-e', kod], {}, 0, 1500);
const pid = Number(u.out.trim().split('\n')[0]);
await new Promise(r => setTimeout(r, 300));
let kvar = false;
try { process.kill(pid, 0); kvar = true; } catch { kvar = false; }
if (kvar) try { process.kill(pid, 'SIGKILL'); } catch { /* */ }
console.log(JSON.stringify({ pid, kvar, stoppad: /stoppad efter/.test(u.err) }));
