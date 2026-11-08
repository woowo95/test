import { UTTAG_IDS, fyndBin } from './fynd';
import { lasGras, lasSkog, startGround } from './mark';
import { lasKarta, packaKarta } from './kartminne';
import { lasAlder, lasArt, packaAlder, packaArt, startAlder, startArt } from './trad';
import { AREA } from './minne';
import { sjoarna } from './sjo';
import { H, State, W, useMap } from './typer';
import { balans } from './balans';

// kartans storlek för en ny by (steg 9.1.9). En äldre by med en mindre karta får den här storleken när den laddas, med den
// gamla kartan i mitten. Läses bara inne i funktioner (regel 8)
export const KARTA = balans('karta', {
  bredd: 240, // så många rutor bred ...
  hojd: 240, // ... och så många rutor hög
});
import { encodeCover } from './vag';

// ---------- den stora kartan i en äldre by (steg 2.10.9) ----------
// En äldre by (64×40 eller 80×50, eller en mindre karta än KARTA) får den stora kartan KARTA.bredd × KARTA.hojd när den laddas. Den gamla kartan läggs i mitten och
// allt i byn flyttas lika mycket: människorna och det de är på väg till, stackarna, redskapen, lagerplatserna, husen,
// stationerna, fälten, stubbarna, stockarna, fläckarna och blodet, markens stigar och skog, det som tagits ur platserna,
// sjöarnas fiske och lärdomarna om platserna. Hörnet hamnar på ett helt antal lärdomsområden (AREA rutor, minne.ts), så att
// varje lärdom gäller samma rutor som förut. Kartan räknas från den gamla kartans hörn (karta.ts), så det gamla ser ut som
// förut, och utanför den fortsätter samma brus med orörd mark: gräs och skog som när byn grundades.
// Det görs först av allt när byn laddas (varld.ts), innan något har räknats på den gamla kartan
export const behoverStorreKarta = (s: State) => (s.W ?? 64) < KARTA.bredd || (s.H ?? 40) < KARTA.hojd;

// det som har en plats i byn: x och y, och målen (tx, ty), dit en flock går (mx, my) och varifrån något flyger (fx, fy).
// Allt i byn flyttas utom kartans hörn, historiken (bilderna av kartan visas där den gamla kartan låg, ui/kartminne.ts),
// striderna (i arenans egna rutor) och sammanfattningen för spelaren
const PAR = [['x', 'y'], ['tx', 'ty'], ['mx', 'my'], ['fx', 'fy']] as const;
const ROR_INTE = new Set(['kart', 'hist', 'strider', 'borta']);
function flyttaAllt(o: unknown, ox: number, oy: number, sett: Set<object>) {
  if (!o || typeof o !== 'object' || sett.has(o)) return;
  sett.add(o);
  if (Array.isArray(o)) { for (const v of o) flyttaAllt(v, ox, oy, sett); return; }
  const r = o as Record<string, unknown>;
  for (const [a, b] of PAR) if (typeof r[a] === 'number' && typeof r[b] === 'number') { r[a] = (r[a] as number) + ox; r[b] = (r[b] as number) + oy; }
  for (const k of Object.keys(r)) if (!ROR_INTE.has(k)) flyttaAllt(r[k], ox, oy, sett);
}

export function storreKarta(s: State) {
  useMap(s);
  const w0 = W, h0 = H, n0 = w0 * h0, aw0 = Math.ceil(w0 / AREA);
  const ox = Math.max(0, Math.round((KARTA.bredd - w0) / 2 / AREA) * AREA), oy = Math.max(0, Math.round((KARTA.hojd - h0) / 2 / AREA) * AREA);
  // det som är packat per ruta och sjöarnas nummer, läst på den gamla kartan
  const cover0 = lasGras(s), trees0 = lasSkog(s), sjo0 = sjoarna(s.seed).id;
  const alder0 = s.tradAlder ? lasAlder(s.tradAlder) : undefined, art0 = s.tradSort ? lasArt(s.tradSort) : undefined, busk0 = s.buskar ? lasArt(s.buskar) : undefined;
  const fynd0 = fyndBin(s);

  s.W = KARTA.bredd; s.H = KARTA.hojd;
  s.kart = { x: (s.kart?.x ?? 0) + ox, y: (s.kart?.y ?? 0) + oy, w: s.kart?.w ?? w0, h: s.kart?.h ?? h0 };
  useMap(s);
  const N = W * H, ny = (i: number) => (i % w0 + ox) + (Math.floor(i / w0) + oy) * W; // en ruta på den gamla kartan
  const omArea = (a: number) => (Math.floor(a / aw0) + oy / AREA) * Math.ceil(W / AREA) + a % aw0 + ox / AREA; // ett lärdomsområde

  // marken: stigarna, skogen, trädens ålder och sort och buskarna i det gamla, orörd mark runt omkring (en äldre sparfil
  // utan skog får skogen när den läses, mark.ts)
  const g = startGround(s.seed), cover = new Float32Array(N).fill(1), trees = g.trees.slice();
  const art = startArt(s.seed, trees, g.tiles), alder = startAlder(s.seed, trees, art), busk = new Uint8Array(N);
  for (let i = 0; i < n0; i++) {
    const j = ny(i);
    cover[j] = cover0[i];
    if (trees0) trees[j] = trees0[i];
    if (alder0) alder[j] = alder0[i];
    if (art0) art[j] = art0[i];
    if (busk0) busk[j] = busk0[i];
  }
  s.mark = encodeCover(cover);
  if (trees0) s.skog = encodeCover(trees);
  if (alder0) s.tradAlder = packaAlder(alder);
  if (art0) s.tradSort = packaArt(art);
  if (busk0) s.buskar = packaArt(busk);
  // det som tagits ur varje plats (fynd.ts): en följd av rutor per slag
  if (fynd0) {
    const ut = new Uint8Array(UTTAG_IDS.length * N);
    UTTAG_IDS.forEach((_, j) => { for (let i = 0; i < n0 && j * n0 + i < fynd0.length; i++) ut[j * N + ny(i)] = fynd0.charCodeAt(j * n0 + i); });
    let bin = '';
    for (let i = 0; i < ut.length; i += 8192) bin += String.fromCharCode(...ut.subarray(i, i + 8192));
    s.fynd = btoa(bin); // rakt av; den packas när byn sparas (packFynd)
  }
  // sjöarna får nya nummer på den stora kartan (sjo.ts): varje sjö följer en av sina rutor. Växer två sjöar ihop vid den
  // gamla kantens vatten behålls den största sjöns fiske. Sjöarna som torkat ut följer med på samma sätt (torka.ts)
  const id = sjoarna(s.seed).id, nySjo = (k: number) => { const i = sjo0.indexOf(k); return i >= 0 ? id[ny(i)] : -1; };
  if (s.sjoar) {
    const forr = s.sjoar;
    s.sjoar = {};
    for (const [k, st] of Object.entries(forr)) { const n = nySjo(Number(k)); if (n >= 0 && !s.sjoar[n]) s.sjoar[n] = st; }
  }
  if (s.sjoTorr) s.sjoTorr.tomma = s.sjoTorr.tomma.map(nySjo).filter(n => n >= 0);

  // allt med en plats (flyttaAllt), och det som sparas som rutans nummer eller ett lärdomsområde
  flyttaAllt(s, ox, oy, new Set());
  for (const p of s.people) {
    const t = p.task;
    if (t) {
      if (t.path) t.path = t.path.map(ny);
      if (t.sett) t.sett = t.sett.map(ny);
      delete t.pk; // vägen räknas om
      if (t.vatten !== undefined) t.vatten = ny(t.vatten);
    }
    for (const l of p.lardomar ?? []) l.a = omArea(l.a);
  }
  for (const tb of s.tabun ?? []) tb.a = omArea(tb.a);
  for (const f of s.flackar ?? []) f.i = ny(f.i);
  if (s.halvfallt) s.halvfallt = Object.fromEntries(Object.entries(s.halvfallt).map(([i, v]) => [ny(Number(i)), v]));
  if (s.morkPlats) s.morkPlats = Object.fromEntries(Object.entries(s.morkPlats).map(([i, v]) => [ny(Number(i)), v]));
  if (s.aska) s.aska = s.aska.map(([i, t]) => [ny(i), t]);
  if (s.tornadoStig) s.tornadoStig = s.tornadoStig.map(ny);
  // det som bara gäller en stund räknas om på den nya kartan: en brand eller tornado mitt i (de slutar), djurens flykt och
  // var kaningrupperna och björnen går i dag
  // bilderna av kartan i historiken (kartminne.ts): den gamla bilden där den gamla kartan nu ligger, resten svart (okänt)
  if (s.hist?.kartor) s.hist.kartor = s.hist.kartor.map(([t, p]) => {
    const r0 = lasKarta(p);
    if (r0.length !== n0) return [t, p];
    const r: string[] = new Array(N).fill('?');
    for (let i = 0; i < n0; i++) r[ny(i)] = r0[i];
    return [t, packaKarta(r)];
  });
  s.brand = undefined; s.tornado = undefined; s.kaninStart = undefined; s.bjornVag = undefined; s.djurFlykt = undefined; s.djurSkramd = undefined;
  s.byggV = (s.byggV ?? 0) + 1; // husen och stationerna räknas om
}
