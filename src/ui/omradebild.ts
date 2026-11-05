import * as PIXI from 'pixi.js';
// Gränsen för byns område i testläget (steg 6.2.3, "Byns område (Området)" i designdokumentet): en tunn streckad linje
// längs rutornas kanter där en ruta innanför byn möter en utanför. Björns val i bildstilen (version 1): vita prickar (ben,
// ljusaste tonen), varannan punkt, så att marken syns mellan dem. Ritas om bara när området ändras eller testläget slås på eller av
import { H, W, omrade } from '../sim';
import { farg, fargTal } from '../palett';
import { s, ui } from './lage';
import { TS, filterG, lagerEfter } from './scen';

export const omradeG = new PIXI.Graphics();
lagerEfter(omradeG, filterG);
const FARG = fargTal(farg('ben', 3)), STRECK = 1, MELLAN = 1;

let ritad: number | '' = '';
export function drawOmrade() {
  const o = ui.testMode && s ? omrade(s) : undefined, key = o ? o.key : '';
  if (key === ritad) return;
  ritad = key;
  omradeG.clear();
  if (!o) return;
  const inne = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && o.inne[y * W + x] === 1;
  omradeG.beginFill(FARG);
  // en kant i taget: längs x (överkant och underkant) och längs y (vänster och höger), streckad i hela punkter
  const streck = (x0: number, y0: number, lodrat: boolean) => {
    for (let i = 0; i < TS; i += STRECK + MELLAN) lodrat ? omradeG.drawRect(x0, y0 + i, 1, STRECK) : omradeG.drawRect(x0 + i, y0, STRECK, 1);
  };
  for (let y = o.y0; y <= o.y1; y++) for (let x = o.x0; x <= o.x1; x++) {
    if (!inne(x, y)) continue;
    if (!inne(x, y - 1)) streck(x * TS, y * TS, false);
    if (!inne(x, y + 1)) streck(x * TS, (y + 1) * TS - 1, false);
    if (!inne(x - 1, y)) streck(x * TS, y * TS, true);
    if (!inne(x + 1, y)) streck((x + 1) * TS - 1, y * TS, true);
  }
  omradeG.endFill();
}
