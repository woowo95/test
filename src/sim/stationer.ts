import { Act, H, HOUR, MIN, Person, SEC, State, T, Task, W, inMap } from './typer';
import { eldPlats, getMap } from './karta';
import { knows } from './teknik';
import { ALDER, ageOf, count, doingAct, forstaGang, living, log } from './folk';
import { getable, takeMaterial } from './behov';
import { RESERV } from './ekonomi';
import { Ting, freeTools, tingOf, wearTool } from './agande';
import { BYN } from './egendom';
import { Zone, inZone, pilesOf, stallBorta, usable, zoneAt, zonesOf } from './lager';
import { PLATS, campDist, campKey, rektAvstand } from './plats';
import { balans } from './balans';
import { Rum, bitAt, bitsOf, gridOf, housesOf, husById, roomAt, touch } from './byggnad';
import { fnOf, sovKvar } from './byggnader';
import { ACTS } from './handlingar';
import { SAKER, isTool } from './saker';
import { nyKvalitet } from './kvalitet';
import { groundOf, tileOf } from './mark';
import { FOREST } from './vag';
import { BrasaEld, brasaMal } from './brasor';

// ---------- arbetsstationer och möbler (steg 2.2.3, 2.2.5) ----------
// En station är en plats i byn där ett visst arbete görs: vid slaktbänken slaktas viltet och fisken rensas, vid slöjdbänken
// (som hette flätarbänken före v59) tvinnas rep och flätas korgar (steg 2.2.4). Möblerna står i samma register och byggs
// på samma sätt: halmbädden är den första (steg 2.2.5), och den som sover i den vilar upp sig fortare. Varje sorts
// station är en rad i registret STATIONER: vad den kräver (tekniken och materialet), hur länge den tar att bygga, vilka
// handlingar som görs där och hur många knivar som ligger kvar vid den. En ny station blir en rad här (grillställningen
// 2.8.1). Det enklaste görs med händerna var som helst; så länge byn inte har stationen görs arbetet vid elden som förut
// (spotFor i val.ts). Det som står under bara görs inte alls utan stationen: viltet slaktas och fisken rensas bara vid
// slaktbänken (2.2.6, 2.2.8), och innan byn har en äts det fällda djuret och den hela abborren som de är, med mindre kött och
// inget ben eller skinn; korgen flätas bara vid slöjdbänken. Rep tvinnas fortare vid slöjdbänken än för hand vid elden, och de enkla
// redskapen görs där lite fortare (fart i registret, fartVid).
// Byggs gör den av den som kan tekniken och har tid för handarbete (craft i val.ts), med materialet ur förrådet efter
// behovsstegen (behov.ts). Arbetet kan avbrytas: stationen står kvar halvbyggd och vem som helst som kan tekniken bygger
// klart den. Den tar en eller flera rutor (bredd och djup i registret), där inget annat får ligga eller byggas (usable i
// lager.ts), och den kan stå vriden (rot: bredd och djup byter plats), men står helst som i registret. Registret säger om
// den står ute eller inne (inne): ute står den nära elden, inne på golvet i ett färdigt hus, med golv framför sig där man
// står och arbetar, och bara där den inte tar en sovplats som någon behöver (sovKvar i byggnader.ts). En slöjdbänk som
// byggdes ute före v59 bärs in när ett hus har plats (barIn). Rivs huset försvinner det som stod inne. En möbel som sover (halmbädden) är en
// sovplats, och rutorna den tar är inga andra sovplatser (byggnader.ts). Det byn kan ha flera av (flera) byggs så länge
// projektet säger att byn saknar dem (projekt.ts). På kartan ritas den uppifrån, med en bild lika stor som rutorna (ikoner.ts).
// Redskapsplatserna (vid i registret): en kniv hör till slaktbänken och en bensyl till slöjdbänken (Ting.vid), och de ligger kvar
// där när ingen använder dem, så att det alltid finns en kniv när någon ska slakta. Saknas redskapet vill byn ha ett till (VILL i
// redskap.ts), och det som görs läggs vid bänken. Det som kräver redskapet (kraver: kläderna kräver bensylen, steg 2.3.2) görs
// inte förrän det ligger där, och det slits för varje sak som görs (slitVid).

// ---------- balanstal (regel 8) ----------
export const STATION = balans('station', {
  slaktbankTra: 3, // en slaktbänk kräver så mycket trä ...
  slaktbankMin: 20, // ... och så många minuters arbete
  avstand: 2.5, // en station står helst så här många rutor från elden
  norr: 0.5, // ... och får fyra gånger så här många poäng (färre är bättre) om den står på lekplatsen (plats.ts, steg 2.10.4)
  slaktTill: 9, slaktAvst: 6, // slaktbänken står högst och helst så här många rutor från byn, eftersom den är smutsig (steg 2.10.16)
  utkantMin: 2, // det som står i byns utkant står aldrig närmare byn än så här (om ingen plats längre bort är ledig, t.ex. för skogen)
  knivplatser: 1, // så många knivar som ligger kvar vid slaktbänken
  flatarbankTra: 2, // en flätarbänk kräver så mycket trä ...
  flatarbankGrenar: 3, // ... och så många grenar ...
  flatarbankMin: 20, // ... och så många minuters arbete
  repFart: 2, // rep tvinnas så här många gånger fortare vid slöjdbänken än för hand ...
  redskapFart: 1.25, // ... och de enkla redskapen görs så här många gånger fortare där (Björn, efter v90) ...
  vidBank: 1.5, // ... av den som står så här nära bänken (rutor)
  vriden: 0.5, // en station som står vriden får så här många poäng (färre är bättre), så att den helst står som i registret
  badd: 0.1, // inne: så här många poäng mindre för varje sida som står mot en vägg ...
  dorr: 1, // ... och så här många fler för varje ruta bredvid en öppning, där man går in
  uteVagg: 0.6, // ute: så här många poäng mindre för varje ruta som står mot en husvägg (Björn efter v101: stationerna står snyggt mot väggarna)
  samling: 1, // ... och så här många mindre i ett hus där ingen sover (samlingshuset), för det som inte är en bädd
  halmbaddHo: 4, // en halmbädd kräver så mycket hö ...
  halmbaddGrenar: 2, // ... och så många grenar ...
  halmbaddMin: 20, // ... och så många minuters arbete
  fallSkinn: 2, // en skinnfäll kräver så många skinn ... (steg 2.2.14)
  fallMin: 20, // ... och så många minuters arbete
  fallVarme: 0.5, // den som sover under en skinnfäll kyls så här mycket mindre (av det som når in i huset)
  bordTra: 1, // ett bord kräver så mycket trä för varje ruta det tar ... (steg 2.2.15)
  stubbeTra: 0.5, // ... och så mycket för varje stubbe att sitta på runt det
  bordMin: 15, bord2Min: 18, bord3Min: 20, // så många minuters arbete för det lilla bordet, bordet och långbordet
  // förvaringen (steg 2.3.6): hyllan, kistan och redskapsstället
  hyllaTra: 2, hyllaRep: 1, hyllaMin: 20, hyllaRymmer: 3, // en hylla kräver så mycket trä och rep och så många minuter, och rymmer så många högar av ett slag
  kistaTra: 3, kistaMin: 20, kistaRymmer: 2, // en kista: trä och minuter, och så många högar. Det som ligger i den slits som under tak
  stallTra: 1, stallRep: 1, stallMin: 15, stallRymmer: 4, // ett ställ för redskap och vapen: trä, rep och minuter, och så många redskap
  forvarFulla: 6, // byn vill ha en hylla eller kista fullt ut när så många fulla högar ligger på golvet i lagren ...
  forvarLosa: 4, // ... och ett ställ när så många redskap ligger på golvet
  // latrinen (steg 2.7.2): en grävd grop i byns utkant
  latrinMin: 20, // så många minuters arbete att gräva gropen, med benspaden ...
  latrinSpade: 0.1, // ... som slits så här mycket för varje grop (tio gropar per spade)
  latrinRymmer: 150, // så många toabesök ryms i gropen innan den är full och fylls igen
  latrinNy: 0.85, // byn gräver en ny när den den har är så här full
  latrinTill: 10, // gropen ligger högst så här många rutor från byn (lägret och husen) ... (Björn efter v107: alltid ganska långt bort, steg 2.10.21)
  latrinAvst: 8, // ... helst så här långt ...
  latrinVatten: 8, // ... och, när byn lärt sig att smutsen når vattnet (s.hygien), helst så här många rutor från vattnet ...
  latrinVattenPoang: 1, // ... med så här många poäng (färre är bättre) för varje ruta för nära, gånger s.hygien
  // grillställningen (steg 2.8.1, matlagning.ts): grenar och rep över elden
  grillGrenar: 3, grillRep: 1, grillMin: 15, // så många grenar och rep och så många minuters arbete
  // torkställningen (steg 2.8.2, matlagning.ts): två A av grenar och en slå, surrade med rep
  torkGrenar: 5, torkRep: 1, torkMin: 20, // så många grenar och rep och så många minuters arbete
  // brasan (steg 2.9.1, brasor.ts): en ring av stenar för en extra eld
  brasaSten: 6, brasaMin: 15, // så många stenar (som lägereldens ring) och så många minuters arbete
  brasaFran: 2.5, // brasan ligger helst så här många rutor från mitten av sovplatserna den är till för ...
  brasaSok: 4, // ... och högst så här många rutor därifrån
});
// trä till ett bord som tar w × h rutor, med stubbar på platserna runt det (platserAv nedan)
const bordTra = (w: number, h: number) => w * h * STATION.bordTra + ((w >= 2 ? 2 * w : 0) + (h >= 2 ? 2 * h : 0)) * STATION.stubbeTra;

// namn och ikon (ikoner.ts; kartans bild uppifrån heter ikon_karta), w och h = rutorna den tar (bredd och djup), tek = teknikerna, och den som kan någon av dem bygger den, av = materialet, min = minuters arbete,
// gor = handlingarna som görs vid den, bara = de av dem som inte görs alls utan stationen, vid = redskapen som hör till den
// (slag och antal), kraver = handlingar som bara görs när ett av stationens redskap ligger där, bygger = texten för den som bygger,
// forsta = loggen när byn fått sin första, inne = står inne i ett hus, mobel = en möbel, flera = byn kan ha flera, sover = en sovplats
// (halmbädden), sitt = en sittplats framför den (bara utseende, steg 2.2.5), platser = ett bord med stubbar att sitta på runt
// det (steg 2.2.15), verktyg = redskapet man bygger den med (benspaden till latrinen, steg 2.7.2), utkant = står i byns utkant, högst till och helst avst rutor från byn,
// och med vatten långt från vattnet när byn lärt sig det (latrinen och slaktbänken, siteUtkant nedan), eld = står över elden, med elden i mitten, och används bara när den brinner (grillen, steg 2.8.1), forvar = förvaring som står i en lagerplats (steg 2.3.6): rymmer så många högar av ett slag (gånger en
// rutas stack) eller, för redskap, så många redskap; tak = det som ligger där slits som under tak,
// stangd = det som ligger där syns inte på kartan, bara när man trycker på möbeln (kistan, Björn efter v92), privat = bara för
// privata saker (kistan, steg 2.10.18): byggs inte i byns lager
// brasa = en extra eld (steg 2.9.1, brasor.ts): står nära sovplatserna den är till för (siteBrasa), och alla vuxna kan bygga den (tek är tom: den som är gammal nog att ta ansvar, ALDER.ansvar)
export interface Utkant { till: number; avst: number; vatten?: true }
export interface Forvar { rymmer: number; redskap?: true; tak?: true; stangd?: true; privat?: true }
export interface StationDef { namn: string; ikon: string; w: number; h: number; tek: string[]; av: Record<string, number>; min: number; gor: Act[]; bara?: Act[]; vid?: Record<string, number>; verktyg?: string; utkant?: Utkant; eld?: true; kraver?: Partial<Record<Act, string>>; smutsar?: Partial<Record<Act, string>>; bygger: string; forsta: string; inne?: true; mobel?: true; flera?: true; fart?: Partial<Record<Act, number>>; brasa?: true; sover?: true; sitt?: true; platser?: true; forvar?: Forvar }
// de enkla redskapen: görs vid slöjdbänken om byn har en, lite fortare där (fart), annars vid elden som förut (Björn, efter v90)
const ENKLA: Act[] = ['yxa', 'spjut', 'metspo', 'kniv', 'bensyl', 'balte'];
export const STATIONER = {
  slaktbank: {
    namn: 'Slaktbänk', ikon: 'slaktbank', w: 3, h: 1, tek: ['slaktbank'], av: { ved: STATION.slaktbankTra }, min: STATION.slaktbankMin, gor: ['slakta', 'rensa'], bara: ['slakta', 'rensa'], vid: { kniv: STATION.knivplatser }, smutsar: { slakta: 'blod' }, utkant: { till: STATION.slaktTill, avst: STATION.slaktAvst }, // står en bit från byn (steg 2.10.16) // blir blodig när det slaktas (blod.ts)
    bygger: 'Bygger en slaktbänk av trä.',
    forsta: '{namn} byggde byns första slaktbänk av trä. Där slaktas viltet och rensas fisken, och en kniv ligger kvar vid bänken.',
  },
  flatarbank: { // slöjdbänken: id:t är kvar från när den hette flätarbänken, så att sparade byar fungerar
    namn: 'Slöjdbänk', ikon: 'flatarbank', w: 2, h: 1, tek: ['flatarbank'], av: { ved: STATION.flatarbankTra, grenar: STATION.flatarbankGrenar }, min: STATION.flatarbankMin, gor: ['tvinna', 'korg', 'skinnrock', 'skinnskor', 'benspade', 'vattensack', ...ENKLA], fart: { tvinna: STATION.repFart, ...Object.fromEntries(ENKLA.map(a => [a, STATION.redskapFart])) }, bara: ['korg', 'skinnrock', 'skinnskor', 'benspade', 'vattensack'], vid: { bensyl: 1 }, kraver: { skinnrock: 'bensyl', skinnskor: 'bensyl', vattensack: 'bensyl' }, inne: true, sitt: true,
    bygger: 'Bygger en slöjdbänk av trä och grenar.',
    forsta: '{namn} byggde byns första slöjdbänk. Där tvinnas rep fortare än för hand och flätas korgar.', // och sys kläder med bensylen (steg 2.3.2)
  },
  halmbadd: {
    namn: 'Halmbädd', ikon: 'halmbadd', w: 2, h: 1, tek: ['halmbadd'], av: { torrgras: STATION.halmbaddHo, grenar: STATION.halmbaddGrenar }, min: STATION.halmbaddMin, gor: [], inne: true, mobel: true, flera: true, sover: true,
    bygger: 'Bäddar en halmbädd av hö och grenar.',
    forsta: '{namn} gjorde byns första halmbädd. Den som sover i den vilar upp sig fortare.',
  },
  // borden (steg 2.2.15): tre storlekar av samma möbel och teknik. Byn bygger den storlek som räcker åt dem som saknar en plats
  bord: {
    namn: 'Litet bord', ikon: 'bord', w: 2, h: 1, tek: ['bord'], av: { ved: bordTra(2, 1) }, min: STATION.bordMin, gor: [], mobel: true, flera: true, platser: true,
    bygger: 'Bygger ett bord med stubbar att sitta på.',
    forsta: '{namn} byggde byns första bord, med stubbar att sitta på. Där äter man tillsammans och samtalar.',
  },
  bord2: {
    namn: 'Bord', ikon: 'bord2', w: 2, h: 2, tek: ['bord'], av: { ved: bordTra(2, 2) }, min: STATION.bord2Min, gor: [], mobel: true, flera: true, platser: true,
    bygger: 'Bygger ett bord med åtta stubbar runt.',
    forsta: '{namn} byggde byns första fyrkantiga bord, med plats för åtta.',
  },
  bord3: {
    namn: 'Långbord', ikon: 'bord3', w: 3, h: 2, tek: ['bord'], av: { ved: bordTra(3, 2) }, min: STATION.bord3Min, gor: [], mobel: true, flera: true, platser: true,
    bygger: 'Bygger ett långbord med tio stubbar runt.',
    forsta: '{namn} byggde byns första långbord, med plats för tio.',
  },
  // förvaringen (steg 2.3.6): står i en lagerplats, på en ruta där något redan ligger, och går inte att gå igenom
  hylla: {
    namn: 'Hylla', ikon: 'hylla', w: 1, h: 1, tek: ['hylla'], av: { ved: STATION.hyllaTra, rep: STATION.hyllaRep }, min: STATION.hyllaMin, gor: [], mobel: true, flera: true, forvar: { rymmer: STATION.hyllaRymmer },
    bygger: 'Bygger en hylla av trä och rep i lagret.',
    forsta: '{namn} byggde byns första hylla. På den ryms flera högar på samma plats, så att lagret tar mindre plats.',
  },
  kista: {
    namn: 'Kista', ikon: 'kista', w: 1, h: 1, tek: ['hylla'], av: { ved: STATION.kistaTra }, min: STATION.kistaMin, gor: [], mobel: true, flera: true, forvar: { rymmer: STATION.kistaRymmer, tak: true, stangd: true, privat: true },
    bygger: 'Bygger en kista av trä i lagret.',
    forsta: '{namn} byggde byns första kista. Det som ligger i den ryms på mindre plats och slits som under tak.',
  },
  stall: {
    namn: 'Redskapsställ', ikon: 'stall', w: 1, h: 1, tek: ['hylla'], av: { ved: STATION.stallTra, rep: STATION.stallRep }, min: STATION.stallMin, gor: [], mobel: true, flera: true, forvar: { rymmer: STATION.stallRymmer, redskap: true },
    bygger: 'Bygger ett ställ för redskap och vapen i lagret.',
    forsta: '{namn} byggde byns första ställ för redskap och vapen. Där står flera redskap på samma plats.',
  },
  // latrinen (steg 2.7.2, smuts.ts): en grop som grävs med benspaden i byns utkant. Där går man på toa, och när den är full fylls den igen
  latrin: {
    namn: 'Latrin', ikon: 'latrin', w: 1, h: 1, tek: ['latrin'], av: {}, min: STATION.latrinMin, gor: ['toa'], verktyg: 'benspade', utkant: { till: STATION.latrinTill, avst: STATION.latrinAvst, vatten: true }, flera: true,
    bygger: 'Gräver en latrin med benspaden.',
    forsta: '{namn} grävde byns första latrin. Där går man på toa, så att smutsen hamnar på ett ställe.',
  },
  // grillställningen (steg 2.8.1, matlagning.ts): två klykor och ett spett med vev, tre rutor bred med elden i mitten
  grill: {
    namn: 'Grillställning', ikon: 'grill', w: 3, h: 1, tek: ['grill'], av: { grenar: STATION.grillGrenar, rep: STATION.grillRep }, min: STATION.grillMin, gor: ['grilla'], bara: ['grilla'], eld: true,
    bygger: 'Sätter upp en grillställning av grenar och rep över elden.',
    forsta: '{namn} satte upp byns första grillställning över elden. Där grillas köttet och fisken, och den grillade maten håller längre.',
  },
  // torkställningen (steg 2.8.2, matlagning.ts): en fiskhäck med A-ramar, två rutor bred, som sticker upp över raden ovanför
  tork: {
    namn: 'Torkställning', ikon: 'tork', w: 2, h: 1, tek: ['tork'], av: { grenar: STATION.torkGrenar, rep: STATION.torkRep }, min: STATION.torkMin, gor: ['torka'], bara: ['torka'], flera: true,
    bygger: 'Sätter upp en torkställning av grenar och rep.',
    forsta: '{namn} satte upp byns första torkställning. Där torkar köttet och fisken som byn inte hinner äta, och det torkade håller länge.',
  },
  // brasan (steg 2.9.1, brasor.ts): en ring av stenar där en extra eld brinner, nära hyddorna som ligger långt från lägerelden
  brasa: {
    namn: 'Brasa', ikon: 'brasa', w: 1, h: 1, tek: [], av: { sten: STATION.brasaSten }, min: STATION.brasaMin, gor: [], flera: true, brasa: true,
    bygger: 'Lägger en ring av stenar till en brasa nära sovplatserna.',
    forsta: '{namn} lade en ring av stenar till byns första brasa, långt från lägerelden och nära sovplatserna.',
  },
} satisfies Record<string, StationDef>;
export type StationSlag = keyof typeof STATIONER;
export const STATION_LIST = Object.keys(STATIONER) as StationSlag[];
export const stationDef = (k: string): StationDef | undefined => (STATIONER as Record<string, StationDef>)[k];

// en station i byn: rutan längst upp till vänster av dem den står på, hur länge (ms) arbetet med att bygga den har kvar (0 = klar), vilka som byggt på
// den och när den blev klar (det visas när man trycker på den, flikar/station.ts)
// rot = vriden (bredd och djup byter plats), inne = byggd inne i ett hus (den försvinner om huset rivs)
// med = tillbehören som ligger i den (TILLBEHOR, t.ex. skinnfällen i bädden), fyllt = hur full latrinen är (0–1, smuts.ts)
// tork = det som hänger på torkställningen (matlagning.ts): råvaran, hur mycket, när det hängdes upp och vems det är
// eld = brasans eld (steg 2.9.1, brasor.ts)
export interface Station { id: number; k: string; x: number; y: number; kvar: number; vem?: number[]; klar?: number; rot?: 1; inne?: 1; med?: string[]; fyllt?: number; q?: number; tork?: { k: string; n: number; t: number; ag?: Record<string, number> }[]; eld?: BrasaEld }
const NONE: Station[] = [];
export const stationerOf = (s: State) => s.stationer ?? NONE;
export const stationById = (s: State, id?: number) => id === undefined ? undefined : stationerOf(s).find(t => t.id === id);
export const isKlar = (t: Station) => t.kvar <= 0;
// hur stor del av bygget som är gjort (0 till 1), för framstegscirkeln på kartan
export const stationKlar = (t: Station) => Math.min(1, Math.max(0, 1 - t.kvar / ((stationDef(t.k)?.min ?? 1) * MIN)));
// rutorna stationen tar (bredd och djup i registret, bytta när den står vriden; en okänd sort tar en ruta)
export const storlek = (k: string, rot?: unknown) => { const d = stationDef(k), w = d?.w ?? 1, h = d?.h ?? 1; return rot ? { w: h, h: w } : { w, h }; };
export const storlekAv = (t: { k: string; rot?: unknown }) => storlek(t.k, t.rot);
// rutorna (index i kartan) som stationerna tar, och sovplatserna i de färdiga möbler man sover i (rutan uppe till vänster).
// Räknas om när något byggs (s.byggV)
// och borden: platserna runt dem (sitt, där inget annat får stå)
// och förvaringen (steg 2.3.6): rutorna som inte går att gå igenom (hinder, i vägsökningen i vag.ts), också medan den byggs
interface Rutor { v: number; n: number; at: Map<number, Station>; sov: Set<number>; sitt: Set<number>; hinder: Uint8Array }
const rutorCache = new WeakMap<State, Rutor>();
export function stationRutor(s: State): Rutor {
  const st = stationerOf(s), v = s.byggV ?? 0;
  let r = rutorCache.get(s);
  if (!r || r.v !== v || r.n !== st.length) {
    const at = new Map<number, Station>(), sov = new Set<number>(), sitt = new Set<number>(), hinder = new Uint8Array(W * H);
    for (const t of st) {
      const { w, h } = storlekAv(t), d = stationDef(t.k);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { at.set((t.y + j) * W + t.x + i, t); if (d?.forvar) hinder[(t.y + j) * W + t.x + i] = 1; }
      if (isKlar(t) && d?.sover) sov.add(t.y * W + t.x);
      for (const q of bordPlatser(t)) sitt.add(q.y * W + q.x);
    }
    r = { v, n: st.length, at, sov, sitt, hinder };
    rutorCache.set(s, r);
  }
  groundOf(s).hinder = r.hinder; // vägsökningen frågar marken
  return r;
}
// står det en station (klar eller halvbyggd) på rutan?
export function stationAt(s: State, x: number, y: number) {
  if (!s.stationer?.length || x < 0 || y < 0) return undefined;
  return x < W ? stationRutor(s).at.get(Math.floor(y) * W + Math.floor(x)) : undefined;
}
// är rutan en plats vid ett bord (en stubbe)?
export const sittAt = (s: State, x: number, y: number) => !!s.stationer?.length && x >= 0 && y >= 0 && x < W && stationRutor(s).sitt.has(Math.floor(y) * W + Math.floor(x));
// den färdiga station där handlingen görs, om byn har en
export const stationFor = (s: State, act: Act) => stationerOf(s).find(t => isKlar(t) && stationDef(t.k)?.gor.includes(act));
// handlingen görs bara vid en station (bara i registret)
const BARA = new Set<Act>(STATION_LIST.flatMap(k => (STATIONER[k] as StationDef).bara ?? []));
// handlingen kan göras: den kräver ingen station, eller byn har en färdig (och redskapet som handlingen kräver ligger där)
export function kanGoras(s: State, act: Act) {
  if (!BARA.has(act)) return true;
  const t = stationFor(s, act), k = t && stationDef(t.k)?.kraver?.[act];
  return !!t && (!k || redskapVid(s, t, k).length > 0);
}
// platsen där man står och arbetar vid stationen: mitt för den på rutan söder om den
export const vidStation = (t: Station) => { const { w, h } = storlekAv(t); return { x: t.x + w / 2, y: t.y + h + 0.1 }; };
// hur många gånger fortare p gör act just där hen står: stationens fart för den som står vid den, annars 1
export const fartVid = (s: State, p: { x: number; y: number }, act: Act) => {
  const st = stationFor(s, act), f = st && stationDef(st.k)?.fart?.[act];
  if (!f) return 1;
  const at = vidStation(st);
  return Math.hypot(p.x - at.x, p.y - at.y) < STATION.vidBank ? f : 1;
};

// ---------- var den står ----------
// en ruta där inget annat ligger eller står: inte på en lagerplats, ett hus, en stack, ett redskap, en stock eller en stubbe
export function ledig(s: State, x: number, y: number) {
  if (!usable(s, x, y) || stationAt(s, x, y) || sittAt(s, x, y) || zonesOf(s).some(z => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h)) return false;
  return !((s.stackar ?? []).some(a => a.x === x && a.y === y) || tingOf(s).some(k => k.x === x && k.y === y) || (s.stockar ?? []).some(k => Math.floor(k.x) === x && Math.floor(k.y) === y) || (s.stubbar ?? []).some(k => k.x === x && k.y === y));
}
// ---------- avståndet ute (steg 2.10.8) ----------
// står det en station eller en stubbe ute på rutan (x, y)? Det som står inne står i ett hus, och möblerna i lagren i en lagerplats
export function uteStation(s: State, x: number, y: number) {
  if (!s.stationer?.length || !inMap(x, y)) return false;
  const r = stationRutor(s), i = y * W + x, t = r.at.get(i);
  return r.sitt.has(i) || !!t && !t.inne && !stationDef(t.k)?.forvar;
}
// står inget annat (ett hus, en lagerplats, en station eller en stubbe ute) inom PLATS.uteFri rutor från rutorna? Då finns plats
// för en stig runt det som ska stå där. motVagg: husen räknas inte, för en station får stå mot en vägg (Björn efter v101)
export function friRunt(s: State, rutor: { x: number; y: number }[], motVagg = false) {
  const r = PLATS.uteFri, egna = new Set(rutor.map(q => q.y * W + q.x)), g = gridOf(s), zs = zonesOf(s);
  for (const q of rutor) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = q.x + dx, y = q.y + dy, i = y * W + x;
    if (!inMap(x, y) || egna.has(i)) continue;
    if (!motVagg && g.at.has(i) || uteStation(s, x, y) || zs.some(z => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h)) return false;
  }
  return true;
}
// ---------- inne i byn och lekplatsen (steg 2.10.4) ----------
// Byn inne är lagerplatserna och husen, inte elden: elden är ett verktyg och kan flyttas, och det som räknas från
// byns inre (lekplatsen, och arbetet utan bänk i 2.10.6) ska inte hänga på var den ligger. byInne är mitten av dem:
// varje lagerplats och varje hus väger lika. Innan byn har något av dem är det elden
export function byInne(s: State) {
  const pts: { x: number; y: number }[] = zonesOf(s).map(z => ({ x: z.x + (z.w - 1) / 2, y: z.y + (z.h - 1) / 2 }));
  const hus = new Map<number, { x: number; y: number; n: number }>();
  for (const b of bitsOf(s)) {
    if (b.hus === undefined) continue;
    const h = hus.get(b.hus) ?? { x: 0, y: 0, n: 0 };
    h.x += b.x; h.y += b.y; h.n++; hus.set(b.hus, h);
  }
  for (const h of housesOf(s)) { const c = hus.get(h.id); if (c) pts.push({ x: c.x / c.n, y: c.y / c.n }); }
  if (!pts.length) { const f = eldPlats(s); return { x: f.x, y: f.y }; }
  return { x: pts.reduce((a, q) => a + q.x, 0) / pts.length, y: pts.reduce((a, q) => a + q.y, 0) / pts.length };
}
export interface Rekt { x: number; y: number; w: number; h: number }
// Lekplatsen: lekBredd × lekDjup rutor öppen mark (inte vatten eller sten) nära byns inre, där inget står och inga stora
// träd växer, helst lekFran rutor därifrån och söderut. Samma plats varje gång (ingen slump); den följer byn när den
// växer. Sparas per by och timme, som fältets plats (regel 4)
const lekCache = new WeakMap<State, { key: string; at: Rekt }>();
export function lekplats(s: State): Rekt {
  const key = `${Math.floor(s.now / HOUR)}:${s.byggV ?? 0}:${campKey(s)}`;
  const c = lekCache.get(s);
  if (c && c.key === key) return c.at;
  const at = hittaLek(s);
  lekCache.set(s, { key, at });
  return at;
}
function hittaLek(s: State): Rekt {
  const m = getMap(s.seed), g = groundOf(s), mid = byInne(s), w = PLATS.lekBredd, h = PLATS.lekDjup, R = PLATS.lekSok;
  const cx = Math.round(mid.x), cy = Math.round(mid.y), x0 = cx - R - w, y0 = cy - R - h, bw = 2 * (R + w) + 1, bh = 2 * (R + h) + 1;
  const kost = new Float64Array(bw * bh); // vad varje ruta i sökområdet kostar: Infinity för vatten, sten och kartans kant
  for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) {
    const x = x0 + i, y = y0 + j;
    if (!inMap(x, y)) { kost[j * bw + i] = Infinity; continue; }
    const tt = m.tiles[y * W + x];
    kost[j * bw + i] = tt === T.Vatten || tt === T.Sten ? Infinity : !ledig(s, x, y) || g.trees[y * W + x] >= FOREST ? PLATS.lekHinder : 0;
  }
  let best: Rekt = { x: cx - w / 2, y: cy + PLATS.lekFran, w, h }, bs = Infinity;
  for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
    let sc = 0;
    for (let j = 0; j < h && sc < bs; j++) for (let i = 0; i < w && sc < bs; i++) sc += kost[(y + j - y0) * bw + x + i - x0];
    if (sc >= bs) continue;
    const d = rektAvstand(mid.x, mid.y, x, y, w, h);
    sc += Math.abs(d - PLATS.lekFran) + (y + (h - 1) / 2 < mid.y ? PLATS.lekNorr : 0);
    if (sc < bs) { bs = sc; best = { x, y, w, h }; }
  }
  return best;
}
// ligger rektangeln med hörnet (x, y) och måtten w×h på lekplatsen l (någon ruta)? l = lekplats(s), hämtad en gång före
// sökningen, så att den inte räknas om för varje ruta
export const paLek = (l: Rekt, x: number, y: number, w = 1, h = 1) => x < l.x + l.w && x + w > l.x && y < l.y + l.h && y + h > l.y;

// platsen för en station av sorten k: inne i ett hus om registret säger det, annars nära elden. Samma plats varje gång (ingen slump)
export const stationSite = (s: State, k: string) => stationDef(k)?.brasa ? siteBrasa(s) : stationDef(k)?.eld ? siteEld(s) : stationDef(k)?.forvar ? siteForvar(s, k) : stationDef(k)?.utkant ? siteUtkant(s, k) : stationDef(k)?.inne ? siteInne(s, k) : siteUte(s, k);
// avståndet från rutan (x, y) till byn: lägret (elden och lagerplatserna, campDist) och husen
export function byAvstand(s: State, x: number, y: number) {
  let d = campDist(s, x, y);
  for (const h of housesOf(s)) d = Math.min(d, rektAvstand(x, y, h.x, h.y, h.w, h.h));
  return d;
}
// i byns utkant (latrinen och slaktbänken): lediga rutor på gräs, sand eller i glesare skog, högst u.till rutor från byn (lägret
// och husen, byAvstand), helst u.avst och aldrig närmare än utkantMin, inte på lekplatsen, och för latrinen, när byn lärt sig
// det (s.hygien), långt från vattnet. Avståndet räknas från stationens närmaste ruta
function siteUtkant(s: State, k: string) {
  const u = stationDef(k)!.utkant!, m = getMap(s.seed), g = groundOf(s), lekR = lekplats(s), hus = housesOf(s);
  // sökområdet: byn (elden, lagerplatserna och husen) och u.till rutor runt
  const f = eldPlats(s), R = Math.ceil(u.till) + 1;
  let x0 = f.x, y0 = f.y, x1 = f.x, y1 = f.y;
  for (const z of [...zonesOf(s), ...hus]) { x0 = Math.min(x0, z.x); y0 = Math.min(y0, z.y); x1 = Math.max(x1, z.x + z.w - 1); y1 = Math.max(y1, z.y + z.h - 1); }
  let best: { x: number; y: number; rot?: 1 } | undefined, bs = Infinity;
  for (const rot of (stationDef(k)!.w === stationDef(k)!.h ? [0] : [0, 1]) as (0 | 1)[]) {
    const { w, h } = storlek(k, rot);
    for (let y = Math.max(0, y0 - R); y <= Math.min(H - h, y1 + R); y++) for (let x = Math.max(0, x0 - R); x <= Math.min(W - w, x1 + R); x++) {
      const rutor = rutorAv(x, y, w, h);
      let d = Infinity, ok = true;
      for (const q of rutor) {
        const t = m.tiles[q.y * W + q.x];
        if (t !== T.Gras && t !== T.Sand && t !== T.Skog || g.trees[q.y * W + q.x] >= FOREST || !ledig(s, q.x, q.y)) { ok = false; break; }
        d = Math.min(d, byAvstand(s, q.x, q.y));
      }
      if (!ok || d < STATION.utkantMin || d > u.till || !friRunt(s, rutor)) continue;
      const lek = paLek(lekR, x, y, w, h) ? STATION.norr * 4 : 0;
      const vatten = u.vatten && s.hygien ? s.hygien * STATION.latrinVattenPoang * Math.max(0, STATION.latrinVatten - tillVatten(s, x, y, STATION.latrinVatten)) : 0;
      const sc = Math.abs(d - u.avst) + lek + vatten + rot * STATION.vriden;
      if (sc < bs) { bs = sc; best = rot ? { x, y, rot } : { x, y }; }
    }
  }
  return best;
}
// brasan (steg 2.9.1): en ledig ruta ute (inte i ett hus) nära mitten av sovplatserna den är till för (brasaMal i brasor.ts),
// helst brasaFran rutor därifrån, så att den inte står i dörren
function siteBrasa(s: State) {
  const mal = brasaMal(s);
  if (!mal) return undefined;
  const R = STATION.brasaSok, cx = Math.floor(mal.x), cy = Math.floor(mal.y);
  let best: { x: number; y: number; rot?: 1 } | undefined, bs = Infinity;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const x = cx + dx, y = cy + dy, d = Math.hypot(x + 0.5 - mal.x, y + 0.5 - mal.y);
    if (d > R || x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || roomAt(s, x, y) || !ledig(s, x, y) || !friRunt(s, [{ x, y }])) continue;
    const sc = Math.abs(d - STATION.brasaFran);
    if (sc < bs) { bs = sc; best = { x, y }; }
  }
  return best;
}
// hur långt det är från rutan (x, y) till närmaste vatten, högst max rutor
function tillVatten(s: State, x: number, y: number, max: number) {
  const tiles = getMap(s.seed).tiles;
  let bd = max;
  for (let dy = -max; dy <= max; dy++) for (let dx = -max; dx <= max; dx++) {
    const xx = x + dx, yy = y + dy;
    if (xx >= 0 && yy >= 0 && xx < W && yy < H && tiles[yy * W + xx] === T.Vatten) bd = Math.min(bd, Math.hypot(dx, dy));
  }
  return bd;
}
// över elden (grillen): rutan till vänster om elden, så att elden står i mitten. Där ligger aldrig något (usable i lager.ts)
function siteEld(s: State) {
  const f = eldPlats(s);
  return [-1, 0, 1].some(i => stationAt(s, f.x + i, f.y)) ? undefined : { x: f.x - 1, y: f.y, rot: undefined };
}
// rutorna i rektangeln med hörnet (x, y) och måtten w×h
const rutorAv = (x: number, y: number, w: number, h: number) => Array.from({ length: w * h }, (_, i) => ({ x: x + i % w, y: y + Math.floor(i / w) }));
// ute: alla rutorna den tar är lediga, ingenting utom ett hus står inpå (friRunt), helst mot en vägg och inte där barnen leker. Avståndet räknas från stationens mitt
function siteUte(s: State, k: string) {
  const f = eldPlats(s), lekR = lekplats(s);
  let best: { x: number; y: number; rot?: 1 } | undefined, bs = Infinity;
  for (const rot of [0, 1] as const) {
    const { w, h } = storlek(k, rot), R = Math.ceil(STATION.avstand) + 2 + Math.max(w, h);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const x = f.x + dx, y = f.y + dy;
      let fri = true;
      for (let j = 0; j < h && fri; j++) for (let i = 0; i < w && fri; i++) fri = ledig(s, x + i, y + j);
      if (fri && stationDef(k)?.platser) fri = bordPlatser({ k, x, y, rot }).every(q => ledig(s, q.x, q.y)); // stubbarna runt bordet
      if (fri) fri = friRunt(s, [...rutorAv(x, y, w, h), ...(stationDef(k)?.platser ? bordPlatser({ k, x, y, rot }) : [])], true); // plats för en stig runt (steg 2.10.8)
      for (let i = 0; i < w && fri; i++) fri = !gridOf(s).at.has((y + h) * W + x + i); // man står framför den, inte i en vägg
      if (!fri) continue;
      // helst mot en vägg, men inte vid en öppning där man går in (Björn efter v101)
      let vagg = 0;
      for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
        if ((i === -1 || i === w) === (j === -1 || j === h)) continue; // bara rutorna rakt bredvid, inte hörnen
        const b = bitAt(s, x + i, y + j);
        if (b?.k === 'vagg') vagg++; else if (b?.k === 'oppning') fri = false;
      }
      if (!fri) continue;
      const mx = dx + (w - 1) / 2, my = dy + (h - 1) / 2;
      const lek = paLek(lekR, x, y, w, h) ? STATION.norr * 4 : 0;
      const sc = Math.abs(Math.hypot(mx, my) - STATION.avstand) + lek + rot * STATION.vriden - vagg * STATION.uteVagg;
      if (sc < bs) { bs = sc; best = rot ? { x, y, rot } : { x, y }; }
    }
  }
  return best;
}
// inne: en golvruta i rummet där ingen station står, inget ligger och som inte är en lagerplats
function golvFri(s: State, rum: Set<number>, W: number, x: number, y: number) {
  const i = y * W + x;
  return rum.has(i) && !stationRutor(s).at.has(i) && !stationRutor(s).sitt.has(i) && !zonesOf(s).some(z => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h)
    && !(s.stackar ?? []).some(a => a.x === x && a.y === y) && !tingOf(s).some(q => q.x === x && q.y === y && q.hos === undefined && q.lass === undefined);
}
// inne: i ett färdigt hus (en möbel man sover i bara där man sover, det andra inte i ett förrådshus), på lediga golvrutor med
// golv framför sig, och bara om den inte tar en sovplats som någon behöver. Helst mot en vägg och inte vid öppningen
function siteInne(s: State, k: string) {
  const d = stationDef(k)!, g = gridOf(s);
  let best: { x: number; y: number; rot?: 1; inne: 1 } | undefined, bs = Infinity;
  for (const r of g.rooms) {
    const hus = husById(s, r.hus);
    if (!hus?.klar || !r.tiles.length) continue;
    const fn = fnOf(hus);
    if (d.sover ? !fn.sover : fn.lager) continue;
    const rum = new Set(r.tiles), kvar = sovKvar(s, r), bonus = !d.sover && !fn.sover ? -STATION.samling : 0;
    for (const rot of [0, 1] as const) {
      const { w, h } = storlek(k, rot), tar = w * h - (d.sover ? 1 : 0);
      if (tar > kvar) continue;
      for (const i0 of r.tiles) {
        const x = i0 % W, y = (i0 - x) / W;
        let fri = true, sc = rot * STATION.vriden + bonus;
        for (let j = 0; j < h && fri; j++) for (let i = 0; i < w && fri; i++) fri = golvFri(s, rum, W, x + i, y + j);
        for (let i = 0; i < w && fri; i++) fri = rum.has((y + h) * W + x + i) && !stationRutor(s).at.has((y + h) * W + x + i); // golvet framför
        if (!fri) continue;
        for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
          if ((i === -1 || i === w) === (j === -1 || j === h)) continue; // bara rutorna rakt bredvid, inte hörnen
          const b = bitAt(s, x + i, y + j);
          if (b?.k === 'vagg') sc -= STATION.badd; else if (b?.k === 'oppning') sc += STATION.dorr;
        }
        if (sc < bs) { bs = sc; best = rot ? { x, y, rot, inne: 1 } : { x, y, inne: 1 }; }
      }
    }
  }
  return best;
}
// ---------- förvaringen (steg 2.3.6) ----------
// Hyllan, kistan och redskapsstället står i en lagerplats, på en ruta där något redan ligger: hyllan och kistan på en full
// hög (som då får plats för fler högar av samma slag), stället på ett redskap (som då kan stå bredvid fler). Bara inomhus,
// i en lagerplats under tak (förrådshuset, steg 2.10.18), och där i lagret med högst prioritet. Kistan är för privata saker
// och byggs inte i byns lager (privat). Möbler som redan står ute får stå kvar. De går inte att gå igenom, så de står bara där alla andra rutor i lagerplatsen och
// alla möbler i den fortfarande nås från en ruta bredvid (nas). Det byn vill ha (forvarBrist, projekt.ts) räknas på det som
// ligger på golvet i lagren: fulla högar för hyllan och kistan, redskap för stället
export const forvarAt = (s: State, x: number, y: number) => { const t = stationAt(s, x, y); return t && isKlar(t) ? stationDef(t.k)?.forvar : undefined; };
// det som ligger på golvet i en lagerplats (inte i en möbel) och som en möbel av sorten k är till för
function golvet(s: State, k: string) {
  const f = stationDef(k)?.forvar, ut: { x: number; y: number; z: Zone }[] = [];
  if (!f || f.privat) return ut;
  for (const a of pilesOf(s)) {
    const z = zonesOf(s)[a.zone];
    if (!z || z.hus === undefined || stationAt(s, a.x, a.y)) continue; // bara inomhus (steg 2.10.18)
    if (f.redskap ? isTool(a.k) : !isTool(a.k) && a.n >= a.max - 1e-9 && (!f.tak || SAKER[a.k]?.haller !== undefined || (SAKER[a.k]?.slits ?? 0) > 0)) ut.push({ x: a.x, y: a.y, z });
  }
  return ut;
}
// hur mycket byn vill ha en möbel av sorten k (0 till 1)
export const forvarBrist = (s: State, k: string) => { const f = stationDef(k)?.forvar; return f ? Math.min(1, golvet(s, k).length / (f.redskap ? STATION.forvarLosa : STATION.forvarFulla)) : 0; };
// rutorna man når från elden, rakt åt sidorna, utan vatten, väggar och möbler som inte går att gå igenom; med rutan extra
// som ett hinder till och utan hindret på rutan utan. Ger de nådda rutorna och hur många de är
// Sparas tills något byggs (s.byggV) eller antalet stationer ändras, som stationRutor
const naddaCache = new WeakMap<State, { key: string; m: Map<number, { sedd: Uint8Array; n: number }> }>();
function nadda(s: State, extra = -1, utan = -1) {
  const key = `${s.byggV ?? 0}:${stationerOf(s).length}`, k = (extra + 1) * (W * H + 1) + utan + 1;
  let c = naddaCache.get(s);
  if (c?.key !== key) naddaCache.set(s, c = { key, m: new Map() });
  let r = c.m.get(k);
  if (!r) c.m.set(k, r = naddaNu(s, extra, utan));
  return r;
}
function naddaNu(s: State, extra: number, utan: number) {
  gridOf(s); // väggarna som de är nu
  const g = groundOf(s), hinder = stationRutor(s).hinder, f = eldPlats(s), sedd = new Uint8Array(W * H), ko: number[] = [];
  const fri = (i: number) => g.tiles[i] !== T.Vatten && !g.solid?.[i] && (!hinder[i] || i === utan) && i !== extra;
  const lagg = (x: number, y: number) => { const i = y * W + x; if (x >= 0 && y >= 0 && x < W && y < H && !sedd[i] && fri(i)) { sedd[i] = 1; ko.push(i); } };
  lagg(f.x, f.y);
  for (const [dx, dy] of GRANNAR) lagg(f.x + dx, f.y + dy);
  for (let k = 0; k < ko.length; k++) { const x = ko[k] % W, y = (ko[k] - x) / W; for (const [dx, dy] of GRANNAR) lagg(x + dx, y + dy); }
  return { sedd, n: ko.length };
}
const GRANNAR = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// går det att ställa ett hinder på rutan extra i lagerplatsen z? Inget som nåddes från elden får stängas in (inte heller ett
// hus vars öppning leder ut i lagret), alla rutor i lagerplatsen nås, och varje hinder i den (möblerna) har en nådd ruta rakt
// bredvid sig. Rakt åt sidorna, så att ingen väg bara går snett förbi en hörna
function nas(s: State, z: Zone, extra: number) {
  const fore = nadda(s), efter = nadda(s, extra), g = groundOf(s), hinder = stationRutor(s).hinder;
  if (efter.n < fore.n - fore.sedd[extra]) return false;
  for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) {
    const i = y * W + x;
    if (!inZone(z, x, y) || g.tiles[i] === T.Vatten || g.solid?.[i]) continue; // en vägg (förrådshusets golv har inga)
    if (!hinder[i] && i !== extra) { if (!efter.sedd[i]) return false; continue; }
    if (!GRANNAR.some(([dx, dy]) => efter.sedd[(y + dy) * W + x + dx])) return false;
  }
  return true;
}
// platsen för en möbel av sorten k: i en lagerplats under tak, efter lagrets prioritet och närmast lagrets hörn
function siteForvar(s: State, k: string) {
  const zs = zonesOf(s), c = golvet(s, k).sort((a, b) => ((b.z.prio ?? 0) - (a.z.prio ?? 0)) || zs.indexOf(a.z) - zs.indexOf(b.z) || a.y - b.y || a.x - b.x);
  const at = c.find(q => nas(s, q.z, q.y * W + q.x));
  return at && { x: at.x, y: at.y, rot: undefined, inne: 1 as const };
}
// där man står när man bygger en möbel som inte går att gå igenom: mitt på en ruta rakt bredvid som man kan gå på
function bredvid(s: State, x: number, y: number) {
  const g = groundOf(s), hinder = stationRutor(s).hinder;
  const r = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(([dx, dy]) => ({ x: x + dx, y: y + dy })).find(q => q.x >= 0 && q.y >= 0 && q.x < W && q.y < H && g.tiles[q.y * W + q.x] !== T.Vatten && !g.solid?.[q.y * W + q.x] && !hinder[q.y * W + q.x]) ?? { x, y };
  return { x: r.x + 0.5, y: r.y + 0.5 };
}
// en möbel som inte längre står i en lagerplats (lagret i ett hus som fått en annan funktion) tas isär, och likaså en som
// stänger in något (ställd där före v78, eller ett hus byggdes bredvid den) så att ingen stängs ute
function utanLager(s: State) {
  const fv = stationerOf(s).filter(t => stationDef(t.k)?.forvar), alla = fv.length ? nadda(s) : undefined;
  const stanger = (t: Station) => nadda(s, -1, t.y * W + t.x).n > alla!.n + 1;
  const borta = fv.filter(t => zoneAt(s, t.x, t.y) < 0 || stanger(t));
  if (!borta.length) return;
  s.stationer = stationerOf(s).filter(t => !borta.includes(t));
  s.byggV = (s.byggV ?? 0) + 1;
  for (const t of borta) if (stationDef(t.k)!.forvar!.redskap) stallBorta(s, t.x, t.y);
  for (const t of borta) log(s, `${stationDef(t.k)!.namn} togs isär ${zoneAt(s, t.x, t.y) < 0 ? 'när lagret flyttades' : 'eftersom den stängde in en del av lagret'}.`, 'world');
}

// en station som står inne (inte en bädd) som byn vill bygga men inte har plats för i något hus (steg 2.2.17): någon kan
// tekniken, byn har ingen och ingen är påbörjad. Då planerar byn en verkstad åt den (BYGGNADER i byggnader.ts)
export function inneUtanPlats(s: State): StationSlag | undefined {
  return STATION_LIST.find(k => {
    const d: StationDef = STATIONER[k];
    return d.inne && !d.sover && !harStation(s, k) && !halvbyggd(s, k) && living(s).some(p => d.tek.some(t => knows(p, t))) && !stationSite(s, k);
  });
}
// rummet där en station som står inne står
export const stationRum = (s: State, t: Station): Rum | undefined => t.inne ? roomAt(s, t.x, t.y) : undefined;

// ---------- att bygga en station ----------
const sparas = (k: string) => k === 'ved' ? RESERV.ved : k === 'grenar' ? RESERV.grenar : k === 'torrgras' ? RESERV.torrgras : 0;
const halvbyggd = (s: State, k: string) => stationerOf(s).find(t => t.k === k && !isKlar(t));
// den station p vill bygga: p kan någon av teknikerna (brasan kräver ingen, bara att man är minst ALDER.ansvar), byn har ingen färdig av slaget, ingen annan bygger en, och den är påbörjad
// eller p kan få tag i materialet utan att ta det som sparas till elden
export const stationAttBygga = (s: State, p: Person): StationSlag | undefined => STATION_LIST.find(k => kanBygga(s, p, k));
// p kan bygga (eller bygga vidare på) en station av sorten k som byn saknar (det byn kan ha flera av: om projektet säger att byn
// saknar fler, projekt.ts)
export function kanBygga(s: State, p: Person, k: StationSlag) {
  const d: StationDef = STATIONER[k];
  if (doingAct(s, 'station', p) || (d.brasa ? ageOf(p, s.now) < ALDER.ansvar : !d.tek.some(k => knows(p, k))) || !d.flera && harStation(s, k) || d.verktyg && !freeTools(s, p, d.verktyg)) return false;
  return !!halvbyggd(s, k) || Object.entries(d.av).every(([m, n]) => getable(s, p, m) >= n + sparas(m)) && !!stationSite(s, k);
}
// byn har en färdig station av sorten k
export const harStation = (s: State, k: string) => stationerOf(s).some(t => t.k === k && isKlar(t));
// platsen dit den som ska bygga går: den halvbyggda stationen, annars rutan där den ska stå
export function stationSpot(s: State, k: string) {
  const t = halvbyggd(s, k), at = t ?? stationSite(s, k);
  if (at && stationDef(k)?.forvar) return bredvid(s, at.x, at.y);
  return at ? vidStation({ id: 0, k, kvar: 1, x: at.x, y: at.y, rot: at.rot }) : undefined;
}
// framme: bygg vidare på den halvbyggda, eller ta materialet och börja. Saknas materialet eller platsen blir det inget
export function startStation(s: State, p: Person, tk: Task) {
  const k = tk.tool ?? '', d = stationDef(k);
  let t = halvbyggd(s, k);
  if (d && !t && (d.flera || !stationerOf(s).some(q => q.k === k))) {
    const at = stationSite(s, k);
    if (at && Object.entries(d.av).every(([m, n]) => getable(s, p, m) >= n)) {
      for (const [m, n] of Object.entries(d.av)) takeMaterial(s, p, m, n);
      t = { id: s.nextStation = (s.nextStation ?? 0) + 1, k, x: at.x, y: at.y, kvar: d.min * MIN };
      if (at.rot) t.rot = 1;
      if ('inne' in at) t.inne = 1;
      (s.stationer ??= []).push(t);
      s.byggV = (s.byggV ?? 0) + 1; // en ny sak på kartan: vägarna och platserna räknas om
    }
  } else if (t) count(s, 'fortsatt');
  if (!t) { tk.ref = undefined; tk.until = s.now; return; }
  if (!t.vem?.includes(p.id)) (t.vem ??= []).push(p.id);
  tk.ref = t.id; tk.until = s.now + t.kvar;
}
// medan man bygger
export function workStation(s: State, _p: Person, tk: Task, dtSec: number) {
  const t = stationById(s, tk.ref);
  if (t) t.kvar = Math.max(0, t.kvar - dtSec * SEC);
}
// klar: första gången står det i loggen
export function finishStation(s: State, p: Person, tk: Task) {
  const t = stationById(s, tk.ref);
  if (!t || t.kvar > MIN) return;
  t.kvar = 0; t.klar = s.now;
  if (stationDef(t.k)?.sover) touch(s); // en ny sovplats: var man sover räknas om
  const d = stationDef(t.k)!;
  if (d.mobel) nyKvalitet(s, p, t, false, d.namn.toLowerCase()); // möblerna har kvalitet, stationerna inte (kvalitet.ts)
  if (d.verktyg && wearTool(s, p, d.verktyg, STATION.latrinSpade)) { const tr = SAKER[d.verktyg]?.trasig; if (tr) count(s, tr.stat); } // benspaden slits för varje grop
  if (forstaGang(s, 'station_' + t.k)) { log(s, d.forsta.replace('{namn}', p.name), 'world', [p.id]); p.fame.push(`Byggde byns första ${d.namn.toLowerCase()}`); }
  fyllPlatser(s);
}

// ---------- borden (steg 2.2.15) ----------
// Ett bord har stubbar att sitta på runt sig (platser i registret): en på varje ruta längs de sidor som är minst två rutor
// långa. Det lilla bordet (2 × 1 rutor) har fyra platser på långsidorna, bordet (2 × 2) åtta, två på varje sida, och
// långbordet (3 × 2) tio. Stubbarna hör till bordet: de byggs med det och inget annat får stå där. Bordet står ute nära
// elden tills husen har plats för det (2.2.17). Den som är hungrig går till en ledig plats och äter där (måltiden i val.ts,
// MAT i behov.ts) och blir glad av det, och vid bordet samtalar man (spotFor i val.ts). Byn bygger bord så länge någon saknar
// en plats, och den storlek som räcker åt dem som saknar (bordStorlek, projekt.ts)
export function bordPlatser(t: { k: string; x: number; y: number; rot?: unknown }) {
  if (!stationDef(t.k)?.platser) return [];
  const { w, h } = storlekAv(t), ut: { x: number; y: number }[] = [];
  if (w >= 2) for (let i = 0; i < w; i++) ut.push({ x: t.x + i, y: t.y - 1 }, { x: t.x + i, y: t.y + h });
  if (h >= 2) for (let j = 0; j < h; j++) ut.push({ x: t.x - 1, y: t.y + j }, { x: t.x + w, y: t.y + j });
  return ut;
}
// så många platser ett bord av sorten k har
export const platserAv = (k: string) => { const d = stationDef(k); return !d?.platser ? 0 : (d.w >= 2 ? 2 * d.w : 0) + (d.h >= 2 ? 2 * d.h : 0); };
// de färdiga borden, och alla platser vid dem
export const bordenOf = (s: State) => stationerOf(s).filter(t => isKlar(t) && stationDef(t.k)?.platser);
export const allaPlatser = (s: State) => bordenOf(s).reduce((n, t) => n + platserAv(t.k), 0);
// handlingarna man gör sittande vid bordet
const VID_BORDET = new Set<Act>(['maltid', 'samtal', 'beratta']);
// den lediga plats vid ett bord som ligger närmast p (mitt på stubben): ingen annan sitter där eller är på väg dit
export function ledigPlats(s: State, p: Person) {
  const borden = bordenOf(s);
  if (!borden.length) return undefined;
  const tagen = new Set<number>();
  for (const q of living(s)) if (q !== p && q.task && VID_BORDET.has(q.task.act)) tagen.add(Math.floor(q.task.ty) * W + Math.floor(q.task.tx));
  let best: { x: number; y: number } | undefined, bd = Infinity;
  for (const t of borden) for (const q of bordPlatser(t)) {
    const d = Math.hypot(q.x + 0.5 - p.x, q.y + 0.5 - p.y);
    if (d < bd && !tagen.has(q.y * W + q.x)) { bd = d; best = { x: q.x + 0.5, y: q.y + 0.5 }; }
  }
  return best;
}
// sitter p vid bordet och äter (handlingen maltid, framme)?
export const vidBordet = (p: Person) => p.task?.act === 'maltid' && p.task.phase === 'do';
// bordet som den som äter sitter vid (ett finare bord gör måltiden trevligare, kvalitet.ts)
export function bordVid(s: State, p: Person) {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const t = stationAt(s, p.x + dx, p.y + dy); if (t && stationDef(t.k)?.platser) return t; }
  return undefined;
}
// den storlek byn vill bygga: den minsta som räcker åt alla som saknar en plats, annars den största. Ingen när alla har en
const BORD_LIST = STATION_LIST.filter(k => platserAv(k) > 0).sort((a, b) => platserAv(a) - platserAv(b));
export function bordStorlek(s: State): StationSlag | undefined {
  const fattas = living(s).length - allaPlatser(s);
  if (fattas <= 0) return undefined;
  return BORD_LIST.find(k => platserAv(k) >= fattas) ?? BORD_LIST[BORD_LIST.length - 1];
}
// hur stor del av byn som saknar en plats vid ett bord, för den storlek som ska byggas (0 för de andra)
export function bordBrist(s: State, k: string) {
  const n = living(s).length;
  return n && k === bordStorlek(s) ? Math.min(1, (n - allaPlatser(s)) / n) : 0;
}

// ---------- tillbehören (steg 2.2.14) ----------
// Ett tillbehör görs till en färdig station eller möbel och ligger sedan i den (Station.med): skinnfällen är ett täcke i
// halmbädden, och den som sover under den fryser mindre. Varje sort är en rad i registret TILLBEHOR: vilken station den hör
// till (till), tekniken man måste kunna (tek, samma id som tillbehöret, teknik.ts), materialet (av) och minuterna (min), och
// vad den gör (varme: så mycket mindre kyla för den som sover i möbeln). Den görs i handlingen tillbehor (task.tool = sorten)
// av den som har tid för handarbete, när projektet säger att byn har möbler som saknar den (projekt.ts). Materialet tas
// när arbetet är klart, så att inget går förlorat om det avbryts. Rivs huset försvinner tillbehöret med möbeln.
export interface TillbehorDef { namn: string; ikon: string; till: string; tek: string[]; av: Record<string, number>; min: number; varme?: number; gor: string; forsta: string }
export const TILLBEHOR = {
  skinnfall: {
    namn: 'Skinnfäll', ikon: 'skinnfall', till: 'halmbadd', tek: ['skinnfall'], av: { skinn: STATION.fallSkinn }, min: STATION.fallMin, varme: STATION.fallVarme,
    gor: 'Lägger en skinnfäll i halmbädden.',
    forsta: '{namn} lade byns första skinnfäll i en halmbädd. Den som sover under den fryser mindre.',
  },
} satisfies Record<string, TillbehorDef>;
export type TillbehorSlag = keyof typeof TILLBEHOR;
export const TILLBEHOR_LIST = Object.keys(TILLBEHOR) as TillbehorSlag[];
export const tillbehorDef = (k: string): TillbehorDef | undefined => (TILLBEHOR as Record<string, TillbehorDef>)[k];
// de färdiga stationer som tillbehöret hör till, och de av dem som saknar det
export const tillbehorStationer = (s: State, k: TillbehorSlag) => stationerOf(s).filter(t => isKlar(t) && t.k === TILLBEHOR[k].till);
export const utanTillbehor = (s: State, k: TillbehorSlag) => tillbehorStationer(s, k).filter(t => !t.med?.includes(k));
// p kan göra tillbehöret: p kan tekniken, det finns fler stationer som saknar det än de som redan gör det, och p kan få tag i
// materialet
export function kanGoraTillbehor(s: State, p: Person, k: TillbehorSlag) {
  const d: TillbehorDef = TILLBEHOR[k];
  if (!d.tek.some(t => knows(p, t))) return false;
  const gor = doingAct(s, 'tillbehor', p) ? 1 : 0, utan = utanTillbehor(s, k).length;
  return utan > gor && Object.entries(d.av).every(([m, n]) => getable(s, p, m) >= n + sparas(m));
}
// platsen dit den som gör tillbehöret går: framför den första stationen som saknar det
export function tillbehorSpot(s: State, k: TillbehorSlag) {
  const t = utanTillbehor(s, k)[0];
  return t ? vidStation(t) : undefined;
}
// klart: materialet tas och tillbehöret läggs i den första stationen som saknar det (har någon annan hunnit före blir det
// nästa, och saknar ingen det längre blir det inget)
export function finishTillbehor(s: State, p: Person, tk: Task) {
  const k = tk.tool as TillbehorSlag, d = tillbehorDef(k);
  if (!d) return;
  const t = utanTillbehor(s, k)[0];
  if (!t || !Object.entries(d.av).every(([m, n]) => getable(s, p, m) >= n)) return;
  for (const [m, n] of Object.entries(d.av)) takeMaterial(s, p, m, n);
  (t.med ??= []).push(k);
  // byns statistik räknar dem (tillbehor_ + sorten), och den första står i loggen
  if (forstaGang(s, 'tillbehor_' + k)) { log(s, d.forsta.replace('{namn}', p.name), 'world', [p.id]); p.fame.push(`Gjorde byns första ${d.namn.toLowerCase()}`); }
}
// så mycket mindre kyla p får av tillbehören i möbeln hen sover i (0 = ingen skillnad), rum = rummet hen är i
export function tillbehorVarme(s: State, p: Person, rum: unknown) {
  const pd = p.task && ACTS[p.task.act];
  if (!rum || !s.stationer?.length || !pd?.vila || pd.plats !== 'sang' || p.task!.phase !== 'do') return 0;
  const t = stationRutor(s).at.get(tileOf(p.x, p.y));
  let v = 0;
  for (const k of t && isKlar(t) ? t.med ?? [] : []) v = Math.max(v, tillbehorDef(k)?.varme ?? 0);
  return v;
}

// ---------- redskapsplatserna (knivplatsen, bensylen) ----------
// redskapen av slaget k som hör till stationen
export const redskapVid = (s: State, t: Station, k: string) => tingOf(s).filter(q => q.vid === t.id && q.k === k);
const platserFor = (t: Station, k: string) => stationDef(t.k)?.vid?.[k] ?? 0;
// så många platser för redskap av slaget k som står tomma i byns färdiga stationer
export function tommaPlatser(s: State, k: string) {
  let n = 0;
  for (const t of stationerOf(s)) if (isKlar(t)) n += Math.max(0, platserFor(t, k) - redskapVid(s, t, k).length);
  return n;
}
export const tommaKnivplatser = (s: State) => tommaPlatser(s, 'kniv');
// den första färdiga station som har en tom plats för slaget k
const tomPlats = (s: State, k: string) => stationerOf(s).find(t => isKlar(t) && redskapVid(s, t, k).length < platserFor(t, k));
// slagen som har en plats vid någon station
const VID_SLAG = [...new Set(STATION_LIST.flatMap(k => Object.keys((STATIONER[k] as StationDef).vid ?? {})))];
// ett redskap blir stationens: det är byns och ligger vid stationen när ingen använder det
function tillStation(k: Ting, t: Station) {
  k.vid = t.id; k.agare = BYN;
  if (k.hos === undefined && k.lass === undefined) { k.x = t.x; k.y = t.y; }
}
// ett nytt redskap läggs vid stationen om en plats för det står tom (redskap.ts, toolDone). true = det lades där
export function nyttVid(s: State, k: Ting) {
  const t = tomPlats(s, k.k);
  if (!t) return false;
  tillStation(k, t);
  return true;
}
// en tom plats fylls med ett av byns redskap av det slaget som ligger i förrådet
export function fyllPlatser(s: State) {
  for (const slag of VID_SLAG) for (let t = tomPlats(s, slag); t; t = tomPlats(s, slag)) {
    const k = tingOf(s).find(q => q.k === slag && q.agare === BYN && q.vid === undefined && q.hos === undefined && q.lass === undefined && q.bar === undefined);
    if (!k) break;
    tillStation(k, t);
  }
}
// ett redskap som hör till en station och som ingen har i handen läggs tillbaka där (lager.ts, placeTools). true = det ligger där.
// Finns inte stationen längre hör det inte till någon
export function tillbakaVid(s: State, k: Ting) {
  if (k.vid === undefined) return false;
  const t = stationById(s, k.vid);
  if (!t) { k.vid = undefined; return false; }
  k.x = t.x; k.y = t.y;
  return true;
}
// handlingen act är gjord en gång vid stationen: redskapet den kräver (kraver) slits så mycket. true = det gick sönder
export function slitVid(s: State, act: Act, v: number) {
  const t = stationFor(s, act), k = t && stationDef(t.k)?.kraver?.[act];
  const r = k ? redskapVid(s, t, k).sort((a, b) => a.c - b.c)[0] : undefined;
  if (!r) return false;
  r.c -= v;
  if (r.c > 1e-9) return false;
  s.ting = tingOf(s).filter(q => q !== r);
  const tr = SAKER[r.k]?.trasig;
  if (tr) count(s, tr.stat);
  return true;
}
// en station som bara får stå inne (inne i registret) men står ute, t.ex. en slöjdbänk byggd före v59, bärs in i ett hus
// när det finns plats och ingen arbetar vid den (Björn, efter v64). Kniven som hör till den följer med
function barIn(s: State) {
  for (const t of s.stationer ?? []) {
    const d = stationDef(t.k);
    if (!d?.inne || t.inne || !isKlar(t) || d.gor.some(a => doingAct(s, a))) continue;
    const at = siteInne(s, t.k);
    if (!at) continue;
    t.x = at.x; t.y = at.y; t.inne = 1;
    if (at.rot) t.rot = 1; else delete t.rot;
    for (const k of tingOf(s)) if (k.vid === t.id && k.hos === undefined && k.lass === undefined) { k.x = t.x; k.y = t.y; }
    s.byggV = (s.byggV ?? 0) + 1; // stationen står på ett nytt ställe: vägarna och platserna räknas om
    log(s, `${d.namn}en bars in i ${husById(s, stationRum(s, t)?.hus ?? -1)?.namn ?? 'ett hus'}.`, 'world');
  }
}
// varje timme: tomma redskapsplatser fylls, en station som ska stå inne men står ute bärs in, och det som stod inne i ett hus
// som rivits försvinner
export function stepStationer(s: State) {
  if (!s.stationer?.length) return;
  fyllPlatser(s);
  barIn(s);
  utanLager(s);
  const borta = s.stationer.filter(t => t.inne && !stationRum(s, t));
  if (!borta.length) return;
  s.stationer = s.stationer.filter(t => !borta.includes(t));
  for (const k of tingOf(s)) if (borta.some(t => t.id === k.vid)) k.vid = undefined;
  for (const t of borta) if (stationDef(t.k)?.forvar?.redskap) stallBorta(s, t.x, t.y); // redskapen i ett ställ läggs om, ett per ruta
  touch(s);
  for (const t of borta) log(s, `${stationDef(t.k)?.namn ?? 'En station'} försvann när huset revs.`, 'world');
}
