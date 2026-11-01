import * as PIXI from 'pixi.js';
import { BYTE, SEC, byId, clamp, handlarPlats } from '../sim';
import { iconCanvas } from '../ikoner';
import { s, ui } from './lage';
import { Ikoner, TS, peopleG, pileLayer, world } from './scen';
import { posOf } from './manniskor';

// bytena på kartan (steg 4.4.1.1): filtarna med det som byts, och saken som går från hand till hand i ett litet byte eller en gåva
const filtLayer = new PIXI.Container(), handLayer = new PIXI.Container();
world.addChildAt(filtLayer, world.getChildIndex(pileLayer) + 1);
world.addChildAt(handLayer, world.getChildIndex(peopleG) + 1);
const filtIkoner = new Ikoner(filtLayer), handIkoner = new Ikoner(handLayer);
// handlaren och rövarna ritas som byborna, en cirkel med skugga och mörk kant (Björn efter v245, steg 4.5.2), i en egen färg
const framlingG = new PIXI.Graphics();
handLayer.addChild(framlingG);
const FRAMLING = { handlare: 0x4e6a8a, rovare: 0x5a5040 };
function cirkel(x: number, y: number, col: number) {
  const r = 5;
  framlingG.beginFill(0x000000, 0.25).drawEllipse(x, y + r * 0.9, r * 0.9, r * 0.35).endFill();
  framlingG.lineStyle(1.2, 0x1a1a1a, 0.8).beginFill(col).drawCircle(x, y, r).endFill().lineStyle(0);
}
// var en part i ett byte står: en bybo (posOf) eller handlaren (handel.ts, steg 4.4.1.2)
export const partPlats: { fler: ((id: number) => { x: number; y: number } | undefined)[] } = { fler: [] };
function platsAvPart(id: number) {
  const p = id > 0 ? byId(s, id) : undefined;
  if (p) return posOf(p);
  for (const f of partPlats.fler) { const q = f(id); if (q) return q; }
}
partPlats.fler.push(id => s.handlare && s.handlare.id === id ? handlarPlats(s.handlare, ui.nu) : undefined);
export function drawHandel() {
  filtIkoner.start(); handIkoner.start(); framlingG.clear();
  // handlaren (steg 4.4.1.2): på väg in, vid filten eller på väg hem
  const h = s.handlare;
  if (h) { const p = handlarPlats(h, ui.nu); cirkel(p.x * TS, p.y * TS, FRAMLING.handlare); }
  // rövarflocken (steg 4.4.5): rövarna i en klunga där flocken står
  const r = s.rovare;
  if (r) r.folk.forEach((_, i) => cirkel((r.x + (i % 3) * 0.7 - 0.7) * TS, (r.y + Math.floor(i / 3) * 0.7) * TS, FRAMLING.rovare));
  for (const f of s.filtar ?? []) {
    if (!f.handlare && f.slut <= ui.nu) continue;
    // handlarens filt och bybornas (Björn valde efter v245: den förra för handlaren och version 1 för byborna, steg 4.5.2)
    const fk = f.handlare ? 'filt' : 'filt_by', x0 = f.x * TS - TS, y0 = f.y * TS - TS / 2, sc = (2 * TS) / iconCanvas(fk).width;
    filtIkoner.add(fk, x0, y0 - TS / 2, sc);
    // sakerna på filten: var partens på sin halva
    const vems = [...new Set(f.varor.map(v => v.fran))];
    f.varor.forEach((v, i) => {
      const sida = vems.indexOf(v.fran), n = f.varor.filter((w, j) => j < i && w.fran === v.fran).length;
      filtIkoner.add(v.k, x0 + 2 + sida * TS + (n % 2) * 6, y0 - 4 + Math.floor(n / 2) * 5, 6 / (iconCanvas(v.k).width || 8));
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
