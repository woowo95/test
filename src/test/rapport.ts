// npm run rapport -- mapp [id] (steg 12.1.41, Att hitta felen: Rapporten): rapporterna Det här är konstigt som en chatt hämtat ur
// spelets databas med ArtifactData och out_dir (samlingarna rapporter och rapportfil, som filer under mappen). Utan id listas
// rapporterna. Med id skrivs rapporten, och byn sätts ihop ur bitarna till mapp/<id>.json, som läses med npm run by
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Rapport } from '../ui/konstigt';

const [mapp, id] = process.argv.slice(2);
if (!mapp) { console.log('Användning: npm run rapport -- mapp [id]'); process.exit(1); }
// ett dokument som ArtifactData sparat: fälten ligger direkt eller under data
const doc = <T>(f: string): T => { const o = JSON.parse(readFileSync(f, 'utf8')); return (o && typeof o === 'object' && 'data' in o && o.data && typeof o.data === 'object' ? o.data : o) as T; };
const rmapp = join(mapp, 'rapporter'), fmapp = join(mapp, 'rapportfil');
if (!existsSync(rmapp)) { console.log(`Ingen mapp ${rmapp}. Hämta först med ArtifactData list, collection rapporter, out_dir ${mapp}.`); process.exit(1); }
const alla = readdirSync(rmapp).filter(f => f.endsWith('.json')).map(f => doc<Rapport>(join(rmapp, f))).sort((a, b) => a.t - b.t);
if (!id) {
  for (const r of alla) console.log(`${r.id}  ${new Date(r.t).toISOString().slice(0, 16)}  by ${r.seed}  ${r.valt.ruta}: ${r.valt.vad}  "${r.text}"`);
  process.exit(0);
}
const r = alla.find(x => x.id === id);
if (!r) { console.log(`Ingen rapport ${id}.`); process.exit(1); }
console.log(JSON.stringify({ ...r, forrad: undefined, behov: undefined }, null, 1));
console.log(`\nFörråden:\n  ${r.forrad}\n\nÖppna behov:\n  ${r.behov}`);
const bitar: string[] = [];
for (let i = 0; i < r.filBitar; i++) {
  const f = join(fmapp, `${id}-${i}.json`);
  if (!existsSync(f)) { console.log(`\nBit ${i} saknas (${f}). Hämta med ArtifactData query, collection rapportfil, where r == ${id}, out_dir ${mapp}.`); process.exit(1); }
  bitar.push(doc<{ t: string }>(f).t);
}
const ut = join(mapp, `${id}.json`);
writeFileSync(ut, bitar.join(''));
console.log(`\nByn: ${ut} (läs med npm run by -- ${ut})`);
