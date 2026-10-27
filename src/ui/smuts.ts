import { FLACKAR, HOUR, W, flackNu, flackarOf } from '../sim';
import { s, ui } from './lage';
import { TS, flackG } from './scen';

// fläckarna på marken (smuts.ts): några oregelbundna prickar i fläckens färg, svagare ju mer den bleknat. Platshållare.
// Ritas om varje kvart i spelet och när en fläck tillkommit eller blivit starkare
let ritad = '';
const plats = (i: number, j: number) => { const h = Math.sin(i * 39.3467 + j * 11.135) * 24634.6345; return h - Math.floor(h); };
const DEF: Record<string, { farg: number }> = FLACKAR;
export function drawFlackar() {
  const fl = flackarOf(s), sist = fl.reduce((a, f) => Math.max(a, f.t), 0);
  const key = `${s.seed},${Math.floor(ui.nu / (HOUR / 4))},${fl.length},${sist}`;
  if (key === ritad) return;
  ritad = key;
  flackG.clear();
  for (const f of fl) {
    const v = flackNu(f, ui.nu), d = DEF[f.k];
    if (v <= 0 || !d) continue;
    const x = (f.i % W) * TS, y = Math.floor(f.i / W) * TS, n = 1 + Math.round(v * 4);
    flackG.beginFill(d.farg, 0.25 + 0.5 * v);
    for (let j = 0; j < n; j++) flackG.drawEllipse(x + 2 + plats(f.i, j) * (TS - 4), y + 2 + plats(f.i, j + 9) * (TS - 4), 0.8 + v * 1.6 * plats(f.i, j + 3) + 0.6, 0.6 + v * 1.1 * plats(f.i, j + 5) + 0.4);
    flackG.endFill();
  }
}
