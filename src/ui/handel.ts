import * as PIXI from 'pixi.js';
import { BYTE, SEC, byId, clamp } from '../sim';
import { iconCanvas } from '../ikoner';
import { s, ui } from './lage';
import { Ikoner, TS, peopleG, pileLayer, world } from './scen';
import { posOf } from './manniskor';

// bytena på kartan (steg 4.4.1.1): filtarna med det som byts, och saken som går från hand till hand i ett litet byte eller en gåva
const filtLayer = new PIXI.Container(), handLayer = new PIXI.Container();
world.addChildAt(filtLayer, world.getChildIndex(pileLayer) + 1);
world.addChildAt(handLayer, world.getChildIndex(peopleG) + 1);
const filtIkoner = new Ikoner(filtLayer), handIkoner = new Ikoner(handLayer);
// var en part i ett byte står: en bybo (posOf) eller handlaren (handel.ts, steg 4.4.1.2)
export const partPlats: { fler: ((id: number) => { x: number; y: number } | undefined)[] } = { fler: [] };
function platsAvPart(id: number) {
  const p = id > 0 ? byId(s, id) : undefined;
  if (p) return posOf(p);
  for (const f of partPlats.fler) { const q = f(id); if (q) return q; }
}
export function drawHandel() {
  filtIkoner.start(); handIkoner.start();
  for (const f of s.filtar ?? []) {
    if (!f.handlare && f.slut <= ui.nu) continue;
    const x0 = f.x * TS - TS, y0 = f.y * TS - TS / 2, sc = (2 * TS) / iconCanvas('filt').width;
    filtIkoner.add('filt', x0, y0 - TS / 2, sc);
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
