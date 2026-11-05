import * as PIXI from 'pixi.js';
import { BYTE, SEC, byId, clamp, filtMot, radByte } from '../sim';
import { gaster } from './gaster';
import { iconCanvas } from '../ikoner';
import { s, ui } from './lage';
import { Ikoner, TS, lagerEfter, peopleG, pileLayer } from './scen';
import { posOf } from './manniskor';
import { valdFilt } from './flikar/filt';

// bytena på kartan (steg 4.4.1.1): filtarna med det som byts, och saken som går från hand till hand i ett litet byte eller en gåva
const filtLayer = new PIXI.Container(), handLayer = new PIXI.Container();
lagerEfter(filtLayer, pileLayer);
lagerEfter(handLayer, peopleG);
const filtIkoner = new Ikoner(filtLayer), handIkoner = new Ikoner(handLayer);
// en markerad filt får en vit kant, som en vald person en vit ring (steg 4.5.7.2); två filtar mitt emot varandra visas
// tillsammans (flikar/filt.ts), så båda får kanten
const kantG = new PIXI.Graphics();
lagerEfter(kantG, filtLayer);
// gästerna (handlaren och rövarna, gaster.ts) ritas som byborna, en cirkel med skugga och mörk kant (Björn efter v245, steg
// 4.5.2 och 4.5.4.12), i sin egen färg. Den valda får en vit ring som en vald bybo
const framlingG = new PIXI.Graphics();
handLayer.addChild(framlingG);
function cirkel(x: number, y: number, col: number, vald: boolean) {
  const r = 5;
  framlingG.beginFill(0x372f25).drawEllipse(x, y + r * 0.9, r * 0.9, r * 0.35).endFill();
  framlingG.lineStyle(vald ? 2.5 : 1.2, vald ? 0xffffff : 0x1a1a1a, vald ? 1 : 0.8).beginFill(col).drawCircle(x, y, r).endFill().lineStyle(0);
}
// var en part i ett byte står: en bybo (posOf) eller en gäst, som handlaren (gaster.ts)
function platsAvPart(id: number) {
  const p = id > 0 ? byId(s, id) : undefined;
  return p ? posOf(p) : gaster().find(g => g.id === id);
}
// ett godkänt byte (steg 4.5.4.17): handslaget över båda medan BYTE.handslagSek går, sedan sakerna som går från den enas filt
// till den andras (BYTE.flyttSek). Bytena läses ur loggen, där raden har bytet med sig
function drawGodkant() {
  const H = BYTE.handslagSek * SEC, F = BYTE.flyttSek * SEC, hs = 10 / (iconCanvas('handslag').width || 16);
  for (let i = s.log.length - 1; i >= 0; i--) {
    const e = s.log[i], d = ui.nu - e.t;
    if (d > H + F) break;
    const b = radByte(s, e);
    if (!b || d < 0) continue;
    if (d < H) {
      for (const id of [b.a, b.b]) { const q = platsAvPart(id); if (q) handIkoner.add('handslag', q.x * TS - 5, q.y * TS - 18, hs); }
      continue;
    }
    if (!b.fa || !b.fb) continue;
    const k = clamp((d - H) / F, 0, 1);
    for (const [varor, a, c] of [[b.ag, b.fa, b.fb], [b.bg, b.fb, b.fa]] as const) varor.forEach((v, j) => {
      const x = (a.x + (c.x - a.x) * k) * TS + (j % 4) * 7 - 12, y = (a.y + (c.y - a.y) * k) * TS - TS / 2 - Math.sin(k * Math.PI) * 6 + Math.floor(j / 4) * 7;
      handIkoner.add(v.k, Math.round(x), Math.round(y), hel(v.k)); // varorna i sina egna punkter (steg 5.5.5)
    });
  }
}
// en vara i sina egna punkter (steg 5.5.5): en bild på 8 punkter som den är; en på 16 punkter i halv storlek, som förut
const hel = (k: string) => { const w = iconCanvas(k).width || 8; return w > 8 ? 8 / w : 1; };
export function drawHandel() {
  filtIkoner.start(); handIkoner.start(); framlingG.clear(); kantG.clear();
  const vf = ui.tab === 'filt' ? valdFilt() : undefined, markerad = vf ? [vf, filtMot(s, vf)] : [];
  drawGodkant();
  for (const g of gaster()) cirkel(g.x * TS, g.y * TS, g.farg, g.id === ui.selected);
  for (const f of s.filtar ?? []) {
    if (!f.handlare && f.slut <= ui.nu) continue;
    // handlarens filt och bybornas (Björn valde efter v245: den förra för handlaren och version 1 för byborna, steg 4.5.2)
    const fk = f.handlare ? 'filt' : 'filt_by', x0 = f.x * TS - TS, y0 = f.y * TS - TS / 2, sc = (2 * TS) / iconCanvas(fk).width;
    filtIkoner.add(fk, x0, y0 - TS / 2, sc);
    if (markerad.includes(f)) { // filtens synliga del: punkterna 2–12 uppifrån och 14 breda (ikoner.ts)
      const p = (2 * TS) / 16;
      kantG.lineStyle(1.5, 0xffffff, 1).drawRect(x0 + (f.handlare ? 0 : p) - 1, y0 - TS / 2 + 2 * p - 1, 14 * p + 2, 11 * p + 2).lineStyle(0);
    }
    // sakerna på filten: en part per filt (steg 4.5.4.13) över hela filten; en filt från före v267 har var partens på sin halva
    // ett godkänt byte (steg 4.5.4.17): sakerna ligger kvar under handslaget, är i luften medan de går över (drawGodkant) och
    // ligger sedan på den andra filten tills filtarna plockas ihop
    const d = f.byt === undefined ? 0 : ui.nu - f.byt, H = BYTE.handslagSek * SEC;
    const varor = d < H ? f.varor : d < H + BYTE.flyttSek * SEC ? [] : filtMot(s, f)?.varor ?? [];
    const vems = [...new Set(varor.map(v => v.fran))], kol = vems.length > 1 ? 2 : 4;
    varor.forEach((v, i) => {
      const sida = vems.indexOf(v.fran), n = varor.filter((w, j) => j < i && w.fran === v.fran).length;
      filtIkoner.add(v.k, x0 + 1 + sida * TS + (n % kol) * 7, y0 - 5 + Math.floor(n / kol) * 6, hel(v.k));
    });
  }
  for (const o of s.overl ?? []) {
    const f = (ui.nu - o.t) / (BYTE.overlSek * SEC);
    if (f < 0 || f > 1) continue;
    const a = platsAvPart(o.a), b = platsAvPart(o.b);
    if (!a || !b) continue;
    const k = clamp(f, 0, 1), x = (a.x + (b.x - a.x) * k) * TS, y = (a.y + (b.y - a.y) * k) * TS - 6 - Math.sin(k * Math.PI) * 4;
    handIkoner.add(o.k, Math.round(x - 4), Math.round(y - 4), hel(o.k));
  }
  filtIkoner.end(); handIkoner.end();
}
