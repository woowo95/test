import * as PIXI from 'pixi.js';
import { vaderNu } from '../sim';
import { BAYER } from '../palett';
import { s, ui } from './lage';
import { app } from './scen';

// vädret på kartan (steg 2.11.4): molnen gör bilden mörkare, regnet och snön faller, och i åskan blixtrar det ibland.
// Det ritas ovanpå hela kartan i skärmens punkter (inte världens), så att det ser likadant ut hur långt man än zoomat.
// Vädret självt räknas i sim/vader.ts; här bara hur det ser ut. Björn valde version 3 efter v102 (steg 2.10.10): droppar med
// ljus topp och snöflingor som små kors, i bildstilens palett. Bara palettens färger (steg 5.5.1): molnen och regnet gör
// bilden mörkare som skymningen, med palettens mörkare toner och raster (vaderMork, ritas av ui/natt.ts), dimman tonar ner bilden på samma sätt, blixten
// är ett rastermönster av palettens ljusaste ton i stället för en halvgenomskinlig ruta, och dropparna och flingorna täcker
const BILD = {
  molnMork: 0.5, // så mycket mörkare blir det (steg i paletten, ett steg = skymningen) när himlen är helt mulen ...
  nbMork: 0.3, // ... och så mycket mörkare i det kraftigaste regnet
  droppar: 420, // regndroppar på en skärm på 1280 × 800 punkter i det kraftigaste regnet ...
  flingor: 320, // ... och snöflingor i det tätaste snöfallet
  minst: 0.3, // även det lättaste regnet har så här stor del av dropparna, så att det syns
  regnFart: 0.9, snoFart: 0.06, // hur fort de faller, punkter per millisekund
  regnLang: 9, // så långt (i punkter) en regndroppe lutar i den hårdaste blåsten, gånger vindSnett
  punkt: 3, // en punkt i regnet och snön är så här många skärmpunkter, som bildstilens pixlar
  regnTopp: 0xbdb39b, regnKropp: 0x8a9c9e, // dropparnas ljusa topp (ben 2) och kropp (skiffer 3)
  snoMitt: 0xdad0bb, snoArm: 0xbdb39b, // snöflingornas mitt (ben 3) och armar (ben 2)
  vindSnett: 0.6, // så snett faller regnet i den hårdaste blåsten (sidled per fall), åt det håll vinden blåser (steg 6.4.6) ...
  vindNer: 0.4, // ... och så mycket fortare (eller långsammare) det faller nedåt på skärmen när vinden blåser mot söder (eller norr)
  blixtVar: 9000, // i åskan blixtrar det ungefär så här ofta (millisekunder, datorns tid) ...
  blixtMs: 180, // ... och blixten lyser så här länge
  dimmaMork: 0.5, // dimman (steg 3.7.11) tonar ner bilden så här många steg i paletten när den är som tätast; den ritas inte som ett raster över skärmen
  blixtFarg: '#dad0bb', // blixten i ben 3
  blixt: 0.35, // blixten täcker så här stor del av punkterna när den lyser som mest, i ben 3
};
export const vaderG = new PIXI.Graphics();
// blixten: ett rutmönster av punkter (BILD.punkt skärmpunkter stora) i ett Bayer-raster, 17 tätheter
const raster: PIXI.Texture[] = [];
function rasterTex(del: number) {
  const n = Math.max(0, Math.min(16, Math.round(del * 16)));
  if (!raster[n]) {
    const px = BILD.punkt, c = document.createElement('canvas'); c.width = c.height = 4 * px;
    const g = c.getContext('2d')!; g.fillStyle = BILD.blixtFarg;
    for (let i = 0; i < 16; i++) if (BAYER[i]! < n) g.fillRect((i % 4) * px, Math.floor(i / 4) * px, px, px);
    raster[n] = PIXI.Texture.from(c, { scaleMode: PIXI.SCALE_MODES.NEAREST });
  }
  return raster[n]!;
}
const blixtSp = new PIXI.TilingSprite(PIXI.Texture.EMPTY, 1, 1);
app.stage.addChild(vaderG, blixtSp);
function tackRaster(sp: PIXI.TilingSprite, del: number, w: number, h: number) {
  sp.visible = del >= 1 / 32;
  if (!sp.visible) return;
  sp.texture = rasterTex(del); sp.width = w; sp.height = h;
}
// hur mycket mörkare molnen och regnet gör bilden, i steg i paletten (ui/terrang.ts lägger det till nattens mörker)
export function vaderMork(t: number) { const v = vaderNu(s, t); return v.moln * BILD.molnMork + v.nb * BILD.nbMork + v.dimma * BILD.dimmaMork; }

// en fast slumpsiffra 0–1 för droppe i (samma droppe på samma ställe varje bildruta)
const fast = (i: number, salt: number) => { const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return x - Math.floor(x); };
let blixtTill = 0, nastaBlixt = 0;

export function drawVader(ms: number) {
  vaderG.clear();
  const v = vaderNu(s, ui.nu), w = app.screen.width, h = app.screen.height;
  if (v.nb > 0.01) {
    // regnet och snön faller med vinden (steg 6.4.6): sidled efter vindens riktning, och fortare när den blåser nedåt på skärmen
    const yta = w * h / (1280 * 800), snett = Math.cos(v.rikt) * v.vind * BILD.vindSnett, ner = Math.max(0.5, 1 + Math.sin(v.rikt) * v.vind * BILD.vindNer);
    if (v.sno) {
      const n = Math.round((BILD.minst + (1 - BILD.minst) * v.nb) * BILD.flingor * yta);
      const px = BILD.punkt, flingor: number[] = [];
      for (let i = 0; i < n; i++) {
        const y = (fast(i, 1) * h + ms * BILD.snoFart * ner * (0.6 + fast(i, 2) * 0.8)) % h;
        const x = ((fast(i, 3) * w + Math.sin(ms / 900 + i) * 6 + y * snett) % w + w) % w;
        flingor.push(Math.round(x / px) * px, Math.round(y / px) * px);
      }
      // ett litet kors: ljus mitt och svagare armar
      vaderG.beginFill(BILD.snoArm);
      for (let i = 0; i < flingor.length; i += 2) { const x = flingor[i], y = flingor[i + 1]; vaderG.drawRect(x - px, y, px, px).drawRect(x + px, y, px, px).drawRect(x, y - px, px, px).drawRect(x, y + px, px, px); }
      vaderG.endFill().beginFill(BILD.snoMitt);
      for (let i = 0; i < flingor.length; i += 2) vaderG.drawRect(flingor[i], flingor[i + 1], px, px);
      vaderG.endFill();
    } else {
      const n = Math.round((BILD.minst + (1 - BILD.minst) * v.nb) * BILD.droppar * yta), dx = BILD.regnLang * snett;
      const px = BILD.punkt, droppar: number[] = [];
      for (let i = 0; i < n; i++) {
        const y = (fast(i, 1) * h + ms * BILD.regnFart * ner * (0.8 + fast(i, 2) * 0.4)) % h;
        const x = ((fast(i, 3) * w + y * snett) % w + w) % w;
        droppar.push(Math.round(x / px) * px, Math.round(y / px) * px);
      }
      // droppen: en ljus topp och en mörkare kropp som pekar dit den faller, med vinden
      vaderG.beginFill(BILD.regnKropp);
      for (let i = 0; i < droppar.length; i += 2) { const x = droppar[i], y = droppar[i + 1]; vaderG.drawRect(x, y + px, px, px).drawRect(x + Math.round(dx / 2 / px) * px, y + 2 * px, px, px); }
      vaderG.endFill().beginFill(BILD.regnTopp);
      for (let i = 0; i < droppar.length; i += 2) vaderG.drawRect(droppar[i], droppar[i + 1], px, px);
      vaderG.endFill();
    }
  }
  // blixten: ett kort ljust sken över hela kartan, som raster
  if (v.aska) {
    if (!nastaBlixt) nastaBlixt = ms + BILD.blixtVar * (0.3 + Math.random());
    if (ms >= nastaBlixt) { blixtTill = ms + BILD.blixtMs; nastaBlixt = ms + BILD.blixtVar * (0.4 + Math.random() * 1.2); }
  } else nastaBlixt = 0;
  tackRaster(blixtSp, ms < blixtTill ? BILD.blixt * (blixtTill - ms) / BILD.blixtMs : 0, w, h);
}
