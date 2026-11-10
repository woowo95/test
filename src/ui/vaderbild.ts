import * as PIXI from 'pixi.js';
import { lightLevel, vaderNu } from '../sim';
import { BAYER, DJUPNATT, rasterSteg } from '../palett';
import { s, ui } from './lage';
import { TS, app, world } from './scen';

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
  regnTopp: '#bdb39b', regnKropp: '#8a9c9e', // dropparnas ljusa topp (ben 2) och kropp (skiffer 3)
  snoMitt: '#dad0bb', snoArm: '#bdb39b', // snöflingornas mitt (ben 3) och armar (ben 2)
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

// blixtens nedslag (steg 9.2.21, Björns val i steg 9.9.1: version 2): en bred blixt i ben 3 med skiffer 3 som kant, med en tunn gren
// åt sidan halvvägs, från himlen ner till rutan under NEDSLAG_MS (datorns tid) och ett stort sken i senap runt nedslaget, när åskan slår
// ner av sig själv och i testläget. Formen är ritad i punkter (BLIXT_PUNKTER, bildstilens 48 × 72) och sträckt till höjden
const NEDSLAG_MS = 450, NEDSLAG_HOJD = 9; // så länge den syns, och så många rutor ovanför rutan den börjar
const BLIXT_PUNKTER = [[18, 0], [24, 14], [16, 26], [26, 40], [22, 58]], BLIXT_GREN = [[21, 26], [12, 34], [9, 42]];
const SKEN_R = 11, BLIXT_H = 58;
const nedslagG = new PIXI.Graphics();
world.addChild(nedslagG);
const settNedslag = new Map<string, number>(); // nedslaget och när det syntes första gången (datorns tid)
// en linje av punkter mellan två punkter, bred punkter bred med kanten i skiffer 3 på båda sidor
function blixtLinje(ax: number, ay: number, bx: number, by: number, bred: number) {
  const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
  for (let k = 0; k <= n; k++) {
    const x = Math.round(ax + (bx - ax) * k / (n || 1)), y = Math.round(ay + (by - ay) * k / (n || 1));
    for (let d = -1; d <= bred; d++) nedslagG.beginFill(d < 0 || d === bred ? 0x8a9c9e : 0xdad0bb).drawRect(x + d, y, 1, 1).endFill();
  }
}
function drawNedslag(ms: number) {
  nedslagG.clear();
  for (const n of s.nedslag ?? []) {
    const k = `${n.t}:${n.x}:${n.y}`;
    if (!settNedslag.has(k)) { if (ui.nu - n.t > 10 * 60_000) continue; settNedslag.set(k, ms); blixtTill = ms + BILD.blixtMs; } // och hela kartan blixtrar
    const kvar = 1 - (ms - settNedslag.get(k)!) / NEDSLAG_MS;
    if (kvar <= 0) continue;
    const x1 = n.x * TS + TS / 2, y1 = n.y * TS + TS / 2, sy = NEDSLAG_HOJD * TS / BLIXT_H, sx = 1.3;
    // skenet runt nedslaget: senap 2 i ett glest mönster och senap 3 i mitten, krymper när blixten dör ut
    const r = SKEN_R * (0.5 + 0.5 * kvar) * 1.4;
    for (let y = Math.floor(y1 - r); y <= y1 + r; y++) for (let x = Math.floor(x1 - r); x <= x1 + r; x++) {
      const d = Math.hypot((x - x1) * 0.8, y - y1) / r;
      if (d < 1 && ((x + y * 3) % 4 === 0 || d < 0.35)) nedslagG.beginFill(d < 0.35 ? 0xd8b25f : 0xb2921b).drawRect(x, y, 1, 1).endFill();
    }
    // blixten: punkterna räknade från nedslagspunkten (sista punkten), stora steg i höjd och lite mindre i bredd
    const till = (p: number[]) => [Math.round(x1 + (p[0] - 22) * sx), Math.round(y1 + (p[1] - BLIXT_H) * sy)];
    for (let i = 0; i + 1 < BLIXT_PUNKTER.length; i++) { const a = till(BLIXT_PUNKTER[i]), b = till(BLIXT_PUNKTER[i + 1]); blixtLinje(a[0], a[1], b[0], b[1], 2); }
    for (let i = 0; i + 1 < BLIXT_GREN.length; i++) { const a = till(BLIXT_GREN[i]), b = till(BLIXT_GREN[i + 1]); blixtLinje(a[0], a[1], b[0], b[1], 1); }
  }
}
export function drawVader(ms: number) {
  vaderG.clear();
  drawNedslag(ms);
  const v = vaderNu(s, ui.nu), w = app.screen.width, h = app.screen.height;
  // regnet och snön tar sina färger ur samma mörkare steg som kartan (steg 8.1.7), i hela steg
  const steg = Math.round(Math.min(DJUPNATT, DJUPNATT * (1 - lightLevel(ui.nu)))), ton = (hex: string) => parseInt(rasterSteg(hex, steg, 0, 0).slice(1), 16);
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
      vaderG.beginFill(ton(BILD.snoArm));
      for (let i = 0; i < flingor.length; i += 2) { const x = flingor[i], y = flingor[i + 1]; vaderG.drawRect(x - px, y, px, px).drawRect(x + px, y, px, px).drawRect(x, y - px, px, px).drawRect(x, y + px, px, px); }
      vaderG.endFill().beginFill(ton(BILD.snoMitt));
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
      vaderG.beginFill(ton(BILD.regnKropp));
      for (let i = 0; i < droppar.length; i += 2) { const x = droppar[i], y = droppar[i + 1]; vaderG.drawRect(x, y + px, px, px).drawRect(x + Math.round(dx / 2 / px) * px, y + 2 * px, px, px); }
      vaderG.endFill().beginFill(ton(BILD.regnTopp));
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
