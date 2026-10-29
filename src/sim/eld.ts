import { allaBarn } from './uppvaxt';
import { kronikaBer, personFalt } from './berattelser';
import { addTo, amountOf, avbryt, fetchSpot, takeLimit, use } from './lager';
import { Behov, addBehov, getable, takeMaterial } from './behov';
import { Del, addDel } from './egendom';
import { coldOf, hardVinter, temperature, vaderNu, VADER } from './vader';
import { MOTGANG } from './motgang';
import { roomAt } from './byggnad';
import { ALDER, KROPP, ageOf, count, doingAct, isSick, living, log, ovning, stat, think } from './folk';
import { halsa } from './halsa';
import { flintFactor, flintorOchYxor, stoneDist, takeFrom } from './fynd';
import { observe } from './minne';
import { eldPlats } from './karta';
import { tileOf } from './mark';
import { moodOf } from './humor';
import { duty, sedEvent } from './seder';
import { RESERV, kunnighet } from './ekonomi';
import { chance, clamp, rnd } from './slump';
import { ARSTID, ageIndex, iIstiden, isLight } from './tid';
import { SNABBARE } from './handlingar';
import { Act, DAY, Fire, FireLog, GREN, HEARTHS, HOUR, HOUR_S, IGNITERS, Person, SEC, State, Task } from './typer';
import { balans } from './balans';
import { num } from './format';
import { brasaHeat, brasaSten, stepBrasaEld } from './brasor';

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
  onskaEmpati: 10, onskaGemBas: 0.6, onskaGem: 0.4, // att andra fryser: byns frysande gånger empatin delad med Empati gånger (Bas + Gemenskap gånger seden)
  trivsDag: 0.12, trivsNatt: 0.55, trivsMood: 1.5, trivsMin: 0.4, // en trivsam eld, mest i mörkret och för den som mår dåligt
  slocknaFran: 11, slocknaSpann: 9, slocknaForsBas: 0.6, slocknaFors: 0.4, slocknaVikt: 0.14, // att elden inte ska slockna: den kloka, när den är svår att tända, och den försiktiga byn
  forstaEld: 0.3, forstaBas: 0.6, forstaNyfiken: 25, // byn har aldrig haft eld: den nyfikna vill ha en
  byFryser: 0.6, // en invånare vars värme är under detta räknas som frysande när byns köld räknas
  // fylla på
  hamtaMin: 0.5, // minst så mycket ved måste finnas (i byn och hos den som hämtar) för att någon ska hämta
  hamtaTim: 1, // den som hämtar ved har en timme på sig
  fyllMarg: 2, fyllPlus: 0.2, // någon hämtar ved när hens önskan är över bränslet gånger Marg plus Plus
  valjPlikt: 0.4, valjAvstand: 25, valjVakt: 0.3, valjBrus: 0.1, // vem som hämtar: önskan gånger (Plikt + pliktkänslan), minus avståndet delat med Avstand, plus Vakt för en vakt, plus slump
  ovFyll: 0.01, // övning i att elda av att fylla på
  // tända
  ring: 6, // stenar i ringen runt eldplatsen
  tandBransle: 2, // bränsle som läggs i när elden tänds
  tandVedMin: 1, // minst så mycket bränsle krävs för att tända
  tandVill: 0.1, tandKandidat: 0.05, // någon tänder när byns önskan är över Vill gånger eldstadens max; den som tänder har själv över Kandidat
  tandFlit: 2, tandBrus: 3, // vem som tänder: färdigheten plus flit delad med Flit plus slump gånger Brus
  tandTim: 3, // den som ska tända har tre timmar på sig
  tandBas: 0.5, tandSkill: 20, tandInt: 40, // chansen att lyckas: tänddonets gånger (Bas + färdigheten / Skill + intelligensen / Int) ...
  tandKol: 1.5, // ... gånger Kol på en gammal kolhög, gånger tidsåldern, och gånger 1 plus (misslyckade försök - 1) / ForsokLara
  forsokLara: 10, // efter så här många misslyckade försök sedan elden brann är chansen dubbelt så stor
  flintSprack: 0.004, // chansen att flintan spricker vid ett misslyckat försök
  ovTand: 0.08, ovBas: 0.5, ovInt: 20, // övning i att elda av att försöka tända: Tand gånger (Bas + intelligensen / Int)
  tandGlad: 0.15, tandGladDygn: 0.5, // glädjen över att tända elden och hur länge den varar (dygn)
  sedNyfiken: 0.1, // den första elden gör byn nyfiken
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
function fireLog(s: State, e: Omit<FireLog, 't'>) { s.fire.log.push({ t: s.now, ...e }); if (s.fire.log.length > 80) s.fire.log.splice(0, s.fire.log.length - 80); }
export const emberOn = (s: State) => !s.fire.lit && s.fire.emberUntil !== undefined && s.fire.emberUntil > s.now;
// eldens styrka 0–1 efter hur mycket ved som brinner (lägerelden, och brasorna med samma eldstad: brasor.ts)
export const eldStyrka = (fuel: number, h = HEARTHS[0]) => clamp(fuel / h.maxFuel * ELD.styrkaFaktor, ELD.styrkaMin, 1);
export function fireHeat(s: State) { const f = s.fire; return f.lit ? eldStyrka(f.fuel, hearthOf(f)) : 0; }
// hur långt värmen når från en eld med styrkan I
export const radieAv = (s: State, I: number) => hearthOf(s.fire).radius * (ELD.radieMin + ELD.radieStyrka * I);
export function heatRadius(s: State) { return radieAv(s, fireHeat(s)); }
const varmeFran = (I: number, r: number, fx: number, fy: number, x: number, y: number) => { const d = Math.hypot(x - fx, y - fy); return d >= r ? 0 : I * (1 - d / r); };
// värmen på platsen: från den eld som värmer mest där, lägerelden eller en brasa (steg 2.9.1)
export function heatAt(s: State, x: number, y: number) {
  const I = fireHeat(s), f = eldPlats(s);
  let v = I ? varmeFran(I, heatRadius(s), f.x + 0.5, f.y + 0.5, x, y) : 0;
  if (s.stationer?.length) for (const t of s.stationer) if (t.eld?.lit) { const J = brasaHeat(t); v = Math.max(v, varmeFran(J, radieAv(s, J), t.x + 0.5, t.y + 0.5, x, y)); }
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
// den första elden läggs i en ring av stenar; ringen ligger kvar när elden slocknat. Stenar behövs också till en brasa (brasor.ts).
// Stenarna som någon bär hem räknas, så att ingen samlar fler än ringen behöver
const stenarHem = (s: State) => living(s).reduce((n, q) => n + (q.task?.items?.sten ?? 0), 0);
export const needStones = (s: State) => !s.fire.ring && amountOf(s, 'sten') + stenarHem(s) < ELD.ring || brasaSten(s);
// kan elden tändas (av p: med det p kan få, behov.ts)? Bränslet räknas efter att grenarna till tändningen tagits (tryLight)
export function canLight(s: State, p?: Person) {
  const ig = igniterOf(s), has = (k: string) => p ? getable(s, p, k) : amountOf(s, k);
  if (!ig) return false;
  const pinnar = has('grenar') >= ig.sticks; // annars ersätter kol grenarna
  return (!!s.fire.ring || has('sten') >= ELD.ring) && has('torrgras') >= ig.grass && (pinnar || has('kol') >= 1) && (p ? fuelFor(s, p) : fuelStock(s)) - (pinnar ? ig.sticks * GREN : 0) >= ELD.tandVedMin;
}
export function needTinder(s: State) {
  return !s.fire.lit && !emberOn(s) && (amountOf(s, 'flinta') < 1 || needStones(s) || amountOf(s, 'torrgras') < RESERV.tandBrist || amountOf(s, 'grenar') < RESERV.tandBrist);
}
function durText(sec: number) { const h = sec / HOUR_S; return h >= 24 ? `${num(h / 24)} dygn` : h >= 1 ? `${Math.round(h)} timmar` : `${Math.round(sec / 60)} minuter`; }
function lightFire(s: State, p: Person) {
  const f = s.fire, start = takeFuel(s, ELD.tandBransle, p), onCoal = (f.ash ?? 0) >= 1;
  Object.assign(f, { lit: true, fuel: start, litAt: s.now, litBy: p.id, burned: 0, emberUntil: undefined, tryProg: 0 });
  f.lightings++;
  if (!f.ring) { takeMaterial(s, p, 'sten', ELD.ring, true); f.ring = true; log(s, `${p.name} lade en ring av stenar runt eldplatsen.`, 'world', [p.id]); }
  if (onCoal) { f.ash = 0; f.ashUntil = undefined; } // kolet i den gamla högen tar fyr och blir en del av den nya elden
  fireLog(s, { k: 'tänd', id: p.id, n: f.tries });
  log(s, `${p.name} lyckades tända elden${onCoal ? ' på den gamla kolhögen' : ''}${f.tries > 1 ? ` efter ${f.tries} försök` : ''}.`, 'world', [p.id]);
  think(p, 'Tände elden', ELD.tandGlad, s.now, ELD.tandGladDygn * DAY);
  if (f.lightings === 1) { p.fame.push('Tände byns första eld'); allaBarn(s, 'uppfinning', 'tände sin första eld'); kronikaBer(s, 'k_forstaEld', p.id, personFalt(p)); sedEvent(s, 'nyfikenhet', ELD.sedNyfiken, 'Elden har gjort byn nyfiken på vad mer som går att lära sig.'); }
  f.tries = 0;
}
// Varje misslyckat försök sedan elden senast brann gör nästa lättare: man får kläm på det och tändmaterialet blir
// varmt och torrt. Efter ELD.forsokLara försök är chansen dubbelt så stor, så att otur inte kan hålla elden släckt i dygn
// ett försök att tända med det bästa tänddonet i förrådet
export function tryLight(s: State, p: Person) {
  const ig = igniterOf(s)!, f = s.fire;
  takeMaterial(s, p, 'torrgras', ig.grass, true);
  if (getable(s, p, 'grenar') >= ig.sticks) takeMaterial(s, p, 'grenar', ig.sticks, true);
  else takeMaterial(s, p, 'kol', 1, true); // lite kol kan ersätta grenarna

  f.tries++; f.tryTotal++;
  ovning(p, 'elda', ELD.ovTand * (ELD.ovBas + p.pot.intelligens / ELD.ovInt));
  const c = ig.chance * (ELD.tandBas + p.skill.elda / ELD.tandSkill + stat(p, 'intelligens', s.now) / ELD.tandInt) * (iIstiden(ageIndex(s)) ? ARSTID.tandIstid : 1) * ((f.ash ?? 0) >= 1 ? ELD.tandKol : 1) // en gammal kolhög tar lättare fyr
    * (1 + (f.tries - 1) / ELD.forsokLara); // varje misslyckat försök sedan elden brann gör nästa lättare
  if (rnd(s, 'eld', p) < c) { lightFire(s, p); return true; }
  if (ig.id === 'flinta' && rnd(s, 'eld', p) < ELD.flintSprack) {
    use(s, p, 'flinta', 1, true); fireLog(s, { k: 'sprack', id: p.id });
    log(s, `Flintan som ${p.name} slog med sprack.`, 'world', [p.id]);
  }
  return false;
}
export function takeCoal(s: State, p: Person, verb: string) {
  const n = s.fire.ash ?? 0;
  if (n < 1) return;
  addTo(s, 'kol', n);
  s.fire.ash = 0; s.fire.ashUntil = undefined;
  log(s, `${p.name} ${verb} ${n} kol ur den gamla elden och lade dem i förrådet.`, 'world', [p.id]);
}
export function addFuel(s: State, p: Person, n: number) {
  const f = s.fire, h = hearthOf(f);
  if (!f.lit && !emberOn(s)) { giveBack(s, n); return; } // elden hann slockna: bränslet går tillbaka
  if (!f.lit) {
    f.lit = true; f.emberUntil = undefined;
    fireLog(s, { k: 'glöd', id: p.id });
    log(s, `${p.name} blåste liv i glöden och elden brinner igen.`, 'world', [p.id]);
  }
  const put = Math.min(n, h.maxFuel - f.fuel);
  f.fuel += put; giveBack(s, n - put);
  f.fills[p.id] = (f.fills[p.id] ?? 0) + 1;
  fireLog(s, { k: 'fyll', id: p.id, n: put });
  ovning(p, 'elda', ELD.ovFyll);
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
    (!t || (t.act !== 'sova' && !(t.phase === 'back' && t.carry > 0) && !t.items));
};
export function stepFire(s: State, dtSec: number, ppl: Person[]) {
  const f = s.fire, h = hearthOf(f), now = s.now;
  if (f.lit) {
    // i regnet brinner en eld ute fortare (steg 2.11.1); en eld under tak gör det inte. I en hård vinter äter elden mer (steg 3.8.1)
    const regn = vaderNu(s).sno || roomAt(s, eldPlats(s).x + 0.5, eldPlats(s).y + 0.5) ? 0 : vaderNu(s).nb;
    const b = Math.min(f.fuel, h.burn / HOUR_S * dtSec * (1 + regn * VADER.regnEld) * (1 + MOTGANG.hardVed * hardVinter(s)));
    f.fuel -= b; f.burned += b; f.totalBurned += b; f.litSec += dtSec;
    if (f.fuel <= 1e-6) {
      f.fuel = 0; f.lit = false; f.emberUntil = now + ELD.glodTim * HOUR; f.outs++;
      fireLog(s, { k: 'slocknade', n: f.burned });
      log(s, `Elden slocknade efter att ha brunnit i ${durText((now - (f.litAt ?? now)) / SEC)}. Glöden lever en stund till.`, 'world');
    }
  }
  if (f.emberUntil !== undefined && !f.lit && f.emberUntil <= now) {
    // glöden dog: kvar blir en svart hög med lite kol, som ligger några dygn
    f.emberUntil = undefined;
    // kolet blir alltid ett litet, slumpat antal; hämtar ingen det förtvinar det efter några dygn
    const coal = ELD.kolMin + Math.floor(rnd(s, 'eld') * ELD.kolSpann);
    f.ash = (f.ash ?? 0) + coal; f.ashUntil = now + ELD.kolDygn * DAY;
    log(s, `Elden har brunnit ut. Kvar ligger en svart hög med ${coal} kol.`, 'world');
  }
  if (f.ash && (f.ashUntil ?? 0) <= now) { f.ash = 0; f.ashUntil = undefined; }
  // vilja: varje vaken invånare vill ha olika mycket ved på elden
  const vc = ppl.reduce((a, p) => a + clamp(ELD.byFryser - p.warm, 0, ELD.byFryser) / ELD.byFryser, 0) / (ppl.length || 1);
  const cands: { p: Person; w: Wish }[] = [];
  let top: { p: Person; w: Wish } | undefined;
  for (const p of ppl) {
    if (!awake(s, p, ALDER.hjalper)) continue;
    const c = { p, w: fireWish(s, p, vc) };
    cands.push(c);
    if (!top || c.w.v > top.w.v) top = c;
  }
  f.want = top?.w.v ?? 0; f.wantBy = top?.p.id; f.wantWhy = top?.w.why;
  // påfyllning: den som vill ha klart mer ved än det som ligger på hämtar, plikttrogna och nära först
  if ((f.lit || emberOn(s)) && fuelStock(s) >= ELD.hamtaMin && !ppl.some(p => p.task?.act === 'elda')) {
    const fx = eldPlats(s).x + 0.5, fy = eldPlats(s).y + 0.5;
    let best: { p: Person; w: Wish } | undefined, bs = -1e9;
    for (const c of cands) {
      if (c.w.v < f.fuel * ELD.fyllMarg + ELD.fyllPlus || fuelFor(s, c.p) < ELD.hamtaMin) continue; // bara den som har ved att ta (byns eller sin egen)
      const sc = (c.w.v - f.fuel) / h.maxFuel * (ELD.valjPlikt + duty(s, c.p)) - Math.hypot(c.p.x - fx, c.p.y - fy) / ELD.valjAvstand + (c.p.task?.act === 'vakt' ? ELD.valjVakt : 0) + rnd(s, 'eld') * ELD.valjBrus;
      if (sc > bs) { bs = sc; best = c; }
    }
    if (best) fetchFuel(s, best.p, best.w.why);
  }
  // tändning: när elden är släckt och någon vill ha eld försöker en person i taget
  if (!f.lit && !emberOn(s) && canLight(s) && f.want >= h.maxFuel * ELD.tandVill && !ppl.some(p => p.task?.act === 'tanda')) {
    // ett slumptal per kandidat i ordning, sedan den bästa (inte i sorteringens jämförelser: deras antal beror på webbläsaren)
    let c: { p: Person; w: Wish } | undefined, ck = -Infinity;
    for (const o of cands) {
      if (ageOf(o.p, now) < ALDER.ansvar || o.w.v < h.maxFuel * ELD.tandKandidat || !canLight(s, o.p)) continue;
      const k = o.p.skill.elda + stat(o.p, 'flit', now) / ELD.tandFlit + rnd(s, 'eld') * ELD.tandBrus;
      if (k > ck) { ck = k; c = o; }
    }
    if (c) assign(s, c.p, 'tanda', eldPlats(s).x + 0.5 + (rnd(s, 'eld') - 0.5) * 1.2, eldPlats(s).y + 1.3, ELD.tandTim * HOUR, `Vill ha eld. ${c.w.why}`);
  }
  stepBrasaEld(s, dtSec, cands); // brasorna (steg 2.9.1)
}
// samling hittar tändmaterial, sten och flinta när förrådet behöver det
// fart: hö och grenar växer på platsen och hittas lika mycket fortare som det man samlar (steg 2.12.4); stenar och flinta letar man efter
export function forageItems(s: State, p: Person, dtSec: number, fart = 1): Record<string, number> | undefined {
  const ai = ageIndex(s), want = tinderWant(s), hrs = dtSec / HOUR_S * SNABBARE, vaxer = hrs * fart; // allt man skaffar går fortare sedan steg 1.5.13
  const sk = kunnighet(p.skill.samla);
  const got: Record<string, number> = {};
  const bar = (k: string) => amountOf(s, k) + (p.task?.items?.[k] ?? 0); // det man redan bär räknas, så att ingen bär hem mer än byn vill ha
  if (bar('torrgras') < want) got.torrgras = ELD.hoTakt * ARSTID.hoPerTid[ai] * sk * vaxer;
  if (bar('grenar') < want) got.grenar = ELD.grenarTakt * (iIstiden(ai) ? ARSTID.grenarIstid : 1) * sk * vaxer;
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
addBehov(VED);
