import { bynsMitt, omrade, tillHoljet, utanforByn } from './omrade';
import { RECEPT, type ReceptRad } from './recept';
import { hash3 } from './slump';
import { Act, DAY, GRANNAR4, H, HOUR, MIN, Person, SEC, State, T, Task, W, inMap } from './typer';
import { eldPlats, getMap } from './karta';
import { knows } from './teknik';
import { ALDER, ageOf, alive, byId, count, doingAct, familjOf, forstaGang, gjort, living, log } from './folk';
import { enOrd, han, hans, sinOrd, stor } from './ord';
import { getable, Recept, takeMaterial } from './behov';
import { sparas } from './forradsmal';
import { Ting, freeTools, nTools, tingOf, wearTool } from './agande';
import { BYN } from './egendom';
import { Zone, flyttaLager, inZone, pilesInne, put, stallBorta, usable, zoneAt, zonesOf } from './lager';
import { PLATS } from './plats';
import { balans } from './balans';
import { Hus, Rum, bitAt, blocked, gridOf, housesOf, husById, roofed, roomAt, touch } from './byggnad';
import { HUS, bedTile, fnOf, rumFnOf, samlingRum, sovHus, sovKvar, sovPlats } from './byggnader';
import { coldOf, nederbord, temperature } from './vader';
import { ACTS } from './handlingar';
import { SAKER, isTool } from './saker';
import { kvHaller, nyKvalitet } from './kvalitet';
import { groundOf, tileOf } from './mark';
import { FOREST } from './vag';
import { brasaMal, nyEld } from './brasor';
import { underMinnet } from './sjo';
import { paStrak } from './strak';

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
  kvLite: 0.1, kvMer: 0.2, // hur mycket bättre det som görs vid stationen blir (steg 9.4.9, kv i STATIONER): slöjdbänken, örtköket och fångstbänken lite, snickarbänken mer
  // dragningen mot mitten (steg 9.4.8): hur mycket en station ute används glöms på brukatDygn dygn; att flytta den är värt det
  // gånger hur många rutor närmare dem som använder den, delat med flyttFull, och den nya platsen ligger minst flyttMinste närmare
  brukatDygn: 3, flyttFull: 60, flyttMin: 15, flyttMinste: 3,
  bordUte: 20, // när det är kallt eller regnar är ett bord ute så här många rutor längre bort än ett inne (steg 7.2.8)
  avstand: 2.5, // en station ute står helst så här många rutor utanför det byn omsluter (tillHoljet i omrade.ts), från stationens mitt
  slaktTill: 9, slaktAvst: 6, // slaktbänken står högst och helst så här många rutor från byn, eftersom den är smutsig (steg 2.10.16)
  utkantMin: 1, // det som står i byns utkant står aldrig närmare byns område än så här (om ingen plats längre bort är ledig, t.ex. för skogen)
  knivplatser: 1, // så många knivar som ligger kvar vid slaktbänken
  repFart: 2, // rep tvinnas så här många gånger fortare vid slöjdbänken än för hand ...
  redskapFart: 1.25, // ... och de enkla redskapen görs så här många gånger fortare där (Björn, efter v90) ...
  vidBank: 1.5, // ... av den som står så här nära bänken (rutor)
  vriden: 0.5, // en station som står vriden får så här många poäng (färre är bättre), så att den helst står som i registret
  badd: 0.1, // inne: så här många poäng mindre för varje sida som står mot en vägg ...
  dorr: 1, // ... och så här många fler för varje ruta bredvid en öppning, där man går in
  gangMin: 3, gangSok: 6, // en station ute får stå i en gång mellan husen (väggar på båda sidor, högst gangSok rutor bort) bara om gången är minst gangMin bred, och då mot en vägg med husMellan fritt bredvid (steg 4.5.4.5)
  uteVagg: 0.6, // ute: så här många poäng mindre för varje ruta som står mot en husvägg (Björn efter v101: stationerna står snyggt mot väggarna)
  samling: 1, // ... och så här många mindre i ett hus där ingen sover (samlingshuset), för det som inte är en bädd
  fallVarme: 0.5, // den som sover under en skinnfäll kyls så här mycket mindre (av det som når in i huset)
  // förvaringen (steg 2.3.6): hyllan, kistan och redskapsstället
  hyllaRymmer: 3, // ... och rymmer så många högar av ett slag
  kistaRymmer: 2, // ... och så många högar (en gammal kista i lagret). Det som ligger i den slits som under tak
  kistaVill: 2, kistaTing: 6, // den som har så många egna redskap och kläder som ingen använder vill ha en kista, och den rymmer så många (steg 2.10.18)
  stallRymmer: 4, // ... och så många redskap
  forvarFulla: 6, // byn vill ha en hylla eller kista fullt ut när så många fulla högar ligger på golvet i lagren ...
  forvarLosa: 4, // ... och ett ställ när så många redskap ligger på golvet ...
  forvarAndel: 0.5, forvarAndelFull: 0.9, // ... och en hylla redan när golvet i förrådshusen börjar bli fullt: från så stor andel av golvet med högar, fullt ut vid den andra (steg 4.5.4.6)
  // latrinen (steg 2.7.2): en grävd grop i byns utkant
  latrinSpade: 0.1, // benspaden slits så här mycket för varje latringrop som grävs (RT.latrinMin i recept.ts) (tio gropar per spade)
  latrinRymmer: 150, // så många toabesök ryms i gropen innan den är full och fylls igen
  latrinNy: 0.85, // byn gräver en ny när den den har är så här full
  latrinTill: 10, // gropen ligger högst så här många rutor från byn (lägret och husen) ... (Björn efter v107: alltid ganska långt bort, steg 2.10.21)
  latrinAvst: 5, // ... och minst så här långt; helst ligger den latrinMal rutor från byns område (steg 4.5.4.5: lika långt som de närmaste fälten; fälten får ligga längre bort sedan steg 6.2.9) ...
  latrinMal: 8,
  latrinVatten: 8, // ... och, när byn lärt sig att smutsen når vattnet (s.hygien), helst så här många rutor från vattnet ...
  latrinVattenPoang: 1, // ... med så här många poäng (färre är bättre) för varje ruta för nära, gånger s.hygien
  // grillställningen (steg 2.8.1, matlagning.ts): grenar och rep över elden
  // torkställningen (steg 2.8.2, matlagning.ts): två A av grenar och en slå, surrade med rep
  // en lägereld till (steg 2.9.1, 4.5.6.8, brasor.ts): en ring av stenar
  brasaFran: 2.5, // lägerelden ligger helst så här många rutor från mitten av sovplatserna den är till för ...
  brasaSok: 4, // ... och högst så här många rutor därifrån
  // pyntet (steg 4.3.4, pynt.ts): möbler som bara är till för att pynta, i rummet där ägaren sover
});

// namn och ikon (ikoner.ts; kartans bild uppifrån heter ikon_karta), w och h = rutorna den tar (bredd och djup), tek = teknikerna, och den som kan någon av dem bygger den, av = materialet, min = minuters arbete,
// gor = handlingarna som görs vid den, bara = de av dem som inte görs alls utan stationen, vid = redskapen som hör till den
// (slag och antal), kraver = handlingar som bara görs när ett av stationens redskap ligger där, bygger = texten för den som bygger,
// forsta = loggen när byn fått sin första, inne = står inne i ett hus, mobel = en möbel, flera = byn kan ha flera, sover = en sovplats
// (halmbädden), sitt = en sittplats framför den (bara utseende, steg 2.2.5), platser = ett bord med stubbar att sitta på runt
// det (steg 2.2.15), verktyg = redskapet man bygger den med (benspaden till latrinen, steg 2.7.2), utkant = står i byns utkant, högst till och helst avst rutor från byn,
// och med vatten långt från vattnet när byn lärt sig det (latrinen och slaktbänken, siteUtkant nedan), eld = står över elden, med elden i mitten, och används bara när den brinner (grillen, steg 2.8.1), forvar = förvaring som står i en lagerplats (steg 2.3.6): rymmer så många högar av ett slag (gånger en
// rutas stack) eller, för redskap, så många redskap; tak = det som ligger där slits som under tak,
// stangd = det som ligger där syns inte på kartan, bara när man trycker på möbeln (kistan, Björn efter v92), privat = bara för
// privata saker (kistan, steg 2.10.18): byggs inte i byns lager utan av var och en i rummet där hen sover (kistorna nedan)
// pynt = bara till för att pynta (steg 4.3.4, pynt.ts): var och en bygger ett åt sig själv i rummet där hen sover, som kistan
// brasa = ringen till en lägereld till medan den läggs (steg 2.9.1, 4.5.6.8, brasor.ts): står nära sovplatserna den är till för (siteBrasa), och alla vuxna kan bygga den (tek är tom: den som är gammal nog att ta ansvar, ALDER.ansvar). När den är klar blir den en lägereld (nyEld) och ingen station
export interface Utkant { till: number; avst: number; vatten?: true; falt?: true; tradFri?: true } // tradFri: söker en plats utan träd (bara latrinen, steg 8.1.14)
export interface Forvar { rymmer: number; redskap?: true; tak?: true; stangd?: true; privat?: true }
export interface StationDel { namn: string; ikon?: string; w: number; h: number; arbete?: true } // en del i en station med delar (steg 9.4.1)
export interface StationDef { kv?: number; delar?: StationDel[]; hard?: true; namn: string; ett?: true; ikon: string; w: number; h: number; tek: string[]; av: Record<string, number>; min: number; gor: Act[]; bara?: Act[]; vid?: Record<string, number>; verktyg?: string; utkant?: Utkant; eld?: true; kraver?: Partial<Record<Act, string>>; smutsar?: Partial<Record<Act, string>>; bygger: string; forsta: string; inne?: true; mobel?: true; flera?: true; fart?: Partial<Record<Act, number>>; brasa?: true; sover?: true; sitt?: true; platser?: true; forvar?: Forvar; pynt?: true; samtidigt?: number }
// de enkla redskapen: görs vid slöjdbänken om byn har en, lite fortare där (fart), annars vid elden som förut (Björn, efter v90)
const ENKLA: Act[] = ['yxa', 'kniv', 'bensyl', 'balte', 'boll', 'benflojt', 'fackla', 'talgljus', 'naverask', 'ogonlapp', 'nal'];
// träsakerna vid snickarbänken (steg 9.4.5): receptets kolumn bank säger var det görs fortare och bättre, bara att det bara görs
// där och kniv att det täljs med kniven på bänken. Handlingen som gör varje recept
const TRA_ACT: Partial<Record<keyof typeof RECEPT, Act>> = { leksak: 'gor_leksak', fiskespjut: 'spjut', flintspjut: 'spjut', metspo: 'metspo', slagtra: 'slagtra', mal: 'mal', trumma: 'trumma', slanda: 'slanda', pilar: 'gor_pilar', skold: 'skold', bage: 'bage', lyra: 'lyra', krycka: 'krycka', traben: 'traben', krok: 'krok' };
const traVid = (b: string, f: (r: ReceptRad) => boolean = () => true) => [...new Set((Object.keys(TRA_ACT) as (keyof typeof RECEPT)[]).filter(k => { const r: ReceptRad = RECEPT[k]; return r.bank === b && f(r); }).map(k => TRA_ACT[k]!))];
const SNICKAR = traVid('snickarbank');
export const STATIONER = {
  slaktbank: {
    namn: 'Slaktbänk', ikon: 'slaktbank', w: 3, h: 1, tek: ['slaktbank'], av: RECEPT.slaktbank.av, min: RECEPT.slaktbank.min, gor: ['slakta', 'rensa'], bara: ['slakta', 'rensa'], vid: { kniv: STATION.knivplatser }, smutsar: { slakta: 'blod' }, utkant: { till: STATION.slaktTill, avst: STATION.slaktAvst }, // står en bit från byn (steg 2.10.16) // blir blodig när det slaktas (blod.ts)
    bygger: 'Bygger en slaktbänk av virke.',
    forsta: '{namn} byggde byns första slaktbänk av virke. Där slaktas viltet och rensas fisken, och en kniv ligger kvar vid bänken.',
  },
  flatarbank: { // slöjdbänken: id:t är kvar från när den hette flätarbänken, så att sparade byar fungerar
    kv: STATION.kvLite, namn: 'Slöjdbänk', ikon: 'flatarbank', w: 2, h: 1, tek: ['flatarbank'], av: RECEPT.flatarbank.av, min: RECEPT.flatarbank.min, gor: ['tvinna', 'korg', 'rock', 'skor', 'byxor', 'mossa', 'snoskor', 'rustning', 'hjalm', 'slunga', 'horn', 'prastdrakt', 'tecken', 'mask', 'mantel', 'halsband', 'tunika', 'skjorta', 'kappa', 'sjal', 'axelrem', 'ryggsack', 'benspade', 'vattensack', 'nat', ...ENKLA], fart: { tvinna: STATION.repFart, ...Object.fromEntries(ENKLA.map(a => [a, STATION.redskapFart])) }, bara: ['korg', 'rock', 'skor', 'byxor', 'mossa', 'snoskor', 'halsband', 'tunika', 'skjorta', 'kappa', 'sjal', 'axelrem', 'ryggsack', 'benspade', 'vattensack', 'nat'], vid: { bensyl: 1 }, kraver: { rock: 'bensyl', skor: 'bensyl', ryggsack: 'bensyl', vattensack: 'bensyl' }, inne: true, sitt: true,
    bygger: 'Bygger en slöjdbänk av virke och grenar.',
    forsta: '{namn} byggde byns första slöjdbänk. Där tvinnas rep fortare än för hand och flätas korgar.', // och sys kläder med bensylen (steg 2.3.2)
  },
  // fångstbänken (steg 7.4.1): 3×2 rutor. Mjärdar, snaror och andra fällor görs bara här
  fangstbank: {
    kv: STATION.kvLite, namn: 'Fångstbänk', ikon: 'fangstbank', w: 3, h: 2, tek: ['fangstbank'], av: RECEPT.fangstbank.av, min: RECEPT.fangstbank.min, gor: ['mjarde', 'snara', 'grop'], bara: ['mjarde', 'snara', 'grop'],
    bygger: 'Bygger en fångstbänk av virke och grenar.',
    forsta: '{namn} byggde byns första fångstbänk. Där görs mjärdar och andra fällor.',
  },
  // stationerna i nivå 2 (steg 7.5.1)
  stenhuggarplats: {
    namn: 'Stenhuggarplats', ikon: 'stenhuggarplats', w: 3, h: 2, tek: ['stenhuggarplats'], av: RECEPT.stenhuggarplats.av, min: RECEPT.stenhuggarplats.min, gor: ['hugga_sten'], bara: ['hugga_sten'],
    bygger: 'Bygger en stenhuggarplats.', forsta: '{namn} byggde byns första stenhuggarplats.',
  },
  klyvplats: {
    namn: 'Klyvplats', ikon: 'klyvplats', w: 3, h: 1, tek: ['klyvplats'], av: RECEPT.klyvplats.av, min: RECEPT.klyvplats.min, gor: ['klyva_plank'], bara: ['klyva_plank'],
    bygger: 'Bygger en klyvplats.', forsta: '{namn} byggde byns första klyvplats. Där klyvs virket till plankor.',
  },
  // örtköket (steg 7.6.1): en egen liten eld, och varje recept tar 1 ved som bränsle (i receptet)
  // örtköket i tre delar (steg 9.4.3, förebilden är örtkökets version 2 i bildstilen): härden med krukan över elden, torkstället
  // med örterna och bänken med morteln, där man arbetar. Det går att arbeta vid först när alla delar står i samma rum
  ortkok: {
    delar: [{ namn: 'Härden', ikon: 'ortkok_hard', w: 1, h: 2 }, { namn: 'Torkstället', ikon: 'ortkok_tork', w: 1, h: 2 }, { namn: 'Bänken', ikon: 'ortkok_bank', w: 1, h: 2, arbete: true }],
    kv: STATION.kvLite, namn: 'Örtkök', ikon: 'ortkok', w: 3, h: 2, tek: ['ortkok'], av: RECEPT.ortkok.av, min: RECEPT.ortkok.min, gor: ['koka_vatten', 'koka_te', 'koka_salva', 'koka_tjara', 'koka_lim', 'koka_tval', 'koka_rokelse', 'koka_olja'], fart: { koka_te: STATION.redskapFart, koka_vatten: STATION.redskapFart }, bara: ['koka_salva', 'koka_tjara', 'koka_lim', 'koka_tval'],
    bygger: 'Bygger ett örtkök.', forsta: '{namn} byggde byns första örtkök. Där kokas och blandas örter, talg och annat.',
  },
  // snickarbänken (steg 9.4.4): står inne som slöjdbänken och har en sittplats. Snickaren arbetar där (seder.ts)
  snickarbank: {
    kv: STATION.kvMer, namn: 'Snickarbänk', ikon: 'flatarbank', w: 2, h: 1, tek: ['snickarbank'], av: RECEPT.snickarbank.av, min: RECEPT.snickarbank.min, gor: SNICKAR, fart: Object.fromEntries(SNICKAR.map(a => [a, STATION.redskapFart])), bara: traVid('snickarbank', r => !!r.bara), vid: { kniv: 1 }, kraver: Object.fromEntries(traVid('snickarbank', r => !!r.kniv).map(a => [a, 'kniv'])), inne: true, sitt: true, // bilden är slöjdbänkens tills Björn valt i bildstilen
    bygger: 'Bygger en snickarbänk av virke och plankor.', forsta: '{namn} byggde byns första snickarbänk. Där görs träsakerna fortare och bättre.',
  },
  garvning: {
    namn: 'Garvningsställning', ikon: 'garvning', w: 2, h: 2, tek: ['garvning'], av: RECEPT.garvning.av, min: RECEPT.garvning.min, gor: ['garva'], bara: ['garva'],
    bygger: 'Sätter upp en garvningsställning.', forsta: '{namn} satte upp byns första garvningsställning. Där blir skinn till läder.',
  },
  vavstol: {
    namn: 'Vävstol', ikon: 'vavstol', w: 2, h: 1, tek: ['vavstol'], av: RECEPT.vavstol.av, min: RECEPT.vavstol.min, gor: ['vava', 'spinna', 'vava_ull', 'spinna_ull'], bara: ['vava', 'vava_ull'], vid: { slanda: 1 }, fart: { spinna: 2, spinna_ull: 2 }, // sländan läggs i vävstolen, och där spinns tråden fortare (steg 7.7.9)
    bygger: 'Bygger en vävstol.', forsta: '{namn} byggde byns första vävstol.',
  },
  // härden (steg 7.5.3): en eldstad inne i ett hus; när den är byggd blir den en eld som värmer huset (nyHard i brasor.ts)
  harden: {
    namn: 'Härd', ikon: 'harden', w: 2, h: 2, tek: ['harden'], av: RECEPT.harden.av, min: RECEPT.harden.min, gor: [], inne: true, hard: true,
    bygger: 'Lägger en härd av huggna stenar på golvet.', forsta: '{namn} lade byns första härd. Den värmer hela huset.',
  },
  halmbadd: {
    namn: 'Halmbädd', ikon: 'halmbadd', w: 2, h: 1, tek: ['halmbadd'], av: RECEPT.halmbadd.av, min: RECEPT.halmbadd.min, gor: [], inne: true, mobel: true, flera: true, sover: true,
    bygger: 'Bäddar en halmbädd av hö och grenar.',
    forsta: '{namn} gjorde byns första halmbädd. Den som sover i den vilar upp sig fortare.',
  },
  // borden (steg 2.2.15): tre storlekar av samma möbel och teknik. Byn bygger den storlek som räcker åt dem som saknar en plats
  bord: {
    namn: 'Litet bord', ett: true, ikon: 'bord', w: 2, h: 1, tek: ['bord'], av: RECEPT.bord.av, min: RECEPT.bord.min, gor: [], mobel: true, flera: true, platser: true,
    bygger: 'Bygger ett bord med stubbar att sitta på.',
    forsta: '{namn} byggde byns första bord, med stubbar att sitta på. Där äter man tillsammans och samtalar.',
  },
  bord2: {
    namn: 'Bord', ett: true, ikon: 'bord2', w: 2, h: 2, tek: ['bord'], av: RECEPT.bord2.av, min: RECEPT.bord2.min, gor: [], mobel: true, flera: true, platser: true,
    bygger: 'Bygger ett bord med åtta stubbar runt.',
    forsta: '{namn} byggde byns första fyrkantiga bord, med plats för åtta.',
  },
  bord3: {
    namn: 'Långbord', ett: true, ikon: 'bord3', w: 3, h: 2, tek: ['bord'], av: RECEPT.bord3.av, min: RECEPT.bord3.min, gor: [], mobel: true, flera: true, platser: true,
    bygger: 'Bygger ett långbord med tio stubbar runt.',
    forsta: '{namn} byggde byns första långbord, med plats för tio.',
  },
  // förvaringen (steg 2.3.6): står i en lagerplats, på en ruta där något redan ligger, och går inte att gå igenom
  hylla: {
    namn: 'Hylla', ikon: 'hylla', w: 1, h: 1, tek: ['hylla'], av: RECEPT.hylla.av, min: RECEPT.hylla.min, gor: [], mobel: true, flera: true, forvar: { rymmer: STATION.hyllaRymmer },
    bygger: 'Bygger en hylla av virke och rep i lagret.',
    forsta: '{namn} byggde byns första hylla. På den ryms flera högar på samma plats, så att lagret tar mindre plats.',
  },
  kista: {
    namn: 'Kista', ikon: 'kista', w: 1, h: 1, tek: ['hylla'], av: RECEPT.kista.av, min: RECEPT.kista.min, gor: [], mobel: true, flera: true, forvar: { rymmer: STATION.kistaRymmer, tak: true, stangd: true, privat: true },
    bygger: 'Bygger en kista åt sig själv, i rummet där man sover.',
    forsta: '{namn} byggde byns första kista, i rummet där {han} sover. Där ligger {hans} redskap och kläder när {han} inte använder dem, och de slits som under tak.',
  },
  stall: {
    namn: 'Redskapsställ', ett: true, ikon: 'stall', w: 1, h: 1, tek: ['hylla'], av: RECEPT.stall.av, min: RECEPT.stall.min, gor: [], mobel: true, flera: true, forvar: { rymmer: STATION.stallRymmer, redskap: true },
    bygger: 'Bygger ett ställ för redskap och vapen i lagret.',
    forsta: '{namn} byggde byns första ställ för redskap och vapen. Där står flera redskap på samma plats.',
  },
  // latrinen (steg 2.7.2, smuts.ts): en grop som grävs med benspaden i byns utkant. Där går man på toa, och när den är full fylls den igen
  kompost: { // steg 9.7.6 (rester.ts): sophögen blir en kompost, där resterna och latrinens innehåll mognar till färdig kompost
    namn: 'Kompost', ikon: 'kompost', w: 1, h: 1, tek: ['kompost'], av: RECEPT.kompost.av, min: RECEPT.kompost.min, gor: [], utkant: { tradFri: true, till: STATION.latrinTill, avst: STATION.latrinAvst, vatten: true, falt: true },
    bygger: 'Slår upp en kompost av lite trä vid sophögen.',
    forsta: '{namn} gjorde byns första kompost. Där blir resterna jord som gör fälten bördigare.',
  },
  latrin: {
    namn: 'Latrin', ikon: 'latrin', w: 1, h: 1, tek: ['latrin'], av: RECEPT.latrin.av, min: RECEPT.latrin.min, gor: ['toa'], verktyg: 'benspade', utkant: { tradFri: true, till: STATION.latrinTill, avst: STATION.latrinAvst, vatten: true, falt: true }, flera: true,
    bygger: 'Gräver en latrin med benspaden.',
    forsta: '{namn} grävde byns första latrin. Där går man på toa, så att smutsen hamnar på ett ställe.',
  },
  // grillställningen (steg 2.8.1, matlagning.ts): två klykor och ett spett med vev, tre rutor bred med elden i mitten
  grill: {
    namn: 'Grillställning', ikon: 'grill', w: 3, h: 1, tek: ['grill'], av: RECEPT.grill.av, min: RECEPT.grill.min, gor: ['grilla', 'steka'], bara: ['grilla', 'steka'], eld: true,
    bygger: 'Sätter upp en grillställning av grenar och rep över elden.',
    forsta: '{namn} satte upp byns första grillställning över elden. Där grillas köttet och fisken, och den grillade maten håller längre.',
  },
  // torkställningen (steg 2.8.2, matlagning.ts): en fiskhäck med A-ramar, två rutor bred, som sticker upp över raden ovanför
  bakugn: { // steg 9.6.23 (matlagning.ts): degen jäser och gräddas till bröd, med en egen eld av ved
    namn: 'Bakugn', ikon: 'bakugn', w: 2, h: 2, tek: ['bakugn'], av: RECEPT.bakugn.av, min: RECEPT.bakugn.min, gor: ['baka'], bara: ['baka'],
    bygger: 'Bygger en bakugn av sten och lera.',
    forsta: '{namn} byggde byns första bakugn. Där blir mjölet bröd, som håller länge.',
  },
  kvarnsten: { // steg 9.6.22: kornet mals till mjöl (tillverka.ts)
    namn: 'Kvarnsten', ikon: 'kvarnsten', w: 1, h: 1, tek: ['kvarnsten'], av: RECEPT.kvarnsten.av, min: RECEPT.kvarnsten.min, gor: ['mala_korn'], bara: ['mala_korn'],
    bygger: 'Lägger två huggna stenar till en kvarnsten.',
    forsta: '{namn} lade byns första kvarnsten. Där mals kornet till mjöl som går att spara.',
  },
  bryggkar: { // steg 9.6.12 (brygg.ts): ett urholkat stockkar med lock, där vinet och ölet jäser
    namn: 'Bryggkar', ikon: 'bryggkar', w: 1, h: 1, tek: ['bryggkar'], av: RECEPT.bryggkar.av, min: RECEPT.bryggkar.min, gor: ['brygga', 'tappa'], bara: ['brygga', 'tappa'],
    bygger: 'Hugger ur ett bryggkar av virke med yxan.',
    forsta: '{namn} högg ur byns första bryggkar. Där jäser bären till vin.',
  },
  rokeri: { // steg 9.6.8 (matlagning.ts): som torkställningen, men på ett dygn och i alla väder
    namn: 'Rökeri', ikon: 'rokeri', w: 2, h: 2, tek: ['rokeri'], av: RECEPT.rokeri.av, min: RECEPT.rokeri.min, gor: ['roka'], bara: ['roka'],
    bygger: 'Bygger ett rökeri av sten, grenar och lera.',
    forsta: '{namn} byggde byns första rökeri. Där röks köttet och fisken på ett dygn, också när det regnar.',
  },
  tork: {
    namn: 'Torkställning', ikon: 'tork', w: 2, h: 1, tek: ['tork'], av: RECEPT.tork.av, min: RECEPT.tork.min, gor: ['torka', 'malta'], bara: ['torka', 'malta'], flera: true,
    bygger: 'Sätter upp en torkställning av grenar och rep.',
    forsta: '{namn} satte upp byns första torkställning. Där torkar köttet och fisken som byn inte hinner äta, och det torkade håller länge.',
  },
  // en lägereld till (steg 2.9.1, 4.5.6.8, brasor.ts): ringen av stenar medan den läggs, nära hyddorna som ligger långt från
  // lägerelden. Klar är den en lägereld som den första (eld.ts) och ingen station
  brasa: {
    namn: 'Lägereld', ikon: 'lagereld', w: 1, h: 1, tek: [], av: RECEPT.brasa.av, min: RECEPT.brasa.min, gor: [], flera: true, brasa: true,
    bygger: 'Lägger en ring av stenar till en lägereld nära sovplatserna.',
    forsta: '{namn} lade en ring av stenar till ännu en lägereld, långt från den första och nära sovplatserna.',
  },
  // scenen (steg 4.3.2.2, framtradande.ts): ett golv av kluvna stockar ute i byn. Där uppträder man på kvällen när det
  // inte är kallt eller regnar, och där ligger byns instrument (vid), en plats för varje sort
  scen: {
    namn: 'Scen', ikon: 'scen', w: 3, h: 2, tek: ['scen'], av: RECEPT.scen.av, min: RECEPT.scen.min, gor: [], vid: { trumma: 1, benflojt: 1, lyra: 1 },
    bygger: 'Lägger kluvna stockar till en scen.',
    forsta: '{namn} byggde byns första scen. Där uppträder man på kvällen, och där ligger instrumenten.',
  },
  // pyntet (steg 4.3.4, pynt.ts): var och en bygger ett åt sig själv, i rummet där hen sover, och sorten följer smaken
  // (pyntSort). Ägaren trivs där, och de som ser det tycker bättre om hen, mer ju finare det är

  bonad: {
    namn: 'Bonad', ikon: 'bonad', w: 1, h: 1, tek: ['bonad'], av: RECEPT.bonad.av, min: RECEPT.bonad.min, gor: [], inne: true, mobel: true, flera: true, pynt: true,
    bygger: 'Ritar ett mönster på ett skinn och hänger upp det som en bonad.',
    forsta: '{namn} hängde upp byns första bonad där {han} sover, ett skinn med ett mönster på. Den är bara till för att vara vacker.',
  },
  vaggbrade: {
    namn: 'Snidat väggbräde', ett: true, ikon: 'vaggbrade', w: 1, h: 1, tek: ['vaggbrade'], av: RECEPT.vaggbrade.av, min: RECEPT.vaggbrade.min, gor: [], inne: true, mobel: true, flera: true, pynt: true,
    bygger: 'Snidar mönster i ett bräde och sätter upp det på väggen.',
    forsta: '{namn} snidade byns första väggbräde och satte upp det där {han} sover. Det är bara till för att vara vackert.',
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
// ag = ägaren till en kista i sovrummet (steg 2.10.18)
export interface Station { kompost?: { rest: number; mogna: number }; deg?: { n: number; kvar: number; ag: Record<string, number> }; sats?: { v: 'vin' | 'ol'; n: number; jas: number; dygn: number; klar?: 1; sur?: 1 }; brygt?: number; brukat?: number; brukatT?: number; delar?: { x: number; y: number; rot?: 1 }[]; id: number; k: string; x: number; y: number; kvar: number; vem?: number[]; klar?: number; rot?: 1; inne?: 1; med?: string[]; fyllt?: number; q?: number; ber?: import('./berattelser').SakMinne; tork?: { k: string; n: number; t: number; ag?: Record<string, number> }[]; ag?: number }
const NONE: Station[] = [];
export const stationerOf = (s: State) => s.stationer ?? NONE;
export const stationById = (s: State, id?: number) => id === undefined ? undefined : stationerOf(s).find(t => t.id === id);
export const isKlar = (t: Station) => t.kvar <= 0;
// hur stor del av bygget som är gjort (0 till 1), för framstegscirkeln på kartan
export const stationKlar = (t: Station) => Math.min(1, Math.max(0, 1 - t.kvar / ((stationDef(t.k)?.min ?? 1) * MIN)));
// rutorna stationen tar (bredd och djup i registret, bytta när den står vriden; en okänd sort tar en ruta)
// En station med delar (steg 9.4.1) tar så mycket som delarna i en rad, bredvid varandra, när den byggs; står delarna sedan
// var för sig är storleken rutan runt dem alla (storlekAv), och t.x, t.y dess hörn uppe till vänster
export const storlek = (k: string, rot?: unknown) => {
  const d = stationDef(k);
  if (d?.delar) { const w = d.delar.reduce((n, q) => n + q.w, 0), h = Math.max(...d.delar.map(q => q.h)); return rot ? { w: h, h: w } : { w, h }; }
  const w = d?.w ?? 1, h = d?.h ?? 1; return rot ? { w: h, h: w } : { w, h };
};
export const storlekAv = (t: { k: string; rot?: unknown; delar?: Station['delar'] }) => {
  if (!t.delar?.length) return storlek(t.k, t.rot);
  const r = delarAv(t as Station);
  return { w: Math.max(...r.map(q => q.x + q.w)) - Math.min(...r.map(q => q.x)), h: Math.max(...r.map(q => q.y + q.h)) - Math.min(...r.map(q => q.y)) };
};
// ---------- stationer i flera delar (steg 9.4.1–9.4.2, "Stationer i flera delar" i designdokumentet) ----------
// Delarna står var för sig och var och en kan vridas; stationen byggs, flyttas och tas bort som en helhet. En station utan
// delar har en enda del: hela stationen. Delen med arbete är där man står och arbetar (annars den första)
export interface DelRuta { i: number; x: number; y: number; w: number; h: number; rot?: 1; del?: StationDel }
export function delarAv(t: Station): DelRuta[] {
  const d = stationDef(t.k);
  if (!d?.delar || !t.delar?.length) { const { w, h } = storlek(t.k, t.rot); return [{ i: 0, x: t.x, y: t.y, w, h, rot: t.rot }]; }
  return d.delar.map((del, i) => { const at = t.delar![i] ?? { x: t.x, y: t.y }, w = at.rot ? del.h : del.w, h = at.rot ? del.w : del.h; return { i, x: at.x, y: at.y, w, h, rot: at.rot, del }; });
}
// delarna i en rad från (x, y), som stationen byggs (åt höger, eller nedåt när den står vriden)
export function delarIRad(k: string, x: number, y: number, rot?: unknown): Station['delar'] {
  const d = stationDef(k);
  if (!d?.delar) return undefined;
  let o = 0;
  return d.delar.map(del => { const at = rot ? { x, y: y + o, rot: 1 as const } : { x: x + o, y }; o += rot ? del.h : del.w; return at; });
}
// hörnet uppe till vänster av rutan runt delarna
function horn(t: Station) { if (t.delar?.length) { const r = delarAv(t); t.x = Math.min(...r.map(q => q.x)); t.y = Math.min(...r.map(q => q.y)); } }
// delen man arbetar vid
export const arbetsDel = (t: Station) => { const r = delarAv(t); return r.find(q => q.del?.arbete) ?? r[0]; };
// är stationen hel: alla delar i samma rum (eller alla ute). Bara en hel station går att arbeta vid
export function helStation(s: State, t: Station) {
  if (!t.delar?.length) return true;
  const rum = delarAv(t).map(q => roomAt(s, q.x, q.y)?.id ?? -1);
  return rum.every(r => r === rum[0]);
}
// rutorna (index i kartan) som stationerna tar, och sovplatserna i de färdiga möbler man sover i (rutan uppe till vänster).
// Räknas om när något byggs (s.byggV)
// och borden: platserna runt dem (sitt, där inget annat får stå), och rutan framför en arbetsstation, där man står eller
// sitter när man arbetar (steg 3.6.6)
// och förvaringen (steg 2.3.6): rutorna som inte går att gå igenom (hinder, i vägsökningen i vag.ts), också medan den byggs
interface Rutor { v: number; n: number; at: Map<number, Station>; sov: Set<number>; sitt: Set<number>; hinder: Uint8Array }
const rutorCache = new WeakMap<State, Rutor>();
export function stationRutor(s: State): Rutor {
  const st = stationerOf(s), v = s.byggV ?? 0;
  let r = rutorCache.get(s);
  if (!r || r.v !== v || r.n !== st.length) {
    const at = new Map<number, Station>(), sov = new Set<number>(), sitt = new Set<number>(), hinder = new Uint8Array(W * H);
    for (const t of st) {
      const d = stationDef(t.k);
      for (const q of delarAv(t)) for (let j = 0; j < q.h; j++) for (let i = 0; i < q.w; i++) { at.set((q.y + j) * W + q.x + i, t); if (d?.forvar && t.ag === undefined) hinder[(q.y + j) * W + q.x + i] = 1; } // varje del för sig (steg 9.4.1)
      if (isKlar(t) && d?.sover) sov.add(t.y * W + t.x);
      for (const q of bordPlatser(t)) sitt.add(q.y * W + q.x);
      for (const q of framfor(t)) sitt.add(q.y * W + q.x);
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
// den färdiga station där handlingen görs, om byn har en. Med p: bara en station där det finns plats åt p (steg 4.5.3.6)
export const stationFor = (s: State, act: Act, p?: Person) => stationerOf(s).find(t => isKlar(t) && helStation(s, t) && stationDef(t.k)?.gor.includes(act) && framFri(s, t) && (!p || !upptagen(s, t, p))); // bara en hel station (steg 9.4.2)
// hur många som kan arbeta vid stationen samtidigt (steg 4.5.3.6): registrets `samtidigt`, annars en vid en arbetsstation
// (arbetsbänkarna) och hur många som helst vid de andra
const samtidigt = (d?: StationDef) => d?.samtidigt ?? (arbetar(d) ? 1 : Infinity);
// arbetar q vid stationen t, eller är på väg dit för att arbeta där?
function arbetarVid(t: Station, q: Person) {
  const k = q.task;
  if (!k || k.phase === 'back' || !stationDef(t.k)?.gor.includes(k.act)) return false;
  // platsen spotFor ger vid stationen (val.ts), också för den som först hämtar materialet till arbetet (k.site, steg 9.2.43)
  const at = vidStation(t), x = k.hamta && k.site ? k.site.x : k.tx, y = k.hamta && k.site ? k.site.y : k.ty;
  return Math.abs(y - at.y) < 0.3 && Math.abs(x - at.x) <= 0.3 * storlekAv(t).w + 0.05;
}
// är stationen full för p: arbetar så många andra där som får plats?
// fler som arbetar vid en station än det finns plats (steg 9.2.52, vakten i testerna): stationen och hur många, eller undefined
export function trangtVidStation(s: State): string | undefined {
  for (const t of stationerOf(s)) {
    const d = stationDef(t.k), n = living(s).filter(q => q.task?.phase === 'do' && arbetarVid(t, q)).length;
    if (n > samtidigt(d)) return `${d?.namn ?? t.k} vid ${t.x},${t.y}: ${n} arbetar, plats för ${samtidigt(d)}`;
  }
  return undefined;
}
export const upptagen = (s: State, t: Station, p?: Person) => living(s).filter(q => q !== p && arbetarVid(t, q)).length >= samtidigt(stationDef(t.k));
// rutorna framför en arbetsstation (steg 3.6.6): där står den som arbetar, och där får inget annat stå än sittplatsen.
// Inte förvaringen, sängarna, borden (stubbarna runt), grillen över elden eller en lägereld som läggs
const arbetar = (d?: StationDef) => !!d && d.gor.length > 0 && !d.forvar && !d.sover && !d.platser && !d.eld && !d.brasa;
export function framfor(t: Station) {
  if (!arbetar(stationDef(t.k))) return [];
  const { w, h } = storlekAv(t);
  return Array.from({ length: w }, (_, i) => ({ x: t.x + i, y: t.y + h }));
}
// står något framför stationen (en hög, ett redskap på marken eller en annan station)? Då kan den inte användas
export const framFri = (s: State, t: Station) => framfor(t).every(q => !(s.stackar ?? []).some(a => a.x === q.x && a.y === q.y)
  && !tingOf(s).some(k => k.x === q.x && k.y === q.y && k.hos === undefined && k.lass === undefined && k.bar === undefined && k.vid === undefined) && !stationAt(s, q.x, q.y)
  && inMap(q.x, q.y) && !blocked(s, q.x + 0.5, q.y + 0.5)); // inte i vattnet (eller översvämningen): då står man bredvid stationen (steg 4.5.4.3)
// står man framför stationen på land? Rutan där man arbetar får inte vara vatten (steg 4.5.4.3)
const framLand = (s: State, x: number, y: number, w: number, h: number) => Array.from({ length: w }, (_, i) => i).every(i => inMap(x + i, y + h) && getMap(s.seed).tiles[(y + h) * W + x + i] !== T.Vatten);
// handlingen görs bara vid en station (bara i registret)
const BARA = new Set<Act>(STATION_LIST.flatMap(k => (STATIONER[k] as StationDef).bara ?? []));
// handlingen kan göras: den kräver ingen station, eller byn har en färdig (och redskapet som handlingen kräver ligger där)
// (med p: och det finns plats åt p vid en av stationerna, steg 4.5.3.6)
export function kanGoras(s: State, act: Act, p?: Person) {
  if (!BARA.has(act)) return true;
  const t = stationFor(s, act, p), k = t && stationDef(t.k)?.kraver?.[act];
  return !!t && (!k || redskapVid(s, t, k).length > 0);
}
// platsen där man står och arbetar vid stationen: mitt för den på rutan söder om den
export const vidStation = (t: Station) => { if (t.delar?.length) { const q = arbetsDel(t); return { x: q.x + q.w / 2, y: q.y + q.h + 0.1 }; } const { w, h } = storlekAv(t); return { x: t.x + w / 2, y: t.y + h + 0.1 }; }; // framför delen man arbetar vid (steg 9.4.1)
// hur många gånger fortare p gör act just där hen står: stationens fart för den som står vid den, annars 1
// hur mycket bättre det p gör blir vid den station hen står vid (steg 9.4.9): stationens tal kv, annars 0
export const kvVid = (s: State, p: { x: number; y: number }, act: Act) => {
  const st = stationerOf(s).find(t => isKlar(t) && stationDef(t.k)?.gor.includes(act) && (at => Math.hypot(p.x - at.x, p.y - at.y) < STATION.vidBank)(vidStation(t)));
  return st ? stationDef(st.k)?.kv ?? 0 : 0;
};
export const fartVid = (s: State, p: { x: number; y: number }, act: Act) => {
  // vid den station p står vid (det kan finnas flera av samma sort, steg 4.5.3.6)
  const st = stationerOf(s).find(t => isKlar(t) && stationDef(t.k)?.fart?.[act] && (at => Math.hypot(p.x - at.x, p.y - at.y) < STATION.vidBank)(vidStation(t)));
  return st ? stationDef(st.k)!.fart![act]! : 1;
};

// ---------- var den står ----------
// en ruta där inget annat ligger eller står: inte på en lagerplats, ett hus, en stack, ett redskap, en stock eller en stubbe,
// och inte där byn minns att vattnet nådde (steg 3.8.7, flod.ts)
// somTomt: platsen för en station ute väljs som om lagerplatserna utanför husen inte fanns (steg 8.1.15); ligger lagret i
// vägen flyttas det när bygget börjar (startStation)
let somTomt = false;
const lagerRuta = (s: State, x: number, y: number) => zonesOf(s).some(z => (!somTomt || z.hus !== undefined) && x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h);
const iLagret = (s: State, x: number, y: number) => somTomt && zonesOf(s).some(z => z.hus === undefined && inZone(z, x, y));
function somUtanLager<T>(f: () => T): T { somTomt = true; try { return f(); } finally { somTomt = false; } }
export function ledig(s: State, x: number, y: number, upp?: Set<number>) {
  if (!usable(s, x, y) || underMinnet(s, y * W + x) || paStrak(s, x, y) || stationAt(s, x, y) || sittAt(s, x, y) || lagerRuta(s, x, y)) return false;
  if (iLagret(s, x, y)) return true; // det som ligger i lagret bärs bort med det
  if (upp) return !upp.has(y * W + x);
  return !((s.stackar ?? []).some(a => a.x === x && a.y === y) || tingOf(s).some(k => k.x === x && k.y === y) || (s.stockar ?? []).some(k => Math.floor(k.x) === x && Math.floor(k.y) === y) || (s.stubbar ?? []).some(k => k.x === x && k.y === y));
}
// rutorna där en stack, ett redskap, en stock eller en stubbe ligger, samlade en gång när en sökning prövar många rutor med
// ledig (samma svar som att gå igenom listorna för varje ruta, men utan att göra det tusentals gånger)
export function upptagna(s: State) {
  const u = new Set<number>();
  for (const a of s.stackar ?? []) u.add(a.y * W + a.x);
  for (const k of tingOf(s)) if (k.x !== undefined && k.y !== undefined) u.add(k.y * W + k.x);
  for (const k of s.stockar ?? []) u.add(Math.floor(k.y) * W + Math.floor(k.x));
  for (const k of s.stubbar ?? []) u.add(k.y * W + k.x);
  return u;
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
    if (!motVagg && g.at.has(i) || uteStation(s, x, y) || zs.some(z => (!somTomt || z.hus !== undefined) && x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h)) return false;
  }
  return true;
}
// ---------- inne i byn (steg 2.10.4) ----------
export interface Rekt { x: number; y: number; w: number; h: number }
// platsen för en station av sorten k: inne i ett hus om registret säger det, annars nära elden. Samma plats varje gång (ingen slump)
// borden och scenen står hellre i samlingssalen när den har plats (steg 7.2.7 och 7.2.8)
const siteSal = (s: State, k: string) => { const sal = (k === 'scen' || stationDef(k)?.platser) ? samlingRum(s) : undefined; return sal && siteInne(s, k, sal); };
export const stationSite = (s: State, k: string, p?: Person) => siteSal(s, k) || (stationDef(k)?.forvar?.privat || stationDef(k)?.pynt ? p && siteKista(s, k, p) : stationDef(k)?.brasa ? siteBrasa(s) : stationDef(k)?.eld ? siteEld(s) : stationDef(k)?.forvar ? siteForvar(s, k) : stationDef(k)?.utkant ? somUtanLager(() => siteUtkant(s, k)) : stationDef(k)?.inne ? siteInne(s, k, undefined, h => farBygga(s, h, p)) : somUtanLager(() => siteUte(s, k)));
// i byns utkant (latrinen och slaktbänken): lediga rutor på gräs, sand eller i glesare skog, högst u.till rutor från byn (lägret
// och husen, utanforByn), helst u.avst och aldrig närmare än utkantMin, och för latrinen, när byn lärt sig
// det (s.hygien), långt från vattnet. Avståndet räknas från stationens närmaste ruta
function siteUtkant(s: State, k: string) {
  const u = stationDef(k)!.utkant!, m = getMap(s.seed), g = groundOf(s), upp = upptagna(s);
  // sökområdet: byns område och u.till rutor runt
  const { x0, y0, x1, y1 } = omrade(s), R = Math.ceil(u.till) + 1;
  const yxa = nTools(s, 'yxa') > 0; // träden på platsen fälls som en del av bygget (steg 8.1.14), men utan yxa kan ingen fälla dem
  let best: { x: number; y: number; rot?: 1 } | undefined, bs = Infinity;
  for (const rot of (stationDef(k)!.w === stationDef(k)!.h ? [0] : [0, 1]) as (0 | 1)[]) {
    const { w, h } = storlek(k, rot);
    for (let y = Math.max(0, y0 - R); y <= Math.min(H - h, y1 + R); y++) for (let x = Math.max(0, x0 - R); x <= Math.min(W - w, x1 + R); x++) {
      const rutor = rutorAv(x, y, w, h);
      let d = Infinity, ok = true;
      for (const q of rutor) {
        const t = m.tiles[q.y * W + q.x];
        if (t !== T.Gras && t !== T.Sand && t !== T.Skog || (u.tradFri || !yxa) && g.trees[q.y * W + q.x] >= FOREST || !ledig(s, q.x, q.y, upp)) { ok = false; break; }
        d = Math.min(d, utanforByn(s, q.x, q.y));
      }
      if (!ok || d < STATION.utkantMin || d > u.till || !friRunt(s, rutor) || arbetar(stationDef(k)) && (!framLand(s, x, y, w, h) || Array.from({ length: w }, (_, i) => g.trees[(y + h) * W + x + i] >= FOREST).some(Boolean))) continue;
      const vatten = u.vatten && s.hygien ? s.hygien * STATION.latrinVattenPoang * Math.max(0, STATION.latrinVatten - tillVatten(s, x, y, STATION.latrinVatten)) : 0;
      if (u.falt && d < u.avst) continue;
      // latrinen: lika långt från byn som fälten (steg 4.5.4.5), räknat från byns område (steg 6.2.4)
      const sc = Math.abs(d - (u.falt ? Math.min(u.till, STATION.latrinMal) : u.avst)) + vatten + rot * STATION.vriden;
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
// väggbitarna rakt bredvid en möbel med hörnet x, y och storleken w × h (inte hörnen), i en fast ordning
function runtOm(s: State, x: number, y: number, w: number, h: number, f: (k: string | undefined) => void) {
  for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) if ((i === -1 || i === w) !== (j === -1 || j === h)) f(bitAt(s, x + i, y + j)?.k);
}

// står rutorna i en gång mellan husen (en vägg på båda sidor, högst gangSok rutor bort), så är gången minst gangMin bred,
// och de står mot den ena väggen med minst gangMin - 1 rutor fritt mot den andra, så att gången är fri (steg 4.5.4.5)
export function gangFri(s: State, rutor: { x: number; y: number }[]) {
  const g = gridOf(s), x0 = Math.min(...rutor.map(q => q.x)), x1 = Math.max(...rutor.map(q => q.x)), y0 = Math.min(...rutor.map(q => q.y)), y1 = Math.max(...rutor.map(q => q.y));
  const vagg = (x: number, y: number) => inMap(x, y) && g.at.has(y * W + x);
  // fritt från kanten (a) i riktningen d tills en vägg, eller undefined om ingen vägg finns inom gangSok
  const fritt = (ax: number, ay: number, dx: number, dy: number) => { for (let k = 0; k < STATION.gangSok; k++) if (vagg(ax + dx * (k + 1), ay + dy * (k + 1))) return k; return undefined; };
  const ok = (a?: number, b?: number) => a === undefined || b === undefined || a + b + 1 >= STATION.gangMin && Math.min(a, b) === 0 && Math.max(a, b) >= STATION.gangMin - 1;
  for (let y = y0; y <= y1; y++) if (!ok(fritt(x0, y, -1, 0), fritt(x1, y, 1, 0))) return false;
  for (let x = x0; x <= x1; x++) if (!ok(fritt(x, y0, 0, -1), fritt(x, y1, 0, 1))) return false;
  return true;
}
// ute: alla rutorna den tar är lediga, ingenting utom ett hus står inpå (friRunt), helst mot en vägg. Avståndet räknas från stationens mitt
// Platsen räknas en gång i timmen per slag (steg 6.2.21) och när något byggs eller området ändras; ligger något på den
// sedan dess (en stack, ett redskap), söks den om. Alla som undrar om stationen går att bygga (kanBygga, för varje person
// i valet) får samma svar utan att söka
const uteCache = new WeakMap<State, { key: string; m: Map<string, { x: number; y: number; rot?: 1 } | undefined> }>();
function siteUte(s: State, k: string) {
  const key = `${Math.floor(s.now / HOUR)}:${s.byggV ?? 0}:${omrade(s).key}`;
  let c = uteCache.get(s);
  if (c?.key !== key) uteCache.set(s, c = { key, m: new Map() });
  if (c.m.has(k)) {
    const at = c.m.get(k);
    if (!at) return at;
    const { w, h } = storlek(k, at.rot ?? 0);
    if (rutorAv(at.x, at.y, w, h).every(q => ledig(s, q.x, q.y))) return at;
  }
  const at = sokUte(s, k);
  c.m.set(k, at);
  return at;
}
function sokUte(s: State, k: string) {
  const o = omrade(s), upp = upptagna(s);
  // ledig för en ruta beror bara på rutan under sökningen: den sparas första gången den frågas (steg 9.1.6)
  const ledigt = new Map<number, boolean>(), lediga = (x: number, y: number) => {
    if (!inMap(x, y)) return ledig(s, x, y, upp);
    let v = ledigt.get(y * W + x);
    if (v === undefined) ledigt.set(y * W + x, v = ledig(s, x, y, upp));
    return v;
  };
  let best: { x: number; y: number; rot?: 1 } | undefined, bs = Infinity;
  for (const rot of [0, 1] as const) {
    const { w, h } = storlek(k, rot), R = Math.ceil(STATION.avstand) + 2 + Math.max(w, h);
    for (let y = o.y0 - R; y <= o.y1 + R; y++) for (let x = o.x0 - R; x <= o.x1 + R; x++) {
      let fri = true;
      for (let j = 0; j < h && fri; j++) for (let i = 0; i < w && fri; i++) fri = lediga(x + i, y + j);
      if (fri && stationDef(k)?.platser) fri = bordPlatser({ k, x, y, rot }).every(q => lediga(q.x, q.y)); // stubbarna runt bordet
      if (fri) fri = friRunt(s, [...rutorAv(x, y, w, h), ...(stationDef(k)?.platser ? bordPlatser({ k, x, y, rot }) : [])], true); // plats för en stig runt (steg 2.10.8)
      for (let i = 0; i < w && fri; i++) fri = !gridOf(s).at.has((y + h) * W + x + i) && !stationAt(s, x + i, y + h) && !(s.stackar ?? []).some(q => q.x === x + i && q.y === y + h && !iLagret(s, q.x, q.y)); // man står framför den, inte i en vägg, en annan station eller på en hög
      if (fri) fri = gangFri(s, [...rutorAv(x, y, w, h), ...(stationDef(k)?.platser ? bordPlatser({ k, x, y, rot }) : [])]);
      if (fri && arbetar(stationDef(k))) fri = framLand(s, x, y, w, h); // och inte i vattnet (steg 4.5.4.3)
      if (!fri) continue;
      // helst mot en vägg, men inte vid en öppning där man går in (Björn efter v101)
      let vagg = 0;
      runtOm(s, x, y, w, h, k => { if (k === 'vagg') vagg++; else if (k === 'oppning') fri = false; });
      if (!fri) continue;
      const sc = Math.abs(tillHoljet(s, x + (w - 1) / 2, y + (h - 1) / 2) - STATION.avstand) + rot * STATION.vriden - vagg * STATION.uteVagg;
      if (sc < bs) { bs = sc; best = rot ? { x, y, rot } : { x, y }; }
    }
  }
  return best;
}
// inne: en golvruta i rummet där ingen station står, inget ligger och som inte är en lagerplats
function golvFri(s: State, rum: Set<number>, x: number, y: number) {
  const i = y * W + x;
  return rum.has(i) && !stationRutor(s).at.has(i) && !stationRutor(s).sitt.has(i) && !zonesOf(s).some(z => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h)
    && !(s.stackar ?? []).some(a => a.x === x && a.y === y) && !tingOf(s).some(q => q.x === x && q.y === y && q.hos === undefined && q.lass === undefined);
}
// står något på rutorna (x, y, w×h) i ett hus ingång: rutan innanför en öppning (steg 3.10.1)? Öppningen själv är inget golv
const iIngang = (s: State, x: number, y: number, w: number, h: number) => rutorAv(x, y, w, h).some(q => GRANNAR4.some(([dx, dy]) => bitAt(s, q.x + dx, q.y + dy)?.k === 'oppning'));
// inne: i ett färdigt hus (en möbel man sover i bara där man sover, det andra inte i ett förrådshus), på lediga golvrutor med
// golv framför sig, och bara om den inte tar en sovplats som någon behöver. Helst mot en vägg och inte vid öppningen, och en
// bädd aldrig i ingången. bara = bara i det rummet, far = bara i de husen (ingen bygger i någon annans hus, steg 3.10.2)
function siteInne(s: State, k: string, bara?: Rum, far?: (h: Hus) => boolean) {
  const d = stationDef(k)!, g = gridOf(s);
  let best: { x: number; y: number; rot?: 1; inne: 1 } | undefined, bs = Infinity;
  for (const r of g.rooms) {
    const hus = husById(s, r.hus);
    if (!hus?.klar || !r.tiles.length || bara && r !== bara || far && !far(hus)) continue;
    const fn = rumFnOf(s, r);
    if (d.sover ? !fn.sover : fn.lager) continue;
    const rum = new Set(r.tiles), kvar = sovKvar(s, r), bonus = !d.sover && !fn.sover ? -STATION.samling : 0;
    for (const rot of [0, 1] as const) {
      const { w, h } = storlek(k, rot), tar = d.sover || d.pynt ? 0 : w * h; // halmbädden är en del av sovplatsen, och pyntet tar ingen (steg 9.2.36)
      if (tar > kvar) continue;
      for (const i0 of r.tiles) {
        const x = i0 % W, y = (i0 - x) / W;
        let fri = true, sc = rot * STATION.vriden + bonus;
        for (let j = 0; j < h && fri; j++) for (let i = 0; i < w && fri; i++) fri = golvFri(s, rum, x + i, y + j);
        for (let i = 0; i < w && fri; i++) fri = rum.has((y + h) * W + x + i) && !stationRutor(s).at.has((y + h) * W + x + i); // golvet framför
        if (!fri || d.sover && iIngang(s, x, y, w, h)) continue; // en bädd aldrig i ingången (steg 3.10.1)
        runtOm(s, x, y, w, h, k => { if (k === 'vagg') sc -= STATION.badd; else if (k === 'oppning') sc += STATION.dorr; });
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
function golvet(s: State, k: string, alla = false) {
  const f = stationDef(k)?.forvar, ut: { x: number; y: number; z: Zone; full: boolean }[] = [];
  if (!f || f.privat) return ut;
  for (const a of pilesInne(s)) {
    const z = zonesOf(s)[a.zone];
    if (!z || z.hus === undefined || stationAt(s, a.x, a.y)) continue; // bara inomhus (steg 2.10.18)
    const full = a.n >= a.max - 1e-9;
    // alla = också högar som inte är fulla (när golvet börjar bli fullt, steg 4.5.4.6)
    if (f.redskap ? isTool(a.k) : !isTool(a.k) && (full || alla) && (!f.tak || SAKER[a.k]?.haller !== undefined || (SAKER[a.k]?.slits ?? 0) > 0)) ut.push({ x: a.x, y: a.y, z, full });
  }
  return ut;
}
// hur stor del av golvet i lagren inomhus som har högar eller möbler på sig (0 till 1, steg 4.5.4.6)
export function golvAndel(s: State) {
  const g = groundOf(s), upptagen = new Set<number>();
  for (const a of pilesInne(s)) upptagen.add(a.y * W + a.x);
  let n = 0, u = 0;
  for (const z of zonesOf(s)) {
    if (z.hus === undefined) continue;
    for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) {
      const i = y * W + x;
      if (!inZone(z, x, y) || g.solid?.[i]) continue;
      n++; if (upptagen.has(i) || stationAt(s, x, y)) u++;
    }
  }
  return n ? u / n : 0;
}
const golvFullt = (s: State) => Math.min(1, Math.max(0, (golvAndel(s) - STATION.forvarAndel) / (STATION.forvarAndelFull - STATION.forvarAndel)));
// hur mycket byn vill ha en möbel av sorten k (0 till 1)
// (kistan: 1 så länge någon vill ha en, villKista)
// (hyllan också när golvet i förrådshusen börjar bli fullt, inte först när högarna är fulla, steg 4.5.4.6)
export const forvarBrist = (s: State, k: string) => {
  const f = stationDef(k)?.forvar;
  if (!f) return 0;
  if (f.privat) return +living(s).some(p => villKista(s, p));
  const fulla = Math.min(1, golvet(s, k).length / (f.redskap ? STATION.forvarLosa : STATION.forvarFulla));
  return f.redskap || !golvet(s, k, true).length ? fulla : Math.max(fulla, golvFullt(s));
};
// ---------- kistan i sovrummet (steg 2.10.18) ----------
// Den som sover inne och har minst kistaVill egna redskap och kläder som ingen använder bygger en kista åt sig själv, i
// rummet där hen sover. Där ligger det egna som ingen använder (vid, som kniven vid slaktbänken), så många som kistan rymmer,
// och dit läggs det tillbaka när det använts. Kistan står inne som de andra möblerna och går att gå förbi
// p:s kista, färdig eller halvbyggd
export const kistaOf = (s: State, p: Person) => stationerOf(s).find(t => t.ag === p.id && !!stationDef(t.k)?.forvar?.privat);
// p:s egna redskap och kläder som ingen använder: de ligger i lagret, på marken eller i kistan
const egnaLediga = (s: State, p: Person) => tingOf(s).filter(t => t.agare === p.id && isTool(t.k) && !t.halv && t.hos === undefined && t.krok === undefined && t.lass === undefined && t.bar === undefined);
// p vill ha en kista: hen sover inne, har ingen och har minst kistaVill egna saker som ingen använder
export const villKista = (s: State, p: Person) => !kistaOf(s, p) && bedTile(s, p) !== undefined && egnaLediga(s, p).length >= STATION.kistaVill;
// ---------- pyntet (steg 4.3.4, pynt.ts) ----------
// p:s pynt, färdigt eller halvbyggt. Var och en har högst ett, så att byn inte fylls av små saker
export const PYNT_LIST = STATION_LIST.filter(k => (STATIONER[k] as StationDef).pynt);
// en lerkruka som står i rummet där p sover är också pynt (steg 9.4.12): pyntet räknas på tingen i rummet, inte bara på möblerna
export const krukaHemma = (s: State, p: Person) => { const rum = sovrum(s, p); return rum ? tingOf(s).find(t => t.k.startsWith('lerkruka_') && t.agare === p.id && t.ler === undefined && t.hos === undefined && t.lass === undefined && t.bar === undefined && t.x !== undefined && roomAt(s, t.x, t.y!) === rum) : undefined; };
export const pyntOf = (s: State, p: Person) => stationerOf(s).find(t => t.ag === p.id && !!stationDef(t.k)?.pynt) ?? krukaHemma(s, p);
// sorten p vill ha: smaken, fast för var och en (ingen slump). Lerkrukan är en av sorterna fast den inte är en möbel
export const PYNT_SMAK = ['kruka', ...PYNT_LIST];
export const pyntSort = (s: State, p: Person) => PYNT_SMAK[Math.floor(hash3(s.seed, p.id, 43) * PYNT_SMAK.length)];
// p vill ha pyntet k: hen är vuxen, sover inne, har inget och k är hens sort
export const villPynt = (s: State, p: Person, k: string) => ageOf(p, s.now) >= ALDER.vuxen && !pyntOf(s, p) && pyntSort(s, p) === k && bedTile(s, p) !== undefined;
// hur stor del av de vuxna som sover inne som vill ha pyntet k (projektets brist)
export function pyntBrist(s: State, k: string) {
  const v = living(s).filter(p => ageOf(p, s.now) >= ALDER.vuxen && bedTile(s, p) !== undefined);
  return v.length ? v.filter(p => villPynt(s, p, k)).length / v.length : 0;
}
// rummet där p sover
export const sovrum = (s: State, p: Person) => { const b = bedTile(s, p); return b === undefined ? undefined : roomAt(s, b % W, Math.floor(b / W)); };
// platsen för p:s kista: en ledig golvruta i rummet där hen sover (siteInne)
function siteKista(s: State, k: string, p: Person) { const r = sovrum(s, p); return r && siteInne(s, k, r); }
// varje timme: en kista (färdig eller halvbyggd) vars ägare är borta tas över av någon som sover i samma rum och inte har en.
// Det som inte är ägarens (hen gav bort det, eller det blev byns) tas ur kistan och läggs i lagret (placeTools), och det egna
// som ingen använder läggs i den färdiga kistan tills den är full
function kistorna(s: State) {
  for (const t of stationerOf(s)) {
    if (t.ag !== undefined && stationDef(t.k)?.pynt) { const o = byId(s, t.ag); if (!o || !alive(o)) { const rum = stationRum(s, t), q = living(s).find(q => !pyntOf(s, q) && sovrum(s, q) === rum); if (q) t.ag = q.id; } continue; } // pyntet tas över som kistan (steg 4.3.4)
    if (t.ag === undefined || !stationDef(t.k)?.forvar?.privat) continue;
    let o = byId(s, t.ag);
    if (!o || !alive(o)) { const rum = stationRum(s, t), q = living(s).find(q => !kistaOf(s, q) && sovrum(s, q) === rum); if (q) t.ag = (o = q).id; }
    for (const k of tingOf(s)) if (k.vid === t.id && k.agare !== t.ag) { k.vid = undefined; if (k.hos === undefined && k.lass === undefined) k.x = k.y = undefined; }
    if (!o || !alive(o) || !isKlar(t)) continue;
    let n = tingOf(s).filter(k => k.vid === t.id).length;
    for (const k of egnaLediga(s, o)) {
      if (n >= STATION.kistaTing) break;
      if (k.vid !== undefined) continue;
      k.vid = t.id; k.x = t.x; k.y = t.y; n++;
    }
  }
}
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
  for (const [dx, dy] of GRANNAR4) lagg(f.x + dx, f.y + dy);
  for (let k = 0; k < ko.length; k++) { const x = ko[k] % W, y = (ko[k] - x) / W; for (const [dx, dy] of GRANNAR4) lagg(x + dx, y + dy); }
  return { sedd, n: ko.length };
}
// stänger ett hus med yttermåtten w×h på platsen (x, y) in något som nåddes från elden? En vägg vid stranden kan lämna en
// remsa mellan sig och vattnet som ingen kommer ut från: den som fiskade där när väggen blev klar gick rakt över sjön (v135).
// Allt som nåddes utanför huset ska hänga ihop runt det
export function stangerIn(s: State, x: number, y: number, w: number, h: number) {
  const fore = nadda(s), sedd = new Uint8Array(W * H), ko: number[] = [];
  const kvar = (i: number) => { const xx = i % W, yy = (i - xx) / W; return fore.sedd[i] === 1 && (xx < x || xx >= x + w || yy < y || yy >= y + h); };
  let mal = 0;
  for (let i = 0; i < W * H; i++) if (kvar(i)) { if (!mal) { sedd[i] = 1; ko.push(i); } mal++; }
  for (let k = 0; k < ko.length; k++) {
    const xx = ko[k] % W, yy = (ko[k] - xx) / W;
    for (const [dx, dy] of GRANNAR4) { const nx = xx + dx, ny = yy + dy, i = ny * W + nx; if (inMap(nx, ny) && !sedd[i] && kvar(i)) { sedd[i] = 1; ko.push(i); } }
  }
  return ko.length < mal;
}
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
    if (!GRANNAR4.some(([dx, dy]) => efter.sedd[(y + dy) * W + x + dx])) return false;
  }
  return true;
}
// platsen för en möbel av sorten k: i en lagerplats under tak, efter lagrets prioritet och närmast lagrets hörn
// (steg 4.5.4.6: helst längs väggarna, så att gångarna i huset hålls fria, och helst på en full hög; när golvet börjar bli
// fullt också på en hög som inte är full)
function siteForvar(s: State, k: string) {
  const zs = zonesOf(s), mot = (q: { x: number; y: number }) => GRANNAR4.some(([dx, dy]) => bitAt(s, q.x + dx, q.y + dy)?.k === 'vagg') ? 0 : 1;
  const c = golvet(s, k, !stationDef(k)?.forvar?.redskap && golvFullt(s) > 0)
    .sort((a, b) => mot(a) - mot(b) || +b.full - +a.full || ((b.z.prio ?? 0) - (a.z.prio ?? 0)) || zs.indexOf(a.z) - zs.indexOf(b.z) || a.y - b.y || a.x - b.x);
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
  const fv = stationerOf(s).filter(t => stationDef(t.k)?.forvar && t.ag === undefined), alla = fv.length ? nadda(s) : undefined;
  const stanger = (t: Station) => nadda(s, -1, t.y * W + t.x).n > alla!.n + 1;
  // ingen ruta rakt bredvid nås: ingen kommer åt möbeln (tre hyllor i ett hörn, eller en vägg som byggts upp igen efter en tornado)
  const utom = (t: Station) => !GRANNAR4.some(([dx, dy]) => alla!.sedd[(t.y + dy) * W + t.x + dx]);
  const fram = framRutor(s), iVag = (t: Station) => fram.has(t.y * W + t.x); // framför en arbetsstation (steg 3.10.1)
  // medan sjön svämmar över räknas inte vem som når vad: vattnet runt ett förrådshus sjunker undan (flod.ts)
  const borta = fv.filter(t => zoneAt(s, t.x, t.y) < 0 || (!s.flod && (stanger(t) || utom(t))) || iVag(t));
  if (!borta.length) return;
  s.stationer = stationerOf(s).filter(t => !borta.includes(t));
  s.byggV = (s.byggV ?? 0) + 1;
  tomt(s, borta);
  for (const t of borta) log(s, `${stationDef(t.k)!.namn} togs isär ${zoneAt(s, t.x, t.y) < 0 ? 'när lagret flyttades' : utom(t) ? 'eftersom ingen kom åt den' : iVag(t) ? 'eftersom den stod där man arbetar vid en bänk' : 'eftersom den stängde in en del av lagret'}.`, 'world');
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
// (en kista: p:s egen, steg 2.10.18)
// (ingen bygger vidare i någon annans hus, steg 3.10.2)
const halvbyggd = (s: State, k: string, p?: Person) => stationerOf(s).find(t => t.k === k && !isKlar(t) && (t.ag === undefined || t.ag === p?.id) && (!p || farBygga(s, husAv(s, t), p)));
// p kan bygga (eller bygga vidare på) en station av sorten k som byn saknar (det byn kan ha flera av: om projektet säger att byn
// saknar fler, projekt.ts)
export function kanBygga(s: State, p: Person, k: StationSlag) {
  const d: StationDef = STATIONER[k];
  if (doingAct(s, 'station', p) || (d.brasa ? ageOf(p, s.now) < ALDER.ansvar : !d.tek.some(k => knows(p, k))) || !d.flera && harStation(s, k) || d.verktyg && !freeTools(s, p, d.verktyg)) return false;
  if (halvbyggd(s, k, p)) return true;
  return (!d.forvar?.privat || villKista(s, p)) && (!d.pynt || villPynt(s, p, k)) && Object.entries(d.av).every(([m, n]) => getable(s, p, m) >= n + sparas(m)) && !!stationSite(s, k, p);
}
// materialet p saknar till en station av sorten k som byn saknar och p kan bygga, annars undefined (projekt.ts, steg 6.1.17).
// Brasans stenar letas för sig (brasor.ts)
export function receptStation(s: State, p: Person, k: StationSlag): Recept | undefined {
  const d: StationDef = STATIONER[k];
  if (d.brasa || doingAct(s, 'station', p) || !d.tek.some(k => knows(p, k)) || !d.flera && harStation(s, k) || halvbyggd(s, k, p)) return undefined;
  if (d.forvar?.privat && !villKista(s, p) || d.pynt && !villPynt(s, p, k)) return undefined;
  return { av: d.av, verktyg: d.verktyg }; // ett redskap som fattas blir ett projekt på samma nivå (steg 6.2.19)
}
// byn har en färdig station av sorten k
export const harStation = (s: State, k: string) => stationerOf(s).some(t => t.k === k && isKlar(t));
// platsen dit den som ska bygga går: den halvbyggda stationen, annars rutan där den ska stå
export function stationSpot(s: State, k: string, p?: Person) {
  const t = halvbyggd(s, k, p), at = t ?? stationSite(s, k, p), f = stationDef(k)?.forvar;
  if (at && f && !f.privat) return bredvid(s, at.x, at.y);
  return at ? vidStation({ id: 0, k, kvar: 1, x: at.x, y: at.y, rot: at.rot }) : undefined;
}
// framme: bygg vidare på den halvbyggda, eller ta materialet och börja. Saknas materialet eller platsen blir det inget
export function startStation(s: State, p: Person, tk: Task) {
  const k = tk.tool ?? '', d = stationDef(k);
  let t = halvbyggd(s, k, p);
  if (d && !t && (d.flera || !stationerOf(s).some(q => q.k === k))) {
    const at = stationSite(s, k, p);
    if (at && Object.entries(d.av).every(([m, n]) => getable(s, p, m) >= n)) {
      for (const [m, n] of Object.entries(d.av)) takeMaterial(s, p, m, n);
      t = { id: s.nextStation = (s.nextStation ?? 0) + 1, k, x: at.x, y: at.y, kvar: d.min * MIN };
      if (at.rot) t.rot = 1;
      if ('inne' in at) t.inne = 1;
      const delar = delarIRad(k, at.x, at.y, at.rot); if (delar) t.delar = delar; // delarna i en rad, som de byggs (steg 9.4.1)
      if (d.forvar?.privat || d.pynt) t.ag = p.id; // kistan och pyntet är hens (steg 2.10.18, 4.3.4)
      (s.stationer ??= []).push(t);
      if (!t.inne && !d.forvar) { const { w, h } = storlekAv(t); for (const z of zonesOf(s).filter(z => z.hus === undefined && rutorAv(t!.x, t!.y, w, h).some(q => inZone(z, q.x, q.y)))) flyttaLager(s, z); } // lagret i vägen (steg 8.1.15)
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
  t.kvar = 0; t.klar = s.now; gjort(s, p, 'mobel');
  const d = stationDef(t.k)!;
  if (d.hard) { // härden är lagd: den blir en eld inne i huset (steg 7.5.3)
    nyEld(s, t);
    const f = (s.eldar ?? []).find(q => q.id === t.id);
    if (f) { f.hearth = 'hard'; f.ring = undefined; }
    if (forstaGang(s, 'station_' + t.k)) { log(s, forstaText(d.forsta, p), 'world', [p.id]); p.fame.push('Lade byns första härd'); }
    return;
  }
  if (d.brasa) { // ringen till en lägereld till är lagd: den blir en lägereld (brasor.ts)
    nyEld(s, t);
    if (forstaGang(s, 'station_' + t.k)) { log(s, forstaText(d.forsta, p), 'world', [p.id]); p.fame.push('Lade byns andra lägereld'); }
    return;
  }
  if (d.sover) { touch(s); agaBadd(s, t); } // en ny sovplats: var man sover räknas om, och den som sover där äger bädden
  if (d.mobel) nyKvalitet(s, p, t, 0, d.namn.toLowerCase()); // möblerna har kvalitet, stationerna inte (kvalitet.ts)
  if (d.verktyg && wearTool(s, p, d.verktyg, STATION.latrinSpade)) { const tr = SAKER[d.verktyg]?.trasig; if (tr) count(s, tr.stat); } // benspaden slits för varje grop
  if (forstaGang(s, 'station_' + t.k)) { log(s, forstaText(d.forsta, p), 'world', [p.id]); p.fame.push(`Byggde byns första ${forstaForm(d.namn)}`); }
  fyllPlatser(s);
}

// ---------- borden (steg 2.2.15) ----------
// Ett bord har stubbar att sitta på runt sig (platser i registret): en på varje ruta längs de sidor som är minst två rutor
// långa. Det lilla bordet (2 × 1 rutor) har fyra platser på långsidorna, bordet (2 × 2) åtta, två på varje sida, och
// långbordet (3 × 2) tio. Stubbarna hör till bordet: de byggs med det och inget annat får stå där. Bordet står ute nära
// elden (siteUte). Den som är hungrig går till en ledig plats och äter där (måltiden i val.ts,
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
  // när det är kallt eller regnar äter och pratar man under tak om det går (Matsal, steg 7.2.8)
  const inneHellre = nederbord(s) || coldOf(temperature(s)) > 0;
  const tagen = new Set<number>();
  for (const q of living(s)) if (q !== p && q.task && VID_BORDET.has(q.task.act)) tagen.add(Math.floor(q.task.ty) * W + Math.floor(q.task.tx));
  let best: { x: number; y: number } | undefined, bd = Infinity;
  for (const t of borden) for (const q of bordPlatser(t)) {
    const d = Math.hypot(q.x + 0.5 - p.x, q.y + 0.5 - p.y) + (inneHellre && !roofed(s, q.x, q.y) ? STATION.bordUte : 0);
    if (d < bd && !tagen.has(q.y * W + q.x) && !blocked(s, q.x + 0.5, q.y + 0.5)) { bd = d; best = { x: q.x + 0.5, y: q.y + 0.5 }; } // inte en plats där något står i vägen (då flyttade freeNear i val.ts en bit från bordet)
  }
  return best;
}
// sitter p vid bordet och äter (handlingen maltid, framme)?
export const vidBordet = (p: Person) => p.task?.act === 'maltid' && p.task.phase === 'do';
// bordet som den som äter sitter vid (ett finare bord gör måltiden trevligare, kvalitet.ts)
export function bordVid(s: State, p: { x: number; y: number }) {
  for (const [dx, dy] of GRANNAR4) { const t = stationAt(s, p.x + dx, p.y + dy); if (t && stationDef(t.k)?.platser) return t; }
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
// texten om byns första: namnet och pronomenen efter den som gjorde det (ordlagret, steg 6.7.2)
const forstaText = (t: string, p: Person) => t.replace('{namn}', p.name).replace(/{hans}/g, hans(p)).replace(/{han}/g, han(p));
export interface TillbehorDef { namn: string; ikon: string; till: string; tek: string[]; av: Record<string, number>; min: number; varme?: number; gor: string; forsta: string }
export const TILLBEHOR = {
  stekhall: { // steg 9.6.21 (matlagning.ts): kött och fisk steks med talg på hällen
    namn: 'Stekhäll', ikon: 'stekhall', till: 'grill', tek: ['stekhall'], av: RECEPT.stekhall.av, min: RECEPT.stekhall.min,
    gor: 'Lägger en flat sten över elden vid grillen.',
    forsta: '{namn} lade byns första stekhäll över elden. Där steks köttet och fisken i talg.',
  },
  skinnfall: {
    namn: 'Skinnfäll', ikon: 'skinnfall', till: 'halmbadd', tek: ['skinnfall'], av: RECEPT.skinnfall.av, min: RECEPT.skinnfall.min, varme: STATION.fallVarme,
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
// materialet p saknar till ett tillbehör av sorten k som någon station saknar (steg 6.1.17)
export function receptTillbehor(s: State, p: Person, k: TillbehorSlag): Recept | undefined {
  const d: TillbehorDef = TILLBEHOR[k];
  if (!d.tek.some(t => knows(p, t)) || utanTillbehor(s, k).length <= (doingAct(s, 'tillbehor', p) ? 1 : 0)) return undefined;
  return { av: d.av };
}
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
// ligger redskapet k i stationen där man gör act (sländan i vävstolen, steg 7.7.9)?
export const verktygVid = (s: State, act: Act, k: string) => { const t = stationFor(s, act); return !!t && redskapVid(s, t, k).length > 0; };
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
  if (k.hos === undefined && k.lass === undefined) Object.assign(k, vidRuta(t, k.k));
}
// rutan där redskapet av slaget k ligger vid stationen: varje slag på en egen ruta av stationens (scenens instrument, steg 4.3.2.2)
function vidRuta(t: Station, k: string) {
  const i = Math.max(0, Object.keys(stationDef(t.k)?.vid ?? {}).indexOf(k)), { w, h } = storlekAv(t);
  return { x: t.x + i % w, y: t.y + Math.min(h - 1, Math.floor(i / w)) };
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
  Object.assign(k, vidRuta(t, k.k));
  return true;
}
// handlingen act är gjord en gång vid stationen: redskapet den kräver (kraver) slits så mycket. true = det gick sönder
export function slitVid(s: State, act: Act, v: number) {
  const t = stationFor(s, act), k = t && stationDef(t.k)?.kraver?.[act];
  const r = k ? redskapVid(s, t, k).sort((a, b) => a.c - b.c)[0] : undefined;
  if (!r) return false;
  r.c -= v / kvHaller(r); // ett bättre redskap håller längre (kvalitet.ts)
  if (r.c > 1e-9) return false;
  s.ting = tingOf(s).filter(q => q !== r);
  const tr = SAKER[r.k]?.trasig;
  if (tr) count(s, tr.stat);
  return true;
}
// en station som bara får stå inne (inne i registret) men står ute, t.ex. en slöjdbänk byggd före v59, bärs in i ett hus
// när det finns plats och ingen arbetar vid den (Björn, efter v64). Kniven som hör till den följer med
// ---------- det som står i vägen (steg 3.10.1) ----------
// rutorna framför alla arbetsstationer, där man står och arbetar
function framRutor(s: State) {
  const fram = new Set<number>();
  for (const t of stationerOf(s)) for (const q of framfor(t)) fram.add(q.y * W + q.x);
  return fram;
}
// f räknat som om stationen t inte stod där (dess nya plats). Byggversionen räknas upp före och efter, så att inget som
// räknats utan den sparas
function utan<R>(s: State, t: Station, f: () => R): R {
  const alla = stationerOf(s);
  s.stationer = alla.filter(q => q !== t); s.byggV = (s.byggV ?? 0) + 1;
  try { return f(); } finally { s.stationer = alla; s.byggV = (s.byggV ?? 0) + 1; }
}
// stationen t står på en ny plats: redskapen som hör till den följer med
function flytta(s: State, t: Station, at: { x: number; y: number; rot?: 1; inne?: 1 }) {
  // den som sitter vid bordet och äter reser sig när bordet flyttas, och väljer en ny plats (steg 9.4.8)
  if (stationDef(t.k)?.platser) { const forr = new Set(bordPlatser(t).map(q => q.y * W + q.x)); for (const q of living(s)) if (q.task?.act === 'maltid' && forr.has(Math.floor(q.task.ty) * W + Math.floor(q.task.tx))) q.task.until = s.now; }
  if (t.delar?.length) { const dx = at.x - t.x, dy = at.y - t.y; t.delar = (at.rot ? 1 : 0) !== (t.rot ? 1 : 0) ? delarIRad(t.k, at.x, at.y, at.rot) : t.delar.map(q => ({ ...q, x: q.x + dx, y: q.y + dy })); } // delarna följer med (steg 9.4.1)
  t.x = at.x; t.y = at.y;
  if (at.rot) t.rot = 1; else delete t.rot;
  if (at.inne) t.inne = 1; else delete t.inne;
  for (const k of tingOf(s)) if (k.vid === t.id && k.hos === undefined && k.lass === undefined) Object.assign(k, vidRuta(t, k.k)); // var och en på sin ruta, inte alla på samma
  s.byggV = (s.byggV ?? 0) + 1; // stationen står på ett nytt ställe: vägarna och platserna räknas om
}
// stationerna som tagits bort: det som låg i dem (en kista, ett redskapsställ, stationens kniv) får en ny plats var, ett på
// varje ruta, av placeTools i slutet av steget, så att inte flera saker blir liggande på samma ruta (vakten i kor.ts)
function tomt(s: State, borta: Station[]) {
  for (const k of tingOf(s)) if (borta.some(t => t.id === k.vid)) { k.vid = undefined; if (k.hos === undefined && k.lass === undefined) k.x = k.y = undefined; }
  for (const t of borta) if (stationDef(t.k)?.forvar?.redskap) stallBorta(s, t.x, t.y);
}
// stationen t tas bort (också när den brunnit upp, brand.ts)
export function taBort(s: State, t: Station) {
  s.stationer = stationerOf(s).filter(q => q !== t);
  tomt(s, [t]);
  touch(s);
}
// En möbel eller station som står framför en arbetsstation (på rutan där man står och arbetar), eller en bädd i ett hus
// ingång, flyttas till en plats där den får stå, en i timmen och när ingen står på den eller arbetar vid den. Får den
// ingen plats tas den isär. Förvaringen tas isär (utanLager), och grillen och brasorna står vid sin eld. Det händer i
// byar som sparades innan rutan framför hölls fri (3.6.6) och bäddarna hölls ur ingången
function iVagen(s: State) {
  const fram = framRutor(s);
  const t = stationerOf(s).find(t => {
    const d = stationDef(t.k);
    if (!d || !isKlar(t) || d.forvar || d.eld || d.brasa) return false;
    const { w, h } = storlekAv(t), rutor = rutorAv(t.x, t.y, w, h);
    if (!rutor.some(q => fram.has(q.y * W + q.x)) && !(d.sover && t.inne && iIngang(s, t.x, t.y, w, h)) && !(arbetar(d) && !framLand(s, t.x, t.y, w, h))) return false;
    return !d.gor.some(a => doingAct(s, a)) && !living(s).some(p => rutor.some(q => q.x === Math.floor(p.x) && q.y === Math.floor(p.y)));
  });
  if (!t) return;
  const d = stationDef(t.k)!, { w, h } = storlekAv(t);
  const var_ = rutorAv(t.x, t.y, w, h).some(q => fram.has(q.y * W + q.x)) ? 'där man arbetar vid en bänk' : arbetar(d) && !framLand(s, t.x, t.y, w, h) ? 'så att man fick stå i vattnet' : 'i ingången';
  const at = utan(s, t, () => stationSite(s, t.k, byId(s, t.ag)));
  count(s, 'station i vägen');
  if (t.k === 'scen') { rivScen(s, t, `Scenen revs eftersom den stod ${var_}.`); return; } // scenen bärs aldrig (steg 8.1.16)
  if (at) { flytta(s, t, at); log(s, `${d.namn} flyttades eftersom den stod ${var_}.`, 'world'); return; }
  taBort(s, t);
  log(s, `${d.namn} togs isär eftersom den stod ${var_} och inte fick plats någon annanstans.`, 'world');
}
// ---------- dragningen mot mitten: stationerna ute (steg 9.4.8, Byggplanen: Dragningen mot mitten) ----------
// Varje gång någon börjar arbeta vid en station räknas det (stationBrukad, val.ts) och glöms långsamt. Att flytta en station ute
// som en helhet är ett projekt (projekt.ts): värdet är hur mycket den används gånger hur mycket närmare den nya platsen ligger
// dem som använder den, räknat från tyngdpunkten av husen där folk sover och lagerplatserna, och kostnaden arbetet med flytten.
// En station som står ensam när husen omkring den försvunnit får därför ett högt värde. Räknas en gång i timmen och sparas i byn
const brukatNu = (s: State, t: Station) => (t.brukat ?? 0) * Math.exp(-(s.now - (t.brukatT ?? s.now)) / (STATION.brukatDygn * DAY));
export function stationBrukad(s: State, t: Station) { t.brukat = brukatNu(s, t) + 1; t.brukatT = s.now; }
function tyngdpunkt(s: State) {
  const pts = [...housesOf(s).filter(h => h.klar && fnOf(h).sover).map(h => ({ x: h.x + h.w / 2, y: h.y + h.h / 2 })), ...zonesOf(s).filter(z => z.hus === undefined).map(z => ({ x: z.x + z.w / 2, y: z.y + z.h / 2 }))];
  if (!pts.length) { const m = bynsMitt(s); return { x: m.x + 0.5, y: m.y + 0.5 }; }
  return { x: pts.reduce((a, q) => a + q.x, 0) / pts.length, y: pts.reduce((a, q) => a + q.y, 0) / pts.length };
}
export function stationFlyttTimme(s: State) {
  const c = tyngdpunkt(s);
  let bast: { id: number; x: number; y: number; rot?: 1; vinst: number } | undefined;
  for (const t of stationerOf(s)) {
    const d = stationDef(t.k);
    if (!d || !isKlar(t) || t.inne || d.inne || d.forvar || d.eld || d.brasa || d.utkant || d.sover || d.pynt || d.mobel) continue;
    const b = brukatNu(s, t);
    if (b < 1 || (bast && b * 1000 <= bast.vinst)) continue;
    const at = utan(s, t, () => stationSite(s, t.k, byId(s, t.ag)));
    if (!at || 'inne' in at && at.inne) continue;
    const { w, h } = storlekAv(t), n = storlek(t.k, at.rot);
    const fore = Math.hypot(t.x + w / 2 - c.x, t.y + h / 2 - c.y), efter = Math.hypot(at.x + n.w / 2 - c.x, at.y + n.h / 2 - c.y);
    if (efter > fore - STATION.flyttMinste) continue;
    const vinst = b * (fore - efter);
    if (!bast || vinst > bast.vinst) bast = { id: t.id, x: at.x, y: at.y, ...(at.rot ? { rot: 1 as const } : {}), vinst };
  }
  s.stationFlytt = bast;
}
export function stationFlyttVal(s: State) {
  const v = s.stationFlytt, t = v && stationById(s, v.id);
  return v && t && isKlar(t) ? { t, at: { x: v.x, y: v.y, rot: v.rot }, vinst: v.vinst } : undefined;
}
// flytten är klar: stationen står på den nya platsen (det som hör till den följer med, flytta)
export function stationFlytta(s: State) {
  const v = stationFlyttVal(s);
  s.stationFlytt = undefined;
  if (!v) return false;
  const { w, h } = storlek(v.t.k, v.at.rot);
  if (!rutorAv(v.at.x, v.at.y, w, h).every(q => ledig(s, q.x, q.y))) return false; // platsen har tagits under tiden
  flytta(s, v.t, v.at);
  count(s, 'stationFlyttadIn');
  log(s, `${stationDef(v.t.k)?.namn ?? 'En station'} flyttades närmare husen och lagren.`, 'world');
  return true;
}
// ---------- testläget (steg 3.10.1) ----------
// spelaren tar bort en station eller möbel
export function taBortStation(s: State, t: Station) {
  // det som låg i en kista eller på en hylla blir liggande på rutan (steg 4.5.7.8)
  const kvar = tingOf(s).filter(k => k.vid === t.id && k.hos === undefined && k.lass === undefined && k.x !== undefined).map(k => [k, k.x, k.y] as const);
  taBort(s, t);
  for (const [k, x, y] of kvar) { k.x = x; k.y = y; }
  log(s, `${stationDef(t.k)?.namn ?? 'En station'} togs bort i testläget.`, 'world');
}
// spelaren flyttar den så att hörnet uppe till vänster hamnar på rutan (x, y): på golv i ett hus eller på mark där saker
// kan ligga (lager.ts), där ingen annan station och ingen sittplats står. Byns regler gäller sedan som vanligt (det som ska
// stå inne bärs in, förvaringen utanför ett lager tas isär). false = den fick inte plats
export function flyttaStation(s: State, t: Station, x: number, y: number) {
  const rutor = delarAv(t).flatMap(q => rutorAv(q.x - t.x + x, q.y - t.y + y, q.w, q.h)); // alla delar flyttas lika långt (steg 9.4.1)
  const ok = utan(s, t, () => rutor.every(q => {
    if (!inMap(q.x, q.y) || stationAt(s, q.x, q.y) || sittAt(s, q.x, q.y)) return false;
    const b = bitAt(s, q.x, q.y);
    return b ? b.k === 'golv' && !!roomAt(s, q.x, q.y) : usable(s, q.x, q.y, true);
  }));
  if (!ok) return false;
  flytta(s, t, { x, y, rot: t.rot ? 1 : undefined, inne: bitAt(s, x, y) ? 1 : undefined });
  log(s, `${stationDef(t.k)?.namn ?? 'En station'} flyttades i testläget.`, 'world');
  return true;
}
// testläget (steg 9.4.2): en del flyttas så att dess hörn uppe till vänster hamnar på (x, y), eller vrids ett kvarts varv där den
// står, med samma regler som när hela stationen flyttas. false = den fick inte plats
export function flyttaDel(s: State, t: Station, i: number, x: number, y: number, vrid = false) {
  const r = delarAv(t)[i];
  if (!t.delar?.length || !r?.del) return false;
  const rot = vrid ? (r.rot ? undefined : 1 as const) : r.rot, w = rot ? r.del.h : r.del.w, h = rot ? r.del.w : r.del.h;
  const ok = utan(s, t, () => rutorAv(x, y, w, h).every(q => {
    if (!inMap(q.x, q.y) || stationAt(s, q.x, q.y) || sittAt(s, q.x, q.y)) return false;
    const b = bitAt(s, q.x, q.y);
    return b ? b.k === 'golv' && !!roomAt(s, q.x, q.y) : usable(s, q.x, q.y, true);
  }) && delarAv(t).every(o => o.i === i || o.x + o.w <= x || x + w <= o.x || o.y + o.h <= y || y + h <= o.y));
  if (!ok) return false;
  t.delar[i] = { x, y, ...(rot ? { rot } : {}) };
  horn(t);
  s.byggV = (s.byggV ?? 0) + 1;
  log(s, `${r.del.namn} ${vrid ? 'vreds' : 'flyttades'} i testläget.`, 'world');
  return true;
}
// ---------- ägandet i husen (steg 3.10.2) ----------
// En bädd och en kista har alltid en ägare och delas inte. En bädd utan ägare, eller vars ägare är borta, blir dens som
// sover i den (boende i byggnader.ts), och en kista tas över som förut (kistorna). Ingen bygger möbler i någon annans hus
// (farBygga): i ett familjehus bygger bara familjen. Det byn äger gemensamt (allt utom bäddarna och kistorna) får stå kvar
// var det står. En bädd eller kista står där ägaren får sova: i familjens hus, eller i byns hus där man sover. Gör den inte
// det (familjen har flyttat till ett eget hus, eller huset har ärvts eller blivit byns) bärs den dit; får den inte plats där
// lämnar ägaren bädden åt den som sover där, utom i någon annans hus: där tas den isär. En kista flyttas bara ut ur någon
// annans hus (dit där ägaren sover, annars tas den isär); annars står den kvar där den byggdes. Varje sak prövas en gång,
// så att inget söks om varje timme
export const farBygga = (s: State, h: Hus | undefined, p?: Person) => h?.ag === undefined || !!p && familjOf(s, h.ag).includes(p);
// huset där en station som står inne står
const husAv = (s: State, t: Station) => husById(s, stationRum(s, t)?.hus);
// står bädden där ägaren o får sova: i familjens hus, annars i byns hus där man sover
function ratt(s: State, h: Hus | undefined, o: Person) {
  const egen = sovHus(s, o);
  return egen !== undefined ? h?.id === egen : !!h && h.ag === undefined && !!fnOf(h).sover;
}
// den som sover i bädden t och inte har någon annan blir dess ägare
function agaBadd(s: State, t: Station) {
  const o = byId(s, t.ag);
  if (o && alive(o) && living(s).includes(o)) return;
  const i = t.y * W + t.x, q = living(s).find(q => sovPlats(s, q) === i);
  if (q && !baddOf(s, q)) { t.ag = q.id; touch(s); }
}
// p:s bädd
export const baddOf = (s: State, p: Person) => stationerOf(s).find(t => t.ag === p.id && !!stationDef(t.k)?.sover);
function inredningen(s: State) {
  for (const t of [...stationerOf(s)]) {
    const d = stationDef(t.k);
    if (!d || !t.inne || !isKlar(t) || !d.sover && !d.forvar?.privat && !d.pynt) continue;
    const o = byId(s, t.ag);
    if (!o || !alive(o) || !living(s).includes(o)) continue;
    const h = husAv(s, t), annans = h?.ag !== undefined && !familjOf(s, h.ag).includes(o);
    if (!h || (d.sover ? ratt(s, h, o) : !annans)) continue; // utan rum (en vägg har rasat) väntar den tills väggen lagats
    const egen = sovHus(s, o), namn = d.namn.toLowerCase();
    const at = utan(s, t, () => d.sover ? siteInne(s, t.k, undefined, q => egen !== undefined ? q.id === egen : q.ag === undefined) : siteKista(s, t.k, o));
    count(s, 'möbel utflyttad');
    if (at) { flytta(s, t, at); log(s, `${o.name} bar ${sinOrd(d)} ${namn} till ${husAv(s, t)?.namn.toLowerCase() ?? `huset där ${han(o)} sover`}.`, 'world', [o.id]); continue; }
    if (!annans) { t.ag = undefined; touch(s); log(s, `${o.name} lämnade ${sinOrd(d)} ${namn} i ${h?.namn.toLowerCase() ?? 'huset'} åt den som sover där.`, 'world', [o.id]); continue; }
    taBort(s, t); log(s, `${o.name}s ${namn} i ${h.namn.toLowerCase()} togs isär, eftersom ${d.ett ? 'det' : 'den'} inte fick plats där ${han(o)} sover.`, 'world', [o.id]);
  }
  for (const t of stationerOf(s)) if (stationDef(t.k)?.sover && isKlar(t)) agaBadd(s, t);
}
// scenen flyttar in (steg 7.2.7 och 8.1.16): står den ute och byn har en samlingssal med plats rivs den, och en ny byggs i salen, som blir
// en gillesal. Inte medan någon uppträder på den
function scenIn(s: State) {
  const t = stationerOf(s).find(q => q.k === 'scen' && !q.inne && isKlar(q));
  if (!t || s.fram?.scen === t.id) return;
  if (!samlingRum(s)) return;
  const at = utan(s, t, () => { const sal = samlingRum(s); return sal && siteInne(s, t.k, sal); }); // rummen räknas om när scenen är borta
  if (!at) return;
  rivScen(s, t, `Scenen revs för att byggas upp igen i ${husById(s, samlingRum(s)?.hus ?? -1)?.namn.toLowerCase() ?? 'salen'}. Där går det att uppträda också när det är kallt eller regnar.`);
}
// scenen bärs aldrig (steg 8.1.16): ska den flyttas rivs den, och en del av materialet kommer tillbaka som när ett hus rivs.
// Byn bygger en ny (scenen i STATIONER, med platsen i salen när det finns en). Instrumenten blir kvar i byn
export function rivScenen(s: State, text: string) { const t = stationerOf(s).find(q => q.k === 'scen'); if (t) rivScen(s, t, text); }
function rivScen(s: State, t: Station, text: string) {
  taBort(s, t);
  for (const [k, n] of Object.entries(stationDef(t.k)!.av)) { const m = Math.floor(n * HUS.rivTillbaka); if (m > 0) put(s, k, m); }
  count(s, 'scen riven');
  log(s, text, 'world');
}
function barIn(s: State) {
  for (const t of s.stationer ?? []) {
    const d = stationDef(t.k);
    if (!d?.inne || t.inne || !isKlar(t) || d.gor.some(a => doingAct(s, a))) continue;
    const at = siteInne(s, t.k);
    if (!at) continue;
    flytta(s, t, { ...at, inne: 1 });
    log(s, `${stor(enOrd(d))} ${d.namn.toLowerCase()} bars in i ${husById(s, stationRum(s, t)?.hus ?? -1)?.namn ?? 'ett hus'}.`, 'world');
  }
}
// stationen stod inne i ett hus som rivits: rutan har inget golv i ett hus längre. Efter en rasad vägg är rummet borta
// (roomAt) tills väggen lagats, men huset står kvar
const iRivetHus = (s: State, t: Station) => { const b = bitAt(s, t.x, t.y); return b?.k !== 'golv' || !husById(s, b.hus); };
// varje timme: tomma redskapsplatser fylls, det egna läggs i kistorna, en station som ska stå inne men står ute bärs in, en
// bädd eller kista som inte står där ägaren sover flyttas dit och bäddarna får ägare, det som står i vägen flyttas, och det
// som stod inne i ett hus som rivits försvinner
export function stepStationer(s: State) {
  if (!s.stationer?.length) return;
  fyllPlatser(s);
  kistorna(s);
  barIn(s);
  scenIn(s);
  inredningen(s);
  iVagen(s);
  utanLager(s);
  const borta = s.stationer.filter(t => t.inne && iRivetHus(s, t));
  if (!borta.length) return;
  s.stationer = s.stationer.filter(t => !borta.includes(t));
  tomt(s, borta);
  touch(s);
  for (const t of borta) log(s, `${stationDef(t.k)?.namn ?? 'En station'} försvann när huset revs.`, 'world');
}
// namnet efter 'byns första': adjektivet i bestämd form ('lilla bord', 'snidade väggbräde'; steg 4.5.1.4)
const forstaForm = (namn: string) => namn.toLowerCase().replace(/^litet /, 'lilla ').replace(/^(\p{L}+)at /u, '$1ade ');
