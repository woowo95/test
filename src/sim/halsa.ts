import { gasterNu, gastLever } from './gast';
import { han, honom } from './ord';
import { personHand } from './personlogg';
import { utanforByn } from './omrade';
import { UPPV, upplev } from './uppvaxt';
import { gen } from './ord';
import { nyKvarleva } from './kvarlevor';
import { gebinamn } from './berattelser';
// Kroppen (steg 2.5.1). Kroppen har tio delar (KROPPSDELAR): huvud, bål, två armar, två händer, två ben och två fötter (Björn, efter
// v55). Olyckor i farliga arbeten (OLYCKOR) ger skador (SKADOR) i en del: ett sår blöder tills det levrat sig, gör ont och
// gör delen sämre tills det läkt. Den som skadat benen eller fötterna går långsammare (rorlighet), den som skadat armarna eller
// händerna arbetar långsammare (handighet). Blodet (p.blod) kommer tillbaka när man inte blöder och är mätt och otörstig; under
// HALSA.blodDod förblöder man. Mycket svåra skador i huvudet eller bålen dödar direkt, men det är sällsynt. Hälsan i
// gränssnittet och valet (halsa) är en sammanfattning: den gamla hälsan (svält, kyla, törst, sjukdom), blodet och smärtan.
// Vården (steg 2.5.2): ett öppet sår kan bli infekterat (mindre risk med ett förband), och en infektion som inte rengörs växer
// till kallbrand och döden. Vården är en egen handling (varda): man trycker på ett sår som blöder, lägger ett förband av mossa
// (saker.ts; den hittas när man letar i naturen och ibland på ett fällt träd) och rengör ett infekterat sår, på sig själv eller
// på någon annan. Den som inte kan gå kravlar hem, långsamt, eller bärs hem av den som vårdar hen. Man läker fortare när man
// vilar eller sover, och fortare inne. Smuts och hygien kommer med hygienen (2.7). Fliken Hälsa (steg 2.5.3) läser skadeLista,
// delSkada och förmågorna (FORMAGOR)
import { ACTS } from './handlingar';
import { ALDER, KROPP, ageOf, alive, byId, count, forstaGang, franMitt, gjort, isParent, livet, living, log, ovning, raddAkt, think } from './folk';
import { amountOf, avbryt } from './lager';
import { fearPlace } from './minne';
import { SJUK, foljd } from './sjukdom';
// febern av en sjukdom: medvetandet utan klockan (sjukdomen vet när tecknen kommit, st)
const sjukFeber = (p: Person) => p.sjuk?.st !== undefined ? foljd(p, p.sjuk.tecken, 'feber') : 0;
import { TORST } from './torst';
import { getable, takeMaterial } from './behov';
import { bedFor } from './bygg';
import { freeNear, roomAt } from './byggnad';
import { isForest, tileOf } from './mark';
import { eldPlats } from './karta';
import { chance, clamp, pick, rnd } from './slump';
import { Act, DAY, HOUR, HOUR_S, Person, Skill, State, Stock, Task } from './typer';
import { balans } from './balans';
import { GANG } from './gang';
import { blodDroppar, blodas } from './blod';
import { lakFaktor, styrkaFaktor, yrselFaktor } from './naring';
import type { Dodsorsak } from './liv';
import { ledareOf } from './styre';
import { notis } from './notiser';
import { tingOf } from './agande';
import { SAKER } from './saker';

// ---------- balanstal (regel 8) ----------
export const HALSA = balans('halsa', {
  blodTim: 0.6, // ett öppet sår av grad 1 (och blod 1 i SKADOR) tar så här mycket blod i timmen (1 = allt blod) ...
  levrar: 1.5, // ... och har levrat sig efter levrar × (0,5 + graden) timmar
  // blödningens tre storlekar (steg 9.5.14): ett litet sår (grad under smaSar) levrar sig fort, ett medelstort (under storSar)
  // långsamt (medelLevrar gånger längre), och ett stort inte alls; när tiden kvar till förblödning är under kortTim syns den
  smaSar: 0.3, storSar: 0.6, medelLevrar: 3, kortTim: 1,
  blodDod: 0.4, // under så här mycket blod förblöder man
  blodTillbaka: 48, // timmar för blodet att komma tillbaka helt för den som inte blöder och är mätt och otörstig
  dodGrad: 0.95, // en skada i huvudet eller bålen av minst den här graden dödar direkt (sällsynt)
  radd: 0.5, // en skada av minst den här graden gör de som såg den rädda för platsen
  avbryt: 0.3, // från den här graden slutar man arbeta
  logg: 0.4, // skador från den här graden står i loggen
  lakSamre: 1 / 3, // den som är hungrig eller törstig läker så här mycket långsammare
  smarta: 0.6, // hälsan som visas är högst 1 − smarta × smärtan ...
  smartaHumor: 0.2, // ... och smärtan sänker humöret så här mycket (gånger smärtan) ...
  ontGrans: 0.2, // ... från den här smärtan (tanken "Har ont", och texten i personrutan)
  minst: 0.2, // händigheten går aldrig under detta (rörligheten aldrig under GANG.rorGolv, gang.ts)
  skicklig: 25, // risken för en olycka gånger 1 − färdigheten / skicklig ...
  smidig: 0.3, // ... och gånger 1 − smidig × (smidigheten − 10) / 10 (steg 3.7.6)
  // vården (steg 2.5.2)
  infRisk: 0.01, // chansen i timmen att ett öppet sår blir infekterat ...
  fastInf: 4, // ... gånger detta medan ett spjut sitter kvar i såret (steg 3.7.7)
  forband: 0.25, // ... gånger detta med ett förband av mossa ...
  remsa: 0.1, // ... och med en remsa av skinn eller lin (steg 9.5.15)
  avsnoraTim: 2, // en avsnörning som sitter längre än så här många timmar skadar delen för alltid (steg 9.5.15)
  syLak: 4, // sömnaden kräver så här mycket i Läkekonst
  infTim: 36, // timmar för en infektion som inte rengörs att växa från ingenting till döden
  infLak: 8, // timmar för en rengjord infektion att gå tillbaka helt ...
  renTim: 6, // ... och så länge ett rengjort sår håller sig rent
  lakeRen: 0.05, lakeOvning: 0.3, // läkekonsten (steg 9.5.7): rent så här mycket längre per poäng, och så mycket övning per vårdtillfälle
  kallbrand: 0.6, // från här är infektionen kallbrand, och att rengöra hjälper inte längre
  infSmarta: 0.5, // infektionen gör så här ont (gånger infektionen)
  vardFel: 0.15, // man trycker på och lägger förband på sår av minst den här graden
  vardMin: 5, // minuter att trycka på såren, lägga förband och rengöra
  vardR: 30, // man går för att vårda den som är högst så här många rutor bort
  ontGang: 0.3, // full smärta gör gången så här mycket långsammare (steg 9.5.12)
  vardHand: 0.5, // den som vårdar någon annan har minst så här bra händer
  hemma: 3, // så nära byns område är man hemma (rutor, 0 innanför): längre bort kravlar den som inte kan gå, eller bärs
  krypFel: 0.6, // den som har ett ben eller en fot som är så här skadad kan inte gå, utan kravlar (med GANG.krypFart, gang.ts)
  buren: 6, // timmar som den skadade som mest väntar på att bäras hem
  vila: 1.5, // man läker så här mycket fortare när man sover eller vilar ...
  inne: 1.25, // ... och så här mycket fortare till inne i ett hus
  vilaOnt: 0.5, // den som har så här ont, eller ett infekterat sår, vilar hellre än arbetar
  mossaTakt: 1, // så mycket mossa man hittar i timmen när man letar i skogen ...
  mossaUte: 0.3, // ... och så stor del av det utanför skogen
  mossaVill: 8, // man tar med sig mossa hem tills byn har så här mycket
  mossaTrad: 0.3, // chansen att ett fällt träd har mossa på sig ...
  mossaStam: 2, // ... och så mycket
  finChans: 0.25, // chansen att en skada på en del hamnar på en av de finare delarna under den (steg 8.2.1)
  forloraGrad: 0.9, // ett skärsår eller bett av minst den här graden på en del som sticker ut ...
  forloraChans: 0.15, // ... tar delen med den här chansen (steg 8.2.3)
  forfrysVarm: 0.15, // under den här värmen kan fingrar och tår frysa ...
  forfrysRisk: 0.15, // ... med den här risken i timmen ...
  forfrysGrad: 0.5, // ... en förfrysning av den här graden; förlorad vid forloraGrad (steg 8.2.3)
  arrGrad: 0.35, // en skada av minst den här graden kan ge ett ärr när den läker ...
  arrChans: 0.5, // ... med den här chansen (steg 8.2.4)
  arrFulare: 0.7, // ... de flesta blir fulare av det ...
  arrSkonhet: 1.2, // ... så här mycket skönhet upp eller ner, av 20
  arrBinamn: 0.25, // ... och ett ärr i ansiktet ger så här ofta ett binamn
  menGrad: 0.6, // en skada av minst den här graden kan läka fel ...
  menChans: 0.3, // ... med den här chansen
  menFel: 0.25, // ... och delen blir så här mycket sämre för alltid
  menOnt: 0.15, // ... eller så här mycket kronisk smärta
  medSmarta: 0.35, medBlod: 0.6, medInf: 0.3, medTrott: 0.12, medTorst: 0.25, medSvalt: 0.25, medHuvud: 0.5, // så mycket medvetandet sjunker av var sak (steg 8.2.5)
  medLag: 0.7, // under det här medvetandet går arbetet långsammare ...
  medArbete: 0.5, // ... ned till så här fort när medvetandet är noll
  svimma: 0.2, // under det här medvetandet svimmar man (steg 8.2.6) ...
  vakna: 0.3, // ... och man vaknar över det här
});

// ---------- kroppsdelarna (registret) ----------
// livsviktig = en mycket svår skada där dödar direkt; rorlighet och handighet = hur mycket delen betyder för gången och
// händerna (summan över alla delar är 1)
interface DelDef { namn: string; i: string; livsviktig?: true; rorlighet?: number; handighet?: number; syn?: number; horsel?: number; tal?: number; under?: string; ute?: true }
export const KROPPSDELAR = {
  huvud: { namn: 'Huvud', i: 'huvudet', livsviktig: true },
  bal: { namn: 'Bål', i: 'bålen', livsviktig: true },
  armV: { namn: 'Vänster arm', i: 'vänstra armen', handighet: 0.2, ute: true },
  armH: { namn: 'Höger arm', i: 'högra armen', handighet: 0.2, ute: true },
  handV: { namn: 'Vänster hand', i: 'vänstra handen', handighet: 0.2, ute: true },
  handH: { namn: 'Höger hand', i: 'högra handen', handighet: 0.2, ute: true },
  benV: { namn: 'Vänster ben', i: 'vänstra benet', rorlighet: 0.6, ute: true }, // benet och foten drar ner gången tydligt (steg 9.5.12)
  benH: { namn: 'Höger ben', i: 'högra benet', rorlighet: 0.6, ute: true },
  fotV: { namn: 'Vänster fot', i: 'vänstra foten', rorlighet: 0.45, ute: true }, // med tårna 0,5
  fotH: { namn: 'Höger fot', i: 'högra foten', rorlighet: 0.45, ute: true },
  // de finare delarna (steg 8.2.1): en skada på delen under kan hamna här (finDel)
  ogaV: { namn: 'Vänster öga', i: 'vänstra ögat', under: 'huvud', syn: 0.5 },
  ogaH: { namn: 'Höger öga', i: 'högra ögat', under: 'huvud', syn: 0.5 },
  oraV: { namn: 'Vänster öra', i: 'vänstra örat', under: 'huvud', horsel: 0.5, ute: true },
  oraH: { namn: 'Höger öra', i: 'högra örat', under: 'huvud', horsel: 0.5, ute: true },
  kake: { namn: 'Käke', i: 'käken', under: 'huvud', tal: 1 },
  fingrarV: { namn: 'Fingrar på vänster hand', i: 'fingrarna på vänster hand', under: 'handV', handighet: 0.1, ute: true },
  fingrarH: { namn: 'Fingrar på höger hand', i: 'fingrarna på höger hand', under: 'handH', handighet: 0.1, ute: true },
  tarV: { namn: 'Tår på vänster fot', i: 'tårna på vänster fot', under: 'fotV', rorlighet: 0.05, ute: true },
  tarH: { namn: 'Tår på höger fot', i: 'tårna på höger fot', under: 'fotH', rorlighet: 0.05, ute: true },
  hjarta: { namn: 'Hjärta', i: 'hjärtat', under: 'bal', livsviktig: true },
  lungor: { namn: 'Lungor', i: 'lungorna', under: 'bal', livsviktig: true },
  lever: { namn: 'Lever', i: 'levern', under: 'bal', livsviktig: true },
  mage: { namn: 'Mage', i: 'magen', under: 'bal' },
} satisfies Record<string, DelDef>;
export type Kroppsdel = keyof typeof KROPPSDELAR;
const DEL: Record<Kroppsdel, DelDef> = KROPPSDELAR;
export const ARMAR: Kroppsdel[] = ['armV', 'armH'], HANDER: Kroppsdel[] = ['handV', 'handH'], BEN: Kroppsdel[] = ['benV', 'benH'], FOTTER: Kroppsdel[] = ['fotV', 'fotH'];

// ---------- skadorna (registret) ----------
// blod = hur mycket såret blöder vid grad 1, smarta = hur ont det gör, fel = hur mycket sämre delen blir, lakTim = timmar
// för en skada av grad 1 att läka för den som är mätt och otörstig, tecken = symbolen i fliken Hälsa (platshållare)
interface SkadaDef { namn: string; ett: string; tecken: string; blod: number; smarta: number; fel: number; lakTim: number }
export const SKADOR = {
  skarsar: { namn: 'Skärsår', ett: 'ett skärsår', tecken: '{sym_skarsar}', blod: 1, smarta: 0.5, fel: 0.4, lakTim: 24 },
  bett: { namn: 'Bett', ett: 'ett bett', tecken: '🦷', blod: 0.8, smarta: 0.6, fel: 0.5, lakTim: 36 },
  klos: { namn: 'Klösmärken', ett: 'klösmärken', tecken: '🐾', blod: 0.6, smarta: 0.4, fel: 0.3, lakTim: 24 },
  benbrott: { namn: 'Benbrott', ett: 'ett benbrott', tecken: '🦴', blod: 0, smarta: 1, fel: 1, lakTim: 120 },
  krossar: { namn: 'Krossår', ett: 'ett krossår', tecken: '{sym_krossar}', blod: 0.4, smarta: 0.7, fel: 0.7, lakTim: 48 },
  blamarke: { namn: 'Blåmärke', ett: 'ett blåmärke', tecken: '🟣', blod: 0, smarta: 0.4, fel: 0.2, lakTim: 24 }, // efter ett slag (steg 3.2.3)
  sticksar: { namn: 'Sticksår', ett: 'ett sticksår', tecken: '🗡️', blod: 1.5, smarta: 0.7, fel: 0.5, lakTim: 48 }, // ett djupt stick (steg 3.7.2, strid.ts)
  hjarnskakning: { namn: 'Hjärnskakning', ett: 'en hjärnskakning', tecken: '💫', blod: 0, smarta: 0.6, fel: 0.3, lakTim: 48 }, // ett hårt slag mot huvudet
  forfrysning: { namn: 'Förfrysning', ett: 'en förfrysning', tecken: '🥶', blod: 0, smarta: 0.5, fel: 0.6, lakTim: 72 }, // av kylan (steg 8.2.3)
  brannskada: { namn: 'Brännskada', ett: 'en brännskada', tecken: '🔥', blod: 0, smarta: 0.8, fel: 0.4, lakTim: 72 }, // av elden i en eldsvåda (steg 3.8.5, brand.ts)
} satisfies Record<string, SkadaDef>;
export type SkadaTyp = keyof typeof SKADOR;
const SKADA: Record<SkadaTyp, SkadaDef> = SKADOR;
// en skada: del, typ, grad (0–1, sjunker när den läker) och blödningen kvar (1 = som nyss, 0 = levrad).
// f = ett förband av mossa ligger på, inf = infektionen (0–1; vid 1 dör man), ren = rengjord till den tiden (steg 2.5.2)
export interface Men { d: Kroppsdel; fel: number; ont: number }
export interface Skada { d: Kroppsdel; k: SkadaTyp; g: number; b: number; g0?: number; f?: 1 | 2; inf?: number; ren?: number; fast?: 1; salva?: number; av?: number; sydd?: 1 } // f: 1 mossa, 2 en remsa (steg 9.5.15); av = avsnört sedan den tiden, sydd = såret är sytt // salva = läkesalvan på såret, med salvans kvalitet (steg 9.5.10) // fast = ett spjut sitter kvar i såret (steg 3.7.7)
const oppet = (w: Skada) => SKADA[w.k].blod > 0; // ett öppet sår (inte ett benbrott)

// ---------- olyckorna (registret) ----------
// per handling, medan den görs: risk per timme (mindre för den skicklige), skadorna och delarna som kan drabbas, gradens
// spann (de flesta skador är lätta: min + slump² × (max − min)), dödsorsaken om den dödar direkt och när det hände
interface OlyckaDef { risk: number; typer: SkadaTyp[]; delar: Kroppsdel[]; min: number; max: number; dod: Dodsorsak; nar: string }
export const OLYCKOR: Partial<Record<Act, OlyckaDef>> = {
  jakt: { risk: 0.01, typer: ['bett', 'klos', 'benbrott'], delar: [...ARMAR, ...HANDER, ...BEN, ...FOTTER, 'bal'], min: 0.1, max: 1, dod: 'jakt', nar: 'under en jakt' },
  falla: { risk: 0.03, typer: ['krossar', 'benbrott'], delar: [...BEN, ...FOTTER, ...ARMAR, 'huvud'], min: 0.15, max: 1, dod: 'olycka', nar: 'när ett träd föll' },
  hugga: { risk: 0.005, typer: ['skarsar'], delar: [...FOTTER, ...BEN], min: 0.1, max: 0.9, dod: 'olycka', nar: 'med yxan' },
  slakta: { risk: 0.01, typer: ['skarsar'], delar: HANDER, min: 0.05, max: 0.8, dod: 'olycka', nar: 'när hen slaktade' },
  rensa: { risk: 0.005, typer: ['skarsar'], delar: HANDER, min: 0.05, max: 0.6, dod: 'olycka', nar: 'när hen rensade fisk' },
  kniv: { risk: 0.01, typer: ['skarsar'], delar: HANDER, min: 0.05, max: 0.7, dod: 'olycka', nar: 'när hen slog flinta' },
};

// ---------- det kroppen ger ----------
// hur mycket sämre en del är just nu (0 = hel, 1 = går inte att använda)
export function delFel(p: Person, d: Kroppsdel) {
  if (p.saknas?.includes(d)) return PROTES_FEL[p.protes?.[d] ?? ''] ?? 1; // en förlorad del kommer inte tillbaka (steg 8.2.3), men en protes ger tillbaka en del (steg 9.5.11)
  let f = 0;
  for (const w of p.skador ?? []) if (w.d === d) f += SKADA[w.k].fel * w.g;
  for (const m of p.men ?? []) if (m.d === d) f += m.fel; // det som läkte fel (steg 8.2.4)
  return Math.min(1, f);
}
// hur mycket en förlorad del med en protes fattas (steg 9.5.11, PROTESER i protes.ts): träbenet och kryckan ger tillbaka ungefär hälften
// av gången, kroken en del av greppet, och ögonlappen är bara utseende
export const PROTES_FEL: Record<string, number> = { traben: 0.25, krycka: 0.25, krok: 0.6, ogonlapp: 1 };
const harFel = (p: Person) => !!(p.skador?.length || p.saknas?.length || p.men?.length);
type Vikt = 'rorlighet' | 'handighet' | 'syn' | 'horsel' | 'tal';
function forlust(p: Person, vikt: Vikt) {
  if (!harFel(p)) return 1;
  let v = 0;
  for (const d of Object.keys(DEL) as Kroppsdel[]) v += (DEL[d][vikt] ?? 0) * delFel(p, d);
  return Math.max(vikt === 'rorlighet' ? GANG.rorGolv : vikt === 'handighet' ? HALSA.minst : 0, 1 - v);
}
// synen, hörseln och talet (steg 8.2.2), 0–1, räknade ur ögonen, öronen och käken
export const syn = (p: Person) => forlust(p, 'syn');
export const horsel = (p: Person) => forlust(p, 'horsel');
export const tal = (p: Person) => forlust(p, 'tal');
// karisman och skaldskapet gånger detta: blicken, att höra och att tala (steg 8.2.2). Räknas när kroppen ändras (folk.ts läser det)
export const uppdateraSinnen = (p: Person) => { const v = (syn(p) + horsel(p) + tal(p)) / 3; if (v < 1) p.sinnen = v; else delete p.sinnen; };
// skadade ben och fötter: gången gånger detta, aldrig under GANG.rorGolv (steg 3.10.10)
export const rorlighetSkador = (p: Person) => forlust(p, 'rorlighet');
// gången gånger detta (steg.ts): skadorna och yrseln av brist på mineraler (steg 2.6.2)
export const rorlighet = (p: Person) => forlust(p, 'rorlighet') * yrselFaktor(p) * (1 - HALSA.ontGang * smarta(p)); // smärtan drar också ner gången (steg 9.5.12)
// den som har ett ben eller en fot som är för skadad kan inte gå, utan kravlar (steg 2.5.2)
export const GADELAR: readonly Kroppsdel[] = [...BEN, ...FOTTER]; // delarna man går med
// ett förlorat ben eller en fot: man går ändå, sämre, så länge det andra benet och den andra foten håller. Den som svimmat går inte
export const kanGa = (p: Person) => !p.svimmat && (!harFel(p) || !GADELAR.some(d => !p.saknas?.includes(d) && delFel(p, d) >= HALSA.krypFel)) && (p.saknas?.filter(d => GADELAR.includes(d)).length ?? 0) < 2;
export const hemma = (s: State, p: Person) => utanforByn(s, Math.floor(p.x), Math.floor(p.y)) <= HALSA.hemma;
const infektion = (p: Person) => { let v = 0; for (const w of p.skador ?? []) v = Math.max(v, w.inf ?? 0); return v; };
// arbetet gånger detta (workRate i ekonomi.ts): skadorna och styrkan, som sjunker av brist på protein och mineraler (steg 2.6.2)
export const handighet = (p: Person) => forlust(p, 'handighet') * styrkaFaktor(p) * medArbete(p);
// medvetandet (steg 8.2.5), 0–1: smärtan, blodet, febern av en infektion, tröttheten, törsten, svälten och skador i huvudet
export const medDelar = (p: Person) => {
  const blod = 1 - (p.blod ?? 1), ut: { namn: string; v: number }[] = [];
  const lagg = (namn: string, v: number) => { if (v > 0.005) ut.push({ namn, v: -v }); };
  lagg('Smärta', HALSA.medSmarta * smarta(p));
  lagg('Blodförlust', HALSA.medBlod * clamp(blod / (1 - HALSA.blodDod), 0, 1));
  lagg('Feber av en infektion', HALSA.medInf * infektion(p));
  lagg('Feber av en sjukdom', HALSA.medInf * sjukFeber(p)); // steg 9.5.4
  lagg('Trötthet', HALSA.medTrott * (1 - p.rest));
  lagg('Törst', HALSA.medTorst * clamp(1 - p.torst / TORST.laker, 0, 1));
  lagg('Svält', HALSA.medSvalt * clamp(1 - p.hunger / KROPP.lakerMat, 0, 1));
  lagg('Skador i huvudet', HALSA.medHuvud * delFel(p, 'huvud'));
  return ut;
};
// medvetandet som tal: samma räkning utan listan, eftersom det frågas i varje arbetsbit
export function medvetande(p: Person) {
  let v = 1 - HALSA.medTrott * (1 - p.rest) - HALSA.medTorst * clamp(1 - p.torst / TORST.laker, 0, 1) - HALSA.medSvalt * clamp(1 - p.hunger / KROPP.lakerMat, 0, 1);
  if (p.blod !== undefined && p.blod < 1) v -= HALSA.medBlod * clamp((1 - p.blod) / (1 - HALSA.blodDod), 0, 1);
  if (p.skador?.length || p.men?.length || p.saknas?.length) v -= HALSA.medSmarta * smarta(p) + HALSA.medInf * infektion(p) + HALSA.medHuvud * delFel(p, 'huvud');
  if (p.sjuk) v -= HALSA.medInf * sjukFeber(p); // febern av en sjukdom (steg 9.5.4)
  return clamp(v, 0, 1);
}
const medArbete = (p: Person) => { const m = medvetande(p); return m >= HALSA.medLag ? 1 : HALSA.medArbete + (1 - HALSA.medArbete) * m / HALSA.medLag; };
export function smarta(p: Person) {
  let v = 0;
  for (const w of p.skador ?? []) v += SKADA[w.k].smarta * w.g + HALSA.infSmarta * (w.inf ?? 0);
  for (const m of p.men ?? []) v += m.ont; // kronisk smärta (steg 8.2.4)
  return Math.min(1, v);
}
// sårets storlek i blödningen (steg 9.5.14): litet, medelstort eller stort
export const sarStorlek = (w: Skada) => w.g < HALSA.smaSar ? 'litet' : w.g < HALSA.storSar ? 'medelstort' : 'stort';
// timmar tills hen förblöder med den blödning hen har nu (Infinity när ingen blöder). Räknas varje slag (kortet och notisen)
export function tidKvar(p: Person) { const b = blodning(p); return b > 0 ? Math.max(0, ((p.blod ?? 1) - HALSA.blodDod) / b) : Infinity; }
// blodet personen förlorar i timmen just nu
export function blodning(p: Person) {
  let v = 0;
  for (const w of p.skador ?? []) v += HALSA.blodTim * SKADA[w.k].blod * w.g * w.b;
  return v;
}
// hälsan som visas och som valet läser: den gamla hälsan (svält, kyla, törst, sjukdom), blodet och smärtan
export function halsa(p: Person) {
  const b = p.blod ?? 1;
  if (b >= 1 && !p.skador?.length && !p.men?.length) return p.health;
  return Math.max(0, Math.min(p.health, (b - HALSA.blodDod) / (1 - HALSA.blodDod), 1 - HALSA.smarta * smarta(p), 1 - infektion(p)));
}
// mätt och inte törstig: såren läker fullt, blodet kommer tillbaka och hälsan stiger (halsaLage i steg.ts)
export const lakerFullt = (p: Person) => p.hunger > KROPP.lakerMat && p.torst > TORST.laker;
// ---------- det som syns (personrutan och fliken Hälsa, steg 2.5.3) ----------
// varje skada som en rad: symbolen, vad och var, hur svår, om den blöder, vad som är gjort och hur det går. Personrutan och
// fliken Hälsa läser bara den, så att de aldrig räknar på olika sätt. Timmarna kvar räknar inte med vilan (vilaLak)
// ikon och vard är pixelbildernas nycklar i ikoner.ts (skadan, och förbandet och rengjort)
export interface SkadeRad { d: Kroppsdel; tecken: string; ikon: string; namn: string; grad: string; bloder: boolean; gjort: string[]; vard: string[]; gar: string; battre: boolean }
export function skadeLista(p: Person, now: number): SkadeRad[] {
  const lak = (lakerFullt(p) ? 1 : HALSA.lakSamre) * lakFaktor(p);
  const fast = (d: Kroppsdel, namn: string, tecken: string, gar: string): SkadeRad => ({ d, tecken, ikon: 's_' + tecken, namn, grad: 'bestående', bloder: false, gjort: [], vard: [], gar, battre: false });
  return [...(p.saknas ?? []).map(d => fast(d, `Saknar ${DEL[d].i}`, '🦴', 'kommer inte tillbaka')), ...(p.men ?? []).map(m => fast(m.d, `${MEN_NAMN(m)} (${DEL[m.d].i})`, '🩹', 'läkte fel, blir inte bättre')), ...(p.skador ?? []).map(w => {
    const sk = SKADA[w.k], ren = (w.ren ?? 0) > now, kall = (w.inf ?? 0) >= HALSA.kallbrand;
    const gar = w.inf === undefined ? `läker, ungefär ${Math.ceil(w.g * sk.lakTim / lak)} timmar kvar` : kall ? 'kallbrand, blir sämre' : ren ? 'infekterat men rengjort, blir bättre' : 'infekterat, blir sämre';
    return {
      d: w.d, tecken: w.inf === undefined ? sk.tecken : kall ? '☠️' : '🦠', ikon: 's_' + (w.inf === undefined ? w.k : kall ? 'kall' : 'inf'), namn: `${sk.namn} i ${DEL[w.d].i}`,
      grad: w.g >= HALSA.radd ? 'mycket svårt' : w.g >= HALSA.avbryt ? 'svårt' : 'lätt', bloder: w.b > 0 && oppet(w),
      gjort: [...w.f ? ['förband av mossa'] : [], ...ren ? ['rengjort'] : []], vard: [...w.f ? ['s_forb'] : [], ...ren ? ['s_ren'] : []], gar, battre: w.inf === undefined || (ren && !kall),
    };
  })];
}
const MEN_NAMN = (m: Men) => m.ont ? 'Kronisk smärta' : GADELAR.includes(m.d) ? 'Haltar' : DEL[m.d].syn ? 'Sämre öga' : 'Stel';
export const skadeText = (p: Person, now: number) => skadeLista(p, now).map(r => `${r.namn}${r.grad === 'lätt' ? '' : ', ' + r.grad}${r.bloder ? ', blöder' : ''}${r.gjort.map(g => ', ' + g).join('')}, ${r.gar}`);
// hur skadad en del ser ut i bilden (0 = hel, 1 = förstörd): det sämsta av hur mycket sämre den är och infektionen där
export function delSkada(p: Person, d: Kroppsdel) {
  let v = delFel(p, d);
  for (const w of p.skador ?? []) if (w.d === d) v = Math.max(v, w.inf ?? 0);
  for (const k of Object.keys(DEL) as Kroppsdel[]) if (DEL[k].under === d) v = Math.max(v, delSkada(p, k) * 0.5); // de finare delarna syns på delen de sitter på
  return Math.min(1, v);
}

// ---------- förmågorna (registret, steg 2.5.3) ----------
// staplarna i fliken Hälsa: värdet (1 = fullt, för smärtan 1 = så ont det kan göra), det som sänker det just nu och vad
// det påverkar. Syn, hörsel, tal och medvetande kommer med de finare kroppsdelarna (ögon, öron, käke)
interface FormagaDef { namn: string; tecken: string; ont?: true; varde(p: Person): number; delar(p: Person): { namn: string; v: number }[]; gor: string }
// skadade delar, och sist bristen (steg 2.6.2), så att 1 + summan blir värdet
const delarAv = (p: Person, vikt: Vikt) => {
  const r = (Object.keys(DEL) as Kroppsdel[]).filter(d => (DEL[d][vikt] ?? 0) * delFel(p, d) > 0).map(d => ({ namn: DEL[d].namn, v: -(DEL[d][vikt] ?? 0) * delFel(p, d) }));
  if (vikt !== 'rorlighet' && vikt !== 'handighet') return r;
  const f = forlust(p, vikt), b = vikt === 'rorlighet' ? yrselFaktor(p) : styrkaFaktor(p), ont = vikt === 'rorlighet' ? HALSA.ontGang * smarta(p) : 0;
  const ut = b < 1 ? [...r, { namn: vikt === 'rorlighet' ? 'Yrsel (brist på mineraler)' : 'Brist på protein eller mineraler', v: -f * (1 - b) }] : r;
  return ont > 0 ? [...ut, { namn: 'Smärtan', v: -f * b * ont }] : ut; // smärtan drar ner gången (steg 9.5.12)
};
export const FORMAGOR = {
  rorlighet: { namn: 'Rörlighet', tecken: '🦵', varde: rorlighet, delar: p => delarAv(p, 'rorlighet'), gor: 'Gångfarten. Den som har ett ben eller en fot som är mycket skadad kan inte gå, utan kravlar hem eller bärs.' },
  handighet: { namn: 'Händighet', tecken: '✋', varde: handighet, delar: p => delarAv(p, 'handighet'), gor: 'Hur fort arbetet går, och om man kan vårda en annan.' },
  syn: { namn: 'Syn', tecken: '👁️', varde: syn, delar: p => delarAv(p, 'syn'), gor: 'Jakten, fisket och samlandet, träffsäkerheten med spjut, båge och slunga, och karisman.' },
  horsel: { namn: 'Hörsel', tecken: '👂', varde: horsel, delar: p => delarAv(p, 'horsel'), gor: 'Samtalen, att höra fara, skaldskapet och karisman.' },
  tal: { namn: 'Tal', tecken: '💬', varde: tal, delar: p => delarAv(p, 'tal'), gor: 'Samtalen, att berätta och att övertyga, skaldskapet och karisman.' },
  medvetande: { namn: 'Medvetande', tecken: '🧠', varde: medvetande, delar: medDelar, gor: `Är det lågt går arbetet långsammare och sämre. Under ${Math.round(HALSA.svimma * 100)} % svimmar man, faller ihop där man är och måste bäras hem.` },
  blod: { namn: 'Blod', tecken: '🩸', varde: p => p.blod ?? 1, delar: p => blodning(p) > 0 ? [{ namn: 'Blöder i timmen', v: -blodning(p) }] : [], gor: `Hälsan. Under ${Math.round(HALSA.blodDod * 100)} % förblöder man. Blodet kommer tillbaka på ${HALSA.blodTillbaka} timmar för den som inte blöder och är mätt och otörstig.` },
  smarta: { namn: 'Smärta', tecken: '😣', ont: true, varde: smarta, delar: p => (p.skador ?? []).map(w => ({ namn: `${SKADA[w.k].namn} i ${DEL[w.d].i}`, v: -(SKADA[w.k].smarta * w.g + HALSA.infSmarta * (w.inf ?? 0)) })), gor: 'Hälsan och humöret. Den som har mycket ont vilar hellre än arbetar.' },
} satisfies Record<string, FormagaDef>;

// ---------- varje steg ----------
// en ny skada: loggen, byns räknare, rädsla för platsen och att arbetet avbryts. Returnerar dödsorsaken om den dödar direkt
// hen i texten om när det hände: efter ett verb som slog eller straffade är den skadade föremålet (honom), annars subjektet (han)
const narOm = (nar: string, p: Person) => nar.replace(/(slog|straffade) hen\b/, (_m, v: string) => `${v} ${honom(p)}`).replace(/\bhen\b/g, han(p));
export function skada(s: State, p: Person, d: Kroppsdel, k: SkadaTyp, g: number, dod: Dodsorsak, nar: string): Dodsorsak | undefined {
  d = finDel(s, p, d);
  if (p.saknas?.includes(d)) d = (DEL[d].under as Kroppsdel | undefined) ?? 'bal'; // delen finns inte längre
  (p.skador ??= []).push({ d, k, g, b: SKADA[k].blod > 0 ? 1 : 0, g0: g });
  uppdateraSinnen(p);
  if ((k === 'skarsar' || k === 'bett') && DEL[d].ute && g >= HALSA.forloraGrad && !HALSA_PROV.grov && rnd(s, 'halsa', p) < HALSA.forloraChans) forlora(s, p, d, k === 'bett' ? 'bets av' : 'höggs av');
  if (SKADA[k].blod > 0) blodas(s, p.x, p.y, 'skada', g * SKADA[k].blod);
  count(s, 'skador'); count(s, 'skada ' + SKADA[k].namn.toLowerCase());
  if (g >= UPPV.skadaGrad) livet(s, p, 'skadad', true); // det hen överlevt (steg 3.9.8)
  if (g >= UPPV.skadaGrad) nar = narOm(nar, p);
  nar = narOm(nar, p); // "när hen slaktade" blir "när han slaktade", "när Ask slog hen" "när Ask slog henne" (ordlagret, steg 6.7.2)
  if (g >= UPPV.skadaGrad) upplev(s, p, 'skadad', `${SKADA[k].ett} ${nar}`); // ett barn minns det (steg 3.1.2)
  if (DEL[d].livsviktig && g >= HALSA.dodGrad) return dod;
  if (g >= HALSA.logg) log(s, `${p.name} fick ${SKADA[k].ett} i ${DEL[d].i} ${nar}.`, 'world', [p.id]);
  if (g >= UPPV.skadaGrad) personHand(s, p, 'skada', `Fick ${SKADA[k].ett} i ${DEL[d].i} ${nar}.`); // personens händelser (steg 9.2.107)
  if (g >= HALSA.radd) { fearPlace(s, p, '', `${p.name} skadades svårt där`); raddAkt(s, p, p.task?.act, `${p.name} skadades svårt`); }
  if (g >= HALSA.avbryt) avbryt(s, p);
  return undefined;
}
// skadan kan hamna på en av de finare delarna under den (steg 8.2.1). Scenarierna som prövar en skada på just en viss del stänger av det
export const HALSA_PROV = { grov: false };
function finDel(s: State, p: Person, d: Kroppsdel): Kroppsdel {
  const fina = FINA[d];
  if (!fina || HALSA_PROV.grov || rnd(s, 'halsa', p) >= HALSA.finChans) return d;
  return fina[Math.floor(rnd(s, 'halsa', p) * fina.length)];
}
const STUMP: Partial<Record<Kroppsdel, Kroppsdel>> = { handV: 'armV', handH: 'armH', fotV: 'benV', fotH: 'benH' };
// de finare delarna direkt under en del (fingrarna under handen), dit en träff kan hamna (finDel)
const FINA = {} as Partial<Record<Kroppsdel, Kroppsdel[]>>;
for (const k of Object.keys(DEL) as Kroppsdel[]) { const u = DEL[k].under as Kroppsdel | undefined; if (u) (FINA[u] ??= []).push(k); }
// det som sitter på en del, i alla led, och försvinner med den (forlora): fingrarna på handen och handen på armen (STUMP)
export const PA_DELEN = {} as Partial<Record<Kroppsdel, Kroppsdel[]>>;
const forelder = (k: Kroppsdel) => (DEL[k].under as Kroppsdel | undefined) ?? STUMP[k];
for (const k of Object.keys(DEL) as Kroppsdel[]) for (let u = forelder(k); u; u = forelder(u)) (PA_DELEN[u] ??= []).push(k);
// en del går förlorad (steg 8.2.3): avbiten, avhuggen, förfrusen eller amputerad. Det som sitter på den försvinner med den, och utom när
// den fryser av blir den en sak på marken med ägarens namn och delen, som ruttnar som maten
export function forlora(s: State, p: Person, d: Kroppsdel, hur: string) {
  if (p.saknas?.includes(d)) return;
  const delar = [d, ...PA_DELEN[d] ?? []];
  for (const q of delar) if (!p.saknas?.includes(q)) (p.saknas ??= []).push(q);
  p.skador = p.skador?.filter(w => !delar.includes(w.d));
  p.men = p.men?.filter(m => !delar.includes(m.d));
  // stumpen blöder och gör ont på delen ovanför
  (p.skador ??= []).push({ d: (DEL[d].under as Kroppsdel | undefined) ?? STUMP[d] ?? 'bal', k: 'skarsar', g: 0.5, b: 1, g0: 0.5 });
  uppdateraSinnen(p);
  nyKvarleva(s, 'del', p, `${gen(p.name)} ${/^(vänstra|högra) /.test(DEL[d].i) ? DEL[d].i.replace(/(en|et|t)$/, '') : DEL[d].i}`); // "Häggs vänstra hand"
  count(s, 'delar förlorade');
  const text = `${gen(p.name)} ${DEL[d].i} ${hur}.`;
  log(s, text, 'world', [p.id]); p.fame.push(`Förlorade ${DEL[d].i}`);
  think(p, `Förlorade ${DEL[d].i}`, -0.3, s.now, 3 * DAY);
}
// en skada som läkt (steg 8.2.4): den kan läka fel och ge ett bestående men, och lämna ett ärr som ändrar utseendet
function laktSkada(s: State, p: Person, w: Skada) {
  const g0 = w.g0 ?? 0;
  if (g0 >= HALSA.menGrad && rnd(s, 'halsa', p) < HALSA.menChans) {
    const ont = !GADELAR.includes(w.d) && !DEL[w.d].syn;
    (p.men ??= []).push({ d: w.d, fel: ont ? 0 : HALSA.menFel, ont: ont ? HALSA.menOnt : 0 });
    uppdateraSinnen(p); count(s, 'men');
    log(s, `${gen(p.name)} ${SKADA[w.k].namn.toLowerCase()} läkte fel.`, 'world', [p.id]);
  }
  if (g0 >= HALSA.arrGrad && w.k !== 'blamarke' && rnd(s, 'halsa', p) < HALSA.arrChans) {
    const fulare = rnd(s, 'halsa', p) < HALSA.arrFulare, ansikte = w.d === 'huvud' || DEL[w.d].under === 'huvud';
    (p.arr ??= []).push({ d: w.d, n: Math.floor(rnd(s, 'halsa', p) * 10) + 1 }); count(s, 'arr');
    if (ansikte) p.pot.skonhet = clamp(p.pot.skonhet + (fulare ? -1 : 0.5) * HALSA.arrSkonhet, 0, 20); // oftast fulare, ibland snyggare
    p.fame.push(`Fick ett ärr i ${DEL[w.d].i}`);
    if (ansikte && !p.binamn && rnd(s, 'halsa', p) < HALSA.arrBinamn) gebinamn(s, p, 'arrig', 1);
  }
}
// olyckor i det farliga arbete man gör just nu (OLYCKOR)
function olyckaSteg(s: State, p: Person, dtSec: number): Dodsorsak | undefined {
  const t = p.task, o = t && t.phase === 'do' ? OLYCKOR[t.act] : undefined;
  if (!o) return undefined;
  const pd = ACTS[t!.act], sk: Skill | undefined = pd.arbete ?? (pd.hantverk ? 'hantverk' : undefined);
  if (!chance(s, o.risk * (1 - (sk ? p.skill[sk] : 0) / HALSA.skicklig) * (1 - HALSA.smidig * franMitt(p, 'smidighet', s.now)) / HOUR_S, dtSec, 'halsa', p)) return undefined;
  const k = pick(s, o.typer, 'halsa', p), d = pick(s, o.delar, 'halsa', p), u = rnd(s, 'halsa', p);
  count(s, 'olyckor'); // skadorna i arbetet (de i slagsmål och straff räknas inte här)
  return skada(s, p, d, k, o.min + u * u * (o.max - o.min), o.dod, o.nar);
}
// kroppen varje steg (healthStep i steg.ts): olyckor, blödningen, läkningen och blodet som kommer tillbaka.
// Returnerar dödsorsaken om personen dog
export function halsaSteg(s: State, p: Person, dtSec: number): Dodsorsak | undefined {
  const dod = olyckaSteg(s, p, dtSec);
  if (dod) return dod;
  forfrysning(s, p, dtSec);
  svimmaSteg(s, p);
  if (!p.skador?.length) { if ((p.blod ?? 1) < 1 && lakerFullt(p)) p.blod = Math.min(1, p.blod! + dtSec / (HALSA.blodTillbaka * HOUR_S)); return undefined; }
  const h = dtSec / HOUR_S, blod = blodning(p), mat = lakerFullt(p), lak = (mat ? 1 : HALSA.lakSamre) * vilaLak(s, p) * lakFaktor(p);
  p.blod = clamp((p.blod ?? 1) - blod * h, 0, 1);
  const kryper = !kanGa(p) && p.task !== undefined && p.task.phase !== 'do'; // den som kravlar lämnar ett släpspår (steg 3.7.19)
  blodDroppar(s, p, blod, dtSec, kryper ? 'kryp' : 'blodning', kryper ? Math.atan2(p.task!.ty - p.y, p.task!.tx - p.x) : undefined);
  for (const w of p.skador) {
    if (w.av !== undefined) { w.b = 0; if (w.g < HALSA.storSar) w.av = undefined; else if (s.now - w.av > HALSA.avsnoraTim * HOUR) { (p.men ??= []).push({ d: w.d, fel: HALSA.menFel, ont: 0 }); w.av = undefined; count(s, 'avsnorningSkadade'); log(s, `${gen(p.name)} ${DEL[w.d].i} skadades av att vara avsnört för länge.`, 'world', [p.id]); } } // avsnörningen (steg 9.5.15)
    if (w.b > 0 && w.g < HALSA.storSar) w.b = Math.max(0, w.b - h / (HALSA.levrar * (0.5 + w.g) * (w.g < HALSA.smaSar ? 1 : HALSA.medelLevrar))); // ett stort sår levrar sig inte (steg 9.5.14)
    infSteg(s, p, w, h, dtSec);
    if (w.inf === undefined) w.g -= h * lak / SKADA[w.k].lakTim * (w.k === 'brannskada' ? 1 + SALVA.bransk * salvaVerkan(w) : 1); // ett infekterat sår läker inte; salvan hjälper brännskadan (steg 9.5.10)
  }
  if (p.skador.some(w => (w.inf ?? 0) >= 1)) return 'kallbrand';
  for (const w of p.skador) if (w.g <= 0) laktSkada(s, p, w);
  p.skador = p.skador.filter(w => w.g > 0);
  uppdateraSinnen(p);
  if (!p.skador.length) p.skador = undefined;
  else if (blod === 0 && mat) p.blod = Math.min(1, p.blod + h / HALSA.blodTillbaka);
  if (p.blod < HALSA.blodDod) { blodas(s, p.x, p.y, 'forblodning', 1); return 'blod'; }
  // tiden kvar (steg 9.5.14): när den blir kort blir det en notis, en gång per gång hen börjar blöda illa
  const kvar = tidKvar(p);
  if (kvar < HALSA.kortTim && !p.blodNotis) { p.blodNotis = 1; notis(s, 'blodning', `${p.name} förblöder om ${Math.max(1, Math.round(kvar * 60))} minuter om ingen hjälper.`, [p.id], { x: Math.floor(p.x), y: Math.floor(p.y) }); }
  else if (kvar >= HALSA.kortTim) delete p.blodNotis;
  const ont = smarta(p);
  if (ont > HALSA.ontGrans) think(p, 'Har ont', -HALSA.smartaHumor * ont, s.now, HOUR);
  return undefined;
}

// den som är mycket kall kan få förfrysta fingrar och tår (steg 8.2.3)
function forfrysning(s: State, p: Person, dtSec: number) {
  if (p.warm >= HALSA.forfrysVarm || !chance(s, HALSA.forfrysRisk / HOUR_S, dtSec, 'halsa', p)) return;
  const fina: Kroppsdel[] = ['fingrarV', 'fingrarH', 'tarV', 'tarH'], d = fina[Math.floor(rnd(s, 'halsa', p) * fina.length)];
  if (p.saknas?.includes(d)) return;
  const fore = (p.skador ?? []).filter(w => w.d === d && w.k === 'forfrysning').reduce((a, w) => a + w.g, 0);
  (p.skador ??= []).push({ d, k: 'forfrysning', g: HALSA.forfrysGrad, b: 0, g0: HALSA.forfrysGrad });
  count(s, 'förfrysningar');
  if (fore + HALSA.forfrysGrad >= HALSA.forloraGrad) forlora(s, p, d, 'frös bort');
}
// att svimma och vakna (steg 8.2.6). Den som svimmat ligger där hen är (ARBETEN i val.ts) och bärs hem som den som inte kan gå
function svimmaSteg(s: State, p: Person) {
  if (!p.svimmat) {
    if (medvetande(p) >= HALSA.svimma) return;
    p.svimmat = true; avbryt(s, p); p.task = undefined; count(s, 'svimmat');
    log(s, `${p.name} svimmade.`, 'world', [p.id]);
  } else if (medvetande(p) >= HALSA.vakna) { p.svimmat = undefined; if (p.task?.act === 'medvetslos') p.task = undefined; }
}

// ---------- infektionen och läkningen (steg 2.5.2) ----------
// man läker fortare när man sover eller vilar på sin sovplats, och fortare till inne i ett hus
function vilaLak(s: State, p: Person) {
  const t = p.task;
  if (!t || t.phase !== 'do' || ACTS[t.act].plats !== 'sang' || !ACTS[t.act].vila) return 1;
  return HALSA.vila * (roomAt(s, p.x, p.y) ? HALSA.inne : 1);
}
// ett öppet sår kan bli infekterat; infektionen växer tills den rengörs, och från kallbranden hjälper inte det
function infSteg(s: State, p: Person, w: Skada, h: number, dtSec: number) {
  if (w.inf === undefined) {
    if (!oppet(w) || !chance(s, HALSA.infRisk * (w.f === 2 ? HALSA.remsa : w.f ? HALSA.forband : 1) * (w.fast ? HALSA.fastInf : 1) * (1 - SALVA.skydd * salvaVerkan(w)) / HOUR_S, dtSec, 'halsa', p)) return; // läkesalvan sänker risken (steg 9.5.10)
    w.inf = 0; count(s, 'infektioner');
    if (w.g >= HALSA.logg) log(s, `${p.name}s sår i ${DEL[w.d].i} blev infekterat.`, 'world', [p.id]);
    return;
  }
  if ((w.ren ?? 0) > s.now && w.inf < HALSA.kallbrand) {
    w.inf -= h / HALSA.infLak;
    if (w.inf <= 0) { w.inf = undefined; w.ren = undefined; count(s, 'infektioner botade'); }
    return;
  }
  const fore = w.inf;
  if (w.salva !== undefined && w.inf < HALSA.kallbrand) { w.inf = Math.max(0, w.inf - h / HALSA.infLak * SALVA.dampa * salvaVerkan(w)); if (w.inf <= 0) { w.inf = undefined; count(s, 'infektioner botade'); } return; } // salvan dämpar en infektion som börjat (steg 9.5.10)
  w.inf += h / HALSA.infTim;
  if (fore < HALSA.kallbrand && w.inf >= HALSA.kallbrand) { count(s, 'kallbrand'); log(s, `${p.name} fick kallbrand i ${DEL[w.d].i}.`, 'world', [p.id]); }
}

// ---------- vården (steg 2.5.2) ----------
// Vårdregistret VARD (steg 9.5.6, Hälsosystemet i detalj: Vårdregistret): varje behandling är en rad med kravet (vilka sår den
// gäller), materialet, redskapet, färdigheten i Läkekonst som krävs, tiden i minuter, risken att det går fel och brådskan (högre
// görs först). Valet och vården frågar registret, kortet visar vad som behövs härnäst och `npm run vard` skriver ut det. Rader
// med senare = steget där de börjar användas: de finns i registret men deras krav är inte uppfyllda förrän dess
export interface VardDef {
  namn: string; text: string; krav: (s: State, q: Person, w: Skada, g: Person) => boolean;
  material?: Record<string, number>; redskap?: string; fardighet?: number; tid: number; risk: number; bradska: number; andra?: true; senare?: string;
  gor: (s: State, g: Person, q: Person, w: Skada) => void;
}
const stor = (w: Skada) => oppet(w) && w.g >= HALSA.vardFel;
// läkesalvan (steg 9.5.10, Hälsosystemet i detalj: Resten av hälsan): görs bara i örtköket, har kvalitet och läggs på såret. Den sänker
// risken för infektion (skydd), dämpar en infektion som börjat (dampa) och hjälper brännskador att läka (bransk), mer ju bättre den är
export const SALVA = balans('salva', {
  skydd: 0.8, // så mycket mindre risk för infektion med en normal salva
  dampa: 0.5, // en infektion som börjat går tillbaka så här fort (gånger rengöringens takt)
  bransk: 1, // en brännskada läker så här mycket fortare
  verkan: [0.4, 0.7, 1, 1.15, 1.3, 1.6], // hur bra salvan verkar, per kvalitet (usel till ★)
});
export const salvaVerkan = (w: Skada) => w.salva === undefined ? 0 : Math.min(1.25, SALVA.verkan[w.salva]);
// salvan finns i en behållare (vatskor.ts sätter kroken): hur mycket byn har, och en tas (dess kvalitet)
export const salvaKrok = { har: (_s: State) => 0, ta: (_s: State): number | undefined => undefined };
export const VARD: Record<string, VardDef> = {
  dra_ut: { namn: 'Dra ut pilen', text: 'Drar ut det som sitter fast i såret', krav: (_s, _q, w) => stor(w) && !!w.fast, tid: 1, risk: 0, bradska: 4, gor: (s, _g, _q, w) => { w.fast = undefined; count(s, 'spjut utdragna'); } }, // den som vårdar tar ut det som fastnat (steg 3.7.7)
  trycka: { namn: 'Trycka', text: 'Trycker på såret så att det slutar blöda', krav: (_s, _q, w) => stor(w) && w.b > 0, tid: 1, risk: 0, bradska: 5, gor: (s, _g, _q, w) => { w.b = 0; count(s, 'sar tryckta'); } },
  forband: { namn: 'Förband', text: 'Lägger en remsa eller mossa på såret', krav: (_s, _q, w) => stor(w) && !w.f && w.inf === undefined, tid: 2, risk: 0, bradska: 3, gor: (s, g, q, w) => { if (getable(s, g, 'remsa') >= 1) { takeMaterial(s, g, 'remsa', 1); w.f = 2; } else if (getable(s, g, 'mossa') >= 1) { takeMaterial(s, g, 'mossa', 1); w.f = 1; } else if (rivRemsa(s, q, g)) w.f = 2; else return; count(s, 'forband'); } }, // remsan före mossan; i nöd rivs en remsa ur ett plagg (steg 9.5.15)
  byta: { namn: 'Byta förband', text: 'Byter det gamla förbandet', krav: () => false, material: { mossa: 1 }, tid: 2, risk: 0, bradska: 2, senare: '9.5.25', gor: () => {} },
  avsnora: { namn: 'Avsnöra', text: 'Snör av armen eller benet ovanför såret', krav: (_s, _q, w) => oppet(w) && w.g >= HALSA.storSar && !!DEL[w.d].ute && w.b > 0 && w.av === undefined && !w.sydd, material: { rep: 1 }, tid: 1, risk: 0.1, bradska: 6, gor: (s, g, _q, w) => { takeMaterial(s, g, 'rep', 1); w.av = s.now; w.b = 0; count(s, 'avsnort'); } }, // ett stort sår i en arm eller ett ben (steg 9.5.15)
  skolja: { namn: 'Skölja', text: 'Sköljer det infekterade såret rent', krav: (s, _q, w) => w.inf !== undefined && w.inf < HALSA.kallbrand && !((w.ren ?? 0) > s.now), tid: 3, risk: 0, bradska: 2, gor: (s, g, _q, w) => { w.ren = s.now + HALSA.renTim * (1 + g.skill.lakekonst * HALSA.lakeRen) * HOUR; count(s, 'sar rengjorda'); } }, // läkekonsten håller såret rent längre (steg 9.5.7)
  sy: { namn: 'Sy', text: 'Syr ihop såret med bennålen och en sena', krav: (_s, _q, w) => oppet(w) && w.g >= HALSA.storSar && !w.sydd, material: { rep: 1 }, redskap: 'nal', fardighet: HALSA.syLak, tid: 5, risk: 0.2, bradska: 4, andra: true, gor: (s, g, _q, w) => { takeMaterial(s, g, 'rep', 1); w.sydd = 1; w.b = 0; w.av = undefined; w.g = Math.min(w.g, HALSA.storSar - 0.01); count(s, 'sytt'); } }, // det sydda såret är medelstort och levrar sig (steg 9.5.15)
  salva: { namn: 'Läkesalva', text: 'Lägger läkesalva på såret', krav: (_s, _q, w) => (stor(w) || w.k === 'brannskada') && w.salva === undefined && (w.inf ?? 0) < HALSA.kallbrand, tid: 2, risk: 0, bradska: 2, gor: (s, _g, _q, w) => { const q = salvaKrok.ta(s); if (q !== undefined) { w.salva = q; count(s, 'salvaPaSar'); } } }, // steg 9.5.10
  amputera: { namn: 'Amputera', text: 'Tar av delen med kallbrand med kniven, så att hen lever', krav: (_s, q, w, g) => g !== q && (w.inf ?? 0) >= HALSA.kallbrand && !!DEL[w.d].ute, redskap: 'flintkniv', tid: 10, risk: 0.3, bradska: 1, andra: true, gor: (s, _g, q, w) => { forlora(s, q, w.d, 'amputerades'); count(s, 'amputerat'); } }, // steg 8.2.3
};
export const VARD_LIST = Object.keys(VARD);
// kan g göra behandlingen v: materialet och redskapet finns, och färdigheten räcker
const plaggAtt = (s: State, q: Person, g: Person) => tingOf(s).some(k => (k.bar === q.id || k.bar === g.id) && !!SAKER[k.k]?.klad && k.c > 0.3);
const vardKan = (s: State, g: Person, v: VardDef, q?: Person) => (v !== VARD.salva || salvaKrok.har(s) > 0) && (v !== VARD.forband || getable(s, g, 'remsa') >= 1 || getable(s, g, 'mossa') >= 1 || !!q && plaggAtt(s, q, g)) && Object.entries(v.material ?? {}).every(([m, n]) => getable(s, g, m) >= n) && (!v.redskap || getable(s, g, v.redskap) >= 1) && (v.fardighet === undefined || g.skill.lakekonst >= v.fardighet);
// i nöd (steg 9.5.15): finns ingen remsa eller mossa rivs en remsa ur ett plagg den skadade eller den som vårdar har på sig, och plagget slits
function rivRemsa(s: State, q: Person, g: Person) {
  const t = tingOf(s).find(k => (k.bar === q.id || k.bar === g.id) && !!SAKER[k.k]?.klad && k.c > 0.3);
  if (!t) return false;
  t.c -= 0.3; count(s, 'remsaUrPlagg');
  return true;
}
// behandlingarna q behöver härnäst och som g kan göra, mest brådskande först
export function vardNasta(s: State, q: Person, g: Person) {
  const ut: { k: string; w: Skada }[] = [];
  for (const k of VARD_LIST) { const v = VARD[k]; for (const w of q.skador ?? []) if (v.krav(s, q, w, g) && vardKan(s, g, v, q)) ut.push({ k, w }); }
  return ut.sort((a, b) => VARD[b.k].bradska - VARD[a.k].bradska);
}
// det q behöver av den som vårdar (g): behandlingarna i VARD och att bäras hem. undefined = inget
export function vardBehov(s: State, q: Person, g: Person) {
  const sk = q.skador ?? [];
  if (!sk.length && !(g !== q && !kanGa(q) && !hemma(s, q))) return undefined; // den som svimmat bärs hem också utan sår
  const n = vardNasta(s, q, g), har = (k: string) => n.some(x => x.k === k);
  const blod = har('trycka'), forband = har('forband') || har('salva'), rengor = har('skolja'), amputera = har('amputera');
  const bara = g !== q && !q.gast && !kanGa(q) && !hemma(s, q) && q.task?.act !== 'buren';
  return blod || forband || rengor || bara || amputera ? { blod, forband, rengor, bara } : undefined;
}
const vardas = (s: State, q: Person, g: Person) => living(s).some(o => o !== g && o.task?.act === 'varda' && o.task.ref === q.id);
// vården som väljs (val.ts): sjalv = sina egna sår (före det mesta), annars den närmaste andra som behöver vård och som ingen
// annan redan går till. Den som vårdar någon annan är vuxen, kan gå och har händer som duger
export function vardVal(s: State, p: Person, sjalv: boolean): { spot: { x: number; y: number }; ref: number; why: string } | undefined {
  if (sjalv) {
    const b = vardBehov(s, p, p);
    if (!b) return undefined;
    return { spot: { x: p.x, y: p.y }, ref: p.id, why: b.blod ? 'Trycker på sitt sår så att det slutar blöda' : b.rengor ? 'Rengör sitt infekterade sår' : 'Lägger mossa på sitt sår' };
  }
  if (ageOf(p, s.now) < ALDER.vuxen || !kanGa(p) || handighet(p) < HALSA.vardHand) return undefined;
  // rätten till vård (steg 9.5.9): den närmaste, men sederna och styret flyttar fram somliga (vardRatt)
  let best: Person | undefined, bd = Infinity;
  for (const q of [...living(s), ...gasterNu(s).filter(g => g.gast!.sort !== 'rovare')]) { // gästerna vårdas också, utom rövarna (steg 9.2.113)
    if (q === p || !q.skador?.length && !q.svimmat) continue;
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d >= HALSA.vardR || d / vardRatt(s, p, q) >= bd || !vardBehov(s, q, p) || vardas(s, q, p)) continue;
    best = q; bd = d / vardRatt(s, p, q);
  }
  if (!best) return undefined;
  const b = vardBehov(s, best, p)!;
  return { spot: { x: best.x, y: best.y }, ref: best.id, why: b.bara && !b.blod && !b.rengor ? `Går för att bära hem ${best.name}` : `Tar hand om ${best.name}s sår` };
}
// rätten till vård (steg 9.5.9, "Rätt till vård" i designdokumentet): hur mycket före de andra p vårdar q, efter sederna och
// styret. Vid Sammanhållning vårdas alla lika; vid Självförsörjning vårdar släkten sina egna; vid Envälde går ledaren och hens
// släkt före; vid Ättens växt barnen. 1 = som alla andra, större = före
export const VARDRATT = balans('vardratt', { slakt: 2, frammande: 0.5, ledare: 2, barn: 2 });
const slakt = (a: Person, b: Person) => a.partner === b.id || isParent(a, b) || isParent(b, a) || (a.mother !== undefined && a.mother === b.mother);
export function vardRatt(s: State, p: Person, q: Person) {
  const v = s.seder.v, g = v.gemenskap ?? 0, r = v.rang ?? 0, b = v.barn ?? 0, l = ledareOf(s);
  let x = 1;
  if (g < 0) x *= slakt(p, q) ? 1 + -g * (VARDRATT.slakt - 1) : 1 - -g * (1 - VARDRATT.frammande);
  if (r > 0 && l && (q === l || slakt(l, q))) x *= 1 + r * (VARDRATT.ledare - 1);
  if (b > 0 && ageOf(q, s.now) < ALDER.vuxen) x *= 1 + b * (VARDRATT.barn - 1);
  return Math.max(0.1, x);
}
// på väg till den skadade, som kanske har flyttat sig (walk i steg.ts)
export function vardMal(s: State, tk: Task) {
  const q = byId(s, tk.ref);
  if (q && Math.hypot(q.x - tk.tx, q.y - tk.ty) > 1.5) { const f = freeNear(s, q.x, q.y); tk.tx = f.x; tk.ty = f.y; }
}
// klart (KLAR i steg.ts): såren trycks på, förband läggs och infekterade sår rengörs. Den som inte kan gå bärs sedan hem
export function vardKlar(s: State, p: Person, t: Task) {
  const q = byId(s, t.ref);
  if (!q || !(alive(q) || gastLever(q)) || Math.hypot(q.x - p.x, q.y - p.y) > 2) return;
  const b = vardBehov(s, q, p);
  if (!b) return;
  // behandlingarna i registrets ordning: först det som görs på varje sår (dra ut, trycka, förband), sedan amputationen och sist
  // sköljningen (VARD ovan)
  for (const w of q.skador ?? []) for (const k of ['avsnora', 'sy', 'dra_ut', 'trycka', 'forband', 'salva']) { const v = VARD[k]; if (v.krav(s, q, w, p) && vardKan(s, p, v, q)) v.gor(s, p, q, w); }
  for (const w of [...q.skador ?? []]) if (VARD.amputera.krav(s, q, w, p) && vardKan(s, p, VARD.amputera)) VARD.amputera.gor(s, p, q, w);
  for (const w of q.skador ?? []) if (w.inf !== undefined && w.inf < HALSA.kallbrand) VARD.skolja.gor(s, p, q, w); // också det som redan är rent: det hålls rent längre
  count(s, 'vard');
  ovning(p, 'lakekonst', HALSA.lakeOvning); gjort(s, p, 'vardat'); // läkekonsten växer när man vårdar (steg 9.5.7)
  if (q !== p && q.health < UPPV.naraHalsa) { upplev(s, p, 'raddade', q.name); upplev(s, q, 'raddad', p.name); } // nära döden (steg 4.1.1.2)
  if (q !== p) { count(s, 'vard av andra'); livet(s, p, 'vardat'); think(q, `${p.name} tog hand om mig`, 0.1, s.now, 12 * HOUR); }
  if (b.bara) bara(s, p, q, t);
}
// att bära hem den som inte kan gå: till sovplatsen, annars vid elden. Den skadade följer med (barMed)
function bara(s: State, p: Person, q: Person, t: Task) {
  avbryt(s, q);
  const f = eldPlats(s), mal = bedFor(s, q) ?? freeNear(s, f.x + 0.5, f.y + 1.6);
  q.task = { act: 'buren', phase: 'do', tx: q.x, ty: q.y, until: s.now + HALSA.buren * HOUR, carry: 0, ref: p.id, why: `Bärs hem av ${p.name}` };
  t.phase = 'back'; t.bar = q.id; t.tx = mal.x; t.ty = mal.y; t.why = `Bär hem ${q.name}`;
  if (forstaGang(s, 'buren hem')) log(s, `${p.name} bar hem ${q.name}, som inte kunde gå.`, 'world', [p.id, q.id]);
}
// den som bärs följer med den som bär. false = bäraren bär inte längre någon (den skadade dog eller slutade vänta)
export function barMed(s: State, p: Person, t: Task) {
  const q = byId(s, t.bar);
  if (!q || !alive(q) || q.task?.act !== 'buren' || q.task.ref !== p.id) { t.bar = undefined; p.task = undefined; return false; }
  q.x = p.x; q.y = p.y;
  return true;
}
// framme med den som bars: hen läggs ner där
export function lamnaAv(s: State, p: Person, t: Task) {
  const q = byId(s, t.bar);
  if (q && q.task?.act === 'buren' && q.task.ref === p.id) { q.x = p.x; q.y = p.y; q.task = undefined; }
  t.bar = undefined; p.task = undefined;
}
// den som bärs (MEDAN i steg.ts): slutar vänta om bäraren inte längre bär hen
export function burenSteg(s: State, p: Person, t: Task) {
  const g = byId(s, t.ref);
  if (!g || !alive(g) || g.task?.act !== 'varda' || g.task.bar !== p.id) p.task = undefined;
}
// den skadade vilar hellre än arbetar: när det gör mycket ont eller ett sår är infekterat
export const vilaHellre = (p: Person) => !!p.skador?.length && (smarta(p) >= HALSA.vilaOnt || infektion(p) > 0) || !!p.sjuk && p.sjuk.grad >= SJUK.vilaFran && p.sjuk.st !== undefined; // också den sjuke med tydliga tecken (steg 9.5.4)

// ---------- mossan (steg 2.5.2) ----------
// den som letar i naturen (UTFALL samla i steg.ts) hittar mossa, mer i skogen, tills byn har så mycket den vill ha
export function mossaFynd(s: State, tk: Task, dtSec: number) {
  if (amountOf(s, 'mossa') + (tk.items?.mossa ?? 0) >= HALSA.mossaVill) return 0;
  return HALSA.mossaTakt * dtSec / HOUR_S * (isForest(s, tileOf(tk.tx, tk.ty)) ? 1 : HALSA.mossaUte);
}
// ett fällt träd har ibland mossa på sig, som den som hugger trä av stammen tar med sig (skog.ts)
export function mossaPaStam(s: State, p: Person, k: Stock) {
  if (rnd(s, 'arbete', p) < HALSA.mossaTrad) k.mossa = HALSA.mossaStam;
}
