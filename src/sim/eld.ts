import { tal } from './ord';
import { allaBarn } from './uppvaxt';
import { kronikaBer, personFalt } from './berattelser';
import { addTo, amountOf, avbryt, fetchSpot, takeLimit, use } from './lager';
import { Materialslag, TROSKEL, forbrukat, overTak, underBuffert } from './forradsmal';
import { Behov, getable, takeMaterial } from './behov';
import { Del, addDel } from './egendom';
import { coldOf, hardVinter, temperature, vaderNu, VADER } from './vader';
import { MOTGANG } from './motgang';
import { isWall, roomAt } from './byggnad';
import { ALDER, KROPP, ageOf, count, forstaGang, gjort, isSick, living, log, stat, think } from './folk';
import { nTools } from './agande';
import { SAKER } from './saker';
import { halsa } from './halsa';
import { flintFactor, flintorOchYxor, stoneDist, takeFrom } from './fynd';
import { observe } from './minne';
import { eldPlats } from './karta';
import { groundOf, tileOf } from './mark';
import { grenFaktor } from './buskar';
import { moodOf } from './humor';
import { duty } from './seder';
import { kunnighet } from './ekonomi';
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
// i förrådet står i TROSKEL (forradsmal.ts), eldstädernas bränsle och tänddonens chans i HEARTHS och IGNITERS (typer.ts)
export const ELD = balans('eld', {
  // styrkan och värmen
  styrkaFaktor: 1.4, styrkaMin: 0.15, // styrkan är bränslet delat med eldstadens max gånger Faktor, minst Min (1 = full eld)
  radieMin: 0.5, radieStyrka: 0.5, // värmen når Min + Styrka gånger styrkan av eldstadens radie
  glodTim: 12, // glöden lever så här länge efter att elden slocknat (timmar, steg 6.3.2)
  kolMin: 1, kolSpann: 4, // glöden lämnar efter sig Min till Min + Spann - 1 kol ...
  kolDygn: 3, // ... som ligger så här länge (dygn)
  // vad var och en vill ha på elden (fireWish): det högsta av
  onskaFryser: 1.2, onskaKyla: 2.4, // egen köld: (1 - värmen) gånger Fryser plus kylan ute gånger Kyla
  onskaEmpati: 10, onskaGemBas: 0.6, onskaGem: 0.4, // att andra fryser: byns frysande gånger empatin delad med Empati gånger (Bas + Sammanhållning gånger seden)
  trivsDag: 0.12, trivsNatt: 0.55, trivsMood: 1.5, trivsMin: 0.4, // en trivsam eld, mest i mörkret och för den som mår dåligt
  vidR: 4, // den som är så här många rutor från elden, eller på väg dit, sitter vid den (den trivsamma elden räknas bara från dem, steg 6.3.1)
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
  naverChans: 1.5, // en näver i stället för höet gör chansen att lyckas så många gånger större (steg 6.3.3)
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
  if (g > 0) { const d = use(s, p, 'grenar', g, true, fran?.id); forbrukat(s, 'grenar', -g); if (ag) addDel(ag, d, GREN); } // grenarna som bränsle räknas i veden, inte som förbrukat material (steg 6.2.14)
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
// hur mycket ved som önskas på elden just nu (den som vill ha mest av dem som använder den)
export const fireWant = (s: State, f = s.fire) => f.want ?? 0;
export interface Wish { v: number; why: string }
// ---------- vem som använder vilken eld (steg 6.3.1) ----------
// Varje eld har sina egna: önskan om ved på en eld räknas bara från dem som använder just den. Det är de vakna som hör till den
// (har sin sovplats närmast den, Fire.folk i brasor.ts, eller närmast den här när ingen annan eld är närmare), och de som sitter
// vid den eller är på väg dit (ELD.vidR: den som värmer sig, samtalar, lagar mat över den). Den trivsamma elden räknas bara
// från dem vid elden. Alla eldar är lika, och den första är inte särskild
// elden p hör till: den vars sovplatser p ligger närmast (brasor.ts räknar folk för eldarna efter den första)
export const hemEld = (s: State, p: Person) => (s.eldar?.length && s.eldar.find(f => f.folk?.includes(p.id))) || s.fire;
// p sitter vid elden f eller är på väg dit
export function sitterVid(s: State, p: Person, f: Fire) {
  const e = eldXY(s, f), x = e.x + 0.5, y = e.y + 0.5, t = p.task;
  return Math.hypot(p.x - x, p.y - y) <= ELD.vidR || !!t && t.phase !== 'back' && Math.hypot(t.tx - x, t.ty - y) <= ELD.vidR;
}
// den brinnande eld p går till för att värma sig eller sitta vid: den hen hör till, annars den närmaste som brinner
export function eldFor(s: State, p: Person): Fire | undefined {
  const h = hemEld(s, p);
  if (h.lit) return h;
  let b: Fire | undefined, bd = Infinity;
  for (const f of eldarOf(s)) if (f.lit) { const e = eldXY(s, f), d = Math.hypot(p.x - e.x - 0.5, p.y - e.y - 0.5); if (d < bd) { bd = d; b = f; } }
  return b;
}
// någon eld brinner
export const nagonEld = (s: State) => eldarOf(s).some(f => f.lit);
// någon eld brinner eller glöder
export const nagonGlod = (s: State) => eldarOf(s).some(f => f.lit || emberOn(s, f));
// p:s egen önskan om ved på elden f; vc = hur mycket byn fryser 0–1. vid = p sitter vid elden eller är på väg dit
function fireWish(s: State, p: Person, vc: number, f: Fire, vid: boolean): Wish {
  const light = isLight(s.now), cold = coldOf(temperature(s)), sd = s.seder.v;
  const opts: Wish[] = [
    { v: clamp((1 - p.warm) * ELD.onskaFryser + cold * ELD.onskaKyla, 0, 1), why: p.warm < 0.5 ? 'Fryser och vill ha mer värme' : 'Det är kallt och hen vill hålla värmen' },
    { v: clamp(vc * (p.pot.empati / ELD.onskaEmpati) * (ELD.onskaGemBas + ELD.onskaGem * sd.gemenskap), 0, 1), why: 'Andra i byn fryser' },
  ];
  if (vid) opts.push({ v: (light ? ELD.trivsDag : ELD.trivsNatt) * clamp(ELD.trivsMood - moodOf(p, s.now), ELD.trivsMin, 1), why: light ? 'Vill ha en trivsam eld' : 'Vill ha en trivsam eld att samlas kring i mörkret' });
  if (!eldarOf(s).some(e => e.lightings)) opts.push({ v: ELD.forstaEld * (ELD.forstaBas + p.pot.nyfikenhet / ELD.forstaNyfiken), why: 'Byn har aldrig haft eld' });
  const b = opts.reduce((a, o) => (o.v > a.v ? o : a));
  return { v: b.v * hearthOf(f).maxFuel, why: b.why };
}
// hö eller grenar räcker inte till det byn vill ha, med det den som samlar redan bär (tk)
// (bufferten i FORRADSMAL är minst det tändmaterial byn vill ha, och mer när byn förbrukar mycket, steg 6.2.14)
export const tinderShort = (s: State, tk?: Task) => underBuffert(s, 'torrgras', tk?.items?.torrgras ?? 0) || underBuffert(s, 'grenar', tk?.items?.grenar ?? 0);
// den första elden läggs i en ring av stenar; ringen ligger kvar när elden slocknat. Stenar behövs också till en lägereld till (brasor.ts).
// Stenarna som någon bär hem räknas, så att ingen samlar fler än ringen behöver
const stenarHem = (s: State) => living(s).reduce((n, q) => n + (q.task?.items?.sten ?? 0), 0);
export const needStones = (s: State) => !s.fire.ring && amountOf(s, 'sten') + stenarHem(s) < ELD.ring || brasaSten(s);
// kan elden tändas (av p: med det p kan få, behov.ts)? Bränslet räknas efter att grenarna till tändningen tagits (tryLight)
export function canLight(s: State, p?: Person, f = s.fire) {
  const ig = igniterOf(s), has = (k: string) => p ? getable(s, p, k) : amountOf(s, k);
  if (!ig) return false;
  const pinnar = has('grenar') >= ig.sticks; // annars ersätter kol grenarna
  const naver = has('naver') >= 1, talja = !naver && kanTalja(s) && has('ved') >= 1; // nävern täljs ur en ved som annars hade brunnit
  return (!!f.ring || has('sten') >= ELD.ring) && (naver || talja || has('torrgras') >= ig.grass) && (pinnar || has('kol') >= 1) && (p ? fuelFor(s, p) : fuelStock(s)) - (pinnar ? ig.sticks * GREN : 0) - (talja && !(has('torrgras') >= ig.grass) ? 1 : 0) >= ELD.tandVedMin;
}
// en näver (steg 6.3.3) täljs ur en ved med kniv eller yxa: med ett blad och ved behövs inget hö till tändningen
export const kanTalja = (s: State) => nTools(s, 'kniv') + nTools(s, 'yxa') > 0;
const harTandning = (s: State) => amountOf(s, 'torrgras') + amountOf(s, 'naver') >= TROSKEL.tandBrist || kanTalja(s) && amountOf(s, 'ved') >= 1;
export function needTinder(s: State) {
  return !nagonGlod(s) && (amountOf(s, 'flinta') < 1 || needStones(s) || !harTandning(s) || amountOf(s, 'grenar') < TROSKEL.tandBrist);
}
function durText(sec: number) { const h = sec / HOUR_S; return h >= 24 ? `${num(h / 24)} dygn` : h >= 1 ? `${Math.round(h)} timmar` : `${Math.round(sec / 60)} minuter`; }
function lightFire(s: State, p: Person, f: Fire) {
  const start = takeFuel(s, ELD.tandBransle, p), onCoal = (f.ash ?? 0) >= 1;
  Object.assign(f, { lit: true, fuel: start, litAt: s.now, litBy: p.id, burned: 0, emberUntil: undefined, tryProg: 0 });
  f.lightings++;
  if (!f.ring) { takeMaterial(s, p, 'sten', ELD.ring, true); f.ring = true; log(s, `${p.name} lade en ring av stenar runt eldplatsen.`, 'world', [p.id]); }
  if (onCoal) { f.ash = 0; f.ashUntil = undefined; } // kolet i den gamla högen tar fyr och blir en del av den nya elden
  fireLog(s, { k: 'tänd', id: p.id, n: f.tries }, f);
  log(s, `${p.name} lyckades tända ${eldOrd(s, f)}${onCoal ? ' på den gamla kolhögen' : ''}${f.tries > 1 ? ` efter ${tal(f.tries, true)} försök` : ''}.`, 'world', [p.id]);
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
  // en näver ersätter höet (steg 6.3.3); finns ingen täljs fyra ur en ved med kniven eller yxan
  if (getable(s, p, 'naver') < 1 && getable(s, p, 'torrgras') < ig.grass && kanTalja(s) && getable(s, p, 'ved') >= 1) taljaNaver(s, p);
  const naver = getable(s, p, 'naver') >= 1;
  if (naver) takeMaterial(s, p, 'naver', 1, true);
  else takeMaterial(s, p, 'torrgras', ig.grass, true);
  if (getable(s, p, 'grenar') >= ig.sticks) takeMaterial(s, p, 'grenar', ig.sticks, true);
  else takeMaterial(s, p, 'kol', 1, true); // lite kol kan ersätta grenarna

  f.tries++; f.tryTotal++; gjort(s, p, 'tandForsok');
  // eldandet är ingen egen färdighet (steg 3.10.8): chansen räknas ur hantverket, och ingen övar av att tända eller fylla på
  const c = ig.chance * (ELD.tandBas + p.skill.hantverk / ELD.tandSkill + stat(p, 'intelligens', s.now) / ELD.tandInt) * (iIstiden(ageIndex(s)) ? ARSTID.tandIstid : 1) * ((f.ash ?? 0) >= 1 ? ELD.tandKol : 1) // en gammal kolhög tar lättare fyr
    * (1 + (f.tries - 1) / ELD.forsokLara) // varje misslyckat försök sedan elden brann gör nästa lättare
    * (naver ? ELD.naverChans : 1); // nävern tar lättare eld än höet
  if (rnd(s, 'eld', p) < c) { gjort(s, p, 'tande'); lightFire(s, p, f); return true; }
  if (ig.id === 'flinta' && rnd(s, 'eld', p) < ELD.flintSprack) {
    use(s, p, 'flinta', 1, true); fireLog(s, { k: 'sprack', id: p.id }, f);
    log(s, `Flintan som ${p.name} slog med sprack.`, 'world', [p.id]);
  }
  return false;
}
// en ved blir fyra näver (SAKER.naver.skaffa.ger), med kniven eller yxan, när elden ska tändas (steg 6.3.3)
function taljaNaver(s: State, p: Person) {
  takeMaterial(s, p, 'ved', 1, true);
  const n = SAKER.naver!.skaffa!.ger!;
  addTo(s, 'naver', n); count(s, 'naver', n);
  if (forstaGang(s, 'naverForsta')) log(s, `${p.name} täljde näver ur en ved med ${nTools(s, 'kniv') > 0 ? 'kniven' : 'yxan'}. Nävern tar lättare eld än höet.`, 'world', [p.id]);
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
  if (!f.lit && !emberOn(s, f) || eldIVatten(s, f)) { giveBack(s, n); return; } // elden hann slockna eller står under vattnet: bränslet går tillbaka
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
// f = elden (den p hör till om ingen anges); en i taget vid varje eld
export function fetchFuel(s: State, p: Person, why: string, fran?: Person, f = hemEld(s, p)) {
  if (living(s).some(q => q.task?.act === 'elda' && q.task.ref === f.id)) return;
  const at = fetchSpot(s, takeLimit(s, 'ved', p, fran) >= 1 ? 'ved' : 'grenar');
  assign(s, p, 'elda', at.x, at.y, ELD.hamtaTim * HOUR, why);
  if (fran) p.task!.fran = fran.id;
  if (f.id !== undefined) p.task!.ref = f.id;
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
// står elden under flodens vatten (steg 3.8.7)? Där brinner den inte, glöden dör och ingen fyller på den
export function eldIVatten(s: State, f: Fire) { if (!s.flod) return false; const e = eldXY(s, f); return iVattnetNu(s, tileOf(e.x, e.y)); }
// en eld brinner, slocknar, glöder och lämnar en kolhög
function brinner(s: State, f: Fire, dtSec: number) {
  const h = hearthOf(f), now = s.now;
  const iVatten = eldIVatten(s, f);
  if (f !== s.fire && f.lit && iVatten) { f.fuel = 0; count(s, 'flod brasa'); } // vattnet släcker den (steg 3.8.7, flod.ts gör det för den första)
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
  if (iVatten && !f.lit) f.emberUntil = undefined; // under vattnet dör glöden också, så att ingen blåser liv i den där
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
  const alla = eldarOf(s);
  for (const e of alla) brinner(s, e, dtSec);
  // vilja: varje vaken invånare vill ha olika mycket ved på de eldar hen använder (steg 6.3.1)
  const vc = ppl.reduce((a, p) => a + clamp(ELD.byFryser - p.warm, 0, ELD.byFryser) / ELD.byFryser, 0) / (ppl.length || 1);
  const vakna = ppl.filter(p => awake(s, p, ALDER.hjalper)), hem = vakna.map(p => hemEld(s, p));
  const per = new Map<Fire, Kand[]>();
  for (const f of alla) {
    const cands: Kand[] = [];
    let top: Kand | undefined;
    vakna.forEach((p, i) => {
      const vid = sitterVid(s, p, f);
      if (!vid && hem[i] !== f) return;
      const c = { p, w: fireWish(s, p, vc, f, vid) };
      cands.push(c);
      if (!top || c.w.v > top.w.v) top = c;
    });
    f.want = top?.w.v ?? 0; f.wantBy = top?.p.id; f.wantWhy = top?.w.why;
    per.set(f, cands);
  }
  // den eld som flest använder först; när bränslet tryter (BRASA.slackDygn) och det finns flera eldar sköts bara den
  const ordning = alla.length > 1 ? [...alla].sort((a, b) => per.get(b)!.length - per.get(a)!.length || (a.id ?? -1) - (b.id ?? -1)) : alla;
  const skots = alla.length > 1 && vedPerEld(s, 0) < BRASA.slackDygn ? ordning.slice(0, 1) : ordning;
  // påfyllning: en i taget vid varje eld
  if (fuelStock(s) >= ELD.hamtaMin) for (const f of skots) {
    if (!(f.lit || emberOn(s, f)) || eldIVatten(s, f) || ppl.some(p => p.task?.act === 'elda' && p.task.ref === f.id)) continue;
    const b = fyllare(s, f, per.get(f)!);
    if (b) fetchFuel(s, b.p, b.w.why, undefined, f);
  }
  // tändning: när en eld är släckt och någon som använder den vill ha eld försöker en person i taget i byn
  if (!ppl.some(p => p.task?.act === 'tanda')) for (const f of skots) {
    if (f.lit || emberOn(s, f) || !canLight(s, undefined, f) || (f.want ?? 0) < hearthOf(f).maxFuel * ELD.tandVill || eldIVatten(s, f)) continue;
    const c = tandare(s, f, per.get(f)!);
    if (c) { const at = tandPlats(s, f); assign(s, c.p, 'tanda', at.x, at.y, ELD.tandTim * HOUR, `Vill ha eld. ${c.w.why}`); if (f.id !== undefined) c.p.task!.ref = f.id; break; }
  }
}
// samling hittar tändmaterial, sten och flinta när förrådet behöver det
// fart: hö och grenar växer på platsen och hittas lika mycket fortare som det man samlar (steg 2.12.4); stenar och flinta letar man efter
export function forageItems(s: State, p: Person, dtSec: number, fart = 1): Record<string, number> | undefined {
  const ai = ageIndex(s), hrs = dtSec / HOUR_S * SNABBARE, vaxer = hrs * fart; // allt man skaffar går fortare sedan steg 1.5.13
  const sk = kunnighet(p.skill.samla);
  const got: Record<string, number> = {};
  // under bufferten plockas materialet, och den som hämtar det plockar till taket men aldrig över (FORRADSMAL, steg 6.2.14)
  const plocka = (k: Materialslag) => !overTak(s, k, p.task?.items?.[k] ?? 0) && (underBuffert(s, k, p.task?.items?.[k] ?? 0) || p.task?.hamtar === k);
  if (plocka('torrgras')) got.torrgras = ELD.hoTakt * ARSTID.hoPerTid[ai] * sk * vaxer;
  if (plocka('grenar')) got.grenar = ELD.grenarTakt * (iIstiden(ai) ? ARSTID.grenarIstid : 1) * sk * vaxer * (p.task ? grenFaktor(groundOf(s), tileOf(p.task.tx, p.task.ty)) : 1); // fler vid buskarna (steg 6.5.3)
  // stenar till eldringen: många vid stenarna, några i sanden, få annars
  if (needStones(s) || plocka('sten')) {
    const d = p.task ? stoneDist(s.seed)[tileOf(p.task.tx, p.task.ty)] : 9;
    got.sten = ELD.stenTakt * (d <= ELD.stenNara ? ELD.stenNaraDel : d <= ELD.stenMedel ? ELD.stenMedelDel : ELD.stenAnnars) * sk * hrs;
  }
  // flinta är ovanlig och hittas oftast vid stenarna. Den slås mot en sten för att tända eld, och med en pinne blir den en yxa
  const ff = p.task ? flintFactor(s, p.task.tx, p.task.ty) : ELD.flintaOkand;
  if (flintorOchYxor(s) < ELD.flintaMax && !overTak(s, 'flinta', p.task?.items?.flinta ?? 0) && chance(s, ELD.flintaTakt * ff * sk * SNABBARE / HOUR_S, dtSec, 'arbete', p)) {
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
  behover: (s, p) => { const f = hemEld(s, p); return p.warm < KROPP.fryser && (f.lit || emberOn(s, f)) && f.fuel < fireWant(s, f); },
  fara: (_s, p) => p.warm < KROPP.frysdod ? 1 - p.health : 0, // man fryser ihjäl när kroppsvärmen är nästan slut, och hälsan sjunker
  // stölden: p hämtar den andras ved till elden (steg.ts räknar den när den tas). Annars hämtar den som väljs längre upp
  anvand: (s, p, fran) => { if (fran && ageOf(p, s.now) >= ALDER.hjalper && p.task?.act !== 'sova') fetchFuel(s, p, 'Fryser och tar någon annans ved till elden', fran); return 0; },
};
