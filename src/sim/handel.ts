import { DAY, H, HOUR, MIN, Person, SEC, State, T, Task, W } from './typer';
import { balans } from './balans';
import { ALDER, ageOf, alive, count, forstaGang, living, log, makeName } from './folk';
import { kronika } from './historik';
import { eldPlats, getMap } from './karta';
import { blocked } from './byggnad';
import { clamp, pick, rnd } from './slump';
import { iIstiden, ageIndex } from './tid';
import { grundvarde, rikedom } from './varde';
import { SAKER, isTool, viktOf } from './saker';
import { DELA, bynPart, bytaMed } from './behov';
import { Part, Vara } from './byte';
import { tingOf } from './agande';
import { ledareOf } from './styre';
import { kanterna } from './varg';

// ---------- handlarna (steg 4.4.1) ----------
// När byns rikedom (varde.ts) passerat en gräns (HANDEL.rik) kommer en handlare gående från kartans kant, ungefär en gång per
// tidsålder (HANDEL.dygn, en vecka i verkligheten) och oftare ju rikare byn är, men aldrig under istiden. Hen slår upp en
// filt nära elden (byte.ts) och lägger ut sina varor, stannar några timmar och går sedan tillbaka samma väg. Handlaren är
// ingen bybo: hen har ett namn, ett hem långt borta, sina varor och sitt silver, och sin egen utrustning, som inte väntar på
// byns tekniker (HANDLAR_UTR): en ryggsäck från början (en kärra när det finns vägar, fas 7, och packdjur, 11.4.1.2, kommer
// senare). Hen bär aldrig mer än utrustningen rymmer. Handeln själv är steg 4.4.1.3, färdigheten Handel 4.4.1.4.
export const HANDEL = balans('handel', {
  rik: 400, // byns rikedom (ungefär arbetstimmar) innan den första handlaren kommer
  dygn: 7, // en handlare kommer ungefär så här ofta (dygn: år i spelet) när byn är precis så rik, en tidsålder ...
  rikOftare: 0.5, // ... och oftare ju rikare byn är: dygn / (1 + rikOftare × (rikedomen / rik − 1)) ...
  dygnMin: 2, // ... men aldrig oftare än så här
  dygnMax: 14, // ... och aldrig mer sällan (en by som blivit fattigare)
  forsta: [0.2, 1], // den första kommer så här många dygn efter att byn blivit rik nog
  stannarTim: [6, 10], // timmar som handlaren stannar vid filten
  fart: 1.2, // rutor i sekunden när handlaren går (en bybo går 1,6 utan börda)
  avstand: 4, // filten ligger så här många rutor från elden
  vardeVaror: [25, 45], // grundvärdet av varorna hen har med sig (ungefär arbetstimmar)
  silver: [10, 30], // silvret hen har med sig (används i handeln, steg 4.4.1.3)
  fylla: 0.7, // packningen fylls till så här stor del av det utrustningen rymmer, så att hen kan köpa något
  handel: [6, 14], // handlarens färdighet i Handel (0–20, steg 4.4.1.4)
  vinst: 0.25, // handlaren värderar sina egna varor så mycket över grundvärdet, och det byn har gott om så mycket under (steg 4.4.1.3)
  hemPaslag: 0.5, // det som är sällsynt där handlaren kommer ifrån är värt så mycket mer för hen
  handlaMin: 20, // så många minuter tar byns handel vid filten
  ensamTim: 2, // har den som handlar för byn inte kommit på så många timmar, går en annan vuxen
  bytenMax: 8, // så många byten gör byn med handlaren på ett besök
});

// handlarens utrustning: det hen bär varorna i. Bara ryggsäcken nu; kärran (vägar, fas 7) och packdjuret (11.4.1.2) läggs till här
export const HANDLAR_UTR: Record<string, { namn: string; kg: number }> = {
  ryggsack: { namn: 'Ryggsäck', kg: 25 },
};

// varorna handlarna har med sig: slaget, hur många åt gången och hur ofta (vikt). Hela saker
export const HANDLARVAROR: { k: string; n: [number, number]; vikt: number }[] = [
  { k: 'flinta', n: [1, 3], vikt: 3 },
  { k: 'rep', n: [2, 5], vikt: 3 },
  { k: 'skinn', n: [1, 3], vikt: 2 },
  { k: 'vargskinn', n: [1, 2], vikt: 1 },
  { k: 'torrkott', n: [2, 5], vikt: 2 },
  { k: 'torrfisk', n: [2, 5], vikt: 2 },
  { k: 'ben', n: [2, 4], vikt: 1 },
  { k: 'rovfron', n: [2, 5], vikt: 1 },
  { k: 'artfron', n: [2, 5], vikt: 1 },
  { k: 'kniv', n: [1, 1], vikt: 2 },
  { k: 'yxa', n: [1, 1], vikt: 1 },
  { k: 'benflojt', n: [1, 1], vikt: 1 },
];
// var handlarna kommer ifrån, och vad som är sällsynt där (det är värt mer för handlaren, HANDEL.hemPaslag)
export const HEM: { namn: string; sallsynt: string[] }[] = [
  { namn: 'kusten i söder', sallsynt: ['skinn', 'vargskinn', 'ved'] },
  { namn: 'fjällen i norr', sallsynt: ['rovfron', 'artfron', 'bar'] },
  { namn: 'skogarna i öster', sallsynt: ['fisk', 'torrfisk', 'flinta'] },
  { namn: 'sjöarna i väster', sallsynt: ['flinta', 'sten', 'kott'] },
  { namn: 'älvdalen', sallsynt: ['skinn', 'ben', 'torrkott'] },
  { namn: 'byarna vid havet', sallsynt: ['ved', 'rep', 'torrkott'] },
];

export interface HVara { k: string; n: number; q?: number }
export interface Handlare {
  id: number; // negativt, så att det aldrig är en bybos id (en part i ett byte, byte.ts)
  namn: string; hem: string; sex: 'm' | 'k';
  x: number; y: number; mx: number; my: number; // var hen är och vart hen går
  fran: { x: number; y: number; t: number }; framme: number; // varifrån och när hen började gå, och när hen är framme (bilden ritar hen på vägen)
  fas: 'kommer' | 'handlar' | 'gar';
  kom: number; // när hen kom fram till filten
  gar: number; // när hen går hem igen
  ut: { x: number; y: number }; // där hen kom in på kartan och går ut igen
  utr: string; // utrustningen (HANDLAR_UTR)
  varor: HVara[];
  silver: number;
  handel: number; // färdigheten Handel
  bynKlar?: true; // byn har handlat med hen på det här besöket
}
export const handlareOf = (s: State) => s.handlare;
const mellan = (s: State, [a, b]: readonly [number, number] | number[]) => a + rnd(s, 'handel') * (b - a);
const heltMellan = (s: State, [a, b]: readonly [number, number] | number[]) => a + Math.floor(rnd(s, 'handel') * (b - a + 1));
export const kgOf = (v: HVara[]) => v.reduce((a, w) => a + w.n * viktOf(w.k), 0);
export const rymmer = (h: Handlare) => HANDLAR_UTR[h.utr]?.kg ?? 0;

// hur många dygn till nästa handlare, efter hur rik byn är nu
function intervall(s: State) {
  const r = rikedom(s) / HANDEL.rik;
  return clamp(HANDEL.dygn / Math.max(0.1, 1 + HANDEL.rikOftare * (r - 1)), HANDEL.dygnMin, HANDEL.dygnMax);
}

// varorna en handlare har med sig: dragna ur HANDLARVAROR tills de är värda nog eller packningen är full
function packa(s: State, kg: number): HVara[] {
  const mal = mellan(s, HANDEL.vardeVaror), ut: HVara[] = [];
  let varde = 0;
  for (let i = 0; i < 30 && varde < mal; i++) {
    const tot = HANDLARVAROR.reduce((a, v) => a + v.vikt, 0);
    let x = rnd(s, 'handel') * tot, rad = HANDLARVAROR[0];
    for (const v of HANDLARVAROR) { x -= v.vikt; if (x < 0) { rad = v; break; } }
    if (!SAKER[rad.k]) continue;
    const n = heltMellan(s, rad.n);
    if (kgOf(ut) + n * viktOf(rad.k) > kg * HANDEL.fylla) continue;
    const f = ut.find(w => w.k === rad.k && !SAKER[rad.k]!.redskap);
    if (f) f.n += n; else if (SAKER[rad.k]!.redskap) for (let j = 0; j < n; j++) ut.push({ k: rad.k, n: 1, q: 2 }); else ut.push({ k: rad.k, n });
    varde += n * grundvarde(rad.k);
  }
  return ut;
}

// en ruta för filten: så långt från elden, på torr mark och inte i ett hus
function filtPlats(s: State) {
  const e = eldPlats(s), m = getMap(s.seed);
  for (let i = 0; i < 24; i++) {
    const v = rnd(s, 'handel') * Math.PI * 2, x = Math.round(e.x + Math.cos(v) * HANDEL.avstand), y = Math.round(e.y + Math.sin(v) * HANDEL.avstand);
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || m.tiles[y * W + x] === T.Vatten || blocked(s, x, y)) continue;
    return { x: x + 0.5, y: y + 0.5 };
  }
  return { x: e.x + 0.5, y: e.y + 2.5 };
}

// en handlare kommer in från kanten närmast byn (en av de två närmaste, slumpat), på land
function kommer(s: State) {
  const e = eldPlats(s), m = getMap(s.seed), mal = filtPlats(s);
  const k = kanterna(e.x, e.y).filter(p => m.tiles[Math.floor(p.y) * W + Math.floor(p.x)] !== T.Vatten);
  const ut = k.length ? k[Math.floor(rnd(s, 'handel') * Math.min(2, k.length))] : { x: 0.5, y: e.y + 0.5 };
  const sex = rnd(s, 'handel') < 0.5 ? 'm' : 'k', utr = 'ryggsack';
  const nr = s.handlarNr = (s.handlarNr ?? 0) + 1;
  const h: Handlare = {
    id: -nr, namn: makeName(s, sex, 'handel'), hem: pick(s, HEM, 'handel').namn, sex, x: ut.x, y: ut.y, mx: mal.x, my: mal.y, fran: { x: ut.x, y: ut.y, t: s.now }, framme: s.now + Math.hypot(mal.x - ut.x, mal.y - ut.y) / HANDEL.fart * SEC,
    fas: 'kommer', kom: 0, gar: 0, ut: { x: ut.x, y: ut.y }, utr, varor: [], silver: heltMellan(s, HANDEL.silver), handel: heltMellan(s, HANDEL.handel),
  };
  h.varor = packa(s, rymmer(h));
  s.handlare = h;
  count(s, 'handlare');
  log(s, `En handlare, ${h.namn} från ${h.hem}, kommer gående mot byn.`, 'world');
}

// framme: filten breds ut med varorna
function framme(s: State, h: Handlare) {
  h.fas = 'handlar'; h.kom = s.now; h.gar = s.now + mellan(s, HANDEL.stannarTim) * HOUR;
  h.x = h.mx; h.y = h.my;
  (s.filtar ??= []).push({ x: h.x + 1, y: h.y, slut: h.gar, varor: h.varor.map(w => ({ k: w.k, n: w.n, fran: h.id })), handlare: h.id });
  log(s, `${h.namn} har brett ut en filt nära elden och lagt fram sina varor.`, 'world');
  if (forstaGang(s, 'handlareFramme')) kronika(s, `Den första handlaren kom till byn: ${h.namn} från ${h.hem}, med ${HANDLAR_UTR[h.utr].namn.toLowerCase()}en full av varor.`, 'handel');
}

// handlaren går: filten plockas ihop och hen går tillbaka mot kanten
function gar(s: State, h: Handlare) {
  h.fas = 'gar'; h.mx = h.ut.x; h.my = h.ut.y; h.fran = { x: h.x, y: h.y, t: s.now }; h.framme = s.now + Math.hypot(h.mx - h.x, h.my - h.y) / HANDEL.fart * SEC;
  if (s.filtar) { s.filtar = s.filtar.filter(f => f.handlare !== h.id); if (!s.filtar.length) delete s.filtar; }
  log(s, `${h.namn} plockade ihop sin filt och gick hemåt.`, 'world');
}

// var handlaren är vid tiden t när hen går: rakt från där hen började mot målet (hen går runt det som är i vägen, men det
// syns inte i byn). Bilden frågar samma sak med sin tid
export function handlarPlats(h: Handlare, t: number) {
  if (h.fas === 'handlar') return { x: h.x, y: h.y };
  const f = clamp((t - h.fran.t) / Math.max(1, h.framme - h.fran.t), 0, 1);
  return { x: h.fran.x + (h.mx - h.fran.x) * f, y: h.fran.y + (h.my - h.fran.y) * f };
}
function gaSteg(s: State, h: Handlare) {
  const p = handlarPlats(h, s.now);
  h.x = p.x; h.y = p.y;
  return s.now >= h.framme;
}

// varje slag (steg.ts): handlaren kommer, handlar och går
export function handelSteg(s: State, dtSec: number) {
  const nyTimme = Math.floor(s.now / HOUR) !== Math.floor((s.now - dtSec * SEC) / HOUR);
  if (nyTimme && !s.handlare) {
    if (s.nastaHandlare === undefined) { if (rikedom(s) >= HANDEL.rik) s.nastaHandlare = s.now + mellan(s, HANDEL.forsta) * DAY; }
    else if (s.now >= s.nastaHandlare && !iIstiden(ageIndex(s))) kommer(s);
  }
  const h = s.handlare;
  if (!h) return;
  if (h.fas === 'kommer') { if (gaSteg(s, h)) framme(s, h); }
  else if (h.fas === 'handlar') { if (s.now >= h.gar) gar(s, h); }
  else if (gaSteg(s, h)) {
    s.handlare = undefined;
    s.nastaHandlare = s.now + intervall(s) * DAY * (0.7 + 0.6 * rnd(s, 'handel'));
  }
}

// ---------- handeln (steg 4.4.1.3) ----------
// Handeln är ett byte som alla andra (bytaMed i behov.ts): båda lägger fram varor, var och en värderar efter sitt eget behov,
// och silvret jämnar ut skillnaden (växeln). Handlaren går med på ojämna byten till sin fördel, aldrig till sin nackdel: hen
// värderar sina egna varor högre än grundvärdet (HANDEL.vinst), det byn har gott om lägre, och det som är sällsynt där hen
// kommer ifrån högre (HEM). Silvret är värt sitt grundvärde för alla. Hen köper aldrig mer än hen kan bära: när ryggsäcken är
// full tar hen bara emot silver, och då blir det vara mot vara eller silver. Byn handlar med det gemensamma förrådet genom
// ledaren (eller den äldsta vuxna), en gång per besök: först säljer byn det den har gott om, sedan köper den det den saknar.
// Byborna handlar med sina egna saker i steg 4.4.1.5, färdigheten Handel kommer i steg 4.4.1.4
const hemOf = (h: Handlare) => HEM.find(x => x.namn === h.hem);
export const ledigt = (h: Handlare) => rymmer(h) - kgOf(h.varor);
// hur mycket handlaren värderar en till av slaget k, gånger grundvärdet
export function handlarVarde(s: State, h: Handlare, k: string) {
  if (k === 'silver') return 1;
  if (h.varor.some(w => w.k === k)) return 1 + HANDEL.vinst;
  if (ledigt(h) < viktOf(k)) return 0; // ryggsäcken är full
  const gott = bynPart(s, h.x, h.y).varde(k) <= DELA.over; // byn har gott om det
  return (gott ? 1 - HANDEL.vinst : 1) * (hemOf(h)?.sallsynt.includes(k) ? 1 + HANDEL.hemPaslag : 1);
}
function taBort(h: Handlare, w: Vara) {
  if (isTool(w.k)) { const i = h.varor.findIndex(x => x.k === w.k && (w.q === undefined || x.q === w.q)); if (i >= 0) h.varor.splice(i, 1); return; }
  const f = h.varor.find(x => x.k === w.k);
  if (f) { f.n -= w.n; if (f.n <= 0) h.varor.splice(h.varor.indexOf(f), 1); }
}
// handlaren som part i ett byte (byte.ts)
export function handlarPart(s: State, h: Handlare): Part {
  return {
    id: h.id, namn: h.namn, x: h.x, y: h.y,
    varde: k => handlarVarde(s, h, k),
    over: utom => [...h.varor.filter(w => !utom.includes(w.k)).map(w => ({ k: w.k, n: w.n, q: w.q })), ...(h.silver >= 1 && !utom.includes('silver') ? [{ k: 'silver', n: h.silver }] : [])],
    lamna: w => { if (w.k === 'silver') h.silver -= w.n; else taBort(h, w); return w; },
    ta: w => {
      if (w.k === 'silver') { h.silver += w.n; return; }
      if (isTool(w.k)) { const q = w.t?.q ?? w.q; if (w.t) s.ting = tingOf(s).filter(t => t !== w.t); for (let i = 0; i < (w.t ? 1 : w.n); i++) h.varor.push({ k: w.k, n: 1, q }); return; }
      const f = h.varor.find(x => x.k === w.k);
      if (f) f.n += w.n; else h.varor.push({ k: w.k, n: w.n });
    },
    rymmer: () => ledigt(h),
  };
}
// filten visar det handlaren har nu
function visaVaror(s: State, h: Handlare) {
  const f = s.filtar?.find(x => x.handlare === h.id);
  if (f) f.varor = h.varor.map(w => ({ k: w.k, n: w.n, fran: h.id }));
}
// den som handlar för byn: ledaren, annars den äldsta vuxna
function forByn(s: State): Person | undefined {
  const l = ledareOf(s);
  if (l) return l;
  let b: Person | undefined;
  for (const q of living(s)) if (ageOf(q, s.now) >= ALDER.vuxen && (!b || ageOf(q, s.now) > ageOf(b, s.now))) b = q;
  return b;
}
// valet på dagen (day i val.ts): den som handlar för byn går till filten. Kommer hen inte, går en annan vuxen efter ett tag
export function handlaVal(s: State, p: Person): { why: string; spot: { x: number; y: number }; dur: number; ref: number } | undefined {
  const h = s.handlare;
  if (!h || h.fas !== 'handlar' || h.bynKlar || ageOf(p, s.now) < ALDER.vuxen) return undefined;
  if (s.people.some(q => q !== p && alive(q) && q.task?.act === 'handla' && q.task.ref === h.id)) return undefined;
  if (p !== forByn(s) && s.now < h.kom + HANDEL.ensamTim * HOUR) return undefined;
  return { why: `Handlar för byn med ${h.namn}`, spot: { x: h.x - 1, y: h.y + 0.6 }, dur: HANDEL.handlaMin * MIN, ref: h.id };
}
// handeln är klar (KLAR i steg.ts): byn säljer det den har gott om och köper det den saknar
export function handlaKlar(s: State, p: Person, t: Task) {
  const h = s.handlare;
  if (!h || h.id !== t.ref || h.fas !== 'handlar' || h.bynKlar) return;
  h.bynKlar = true;
  const B = bynPart(s, p.x, p.y), H_ = handlarPart(s, h);
  B.namn = `${p.name} för byn`;
  let n = 0;
  for (const w of B.over(['silver'])) { // byn säljer: handlaren köper det hen kan bära och tjänar på
    if (n >= HANDEL.bytenMax) break;
    const m = Math.min(w.n, Math.floor(ledigt(h) / viktOf(w.k) + 1e-9)), v = H_.varde(w.k);
    if (m < 1 || v <= 0) continue;
    if (bytaMed(s, H_, B, [{ k: w.k, n: m }], { behov: v, minst: 1, fara: 0, typ: 'handel', utom: [w.k], delad: true }) > 0) n++;
  }
  for (const w of [...h.varor]) { // byn köper det den saknar
    if (n >= HANDEL.bytenMax) break;
    if (!h.varor.includes(w) || B.varde(w.k) < DELA.saknar) continue;
    if (bytaMed(s, B, H_, [{ k: w.k, n: w.n, q: w.q }], { behov: B.varde(w.k), minst: 1, fara: 0, typ: 'handel', utom: [w.k], delad: true }) > 0) n++;
  }
  count(s, 'handelBesok');
  if (n) count(s, 'handelByten', n);
  visaVaror(s, h);
}
