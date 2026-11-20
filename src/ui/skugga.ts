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
import { FARGER, MORKARE, LITE_MORKARE } from '../palett';
import { platt } from './pixel';

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
// Formen som rader [dy, a, b]: punkterna a till b (relativt cx) på raden by + dy
function fotForm(w: number, ry2: number, lang: number) {
  const W = w * lang, mitt = W * 0.7, r2 = W * W + 1, ut: [number, number, number][] = [];
  for (let dy = -Math.floor(Math.sqrt(ry2)); dy * dy < ry2; dy++) {
    const rest = 1 - dy * dy / ry2;
    if (rest <= 0) continue;
    const half = Math.sqrt(r2 * rest), a = Math.max(-1, Math.floor(mitt - half) + 1), b = Math.min(Math.ceil(2 * W), Math.ceil(mitt + half) - 1);
    if (b >= a) ut.push([dy, a, b]);
  }
  return ut;
}
export function fotSkugga(g: PIXI.Graphics, cx: number, by: number, w: number, ry2: number, lang = 1) {
  for (const [dy, a, b] of fotForm(w, ry2, lang)) g.drawRect(Math.round(cx) + a, Math.round(by) + dy, b - a + 1, 1);
}
// Trädens skuggor som färdiga bilder (steg 12.1.181): varje form (w, ry2, lang) ritas en gång i en gemensam bild (ATLAS, rad för
// rad), och varje träd får en bild ur den, med samma punkter som fotSkugga ritar. Bilden växer med en ny gemensam bild när den är full
const ATLAS = 512;
interface Atlas { cv: HTMLCanvasElement; bas: PIXI.BaseTexture; x: number; y: number; rad: number }
let atlas: Atlas | undefined;
const formBilder = new Map<string, { t: PIXI.Texture; dx: number; dy: number }>();
function formBild(w: number, ry2: number, lang: number) {
  const k = `${w},${ry2},${lang}`;
  let f = formBilder.get(k);
  if (f) return f;
  const rader = fotForm(w, ry2, lang);
  const dx = Math.min(...rader.map(r => r[1])), dy = rader[0]![0], bw = Math.max(...rader.map(r => r[2])) - dx + 1, bh = rader[rader.length - 1]![0] - dy + 1;
  if (!atlas || atlas.x + bw > ATLAS && atlas.y + atlas.rad + 1 + bh > ATLAS) {
    const cv = document.createElement('canvas'); cv.width = cv.height = ATLAS;
    atlas = { cv, bas: PIXI.BaseTexture.from(cv, { scaleMode: PIXI.SCALE_MODES.NEAREST }), x: 0, y: 0, rad: 0 };
  }
  if (atlas.x + bw > ATLAS) { atlas.x = 0; atlas.y += atlas.rad + 1; atlas.rad = 0; }
  const g = atlas.cv.getContext('2d')!, ox = atlas.x, oy = atlas.y;
  g.fillStyle = '#ffffff';
  for (const [y, a, b] of rader) g.fillRect(ox + a - dx, oy + y - dy, b - a + 1, 1);
  atlas.bas.update();
  f = { t: new PIXI.Texture(atlas.bas, new PIXI.Rectangle(ox, oy, bw, bh)), dx, dy };
  atlas.x += bw + 1; atlas.rad = Math.max(atlas.rad, bh);
  formBilder.set(k, f);
  return f;
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
uniform sampler2D uTrad;
uniform sampler2D uRor;
uniform vec2 uRorPos;
uniform vec2 uRorStorlek;
uniform vec4 inputSize;
uniform vec4 outputFrame;
uniform vec3 uPal[32];
uniform vec3 uM1[32];
uniform vec3 uM2[32];
uniform vec3 uML[32];
uniform float uMolnKant;
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
  // den rörliga delen (folket och djuren) ligger i en liten bild över det som syns; utanför den finns ingen rörlig skugga
  vec2 uvR = (floor(w) - uRorPos + 0.5) / uRorStorlek;
  float r = uvR.x < 0.0 || uvR.y < 0.0 || uvR.x > 1.0 || uvR.y > 1.0 ? 0.0 : texture2D(uRor, uvR).a;
  float n = step(0.5, max(max(texture2D(uSkugga, uv).a, texture2D(uTrad, uv).a), r)) + step(0.5, texture2D(uTak, uv).a);
  float ml = 0.0;
  if (uMoln < 1.0) {
    vec2 f = floor(w), q = (f + uMolnPos) / uMolnStorlek;
    float m = molnBrus(q) * 0.65 + molnBrus(q * 2.3 + 17.0) * 0.35;
    // kanten: ett rastermönster (Bayer 4 x 4) över uMolnKant av bruset, så att skuggan tunnas ut mot kanten
    vec2 b1 = mod(f, 2.0), b2 = mod(floor(f / 2.0), 2.0);
    float bayer = 4.0 * (2.0 * b1.x + 3.0 * b1.y - 4.0 * b1.x * b1.y) + 2.0 * b2.x + 3.0 * b2.y - 4.0 * b2.x * b2.y;
    ml = step((bayer + 0.5) / 16.0, clamp((m - uMoln) / uMolnKant + 0.5, 0.0, 1.0));
  }
  if (n < 0.5 && ml < 0.5) { gl_FragColor = c; return; }
  vec3 col = c.rgb / c.a, o = col;
  float bd = 1e9;
  for (int i = 0; i < 32; i++) {
    vec3 d = uPal[i] - col;
    float dd = dot(d, d);
    if (dd < bd) { bd = dd; o = n > 1.5 || (n > 0.5 && ml > 0.5) ? uM2[i] : n > 0.5 ? uM1[i] : uML[i]; }
  }
  gl_FragColor = vec4(o * c.a, c.a);
}`;
let rt: PIXI.RenderTexture | undefined, rtTak: PIXI.RenderTexture | undefined, rtTrad: PIXI.RenderTexture | undefined, rtRor: PIXI.RenderTexture | undefined; // rtTrad: trädens skuggor (steg 12.1.181), rtRor: den rörliga delen (steg 12.1.182)
let filter: PIXI.Filter | undefined; // görs först i webbläsaren (testerna läser träden utan att rita)
const skuggFilter = () => filter ??= new PIXI.Filter(undefined, FRAG, {
  uPal: platt(FARGER), uM1: platt(MORKARE[1]), uM2: platt(MORKARE[2]), uML: platt(LITE_MORKARE), uMolnKant: 0.08, uPos: new Float32Array(2), uSkala: 1, uStorlek: new Float32Array([1, 1]), uSkugga: PIXI.Texture.EMPTY, uTak: PIXI.Texture.EMPTY, uTrad: PIXI.Texture.EMPTY, uRor: PIXI.Texture.EMPTY, uRorPos: new Float32Array(2), uRorStorlek: new Float32Array([1, 1]), uMoln: 2, uMolnPos: new Float32Array(2), uMolnStorlek: 1,
});

// molnskuggorna (steg 5.1.10 och 6.8.19, Vädret under Tidsmodell): stora fläckar lite mörkare (LITE_MORKARE) med rastrad kant, som glider över marken med vinden. Några små
// moln när det är klart, fler ju mulnare det blir; när himlen är helt mulen gör vaderbild.ts hela bilden mörkare i stället,
// och på natten finns inga. Bara utseende: molnen räknas i webbläsarens tid, inte ur spelets
export const MOLN = {
  klart: 0.1, // så stor del av marken ligger i molnskugga när himlen är klar ...
  mest: 0.5, // ... och så stor del när det mulnat på ...
  mulet: 0.85, // ... vid så här mycket moln (vaderNu.moln); över det försvinner fläckarna mot helt mulet
  storlek: 600, // ett moln (ungefär 37 rutor) är ungefär så här stort, i världens punkter (16 per ruta)
  fart: 0.004, vindFart: 0.02, // så fort molnen glider, världens punkter per millisekund (datorns tid), och så mycket fortare i den hårdaste blåsten
  riktning: [1, 0.35], // åt öster och lite söderut
  kant: 0.08, // så stor del av bruset rastret vid kanten tar: ungefär tre rutor med molnets storlek
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

// det som ritas i skuggbilderna, i fyra delar som var och en ritas om bara när något i den ändrats: träden i en egen bild (steg
// 12.1.181), som ritas om bara när en skuggas form eller väggarna ändrats; den fasta delen (väggarna och sakerna); den lilla
// rörliga delen (steg 12.1.182: folket och djuren, i en bild över det som syns); och taket (steg 12.1.182). Väggarna själva
// (vaggHal) tas bort ur trädens och väggarnas skuggor (görs först när något ritas: testerna läser träden utan webbläsare)
let lager: { trad: PIXI.Container; folk: PIXI.Graphics; vaggar: PIXI.Container; vaggHal: PIXI.Container; ikoner: PIXI.Container; ikonerRor: PIXI.Container; scen: PIXI.Container; ror: PIXI.Container; tak: PIXI.Container; takHal: PIXI.Container; takScen: PIXI.Container } | undefined;
function delar() {
  if (lager) return lager;
  const l = lager = { trad: new PIXI.Container(), folk: new PIXI.Graphics(), vaggar: new PIXI.Container(), vaggHal: new PIXI.Container(), ikoner: new PIXI.Container(), ikonerRor: new PIXI.Container(), scen: new PIXI.Container(), ror: new PIXI.Container(), tak: new PIXI.Container(), takHal: new PIXI.Container(), takScen: new PIXI.Container() };
  l.scen.addChild(l.vaggar, l.vaggHal, l.ikoner); // vaggHal: väggarna själva, som tas bort ur skuggan (inte ur sakernas, folkets och djurens)
  l.ror.addChild(l.folk, l.ikonerRor);
  l.takScen.addChild(l.tak, l.takHal);
  return l;
}
// trädens skuggor (trad.ts, anropas bara när en skuggas form eller längden ändrats): fötterna x, y, w och ry2 som i fotSkugga
let tradVer = 0;
const tradSp: PIXI.Sprite[] = [];
export function tradSkuggLista(lista: readonly { x: number; y: number; w: number; ry2: number }[], lang: number) {
  tradVer++;
  const c = delar().trad;
  lista.forEach((v, i) => {
    let sp = tradSp[i];
    if (!sp) { sp = tradSp[i] = new PIXI.Sprite(); c.addChild(sp); }
    const f = formBild(v.w, v.ry2, lang);
    sp.texture = f.t; sp.position.set(Math.round(v.x) + f.dx, Math.round(v.y) + f.dy); sp.visible = true;
  });
  for (let i = lista.length; i < tradSp.length; i++) tradSp[i]!.visible = false;
}
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
let ritadSig = '', ritadTrad = '', ritadTak = '', ritadRor = '';
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
// signaturerna: den fasta delen beror på väggarna och sakerna, den rörliga på folket, djuren och var den lilla bilden ligger,
// och takets bild bara på taken (steg 12.1.182)
function skuggSig(n: number, bredd: number, hojd: number) {
  const l = delar();
  let h = 17;
  for (const c of [l.vaggar, l.vaggHal, l.ikoner]) h = spriteSig(h, c);
  return `${n}|${bredd}|${hojd}|${h}`;
}
function rorSig(n: number, x0: number, y0: number, b: number, hj: number) {
  const l = delar();
  let h = spriteSig(17, l.ikonerRor);
  for (const d of l.folk.geometry.graphicsData) { const r = d.shape as PIXI.Rectangle; h = blanda(blanda(blanda(blanda(h, r.x * 8), r.y * 8), r.width * 8), r.height * 8); }
  return `${l.folk.geometry.graphicsData.length}|${n}|${x0}|${y0}|${b}|${hj}|${h}`;
}
const takSig = (bredd: number, hojd: number) => { const l = delar(); return `${bredd}|${hojd}|${spriteSig(spriteSig(17, l.tak), l.takHal)}`; };
// den rörliga bilden täcker det som syns och RORKANT punkter till, och storleken avrundas uppåt till RORSTEG punkter, så att den bara
// görs om när det som syns blivit mycket större eller mindre (zoom)
const RORKANT = 4, RORSTEG = 128, rorFlytt = new PIXI.Matrix();

// skuggorna nu: kastare = lagren med det som står (bilderna i dem som ritats med Ikoner och skugga, ikonSkugga i sp.skuggIkon),
// mottagare = marken och golven, som får filtret. Bredd och höjd = kartan i världens pixlar
export function ritaSkuggor(renderer: PIXI.Renderer, varld: PIXI.Container, kastare: PIXI.Container[], mottagare: PIXI.Container[], bredd: number, hojd: number) {
  if (!rt || !rtTak || !rtTrad || rt.width !== bredd || rt.height !== hojd) {
    rt?.destroy(true); rtTak?.destroy(true); rtTrad?.destroy(true);
    const ny = () => PIXI.RenderTexture.create({ width: bredd, height: hojd, scaleMode: PIXI.SCALE_MODES.NEAREST, resolution: 1 });
    rt = ny(); rtTak = ny(); rtTrad = ny();
    ritadSig = ''; ritadTrad = ''; ritadTak = ''; ritadRor = '';
  }
  const { ikoner, ikonerRor, scen, ror, takScen, trad, vaggHal } = delar(), e = extra();
  let n = 0, nr = 0;
  for (const k of kastare) for (const c of k.children) {
    const sp = c as PIXI.Sprite & { skuggIkon?: string; skuggRor?: boolean };
    if (!sp.skuggIkon || !sp.visible) continue;
    const dit = sp.skuggRor ? ikonerRor : ikoner;
    for (let j = 0; j <= e; j++) {
      let q = dit.children[sp.skuggRor ? nr++ : n++] as PIXI.Sprite | undefined;
      if (!q) { q = new PIXI.Sprite(); dit.addChild(q); }
      q.texture = ikonSkugga(sp.skuggIkon); q.position.set(sp.position.x + j, sp.position.y); q.scale.copyFrom(sp.scale); q.visible = true;
    }
  }
  for (let i = n; i < ikoner.children.length; i++) ikoner.children[i]!.visible = false;
  for (let i = nr; i < ikonerRor.children.length; i++) ikonerRor.children[i]!.visible = false;
  // den rörliga bildens läge: det som syns av kartan i världens punkter, med en liten kant
  const sc = varld.scale.x, sw = renderer.screen.width, sh = renderer.screen.height;
  const x0 = Math.max(0, Math.floor(-varld.position.x / sc) - RORKANT), y0 = Math.max(0, Math.floor(-varld.position.y / sc) - RORKANT);
  const x1 = Math.min(bredd, Math.ceil((sw - varld.position.x) / sc) + RORKANT), y1 = Math.min(hojd, Math.ceil((sh - varld.position.y) / sc) + RORKANT);
  const rb = Math.max(RORSTEG, Math.ceil((x1 - x0) / RORSTEG) * RORSTEG), rh = Math.max(RORSTEG, Math.ceil((y1 - y0) / RORSTEG) * RORSTEG);
  if (!rtRor || rtRor.width !== rb || rtRor.height !== rh) {
    rtRor?.destroy(true);
    rtRor = PIXI.RenderTexture.create({ width: rb, height: rh, scaleMode: PIXI.SCALE_MODES.NEAREST, resolution: 1 });
    ritadRor = '';
  }
  // skuggbilderna ritas om bara när något i dem ändrats (steg 5.5.7): träden när deras skuggor ritats om, och folket,
  // väggarna, taken och bilderna efter var de står
  // trädens skuggbild (steg 12.1.181): bara när en skuggas form, längden eller väggarna ändrats; snö, löv, kol och hamling ändrar
  // inte formen
  const trsig = `${tradVer}|${bredd}|${hojd}|${spriteSig(17, vaggHal)}`;
  if (trsig !== ritadTrad) {
    ritadTrad = trsig;
    renderer.render(trad, { renderTexture: rtTrad, clear: true });
    renderer.render(vaggHal, { renderTexture: rtTrad, clear: false });
  }
  const sig = skuggSig(n, bredd, hojd), tsig = takSig(bredd, hojd), rsig = rorSig(nr, x0, y0, rb, rh);
  if (sig !== ritadSig) { ritadSig = sig; renderer.render(scen, { renderTexture: rt, clear: true }); }
  if (tsig !== ritadTak) { ritadTak = tsig; renderer.render(takScen, { renderTexture: rtTak, clear: true }); }
  if (rsig !== ritadRor) { ritadRor = rsig; rorFlytt.tx = -x0; rorFlytt.ty = -y0; renderer.render(ror, { renderTexture: rtRor, clear: true, transform: rorFlytt }); }
  const f = skuggFilter(), u = f.uniforms;
  u.uSkugga = rt; u.uTak = rtTak; u.uTrad = rtTrad; u.uRor = rtRor; u.uRorPos[0] = x0; u.uRorPos[1] = y0; u.uRorStorlek[0] = rb; u.uRorStorlek[1] = rh; u.uPos[0] = varld.position.x; u.uPos[1] = varld.position.y; u.uSkala = varld.scale.x;
  u.uStorlek[0] = bredd; u.uStorlek[1] = hojd;
  u.uMoln = molnGrans; u.uMolnPos[0] = molnPos[0]; u.uMolnPos[1] = molnPos[1]; u.uMolnStorlek = MOLN.storlek; u.uMolnKant = MOLN.kant;
  for (const m of mottagare) if (!m.filters) m.filters = [f];
}
