import { leraGravd } from './lera';
import { GASTVARD, gastVardag } from './gastvardag';
import { husKlaraTimme } from './bygg';
import { personHand } from './personlogg';
import { hamtaForst, hamtat } from './paborjat';
import { sorgTimme } from './liv';
import { djurStriderSteg } from './djurstrid';
import { lagerIStraket } from './strak';
import { rumVila } from './rum';
import { stepByggplan } from './byggplan';
import { FALLOR, FISKAR, MJARDE, mjardarOf, sattUt, stepMjardar, valjFisk, vittja } from './fisk';
import { TILLVERKA, TILLVERKA_LIST } from './tillverka';
import { RECEPT } from './recept';
import { stepBlotVed } from './blotved';
import { stepUppvaxt, upplev } from './uppvaxt';
import { stepReligion } from './religion';
import { stepMotgang } from './motgang';
import { stepTorka } from './torka';
import { stepFlod } from './flod';
import { tornadoSteg } from './tornado';
import { fallTanke, plantaSatt, plantaUppgravd, vindfallen } from './skogsvard';
import { askaSteg, brandHetta, brandSteg, brinnerSteg, hjalpaKlar, slackaFram, slackaFylld, slackaSigKlar, slackaSteg } from './brand';
import { loggBer, stepBerattelser } from './berattelser';
import { UTBROTT_ACTS, moodOf, stepHumor, utbrottKlar } from './humor';
import { glomRykten, stepRykten } from './rykten';
import { stepStyre } from './styre';
import { STRID, lekSteg } from './strid';
import { bildKrok, faraNara, gralBlirSlagsmal, kartStridSteg, serStriden, stegTaget } from './kartstrid';
import { sportKlar, sportSteg } from './sport';
import { lyssnaSteg, upptradaKlar, upptradaSteg } from './framtradande';
import { fylldSack, redskapIHanden, tidyTools } from './agande';
import { kvEffekt } from './kvalitet';
import { SKOG, chopStock, fellTree, rotStumps, stocks, stubbeGravd } from './skog';
import { needLadder, noticeTheft, stole, takeMaterial, getable } from './behov';
import { mayTake, lagerFlyttVal, lagerFlytta, avbryt, bordSlag, carryKind, dropSpot, fetchSpot, helaIBordan, homeKind, isCarrying, load, pickUp, placeTools, sakerPaGolvet, storeLoad, tidyStore, wearStore, ownsAmount, use, put } from './lager';
import { SAKER, viktOf } from './saker';
import { DJURARTER, REDSKAP, bearbeta, djurKvar, twineRope, wearUsed } from './redskap';
import { GOR_ACTS, finishHalf, startWork, stepPaborjat, workHalf } from './paborjat';
import { arbetaBredvid, forsokKlar, forsokSteg, stepLarlingar, thinkWhileWorking } from './teknik';
import { arbetsformaga, atSteg, foodDays, workRate } from './ekonomi';
import { FYND, type FyndId, svampPlock, flintorOchYxor, toppOf, TRY_SEC, flintFactor, growFynd, handFish, lagren, stoneDist, packFynd, pickMushrooms, richness, richnessDelar, sankning, takeFrom } from './fynd';
import { halMin, halVal, islagt, stepIs } from './is';
import { blotSteg, coldOf, stepVader, temperature, VADER, vaderGrader, vaderNu, vaxtFaktor } from './vader';
import { ELD, VED, type Tand, tandPaRutan, addFuel, canLight, eldById, eldXY, giveBack, needStones, fireWant, forageItems, fuelFor, hearthOf, heatAt, igniterOf, stepFire, takeCoal, takeFuel, tinderShort, tryLight } from './eld';
import { gastLever } from './gast';
import { ALDER, KROPP, ageOf, alive, byId, count, forstaGang, gjort, isSick, living, log, ovning, stat, think } from './folk';
import { SJUK, type SjukId, insjukna, sjukSteg, smittaTimme, smittaUtifranTimme } from './sjukdom';
import { eldPlats, getMap } from './karta';
import { ELDFLYTT, flyttaElden, stepEldFlytt } from './eldflytt';
import { DODSORSAKER, type Dodsorsak, barnMat, birth, birthWish, die, framlingSteg, regulate } from './liv';
import { MARK, groundOf, growGround, markslag, packGround, tileOf } from './mark';
import { bynsMitt } from './omrade';
import { SAMTAL, TalkEvent, converse, kanPrata, skiljsAt } from './samtal';
import { HABIT_FADE, addHabit, stepSeder, updateTags } from './seder';
import { RELT, stepRelationer } from './relationer';
import { MINNE, areaOf, fearPlace, forget, lookAround, observe, radslaVid, sees, sightOf, trorOm } from './minne';
import { PLATS } from './plats';
import { chance, clamp, hash3, rnd } from './slump';
import { ARSTID, VAR, ageIndex, hourOf, iIstiden, isLight } from './tid';
import { ACTS, toolRow } from './handlingar';
import { AGES_BORJAR, Act, DAY, HOUR, HOUR_S, MIN, Person, SEC, SKILL_NAMES, State, Task, W, H, useMap, Historik, simulera, T, inMap, GRANNAR4 } from './typer';
import { FOREST, findPath, wear } from './vag';
import { barKropp, gangVakt, kroppFart, rutFart, smidig, snoFart } from './gang';
import { facklorTimme, finishLjus, finishUppsatt, morkFart, morkHumor } from './ljus';
import { arbetsTimme, chooseTask, dangers, nastaBuske, nastaRedskap, spotFor } from './val';
import { FAGEL, djurSteg } from './djur';
import { vargSteg, vargjaktSteg } from './varg';
import { bjornSteg, bjornjaktSteg } from './bjorn';
import { rovarSteg, rovarTornado } from './rovare';
import { handelSteg, handlaKlar, handlarMal, handlarPlats, handlarTornado, pratMedHandlare } from './handel';
import { klanSteg } from './klaner';
import { vaktSteg } from './vakt';
import { JAKT, jaktBar, jaktFallt, jaktForsok, jaktKlar } from './jakt';
import { bristSteg, frysFaktor, naringSjunker, skorbjugg, trottFaktor } from './naring';
import { stepByggnader } from './byggnader';
import { sumOf } from './egendom';
import { vaggRensa, husKlart, avail, takeForHouse, buildJob, finishDorr, needOf, noteKom, siteOf, toWalls, wearBuild, workOn } from './bygg';
import { bitAt, husById, MATERIAL, bitById, blocked, freeNear, gridOf, roomAt, roofed, shelterOf } from './byggnad';
import { histParts, historikSteg, joinHist } from './historik';
import { migrate } from './varld';
import { stepDelning } from './delning';
import { finishOdla, froFynd, stepOdling, workOdla } from './odling';
import { balans } from './balans';
import { grilla, torka } from './matlagning';
import { stepBrasor } from './brasor';
import { sjoRakna, vattenNu } from './sjo';
import { akel, regnetTvattar, toaBesok } from './smuts';
import { DRICKA_ACTS, TORST, drick, torstSteg, vattenFram, vattenFylld } from './torst';
import { kvarTimme } from './kvarlevor';
import { avrustaKlar, gravKlar, kroppUpp, rustaKlar } from './grav';
import { bonKlar, kultTimme } from './kult';
import { hovArbete, kyrkProjekt, kyrkaRegister, kyrkaTimme, satBudHandelse, satOffrad, satOppnaAndlig } from './kyrka';
import { laggTillProjekt } from './projekt';
import { lagRegister, svampTabu } from './lagar';
import { oppnaSed } from './rost';
import { handelse } from './rykten';
import { tal, horsel, barMed, burenSteg, halsa, halsaSteg, lakerFullt, lamnaAv, mossaFynd, mossaPaStam, vardKlar, vardMal } from './halsa';
import { bordPlats, fullBorda, kladVarme, ryggKorg, ryms, slitRygg, stepKlader } from './utrustning';
import { stepPynt } from './pynt';
import { stadaByten } from './byte';
import { stationFor, kvVid, stationFlytta, finishStation, finishTillbehor, stationAt, stationRutor, stepStationer, tillbehorVarme, workStation } from './stationer';
import { TROSKEL, forbrukTimme, overTak, underBuffert } from './forradsmal';
import { notis } from './notiser';
import { stepKrukor } from './kruka';
import { ar_vatska, drickTe, fyllVatska, ledigFor, teFaktor } from './vatskor';
import { rullaKvalitet } from './kvalitet';
import { protesTimme } from './protes';
import { halsoNotiser } from './halsonotiser';
import { borjaForlossning } from './forlossning';

// Simuleringen går i slag om fem minuter (BEAT), i spelet och vid ikappräkning likadant. Inom ett slag går tiden åt
// till det som händer i tur och ordning (taskStep). Arbetet görs i bitar om högst BIT sekunder, och man bär aldrig mer
// än som ryms i de fria händerna (fullBorda i utrustning.ts, steg 6.1.8). STEG.markNot = hur mycket ett steg nöter marken (MARK.nott per ruta)
export const BEAT = 300;
const BIT = 60;
// Balanstalen (regel 8). Kroppens gränser och takter (KROPP) och åldrarna (ALDER) står i folk.ts, eftersom val.ts och behov.ts läser dem
const STEG = balans('steg', {
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
// vad p gör vid tiden t under slaget som slutar vid nu (spar.u); före slagets början, efter det eller när inget sparats: uppgiften nu
export function sparUppgift(p: Person, t: number, nu: number): Task | undefined {
  const u = spar.u.get(p);
  if (!u?.length || t >= nu) return p.task;
  let i = 0;
  while (i + 1 < u.length && u[i + 1][0] <= t) i++;
  return u[i][1];
}
function spara(s: State, p: Person, t = s.now) { if (spar.pa) { spar.v.get(p)?.push(t, p.x, p.y); sparaUppgift(p, t); } }
bildKrok.spara = (s, p) => spara(s, p); // den som flyttas av striden på kartan (kartstrid.ts)

type Krok = (s: State, p: Person, t: Task, dtSec: number) => void;
// det som händer medan man gör något (efter att ha kommit fram). Arbete för byn sköts av workStep
const MEDAN: Partial<Record<Act, Krok>> = {
  toa: (s, p, t) => { p.toa = 1; if (t.prog === undefined) { t.prog = 0; toaBesok(s, p, t.ref); } }, // i latrinen, annars blir det en fläck (smuts.ts)
  kol: (s, p, t) => { const e = eldById(s, t.ref); if (e) takeCoal(s, p, 'hämtade', e); },
  bygga: (s, p, t, dtSec) => buildStep(s, p, t, dtSec),
  tvinna: (s, p, t, dtSec) => twineRope(s, p, dtSec / HOUR_S, t.handel ? TROSKEL.repVill + handlarMal(s, 'rep') : undefined), // rep till handlaren (steg 6.2.11)
  hantverk: (s, p, t, dtSec) => { if (t.tool === 'rep') twineRope(s, p, dtSec / HOUR_S); }, // äldre sparfiler: rep tvinnades i handarbetet
  tanda: (s, p, t, dtSec) => {
    const f = eldById(s, t.ref); // lägerelden eller en lägereld till (task.ref, brasor.ts)
    if (!f) { p.task = undefined; return; }
    if (!canLight(s, p, f)) return;
    f.tryProg += dtSec;
    const per = igniterOf(s)!.minutes * 60;
    while (f.tryProg >= per && canLight(s, p, f) && !f.lit) { f.tryProg -= per; if (tryLight(s, p, f)) { p.task = undefined; break; } }
  },
};
// det som händer när en handling är klar
const KLAR: Partial<Record<Act, Krok>> = {
  falla: (s, p, t) => { // ett träd där ett hus ska stå, eller som fälldes för bygget, blir stockar i husets väggar direkt; resten huggs till trä
    if (!t.tool) return; // utan yxa står trädet kvar halvfällt, och nästa fällare gör resten
    fallTanke(s, p, tileOf(t.tx, t.ty)); // långt från byn tänker man på skogsvården (skogsvard.ts, steg 6.5.2)
    const k = fellTree(s, p, t.tx, t.ty);
    if (k) { // yxan slits för varje träd som faller (steg 2.3.12), också för trä som huggs ur det sedan; ibland har stammen mossa (steg 2.5.2)
      wearUsed(s, p, 1); mossaPaStam(s, p, k);
      k.ved -= toWalls(s, Math.floor(k.x), Math.floor(k.y), k.ved, t.ref, p);
      if (k.ved <= 1e-6) s.stockar = stocks(s).filter(q => q !== k);
    }
  },
  promenad: (s, p, t) => { lookAround(s, p, t.tx, t.ty); think(p, 'Tog en skön promenad', 0.06, s.now, 6 * HOUR); },
  bada: (s, p, t) => { sjoRakna(s, t.tx, t.ty, 'bad', p); p.warm = p.warm > 1 ? Math.max(1, p.warm - KROPP.badSvalka) : Math.max(KROPP.badMin, p.warm - KROPP.badKyla); think(p, 'Badade i sjön', 0.08, s.now, 6 * HOUR); },
  strand: (s, p) => { p.rest = Math.min(1, p.rest + KROPP.strandVila); think(p, 'Satt vid vattnet och fick ro', 0.06, s.now, 6 * HOUR); },
  varda: vardKlar, // såren trycks på, förband läggs, infekterade sår rengörs, och den som inte kan gå bärs hem (halsa.ts)
  vatten: vattenFylld, // vattensäcken är fylld och bärs till den som inte kan gå (torst.ts)
  avrusta: avrustaKlar, rusta: rustaKlar,
  hovbygge: (s, p, t) => hovArbete(s, p, 60 * (1 + 0 * t.carry)), be: (s, p, t) => bonKlar(s, p, t), begrava: kroppUpp, grava: gravKlar, // tron och graven (system 8.5)
  flyttaeld: (s, p) => flyttaElden(s, p), // elden står på en ny plats (eldflytt.ts)
};
for (const a of UTBROTT_ACTS) KLAR[a] = utbrottKlar; // efter ett utbrott (humor.ts, steg 3.2.2)
MEDAN.buren = burenSteg; // den som bärs hem väntar så länge någon bär hen
// att dricka (torst.ts): en gång när man kommit fram, och törsten hålls släckt så länge man dricker
for (const act of DRICKA_ACTS) MEDAN[act] = (s, p, t) => { if (t.prog === undefined) { t.prog = 0; drick(s, p, t); } else p.torst = 1; };
// slakt och rensning: den första arten med arbetet som finns i förrådet (kaninen före vargen, steg 3.7.14)
// mjärden är klar: materialet tas, och den sätts ut på närmaste strand (steg 7.4.2)
for (const k of Object.keys(FALLOR)) KLAR[k as Act] = (s, p) => { for (const [q, n] of Object.entries((RECEPT as Record<string, { av?: Record<string, number> }>)[k].av!)) takeMaterial(s, p, q, n); sattUt(s, p, k); };
lagRegister(); kyrkaRegister(); laggTillProjekt(kyrkProjekt()); satOffrad((s, p) => die(s, p, 'offrad'));
satOppnaAndlig(s => oppnaSed(s, 'andlig'));
satBudHandelse((s, p) => handelse(s, p, 'budbrott'));
export const KLAR_FOR = KLAR; // scenarierna prövar det som händer när ett arbete är klart
// det som görs vid en station är klart: materialet tas och saken läggs i förrådet, och är hens som gjorde den (tillverka.ts)
for (const k of TILLVERKA_LIST) { const d = TILLVERKA[k]; KLAR[d.act] = (s, p) => {
  for (const [q, n] of Object.entries(d.av)) { if (getable(s, p, q) < n) return; }
  const sack = d.vatten ? fylldSack(s) : undefined;
  if (d.vatten && !sack) return; // vattnet är borta: inget blir gjort, och materialet ligger kvar
  if (d.eld && !stationFor(s, d.act) && !s.fire.lit) return; // teet kokas vid en eld som brinner om byn inte har örtköket (steg 9.5.8)
  const kar = ar_vatska(d.ger) ? ledigFor(s, d.ger) : undefined;
  if (ar_vatska(d.ger) && !kar) return; // ingen ledig behållare som passar (steg 9.4.14): inget blir gjort
  if (sack) sack.inne = undefined; // säcken töms men finns kvar (steg 7.6.6)
  if (p.task?.tool && d.verktyg) wearUsed(s, p, 1);
  for (const [q, n] of Object.entries(d.av)) takeMaterial(s, p, q, n);
  if (kar && ar_vatska(d.ger)) { fyllVatska(s, d.ger, d.n, kar)!.inne!.q = rullaKvalitet(s, p, kvVid(s, p, d.act)); } else put(s, d.ger, d.n, { [p.id]: d.n }); // tjäran, salvan, limmet och teet i sin behållare, med kvalitet (steg 9.5.8)
  if (forstaGang(s, 'gjort_' + d.ger)) log(s, d.forsta.replace('{namn}', p.name), 'world', [p.id]);
}; }
MEDAN.vittja = (s, p, t) => { const m = mjardarOf(s).find(q => q.id === t.ref); if (m) vittja(s, p, m); t.until = s.now; };
for (const art of DJURARTER) MEDAN[art.act] ??= (s, p, _t, dtSec) => bearbeta(s, p, DJURARTER.find(a => a.act === art.act && djurKvar(s, a) > 0) ?? art, dtSec / HOUR_S);
MEDAN.grilla = (s, p, _t, dtSec) => grilla(s, p, dtSec / HOUR_S); // grillen över elden (matlagning.ts)
KLAR.koka_mat = (s, p) => kokaKlar(s, p);
KLAR.sopor = (s, p) => soporKlar(s, p);
KLAR.mata = (s, p, t) => mataKlar(s, p, t.ref); // de tama djuren (tamdjur.ts, steg 9.8.1)
KLAR.hage = (s, p, t) => hageKlar(s, p, t.ref); // hagen (steg 9.8.4)
KLAR.valla = (s, p, t) => vallaKlar(s, p, t.ref);
KLAR.klippa = (s, p, t) => klippKlar(s, p, t.ref);
KLAR.mjolka = (s, p, t) => mjolkaKlar(s, p, t.ref);
KLAR.slatter = (s, p, t) => slaKlar(s, p, t.ref);
KLAR.hamla = (s, p, t) => hamlaKlar(s, p, t.ref);
KLAR.avliva = (s, p, t) => avlivaKlar(s, p, t.ref);
KLAR.tomma_latrin = (s, p) => latrinTomKlar(s, p);
KLAR.staket = (s, p, t) => staketKlar(s, p, t.ref);
KLAR.skramma = (s, p, t) => skrammaKlar(s, p, t.ref); // fågelskrämman (odling.ts, steg 9.7.11) // staketet (odling.ts, steg 9.7.10) // sophögen (rester.ts, steg 9.7.5)
KLAR.steka = (s, p) => stekaKlar(s, p);
KLAR.baka = (s, p) => bakaKlar(s, p); // bakugnen (matlagning.ts, steg 9.6.23) // stekhällen (matlagning.ts, steg 9.6.21)
KLAR.malta = (s, p, t) => maltaKlar(s, p, t.ref); KLAR.brygga = (s, p, t) => bryggKlar(s, p, t.ref); KLAR.tappa = (s, p, t) => bryggKlar(s, p, t.ref); // bryggkaret (brygg.ts, steg 9.6.12) // rätten ställs på elden i lerkrukan (matlagning.ts, steg 9.6.3)
MEDAN.torka = (s, p, _t, dtSec) => torka(s, p, dtSec / HOUR_S); // torkställningen (matlagning.ts)
MEDAN.roka = (s, p, _t, dtSec) => torka(s, p, dtSec / HOUR_S, 'rokeri'); // rökeriet (matlagning.ts, steg 9.6.8)
// redskap som görs och träd som fälls: arbetet sparas om det avbryts (paborjat.ts)
for (const a of GOR_ACTS) { MEDAN[a] = workHalf; KLAR[a] = (s, p, t) => { if (finishHalf(s, p, t)) nastaRedskap(s, p, t); }; } // och ett till i samma pass (val.ts)
MEDAN.falla = workHalf;
MEDAN.bjornjakt = (s, p, t) => bjornjaktSteg(s, p, t); // jägarna går mot björnen och anfaller den (bjorn.ts, steg 6.6.6)
MEDAN.vargjakt = (s, p, t) => vargjaktSteg(s, p, t); // jägarna anfaller flocken (varg.ts, steg 3.7.1)
MEDAN.vakt = (s, p, t) => vaktSteg(s, p, t); // vakten går runt byn (vakt.ts, steg 3.7.4)
MEDAN.leka = (s, p, _t, dtSec) => lekSteg(s, p, dtSec); // kastlek och brottning (strid.ts, steg 3.7.2)
MEDAN.sport = sportSteg; KLAR.sport = sportKlar; // sporten (sport.ts, steg 4.3.1)
KLAR.handla = handlaKlar; // byns handel med handlaren (handel.ts, steg 4.4.1.3)
MEDAN.upptrada = upptradaSteg; KLAR.upptrada = upptradaKlar; MEDAN.lyssna = lyssnaSteg; // framträdandena (framtradande.ts, steg 4.3.2)
MEDAN.station = workStation; KLAR.station = finishStation; // en station som byggs (stationer.ts)
KLAR.tillbehor = finishTillbehor; // ett tillbehör till en möbel (stationer.ts)
KLAR.dorr = finishDorr; // en dörr i en öppning (bygg.ts)
KLAR.uppsatt = (s, p, t) => finishUppsatt(s, p, t);
KLAR.flyttStation = s => { stationFlytta(s); }; // en station ute närmare dem som använder den (stationer.ts, steg 9.4.8)
KLAR.flyttLager = s => { const v = lagerFlyttVal(s); if (v) lagerFlytta(s, v.z, v.ny); }; // en lagerplats närmare byns mitt (lager.ts, steg 9.4.7)
KLAR.lera = leraGravd; // leran läggs i en hög där den grävdes (lera.ts, steg 9.4.10)
KLAR.stubbe = stubbeGravd; // stubben är bortgrävd och blir lite trä (skog.ts, steg 6.5.7)
KLAR.plantera = plantaUppgravd; // plantan är uppgrävd och bärs till platsen (skogsvard.ts, steg 6.5.2)
KLAR.ljus = (s, p, t) => finishLjus(s, p, t); // ett talgljus på ett bord eller en hylla (ljus.ts, steg 6.3.8) // en uppsatt fackla (ljus.ts, steg 6.3.7)
MEDAN.forsok = forsokSteg; KLAR.forsok = forsokKlar; // försöken mot en teknik på nivå 4–5 (teknik.ts, steg 4.2.1.1)
MEDAN.odla = workOdla; KLAR.odla = finishOdla; // fälten (odling.ts)
MEDAN.slacka = slackaSteg; KLAR.slacka = slackaFylld; // att släcka en eldsvåda med händerna eller vattensäcken (brand.ts)
KLAR.slackaSig = slackaSigKlar; KLAR.hjalpaBrinnande = hjalpaKlar; // den som brinner (brand.ts, steg 6.4.16)
// de som bär till någon eller till elden, inte hem till förrådet: vad som görs framme, och att de inte lägger ner bördan när vägen är stängd (walk)
const LAMNA: Partial<Record<Act, (s: State, p: Person, tk: Task) => void>> = {
  varda: lamnaAv, // hemma med den som bars (halsa.ts)
  vatten: vattenFram, // vattnet i säcken till den som inte kan gå (torst.ts)
  slacka: slackaFram, // vattnet i säcken på elden (brand.ts)
  plantera: plantaSatt, // plantan sätts i jorden (skogsvard.ts)
};

// ---------- huvudsteg ----------
// ett slag om dtSec sekunder (BEAT i spelet och ikappräkningen; testerna kan ta andra). events = samtalen, för att visa dem
// Medan faran är nära (en strid pågår på kartan, kartstrid.ts) går hela byn i korta steg (STRID.kortSteg, steg 10.1.4), så att alla
// väljer om hela tiden; annars tas hela tiden i ett slag. Spelet och ikappräkningen går igenom samma följd av slag
export function step(s: State, dtSec: number, events?: TalkEvent[]) { // också när gränssnittet räknar (typer.ts)
  simulera(() => {
    let kvar = dtSec;
    while (kvar > 1e-9) {
      const d = faraNara(s) ? Math.min(kvar, STRID.kortSteg) : kvar;
      slag(s, d, events); stegTaget(s, d); kvar -= d;
    }
  });
}
function slag(s: State, dtSec: number, events?: TalkEvent[]) {
  useMap(s);
  const t0 = s.now;
  s.now += dtSec * SEC;
  const now = s.now;
  const ai = ageIndex(s);
  if (ai !== s.lastAgeIdx) {
    s.lastAgeIdx = ai;
    log(s, AGES_BORJAR[ai], 'world');
  }
  const ppl = living(s);
  gridOf(s); // väggarna och rummen, så att vägsökningen vet var väggarna står
  stationRutor(s); sakerPaGolvet(s); // ... och var hyllorna står och sakerna ligger på golvet (steg 2.3.6)
  djurSteg(s); // kaningrupperna väljer plats när deras tid börjar
  klanSteg(s, dtSec); // grannklanerna växer och glömmer (klaner.ts, steg 4.4.3)
  handelSteg(s, dtSec); // handlaren kommer, handlar och går (handel.ts, steg 4.4.1)
  vargSteg(s, dtSec); // vargarna under istiden (varg.ts, steg 3.7.1)
  bjornSteg(s); // den som kommer nära björnen (bjorn.ts, steg 6.6.5)
  djurStriderSteg(s); // striderna mot djur på kartan (djurstrid.ts, steg 9.2.29)
  rovarSteg(s, dtSec); // rövarflocken (rovare.ts, steg 4.4.5)
  framlingSteg(s, dtSec); // främlingen som kommer gående (liv.ts, steg 9.2.115)
  tornadoSteg(s, { rovarTornado, handlarTornado, handlarPlats }); // tornadon drar fram (tornado.ts, steg 3.8.4), och rövarna och handlaren drabbas (steg 6.4.12)
  brandSteg(s, dtSec); // gnistor, blixten och elden som sprider sig (brand.ts, steg 3.8.5)
  brinnerSteg(s, dtSec); // den som brinner (brand.ts, steg 6.4.16)
  // förråd: ruttning och ved
  wearStore(s, dtSec); // slitage per slag, fortare utanför lagret
  stepBlotVed(s, dtSec); // veden blir blöt och torkar (steg 7.3.4)
  stepFire(s, dtSec, ppl);
  const fh = hearthOf(s.fire), temp = temperature(s), coldRate = coldOf(temp);
  const learn = 1 + 0.1 * s.seder.v.nyfikenhet; // en nyfiken by lär sig snabbare
  if (Math.floor(now / HOUR) !== Math.floor((now - dtSec * SEC) / HOUR)) {
    atSteg(s); stepSeder(s); updateTags(s); stepRelationer(s); stepUppvaxt(s); stepReligion(s); for (const p of living(s)) morkHumor(s, p); facklorTimme(s); stepHumor(s); stepDelning(s); stepLarlingar(s);
    stepVader(s); vindfallen(s); regnetTvattar(s); stepMotgang(s); stepTorka(s); stepFlod(s); stepIs(s); growGround(s, 1, ai); growFynd(s, 1, ai, vaxtFaktor(s), vaderNu(s).nb); forget(s, 1); stepRykten(s, moodOf); glomRykten(s, 1); stepBerattelser(s); stepStyre(s); rotStumps(s); tidyStore(s);
    vaggRensa(s); kvarTimme(s); kultTimme(s); kyrkaTimme(s); wearBuild(s, 1, ai); stepByggnader(s); husKlaraTimme(s); stepMjardar(s); stepNaken(s); stepByggplan(s); stepEldFlytt(s); lagerIStraket(s); stepPaborjat(s); stepStationer(s); stepPynt(s); stepKrukor(s); protesTimme(s); halsoNotiser(s); stepKok(s); vatskorTimme(s); stepBrygg(s); stepBak(s); stepSophog(s); stepKompost(s); stepOrtKrukor(s); stadaByten(s); stepBrasor(s); stepKlader(s); stepOdling(s); stepTamdjur(s); stepHagar(s); stepBoskap(s); stepVinter(s); stepHons(s);
    askaSteg(s); // det svarta efter en eldsvåda försvinner (brand.ts)
    sorgTimme(s); // sorgen i stadier (liv.ts, steg 9.2.33)
    smittaTimme(s); smittaUtifranTimme(s); // smittan (sjukdom.ts, steg 9.5.3 och 9.5.5)
    forbrukTimme(s); // materialens förbrukning glöms långsamt (forradsmal.ts, steg 6.2.14)
    arbetsTimme(s); // byns behov för arbetsordningen (val.ts, steg 6.1.12)
    historikSteg(s); // nyckeltalen till byns historik (läses inte av simuleringen)
    compact(s); // här och inte i sparningen, så att alla lägen städar vid samma tid
  }

  let social: Person[] = [];
  const inRum = new Map<number, number>(); // hur många som är i varje rum
  for (const p of ppl) { const r = roomAt(s, p.x, p.y); if (r) inRum.set(r.id, (inRum.get(r.id) ?? 0) + 1); }
  for (const p of ppl) {
    if (!alive(p)) continue; // dödad tidigare i samma slag (av vargar eller i ett slagsmål)
    const a = ageOf(p, now);
    needsStep(s, p, a, dtSec, coldRate, fh, inRum, temp);
    if (p.task?.act !== 'strid') needLadder(s, p, dtSec); // äta: sitt eget, byns, och i yttersta nöd andras (behov.ts). Inte mitt i en strid (strid.ts)
    if (healthStep(s, p, a, ai, dtSec)) continue; // dog
    pregnancy(s, p, a, ppl.length, dtSec);
    if (!alive(p)) continue; // dog i barnsäng
    if (spar.pa) { spar.v.set(p, [t0, p.x, p.y]); spar.u.set(p, [[t0, kopia(p.task)]]); }
    taskStep(s, p, a, now, dtSec, learn, social);
    if (p.thoughts.some(x => x.until <= now)) p.thoughts = p.thoughts.filter(x => x.until > now);
  }
  // samtal: ca ett per 4 minuter per person i social aktivitet
  const e0 = events?.length ?? 0;
  if (social.length > 1) {
    social = social.filter(p => kanPrata(s, p)); // en brottning kan ha börjat under steget (steg 9.2.100)
    for (const p of social) {
      if (!alive(p)) continue;
      const expect = dtSec / STEG.samtalSek * (STEG.samtalBas + stat(p, 'empati', now) / STEG.samtalEmpati) * (p.sinnen === undefined ? 1 : tal(p) * STEG.samtalTal + horsel(p) * STEG.samtalHorsel + 1 - STEG.samtalTal - STEG.samtalHorsel); // talet och hörseln (steg 8.2.2)
      let n = Math.floor(expect); if (rnd(s, 'samtal', p) < expect - n) n++;
      // bara med dem som är nära när slaget slutar
      const nara = social.filter(q => q !== p && alive(q) && Math.hypot(q.x - p.x, q.y - p.y) < SAMTAL.radie);
      const med = p.task?.med !== undefined ? nara.find(q => q.id === p.task!.med) : undefined, others = med ? [med] : nara; // den man står bredvid (steg 4.5.6.7)
      for (let i = 0; i < n; i++) { const g = converse(s, p, others, events); if (g) gralBlirSlagsmal(s, p, g); } // ett gräl kan bli ett slagsmål (strid.ts)
      if (n && others.length) { count(s, 'samtal', n); if (p.task && !ACTS[p.task.act].social) p.pratArbete = (p.pratArbete ?? 0) + n; } // samtalen under arbetet (steg 8.1.12)
    }
  }
  kartStridSteg(s, dtSec); serStriden(s); // striderna på kartan stegas med byn, och de som ser dem väljer på nytt (kartstrid.ts, steg 10.1.4)
  // gästernas vardag (steg 9.2.113, gastvardag.ts): värmen räknas som en bybos, men reskläderna tar det mesta av kylan
  gastVardag(s, dtSec, g => { const v = varmeDelar(s, g, coldRate, inRum, temp); v.kyla *= 1 - GASTVARD.klad; return nyVarme(g.warm, v, dtSec / HOUR_S); });
  pratMedHandlare(s, dtSec, events); // småprat med handlaren (steg 4.5.4.15, handel.ts)
  // samtalen visas utspridda över slaget
  if (events) for (let i = e0; i < events.length; i++) events[i].t = t0 + (i - e0 + 0.5) / (events.length - e0) * dtSec * SEC;
  // relationer bleknar långsamt utan umgänge
  if (rnd(s, 'samtal') < dtSec / STEG.blekSek) {
    const k = Math.exp(-STEG.blek * (STEG.blekSek / 86400));
    for (const key in s.rels) { const r = s.rels[key]; r.op *= k; r.rom *= k; }
  }
  if (living(s).length === 0) log(s, 'Byn är tom. Ingen finns kvar vid elden.', 'world');
  regulate(s, dtSec);
  tidyTools(s);
  placeTools(s); // redskapen som släpptes läggs i förrådet
}


// behoven: hunger, törst, vila, värme, umgänge och toa. Elden värmer i ett område, och inne i ett hus kyls man långsammare
// (sämre ju fler öppningar). Delarna nedan räknas här och visas i personrutan, så att den visar det som faktiskt händer
// vilan per timme före tak och eld (talets namn i KROPP): den som har brist på energi tröttnar fortare (steg 2.6.2)
export const vilaTim = (p: Person, vs = viloSlag(p)) => KROPP[vs] * (KROPP[vs] < 0 ? trottFaktor(p) : 1);
export function viloSlag(p: Person): 'restVila' | 'restArbete' | 'restVaken' {
  const pd = p.task && ACTS[p.task.act];
  return pd && pd.vila ? 'restVila' : pd && pd.tungt && p.task!.phase === 'do' ? 'restArbete' : 'restVaken';
}
// tanken efter en natt under tak och hur glad den gör
const VILOTANKE = { restBadd: ['Sov gott i halmbädden', 0.09], restGolv: ['Sov gott på golvet i huset', 0.07], restTak: ['Sov under tak', 0.05] } as const;
// den som sover i ett hus vilar bättre, bättre på ett golv och bäst i en halmbädd: talets namn i KROPP, eller inget
export function viloTak(s: State, p: Person, rum: unknown): 'restBadd' | 'restGolv' | 'restTak' | undefined {
  const pd = p.task && ACTS[p.task.act];
  if (!(rum && pd && pd.vila && p.task!.phase === 'do' && pd.plats === 'sang')) return undefined;
  if (s.stationer?.length && stationRutor(s).sov.has(tileOf(p.x, p.y))) return 'restBadd';
  const m0 = gridOf(s).at.get(tileOf(p.x, p.y))?.m;
  return m0 === 'ho' || m0 === 'tra' ? 'restGolv' : 'restTak';
}
// man sover bättre i en finare bädd (kvalitet.ts): vilan och tanken gånger detta. Personrutan visar samma tal
// och sämre i ett rum där något passar dåligt ihop med att sova (RUM_MINUS i rum.ts, steg 7.2.1)
export const takEffekt = (s: State, p: Person, tak: ReturnType<typeof viloTak>) => (tak === 'restBadd' ? kvEffekt(stationRutor(s).at.get(tileOf(p.x, p.y))) : 1) * (tak ? rumVila(s, roomAt(s, p.x, p.y)) : 1);
// värmen per timme: elden, kylan (det huset, skinnfällen och kläderna skyddar är borta) och milt väder. inRum = hur många som är i varje rum.
// Över idealet (steg 2.3.4): solen (inte i skugga: i ett hus eller under ett träd), kläderna när det är milt och elden tätt intill
export function varmeDelar(s: State, p: Person, coldRate: number, inRum: Map<number, number>, temp = temperature(s)) {
  const rum = roomAt(s, p.x, p.y), brand = rum ? 0 : brandHetta(s, p.x, p.y), heat = Math.max(heatAt(s, p.x, p.y), brand), shelter = rum ? shelterOf(s, rum, inRum.get(rum.id) ?? 1) : 0; // branden värmer som lägerelden tätt intill (steg 9.2.135)
  const fall = tillbehorVarme(s, p, rum); // skinnfällen i bädden (steg 2.2.14)
  const klad = kladVarme(s, p); // kläderna (steg 2.3.2)
  const skugga = !!rum || groundOf(s).trees[tileOf(p.x, p.y)] > KROPP.skugga;
  // vädret (steg 2.11.1): den som är blöt eller ute i blåsten fryser som om det vore kallare, och molnen tar solen
  const vg = vaderGrader(s, p, !rum), cr = vg ? coldRate + coldOf(temp - vg) - coldOf(temp) : coldRate;
  const sol = skugga ? 0 : Math.max(0, temp - KROPP.solFran) / KROPP.solDiv * (1 - vaderNu(s).moln * VADER.molnSol);
  const kladHetta = klad * Math.max(0, temp - KROPP.kladFran) / KROPP.kladDiv, eldHetta = Math.max(0, heat - KROPP.eldTatt) * KROPP.eldHetta;
  return { heat, rum, shelter, fall, klad, eld: heat * KROPP.eldVarme, kyla: cr * (1 - shelter) * (1 - fall) * (1 - klad) * frysFaktor(p), mild: cr === 0 ? KROPP.mildVarme : 0,
    sol, kladHetta, eldHetta, brandHetta: brand > heatAt(s, p.x, p.y) ? eldHetta : 0, hetta: sol + kladHetta + eldHetta, skugga, blot: p.blot ?? 0, vaderGrader: vg };
}
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
function needsStep(s: State, p: Person, a: number, dtSec: number, coldRate: number, fh: ReturnType<typeof hearthOf>, inRum: Map<number, number>, temp: number) {
  const now = s.now;
  const vs = viloSlag(p);
  // mättnaden är en sammanfattning av näringen (steg 2.6.1); den som är för varm och arbetar tungt tappar salt (steg 2.6.2)
  naringSjunker(p, dtSec / HOUR_S * (a < ALDER.matBarn ? KROPP.hungerBarn : 1), KROPP.hungerTim, vs === 'restArbete' && p.warm > KROPP.forVarm);
  bristSteg(p, now);
  p.rest = clamp(p.rest + dtSec / HOUR_S * vilaTim(p, vs), 0, 1);
  { // regnet blöter den som är ute; man torkar inne och vid elden (steg 2.11.1)
    const ute = !roofed(s, p.x, p.y); // inne i ett hus håller man sig torr
    blotSteg(s, p, ute, ute && groundOf(s).trees[tileOf(p.x, p.y)] > KROPP.skugga, heatAt(s, p.x, p.y) > KROPP.eldNara, dtSec / HOUR_S);
    if ((p.blot ?? 0) > VADER.blotTanke) think(p, 'Blöt av regnet', -0.05, now, HOUR);
  }
  const v = varmeDelar(s, p, coldRate, inRum, temp), heat = v.heat;
  p.warm = p.brinner !== undefined ? KROPP.maxVarm : nyVarme(p.warm, v, dtSec / HOUR_S); // den som brinner har kroppens högsta värme tills elden är släckt (steg 9.2.135)
  const tak = viloTak(s, p, v.rum);
  if (tak) { // man vilar bättre under tak, och bäst på ett golv
    const e = takEffekt(s, p, tak);
    p.rest = clamp(p.rest + dtSec / HOUR_S * KROPP[tak] * e, 0, 1);
    if (p.task!.act === 'sova') think(p, VILOTANKE[tak][0], VILOTANKE[tak][1] * e, now, 8 * HOUR);
  }
  if (heat > KROPP.eldNara) {
    think(p, 'Värms av elden', fh.comfort, now, HOUR);
    p.rest = clamp(p.rest + dtSec / HOUR_S * fh.comfort * heat, 0, 1); // avslappning vid elden
  }
  if (p.warm < KROPP.fryser) think(p, 'Fryser', -0.12, now, HOUR);
  if (p.warm > KROPP.forVarm) think(p, 'För varm', -0.08, now, HOUR); // för varm (steg 2.3.4): en tanke
  // tröttare bara när man är extremt varm (steg 2.10.20): annars arbetar man som vanligt trots värmen
  if (p.warm > KROPP.extremVarm) p.rest = clamp(p.rest - dtSec / HOUR_S * KROPP.varmTrott * (p.warm - 1), 0, 1);
  p.social = clamp(p.social - dtSec / (KROPP.socialTim * HOUR_S), 0, 1);
  // toa: behovet växer på ungefär sju timmar, långsammare i sömnen
  p.toa = clamp(p.toa - dtSec / (KROPP.toaTim * HOUR_S) * (p.task?.act === 'sova' ? KROPP.toaSomn : 1), 0, 1);
  if (p.toa <= 0) { p.toa = 1; if (a >= ALDER.smabarn) { toaBesok(s, p); think(p, 'Kissade på sig', -0.12, now, 4 * HOUR); } } // små barn lämnar ingen fläck
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
  if (hl === 'svalt') { p.health -= dtSec / (KROPP.svaltTim * HOUR_S); if (rnd(s, 'halsa', p) < dtSec / STEG.svaltTanke) think(p, 'Svälter', -0.25, now, 3 * HOUR); }
  else if (hl === 'frys') p.health -= dtSec / (KROPP.frysTim * HOUR_S);
  else if (hl === 'torst') p.health -= dtSec / (TORST.tomTim * HOUR_S);
  else if (hl === 'laker') p.health = clamp(p.health + dtSec / (KROPP.lakerTim * HOUR_S), 0, 1);
  if (p.sickUntil !== undefined && p.sickUntil > now) p.health -= dtSec / (KROPP.sjukTim * HOUR_S); // den gamla klockan (en äldre sparning) tills den gått ut
  // sjukdomen mot motståndet (steg 9.5.2, sjukdom.ts): vinner sjukdomen dör hen av den
  drickTe(s, p); // örtteet (steg 9.5.8, vatskor.ts)
  drickDryck(s, p); // saften (steg 9.6.9, vatskor.ts)
  rusSteg(s, p, dtSec, hemma(s, p)); // berusningen (steg 9.6.14, rus.ts)
  const sjukDod = sjukSteg(s, p, dtSec, p.task?.act === 'sova', !!p.task && !!ACTS[p.task.act].arbete && p.task.phase === 'do', teFaktor(s, p, SJUK.lakeort));
  if (sjukDod) { die(s, p, SJUK_DOD[sjukDod]); return true; }
  if (p.sjuk && p.sjuk.grad >= 0.5 && !p.svartSjuk) { loggBer(s, 'l_svartSjuk', p.id, { namn: p.name }, 'world', [p.id]); p.svartSjuk = 1; } // svårt sjuk: ett tecken när hen blir frisk (steg 4.1.2.1)
  p.health -= dtSec / HOUR_S * skorbjugg(p); // brist på vitaminer (steg 2.6.2)
  if (!p.sjuk && !(p.sickUntil && p.sickUntil > now)) {
    // förkylningen av kyla, väta och trötthet (steg 9.5.1): oftare i istiden. Den svåra sjukdomen loggas när den kommit långt (sjukSvar nedan)
    if (chance(s, (iIstiden(ai) ? ARSTID.sjukIstid : ARSTID.sjuk) * SJUK.kyla / 86400, dtSec, 'halsa', p)) insjukna(s, p, 'forkylning');
  }
  if (p.health <= 0) { die(s, p, p.hunger <= 0 ? 'svalt' : p.warm < KROPP.frysdod ? 'kyla' : p.torst <= 0 ? 'torst' : (p.poisonUntil ?? 0) > now ? 'svamp' : skorbjugg(p) > 0 && !isSick(p, now) ? 'skorbjugg' : 'sjukdom'); return true; }
  // ålderdom och olyckor (Gompertz, per år = per dygn)
  const q = KROPP.dodBas + KROPP.dodAlder * Math.exp(KROPP.dodTakt * a) + (a < ALDER.barnsjuk ? KROPP.dodBarn : 0);
  if (chance(s, q / 86400, dtSec, 'halsa', p)) { die(s, p, a > ALDER.alderdom ? 'alderdom' : a < ALDER.barnsjuk ? 'barnsjukdom' : 'olycka'); if (a >= ALDER.barnsjuk && a <= ALDER.alderdom) fearPlace(s, p, DODSORSAKER.olycka.text); return true; }
  const dod = halsaSteg(s, p, dtSec); // kroppen: olyckor i farligt arbete, blödning och läkning (steg 2.5.1)
  if (dod) { die(s, p, dod); fearPlace(s, p, DODSORSAKER[dod].text); return true; }
  return false;
}

// dödsorsaken för varje sjukdom (steg 9.5.1): den heter som raden, och svampförgiftningen som förut
const SJUK_DOD: Record<SjukId, Dodsorsak> = { magsjuka: 'magsjuka', matforgiftning: 'matforgiftning', svampforgiftning: 'svamp', forkylning: 'forkylning', lunginflammation: 'lunginflammation', massling: 'massling', koppor: 'koppor' };
// hur långt graviditeten gått, 0–1 (steg 8.1.11), eller inget
// tiden kvar tills barnet föds (ms), för panelen (steg 9.2.70)
export const gravidKvar = (p: Person, now: number) => p.pregnantSince === undefined ? undefined : Math.max(0, p.pregnantSince + STEG.dragtid * DAY - now);
export const gravidDel = (p: Person, now: number) => p.pregnantSince === undefined ? undefined : Math.min(1, (now - p.pregnantSince) / (STEG.dragtid * DAY));
// graviditet: en kvinna med partner kan bli gravid; viljan styrs av hur många byn är, maten och sederna
function pregnancy(s: State, p: Person, a: number, pop: number, dtSec: number) {
  const now = s.now;
  if (p.foder) { if (now >= p.foder.till) birth(s, p); } // förlossningen tar tid (steg 9.5.29)
  else if (p.pregnantSince !== undefined) { if (now - p.pregnantSince > STEG.dragtid * DAY) borjaForlossning(s, p); }
  else if (p.sex === 'k' && p.partner !== undefined && a >= ALDER.gravFran && a <= ALDER.gravTill && (!p.lastBirth || now - p.lastBirth > STEG.mellanFodslar * DAY)) {
    const f = birthWish(pop) * clamp(foodDays(s) / STEG.matDygn, STEG.matMin, 1) * barnMat(s, pop) * (1 + STEG.sedBarn * s.seder.v.barn);
    if (chance(s, STEG.chans * f / 86400, dtSec, 'halsa', p)) { p.pregnantSince = now; p.pregnantBy = p.partner; notis(s, 'gravid', `${p.name} väntar barn.`, [p.id]); }
  }
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
    const phaseFlip = t && t.dark !== !light && ACTS[t.act].dygn; // dag blev natt eller tvärtom
    if (t && t.phase === 'do' && t.until <= now) KLAR[t.act]?.(s, p, t, 0); // ett träd som fällts färdigt, en yxa som gjorts klar
    const tf = t?.act === 'tanda' ? eldById(s, t.ref) : undefined, lightDone = t?.act === 'tanda' && (!tf || tf.lit || !canLight(s, p, tf));
    const mustGo = t && p.toa < KROPP.toaAvbryt && !ACTS[t.act].nodFri && a >= ALDER.smabarn; // nöden avbryter det man håller på med (inte den som bärs eller den som slåss)
    if (!t || (t.until <= now && t.phase !== 'back') || ((phaseFlip || mustGo) && t.phase !== 'back') || lightDone) {
      if (t && isCarrying(t) && t.act !== 'elda') { t.phase = 'back'; const d = dropSpot(s, homeKind(t)); t.tx = d.x + sida(p, 0.2); t.ty = d.y + sida(p, -0.2); }
      else if (!(t?.med !== undefined && t.phase === 'do' && !phaseFlip && !mustGo && t.until <= now && skiljsAt(s, p))) chooseTask(s, p); // efter samtalet går man isär en bit (steg 4.5.6.7)
    }
    if (spar.pa) sparaUppgift(p, now); // (bara för att visa)
    const tk = p.task!, d = ACTS[tk.act];
    let used: number;
    if (tk.phase === 'go' || tk.phase === 'back') {
      if ((tk.act === 'varda' && tk.phase === 'go') || (tk.act === 'vatten' && tk.phase === 'back' && !tk.falt)) vardMal(s, tk); // den skadade kan ha flyttat sig
      const w = walk(s, p, tk, left);
      used = w.used;
      if (tk.bar !== undefined && !barMed(s, p, tk)) { left -= used; continue; } // den som bärs följer med
      if (w.framme) { s.now = t1 - (left - used) * SEC; arrive(s, p, tk, isLight(s.now)); }
    } else if (d.tur && tk.phase === 'do') used = turSteg(s, p, tk, left); // promenaden (steg 6.2.8)
    else if (d.runda && tk.phase === 'do') used = rundaSteg(s, p, tk, left, a, learn); // också den som letar flinta eller stenar, bland stenarna (steg 4.5.6.3)
    else {
      // arbetet i bitar: till uppgiftens slut, till dess bördan bärs hem, men aldrig längre än BIT sekunder åt gången
      used = Math.min(left, Math.max(0, (tk.until - now) / SEC), BIT);
      // samlandet går så fort att busken töms mitt i en bit (steg 2.12.4): biten slutar då, och sedan går man vidare
      const kvar = d.fart && d.arbete && tk.phase === 'do' ? tidTillTom(s, p, tk) : Infinity, tom = kvar > 0 && kvar <= used;
      if (tom) used = Math.max(1, kvar);
      s.now = t1 - (left - used) * SEC;
      MEDAN[tk.act]?.(s, p, tk, used);
      if (d.arbete && p.task === tk && tk.phase === 'do') workStep(s, p, tk, used, a, learn, tom);
      // (bygget kan just ha skickat iväg personen efter mer material)
      if (tk.phase === 'do' && d.hantverk) ovning(p, 'hantverk', used / HOUR_S * STEG.ovningHant * learn);
      if (d.vandra) wear(groundOf(s), tileOf(tk.tx, tk.ty), MARK.nott * STEG.markNot * STEG.vandraNot * d.vandra.v * used); // man rör sig på platsen
    }
    if (spar.pa && tk.phase !== 'go') sparaUppgift(p, t1 - (left - used) * SEC); // det som plockats syns när biten är klar (steg 6.1.1)
    // vana: tiden räknas mot yrkestaggar
    addHabit(p, tk.act, Math.exp(-used * SEC / HABIT_FADE), used / HOUR_S);
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
function pathFor(s: State, g: ReturnType<typeof groundOf>, x0: number, y0: number, x1: number, y1: number) {
  // under en brand ändras vägarna med elden (steg 9.2.136): de räknas om varje gång, och den som är instängd går ut genom elden
  if (g.brand) { stationRutor(s); return findPath(g, x0, y0, x1, y1) ?? findPath(g, x0, y0, x1, y1, true); } // stänger elden in en, går man ut genom den
  const key = `${Math.floor(s.now / (4 * HOUR))},${s.byggV ?? 0}`;
  let c = vagar.get(s);
  if (c?.key !== key) vagar.set(s, c = { key, m: new Map() });
  const k = tileOf(x0, y0) * W * H + tileOf(x1, y1);
  let v = c.m.get(k);
  if (v === undefined) { stationRutor(s); c.m.set(k, v = findPath(g, x0, y0, x1, y1)); } // en hylla byggd i det här steget räknas med
  return v ? v.slice() : null; // null = ingen väg dit
}
// att gå mot målet ruta för ruta runt vatten, gärna längs stigar. Ger tiden det tog och om man kom fram
// arbetaren står framför rutan hen arbetar på, aldrig i den (steg 9.2.47): stubben och graven grävs från en granne, huden
// hängs från rutan utanför dörröppningen och byggrutan byggs från en granne. Målet blir den grannruta man kan stå på som ligger
// närmast, och arbetet gäller fortfarande rutan (tx, ty)
const FRAMFOR = new Set<string>(['stubbe', 'grava', 'dorr', 'bygga']);
function malFor(s: State, p: Person, tk: Task): { x: number; y: number } {
  if (!FRAMFOR.has(tk.act) || tk.phase !== 'go' || tk.site) return { x: tk.tx, y: tk.ty };
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
function walk(s: State, p: Person, tk: Task, left: number) {
  const g = groundOf(s);
  if (g.brand && tk.path?.some(i => g.brand![i] === 1)) tk.pk = undefined; // en ruta på vägen började brinna: vägen söks om (steg 9.2.136)
  const key = `${tk.tx.toFixed(2)},${tk.ty.toFixed(2)},${s.byggV ?? 0}`; // en ny vägg kan stänga vägen
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
  const sm = smidig(p, s.now), snoF = snoFart(s, p); // snön på marken (steg 7.7.3)
  const klocka = () => t0 + (fart * left - budget) / fart * SEC;
  if (budget <= 0) return { used: left, framme: false };
  // punkt för punkt längs vägen (var och en lite vid sidan av) och sist till målet. Marken nöts där man går
  for (;;) {
    const sist = !tk.path?.length, i = sist ? 0 : tk.path![0];
    const wx = sist ? tk.mx ?? tk.tx : (i % W) + 0.5 + off, wy = sist ? tk.my ?? tk.ty : Math.floor(i / W) + 0.5 - off;
    const ci = tileOf(p.x, p.y), sp = rutFart(p, g, ci, sm) * morkFart(s, p) * (snoF < 1 && !roofed(s, p.x, p.y) ? snoF : 1); // i totalmörker går man långsammare (ljus.ts), och ute i snön
    if (gangVakt.lyss) gangVakt.lyss(s, p, fart * sp, morkFart(s, p) < 1); // vakten i testerna (steg 9.2.101)
    const dx = wx - p.x, dy = wy - p.y, d = Math.hypot(dx, dy), can = budget * sp;
    wear(g, ci, MARK.nott * STEG.markNot * Math.min(d, can));
    if (d > can) { p.x += dx / d * can; p.y += dy / d * can; return { used: left, framme: false }; } // tiden räckte inte hela vägen
    p.x = wx; p.y = wy; budget -= d / sp;
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
    const h = hash3(p.id, tileOf(tk.tx, tk.ty), Math.floor(now / SEC));
    if (h < r.se) { tk.plock = r.stopp[0] + h / r.se * (r.stopp[1] - r.stopp[0]); lookAround(s, p, tk.tx, tk.ty); }
    return used;
  }
  if ((tk.plock ?? 0) > 1e-6) { const used = Math.max(1e-3, Math.min(left, tk.plock!, slut, BIT)); tk.plock! -= used; return used; }
  tk.plock = undefined;
  const q = n < 2 ? turPunkt(s, p, tk, r.r) : undefined;
  if (!q) return Math.max(1e-3, Math.min(left, slut, BIT)); // ingen punkt att gå till: hen står kvar en stund
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
  if (tk.act === 'elda') {
    if (tk.phase === 'go') {
      // vid förrådet: ta en famn ved och gå till elden. Byns och sin egen, eller den andras (stöld i yttersta nöd, behov.ts)
      // till elden task.ref (den första när ref saknas)
      const fran = byId(s, tk.fran), e = eldById(s, tk.ref);
      const n = !e || e.fuel >= fireWant(s, e) ? 0 : Math.min(1, fuelFor(s, p, fran)); // en famn i taget, så att elden matas oftare
      if (n <= 0 || !e) p.task = undefined;
      else {
        const at = eldXY(s, e);
        tk.ag = { ved: {} }; tk.carry = takeFuel(s, n, p, tk.ag.ved, fran); tk.phase = 'back'; const v = vidElden(s, p, at); tk.tx = v.x; tk.ty = v.y;
        if (fran) stole(s, p, fran, VED.id, tk.carry); else if ((tk.ag.ved[p.id] ?? 0) > 1e-9) noticeTheft(s, p, VED.id);
      }
    } else { const e = eldById(s, tk.ref); if (e) addFuel(s, p, tk.carry, e); else giveBack(s, tk.carry); tk.carry = 0; p.task = undefined; }
  } else if (tk.act === 'bygga' && tk.phase === 'go' && tk.site) {
    // vid lagret: ta materialet och gå till bygget
    const b = bitById(s, tk.ref), k = b && MATERIAL[b.m].item, har = (k && tk.items?.[k]) || 0, n = b ? needOf(b) - har : 0;
    if (!b || !k || avail(s, k, p, b.hus) < n) avbryt(s, p); // det man redan bar läggs i lagret där man står
    else { // det som togs, inte mer, till det man redan har i händerna
      tk.kom ??= {}; const ag = takeForHouse(s, p, b.hus, k, n, tk.kom), mitt = (tk.ag ??= {})[k] ??= {};
      for (const id in ag) mitt[id] = (mitt[id] ?? 0) + ag[id];
      tk.items = { ...tk.items, [k]: har + sumOf(ag) }; tk.tx = tk.site.x; tk.ty = tk.site.y; tk.site = undefined;
    }
  } else if (tk.hamta && tk.site && tk.phase === 'go') hamtat(s, p, tk); // vid lagret: materialet till hantverket (steg 9.2.43)
  else if (tk.phase === 'back' && LAMNA[tk.act]) LAMNA[tk.act]!(s, p, tk); // framme hos den man bär till (LAMNA)
  else if (tk.phase === 'back') {
    storeLoad(s, tk, p.x, p.y, p.id);
    // ett arbetspass är klart: gå tillbaka och fortsätt om arbetet inte är slut och dagen inte vänt
    const r = tk.res;
    if (r && r.until > now + 2 * MIN && tk.dark === !light) { tk.phase = 'go'; tk.tx = r.x; tk.ty = r.y; tk.until = r.until; tk.res = undefined; }
    else p.task = undefined;
  } else {
    if (hamtaForst(s, p, tk)) return; // materialet hämtas först (steg 9.2.43)
    tk.phase = 'do'; tk.hopp = undefined; tk.plock = undefined; if (tk.act === 'bara') { pickUp(s, p, tk, ryms(s, p)); tk.until = now; }
    if (tk.act === 'flyttaeld') tk.until = now + ELDFLYTT.tim * HOUR; // vid elden: släcka den och bära stenarna (eldflytt.ts)
    startWork(s, p, tk); // ett redskap eller ett träd: arbetet räknas härifrån, och det påbörjade fortsätter
  }
}

// det ett arbete för byn ger, per handling. y = det platsen gav den här biten (takten gånger platsens värde rich), rd = redskapet
// i handen, a = åldern, bar = lägg något bredvid bördan (grenar, rötter, svamp). Svarar raden true har den själv lagt det i bördan
// delar = platsens värde per lager före uttaget (richnessDelar), när arbetet tar ur flera lager
interface Arbetsbit { y: number; rich: number; delar?: number[]; rd: ReturnType<typeof toolRow>; dtSec: number; a: number; bar: (k: string, n: number) => void }
const UTFALL: Partial<Record<Act, (s: State, p: Person, tk: Task, b: Arbetsbit) => boolean | void>> = {
  // fiske med händerna, spjut eller metspö: ett försök i taget, och fiskaren går hem med varje fångst
  fiske: (s, p, tk, { rd, dtSec, a, bar }) => {
    tk.prog = (tk.prog ?? 0) + dtSec;
    if (tk.mortBete === undefined) { const agn = mayTake(s, p, 'fiskrens') >= 1; tk.mortBete = agn || ownsAmount(s, p, 'mort') >= 1 ? 1 : 0; if (tk.mortBete) { use(s, p, agn ? 'fiskrens' : 'mort', 1); count(s, agn ? 'fiskrensBete' : 'mortBete'); } } // en mört per fisketur (steg 7.4.4), eller fiskrens som agn (steg 9.8.7)
    // ligger isen hugger man först upp ett hål (is.ts), och sedan pimplar man genom det. Går det inte slutar man
    if (tk.hal === undefined && islagt(s)) {
      const h = halVal(s, p);
      if (!h) { tk.until = s.now; return; }
      tk.hal = halMin(s, p) * 60;
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
    if (!tk.carry && richness(s, 'fiske', tk.tx, tk.ty) < PLATS.tomtGrans) {
      lookAround(s, p, tk.tx, tk.ty);
      const sp0 = spotFor(s, 'fiske', p), sp = freeNear(s, sp0.x, sp0.y); // aldrig i en husvägg
      if (Math.hypot(sp.x - tk.tx, sp.y - tk.ty) > 1.5) { tk.tx = sp.x; tk.ty = sp.y; tk.phase = 'go'; tk.hal = undefined; count(s, 'fiskeByter'); }
      else tk.until = s.now;
    }
  },
  hugga: (s, p, tk, { y, bar }) => {
    const k = stocks(s).find(q => q.id === tk.ref), got = chopStock(s, tk.ref, y);
    if (!got) tk.until = s.now; // stammen är slut
    else {
      if (k) got.ved -= toWalls(s, Math.floor(k.x), Math.floor(k.y), got.ved, undefined, p); // står stammen där ett hus byggs blir träet väggar
      tk.carry += got.ved; bar('grenar', got.grenar); bar('mossa', got.mossa);
      if (got.done) { tk.until = s.now; const h = k && husById(s, bitAt(s, Math.floor(k.x), Math.floor(k.y))?.hus); if (h) husKlart(s, h, p); } // stocken var det sista i huset (steg 8.1.13)
    }
    return true;
  },
  // virket (steg 4.5.5.2): varje virke tar SKOG.virkeVed av stammens trä, och grenarna följer med som när man hugger
  klyva: (s, _p, tk, { y, bar }) => {
    const got = chopStock(s, tk.ref, y * SKOG.virkeVed);
    if (!got) tk.until = s.now;
    else { tk.carry += got.ved / SKOG.virkeVed; bar('grenar', got.grenar); bar('mossa', got.mossa); if (got.done) tk.until = s.now; }
    return true;
  },
  samla: (s, p, tk, { y, rich, delar, rd, dtSec, bar }) => {
    if (plockSlag !== undefined) { // på rundan (steg 9.2.55): det som plockades, en hel sak
      if (plockSlag === 'rotter') { bar('rotter', rd?.rotter ?? 1); count(s, 'samlat_rotter', 1); gjort(s, p, 'samlat', 1); }
      else if (plockSlag === 'sten') bar('sten', 1);
      else if (plockSlag === 'flinta') { // flintan vid stenarna (som forageItems i eld.ts räknade den)
        const ff = flintFactor(s, tk.tx, tk.ty); count(s, ff > ELD.flintaStenar ? 'flintaSten' : 'flintaAnnan'); bar('flinta', 1);
        if (ff > ELD.flintaStenar) observe(s, p, 'flinta', tk.tx, tk.ty);
      }
      else if (plockSlag === 'kantarell' || plockSlag === 'spindling') { const f = svampPlock(s, p, plockSlag); for (const k in f) bar(k, f[k]); }
      else if (plockSlag) { tk.carry += 1; count(s, 'samlat_bar', 1); gjort(s, p, 'samlat', 1); }
    } else if (y > 0) {
      // rötterna efter hur mycket av platsen som var rötter före uttaget; med benspaden gräver man fram fler (steg 2.7.2)
      const rot = delar?.[lagren('samla').indexOf('rotter')] ?? richness(s, 'rotter', tk.tx, tk.ty);
      const r = rich > 0 ? y * Math.min(1, rot / rich) : 0;
      tk.carry += y - r; bar('rotter', r * (rd?.rotter ?? 1));
      count(s, 'samlat_bar', y - r); count(s, 'samlat_rotter', r); // vad som samlats av varje slag (scenariot rotter)
      gjort(s, p, 'samlat', y);
    }
    // på rundan hittar man det andra (hö, kvistar, mossa, ägg, frön) under hela tiden ute, också gången sedan förra plocket (tk.letat)
    const pa = plockSlag !== undefined ? dtSec + (tk.letat ?? 0) : dtSec;
    if (plockSlag !== undefined) tk.letat = undefined;
    const fart = ACTS[tk.act].fart ?? 1, got = (plockSlag !== undefined ? utanStenar(forageItems(s, p, pa, fart)) : forageItems(s, p, pa, fart)) ?? {}, dt = pa * fart; // det som växer på platsen hittar man lika mycket fortare (steg 2.12.4); stenarna och flintan plockas på rundan
    if (plockSlag === undefined && !svampTabu(s)) bar('svamp', pickMushrooms(s, p, tk.tx, tk.ty, dt, got)); // på rundan plockas svampen som en sak (svampPlock)
    for (const k in got) bar(k, got[k]); // tändmaterialet först, så att mossan inte tar händerna från den som hämtar det
    bar('mossa', mossaFynd(s, tk, dt)); // mossa till förband (steg 2.5.2)
    { const r = rollekaNara(s, tk.tx, tk.ty); if (r) { const g = r.v * dt / HOUR_S * ROLLEKA; takeFrom(s, 'rolleka', r.x, r.y, g); bar('rolleka', g); } } // den första örten (steg 7.6.3) växer vild på kartan (steg 9.7.15)
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
// sekunder tills platsen är tom (rikedomen nere i PLATS.tomtGrans) med den takt arbetet har nu
function tidTillTom(s: State, p: Person, tk: Task) {
  const { takt, del, rich } = arbetsTakt(s, p, tk), sj = del ? sankning(s, ACTS[tk.act].resurs!, tk.tx, tk.ty, rich, del.r) : 0;
  return takt > 0 && sj > 0 ? Math.max(0, rich - PLATS.tomtGrans) / sj / takt : Infinity;
}
// arbete för byn (handlingar med arbete): det man får och bär, det platsen har kvar, redskapen som slits och det man lär sig.
// tom = biten tömde platsen (tidTillTom)
// rundan (steg 4.5.6.1): samlaren går i full fart från ruta till ruta och stannar en kort stund där det finns något att
// plocka. Gången räknas som arbete på rutan man går till, så att en arbetstimme ger ungefär lika mycket som när man stod
// vid busken. Hittar man ingen ruta nära går man till nästa buske (nastaBuske) eller hem. Ger tiden som gått
// Rundan söker sig utåt (steg 4.5.6.2): varje ruta längre från lägret är värd drag() mer. Nyfikenheten och modet drar ut;
// bördan, hungern, törsten, tröttheten, mörkret som kommer, kylan och rädslan drar hem. Det finns inget tak: den som dras
// utåt kan gå ända till kartans kant. Barn, gamla och skadade dras mindre ut
// den som är naken blir missnöjd, mer ju fler andra i byn som bär kläder (steg 7.7.11)
function stepNaken(s: State) {
  const folk = living(s), kladda = folk.filter(p => kladVarme(s, p) > 0).length;
  if (!kladda || !folk.length) return;
  for (const p of folk) if (kladVarme(s, p) === 0 && ageOf(p, s.now) >= ALDER.bygger) think(p, 'Är naken när andra har kläder', NAKEN * kladda / folk.length, s.now, 2 * HOUR);
}
const NAKEN = -0.06;
const ROLLEKA = 0.6; // så mycket rölleka per timmes samlande på en rik röllekaruta (steg 9.7.15)
export const RUNDA = balans('runda', {
  sett: 12, // så många rutor minns man att man nyss plockat på ...
  settSok: 3, // ... och bland stenarna, där det är få rutor och flintan och stenarna inte tar slut på en gång
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
  langtR: 10, // finns inget att plocka inom MINNE.sokR letar den som dras utåt så här långt bort
  vargR: 12, // vargar och rövare så här nära en ruta skrämmer: vargRadsla vid dem, mindre längre bort och för den modige
  vargRadsla: 0.6,
  // samlandet, en gång för alla (steg 9.2.53–9.2.57): saker på rutan, ett plock i taget, och nästa mål när platsen är tom
  plock: 2, // sekunder (spelets tid) att plocka upp en sak: fast och kort, inte ett balanstal; balansen sitter i mängden
  syn: 4, // så många rutor bort ser samlaren rutor med saker och går dit (synvidden)
  malR: 12, // nästa mål söks så här långt bort (bortom det hen ser), bland det hen vet eller tror om marken
  grenSaker: 2, // grenar på en skogsruta där det ligger grenar (högst), sten och flinta på en ruta vid stenarna (de som inte står i FYND)
  grenTat: 0.03, // så stor del av skogsrutorna har grenar på marken (räknat ur rutan)
  stenSaker: 3,
  flintTat: 0.01, // så stor del av rutorna vid stenarna har en flinta (i sanden mindre, efter rutans värde)
  hem: 0.04, // hem när draget drar hemåt mer än så här (bördan, hungern, törsten, tröttheten, mörkret, kylan)
  ater: 1, // en tömd ruta med grenar eller stenar får tillbaka så här många saker per dygn (år i spelet)
});
// ---------- saker på rutan (steg 9.2.53) ----------
// Varje ruta har ett helt antal saker av det samlaren letar: bär och rötter efter rikedomen i sitt lager (FYND, saker på en full
// ruta), grenarna i skogen och stenarna och flintan vid stenarna efter rutan, minus det som plockats där (s.plockat, som växer
// tillbaka). Bilden visar samma antal (ui/vaxter.ts), så det som syns är det som går att plocka
const plockKey = (tk: Task, i: number) => `${tk.sok ? 'sten' : ACTS[tk.act].resurs ?? 'gren'}:${i}`;
function plockatPa(s: State, key: string) {
  const r = s.plockat?.[key];
  if (!r) return 0;
  const kvar = r.n - Math.floor((s.now - r.t) / DAY * RUNDA.ater);
  if (kvar <= 0) { delete s.plockat![key]; return 0; }
  return kvar;
}
// sakerna på rutan per lager (för bär och rötter två), eller en siffra för grenarna och stenarna
export function sakerPaRutan(s: State, tk: Task, x: number, y: number): { k: string; n: number }[] {
  if (!inMap(x, y) || gridOf(s).solid[y * W + x] === 1) return []; /* under en vägg ligger inget att plocka (samlaren ställde sig i väggen, by 1) */
  const res = ACTS[tk.act].resurs, i = y * W + x;
  // stenarna ligger flera på rutan vid stenarna; flintan är sällsynt, en på var hundrade ruta där (RUNDA.flintTat), och bara så
  // länge byn behöver flinta (som förut i forageItems, eld.ts)
  if (tk.sok) {
    const v = rutVarde(s, tk)(x, y), sten = needStones(s);
    const n = sten ? Math.floor(v * RUNDA.stenSaker + 1e-9) : flintaBehovs(s, tk) && hash3(s.seed, i, 991) < v * RUNDA.flintTat ? 1 : 0;
    return [{ k: sten ? 'sten' : 'flinta', n: Math.max(0, n - plockatPa(s, plockKey(tk, i))) }];
  }
  // bär och rötter, och svampen som växer där (kantarellen och den giftiga spindlingen)
  // antalet är rikedomen räknad i saker, och resten avgör om det ligger en sak till (räknat ur rutan och dygnet, ingen slump),
  // så att det i snitt finns lika mycket som rikedomen säger
  if (res) { const dag = Math.floor(s.now / DAY), svamp = res === 'samla' && !(tk !== SAMLAR.samla && svampTabu(s)); /* där svampen är tabu låter samlaren den stå (steg 9.9.4); bilden visar den ändå */ return [...lagren(res), ...(svamp ? ['kantarell', 'spindling'] as FyndId[] : [])].map((j, n) => { const v = richness(s, j, x + 0.5, y + 0.5) / FYND[j].topp * (FYND[j].saker ?? 1), hel = Math.floor(v); return { k: j, n: hel + (hash3(s.seed + n, i, dag) < v - hel ? 1 : 0) }; }); }
  const tr = groundOf(s).trees[i];
  const h = hash3(s.seed, i, 977), bas = tr >= FOREST && h < RUNDA.grenTat ? 1 + Math.floor(h / RUNDA.grenTat * RUNDA.grenSaker) : 0;
  return [{ k: 'grenar', n: Math.max(0, Math.min(RUNDA.grenSaker, bas) - plockatPa(s, plockKey(tk, i))) }];
}
const flintaBehovs = (s: State, tk: Task) => flintorOchYxor(s) < ELD.flintaMax && !overTak(s, 'flinta', tk.items?.flinta ?? 0);
// sakerna på marken utan en samlare (för bilden, ui/vaxter.ts och terrang.ts): det som samlas (bär, rötter och svamp) eller grenarna
const SAMLAR: Record<'samla' | 'grenar', Task> = { samla: { act: 'samla', phase: 'do', tx: 0, ty: 0, until: 0, carry: 0, why: '' }, grenar: { act: 'ved', phase: 'do', tx: 0, ty: 0, until: 0, carry: 0, why: '' } };
export const sakerPaMarken = (s: State, slag: 'samla' | 'grenar', x: number, y: number) => sakerPaRutan(s, SAMLAR[slag], x, y);
export const sakerPa = (s: State, tk: Task, x: number, y: number) => sakerPaRutan(s, tk, x, y).reduce((a, q) => a + q.n, 0);
// ett plock (steg 9.2.55): en sak tas från rutan, den som det finns mest av. Svarar med slaget, eller undefined om rutan är tom
function plockaEn(s: State, tk: Task, x: number, y: number): string | undefined {
  const fore = sakerPaRutan(s, tk, x, y).sort((a, b) => b.n - a.n)[0];
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
function drag(s: State, p: Person, tk: Task, varde: (x: number, y: number) => number) {
  const now = s.now, a = ageOf(p, now), h = hourOf(now);
  let ut = RUNDA.ut + RUNDA.nyfiken * stat(p, 'nyfikenhet', now) / 20 + RUNDA.mod * stat(p, 'mod', now) / 20;
  if (a < ALDER.vuxen || a >= ALDER.gammal || halsa(p) < RUNDA.svagHalsa) ut *= RUNDA.svag;
  const under = (v: number) => Math.max(0, 0.5 - v) * 2;
  ut -= RUNDA.borda * Math.min(1, load(tk, s) / Math.max(1, bordPlats(s, p))) + RUNDA.behov * (under(p.hunger) + under(p.torst) + under(p.rest));
  ut -= RUNDA.mork * (isLight(now) ? clamp(1 - (19 - h) / RUNDA.morkTim, 0, 1) : 1);
  ut -= RUNDA.kyla * (Math.min(1, coldOf(temperature(s))) + (p.warm < KROPP.kallt ? 1 : 0));
  const mod = clamp(MINNE.radslaMax - stat(p, 'mod', now) / 20, MINNE.radslaMin, MINNE.radslaMax);
  const hot = [...(s.vargar ?? []), ...(s.rovare ? [s.rovare] : []), ...(s.rovareFler ?? [])]; // alla rövarflockar (steg 8.7.18)
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
  // nära: rutorna man ser, utan drag. Längre bort drar det utåt, och längst bort gäller det man tror om rutan
  // bär och rötter: det man tror om marken man inte ser; grenarna och stenarna syns på marken
  const res = ACTS[tk.act].resurs, tror = res && !tk.sok ? trorOm(s, p, res) : (x: number, y: number) => varde(x, y) - radsla(x, y);
  return { nara: { ut: 0, radsla }, bort: { ut, radsla }, langt: { ut, radsla, tror: (x: number, y: number) => tror(x, y) - fara(x, y) }, ut };
}
// det en ruta ger på rundan, 0–1 (steg 4.5.6.3): bären och rötterna efter vad som finns kvar, grenarna i skogen, och för den
// som letar stenar eller flinta närheten till stenarna (som forageItems i eld.ts)
function rutVarde(s: State, tk: Task): (x: number, y: number) => number {
  const res = ACTS[tk.act].resurs;
  if (tk.sok) {
    if (needStones(s)) { const sd = stoneDist(s.seed); return (x, y) => { const v = sd[y * W + x]; return v <= ELD.stenNara ? 1 : v <= ELD.stenMedel ? ELD.stenMedelDel / ELD.stenNaraDel : ELD.stenAnnars / ELD.stenNaraDel; }; }
    return (x, y) => { const f = flintFactor(s, x + 0.5, y + 0.5); return f > ELD.flintaStenar ? 1 : f > ELD.flintaSand ? RUNDA.sand : 0; };
  }
  if (res) return (x, y) => richness(s, res, x + 0.5, y + 0.5);
  const tr = groundOf(s).trees;
  return (x, y) => tr[y * W + x] >= FOREST ? Math.min(1, tr[y * W + x]) : 0;
}
// rundan i en bit av steget. Där varje stopp ger en hel sak (r.hel, steg 6.1.3) går man förbi rutorna där inget är klart,
// och då går flera rutor i samma bit, så att tiden i steget räcker (taskStep räknar bitarna)
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
function rundaRuta(s: State, p: Person, tk: Task, left: number, a: number, learn: number) {
  const now = s.now, slut = Math.max(0, (tk.until - now) / SEC);
  if (tk.hopp) { // på väg: bara gången, inget arbete (steg 9.2.55)
    const w = walk(s, p, tk, Math.min(left, Math.max(slut, 1e-3))), used = Math.max(w.used, 1e-3);
    if (p.task !== tk) return used;
    tk.letat = (tk.letat ?? 0) + used;
    if (w.framme && tk.phase === 'do') {
      tk.hopp = undefined;
      // det hen hittat på vägen (hö, kvistar, mossa, ägg, frön) läggs i bördan när hen är framme, också där inget finns att plocka
      plockSlag = ''; workStep(s, p, tk, 1e-3, a, learn, false, true, 0); plockSlag = undefined;
      if (p.task !== tk || tk.until <= s.now) return used;
      const f = tk.sett?.[tk.sett.length - 1]; // i ett nytt område ser hen sig omkring: det blir platslärdomar (steg 4.5.6.2)
      if (f === undefined || areaOf(f % W, Math.floor(f / W)) !== areaOf(tk.tx, tk.ty)) lookAround(s, p, tk.tx, tk.ty);
    }
    return used;
  }
  const x = Math.floor(tk.tx), y = Math.floor(tk.ty), full = fullBorda(s, p, tk);
  if (tk.sok && !tk.tandmat && !needStones(s) && !flintaBehovs(s, tk)) { tk.until = s.now; return 1e-3; } // byn har nog
  // plocka (steg 9.2.55): stå still och plocka rutan tom, en hel sak per RUNDA.plock sekunder
  if (!full && sakerPa(s, tk, x, y) > 0) {
    tk.plock ??= RUNDA.plock;
    const used = Math.max(1e-3, Math.min(left, tk.plock, slut, BIT));
    s.now = now + used * SEC;
    tk.plock -= used;
    const klar = tk.plock <= 1e-6, slag = klar ? plockaEn(s, tk, x, y) : undefined;
    if (klar) tk.plock = undefined;
    plockSlag = slag ?? ''; workStep(s, p, tk, used, a, learn, false, true, slag ? 1 : 0); plockSlag = undefined;
    return used;
  }
  // den som hämtar tändmaterial plockar det som finns på rutan och i närheten och hittar hö och kvistar på vägen; ser hen inget
  // att plocka letar hen på marken där hen står tills det räcker (hö och kvistar ligger överallt, forageItems i eld.ts)
  if (tk.tandmat && tinderShort(s, tk) && !full && !narmastMedSaker(s, tk, x, y, RUNDA.syn)) {
    // tändmaterialet är hela saker på rutan (steg 9.3.4): är rutan tom på det som fattas går hen till den närmaste som har det
    if (!tandHar(s, tk, x, y)) {
      const n = narmastTand(s, tk, x, y, RUNDA.syn);
      if (n) { tk.tx = n.x + 0.5; tk.ty = n.y + 0.5; tk.hopp = true; return 1e-3; }
    }
    const used = Math.max(1e-3, Math.min(left, slut, BIT));
    s.now = now + used * SEC; plockSlag = ''; workStep(s, p, tk, used, a, learn, false, true, 0); plockSlag = undefined;
    return used;
  }
  tk.plock = undefined;
  if (p.task !== tk || tk.phase !== 'do') return 1e-3;
  if (full) { // bördan är full: hem med den (som i workStep), och tillbaka hit sedan om tiden räcker
    if (tk.until > s.now + 2 * MIN) tk.res = { x: tk.tx, y: tk.ty, until: tk.until };
    tk.until = s.now; count(s, 'turer');
    return 1e-3;
  }
  // vidare (steg 9.2.56): den närmaste rutan med saker som hen ser; annars är platsen färdig och nästa mål väljs. Hem när det drar
  // hemåt (draget, men bara hemåt)
  const i = y * W + x;
  tk.sett = [...(tk.sett ?? []), i].slice(-RUNDA.sett);
  const dr = drag(s, p, tk, rutVarde(s, tk));
  if (dr.ut < -RUNDA.hem || tk.until <= s.now + 2 * MIN) { tk.until = s.now; return 1e-3; }
  let n = narmastMedSaker(s, tk, x, y, RUNDA.syn);
  if (!n) { platsTom(s, p, tk, x, y); n = nastaMal(s, p, tk, x, y, dr.bort.radsla); }
  if (n) { tk.tx = n.x + 0.5; tk.ty = n.y + 0.5; tk.hopp = true; } else tk.until = s.now;
  return 1e-3;
}
const utanStenar = (g?: Record<string, number>) => { if (g) { delete g.sten; delete g.flinta; } return g; }; // på rundan plockas de som saker
let plockSlag: string | undefined; // på rundan: slaget som plockades nu (bär eller rötter, sten eller flinta, grenar), '' medan plocket pågår; för UTFALL
// den närmaste rutan inom r med saker, och dit man kan gå (inte i vattnet). Samma ruta varje gång (ingen slump)
function narmastMedSaker(s: State, tk: Task, x0: number, y0: number, r: number) {
  let bast: { x: number; y: number } | undefined, bd = Infinity;
  const vt = vattenNu(s);
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = x0 + dx, y = y0 + dy, d = Math.hypot(dx, dy);
    if (d > r + 0.01 || d >= bd || !inMap(x, y) || vt[y * W + x] === T.Vatten || sakerPa(s, tk, x, y) <= 0) continue;
    bast = { x, y }; bd = d;
  }
  return bast;
}
// tändmaterialet som fattas (hö eller kvistar) finns på rutan (steg 9.3.4, tandPaRutan i eld.ts)
const tandFattas = (s: State, tk: Task) => (['torrgras', 'grenar'] as Tand[]).filter(k => underBuffert(s, k, tk.items?.[k] ?? 0));
const tandHar = (s: State, tk: Task, x: number, y: number) => tandFattas(s, tk).every(k => tandPaRutan(s, k, x, y) > 0);
// den närmaste rutan inom r med allt tändmaterial som fattas (hö och kvistar), och annars med något av det
function narmastTand(s: State, tk: Task, x0: number, y0: number, r: number) {
  const slag = tandFattas(s, tk);
  let bast: { x: number; y: number } | undefined, bd = Infinity;
  for (const alla of [true, false]) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = x0 + dx, y = y0 + dy, d = Math.hypot(dx, dy);
      if ((!dx && !dy) || d > r + 0.01 || d >= bd || !inMap(x, y)) continue;
      const har = slag.filter(k => tandPaRutan(s, k, x, y) > 0).length;
      if (alla ? har < slag.length : har === 0) continue;
      bast = { x, y }; bd = d;
    }
    if (bast) return bast;
  }
  return bast;
}
// platsen är färdig (steg 9.2.56): hen minns den som plockad, ett område i taget (platslärdomarna, minne.ts)
function platsTom(s: State, p: Person, tk: Task, x: number, y: number) { count(s, 'platsTom'); lookAround(s, p, x + 0.5, y + 0.5); void tk; }
// nästa mål (steg 9.2.54): den ruta inom RUNDA.malR som är bäst när det hen tror finns där (platslärdomarna, trorOm i minne.ts;
// grenarna och stenarna syns) vägs mot vägen dit och rädslan, och som är mindre värd för varje bybo som redan är där eller på väg
// dit. Aldrig tillbaka över rutor hen tömt (de har inga saker), och bara bort från det hen redan sett här. Scenariot samlarmal frågar den direkt
export function nastaMal(s: State, p: Person, tk: Task, x0: number, y0: number, radsla: (x: number, y: number) => number) {
  // det hen ser räknas som det är, i saker på rutan; längre bort det hen tror, räknat i saker (rikedomen delad med toppen, gånger
  // sakerna på en full ruta), så att en plats som ser rik ut men är tom inte lockar
  const res = ACTS[tk.act].resurs, sikt = sightOf(s, p);
  const tror0 = res && !tk.sok ? trorOm(s, p, res) : undefined, iSaker = res && !tk.sok ? (FYND.bar.saker ?? 1) / Math.max(1e-9, toppOf(res)) : 0;
  const tror = (x: number, y: number) => !tror0 || sees(s, p, x, y, sikt) ? sakerPa(s, tk, x, y) : tror0(x, y) * iSaker;
  const andra = living(s).filter(q => q !== p && q.task?.act === tk.act).map(q => ({ x: q.task!.tx, y: q.task!.ty }));
  const vt = vattenNu(s), R = RUNDA.malR;
  let bast: { x: number; y: number } | undefined, bv = 0;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const x = x0 + dx, y = y0 + dy, d = Math.hypot(dx, dy);
    if (d <= RUNDA.syn || d > R || !inMap(x, y) || vt[y * W + x] === T.Vatten) continue;
    const trangt = andra.filter(q => Math.hypot(q.x - x, q.y - y) < RUNDA.syn).length;
    // vägen dit räknas i samma enhet som det hen tror finns där: bortom synvidden i saker (iSaker). Förut vägde avståndet femtio
    // gånger tyngre än det hen hört, så att inget mål längre bort vann och rundan gick åt ett slumpat håll (steg 9.9.5)
    const v = (tror(x, y) - radsla(x, y)) / (1 + trangt) - d * RUNDA.ut * (tror0 && !sees(s, p, x, y, sikt) ? iSaker : 1);
    if (v > bv + 1e-9) { bv = v; bast = { x, y }; }
  }
  if (bast) { count(s, 'nyttMal'); return bast; }
  // inget hen vet eller ser: en riktning bort från byn, mot mark som ser lovande ut (skog, snår, bryn), RUNDA.malR rutor bort
  const m = bynsMitt(s), v0 = Math.atan2(y0 - m.y, x0 - m.x), g = groundOf(s);
  for (let k = 0; k < 8; k++) {
    const v = v0 + (hash3(p.id, k, Math.floor(s.now / HOUR)) - 0.5) * Math.PI, x = Math.round(x0 + Math.cos(v) * R), y = Math.round(y0 + Math.sin(v) * R);
    if (!inMap(x, y) || vt[y * W + x] === T.Vatten) continue;
    if (k < 6 && !(g.trees[y * W + x] > 0 || markslag(g, y * W + x) === 'hog' || markslag(g, y * W + x) === 'buske')) continue;
    count(s, 'nyttMalRiktning');
    return { x, y };
  }
  return undefined;
}
// plock: på rundan (steg 9.2.55) ger arbetet bara det som plockades, en hel sak när plocket är klart (1) eller inget (0)
function workStep(s: State, p: Person, tk: Task, dtSec: number, a: number, learn: number, tom = false, runda = false, plock?: number) {
  const now = s.now, d = ACTS[tk.act], res = d.resurs;
  const { takt, del: del0, rich, rd, rk } = arbetsTakt(s, p, tk), y = plock ?? takt * dtSec, del = plock === undefined ? del0 : undefined; // ett plock har redan tagits ur rutan (plockaEn)
  if (y > 0) count(s, 'prod_' + tk.act, y);
  if (rd && y > 0 && d.slits?.per === 'ger') wearUsed(s, p, y); // korgen slits för det som samlas, inte per timme (steg 2.3.12)
  if (rk?.rad.haller && y > 0 && d.slits?.per === 'ger') slitRygg(s, rk.t, y, rk.rad.haller); // och ryggsäcken likadant (steg 7.1.3)
  // tomt här: gå vidare eller hem (nedan). Den som letar flinta eller stenar fortsätter
  const tomt = !!del && (rich < PLATS.tomtGrans || tom) && !tk.sok;
  if (res && del) takeFrom(s, res, tk.tx, tk.ty, y, del.r);
  // den som arbetar ser hur mycket som finns i området och minns det
  if (res && (rich < PLATS.tomtGrans || chance(s, 1 / STEG.minneSek, dtSec, 'minne', p))) lookAround(s, p, tk.tx, tk.ty);
  // det arbetet ger läggs i bördan; något annat än det arbetet ger tas bara med om det ryms i händerna (steg 6.1.8),
  // utom ett sällsynt fynd (flintan), som man inte lämnar
  const bar = (k: string, n: number) => {
    if (!(n > 0)) return;
    // platsen i händerna prövas först när det blir en hel sak till: arbetet mot nästa sak (p.delar) tar ingen plats. Förut föll
    // varje liten del bort när händerna var fulla, så att ägg, mossa och frön nästan aldrig hittades (steg 9.9.5)
    const fore = (tk.items?.[k] ?? 0) + (p.delar?.[k] ?? 0), nyHel = Math.floor(fore + n + 1e-9) > Math.floor(fore + 1e-9);
    if (nyHel && k !== carryKind(tk.act) && !SAKER[k]?.skaffa?.sallsynt) { const b = bordSlag(tk), w = viktOf(k); if (!ryms(s, p)({ ...b, [k]: Math.ceil((b[k] ?? 0) / w + n - 1e-9) * w })) return; } // bördan blir hela saker (helaIBordan)
    tk.items ??= {}; tk.items[k] = (tk.items[k] ?? 0) + n;
  };
  // det arbetet ger (UTFALL ovan); utan egen rad, eller om raden inte tagit hand om det, läggs det platsen gav i bördan
  const u = UTFALL[tk.act];
  if (!(u && u(s, p, tk, { y, rich, delar: del?.r, rd, dtSec, a, bar })) && y > 0) tk.carry += y;
  helaIBordan(p, tk); // bara hela saker i bördan (steg 2.10.7); ett plock är alltid en hel sak (steg 9.2.55) // bara hela saker i bördan (steg 2.10.7); på en runda med hela saker ges saken bara vid stoppet (rundaRuta, steg 6.1.3)
  const sk = d.arbete!;
  const before = p.skill[sk];
  const m = p.mentor !== undefined ? byId(s, p.mentor) : undefined; // bredvid sin mentor lär man sig fortare (steg 3.1.1)
  const vidMentor = m?.task && ACTS[m.task.act].arbete === sk && Math.hypot(m.x - p.x, m.y - p.y) < RELT.mentorNara ? RELT.mentorOvning : 1;
  ovning(p, sk, dtSec / HOUR_S * STEG.ovningArbete * learn * vidMentor * (STEG.ovningBas + stat(p, 'intelligens', now) / 20));
  if (before < 16 && p.skill[sk] >= 16) {
    const title = `Mästare i ${SKILL_NAMES[sk].toLowerCase()}`, first = !s.people.some(q => q.fame.includes(title));
    p.fame.push(title); personHand(s, p, 'titel', `Blev ${title.toLowerCase()}.`); log(s, `${p.name} har blivit en mästare i ${SKILL_NAMES[sk].toLowerCase()}.`, 'skill', [p.id]);
    if (first) notis(s, 'mastare', `${p.name} är byns första mästare i ${SKILL_NAMES[sk].toLowerCase()}.`, [p.id]);
    if (first) for (const q of living(s)) if (q !== p) upplev(s, q, 'forstaMastare', p.name); // de andra såg det (steg 4.5.4.9)
  }
  // arbetet sker i turer: när de fria händerna är fulla eller efter en fångst bärs det hem, sedan fortsätter man. Någon fast
  // tid för en tur finns inte (steg 6.1.10): arbetet slutar annars när det är slut (tk.until) eller när något går före (val.ts)
  const full = fullBorda(s, p, tk), has = isCarrying(tk);
  // busken är tom: den som samlar går vidare till nästa i närheten tills famnen är full (steg 2.12.4), annars hem.
  // Den som samlar tändmaterial stannar tills det räcker. Jägaren som redan gått vidare för att leta (jakt.ts) fortsätter
  if (tomt && tk.phase === 'do' && !runda) {
    const n = d.fart && !full && tk.until > now + 2 * MIN ? nastaBuske(s, res!, tk.tx, tk.ty) : undefined;
    if (n) { tk.phase = 'go'; tk.tx = n.x; tk.ty = n.y; } else if (!(tk.tandmat && tinderShort(s, tk))) tk.until = now;
  }
  if ((full || (d.hemVarje && tk.carry > 0) || (tk.act === 'jakt' && jaktFallt(tk))) && has && !(tk.styckTill && tk.styckTill > now)) { // den som styckar ett djur gör det klart först (styckning.ts)
    if (tk.until > now + 2 * MIN) tk.res = { x: tk.tx, y: tk.ty, until: tk.until };
    tk.until = now; count(s, 'turer');
  }
}

// bygge: lägg det man bär på bygget och arbeta. När rutan är klar, eller materialet tagit slut, tas nästa ruta
function buildStep(s: State, p: Person, tk: Task, dtSec: number) {
  const b = bitById(s, tk.ref);
  if (!b) { tk.until = s.now; return; }
  const k = MATERIAL[b.m].item;
  // materialet ligger kvar i händerna medan man bygger och läggs i bygget när biten är klar (steg 3.6.5). Avbryts arbetet
  // bär man hem det som inte använts (taskStep: den som bär något går hem med det)
  // bara det som fattas läggs i bygget: har någon annan lagt stockar i väggen under tiden (toWalls i bygg.ts) behåller man resten
  const har = (k && tk.items?.[k]) || 0, anv = Math.min(har, needOf(b));
  const done = b.b >= 1 && b.lp === undefined && b.c >= 0.5;
  if (!done && needOf(b) - har <= 1e-9) {
    if (!workOn(s, p, b, dtSec, anv)) return;
    if (anv) {
      const kvar = har - anv;
      if (kvar > 1e-9) { tk.items![k!] = kvar; const ag = tk.ag?.[k!]; if (ag) for (const id in ag) ag[id] *= kvar / har; } // ägarna behåller var sin del av resten
      else { delete tk.items![k!]; if (tk.ag) delete tk.ag[k!]; if (!Object.keys(tk.items!).length) tk.items = undefined; }
    }
    if (tk.kom) { noteKom(s, b.hus, tk.kom); tk.kom = undefined; } // varifrån materialet kom räknas när det används
  }
  const j = buildJob(s, p, !!b.forb);
  if (!j || j.missing || j.fell || j.hugg !== undefined || dangers(s).kyla) { tk.until = s.now; return; } // ett träd i vägen, eller kylan är en fara (steg 2.12.3): välj på nytt
  // nästa bit av bygget: man går först till lagret om det behövs material
  const site = siteOf(s, j.bit);
  tk.ref = j.bit.id; tk.tool = j.repair ? (j.bit.k === 'golv' ? 'lagaGolv' : 'laga') : j.bit.k === 'golv' ? 'golv' : 'vagg';
  tk.phase = 'go';
  if (j.need > 0) { const f = fetchSpot(s, j.item!); tk.tx = f.x; tk.ty = f.y; tk.site = site; } else { tk.tx = site.x; tk.ty = site.y; }
}

// talen i sparfilen avrundas till tre decimaler. En stacks ägardelar avrundas nedåt om de annars blir mer än stacken
const r3 = (v: number) => Math.round(v * 1000) / 1000;
function avrunda(this: unknown, k: string, v: unknown) {
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
  packGround(s); packFynd(s);
  return JSON.stringify(s, avrunda);
}
// en kopia av byn, som en sparad och inläst by (cacherna i WeakMap följer inte med, regel 4)
export const cloneState = (s: State) => migrate(JSON.parse(serialize(s)));

// sparfilen i delar, så att varje del ryms i ett dokument i artefaktens databas (högst 256 KB). Det som inte står här är byn.
// Varje del skrivs direkt med samma avrundning, så texten blir densamma som om hela byn skrivits och delats upp efteråt
export const DELAR: Record<string, string[]> = { folket: ['people', 'rels'], kartor: ['mark', 'skog', 'tradAlder', 'tradSort', 'buskar', 'barbuskar', 'stubbar'], fynden: ['fynd'], loggen: ['log'], notiser: ['notiser'] };
export function serializeParts(s: State): Record<string, string> {
  packGround(s); packFynd(s);
  const o = s as unknown as Record<string, unknown>, ut: Record<string, string> = {}, bort = new Set<string>();
  for (const [d, keys] of Object.entries(DELAR)) {
    const del: Record<string, unknown> = {};
    for (const k of keys) if (o[k] !== undefined) { del[k] = o[k]; bort.add(k); }
    ut[d] = JSON.stringify(del, avrunda);
  }
  // historiken delas efter de avrundade tiderna, som i en inläst sparfil
  if (s.hist) { for (const [d, h] of Object.entries(histParts(s, JSON.parse(JSON.stringify(s.hist, avrunda))))) ut[d] = JSON.stringify({ hist: h }); bort.add('hist'); }
  const byn = JSON.stringify(s, function (this: unknown, k: string, v: unknown) { return this === s && bort.has(k) ? undefined : avrunda.call(this, k, v); });
  return { byn, ...ut };
}
export const joinParts = (delar: string[]) => {
  const ut: Record<string, unknown> = {}, hist: Historik[] = [];
  for (const d of delar) { const o = JSON.parse(d); if (o.hist) { hist.push(o.hist); delete o.hist; } Object.assign(ut, o); }
  if (hist.length) ut.hist = joinHist(hist); // historiken ligger i en del per vecka
  return JSON.stringify(ut);
};

// varje timme (timblocket ovan): de döda och utflyttade utöver de 120 senaste och relationer mellan två som inte lever
// tas bort, så att byn och sparfilen hålls små. Sparningen bara läser byn
const MINNS_DODA = 120;
function compact(s: State) {
  const borta = (p: Person) => !alive(p) && !gastLever(p); // en gäst på kartan är inte borta (steg 9.2.111)
  let n = 0; for (const p of s.people) if (borta(p)) n++;
  if (n > MINNS_DODA) {
    const gone = s.people.filter(borta).sort((a, b) => (b.died ?? b.left ?? 0) - (a.died ?? a.left ?? 0));
    const drop = new Set(gone.slice(MINNS_DODA).map(p => p.id));
    s.people = s.people.filter(p => !drop.has(p.id));
  }
  const ids = new Set(s.people.filter(p => !borta(p)).map(p => p.id));
  for (const k in s.rels) { const m = /^(-?\d+)-(-?\d+)$/.exec(k), a = Number(m?.[1]), b = Number(m?.[2]); /* gästernas id är negativa */ if (!ids.has(a) && !ids.has(b)) delete s.rels[k]; }
}
import { bakaKlar, kokaKlar, stekaKlar, stepBak, stepKok } from './matlagning';
import { drickDryck, vatskorTimme } from './vatskor';
import { bryggKlar, maltaKlar, stepBrygg } from './brygg';
import { rusSteg } from './rus';
import { hemma } from './halsa';
import { latrinTomKlar, soporKlar, stepKompost, stepSophog } from './rester';
import { skrammaKlar, staketKlar } from './odling';
// den rikaste röllekan på rutan eller bredvid den som samlar (steg 9.7.15): den plockas på vägen. Bara på sommarhalvåret,
// när den växer, så att de andra tidsåldrarna inte frågar kartan i onödan
const ROLLEKA_GRANNAR = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const;
function rollekaNara(s: State, x: number, y: number) {
  const ai = ageIndex(s);
  if (ai !== 1 && ai !== 2) return undefined;
  let best: { x: number; y: number; v: number } | undefined;
  for (const [dx, dy] of ROLLEKA_GRANNAR) { const v = richness(s, 'rolleka', x + dx, y + dy); if (v > (best?.v ?? 0)) best = { x: x + dx, y: y + dy, v }; }
  return best;
}
import { stepOrtKrukor } from './kruka';
import { mataKlar, stepTamdjur } from './tamdjur';
import { hageKlar, stepHagar, vallaKlar } from './hage';
import { avlivaKlar, klippKlar, mjolkaKlar, stepBoskap } from './boskap';
import { slaKlar, stepVinter, hamlaKlar } from './slatter';
import { stepHons } from './hons';
