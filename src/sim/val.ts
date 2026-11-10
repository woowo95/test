import { han } from './ord';
import { facklaVal } from './ljus';
import { OMRADE, bynsAvstand, bynsMitt, iByn, omrade, platsIByn, utanforByn } from './omrade';
import { GANG } from './gang';
import { iVattnetNu, sjoNamn, sjoVid, strandNu, vattenNu } from './sjo';
import { freeTools, take } from './agande';
import { PLATS } from './plats';
import { vargSkydd, vargjaktVal } from './varg';
import { bjornjaktVal } from './bjorn';
import { tornadoSkydd } from './tornado';
import { brandHetta, brandUndan, brandVal, hjalpaVal, slackaSigVal } from './brand';
import { foodDays, foodDaysAll } from './ekonomi';
import { ACTS, WORK, usesTool } from './handlingar';
import { canLight, eldFor, eldXY, nagonEld, nagonGlod, eldarOf, emberOn, fuelStock, vidEld, needStones, needTinder, woodDays } from './eld';
import { ALDER, KROPP, REL, ageOf, count, doingAct, familjOf, isSick, living, relKey, stat } from './folk';
import { RELT, bredvidVikt } from './relationer';
import { onskan } from './naring';
import { halsa, hemma, kanGa, vardVal, vilaHellre } from './halsa';
import { bynsMatAndel, egnaMatDygn, familjMatDygn, getable, harMat, takeMaterial } from './behov';
import { FANGST, Kind, Lager, flintSpot, richness } from './fynd';
import { coldOf, nederbord, snoPaMarken, temperature, vaderNu } from './vader';
// barnen leker i snön när den ligger, som de vuxna har snöbollskrig (steg 4.3.1.3, sport.ts)
const lekText = (s: State) => snoPaMarken(s) > 0 ? 'Är barn och leker i snön' : 'Är barn och leker';
import { varselSamla } from './motgang';
import { FORRAD, FORRADSMAL, TROSKEL, villAv, buffert, lyxtak, materialTimme, onskatDygn, overTak, underBuffert } from './forradsmal';
import { DJUR, DJURARTER, Djurart, GORS, canProcess, djurKvar, freeOfKinds, handelTask, harAv, toolGroups, underhallGrupp, wantsTool } from './redskap';
import { PROJEKT, PROJEKT_LIST, Uppgift, bastaProjekt, egenintresse, hamtas, projektNu } from './projekt';
import { faltNu, vildFronPlats } from './odling';
import { MINNE, areaOf, flintArea, pickSpot, prospectFor } from './minne';
import { eldPlats, getMap } from './karta';
import { ryggsack } from './utrustning';
import { amountOf, avbryt, fetchSpot, flodUndan, haulJob, isStored, timKvar } from './lager';
import { BYGG, bedFor, buildJob, siteOf } from './bygg';
import { MJARDE, kanVittja } from './fisk';
import { bitAt, bitsOf, blocked, freeNear, husById, roomAt } from './byggnad';
import { bedTile, homeless, samlingRum, varmareInne } from './byggnader';
import { groundOf, isForest, punktIRuta, tileOf } from './mark';
import { axeTask, egenStock, fallTid, stockOverHus } from './skog';
import { GA_TID, startWork, startsOnArrival } from './paborjat';
import { duty, dygn, habitShare, habitTotal } from './seder';
import { clamp, hash3, pick, pickNarmaste, rnd } from './slump';
import { samtalMed } from './samtal';
import { ARSTID, ageIndex, isLight, kallTid, yearNo } from './tid';
import { Act, GREN, H, HOUR, MIN, Person, Skill, Stat, State, T, Task, W, inMap } from './typer';
import { SAKER, gruppOf, sakNamn } from './saker';
import { balans } from './balans';
import { islagt, naVattnet } from './is';
import { drickVal, torstig, tortarFarligt, vattenVal } from './torst';
import { forSmutsigt, latrinFor } from './smuts';
import { stationBrukad, bordenOf, ledigPlats, sittAt, stationAt, stationFor, storlekAv, vidStation } from './stationer';
import { RATTER, TORKAS, grillTid, kanGrilla, kanTorka, torkTid } from './matlagning';
import { TEK, forsokChans, forsokVal, knows, laraVal, tekArbete } from './teknik';
import { sportVal, sportVikt } from './sport';
import { handlaVal, handlarMal } from './handel';
import { framVal } from './framtradande';
import { utbrottBorjar, utbrottNu } from './humor';
import { smakDrag } from './rykten';
import { PAB, pabud, skams } from './styre';
import { BONER, bonFritid, bonNod, bonVikt, ritualVal, satFaror } from './kult';
import { avrustaVal, begravaVal, rustaVal } from './grav';
import { budBrutet, budForbjuder, viltBikta, vilodagNu } from './kyrka';
import { LAG, lagGaller, tabuAkt } from './lagar';
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
  // blir dåligt (alltid när det är dåligt inom raddaTim), men aldrig under raddaMin, så att det som inte ruttnar (i frosten,
  // stenen ute) ändå tas om hand
  raddaTim: 24, raddaMin: 0.25,
  extraMin: 5, // slakt och rensning varar 5 minuter över vad det tar (och högst maxTim i DJUR, redskap.ts)
  byggLaga: 1.2, byggHalvt: 3, byggNytt: 0.8, // hur mycket bygget väger: en vägg som lagas, ett hus som är påbörjat, ett nytt
  byggUtan: 3, // ... plus så mycket gånger andelen som saknar sovplats under tak
  letaChans: 0.3, // chansen att någon letar flinta när byn eller ett projekt saknar den (steg 6.1.17)
  fronChans: 0.4, // (0,2 före steg 2.12.2) chansen att den som samlar går till de vilda grödorna och plockar frön, när byn vill ha fler (steg 2.10.11)
  stenarChans: 0.5, // chansen att den som samlar letar flinta eller stenar vid stenarna när byn saknar det (och ett helt pass)
  // arbetarna (steg 6.1.13): hur många som får göra en rad, räknat en gång i timmen. Taket är mjukt: när raden har sina
  // arbetare väger den fullRad gånger så mycket (en chans blir så mycket mindre) i stället för att spärras
  fullRad: 1 / 3,
  matPass: 2, // maten: det som fattas (dygn × invånare) delat med så här många person-dygn mat, vad en person hinner på ett pass
  vedPass: 1, // veden: det som fattas (dygn) delat med så här många dygns ved, vad en person hinner på ett pass
  tandPer: 4, // tändmaterial åt en släckt eld: en per så här många invånare
  letaPer: 10, // att leta flinta och stenar: en per så här många invånare
  // nivån Tillfälle (steg 6.1.14): behovet stiger när tiden rinner ut, från tillfalleMin när fönstret öppnar till 1 när det
  // stänger. Med den chansen går tillfället före grundbehoven; annars tas det efter dem
  tillfalleMin: 0.5,
  akut: 3, // arbetet är helt akut när det mest behövda väger så här mycket
  kolChans: 0.2, kolMin: 10, // kol hämtas ur den släckta elden när elden vill ha mindre än så här, med denna chans, i så många minuter
  lekBas: 0.45, lekSed: 0.2, // en yngre än vuxen leker med denna chans (plus seden Barn gånger Sed)
  flitigBas: 0.88, flitigAkut: 0.12, // chansen att arbeta för den flitige: Bas + Akut gånger hur akut arbetet är
  latBas: 0.6, latAkut: 0.4, // ... och för den lata (gånger hur väl de egna behoven är fyllda)
  arbeteMin: 60, arbeteSpann: 120, // ett arbetspass
  byggMin: 60, byggSpann: 90, // ett pass med bygge
  // lusten att arbeta och vikten av byns behov
  lustBas: 4, lustEgenskap: 3, lustVana: 2, // lusten = (Bas + färdigheten + egenskapen / Egenskap) gånger (1 + Vana gånger andelen vana)
  brusMin: 0.6, brusSpann: 0.8, // slumpbrus på poängen: mellan Min och Min + Spann
  torkPabud: 0.6, // ledarens påbud om torkat ändrar chansen att torka så mycket (-1 till 1, steg 3.5.2, styre.ts)
  egenDygn: 1.5, // den som har mat för kortare tid än så själv (sin egen, byns och familjens) arbetar för maten, hur fullt byns förråd än är (steg 3.10.26)
  tandMin: 0.8, tandVikt: 3, // tändmaterial: årstiden räknas minst Min, gånger Vikt
  prospektMin: 0.05, prospektMax: 1.3, // hur mycket platserna ger just nu räknas mellan dessa
  // fritid (leisure): vikter (ju större desto oftare), u = hur akut byn behöver arbete
  vilaVikt: 2, vilaLat: 0.6, // vila: per saknad vila, plus för den lata ...
  vilaDag: 0.3, // ... men på dagen bara när vilan är under detta (steg 2.3.10): annars vilar man ut när det är mörkt
  nattVila: 0.6, // på natten vilar den vars vila är under detta, före berättande, handarbete och umgänge (steg 2.3.10)
  hantSkill: 10, hantFlit: 20, // handarbete: färdigheten delad med Skill plus flit-anlaget delat med Flit
  hantLugn: 0.25, hantLugnVikt: 1.5, hantAkutVikt: 0.6, // ... gånger Lugn när u är under Lugn (byn har det gott ställt), annars Akut
  umgasVikt: 2, // umgänge: per saknat umgänge
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
  berattaAlder: 50, berattaBonus: 6, berattaDiv: 40, // berättande: (färdigheten + Bonus över Alder) / Div
  nattHantDiv: 70, // handarbete: (hantverk + flit) / Div
  nattNar: 2, nattLangt: 8, nattBara: 0.35, nattBaraTim: 2, // de modiga går upp till Nar + Langt rutor för att bära in, med denna chans, i så många timmar
  nattBarnSamtal: 0.6, // ett barn sitter med de vuxna med denna chans, annars sover det
  nattSamtal: 0.9, // annars umgås man tills detta, sedan vilar man
  // borden (steg 2.2.15)
  maltidMin: 20, maltidSpann: 10, // en måltid vid bordet
  bryggaSitt: 0.6, // finns en brygga sitter man eller badar där med denna chans (steg 7.3.11)
  vittjaMin: 5, // så många minuter det tar att vittja en mjärde
  salMote: 0.7, // året runt är samlingssalen mötesplatsen med denna chans, när byn har en (steg 7.2.7)
  bordSamtal: 0.5, // den som samtalar eller berättar sätter sig vid ett bord med denna chans, när det inte är kallt
  isar: 1.05, isarForsok: 24, // vid elden står man minst så här många rutor från de andra, så många försök (steg 3.6.8) ...
  isarVidga: 0.12, // ... och ringen blir så här mycket bredare för varje försök efter det fjärde, när det är trångt
  nattPrat: 10, nattPratSpann: 15, // på natten samtalar man så här många minuter, plus upp till spann, och går sedan till en ny plats (steg 3.6.8)
  eldRadie: 1.3, eldRadieSpann: 0.9, // vid elden sätter man sig så här många rutor från den, plus upp till spann (handlingens radie går före)
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
export function skuggaNara(s: State, p: Person, x0: number, y0: number): { x: number; y: number } | undefined {
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
  if (sal && rnd(s, 'val', p) < VAL.bynTak) return punktIRuta(s, pick(s, sal.tiles, 'val', p), p);
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
function isarIRum(s: State, p: Person, tiles: number[]) {
  const andra: { x: number; y: number }[] = [];
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
function platsFor(s: State, act: Act, p: Person): { x: number; y: number } {
  const m = getMap(s.seed), d = ACTS[act], plats = d.plats ?? 'skog';
  const eb = plats === 'elden' ? eldFor(s, p) : undefined, f = eb ? eldXY(s, eb) : eldPlats(s); // vid elden: vid den brinnande lägereld man hör till, annars den närmaste som brinner (steg 6.3.1)
  // det som görs utan bänk görs inne i byn och inte vid elden (steg 2.10.6); när det är kallt sätter man sig vid elden som förut, för värmens skull
  const iByn = d.slag === 'hantverk' && (plats === 'elden' || plats === 'station' && !stationFor(s, act, p)) && coldOf(temperature(s)) === 0;
  if (iByn && nederbord(s)) { const sal = samlingRum(s); if (sal) return punktIRuta(s, pick(s, sal.tiles, 'val', p), p); } // i regnet under tak (steg 2.11.1)
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
  if (plats === 'elden' || plats === 'station' || plats === 'bord') {
    // när det är kallt samtalar och berättar man i samlingshuset, om det är varmare där än vid elden (byggnader.ts)
    const sal = d.social ? samlingRum(s) : undefined, c = sal ? coldOf(temperature(s)) : 0;
    // ... när det regnar (steg 2.11.1), och året runt är samlingssalen byns mötesplats (steg 7.2.7)
    if (sal && (c > 0 && varmareInne(s, sal, c, d.varmer) || nederbord(s) || c === 0 && rnd(s, 'val', p) < VAL.salMote)) return isarIRum(s, p, sal.tiles);
    // annars sätter man sig ofta vid ett bord för att samtala och berätta, när det inte är kallt
    if (d.slag === 'prata' && bordenOf(s).length && coldOf(temperature(s)) === 0 && rnd(s, 'val', p) < VAL.bordSamtal) { const at = ledigPlats(s, p); if (at) return at; }
    // bredvid den bästa vännen om hen sitter vid samma eld, och inte nära en ovän (steg 3.1.1)
    const nara = sittPlatser(s, p, f), van = nara.bast && rnd(s, 'val', p) < RELT.bastSitt ? Math.atan2(nara.bast.y - f.y - 0.5, nara.bast.x - f.x - 0.5) : undefined;
    for (let k = 0; ; k++) { // runt elden, men inte i en husvägg eller i en station (Björn efter v89: någon stod i slaktbänken)
      // bredvid vännen: minst en ruta bort längs ringen (vinkeln efter radien)
      const r = (d.radie ?? VAL.eldRadie + rnd(s, 'val', p) * VAL.eldRadieSpann) + VAL.isarVidga * Math.max(0, k - 4), ang = van !== undefined && k < 4 ? van + (k % 2 ? -1 : 1) * (VAL.isar + 0.3 * Math.floor(k / 2)) / r : rnd(s, 'val', p) * Math.PI * 2, x = f.x + 0.5 + Math.cos(ang) * r, y = f.y + 0.5 + Math.sin(ang) * r;
      const ovanNara = k < 8 && nara.ovan.some(o => Math.hypot(o.x - x, o.y - y) < RELT.ovanAvstand);
      const tatt = k < VAL.isarForsok && nara.alla.some(o => Math.hypot(o.x - x, o.y - y) < VAL.isar); // minst en ruta mellan dem som samtalar (steg 3.6.8)
      if (k >= VAL.isarForsok + 3 || !blocked(s, x, y) && !sittAt(s, x, y) && !stationAt(s, x, y) && !ovanNara && !tatt) return k >= VAL.isarForsok + 3 ? freeNear(s, f.x + 0.5, f.y + 1.5) : { x, y }; // inte på en stubbe vid bordet
    }
  }
  if (plats === 'kol') return { x: f.x + 0.5 + (rnd(s, 'val', p) - 0.5) * 0.6, y: f.y + 1.1 };
  if (plats === 'sang') { // i huset om det finns plats under tak, annars på marken en bit från elden
    // i huset om det är varmare där än vid elden
    const bed = bedFor(s, p), c = coldOf(temperature(s)), rum = bed && roomAt(s, bed.x, bed.y);
    if (bed && rum && (varmareInne(s, rum, c) || c === 0 || nederbord(s))) return bed; // när det inte är kallt räcker värmen överallt; i regnet under tak
    for (let k = 0; k < 12; k++) {
      const ang = (p.id * 2.399 + rnd(s, 'val', p) * 0.5) % (Math.PI * 2), r = VAL.sovRadie + rnd(s, 'val', p) * VAL.sovRadieSpann, x = f.x + 0.5 + Math.cos(ang) * r, y = f.y + 0.5 + Math.sin(ang) * r;
      if (inMap(x, y) && !blocked(s, x, y) && !stationAt(s, x, y)) return { x, y };
    }
    return freeNear(s, f.x + 0.5, f.y + 2);
  }
  if (plats === 'lek') return platsIByn(s, p, 'val'); // barnen leker var som helst i byn (omrade.ts); byn har ingen lekplats
  // ute på marken: vid stranden, på ängen och i skogen, eller avsides (toa)
  const strand = plats === 'strand' ? strandNu(s) : undefined; // under en torka flyttar stranden ut (steg 3.8.2)
  const want = (t: number, x: number, y: number) => {
    if (bitAt(s, x, y)) return false; // inte i husen
    if (strand) return strand[y * W + x] === 1;
    if (plats === 'ang') return t === T.Gras || t === T.Skog;
    if (plats === 'avsides') return (t === T.Gras || t === T.Skog || t === T.Sand) && !vidBanken(s, x, y); // aldrig bredvid ett bord eller en bänk (steg 3.10.3)
    return isForest(s, y * W + x); // grenar och vilt finns i skogen
  };
  // arbetsplatser räknas från byns läger (eld och lagerplatser), inte bara från elden
  const cands: { x: number; y: number; d: number }[] = [], mid = bynsMitt(s);
  const min = plats === 'ang' || plats === 'avsides' ? VAL.narAvstAng : VAL.narAvst, max = plats === 'avsides' ? VAL.langtAvsides : Infinity;
  for (let i = 0; i < VAL.provar; i++) {
    const x = Math.floor(mid.x + (rnd(s, 'val', p) - 0.5) * (2 * PLATS.dagX)), y = Math.floor(mid.y + (rnd(s, 'val', p) - 0.5) * (2 * PLATS.dagY));
    if (!inMap(x, y)) continue;
    const d = utanforByn(s, x, y);
    if (d < min || d > max) continue;
    if (want(m.tiles[y * W + x], x, y)) cands.push({ x, y, d });
  }
  cands.sort((a, b) => a.d - b.d);
  // man plockar inte där det är toa-smuts (steg 2.7.2), så länge det finns rena platser
  if (d.resurs === 'samla' && s.flackar?.length) { const rena = cands.filter(c => !forSmutsigt(s, c.x, c.y)); if (rena.length) cands.splice(0, cands.length, ...rena); }
  // mat: gå dit det finns mest att hämta, inte för långt bort; annars en av de närmaste platserna
  // avsides (toa): en plats var som helst mellan narAvstAng och langtAvsides, så att högarna inte bildar en ring (steg 3.6.7)
  const c = (d.resurs ? pickSpot(s, p, d.resurs, cands) : plats === 'avsides' && cands.length ? cands[Math.floor(rnd(s, 'val', p) * cands.length)] : pickNarmaste(s, cands, VAL.narmaste, 'val', p)) ?? nearestWanted(s, want, plats === 'avsides' ? min : 0) ?? { x: mid.x, y: mid.y };
  return { x: c.x + 0.5, y: c.y + 0.5 };
}
// en station eller en plats vid ett bord på rutan eller bredvid den
function vidBanken(s: State, x: number, y: number) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (stationAt(s, x + dx, y + dy) || sittAt(s, x + dx, y + dy)) return true;
  return false;
}

// samlandet (steg 2.12.4): busken är tom men famnen inte full. Den bästa rutan inom MINNE.sokR, med lite avdrag för
// avståndet som när man väljer plats (pickSpot), men inte i vattnet, i husen eller där det är toa-smuts. Ger ingen ruta
// minst PLATS.vidare går man hem med det man har
export function nastaBuske(s: State, k: Lager, x0: number, y0: number) {
  const cx = Math.floor(x0), cy = Math.floor(y0), tiles = vattenNu(s), R = MINNE.sokR; // vattnet som det är nu (torkan och översvämningen)
  let best: { x: number; y: number } | undefined, bv = -Infinity;
  for (let y = Math.max(0, cy - R); y <= Math.min(H - 1, cy + R); y++) for (let x = Math.max(0, cx - R); x <= Math.min(W - 1, cx + R); x++) {
    if (tiles[y * W + x] === T.Vatten || bitAt(s, x, y) || forSmutsigt(s, x, y)) continue;
    const r = richness(s, k, x + 0.5, y + 0.5);
    if (r < PLATS.vidare) continue;
    const v = r - Math.hypot(x - cx, y - cy) * MINNE.sokPris;
    if (v > bv) { bv = v; best = { x: x + 0.5, y: y + 0.5 }; }
  }
  return best;
}
// rundan (steg 4.5.6.1): nästa ruta inom r rutor, den rikaste med lite avdrag för avståndet och lite slump efter personen
// (id), så att samlarna inte går likadant. Kraven prövas i ordning (rutorna man inte får gå till och det minsta en ruta ska
// ge) i en och samma genomgång av rutorna; minst 0 räknar inte rikedomen alls
// drag (rundan, steg 4.5.6.2): vikten utåt per ruta längre från lägret (negativ hemåt), vad personen tror att rutan ger
// (med rädslan avdragen; utan tror gäller det rutan ger) och rädslan ensam
export function nastaRuta(s: State, varde: (x: number, y: number) => number, x0: number, y0: number, r: number, id: number, krav: readonly { sett: readonly number[]; minst: number }[], drag?: { ut: number; tror?: (x: number, y: number) => number; radsla: (x: number, y: number) => number }) {
  const cx = Math.floor(x0), cy = Math.floor(y0), tiles = vattenNu(s), best: ({ x: number; y: number } | undefined)[] = [], bv = krav.map(() => -Infinity);
  const n = krav[0]?.sett.length ?? 0, utan = krav.every(q => q.minst <= 0), minst = utan ? -Infinity : Math.min(...krav.map(q => q.minst)), lager = bynsAvstand(s), d0 = utanforByn(s, x0, y0);
  // långt bort (bortom MINNE.sokR) prövas varannan ruta: det är bara riktningen som behövs, väl framme letar man nära
  const st = r > MINNE.sokR ? 2 : 1;
  for (let dy = -r; dy <= r; dy += st) for (let dx = -r; dx <= r; dx += st) {
    const x = cx + dx, y = cy + dy;
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const d = Math.hypot(dx, dy), i = y * W + x;
    if (d < 0.5 || d > r + 0.01) continue;
    if (tiles[i] === T.Vatten || bitAt(s, x, y) || forSmutsigt(s, x, y)) continue;
    const v0 = utan ? 0 : drag?.tror ? drag.tror(x, y) : varde(x, y);
    if (v0 < minst) continue; // rutan ger för lite för alla kraven
    const v = v0 - d * MINNE.sokPris + hash3(id, i, n) * 0.1 + (drag ? drag.ut * (lager.at(i) - d0) - (drag.tror && !utan ? 0 : drag.radsla(x, y)) : 0);
    for (let j = 0; j < krav.length; j++) if (v0 >= krav[j].minst && v > bv[j] && !krav[j].sett.includes(i)) { bv[j] = v; best[j] = { x: x + 0.5, y: y + 0.5 }; }
  }
  return best.find(b => b);
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
// närmaste av dem. Sparas tills lägret ändras eller något byggs (ett nytt hus kan stå på stranden)
const strandCache = new WeakMap<State, { key: string; ok: number[]; bad?: { x: number; y: number } }>();
function strandOf(s: State) {
  const key = `${omrade(s).key},${s.byggV ?? 0}`;
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
  return { kyla: cold && !nagonGlod(s), svalt: foodDays(s) < VAL.svaltDygn, gras: kallTid(ai) || cold ? TROSKEL.torrgrasKyla : 0 };
}
satFaror(dangers);
type Faror = ReturnType<typeof dangers>;
// elden är släckt och kan inte tändas för att det saknas tändmaterial, och för få hämtar det
const tinderNeeded = (s: State) => !nagonGlod(s) && !canLight(s) && needTinder(s);
// det som väljs: handlingen, varför, hur länge, och var om det inte följer av handlingen
const BALTE_FORBAND = new Set<Act>(['jakt', 'vargjakt', 'bjornjakt', 'forsvar', 'forsvarRovare', 'strid']);
// den som ska i strid eller på jakt tar en remsa i bältet (steg 9.5.16)
export function balteForband(s: State, p: Person, act: Act) { if (BALTE_FORBAND.has(act) && !p.forbandMed && getable(s, p, 'remsa') >= 1) { takeMaterial(s, p, 'remsa', 1); p.forbandMed = 1; } }
export interface Val { stanna?: boolean; act: Act; why: string; dur: number; pass?: number; spot?: { x: number; y: number }; ref?: number; tool?: string; site?: { x: number; y: number }; sok?: true; tandmat?: true; falt?: true; hamtar?: string; handel?: true }
const set = (v: Val, act: Act, why: string) => { v.act = act; v.why = why; return true; };

// Registret ARBETEN (steg 6.1.11, "Arbetsordningen" i designdokumentet): en rad per uppgift, i den ordning valet prövar dem.
// Valet går igenom registret uppifrån och tar den första rad som gäller nu (nar: dag, natt eller båda) och väljer något.
// Nivåerna (ARBETSNIVAER) säger vad raden är. Nivå 6–9 på dagen är egna rader (steg 6.2.18): en rad per resurs under
// Försörjning, som vägs mot varandra med poäng, bygget under Tak, projekten och raderna på Förbättra, och Fritid sist.
// Man går sedan dit (steg.ts)
// villkoren för vädret (steg 6.1.12): ingen torkning eller bad i regn, inget fiske i storm
export type Vaderkrav = 'torrt' | 'lugnt';
export function vaderTillater(s: State, krav?: Vaderkrav) {
  if (!krav) return true;
  const v = vaderNu(s);
  return krav === 'torrt' ? v.nb <= 0 : v.lage !== 'blast' && v.lage !== 'aska';
}
// byns behov räknas en gång i timmen, på jämna klockslag i spelet (timblocket i steg.ts), så att alla lägen väljer likadant
// (steg 6.1.12): hur många dygn maten och veden räcker, med tre decimaler som i sparfilen
const r3 = (x: number) => Math.round(x * 1000) / 1000;
export function arbetsTimme(s: State) {
  const mat = r3(foodDays(s)), ved = r3(woodDays(s)), n = living(s).length || 1;
  // arbetarna för varje rad (steg 6.1.13), minst en: efter arbetet (det som fattas ÷ vad en person hinner på ett pass), per
  // invånare eller efter platserna (bygget: BYGG.perHus för varje hus det finns något att göra på; kolet: varje utbrunnen eld)
  const matFattas = Math.max(0, onskatDygn('mat', 0) - mat) * n, vedFattas = Math.max(0, onskatDygn('ved', 0) - ved); // bufferten utan förrådsseden
  const hus = new Set<number>();
  for (const b of bitsOf(s)) if (b.hus !== undefined && (b.b < 1 || b.c < BYGG.laga) && husById(s, b.hus)?.flyttas === undefined) hus.add(b.hus); // ett hus som byggs upp på en ny plats lagas inte (steg 9.4.6)
  const kol = eldarOf(s).filter(e => (e.ash ?? 0) >= 1 && !e.lit && !emberOn(s, e)).length;
  const fler = 1 + PAB.hander * Math.max(0, pabud(s, 'vinter')); // påbudet Samla för vintern ger fler händer (steg 6.1.19)
  const arb: Record<ArbRad, number> = {
    mat: Math.max(1, Math.ceil(matFattas / VAL.matPass * fler)), ved: Math.max(1, Math.ceil(vedFattas / VAL.vedPass * fler)),
    bygga: Math.max(1, hus.size * BYGG.perHus * (lagGaller(s, 'dagsverke') ? LAG.dagsverke : 1)), tand: Math.max(1, Math.ceil(n / VAL.tandPer)), leta: Math.max(1, Math.ceil(n / VAL.letaPer)), kol: Math.max(1, kol),
  };
  // och materialens buffert och tak (forradsmal.ts, steg 6.2.14) och byns del av projektens värde (steg 6.2.21: hur mycket
  // byn saknar av varje projekt, frågat en gång i timmen i stället för av varje person i varje val)
  const brist: Record<string, number> = {};
  for (const k of PROJEKT_LIST) { const b = r3(PROJEKT[k].brist(s)); if (b > 0) brist[k] = b; }
  s.arbBehov = { mat, ved, arb, mal: materialTimme(s), brist, bv: s.byggV ?? 0 };
}
// raderna som har arbetare (steg 6.1.13). Maten är flera arbeten (samla, jaga, fiska, fältet) som delar på samma arbetare
export type ArbRad = 'mat' | 'ved' | 'bygga' | 'tand' | 'leta' | 'kol';
const radOf = (t: Task): ArbRad | undefined => t.tandmat ? 'tand' : t.sok ? 'leta' : t.act === 'bygga' ? 'bygga' : t.act === 'kol' ? 'kol' : ACTS[t.act]?.behov;
// räkneverket: hur många andra som gör raden just nu
export function arbetarNu(s: State, p: Person, rad: ArbRad) {
  let n = 0;
  for (const q of living(s)) if (q !== p && q.task && radOf(q.task) === rad) n++;
  return n;
}
// har raden sina arbetare? Då väger den VAL.fullRad
export const radFull = (s: State, p: Person, rad: ArbRad) => arbetarNu(s, p, rad) >= arbBehov(s).arb[rad];
const fullVikt = (s: State, p: Person, rad: ArbRad) => radFull(s, p, rad) ? VAL.fullRad : 1;
// en rad som väljs utan poäng (en chans eller en nödsak) tas med chansen fullRad när den har sina arbetare
const mjuk = (s: State, p: Person, rad: ArbRad) => !radFull(s, p, rad) || rnd(s, 'val', p) < VAL.fullRad;
const arbBehov = (s: State) => s.arbBehov ?? (arbetsTimme(s), s.arbBehov!);
// hur bråttom ett tillfälle är (steg 6.1.14): från tillfalleMin när fönstret öppnar till 1 när det stänger
const tillfalle = (fran: number, till: number, nu: number) => VAL.tillfalleMin + (1 - VAL.tillfalleMin) * clamp((nu - fran) / Math.max(1, till - fran), 0, 1);
export const ARBETSNIVAER = ['', 'Fara', 'Nöd och vård', 'Tillfälle', 'Grundbehov', 'Rädda', 'Försörjning', 'Tak', 'Förbättra', 'Fritid'] as const;
type Niva = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
// det valet vet om personen; farorna räknas första gången en rad frågar och gäller hela valet
interface Ctx { s: State; p: Person; v: Val; a: number; lazy: number; light: boolean; f?: Faror; d?: Dag }
const faror = (c: Ctx) => c.f ??= dangers(c.s);
// lat: hur mycket tidigare den lata tar grundbehoven
const fryser = (c: Ctx) => c.p.warm < KROPP.kallt + KROPP.latVarme * c.lazy;
export interface Arbete {
  id: string; niva: Niva;
  nar?: 'dag' | 'natt'; // utan nar: både dag och natt
  kort?: true; // dagens pass (VAL.pass): på dagen kortas valets tid innan raden prövas
  arstid?: readonly number[]; // en vikt per tidsålder (som sasong i ACTS); 0 = görs inte då
  vader?: Vaderkrav; // torrt: inte i regn eller snöfall; lugnt: inte i blåst eller åska
  bradska?: (c: Ctx) => number; // ett Tillfälle (steg 6.1.14): chansen att raden prövas före grundbehoven; annars prövas den efter dem
  prova: (c: Ctx) => boolean | undefined; // true = raden valde något (v är ifyllt)
  // en rad med poäng (steg 6.2.18): raderna på samma nivå med poäng vägs mot varandra och den med högst poäng prövas.
  // 0 = raden gäller inte nu. full: raden har sina arbetare, och poängen blir VAL.fullRad gånger så stor; har alla rader
  // som gäller sina arbetare går man till nästa nivå
  poang?: (c: Ctx) => number; full?: (c: Ctx) => boolean;
}
export const ARBETEN: readonly Arbete[] = [
  // 1 Fara: vargar är nära (steg 3.7.15), en tornado kommer (steg 3.8.4), det brinner (steg 3.8.5) eller vattnet stiger (steg 3.8.7)
  // den som brinner släcker sig själv först, och de som står nära hjälper hen före allt annat (steg 6.4.16)
  { id: 'brinner', niva: 1, prova: ({ s, p, v }) => { const m = slackaSigVal(s, p); if (!m) return false; set(v, m.act, m.why); v.spot = m.spot; v.dur = m.dur; v.ref = m.ref; return true; } },
  { id: 'hjalpBrinnande', niva: 1, prova: ({ s, p, v }) => { const m = hjalpaVal(s, p); if (!m) return false; set(v, m.act, m.why); v.spot = m.spot; v.dur = m.dur; v.ref = m.ref; return true; } },
  { id: 'skydd', niva: 1, prova: ({ s, p, v }) => { const sk = vargSkydd(s, p) ?? tornadoSkydd(s, p); if (!sk) return false; set(v, sk.act, sk.why); v.spot = sk.spot; v.dur = sk.dur; return true; } },
  { id: 'brand', niva: 1, prova: ({ s, p, v }) => { const br = brandVal(s, p); if (!br) return false; set(v, br.act, br.why); v.spot = br.spot; v.dur = br.dur; v.tool = br.tool; v.ref = br.ref; return true; } },
  // de vuxna som orkar bär undan maten från lagerplatserna vattnet kan nå, också på natten (flod.ts)
  { id: 'flod', niva: 1, prova: ({ s, p, v, a }) => {
    const fl = !s.flodHot || a < ALDER.vuxen || isSick(p, s.now) || !kanGa(p) ? undefined : flodUndan(s);
    if (!fl) return false;
    set(v, 'bara', fl.why); v.spot = fl; v.dur = VAL.baraTim * HOUR; count(s, 'flod undan'); return true;
  } },
  // 2 Nöd och vård (sjuk, svag, fryser farligt, måste på toa genast)
  { id: 'smabarn', niva: 2, prova: ({ v, a }) => a < ALDER.smabarn && set(v, 'sova', 'Är ett litet barn') },
  { id: 'toaGenast', niva: 2, prova: ({ p, v }) => p.toa < KROPP.toaGenast && set(v, 'toa', 'Måste gå på toa genast') },
  { id: 'torstFarligt', niva: 2, prova: ({ s, p, v }) => tortarFarligt(p) && dricka(s, p, v) }, // också den som är sjuk eller svag dricker
  { id: 'vardaSig', niva: 2, prova: ({ s, p, v }) => varda(s, p, v, true) }, // sina egna sår: trycka på, lägga förband och rengöra (steg 2.5.2)
  { id: 'sjuk', niva: 2, prova: ({ s, p, v }) => ligger(p, s.now) && set(v, 'sova', 'Är sjuk') }, // med feber eller svårt sjuk lägger man sig (steg 9.5.1)
  { id: 'svag', niva: 2, prova: ({ p, v }) => halsa(p) < KROPP.svag && set(v, 'sova', 'Är för svag för att orka något') }, // också av blodförlust och smärta (halsa.ts)
  { id: 'fryserFarligt', niva: 2, prova: ({ s, p, v }) => p.warm < KROPP.farligt && nagonEld(s) && set(v, 'varma', 'Fryser farligt') },
  // elden går inte att tända för att tändmaterial saknas: den som fryser men orkar hämtar det i stället för att gå in.
  // Kylan är faran och elden det enda som hjälper mot den (några räcker; de andra går in och väntar)
  { id: 'tandFryser', niva: 2, prova: c => fryser(c) && c.a >= ALDER.vuxen && tinderNeeded(c.s) && mjuk(c.s, c.p, 'tand') && (c.v.tandmat = true) && set(c.v, 'samla', 'Fryser, men utan tändmaterial blir det ingen eld') },
  { id: 'fryserFarligtInne', niva: 2, prova: ({ s, p, v }) => p.warm < KROPP.farligt && bedTile(s, p) !== undefined && set(v, 'vila', 'Fryser farligt och går in i huset') },
  { id: 'varda', niva: 2, prova: ({ s, p, v }) => varda(s, p, v, false) }, // en skadad är en fara: vården går före förbättringarna (steg 2.5.2)
  { id: 'vatten', niva: 2, prova: ({ s, p, v }) => hamtaVatten(s, p, v) }, // vatten i säcken åt den som inte kan gå (steg 2.10.1)
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
  // handlaren är här och byn har inte handlat (steg 4.4.1.3, handel.ts); på kvällen ligger filten ute (steg 4.5.4.11). Behovet
  // stiger under handlarens besök; den som står i kön eller handlar fortsätter
  { id: 'ritual', niva: 3, prova: ({ s, p, v }) => { const r = ritualVal(s, p); if (!r) return false; v.spot = r.spot; v.dur = r.dur; return set(v, 'ritual', r.why); } }, // ritualerna (steg 8.5.6)
  { id: 'bonNod', niva: 3, prova: ({ s, p, v }) => { const b = bonNod(s, p); if (!b) return false; v.tool = b.id; v.ref = b.vem; v.spot = { x: p.x, y: p.y }; v.dur = BONER[b.id].min * MIN; return set(v, 'be', BONER[b.id].text(s, p, b.o)); } }, // bönen i nöd (steg 8.5.3)
  { id: 'handla', niva: 3, bradska: ({ s, p }) => {
    const h = s.handlare;
    return !h || h.fas !== 'handlar' || h.affar?.vem === p.id || h.ko?.includes(p.id) ? 1 : tillfalle(h.kom, h.gar, s.now);
  }, prova: ({ s, p, v, light }) => {
    const hv = !light && skams(p, s.now) ? undefined : handlaVal(s, p);
    if (!hv) return false;
    set(v, hv.act, hv.why); v.spot = hv.spot; v.dur = hv.dur; v.ref = hv.ref; return true;
  } },
  // 4 Grundbehov (toa, värme, vatten, vila, mat). En lat person tillgodoser dem tidigare än en flitig
  { id: 'gammalSover', niva: 4, nar: 'natt', prova: ({ s, p, v, a }) => a > ALDER.sovGammal && rnd(s, 'val', p) < VAL.gammalSover && set(v, 'sova', 'Är gammal och sover på natten') },
  { id: 'toa', niva: 4, prova: ({ p, v, lazy }) => p.toa < KROPP.toaBehov + KROPP.latToa * lazy && set(v, 'toa', 'Behöver gå på toa') },
  { id: 'fryser', niva: 4, prova: c => fryser(c) && nagonEld(c.s) && set(c.v, 'varma', 'Fryser') },
  { id: 'fryserInne', niva: 4, prova: c => fryser(c) && bedTile(c.s, c.p) !== undefined && set(c.v, 'vila', 'Fryser och går in i huset') },
  { id: 'torstig', niva: 4, prova: ({ s, p, v, lazy }) => torstig(p, lazy) && dricka(s, p, v) },
  // den som inte kan gå kravlar hem, och den som har mycket ont eller ett infekterat sår vilar (steg 2.5.2)
  // ... men bara korta sträckor: längre bort än GANG.kravlaMax rutor väntar hen där hen är på att bäras (steg 6.2.7)
  { id: 'kravla', niva: 4, prova: ({ s, p, v }) => {
    if (kanGa(p) || hemma(s, p)) return false;
    if (utanforByn(s, Math.floor(p.x), Math.floor(p.y)) <= GANG.kravlaMax) return set(v, 'vila', 'Är skadad och kravlar hem');
    set(v, 'vila', 'Kan inte gå och väntar på att bäras hem'); v.spot = { x: p.x, y: p.y }; return true;
  } },
  { id: 'vilaSkadad', niva: 4, prova: ({ p, v }) => vilaHellre(p) && set(v, 'vila', 'Är skadad och vilar') },
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
  { id: 'utbrott', niva: 4, nar: 'dag', prova: ({ s, p, v }) => utbrottVal(s, p, v) },
  // nattens vakt (byts varje natt kl. 7)
  { id: 'vakt', niva: 6, nar: 'natt', prova: ({ s, p, v, a }) => vaktVal(s, p, v, a) },
  // barnen leker; de lite större hjälper till (raden arbete)
  { id: 'leka', niva: 9, nar: 'dag', kort: true, prova: ({ s, v, a }) => a < ALDER.hjalper && set(v, 'leka', lekText(s)) },
  // ett framträdande vid elden (steg 4.3.2, framtradande.ts): uppträda eller lyssna
  { id: 'framtradande', niva: 9, nar: 'natt', prova: ({ s, p, v }) => {
    const fr = skams(p, s.now) ? undefined : framVal(s, p, q => spotFor(s, 'beratta', q));
    if (!fr) return false;
    set(v, fr.act, fr.why); v.spot = fr.spot ?? spotFor(s, 'beratta', p); v.dur = fr.dur; v.ref = fr.ref; v.tool = fr.tool; return true;
  } },
  // 5 Rädda: det som blir dåligt först räddas först (radda nedan, steg 6.1.15). Att bära in är en förbättring: inte när byn fryser (talet dras ändå, så att personens följd är som förut). När byn
  // svälter bärs bara maten in, så att den inte blir liggande ute (steg 2.12.3)
  { id: 'avrusta', niva: 5, nar: 'dag', prova: ({ s, p, v, a }) => { if (a < ALDER.vuxen || !kanGa(p)) return false; const g = avrustaVal(s, p); if (!g) return false; v.spot = g.spot; v.ref = g.ref; v.dur = g.min * MIN; return set(v, 'avrusta', g.why); } }, // steg 8.7.5
  { id: 'rusta', niva: 3, prova: ({ s, p, v }) => { const r = rustaVal(s, p); if (!r) return false; v.spot = r.spot; v.ref = r.ref; v.dur = 2 * MIN; return set(v, 'rusta', r.why); } }, // byta om inför strid (steg 8.7.8)
  { id: 'begrava', niva: 5, nar: 'dag', prova: ({ s, p, v, a }) => { if (a < ALDER.vuxen || !kanGa(p)) return false; const g = begravaVal(s, p); if (!g) return false; v.spot = g.spot; v.ref = g.ref; v.dur = 2 * MIN; return set(v, 'begrava', g.why); } }, // kroppen och graven (steg 8.5.1)
  { id: 'bara', niva: 5, nar: 'dag', kort: true, prova: c => {
    const { s, p, v } = c; let gt: ReturnType<typeof haulJob>;
    if (!(s.stackar?.length && radda(s, p, a => !isStored(s, a.x, a.y)) && !faror(c).kyla && (gt = haulJob(s, undefined, faror(c).svalt)))) return false;
    set(v, 'bara', gt.why); v.spot = gt; v.dur = VAL.baraTim * HOUR; return true;
  } },
  // fältet (steg 2.10.3): den mogna grödan skördas innan den blir övermogen eller fryser, och den som börjat på sitt fält arbetar vidare
  { id: 'falt', niva: 5, nar: 'dag', kort: true, prova: c => {
    const sk = c.a >= ALDER.vuxen ? faltNu(c.s, c.p, faror(c).svalt || faror(c).kyla) : undefined;
    if (!sk) return false;
    projektVal(c.v, { act: 'odla', text: sk.text, min: sk.min, tool: sk.tool, spot: sk.spot, ref: sk.ref }, sk.tool === 'mogen' ? 'Grödan på fältet är mogen' : 'Arbetar vidare på sitt fält'); return true;
  } },
  { id: 'slakta', niva: 5, nar: 'dag', kort: true, prova: ({ s, p, v, a }) => {
    const vilt = slaktbart(s, p);
    if (!(a >= ALDER.vuxen && vilt && radda(s, p, lagrat(s, k => k === vilt.sak)))) return false;
    processTask(s, v, vilt, 'Det finns vilt att slakta innan det blir dåligt'); return true;
  } },
  { id: 'rensa', niva: 5, nar: 'dag', kort: true, prova: ({ s, p, v, a }) => a >= ALDER.rensar && !!rensaArt(s, p) && radda(s, p, lagrat(s, k => RENSAS.some(q => q.sak === k))) && (processTask(s, v, rensaArt(s, p)!, 'Det finns fisk att rensa innan den blir dålig'), true) },
  { id: 'torka', niva: 5, nar: 'dag', kort: true, vader: 'torrt', prova: ({ s, p, v, a }) => a >= ALDER.grillar && kanTorka(s, p) && radda(s, p, lagrat(s, k => TORKAS.some(r => r.ra === k)), torkAndel(pabud(s, 'torkat'))) && (torkVal(s, v, 'Det finns kött och fisk att torka'), true) },
  { id: 'grilla', niva: 5, nar: 'dag', kort: true, prova: ({ s, p, v, a }) => a >= ALDER.grillar && kanGrilla(s, p) && radda(s, p, lagrat(s, k => RATTER.some(r => r.ra === k))) && (grillVal(s, v, 'Det finns rått kött och rå fisk att grilla'), true) },
  // 6 Försörjning (steg 6.2.18): kolet i en utbrunnen lägereld (den första först, steg 4.5.6.8), barnen leker eller hjälper till,
  // påbudet Bygg före allt flyttar bygget hit (steg 6.1.19), flintan och stenarna till elden letas, och sist en rad per resurs
  // under sin buffert (FORRADSMAL, forradsmal.ts), som väljs med poäng: behovet gånger lusten (dagen nedan). Om p arbetar alls
  // avgörs av flit och plikt (dag.works); annars blir det fritid (nivå 9)
  { id: 'kol', niva: 6, nar: 'dag', kort: true, prova: c => {
    const { s, p, v, a } = c;
    const kolEld = a >= ALDER.ansvar ? eldarOf(s).find(e => (e.ash ?? 0) >= 1 && !e.lit && !emberOn(s, e) && (e.want ?? 0) < TROSKEL.kolEld) : undefined;
    if (!(kolEld && rnd(s, 'val', p) < VAL.kolChans * fullVikt(s, p, 'kol'))) return false;
    set(v, 'kol', 'Det ligger kol kvar i den slocknade elden');
    v.dur = VAL.kolMin * MIN;
    if (kolEld !== s.fire) { v.ref = kolEld.id; v.spot = vidEld(s, kolEld, 0, 1.1); }
    return true;
  } },
  { id: 'barn', niva: 6, nar: 'dag', kort: true, prova: c => {
    const { s, p, v, a } = c;
    if (a >= ALDER.vuxen) return false;
    const d = dag(c);
    if (rnd(s, 'val', p) < VAL.lekBas + VAL.lekSed * s.seder.v.barn) return set(v, 'leka', lekText(s));
    const tand = d.best === 'samla' && needTinder(s);
    set(v, d.best, `Hjälper till. ${tand ? 'Byn behöver tändmaterial till elden' : ACTS[d.best].behov === 'ved' ? `Byn behöver ved, förrådet räcker ${dygn(d.wd)}` : d.fd < d.matBuf ? `Byn behöver mat, förrådet räcker ${dygn(d.fd)}` : `Mer mat till förrådet, som räcker ${dygn(d.fd)}`}.`);
    if (tand) v.tandmat = true;
    return true;
  } },
  { id: 'byggPabud', niva: 6, nar: 'dag', kort: true, prova: c => {
    const d = dag(c), pb = pabud(c.s, 'bygg');
    return d.works && !!d.job && pb > 0 && !faror(c).svalt && rnd(c.s, 'val', c.p) < pb && bygg(c);
  } },
  { id: 'leta', niva: 6, nar: 'dag', kort: true, prova: c => {
    const { s, p } = c;
    if (!(dag(c).works && flintaTillElden(s, faror(c)) && rnd(s, 'val', p) < VAL.letaChans * fullVikt(s, p, 'leta'))) return false;
    arbeta(c, 'samla', `Byn behöver ${needStones(s) ? 'stenar' : 'flinta'}`, { leta: true }); return true;
  } },
  { id: 'mat', niva: 6, nar: 'dag', kort: true, poang: c => { const d = dag(c); return d.works && d.fdBy < d.malBy ? d.wBy * d.rad.mat.sc : 0; },
    full: c => radFull(c.s, c.p, 'mat') && !faror(c).svalt,
    prova: c => { const d = dag(c); arbeta(c, d.rad.mat.act, d.fdBy < d.malBy ? `Byn behöver mat, förrådet räcker ${dygn(d.fd)}` : `Mer mat till förrådet, som räcker ${dygn(d.fd)}`); return true; } },
  // den egna maten är en rad för personen och familjen (Förråden, bufferten per jag), ingen spärr: den har inga arbetare att fylla
  { id: 'egenMat', niva: 6, nar: 'dag', kort: true, poang: c => { const d = dag(c); return d.works ? d.wEgen * d.rad.mat.sc : 0; },
    prova: c => { const d = dag(c); arbeta(c, d.rad.mat.act, `Behöver egen mat, har för ${dygn(d.egen)}`); return true; } },
  { id: 'ved', niva: 6, nar: 'dag', kort: true, poang: c => { const d = dag(c); return d.works && d.wd < buffert(c.s, 'ved') ? d.wWood * d.rad.ved.sc : 0; },
    full: c => radFull(c.s, c.p, 'ved') && !faror(c).kyla,
    prova: c => { const d = dag(c); arbeta(c, d.rad.ved.act, `Byn behöver ved, förrådet räcker ${dygn(d.wd)}`); return true; } },
  { id: 'tand', niva: 6, nar: 'dag', kort: true, poang: c => { const d = dag(c); return d.works && needTinder(c.s) ? Math.max(d.wBy, d.wEgen) * d.rad.tand.sc : 0; },
    full: c => radFull(c.s, c.p, 'tand'),
    prova: c => { arbeta(c, dag(c).rad.tand.act, 'Byn behöver tändmaterial till elden', { tandmat: true }); return true; } },
  // 6 Försörjning: att vittja en mjärde med fisk i (steg 7.4.2)
  { id: 'vittja', niva: 6, nar: 'dag', kort: true, prova: c => {
    const { s, p, v, a } = c;
    if (a < ALDER.vuxen || !dag(c).works) return false;
    const m = kanVittja(s).filter(q => q.n >= MJARDE.vittjaMin && !living(s).some(o => o !== p && o.task?.act === 'vittja' && o.task.ref === q.id)).sort((x, y) => Math.hypot(x.x - p.x, x.y - p.y) - Math.hypot(y.x - p.x, y.y - p.y))[0];
    if (!m) return false;
    set(v, 'vittja', 'Mjärden har fisk i sig.'); v.ref = m.id; v.spot = { x: m.x + 0.5, y: m.y + 0.5 }; v.dur = VAL.vittjaMin * MIN;
    return true;
  } },
  // 7 Tak: att bygga åt den som saknar sovplats och laga det som är slitet. När bygget har sina arbetare går man vidare
  { id: 'bygga', niva: 7, nar: 'dag', kort: true, prova: c => { const d = dag(c); return d.works && !!d.job && !radFull(c.s, c.p, 'bygga') && bygg(c); } },
  // 8 Förbättra (steg 6.1.17–6.2.15): det mest värda projekt byn eller p saknar, sedan teknik, varor, underhåll och lära
  // (forbattra), och sist förråden till taket (fylla). Inte när kylan eller hungern är en fara
  { id: 'projekt', niva: 8, nar: 'dag', kort: true, prova: c => { const f = faror(c); return dag(c).works && c.a >= ALDER.vuxen && !f.kyla && !f.svalt && projektArbete(c); } },
  // 8 Förbättra: det Byggplanen föreslagit när inget behov är akut (steg 7.2.10)
  { id: 'forbHus', niva: 8, nar: 'dag', kort: true, prova: c => {
    const { s, p, v } = c, d = dag(c), f = faror(c);
    if (!d.works || f.kyla || f.svalt || radFull(s, p, 'bygga')) return false;
    const j = buildJob(s, p, true);
    if (!j?.bit.forb || j.missing) return false;
    building(s, p, v, j); return true;
  } },
  { id: 'forbattra', niva: 8, nar: 'dag', kort: true, prova: c => {
    const { s, p, v } = c, d = dag(c), f = faror(c);
    if (!d.works || f.kyla || f.svalt) return false;
    const fb = forbattra(s, p, v, d.fd, d.wd);
    if (!fb) return false;
    count(s, 'forbattra');
    if (fb !== true) arbeta(c, fb.act, `Byn har det den behöver. ${fb.why}`);
    return true;
  } },
  { id: 'fylla', niva: 8, nar: 'dag', kort: true, prova: c => {
    const { s, p } = c, d = dag(c), f = faror(c);
    if (!d.works || f.kyla || f.svalt) return false;
    const fy = fylla(s, p, d.best, d.fd, d.wd);
    // allt på Förbättra är gjort och förråden har nått sina tak: tiden blir fritid (steg 6.2.15)
    if (!fy) { count(s, 'fullaForrad'); return false; }
    count(s, 'fylla'); arbeta(c, fy.act, fy.why, { hamtar: fy.hamtar }); return true;
  } },
  // när kylan eller hungern är en fara och inget annat finns att göra gör den som arbetar det byn behöver mest
  { id: 'fara', niva: 8, nar: 'dag', kort: true, prova: c => {
    const d = dag(c), f = faror(c);
    if (!d.works || !(f.kyla || f.svalt)) return false;
    arbeta(c, d.best, ACTS[d.best].behov === 'ved' ? `Byn behöver ved, förrådet räcker ${dygn(d.wd)}` : `Byn behöver mat, förrådet räcker ${dygn(d.fd)}`); return true;
  } },
  // 9 Fritid: vila, hantverk, umgänge, promenad, bad eller att sitta vid stranden
  { id: 'fritid', niva: 9, nar: 'dag', kort: true, prova: c => { leisure(c.s, c.p, c.v, dag(c).u, c.lazy); return true; } },
  // på natten håller man sig vid elden och berättar, gör handarbete, umgås eller sover
  { id: 'kvall', niva: 9, nar: 'natt', prova: ({ s, p, v, a }) => { night(s, p, v, a); return true; } },
];

// raderna med poäng per nivå (steg 6.2.18)
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

export function chooseTask(s: State, p: Person) {
  if (p.svimmat) { p.task = { act: 'medvetslos', phase: 'do', tx: p.x, ty: p.y, until: s.now + 30 * MIN, carry: 0, dark: false, why: 'Har svimmat' }; return; } // kan inte göra något (steg 8.2.6)
  const a = ageOf(p, s.now), light = isLight(s.now), lazy = 1 - duty(s, p);
  const v: Val = { act: 'vila', why: '', dur: (VAL.vilaMin + rnd(s, 'val', p) * VAL.vilaSpann) * MIN }; // 20–60 min
  const c: Ctx = { s, p, v, a, lazy, light }, nar = light ? 'dag' : 'natt';
  let rad: Arbete | undefined, kortat = false, senare: Arbete[] = [], vagd = 0;
  const galler = (r: Arbete) => !(r.nar && r.nar !== nar || r.arstid && !r.arstid[ageIndex(s)] || !vaderTillater(s, r.vader)); // villkoren på raden (steg 6.1.12)
  for (const r of ARBETEN) {
    // de tillfällen som inte brådskade prövas när grundbehoven är förbi (steg 6.1.14)
    if (senare.length && r.niva > 4) { rad = senare.find(w => w.prova(c)); senare = []; if (rad) break; }
    if (!galler(r)) continue;
    if (r.kort && light && !kortat) { v.dur *= VAL.pass; kortat = true; }
    if (r.poang) { // raderna med poäng på nivån vägs mot varandra en gång (steg 6.2.18)
      if (vagd === r.niva) continue;
      vagd = r.niva;
      const w = vinnare(c, POANGRADER[r.niva].filter(galler));
      if (w?.prova(c)) { rad = w; break; }
      continue;
    }
    const b = r.bradska?.(c) ?? 1;
    if (b < 1 && rnd(s, 'val', p) >= b) { senare.push(r); continue; }
    if (r.prova(c)) { rad = r; break; }
  }
  // buden (steg 8.6.8): den troende låter bli det som är förbjudet och vilar på vilodagen. Svält och kyla går före, men kostar
  if (rad && rad.niva > 2) {
    const id = budForbjuder(s, p, v.act), tabu = id ? undefined : tabuAkt(s, p, v.act); // och låter bli det som är tabu (steg 8.4.10)
    if (id || tabu || (vilodagNu(s, p) && ACTS[v.act].arbete)) {
      const f = faror(c);
      if (f.svalt || f.kyla) { if (id) budBrutet(s, p, id); }
      else { set(v, 'vila', id ? 'Tron förbjuder det' : tabu ? `Vill inte ${tabu}` : 'Det är vilodag'); v.spot = undefined; v.tool = undefined; v.ref = undefined; if (tabu) count(s, 'tabuUndvek'); }
    }
  }
  // straffet skam (steg 3.5.3, styre.ts): inte det faran väljer (vargarna, tornadon, branden, vattnet) och inte det som skyddar (skamfri i ACTS)
  if (rad?.niva !== 1 && ACTS[v.act].social && !ACTS[v.act].skamfri && skams(p, s.now)) { v.act = 'skams'; v.why = 'Skäms och håller sig undan de andra'; v.spot = undefined; }
  if (v.act === 'toa') {
    v.dur = (VAL.toaMin + rnd(s, 'val', p) * VAL.toaSpann) * MIN;
    const l = latrinFor(s, p); // till latrinen om byn har en (steg 2.7.2, smuts.ts)
    if (l) { v.spot = { x: l.x + 0.5, y: l.y + 0.5 }; v.ref = l.id; v.why += '. Går till latrinen'; }
  }
  const sp0 = v.spot ?? spotFor(s, v.act, p), sp = freeNear(s, sp0.x, sp0.y); // aldrig i en husvägg
  p.task = { act: v.act, phase: 'go', tx: sp.x, ty: sp.y, until: s.now + v.dur + (startsOnArrival(v.act) ? GA_TID : 0), ...(ACTS[v.act].framme ? { arbTid: v.dur } : {}), carry: 0, why: v.why, dark: !light, ref: v.ref, tool: v.tool, site: v.site, sok: v.sok, tandmat: v.tandmat, falt: v.falt, hamtar: v.hamtar, handel: v.handel, stanna: v.stanna, pass: v.pass !== undefined ? s.now + v.pass : undefined };
  balteForband(s, p, v.act);
  if (ACTS[v.act].plats === 'station') { const st = stationFor(s, v.act, p); if (st && Math.hypot(sp.x - vidStation(st).x, sp.y - vidStation(st).y) < 2) stationBrukad(s, st); } // hur mycket stationen används (steg 9.4.8)
  if (v.act === 'samtal' && !v.spot) samtalMed(s, p); // fram till den man vill prata med (steg 4.5.6.7)
  const k = usesTool(p.task);
  if (k && !take(s, p, k)) p.task.tool = undefined; // redskapet tas i handen: det egna först (agande.ts)
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
  v.spot = d.spot; v.ref = d.ref; v.tool = d.karl; v.dur = 0; v.falt = d.falt; // säcken eller en mellanstor lerkruka (steg 9.4.12)
  return set(v, 'vatten', d.why);
}

// törst (steg 2.4.1): vid vattnet, eller snö som smälts vid elden i istiden (torst.ts). false = inget vatten att nå
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
interface Dag { fd: number; fdBy: number; malBy: number; wd: number; tot: number; matBuf: number; best: Act; wBy: number; wEgen: number; egen: number; wWood: number; rad: Record<'mat' | 'ved' | 'tand', { act: Act; sc: number }>; job?: Job; u: number; works: boolean }
function dag(c: Ctx): Dag {
  if (c.d) return c.d;
  const { s, p, lazy } = c, fara = faror(c);
  const { mat: fd, ved: wd } = arbBehov(s), ai = ageIndex(s), tot = habitTotal(p);
  const w = bestWork(s, p, fd, wd, ai, tot, fara);
  // bygget: väger mer ju fler som saknar sovplats under tak, inför och under istiden, när en vägg behöver lagas och när huset inte är klart.
  // När kylan är en fara byggs inget: tiden går till värmen (steg 2.12.3)
  // timret till bygget fälls med yxa: utan en ledig yxa och utan att kunna göra en går det inte att hämta (arbetet ved ger bara
  // grenar, som annars samlas utan slut: by 24758 efter v392). Yxan blir då ett projekt som saknar material (steg 6.1.17)
  const job0 = fara.kyla ? undefined : buildJob(s, p);
  const job = job0?.missing && job0.item === 'ved' && freeTools(s, p, 'yxa') === 0 && !wantsTool(s, p, 'yxa') ? undefined : job0;
  let burg = w.burg;
  if (job) {
    const utan = homeless(s) / (living(s).length || 1);
    const halvt = !job.repair && !s.hus?.find(h => h.id === job.bit.hus)?.klar; // ett påbörjat hus vill man göra klart, även när det sista är ett hörn
    // hungern är en fara och går före: räcker maten mindre än byggMatFran + byggMatSpann dygn väger bygget mindre
    burg = Math.max(burg, ((job.repair ? VAL.byggLaga : halvt ? VAL.byggHalvt : VAL.byggNytt) + VAL.byggUtan * utan) * (kallTid(ai) ? ARSTID.byggKall : 1) * clamp((fd - TROSKEL.byggMatFran) / TROSKEL.byggMatSpann, TROSKEL.byggMatMin, 1));
  }
  const u = clamp(burg / VAL.akut, 0, 1); // hur akut byn behöver arbete
  const sat = Math.min(p.hunger, p.rest, p.social); // hur väl de egna behoven är fyllda
  const works = rnd(s, 'val', p) < (1 - lazy) * (VAL.flitigBas + VAL.flitigAkut * u) + lazy * sat * (VAL.latBas + VAL.latAkut * u);
  // bufferten (forradsmal.ts), med p:s aning om en hård vinter
  return c.d = { fd, fdBy: w.fdBy, malBy: w.malBy, wd, tot, matBuf: buffert(s, 'mat', p.varsel ? varselSamla(s, p) : 0), best: w.best, wBy: w.wBy, wEgen: w.wEgen, egen: w.egen, wWood: w.wWood, rad: w.rad, job, u, works };
}
// ett arbete under Försörjning, Tak eller Förbättra: skälet, passet, redskapen (withTools) och det som hämtas
function arbeta(c: Ctx, act: Act, what: string, o: { tandmat?: boolean; hamtar?: string; leta?: boolean; matLeta?: boolean; job?: Job } = {}) {
  const { s, p, v, lazy } = c, tot = dag(c).tot;
  set(v, act, what + (lazy < 0.2 ? '. Plikttrogen.' : habitShare(p, [act], tot) > 0.25 ? '. Brukar göra det.' : p.skill[act as Skill] > 10 ? '. Skicklig på det.' : '.'));
  v.dur = (VAL.arbeteMin + rnd(s, 'val', p) * VAL.arbeteSpann) * MIN * VAL.pass;
  if (o.tandmat) v.tandmat = true;
  if (v.act === 'samla' && !o.leta) v.hamtar = o.hamtar;
  withTools(s, p, v, act, what, faror(c), !!o.leta, !!o.matLeta);
  if (v.act === 'fiske' && islagt(s)) v.why = `${v.why} Hugger upp ett hål i isen och pimplar.`;
  if (o.job && v.act === 'falla') { v.ref = o.job.bit.hus; v.why = `${v.why} Stocken ska bli en vägg.`; } // trädet fälls för bygget
}
// bygget (Tak): saknas material hämtas det först
function bygg(c: Ctx) {
  const job = dag(c).job!;
  if (!job.missing) { building(c.s, c.p, c.v, job); return true; }
  const it = job.item;
  arbeta(c, it === 'torrgras' ? 'samla' : 'ved', `Bygget behöver ${it === 'torrgras' ? 'hö' : it === 'ved' ? 'ved' : it === 'virke' ? 'virke' : 'grenar'}`, { hamtar: it, job: it === 'ved' ? job : undefined });
  return true;
}
// projektet (Förbättra, steg 6.1.17): det mest värda projekt byn eller p saknar (projekt.ts). Fattas ett material som går att
// hämta (hamtas i projekt.ts) hämtar man det; flintan letas bara av dem som raden leta ger plats åt, de andra går vidare på nivån
function projektArbete(c: Ctx) {
  const { s, p, v } = c, pr = bastaProjekt(s, p, faror(c));
  if (pr?.u) { projektVal(v, pr.u, `Byn saknar ${PROJEKT[pr.k].namn.toLowerCase()}`); return true; }
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

// 8 Förbättra är aldrig tom (steg 6.1.18): när inget går före och inget projekt finns att göra väljer man i den här ordningen
// att pröva sig fram mot en teknik (teknik.ts), arbeta där en öppen teknik kan komma, göra varor till handlaren (steg 6.2.11)
// göra ett nytt redskap eller plagg i stället för ett slitet (underhållet, steg 6.2.12) eller gå i lära. Att bygga om väntar på sitt system (Färdplanen). true = valet är gjort; ett arbete görs som det vanliga arbetet
function forbattra(s: State, p: Person, v: Val, fd: number, wd: number): true | { act: Act; why: string } | undefined {
  const fv = forsokChans(s, p, fd, wd) > 0 ? forsokVal(s, p) : undefined;
  if (fv) {
    set(v, 'forsok', `Byn har det den behöver. Prövar sig fram till ${TEK[fv.id].namn.toLowerCase()}.`);
    v.tool = fv.id; v.dur = fv.min * MIN; if (fv.spot) v.spot = fv.spot;
    return true;
  }
  // arbetet där en teknik kan komma, bara så länge det byn får av det inte redan räcker så länge att byn annars slutat samla
  // (lyxtaket i FORRADSMAL, forradsmal.ts): annars växer högarna i lagret utan slut
  const nog = (a: Act) => ACTS[a].behov === 'ved' ? wd > lyxtak(s, 'ved') : ACTS[a].behov === 'mat' && matFullt(s, p, fd);
  const ta = tekArbete(s, p, a => WORK.includes(a) && !nog(a) && (ACTS[a].vid !== 'vatten' || vaderTillater(s, 'lugnt')));
  if (ta) return { act: ta.act, why: `Kanske kommer ${han(p)} på ${ta.t.namn.toLowerCase()}` };
  if (handlarVara(s, p, v)) return true;
  const ug = underhallGrupp(s, p); // underhållet (steg 6.2.12): ett nytt i stället för ett slitet
  const uu = ug && PROJEKT[ug].uppgift(s, p); // samma projekt som när byn saknar redskapet (steg 6.2.17)
  if (uu) { projektVal(v, uu, 'Byn har det den behöver. Ett av byns är slitet och ett nytt görs i tid'); return true; }
  return gaILara(s, p, v, 'Byn har det den behöver') || undefined;
}
// Sist på Förbättra (steg 6.2.15): förråden fylls mellan bufferten och taket i FORRADSMAL. Först det arbete p helst gör om dess
// förråd är under taket, sedan maten, veden och materialen som plockas (grenar och hö). Är alla vid taket finns inget kvar
// att göra, och tiden blir fritid (undefined)
// maten har nått taket när den räcker så länge, eller när all mat, också den som ruttnar först, skulle räcka så länge: då ger
// mer mat bara mer som ruttnar
const matFullt = (s: State, p: Person, fd: number) => { const t = lyxtak(s, 'mat', p.varsel ? varselSamla(s, p) : 0); return fd >= t || foodDaysAll(s) >= t; };
function fylla(s: State, p: Person, best: Act, fd: number, wd: number): { act: Act; why: string; hamtar?: string } | undefined {
  const matFull = matFullt(s, p, fd), vedTak = lyxtak(s, 'ved');
  const mat = { act: 'samla' as Act, why: `Mer mat till förrådet, som räcker ${dygn(fd)}` }, ved = { act: 'ved' as Act, why: `Mer ved till förrådet, som räcker ${dygn(wd)}` };
  const b = ACTS[best].behov;
  if (b === 'mat' && !matFull) return { ...mat, act: best };
  if (b === 'ved' && wd < vedTak) return { ...ved, act: best };
  if (!matFull) return mat;
  if (wd < vedTak) return ved;
  // det andra redan bär hem räknas med, så att inte flera fyller över taket samtidigt
  const pavag = (k: string) => living(s).reduce((n, q) => n + (q !== p && q.task?.hamtar === k ? q.task.items?.[k] ?? 0 : 0), 0);
  for (const k of ['grenar', 'torrgras'] as const) if (!overTak(s, k, pavag(k))) return { act: 'samla', why: `Mer ${k === 'grenar' ? 'grenar' : 'hö'} till förrådet`, hamtar: k };
  return undefined;
}
// varor till handlaren (steg 6.2.11): det handlarna brukar köpa (handlarMal i handel.ts), så många byn har över det den själv
// vill ha. Redskapen görs som andra redskap (handelTask i redskap.ts), repet tvinnas av hö
export function handlarVara(s: State, p: Person, v: Val) {
  for (const k in s.handlarKopt ?? {}) {
    const mal = handlarMal(s, k);
    if (!mal) continue;
    if (k === 'rep') {
      if (!knows(p, 'rep') || amountOf(s, 'rep') >= TROSKEL.repVill + mal || getable(s, p, 'torrgras') < SAKER.rep!.skaffa!.av!.torrgras! + TROSKEL.torrgras || doingAct(s, 'tvinna', p)) continue;
      set(v, 'tvinna', 'Byn har det den behöver. Tvinnar rep att byta med handlaren.');
      v.handel = true;
      return true;
    }
    const g = gruppOf(k);
    if (!GORS[g]?.includes(k) || harAv(s, g) - villAv(s, g) >= mal) continue;
    const u = handelTask(s, p, k);
    if (!u) continue;
    projektVal(v, u, `Byn har det den behöver. Gör ${sakNamn(k).toLowerCase()} att byta med handlaren`);
    v.handel = true;
    return true;
  }
  return false;
}
// egen lust att arbeta med färdigheten skill: färdigheten och egenskapen som hjälper, gånger vanan (acts: handlingarna som räknas)
const lust = (s: State, p: Person, skill: Skill, egenskap: Stat, acts: Act[], tot: number) => (VAL.lustBas + p.skill[skill] + stat(p, egenskap, s.now) / VAL.lustEgenskap) * (1 + VAL.lustVana * habitShare(p, acts, tot)) * smakDrag(p, acts); // och smaken (steg 3.3.5)
// så mycket ledarens påbud om torkat ändrar chansen att torka (1 = som utan påbud; styre.ts visar det i procent)
export const torkAndel = (v: number) => 1 + VAL.torkPabud * v;
// Rädda (steg 6.1.15): p tar det som blir dåligt inom VAL.raddaTim, och det som håller längre mer sällan, aldrig under
// VAL.raddaMin. Talet dras alltid, och timmarna räknas bara när talet inte redan räcker under golvet
function radda(s: State, p: Person, pass: (a: { k: string; x: number; y: number }) => boolean, gang = 1) {
  const r = rnd(s, 'val', p);
  return r < VAL.raddaMin * gang || r < Math.min(1, gang * Math.max(VAL.raddaMin, Math.min(1, VAL.raddaTim / timKvar(s, pass))));
}
// det som ligger i lagret och är av en sort som k godtar
const lagrat = (s: State, k: (k: string) => boolean) => (a: { k: string; x: number; y: number }) => k(a.k) && isStored(s, a.x, a.y);
// det arbete byn behöver mest just nu, vägt mot egen lust och vana. burg = hur mycket det mest behövda behövs
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
  // byn delar (delning.ts), och familjen sin för det den äger, resten, vägd med egenintresset som projekten (projekt.ts)
  const delas = s.delning?.andel ?? 1, fdBy = fd * bynsMatAndel(s), malBy = onskat * delas;
  const wBy = malBy <= 0 ? M.minMatt : fdBy < malBy ? clamp(FORRAD.behovTomt - fdBy / (M.dygn * fs * delas), M.min, FORRAD.behovMax)
    : Math.max(M.minMatt, M.min - (M.min - M.minMatt) * (fdBy - malBy) / (malBy * (M.matt - 1)));
  const famDygn = familjMatDygn(s, familjOf(s, p.id)), malFam = onskat * (1 - delas);
  const wFam = famDygn < malFam ? clamp(FORRAD.behovTomt - famDygn / malFam * (FORRAD.behovTomt - M.min), M.min, FORRAD.behovMax) * egenintresse(s, p) : 0;
  // den som har mat för kortare tid än egenDygn, sin egen, byns och familjens, arbetar alltid för maten (steg 3.10.26)
  const egen = egnaMatDygn(s, p), wNod = egen < VAL.egenDygn ? FORRAD.behovTomt - egen / VAL.egenDygn * (FORRAD.behovTomt - M.min) : 0;
  const wEgen = Math.max(wNod, wFam);
  const wFood = Math.max(wBy, wEgen);
  // grenarna mättas: räcker veden länge och kan p inte hugga trä som byn saknar, sjunker golvet (steg 6.1.5)
  // (grenarna vid sitt tak räcker också: den som har yxa men inget träd att fälla samlar annars grenar utan slut; taket i FORRADSMAL, steg 6.2.14)
  const andel = (k: string) => wd * amountOf(s, k) * (k === 'grenar' ? GREN : 1) / Math.max(1e-9, fuelStock(s));
  const mattad = wd > V.matt * vs && (freeTools(s, p, 'yxa') === 0 && (fara.kyla || !wantsTool(s, p, 'yxa')) || andel('ved') > V.matt * vs || overTak(s, 'grenar'));
  const vedGolv = !mattad ? V.min : Math.max(V.minMatt, V.min - (V.min - V.minMatt) * (wd - V.matt * vs) / (V.matt * vs));
  const wWood = clamp(FORRAD.behovTomt - wd / (V.dygn * vs), vedGolv, FORRAD.behovMax) * (kallTid(ai) ? ARSTID.vedKall : 1); // inför och under istiden väger veden tyngre
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
    const yieldR = !d.resurs ? 1 : clamp(prospectFor(s, p, w as Kind), VAL.prospektMin, VAL.prospektMax) * (d.vid === 'vatten' ? FANGST.handFiske * (naVattnet(s, p) ? 1 : 0) : 1) * toolGain(s, p, w, fara); // genom isen bara med ett hål (is.ts)
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
    set(v, 'hugga', stockOverHus(s) === over ? 'Hugger en fälld stam som ligger över ett hus.' : 'Hugger stammen hen fällde.');
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
  const site = siteOf(s, b); v.spot = job.need > 0 ? fetchSpot(s, job.item!) : site; if (job.need > 0) v.site = site;
}

// Flinta och stenar till elden letas när byn saknar dem och maten räcker: hungern är en fara och elden ett verktyg (steg 2.12.3)
// flintan under sin buffert i FORRADSMAL (minst TROSKEL.flintaMinsta), stenarna under sin eller till eldringen (steg 6.2.14)
const flintaTillElden = (s: State, fara: Faror) => !fara.svalt && (underBuffert(s, 'flinta') || needStones(s) || underBuffert(s, 'sten'));
// arbetet med redskap: flinta letas vid stenarna, yxan fäller träd, korgen och spjutet görs först om de saknas.
// fara: farorna från day(), leta: letar vid stenarna hela passet, matLeta: ett projekt saknar flinta (steg 6.1.17)
function withTools(s: State, p: Person, v: Val, best: Act, what: string, fara: Faror, leta = false, matLeta = false) {
  const stones = needStones(s);
  if (best === 'samla' && (leta || (flintaTillElden(s, fara) || matLeta) && rnd(s, 'val', p) < VAL.stenarChans * fullVikt(s, p, 'leta'))) { // byn saknar flinta eller stenar till eldringen. Stenarna ligger långt bort, så där letar man ett helt pass
    const fa = flintArea(p), fl = (fa !== undefined && flintSpot(s, p, (x, y) => areaOf(x, y) === fa)) || flintSpot(s, p);
    if (fl) { v.spot = fl; v.dur /= VAL.pass; v.sok = true; v.why = `${v.why} Letar efter ${stones ? 'stenar till en eldring' : 'flinta'} vid stenarna${fa !== undefined ? ` där ${han(p)} vet att det finns flinta` : ''}.`; }
  }
  // byn vill ha frön: ibland går den som samlar till de vilda grödorna och plockar (där kommer man på odling, steg 2.10.11)
  if (best === 'samla' && !v.sok && !v.tandmat) {
    const vf = vildFronPlats(s);
    if (vf && rnd(s, 'val', p) < VAL.fronChans) { v.spot = vf; v.why = `${v.why} Plockar vilda frön.`; }
  }
  const ax = best === 'ved' ? axeTask(s, p) : undefined; // med yxa fälls träd och huggs ved
  if (ax) {
    set(v, ax.act, `${what}. ${ax.why}.`);
    if (ax.dur) v.dur = ax.dur;
    v.spot = { x: ax.x, y: ax.y }; v.tool = 'yxa'; v.ref = ax.ref;
  } else if (best === 'ved') { // utan yxa görs en, som projekt (steg 6.2.17)
    const u = projektNu(s, p, 'yxa', fara);
    if (u) projektVal(v, u, what);
  }
  // med det bästa redskapet som är ledigt; finns inget gör den som kan ett först (inte när kylan är en fara)
  const rader = ACTS[v.act].redskap;
  if (rader) for (const [g, ks] of Object.entries(toolGroups(v.act))) {
    if (!rader[ks[0]].tar) continue; // yxan väljs med arbetet (axeTask)
    if (g === 'korg' && ryggsack(s, p)) continue; // den som har en ryggsäck på sig tar ingen korg (steg 7.1.3)
    const k = freeOfKinds(s, p, ks);
    if (k) { v.tool = k; v.why = v.why.replace(/\.$/, '') + '. ' + rader[k].tar; return; }
    const u = GORS[g] ? projektNu(s, p, g, fara) : undefined; // redskapet görs som projekt (steg 6.2.17), vid sin egen plats: inget ärvs från flintletandet eller tändmaterialet
    if (u) { v.spot = undefined; v.sok = undefined; v.tandmat = undefined; projektVal(v, u, what); return; }
  }
}
// hur mycket mer arbetet ger med det redskap som finns ledigt eller kan göras (det bästa först). Ett redskap räknas som
// möjligt att göra bara när withTools skulle göra det: inte när kylan är en fara, och med höet som sparas till värmen
export function toolGain(s: State, p: Person, act: Act, fara: Faror) {
  for (const [g, ks] of Object.entries(toolGroups(act))) {
    if (g === 'korg' && ryggsack(s, p)) return ACTS[act].redskap![ks[0]].ger ?? 1; // ryggsäcken ger det korgen ger (steg 7.1.3)
    if (freeOfKinds(s, p, ks) || GORS[g] && PROJEKT[g].kan(s, p, fara)) return ACTS[act].redskap![ks[0]].ger ?? 1;
  }
  return 1;
}
// slakta det fällda viltet eller rensa fisken vid slaktbänken (DJUR i redskap.ts), så länge det tar, med kniven om det behövs
// det första djuret som p kan slakta (kaninen, vargen; steg 3.7.14)
const slaktbart = (s: State, p: Person) => DJURARTER.find(art => art.act === 'slakta' && canProcess(s, p, art));
const RENSAS = [DJUR.abborre, DJUR.gadda, DJUR.mort];
const rensaArt = (s: State, p: Person) => RENSAS.find(a => canProcess(s, p, a));
function processTask(s: State, v: Val, art: Djurart, why: string) {
  set(v, art.act, why); if (art.kniv) v.tool = 'kniv';
  v.dur = Math.min(art.maxTim * HOUR, (djurKvar(s, art) / art.timme) * HOUR + VAL.extraMin * MIN);
}
// grilla det råa på grillställningen över elden (matlagning.ts), så länge det tar
function grillVal(s: State, v: Val, why: string) { set(v, 'grilla', why); v.dur = grillTid(s); }
// hänga upp kött och fisk på torkställningen och ta ner det som torkat (matlagning.ts), så länge det tar
function torkVal(s: State, v: Val, why: string) { set(v, 'torka', why); v.dur = torkTid(s); }
// handarbete är alltid något bestämt som tar material och ger en sak (steg 2.2.4): den som har kniv slaktar viltet och
// rensar fisken, annars gör man det mest värda projekt byn saknar och man kan göra (redskap, stationer och rep, projekt.ts;
// redskap och stationer inte när kylan är en fara). Finns inget att göra sitter man med de andra vid elden
function craft(s: State, p: Person, v: Val, why: string) {
  const vilt = slaktbart(s, p);
  if (vilt) { processTask(s, v, vilt, `${why}. Slaktar viltet med kniven.`); return; }
  if (rensaArt(s, p)) { processTask(s, v, rensaArt(s, p)!, `${why}. Rensar fisken.`); return; }
  if (ageOf(p, s.now) >= ALDER.grillar && kanTorka(s, p)) { torkVal(s, v, `${why}. Torkar kött och fisk.`); return; }
  if (ageOf(p, s.now) >= ALDER.grillar && kanGrilla(s, p)) { grillVal(s, v, `${why}. Grillar maten.`); return; }
  if (gaILara(s, p, v, why)) return;
  const fara = dangers(s), fv = !fara.kyla && !fara.svalt && rnd(s, 'kunskap', p) < forsokChans(s, p, foodDays(s), woodDays(s)) ? forsokVal(s, p) : undefined;
  if (fv) { // den skicklige prövar sig fram mot en teknik på nivå 4–5 (teknik.ts, steg 4.2.1.1), när ingen fara går före och byn har ett överskott (4.2.1.2)
    set(v, 'forsok', `${why}. Prövar sig fram till ${TEK[fv.id].namn.toLowerCase()}.`);
    v.tool = fv.id; v.dur = fv.min * MIN; if (fv.spot) v.spot = fv.spot;
    return;
  }
  const pr = bastaProjekt(s, p, fara, true); // pyssel för ens egen skull: byns projekt görs under Förbättra på dagen (steg 6.1.17)
  if (pr?.u) { projektVal(v, pr.u, why); return; }
  set(v, 'samtal', 'Har inget handarbete att göra och sitter med de andra vid elden');
}
// lärlingen går till sin mästare när hen arbetar med det lärlingen ska lära sig (teknik.ts, steg 4.2.3.3)
function gaILara(s: State, p: Person, v: Val, why: string) {
  const lv = laraVal(s, p);
  if (!lv) return false;
  set(v, 'lara', `${why}. Går i lära hos ${lv.m.name}.`); v.spot = lv.spot; v.dur = lv.min * MIN;
  return true;
}
// ett pass med redskap delas inte upp (steg 2.3.8): när ett är klart och passet inte är slut gör man ett till i samma grupp,
// om byn vill ha fler och ingen fara går före. Annars väljer man något annat (steg.ts)
export function nastaRedskap(s: State, p: Person, tk: Task) {
  if (tk.pass === undefined || s.now >= tk.pass) return;
  const f = dangers(s);
  const m = projektNu(s, p, tk.act, f); // samma projekt (steg 6.2.17)
  if (!m) return;
  tk.tool = m.tool; tk.ref = undefined;
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
  if (u.sok) v.sok = true;
  if (u.ref !== undefined) v.ref = u.ref;
}

// egen lust: vila, hantverk, umgänge, promenad, bad eller att sitta vid stranden. u = hur akut byn behöver arbete
function leisure(s: State, p: Person, v: Val, u: number, lazy: number) {
  const now = s.now;
  const wv = (p.rest < VAL.vilaDag ? (1 - p.rest) * VAL.vilaVikt : 0) + lazy * VAL.vilaLat;
  const wh = (p.skill.hantverk / VAL.hantSkill + p.pot.flit / VAL.hantFlit) * (u < VAL.hantLugn ? VAL.hantLugnVikt : VAL.hantAkutVikt);
  const wsoc = (1 - p.social) * VAL.umgasVikt;
  // promenad: den nyfikne går gärna ut och ser sig omkring. Bad: när det är varmt i vattnet
  const calm = u < VAL.lugn ? 1 : VAL.lugnAkut, temp = temperature(s), shore = bathSpot(s);
  const wp = (VAL.promBas + stat(p, 'nyfikenhet', now) / VAL.promNyfiken) * calm;
  const varm = p.warm > KROPP.forVarm ? VAL.badVarm * (p.warm - 1) : 0;
  const wb = temp >= VAL.badTemp && shore && vaderTillater(s, 'torrt') ? (clamp((temp - VAL.badNoll) / VAL.badSpann, 0, VAL.badMax) + varm) * calm : 0;
  // sitta vid stranden och se ut över vattnet: lugnt, året om, mest för den som inte är så sällskaplig
  const ws = shore ? (VAL.strandBas + (20 - stat(p, 'empati', now)) / VAL.strandDiv) * calm : 0;
  if (gaILara(s, p, v, 'Har tid över')) return; // lärlingen går hellre till mästaren än vilar eller umgås
  const wsp = sportVikt(s, p, calm); // sporten när byn har ett överskott (steg 4.3.1, sport.ts)
  // bönen (steg 8.5.2): lusten följer andligheten, bredvid vilan och umgänget
  if (rnd(s, 'val', p) < bonVikt(s, p) / (bonVikt(s, p) + wv + wh + wsoc + wp + 1e-9)) {
    if (viltBikta(s, p)) { set(v, 'be', BONER.bikt.text()); v.tool = 'bikt'; v.dur = BONER.bikt.min * MIN; return; } // bikten (steg 8.6.9)
    const b = bonFritid(s, p);
    if (b) { set(v, 'be', BONER[b.id].text(s, p, b.o)); v.tool = b.id; v.spot = b.spot ?? { x: p.x, y: p.y }; v.dur = BONER[b.id].min * MIN; return; }
  }
  let r = rnd(s, 'val', p) * (wv + wh + wsoc + wp + wb + ws + wsp);
  if (r >= wv + wh + wsoc + wp + wb + ws) {
    const sp = sportVal(s, p);
    if (sp) { set(v, 'sport', sp.why); v.spot = sp.spot; v.dur = sp.dur; v.ref = sp.ref; v.tool = sp.tool; return; }
    r = (r - wv - wh - wsoc - wp - wb - ws) / wsp * (wv + wh + wsoc + wp + wb + ws); // följer ingen med: något annat på fritiden
  }
  if (r < wv) set(v, 'vila', lazy > 0.5 ? 'Har det bra och tar det lugnt' : 'Tar en paus');
  else if (r < wv + wh) craft(s, p, v, u < VAL.hantLugn ? 'Byn har det gott ställt, det finns tid för hantverk' : 'Tycker om att göra handarbete');
  else if (r < wv + wh + wsoc) set(v, 'samtal', 'Vill umgås');
  else if (r < wv + wh + wsoc + wp) {
    // nyfikna och modiga går längre bort
    const far = VAL.promNar + (stat(p, 'nyfikenhet', now) + stat(p, 'mod', now)) / 40 * VAL.promBort;
    set(v, 'promenad', far > 12 ? 'Är nyfiken och vill se vad som finns längre bort' : 'Vill sträcka på benen');
    v.spot = walkSpot(s, p, far); v.dur = (VAL.promMin + rnd(s, 'val', p) * VAL.promSpann) * MIN * VAL.pass;
  } else if (r < wv + wh + wsoc + wp + wb) { set(v, 'bada', `Det är varmt (${Math.round(temp)} grader) och skönt att bada`); v.spot = bryggSpot(s, p) ?? shore; v.dur = (VAL.badPassMin + rnd(s, 'val', p) * VAL.badPassSpann) * MIN * VAL.pass; }
  else {
    // ser ut över sjön eller tjärnen hen sitter vid, och över isen när den ligger (steg 9.2.131); skälet bär namnet till kortet (taskName)
    v.spot = bryggSpot(s, p) ?? strandSpot(s, p);
    const n = v.spot ? sjoVid(s, v.spot.x, v.spot.y) : -1, namn = n >= 0 ? sjoNamn(s, n) : 'Sjön';
    set(v, 'strand', islagt(s) ? `Ser ut över isen på ${namn.charAt(0).toLowerCase() + namn.slice(1)}` : `Ser ut över ${namn.charAt(0).toLowerCase() + namn.slice(1)}`);
    v.dur = (VAL.strandMin + rnd(s, 'val', p) * VAL.strandSpann) * MIN * VAL.pass;
  }
}

// nattens vakt: den modigaste av de vuxna som orkar, med lite slump, byts varje natt
function vaktVal(s: State, p: Person, v: Val, a: number) {
  const now = s.now;
  const guardDay = yearNo(s, now - VAL.vaktByte * HOUR); // vaktdygnet är kalenderns dygn, förskjutet så att det byts kl. 7
  if (guardDay !== s.lastGuardDay) {
    // välj nattens vakt (modigast med lite slump) bland de vuxna som orkar (den sjuka, svaga eller skadade sover), byts varje natt
    const adults = living(s).filter(q => ageOf(q, now) >= ALDER.vaktFran && ageOf(q, now) < ALDER.vaktTill && !isSick(q, now) && halsa(q) >= KROPP.svag && kanGa(q) && !vilaHellre(q) && q.task?.act !== 'strid' && !skams(q, now)); // inte den som slåss (strid.ts) eller skäms
    if (adults.length) {
      s.lastGuardDay = guardDay;
      // ett slumptal per vuxen i byns ordning, sedan den högsta (inte i sorteringens jämförelser: deras antal beror på webbläsaren)
      let g = adults[0], gk = -Infinity;
      for (const q of adults) { const k = q.pot.mod + rnd(s, 'val') * VAL.vaktSlump; if (k > gk) { gk = k; g = q; } }
      avbryt(s, g); g.guardDay = guardDay; // det vakten bar läggs ner där hen står
    }
  }
  return p.guardDay === guardDay && a >= ALDER.vaktFran && set(v, 'vakt', 'Håller vakt i natt');
}
// på natten (raden kväll i ARBETEN): man håller sig vid elden och berättar, gör handarbete, umgås eller sover
function night(s: State, p: Person, v: Val, a: number) {
  const now = s.now;
  const r = rnd(s, 'val', p);
  const story = (p.skill.berattande + (a > VAL.berattaAlder ? VAL.berattaBonus : 0)) / VAL.berattaDiv;
  const craftW = (p.skill.hantverk + stat(p, 'flit', now)) / VAL.nattHantDiv;
  // på natten håller man sig vid lägret; de modiga går lite längre ut i mörkret för att bära in saker
  const near = VAL.nattNar + stat(p, 'mod', now) / 20 * VAL.nattLangt, gt = a >= ALDER.ansvar && r < VAL.nattBara && s.stackar?.length ? haulJob(s, near) : undefined;
  if (gt) { set(v, 'bara', `Mörkt, ${near > 6 ? 'men är modig och ' : ''}${gt.why[0].toLowerCase()}${gt.why.slice(1)}`); v.spot = gt; v.dur = VAL.nattBaraTim * HOUR; }
  else if (a >= ALDER.hjalper && p.rest < VAL.nattVila) set(v, 'vila', 'Mörkt och trött efter dagen, vilar ut vid elden');
  else if (a < ALDER.hjalper) { if (r < VAL.nattBarnSamtal) set(v, 'samtal', 'Mörkt, sitter med de vuxna vid elden'); else set(v, 'sova', 'Barn sover på natten'); }
  else if (r < story) set(v, 'beratta', 'Mörkt, berättar för de andra vid elden');
  else if (r < story + craftW) craft(s, p, v, 'Mörkt, gör handarbete vid elden');
  else if (r < VAL.nattSamtal) { set(v, 'samtal', 'Mörkt, umgås vid elden'); v.dur = (VAL.nattPrat + rnd(s, 'val', p) * VAL.nattPratSpann) * MIN; } // en stund, sedan går man en bit till nästa samtal
  else set(v, 'vila', 'Mörkt, vilar vid elden');
}
