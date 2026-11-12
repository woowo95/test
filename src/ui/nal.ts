// nålen på kartan (steg 10.2.63): ett tryck på en lärdoms plats i personens kunskap flyttar kameran dit och sätter en nål
// mitt i lärdomens område. Den står kvar tills man trycker på platsen igen eller på en annan. En platshållare i paletten,
// i hela punkter (16 per ruta), tills bildstilens version är vald
import * as PIXI from 'pixi.js';
import { farg, fargTal } from '../palett';
import { ui } from './lage';
import { TS, labels, lagerEfter, world } from './scen';

export const nalG = new PIXI.Graphics();
lagerEfter(nalG, labels);
// punkterna: huvudet (rost), glansen (ben), nålen (skiffer) och skuggan på marken (kol); x från vänster, y uppifrån, spetsen i (3, 11)
const RADER = ['.HHH.', 'HHgHH', 'HHHHH', 'HHHHH', '.HHH.', '..N..', '..N..', '..N..', '..N..', '..N..', '..N..', '.SSS.'];
const FARG: Record<string, number> = { H: fargTal(farg('rost', 2)), g: fargTal(farg('ben', 3)), N: fargTal(farg('skiffer', 3)), S: fargTal(farg('kol', 0)) };
let ritad = '';
export function drawNal() {
  // i hela punkter, k gånger större (minst två), så att nålen syns minst ungefär 24 punkter hög på skärmen hur man än zoomat
  const n = ui.nal, k = Math.max(2, Math.ceil(2 / world.scale.x)), key = n ? `${n.x},${n.y},${k}` : '';
  if (key === ritad) return;
  ritad = key;
  nalG.clear();
  if (!n) return;
  const x0 = Math.round(n.x * TS) - 2 * k, y0 = Math.round(n.y * TS) - (RADER.length - 1) * k;
  RADER.forEach((r, y) => [...r].forEach((c, x) => { if (FARG[c] !== undefined) nalG.beginFill(FARG[c], c === 'S' ? 0.5 : 1).drawRect(x0 + x * k, y0 + y * k, k, k).endFill(); }));
}
