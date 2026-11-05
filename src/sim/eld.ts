import { allaBarn } from './uppvaxt';
import { kronikaBer, personFalt } from './berattelser';
import { addTo, amountOf, avbryt, fetchSpot, takeLimit, use } from './lager';
import { Behov, getable, takeMaterial } from './behov';
import { Del, addDel } from './egendom';
import { coldOf, hardVinter, temperature, vaderNu, VADER } from './vader';
import { MOTGANG } from './motgang';
import { isWall, roomAt } from './byggnad';
import { ALDER, KROPP, ageOf, count, doingAct, gjort, isSick, living, log, stat, think } from './folk';
import { halsa } from './halsa';
import { flintFactor, flintorOchYxor, stoneDist, takeFrom } from './fynd';
import { observe } from './minne';
import { eldPlats } from './karta';
import { tileOf } from './mark';
import { moodOf } from './humor';
import { duty } from './seder';
import { RESERV, kunnighet } from './ekonomi';
import { chance, clamp, rnd } from './slump';
import { ARSTID, ageIndex, iIstiden, isLight } from './tid';
import { SNABBARE } from './handlingar';
import { Act, DAY, Fire, FireLog, GREN, HEARTHS, HOUR, HOUR_S, IGNITERS, Person, SEC, State, Task, W, H } from './typer';
import { balans } from './balans';
import { num } from './format';
import { brasaSten, vedPerEld, BRASA } from './brasor';
import { iVattnetNu } from './sjo';

// ---------- balanstal (regel 8) ----------
// Elden: hur stark den är, vad var och en vill ha på den, hur den tänds och fylls på, och hur tändmaterial, stenar och flinta
// samlas. Mängder är i förrådets enheter (ved), tider i timmar och dygn (år i spelet). Hur mycket hö och grenar byn vill ha
// i förrådet står i RESERV (ekonomi.ts), eldstädernas bränsle och tänddonens chans i HEARTHS och IGNITERS (typer.ts)
export const ELD = balans('eld', {
  // styrkan och värmen
  styrkaFaktor: 1.4, styrkaMin: 0.15, // styrkan är bränslet delat med eldstadens max gånger Faktor, minst Min (1 = full eld)
  radieMin: 0.5, radieStyrka: 0.5, // värmen når Min + Styrka gånger styrkan av eldstadens radie
  glodTim: 1, // glöden lever så här länge efter att elden slocknat (timmar)
  kolMin: 1, kolSpann: 4, // glöden lämnar efter sig Min till Min + Spann - 1 kol ...
  kolDygn: 3, // ... som ligger så här länge (dygn)
  // vad var och en vill ha på elden (fireWish): det högsta av
  onskaFryser: 1.2, onskaKyla: 2.4, // egen köld: (1 - värmen) gånger Fryser plus kylan ute gånger Kyla
  onskaEmpati: 10, onskaGemBas: 0.6, onskaGem: 0.4, // att andra fryser: byns frysande gånger empatin delad med Empati gånger (Bas + Sammanhållning gånger seden)
  trivsDag: 0.12, trivsNatt: 0.55, trivsMood: 1.5, trivsMin: 0.4, // en trivsam eld, mest i mörkret och för den som mår dåligt
  slocknaFran: 11, slocknaSpann: 9, slocknaForsBas: 0.6, slocknaFors: 0.4, slocknaVikt: 0.14, // att elden inte ska slockna: den kloka, när den är svår att tända, och den försiktiga byn
  forstaEld: 0.3, forstaBas: 0.6, forstaNyfiken: 25, // byn har aldrig haft eld: den nyfikna vill ha en
  byFryser: 0.6, // en invånare vars värme är under detta räknas som frysande när byns köld räknas
  // fylla på
  hamtaMin: 0.5, // minst så mycket ved måste finnas (i byn och hos den som hämtar) för att någon ska hämta
  hamtaTim: 1, // den som hämtar ved har en timme på sig
  fyllMarg: 2, fyllPlus: 0.2, // någon hämtar ved när hens önskan är över bränslet gånger Marg plus Plus
  valjPlikt: 0.4, valjAvstand: 25, valjVakt: 0.3, valjBrus: 0.1, // vem som hämtar: önskan gånger (Plikt + pliktkänslan), minus avståndet delat med Avstand, plus Vakt för en vakt, plus slump
  // tända
  ring: 6, // stenar i ringen runt eldplatsen
  tandBransle: 2, // bränsle som läggs i när elden tänds
  tandVedMin: 1, // minst så mycket bränsle krävs för att tända
  tandVill: 0.1, tandKandidat: 0.05, // någon tänder när byns önskan är över Vill gånger eldstadens max; den som tänder har själv över Kandidat
  tandFlit: 2, tandBrus: 3, // vem som tänder: hantverket plus flit delad med Flit plus slump gånger Brus
  tandTim: 3, // den som ska tända har tre timmar på sig
  tandBas: 0.5, tandSkill: 20, tandInt: 40, // chansen att lyckas: tänddonets gånger (Bas + hantverket / Skill + intelligensen / Int) ...
  tandKol: 1.5, // ... gånger Kol på en gammal kolhög, gånger tidsåldern, och gånger 1 plus (misslyckade försök - 1) / ForsokLara
  forsokLara: 10, // efter så här många misslyckade försök sedan elden brann är chansen dubbelt så stor
  flintSprack: 0.004, // chansen att flintan spricker vid ett misslyckat försök
  tandGlad: 0.15, tandGladDygn: 0.5, // glädjen över att tända elden och hur länge den varar (dygn)
  // samla tändmaterial, stenar och flinta (forageItems): per arbetstimme gånger kunnigheten
  hoTakt: 3, // hö (gånger tidsålderns ARSTID.hoPerTid)
  grenarTakt: 3, // grenar (gånger ARSTID.grenarIstid i istiden)
  stenTakt: 0.8, // stenar till eldringen ...
  stenNara: 1, stenNaraDel: 3, // ... gånger Nara dit stenarna ligger inom så många rutor ...
  stenMedel: 3, stenMedelDel: 1.5, // ... Del inom så många ...
  stenAnnars: 0.4, // ... och annars
  flintaMax: 4, // byn letar inte flinta när den har så här många flintor och yxor
  flintaTakt: 0.04, // flinta: chans per arbetstimme gånger hur lätt den är att hitta på platsen (flintFactor)
  flintaOkand: 0.4, // hur lätt den är att hitta när platsen inte är känd
  flintaStenar: 2, flintaSand: 1, // över Stenar är det vid stenarna (och platsen läggs på minnet), över Sand i sanden vid stranden
});

// ---------- eldarna (steg 4.5.6.8) ----------
// Lägereldarna är ett register: den första (s.fire) och de som byggts till (s.eldar, brasor.ts). Alla är samma sak: samma
// stenring, bild, värme, tändning, påfyllning, glöd, kolhög och flik. Det enda som skiljer är att byns mitt (eldPlats i
// karta.ts: lägret, byns gräns, fälten) räknas från den första, och att den första kan flyttas (eldflytt.ts).
// Funktionerna här tar en eld f, och den första när ingen anges. En lägereld till har sitt nummer i id (task.ref för den som
// eldar, tänder eller hämtar kol vid den); den första har inget.
export function newFire(): Fire {
  return { hearth: 'lagereld', fuel: 0, lit: false, burned: 0, totalBurned: 0, litSec: 0, lightings: 0, outs: 0, tries: 0, tryTotal: 0, tryProg: 0, fills: {}, log: [] };
}
const ENSAM: Fire[] = [];
// alla lägereldar, den första först
export const eldarOf = (s: State): Fire[] => s.eldar?.length ? [s.fire, ...s.eldar] : (ENSAM[0] = s.fire, ENSAM.length = 1, ENSAM);
// lägerelden med numret id (den första när id saknas); undefined om den tagits isär
export const eldById = (s: State, id?: number) => id === undefined ? s.fire : s.eldar?.find(f => f.id === id);
// var elden står (rutan)
export const eldXY = (s: State, f: Fire) => f === s.fire ? eldPlats(s) : f.at!;
// elden i en mening: den första är "elden", de andra "en lägereld"
const eldOrd = (s: State, f: Fire, bestamd = 'elden') => f === s.fire ? bestamd : 'en lägereld';
// en lägereld brinner inom r rutor från (x, y) (vargarna håller sig undan, varg.ts)
export const brinnerNara = (s: State, x: number, y: number, r: number) => eldarOf(s).some(f => { const e = eldXY(s, f); return f.lit && Math.hypot(x - e.x - 0.5, y - e.y - 0.5) < r; });

// ---------- eld ----------
export const hearthOf = (f: Fire) => HEARTHS.find(h => h.id === f.hearth) ?? HEARTHS[0];
export const igniterOf = (s: State) => IGNITERS.find(i => amountOf(s, i.id) >= 1);
// bränsle i förrådet räknat i ved: ved och grenar
export const fuelStock = (s: State) => amountOf(s, 'ved') + amountOf(s, 'grenar') * GREN;
// Elden ägs av hela byn, men veden följer ägandet: man eldar med byns och sin egen. fran = den man stjäl av (behov.ts)
// bränslet p får elda med, räknat i ved
export const fuelFor = (s: State, p: Person, fran?: Person) => takeLimit(s, 'ved', p, fran) + takeLimit(s, 'grenar', p, fran) * GREN;
// ta bränsle ur förrådet, ved först och sedan grenar; ger hur mycket som togs
// p = den som tar det: byns ved först, sedan sin egen (egendom.ts). ag får vems bränslet var, räknat i ved
export function takeFuel(s: State, n: number, p?: Person, ag?: Del, fran?: Person) {
  const v = Math.min(n, takeLimit(s, 'ved', p, fran));
  const w = use(s, p, 'ved', v, true, fran?.id);
  const g = Math.min(Math.floor(takeLimit(s, 'grenar', p, fran) + 1e-9), Math.ceil((n - v) / GREN - 1e-9)); // hela grenar (steg 3.6.13)
  if (g > 0) { const d = use(s, p, 'grenar', g, true, fran?.id); if (ag) addDel(ag, d, GREN); }
  if (ag) addDel(ag, w);
  return v + g * GREN;
}
// bränsle som inte fick plats går tillbaka till förrådet som grenar
export const giveBack = (s: State, n: number) => { if (n > 0) addTo(s, 'grenar', n / GREN); };
function fireLog(s: State, e: Omit<FireLog, 't'>, f = s.fire) { f.log.push({ t: s.now, ...e }); if (f.log.length > 80) f.log.splice(0, f.log.length - 80); }
export const emberOn = (s: State, f = s.fire) => !f.lit && f.emberUntil !== undefined && f.emberUntil > s.now;
// eldens styrka 0–1 efter hur mycket ved som brinner
export const eldStyrka = (fuel: number, h = HEARTHS[0]) => clamp(fuel / h.maxFuel * ELD.styrkaFaktor, ELD.styrkaMin, 1);
export function fireHeat(s: State, f = s.fire) { return f.lit ? eldStyrka(f.fuel, hearthOf(f)) : 0; }
// hur långt värmen når från en eld med styrkan I
export const radieAv = (s: State, I: number) => hearthOf(s.fire).radius * (ELD.radieMin + ELD.radieStyrka * I);
export function heatRadius(s: State, f = s.fire) { return radieAv(s, fireHeat(s, f)); }
const varmeFran = (I: number, r: number, fx: number, fy: number, x: number, y: number) => { const d = Math.hypot(x - fx, y - fy); return d >= r ? 0 : I * (1 - d / r); };
// värmen på platsen: från den lägereld som värmer mest där (steg 2.9.1)
export function heatAt(s: State, x: number, y: number) {
  let v = 0;
  for (const f of eldarOf(s)) { const I = fireHeat(s, f); if (I) { const e = eldXY(s, f); v = Math.max(v, varmeFran(I, radieAv(s, I), e.x + 0.5, e.y + 0.5, x, y)); } }
  return v;
}
// hur mycket ved som önskas på elden just nu (den som vill ha mest)
export const fireWant = (s: State) => s.fire.want ?? 0;
export interface Wish { v: number; why: string }
const relightHard = (s: State) => 1 - (igniterOf(s) ?? IGNITERS[0]).chance;
// varje invånares egen önskan om ved på elden; vc = hur mycket byn fryser 0–1
function fireWish(s: State, p: Person, vc: number): Wish {
  const light = isLight(s.now), cold = coldOf(temperature(s)), sd = s.seder.v;
  const opts: Wish[] = [
    { v: clamp((1 - p.warm) * ELD.onskaFryser + cold * ELD.onskaKyla, 0, 1), why: p.warm < 0.5 ? 'Fryser och vill ha mer värme' : 'Det är kallt och hen vill hålla värmen' },
    { v: clamp(vc * (p.pot.empati / ELD.onskaEmpati) * (ELD.onskaGemBas + ELD.onskaGem * sd.gemenskap), 0, 1), why: 'Andra i byn fryser' },
    { v: (light ? ELD.trivsDag : ELD.trivsNatt) * clamp(ELD.trivsMood - moodOf(p, s.now), ELD.trivsMin, 1), why: light ? 'Vill ha en trivsam eld' : 'Vill ha en trivsam eld att samlas kring i mörkret' },
    { v: clamp((p.pot.intelligens - ELD.slocknaFran) / ELD.slocknaSpann, 0, 1) * relightHard(s) * (ELD.slocknaForsBas + ELD.slocknaFors * sd.forsiktighet) * ELD.slocknaVikt, why: 'Vill inte att elden slocknar, den är svår att tända igen' },
  ];
  if (!s.fire.lightings) opts.push({ v: ELD.forstaEld * (ELD.forstaBas + p.pot.nyfikenhet / ELD.forstaNyfiken), why: 'Byn har aldrig haft eld' });
  const b = opts.reduce((a, o) => (o.v > a.v ? o : a));
  return { v: b.v * hearthOf(s.fire).maxFuel, why: b.why };
}
// tändmaterial som invånarna vill ha i förrådet
const tinderWant = (s: State) => (s.fire.lit ? RESERV.tandVill : RESERV.tandVillSlocknad);
// hö eller grenar räcker inte till det byn vill ha, med det den som samlar redan bär (tk)
export const tinderShort = (s: State, tk?: Task) => amountOf(s, 'torrgras') + (tk?.items?.torrgras ?? 0) < tinderWant(s) || amountOf(s, 'grenar') + (tk?.items?.grenar ?? 0) < tinderWant(s);
// den första elden läggs i en ring av stenar; ringen ligger kvar när elden slocknat. Stenar behövs också till en lägereld till (brasor.ts).
// Stenarna som någon bär hem räknas, så att ingen samlar fler än ringen behöver
const stenarHem = (s: State) => living(s).reduce((n, q) => n + (q.task?.items?.sten ?? 0), 0);
export const needStones = (s: State) => !s.fire.ring && amountOf(s, 'sten') + stenarHem(s) < ELD.ring || brasaSten(s);
// kan elden tändas (av p: med det p kan få, behov.ts)? Bränslet räknas efter att grenarna till tändningen tagits (tryLight)
export function canLight(s: State, p?: Person, f = s.fire) {
  const ig = igniterOf(s), has = (k: string) => p ? getable(s, p, k) : amountOf(s, k);
  if (!ig) return false;
  const pinnar = has('grenar') >= ig.sticks; // annars ersätter kol grenarna
  return (!!f.ring || has('sten') >= ELD.ring) && has('torrgras') >= ig.grass && (pinnar || has('kol') >= 1) && (p ? fuelFor(s, p) : fuelStock(s)) - (pinnar ? ig.sticks * GREN : 0) >= ELD.tandVedMin;
}
export function needTinder(s: State) {
  return !s.fire.lit && !emberOn(s) && (amountOf(s, 'flinta') < 1 || needStones(s) || amountOf(s, 'torrgras') < RESERV.tandBrist || amountOf(s, 'grenar') < RESERV.tandBrist);
}
function durText(sec: number) { const h = sec / HOUR_S; return h >= 24 ? `${num(h / 24)} dygn` : h >= 1 ? `${Math.round(h)} timmar` : `${Math.round(sec / 60)} minuter`; }
function lightFire(s: State, p: Person, f: Fire) {
  const start = takeFuel(s, ELD.tandBransle, p), onCoal = (f.ash ?? 0) >= 1;
  Object.assign(f, { lit: true, fuel: start, litAt: s.now, litBy: p.id, burned: 0, emberUntil: undefined, tryProg: 0 });
  f.lightings++;
  if (!f.ring) { takeMaterial(s, p, 'sten', ELD.ring, true); f.ring = true; log(s, `${p.name} lade en ring av stenar runt eldplatsen.`, 'world', [p.id]); }
  if (onCoal) { f.ash = 0; f.ashUntil = undefined; } // kolet i den gamla högen tar fyr och blir en del av den nya elden
  fireLog(s, { k: 'tänd', id: p.id, n: f.tries }, f);
  log(s, `${p.name} lyckades tända ${eldOrd(s, f)}${onCoal ? ' på den gamla kolhögen' : ''}${f.tries > 1 ? ` efter ${f.tries} försök` : ''}.`, 'world', [p.id]);
  think(p, 'Tände elden', ELD.tandGlad, s.now, ELD.tandGladDygn * DAY);
  if (f !== s.fire) count(s, 'brasaTand'); // en lägereld till (brasor.ts)
  if (f === s.fire && f.lightings === 1) { p.fame.push('Tände byns första eld'); allaBarn(s, 'uppfinning', 'tände sin första eld'); kronikaBer(s, 'k_forstaEld', p.id, personFalt(p)); }
  f.tries = 0;
}
// Varje misslyckat försök sedan elden senast brann gör nästa lättare: man får kläm på det och tändmaterialet blir
// varmt och torrt. Efter ELD.forsokLara försök är chansen dubbelt så stor, så att otur inte kan hålla elden släckt i dygn
// ett försök att tända med det bästa tänddonet i förrådet
export function tryLight(s: State, p: Person, f = s.fire) {
  const ig = igniterOf(s)!;
  takeMaterial(s, p, 'torrgras', ig.grass, true);
  if (getable(s, p, 'grenar') >= ig.sticks) takeMaterial(s, p, 'grenar', ig.sticks, true);
  else takeMaterial(s, p, 'kol', 1, true); // lite kol kan ersätta grenarna

  f.tries++; f.tryTotal++; gjort(s, p, 'tandForsok');
  // eldandet är ingen egen färdighet (steg 3.10.8): chansen räknas ur hantverket, och ingen övar av att tända eller fylla på
  const c = ig.chance * (ELD.tandBas + p.skill.hantverk / ELD.tandSkill + stat(p, 'intelligens', s.now) / ELD.tandInt) * (iIstiden(ageIndex(s)) ? ARSTID.tandIstid : 1) * ((f.ash ?? 0) >= 1 ? ELD.tandKol : 1) // en gammal kolhög tar lättare fyr
    * (1 + (f.tries - 1) / ELD.forsokLara); // varje misslyckat försök sedan elden brann gör nästa lättare
  if (rnd(s, 'eld', p) < c) { gjort(s, p, 'tande'); lightFire(s, p, f); return true; }
  if (ig.id === 'flinta' && rnd(s, 'eld', p) < ELD.flintSprack) {
    use(s, p, 'flinta', 1, true); fireLog(s, { k: 'sprack', id: p.id }, f);
    log(s, `Flintan som ${p.name} slog med sprack.`, 'world', [p.id]);
  }
  return false;
}
export function takeCoal(s: State, p: Person, verb: string, f = s.fire) {
  const n = f.ash ?? 0;
  if (n < 1) return;
  addTo(s, 'kol', n);
  f.ash = 0; f.ashUntil = undefined;
  log(s, `${p.name} ${verb} ${n} kol ur den gamla elden och lade dem i förrådet.`, 'world', [p.id]);
}
export function addFuel(s: State, p: Person, n: number, f = s.fire) {
  const h = hearthOf(f);
  if (!f.lit && !emberOn(s, f)) { giveBack(s, n); return; } // elden hann slockna: bränslet går tillbaka
  if (!f.lit) {
    f.lit = true; f.emberUntil = undefined;
    fireLog(s, { k: 'glöd', id: p.id }, f);
    log(s, `${p.name} blåste liv i glöden och ${eldOrd(s, f, 'elden').replace('en lägereld', 'lägerelden')} brinner igen.`, 'world', [p.id]);
  }
  const put = Math.min(n, h.maxFuel - f.fuel);
  f.fuel += put; giveBack(s, n - put);
  f.fills[p.id] = (f.fills[p.id] ?? 0) + 1;
  fireLog(s, { k: 'fyll', id: p.id, n: put }, f);
}
function assign(s: State, p: Person, act: Act, tx: number, ty: number, dur: number, why: string) {
  avbryt(s, p); // bördan läggs ner där hen står, den försvinner inte
  p.task = { act, phase: 'go', tx, ty, until: s.now + dur, carry: 0, why, dark: !isLight(s.now) };
}
// p går till förrådet efter en famn ved och sedan till elden (steg.ts). fran = den andras ved (stöld, behov.ts)
export function fetchFuel(s: State, p: Person, why: string, fran?: Person) {
  if (doingAct(s, 'elda')) return; // en i taget (bland de levande)
  const at = fetchSpot(s, takeLimit(s, 'ved', p, fran) >= 1 ? 'ved' : 'grenar');
  assign(s, p, 'elda', at.x, at.y, ELD.hamtaTim * HOUR, why);
  if (fran) p.task!.fran = fran.id;
}
const awake = (s: State, p: Person, minAge: number) => {
  const t = p.task;
  return ageOf(p, s.now) >= minAge && !isSick(p, s.now) && halsa(p) >= KROPP.svag &&
    (!t || (t.act !== 'sova' && t.act !== 'gomma' && !(t.phase === 'back' && t.carry > 0) && !t.items)); // den som gömmer sig för vargarna går inte ut till elden
};
// så mycket fortare än vanligt elden brinner nu, två faktorer: i regnet brinner en eld ute fortare (steg 2.11.1; en eld under
// tak gör det inte), och i en hård vinter äter elden mer (steg 3.8.1). Fliken Elden visar samma
export function eldFaktor(s: State, f = s.fire) {
  const e = eldXY(s, f);
  const regn = vaderNu(s).sno || roomAt(s, e.x + 0.5, e.y + 0.5) ? 0 : vaderNu(s).nb;
  return [1 + regn * VADER.regnEld, 1 + MOTGANG.hardVed * hardVinter(s)] as const;
}
// en eld brinner, slocknar, glöder och lämnar en kolhög
function brinner(s: State, f: Fire, dtSec: number) {
  const h = hearthOf(f), now = s.now;
  if (f !== s.fire && f.lit && s.flod) { const e = f.at!; if (iVattnetNu(s, e.y * W + e.x)) { f.fuel = 0; count(s, 'flod brasa'); } } // vattnet släcker den (steg 3.8.7, flod.ts gör det för den första)
  if (f.lit) {
    const [fr, fv] = eldFaktor(s, f);
    const b = Math.min(f.fuel, h.burn / HOUR_S * dtSec * fr * fv);
    f.fuel -= b; f.burned += b; f.totalBurned += b; f.litSec += dtSec;
    if (f.fuel <= 1e-6) {
      f.fuel = 0; f.lit = false; f.emberUntil = now + ELD.glodTim * HOUR; f.outs++; f.ut = now;
      fireLog(s, { k: 'slocknade', n: f.burned }, f);
      log(s, `${f === s.fire ? 'Elden' : 'En lägereld'} slocknade efter att ha brunnit i ${durText((now - (f.litAt ?? now)) / SEC)}. Glöden lever en stund till.`, 'world');
    }
  }
  if (f.emberUntil !== undefined && !f.lit && f.emberUntil <= now) {
    // glöden dog: kvar blir en svart hög med lite kol, som ligger några dygn
    f.emberUntil = undefined;
    // kolet blir alltid ett litet, slumpat antal; hämtar ingen det förtvinar det efter några dygn
    const coal = ELD.kolMin + Math.floor(rnd(s, 'eld') * ELD.kolSpann);
    f.ash = (f.ash ?? 0) + coal; f.ashUntil = now + ELD.kolDygn * DAY;
    log(s, `${f === s.fire ? 'Elden' : 'En lägereld'} har brunnit ut. Kvar ligger en svart hög med ${coal} kol.`, 'world');
  }
  if (f.ash && (f.ashUntil ?? 0) <= now) { f.ash = 0; f.ashUntil = undefined; }
}
type Kand = { p: Person; w: Wish };
// vem som fyller på elden f: den som vill ha klart mer ved än det som ligger på, plikttrogna och nära först
function fyllare(s: State, f: Fire, cands: Kand[]) {
  const h = hearthOf(f), e = eldXY(s, f), fx = e.x + 0.5, fy = e.y + 0.5;
  let best: Kand | undefined, bs = -1e9;
  for (const c of cands) {
    if (c.w.v < f.fuel * ELD.fyllMarg + ELD.fyllPlus || fuelFor(s, c.p) < ELD.hamtaMin) continue; // bara den som har ved att ta (byns eller sin egen)
    const sc = (c.w.v - f.fuel) / h.maxFuel * (ELD.valjPlikt + duty(s, c.p)) - Math.hypot(c.p.x - fx, c.p.y - fy) / ELD.valjAvstand + (c.p.task?.act === 'vakt' ? ELD.valjVakt : 0) + rnd(s, 'eld') * ELD.valjBrus;
    if (sc > bs) { bs = sc; best = c; }
  }
  return best;
}
// vem som tänder elden f: ett slumptal per kandidat i ordning, sedan den bästa (inte i sorteringens jämförelser: deras antal beror på webbläsaren)
function tandare(s: State, f: Fire, cands: Kand[]) {
  const h = hearthOf(f);
  let c: Kand | undefined, ck = -Infinity;
  for (const o of cands) {
    if (ageOf(o.p, s.now) < ALDER.ansvar || o.w.v < h.maxFuel * ELD.tandKandidat || !canLight(s, o.p, f)) continue;
    const k = o.p.skill.hantverk + stat(o.p, 'flit', s.now) / ELD.tandFlit + rnd(s, 'eld') * ELD.tandBrus;
    if (k > ck) { ck = k; c = o; }
  }
  return c;
}
// där man sitter vid elden (för att tända den, hämta kolet): framför den, och står den vid vattnet eller en vägg bakom eller bredvid den
export function vidEld(s: State, f: Fire, dx: number, dy: number) {
  const e = eldXY(s, f);
  for (const [x, y] of [[e.x + 0.5 + dx, e.y + dy], [e.x + 0.5 + dx, e.y - 0.3], [e.x - 0.3, e.y + 0.5], [e.x + 1.3, e.y + 0.5]]) {
    const tx = Math.floor(x), ty = Math.floor(y);
    if (tx >= 0 && ty >= 0 && tx < W && ty < H && !iVattnetNu(s, ty * W + tx) && !isWall(s, x, y)) return { x, y };
  }
  return { x: e.x + 0.5 + dx, y: e.y + dy };
}
const tandPlats = (s: State, f: Fire) => vidEld(s, f, (rnd(s, 'eld') - 0.5) * 1.2, 1.3);
export function stepFire(s: State, dtSec: number, ppl: Person[]) {
  const f = s.fire, h = hearthOf(f);
  for (const e of eldarOf(s)) brinner(s, e, dtSec);
  // vilja: varje vaken invånare vill ha olika mycket ved på elden
  const vc = ppl.reduce((a, p) => a + clamp(ELD.byFryser - p.warm, 0, ELD.byFryser) / ELD.byFryser, 0) / (ppl.length || 1);
  const cands: Kand[] = [];
  let top: Kand | undefined;
  for (const p of ppl) {
    if (!awake(s, p, ALDER.hjalper)) continue;
    const c = { p, w: fireWish(s, p, vc) };
    cands.push(c);
    if (!top || c.w.v > top.w.v) top = c;
  }
  f.want = top?.w.v ?? 0; f.wantBy = top?.p.id; f.wantWhy = top?.w.why;
  // de andra lägereldarna (steg 4.5.6.8): önskan om ved på dem är det högsta någon av dem som sover närmast vill ha
  const fler = s.eldar?.length ? s.eldar : undefined, folkAv = (e: Fire) => cands.filter(c => e.folk?.includes(c.p.id));
  if (fler) for (const e of fler) {
    let t: Kand | undefined;
    for (const c of folkAv(e)) if (!t || c.w.v > t.w.v) t = c;
    e.want = t?.w.v ?? 0; e.wantBy = t?.p.id; e.wantWhy = t?.w.why;
  }
  // påfyllning: en i taget i byn, den första elden först. När bränslet tryter (BRASA.slackDygn) fylls bara den första på
  if (fuelStock(s) >= ELD.hamtaMin && !ppl.some(p => p.task?.act === 'elda')) {
    const best = f.lit || emberOn(s) ? fyllare(s, f, cands) : undefined;
    if (best) fetchFuel(s, best.p, best.w.why);
    else if (fler && vedPerEld(s, 0) >= BRASA.slackDygn) for (const e of fler) {
      if (!e.lit && !emberOn(s, e)) continue;
      const b = fyllare(s, e, folkAv(e));
      if (b) { fetchFuel(s, b.p, b.w.why); if (b.p.task?.act === 'elda') b.p.task.ref = e.id; break; }
    }
  }
  // tändning: när elden är släckt och någon vill ha eld försöker en person i taget
  if (!ppl.some(p => p.task?.act === 'tanda')) {
    if (!f.lit && !emberOn(s) && canLight(s) && f.want >= h.maxFuel * ELD.tandVill) {
      const c = tandare(s, f, cands);
      if (c) { const at = tandPlats(s, f); assign(s, c.p, 'tanda', at.x, at.y, ELD.tandTim * HOUR, `Vill ha eld. ${c.w.why}`); }
    } else if (fler && vedPerEld(s, 0) >= BRASA.slackDygn) for (const e of fler) {
      if (e.lit || emberOn(s, e) || !canLight(s, undefined, e) || e.want! < h.maxFuel * ELD.tandVill || s.flod && iVattnetNu(s, e.at!.y * W + e.at!.x)) continue;
      const c = tandare(s, e, folkAv(e));
      if (c) { const at = tandPlats(s, e); assign(s, c.p, 'tanda', at.x, at.y, ELD.tandTim * HOUR, `Vill ha eld vid lägerelden nära sovplatsen. ${c.w.why}`); c.p.task!.ref = e.id; break; }
    }
  }
}
// samling hittar tändmaterial, sten och flinta när förrådet behöver det
// fart: hö och grenar växer på platsen och hittas lika mycket fortare som det man samlar (steg 2.12.4); stenar och flinta letar man efter
export function forageItems(s: State, p: Person, dtSec: number, fart = 1): Record<string, number> | undefined {
  const ai = ageIndex(s), want = tinderWant(s), hrs = dtSec / HOUR_S * SNABBARE, vaxer = hrs * fart; // allt man skaffar går fortare sedan steg 1.5.13
  const sk = kunnighet(p.skill.samla);
  const got: Record<string, number> = {};
  const bar = (k: string) => amountOf(s, k) + (p.task?.items?.[k] ?? 0); // det man redan bär räknas, så att ingen bär hem mer än byn vill ha
  if (bar('torrgras') < want || p.task?.hamtar === 'torrgras') got.torrgras = ELD.hoTakt * ARSTID.hoPerTid[ai] * sk * vaxer;
  if (bar('grenar') < want || p.task?.hamtar === 'grenar') got.grenar = ELD.grenarTakt * (iIstiden(ai) ? ARSTID.grenarIstid : 1) * sk * vaxer;
  // stenar till eldringen: många vid stenarna, några i sanden, få annars
  if (needStones(s)) {
    const d = p.task ? stoneDist(s.seed)[tileOf(p.task.tx, p.task.ty)] : 9;
    got.sten = ELD.stenTakt * (d <= ELD.stenNara ? ELD.stenNaraDel : d <= ELD.stenMedel ? ELD.stenMedelDel : ELD.stenAnnars) * sk * hrs;
  }
  // flinta är ovanlig och hittas oftast vid stenarna. Den slås mot en sten för att tända eld, och med en pinne blir den en yxa
  const ff = p.task ? flintFactor(s, p.task.tx, p.task.ty) : ELD.flintaOkand;
  if (flintorOchYxor(s) < ELD.flintaMax && chance(s, ELD.flintaTakt * ff * sk * SNABBARE / HOUR_S, dtSec, 'arbete', p)) {
    got.flinta = 1; count(s, ff > ELD.flintaStenar ? 'flintaSten' : 'flintaAnnan');
    if (p.task) takeFrom(s, 'flinta', p.task.tx, p.task.ty, 1);
    if (ff > ELD.flintaStenar && p.task) observe(s, p, 'flinta', p.task.tx, p.task.ty);
    log(s, `${p.name} hittade en flintsten${ff > ELD.flintaStenar ? ' vid stenarna' : ff > ELD.flintaSand ? ' i sanden vid stranden' : ''}.`, 'world', [p.id]);
  }
  return Object.keys(got).length ? got : undefined;
}
// så många dygn bränslet i förrådet räcker
export function woodDays(s: State) { return fuelStock(s) / (hearthOf(s.fire).burn * 24); }

// ---------- ved till elden ----------
// Den enkla eldstaden ägs av hela byn, men veden följer det vanliga ägandet: man eldar med byns ved och sin egen
// (vem som hämtar väljs längre upp i filen, bland dem som har ved att ta). Den som fryser när elden behöver mer ved och inte har
// någon ber om den som gåva, och stjäl först när kylan håller på att döda hen: hen hämtar då den andras ved till elden.
export const VED: Behov = {
  id: 'ved', namn: 'ved', slag: ['ved', 'grenar'], per: { grenar: GREN }, minst: 0.5,
  mangd: () => 1, // en famn
  kvar: 3, // så mycket ved som brinner på sex timmar
  behover: (s, p) => p.warm < KROPP.fryser && (s.fire.lit || emberOn(s)) && s.fire.fuel < fireWant(s),
  fara: (_s, p) => p.warm < KROPP.frysdod ? 1 - p.health : 0, // man fryser ihjäl när kroppsvärmen är nästan slut, och hälsan sjunker
  // stölden: p hämtar den andras ved till elden (steg.ts räknar den när den tas). Annars hämtar den som väljs längre upp
  anvand: (s, p, fran) => { if (fran && ageOf(p, s.now) >= ALDER.hjalper && p.task?.act !== 'sova') fetchFuel(s, p, 'Fryser och tar någon annans ved till elden', fran); return 0; },
};
