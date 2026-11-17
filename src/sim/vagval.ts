// ---------- vägvalet (steg 11.2.20, Flera samhällen: Lederna i tal) ----------
// En resa väljer den billigaste vägen på världens rutnät för sitt färdsätt (till fots, med packdjur eller med vagn). Att gå in
// på en ruta kostar det rutKostnad säger (marken, platserna där och floden, landmarken.ts); snett kostar det √2 gånger så mycket,
// och man går inte snett förbi ett hörn man inte kommer fram genom. Vägen räknas med A* och sparas som en del av världen
// (vl.vagar), så att samma resa inte räknas om; att räkna om den när en ruta byter klass eller en bro byggs kommer med lederna.
import { Fardsatt, VarldMark } from './varldmark';
import { Varlden } from './varlden';
import { rutKostnad } from './landmarken';

export interface VarldVag { fran: number; till: number; fs: Fardsatt; rutor: number[]; kostnad: number; t: number }

// kostnaden för varje ruta med ett färdsätt, räknad en gång per värld, färdsätt och platsernas antal
const cache = new WeakMap<Varlden, Map<string, Float32Array>>();
export function kostnader(vl: Varlden, v: VarldMark, fs: Fardsatt): Float32Array {
  const nyckel = `${fs}:${vl.nastaPlats ?? 0}:${vl.platser?.length ?? 0}`;
  let m = cache.get(vl);
  if (!m) cache.set(vl, m = new Map());
  let k = m.get(nyckel);
  if (!k) {
    for (const n of m.keys()) if (n.startsWith(fs + ':')) m.delete(n);
    k = new Float32Array(v.w * v.h);
    for (let i = 0; i < k.length; i++) k[i] = rutKostnad(vl, v, i, fs);
    m.set(nyckel, k);
  }
  return k;
}

const S2 = Math.SQRT2;
const GRANNAR = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, S2], [1, -1, S2], [-1, 1, S2], [-1, -1, S2]] as const;

// den billigaste vägen från ruta a till ruta b (index i rutnätet), eller undefined om färdsättet inte kommer fram
export function billigasteVag(vl: Varlden, v: VarldMark, a: number, b: number, fs: Fardsatt): { rutor: number[]; kostnad: number } | undefined {
  const k = kostnader(vl, v, fs), w = v.w, h = v.h;
  if (a === b) return { rutor: [a], kostnad: 0 };
  if (!isFinite(k[b])) return undefined;
  const g = new Float64Array(w * h).fill(Infinity), fran = new Int32Array(w * h).fill(-1), klar = new Uint8Array(w * h);
  const bx = b % w, by = Math.floor(b / w);
  const est = (i: number) => { const dx = Math.abs(i % w - bx), dy = Math.abs(Math.floor(i / w) - by); return Math.max(dx, dy) + (S2 - 1) * Math.min(dx, dy); }; // ingen ruta kostar under 1
  // en binär hög med (f, ruta)
  const hf: number[] = [], hi: number[] = [];
  const upp = (f: number, i: number) => {
    let n = hf.length; hf.push(f); hi.push(i);
    while (n > 0) { const p = (n - 1) >> 1; if (hf[p] <= f) break; hf[n] = hf[p]; hi[n] = hi[p]; n = p; }
    hf[n] = f; hi[n] = i;
  };
  const ta = () => {
    const i = hi[0], lf = hf.pop()!, li = hi.pop()!;
    if (hf.length) {
      let n = 0;
      for (;;) { let c = 2 * n + 1; if (c >= hf.length) break; if (c + 1 < hf.length && hf[c + 1] < hf[c]) c++; if (hf[c] >= lf) break; hf[n] = hf[c]; hi[n] = hi[c]; n = c; }
      hf[n] = lf; hi[n] = li;
    }
    return i;
  };
  g[a] = 0; upp(est(a), a);
  while (hf.length) {
    const i = ta();
    if (klar[i]) continue;
    klar[i] = 1;
    if (i === b) break;
    const x = i % w, y = Math.floor(i / w);
    for (const [dx, dy, f] of GRANNAR) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (klar[j] || !isFinite(k[j])) continue;
      if (dx && dy && (!isFinite(k[y * w + nx]) || !isFinite(k[ny * w + x]))) continue; // inte snett förbi ett hörn
      const ng = g[i] + k[j] * f;
      if (ng < g[j]) { g[j] = ng; fran[j] = i; upp(ng + est(j), j); }
    }
  }
  if (!isFinite(g[b])) return undefined;
  const rutor: number[] = [];
  for (let i = b; i !== -1; i = fran[i]) rutor.push(i);
  return { rutor: rutor.reverse(), kostnad: g[b] };
}

// vägen mellan två rutor med ett färdsätt: den sparade, annars räknas den och sparas i världen
export function vagMellan(vl: Varlden, v: VarldMark, a: number, b: number, fs: Fardsatt, nu: number): VarldVag | undefined {
  const sparad = vl.vagar?.find(x => x.fs === fs && x.fran === a && x.till === b);
  if (sparad) return sparad;
  const r = billigasteVag(vl, v, a, b, fs);
  if (!r) return undefined;
  const vag: VarldVag = { fran: a, till: b, fs, rutor: r.rutor, kostnad: Math.round(r.kostnad * 1000) / 1000, t: nu };
  (vl.vagar ??= []).push(vag);
  return vag;
}
