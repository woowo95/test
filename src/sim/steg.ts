import { SKATT, skattDygn, skattRegister } from './skatt';
import { ovaKrok } from './kunna';
import { varmeKrok } from './varme';
import { TIMMINNEN, timminnenIn, timminnenUt } from './timminne';
import { raknaBynVet, sparaHistorik } from './ort';
import { budgetDygn, budgetRegister } from './budget';
import { bynamnRegister } from './bynamn';
import { heligtAvstar } from './kultlatt';
import { leraGravd } from './lera';
import { myrSteg } from './myr';
import { malmGravd } from './malm';
import { mossaPlockad } from './mossa';
import { torvGravd, torvTorkar } from './torv';
import { branningKlar, branningSteg, passaKlar } from './brann';
import { jarngruvorSteg } from './gruva';
import { smidaKlar } from './jarnsaker';
import { stenBruten } from './byggsten';
import { foretagsgastSteg, foretagsgasterKommer } from './foretagsgast';
import { GASTVARD, gastVardag } from './gastvardag';
import { husKlaraTimme } from './bygg';
import { personHand } from './personlogg';
import { hamtaForst, hamtat, taMed } from './hamtning';
import { sorgTimme } from './liv';
import { lagerIStraket } from './strak';
import { lagerIHagen } from './lager';
import { angIVagen, angMark } from './slatter';
import { tamFaraSteg } from './djurflykt';
import { hoRegn } from './vattenho';
import { djurTorstSteg } from './djurtorst';
import { finhetTimme, rumPlus, rumPlusTanke, rumPlusTimme, rumVila } from './rum';
import { PLAN, planBuild, stepByggplan } from './byggplan';
import { FALLOR, FISKAR, MJARDE, mjardarOf, sattUt, sattVid, stepMjardar, valjFisk, vittja } from './fisk';
import { TILLVERKA, TILLVERKA_LIST, tillverkAv } from './tillverka';
import { addDel } from './egendom';
import { RECEPT } from './recept';
import { stepBlotVed } from './blotved';
import { stepUppvaxt, upplev } from './uppvaxt';
import { stepReligion, tecken } from './religion';
import { stepMotgang } from './motgang';
import { stepTorka } from './torka';
import { stepFlod } from './flod';
import { tornadoSteg } from './tornado';
import { fallTanke, plantaSatt, plantaUppgravd, skogFoljdTimme, vindfallen } from './skogsvard';
import { askaSteg, brandHetta, blixtTimme, brandSteg, snoSmalt, brinnerSteg, hjalpaKlar, slackaFram, slackaFylld, slackaSigKlar, slackaSteg } from './brand';
import { loggBer, stepBerattelser } from './berattelser';
import { UTBROTT_ACTS, moodOf, stepHumor, utbrottKlar } from './humor';
import { glomRykten, stepRykten } from './rykten';
import { STR, kvallForeStyret, stepStyre, styretsKvall } from './styre';
import { bildKrok, gralBlirSlagsmal, kartStridBorja, lekSteg, kartStridSteg, nastaSteg, serStriden } from './kartstrid';
import { sportKlar, sportSteg } from './sport';
import { lyssnaSteg, upptradaKlar, upptradaSteg } from './framtradande';
import { tittaSteg } from './sport';
import { harReceptVatten, redskapIHanden, taReceptVatten, tidyTools } from './agande';
import { kvEffekt } from './kvalitet';
import { SKOG, chopStock, fellTree, rotStumps, stocks, slyRojt, stubbeGravd } from './skog';
import { needLadder, noticeTheft, stole, takeMaterial, getable, ataPortion, brukTimme } from './behov';
import { iHelaForradet, laggPaRutan, stacksOf, isStored, capacity, mayTake, avbryt, backSpot, barHem, bordSlag, carryKind, fetchSpot, helaIBordan, isCarrying, load, pickUp, placeTools, sakerPaGolvet, storeLoad, tidyStore, wearStore, ownsAmount, use, put, amountOf, harTillHands, iRackhall, iBordan, bordanAv, narmasteMed, uttagVakt } from './lager';
import { FOOD, SAKER, isFood, viktOf } from './saker';
import { DJURARTER, REDSKAP, bearbeta, forstRuttnar, twineRope, wearUsed } from './redskap';
import { GOR_ACTS, finishHalf, startWork, stepPaborjat, workHalf } from './paborjat';
import { arbetaBredvid, forsokKlar, forsokSteg, haftSteg, hantSkill, stepLarlingar, thinkWhileWorking } from './teknik';
import { arbetsformaga, atSteg, foodDays, workRate } from './ekonomi';
import { FYND, fyndAt, type FyndId, type Kind, svampPlock, toppOf, TRY_SEC, flintFactor, growFynd, handFish, lagren, stoneDist, packFynd, richness, richnessDelar, richnessFor, type Lager, takeFrom } from './fynd';
import { halMin, halVal, isKost, isNiva, islagt, stepIs, halGjort } from './is';
import { blotSteg, coldOf, forVarm, stepVader, temperature, VADER, vaderGrader, vaderNu, vaxtFaktor } from './vader';
import { ELD, VED, brinnerNara, type Tand, turMal, brandTand, vidEld, tandPaRutan, addFuel, canLight, eldById, eldXY, giveBack, letaFattas, letarNu, fireWant, forageItems, fuelFor, heatAt, varmasteHard, igniterOf, stepFire, takeCoal, takeFuel, tryLight, nagonEld, plockatKvar } from './eld';
import { gastLever } from './gast';
import { ALDER, KROPP, ageOf, alive, byId, count, dodKrok, forstaGang, gjort, isSick, living, log, ovning, stat } from './folk';
import { missnojeDod } from './rost';
import { BIN, binDod, binSteg, djurStickSteg, retadeSteg, skattaKlar } from './bin';
import { SJUK, SJUKDOMAR, SJUK_DOD, forkylning, insjukna, sjukSteg, smittaTimme, smittaUtifranTimme, svartSjukNu } from './sjukdom';
import { eldPlats, getMap } from './karta';
import { ELDFLYTT, flyttaElden, stepEldFlytt } from './eldflytt';
import { giftSteg } from './giftermal';
import { DODSORSAKER, barnMat, birth, birthWish, die, framlingSteg, regulate } from './liv';
import { MARK, groundOf, growGround, markslag, packGround, tileOf } from './mark';
import { bynsMitt } from './omrade';
import { SAMTAL, TalkEvent, converse, horHar, kanPrata, skiljsAt } from './samtal';
import { HABIT_FADE, addHabit, stepSeder, updateTags } from './seder';
import { skrivVanor } from './vanor';
import { RELT, stepRelationer } from './relationer';
import { MINNE, turKrok, areaOf, fearPlace, forget, lookAround, observe, plockad, radslaVid, sees, sightOf, trorOm } from './minne';
import { PLATS } from './plats';
import { chance, clamp, hash3, r3, rnd } from './slump';
import { VAR, ageIndex, hourOf, isLight } from './tid';
import { ACTS, toolRow } from './handlingar';
import { kunnaVikt } from './kunna';
import { AGES_BORJAR, Act, DAY, HOUR, HOUR_S, MIN, Fire, Person, SEC, SKILL_NAMES, State, Task, W, H, useMap, kartAv, Historik, simulera, T, inMap, GRANNAR4 } from './typer';
import { FOREST, findPath, wear } from './vag';
import { barKropp, gangVakt, kroppFart, rutFart, smidig, snoFart } from './gang';
import { facklorTimme, finishLjus, finishUppsatt, morkFart, morkHumor } from './ljus';
import { VAL, arbetsTimme, chooseTask, tomtFor, eldOrd, farligaBehov, nastaRedskap, spotFor } from './val';
import { FAGEL, djurSteg, viltSteg } from './djur';
import { vargSteg, vargjaktSteg } from './varg';
import { bjornSteg, bjornjaktSteg } from './bjorn';
import { resaSteg, resaBehov, ridBredvid } from './resa';
import { rovarPrat, rovarSteg, rovarTornado, rovarFlockar } from './rovare';
import { skrivHuvudRad } from './radtal';
import { varldSteg } from './varldslag';
import { projektSaknarRakna } from './projekt';
import { handelSteg, handlarVantarTimme, handlaKlar, handelsMalRakna, handelsTill, handlarPlats, handlarTornado, pratMedHandlare } from './handel';
import { vaktSteg } from './vakt';
import { JAKT, jaktBar, jaktFallt, jaktForsok, jaktKlar } from './jakt';
import { bristSteg, frysFaktor, naringSjunker, skorbjugg, trottFaktor } from './naring';
import { stepByggnader } from './byggnader';
import { BYN, sumOf } from './egendom';
import { vaggRensa, husKlart, avail, takeForHouse, bitFri, buildJob, finishDorr, needOf, noteKom, siteOf, wearBuild, workOn } from './bygg';
import { Bit, bitAt, bitsOf, husById, MATERIAL, bitById, blocked, freeNear, gridOf, roomAt, roofed, shelterOf } from './byggnad';
import { histParts, historikSteg, joinHist } from './historik';
import { migrate } from './varld';
import { besokSteg } from './vacktgast';
import { stepDelning } from './delning';
import { omtankeTimme } from './omtanke';
import { lonOmtanke, lonRegister } from './lon';
import { lonDygn, lonRakna } from './dagsarbete';
import { foretagDygn, foretagTimme } from './foretag';
import { foretagMarknad } from './stangning';
import { marknadDygn, marknadKlar } from './marknad';
import { bytHosKlar, samlaTimme } from './kopbuffert';
import { finishOdla, froFynd, stepOdling, workOdla } from './odling';
import { balans } from './balans';
import { grilla, torka } from './matlagning';
import { stepBrasor } from './brasor';
import { iVattnetNu, sjoRakna, vattenNu } from './sjo';
import { FANG, brytKlar, fangEldBrinner, fangelseKrok, matFram, matTagen, stoppaFram, stoppaVal } from './fangelse';
import { akel, latrinUpptagen, latrinerVaxerIgen, regnetTvattar, smutsigtPlock, smutsMatTimme, toaBesok, toaNara } from './smuts';
import { iselenSteg, seleMed } from './barsele';
import { DRICKA_ACTS, TORST, dryckKrok, drick, torstig, torstSteg, vattenFram, vattenFylld } from './torst';
import { kvarTimme } from './kvarlevor';
import { lasKlar, runstenBorja, runstenKlar, runstenTimme, skrivKlar } from './skrift';
import { fangeOde } from './fangeval';
import { avrustaKlar, gravDygn, gravKlar, gravaMedan, gravbesokKlar, gravvardBorja, gravvardKlar, kroppUpp } from './grav';
import { bonKlar, farorNu, kultTimme, tvivelTimme } from './kult';
import { KYRKA_TIMME, andligTimme, kyrkaDygn, kyrkaRegister, kyrkaTimme, satBudHandelse, satOffrad } from './kyrka';
import { lagRegister } from './lagar';
import { raddDygn, raddRegister } from './radsla';
import { LARM, handelse, larma } from './rykten';
import { tal, horsel, barMed, binStick, burenSteg, halsa, halsaSteg, hemma, lakerFullt, lamnaAv, vardKlar, vardMal } from './halsa';
import { bordPlats, fullBorda, rymsTurMer, kladVarme, klaAvKlar, klaPaKlar, rustaKlar, ryggKorg, ryms, slitRygg, stepKlader } from './utrustning';
import { dragdjurBredvid, fartI, fordonI, rymsI } from './fordon';
import { KLADER, NAKEN_PLATS, PLAGG, kladAv } from './klader';
import { allaTing, type Ting } from './agande';
import { och } from './ord';
import { stepPynt } from './pynt';
import { glomByten, stadaByten } from './byte';
import { stationById, stationFlyttTimme, stationFor, kvVid, slitRedskapVid, stationFlytta, finishStation, finishTillbehor, stationAt, stationRutor, stepStationer, tillbehorVarme, tillbehorVila, workStation, vidBordet } from './stationer';
import { forbrukTimme, forradAv, materialTak, underBuffert, villHaAv, ostKrok } from './forradsmal';
import { notis } from './notiser';
import { stepKrukor } from './kruka';
import { ar_vatska, fyllLampa, fyllVatska, karSomBlirLedig, ledigFor, taVatskaFran, teFaktor, vatskaAv, type VatskaId } from './vatskor';
import { rullaKvalitet } from './kvalitet';
import { protesTimme } from './protes';
import { halsoNotiser } from './halsonotiser';
import { kost, kostStart } from './kostnad';
import { KLOCKA } from './klocka';
import { borjaForlossning } from './forlossning';

// Simuleringen går i slag om KLOCKA.slag sekunder (BEAT, kortare vid fara och längre när alla sover), i spelet och vid ikappräkning likadant. Inom ett slag går tiden åt
// till det som händer i tur och ordning (taskStep). Arbetet görs i bitar om högst BIT sekunder, och man bär aldrig mer
// än som ryms i de fria händerna (fullBorda i utrustning.ts, steg 6.1.8). STEG.markNot = hur mycket ett steg nöter marken (MARK.nott per ruta)
export const BEAT = KLOCKA.slag;
const BIT = 60;
// Balanstalen (regel 8). Kroppens gränser och takter (KROPP) och åldrarna (ALDER) står i folk.ts, eftersom val.ts och behov.ts läser dem
const STEG = balans('steg', {
  // lärandet och arbetet (steg 12.1.107)
  larNyfiken: 0.1, // seden Nyfikenhet (-1 till 1) höjer lärandet så här mycket
  mastare: 16, // färdigheten där man blir mästare
  kvarMin: 2, // minuter: en uppgift med mindre tid kvar än så går man inte tillbaka till (och den sparas inte)
  // att nöta marken (hur fort man går står i GANG, gang.ts)
  markNot: 0.03, // hur mycket ett steg nöter marken (MARK.nott per ruta)
  vandraNot: 0.08, // ... och när man rör sig på platsen (gånger vandra.v i handlingens rad och tiden)
  rundaRutor: 40, // så många rutor högst i en bit av rundan där man går förbi rutorna där inget är klart (rundaSteg, steg 6.1.3)
  // graviditet
  dragtid: 0.75, // dygn som en graviditet varar
  mellanFodslar: 1.6, // dygn som en kvinna väntar efter en födsel innan hon kan bli gravid igen
  matDygn: 1.1, // (1,8 före steg 3.10.26: förrådets dygn räknar sedan 3.10.9 bara den mat som håller och blev ungefär 0,6 av förut) så många dygns mat i förrådet ger full vilja att skaffa barn (mindre ger mindre) ...
  matMin: 0.15, // ... men aldrig mindre än denna del
  sedBarn: 0.2, // så mycket mer (eller mindre) vilja ger seden Barn fullt ut
  chans: 0.6, // chansen per dygn att bli gravid, gånger viljan (0,3 före steg 2.12.6: byarna stannade vid ca 9 invånare med gott om mat)
  // samtal och relationer
  samtalTal: 0.3, samtalHorsel: 0.3, samtalSek: 240, samtalBas: 0.6, samtalEmpati: 25, // den som är i en social aktivitet samtalar en gång per samtalSek sekunder, gånger samtalBas + empati / samtalEmpati
  blekSek: 600, blek: 0.04, // relationerna bleknar ungefär var blekSek:e sekund, med blek per dygn
  // lärande och minne
  ovningHant: 0.1, // övning i hantverk per timme med hantverk
  ovningArbete: 0.12, ovningBas: 0.4, // övning i arbetet per timme: ovningArbete × (ovningBas + intelligens / 20)
  minneSek: 1800, // den som arbetar ser sig omkring och minns området ungefär så här ofta (sekunder)
  svaltTanke: 7200, // tanken Svälter kommer ungefär så här ofta (sekunder)
});
ovaKrok.ova = (s, p, sk, tim) => ovning(p, sk, tim * STEG.ovningArbete * (STEG.ovningBas + stat(p, 'intelligens', s.now) / 20)); // övningen per arbetad tid (kunna.ts, steg 15.1.145)

// spelet ritar folk där de är medan slaget visas: var och ens väg under det senaste slaget, som
// [tid, x, y, tid, x, y, ...]. Bara för att visa; simuleringen läser det aldrig. Uppgiften sparas också med tiden varje
// gång den eller dess fas byts (u, steg 4.5.6.5), så att det som visar vad någon gör (Gör just nu, raden överst på kartan,
// symbolen över huvudet, listan över invånare) frågar vad hen gör vid tiden som visas (uppgiftVid i ui/lage.ts).
// Också när bördan växer med en hel sak (steg 6.1.1), så att fliken Utrustning, texten och porträttet visar det man bär
// vid tiden som visas, som kartan
export const spar = { pa: false, v: new WeakMap<Person, number[]>(), u: new WeakMap<Person, [number, Task | undefined][]>() };
const uppgiftNyckel = (t?: Task) => t ? `${t.act}|${t.phase}|${t.tool ?? ''}|${t.hopp ? 1 : 0}|${Math.floor(t.carry + 1e-9)}|${Object.values(t.items ?? {}).reduce((a, n) => a + Math.floor(n + 1e-9), 0)}|${t.jf ? 1 : 0}|${t.leta ?? ''}|${t.sok ? 1 : 0}` : '';
const kopia = (t?: Task): Task | undefined => t && { ...t, path: undefined, items: t.items && { ...t.items } };
function sparaUppgift(p: Person, t: number) {
  const u = spar.u.get(p);
  if (!u) return;
  const sist = u[u.length - 1]?.[1];
  if (uppgiftNyckel(sist) === uppgiftNyckel(p.task)) return;
  u.push([t, kopia(p.task)]);
  const v = spar.v.get(p); // platsen när uppgiften byts, så att bilden inte börjar gå förrän hen går (den som äter sitter kvar tills måltiden är slut)
  if (v && v[v.length - 3] < t) v.push(t, p.x, p.y);
}
// var p syns vid tiden t under slaget (vägen i spar.v, rakt mellan de sparade punkterna), och om hen står still där.
// undefined när inget sparats eller t är efter slaget. Bara för att visa (ui/manniskor.ts och scenariot gorjustnu)
export function sparPlats(p: Person, t: number) {
  const v = spar.v.get(p);
  if (!v || v.length < 6 || t >= v[v.length - 3]) return undefined;
  let i = 0;
  while (i + 3 < v.length - 3 && v[i + 3] <= t) i += 3;
  const t0 = v[i], t1 = v[i + 3], f = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 1;
  return { x: v[i + 1] + (v[i + 4] - v[i + 1]) * f, y: v[i + 2] + (v[i + 5] - v[i + 2]) * f, still: v[i + 1] === v[i + 4] && v[i + 2] === v[i + 5] };
}
// om p förflyttar sig vid tiden t (steg 12.1.13): spåret går där mellan två olika punkter. Samma spår som stegen och stigarna, och
// den enda källan för om någon går i bilden; svängningen som bara finns i bilden räknas aldrig som rörelse
export function forflyttar(p: Person, t: number) { const sp = sparPlats(p, t); return !!sp && !sp.still; }
// vad p gör vid tiden t under slaget som slutar vid nu (spar.u); före slagets början, efter det eller när inget sparats: uppgiften nu
export function sparUppgift(p: Person, t: number, nu: number): Task | undefined {
  const u = spar.u.get(p);
  if (!u?.length || t >= nu) return p.task;
  let i = 0;
  while (i + 1 < u.length && u[i + 1][0] <= t) i++;
  return u[i][1];
}
function spara(s: State, p: Person, t = s.now) { if (spar.pa) { spar.v.get(p)?.push(t, p.x, p.y); sparaUppgift(p, t); } }
bildKrok.spara = (s, p, t) => spara(s, p, t ?? s.now); // den som flyttas av striden på kartan (kartstrid.ts), vid tiden för stridssteget

type Krok = (s: State, p: Person, t: Task, dtSec: number) => void;
// det som händer medan man gör något (efter att ha kommit fram). Arbete för byn sköts av workStep
const MEDAN: Partial<Record<Act, Krok>> = {
  // i latrinen, annars blir det en fläck (smuts.ts). Latrinen används av en i taget (steg 10.2.79): står någon annan där väntar
  // man bredvid och arbetet blir längre
  toa: (s, p, t, dt) => {
    if (t.prog === undefined) { const l = stationById(s, t.ref); if (l && latrinUpptagen(s, l, p)) { t.until += dt * SEC; return; } } // väntan räknas inte (steg 13.8.17): byn vill ha latriner efter antalet
    p.toa = 1; if (t.prog === undefined) { t.prog = 0; toaBesok(s, p, t.ref); }
  },
  kol: (s, p, t) => { const e = eldById(s, t.ref); if (e) takeCoal(s, p, 'hämtade', e); },
  bygga: (s, p, t, dtSec) => buildStep(s, p, t, dtSec),
  runsten: (s, p, t) => runstenBorja(s, p, t), // stenarna tas när ristningen börjar (steg 10.6.1)
  gravvard: (s, p, t) => gravvardBorja(s, p, t), // materialet tas när arbetet börjar (steg 10.4.2)
  tvinna: (s, p, _t, dtSec) => twineRope(s, p, dtSec / HOUR_S, villHaAv(s, 'rep') + handelsTill(s, 'rep')), // till bufferten plus handelsmålet (steg 10.5.13)
  tanda: (s, p, t, dtSec) => {
    const f = eldById(s, t.ref); // lägerelden eller en lägereld till (task.ref, brasor.ts)
    if (!f) { p.task = undefined; return; }
    if (t.brand || !canLight(s, p, f)) return; // med en brand tänds elden när hen kommer fram (steg 10.6.12)
    f.tryProg += dtSec;
    const per = igniterOf(s, p)!.minutes * 60;
    while (f.tryProg >= per && canLight(s, p, f) && !f.lit) { f.tryProg -= per; if (tryLight(s, p, f)) { t.until = s.now; break; } } // det som blev över bärs tillbaka
  },
};
// det som händer när en handling är klar
const KLAR: Partial<Record<Act, Krok>> = {
  rojaSly: (s, _p, t) => slyRojt(s, t.tx, t.ty), // steg 13.8.16
  falla: (s, p, t) => { // trädet faller och blir en stam, som huggs till ved
    if (!t.tool) return; // utan yxa står trädet kvar halvfällt, och nästa fällare gör resten
    fallTanke(s, p, tileOf(t.tx, t.ty)); // långt från byn tänker man på skogsvården (skogsvard.ts, steg 6.5.2)
    const k = fellTree(s, p, t.tx, t.ty);
    if (k) wearUsed(s, p, 1); // yxan slits för varje träd som faller (steg 2.3.12), också för trä som huggs ur det sedan
  },
  promenad: (s, p, t) => { lookAround(s, p, t.tx, t.ty); tanke(p, 'promenad', s.now); },
  bada: (s, p, t) => { sjoRakna(s, t.tx, t.ty, 'bad', p); p.warm = p.warm > 1 ? Math.max(1, p.warm - KROPP.badSvalka) : Math.max(KROPP.badMin, p.warm - KROPP.badKyla); tanke(p, 'bada', s.now); },
  strand: (s, p) => { p.rest = Math.min(1, p.rest + KROPP.strandVila); tanke(p, 'strand', s.now); },
  varda: vardKlar, // såren trycks på, förband läggs, infekterade sår rengörs, och den som inte kan gå bärs hem (halsa.ts)
  vatten: vattenFylld, // vattensäcken är fylld och bärs till den som inte kan gå (torst.ts)
  avrusta: avrustaKlar, rusta: rustaKlar, klaPa: klaPaKlar, klaAv: klaAvKlar,
  be: (s, p, t) => bonKlar(s, p, t), begrava: kroppUpp, grava: gravKlar, gravvard: gravvardKlar, gravbesok: gravbesokKlar, runsten: runstenKlar, skriva: (s, p) => skrivKlar(s, p), lasa: lasKlar, // skriva och läsa (steg 10.6.5) // tron och graven (system 8.5)
  flyttaeld: (s, p) => flyttaElden(s, p), // elden står på en ny plats (eldflytt.ts)
  rymma: (s, p, t) => brytKlar(s, p, t.ref), // fångens dörr är sönder (fangelse.ts, steg 11.12.1)
  barmat: matTagen, // maten till fången är tagen ur förrådet och bärs dit (fangelse.ts, steg 11.12.2)
};
// den vakna som står närmast hör slagen och ropar (steg 11.12.5); den som vill stoppa fången väljer på nytt
fangelseKrok.larma = (s, p) => { const r = living(s).filter(q => q !== p && !q.fange && q.task?.act !== 'sova' && Math.hypot(q.x - p.x, q.y - p.y) <= LARM.hor).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; if (r) for (const q of [r, ...larma(s, 'rymning', 1, [r])]) if (q.task && stoppaVal(s, q) && !ACTS[q.task.act].vapen) { avbryt(s, q); q.task = undefined; } }; // den som vill stoppa fången väljer på nytt (steg 11.12.5)
fangelseKrok.slass = (s, vakter, q) => { kartStridBorja(s, 'slagsmal', [vakter, [q]], 'vid fängelsets dörr'); };
fangelseKrok.brott = (s, p) => { handelse(s, p, 'rymning'); };
fangelseKrok.brinner = (s, x, y) => brandHetta(s, x, y) > 0;
// maten till fången (steg 11.12.2): den närmaste stacken med mat, en hel portion av det som finns (hela resurser), och måltiden
fangelseKrok.matStack = (s, p, ved) => { let b: { x: number; y: number } | undefined, bd = Infinity; for (const a of stacksOf(s)) if ((ved ? a.k === 'ved' : isFood(a.k)) && a.n >= 1 && isStored(s, a.x, a.y)) { const d = Math.hypot(a.x + 0.5 - p.x, a.y + 0.5 - p.y); if (d < bd) { bd = d; b = { x: a.x + 0.5, y: a.y + 0.5 }; } } return b; };
fangelseKrok.taMat = (s, p, ved) => { const k = ved ? (amountOf(s, 'ved') >= 1 ? 'ved' : undefined) : FOOD.find(f => amountOf(s, f) >= 1); if (!k) return undefined; use(s, p, k, 1, true); return k; };
fangelseKrok.ata = (s, q, k) => ataPortion(s, q, k);
fangelseKrok.upplev = (s, p, om, ggr) => upplev(s, p, 'fangelse', om, ggr); // tiden inne (steg 11.12.4)
for (const a of UTBROTT_ACTS) KLAR[a] = utbrottKlar; // efter ett utbrott (humor.ts, steg 3.2.2)
MEDAN.iselen = iselenSteg; // barnet i bärselen (steg 13.2.3)
MEDAN.buren = burenSteg; // den som bärs hem väntar så länge någon bär hen
// att dricka (torst.ts): en gång när man kommit fram, och törsten hålls släckt så länge man dricker
for (const act of DRICKA_ACTS) MEDAN[act] = (s, p, t) => { if (t.prog === undefined) { t.prog = 0; drick(s, p, t); } else p.torst = 1; };
// snön i krukan (steg 10.2.50): man väntar vid elden medan den smälter och dricker när den smält, när arbetet är klart
MEDAN.smalta = () => undefined;
KLAR.smalta = (s, p, t) => drick(s, p, t);
// slakt och rensning: den första arten med arbetet som finns i förrådet (kaninen före vargen, steg 3.7.14)
// mjärden är klar: materialet tas, och den sätts ut på närmaste strand (steg 7.4.2)
for (const k of Object.keys(FALLOR)) KLAR[k as Act] = (s, p, t) => {
  for (const [q, n] of Object.entries((RECEPT as Record<string, { av?: Record<string, number> }>)[k].av!)) takeMaterial(s, p, q, n);
  // fångstgropen (steg 10.2.84) grävdes där den ska ligga; mjärden och snaran görs vid fångstbänken och sätts ut
  if (FALLOR[k].gravs) { const x = Math.floor(t.tx), y = Math.floor(t.ty); if (!mjardarOf(s).some(m => m.x === x && m.y === y)) sattVid(s, p, k, x, y); } else sattUt(s, p, k);
};
lagRegister(); raddRegister(); skattRegister(); budgetRegister(); bynamnRegister(); lonRegister(); kyrkaRegister(); satOffrad((s, p) => die(s, p, 'offrad'));
satBudHandelse((s, p) => handelse(s, p, 'budbrott'));
export const KLAR_FOR = KLAR; // scenarierna prövar det som händer när ett arbete är klart
// det som görs vid en station är klart: materialet tas och saken läggs i förrådet, och är hens som gjorde den (tillverka.ts)
for (const k of TILLVERKA_LIST) { const d = TILLVERKA[k]; KLAR[d.act] = (s, p) => {
  const av = tillverkAv(d, q => getable(s, p, q)); // svampen eller kålen (steg 10.7.24)
  if (!av) return;
  for (const [q, n] of Object.entries(av)) { if (getable(s, p, q) < n) return; }
  if (d.vatten && !harReceptVatten(s)) return; // vattnet är borta: inget blir gjort, och materialet ligger kvar
  if (d.eld && !stationFor(s, d.act) && !nagonEld(s)) return; /* vilken eld som helst (steg 12.1.55) */ // teet kokas vid en eld som brinner om byn inte har örtköket (steg 9.5.8)
  const vk = d.vatska as { v: VatskaId; n: number } | undefined;
  if (vk && vatskaAv(s, vk.v) < vk.n) return; // mjölken till osten (steg 12.4.7)
  const kar = ar_vatska(d.ger) ? ledigFor(s, d.ger) : d.kruka ? karSomBlirLedig(s, d.kruka, vk?.v, vk?.n) : undefined;
  if ((ar_vatska(d.ger) || d.kruka) && !kar) return; // ingen ledig behållare som passar (steg 9.4.14): inget blir gjort
  if (vk) taVatskaFran(s, vk.v, vk.n, kar); // ur krukan där det ska sjuda först, så att den blir ledig
  if (d.vatten) taReceptVatten(s); // vattnet tas ur behållaren, som finns kvar (steg 7.6.6, 12.1.251)
  // bara det redskap som används slits (steg 12.1.252): det i handen, annars det som ligger vid stationen (sågen vid
  // klyvplatsen för varje planka, steg 12.5.1, och sländan i vävstolen för varje tråd)
  if (p.task?.tool && d.verktyg) wearUsed(s, p, 1); else slitRedskapVid(s, d.act, d.n, p);
  const ag: Record<string, number> = {};
  for (const [q, n] of Object.entries(av)) addDel(ag, takeMaterial(s, p, q, n), 1);
  if (kar && (d.sjud || d.syr)) { kar.kok = { r: d.ger, n: d.n, kvar: d.syr ? SYRA.dygn * DAY : d.sjud! * MIN, ...(d.syr ? { syr: 1 as const } : {}), ag: Object.keys(ag).length ? ag : { [p.id]: 1 }, ...(ar_vatska(d.ger) ? { vatska: 1 as const } : {}), q: rullaKvalitet(s, p, kvVid(s, p, d.act)) }; count(s, 'sjuder_' + d.ger); } // osten blir en sak i förrådet när den sjudit (steg 12.4.7) // buljongen sjuder i krukan på elden (stepKok)
  else if (kar && ar_vatska(d.ger)) { fyllVatska(s, d.ger, d.n, kar)!.inne!.q = rullaKvalitet(s, p, kvVid(s, p, d.act), ACTS[d.act]?.fardighet, kunnaVikt(d.act, d.ger)); } else put(s, d.ger, d.n, { [p.id]: d.n }); // tjäran, salvan, limmet och teet i sin behållare, med kvalitet (steg 9.5.8)
  if (forstaGang(s, 'gjort_' + d.ger)) log(s, d.forsta.replace('{namn}', p.name), 'world', [p.id]);
}; }
MEDAN.vittja = (s, p, t) => { const m = mjardarOf(s).find(q => q.id === t.ref); if (m) vittja(s, p, m); t.until = s.now; };
// det heliga djuret slaktas inte, utom i svält (steg 10.3.15): finns bara det kvar är arbetet slut
for (const art of DJURARTER) MEDAN[art.act] ??= (s, p, _t, dtSec) => {
  const svalt = farorNu(s).svalt, a = forstRuttnar(s, DJURARTER.filter(q => q.act === art.act && harTillHands(s, p, q.sak) > 1e-9 && !heligtAvstar(s, p, q.art, svalt))); // det hen har till hands (steg 11.1.74)
  if (!a) { if (p.task) p.task.until = s.now; return; }
  bearbeta(s, p, a, dtSec / HOUR_S);
};
MEDAN.grilla = (s, p, _t, dtSec) => grilla(s, p, dtSec / HOUR_S); // grillen över elden (matlagning.ts)
KLAR.koka_mat = (s, p) => kokaKlar(s, p); KLAR.gropa = (s, p, t) => gropKlar(s, p, t.ref); // kokgropen (steg 10.7.28)
KLAR.sopor = (s, p) => soporKlar(s, p);
KLAR.mata = (s, p, t) => mataKlar(s, p, t.ref); // de tama djuren (tamdjur.ts, steg 9.8.1)
KLAR.hage = (s, p, t) => hageKlar(s, p, t.ref); // hagen (steg 9.8.4), eller att märka ut den (ref −1, steg 10.2.36)
KLAR.ang = (s, p) => angKlar(s, p); // slåtterängen märks ut (steg 10.2.36)
KLAR.valla = (s, p, t) => vallaKlar(s, p, t.ref);
KLAR.klippa = (s, p, t) => { klippKlar(s, p, t.ref); wearUsed(s, p, 1); }; // ullsaxen slits för varje får (steg 12.5.2)
KLAR.tatuera = (s, p, t) => tatKlar(s, p, t.ref);
KLAR.farga = fargaKlar; // färgbadet (farg.ts, steg 13.3.2)
MEDAN.bytHos = (s, p, t) => { if (!t.bytt) { t.bytt = true; iHelaForradet(() => bytHosKlar(s, p, t)); } }; // köpet hos grannen (kopbuffert.ts, steg 14.1.15) prövas när man kommit fram (steg 15.1.20)
KLAR.marknad = marknadKlar; // marknaden (marknad.ts, steg 14.1.14)
KLAR.stallaFram = stallaKlar; KLAR.koaDisk = koaKlar; KLAR.betjana = betjanaKlar; // kassan (kassa.ts, steg 14.1.6)
KLAR.stada = stadaKlar; // städningen (stada.ts, steg 14.1.2)
KLAR.tjara = tjaraKlar; // tjäran (tjara.ts, steg 13.5.1)
KLAR.mjolka = (s, p, t) => mjolkaKlar(s, p, t.ref);
KLAR.skatta = (s, p, t) => skattaKlar(s, p, t.ref); // bikupan (bin.ts, steg 10.10.20)
KLAR.ortPlocka = (s, p, t) => ortPlockaKlar(s, p, t.ref); // örtkrukan (kruka.ts, steg 10.10.11)
KLAR.ortSatta = (s, p, t) => ortSattaKlar(s, p, t.ref);
KLAR.krukaHem = krukaUpp; // lerkrukan tas upp och bärs till sovrummet (kruka.ts, steg 10.11.17)
KLAR.slatter = (s, p, t) => slaKlar(s, p, t.ref);
KLAR.hamla = (s, p, t) => hamlaKlar(s, p, t.ref);
KLAR.avliva = (s, p, t) => avlivaKlar(s, p, t.ref);
KLAR.tomma_latrin = (s, p) => latrinTomKlar(s, p);
KLAR.staket = (s, p, t) => staketKlar(s, p, t.ref);
KLAR.skramma = (s, p, t) => skrammaKlar(s, p, t.ref); // fågelskrämman (odling.ts, steg 9.7.11) // staketet (odling.ts, steg 9.7.10) // sophögen (rester.ts, steg 9.7.5)
KLAR.steka = (s, p) => stekaKlar(s, p);
KLAR.baka = (s, p) => bakaKlar(s, p); // bakugnen (matlagning.ts, steg 9.6.23) // stekhällen (matlagning.ts, steg 9.6.21)
KLAR.malta = (s, p, t) => maltaKlar(s, p, t.ref); KLAR.brygga = (s, p, t) => bryggKlar(s, p, t.ref); KLAR.tappa = (s, p, t) => bryggKlar(s, p, t.ref); KLAR.branna = (s, p, t) => brannKlar(s, p, t.ref); // bryggkaret (brygg.ts, steg 9.6.12) // rätten ställs på elden i lerkrukan (matlagning.ts, steg 9.6.3)
MEDAN.torka = (s, p, _t, dtSec) => torka(s, p, dtSec / HOUR_S); // torkställningen (matlagning.ts)
MEDAN.roka = (s, p, _t, dtSec) => torka(s, p, dtSec / HOUR_S, 'rokeri'); // rökeriet (matlagning.ts, steg 9.6.8)
// redskap som görs och träd som fälls: arbetet sparas om det avbryts (paborjat.ts)
for (const a of GOR_ACTS) { MEDAN[a] = workHalf; KLAR[a] = (s, p, t) => { if (finishHalf(s, p, t)) nastaRedskap(s, p, t); }; } // och ett till i samma pass (val.ts)
MEDAN.falla = workHalf;
MEDAN.grava = gravaMedan; // gropen finns kvar om grävaren avbryts (grav.ts)
MEDAN.resa = (s, p, t) => { if (!hamtaForst(s, p, t)) resaSteg(s, p, t); }; // (den som står vid samlingsplatsen när packningen börjar hämtar sin del först, steg 12.1.8) // resenären vid samlingsplatsen och vid kanten (resa.ts, steg 11.5.5)
MEDAN.bjornjakt = (s, p, t) => bjornjaktSteg(s, p, t); // jägarna går mot björnen och anfaller den (bjorn.ts, steg 6.6.6)
MEDAN.vargjakt = (s, p, t) => vargjaktSteg(s, p, t); // jägarna anfaller flocken (varg.ts, steg 3.7.1)
MEDAN.vakt = (s, p, t) => vaktSteg(s, p, t); // vakten går runt byn (vakt.ts, steg 3.7.4)
MEDAN.leka = (s, p, _t, dtSec) => lekSteg(s, p, dtSec); // kastlek och brottning (strid.ts, steg 3.7.2)
MEDAN.sport = sportSteg; KLAR.sport = sportKlar; // sporten (sport.ts, steg 4.3.1)
KLAR.handla = (s, p, t) => iHelaForradet(() => handlaKlar(s, p, t)); // byns handel med handlaren (handel.ts, steg 4.4.1.3): affären hämtar själv varorna från högarna och förrådet till filten (fasen hamta)
MEDAN.upptrada = upptradaSteg; KLAR.upptrada = upptradaKlar; MEDAN.lyssna = lyssnaSteg; MEDAN.titta = tittaSteg; // framträdandena (framtradande.ts, steg 4.3.2)
MEDAN.station = workStation; KLAR.station = finishStation; // en station som byggs (stationer.ts)
KLAR.tillbehor = finishTillbehor; // ett tillbehör till en möbel (stationer.ts)
KLAR.dorr = finishDorr; // en dörr i en öppning (bygg.ts)
KLAR.uppsatt = (s, p, t) => finishUppsatt(s, p, t);
KLAR.flyttStation = s => { stationFlytta(s); }; // en station ute närmare dem som använder den (stationer.ts, steg 9.4.8)
KLAR.bryta = (s, p, t) => { stenBruten(s, p, t); wearUsed(s, p, 1); }; // byggstenen läggs i en hög vid berget (byggsten.ts, steg 10.10.5), och järnhackan slits för varje sten (steg 12.5.4)
KLAR.lera = leraGravd; // leran läggs i en hög där den grävdes (lera.ts, steg 9.4.10)
KLAR.plockaMossa = mossaPlockad; // mossan läggs i en hög där den plockades (mossa.ts, steg 12.1.6)
KLAR.malm = malmGravd; // malmen läggs i en hög där den grävdes (malm.ts, steg 12.1.2)
KLAR.torv = torvGravd; // den blöta torven läggs i en hög där den grävdes (torv.ts, steg 12.1.3)
KLAR.kola = branningKlar; KLAR.blasa = branningKlar; // milan laddas och tänds, eller töms (brann.ts, steg 12.2.1)
KLAR.passa = passaKlar; // tillsynen vid en bränning (brann.ts, steg 12.2.2)
KLAR.smida = smidaKlar; // ett järnredskap är smitt (jarnsaker.ts, steg 12.2.6)
KLAR.stubbe = stubbeGravd; // stubben är bortgrävd och blir lite trä (skog.ts, steg 6.5.7)
KLAR.plantera = plantaUppgravd; // plantan är uppgrävd och bärs till platsen (skogsvard.ts, steg 6.5.2)
KLAR.satta = sattaKlar; // pallen eller stolen ställs vid bordet (mobler.ts, steg 12.4.4)
KLAR.fyll_lampa = fyllLampa; // oljelampan fylls med brännolja (ljus.ts, steg 12.4.2)
KLAR.ljus = (s, p, t) => finishLjus(s, p, t); // ett talgljus på ett bord eller en hylla (ljus.ts, steg 6.3.8) // en uppsatt fackla (ljus.ts, steg 6.3.7)
MEDAN.forsok = forsokSteg; KLAR.forsok = forsokKlar; // försöken mot en teknik på nivå 4–5 (teknik.ts, steg 4.2.1.1)
MEDAN.odla = workOdla; KLAR.odla = finishOdla; // fälten (odling.ts)
MEDAN.slacka = slackaSteg; KLAR.slacka = slackaFylld; // att släcka en eldsvåda med händerna eller vattensäcken (brand.ts)
KLAR.slackaSig = slackaSigKlar; KLAR.hjalpaBrinnande = hjalpaKlar; // den som brinner (brand.ts, steg 6.4.16)
// de som bär till någon eller till elden, inte hem till förrådet: vad som görs framme, och att de inte lägger ner bördan när vägen är stängd (walk)
const LAMNA: Partial<Record<Act, (s: State, p: Person, tk: Task) => void>> = {
  varda: lamnaAv, // hemma med den som bars (halsa.ts)
  vatten: vattenFram, // vattnet i säcken till den som inte kan gå (torst.ts)
  barmat: matFram, // maten till fången (fangelse.ts, steg 11.12.2)
  stoppa: stoppaFram, // framme vid fängelsets dörr när fången slår på den (fangelse.ts, steg 11.12.5)
  slacka: slackaFram, // vattnet i säcken på elden (brand.ts)
  plantera: plantaSatt, // plantan sätts i jorden (skogsvard.ts)
  krukaHem: krukaNer, // lerkrukan ställs i sovrummet (kruka.ts)
};

// ---------- huvudsteg ----------
// tiden i spelet går i slag (steg 10.2.14, "Klockan och slagen" i fliken Läget): hela byn stegas tillsammans, KLOCKA.slag
// sekunder i taget (kortare när faran är nära, längre när ingen kan nå någon annan: nastaSteg i kartstrid.ts). step(s, dtSec)
// lägger dtSec till tiden som ska räknas (s.skuld) och tar så många hela slag som ryms; det som blir över räknas i nästa anrop.
// Ett slag delas aldrig, så att byn blir densamma hur tiden än delas upp: spelet, ikappräkningen och testerna går igenom samma
// följd av slag. events = samtalen, för att visa dem
// testerna lyssnar efter slagen för att se att en process inte hängt sig (src/test/puls.ts); i spelet finns ingen lyssnare
declare global { var slagPuls: (() => void) | undefined }
// De väckta byarna (s.vackta, steg 11.13.1) går med huvudbyn, i fast ordning, var och en med sina egna slag mot samma värld, så
// att varje by utvecklas exakt som om den gått för sig. Efter varje slag i huvudbyn räknas de fram till huvudbyns tid, så att
// huvudbyn alltid ser dem lika långt fram hur anropen än delas (sällskapet som går därifrån läser byn). Världens perioder räknas
// bara av huvudbyn. visad = byn som visas (en väckt by som spelaren gått in i, steg 11.13.11): samtalen (events) är dess
export function step(s: State, dtSec: number, events?: TalkEvent[], visad: State = s) { // också när gränssnittet räknar (typer.ts)
  uttagVakt.i++; // vakten för det som svävar ser bara uttagen i spelets slag, inte det testerna ställer i ordning (steg 11.1.77)
  try { stepNu(s, dtSec, events, visad); } finally { uttagVakt.i--; }
}
function stepNu(s: State, dtSec: number, events: TalkEvent[] | undefined, visad: State) {
  simulera(() => {
    stegBy(s, dtSec, visad === s ? events : undefined, () => { // en by som väckts under slaget börjar vid sin tid
      if (!s.vackta?.length) return;
      for (const v of s.vackta) if (v.vackI === undefined) stegBy(v, (s.now - v.now) / SEC - (v.skuld ?? 0), visad === v ? events : undefined);
    });
    if (s.vackta?.length) useMap(visad);
  });
}
function stegBy(s: State, dtSec: number, events?: TalkEvent[], efter?: () => void) {
  let skuld = (s.skuld ?? 0) + dtSec;
  for (let n = 0; n < 1e6; n++) {
    const plan = nastaSteg(s);
    if (skuld < plan - 1e-9) break;
    slag(s, plan, events); skuld -= plan;
    efter?.();
    globalThis.slagPuls?.();
    if (skuld <= 1e-9) break; // ingen tid kvar: nästa slags längd behöver inte räknas
  }
  if (skuld > 1e-9) s.skuld = Math.round(skuld * 1000) / 1000; else delete s.skuld;
}
// två rövare som pratar på rastplatsen samtalar som byborna (steg 10.2.24)
dodKrok.push(missnojeDod); // ledaren bär missnöjet när någon dör av det som gått dåligt (rost.ts, steg 15.1.161)
rovarPrat.prata = (s, a, b, ev) => { converse(s, a, [b], ev); count(s, 'rovarPrat'); };
// det ett slag delar mellan systemen i TAKTER
type Slag = { dt: number; t0: number; now: number; ai: number; ppl: Person[]; events?: TalkEvent[]; social: Person[]; inRum?: Map<number, number> };
// hur många som är i varje rum (värmen räknas på det), en gång per slag när någon frågar
const rumAntal = (s: State, c: Slag) => {
  if (!c.inRum) { c.inRum = new Map(); for (const p of c.ppl) { const r = roomAt(s, p.x, p.y); if (r) c.inRum.set(r.id, (c.inRum.get(r.id) ?? 0) + 1); } }
  return c.inRum;
};
// Registret över byns system och hur ofta de räknas (steg 10.2.14). sek = hur ofta i sekunder (0 = varje slag), fas = var i
// perioden (0–1; utspritt så att inte allt räknas i samma slag). fn får tiden sedan systemet räknades sist (dt sekunder).
// Slaget anropar systemen bara härifrån, i den här ordningen; ett nytt system får en rad här, satt efter hur fort det
// ändras på riktigt. npm run kostnad visar datortiden per rad
type Takt = { namn: string; sek: number; fas?: number; fn: (s: State, dt: number, c: Slag) => void };
export const TAKTER: Takt[] = [
  { namn: 'kartan', sek: 0, fn: s => { gridOf(s); stationRutor(s); sakerPaGolvet(s); angMark(s); } }, // väggarna och rummen, hyllorna och sakerna på golvet (steg 2.3.6), så att vägsökningen vet var de står
  { namn: 'rummens plus', sek: 3600, fn: s => rumPlusTimme(s) }, // det som passar bra ihop i rummen, räknat vid timmens början (rum.ts, steg 12.1.210)
  { namn: 'rummens finhet', sek: 3600, fas: 0.02, fn: s => { finhetTimme(s); forvantanTimme(s); } }, // steg 14.1.1 och 14.1.3
  { namn: 'tidsåldern', sek: 60, fn: (s, _dt, c) => { if (c.ai !== s.lastAgeIdx) { s.lastAgeIdx = c.ai; log(s, AGES_BORJAR[c.ai], 'world'); } } },
  { namn: 'kaninerna', sek: 10, fn: (s, dt) => djurSteg(s, dt) }, // kaningrupperna väljer plats när deras tid börjar
  { namn: 'viltet', sek: 600, fn: (s, dt) => viltSteg(s, dt) }, // rådjurens och vildsvinens bestånd växer, och flockarna får sin storlek (djur.ts, steg 15.1.169)
  { namn: 'giftermålen', sek: 3600, fn: (s, dt) => giftSteg(s, dt) }, // med någon i en vänlig grannby (giftermal.ts, steg 11.3.6)
  { namn: 'handlaren som väntar', sek: 3600, fn: s => handlarVantarTimme(s) }, // en handlare som en by skickat går in (handel.ts, steg 12.1.107)
  { namn: 'handlaren', sek: 0, fn: (s, dt) => handelSteg(s, dt) }, // kommer, handlar och går (handel.ts, steg 4.4.1)
  { namn: 'vargarna', sek: 0, fn: (s, dt) => vargSteg(s, dt) }, // under istiden (varg.ts, steg 3.7.1)
  { namn: 'björnen', sek: 0, fn: (s, dt) => bjornSteg(s, dt) }, // den som kommer nära björnen (bjorn.ts, steg 6.6.5), och grisen den tar (steg 15.1.166)
  { namn: 'rövarna', sek: 0, fn: (s, dt, c) => rovarSteg(s, dt, c.events) }, // rövarflocken (rovare.ts, steg 4.4.5)
  { namn: 'främlingen', sek: 0, fn: (s, dt) => framlingSteg(s, dt) }, // som kommer gående (liv.ts, steg 9.2.115)
  { namn: 'företagens gäster', sek: 0, fn: (s, dt) => foretagsgastSteg(s, dt) }, // går, köper och går hem (foretagsgast.ts, steg 14.1.11)
  { namn: 'besökarna', sek: 0, fn: (s, dt) => besokSteg(s, dt) }, // huvudbyns resenärer i en väckt by (vacktgast.ts, steg 11.13.10)
  { namn: 'tornadon', sek: 0, fn: s => tornadoSteg(s, { rovarTornado, handlarTornado, handlarPlats }) }, // drar fram (tornado.ts, steg 3.8.4), och rövarna och handlaren drabbas (steg 6.4.12)
  { namn: 'blixten', sek: 3600, fn: s => blixtTimme(s) }, // blixten nära byn (brand.ts, steg 12.1.107)
  { namn: 'branden', sek: 0, fn: (s, dt) => { brandSteg(s, dt); brinnerSteg(s, dt); } }, // gnistor, blixten, elden som sprider sig och den som brinner (brand.ts)
  { namn: 'förrådets slitage', sek: 60, fn: (s, dt) => { wearStore(s, dt); stepBlotVed(s, dt); torvTorkar(s, dt); } }, // slitage, fortare utanför lagret, och veden som blir blöt och torkar (steg 7.3.4), och torven (steg 12.1.3)
  { namn: 'elden', sek: 10, fn: (s, dt, c) => stepFire(s, dt, c.ppl) },
  // det som räknas i timmar (steg 10.2.21 B): var sitt system med sin egen takt; de som räknas varje timme går vid timmens början. Det som ändras långsamt
  // (fynden som växer igen, glömskan, ryktena, husens slitage) räknas glesare och får tiden sedan sist
  { namn: 'atSteg', sek: 3600, fn: s => { atSteg(s); } },
  { namn: 'stepSeder', sek: 3600, fn: s => { stepSeder(s); } },
  { namn: 'vad samlandet ger', sek: 3600, fn: (s, dt) => samlaTimme(s, dt) }, // det glidande medlet som köpet vägs mot (kopbuffert.ts, steg 15.1.19)
  { namn: 'skogen tar slut', sek: 3600, fn: s => skogFoljdTimme(s) }, // en följd för seden Bruka – Värna (steg 15.1.159, skogsvard.ts)
  { namn: 'updateTags', sek: 3600, fn: s => { updateTags(s); } },
  { namn: 'stepRelationer', sek: 3600, fn: s => { stepRelationer(s); } },
  { namn: 'stepUppvaxt', sek: 3600, fn: s => { stepUppvaxt(s); } },
  { namn: 'stepReligion', sek: 3600, fn: (s, dt) => { stepReligion(s, dt / HOUR_S); } },
  { namn: 'morkHumor', sek: 3600, fn: (s, dt) => { for (const p of living(s)) morkHumor(s, p, dt / HOUR_S); } },
  { namn: 'facklorTimme', sek: 3600, fn: (s, dt) => { facklorTimme(s, dt / HOUR_S); } },
  { namn: 'stepHumor', sek: 3600, fn: (s, dt) => { stepHumor(s, dt); } },
  { namn: 'bruket', sek: 3600, fn: s => { brukTimme(s); } }, // det var och en saknar, som samtalens byten slår upp (behov.ts, steg 13.9.9)
  { namn: 'tankarTimme', sek: 3600, fn: s => { tankarTimme(s); } }, // tankarna ur läget: kläderna, hemmet, ljuset, stolen, hemlängtan (steg 12.1.131, tankelage.ts)
  { namn: 'drommar', sek: 3600, fn: (s, dt) => { drommar(s, dt); } }, // den som sover drömmer, den som vaknat har drömmen som tanke (steg 12.1.132, drommar.ts)
  { namn: 'stepDelning', sek: 3600, fn: s => { stepDelning(s); } },
  { namn: 'omtanken', sek: 3600, fn: s => { omtankeTimme(s); lonOmtanke(s); } },
  { namn: 'runstenarna', sek: 3600, fn: s => runstenTimme(s) }, // de som går förbi läser stenarna (skrift.ts, steg 10.6.1)
  { namn: 'projektens brist', sek: 3600, fn: s => projektSaknarRakna(s) }, // det byns projekt saknar, till handeln (projekt.ts, steg 10.5.17)
  { namn: 'handelsmålet', sek: 3600, fn: s => handelsMalRakna(s) }, // varorna att byta med handlaren (handel.ts, steg 10.5.13)
  { namn: 'lönen', sek: 60, fn: (s, dt) => lonRakna(s, dt) }, // timmarna för byn och missnöjet med lönen (lon.ts, steg 10.5.9) // omtanken om byn (projekt.ts, steg 10.5.2)
  { namn: 'stepLarlingar', sek: 3600, fn: s => { stepLarlingar(s); } },
  { namn: 'forbrukTimme', sek: 3600, fn: s => { forbrukTimme(s); } },
  { namn: 'latrinerVaxerIgen', sek: 14400, fn: s => { latrinerVaxerIgen(s); } }, // en latrin som ingen använt på länge växer igen (smuts.ts, steg 11.1.71)
  { namn: 'smutsMat', sek: 3600, fn: s => { if (s.smutsMat) smutsMatTimme(s); } }, // det smutsiga följer maten som finns kvar (steg 10.11.14)
  { namn: 'arbetsTimme', sek: 3600, fn: s => { arbetsTimme(s); } },
  { namn: 'historikSteg', sek: 3600, fn: s => { historikSteg(s); } },
  { namn: 'stepVader', sek: 3600, fn: (s, dt) => { stepVader(s, dt / HOUR_S); } },
  { namn: 'myren', sek: 3600, fn: s => myrSteg(s, groundOf(s)) }, // står under vatten när marken är blöt (myr.ts, steg 12.1.1)
  { namn: 'bränningarna', sek: 600, fn: s => { if (s.branningar) branningSteg(s); haftSteg(s); jarngruvorSteg(s); } }, // kolmilorna som blivit klara (brann.ts, steg 12.2.1), och om byn haft sakerna som öppnar tekniker (haftSteg i teknik.ts, steg 12.1.4)
  { namn: 'vindfallen', sek: 3600, fn: s => { vindfallen(s); } },
  { namn: 'regnetTvattar', sek: 3600, fn: s => { regnetTvattar(s); } },
  { namn: 'stepMotgang', sek: 3600, fn: s => { stepMotgang(s); } },
  { namn: 'stepTorka', sek: 3600, fn: s => { stepTorka(s); } },
  { namn: 'stepFlod', sek: 3600, fn: s => { stepFlod(s); } },
  { namn: 'stepIs', sek: 3600, fn: (s, dt) => { stepIs(s, dt / HOUR_S); } },
  { namn: 'growGround', sek: 3600, fn: (s, dt, c) => { growGround(s, dt / HOUR_S, c.ai); } },
  { namn: 'growFynd', sek: 14400, fn: (s, dt, c) => { growFynd(s, dt / HOUR_S, c.ai, vaxtFaktor(s), vaderNu(s).nb); } },
  { namn: 'uppretade bin', sek: 0, fn: (s, dt) => retadeSteg(s, dt) }, // sticker och lugnar sig (bin.ts, steg 10.10.27)
  { namn: 'binas stick hos djuren', sek: 600, fn: (s, dt) => djurStickSteg(s, dt) }, // läker (bin.ts, steg 10.10.27)
  { namn: 'bina', sek: 14400, fn: (s, dt) => { binSteg(s, dt); } }, // svärmarna (bin.ts, steg 10.10.17)
  { namn: 'forget', sek: 14400, fn: (s, dt) => { forget(s, dt / HOUR_S); } },
  { namn: 'det byn vet', sek: 3600, fn: s => raknaBynVet(s) },
  { namn: 'byarnas historik', sek: 3600, fn: s => sparaHistorik(s) }, // en bild per by var femte dygn (ort.ts, steg 11.4.8) // om platserna i världen (ort.ts, steg 11.4.6)
  { namn: 'stepRykten', sek: 3600, fn: (s, dt) => { stepRykten(s, moodOf, dt / HOUR_S); } },
  { namn: 'glomRykten', sek: 14400, fn: (s, dt) => { glomRykten(s, dt / HOUR_S); } },
  { namn: 'stepBerattelser', sek: 3600, fn: s => { stepBerattelser(s); } },
  { namn: 'kvällen före styret', sek: 86400, fas: STR.timme / 24, fn: s => { kvallForeStyret(s); } }, // trons krets och dopet (styre.ts)
  { namn: 'stepStyre', sek: 3600, fn: (s, dt) => { stepStyre(s, dt / HOUR_S); } },
  { namn: 'styrets kväll', sek: 86400, fas: STR.timme / 24, fn: s => { styretsKvall(s); } }, // domen, omröstningen och det som tas upp (styre.ts)
  { namn: 'rotStumps', sek: 3600, fn: s => { rotStumps(s); } },
  { namn: 'tidyStore', sek: 3600, fn: s => { tidyStore(s); } },
  { namn: 'vaggRensa', sek: 3600, fn: s => { vaggRensa(s); } },
  { namn: 'kvarTimme', sek: 3600, fn: s => { kvarTimme(s); } },
  { namn: 'sällskapen på vägen', sek: 600, fn: (s, dt) => resaBehov(s, dt * SEC) }, // mättnaden, vätskan och orken (resa.ts, steg 11.5.6)
  { namn: 'världen', sek: 300, fn: s => { if (s.vackt === undefined && s.vacktPlats === undefined) varldSteg(s); } }, // världens perioder och kön, räknade mot klockan (varldslag.ts, steg 11.2.17)
  { namn: 'huvudbyns rad', sek: 3600, fn: s => { if (s.varld && s.vackt === undefined && s.vacktPlats === undefined) skrivHuvudRad(s); } }, // talen i huvudbyns rad i världen (radtal.ts, steg 11.2.9)
  { namn: 'skatten', sek: 86400, fas: SKATT.timme / 24, fn: (s, dt) => { skattDygn(s, dt * SEC); } }, // skatten på rikedomen (skatt.ts, steg 10.5.3)
  { namn: 'budgeten', sek: 86400, fas: SKATT.timme / 24, fn: s => { if (s.budget) budgetDygn(s); lonDygn(s); } }, // budgeten delar byns förråd, efter skatten (budget.ts, steg 10.5.7)
  { namn: 'kassan', sek: 30, fn: s => { if (s.foretag?.length) kassaTakt(s); } }, // den som kan betjäna kallas till disken (kassa.ts, steg 14.1.6)
  { namn: 'företagen', sek: 3600, fn: s => { foretagTimme(s); foretagMarknad(s); } }, // företagens hus och ägare (foretag.ts, steg 14.1.5)
  { namn: 'marknaden', sek: 86400, fas: 19 / 24, fn: s => { marknadDygn(s); } }, // är det värt att mötas på torget i morgon? (marknad.ts, steg 14.1.14)
  { namn: 'företagens gäster kommer', sek: 3600, fn: (s, dt) => foretagsgasterKommer(s, dt) }, // steg 14.1.11
  { namn: 'företagens dygn', sek: 86400, fas: (SKATT.timme + 1) / 24, fn: s => { foretagDygn(s); } }, // nya företag, efter skatten och lönerna
  { namn: 'rädslan', sek: 86400, fas: STR.timme / 24, fn: (s, dt) => { raddDygn(s, dt); } }, // rädslan för handlingar bleknar och berättas vidare, också i en by utan ledare (radsla.ts, steg 12.1.60 och 12.1.84)
  { namn: 'gravDygn', sek: 86400, fas: 0.37, fn: s => { gravDygn(s); } }, // gravarna som vuxit igen helt (steg 10.4.8)
  { namn: 'gudlös', sek: 86400, fas: 0.81, fn: s => { gudlosDygn(s); } }, // den som håller sig borta från tron (rykten.ts, steg 12.1.173)
  { namn: 'kultTimme', sek: 3600, fn: (s, dt) => { kultTimme(s, dt / HOUR_S); } },
  { namn: 'tvivlet', sek: 14400, fn: (s, dt) => { tvivelTimme(s, dt / HOUR_S); } }, // tvivlet bleknar, och den svaga tron lämnas (kult.ts, steg 15.1.125)
  { namn: 'kyrkaTimme', sek: 3600, fn: (s, dt) => { kyrkaTimme(s, dt / HOUR_S); } },
  { namn: 'kyrkans dygn', sek: 86400, fas: KYRKA_TIMME / 24, fn: s => { kyrkaDygn(s); } }, // skatten, helgonen, kvädena, välsignelsen och buden (kyrka.ts)
  { namn: 'seden andlig', sek: 3600, fn: s => { andligTimme(s); } }, // seden Världslig – Andlig låses upp (kyrka.ts)
  { namn: 'wearBuild', sek: 21600, fn: (s, dt, c) => { wearBuild(s, dt / HOUR_S, c.ai); } },
  { namn: 'stepByggnader', sek: 3600, fn: s => { stepByggnader(s); } },
  { namn: 'husKlaraTimme', sek: 3600, fn: s => { husKlaraTimme(s); } },
  { namn: 'stepMjardar', sek: 3600, fn: (s, dt) => { stepMjardar(s, dt); } },
  { namn: 'stepNaken', sek: 3600, fn: s => { stepNaken(s); } },
  { namn: 'stepByggplan', sek: 3600, fn: s => { stepByggplan(s); } },
  { namn: 'planBuild', sek: PLAN.varTim * 3600, fn: s => { planBuild(s); } }, // byggplanen (steg 7.2.3)
  { namn: 'stationFlytt', sek: 24 * 3600, fn: s => { stationFlyttTimme(s); } }, // en station ute närmare dem som använder den (steg 9.4.8); en gång per dygn: var folk bor och arbetar ändras långsamt, och sökningen är dyr
  { namn: 'stepEldFlytt', sek: 3600, fn: s => { stepEldFlytt(s); } },
  { namn: 'lagerIStraket', sek: 3600, fn: s => { lagerIStraket(s); lagerIHagen(s); } }, // och i en hage (steg 15.1.148)
  { namn: 'stepPaborjat', sek: 3600, fn: s => { stepPaborjat(s); } },
  { namn: 'stepStationer', sek: 3600, fn: s => { stepStationer(s); } },
  { namn: 'stepPynt', sek: 3600, fn: (s, dt) => { stepPynt(s, dt / HOUR_S); } },
  { namn: 'färgsmaken', sek: 3600, fn: (s, dt) => { stepFargsmak(s, dt / HOUR_S); } }, // var smaken för en färg kommer ifrån (farg.ts, steg 13.3.5)
  { namn: 'stepKrukor', sek: 3600, fn: (s, dt) => { stepKrukor(s, dt); } },
  { namn: 'protesTimme', sek: 3600, fn: s => { protesTimme(s); } },
  { namn: 'halsoNotiser', sek: 3600, fn: s => { halsoNotiser(s); } },
  { namn: 'stepKok', sek: 60, fn: (s, dt) => { stepKok(s, dt); } }, // krukorna och kokgropen räknar ner med tiden sedan sist (steg 12.1.63)
  { namn: 'vatskorTimme', sek: 3600, fn: s => { vatskorTimme(s); } },
  { namn: 'stepBrygg', sek: 3600, fn: (s, dt) => { stepBrygg(s, dt); } },
  { namn: 'stepBak', sek: 3600, fn: s => { stepBak(s); } },
  { namn: 'stationseldarna', sek: 60, fn: (s, dt) => stepStationsEld(s, dt) }, // örtkökets, bakugnens och rökeriets eldar brinner (stationseld.ts, steg 10.2.85)
  { namn: 'stepSophog', sek: 3600, fn: (s, dt) => { stepSophog(s, dt); } },
  { namn: 'stepKompost', sek: 3600, fn: (s, dt) => { stepKompost(s, dt); } },
  { namn: 'stepOrtKrukor', sek: 3600, fn: (s, dt) => { stepOrtKrukor(s, dt); } },
  { namn: 'stadaByten', sek: 3600, fn: s => { stadaByten(s); } },
  { namn: 'stepBrasor', sek: 3600, fn: s => { stepBrasor(s); } },
  { namn: 'stepKlader', sek: 3600, fn: s => { stepKlader(s); } },
  { namn: 'stepOdling', sek: 3600, fn: (s, dt) => { stepOdling(s, dt); } },
  { namn: 'stepTamdjur', sek: 3600, fn: (s, dt) => { stepTamdjur(s, dt); } },
  { namn: 'stepHagar', sek: 3600, fn: (s, dt) => { stepHagar(s, dt); } },
  { namn: 'stepBoskap', sek: 3600, fn: (s, dt) => { stepBoskap(s, dt); } },
  { namn: 'stepVinter', sek: 3600, fn: (s, dt) => { stepVinter(s, dt); } },
  { namn: 'stepHons', sek: 3600, fn: (s, dt) => { stepHons(s, dt); } },
  { namn: 'askaSteg', sek: 3600, fn: s => { askaSteg(s); } },
  { namn: 'sorgTimme', sek: 3600, fn: s => { sorgTimme(s); } },
  { namn: 'smittaTimme', sek: 3600, fn: (s, dt) => { smittaTimme(s, dt); } },
  { namn: 'smittaUtifranTimme', sek: 3600, fn: (s, dt) => { smittaUtifranTimme(s, dt); } },
  { namn: 'compact', sek: 3600, fn: s => { compact(s); } },
  // kroppen: behoven, att äta, hälsan och graviditeten, för var och en
  { namn: 'behoven', sek: 30, fn: (s, dt, c) => {
    const temp = temperature(s), coldRate = coldOf(temp), inRum = rumAntal(s, c);
    for (const p of c.ppl) {
      if (!alive(p)) continue; // dödad tidigare i samma slag (av vargar eller i ett slagsmål)
      const a = ageOf(p, c.now);
      needsStep(s, p, a, dt, coldRate, inRum, temp);
      if (p.task?.act !== 'strid') needLadder(s, p, dt); // äta: sitt eget, byns, och i yttersta nöd andras (behov.ts). Inte mitt i en strid (strid.ts)
      if (healthStep(s, p, a, c.ai, dt)) continue; // dog
      pregnancy(s, p, a, c.ppl.length, dt);
      if (p.thoughts.some(x => x.until <= c.now)) p.thoughts = p.thoughts.filter(x => x.until > c.now);
    }
  } },
  // det var och en gör: alla en bit i taget, sida vid sida. Den som står still vid ett arbete räknas inte förrän arbetet är
  // klart, KLOCKA.arbetsBit sekunder gått eller något nytt händer (vantar, steg 10.2.21); då räknas hela tiden på en gång
  { namn: 'aktiviteterna', sek: 0, fn: (s, dt, c) => {
    const learn = 1 + STEG.larNyfiken * s.seder.v.nyfikenhet; // en nyfiken by lär sig snabbare
    const kort = dt < KLOCKA.slag - 1e-9; // korta steg: faran är nära, och alla räknas varje steg
    for (const p of c.ppl) {
      if (!alive(p)) continue;
      const tk = p.task;
      if (!kort && tk && vantar(p, tk, c.now, dt)) {
        tk.vant = (tk.vant ?? 0) + dt;
        if (spar.pa) { spar.v.set(p, [c.t0, p.x, p.y]); spar.u.set(p, [[c.t0, kopia(tk)]]); }
        if (kanPrata(s, p)) c.social.push(p);
        continue;
      }
      const tid = dt + (tk?.vant ?? 0); if (tk) delete tk.vant;
      if (spar.pa) { const b = c.now - tid * SEC; spar.v.set(p, [b, p.x, p.y]); spar.u.set(p, [[b, kopia(p.task)]]); }
      const k = kostStart(), akt = p.task?.act ?? 'välja';
      taskStep(s, p, ageOf(p, c.now), c.now, tid, learn, c.social);
      if (p.task?.sele !== undefined) seleMed(s, p, p.task); // barnet i bärselen följer med (steg 13.2.3)
      kost('aktivitet: ' + akt, k);
      s.now = c.now;
    }
  } },
  // samtal (steg 10.2.16): ca ett per 4 minuter per person i social aktivitet, med dem som står nära i slaget, utan vägg emellan.
  // Ingen samtalar ensam: den som gått för att samtala slutar när den hen pratar med gått för långt bort, eller när ingen har
  // funnits att prata med på SAMTAL.ensamSek sekunder
  { namn: 'samtalen', sek: 0, fn: (s, dt, c) => {
    const social = c.social.filter(p => kanPrata(s, p)); // en brottning kan ha börjat under steget (steg 9.2.100)
    for (const p of social) {
      if (!alive(p)) continue;
      // vilka som hörs räknas först när det blir ett samtal: innan dess räcker det att veta om någon hörs (fynd 432)
      const hors = (q: Person) => q !== p && alive(q) && horHar(s, p, q);
      const t = p.task!, med = t.med !== undefined ? social.find(q => q.id === t.med && hors(q)) : undefined; // den man står bredvid (steg 4.5.6.7)
      const finns = !!med || social.some(hors);
      if (t.act === 'samtal') {
        if (t.med !== undefined && !med) { t.until = Math.min(t.until, c.now); count(s, 'samtal for langt'); continue; } // den andra gick
        t.ensam = finns ? 0 : (t.ensam ?? 0) + dt;
        if (t.ensam > SAMTAL.ensamSek) { t.until = Math.min(t.until, c.now); count(s, 'samtal ensam'); continue; }
      }
      if (!finns) continue;
      const expect = dt / STEG.samtalSek * (STEG.samtalBas + stat(p, 'empati', c.now) / STEG.samtalEmpati) * (p.sinnen === undefined ? 1 : tal(p) * STEG.samtalTal + horsel(p) * STEG.samtalHorsel + 1 - STEG.samtalTal - STEG.samtalHorsel); // talet och hörseln (steg 8.2.2)
      let n = Math.floor(expect); if (rnd(s, 'samtal', p) < expect - n) n++;
      const others = n ? (med ? [med] : social.filter(hors)) : [];
      for (let i = 0; i < n; i++) { const g = converse(s, p, others, c.events); if (g) gralBlirSlagsmal(s, p, g); } // ett gräl kan bli ett slagsmål (strid.ts)
      if (n) { count(s, 'samtal', n); if (!ACTS[t.act].social) p.pratArbete = (p.pratArbete ?? 0) + n; } // samtalen under arbetet (steg 8.1.12)
    }
  } },
  { namn: 'striden', sek: 0, fn: (s, dt) => { kartStridSteg(s, dt); serStriden(s); } }, // striderna på kartan stegas med byn, och de som ser dem väljer på nytt (kartstrid.ts, steg 10.1.4)
  // gästernas vardag (steg 9.2.113, gastvardag.ts): värmen räknas som en bybos, men reskläderna tar det mesta av kylan
  { namn: 'fångarnas öde', sek: 3600, fn: s => fangeOde(s) }, // vad byn gör med fången (fangeval.ts, steg 11.12.7)
  { namn: 'gästerna', sek: 30, fn: (s, dt, c) => { const temp = temperature(s), coldRate = coldOf(temp), inRum = rumAntal(s, c); gastVardag(s, dt, g => { const v = varmeDelar(s, g, coldRate, inRum, temp); v.kyla *= 1 - GASTVARD.klad; return nyVarme(g.warm, v, dt / HOUR_S); }); } },
  { namn: 'handlarprat', sek: 0, fn: (s, dt, c) => pratMedHandlare(s, dt, c.events) }, // småprat med handlaren (steg 4.5.4.15, handel.ts)
  // relationer bleknar långsamt utan umgänge
  { namn: 'relationerna', sek: STEG.blekSek, fn: (s, dt) => { const k = Math.exp(-STEG.blek * dt / 86400); for (const key in s.rels) { const r = s.rels[key]; r.op *= k; r.rom *= k; } } },
  { namn: 'flytt och nybyggare', sek: 60, fn: (s, dt) => { if (!s.people.some(alive)) log(s, 'Byn är tom. Ingen finns kvar vid elden.', 'world'); regulate(s, dt); } },
  { namn: 'redskapen', sek: 60, fn: s => { tidyTools(s); slappAmmo(s); placeTools(s); } }, // redskapen som släpptes läggs i förrådet
  { namn: 'ängen i vägen', sek: 3600, fn: s => { angIVagen(s); } }, // ängen som byn eller ett stråk når flyttas (slatter.ts, steg 10.10.28); sist, så att de andra radernas förskjutning är som förut
  { namn: 'tunnorna', sek: 600, fn: (s, dt) => tunnaRegn(s, dt) }, // regnet fyller tunnorna ute (tunna.ts, steg 12.4.6)
  { namn: 'mognaden', sek: 3600, fn: s => mognadSteg(s) }, // vinet och mjödet mognar (tunna.ts, steg 12.4.6)
  { namn: 'vattenhon', sek: 600, fn: (s, dt) => hoRegn(s, dt) }, // regnet fyller vattenhon (vattenho.ts, steg 10.10.30)
  { namn: 'djurens törst', sek: 600, fn: (s, dt) => djurTorstSteg(s, dt) }, // tamdjuren dricker (djurtorst.ts, steg 10.10.31)
  { namn: 'djuren flyr', sek: 0, fn: (s, dt) => tamFaraSteg(s, dt) }, // tamdjuren flyr från bina, elden och vargarna efter sitt mod (djurflykt.ts, steg 10.10.29)
];
// p står still vid sitt arbete och kan vänta med att räknas (steg 10.2.21): inget är klart i slaget, inget avbryter (nöden,
// dag som blir natt), och hen har inte väntat KLOCKA.arbetsBit sekunder
function vantar(p: Person, tk: Task, now: number, dt: number) {
  const d = ACTS[tk.act];
  return tk.phase === 'do' && !d.tur && !d.runda && !d.varjeSlag && tk.med === undefined && tk.until > now + 1e-6
    && (tk.vant ?? 0) + dt < KLOCKA.arbetsBit && !nodAvbryter(p, tk, ageOf(p, now)) && !(d.dygn && tk.dark !== !isLight(now));
}
// nöden avbryter uppgiften t (steg 15.1.4 och 15.1.181): ett farligt behov (törst, hunger, kyla eller toa) finns och de farliga
// behoven är andra än när uppgiften valdes (t.nod). Inte den som bärs, slåss eller redan går avsides (nodFri), och inte de minsta barnen
function nodAvbryter(p: Person, t: Task, a: number) {
  const f = farligaBehov(p);
  return f !== 0 && f !== (t.nod ?? 0) && !ACTS[t.act].nodFri && a >= ALDER.smabarn;
}
// tiden (sekunder) sedan raden t räknades, om den ska räknas i slaget som slutar vid now, annars undefined. Sist räknad står i
// s.takter; en by som saknar den (en ny eller äldre sparning) räknar raden som om den räknats när slaget började
const TAKT_OFF: number[] = [];
// radens förskjutning inom perioden ur namnet, så att en ny rad i TAKTER inte flyttar de andra
const namnFas = (n: string) => { let h = 2166136261; for (let i = 0; i < n.length; i++) h = Math.imul(h ^ n.charCodeAt(i), 16777619); return (h >>> 0) / 2 ** 32; };
function taktDt(s: State, t: Takt, i: number, now: number, dtSec: number) {
  if (t.sek <= 0) return dtSec;
  // (det som räknas i hela timmar går vid timmens början, som klockan i spelet: motgångarna, vädret och dygnets händelser följer
  // timmen; det som räknas oftare sprids över perioden)
  const tk = s.takter ??= {}, P = t.sek * SEC, off = TAKT_OFF[i] ??= (t.fas ?? (t.sek % 3600 === 0 ? 0 : namnFas(t.namn))) * P; // radens förskjutning räknas en gång
  const sist = tk[t.namn];
  // första gången (en ny by eller en äldre sparning), eller när klockan har flyttats (ett prov): systemet räknas direkt, så att
  // det som räknas sällan (timmens behov, byggplanen) finns från början
  if (sist === undefined || sist > now || now - sist > P + dtSec * SEC) { tk[t.namn] = now; return dtSec; }
  if (Math.floor((now - off) / P) === Math.floor((sist - off) / P)) return undefined; // (sist står redan där)
  tk[t.namn] = now;
  return (now - sist) / SEC;
}
// raderna i TAKTER med de här namnen, räknade som slaget räknar dem (taktDt), utan resten av slaget: för mätverktygen som bara
// kör en del av byn (npm run radhandel kör handlarnas rader, steg 15.1.83). Spelet anropar den aldrig
export function taktRader(s: State, namn: readonly string[], dtSec: number) {
  s.now += dtSec * SEC;
  const c: Slag = { dt: dtSec, t0: s.now - dtSec * SEC, now: s.now, ai: ageIndex(s), ppl: [], social: [] };
  TAKTER.forEach((t, i) => { if (!namn.includes(t.namn)) return; const dt = taktDt(s, t, i, s.now, dtSec); if (dt !== undefined) t.fn(s, dt, c); });
}
function slag(s: State, dtSec: number, events?: TalkEvent[]) {
  useMap(s);
  const t0 = s.now;
  s.now += dtSec * SEC;
  const now = s.now;
  const c: Slag = { dt: dtSec, t0, now, ai: ageIndex(s), ppl: living(s), events, social: [] };
  const e0 = events?.length ?? 0;
  TAKTER.forEach((t, i) => {
    const dt = taktDt(s, t, i, now, dtSec);
    if (dt === undefined) return;
    const k = kostStart();
    t.fn(s, dt, c);
    s.now = now;
    kost(t.namn, k);
  });
  // samtalen visas i slutet av slaget, där de som pratar står (steg 10.2.16)
  if (events) for (let i = e0; i < events.length; i++) events[i].t = now;
}


// behoven: hunger, törst, vila, värme, umgänge och toa. Elden värmer i ett område, och inne i ett hus kyls man långsammare
// (sämre ju fler öppningar). Delarna nedan räknas här och visas i personrutan, så att den visar det som faktiskt händer
// vilan per timme före tak och eld (talets namn i KROPP): den som har brist på energi tröttnar fortare (steg 2.6.2)
// den gamla tröttnar fortare (steg 13.8.11): vilan sjunker gånger detta, efter åldern a
export const aldersTrott = (a: number) => 1 + KROPP.gammalTrott * clamp((a - ALDER.trottGammal) / KROPP.gammalSpann, 0, 1);
export const vilaTim = (p: Person, vs = viloSlag(p), a = 0) => KROPP[vs] * (KROPP[vs] < 0 ? trottFaktor(p) * aldersTrott(a) : 1);
export function viloSlag(p: Person): 'restVila' | 'restArbete' | 'restVaken' {
  const pd = p.task && ACTS[p.task.act];
  return pd && pd.vila ? 'restVila' : pd && pd.tungt && p.task!.phase === 'do' ? 'restArbete' : 'restVaken';
}
// tanken efter en natt under tak och hur glad den gör
const VILOTANKE = { restBadd: 'sovBadd', restGolv: 'sovGolv', restTak: 'sovTak' } as const; // raderna i TANKAR
// den som sover i ett hus vilar bättre, bättre på ett golv och bäst i en halmbädd: talets namn i KROPP, eller inget
export function viloTak(s: State, p: Person, rum: unknown): 'restBadd' | 'restGolv' | 'restTak' | undefined {
  const pd = p.task && ACTS[p.task.act];
  if (!(rum && pd && pd.vila && p.task!.phase === 'do' && pd.plats === 'sang')) return undefined;
  if (s.stationer?.length && (r => r.sov.has(tileOf(p.x, p.y)) || r.bara.has(tileOf(p.x, p.y)))(stationRutor(s))) return 'restBadd'; // och vaggan och sjukbädden (steg 12.4.5, 12.4.10)
  const m0 = gridOf(s).at.get(tileOf(p.x, p.y))?.m;
  return m0 === 'ho' || m0 === 'tra' ? 'restGolv' : 'restTak';
}
// man sover bättre i en finare bädd (kvalitet.ts): vilan och tanken gånger detta. Personrutan visar samma tal
// och sämre i ett rum där något passar dåligt ihop med att sova (RUM_MINUS i rum.ts, steg 7.2.1)
export const takEffekt = (s: State, p: Person, tak: ReturnType<typeof viloTak>) => (tak === 'restBadd' ? kvEffekt(stationRutor(s).at.get(tileOf(p.x, p.y))) : 1) * (tak ? rumVila(s, roomAt(s, p.x, p.y), p) : 1);
// värmen per timme: elden, kylan (det huset, skinnfällen och kläderna skyddar är borta) och milt väder. inRum = hur många som är i varje rum.
// Över idealet (steg 2.3.4): solen (inte i skugga: i ett hus eller under ett träd), kläderna när det är milt och elden tätt intill
export function varmeDelar(s: State, p: Person, coldRate: number, inRum: Map<number, number>, temp = temperature(s), at: { x: number; y: number } = p) {
  const rum = roomAt(s, at.x, at.y), brand = rum ? 0 : brandHetta(s, at.x, at.y), eldH = heatAt(s, at.x, at.y), heat = Math.max(eldH, brand, rum?.hus !== undefined && s.fangEld && fangEldBrinner(s, rum.hus) ? FANG.eldHeat : 0), shelter = rum ? shelterOf(s, rum, inRum.get(rum.id) ?? 1) : 0; // branden värmer som lägerelden tätt intill (steg 9.2.135)
  const fall = tillbehorVarme(s, p, rum); // skinnfällen i bädden (steg 2.2.14)
  const klad = kladVarme(s, p); // kläderna (steg 2.3.2)
  const skugga = !!rum || groundOf(s).trees[tileOf(at.x, at.y)] > KROPP.skugga;
  // vädret (steg 2.11.1): den som är blöt eller ute i blåsten fryser som om det vore kallare, och molnen tar solen
  const vg = vaderGrader(s, p, !rum), cr = vg ? coldRate + coldOf(temp - vg) - coldOf(temp) : coldRate;
  const sol = skugga ? 0 : Math.max(0, temp - KROPP.solFran) / KROPP.solDiv * (1 - vaderNu(s).moln * VADER.molnSol);
  const kladHetta = klad * Math.max(0, temp - KROPP.kladFran) / KROPP.kladDiv, eldHetta = Math.max(0, heat - KROPP.eldTatt) * KROPP.eldHetta;
  return { heat, rum, shelter, fall, klad, eld: heat * KROPP.eldVarme, kyla: cr * (1 - shelter) * (1 - fall) * (1 - klad) * frysFaktor(p), mild: cr === 0 ? KROPP.mildVarme : 0,
    sol, kladHetta, eldHetta, brandHetta: brand > eldH ? eldHetta : 0, hetta: sol + kladHetta + eldHetta, skugga, blot: p.blot ?? 0, vaderGrader: vg };
}
// den som fryser väger värmen på andra platser (varme.ts)
varmeKrok.delar = (s, p, at, inRum) => { const temp = temperature(s); return varmeDelar(s, p, coldOf(temp), inRum, temp, at); };
// värmen efter dt timmar: under idealet som förut (elden, kylan, milt väder, aldrig över idealet). Vid och över idealet värmer
// bara hettan, kylan kyler, och kroppen svalnar mot idealet (KROPP.svalnar) men aldrig under det
// varmeRaknas ger det som räknas vid värmen w på dt timmar (personrutan visar samma, dt = 1): under idealet netto = elden, kylan
// och det milda vädret, vid och över det bara den del av dem som kyler, hettan och hur mycket kroppen svalnar (svalnar)
export function varmeRaknas(w: number, v: ReturnType<typeof varmeDelar>, dt = 1) {
  const under = v.eld - v.kyla + v.mild;
  if (w < 1) return { under: true, netto: under, svalnar: 0 };
  const netto = Math.min(0, under), n = w + dt * (v.hetta + netto);
  return { under: false, netto, svalnar: Math.min(Math.max(0, n - 1), dt * KROPP.svalnar) };
}
export function nyVarme(w: number, v: ReturnType<typeof varmeDelar>, dt: number) {
  const r = varmeRaknas(w, v, dt);
  if (r.under) return clamp(w + dt * r.netto, 0, 1);
  return clamp(w + dt * (v.hetta + r.netto) - r.svalnar, 0, KROPP.maxVarm);
}
function needsStep(s: State, p: Person, a: number, dtSec: number, coldRate: number, inRum: Map<number, number>, temp: number) {
  const now = s.now;
  const vs = viloSlag(p);
  // mättnaden är en sammanfattning av näringen (steg 2.6.1); den som är för varm och arbetar tungt tappar salt (steg 2.6.2)
  naringSjunker(p, dtSec / HOUR_S * (a < ALDER.matBarn ? KROPP.hungerBarn : 1), KROPP.hungerTim, vs === 'restArbete' && p.warm > KROPP.forVarm);
  bristSteg(p, now);
  const vt = vilaTim(p, vs, a), kudde = tillbehorVila(s, p); // den som sover på en kudde vilar fortare (steg 13.3.1)
  p.rest = clamp(p.rest + dtSec / HOUR_S * vt * (vt > 0 ? kudde : 1), 0, 1);
  { // regnet blöter den som är ute; man torkar inne och vid elden (steg 2.11.1)
    const ute = !roofed(s, p.x, p.y) && !iDass(s, p); // inne i ett hus håller man sig torr, och i utedasset (steg 12.4.9)
    blotSteg(s, p, ute, ute && groundOf(s).trees[tileOf(p.x, p.y)] > KROPP.skugga, heatAt(s, p.x, p.y) > KROPP.eldNara, dtSec / HOUR_S);
    if ((p.blot ?? 0) > VADER.blotTanke) tanke(p, 'blot', now);
  }
  const v = varmeDelar(s, p, coldRate, inRum, temp), heat = v.heat;
  p.warm = p.brinner !== undefined ? KROPP.maxVarm : nyVarme(p.warm, v, dtSec / HOUR_S); // den som brinner har kroppens högsta värme tills elden är släckt (steg 9.2.135)
  const tak = viloTak(s, p, v.rum);
  if (tak) { // man vilar bättre under tak, och bäst på ett golv
    const e = takEffekt(s, p, tak), bv = tak === 'restBadd' ? baddVila(s, p) : undefined; // sängen vilar bättre än halmbädden (steg 12.4.3)
    p.rest = clamp(p.rest + dtSec / HOUR_S * (bv?.tim ?? KROPP[tak]) * e * kudde, 0, 1);
    if (p.task!.act === 'sova') { if (bv) { tanke(p, bv.tanke, now, { v: bv.glad * e }); bredvidKaresta(s, p); } else tanke(p, VILOTANKE[tak], now, { f: e }); } // sängen och vaggan har sin egen tanke (steg 12.4.3)
  }
  p.rest = clamp(p.rest + dtSec / HOUR_S * sittVila(s, p), 0, 1); // den som sitter på en pall eller stol vilar mer (steg 12.4.4)
  // rummens plus (steg 12.1.143): en god tanke hos den som sover eller äter i ett rum där taggarna passar bra ihop
  if (v.rum && (tak && p.task!.act === 'sova' || vidBordet(p))) for (const m of rumPlus(s, v.rum)) if (m.tanke) tanke(p, 'rumPlus', now, { text: rumPlusTanke(m.id), v: m.tanke });
  if (v.rum && (tak && p.task!.act === 'sova' || vidBordet(p))) forvantanTanke(s, p, v.rum); // steg 14.1.3
  if (heat > KROPP.eldNara) { // välbehaget ur eldstaden för den eld som värmer mest (steg 10.2.109)
    const fh = varmasteHard(s, p.x, p.y);
    tanke(p, 'vamsAvElden', now, { v: fh.comfort });
    p.rest = clamp(p.rest + dtSec / HOUR_S * fh.comfort * heat, 0, 1); // avslappning vid elden
  }
  if (p.warm < KROPP.fryser) tanke(p, 'fryser', now);
  if (forVarm(s, p)) tanke(p, 'forVarm', now); // för varm (steg 2.3.4 och 12.1.19): en tanke när det är riktigt varmt
  // tröttare bara när man är extremt varm (steg 2.10.20): annars arbetar man som vanligt trots värmen
  if (p.warm > KROPP.extremVarm) p.rest = clamp(p.rest - dtSec / HOUR_S * KROPP.varmTrott * (p.warm - 1), 0, 1);
  p.social = clamp(p.social - dtSec / (KROPP.socialTim * HOUR_S), 0, 1);
  // toa: behovet växer på ungefär sju timmar, långsammare i sömnen
  p.toa = clamp(p.toa - dtSec / (KROPP.toaTim * HOUR_S) * (p.task?.act === 'sova' ? KROPP.toaSomn : 1), 0, 1);
  if (p.toa <= 0) { p.toa = 1; if (a >= ALDER.smabarn) { toaBesok(s, p); tanke(p, 'kissade', now); } } // små barn lämnar ingen fläck
  akel(s, p); // toa-smutsen äcklar den som står i den (steg 2.7.2)
  torstSteg(s, p, a, dtSec); // törsten: fortare för den som är för varm eller arbetar tungt (steg 2.4.1–2.4.2)
}

// det som just nu tär på hälsan eller läker den (sjukdomen kommer till utöver detta)
export function halsaLage(p: Person, now: number): 'svalt' | 'frys' | 'torst' | 'laker' | undefined {
  return p.hunger <= 0 ? 'svalt' : p.warm < KROPP.frysdod ? 'frys' : p.torst <= 0 ? 'torst' : lakerFullt(p) && !isSick(p, now) ? 'laker' : undefined;
}
// hälsa, sjukdom och död: svält, kyla, sjukdom, ålderdom, olyckor och skador (halsa.ts). true = personen dog
function healthStep(s: State, p: Person, a: number, ai: number, dtSec: number) {
  const now = s.now;
  const hl = halsaLage(p, now);
  if (hl === 'svalt') { p.health -= dtSec / (KROPP.svaltTim * HOUR_S); if (rnd(s, 'halsa', p) < dtSec / STEG.svaltTanke) tanke(p, 'svalter', now); }
  else if (hl === 'frys') p.health -= dtSec / (KROPP.frysTim * HOUR_S);
  else if (hl === 'torst') p.health -= dtSec / (TORST.tomTim * HOUR_S);
  else if (hl === 'laker') p.health = clamp(p.health + dtSec / (KROPP.lakerTim * HOUR_S), 0, 1);
  // sjukdomen mot motståndet (steg 9.5.2, sjukdom.ts): vinner sjukdomen dör hen av den
  rusSteg(s, p, dtSec); // berusningen går över (steg 9.6.14, rus.ts); drycken är en vald handling (steg 10.2.34)
  const sjukDod = sjukSteg(s, p, dtSec, p.task?.act === 'sova', !!p.task && !!ACTS[p.task.act].arbete && p.task.phase === 'do', teFaktor(s, p, SJUK.lakeort));
  if (sjukDod) { die(s, p, SJUK_DOD[sjukDod]); return true; }
  if (p.sjuk && svartSjukNu(p, s.now) && !p.svartSjuk) { loggBer(s, 'l_svartSjuk', p.id, { namn: p.name, feber: !!SJUKDOMAR[p.sjuk.k].foljd.feber, forkyld: p.sjuk.k === 'forkylning', sjukdom: SJUKDOMAR[p.sjuk.k].bf }, 'world', [p.id]); p.svartSjuk = 1; } // svårt sjuk: när sjukdomen är så svår att hen lägger sig (steg 12.1.46); ett tecken när hen blir frisk (steg 4.1.2.1)
  p.health -= dtSec / HOUR_S * skorbjugg(p); // brist på vitaminer (steg 2.6.2)
  if (!p.sjuk) {
    // förkylningen av kyla, väta och trötthet (steg 9.5.1): oftare i istiden. Den svåra sjukdomen loggas när den kommit långt (sjukSvar nedan)
    if (chance(s, forkylning(ai), dtSec, 'halsa', p)) insjukna(s, p, 'forkylning');
  }
  if (p.health <= 0) { die(s, p, p.hunger <= 0 ? 'svalt' : p.warm < KROPP.frysdod ? 'kyla' : p.torst <= 0 ? 'torst' : (p.poisonUntil ?? 0) > now ? 'svamp' : skorbjugg(p) > 0 && !isSick(p, now) ? 'skorbjugg' : 'sjukdom'); return true; }
  // kroppen som slits ut (Gompertz, per år = per dygn). Olyckorna kommer bara ur OLYCKOR och OLYCKOR_LAGE (halsa.ts), så den här
  // döden är ålderdom, och för de små en barnsjukdom (steg 15.1.111, Döden)
  const q = KROPP.dodBas + KROPP.dodAlder * Math.exp(KROPP.dodTakt * a) + (a < ALDER.barnsjuk ? KROPP.dodBarn : 0);
  if (chance(s, q / 86400, dtSec, 'halsa', p)) { die(s, p, a < ALDER.barnsjuk ? 'barnsjukdom' : 'alderdom'); return true; }
  const dod = halsaSteg(s, p, dtSec); // kroppen: olyckor i farligt arbete, blödning och läkning (steg 2.5.1)
  if (dod) { die(s, p, dod); if (dod === 'bistick') binDod(s, p); fearPlace(s, p, DODSORSAKER[dod].text); return true; }
  return false;
}

// dödsorsaken för varje sjukdom (steg 9.5.1): den heter som raden, och svampförgiftningen som förut
// hur långt graviditeten gått, 0–1 (steg 8.1.11), eller inget
// tiden kvar tills barnet föds (ms), för panelen (steg 9.2.70)
export const gravidKvar = (p: Person, now: number) => p.pregnantSince === undefined ? undefined : Math.max(0, p.pregnantSince + STEG.dragtid * DAY - now);
export const gravidDel = (p: Person, now: number) => p.pregnantSince === undefined ? undefined : Math.min(1, (now - p.pregnantSince) / (STEG.dragtid * DAY));
// viljan att skaffa barn: hur många byn är, maten i dygn, maten den haft (barnMat i liv.ts) och seden Barn (−1 till 1). En by i
// världen (rad.ts, steg 11.3.2) använder samma vilja och födslarna per år för en kvinna som kan få barn
export const fodVilja = (pop: number, matDygn: number, barnMatF: number, sed: number) => birthWish(pop) * clamp(matDygn / STEG.matDygn, STEG.matMin, 1) * barnMatF * (1 + STEG.sedBarn * sed);
export function fodslarPerAr(vilja: number) { const c = STEG.chans * vilja; return c / (1 + c * (STEG.dragtid + STEG.mellanFodslar)); }
// graviditet: en kvinna med partner kan bli gravid; viljan styrs av hur många byn är, maten och sederna
// medan modern föder (steg 13.10.29) äter hon det som ligger inom räckhåll (needLadder) och dricker byns drycker när hon är hemma, som alla andra; resten
// bär någon dit (vattenVal, matTillFange). Hjälpen räknas bara medan hjälparen står kvar hos henne, annars kan någon annan komma
function foderSteg(s: State, p: Person) {
  const fo = p.foder!, h = fo.hjalp === undefined ? undefined : byId(s, fo.hjalp);
  if (fo.hjalp !== undefined && !(h && h.task?.act === 'forlossa' && h.task.ref === p.id)) fo.hjalp = undefined;
  if (torstig(p, 0) && p.task?.act === 'foder' && p.task.phase === 'do' && hemma(s, p) && dryckKrok.finns(s)) { dryckKrok.drick(s, p); count(s, 'foderDrack'); }
}
function pregnancy(s: State, p: Person, a: number, pop: number, dtSec: number) {
  const now = s.now;
  if (p.foder) { // förlossningen tar tid (steg 9.5.29)
    if (now >= p.foder.till) birth(s, p); else foderSteg(s, p);
  }
  else if (p.pregnantSince !== undefined) { if (now - p.pregnantSince > STEG.dragtid * DAY) borjaForlossning(s, p); }
  else if (p.sex === 'k' && p.partner !== undefined && a >= ALDER.gravFran && a <= ALDER.gravTill && (!p.lastBirth || now - p.lastBirth > STEG.mellanFodslar * DAY)) {
    const f = fodVilja(pop, foodDays(s), barnMat(s, pop), s.seder.v.barn);
    if (chance(s, STEG.chans * f / 86400, dtSec, 'halsa', p)) { p.pregnantSince = now; p.pregnantBy = p.partner; notis(s, 'gravid', `${p.name} väntar barn.`, [p.id]); }
  }
}

// den del av grenarna från en stam som huggs eller klyvs som följer med hem (steg 12.1.52, 13.8.4, 15.1.45): alla under grenarnas
// materialtak, och över det en allt mindre del, (taket / det byn har)², som det mjuka taket i valet; resten lämnas på marken.
// Grenarna som bränsle räknas i materialtaket (MATERIALMAL.grenar), inte i vedens
export const grenarMed = (s: State, tk: Task) => {
  const har = forradAv(s, 'grenar') + (tk.items?.grenar ?? 0), tak = materialTak(s, 'grenar');
  return har < tak ? 1 : (tak / Math.max(1e-9, har)) ** 2;
};
// den som tänder och fått slut på tändmaterialet behåller flintan och hämtar bara mer av det som fattas (steg 13.10.27). Finns
// det inget mer i förrådet ger hen upp och bär hem flintan
function merTandmaterial(s: State, p: Person, t: Task, f: Fire) {
  const hamtad = t.hamtad;
  t.hamtad = undefined;
  if (iHelaForradet(() => canLight(s, p, f), p) && hamtaForst(s, p, t)) return true;
  t.hamtad = hamtad;
  return false;
}
// Uppgiften under ett steg. Tiden i steget går åt till det som händer i tur och ordning: att avsluta och välja, att gå
// (tiden följer vägen), att arbeta i bitar och att bära hem. Det räknas likadant i spelet och vid ikappräkning; spelet
// visar bara samma rörelse (spar). Vanor och idéer växer medan man håller på
function taskStep(s: State, p: Person, a: number, t1: number, dtSec: number, learn: number, social: Person[]) {
  let left = dtSec;
  for (let n = 0; left > 1e-6 && n < 80; n++) {
    if (!alive(p)) break; // dödad mitt i steget, i en strid hen själv började (en vargjakt hen kallade till); kodgenomgången 3.10.25
    s.now = t1 - left * SEC;
    const now = s.now, light = isLight(now), t = p.task;
    if (t?.eldText && !brinnerNara(s, t.tx, t.ty, VAL.eldNara)) { t.why = eldOrd(s, t.why ?? '', t.tx, t.ty); t.eldText = undefined; } // elden har slocknat: texten säger var hen är (steg 15.1.5)
    const phaseFlip = t && t.dark !== !light && ACTS[t.act].dygn; // dag blev natt eller tvärtom
    if (t && t.phase === 'do' && t.until <= now) iRackhall(p.x, p.y, () => KLAR[t.act]?.(s, p, t, 0)); // ett träd som fällts färdigt, en yxa som gjorts klar
    const tf = t?.act === 'tanda' ? eldById(s, t.ref) : undefined, lightDone = t?.act === 'tanda' && (!tf || tf.lit || !t.brand && !t.vanda && !(t.phase === 'do' ? iRackhall(p.x, p.y, () => canLight(s, p, tf)) : iHelaForradet(() => canLight(s, p, tf), t.site ?? { x: t.tx, y: t.ty }))); // framme: det hen bär och når, som försöken (steg 11.1.75); på väg efter mer: också det som redan ligger vid eldplatsen
    const mustGo = t && nodAvbryter(p, t, a); // nöden avbryter det man håller på med (steg 15.1.4 och 15.1.181)
    const merTand = lightDone && t && tf && !tf.lit && t.phase === 'do' && t.until > now && !phaseFlip && !mustGo && merTandmaterial(s, p, t, tf);
    if (!merTand && (!t || (t.until <= now && t.phase !== 'back') || ((phaseFlip || mustGo) && t.phase !== 'back') || lightDone)) {
      if (t && barHem(t) && t.act !== 'elda') { t.phase = 'back'; const d = backSpot(s, t); t.tx = d.x + sida(p, 0.2); t.ty = d.y + sida(p, -0.2); } // samma lagerplatser som när flytten valdes, och redskapet läggs tillbaka (steg 12.1.49)
      else if (!(t?.med !== undefined && t.phase === 'do' && !phaseFlip && !mustGo && t.until <= now && skiljsAt(s, p))) chooseTask(s, p); // efter samtalet går man isär en bit (steg 4.5.6.7)
    }
    if (spar.pa) sparaUppgift(p, now); // (bara för att visa)
    const tk = p.task!, d = ACTS[tk.act];
    let used: number;
    if (tk.phase === 'go' || tk.phase === 'back') {
      if ((tk.act === 'varda' && tk.phase === 'go' && !tk.site) || (tk.act === 'vatten' && tk.phase === 'back' && !tk.falt && !tk.ho) || d.foljer && tk.phase === 'go') vardMal(s, p, tk); // den skadade, eller den man går till, kan ha flyttat sig
      const w = walk(s, p, tk, left);
      used = w.used;
      if (tk.bar !== undefined && !barMed(s, p, tk)) { left -= used; continue; } // den som bärs följer med
      if (w.framme) { s.now = t1 - (left - used) * SEC; arrive(s, p, tk, isLight(s.now)); }
    } else if (d.tur && tk.phase === 'do') used = turSteg(s, p, tk, left); // promenaden (steg 6.2.8)
    else if (d.runda && tk.phase === 'do') used = rundaSteg(s, p, tk, left, a, learn); // också den som letar flinta eller stenar, bland stenarna (steg 4.5.6.3)
    else {
      // arbetet i bitar: till uppgiftens slut, till dess bördan bärs hem, men aldrig längre än BIT sekunder åt gången
      used = Math.min(left, Math.max(0, (tk.until - now) / SEC), BIT);
      s.now = t1 - (left - used) * SEC;
      // arbetet når bara det som ligger inom räckhåll och det hen bär dit (steg 11.1.74, Hämtningen)
      iRackhall(p.x, p.y, () => {
        MEDAN[tk.act]?.(s, p, tk, used);
        if (d.arbete && p.task === tk && tk.phase === 'do') workStep(s, p, tk, used, a, learn);
      });
      // (bygget kan just ha skickat iväg personen efter mer material)
      if (tk.phase === 'do' && (d.hantverk || d.fardighet)) ovning(p, hantSkill(p, tk), used / HOUR_S * STEG.ovningHant * learn); // handlingens färdighet (steg 13.9.7)
      if (d.vandra) wear(groundOf(s), tileOf(tk.tx, tk.ty), MARK.nott * STEG.markNot * STEG.vandraNot * d.vandra.v * used); // man rör sig på platsen
    }
    if (spar.pa && tk.phase !== 'go') sparaUppgift(p, t1 - (left - used) * SEC); // det som plockats syns när biten är klar (steg 6.1.1)
    // vana: tiden räknas mot yrkestaggar
    const hf = Math.exp(-used * SEC / HABIT_FADE);
    addHabit(p, tk.act, hf, used / HOUR_S);
    if (p.paus || tk.paus) p.paus = (p.paus ?? 0) * hf + (tk.paus ? used / HOUR_S : 0); // pauserna för sig (steg 11.1.72), samma blekning som vanorna
    // den som arbetar kommer så småningom på hur det kan göras bättre; man funderar också på vägen dit och hem
    thinkWhileWorking(s, p, tk.act, used);
    arbetaBredvid(s, p, tk, used); // nivå 3 och lärlingen lär sig av den som kan och arbetar nära (steg 4.2.3.2–4.2.3.3)
    left -= used;
  }
  s.now = t1;
  spara(s, p);
  if (kanPrata(s, p)) social.push(p); // inte den som brottas eller är med på en ritual (steg 9.2.100)
}

// var och en går lite vid sidan av, så att de inte täcker varandra
const sida = (p: Person, f: number) => (((p.id * 37) % 7) - 3) * f / 3;
// vägarna mellan två rutor sparas en stund: stigarna ändras långsamt, så de räknas om var fjärde timme och när något byggs
const vagar = new WeakMap<State, { key: string; m: Map<number, number[] | null> }>();
// vägarna som räknats under de fyra timmarna följer med till arbetaren, så att den går samma väg som sidan hade gått (steg 12.1.248)
TIMMINNEN.vagar = { ut: s => { const c = vagar.get(s); return c && { key: c.key, m: [...c.m] }; }, in: (s, v) => { const o = v as { key: string; m: [number, number[] | null][] }; vagar.set(s, { key: o.key, m: new Map(o.m) }); } };
function pathFor(s: State, g: ReturnType<typeof groundOf>, x0: number, y0: number, x1: number, y1: number) {
  // under en brand ändras vägarna med elden (steg 9.2.136): de räknas om varje gång, och den som är instängd går ut genom elden
  const is = isKost(s); // över sjöns is när den ligger (steg 12.1.209)
  if (g.brand) { stationRutor(s); return findPath(g, x0, y0, x1, y1, false, is) ?? findPath(g, x0, y0, x1, y1, true, is); } // stänger elden in en, går man ut genom den
  const key = `${Math.floor(s.now / (4 * HOUR))},${s.byggV ?? 0},${isNiva(s)}`;
  let c = vagar.get(s);
  if (c?.key !== key) vagar.set(s, c = { key, m: new Map() });
  const k = tileOf(x0, y0) * W * H + tileOf(x1, y1);
  let v = c.m.get(k);
  if (v === undefined) { stationRutor(s); c.m.set(k, v = findPath(g, x0, y0, x1, y1, false, is)); } // en hylla byggd i det här steget räknas med
  return v ? v.slice() : null; // null = ingen väg dit
}
// att gå mot målet ruta för ruta runt vatten, gärna längs stigar. Ger tiden det tog och om man kom fram
// arbetaren står framför rutan hen arbetar på, aldrig i den (steg 9.2.47): stubben och graven grävs från en granne, huden
// hängs från rutan utanför dörröppningen och byggrutan byggs från en granne. Målet blir den grannruta man kan stå på som ligger
// närmast, och arbetet gäller fortfarande rutan (tx, ty)
function malFor(s: State, p: Person, tk: Task): { x: number; y: number } {
  if (!ACTS[tk.act]?.framfor || tk.phase !== 'go' || tk.site) return { x: tk.tx, y: tk.ty };
  // bygget: grannrutan till själva byggrutan, inte till platsen intill den (siteOf), så att man står intill väggen (steg 9.2.90)
  const bb = tk.act === 'bygga' ? bitById(s, tk.ref) : undefined;
  const X = bb ? bb.x : Math.floor(tk.tx), Y = bb ? bb.y : Math.floor(tk.ty);
  let bast: { x: number; y: number } | undefined, bd = Infinity;
  for (const [dx, dy] of GRANNAR4) {
    const x = X + dx, y = Y + dy;
    if (!inMap(x, y) || blocked(s, x, y)) continue; // (blocked tar också vattnet)
    if (bb && bitAt(s, x, y)?.k === 'vagg') continue; // inte där en vägg ska stå: den byggs kanske medan man står där
    const d = Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y);
    if (d < bd) { bd = d; bast = { x: x + 0.5, y: y + 0.5 }; }
  }
  return bast ?? { x: tk.tx, y: tk.ty };
}
const vagNycklar = new WeakMap<Task, { x: number; y: number; v: number; key: string }>();
function walk(s: State, p: Person, tk: Task, left: number) {
  const g = groundOf(s);
  if (g.brand && tk.path?.some(i => g.brand![i] === 1)) tk.pk = undefined; // en ruta på vägen började brinna: vägen söks om (steg 9.2.136)
  // (nyckeln byggs bara om när målet eller byggversionen har ändrats: den frågas i varje steg av varje som går)
  const bv = (s.byggV ?? 0) * 8 + isNiva(s); // och isen: när den lägger sig, byter nivå eller går upp söks vägen om (steg 12.1.209)
  let nk = vagNycklar.get(tk);
  if (!nk || nk.x !== tk.tx || nk.y !== tk.ty || nk.v !== bv) vagNycklar.set(tk, nk = { x: tk.tx, y: tk.ty, v: bv, key: `${tk.tx.toFixed(2)},${tk.ty.toFixed(2)},${bv}` }); // en ny vägg kan stänga vägen
  const key = nk.key;
  if (tk.pk !== key) {
    tk.pk = key;
    const m = malFor(s, p, tk); tk.mx = m.x; tk.my = m.y;
    const v = pathFor(s, g, p.x, p.y, m.x, m.y), f = eldPlats(s);
    // målet går inte att nå (en ö, ett förråd bakom en översvämning): man lägger ner det man bär och väljer något annat. Bara
    // den som själv är avskuren från lägret går rakt över. Den som bär en skadad eller vatten till någon går inte ifrån det
    const bara = tk.phase === 'back' && !LAMNA[tk.act];
    if (!v && (tk.phase === 'go' || bara) && pathFor(s, g, p.x, p.y, f.x + 0.5, f.y + 0.5)) { avbryt(s, p); return { used: Math.min(left, BIT), framme: false }; }
    // nästa ruta på en runda eller promenad som inte går att nå (på andra sidan vattnet): rundan är slut, och man går inte rakt över
    if (!v && tk.hopp && tk.kring) { tk.hopp = undefined; tk.tx = p.x; tk.ty = p.y; tk.pk = undefined; tk.rikt = (tk.rikt ?? 0) + Math.PI; return { used: Math.min(left, BIT), framme: false }; } // promenaden: man vänder bort från det som stängde vägen (steg 9.2.84)
    if (!v && tk.hopp) { tk.hopp = undefined; tk.tx = p.x; tk.ty = p.y; tk.pk = undefined; tk.until = Math.min(tk.until, s.now); return { used: Math.min(left, BIT), framme: false }; }
    tk.path = v ?? [];
  }
  const off = sida(p, 0.18), fart = kroppFart(p, s.now, barKropp(tk)), t0 = s.now; // åldern, skadorna, yrseln, att kravla och att bära någon, också en död på väg till graven (gångfartens register, gang.ts)
  let budget = fart * left;
  const sm = smidig(p, s.now), snoF = snoFart(s, p), fo = fordonI(s, tk); // snön på marken (steg 7.7.3), och kälken i bördan (steg 10.10.2)
  const klocka = () => t0 + (fart * left - budget) / fart * SEC;
  if (budget <= 0) return { used: left, framme: false };
  // punkt för punkt längs vägen (var och en lite vid sidan av) och sist till målet. Marken nöts där man går
  for (;;) {
    const sist = !tk.path?.length, i = sist ? 0 : tk.path![0];
    const wx = sist ? tk.mx ?? tk.tx : (i % W) + 0.5 + off, wy = sist ? tk.my ?? tk.ty : Math.floor(i / W) + 0.5 - off;
    const ci = tileOf(p.x, p.y), sp = rutFart(p, g, ci, sm) * morkFart(s, p) * (snoF < 1 && !roofed(s, p.x, p.y) ? 1 - (1 - snoF) * (1 - snoSmalt(s, p.x, p.y)) : 1) * (fo ? fartI(s, fo, p.x, p.y) : 1); // i totalmörker går man långsammare (ljus.ts), och ute i snön utom där den smält runt en eld (steg 10.2.51, som snoPaRutan i gang.ts); kälken på barmark (fordon.ts)
    if (gangVakt.lyss) gangVakt.lyss(s, p, fart * sp, morkFart(s, p) < 1); // vakten i testerna (steg 9.2.101)
    const dx = wx - p.x, dy = wy - p.y, d = Math.hypot(dx, dy), can = budget * sp;
    wear(g, ci, MARK.nott * STEG.markNot * Math.min(d, can));
    if (d > can) { p.x += dx / d * can; p.y += dy / d * can; if (fo) dragdjurBredvid(p, fo); if (tk.act === 'resa') ridBredvid(s, p); return { used: left, framme: false }; } // tiden räckte inte hela vägen; dragdjuret går bredvid (steg 10.10.3)
    p.x = wx; p.y = wy; budget -= d / sp; if (fo) dragdjurBredvid(p, fo); if (tk.act === 'resa') ridBredvid(s, p); // ryttaren sitter på hästen ut ur byn (steg 11.11.4)
    if (sist) { tk.path = undefined; tk.pk = undefined; spara(s, p, klocka()); return { used: left - budget / fart, framme: true }; }
    tk.path!.shift(); spara(s, p, klocka());
    if (budget <= 0) return { used: left, framme: false };
  }
}
// promenaden (steg 6.2.8): en runda i vanlig gångfart mellan punkter på land inom tur.r rutor från platsen man valde (kring),
// och vid en del av punkterna ett stopp där man ser sig omkring (lookAround). När tiden är slut väljer man något annat
// (oftast hem). Punkterna väljs med hash3, så att spelet och ikappräkningen går samma väg
function turSteg(s: State, p: Person, tk: Task, left: number, n = 0): number {
  const r = ACTS[tk.act].tur!, now = s.now, slut = Math.max(0, (tk.until - now) / SEC);
  tk.kring ??= { x: Math.floor(tk.tx), y: Math.floor(tk.ty) };
  if (tk.hopp) {
    const w = walk(s, p, tk, Math.min(left, Math.max(slut, 1e-3))), used = Math.max(w.used, 1e-3);
    if (p.task !== tk || !w.framme) return used;
    tk.hopp = undefined;
    // vid en del av punkterna ser man sig omkring, utan att stanna: promenaden stannar aldrig på vägen (steg 10.2.80)
    if (hash3(p.id, tileOf(tk.tx, tk.ty), Math.floor(now / SEC)) < r.se) lookAround(s, p, tk.tx, tk.ty);
    return used;
  }
  tk.plock = undefined;
  const q = n < 2 ? turPunkt(s, p, tk, r.r) : undefined;
  if (!q) { tk.until = now; return 1e-3; } // ingen punkt att gå till: promenaden är slut, och hen väljer något annat i stället för att stå still
  tk.tx = q.x + 0.5; tk.ty = q.y + 0.5; tk.hopp = true; tk.pk = undefined;
  return turSteg(s, p, tk, left, n + 1);
}
// nästa punkt på promenaden (steg 9.2.84): en lång rak sträcka (TUR.langd av r) ungefär åt samma håll som man redan går
// (inom TUR.spann åt sidan), så att man inte vänder fram och tillbaka i en liten ruta. Skulle punkten hamna mer än r rutor från
// kring vänder man in mot mitten. Punkten ligger på land, inte i en vägg, ett hus, vattnet eller en station, och dit finns en
// väg. Går inget åt det hållet prövas de andra hållen, och sist bort från det man fastnat på (tk.rikt vänds i walk)
const TUR = balans('promenad', { langd: 0.45, langdSpann: 0.3, spann: 0.5, ovrigt: 0.5, sving: 1.6 }); // sträckan som del av r, hur mycket den får svänga (radianer) först och sedan för varje försök, och svängen vid områdets kant
function turPunkt(s: State, p: Person, tk: Task, r: number) {
  const m = getMap(s.seed), g = groundOf(s), c = tk.kring!, hit = tileOf(p.x, p.y), t = Math.floor(s.now / SEC);
  tk.rikt ??= hash3(p.id, 31, t) * Math.PI * 2;
  for (let k = 0; k < 10; k++) {
    const h1 = hash3(p.id, k, t), h2 = hash3(p.id + 7919, k, t);
    // de första försöken åt samma håll, sedan allt bredare
    const bredd = k < 5 ? TUR.spann : TUR.spann + (k - 4) * TUR.ovrigt;
    let v = tk.rikt + (h1 - 0.5) * 2 * bredd;
    const d = r * (TUR.langd + h2 * TUR.langdSpann);
    let x = p.x + Math.cos(v) * d, y = p.y + Math.sin(v) * d;
    if (Math.hypot(x - c.x - 0.5, y - c.y - 0.5) > r) { // utanför området: man svänger av åt den sida som leder in, som längs en kant
      const inV = Math.atan2(c.y + 0.5 - p.y, c.x + 0.5 - p.x), dv = Math.atan2(Math.sin(inV - tk.rikt), Math.cos(inV - tk.rikt));
      v = tk.rikt + Math.sign(dv || 1) * TUR.sving + (h1 - 0.5) * TUR.spann;
      x = p.x + Math.cos(v) * d; y = p.y + Math.sin(v) * d;
      if (Math.hypot(x - c.x - 0.5, y - c.y - 0.5) > r) continue; // fortfarande utanför: nästa försök
    }
    const tx = Math.floor(x), ty = Math.floor(y);
    if (!inMap(tx, ty) || ty * W + tx === hit || m.tiles[ty * W + tx] === T.Vatten || m.tiles[ty * W + tx] === T.Sten || blocked(s, tx + 0.5, ty + 0.5) || stationAt(s, tx, ty)) continue;
    if (pathFor(s, g, p.x, p.y, tx + 0.5, ty + 0.5)) {
      const ny = Math.atan2(ty + 0.5 - p.y, tx + 0.5 - p.x), dv = Math.abs(Math.atan2(Math.sin(ny - tk.rikt), Math.cos(ny - tk.rikt)));
      count(s, 'promStracka'); if (dv > Math.PI * 2 / 3) count(s, 'promVander'); // sträckorna och hur ofta man vänder (scenariot promenad)
      tk.rikt = ny; return { x: tx, y: ty };
    }
  }
  tk.rikt += Math.PI; count(s, 'promVander'); // inget gick: nästa gång bort härifrån
  return undefined;
}
// där man ställer sig för att lägga på ved: nedanför elden, eller vid en annan sida om rutan nedanför är vatten eller en
// vägg (en brasa vid stranden, steg 2.12.6: den som bar ved dit gick ut i vattnet)
function vidElden(s: State, p: Person, at: { x: number; y: number }) {
  const sidor = [{ x: at.x + 0.5 + sida(p, 0.6), y: at.y + 1.2 }, { x: at.x + 0.5 + sida(p, 0.6), y: at.y - 0.2 }, { x: at.x - 0.2, y: at.y + 0.5 }, { x: at.x + 1.2, y: at.y + 0.5 }];
  return sidor.find(v => !blocked(s, v.x, v.y)) ?? sidor[0];
}
// framme vid målet: vid förrådet, vid bygget, hemma med bördan eller på platsen där arbetet görs
function arrive(s: State, p: Person, tk: Task, light: boolean) {
  const now = s.now;
  if (tk.act === 'tanda' && tk.brand && tk.phase === 'go' && !(tk.hamta && tk.site)) { // (vid stacken hämtas först, nedan)
    // eld från en eld som brinner (steg 10.6.12): vid elden som brinner tänds 1 gren, och vid eldstaden tar den fyr direkt
    const f = eldById(s, tk.ref);
    if (tk.brand === 'hamta') {
      if (hamtaForst(s, p, tk)) return; // grenen bärs från förrådet (steg 11.1.75)
      taMed(s, p, tk); if (tk.site) return; // det som behövs vid den nya elden tas med härifrån, och saknas något går hen till nästa stack
      const e = tk.kalla === -1 ? s.fire : eldById(s, tk.kalla);
      if (!f || f.lit || !e?.lit || iRackhall(p.x, p.y, () => getable(s, p, 'grenar')) < 1) { p.task = undefined; return; }
      iRackhall(p.x, p.y, () => takeMaterial(s, p, 'grenar', 1, true));
      tk.brand = 'bar'; const at = vidEld(s, f, sida(p, 0.6), 1.3); tk.tx = at.x; tk.ty = at.y;
    } else { if (f) iRackhall(p.x, p.y, () => brandTand(s, p, f, tk.kalla === undefined ? undefined : tk.kalla === -1 ? s.fire : eldById(s, tk.kalla))); p.task = undefined; } // med det hen bär (steg 11.1.75)
    return;
  }
  if (tk.act === 'elda') {
    if (tk.phase === 'go') {
      // vid förrådet: ta en famn ved och gå till elden. Byns och sin egen, eller den andras (stöld i yttersta nöd, behov.ts)
      // till elden task.ref (den första när ref saknas)
      const fran = byId(s, tk.fran), e = eldById(s, tk.ref);
      // så mycket elden vill ha, som p orkar bära och kan få (steg 10.2.7), i hela vedträn
      // ur stackarna hen står vid (steg 11.1.75)
      const bransle = iRackhall(p.x, p.y, () => fuelFor(s, p, fran));
      // stacken här har tömts sedan hen valde den: till nästa stack där hen får ta, som när en hög väljs (fetchSpot)
      const dit = bransle < 1 && e && fuelFor(s, p, fran) >= 1 ? narmasteMed(s, p, ['ved', 'grenar', 'torv', 'blottorv'], undefined, (x, y) => iRackhall(x, y, () => fuelFor(s, p, fran)) >= 1) : undefined;
      if (dit) { tk.tx = dit.x; tk.ty = dit.y; return; }
      const n = !e || e.fuel >= fireWant(s, e) ? 0 : Math.max(Math.min(1, bransle), Math.floor(Math.min(fireWant(s, e) - e.fuel, capacity(s, p) / viktOf('ved'), bransle)));
      if (n <= 0 || !e) p.task = undefined;
      else {
        const at = eldXY(s, e);
        tk.ag = { ved: {} }; tk.tog = {}; tk.carry = iRackhall(p.x, p.y, () => takeFuel(s, n, p, tk.ag!.ved, fran, tk.tog)); tk.phase = 'back'; const v = vidElden(s, p, at); tk.tx = v.x; tk.ty = v.y;
        if (fran) stole(s, p, fran, VED.id, tk.carry); else if ((tk.ag.ved[p.id] ?? 0) > 1e-9) noticeTheft(s, p, VED.id);
      }
    } else { const e = eldById(s, tk.ref); if (e) addFuel(s, p, tk.carry, e); else giveBack(s, tk.carry, tk.tog); tk.carry = 0; p.task = undefined; }
  } else if (tk.act === 'bygga' && tk.phase === 'go' && tk.site) {
    // vid lagret: ta materialet och gå till bygget
    const b = bitById(s, tk.ref), k = b && MATERIAL[b.m].item, har = (k && tk.items?.[k]) || 0, n = b ? needOf(b) - har : 0;
    if (!b || !k || avail(s, k, p, b.hus, b) < n) avbryt(s, p); // det man redan bar läggs i lagret där man står
    else { // det som togs, inte mer, till det man redan har i händerna. Byggaren tar också till nästa bitar av samma material i
      // samma hus, så mycket hen orkar bära (steg 10.2.21 C), så att hen inte går till lagret för varje bit
      const mer = Math.max(0, Math.min(byggMer(s, b, k), Math.floor(capacity(s, p) / viktOf(k)) - har - n, Math.floor(avail(s, k, p, b.hus, b) - n)));
      // ur stackarna hen står vid (steg 11.1.76); räckte de inte till biten går hen till nästa stack med materialet
      tk.kom ??= {}; const kom = tk.kom, ag = iRackhall(p.x, p.y, () => takeForHouse(s, p, b.hus, k, n + mer, kom, b)), mitt = (tk.ag ??= {})[k] ??= {};
      for (const id in ag) mitt[id] = (mitt[id] ?? 0) + ag[id];
      tk.items = { ...tk.items, [k]: har + sumOf(ag) };
      const nasta = sumOf(ag) > 0 && har + sumOf(ag) < needOf(b) - 1e-9 ? narmasteMed(s, p, [k], undefined, (x, y) => iRackhall(x, y, () => avail(s, k, p, b.hus, b)) >= 1) : undefined;
      if (nasta) { tk.tx = nasta.x; tk.ty = nasta.y; return; }
      tk.tx = tk.site.x; tk.ty = tk.site.y; tk.site = undefined;
    }
  } else if (tk.hamta && tk.site && tk.phase === 'go') hamtat(s, p, tk); // vid stacken: materialet till arbetet (steg 11.1.74, hamtning.ts)
  else if (tk.phase === 'back' && LAMNA[tk.act]) LAMNA[tk.act]!(s, p, tk); // framme hos den man bär till (LAMNA)
  else if (tk.phase === 'back') {
    if (tk.act !== 'stallaFram' || !stallaFramme(s, tk)) storeLoad(s, tk, p.x, p.y, tk.lon === 'forradet' ? BYN : p.id); // det som bärs hem i arbete för byns förråd mot lön blir byns (steg 10.5.9)
    // ett arbetspass är klart: gå tillbaka och fortsätt om arbetet inte är slut och dagen inte vänt
    const r = tk.res;
    if (r && r.until > now + STEG.kvarMin * MIN && tk.dark === !light) { tk.phase = 'go'; tk.tx = r.x; tk.ty = r.y; tk.until = r.until; tk.res = undefined; }
    else p.task = undefined;
  } else {
    if (hamtaForst(s, p, tk)) return; // materialet hämtas först (steg 11.1.74, hamtning.ts)
    tk.phase = 'do'; tk.hopp = undefined; tk.plock = undefined; if (tk.act === 'bara') { const fo = fordonI(s, tk); pickUp(s, p, tk, fo ? rymsI(fo) : ryms(s, p)); tk.until = now; }
    if (tk.act === 'flyttaeld') tk.until = now + ELDFLYTT.min * MIN; // vid elden: släcka den och bära stenarna (eldflytt.ts); den som avbryts börjar om
    iRackhall(p.x, p.y, () => startWork(s, p, tk)); // ett redskap eller ett träd: arbetet räknas härifrån, och det påbörjade fortsätter (med det som ligger inom räckhåll, steg 11.1.74)
  }
}

// det ett arbete för byn ger, per handling. y = det platsen gav den här biten (takten gånger platsens värde rich), rd = redskapet
// i handen, a = åldern, bar = lägg något bredvid bördan (grenar, rötter, svamp). Svarar raden true har den själv lagt det i bördan
// delar = platsens värde per lager före uttaget (richnessDelar), när arbetet tar ur flera lager
interface Arbetsbit { y: number; rich: number; delar?: number[]; rd: ReturnType<typeof toolRow>; dtSec: number; a: number; bar: (k: string, n: number, plockat?: true) => void; slag?: string } // plockat = det rundan plockade, det turen gäller (steg 15.1.44)
const UTFALL: Partial<Record<Act, (s: State, p: Person, tk: Task, b: Arbetsbit) => boolean | void>> = {
  // fiske med händerna, spjut eller metspö: ett försök i taget, och fiskaren går hem med varje fångst
  fiske: (s, p, tk, { rd, dtSec, a, bar }) => {
    tk.prog = (tk.prog ?? 0) + dtSec;
    if (tk.mortBete === undefined) { const agn = mayTake(s, p, 'fiskrens') + iBordan(p, 'fiskrens') >= 1; tk.mortBete = agn || ownsAmount(s, p, 'mort') + bordanAv(p, p.id, 'mort') >= 1 ? 1 : 0; if (tk.mortBete) { use(s, p, agn ? 'fiskrens' : 'mort', 1); count(s, agn ? 'fiskrensBete' : 'mortBete'); } } // en mört per fisketur (steg 7.4.4), eller fiskrens som agn (steg 9.8.7)
    // ligger isen hugger man först upp ett hål (is.ts), och sedan pimplar man genom det. Går det inte slutar man
    if (tk.hal === undefined && islagt(s)) {
      const h = halVal(s, p, tk.tx, tk.ty);
      if (!h) { tk.until = s.now; return; }
      tk.hal = halMin(s, p, tk.tx, tk.ty) * 60;
      halGjort(s, p, tk.tx, tk.ty); // isborren slits (steg 12.2.11)
      if (forstaGang(s, 'pimplade')) log(s, `${p.name} högg upp ett hål i isen med ${h.namn} och pimplade, byns första fiske genom isen.`, 'world', [p.id]);
    }
    if (tk.hal) { const d = Math.min(tk.hal, tk.prog); tk.hal -= d; tk.prog -= d; if (tk.hal > 0) return; }
    const ageF = arbetsformaga(p, a, s.now);
    while (tk.prog >= TRY_SEC) {
      tk.prog -= TRY_SEC;
      if (rd?.bete && (tk.mask ?? 0) < 1) { tk.mask = (tk.mask ?? 0) + REDSKAP.maskPerGrav; continue; } // gräver fram mask först
      const napp = p.fiske?.n ?? 0;
      const fick = handFish(s, p, tk.tx, tk.ty, ageF * (tk.mortBete ? MJARDE.beteNapp : 1), rd);
      if (fick) { // arten efter årstiden (steg 7.4.3): gäddan sliter dubbelt så mycket på redskapet
        const k = valjFisk(s, p, false, rd?.don === 'nat');
        if (k === 'abborre') tk.carry += fick;
        else { bar(k, fick); count(s, 'fisk_' + k); if (rd) wearUsed(s, p, FISKAR[k].slit - 1); }
      }
      if (rd?.bete && (p.fiske?.n ?? 0) > napp) tk.mask!--; // varje napp tar en mask
      if (rd) wearUsed(s, p, 1);
    }
    // stranden är utfiskad (steg 2.12.4): fiskaren ser det, minns det och går till en annan plats vid vattnet. Finns ingen bättre slutar hen
    // (hen ser det först när hen fiskat en stund där, en bit om BIT sekunder, hur korta byns steg än är)
    tk.koll = (tk.koll ?? 0) + dtSec;
    if (tk.koll >= BIT - 1e-6 && (tk.koll = 0, true) && tomtFor(s, p, 'fiske', richness(s, 'fiske', tk.tx, tk.ty))) { // också den som bär fisk (steg 15.1.132)
      lookAround(s, p, tk.tx, tk.ty);
      const sp0 = spotFor(s, 'fiske', p), sp = freeNear(s, sp0.x, sp0.y); // aldrig i en husvägg
      if (Math.hypot(sp.x - tk.tx, sp.y - tk.ty) > 1.5) { tk.tx = sp.x; tk.ty = sp.y; tk.phase = 'go'; tk.hal = undefined; count(s, 'fiskeByter'); }
      else tk.until = s.now;
    }
  },
  hugga: (s, p, tk, { y, bar }) => {
    const k = stocks(s).find(q => q.id === tk.ref), med = grenarMed(s, tk), got = chopStock(s, tk.ref, y, med);
    if (!got) tk.until = s.now; // stammen är slut
    else {
      tk.carry += got.ved; if (med) bar('grenar', got.grenar); laggPaRutan(s, 'grenar', got.kvar, got.x, got.y); // grenarna som blev kvar (steg 12.1.218)
      if (got.done) { tk.until = s.now; const h = k && husById(s, bitAt(s, Math.floor(k.x), Math.floor(k.y))?.hus); if (h) husKlart(s, h, p); } // stocken var det sista i huset (steg 8.1.13)
    }
    return true;
  },
  // virket (steg 4.5.5.2): varje virke tar SKOG.virkeVed av stammens trä, och grenarna följer med som när man hugger
  klyva: (s, _p, tk, { y, bar }) => {
    const med = grenarMed(s, tk), got = chopStock(s, tk.ref, y * SKOG.virkeVed, med);
    if (!got) tk.until = s.now;
    else { tk.carry += got.ved / SKOG.virkeVed; if (med) bar('grenar', got.grenar); laggPaRutan(s, 'grenar', got.kvar, got.x, got.y); if (got.done) tk.until = s.now; }
    return true;
  },
  samla: (s, p, tk, { rd, dtSec, bar, slag: plockSlag }) => {
    { // på rundan (steg 9.2.55): det som plockades, en hel sak. Allt samlande går på rundan, så slaget är alltid satt ('' medan plocket pågår)
      if (plockSlag === 'rotter') { bar('rotter', rd?.rotter ?? 1, true); count(s, 'samlat_rotter', 1); gjort(s, p, 'samlat', 1); }
      else if (plockSlag === 'sten') bar('sten', 1, true);
      else if (plockSlag === 'flinta') { // flintan vid stenarna eller i sanden: bara här hittas flinta, och då står det i loggen (steg 12.1.55)
        const ff = flintFactor(s, tk.tx, tk.ty), slut = amountOf(s, 'flinta') === 0; count(s, ff > ELD.flintaStenar ? 'flintaSten' : 'flintaAnnan'); bar('flinta', 1, true); // slut: byn hade ingen flinta (steg 15.1.117)
        if (ff > ELD.flintaStenar) observe(s, p, 'flinta', tk.tx, tk.ty);
        loggBer(s, 'l_flinta', p.id, { namn: p.name, plats: ff > ELD.flintaStenar ? 'vid stenarna' : ff > ELD.flintaSand ? 'i sanden vid stranden' : '', slut }, 'world', [p.id]);
        if (ff <= ELD.flintaSand) tecken(s, p, 'fynd', 'flintan där ingen trodde att den fanns'); // fyndet på den märkliga platsen (steg 8.5.18)
      }
      else if (plockSlag === 'kantarell' || plockSlag === 'spindling') { const f = svampPlock(s, p, plockSlag); for (const k in f) bar(k, f[k], true); }
      else if (plockSlag === 'honung') { const g = BIN.vildTim * dtSec / HOUR_S; takeFrom(s, 'honung', Math.floor(tk.tx) + 0.5, Math.floor(tk.ty) + 0.5, g); bar('honung', g, true); binStick(s, p, dtSec, BIN.vildStick * fyndAt(s, 'honung', Math.floor(tk.ty) * W + Math.floor(tk.tx))); count(s, 'honungVild', g); if (g > 0 && !s.stat?.vildboHittat && forstaGang(s, 'vildboHittat')) log(s, `${p.name} hittade ett bo med vildbin och tog honung ur det.`, 'world', [p.id]); } // vildboet (steg 10.10.15)
      else if (plockSlag) { tk.carry += 1; count(s, 'samlat_bar', 1); gjort(s, p, 'samlat', 1); }
    }
    // på rundan hittar man det andra (hö, kvistar, ägg, frön) under hela tiden ute, också gången sedan förra plocket (tk.letat)
    const pa = dtSec + (tk.letat ?? 0);
    tk.letat = undefined;
    const mal = turMal(tk), fart = ACTS[tk.act].fart ?? 1, got = forageItems(s, p, pa, fart) ?? {}, dt = pa * fart; // det som växer på platsen hittar man lika mycket fortare (steg 2.12.4); stenarna och flintan plockas som saker på rundan
    if (mal) { for (const k of mal) if (got[k]) bar(k, got[k]); return true; } // den som gått ut efter hö, kvistar eller grenar tar bara det (steg 12.1.39, 13.10.7)
    for (const k in got) bar(k, got[k]); // tändmaterialet först, så att mossan inte tar händerna från den som hämtar det
    for (const v of VILDA_ORTER) if (!v.vill || v.vill(s)) { const r = vildNara(s, v.k, tk.tx, tk.ty); if (r) { const g = r.v * dt / HOUR_S * RUNDA.rolleka; takeFrom(s, v.k, r.x, r.y, g); bar(v.k, g); if (v.stat) count(s, v.stat, g); } }
    const vild = froFynd(s, p, tk, dt); // frön och lite mat från de vilda grödorna (steg 2.10.2, 3.10.23.8)
    for (const k in vild) bar(k, vild[k]);
    if (ageIndex(s) === VAR) bar('agg', FAGEL.agg * dt / HOUR_S); // fåglarnas ägg, som man ibland hittar på våren (steg 6.6.3)
    return true;
  },
  // jakten (steg 3.7.3, jakt.ts): ett försök i taget, där jägaren smyger sig fram till en kanin och sticker eller kastar.
  // Kaninen fyller famnen och bärs hem hel
  jakt: (s, p, tk, { dtSec }) => {
    // Försöket planeras när det börjar och avgörs när det är slut (Björn efter v159): prog = sekunder sedan det började
    tk.prog = (tk.prog ?? 0) + dtSec;
    if (tk.jf && s.now - tk.jf.t > (JAKT.smygSek + tk.jf.extra + dtSec + 1) * SEC) { tk.jf = undefined; tk.prog = dtSec; } // jägaren gick ifrån försöket: börja om
    while (!jaktBar(tk)) {
      if (!tk.jf && jaktForsok(s, p, tk, s.now - tk.prog * SEC) < 0) { tk.prog = 0; break; } // ingen kanin nära: hen går dit det finns kaniner eller letar vidare
      const lang = JAKT.smygSek + tk.jf!.extra;
      if (tk.prog < lang) break;
      tk.prog -= lang; jaktKlar(s, p, tk);
      if (p.task !== tk) return true; // vildsvinet vände sig mot jägaren: striden tar över (steg 10.10.4)
    }
    if (jaktBar(tk)) tk.prog = 0;
    return true;
  },
};
// hur mycket arbetet ger i sekunden just nu, och platsens värde (del) när platsen har ett förråd
// utan yxa samlas grenar på marken (ved, takt 2); med yxa huggs trä ur en fälld stam (hugga, takt 1,5). Båda har arbetet ved
// som bas (handlingar.ts). På den tid det tar att hugga en ved samlas alltså 1,33 grenar, värda 0,53 ved som bränsle (GREN)
// bär, rötter och vilt: platsen ger mindre ju mer som redan tagits där
// (platsens värde räknas en gång, och takeFrom delar uttaget mellan bär och rötter efter samma tal)
function arbetsTakt(s: State, p: Person, tk: Task) {
  const d = ACTS[tk.act], rd = toolRow(tk); // redskapet i handen: vad det ger och hur länge det håller står i handlingens rad
  const del = d.resurs && d.takt === undefined ? richnessDelar(s, d.resurs, tk.tx, tk.ty) : undefined, rich = del ? del.rich : 1;
  const rk = ryggKorg(s, p, tk), rygg = rk ? (rk.rad.ger ?? 1) * kvEffekt(rk.t) : 1; // ryggsäcken ger det korgen ger (steg 7.1.3)
  return { takt: workRate(s, p, tk.act) * (rd?.ger ?? 1) * (rd ? kvEffekt(redskapIHanden(s, p, tk.tool!)) : 1) * rygg * (d.takt ?? rich) * morkFart(s, p), del, rich, rd, rk }; // i totalmörker går arbetet långsammare (ljus.ts); ett bättre redskap ger lite mer (kvalitet.ts)
}
// arbete för byn (handlingar med arbete): det man får och bär, det platsen har kvar, redskapen som slits och det man lär sig.
// rundan (steg 4.5.6.1): samlaren går i full fart från ruta till ruta och stannar en kort stund där det finns något att
// plocka. Gången räknas som arbete på rutan man går till, så att en arbetstimme ger ungefär lika mycket som när man stod
// vid busken. Hittar man ingen ruta nära går man hem. Ger tiden som gått
// Rundan söker sig utåt (steg 4.5.6.2): varje ruta längre från lägret är värd drag() mer. Nyfikenheten och modet drar ut;
// bördan, hungern, törsten, tröttheten, mörkret som kommer, kylan och rädslan drar hem. Det finns inget tak: den som dras
// utåt kan gå ända till kartans kant. Barn, gamla och skadade dras mindre ut
// att vara naken känns (steg 10.2.72): den som är helt naken får sämre humör, också när ingen annan har kläder, och den som
// saknar plagg på fötterna, benen eller överkroppen får lite sämre humör för varje del som saknas
const NAKEN_DELAR: Record<string, string> = { fotter: 'fötterna', ben: 'benen', kropp: 'överkroppen' };
const kroppsdel = (plats: string) => NAKEN_PLATS[plats] ?? plats; // skjortan och rocken klär överkroppen
function stepNaken(s: State) {
  const pa = new Map<number, Set<string>>(), farg = new Map<number, Ting[]>();
  for (const t of allaTing(s)) { const r = t.bar !== undefined ? kladAv(t.k) : undefined; if (r) (pa.get(t.bar!) ?? pa.set(t.bar!, new Set()).get(t.bar!)!).add(kroppsdel(PLAGG[r.plagg].plats)); if (r && t.farg) (farg.get(t.bar!) ?? farg.set(t.bar!, []).get(t.bar!)!).push(t); }
  for (const p of living(s)) {
    if (ageOf(p, s.now) < ALDER.bygger) continue;
    const har = pa.get(p.id), saknas = Object.keys(NAKEN_DELAR).filter(d => !har?.has(d));
    if (saknas.length === Object.keys(NAKEN_DELAR).length && !har?.size) tanke(p, 'naken', s.now, { v: KLADER.naken });
    else if (saknas.length) tanke(p, 'nakenDel', s.now, { delar: och(saknas.map(d => NAKEN_DELAR[d]!)), v: KLADER.nakenDel * saknas.length });
    const gillar = farg.has(p.id) ? barGillad(p, farg.get(p.id)!) : 0; // en färg hen tycker om (steg 13.3.2)
    if (gillar > 0) tanke(p, 'barFarg', s.now, { v: FARG.tanke * gillar });
  }
}
export const RUNDA = balans('runda', {
  rolleka: 0.6, // så mycket rölleka (och blommor) per timmes samlande på en rik ruta (steg 9.7.15)
  sett: 12, // så många rutor minns man att man nyss plockat på
  sand: 0.3, // flinta finns också i sanden vid stranden: så mycket värd som en ruta vid stenarna (1)
  ut: 0.01, // dragets bas per ruta, och så här mycket till gånger nyfikenheten / 20 och modet / 20
  nyfiken: 0.04,
  mod: 0.03,
  borda: 0.06, // hemåt: gånger hur full bördan är
  behov: 0.06, // hemåt: för hunger, törst och trötthet, gånger hur långt under hälften behovet är (0–1)
  morkTim: 2, // de sista så här många timmarna före mörkret drar det hemåt, mest när det är mörkt
  mork: 0.06,
  kyla: 0.05, // hemåt i kylan, och mer för den som fryser
  svag: 0.5, // barn, gamla och skadade (hälsan under svagHalsa) dras så här mycket ut
  svagHalsa: 0.7,
  vargR: 12, // vargar och rövare så här nära en ruta skrämmer: vargRadsla vid dem, mindre längre bort och för den modige
  vargRadsla: 0.6,
  // samlandet, en gång för alla (steg 9.2.53–9.2.57): saker på rutan, ett plock i taget, och nästa mål när platsen är tom
  tandHem: 0.5, // den som hämtar tändmaterial: så många rutor längre bort kostar varje ruta längre från byns mitt (narmastTand, steg 12.1.38)
  plock: 2, // sekunder (spelets tid) att plocka upp en sak: fast och kort, inte ett balanstal; balansen sitter i mängden
  stracka: 8, // så många rutor väljer samlaren på en gång (steg 10.2.21)
  syn: 4, // så många rutor bort ser samlaren rutor med saker och går dit (synvidden)
  malR: 12, // nästa mål söks så här långt bort (bortom det hen ser), bland det hen vet eller tror om marken
  grenSaker: 2, // grenar på en skogsruta där det ligger grenar (högst), sten och flinta på en ruta vid stenarna (de som inte står i FYND)
  grenTat: 0.03, // så stor del av skogsrutorna har grenar på marken (räknat ur rutan)
  stenSaker: 3,
  flintTat: 0.01, // så stor del av rutorna vid stenarna har en flinta (i sanden mindre, efter rutans värde)
  hem: 0.04, // hem när draget drar hemåt mer än så här (bördan, hungern, törsten, tröttheten, mörkret, kylan)
  ater: 1, // en tömd ruta med grenar eller stenar får tillbaka så här många saker per dygn (år i spelet)
});
turKrok.runda = RUNDA; // samlarens tur (turPerTimme i minne.ts, steg 12.1.187)
// ---------- saker på rutan (steg 9.2.53) ----------
// Varje ruta har ett helt antal saker av det samlaren letar: bär och rötter efter rikedomen i sitt lager (FYND, saker på en full
// ruta), grenarna i skogen och stenarna och flintan vid stenarna efter rutan, minus det som plockats där (s.plockat, som växer
// tillbaka). Bilden visar samma antal (ui/vaxter.ts), så det som syns är det som går att plocka
// (nyckeln för varje slag och ruta byggs en gång: den frågas för hundratals rutor i varje val av nästa mål)
const PLOCKNYCKLAR: Record<string, string[]> = {};
const plockKey = (tk: Task, i: number) => { const slag = tk.sok ? 'sten' : ACTS[tk.act].resurs ?? 'gren'; return (PLOCKNYCKLAR[slag] ??= [])[i] ??= `${slag}:${i}`; };
const plockatPa = (s: State, key: string) => plockatKvar(s, key, RUNDA.ater);
// sakerna på rutan per lager (för bär och rötter två), eller en siffra för grenarna och stenarna
export function sakerPaRutan(s: State, tk: Task, x: number, y: number): { k: string; n: number }[] {
  if (!inMap(x, y) || gridOf(s).solid[y * W + x] === 1) return []; /* under en vägg ligger inget att plocka (samlaren ställde sig i väggen, by 1) */
  const res = ACTS[tk.act].resurs, i = y * W + x;
  // stenarna ligger flera på rutan vid stenarna; flintan är sällsynt, en på var hundrade ruta där (RUNDA.flintTat), och bara så
  // länge byn behöver flinta (som förut i forageItems, eld.ts)
  if (turMal(tk)) return []; // den som hämtar tändmaterial, hö eller grenar plockar inte bär och rötter (steg 12.1.39): hö och kvistar tas efter tiden ute
  if (tk.sok) return [{ k: letarNu(s, tk) === 'sten' ? 'sten' : 'flinta', n: sokLasare(s, tk)(x, y) }];
  // bär och rötter, och svampen som växer där (kantarellen och den giftiga spindlingen)
  // antalet är rikedomen räknad i saker, och resten avgör om det ligger en sak till (räknat ur rutan och dygnet, ingen slump),
  // så att det i snitt finns lika mycket som rikedomen säger
  if (res) { const dag = Math.floor(s.now / DAY); return lagrenPa(res).map((j, n) => ({ k: j, n: saker(s, n, i, dag, richness(s, j, x + 0.5, y + 0.5) / FYND[j].topp * (FYND[j].saker ?? 1)) })); }
  return [{ k: 'grenar', n: grenarPa(s, tk, i, groundOf(s).trees[i]) }];
}
// formlerna för sakerna på en ruta, som sakerPaRutan och sakerLasare delar: grenarna under träden (räknat ur rutan, ingen
// slump), och bär, rötter och svamp ur rikedomen v i saker, där resten avgör om det ligger en sak till (rutan och dygnet)
const grenarPa = (s: State, tk: Task, i: number, tr: number) => { const h = hash3(s.seed, i, 977), bas = tr >= FOREST && h < RUNDA.grenTat ? 1 + Math.floor(h / RUNDA.grenTat * RUNDA.grenSaker) : 0; return Math.max(0, Math.min(RUNDA.grenSaker, bas) - plockatPa(s, plockKey(tk, i))); };
const saker = (s: State, n: number, i: number, dag: number, v: number) => { const hel = Math.floor(v); return hel + (hash3(s.seed + n, i, dag) < v - hel ? 1 : 0); };
// lagren med saker på rutan för den som samlar res: bär och rötter, och svampen som växer där
const LAGREN_PA: Partial<Record<string, readonly FyndId[]>> = {};
const lagrenPa = (res: Lager) => LAGREN_PA[res] ??= [...lagren(res), ...(res === 'samla' ? ['kantarell', 'spindling', 'honung'] as FyndId[] : [])]; // honungen i vildbona räknas som svampen (steg 10.10.15)
// sakerPa för den som frågar om många rutor på en gång utan att något i byn ändras emellan (nästa mål, sträckan): väggarna, dygnet
// och det som gäller hela kartan hämtas en gång, och inga listor byggs. Samma antal som sakerPa
// stenarna eller flintan på rutan: det som bara beror på byn (vad som letas efter och om det fattas) räknas en gång
function sokLasare(s: State, tk: Task): (x: number, y: number) => number {
  const v = rutVarde(s, tk), sten = letarNu(s, tk) === 'sten'; let fattas: boolean | undefined;
  return (x, y) => {
    const i = y * W + x, w = v(x, y);
    const n = sten ? Math.floor(w * RUNDA.stenSaker + 1e-9) : hash3(s.seed, i, 991) < w * RUNDA.flintTat && (fattas ??= letaFattas(s, 'flinta') > 0) ? 1 : 0; // rutans tal först: de flesta rutor har ingen flinta
    return Math.max(0, n - plockatPa(s, plockKey(tk, i)));
  };
}
function sakerLasare(s: State, tk: Task): (x: number, y: number) => number {
  const res = ACTS[tk.act].resurs;
  if (turMal(tk)) return () => 0; // (sakerPaRutan)
  if (tk.sok) { const f = sokLasare(s, tk), solid = gridOf(s).solid; return (x, y) => !inMap(x, y) || solid[y * W + x] === 1 ? 0 : f(x, y); }
  if (!res) { // grenarna: samma tal som sakerPaRutan, utan att bygga en lista per ruta
    const solid = gridOf(s).solid, tr = groundOf(s).trees;
    return (x, y) => {
      if (!inMap(x, y) || solid[y * W + x] === 1) return 0;
      const i = y * W + x;
      return grenarPa(s, tk, i, tr[i]);
    };
  }
  const js = lagrenPa(res), rik = richnessFor(s, js), solid = gridOf(s).solid, dag = Math.floor(s.now / DAY);
  return (x, y) => {
    if (!inMap(x, y) || solid[y * W + x] === 1) return 0;
    const i = y * W + x;
    let sum = 0;
    for (let n = 0; n < js.length; n++) { const f = FYND[js[n]]; sum += saker(s, n, i, dag, rik(n, i) / f.topp * (f.saker ?? 1)); }
    return sum;
  };
}
// sakerna på marken utan en samlare (för bilden, ui/vaxter.ts och terrang.ts): det som samlas (bär, rötter och svamp) eller grenarna
const SAMLAR: Record<'samla' | 'grenar', Task> = { samla: { act: 'samla', phase: 'do', tx: 0, ty: 0, until: 0, carry: 0, why: '' }, grenar: { act: 'ved', phase: 'do', tx: 0, ty: 0, until: 0, carry: 0, why: '' } };
export const sakerPaMarken = (s: State, slag: 'samla' | 'grenar', x: number, y: number) => sakerPaRutan(s, SAMLAR[slag], x, y);
export const sakerPa = (s: State, tk: Task, x: number, y: number) => sakerPaRutan(s, tk, x, y).reduce((a, q) => a + q.n, 0);
// ett plock (steg 9.2.55): en sak tas från rutan, den som det finns mest av. Svarar med slaget, eller undefined om rutan är tom
function plockaEn(s: State, tk: Task, x: number, y: number): string | undefined {
  const fore = sakerPaRutan(s, tk, x, y).filter(q => q.k !== 'honung').sort((a, b) => b.n - a.n)[0]; // honungen tas i takt (vildboet i rundaRuta)
  if (!fore || fore.n <= 0) return undefined;
  const res = ACTS[tk.act].resurs, i = y * W + x;
  if (res && !tk.sok) {
    // uttaget i lagret tills rutan har en sak mindre (uttaget sprids lite på grannarna, takeFrom i fynd.ts)
    const u = FYND[fore.k as FyndId].uttag, steg = (u?.full ?? 1) / ((FYND[fore.k as FyndId].saker ?? 1) * 4);
    for (let n = 0; n < 40; n++) { takeFrom(s, fore.k as FyndId, x + 0.5, y + 0.5, steg); if ((sakerPaRutan(s, tk, x, y).find(q => q.k === fore.k)?.n ?? 0) < fore.n) break; }
  } else {
    const key = plockKey(tk, i), n = plockatPa(s, key);
    (s.plockat ??= {})[key] = { n: n + 1, t: s.now };
  }
  return fore.k;
}
function drag(s: State, p: Person, tk: Task) {
  const now = s.now, a = ageOf(p, now), h = hourOf(now);
  let ut = RUNDA.ut + RUNDA.nyfiken * stat(p, 'nyfikenhet', now) / 20 + RUNDA.mod * stat(p, 'mod', now) / 20;
  if (a < ALDER.vuxen || a >= ALDER.gammal || halsa(p) < RUNDA.svagHalsa) ut *= RUNDA.svag;
  const under = (v: number) => Math.max(0, 0.5 - v) * 2;
  ut -= RUNDA.borda * Math.min(1, load(tk, s) / Math.max(1, bordPlats(s, p))) + RUNDA.behov * (under(p.hunger) + under(p.torst) + under(p.rest));
  ut -= RUNDA.mork * (isLight(now) ? clamp(1 - (19 - h) / RUNDA.morkTim, 0, 1) : 1);
  ut -= RUNDA.kyla * (Math.min(1, coldOf(temperature(s))) + (p.warm < KROPP.kallt ? 1 : 0));
  const mod = clamp(MINNE.radslaMax - stat(p, 'mod', now) / 20, MINNE.radslaMin, MINNE.radslaMax);
  const hot = [...(s.vargar ?? []), ...rovarFlockar(s)]; // alla rövarflockar (steg 8.7.18)
  const fara = (x: number, y: number) => {
    let v = 0;
    for (const f of hot) { const d = Math.hypot(f.x - x - 0.5, f.y - y - 0.5); if (d < RUNDA.vargR) v += RUNDA.vargRadsla * (1 - d / RUNDA.vargR) * mod; }
    return v;
  };
  const omr = new Map<number, number>(); // rädslan per område räknas en gång
  const radsla = (x: number, y: number) => {
    const a = areaOf(x, y);
    let v = omr.get(a);
    if (v === undefined) omr.set(a, v = radslaVid(s, p, x, y));
    return hot.length ? v + fara(x, y) : v;
  };
  // ut: hur mycket det drar utåt (negativt hemåt); radsla: rädslan vid en ruta, som nastaMal räknar med
  return { ut, radsla };
}
// det en ruta ger på rundan, 0–1 (steg 4.5.6.3): bären och rötterna efter vad som finns kvar, grenarna i skogen, och för den
// som letar stenar eller flinta närheten till stenarna (som forageItems i eld.ts)
function rutVarde(s: State, tk: Task): (x: number, y: number) => number {
  const res = ACTS[tk.act].resurs;
  if (tk.sok) {
    if (letarNu(s, tk) === 'sten') { const sd = stoneDist(s.seed); return (x, y) => { const v = sd[y * W + x]; return v <= ELD.stenNara ? 1 : v <= ELD.stenMedel ? ELD.stenMedelDel / ELD.stenNaraDel : ELD.stenAnnars / ELD.stenNaraDel; }; }
    return (x, y) => { const f = flintFactor(s, x + 0.5, y + 0.5); return f > ELD.flintaStenar ? 1 : f > ELD.flintaSand ? RUNDA.sand : 0; };
  }
  if (res) return (x, y) => richness(s, res, x + 0.5, y + 0.5);
  const tr = groundOf(s).trees;
  return (x, y) => tr[y * W + x] >= FOREST ? Math.min(1, tr[y * W + x]) : 0;
}
// samlandet, en gång för alla (steg 9.2.53–9.2.57, Samlandet i designdokumentet): samlaren går till ett mål, plockar där rutan
// för rutan, en hel sak per plock efter RUNDA.plock sekunder, och går vidare till nästa ruta med saker inom synvidden. När inga
// syns är platsen färdig, och hen väljer nästa mål. Inget plockas under gången, och gången är inte arbete. Hem när bördan är full
// eller när mörkret, kylan, hungern, törsten, tröttheten eller rädslan drar hem. Flera rutor kan gå i samma bit av steget
function rundaSteg(s: State, p: Person, tk: Task, left: number, a: number, learn: number) {
  const t0 = s.now;
  let used = 0;
  for (let k = 0; k < STEG.rundaRutor && left - used > 1e-6; k++) {
    s.now = t0 + used * SEC;
    used += rundaRuta(s, p, tk, left - used, a, learn);
    spara(s, p, t0 + used * SEC); // platsen och uppgiften vid varje ruta, så att bilden går rutan till rutan (bara för att visa)
    if (p.task !== tk || tk.phase !== 'do' || tk.until <= s.now || (tk.plock ?? 0) > 1e-6) break; // hem, eller ett plock som inte är klart: nästa bit
  }
  s.now = t0 + used * SEC;
  return used;
}
// samlarens tid (steg 12.1.38): byns statistik räknar sekunderna på rundan som gång, plock och stå still utan att plocka, per
// arbete (tändmaterialet för sig): runda_gang_samla, runda_plock_ved, runda_still_tand …
const rundaArbete = (tk: Task) => turMal(tk) ? 'tand' : tk.sok ? 'leta' : tk.act;
function rundaRuta(s: State, p: Person, tk: Task, left: number, a: number, learn: number) {
  const used = rundaRutaIn(s, p, tk, left, a, learn), slag = rundaTid;
  rundaTid = 'still';
  if (used > 1e-3 + 1e-9 || slag !== 'still') {
    count(s, `runda_${slag}_${rundaArbete(tk)}`, used);
    // det längsta hen stått still utan att plocka i ett svep: tiden sedan hen senast gick eller plockade
    tk.still = slag === 'still' ? (tk.still ?? 0) + used : undefined;
    if (tk.still) { const k = `runda_stillMest_${rundaArbete(tk)}`; (s.stat ??= {})[k] = Math.max(s.stat[k] ?? 0, tk.still); }
  }
  return used;
}
let rundaTid: 'gang' | 'plock' | 'still' = 'still';
function rundaRutaIn(s: State, p: Person, tk: Task, left: number, a: number, learn: number) {
  const now = s.now, slut = Math.max(0, (tk.until - now) / SEC);
  if (tk.hopp) { // på väg: bara gången, inget arbete (steg 9.2.55)
    rundaTid = 'gang';
    const w = walk(s, p, tk, Math.min(left, Math.max(slut, 1e-3))), used = Math.max(w.used, 1e-3);
    if (p.task !== tk) return used;
    tk.letat = (tk.letat ?? 0) + used;
    if (w.framme && tk.phase === 'do') {
      tk.hopp = undefined;
      // det hen hittat på vägen (hö, kvistar, mossa, ägg, frön) läggs i bördan när hen är framme, också där inget finns att plocka
      workStep(s, p, tk, 1e-3, a, learn, { n: 0, slag: '' });
      if (p.task !== tk || tk.until <= s.now) return used;
      const f = tk.sett?.[tk.sett.length - 1]; // i ett nytt område ser hen sig omkring: det blir platslärdomar (steg 4.5.6.2)
      if (f === undefined || areaOf(f % W, Math.floor(f / W)) !== areaOf(tk.tx, tk.ty)) lookAround(s, p, tk.tx, tk.ty);
    }
    return used;
  }
  const x = Math.floor(tk.tx), y = Math.floor(tk.ty), full = fullBorda(s, p, tk);
  if (tk.sok) { const k = letarNu(s, tk); if (!k) { tk.until = s.now; return 1e-3; } tk.sok = k; } // byn har nog
  // vildboet (steg 10.10.15): intill ett bo tas honungen i takt, BIN.vildTim kakor i timmen, tills det inte finns någon kaka kvar där
  if (!full && (sakerPaRutan(s, tk, x, y).find(q => q.k === 'honung')?.n ?? 0) > 0) {
    tk.plock = undefined; rundaTid = 'plock';
    const used = Math.max(1e-3, Math.min(left, slut, BIT));
    s.now = now + used * SEC;
    workStep(s, p, tk, used, a, learn, { n: 0, slag: 'honung' });
    return used;
  }
  // plocka (steg 9.2.55): stå still och plocka rutan tom, en hel sak per RUNDA.plock sekunder
  if (!full && sakerPa(s, tk, x, y) > 0) {
    tk.plock ??= RUNDA.plock; rundaTid = 'plock';
    const used = Math.max(1e-3, Math.min(left, tk.plock, slut, BIT));
    s.now = now + used * SEC;
    tk.plock -= used;
    const klar = tk.plock <= 1e-6, slag = klar ? plockaEn(s, tk, x, y) : undefined;
    if (klar) tk.plock = undefined;
    workStep(s, p, tk, used, a, learn, { n: slag ? 1 : 0, slag: slag ?? '' });
    return used;
  }
  // den som hämtar tändmaterial, hö eller grenar (turens mål) hittar det på rutorna hen går över (forageItems i eld.ts, efter
  // tiden ute), tills händerna är fulla eller passet är slut (steg 13.10.7). Ser hen inget annat att plocka går hen vidare från ruta till ruta med det som fattas, som andra
  // samlare, och inte tillbaka till rutorna hen nyss gått (steg 12.1.38; förut letade hen på marken där hen stod)
  const mal = turMal(tk);
  if (mal) {
    if (full) { count(s, 'turer'); tk.until = s.now; return 1e-3; }
    tk.sett = [...(tk.sett ?? []), y * W + x].slice(-RUNDA.sett);
    const n = narmastTand(s, tk, mal, x, y, RUNDA.syn);
    if (n) { tk.tx = n.x + 0.5; tk.ty = n.y + 0.5; tk.hopp = true; } else tk.until = s.now;
    return 1e-3;
  }
  tk.plock = undefined;
  if (p.task !== tk || tk.phase !== 'do') return 1e-3;
  if (full) { // bördan är full: hem med den (som i workStep), och tillbaka hit sedan om tiden räcker
    hemMedBordan(s, tk);
    return 1e-3;
  }
  // vidare (steg 9.2.56): den närmaste rutan med saker som hen ser; annars är platsen färdig och nästa mål väljs. Hem när det drar
  // hemåt (draget, men bara hemåt)
  const i = y * W + x;
  tk.sett = [...(tk.sett ?? []), i].slice(-RUNDA.sett);
  const dr = drag(s, p, tk);
  if (dr.ut < -RUNDA.hem || tk.until <= s.now + STEG.kvarMin * MIN) { tk.until = s.now; return 1e-3; }
  let n = nastaPaStrackan(s, p, tk, x, y);
  // utan något hen vet eller ser går hen vidare ut i det okända bara så länge draget drar utåt (nyfikenheten och modet, minus
  // bördan, behoven, mörkret och kylan); annars hem. Drar det hemåt kostar varje ruta längre bort från byn lika mycket
  if (!n) { platsTom(s, p, tk, x, y); n = nastaMal(s, p, tk, x, y, dr.radsla, dr.ut > 0, Math.max(0, -dr.ut)); }
  if (n) { tk.tx = n.x + 0.5; tk.ty = n.y + 0.5; tk.hopp = true; } else tk.until = s.now;
  return 1e-3;
}
// sträckan (steg 10.2.21): samlaren väljer de rutor med saker hen ser på en gång, närmast först och sedan närmast den förra,
// högst RUNDA.stracka, och går dem i tur och ordning. En ruta som blivit tom på vägen hoppas över; när sträckan är slut väljs en
// ny. Förut letades hela synvidden igenom efter varje ruta
function nastaPaStrackan(s: State, p: Person, tk: Task, x: number, y: number) {
  for (let v = 0; v < 2; v++) {
    while (tk.stracka?.length) { const j = tk.stracka.shift()!, jx = j % W, jy = Math.floor(j / W); if (sakerPa(s, tk, jx, jy) > 0) return { x: jx, y: jy }; }
    if (v) break;
    tk.stracka = strackaFran(s, p, tk, x, y, RUNDA.syn);
  }
  tk.stracka = undefined;
  return undefined;
}
// en ruta där en annan som gör samma sak står, är på väg eller har på sin sträcka är mindre värd (steg 12.1.33): den kostar som
// RUNDA.syn rutor längre bort för varje sådan, som trängseln när nästa mål väljs längre bort. Förut valde alla som stod på samma
// ruta samma sträcka och gick den i klunga
function strackaFran(s: State, p: Person, tk: Task, x0: number, y0: number, r: number) {
  const vt = vattenNu(s), kand: number[] = [], saker = sakerLasare(s, tk), upptagen = new Map<number, number>();
  const upp = (i: number) => upptagen.set(i, (upptagen.get(i) ?? 0) + 1);
  for (const q of living(s)) {
    const qt = q.task;
    if (q === p || !qt || qt.act !== tk.act) continue;
    if (Math.abs(q.x - x0) > 2 * r + 2 || Math.abs(q.y - y0) > 2 * r + 2) continue;
    upp(Math.floor(q.y) * W + Math.floor(q.x)); upp(Math.floor(qt.ty) * W + Math.floor(qt.tx));
    for (const j of qt.stracka ?? []) upp(j);
  }
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = x0 + dx, y = y0 + dy;
    if (Math.hypot(dx, dy) > r + 0.01 || !inMap(x, y) || vt[y * W + x] === T.Vatten || saker(x, y) <= 0 || blocked(s, x + 0.5, y + 0.5)) continue; // (inte i en vägg)
    kand.push(y * W + x);
  }
  const ut: number[] = [];
  let cx = x0, cy = y0;
  while (kand.length && ut.length < RUNDA.stracka) {
    let bi = 0, bd = Infinity;
    kand.forEach((j, k) => { const d = Math.hypot(j % W - cx, Math.floor(j / W) - cy) + (upptagen.get(j) ?? 0) * RUNDA.syn; if (d < bd) { bd = d; bi = k; } });
    const j = kand.splice(bi, 1)[0]; ut.push(j); cx = j % W; cy = Math.floor(j / W);
  }
  return ut;
}
// det av turens mål som fattas i förrådet, annars allt av det (tandPaRutan i eld.ts)
const tandFattas = (s: State, tk: Task, mal: readonly Tand[]) => { const f = mal.filter(k => underBuffert(s, k, tk.items?.[k] ?? 0)); return f.length ? f : mal; };
// den närmaste rutan inom r med allt av turens mål som fattas (hö och kvistar), och annars med något av det. Inte de rutor hen nyss
// gått (tk.sett), och varje ruta längre från byns mitt kostar RUNDA.tandHem rutor till: tändmaterialet behövs vid elden, och
// hö och kvistar finns överallt, så rundan går runt på platsen och drar hemåt i stället för rakt bort (steg 12.1.38)
function narmastTand(s: State, tk: Task, mal: readonly Tand[], x0: number, y0: number, r: number) {
  const slag = tandFattas(s, tk, mal), m = bynsMitt(s), hem = (x: number, y: number) => RUNDA.tandHem * Math.hypot(x + 0.5 - m.x, y + 0.5 - m.y);
  let bast: { x: number; y: number } | undefined, bd = Infinity;
  for (const alla of [true, false]) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = x0 + dx, y = y0 + dy, d = Math.hypot(dx, dy) + (Math.hypot(dx, dy) <= r + 0.01 ? hem(x, y) - hem(x0, y0) : 0);
      if ((!dx && !dy) || Math.hypot(dx, dy) > r + 0.01 || d >= bd || !inMap(x, y) || tk.sett?.includes(y * W + x) || blocked(s, x + 0.5, y + 0.5)) continue;
      const har = slag.filter(k => tandPaRutan(s, k, x, y) > 0).length;
      if (alla ? har < slag.length : har === 0) continue;
      bast = { x, y }; bd = d;
    }
    if (bast) return bast;
  }
  return bast;
}
// platsen är färdig (steg 9.2.56): hen minns den som plockad, ett område i taget (platslärdomarna, minne.ts)
function platsTom(s: State, p: Person, tk: Task, x: number, y: number) {
  count(s, 'platsTom'); lookAround(s, p, x + 0.5, y + 0.5);
  const res = ACTS[tk.act].resurs;
  if (res === 'samla' && !tk.sok) plockad(s, p, res, x + 0.5, y + 0.5); // det hen letade efter syns inte här: området är plockat
}
// nästa mål (steg 9.2.54): den ruta inom RUNDA.malR som är bäst när det hen tror finns där (platslärdomarna, trorOm i minne.ts;
// grenarna och stenarna syns) vägs mot vägen dit och rädslan, och som är mindre värd för varje bybo som redan är där eller på väg
// dit. Aldrig tillbaka över rutor hen tömt (de har inga saker), och bara bort från det hen redan sett här. Scenariot samlarmal frågar den direkt
// rutorna längre bort än inre och högst yttre rutor, rad för rad (dy ytterst), med avståndet: räknas en gång per par av mått
const ringar = new Map<string, { dx: Int16Array; dy: Int16Array; d: Float64Array }>();
function ringen(inre: number, yttre: number) {
  const key = `${inre}:${yttre}`;
  let r = ringar.get(key);
  if (!r) {
    const dx: number[] = [], dy: number[] = [], d: number[] = [];
    for (let y = -yttre; y <= yttre; y++) for (let x = -yttre; x <= yttre; x++) { const a = Math.hypot(x, y); if (!(a <= inre || a > yttre)) { dx.push(x); dy.push(y); d.push(a); } }
    ringar.set(key, r = { dx: Int16Array.from(dx), dy: Int16Array.from(dy), d: Float64Array.from(d) });
  }
  return r;
}
// hemat: hur mycket draget drar hemåt (draget, bara hemåt); så mycket kostar varje ruta som målet ligger längre från byn än hen står nu,
// så att den som bär mycket eller är hungrig väljer det som ligger hemåt, och den nyfikne och modige går längre (steg 4.5.6.2)
export function nastaMal(s: State, p: Person, tk: Task, x0: number, y0: number, radsla: (x: number, y: number) => number, vidare = true, hemat = 0) {
  // det hen ser räknas som det är, i saker på rutan; längre bort det hen tror, räknat i saker (rikedomen delad med toppen, gånger
  // sakerna på en full ruta), så att en plats som ser rik ut men är tom inte lockar
  const res = ACTS[tk.act].resurs, sikt = sightOf(s, p);
  const tror0 = res && !tk.sok ? trorOm(s, p, res, 'osedda') : undefined, iSaker = res && !tk.sok ? (FYND.bar.saker ?? 1) / Math.max(1e-9, toppOf(res)) : 0;
  const andra = living(s).filter(q => q !== p && q.task?.act === tk.act).map(q => ({ x: q.task!.tx, y: q.task!.ty }));
  const vt = vattenNu(s), R = RUNDA.malR, saker = sakerLasare(s, tk);
  let bast: { x: number; y: number } | undefined, bv = 0;
  const ring = ringen(RUNDA.syn, R), bm = bynsMitt(s), bort0 = Math.hypot(x0 + 0.5 - bm.x, y0 + 0.5 - bm.y);
  // blocked och sees för varje ruta, med kartan, väggarna och sikten hämtade en gång. Synen avgörs av avståndet i kvadrat när det
  // är klart innanför eller utanför sikten (med en marginal långt över avrundningen), och annars som sees räknar
  const tiles = getMap(s.seed).tiles, grid = gridOf(s), flod = !!s.flod, sikt2 = sikt * sikt, inom = sikt >= 0 ? sikt2 * (1 - 1e-9) : -1, utom = sikt >= 0 ? sikt2 * (1 + 1e-9) : Infinity;
  const syn2 = RUNDA.syn * RUNDA.syn, trangInom = RUNDA.syn >= 0 ? syn2 * (1 - 1e-9) : -1, trangUtom = RUNDA.syn >= 0 ? syn2 * (1 + 1e-9) : Infinity;
  for (let k = 0; k < ring.d.length; k++) {
    const x = x0 + ring.dx[k], y = y0 + ring.dy[k], d = ring.d[k], i = y * W + x;
    if (!inMap(x, y) || vt[i] === T.Vatten || tiles[i] === T.Vatten && !grid.brygga[i] || flod && iVattnetNu(s, i) || grid.solid[i] === 1) continue; // (inte i en vägg)
    let trangt = 0;
    for (const q of andra) { const bx = q.x - x, by = q.y - y, b2 = bx * bx + by * by; if (b2 < trangInom ? true : b2 > trangUtom ? false : Math.hypot(bx, by) < RUNDA.syn) trangt++; } // som synen ovan
    const ax = x + 0.5 - p.x, ay = y + 0.5 - p.y, a2 = ax * ax + ay * ay;
    const ser = !tror0 || (a2 < inom ? true : a2 > utom ? false : sees(s, p, x, y, sikt)), tror = ser ? saker(x, y) : tror0!(x, y) * iSaker;
    // vägen dit räknas i samma enhet som det hen tror finns där: bortom synvidden i saker (iSaker). Förut vägde avståndet femtio
    // gånger tyngre än det hen hört, så att inget mål längre bort vann och rundan gick åt ett slumpat håll (steg 9.9.5)
    const v = (tror - radsla(x, y)) / (1 + trangt) - d * RUNDA.ut * (ser ? 1 : iSaker) - (hemat > 0 ? hemat * Math.max(0, Math.hypot(x + 0.5 - bm.x, y + 0.5 - bm.y) - bort0) : 0);
    if (v > bv + 1e-9) { bv = v; bast = { x, y }; }
  }
  if (bast) { count(s, 'nyttMal'); return bast; }
  // inget hen vet eller ser: en riktning bort från byn, mot mark som ser lovande ut (skog, snår, bryn), RUNDA.malR rutor bort,
  // om det drar utåt (vidare)
  if (!vidare) return undefined;
  const m = bm, v0 = Math.atan2(y0 - m.y, x0 - m.x), g = groundOf(s);
  for (let k = 0; k < 8; k++) {
    const v = v0 + (hash3(p.id, k, Math.floor(s.now / HOUR)) - 0.5) * Math.PI, x = Math.round(x0 + Math.cos(v) * R), y = Math.round(y0 + Math.sin(v) * R);
    if (!inMap(x, y) || vt[y * W + x] === T.Vatten || blocked(s, x + 0.5, y + 0.5)) continue;
    if (k < 6 && !(g.trees[y * W + x] > 0 || markslag(g, y * W + x) === 'hog' || markslag(g, y * W + x) === 'buske')) continue;
    count(s, 'nyttMalRiktning');
    return { x, y };
  }
  return undefined;
}
// den som når 16 i en färdighet blir mästare i den; den första i byn får notisen, och de andra minns det
export function blevMastare(s: State, p: Person, sk: keyof typeof SKILL_NAMES) {
  const title = `Mästare i ${SKILL_NAMES[sk].toLowerCase()}`, first = forstaGang(s, 'mastare_' + sk) && !s.people.some(q => q.fame.includes(title)); // en gång per färdighet, också när de döda rensats bort (fynd 313); titeln i byn täcker sparade byar från före räkningen
  p.fame.push(title); personHand(s, p, 'titel', `Blev ${title.toLowerCase()}.`); log(s, `${p.name} har blivit en mästare i ${SKILL_NAMES[sk].toLowerCase()}.`, 'skill', [p.id]);
  if (first) notis(s, 'mastare', `${p.name} är byns första mästare i ${SKILL_NAMES[sk].toLowerCase()}.`, [p.id]);
  if (first) for (const q of living(s)) if (q !== p) upplev(s, q, 'forstaMastare', p.name); // de andra såg det (steg 4.5.4.9)
}
// plock: på rundan (steg 9.2.55) ger arbetet bara det som plockades, en hel sak när plocket är klart (n 1) eller inget (0), och slaget som plockades (bär eller rötter, sten eller flinta, honung), '' medan plocket pågår
function workStep(s: State, p: Person, tk: Task, dtSec: number, a: number, learn: number, plock?: { n: number; slag: string }) {
  const now = s.now, d = ACTS[tk.act], res = d.resurs, runda = plock !== undefined;
  const { takt, del: del0, rich, rd, rk } = arbetsTakt(s, p, tk), y = plock ? plock.n : takt * dtSec, del = plock === undefined ? del0 : undefined; // ett plock har redan tagits ur rutan (plockaEn)
  if (y > 0) count(s, 'prod_' + tk.act, y);
  if (rd && y > 0 && d.slits?.per === 'ger') wearUsed(s, p, y); // korgen slits för det som samlas, inte per timme (steg 2.3.12)
  if (rk?.rad.haller && y > 0 && d.slits?.per === 'ger') slitRygg(s, rk.t, y, rk.rad.haller); // och ryggsäcken likadant (steg 7.1.3)
  // tomt här: gå vidare eller hem (nedan). Den som letar flinta eller stenar fortsätter
  const tomt = !!del && !tk.sok && tomtFor(s, p, res as Kind, rich); // samma gräns som fisket (steg 15.1.132)
  if (res && del) takeFrom(s, res, tk.tx, tk.ty, y, del.r);
  // den som arbetar ser hur mycket som finns i området och minns det
  if (res && (rich < PLATS.tomtGrans || chance(s, 1 / STEG.minneSek, dtSec, 'minne', p))) lookAround(s, p, tk.tx, tk.ty);
  // det arbetet ger läggs i bördan; något annat än det arbetet ger tas bara med om det ryms i händerna (steg 6.1.8),
  // utom ett sällsynt fynd (flintan), som man inte lämnar
  const smt = res === 'samla' && s.flackar?.length ? toaNara(s, tileOf(tk.tx, tk.ty)) : 0; // plockat där det är toa-smuts (steg 10.11.14)
  const bar = (k: string, n: number, plockat?: true) => {
    if (!(n > 0)) return;
    if (plockat && !tk.plockat?.includes(k)) (tk.plockat ??= []).push(k); // det turen gäller (fullBorda)
    // platsen i händerna prövas först när det blir en hel sak till: arbetet mot nästa sak (p.delar) tar ingen plats. Förut föll
    // varje liten del bort när händerna var fulla, så att ägg, mossa och frön nästan aldrig hittades (steg 9.9.5)
    const fore = (tk.items?.[k] ?? 0) + (p.delar?.[k] ?? 0), nyHel = Math.floor(fore + n + 1e-9) > Math.floor(fore + 1e-9);
    // det som plockas i förbifarten (inte turens mål eller det som plockades) tas bara med om en sak till av turens mål ryms
    // efteråt: det tränger inte undan det turen gäller (steg 15.1.44, rymsTurMer i utrustning.ts)
    if (nyHel && k !== carryKind(tk.act) && !SAKER[k]?.skaffa?.sallsynt) {
      const b = bordSlag(tk), w = viktOf(k), ny = { ...b, [k]: Math.ceil((b[k] ?? 0) / w + n - 1e-9) * w };
      const forbi = !plockat && !turMal(tk)?.includes(k as Tand);
      if (forbi ? !rymsTurMer(s, p, tk, ny) : !ryms(s, p)(ny)) return; // bördan blir hela saker (helaIBordan)
    }
    tk.items ??= {}; tk.items[k] = (tk.items[k] ?? 0) + n;
    if (smt) smutsigtPlock(s, k, n, smt); // (bara det som ryms och bärs hem)
  };
  // det arbetet ger (UTFALL ovan); utan egen rad, eller om raden inte tagit hand om det, läggs det platsen gav i bördan
  const u = UTFALL[tk.act];
  if (!(u && u(s, p, tk, { y, rich, delar: del?.r, rd, dtSec, a, bar, slag: plock?.slag })) && y > 0) { tk.carry += y; if (smt) smutsigtPlock(s, carryKind(tk.act), y, smt); }
  helaIBordan(p, tk); // bara hela saker i bördan (steg 2.10.7); på en runda med hela saker ges saken bara vid stoppet (rundaRuta, steg 6.1.3)
  const sk = d.arbete!;
  const before = p.skill[sk];
  const m = p.mentor !== undefined ? byId(s, p.mentor) : undefined; // bredvid sin mentor lär man sig fortare (steg 3.1.1)
  const vidMentor = m?.task && ACTS[m.task.act].arbete === sk && Math.hypot(m.x - p.x, m.y - p.y) < RELT.mentorNara ? RELT.mentorOvning : 1;
  ovning(p, sk, dtSec / HOUR_S * STEG.ovningArbete * learn * vidMentor * (STEG.ovningBas + stat(p, 'intelligens', now) / 20));
  if (before < STEG.mastare && p.skill[sk] >= STEG.mastare) blevMastare(s, p, sk);
  // arbetet sker i turer: när de fria händerna är fulla eller efter en fångst bärs det hem, sedan fortsätter man. Någon fast
  // tid för en tur finns inte (steg 6.1.10): arbetet slutar annars när det är slut (tk.until) eller när något går före (val.ts)
  const full = fullBorda(s, p, tk), has = isCarrying(tk);
  // platsen är tom: arbetet (jakten) slutar. Samlandet går på rundan, som själv går vidare. Jägaren som redan gått vidare för att leta (jakt.ts) fortsätter
  if (tomt && tk.phase === 'do' && !runda) tk.until = now;
  if ((full || (d.hemVarje && tk.carry > 0) || (tk.act === 'jakt' && jaktFallt(tk))) && has && !(tk.styckTill && tk.styckTill > now)) { // den som styckar ett djur gör det klart först (styckning.ts)
    hemMedBordan(s, tk);
  }
}

// hem med bördan: platsen minns om tiden räcker till att komma tillbaka, och turen räknas
function hemMedBordan(s: State, tk: Task) {
  if (tk.until > s.now + STEG.kvarMin * MIN) tk.res = { x: tk.tx, y: tk.ty, until: tk.until };
  tk.until = s.now; count(s, 'turer');
}
// bygge: lägg det man bär på bygget och arbeta. När rutan är klar, eller materialet tagit slut, tas nästa ruta
function buildStep(s: State, p: Person, tk: Task, dtSec: number) {
  const b = bitById(s, tk.ref);
  if (!b) { tk.until = s.now; return; }
  const k = MATERIAL[b.m].item;
  // materialet ligger kvar i händerna medan man bygger och läggs i bygget när biten är klar (steg 3.6.5). Avbryts arbetet
  // bär man hem det som inte använts (taskStep: den som bär något går hem med det)
  // bara det som fattas läggs i bygget: har någon annan lagt material i väggen under tiden behåller man resten
  const har = (k && tk.items?.[k]) || 0, anv = Math.min(har, needOf(b));
  const done = b.b >= 1 && b.lp === undefined && b.c >= 0.5;
  if (!done && bitFri(s, b) && needOf(b) - har <= 1e-9) { // (en stubbe, ett träd eller en eld i vägen: nästa bit, steg 13.10.28)
    if (!workOn(s, p, b, dtSec, anv)) return;
    if (anv) {
      const kvar = har - anv;
      if (kvar > 1e-9) { tk.items![k!] = kvar; const ag = tk.ag?.[k!]; if (ag) for (const id in ag) ag[id] *= kvar / har; } // ägarna behåller var sin del av resten
      else { delete tk.items![k!]; if (tk.ag) delete tk.ag[k!]; if (!Object.keys(tk.items!).length) tk.items = undefined; }
    }
    if (tk.kom) { noteKom(s, b.hus, tk.kom); tk.kom = undefined; } // varifrån materialet kom räknas när det används
  }
  const j = buildJob(s, p, !!b.forb);
  if (!j || j.missing || j.fell || j.hugg !== undefined || p.warm < KROPP.kallt) { tk.until = s.now; return; } // ett träd i vägen, eller byggaren fryser (steg 10.2.6): välj på nytt
  // nästa bit av bygget: man går först till lagret om det behövs material
  const site = siteOf(s, j.bit);
  tk.ref = j.bit.id; tk.tool = j.repair ? (j.bit.k === 'golv' ? 'lagaGolv' : 'laga') : j.bit.k === 'golv' ? 'golv' : 'vagg';
  tk.phase = 'go';
  const iHand = (j.item && tk.items?.[j.item]) || 0; // det byggaren redan bär räcker till biten (steg 10.2.21 C)
  if (j.need > iHand + 1e-9) { const f = fetchSpot(s, j.item!, p, () => avail(s, j.item!, p, j.bit.hus, j.bit)); tk.tx = f.x; tk.ty = f.y; tk.site = site; } else { tk.tx = site.x; tk.ty = site.y; }
}
// materialet som de andra bitarna av samma material i samma hus behöver, som ingen annan bygger: det byggaren kan ta med sig
function byggMer(s: State, b: Bit, k: string) {
  const andra = new Set(living(s).filter(q => q.task?.act === 'bygga').map(q => q.task!.ref));
  let n = 0;
  for (const c of bitsOf(s)) if (c !== b && c.hus === b.hus && c.b < 1 && !c.forb && bitFri(s, c) && MATERIAL[c.m].item === k && !andra.has(c.id)) n += needOf(c);
  return n;
}

// talen i sparfilen avrundas till tre decimaler. En stacks ägardelar avrundas nedåt om de annars blir mer än stacken
function avrunda(this: unknown, k: string, v: unknown) {
  if (k === 'vackta') return undefined; // de väckta byarna sparas för sig (steg 11.13.9)
  if (typeof v === 'number') return Number.isInteger(v) ? v : v < 1 && r3(v) >= 1 ? 0.999 : r3(v); // det som är under 1 (det påbörjade, s.delar) blir aldrig 1 av avrundningen
  const st = this as { n?: unknown } | null;
  if (k === 'ag' && v && typeof v === 'object' && typeof st?.n === 'number') {
    const d = v as Record<string, number>;
    let sum = 0; for (const o in d) sum += r3(d[o]);
    if (sum > r3(st.n) + 1e-9) { const ner: Record<string, number> = {}; for (const o in d) ner[o] = Math.floor(d[o] * 1000 + 1e-6) / 1000; return ner; }
  }
  return v;
}
export function serialize(s: State) {
  packGround(s); packFynd(s); skrivVanor();
  return JSON.stringify(s, avrunda);
}
// en kopia av byn, som en sparad och inläst by (cacherna i WeakMap följer inte med, regel 4)
export const cloneState = (s: State) => migrate(JSON.parse(serialize(s)));

// sparfilen i delar, så att varje del ryms i ett dokument i artefaktens databas (högst 256 KB). Det som inte står här är byn.
// Varje del skrivs direkt med samma avrundning, så texten blir densamma som om hela byn skrivits och delats upp efteråt
export const DELAR: Record<string, string[]> = { folket: ['people', 'rels'], kartor: ['mark', 'skog', 'tradAlder', 'tradSort', 'buskar', 'barbuskar', 'stubbar'], fynden: ['fynd'], loggen: ['log'], notiser: ['notiser'], varlden: ['varld'] };
// med byns karta, och kartan som gällde förut väljs igen efteråt (en väckt by kan visas medan huvudbyn sparas, steg 11.13.11)
export function serializeParts(s: State, tal: typeof avrunda = avrunda): Record<string, string> {
  const fore = kartAv();
  useMap(s);
  try { return serializeDelar(s, tal); } finally { useMap(fore); }
}
function serializeDelar(s: State, avrunda: (this: unknown, k: string, v: unknown) => unknown): Record<string, string> {
  packGround(s); packFynd(s); skrivVanor();
  const o = s as unknown as Record<string, unknown>, ut: Record<string, string> = {}, bort = new Set<string>();
  for (const [d, keys] of Object.entries(DELAR)) {
    const del: Record<string, unknown> = {};
    for (const k of keys) if (o[k] !== undefined) { del[k] = o[k]; bort.add(k); }
    ut[d] = JSON.stringify(del, avrunda);
  }
  // historiken delas efter de avrundade tiderna, som i en inläst sparfil
  if (s.hist) { for (const [d, h] of Object.entries(histParts(s, JSON.parse(JSON.stringify(s.hist, avrunda))))) ut[d] = JSON.stringify({ hist: h }); bort.add('hist'); }
  const byn = JSON.stringify(s, function (this: unknown, k: string, v: unknown) { return this === s && bort.has(k) ? undefined : avrunda.call(this, k, v); });
  return { byn, ...ut, ...vacktaParts(s, avrunda) };
}
// Överlämningen mellan sidan och arbetaren som räknar ikapp (steg 12.1.178, ui/ikappkarna.ts): delarna i sparfilen med talen
// oavrundade, så att byn som läses in ur dem är exakt den by som skrevs (utom cacherna, regel 4)
function exakt(k: string, v: unknown) { return k === 'vackta' ? undefined : v; }
// Minnena med timmen som nyckel och kartorna oavrundade följer med i delen timminnen (steg 12.1.248, timminne.ts)
export function overlamna(s: State) {
  const d = serializeParts(s, exakt), fore = kartAv(); useMap(s);
  try { d.timminnen = timminnenUt(s); } finally { useMap(fore); }
  return d;
}
export function franOverlamning(delar: Record<string, string>): State {
  const namn = Object.keys(delar).filter(d => d !== 'byn' && d !== 'timminnen' && !arVacktDel(d)).sort();
  const s = migrate(JSON.parse(joinParts([delar.byn, ...namn.map(d => delar[d])])));
  lasVackta(s, delar);
  const fore = kartAv(); useMap(s);
  try { timminnenIn(s, delar.timminnen); } finally { useMap(fore); }
  return s;
}
// de väckta byarna (steg 11.13.9): var och en i egna delar med förledet vackt<nr>-, med samma delar och gränser som huvudbyn,
// utan världen som de delar med huvudbyn
const VACKT_DEL = /^vackt(p?\d+)-(.+)$/; // en liten karta för en plats: vacktp<nr> (steg 11.13.25)
function vacktaParts(s: State, tal: typeof avrunda): Record<string, string> {
  const ut: Record<string, string> = {};
  for (const b of s.vackta ?? []) {
    const vl = b.varld;
    delete b.varld; useMap(b);
    try { for (const [d, t] of Object.entries(serializeParts(b, tal))) if (d !== 'varlden') ut[`vackt${b.vackt ?? 'p' + b.vacktPlats}-${d}`] = t; }
    finally { if (vl) b.varld = vl; useMap(s); }
  }
  return ut;
}
export const arVacktDel = (d: string) => VACKT_DEL.test(d);
// de väckta byarna läses ur sina delar och delar huvudbyns värld igen
export function lasVackta(s: State, delar: Record<string, string>) {
  const per = new Map<string, Record<string, string>>();
  for (const [d, t] of Object.entries(delar)) { const m = VACKT_DEL.exec(d); if (m) { const o = per.get(m[1]) ?? {}; o[m[2]] = t; per.set(m[1], o); } }
  for (const o of per.values()) { // i den ordning de sparades, som är ordningen de går i slagen
    if (!o.byn) continue;
    const namn = Object.keys(o).filter(d => d !== 'byn').sort();
    const b = migrate(JSON.parse(joinParts([o.byn, ...namn.map(d => o[d])])));
    if (s.varld) b.varld = s.varld;
    (s.vackta ??= []).push(b);
  }
  useMap(s);
}
// Gränsen för varje del av sparfilen i KB (steg 11.2.2, Världens kostnad och lagringen): vakten för storleken i det stora
// testet larmar när en del växer över sin gräns. "historik" gäller varje veckas del. En ny del får en rad här. Världen bär
// sedan steg 11.2.15 grannbyarnas priser (en per sak) och personer, som förut låg i byn: de växer med grannarna, inte med tiden.
// Grannbyarnas personer är hela personer som byborna (steg 9.2.114) och högst lika många som byns folk (steg 14.2.6), så världen
// har folkets gräns
export const SPARGRANS: Record<string, number> = { byn: 1536, folket: 1536, kartor: 512, fynden: 256, loggen: 128, notiser: 256, historik: 512, varlden: 1536 };
export const delGrans = (d0: string) => { const d = d0.replace(VACKT_DEL, '$2'); return SPARGRANS[d.startsWith('historik-') ? 'historik' : d]; }; // en väckt bys delar har huvudbyns gränser
// varje del av sparfilen: storleken i KB (byte i UTF-8, som databaserna räknar) och gränsen
export const sparStorlek = (s: State) => Object.entries(serializeParts(s)).map(([del, txt]) => ({ del, kb: new TextEncoder().encode(txt).length / 1024, grans: delGrans(del) }));
export const joinParts = (delar: string[]) => {
  const ut: Record<string, unknown> = {}, hist: Historik[] = [];
  for (const d of delar) { const o = JSON.parse(d); if (o.hist) { hist.push(o.hist); delete o.hist; } Object.assign(ut, o); }
  if (hist.length) ut.hist = joinHist(hist); // historiken ligger i en del per vecka
  return JSON.stringify(ut);
};

// varje timme (timblocket ovan): de döda och utflyttade utöver de 120 senaste och relationer mellan två som inte lever
// tas bort, så att byn och sparfilen hålls små. Sparningen bara läser byn. De döda behåller bara det berättelserna, krönikan
// och släktträdet läser: personloggen, bytena, vanorna och tankarna glöms, och relationer till personer som inte längre
// finns i folket tas bort (steg 12.1.24)
const MINNS_DODA = 120;
function compact(s: State) {
  const borta = (p: Person) => !alive(p) && !gastLever(p); // en gäst på kartan är inte borta (steg 9.2.111)
  let n = 0; for (const p of s.people) if (borta(p)) n++;
  if (n > MINNS_DODA) {
    const gone = s.people.filter(borta).sort((a, b) => (b.died ?? b.left ?? 0) - (a.died ?? a.left ?? 0));
    const drop = new Set(gone.slice(MINNS_DODA).map(p => p.id));
    s.people = s.people.filter(p => !drop.has(p.id));
  }
  for (const p of s.people) if (p.died !== undefined && !p.gast) glomDod(s, p);
  const ids = new Set(s.people.filter(p => !borta(p)).map(p => p.id)), finns = new Set(s.people.map(p => p.id));
  for (const k in s.rels) { const m = /^(-?\d+)-(-?\d+)$/.exec(k), a = Number(m?.[1]), b = Number(m?.[2]); /* gästernas id är negativa */ if (!ids.has(a) && !ids.has(b) || !finns.has(a) || !finns.has(b)) delete s.rels[k]; }
}
function glomDod(s: State, p: Person) {
  glomByten(s, p);
  p.hand = undefined;
  if (Object.keys(p.habit).length) p.habit = {};
  if (p.thoughts.length) p.thoughts = [];
}
import { SYRA, bakaKlar, gropKlar, kokaKlar, stekaKlar, stepBak, stepKok } from './matlagning';
import { stepStationsEld } from './stationseld';
import { vatskorTimme } from './vatskor';
import { brannKlar, bryggKlar, maltaKlar, stepBrygg, vatskaUr } from './brygg';
import { rusSteg } from './rus';
import { latrinTomKlar, soporKlar, stepKompost, stepSophog } from './rester';
import { skrammaKlar, staketKlar } from './odling';
// den rikaste röllekan (eller ängsblomman, steg 10.7.3) på rutan eller bredvid den som samlar (steg 9.7.15): den plockas på
// vägen. Bara på våren och sommaren, när de växer, så att de andra tidsåldrarna inte frågar kartan i onödan
const ROLLEKA_GRANNAR = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const VAXTAR = [1, 2]; // vår och sommar
// de vilda växterna som plockas på samlarrundan när man går förbi dem (vildNara): röllekan alltid (steg 7.6.3 och 9.7.15),
// ängsblommorna när byn vill ha blommor till krukorna (steg 10.7.3) och måran när byn vill ha den till färgbadet (steg 13.3.2)
const VILDA_ORTER: { k: VildOrt; vill?: (s: State) => boolean; stat?: string }[] = [
  { k: 'rolleka', stat: 'samlat_rolleka' },
  { k: 'blomma', vill: s => blommaVill(s) > amountOf(s, 'blomma') },
  { k: 'mara', vill: s => underBuffert(s, 'mara') },
];
type VildOrt = 'rolleka' | 'blomma' | 'mara';
function vildNara(s: State, k: VildOrt, x: number, y: number, ar = VAXTAR) {
  if (!ar.includes(ageIndex(s))) return undefined;
  let best: { x: number; y: number; v: number } | undefined;
  for (const [dx, dy] of ROLLEKA_GRANNAR) { const v = richness(s, k, x + dx, y + dy); if (v > (best?.v ?? 0)) best = { x: x + dx, y: y + dy, v }; }
  return best;
}
import { blommaVill, krukaNer, krukaUpp, ortPlockaKlar, ortSattaKlar, stepOrtKrukor } from './kruka';
import { mataKlar, stepTamdjur } from './tamdjur';
import { hageKlar, stepHagar, vallaKlar } from './hage';
import { avlivaKlar, klippKlar, mjolkUr, mjolkaKlar, stepBoskap } from './boskap';
import { tatKlar } from './tatuering';
import { barGillad, fargaKlar, FARG, stepFargsmak } from './farg';
import { tjaraKlar } from './tjara';
import { stadaKlar } from './stada';
import { betjanaKlar, kassaTakt, koaKlar } from './kassa';
import { stallaFramme, stallaKlar } from './affar';
import { forvantanTanke, forvantanTimme } from './forvantan';
import { angKlar, slaKlar, stepVinter, hamlaKlar } from './slatter';
import { stepHons } from './hons';
import { baddVila, bredvidKaresta, iDass, sittVila, sattaKlar } from './mobler';
import { mognadSteg, mognadVarde, tunnaRegn } from './tunna';
import { vardeKrok } from './varde';
import { skrotUr } from './jarnsaker';
import { bladUr } from './skrift';
vardeKrok.ur = k => vatskaUr(k) ?? mjolkUr(k) ?? skrotUr(k) ?? bladUr(k); // det som har sitt recept i systemets egen fil: vätskorna (steg 15.1.34), skrotet och bladet (steg 15.1.35)
vardeKrok.inne = mognadVarde; // en mognad dryck är värd mer (steg 12.4.6): tunna.ts läses före varde.ts
import { surnarSnart } from './vatskor';
ostKrok.surnar = s => surnarSnart(s, 'mjolk'); // mjölken som annars skulle surna ystas (steg 12.4.7)
import { tanke } from './tankar';
import { tankarTimme } from './tankelage';
import { drommar } from './drommar';
import { gudlosDygn } from './rykten';
import { slappAmmo, ammoIHanden, stenKrok } from './vakt';
stenKrok.ta = takeMaterial;
for (const act of ['forsvarRovare', 'hjalpaRovare', 'forsvar'] as const) MEDAN[act] ??= (s, p, t) => ammoIHanden(s, p, t); // stenarna och pilarna i handen (steg 15.1.69)
