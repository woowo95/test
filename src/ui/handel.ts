import * as PIXI from 'pixi.js';
import { BYTE, SEC, byId, clamp } from '../sim';
import { gaster } from './gaster';
import { iconCanvas } from '../ikoner';
import { s, ui } from './lage';
import { Ikoner, TS, peopleG, pileLayer, world } from './scen';
import { posOf } from './manniskor';

// bytena på kartan (steg 4.4.1.1): filtarna med det som byts, och saken som går från hand till hand i ett litet byte eller en gåva
const filtLayer = new PIXI.Container(), handLayer = new PIXI.Container();
world.addChildAt(filtLayer, world.getChildIndex(pileLayer) + 1);
world.addChildAt(handLayer, world.getChildIndex(peopleG) + 1);
const filtIkoner = new Ikoner(filtLayer), handIkoner = new Ikoner(handLayer);
// gästerna (handlaren och rövarna, gaster.ts) ritas som byborna, en cirkel med skugga och mörk kant (Björn efter v245, steg
// 4.5.2 och 4.5.4.12), i sin egen färg. Den valda får en vit ring som en vald bybo
const framlingG = new PIXI.Graphics();
handLayer.addChild(framlingG);
function cirkel(x: number, y: number, col: number, vald: boolean) {
  const r = 5;
  framlingG.beginFill(0x000000, 0.25).drawEllipse(x, y + r * 0.9, r * 0.9, r * 0.35).endFill();
  framlingG.lineStyle(vald ? 2.5 : 1.2, vald ? 0xffffff : 0x1a1a1a, vald ? 1 : 0.8).beginFill(col).drawCircle(x, y, r).endFill().lineStyle(0);
}
// var en part i ett byte står: en bybo (posOf) eller en gäst, som handlaren (gaster.ts)
function platsAvPart(id: number) {
  const p = id > 0 ? byId(s, id) : undefined;
  return p ? posOf(p) : gaster().find(g => g.id === id);
}
export function drawHandel() {
  filtIkoner.start(); handIkoner.start(); framlingG.clear();
  for (const g of gaster()) cirkel(g.x * TS, g.y * TS, g.farg, g.id === ui.selected);
  for (const f of s.filtar ?? []) {
    if (!f.handlare && f.slut <= ui.nu) continue;
    // handlarens filt och bybornas (Björn valde efter v245: den förra för handlaren och version 1 för byborna, steg 4.5.2)
    const fk = f.handlare ? 'filt' : 'filt_by', x0 = f.x * TS - TS, y0 = f.y * TS - TS / 2, sc = (2 * TS) / iconCanvas(fk).width;
    filtIkoner.add(fk, x0, y0 - TS / 2, sc);
    // sakerna på filten: en part per filt (steg 4.5.4.13) över hela filten; en filt från före v267 har var partens på sin halva
    const vems = [...new Set(f.varor.map(v => v.fran))], kol = vems.length > 1 ? 2 : 4;
    f.varor.forEach((v, i) => {
      const sida = vems.indexOf(v.fran), n = f.varor.filter((w, j) => j < i && w.fran === v.fran).length;
      filtIkoner.add(v.k, x0 + 2 + sida * TS + (n % kol) * 6, y0 - 4 + Math.floor(n / kol) * 5, 6 / (iconCanvas(v.k).width || 8));
    });
  }
  for (const o of s.overl ?? []) {
    const f = (ui.nu - o.t) / (BYTE.overlSek * SEC);
    if (f < 0 || f > 1) continue;
    const a = platsAvPart(o.a), b = platsAvPart(o.b);
    if (!a || !b) continue;
    const k = clamp(f, 0, 1), x = (a.x + (b.x - a.x) * k) * TS, y = (a.y + (b.y - a.y) * k) * TS - 6 - Math.sin(k * Math.PI) * 4;
    handIkoner.add(o.k, x - 3, y - 3, 6 / (iconCanvas(o.k).width || 8));
  }
  filtIkoner.end(); handIkoner.end();
}
