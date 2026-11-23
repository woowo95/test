import { FANG, besokVal, fangar, fangeVal, fangvaktFull, fangvaktPlats, fangvaktPoang, matTillFange, stoppaVal } from './fangelse';
import { taVapen } from './vakt';
import { heligtAvstar } from './kultlatt';
import { hoVal } from './djurtorst';
import { TATU, TATUERINGAR, tatVal } from './tatuering';
import { FARG, FARGER, fargVal } from './farg';
import { han } from './ord';
import { flintaKrok } from './forradsmal';
import { flintaTillVerktyg } from './redskap';
import { VATSKOR, vatskaKrok, villTe } from './vatskor';
import { kvallsChans, kvallsDryck } from './rus';
import { forbrukat } from './forradsmal';
import { grundvarde } from './varde';
import { narStridVal } from './kartstrid';
import { facklaVal, ljusAt } from './ljus';
import { OMRADE, bynsAvstand, bynsMitt, iByn, omrade, platsIByn, utanforByn } from './omrade';
import { SKRIFT, lasVal, skrivPlats, skrivVal } from './skrift';
import { GANG, kroppFart } from './gang';
import { iVattnetNu, sjoNamn, sjoVid, strandNu, vattenNu } from './sjo';
import { freeTools, take } from './agande';
import { PLATS } from './plats';
import { vargSkydd, vargjaktVal } from './varg';
import { bjornjaktVal } from './bjorn';
import { RESA, resaPlan, resaVal, samlaResa } from './resa';
import { tornadoSkydd } from './tornado';
import { brandHetta, brandUndan, brandVal, hjalpaVal, slackaSigVal } from './brand';
import { foodDays, foodDaysAll } from './ekonomi';
import { ACTS, WORK, redskapTal, usesTool } from './handlingar';
import { flyttaEldVal } from './eldflytt';
import { tandStalle, eldFor, eldForst, eldXY, nagonGlod, eldarOf, emberOn, vidEld, needStones, needTinder, woodDays } from './eld';
import { ALDER, KROPP, REL, ageOf, count, enTill, enTillDar, familjOf, isSick, living, relKey, stat } from './folk';
import { RELT, bredvidVikt } from './relationer';
import { onskan } from './naring';
import { VARDRATT, halsa, hemma, kanGa, kroppLust, vardBehov, vardVal, vilaHellre, vilaSkal } from './halsa';
import { MAT, bynsMatAndel, egnaMatDygn, familjMatDygn, getable, harMat, takeMaterial } from './behov';
import { FANGST, type FyndId, Kind, RUTFYND, flintSpot, richnessFor } from './fynd';
import { coldOf, forVarm, nederbord, snoPaMarken, temperature, vaderNu } from './vader';
// barnen leker i snön när den ligger, som de vuxna har snöbollskrig (steg 4.3.1.3, sport.ts)
const lekText = (s: State) => snoPaMarken(s) > 0 ? 'Är barn och leker i snön' : 'Är barn och leker';
import { varselSamla } from './motgang';
import { FORRAD, FORRADSMAL, TROSKEL, buffert, lyxtak, materialTimme, underBuffert, materialTak, eldReserv, villHaAv } from './forradsmal';
import { DJUR, DJURARTER, Djurart, GORS, canProcess, djurKvar, freeOfKinds, handelTask, toolGroups, underhallGrupp } from './redskap';
import { PROJEKT, PROJEKT_TAL, Uppgift, arv, bastaProjekt, bristAlla, hamtas, projektNu } from './projekt';
import { omtanke } from './omtanke';
import { lonNu } from './lon';
import { faltNu, vildFronPlats } from './odling';
import { type Tur, areaOf, flintArea, pickSpot, prospectFor } from './minne';
import { eldPlats, getMap } from './karta';
import { bordPlats, rustaVal, ryggsack, ryms } from './utrustning';
import { taFordon, valjFordon } from './fordon';
// p orkar bära en av saken k (virket lyfts med båda händerna, steg 10.2.89)
const kanLyfta = (s: State, p: Person, k: string) => !SAKER[k]?.lyft || ryms(s, p)({ [k]: viktOf(k) });
// hur många av saken k p bär i händerna på en tur (det tunga: så många som ryms, steg 10.10.2)
const iHandenAv = (s: State, p: Person, k: string) => { const r = ryms(s, p), w = viktOf(k); let n = 0; while (n < 20 && r({ [k]: (n + 1) * w })) n++; return n; };
const stackPa = (s: State, x: number, y: number, k: string) => Math.floor((s.stackar ?? []).filter(q => q.x === Math.floor(x) && q.y === Math.floor(y) && q.k === k).reduce((a, q) => a + q.n, 0) + 1e-9);
import { allows, amountOf, avbryt, carryKind, iHelaForradet, iRackhall, narmasteMed, fetchSpot, flodUndan, haulJob, isStored, timKvar, zoneAt, zonesOf } from './lager';
import { BYGG, avail, bedFor, buildJob, siteOf } from './bygg';
import { MJARDE, kanVittja } from './fisk';
import { bitAt, bitsOf, blocked, freeNear, husById, roomAt } from './byggnad';
import { homeless, samlingRum, varmareInne } from './byggnader';
import { groundOf, isForest, punktIRuta, tileOf } from './mark';
import { SKOG, axeTask, egenStock, fallTid, stockOverHus, stocks } from './skog';
import { GA_TID, startWork, startsOnArrival } from './paborjat';
import { hamtaForst } from './hamtning';
import { duty, dygn, habitShare, habitTotal } from './seder';
import { clamp, pick, pickNarmaste, r3, rnd } from './slump';
import { samtalMed } from './samtal';
import { ARSTID, ageIndex, isLight, kallTid, yearNo } from './tid';
import { Act, Fire, H, HOUR, MIN, Person, Skill, Stat, State, T, Task, W, inMap } from './typer';
import { FOOD, SAKER, isFood, sakNamn, tingNamn, viktOf } from './saker';
import { TILLVERKA } from './tillverka';
import { materialBuffert, tandBuffert } from './forradsmal';
import { balans } from './balans';
import { VarmeGor, varmeSatt } from './varme';
import { islagt, naSjon } from './is';
import { seleVal } from './barsele';
import { drickVal, torstig, tortarFarligt, vattenVal } from './torst';
import { latrinFor } from './smuts';
import { stationBrukad, bordenOf, ledigPlats, sittAt, stationAt, stationDef, stationFor, stationRutor, storlekAv, vidStation } from './stationer';
import { RATTER, TORKAS, grillTid, kanGrilla, kanTorka, torkTid } from './matlagning';
import { TEK, TEKTAL, forsokChans, forsokVal, knows, laraVal, tekArbete } from './teknik';
import { sportListaVal, sportVal, sportVikt, tittaVal, tittaVikt } from './sport';
import { handlaVal } from './handel';
import { framVal, lyssnaVal } from './framtradande';
import { utbrottBorjar, utbrottNu } from './humor';
import { smakDrag } from './rykten';
import { PAB, pabud, skams } from './styre';
import { efterAnfall } from './rovare';
import { BONER, bonFritid, bonNod, bonVikt, ritualVal, satFaror } from './kult';
import { GRAV, avrustaVal, begravaVal, gravGava, gravbesokVal, gravvardVal } from './grav';
import { budBrutet, budForbjuder, viltBikta, vilodagNu } from './kyrka';
import { LAG, lagGaller } from './lagar';
import { raddFor } from './radsla';
import { ligger } from './sjukdom';

// ---------- val av aktivitet ----------
// Balanstalen (regel 8): vikter, chanser, avstånd och hur länge ett pass varar. Kroppens gränser (KROPP) och åldrarna (ALDER)
// står i folk.ts, halv dags gång (PLATS) i plats.ts, reserverna och trösklarna (TROSKEL) i forradsmal.ts och tidsålderns faktorer (ARSTID) i tid.ts.
// Längder är i minuter om inget annat sägs; ett val varar minst X och upp till X + Spann
export const VAL = balans('val', {
  // alla pass
  pass: 0.5, // dagens pass är så stor del av vad de var före steg 1.5.11 (arbete, bygge och fritid kortas lika mycket)
  vilaMin: 20, vilaSpann: 40, // ett val som inte säger annat (nöd och grundbehov)
  toaMin: 4, toaSpann: 4, // ett toabesök
  // var man arbetar (spotFor)
  provar: 260, // så många slumpade rutor prövas runt lägret
  sokForst: 8, // nearestWanted söker först så många rutor runt byns område, sedan dubbelt så många (steg 6.2.21)
  narAvst: 4, // arbetsplatser ligger minst så många rutor från lägret ...
  narAvstAng: 5, // ... på ängen och avsides minst så många
  langtAvsides: 9, // ... och avsides högst så långt
  narmaste: 6, // utan särskild resurs väljs bland så många av de närmaste platserna
  gangMin: 0.7, gangSpann: 0.3, // en promenad går så här stor del av sträckan
  strandNara: 15, // stranden som räknas ligger närmare lägret än så här många rutor
  // faror
  fryserAndel: 0.25, // kylan är en fara när fler än så här stor andel fryser (kallt)
  // matens dygn räknas sedan steg 2.12.4 av vad byn äter (foodDays): ungefär 0,45 av de gamla dygnen, och talen i dygn skalades lika mycket
  svaltDygn: 0.25, // hungern är en fara när maten räcker mindre än så här många dygn
  gammalSover: 0.6, // chansen att den som är över sovGammal sover på natten
  // dagen: byns behov mot egen lust
  baraTim: 3, // hur länge man bär in det som ligger ute (timmar)
  // Rädda (steg 6.1.15): chansen att bära in, slakta, rensa, torka och grilla är raddaTim delat med timmarna tills det första
  // blir dåligt (alltid när det är dåligt inom raddaTim)
  raddaTim: 24, // (golvet raddaMin är borta, steg 10.2.6: det som inte ruttnar bärs in efter sitt värde, baraVarde)
  baraVarde: 40, // det som ligger ute bärs in med chansen värdet (grundvärdet gånger antalet) delat med så här mycket ...
  baraKyla: 0.3, // ... gånger detta när kylan är en fara, och när byn svälter och det som ligger närmast inte är mat
  byggKyla: 0.3, byggUtanYxa: 0.3, // bygget väger så här mycket när kylan eller hungern är en fara, och när timret saknas och ingen yxa är ledig (steg 10.2.6)
  projFara: 0.05, // ett projekt, en rad på Förbättra och att pröva sig fram tas med den här chansen när kylan eller hungern är en fara (steg 10.11.20)
  extraMin: 5, // slakt och rensning varar 5 minuter över vad det tar (och högst maxTim i DJUR, redskap.ts)
  letaChans: 0.3, // chansen att någon letar flinta åt ett projekt som saknar den (steg 6.1.17)
  letaVikt: 1.5, // flintan och stenarna till elden: poängen när förrådet är tomt, bland maten och veden (steg 10.11.13)
  fronChans: 0.4, // (0,2 före steg 2.12.2) chansen att den som samlar går till de vilda grödorna och plockar frön, när byn vill ha fler (steg 2.10.11)
  // arbetarna (steg 6.1.13): hur många som får göra en rad, räknat en gång i timmen. Taket är mjukt: när raden har sina
  // arbetare väger den fullRad gånger så mycket (en chans blir så mycket mindre) i stället för att spärras
  fullRad: 1 / 3,
  matPass: 2, // maten: det som fattas (dygn × invånare) delat med så här många person-dygn mat, vad en person hinner på ett pass
  vedPass: 1, // veden: det som fattas (dygn) delat med så här många dygns ved, vad en person hinner på ett pass
  letaPer: 10, // att leta flinta och stenar: en per så här många invånare
  akut: 3, // arbetet är helt akut när det mest behövda väger så här mycket
  kolVikt: 0.5, kolMin: 10, // kol hämtas ur den släckta elden när elden vill ha mindre än TROSKEL.kolEld: poängen när den inte vill tändas alls, i så många minuter (steg 10.11.13)
  lekBas: 0.45, lekSed: 0.2, lekUng: 0.5, // barnets lust att leka (plus seden Barn gånger Sed), och så mycket mer för det yngsta (steg 10.2.43) ...
  nattTrott: 0.5, // på natten är handarbetet så här mycket mindre för den som är helt trött (steg 10.2.49)
  barnHjalp: 0.5, // ... mot lusten att hjälpa till: åldern delat med vuxen gånger detta plus hur akut byn behöver arbete
  flitigBas: 0.88, flitigAkut: 0.12, // chansen att arbeta för den flitige: Bas + Akut gånger hur akut arbetet är
  latBas: 0.6, latAkut: 0.4, // ... och för den lata (gånger hur väl de egna behoven är fyllda)
  arbeteMin: 60, arbeteSpann: 120, // ett arbetspass
  byggMin: 60, byggSpann: 90, // ett pass med bygge
  // lusten att arbeta och vikten av byns behov
  lustBas: 4, lustEgenskap: 3, lustVana: 2, // lusten = (Bas + färdigheten + egenskapen / Egenskap) gånger (1 + Vana gånger andelen vana)
  brusMin: 0.6, brusSpann: 0.8, // slumpbrus på poängen: mellan Min och Min + Spann
  // raderna på Förbättra (steg 10.2.3): värdet av att pröva sig fram (gånger nyfikenheten och sedvanan), arbetet där en teknik
  // kan komma, varor till handlaren, underhållet, att gå i lära och att fylla grenar och hö mot taket (gånger det som fattas).
  // Maten och veden över bufferten väger sitt behov (FORRAD), vid bufferten 0,4 respektive 0,15 gånger lusten / forbLust
  forbLust: 15, // maten och veden över bufferten: behovet gånger lusten (Försörjningens poäng, median ungefär 23 för maten och 7 för veden) delat med detta
  forbStam: 8, // ... och veden så här många gånger mer när en fälld stam ligger kvar och personen har en ledig yxa
  forbFritid: 0.04, // ... och fritiden, som vinner när förråden är nära eller över taket (det mjuka taket, steg 10.2.4)
  forbForsok: 0.6, forbTek: 0.5, forbHandel: 0.4, forbUnderhall: 0.45, forbLara: 0.35, forbFylla: 0.2, forbTatu: 0.3, forbFarg: 0.3, // forbFarg: färgbadet (steg 13.3.2)
  // handarbetet på fritiden (craft, steg 10.2.3): viltet och fisken som ruttnar, torka, grilla, gå i lära, pröva sig fram (gånger
  // nyfikenheten och sedvanan) och pyssla med ett eget projekt
  hantSlakt: 1, hantRensa: 0.9, hantTorka: 0.6, hantGrilla: 0.5, hantLara: 0.4, hantForsok: 0.5, hantProjekt: 0.3,
  torkPabud: 0.6, // ledarens påbud om torkat ändrar chansen att torka så mycket (-1 till 1, steg 3.5.2, styre.ts)
  egenDygn: 1.5, // den som har mat för kortare tid än så själv (sin egen, byns och familjens) arbetar för maten, hur fullt byns förråd än är (steg 3.10.26)
  tandMin: 0.8, tandVikt: 3, // tändmaterial: årstiden räknas minst Min, gånger Vikt
  prospektMin: 0.05, prospektMax: 1.3, // hur mycket platserna ger just nu räknas mellan dessa
  // fritid (leisure): vikter (ju större desto oftare), u = hur akut byn behöver arbete
  vilaVikt: 2, vilaLat: 0.6, // vila: per saknad vila, plus för den lata ...
  vilaDag: 0.3, // ... men på dagen bara när vilan är under detta (steg 2.3.10): annars vilar man ut när det är mörkt
  nattVila: 0.6, nattVilaVikt: 6, // på natten vill den vars vila är under Vila vila ut: vikten är VilaVikt gånger (1 − vilan / Vila) (steg 2.3.10, 12.1.189)
  hantSkill: 10, hantFlit: 20, // handarbete: färdigheten delad med Skill plus flit-anlaget delat med Flit
  hantLugn: 0.25, hantLugnVikt: 1.5, hantAkutVikt: 0.6, // ... gånger Lugn när u är under Lugn (byn har det gott ställt), annars Akut
  umgasVikt: 2, // umgänge: per saknat umgänge
  laraFritid: 2, laraNyfiken: 10, // att gå i lära på fritiden (steg 10.11.12): Fritid gånger nyfikenheten delad med Nyfiken, bredvid vilan och umgänget
  lugn: 0.5, lugnAkut: 0.3, // promenad, bad och strand: vikt gånger 1 när u är under Lugn, annars gånger Akut
  promBas: 0.3, promNyfiken: 15, // promenad: Bas plus nyfikenheten delad med Nyfiken
  badTemp: 15, badNoll: 14, badSpann: 8, badMax: 1.2, // bad: vattnet minst Temp grader, vikten (temp - Noll) / Spann, högst Max
  badVarm: 3, // den som är för varm (steg 2.3.4) lockas mer till bad: så här mycket gånger värmen över idealet
  strandBas: 0.2, strandDiv: 60, // strand: Bas plus (20 - empatin) / Div
  promNar: 4, promBort: 14, // en promenad går 4 rutor plus upp till 14 för den nyfikna och modiga
  promMin: 60, promSpann: 90, // en promenad
  badPassMin: 30, badPassSpann: 30, // ett bad
  strandMin: 30, strandSpann: 60, // en stund vid stranden
  // natten
  vaktByte: 7, // nattens vakt byts klockan 7 (timmar)
  vaktSlump: 8, // vakten är den modigaste med så här mycket slump (i mod)
  vaktBas: 1, vaktVarg: 1, vaktRovare: 2, vaktVarsel: 0.6, vaktPabud: 0.4, // antalet vakter (steg 10.1.20): grunden, och det som läggs till när vargar setts, strax efter ett rövaranfall, vid ett varsel och efter påbudet (−1 till 1)
  berattaAlder: 50, berattaBonus: 6, berattaDiv: 40, // berättande: (färdigheten + Bonus över Alder) / Div
  nattHantDiv: 70, // handarbete: (hantverk + flit) / Div
  nattNar: 2, nattLangt: 8, nattBara: 0.5, nattBaraTim: 2, // de modiga går upp till Nar + Langt rutor för att bära in, med vikten Bara, i så många timmar
  nattBarnSamtal: 0.6, nattBarnSova: 0.4, // ett barn sitter med de vuxna eller sover, med dessa vikter
  nattSamtal: 0.4, nattPaus: 0.1, // vikten för att umgås vid elden och för att bara vila där
  // borden (steg 2.2.15)
  maltidMin: 20, maltidSpann: 10, // en måltid vid bordet
  ataMin: 3, // den som går till förrådet och äter stannar där så länge (steg 11.1.77)
  bryggaSitt: 0.6, // finns en brygga sitter man eller badar där med denna chans (steg 7.3.11)
  vittjaMin: 5, // så många minuter det tar att vittja en mjärde
  salMote: 0.7, // året runt är samlingssalen mötesplatsen med denna chans, när byn har en (steg 7.2.7)
  bordSamtal: 0.5, // den som samtalar eller berättar sätter sig vid ett bord med denna chans, när det inte är kallt
  isar: 1.05, isarForsok: 24, // vid elden står man minst så här många rutor från de andra, så många försök (steg 3.6.8) ...
  isarVidga: 0.12, // ... och ringen blir så här mycket bredare för varje försök efter det fjärde, när det är trångt
  nattPrat: 10, nattPratSpann: 15, // på natten samtalar man så här många minuter, plus upp till spann, och går sedan till en ny plats (steg 3.6.8)
  eldRadie: 1.3, eldRadieSpann: 0.9, // vid elden sätter man sig så här många rutor från den, plus upp till spann (handlingens radie går före)
  vilaNara: 6, // den som vilar sätter sig på en ledig sittplats högst så här många rutor bort (steg 10.2.76)
  sovRadie: 1.8, sovRadieSpann: 1.2, // ... och den som sover ute lägger sig så här långt bort
  // skuggan (steg 2.3.13)
  skuggaRadie: 10, // så många rutor bort letar den som är för varm efter skugga
  skuggaBland: 3, // en av så många av de närmaste skuggrutorna
  svalkaMin: 30, svalkaSpann: 30, // så länge man svalkar sig i skuggan innan man väljer igen
  // handarbete utan bänk (steg 2.10.6)
  bynTak: 0.5, // med denna chans under tak i samlingshuset, när det finns
});
// skugga (steg 2.3.13): i ett hus eller under ett träd, där solen inte värmer (varmeDelar i steg.ts)
export const iSkugga = (s: State, x: number, y: number) => !!roomAt(s, x, y) || groundOf(s).trees[tileOf(x, y)] > KROPP.skugga;
// för varm och i solen, så att solen värmer mer: då vilar man och gör handarbete i skuggan
const forVarmISol = (s: State, p: Person, over = KROPP.forVarm) => p.warm > over && isLight(s.now) && temperature(s) > KROPP.solFran;
// en skuggig plats nära (x, y): en av de närmaste rutorna under ett träd eller i ett hus, inte i en vägg eller på en möbel
function skuggaNara(s: State, p: Person, x0: number, y0: number): { x: number; y: number } | undefined {
  const R = VAL.skuggaRadie, cx = Math.floor(x0), cy = Math.floor(y0), c: { x: number; y: number; d: number }[] = [];
  for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d > R || !inMap(x, y) || blocked(s, x + 0.5, y + 0.5) || bitAt(s, x, y) && !roomAt(s, x + 0.5, y + 0.5) || stationAt(s, x + 0.5, y + 0.5) || sittAt(s, x + 0.5, y + 0.5) || !iSkugga(s, x + 0.5, y + 0.5)) continue;
    c.push({ x, y, d });
  }
  if (!c.length) return undefined;
  c.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
  const t = c[Math.floor(rnd(s, 'val', p) * Math.min(VAL.skuggaBland, c.length))];
  return { x: t.x + 0.3 + rnd(s, 'val', p) * 0.4, y: t.y + 0.3 + rnd(s, 'val', p) * 0.4 };
}
// där p står om det är skugga, annars en skuggig plats nära
const skuggaHar = (s: State, p: Person) => iSkugga(s, p.x, p.y) ? { x: p.x, y: p.y } : skuggaNara(s, p, p.x, p.y);
// handarbete utan bänk (steg 2.10.6): någonstans inne i byns område (omrade.ts, steg 6.2.4), eller under tak i samlingshuset,
// så att arbetet inte hänger på var elden ligger. Inte i en vägg, i vattnet, i en station eller på en stubbe vid bordet.
// Den som är för varm i solen söker skugga nära platsen (steg 2.3.13).
function hantverkIByn(s: State, p: Person): { x: number; y: number } {
  const sal = samlingRum(s);
  if (sal && rnd(s, 'val', p) < VAL.bynTak) return punktIRuta(s, pick(s, friaRutor(s, sal.tiles), 'val', p), p);
  const o = omrade(s), cx = o.mitt.x + 0.5, cy = o.mitt.y + 0.5;
  if (forVarmISol(s, p)) { const sk = skuggaNara(s, p, cx, cy); if (sk) return sk; }
  for (let k = 0; k < 24; k++) {
    const x = o.x0 + rnd(s, 'val', p) * (o.x1 - o.x0 + 1), y = o.y0 + rnd(s, 'val', p) * (o.y1 - o.y0 + 1);
    if (iByn(s, x, y) && !blocked(s, x, y) && !sittAt(s, x, y) && !stationAt(s, x, y)) return { x, y };
  }
  return freeNear(s, cx, cy);
}
// var den bästa vännen och ovännerna ska sitta eller sitter vid elden f (steg 3.1.1)
function sittPlatser(s: State, p: Person, f: { x: number; y: number }) {
  let bast: { x: number; y: number } | undefined; const ovan: { x: number; y: number }[] = [], alla: { x: number; y: number }[] = [];
  for (const q of living(s)) {
    const t = q.task; if (q === p || !t || ACTS[t.act].plats !== 'elden' || Math.hypot(t.tx - f.x, t.ty - f.y) > VAL.eldRadie + VAL.eldRadieSpann + 1) continue;
    alla.push({ x: t.tx, y: t.ty });
    if (p.bast === q.id) bast = { x: t.tx, y: t.ty };
    else if (p.arke === q.id || (s.rels[relKey(p.id, q.id)]?.op ?? 0) < REL.ovan) ovan.push({ x: t.tx, y: t.ty });
  }
  return { bast, ovan, alla };
}
// en plats i rummet minst en ruta från de andra som är eller ska dit (steg 3.6.8), annars den sista som prövades
// rummets rutor där man kan sitta utan att stå framför en station eller vid ett bord (där den som arbetar där står)
const friaRutor = (s: State, tiles: number[]) => { const f = tiles.filter(i => { const x = i % W + 0.5, y = Math.floor(i / W) + 0.5; return !sittAt(s, x, y) && !stationAt(s, x, y); }); return f.length ? f : tiles; };
function isarIRum(s: State, p: Person, rum: number[]) {
  const tiles = friaRutor(s, rum), andra: { x: number; y: number }[] = [];
  for (const q of living(s)) if (q !== p && q.task && q.task.phase !== 'back') andra.push({ x: q.task.tx, y: q.task.ty });
  let at = punktIRuta(s, pick(s, tiles, 'val', p), p);
  for (let k = 1; k < VAL.isarForsok && andra.some(o => Math.hypot(o.x - at.x, o.y - at.y) < VAL.isar); k++) at = punktIRuta(s, pick(s, tiles, 'val', p), p);
  return at;
}
// var en handling görs, efter platsen i handlingar.ts
// platsen för act; under en översvämning aldrig i vattnet: ett rum eller en säng kan stå under vatten (vaktlarmet i by 42
// efter v271: en som lyssnade på musik i regnet satt i samlingshuset, där golvet stod under vatten), så då den närmaste torra rutan
export function spotFor(s: State, act: Act, p: Person): { x: number; y: number } {
  const u = platsFor(s, act, p);
  return s.flod && inMap(u.x, u.y) && iVattnetNu(s, tileOf(u.x, u.y)) ? freeNear(s, u.x, u.y) : u;
}
// bryggan är en plats att vara på (steg 7.3.11): man sitter där och ser ut över vattnet, och man badar från den
function bryggSpot(s: State, p: Person) {
  const br = bitsOf(s).filter(b => b.m === 'brygga' && b.b >= 1);
  if (!br.length || rnd(s, 'val', p) >= VAL.bryggaSitt) return undefined;
  const b = pick(s, br, 'val', p);
  return { x: b.x + 0.5, y: b.y + 0.5 };
}
// den närmaste lediga sittplatsen (en stubbe vid ett bord, en stol eller en bänk, stationRutor) inom VAL.vilaNara rutor från p:
// ingen annan är på väg dit eller sitter där (steg 10.2.76)
function ledigSittplats(s: State, p: Person) {
  const upptagna = new Set(living(s).filter(q => q !== p && q.task && q.task.phase !== 'back').map(q => Math.floor(q.task!.ty) * W + Math.floor(q.task!.tx)));
  let best: { x: number; y: number } | undefined, bd: number = VAL.vilaNara;
  for (const i of stationRutor(s).sitt) {
    if (upptagna.has(i)) continue;
    const x = i % W + 0.5, y = Math.floor(i / W) + 0.5, d = Math.hypot(x - p.x, y - p.y);
    if (d < bd && !blocked(s, x, y)) { bd = d; best = { x, y }; }
  }
  return best;
}
// en plats i ringen runt elden f (eldens ruta): bredvid den bästa vännen om hen sitter vid samma eld, och inte nära en ovän (steg 3.1.1)
function ringVid(s: State, p: Person, radie: number | undefined, f: { x: number; y: number }): { x: number; y: number } {
  const nara = sittPlatser(s, p, f), van = nara.bast && rnd(s, 'val', p) < RELT.bastSitt ? Math.atan2(nara.bast.y - f.y - 0.5, nara.bast.x - f.x - 0.5) : undefined;
  for (let k = 0; ; k++) { // runt elden, men inte i en husvägg eller i en station (Björn efter v89: någon stod i slaktbänken)
    // bredvid vännen: minst en ruta bort längs ringen (vinkeln efter radien)
    const r = (radie ?? VAL.eldRadie + rnd(s, 'val', p) * VAL.eldRadieSpann) + VAL.isarVidga * Math.max(0, k - 4), ang = van !== undefined && k < 4 ? van + (k % 2 ? -1 : 1) * (VAL.isar + 0.3 * Math.floor(k / 2)) / r : rnd(s, 'val', p) * Math.PI * 2, x = f.x + 0.5 + Math.cos(ang) * r, y = f.y + 0.5 + Math.sin(ang) * r;
    const ovanNara = k < 8 && nara.ovan.some(o => Math.hypot(o.x - x, o.y - y) < RELT.ovanAvstand);
    const tatt = k < VAL.isarForsok && nara.alla.some(o => Math.hypot(o.x - x, o.y - y) < VAL.isar); // minst en ruta mellan dem som samtalar (steg 3.6.8)
    if (k >= VAL.isarForsok + 3 || !blocked(s, x, y) && !sittAt(s, x, y) && !stationAt(s, x, y) && !ovanNara && !tatt) return k >= VAL.isarForsok + 3 ? freeNear(s, f.x + 0.5, f.y + 1.5) : { x, y }; // inte på en stubbe vid bordet
  }
}
function platsFor(s: State, act: Act, p: Person): { x: number; y: number } {
  const m = getMap(s.seed), d = ACTS[act], plats = d.plats ?? 'skog';
  // det som görs vid elden men fortare vid en station (lerkrukan på drejskivan, steg 12.4.1; sländan i vävstolen): vid stationen när byn har en
  if (plats === 'elden' && d.hantverk) { const st = stationFor(s, act, p); if (st && stationDef(st.k)?.fart?.[act]) { const at = vidStation(st); return { x: at.x + (rnd(s, 'val', p) - 0.5) * 0.6 * storlekAv(st).w, y: at.y }; } }
  const eb = plats === 'elden' ? eldFor(s, p) : undefined, f = eb ? eldXY(s, eb) : eldPlats(s); // vid elden: vid den brinnande lägereld man hör till, annars den närmaste som brinner (steg 6.3.1)
  // det som görs utan bänk görs inne i byn och inte vid elden (steg 2.10.6), också när det är kallt: den som fryser går till elden genom värmen (varme.ts)
  const iByn = d.slag === 'hantverk' && (plats === 'elden' || plats === 'station' && !stationFor(s, act, p));
  if (iByn && nederbord(s)) { const sal = samlingRum(s); if (sal) return punktIRuta(s, pick(s, friaRutor(s, sal.tiles), 'val', p), p); } // i regnet under tak (steg 2.11.1)
  if (iByn) return hantverkIByn(s, p);
  if (plats === 'skugga') return skuggaHar(s, p) ?? { x: p.x, y: p.y };
  // den som är för varm i solen vilar och gör handarbete i skuggan nära elden i stället (steg 2.3.13)
  if ((plats === 'elden' && d.hantverk || plats === 'sang' && act === 'vila') && forVarmISol(s, p)) {
    const bed = plats === 'sang' ? bedFor(s, p) : undefined;
    if (bed && roomAt(s, bed.x, bed.y)) return bed;
    const sk = skuggaNara(s, p, f.x + 0.5, f.y + 0.5); if (sk) return sk;
  }
  if (plats === 'station') { const st = stationFor(s, act, p); if (st) { const at = vidStation(st); return { x: at.x + (rnd(s, 'val', p) - 0.5) * 0.6 * storlekAv(st).w, y: at.y }; } } // vid stationen, längs hela dess bredd, annars i byn (eller vid elden när det är kallt)
  if (plats === 'bord') { const at = ledigPlats(s, p); if (at) return at; } // vid ett bord, annars vid elden
  if (plats === 'hard') { // vid den närmaste brinnande härden med tillbehöret (stekhällen, steg 10.2.87)
    let b: Fire | undefined, bd = Infinity;
    for (const f of s.eldar ?? []) if (f.hearth === 'hard' && f.lit && (!d.med || f.med?.includes(d.med))) { const e = eldXY(s, f), dd = Math.hypot(e.x - p.x, e.y - p.y); if (dd < bd) { bd = dd; b = f; } }
    if (b) return vidEld(s, b, (rnd(s, 'val', p) - 0.5) * 0.8, 1.3);
  }
  if (plats === 'elden' || plats === 'station' || plats === 'bord') {
    // när det är kallt samtalar och berättar man i samlingshuset, om det är varmare där än vid elden (byggnader.ts)
    const sal = d.social ? samlingRum(s) : undefined, c = sal ? coldOf(temperature(s)) : 0;
    // ... när det regnar (steg 2.11.1), och året runt är samlingssalen byns mötesplats (steg 7.2.7)
    if (sal && (c > 0 && varmareInne(s, sal, c, f) || nederbord(s) || c === 0 && rnd(s, 'val', p) < VAL.salMote)) return isarIRum(s, p, sal.tiles);
    // annars sätter man sig ofta vid ett bord för att samtala och berätta, när det inte är kallt
    if (d.slag === 'prata' && bordenOf(s).length && coldOf(temperature(s)) === 0 && rnd(s, 'val', p) < VAL.bordSamtal) { const at = ledigPlats(s, p); if (at) return at; }
    return ringVid(s, p, d.radie, f);
  }
  if (plats === 'kol') return { x: f.x + 0.5 + (rnd(s, 'val', p) - 0.5) * 0.6, y: f.y + 1.1 };
  if (plats === 'sang') { // i huset om det finns plats under tak, annars på marken en bit från elden
    // i huset om det är varmare där än vid elden
    const bed = bedFor(s, p), c = coldOf(temperature(s)), rum = bed && roomAt(s, bed.x, bed.y);
    if (bed && rum && (varmareInne(s, rum, c, f) || c === 0 || nederbord(s))) return bed; // när det inte är kallt räcker värmen överallt; i regnet under tak
    // vilan (steg 10.2.76): den som vilar sätter sig på en ledig stubbe, stol eller bänk nära, och lägger sig annars på marken
    if (act === 'vila') { const sitt = ledigSittplats(s, p); if (sitt) return sitt; }
    for (let k = 0; k < 12; k++) {
      const ang = (p.id * 2.399 + rnd(s, 'val', p) * 0.5) % (Math.PI * 2), r = VAL.sovRadie + rnd(s, 'val', p) * VAL.sovRadieSpann, x = f.x + 0.5 + Math.cos(ang) * r, y = f.y + 0.5 + Math.sin(ang) * r;
      if (inMap(x, y) && !blocked(s, x, y) && !stationAt(s, x, y)) return { x, y };
    }
    return freeNear(s, f.x + 0.5, f.y + 2);
  }
  if (plats === 'lek') return platsIByn(s, p, 'val'); // barnen leker var som helst i byn (omrade.ts); byn har ingen lekplats
  // ute på marken: vid stranden, på ängen och i skogen, eller avsides (toa)
  const strand = plats === 'strand' ? strandNu(s) : undefined; // under en torka flyttar stranden ut (steg 3.8.2)
  const paIsen = d.resurs === 'fiske' && islagt(s), vt = paIsen ? vattenNu(s) : undefined; // fiskaren pimplar också ute på isen (steg 12.1.209)
  const want = (t: number, x: number, y: number) => {
    if (bitAt(s, x, y)) return false; // inte i husen
    if (strand) return strand[y * W + x] === 1 || !!vt && vt[y * W + x] === T.Vatten;
    if (plats === 'ang') return t === T.Gras || t === T.Skog;
    if (plats === 'avsides') return (t === T.Gras || t === T.Skog || t === T.Sand) && !vidBanken(s, x, y); // aldrig bredvid ett bord eller en bänk (steg 3.10.3)
    return isForest(s, y * W + x); // grenar och vilt finns i skogen
  };
  // arbetsplatser räknas från byns läger (eld och lagerplatser), inte bara från elden
  const cands: { x: number; y: number; d: number; ruta?: FyndId }[] = [], mid = bynsMitt(s);
  const min = plats === 'ang' || plats === 'avsides' ? VAL.narAvstAng : VAL.narAvst, max = plats === 'avsides' ? VAL.langtAvsides : Infinity;
  for (let i = 0; i < VAL.provar; i++) {
    const x = Math.floor(mid.x + (rnd(s, 'val', p) - 0.5) * (2 * PLATS.dagX)), y = Math.floor(mid.y + (rnd(s, 'val', p) - 0.5) * (2 * PLATS.dagY));
    if (!inMap(x, y)) continue;
    const d = utanforByn(s, x, y);
    if (d < min || d > max) continue;
    if (want(m.tiles[y * W + x], x, y)) cands.push({ x, y, d });
  }
  // fynden som ligger samlade på en enda ruta (vildboet, steg 12.1.263) syns på håll: samlaren väger varje sådan ruta inom en
  // halv dags gång, så som de slumpade rutorna
  if (d.resurs === 'samla') for (const j of RUTFYND) {
    const rik = richnessFor(s, [j]);
    for (let y = Math.max(0, Math.floor(mid.y - PLATS.dagY)); y <= Math.min(H - 1, Math.floor(mid.y + PLATS.dagY)); y++) for (let x = Math.max(0, Math.floor(mid.x - PLATS.dagX)); x <= Math.min(W - 1, Math.floor(mid.x + PLATS.dagX)); x++) {
      if (!(rik(0, y * W + x) > 0) || bitAt(s, x, y)) continue;
      const dd = utanforByn(s, x, y);
      if (dd >= min && dd <= max) cands.push({ x, y, d: dd, ruta: j });
    }
  }
  cands.sort((a, b) => a.d - b.d);
  // mat: gå dit det finns mest att hämta, inte för långt bort; annars en av de närmaste platserna
  // avsides (toa): en plats var som helst mellan narAvstAng och langtAvsides, så att högarna inte bildar en ring (steg 3.6.7)
  const c = (d.resurs ? pickSpot(s, p, d.resurs, cands, d.resurs === 'samla' ? turFor(s, p) : undefined) : plats === 'avsides' && cands.length ? cands[Math.floor(rnd(s, 'val', p) * cands.length)] : pickNarmaste(s, cands, VAL.narmaste, 'val', p)) ?? nearestWanted(s, want, plats === 'avsides' ? min : 0) ?? { x: mid.x, y: mid.y };
  return { x: c.x + 0.5, y: c.y + 0.5 };
}
// samlarens tur (steg 12.1.187, turPerTimme i minne.ts): så många saker hen bär hem och hur fort hen går
const turFor = (s: State, p: Person): Tur => ({ borda: Math.max(1, bordPlats(s, p) / viktOf(carryKind('samla'))), fart: kroppFart(p, s.now) });
// en station eller en plats vid ett bord på rutan eller bredvid den
function vidBanken(s: State, x: number, y: number) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (stationAt(s, x + dx, y + dy) || sittAt(s, x + dx, y + dy)) return true;
  return false;
}

// ingen plats hittades i närheten: den närmaste rutan som passar, var den än ligger
// Sökningen börjar runt byns område och växer tills det bästa svaret ligger närmare än allt utanför rutan (steg 6.2.21):
// en ruta r rutor utanför områdets rektangel ligger minst r − kant från byn. Samma svar som en sökning över hela kartan
function nearestWanted(s: State, want: (t: number, x: number, y: number) => boolean, min = 0) {
  const m = getMap(s.seed), lager = bynsAvstand(s), o = omrade(s);
  for (let r = VAL.sokForst; ; r *= 2) {
    const x0 = Math.max(0, o.x0 - r), y0 = Math.max(0, o.y0 - r), x1 = Math.min(W - 1, o.x1 + r), y1 = Math.min(H - 1, o.y1 + r);
    let best: { x: number; y: number } | undefined, bd = Infinity;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * W + x, d = lager.at(i);
      if (d < min || d >= bd || !want(m.tiles[i], x, y)) continue; // inte närmare lägret än min (toa: inte mitt i byn, steg 3.10.3)
      bd = d; best = { x, y };
    }
    const hela = x0 === 0 && y0 === 0 && x1 === W - 1 && y1 === H - 1;
    if (hela || best && bd < r - OMRADE.kant) return best;
  }
}
// en plats på land en bit bort åt ett slumpat håll (p:s egen slumpföljd)
function walkSpot(s: State, p: Person, far: number) {
  const f = bynsMitt(s);
  for (let k = 0; k < 20; k++) {
    const ang = rnd(s, 'val', p) * Math.PI * 2, r = far * (VAL.gangMin + rnd(s, 'val', p) * VAL.gangSpann);
    const x = clamp(f.x + 0.5 + Math.cos(ang) * r, 0.5, W - 0.5), y = clamp(f.y + 0.5 + Math.sin(ang) * r, 0.5, H - 0.5);
    if (!blocked(s, x, y)) return { x, y };
  }
  return freeNear(s, f.x + 0.5, f.y + 3);
}
// stranden nära byns läger: rutorna på land vid vattnet, närmare lägret än strandNara och utan hus (ok), och badplatsen, den
// närmaste av dem. Sparas tills lägret ändras, något byggs (ett nytt hus kan stå på stranden) eller vattnet flyttar sig
const strandCache = new WeakMap<State, { key: string; ok: number[]; bad?: { x: number; y: number } }>();
function strandOf(s: State) {
  const key = `${omrade(s).key},${s.byggV ?? 0},${s.sjoTorr ? s.sjoTorr.v : -1},${s.flod?.niva ?? 0},${s.bryggV ?? 0}`; // och vattnet: torkan, översvämningen och bryggorna (som strandNu, steg 12.1.56)
  let c = strandCache.get(s);
  if (c?.key !== key) {
    const sh = strandNu(s), ok: number[] = [], lager = bynsAvstand(s);
    let bad: { x: number; y: number } | undefined, bd = VAL.strandNara;
    for (let i = 0; i < W * H; i++) {
      if (!sh[i]) continue;
      const x = i % W, y = Math.floor(i / W);
      if (bitAt(s, x, y)) continue;
      const d = lager.at(i);
      if (d < VAL.strandNara) ok.push(i);
      if (d < bd) { bd = d; bad = { x: x + 0.5, y: y + 0.5 }; }
    }
    strandCache.set(s, c = { key, ok, bad });
  }
  return c;
}
const bathSpot = (s: State) => strandOf(s).bad;
// en plats på land vid vattnet, inte för långt från byns läger (p:s egen slumpföljd)
function strandSpot(s: State, p: Person) {
  const { ok } = strandOf(s); // inte tom: leisure väljer stranden bara när det finns en badplats, och den är en av rutorna
  const i = pick(s, ok, 'val', p);
  return { x: i % W + 0.5, y: Math.floor(i / W) + 0.5 };
}
// Faror går före förbättringar. En korg eller ett spjut gör maten lättare att få tag i, men när kylan är en fara väntar
// sådant: tid och hö går då först till värmen, och inget byggs. Inför och under istiden sparar man hö till det. När byn
// fryser bär ingen in det som ligger ute, och när den svälter bara maten (day(), steg 2.12.3)
export function dangers(s: State) {
  const ppl = living(s), freezing = ppl.filter(q => q.warm < KROPP.kallt).length / (ppl.length || 1), ai = ageIndex(s);
  const cold = coldOf(temperature(s)) > 0 || freezing > VAL.fryserAndel;
  // kylan är en fara efter hur många som fryser, också när elden glöder, och när det är kallt utan någon eld som glöder (steg 10.2.9)
  return { kyla: freezing > VAL.fryserAndel || cold && !nagonGlod(s), svalt: foodDays(s) < VAL.svaltDygn, gras: kallTid(ai) || cold ? TROSKEL.torrgrasKyla : 0 };
}
satFaror(dangers);
// förrådsmålen för dryckerna (steg 10.2.12): krokarna sätts här, där alla filer redan är lästa
vatskaKrok.tagen = (s, v, n) => forbrukat(s, v, n);
flintaKrok.verktyg = flintaTillVerktyg; // flintan till redskapen i förrådsmålet (steg 10.2.12)
type Faror = ReturnType<typeof dangers>;
// det som väljs: handlingen, varför, hur länge, och var om det inte följer av handlingen
const BALTE_FORBAND = new Set<Act>(['jakt', 'vargjakt', 'bjornjakt', 'forsvar', 'forsvarRovare', 'strid']);
// den som ska i strid eller på jakt tar en remsa i bältet (steg 9.5.16), när det ligger en där hen står (steg 11.1.77)
export function balteForband(s: State, p: Person, act: Act) { if (BALTE_FORBAND.has(act) && !p.forbandMed) iRackhall(p.x, p.y, () => { if (getable(s, p, 'remsa') >= 1) { takeMaterial(s, p, 'remsa', 1); p.forbandMed = 1; } }); }
export interface Val { eldFor?: Act; skal?: Task['skal']; paus?: true; /* vilan är en paus när inget annat lockar, inte trötthet (steg 11.1.72) */ fordon?: number; dragdjur?: number; stanna?: boolean; act: Act; why: string; dur: number; pass?: number; spot?: { x: number; y: number }; ref?: number; tool?: string; site?: { x: number; y: number }; sok?: true | 'sten' | 'flinta'; hot?: 'rovare' | 'varg'; tandmat?: true; falt?: true; sno?: true; ho?: true; gava?: true; hamtar?: string; lon?: string; brand?: Task['brand']; kalla?: number }
const set = (v: Val, act: Act, why: string) => { v.act = act; v.why = why; v.paus = undefined; v.skal = undefined; return true; };
const paus = (v: Val, why: string) => { set(v, 'vila', why); v.paus = true; return true; }; // vilan när inget annat lockar (steg 11.1.72)

// Registret ARBETEN (steg 6.1.11, "Arbetsordningen" i designdokumentet): en rad per uppgift, i den ordning valet prövar dem.
// Valet går igenom registret uppifrån och tar den första rad som gäller nu (nar: dag, natt eller båda) och väljer något.
// Nivåerna (se Niva) säger vad raden är. Raderna vakt, leka och framtradande står före Rädda och prövas där; nivån styr inte var en rad prövas. Dagens pass (VAL.pass): på dagen kortas valets tid första gången en rad efter grundbehoven (över nivå 4) prövas. Nivå 6–9 på dagen är egna rader (steg 6.2.18): en rad per resurs under
// Försörjning, som vägs mot varandra med poäng, bygget under Tak, projekten och raderna på Förbättra, och Fritid sist.
// Man går sedan dit (steg.ts)
// villkoren för vädret (steg 6.1.12): ingen torkning eller bad i regn, inget fiske i storm
export type Vaderkrav = 'torrt' | 'lugnt';
function vaderTillater(s: State, krav?: Vaderkrav) {
  if (!krav) return true;
  const v = vaderNu(s);
  return krav === 'torrt' ? v.nb <= 0 : v.lage !== 'blast' && v.lage !== 'aska';
}
// byns behov räknas en gång i timmen, på jämna klockslag i spelet (timblocket i steg.ts), så att alla lägen väljer likadant
// (steg 6.1.12): hur många dygn maten och veden räcker, med tre decimaler som i sparfilen
// tändmaterialet (steg 12.1.39): så många som behövs för att bära hem det som fattas till elden, efter hur mycket en bybo
// bär i de fria händerna (bordPlats), som de andra materialen i förrådsmålen. Fattas en famn går en
function tandArbetare(s: State) {
  const fattas = (['torrgras', 'grenar'] as const).reduce((a, k) => a + Math.max(0, tandBuffert(s, k) - amountOf(s, k)) * viktOf(k), 0);
  if (fattas <= 0) return 1;
  const folk = living(s), bar = folk.reduce((a, q) => a + bordPlats(s, q), 0) / Math.max(1, folk.length);
  return Math.max(1, Math.ceil(fattas / Math.max(1e-9, bar) - 1e-9));
}
export function arbetsTimme(s: State) {
  const mat = r3(foodDays(s)), ved = r3(woodDays(s)), n = living(s).length || 1;
  // arbetarna för varje rad (steg 6.1.13), minst en: efter arbetet (det som fattas ÷ vad en person hinner på ett pass), per
  // invånare eller efter platserna (bygget: BYGG.perHus för varje hus det finns något att göra på; kolet: varje utbrunnen eld)
  const matFattas = Math.max(0, buffert(s, 'mat') - mat) * n, vedFattas = Math.max(0, buffert(s, 'ved') - ved); // bufferten med ledarens påbud, som raderna frågar (aningen om en hård vinter är personens egen, i dag())
  const hus = new Set<number>();
  for (const b of bitsOf(s)) if (b.hus !== undefined && (b.b < 1 || b.c < BYGG.laga) && husById(s, b.hus)?.flyttas === undefined) hus.add(b.hus); // ett hus som byggs upp på en ny plats lagas inte (steg 9.4.6)
  const kol = eldarOf(s).filter(e => (e.ash ?? 0) >= 1 && !e.lit && !emberOn(s, e)).length;
  const fler = 1 + PAB.hander * Math.max(0, pabud(s, 'vinter')); // påbudet Samla för vintern ger fler händer (steg 6.1.19)
  const arb: Record<ArbRad, number> = {
    mat: Math.max(1, Math.ceil(matFattas / VAL.matPass * fler)), ved: Math.max(1, Math.ceil(vedFattas / VAL.vedPass * fler)),
    bygga: Math.max(1, hus.size * BYGG.perHus * (lagGaller(s, 'dagsverke') ? LAG.dagsverke : 1)), tand: tandArbetare(s), leta: Math.max(1, Math.ceil(n / VAL.letaPer)), kol: Math.max(1, kol),
  };
  // och materialens buffert och tak (forradsmal.ts, steg 6.2.14) och byns del av projektens värde (steg 6.2.21: hur mycket
  // byn saknar av varje projekt, frågat en gång i timmen i stället för av varje person i varje val)
  s.arbBehov = { mat, ved, arb, mal: materialTimme(s), brist: bristAlla(s), bv: s.byggV ?? 0 };
}
// raderna som har arbetare (steg 6.1.13). Maten är flera arbeten (samla, jaga, fiska, fältet) som delar på samma arbetare
type ArbRad = 'mat' | 'ved' | 'bygga' | 'tand' | 'leta' | 'kol';
const radOf = (t: Task): ArbRad | undefined => t.tandmat ? 'tand' : t.sok ? 'leta' : t.act === 'bygga' ? 'bygga' : t.act === 'kol' ? 'kol' : ACTS[t.act]?.behov;
// räkneverket: hur många andra som gör raden just nu
function arbetarNu(s: State, p: Person, rad: ArbRad) {
  let n = 0;
  for (const q of living(s)) if (q !== p && q.task && radOf(q.task) === rad) n++;
  return n;
}
// har raden sina arbetare? Då väger den VAL.fullRad
const radFull = (s: State, p: Person, rad: ArbRad) => arbetarNu(s, p, rad) >= arbBehov(s).arb[rad];
const fullVikt = (s: State, p: Person, rad: ArbRad) => radFull(s, p, rad) ? VAL.fullRad : 1;
// en rad som väljs utan poäng (en chans eller en nödsak) tas med chansen fullRad när den har sina arbetare
const mjuk = (s: State, p: Person, rad: ArbRad) => !radFull(s, p, rad) || rnd(s, 'val', p) < VAL.fullRad;
const arbBehov = (s: State) => s.arbBehov ?? (arbetsTimme(s), s.arbBehov!);
// nivåerna: 1 Fara, 2 Nöd och vård, 3 Tillfälle, 4 Grundbehov, 5 Rädda, 6 Försörjning, 7 Tak, 8 Förbättra, 9 Fritid
type Niva = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
// det valet vet om personen; farorna räknas första gången en rad frågar och gäller hela valet
interface Ctx { s: State; p: Person; v: Val; a: number; lazy: number; light: boolean; f?: Faror; d?: Dag; forb?: boolean; fb?: Record<string, { sc: number; gor: () => void } | undefined> }
const faror = (c: Ctx) => c.f ??= dangers(c.s);
// Förbättra dämpas mjukt (steg 10.11.20): när kylan eller hungern är en fara tas raderna på Förbättra och projekten med chansen
// VAL.projFara (en dragning per val), som bygget dämpas (byggDampning): tiden går helst till faran, men ingenting stängs av
const slatterRad = ({ s, p, v }: Ctx, i = slaVal(s, p)) => { if (i === undefined) return false; const lie = freeTools(s, p, 'lie') > 0; projektVal(v, { act: 'slatter', text: lie ? 'Slår det höga gräset på ängen med lien.' : 'Slår det höga gräset på ängen med skäran.', min: VINTER.slaMin / (lie ? LIE_FART : 1) /* lien slår tre gånger så fort (steg 12.2.6) */, tool: 'skara', spot: { x: i % W + 0.5, y: Math.floor(i / W) + 0.5 }, ref: i }, 'Gräset på slåtterängen står högt'); return true; };
// den som är skadad eller sjuk tar Förbättra mer sällan, efter hur svårt (kroppLust, steg 12.1.46): vilan väger tyngre än förbättringarna
const forbNu = (c: Ctx) => { const f = faror(c), ch = (f.kyla || f.svalt ? VAL.projFara : 1) * kroppLust(c.p, c.s.now); return ch >= 1 || (c.forb ??= rnd(c.s, 'val', c.p) < ch); };
// lat: hur mycket tidigare den lata tar grundbehoven
const fryser = (c: Ctx) => c.p.warm < KROPP.kallt + KROPP.latVarme * c.lazy;
// värmen (varme.ts): den som fryser tar det sätt att bli varm (registret VARMA) som gör hen varmast de närmaste timmarna, med
// vägen dit. Det som hämtas har sina arbetare (mjuk); går ett sätt inte prövas nästa
const varmeRad = (c: Ctx, why: string) => {
  const { s, p, v } = c;
  const h: VarmeGor = {
    v, why, satt: (act, w) => set(v, act, w), vidEld: f => ringVid(s, p, ACTS.varma.radie, eldXY(s, f)), iRum: rum => isarIRum(s, p, rum.tiles),
    mjuk: rad => mjuk(s, p, rad), arbeta: (act, w, leta) => { arbeta(c, act, w, leta ? { leta: true } : {}); return true; },
  };
  return varmeSatt(s, p).satt.some(x => x.gor(h));
};
export interface Arbete {
  id: string; niva: Niva;
  nar?: 'dag' | 'natt'; // utan nar: både dag och natt
  vader?: Vaderkrav; // torrt: inte i regn eller snöfall; lugnt: inte i blåst eller åska
  arbetar?: true; // bara den som arbetar i dag (dag(c).works)
  forb?: true; // Förbättra (steg 10.11.20): den som arbetar i dag, och dämpas när kylan eller hungern är en fara (forbNu)
  minAlder?: number; // bara den som är så här gammal
  prova: (c: Ctx) => boolean | undefined; // true = raden valde något (v är ifyllt)
  // en rad med poäng (steg 6.2.18): raderna på samma nivå med poäng vägs mot varandra och den med högst poäng prövas.
  // 0 = raden gäller inte nu. full: raden har sina arbetare, och poängen blir VAL.fullRad gånger så stor; har alla rader
  // som gäller sina arbetare går man till nästa nivå
  poang?: (c: Ctx) => number; full?: (c: Ctx) => boolean;
  // ett pass (vaktpasset): den som har börjat göra handlingen pass håller på med den tills raden inte längre väljer den,
  // och bara Fara och Nöd (nivå 1–2) går före (fliken Människan, Nattvakten)
  pass?: Act;
}
// raderna på Förbättra med poäng (steg 10.2.3). Varje rad säger vad den skulle göra (kandidat: poängen och det som görs) eller
// inget. Kandidaten räknas en gång per val (Ctx.fb), så att poängen och valet blir samma sak
type ForbKand = { sc: number; gor: () => void };
interface ForbRad { id: string; fylla?: true; vila?: true; kand: (c: Ctx, d: Dag) => ForbKand | undefined }
const brus = (c: Ctx) => VAL.brusMin + rnd(c.s, 'val', c.p) * VAL.brusSpann;
export const FORBATTRA: readonly ForbRad[] = [
  // att pröva sig fram till en teknik: värdet växer med sedvanan och personens nyfikenhet (forsokChans), när byn har ett överskott
  { id: 'forsok', kand: (c, d) => {
    const ch = forsokChans(c.s, c.p, d.fd, d.wd); if (!(ch > 0)) return undefined;
    const fv = forsokVal(c.s, c.p); if (!fv) return undefined;
    return { sc: VAL.forbForsok * ch / TEKTAL.forsokChans * brus(c), gor: () => { set(c.v, 'forsok', `Byn har det den behöver. Prövar sig fram till ${TEK[fv.id].namn.toLowerCase()}.`); c.v.tool = fv.id; c.v.dur = fv.min * MIN; if (fv.spot) c.v.spot = fv.spot; } };
  } },
  // arbetet där en teknik kan komma
  { id: 'tekArbete', kand: c => {
    const { s, p } = c; // också när förråden är fulla: byn arbetar vidare mot nästa teknik (steg 10.2.4)
    const ta = tekArbete(s, p, a => WORK.includes(a) && (ACTS[a].vid !== 'vatten' || vaderTillater(s, 'lugnt')));
    if (!ta) return undefined;
    return { sc: VAL.forbTek * brus(c), gor: () => arbeta(c, ta.act, `Byn har det den behöver. Kanske kommer ${han(p)} på ${ta.t.namn.toLowerCase()}`) };
  } },
  // varor att byta med handlaren (steg 10.5.13)
  { id: 'handelVara', kand: c => { const h = handlarVaraVal(c.s, c.p); if (!h) return undefined; return { sc: VAL.forbHandel * c.s.handelsMal!.kvar * brus(c), gor: () => h(c.v) }; } }, // vägd efter den del av silvret som är kvar att fylla
  // underhållet (steg 6.2.12): ett nytt i stället för ett slitet, samma projekt som när byn saknar redskapet (steg 6.2.17)
  { id: 'underhall', kand: c => {
    const ug = underhallGrupp(c.s, c.p), uu = ug && PROJEKT[ug].uppgift(c.s, c.p);
    if (!uu) return undefined;
    return { sc: VAL.forbUnderhall * brus(c), gor: () => projektVal(c.v, uu, 'Byn har det den behöver. Ett av byns redskap är slitet och ett nytt görs i tid') };
  } },
  // vården på en grav (steg 10.4.2): den som minns den döda, mest den som stod hen nära
  { id: 'gravvard', kand: c => { const g = gravvardVal(c.s, c.p); if (!g) return undefined; return { sc: GRAV.vard * g.w * brus(c), gor: () => projektVal(c.v, g.uppgift, 'Byn har det den behöver') }; } },
  // att samla till en resa (steg 11.5.10, resa.ts): resans väntade värde per dygn och resenär, lusten och ledens fara
  { id: 'samlaResa', kand: (c, d) => {
    if (c.a < ALDER.vuxen || !kanGa(c.p)) return undefined;
    const r = resaPlan(c.s, c.p, d.fd, d.wd); if (!r) return undefined;
    return { sc: r.sc * brus(c), gor: () => { const sl = samlaResa(c.s, c.p, r); set(c.v, 'resa', `Samlar till en resa till ${r.namn}`); if (sl?.ut) { c.v.spot = sl.ut.samla; c.v.dur = RESA.packTim * HOUR; c.v.ref = sl.id; } else c.v.dur = 0; } };
  } },
  // tatueringen (steg 10.7.5): lusten hos den som vill ha märket gånger hantverket hos den som gör det (tatVal)
  { id: 'tatuera', kand: c => { const d = tatVal(c.s, c.p); if (!d) return undefined; return { sc: VAL.forbTatu * d.sc * brus(c), gor: () => { projektVal(c.v, { act: 'tatuera', text: `Gör ett märke i huden på ${d.q.name} med bennålen.`, min: TATU.min, tool: 'nal', spot: { x: d.q.x, y: d.q.y }, ref: d.q.id }, `${d.q.name} vill minnas att ${han(d.q)} ${TATUERINGAR[d.m].text}`); } }; } },
  // färgbadet (steg 13.3.2, farg.ts): smaken, anseendet och värdet färgen ger plagget, minus maten i växterna (fargVal)
  { id: 'farga', kand: c => { const d = fargVal(c.s, c.p); if (!d) return undefined; return { sc: VAL.forbFarg * d.sc * brus(c), gor: () => { projektVal(c.v, { act: 'farga', text: `Badar ${tingNamn(d.t).toLowerCase()} i ${FARGER[d.bad].namn.toLowerCase()} färg vid örtköket.`, min: FARG.min, tool: d.bad, ref: d.t.id }, 'Byn har det den behöver'); } }; } },
  { id: 'lara', kand: c => { const lv = laraVal(c.s, c.p); if (!lv) return undefined; return { sc: VAL.forbLara * brus(c), gor: () => { set(c.v, 'lara', `Byn har det den behöver. Går i lära hos ${lv.m.name}.`); c.v.spot = lv.spot; c.v.dur = lv.min * MIN; } }; } },
  // förråden mot taket: behovet över bufferten (dag: wBy och wWood sjunker mot taket) gånger lusten för det bästa arbetet
  { id: 'fyllaMat', fylla: true, kand: (c, d) => {
    const act = ACTS[d.best].behov === 'mat' ? d.best : d.rad.mat.act, M = FORRADSMAL.mat;
    // mot taket räknas också maten som inte håller (foodDaysAll): så räknar taket, medan bufferten bara räknar det som håller
    const b = buffert(c.s, 'mat'), alla = foodDaysAll(c.s), w = alla > b ? Math.min(d.wBy, mjuktTak(alla, b, lyxtak(c.s, 'mat'), M.min, M.minMatt)) : d.wBy;
    return { sc: w * d.rad.mat.sc / VAL.forbLust, gor: () => arbeta(c, act, `Mer mat till förrådet, som räcker ${dygn(d.fd)}`) };
  } },
  { id: 'fyllaVed', fylla: true, kand: (c, d) => {
    const act = ACTS[d.best].behov === 'ved' ? d.best : d.rad.ved.act;
    // en fälld stam som ligger kvar är ett påbörjat arbete som man vill göra klart (som ett påbörjat hus): den som har en yxa
    // och kan hugga den väger veden VAL.forbStam gånger mer
    const stam = stocks(c.s).length > 0 && freeTools(c.s, c.p, 'yxa') > 0 ? VAL.forbStam : 1;
    return { sc: d.wWood * d.rad.ved.sc / VAL.forbLust * stam, gor: () => arbeta(c, act, `Mer ved till förrådet, som räcker ${dygn(d.wd)}`) };
  } },
  // fritiden (steg 10.2.4): vinner den gör man inget av detta, utan valet går vidare till fritiden
  { id: 'fritidHellre', vila: true, kand: c => ({ sc: VAL.forbFritid * brus(c), gor: () => undefined }) },
  // grenarna och höet mot sitt tak; det andra redan bär hem räknas med, så att inte flera fyller över taket samtidigt
  ...(['grenar', 'torrgras'] as const).map(k => ({ id: 'fylla_' + k, fylla: true as const, kand: (c: Ctx): ForbKand | undefined => {
    const { s, p } = c, pavag = living(s).reduce((n, q) => n + (q !== p && q.task?.hamtar === k ? q.task.items?.[k] ?? 0 : 0), 0);
    const kvar = clamp(1 - (amountOf(s, k) + pavag) / Math.max(1, materialTak(s, k)), 0, 1);
    return { sc: VAL.forbFylla * kvar * brus(c), gor: () => arbeta(c, 'samla', `Mer ${k === 'grenar' ? 'grenar' : 'hö'} till förrådet`, { hamtar: k }) };
  } })),
];
// raderna på Förbättra för en person, med poängen och det som görs (för scenarierna; valet går genom ARBETEN)
export function forbattraKandidater(s: State, p: Person): { id: string; sc: number; gor: () => Val }[] {
  const v: Val = { act: 'vila', why: '', dur: 0 }, c: Ctx = { s, p, v, a: ageOf(p, s.now), lazy: 0, light: isLight(s.now) };
  return FORBATTRA.flatMap(f => { const k = forbKandidat(c, f); return k ? [{ id: f.id, sc: k.sc, gor: () => { k.gor(); return v; } }] : []; });
}
function forbKandidat(c: Ctx, f: ForbRad) {
  const m = c.fb ??= {};
  if (!(f.id in m)) m[f.id] = f.kand(c, dag(c));
  return m[f.id];
}
export const ARBETEN: readonly Arbete[] = [
  // 1 Fara: vargar är nära (steg 3.7.15), en tornado kommer (steg 3.8.4), det brinner (steg 3.8.5) eller vattnet stiger (steg 3.8.7)
  // den som brinner släcker sig själv först, och de som står nära hjälper hen före allt annat (steg 6.4.16)
  { id: 'brinner', niva: 1, prova: ({ s, p, v }) => { const m = slackaSigVal(s, p); if (!m) return false; set(v, m.act, m.why); v.skal = m.skal; v.spot = m.spot; v.dur = m.dur; v.ref = m.ref; return true; } },
  // larmet rymning (steg 11.12.5, fangelse.ts): den som hört det och är modig nog går till fängelsets dörr
  { id: 'stoppa', niva: 1, prova: ({ s, p, v, a }) => { if (a < ALDER.vuxen) return false; const d = stoppaVal(s, p); if (!d) return false; set(v, 'stoppa', d.why); v.spot = d.spot; v.ref = d.ref; v.dur = FANG.stoppMin * MIN; return true; } },
  { id: 'hjalpBrinnande', niva: 1, prova: ({ s, p, v }) => { const m = hjalpaVal(s, p); if (!m) return false; set(v, m.act, m.why); v.spot = m.spot; v.dur = m.dur; v.ref = m.ref; return true; } },
  // den som blöder trycker på sitt sår också när faran pågår, och hjälparna bakom kämparna vårdar den som blöder (steg 9.9.4):
  // förut stod alla kvar i försvaret medan de sårade förblödde på en halvtimme
  { id: 'skydd', niva: 1, prova: ({ s, p, v }) => {
    const sk = vargSkydd(s, p) ?? tornadoSkydd(s, p); if (!sk) return false;
    if (!p.svimmat && vardBehov(s, p, p)?.blod && varda(s, p, v, true)) return true;
    if (sk.act === 'hjalpaRovare') { const d = vardVal(s, p, false), q = d && living(s).find(x => x.id === d.ref); if (q && vardBehov(s, q, p)?.blod && varda(s, p, v, false)) return true; }
    set(v, sk.act, sk.why); v.spot = sk.spot; v.dur = sk.dur; v.hot = 'hot' in sk ? sk.hot : undefined; return true;
  } },
  // den som kan gå flyr från ett uppretat bo (steg 10.10.27, bin.ts)
  { id: 'binFly', niva: 1, prova: ({ s, p, v }) => { const b = retatNara(s, p.x, p.y); if (!b || !kanGa(p)) return false; set(v, 'flyBin', 'Bina sticker, springer undan'); v.spot = flyFranBin(s, p, b); v.dur = MIN; return true; } },
  { id: 'brand', niva: 1, prova: ({ s, p, v }) => { const br = brandVal(s, p); if (!br) return false; set(v, br.act, br.why); v.spot = br.spot; v.dur = br.dur; v.tool = br.tool; v.ref = br.ref; return true; } },
  // de vuxna som orkar bär undan maten från lagerplatserna vattnet kan nå, också på natten (flod.ts)
  { id: 'flod', niva: 1, prova: ({ s, p, v, a }) => {
    const fl = !s.flodHot || a < ALDER.vuxen || isSick(p, s.now) || !kanGa(p) ? undefined : flodUndan(s);
    if (!fl) return false;
    set(v, 'bara', fl.why); v.skal = 'flod'; v.spot = fl; v.dur = VAL.baraTim * HOUR; count(s, 'flod undan'); return true;
  } },
  // 2 Nöd och vård (sjuk, svag, fryser farligt, måste på toa genast)
  // den som ser ett slagsmål går emellan eller går undan (steg 10.1.4, narStridVal i kartstrid.ts)
  { id: 'slagsmal', niva: 2, prova: ({ s, p, v }) => { const d = narStridVal(s, p); if (!d) return false; set(v, d.act, d.why); v.spot = d.spot; v.dur = d.dur; v.ref = d.ref; return true; } },
  // den som är mycket hungrig (under det man äter av även när maten ska räcka, VARDRATT.snal) går till maten före vilan, och
  // det lilla barnet och den som ligger sjuk eller svag går dit så fort hen är hungrig och kan gå (steg 11.1.77)
  { id: 'hungrig', niva: 2, prova: ({ s, p, v, a }) => (p.hunger < KROPP.hungrig * VARDRATT.snal || a < ALDER.smabarn || ligger(p, s.now) || halsa(p) < KROPP.svag) && kanGa(p) && ataVal(s, p, v) },
  // den som är extremt kall värmer sig (varmeRad, varme.ts), också det lilla barnet, den sjuka och den svaga
  { id: 'fryserFarligt', niva: 2, prova: c => c.p.warm < KROPP.farligt && varmeRad(c, 'Fryser farligt') },
  { id: 'smabarn', niva: 2, prova: ({ v, a }) => a < ALDER.smabarn && set(v, 'sova', 'Är ett litet barn') },
  { id: 'toaGenast', niva: 2, prova: ({ p, v }) => p.toa < KROPP.toaGenast && set(v, 'toa', 'Måste gå på toa genast') },
  { id: 'torstFarligt', niva: 2, prova: ({ s, p, v }) => tortarFarligt(p) && dricka(s, p, v) }, // också den som är sjuk eller svag dricker
  { id: 'vardaSig', niva: 2, prova: ({ s, p, v }) => varda(s, p, v, true) }, // sina egna sår: trycka på, lägga förband och rengöra (steg 2.5.2)
  { id: 'sjuk', niva: 2, prova: ({ s, p, v }) => ligger(p, s.now) && set(v, 'sova', 'Är sjuk') }, // med feber eller svårt sjuk lägger man sig (steg 9.5.1)
  { id: 'svag', niva: 2, prova: ({ p, v }) => halsa(p) < KROPP.svag && set(v, 'sova', 'Är för svag för att orka något') }, // också av blodförlust och smärta (halsa.ts)
  { id: 'varda', niva: 2, prova: ({ s, p, v }) => varda(s, p, v, false) }, // en skadad är en fara: vården går före förbättringarna (steg 2.5.2)
  { id: 'vatten', niva: 2, prova: ({ s, p, v }) => hamtaVatten(s, p, v) }, // vatten i säcken åt den som inte kan gå (steg 2.10.1)
  { id: 'barmat', niva: 2, prova: ({ s, p, v }) => { const d = matTillFange(s, p); if (!d) return false; v.spot = d.spot; v.ref = d.ref; v.dur = MIN; if (d.ved) v.tool = 'ved'; return set(v, 'barmat', d.why); } }, // mat till fången (steg 11.12.2, fangelse.ts)
  // 3 Tillfälle (steg 6.1.14): det som går förlorat om ingen tar det nu. Den som ska följa med på vargjakten (varg.ts) går
  { id: 'vargjakt', niva: 3, prova: ({ s, p, v }) => {
    const j = vargjaktVal(s, p);
    if (!j) return false;
    set(v, 'vargjakt', j.why); v.spot = j.spot; v.dur = j.dur; return true;
  } },
  // ... och den som ska följa med på björnjakten (bjorn.ts, steg 6.6.6)
  { id: 'bjornjakt', niva: 3, prova: ({ s, p, v }) => {
    const j = bjornjaktVal(s, p);
    if (!j) return false;
    set(v, 'bjornjakt', j.why); v.spot = j.spot; v.dur = j.dur; return true;
  } },
  // ... och resenären i ett sällskap som packar eller går ut ur byn (resa.ts, steg 11.5.5)
  { id: 'resa', niva: 3, prova: ({ s, p, v }) => {
    const r = resaVal(s, p);
    if (!r) return false;
    set(v, 'resa', r.why); v.spot = r.spot; v.dur = r.dur; v.ref = r.ref; return true;
  } },
  // ... och den som ville vara med när någon samlade till en match (sport.ts, steg 10.7.12)
  { id: 'sport', niva: 3, prova: ({ s, p, v }) => {
    const sp = sportListaVal(s, p);
    if (!sp) return false;
    set(v, 'sport', sp.why); v.spot = sp.spot; v.dur = sp.dur; v.ref = sp.ref; v.tool = sp.tool; return true;
  } },
  // handlaren är här och byn har inte handlat (steg 4.4.1.3, handel.ts); på kvällen ligger filten ute (steg 4.5.4.11).
  // Som de andra tillfällena prövas raden på sin plats, före grundbehoven; den som står i kön eller handlar fortsätter
  { id: 'ritual', niva: 3, prova: ({ s, p, v }) => { const r = ritualVal(s, p); if (!r) return false; v.spot = r.spot; v.dur = r.dur; return set(v, 'ritual', r.why); } }, // ritualerna (steg 8.5.6)
  { id: 'bonNod', niva: 3, prova: ({ s, p, v }) => { const b = bonNod(s, p); if (!b) return false; v.tool = b.id; v.ref = b.vem; v.spot = { x: p.x, y: p.y }; v.dur = BONER[b.id].min * MIN; return set(v, 'be', BONER[b.id].text(s, p, b.o)); } }, // bönen i nöd (steg 8.5.3)
  { id: 'handla', niva: 3, prova: ({ s, p, v, light }) => {
    const hv = !light && skams(p, s.now) ? undefined : handlaVal(s, p);
    if (!hv) return false;
    set(v, hv.act, hv.why); v.spot = hv.spot; v.dur = hv.dur; v.ref = hv.ref; return true;
  } },
  // ett framträdande (steg 10.7.9, framtradande.ts): den som ville lyssna vid kallelsen går dit
  { id: 'lyssna', niva: 3, prova: ({ s, p, v }) => {
    const l = skams(p, s.now) ? undefined : lyssnaVal(s, p, q => spotFor(s, 'beratta', q));
    if (!l) return false;
    set(v, l.act, l.why); v.spot = l.spot; v.dur = l.dur; v.ref = l.ref; v.tool = l.tool; return true;
  } },
  // tillsynen vid en kolmila (steg 12.2.2, brann.ts): ett Tillfälle när tiden för tillsynen är inne
  { id: 'passa', niva: 3, prova: ({ s, p, v }) => { const b = passaVal(s, p); if (!b) return false; projektVal(v, passaUppgift(b), 'Det är dags att se till kolmilan'); return true; } },
  { id: 'rusta', niva: 3, prova: ({ s, p, v }) => { const r = rustaVal(s, p); if (!r) return false; v.spot = r.spot; v.ref = r.ref; v.dur = 2 * MIN; return set(v, 'rusta', r.why); } }, // byta om inför strid (steg 8.7.8), på sin nivå bland tillfällena (steg 10.2.2)
  // 4 Grundbehov (toa, värme, vatten, vila, mat). En lat person tillgodoser dem tidigare än en flitig
  { id: 'gammalSover', niva: 4, nar: 'natt', prova: ({ s, p, v, a }) => a > ALDER.sovGammal && rnd(s, 'val', p) < VAL.gammalSover && set(v, 'sova', 'Är gammal och sover på natten') },
  { id: 'toa', niva: 4, prova: ({ p, v, lazy }) => p.toa < KROPP.toaBehov + KROPP.latToa * lazy && set(v, 'toa', 'Behöver gå på toa') },
  { id: 'fryser', niva: 4, prova: c => fryser(c) && varmeRad(c, 'Fryser') }, // den som fryser värmer sig (varmeRad)
  { id: 'torstig', niva: 4, prova: ({ s, p, v, lazy }) => torstig(p, lazy) && dricka(s, p, v) },
  // örtteet (steg 9.5.8 och 10.2.34): den som är sjuk, fryser eller har ett infekterat sår och är hemma väljer att dricka te
  { id: 'te', niva: 4, prova: ({ s, p, v }) => { if (!villTe(s, p)) return false; v.spot = { x: p.x, y: p.y }; v.dur = 0; v.tool = 'te'; return set(v, 'dryck', 'Dricker örtte av rölleka'); } },
  // den som inte kan gå kravlar hem, och den som har mycket ont eller ett infekterat sår vilar (steg 2.5.2)
  // ... men bara korta sträckor: längre bort än GANG.kravlaMax rutor väntar hen där hen är på att bäras (steg 6.2.7)
  { id: 'kravla', niva: 4, prova: ({ s, p, v }) => {
    if (kanGa(p) || hemma(s, p)) return false;
    if (utanforByn(s, Math.floor(p.x), Math.floor(p.y)) <= GANG.kravlaMax) return set(v, 'vila', 'Är skadad och kravlar hem');
    set(v, 'vila', 'Kan inte gå och väntar på att bäras hem'); v.spot = { x: p.x, y: p.y }; return true;
  } },
  { id: 'vilaSkadad', niva: 4, prova: ({ s, p, v }) => vilaHellre(p) && set(v, 'vila', vilaSkal(p, s.now)) }, // sjuk eller skadad (steg 12.1.46)
  // extremt varm i solen: man söker skugga under ett träd eller i ett hus, så som den som fryser söker sig till elden (steg 2.3.13).
  // Den som bara är för varm arbetar som vanligt (steg 2.10.20)
  { id: 'svalka', niva: 4, prova: ({ s, p, v }) => {
    // extremt varm av branden: bort från den, inte in under träd som kan brinna (steg 9.2.135)
    if (p.warm >= KROPP.extremVarm && brandHetta(s, p.x, p.y) > 0) { const bu = brandUndan(s, p); if (bu) { v.spot = bu.spot; v.dur = bu.dur; return set(v, bu.act, 'Är för varm av branden och går undan'); } }
    if (!forVarmISol(s, p, KROPP.extremVarm)) return false;
    const sk = skuggaHar(s, p);
    if (!sk) return false;
    v.spot = sk; v.dur = (VAL.svalkaMin + rnd(s, 'val', p) * VAL.svalkaSpann) * MIN; return set(v, 'svalka', 'Är för varm och söker skugga');
  } },
  { id: 'trott', niva: 4, prova: ({ p, v, lazy, light }) => p.rest < (light ? KROPP.trottDag : KROPP.trottNatt) + KROPP.latVila * lazy && set(v, 'vila', 'Är trött') },
  // snart hungrig och det finns en ledig plats vid ett bord: man går dit och äter tillsammans med de andra (steg 2.2.15)
  { id: 'maltid', niva: 4, prova: ({ s, p, v }) => {
    const bord = p.hunger < KROPP.hungrig + KROPP.bordHunger && harMat(s, p) ? ledigPlats(s, p) : undefined;
    if (!bord) return false;
    v.spot = bord; v.dur = (VAL.maltidMin + rnd(s, 'val', p) * VAL.maltidSpann) * MIN; return set(v, 'maltid', 'Är hungrig och äter vid bordet');
  } },
  // hungrig, och maten ligger inte där hen står: hen går till den närmaste stacken med mat hen får ta och äter där (steg 11.1.77)
  { id: 'ata', niva: 4, prova: ({ s, p, v }) => ataVal(s, p, v) },
  { id: 'utbrott', niva: 4, nar: 'dag', prova: ({ s, p, v }) => utbrottVal(s, p, v) },
  // nattens vakt (byts varje natt kl. 7)
  { id: 'vakt', niva: 6, nar: 'natt', pass: 'vakt', prova: ({ s, p, v, a }) => vaktVal(s, p, v, a) },
  // barnen leker; de lite större hjälper till (raden arbete)
  { id: 'leka', niva: 9, nar: 'dag', prova: ({ s, v, a }) => a < ALDER.hjalper && set(v, 'leka', lekText(s)) },
  // ett framträdande vid scenen eller elden (steg 4.3.2 och 10.7.9, framtradande.ts): den som vill uppträda kallar
  { id: 'framtradande', niva: 9, nar: 'natt', prova: ({ s, p, v }) => {
    const fr = skams(p, s.now) ? undefined : framVal(s, p);
    if (!fr) return false;
    set(v, fr.act, fr.why); v.spot = fr.spot ?? spotFor(s, 'beratta', p); v.dur = fr.dur; v.ref = fr.ref; v.tool = fr.tool; return true;
  } },
  // 5 Rädda: det som blir dåligt först räddas först (radda nedan, steg 6.1.15). Att bära in är en förbättring: inte när byn fryser (talet dras ändå, så att personens följd är som förut). När byn
  // svälter bärs bara maten in, så att den inte blir liggande ute (steg 2.12.3)
  { id: 'avrusta', niva: 5, nar: 'dag', prova: ({ s, p, v, a }) => { if (a < ALDER.vuxen || !kanGa(p)) return false; const g = avrustaVal(s, p); if (!g) return false; v.spot = g.spot; v.ref = g.ref; v.dur = g.min * MIN; return set(v, 'avrusta', g.why); } }, // steg 8.7.5
  { id: 'begrava', niva: 5, nar: 'dag', prova: ({ s, p, v, a }) => { if (a < ALDER.vuxen || !kanGa(p)) return false; const g = begravaVal(s, p); if (!g) return false; v.spot = g.spot; v.ref = g.ref; v.dur = 2 * MIN; return set(v, 'begrava', g.why); } }, // kroppen och graven (steg 8.5.1)
  { id: 'bara', niva: 5, nar: 'dag', prova: c => {
    const { s, p, v } = c; let gt: ReturnType<typeof haulJob>;
    // det som ligger ute bärs in efter hur snart det blir dåligt och vad det är värt (steg 10.2.6), mindre när kylan är en fara;
    // vid svält bärs maten först (det andra väger som om det låg längre bort, haulJob)
    // vid svält bärs maten först, och det andra är mindre värt så länge byn svälter (VAL.baraKyla gäller också då)
    const f = faror(c);
    if (!(s.stackar?.length && (gt = haulJob(s, undefined, f.svalt)))) return false;
    // virket bär bara den som orkar lyfta det (steg 10.2.89): annars valdes samma jobb om och om igen. Det tunga körs på kälken när
    // turen ger mer per tid så (steg 10.10.2, fordon.ts), och det ingen orkar bära bara på den
    const iHand = iHandenAv(s, p, gt.k), fo = valjFordon(s, p, gt.k, gt.x, gt.y, iHand, stackPa(s, gt.x, gt.y, gt.k));
    if (!iHand && !fo) return false;
    const fara = f.kyla || (f.svalt && !isFood(gt.k));
    if (!radda(s, p, a => !isStored(s, a.x, a.y), fara ? VAL.baraKyla : 1, (vardeUte(s) + vardeIFel(s, gt)) / VAL.baraVarde)) return false;
    set(v, 'bara', gt.why); v.spot = gt; v.dur = VAL.baraTim * HOUR; v.fordon = fo?.g.id; v.dragdjur = fo?.d?.id; return true;
  } },
  // fältet (steg 2.10.3): den mogna grödan skördas innan den blir övermogen eller fryser, och den som börjat på sitt fält arbetar vidare
  { id: 'falt', niva: 5, nar: 'dag', prova: c => {
    const sk = c.a >= ALDER.vuxen ? faltNu(c.s, c.p, faror(c).svalt || faror(c).kyla) : undefined;
    if (!sk) return false;
    projektVal(c.v, { act: 'odla', text: sk.text, min: sk.min, tool: sk.tool, spot: sk.spot, ref: sk.ref }, sk.tool === 'mogen' ? 'Grödan på fältet är mogen' : 'Arbetar vidare på sitt fält'); return true;
  } },
  { id: 'slakta', niva: 5, nar: 'dag', prova: c => {
    const { s, p, v, a } = c;
    if (a < ALDER.vuxen) return false; // barnen slaktar inte: farorna behöver inte räknas
    const vilt = slaktbart(s, p, faror(c).svalt);
    if (!(vilt && radda(s, p, lagrat(s, k => k === vilt.sak)))) return false;
    processTask(s, v, vilt, 'Det finns vilt att slakta innan det blir dåligt'); return true;
  } },
  { id: 'rensa', niva: 5, nar: 'dag', prova: ({ s, p, v, a }) => a >= ALDER.rensar && !!rensaArt(s, p) && radda(s, p, lagrat(s, k => RENSAS.some(q => q.sak === k))) && (processTask(s, v, rensaArt(s, p)!, 'Det finns fisk att rensa innan den blir dålig'), true) },
  { id: 'torka', niva: 5, nar: 'dag', vader: 'torrt', prova: ({ s, p, v, a }) => a >= ALDER.grillar && kanTorka(s, p) && radda(s, p, lagrat(s, k => TORKAS.some(r => r.ra === k)), torkAndel(pabud(s, 'torkat'))) && (torkVal(s, v, 'Det finns kött och fisk att torka'), true) },
  { id: 'roka', niva: 5, nar: 'dag', prova: ({ s, p, v, a }) => a >= ALDER.grillar && kanTorka(s, p, 'rokeri') && radda(s, p, lagrat(s, k => ROKAS.some(r => r.ra === k))) && (set(v, 'roka', 'Det finns kött och fisk att röka'), v.dur = torkTid(s, 'rokeri'), true) }, // rökeriet, också i regn (steg 9.6.8)
  { id: 'valla', niva: 5, nar: 'dag', prova: ({ s, p, v }) => { const d = vallaVal(s, p); if (!d) return false; projektVal(v, { act: 'valla', text: d.hage !== undefined ? 'Flyttar djuren till en hage med mer bete.' : `Leder ${tamArt(d.art).ord[3]} in i hagen med ett rep.`, min: HAGE.vallaMin / tamEg(d).tamhet, spot: { x: d.x, y: d.y }, ref: d.id }, d.hage !== undefined ? 'Djuren har betat ner hagen' : 'Ett djur går utanför hagen'); return true; } }, // steg 9.8.4, 9.8.6
  { id: 'avliva', niva: 5, nar: 'dag', prova: ({ s, p, v }) => { const d = avlivaVal(s, p); if (!d) return false; projektVal(v, { act: 'avliva', text: `Avlivar ${tamArt(d.art).ord[3]} och bär ${tamArt(d.art).ord[0] === 'ett' ? 'det' : 'den'} till slaktbänken.`, min: SLAKTDJUR.min, tool: 'kniv', spot: { x: d.x, y: d.y }, ref: d.id }, { gammal: 'Djuret är gammalt', svalt: 'Byn behöver mat', host: 'Höet räcker inte över istiden', stold: 'Hungern driver till stöld' }[slaktOrsak(s, d, p)!] ?? 'Flocken är för stor'); return true; } }, // steg 9.8.7
  // slåttern räddar gräset som annars går förlorat när istiden kommer (steg 10.11.21): på Rädda med chansen raddaTim delat med
  // timmarna kvar av slåttertiden, annars på Förbättra
  { id: 'slatter', niva: 5, nar: 'dag', prova: c => { const i = slaVal(c.s, c.p); return i !== undefined && rnd(c.s, 'val', c.p) < Math.min(1, VAL.raddaTim / slatterKvar(c.s)) && slatterRad(c, i); } }, // steg 9.8.9
  { id: 'fyllaHo', niva: 5, prova: ({ s, p, v }) => { const d = hoVal(s, p); if (!d) return false; v.spot = d.spot; v.ref = d.ref; v.tool = d.karl; v.dur = 0; v.ho = true; set(v, 'vatten', 'Hämtar vatten till vattenhon'); return true; } }, // steg 10.10.31
  { id: 'mata', niva: 5, prova: ({ s, p, v }) => { const d = mataVal(s, p); if (!d) return false; projektVal(v, { act: 'mata', text: `Ger ${tamArt(d.art).ord[3]} mat.`, min: TAM.mataMin, spot: { x: d.x, y: d.y }, ref: d.id }, 'Djuren är hungriga'); return true; } }, // steg 9.8.1
  { id: 'tomma_latrin', niva: 5, nar: 'dag', prova: ({ s, p, v, a }) => { if (a < ALDER.vuxen) return false; const l = latrinAttTomma(s); if (!l || !enTill(s, 'tomma_latrin', p)) return false; projektVal(v, { act: 'tomma_latrin', text: 'Tömmer latrinen i komposten, så att ingen ny grop behöver grävas.', min: REST.tomMin, ref: l.id, spot: { x: l.x + 0.5, y: l.y + 0.5 } }, 'Latrinen är nästan full'); return true; } }, // steg 9.7.6: när byn har en kompost
  { id: 'steka', niva: 5, nar: 'dag', prova: ({ s, p, v, a }) => a >= ALDER.grillar && kanSteka(s, p) && radda(s, p, lagrat(s, k => !!SAKER[k]?.ra)) && (projektVal(v, { act: 'steka', text: 'Steker kött eller fisk i talg på stekhällen.', min: STEK.min }, 'Det finns mat att steka'), true) }, // steg 9.6.21
  // kokgropen: festen inom GROP.fore dygn (högst raddaTim) får ingen måltid om den inte läggs nu, så den hör till Rädda (steg 10.11.21)
  { id: 'gropa', niva: 5, nar: 'dag', prova: ({ s, p, v, a }) => { if (!(a >= ALDER.grillar && kanGropa(s, p))) return false; const t = tomGrop(s, p)!; projektVal(v, { act: 'gropa', text: 'Lägger en festmåltid i kokgropen bland heta stenar.', min: GROP.prepMin, spot: vidStation(t), ref: t.id }, 'En fest väntar'); return true; } }, // steg 10.7.28
  { id: 'koka_mat', niva: 5, nar: 'dag', prova: ({ s, p, v, a }) => a >= ALDER.grillar && kanKoka(s, p) && radda(s, p, lagrat(s, k => !!INGREDIENSER[k] && SAKER[k]?.haller !== undefined)) && (projektVal(v, { act: 'koka_mat', text: 'Lagar en rätt i lerkrukan över elden.', min: KOK.prepMin }, 'Det finns mat att laga'), true) }, // steg 9.6.3
  { id: 'grilla', niva: 5, nar: 'dag', prova: ({ s, p, v, a }) => a >= ALDER.grillar && kanGrilla(s, p) && radda(s, p, lagrat(s, k => RATTER.some(r => r.ra === k))) && (grillVal(s, v, 'Det finns rått kött och rå fisk att grilla'), true) },
  // 5 Rädda: att vittja en mjärde med fisk i (steg 7.4.2; på Rädda som designdokumentet säger, steg 12.1.56)
  { id: 'vittja', niva: 5, nar: 'dag', prova: c => {
    const { s, p, v, a } = c;
    if (a < ALDER.vuxen || !dag(c).works) return false;
    const m = kanVittja(s).filter(q => q.n >= MJARDE.vittjaMin && !living(s).some(o => o !== p && o.task?.act === 'vittja' && o.task.ref === q.id)).sort((x, y) => Math.hypot(x.x - p.x, x.y - p.y) - Math.hypot(y.x - p.x, y.y - p.y))[0];
    if (!m) return false;
    set(v, 'vittja', 'Mjärden har fisk i sig.'); v.ref = m.id; v.spot = { x: m.x + 0.5, y: m.y + 0.5 }; v.dur = VAL.vittjaMin * MIN;
    return true;
  } },
  // 6 Försörjning (steg 6.2.18): barnen leker eller hjälper till, påbudet Bygg före allt flyttar bygget hit (steg 6.1.19),
  // och sist kolet, flintan och en rad per resurs
  // under sin buffert (FORRADSMAL, forradsmal.ts), som väljs med poäng: behovet gånger lusten (dagen nedan). Om p arbetar alls
  // avgörs av flit och plikt (dag.works); annars blir det fritid (nivå 9)
  { id: 'barn', niva: 6, nar: 'dag', prova: c => {
    const { s, p, v, a } = c;
    if (a >= ALDER.vuxen) return false;
    const d = dag(c);
    // leken och hjälpen ur poängen (steg 10.2.43): leken efter seden Barn och mer för de yngre, hjälpen efter åldern och hur akut
    // byn behöver arbete; barnet leker med chansen lek / (lek + hjälp)
    // det skadade eller sjuka barnet leker och hjälper mindre och vilar i stället, efter hur svårt (kroppLust, steg 12.1.46):
    // lusten är en faktor på både leken och hjälpen (steg 12.1.216), och det de förlorar blir vilan
    const kl = kroppLust(p, s.now), lek = (VAL.lekBas + VAL.lekSed * s.seder.v.barn) * (1 + VAL.lekUng * (1 - a / ALDER.vuxen)), hjalp = a / ALDER.vuxen * (VAL.barnHjalp + d.u);
    const r = rnd(s, 'val', p) * (lek + hjalp), vila = (lek + hjalp) * (1 - kl);
    if (r < vila) return set(v, 'vila', vilaSkal(p, s.now));
    if (r < vila + lek * kl) return set(v, 'leka', lekText(s));
    // hjälpen väljs med samma poäng som de vuxnas rader på nivån (steg 12.1.45): den går till det som fattas, och skälet är
    // radens eget. Barnet som hjälper arbetar i dag; fattas inget (ingen rad har poäng eller alla har sina arbetare) leker det
    const cb: Ctx = { ...c, d: { ...d, works: true } };
    const w = vinnare(cb, POANGRADER[6].filter(r => (!r.nar || r.nar === 'dag') && vaderTillater(s, r.vader) && !(r.minAlder !== undefined && a < r.minAlder)));
    if (!w?.prova(cb)) return set(v, 'leka', lekText(s));
    v.why = `Hjälper till. ${v.why}`;
    return true;
  } },
  { id: 'byggPabud', niva: 6, nar: 'dag', prova: c => {
    const d = dag(c), pb = pabud(c.s, 'bygg');
    return d.works && !!d.job && pb > 0 && rnd(c.s, 'val', c.p) < pb * byggDampning(faror(c), d.utanYxa) && bygg(c); // svält och kyla dämpar påbudet som bygget
  } },
  // 6 Försörjning: mjölken är mat som geten ger varje dag (steg 9.8.6; flyttad från Rädda i steg 10.2.1). Mjölken, örten och
  // honungen prövas före raderna med poäng, så att den hungriga byn tar den mat som redan finns (steg 12.1.56)
  { id: 'ortPlocka', niva: 6, nar: 'dag', arbetar: true, prova: c => { const { s, p, v } = c; const t = ortPlockaVal(s, p); if (!t) return false; projektVal(v, { act: 'ortPlocka', text: 'Plockar den mogna örten i sin lerkruka.', min: ORTKRUKA.plockMin, spot: { x: t.x! + 0.5, y: t.y! + 0.5 }, ref: t.id }, 'Örten i krukan är mogen'); return true; } }, // steg 10.10.11
  { id: 'skatta', niva: 6, nar: 'dag', arbetar: true, prova: c => { const { s, p, v } = c; const t = skattaVal(s, p); if (!t) return false; projektVal(v, { act: 'skatta', text: 'Skär honungskakor ur bikupan.', min: BIN.skattaMin, spot: { x: t.x + 0.5, y: t.y + 0.5 }, ref: t.id }, 'Kupan har honung över'); const fk = freeOfKinds(s, p, ['fackla']); if (fk) { v.tool = fk; v.why = v.why.replace(/\.$/, '') + '. ' + ACTS.skatta.redskap!.fackla.tar; } return true; } }, // steg 10.10.20
  { id: 'mjolka', niva: 6, nar: 'dag', arbetar: true, prova: c => { const { s, p, v } = c; const d = mjolkaVal(s, p); if (!d) return false; projektVal(v, { act: 'mjolka', text: 'Mjölkar geten i en lerkruka.', min: BOSKAP.mjolkMin / tamEg(d).tamhet, spot: { x: d.x, y: d.y }, ref: d.id }, 'Geten har mjölk'); return true; } }, // steg 9.8.8
  // kolet i en utbrunnen lägereld och flintan och stenarna till elden är rader med poäng bland maten och veden (steg 10.11.13):
  // kolet efter hur lite elden behöver tändas, flintan efter bristen i förrådsmålet
  { id: 'kol', niva: 6, nar: 'dag', poang: c => { const e = kolEld(c); return e ? VAL.kolVikt * (1 - (e.want ?? 0) / TROSKEL.kolEld) : 0; },
    full: c => radFull(c.s, c.p, 'kol'),
    prova: c => {
      const { s, v } = c, e = kolEld(c)!;
      set(v, 'kol', 'Det ligger kol kvar i den slocknade elden');
      v.dur = VAL.kolMin * MIN;
      if (e !== s.fire) { v.ref = e.id; v.spot = vidEld(s, e, 0, 1.1); }
      return true;
    } },
  { id: 'leta', niva: 6, nar: 'dag', minAlder: ALDER.ansvar, poang: c => dag(c).works && flintaTillElden(c.s) ? VAL.letaVikt * letaBrist(c.s) : 0,
    full: c => radFull(c.s, c.p, 'leta'),
    prova: c => { arbeta(c, 'samla', `Byn behöver ${needStones(c.s) ? 'stenar' : 'flinta'}`, { leta: true }); return true; } },
  { id: 'mat', niva: 6, nar: 'dag', poang: c => { const d = dag(c); return d.works && d.fdBy < d.malBy ? d.wBy * d.rad.mat.sc : 0; },
    full: c => radFull(c.s, c.p, 'mat') && !faror(c).svalt,
    prova: c => { const d = dag(c); forByn(c); arbeta(c, d.rad.mat.act, `Byn behöver mat, förrådet räcker ${dygn(d.fd)}`); return true; } }, // raden har poäng bara när maten är under målet
  // den egna maten är en rad för personen och familjen (Förråden, bufferten per jag), ingen spärr: den har inga arbetare att fylla
  { id: 'egenMat', niva: 6, nar: 'dag', poang: c => { const d = dag(c); return d.works ? d.wEgen * d.rad.mat.sc : 0; },
    prova: c => { const d = dag(c); arbeta(c, d.rad.mat.act, `Behöver egen mat, har för ${dygn(d.egen)}`); return true; } },
  { id: 'ved', niva: 6, nar: 'dag', poang: c => { const d = dag(c); return d.works && d.wd < buffert(c.s, 'ved') ? d.wWood * d.rad.ved.sc : 0; },
    full: c => radFull(c.s, c.p, 'ved') && !faror(c).kyla,
    prova: c => { const d = dag(c); forByn(c); arbeta(c, d.rad.ved.act, `Byn behöver ved, förrådet räcker ${dygn(d.wd)}`); return true; } },
  { id: 'tand', niva: 6, nar: 'dag', poang: c => { const d = dag(c); return d.works && needTinder(c.s) ? Math.max(d.wBy, d.wEgen) * d.rad.tand.sc : 0; },
    full: c => radFull(c.s, c.p, 'tand'),
    prova: c => { forByn(c); arbeta(c, dag(c).rad.tand.act, 'Byn behöver tändmaterial till elden', { tandmat: true }); return true; } },
  // vakten vid fängelset (steg 11.12.5, fangelse.ts): dag och natt, med poäng bland maten och veden, mer ju farligare fången är
  { id: 'fangvakt', niva: 6, poang: c => c.a >= ALDER.vuxen && kanGa(c.p) && !isSick(c.p, c.s.now) && (!c.light || dag(c).works) ? fangvaktPoang(c.s, c.p) : 0,
    full: c => fangvaktFull(c.s, c.p),
    prova: c => { const at = fangvaktPlats(c.s); if (!at) return false; set(c.v, 'fangvakt', 'Vaktar fängelset'); c.v.spot = at; c.v.dur = FANG.vaktPass * MIN; taVapen(c.s, c.p); return true; } },
  // 7 Tak: att bygga åt den som saknar sovplats och laga det som är slitet. När bygget har sina arbetare går man vidare
  { id: 'flyttaeld', niva: 7, nar: 'dag', prova: ({ s, p, v, a }) => { const d = flyttaEldVal(s, p, a); if (!d) return false; v.spot = d.spot; v.dur = d.dur; return set(v, 'flyttaeld', d.why); } }, // elden flyttas (steg 2.10.4, eldflytt.ts)
  { id: 'bygga', niva: 7, nar: 'dag', prova: c => { const d = dag(c), dmp = byggDampning(faror(c), d.utanYxa); return d.works && !!d.job && !radFull(c.s, c.p, 'bygga') && (dmp >= 1 || rnd(c.s, 'val', c.p) < dmp) && bygg(c); } },
  // 8 Förbättra (steg 6.1.17–6.2.15): det mest värda projekt byn eller p saknar, sedan teknik, varor, underhåll och lära
  // (forbattra), och sist förråden till taket (fylla). Mer sällan när kylan eller hungern är en fara (forbNu, steg 10.11.20)
  // när kylan eller hungern är en fara tas ett projekt med chansen VAL.projFara (steg 10.2.6): tiden går helst till faran
  { id: 'projekt', niva: 8, nar: 'dag', arbetar: true, minAlder: ALDER.vuxen, prova: projektArbete }, // forbNu i projektArbete: det som skyddar mot kylan dämpas inte av kylan (steg 12.1.56)
  // 8 Förbättra (steg 10.2.1): bryggningen, ullen, hamlingen, hagen, staketen och fågelskrämman gör byn bättre men räddar
  // inget, så de prövas när Försörjningen har det den behöver, som projekten
  // kolmilan som brunnit klart (steg 12.2.1, brann.ts): den rivs och kolet tas ut
  { id: 'kolmila', niva: 8, nar: 'dag', forb: true, minAlder: ALDER.vuxen, prova: c => { const { s, v } = c; const t = attTomma(s); if (!t) return false; projektVal(v, branningUppgift(s, t), 'Kolmilan har brunnit klart'); return true; } },
  { id: 'brygga', niva: 8, nar: 'dag', forb: true, minAlder: ALDER.vuxen, prova: c => { const { s, p, v } = c; const b = bryggVal(s, p); if (!b) return false; projektVal(v, { act: b.act, text: b.act === 'tappa' ? (b.v === 'sprit' ? 'Häller upp spriten ur brännpannan i en liten lerkruka.' : 'Silar satsen och häller upp den i lerkrukor.') : b.act === 'branna' ? 'Häller vin eller öl i brännpannan och eldar under den.' : b.act === 'malta' ? 'Blöter korn och hänger upp det på torkställningen till malt.' : BRYGD[b.v].gor, min: b.act === 'tappa' ? BRYGG.tappMin : b.act === 'branna' ? BRYGG.brannMin : b.act === 'malta' ? BRYGG.maltMin : BRYGG.prepMin, spot: vidStation(b.kar), ref: b.kar.id }, b.act === 'tappa' ? 'Satsen i bryggkaret har jäst klart' : 'Byn vill ha mer att dricka'); return true; } }, // steg 9.6.12–9.6.13
  { id: 'klippa', niva: 8, nar: 'dag', forb: true, prova: c => { const { s, p, v } = c; const d = klippVal(s, p); if (!d) return false; const sax = freeOfKinds(s, p, ['ullsax']); projektVal(v, { act: 'klippa', text: sax ? 'Klipper ullen av fåret med saxen.' : 'Klipper ullen av fåret med kniven.', min: BOSKAP.klippMin / tamEg(d).tamhet / redskapTal('klippa', sax).fart, tool: sax ?? 'kniv', spot: { x: d.x, y: d.y }, ref: d.id }, 'Fårets ull har vuxit ut'); return true; } }, // steg 9.8.5; med ullsaxen på en tredjedel av tiden (steg 12.5.2)
  { id: 'hamla', niva: 8, nar: 'dag', forb: true, prova: c => { const { s, p, v } = c; const i = hamlaVal(s, p); if (i === undefined) return false; const ny = !hamlatPa(s, i); projektVal(v, { act: 'hamla', text: ny ? 'Kapar grenarna på en björk, så att den skjuter nya skott med löv åt djuren.' : 'Skär skotten med lövet på den hamlade björken till lövkärvar.', min: VINTER.hamlaMin, spot: { x: i % W + 0.5, y: Math.floor(i / W) + 1.2 }, ref: i }, ny ? 'Höet räcker inte åt djuren' : 'Den hamlade björken har nya skott'); return true; } }, // lövtäkten (steg 9.8.16)
  { id: 'ortSatta', niva: 8, nar: 'dag', forb: true, prova: c => { const { s, p, v } = c; const o = ortSattaVal(s, p); if (!o) return false; projektVal(v, { act: 'ortSatta', text: 'Sätter en växt i sin lediga lerkruka.', min: ORTKRUKA.sattMin, spot: { x: o.t.x! + 0.5, y: o.t.y! + 0.5 }, ref: o.t.id }, 'En kruka står tom'); return true; } }, // steg 10.10.11
  { id: 'krukaHem', niva: 8, nar: 'dag', forb: true, prova: c => { const { s, p, v } = c; const k = krukaHemVal(s, p); if (!k) return false; projektVal(v, { act: 'krukaHem', text: 'Bär sin lerkruka till rummet där hen sover.', min: KRUKA.upp, spot: { x: k.t.x! + 0.5, y: k.t.y! + 0.5 }, ref: k.t.id }, 'Krukan står inte hemma'); return true; } }, // steg 10.11.17
  { id: 'staket', niva: 8, nar: 'dag', forb: true, minAlder: ALDER.vuxen, prova: c => { const { s, p, v } = c; const st = staketVal(s, p); if (!st || !enTillDar(s, 'staket', p, t => t.ref === st.i, st.i)) return false; /* två kan hjälpas åt (steg 10.11.8) */ projektVal(v, { act: 'staket', text: 'Sätter staket runt fältet, så att hararna inte kommer åt grödan.', min: STAKET.min, spot: { x: st.i % W + 0.5, y: Math.floor(st.i / W) + 0.5 }, ref: st.i }, 'Fältet saknar staket'); return true; } }, // steg 9.7.10
  { id: 'skramma', niva: 8, nar: 'dag', forb: true, minAlder: ALDER.vuxen, prova: c => { const { s, p, v } = c; const f = skrammaVal(s, p); if (!f || !enTill(s, 'skramma', p)) return false; projektVal(v, { act: 'skramma', text: 'Sätter upp en fågelskrämma av grenar och hö på fältet.', min: SKADEDJUR.min, spot: { x: f.x + 0.5, y: f.y + 0.5 }, ref: f.id }, 'Fåglarna tar fröna på fältet'); return true; } }, // steg 9.7.11
  { id: 'sopor', niva: 8, nar: 'dag', prova: ({ s, p, v, a }) => { if (a < ALDER.vuxen) return false; const n = resterOver(s); if (n < REST.min || !enTill(s, 'sopor', p) || rnd(s, 'val', p) >= Math.min(1, n / REST.full)) return false; const ko = komposten(s), h = ko ? { x: ko.x, y: ko.y } : sophog(s); projektVal(v, { act: 'sopor', text: ko ? 'Bär resterna från slakten och skörden till komposten.' : 'Bär resterna från slakten och skörden till sophögen.', min: REST.tur, spot: { x: h.x + 0.5, y: h.y + 0.5 } }, 'Resterna ligger och skräpar i byn'); return true; } }, // steg 9.7.5: poängen kommer ur smutsen Inget går förlorat: på Förbättra (steg 10.11.21)
  { id: 'baka', niva: 8, nar: 'dag', prova: ({ s, p, v, a }) => { if (!(a >= ALDER.grillar && kanBaka(s, p))) return false; const t = SIM_bakugn(s)!; projektVal(v, { act: 'baka', text: 'Gör en deg av mjöl och vatten och sätter in den i bakugnen.', min: BAK.min, spot: vidStation(t), ref: t.id }, 'Byn behöver bröd'); return true; } }, // steg 9.6.23. Mjölet håller: på Förbättra (steg 10.11.21)
  { id: 'slatterForb', niva: 8, nar: 'dag', prova: c => forbNu(c) && slatterRad(c) }, // slåttern när inget går förlorat än (steg 10.11.21)
  // 8 Förbättra: det Byggplanen föreslagit när inget behov är akut (steg 7.2.10)
  { id: 'forbHus', niva: 8, nar: 'dag', prova: c => {
    const { s, p, v } = c, d = dag(c);
    if (!d.works || !forbNu(c) || radFull(s, p, 'bygga')) return false;
    const j = buildJob(s, p, true);
    if (!j?.bit.forb || j.missing) return false;
    building(s, p, v, j); return true;
  } },
  // 8 Förbättra med poäng (steg 10.2.3): att pröva sig fram, arbetet där en teknik kan komma, varor till handlaren, underhållet,
  // att gå i lära och att fylla förråden mot taket är rader som vägs mot varandra. Ingen står först och tar allt: varje rad har
  // sitt värde (VAL.forb…) med personens brus, och förråden sitt behov över bufferten, som sjunker mot taket
  ...FORBATTRA.map(f => ({ id: f.id, niva: 8 as const, nar: 'dag' as const, 
    poang: (c: Ctx) => { if (!dag(c).works || !forbNu(c)) return 0; const k = forbKandidat(c, f); return k ? k.sc : 0; },
    prova: (c: Ctx) => { const k = forbKandidat(c, f); if (!k || f.vila) return false; count(c.s, f.fylla ? 'fylla' : 'forbattra'); k.gor(); return true; } })),
  // allt på Förbättra är gjort och förråden har nått sina tak: tiden blir fritid (steg 6.2.15)
  { id: 'fullaForrad', niva: 8, nar: 'dag', prova: c => { const d = dag(c), fr = faror(c); if (d.works && !fr.kyla && !fr.svalt) count(c.s, 'fullaForrad'); return false; } },
  // när kylan eller hungern är en fara och inget annat finns att göra gör den som arbetar det byn behöver mest
  { id: 'fara', niva: 8, nar: 'dag', prova: c => {
    const d = dag(c), f = faror(c);
    if (!d.works || !(f.kyla || f.svalt)) return false;
    // skälet är faran (steg 12.1.45): kylan när kylan är faran, inte att byn behöver ved när veden räcker
    arbeta(c, d.best, ACTS[d.best].behov === 'ved' ? (f.kyla ? `Folk fryser, veden räcker ${dygn(d.wd)}` : `Byn behöver ved, förrådet räcker ${dygn(d.wd)}`) : `Byn behöver mat, förrådet räcker ${dygn(d.fd)}`); return true;
  } },
  // 9 Fritid: vila, hantverk, umgänge, promenad, bad eller att sitta vid stranden
  { id: 'fritid', niva: 9, nar: 'dag', prova: c => { leisure(c.s, c.p, c.v, c.a, false, dag(c).u, c.lazy); return true; } },
  // på natten håller man sig vid elden och berättar, gör handarbete, umgås eller sover
  // en dryck med alkohol på kvällen (steg 9.6.14, 10.2.34 och 10.7.23): ett val på fritiden, med chansen RUS.kvall per timme när byn har en
  { id: 'kvallsdryck', niva: 9, nar: 'natt', prova: ({ s, p, v }) => { const d = kvallsDryck(s, p, hemma(s, p)); if (!d || !kvallsChans(s, p)) return false; v.spot = { x: p.x, y: p.y }; v.dur = 0; v.tool = d; return set(v, 'dryck', `Dricker ${VATSKOR[d].namn.toLowerCase()} vid elden`); } },
  { id: 'kvall', niva: 9, nar: 'natt', prova: ({ s, p, v, a }) => { leisure(s, p, v, a, true); return true; } },
];

// raderna med poäng per nivå (steg 6.2.18)
const PASS = new Set(ARBETEN.flatMap(r => r.pass ? [r.pass] : [])); // handlingarna som är pass
const POANGRADER = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => [n, ARBETEN.filter(r => r.niva === n && r.poang)])) as Record<Niva, Arbete[]>;
// den rad som har högst poäng; en rad som har sina arbetare väger VAL.fullRad. Har alla rader som gäller sina arbetare finns
// ingen vinnare, och man går till nästa nivå. Lika poäng: registrets ordning
function vinnare(c: Ctx, rader: Arbete[]) {
  let bast: Arbete | undefined, bs = 0, ledig = false;
  for (const r of rader) {
    const sc = r.poang!(c);
    if (!(sc > 0)) continue;
    const full = r.full?.(c) ?? false;
    if (!full) ledig = true;
    const x = full ? sc * VAL.fullRad : sc;
    if (x > bs) { bs = x; bast = r; }
  }
  return ledig ? bast : undefined;
}

export function chooseTask(s: State, p: Person) { iHelaForradet(() => valjTask(s, p)); } // valet ser hela förrådet (steg 11.1.74)
function valjTask(s: State, p: Person) {
  if (fangeVal(s, p)) return; // den som sitter i fängelset (steg 11.12.1, fangelse.ts)
  if (p.svimmat) { p.task = { act: 'medvetslos', phase: 'do', tx: p.x, ty: p.y, until: s.now + 30 * MIN, carry: 0, dark: false, why: 'Har svimmat' }; return; } // kan inte göra något (steg 8.2.6)
  const a = ageOf(p, s.now), light = isLight(s.now), lazy = 1 - duty(s, p);
  const v: Val = { act: 'vila', why: '', dur: (VAL.vilaMin + rnd(s, 'val', p) * VAL.vilaSpann) * MIN, paus: true }; // 20–60 min; en paus tills något annat väljs
  const c: Ctx = { s, p, v, a, lazy, light }, nar = light ? 'dag' : 'natt';
  let rad: Arbete | undefined, kortat = false, vagd = 0;
  const galler = (r: Arbete) => !(r.nar && r.nar !== nar || !vaderTillater(s, r.vader)); // villkoren på raden (steg 6.1.12)
  const forsok = (rader: readonly Arbete[]) => {
    for (const r of rader) {
      if (!galler(r)) continue;
      if (r.niva > 4 && light && !kortat) { v.dur *= VAL.pass; kortat = true; }
      if (r.poang) { // raderna med poäng på nivån vägs mot varandra en gång (steg 6.2.18)
        if (vagd === r.niva) continue;
        vagd = r.niva;
        const w = vinnare(c, POANGRADER[r.niva].filter(galler));
        if (w?.prova(c)) { rad = w; return true; }
        continue;
      }
      if ((r.arbetar || r.forb) && !dag(c).works || r.forb && !forbNu(c) || r.minAlder !== undefined && a < r.minAlder) continue; // villkoren i den ordning raderna prövade dem
      if (r.prova(c)) { rad = r; return true; }
    }
    return false;
  };
  // den som håller på med ett pass (vaktpasset) fortsätter med det, och bara Fara och Nöd går före; är passet slut väljs som vanligt
  const pass = p.task && PASS.has(p.task.act) ? p.task.act : undefined;
  if (!pass || !forsok(ARBETEN.filter(r => r.niva <= 2 || r.pass === pass))) forsok(pass ? ARBETEN.filter(r => r.niva > 2) : ARBETEN);
  // buden (steg 8.6.8): den troende låter bli det som är förbjudet och vilar på vilodagen. Svält och kyla går före, men kostar
  if (rad && rad.niva > 2) {
    const id = budForbjuder(s, p, v.act), tabu = id ? undefined : raddFor(s, p, v.act); // och låter bli det hen är rädd nog för (steg 8.4.10)
    if (id || tabu || (vilodagNu(s, p) && ACTS[v.act].arbete)) {
      const f = faror(c);
      if (f.svalt || f.kyla) { if (id) budBrutet(s, p, id); }
      else { const dur = v.dur; for (const k in v) delete (v as unknown as Record<string, unknown>)[k]; v.dur = dur; set(v, 'vila', id ? 'Tron förbjuder det' : tabu ? `Vill inte ${tabu}` : 'Det är vilodag'); if (tabu) count(s, 'raddUndvek'); } // ett tomt val: inga märken från arbetet (steg 12.1.56)
    }
  }
  // straffet skam (steg 3.5.3, styre.ts): inte det faran väljer (vargarna, tornadon, branden, vattnet) och inte det som skyddar (skamfri i ACTS)
  if (rad?.niva !== 1 && ACTS[v.act].social && !ACTS[v.act].skamfri && skams(p, s.now)) { v.act = 'skams'; v.why = 'Skäms och håller sig undan de andra'; v.spot = undefined; }
  // arbetet som behöver elden tänder den eller lägger på ved först, så att den brinner arbetet ut (ELDARBETEN, eld.ts)
  const ef = eldForst(s, p, v.act).gor;
  if (ef) { const arb = v.act; for (const k in v) delete (v as unknown as Record<string, unknown>)[k]; Object.assign(v, ef, { eldFor: arb }); count(s, ef.act === 'tanda' ? 'tandForArbete' : 'eldaForArbete'); }
  if (v.act === 'toa') {
    v.dur = (VAL.toaMin + rnd(s, 'val', p) * VAL.toaSpann) * MIN;
    const l = latrinFor(s, p); // till latrinen om byn har en (steg 2.7.2, smuts.ts)
    if (l) { v.spot = { x: l.x + 0.5, y: l.y + 0.5 }; v.ref = l.id; v.why += '. Går till latrinen'; }
  }
  if (v.tandmat && !v.spot) v.spot = tandStalle(s, p); // tändmaterialet hämtas där hö och kvistar finns, närmast (steg 12.1.39)
  const sp0 = v.spot ?? spotFor(s, v.act, p), sp = freeNear(s, sp0.x, sp0.y); // aldrig i en husvägg
  p.task = { act: v.act, phase: 'go', tx: sp.x, ty: sp.y, until: s.now + v.dur + (startsOnArrival(v.act) ? GA_TID : 0), ...(ACTS[v.act].framme ? { arbTid: v.dur } : {}), carry: 0, why: v.why, ...(v.paus && v.act === 'vila' ? { paus: true as const } : {}), dark: !light, ref: v.ref, tool: v.tool, site: v.site, sok: v.sok, tandmat: v.tandmat, hot: v.hot, falt: v.falt, sno: v.sno, ho: v.ho, gava: v.gava, skal: v.skal, hamtar: v.hamtar, lon: v.lon, brand: v.brand, kalla: v.kalla, stanna: v.stanna, eldFor: v.eldFor, pass: v.pass !== undefined ? s.now + v.pass : undefined };
  balteForband(s, p, v.act);
  if (ACTS[v.act].plats === 'station') { const st = stationFor(s, v.act, p); if (st && Math.hypot(sp.x - vidStation(st).x, sp.y - vidStation(st).y) < 2) stationBrukad(s, st); } // hur mycket stationen används (steg 9.4.8)
  if (v.act === 'samtal' && !v.spot) samtalMed(s, p); // fram till den man vill prata med (steg 4.5.6.7)
  const k = usesTool(p.task);
  const tg = k ? take(s, p, k) : undefined;
  if (k && !tg) p.task.tool = undefined; // redskapet tas i handen: det egna först (agande.ts)
  else if (tg && tg.k !== k && ACTS[v.act].redskap?.[tg.k]) p.task.tool = tg.k; // det bästa i gruppen (järnyxan före flintyxan, steg 12.2.6): arbetet följer dess rad
  // den som hämtar något tungt (virket som klyvs) tar händerna eller kälken efter vad turen ger per tid (steg 10.10.2, fordon.ts)
  const ger = ACTS[v.act].ger;
  if (v.fordon === undefined && ger && SAKER[ger]?.lyft) { const fo = valjFordon(s, p, ger, sp.x, sp.y, iHandenAv(s, p, ger)); v.fordon = fo?.g.id; v.dragdjur = fo?.d?.id; }
  if (v.fordon !== undefined) taFordon(s, p, p.task, v.fordon, v.dragdjur); // kälken följer med i bördan
  seleVal(s, p); // barnet i bärselen följer med till arbetet (steg 13.2.3, barsele.ts)
  facklaVal(s, p); // facklan tänds för den som går ut i mörkret, och släcks när den inte behövs (ljus.ts)
}

// ett utbrott som väntar (steg 3.2.2, humor.ts), när grundbehoven är klara: den som är hungrig, törstig, fryser eller är
// trött letar mat, vatten, värme eller vila först (needs och arbetet). Den som flyr går ut i skogen, den som är elak går
// till den andra och den som slår sönder något gör det där hen står
function utbrottVal(s: State, p: Person, v: Val) {
  if (!p.ubr || p.hunger < KROPP.hungrig || torstig(p, 0) || p.warm < KROPP.kallt || p.rest < KROPP.trottDag) return false;
  const u = utbrottNu(s, p);
  if (!u) return false;
  utbrottBorjar(s, p, u.k, u.mal, u.ting);
  set(v, u.rad.act, 'Mår mycket dåligt');
  v.dur = u.dur; v.tool = u.k; // utbrottet: symbolen över huvudet (utbIkon) och namnet (verktyg)
  if (u.mal) v.spot = { x: u.mal.x, y: u.mal.y };
  else if (u.ting) { v.spot = { x: p.x, y: p.y }; v.ref = u.ting.id; }
  else if (u.rad.act === 'fly') v.spot = walkSpot(s, p, VAL.promNar + VAL.promBort * rnd(s, 'val', p));
  return true;
}

// vården (steg 2.5.2, halsa.ts): platsen är den skadade, och tiden räknas från framkomsten (startsOnArrival)
function varda(s: State, p: Person, v: Val, sjalv: boolean) {
  const d = vardVal(s, p, sjalv);
  if (!d) return false;
  v.spot = d.spot; v.ref = d.ref; v.dur = 0; v.stanna = d.stanna || undefined;
  return set(v, 'varda', d.why);
}

// vattensäcken (steg 2.10.1, torst.ts): till vattnet, och tiden att fylla den räknas från framkomsten (startsOnArrival)
function hamtaVatten(s: State, p: Person, v: Val) {
  const d = vattenVal(s, p);
  if (!d) return false;
  v.spot = d.spot; v.ref = d.ref; v.tool = d.karl; v.dur = 0; v.falt = d.falt; v.sno = d.sno; // säcken eller en mellanstor lerkruka (steg 9.4.12)
  return set(v, 'vatten', d.why);
}

// törst (steg 2.4.1): vid vattnet, eller snö som smälts vid elden i istiden (torst.ts). false = inget vatten att nå
function ataVal(s: State, p: Person, v: Val) {
  if (!MAT.behover(s, p) || !harMat(s, p) || iRackhall(p.x, p.y, () => harMat(s, p))) return false;
  const dit = narmasteMed(s, p, FOOD, undefined, (x, y) => iRackhall(x, y, () => harMat(s, p))); // den närmaste stacken där hen får ta mat
  if (!dit) return false;
  v.spot = dit; v.dur = VAL.ataMin * MIN; return set(v, 'ata', 'Är hungrig och går till maten');
}
function dricka(s: State, p: Person, v: Val) {
  const d = drickVal(s, p);
  if (!d) return false;
  if (d.spot) v.spot = d.spot;
  v.dur = 0; // tiden räknas från framkomsten (startsOnArrival)
  return set(v, d.act, d.why);
}

// dagen (nivå 6–9, steg 6.2.18): byns behov från timmens början (steg 6.1.12), poängen för varje arbete, bygget och om p
// arbetar alls (flit och plikt mot hur akut byn behöver arbete). Räknas första gången en rad på nivå 6–9 frågar
type Job = NonNullable<ReturnType<typeof buildJob>>;
interface Dag { utanYxa: boolean; fd: number; fdBy: number; malBy: number; wd: number; tot: number; matBuf: number; best: Act; wBy: number; wEgen: number; egen: number; wWood: number; rad: Record<'mat' | 'ved' | 'tand', { act: Act; sc: number }>; job?: Job; u: number; works: boolean }
// bygget väger mindre när kylan eller hungern är en fara och när timret saknas utan en ledig yxa (steg 10.2.6 och 12.1.74)
const byggDampning = (f: Faror, utanYxa: boolean) => (f.kyla || f.svalt ? VAL.byggKyla : 1) * (utanYxa ? VAL.byggUtanYxa : 1);
function dag(c: Ctx): Dag {
  if (c.d) return c.d;
  const { s, p, lazy } = c, fara = faror(c);
  const { mat: fd, ved: wd } = arbBehov(s), ai = ageIndex(s), tot = habitTotal(p);
  const w = bestWork(s, p, fd, wd, ai, tot, fara);
  // bygget (raden bygga på nivå 7) dämpas när kylan eller hungern är en fara och när timret saknas utan en ledig yxa (byggDampning);
  // hur akut byn behöver arbete kommer ur maten och veden (steg 12.1.74)
  const job = buildJob(s, p);
  const utanYxa = !!job?.missing && job.item === 'ved' && freeTools(s, p, 'yxa') === 0;
  const u = clamp(w.burg / VAL.akut, 0, 1); // hur akut byn behöver arbete
  const sat = Math.min(p.hunger, p.rest, p.social); // hur väl de egna behoven är fyllda
  const works = rnd(s, 'val', p) < (1 - lazy) * (VAL.flitigBas + VAL.flitigAkut * u) + lazy * sat * (VAL.latBas + VAL.latAkut * u);
  // bufferten (forradsmal.ts), med p:s aning om en hård vinter
  return c.d = { utanYxa, fd, fdBy: w.fdBy, malBy: w.malBy, wd, tot, matBuf: buffert(s, 'mat', p.varsel ? varselSamla(s, p) : 0), best: w.best, wBy: w.wBy, wEgen: w.wEgen, egen: w.egen, wWood: w.wWood, rad: w.rad, job, u, works };
}
// ett arbete under Försörjning, Tak eller Förbättra: skälet, passet, redskapen (withTools) och det som hämtas
// arbete för byns förråd: betalas ur förrådets del när lönelagen gäller, och det som bärs hem blir byns (steg 10.5.9, lon.ts)
const forByn = (c: Ctx) => { if (lonNu(c.s)) c.v.lon = 'forradet'; };
function arbeta(c: Ctx, act: Act, what: string, o: { tandmat?: boolean; hamtar?: string; leta?: boolean; matLeta?: boolean; job?: Job } = {}) {
  const { s, p, v, lazy } = c, tot = dag(c).tot;
  set(v, act, what + (lazy < 0.2 ? '. Plikttrogen.' : habitShare(p, [act], tot) > 0.25 ? '. Brukar göra det.' : p.skill[act as Skill] > 10 ? '. Skicklig på det.' : '.'));
  v.dur = (VAL.arbeteMin + rnd(s, 'val', p) * VAL.arbeteSpann) * MIN * VAL.pass;
  if (o.tandmat) v.tandmat = true;
  if ((v.act === 'samla' || v.act === 'jakt') && !o.leta) v.hamtar = o.hamtar; // det jägaren hämtar (skinnet) syns för de andra (arv i projekt.ts)
  withTools(s, p, v, act, what, faror(c), !!o.leta, !!o.matLeta);
  if (v.act === 'fiske' && islagt(s)) v.why = `${v.why} Hugger upp ett hål i isen och pimplar.`;
  if (o.job && v.act === 'falla') { v.ref = o.job.bit.hus; v.why = `${v.why} Stocken ska bli en vägg.`; } // trädet fälls för bygget
}
// bygget (Tak): saknas material hämtas det först
function bygg(c: Ctx) {
  const job = dag(c).job!;
  if (!job.missing) { building(c.s, c.p, c.v, job); return true; }
  const it = job.item;
  // timret är virke (steg 10.2.70): det klyvs ur en fälld stam, eller ett träd fälls först (virkets uppgift i projekt.ts)
  if (it === 'virke') {
    const yxa = freeTools(c.s, c.p, 'yxa') > 0, u = yxa ? PROJEKT.virke!.uppgift(c.s, c.p) : undefined;
    if (u) { projektVal(c.v, u, 'Bygget behöver virke'); return true; }
    if (yxa) { arbeta(c, 'ved', 'Bygget behöver virke', { hamtar: it }); return true; } // ingen stam att klyva: ett träd fälls först (axeTask)
    // utan en ledig yxa görs en yxa (som i withTools), annars väntar bygget, som det som görs vid en station (steg 12.1.56)
    const f = faror(c), uy = nuForst(c.s, c.p, f) ? projektNu(c.s, c.p, 'yxa', f) : undefined;
    if (uy) { projektVal(c.v, uy, 'Bygget behöver virke och en yxa att klyva det med'); return true; }
    // ingen ledig yxa: p hugger ved till dess (fäller det som står där huset ska stå, axeTask), med rätt skäl
    arbeta(c, 'ved', 'Bygget väntar på en ledig yxa till virket', { hamtar: it });
    return true;
  }
  // det som görs vid en station (plankorna till trägolvet, steg 10.2.90): det görs där, och går det inte nu väntar bygget
  // (förut föll det tillbaka på att samla grenar, och veden ur stammarna fyllde förrådet, steg 10.2.102)
  if (it && it !== 'torrgras' && it !== 'ved' && it !== 'grenar' && it !== 'virke') {
    const pk = Object.keys(TILLVERKA).find(k => TILLVERKA[k].ger === it);
    // saknas stationen görs den först, och saknas något till den går man ett steg till (arv, steg 12.1.56)
    const u = pk && PROJEKT[pk] ? arv(c.s, c.p, pk, faror(c))?.u : undefined;
    if (!u) return false;
    projektVal(c.v, u, `Bygget behöver ${sakNamn(it).toLowerCase()}`);
    return true;
  }
  arbeta(c, it === 'torrgras' ? 'samla' : 'ved', `Bygget behöver ${it === 'torrgras' ? 'hö' : it === 'ved' ? 'ved' : it === 'virke' ? 'virke' : 'grenar'}`, { hamtar: it, job: it === 'ved' ? job : undefined });
  return true;
}
// projektet (Förbättra, steg 6.1.17): det mest värda projekt byn eller p saknar (projekt.ts). Fattas ett material som går att
// hämta (hamtas i projekt.ts) hämtar man det; flintan letas bara av dem som raden leta ger plats åt, de andra går vidare på nivån
function projektArbete(c: Ctx) {
  const { s, p, v } = c, pr = bastaProjekt(s, p, faror(c));
  if (!(pr && faror(c).kyla && PROJEKT[pr.k].motKyla) && !forbNu(c)) return false; // kylan stoppar inte plaggen som värmer (steg 10.2.71)
  if (pr?.u) { projektVal(v, pr.u, PROJEKT[pr.k].skal ?? `Byn saknar ${PROJEKT[pr.k].namn.toLowerCase()}`); if (lonNu(s)) v.lon = 'byggen'; return true; }
  const hamta = pr?.sak ? hamtas(pr.sak) : undefined;
  if (!hamta) return false;
  if (hamta.leta) {
    if (!(rnd(s, 'val', p) < VAL.letaChans * fullVikt(s, p, 'leta'))) return false;
    arbeta(c, 'samla', `Byn behöver flinta till ${PROJEKT[pr!.k].namn.toLowerCase()}`, { leta: true, matLeta: true });
    return true;
  }
  arbeta(c, hamta.act, `${PROJEKT[pr!.k].namn} behöver ${sakNamn(pr!.sak!).toLowerCase()}`, { hamtar: pr!.sak });
  return true;
}

// Sist på Förbättra (steg 6.2.15): förråden fylls mellan bufferten och taket i FORRADSMAL. Först det arbete p helst gör om dess
// förråd är under taket, sedan maten, veden och materialen som plockas (grenar och hö). Är alla vid taket finns inget kvar
// att göra, och tiden blir fritid (undefined)
// maten har nått taket när den räcker så länge, eller när all mat, också den som ruttnar först, skulle räcka så länge: då ger
// mer mat bara mer som ruttnar
// varor att byta med handlaren (steg 10.5.13): handelsmålet (handelsMalRakna i handel.ts) säger slaget och hur många; p gör
// det om hen kan. Repet tvinnas till bufferten plus målet, redskapet görs som andra redskap (handelTask i redskap.ts). Svarar
// det som sätter valet, eller inget
export function handlarVaraVal(s: State, p: Person): ((v: Val) => void) | undefined {
  const m = s.handelsMal;
  if (!m) return undefined;
  if (m.k === 'rep') {
    if (!knows(p, 'rep') || amountOf(s, 'rep') >= villHaAv(s, 'rep') + m.till || getable(s, p, 'torrgras') < SAKER.rep!.skaffa!.av!.torrgras! + eldReserv(s, 'torrgras') || !enTill(s, 'tvinna', p)) return undefined;
    return v => set(v, 'tvinna', 'Byn har det den behöver. Tvinnar rep att byta med handlaren.');
  }
  const u = handelTask(s, p, m.k);
  if (!u) return undefined;
  return v => projektVal(v, u, `Byn har det den behöver. Gör ${sakNamn(m.k).toLowerCase()} att byta med handlaren`);
}
// egen lust att arbeta med färdigheten skill: färdigheten och egenskapen som hjälper, gånger vanan (acts: handlingarna som räknas)
const lust = (s: State, p: Person, skill: Skill, egenskap: Stat, acts: Act[], tot: number) => (VAL.lustBas + p.skill[skill] + stat(p, egenskap, s.now) / VAL.lustEgenskap) * (1 + VAL.lustVana * habitShare(p, acts, tot)) * smakDrag(p, acts); // och smaken (steg 3.3.5)
// så mycket ledarens påbud om torkat ändrar chansen att torka (1 = som utan påbud; styre.ts visar det i procent)
export const torkAndel = (v: number) => 1 + VAL.torkPabud * v;
// Rädda (steg 6.1.15): p tar det som blir dåligt inom VAL.raddaTim, och det som håller längre mer sällan; varde (0–1) är chansen
// som det är värt (det som ligger ute, steg 10.2.6). Talet dras alltid
function radda(s: State, p: Person, pass: (a: { k: string; x: number; y: number }) => boolean, gang = 1, varde = 0) {
  const r = rnd(s, 'val', p);
  return r < Math.min(1, gang * Math.max(varde, Math.min(1, VAL.raddaTim / timKvar(s, pass))));
}
// värdet av det som ligger ute och inte är i lagret (steg 10.2.6): det som inte ruttnar bärs in efter vad det är värt
function vardeUte(s: State) { let v = 0; for (const a of s.stackar ?? []) if (a.n > 0 && !isStored(s, a.x, a.y)) v += grundvarde(a.k) * a.n; return v; }
// det jobbet sorterar (maten bland materialet) är också värt att bära, fast det ligger i ett lager: värdet av stacken på rutan.
// Det som ligger bredvid lagret eller bara kan flyttas närmare elden räknas som lagrat
function vardeIFel(s: State, gt: { x: number; y: number; k: string }) {
  const x = Math.floor(gt.x), y = Math.floor(gt.y), zi = zoneAt(s, x, y);
  if (zi < 0 || allows(zonesOf(s)[zi], gt.k)) return 0;
  let v = 0; for (const a of s.stackar ?? []) if (a.x === x && a.y === y && a.k === gt.k) v += grundvarde(a.k) * a.n;
  return v;
}
// det som ligger i lagret och är av en sort som k godtar
const lagrat = (s: State, k: (k: string) => boolean) => (a: { k: string; x: number; y: number }) => k(a.k) && isStored(s, a.x, a.y);
// det arbete byn behöver mest just nu, vägt mot egen lust och vana. burg = hur mycket det mest behövda behövs
// det mjuka taket (steg 10.2.4): från bufferten (b) sjunker behovet från min till minMatt vid taket (tak), och därefter vidare
// som (tak / x)², aldrig tvärt till noll. Fritiden (VAL.forbFritid på Förbättra) väger mot det
const mjuktTak = (x: number, b: number, tak: number, min: number, minMatt: number) => x <= tak ? min - (min - minMatt) * (x - b) / Math.max(1e-9, tak - b) : minMatt * (tak / x) ** 2;
function bestWork(s: State, p: Person, fd: number, wd: number, ai: number, tot: number, fara: Faror) {
  // en försiktig by vill ha större förråd, och ledarens påbud drar åt sitt håll (steg 3.5.2, styre.ts)
  // den som anar en hård vinter vill ha ännu större förråd, mer i en förutseende by (steg 3.8.1, motgang.ts)
  const mer = p.varsel ? varselSamla(s, p) : 0;
  // bufferten och lyxtaket ur FORRADSMAL (forradsmal.ts, steg 6.2.13): under bufferten är maten ett behov, över den ett tillskott
  // (steg 3.10.9) som dämpas mot taket
  const M = FORRADSMAL.mat, V = FORRADSMAL.ved;
  const fs = 1 + FORRAD.forsiktig * pabud(s, M.pabud) + mer, vs = 1 + FORRAD.forsiktig * pabud(s, V.pabud) + mer;
  const onskat = buffert(s, 'mat', mer);
  // bufferten per jag (steg 6.2.20, "Förråden"): byn har sin buffert för den mat byn äger, så stor del av hela bufferten som
  // byn delar (delning.ts), och familjen sin för det den äger, resten. Byns väger gånger omtanken om byn, som projekten (projekt.ts, steg 10.5.2)
  const delas = s.delning?.andel ?? 1, fdBy = fd * bynsMatAndel(s), malBy = onskat * delas;
  const om = omtanke(s, p), wBy = (malBy <= 0 ? M.minMatt : fdBy < malBy ? clamp(FORRAD.behovTomt - fdBy / (M.dygn * fs * delas), M.min, FORRAD.behovMax)
    : mjuktTak(fdBy, malBy, malBy * M.matt, M.min, M.minMatt)) * om;
  const famDygn = familjMatDygn(s, familjOf(s, p.id)), malFam = onskat * (1 - delas);
  const wFam = famDygn < malFam ? clamp(FORRAD.behovTomt - famDygn / malFam * (FORRAD.behovTomt - M.min), M.min, FORRAD.behovMax) : 0;
  // den som har mat för kortare tid än egenDygn, sin egen, byns och familjens, arbetar alltid för maten (steg 3.10.26)
  const egen = egnaMatDygn(s, p), wNod = egen < VAL.egenDygn ? FORRAD.behovTomt - egen / VAL.egenDygn * (FORRAD.behovTomt - M.min) : 0;
  const wEgen = Math.max(wNod, wFam);
  const wFood = Math.max(wBy, wEgen);
  // veden över bufferten sjunker mjukt mot taket och vidare (steg 10.2.4), utan undantag för den som saknar yxa eller grenar vid taket
  const vBuf = V.dygn * vs * (FORRAD.behovTomt - V.min); // bufferten: där behovet nedan når V.min
  const wWood = (wd < vBuf ? clamp(FORRAD.behovTomt - wd / (V.dygn * vs), V.min, FORRAD.behovMax) : mjuktTak(wd, vBuf, vBuf * V.matt, V.min, V.minMatt)) * (kallTid(ai) ? ARSTID.vedKall : 1) * om; // byns ved, gånger omtanken (steg 10.5.2) // inför och under istiden väger veden tyngre
  const vikt = { mat: wFood, ved: wWood };
  let best: Act = 'samla', bs = -1, burg = 0;
  // det bästa arbetet för varje rad under Försörjning (steg 6.2.18) och dess poäng utan behovet: lusten, nyttan och bruset
  const rad: Dag['rad'] = { mat: { act: 'samla', sc: 0 }, ved: { act: 'ved', sc: 0 }, tand: { act: 'samla', sc: 0 } };
  const radBast = (k: keyof Dag['rad'], act: Act, sc: number) => { if (sc > rad[k].sc) rad[k] = { act, sc }; };
  const ppl = living(s);
  for (const w of WORK) {
    // behovet, tändmaterialet och vattnet står i handlingens rad (ACTS i handlingar.ts, steg 2.12.3)
    const d = ACTS[w], need = vikt[d.behov!];
    if (d.vid === 'vatten' && !vaderTillater(s, 'lugnt')) continue; // inget fiske i storm (steg 6.1.12)
    const tinder = !!d.tand && needTinder(s);
    // nytta för byn; det platserna har kvar väger också in hur mycket de ger just nu, och att fiske med händerna ger lite
    const yieldR = !d.resurs ? 1 : clamp(prospectFor(s, p, w as Kind), VAL.prospektMin, VAL.prospektMax) * (d.vid === 'vatten' ? FANGST.handFiske * (naSjon(s, p) ? 1 : 0) : 1) * toolGain(s, p, w, fara); // genom isen bara med ett hål (is.ts)
    const yieldF = tinder ? 1 : yieldR, season = d.sasong![ai];
    // maten som någon längtar efter är mer värd att hämta (steg 2.6.2)
    const col = need * (!d.resurs ? 1 : tinder ? Math.max(VAL.tandMin, season) * VAL.tandVikt : season * yieldF * onskan(p, w, s.now))
      * fullVikt(s, p, tinder ? 'tand' : d.behov!); // raden som har sina arbetare väger en tredjedel (steg 6.1.13)
    const like = lust(s, p, w as Skill, ACTS[w].egenskap!, [w], tot) * (VAL.brusMin + rnd(s, 'val', p) * VAL.brusSpann) * bredvidVikt(s, p, w, ppl); // egen lust och vana, och vad vänner och ovänner gör (steg 3.1.1)
    const sc = col * like;
    burg = Math.max(burg, col);
    if (sc > bs) { bs = sc; best = w; }
    if (tinder) radBast('tand', w, Math.max(VAL.tandMin, season) * VAL.tandVikt * like);
    radBast(d.behov!, w, (!d.resurs ? 1 : season * yieldR * onskan(p, w, s.now)) * like);
  }
  return { best, burg, wBy, wEgen, egen: wNod >= wFam ? egen : famDygn, fdBy, malBy, wWood, rad };
}

// att bygga eller laga en del av ett hus. Saknas material hämtar man det först
function building(s: State, p: Person, v: Val, job: NonNullable<ReturnType<typeof buildJob>>) {
  const b = job.bit, hus = s.hus?.find(h => h.id === b.hus)?.namn.toLowerCase() ?? 'huset';
  const over = job.fell ? stockOverHus(s) ?? egenStock(s, p) : undefined; // en stam över ett färdigt hus, eller den p själv fällt, huggs före nästa fällning (steg 9.2.86, 9.2.87)
  if (over) {
    // behöver byn virke (till timmerväggarna, steg 10.2.70) klyvs det ur stammen i stället för att den huggs till ved (steg 10.2.102)
    if (over.ved >= SKOG.virkeVed && amountOf(s, 'virke') < materialBuffert(s, 'virke')) {
      set(v, 'klyva', `Klyver virke ur stammen ${han(p)} fällde.`);
      v.ref = over.id; v.tool = 'yxa'; v.spot = { x: over.x + 0.3, y: over.y + 0.2 };
      return;
    }
    set(v, 'hugga', stockOverHus(s) === over ? 'Hugger en fälld stam som ligger över ett hus.' : `Hugger stammen ${han(p)} fällde.`);
    v.ref = over.id; v.tool = 'yxa'; v.spot = { x: over.x + 0.3, y: over.y + 0.2 };
    return;
  }
  if (job.fell) { // först fälls träden där huset ska stå
    set(v, 'falla', `Fäller ett träd där ${hus} ska stå.`);
    v.dur = fallTid(s, b.y * W + b.x); v.spot = { x: b.x + 0.5, y: b.y + 0.5 }; // ett litet träd fälls fortare
    v.tool = 'yxa';
    return;
  }
  if (job.hugg !== undefined) { // sedan huggs de fällda träden inne i huset, så att veden kan bäras ut (steg 8.1.13)
    const k = s.stockar?.find(q => q.id === job.hugg);
    set(v, 'hugga', `Hugger ett fällt träd inne i ${hus}.`);
    v.ref = job.hugg; v.tool = 'yxa'; v.spot = k ? { x: k.x + 0.3, y: k.y + 0.2 } : { x: b.x + 0.5, y: b.y + 0.5 };
    return;
  }
  set(v, 'bygga', job.repair ? (b.k === 'golv' ? `Golvet i ${hus} är slitet och behöver lagas.` : `En vägg i ${hus} är sliten och behöver lagas.`) : `${b.k === 'golv' ? 'Lägger golv i' : 'Bygger på'} ${hus}. ${homeless(s) > 0 ? 'Alla har inte en sovplats under tak.' : ''}`.trim());
  v.tool = job.repair ? (b.k === 'golv' ? 'lagaGolv' : 'laga') : b.k === 'golv' ? 'golv' : 'vagg'; v.ref = b.id;
  v.dur = (VAL.byggMin + rnd(s, 'val', p) * VAL.byggSpann) * MIN * VAL.pass;
  const site = siteOf(s, b); v.spot = job.need > 0 ? fetchSpot(s, job.item!, p, () => avail(s, job.item!, p, b.hus, b)) : site; if (job.need > 0) v.site = site;
}

// Flinta och stenar till elden letas när byn saknar dem: raden leta väger mot maten, som väger mer ju hungrigare byn är (steg 2.12.3)
// flintan under sin buffert i FORRADSMAL (minst TROSKEL.flintaMinsta), stenarna under sin eller till eldringen (steg 6.2.14)
// den utbrunna lägereld där kolet kan hämtas (den första först, steg 4.5.6.8), för den som är gammal nog
const kolEld = (c: Ctx) => c.a >= ALDER.ansvar ? eldarOf(c.s).find(e => (e.ash ?? 0) >= 1 && !e.lit && !emberOn(c.s, e) && (e.want ?? 0) < TROSKEL.kolEld) : undefined;
// hur mycket byn saknar av flintan och stenarna till elden (0 till 1): stenar till ringen saknas helt, annars bristen mot bufferten
const letaBrist = (s: State) => needStones(s) ? 1 : Math.max(...(['flinta', 'sten'] as const).map(k => { const b = materialBuffert(s, k); return b > 0 ? clamp(1 - amountOf(s, k) / b, 0, 1) : 0; }));
const flintaTillElden = (s: State) => underBuffert(s, 'flinta') || needStones(s) || underBuffert(s, 'sten');
// arbetet med redskap: flinta letas vid stenarna, yxan fäller träd, korgen och spjutet görs först om de saknas.
// fara: farorna från day(), leta: letar vid stenarna hela passet, matLeta: ett projekt saknar flinta (steg 6.1.17)
function withTools(s: State, p: Person, v: Val, best: Act, what: string, fara: Faror, leta = false, matLeta = false) {
  const stones = needStones(s);
  if (best === 'samla' && (leta || matLeta)) { // byn saknar flinta eller stenar till eldringen (raden leta) eller ett projekt saknar flinta. Stenarna ligger långt bort, så där letar man ett helt pass. Det vanliga samlandet går inte dit (steg 12.1.39)
    const fa = flintArea(p), fl = (fa !== undefined && flintSpot(s, p, (x, y) => areaOf(x, y) === fa)) || flintSpot(s, p);
    if (fl) { v.spot = fl; v.dur /= VAL.pass; v.sok = stones ? 'sten' : 'flinta'; v.why = `${v.why} Letar efter ${stones ? 'stenar till en eldring' : 'flinta'} vid stenarna${fa !== undefined ? ` där ${han(p)} vet att det finns flinta` : ''}.`; }
  }
  // byn vill ha frön: ibland går den som samlar till de vilda grödorna och plockar (där kommer man på odling, steg 2.10.11)
  if (best === 'samla' && !v.sok && !v.tandmat) {
    const vf = vildFronPlats(s);
    if (vf && rnd(s, 'val', p) < VAL.fronChans) { v.spot = vf; v.why = `${v.why} Plockar vilda frön.`; }
  }
  const ax = best === 'ved' ? axeTask(s, p) : undefined; // med yxa fälls träd och huggs ved
  const tv = best === 'ved' ? torvHellre(s, p, !!ax) : undefined; // torven, när en tur ger mer bränsle per minut (steg 12.1.3, torv.ts)
  if (tv) {
    set(v, 'torv', `${what}. Gräver torv i myren.`);
    v.spot = tv.spot; v.tool = tv.tool; v.dur = TORV.min * MIN;
  } else if (ax) {
    set(v, ax.act, `${what}. ${ax.why}.`);
    if (ax.dur) v.dur = ax.dur;
    v.spot = { x: ax.x, y: ax.y }; v.tool = 'yxa'; v.ref = ax.ref;
  } else if (best === 'ved') { // utan yxa görs en, som projekt (steg 6.2.17); när kylan är en fara mer sällan (projektets dämpning, steg 10.2.6)
    const u = nuForst(s, p, fara) ? projektNu(s, p, 'yxa', fara) : undefined;
    if (u) projektVal(v, u, what);
  }
  // med det bästa redskapet som är ledigt; finns inget gör den som kan ett först (när kylan är en fara med chansen PROJEKT_TAL.kyla)
  const rader = ACTS[v.act].redskap;
  if (rader) for (const [g, ks] of Object.entries(toolGroups(v.act))) {
    if (!rader[ks[0]].tar) continue; // yxan väljs med arbetet (axeTask)
    if (g === 'korg' && ryggsack(s, p)) continue; // den som har en ryggsäck på sig tar ingen korg (steg 7.1.3)
    const k = freeOfKinds(s, p, ks);
    if (k) { v.tool = k; v.why = v.why.replace(/\.$/, '') + '. ' + rader[k].tar; return; }
    const u = GORS[g] && nuForst(s, p, fara) ? projektNu(s, p, g, fara) : undefined; // redskapet görs som projekt (steg 6.2.17), vid sin egen plats: inget ärvs från flintletandet eller tändmaterialet
    if (u) { v.spot = undefined; v.sok = undefined; v.tandmat = undefined; projektVal(v, u, what); return; }
  }
}
// att göra redskapet först i stället för att arbeta utan det: när kylan är en fara med chansen PROJEKT_TAL.kyla, projektets dämpning (steg 10.2.6)
const nuForst = (s: State, p: Person, fara: Faror) => !fara.kyla || rnd(s, 'val', p) < PROJEKT_TAL.kyla;
// hur mycket mer arbetet ger med det redskap som finns ledigt eller kan göras (det bästa först). Ett redskap räknas som
// möjligt att göra som withTools skulle göra det: när kylan är en fara med chansen PROJEKT_TAL.kyla, och med höet som sparas till värmen
export function toolGain(s: State, p: Person, act: Act, fara: Faror) {
  for (const [g, ks] of Object.entries(toolGroups(act))) {
    if (g === 'korg' && ryggsack(s, p)) return ACTS[act].redskap![ks[0]].ger ?? 1; // ryggsäcken ger det korgen ger (steg 7.1.3)
    const ger = ACTS[act].redskap![ks[0]].ger ?? 1;
    if (freeOfKinds(s, p, ks)) return ger;
    if (GORS[g] && PROJEKT[g].kan(s, p, fara)) return fara.kyla ? 1 + (ger - 1) * PROJEKT_TAL.kyla : ger; // i kylan görs det mer sällan först (nuForst, steg 10.2.6)
  }
  return 1;
}
// slakta det fällda viltet eller rensa fisken vid slaktbänken (DJUR i redskap.ts), så länge det tar, med kniven om det behövs
// det första djuret som p kan slakta (kaninen, vargen; steg 3.7.14)
const slaktbart = (s: State, p: Person, svalt = dangers(s).svalt) => DJURARTER.find(art => art.act === 'slakta' && canProcess(s, p, art) && !heligtAvstar(s, p, art.art, svalt)); // det heliga djuret slaktas inte, utom i svält (steg 10.3.15)
const RENSAS = [DJUR.abborre, DJUR.gadda, DJUR.mort, DJUR.braxen, DJUR.sik];
const rensaArt = (s: State, p: Person) => RENSAS.find(a => canProcess(s, p, a));
function processTask(s: State, v: Val, art: Djurart, why: string) {
  set(v, art.act, why); if (art.kniv) v.tool = 'kniv';
  v.dur = Math.min(art.maxTim * HOUR, (djurKvar(s, art) / art.timme) * HOUR + VAL.extraMin * MIN);
}
// grilla det råa på grillställningen över elden (matlagning.ts), så länge det tar
function grillVal(s: State, v: Val, why: string) { set(v, 'grilla', why); v.dur = grillTid(s); }
// hänga upp kött och fisk på torkställningen och ta ner det som torkat (matlagning.ts), så länge det tar
function torkVal(s: State, v: Val, why: string) { set(v, 'torka', why); v.dur = torkTid(s); }
// ett pass med redskap delas inte upp (steg 2.3.8): när ett är klart och passet inte är slut gör man ett till i samma grupp,
// om byn vill ha fler och ingen fara går före. Annars väljer man något annat (steg.ts)
export function nastaRedskap(s: State, p: Person, tk: Task) {
  if (tk.pass === undefined || s.now >= tk.pass) return;
  const f = dangers(s);
  const m = projektNu(s, p, tk.act, f); // samma projekt (steg 6.2.17)
  if (!m) return;
  tk.tool = m.tool; tk.ref = undefined;
  if (!tk.items) tk.hamtad = undefined; // materialet till nästa hämtas (steg 11.1.74, hamtning.ts)
  if (hamtaForst(s, p, tk)) { tk.until = Math.max(tk.until, tk.pass); return; }
  startWork(s, p, tk);
  if (tk.until > s.now) count(s, 'iSammaPass'); // byns statistik: redskap som gjordes efter ett annat i samma pass
}
// projektets uppgift blir valet (projekt.ts)
function projektVal(v: Val, u: Uppgift, why: string) {
  set(v, u.act, `${why}. ${u.text}`);
  if (GORS[u.act]) v.pass = v.dur; // ett redskap görs i ett helt pass (steg 2.3.8)
  if (u.min) v.dur = u.min * MIN;
  if (u.tool) v.tool = u.tool;
  if (u.spot) v.spot = u.spot;
  if (u.sok) v.sok = u.sok;
  if (u.ref !== undefined) v.ref = u.ref;
}

// ---------- fritiden (steg 12.1.140 och 12.1.189): registret FRITID ----------
// Allt man gör på fritiden, på dagen och på kvällen, är rader här, med en vikt var: läran, besöken, bönen, skriften, vilan,
// handarbetet (en rad per sak: slakta, rensa, torka, grilla, pröva sig fram och pyssla), umgänget, berättandet, att bära in i
// mörkret, promenaden, badet, stranden, sporten och matchen. Valet är en enda dragning över vikterna för de rader som gäller nu
// (nar: dag, natt eller båda). Blir den dragna inte av (ingen mästare, inget vilt, ingen följer med) dras igen bland de andra.
// Vikten är lusten; det raden kräver prövas när den dras. En ny fritidssak är en ny rad med en vikt.
export interface FritidC {
  s: State; p: Person; v: Val; a: number; natt: boolean;
  u: number; lazy: number; calm: number; temp: number; shore: { x: number; y: number } | undefined;
  hant: number; // lusten till handarbete just nu (på dagen färdigheten och fliten, på kvällen också ljuset och tröttheten)
  why: string; // skälet till handarbetet
  at: { x: number; y: number }; // där hen skulle skriva
  fara: ReturnType<typeof dangers>;
  fb?: ReturnType<typeof besokVal>; gb?: ReturnType<typeof gravbesokVal>; sk?: ReturnType<typeof skrivVal>; la?: ReturnType<typeof lasVal>;
}
export interface FritidRad {
  id: string;
  nar?: 'dag' | 'natt'; // när raden gäller; utan nar både dag och kväll
  kraver: string; // vad saken kräver
  ger: string; // vad den ger
  drar: string; // vilka egenskaper eller lägen som drar dit
  akt: readonly Act[]; // handlingarna raden kan välja
  vikt: (c: FritidC) => number;
  gor: (c: FritidC) => boolean; // false: det raden kräver finns inte, och dragningen görs om bland de andra
}
const vuxen = (c: FritidC) => c.a >= ALDER.hjalper; // på kvällen sover barnen eller sitter med de vuxna
// på natten bara där det är ljust: vid elden, ett talgljus eller en fackla (steg 10.2.49)
const ljust = (c: FritidC, sp?: { x: number; y: number }) => isLight(c.s.now) || !sp || ljusAt(c.s, sp.x, sp.y) > 0;
const harSkrift = (s: State) => !!s.ting?.some(t => t.k === 'blad' || t.k === 'bok' || t.inne?.v === 'black'); // också böckerna läses (lasVal, steg 12.1.56)
// en rad för handarbetet: vikten är lusten till handarbete gånger sakens eget värde (VAL.hant…)
const hantRad = (id: string, vard: number, akt: readonly Act[], ger: string, gor: (c: FritidC) => boolean, kraver: string): FritidRad =>
  ({ id, kraver, ger, drar: 'hantverket och fliten', akt, vikt: c => c.natt && !vuxen(c) ? 0 : c.hant * vard, gor });
export const FRITID: readonly FritidRad[] = [
  { id: 'lara', kraver: 'en mästare som arbetar med tekniken', ger: 'färdighet', drar: 'nyfikenheten och hantverket', akt: ['lara'],
    // lärlingen går i lära efter sin nyfikenhet på dagen (steg 10.11.12), och som handarbete
    vikt: c => (c.natt ? 0 : VAL.laraFritid * stat(c.p, 'nyfikenhet', c.s.now) / VAL.laraNyfiken) + (c.natt && !vuxen(c) ? 0 : c.hant * VAL.hantLara),
    gor: c => {
      const lv = laraVal(c.s, c.p);
      if (!lv || !ljust(c, lv.spot)) return false;
      set(c.v, 'lara', `Har tid över. Går i lära hos ${lv.m.name}.`); c.v.spot = lv.spot; c.v.dur = lv.min * MIN; return true;
    } },
  { id: 'besokFange', nar: 'dag', kraver: 'familj eller en vän i fängelset', ger: 'sällskap', drar: 'närheten till fången', akt: ['besokFange'],
    // besöket vid fängelsets dörr (steg 11.12.4): familj och vänner går dit och pratar
    vikt: c => (c.fb = besokVal(c.s, c.p))?.w ?? 0,
    gor: c => { const fb = c.fb!; set(c.v, 'besokFange', fb.why); c.v.spot = fb.spot; c.v.ref = fb.ref; c.v.dur = FANG.besokMin * MIN; return true; } },
  { id: 'gravbesok', nar: 'dag', kraver: 'en grav eller en sänkt död man stod nära', ger: 'humör', drar: 'bandet till den döda', akt: ['gravbesok'],
    // besöket vid graven (steg 10.4.8): lusten är bandet till den döda
    vikt: c => (c.gb = gravbesokVal(c.s, c.p))?.w ?? 0,
    gor: c => { const gb = c.gb!, v = c.v; set(v, 'gravbesok', gb.why); v.spot = gb.spot; v.ref = gb.vem; v.tool = gb.laga ? 'laga' : undefined; v.gava = gravGava(c.s, c.p, gb.b) || undefined; v.dur = gb.min * MIN; return true; } },
  { id: 'be', nar: 'dag', kraver: 'en tro', ger: 'humör och tro', drar: 'andligheten', akt: ['be'],
    // bönen (steg 8.5.2): lusten följer andligheten
    vikt: c => bonVikt(c.s, c.p),
    gor: c => {
      const { s, p, v } = c;
      if (viltBikta(s, p)) { set(v, 'be', BONER.bikt.text()); v.tool = 'bikt'; v.dur = BONER.bikt.min * MIN; return true; } // bikten (steg 8.6.9)
      const b = bonFritid(s, p);
      if (!b) return false;
      set(v, 'be', BONER[b.id].text(s, p, b.o)); v.tool = b.id; v.spot = b.spot ?? { x: p.x, y: p.y }; v.dur = BONER[b.id].min * MIN; return true;
    } },
  // att skriva och att läsa (steg 10.6.5, skrift.ts): där det finns blad, bläck och ljus; på kvällen i ljuset vid elden
  { id: 'skriva', kraver: 'blad, bläck och ljus', ger: 'skrift', drar: 'skrivlusten', akt: ['skriva'],
    vikt: c => c.natt && !vuxen(c) || !harSkrift(c.s) ? 0 : (c.sk = skrivVal(c.s, c.p, c.at))?.w ?? 0,
    gor: c => { const sk = c.sk!, pl = skrivPlats(c.s, c.p, c.at, sk.min); set(c.v, 'skriva', sk.why); c.v.spot = pl.spot; c.v.dur = pl.dur; return true; } }, // vid en ledig skrivpulpet, annars för hand där hen är (steg 10.6.11)
  { id: 'lasa', kraver: 'ett blad eller en bok och ljus', ger: 'kunskap', drar: 'läslusten', akt: ['lasa'],
    vikt: c => c.natt && !vuxen(c) || !harSkrift(c.s) ? 0 : (c.la = lasVal(c.s, c.p))?.w ?? 0,
    gor: c => { const la = c.la!; set(c.v, 'lasa', la.why); c.v.spot = la.spot; c.v.ref = la.ref; c.v.dur = SKRIFT.lasMin * MIN; return true; } },
  { id: 'vila', kraver: 'inget', ger: 'vila', drar: 'tröttheten och latheten', akt: ['vila'],
    // på kvällen vill den trötta vila ut (steg 2.3.10); den skadade och sjuka vilar hellre (steg 12.1.46)
    vikt: c => c.natt ? (vuxen(c) && c.p.rest < VAL.nattVila ? VAL.nattVilaVikt * (1 - c.p.rest / VAL.nattVila) : 0)
      : (c.p.rest < VAL.vilaDag ? (1 - c.p.rest) * VAL.vilaVikt : 0) + c.lazy * VAL.vilaLat + (1 - kroppLust(c.p, c.s.now)) * VAL.vilaVikt,
    gor: c => c.natt ? set(c.v, 'vila', 'Mörkt och trött efter dagen, vilar ut vid elden') : paus(c.v, c.lazy > 0.5 ? 'Har det bra och tar det lugnt' : 'Tar en paus') },
  { id: 'paus', nar: 'natt', kraver: 'inget', ger: 'vila', drar: 'inget annat lockar', akt: ['vila'],
    vikt: c => vuxen(c) ? VAL.nattPaus : 0,
    gor: c => paus(c.v, 'Mörkt, vilar vid elden') },
  { id: 'sova', nar: 'natt', kraver: 'att vara barn', ger: 'sömn', drar: 'barndomen', akt: ['sova'],
    vikt: c => vuxen(c) ? 0 : VAL.nattBarnSova,
    gor: c => set(c.v, 'sova', 'Barn sover på natten') },
  { id: 'bara', nar: 'natt', kraver: 'något som ligger ute nära lägret', ger: 'saker i förrådet', drar: 'modet: de modiga går längre ut i mörkret', akt: ['bara'],
    vikt: c => c.a >= ALDER.ansvar && c.s.stackar?.length ? VAL.nattBara : 0,
    gor: c => {
      const { s, p, v } = c, near = VAL.nattNar + stat(p, 'mod', s.now) / 20 * VAL.nattLangt, gt = haulJob(s, near);
      if (!gt || !kanLyfta(s, p, gt.k)) return false;
      set(v, 'bara', `Mörkt, ${near > 6 ? 'men är modig och ' : ''}${gt.why[0].toLowerCase()}${gt.why.slice(1)}`); v.spot = gt; v.dur = VAL.nattBaraTim * HOUR; return true;
    } },
  { id: 'beratta', nar: 'natt', kraver: 'andra vid elden', ger: 'sällskap och berättelser', drar: 'berättandet och åldern', akt: ['beratta'],
    vikt: c => vuxen(c) ? (c.p.skill.berattande + (c.a > VAL.berattaAlder ? VAL.berattaBonus : 0)) / VAL.berattaDiv : 0,
    gor: c => set(c.v, 'beratta', 'Mörkt, berättar för de andra vid elden') },
  // handarbetet (steg 2.2.4 och 10.2.3): viltet och fisken som ruttnar väger mest; att pröva sig fram efter nyfikenheten och sedvanan
  // när byn har ett överskott, mycket mindre när kylan eller hungern är en fara (steg 10.11.20)
  hantRad('slakta', VAL.hantSlakt, ['slakta'], 'kött, skinn och ben', c => { const vilt = slaktbart(c.s, c.p); if (!vilt) return false; processTask(c.s, c.v, vilt, `${c.why}. Slaktar viltet med kniven.`); return true; }, 'vilt och en kniv'),
  hantRad('rensa', VAL.hantRensa, ['rensa'], 'fisk att äta', c => { const ra = rensaArt(c.s, c.p); if (!ra) return false; processTask(c.s, c.v, ra, `${c.why}. Rensar fisken.`); return true; }, 'fisk och en kniv'),
  hantRad('torka', VAL.hantTorka, ['torka'], 'mat som håller', c => { if (c.a < ALDER.grillar || !kanTorka(c.s, c.p)) return false; torkVal(c.s, c.v, `${c.why}. Torkar kött och fisk.`); return true; }, 'kött eller fisk och en torkställning'),
  hantRad('grilla', VAL.hantGrilla, ['grilla'], 'lagad mat', c => { if (c.a < ALDER.grillar || !kanGrilla(c.s, c.p)) return false; grillVal(c.s, c.v, `${c.why}. Grillar maten.`); return true; }, 'rått kött eller rå fisk och en grill'),
  { ...hantRad('forsok', VAL.hantForsok, ['forsok'], 'tekniker', c => {
    const fv = forsokVal(c.s, c.p);
    if (!fv || !ljust(c, fv.spot)) return false;
    set(c.v, 'forsok', `${c.why}. Prövar sig fram till ${TEK[fv.id].namn.toLowerCase()}.`); c.v.tool = fv.id; c.v.dur = fv.min * MIN; if (fv.spot) c.v.spot = fv.spot; return true;
  }, 'ett överskott och en teknik att pröva'), drar: 'nyfikenheten, sedvanan och hantverket',
  vikt: c => c.natt && !vuxen(c) ? 0 : c.hant * VAL.hantForsok * forsokChans(c.s, c.p, foodDays(c.s), woodDays(c.s)) * (c.fara.kyla || c.fara.svalt ? VAL.projFara : 1) / TEKTAL.forsokChans },
  hantRad('projekt', VAL.hantProjekt, ['bygga', 'hantverk'], 'saker byn saknar', c => {
    const pr = bastaProjekt(c.s, c.p, c.fara, true); // pyssel för ens egen skull: byns projekt görs under Förbättra på dagen (steg 6.1.17)
    if (!pr?.u || !ljust(c, pr.u.spot)) return false;
    projektVal(c.v, pr.u, c.why); return true;
  }, 'material och ett projekt'),
  { id: 'samtal', kraver: 'sällskap', ger: 'umgänge', drar: 'det saknade umgänget', akt: ['samtal'],
    vikt: c => c.natt ? (vuxen(c) ? VAL.nattSamtal : VAL.nattBarnSamtal) : (1 - c.p.social) * VAL.umgasVikt,
    gor: c => {
      if (!c.natt) return set(c.v, 'samtal', 'Vill umgås');
      if (!vuxen(c)) return set(c.v, 'samtal', 'Mörkt, sitter med de vuxna vid elden');
      set(c.v, 'samtal', 'Mörkt, umgås vid elden'); c.v.dur = (VAL.nattPrat + rnd(c.s, 'val', c.p) * VAL.nattPratSpann) * MIN; return true; // en stund, sedan går man en bit till nästa samtal
    } },
  { id: 'promenad', nar: 'dag', kraver: 'inget', ger: 'humör', drar: 'nyfikenheten; nyfikna och modiga går längre', akt: ['promenad'],
    vikt: c => (VAL.promBas + stat(c.p, 'nyfikenhet', c.s.now) / VAL.promNyfiken) * c.calm,
    gor: c => {
      const { s, p, v } = c, far = VAL.promNar + (stat(p, 'nyfikenhet', s.now) + stat(p, 'mod', s.now)) / 40 * VAL.promBort;
      set(v, 'promenad', far > 12 ? 'Är nyfiken och vill se vad som finns längre bort' : 'Vill sträcka på benen');
      v.spot = walkSpot(s, p, far); v.dur = (VAL.promMin + rnd(s, 'val', p) * VAL.promSpann) * MIN * VAL.pass; return true;
    } },
  { id: 'bada', nar: 'dag', kraver: 'varmt vatten, en badplats och torrt väder', ger: 'svalka och humör', drar: 'värmen', akt: ['bada'],
    // lusten att bada följer kroppens värme (för varm, steg 12.1.19)
    vikt: c => {
      const varm = forVarm(c.s, c.p) ? VAL.badVarm * (c.p.warm - 1) : 0;
      return c.temp >= VAL.badTemp && c.shore && vaderTillater(c.s, 'torrt') ? (clamp((c.temp - VAL.badNoll) / VAL.badSpann, 0, VAL.badMax) + varm) * c.calm : 0;
    },
    gor: c => { const { s, p, v } = c; set(v, 'bada', `Det är varmt (${Math.round(c.temp)} grader) och skönt att bada`); v.spot = bryggSpot(s, p) ?? c.shore; v.dur = (VAL.badPassMin + rnd(s, 'val', p) * VAL.badPassSpann) * MIN * VAL.pass; return true; } },
  { id: 'strand', nar: 'dag', kraver: 'en strand', ger: 'lugn', drar: 'den som inte är så sällskaplig', akt: ['strand'],
    // sitta vid stranden och se ut över vattnet: lugnt, året om, mest för den som inte är så sällskaplig
    vikt: c => c.shore ? (VAL.strandBas + (20 - stat(c.p, 'empati', c.s.now)) / VAL.strandDiv) * c.calm : 0,
    gor: c => {
      // ser ut över sjön eller tjärnen hen sitter vid, och över isen när den ligger (steg 9.2.131); skälet bär namnet till kortet (taskName)
      const { s, p, v } = c;
      v.spot = bryggSpot(s, p) ?? strandSpot(s, p);
      const n = v.spot ? sjoVid(s, v.spot.x, v.spot.y) : -1, namn = n >= 0 ? sjoNamn(s, n) : 'Sjön';
      set(v, 'strand', islagt(s) ? `Ser ut över isen på ${namn.charAt(0).toLowerCase() + namn.slice(1)}` : `Ser ut över ${namn.charAt(0).toLowerCase() + namn.slice(1)}`);
      v.dur = (VAL.strandMin + rnd(s, 'val', p) * VAL.strandSpann) * MIN * VAL.pass; return true;
    } },
  { id: 'sport', nar: 'dag', kraver: 'ett överskott, sportens redskap och andra som vill spela', ger: 'humör och sällskap', drar: 'styrkan och smidigheten', akt: ['sport'],
    vikt: c => sportVikt(c.s, c.p, c.calm), // sporten när byn har ett överskott (steg 4.3.1, sport.ts)
    gor: c => { const sp = sportVal(c.s, c.p); if (!sp) return false; const v = c.v; set(v, 'sport', sp.why); v.spot = sp.spot; v.dur = sp.dur; v.ref = sp.ref; v.tool = sp.tool; return true; } },
  { id: 'titta', nar: 'dag', kraver: 'en match som pågår', ger: 'humör', drar: 'lugnet', akt: ['titta'],
    vikt: c => tittaVikt(c.s, c.p, c.calm), // att titta på matchen (steg 10.7.16)
    gor: c => { const ti = tittaVal(c.s, c.p); if (!ti) return false; const v = c.v; set(v, 'titta', ti.why); v.spot = ti.spot; v.dur = ti.dur; v.ref = ti.ref; v.tool = ti.tool; return true; } },
];
const FRITID_DAG = FRITID.filter(f => f.nar !== 'natt'), FRITID_NATT = FRITID.filter(f => f.nar !== 'dag');
// fritiden på dagen (raden fritid i ARBETEN, u = hur akut byn behöver arbete) och på kvällen (raden kväll): en dragning över
// vikterna för raderna som gäller; blir den dragna inte av dras igen bland de andra, och blir ingen av vilar man
function leisure(s: State, p: Person, v: Val, a: number, natt: boolean, u = 0, lazy = 0) {
  const now = s.now, e = eldPlats(s);
  const hant = natt
    // handarbetet på kvällen följer ljuset vid elden och tröttheten (steg 10.2.49): i mörker och trött gör man inget
    ? (p.skill.hantverk + stat(p, 'flit', now)) / VAL.nattHantDiv * (1 - VAL.nattTrott * (1 - clamp(p.rest, 0, 1))) * clamp(ljusAt(s, e.x + 0.5, e.y + 0.5), 0, 1)
    : (p.skill.hantverk / VAL.hantSkill + p.pot.flit / VAL.hantFlit) * (u < VAL.hantLugn ? VAL.hantLugnVikt : VAL.hantAkutVikt);
  const c: FritidC = {
    s, p, v, a, natt, u, lazy, calm: u < VAL.lugn ? 1 : VAL.lugnAkut, temp: temperature(s), shore: natt ? undefined : bathSpot(s), hant, fara: dangers(s),
    why: natt ? 'Mörkt, gör handarbete vid elden' : u < VAL.hantLugn ? 'Byn har det gott ställt, det finns tid för hantverk' : 'Tycker om att göra handarbete',
    at: natt ? { x: e.x + 0.5, y: e.y + 0.5 } : platsIByn(s, p, 'val'),
  };
  const rader = natt ? FRITID_NATT : FRITID_DAG, w = rader.map(f => f.vikt(c));
  for (;;) {
    let tot = 0;
    for (const x of w) tot += x;
    if (!(tot > 0)) break;
    let r = rnd(s, 'val', p) * tot, i = 0;
    for (; i < w.length - 1; i++) { r -= w[i]!; if (r < 0) break; }
    while (!(w[i]! > 0)) i--; // flyttalens rest: den sista raden med vikt
    if (rader[i]!.gor(c)) return;
    w[i] = 0;
  }
  paus(v, natt ? 'Mörkt, vilar vid elden' : 'Tar en paus');
}

// hotet byn känner i natt (steg 10.1.20): grunden, vargar som någon sett, rövare som nyss varit här (klingar av som deras vila),
// ett varsel om en motgång, och påbudet om nattvakten. Så många håller vakt (avrundat), aldrig fler än hälften av de vuxna som orkar
export function vaktHot(s: State) {
  const varg = (s.vargar ?? []).some(f => f.sedd !== undefined && f.vargar.length > 0) ? 1 : 0;
  return VAL.vaktBas + VAL.vaktVarg * varg + VAL.vaktRovare * (1 - efterAnfall(s)) + VAL.vaktVarsel * (living(s).some(q => q.varsel) ? 1 : 0) + VAL.vaktPabud * pabud(s, 'vakt') + FANG.nattVakt * fangar(s).length; // fångarna (steg 11.12.5)
}
// nattens vakter: de modigaste av de vuxna som orkar, med lite slump, byts varje natt
// ledig: den som inte håller på med något, eller bara vilar eller sover (nattens vakter väljs bland dem; den som lyssnar på ett kväde eller arbetar är inte ledig)
const ledig = (q: Person) => !q.task || q.task.paus || ACTS[q.task.act].slag === 'vila';
function vaktVal(s: State, p: Person, v: Val, a: number) {
  const now = s.now;
  const guardDay = yearNo(s, now - VAL.vaktByte * HOUR); // vaktdygnet är kalenderns dygn, förskjutet så att det byts kl. 7
  if (guardDay !== s.lastGuardDay) {
    // välj nattens vakter bland de vuxna som orkar (den sjuka, svaga eller skadade sover), byts varje natt
    const adults = living(s).filter(q => ageOf(q, now) >= ALDER.vaktFran && ageOf(q, now) < ALDER.vaktTill && !isSick(q, now) && halsa(q) >= KROPP.svag && kanGa(q) && !vilaHellre(q) && q.task?.act !== 'strid' && !skams(q, now) && (q === p || ledig(q))); // inte den som slåss (strid.ts) eller skäms
    if (adults.length) {
      s.lastGuardDay = guardDay;
      // ett slumptal per vuxen i byns ordning, sedan de högsta (inte i sorteringens jämförelser: deras antal beror på webbläsaren)
      const n = clamp(Math.round(vaktHot(s)), 0, Math.max(1, Math.ceil(adults.length / 2)));
      const nyckel = adults.map(q => ({ q, k: q.pot.mod + rnd(s, 'val') * VAL.vaktSlump }));
      for (let i = 0; i < n; i++) {
        let g: typeof nyckel[number] | undefined;
        for (const x of nyckel) if (x.q.guardDay !== guardDay && (!g || x.k > g.k)) g = x;
        if (!g) break;
        avbryt(s, g.q); g.q.guardDay = guardDay; // det vakten bar läggs ner där hen står
      }
    }
  }
  return p.guardDay === guardDay && a >= ALDER.vaktFran && set(v, 'vakt', 'Håller vakt i natt');
}
import { BAK, GROP, KOK, ROKAS, STEK, bakugnen as SIM_bakugn, kanBaka, kanGropa, kanKoka, kanSteka, tomGrop } from './matlagning';
import { INGREDIENSER } from './ratter';
import { BRYGD, BRYGG, bryggVal } from './brygg';
import { REST, komposten, latrinAttTomma, resterOver, sophog } from './rester';
import { SKADEDJUR, STAKET, skrammaVal, staketVal } from './odling';
import { TAM, mataVal, tamArt, tamEg } from './tamdjur';
import { HAGE, vallaVal } from './hage';
import { VINTER, hamlaVal, hamlatPa, slaVal, slatterKvar } from './slatter';
import { KRUKA, ORTKRUKA, krukaHemVal, ortPlockaVal, ortSattaVal } from './kruka';
import { BIN, flyFranBin, retatNara, skattaVal } from './bin';
import { BOSKAP, SLAKTDJUR, avlivaVal, klippVal, mjolkaVal, slaktOrsak } from './boskap';
import { TORV, torvHellre } from './torv';
import { attTomma, branningUppgift, passaUppgift, passaVal } from './brann';
import { LIE_FART } from './jarnsaker';
