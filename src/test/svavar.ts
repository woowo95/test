// npm run svavar -- [byar] [timmar] (steg 11.1.74): det som svävar. Varje uttag ur en stack i förrådet där den som tar står mer än
// två rutor från stacken räknas, per arbete och sak, med det längsta avståndet. Inget av det ska finnas när allt bärs hela vägen
import { createState, lyssnaPaUttag } from '../sim';
import { START } from './kor';
import { kor } from './scenarier/hjalp';
const [byar = 3, timmar = 24] = process.argv.slice(2).map(Number);
const per = new Map<string, { n: number; langt: number; max: number }>();
lyssnaPaUttag((_s, p, k, _n, x, y) => {
  if (!p) return;
  const key = `${p.task?.act ?? 'ingen uppgift'}: ${k}`, d = Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y), e = per.get(key) ?? { n: 0, langt: 0, max: 0 };
  e.n++; if (d > 2) { e.langt++; e.max = Math.max(e.max, d); }
  per.set(key, e);
});
for (let b = 1; b <= byar; b++) kor(createState(b, START), timmar);
const rader = [...per].filter(([, e]) => e.langt).sort((a, b) => b[1].langt - a[1].langt);
console.log(`${byar} byar i ${timmar} timmar (${timmar} timmar är ${(timmar / 24).toFixed(1)} år i spelet): uttag mer än två rutor från den som tar`);
for (const [k, e] of rader) console.log(`  ${k.padEnd(34)} ${e.langt} av ${e.n}, längst ${e.max.toFixed(0)} rutor`);
if (!rader.length) console.log('  Inget svävar.');
process.exitCode = rader.length ? 1 : 0;
