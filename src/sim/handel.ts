import { DAY, H, HOUR, SEC, State, T, W } from './typer';
import { balans } from './balans';
import { count, forstaGang, log, makeName } from './folk';
import { kronika } from './historik';
import { eldPlats, getMap } from './karta';
import { blocked } from './byggnad';
import { clamp, pick, rnd } from './slump';
import { iIstiden, ageIndex } from './tid';
import { grundvarde, rikedom } from './varde';
import { SAKER, viktOf } from './saker';
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
// var handlarna kommer ifrån
const HEM = ['kusten i söder', 'fjällen i norr', 'skogarna i öster', 'sjöarna i väster', 'älvdalen', 'byarna vid havet'];

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
    id: -nr, namn: makeName(s, sex, 'handel'), hem: pick(s, HEM, 'handel'), sex, x: ut.x, y: ut.y, mx: mal.x, my: mal.y, fran: { x: ut.x, y: ut.y, t: s.now }, framme: s.now + Math.hypot(mal.x - ut.x, mal.y - ut.y) / HANDEL.fart * SEC,
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
