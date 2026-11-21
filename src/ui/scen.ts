import * as PIXI from 'pixi.js';
import '@pixi/unsafe-eval';
import { H, W, clamp, eldPlats } from '../sim';
import { hasIcon, iconCanvas } from '../ikoner';
import { $ } from './hjalp';
import { ikonUtanSkugga } from './skugga';
import { s } from './lage';

// kartans scen: lagren som ritas ovanpå varandra och kameran
export const TS = 16; // pixlar per ruta i världen
// alla bilder skarpa och utan förminskade kopior (mipmap), som annars blandar färgerna när kartan zoomas ut (steg 5.5.1)
PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;
PIXI.BaseTexture.defaultOptions.mipmap = PIXI.MIPMAP_MODES.OFF;
export const app = new PIXI.Application({ background: 0x1d2420, antialias: false, resolution: Math.min(2, window.devicePixelRatio || 1), autoDensity: true });
export const view = app.view as HTMLCanvasElement;
export const world = new PIXI.Container();
export const terrainG = new PIXI.Graphics();
export const plantLayer = new PIXI.Container(); // bärbuskar och svampar som finns just nu, i sparade bitar (ui/vaxter.ts, steg 12.1.180)
export const flackG = new PIXI.Graphics(); // fläckarna på marken, som blodet vid slaktbänken (smuts.ts)
export const djurFx = new PIXI.Graphics(); // det kastade i luften och dammet efter kaniner som flyr (jakt.ts, vaxter.ts)
export const djurMarkLayer = new PIXI.Container(); // utropstecknet över kaninen som ser någon och flyr
export const husLayer = new PIXI.Container(); // timmerväggarna och trägolven, som pixelbilder (husbild.ts)
export const structG = new PIXI.Graphics();
export const pileLayer = new PIXI.Container();
export const mattLayer = new PIXI.Container(); // mattorna på golvet, under allt som står och ligger (steg 10.7.6)
export const overG = new PIXI.Graphics(); // det som ritas ovanpå stackarna och stationerna: framstegscirkeln
export const peopleG = new PIXI.Graphics();
// röken (steg 5.1.9.1): från branden bakom allt som står upp, så att den hamnar bakom alla lågorna, och från elden överst
export const rokBakLayer = new PIXI.Container(), rokLayer = new PIXI.Container();
// folket i pixlar (steg 5.1.3.3, ui/figur.ts), och i samma lager träden (ui/trad.ts) och djuren (ui/vaxter.ts): allt som
// står upp ritas i ordning efter hur långt söderut det står (zIndex = fötternas y i världens pixlar, steg 5.1.4.5), så att
// det som står längre söderut skymmer det bakom. Golven, väggarna, stationerna och sakerna på marken ligger under
export const figurLayer = new PIXI.Container();
figurLayer.sortableChildren = true;
export const bubbleG = new PIXI.Graphics();
export const symbolLayer = new PIXI.Container(); // symboler över huvudet: vad var och en håller på med
export const filterG = new PIXI.Graphics(); // värmekartan när ett filter är på
export const labels = new PIXI.Container();
// det som blir mörkt på natten (steg 5.1.1.4, ui/natt.ts): marken, naturen, husen, sakerna och folket; symbolerna, namnen
// och värmekartan ovanpå syns som på dagen. Den som lägger till ett lager bredvid ett av dem lägger det i samma behållare
// (lagerEfter)
export const mork = new PIXI.Container();
mork.addChild(terrainG, plantLayer, flackG, husLayer, mattLayer, structG, pileLayer, overG, djurFx, rokBakLayer, figurLayer, peopleG, rokLayer);
world.addChild(mork, filterG, bubbleG, symbolLayer, djurMarkLayer, labels);
// lägg ett lager direkt ovanför ett annat, i samma behållare
export const lagerEfter = (nytt: PIXI.DisplayObject, fore: PIXI.DisplayObject) => fore.parent!.addChildAt(nytt, fore.parent!.getChildIndex(fore) + 1);
app.stage.addChild(world);

// ikoner som sprites i ett lager. Varje bildruta börjar från första spriten; de som blir över göms
export class Ikoner {
  private n = 0;
  private bilder: PIXI.Sprite[] = []; // egna bilder, så att lagret kan dela med annat (figurLayer)
  // skugga: bilderna kastar en skugga på marken (steg 5.1.8, ui/skugga.ts): den ritade halvgenomskinliga skuggan tas ur bilden
  // och läggs i skuggbilden, där marken blir ett steg mörkare i paletten. rorlig: bilderna flyttar sig ofta (djuren, rövarbytet),
  // och deras skuggor ligger i skuggbildens lilla rörliga del, så att den fasta delen inte ritas om när de går (steg 12.1.182)
  constructor(readonly layer: PIXI.Container, readonly skugga = false, readonly rorlig = false) {}
  start() { this.n = 0; }
  // x, y = bildens övre vänstra hörn. Ingen bild vrids: det som står vridet har en egen bild (steg 3.10.7)
  add(k: string, x: number, y: number, sc: number, tint = 0xffffff) {
    if (!hasIcon(k)) return;
    let sp = this.bilder[this.n++];
    if (!sp) { sp = new PIXI.Sprite(); this.bilder.push(sp); this.layer.addChild(sp); }
    sp.texture = ikonUtanSkugga(k); sp.scale.set(sc); // den halvgenomskinliga skuggan i bilden ritas aldrig som den är (steg 5.5.1): i ett lager med skugga blir den skuggbild, annars tas den bort
    const ss = sp as PIXI.Sprite & { skuggIkon?: string; skuggRor?: boolean }; ss.skuggIkon = this.skugga ? k : undefined; ss.skuggRor = this.rorlig; sp.tint = tint; sp.visible = true;
    sp.position.set(x, y); sp.zIndex = y + iconCanvas(k).height * sc; // bildens nederkant, i ett lager som sorteras
  }
  end() { for (let i = this.n; i < this.bilder.length; i++) this.bilder[i].visible = false; }
}

// kameran: x och y är punkten mitt på skärmen i världens pixlar (-1 = börja vid elden)
export const cam = { zoom: 2.4, x: -1, y: -1 };
export function layout() {
  const el = $('map');
  const w = el.clientWidth, h = el.clientHeight;
  if (!w || !h) return; // kartan syns inte än (dold flik): ingen storlek att räkna med, annars blir kameran NaN och fastnar
  if (!Number.isFinite(cam.x) || !Number.isFinite(cam.y)) { cam.x = -1; cam.y = -1; } // börja om vid elden
  const fit = Math.min(w / (W * TS), h / (H * TS));
  cam.zoom = clamp(cam.zoom, 1, 20); // den största förstoringen: tjugo gånger hela kartan (steg 3.10.6, 9.2.85)
  // hela punkter (steg 10.2.56): varje punkt i världen blir ett helt antal punkter i bilden, så att ingen punkt blir bredare
  // än sin granne. Steglös zoom (steg 11.1.67): i stället för att avrunda skalan (som hoppar mellan fasta nivåer) får
  // canvasen en upplösning där skalan blir hela canvaspunkter, och webbläsaren skalar den mjukt till skärmen. Bilden blir lite
  // mjukare mellan nivåerna men hoppar aldrig. Antalet canvaspunkter är det närmaste hela, så att canvasen är mellan två
  // tredjedelar och en och en halv gång så stor som skärmen åt varje håll
  const res0 = Math.min(2, window.devicePixelRatio || 1), sc0 = fit * cam.zoom, d = sc0 * res0;
  const res = d >= 1 ? Math.max(1, Math.round(d)) / sc0 : res0, sc = sc0;
  if (Math.abs(app.renderer.resolution - res) > 1e-9) app.renderer.resolution = res;
  if (app.renderer.width !== Math.round(w * res) || app.renderer.height !== Math.round(h * res)) { app.renderer.resize(w, h); view.style.width = `${w}px`; view.style.height = `${h}px`; } // exakt kartans storlek, fast canvasens punkter avrundas
  if (cam.x < 0 && s) { const f = eldPlats(s); cam.x = f.x * TS; cam.y = f.y * TS; }
  if (cam.x < 0) { cam.x = W * TS / 2; cam.y = H * TS / 2; }
  const hw = w / 2 / sc, hh = h / 2 / sc;
  cam.x = W * TS <= hw * 2 ? W * TS / 2 : Math.max(hw, Math.min(W * TS - hw, cam.x));
  cam.y = H * TS <= hh * 2 ? H * TS / 2 : Math.max(hh, Math.min(H * TS - hh, cam.y));
  world.scale.set(sc);
  world.position.set(Math.round((w / 2 - cam.x * sc) * res) / res, Math.round((h / 2 - cam.y * sc) * res) / res); // på hela punkter på skärmen
}
// en punkt på skärmen i världens pixlar, och rutan den ligger i
export const toWorld = (gx: number, gy: number) => world.toLocal(new PIXI.Point(gx, gy));
export function tileAt(gx: number, gy: number) { const w = toWorld(gx, gy); return { x: Math.floor(w.x / TS), y: Math.floor(w.y / TS) }; }
export function zoomAt(f: number, gx?: number, gy?: number) {
  const el = $('map');
  if (gx === undefined || gy === undefined) { gx = el.clientWidth / 2; gy = el.clientHeight / 2; }
  const before = toWorld(gx, gy);
  cam.zoom *= f; layout();
  const after = toWorld(gx, gy);
  cam.x += before.x - after.x; cam.y += before.y - after.y; layout();
}
