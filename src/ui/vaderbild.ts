import * as PIXI from 'pixi.js';
import { vaderNu } from '../sim';
import { s, ui } from './lage';
import { app } from './scen';

// vädret på kartan (steg 2.11.4): molnen gör bilden mörkare, regnet och snön faller, och i åskan blixtrar det ibland.
// Det ritas ovanpå hela kartan i skärmens punkter (inte världens), så att det ser likadant ut hur långt man än zoomat.
// Vädret självt räknas i sim/vader.ts; här bara hur det ser ut. Björn valde version 3 efter v102 (steg 2.10.10): droppar med
// ljus topp och snöflingor som små kors, i bildstilens palett
const BILD = {
  molnMork: 0.2, // så mörkt blir det (andel svart) när himlen är helt mulen ...
  nbMork: 0.12, // ... och så mycket mörkare i det kraftigaste regnet
  droppar: 420, // regndroppar på en skärm på 1280 × 800 punkter i det kraftigaste regnet ...
  flingor: 320, // ... och snöflingor i det tätaste snöfallet
  minst: 0.3, // även det lättaste regnet har så här stor del av dropparna, så att det syns
  regnFart: 0.9, snoFart: 0.06, // hur fort de faller, punkter per millisekund
  regnLang: 9, // så långt (i punkter) en regndroppe lutar i den hårdaste blåsten, gånger vindSnett
  punkt: 3, // en punkt i regnet och snön är så här många skärmpunkter, som bildstilens pixlar
  regnTopp: 0xbdb39b, regnKropp: 0x8a9c9e, // dropparnas ljusa topp (ben 2) och kropp (skiffer 3)
  snoMitt: 0xdad0bb, snoArm: 0xbdb39b, // snöflingornas mitt (ben 3) och armar (ben 2)
  vindSnett: 0.6, // så snett faller regnet i den hårdaste blåsten (sidled per fall)
  blixtVar: 9000, // i åskan blixtrar det ungefär så här ofta (millisekunder, datorns tid) ...
  blixtMs: 180, // ... och blixten lyser så här länge
};
export const vaderG = new PIXI.Graphics();
app.stage.addChild(vaderG);

// en fast slumpsiffra 0–1 för droppe i (samma droppe på samma ställe varje bildruta)
const fast = (i: number, salt: number) => { const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return x - Math.floor(x); };
let blixtTill = 0, nastaBlixt = 0;

export function drawVader(ms: number) {
  vaderG.clear();
  const v = vaderNu(s, ui.nu), w = app.screen.width, h = app.screen.height;
  const mork = v.moln * BILD.molnMork + v.nb * BILD.nbMork;
  if (mork > 0.005) vaderG.beginFill(0x10141c, mork).drawRect(0, 0, w, h).endFill();
  if (v.nb > 0.01) {
    const yta = w * h / (1280 * 800), snett = v.vind * BILD.vindSnett;
    if (v.sno) {
      const n = Math.round((BILD.minst + (1 - BILD.minst) * v.nb) * BILD.flingor * yta);
      const px = BILD.punkt, flingor: number[] = [];
      for (let i = 0; i < n; i++) {
        const y = (fast(i, 1) * h + ms * BILD.snoFart * (0.6 + fast(i, 2) * 0.8)) % h;
        const x = ((fast(i, 3) * w + Math.sin(ms / 900 + i) * 6 + y * snett) % w + w) % w;
        flingor.push(Math.round(x / px) * px, Math.round(y / px) * px);
      }
      // ett litet kors: ljus mitt och svagare armar
      vaderG.beginFill(BILD.snoArm, 0.75);
      for (let i = 0; i < flingor.length; i += 2) { const x = flingor[i], y = flingor[i + 1]; vaderG.drawRect(x - px, y, px, px).drawRect(x + px, y, px, px).drawRect(x, y - px, px, px).drawRect(x, y + px, px, px); }
      vaderG.endFill().beginFill(BILD.snoMitt, 0.95);
      for (let i = 0; i < flingor.length; i += 2) vaderG.drawRect(flingor[i], flingor[i + 1], px, px);
      vaderG.endFill();
    } else {
      const n = Math.round((BILD.minst + (1 - BILD.minst) * v.nb) * BILD.droppar * yta), dx = BILD.regnLang * snett;
      const px = BILD.punkt, droppar: number[] = [];
      for (let i = 0; i < n; i++) {
        const y = (fast(i, 1) * h + ms * BILD.regnFart * (0.8 + fast(i, 2) * 0.4)) % h;
        const x = ((fast(i, 3) * w + y * snett) % w + w) % w;
        droppar.push(Math.round(x / px) * px, Math.round(y / px) * px);
      }
      // droppen: en mörkare kropp som lutar med vinden och en ljus topp
      vaderG.beginFill(BILD.regnKropp, 0.7);
      for (let i = 0; i < droppar.length; i += 2) { const x = droppar[i], y = droppar[i + 1]; vaderG.drawRect(x, y + px, px, px).drawRect(x + Math.round(dx / 2 / px) * px, y + 2 * px, px, px); }
      vaderG.endFill().beginFill(BILD.regnTopp, 0.85);
      for (let i = 0; i < droppar.length; i += 2) vaderG.drawRect(droppar[i], droppar[i + 1], px, px);
      vaderG.endFill();
    }
  }
  // blixten: ett kort vitt sken över hela kartan
  if (v.aska) {
    if (!nastaBlixt) nastaBlixt = ms + BILD.blixtVar * (0.3 + Math.random());
    if (ms >= nastaBlixt) { blixtTill = ms + BILD.blixtMs; nastaBlixt = ms + BILD.blixtVar * (0.4 + Math.random() * 1.2); }
  } else nastaBlixt = 0;
  if (ms < blixtTill) vaderG.beginFill(0xf4f6ff, 0.35 * (blixtTill - ms) / BILD.blixtMs).drawRect(0, 0, w, h).endFill();
}
