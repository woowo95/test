// nålen på kartan (steg 10.2.63): ett tryck på en lärdoms plats i personens kunskap flyttar kameran dit och sätter en nål
// mitt i lärdomens område. Den står kvar tills man trycker på platsen igen eller på en annan. Björns nål ur bildstilen (kartnal,
// steg 12.6.1), i hela punkter (16 per ruta)
import * as PIXI from 'pixi.js';
import { KARTBILDER } from '../kartbilder';
import { fargTal } from '../palett';
import { ui } from './lage';
import { TS, labels, lagerEfter, world } from './scen';

export const nalG = new PIXI.Graphics();
lagerEfter(nalG, labels);
// punkterna och färgerna ur bildstilen; spetsen är den nedersta punkten, mitt i den raden
const NAL = KARTBILDER.kartnal, RADER = NAL.rader.slice(0, NAL.rader.length - [...NAL.rader].reverse().findIndex(r => /[^.]/.test(r)));
const FARG: Record<string, number> = Object.fromEntries(Object.entries(NAL.pal).map(([c, f]) => [c, fargTal(f)]));
const SPETS = (() => { const r = RADER[RADER.length - 1], xs = [...r].flatMap((c, x) => c !== '.' ? [x] : []); return Math.round((xs[0] + xs[xs.length - 1]) / 2); })();
let ritad = '';
export function drawNal() {
  // i hela punkter, k gånger större när man zoomat ut, så att nålen syns minst ungefär 20 punkter hög på skärmen hur man än zoomat
  const n = ui.nal, k = Math.max(1, Math.ceil(1 / world.scale.x)), key = n ? `${n.x},${n.y},${k}` : '';
  if (key === ritad) return;
  ritad = key;
  nalG.clear();
  if (!n) return;
  const x0 = Math.round(n.x * TS) - SPETS * k, y0 = Math.round(n.y * TS) - (RADER.length - 1) * k;
  RADER.forEach((r, y) => [...r].forEach((c, x) => { if (FARG[c] !== undefined) nalG.beginFill(FARG[c]).drawRect(x0 + x * k, y0 + y * k, k, k).endFill(); }));
}
