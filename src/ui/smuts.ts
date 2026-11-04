import { fargTal, narmast, rasterPa } from '../palett';
import { FLACKAR, HOUR, W, blodOf, flackNu, flackarOf } from '../sim';
import { ritaBlod } from './blod';
import { s, ui } from './lage';
import { TS, flackG } from './scen';

// fläckarna på marken (smuts.ts): några oregelbundna prickar i fläckens färg, svagare ju mer den bleknat (platshållare).
// Toa-fläcken har en egen bild (TOA), och blodet ritas av blod.ts. Ritas om varje kvart i spelet och när en fläck tillkommit
// eller blivit starkare
let ritad = '';
const plats = (i: number, j: number) => { const h = Math.sin(i * 39.3467 + j * 11.135) * 24634.6345; return h - Math.floor(h); };
const DEF: Record<string, { farg: number }> = FLACKAR;
// toa-fläcken (Björn valde stankslingan efter v89): en brun hög med en grön lukt som stiger upp när den är färsk, sedan bara
// en brun fläck utan lukt som bleknar. Från den starkaste: från vilken styrka bilden gäller, raderna (8 × 8 punkter på rutan)
// och färgerna med genomskinlighet
const TOA: { fran: number; rader: string[]; farg: Record<string, [number, number]> }[] = [
  { fran: 0.7, rader: ['....v...', '..Vv....', '.V..v...', '..V..v..', '....v...', '...cCc..', '..kccck.'], farg: { v: [0x898b4c, 0.85], V: [0x898b4c, 0.45], c: [0x5e3c24, 1], C: [0x7d5b40, 1], k: [0x3f2415, 1] } },
  { fran: 0.3, rader: ['', '', '', '', '', '...hhh..', '..hhhhh.'], farg: { h: [0x5e3c24, 0.55] } },
  { fran: 0, rader: ['', '', '', '', '', '', '...n.n..'], farg: { n: [0x5e3c24, 0.26] } },
];
const P = TS / 8;
function toaBild(x: number, y: number, v: number) {
  const b = TOA.find(t => v > t.fran) ?? TOA[TOA.length - 1];
  b.rader.forEach((r, j) => [...r].forEach((k, i) => { const f = b.farg[k]; if (f && (f[1] >= 1 || rasterPa(f[1], i + j * 3, j))) flackG.beginFill(f[0]).drawRect(x + i * P, y + j * P, P, P).endFill(); }));
}
export function drawFlackar() {
  const fl = flackarOf(s), bl = blodOf(s), sist = fl.reduce((a, f) => Math.max(a, f.t), 0), blodSist = bl.reduce((a, b) => a + b.t + b.m, 0);
  const key = `${s.seed},${Math.floor(ui.nu / (HOUR / 4))},${fl.length},${sist},${bl.length},${blodSist}`;
  if (key === ritad) return;
  ritad = key;
  flackG.clear();
  ritaBlod(flackG);
  for (const f of fl) {
    const v = flackNu(f, ui.nu), d = DEF[f.k];
    if (v <= 0 || !d) continue;
    const x = (f.i % W) * TS, y = Math.floor(f.i / W) * TS, n = 1 + Math.round(v * 4);
    if (f.k === 'toa') { toaBild(x, y, v); continue; }
    flackG.beginFill(fargTal(narmast('#' + d.farg.toString(16).padStart(6, '0')))); // närmaste färg i paletten; en blek fläck har färre och mindre prickar
    for (let j = 0; j < n; j++) flackG.drawEllipse(x + 2 + plats(f.i, j) * (TS - 4), y + 2 + plats(f.i, j + 9) * (TS - 4), 0.8 + v * 1.6 * plats(f.i, j + 3) + 0.6, 0.6 + v * 1.1 * plats(f.i, j + 5) + 0.4);
    flackG.endFill();
  }
}
