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
// kvadrat (5 för träden, två punkter upp och ned), lang = hur lång den är (1 på dagen, längre i skymningen, steg 5.1.8.2)
export function fotSkugga(g: PIXI.Graphics, cx: number, by: number, w: number, ry2: number, lang = 1) {
  const W = w * lang, mitt = W * 0.7, r2 = W * W + 1;
  for (let dy = -Math.floor(Math.sqrt(ry2)); dy * dy < ry2; dy++) {
    const rest = 1 - dy * dy / ry2;
    if (rest <= 0) continue;
    const half = Math.sqrt(r2 * rest), a = Math.max(-1, Math.floor(mitt - half) + 1), b = Math.min(Math.ceil(2 * W), Math.ceil(mitt + half) - 1);
    if (b >= a) g.drawRect(Math.round(cx) + a, Math.round(by) + dy, b - a + 1, 1);
  }
}

// hur lång skuggan är nu (steg 5.1.8.2): 1 på dagen och längre i skymningen, när solen står lågt, upp till SKYMNING_LANG
// när ljuset är borta. I steg om en fjärdedel, så att trädens skuggor bara ritas om när längden byts. Ovalerna blir bredare,
// och stationernas, sakernas, djurens och väggarnas form läggs ut fler gånger åt höger (en punkt per gång, extra())
export const SKYMNING_LANG = 2.5;
let langd = 1;
export const skuggLangd = () => langd;
export const sattSkuggLangd = (l: number) => { langd = l; };
export const skuggLangdAv = (ljus: number) => 1 + Math.round((SKYMNING_LANG - 1) * (1 - Math.max(0, Math.min(1, ljus))) * 4) / 4;
const extra = () => Math.round((langd - 1) * 2);

// ---------- skuggbilden och filtret ----------
const FRAG = `
precision highp float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform sampler2D uSkugga;
uniform sampler2D uTak;
uniform vec4 inputSize;
uniform vec4 outputFrame;
uniform vec3 uPal[32];
uniform vec3 uM1[32];
uniform vec3 uM2[32];
uniform vec2 uPos;
uniform float uSkala;
uniform vec2 uStorlek;
uniform float uMoln;
uniform vec2 uMolnPos;
uniform float uMolnStorlek;
float molnHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float molnBrus(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(molnHash(i), molnHash(i + vec2(1.0, 0.0)), f.x), mix(molnHash(i + vec2(0.0, 1.0)), molnHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  vec4 c = texture2D(uSampler, vTextureCoord);
  if (c.a < 0.004) { gl_FragColor = c; return; }
  vec2 w = (vTextureCoord * inputSize.xy + outputFrame.xy - uPos) / uSkala;
  vec2 uv = (floor(w) + 0.5) / uStorlek;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) { gl_FragColor = c; return; }
  float n = step(0.5, texture2D(uSkugga, uv).a) + step(0.5, texture2D(uTak, uv).a);
  if (uMoln < 1.0) {
    vec2 q = (floor(w) + uMolnPos) / uMolnStorlek;
    float m = molnBrus(q) * 0.65 + molnBrus(q * 2.3 + 17.0) * 0.35;
    n = min(2.0, n + step(uMoln, m));
  }
  if (n < 0.5) { gl_FragColor = c; return; }
  vec3 col = c.rgb / c.a, o = col;
  float bd = 1e9;
  for (int i = 0; i < 32; i++) {
    vec3 d = uPal[i] - col;
    float dd = dot(d, d);
    if (dd < bd) { bd = dd; o = n > 1.5 ? uM2[i] : uM1[i]; }
  }
  gl_FragColor = vec4(o * c.a, c.a);
}`;
const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const platt = (fs: readonly string[]) => new Float32Array(fs.flatMap(rgb));
let rt: PIXI.RenderTexture | undefined, rtTak: PIXI.RenderTexture | undefined;
let filter: PIXI.Filter | undefined; // görs först i webbläsaren (testerna läser träden utan att rita)
const skuggFilter = () => filter ??= new PIXI.Filter(undefined, FRAG, {
  uPal: platt(FARGER), uM1: platt(MORKARE[1]), uM2: platt(MORKARE[2]), uPos: new Float32Array(2), uSkala: 1, uStorlek: new Float32Array([1, 1]), uSkugga: PIXI.Texture.EMPTY, uTak: PIXI.Texture.EMPTY, uMoln: 2, uMolnPos: new Float32Array(2), uMolnStorlek: 1,
});

// molnskuggorna (steg 5.1.10, Vädret under Tidsmodell): fläckar ett steg mörkare som glider över marken med vinden. Några små
// moln när det är klart, fler ju mulnare det blir; när himlen är helt mulen gör vaderbild.ts hela bilden mörkare i stället,
// och på natten finns inga. Bara utseende: molnen räknas i webbläsarens tid, inte ur spelets
export const MOLN = {
  klart: 0.1, // så stor del av marken ligger i molnskugga när himlen är klar ...
  mest: 0.5, // ... och så stor del när det mulnat på ...
  mulet: 0.85, // ... vid så här mycket moln (vaderNu.moln); över det försvinner fläckarna mot helt mulet
  storlek: 150, // ett moln är ungefär så här stort, i världens punkter (16 per ruta)
  fart: 0.004, vindFart: 0.02, // så fort molnen glider, världens punkter per millisekund (datorns tid), och så mycket fortare i den hårdaste blåsten
  riktning: [1, 0.35], // åt öster och lite söderut
};
const molnPos = [0, 0];
let molnTid = 0, molnGrans = 2;
// moln = hur molnigt (0–1), vind = blåsten (0–1), ljus = dagsljuset (0–1), ms = datorns tid
export function sattMoln(moln: number, vind: number, ljus: number, ms: number) {
  const dt = molnTid ? Math.min(1000, ms - molnTid) : 0, v = MOLN.fart + MOLN.vindFart * vind;
  molnTid = ms;
  molnPos[0] = (molnPos[0]! - dt * v * MOLN.riktning[0]!) % 100000; molnPos[1] = (molnPos[1]! - dt * v * MOLN.riktning[1]!) % 100000;
  const tack = ljus * (moln >= 1 ? 0 : (MOLN.klart + (MOLN.mest - MOLN.klart) * Math.min(1, moln / MOLN.mulet)) * Math.min(1, (1 - moln) / (1 - MOLN.mulet)));
  molnGrans = tack <= 0.005 ? 2 : 0.5 + (0.5 - tack) * 0.55; // brusets gräns: över den är det moln
}

// det som ritas i skuggbilden varje bildruta: de fasta (träden och väggarna, ritas om bara när de ändras) och de som rör sig
// (görs först när något ritas: testerna läser träden utan webbläsare)
let lager: { fasta: PIXI.Graphics; folk: PIXI.Graphics; vaggar: PIXI.Container; vaggHal: PIXI.Container; ikoner: PIXI.Container; scen: PIXI.Container; tak: PIXI.Container; takHal: PIXI.Container; takScen: PIXI.Container } | undefined;
function delar() {
  if (lager) return lager;
  const l = lager = { fasta: new PIXI.Graphics(), folk: new PIXI.Graphics(), vaggar: new PIXI.Container(), vaggHal: new PIXI.Container(), ikoner: new PIXI.Container(), scen: new PIXI.Container(), tak: new PIXI.Container(), takHal: new PIXI.Container(), takScen: new PIXI.Container() };
  l.scen.addChild(l.fasta, l.vaggar, l.vaggHal, l.folk, l.ikoner); // vaggHal: väggarna själva, som tas bort ur skuggan
  l.takScen.addChild(l.tak, l.takHal);
  return l;
}
let tradVer = 0;
export const skuggTrad = () => { tradVer++; return delar().fasta; }; // träden (anropas bara när deras skuggor ritas om)
export const skuggFolk = () => delar().folk; // folket
// väggarnas form flyttad snett åt höger (VAGG_D punkter); där väggen själv står blir det ingen skugga
export const VAGG_D = 2;
const vaggSp: PIXI.Sprite[] = [], halSp: PIXI.Sprite[] = [];
export function vaggSkuggor(lista: { x: number; y: number; t: PIXI.Texture }[]) {
  const e = extra();
  let n = 0;
  lista.forEach((v, i) => {
    let b = halSp[i];
    if (!b) { b = halSp[i] = new PIXI.Sprite(); b.blendMode = PIXI.BLEND_MODES.ERASE; delar().vaggHal.addChild(b); }
    b.texture = v.t; b.position.set(v.x, v.y); b.visible = true;
    for (let k = 0; k <= e; k++) {
      let a = vaggSp[n++];
      if (!a) { a = vaggSp[n - 1] = new PIXI.Sprite(); delar().vaggar.addChild(a); }
      a.texture = v.t; a.position.set(v.x + VAGG_D + k, v.y + VAGG_D); a.visible = true;
    }
  });
  for (let i = n; i < vaggSp.length; i++) vaggSp[i]!.visible = false;
  for (let i = lista.length; i < halSp.length; i++) halSp[i]!.visible = false;
}

// under taket (steg 5.1.8.3): husens golv och dörröppningar ligger i husets skugga, ett steg mörkare än ute (två där också en
// vägg skuggar). lista = de färdiga husens rutor: bilden (golvet, och golvet i väggrutan) och för en vägg dess stock (form),
// som inte mörkas
const takSp: PIXI.Sprite[] = [], takHalSp: PIXI.Sprite[] = [];
export function takYtor(lista: { x: number; y: number; t: PIXI.Texture; form?: PIXI.Texture }[]) {
  let h = 0;
  lista.forEach((v, i) => {
    let a = takSp[i];
    if (!a) { a = takSp[i] = new PIXI.Sprite(); delar().tak.addChild(a); }
    a.texture = v.t; a.position.set(v.x, v.y); a.visible = true;
    if (!v.form) return;
    let b = takHalSp[h++];
    if (!b) { b = takHalSp[h - 1] = new PIXI.Sprite(); b.blendMode = PIXI.BLEND_MODES.ERASE; delar().takHal.addChild(b); }
    b.texture = v.form; b.position.set(v.x, v.y); b.visible = true;
  });
  for (let i = lista.length; i < takSp.length; i++) takSp[i]!.visible = false;
  for (let i = h; i < takHalSp.length; i++) takHalSp[i]!.visible = false;
}

// en signatur för allt som ritas i skuggbilderna: n = antalet bilder med egen skugga som används nu
let ritadSig = '';
const blanda = (h: number, v: number) => (Math.imul(h, 31) + (v | 0)) | 0;
function spriteSig(h: number, c: PIXI.Container) {
  for (const x of c.children) {
    const sp = x as PIXI.Sprite;
    if (!sp.visible) continue;
    h = blanda(blanda(blanda(blanda(h, sp.texture?.baseTexture?.uid ?? 0), (sp.texture?.frame.x ?? 0) * 7919 + (sp.texture?.frame.y ?? 0)), sp.position.x * 64), sp.position.y * 64);
    h = blanda(h, sp.scale.x * 1024);
  }
  return h;
}
function skuggSig(n: number, bredd: number, hojd: number) {
  const l = delar();
  let h = 17;
  for (const d of l.folk.geometry.graphicsData) { const r = d.shape as PIXI.Rectangle; h = blanda(blanda(blanda(blanda(h, r.x * 8), r.y * 8), r.width * 8), r.height * 8); }
  for (const c of [l.vaggar, l.vaggHal, l.ikoner, l.tak, l.takHal]) h = spriteSig(h, c);
  return `${tradVer}|${l.folk.geometry.graphicsData.length}|${n}|${bredd}|${hojd}|${h}`;
}

// skuggorna nu: kastare = lagren med det som står (bilderna i dem som ritats med Ikoner och skugga, ikonSkugga i sp.skuggIkon),
// mottagare = marken och golven, som får filtret. Bredd och höjd = kartan i världens pixlar
export function ritaSkuggor(renderer: PIXI.Renderer, varld: PIXI.Container, kastare: PIXI.Container[], mottagare: PIXI.Container[], bredd: number, hojd: number) {
  if (!rt || !rtTak || rt.width !== bredd || rt.height !== hojd) {
    rt?.destroy(true); rtTak?.destroy(true);
    rt = PIXI.RenderTexture.create({ width: bredd, height: hojd, scaleMode: PIXI.SCALE_MODES.NEAREST, resolution: 1 });
    rtTak = PIXI.RenderTexture.create({ width: bredd, height: hojd, scaleMode: PIXI.SCALE_MODES.NEAREST, resolution: 1 });
    ritadSig = '';
  }
  const { ikoner, scen, takScen } = delar(), e = extra();
  let n = 0;
  for (const k of kastare) for (const c of k.children) {
    const sp = c as PIXI.Sprite & { skuggIkon?: string };
    if (!sp.skuggIkon || !sp.visible) continue;
    for (let j = 0; j <= e; j++) {
      let q = ikoner.children[n++] as PIXI.Sprite | undefined;
      if (!q) { q = new PIXI.Sprite(); ikoner.addChild(q); }
      q.texture = ikonSkugga(sp.skuggIkon); q.position.set(sp.position.x + j, sp.position.y); q.scale.copyFrom(sp.scale); q.visible = true;
    }
  }
  for (let i = n; i < ikoner.children.length; i++) ikoner.children[i]!.visible = false;
  // skuggbilderna ritas om bara när något i dem ändrats (steg 5.5.7): träden när deras skuggor ritats om, och folket,
  // väggarna, taken och bilderna efter var de står
  const sig = skuggSig(n, bredd, hojd);
  if (sig !== ritadSig) {
    ritadSig = sig;
    renderer.render(scen, { renderTexture: rt, clear: true });
    renderer.render(takScen, { renderTexture: rtTak, clear: true });
  }
  const f = skuggFilter(), u = f.uniforms;
  u.uSkugga = rt; u.uTak = rtTak; u.uPos[0] = varld.position.x; u.uPos[1] = varld.position.y; u.uSkala = varld.scale.x;
  u.uStorlek[0] = bredd; u.uStorlek[1] = hojd;
  u.uMoln = molnGrans; u.uMolnPos[0] = molnPos[0]; u.uMolnPos[1] = molnPos[1]; u.uMolnStorlek = MOLN.storlek;
  for (const m of mottagare) if (!m.filters) m.filters = [f];
}
