// Skymningen och natten (steg 5.1.1.4, "Bildstil" under Gränssnitt i designdokumentet): i stället för en mörk, halvgenomskinlig
// ruta över kartan byts varje färg på marken, i naturen, i husen och på folket mot samma färg ett steg mörkare i paletten i
// skymningen och två steg mörkare på natten (MORKARE i palett.ts). Mellan stegen väljer ett rastermönster (Bayer 4 × 4, en ruta
// per punkt i bilderna) vilket steg punkten får, så att övergången blir jämn utan nya färger. Elden lyser: nära en brinnande
// eld (eller glöd) är mörkret mindre, och det minskar i steg utåt. Bara utseende; filtret gör inget alls på dagen.
import * as PIXI from 'pixi.js';
import { FARGER, MORKARE } from '../palett';

const MAX_ELDAR = 8;
const FRAG = `
precision highp float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform vec4 inputSize;
uniform vec4 outputFrame;
uniform vec3 uPal[32];
uniform vec3 uM1[32];
uniform vec3 uM2[32];
uniform float uBayer[16];
uniform float uMork;
uniform vec2 uPos;
uniform float uSkala;
uniform vec4 uEld[${MAX_ELDAR}];
void main() {
  vec4 c = texture2D(uSampler, vTextureCoord);
  if (c.a < 0.004) { gl_FragColor = c; return; }
  vec3 col = c.rgb / c.a;
  vec2 w = (vTextureCoord * inputSize.xy + outputFrame.xy - uPos) / uSkala;
  float ljus = 0.0;
  for (int i = 0; i < ${MAX_ELDAR}; i++) {
    vec4 e = uEld[i];
    if (e.z > 0.0) ljus = max(ljus, e.w * clamp(1.0 - length(w - e.xy) / e.z, 0.0, 1.0));
  }
  float m = max(0.0, uMork - 2.2 * ljus);
  float bd = 1e9;
  vec3 b0 = col, b1 = col, b2 = col;
  for (int i = 0; i < 32; i++) {
    vec3 d = uPal[i] - col;
    float dd = dot(d, d);
    if (dd < bd) { bd = dd; b0 = uPal[i]; b1 = uM1[i]; b2 = uM2[i]; }
  }
  vec2 px = floor(w);
  float k = mod(px.x, 4.0) + 4.0 * mod(px.y, 4.0), bay = 0.0;
  for (int j = 0; j < 16; j++) if (float(j) == k) bay = uBayer[j];
  float lag = floor(min(m, 1.0));
  float steg = lag + ((min(m, 2.0) - lag) * 16.0 > bay + 0.5 ? 1.0 : 0.0);
  vec3 o = steg < 0.5 ? b0 : (steg < 1.5 ? b1 : b2);
  gl_FragColor = vec4(o * c.a, c.a);
}`;

const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const platt = (fs: readonly string[]) => new Float32Array(fs.flatMap(rgb));

export const nattFilter = new PIXI.Filter(undefined, FRAG, {
  uPal: platt(FARGER), uM1: platt(MORKARE[1]), uM2: platt(MORKARE[2]),
  uBayer: new Float32Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]),
  uMork: 0, uPos: new Float32Array(2), uSkala: 1, uEld: new Float32Array(MAX_ELDAR * 4),
});

// mörkret m (0 dag, 1 skymning, 2 natt) och eldarna (x och y i världens punkter, hur långt ljuset når, styrkan 0–1)
export function stallNatt(lager: PIXI.Container, varld: PIXI.Container, m: number, eldar: { x: number; y: number; r: number; k: number }[]) {
  if (m <= 0) { if (lager.filters) lager.filters = null; return; }
  if (!lager.filters) lager.filters = [nattFilter];
  const u = nattFilter.uniforms;
  u.uMork = m; u.uPos[0] = varld.position.x; u.uPos[1] = varld.position.y; u.uSkala = varld.scale.x;
  const e = u.uEld as Float32Array; e.fill(0);
  eldar.slice(0, MAX_ELDAR).forEach((f, i) => e.set([f.x, f.y, f.r, f.k], i * 4));
}
