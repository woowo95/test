import { Pile, STUBBE_LIV, bitsOf, clamp, condOf, emberOn, fireHeat, getMap, heatRadius, zonesOf } from '../sim';
import { outPilesAt, piles, s, ui } from './lage';
import { Ikoner, TS, pileLayer, structG } from './scen';

// det som står på marken: lagerplatserna och stackarna, husen, stubbar, fällda träd och elden
const pileIcons = new Ikoner(pileLayer);
// skicket som färg: grönt, gult, rött
const condCol = (c: number) => c >= 0.5 ? 0x6fbf5a : c >= 0.25 ? 0xe0b040 : 0xd2553f;
// var ikonerna ligger i rutan, bakersta först
const PILE_LAYOUT = [[[4, 5]], [[1, 5], [7, 5]], [[4, 1], [1, 5], [7, 5]], [[2, 0], [6, 1], [0, 5], [8, 5]]];
// en stack: ju fullare desto fler saker i högen
function drawPile(pl: Pile) {
  const x0 = pl.x * TS, y0 = pl.y * TS, f = Math.min(1, pl.n / pl.max), g = structG, c = condOf(pl);
  // liten stapel för skicket längst ner i rutan
  g.beginFill(0x161210, 0.7).drawRect(x0 + 2, y0 + 13.5, 12, 2).endFill().beginFill(condCol(c)).drawRect(x0 + 2, y0 + 13.5, 12 * clamp(c, 0, 1), 2).endFill();
  // ikoner: ju fullare stacken är desto fler, redskap som en större bild
  if (pl.gor) { pileIcons.add(pl.gor, x0 + 2, y0, 1.5); pileIcons.add('paborjat', x0 + 9, y0 - 1, 0.8); return; } // påbörjat: timglaset ovanpå
  if (pl.max === 1) { pileIcons.add(pl.k, x0 + 2, y0, 1.5); return; }
  const n = clamp(Math.ceil(f * 4), 1, 4);
  for (const [dx, dy] of PILE_LAYOUT[n - 1]) pileIcons.add(pl.k, x0 + dx, y0 + dy, 1);
}
export function drawStructures(t: number) {
  const m = getMap(s.seed), tab = ui.tab;
  structG.clear();
  // lagerplatsen: en ram runt rutorna, och en stack per ruta
  zonesOf(s).forEach((z, i) => {
    const on = tab === 'lager' && ui.lagerNr === i;
    structG.beginFill(0x5b4a35, 0.22).lineStyle(1, on ? 0xffffff : 0x5b4a35, on ? 0.9 : 0.5).drawRoundedRect(z.x * TS + 0.5, z.y * TS + 0.5, z.w * TS - 1, z.h * TS - 1, 3).endFill().lineStyle(0);
  });
  drawBuild();
  pileIcons.start();
  for (const pl of piles()) drawPile(pl);
  pileIcons.end();
  // markerad hög utanför lagret: vit kant runt rutan, som lagerplatsen får
  const h = ui.hogAt;
  if (tab === 'hog' && outPilesAt(h.x, h.y).length) structG.lineStyle(1, 0xffffff, 0.9).drawRoundedRect(h.x * TS + 0.5, h.y * TS + 0.5, TS - 1, TS - 1, 3).lineStyle(0);
  // stubbar: bleknar medan de ruttnar bort
  for (const k of s.stubbar ?? []) {
    const a = 1 - (s.now - k.t) / STUBBE_LIV, x = k.x * TS + TS * 0.65, y = k.y * TS + TS * 0.6;
    structG.beginFill(0x4a3420, 0.9 * a).drawCircle(x, y, 3.2).endFill();
    structG.beginFill(0xb08a58, 0.9 * a).drawCircle(x, y - 0.6, 2.2).endFill();
  }
  // fällda träd som ligger och väntar på att huggas till ved
  for (const k of s.stockar ?? []) {
    const x = k.x * TS, y = k.y * TS, len = 6 + Math.min(8, k.ved);
    structG.lineStyle(4, 0x5a3c22).moveTo(x - len / 2, y + 2).lineTo(x + len / 2, y - 1).lineStyle(0);
    structG.beginFill(0xc9a46a).drawCircle(x - len / 2, y + 2, 1.8).endFill();
  }
  // eld
  const f = m.fire, cx = f.x * TS + TS / 2, cy = f.y * TS + TS / 2;
  // värmeområdet visas när eldens flik är öppen
  if (tab === 'eld' && s.fire.lit) structG.beginFill(0xff9a4a, 0.1).lineStyle(1, 0xffb070, 0.5).drawCircle(cx, cy, heatRadius(s) * TS).endFill().lineStyle(0);
  if (tab === 'eld') structG.lineStyle(1.5, 0xffffff, 0.9).drawCircle(cx, cy, 10).lineStyle(0);
  structG.beginFill(0x4b4640).drawCircle(cx, cy, 7).endFill();
  structG.beginFill(0x2d2620).drawCircle(cx, cy, 5.5).endFill();
  // ringen av stenar, som ligger kvar när elden slocknat
  if (s.fire.ring) for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.2; structG.beginFill(i % 2 ? 0x8a8f94 : 0x6a6e72).drawEllipse(cx + Math.cos(a) * 7, cy + Math.sin(a) * 6.5, 2.2, 1.8).endFill(); }
  const fuel = s.fire.fuel, fl = 1 + Math.sin(t / 130) * 0.12 + Math.sin(t / 47) * 0.08;
  // vedträn: fler ju mer ved som ligger på
  const logs = Math.min(5, Math.ceil(fuel));
  for (let i = 0; i < logs; i++) { const a = i * 1.26 + 0.4; structG.lineStyle(2, 0x5a3a1e).moveTo(cx + Math.cos(a) * 1.5, cy + Math.sin(a) * 1.5).lineTo(cx + Math.cos(a) * 5.2, cy + Math.sin(a) * 5.2).lineStyle(0); }
  if (s.fire.lit) {
    const I = fireHeat(s);
    structG.beginFill(0xe2702e).drawCircle(cx, cy, (2.6 + 3 * I) * fl).endFill();
    structG.beginFill(0xffd36b).drawCircle(cx, cy - 0.5, (1.3 + 1.6 * I) * fl).endFill();
  } else if (emberOn(s)) {
    structG.beginFill(0xb3361e, 0.6 + Math.sin(t / 400) * 0.25).drawCircle(cx, cy, 2.6).endFill();
  } else if ((s.fire.ash ?? 0) >= 1) {
    // kolhög efter en utbrunnen eld
    structG.beginFill(0x1a1714).drawEllipse(cx, cy + 0.5, 5.5, 4.5).endFill();
    const n = Math.min(8, s.fire.ash!);
    for (let i = 0; i < n; i++) { const a = i * 2.4; structG.beginFill(i % 3 ? 0x3a3530 : 0x55504a).drawRect(cx + Math.cos(a) * 2.6 - 1, cy + Math.sin(a) * 2.2 - 1, 2, 2).endFill(); }
  }
}
// husen: golv, väggar av timmer (eller flätat ris i äldre byar) och öppningar. Det som är planerat syns som en svag kontur, det som byggs fylls i
function drawBuild() {
  for (const b of bitsOf(s)) {
    const x = b.x * TS, y = b.y * TS;
    if (b.k === 'golv') {
      const col = b.m === 'ho' ? 0xd2b866 : b.m === 'tra' ? 0xa07446 : 0x7a5a3a, a = b.b >= 1 ? (b.m === 'jord' ? 0.55 : 0.85) : 0.12 + 0.3 * b.b;
      structG.beginFill(col, a).drawRect(x, y, TS, TS).endFill();
      if (b.m === 'tra' && b.b >= 1) for (let k = 1; k < 3; k++) structG.lineStyle(0.6, 0x5a3c22, 0.7).moveTo(x, y + TS * k / 3).lineTo(x + TS, y + TS * k / 3).lineStyle(0); // plankorna
    } else if (b.k === 'vagg') {
      if (b.b <= 0 && b.mat <= 0) { structG.lineStyle(1, 0x5a3c22, 0.45).drawRect(x + 1.5, y + 1.5, TS - 3, TS - 3).lineStyle(0); continue; }
      const a = b.b >= 1 ? 0.55 + 0.45 * b.c : 0.25 + 0.5 * b.b;
      if (b.m === 'timmer') {
        // stockarna läggs en i taget nerifrån: fler ju längre bygget kommit. De täcker hela rutan så att väggarna sitter ihop
        const n = b.b >= 1 ? 4 : Math.ceil(4 * b.b), h = TS / 4;
        if (!n) { structG.lineStyle(1, 0x5a3c22, 0.45).drawRect(x + 1.5, y + 1.5, TS - 3, TS - 3).lineStyle(0); continue; }
        structG.beginFill(0x8a5e34, a).drawRect(x, y + TS - n * h, TS, n * h).endFill();
        for (let k = 0; k < n; k++) {
          const yy = y + TS - (k + 1) * h;
          structG.lineStyle(0.8, 0x4a3018, a).moveTo(x, yy + h - 0.4).lineTo(x + TS, yy + h - 0.4).lineStyle(0);
        }
        continue;
      }
      structG.beginFill(0x6b4a2a, a).drawRect(x + 1, y + 1, TS - 2, TS - 2).endFill();
      // flätningen: vågiga streck, färre ju mer slitet
      const n = b.b >= 1 ? Math.max(1, Math.round(3 * b.c)) : Math.ceil(3 * b.b);
      for (let k = 0; k < n; k++) { const yy = y + TS * (0.28 + 0.22 * k); structG.lineStyle(1, 0xb08a58, a).moveTo(x + 2, yy).lineTo(x + TS / 2, yy + 1.5).lineTo(x + TS - 2, yy).lineStyle(0); }
      for (let k = 1; k < 3; k++) structG.lineStyle(1, 0x3a2614, a).moveTo(x + TS * k / 3, y + 1).lineTo(x + TS * k / 3, y + TS - 1).lineStyle(0);
    } else {
      structG.beginFill(0x7a5a3a, 0.35).drawRect(x + 1, y + 1, TS - 2, TS - 2).endFill(); // öppningen: trampad jord
    }
  }
}
