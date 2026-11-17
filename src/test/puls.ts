// Pulsen (testkedjan efter v530): en testprocess som startats av korProcess (pool.ts) får den här filen med --import. Varje gång
// ett slag i spelet räknats (step i src/sim/steg.ts anropar slagPuls), och högst en gång i sekunden (datorns tid), skrivs ett
// tecken på liv i mappen PULS_DIR. Processen som startade den ser då att spelets klocka går, och stoppar den bara om den hängt
// sig (HANGT_MIN i pool.ts). Filen importerar inget från simuleringen, så att inget i den läses in före scenariernas storlek
import { writeFileSync } from 'node:fs';

const dir = process.env.PULS_DIR;
if (dir) {
  const fil = `${dir}/${process.pid}.puls`;
  let sist = 0;
  globalThis.slagPuls = () => {
    const nu = Date.now();
    if (nu - sist < 1000) return;
    sist = nu;
    try { writeFileSync(fil, String(nu)); } catch { /* mappen borta: processen som startade den har slutat */ }
  };
}
