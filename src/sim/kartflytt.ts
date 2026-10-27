import { UTTAG_IDS } from './fynd';
import { startGround } from './mark';
import { AREA } from './minne';
import { sjoarna } from './sjo';
import { H, NEW_H, NEW_W, State, W, useMap } from './typer';
import { decodeCover, encodeCover } from './vag';

// ---------- den stora kartan i en äldre by (steg 2.10.9) ----------
// En äldre by (64×40 eller 80×50) får den stora kartan NEW_W×NEW_H när den laddas. Den gamla kartan läggs i mitten och
// allt i byn flyttas lika mycket: människorna och det de är på väg till, stackarna, redskapen, lagerplatserna, husen,
// stationerna, fälten, stubbarna, stockarna, fläckarna och blodet, markens stigar och skog, det som tagits ur platserna,
// sjöarnas fiske och lärdomarna om platserna. Hörnet hamnar på ett helt antal lärdomsområden (AREA rutor, minne.ts), så att
// varje lärdom gäller samma rutor som förut. Kartan räknas från den gamla kartans hörn (karta.ts), så det gamla ser ut som
// förut, och utanför den fortsätter samma brus med orörd mark: gräs och skog som när byn grundades.
// Det görs först av allt när byn laddas (varld.ts), innan något har räknats på den gamla kartan
export const behoverStorreKarta = (s: State) => (s.W ?? 64) !== NEW_W || (s.H ?? 40) !== NEW_H;

export function storreKarta(s: State) {
  useMap(s);
  const w0 = W, h0 = H, n0 = w0 * h0, aw0 = Math.ceil(w0 / AREA);
  const ox = Math.max(0, Math.round((NEW_W - w0) / 2 / AREA) * AREA), oy = Math.max(0, Math.round((NEW_H - h0) / 2 / AREA) * AREA);
  // det som är packat per ruta och sjöarnas nummer, läst på den gamla kartan
  const cover0 = decodeCover(s.mark), trees0 = s.skog ? decodeCover(s.skog, 0) : undefined, sjo0 = sjoarna(s.seed).id;
  let fynd0 = '';
  if (s.fynd) try { fynd0 = atob(s.fynd); } catch { /* ny mark */ }

  s.W = NEW_W; s.H = NEW_H;
  s.kart = { x: (s.kart?.x ?? 0) + ox, y: (s.kart?.y ?? 0) + oy, w: s.kart?.w ?? w0, h: s.kart?.h ?? h0 };
  useMap(s);
  const N = W * H, ny = (i: number) => (i % w0 + ox) + (Math.floor(i / w0) + oy) * W; // en ruta på den gamla kartan
  const flytta = (o: { x: number; y: number } | undefined) => { if (o) { o.x += ox; o.y += oy; } };

  // marken: stigarna och skogen i det gamla, orörd mark runt omkring (en äldre sparfil utan skog får skogen när den läses, mark.ts)
  const g = startGround(s.seed), cover = new Float32Array(N).fill(1), trees = g.trees.slice();
  for (let i = 0; i < n0; i++) { cover[ny(i)] = cover0[i]; if (trees0) trees[ny(i)] = trees0[i]; }
  s.mark = encodeCover(cover);
  if (trees0) s.skog = encodeCover(trees);
  // det som tagits ur varje plats (fynd.ts): en följd av rutor per slag
  if (fynd0) {
    const ut = new Uint8Array(UTTAG_IDS.length * N);
    UTTAG_IDS.forEach((_, j) => { for (let i = 0; i < n0 && j * n0 + i < fynd0.length; i++) ut[j * N + ny(i)] = fynd0.charCodeAt(j * n0 + i); });
    let bin = '';
    for (let i = 0; i < ut.length; i += 8192) bin += String.fromCharCode(...ut.subarray(i, i + 8192));
    s.fynd = btoa(bin);
  }
  // sjöarna får nya nummer på den stora kartan (sjo.ts): varje sjö följer en av sina rutor. Växer två sjöar ihop vid den
  // gamla kantens vatten behålls den största sjöns fiske
  if (s.sjoar) {
    const id = sjoarna(s.seed).id, forr = s.sjoar;
    s.sjoar = {};
    for (const [k, st] of Object.entries(forr)) {
      const i = sjo0.indexOf(Number(k)), n = i >= 0 ? id[ny(i)] : -1;
      if (n >= 0 && !s.sjoar[n]) s.sjoar[n] = st;
    }
  }

  for (const p of s.people) {
    flytta(p);
    const t = p.task;
    if (t) {
      t.tx += ox; t.ty += oy; flytta(t.res); flytta(t.site);
      if (t.path) t.path = t.path.map(ny);
      delete t.pk; // vägen räknas om
      if (t.vatten !== undefined) t.vatten = ny(t.vatten);
    }
    for (const l of p.lardomar ?? []) l.a = (Math.floor(l.a / aw0) + oy / AREA) * Math.ceil(W / AREA) + l.a % aw0 + ox / AREA;
  }
  for (const lista of [s.stackar, s.marken, s.stubbar, s.stockar, s.lagren, s.byggen, s.hus, s.stationer, s.falt, s.blod]) for (const o of lista ?? []) flytta(o);
  for (const t of s.ting ?? []) if (t.x !== undefined && t.y !== undefined) { t.x += ox; t.y += oy; }
  flytta(s.lager); flytta(s.brasa);
  for (const f of s.flackar ?? []) f.i = ny(f.i);
  if (s.halvfallt) s.halvfallt = Object.fromEntries(Object.entries(s.halvfallt).map(([i, v]) => [ny(Number(i)), v]));
  s.byggV = (s.byggV ?? 0) + 1; // husen och stationerna räknas om
}
