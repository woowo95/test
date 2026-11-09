import { honom } from './ord';
import { bynsMitt, utanforByn } from './omrade';
import { ByteForsok, ByteMinne, DAY, H, HOUR, MIN, Person, SEC, State, T, Task, W, inMap } from './typer';
import { balans } from './balans';
import { ALDER, ageOf, alive, byId, count, forstaGang, living, log, stat, think } from './folk';
import { SAMTAL, TalkEvent, isSocial } from './samtal';
import { kronika } from './historik';
import { eldPlats, getMap, vaderstreck } from './karta';
import { bitAt, blocked, freeNear } from './byggnad';
import { ledig } from './stationer';
import { clamp, rnd } from './slump';
import { iIstiden, ageIndex, hourOf } from './tid';
import { grundvarde, rikedom } from './varde';
import { SAKER, isTool, viktOf } from './saker';
import { DELA, behovAv, betalVaror, betalaAv, bynPart, genomfor, luraI, personPart } from './behov';
import { BYTE, BYTESPRIS, FILT_MOT, Part, Vara, filtFri, filtMot, filtNara, loggaByte, nyttPar, satPersonFlytt, vardeOf, vidByte, vidLura, varorText } from './byte';
import { newTing, tingOf } from './agande';
import { knows } from './teknik';
import { dropSpot, put, stacksOf, use } from './lager';
import { sumOf } from './egendom';
import { ledareOf } from './styre';
import { kanterna } from './varg';
import { KLAN, KLAN_HEM, andraInst, handlarKlan, klanById, klanerOf } from './klaner';
import { foddNar, gastNyckel } from './gastliv';
import { affarMed, gastRel, gillar, glomIrritation, kravMax, kravRel, luradMed, nejTill } from './gastrel';
import { handelsArg } from './handelsber';
import { notis } from './notiser';
import { barSmitta } from './sjukdom';
import { gastGar, hp, nyGast } from './gast';

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
  avstand: 1, // filten ligger så här många rutor utanför byns område (utanforByn) ...
  letaLangre: 8, // ... eller upp till så många rutor längre bort, om det inte finns fri mark där (steg 4.5.7.3)
  vardeVaror: [25, 45], // grundvärdet av varorna hen har med sig (ungefär arbetstimmar)
  silver: [10, 30], // silvret hen har med sig (används i handeln, steg 4.4.1.3)
  fylla: 0.7, // packningen fylls till så här stor del av det utrustningen rymmer, så att hen kan köpa något
  handel: [6, 14], // handlarens färdighet i Handel (0–20, steg 4.4.1.4)
  vinst: 0.25, // handlaren värderar sina egna varor så mycket över grundvärdet, och det byn har gott om så mycket under (steg 4.4.1.3)
  hemPaslag: 0.5, // det som är sällsynt där handlaren kommer ifrån är värt så mycket mer för hen
  ensamTim: 2, // har den som handlar för byn inte kommit på så många timmar, går en annan vuxen
  egnaMax: 3, // en bybo vill köpa högst så många slag av saker i en affär (steg 4.4.1.5)
  // förhandlingen (steg 4.5.7.4): så många sekunder (spelets tid) tar det att fråga vad handlaren har, att plocka upp en sak
  // man hämtar, att argumentera för ett bud (mellan de två talen), att plocka upp det köpta och att lägga det man köpt hemma
  fragaSek: 10, hamtaSek: 20, budSek: [5, 10], plockaSek: 15, hemSek: 20,
  forstaBud: 0.7, // bybon bjuder först så här mycket av vad det hen vill ha är värt för handlaren ...
  // ... och höjer i lika steg efter varje nej, så att det sista budet är det mesta handlaren kan kräva (kravMax i gastrel.ts) ...
  nejMax: 3, // ... och ger upp efter så många nej i rad
  krav: 0.03, // handlaren går med på ett bud som är värt så här mycket mindre för hen per poäng bybon är skickligare i Handel ...
  kravMin: 0.7, // ... men aldrig under den här delen av det hen ger
  glomMin: 60, // har den som handlar inte varit vid affären på så många minuter är affären över
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
export const HANDLAR_UTR: Record<string, { namn: string; vikt: number }> = {
  ryggsack: { namn: 'Ryggsäck', vikt: 125 }, // i vikt (saker.ts, steg 6.1.8)
};

// varorna till handlaren (steg 6.2.11, "Arbetsordningen (Förbättra är aldrig tom)" i designdokumentet): det handlarna brukar
// köpa är det de köpte av byn och byborna på det senaste besök då slaget köptes (s.handlarKopt). Byn gör lika många, men
// aldrig fler än en ryggsäck har plats för när handlaren kommer (det som är kvar när packningen fyllts till HANDEL.fylla).
// 0 = handlarna brukar inte köpa det
export function handlarMal(s: State, k: string) {
  const n = s.handlarKopt?.[k] ?? 0;
  return n < 1 ? 0 : Math.min(n, Math.floor(HANDLAR_UTR.ryggsack.vikt * (1 - HANDEL.fylla) / viktOf(k) + 1e-9));
}

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
  { k: 'linfron', n: [2, 4], vikt: 1, sort: V }, // steg 7.7.7
  { k: 'artfron', n: [2, 5], vikt: 1, sort: V },
  { k: 'kniv', n: [1, 1], vikt: 2, sort: V },
  { k: 'yxa', n: [1, 1], vikt: 1, sort: V },
  { k: 'benflojt', n: [1, 1], vikt: 1, sort: V },
];
// var handlarna kommer ifrån, och vad som är sällsynt där (det är värt mer för handlaren, HANDEL.hemPaslag)
const SALLSYNT: Record<typeof KLAN_HEM[number], string[]> = {
  'kusten i söder': ['skinn', 'vargskinn', 'ved'],
  'fjällen i norr': ['rovfron', 'artfron', 'bar'],
  'skogarna i öster': ['fisk', 'torrfisk', 'flinta'],
  'sjöarna i väster': ['flinta', 'sten', 'kott'],
  'älvdalen': ['skinn', 'ben', 'torrkott'],
  'byarna vid havet': ['ved', 'rep', 'torrkott'],
};
const HEM = KLAN_HEM.map(namn => ({ namn, sallsynt: SALLSYNT[namn] })); // platserna står i klaner.ts

export interface HVara { k: string; n: number; q?: number }
export interface Handlare {
  id: number; // negativt, så att det aldrig är en bybos id (en part i ett byte, byte.ts); handlaren är personen med samma id i folket (steg 9.2.111, gast.ts): namnet, hemmet, klanen, kroppen, färdigheten Handel och var hen står
  mx: number; my: number; // vart hen går
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
  bynKlar?: true; // byn har handlat med hen på det här besöket
  affar?: Affar; // affären som pågår (steg 4.5.7.4): en kund i taget
  ko?: number[]; // byborna som står i kö vid filten, först till kvarn (steg 4.4.1.5), utan den som handlar nu
  handlat?: number[]; // de som handlat med hen på det här besöket
  kopt?: Record<string, number>; // det hen köpt av byn och byborna på det här besöket, per slag (steg 6.2.11)
  bytt?: { vem: string; fick: string; gav: string; m?: ByteMinne }[]; // bytena under besöket, för inforutan (m = hela bytet, steg 4.5.4.17)
}
// en affär med handlaren (steg 4.5.7.4): vem som handlar (en bybo, eller den som handlar för byn), hur långt den kommit,
// det hen vill få av handlaren (kop, som handlaren lägger på sin filt; silver när hen säljer), det hen bjuder (bud, på bybons
// filt), platserna hen hämtar budet från (hamta) och det hen redan lagt fram (framme), hur många nej det blivit, hur mycket
// av värdet hen bjuder nu (f), när någon senast var vid affären (t), hur länge budet tar (dur), när de blev överens (byt) och
// vart hen bär det köpta (hem)
export interface Affar {
  vem: number; namn: string; byn?: true;
  fas: 'fraga' | 'hamta' | 'bud' | 'plocka' | 'hem';
  kop: HVara[]; bud: Vara[]; salj?: true;
  hamta: { x: number; y: number; k: string[] }[]; framme: string[];
  nej: number; f: number; t: number; dur?: number; byt?: number; hem?: { x: number; y: number };
  forsok?: ByteForsok[]; rel0?: number; arg?: string[]; // buden, relationen före affären och argumenten (steg 5.4.6.1–5.4.6.2), för redogörelsen
}
// vad handlaren gör just nu (inforutan, steg 4.5.7.4)
export function handlarFas(h: Handlare) {
  if (h.fas !== 'handlar') return h.fas === 'kommer' ? 'På väg till byn' : h.fas === 'vantar' ? 'Väntar på kvällen' : 'På väg hem';
  const a = h.affar;
  return !a || a.fas === 'hem' ? 'Väntar på kunder' : a.fas === 'fraga' ? 'Lägger fram varor' : a.fas === 'hamta' ? `Väntar medan ${a.namn} hämtar varor` : a.fas === 'bud' ? `Förhandlar med ${a.namn}` : 'Packar ner';
}
const mellan = (s: State, [a, b]: readonly [number, number] | number[]) => a + rnd(s, 'handel') * (b - a);
const heltMellan = (s: State, [a, b]: readonly [number, number] | number[]) => a + Math.floor(rnd(s, 'handel') * (b - a + 1));
export const kgOf = (v: HVara[]) => v.reduce((a, w) => a + w.n * viktOf(w.k), 0);
export const rymmer = (h: Handlare) => HANDLAR_UTR[h.utr]?.vikt ?? 0;

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
    if (kant ? !!bitAt(s, tx, ty) : !ledig(s, tx, ty) || !filtFri(s, tx, ty)) return false; // (steg 9.2.44)
  }
  return !(s.filtar ?? []).some(f => f.x > X - FILT_BRED - 2 && f.x < X + FILT_BRED + 3 && f.y > Y - 2 && f.y < Y + djup + 3);
}
function filtPlats(s: State) {
  const e = eldPlats(s), m = bynsMitt(s);
  for (let r = 1; r <= W / 2; r++) for (let i = 0; i < 24; i++) {
    const v = rnd(s, 'handel') * Math.PI * 2, x = Math.round(m.x + Math.cos(v) * r), y = Math.round(m.y + Math.sin(v) * r);
    if (x < 2 || y < 2 || x >= W - 2 || y >= H - 6) continue;
    const ut = utanforByn(s, x, y);
    if (ut < HANDEL.avstand || ut > HANDEL.avstand + HANDEL.letaLangre || !handelFri(s, x, y)) continue;
    return { x: x + 0.5, y: y + 0.5 };
  }
  const f = freeNear(s, e.x + 0.5, e.y + 2.5), n = filtNara(s, f.x, f.y + BYTE.bakom, 0); // filten ligger fritt (steg 9.2.44)
  return { x: n.x, y: n.y - BYTE.bakom };
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
    id: -nr, mx: mal.x, my: mal.y, fran: { x: ut.x, y: ut.y, t: s.now }, framme: s.now + Math.hypot(mal.x - ut.x, mal.y - ut.y) / HANDEL.fart * SEC,
    fas: 'kommer', kom: 0, gar: 0, ut: { x: ut.x, y: ut.y }, utr, varor: [], silver: heltMellan(s, HANDEL.silver),
  };
  h.sort = sort;
  const nyckel = gastNyckel(kh.klan.id, kh.person.namn), fodd = kh.person.fodd ??= foddNar(s.seed, nyckel, 'handlare', s.now); // samma person varje gång, drar ingen slump
  // handlaren är en person bland folket (steg 9.2.111, gast.ts), med samma id som i bytena
  s.people.push(nyGast(s, { id: h.id, namn: kh.person.namn, sex, fodd, rad: { sort: 'handlare', klan: kh.klan.id, hem: kh.klan.hem }, x: ut.x, y: ut.y, nyckel, skill: { handel: heltMellan(s, HANDEL.handel) } }));
  h.varor = packa(s, rymmer(h), sort);
  const smitta = barSmitta(s); if (smitta) hp(s, h).smitta = smitta; // ibland bär hen en sjukdom utifrån (steg 9.5.5)
  s.handlare = h;
  count(s, 'handlare');
  log(s, `En handlare, ${hp(s, h).name} från ${kh.klan.namn} vid ${hp(s, h).gast!.hem!}, kommer gående mot byn.`, 'world');
  return true;
}

// testläget (steg 4.5.4.4): en handlare skickas till byn nu, från vilken grannklan som helst, och en rad i Händelser säger
// varifrån (steg 4.5.6.4). Svarar med raden, eller skälet till att ingen kan komma just nu (handlarHinder)
export const handlarHinder = (s: State) => s.handlare ? 'Det finns redan en handlare i byn' : !klanerOf(s).length ? 'Byn har inga grannklaner än' : undefined;
export function skickaHandlare(s: State): { ok: boolean; text: string } {
  const h = handlarHinder(s);
  if (h) return { ok: false, text: h };
  if (!kommer(s, true)) return { ok: false, text: 'Ingen handlare kunde komma' };
  const t = s.handlare!, text = `Testläget: handlaren ${hp(s, t).name} kommer från ${vaderstreck(s, hp(s, t).x, hp(s, t).y)}.`;
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
  hp(s, h).x = h.mx; hp(s, h).y = h.my;
  if (kvallNu(s.now)) { lagUt(s, h); return; }
  h.fas = 'vantar'; h.kvall = nastaKl(s.now, HANDEL.kvall);
  log(s, `${hp(s, h).name} har kommit fram och väntar på kvällen, när byn har arbetat klart.`, 'world');
}
// filten breds ut med varorna, och handlaren går på morgonen
function lagUt(s: State, h: Handlare) {
  h.fas = 'handlar'; h.kom = s.now; h.gar = nastaKl(s.now, HANDEL.morgon); h.kvall = undefined;
  (s.filtar ??= []).push({ x: hp(s, h).x, y: hp(s, h).y + BYTE.bakom, slut: h.gar, varor: [], handlare: h.id, vem: h.id, par: nyttPar(s) }); // varorna ligger kvar i packningen (steg 4.5.7.4)
  log(s, `${hp(s, h).name} har brett ut en filt nära elden och väntar på kunder.`, 'world'); notis(s, 'gast', `${hp(s, h).name} från ${hp(s, h).gast!.hem!} har brett ut en filt nära elden och väntar på kunder.`, [], { x: Math.floor(hp(s, h).x), y: Math.floor(hp(s, h).y) });
  if (forstaGang(s, 'handlareFramme')) kronika(s, `Den första handlaren kom till byn: ${hp(s, h).name} från ${hp(s, h).gast!.hem!}, med ${HANDLAR_UTR[h.utr].namn.toLowerCase()}en full av varor.`, 'handel');
}

// handlaren går: filten plockas ihop och hen går tillbaka mot kanten
function gar(s: State, h: Handlare, tyst = false) {
  packaIhop(s, h);
  h.fas = 'gar'; h.mx = h.ut.x; h.my = h.ut.y; h.fran = { x: hp(s, h).x, y: hp(s, h).y, t: s.now }; h.framme = s.now + Math.hypot(h.mx - hp(s, h).x, h.my - hp(s, h).y) / HANDEL.fart * SEC;
  if (!tyst) log(s, `${hp(s, h).name} plockade ihop sin filt och gick hemåt.`, 'world');
}
// affären som pågår slutar och filtarna plockas ihop
function packaIhop(s: State, h: Handlare) {
  glomIrritation(s, h);
  if (h.affar) { const p = byId(s, h.affar.vem); slut(s, h, h.affar, p && alive(p) ? p : undefined); } // en affär som pågår slutar
  if (h.kopt) s.handlarKopt = { ...s.handlarKopt, ...h.kopt }; // byn minns vad handlarna brukar köpa (steg 6.2.11)
  h.affar = undefined;
  const par = s.filtar?.find(f => f.handlare === h.id)?.par;
  if (s.filtar) { s.filtar = s.filtar.filter(f => f.handlare !== h.id && (par === undefined || f.par !== par)); if (!s.filtar.length) delete s.filtar; }
}
// tornadon (steg 6.4.12): handlaren drabbas som en bybo. Dör hen (dod) är hen och packningen borta, och filtarna plockas
// ihop. Annars flyger hen till platsen till, en del av varje vara i packningen går sönder (del, och r avgör hur en rest
// avrundas), och hen går hem
export function handlarTornado(s: State, h: Handlare, dod: boolean, del: number, r: number, till?: { x: number; y: number }) {
  if (dod) {
    packaIhop(s, h);
    const P = hp(s, h);
    gastGar(s, h.id); // hen och packningen är borta (steg 9.2.111)
    s.handlare = undefined;
    s.nastaHandlare = s.now + intervall(s) * DAY;
    log(s, `Handlaren ${P.name} från ${P.gast!.hem!} dog i tornadon.`, 'world');
    notis(s, 'gast', `Handlaren ${P.name} från ${P.gast!.hem!} dog i tornadon.`, [], { x: Math.floor(P.x), y: Math.floor(P.y) });
    return;
  }
  let sonder = 0;
  for (const w of h.varor) { const n = Math.min(w.n, Math.floor(w.n * del + r)); w.n -= n; sonder += n; }
  h.varor = h.varor.filter(w => w.n >= 1);
  if (till) { hp(s, h).x = till.x + 0.5; hp(s, h).y = till.y + 0.5; }
  gar(s, h, true);
  log(s, `Tornadon kastade handlaren ${hp(s, h).name} ${till ? 'en bit bort' : 'åt sidan'}${sonder ? ` och ${sonder} av varorna i packningen gick sönder` : ''}. Hen går hem.`, 'world');
}

// handlaren dog av svält, kyla eller sjukdom (gastvardag.ts, steg 9.2.113): packningen tas ihop, besöket tar slut och nästa
// handlare kommer en annan gång. Kroppen ligger kvar bland folket
export function handlarenDog(s: State, h: Handlare) {
  packaIhop(s, h);
  s.handlare = undefined;
  s.nastaHandlare = s.now + intervall(s) * DAY;
}

// var handlaren är vid tiden t när hen går: rakt från där hen började mot målet (hen går runt det som är i vägen, men det
// syns inte i byn). Bilden frågar samma sak med sin tid
export function handlarPlats(s: State, h: Handlare, t: number) {
  if (h.fas === 'handlar' || h.fas === 'vantar') return { x: hp(s, h).x, y: hp(s, h).y };
  const f = clamp((t - h.fran.t) / Math.max(1, h.framme - h.fran.t), 0, 1);
  return { x: h.fran.x + (h.mx - h.fran.x) * f, y: h.fran.y + (h.my - h.fran.y) * f };
}
function gaSteg(s: State, h: Handlare) {
  const p = handlarPlats(s, h, s.now);
  hp(s, h).x = p.x; hp(s, h).y = p.y;
  return s.now >= h.framme;
}

// varje slag (steg.ts): handlaren kommer, handlar och går
export function handelSteg(s: State, dtSec: number) {
  const nyTimme = Math.floor(s.now / HOUR) !== Math.floor((s.now - dtSec * SEC) / HOUR);
  if (nyTimme && !s.handlare) {
    if (s.nastaHandlare === undefined) { if (rikedom(s) >= HANDEL.rik) s.nastaHandlare = s.now + mellan(s, HANDEL.forsta) * DAY; }
    else if (s.now >= s.nastaHandlare && (!iIstiden(ageIndex(s)) || s.infart?.klar) && !kommer(s)) s.nastaHandlare = s.now + intervall(s) * DAY;
  }
  const h = s.handlare;
  if (!h) return;
  if (h.fas === 'kommer') { if (gaSteg(s, h)) framme(s, h); }
  else if (h.fas === 'vantar') { if (s.now >= h.kvall!) lagUt(s, h); }
  else if (h.fas === 'handlar') { if (s.now >= h.gar) gar(s, h); else { glomAffar(s, h); visaFiltar(s, h); } }
  else if (gaSteg(s, h)) {
    gastGar(s, h.id); // hen har lämnat kartan (steg 9.2.111); klanen minns hen (klaner.ts)
    s.handlare = undefined;
    s.nastaHandlare = s.now + intervall(s) * DAY * (0.7 + 0.6 * rnd(s, 'handel'));
  }
}

// filtarna mitt emot varandra (steg 4.5.4.13 och 4.5.7.4): handlaren lägger det kunden vill köpa på sin filt, och kunden lägger
// det hen hämtat till sitt bud på en egen filt mitt emot. När de är överens (byt) byter sakerna filt (ui/handel.ts), och när
// affären är klar är handlarens filt tom igen och kundens plockas ihop. Bara för bilden
export function visaFiltar(s: State, h: Handlare) {
  const hf = s.filtar?.find(f => f.handlare === h.id);
  if (!hf) return;
  if (hf.par === undefined) { hf.par = nyttPar(s); hf.vem = h.id; } // en sparad by från före v267
  const a = h.affar, lagt = !!a && a.fas !== 'fraga' && a.fas !== 'hem';
  hf.varor = lagt ? a.kop.map(w => ({ k: w.k, n: w.n, fran: h.id })) : [];
  hf.byt = lagt ? a.byt : undefined;
  let mot = filtMot(s, hf);
  if (mot && (!lagt || mot.vem !== a.vem)) { s.filtar = s.filtar!.filter(f => f !== mot); mot = undefined; }
  if (!lagt) return;
  const varor = a.bud.filter(w => a.framme.includes(w.k)).map(w => ({ k: w.k, n: w.t ? 1 : w.n, fran: a.vem }));
  if (!mot) s.filtar!.push(mot = { x: hf.x, y: hf.y + FILT_MOT, slut: h.gar, varor, vem: a.vem, par: hf.par, ...a.byn ? { byn: true as const } : {} });
  mot.varor = varor; mot.byt = a.byt;
}

// småprat med handlaren (steg 4.5.4.15): medan hen är i byn kan byborna som är nära småprata med hen, som med en bybo
// (samtalen i steg.ts, bubblan i ui/manniskor.ts), också de som inte handlar. Ingen kunskap eller information byts och
// relationerna ändras inte: samtalet påverkar bara humöret (en tanke). Kunskap om världen kommer i steg 11.1.4
export function pratMedHandlare(s: State, dtSec: number, events?: TalkEvent[]) {
  const h = s.handlare;
  if (!h || (h.fas !== 'vantar' && h.fas !== 'handlar')) return;
  for (const p of s.people) {
    if (!alive(p) || ageOf(p, s.now) < ALDER.smabarn || Math.hypot(p.x - hp(s, h).x, p.y - hp(s, h).y) >= SAMTAL.radie) continue;
    if (!isSocial(p) || h.affar) continue; // den som handlar och handlaren pratar bara om affären (steg 4.5.7.5)
    if (rnd(s, 'handel', p) >= dtSec / HANDEL.pratSek) continue;
    const out = (stat(p, 'empati', s.now) + hp(s, h).skill.handel) / SAMTAL.utEmpati - SAMTAL.utAvdrag + (rnd(s, 'handel', p) - 0.5) * SAMTAL.utBrus + (stat(p, 'karisma', s.now) - 8) / SAMTAL.charmDiv;
    think(p, out > 0 ? `Småpratade med ${hp(s, h).name}` : `Småpratet med ${hp(s, h).name} gick trögt`, out > 0 ? HANDEL.pratTanke : -HANDEL.pratTanke, s.now, HANDEL.pratTim * HOUR);
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
const hemOf = (s: State, h: Handlare) => HEM.find(x => x.namn === hp(s, h).gast!.hem!);
export const ledigt = (h: Handlare) => rymmer(h) - kgOf(h.varor);
// hur mycket handlaren värderar en till av slaget k, gånger grundvärdet
export function handlarVarde(s: State, h: Handlare, k: string) {
  if (k === 'silver') return 1;
  if (h.varor.some(w => w.k === k)) return 1 + HANDEL.vinst;
  if (ledigt(h) < viktOf(k)) return 0; // ryggsäcken är full
  const gott = bynPart(s, hp(s, h).x, hp(s, h).y).varde(k) <= DELA.over; // byn har gott om det
  return (gott ? 1 - HANDEL.vinst : 1) * (hemOf(s, h)?.sallsynt.includes(k) ? 1 + HANDEL.hemPaslag : 1);
}
function taBort(h: Handlare, w: Vara) {
  if (isTool(w.k)) { const i = h.varor.findIndex(x => x.k === w.k && (w.q === undefined || x.q === w.q)); if (i >= 0) h.varor.splice(i, 1); return; }
  const f = h.varor.find(x => x.k === w.k);
  if (f) { f.n -= w.n; if (f.n <= 0) h.varor.splice(h.varor.indexOf(f), 1); }
}
// handlaren som part i ett byte (byte.ts)
export function handlarPart(s: State, h: Handlare): Part {
  return {
    id: h.id, namn: hp(s, h).name, x: hp(s, h).x, y: hp(s, h).y, handel: hp(s, h).skill.handel,
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
    if (isTool(w.k)) { for (let i = 0; i < w.n; i++) { const t = newTing(s, w.k, 1, P.p.id); t.kopt = s.now; if (w.q !== undefined) t.q = w.q; } return; } // kopt: köpt (inforutan, steg 5.3.5.3)
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
  for (const w of kop ? fatt : betal) if (w.k !== 'silver') (h.kopt ??= {})[w.k] = (h.kopt[w.k] ?? 0) + (w.t ? 1 : w.n); // det handlaren köpte (steg 6.2.11)
  const k = klanById(s, hp(s, h).gast!.klan); // ett byte gör klanen lite vänligare (steg 4.4.3)
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
vidLura.push((s, L, X, markt) => {
  const h = s.handlare, k = h && klanById(s, hp(s, h).gast!.klan);
  if (h && L.id === h.id && markt && X.p) luradMed(s, h, X.p, false); // bybon minns att handlaren lurade hen (steg 4.5.7.11)
  if (!h || !k || X.id !== h.id || rnd(s, 'klan') >= KLAN.marka * hp(s, h).skill.handel) return;
  if (L.p) luradMed(s, h, L.p, true); // och handlaren att bybon lurade hen
  andraInst(k, -KLAN.lurad);
  count(s, 'klanLurad');
  log(s, `${hp(s, h).name} märkte att ${L.namn} hade lurat ${honom(hp(s, h))}. ${k.namn} kommer att höra om det.`, 'world');
});
// bybon som part med handlaren: hen betalar också med sitt silver, och silvret är värt sitt grundvärde
const bybonPart = (s: State, p: Person): Part => ({ ...personPart(s, p, true), varde: k => k === 'silver' ? 1 : behovAv(s, p, k) });
// det p har nytta av av det handlaren har, det hen saknar först
const vill = (s: State, h: Handlare, p: Person) => h.varor.map(w => ({ w, v: behovAv(s, p, w.k) })).filter(x => x.v >= HANDEL.nytta).sort((a, b) => b.v - a.v).map(x => x.w);
// det p har mycket mer av än hen behöver och handlaren vill ha, för silver (steg 4.5.4.14): det p har över av ett slag (det hen
// inte behöver själv, payable i behov.ts) som är värt minst HANDEL.salja silver för handlaren, så mycket som hen kan bära.
// Samma för byn (det byn har gott om), när den handlar (steg 4.5.7.4)
const salja = (s: State, h: Handlare, p: Person) => saljaAv(s, h, bybonPart(s, p));
function saljaAv(s: State, h: Handlare, M: Part) {
  const ut: Vara[] = [];
  let plats = ledigt(h);
  for (const w of M.over(['silver'])) {
    const v = handlarVarde(s, h, w.k), n = Math.min(w.n, Math.floor(plats / viktOf(w.k) + 1e-9));
    if (v <= 0 || n < 1 || n * grundvarde(w.k) * v < HANDEL.salja) continue;
    ut.push({ ...w, n }); plats -= n * viktOf(w.k);
  }
  return ut;
}
// pratar p med handlaren om affären just nu (bilden ritar pratbubblorna, ui/manniskor.ts, steg 4.5.7.4): när hen frågar vad
// handlaren har svarar handlaren med varornas symboler, och när hen bjuder visar hen sitt bud och handlaren det hen vill köpa
export function handlarNu(s: State, p: Person): { bybo: string[]; handlare: string[] } | undefined {
  const h = s.handlare, a = h?.affar, t = p.task;
  if (!h || !a || a.vem !== p.id || t?.act !== 'handla' || t.ref !== h.id || t.phase !== 'do') return undefined;
  if (a.fas === 'fraga') return { bybo: ['a_prata'], handlare: h.varor.map(w => w.k) };
  if (a.fas === 'bud') return { bybo: a.bud.map(w => w.k), handlare: a.kop.map(w => w.k) };
  return undefined;
}
// var den som handlar står (steg 4.5.7.1): bakom bybons filt, som ligger mitt emot handlarens (FILT_MOT), på den sida som är
// längst från handlaren. Kön (i = platsen i kön, 1 = den första som väntar) står bakom hen, på en rad bort från filtarna
function kundPlats(s: State, h: Handlare, i = 0) {
  const hf = s.filtar?.find(f => f.handlare === h.id) ?? { x: hp(s, h).x, y: hp(s, h).y + BYTE.bakom };
  const x = hf.x, y = hf.y + FILT_MOT + BYTE.bakom + i * HANDEL.koAvstand;
  if (inMap(x, y) && !blocked(s, x, y)) return { x, y };
  // kön når kartans kant, vatten eller en vägg: närmaste lediga ruta (vaktlarmet i by 777, där kön gick utanför kartan)
  const f = freeNear(s, Math.floor(x), Math.min(H - 1, Math.floor(y)));
  return { x: f.x + 0.5, y: f.y + 0.5 };
}

// ---------- förhandlingen (steg 4.5.7.4) ----------
// En kund i taget, och nästa i kön börjar först när den före är helt klar. Kunden går fram och frågar vad handlaren har
// (fraga), väljer det hen vill köpa (handlaren lägger det på sin filt) och gör ett bud som är en bra affär för hen själv. Hen
// hämtar det hen bjuder (hamta: från sina egna högar, och den som handlar för byn från förrådet) och lägger det på sin filt,
// och argumenterar för budet en kort stund (bud). Handlaren svarar bara ja eller nej. Vid ett nej lägger kunden till mer, eller
// tar bort det hen behöver minst om det skulle kosta mer än det är värt för hen, och efter HANDEL.nejMax nej i rad ger hen upp.
// Vid ett ja syns handslaget, sakerna byter filt och båda plockar upp det de fått (plocka), och kunden bär hem det köpta (hem).
// Har kunden inget att köpa men något över som handlaren vill ha, säljer hen det för silver på samma sätt
const nyAffar = (p: Person, byn: boolean, t: number): Affar => ({ vem: p.id, namn: p.name, ...byn ? { byn: true as const } : {}, fas: 'fraga', kop: [], bud: [], hamta: [], framme: [], nej: 0, f: HANDEL.forstaBud, t });
const kundPart = (s: State, a: Affar, p: Person) => a.byn ? bynPart(s, p.x, p.y, p) : bybonPart(s, p);
const vardFor = (v: Vara[], varde: (k: string) => number) => v.reduce((x, w) => x + w.n * vardeOf(w) * varde(w.k), 0);
// så stor del av det hen ger vill handlaren få för det: mindre ju skickligare kunden är i Handel än hen
const kravAv = (s: State, h: Handlare, M: Part) => clamp(1 - HANDEL.krav * ((M.handel ?? 0) - hp(s, h).skill.handel), HANDEL.kravMin, 1);
// budet: det kunden bjuder för det hen vill ha, värt a.f av det för handlaren (det hen har över som är värt mest för handlaren
// och minst för hen först, betalaAv i behov.ts). Kostar det kunden mer än det hen får är värt för hen, tar hen bort det hen
// behöver minst. När hen säljer ber hen om silver: mer än sakerna är värda för handlaren, mindre efter varje nej
function budNu(s: State, h: Handlare, a: Affar, M: Part) {
  const H_ = handlarPart(s, h);
  if (a.salj) {
    const n = Math.min(h.silver, Math.max(1, Math.round(vardFor(a.bud, H_.varde) * (2 - a.f))));
    a.kop = n >= 1 ? [{ k: 'silver', n }] : [];
    return n >= 1;
  }
  while (a.kop.length) {
    const ger = vardFor(a.kop, H_.varde), far = vardFor(a.kop, M.varde);
    const b = betalaAv(betalVaror(M, H_, a.kop.map(w => w.k)), H_, ger * a.f);
    if (b.betal.length && b.fick >= ger * a.f - 1e-9 && b.kost < far) { a.bud = b.betal; return true; }
    let i = 0;
    for (let j = 1; j < a.kop.length; j++) if (M.varde(a.kop[j].k) < M.varde(a.kop[i].k)) i = j;
    a.kop.splice(i, 1); // handlaren lägger tillbaka det i packningen
  }
  return false;
}
// kunden väljer: byn det den saknar, en bybo det hen har mest nytta av (högst HANDEL.egnaMax slag); annars säljer hen
function valj(s: State, h: Handlare, a: Affar, M: Part, p: Person) {
  a.kop = (a.byn ? h.varor.filter(w => M.varde(w.k) >= DELA.saknar) : vill(s, h, p).slice(0, HANDEL.egnaMax))
    .map(w => ({ k: w.k, n: isTool(w.k) ? 1 : a.byn ? w.n : Math.min(w.n, 2), q: w.q }));
  if (budNu(s, h, a, M)) return true;
  const sal = saljaAv(s, h, M);
  if (!sal.length) return false;
  a.salj = true; a.bud = sal;
  return budNu(s, h, a, M);
}
// var det kunden bjuder ligger: det hen bär med sig behöver hen inte hämta, annars stacken närmast filten med det som är hens
// (och för den som handlar för byn: byns)
function hamtaVid(s: State, p: Person, byn: boolean, w: Vara, fran: { x: number; y: number }) {
  if (w.t) return w.t.hos === p.id || w.t.x === undefined || w.t.y === undefined ? undefined : { x: w.t.x + 0.5, y: w.t.y + 0.5 };
  let b: { x: number; y: number } | undefined, bd = Infinity;
  for (const a of stacksOf(s)) {
    if (a.k !== w.k || (byn ? a.n - sumOf(a.ag) : a.ag?.[p.id] ?? 0) < 0.5) continue;
    const d = Math.hypot(a.x + 0.5 - fran.x, a.y + 0.5 - fran.y);
    if (d < bd) { bd = d; b = { x: a.x + 0.5, y: a.y + 0.5 }; }
  }
  return b;
}
// det kunden ska hämta till budet, plats för plats (det som redan ligger på filten hämtas inte igen)
function nastaBud(s: State, h: Handlare, a: Affar, p: Person) {
  const ut: Affar['hamta'] = [], fran = kundPlats(s, h);
  for (const w of a.bud) {
    if (a.framme.includes(w.k)) continue;
    const q = hamtaVid(s, p, !!a.byn, w, fran);
    if (!q) { a.framme.push(w.k); continue; } // hen har det med sig
    const g = ut.find(x => x.x === q.x && x.y === q.y);
    if (g) g.k.push(w.k); else ut.push({ ...q, k: [w.k] });
  }
  a.hamta = ut;
  if (ut.length) a.fas = 'hamta';
  else { a.fas = 'bud'; a.dur = mellan(s, HANDEL.budSek) * SEC; }
}
// vart kunden ska nu (handlaVal), och vad hen gör under Gör just nu
function affarSteg(s: State, h: Handlare, a: Affar) {
  a.t = s.now;
  const spot = kundPlats(s, h), ref = h.id;
  switch (a.fas) {
    case 'fraga': return { act: HANDLA, why: `Frågar vad ${hp(s, h).name} har`, spot, dur: HANDEL.fragaSek * SEC, ref };
    case 'hamta': return { act: HANDLA, why: a.byn ? 'Hämtar byns varor att sälja' : 'Hämtar varor att sälja', spot: { x: a.hamta[0].x, y: a.hamta[0].y }, dur: HANDEL.hamtaSek * SEC, ref };
    case 'bud': return { act: HANDLA, why: `Förhandlar med ${hp(s, h).name}${a.byn ? ' för byn' : ''}`, spot, dur: a.dur ?? HANDEL.budSek[0] * SEC, ref };
    case 'plocka': return { act: HANDLA, why: 'Hämtar det köpta', spot, dur: HANDEL.plockaSek * SEC, ref };
    case 'hem': return { act: HANDLA, why: 'Bär hem det köpta', spot: a.hem ?? spot, dur: HANDEL.hemSek * SEC, ref };
  }
}
// handlaren svarar på budet: ja om det är värt nog för hen (kravAv, och relationen till bybon: kravRel i gastrel.ts, steg
// 4.5.7.11), annars nej. Ett alldeles för dåligt bud irriterar hen (nejTill)
function svar(s: State, h: Handlare, a: Affar, p: Person, M: Part) {
  const H_ = handlarPart(s, h), ger = vardFor(a.kop, H_.varde), krav = ger * Math.max(HANDEL.kravMin, kravAv(s, h, M) * kravRel(s, h, p)), bud = vardFor(a.bud, H_.varde);
  a.rel0 ??= relTal(s, h, p);
  a.arg ??= handelsArg({ s, p, byn: !!a.byn, salj: !!a.salj, kop: a.kop, varde: M.varde, handel: M.handel ?? 0, hHandel: hp(s, h).skill.handel, rel: gastRel(s, h, p), gill: gillar(s, h, p) });
  const hela = (v: Vara[]) => v.map(w => ({ k: w.k, n: Math.max(1, Math.round(w.n)) }));
  const f: ByteForsok = { vill: hela(a.kop), bud: hela(a.bud), krav: Math.max(1, Math.round(krav)), bjod: Math.max(1, Math.round(bud)) };
  (a.forsok ??= []).push(f);
  if (bud >= krav - 1e-9) {
    f.ja = true;
    affarMed(s, h, p);
    const fatt: Vara[] = a.kop.map(w => ({ ...w })), betal = a.bud.map(w => ({ ...w }));
    const lurare = luraI(s, M, H_, betal, a.kop.map(w => w.k), ger);
    a.byt = s.now; a.fas = 'plocka';
    visaFiltar(s, h); // filtarna ligger som de låg när de blev överens (byteKlart tar platserna härifrån)
    genomfor(s, M, H_, fatt, betal, 'handel', false, true, lurare);
    a.bud = betal;
    const m = [M.p, H_.p].flatMap(q => q?.byten ?? []).find(b => b.nr === s.byteNr); // minnet byteKlart just skrev (samma som i loggen), inte ur loggen (regel 6)
    if (m) { m.forsok = a.forsok; m.rel = [a.rel0, relTal(s, h, p)]; m.arg = a.arg; }
    return;
  }
  const irr0 = gastRel(s, h, p)?.irr ?? 0;
  nejTill(s, h, p, krav > 0 ? bud / krav : 1);
  if ((gastRel(s, h, p)?.irr ?? 0) > irr0 && !a.arg.includes('irriterad')) a.arg.push('irriterad');
  if (++a.nej >= HANDEL.nejMax || (a.f = Math.min(kravMax(), a.f + (kravMax() - HANDEL.forstaBud) / (HANDEL.nejMax - 1)), !budNu(s, h, a, M))) { slut(s, h, a, p); return; }
  nastaBud(s, h, a, p);
}
// affären är över: handlarens filt är tom igen och kundens plockas ihop. Den som inte fick något går tomhänt
function slut(s: State, h: Handlare, a: Affar, p: Person | undefined) {
  h.affar = undefined;
  visaFiltar(s, h);
  const bytt = a.byt !== undefined;
  if (a.byn) { h.bynKlar = true; count(s, 'handelBesok'); if (bytt) count(s, 'handelByten'); return; }
  if (p) (h.handlat ??= []).push(p.id);
  count(s, 'egenHandel');
  if (bytt) { count(s, 'egnaByten'); if (a.salj) count(s, 'saltOver'); }
  else { if (p) think(p, `Gick tomhänt från ${hp(s, h).name}`, HANDEL.tomTanke, s.now, HANDEL.tomTim * HOUR); count(s, 'tomhant'); }
  if (p && !bytt && a.forsok?.length) avbrutenAffar(s, h, a, p);
}
// hur mycket handlaren gillar bybon, −100 till 100 (redogörelsen, steg 5.4.6.1)
const relTal = (s: State, h: Handlare, p: Person) => Math.round(gillar(s, h, p) * 100);
// de blev inte överens (steg 5.4.6.1): en rad i loggen och ett minne hos bybon med buden, så att redogörelsen kan visas som
// ett byte. Bara loggen och minnet; inget i simuleringen läser det
function avbrutenAffar(s: State, h: Handlare, a: Affar, p: Person) {
  const minne: ByteMinne = { nr: (s.byteNr = (s.byteNr ?? 0) + 1), t: s.now, a: p.id, an: p.name, b: h.id, bn: hp(s, h).name, ag: [], bg: [], forsok: a.forsok, arg: a.arg, avbruten: true, rel: [a.rel0 ?? relTal(s, h, p), relTal(s, h, p)] };
  loggaByte(log(s, `${p.name} och ${hp(s, h).name} blev inte överens efter ${a.forsok!.length === 1 ? 'ett bud' : `${a.forsok!.length} bud`}.`, 'rel', [p.id]), minne, [p]);
}
// den som inte kommit tillbaka till affären på länge (somnat, blivit sjuk) har gett upp den, och den som dött är borta
function glomAffar(s: State, h: Handlare) {
  const a = h.affar, p = a && byId(s, a.vem);
  if (!a || (p && alive(p) && s.now - a.t < HANDEL.glomMin * MIN)) return;
  if (p && alive(p)) slut(s, h, a, p);
  else if (a.byn && a.byt !== undefined) slut(s, h, a, undefined); // byn hann byta innan den som handlade dog: byn har handlat
  else { h.affar = undefined; visaFiltar(s, h); }
}

// valet på kvällen (night i val.ts, steg 4.5.4.11; och på dagen, day): den som handlar för byn går först. Kommer hen inte,
// går en annan vuxen efter ett tag. När byn handlat ställer sig den som vill byta med sina egna saker i kö, och den första
// i kön börjar sin affär när den före är helt klar. Den som har en affär går dit affären är (affarSteg)
const HANDLA = 'handla' as const, KOA = 'koa' as const;
export function handlaVal(s: State, p: Person): { act: typeof HANDLA | typeof KOA; why: string; spot: { x: number; y: number }; dur: number; ref: number } | undefined {
  const h = s.handlare;
  if (!h || h.fas !== 'handlar' || ageOf(p, s.now) < ALDER.vuxen) return undefined;
  const a = h.affar;
  if (a?.vem === p.id) return affarSteg(s, h, a);
  if (!h.bynKlar) {
    if (a || (p !== forByn(s) && s.now < h.kom + HANDEL.ensamTim * HOUR)) return undefined;
    return affarSteg(s, h, h.affar = nyAffar(p, true, s.now));
  }
  if (h.handlat?.includes(p.id)) return undefined;
  const ko = h.ko = (h.ko ?? []).filter(id => { const q = byId(s, id); return !!q && alive(q) && (q === p || ((q.task?.act === HANDLA || q.task?.act === KOA) && q.task.ref === h.id)); });
  if (!ko.includes(p.id)) {
    // hen ställer sig i kön om det hen kan betala med räcker till en av varorna hen vill ha, för handlaren, eller om hen har
    // något att sälja (steg 4.5.4.14)
    const v = vill(s, h, p);
    const kan = v.length ? bybonPart(s, p).over([]).reduce((x, w) => x + w.n * grundvarde(w.k) * handlarVarde(s, h, w.k), 0) : 0;
    if (!(v.length && kan >= Math.min(...v.map(w => grundvarde(w.k) * handlarVarde(s, h, w.k)))) && !salja(s, h, p).length) return undefined;
    ko.push(p.id);
  }
  if (!a && ko[0] === p.id) { ko.shift(); return affarSteg(s, h, h.affar = nyAffar(p, false, s.now)); }
  return { act: KOA, why: `Står i kö till ${hp(s, h).name}`, spot: kundPlats(s, h, ko.indexOf(p.id) + (a ? 1 : 0)), dur: HANDEL.koMin * MIN, ref: h.id };
}
// ett steg i affären är klart (KLAR i steg.ts). Den som bara väntade i kön gör inget
export function handlaKlar(s: State, p: Person, t: Task) {
  const h = s.handlare, a = h?.affar;
  if (!h || h.id !== t.ref || h.fas !== 'handlar' || !a || a.vem !== p.id) return;
  a.t = s.now;
  if (a.fas === 'fraga') { if (valj(s, h, a, kundPart(s, a, p), p)) nastaBud(s, h, a, p); else slut(s, h, a, p); }
  else if (a.fas === 'hamta') {
    a.framme.push(...a.hamta.shift()?.k ?? []);
    if (!a.hamta.length) { a.fas = 'bud'; a.dur = mellan(s, HANDEL.budSek) * SEC; }
  } else if (a.fas === 'bud') svar(s, h, a, p, kundPart(s, a, p));
  else if (a.fas === 'plocka') {
    const k = a.kop.find(w => !isTool(w.k))?.k; // det köpta ligger i förrådet; redskapen har hen med sig
    if (k) { a.fas = 'hem'; a.hem = dropSpot(s, k); visaFiltar(s, h); } else slut(s, h, a, p);
  } else slut(s, h, a, p);
}
// priserna i ett byte med handlaren (steg 4.5.4.17): det hen tar för sina varor och det hen ger för det en bybo säljer, som på filten
BYTESPRIS.push((s, fran, till, k) => {
  const h = s.handlare;
  if (!h || (fran.id !== h.id && till.id !== h.id) || k === 'silver') return;
  return grundvarde(k) * handlarVarde(s, h, k);
});
