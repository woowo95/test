import { skuldFaktor } from './skatt';
import { SAK_ART, heligtBrutet, matBrutet } from './kultlatt';
import { utsadeKrok } from './ratter';
import { hans, honom } from './ord';
import { upplev } from './uppvaxt';
import { loggBer, kronikaBer, BERATT } from './berattelser';
import { State, Person, HOUR, DAY, MIN } from './typer';
import { FOOD, REDSKAP_SLAG, SAKER, SAK_LIST, gruppOf, isTool, viktOf } from './saker';
import { ACTS, actsOf, usesTool } from './handlingar';
import { ledareOf } from './styre';
import { ALDER, KROPP, REL, ageOf, alive, byId, count, getRel, gjort, isKin, isParent, familjOf, livet, living, log, ovning, relKey, stat } from './folk';
import { forsorjAlder } from './skatt';
import { VARDRATT, kanGa, mindreMat } from './halsa';
import { chance, clamp, pickViktat, rnd } from './slump';
import { Ting, newTing, tingOf } from './agande';
import { kvEffekt } from './kvalitet';
import { bordVid, moblerKrok } from './stationer';
import { BYN, Del, addDel, sumOf } from './egendom';
import { amountOf, helt, iBordan, slagFinns, iRackhall, iHelaForradet, urBordan, mayTake, ownMove, ownedSum, ownsAmount, put, takeFood, type Uttag, use } from './lager';
import { eatPoison } from './fynd';
import { ata } from './naring';
import { ratt } from './matlagning';
import { habitShare, habitTotal } from './seder';
import { grundvarde } from './varde';
import { kroppensMat, matPerDygn } from './ekonomi';
import { REDSKAPMAL, arMaterial, buffert, eldReserv, villHaAv } from './forradsmal';
import { balans } from './balans';
import { RELT, arBast, arRivaler, minnsGava } from './relationer';
import { dampning, handelse, smakMat, RYKTE } from './rykten';
import { VED, vedPerDygn } from './eld';
import { BYTE, Part, Vara, vidLura, byteKlart, nyssBytt, flytta, gavaKlar, varorText, vardeOf, vardeAv, kartOf, gerVarde } from './byte';
import { bynKanner, kannerOrt } from './ort';
import { SJUK, insjukna } from './sjukdom';
import { smutsigtAtit } from './smuts';
import { budHindrar } from './kyrka';

// ---------- behovsstegen ----------
// När någon behöver något går hen stegen i ordning: först sitt eget, sedan ett byte med någon i närheten (byten nedan),
// sedan byns förråd, sedan ber hen om det som gåva i samtal (den som har över ger, familjen ger lättast: willing nedan).
// Stjäl gör man först när man håller på att dö av bristen. Hur nära döden man måste vara beror på empatin; den med mycket
// hög empati stjäl aldrig. Man stjäl helst av den man inte tycker om. Den bestulne märker det nästa gång hen äter (maten:
// needLadder anropar noticeTheft varje gång hen ätit, också när bara byns mat ätits), lägger sin egen ved på elden (steg.ts)
// eller tar av sitt eget till ett arbete (takeMaterial), och relationen blir sämre.
// Varje behov är en post i BEHOV (mat, och ved till elden: VED i eld.ts). Material till ett arbete och redskap går samma steg, längre ner.
export interface Behov {
  id: string;
  namn: string; // i loggen: "gav mat till", "stal mat av"
  slag: readonly string[]; // vilka saker i förrådet som fyller behovet
  per?: Record<string, number>; // hur mycket ett av slaget fyller (ved: en gren är 0,4 ved); annars 1
  minst: number; // minsta mängd som hjälper
  mangd: (p: Person, now: number) => number; // hur mycket man tar eller ber om på en gång
  kvar: (s: State, p: Person) => number; // så mycket av sitt eget behåller p när hen ger till någon utanför familjen
  behover: (s: State, p: Person) => boolean; // p behöver det nu
  fara: (s: State, p: Person) => number; // hur nära döden bristen har fört p: 0 = ingen fara, 1 = död
  anvand: (s: State, p: Person, fran?: Person) => number; // p tar och använder det (fran = stjäl av den personen); ger mängden
  genast?: true; // p tar det själv på en gång (äter), så ett byte prövas varje gång före byns förråd; annars när p frågar runt
}

// Balanstalen (regel 8) för att fråga, stjäla, ge och byta
export const DELA = balans('dela', {
  stjalAldrig: 17, // empati från vilken man aldrig stjäl
  stoldOp: 15, // så mycket sämre blir relationen när stölden upptäcks
  ranAgg: 13, // rån (steg 3.7.17): den som är desperat nog att stjäla och har minst så här mycket aggression tar hellre med våld ...
  ranTakt: 1 / 3600, // ... så ofta (per sekund) hen försöker ...
  ranNara: 6, // ... av någon inom så många rutor
  stoldLindrig: 5, // ... när det var material till ett arbete (en lindrig stöld), om det var värt minst stoldVarde ...
  stoldVarde: 3, // ... annars mindre efter värdet (grundvarde): en näve hö till elden märks knappt (steg 2.12.6)
  stoldTanke: 0.25, // den bestulne tänker på en lindrig stöld först när den är värd minst så stor del av stoldVarde
  fragaR: 8, // så nära (rutor) måste man vara för att be någon om något
  fragaFamilj: 30, // ... familjen (isFamily) så nära: den vet när någon av de egna saknar något (steg 3.10.26)
  fragaTakt: 1 / (30 * 60), // så ofta (per sekund) den som saknar något ber någon i närheten
  // viljan att ge (willing)
  overflodBas: 0.4, // viljan gånger overflodBas + overflodSteg * överflödet, mellan overflodMin och overflodMax
  overflodSteg: 0.3,
  overflodMin: 0.7,
  overflodMax: 1.3,
  gemenskapGe: 0.25, // så mycket givmildare (eller snålare) seden gör folk, vid Sammanhållning fullt ut
  rikGe: 0.7, // så mycket av viljan att ge till andra än barn och partner som finns kvar i en rik by
  geFrammande: 0.15, // golvet för viljan att ge mat och ved till en främling som ber av nöd (steg 10.5.11), gånger empatin, seden och överflödet; noll för ovänner
  geBarn: 0.95, // viljan att ge till sitt barn ...
  gePartner: 0.8, // ... till sin partner ...
  geFamilj: 0.6, // ... till släkten ...
  geVanOp: 80, // ... och till andra: relationen delat med geVanOp, högst geVanMax
  geVanMax: 0.6,
  geEmpati: 0.5, // viljan gånger geEmpati + empatin / 20
  // byten
  saknar: 2, // det man saknar och behöver nu är värt så många gånger grundvärdet (dubbelt så mycket nära döden)
  over: 0.5, // ... det man har över: mer mat och ved än man själv behöver, material, redskap man inte arbetar med
  ojamn: 0.2, // så mycket mindre än man ger går man med på att få, med vem som helst
  byteMinst: 0.3, // ett byte om mindre än så (grundvärde, ungefär arbetstimmar) är inte värt att tala om
  nara: 0.3, // så stor vilja att ge (willing) har man till den man står nära: familjen och goda vänner
});

// ---------- mat ----------
// talen i ätandet (steg 12.1.107)
export const ATA = balans('ata', {
  fastaHunger: 0.2, // fastan (steg 8.5.14) bryts när hungern är över så här mycket ...
  fastaVarm: 0.3, // ... eller värmen under så här mycket: kyla och svält går före
  halvSkick: 0.5, // maten under så här mycket av sitt skick mättar sämre
  skamd: 0.25, // under så här mycket kan man bli magsjuk av den ...
  skamdChans: 0.35, // ... med högst den här chansen per måltid (för den helt skämda maten), gånger SJUK.skamd
});
const portionOf = (p: Person, now: number) => ageOf(p, now) < ALDER.matBarn ? KROPP.portionBarn : 1;
// en hel portion, eller det som finns kvar. Maten under halva skicket mättar sämre, under en fjärdedel kan man bli sjuk
function eat(s: State, p: Person, fran?: Person) {
  if ((p.fasta ?? 0) > s.now && p.hunger > ATA.fastaHunger && p.warm > ATA.fastaVarm) return 0; // fastan (steg 8.5.14): kyla och svält går före
  const now = s.now, full = portionOf(p, now);
  const { n: portion, c: q, per } = takeFood(s, full, p, fran), f = KROPP.mattar / full * (q >= ATA.halvSkick ? 1 : ATA.halvSkick + q);
  // maten fyller näringsvärdena, och mättnaden är en sammanfattning av dem (steg 2.6.1, naring.ts)
  ratt(s, p, per, full); // rått kött och rå fisk (matlagning.ts, steg 2.8.1), av det som åts innan det skalas till mättnad
  for (const k in per) per[k] *= f;
  for (const k in per) { heligtBrutet(s, p, SAK_ART[k]); matBrutet(s, p, k); } // den svältande åt det heliga djurets kött (steg 10.3.15)
  ata(p, per); smakMat(s, p, per); maltidTanke(s, p, per); eatPoison(s, p); count(s, 'atit', portion); // portioner som ätits (foodDays i ekonomi.ts mäts mot det)
  if (q < ATA.halvSkick) tanke(p, 'daligMat', now);
  if (portion > 0 && vidBordet(p)) {
    tanke(p, 'vidBordet', now, { v: KROPP.bordGlad * kvEffekt(bordVid(s, p)) * moblerKrok.sittGlad(s, p), tid: KROPP.bordGladTim * HOUR }); count(s, 'bordMal'); // och bättre på en stol (steg 12.4.4)
    let mest = 0; for (const k in per) if (per[k] > mest) { mest = per[k]; p.task!.mal = k; } // maten på bordet och i händerna (steg 3.10.3, bara utseende)
  }
  const smutsig = smutsigtAtit(s, per); // maten som plockats där det var toa-smuts (steg 10.11.14)
  if (smutsig > 0 && rnd(s, 'halsa', p) < smutsig * SJUK.smutsig) {
    insjukna(s, p, 'magsjuka', 'av smutsig mat'); p.sickWhy = 'Magsjuk av mat som plockats vid toa-smuts';
    tanke(p, 'smutsigMat', now); count(s, 'smutsigMat');
  }
  else if (q < ATA.skamd && rnd(s, 'halsa', p) < (ATA.skamd - q) / ATA.skamd * ATA.skamdChans * SJUK.skamd) {
    insjukna(s, p, 'magsjuka', 'av skämd mat'); p.sickWhy = 'Magsjuk av skämd mat'; // steg 9.5.1
    tanke(p, 'skamdMat', now); count(s, 'skamdMat');
    loggBer(s, 'l_magsjuk', p.id, { namn: p.name, hen: p.sex === 'm' ? 'han' : 'hon' }, 'world', [p.id]);
  }
  return portion;
}
// p äter en portion av k som en vanlig måltid (festmåltiden, steg 10.7.28): näringen, smaken, nivåns tanke och kockens hand
export function ataPortion(s: State, p: Person, k: string) {
  const per = { [k]: KROPP.mattar };
  ata(p, per); smakMat(s, p, per); maltidTanke(s, p, per); count(s, 'atit', 1);
}
// maten som smakar lite extra gott, i den ordning tankarna kommer: steken (steg 9.6.21), jordgubbarna (steg 9.7.9) och det
// rökta, det som rökeriet gör (ROKAS i matlagning.ts, steg 9.6.8). glad läses när någon äter: balanstalen står i matlagning.ts
const GOTT: { tanke: string; ar: (k: string) => boolean; glad: () => number }[] = [
  { tanke: 'Åt en stek', ar: k => rattInfo(k)?.kat === 'stek', glad: () => STEK.glad },
  { tanke: 'Åt jordgubbar', ar: k => k === 'jordgubbar', glad: () => ROK.glad * 3 },
  { tanke: 'Åt rökt mat', ar: k => ROKAS.some(r => r.blir === k), glad: () => ROK.glad },
];
// måltidens nivå (steg 9.6.2, ratter.ts): en lagad eller fin måltid ger en tanke som höjer humöret
function maltidTanke(s: State, p: Person, per: Record<string, number>) {
  const niva = basta(per), n = MALTIDSNIVA[niva];
  if (n.humor > 0) { tanke(p, 'maltid', s.now, { text: n.tanke, v: n.humor, tid: RATT.tankeTim * HOUR }); count(s, 'maltid_' + niva); }
  if (niva === 'fin') { const k = Object.keys(per).find(x => MALTIDSNIVA[maltidsNiva(x)] === MALTIDSNIVA.fin); if (k) smakFinMaltid(p, smakSak(k)); } // en favorit (steg 9.6.6)
  // variationen (steg 9.6.5): den som ätit samma protein för många gånger tröttnar på det
  let mest = '', mn = 0; for (const k in per) { const pr = proteinAv(k, x => SAKER[x]?.namn ?? x); if (pr && per[k] > mn) { mest = pr; mn = per[k]; } }
  if (mest) {
    const m = (p.protMinne ??= []); m.push(mest); if (m.length > VARIATION.minns) m.shift();
    if (m.filter(x => x === mest).length >= VARIATION.trott) { tanke(p, 'trottPa', s.now, { mat: mest, v: VARIATION.tanke, tid: VARIATION.tankeTim * HOUR }); count(s, 'trott_pa_mat'); }
  }
  for (const g of GOTT) if (Object.keys(per).some(x => per[x] > 0 && g.ar(x))) tanke(p, 'gott', s.now, { text: g.tanke, v: g.glad(), tid: RATT.tankeTim * HOUR });
  const k = kockGlad(s, per); if (k > 0.005) tanke(p, 'vallagad', s.now, { v: k, tid: RATT.tankeTim * HOUR }); // kockens hand (steg 9.6.4)
  specialTanke(s, p, per); // byns egen rätt som blivit en tradition (steg 10.7.29)
}
// p sitter vid bordet och äter (handlingen maltid, framme: val.ts och stationer.ts, steg 2.2.15)
const vidBordet = (p: Person) => p.task?.act === 'maltid' && p.task.phase === 'do';
export const MAT: Behov = {
  id: 'mat', namn: 'mat', slag: FOOD, minst: 0.3, mangd: portionOf,
  // det man själv äter på ett dygn, efter kroppen (kroppensMat i ekonomi.ts)
  kvar: (s, p) => kroppensMat(p, s.now),
  // vid bordet äter man lite tidigare än annars: det är därför man satt sig där
  // i en hård by med knapp mat äter den som inte kan arbeta först när hen är hungrigare (steg 9.5.30)
  behover: (s, p) => p.hunger < KROPP.hungrig && (p.hunger < KROPP.hungrig * VARDRATT.snal || !mindreMat(s, p, () => foodDays(s)))
    || vidBordet(p) && p.hunger < KROPP.hungrig + KROPP.bordHunger && !mindreMat(s, p, () => foodDays(s)), genast: true,
  fara: (_s, p) => p.hunger <= 0 ? 1 - p.health : 0, // man svälter när hungern är slut, och hälsan sjunker
  anvand: eat,
};

// Behoven, i den ordning de prövas: maten här och veden till elden (VED i eld.ts). Listan görs första gången den används,
// eftersom eld.ts och den här filen laddar varandra och eld.ts kan laddas först (steg 3.10.10)
let behovLista: Behov[] | undefined;
const BEHOV = () => behovLista ??= [MAT, VED];

// det p själv har och får ta av byns
const perOf = (b: Behov, k: string) => b.per?.[k] ?? 1;
// Slagen som inte finns i förrådet (eller inom räckhåll) ger 0 och hoppas över; det som bärs räknas ändå (steg 12.1.184)
function hasFor(s: State, p: Person, b: Behov) { let n = 0; for (const k of b.slag) n += ((slagFinns(s, k) ? mayTake(s, p, k) : 0) + iBordan(p, k)) * perOf(b, k); return n; } // med det hen bär (steg 11.1.77)
export function ownFor(s: State, p: Person, b: Behov) { let n = 0; for (const k of b.slag) if (slagFinns(s, k)) n += ownsAmount(s, p, k) * perOf(b, k); return n; }
// p behöver det och har inget eget eller av byns att ta
const lacksFor = (s: State, p: Person, b: Behov) => b.behover(s, p) && hasFor(s, p, b) < b.minst;
// p har mat att äta, sin egen eller byns (för måltiden vid bordet, val.ts)
export const harMat = (s: State, p: Person) => hasFor(s, p, MAT) >= MAT.minst;
// hur många dygn p har mat (steg 3.10.26): sin egen, byns och det familjen äger (familjen ger, isFamily). I en rik by delas
// inget (delning.ts) och den som inte äger något arbetar då för sin egen mat, också när byns förråd ser fullt ut (val.ts)
// bufferten per jag (steg 6.2.20): hur stor del av maten i förrådet som är byns (resten äger invånarna; en tom by räknas som byns)
export function bynsMatAndel(s: State) {
  let all = 0, by = 0;
  for (const k of MAT.slag) { if (!slagFinns(s, k)) continue; const a = amountOf(s, k), per = perOf(MAT, k); all += a * per; by += Math.max(0, a - ownedSum(s, k)) * per; }
  return all > 0 ? by / all : 1;
}
// ... hur många dygn maten som familjen fam äger räcker för den (den som saknar familj är sin egen familj)
export function familjMatDygn(s: State, fam: readonly Person[]) {
  let n = 0;
  for (const q of fam) n += ownFor(s, q, MAT);
  const d = fam.reduce((a, q) => a + MAT.kvar(s, q), 0);
  return d > 0 ? n / d : 0;
}
export function egnaMatDygn(s: State, p: Person) {
  let n = hasFor(s, p, MAT);
  for (const q of living(s)) if (q !== p && isFamily(q, p)) n += ownFor(s, q, MAT);
  return n / MAT.kvar(s, p);
}

// varje steg: den som behöver något tar av sitt eget och byns. Finns inget ber hen någon i närheten om det, och i
// yttersta nöd stjäl hen
export function needLadder(s: State, p: Person, dtSec: number) {
  for (const b of BEHOV()) {
    if (!b.behover(s, p)) continue;
    // det man tar själv på en gång (maten) tas ur förrådet man står vid eller det man bär (steg 11.1.77); den som är hungrig
    // långt från maten går dit (raden ata i val.ts)
    if ((b.genast ? iRackhall(p.x, p.y, () => behovSteg(s, p, b, dtSec)) : behovSteg(s, p, b, dtSec)) === 'ran') return;
  }
}
function behovSteg(s: State, p: Person, b: Behov, dtSec: number) {
  // det p har räknas om bara när ett byte eller en gåva gått igenom: annars är det detsamma (steg 12.1.184)
  // Bytet och gåvan flyttar ägandet och ser hela förrådet, var p än står: den som har mat i förrådet ber ingen om den, och det
  // den andra ger behöver inte ligga där p står. Bara det p tar och äter tas inom räckhåll (har)
  let har = hasFor(s, p, b);
  const byns = har >= b.minst, fraga = !byns && chance(s, DELA.fragaTakt, dtSec, 'dela', p) && iHelaForradet(() => hasFor(s, p, b)) < b.minst;
  if ((fraga || (byns && b.genast)) && iHelaForradet(() => ownFor(s, p, b) < b.minst && tradeAround(s, p, b))) har = hasFor(s, p, b); // ett byte, före byns förråd
  if (fraga && har < b.minst && iHelaForradet(() => askAround(s, p, b))) har = hasFor(s, p, b);
  if (har >= b.minst) { if (b.anvand(s, p) > 0) noticeTheft(s, p, b.id); return; }
  if (desperat(s, p, b) && ran(s, p, b, dtSec)) return 'ran';
  const v = victimOf(s, p, b);
  if (v) stole(s, p, v, b.id, b.anvand(s, p, v));
}
// rån (steg 3.7.17): den som är desperat nog att stjäla och aggressiv (DELA.ranAgg) tar hellre med våld av någon i närheten
// än ur förrådet, helst av den hen tycker minst om. Det blir ett slagsmål (strid.ts); vinner hen tar hen saken. De som såg
// det tycker att hen är våldsam, och en tjuv
function ran(s: State, p: Person, b: Behov, dtSec: number) {
  if (stat(p, 'aggression', s.now) < DELA.ranAgg || ageOf(p, s.now) < ALDER.vaktFran || p.task?.act === 'strid' || !kanGa(p)) return false;
  if (!chance(s, DELA.ranTakt, dtSec, 'dela', p) || budHindrar(s, p, 'ingenStrid')) return false; // ingen strid på den heliga dagen (steg 10.3.22)
  const op = (q: Person) => s.rels[relKey(p.id, q.id)]?.op ?? 0;
  const offer = living(s).filter(q => q !== p && q.task?.act !== 'sova' && q.task?.act !== 'strid' && !isFamily(p, q) && ageOf(q, s.now) >= ALDER.smabarn
    && Math.hypot(q.x - p.x, q.y - p.y) <= DELA.ranNara && ownFor(s, q, b) >= b.minst).sort((a, c) => op(a) - op(c) || a.id - c.id)[0];
  if (!offer) return false;
  count(s, 'ran');
  handelse(s, p, 'ranVald', offer, b.namn); // de som står nära ser våldet när det börjar
  ranStrid!(s, p, offer, `${p.name} ville ta ${b.namn} av ${offer.name}`, b.id); // slagsmålet sker på kartan och tar tid (steg 10.1.7): resten i ranEfter
  return true;
}
// när slagsmålet i rånet är slut: de som såg det minns det, och rånaren tar saken om hen vann
export function ranEfter(s: State, pid: number, offerId: number, behov: string, vann: boolean) {
  const p = byId(s, pid), offer = byId(s, offerId), b = BEHOV().find(x => x.id === behov);
  if (!p || !offer || !b || !alive(p)) return;
  handelse(s, p, vann ? 'ran' : 'ranForsok', offer, b.namn);
  if (!vann || !alive(offer) || ownFor(s, offer, b) < b.minst) return; // det fanns kvar att ta
  count(s, 'ranVann'); livet(s, p, 'ran');
  b.anvand(s, p, offer);
  log(s, `${p.name} tog ${b.namn} av ${offer.name} med våld.`, 'rel', [p.id, offer.id]);
  upplev(s, offer, 'ranad', p.name); // steg 4.1.1.2: ett rån formar mer än en stöld
}
// slagsmålet i rånet: kartstrid.ts lägger in det (behov.ts laddas före striden) och börjar striden på kartan
let ranStrid: ((s: State, p: Person, offer: Person, orsak: string, behov: string) => void) | undefined;
export const setRanStrid = (f: typeof ranStrid) => { ranStrid = f; };
// p är så nära döden av bristen att hen stjäl (victimOf)
const desperat = (s: State, p: Person, b: Behov) => { const emp = stat(p, 'empati', s.now); return emp < DELA.stjalAldrig && b.fara(s, p) > emp / DELA.stjalAldrig; };
// så hungrig att p stjäl mat (boskapsstölden, steg 9.8.12: den svältande slaktar någon annans djur)
export const desperatMat = (s: State, p: Person) => desperat(s, p, MAT);
export const isFamily = (g: Person, m: Person) => isParent(g, m) || g.partner === m.id || isKin(g, m) || arBast(g, m); // den bästa vännen delar man med som med släkt (steg 3.1.1)
// g är vaken (familjen kan man väcka) och så nära m att m kan be g om något (familjen längre bort)
const narvarande = (g: Person, m: Person) => { const fam = isFamily(g, m); return (g.task?.act !== 'sova' || fam) && Math.hypot(g.x - m.x, g.y - m.y) <= (fam ? DELA.fragaFamilj : DELA.fragaR); };
// föräldrarna försörjer barnen (steg 10.5.10, "Ägande", Familjen) tills de når åldern i skattelagen (forsorjAlder i skatt.ts);
// den som har egen partner försörjs inte. Efter åldern är barnet släkt som annan släkt
export const forsorjer = (s: State, g: Person, m: Person) => isParent(g, m) && !m.partner && ageOf(m, s.now) < forsorjAlder(s);
// det g har över att ge m. En förälder delar med sitt barn som hen försörjer också det sista, partner och släkt behåller en portion
// åt sig själva, andra så mycket de själva behöver (b.kvar)
export const overOf = (s: State, g: Person, b: Behov, m: Person) =>
  ownFor(s, g, b) - (forsorjer(s, g, m) ? 0 : isFamily(g, m) ? b.mangd(g, s.now) : b.kvar(s, g));
// kretsen m frågar: de i närheten som har det m behöver (har), de som helst ger (w) först. Familjen kan man väcka. En gåva
// ger bara den som vill ge (w > 0), ett byte gör man med alla man inte är osams med
const osams = (s: State, g: Person, m: Person) => getRel(s, g, m).op < REL.osams;
function kretsen(s: State, m: Person, har: (g: Person) => boolean, w: (g: Person) => number, byte = false) {
  return living(s).filter(g => g !== m && narvarande(g, m) && har(g) && !osams(s, g, m))
    .map(g => ({ g, w: w(g) })).filter(x => byte || x.w > 0).sort((a, b) => b.w - a.w || a.g.id - b.g.id).map(x => x.g);
}
const vilja = (s: State, m: Person, b: Behov) => (g: Person) => willing(s, g, m, ownFor(s, g, b) / b.kvar(s, g), true);
// m ber den i närheten som har över och helst ger (familjen först)
function askAround(s: State, m: Person, b: Behov) {
  const g = kretsen(s, m, g => overOf(s, g, b, m) >= b.minst, vilja(s, m, b))[0];
  return g ? gift(s, m, g, b) : false; // true när gåvan gick igenom
}
// m byter till sig det m saknar för behovet av någon i närheten, familj och vänner först
function tradeAround(s: State, m: Person, b: Behov) {
  // den som nyss sagt nej frågas inte igen på en stund (HANDLA.nejMin)
  if (m.byteNej) { for (const id in m.byteNej) if (m.byteNej[id] <= s.now) delete m.byteNej[id]; if (!Object.keys(m.byteNej).length) m.byteNej = undefined; }
  for (const g of kretsen(s, m, g => !(m.byteNej?.[g.id]) && overOf(s, g, b, m) >= b.minst, vilja(s, m, b), true)) {
    if (tradeFor(s, m, g, b)) return true;
    (m.byteNej ??= {})[g.id] = s.now + HANDLA.nejMin * MIN;
  }
  return false;
}
// m byter till sig en portion (b.mangd) av det g har över för behovet
function tradeFor(s: State, m: Person, g: Person, b: Behov) {
  const rest = Math.min(overOf(s, g, b, m), b.mangd(m, s.now));
  if (rest < b.minst) return false;
  return byte(s, m, g, delAv(s, g, b, rest), { behov: behovAv(s, m, b.slag[0]), minst: b.minst, fara: b.fara(s, m), typ: b.id, utom: b.slag }) > 0;
}
// delar upp en portion (rest, i behovets enheter) mellan slagen som g äger: det m byter till sig av g
function delAv(s: State, g: Person, b: Behov, rest: number) {
  const vill: Vara[] = [];
  for (const k of b.slag) {
    if (rest <= 1e-9) break;
    const n = Math.min(ownsAmount(s, g, k), rest / perOf(b, k));
    if (n > 1e-9) { vill.push({ k, n }); rest -= n * perOf(b, k); }
  }
  return vill;
}
// m ber g om det m saknar. Ger g? (Hur gärna man ger: agande.ts)
function gift(s: State, m: Person, g: Person, n: Behov) {
  const over = overOf(s, g, n, m);
  if (over < n.minst || rnd(s, 'dela', g) >= willing(s, g, m, ownFor(s, g, n) / n.kvar(s, g), true)) return false;
  let rest = Math.min(over, n.mangd(m, s.now));
  const want = rest;
  const gavs: Vara[] = [];
  for (const k of n.slag) { if (rest <= 1e-9) break; const v = ownMove(s, k, rest / perOf(n, k), g.id, m.id); if (v > 0) gavs.push({ k, n: v }); rest -= v * perOf(n, k); }
  const r = getRel(s, m, g);
  r.op = clamp(r.op + 3, -100, 100);
  tanke(m, 'fickGava', s.now, { sak: n.namn, namn: g.name });
  tanke(g, 'gavGava', s.now, { sak: n.namn, namn: m.name }); minnsGava(s, g, m);
  gavaKlar(s, personPart(s, g), personPart(s, m), gavs, n.fara(s, m) > 0); // samma överlämning och rad som ett byte (steg 4.4.1.1)
  handelse(s, g, n.fara(s, m) > 0 ? 'hjalp' : 'gava', m, n.namn); // de som ser det tycker bättre om den som ger (steg 3.3.1)
  count(s, 'gava_' + n.id, want - rest);
  if (n.id === 'mat' && !isFamily(g, m)) { if (m.tiggde === undefined || s.now - m.tiggde >= DAY) count(s, 'tiggare'); m.tiggde = s.now; } // fick mat av en som inte är familj: en tiggare (steg 10.5.11)
  return true;
}
// den som handlar för byn: ledaren, annars den vuxna som är skickligast i Handel (steg 4.4.1.4)
export function forByn(s: State): Person | undefined {
  const l = ledareOf(s);
  if (l) return l;
  let b: Person | undefined;
  for (const q of living(s)) if (ageOf(q, s.now) >= ALDER.vuxen && (!b || q.skill.handel > b.skill.handel)) b = q;
  return b;
}
// den som handlar för byn byter till sig det byns projekt saknar av en bybo som har det över (steg 10.5.18), sist i
// samtalens kedja: byn betalar med det den kan avvara och silver, och båda ska tjäna på bytet (delad)
function bynByte(s: State, a: Person, b: Person) {
  const L = s.projektSaknar, f = L && forByn(s);
  if (!L || !f || (a !== f && b !== f)) return false;
  const g = a === f ? b : a;
  if (g.gast || osams(s, g, f)) return false;
  for (const w of payable(s, g, ['silver'])) {
    const ps = L[w.k];
    if (w.t || !ps || ps.n < 1) continue;
    const n = bytaMed(s, bynPart(s, f.x, f.y, f), personPart(s, g), [{ k: w.k, n: Math.min(w.n, ps.n) }], { behov: bynBehov(s, w.k), minst: 1, fara: 0, typ: 'byn', utom: [w.k], delad: true });
    if (n > 0) { ps.n = Math.max(0, ps.n - n); count(s, 'bynByte'); return true; }
  }
  return false;
}
// a och b talar. Saknar någon av dem något som den andra har över? Då byter de, eller så ger den andra det. Ger true om
// något bytte ägare
export function askForGift(s: State, a: Person, b: Person) {
  for (const n of BEHOV()) for (const [m, g] of [[a, b], [b, a]]) if (lacksFor(s, m, n) && ((!osams(s, g, m) && tradeFor(s, m, g, n)) || gift(s, m, g, n))) return true;
  return !!askForTool(s, a, b) || eveningTrade(s, a, b) || bynByte(s, a, b);
}
// a och b talar, och ingen av dem saknar något just nu (steg 1.4.3). Har den ena mindre mat eller ved än hen vill ha kvar
// (b.kvar) och den andra mer, byter de när båda tjänar på det: vinsten delas (delad i byte). Samtalen hålls mest vid
// elden på kvällar och nätter (val.ts), så det är då de flesta sådana byten blir av
function eveningTrade(s: State, a: Person, b: Person) {
  for (const n of BEHOV()) for (const [m, g] of [[a, b], [b, a]]) {
    const rest = Math.min(n.kvar(s, m) - ownFor(s, m, n), ownFor(s, g, n) - n.kvar(s, g));
    if (rest < n.minst) continue;
    if (byte(s, m, g, delAv(s, g, n, rest), { behov: behovAv(s, m, n.slag[0]), minst: n.minst, fara: 0, typ: n.id, utom: n.slag, delad: true })) return true;
  }
  return false;
}

// är nöden så stor att p stjäl, och av vem? Ju högre empati, desto närmare döden innan man stjäl
function victimOf(s: State, p: Person, b: Behov) {
  if (!desperat(s, p, b)) return;
  const cands = living(s).filter(q => q !== p).map(q => {
    const own = ownFor(s, q, b);
    const w = own >= b.minst ? own * clamp(1 - getRel(s, p, q).op / 50, 0.2, 3) * (p.arke === q.id ? RELT.arkeStjal : 1) : 0; // helst av den man inte tycker om, och allra helst av sin ärkefiende
    return { q, w };
  }).filter(c => c.w > 0);
  if (!cands.length) return;
  return pickViktat(s, cands.map(c => c.q), cands.map(c => c.w), 'dela', p, true);
}
// key = behovet (mat, ved) eller slaget (material). lindrig = material till ett arbete
export function stole(s: State, tjuv: Person, offer: Person, key: string, n: number, lindrig = false) {
  if (n <= 1e-9) return;
  const st = (offer.stulet ??= []), f = st.find(x => x.av === tjuv.id && x.k === key);
  if (f) { f.n += n; if (!lindrig) delete f.l; } else st.push(lindrig ? { av: tjuv.id, k: key, n, l: true } : { av: tjuv.id, k: key, n });
  count(s, 'stold_' + (lindrig ? 'material' : key), n); // hur mycket som stals, inte hur många gånger: lika mycket hur ofta det tas (steg 10.2.15)
}
const namnOf = (key: string) => BEHOV().find(b => b.id === key)?.namn ?? (SAKER[key]?.namn ?? key).toLowerCase();
// p har tagit av sitt eget för behovet eller slaget key och märker om någon stulit av det
export function noticeTheft(s: State, p: Person, key: string) {
  if (!p.stulet?.some(x => x.k === key)) return;
  for (const { av, l, n } of p.stulet.filter(x => x.k === key)) {
    const t = byId(s, av);
    if (!t) continue;
    const r = getRel(s, p, t), w = l ? clamp(n * grundvarde(key) / DELA.stoldVarde, 0, 1) : 1;
    r.op = clamp(r.op - (l ? DELA.stoldLindrig * w : DELA.stoldOp), -100, 100);
    if (w < DELA.stoldTanke) continue;
    tanke(p, 'togSparat', s.now, { namn: t.name, sak: namnOf(key).toLowerCase(), v: l ? -0.04 : -0.1 });
    if (alive(t)) tanke(t, 'vetAttJagTog', s.now, { namn: p.name });
    handelse(s, t, l ? 'stoldLindrig' : 'stold', p, namnOf(key), p); // bara den bestulne vet, och kan berätta det (steg 3.3.1)
    if (!l) { livet(s, t, 'stal'); log(s, `${p.name} märkte att ${t.name} hade stulit ${hans(p)} ${namnOf(key)}.`, 'rel', [p.id, t.id]); upplev(s, p, 'bestulen', t.name); upplev(s, t, 'tjuv', p.name); }
  }
  p.stulet = p.stulet.filter(x => x.k !== key);
  if (!p.stulet.length) p.stulet = undefined;
}

// ---------- material till ett arbete ----------
// Den som tillverkar, bygger eller tänder elden tar materialet i samma steg som maten: sitt eget och byns, sedan som
// gåva av den i närheten som helst ger. Räcker det inte tar man av andras: en lindrig stöld, som man inte behöver vara
// nära döden för, men som ger sämre relation (DELA.stoldLindrig) när den bestulne märker det. Den med mycket hög empati
// tar aldrig av andras och gör då inte arbetet.
const aldrigStjal = (s: State, p: Person) => stat(p, 'empati', s.now) >= DELA.stjalAldrig;
// så mycket av slaget k som p kan få till ett arbete
export const getable = (s: State, p: Person, k: string) => (aldrigStjal(s, p) ? mayTake(s, p, k) : amountOf(s, k)) + iBordan(p, k); // med det hen bär till arbetet (steg 11.1.74)
// det p har till hands till sitt arbete av slaget k (steg 11.1.74): det hen bär dit och det som ligger inom räckhåll, utom det
// som sparas (till elden)
export const tillHands = (s: State, p: Person, k: string) => iBordan(p, k) + Math.max(0, iRackhall(p.x, p.y, () => getable(s, p, k) - iBordan(p, k)) - eldReserv(s, k));
// det första material i receptet av som p inte kan få tag i (med det som sparas till elden, sparas i ekonomi.ts), annars undefined (steg 6.1.17)
// receptet till ett projekt när p kunde göra det om materialet eller redskapet fanns (steg 6.2.19): materialet, redskapet
// som behövs och hur mycket av varje som sparas (annars eldReserv() i forradsmal.ts)
export interface Recept { av: Record<string, number>; verktyg?: string; spar?: (m: string) => number }
export const saknatAv = (s: State, p: Person, av: Record<string, number>, extra = (_m: string) => eldReserv(s, _m)) => Object.entries(av).find(([m, n]) => getable(s, p, m) < n + (iBordan(p, m) >= n ? 0 : extra(m)) - 1e-9)?.[0];
// materialet till ett redskap efter receptet (saker.ts: skaffa.av), till ens eget arbete: hur mycket av varje som togs
export function takeRecipe(s: State, p: Person, k: string) {
  const av: Record<string, number> = {};
  for (const [m, n] of Object.entries(SAKER[k]?.skaffa?.av ?? {})) av[m] = sumOf(takeMaterial(s, p, m, n));
  return av;
}
// p tar n av slaget k till ett arbete; common = till byns eld eller hus (byns först). Ger vems det var. kom = var det
// kom ifrån, nycklar som `kom` i bygg.ts skriver dem (eget, byn, familj, gava, stold)
export function takeMaterial(s: State, p: Person, k: string, n: number, common = false, kom?: Record<string, number>, ut?: Uttag): Del { // ut: hur mycket av veden som var blöt (steg 12.1.241)
  const ag: Del = {};
  if (n <= 1e-12) return ag;
  const not = (hur: string, d: Del) => { if (kom) for (const o in d) if (d[o] > 1e-9) { const h = +o === BYN ? 'byn' : +o === p.id ? 'eget' : hur; const key = `${h}:${h === 'byn' ? BYN : o}:${k}`; kom[key] = (kom[key] ?? 0) + d[o]; } };
  // det hen hämtat och bär till arbetet först (steg 11.1.74): det har redan tagits, som eget, byns, gåva eller stöld
  const bar = urBordan(s, p, k, n, common, ut);
  addDel(ag, bar); not('familj', bar); n -= sumOf(bar);
  if (n <= 1e-12) return ag;
  // ett byte före byns förråd, när det är till ens eget arbete
  if (!common && ownsAmount(s, p, k) < n - 1e-9) tradeMaterial(s, p, k, n - ownsAmount(s, p, k));
  const egen = Math.min(n, mayTake(s, p, k));
  const forst = use(s, p, k, egen, common, undefined, ut);
  addDel(ag, forst); not('familj', forst);
  if ((ag[p.id] ?? 0) > 1e-9) noticeTheft(s, p, k);
  let rest = n - egen;
  // be den i närheten som har och helst ger (familjen kan man väcka)
  // (det man ber om räknas som minst en hel sak: ett arbete tar materialet lite i taget, och viljan att ge ska inte bero på
  // hur stor bit som tas i ett slag, steg 10.2.15)
  const bed = Math.max(1, rest);
  if (rest > 1e-9) {
    const ask = living(s).filter(g => g !== p && ownsAmount(s, g, k) > 1e-9 && narvarande(g, p))
      .sort((a, b) => willing(s, b, p, ownsAmount(s, b, k) / bed) - willing(s, a, p, ownsAmount(s, a, k) / bed) || a.id - b.id);
    for (const g of ask) {
      if (rest <= 1e-9) break;
      if (rnd(s, 'dela', g) >= willing(s, g, p, ownsAmount(s, g, k) / bed)) continue;
      const v = ownMove(s, k, Math.min(rest, ownsAmount(s, g, k)), g.id, p.id);
      const d = use(s, p, k, v, common, undefined, ut); addDel(ag, d); rest -= v;
      if (kom) { const key = `gava:${g.id}:${k}`; kom[key] = (kom[key] ?? 0) + v; }
      const r = getRel(s, p, g); r.op = clamp(r.op + 1, -100, 100); minnsGava(s, g, p); // en gåva som de andra (steg 3.9.6)
      count(s, 'gava_material', v);
    }
  }
  // sist en lindrig stöld
  if (rest > 1e-9 && !aldrigStjal(s, p)) {
    const d = use(s, p, k, Math.min(rest, amountOf(s, k)), common, undefined, ut);
    for (const o in d) { const q = +o === BYN || +o === p.id ? undefined : byId(s, +o); if (q) stole(s, p, q, k, d[o], true); }
    addDel(ag, d); not('stold', d);
  }
  return ag;
}

// p byter till sig n av slaget k (material till ett eget arbete) av dem i närheten
function tradeMaterial(s: State, p: Person, k: string, n: number) {
  let rest = n;
  for (const g of kretsen(s, p, g => ownsAmount(s, g, k) > 1e-9, g => willing(s, g, p, ownsAmount(s, g, k) / rest), true)) {
    // rest räknas i styck av k: mät det som kom (byte ger behovets enheter, för grenar 0,4 per gren)
    const fore = ownsAmount(s, p, k);
    byte(s, p, g, [{ k, n: Math.min(rest, ownsAmount(s, g, k)) }], { behov: DELA.saknar, minst: 1e-6, fara: 0, typ: 'material', utom: [k] });
    rest -= ownsAmount(s, p, k) - fore;
    if (rest <= 1e-9) break;
  }
}

// ---------- redskap ----------
// Redskapen är ting (agande.ts) och går samma steg: sitt eget, byns, låna av någon som inte arbetar med sitt, och få
// eller byta till sig ett i samtal. Att låna är gåvan av något som kommer tillbaka: släkt och partner lånar alltid ut, och
// den unga byn lånar ut till alla den inte är osams med. Stjäl gör man inte: att sakna ett redskap dödar ingen.
// hur gärna giver ger till mottagaren, 0–1 (samma för mat, ved, material och redskap). Empati och relationen avgör
// mest. Den som har mycket över ger lättare (overflod = vad hen har delat med vad hen själv behöver: 1 ger 0,7 gånger,
// 2 ger 1 och 3 eller mer 1,3 gånger), seden Sammanhållning gör alla givmildare och Självförsörjning snålare, och ju
// rikare byn är desto mindre ger man (delning.ts). Till sina barn och sin partner ger man lika gärna i en rik by
// nod: den som ber om mat eller ved av nöd (behovsstegen); då ger också en främling, med golvet DELA.geFrammande (steg 10.5.11)
export function willing(s: State, g: Person, m: Person, overflod = 1, nod = false) {
  const over = clamp(DELA.overflodBas + DELA.overflodSteg * overflod, DELA.overflodMin, DELA.overflodMax), sed = 1 + DELA.gemenskapGe * s.seder.v.gemenskap;
  if (forsorjer(s, g, m)) return clamp(DELA.geBarn * Math.max(1, over) * sed, 0, 1); // till sitt barn ger man också det sista, så länge man försörjer det
  const r = getRel(s, g, m);
  if (r.op < REL.osams || g.arke === m.id) return 0; // sin ärkefiende ger man aldrig något (steg 3.1.1)
  const emp = stat(g, 'empati', s.now) / 20, nara = g.partner === m.id;
  const base = (nara ? DELA.gePartner : isKin(g, m) || arBast(g, m) ? DELA.geFamilj : Math.max(clamp(r.op / DELA.geVanOp, 0, DELA.geVanMax), nod && r.op >= 0 ? DELA.geFrammande : 0)) * (arRivaler(g, m) ? RELT.rivalGe : 1); // rivaler ger varandra mindre
  const rik = nara ? 1 : DELA.rikGe + (1 - DELA.rikGe) * (s.delning?.andel ?? 1);
  const tro = isParent(g, m) ? 1 : dampning(s, g, m.id, 'ge'); // till den man tror är en tjuv ger man ogärna, utom till sitt eget barn (steg 10.8.4)
  return clamp(base * (DELA.geEmpati + emp) * over * sed * rik * tro, 0, 1);
}
// Byten och gåvor i samtal: den som saknar ett redskap hen behöver i sitt arbete tar upp det. Den andra har ett redskap
// över (har två av slaget, eller arbetar inte med det). Har den som frågar något över som är värt nog blir det ett byte
// (byten nedan), annars kanske en gåva. Viljan är willing. Gåvan gör dem närmare.
// hur många redskap av slaget k p äger
function ownedKind(s: State, p: Person, k: string) {
  let n = 0;
  for (const t of tingOf(s)) if (t.agare === p.id && t.k === k) n++;
  return n;
}
// tot = habitTotal(p), som räknas en gång när samma person frågas om flera slag
// p saknar redskapet: hen arbetar med det och äger inget, eller byn har inget av slaget och det behövs i ett arbete som inte
// går utan det (yxan för att fälla träd, steg 4.5.4.16), så att man vill köpa det av handlaren
const needsTool = (s: State, p: Person, k: string, tot = habitTotal(p)) => ownedKind(s, p, k) === 0 && (habitShare(p, actsOf(k), tot) > 0.1 || kravs(k) && !tingOf(s).some(t => t.k === k));
const KRAVS: Record<string, boolean> = {}; // ur registret, en gång per slag
const kravs = (k: string) => KRAVS[k] ??= actsOf(k).some(a => ACTS[a].redskap?.[k]?.kravs);
const ensam = (s: State, k: string) => kravs(k) && tingOf(s).filter(t => t.k === k).length <= 1;
// ett redskap p har över: hen har fler av slaget, eller arbetar knappt med det och det är inte byns enda av ett slag som ett
// arbete inte går utan (steg 4.5.4.16). Inte det hen arbetar med just nu eller har på sig.
// Det i bäst skick, och av dem det första bland tingen
function spare(s: State, p: Person, k: string, tot = habitTotal(p)) {
  if ((habitShare(p, actsOf(k), tot) >= 0.03 || ensam(s, k)) && ownedKind(s, p, k) < 2) return;
  const iHanden = usesTool(p.task) === k;
  let best: Ting | undefined;
  for (const t of tingOf(s)) if (t.agare === p.id && t.k === k && !(t.hos === p.id && iHanden) && t.bar === undefined && (!best || t.c > best.c)) best = t;
  return best;
}
function give(t: Ting, g: Person, m: Person) {
  t.agare = m.id;
  if (t.hos === g.id) t.hos = undefined;
  t.krok = undefined; // ett redskap som hängde i bältet (steg 7.1.1) läggs i förrådet
}
// a talar med b. Saknar någon av dem ett redskap som den andra har över? Returnerar vad som hände
export function askForTool(s: State, a: Person, b: Person): 'gåva' | 'byte' | undefined {
  for (const [m, g] of [[a, b], [b, a]]) {
    const totM = habitTotal(m);
    let totG: number | undefined; // räknas först när m saknar något
    // slagen m äger räknas i ett svep över byns ting (needsTool går igenom tingen en gång per slag); inget byter ägare förrän
    // en gåva eller ett byte blir av, och då är frågan klar
    const ager = new Set<string>();
    for (const t of tingOf(s)) if (t.agare === m.id) ager.add(t.k);
    for (const k of REDSKAP_SLAG) {
      if (ager.has(k) || !(habitShare(m, actsOf(k), totM) > 0.1 || kravs(k) && !tingOf(s).some(t => t.k === k))) continue; // needsTool, med det ägda redan räknat
      const t = spare(s, g, k, totG ??= habitTotal(g));
      if (!t) continue;
      if (!osams(s, g, m) && byte(s, m, g, [{ k, n: 1, t }], { behov: DELA.saknar, minst: 1, fara: 0, typ: 'redskap', utom: [k] })) return 'byte';
      if (rnd(s, 'dela', g) >= willing(s, g, m, ownedKind(s, g, k))) continue;
      give(t, g, m);
      const namn = `${SAKER[k]?.ett ? 'ett' : 'en'} ${(SAKER[k]?.namn ?? k).toLowerCase()}`, r = getRel(s, a, b); // rätt genus (ett träspjut)
      r.op = clamp(r.op + 4, -100, 100);
      tanke(m, 'fickGava', s.now, { sak: namn, namn: g.name });
      tanke(g, 'gavGava', s.now, { sak: namn, namn: m.name }); minnsGava(s, g, m);
      count(s, 'gavor');
      gavaKlar(s, personPart(s, g), personPart(s, m), [{ k, n: 1, t }], false);
      handelse(s, g, 'gava', m, namn);
      return 'gåva';
    }
  }
}

// ---------- byten ----------
// Ett byte är ett steg i behovsstegen mellan sitt eget och byns förråd (steg 1.4.2): den som saknar något byter till sig
// det mot något hen inte behöver, med folk i närheten, familj och vänner först (samma krets som gåvorna). Var och en
// värderar en sak som grundvärdet (varde.ts) gånger sitt eget behov av den (behovAv), och bytet blir av när båda tjänar
// på det. Ojämna byten går när den ena får högst en femtedel mindre än hen ger (DELA.ojamn), när den som frågar håller på att
// dö av bristen (fara i BEHOV) eller när de står varandra nära (willing minst DELA.nara). Mat, ved, material och redskap
// byts här: i behovsstegen, när material tas till ett eget arbete, och när ett redskap saknas (i samtal).
const behovMed = (k: string) => BEHOV().find(b => b.slag.includes(k));
const enheter = (v: Vara[]) => v.reduce((x, { k, n }) => x + n * (behovMed(k)?.per?.[k] ?? 1), 0);
// hur mycket p behöver en till av slaget k, gånger grundvärdet: DELA.saknar för det p saknar för ett behov eller i sitt
// arbete, 1 för det p behöver behålla (mat och ved upp till b.kvar, redskapet hen arbetar med) och DELA.over för resten.
// Material som p saknar till ett arbete räknas där det tas (tradeMaterial)
export function behovAv(s: State, p: Person, k: string) {
  if (isTool(k)) return needsTool(s, p, k) ? DELA.saknar : ownedKind(s, p, k) > 0 && !spare(s, p, k) ? 1 : DELA.over;
  const b = behovMed(k);
  if (!b) return k === 'silver' && p.skatteskuld ? DELA.over * skuldFaktor(s, p) : DELA.over; // skatteskulden gör silvret mer värt (steg 10.5.5)
  const own = ownFor(s, p, b);
  if (b.behover(s, p) && own < b.minst) return DELA.saknar * (1 + b.fara(s, p));
  return own <= b.kvar(s, p) ? 1 : DELA.over;
}
// det p har över av behovet b: det hen själv behöver (b.kvar), och för maten det familjen behöver till sin buffert (steg 10.5.12):
// så stor del av bufferten i FORRADSMAL som byn inte delar, gånger det familjen äter på ett dygn, mot det familjen äger
function overEget(s: State, p: Person, b: Behov) {
  const egen = ownFor(s, p, b) - b.kvar(s, p);
  if (b.id !== 'mat') return egen;
  const fam = familjOf(s, p.id), fp = fam.length ? fam : [p];
  const har = fp.reduce((a, q) => a + ownFor(s, q, b), 0), buf = buffert(s, 'mat') * (1 - (s.delning?.andel ?? 1)) * fp.reduce((a, q) => a + kroppensMat(q, s.now), 0);
  return Math.min(egen, har - buf);
}
// det p kan byta bort: mat och ved utöver det hen och familjen behöver (overEget), material och redskap hen har över. Inte slagen i utom
export function payable(s: State, p: Person, utom: readonly string[]): Vara[] {
  // den som inte äger något redskap har inget att avvara (spare), och de flesta som betalar äger inget
  const ut: Vara[] = [], over = new Map<Behov, number>(), harRedskap = tingOf(s).some(t => t.agare === p.id);
  for (const k of SAK_LIST) {
    if (utom.includes(k) || !grundvarde(k)) continue;
    if (isTool(k)) { const t = harRedskap ? spare(s, p, k) : undefined; if (t) ut.push({ k, n: 1, t }); continue; }
    const own = ownsAmount(s, p, k), b = behovMed(k);
    if (own <= 1e-9) continue;
    if (!b) { ut.push({ k, n: own }); continue; }
    const kvar = over.get(b) ?? overEget(s, p, b), n = Math.min(own, helt(kvar / perOf(b, k))); // hela saker (steg 2.10.7)
    if (n > 1e-9) { ut.push({ k, n }); over.set(b, kvar - n * perOf(b, k)); }
  }
  return ut;
}
// bybon p som part i ett byte (byte.ts). Silver går att betala med också inom byn (steg 7.2.13), värt sitt grundvärde för alla
export function personPart(s: State, p: Person, silver = true): Part {
  return { id: p.id, namn: p.name, p, x: p.x, y: p.y, handel: p.skill.handel ?? 0, varde: k => behovAv(s, p, k), kanner: nr => kannerOrt(s, p, nr), over: utom => payable(s, p, silver ? utom : [...utom, 'silver']) };
}
// byn (det gemensamma förrådet) som part i ett byte med handlaren (steg 4.4.1.3). Byn värderar och bjuder efter förrådsmålen
// (steg 10.5.12): mat och ved efter bufferten i FORRADSMAL (för den mat byn äger: så stor del av bufferten som byn delar),
// material efter bufferten i MATERIALMAL och redskap per grupp efter REDSKAPMAL. Värdet har tre steg: det som saknas
// (DELA.saknar), det under bufferten (1) och det över (DELA.over). Byn bjuder bara sin egen del (inte det byborna äger) och bara
// det över bufferten, i hela saker: maten, veden, materialen, redskapen utom det som behövs i gruppen, och silvret.
// x, y = där den som handlar för byn står
// det byn behåller av materialet k när den byter: bufferten i förrådsmålen (villHaAv), och utsädet (steg 10.2.32)
const behalla = (s: State, k: string) => Math.max(arMaterial(k) ? villHaAv(s, k) : 0, utsadeKrok.av(s, k));
export const bynsDel = (s: State, k: string) => { let n = amountOf(s, k); for (const p of living(s)) n -= ownsAmount(s, p, k); return Math.max(0, helt(n)); };
function bynNod(s: State, b: Behov) { let n = 0; for (const j of b.slag) n += amountOf(s, j) * perOf(b, j); return { har: n, behover: living(s).reduce((a, q) => a + b.kvar(s, q), 0) }; }
// byns del av mat eller ved, och bufferten för den, i behovets enheter
function bynBuffert(s: State, b: Behov) {
  let har = 0;
  for (const j of b.slag) har += bynsDel(s, j) * perOf(b, j);
  const buf = b.id === 'mat' ? buffert(s, 'mat') * (s.delning?.andel ?? 1) * matPerDygn(s) : buffert(s, 'ved') * vedPerDygn(s);
  return { har, buf };
}
// redskapen i gruppen g som byn har, och hur många den vill ha
const iGruppen = (s: State, g: string) => tingOf(s).filter(t => gruppOf(t.k) === g && t.halv === undefined);
export const villGrupp = (s: State, g: string) => REDSKAPMAL[g]?.(s) ?? 1;
// vad den i:te av slaget k som byn ger bort är värd, gånger grundvärdet (steg 12.1.188): samma tre steg som bynBehovUtan, men
// för det som blir kvar när den är borta. Den som lämnar byn utan saken är värd DELA.saknar, den under bufferten 1 och den över
// DELA.over. Så säljs den sista bara när någon betalar riktigt bra, och det byn nyss köpt för att den saknade det säljs inte
// tillbaka till samma pris
export function bynKvar(s: State, k: string, i: number) {
  if (k === 'silver') return 1;
  if (isTool(k)) { const g = gruppOf(k), n = iGruppen(s, g).length - i; return n < 1 ? DELA.saknar : n < (REDSKAPMAL[g]?.(s) ?? 0) ? 1 : DELA.over; }
  const b = behovMed(k);
  if (!b) { const n = amountOf(s, k) - i; return n < 1 - 2e-6 ? DELA.saknar : n < behalla(s, k) ? 1 : DELA.over; }
  const { har, behover } = bynNod(s, b), { har: hb, buf } = bynBuffert(s, b), d = i * perOf(b, k);
  return har - d < behover ? DELA.saknar : hb - d < buf ? 1 : DELA.over;
}
export function bynBehov(s: State, k: string) {
  if (k === 'silver') return 1;
  // det byns projekt saknar (steg 10.5.17, projekt.ts): från grundvärdet upp till DELA.saknar efter projektets brist
  const ps = s.projektSaknar?.[k];
  if (ps && ps.n >= 1) return Math.max(bynBehovUtan(s, k), 1 + (DELA.saknar - 1) * ps.b);
  return bynBehovUtan(s, k);
}
function bynBehovUtan(s: State, k: string) {
  if (isTool(k)) { const g = gruppOf(k), n = iGruppen(s, g).length; return n < 1 ? DELA.saknar : n < villGrupp(s, g) ? 1 : DELA.over; }
  const b = behovMed(k);
  if (!b) { const n = amountOf(s, k); return n < 1 ? DELA.saknar : n < behalla(s, k) ? 1 : DELA.over; }
  const { har, behover } = bynNod(s, b);
  if (har < behover) return DELA.saknar;
  const { har: hb, buf } = bynBuffert(s, b);
  return hb < buf ? 1 : DELA.over;
}
// så många av k som byn tar emot innan det blir över (steg 12.1.48): samma gräns som bynOver säljer från (behalla eller bufferten),
// så att det som just köpts inte är överskott. Saknar byn saken helt tas minst en. Redskapen köps ett i taget (handel.ts)
// valt = det som redan valts i samma köp, per behov (steg 12.1.217): det dras från bristen innan nästa slag får sitt antal, som när byn säljer
export function bynKopAntal(s: State, k: string, valt?: Map<Behov, number>) {
  if (isTool(k)) return 1;
  const minst = bynBehovUtan(s, k) >= DELA.saknar ? 1 : 0, b = behovMed(k);
  if (!b) return Math.max(minst, Math.ceil(behalla(s, k) - amountOf(s, k) - 1e-9));
  const { har, buf } = bynBuffert(s, b), fore = valt?.get(b) ?? 0;
  return Math.max(fore > 0 ? 0 : minst, Math.ceil((buf - har - fore) / perOf(b, k) - 1e-9));
}
// n av slaget k har valts i köpet: det räknas i behovet (steg 12.1.217)
export function kopValt(valt: Map<Behov, number>, k: string, n: number) { const b = behovMed(k); if (b && !isTool(k)) valt.set(b, (valt.get(b) ?? 0) + n * perOf(b, k)); }
function bynOver(s: State, utom: readonly string[]): Vara[] {
  const ut: Vara[] = [], rest = new Map<Behov, number>(), grupper = new Map<string, number>(), gruppNr = new Map<string, number>();
  for (const k of SAK_LIST) {
    if (utom.includes(k) || !grundvarde(k)) continue;
    if (isTool(k)) {
      // byns redskap av slaget, så länge gruppen har fler än målet (REDSKAPMAL); utan mål också det sista, som då är värt mest (bynKvar, steg 12.1.188)
      const g = gruppOf(k), egna = tingOf(s).filter(t => t.k === k && t.agare === BYN && t.halv === undefined && t.hos === undefined && t.bar === undefined && t.krok === undefined);
      let over = grupper.get(g) ?? iGruppen(s, g).length - (REDSKAPMAL[g]?.(s) ?? 0), nr = gruppNr.get(g) ?? 0;
      for (const t of egna) { if (over < 1) break; ut.push({ k, n: 1, t, nr: ++nr }); over--; } // varje redskap bär sitt ordningstal i gruppen (steg 12.1.201)
      grupper.set(g, over); gruppNr.set(g, nr);
      continue;
    }
    if (amountOf(s, k) < 1 - 2e-6) continue; // inte en hel sak i förrådet: byns del blir ingen hel sak (bynsDel), och då behöver ingen räknas
    let n = bynsDel(s, k) - (s.projektSaknar?.[k]?.beh ?? 0); // det projekten behöver säljs inte (steg 10.5.17)
    if (n < 1) continue;
    const b = behovMed(k);
    if (b) {
      const r = rest.get(b) ?? (() => { const { har, buf } = bynBuffert(s, b); return har - buf; })();
      n = Math.min(n, helt(r / perOf(b, k)));
      rest.set(b, r - Math.max(0, n) * perOf(b, k));
    } else if (k !== 'silver') n = Math.min(n, helt(amountOf(s, k) - behalla(s, k))); // över bufferten; utan buffert också det sista, som då är värt mest (bynKvar, steg 12.1.188)
    if (n >= 1) ut.push({ k, n });
  }
  return ut;
}
// bud = den som handlar för byn: hen förhandlar med sin färdighet i Handel, och övar och minns som i ett eget byte
export function bynPart(s: State, x: number, y: number, bud?: Person): Part {
  return {
    id: BYN, namn: bud ? `${bud.name} för byn` : 'Byn', p: bud, x, y, handel: bud?.skill.handel ?? 0, varde: k => bynBehov(s, k), kvar: (k, i) => bynKvar(s, k, i), kanner: nr => bynKanner(s, nr)?.v, over: utom => bynOver(s, utom),
    lamna: w => { if (w.t) { w.t.agare = BYN; return w; } use(s, undefined, w.k, w.n, true); return w; },
    ta: w => { if (w.t) { w.t.agare = BYN; w.t.hos = undefined; } else if (isTool(w.k)) for (let i = 0; i < w.n; i++) { const t = newTing(s, w.k, 1, BYN); if (w.q !== undefined) t.q = w.q; if (w.skrift) t.skrift = w.skrift; } else put(s, w.k, w.n); },
  };
}
// färdigheten Handel i bytet (steg 4.4.1.4): den skickligare får en större del av vinsten när båda ska tjäna på bytet
// (v.delad), och den som är mycket skickligare kan lura den ovane: den ovane betalar mer, eller får mindre betalt, än bytet
// var värt. Den som blev lurad märker det ibland (mer ju skickligare och klokare hen är), blir sur och tycker sämre om den
// som lurade. Båda övar Handel i varje byte
export const HANDLA = balans('handla', {
  andel: 0.03, // så mycket större del av vinsten (av hela) per poäng i Handel man är skickligare än motparten ...
  andelMin: 0.1, andelMax: 0.9, // ... men aldrig mindre eller mer än så här av den
  nejMin: 30, // den som sagt nej till ett byte frågas inte igen förrän efter så här många minuter (steg 10.2.102: förut i varje slag)
  lura: 6, // så många poäng skickligare kan lura den andra ...
  luraChans: 0.4, // ... och gör det så här ofta ...
  luraAndel: 0.15, // ... och tar så stor del av bytets värde extra
  marka: 0.04, // chansen att märka att man blivit lurad, per poäng i Handel och halv poäng i intelligens
  byteRel: 2, // ett byte gör relationen så här mycket bättre ...
  byteTanke: 0.06, byteTim: 6, // ... och båda tänker glatt på det så här mycket i så många timmar
  ovning: 0.05, // så mycket växer Handel av ett byte (gånger 0,5 + intelligensen / 20)
  surTanke: -0.12, // tanken hos den som märkte att hen blev lurad ...
  surTim: 48, // ... och så många timmar
  surRel: 8, // så mycket sämre tycker hen om den som lurade
});
const andelAv = (M: Part, G: Part) => clamp(0.5 + HANDLA.andel * ((G.handel ?? 0) - (M.handel ?? 0)), HANDLA.andelMin, HANDLA.andelMax);
export interface Villkor { behov: number; minst: number; fara: number; typ: string; utom: readonly string[]; delad?: true }
// m byter till sig vill (det g har över) av g, och betalar med det m har över som är värt mest för g och minst för m.
// v.behov = hur mycket m behöver det (gånger grundvärdet), v.minst = minsta mängd som hjälper, v.fara = hur nära döden
// m är av bristen, v.typ = vad som räknas i statistiken (byte_mat …). Räcker inte det m har byter man mindre, om det
// fortfarande hjälper. v.delad = m behöver det inte nu (kvällens byten): m byter bara om hen tjänar på det, och betalar
// mer än det g ger: hälften av det hen själv vinner, så att båda tjänar på bytet. Ger hur mycket m fick, 0 om det inte blev
// något byte
function byte(s: State, m: Person, g: Person, vill: Vara[], v: Villkor): number {
  if (osams(s, g, m)) return 0;
  return bytaMed(s, personPart(s, m), personPart(s, g), vill, v);
}
// den som är mycket skickligare i Handel lurar ibland den andra: G tar mer betalt (M lägger till det som är värt mest för G),
// och har M redan lagt fram allt ger G mindre (det sista i fatt, det M får, tas bort); eller M betalar mindre (det sista M
// lägger fram tas bort). Ger den som lurade
function lura(s: State, M: Part, G: Part, betal: Vara[], varor: (Vara & { ut: number })[], ger: number, fatt: Vara[] = []): Part | undefined {
  const d = (G.handel ?? 0) - (M.handel ?? 0);
  if (Math.abs(d) < HANDLA.lura || rnd(s, 'handel') >= HANDLA.luraChans) return undefined;
  let mer = ger * HANDLA.luraAndel;
  if (d > 0) { // G lurar M, men tar inte mer än hen kan bära (som i betalaAv)
    let rum = (G.rymmer?.() ?? Infinity) - betal.reduce((a, b) => a + b.n * viktOf(b.k), 0);
    for (const w of varor) {
      if (mer <= 1e-9 || w.t) continue;
      const i = betal.findIndex(x => x.k === w.k && !x.t), fore = i >= 0 ? betal[i].n : 0, n = Math.min(w.n - fore, Math.ceil(mer / w.ut - 1e-6), Math.floor((rum + 1e-9) / viktOf(w.k)));
      if (n < 1) continue;
      if (i >= 0) betal[i].n += n; else betal.push({ k: w.k, n });
      mer -= n * w.ut; rum -= n * viktOf(w.k);
    }
    for (let i = fatt.length - 1; i >= 0 && mer > 1e-9; i--) { // något blir kvar av varje sak: ett byte är något mot något
      const f = fatt[i], ut = vardeAv(f, G, false);
      if (f.t || ut <= 1e-9) continue;
      const n = Math.min(f.n - 1, Math.floor(mer / ut + 1e-9));
      if (n < 1) continue;
      f.n -= n; mer -= n * ut;
    }
    return mer < ger * HANDLA.luraAndel ? G : undefined;
  }
  for (let i = betal.length - 1; i >= 0 && mer > 1e-9; i--) { // M lurar G
    const b = betal[i], w = varor.find(x => x.k === b.k);
    if (b.t || !w) continue;
    const n = Math.min(b.n - (i === 0 ? 1 : 0), Math.floor(mer / w.ut + 1e-9));
    if (n < 1) continue;
    b.n -= n; mer -= n * w.ut;
  }
  for (let i = betal.length - 1; i >= 0; i--) if (betal[i].n <= 0) betal.splice(i, 1);
  return mer < ger * HANDLA.luraAndel ? M : undefined;
}
// den som blev lurad märker det ibland: tanken, och sämre om den som lurade
function lurad(s: State, X: Part, L: Part) {
  count(s, 'lurat');
  if (L.p) gjort(s, L.p, 'lurade');
  if (L.p && X.p) handelse(s, L.p, 'lurade', X.p); // de som ser bytet (steg 12.1.134)
  const p = X.p;
  if (!p || rnd(s, 'handel') >= HANDLA.marka * ((p.skill.handel ?? 0) + p.pot.intelligens / 2)) return false;
  count(s, 'lurad');
  gjort(s, p, 'lurad');
  tanke(p, 'lurad', s.now, { namn: L.namn, v: HANDLA.surTanke, tid: HANDLA.surTim * HOUR });
  if (L.p) { const r = getRel(s, p, L.p); r.op = clamp(r.op - HANDLA.surRel, -100, 100); }
  log(s, `${p.name} märkte att ${L.namn} hade lurat ${honom(p)} i ett byte.`, 'rel', [p.id, ...(L.p ? [L.p.id] : [])]);
  return true;
}
// växeln: G ger tillbaka så mycket silver som M betalat för mycket (for, för G), i hela silver. Betalar M med silver blir det
// mindre silver i stället
function vaxelSilver(G: Part, M: Part, for_: number, betal: Vara[]) {
  const per = grundvarde('silver') * G.varde('silver');
  if (for_ < per || M.varde('silver') <= 0) return 0; // den som fått för mycket betalt ger växel i hela silver (steg 7.2.13)
  let n = Math.floor(for_ / per + 1e-9);
  const b = betal.find(w => w.k === 'silver');
  if (b) { const m = Math.min(n, b.n - 1); b.n -= m; n -= m; if (n <= 0) return 0; }
  const har = G.over([]).find(w => w.k === 'silver')?.n ?? 0;
  return Math.min(n, Math.floor(har));
}
// samma byte för alla parter (steg 4.4.1.1): M byter till sig vill av G. Bybor, byn och handlaren (handel.ts) går hit
export function bytaMed(s: State, M: Part, G: Part, vill: Vara[], v: Villkor): number {
  vill = vill.map(w => w.t ? w : { ...w, n: Math.ceil(w.n - 1e-6) }).filter(w => w.n > 0); // hela saker (steg 2.10.7)
  if (!vill.length) return 0;
  // det G nyss fått av M behöver G mer än annars: G vill ha mer för att ge tillbaka det (steg 10.2.43)
  const ger = vill.reduce((x, w) => x + gerVarde(w, G) * (nyssBytt(s, w.k, M.id, G.id) ? 1 + BYTE.nyssFatt : 1), 0); // det G ger, för G (det sista mest, steg 12.1.188)
  const far = vill.reduce((x, w) => x + w.n * (kartOf(w) ? vardeAv(w, M, true) : vardeOf(w)), 0) * v.behov; // det M får, för M (en karta: platserna M inte känner)
  if (ger <= 1e-9) return 0;
  const varor = betalVaror(M, G, v.utom), betala = (mal: number) => betalaAv(varor, G, mal);
  let { betal, fick, kost } = betala(ger);
  if (!betal.length) return 0;
  const desperat = v.fara > 0, nara = (a: Part, b: Part) => !!a.p && !!b.p && willing(s, a.p, b.p) >= DELA.nara;
  let del = 1; // så stor del av vill som byts
  if (fick < (1 - DELA.ojamn) * ger) {
    const kan = vill.some(w => w.t) ? 0 : fick / ger, hela = vill.reduce((x, w) => x + gerVarde(w, G, helt(w.n * kan)), 0) / ger;
    if (hela * enheter(vill) >= v.minst && hela > 0) { del = hela; ({ betal, fick, kost } = betala(ger * del)); } // M får det M kan betala, i hela saker
    else if (!desperat && !nara(G, M)) return 0;
  }
  if (v.delad ? far * del <= kost : far * del < (1 - DELA.ojamn) * kost && !desperat && !nara(M, G)) return 0;
  // silvret jämnar ut skillnaden (steg 4.4.1.3): betalade M mer än det G gav (man betalar med hela saker), ger G tillbaka
  // silver, om G har silver att ge (handlaren och byn; bybor byter inte silver än)
  const vaxel = vaxelSilver(G, M, fick - ger * del, betal);
  if (v.delad && del === 1) { // M betalar hälften av sin vinst till G, med det som är värt mest för G
    let extra = (far - kost) * andelAv(M, G); // hälften när båda är lika skickliga i Handel (steg 4.4.1.4)
    for (const w of varor) {
      if (extra <= 1e-9) break;
      const i = betal.findIndex(x => x.k === w.k && x.t === w.t), fore = i >= 0 ? betal[i].n : 0;
      const n = w.t ? (fore || w.in > extra ? 0 : 1) : Math.min(w.n - fore, Math.round(extra / w.in));
      if (n <= 1e-9) continue;
      if (i >= 0) betal[i].n += n; else betal.push({ k: w.k, n, t: w.t });
      extra -= n * w.in;
    }
  }
  if (vill.reduce((x, w) => x + w.n * vardeOf(w), 0) * del < DELA.byteMinst) return 0;
  const fatt = vill.map(w => ({ ...w, n: w.t ? 1 : helt(w.n * del) })).filter(w => w.n > 0);
  if (vaxel > 0) fatt.push({ k: 'silver', n: vaxel });
  if (!fatt.length || !betal.length) return 0; // ett byte är något mot något: blev ena sidan noll hela saker blir det inget byte
  return genomfor(s, M, G, fatt, betal, v.typ, desperat, !!v.delad, lura(s, M, G, betal, varor, ger * del, fatt));
}
// det M kan betala G med: det som är värt mest för G och minst för M först (ut = värt för G, in = värt för M)
export function betalVaror(M: Part, G: Part, utom: readonly string[]) {
  // in = den första som M ger; kostar de följande M mer (byn, steg 12.1.188) räknar inN det som går åt
  return M.over(utom).map(w => ({ ...w, ut: vardeAv(w, G, true), in: Math.max(1e-9, gerVarde(w, M, 1)), ...M.kvar && !w.t ? { inN: (n: number) => gerVarde(w, M, n) } : {} }))
    .filter(w => w.ut > 1e-9).sort((a, b) => b.ut / b.in - a.ut / a.in || +!!a.t - +!!b.t);
}
// det M betalar för att G ska få mal (för G), i hela saker: man betalar hellre lite för mycket (steg 2.10.7). fick = värt för G, kost = värt för M
// Kan G bara bära en viss vikt (handlaren, steg 4.4.1.3) räknas vikten först (steg 12.1.148): frigjord är vikten av det G ger
// bort i bytet, och en vara som inte ger nog värde per vikt för att nå målet i det rum som är kvar avstås från i första
// vändan, så att lasten inte fylls av tunga varor innan målet nåtts; räcker det ändå inte tas det som får plats
export function betalaAv(varor: ReturnType<typeof betalVaror>, G: Part, mal: number, frigjord = 0) {
  const ut: Vara[] = [];
  let f = 0, k = 0, rum = (G.rymmer?.() ?? Infinity) + frigjord; // det G får, för G, och det M ger, för M, och hur mycket mer G kan bära (vikt)
  const ta = (w: (typeof varor)[number], tat: boolean) => {
    const fore = ut.find(x => x.k === w.k && x.t === w.t)?.n ?? 0, vikt = viktOf(w.k);
    let n = w.t ? (fore ? 0 : 1) : Math.min(w.n - fore, Math.ceil((mal - f) / w.ut - 1e-6));
    if (tat && vikt > 0 && n * vikt > rum + 1e-9 && w.ut / vikt < (mal - f) / Math.max(1e-9, rum)) return; // för tungt för det den är värd: avstås från
    if (n * vikt > rum + 1e-9) n = w.t ? 0 : Math.floor((rum + 1e-9) / vikt); // handlaren tar inte emot mer än hen kan bära
    if (n <= 0) return;
    rum -= n * vikt;
    const x = ut.find(y => y.k === w.k && y.t === w.t);
    if (x) x.n += n; else ut.push({ k: w.k, n, t: w.t });
    f += n * w.ut; k += w.inN ? w.inN(fore + n) - w.inN(fore) : n * w.in;
  };
  const tat = isFinite(rum);
  for (const w of varor) { if (f >= mal - 1e-9) break; ta(w, tat); }
  if (tat) for (const w of varor) { if (f >= mal - 1e-9) break; ta(w, false); } // det som avstods från, så långt det får plats
  return { betal: ut, fick: f, kost: k };
}
// ett byte som båda gått med på genomförs: M får fatt av G och betalar betal. Sakerna flyttas, båda är nöjda och övar Handel,
// och bytet står i loggen (byteKlart). lurare = den som lurade den andra (lura). Samma för vardagens byten (bytaMed) och
// förhandlingen med handlaren (steg 4.5.7.4, handel.ts)
export function genomfor(s: State, M: Part, G: Part, fatt: Vara[], betal: Vara[], typ: string, desperat = false, delad = false, lurare?: Part) {
  for (const w of fatt) flytta(s, w, G, M);
  for (const w of betal) flytta(s, w, M, G);
  if (M.p && G.p) { const r = getRel(s, M.p, G.p); r.op = clamp(r.op + HANDLA.byteRel, -100, 100); }
  if (M.p) tanke(M.p, 'bytte', s.now, { varor: varorText(fatt), namn: G.namn, v: HANDLA.byteTanke, tid: HANDLA.byteTim * HOUR });
  if (G.p) tanke(G.p, 'bytte', s.now, { varor: varorText(betal), namn: M.namn, v: HANDLA.byteTanke, tid: HANDLA.byteTim * HOUR });
  for (const X of [M, G]) if (X.p) { ovning(X.p, 'handel', HANDLA.ovning * (0.5 + X.p.pot.intelligens / 20)); gjort(s, X.p, 'bytt'); }
  if (lurare) { const X = lurare === M ? G : M, markt = lurad(s, X, lurare); for (const f of vidLura) f(s, lurare, X, markt); }
  else { const v = (l: Vara[]) => l.reduce((a, w) => a + (w.varde ?? grundvarde(w.k) * w.n), 0), vf = v(fatt), vb = v(betal); // den som gav mer än hen fick: ett bra pris (steg 12.1.134)
    if (vf + vb >= BERATT.stortByte) kronikaBer(s, 'k_handel', Math.floor(s.now / HOUR), { a: M.namn, b: G.namn, fick: varorText(fatt), gav: varorText(betal) }); // ett stort byte (steg 12.1.135)
    if (G.p && M.p && vf >= vb * (1 + RYKTE.braPris) && vb > 0) handelse(s, G.p, 'braPris', M.p); else if (G.p && M.p && vb >= vf * (1 + RYKTE.braPris) && vf > 0) handelse(s, M.p, 'braPris', G.p); }
  const n = enheter(fatt);
  count(s, 'byten'); count(s, 'byte_' + typ, n); if (delad) count(s, 'kvallsbyten');
  if (byteKlart(s, M, G, fatt, betal, desperat)) count(s, 'storaByten'); // samma rad i loggen och krönikan, vem motparten än är
  return n;
}
// den som är skickligare lurar ibland den andra i ett byte M och G gått med på (handlaren, steg 4.5.7.4): betal kan ändras
export const luraI = (s: State, M: Part, G: Part, betal: Vara[], utom: readonly string[], ger: number, fatt: Vara[] = []) => lura(s, M, G, betal, betalVaror(M, G, utom), ger, fatt);
import { foodDays } from './ekonomi';
import { MALTIDSNIVA, RATT, VARIATION, basta, maltidsNiva, proteinAv, rattInfo, smakSak } from './ratter';
import { ROK, ROKAS, STEK, kockGlad } from './matlagning';
import { smakFinMaltid } from './rykten';
import { specialTanke } from './special';
import { tanke } from './tankar';
