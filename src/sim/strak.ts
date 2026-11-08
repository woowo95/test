// Gångstråken (steg 6.2.5, "Byns område (Gångstråken)" i designdokumentet): ett lager i byns område. Från rutan utanför
// varje dörr går den kortaste vägen (en ruta bred) till elden, lagerplatserna, latrinen och vattnet. På ett stråk ställs
// ingenting: inga hus, väggar, stationer, möbler, fält, lagerplatser eller stackar (ledig i stationer.ts, lagerplatserna i
// lager.ts och husen i bygg.ts frågar paStrak). Vägarna går runt det som redan står, så att inget som står blir fel.
// Stråken viker för husen: ett planerat stråk hindrar inte ett hus om vägen kan dras om runt huset med högst
// STRAK.omvag rutors omväg (strakHindrar). Rutan framför en dörr står fast, liksom ett stråk som inte går att dra om.
// Stråken räknas om när något byggs, flyttas eller rivs (samma nyckel som området, och fälten), och sparas per by.
import { balans } from './balans';
import { MATERIAL, bitsOf, gridOf } from './byggnad';
import { eldPlats, getMap } from './karta';
import { zonesOf } from './lager';
import { faltAt } from './odling';
import { omrade } from './omrade';
import { stationAt, stationerOf, storlekAv } from './stationer';
import { H, State, T, W, inMap } from './typer';

export const STRAK = balans('strak', {
  pa: 1, // 1 = stråken hålls fria; 0 = de räknas och ritas men hindrar inget (provet i steg 6.2.6: byarna med och utan)
  omvag: 3, // ett stråk dras om runt ett nytt hus om omvägen blir högst så här många rutor; annars får huset inte stå där
  sok: 30, // så många rutor runt byns område som vägarna söks i (vattnet längre bort får inget stråk)
});

// målen: varje dörr får en väg till det närmaste av varje slag
const MAL = ['eld', 'lager', 'latrin', 'vatten', 'torg'] as const; // torget när det finns (steg 7.3.13)
type Mal = typeof MAL[number];

interface Vag { dorr: number; mal: Mal; len: number; rutor: number[] }
export interface Straken {
  key: string;
  ruta: Uint8Array; // 0 = inget stråk, 1 = stråk, 2 = rutan framför en dörr (index y * W + x)
  vagar: Vag[];
  x0: number; y0: number; x1: number; y1: number; // sökrutan
}

const cache = new WeakMap<State, Straken>();
const nyckel = (s: State) => `${omrade(s).key}:${s.byggV ?? 0}:${s.falt?.length ?? 0}:${s.nextFalt ?? 0}`;

// rutorna utanför husens dörrar: grannrutan till en öppning som inte är en del av något bygge
function dorrar(s: State) {
  const g = gridOf(s), ut: number[] = [];
  for (const b of bitsOf(s)) {
    if (b.k !== 'oppning' || b.hus === undefined) continue;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const x = b.x + dx, y = b.y + dy;
      if (inMap(x, y) && !g.at.has(y * W + x) && getMap(s.seed).tiles[y * W + x] !== T.Vatten) { ut.push(y * W + x); break; }
    }
  }
  return [...new Set(ut)];
}

// vilket mål är rutan i (-1 = inget), och kan man gå där? Målen nås men man går inte vidare genom dem
interface Sok { mal: Int8Array; gang: Uint8Array; x0: number; y0: number; x1: number; y1: number }
function sokData(s: State): Sok {
  const o = omrade(s), R = STRAK.sok, m = getMap(s.seed), g = gridOf(s), f = eldPlats(s);
  const x0 = Math.max(0, o.x0 - R), y0 = Math.max(0, o.y0 - R), x1 = Math.min(W - 1, o.x1 + R), y1 = Math.min(H - 1, o.y1 + R);
  const mal = new Int8Array(W * H).fill(-1), gang = new Uint8Array(W * H);
  const zs = zonesOf(s), latriner = stationerOf(s).filter(t => t.k === 'latrin');
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * W + x, t = m.tiles[i];
    if (t === T.Vatten || t === T.Sten || g.at.has(i) && !MATERIAL[g.at.get(i)!.m].vag) continue; // på en väg går stråket som förut
    if (zs.some(z => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h)) { mal[i] = MAL.indexOf('lager'); continue; }
    if (stationAt(s, x, y) || faltAt(s, x, y) || x === f.x && y === f.y) continue;
    if (s.torg && x >= s.torg.x && y >= s.torg.y && x < s.torg.x + s.torg.w && y < s.torg.y + s.torg.h) { mal[i] = MAL.indexOf('torg'); continue; }
    gang[i] = 1;
    if (Math.max(Math.abs(x - f.x), Math.abs(y - f.y)) === 1) mal[i] = MAL.indexOf('eld');
    else if (latriner.some(l => { const { w, h } = storlekAv(l); return x >= l.x - 1 && x <= l.x + w && y >= l.y - 1 && y <= l.y + h; })) mal[i] = MAL.indexOf('latrin');
    else if ([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => inMap(x + dx, y + dy) && m.tiles[(y + dy) * W + x + dx] === T.Vatten)) mal[i] = MAL.indexOf('vatten');
  }
  return { mal, gang, x0, y0, x1, y1 };
}

// sökningens arbetsminne (steg 9.1.8), som i vägsökningen: en ruta har ett värde i fran bara om sett har sökningens nummer,
// så att inget fält stort som kartan skapas och fylls för varje dörr. Nytt minne när kartans storlek ändras
let sokNr = 0, franW = 0, franH = 0, franF = new Int32Array(0), sett = new Uint32Array(0);
// den kortaste vägen från dörren till det närmaste av varje mål, med rektangeln hinder (ett nytt hus) i vägen
function vagarFran(d: Sok, dorr: number, hinder?: { x: number; y: number; w: number; h: number }) {
  const ute = (i: number) => { if (!hinder) return false; const x = i % W, y = (i / W) | 0; return x >= hinder.x && x < hinder.x + hinder.w && y >= hinder.y && y < hinder.y + hinder.h; };
  if (franW !== W || franH !== H) { franF = new Int32Array(W * H); sett = new Uint32Array(W * H); franW = W; franH = H; sokNr = 0; }
  if (++sokNr === 0xffffffff) { sett.fill(0); sokNr = 1; }
  const nr = sokNr, fran = franF, ko = [dorr], hittad = new Map<Mal, number>();
  fran[dorr] = -1; sett[dorr] = nr;
  for (let k = 0; k < ko.length && hittad.size < MAL.length; k++) {
    const i = ko[k], mi = d.mal[i];
    if (mi >= 0 && !hittad.has(MAL[mi])) hittad.set(MAL[mi], i);
    if (i !== dorr && MAL[mi] === 'lager') continue; // genom lagret går inget stråk
    const x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < d.x0 || ny < d.y0 || nx > d.x1 || ny > d.y1) continue;
      const j = ny * W + nx;
      if (sett[j] === nr || !d.gang[j] && d.mal[j] < 0 || ute(j)) continue;
      fran[j] = i; sett[j] = nr; ko.push(j);
    }
  }
  const ut = new Map<Mal, number[]>();
  for (const [m, slut] of hittad) {
    const rutor: number[] = [];
    for (let i = slut; i >= 0; i = fran[i]) if (d.mal[i] !== MAL.indexOf('lager') || i === dorr) rutor.push(i);
    ut.set(m, rutor.reverse());
  }
  return ut;
}

export function straken(s: State): Straken {
  const key = nyckel(s), c = cache.get(s);
  if (c && c.key === key) return c;
  const d = sokData(s), ruta = new Uint8Array(W * H), vagar: Vag[] = [];
  for (const dorr of dorrar(s)) {
    for (const [mal, rutor] of vagarFran(d, dorr)) { vagar.push({ dorr, mal, len: rutor.length, rutor }); for (const i of rutor) ruta[i] ||= 1; }
  }
  for (const v of vagar) ruta[v.dorr] = 2;
  const r: Straken = { key, ruta, vagar, x0: d.x0, y0: d.y0, x1: d.x1, y1: d.y1 };
  cache.set(s, r);
  return r;
}

// ligger rutan på ett stråk? Då ställs inget där
export const paStrak = (s: State, x: number, y: number) => STRAK.pa > 0 && inMap(x, y) && straken(s).ruta[y * W + x] > 0;
// ligger någon ruta i rektangeln på ett stråk?
export function strakI(s: State, x: number, y: number, w: number, h: number) {
  if (!STRAK.pa) return false;
  const r = straken(s).ruta;
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (inMap(i, j) && r[j * W + i]) return true;
  return false;
}
// hindrar ett nytt hus på rektangeln (väggarna med) ett stråk? Inte om varje väg det står på kan dras om runt det med högst
// STRAK.omvag rutors omväg till samma slags mål; aldrig på rutan framför en dörr
export function strakHindrar(s: State, x: number, y: number, w: number, h: number) {
  if (!strakI(s, x, y, w, h)) return false;
  return !omvag(s, x, y, w, h);
}
// kan stråken som rektangeln står på dras om runt den (med högst STRAK.omvag rutors omväg, aldrig rutan framför en dörr)?
export function omvag(s: State, x: number, y: number, w: number, h: number) {
  const st = straken(s), inne = (i: number) => { const ix = i % W, iy = (i / W) | 0; return ix >= x && ix < x + w && iy >= y && iy < y + h; };
  const traffade = st.vagar.filter(v => v.rutor.some(inne));
  if (traffade.some(v => inne(v.dorr))) return false;
  const d = sokData(s), nya = new Map<number, Map<Mal, number[]>>();
  for (const v of traffade) {
    let n = nya.get(v.dorr);
    if (!n) nya.set(v.dorr, n = vagarFran(d, v.dorr, { x, y, w, h }));
    const ny = n.get(v.mal);
    if (!ny || ny.length > v.len + STRAK.omvag) return false;
  }
  return true;
}
