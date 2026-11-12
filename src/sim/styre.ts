import { honom, slaktOrd } from './ord';
import { ALDER, REL, ageOf, alive, byId, count, franMitt, isKin, isParent, living, log, relKey, stat, think } from './folk';
import { efterlevs, lagDygn, lagForBrott, tasUppKvall } from './lagar';
import type { Lag } from './lagar';
import { ROST, FRAGOR, rostaOm, missnojeLatt, missnojeNoll, missnojeStrafft, missnojeTimme, oppnaSed, rostKvall, seOverMinistrar, vikter } from './rost';
import type { Fraga, Fraktion, Omrostning, Rost } from './rost';
import { kartStridBorja, stridPagar } from './kartstrid';
import { EFTER } from './efterstrid';
import { kyrkaKvall, overstePrast } from './kyrka';
import { ARSTIDER, Fyllning, fyll, kronikaBer, och, personFalt, valjVariant } from './berattelser';
import { skada } from './halsa';
import { die, leave } from './liv';
import { moodOf } from './humor';
import { clamp } from './slump';
import { DAY, HOUR, Person, State } from './typer';
import { balans } from './balans';
import { BYN } from './egendom';
import { grundvarde } from './varde';
import { sakNamn } from './saker';
import { ownMove, ownsAmount } from './lager';
import { rnd } from './slump';
import { UPPV, upplev } from './uppvaxt';
import { kronika } from './historik';
import { Sed, drar, influence } from './seder';
import { knows } from './teknik';
import { Bevis, HANDELSER, HandelseTyp, allmant, handelse, ryktbarhet, vittnen } from './rykten';
import { ISTID, ageIndex, hourOf, isLight, kallTid } from './tid';
import { temperature, vaderNu } from './vader';
import { notis } from './notiser';
import { homeless } from './byggnader';
import { tecken } from './religion';

// Styret (steg 3.5, "Ledarskap och makt" i designdokumentet).
// Ledarskap är en teknik som man kommer på och lär ut i samtal (teknik.ts). Bara den som kan den kan bli ledare: när byn har
// minst LED.vuxna vuxna väljs den mest omtyckta med hög karisma av dem som kan tekniken och inte har dåligt anseende. Dör ledaren
// väljs nästa på samma sätt; kan ingen vuxen tekniken har byn ingen ledare, och påbuden upphör (en by kan glömma ledarskapet).
// Den första ledaren låser upp den första vågskålen, seden Allmogen – Envälde (seder.ts). Ledaren drar sederna med ungefär
// en tredjedel av byns vikt, mer vid Envälde och hög legitimitet. Legitimiteten räknas ur folkets stöd, tiden vid makten och
// vintrarna byn klarat, och sjunker av orättvisa straff; den sparas inte. Påbuden (matlager, vedlager, torkat) kommer ur ledarens
// personlighet och ses över en gång per årstid; straffen delas ut på kvällen för det ledaren sett eller hört som rykte.

// ---------- balanstal (regel 8) ----------
export const LED = balans('ledare', {
  wSatt: 0.1, wFram: 0.1, // hur ledaren tillsattes och framgångarna i legitimiteten (steg 8.3.9)
  vunna: 3, vaxt: 12, // så många vunna strider, och så många fler invånare, ger full framgång
  egenRost: 40, // så mycket man tycker om sig själv i valet
  vuxna: 6, // en ledare väljs först när byn har minst så här många vuxna ...
  anseende: 0, // ... bland dem som kan ledarskap och inte har ett anseende under detta (rykten.ts)
  karisma: 2, // valet: stödet (relationen till de andra vuxna, -100 till 100) plus karisman gånger så här mycket
  // titlarna (steg 3.10.18): Kung eller Drottning och Jarl från så här många invånare och så här mycket Envälde
  kungFolk: 60, kungRang: 0.85, jarlFolk: 30, jarlRang: 0.6,
  jarnHard: 1.6, jarnLeg: 0.3, // Järnhanden: hårdheten utan humöret (straff) minst så här, och legitimiteten under så här
  krig: 3, // Krigshövding: vargjakter och strider med vargar under ledarens tid, minst så här många
  vis: 14, // Den vise: intelligens minst så här
  faderStod: 0.75, faderEmp: 14, // Byfader eller Bymoder: stödet (legitimiteten) och empatin minst så här
  hovding: 0.35, // styrelseformen är ett hövdingadöme från så här mycket Envälde
  // ledarens vikt i sederna: byns vikt gånger sedVikt × (1 + sedRang × Envälde) × (sedLegBas + legitimiteten)
  sedVikt: 0.5, sedRang: 1, sedLegBas: 0.5,
  // legitimiteten (0 till 1): stödet (0,5 + snittrelationen / 200) gånger wStod, tiden vid makten (1 - e^(-dygn / tidDygn))
  // gånger wTid, och vintrarna (högst vintrar) gånger wVint, minus orättvisan
  wStod: 0.6, wTid: 0.2, wVint: 0.2, tidDygn: 4, vintrar: 2,
  orattDygn: 3, // orättvisan bleknar med en tidskonstant på så här många dygn
  tanke: 0.04, // ledaren mår så här mycket bättre (tanken Leder byn)
});
export const PAB = balans('pabud', {
  andel: 0.5, // ledarens del av påbuden: andel × (legBas + legitimiteten) × (1 + rang × Envälde), högst max
  legBas: 0.5, rang: 1, max: 0.8,
  hanEmp: 10, hanDiv: 4, // hånet: ledarens åsikt är (empatin - hanEmp) / hanDiv, från -1 (förbjudet) till 1 (fritt)
  plan: 0.4, // inför och under istiden lägger en intelligent ledare (intelligens över 10) till så här mycket per steg (6) på lagren
  // arbetsordningen (steg 6.1.19): Bygg före allt. Ledarens åsikt = byggUtan × andelen utan sovplats under tak − 1 (från -1 till 1);
  // påbudet över 0 är chansen att bygget (raden Tak) går före Försörjningen
  byggUtan: 2,
  // Samla för vintern: påbudet över 0 ger maten och veden så här många fler arbetare per steg (påbudet 1 = ×(1 + hander))
  hander: 1,
});
export const FORM = balans('form', {
  starkt: 0.7, lut: 0.25, mitt: 0.1, // gränserna mellan styrelseformerna, i sederna (steg 8.3.7)
});
export const TRON = balans('tron', {
  prast: 0.4, // så här mycket Andlig ger att översteprästen utser (steg 8.6.16)
  arv: 0.3, // så här mycket Härkomst ger arv (steg 8.3.6)
  utse: 0.4, // ... så här mycket Envälde att ledaren utser sin efterträdare
  strid: 0.4, // ... så här mycket Fejd en strid om makten
  kris: 0.15, // två sätt väger ungefär lika mycket: mindre än så här skiljer, och olika kandidater ger en tronföljdskris
  sattFel: 0.3, // en ledare som kom till makten på ett sätt sederna inte godtar börjar med så här mycket av den delen av legitimiteten
  krisMiss: 0.15, // tronföljdskrisen gör byn så här missnöjd
});
export const STR = balans('straff', {
  holmgang: 0.5, // vid så här mycket Fejd avgörs tvister med holmgång (steg 8.4.7)
  tingRost: 0, // vid så här lite Envälde avgör byn skulden i en omröstning
  vardDygn: 5, // straffet Ingen vård (steg 9.5.30) varar så här många dygn (år i spelet)
  tjanstDygn: 2, // samhällstjänsten varar så här många dygn (år i spelet)
  bot: 5, // så många saker betalas i böter när den dömde inte äger något redskap
  dygn: 2, // ledaren dömer för det som hänt de senaste så här många dygnen
  timme: 20, // på kvällen vid den här timmen
  rang: 1, // hårdheten: 1 + rang × Envälde + empati × (10 - empatin) / 10 + humor × (0,5 - humöret), mellan min och max
  empati: 0.3, humor: 0.4, min: 0.3, max: 2.5,
  agg: 0.3, // ... plus agg × (aggressionen − 10) / 10 (steg 3.7.6)
  nara: 0.7, // sina nära (partner, släkt, goda vänner) straffar ledaren så här mycket mildare
  skam: 0.3, slag: 0.6, utvis: 0.9, // straffet: från så här mycket (händelsens vikt gånger hårdheten) skam, slag och utvisning
  slagRang: 0.2, utvisRang: 0.4, // ... slag bara från så här mycket Envälde, och utvisning bara för dråp och från så här mycket
  skamDygn: 1, // skammen: inte äta vid bordet eller sitta vid elden med de andra så här länge
  tanke: 0.06, tankeDygn: 1, // den straffade mår så här mycket sämre per steg i straffet
  slagG: 0.15, // slaget ger ett blåmärke med så här stor svårighet
  familjOp: 12, // ett orättvist straff: den straffades familj tycker så här mycket sämre om ledaren ...
  straffadOp: 8, // ... och den straffade så här mycket sämre
  oratt: 0.08, // ... och legitimiteten sjunker så här mycket (bleknar, LED.orattDygn)
  hord: 0.5, // de som ser straffet hör om brottet med så här stor del av händelsens vikt
  sparas: 30, // så här många rättegångar sparas (steg 3.10.17), de äldsta glöms
});

// ---------- registren ----------
// titlarna (bara text, steg 3.10.18), i den ordning de prövas: den första som passar vinner. namn = [mannens, kvinnans].
// Titeln väljs när ledaren väljs och ses över varje årstid när påbuden sätts. Präst och schaman hör till religionen
interface TitelLage { vuxna: Person[]; folk: number; rang: number; leg: number; stod: number; hard: number; krig: number }
// kort och om (steg 10.2.59): några ord om rollen, och mer när man trycker på den
const TITLAR: { namn: [string, string]; kort: string; om: string; passar: (s: State, p: Person, x: TitelLage) => boolean }[] = [
  { namn: ['Kung', 'Drottning'], kort: 'härskar över ett stort folk', om: 'Leder en stor by med hög rang. Påbuden och lagarna väger tungt, och folket väntar sig mycket.', passar: (_s, _p, x) => x.folk >= LED.kungFolk && x.rang >= LED.kungRang },
  { namn: ['Jarl', 'Jarl'], kort: 'leder ett växande folk', om: 'Leder en stor by med hög rang, nästan som en kung.', passar: (_s, _p, x) => x.folk >= LED.jarlFolk && x.rang >= LED.jarlRang },
  { namn: ['Järnhanden', 'Järnhanden'], kort: 'styr med hårda straff', om: 'Ett öknamn som folket ger den som straffar hårt fast byn inte godtar hen.', passar: (_s, _p, x) => x.hard >= LED.jarnHard && x.leg < LED.jarnLeg }, // ett öknamn som folket använder
  { namn: ['Krigshövding', 'Krigshövding'], kort: 'leder i strid', om: 'Byn har stridit mycket, och ledaren är främst en krigare.', passar: (_s, _p, x) => x.krig >= LED.krig }, // och seden Fejd när den finns (9.2.3)
  { namn: ['Hövding', 'Hövding'], kort: 'byns ansedda ledare', om: 'Har hög rang i byn och bestämmer påbuden.', passar: (_s, _p, x) => x.rang >= LED.hovding },
  { namn: ['Storjägare', 'Storjägare'], kort: 'den bästa jägaren leder', om: 'Byn följer den som skaffar mest vilt.', passar: (_s, p) => p.tag === 'Jägare' },
  { namn: ['Den vise', 'Den visa'], kort: 'leder med klokskap', om: 'Byn följer den klokaste.', passar: (_s, p) => p.pot.intelligens >= LED.vis },
  { namn: ['Byfader', 'Bymoder'], kort: 'tar hand om alla', om: 'Har stort stöd och mycket empati: leder som en förälder.', passar: (s, p, x) => x.stod >= LED.faderStod && stat(p, 'empati', s.now) >= LED.faderEmp },
  { namn: ['Äldste', 'Äldsta'], kort: 'den äldsta leder', om: 'Byn följer den som levt längst.', passar: (s, p, x) => ageOf(p, s.now) >= ALDER.aldre && x.vuxna.every(q => ageOf(q, s.now) <= ageOf(p, s.now)) },
  { namn: ['Ålderman', 'Ålderkvinna'], kort: 'byns valda förman', om: 'Byn har valt hen att leda och bestämma påbuden, utan större makt än så.', passar: () => true }, // byns valda förman (Ålderkvinna för en kvinna, steg 4.5.3.2)
];
const TITELNAMN = new Set(TITLAR.flatMap(t => t.namn));
// några ord om titeln, och mer (steg 10.2.59)
export const titelOm = (namn?: string) => TITLAR.find(t => namn !== undefined && t.namn.includes(namn));
const hon = (p: Person) => p.sex === 'k' ? 'hon' : 'han', hennes = (p: Person) => p.sex === 'k' ? 'hennes' : 'hans';
const stor = (t: string) => t[0].toUpperCase() + t.slice(1);
// styrelseformerna: namnet och texten byggs ur sederna. Texten står överst i fliken Styre och är skriven som en lagtext (steg 9.2.72):
// kort, i tredje person och presens, utan vardagsord. (fler former när de finns, 9.2), den första som passar
const fort = (s: State) => s.seder.v.fortjanst ?? 0, fejdNu = (s: State) => s.seder.v.fejd ?? 0, rangNu = (s: State) => s.seder.v.rang ?? 0;
const FORMER: { namn: string; passar: (s: State) => boolean; text: (l: Person, titel: string) => string }[] = [
  { namn: 'Godevälde', passar: s => (s.seder.v.andlig ?? 0) >= FORM.starkt && rangNu(s) >= FORM.lut, // den främsta prästen leder (steg 8.6.1)
    text: (l, t) => `${l.name}, ${t.toLowerCase()}, styr byn i gudarnas namn. De starka buden äga laga kraft.` },
  { namn: 'Envälde', passar: s => rangNu(s) >= FORM.starkt && fejdNu(s) >= FORM.lut && fort(s) <= 0,
    text: (l, t) => `${l.name}, ${t.toLowerCase()}, har tagit makten och styr allena. ${stor(hennes(l))} ord är lag, och ingen må tala emot.` },
  { namn: 'Krigarvälde', passar: s => rangNu(s) >= LED.hovding && fejdNu(s) >= FORM.lut,
    text: (l, t) => `Krigarna kring ${l.name}, ${t.toLowerCase()}, råda över byn. Den som bär vapen väger tyngst.` },
  { namn: 'Kungadöme', passar: s => rangNu(s) >= LED.hovding && fort(s) >= FORM.lut,
    text: (l, t) => `${l.name}, ${t.toLowerCase()}, styr byn. Makten går i arv inom ätten.` },
  { namn: 'Hövdingadöme', passar: s => rangNu(s) >= LED.hovding,
    text: (l, t) => `${l.name}, ${t.toLowerCase()}, råder över byn med tinget vid sin sida. ${stor(hon(l))} dömer, och byn lyder.` },
  { namn: 'Ätternas råd', passar: s => rangNu(s) >= FORM.mitt && fort(s) >= FORM.lut,
    text: (l, t) => `De gamla ätterna råda över byn, och ${l.name}, ${t.toLowerCase()}, för deras talan.` },
  { namn: 'Folkting', passar: () => true,
    text: (l, t) => `Byn råder över sig själv vid tinget. ${l.name}, ${t.toLowerCase()}, för ordet, men beslutet är folkets. Faller ${hon(l)}, väljer byn en ny bland dem som kan leda.` },
];
// vågskålarna: sederna som låses upp av styret, i den ordning de visas. steg = när en låst vågskål byggs
export const VAGSKALAR: { id: string; sed?: Sed; namn: string; steg?: string }[] = [
  { id: 'rang', sed: 'rang', namn: 'Allmogen – Envälde' },
  { id: 'fortjanst', sed: 'fortjanst', namn: 'Förtjänst – Härkomst' },
  { id: 'fejd', sed: 'fejd', namn: 'Förlikning – Fejd' },
  { id: 'andlig', sed: 'andlig', namn: 'Världslig – Andlig' },
];
// påbuden: vad ledaren tycker (åt vilket håll från byns egen sed, som en sed från -1 till 1). sed = byns egen sed som påbudet
// blandas med (saknas: 0). ruta = påbuden som visas tillsammans i en ruta i Styre (steg 4.5.4.2; saknas: en egen ruta).
// Hur påbudet används står i val.ts
interface PabudDef { namn: string; text: string; sed?: Sed; ruta?: string; asikt: (s: State, l: Person) => number }
const PDEF = {
  matlager: { ruta: 'Förrådsmålen', namn: 'Matlager', text: 'Hur många dygn mat byn ska ha i förrådet innan den slappnar av', sed: 'forsiktighet', asikt: (s, l) => lagerAsikt(s, l) },
  vedlager: { ruta: 'Förrådsmålen', namn: 'Vedlager', text: 'Hur många dygn ved byn ska ha i förrådet', sed: 'forsiktighet', asikt: (s, l) => lagerAsikt(s, l) },
  torkat: { ruta: 'Förrådsmålen', namn: 'Torkat', text: 'Hur mycket av köttet och fisken som torkas på torkställningen', asikt: (s, l) => lagerAsikt(s, l) },
  // arbetsordningen (steg 6.1.19, val.ts): ett påbud kan flytta en rad en nivå upp eller ge den fler händer
  bygg: { ruta: 'Arbetet', namn: 'Bygg före allt', text: 'Hur ofta bygget går före försörjningen med mat och ved', asikt: s => clamp(PAB.byggUtan * homeless(s) / Math.max(1, living(s).length) - 1, -1, 1) },
  vinter: { ruta: 'Arbetet', namn: 'Samla för vintern', text: 'Hur många fler som arbetar med maten och veden', asikt: (s, l) => lagerAsikt(s, l) },
  // nattvakten (steg 10.1.20, vaktHot i val.ts): en försiktig ledare vill ha fler som vaktar
  vakt: { ruta: 'Arbetet', namn: 'Nattvakten', text: 'Hur många som håller vakt om natten', sed: 'forsiktighet', asikt: (s, l) => clamp(drar(s, l).forsiktighet, -1, 1) },
  // hånet (steg 4.3.2.3, framtradande.ts): en ledare med låg empati förbjuder att man hånar hen när man uppträder
  han: { namn: 'Hån', text: 'Om den som uppträder får håna ledaren', asikt: (s, l) => clamp((stat(l, 'empati', s.now) - PAB.hanEmp) / PAB.hanDiv, -1, 1) },
} satisfies Record<string, PabudDef>;
export type Pabud = keyof typeof PDEF;
export const PABUD: Record<Pabud, PabudDef> = PDEF;
export const PABUD_LIST = Object.keys(PDEF) as Pabud[];
// en försiktig ledare vill ha större lager, och en intelligent planerar inför istiden
function lagerAsikt(s: State, l: Person) {
  return clamp(drar(s, l).forsiktighet + (kallTid(ageIndex(s)) ? PAB.plan * (l.pot.intelligens - 10) / 6 : 0), -1, 1);
}

// ---------- data ----------
export interface Ledare { id: number; namn: string; titel: string; forr?: string[]; fran: number; till?: number; slut?: string } // forr: titlarna före den sista
export interface Styre {
  ledare?: number; sedan?: number; titel?: string; // ledaren nu, när hen valdes och titeln
  vintrar?: number; // istider byn klarat under ledaren
  folk0?: number; dog0?: number; // invånarna och de som svalt eller frusit ihjäl när ledaren valdes (steg 4.1.1.2)
  krig0?: number; // byns vargjakter och strider med vargar när ledaren valdes (titeln Krigshövding)
  ai?: number; // årstiden förra timmen
  historia: Ledare[]; // alla ledare
  oppna: string[]; // vågskålarna som låsts upp
  pabud?: Partial<Record<Pabud, number>>; pabudAi?: number; // ledarens åsikt om påbuden, och årstiden de sattes
  oratt?: number; orattT?: number; // orättvisan och när den senast ökade
  domt?: string[]; // fallen som redan dömts
  utanHolm?: string[]; // brotten där den anklagade förlorat holmgången: de döms utan ny holmgång (steg 10.1.7)
  ratt?: Rattegang[]; // rättegångarna, de senaste STR.sparas (steg 3.10.17)
  roster?: Omrostning[]; fragor?: Fraga[]; // omröstningarna och frågorna som väntar (steg 8.3.1, rost.ts)
  ministrar?: Record<string, number>; // ministrarna per post (steg 8.3.8)
  arvinge?: number; // den ledaren utsett till sin efterträdare (steg 8.3.6)
  satt?: number; vunna?: number; // hur väl sättet ledaren tillsattes på passar sederna, och strider som vunnits (steg 8.3.9)
  frak?: Fraktion; frakVald?: number; lugn?: number; // fraktionen, dess ledare efter ett skifte och när nästa fraktion tidigast bildas (steg 8.3.11–8.3.12)
  dogVinter?: number;
  kyrka?: number; kyrkaVikt?: number; // översteprästens välsignelse (1) eller fördömelse (−1) och vad den är värd (steg 8.6.16)
  hanForbud?: boolean; hanSedd?: number; // förbudet mot hån (steg 8.3.13)
  lagar?: Lag[]; nedrostat?: Record<string, number>; // lagarna och det som nyss röstats ned (system 8.4, lagar.ts)
}
// en rättegång (steg 3.10.17): det som behövs för att visa den. Texten skrivs när den visas (rattegang nedan), med domens timme
export interface Rattegang {
  t: number; led: number; ledNamn: string; om: number; namn: string; // när, ledaren och den dömda
  b: Bevis; // brottet (b.sett: ledaren såg det själv, annars hörde hen det som rykte; b.falsk: det var inte sant)
  sett: number[]; hort: number[]; // de levande som själva sett brottet, och de som hört det som rykte
  hard: number; rang: number; emp: number; hum: number; agg: number; // hårdheten och vad sederna och ledaren lade till
  nara?: true; steg: number; lagom: number; // ledaren stod den dömda nära, straffet och det byn tyckte var lagom
  oratt?: true; leg?: number; van?: number; // orättvis: legitimiteten den kostade och hur många som tyckte sämre om ledaren
  publik: number; dog?: true; // hur många som såg straffet, och om den dömda dog av slaget
  regn?: true; sno?: true; kallt?: true; eld?: true; natt?: true; // vädret och elden
}
const styreOf = (s: State) => s.styre ??= { historia: [], oppna: [] };
export const styreAv = styreOf;
export const ledareOf = (s: State) => { const id = s.styre?.ledare; const p = id === undefined ? undefined : byId(s, id); return p && alive(p) ? p : undefined; };
// makt-sederna (Skalor som låses upp) syns i Styre och är låsta tills det de styr finns i byn
export const MAKT_SEDER: readonly Sed[] = ['rang', 'fortjanst', 'fejd', 'andlig'];
const LASTA_SEDER: readonly Sed[] = [...MAKT_SEDER, 'krig', 'delning', 'natur'];
export const sedOppen = (s: State, k: Sed) => !LASTA_SEDER.includes(k) || !!s.styre?.oppna.includes(k);

// ---------- legitimiteten ----------
type Leg = { v: number; stod: number; satt: number; fram: number; vint: number; oratt: number };
export function legitimitet(s: State): Leg { return raknaLeg(s); }
function raknaLeg(s: State): Leg {
  const st = s.styre, l = ledareOf(s);
  if (!st || !l) return { v: 0, stod: 0, satt: 0, fram: 0, vint: 0, oratt: 0 };
  let op = 0, w = 0;
  for (const q of living(s)) {
    if (q === l) continue;
    const wq = influence(s, q); if (!wq) continue;
    op += (s.rels[relKey(l.id, q.id)]?.op ?? 0) * wq; w += wq;
  }
  const stod = clamp(0.5 + (w ? op / w : 0) / 200, 0, 1);
  const satt = st.satt ?? 1, fram = clamp((st.vunna ?? 0) / LED.vunna + (living(s).length - (st.folk0 ?? living(s).length)) / LED.vaxt, 0, 1); // hur ledaren tillsattes och framgångarna (steg 8.3.9)
  const vint = Math.min(1, (st.vintrar ?? 0) / LED.vintrar);
  const oratt = (st.oratt ?? 0) * Math.exp(-(s.now - (st.orattT ?? s.now)) / (LED.orattDygn * DAY));
  return { v: clamp(stod * LED.wStod + satt * LED.wSatt + fram * LED.wFram + vint * LED.wVint - oratt + (st.kyrka ?? 0) * (st.kyrkaVikt ?? 0), 0, 1), stod, satt, fram, vint, oratt };
}
// ledarens vikt i sederna (seder.ts): en del av byns samlade vikt
export function ledarVikt(s: State): { p: Person; w: number } | undefined {
  const l = ledareOf(s);
  if (!l) return;
  return { p: l, w: LED.sedVikt * (1 + LED.sedRang * Math.max(0, s.seder.v.rang ?? 0)) * (LED.sedLegBas + legitimitet(s).v) };
}

// ---------- påbuden ----------
export function pabudAndel(s: State) {
  if (!ledareOf(s) || !s.styre?.pabud) return 0;
  return clamp(PAB.andel * (PAB.legBas + legitimitet(s).v) * (1 + PAB.rang * Math.max(0, s.seder.v.rang ?? 0)), 0, PAB.max);
}
// påbudet k: byns egen sed blandad med ledarens åsikt (som en sed, -1 till 1); utan ledare byns egen
export function pabud(s: State, k: Pabud) {
  const d: PabudDef = PABUD[k], egen = d.sed ? s.seder.v[d.sed] : 0, a = pabudAndel(s);
  return a ? egen * (1 - a) + (s.styre!.pabud![k] ?? egen) * a : egen;
}
// påbuden är frågor (steg 8.3.1): varje årstid lägger ledaren eller ministern fram det hen vill ändra, och byn röstar klockan 20. Innan
// något är bestämt gäller byns egen sed
function sattPabud(s: State, l: Person, ai: number) {
  const st = styreOf(s), forr = st.pabud;
  st.pabud ??= Object.fromEntries(PABUD_LIST.map(k => { const d: PabudDef = PABUD[k]; return [k, d.sed ? s.seder.v[d.sed] : 0]; }));
  st.pabudAi = ai;
  if (!forr) log(s, `${l.name} vill bestämma hur stora förråd byn ska ha.`, 'world', [l.id]);
}

// ---------- valet ----------
const vuxnaOf = (s: State) => living(s).filter(p => ageOf(p, s.now) >= ALDER.vuxen);
// hur nästa ledare väljs (steg 8.3.6), det sätt som passar sederna bäst. Prästernas val kommer med kyrkan
export type Tronfoljd = 'arv' | 'utse' | 'strid' | 'val' | 'prast';
export function tronfoljd(s: State): Tronfoljd {
  const v = s.seder.v, c: [Tronfoljd, number][] = [['arv', (v.fortjanst ?? 0) - TRON.arv], ['utse', s.styre?.arvinge !== undefined ? (v.rang ?? 0) - TRON.utse : -1], ['strid', (v.fejd ?? 0) - TRON.strid], ['prast', overstePrast(s) ? (v.andlig ?? 0) - TRON.prast : -1]];
  const b = c.sort((a, d) => d[1] - a[1])[0];
  return b[1] >= 0 ? b[0] : 'val';
}
export const TRONFOLJD_TEXT: Record<Tronfoljd, string> = { arv: 'Ledarens barn eller närmaste släkting ärver makten', utse: 'Ledaren har utsett sin efterträdare', strid: 'De som vill slåss om makten', val: 'De vuxna väljer en ny', prast: 'Översteprästen utser den nya' };
const kanLeda = (s: State, c: Person) => knows(c, 'ledarskap') && ryktbarhet(s, c.id).a >= LED.anseende;
// kandidaterna enligt ett sätt
function arvinge(s: State, vuxna: Person[]) {
  const forra = byId(s, s.styre?.historia[s.styre.historia.length - 1]?.id);
  if (!forra) return undefined;
  const barn = vuxna.filter(c => isParent(forra, c) && kanLeda(s, c)).sort((a, b) => a.born - b.born)[0];
  return barn ?? vuxna.filter(c => isKin(forra, c) && kanLeda(s, c)).sort((a, b) => a.born - b.born)[0];
}
function rostval(s: State, vuxna: Person[]) {
  // var och en röstar efter vänskap och karisma, och vikten avgör (registret FRAGOR: ledaren finns inte där, utfallet sparas som en omröstning)
  const kand = vuxna.filter(c => kanLeda(s, c));
  if (!kand.length) return undefined;
  const v = vikter(s).filter(x => vuxna.includes(x.p)), summa = new Map<number, number>(), roster: Rost[] = [];
  for (const { p, andel } of v) {
    let b = kand[0], bv = -Infinity;
    for (const c of kand) { const x = (c === p ? LED.egenRost : (s.rels[relKey(p.id, c.id)]?.op ?? 0)) + stat(c, 'karisma', s.now) * LED.karisma; if (x > bv) { bv = x; b = c; } }
    summa.set(b.id, (summa.get(b.id) ?? 0) + andel);
    roster.push({ id: p.id, namn: p.name, w: andel, ja: true, why: `Röstade på ${b.name}` });
  }
  let best = kand[0], bs = -1;
  for (const c of kand) { const x = summa.get(c.id) ?? 0; if (x > bs) { bs = x; best = c; } }
  const st = styreOf(s);
  (st.roster ??= []).push({ t: s.now, f: 'ledare', namn: 'Ny ledare', fram: best.id, framNamn: best.name, roster, ja: bs, nej: 1 - bs, gick: true });
  if (st.roster.length > ROST.sparas) st.roster.splice(0, st.roster.length - ROST.sparas);
  return best;
}
function valj(s: State) {
  const vuxna = vuxnaOf(s);
  if (vuxna.length < LED.vuxna) return;
  const stn = styreOf(s), forstaVal = !stn.historia.length;
  if (!forstaVal) oppnaSed(s, 'fortjanst'); // Förtjänst – Härkomst låses upp första gången en ny ska väljas (steg 8.3.4)
  let best: Person | undefined, satt = 1;
  const fv = byId(s, stn.frakVald); stn.frakVald = undefined;
  if (fv && alive(fv) && vuxna.includes(fv)) { best = fv; satt = stn.satt ?? 0.7; }
  else {
    const satet = tronfoljd(s);
    if (satet === 'arv') best = arvinge(s, vuxna);
    else if (satet === 'prast') { const o = overstePrast(s); if (o) best = vuxna.filter(c => kanLeda(s, c) && c.tro === o.tro).sort((a, b) => (s.rels[relKey(o.id, b.id)]?.op ?? 0) - (s.rels[relKey(o.id, a.id)]?.op ?? 0))[0]; }
    else if (satet === 'utse') { const u = byId(s, stn.arvinge); if (u && alive(u) && vuxna.includes(u) && kanLeda(s, u)) best = u; }
    else if (satet === 'strid') {
      const kand = vuxna.filter(c => kanLeda(s, c)).sort((a, b) => stat(b, 'mod', s.now) + b.skill.narstrid - stat(a, 'mod', s.now) - a.skill.narstrid);
      if (kand.length >= 2) {
        // striden sker på kartan och tar tid (steg 10.1.7): den som vinner blir ledare när den är slut (EFTER.tronstrid), och
        // byn väljer ingen under tiden
        if (!stridPagar(s, 'tronstrid')) { kartStridBorja(s, 'skada', [[kand[0]], [kand[1]]], 'striden om ledarskapet', { typ: 'tronstrid', a: kand[0].id, b: kand[1].id }); count(s, 'tronstrid'); }
        return;
      } else best = kand[0];
    }
    const valet = rostval(s, vuxna);
    if (best && valet && best !== valet && Math.abs((s.seder.v.fortjanst ?? 0)) < TRON.arv + TRON.kris) { // olika sätt ger olika kandidater (steg 8.3.6)
      count(s, 'tronfoljdskris'); satt = TRON.sattFel;
      const text = `Byn är oenig om vem som ska leda: ${best.name} eller ${valet.name}.`;
      log(s, text, 'world', [best.id, valet.id]); kronika(s, text, 'ledare');
      for (const p of vuxna) p.missnoje = clamp((p.missnoje ?? 0) + TRON.krisMiss, 0, 1);
    }
    best ??= valet;
    if (best && best === valet && satet !== 'val') satt = TRON.sattFel + 0.2; // det passade inte sederna
    const rec = stn.roster?.[stn.roster.length - 1];
    if (rec?.f === 'ledare' && rec.t === s.now) rec.gick = best === valet; // omröstningen avgjorde bara om den valda blev ledare
  }
  if (!best) return;
  const st = stn, forsta = forstaVal;
  st.ledare = best.id; st.sedan = s.now; st.vintrar = 0; st.vunna = 0; st.satt = satt; st.arvinge = undefined; st.pabud = undefined; st.oratt = 0; st.krig0 = krig(s); st.folk0 = living(s).length; st.dog0 = nodDod(s); st.dogVinter = nodDod(s); // vintern där ingen dog räknas från nu
  const titel = st.titel = titelFor(s, best, vuxna);
  st.historia.push({ id: best.id, namn: best.name, titel, fran: s.now });
  count(s, 'ledare_vald');
  missnojeNoll(s);
  if (forsta) { st.oppna.push('rang'); best.fame.push('Byns första ledare'); kronikaBer(s, 'k_forstaLedare', best.id, { ...personFalt(best), titel: titel.toLowerCase() }); }
  else kronikaBer(s, 'k_ledare', best.id, { ...personFalt(best), titel: titel.toLowerCase() });
  const lt = forsta ? `Byn har fått sin första ledare: ${best.name}, ${titel.toLowerCase()}. Byn börjar fundera på om alla är lika mycket värda.` : `${best.name} är byns nya ledare, ${titel.toLowerCase()}.`;
  log(s, lt, 'world', [best.id]); notis(s, 'ledare', lt, [best.id]);
}
// de som svalt eller frusit ihjäl i byn
const nodDod = (s: State) => (s.stat?.['dog av svält'] ?? 0) + (s.stat?.['dog av kyla'] ?? 0);
// efter varje vinter (steg 4.1.1.2): ledde ledaren byn till framgång (byn växte och ingen svalt eller frös ihjäl) eller i fördärvet
function ledarensVinter(s: State, l: Person, st: Styre) {
  const folk = living(s).length, folk0 = st.folk0 ?? folk, dog = nodDod(s) - (st.dog0 ?? nodDod(s));
  if (folk > folk0 && dog === 0) upplev(s, l, 'ledFramgang');
  else if (dog >= UPPV.fordarvDod || folk < folk0 * UPPV.fordarvKrymp) upplev(s, l, 'ledFordarv');
}
// titeln (steg 3.10.18): den första raden i TITLAR som passar
const krig = (s: State) => (s.stat?.vargjakt ?? 0) + (s.stat?.vargstrid ?? 0);
function titelFor(s: State, l: Person, vuxna: Person[]) {
  const lg = legitimitet(s), d = hardDelar(s, l);
  const x: TitelLage = { vuxna, folk: living(s).length, rang: s.seder.v.rang ?? 0, leg: lg.v, stod: lg.stod, hard: 1 + d.rang + d.emp + d.agg, krig: krig(s) - (s.styre?.krig0 ?? krig(s)) };
  return TITLAR.find(t => t.passar(s, l, x))!.namn[l.sex === 'k' ? 1 : 0];
}
export const ledarTitel = (s: State, l: Person) => titelFor(s, l, vuxnaOf(s));
// yrket som visas (steg 3.10.19): ledarens titel så länge hen leder, annars yrket. p.tag räknas som förut under tiden och syns igen
// när hen slutar leda
// den skickligaste av alla med samma yrke är mästare i det (steg 7.5.9), den som går i lära är lärling
export const yrkeNamn = (s: State, p: Person) => s.styre?.ledare === p.id && alive(p) && s.styre.titel ? s.styre.titel : mastarNamn(s, p);
function mastarNamn(s: State, p: Person) {
  if (!p.tag || p.tag === 'Dagdrivare' || p.tag === 'Mästare') return p.tag;
  const lika = living(s).filter(q => q.tag === p.tag);
  if (lika.length < 2) return p.tag;
  const sum = (q: Person) => Object.values(q.skill).reduce((a, b) => a + b, 0);
  return lika.every(q => q === p || sum(q) < sum(p)) ? `Mäster${p.tag.toLowerCase()}` : p.tag;
}
// titeln ses över varje årstid, och genast om den inte finns i TITLAR (en sparad by från före steg 3.10.18)
function seOverTitel(s: State, l: Person) {
  const st = s.styre!, ny = titelFor(s, l, vuxnaOf(s)), forr = st.titel;
  seOverMinistrar(s);
  if ((s.seder.v.rang ?? 0) >= TRON.utse) { // vid Envälde utser ledaren sin efterträdare, oftast en minister eller en nära vän (steg 8.3.6)
    let b: Person | undefined, bv = -Infinity;
    for (const q of vuxnaOf(s)) { if (q === l || !knows(q, 'ledarskap')) continue; const v = (s.rels[relKey(l.id, q.id)]?.op ?? 0) + (Object.values(st.ministrar ?? {}).includes(q.id) ? 40 : 0); if (v > bv) { bv = v; b = q; } }
    if (b) st.arvinge = b.id;
  }
  if (ny === forr) return;
  st.titel = ny;
  const h = st.historia[st.historia.length - 1];
  if (h?.id === l.id && h.till === undefined) { if (forr && TITELNAMN.has(forr)) (h.forr ??= []).push(forr); h.titel = ny; }
  if (forr && TITELNAMN.has(forr)) { log(s, `Byn kallar nu ${l.name} för ${ny.toLowerCase()}.`, 'world', [l.id]); kronika(s, `Byn började kalla ${l.name} för ${ny.toLowerCase()}.`, 'ledare'); }
}
export const slutarStyre = (s: State, varfor: string) => slutar(s, varfor);
// den störtade eller den som ville störta drivs ut (steg 8.3.11–8.3.12)
export function utvisa(s: State, q: Person, av: Person, varfor: string) {
  kronikaBer(s, 'k_utvisad', q.id, { ...personFalt(q), ledare: av.name, varfor }); count(s, 'utvisad'); notis(s, 'utflytt', `${q.name} blev utvisad.`, [q.id]);
  if (s.styre?.ledare === q.id) slutar(s, 'drevs ut');
  leave(s, q);
}
function slutar(s: State, varfor: string) {
  const st = s.styre!, h = st.historia[st.historia.length - 1], l = byId(s, st.ledare!);
  if (h && h.till === undefined) { h.till = s.now; h.slut = varfor; }
  if (l) kronika(s, `${l.name} slutade leda byn (${varfor}).`, 'ledare');
  st.ledare = undefined; st.sedan = undefined; st.titel = undefined; st.pabud = undefined; st.pabudAi = undefined;
  if (!vuxnaOf(s).some(p => knows(p, 'ledarskap'))) log(s, 'Ingen i byn kan leda den längre. Påbuden gäller inte mer.', 'world');
}

// ---------- straffen ----------
// straffen (steg 8.4.8), från mildast till hårdast. Numren är de som rättegångarna sparar. Kräver = det som måste finnas i byn
export const STRAFF_REG = [
  { id: 0, namn: 'Tillrättavisning', da: 'tillrättavisade', inf: 'få höra hur fel det var', nu: 'tillrättavisar' },
  { id: 1, namn: 'Skam', da: 'skämde ut', inf: 'skämmas ut inför alla', nu: 'skämmer ut' },
  { id: 2, namn: 'Slag', da: 'slog', inf: 'få stryk', nu: 'slår' },
  { id: 3, namn: 'Utvisning', da: 'drev ut', inf: 'drivas ut ur byn', nu: 'driver ut' },
  { id: 4, namn: 'Böter', da: 'dömde till böter', inf: 'betala böter till den drabbade', nu: 'dömer till böter' },
  { id: 5, namn: 'Samhällstjänst', da: 'dömde till extra arbete', inf: 'arbeta extra för byn', nu: 'dömer till extra arbete' },
  { id: 6, namn: 'Döden', da: 'dömde till döden', inf: 'dö', nu: 'dömer till döden' },
  { id: 7, namn: 'Förlorad rätt', da: 'tog rösten från', inf: 'förlora rösten', nu: 'tar rösten från' },
  { id: 8, namn: 'Ingen vård', da: 'tog rätten till vård från', inf: 'inte få vård', nu: 'tar rätten till vård från' }, // steg 9.5.30
] as const;
const STRAFF = STRAFF_REG.map(r => r.nu);
const BROTT = new Set<HandelseTyp>(['budbrott', 'stold', 'stoldLindrig', 'sla', 'misshandel', 'drap', 'logn', 'overdrev']);
// straffets steg (0 till 3) för vikten v gånger hårdheten
function stegOf(v: number, h: HandelseTyp, rang: number) {
  if (h === 'drap' && rang >= STR.utvisRang && v >= STR.utvis) return 3;
  if (rang >= STR.slagRang && v >= STR.slag) return 2;
  return v >= STR.skam ? 1 : 0;
}
// led: den som dömer; var hen själv den drabbade står det "av henne själv" (steg 6.7.3)
const brottText = (b: Bevis, led?: string, l?: Person) => HANDELSER[b.h].text.replace('{om}', b.motNamn !== undefined && b.motNamn === led ? `${l ? honom(l) : 'ledaren'} själv` : b.motNamn ?? 'någon').replace('{sak}', b.sak ?? 'något');
// hårdhetens delar (1 + delarna, mellan STR.min och STR.max): sederna och ledarens empati, humör och aggression
function hardDelar(s: State, l: Person) {
  return { rang: STR.rang * (s.seder.v.rang ?? 0), emp: STR.empati * (10 - stat(l, 'empati', s.now)) / 10, hum: STR.humor * (0.5 - moodOf(l, s.now)), agg: STR.agg * franMitt(l, 'aggression', s.now) };
}
function doma(s: State, l: Person) {
  const st = styreOf(s), now = s.now, rang = s.seder.v.rang ?? 0;
  const domt = (st.domt ??= []);
  // det värsta som var och en gjort, det ledaren sett eller hört de senaste dygnen
  const fall = new Map<number, Bevis>();
  for (const e of l.intryck ?? []) for (const b of e.bev ?? []) {
    if (!BROTT.has(b.h) || now - b.t > STR.dygn * DAY || domt.includes(`${e.om}:${b.h}:${Math.round(b.t)}`)) continue;
    const q = byId(s, e.om);
    if (!q || !alive(q) || ageOf(q, now) < ALDER.vuxen) continue; // barn straffas inte
    const f = fall.get(e.om);
    if (!f || HANDELSER[b.h].vikt > HANDELSER[f.h].vikt) fall.set(e.om, b);
  }
  if (!fall.size) return;
  const delar = hardDelar(s, l);
  const hard0 = clamp(1 + delar.rang + delar.emp + delar.hum + delar.agg, STR.min, STR.max);
  const v = vaderNu(s), ratt = (st.ratt ??= []);
  for (const [id, b] of fall) {
    const q = byId(s, id);
    if (!q || !alive(q)) continue; // dog i en holmgång tidigare i kvällens ting
    for (const e of l.intryck ?? []) if (e.om === id) for (const x of e.bev ?? []) if (BROTT.has(x.h)) domt.push(`${id}:${x.h}:${Math.round(x.t)}`);
    const nara = l.partner === id || isKin(l, q) || (s.rels[relKey(l.id, id)]?.op ?? 0) > REL.van;
    // lagen (steg 8.4.2): straffet står i lagen och blir likadant varje gång. Den efterlevs inte alltid (steg 8.4.9)
    const lag = lagForBrott(s, b.h);
    if (lag && rnd(s, 'val') >= efterlevs(s)) { count(s, 'lag_ej_efterlevd'); continue; }
    // tinget (steg 8.4.7): vid Allmoge avgör byn skulden i en omröstning. Vid Fejd kan den anklagade kräva holmgång med den drabbade: den som vinner har rätt
    const drabbad = b.mot !== undefined ? byId(s, b.mot) : undefined;
    const utanHolm = st.utanHolm?.includes(`${id}:${b.h}:${Math.round(b.t)}`); // förlorade holmgången om det här
    if (lag && !utanHolm && (s.seder.v.fejd ?? 0) >= STR.holmgang && drabbad && alive(drabbad) && drabbad !== q && ageOf(drabbad, now) >= ALDER.vuxen && q.task?.act !== 'strid' && drabbad.task?.act !== 'strid') {
      // holmgången sker på kartan och tar tid (steg 10.1.7): vinner den anklagade är saken avgjord; förlorar hen döms hen på
      // nästa ting utan ny holmgång (EFTER.holmgang)
      kartStridBorja(s, 'skada', [[q], [drabbad]], 'en holmgång', { typ: 'holmgang', q: q.id, brott: b.h, t: Math.round(b.t) });
      count(s, 'holmgang');
      log(s, `${q.name} och ${drabbad.name} gör upp i en holmgång.`, 'rel', [q.id, drabbad.id]);
      continue;
    } else if (lag && rang <= STR.tingRost && !Object.values(st.ministrar ?? {}).length && FRAGOR.skuld) {
      if (!rostaOm(s, { f: 'skuld', d: { om: id, namn: q.name }, fram: l.id })) { count(s, 'friad'); log(s, `Byn friade ${q.name} på tinget.`, 'rel', [q.id]); continue; }
    }
    const vikt = HANDELSER[b.h].vikt, steg = lag ? lag.straff : stegOf(vikt * hard0 * (nara ? STR.nara : 1), b.h, rang);
    // det byn tycker är lagom: vikten gånger hårdheten som sederna godtar
    const lagom = lag ? lag.straff : stegOf(vikt * clamp(1 + STR.rang * rang, STR.min, STR.max), b.h, rang);
    const orattvist = lag ? !!b.falsk : steg > lagom || (nara && steg < lagom) || !!b.falsk;
    const sett = vittnen(s, l).filter(x => x !== q);
    const r: Rattegang = { t: now, led: l.id, ledNamn: l.name, om: id, namn: q.name, b: { ...b }, ...kanner(s, l, q, b), hard: hard0, ...delar,
      ...(nara ? { nara: true } : {}), steg, lagom, publik: sett.length, ...(v.lage === 'regn' ? { regn: true } : {}), ...(v.sno ? { sno: true } : {}),
      ...(temperature(s) < 0 ? { kallt: true } : {}), ...(s.fire.lit ? { eld: true } : {}), ...(!isLight(now) ? { natt: true } : {}) };
    ratt.push(r);
    count(s, 'straff'); count(s, 'straff_' + steg);
    log(s, `${l.name} ${STRAFF[steg]} ${q.name} för att ${hon(q)} ${brottText(b)}.`, 'rel', [l.id, q.id]);
    allmant(s, q, b, STR.hord, sett); // de som ser straffet får höra om brottet
    think(q, `Straffades av ${l.name}`, -STR.tanke * (steg + 1), now, STR.tankeDygn * DAY);
    const familj = living(s).filter(f => f !== l && (f === q || f.partner === id || isKin(f, q))); // innan den utvisade har lämnat byn och partnern
    if (steg >= 2 && steg !== 4) q.straffad = true; // straffad hårt: slag, utvisning, tjänst, döden eller förlorad rätt (lagen rostStraffade)
    if (steg === 4) botes(s, q, drabbad && alive(drabbad) ? drabbad : undefined); // utan någon drabbad går böterna till byn
    if (steg === 5) q.tjanst = now + STR.tjanstDygn * DAY;
    if (steg === 7) q.utanRost = true;
    if (steg === 8) q.utanVard = now + STR.vardDygn * DAY; // ingen vårdar hen under tiden (vardRatt i halsa.ts)
    if (steg === 6) { r.dog = true; q.brottsling = true; kronika(s, `${q.name} dömdes till döden.`, 'ledare'); die(s, q, 'avrattad'); continue; }
    if (steg === 1) q.skam = now + STR.skamDygn * DAY;
    if (steg === 2) { const dod = skada(s, q, 'bal', 'blamarke', STR.slagG, 'drap', `när ${l.name} straffade hen`); if (dod) { r.dog = true; die(s, q, dod); continue; } }
    if (steg === 3) { kronikaBer(s, 'k_utvisad', q.id, { ...personFalt(q), ledare: l.name, varfor: `för att ${hon(q)} ${brottText(b)}` }); count(s, 'utvisad'); notis(s, 'utflytt', `${q.name} blev utvisad ur byn av ${l.name}.`, [q.id, l.id]); leave(s, q); }
    if (orattvist) {
      missnojeStrafft(s, q, familj);
      count(s, 'straff_orattvist');
      handelse(s, l, 'orattvisDom', q);
      st.oratt = legitimitet(s).oratt + STR.oratt; st.orattT = now;
      r.oratt = true; r.leg = STR.oratt; r.van = 0;
      for (const f of familj) {
        const rel = s.rels[relKey(l.id, f.id)];
        if (rel) { rel.op = clamp(rel.op - (f === q ? STR.straffadOp : STR.familjOp), -100, 100); r.van++; }
      }
    } else handelse(s, l, 'dom', q);
  }
  if (domt.length > 200) domt.splice(0, domt.length - 200);
  if (ratt.length > STR.sparas) ratt.splice(0, ratt.length - STR.sparas);
}
// böterna går till den drabbade ur den dömdes ägodelar (steg 8.4.7): det dyraste hen äger, en hel sak. Finns ingen drabbad
// (ett bud som blivit lag) går de till byn
function botes(s: State, q: Person, d: Person | undefined) {
  const ag = (s.ting ?? []).filter(t => t.agare === q.id && t.bar === undefined && t.hos === undefined && t.lass === undefined);
  if (ag.length) { const t = ag.sort((a, b) => grundvarde(b.k) - grundvarde(a.k))[0]; t.agare = d?.id ?? BYN; count(s, 'boter'); log(s, `${q.name} gav ${sakNamn(t.k).toLowerCase()} till ${d?.name ?? 'byn'} i böter.`, 'rel', d ? [q.id, d.id] : [q.id]); return; }
  for (const k of ['grenar', 'ved', 'sten', 'flinta', 'rep']) if (ownsAmount(s, q, k) >= 1) { ownMove(s, k, Math.min(STR.bot, ownsAmount(s, q, k)), q.id, d?.id ?? BYN); count(s, 'boter'); return; }
}
// de levande (utom ledaren och den dömda) som har brottet b om q bland sina bevis: själva sett, eller hört som rykte
function kanner(s: State, l: Person, q: Person, b: Bevis) {
  const sett: number[] = [], hort: number[] = [];
  for (const x of living(s)) {
    if (x === l || x === q) continue;
    const e = x.intryck?.find(e => e.om === q.id && e.bev?.some(y => y.h === b.h && y.t === b.t && y.mot === b.mot));
    const y = e?.bev!.find(y => y.h === b.h && y.t === b.t && y.mot === b.mot);
    if (y) (y.sett ? sett : hort).push(x.id);
  }
  return { sett, hort };
}

// ---------- rättegångarna i fliken Styre (steg 3.10.17) ----------
const STRAFF_DA = STRAFF_REG.map(r => r.da);
const STRAFF_INF = STRAFF_REG.map(r => r.inf);
export const STRAFF_NAMN = STRAFF_REG.map(r => r.namn);
// texten om en rättegång: berättelsen ur mallarna r_ratt och r_folk (berattelser.ts), brottet och namnen på dem som visste
export function rattegang(s: State, r: Rattegang) {
  const q = byId(s, r.om), l = byId(s, r.led), namn = (ids: number[]) => och(ids.map(id => byId(s, id)?.name ?? 'någon som glömts'));
  const f: Fyllning = { ...(q ? personFalt(q) : { namn: r.namn, hen: 'den dömde', honom: 'den dömde' }), ledare: r.ledNamn, lhen: l ? hon(l) : 'ledaren',
    brott: brottText(r.b, r.ledNamn, l), straff: STRAFF_DA[r.steg], straffInf: STRAFF_INF[r.steg], arstid: ARSTIDER[ageIndex(s, r.t)],
    regn: !!r.regn, sno: !!r.sno, kallt: !!r.kallt, eld: !!r.eld, natt: !!r.natt, sjalv: !!r.b.sett, falsk: !!r.b.falsk,
    oratt: !!r.oratt, hard: r.steg > r.lagom, utvisad: r.steg === 3, dog: !!r.dog, manga: r.publik >= 5 };
  // två av samma kön: namnen i stället för hon och han, så att det inte blir oklart vem som menas (textminnet, steg 6.7.3)
  if (q && l && q.sex === l.sex) { f.hen = f.honom = q.name; f.lhen = l.name; }
  // samma namn två gånger i en mening utan den andra emellan: den andra gången hon eller han ("Signsfast fick svara för att han …")
  const enGang = (x: string) => !q || !l || q.sex !== l.sex ? x : x.split(/(?<=[.!?])\s+/).map(m => {
    const i = m.indexOf(q.name), j = i < 0 ? -1 : m.indexOf(q.name, i + q.name.length);
    return j > 0 && !m.slice(i, j).includes(l.name) ? m.slice(0, j) + hon(q) + m.slice(j + q.name.length) : m;
  }).join(' ');
  const t = Math.round(r.t / HOUR), nyckel = r.om * 7919 + r.led;
  const egen = q && l ? slaktOrd(l, q) : undefined; // "Igik dömde sin egen dotter." (steg 6.7.2)
  return {
    berattelse: `${enGang(fyll(valjVariant(s, 'r_ratt', nyckel, f, t), f))} ${fyll(valjVariant(s, 'r_folk', nyckel, f, t), f)}${egen ? ` ${r.ledNamn} dömde sin egen ${egen}.` : ''}`,
    brott: brottText(r.b), sett: r.sett.length ? namn(r.sett) : '', hort: r.hort.length ? namn(r.hort) : '',
  };
}

// ---------- en gång i timmen ----------
export function stepStyre(s: State) {
  const st = s.styre;
  if (!st && !living(s).some(p => knows(p, 'ledarskap'))) return;
  const ai = ageIndex(s);
  if (st?.ledare !== undefined) {
    const l = byId(s, st.ledare);
    if (!l || !alive(l)) slutar(s, l?.left !== undefined ? 'lämnade byn' : 'dog');
    else if (st.ai === ISTID && ai !== ISTID) { st.vintrar = (st.vintrar ?? 0) + 1; ledarensVinter(s, l, st); missnojeLatt(s); if (nodDod(s) === (st.dogVinter ?? 0)) for (const q of vuxnaOf(s)) tecken(s, q, 'ingenDog'); st.dogVinter = nodDod(s); } // vintern där ingen dog (steg 8.5.18)
  }
  if (st) st.ai = ai;
  if (s.styre?.ledare === undefined) valj(s);
  const l = ledareOf(s);
  if (!l) return;
  s.styre!.ai = ai;
  think(l, 'Leder byn', LED.tanke, s.now, 2 * HOUR);
  if (s.styre!.pabudAi !== ai || !TITELNAMN.has(s.styre!.titel ?? '')) seOverTitel(s, l);
  if (s.styre!.pabudAi !== ai) sattPabud(s, l, ai);
  // Förlikning – Fejd låses upp första gången en konflikt avgörs med våld (steg 8.3.5)
  if (!s.styre!.oppna.includes('fejd') && ((s.stat?.strid_skada ?? 0) + (s.stat?.strid_doda ?? 0) + (s.stat?.drap ?? 0) > 0)) oppnaSed(s, 'fejd');
  // de andra skalorna låses upp när det de styr finns i byn (steg 8.4.11–8.4.13)
  if (!s.styre!.oppna.includes('andlig') && living(s).filter(p => p.tro !== undefined).length >= 3) oppnaSed(s, 'andlig'); // steg 8.6.1
  if (!s.styre!.oppna.includes('krig') && (s.stat?.rovarstrid ?? 0) + (s.stat?.vargstrid ?? 0) > 0) oppnaSed(s, 'krig');
  if (!s.styre!.oppna.includes('delning') && (s.delning?.andel ?? 1) < 0.5) oppnaSed(s, 'delning');
  if (!s.styre!.oppna.includes('natur') && (s.fallda ?? 0) > 0) oppnaSed(s, 'natur');
  missnojeTimme(s);
  if (!ledareOf(s)) return;
  if (Math.floor(hourOf(s.now)) === STR.timme) { doma(s, l); rostKvall(s); if (!s.styre?.fragor?.length) tasUppKvall(s); kyrkaKvall(s); lagDygn(s); }
}
// skammen: den straffade håller sig undan bordet och elden (val.ts)
export const skams = (p: Person, now: number) => p.skam !== undefined && p.skam > now;
export const styrelseform = (s: State) => FORMER.find(f => f.passar(s))!;

// ---------- striderna som avgör (steg 10.1.7): de sker på kartan, och det här händer när de är slut ----------
// striden om ledarskapet: vinnaren blir ledare vid nästa val (som den fraktionen valt, frakVald)
EFTER.tronstrid = (s, e, vinnare) => {
  const v = byId(s, (vinnare === 1 ? e.b : e.a) as number), stn = styreOf(s);
  if (v && alive(v) && vinnare !== -1) { stn.frakVald = v.id; stn.satt = 1; }
};
// holmgången: vann den anklagade är saken avgjord. Förlorade hen tas brottet upp igen på nästa ting, utan ny holmgång
EFTER.holmgang = (s, e, vinnare) => {
  const q = byId(s, e.q as number), stn = styreOf(s);
  if (vinnare === 0 || !q || !alive(q)) return;
  const nyckel = `${e.q}:${e.brott}:${e.t}`;
  if (stn.domt) stn.domt = stn.domt.filter(k => !k.startsWith(`${e.q}:`));
  (stn.utanHolm ??= []).push(nyckel);
  if (stn.utanHolm.length > 40) stn.utanHolm.shift();
};
