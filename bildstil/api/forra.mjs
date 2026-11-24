// Sparar Björns senaste svar med hans egna ord i svar/forra.json, så att de syns på kortet när det ritats om:
// node bildstil/api/forra.mjs <mapp>   (mappen där ArtifactData list sparat samlingen 'val', med eller utan /val på slutet)
// Kör det innan hans dokument tas bort ur 'val'. Ett nytt svar på samma kort ersätter det förra; best-* och del-* hör till
// best- och delskaparna och tas inte med.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const rot = path.dirname(path.dirname(fileURLToPath(import.meta.url))), fil = rot + '/svar/forra.json';
let mapp = process.argv[2]; if (!mapp) { console.error('ange mappen med val-dokumenten'); process.exit(1); }
if (fs.existsSync(mapp + '/val')) mapp += '/val';
const forra = fs.existsSync(fil) ? JSON.parse(fs.readFileSync(fil, 'utf8')) : {};
let n = 0;
for (const f of fs.readdirSync(mapp).filter(f => f.endsWith('.json')).sort()) {
  const id = f.slice(0, -5); if (/^(best|del)-/.test(id)) continue;
  const d = JSON.parse(fs.readFileSync(mapp + '/' + f, 'utf8')); if (!d.svar && !d.kommentar) continue;
  const nu = forra[id];
  if (nu && nu.nar && d.nar && nu.nar > d.nar) continue;
  forra[id] = { svar: d.svar || '', kommentar: (d.kommentar || '').trim(), nar: d.nar || '' }; n++;
}
fs.writeFileSync(fil, JSON.stringify(Object.fromEntries(Object.entries(forra).sort()), null, 1) + '\n');
console.log(n + ' svar sparade i svar/forra.json');
