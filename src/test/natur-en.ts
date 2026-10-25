// Kör en by och mäter människornas avtryck på naturen (steg 1.7.2). Skriver måtten som JSON (används av natur.ts).
// utan = inga korgar, spjut, metspön eller knivar (de tas bort så fort de görs)
import { korBy } from './kor';
import { FOREST, isSoil } from '../sim/vag';
import { campDist, fyndAt, groundOf, vaxerAt, living, tingOf, ageIndex, housesOf, H, W, State } from '../sim';
import { foodDays } from '../sim/ekonomi';
import { SPJUT } from '../sim/redskap';

const [seed, dagar] = process.argv.slice(2).map(Number), utan = process.argv[4] === 'utan';
const BORT = new Set<string>(['korg', 'metspo', 'kniv', ...SPJUT]);
const NARA = 12, SKOG_R = 15; // rutor från lägret
const VAXT = ['bar', 'kantarell', 'rotter'] as const;
let mdSum = 0, mdN = 0, kvarSum = 0, kvarN = 0, gangSum = 0, gangN = 0, steg = 0, skog0 = -1;
const skogNara = (s: State) => {
  const g = groundOf(s); let n = 0, f = 0;
  for (let i = 0; i < W * H; i++) if (isSoil(g.tiles[i]) && campDist(s, i % W, Math.floor(i / W)) < SKOG_R) { n++; if (g.trees[i] >= FOREST) f++; }
  return n ? f / n : 0;
};
const r = korBy(seed, dagar, s => {
  if (utan && tingOf(s).some(t => BORT.has(t.k))) s.ting = tingOf(s).filter(t => !BORT.has(t.k));
  if (skog0 < 0) skog0 = skogNara(s);
  if (++steg % 12) return; // en gång i timmen
  if (steg > 288 * 5) { const fd = foodDays(s); mdSum += fd; mdN++; }
  for (const p of living(s)) if (p.task?.phase === 'do' && ['samla', 'jakt', 'fiske'].includes(p.task.act)) { gangSum += campDist(s, p.x, p.y); gangN++; }
  if (steg % 288 || ageIndex(s) === 0) return; // en gång om dygnet, utom i istiden
  let har = 0, kan = 0;
  for (let i = 0; i < W * H; i++) {
    if (campDist(s, i % W, Math.floor(i / W)) >= NARA) continue;
    for (const k of VAXT) { har += fyndAt(s, k, i); kan += vaxerAt(s, k, i); }
  }
  if (kan > 0) { kvarSum += har / kan; kvarN++; }
});
const s = r.s, g = groundOf(s);
let stig = 0;
for (let i = 0; i < W * H; i++) if (isSoil(g.tiles[i]) && g.cover[i] < 0.3 && g.trees[i] < FOREST) stig++;
console.log(JSON.stringify({ seed, pop: r.n.pop, svalt: r.n.svalt, utvandrade: r.n.utvandrade, fodda: r.n.fodda, hunger: r.n.hunger, vintermat: r.n.vintermat, doda: r.n.doda,
  kvar: kvarN ? kvarSum / kvarN : 1, gang: gangN ? gangSum / gangN : 0, skog0, skog: skogNara(s), stig, fallda: s.fallda ?? 0, hus: housesOf(s).filter(h => h.klar).length, matdagar: mdN ? mdSum / mdN : 0, vakter: r.vakter.length, larm: r.vakter }));
