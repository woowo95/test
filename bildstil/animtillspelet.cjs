// Animationerna till spelet (steg 5.1.9): kör bildstilens anim.js (de godkända animationerna, 5.2.4.8) och sida.js
// (paletten, bilden, lägerelden) och skriver src/animbilder.ts med varje bild i förväg, som rader och pal (samma form som
// KARTBILDER). Spelet väljer bild efter klockan (ui/animation.ts). Kör från repots rot: node bildstil/animtillspelet.cjs.
// Bildstilens källa i repot kan vara äldre än den publicerade sidan; anim.js ska då först hämtas från sidan.
const fs = require('fs'), path = require('path'), vm = require('vm');
const BS = __dirname;
const sida = fs.readFileSync(path.join(BS, 'sida.js'), 'utf8').split('\n');
const slut = sida.findIndex(r => r.startsWith('// ---------- kistan'));
if (slut < 0) throw new Error('hittar inte slutet på lägerelden i sida.js');
const UT = '\nwindow.ANIM = { TAKT, HASTIGHET, EGNA, LAGOR, rok, gnistor, brandBild, BRANDBAS, tornado, TN, bild };\n})();';
let anim = fs.readFileSync(path.join(BS, 'anim.js'), 'utf8').trimEnd();
if (!anim.endsWith('})();')) throw new Error('anim.js slutar inte med })();');
anim = anim.slice(0, -5) + UT;
const ctx = { window: {}, VAL: [], MARK: {}, Math, console };
vm.runInNewContext(sida.slice(0, slut).join('\n') + '\nwindow.SIDA = { PAL, Bild, hash, ritaEld };', ctx);
Object.assign(ctx, ctx.window.SIDA);
vm.runInNewContext(anim, ctx);
const { PAL: P, Bild, hash, ritaEld } = ctx.window.SIDA, A = ctx.window.ANIM;

// en bild i palettens index till rader och pal (en bokstav per färg)
const TECKEN = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function utAv(B) {
  const pal = {}, bokstav = new Map(), rader = [];
  for (let y = 0; y < B.h; y++) {
    let r = '';
    for (let x = 0; x < B.w; x++) {
      const v = B.px[y * B.w + x];
      if (v < 0) { r += '.'; continue; }
      if (!bokstav.has(v)) { const c = TECKEN[bokstav.size]; bokstav.set(v, c); pal[c] = P.cols[v].hex; }
      r += bokstav.get(v);
    }
    rader.push(r);
  }
  return { w: B.w, h: B.h, rader, pal };
}
const bilder = {};

// lägerelden (5.1.9.1): spelets godkända bild med lågorna ur bildstilens eld (LAGOR, fyra bilder), stor och liten eld.
// Lågornas punkter i bilden tas bort och lågorna ritas som i bildstilens lägereld, med gropens mitt i (10, 12)
const ELD = { x: 10, y: 12 }, LAGFARG = new Set(['#742a01', '#a14808', '#b2921b', '#d8b25f', '#dad0bb']);
for (const [lage, skala] of [['stort', 1], ['lite', 0.55]]) {
  const d = JSON.parse(fs.readFileSync(path.join(BS, 'bilder', 'lagereld_' + lage + '.json'), 'utf8'));
  A.LAGOR.forEach((lagor, k) => {
    const B = Bild(d.w, d.h, P);
    d.rader.forEach((rad, y) => [...rad].forEach((c, x) => { const hex = d.pal[c]; if (hex && !(y <= ELD.y && LAGFARG.has(hex))) B.satt(x, y, P.av(hex)); }));
    const H = lagor.map(h => Math.max(1, Math.round(h * skala)));
    H.forEach((hh, i) => { const x = ELD.x - 3 + i; for (let j = 0; j < hh; j++) { const f = j / hh, v = f > 0.75 ? P.i('rost', 2) : f > 0.45 ? P.i('senap', 2) : (i >= 2 && i <= 4 && j < 3) ? P.i('ben', 3) : P.i('senap', 3); B.satt(x, ELD.y - j, v); } });
    bilder[`eld_${lage}_${k}`] = utAv(B);
  });
}
// gnistorna och röken över elden: gnistorna 10 punkter över gropen, röken från 13 punkter över den och 30 punkter upp.
// Bilderna har gropens mitt i (GNISTA.x, GNISTA.y) och (ROK.x, ROK.y)
const GNISTA = { x: 4, y: 22 }, ROK = { x: 8, y: 46 };
for (let k = 0; k < 4; k++) {
  const g = Bild(9, 14, P); A.gnistor(g, GNISTA.x, GNISTA.y - 10, k); bilder['gnistor_' + k] = utAv(g);
  const r = Bild(17, 36, P); A.rok(r, ROK.x, ROK.y - 13, k, 30); bilder['rok_' + k] = utAv(r);
}
// röken från ett rökhål eller en mindre eld: 22 punkter hög
for (let k = 0; k < 4; k++) { const r = Bild(17, 28, P); A.rok(r, 8, 26, k, 22); bilder['rokliten_' + k] = utAv(r); }

// tornadon (5.1.9.1): åtta bilder, 48 × 72 punkter, foten i (TN.cx, TN.fot)
for (let k = 0; k < 8; k++) { const B = Bild(A.TN.w, A.TN.h, P); A.tornado(B, 0, 0, k / 8); bilder['tornado_' + k] = utAv(B); }

// branden (5.1.9.1): sex bilder i åtta varianter (rutans plats väljer varianten). Varianten börjar på sitt eget ställe i
// rörelsen, som i bildstilen; röken ritas för sig (bakom alla lågorna), 16 × 28 punkter med rutans övre kant 26 punkter ned
const VARIANTER = 8;
for (let v = 0; v < VARIANTER; v++) {
  const vv = (v + 0.5) / VARIANTER, fas = Math.floor(hash(vv, 5, 960) * 6);
  for (let k = 0; k < 6; k++) { const B = Bild(16, 16, P); A.brandBild(B, 0, 0, (k + fas) % 6, vv); bilder[`brand_${v}_${k}`] = utAv(B); }
  for (let k = 0; k < 4; k++) { const B = Bild(16, 28, P); A.rok(B, 7 + Math.round(hash(vv, 6, 960) * 2 - 1), 27, (k + fas) % 4, 22 - Math.floor(hash(vv, 7, 960) * 8)); bilder[`brandrok_${v}_${k}`] = utAv(B); }
}

const text = `// GENERERAD av bildstil/animtillspelet.cjs ur bildstilens anim.js och sida.js (steg 5.2.4.8 och 5.1.9). Ändra inte här:
// ändra i bildstilen och kör node bildstil/animtillspelet.cjs. Varje bild i förväg, i samma form som KARTBILDER (rader och
// pal). ANIMTAKT är bildstilens klocka: ett slag var TAKT ms, och varje effekt byter bild var HASTIGHET:e slag.
export interface Animbild { w: number; h: number; rader: string[]; pal: Record<string, string> }
export const ANIMTAKT = ${JSON.stringify({ takt: A.TAKT, hastighet: A.HASTIGHET, eld: ELD, gnista: GNISTA, rok: ROK, tornado: { cx: A.TN.cx, fot: A.TN.fot }, brandVarianter: VARIANTER })};
export const ANIMBILDER: Record<string, Animbild> = ${JSON.stringify(bilder)};
`;
fs.writeFileSync(path.join(BS, '..', 'src', 'animbilder.ts'), text);
console.log(`src/animbilder.ts: ${Object.keys(bilder).length} bilder, ${Math.round(text.length / 1024)} KB`);
