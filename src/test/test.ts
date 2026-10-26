// npm test: tre byar i 90 dygn, en rad per by. Jämför med facit och skriver bara ut det som ändrats.
// npm run facit sparar dagens resultat som nytt facit. Byarna körs samtidigt i egna processer.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { DOK_KB, rad, Resultat } from './kor';
import { NYCKELTAL, Nyckeltal } from './nyckeltal';
import { korJson, pool } from './pool';

const FACIT = new URL('../../test/facit.json', import.meta.url);
const BYAR = [1, 42, 777], DAGAR = 90;
// hur mycket ett tal får ändras innan det räknas som en ändring står i registret (facit i nyckeltal.ts):
// körtiden jämförs inte och sparfilens storlek får variera lite; allt annat ska vara exakt lika
const lika = (a: number, b: number) => a === b;

type Ut = Pick<Resultat, 'seed' | 'n' | 'vakter'>;
const res = await pool(BYAR.map(seed => () => korJson<Ut>('en.ts', [String(seed), String(DAGAR)], `by ${seed}`)
  .catch((e: Error) => { console.log(e.message); process.exit(1); })));
for (const r of res) console.log(rad(r));
// återgrundning skrivs alltid ut, så att det syns om en by dött ut och börjat om
const ater = res.filter(r => r.n.atergrundad > 0);
const storst = Math.max(...res.map(r => r.n.delKb));
if (storst > DOK_KB * 0.75) console.log(`VARNING: en del av sparfilen är ${storst} KB, och ett dokument i molnet rymmer ${DOK_KB} KB. Delen sparas i bitar, men dela gärna upp den (DELAR i steg.ts).`);
console.log(ater.length ? 'ÅTERGRUNDADE BYAR: ' + ater.map(r => `by ${r.seed} (${r.n.atergrundad} ggr)`).join(', ') : 'Återgrundade byar: inga.');

const nu: Record<string, Nyckeltal> = {};
for (const r of res) nu[r.seed] = r.n;
const vakter = res.flatMap(r => r.vakter.map(v => `by ${r.seed}: ${v}`));
if (process.argv.includes('--spara')) {
  // en by där något omöjligt hänt blir inte facit (och npm run facit stannar då före samma-kollen)
  if (vakter.length) console.log('Facit sparas inte, eftersom vakterna larmar (se nedan).');
  else { writeFileSync(FACIT, JSON.stringify(nu, null, 1) + '\n'); console.log('Facit sparat.'); }
} else if (!existsSync(FACIT)) {
  console.log('Inget facit ännu. Spara med: npm run facit');
} else {
  const facit: Record<string, Nyckeltal> = JSON.parse(readFileSync(FACIT, 'utf8'));
  const andr: string[] = [];
  for (const r of res) {
    const f = facit[r.seed];
    if (!f) { andr.push(`by ${r.seed}: saknas i facit`); continue; }
    const d = NYCKELTAL.filter(m => !(m.facit ?? lika)(r.n[m.k], f[m.k])).map(m => `${m.kort} ${f[m.k]} → ${r.n[m.k]}`);
    if (d.length) andr.push(`by ${r.seed}: ${d.join(', ')}`);
  }
  console.log(andr.length ? 'Ändrat mot facit:\n  ' + andr.join('\n  ') : 'Facit: oförändrat.');
}

console.log(vakter.length ? 'VAKTER LARMAR:\n  ' + vakter.join('\n  ') : 'Vakter: inga fel.');
if (vakter.length) process.exitCode = 1;
