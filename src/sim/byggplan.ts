import { bynsMitt, omrade, tillHoljet } from './omrade';
import { ALDER, ageOf, byId, count, familjOf, forstaGang, getRel, living, log, stat } from './folk';
import { Hus, MATERIAL, bitAt, bitsOf, gridOf, housesOf, husById, touch } from './byggnad';
import { eldPlats, getMap } from './karta';
import { groundOf } from './mark';
import { PLATS, rektAvstand } from './plats';
import { lekplats, paLek, stangerIn, stationRutor, storlekAv, uteStation } from './stationer';
import { knows } from './teknik';
import { villHaMer } from './forradsmal';
import { amountOf, changed, lagerFullt, lagerNy, overflow, lagerStorre, nearZone, ownedAll, put, usable, zonesOf } from './lager';
import { tingOf } from './agande';
import { FOREST, findPath } from './vag';
import { Akut, BYGGNADER, Byggnad, FN, Fn, HUS, antalLika, fnId, fnOf, husNamn, sovHus, sovplatser, torkUte, vedUte } from './byggnader';
import { kronika } from './historik';
import { clamp } from './slump';
import { ledareOf } from './styre';
import { PROJEKT_TAL } from './projekt';
import { ARBETE, formogenheter, grundvarde, husVarde, varuVarde } from './varde';
import { BYGG } from './bygg';
import { DAY, GRANNAR4, H, HOUR, Person, State, T, W, inMap } from './typer';
import { underMinnet } from './sjo';
import { balans } from './balans';
import { betalVaror, betalaAv, bynPart, genomfor, personPart } from './behov';
import { kanTaHus } from './byte';
import { ELDFLYTT, nyEldplats } from './eldflytt';
import { canLight } from './eld';
import { paStrak, strakHindrar, strakI, straken } from './strak';
import { strandNu } from './sjo';

// ---------- balanstal (regel 8) ----------
// Byggplanen (Byggsystemet: det som ska byggas). Husreglerna står i HUS (byggnader.ts) och BYGG (bygg.ts)
export const PLAN = balans('byggplan', {
  behovTim: 2, // ett behov måste finnas så här många timmar innan det byggs för (en fara väntar inte)
  varTim: 3, // planen görs var tredje timme i spelet
  perBehov: 6, // högst så många förslag per åtgärd och behov
  stegPaslag: 0.15, // varje steg längre ner i ordningen (använda huset bättre, bygga ut, köpa, flytta) kostar så här mycket mer
  infartFran: 30, // så många rutor väg i byn innan en väg dras ut ur den
  broMax: 8, // en väg kan gå över högst så här brett vatten, med en bro (steg 7.3.12)
  forbInfart: 0.3, // hur mycket infartsvägen är värd
  torgFolk: 15, // så många invånare innan byn vill ha ett torg (steg 7.3.13)
  torgSida: 10, // så stort är torget från början
  torgSok: 15, // så långt från byns mitt söks platsen
  torgPerRad: 4, // så många invånare till innan torget växer en rad
  vagVirke: 6, // en väg eller brygga föreslås först när byn har så mycket virke
  vagBatch: 8, // så många rutor väg åt gången
  forbVag: 0.35, forbBrygga: 0.4, // hur mycket vägen och bryggan är värda
  bryggaRutor: 4, bryggaFolk: 10, // en brygga (så här många rutor) för varje så här många invånare
  bryggaMax: 4, // en brygga är högst så här lång
  skjulMax: 8, // ett skjul täcker högst så här många rutor åt varje håll
  skjulSida: 4, // en sida längre än så här får en stolpe till på mitten
  utEld: 4, // ett hus byggs inte ut närmare elden än så här många rutor
  forbVed: 30, // en förbättring föreslås först när byn har så mycket trä
  forbGolv: 0.3, forbRum: 0.5, forbRik: 0.4, // hur mycket förbättringen är värd (0 till 1)
  egetRumFolk: 4, // en familj med så här många vill ha ett eget rum
  lagerKostnad: 0.5, // att göra en lagerplats större eller ny kostar så här mycket (arbetet med att bära om)
  forStort: 2, // ett hus är för stort när det har så här många gånger fler sovplatser än familjen
  husVanta: 2, husMote: 8, // ett husbyte väntar så här många dygn (år i spelet) på att köparen och säljaren står så här många rutor från varandra
  salj: 1.2, bynSalj: 0.6, // säljarens lägsta pris: så här många gånger husets värde (byn säljer billigt det den inte behöver)
  kopMax: 0.9, // köparens högsta pris är så här stor del av vad det kostar att bygga nytt
  prisRel: 0.3, // en vän betalar mindre ...
  prisSkill: 0.3, // ... och den som är bättre på handel
  rivDygn: 2, // ett eget hus som stått tomt så här många dygn (år i spelet) rivs
  potMitt: 50, // en egenskap på det här värdet drar inte åt något håll
  tatSed: 0.7, tatLedare: 0.3, // hur mycket seden Sammanhållning och ledarens empati gör att husen står tätt
  raderFran: 0.5, // över det här (seden Förnyelse och ledarens nyfikenhet) byggs husen i rader längs stråken
  jordFran: -0.5, // under det här (seden Dagens behov) lägger man jordgolv
  ringVikt: 0.2, // planen i en ring: så mycket mer än vanligt väger avståndet till mitten
  raderVikt: 1.5, // planen i rader: så många poäng mindre för ett hus nära ett gångstråk
  sedMarg: 0.5, // först när seden Dagens behov är starkare än så här bygger byn mindre
  sedStorlek: 0.1, // seden Förutseende bygger så här mycket större, Dagens behov så här mycket mindre
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
  const f = eldPlats(s), R = BYGG.radieBas + living(s).length * BYGG.radiePerPerson, g = groundOf(s), lekR = lekplats(s), M = Math.max(PLATS.husMellan + ((s.byplan?.tat ?? 0) < -0.5 ? 1 : 0), PLATS.uteFri);
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
      if (gridOf(s).at.has(yy * W + xx) && !MATERIAL[gridOf(s).at.get(yy * W + xx)!.m].vag || d <= PLATS.uteFri && uteStation(s, xx, yy)) ok = false; // plats för en stig mellan husen och runt stationerna ute (steg 2.10.8)
    }
    if (!ok) continue;
    const near = rektAvstand(f.x, f.y, x, y, w, h), m = o.mitt;
    const lek = paLek(lekR, x, y, w, h) ? BYGG.lekStraff : 0; // lekplatsen räknas från byns inre (plats.ts, steg 2.10.4)
    let trad = 0; // helst en plats med få träd: varje träd ska fällas först
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (g.trees[yy * W + xx] >= FOREST) trad++;
    const eld = rektAvstand(f.x, f.y, x - 1, y - 1, w + 2, h + 2) === 0 ? ELDFLYTT.husStraff : 0; // där elden står bara om ingen annan plats finns: elden flyttas först
    const form = s.byplan?.form ?? 'ring', rad = form === 'rader' && strakNara(s, x, y, w, h) ? PLAN.raderVikt : 0;
    const sc = Math.max(0, BYGG.husAvst - near) + BYGG.utomVikt * Math.max(0, ut - Math.min(w, h) / 2) + (BYGG.mittVikt + (form === 'ring' ? PLAN.ringVikt : 0)) * Math.hypot(cx - m.x - 0.5, cy - m.y - 0.5) + lek + BYGG.tradVikt * trad + eld - rad;
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
export interface ByggBehov { fn: Fn | 'forbattra' | 'lagerplats'; a: Akut; sc: number }
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
const moget = (s: State, b: ByggBehov) => (BYGGNADER as Record<string, Byggnad>)[b.fn]?.fara || s.now - (s.byggBehov?.[behovNyckel(b)] ?? -Infinity) >= PLAN.behovTim * HOUR;

const strakNara = (s: State, x: number, y: number, w: number, h: number) => strakI(s, x - 2, y - 2, w + 4, h + 4);

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
  // Dagens behov tar bort marginalen när seden är tydlig, men bygger aldrig för få
  const f = sed > 0 ? 1 + PLAN.sedStorlek * sed : 1 + PLAN.sedStorlek * Math.min(0, sed + PLAN.sedMarg);
  return Math.min(BYGG.maxInne, Math.max(1, Math.round(b.a.plats * f) + rik));
}
const rikOf = (s: State, ag: number) => { if (!byId(s, ag)) return false; const f = formogenheter(s).egen, v = f.get(ag) ?? 0, alla = [...f.values()].sort((x, y) => x - y); return alla.length > 1 && v >= alla[Math.floor(alla.length * 0.75)] * PLAN.rikGang; };

const nyttHus: AtgardDef = {
  namn: 'Nytt hus', steg: 3,
  foresla: (s, b, okAt) => {
    if (b.a.hus !== undefined || b.fn === 'forbattra' || b.fn === 'lagerplats' || (BYGGNADER as Record<string, Byggnad>)[b.fn]?.skjul) return [];
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
        ritning.push({ x, y, m: x === dorr.x && y === dorr.y ? 'oppning' : edge ? 'timmer' : s.byplan?.golv ?? 'tra' });
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
    const hs = housesOf(s).filter(h => h.klar && !h.ut && !h.skjul && (b.a.hus !== undefined ? h.id === b.a.hus : b.a.ag !== undefined ? h.ag === b.a.ag : h.ag === undefined && fnId(h) === b.fn && !fnOf(h).lager));
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
  const e0 = eldPlats(s);
  if (rektAvstand(e0.x, e0.y, x, y, w, hh) < PLAN.utEld) return undefined; // inte närmare elden än så, för röken och gnistorna
  return { at: 'byggaUt', hus: h, x, y, w, h: hh, ritning, oppnas, kostnad: ritningKostnad(ritning) + ritningKostnad(oppnas), varde: 0, plats: k };
}
// ---------- förbättringarna (steg 7.2.10) ----------
// Byn stannar aldrig: när inget behov är akut föreslår Byggplanen ett bättre golv, ett eget rum åt en växande familj och en
// utbyggnad åt den rika. Bitarna märks forb och byggs på nivån Förbättra i Arbetsordningen (val.ts)
const finnsTra = (s: State) => amountOf(s, 'ved') >= PLAN.forbVed;
const battreGolv: AtgardDef = {
  namn: 'Byta material', steg: 0,
  foresla: (s, b) => {
    if (b.fn !== 'forbattra' || !finnsTra(s)) return [];
    const j = bitsOf(s).find(q => q.k === 'golv' && q.m === 'jord' && q.b >= 1 && q.hus !== undefined && husById(s, q.hus)?.klar && !husById(s, q.hus)?.ut);
    if (!j) return [];
    const h = husById(s, j.hus)!, ritning = [{ x: j.x, y: j.y, m: 'tra' }];
    return [{ at: 'battreGolv', hus: h, x: h.x, y: h.y, w: h.w, h: h.h, ritning, oppnas: [], kostnad: ritningKostnad(ritning), varde: PLAN.forbGolv, plats: 0 }];
  },
};
// en innervägg mitt på den långa sidan, med en öppning, så att familjen får ett eget rum. Båda rummen är minst HUS.minSida breda
const egetRum: AtgardDef = {
  namn: 'Dela upp', steg: 0,
  foresla: (s, b) => {
    if (b.fn !== 'forbattra' || !finnsTra(s)) return [];
    const st = stationRutor(s);
    for (const h of housesOf(s)) {
      if (h.ag === undefined || !h.klar || h.ut || familjOf(s, h.ag).length < PLAN.egetRumFolk) continue;
      if (gridOf(s).rooms.filter(r => r.hus === h.id && r.tiles.length).length > 1) continue;
      const iw = h.w - 2, ih = h.h - 2, lang = iw >= ih, n = lang ? iw : ih, tvars = lang ? ih : iw;
      if (n < 2 * HUS.minSida + 1) continue;
      const m = Math.floor(n / 2), ritning: Andring[] = [];
      for (let i = 0; i < tvars; i++) {
        const x = lang ? h.x + 1 + m : h.x + 1 + i, y = lang ? h.y + 1 + i : h.y + 1 + m;
        ritning.push({ x, y, m: i === Math.floor(tvars / 2) ? 'oppning' : 'timmer' });
      }
      if (ritning.some(a => st.at.has(a.y * W + a.x) || bitAt(s, a.x, a.y)?.k !== 'golv')) continue;
      return [{ at: 'egetRum', hus: h, x: h.x, y: h.y, w: h.w, h: h.h, ritning, oppnas: [], kostnad: ritningKostnad(ritning), varde: PLAN.forbRum, plats: 0 }];
    }
    return [];
  },
};
const rikUt: AtgardDef = {
  namn: 'Bygga ut åt den rika', steg: 1,
  foresla: (s, b, okAt) => {
    if (b.fn !== 'forbattra' || !finnsTra(s)) return [];
    for (const h of housesOf(s)) {
      if (h.ag === undefined || !h.klar || h.ut || !rikOf(s, h.ag)) continue;
      const fs = byggaUt.foresla(s, { fn: fnId(h), a: { v: 1, plats: PLAN.rikExtra, ag: h.ag, hus: h.id }, sc: 0 }, okAt);
      if (fs.length) return fs.map(f => ({ ...f, varde: PLAN.forbRik }));
    }
    return [];
  },
};
// ---------- lagret (steg 7.2.18) ----------
// ingen ritning: marken märks bara ut. Kostar arbetet med att flytta det som ligger, och väger därför lätt mot ett förrådshus
const lagerStorreA: AtgardDef = {
  namn: 'Större lagerplats', steg: 0,
  foresla: (_s, b) => b.fn === 'lagerplats' ? [{ at: 'lagerStorreA', x: 0, y: 0, w: 0, h: 0, ritning: [], oppnas: [], kostnad: PLAN.lagerKostnad, varde: 1, plats: 0 }] : [],
};
const lagerNyA: AtgardDef = {
  namn: 'Ny lagerplats', steg: 1,
  foresla: (_s, b) => b.fn === 'lagerplats' ? [{ at: 'lagerNyA', x: 0, y: 0, w: 0, h: 0, ritning: [], oppnas: [], kostnad: PLAN.lagerKostnad, varde: 1, plats: 0 }] : [],
};
// ---------- att köpa ett hus (steg 7.2.14 och 7.2.16) ----------
// Tre tal: husets värde (materialet och arbetet minus slitaget); vad det är värt för säljaren (värdet gånger hur väl det fyller
// familjens behov); vad det är värt för köparen (vad det skulle kosta att få samma rum på ett annat sätt, aldrig mer än familjen
// har råd med). Affären blir av när köparens högsta pris är minst säljarens lägsta, och priset hamnar däremellan efter
// relationen och handelsfärdigheten
const salesPlats = (s: State, h: Hus) => gridOf(s).rooms.filter(r => r.hus === h.id).reduce((n, r) => n + sovplatser(s, r), 0);
// säljaren vill bli av med huset: det är tomt eller för stort för familjen; byn säljer sina tomma hus
function saljbart(s: State, h: Hus): boolean {
  if (!h.klar || h.ut) return false;
  if (h.ag === undefined) return fnId(h) === 'sovsal' && h.tom !== undefined;
  return familjOf(s, h.ag).length * PLAN.forStort <= salesPlats(s, h) || !familjOf(s, h.ag).length;
}
export const saljPris = (s: State, h: Hus) => husVarde(s, h) * (h.ag === undefined ? PLAN.bynSalj : PLAN.salj);
export function kopPris(s: State, ag: number, nybygge: number) {
  const q = byId(s, ag);
  return q ? Math.min(nybygge * PLAN.kopMax, varuVarde(ownedAll(s, ag), 0)) : 0;
}
const kopaHus: AtgardDef = {
  namn: 'Köpa ett hus', steg: 2,
  foresla: (s, b) => {
    if (b.a.ag === undefined || b.a.hus !== undefined || b.fn !== 'familjehus' || s.husAffar) return [];
    const ut: Forslag[] = [], want = onskadPlats(s, b), ny = husKostnadAv(want);
    for (const h of housesOf(s)) {
      if (h.ag === b.a.ag || !saljbart(s, h)) continue;
      const plats = (h.w - 2) * (h.h - 2), salj = saljPris(s, h), kop = kopPris(s, b.a.ag, ny);
      if (plats < b.a.plats || kop < salj) continue;
      ut.push({ at: 'kopaHus', hus: h, x: h.x, y: h.y, w: h.w, h: h.h, ritning: [], oppnas: [], kostnad: (salj + kop) / 2, varde: Math.min(1, plats / Math.max(1, want)), plats });
    }
    return ut;
  },
};
const husKostnadAv = (n: number) => { const w = Math.max(HUS.minSida, Math.ceil(Math.sqrt(n))), h = Math.max(HUS.minSida, Math.ceil(n / w)); return ((2 * (w + 2) + 2 * h - 1) * (MATERIAL.timmer.n * grundvarde('ved') + MATERIAL.timmer.tim * ARBETE)) + w * h * (MATERIAL.tra.n * grundvarde('ved') + MATERIAL.tra.tim * ARBETE); };
// husbytet (steg 7.2.12) är ett vanligt stort byte (genomfor i behov.ts): två filtar, huset som en symbol på den enas och betalningen på
// den andras, handslag, en rad i loggen och krönikan, relationen och Handel som i alla byten. Priset hamnar mellan säljarens lägsta och
// köparens högsta: vän eller släkt betalar mindre, och den skickligare får det bättre. Köparen betalar med det som hen behöver minst, i
// hela saker, efter grundvärdet. Går det inte att betala blir det inget. Bara en bybo kan köpa (kanTaHus i byte.ts), aldrig en handlare
export function kopHus(s: State, h: Hus, ag: number, bud?: Person) {
  const kopare = byId(s, ag), saljare = h.ag !== undefined ? byId(s, h.ag) : undefined;
  if (!kopare || h.ag === ag) return false;
  const salj = saljPris(s, h), hog = kopPris(s, ag, husKostnadAv((h.w - 2) * (h.h - 2)));
  const rel = saljare ? getRel(s, saljare, kopare).op / 100 : 0, skill = clamp(((kopare.skill.handel ?? 0) - ((saljare ?? bud)?.skill.handel ?? 0)) / 100, -1, 1);
  const pris = Math.ceil(salj + (hog - salj) * clamp(0.5 - rel * PLAN.prisRel - skill * PLAN.prisSkill, 0, 1));
  const M = personPart(s, kopare), G0 = saljare ? personPart(s, saljare) : bynPart(s, kopare.x, kopare.y, bud);
  if (!kanTaHus(M)) return false;
  const G = { ...G0, varde: () => 1 }; // betalningen räknas i grundvärdet
  const { betal, fick } = betalaAv(betalVaror(M, G, ['hus']), G, pris);
  if (fick < pris - 1e-9) return false;
  genomfor(s, M, G, [{ k: 'hus', n: 1, hus: h.id, varde: pris }], betal, 'hus');
  h.ag = ag; h.fn = 'familjehus'; h.tom = undefined; h.rumFn = undefined; h.namn = husNamn(kopare.name); touch(s); count(s, 'husKopt');
  return true;
}
// ett hus byter ägare när köparen och säljaren möts (som i alla stora byten): varje timme tills de gör det, högst PLAN.husVanta dygn.
// När det är byn som säljer görs bytet med en vuxen som står nära köparen, helst ledaren
function husAffar(s: State) {
  const a = s.husAffar;
  if (!a) return;
  const h = husById(s, a.hus), k = byId(s, a.ag);
  if (!h || !k || !living(s).includes(k) || h.ag === a.ag || !saljbart(s, h) || s.now - a.t > PLAN.husVanta * DAY) { delete s.husAffar; return; }
  if (k.task?.act === 'sova') return;
  const naraK = (q: Person) => q !== k && q.task?.act !== 'sova' && Math.hypot(q.x - k.x, q.y - k.y) <= PLAN.husMote;
  const saljare = h.ag !== undefined ? byId(s, h.ag) : undefined;
  if (h.ag !== undefined && (!saljare || !naraK(saljare))) return;
  const led = ledareOf(s), bud = h.ag !== undefined ? undefined : led && naraK(led) ? led : living(s).find(q => naraK(q) && ageOf(q, s.now) >= ALDER.vuxen);
  if (h.ag === undefined && !bud) return;
  delete s.husAffar;
  kopHus(s, h, a.ag, bud);
}
// en familj river sitt eget hus när ingen vill köpa det och det står tomt (steg 7.2.15): hälften av materialet går till ägaren
export function rivOmTomt(s: State) {
  for (const h of housesOf(s)) {
    if (h.ag === undefined || !h.klar || h.ut) continue;
    const folk = familjOf(s, h.ag);
    if (folk.length && folk.some(q => sovHus(s, q) === h.id)) { h.tom = undefined; continue; }
    h.tom ??= s.now;
    if (s.now - h.tom < PLAN.rivDygn * DAY) continue;
    const ved = Math.floor(bitsOf(s).filter(b => b.hus === h.id).reduce((a, b) => a + (MATERIAL[b.m].item === 'ved' ? b.mat : 0), 0) * HUS.rivTillbaka + 1e-9), o = h.ag, namn = h.namn;
    s.byggen = bitsOf(s).filter(b => b.hus !== h.id); s.hus = housesOf(s).filter(q => q !== h);
    if (ved > 0) put(s, 'ved', ved, { [o]: ved });
    touch(s); changed(s); count(s, 'rivet');
    log(s, `${namn} stod tomt och revs. ${ved} trä gick till ägaren.`, 'world'); kronika(s, `${namn} revs.`);
    return;
  }
}
// ---------- infartsvägen och bron (steg 7.3.8 och 7.3.12) ----------
// Byn drar med tiden en väg rakt ut till kartans närmaste kant, åt det håll handlarna kommer ifrån. Når den kanten kan handlaren med
// kärra komma också på vintern. Är det vatten i vägen, högst PLAN.broMax rutor brett, byggs en brygga i vägens bredd: en bro.
function infartLinje(s: State) {
  const c = bynsMitt(s), val = [{ d: c.x, dx: -1, dy: 0 }, { d: W - 1 - c.x, dx: 1, dy: 0 }, { d: c.y, dx: 0, dy: -1 }, { d: H - 1 - c.y, dx: 0, dy: 1 }].sort((a, q) => a.d - q.d)[0];
  const ut: { x: number; y: number }[] = [];
  for (let n = 0; n <= val.d; n++) ut.push({ x: c.x + val.dx * n, y: c.y + val.dy * n });
  return { ut, dx: val.dx, dy: val.dy };
}
const infartA: AtgardDef = {
  namn: 'Infartsväg', steg: 0,
  foresla: (s, b) => {
    if (b.fn !== 'forbattra' || !kanTek(s, 'stockvag') || s.infart?.klar || s.infart?.stopp || amountOf(s, 'virke') < PLAN.vagVirke) return [];
    if (bitsOf(s).filter(q => q.m === 'stockvag').length < PLAN.infartFran) return [];
    const { ut, dx, dy } = infartLinje(s), m = getMap(s.seed).tiles, ritning: Andring[] = [];
    let vatten = 0;
    for (const q of ut) {
      const t = m[q.y * W + q.x];
      vatten = t === T.Vatten ? vatten + 1 : 0;
      if (t === T.Sten || vatten > PLAN.broMax) { s.infart = { ...s.infart, stopp: 1 }; return []; }
      if (ritning.length >= PLAN.vagBatch) break;
      const bit = bitAt(s, q.x, q.y);
      if (bit && !MATERIAL[bit.m].vag) continue; // ett hus står i vägen: vägen fortsätter på andra sidan
      if (bit) continue;
      const mat = t === T.Vatten ? 'brygga' : 'stockvag', px = q.x + dy, py = q.y + dx;
      ritning.push({ x: q.x, y: q.y, m: mat });
      if (inMap(px, py) && !gridOf(s).at.has(py * W + px) && (m[py * W + px] === T.Vatten) === (t === T.Vatten) && m[py * W + px] !== T.Sten) ritning.push({ x: px, y: py, m: mat });
    }
    if (!ritning.length) { s.infart = { ...s.infart, klar: 1 }; log(s, 'Infartsvägen når ända ut. Nu kan handlaren med kärra komma också på vintern.', 'world'); return []; }
    return [{ at: 'infartA', x: 0, y: 0, w: 0, h: 0, ritning, oppnas: [], kostnad: ritningKostnad(ritning), varde: PLAN.forbInfart, plats: 0 }];
  },
};
// ---------- torget (steg 7.3.13) ----------
// Byns centrum flyttar från lägerelden till ett torg: inget byggs eller ställs där, och dit leder gångstråken. Det växer med byn, och vägen läggs över det
function torgNu(s: State) {
  const n = living(s).length;
  if (!s.torg) {
    if (n < PLAN.torgFolk) return;
    const o = omrade(s), S = PLAN.torgSida;
    let bast: { x: number; y: number } | undefined, bd = Infinity;
    for (let y = Math.max(1, o.mitt.y - PLAN.torgSok); y + S < H && y <= o.mitt.y + PLAN.torgSok; y++) for (let x = Math.max(1, o.mitt.x - PLAN.torgSok); x + S < W && x <= o.mitt.x + PLAN.torgSok; x++) {
      const d = Math.hypot(x + S / 2 - o.mitt.x, y + S / 2 - o.mitt.y);
      if (d < bd && torgFritt(s, x, y, S, S)) { bd = d; bast = { x, y }; }
    }
    if (bast) { s.torg = { ...bast, w: S, h: S }; touch(s); count(s, 'torg'); log(s, 'Byn märker ut ett torg mitt i byn. Dit leder stigarna från och med nu.', 'world'); kronika(s, 'Byn fick ett torg.'); }
    return;
  }
  // torget växer med byn, en rad åt gången
  if (n < PLAN.torgFolk + (s.torg.w - PLAN.torgSida) * PLAN.torgPerRad) return;
  const t = s.torg;
  if (torgFritt(s, t.x, t.y, t.w + 1, t.h + 1)) { t.w++; t.h++; touch(s); count(s, 'torgVaxt'); }
}
function torgFritt(s: State, x: number, y: number, w: number, h: number) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const i = yy * W + xx, b = gridOf(s).at.get(i), t = getMap(s.seed).tiles[i];
    if (t === T.Vatten || t === T.Sten || b && !MATERIAL[b.m].vag || stationRutor(s).at.has(i) || zonesOf(s).some(z => xx >= z.x && xx < z.x + z.w && yy >= z.y && yy < z.y + z.h) || (s.stackar ?? []).some(a => a.x === xx && a.y === yy)) return false;
  }
  const e = eldPlats(s);
  return rektAvstand(e.x, e.y, x, y, w, h) > 1;
}
// ---------- skjulen (steg 7.3.5 och 7.3.6) ----------
// Ett skjul är ett tak utan väggar över det som redan står: torkställningarna eller vedhögarna. Det är en rektangel med en stolpe i
// varje hörn och en till mitt på en sida längre än PLAN.skjulSida. Stolparna står utanför det som ska under tak
const skjulA: AtgardDef = {
  namn: 'Skjul', steg: 1,
  foresla: (s, b, okAt) => {
    const r: Byggnad | undefined = (BYGGNADER as Record<string, Byggnad>)[b.fn];
    if (!r?.skjul) return [];
    const under = b.fn === 'torkhus' ? torkUte(s).map(t => ({ x: t.x, y: t.y, w: storlekAv(t).w, h: storlekAv(t).h })) : vedUte(s).map(a => ({ x: a.x, y: a.y, w: 1, h: 1 }));
    if (!under.length) return [];
    // så många som får plats inom PLAN.skjulMax, räknat från det första
    const x0 = under[0].x, y0 = under[0].y, med = under.filter(q => q.x + q.w - x0 <= PLAN.skjulMax && q.y + q.h - y0 <= PLAN.skjulMax && q.x >= x0 - PLAN.skjulMax && q.y >= y0 - PLAN.skjulMax);
    const x = Math.min(...med.map(q => q.x)) - 1, y = Math.min(...med.map(q => q.y)) - 1, w = Math.max(...med.map(q => q.x + q.w)) + 1 - x, h = Math.max(...med.map(q => q.y + q.h)) + 1 - y;
    const ritning: Andring[] = [];
    const stolpe = (xx: number, yy: number) => { if (!ritning.some(a => a.x === xx && a.y === yy)) ritning.push({ x: xx, y: yy, m: 'stolpe' }); };
    stolpe(x, y); stolpe(x + w - 1, y); stolpe(x, y + h - 1); stolpe(x + w - 1, y + h - 1);
    if (w - 2 > PLAN.skjulSida) { stolpe(x + (w >> 1), y); stolpe(x + (w >> 1), y + h - 1); }
    if (h - 2 > PLAN.skjulSida) { stolpe(x, y + (h >> 1)); stolpe(x + w - 1, y + (h >> 1)); }
    if (ritning.some(a => !inMap(a.x, a.y) || paStrak(s, a.x, a.y) || gridOf(s).at.has(a.y * W + a.x) || stationRutor(s).at.has(a.y * W + a.x) || zonesOf(s).some(z => a.x >= z.x && a.x < z.x + z.w && a.y >= z.y && a.y < z.y + z.h) || (s.stackar ?? []).some(q => q.x === a.x && q.y === a.y) || !okAt(a.y * W + a.x) && !zonesOf(s).some(z => a.x >= z.x - 1 && a.x <= z.x + z.w && a.y >= z.y - 1 && a.y <= z.y + z.h))) return [];
    return [{ at: 'skjulA', x, y, w, h, ritning, oppnas: [], kostnad: ritningKostnad(ritning), varde: Math.min(1, med.length / Math.max(1, under.length)), plats: 0 }];
  },
};
// ---------- vägarna och bryggorna (steg 7.3.7 och 7.3.9) ----------
// Byn lägger en väg av virke på gångstråken, 2 rutor bred mellan hus som står tätt och annars 3, på nivån Förbättra: de mest
// trampade rutorna först. Bryggan byggs från en strandruta nära byn rakt ut i vattnet, 2 rutor lång, och byggs ut till 4
const paTorg = (s: State, i: number) => { const t = s.torg, x = i % W, y = (i / W) | 0; return !!t && x >= t.x && y >= t.y && x < t.x + t.w && y < t.y + t.h; };
const kanTek = (s: State, t: string) => living(s).some(p => knows(p, t));
const stockvagA: AtgardDef = {
  namn: 'Stockväg', steg: 0,
  foresla: (s, b) => {
    if (b.fn !== 'forbattra' || !kanTek(s, 'stockvag') || amountOf(s, 'virke') < PLAN.vagVirke) return [];
    const g = groundOf(s), st = straken(s), fri = (x: number, y: number) => inMap(x, y) && !gridOf(s).at.has(y * W + x) && st.ruta[y * W + x] >= 0 && getMap(s.seed).tiles[y * W + x] !== T.Vatten && getMap(s.seed).tiles[y * W + x] !== T.Sten && !stationRutor(s).at.has(y * W + x);
    const lista: number[] = [];
    for (let i = 0; i < W * H; i++) if ((st.ruta[i] > 0 || paTorg(s, i)) && !gridOf(s).at.has(i)) lista.push(i);
    if (!lista.length) return [];
    lista.sort((a, c) => g.cover[a] - g.cover[c] || a - c);
    const ritning: Andring[] = [], med = new Set<number>();
    for (const i of lista) {
      if (ritning.length >= PLAN.vagBatch) break;
      const x = i % W, y = Math.floor(i / W), vag = st.ruta[i - 1] > 0 || st.ruta[i + 1] > 0, [dx, dy] = vag ? [0, 1] : [1, 0];
      // tre rutor bred om det inte står något två rutor bort, annars två
      const lagg = [[x, y], [x + dx, y + dy], ...(fri(x - dx, y - dy) && !gridOf(s).at.has((y + 2 * dy) * W + x + 2 * dx) ? [[x - dx, y - dy]] : [])];
      for (const [qx, qy] of lagg) if (fri(qx, qy) && !med.has(qy * W + qx)) { med.add(qy * W + qx); ritning.push({ x: qx, y: qy, m: 'stockvag' }); }
    }
    return ritning.length ? [{ at: 'stockvagA', x: 0, y: 0, w: 0, h: 0, ritning, oppnas: [], kostnad: ritningKostnad(ritning), varde: PLAN.forbVag, plats: 0 }] : [];
  },
};
const antalBryggor = (s: State) => bitsOf(s).filter(q => q.m === 'brygga').length;
const bryggaA: AtgardDef = {
  namn: 'Brygga', steg: 0,
  foresla: (s, b) => {
    if (b.fn !== 'forbattra' || !kanTek(s, 'brygga') || amountOf(s, 'virke') < PLAN.vagVirke) return [];
    if (antalBryggor(s) >= PLAN.bryggaRutor * Math.ceil(living(s).length / PLAN.bryggaFolk)) return [];
    const m = getMap(s.seed).tiles, o = omrade(s), sh = strandNu(s);
    // byggs ut: en brygga som är kortare än högst
    for (const q of bitsOf(s)) if (q.m === 'brygga' && q.b >= 1) for (const [dx, dy] of GRANNAR4) {
      const x = q.x + dx, y = q.y + dy, bak = bitAt(s, q.x - dx, q.y - dy);
      if (!inMap(x, y) || m[y * W + x] !== T.Vatten || gridOf(s).at.has(y * W + x) || bak?.m !== 'brygga') continue;
      let n = 1, kx = q.x - dx, ky = q.y - dy;
      while (bitAt(s, kx, ky)?.m === 'brygga') { n++; kx -= dx; ky -= dy; }
      if (n < PLAN.bryggaMax) { const ritning = [{ x, y, m: 'brygga' }]; return [{ at: 'bryggaA', x: 0, y: 0, w: 0, h: 0, ritning, oppnas: [], kostnad: ritningKostnad(ritning), varde: PLAN.forbBrygga, plats: 0 }]; }
    }
    let bast: Andring[] | undefined, bd = Infinity;
    for (let i = 0; i < W * H; i++) {
      if (!sh[i] || m[i] === T.Vatten || gridOf(s).at.has(i)) continue;
      const x = i % W, y = Math.floor(i / W), d = Math.hypot(x - o.mitt.x, y - o.mitt.y);
      if (d >= bd) continue;
      for (const [dx, dy] of GRANNAR4) {
        if (!inMap(x + 2 * dx, y + 2 * dy) || m[(y + dy) * W + x + dx] !== T.Vatten || m[(y + 2 * dy) * W + x + 2 * dx] !== T.Vatten || gridOf(s).at.has((y + dy) * W + x + dx) || gridOf(s).at.has((y + 2 * dy) * W + x + 2 * dx)) continue;
        bd = d; bast = [{ x: x + dx, y: y + dy, m: 'brygga' }, { x: x + 2 * dx, y: y + 2 * dy, m: 'brygga' }];
        break;
      }
    }
    return bast ? [{ at: 'bryggaA', x: 0, y: 0, w: 0, h: 0, ritning: bast, oppnas: [], kostnad: ritningKostnad(bast), varde: PLAN.forbBrygga, plats: 0 }] : [];
  },
};
export const BYGGATGARDER = { stockvagA, infartA, bryggaA, skjulA, nyttHus, byggaUt, battreGolv, egetRum, rikUt, lagerStorreA, lagerNyA, kopaHus } satisfies Record<string, AtgardDef>;
export type Atgard = keyof typeof BYGGATGARDER;
const ATGARDER = BYGGATGARDER as Record<string, AtgardDef>;

// ---------- kontrollen av ritningen (steg 7.2.4) ----------
// Varje ritning prövas av samma kontroll innan den godtas: husets regler (balanstal i HUS och BYGG), en ytterdörr, inget i vattnet,
// på elden eller där vattnet steg sist, inga väggar över en annan byggnad. Då kan en ny åtgärd i registret inte göra ett trasigt hus.
export function ritningOk(s: State, f: Forslag, okAt: (i: number) => boolean): boolean {
  if (f.at === 'lagerStorreA' || f.at === 'lagerNyA') return true;
  if (f.at === 'stockvagA' || f.at === 'bryggaA' || f.at === 'infartA') return f.ritning.length > 0;
  if (f.at === 'skjulA') return f.ritning.length >= 4 && f.ritning.every(q => MATERIAL[q.m]);
  const iw = f.w - 2, ih = f.h - 2;
  if (f.w && (Math.min(iw, ih) < HUS.minSida || Math.min(iw, ih) > HUS.maxSida || Math.max(iw, ih) > HUS.langSida * Math.min(iw, ih) || iw * ih > BYGG.maxInne)) return false;
  if (f.at === 'egetRum' || f.at === 'battreGolv' || f.at === 'kopaHus') return f.at === 'kopaHus' || f.ritning.every(a => MATERIAL[a.m]);
  if (!f.ritning.length || f.ritning.some(a => !MATERIAL[a.m] || !okAt(a.y * W + a.x))) return false;
  const dorrar = f.ritning.filter(a => a.m === 'oppning').length + (f.hus ? bitsOf(s).filter(b => b.hus === f.hus!.id && b.k === 'oppning' && !f.oppnas.some(a => a.x === b.x && a.y === b.y)).length : 0);
  return dorrar >= 1;
}
// huset är byggt så att man inte kan nå ett rum, eller någon står i en vägg (vakten i testerna, kor.ts)
export function husFel(s: State): string | undefined {
  const g = gridOf(s);
  for (const r of g.rooms) {
    if (r.hus === undefined || !r.tiles.length || r.open > 0) continue;
    if (housesOf(s).find(h => h.id === r.hus)?.ut) continue; // en utbyggnad pågår
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
  planLager(s);
  byplanNu(s);
  torgNu(s);
  husAffar(s);
  rivOmTomt(s);
  if (Math.floor(s.now / HOUR) % PLAN.varTim === 0) planBuild(s);
}
// lagret (steg 7.2.18): det som inte fått plats ligger bredvid. Byggplanen väger en större lagerplats mot en ny. Marken märks bara
// ut, så det behövs ingen byggare, och det väntar inte på annat bygge
export function planLager(s: State) {
  if (!overflow(s).some(a => villHaMer(s, a.k) && lagerFullt(s, a.k))) return;
  const u: ByggBehov = { fn: 'lagerplats', a: { v: 1, plats: 0 }, sc: 0 }, f = valj(s, u, () => true);
  if (f?.at === 'lagerNyA') { if (!lagerNy(s)) lagerStorre(s); } else if (!lagerStorre(s)) lagerNy(s);
}
// vems en ändring är (steg 7.2.17): byn eller en familj. Var och en har en pågående ändring i taget
const agareAv = (h: Hus) => h.ag ?? -1;
const upptagen = (s: State, ag: number) => housesOf(s).some(h => agareAv(h) === ag && (!h.klar || h.ut));
// den som planerar (by, namnet i loggen): ett familjehus av den skickligaste byggaren i familjen, annars av familjens ägare (finns
// hen inte kvar: byns skickligaste byggare); andra hus av byns skickligaste byggare. Det måste finnas en byggare i byn, men
// planeraren behöver inte själv kunna bygga väggar. Vem som sedan bygger väljs i val.ts (buildJob)
export function planBuild(s: State) {
  const ppl = living(s);
  if (!ppl.length) return;
  const byggare = ppl.filter(p => canBuildWalls(p, s)).sort((a, b) => (b.skill.hantverk + stat(b, 'intelligens', s.now) / BYGG.byggareInt) - (a.skill.hantverk + stat(a, 'intelligens', s.now) / BYGG.byggareInt));
  if (!byggare.length || s.now < (s.byggSok ?? 0)) return;
  const behov = byggbehov(s).filter(b => moget(s, b));
  // går det att bygga på rutan? Räknas först när sökningen frågar, och sparas under planeringen (steg 6.2.21). Elden flyttas bara om den kan tändas igen
  const utomElden = canLight(s), okMinne = new Int8Array(W * H).fill(-1);
  const okAt = (i: number) => (okMinne[i] < 0 ? okMinne[i] = tileOk(s, i % W, Math.floor(i / W), utomElden) ? 1 : 0 : okMinne[i]) === 1;
  // det mest akuta behovet för byn och för varje familj (steg 7.2.17), det första som går att göra något åt; är inget akut för byn, en förbättring
  const klara = new Set<number>();
  let inget = behov.length > 0;
  for (const u of behov) {
    const ag = u.a.ag ?? -1;
    if (klara.has(ag) || upptagen(s, ag) || s.husAffar?.ag === ag) continue; // den som väntar på att köpa ett hus bygger inget under tiden
    const bast = valj(s, u, okAt);
    if (!bast) continue;
    inget = false;
    klara.add(ag);
    utfor(s, bast, u, byggare, ppl);
    okMinne.fill(-1);
  }
  if (inget) s.byggSok = s.now + BYGG.omforsok * HOUR; // ingen plats nu: försök igen om ett tag
  if (!byggbehov(s).some(b => b.a.ag === undefined) && !upptagen(s, -1) && !bitsOf(s).some(b => b.forb) && !klara.has(-1)) {
    const u: ByggBehov = { fn: 'forbattra', a: { v: 1, plats: 0 }, sc: 0 }, f = valj(s, u, okAt);
    if (f) utfor(s, f, u, byggare, ppl);
  }
}
// förslaget med mest värde per kostnad; varje steg längre ner i ordningen kostar mer (Vägarna till mer plats)
function valj(s: State, u: ByggBehov, okAt: (i: number) => boolean) {
  let bast: Forslag | undefined, bs = -Infinity;
  for (const k of Object.keys(ATGARDER)) {
    const d = ATGARDER[k];
    for (const f of d.foresla(s, u, okAt).slice(0, PLAN.perBehov)) {
      if (!ritningOk(s, f, okAt)) continue;
      const sc = f.varde / (Math.max(PROJEKT_TAL.minKostnad, f.kostnad) * (1 + PLAN.stegPaslag * d.steg));
      if (sc > bs) { bs = sc; bast = f; }
    }
  }
  return bast;
}
function utfor(s: State, f: Forslag, u: ByggBehov, byggare: Person[], ppl: Person[]) {
  const fam = u.a.ag !== undefined ? familjOf(s, u.a.ag) : [], by = byggare.find(p => fam.includes(p)) ?? (fam.find(p => p.id === u.a.ag) ?? byggare[0] ?? ppl[0]);
  if (f.at === 'kopaHus') { s.husAffar = { hus: f.hus!.id, ag: u.a.ag!, t: s.now }; return; }
  if (f.at === 'stockvagA' || f.at === 'bryggaA' || f.at === 'infartA') {
    s.nextBit ??= 1;
    for (const a of f.ritning) bitsOf(s).push({ id: s.nextBit++, x: a.x, y: a.y, k: MATERIAL[a.m].k, m: a.m, b: 0, mat: 0, c: 1, forb: 1 });
    touch(s); count(s, 'planerad_' + f.at);
    if (forstaGang(s, f.at)) log(s, f.at === 'stockvagA' ? `${by.name} vill lägga en väg av stockar genom byn.` : f.at === 'infartA' ? `${by.name} vill dra en väg ut ur byn.` : `${by.name} vill bygga en brygga ut i vattnet.`, 'world', [by.id]);
    return;
  }
  if (f.at === 'byggaUt') return byggUt(s, f, by, u.fn === 'forbattra');
  if (f.at === 'battreGolv') { const b = bitAt(s, f.ritning[0].x, f.ritning[0].y)!; const M = MATERIAL[f.ritning[0].m]; b.m = f.ritning[0].m; b.k = M.k; b.b = 0; b.mat = 0; b.c = 1; b.forb = 1; touch(s); count(s, 'forbGolv'); log(s, `${by.name} vill lägga ett trägolv i ${f.hus!.namn.toLowerCase()}.`, 'world', [by.id]); return; }
  if (f.at === 'egetRum') {
    for (const a of f.ritning) { const b = bitAt(s, a.x, a.y)!, M = MATERIAL[a.m]; b.m = a.m; b.k = M.k; b.b = a.m === 'oppning' ? 1 : 0; b.mat = 0; b.c = 1; b.forb = 1; }
    touch(s); count(s, 'forbRum');
    log(s, `${by.name} vill dela upp ${f.hus!.namn.toLowerCase()}, så att familjen får ett eget rum.`, 'world', [by.id]);
    return;
  }
  bygg(s, f, u, by);
}
// ett nytt hus: ritningen blir bitar
function bygg(s: State, f: Forslag, u: ByggBehov, by: Person) {
  const row: Byggnad = BYGGNADER[u.fn as Fn], iw = f.w - 2, ih = f.h - 2, same = antalLika(s, u.fn as Fn, iw, ih);
  const hus: Hus = { id: (s.nextBit ??= 1), namn: row.namnFor!(s, iw, ih, same, u.a), x: f.x, y: f.y, w: f.w, h: f.h, fn: u.fn, slag: u.a.slag, ag: u.a.ag, ...(row.skjul ? { skjul: 1 as const } : {}) };
  s.nextBit++;
  for (const a of f.ritning) bitsOf(s).push({ id: s.nextBit++, x: a.x, y: a.y, k: MATERIAL[a.m].k, m: a.m, b: a.m === 'oppning' ? 1 : 0, mat: 0, c: 1, hus: hus.id });
  housesOf(s).push(hus); touch(s);
  if (f.ny) s.fire.flytt = { x: f.ny.x, y: f.ny.y, varfor: 'plats' };
  log(s, planText(by, u.fn as Fn, hus, iw * ih, same) + (f.ny ? ' Elden måste flyttas först.' : ''), 'world', [by.id]); count(s, 'planerat_' + u.fn);
  if (u.fn === 'sovsal' && iw * ih >= HUS.langhus) count(s, 'planerat_langhus'); // ett långhus (så ofta det händer, samhalle-192)
}
// en utbyggnad: den nya delen blir bitar i huset, och den gamla väggen öppnas när den är klar (slutUt i bygg.ts)
function byggUt(s: State, f: Forslag, by: Person, forb: boolean) {
  const h = f.hus!;
  s.nextBit ??= 1;
  for (const a of f.ritning) bitsOf(s).push({ id: s.nextBit++, x: a.x, y: a.y, k: MATERIAL[a.m].k, m: a.m, b: a.m === 'oppning' ? 1 : 0, mat: 0, c: 1, hus: h.id, ...(forb ? { forb: 1 as const } : {}) });
  h.ut = { x: f.x, y: f.y, w: f.w, h: f.h, oppnas: f.oppnas.map(a => [a.x, a.y, a.m]) };
  // en öppning i den gamla väggen redan nu, så att ingen blir instängd i den nya delen (den blir golv som resten sist)
  if (!f.ritning.some(a => a.m === 'oppning') && f.oppnas.length) {
    const q = f.oppnas[f.oppnas.length >> 1], b = bitAt(s, q.x, q.y);
    if (b && b.k === 'vagg') { const M = MATERIAL.oppning; b.m = 'oppning'; b.k = M.k; b.b = 1; b.c = 1; b.mat = 0; }
  }
  touch(s); count(s, 'planerat_ut');
  log(s, `${by.name} planerar att bygga ut ${h.namn.toLowerCase()} med ${f.ritning.filter(a => MATERIAL[a.m].k === 'golv').length} rutor.`, 'world', [by.id]);
}
// ---------- byns planering (steg 7.2.11–7.2.12) ----------
// Ledaren eller rådet sätter några tal i Byggplanen: husen i en ring kring mitten eller i rader längs gångstråken, tätt eller
// glest, och vilket golv man helst lägger. Byns seder och ledarens personlighet ger startvärdena, och talen följer dem. Husen är
// alltid rektanglar. Ligger i s.byplan så att gränssnittet kan visa dem
export interface Byplan { form: 'ring' | 'rader'; tat: number; golv: 'tra' | 'jord' }
export function byplanNu(s: State): Byplan {
  const led = ledareOf(s), v = s.seder?.v ?? ({} as Record<string, number>), egen = (k: 'empati' | 'mod' | 'nyfikenhet') => led ? (led.pot[k] - PLAN.potMitt) / PLAN.potMitt : 0;
  const tat = clamp((v.gemenskap ?? 0) * PLAN.tatSed + egen('empati') * PLAN.tatLedare, -1, 1);
  const form = (v.nyfikenhet ?? 0) + egen('nyfikenhet') > PLAN.raderFran ? 'rader' as const : 'ring' as const;
  const golv = (v.forsiktighet ?? 0) < PLAN.jordFran ? 'jord' as const : 'tra' as const;
  const ny: Byplan = { form, tat, golv };
  if (s.byplan?.form !== form || s.byplan?.golv !== golv) { if (s.byplan && led) log(s, `${led.name} vill att husen byggs ${form === 'ring' ? 'i en ring kring mitten' : 'i rader längs gångstråken'}.`, 'world', [led.id]); }
  return s.byplan = ny;
}
function planText(by: Person, fn: Fn, h: Hus, n: number, same: number) {
  if (fn === 'sovsal') return `${by.name} planerar ${n >= HUS.langhus ? 'ett långhus' : 'en hydda'}${same ? ' till' : ''} med plats för ${n} att sova under tak.`;
  if (fn === 'familjehus') return `${by.name} och familjen bestämmer sig för att bygga ett eget hus, ${h.namn.toLowerCase()}.`;
  return `${by.name} planerar ${h.namn.toLowerCase()}.`;
}

