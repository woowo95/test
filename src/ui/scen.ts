import * as PIXI from 'pixi.js';
import '@pixi/unsafe-eval';
import { H, W, clamp, eldPlats } from '../sim';
import { hasIcon, iconCanvas } from '../ikoner';
import { $ } from './hjalp';
import { s } from './lage';

// kartans scen: lagren som ritas ovanpå varandra och kameran
export const TS = 16; // pixlar per ruta i världen
export const app = new PIXI.Application({ background: 0x1d2420, antialias: true, resolution: Math.min(2, window.devicePixelRatio || 1), autoDensity: true });
export const view = app.view as HTMLCanvasElement;
export const world = new PIXI.Container();
export const terrainG = new PIXI.Graphics();
export const plantG = new PIXI.Graphics(); // bärbuskar och svampar som finns just nu
export const flackG = new PIXI.Graphics(); // fläckarna på marken, som blodet vid slaktbänken (smuts.ts)
export const djurLayer = new PIXI.Container(); // kaninerna
export const djurFx = new PIXI.Graphics(); // det kastade i luften och dammet efter kaniner som flyr (jakt.ts, vaxter.ts)
export const djurMarkLayer = new PIXI.Container(); // utropstecknet över kaninen som ser någon och flyr
export const husLayer = new PIXI.Container(); // timmerväggarna och trägolven, som pixelbilder (husbild.ts)
export const structG = new PIXI.Graphics();
export const pileLayer = new PIXI.Container();
export const overG = new PIXI.Graphics(); // det som ritas ovanpå stackarna och stationerna: framstegscirkeln
export const peopleG = new PIXI.Graphics();
export const bubbleG = new PIXI.Graphics();
export const markLayer = new PIXI.Container(); // symboler över huvudet: vad var och en håller på med
export const nightG = new PIXI.Graphics();
export const glowG = new PIXI.Graphics();
glowG.blendMode = PIXI.BLEND_MODES.ADD;
export const filterG = new PIXI.Graphics(); // värmekartan när ett filter är på
export const labels = new PIXI.Container();
world.addChild(terrainG, plantG, flackG, djurLayer, husLayer, structG, pileLayer, overG, djurFx, peopleG, nightG, glowG, filterG, bubbleG, markLayer, djurMarkLayer, labels);
app.stage.addChild(world);

// ikoner som sprites i ett lager. Varje bildruta börjar från första spriten; de som blir över göms
const textures: Record<string, PIXI.Texture> = {};
export class Ikoner {
  private n = 0;
  constructor(readonly layer: PIXI.Container) {}
  start() { this.n = 0; }
  // x, y = bildens övre vänstra hörn; vriden = bilden vriden ett kvarts varv medsols (en station som står vriden, stationer.ts)
  add(k: string, x: number, y: number, sc: number, vriden = false) {
    if (!hasIcon(k)) return;
    textures[k] ??= PIXI.Texture.from(iconCanvas(k), { scaleMode: PIXI.SCALE_MODES.NEAREST });
    let sp = this.layer.children[this.n++] as PIXI.Sprite | undefined;
    if (!sp) { sp = new PIXI.Sprite(); this.layer.addChild(sp); }
    sp.texture = textures[k]; sp.scale.set(sc); sp.visible = true;
    sp.rotation = vriden ? Math.PI / 2 : 0;
    sp.position.set(vriden ? x + iconCanvas(k).height * sc : x, y);
  }
  end() { for (let i = this.n; i < this.layer.children.length; i++) this.layer.children[i].visible = false; }
}

// kameran: x och y är punkten mitt på skärmen i världens pixlar (-1 = börja vid elden)
export const cam = { zoom: 2.4, x: -1, y: -1 };
export function layout() {
  const el = $('map');
  const w = el.clientWidth, h = el.clientHeight;
  if (app.renderer.width !== w * app.renderer.resolution || app.renderer.height !== h * app.renderer.resolution) app.renderer.resize(w, h);
  const fit = Math.min(w / (W * TS), h / (H * TS));
  cam.zoom = clamp(cam.zoom, 1, 6);
  const sc = fit * cam.zoom;
  if (cam.x < 0 && s) { const f = eldPlats(s); cam.x = f.x * TS; cam.y = f.y * TS; }
  if (cam.x < 0) { cam.x = W * TS / 2; cam.y = H * TS / 2; }
  const hw = w / 2 / sc, hh = h / 2 / sc;
  cam.x = W * TS <= hw * 2 ? W * TS / 2 : Math.max(hw, Math.min(W * TS - hw, cam.x));
  cam.y = H * TS <= hh * 2 ? H * TS / 2 : Math.max(hh, Math.min(H * TS - hh, cam.y));
  world.scale.set(sc);
  world.position.set(w / 2 - cam.x * sc, h / 2 - cam.y * sc);
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
