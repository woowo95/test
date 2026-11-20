// Skymningen och natten (steg 5.1.1.4, "Bildstil" under Gränssnitt i designdokumentet): i stället för en mörk, halvgenomskinlig
// ruta över kartan byts varje färg på marken, i naturen, i husen och på folket mot samma färg ett steg mörkare i paletten i
// skymningen och två steg mörkare på natten (MORKARE i palett.ts). Mellan stegen väljer ett rastermönster (Bayer 4 × 4, en ruta
// per punkt i bilderna) vilket steg punkten får, så att övergången blir jämn utan nya färger. Elden lyser: nära en brinnande
// eld (eller glöd) är mörkret mindre, och det minskar i steg utåt. Mitt i natten (steg 5.1.7.2) är det tre steg mörkare, så
// att nästan allt är kolsvart och bara elden lyser. Bara utseende; filtret gör inget alls på dagen.
// Mörkret ligger i hela steg över kartan (steg 6.8.17): rastret används bara i kanten av ljuset och i en smal rand (RAND, en
// del av kartans bredd) som sveper över kartan från öster till väster under SVEP_MS (datorns tid) när mörkret går ett steg.
import * as PIXI from 'pixi.js';
import { FARGER, MORKARE, BAYER } from '../palett';
import { W } from '../sim';
import { platt } from './pixel';
import { SKUGGA } from './eldskugga';

const RAND = 0.03, KART = W * 16, SVEP_MS = 60000; // randens bredd som del av kartan, kartans bredd i världens punkter, svepets tid

const MAX_ELDAR = 8, MAX_FOLK = 64;
const SKUGGA_LJUS = '0.45'; // så mycket ljus skuggan tar (ljuset gånger 3,3 är stegen mörker: ungefär ett och ett halvt steg)
// strålarna från eldarna (ui/eldskugga.ts): en rad per eld, längden åt varje håll i åttondels rutor, i röd kanal
const skuggData = new Uint8Array(SKUGGA.hall * MAX_ELDAR * 4).fill(255);
const skuggTex = PIXI.Texture.fromBuffer(skuggData, SKUGGA.hall, MAX_ELDAR, { scaleMode: PIXI.SCALE_MODES.NEAREST, mipmap: PIXI.MIPMAP_MODES.OFF });
const FRAG = `
precision highp float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform vec4 inputSize;
uniform vec4 outputFrame;
uniform vec3 uPal[32];
uniform vec3 uM1[32];
uniform vec3 uM2[32];
uniform vec3 uM3[32];
uniform float uBayer[16];
uniform vec2 uPos;
uniform float uSkala;
uniform vec4 uEld[${MAX_ELDAR}];
uniform vec3 uFolk[${MAX_FOLK}];
uniform sampler2D uSkugga;
uniform float uHarSkugga[${MAX_ELDAR}];
uniform float uKart;
uniform float uRand;
uniform float uFran;
uniform float uTill;
uniform float uSvep;
void main() {
  vec4 c = texture2D(uSampler, vTextureCoord);
  if (c.a < 0.004) { gl_FragColor = c; return; }
  vec3 col = c.rgb / c.a;
  vec2 w = (vTextureCoord * inputSize.xy + outputFrame.xy - uPos) / uSkala;
  float ljus = 0.0;
  for (int i = 0; i < ${MAX_ELDAR}; i++) {
    vec4 e = uEld[i];
    float d = length(w - e.xy) / max(e.z, 1.0);
    float li = e.w < 0.0 ? -e.w * (1.0 - smoothstep(0.5, 1.0, d)) : e.w * clamp(1.0 - d, 0.0, 1.0);
    // eldens skuggor (steg 12.3.2, ui/eldskugga.ts): bakom en vägg eller en stam är ljuset ett eller två steg svagare, med raster
    // bara i skuggans kant
    if (e.z > 0.0 && uHarSkugga[i] > 0.5) {
      vec2 dv = w - e.xy;
      float a = fract(atan(dv.y, dv.x) / 6.2831853 + 1.0);
      float r = texture2D(uSkugga, vec2((floor(a * ${SKUGGA.hall}.0) + 0.5) / ${SKUGGA.hall}.0, (float(i) + 0.5) / ${MAX_ELDAR}.0)).r * 255.0;
      if (r < 254.5) li = max(0.0, li - ${SKUGGA_LJUS} * smoothstep(r * ${16 / SKUGGA.per}.0, r * ${16 / SKUGGA.per}.0 + 3.0, length(dv)));
    }
    if (e.z > 0.0) ljus = max(ljus, li);
  }
  // mörkret på kartan i hela steg; öster om randen har det redan gått till det nya steget, och i randen går det jämnt
  // ljuset kring människorna (steg 9.2.69): ett steg ljusare än mörkret i en liten cirkel, som tonar ut i kanten
  float folk = 0.0;
  for (int i = 0; i < ${MAX_FOLK}; i++) {
    vec3 f = uFolk[i];
    if (f.z > 0.0) folk = max(folk, clamp(1.6 * (1.0 - length(w - f.xy) / f.z), 0.0, 1.0));
  }
  float u = 1.0 - (w.x * 0.85 + w.y * 0.15) / uKart;
  float bas = uFran + (uTill - uFran) * clamp((uSvep * (1.0 + uRand) - u) / uRand, 0.0, 1.0);
  float m = max(0.0, bas - max(3.3 * ljus, folk));
  float bd = 1e9;
  vec3 b0 = col, b1 = col, b2 = col, b3 = col;
  for (int i = 0; i < 32; i++) {
    vec3 d = uPal[i] - col;
    float dd = dot(d, d);
    if (dd < bd) { bd = dd; b0 = uPal[i]; b1 = uM1[i]; b2 = uM2[i]; b3 = uM3[i]; }
  }
  vec2 px = floor(w);
  float k = mod(px.x, 4.0) + 4.0 * mod(px.y, 4.0), bay = 0.0;
  for (int j = 0; j < 16; j++) if (float(j) == k) bay = uBayer[j];
  float lag = floor(min(m, 2.0));
  float steg = lag + ((min(m, 3.0) - lag) * 16.0 > bay + 0.5 ? 1.0 : 0.0);
  vec3 o = steg < 0.5 ? b0 : (steg < 1.5 ? b1 : (steg < 2.5 ? b2 : b3));
  gl_FragColor = vec4(o * c.a, c.a);
}`;


export const nattFilter = new PIXI.Filter(undefined, FRAG, {
  uPal: platt(FARGER), uM1: platt(MORKARE[1]), uM2: platt(MORKARE[2]), uM3: platt(MORKARE[3]),
  uBayer: new Float32Array(BAYER),
  uFran: 0, uTill: 0, uSvep: 1, uPos: new Float32Array(2), uSkala: 1, uEld: new Float32Array(MAX_ELDAR * 4), uSkugga: skuggTex, uHarSkugga: new Float32Array(MAX_ELDAR), uFolk: new Float32Array(MAX_FOLK * 3), uKart: KART, uRand: RAND,
});

// mörkret m (0 dag, 1 skymning, 2 natt, 3 djup natt, och tal emellan) och eldarna (x och y i världens punkter, hur långt ljuset
// når, styrkan 0–1). En negativ styrka är elden (steg 6.8.15): fullt ljus ut till halva vägen och sedan mjukt avtagande; de andra
// avtar jämnt. Mörkret avrundas till hela steg; när steget byts sveper randen över kartan (steg 6.8.17)
const svep = { fran: -1, till: -1, t0: 0 };
let skuggSatt = false;
// folk: människorna (x och y i världens punkter, cirkelns radie), som var och en har en liten, svag ljuscirkel (steg 9.2.69). Den
// finns bara i bilden och är ingen ljuskälla i simuleringen
// skuggor: strålarna för de första eldarna (ui/eldskugga.ts, steg 12.3.2), och ny = om de räknats om sedan förra bilden
export function stallNatt(lager: PIXI.Container, varld: PIXI.Container, m: number, eldar: { x: number; y: number; r: number; k: number }[], folk: { x: number; y: number; r: number }[] = [], skuggor?: { rader: Uint8Array[]; ny: boolean }) {
  const nu = performance.now(), mal = Math.round(m);
  if (svep.till < 0) { svep.fran = svep.till = mal; svep.t0 = nu - SVEP_MS; } // första bilden: inget svep
  else if (mal !== svep.till) { svep.fran = svep.till; svep.till = mal; svep.t0 = nu; } // ett nytt steg mitt i ett svep: det förra gäller hela kartan
  const del = Math.min(1, (nu - svep.t0) / SVEP_MS);
  if (del >= 1) svep.fran = svep.till;
  if (svep.fran <= 0 && svep.till <= 0) { if (lager.filters) lager.filters = null; return; }
  if (!lager.filters) lager.filters = [nattFilter];
  const u = nattFilter.uniforms;
  u.uFran = svep.fran; u.uTill = svep.till; u.uSvep = del; u.uPos[0] = varld.position.x; u.uPos[1] = varld.position.y; u.uSkala = varld.scale.x;
  const e = u.uEld as Float32Array; e.fill(0);
  eldar.slice(0, MAX_ELDAR).forEach((f, i) => e.set([f.x, f.y, f.r, f.k], i * 4));
  const hs = u.uHarSkugga as Float32Array; hs.fill(0);
  if (skuggor) {
    skuggor.rader.slice(0, MAX_ELDAR).forEach((_, i) => { hs[i] = 1; });
    if (skuggor.ny || !skuggSatt) {
      skuggData.fill(255);
      skuggor.rader.slice(0, MAX_ELDAR).forEach((r, i) => { for (let a = 0; a < SKUGGA.hall; a++) skuggData[(i * SKUGGA.hall + a) * 4] = r[a]; });
      skuggTex.baseTexture.update(); skuggSatt = true;
    }
  }
  const fo = u.uFolk as Float32Array; fo.fill(0);
  folk.slice(0, MAX_FOLK).forEach((f, i) => fo.set([f.x, f.y, f.r], i * 3));
}
