import { strandNu } from './sjo';
import { take } from './agande';
import { PLATS, campCenter, campDist, campKey } from './plats';
import { vargSkydd } from './varg';
import { tornadoSkydd } from './tornado';
import { brandVal } from './brand';
import { RESERV, foodDays } from './ekonomi';
import { ACTS, WORK, usesTool } from './handlingar';
import { canLight, emberOn, fireWant, needStones, needTinder, woodDays } from './eld';
import { ALDER, KROPP, REL, ageOf, count, isSick, living, relKey, stat } from './folk';
import { RELT, bredvidVikt } from './relationer';
import { onskan } from './naring';
import { halsa, hemma, kanGa, vardVal, vilaHellre } from './halsa';
import { harMat } from './behov';
import { FANGST, Kind, Lager, flintSpot, richness, wantsFlint } from './fynd';
import { coldOf, nederbord, temperature } from './vader';
import { varselSamla } from './motgang';
import { DJUR, DJURARTER, Djurart, GORS, canProcess, djurKvar, freeOfKinds, makeTask, toolGroups, wantsTool } from './redskap';
import { PROJEKT, Uppgift, bastaProjekt } from './projekt';
import { faltNu, vildFronPlats } from './odling';
import { MINNE, areaOf, flintArea, pickSpot, prospectFor } from './minne';
import { eldPlats, getMap } from './karta';
import { amountOf, avbryt, fetchSpot, flodUndan, haulJob } from './lager';
import { bedFor, buildJob, siteOf } from './bygg';
import { bitAt, blocked, freeNear, roomAt } from './byggnad';
import { bedTile, homeless, samlingRum, varmareInne } from './byggnader';
import { groundOf, isForest, punktIRuta, tileOf } from './mark';
import { axeTask, fallTid } from './skog';
import { GA_TID, startWork, startsOnArrival } from './paborjat';
import { duty, dygn, habitShare, habitTotal } from './seder';
import { clamp, pick, pickNarmaste, rnd } from './slump';
import { ARSTID, ageIndex, isLight, kallTid, yearNo } from './tid';
import { Act, H, HOUR, MIN, Person, Skill, Stat, State, T, Task, W, inMap } from './typer';
import { balans } from './balans';
import { islagt, naVattnet } from './is';
import { drickVal, torstig, tortarFarligt, vattenVal } from './torst';
import { forSmutsigt, latrinFor } from './smuts';
import { bordenOf, byInne, ledigPlats, lekplats, sittAt, stationAt, stationFor, storlekAv, vidStation } from './stationer';
import { grillTid, kanGrilla, kanTorka, torkTid } from './matlagning';
import { egenBrasa } from './brasor';
import { utbrottBorjar, utbrottNu } from './humor';
import { smakDrag } from './rykten';
import { pabud, skams } from './styre';

// ---------- val av aktivitet ----------
// Balanstalen (regel 8): vikter, chanser, avstånd och hur länge ett pass varar. Kroppens gränser (KROPP) och åldrarna (ALDER)
// står i folk.ts, halv dags gång (PLATS) i plats.ts, reserverna (RESERV) i ekonomi.ts och tidsålderns faktorer (ARSTID) i tid.ts.
// Längder är i minuter om inget annat sägs; ett val varar minst X och upp till X + Spann
const VAL = balans('val', {
  // alla pass
  pass: 0.5, // dagens pass är så stor del av vad de var före steg 1.5.11 (arbete, bygge och fritid kortas lika mycket)
  vilaMin: 20, vilaSpann: 40, // ett val som inte säger annat (nöd och grundbehov)
  toaMin: 4, toaSpann: 4, // ett toabesök
  // var man arbetar (spotFor)
  provar: 260, // så många slumpade rutor prövas runt lägret
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
  baraChans: 0.25, baraTim: 3, // chansen att bära in det som ligger ute, och hur länge (timmar)
  slaktChans: 0.5, // chansen att slakta vilt som finns
  rensaChans: 0.5, // ... och att rensa fisk som finns
  grillaChans: 0.5, // ... och att grilla rått kött och rå fisk (steg 2.8.1)
  torkaChans: 0.5, // ... och att hänga upp det byn inte hinner äta på torkställningen och ta ner det torkade (steg 2.8.2)
  extraMin: 5, // slakt och rensning varar 5 minuter över vad det tar (och högst maxTim i DJUR, redskap.ts)
  byggLaga: 1.2, byggHalvt: 3, byggNytt: 0.8, // hur mycket bygget väger: en vägg som lagas, ett hus som är påbörjat, ett nytt
  byggUtan: 3, // ... plus så mycket gånger andelen som saknar sovplats under tak
  byggMatFran: 0.25, byggMatSpann: 0.9, byggMatMin: 0.1, // maten dämpar bygget: (matdygn - Fran) / Spann, aldrig under Min
  letaFlinta: 0.1, // flinta över detta (och inget behov av stenar) gör att någon letar flinta till en yxa ...
  letaMat: 0.7, // ... om maten räcker så många dygn ...
  letaChans: 0.3, // ... och med denna chans
  fronChans: 0.4, // (0,2 före steg 2.12.2) chansen att den som samlar går till de vilda grödorna och plockar frön, när byn vill ha fler (steg 2.10.11)
  stenarChans: 0.5, // chansen att den som samlar letar flinta eller stenar vid stenarna när byn saknar det (och ett helt pass)
  tandHamtare: 3, // så många hämtar tändmaterial åt en släckt eld som mest
  projektVikt: 1.5, // det mest värda projektet (projekt.ts) väger som arbete så här mycket gånger sitt värde
  akut: 3, // arbetet är helt akut när det mest behövda väger så här mycket
  kolEld: 0.6, kolChans: 0.2, kolMin: 10, // kol hämtas ur den släckta elden när elden vill ha mindre än så här, med denna chans, i så många minuter
  lekBas: 0.45, lekSed: 0.2, // en yngre än vuxen leker med denna chans (plus seden Barn gånger Sed)
  flitigBas: 0.88, flitigAkut: 0.12, // chansen att arbeta för den flitige: Bas + Akut gånger hur akut arbetet är
  latBas: 0.6, latAkut: 0.4, // ... och för den lata (gånger hur väl de egna behoven är fyllda)
  arbeteMin: 60, arbeteSpann: 120, // ett arbetspass
  byggMin: 60, byggSpann: 90, // ett pass med bygge
  // lusten att arbeta och vikten av byns behov
  lustBas: 4, lustEgenskap: 3, lustVana: 2, // lusten = (Bas + färdigheten + egenskapen / Egenskap) gånger (1 + Vana gånger andelen vana)
  brusMin: 0.6, brusSpann: 0.8, // slumpbrus på poängen: mellan Min och Min + Spann
  forsiktig: 0.25, // en försiktig by vill ha så mycket större förråd
  torkPabud: 0.6, // ledarens påbud om torkat ändrar chansen att torka så mycket (-1 till 1, steg 3.5.2, styre.ts)
  behovTomt: 3.2, behovMax: 3.5, // vikten av ett tomt förråd av mat eller ved, och den högsta vikten
  matDygn: 1.1, matMin: 0.4, // för mat: förrådets dygn dämpar vikten ner till Min, när förrådet räcker så länge byn vill (onskatLager) ...
  matMatt: 2, matMinMatt: 0.04, // ... och sedan vidare ner till MinMatt när det räcker Matt gånger så länge: då upphör matarbetet nästan (steg 3.10.9)
  vedDygn: 2, vedMin: 0.15, // ... och för ved
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
  bynRadie: 1, bynSpann: 2.5, // så här många rutor från byns inre (plus upp till Spann) sitter den som gör handarbete utan bänk
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
// handarbete utan bänk (steg 2.10.6): inne i byn, där lagret och husen är (byInne i stationer.ts), eller under tak i samlingshuset,
// så att arbetet inte hänger på var elden ligger. Inte i en vägg, i vattnet, i en station eller på en stubbe vid bordet.
// Den som är för varm i solen söker skugga nära platsen (steg 2.3.13).
function hantverkIByn(s: State, p: Person): { x: number; y: number } {
  const sal = samlingRum(s);
  if (sal && rnd(s, 'val', p) < VAL.bynTak) return punktIRuta(s, pick(s, sal.tiles, 'val', p), p);
  const mid = byInne(s), cx = mid.x + 0.5, cy = mid.y + 0.5;
  if (forVarmISol(s, p)) { const sk = skuggaNara(s, p, cx, cy); if (sk) return sk; }
  for (let k = 0; k < 12; k++) {
    const ang = rnd(s, 'val', p) * Math.PI * 2, r = VAL.bynRadie + rnd(s, 'val', p) * VAL.bynSpann, x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
    if (inMap(x, y) && !blocked(s, x, y) && !sittAt(s, x, y) && !stationAt(s, x, y)) return { x, y };
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
export function spotFor(s: State, act: Act, p: Person): { x: number; y: number } {
  const m = getMap(s.seed), d = ACTS[act], plats = d.plats ?? 'skog';
  const f = plats === 'elden' ? egenBrasa(s, p) ?? eldPlats(s) : eldPlats(s); // vid elden: vid den brinnande brasa man hör till (steg 2.9.1), annars lägerelden
  // det som görs utan bänk görs inne i byn och inte vid elden (steg 2.10.6); när det är kallt sätter man sig vid elden som förut, för värmens skull
  const iByn = d.slag === 'hantverk' && (plats === 'elden' || plats === 'station' && !stationFor(s, act)) && coldOf(temperature(s)) === 0;
  if (iByn && nederbord(s)) { const sal = samlingRum(s); if (sal) return punktIRuta(s, pick(s, sal.tiles, 'val', p), p); } // i regnet under tak (steg 2.11.1)
  if (iByn) return hantverkIByn(s, p);
  if (plats === 'skugga') return skuggaHar(s, p) ?? { x: p.x, y: p.y };
  // den som är för varm i solen vilar och gör handarbete i skuggan nära elden i stället (steg 2.3.13)
  if ((plats === 'elden' && d.hantverk || plats === 'sang' && act === 'vila') && forVarmISol(s, p)) {
    const bed = plats === 'sang' ? bedFor(s, p) : undefined;
    if (bed && roomAt(s, bed.x, bed.y)) return bed;
    const sk = skuggaNara(s, p, f.x + 0.5, f.y + 0.5); if (sk) return sk;
  }
  if (plats === 'station') { const st = stationFor(s, act); if (st) { const at = vidStation(st); return { x: at.x + (rnd(s, 'val', p) - 0.5) * 0.6 * storlekAv(st).w, y: at.y }; } } // vid stationen, längs hela dess bredd, annars i byn (eller vid elden när det är kallt)
  if (plats === 'bord') { const at = ledigPlats(s, p); if (at) return at; } // vid ett bord, annars vid elden
  if (plats === 'elden' || plats === 'station' || plats === 'bord') {
    // när det är kallt samtalar och berättar man i samlingshuset, om det är varmare där än vid elden (byggnader.ts)
    const sal = d.social ? samlingRum(s) : undefined, c = sal ? coldOf(temperature(s)) : 0;
    if (sal && (c > 0 && varmareInne(s, sal, c, d.varmer) || nederbord(s))) return isarIRum(s, p, sal.tiles); // ... och när det regnar (steg 2.11.1)
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
  if (plats === 'lek') { // lekplatsen räknas från byns inre, inte från elden (plats.ts, steg 2.10.4), men aldrig i vattnet
    const l = lekplats(s);
    for (let k = 0; k < 12; k++) {
      const x = l.x + rnd(s, 'val', p) * l.w, y = l.y + rnd(s, 'val', p) * l.h;
      if (inMap(x, y) && !blocked(s, x, y)) return { x, y };
    }
    return freeNear(s, l.x + l.w / 2, l.y + l.h / 2);
  }
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
  const cands: { x: number; y: number; d: number }[] = [], mid = campCenter(s);
  const min = plats === 'ang' || plats === 'avsides' ? VAL.narAvstAng : VAL.narAvst, max = plats === 'avsides' ? VAL.langtAvsides : Infinity;
  for (let i = 0; i < VAL.provar; i++) {
    const x = Math.floor(mid.x + (rnd(s, 'val', p) - 0.5) * (2 * PLATS.dagX)), y = Math.floor(mid.y + (rnd(s, 'val', p) - 0.5) * (2 * PLATS.dagY));
    if (!inMap(x, y)) continue;
    const d = campDist(s, x, y);
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
  const cx = Math.floor(x0), cy = Math.floor(y0), tiles = getMap(s.seed).tiles, R = MINNE.sokR;
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
// ingen plats hittades i närheten: den närmaste rutan som passar, var den än ligger
function nearestWanted(s: State, want: (t: number, x: number, y: number) => boolean, min = 0) {
  const m = getMap(s.seed);
  let best: { x: number; y: number } | undefined, bd = Infinity;
  for (let i = 0; i < W * H; i++) {
    const x = i % W, y = Math.floor(i / W);
    if (!want(m.tiles[i], x, y)) continue;
    const d = campDist(s, x, y);
    if (d >= min && d < bd) { bd = d; best = { x, y }; } // inte närmare lägret än min (toa: inte mitt i byn, steg 3.10.3)
  }
  return best;
}
// en plats på land en bit bort åt ett slumpat håll (p:s egen slumpföljd)
function walkSpot(s: State, p: Person, far: number) {
  const f = campCenter(s);
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
  const key = `${campKey(s)},${s.byggV ?? 0}`;
  let c = strandCache.get(s);
  if (c?.key !== key) {
    const sh = strandNu(s), ok: number[] = [];
    let bad: { x: number; y: number } | undefined, bd = VAL.strandNara;
    for (let i = 0; i < W * H; i++) {
      if (!sh[i]) continue;
      const x = i % W, y = Math.floor(i / W);
      if (bitAt(s, x, y)) continue;
      const d = campDist(s, x, y);
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
  return { kyla: cold && !s.fire.lit && !emberOn(s), svalt: foodDays(s) < VAL.svaltDygn, gras: kallTid(ai) || cold ? RESERV.torrgrasKyla : 0 };
}
type Faror = ReturnType<typeof dangers>;
// elden är släckt och kan inte tändas för att det saknas tändmaterial, och för få hämtar det
const tinderNeeded = (s: State) => !s.fire.lit && !emberOn(s) && !canLight(s) && needTinder(s) && living(s).filter(q => q.task?.act === 'samla').length < VAL.tandHamtare;
// det som väljs: handlingen, varför, hur länge, och var om det inte följer av handlingen
interface Val { act: Act; why: string; dur: number; pass?: number; spot?: { x: number; y: number }; ref?: number; tool?: string; site?: { x: number; y: number }; sok?: true; tandmat?: true; falt?: true }
const set = (v: Val, act: Act, why: string) => { v.act = act; v.why = why; return true; };

// Viljan i tre steg: 1. nöd, 2. grundbehov, 3. byns behov mot egen lust (på dagen) eller kvällen vid elden (på natten).
// Man går sedan dit (steg.ts)
export function chooseTask(s: State, p: Person) {
  const a = ageOf(p, s.now), light = isLight(s.now), lazy = 1 - duty(s, p);
  const v: Val = { act: 'vila', why: '', dur: (VAL.vilaMin + rnd(s, 'val', p) * VAL.vilaSpann) * MIN }; // 20–60 min
  const sk = vargSkydd(s, p) ?? tornadoSkydd(s, p), br = sk ? undefined : brandVal(s, p); // vargar är nära (steg 3.7.15), en tornado kommer (steg 3.8.4) eller det brinner (steg 3.8.5)
  // vattnet stiger (steg 3.8.7, flod.ts): de vuxna som orkar bär undan maten från lagerplatserna vattnet kan nå, också på natten
  const fl = sk || br || !s.flodHot || a < ALDER.vuxen || isSick(p, s.now) || !kanGa(p) ? undefined : flodUndan(s);
  if (sk) { set(v, sk.act, sk.why); v.spot = sk.spot; v.dur = sk.dur; }
  else if (br) { set(v, br.act, br.why); v.spot = br.spot; v.dur = br.dur; v.tool = br.tool; v.ref = br.ref; }
  else if (fl) { set(v, 'bara', fl.why); v.spot = fl; v.dur = VAL.baraTim * HOUR; count(s, 'flod undan'); }
  else if (!needs(s, p, v, a, lazy, light) && !(light && utbrottVal(s, p, v))) { if (light) day(s, p, v, a, lazy); else night(s, p, v, a); }
  if (ACTS[v.act].social && v.act !== 'maltid' && skams(p, s.now)) { v.act = 'skams'; v.why = 'Skäms och håller sig undan de andra'; v.spot = undefined; } // straffet skam (steg 3.5.3, styre.ts)
  if (v.act === 'toa') {
    v.dur = (VAL.toaMin + rnd(s, 'val', p) * VAL.toaSpann) * MIN;
    const l = latrinFor(s, p); // till latrinen om byn har en (steg 2.7.2, smuts.ts)
    if (l) { v.spot = { x: l.x + 0.5, y: l.y + 0.5 }; v.ref = l.id; v.why += '. Går till latrinen'; }
  }
  const sp0 = v.spot ?? spotFor(s, v.act, p), sp = freeNear(s, sp0.x, sp0.y); // aldrig i en husvägg
  p.task = { act: v.act, phase: 'go', tx: sp.x, ty: sp.y, until: s.now + v.dur + (startsOnArrival(v.act) ? GA_TID : 0), carry: 0, why: v.why, dark: !light, ref: v.ref, tool: v.tool, site: v.site, sok: v.sok, tandmat: v.tandmat, falt: v.falt, pass: v.pass !== undefined ? s.now + v.pass : undefined };
  const k = usesTool(p.task);
  if (k && !take(s, p, k)) p.task.tool = undefined; // redskapet tas i handen: det egna först (agande.ts)
}

// 1–2. nöd (sjuk, svag, fryser farligt, måste på toa genast) och grundbehov (toa, värme, vila).
// En lat person tillgodoser grundbehoven tidigare än en flitig. true = något valdes
function needs(s: State, p: Person, v: Val, a: number, lazy: number, light: boolean) {
  const lit = s.fire.lit, sick = isSick(p, s.now);
  if (a < ALDER.smabarn) return set(v, 'sova', 'Är ett litet barn');
  if (p.toa < KROPP.toaGenast) return set(v, 'toa', 'Måste gå på toa genast');
  if (tortarFarligt(p) && dricka(s, p, v)) return true; // också den som är sjuk eller svag dricker
  if (varda(s, p, v, true)) return true; // sina egna sår: trycka på, lägga förband och rengöra (steg 2.5.2)
  if (sick) return set(v, 'sova', 'Är sjuk');
  if (halsa(p) < KROPP.svag) return set(v, 'sova', 'Är för svag för att orka något'); // också av blodförlust och smärta (halsa.ts)
  if (p.warm < KROPP.farligt && lit) return set(v, 'varma', 'Fryser farligt');
  // elden går inte att tända för att tändmaterial saknas: den som fryser men orkar hämtar det i stället för att gå in.
  // Kylan är faran och elden det enda som hjälper mot den (några räcker; de andra går in och väntar)
  if (p.warm < KROPP.kallt + KROPP.latVarme * lazy && a >= ALDER.vuxen && tinderNeeded(s)) { v.tandmat = true; return set(v, 'samla', 'Fryser, men utan tändmaterial blir det ingen eld'); }
  if (p.warm < KROPP.farligt && bedTile(s, p) !== undefined) return set(v, 'vila', 'Fryser farligt och går in i huset');
  if (varda(s, p, v, false)) return true; // en skadad är en fara: vården går före förbättringarna (steg 2.5.2)
  if (hamtaVatten(s, p, v)) return true; // vatten i säcken åt den som inte kan gå (steg 2.10.1)
  if (!light && a > ALDER.sovGammal && rnd(s, 'val', p) < VAL.gammalSover) return set(v, 'sova', 'Är gammal och sover på natten');
  if (p.toa < KROPP.toaBehov + KROPP.latToa * lazy) return set(v, 'toa', 'Behöver gå på toa');
  if (p.warm < KROPP.kallt + KROPP.latVarme * lazy && lit) return set(v, 'varma', 'Fryser');
  if (p.warm < KROPP.kallt + KROPP.latVarme * lazy && bedTile(s, p) !== undefined) return set(v, 'vila', 'Fryser och går in i huset');
  if (torstig(p, lazy) && dricka(s, p, v)) return true;
  // den som inte kan gå kravlar hem, och den som har mycket ont eller ett infekterat sår vilar (steg 2.5.2)
  if (!kanGa(p) && !hemma(s, p)) return set(v, 'vila', 'Är skadad och kravlar hem');
  if (vilaHellre(p)) return set(v, 'vila', 'Är skadad och vilar');
  // extremt varm i solen: man söker skugga under ett träd eller i ett hus, så som den som fryser söker sig till elden (steg 2.3.13).
  // Den som bara är för varm arbetar som vanligt (steg 2.10.20)
  if (forVarmISol(s, p, KROPP.extremVarm)) {
    const sk = skuggaHar(s, p);
    if (sk) { v.spot = sk; v.dur = (VAL.svalkaMin + rnd(s, 'val', p) * VAL.svalkaSpann) * MIN; return set(v, 'svalka', 'Är för varm och söker skugga'); }
  }
  if (p.rest < (light ? KROPP.trottDag : KROPP.trottNatt) + KROPP.latVila * lazy) return set(v, 'vila', 'Är trött');
  // snart hungrig och det finns en ledig plats vid ett bord: man går dit och äter tillsammans med de andra (steg 2.2.15)
  const bord = p.hunger < KROPP.hungrig + KROPP.bordHunger && harMat(s, p) ? ledigPlats(s, p) : undefined;
  if (bord) { v.spot = bord; v.dur = (VAL.maltidMin + rnd(s, 'val', p) * VAL.maltidSpann) * MIN; return set(v, 'maltid', 'Är hungrig och äter vid bordet'); }
  return false;
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
  v.spot = d.spot; v.ref = d.ref; v.dur = 0;
  return set(v, 'varda', d.why);
}

// vattensäcken (steg 2.10.1, torst.ts): till vattnet, och tiden att fylla den räknas från framkomsten (startsOnArrival)
function hamtaVatten(s: State, p: Person, v: Val) {
  const d = vattenVal(s, p);
  if (!d) return false;
  v.spot = d.spot; v.ref = d.ref; v.tool = 'vattensack'; v.dur = 0; v.falt = d.falt;
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

// 3. på dagen: byns behov mot egen lust, vägda med pliktkänslan
function day(s: State, p: Person, v: Val, a: number, lazy: number) {
  const sd = s.seder.v;
  let gt: ReturnType<typeof haulJob>;
  v.dur *= VAL.pass;
  if (a < ALDER.hjalper) { set(v, 'leka', 'Är barn och leker'); return; }
  const fd = foodDays(s), wd = woodDays(s), ai = ageIndex(s), tot = habitTotal(p), fara = dangers(s); // farorna räknas en gång och gäller hela valet
  // att bära in är en förbättring: inte när byn fryser (talet dras ändå, så att personens följd är som förut). När byn svälter
  // bärs bara maten in, så att den inte blir liggande ute (steg 2.12.3)
  if (s.stackar?.length && rnd(s, 'val', p) < VAL.baraChans && !fara.kyla && (gt = haulJob(s, undefined, fara.svalt))) { set(v, 'bara', gt.why); v.spot = gt; v.dur = VAL.baraTim * HOUR; return; }
  // fältet (steg 2.10.3): den mogna grödan skördas innan den blir övermogen eller fryser, och den som börjat på sitt fält arbetar vidare
  const sk = a >= ALDER.vuxen ? faltNu(s, p, fara.svalt || fara.kyla) : undefined;
  if (sk) { projektVal(v, { act: 'odla', text: sk.text, min: sk.min, tool: sk.tool, spot: sk.spot, ref: sk.ref }, sk.tool === 'mogen' ? 'Grödan på fältet är mogen' : 'Arbetar vidare på sitt fält'); return; }
  const vilt = slaktbart(s, p);
  if (a >= ALDER.vuxen && vilt && rnd(s, 'val', p) < VAL.slaktChans) { processTask(s, v, vilt, 'Det finns vilt att slakta innan det blir dåligt'); return; }
  if (a >= ALDER.rensar && canProcess(s, p, DJUR.abborre) && rnd(s, 'val', p) < VAL.rensaChans) { processTask(s, v, DJUR.abborre, 'Det finns fisk att rensa innan den blir dålig'); return; }
  if (a >= ALDER.grillar && kanTorka(s, p) && rnd(s, 'val', p) < torkAndel(pabud(s, 'torkat'))) { torkVal(s, v, 'Det finns kött och fisk att torka'); return; }
  if (a >= ALDER.grillar && kanGrilla(s, p) && rnd(s, 'val', p) < VAL.grillaChans) { grillVal(s, v, 'Det finns rått kött och rå fisk att grilla'); return; }
  let { best, bs, burg } = bestWork(s, p, fd, wd, ai, tot, fara);
  // bygget: väger mer ju fler som saknar sovplats under tak, inför och under istiden, när en vägg behöver lagas och när huset inte är klart.
  // När kylan är en fara byggs inget: tiden går till värmen (steg 2.12.3)
  const job = fara.kyla ? undefined : buildJob(s, p), ppl = living(s);
  let build = false, bsBygg = -1;
  if (job) {
    const utan = homeless(s) / (ppl.length || 1);
    const halvt = !job.repair && !s.hus?.find(h => h.id === job.bit.hus)?.klar; // ett påbörjat hus vill man göra klart, även när det sista är ett hörn
    // hungern är en fara och går före: räcker maten mindre än byggMatFran + byggMatSpann dygn (1,15) väger bygget mindre
    const col = ((job.repair ? VAL.byggLaga : halvt ? VAL.byggHalvt : VAL.byggNytt) + VAL.byggUtan * utan) * (kallTid(ai) ? ARSTID.byggKall : 1) * clamp((fd - VAL.byggMatFran) / VAL.byggMatSpann, VAL.byggMatMin, 1);
    const sc = poang(s, p, col, lust(s, p, 'hantverk', 'flit', ['bygga'], tot));
    burg = Math.max(burg, col);
    if (sc > bs) { build = true; bsBygg = sc; if (job.missing) best = job.item === 'torrgras' ? 'samla' : 'ved'; }
  }
  // det mest värda projekt (projekt.ts) tävlar med arbetet och bygget, när ingen fara går före
  const pr = a >= ALDER.vuxen && !fara.kyla && !fara.svalt ? bastaProjekt(s, p, fara) : undefined;
  let proj = false;
  if (pr && poang(s, p, pr.varde * VAL.projektVikt, lust(s, p, 'hantverk', 'flit', [pr.u.act], tot)) > Math.max(bs, bsBygg)) { proj = true; build = false; }
  // saknar byn flinta eller stenar till elden när maten räcker, eller har den flinta till elden (en sprucken räknas) men inte till
  // en yxa, går någon och letar vid stenarna, också när plockning inte är det mest behövda. En i taget (steg 2.12.3)
  const eldFlinta = flintaTillElden(s, p, fara);
  const leta = !build && !proj && a >= ALDER.vuxen && (eldFlinta || flintaTillYxa(s, p, fd, ai)) && rnd(s, 'val', p) < VAL.letaChans;
  if (leta) best = 'samla';
  const u = clamp(burg / VAL.akut, 0, 1); // hur akut byn behöver arbete
  const sat = Math.min(p.hunger, p.rest, p.social); // hur väl de egna behoven är fyllda
  const tandmat = !leta && !(build && job!.missing) && best === 'samla' && needTinder(s); // samlar tändmaterial åt en släckt eld
  // skälet "behöver mat" bara när förrådet räcker kortare än byn vill (steg 3.10.9)
  const what = leta ? `Byn behöver ${needStones(s) ? 'stenar' : 'flinta'}` : build && job!.missing ? `Bygget behöver ${job!.item === 'torrgras' ? 'hö' : job!.item === 'ved' ? 'trä' : 'grenar'}` : best === 'ved' ? `Byn behöver trä, förrådet räcker ${dygn(wd)}` : tandmat ? 'Byn behöver tändmaterial till elden'
    : fd < matOnskat(s, p) ? `Byn behöver mat, förrådet räcker ${dygn(fd)}` : `Mer mat till förrådet, som räcker ${dygn(fd)}`;
  let works = false;
  if (a >= ALDER.ansvar && (s.fire.ash ?? 0) >= 1 && !s.fire.lit && !emberOn(s) && fireWant(s) < VAL.kolEld && rnd(s, 'val', p) < VAL.kolChans && !ppl.some(q => q.task?.act === 'kol')) {
    set(v, 'kol', 'Det ligger kol kvar i den slocknade elden');
    v.dur = VAL.kolMin * MIN;
  } else if (a < ALDER.vuxen) {
    if (rnd(s, 'val', p) < VAL.lekBas + VAL.lekSed * sd.barn) set(v, 'leka', 'Är barn och leker');
    else { set(v, best, `Hjälper till. ${what}.`); if (tandmat) v.tandmat = true; }
  } else if ((works = rnd(s, 'val', p) < (1 - lazy) * (VAL.flitigBas + VAL.flitigAkut * u) + lazy * sat * (VAL.latBas + VAL.latAkut * u)) && build && !job!.missing) {
    building(s, p, v, job!);
  } else if (works && proj) {
    projektVal(v, pr!.u, `Byn saknar ${PROJEKT[pr!.k].namn.toLowerCase()}`);
  } else if (works) {
    set(v, best, what + (lazy < 0.2 ? '. Plikttrogen.' : habitShare(p, [best], tot) > 0.25 ? '. Brukar göra det.' : p.skill[best as Skill] > 10 ? '. Skicklig på det.' : '.'));
    v.dur = (VAL.arbeteMin + rnd(s, 'val', p) * VAL.arbeteSpann) * MIN * VAL.pass;
    if (tandmat) v.tandmat = true;
    withTools(s, p, v, best, what, fd, ai, fara, leta);
    if (v.act === 'fiske' && islagt(s)) v.why = `${v.why} Hugger upp ett hål i isen och pimplar.`;
    if (build && job!.missing && job!.item === 'ved' && v.act === 'falla') { v.ref = job!.bit.hus; v.why = `${v.why} Stocken ska bli en vägg.`; } // trädet fälls för bygget
  } else leisure(s, p, v, u, lazy);
}

// egen lust att arbeta med färdigheten skill: färdigheten och egenskapen som hjälper, gånger vanan (acts: handlingarna som räknas)
const lust = (s: State, p: Person, skill: Skill, egenskap: Stat, acts: Act[], tot: number) => (VAL.lustBas + p.skill[skill] + stat(p, egenskap, s.now) / VAL.lustEgenskap) * (1 + VAL.lustVana * habitShare(p, acts, tot)) * smakDrag(p, acts); // och smaken (steg 3.3.5)
// byns behov (col) gånger lusten, med ett slumpbrus mellan brusMin och brusMin + brusSpann (drar ett tal ur 'val')
const poang = (s: State, p: Person, col: number, like: number) => col * like * (VAL.brusMin + rnd(s, 'val', p) * VAL.brusSpann);
// hur många dygn mat (eller ved) byn vill ha innan behovet är som minst, för förrådsseden eller påbudet v (påbuden i fliken Styre, steg 3.5.4 och 3.10.16)
export const onskatLager = (ved: boolean, v: number) => (ved ? VAL.vedDygn : VAL.matDygn) * (1 + VAL.forsiktig * v) * (VAL.behovTomt - (ved ? VAL.vedMin : VAL.matMin));
// hur många dygn mat p tycker att byn ska ha (som onskatLager, med p:s aning om en hård vinter, steg 3.8.1): kortare tid är matarbetet
// ett behov, längre bara ett tillskott (steg 3.10.9)
const matOnskat = (s: State, p: Person) => VAL.matDygn * (1 + VAL.forsiktig * pabud(s, 'matlager') + (p.varsel ? varselSamla(s, p) : 0)) * (VAL.behovTomt - VAL.matMin);
export const torkAndel = (v: number) => VAL.torkaChans * (1 + VAL.torkPabud * v);
// det arbete byn behöver mest just nu, vägt mot egen lust och vana. burg = hur mycket det mest behövda behövs
function bestWork(s: State, p: Person, fd: number, wd: number, ai: number, tot: number, fara: Faror) {
  // en försiktig by vill ha större förråd, och ledarens påbud drar åt sitt håll (steg 3.5.2, styre.ts)
  // den som anar en hård vinter vill ha ännu större förråd, mer i en förutseende by (steg 3.8.1, motgang.ts)
  const mer = p.varsel ? varselSamla(s, p) : 0;
  const fs = 1 + VAL.forsiktig * pabud(s, 'matlager') + mer, vs = 1 + VAL.forsiktig * pabud(s, 'vedlager') + mer;
  const onskat = matOnskat(s, p);
  const wFood = fd < onskat ? clamp(VAL.behovTomt - fd / (VAL.matDygn * fs), VAL.matMin, VAL.behovMax)
    : Math.max(VAL.matMinMatt, VAL.matMin - (VAL.matMin - VAL.matMinMatt) * (fd - onskat) / (onskat * (VAL.matMatt - 1)));
  const wWood = clamp(VAL.behovTomt - wd / (VAL.vedDygn * vs), VAL.vedMin, VAL.behovMax) * (kallTid(ai) ? ARSTID.vedKall : 1); // inför och under istiden väger veden tyngre
  const vikt = { mat: wFood, ved: wWood };
  let best: Act = 'samla', bs = -1, burg = 0;
  const ppl = living(s);
  for (const w of WORK) {
    // behovet, tändmaterialet och vattnet står i handlingens rad (ACTS i handlingar.ts, steg 2.12.3)
    const d = ACTS[w], need = vikt[d.behov!];
    const tinder = !!d.tand && needTinder(s);
    // nytta för byn; det platserna har kvar väger också in hur mycket de ger just nu, och att fiske med händerna ger lite
    const yieldF = !d.resurs || tinder ? 1 : clamp(prospectFor(s, p, w as Kind), VAL.prospektMin, VAL.prospektMax) * (d.vid === 'vatten' ? FANGST.handFiske * (naVattnet(s, p) ? 1 : 0) : 1) * toolGain(s, p, w, fara); // genom isen bara med ett hål (is.ts)
    const season = d.sasong![ai];
    // maten som någon längtar efter är mer värd att hämta (steg 2.6.2)
    const col = need * (!d.resurs ? 1 : tinder ? Math.max(VAL.tandMin, season) * VAL.tandVikt : season * yieldF * onskan(p, w, s.now));
    const sc = poang(s, p, col, lust(s, p, w as Skill, ACTS[w].egenskap!, [w], tot)) * bredvidVikt(s, p, w, ppl); // egen lust och vana, och vad vänner och ovänner gör (steg 3.1.1)
    burg = Math.max(burg, col);
    if (sc > bs) { bs = sc; best = w; }
  }
  return { best, bs, burg };
}

// att bygga eller laga en del av ett hus. Saknas material hämtar man det först
function building(s: State, p: Person, v: Val, job: NonNullable<ReturnType<typeof buildJob>>) {
  const b = job.bit, hus = s.hus?.find(h => h.id === b.hus)?.namn.toLowerCase() ?? 'huset';
  if (job.fell) { // först fälls träden där huset ska stå
    set(v, 'falla', `Fäller ett träd där ${hus} ska stå.`);
    v.dur = fallTid(s, b.y * W + b.x); v.spot = { x: b.x + 0.5, y: b.y + 0.5 }; // ett litet träd fälls fortare
    v.tool = 'yxa';
    return;
  }
  set(v, 'bygga', job.repair ? (b.k === 'golv' ? `Golvet i ${hus} är slitet och behöver lagas.` : `En vägg i ${hus} är sliten och behöver lagas.`) : `${b.k === 'golv' ? 'Lägger golv i' : 'Bygger på'} ${hus}. ${homeless(s) > 0 ? 'Alla har inte en sovplats under tak.' : ''}`.trim());
  v.tool = job.repair ? (b.k === 'golv' ? 'lagaGolv' : 'laga') : b.k === 'golv' ? 'golv' : 'vagg'; v.ref = b.id;
  v.dur = (VAL.byggMin + rnd(s, 'val', p) * VAL.byggSpann) * MIN * VAL.pass;
  const site = siteOf(s, b); v.spot = job.need > 0 ? fetchSpot(s, job.item!) : site; if (job.need > 0) v.site = site;
}

// en i taget letar vid stenarna (steg 2.12.3)
const andraLetar = (s: State, p: Person) => living(s).some(q => q !== p && q.task?.sok);
// Flinta till en yxa är en förbättring: bara när maten räcker och inte inför eller under istiden
// (byn har flinta till elden, en sprucken räknas, och stenar till eldringen)
const flintaTillYxa = (s: State, p: Person, fd: number, ai: number) => amountOf(s, 'flinta') > VAL.letaFlinta && !needStones(s) && wantsFlint(s) && fd >= VAL.letaMat && !kallTid(ai) && !andraLetar(s, p);
// Flinta och stenar till elden letas när byn saknar dem och maten räcker: hungern är en fara och elden ett verktyg (steg 2.12.3)
const flintaTillElden = (s: State, p: Person, fara: Faror) => !fara.svalt && (amountOf(s, 'flinta') < FANGST.flintaMinsta || needStones(s)) && !andraLetar(s, p);
// arbetet med redskap: flinta letas vid stenarna, yxan fäller träd, korgen och spjutet görs först om de saknas.
// fd: hur många dygn maten räcker, ai: tidsåldern, fara: farorna från day()
function withTools(s: State, p: Person, v: Val, best: Act, what: string, fd: number, ai: number, fara: Faror, leta = false) {
  const stones = needStones(s);
  if (best === 'samla' && (leta || (flintaTillElden(s, p, fara) || flintaTillYxa(s, p, fd, ai)) && rnd(s, 'val', p) < VAL.stenarChans)) { // byn saknar flinta eller stenar till eldringen. Stenarna ligger långt bort, så där letar man ett helt pass
    const fa = flintArea(p), fl = (fa !== undefined && flintSpot(s, p, (x, y) => areaOf(x, y) === fa)) || flintSpot(s, p);
    if (fl) { v.spot = fl; v.dur /= VAL.pass; v.sok = true; v.why = `${v.why} Letar efter ${stones ? 'stenar till en eldring' : 'flinta'} vid stenarna${fa !== undefined ? ' där hen vet att det finns flinta' : ''}.`; }
  }
  // byn vill ha frön: ibland går den som samlar till de vilda grödorna och plockar (där kommer man på odling, steg 2.10.11)
  if (best === 'samla' && !v.sok && !v.tandmat) {
    const vf = vildFronPlats(s);
    if (vf && rnd(s, 'val', p) < VAL.fronChans) { v.spot = vf; v.why = `${v.why} Plockar vilda frön.`; }
  }
  const ax = best === 'ved' ? axeTask(s, p, fara.kyla) : undefined; // med yxa fälls träd och huggs ved
  if (ax) {
    set(v, ax.act, `${what}. ${ax.why}.`);
    if (ax.act === 'yxa') v.pass = v.dur; // yxan görs i ett helt pass (steg 2.3.8)
    if (ax.dur) v.dur = ax.dur;
    if (ax.act !== 'yxa') { v.spot = { x: ax.x, y: ax.y }; v.tool = 'yxa'; }
    v.ref = ax.ref;
  }
  // med det bästa redskapet som är ledigt; finns inget gör den som kan ett först (inte när kylan är en fara)
  const { kyla, gras } = fara, rader = ACTS[v.act].redskap;
  if (rader) for (const [g, ks] of Object.entries(toolGroups(v.act))) {
    if (!rader[ks[0]].tar) continue; // yxan väljs med arbetet (axeTask)
    const k = freeOfKinds(s, p, ks);
    if (k) { v.tool = k; v.why = v.why.replace(/\.$/, '') + '. ' + rader[k].tar; return; }
    if (GORS[g] && !kyla && wantsTool(s, p, g, gras)) { // redskapet görs vid sin egen plats: inget ärvs från flintletandet eller tändmaterialet
      const m = makeTask(s, p, g); v.spot = undefined; v.sok = undefined; v.tandmat = undefined; set(v, m.act, `${what}. ${m.text}`); v.pass = v.dur; v.dur = m.min * MIN; if (m.tool) v.tool = m.tool; return;
    }
  }
}
// hur mycket mer arbetet ger med det redskap som finns ledigt eller kan göras (det bästa först). Ett redskap räknas som
// möjligt att göra bara när withTools skulle göra det: inte när kylan är en fara, och med höet som sparas till värmen
export function toolGain(s: State, p: Person, act: Act, fara: Faror) {
  for (const [g, ks] of Object.entries(toolGroups(act))) {
    if (freeOfKinds(s, p, ks) || GORS[g] && !fara.kyla && wantsTool(s, p, g, fara.gras)) return ACTS[act].redskap![ks[0]].ger ?? 1;
  }
  return 1;
}
// slakta det fällda viltet eller rensa fisken vid slaktbänken (DJUR i redskap.ts), så länge det tar, med kniven om det behövs
// det första djuret som p kan slakta (kaninen, vargen; steg 3.7.14)
const slaktbart = (s: State, p: Person) => DJURARTER.find(art => art.act === 'slakta' && canProcess(s, p, art));
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
  if (canProcess(s, p, DJUR.abborre)) { processTask(s, v, DJUR.abborre, `${why}. Rensar fisken.`); return; }
  if (ageOf(p, s.now) >= ALDER.grillar && kanTorka(s, p)) { torkVal(s, v, `${why}. Torkar kött och fisk.`); return; }
  if (ageOf(p, s.now) >= ALDER.grillar && kanGrilla(s, p)) { grillVal(s, v, `${why}. Grillar maten.`); return; }
  const pr = bastaProjekt(s, p, dangers(s));
  if (pr) { projektVal(v, pr.u, why); return; }
  set(v, 'samtal', 'Har inget handarbete att göra och sitter med de andra vid elden');
}
// ett pass med redskap delas inte upp (steg 2.3.8): när ett är klart och passet inte är slut gör man ett till i samma grupp,
// om byn vill ha fler och ingen fara går före. Annars väljer man något annat (steg.ts)
export function nastaRedskap(s: State, p: Person, tk: Task) {
  if (tk.pass === undefined || s.now >= tk.pass) return;
  const f = dangers(s);
  if (f.kyla || !wantsTool(s, p, tk.act, f.gras)) return;
  const m = makeTask(s, p, tk.act);
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
  const wb = temp >= VAL.badTemp && shore ? (clamp((temp - VAL.badNoll) / VAL.badSpann, 0, VAL.badMax) + varm) * calm : 0;
  // sitta vid stranden och se ut över vattnet: lugnt, året om, mest för den som inte är så sällskaplig
  const ws = shore ? (VAL.strandBas + (20 - stat(p, 'empati', now)) / VAL.strandDiv) * calm : 0;
  const r = rnd(s, 'val', p) * (wv + wh + wsoc + wp + wb + ws);
  if (r < wv) set(v, 'vila', lazy > 0.5 ? 'Har det bra och tar det lugnt' : 'Tar en paus');
  else if (r < wv + wh) craft(s, p, v, u < VAL.hantLugn ? 'Byn har det gott ställt, det finns tid för hantverk' : 'Tycker om att göra handarbete');
  else if (r < wv + wh + wsoc) set(v, 'samtal', 'Vill umgås');
  else if (r < wv + wh + wsoc + wp) {
    // nyfikna och modiga går längre bort
    const far = VAL.promNar + (stat(p, 'nyfikenhet', now) + stat(p, 'mod', now)) / 40 * VAL.promBort;
    set(v, 'promenad', far > 12 ? 'Är nyfiken och vill se vad som finns längre bort' : 'Vill sträcka på benen');
    v.spot = walkSpot(s, p, far); v.dur = (VAL.promMin + rnd(s, 'val', p) * VAL.promSpann) * MIN * VAL.pass;
  } else if (r < wv + wh + wsoc + wp + wb) { set(v, 'bada', `Det är varmt (${Math.round(temp)} grader) och skönt att bada`); v.spot = shore; v.dur = (VAL.badPassMin + rnd(s, 'val', p) * VAL.badPassSpann) * MIN * VAL.pass; }
  else { set(v, 'strand', islagt(s) ? 'Vill se ut över isen en stund' : 'Vill sitta vid vattnet och se ut över sjön'); v.spot = strandSpot(s, p); v.dur = (VAL.strandMin + rnd(s, 'val', p) * VAL.strandSpann) * MIN * VAL.pass; }
}

// på natten: en vakt, och de andra håller sig vid elden och berättar, gör handarbete, umgås eller sover
function night(s: State, p: Person, v: Val, a: number) {
  const now = s.now;
  const guardDay = yearNo(s, now - VAL.vaktByte * HOUR); // vaktdygnet är kalenderns dygn, förskjutet så att det byts kl. 7
  if (guardDay !== s.lastGuardDay) {
    // välj nattens vakt (modigast med lite slump) bland de vuxna som orkar (den sjuka, svaga eller skadade sover, needs), byts varje natt
    const adults = living(s).filter(q => ageOf(q, now) >= ALDER.vaktFran && ageOf(q, now) < ALDER.vaktTill && !isSick(q, now) && halsa(q) >= KROPP.svag && kanGa(q) && !vilaHellre(q) && q.task?.act !== 'strid'); // inte den som slåss (strid.ts)
    if (adults.length) {
      s.lastGuardDay = guardDay;
      // ett slumptal per vuxen i byns ordning, sedan den högsta (inte i sorteringens jämförelser: deras antal beror på webbläsaren)
      let g = adults[0], gk = -Infinity;
      for (const q of adults) { const k = q.pot.mod + rnd(s, 'val') * VAL.vaktSlump; if (k > gk) { gk = k; g = q; } }
      avbryt(s, g); g.guardDay = guardDay; // det vakten bar läggs ner där hen står
    }
  }
  if (p.guardDay === guardDay && a >= ALDER.vaktFran) { set(v, 'vakt', 'Håller vakt i natt'); return; }
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
