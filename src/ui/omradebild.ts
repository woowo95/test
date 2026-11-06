import * as PIXI from 'pixi.js';
// Gränsen för byns område i testläget (steg 6.2.3, "Byns område (Området)" i designdokumentet): en tunn streckad linje
// längs rutornas kanter där en ruta innanför byn möter en utanför. Björns val i bildstilen (version 1): vita prickar (ben,
// ljusaste tonen), varannan punkt, så att marken syns mellan dem. Ritas om bara när området ändras eller testläget slås på eller av
import { H, W, omrade, straken } from '../sim';
import { farg, fargTal } from '../palett';
import { s, ui } from './lage';
import { TS, filterG, lagerEfter } from './scen';

export const omradeG = new PIXI.Graphics();
lagerEfter(omradeG, filterG);
const FARG = fargTal(farg('ben', 3)), STRECK = 1, MELLAN = 1;
// gångstråken (steg 6.2.5): en tunn linje genom rutornas mitt, och en liten ruta framför varje dörr. Platshållare i paletten
// tills Björn valt i bildstilen (f6_strak)
const STRAK_FARG = fargTal(farg('senap', 2));

let ritad = '';
export function drawOmrade() {
  const o = ui.testMode && s ? omrade(s) : undefined, st = o && s ? straken(s) : undefined, key = o && st ? `${o.key}:${st.key}` : '';
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
  // stråken: från varje ruta en linje till grannen åt höger och nedåt om den också är ett stråk
  const r = st!.ruta, h = TS >> 1;
  omradeG.beginFill(STRAK_FARG);
  for (let y = st!.y0; y <= st!.y1; y++) for (let x = st!.x0; x <= st!.x1; x++) {
    const v = r[y * W + x];
    if (!v) continue;
    const px = x * TS + h, py = y * TS + h;
    omradeG.drawRect(px, py, 1, 1);
    if (x + 1 < W && r[y * W + x + 1]) omradeG.drawRect(px, py, TS, 1);
    if (y + 1 < H && r[(y + 1) * W + x]) omradeG.drawRect(px, py, 1, TS);
    if (v === 2) omradeG.drawRect(px - 2, py - 2, 5, 5);
  }
  omradeG.endFill();
}
