import { stationsVarme } from './stationseld';
import { han } from './ord';
import { tal } from './ord';
import { allaBarn } from './uppvaxt';
import { kronikaBer, personFalt } from './berattelser';
import { addTo, amountOf, blotUttaget, avbryt, fetchSpot, iBordan, takeLimit, use, paMarken } from './lager';
import { Materialslag, forbrukat, overOchUnder, tandBuffert, underBuffert } from './forradsmal';
import { Behov, getable, takeMaterial } from './behov';
import { Del, addDel } from './egendom';
import { coldOf, hardVinter, temperature, vaderNu, VADER } from './vader';
import { MOTGANG } from './motgang';
import { isWall, roomAt } from './byggnad';
import { ligger } from './sjukdom';
import { ALDER, KROPP, ageOf, alive, count, forstaGang, gjort, living, log, stat, think } from './folk';
import { allaTing, nTools, wearTool } from './agande';
import { kroppFart } from './gang';
import { SAKER } from './saker';
import { halsa } from './halsa';
import { eldPlats } from './karta';
import { MARK, groundOf, tileOf } from './mark';
import { BAR, VAG, isSoil } from './vag';
import { hageAt } from './hage';
import { angAt } from './slatter';
import { arBuske, grenFaktor } from './buskar';
import { moodOf } from './humor';
import { duty } from './seder';
import { kunnighet } from './ekonomi';
import { clamp, rnd } from './slump';
import { BLOTVED, torrVed } from './blotved';
import { ARSTID, ageIndex, iIstiden, isLight } from './tid';
import { SNABBARE } from './handlingar';
import { DAY, Fire, FireLog, GREN, HEARTHS, HOUR, HOUR_S, IGNITERS, Person, SEC, State, T, Task, W, H } from './typer';
import { balans } from './balans';
import { num } from './format';
import { vedPerEld, BRASA } from './brasor';
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
  valjPlikt: 0.4, valjAvstand: 25, // poängen att hämta (eldaVal): önskan över bränslet gånger (Plikt + pliktkänslan), minus avståndet delat med Avstand
  // tända
  ring: 6, // stenar i ringen runt eldplatsen
  tandBransle: 2, // bränsle som läggs i när elden tänds
  hamtaForsok: 3, // till så många försök bär den som tänder tändmaterialet från förrådet (steg 11.1.75)
  tandVedMin: 1, // minst så mycket bränsle krävs för att tända
  tandVill: 0.1, tandKandidat: 0.05, // någon tänder när byns önskan är över Vill gånger eldstadens max; den som tänder har själv över Kandidat
  tandTim: 3, // den som ska tända har tre timmar på sig
  tandBas: 0.5, tandSkill: 20, tandInt: 40, // chansen att lyckas: tänddonets gånger (Bas + hantverket / Skill + intelligensen / Int) ...
  tandKol: 1.5, // ... gånger Kol på en gammal kolhög, gånger tidsåldern, och gånger 1 plus (misslyckade försök - 1) / ForsokLara
  forsokLara: 10, // efter så här många misslyckade försök sedan elden brann är chansen dubbelt så stor
  naverChans: 1.5, // en näver i stället för höet gör chansen att lyckas så många gånger större (steg 6.3.3)
  flintSprack: 0.004, // chansen att flintan spricker vid ett misslyckat försök
  borrForsok: 60, // så många försök håller bågborren (steg 10.6.13)
  tandGlad: 0.15, tandGladDygn: 0.5, // glädjen över att tända elden och hur länge den varar (dygn)
  // samla tändmaterial, stenar och flinta (forageItems): per arbetstimme gånger kunnigheten
  hoTakt: 3, // hö (gånger tidsålderns ARSTID.hoPerTid)
  grenarTakt: 3, // grenar (gånger ARSTID.grenarIstid i istiden)
  // tändmaterialet på rutan (steg 9.3.4, tandPaRutan): hö i gräset och kvistar på all mark, hela saker, efter årstiden
  kvistSaker: 6, // kvistar på en ruta (gånger ARSTID.grenarIstid i istiden och fler vid buskarna)
  tandAter: 16, // det som plockats av tändmaterialet växer tillbaka med så här många saker per dygn (år i spelet)
  stenNara: 1, stenNaraDel: 3, // ... gånger Nara dit stenarna ligger inom så många rutor ...
  stenMedel: 3, stenMedelDel: 1.5, // ... Del inom så många ...
  stenAnnars: 0.4, // ... och annars
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
// alla lägereldar, den första först. Utan fler eldar en lista med bara den första, sparad per by (regel 4: två byar delar
// aldrig samma lista)
const ensam = new WeakMap<State, Fire[]>();
export const eldarOf = (s: State): Fire[] => { if (s.eldar?.length) return [s.fire, ...s.eldar]; let e = ensam.get(s); if (!e) ensam.set(s, e = [s.fire]); e[0] = s.fire; e.length = 1; return e; };
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
// det bästa tänddon byn har (IGNITERS står från det sämsta till det bästa): ett redskap räknas när ett finns, även slitet, och
// tänds bara av den som kan tekniken (p; utan p: någon i byn) (steg 10.6.13)
const kanTeknik = (p: Person, id: string) => (p.tek?.[id] ?? 0) >= 1;
export const igniterOf = (s: State, p?: Person) => {
  for (let i = IGNITERS.length - 1; i >= 0; i--) {
    const ig = IGNITERS[i];
    if (!SAKER[ig.id]?.redskap) { if (amountOf(s, ig.id) + iBordan(p, ig.id) >= 1) return ig; continue; } // med det hen bär dit (steg 11.1.75)
    if (ig.med && amountOf(s, ig.med) + iBordan(p, ig.med) < 1) continue; // eldstålet utan flinta att slå mot (steg 12.2.12)
    if (nTools(s, ig.id) >= 1 && (p ? kanTeknik(p, ig.tek ?? ig.id) : living(s).some(q => kanTeknik(q, ig.tek ?? ig.id)))) return ig;
  }
  return undefined;
};
// bränsle i förrådet räknat i ved: ved och grenar, och torven (steg 12.1.3, torv.ts)
export const fuelStock = (s: State) => amountOf(s, 'ved') + amountOf(s, 'grenar') * GREN + (amountOf(s, 'torv') + amountOf(s, 'blottorv')) * TORV.varde;
// Elden ägs av hela byn, men veden följer ägandet: man eldar med byns och sin egen. fran = den man stjäl av (behov.ts)
// bränslet p får elda med, räknat i ved
export const fuelFor = (s: State, p: Person, fran?: Person) => takeLimit(s, 'ved', p, fran) + takeLimit(s, 'grenar', p, fran) * GREN + (fran ? 0 : iBordan(p, 'ved') + iBordan(p, 'grenar') * GREN) // med det hen bär dit
  + (takeLimit(s, 'torv', p, fran) + takeLimit(s, 'blottorv', p, fran) + (fran ? 0 : iBordan(p, 'torv') + iBordan(p, 'blottorv'))) * TORV.varde; // och torven (steg 12.1.3)
// ta bränsle ur förrådet, ved först och sedan grenar; ger hur mycket som togs
// p = den som tar det: byns ved först, sedan sin egen (egendom.ts). ag får vems bränslet var, räknat i ved
export function takeFuel(s: State, n: number, p?: Person, ag?: Del, fran?: Person) {
  const v = Math.min(n, takeLimit(s, 'ved', p, fran) + (fran ? 0 : iBordan(p, 'ved')));
  const b0 = blotUttaget(), w = use(s, p, 'ved', v, true, fran?.id);
  if (p?.task) p.task.blotVed = v > 0 ? Math.min(1, (blotUttaget() - b0) / v) : 0; // det som togs: torr ved tas först (steg 7.3.4), och ur det hen får ta (steg 12.1.55)
  // torven (steg 12.1.3, torv.ts): den torra efter veden och före grenarna, den blöta sist, i hela torv
  const hel = (k: string, kvar: number) => kvar <= 1e-9 ? 0 : Math.min(Math.floor(takeLimit(s, k, p, fran) + (fran ? 0 : iBordan(p, k)) + 1e-9), Math.ceil(kvar / TORV.varde - 1e-9));
  const tt = hel('torv', n - v);
  if (tt > 0) { const d = use(s, p, 'torv', tt, true, fran?.id); if (ag) addDel(ag, d, TORV.varde); }
  const g = Math.min(Math.floor(takeLimit(s, 'grenar', p, fran) + (fran ? 0 : iBordan(p, 'grenar')) + 1e-9), Math.ceil((n - v - tt * TORV.varde) / GREN - 1e-9)); // hela grenar (steg 3.6.13)
  if (g > 0) { const d = use(s, p, 'grenar', g, true, fran?.id); forbrukat(s, 'grenar', -g); if (ag) addDel(ag, d, GREN); } // grenarna som bränsle räknas i veden, inte som förbrukat material (steg 6.2.14)
  const bt = hel('blottorv', n - v - tt * TORV.varde - g * GREN);
  if (bt > 0) {
    const d = use(s, p, 'blottorv', bt, true, fran?.id); if (ag) addDel(ag, d, TORV.varde);
    const tot = v + tt * TORV.varde + g * GREN + bt * TORV.varde; // den blöta torven brinner som blöt ved
    if (p?.task) p.task.blotVed = Math.min(1, ((p.task.blotVed ?? 0) * v + bt * TORV.varde) / tot);
  }
  if (ag) addDel(ag, w);
  return v + tt * TORV.varde + g * GREN + bt * TORV.varde;
}
// bränsle som inte fick plats går tillbaka till förrådet som grenar
export const giveBack = (s: State, n: number) => { if (n > 0) addTo(s, 'grenar', n / GREN); };
function fireLog(s: State, e: Omit<FireLog, 't'>, f = s.fire) { f.log.push({ t: s.now, ...e }); if (f.log.length > 80) f.log.splice(0, f.log.length - 80); }
export const emberOn = (s: State, f = s.fire) => !f.lit && f.emberUntil !== undefined && f.emberUntil > s.now;
// eldens styrka 0–1 efter hur mycket ved som brinner
export const eldStyrka = (fuel: number, h = HEARTHS[0]) => clamp(fuel / h.maxFuel * ELD.styrkaFaktor, ELD.styrkaMin, 1);
export function fireHeat(s: State, f = s.fire) { return f.lit ? eldStyrka(f.fuel, hearthOf(f)) : 0; }
// hur långt värmen når från elden f med styrkan I (efter dess egen eldstad: lägereld, stenring eller härd)
export const radieAv = (I: number, f: Fire) => hearthOf(f).radius * (ELD.radieMin + ELD.radieStyrka * I);
export function heatRadius(s: State, f = s.fire) { return radieAv(fireHeat(s, f), f); }
const varmeFran = (I: number, r: number, fx: number, fy: number, x: number, y: number) => { const d = Math.hypot(x - fx, y - fy); return d >= r ? 0 : I * (1 - d / r); };
// värmen på platsen: från den lägereld som värmer mest där (steg 2.9.1)
export function heatAt(s: State, x: number, y: number) {
  let v = s.stationer?.length ? stationsVarme(s, x, y) : 0; // örtkökets eld värmer lite (stationseld.ts, steg 10.2.86)
  for (const f of eldarOf(s)) { const I = fireHeat(s, f); if (I) { const e = eldXY(s, f); v = Math.max(v, varmeFran(I, radieAv(I, f), e.x + 0.5, e.y + 0.5, x, y)); } }
  return v;
}
// eldstaden för den eld som värmer mest på platsen (steg 10.2.109): härdens välbehag gäller den som sitter vid en härd.
// Värms man av något annat än en eld (örtkökets eld, en brand) räknas lägerelden
export function varmasteHard(s: State, x: number, y: number) {
  let b = HEARTHS[0], bv = 0;
  for (const f of eldarOf(s)) { const I = fireHeat(s, f); if (I) { const e = eldXY(s, f), v = varmeFran(I, radieAv(I, f), e.x + 0.5, e.y + 0.5, x, y); if (v > bv) { bv = v; b = hearthOf(f); } } }
  return b;
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
    { v: clamp((1 - p.warm) * ELD.onskaFryser + cold * ELD.onskaKyla, 0, 1), why: p.warm < 0.5 ? 'Fryser och vill ha mer värme' : `Det är kallt och ${han(p)} vill hålla värmen` },
    { v: clamp(vc * (p.pot.empati / ELD.onskaEmpati) * (ELD.onskaGemBas + ELD.onskaGem * sd.gemenskap), 0, 1), why: 'Andra i byn fryser' },
  ];
  if (vid) opts.push({ v: (light ? ELD.trivsDag : ELD.trivsNatt) * clamp(ELD.trivsMood - moodOf(p, s.now), ELD.trivsMin, 1), why: light ? 'Vill ha en trivsam eld' : 'Vill ha en trivsam eld att samlas kring i mörkret' });
  if (!eldarOf(s).some(e => e.lightings)) opts.push({ v: ELD.forstaEld * (ELD.forstaBas + p.pot.nyfikenhet / ELD.forstaNyfiken), why: 'Byn har aldrig haft eld' });
  const b = opts.reduce((a, o) => (o.v > a.v ? o : a));
  return { v: b.v * hearthOf(f).maxFuel, why: b.why };
}
// hö eller kvistar räcker inte till det elden behöver (tandBuffert i forradsmal.ts), med det den som samlar redan bär (tk).
// Höet som går åt till korgar och rep räknas inte här (steg 12.1.39): det är ett vanligt material under sin buffert
export const tinderShort = (s: State, tk?: Task) => (['torrgras', 'grenar'] as const).some(k => amountOf(s, k) + (tk?.items?.[k] ?? 0) < tandBuffert(s, k));
// den första elden läggs i en ring av stenar; ringen ligger kvar när elden slocknat. Stenar behövs också till en lägereld till (brasor.ts).
// Båda är förrådsmålet för stenen (steg 10.11.4). Stenarna som någon bär hem räknas, så att ingen samlar fler än ringen behöver
// och de som ligger på marken utanför lagret (burna till eldplatsen i flera vändor, eller från en lägereld som tagits isär)
const stenarHem = (s: State) => living(s).reduce((n, q) => n + (q.task?.items?.sten ?? 0), 0) + paMarken(s, 'sten');
export const needStones = (s: State) => underBuffert(s, 'sten', stenarHem(s));
// kan elden tändas (av p: med det p kan få, behov.ts)? Bränslet räknas efter att grenarna till tändningen tagits (tryLight)
export function canLight(s: State, p?: Person, f = s.fire) {
  const ig = igniterOf(s, p), has = (k: string) => p ? getable(s, p, k) : amountOf(s, k);
  if (!ig) return false;
  const pinnar = has('grenar') >= ig.sticks; // annars ersätter kol grenarna
  const naver = has('naver') >= 1, talja = !naver && kanTalja(s) && has('ved') >= 1; // nävern täljs ur en ved som annars hade brunnit
  return (!!f.ring || has('sten') >= ELD.ring) && (naver || talja || has('torrgras') >= ig.grass) && (pinnar || has('kol') >= 1) && (p ? fuelFor(s, p) : fuelStock(s)) - (pinnar ? ig.sticks * GREN : 0) - (talja && !(has('torrgras') >= ig.grass) ? 1 : 0) >= ELD.tandVedMin;
}
// det som bärs till elden som ska tändas (HAMTAS, hamtning.ts, steg 11.1.75): tändmaterialet till ELD.hamtaForsok försök,
// bränslet som läggs i och stenarna till ringen. Med en brand från en eld som brinner bara grenen som tänds där
export function tandHamtas(s: State, p: Person, tk: Task) {
  const f = eldById(s, tk.ref);
  if (!f || f.lit) return undefined;
  // bränslet är ved, och grenar för det som veden inte räcker till (takeFuel)
  const k = ELD.hamtaForsok, ved = Math.min(ELD.tandBransle, Math.floor(amountOf(s, 'ved') + 1e-9)), av: Record<string, number> = {};
  if (ved > 0) av.ved = ved;
  const brGrenar = Math.ceil((ELD.tandBransle - ved) / GREN - 1e-9);
  // med en brand (steg 10.6.12): grenen som tänds vid elden som brinner, bränslet och ringens stenar till den nya elden
  if (tk.brand) { if (tk.brand !== 'hamta') return undefined; av.grenar = 1 + brGrenar; if (!f.ring) av.sten = ELD.ring; return av; }
  const ig = igniterOf(s, p);
  if (!ig) return undefined;
  if (amountOf(s, 'naver') >= 1) av.naver = k;
  else if (amountOf(s, 'torrgras') >= ig.grass) av.torrgras = ig.grass * k;
  else if (kanTalja(s) && ved >= 1) av.ved = ved + 1;
  if (amountOf(s, 'grenar') >= ig.sticks) av.grenar = ig.sticks * k + brGrenar; else { av.kol = k; if (brGrenar) av.grenar = brGrenar; }
  if (!SAKER[ig.id]?.redskap) av[ig.id] = 1;
  if (!f.ring) av.sten = ELD.ring;
  return av;
}
// en näver (steg 6.3.3) täljs ur en ved med kniv eller yxa: med ett blad och ved behövs inget hö till tändningen
export const kanTalja = (s: State) => nTools(s, 'kniv') + nTools(s, 'yxa') > 0;
// tändmaterialet samlas efter förrådsmålet (steg 10.2.9): höet och kvistarna under det elden behöver (MATERIALMAL, där elden som
// brinner vill ha mindre än den släckta), också när en eld glöder. Flintan och stenarna till ringen är egna behov med egna skäl
// (raden leta i val.ts, steg 12.1.39)
export const needTinder = (s: State) => tinderShort(s);
function durText(sec: number) { const h = sec / HOUR_S; return h >= 24 ? `${num(h / 24)} dygn` : h >= 1 ? `${Math.round(h)} timmar` : `${Math.round(sec / 60)} minuter`; }
// ringen av stenar runt eldplatsen läggs av den som tänder, med stenarna hen bär eller når
function laggRing(s: State, p: Person, f: Fire) {
  if (f.ring || getable(s, p, 'sten') < ELD.ring) return;
  takeMaterial(s, p, 'sten', ELD.ring, true); f.ring = true; log(s, `${p.name} lade en ring av stenar runt eldplatsen.`, 'world', [p.id]);
}
function lightFire(s: State, p: Person, f: Fire, brand?: string) {
  const start = takeFuel(s, ELD.tandBransle, p), onCoal = (f.ash ?? 0) >= 1;
  Object.assign(f, { lit: true, fuel: start, litAt: s.now, litBy: p.id, burned: 0, emberUntil: undefined, tryProg: 0 });
  f.lightings++;
  laggRing(s, p, f);
  if (onCoal) { f.ash = 0; f.ashUntil = undefined; } // kolet i den gamla högen tar fyr och blir en del av den nya elden
  fireLog(s, { k: 'tänd', id: p.id, n: f.tries }, f);
  if (brand) log(s, `${p.name} tände ${eldOrd(s, f)} med en brand från ${brand}.`, 'world', [p.id]); // steg 10.6.12
  else log(s, `${p.name} lyckades tända ${eldOrd(s, f)}${onCoal ? ' på den gamla kolhögen' : ''}${f.tries > 1 ? ` efter ${tal(f.tries, true)} försök` : ''}.`, 'world', [p.id]);
  think(p, 'Tände elden', ELD.tandGlad, s.now, ELD.tandGladDygn * DAY);
  if (f !== s.fire) count(s, 'brasaTand'); // en lägereld till (brasor.ts)
  if (f === s.fire && f.lightings === 1) { p.fame.push('Tände byns första eld'); allaBarn(s, 'uppfinning', 'tände sin första eld'); kronikaBer(s, 'k_forstaEld', p.id, personFalt(p)); }
  f.tries = 0;
}
// Varje misslyckat försök sedan elden senast brann gör nästa lättare: man får kläm på det och tändmaterialet blir
// varmt och torrt. Efter ELD.forsokLara försök är chansen dubbelt så stor, så att otur inte kan hålla elden släckt i dygn
// chansen för ett försök med byns bästa tänddon, före lärandet av försöken. Eldandet är ingen egen färdighet (steg 3.10.8):
// chansen räknas ur hantverket, och ingen övar av att tända eller fylla på
function tandChans(s: State, p: Person, f: Fire, naver: boolean) {
  return igniterOf(s, p)!.chance * (ELD.tandBas + p.skill.hantverk / ELD.tandSkill + stat(p, 'intelligens', s.now) / ELD.tandInt) * (iIstiden(ageIndex(s)) ? ARSTID.tandIstid : 1) * ((f.ash ?? 0) >= 1 ? ELD.tandKol : 1) * (amountOf(s, 'ved') > 0 && torrVed(s) <= 0 || amountOf(s, 'ved') <= 0 && amountOf(s, 'torv') <= 0 && amountOf(s, 'blottorv') > 0 ? BLOTVED.tand : 1) // en gammal kolhög tar lättare fyr
    * (naver ? ELD.naverChans : 1); // nävern tar lättare eld än höet
}
// ---------- eld från en eld som brinner (steg 10.6.12) ----------
// Den som når en eld som brinner tänder 1 gren där och bär branden till eldstaden, som tar fyr direkt utan försök och utan hö.
// En tänd fackla i handen tänder på samma sätt. Valet följer tiden: branden när vägen dit och tillbaka väntas gå fortare än försöken
const facklaHos = (s: State, p: Person) => allaTing(s).some(t => t.tand === p.id);
// eldstaden kan ta fyr av en brand: stenarna till ringen och bränslet finns (som för tänddonet)
const brandBar = (s: State, p: Person | undefined, f: Fire) => (!!f.ring || (p ? getable(s, p, 'sten') : amountOf(s, 'sten')) >= ELD.ring) && (p ? fuelFor(s, p) : fuelStock(s)) >= ELD.tandVedMin;
const brandKallor = (s: State, f: Fire) => eldarOf(s).filter(e => e !== f && e.lit && !eldIVatten(s, e));
// kan elden tändas, med tänddonet eller med en brand från en annan eld (eller p:s fackla)
export const kanTanda = (s: State, p: Person | undefined, f: Fire) => canLight(s, p, f) || brandBar(s, p, f) && (!!p && facklaHos(s, p) || brandKallor(s, f).length > 0 && (p ? getable(s, p, 'grenar') : amountOf(s, 'grenar')) >= 1);
// väntad tid (sekunder) för försöken med byns bästa tänddon: summan av chansen att inte ha lyckats före varje försök
export function forsokTid(s: State, p: Person, f: Fire) {
  if (!canLight(s, p, f)) return Infinity;
  const naver = getable(s, p, 'naver') >= 1 || kanTalja(s) && getable(s, p, 'ved') >= 1, c0 = tandChans(s, p, f, naver);
  let kvar = 1, n = 0;
  for (let k = 0; k < 2000 && kvar > 1e-4; k++) { n += kvar; kvar *= 1 - Math.min(1, c0 * (1 + k / ELD.forsokLara)); }
  return n * igniterOf(s, p)!.minutes * 60;
}
// hur p tänder f: med facklan, med en brand från elden kalla, med tänddonet ({}), eller inte alls (undefined)
export function tandSatt(s: State, p: Person, f: Fire): { kalla?: Fire; fackla?: true } | undefined {
  if (brandBar(s, p, f) && facklaHos(s, p)) return { fackla: true };
  const v = kroppFart(p, s.now), at = eldXY(s, f);
  let best: Fire | undefined, bt = Infinity;
  if (brandBar(s, p, f) && getable(s, p, 'grenar') >= 1) for (const e of brandKallor(s, f)) {
    const k = eldXY(s, e), tid = (Math.hypot(p.x - k.x - 0.5, p.y - k.y - 0.5) + Math.hypot(k.x - at.x, k.y - at.y)) / v;
    if (tid < bt) { bt = tid; best = e; }
  }
  const ft = forsokTid(s, p, f);
  if (best && bt < ft) return { kalla: best };
  return ft < Infinity ? {} : undefined;
}
// framme med branden (eller facklan): elden tar fyr direkt
export function brandTand(s: State, p: Person, f: Fire, fran?: Fire) {
  if (f.lit || !brandBar(s, p, f)) return false;
  lightFire(s, p, f, fran ? eldOrd(s, fran, 'elden') : 'facklan');
  count(s, 'brandTand');
  return true;
}
// ett försök att tända med det bästa tänddonet i förrådet
export function tryLight(s: State, p: Person, f = s.fire) {
  const ig = igniterOf(s, p)!;
  // en näver ersätter höet (steg 6.3.3); finns ingen täljs fyra ur en ved med kniven eller yxan
  laggRing(s, p, f); // ringen läggs före det första försöket
  if (getable(s, p, 'naver') < 1 && getable(s, p, 'torrgras') < ig.grass && kanTalja(s) && getable(s, p, 'ved') >= 1) taljaNaver(s, p);
  const naver = getable(s, p, 'naver') >= 1;
  if (naver) takeMaterial(s, p, 'naver', 1, true);
  else takeMaterial(s, p, 'torrgras', ig.grass, true);
  if (getable(s, p, 'grenar') >= ig.sticks) takeMaterial(s, p, 'grenar', ig.sticks, true);
  else takeMaterial(s, p, 'kol', 1, true); // lite kol kan ersätta grenarna

  f.tries++; f.tryTotal++; gjort(s, p, 'tandForsok');
  const c = tandChans(s, p, f, naver) * (1 + (f.tries - 1) / ELD.forsokLara); // varje misslyckat försök sedan elden brann gör nästa lättare
  const lyckas = rnd(s, 'eld', p) < c;
  if (ig.id === 'bagborr' && wearTool(s, p, 'bagborr', 1 / ELD.borrForsok)) { // borren slits av varje försök (steg 10.6.13)
    count(s, 'bagborrarTrasiga'); log(s, `${p.name}s bågborr gick sönder.`, 'world', [p.id]);
  }
  if (ig.slits && wearTool(s, p, ig.id, 1 / ig.slits)) { count(s, ig.id + 'Trasiga'); log(s, `${p.name}s ${ig.name.split(' ')[0].toLowerCase()} var slitet.`, 'world', [p.id]); } // eldstålet slits av varje försök (steg 12.2.12)
  if (ig.med === 'flinta' && rnd(s, 'eld', p) < ELD.flintSprack) { use(s, p, 'flinta', 1, true); count(s, 'flintaSprackStal'); } // flintan som stålet slås mot kan spricka
  if (lyckas) { gjort(s, p, 'tande'); lightFire(s, p, f); return true; }
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
  const vat = p.task?.blotVed ?? 0;
  if (put > 0) f.blot = (f.fuel * (f.blot ?? 0) + put * vat) / (f.fuel + put); // så mycket av det som brinner som är blött (steg 7.3.4)
  f.fuel += put; giveBack(s, n - put);
  f.fills[p.id] = (f.fills[p.id] ?? 0) + 1;
  fireLog(s, { k: 'fyll', id: p.id, n: put }, f);
}
// p går till förrådet efter en famn ved och sedan till elden (steg.ts), när någon tar en annans ved (stöld, behov.ts).
// f = elden (den p hör till om ingen anges); en i taget vid varje eld
export function fetchFuel(s: State, p: Person, why: string, fran?: Person, f = hemEld(s, p)) {
  if (living(s).some(q => q.task?.act === 'elda' && q.task.ref === f.id)) return;
  const at = fetchSpot(s, takeLimit(s, 'ved', p, fran) >= 1 ? 'ved' : 'grenar');
  avbryt(s, p); // bördan läggs ner där hen står, den försvinner inte
  p.task = { act: 'elda', phase: 'go', tx: at.x, ty: at.y, until: s.now + ELD.hamtaTim * HOUR, carry: 0, why, dark: !isLight(s.now) };
  if (fran) p.task.fran = fran.id;
  if (f.id !== undefined) p.task.ref = f.id;
}
// så mycket fortare än vanligt elden brinner nu, två faktorer: i regnet brinner en eld ute fortare (steg 2.11.1; en eld under
// tak gör det inte), och i en hård vinter äter elden mer (steg 3.8.1). Fliken Elden visar samma
export function eldFaktor(s: State, f = s.fire) {
  const e = eldXY(s, f);
  const regn = vaderNu(s).sno || roomAt(s, e.x + 0.5, e.y + 0.5) ? 0 : vaderNu(s).nb;
  return [1 + regn * VADER.regnEld, 1 + MOTGANG.hardVed * hardVinter(s)] as const;
}
// står elden under flodens vatten (steg 3.8.7)? Där brinner den inte, glöden dör och ingen fyller på den
export function eldIVatten(s: State, f: Fire) { if (!s.flod) return false; const e = eldXY(s, f); return iVattnetNu(s, tileOf(e.x, e.y)); }
// så mycket ved elden bränner i timmen just nu: eldstaden, regnet och den hårda vintern (eldFaktor) och den blöta veden. Fliken
// Elden visar samma tal
export function brinnTakt(s: State, f: Fire) { const [fr, fv] = eldFaktor(s, f); return hearthOf(f).burn * fr * fv * (1 + (f.blot ?? 0) * BLOTVED.brann); }
// en eld brinner, slocknar, glöder och lämnar en kolhög
function brinner(s: State, f: Fire, dtSec: number) {
  const now = s.now;
  const iVatten = eldIVatten(s, f);
  if (f !== s.fire && f.lit && iVatten) { f.fuel = 0; count(s, 'flod brasa'); } // vattnet släcker den (steg 3.8.7, flod.ts gör det för den första)
  if (f.lit) {
    const b = Math.min(f.fuel, brinnTakt(s, f) / HOUR_S * dtSec); // blöt ved brinner fortare och ger mindre värme per vedträ
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
// där man sitter vid elden (för att tända den, hämta kolet): framför den, och står den vid vattnet eller en vägg bakom eller bredvid den
export function vidEld(s: State, f: Fire, dx: number, dy: number) {
  const e = eldXY(s, f);
  for (const [x, y] of [[e.x + 0.5 + dx, e.y + dy], [e.x + 0.5 + dx, e.y - 0.3], [e.x - 0.3, e.y + 0.5], [e.x + 1.3, e.y + 0.5]]) {
    const tx = Math.floor(x), ty = Math.floor(y);
    if (tx >= 0 && ty >= 0 && tx < W && ty < H && !iVattnetNu(s, ty * W + tx) && !isWall(s, x, y)) return { x, y };
  }
  return { x: e.x + 0.5 + dx, y: e.y + dy };
}
const tandPlats = (s: State, f: Fire, p: Person) => vidEld(s, f, (rnd(s, 'eld', p) - 0.5) * 1.2, 1.3);
// hur mycket byn fryser, 0–1 (en del av var och ens önskan om ved, fireWish)
const byFryser = (ppl: Person[]) => ppl.reduce((a, p) => a + clamp(ELD.byFryser - p.warm, 0, ELD.byFryser) / ELD.byFryser, 0) / (ppl.length || 1);
// de eldar p hör till: den p sitter vid eller är på väg till, och hemelden
const eldarFor = (s: State, p: Person) => { const hem = hemEld(s, p); return eldarOf(s).filter(f => f === hem || sitterVid(s, p, f)); };
// elden brinner, och den största önskan om ved på varje eld räknas (fliken Elden, tändningen i valet). Vem som lägger på ved
// och tänder väljs i valet av aktivitet (eldaVal och tandaVal, raderna elda och tanda i ARBETEN, steg 12.1.76)
export function stepFire(s: State, dtSec: number, ppl: Person[]) {
  const alla = eldarOf(s);
  for (const e of alla) brinner(s, e, dtSec);
  // vilja: varje invånare som är vaken vill ha olika mycket ved på de eldar hen använder (steg 6.3.1)
  const vc = byFryser(ppl);
  for (const f of alla) { f.want = 0; f.wantBy = undefined; f.wantWhy = undefined; f.brukare = 0; }
  for (const p of ppl) {
    if (!alive(p) || p.task?.act === 'sova' || p.task?.act === 'gomma' || ligger(p, s.now) || halsa(p) < KROPP.svag || ageOf(p, s.now) < ALDER.hjalper) continue; // den som sover, gömmer sig eller ligger sjuk vill inget
    for (const f of eldarFor(s, p)) {
      const w = fireWish(s, p, vc, f, sitterVid(s, p, f));
      f.brukare = (f.brukare ?? 0) + 1;
      if (w.v > (f.want ?? 0)) { f.want = w.v; f.wantBy = p.id; f.wantWhy = w.why; }
    }
  }
}
// de eldar byn sköter: alla, eller när bränslet tryter så många som veden räcker till i BRASA.slackDygn dygn var (steg 10.2.10),
// de mest använda först
function skots(s: State, f: Fire) {
  const alla = eldarOf(s);
  const racker = Math.max(1, Math.floor(vedPerEld(s, 0) * alla.length / BRASA.slackDygn));
  if (alla.length <= racker) return true;
  const ordning = [...alla].sort((a, b) => (b.brukare ?? 0) - (a.brukare ?? 0) || (a.id ?? -1) - (b.id ?? -1));
  return ordning.indexOf(f) < racker;
}
// raden elda i valet av aktivitet (steg 12.1.76): p lägger ved på en eld hen hör till när hens önskan är klart över det som
// ligger på. Poängen är önskan över bränslet gånger plikten, minus avståndet; en i taget vid varje eld
export function eldaVal(s: State, p: Person): { spot: { x: number; y: number }; dur: number; ref?: number; why: string } | undefined {
  if (ageOf(p, s.now) < ALDER.hjalper || fuelStock(s) < ELD.hamtaMin || fuelFor(s, p) < ELD.hamtaMin) return undefined; // bara den som har ved att ta (byns eller sin egen)
  const ppl = living(s), vc = byFryser(ppl);
  let bast: { f: Fire; why: string } | undefined, bs = 0;
  for (const f of eldarFor(s, p)) {
    if (!(f.lit || emberOn(s, f)) || eldIVatten(s, f) || !skots(s, f) || ppl.some(q => q.task?.act === 'elda' && q.task.ref === f.id)) continue;
    const w = fireWish(s, p, vc, f, sitterVid(s, p, f));
    if (w.v < f.fuel * ELD.fyllMarg + ELD.fyllPlus) continue;
    const e = eldXY(s, f), sc = (w.v - f.fuel) / hearthOf(f).maxFuel * (ELD.valjPlikt + duty(s, p)) - Math.hypot(p.x - e.x - 0.5, p.y - e.y - 0.5) / ELD.valjAvstand;
    if (sc > bs) { bs = sc; bast = { f, why: w.why }; }
  }
  if (!bast) return undefined;
  return { spot: fetchSpot(s, takeLimit(s, 'ved', p) >= 1 ? 'ved' : 'grenar'), dur: ELD.hamtaTim * HOUR, ref: bast.f.id, why: bast.why };
}
// raden tanda (steg 12.1.76): en släckt eld som någon som hör till den vill ha tänds av en som kan, en i taget vid varje eld.
// Med en brand går hen först till elden som brinner (steg 10.6.12), annars direkt till eldstaden
export function tandaVal(s: State, p: Person): { spot: { x: number; y: number }; dur: number; ref?: number; why: string; brand?: 'hamta' | 'bar'; kalla?: number } | undefined {
  if (ageOf(p, s.now) < ALDER.ansvar) return undefined;
  const ppl = living(s), vc = byFryser(ppl);
  for (const f of eldarFor(s, p)) {
    const h = hearthOf(f);
    if (f.lit || emberOn(s, f) || (f.want ?? 0) < h.maxFuel * ELD.tandVill || eldIVatten(s, f) || !skots(s, f) || ppl.some(q => q.task?.act === 'tanda' && (q.task.ref ?? s.fire.id) === f.id)) continue;
    const w = fireWish(s, p, vc, f, sitterVid(s, p, f));
    if (w.v < h.maxFuel * ELD.tandKandidat || !kanTanda(s, p, f)) continue;
    const sa = tandSatt(s, p, f);
    if (!sa) continue;
    const at = sa.kalla ? vidEld(s, sa.kalla, (rnd(s, 'eld', p) - 0.5) * 1.2, 1.3) : tandPlats(s, f, p);
    return { spot: at, dur: ELD.tandTim * HOUR, ref: f.id, why: `Vill ha eld. ${w.why}`, ...(sa.kalla ? { brand: 'hamta' as const, kalla: sa.kalla.id ?? -1 } : sa.fackla ? { brand: 'bar' as const } : {}) };
  }
  return undefined;
}
// samling hittar tändmaterial, sten och flinta när förrådet behöver det
// fart: hö och grenar växer på platsen och hittas lika mycket fortare som det man samlar (steg 2.12.4); stenar och flinta letar man efter
export function forageItems(s: State, p: Person, dtSec: number, fart = 1): Record<string, number> | undefined {
  const ai = ageIndex(s), hrs = dtSec / HOUR_S * SNABBARE, vaxer = hrs * fart; // allt man skaffar går fortare sedan steg 1.5.13
  const sk = kunnighet(p.skill.samla);
  const got: Record<string, number> = {};
  // under bufferten plockas materialet, och den som hämtar det plockar till taket men aldrig över (FORRADSMAL, steg 6.2.14)
  const plocka = (k: Materialslag) => { const q = overOchUnder(s, k, p.task?.items?.[k] ?? 0); return !q.over && (q.under || p.task?.hamtar === k); };
  // tändmaterialet är hela saker på rutan (steg 9.3.4): arbetet mot nästa sak ligger hos personen, och en hel sak tas från rutan
  // där hen är när arbetet räcker. Finns inget kvar där blir det inget, och arbetet väntar (högst en sak)
  if (plocka('torrgras')) tandTa(s, p, got, 'torrgras', ELD.hoTakt * ARSTID.hoPerTid[ai] * sk * vaxer);
  if (plocka('grenar')) tandTa(s, p, got, 'grenar', ELD.grenarTakt * (iIstiden(ai) ? ARSTID.grenarIstid : 1) * sk * vaxer * (p.task ? grenFaktor(groundOf(s), tileOf(p.task.tx, p.task.ty)) : 1)); // fler vid buskarna (steg 6.5.3)
  return Object.keys(got).length ? got : undefined;
}
// den närmaste rutan från p med både hö och kvistar (steg 12.1.39): dit går den som hämtar tändmaterial först. Hö och kvistar
// finns nästan överallt, så det är oftast ett par rutor bort
export function tandStalle(s: State, p: Person, r = 12): { x: number; y: number } | undefined {
  const x0 = Math.floor(p.x), y0 = Math.floor(p.y);
  let bast: { x: number; y: number } | undefined, bd = Infinity;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const d = Math.hypot(dx, dy);
    if (d > r + 0.01 || d >= bd) continue;
    const x = x0 + dx, y = y0 + dy;
    if (tandPaRutan(s, 'torrgras', x, y) <= 0 || tandPaRutan(s, 'grenar', x, y) <= 0) continue; // (tandPaRutan: inget i vattnet eller under en vägg)
    bast = { x: x + 0.5, y: y + 0.5 }; bd = d;
  }
  return bast;
}
// ---------- tändmaterialet på rutan (steg 9.3.4) ----------
// Höet är gräset självt (hoPaRutan, steg 10.10.9) och kvistarna ligger på all mark, flera hela saker per ruta efter årstiden. Det som plockats (s.plockat, som för grenarna och stenarna i steg.ts) växer tillbaka, ELD.tandAter per dygn
export type Tand = 'torrgras' | 'grenar';
const tandKey = (k: Tand, i: number) => `${k === 'torrgras' ? 'ho' : 'kvist'}:${i}`;
export function tandPaRutan(s: State, k: Tand, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= W || y >= H) return 0;
  const g = groundOf(s), i = y * W + x, t = g.tiles[i];
  if (t === T.Vatten || t === T.Sten || isWall(s, x + 0.5, y + 0.5)) return 0; /* inget hö och inga kvistar under en vägg */
  const ai = ageIndex(s);
  if (k === 'torrgras') return hoPaRutan(s, x, y);
  const bas = Math.floor(ELD.kvistSaker * (iIstiden(ai) ? ARSTID.grenarIstid : 1) * grenFaktor(g, i) + 1e-9);
  const r = s.plockat?.[tandKey(k, i)];
  if (!r) return bas;
  const kvar = r.n - Math.floor((s.now - r.t) / DAY * ELD.tandAter);
  if (kvar <= 0) { delete s.plockat![tandKey(k, i)]; return bas; }
  return Math.max(0, bas - kvar);
}
// höet är gräset (steg 10.10.9): högt och kort gräs på öppen mark, inte under träd, på en buske, i hagen eller på ängen. Ett hö
// är MARK.hoTacke av gräset, ner till stubben (MARK.stubb); det växer tillbaka med gräset (growGround i mark.ts)
export function hoPaRutan(s: State, x: number, y: number) {
  const g = groundOf(s), i = y * W + x, c = g.cover[i];
  if (c < BAR || !isSoil(g.tiles[i]) || g.trees[i] >= VAG.ungskog || arBuske(g, i) || hageAt(s, x, y) || angAt(s, x, y)) return 0;
  return Math.max(0, Math.floor((Math.min(1, c) - MARK.stubb) / MARK.hoTacke + 1e-9));
}
// en sak tändmaterial tas från rutan
export function tandPlocka(s: State, k: Tand, x: number, y: number) {
  if (k === 'torrgras') { const g = groundOf(s), i = y * W + x; g.cover[i] = Math.max(MARK.stubb, Math.min(1, g.cover[i]) - MARK.hoTacke); return; }
  const key = tandKey(k, y * W + x), r = s.plockat?.[key];
  const kvar = r ? Math.max(0, r.n - Math.floor((s.now - r.t) / DAY * ELD.tandAter)) : 0;
  (s.plockat ??= {})[key] = { n: kvar + 1, t: s.now };
}
// arbetet v mot tändmaterialet av slaget k: hela saker från rutan där p arbetar, så många som arbetet räcker till och rutan har
function tandTa(s: State, p: Person, got: Record<string, number>, k: Tand, v: number) {
  const x = Math.floor(p.task?.tx ?? p.x), y = Math.floor(p.task?.ty ?? p.y), d = (p.delar ??= {}), nyck = 'tand:' + k;
  let t = (d[nyck] ?? 0) + v, n = 0;
  while (t >= 1 - 1e-9 && tandPaRutan(s, k, x, y) > 0) { tandPlocka(s, k, x, y); t -= 1; n++; }
  t = Math.min(t, 1 - 1e-6); // på en tom ruta väntar arbetet, högst en sak
  if (t > 1e-9) d[nyck] = t; else delete d[nyck];
  if (!Object.keys(d).length) delete p.delar;
  if (n) got[k] = n;
}
// så många dygn bränslet i förrådet räcker
export function woodDays(s: State) { return fuelStock(s) / vedPerDygn(s); }
// så mycket ved elden bränner på ett dygn
export const vedPerDygn = (s: State) => hearthOf(s.fire).burn * 24;

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
import { TORV } from './myr';
