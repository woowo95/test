import { omrade } from './omrade';
import { eldPlats, getMap, hash, perKarta, vnoise } from './karta';
import { clampI, rnd } from './slump';
import { H, HOUR, OX, OY, Person, State, W, inMap } from './typer';
import { BAR, BUSKE, FOREST, Ground, HIGH, VAG, decodeCover, isSoil } from './vag';
import { balans } from './balans';
import { vattenNu } from './sjo';
import { barKrok, nyaBuskar, tabortBuske, vaxBuske } from './buskar';
import { aldras, gammaltTrad, lasAlder, lasArt, packaAlder, packaArt, startAlder, startArt, valjArt } from './trad';

// Balanstal (regel 8): ängarna, gläntan byn börjar i, hur gräset och skogen växer tillbaka och hur mycket stegen nöter. Hur
// fort man går på marken och hur marken trampas ner står i VAG (vag.ts)
export const MARK = balans('mark', {
  angGrans: 0.56, // i kartans brus är det äng över detta (fuktig mark med högt gräs där skogen har svårt att få fäste)
  angSpridning: 0.1, // skogen sprider sig in på en äng så här många gånger så fort (tio gånger långsammare)
  gladaRadie: 3.5, // byn börjar i en glänta: så här många rutor från elden är marken fri ...
  gladaOjamn: 1.2, // ... plus upp till så mycket mer åt vissa håll (en ojämn kant)
  gladaHojd: 1.1, // ... och avstånden uppåt och nedåt räknas så här många gånger så stora (gläntan blir lite smalare)
  gladaKant: 1, // utanför kanten är det så här många rutor ung skog ...
  gladaKantTrad: 0.6, // ... med så här stora träd (0 till 1)
  nott: 0.045, // slitage när någon går över en ruta (gånger STEG.markNot och så långt man går)
  grasAter: 0.011, // så mycket gräset växer tillbaka per timme (gånger grasVaxt per tidsålder). Lite trampad mark hinner läka, så bara stigarna blir bara
  stigAter: 0.2, // på bar jord (en stig) växer gräset bara så här fort, så att stigarna ligger kvar länge när ingen går där (steg 2.10.15)
  grasVaxt: [0.1, 1.2, 1, 0.6], // grästillväxt per tidsålder
  grasBas: 0.25, // ... och växer tillbaka grasBas + grasGrann * grannrutornas täcke ...
  grasGrann: 0.75,
  grasIngen: 0.5, // ... (så här mycket täcke räknas grannarna ha om en ruta inte har någon granne med jord)
  lagerTak: 0.5, // vid elden, i lagret och i husen blir gräset aldrig högre än så här (inget växer där)
  tradVaxt: [0, 1.2, 1, 0.5], // trädens tillväxt per tidsålder
  tradDygn: 30, // en planta blir vuxen skog på ungefär så här många dygn (år i spelet), så att gläntor efter fällda träd står kvar länge
  fro: 0.0015, // chans per timme att ett frö gror: per skogsgranne ...
  froLangt: 0.00002, // ... och långt bort från skogen
  nyPlanta: 0.05, // en ny planta är så här stor (0 till 1)
  // trängseln (steg 6.5.1): träden i de åtta rutorna runt, ett vuxet träd 1 och ett gammalt träd eller jätteträd så här mycket
  // (plantor och ungträd 0). Ett frö gror bara där trängseln är högst trangsel, och en planta eller ett ungträd där det är
  // trängre växer inte utan står skuggad, så att det blir gläntor och plats mellan de stora träden
  trangsel: 3, trangGammal: 2,
  dungeAndel: 0.5, // urskogen har träd på ungefär så här stor del av jordrutorna, i dungar med gläntor emellan (steg 5.1.4.1)
  dungeSkala: 6, // dungarnas storlek i kartans brus (rutor)
  glantaSpridning: 0.15, // i urskogens gläntor slår frön rot så här många gånger så fort som i dungarna, så att gläntorna står kvar
});

// ---------- mark: gräs, stigar och skog ----------
// Förr fanns skog överallt där det är jord. Sedan steg 5.1.4.1 står urskogen i dungar med gläntor emellan, och byn börjar i en liten glänta.
const grounds = new WeakMap<State, Ground>();
// vattnet har ändrats under en torka (steg 3.8.2, torka.ts): marken följer vattnet som det är nu (sjo.ts)
export function nyttVatten(s: State) { const g = grounds.get(s); if (g) g.tiles = vattenNu(s); }
export function groundOf(s: State): Ground {
  let g = grounds.get(s);
  if (!g) {
    g = { tiles: vattenNu(s), cover: lasMark(s.mark, () => () => 1), trees: s.skog ? lasMark(s.skog, () => { const f = startForest(s.seed); return (i: number) => f[i]; }, 0) : startForest(s.seed) };
    if (!s.skog) for (let i = 0; i < g.trees.length; i++) if (g.cover[i] < HIGH) g.trees[i] = 0; // äldre sparfil: inga träd på stigarna
    g.alder = s.tradAlder ? lasAlder(s.tradAlder) : startAlder(s.seed, g.trees); // en äldre sparfil får trädens åldrar som urskogen
    g.art = s.tradSort ? lasArt(s.tradSort) : startArt(s.seed, g.trees, g.tiles); // och sorterna (steg 5.1.6)
    g.buske = s.buskar ? lasArt(s.buskar) : nyaBuskar(); // buskarna (steg 6.5.3), inga i en äldre sparfil
    grounds.set(s, g);
    if (!s.barbuskar) { barKrok.saUt(s, g); s.barbuskar = 1; } // bärbuskarna där bären växer (steg 6.5.4)
  }
  return g;
}
export const coverOf = (s: State) => groundOf(s).cover;
// sparningen av gräset och skogen (steg 9.1.4): bara rutorna som skiljer sig från startkartan, så att sparfilen växer med det
// byn gjort och inte med kartans storlek. En byte per ruta som förut (0–255); en följd av orörda rutor skrivs som 0 och hur
// många (1–255), och en ändrad ruta med värdet 0 som 0 0. Det packade börjar med ~; en äldre sparfil utan ~ har en byte per
// ruta rakt av. En orörd ruta läses som startkartans värde avrundat till en byte, precis som det gamla formatet gav
const byte = (v: number) => Math.round(v * 255);
function packaMark(v: Float32Array, start: (i: number) => number) {
  const ut: string[] = [];
  let orord = 0;
  for (let i = 0; i < v.length; i++) {
    const b = byte(v[i]);
    if (b === byte(start(i)) && orord < 255) { orord++; continue; }
    if (orord) { ut.push('\0', String.fromCharCode(orord)); orord = 0; }
    if (b === byte(start(i))) orord = 1; else ut.push(b === 0 ? '\0\0' : String.fromCharCode(b));
  }
  if (orord) ut.push('\0', String.fromCharCode(orord));
  return '~' + btoa(ut.join(''));
}
function lasMark(txt: string | undefined, startAv: () => (i: number) => number, fill = 1): Float32Array {
  if (!txt?.startsWith('~')) return decodeCover(txt, fill);
  const c = new Float32Array(W * H), start = startAv();
  for (let i = 0; i < c.length; i++) c[i] = byte(start(i)) / 255;
  try {
    const p = atob(txt.slice(1));
    for (let k = 0, i = 0; k < p.length && i < c.length; k++) {
      const b = p.charCodeAt(k);
      if (b !== 0) { c[i++] = b / 255; continue; }
      const n = p.charCodeAt(++k);
      if (n === 0) c[i++] = 0; else i += n;
    }
  } catch { /* ny mark */ }
  return c;
}
// gräset och skogen ur sparfilen på kartan som gäller nu (båda formaten), för flytten till en större karta (kartflytt.ts)
export const lasGras = (s: State) => lasMark(s.mark, () => () => 1);
export const lasSkog = (s: State) => s.skog ? lasMark(s.skog, () => { const f = startForest(s.seed); return (i: number) => f[i]; }, 0) : undefined;
export function packGround(s: State) { const g = groundOf(s), sf = startForest(s.seed); s.mark = packaMark(g.cover, () => 1); s.skog = packaMark(g.trees, i => sf[i]); s.tradAlder = packaAlder(g.alder!); s.tradSort = packaArt(g.art!); s.buskar = packaArt(g.buske!); }

// ängar: fläckar av fuktig mark där det växer högt gräs och träd har svårt att få fäste
export const angOf = perKarta(seed => {
  const a = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const gx = x - OX, gy = y - OY; // läget på den gamla kartan (typer.ts)
    const v = vnoise(seed + 41, gx / 7, gy / 7) * 0.7 + vnoise(seed + 43, gx / 3, gy / 3) * 0.3;
    a[y * W + x] = v > MARK.angGrans ? 1 : 0;
  }
  return a;
});

// urskogens dungar (steg 5.1.4.1): ett långsamt brus över kartan, och dungarna är den del av jordrutorna där bruset är
// högst (dungeAndel av all jord, ängarna medräknade: där växer inga dungar). Mellan dem är gläntor, där frön slår rot
// långsammare (glantaSpridning)
export const dungeOf = perKarta(seed => {
  const m = getMap(seed), ang = angOf(seed), d = new Uint8Array(W * H), v = new Float32Array(W * H), jord: number[] = [];
  let alla = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, gx = x - OX, gy = y - OY, k = MARK.dungeSkala;
    v[i] = vnoise(seed + 51, gx / k, gy / k) * 0.75 + vnoise(seed + 53, gx / (k / 2.5), gy / (k / 2.5)) * 0.25;
    if (isSoil(m.tiles[i])) { alla++; if (!ang[i]) jord.push(v[i]); }
  }
  jord.sort((a, b) => a - b);
  const k = Math.floor(jord.length - Math.min(jord.length, alla * MARK.dungeAndel));
  const grans = jord.length ? jord[Math.min(k, jord.length - 1)] : 1;
  for (let i = 0; i < W * H; i++) d[i] = v[i] >= grans && !ang[i] ? 1 : 0;
  return d;
});
// skog i urskogens dungar utom på ängarna och i en liten glänta runt byplatsen (lite ojämn kant)
function startForest(seed: number) {
  const m = getMap(seed), ang = angOf(seed), dunge = dungeOf(seed), trees = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!isSoil(m.tiles[i]) || ang[i] || !dunge[i]) continue;
    const d = Math.hypot(x - m.fire.x, (y - m.fire.y) * MARK.gladaHojd);
    const edge = MARK.gladaRadie + hash(seed + 31, x - OX, y - OY) * MARK.gladaOjamn;
    trees[i] = d < edge ? 0 : d < edge + MARK.gladaKant ? MARK.gladaKantTrad : 1;
  }
  return trees;
}
// marken som den var när byn grundades (bara ur kartan): för det som ska vara detsamma efter inläsning (djur.ts)
export const startGround = perKarta((seed): Ground => { const trees = startForest(seed), tiles = getMap(seed).tiles; return { tiles, cover: new Float32Array(W * H).fill(1), trees, alder: startAlder(seed, trees), art: startArt(seed, trees, tiles), buske: nyaBuskar() }; });
export const isForest = (s: State, i: number) => groundOf(s).trees[i] >= FOREST;
// vad jordrutan i är: skog, ungskog, en buske (steg 6.5.3), högt gräs, kort gräs eller bar jord (en stig)
export type Markslag = 'skog' | 'ung' | 'buske' | 'hog' | 'kort' | 'bar';
export function markslag(g: Ground, i: number): Markslag {
  const tr = g.trees[i], c = g.cover[i];
  return tr >= FOREST ? 'skog' : tr >= VAG.ungskog ? 'ung' : (g.buske?.[i] ?? 0) >= BUSKE ? 'buske' : c >= HIGH ? 'hog' : c >= BAR ? 'kort' : 'bar';
}
// andelen av jordrutorna som är skog (0 om det inte finns någon jord); villkor = räkna bara de rutor (index) där den är sann
export function skogAndel(s: State, villkor?: (i: number) => boolean) {
  const g = groundOf(s);
  let n = 0, sk = 0;
  for (let i = 0; i < g.tiles.length; i++) if (isSoil(g.tiles[i]) && (!villkor || villkor(i))) { n++; if (g.trees[i] >= FOREST) sk++; }
  return n ? sk / n : 0;
}

// rutor där inget får växa: runt elden och på lagerplatserna (husen står i g.built). Räknas om när lägret ändras
const builtCache = new WeakMap<State, { key: number; b: Uint8Array }>();
function built(s: State) {
  const key = omrade(s).key;
  let c = builtCache.get(s);
  if (c?.key === key) return c.b;
  const f = eldPlats(s), b = new Uint8Array(W * H); // 1 = vid elden och i lagret, 2 = på en lagerplats i skogen (steg 3.6.9)
  for (const z of s.lagren ?? []) for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) if (inMap(x, y)) b[y * W + x] = z.rojs ? 2 : 1; // träden fälls bara där byn valt att lägga lagret i skogen
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inMap(f.x + dx, f.y + dy)) b[(f.y + dy) * W + f.x + dx] = 1;
  builtCache.set(s, c = { key, b });
  return b;
}

const TREE_GROW = 1 / (MARK.tradDygn * 24); // plantans tillväxt per timme
// gräsets värden när timmen började, en rad i taget (steg 9.1.1): raden ovanför och raden som räknas, i stället för en kopia av
// hela kartan varje timme. Raden nedanför har inte räknats än, så där läses marken som den är
const raderna = new WeakMap<State, { ovan: Float32Array; har: Float32Array }>();
// en timme: gräset växer tillbaka från grannrutorna, skogen sprider sig som en våg och plantor växer
export function growGround(s: State, hours: number, season: number) {
  const g = groundOf(s), b = built(s), ang = angOf(s.seed), dunge = dungeOf(s.seed), { tiles, cover, trees } = g;
  const hr = Math.floor(s.now / HOUR), ts = MARK.tradVaxt[season];
  let r = raderna.get(s);
  if (!r || r.har.length !== W) raderna.set(s, r = { ovan: new Float32Array(W), har: new Float32Array(W) });
  let ovan = r.ovan, har = r.har;
  for (let y = 0; y < H; y++) {
    const t = ovan; ovan = har; har = t; // raden som räknades blir raden ovanför
    har.set(cover.subarray(y * W, y * W + W));
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!isSoil(tiles[i])) continue;
      if (b[i] || g.built?.[i]) { cover[i] = Math.min(cover[i], MARK.lagerTak); if (b[i] === 1 || trees[i] < FOREST) trees[i] = 0; tabortBuske(g, i); continue; } // inget växer vid elden, i lagret eller i husen: gräset kapas och plantor och ungskog tas bort. Ett vuxet träd står kvar på en husplats och en lagerplats i skogen tills det fälls (steg 3.6.9), men vid elden och i det första lagret tas det bort
      const old = har[x];
      if (old < 1) {
        let n = 0, c = 0;
        if (x > 0 && isSoil(tiles[i - 1])) { n += har[x - 1]; c++; }
        if (x < W - 1 && isSoil(tiles[i + 1])) { n += har[x + 1]; c++; }
        if (y > 0 && isSoil(tiles[i - W])) { n += ovan[x]; c++; }
        if (y < H - 1 && isSoil(tiles[i + W])) { n += cover[i + W]; c++; }
        const nb = c ? n / c : MARK.grasIngen;
        cover[i] = Math.min(1, old + hours * MARK.grasAter * MARK.grasVaxt[season] * (MARK.grasBas + MARK.grasGrann * nb) * (old < BAR ? MARK.stigAter : 1));
      }
      vaxBuske(s, g, i, hours, ts, trangsel); // buskarna (steg 6.5.3, buskar.ts)
      if (trees[i] >= 1) aldras(g, i, hours); // ett vuxet träd åldras året runt, och torrakan faller till sist (trad.ts)
      if (!ts || old < HIGH) continue; // stigar och kort gräs stoppar ny skog
      if (trees[i] >= 1) continue;
      let h = 0;
      if (trees[i] <= 0) { h = hash(s.seed + hr, x, y); if (h >= hours * (MARK.fro * 8 + MARK.froLangt) * ts * (ang[i] ? MARK.angSpridning : 1) * (dunge[i] ? 1 : MARK.glantaSpridning)) continue; } // tärningen först: säger den nej även med skog runt om behöver grannarna inte räknas (steg 9.1.1)
      if (skuggad(g, i)) continue; // för trångt: plantan står skuggad, och inget frö gror (steg 6.5.1)
      if (trees[i] > 0) { trees[i] = Math.min(1, trees[i] + hours * TREE_GROW * ts); if (trees[i] >= 1) g.alder![i] = 0; continue; }
      let n = 0;
      // utanför kartkanten står skog (steg 6.5.8): därifrån sprids frön in, också om all skog på kartan huggits ner
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && (!inMap(x + dx, y + dy) || trees[(y + dy) * W + x + dx] >= FOREST)) n++;
      if (h < hours * (MARK.fro * n + MARK.froLangt) * ts * (ang[i] ? MARK.angSpridning : 1) * (dunge[i] ? 1 : MARK.glantaSpridning)) { trees[i] = MARK.nyPlanta; g.art![i] = valjArt(s.seed, g, i, false); } // sorten (steg 5.1.6)
    }
  }
  r.ovan = ovan; r.har = har;
}

// trängseln på ruta i (steg 6.5.1): träden i de åtta rutorna runt den, ett vuxet träd 1 och ett gammalt 2, plantor och ungträd 0
export function trangsel(g: Ground, i: number) {
  const x = i % W, y = (i - x) / W; let tr = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const xx = x + dx, yy = y + dy;
    if ((!dx && !dy) || !inMap(xx, yy)) continue;
    const j = yy * W + xx;
    if (g.trees[j] >= 1) tr += gammaltTrad(g, j) ? MARK.trangGammal : 1;
  }
  return tr;
}
// för trångt på ruta i: ett frö gror inte, och en planta står skuggad och växer inte
export const skuggad = (g: Ground, i: number) => trangsel(g, i) > MARK.trangsel;

export const tileOf = (x: number, y: number) => clampI(y, H) * W + clampI(x, W); // rutans index, närmaste ruta på kartan om punkten ligger utanför
// en slumpad punkt nära mitten av rutan med index i (p:s följd 'val')
export const punktIRuta = (s: State, i: number, p: Person) => ({ x: i % W + 0.3 + rnd(s, 'val', p) * 0.4, y: Math.floor(i / W) + 0.3 + rnd(s, 'val', p) * 0.4 });
