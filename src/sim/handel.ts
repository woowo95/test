import { ByteMinne, DAY, H, HOUR, MIN, Person, SEC, State, T, Task, W, inMap } from './typer';
import { balans } from './balans';
import { ALDER, ageOf, alive, byId, count, forstaGang, living, log, stat, think } from './folk';
import { SAMTAL, TalkEvent, isSocial } from './samtal';
import { kronika } from './historik';
import { eldPlats, getMap, vaderstreck } from './karta';
import { bitAt, freeNear } from './byggnad';
import { ledig } from './stationer';
import { clamp, rnd } from './slump';
import { iIstiden, ageIndex, hourOf } from './tid';
import { grundvarde, rikedom } from './varde';
import { SAKER, isTool, viktOf } from './saker';
import { DELA, behovAv, bynPart, bytaMed, personPart } from './behov';
import { BYTE, BYTESPRIS, FILT_MOT, Part, Vara, filtMot, nyttPar, satPersonFlytt, vidByte, vidLura, varorText } from './byte';
import { newTing, tingOf } from './agande';
import { knows } from './teknik';
import { put, use } from './lager';
import { ledareOf } from './styre';
import { kanterna } from './varg';
import { KLAN, andraInst, handlarKlan, klanById, klanerOf } from './klaner';

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
  // kvällsmarknaden (steg 4.5.4.11): filten läggs ut på kvällen, efter arbetet, och handlaren går på morgonen (klockslag). Den
  // som kommer fram efter sentKvall, på natten eller på dagen väntar vid filtens plats till nästa kväll
  kvall: 19, sentKvall: 23, morgon: 7,
  fart: 1.2, // rutor i sekunden när handlaren går (en bybo går 1,6 utan börda)
  avstand: 4, // filten ligger så här många rutor från elden ...
  letaLangre: 8, // ... eller upp till så många rutor längre bort, om det inte finns fri mark där (steg 4.5.7.3)
  vardeVaror: [25, 45], // grundvärdet av varorna hen har med sig (ungefär arbetstimmar)
  silver: [10, 30], // silvret hen har med sig (används i handeln, steg 4.4.1.3)
  fylla: 0.7, // packningen fylls till så här stor del av det utrustningen rymmer, så att hen kan köpa något
  handel: [6, 14], // handlarens färdighet i Handel (0–20, steg 4.4.1.4)
  vinst: 0.25, // handlaren värderar sina egna varor så mycket över grundvärdet, och det byn har gott om så mycket under (steg 4.4.1.3)
  hemPaslag: 0.5, // det som är sällsynt där handlaren kommer ifrån är värt så mycket mer för hen
  handlaMin: 20, // så många minuter tar byns handel vid filten
  ensamTim: 2, // har den som handlar för byn inte kommit på så många timmar, går en annan vuxen
  bytenMax: 8, // så många byten gör byn med handlaren på ett besök
  egenMin: 10, // så många minuter tar en bybos handel med sina egna saker (steg 4.4.1.5) ...
  egnaMax: 3, // ... och så många byten högst
  koMin: 10, // den som står i kö tittar efter så här många minuter om det är hens tur
  koAvstand: 0.7, // rutor mellan dem som står i kön
  nytta: 1, // en bybo vill köpa det hen värderar så här högt (behovAv: 1 = har nytta av, DELA.saknar = saknar) eller mer
  salja: 6, // en bybo går till handlaren för att sälja det hen har över av ett slag om det är värt så mycket silver för handlaren (steg 4.5.4.14)
  // småpratet med handlaren (steg 4.5.4.15): den som är nära (SAMTAL.radie) och gör något socialt eller handlar pratar med hen
  // ungefär en gång per pratSek sekunder. Det går bra (samma uträkning som för ett samtal med en bybo, med hens Handel som
  // charm) och ger en glad tanke på pratTanke i pratTim timmar, eller går dåligt och ger en lika ledsen. Inget annat
  pratSek: 1200,
  pratTanke: 0.04,
  pratTim: 3,
  tomTanke: -0.05, // den som gick tomhänt från handlaren ...
  tomTim: 6, // ... i så många timmar
  minnas: 20, // så många byten minns handlarens inforuta
  redskapHopp: 0.1, // ett köpt redskap byn inte kan göra tar ägaren så långt mot tekniken, en gång per teknik (steg 4.5.4.16)
});

// handlarens utrustning: det hen bär varorna i. Bara ryggsäcken nu; kärran (vägar, fas 7) och packdjuret (11.4.1.2) läggs till här
export const HANDLAR_UTR: Record<string, { namn: string; kg: number }> = {
  ryggsack: { namn: 'Ryggsäck', kg: 25 },
};

// sorterna av handlare (steg 4.5.4.16): vilken som kommer styrs av hur rik byn är (rik = gånger HANDEL.rik), inte av byns
// tekniker; finns flera som byn är rik nog för väljs en på måfå. Sorten bestämmer utrustningen (HANDLAR_UTR) och varorna
// (kolumnen sort i HANDLARVAROR). I dag finns bara den vandrande med ryggsäck; den med bärdjur (steg 11.4.1.2) och med kärra
// (vägarna, fas 7) läggs till här, med sina finare varor i HANDLARVAROR
export const HANDLARSORTER: Record<string, { namn: string; utr: string; rik: number }> = {
  vandrande: { namn: 'Vandrande handlare', utr: 'ryggsack', rik: 0 },
};
const V = ['vandrande']; // de sorter av handlare som kan ha varan
// varorna handlarna har med sig: slaget, hur många åt gången, hur ofta (vikt) och vilka sorter av handlare som kan ha dem. Hela saker
export const HANDLARVAROR: { k: string; n: [number, number]; vikt: number; sort: readonly string[] }[] = [
  { k: 'flinta', n: [1, 3], vikt: 3, sort: V },
  { k: 'rep', n: [2, 5], vikt: 3, sort: V },
  { k: 'skinn', n: [1, 3], vikt: 2, sort: V },
  { k: 'vargskinn', n: [1, 2], vikt: 1, sort: V },
  { k: 'torrkott', n: [2, 5], vikt: 2, sort: V },
  { k: 'torrfisk', n: [2, 5], vikt: 2, sort: V },
  { k: 'ben', n: [2, 4], vikt: 1, sort: V },
  { k: 'rovfron', n: [2, 5], vikt: 1, sort: V },
  { k: 'artfron', n: [2, 5], vikt: 1, sort: V },
  { k: 'kniv', n: [1, 1], vikt: 2, sort: V },
  { k: 'yxa', n: [1, 1], vikt: 1, sort: V },
  { k: 'benflojt', n: [1, 1], vikt: 1, sort: V },
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
  klan?: number; // grannklanen hen kommer ifrån (steg 4.4.3, klaner.ts)
  x: number; y: number; mx: number; my: number; // var hen är och vart hen går
  fran: { x: number; y: number; t: number }; framme: number; // varifrån och när hen började gå, och när hen är framme (bilden ritar hen på vägen)
  fas: 'kommer' | 'vantar' | 'handlar' | 'gar'; // vantar: framme, väntar på kvällen (steg 4.5.4.11)
  kvall?: number; // när hen lägger ut filten (vantar)
  kom: number; // när hen kom fram till filten
  gar: number; // när hen går hem igen
  ut: { x: number; y: number }; // där hen kom in på kartan och går ut igen
  utr: string; // utrustningen (HANDLAR_UTR)
  sort?: string; // vilken sorts handlare (HANDLARSORTER); saknas i sparade byar från före v270: vandrande
  varor: HVara[];
  silver: number;
  handel: number; // färdigheten Handel
  bynKlar?: true; // byn har handlat med hen på det här besöket
  ko?: number[]; // byborna som står i kö vid filten, först till kvarn (steg 4.4.1.5)
  handlat?: number[]; // de som handlat med hen på det här besöket
  bytt?: { vem: string; fick: string; gav: string; m?: ByteMinne }[]; // bytena under besöket, för inforutan (m = hela bytet, steg 4.5.4.17)
}
export const handlareOf = (s: State) => s.handlare;
// vad handlaren gör just nu (inforutan)
export const handlarFas = (h: Handlare) => h.fas === 'kommer' ? 'På väg till byn' : h.fas === 'vantar' ? 'Väntar på kvällen' : h.fas === 'handlar' ? 'Vid filten' : 'På väg hem';
const mellan = (s: State, [a, b]: readonly [number, number] | number[]) => a + rnd(s, 'handel') * (b - a);
const heltMellan = (s: State, [a, b]: readonly [number, number] | number[]) => a + Math.floor(rnd(s, 'handel') * (b - a + 1));
export const kgOf = (v: HVara[]) => v.reduce((a, w) => a + w.n * viktOf(w.k), 0);
export const rymmer = (h: Handlare) => HANDLAR_UTR[h.utr]?.kg ?? 0;

// hur många dygn till nästa handlare, efter hur rik byn är nu
function intervall(s: State) {
  const r = rikedom(s) / HANDEL.rik;
  return clamp(HANDEL.dygn / Math.max(0.1, 1 + HANDEL.rikOftare * (r - 1)), HANDEL.dygnMin, HANDEL.dygnMax);
}

// vilken sorts handlare som kommer: en av dem byn är rik nog för (bara en finns i dag, och då dras ingen slump)
function sortFor(s: State) {
  const r = rikedom(s) / HANDEL.rik, kan = Object.keys(HANDLARSORTER).filter(k => HANDLARSORTER[k].rik <= r);
  return kan.length > 1 ? kan[Math.floor(rnd(s, 'handel') * kan.length)] : kan[0] ?? 'vandrande';
}
// varorna en handlare har med sig: dragna ur HANDLARVAROR tills de är värda nog eller packningen är full
function packa(s: State, kg: number, sort: string): HVara[] {
  const mal = mellan(s, HANDEL.vardeVaror), ut: HVara[] = [], rader = HANDLARVAROR.filter(v => v.sort.includes(sort));
  let varde = 0;
  for (let i = 0; i < 30 && varde < mal; i++) {
    const tot = rader.reduce((a, v) => a + v.vikt, 0);
    let x = rnd(s, 'handel') * tot, rad = rader[0];
    for (const v of rader) { x -= v.vikt; if (x < 0) { rad = v; break; } }
    if (!SAKER[rad.k]) continue;
    const n = heltMellan(s, rad.n);
    if (kgOf(ut) + n * viktOf(rad.k) > kg * HANDEL.fylla) continue;
    const f = ut.find(w => w.k === rad.k && !SAKER[rad.k]!.redskap);
    if (f) f.n += n; else if (SAKER[rad.k]!.redskap) for (let j = 0; j < n; j++) ut.push({ k: rad.k, n: 1, q: 2 }); else ut.push({ k: rad.k, n });
    varde += n * grundvarde(rad.k);
  }
  return ut;
}

// platsen för handeln (steg 4.5.7.3): där handlaren står, med hens filt framför sig, bybons filt mitt emot och den som handlar
// bakom den (BYTE.bakom, FILT_MOT). Allt det ska ligga på fri mark: ingen byggnad, station, möbel, lagerplats, hög, fält, stock
// eller annan filt (ledig i stationer.ts), och ingen husvägg alldeles intill, så att stigen till en dörr är fri. Platsen ligger
// HANDEL.avstand rutor från elden, och finns ingen fri plats där letar den längre bort
const FILT_BRED = 1; // filten räcker så här många rutor åt var sida om mitten
export function handelFri(s: State, x: number, y: number) {
  const X = Math.floor(x), Y = Math.floor(y), djup = Math.ceil(BYTE.bakom * 2 + FILT_MOT);
  for (let dy = -1; dy <= djup + 1; dy++) for (let dx = -FILT_BRED - 1; dx <= FILT_BRED + 1; dx++) {
    const tx = X + dx, ty = Y + dy, kant = dy < 0 || dy > djup || Math.abs(dx) > FILT_BRED;
    if (!inMap(tx, ty)) return false;
    if (kant ? !!bitAt(s, tx, ty) : !ledig(s, tx, ty)) return false;
  }
  return !(s.filtar ?? []).some(f => f.x > X - FILT_BRED - 2 && f.x < X + FILT_BRED + 3 && f.y > Y - 2 && f.y < Y + djup + 3);
}
function filtPlats(s: State) {
  const e = eldPlats(s);
  for (let r = HANDEL.avstand; r <= HANDEL.avstand + HANDEL.letaLangre; r++) for (let i = 0; i < 24; i++) {
    const v = rnd(s, 'handel') * Math.PI * 2, x = Math.round(e.x + Math.cos(v) * r), y = Math.round(e.y + Math.sin(v) * r);
    if (x < 2 || y < 2 || x >= W - 2 || y >= H - 6 || !handelFri(s, x, y)) continue;
    return { x: x + 0.5, y: y + 0.5 };
  }
  return freeNear(s, e.x + 0.5, e.y + 2.5);
}

// en handlare kommer in från kanten närmast byn (en av de två närmaste, slumpat), på land
function kommer(s: State, tvinga?: boolean) {
  const kh = handlarKlan(s, tvinga); // ingen klan som tycker om byn nog: ingen handlare den här gången
  if (!kh) return false;
  const e = eldPlats(s), m = getMap(s.seed), mal = filtPlats(s);
  const k = kanterna(e.x, e.y).filter(p => m.tiles[Math.floor(p.y) * W + Math.floor(p.x)] !== T.Vatten);
  const ut = k.length ? k[Math.floor(rnd(s, 'handel') * Math.min(2, k.length))] : { x: 0.5, y: e.y + 0.5 };
  const sex = kh.person.sex, sort = sortFor(s), utr = HANDLARSORTER[sort].utr;
  const nr = s.handlarNr = (s.handlarNr ?? 0) + 1;
  const h: Handlare = {
    id: -nr, namn: kh.person.namn, hem: kh.klan.hem, klan: kh.klan.id, sex, x: ut.x, y: ut.y, mx: mal.x, my: mal.y, fran: { x: ut.x, y: ut.y, t: s.now }, framme: s.now + Math.hypot(mal.x - ut.x, mal.y - ut.y) / HANDEL.fart * SEC,
    fas: 'kommer', kom: 0, gar: 0, ut: { x: ut.x, y: ut.y }, utr, varor: [], silver: heltMellan(s, HANDEL.silver), handel: heltMellan(s, HANDEL.handel),
  };
  h.sort = sort;
  h.varor = packa(s, rymmer(h), sort);
  s.handlare = h;
  count(s, 'handlare');
  log(s, `En handlare, ${h.namn} från ${kh.klan.namn} vid ${h.hem}, kommer gående mot byn.`, 'world');
  return true;
}

// testläget (steg 4.5.4.4): en handlare skickas till byn nu, från vilken grannklan som helst, och en rad i Händelser säger
// varifrån (steg 4.5.6.4). Svarar med raden, eller skälet till att ingen kan komma just nu (handlarHinder)
export const handlarHinder = (s: State) => s.handlare ? 'Det finns redan en handlare i byn' : !klanerOf(s).length ? 'Byn har inga grannklaner än' : undefined;
export function skickaHandlare(s: State): { ok: boolean; text: string } {
  const h = handlarHinder(s);
  if (h) return { ok: false, text: h };
  if (!kommer(s, true)) return { ok: false, text: 'Ingen handlare kunde komma' };
  const t = s.handlare!, text = `Testläget: handlaren ${t.namn} kommer från ${vaderstreck(s, t.x, t.y)}.`;
  log(s, text, 'world');
  return { ok: true, text };
}

// nästa gång klockan är kl (timmar), efter t
function nastaKl(t: number, kl: number) {
  const d = (kl - hourOf(t) + 24) % 24;
  return t + (d > 1 / 60 ? d : 24) * HOUR;
}
const kvallNu = (t: number) => hourOf(t) >= HANDEL.kvall && hourOf(t) < HANDEL.sentKvall;
// framme vid filtens plats: på kvällen breds filten ut, annars väntar hen på kvällen (steg 4.5.4.11)
function framme(s: State, h: Handlare) {
  h.x = h.mx; h.y = h.my;
  if (kvallNu(s.now)) { lagUt(s, h); return; }
  h.fas = 'vantar'; h.kvall = nastaKl(s.now, HANDEL.kvall);
  log(s, `${h.namn} har kommit fram och väntar på kvällen, när byn har arbetat klart.`, 'world');
}
// filten breds ut med varorna, och handlaren går på morgonen
function lagUt(s: State, h: Handlare) {
  h.fas = 'handlar'; h.kom = s.now; h.gar = nastaKl(s.now, HANDEL.morgon); h.kvall = undefined;
  (s.filtar ??= []).push({ x: h.x, y: h.y + BYTE.bakom, slut: h.gar, varor: h.varor.map(w => ({ k: w.k, n: w.n, fran: h.id })), handlare: h.id, vem: h.id, par: nyttPar(s) });
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
  if (h.fas === 'handlar' || h.fas === 'vantar') return { x: h.x, y: h.y };
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
    else if (s.now >= s.nastaHandlare && !iIstiden(ageIndex(s)) && !kommer(s)) s.nastaHandlare = s.now + intervall(s) * DAY;
  }
  const h = s.handlare;
  if (!h) return;
  if (h.fas === 'kommer') { if (gaSteg(s, h)) framme(s, h); }
  else if (h.fas === 'vantar') { if (s.now >= h.kvall!) lagUt(s, h); }
  else if (h.fas === 'handlar') { if (s.now >= h.gar) gar(s, h); else bybonsFilt(s, h); }
  else if (gaSteg(s, h)) {
    s.handlare = undefined;
    s.nastaHandlare = s.now + intervall(s) * DAY * (0.7 + 0.6 * rnd(s, 'handel'));
  }
}

// filtarna mitt emot varandra (steg 4.5.4.13): den som handlar med handlaren (för byn, eller den första i kön) lägger ut det
// hen kan erbjuda på en egen filt mitt emot handlarens, och plockar ihop den när hen handlat klart eller gått. Bara för bilden
const FILT_VAROR = 8; // så många slag av saker får plats på filten
function bybonsFilt(s: State, h: Handlare) {
  const hf = s.filtar?.find(f => f.handlare === h.id);
  if (!hf) return;
  if (hf.par === undefined) { hf.par = nyttPar(s); hf.vem = h.id; } // en sparad by från före v267
  const vid = (q?: Person) => !!q && alive(q) && q.task?.act === 'handla' && q.task.ref === h.id && q.task.phase === 'do';
  const p = !h.bynKlar ? s.people.find(vid) : vid(byId(s, h.ko?.[0])) ? byId(s, h.ko![0]) : undefined;
  const byn = !h.bynKlar, mot = filtMot(s, hf);
  if (mot) { if (mot.vem === p?.id && !!mot.byn === byn) return; s.filtar = s.filtar!.filter(f => f !== mot); }
  if (!p) return;
  const over = (byn ? bynPart(s, p.x, p.y, p) : bybonPart(s, p)).over(['silver']).slice(0, FILT_VAROR);
  s.filtar!.push({ x: hf.x, y: hf.y + FILT_MOT, slut: p.task!.until, varor: over.map(w => ({ k: w.k, n: w.t ? 1 : w.n, fran: p.id })), vem: p.id, par: hf.par, ...byn ? { byn: true as const } : {} });
}

// småprat med handlaren (steg 4.5.4.15): medan hen är i byn kan byborna som är nära småprata med hen, som med en bybo
// (samtalen i steg.ts, bubblan i ui/manniskor.ts), också de som inte handlar. Ingen kunskap eller information byts och
// relationerna ändras inte: samtalet påverkar bara humöret (en tanke). Kunskap om världen kommer i steg 11.1.4
export function pratMedHandlare(s: State, dtSec: number, events?: TalkEvent[]) {
  const h = s.handlare;
  if (!h || (h.fas !== 'vantar' && h.fas !== 'handlar')) return;
  for (const p of s.people) {
    if (!alive(p) || ageOf(p, s.now) < ALDER.smabarn || Math.hypot(p.x - h.x, p.y - h.y) >= SAMTAL.radie) continue;
    if (!isSocial(p) && !(p.task?.act === 'handla' && p.task.ref === h.id && p.task.phase === 'do')) continue;
    if (rnd(s, 'handel', p) >= dtSec / HANDEL.pratSek) continue;
    const out = (stat(p, 'empati', s.now) + h.handel) / SAMTAL.utEmpati - SAMTAL.utAvdrag + (rnd(s, 'handel', p) - 0.5) * SAMTAL.utBrus + (stat(p, 'karisma', s.now) - 8) / SAMTAL.charmDiv;
    think(p, out > 0 ? `Småpratade med ${h.namn}` : `Småpratet med ${h.namn} gick trögt`, out > 0 ? HANDEL.pratTanke : -HANDEL.pratTanke, s.now, HANDEL.pratTim * HOUR);
    events?.push({ a: p.id, b: h.id, kind: 'småprat', good: out > 0, t: s.now });
    count(s, 'handlarPrat');
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
    id: h.id, namn: h.namn, x: h.x, y: h.y, handel: h.handel,
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
// den som handlar för byn: ledaren, annars den vuxna som är skickligast i Handel (steg 4.4.1.4)
function forByn(s: State): Person | undefined {
  const l = ledareOf(s);
  if (l) return l;
  let b: Person | undefined;
  for (const q of living(s)) if (ageOf(q, s.now) >= ALDER.vuxen && (!b || q.skill.handel > b.skill.handel)) b = q;
  return b;
}
// ---------- byborna vid filten (steg 4.4.1.5) ----------
// Byn handlar först, genom den som handlar för byn. Sedan får byborna byta med sina egna saker: den som saknar något
// handlaren har och har något att betala med ställer sig i kö vid filten, och det går efter först till kvarn. Ingen tränger
// sig före (den som har nytta av något handlaren har och något över att betala med ställer sig i kön): den som står i kö tittar efter en stund om det är hens tur och flyttar fram när någon handlat klart. Det som en
// person köpt är borta för nästa, och den som går tomhänt blir lite sämre till mods. Handlaren minns bytena under besöket
// (inforutan) och krönikan skriver de stora (byteKlart i byte.ts)
// en bybo lämnar till handlaren och tar emot av hen (byte.ts frågar hit): sakerna tas ur och läggs i förrådet som hens
satPersonFlytt(
  (s, P, w) => { if (!w.t && P.p) use(s, undefined, w.k, w.n, false, P.p.id); return w; },
  (s, P, w) => {
    if (!P.p) return;
    if (w.t) { w.t.agare = P.p.id; w.t.hos = undefined; return; }
    if (isTool(w.k)) { for (let i = 0; i < w.n; i++) { const t = newTing(s, w.k, 1, P.p.id); if (w.q !== undefined) t.q = w.q; } return; }
    put(s, w.k, w.n, { [P.p.id]: w.n });
  },
);
// handlaren minns bytena under besöket
vidByte.push((s, m, g, fatt, betal, minne) => {
  const h = s.handlare;
  if (!h || (m.id !== h.id && g.id !== h.id)) return;
  const b = (h.bytt ??= []), kop = m.id === h.id; // kop = handlaren köpte
  b.push({ vem: kop ? g.namn : m.namn, fick: varorText(kop ? fatt : betal), gav: varorText(kop ? betal : fatt), m: minne });
  if (b.length > HANDEL.minnas) b.splice(0, b.length - HANDEL.minnas);
  const k = klanById(s, h.klan); // ett byte gör klanen lite vänligare (steg 4.4.3)
  if (k) andraInst(k, KLAN.handel);
});
// ett redskap köpt av handlaren som ingen i byn kan göra: ägaren kan använda det men inte göra eller laga ett, och kommer en bit
// närmare tekniken (HANDEL.redskapHopp), en gång per person och teknik (steg 4.5.4.16)
vidByte.push((s, m, g, fatt, betal) => {
  const h = s.handlare, p = !h ? undefined : g.id === h.id ? m.p : m.id === h.id ? g.p : undefined;
  if (!p) return;
  for (const w of g.id === h!.id ? fatt : betal) {
    const tek = isTool(w.k) ? SAKER[w.k]?.skaffa?.tek : undefined;
    if (!tek || knows(p, tek) || (p.hopp ??= []).includes(tek) || living(s).some(q => knows(q, tek))) continue;
    p.hopp!.push(tek);
    (p.tek ??= {})[tek] = Math.min(0.99, (p.tek[tek] ?? 0) + HANDEL.redskapHopp);
    count(s, 'redskapHopp');
  }
});
// märker handlaren att byn lurat hen, blir klanen mindre vänlig mot byn (byns anseende, steg 4.4.3)
vidLura.push((s, L, X) => {
  const h = s.handlare, k = klanById(s, h?.klan);
  if (!h || !k || X.id !== h.id || rnd(s, 'klan') >= KLAN.marka * h.handel) return;
  andraInst(k, -KLAN.lurad);
  count(s, 'klanLurad');
  log(s, `${h.namn} märkte att ${L.namn} hade lurat hen. ${k.namn} kommer att höra om det.`, 'world');
});
// bybon som part med handlaren: hen betalar också med sitt silver, och silvret är värt sitt grundvärde
const bybonPart = (s: State, p: Person): Part => ({ ...personPart(s, p, true), varde: k => k === 'silver' ? 1 : behovAv(s, p, k) });
// det p har nytta av av det handlaren har, det hen saknar först
const vill = (s: State, h: Handlare, p: Person) => h.varor.map(w => ({ w, v: behovAv(s, p, w.k) })).filter(x => x.v >= HANDEL.nytta).sort((a, b) => b.v - a.v).map(x => x.w);
// det p har mycket mer av än hen behöver och handlaren vill ha, för silver (steg 4.5.4.14): det p har över av ett slag (det hen
// inte behöver själv, payable i behov.ts) som är värt minst HANDEL.salja silver för handlaren, så mycket som hen kan bära
function salja(s: State, h: Handlare, p: Person) {
  const ut: Vara[] = [];
  let plats = ledigt(h);
  for (const w of bybonPart(s, p).over(['silver'])) {
    const v = handlarVarde(s, h, w.k), n = Math.min(w.n, Math.floor(plats / viktOf(w.k) + 1e-9));
    if (v <= 0 || n < 1 || n * grundvarde(w.k) * v < HANDEL.salja) continue;
    ut.push({ ...w, n }); plats -= n * viktOf(w.k);
  }
  return ut;
}
// gör p något vid filten just nu (bilden ritar pratbubblor med varorna): den som handlar, inte den som väntar i kön
export const handlarNu = (s: State, p: Person) => {
  const h = s.handlare, t = p.task;
  return !!h && t?.act === 'handla' && t.ref === h.id && t.phase === 'do' && (!h.bynKlar || h.ko?.[0] === p.id);
};
// var den som handlar står (steg 4.5.7.1): bakom bybons filt, som ligger mitt emot handlarens (FILT_MOT), på den sida som är
// längst från handlaren. Kön (i = platsen i kön, 1 = den första som väntar) står bakom hen, på en rad bort från filtarna
function kundPlats(s: State, h: Handlare, i = 0) {
  const hf = s.filtar?.find(f => f.handlare === h.id) ?? { x: h.x, y: h.y + BYTE.bakom };
  return { x: hf.x, y: hf.y + FILT_MOT + BYTE.bakom + i * HANDEL.koAvstand };
}
// valet på kvällen (night i val.ts, steg 4.5.4.11; och på dagen, day): den som handlar för byn går till filten. Kommer hen inte, går en annan vuxen efter ett tag.
// När byn handlat ställer sig den som vill byta med sina egna saker i kön
export function handlaVal(s: State, p: Person): { why: string; spot: { x: number; y: number }; dur: number; ref: number } | undefined {
  const h = s.handlare;
  if (!h || h.fas !== 'handlar' || ageOf(p, s.now) < ALDER.vuxen) return undefined;
  if (!h.bynKlar) {
    if (s.people.some(q => q !== p && alive(q) && q.task?.act === 'handla' && q.task.ref === h.id)) return undefined;
    if (p !== forByn(s) && s.now < h.kom + HANDEL.ensamTim * HOUR) return undefined;
    return { why: `Handlar för byn med ${h.namn}`, spot: kundPlats(s, h), dur: HANDEL.handlaMin * MIN, ref: h.id };
  }
  if (h.handlat?.includes(p.id)) return undefined;
  const ko = h.ko = (h.ko ?? []).filter(id => { const q = byId(s, id); return !!q && alive(q) && (q === p || (q.task?.act === 'handla' && q.task.ref === h.id)); });
  if (!ko.includes(p.id)) {
    // hen ställer sig i kön om det hen kan betala med räcker till en av varorna hen vill ha, för handlaren, eller om hen har
    // något att sälja (steg 4.5.4.14)
    const v = vill(s, h, p);
    const kan = v.length ? bybonPart(s, p).over([]).reduce((a, w) => a + w.n * grundvarde(w.k) * handlarVarde(s, h, w.k), 0) : 0;
    if (!(v.length && kan >= Math.min(...v.map(w => grundvarde(w.k) * handlarVarde(s, h, w.k)))) && !salja(s, h, p).length) return undefined;
    ko.push(p.id);
  }
  const i = ko.indexOf(p.id);
  return i === 0
    ? { why: `Handlar med ${h.namn}`, spot: kundPlats(s, h), dur: HANDEL.egenMin * MIN, ref: h.id }
    : { why: `Står i kö till ${h.namn}`, spot: kundPlats(s, h, i), dur: HANDEL.koMin * MIN, ref: h.id };
}
// handeln är klar (KLAR i steg.ts): byn säljer det den har gott om och köper det den saknar. En bybo köper det hen saknar
export function handlaKlar(s: State, p: Person, t: Task) {
  const h = s.handlare;
  if (!h || h.id !== t.ref || h.fas !== 'handlar') return;
  if (h.bynKlar) { egenHandel(s, h, p); return; }
  h.bynKlar = true;
  const B = bynPart(s, p.x, p.y, p), H_ = handlarPart(s, h);
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

// en bybo handlar med sina egna saker, när det är hens tur i kön
function egenHandel(s: State, h: Handlare, p: Person) {
  if (h.ko?.[0] !== p.id) return; // hen väntade bara i kön
  h.ko.shift();
  (h.handlat ??= []).push(p.id);
  const M = bybonPart(s, p), H_ = handlarPart(s, h);
  let n = 0;
  for (const w of vill(s, h, p)) {
    if (n >= HANDEL.egnaMax) break;
    if (!h.varor.includes(w)) continue;
    if (bytaMed(s, M, H_, [{ k: w.k, n: isTool(w.k) ? 1 : Math.min(w.n, 2), q: w.q }], { behov: M.varde(w.k), minst: 1, fara: 0, typ: 'handel', utom: [w.k], delad: true }) > 0) n++;
  }
  // ... och säljer det hen har mycket mer av än hen behöver, för silver som hen sparar (steg 4.5.4.14)
  for (const w of salja(s, h, p)) {
    if (n >= HANDEL.egnaMax) break;
    if (bytaMed(s, H_, M, [w], { behov: H_.varde(w.k), minst: 1, fara: 0, typ: 'handel', utom: [w.k], delad: true }) > 0) { n++; count(s, 'saltOver'); }
  }
  count(s, 'egenHandel');
  if (n) count(s, 'egnaByten', n);
  else { think(p, `Gick tomhänt från ${h.namn}`, HANDEL.tomTanke, s.now, HANDEL.tomTim * HOUR); count(s, 'tomhant'); }
  visaVaror(s, h);
}
// priserna i ett byte med handlaren (steg 4.5.4.17): det hen tar för sina varor och det hen ger för det en bybo säljer, som på filten
BYTESPRIS.push((s, fran, till, k) => {
  const h = s.handlare;
  if (!h || (fran.id !== h.id && till.id !== h.id) || k === 'silver') return;
  return grundvarde(k) * handlarVarde(s, h, k);
});
