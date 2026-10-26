// Kör en by och mäter människornas avtryck på naturen (steg 1.7.2). Skriver måtten som JSON (används av natur.ts).
// utan = inga korgar, spjut, metspön eller knivar (de tas bort så fort de görs)
import { STEG_DYGN, STEG_TIM, korBy, markStat } from './kor';
import { ACTS, Act, campDist, fyndAt, skogAndel, vaxerAt, living, tingOf, ageIndex, housesOf, DAY, H, W, State } from '../sim';
import { foodDays } from '../sim/ekonomi';
import { SPJUT } from '../sim/redskap';

const [seed, dagar] = process.argv.slice(2).map(Number), utan = process.argv[4] === 'utan';
const BORT = new Set<string>(['korg', 'metspo', 'kniv', ...SPJUT]);
const NARA = 12, SKOG_R = 15; // rutor från lägret
const VAXT = ['bar', 'kantarell', 'rotter'] as const;
const MAT = new Set((Object.keys(ACTS) as Act[]).filter(a => ACTS[a].resurs)); // arbeten på en plats vars förråd tar slut: samla, jakt, fiske
let husDag = -1, mdSum = 0, mdN = 0, kvarSum = 0, kvarN = 0, gangSum = 0, gangN = 0, steg = 0, skog0 = -1;
const skogNara = (s: State) => skogAndel(s, i => campDist(s, i % W, Math.floor(i / W)) < SKOG_R);
const r = korBy(seed, dagar, s => {
  if (utan && tingOf(s).some(t => BORT.has(t.k))) s.ting = tingOf(s).filter(t => !BORT.has(t.k));
  if (skog0 < 0) skog0 = skogNara(s);
  if (husDag < 0 && housesOf(s).some(h => h.klar)) husDag = (s.now - s.founded) / DAY;
  if (++steg % STEG_TIM) return; // en gång i timmen
  if (steg > STEG_DYGN * 5) { const fd = foodDays(s); mdSum += fd; mdN++; }
  for (const p of living(s)) if (p.task?.phase === 'do' && MAT.has(p.task.act)) { gangSum += campDist(s, p.x, p.y); gangN++; }
  if (steg % STEG_DYGN || ageIndex(s) === 0) return; // en gång om dygnet, utom i istiden
  let har = 0, kan = 0;
  for (let i = 0; i < W * H; i++) {
    if (campDist(s, i % W, Math.floor(i / W)) >= NARA) continue;
    for (const k of VAXT) { har += fyndAt(s, k, i); kan += vaxerAt(s, k, i); }
  }
  if (kan > 0) { kvarSum += har / kan; kvarN++; }
});
const s = r.s, stig = markStat(s).bar; // stigar: bar jord utan ungskog (markslag i mark.ts)
console.log(JSON.stringify({ seed, pop: r.n.pop, svalt: r.n.svalt, utvandrade: r.n.utvandrade, fodda: r.n.fodda, hunger: r.n.hunger, vintermat: r.n.vintermat, doda: r.n.doda,
  kvar: kvarN ? kvarSum / kvarN : 1, gang: gangN ? gangSum / gangN : 0, skog0, skog: skogNara(s), stig, fallda: s.fallda ?? 0, hus: housesOf(s).filter(h => h.klar).length, husDag: husDag < 0 ? dagar : husDag, matdagar: mdN ? mdSum / mdN : 0, vakter: r.vakter.length, larm: r.vakter }));
