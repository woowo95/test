// npm test: tre byar i 90 dygn, en rad per by. Jämför med facit och skriver bara ut det som ändrats.
// npm run facit sparar dagens resultat som nytt facit.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { korBy, rad, Nyckeltal } from './kor';

const FACIT = new URL('../../test/facit.json', import.meta.url);
const BYAR = [1, 42, 777], DAGAR = 90;
// hur mycket ett tal får ändras innan det räknas som en ändring (tid och storlek varierar mellan körningar)
const TOL: Partial<Record<keyof Nyckeltal, (a: number, b: number) => boolean>> = {
  ms: (a, b) => Math.abs(a - b) <= Math.max(500, b * 0.3),
  kb: (a, b) => Math.abs(a - b) <= Math.max(2, b * 0.1),
};

const res = BYAR.map(seed => korBy(seed, DAGAR));
for (const r of res) console.log(rad(r));

const nu: Record<string, Nyckeltal> = {};
for (const r of res) nu[r.seed] = r.n;
if (process.argv.includes('--spara')) {
  writeFileSync(FACIT, JSON.stringify(nu, null, 1) + '\n');
  console.log('Facit sparat.');
} else if (!existsSync(FACIT)) {
  console.log('Inget facit ännu. Spara med: npm run facit');
} else {
  const facit: Record<string, Nyckeltal> = JSON.parse(readFileSync(FACIT, 'utf8'));
  const andr: string[] = [];
  for (const r of res) {
    const f = facit[r.seed];
    if (!f) { andr.push(`by ${r.seed}: saknas i facit`); continue; }
    const d = (Object.keys(r.n) as (keyof Nyckeltal)[]).filter(k => !(TOL[k] ?? ((a, b) => a === b))(r.n[k], f[k])).map(k => `${k} ${f[k]} → ${r.n[k]}`);
    if (d.length) andr.push(`by ${r.seed}: ${d.join(', ')}`);
  }
  console.log(andr.length ? 'Ändrat mot facit:\n  ' + andr.join('\n  ') : 'Facit: oförändrat.');
}

const vakter = res.flatMap(r => r.vakter.map(v => `by ${r.seed}: ${v}`));
console.log(vakter.length ? 'VAKTER LARMAR:\n  ' + vakter.join('\n  ') : 'Vakter: inga fel.');
if (vakter.length) process.exitCode = 1;
