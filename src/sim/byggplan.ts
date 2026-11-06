import { omrade, tillHoljet } from './omrade';
import { ALDER, ageOf, byId, count, familjOf, living, log, stat } from './folk';
import { Hus, MATERIAL, bitsOf, gridOf, housesOf, touch } from './byggnad';
import { eldPlats, getMap } from './karta';
import { groundOf } from './mark';
import { PLATS, rektAvstand } from './plats';
import { lekplats, paLek, stangerIn, uteStation } from './stationer';
import { knows } from './teknik';
import { nearZone, usable, zonesOf } from './lager';
import { tingOf } from './agande';
import { FOREST, findPath } from './vag';
import { Akut, BYGGNADER, Byggnad, FN, Fn, HUS, antalLika, fnId } from './byggnader';
import { PROJEKT_TAL } from './projekt';
import { ARBETE, formogenheter, grundvarde } from './varde';
import { BYGG } from './bygg';
import { H, HOUR, Person, State, T, W, inMap } from './typer';
import { underMinnet } from './sjo';
import { balans } from './balans';
import { ELDFLYTT, nyEldplats } from './eldflytt';
import { canLight } from './eld';
import { strakHindrar, strakI } from './strak';

// ---------- balanstal (regel 8) ----------
// Byggplanen (Byggsystemet: det som ska byggas). Husreglerna står i HUS (byggnader.ts) och BYGG (bygg.ts)
export const PLAN = balans('byggplan', {
  behovTim: 2, // ett behov måste finnas så här många timmar innan det byggs för (en fara väntar inte)
  varTim: 3, // planen görs var tredje timme i spelet
  perBehov: 6, // högst så många förslag per åtgärd och behov
  stegPaslag: 0.15, // varje steg längre ner i ordningen (använda huset bättre, bygga ut, köpa, flytta) kostar så här mycket mer
  sedStorlek: 0.25, // seden Förutseende bygger så här mycket större, Dagens behov så här mycket mindre
  rikExtra: 2, // den rika bygger så här många rutor större ...
  rikGang: 1.5, // ... och är rik när familjen äger så här många gånger den övre kvartilen i byn
});

// ---------- planering: byn bestämmer vad som byggs ----------
// utomElden = huset får stå där elden står: elden flyttas då först (steg 2.10.4, eldflytt.ts)
const tileOk = (s: State, x: number, y: number, utomElden: boolean) => {
  if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return false;
  if (!usable(s, x, y, utomElden)) return false; // inte vatten, sten, inpå elden (utom när elden kan flyttas) eller på ett annat bygge (träden spelar ingen roll: de fälls innan bygget börjar)
  if (zonesOf(s).some(z => nearZone(z, x, y, BYGG.lagerMarg))) return false;
  if (underMinnet(s, y * W + x)) return false; // byn minns att vattnet nådde hit (steg 3.8.7, flod.ts)
  if ((s.stackar ?? []).some(a => a.x === x && a.y === y) || tingOf(s).some(k => k.x === x && k.y === y && k.hos === undefined && k.lass === undefined) || (s.stockar ?? []).some(k => Math.floor(k.x) === x && Math.floor(k.y) === y) || (s.stubbar ?? []).some(k => k.x === x && k.y === y)) return false;
  return true;
};
// en plats för ett hus med yttermåtten w×h inom byområdet, PLATS.husMellan rutor från andra hus och PLATS.uteFri från stationer
// som står ute, helst en bit från elden och inte på lekplatsen, och inte så att väggarna stänger in mark. Träden där
// huset ska stå fälls först, men en plats med färre träd går fortare
function siteFor(s: State, w: number, h: number, okAt: (i: number) => boolean) {
  const f = eldPlats(s), R = BYGG.radieBas + living(s).length * BYGG.radiePerPerson, g = groundOf(s), lekR = lekplats(s), M = Math.max(PLATS.husMellan, PLATS.uteFri);
  const platser: { x: number; y: number; sc: number }[] = [], o = omrade(s), r = Math.ceil(R) + w + h;
  for (let y = Math.max(1, o.y0 - r); y + h < H && y <= o.y1 + r; y++) for (let x = Math.max(1, o.x0 - r); x + w < W && x <= o.x1 + r; x++) {
    const cx = x + w / 2, cy = y + h / 2;
    const ut = tillHoljet(s, cx, cy); // byns område (steg 6.2.4): inget räknas från elden eller byns mitt
    if (ut > R) continue;
    let ok = true;
    for (let yy = y - M; yy < y + h + M && ok; yy++) for (let xx = x - M; xx < x + w + M && ok; xx++) {
      const inside = xx >= x && xx < x + w && yy >= y && yy < y + h;
      if (inside) { ok = okAt(yy * W + xx); continue; }
      if (!inMap(xx, yy)) continue;
      const d = Math.max(x - xx, xx - (x + w - 1), y - yy, yy - (y + h - 1)); // så många rutor från huset
      if (gridOf(s).at.has(yy * W + xx) || d <= PLATS.uteFri && uteStation(s, xx, yy)) ok = false; // plats för en stig mellan husen och runt stationerna ute (steg 2.10.8)
    }
    if (!ok) continue;
    const near = rektAvstand(f.x, f.y, x, y, w, h), m = o.mitt;
    const lek = paLek(lekR, x, y, w, h) ? BYGG.lekStraff : 0; // lekplatsen räknas från byns inre (plats.ts, steg 2.10.4)
    let trad = 0; // helst en plats med få träd: varje träd ska fällas först
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (g.trees[yy * W + xx] >= FOREST) trad++;
    const eld = rektAvstand(f.x, f.y, x - 1, y - 1, w + 2, h + 2) === 0 ? ELDFLYTT.husStraff : 0; // där elden står bara om ingen annan plats finns: elden flyttas först
    const sc = Math.max(0, BYGG.husAvst - near) + BYGG.utomVikt * Math.max(0, ut - Math.min(w, h) / 2) + BYGG.mittVikt * Math.hypot(cx - m.x - 0.5, cy - m.y - 0.5) + lek + BYGG.tradVikt * trad + eld;
    platser.push({ x, y, sc });
  }
  // den bästa platsen som inte stänger in någon mark (stationer.ts); lika bra platser i samma ordning som de söktes
  // gångstråken viker bara om de kan dras om (steg 6.2.5). Byns statistik räknar när den bästa platsen inte fick användas för
  // ett stråk (strakSamre) och när ett stråk drogs om runt platsen (strakOm), för provet i steg 6.2.6
  platser.sort((a, b) => a.sc - b.sc);
  let samre = false;
  for (const q of platser) {
    if (stangerIn(s, q.x, q.y, w, h)) continue;
    if (strakHindrar(s, q.x, q.y, w, h)) { samre = true; continue; }
    if (samre) count(s, 'strakSamre');
    if (strakI(s, q.x, q.y, w, h)) count(s, 'strakOm');
    return { x: q.x, y: q.y };
  }
  if (platser.length) count(s, 'strakIngen');
  return undefined;
}
// kan man gå från rutan (ux, uy) utanför dörren till elden f, med huset på platsen at (yttermåtten w×h) i vägen?
function kanGaUt(s: State, at: { x: number; y: number }, w: number, h: number, ux: number, uy: number, f: { x: number; y: number }) {
  if (!inMap(ux, uy) || getMap(s.seed).tiles[uy * W + ux] === T.Vatten || gridOf(s).at.has(uy * W + ux)) return false;
  const g = groundOf(s), solid = g.solid ? g.solid.slice() : new Uint8Array(W * H);
  for (let y = at.y; y < at.y + h; y++) for (let x = at.x; x < at.x + w; x++) solid[y * W + x] = 1;
  return findPath({ ...g, solid }, ux + 0.5, uy + 0.5, f.x + 0.5, f.y + 0.5) !== null;
}
const canBuildWalls = (p: Person, s: State) => ageOf(p, s.now) >= ALDER.vuxen && knows(p, 'timmervagg');

// ---------- behoven (steg 7.2.2) ----------
// Ett system som behöver plats bygger aldrig själv utan anmäler ett byggbehov: en rad i BYGGNADER (byggnader.ts) som säger hur
// akut det är och hur mycket plats det behöver. Sedan när varje behov funnits minns byn (s.byggBehov), så att inget byggs för ett
// behov som bara fanns en stund (Robusthet i designdokumentet). Ett behov som försvinner glöms.
export interface ByggBehov { fn: Fn; a: Akut; sc: number }
export function byggbehov(s: State): ByggBehov[] {
  const ut: ByggBehov[] = [];
  for (const fn of FN) {
    const r: Byggnad = BYGGNADER[fn];
    if (!r.akut) continue;
    const a = r.akut(s);
    if (a.v > 1e-9) ut.push({ fn, a, sc: (r.fara ? HUS.faraBonus : 0) + r.vikt * a.v });
  }
  return ut.sort((x, y) => y.sc - x.sc);
}
const behovNyckel = (b: ByggBehov) => `${b.fn}:${b.a.ag ?? ''}:${b.a.hus ?? ''}`;
// en gång i timmen: minns när behoven kom
export function stepBehov(s: State) {
  const fore = s.byggBehov ?? {}, nu: Record<string, number> = {};
  for (const b of byggbehov(s)) { const k = behovNyckel(b); nu[k] = fore[k] ?? s.now; }
  s.byggBehov = Object.keys(nu).length ? nu : undefined;
}
// behovet har funnits länge nog; en fara väntar inte, och ett behov ingen minns ännu (ingen timme har gått) räknas
const moget = (s: State, b: ByggBehov) => BYGGNADER[b.fn].fara || s.now - (s.byggBehov?.[behovNyckel(b)] ?? -Infinity) >= PLAN.behovTim * HOUR;

// ---------- förslagen och valet (steg 7.2.3) ----------
// För varje behov gör Byggplanen några få förslag ur registret BYGGATGARDER (en rad per åtgärd) och tar det som ger mest värde
// per kostnad, med samma formel som projekten (vikt × brist / kostnad). Ritningen är en lista med rutändringar, och den prövas
// av kontrollen (ritningOk) innan den godtas. En ny åtgärd blir en rad.
export interface Andring { x: number; y: number; m: string } // m = det rutan ska bli (en rad i MATERIAL)
export interface Forslag { at: Atgard; hus?: Hus; x: number; y: number; w: number; h: number; ritning: Andring[]; oppnas: Andring[]; kostnad: number; varde: number; plats: number; ny?: { x: number; y: number } }
interface AtgardDef {
  namn: string;
  steg: number; // viktad ordning (Vägarna till mer plats): varje steg längre ner kostar PLAN.stegPaslag mer
  foresla: (s: State, b: ByggBehov, okAt: (i: number) => boolean) => Forslag[];
}
// vad ritningen kostar: materialet och arbetet (varde.ts)
export function ritningKostnad(ritning: Andring[]) {
  let k = 0;
  for (const a of ritning) { const M = MATERIAL[a.m]; k += (M.item ? M.n * grundvarde(M.item) : 0) + M.tim * ARBETE; }
  return k;
}
// önskad storlek (steg 7.2.6): efter behovet nu, lite större med seden Förutseende, mindre med Dagens behov, större för den rika
export function onskadPlats(s: State, b: ByggBehov) {
  const sed = s.seder?.v?.forsiktighet ?? 0, rik = b.a.ag !== undefined && rikOf(s, b.a.ag) ? PLAN.rikExtra : 0;
  return Math.min(BYGG.maxInne, Math.max(1, Math.round(b.a.plats * (1 + PLAN.sedStorlek * sed)) + rik));
}
const rikOf = (s: State, ag: number) => { if (!byId(s, ag)) return false; const f = formogenheter(s).egen, v = f.get(ag) ?? 0, alla = [...f.values()].sort((x, y) => x - y); return alla.length > 1 && v >= alla[Math.floor(alla.length * 0.75)] * PLAN.rikGang; };

const nyttHus: AtgardDef = {
  namn: 'Nytt hus', steg: 3,
  foresla: (s, b, okAt) => {
    if (b.a.hus !== undefined) return [];
    // storleken efter behovet; så nära kvadratiskt som möjligt
    const sizes: { w: number; h: number }[] = [];
    for (let h = HUS.minSida; h <= HUS.maxSida; h++) for (let w = h; w <= HUS.langSida * h; w++) sizes.push({ w, h });
    const want = onskadPlats(s, b);
    sizes.sort((a, c) => (a.w * a.h < want ? 1000 - a.w * a.h : 0) - (c.w * c.h < want ? 1000 - c.w * c.h : 0) || a.w * a.h - c.w * c.h || (a.w - a.h) - (c.w - c.h));
    for (const { w, h } of sizes) {
      const at = siteFor(s, w + 2, h + 2, okAt);
      if (!at) continue;
      // står huset där elden står, flyttas elden till närmaste lediga plats, och dörren vetter mot den nya platsen
      const e = eldPlats(s), paElden = rektAvstand(e.x, e.y, at.x - 1, at.y - 1, w + 4, h + 4) === 0;
      const ny = paElden ? nyEldplats(s, e.x, e.y, { x: at.x, y: at.y, w: w + 2, h: h + 2 }) : undefined;
      if (paElden && !ny) continue;
      const f = ny ?? e, dorr = dorrPlats(s, at.x, at.y, w + 2, h + 2, f);
      if (!dorr) continue;
      const ritning: Andring[] = [];
      for (let y = at.y; y < at.y + h + 2; y++) for (let x = at.x; x < at.x + w + 2; x++) {
        const edge = x === at.x || y === at.y || x === at.x + w + 1 || y === at.y + h + 1;
        ritning.push({ x, y, m: x === dorr.x && y === dorr.y ? 'oppning' : edge ? 'timmer' : 'tra' });
      }
      return [{ at: 'nyttHus', x: at.x, y: at.y, w: w + 2, h: h + 2, ritning, oppnas: [], kostnad: ritningKostnad(ritning), varde: Math.min(1, w * h / Math.max(1, want)), plats: w * h, ny }];
    }
    return [];
  },
};
// öppningen mitt på den sida som vetter mot elden, om man kan gå därifrån till elden när huset står där (inte ut i vattnet
// eller en ficka mellan vattnet och väggarna); annars den sida närmast elden där det går
function dorrPlats(s: State, x0: number, y0: number, W2: number, H2: number, f: { x: number; y: number }) {
  const w = W2 - 2, h = H2 - 2, at = { x: x0, y: y0 }, cx = x0 + (w + 1) / 2, cy = y0 + (h + 1) / 2;
  const mot = Math.abs(f.x + 0.5 - cx) > Math.abs(f.y + 0.5 - cy) ? (f.x < cx ? 'v' : 'o') : (f.y < cy ? 'n' : 's');
  const sidor = (['v', 'o', 'n', 's'] as const).map(side => {
    const ox = side === 'v' ? at.x : side === 'o' ? at.x + w + 1 : at.x + 1 + Math.floor(w / 2);
    const oy = side === 'n' ? at.y : side === 's' ? at.y + h + 1 : at.y + 1 + Math.floor(h / 2);
    const ux = ox + (side === 'v' ? -1 : side === 'o' ? 1 : 0), uy = oy + (side === 'n' ? -1 : side === 's' ? 1 : 0);
    return { side, ox, oy, ux, uy, d: Math.hypot(ux - f.x, uy - f.y) };
  }).sort((a, b) => (a.side === mot ? -1 : 0) - (b.side === mot ? -1 : 0) || a.d - b.d);
  const d = sidor.find(o => kanGaUt(s, at, W2, H2, o.ux, o.uy, f));
  return d ? { x: d.ox, y: d.oy } : undefined;
}
// bygga ut (steg 7.2.5): huset blir större åt ett håll och är fortfarande en rektangel. Den nya delen byggs klar först, och den
// gamla väggen blir golv sist. Ligger dörren på den väggen flyttas den ut till den nya väggen
const byggaUt: AtgardDef = {
  namn: 'Bygga ut', steg: 1,
  foresla: (s, b, okAt) => {
    const hs = housesOf(s).filter(h => h.klar && !h.ut && (b.a.hus !== undefined ? h.id === b.a.hus : b.a.ag !== undefined ? h.ag === b.a.ag : h.ag === undefined && fnId(h) === b.fn));
    const ut: Forslag[] = [], want = onskadPlats(s, b);
    for (const h of hs) for (const side of ['v', 'o', 'n', 's'] as const) {
      const lodrat = side === 'n' || side === 's', iw = h.w - 2, ih = h.h - 2, tvars = lodrat ? iw : ih;
      for (let k = 1; k <= HUS.maxSida; k++) {
        const nw = iw + (lodrat ? 0 : k), nh = ih + (lodrat ? k : 0);
        if (Math.min(nw, nh) > HUS.maxSida || Math.max(nw, nh) > HUS.langSida * Math.min(nw, nh) || nw * nh > BYGG.maxInne) break;
        const f = utbyggnad(s, h, side, k, okAt);
        if (!f) break;
        ut.push({ ...f, varde: Math.min(1, k * tvars / Math.max(1, want)) });
        if (k * tvars >= want) break;
      }
    }
    return ut;
  },
};
function utbyggnad(s: State, h: Hus, side: 'v' | 'o' | 'n' | 's', k: number, okAt: (i: number) => boolean): Forslag | undefined {
  const x = side === 'v' ? h.x - k : h.x, y = side === 'n' ? h.y - k : h.y, w = h.w + (side === 'v' || side === 'o' ? k : 0), hh = h.h + (side === 'n' || side === 's' ? k : 0);
  const g = gridOf(s), M = PLATS.husMellan, ritning: Andring[] = [], oppnas: Andring[] = [];
  const nyRuta = (xx: number, yy: number) => xx < h.x || yy < h.y || xx >= h.x + h.w || yy >= h.y + h.h;
  // marken: fria rutor, och plats för en stig till grannarna (2.10.8)
  for (let yy = y - M; yy < y + hh + M; yy++) for (let xx = x - M; xx < x + w + M; xx++) {
    const inne = xx >= x && xx < x + w && yy >= y && yy < y + hh;
    if (!inne) { if (inMap(xx, yy) && g.at.has(yy * W + xx) && g.at.get(yy * W + xx)!.hus !== h.id) return undefined; continue; }
    if (nyRuta(xx, yy) && !okAt(yy * W + xx)) return undefined;
  }
  const kant = (xx: number, yy: number) => xx === x || yy === y || xx === x + w - 1 || yy === y + hh - 1;
  // den gamla väggen mot den nya delen, och dörren om den ligger där
  const gammal = (xx: number, yy: number) => side === 'v' ? xx === h.x && yy > h.y && yy < h.y + h.h - 1 : side === 'o' ? xx === h.x + h.w - 1 && yy > h.y && yy < h.y + h.h - 1 : side === 'n' ? yy === h.y && xx > h.x && xx < h.x + h.w - 1 : yy === h.y + h.h - 1 && xx > h.x && xx < h.x + h.w - 1;
  let dorrFlyttas: { x: number; y: number } | undefined;
  for (const b of bitsOf(s)) if (b.hus === h.id && gammal(b.x, b.y)) { oppnas.push({ x: b.x, y: b.y, m: 'tra' }); if (b.k === 'oppning') dorrFlyttas = { x: b.x, y: b.y }; }
  const dorr = dorrFlyttas ? { x: side === 'v' ? x : side === 'o' ? x + w - 1 : dorrFlyttas.x, y: side === 'n' ? y : side === 's' ? y + hh - 1 : dorrFlyttas.y } : undefined;
  for (let yy = y; yy < y + hh; yy++) for (let xx = x; xx < x + w; xx++) {
    if (!nyRuta(xx, yy)) continue;
    ritning.push({ x: xx, y: yy, m: dorr && dorr.x === xx && dorr.y === yy ? 'oppning' : kant(xx, yy) ? 'timmer' : 'tra' });
  }
  if (dorr) {
    const e = eldPlats(s), ux = dorr.x + (side === 'v' ? -1 : side === 'o' ? 1 : 0), uy = dorr.y + (side === 'n' ? -1 : side === 's' ? 1 : 0);
    if (!kanGaUt(s, { x, y }, w, hh, ux, uy, e)) return undefined;
  }
  if (stangerIn(s, x, y, w, hh)) return undefined;
  return { at: 'byggaUt', hus: h, x, y, w, h: hh, ritning, oppnas, kostnad: ritningKostnad(ritning) + ritningKostnad(oppnas), varde: 0, plats: k };
}
export const BYGGATGARDER = { nyttHus, byggaUt } satisfies Record<string, AtgardDef>;
export type Atgard = keyof typeof BYGGATGARDER;
const ATGARDER = BYGGATGARDER as Record<string, AtgardDef>;

// ---------- kontrollen av ritningen (steg 7.2.4) ----------
// Varje ritning prövas av samma kontroll innan den godtas: husets regler (balanstal i HUS och BYGG), en ytterdörr, inget i vattnet,
// på elden eller där vattnet steg sist, inga väggar över en annan byggnad. Då kan en ny åtgärd i registret inte göra ett trasigt hus.
export function ritningOk(s: State, f: Forslag, okAt: (i: number) => boolean): boolean {
  const iw = f.w - 2, ih = f.h - 2;
  if (Math.min(iw, ih) < HUS.minSida || Math.min(iw, ih) > HUS.maxSida || Math.max(iw, ih) > HUS.langSida * Math.min(iw, ih) || iw * ih > BYGG.maxInne) return false;
  if (!f.ritning.length || f.ritning.some(a => !MATERIAL[a.m] || !okAt(a.y * W + a.x))) return false;
  const dorrar = f.ritning.filter(a => a.m === 'oppning').length + (f.hus ? bitsOf(s).filter(b => b.hus === f.hus!.id && b.k === 'oppning' && !f.oppnas.some(a => a.x === b.x && a.y === b.y)).length : 0);
  return dorrar >= 1;
}
// huset är byggt så att man inte kan nå ett rum, eller någon står i en vägg (vakten i testerna, kor.ts)
export function husFel(s: State): string | undefined {
  const g = gridOf(s);
  for (const r of g.rooms) {
    if (r.hus === undefined || !r.tiles.length || r.open > 0) continue;
    if (bitsOf(s).some(b => b.hus === r.hus && (b.b < 1 && b.k === 'vagg'))) continue;
    if (housesOf(s).find(h => h.id === r.hus)?.klar) return `ett rum i hus ${r.hus} saknar öppning`;
  }
  for (const p of living(s)) if (g.solid[Math.floor(p.y) * W + Math.floor(p.x)] && !p.task) return `${p.name} står i en vägg`;
  return undefined;
}

// ---------- planen ----------
// en gång i timmen, men planen görs bara på PLAN.varTim:e klockslaget (steg 7.2.3): några gånger per dygn i spelet, inte per person
export function stepByggplan(s: State) {
  stepBehov(s);
  if (Math.floor(s.now / HOUR) % PLAN.varTim === 0) planBuild(s);
}
// den som planerar (by, namnet i loggen): ett familjehus av den skickligaste byggaren i familjen, annars av familjens ägare (finns
// hen inte kvar: byns skickligaste byggare); andra hus av byns skickligaste byggare. Det måste finnas en byggare i byn, men
// planeraren behöver inte själv kunna bygga väggar. Vem som sedan bygger väljs i val.ts (buildJob)
export function planBuild(s: State) {
  const ppl = living(s), hs = housesOf(s);
  if (!ppl.length || hs.some(h => !h.klar || h.ut)) return;
  const byggare = ppl.filter(p => canBuildWalls(p, s)).sort((a, b) => (b.skill.hantverk + stat(b, 'intelligens', s.now) / BYGG.byggareInt) - (a.skill.hantverk + stat(a, 'intelligens', s.now) / BYGG.byggareInt));
  if (!byggare.length || s.now < (s.byggSok ?? 0)) return;
  const u = byggbehov(s).find(b => moget(s, b));
  if (!u) return;
  const fam = u.a.ag !== undefined ? familjOf(s, u.a.ag) : [], by = byggare.find(p => fam.includes(p)) ?? (fam.find(p => p.id === u.a.ag) ?? byggare[0]);
  // går det att bygga på rutan? Räknas först när sökningen frågar, och sparas under planeringen (steg 6.2.21). Elden flyttas bara om den kan tändas igen
  const utomElden = canLight(s), okMinne = new Int8Array(W * H).fill(-1);
  const okAt = (i: number) => (okMinne[i] < 0 ? okMinne[i] = tileOk(s, i % W, Math.floor(i / W), utomElden) ? 1 : 0 : okMinne[i]) === 1;
  // förslagen, och det med mest värde per kostnad; varje steg längre ner i ordningen kostar mer
  let bast: Forslag | undefined, bs = -Infinity;
  for (const k of Object.keys(ATGARDER)) {
    const d = ATGARDER[k];
    for (const f of d.foresla(s, u, okAt).slice(0, PLAN.perBehov)) {
      if (!ritningOk(s, f, okAt)) continue;
      const sc = f.varde / (Math.max(PROJEKT_TAL.minKostnad, f.kostnad) * (1 + PLAN.stegPaslag * d.steg));
      if (sc > bs) { bs = sc; bast = f; }
    }
  }
  if (!bast) { s.byggSok = s.now + BYGG.omforsok * HOUR; return; } // ingen plats nu: försök igen om ett tag
  if (bast.at === 'byggaUt') return utfor(s, bast, by);
  bygg(s, bast, u, by);
}
// ett nytt hus: ritningen blir bitar
function bygg(s: State, f: Forslag, u: ByggBehov, by: Person) {
  const row: Byggnad = BYGGNADER[u.fn], iw = f.w - 2, ih = f.h - 2, same = antalLika(s, u.fn, iw, ih);
  const hus: Hus = { id: (s.nextBit ??= 1), namn: row.namnFor!(s, iw, ih, same, u.a), x: f.x, y: f.y, w: f.w, h: f.h, fn: u.fn, slag: u.a.slag, ag: u.a.ag };
  s.nextBit++;
  for (const a of f.ritning) bitsOf(s).push({ id: s.nextBit++, x: a.x, y: a.y, k: MATERIAL[a.m].k, m: a.m, b: a.m === 'oppning' ? 1 : 0, mat: 0, c: 1, hus: hus.id });
  housesOf(s).push(hus); touch(s);
  if (f.ny) s.fire.flytt = { x: f.ny.x, y: f.ny.y, varfor: 'plats' };
  log(s, planText(by, u.fn, hus, iw * ih, same) + (f.ny ? ' Elden måste flyttas först.' : ''), 'world', [by.id]); count(s, 'planerat_' + u.fn);
  if (u.fn === 'sovsal' && iw * ih >= HUS.langhus) count(s, 'planerat_langhus'); // ett långhus (så ofta det händer, samhalle-192)
}
// en utbyggnad: den nya delen blir bitar i huset, och den gamla väggen öppnas när den är klar (slutUt i bygg.ts)
function utfor(s: State, f: Forslag, by: Person) {
  const h = f.hus!;
  s.nextBit ??= 1;
  for (const a of f.ritning) bitsOf(s).push({ id: s.nextBit++, x: a.x, y: a.y, k: MATERIAL[a.m].k, m: a.m, b: a.m === 'oppning' ? 1 : 0, mat: 0, c: 1, hus: h.id });
  h.ut = { x: f.x, y: f.y, w: f.w, h: f.h, oppnas: f.oppnas.map(a => [a.x, a.y, a.m]) };
  touch(s); count(s, 'planerat_ut');
  log(s, `${by.name} planerar att bygga ut ${h.namn.toLowerCase()} med ${f.ritning.filter(a => MATERIAL[a.m].k === 'golv').length} rutor.`, 'world', [by.id]);
}
function planText(by: Person, fn: Fn, h: Hus, n: number, same: number) {
  if (fn === 'sovsal') return `${by.name} planerar ${n >= HUS.langhus ? 'ett långhus' : 'en hydda'}${same ? ' till' : ''} med plats för ${n} att sova under tak.`;
  if (fn === 'familjehus') return `${by.name} och familjen bestämmer sig för att bygga ett eget hus, ${h.namn.toLowerCase()}.`;
  return `${by.name} planerar ${h.namn.toLowerCase()}.`;
}

