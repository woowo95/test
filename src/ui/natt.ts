// Skymningen och natten (steg 5.1.1.4, "Bildstil" under Gränssnitt i designdokumentet): i stället för en mörk, halvgenomskinlig
// ruta över kartan byts varje färg på marken, i naturen, i husen och på folket mot samma färg ett steg mörkare i paletten i
// skymningen och två steg mörkare på natten (MORKARE i palett.ts). Mellan stegen väljer ett rastermönster (Bayer 4 × 4, en ruta
// per punkt i bilderna) vilket steg punkten får, så att övergången blir jämn utan nya färger. Elden lyser: nära en brinnande
// eld (eller glöd) är mörkret mindre, och det minskar i steg utåt. Mitt i natten (steg 5.1.7.2) är det tre steg mörkare, så
// att nästan allt är kolsvart och bara elden lyser. Bara utseende; filtret gör inget alls på dagen.
// Mörkret ligger i hela steg över kartan (steg 6.8.17): rastret används bara i kanten av ljuset och i en smal rand (RAND, en
// del av kartans bredd) som sveper över kartan från öster till väster under SVEP_MS (datorns tid) när mörkret går ett steg.
import * as PIXI from 'pixi.js';
import { FARGER, MORKARE } from '../palett';
import { W } from '../sim';
import { platt, rgb255 } from './pixel';

const RAND = 0.03, KART = W * 16, SVEP_MS = 60000; // randens bredd som del av kartan, kartans bredd i världens punkter, svepets tid

const MAX_ELDAR = 8, MAX_FOLK = 64;
// Kostnaden per punkt (granskningen, förslag 325): ljusslingorna slutar vid antalet eldar och människor, punkter där mörkret
// inte når (m <= 0) behåller sin färg direkt, Bayer-talet räknas i stället för att slås upp, och den närmaste palettfärgen
// söks bara som ett index; färgen och de mörkare stegen hämtas sedan ur uPalTex (32 × 4: FARGER och MORKARE[1..3])
const FRAG = `
precision highp float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform sampler2D uPalTex;
uniform vec4 inputSize;
uniform vec4 outputFrame;
uniform vec3 uPal[32];
uniform vec2 uPos;
uniform float uSkala;
uniform vec4 uEld[${MAX_ELDAR}];
uniform vec3 uFolk[${MAX_FOLK}];
uniform float uAntalEldar;
uniform float uAntalFolk;
uniform float uKart;
uniform float uRand;
uniform float uFran;
uniform float uTill;
uniform float uSvep;
void main() {
  vec4 c = texture2D(uSampler, vTextureCoord);
  if (c.a < 0.004) { gl_FragColor = c; return; }
  vec2 w = (vTextureCoord * inputSize.xy + outputFrame.xy - uPos) / uSkala;
  // mörkret på kartan i hela steg; öster om randen har det redan gått till det nya steget, och i randen går det jämnt
  float u = 1.0 - (w.x * 0.85 + w.y * 0.15) / uKart;
  float bas = uFran + (uTill - uFran) * clamp((uSvep * (1.0 + uRand) - u) / uRand, 0.0, 1.0);
  if (bas <= 0.0) { gl_FragColor = c; return; }
  float ljus = 0.0;
  for (int i = 0; i < ${MAX_ELDAR}; i++) {
    if (float(i) >= uAntalEldar) break;
    vec4 e = uEld[i];
    float d = length(w - e.xy) / max(e.z, 1.0);
    if (e.z > 0.0) ljus = max(ljus, e.w < 0.0 ? -e.w * (1.0 - smoothstep(0.5, 1.0, d)) : e.w * clamp(1.0 - d, 0.0, 1.0));
  }
  // ljuset kring människorna (steg 9.2.69): ett steg ljusare än mörkret i en liten cirkel, som tonar ut i kanten. Där elden
  // redan tar bort hela mörkret spelar det ingen roll (folk är högst 1)
  float folk = 0.0;
  if (3.3 * ljus < bas) for (int i = 0; i < ${MAX_FOLK}; i++) {
    if (float(i) >= uAntalFolk) break;
    vec3 f = uFolk[i];
    if (f.z > 0.0) folk = max(folk, clamp(1.6 * (1.0 - length(w - f.xy) / f.z), 0.0, 1.0));
  }
  float m = max(0.0, bas - max(3.3 * ljus, folk));
  if (m <= 0.0) { gl_FragColor = c; return; }
  vec3 col = c.rgb / c.a;
  float bd = 1e9, bi = 0.0;
  for (int i = 0; i < 32; i++) {
    vec3 d = uPal[i] - col;
    float dd = dot(d, d);
    if (dd < bd) { bd = dd; bi = float(i); if (dd < 1e-5) break; }
  }
  vec2 px = floor(w);
  vec2 q1 = mod(px, 2.0), q2 = mod(floor(px / 2.0), 2.0);
  float bay = 4.0 * (2.0 * q1.x + 3.0 * q1.y - 4.0 * q1.x * q1.y) + 2.0 * q2.x + 3.0 * q2.y - 4.0 * q2.x * q2.y;
  float lag = floor(min(m, 2.0));
  float steg = lag + ((min(m, 3.0) - lag) * 16.0 > bay + 0.5 ? 1.0 : 0.0);
  vec3 o = texture2D(uPalTex, vec2((bi + 0.5) / 32.0, (steg + 0.5) / 4.0)).rgb;
  gl_FragColor = vec4(o * c.a, c.a);
}`;



// paletten och dess tre mörkare steg som en bild på 32 × 4 punkter: rad 0 är färgen själv, rad k k steg mörkare
function palettBild() {
  const rader = [FARGER, MORKARE[1]!, MORKARE[2]!, MORKARE[3]!], d = new Uint8Array(32 * 4 * 4);
  rader.forEach((r, y) => r.forEach((f, x) => { const j = (y * 32 + x) * 4; d.set(rgb255(f), j); d[j + 3] = 255; }));
  return PIXI.Texture.fromBuffer(d, 32, 4, { scaleMode: PIXI.SCALE_MODES.NEAREST, mipmap: PIXI.MIPMAP_MODES.OFF });
}
export const nattFilter = new PIXI.Filter(undefined, FRAG, {
  uPal: platt(FARGER), uPalTex: palettBild(),
  uAntalEldar: 0, uAntalFolk: 0,
  uFran: 0, uTill: 0, uSvep: 1, uPos: new Float32Array(2), uSkala: 1, uEld: new Float32Array(MAX_ELDAR * 4), uFolk: new Float32Array(MAX_FOLK * 3), uKart: KART, uRand: RAND,
});

// mörkret m (0 dag, 1 skymning, 2 natt, 3 djup natt, och tal emellan) och eldarna (x och y i världens punkter, hur långt ljuset
// når, styrkan 0–1). En negativ styrka är elden (steg 6.8.15): fullt ljus ut till halva vägen och sedan mjukt avtagande; de andra
// avtar jämnt. Mörkret avrundas till hela steg; när steget byts sveper randen över kartan (steg 6.8.17)
const svep = { fran: -1, till: -1, t0: 0 };
// folk: människorna (x och y i världens punkter, cirkelns radie), som var och en har en liten, svag ljuscirkel (steg 9.2.69). Den
// finns bara i bilden och är ingen ljuskälla i simuleringen
export function stallNatt(lager: PIXI.Container, varld: PIXI.Container, m: number, eldar: { x: number; y: number; r: number; k: number }[], folk: { x: number; y: number; r: number }[] = []) {
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
  u.uAntalEldar = Math.min(eldar.length, MAX_ELDAR);
  const fo = u.uFolk as Float32Array; fo.fill(0);
  folk.slice(0, MAX_FOLK).forEach((f, i) => fo.set([f.x, f.y, f.r], i * 3));
  u.uAntalFolk = Math.min(folk.length, MAX_FOLK);
}
