import { eldPlats, getMap } from './karta';
import { RECEPT } from './recept';
import { groundOf, nyttVatten, tileOf } from './mark';
import { H, State, T, W, inMap } from './typer';
import { balans } from './balans';
import { iVattnetNu } from './sjo';

// Balanstal (regel 8): hur väl ett rum skyddar mot kylan
export const BYGGNAD = balans('byggnad', {
  oppningLacker: 0.12, // så mycket sämre ett rum håller värmen för varje öppning
  kroppsvarme: 0.04, // varje människa i rummet värmer så här mycket (hur många som är där räknas, shelterOf)
  skyddMax: 0.9, // mer än så här skyddar inget rum mot kylan
  skinndorrTat: 0.6, // en skinndörr släpper ut så här mycket mindre värme än en öppen dörröppning (steg 2.2.16) ...
  tradorrTat: 0.85, // en trädörr släpper ut så här mycket mindre värme än en öppen dörröppning (steg 3.7.21) ...
});

// ---------- byggen ----------
// Varje ruta kan ha en vägg, ett golv eller en öppning. Väggar stänger vägen; en öppning är en lucka i väggen som man går
// igenom. Golv som är helt omgivet av väggar och öppningar är ett rum under tak (inget tak ritas).
// Vilka väggar och golv man kan bygga är teknik. Vilket hus man bygger bestämmer byn själv efter behov: när någon kan
// bygga väggar planerar den skickligaste byggaren ett hus för det mest akuta behovet (byggnader.ts).
type BitK = 'vagg' | 'golv' | 'oppning';
// en byggd eller planerad ruta. b = hur långt bygget kommit (1 = klart), mat = material som lagts på bygget,
// c = skick (1 = nytt), lp/lm = lagning: hur långt den kommit och material som lagts på den, dorr = dörren som hänger i en
// öppning (en rad i DORRAR), lera = när ett jordgolv som legat under vatten har torkat och blir jordgolv igen (steg 3.8.7, flod.ts)
export interface Bit { id: number; x: number; y: number; k: BitK; m: string; b: number; mat: number; c: number; hus?: number; lp?: number; lm?: number; dorr?: string; lera?: number; forb?: 1 } // forb = en förbättring (steg 7.2.10): byggs på nivån Förbättra, inte Tak;
// byggare = de som byggt en bit medan huset byggs första gången (steg 4.5.4.9), kom = var materialet kom ifrån (bygg.ts), fn = husets funktion (en rad i BYGGNADER, byggnader.ts; saknas = sovsal), ag = ägaren (ett familjehus), slag = vad ett förrådshus rymmer
// det som nyss hänt med huset (steg 9.2.94): utbyggt, bytt funktion eller bytt ägare, som husets panel visar en stund
export const NYSS_HUS = 12 * 3600 * 1000; // 12 timmar (ett halvt år i spelet, en halv dag i verkligheten)
export function husNytt(s: State, h: Hus, k: 'ut' | 'fn' | 'ag', text: string) { h.nytt = { k, t: s.now, text }; }
export interface Hus { id: number; namn: string; x: number; y: number; w: number; h: number; barUt?: number; klar?: number; varKlar?: number; kom?: Record<string, number>; fn?: string; ag?: number; slag?: 'mat' | 'material'; tom?: number; byggare?: number[]; rumFn?: Record<string, string>; skjul?: 1; nytt?: { k: 'ut' | 'fn' | 'ag'; t: number; text: string }; ut?: { x: number; y: number; w: number; h: number; oppnas: [number, number, string][] } } // ut = utbyggnaden som pågår (steg 7.2.5): husets nya mått och väggen som öppnas sist; // rumFn = funktionen per rum när den skiljer sig från husets (steg 7.2.1, rumFnId i byggnader.ts), med rummets minsta ruta som nyckel; tom = sedan när ingen sover i sovsalen; varKlar = när huset först blev färdigt, sparat när en vägg rasar (klar nollas då)
// per material: vad som går åt per ruta, timmar för en ovan byggare (riktlinjen, steg 2.12.8: 20 minuter per vägg, 5 per ruta
// jordgolv och 10 trägolv; slaget är k, se TIDSLAG i tider.ts), slitage per timme, hur bra väggen håller värmen.
// storm = hur illa tornadon river väggen (tornado.ts; 1 om inget sägs).
// farg och ikon är bara bilden: färgen på kartan och symbolen i rutan under musen (simuleringen läser dem aldrig)
export interface Material { namn: string; k: BitK; item?: string; n: number; tim: number; slit: number; isol?: number; storm?: number; brinner?: number; tek?: string; farg: number; ikon?: string; vag?: true; brygga?: true } // vag = väg eller brygga: ingen del av något hus, och när den förstörs blir rutan som förut // brinner = hur lätt väggen eller golvet tar eld (eldsvådorna, brand.ts); ett golv som brunnit blir jordgolv
export const MATERIAL: Record<string, Material> = {
  timmer: { namn: 'Timmervägg', k: 'vagg', item: 'ved', n: 10, tim: 20 / 60, slit: 0.0005, isol: 0.7, storm: 0.6, brinner: 1, tek: 'timmervagg', farg: 0x8a5e34, ikon: 'timmervagg' },
  stolpe: { namn: 'Stolpe', k: 'vagg', item: 'ved', n: 4, tim: 20 / 60, slit: 0.0005, isol: 0, storm: 0.6, brinner: 1, tek: 'timmervagg', farg: 0x8a5e34, ikon: 'timmervagg' }, // bär skjulens tak (steg 7.3.1): tar en ruta och stänger vägen som en vägg. Platshållare: samma bild som väggen
  stockvag: { namn: 'Stockväg', k: 'golv', item: 'virke', n: 1, tim: 10 / 60, slit: 1 / (50 * 24), brinner: 1, tek: 'stockvag', vag: true, farg: 0x8a6a3a, ikon: 'stockvag' }, // en väg (steg 7.3.7): utslitet efter ungefär 50 dygn (50 år i spelet)
  brygga: { namn: 'Brygga', k: 'golv', item: 'virke', n: 1, tim: 10 / 60, slit: 1 / (50 * 24), brinner: 1, tek: 'brygga', vag: true, brygga: true, farg: 0x8a6a3a, ikon: 'brygga' }, // över vatten (steg 7.3.9): man kan gå och stå på den
  ris: { namn: 'Risvägg', k: 'vagg', item: 'grenar', n: 5, tim: 20 / 60, slit: 0.002, isol: 0.55, storm: 1.5, brinner: 1.5, farg: 0x6b4a2a, ikon: 'risvagg' }, // äldre sparfiler: risväggar byggs inte längre men kan lagas
  jord: { namn: 'Jordgolv', k: 'golv', n: 0, tim: 5 / 60, slit: 0, farg: 0x7a5a3a },
  tra: { namn: 'Trägolv', k: 'golv', item: 'ved', n: 2, tim: 10 / 60, slit: 0.0002, brinner: 1, tek: 'timmervagg', farg: 0xa07446, ikon: 'tragolv' },
  ho: { namn: 'Golv av hö', k: 'golv', item: 'torrgras', n: 1, tim: 5 / 60, slit: 0.002, brinner: 2, farg: 0xd2b866, ikon: 'hogolv' }, // äldre sparfiler: hö-golv läggs inte längre, slits till jordgolv
  lera: { namn: 'Lera', k: 'golv', n: 0, tim: 5 / 60, slit: 0, farg: 0x5c4630 }, // ett jordgolv som legat under vatten (steg 3.8.7, flod.ts): ingen sover där, och det blir jordgolv igen när det torkat
  oppning: { namn: 'Öppning', k: 'oppning', n: 0, tim: 0, slit: 0, farg: 0x7a5a3a },
};

// ---------- dörrarna (steg 2.2.16) ----------
// Dörrarna kommer i nivåer: först en öppning, sedan en hängd hud, sist en riktig dörr (7.2.1). Varje sort är en rad: tekniken
// (tek, samma id i TEKNIK, teknik.ts), materialet (av), minuterna (min) och hur mycket mindre värme den släpper ut än en
// öppning (tat). Den hängs i handlingen dorr (task.tool = sorten, bygg.ts) i ett färdigt hus där man bor eller umgås. En ny
// sorts dörr blir en rad här, en rad i TEKNIK, ett namn i verktyg för handlingen dorr (handlingar.ts) och två bilder i ikoner.ts.
// Raderna står i ordning från den sämsta till den bästa: en bättre dörr ersätter en sämre, aldrig tvärtom (utanDorr i bygg.ts).
// stanger = dörren stängs när någon gömmer sig i huset, och djur kommer aldrig igenom den (steg 3.7.21, varg.ts); en skinndörr
// håller bara värmen inne och stoppar ingen
export interface DorrDef { namn: string; ikon: string; tek: string[]; av: Record<string, number>; min: number; tat: number; gor: string; forsta: string; stanger?: true }
export const DORRAR = {
  skinndorr: {
    namn: 'Skinndörr', ikon: 'skinndorr', tek: ['skinndorr'], av: RECEPT.skinndorr.av, min: RECEPT.skinndorr.min, tat: BYGGNAD.skinndorrTat,
    gor: 'Hänger en hud i dörröppningen.',
    forsta: '{namn} hängde byns första skinndörr i en dörröppning. Huset håller värmen bättre.',
  },
  tradorr: {
    namn: 'Trädörr', ikon: 'tradorr', tek: ['tradorr'], av: RECEPT.tradorr.av, min: RECEPT.tradorr.min, tat: BYGGNAD.tradorrTat, stanger: true,
    gor: 'Hänger en dörr av trä i dörröppningen.',
    forsta: '{namn} hängde byns första trädörr. Den håller värmen inne och kan stängas mot vargarna.',
  },
} satisfies Record<string, DorrDef>;
export type DorrSlag = keyof typeof DORRAR;
export const DORR_LIST = Object.keys(DORRAR) as DorrSlag[];
export const dorrDef = (k?: string): DorrDef | undefined => k ? (DORRAR as Record<string, DorrDef>)[k] : undefined;
// dörrens plats i ordningen (−1 = ingen dörr)
export const dorrRang = (k?: string) => k ? DORR_LIST.indexOf(k as DorrSlag) : -1;

export const bitsOf = (s: State) => (s.byggen ??= []);
export const housesOf = (s: State) => (s.hus ??= []);
export const husById = (s: State, id?: number) => housesOf(s).find(h => h.id === id);
export const bitById = (s: State, id?: number) => bitsOf(s).find(b => b.id === id);
// en väg eller brygga försvinner: en brand, en tornado eller slitaget (steg 7.3.7)
export function vagBort(s: State, b: Bit) {
  const brygga = MATERIAL[b.m].brygga;
  s.byggen = bitsOf(s).filter(q => q !== b);
  if (brygga) { s.bryggV = (s.bryggV ?? 0) + 1; nyttVatten(s); } // vägsökningen ser att bryggan är borta (annars går man på en brygga som inte finns och hamnar i vattnet)
  touch(s);
  // den som stod på bryggan när den försvann hamnar på närmaste lediga ruta, inte i vattnet
  if (brygga) for (const p of s.people) if (p.died === undefined && p.left === undefined && Math.floor(p.x) === b.x && Math.floor(p.y) === b.y) { const f = freeNear(s, b.x, b.y); p.x = f.x + 0.5; p.y = f.y + 0.5; }
}
export const touch = (s: State) => { s.byggV = (s.byggV ?? 0) + 1; };

// ---------- rutnätet: vad som står var, och vilka rum det blir ----------
export interface Rum { id: number; tiles: number[]; walls: number[]; open: number; hus?: number }
interface Grid { v: number; at: Map<number, Bit>; solid: Uint8Array; tak: Int32Array; rooms: Rum[]; skjul: Uint8Array; brygga: Uint8Array }
const grids = new WeakMap<State, Grid>();
export function gridOf(s: State): Grid {
  const v = s.byggV ?? 0;
  let g = grids.get(s);
  if (g && g.v === v) return g;
  const at = new Map<number, Bit>(), solid = new Uint8Array(W * H), wall = new Uint8Array(W * H), built = new Uint8Array(W * H);
  for (const b of bitsOf(s)) {
    const i = b.y * W + b.x; at.set(i, b); built[i] = 1;
    if (b.k === 'oppning' || (b.k === 'vagg' && b.b >= 1)) wall[i] = 1;
    if (b.k === 'vagg' && b.b >= 1) solid[i] = 1;
  }
  // allt som nås från kartans kant utan att gå genom en vägg eller öppning är utomhus
  const out = new Uint8Array(W * H), q: number[] = [];
  for (let x = 0; x < W; x++) for (const y of [0, H - 1]) q.push(y * W + x);
  for (let y = 0; y < H; y++) for (const x of [0, W - 1]) q.push(y * W + x);
  while (q.length) {
    const i = q.pop()!;
    if (out[i] || wall[i]) continue;
    out[i] = 1;
    const x = i % W, y = (i - x) / W;
    if (x > 0) q.push(i - 1); if (x < W - 1) q.push(i + 1); if (y > 0) q.push(i - W); if (y < H - 1) q.push(i + W);
  }
  // det inneslutna delas upp i rum; golvrutorna i ett rum är under tak
  const tak = new Int32Array(W * H).fill(-1), seen = new Uint8Array(W * H), rooms: Rum[] = [];
  for (let i0 = 0; i0 < W * H; i0++) {
    if (out[i0] || wall[i0] || seen[i0]) continue;
    const tiles: number[] = [], walls = new Set<number>(), st = [i0];
    let open = 0; seen[i0] = 1;
    while (st.length) {
      const i = st.pop()!; tiles.push(i);
      const x = i % W, y = (i - x) / W;
      for (const n of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (n < 0) continue;
        if (wall[n]) { if (!walls.has(n)) { walls.add(n); if (at.get(n)!.k === 'oppning') open++; } continue; }
        if (!seen[n]) { seen[n] = 1; st.push(n); }
      }
    }
    const r: Rum = { id: rooms.length, tiles: tiles.filter(i => at.get(i)?.k === 'golv' && at.get(i)!.b >= 1), walls: [...walls], open, hus: at.get(tiles[0])?.hus };
    for (const i of r.tiles) tak[i] = r.id;
    rooms.push(r);
  }
  // skjulen (Skjul i designdokumentet): ett tak utan väggar när alla stolpar är klara. Taket skyddar mot väta men räknas inte som ett rum mot kylan
  const skjul = new Uint8Array(W * H);
  for (const h of housesOf(s)) if (h.skjul && h.klar) for (let y = h.y; y < h.y + h.h; y++) for (let x = h.x; x < h.x + h.w; x++) if (inMap(x, y)) skjul[y * W + x] = 1;
  const brygga = new Uint8Array(W * H);
  for (const b of bitsOf(s)) if (b.b >= 1 && MATERIAL[b.m].brygga) brygga[b.y * W + b.x] = 1;
  g = { v, at, solid, tak, rooms, skjul, brygga };
  grids.set(s, g);
  const gr = groundOf(s); gr.solid = solid; gr.built = built;
  return g;
}
export const bitAt = (s: State, x: number, y: number) => gridOf(s).at.get(Math.floor(y) * W + Math.floor(x));
export const isWall = (s: State, x: number, y: number) => inMap(x, y) && gridOf(s).solid[tileOf(x, y)] === 1;
// man kan inte stå här: vatten eller en vägg
export const blocked = (s: State, x: number, y: number) => { const i = Math.floor(y) * W + Math.floor(x); return getMap(s.seed).tiles[i] === T.Vatten && !gridOf(s).brygga[i] || !!s.flod && iVattnetNu(s, i) || isWall(s, x, y); }; // och översvämningens vatten (flod.ts)
// lägrets mitt under en översvämning (steg 3.8.7): elden, eller närmaste torra ruta när vattnet står över elden. Därifrån räknas
// vad man kan gå till; från en ruta under vattnet nås nästan ingenting, och då hamnade allt i lagret på samma ruta (by 42)
export function lagretsMitt(s: State) { const f = eldPlats(s); return s.flod ? freeNear(s, f.x, f.y) : f; }
// närmaste plats som inte är vatten eller vägg
// inte = rutan själv räknas inte (där en vägg ska byggas)
export function freeNear(s: State, x: number, y: number, inte = false) {
  if (!inte && !blocked(s, x, y)) return { x, y };
  for (let r = 1; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const nx = x + dx, ny = y + dy;
    if (inMap(nx, ny) && !blocked(s, nx, ny)) return { x: nx, y: ny };
  }
  return { x, y };
}
export function roomAt(s: State, x: number, y: number): Rum | undefined {
  if (!inMap(x, y)) return;
  const g = gridOf(s), r = g.tak[tileOf(x, y)];
  return r >= 0 ? g.rooms[r] : undefined;
}
export const roofed = (s: State, x: number, y: number) => !!roomAt(s, x, y) || underSkjul(s, x, y);
export const underSkjul = (s: State, x: number, y: number) => inMap(x, y) && gridOf(s).skjul[tileOf(x, y)] === 1;
// hur väl rummet håller värmen: väggarnas material och skick, sämre för varje öppning (mindre när en dörr hänger där)
export function insulation(s: State, r: Rum) {
  const g = gridOf(s);
  let sum = 0, n = 0, open = 0;
  for (const i of r.walls) {
    const b = g.at.get(i)!;
    if (b.k === 'oppning') { open += 1 - (dorrDef(b.dorr)?.tat ?? 0); continue; }
    if (b.k !== 'vagg') continue;
    sum += (MATERIAL[b.m].isol ?? 0) * (0.5 + 0.5 * b.c); n++;
  }
  return Math.max(0, (n ? sum / n : 0) - BYGGNAD.oppningLacker * open);
}
// den som är inne i ett rum kyls långsammare, och ju fler som är där, desto varmare håller de varandra
export const shelterOf = (s: State, r: Rum, folk: number) => Math.min(BYGGNAD.skyddMax, insulation(s, r) + BYGGNAD.kroppsvarme * folk);
