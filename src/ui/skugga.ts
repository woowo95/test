// Skuggorna på marken (steg 5.1.8, "Bildstil" under Gränssnitt i designdokumentet): ljuset kommer uppifrån vänster, så allt
// som står på marken kastar en kort skugga åt nedre högra hörnet. Skuggan är ingen halvgenomskinlig svart fläck: marken och
// golven där den ligger får samma färg ett steg mörkare i paletten (MORKARE[1], som bildstilens morka). Var skuggan ligger
// ritas varje bildruta i en osynlig bild över hela kartan (en punkt per världspixel), och ett filter på marken och golven
// mörkar de punkterna. Träden och folket har bildstilens skugga: en hel oval vid foten, snett åt höger (bildstil/mark.js,
// skugga). Stationerna, sakerna och djuren har skuggan som redan är ritad i bilden (de halvgenomskinliga punkterna, som nu
// läggs i paletten i stället); en bild utan egen skugga får sin form flyttad en punkt åt nedre högra hörnet. Väggarna kastar
// sin form två punkter snett nedåt höger, men inte på sig själva. Bara utseende.
import * as PIXI from 'pixi.js';
import { iconCanvas } from '../ikoner';
import { FARGER, MORKARE } from '../palett';

// ---------- bilderna med och utan sin egen skugga ----------
// en ikon på kartan: de halvgenomskinliga punkterna (den ritade skuggan) tas bort ur bilden och blir skuggan
const utan = new Map<string, PIXI.Texture>(), form = new Map<string, PIXI.Texture>();
function dela(k: string) {
  const src = iconCanvas(k), w = src.width, h = src.height;
  const d = src.getContext('2d')!.getImageData(0, 0, w, h).data;
  const a = document.createElement('canvas'), b = document.createElement('canvas');
  a.width = w; a.height = h; b.width = w + 1; b.height = h + 1;
  const ga = a.getContext('2d')!, gb = b.getContext('2d')!, ia = ga.createImageData(w, h), ib = gb.createImageData(w + 1, h + 1);
  let egen = false;
  for (let i = 0; i < w * h; i++) {
    const al = d[i * 4 + 3];
    if (al >= 250) for (let c = 0; c < 4; c++) ia.data[i * 4 + c] = d[i * 4 + c];
    else if (al > 0) { egen = true; const j = ((i / w | 0) * (w + 1) + i % w) * 4; ib.data[j] = ib.data[j + 1] = ib.data[j + 2] = ib.data[j + 3] = 255; }
  }
  if (!egen) for (let i = 0; i < w * h; i++) if (d[i * 4 + 3] >= 250) { const j = (((i / w | 0) + 1) * (w + 1) + i % w + 1) * 4; ib.data[j] = ib.data[j + 1] = ib.data[j + 2] = ib.data[j + 3] = 255; }
  ga.putImageData(ia, 0, 0); gb.putImageData(ib, 0, 0);
  const o = { scaleMode: PIXI.SCALE_MODES.NEAREST };
  utan.set(k, PIXI.Texture.from(a, o)); form.set(k, PIXI.Texture.from(b, o));
}
export const ikonUtanSkugga = (k: string) => { if (!utan.has(k)) dela(k); return utan.get(k)!; };
const ikonSkugga = (k: string) => { if (!form.has(k)) dela(k); return form.get(k)!; };

// ---------- formerna ----------
// bildstilens skugga vid foten (cx, by): en hel oval snett åt höger, w = halva bredden (ungefär kronans), ry2 = höjden i
// kvadrat (5 för träden, två punkter upp och ned), lang = hur lång den är (1 på dagen, steg 5.1.8.2)
export function fotSkugga(g: PIXI.Graphics, cx: number, by: number, w: number, ry2: number, lang = 1) {
  const W = w * lang, mitt = W * 0.7, r2 = W * W + 1;
  for (let dy = -Math.floor(Math.sqrt(ry2)); dy * dy < ry2; dy++) {
    const rest = 1 - dy * dy / ry2;
    if (rest <= 0) continue;
    const half = Math.sqrt(r2 * rest), a = Math.max(-1, Math.floor(mitt - half) + 1), b = Math.min(Math.ceil(2 * W), Math.ceil(mitt + half) - 1);
    if (b >= a) g.drawRect(Math.round(cx) + a, Math.round(by) + dy, b - a + 1, 1);
  }
}

// hur lång skuggan är nu (1 på dagen; längre i skymningen kommer i steg 5.1.8.2)
let langd = 1;
export const skuggLangd = () => langd;
export const sattSkuggLangd = (l: number) => { langd = l; };

// ---------- skuggbilden och filtret ----------
const FRAG = `
precision highp float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform sampler2D uSkugga;
uniform vec4 inputSize;
uniform vec4 outputFrame;
uniform vec3 uPal[32];
uniform vec3 uM1[32];
uniform vec2 uPos;
uniform float uSkala;
uniform vec2 uStorlek;
void main() {
  vec4 c = texture2D(uSampler, vTextureCoord);
  if (c.a < 0.004) { gl_FragColor = c; return; }
  vec2 w = (vTextureCoord * inputSize.xy + outputFrame.xy - uPos) / uSkala;
  vec2 uv = (floor(w) + 0.5) / uStorlek;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0 || texture2D(uSkugga, uv).a < 0.5) { gl_FragColor = c; return; }
  vec3 col = c.rgb / c.a, o = col;
  float bd = 1e9;
  for (int i = 0; i < 32; i++) {
    vec3 d = uPal[i] - col;
    float dd = dot(d, d);
    if (dd < bd) { bd = dd; o = uM1[i]; }
  }
  gl_FragColor = vec4(o * c.a, c.a);
}`;
const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const platt = (fs: readonly string[]) => new Float32Array(fs.flatMap(rgb));
let rt: PIXI.RenderTexture | undefined;
let filter: PIXI.Filter | undefined; // görs först i webbläsaren (testerna läser träden utan att rita)
const skuggFilter = () => filter ??= new PIXI.Filter(undefined, FRAG, {
  uPal: platt(FARGER), uM1: platt(MORKARE[1]), uPos: new Float32Array(2), uSkala: 1, uStorlek: new Float32Array([1, 1]), uSkugga: PIXI.Texture.EMPTY,
});

// det som ritas i skuggbilden varje bildruta: de fasta (träden och väggarna, ritas om bara när de ändras) och de som rör sig
// (görs först när något ritas: testerna läser träden utan webbläsare)
let lager: { fasta: PIXI.Graphics; folk: PIXI.Graphics; vaggar: PIXI.Container; vaggHal: PIXI.Container; ikoner: PIXI.Container; scen: PIXI.Container } | undefined;
function delar() {
  if (lager) return lager;
  const l = lager = { fasta: new PIXI.Graphics(), folk: new PIXI.Graphics(), vaggar: new PIXI.Container(), vaggHal: new PIXI.Container(), ikoner: new PIXI.Container(), scen: new PIXI.Container() };
  l.scen.addChild(l.fasta, l.vaggar, l.vaggHal, l.folk, l.ikoner); // vaggHal: väggarna själva, som tas bort ur skuggan
  return l;
}
export const skuggTrad = () => delar().fasta; // träden
export const skuggFolk = () => delar().folk; // folket
// väggarnas form flyttad snett åt höger (VAGG_D punkter); där väggen själv står blir det ingen skugga
export const VAGG_D = 2;
const vaggSp: PIXI.Sprite[] = [], halSp: PIXI.Sprite[] = [];
export function vaggSkuggor(lista: { x: number; y: number; t: PIXI.Texture }[]) {
  lista.forEach((v, i) => {
    let a = vaggSp[i], b = halSp[i];
    if (!a) { a = vaggSp[i] = new PIXI.Sprite(); delar().vaggar.addChild(a); b = halSp[i] = new PIXI.Sprite(); b.blendMode = PIXI.BLEND_MODES.ERASE; delar().vaggHal.addChild(b); }
    a.texture = b!.texture = v.t; a.position.set(v.x + VAGG_D, v.y + VAGG_D); b!.position.set(v.x, v.y); a.visible = b!.visible = true;
  });
  for (let i = lista.length; i < vaggSp.length; i++) vaggSp[i]!.visible = halSp[i]!.visible = false;
}

// skuggorna nu: kastare = lagren med det som står (bilderna i dem som ritats med Ikoner och skugga, ikonSkugga i sp.skuggIkon),
// mottagare = marken och golven, som får filtret. Bredd och höjd = kartan i världens pixlar
export function ritaSkuggor(renderer: PIXI.Renderer, varld: PIXI.Container, kastare: PIXI.Container[], mottagare: PIXI.Container[], bredd: number, hojd: number) {
  if (!rt || rt.width !== bredd || rt.height !== hojd) {
    rt?.destroy(true);
    rt = PIXI.RenderTexture.create({ width: bredd, height: hojd, scaleMode: PIXI.SCALE_MODES.NEAREST, resolution: 1 });
  }
  const { ikoner, scen } = delar();
  let n = 0;
  for (const k of kastare) for (const c of k.children) {
    const sp = c as PIXI.Sprite & { skuggIkon?: string };
    if (!sp.skuggIkon || !sp.visible) continue;
    let q = ikoner.children[n++] as PIXI.Sprite | undefined;
    if (!q) { q = new PIXI.Sprite(); ikoner.addChild(q); }
    q.texture = ikonSkugga(sp.skuggIkon); q.position.copyFrom(sp.position); q.scale.copyFrom(sp.scale); q.visible = true;
  }
  for (let i = n; i < ikoner.children.length; i++) ikoner.children[i]!.visible = false;
  renderer.render(scen, { renderTexture: rt, clear: true });
  const f = skuggFilter(), u = f.uniforms;
  u.uSkugga = rt; u.uPos[0] = varld.position.x; u.uPos[1] = varld.position.y; u.uSkala = varld.scale.x;
  u.uStorlek[0] = bredd; u.uStorlek[1] = hojd;
  for (const m of mottagare) if (!m.filters) m.filters = [f];
}
