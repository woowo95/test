// ---------- världskartans bild (steg 11.2.16, Flera samhällen: Vad spelaren ser och vad byn vet; Världen och det visuella: Två kartlägen) ----------
// Världskartan ritas som en enkel bild: varje världsruta är 16 × 16 punkter i marksortens färg (VARLDMARK), floderna som
// streck längs vattnets väg (smala i det övre loppet, breda i det nedre), marksortens tecken (träd, granar, tuvor, berg) på en
// del av rutorna och platsernas tecken (LANDMARKEN) på sina rutor; huvudbyn får en ljus ram. Allt tar sina färger ur paletten.
// Här finns bara det som går att räkna utan webbläsaren: bilden som punkter, tecknen (platshållare i 16 punkter tills Björn
// valt i bildstilen) och vyns matematik för att dra och zooma. Knappen och rutan som visar kartan är ui/varldskarta.ts.
import { BynsKarta, FLOD_NEDRE, LANDMARKEN, MARK_IDS, O_KANT, syns, VARLDMARK, Varlden, VarldMark, VarldPlats } from '../sim';
import { hash3 } from '../sim/slump';
import { farg } from '../palett';

export const VK = 16; // punkter per världsruta

// tecknens färger, en bokstav per ton ur paletten (punkt = genomskinligt)
export const TECKENPAL: Record<string, string> = {
  k: farg('kol', 0), K: farg('kol', 3),
  j: farg('jord', 1), J: farg('jord', 2), l: farg('jord', 3),
  y: farg('senap', 3), Y: farg('senap', 1),
  r: farg('rost', 2), R: farg('rost', 1),
  g: farg('oliv', 1), G: farg('oliv', 3),
  b: farg('barr', 1), B: farg('barr', 3),
  d: farg('skiffer', 1), s: farg('skiffer', 2), S: farg('skiffer', 3),
  w: farg('ben', 3), W: farg('ben', 1),
};
// raderna fylls ut till 16 × 16 (det som saknas är genomskinligt)
const t = (...r: string[]) => Array.from({ length: VK }, (_, i) => (r[i] ?? '').padEnd(VK, '.').slice(0, VK));

// tecknen på världskartan (platshållare): marksorternas (VARLDMARK.tecken) och platsernas (LANDMARKEN.tecken), och knappen
export const TECKEN: Record<string, string[]> = {
  trad: t('', '', '', '......GGG', '....GGGGGgg', '...GGGGGgggg', '...GGGGgggggg', '....GGgggggg', '.....gggggg', '.......jj', '.......jj', '......kjjk'),
  gran: t('', '.......B', '......Bbb', '.....Bbbbb', '......bbb', '.....Bbbbbb', '....Bbbbbbbb', '......bbbb', '....Bbbbbbbbb', '...Bbbbbbbbbbb', '.......jj', '.......jj'),
  tuva: t('', '', '', '', '', '....y', '...yYy....y', '...YYY...yYy', '..........Y', '', '.......y', '......yYy', '......YYY'),
  berg: t('', '', '.......kk', '......kwwk', '.....kwwSdk', '....kSSSSddk', '...kSSSSdddk', '...kSSSdddddk', '..kSSSSddddddk', '..kSSSddddddddk', '.kkkkkkkkkkkkkk'),
  hus: t('', '', '', '.......k', '......kJk', '.....kJJJk', '....kJJJJJk', '...kJJJJJJJk', '..kkkkkkkkkkk', '...kwwwwwwwk', '...kwwjjwwwk', '...kwwjjwwwk', '...kkkkkkkkk'),
  talt: t('', '', '', '.......k', '......kwk', '.....kwrwk', '....kwwrWWk', '...kwwwrWWWk', '..kwwwwrWWWWk', '..kwwwkkkWWWk', '..kkkkkkkkkkk'),
  eldstad: t('', '', '', '', '.......y', '......yry', '......rYr', '.....yrRry', '....d.rRr.d', '...dSd.R.dSd', '....dSddSd'),
  torn: t('', '', '.....k.k.k', '.....kJJJk', '.....kJJJk', '.....kkkkk', '......kJk', '......kJk', '......kJk', '.....kJJJk', '....kJJJJJk', '....kkkkkkk'),
  ruin: t('', '', '', '', '...kk......kk', '...kSk....kSk', '...kSk.kk.kdk', '...kSkkSkkkdk', '...kSSSddddk', '...kkkkkkkkk'),
  sten: t('', '', '......y', '......kk', '.....kSSk', '.....kSdk', '.....kSdk', '.....kSdk', '.....kSdk', '....kkkkkk'),
  hog: t('', '', '', '', '', '.......kk', '.....kkGGkk', '....kGGGgggk', '...kGGGggggk', '..kGGgggggggk', '..kkkkkkkkkkk'),
  runsten: t('', '', '.....kkk', '....kSSSk', '....kSrSk', '....krSrk', '....kSrSk', '....kSrdk', '....kSSdk', '...kkkkkkk'),
  kors: t('', '', '', '', '....r....r', '.....r..r', '......rr', '......rr', '.....r..r', '....r....r'),
  vagn: t('', '', '', '', '', '...kkkkkkkk', '...kJJJJJJk', '...kkkkkkkk', '...kd...kd', '..kdSk.kdSk', '...kd...kd'),
  packning: t('', '', '', '', '......kk', '.....kJJk', '....kJJJJk', '....kJlJJk', '....kJJJJk', '.....kkkk'),
  bro: t('', '', '', '', '', '..kkkkkkkkkkkk', '..kJJJJJJJJJJk', '..kJkkkkkkkkJk', '..kJk......kJk', '..kk........kk'),
  spang: t('', '', '', '', '', '', '...kkkkkkkkkk', '...kJlJlJlJlk', '...kkkkkkkkkk'),
  stubbe: t('', '', '', '', '', '', '.....kkkk', '....klJlJk', '....kJJJJk', '....kjJJjk', '...kjkkkkjk'),
  eld: t('', '', '', '', '', '.......y', '......yry', '......rYr', '.....yrRry', '.....jkkkj'),
  karta: t('', '', '..kkkkkkkkkkkk', '..kwwwWwwwwwWk', '..kwGGwwssswWk', '..kwGGGwssswWk', '..kwwGwwwsswWk', '..kwwwwJJwwwWk', '..kwwSwJJwwwWk', '..kwSSSwwwGGWk', '..kwwwwwwwGGWk', '..kkkkkkkkkkkk'),
};

// RGBA ur en färg i paletten
const rgb = (hex: string) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const RGB: Record<string, number[]> = Object.fromEntries(Object.entries(TECKENPAL).map(([k, h]) => [k, rgb(h)]));
const MARKRGB = MARK_IDS.map(k => { const [r, n] = VARLDMARK[k].farg; return rgb(farg(r, n)); });
export const FLODFARG = farg('skiffer', 2);
export const RAMFARG = farg('ben', 3);
// lagren (steg 11.4.7): det byn inte känner täcks av ett mönster ur paletten, så att färgerna stannar i paletten: ryktena tätt
// i grått och resten glest i ljust (en punkt i varannan rad och kolumn)
export const RYKTFARG = farg('skiffer', 3);
export const BLEKFARG = farg('ben', 2);
export const TECKENANDEL = 0.45; // så stor del av rutorna med ett marktecken visar det (en hash per ruta, samma varje gång)

export interface VarldBild { w: number; h: number; data: Uint8ClampedArray }
function punkt(b: VarldBild, x: number, y: number, c: number[]) {
  if (x < 0 || y < 0 || x >= b.w || y >= b.h) return;
  const i = (y * b.w + x) * 4;
  b.data[i] = c[0]; b.data[i + 1] = c[1]; b.data[i + 2] = c[2]; b.data[i + 3] = 255;
}
export function ritaTecken(b: VarldBild, namn: string, rx: number, ry: number) {
  const r = TECKEN[namn];
  if (!r) return;
  for (let y = 0; y < VK; y++) for (let x = 0; x < VK; x++) { const c = r[y][x]; if (c !== '.') punkt(b, rx * VK + x, ry * VK + y, RGB[c]); }
}
// ett streck med en fyrkantig pensel från mitten av en ruta till mitten av en annan
function streck(b: VarldBild, x0: number, y0: number, x1: number, y1: number, bredd: number, c: number[]) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)), h = Math.floor(bredd / 2);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + (x1 - x0) * i / (n || 1)), y = Math.round(y0 + (y1 - y0) * i / (n || 1));
    for (let dy = -h; dy < bredd - h; dy++) for (let dx = -h; dx < bredd - h; dx++) punkt(b, x + dx, y + dy, c);
  }
}
export const huvudbynsPlats = (vl: Varlden) => vl.huvud === undefined ? undefined : vl.platser?.find(p => p.by === vl.huvud);
export const visarMarktecken = (v: VarldMark, x: number, y: number) => hash3(v.fro, x, y, 0x7ec4e7) < TECKENANDEL;

// hela världskartan som punkter: marken, floderna, marktecknen, platserna och huvudbynsramen
// vilket lager en världsruta hör till: känd (närområdet eller en känd plats), inom ett rykte eller blek
export function lager(kn: BynsKarta, kand: Set<number>, w: number, x: number, y: number): 'kant' | 'rykte' | 'blek' {
  if (kn.nara(x, y) || kand.has(y * w + x)) return 'kant';
  return kn.rykten.some(o => Math.hypot(x + 0.5 - o.x, y + 0.5 - o.y) < o.r) ? 'rykte' : 'blek';
}
export function ritaVarld(vl: Varlden, v: VarldMark, kn?: BynsKarta): VarldBild {
  const b: VarldBild = { w: v.w * VK, h: v.h * VK, data: new Uint8ClampedArray(v.w * VK * v.h * VK * 4) };
  for (let ry = 0; ry < v.h; ry++) for (let rx = 0; rx < v.w; rx++) {
    const c = MARKRGB[v.mark[ry * v.w + rx]];
    for (let y = 0; y < VK; y++) for (let x = 0; x < VK; x++) punkt(b, rx * VK + x, ry * VK + y, c);
  }
  const fc = rgb(FLODFARG), m = VK / 2;
  for (let i = 0; i < v.w * v.h; i++) {
    if (!v.flod[i] || v.ned[i] < 0) continue;
    const x0 = (i % v.w) * VK + m, y0 = Math.floor(i / v.w) * VK + m, j = v.ned[i];
    streck(b, x0, y0, (j % v.w) * VK + m, Math.floor(j / v.w) * VK + m, v.flod[i] === FLOD_NEDRE ? 5 : 3, fc);
  }
  const upptagen = new Set((vl.platser ?? []).map(p => p.y * v.w + p.x));
  for (let ry = 0; ry < v.h; ry++) for (let rx = 0; rx < v.w; rx++) {
    const tk = (VARLDMARK[MARK_IDS[v.mark[ry * v.w + rx]]] as { tecken?: string }).tecken;
    if (tk && !upptagen.has(ry * v.w + rx) && !v.flod[ry * v.w + rx] && visarMarktecken(v, rx, ry)) ritaTecken(b, tk, rx, ry);
  }
  for (const p of vl.platser ?? []) if (syns(kn, p)) ritaTecken(b, LANDMARKEN[p.k].tecken, p.x, p.y);
  if (kn) {
    const kand = new Set((vl.platser ?? []).filter(p => (kn.niva(p.nr) ?? -1) >= O_KANT).map(p => p.y * v.w + p.x)), rc = rgb(RYKTFARG), bc = rgb(BLEKFARG);
    for (let ry = 0; ry < v.h; ry++) for (let rx = 0; rx < v.w; rx++) {
      const l = lager(kn, kand, v.w, rx, ry);
      if (l === 'kant') continue;
      for (let y = 0; y < VK; y++) for (let x = 0; x < VK; x++)
        if (l === 'rykte' ? (x + y) % 2 === 0 : x % 2 === 0 && y % 2 === 0) punkt(b, rx * VK + x, ry * VK + y, l === 'rykte' ? rc : bc);
    }
  }
  const hb = huvudbynsPlats(vl);
  if (hb) {
    const rc = rgb(RAMFARG);
    for (let i = 0; i < VK; i++) for (const [x, y] of [[i, 0], [i, VK - 1], [0, i], [VK - 1, i]]) punkt(b, hb.x * VK + x, hb.y * VK + y, rc);
  }
  return b;
}

// texten för en ruta (när musen är över eller man trycker): marken och platserna där
export function rutaText(vl: Varlden, v: VarldMark, x: number, y: number, kn?: BynsKarta): string {
  if (x < 0 || y < 0 || x >= v.w || y >= v.h) return '';
  const i = y * v.w + x, mk = VARLDMARK[MARK_IDS[v.mark[i]]].namn;
  const pl = (vl.platser ?? []).filter((p: VarldPlats) => p.x === x && p.y === y && syns(kn, p)), hb = huvudbynsPlats(vl);
  const delar = pl.map(p => `${p === hb ? 'Er by' : LANDMARKEN[p.k].namn} ${p.namn}`);
  if (v.flod[i]) delar.push(v.flod[i] === FLOD_NEDRE ? 'en bred flod' : 'en å');
  return [mk, ...delar].join(' · ');
}

// ---------- vyn: dra och zooma ----------
// x och y är den punkt i bilden som står i rutans övre vänstra hörn, z hur många skärmpunkter en bildpunkt är
export interface Vy { x: number; y: number; z: number }
export const ZOOM_MAX = 4;
export const zoomMin = (bw: number, bh: number, sw: number, sh: number) => Math.min(sw / bw, sh / bh);
// hela kartan i rutan, mitt i
export function helaKartan(bw: number, bh: number, sw: number, sh: number): Vy {
  const z = zoomMin(bw, bh, sw, sh);
  return begransa({ x: 0, y: 0, z }, bw, bh, sw, sh);
}
// kartan står kvar i rutan: är den mindre än rutan ligger den mitt i, annars går den inte att dra bort
export function begransa(vy: Vy, bw: number, bh: number, sw: number, sh: number): Vy {
  const z = Math.min(ZOOM_MAX, Math.max(zoomMin(bw, bh, sw, sh), vy.z));
  const ax = (bw * z <= sw) ? -(sw / z - bw) / 2 : Math.min(bw - sw / z, Math.max(0, vy.x));
  const ay = (bh * z <= sh) ? -(sh / z - bh) / 2 : Math.min(bh - sh / z, Math.max(0, vy.y));
  return { x: ax, y: ay, z };
}
// dra: skärmpunkterna blir bildpunkter
export const dra = (vy: Vy, dx: number, dy: number): Vy => ({ x: vy.x - dx / vy.z, y: vy.y - dy / vy.z, z: vy.z });
// zooma kring en punkt på skärmen: punkten i bilden under den står kvar
export function zooma(vy: Vy, f: number, sx: number, sy: number): Vy {
  const z = vy.z * f, bx = vy.x + sx / vy.z, by = vy.y + sy / vy.z;
  return { x: bx - sx / z, y: by - sy / z, z };
}
// vilken världsruta en punkt på skärmen är
export const rutaVid = (vy: Vy, sx: number, sy: number) => ({ x: Math.floor((vy.x + sx / vy.z) / VK), y: Math.floor((vy.y + sy / vy.z) / VK) });
