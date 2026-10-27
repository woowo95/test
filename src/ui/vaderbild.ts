import * as PIXI from 'pixi.js';
import { vaderNu } from '../sim';
import { s, ui } from './lage';
import { app } from './scen';

// vädret på kartan (steg 2.11.4): molnen gör bilden mörkare, regnet och snön faller, och i åskan blixtrar det ibland.
// Det ritas ovanpå hela kartan i skärmens punkter (inte världens), så att det ser likadant ut hur långt man än zoomat.
// Vädret självt räknas i sim/vader.ts; här bara hur det ser ut. Platshållare tills Björn valt i bildstilen
const BILD = {
  molnMork: 0.2, // så mörkt blir det (andel svart) när himlen är helt mulen ...
  nbMork: 0.12, // ... och så mycket mörkare i det kraftigaste regnet
  droppar: 420, // regndroppar på en skärm på 1280 × 800 punkter i det kraftigaste regnet ...
  flingor: 320, // ... och snöflingor i det tätaste snöfallet
  minst: 0.3, // även det lättaste regnet har så här stor del av dropparna, så att det syns
  regnFart: 0.9, snoFart: 0.06, // hur fort de faller, punkter per millisekund
  regnLang: 9, // en regndroppes längd i punkter
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
      vaderG.beginFill(0xffffff, 0.85);
      for (let i = 0; i < n; i++) {
        const y = (fast(i, 1) * h + ms * BILD.snoFart * (0.6 + fast(i, 2) * 0.8)) % h;
        const x = ((fast(i, 3) * w + Math.sin(ms / 900 + i) * 6 + y * snett) % w + w) % w, r = fast(i, 4) < 0.3 ? 3 : 2;
        vaderG.drawRect(Math.round(x), Math.round(y), r, r);
      }
      vaderG.endFill();
    } else {
      const n = Math.round((BILD.minst + (1 - BILD.minst) * v.nb) * BILD.droppar * yta), dx = BILD.regnLang * snett;
      vaderG.lineStyle(1.5, 0xd0deec, 0.6);
      for (let i = 0; i < n; i++) {
        const y = (fast(i, 1) * h + ms * BILD.regnFart * (0.8 + fast(i, 2) * 0.4)) % h;
        const x = ((fast(i, 3) * w + y * snett) % w + w) % w;
        vaderG.moveTo(x, y).lineTo(x + dx, y + BILD.regnLang);
      }
      vaderG.lineStyle(0);
    }
  }
  // blixten: ett kort vitt sken över hela kartan
  if (v.aska) {
    if (!nastaBlixt) nastaBlixt = ms + BILD.blixtVar * (0.3 + Math.random());
    if (ms >= nastaBlixt) { blixtTill = ms + BILD.blixtMs; nastaBlixt = ms + BILD.blixtVar * (0.4 + Math.random() * 1.2); }
  } else nastaBlixt = 0;
  if (ms < blixtTill) vaderG.beginFill(0xf4f6ff, 0.35 * (blixtTill - ms) / BILD.blixtMs).drawRect(0, 0, w, h).endFill();
}
