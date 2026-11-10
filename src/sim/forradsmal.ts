// Förråden (steg 6.2.13, "Arbetsordningen (Förråden)" i designdokumentet): registret FORRADSMAL har en rad per resurs med
// två mål. Bufferten är det byn behöver för att klara sig tills den kan hämta mer: under den är resursen ett behov under
// Försörjning (val.ts), och behovet växer ju mer som fattas. Lyxtaket ligger över bufferten: mellan dem fylls resursen bara
// när inget annat finns på Förbättra, och över taket arbetar ingen för den. Målen räknas i dygn som förrådet räcker, och
// räknas om en gång i timmen (och när ledarens påbud om förrådet ändras). Seden Förutseende och påbudet (styre.ts) höjer
// båda. En ny resurs är en ny rad.
// Materialen (steg 6.2.14): grenar, hö, sten, flinta och virke har var sin rad i MATERIALMAL. Bufferten är förbrukningen de
// senaste dygnen (s.forbruk, räknad när något tas ur förrådet i lager.ts) gånger materialDygn, minst radens minsta tal, och
// det som projekten och bygget väntar på. Taket är materialMatt gånger bufferten, aldrig mer än lagerplatserna rymmer. Under
// bufferten är materialet ett behov under Försörjning, och över taket plockar ingen av det (eld.ts, val.ts, projekt.ts).
// Målen räknas en gång i timmen med arbetarna (arbetsTimme i val.ts) och sparas i s.arbBehov, så att alla lägen räknar likadant.
import { balans } from './balans';
import { woodDays } from './eld';
import { foodDaysAll } from './ekonomi';
import { isFood } from './saker';
import { ljusPlatser } from './ljus';
import { allows, amountOf, rymd, zonesOf } from './lager';
import { Pabud, legitimitet, pabud } from './styre';
import { ALDER, ageOf, living } from './folk';
import { clamp } from './slump';
import { sportFor } from './sport';
import { STATIONER, StationDef, StationSlag, bordBrist, forvarBrist, harStation, isKlar, pyntBrist, stationerOf, tommaPlatser, villPynt } from './stationer';
import { nTools } from './agande';
import { brasaBrist } from './brasor';
import { BYGGNADER, fnId, utanBadd } from './byggnader';
import { latrinBrist } from './smuts';
import { torkBrist } from './matlagning';
import { HOUR, State, WEEK } from './typer';
import { TILLVERKA } from './tillverka';
import { protesVill } from './protes';

export const FORRAD = balans('forrad', {
  forsiktig: 0.25, // en försiktig by (seden Förutseende eller påbudet) vill ha så mycket större förråd
  behovTomt: 3.2, behovMax: 3.5, // vikten av ett tomt förråd under Försörjning, och den högsta vikten
  // mat: förrådets dygn dämpar vikten ner till Min när förrådet räcker så länge byn vill (bufferten) ...
  matDygn: 2.5, matMin: 0.4, // 1,1 före Balansen i fas 9 (steg 9.9.4): med en så liten buffert slog varje störning direkt till svält
  matMatt: 2, matMinMatt: 0.04, // ... och sedan vidare ner till MinMatt vid taket, Matt gånger bufferten: då upphör matarbetet nästan (steg 3.10.9)
  vedDygn: 2, vedMin: 0.15, // ... och för ved
  vedMatt: 12, vedMinMatt: 0.01, // över taket (Matt gånger bufferten) sjunker golvet mot MinMatt, som ligger där vid dubbla tiden (steg 6.1.5)
  forbrukDygn: 3, // förbrukningen av ett material räknas över ungefär så här många dygn (ett glidande medel, steg 6.2.14)
  materialDygn: 2, // bufferten av ett material räcker så här många dygn med den förbrukningen ...
  materialMatt: 3, // ... och taket är så här många gånger bufferten
});

// Trösklarna (steg 6.2.16): alla minsta tal för vad byn sparar eller vill ha, och gränserna för när byn prövar sig fram och
// bygger. Mängder i förrådets enheter
export const TROSKEL = balans('troskel', {
  // sparas till elden när något byggs eller tvinnas (bygg.ts, redskap.ts, sparas)
  ved: 6, // trä
  grenar: 15, // grenar
  torrgras: 6, // hö
  torrgrasKyla: 12, // hö som sparas till elden inför och under istiden och när det är kallt: en korg flätas först av det som är över (val.ts, redskap.ts)
  // tändmaterial (eld.ts)
  tandBrist: 12, // byn behöver samla tändmaterial när hö eller grenar är färre än så och elden är släckt
  tandVill: 12, // så mycket hö och grenar samlas det till när elden brinner
  tandVillSlocknad: 36, // ... och när elden är släckt
  // flintan (fynd.ts, redskap.ts)
  flintaMinsta: 1, flintaBehov: 2, // byn vill ha minst en flinta, och så här många flintor och yxor tillsammans
  flintaSparas: 1, // flintor som sparas att tända eld med: ett redskap av flinta görs bara av det som är över (receptet plus detta)
  repVill: 4, // så många rep byn vill ha (tvinnat eller från senor, redskap.ts)
  kolEld: 0.6, // kol hämtas ur den släckta elden när elden vill ha mindre än så här (val.ts)
  // gränserna för försök och bygge
  forsokMat: 1.1, // byn prövar sig fram bara när maten räcker minst så här många dygn ...
  forsokVed: 2, // ... och veden så här många (byn har ett överskott, teknik.ts)
  byggMatFran: 0.25, byggMatSpann: 0.9, byggMatMin: 0.1, // maten dämpar bygget: (matdygn - Fran) / Spann, aldrig under Min (val.ts)
});
// Redskapen och stationerna (steg 6.2.17): hur många byn vill ha är bufferten. Ett redskap räknas per vuxen från ALDER.vuxen
// (yxan från yxaFran)
export const VILLTAL = balans('vill', {
  spjutPerVuxna: 3, spjutMin: 1, spjutMax: 4, // byn vill ha ett spjut (och ett metspö) per så här många vuxna, minst Min och högst Max
  snoskorPer: 4, halsbandPer: 3,
  korgPerVuxna: 3, korgMin: 1, korgMax: 5, // ... en korg
  yxaPerVuxna: 4, yxaMin: 1, yxaMax: 3, yxaFran: 16, yxaBygge: 1, // ... en yxa, räknat på dem som är över Fran år, och Bygge till medan ett hus byggs (träden där det ska stå)
  knivar: 1, // ... så många knivar, och en till för varje tom knivplats vid en station (stationer.ts)
  spadar: 1, // så många benspadar byn vill ha (steg 2.7.2)
  slandor: 2,
  vattensackar: 1, // så många vattensäckar byn vill ha (steg 2.10.1)
  facklor: 3, // så många facklor byn vill ha när den kan göra dem (steg 6.3.6)
});
// det som lämnas kvar i förrådet till elden av slaget k när något byggs (bygg.ts, stationer.ts)
export const sparas = (k: string) => k === 'ved' ? TROSKEL.ved : k === 'grenar' ? TROSKEL.grenar : k === 'torrgras' ? TROSKEL.torrgras : 0;

export interface Forradsmal {
  dygn: number; // förrådets dygn räknas mot så här många (gånger försiktigheten) ...
  min: number; // ... och vid bufferten väger behovet så här mycket
  matt: number; // lyxtaket: så här många gånger bufferten
  minMatt: number; // vid taket väger behovet så här lite
  pabud: Pabud; // ledarens påbud om förrådet (styre.ts)
}
export const FORRADSMAL = {
  mat: { dygn: FORRAD.matDygn, min: FORRAD.matMin, matt: FORRAD.matMatt, minMatt: FORRAD.matMinMatt, pabud: 'matlager' },
  ved: { dygn: FORRAD.vedDygn, min: FORRAD.vedMin, matt: FORRAD.vedMatt, minMatt: FORRAD.vedMinMatt, pabud: 'vedlager' },
} as const satisfies Record<string, Forradsmal>;
export type Resurs = keyof typeof FORRADSMAL;

// bufferten i dygn för förrådsseden eller påbudet v, och extra (den som anar en hård vinter, motgang.ts)
export const onskatDygn = (k: Resurs, v: number, extra = 0) => { const r = FORRADSMAL[k]; return r.dygn * (1 + FORRAD.forsiktig * v + extra) * (FORRAD.behovTomt - r.min); };

// byns mål, räknade en gång i timmen (inte sparade: de räknas ur påbudet)
interface Mal { key: string; buffert: number; tak: number }
const cache = new WeakMap<State, Record<string, Mal>>();
function mal(s: State, k: Resurs): Mal {
  const v = pabud(s, FORRADSMAL[k].pabud), key = `${Math.floor(s.now / HOUR)}:${v}`, c = cache.get(s) ?? {};
  let m = c[k];
  if (!m || m.key !== key) { const b = onskatDygn(k, v); m = c[k] = { key, buffert: b, tak: FORRADSMAL[k].matt * b }; cache.set(s, c); }
  return m;
}
// bufferten och lyxtaket i dygn. extra: p:s aning om en hård vinter (räknas då direkt)
export const buffert = (s: State, k: Resurs, extra = 0) => extra ? onskatDygn(k, pabud(s, FORRADSMAL[k].pabud), extra) : mal(s, k).buffert;
export const lyxtak = (s: State, k: Resurs, extra = 0) => extra ? FORRADSMAL[k].matt * buffert(s, k, extra) : mal(s, k).tak;

// ---------- materialen (steg 6.2.14) ----------
interface Materialmal {
  min: (s: State) => number; // byn vill alltid ha minst så här mycket (tändmaterialet till elden, flintan)
}
const tand = (s: State) => s.fire.lit ? TROSKEL.tandVill : TROSKEL.tandVillSlocknad; // tändmaterialet invånarna vill ha
export const MATERIALMAL = {
  grenar: { min: tand },
  torrgras: { min: tand },
  sten: { min: () => 0 },
  flinta: { min: () => TROSKEL.flintaMinsta },
  virke: { min: () => 0 },
  lera: { min: () => 0 }, // steg 9.4.10: målet följer hur mycket lera byn gör av med
} as const satisfies Record<string, Materialmal>;
export type Materialslag = keyof typeof MATERIALMAL;
export const MATERIAL_LIST = Object.keys(MATERIALMAL) as Materialslag[];
export const arMaterial = (k: string): k is Materialslag => k in MATERIALMAL;

const r3 = (x: number) => Math.round(x * 1000) / 1000;
// det som tas ur förrådet av ett material räknas som förbrukat (lager.ts); bränslet till elden räknas inte (veden har sin rad)
export function forbrukat(s: State, k: string, n: number) {
  if (!arMaterial(k) || !n) return;
  const f = s.forbruk ??= {};
  f[k] = Math.max(0, (f[k] ?? 0) + n);
}
// en gång i timmen (timblocket i steg.ts): förbrukningen glöms långsamt, så att den följer de senaste dygnen
export function forbrukTimme(s: State) {
  const f = s.forbruk;
  if (!f) return;
  for (const k in f) { f[k] = r3(f[k] * (1 - 1 / (24 * FORRAD.forbrukDygn))); if (f[k] < 0.05) delete f[k]; } // under 0,05 skulle avrundningen hålla talet kvar för alltid
}
// så mycket av slaget k lagerplatserna rymmer
function rymmer(s: State, k: string) {
  let n = 0;
  for (const z of zonesOf(s)) if (allows(z, k)) for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) n += rymd(s, x, y, k);
  return n;
}
// bufferten och taket för varje material, räknade en gång i timmen (arbetsTimme i val.ts): b utan det minsta talet, t taket
export function materialTimme(s: State): Record<string, { b: number; t: number }> {
  const ut: Record<string, { b: number; t: number }> = {};
  for (const k of MATERIAL_LIST) {
    const b = r3((s.forbruk?.[k] ?? 0) / FORRAD.forbrukDygn * FORRAD.materialDygn);
    ut[k] = { b, t: r3(rymmer(s, k)) };
  }
  return ut;
}
// bufferten och taket för materialet k: det minsta talet räknas nu (elden kan ha tänts sedan timmens början)
export function materialBuffert(s: State, k: Materialslag, m = s.arbBehov?.mal?.[k]) {
  return Math.max(MATERIALMAL[k].min(s), m?.b ?? 0);
}
export function materialTak(s: State, k: Materialslag) {
  const m = s.arbBehov?.mal?.[k], b = materialBuffert(s, k, m);
  return Math.max(b, Math.min(FORRAD.materialMatt * b, m?.t ?? Infinity));
}
// vill byn ha mer av slaget k än det har (steg 7.2.18)? Målen före begränsningen mot platsen: lagret görs större bara för det som
// fattas upp till lyxtaket, inte för allt som råkar ligga bredvid
export function villHaMer(s: State, k: string) {
  if (k === 'ved' || k === 'grenar') return woodDays(s) < lyxtak(s, 'ved');
  if (isFood(k)) return foodDaysAll(s) < lyxtak(s, 'mat');
  if (k in MATERIALMAL) return amountOf(s, k) < FORRAD.materialMatt * Math.max(1, materialBuffert(s, k as Materialslag));
  return true;
}
// är materialet under bufferten (ett behov), eller vid eller över taket (ingen plockar det)? Det man bär räknas med
export const underBuffert = (s: State, k: Materialslag, extra = 0) => amountOf(s, k) + extra < materialBuffert(s, k);
export const overTak = (s: State, k: Materialslag, extra = 0) => amountOf(s, k) + extra >= materialTak(s, k);

// ---------- redskapen och stationerna (steg 6.2.17) ----------
// Bufferten för ett redskap är hur många byn vill ha av gruppen (GORS i redskap.ts). Under den är redskapet ett projekt
// (projekt.ts), och det görs bara som projekt: i arbetet som behöver det (withTools i val.ts, yxan till veden), på Förbättra
// eller som pyssel på fritiden. En ny grupp är en ny rad här.
const vuxna = (s: State, fran: number) => living(s).filter(p => ageOf(p, s.now) >= fran).length;
const perVuxna = (s: State, per: number, min: number, max: number, fran: number = ALDER.vuxen) => clamp(Math.floor(vuxna(s, fran) / per), min, max);
// ett spjut per tre vuxna, när någon väl har börjat fiska eller jaga
const spjutVill = (s: State) => (s.stat?.fiskeForsok ?? 0) > 0 || (s.stat?.prod_jakt ?? 0) > 0 ? perVuxna(s, VILLTAL.spjutPerVuxna, VILLTAL.spjutMin, VILLTAL.spjutMax) : 0;
const ortkokKan = (s: State) => living(s).some(p => (p.tek?.ortkok ?? 0) >= 1); // någon kan koka i örtköket (steg 9.4.14)
export const REDSKAPMAL: Record<string, (s: State) => number> = {
  spjut: spjutVill,
  metspo: spjutVill, // ett metspö per spjut
  nat: s => Math.min(2, Math.ceil(spjutVill(s) / 3)), // ett nät på tre fiskare, högst två (steg 9.6.16)
  korg: s => perVuxna(s, VILLTAL.korgPerVuxna, VILLTAL.korgMin, VILLTAL.korgMax),
  nal: s => living(s).some(p => p.skill.lakekonst >= 2) ? 1 : 0, // en bennål när någon kan sy ett sår (steg 9.5.15)
  krycka: s => protesVill(s, 'krycka'), traben: s => protesVill(s, 'traben'), krok: s => protesVill(s, 'krok'), ogonlapp: s => protesVill(s, 'ogonlapp'), // proteserna (steg 9.5.11, protes.ts)
  naverask: s => ortkokKan(s) ? TILLVERKA.koka_salva.vill + TILLVERKA.koka_lim.vill : 0, // näveraskarna (steg 9.4.14): salvan och limmet som byn vill ha förvaras i dem
  lerkruka: s => living(s).filter(p => villPynt(s, p, 'kruka')).length + (nTools(s, 'vattensack') < 1 ? 1 : 0) + (ortkokKan(s) ? TILLVERKA.koka_tjara.vill : 0), // och tjäran i stora krukor (steg 9.4.14) // lerkrukorna (steg 9.4.12): de som vill ha en kruka som pynt, och en att bära vatten i när byn saknar en vattensäck
  kniv: s => VILLTAL.knivar + tommaPlatser(s, 'kniv'), // och en till för en tom knivplats vid slaktbänken
  bensyl: s => tommaPlatser(s, 'bensyl'), // en till slöjdbänken (steg 2.3.2)
  rock: s => living(s).length, // en per person (steg 2.3.2), av vilket material som helst (klader.ts)
  skor: s => living(s).length,
  // steg 7.7: det som gör livet bättre, när någon kan göra det och materialet finns
  byxor: s => living(s).length, mossa: s => living(s).length,
  snoskor: s => Math.ceil(living(s).length / VILLTAL.snoskorPer), // några par till dem som går ut i snön
  halsband: s => Math.ceil(living(s).length / VILLTAL.halsbandPer), // det är få som bär smycken
  // ledarens mantel (steg 8.3.14): byn gör en åt den som suttit en tidsålder med mer än hälften av legitimiteten
  prastdrakt: s => (s.tron ?? []).filter(t => t.prast !== undefined).length, tecken: s => s.tron?.some(t => t.slut === undefined && (t.niva ?? 0) >= 2) ? Math.ceil(living(s).filter(p => p.tro !== undefined).length / 3) : 0, // system 8.5
  mask: s => (s.tron ?? []).filter(t => t.prast !== undefined && (t.sk?.prast ?? 100) < 34).length,
  mantel: s => s.styre?.sedan !== undefined && s.now - s.styre.sedan >= WEEK && legitimitet(s).v > 0.5 ? 1 : 0,
  tunika: s => amountOf(s, 'lintyg') + amountOf(s, 'ylle') > 0 ? living(s).length : 0, skjorta: s => amountOf(s, 'lintyg') + amountOf(s, 'ylle') > 0 ? living(s).length : 0, // ylle sedan steg 9.8.14
  kappa: s => amountOf(s, 'ylle') > 0 ? living(s).length : 0, sjal: s => amountOf(s, 'ylle') > 0 ? living(s).length : 0, // ullens plagg (steg 9.8.15)
  balte: s => living(s).length, // ett per person (steg 2.3.3)
  axelrem: spjutVill, // en per spjut (steg 7.1.2)
  ryggsack: s => perVuxna(s, VILLTAL.korgPerVuxna, VILLTAL.korgMin, VILLTAL.korgMax), // lika många som korgarna, till dem som samlar (steg 7.1.3)
  rustning: s => Math.ceil(living(s).length / 4), hjalm: s => Math.ceil(living(s).length / 4), skold: s => Math.ceil(living(s).length / 4), bage: () => 2, slunga: () => 2, horn: () => 1, // vapnen och rustningen (system 8.7)
  skara: s => (s.angar?.length ?? 0) > 0 ? 1 : 0, // en skära när byn har en slåtteräng (steg 9.8.9)
  benspade: () => VILLTAL.spadar, // till latrinen och rötterna (steg 2.7.2)
  fackla: () => VILLTAL.facklor, // till den som går ut i mörkret (steg 6.3.6, ljus.ts)
  talgljus: s => ljusPlatser(s).length, // ett till varje bord och hylla inne där folk är vakna i mörker (steg 6.3.8, ljus.ts)
  slanda: () => VILLTAL.slandor, // till dem som spinner, och en i vävstolen (steg 7.7.8)
  vattensack: () => VILLTAL.vattensackar, // till den som inte kan gå (steg 2.10.1)
  boll: s => sportFor(s, 'boll'), slagtra: s => sportFor(s, 'slagtra'), mal: s => sportFor(s, 'mal'), // en av varje när byn har vuxna nog till sporten (sport.ts, steg 4.3.1.2)
  trumma: s => tommaPlatser(s, 'trumma'), benflojt: s => tommaPlatser(s, 'benflojt'), lyra: s => tommaPlatser(s, 'lyra'), // ett av varje till scenen (steg 4.3.2.2)
  // en yxa per fyra över yxaFran år, och en till medan ett hus byggs (för träden där det ska stå)
  yxa: s => perVuxna(s, VILLTAL.yxaPerVuxna, VILLTAL.yxaMin, VILLTAL.yxaMax, VILLTAL.yxaFran) + (s.hus?.some(h => !h.klar) ? VILLTAL.yxaBygge : 0),
};
// hur många byn vill ha av gruppen g
export const villAv = (s: State, g: string) => REDSKAPMAL[g](s);
// en station av sorten k: bufferten är en färdig. Halmbäddarna (det byn kan ha flera av, steg 2.2.5): en per den som sover
// under tak; borden (steg 2.2.15) en plats per invånare; förvaringen, pyntet, brasorna, latrinen och torkställningen efter
// sina egna mått. Bristen är hur stor del av bufferten som saknas (0 till 1), som projektets brist (projekt.ts)
// En halvbyggd station (en kista, ett pynt) görs klar även när ingen längre vill ha en ny: bristen är då 1
const harBrist = (s: State) => { const n = (s.eldar ?? []).filter(f => f.hearth === 'hard').length, hus = (s.hus ?? []).filter(h => h.klar && !(BYGGNADER as Record<string, { omkring?: boolean }>)[fnId(h)]?.omkring).length; /* torkhuset och vedboden har ingen härd */ return n < hus ? 0.5 : 0; };
export function stationBrist(s: State, k: StationSlag) {
  const d: StationDef = STATIONER[k];
  if (!d.brasa && stationerOf(s).some(t => t.k === k && !isKlar(t))) return 1;
  if (d.hard) return harBrist(s); // härden: ett hus där folk sover utan en härd (steg 7.5.3)
  return d.pynt ? pyntBrist(s, k) : d.brasa ? brasaBrist(s) : d.sover ? (living(s).length ? utanBadd(s) / living(s).length : 0) : d.platser ? bordBrist(s, k)
    : d.forvar ? forvarBrist(s, k) : d.gor.includes('toa') ? latrinBrist(s) : d.gor.includes('torka') ? torkBrist(s) : harStation(s, k) ? 0 : 1;
}
