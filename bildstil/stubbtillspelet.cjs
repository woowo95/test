// Stubbarna och de fällda träden till spelet (steg 6.8.16): ritar dem med bildstilens egna funktioner (bildstil/mark.js:
// stubbe version 1 och fallet träd version 2, med hösten och vintern) och skriver src/stubbilder.ts. Kör från repots rot
// efter node bildstil/bygg.cjs: node bildstil/stubbtillspelet.cjs.
// Stubben ritas i två storlekar (stubbens trä 1 och 2) och fyra steg av förruttnelse: i varje steg tas fler punkter bort i
// ett jämnt mönster (Bayer 4 × 4), så att stubben bleknar mot marken utan färger utanför paletten. Vintern har snö på snittet.
// Det fällda trädet ritas i tre längder (efter träet i stammen), gran och björk, sommar, höst och vinter.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const BS = __dirname;
(async () => {
  const br = await chromium.launch(), sida = await br.newPage();
  await sida.goto('file://' + path.join(BS, 'bildstil.html'));
  await sida.waitForFunction(() => window.MARK && typeof PAL !== 'undefined');
  const ut = await sida.evaluate(() => {
    const ut = {};
    // ritar på en stor tom bild, klipper till det som ritats och sparar foten (fx, fy) relativt bildens hörn
    const ta = (id, w, h, fot, rita, ta_bort = 0) => {
      const B = Bild(w, h, PAL); rita(B);
      const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (B.px[y * w + x] >= 0 && BAYER[(y & 3) * 4 + (x & 3)] < ta_bort) B.px[y * w + x] = -1;
        if (B.px[y * w + x] >= 0) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      }
      const pal = {}, tecken = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', kod = {};
      const rader = [];
      for (let y = y0; y <= y1; y++) {
        let r = '';
        for (let x = x0; x <= x1; x++) {
          const v = B.px[y * w + x];
          if (v < 0) { r += '.'; continue; }
          if (!(v in kod)) { kod[v] = tecken[Object.keys(kod).length]; pal[kod[v]] = PAL.cols[v].hex; }
          r += kod[v];
        }
        rader.push(r);
      }
      ut[id] = { sort: 'stubbe', w: x1 - x0 + 1, h: y1 - y0 + 1, rader, pal, fx: fot[0] - x0, fy: fot[1] - y0 };
    };
    const STOR = { 1: 4, 2: 7 }, ROTA = [0, 4, 8, 12];
    for (const sort of ['gran', 'bjork']) for (const [v, d] of Object.entries(STOR)) for (const vinter of [0, 1]) ROTA.forEach((bort, r) =>
      ta(`st_${sort}_${v}_${r}${vinter ? '_v' : ''}`, 32, 32, [16, 24], B => { MARK.stubbe(B, 16, 24, d, sort, 0); if (vinter) MARK.snoMossa(B, 16, 24, d); }, bort));
    const LANG = [18, 30, 44];
    for (const sort of ['gran', 'bjork']) for (const tid of ['sommar', 'host', 'vinter']) LANG.forEach((h, l) =>
      ta(`fa_${sort}_${l}_${tid}`, 80, 48, [10, 24], B => MARK.fallet(B, 10, 24, h, sort, 1, 1, 2 + l, tid)));
    return ut;
  });
  await br.close();
  const text = `// GENERERAD av bildstil/stubbtillspelet.cjs ur bildstil/mark.js (steg 6.8.16). Ändra inte här: rita om i bildstilen och
// kör node bildstil/stubbtillspelet.cjs. st_<sort>_<trä>_<förruttnelse 0–3>[_v vinter]: stubben; fa_<sort>_<längd 0–2>_<tid>:
// det fällda trädet med foten till vänster. fx, fy = foten (stubbens mitt nedtill, stammens rot) i bildens punkter.
import type { Kartbild } from './kartbilder';
export const STUBBILDER: Record<string, Kartbild & { fx: number; fy: number }> = ${JSON.stringify(ut)};
`;
  fs.writeFileSync(path.join(BS, '..', 'src', 'stubbilder.ts'), text);
  console.log(`src/stubbilder.ts: ${Object.keys(ut).length} bilder, ${Math.round(text.length / 1024)} KB`);
})();
