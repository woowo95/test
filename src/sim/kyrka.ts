import { antal, gen, spelTid, stor } from './ord';
import { MIN } from './typer';
import { TROSKEL } from './forradsmal';
import { hearthOf, woodDays } from './eld';
// Kyrkan och buden (system 8.6). Registret BUD: varje bud är ett förbud, ett krav eller ett offer, med storlek (1–4), vilken nivå tron behöver och
// vilken skala och sida som ger det. Kyrkans egendom (saker i lagret som tron äger), hovet och templet, helgonen och kvädena. Allt en tro avgör är frågor i FRAGOR
// med trons krets (rost.ts). Buden gäller de troende, de starkt troende mer; ett bud som blivit lag gäller alla (LAGAR, lagar.ts).
import { Act, DAY, HOUR, Person, State } from './typer';
import { MAT } from './behov';
import { balans } from './balans';
import { clamp, rnd } from './slump';
import { HUMOR, moodOf } from './humor';
import { type Sed, drar, habitShare } from './seder';
import { ata } from './naring';
import { ALDER, KROPP, type BudTillfalle, ageOf, byId, count, getRel, living, log, relKey, satBudTillfalle, stat, think } from './folk';
import { INTRYCK, beratta, paminn, ryktbarhet, samlatIntryck } from './rykten';
import { FOOD, KOTTSLAG, sakNamn } from './saker';
import { type Ting, tingOf } from './agande';
import { MASTERVERK, kvNamn } from './kvalitet';
import { kronika } from './historik';
import { SKRIFT } from './skriftTal';
import { GUDAR, Tro, andlighet, gudarOf, skalaV, troNamn, rymsBud, troOf, troende } from './religion';
import { harMyr } from './myr';
import { farorNu, KULT, RITUALER, type RitualId, farBliPrast, heligaFor, helga, helig, heligaKandidater, hogtidAv, hogtidNamn, hogtidNu, prastOf, prastRang } from './kult';
import { FRAGOR, Fraga, FragaData, rostaOm } from './rost';
import { LAGAR, LagForslag, lagGaller } from './lagar';
import { amountOf, ownMove, ownedStock, ownsAmount, ownsId, put, takeLimit, use } from './lager';
import { BYN, kyrkaId } from './egendom';
import { eldPlats } from './karta';
import { heligVarde, heligtDjurAv, heligtDjurVarde, satHeligtDjur, satMatBud } from './kultlatt';
import { INGREDIENSER, RATT_HUVUD, type RattHuvud, rattInfo } from './ratter';
import { DJURARTER } from './redskap';
import { bedFor } from './bygg';
import { ledareOf } from './styre';
import { upplev } from './uppvaxt';
import { TROSHUS, altaret, troshusForslag, troshusRegister, troshusSaknar, vuxnaTroende } from './troshus';
import { drickAlkohol } from './rus';
import { framKval, FRAM_SKILL } from './framtradande';
import { gastRel } from './gastrel';
import { hp } from './gast';
import type { Handlare } from './handel';

export const KYRKA = balans('kyrka', {
  offerChans: 0.03, // chansen per timme att en andlig ger en gåva till kyrkan ...
  offerAnde: 55, // ... från den här andligheten
  skatt: 1, // kyrkskatten: så många saker per dygn ur byns förråd till kyrkan, per fem troende
  styrkaLiten: 15, styrkaStor: 50, styrkaMycket: 70, // så stark tro behövs för att följa ett litet, stort och mycket stort bud
  skuld: 1, // ett brutet bud ger så här mycket skuld ...
  skuldHumor: -0.05, // ... så här mycket sämre humör ...
  skuldTro: 2, // ... och så här mycket svagare tro
  stotaUt: 5, // så mycket skuld innan en sträng och mäktig kyrka stöter ut någon
  helgonDygn: 28, // ett helgon blir det tidigast så här många dygn (år i spelet) efter döden, en generation
  helgonRykte: 1, // så ryktbar bland de levande, med gott anseende, måste den döda vara för att bli helgon (steg 10.7.4); sätts efter räknaren helgon i balansen
  framPris: 2, // så många hela saker kyrkan betalar för ett framträdande (steg 10.7.18)
  fram: 0.12, // chansen per kväll att den som talar för tron lägger fram något (steg 10.3.2)
  tillfalle: 2, // ett bröllop eller en födsel bland de troende lyfter fram budet i så här många dygn (år i spelet)
  nu: 0.5, // ... så här mycket före de andra förslagen
  nedrostat: 3, // ett förslag som röstats ned i trons krets tas inte upp igen på så här många dygn (år i spelet)
  valsigna: 0.15, // så mycket översteprästens välsignelse eller fördömelse är värd i legitimiteten
  kvadeDygn: 7, // prästen diktar ett kväde en gång så här ofta
  // budens verkan (steg 8.6.6–8.6.10)
  kravTro: 0.5, kravHumor: 0.01, // ett krav som följs (tacka, hälsa elden, be vid födsel och död) ger så här mycket tro och humör
  forstaPer: 3, // den första fångsten: en hel sak mat till tron per så många som följer budet
  tionde: 0.1, tiondeMin: 10, // tionde: så stor del av den egna maten till prästen, när man äger minst så här mycket
  djur: 2, // djuroffret: så mycket kött en gång i veckan (sju dygn, sju år i spelet)
  djurSakna: -0.03, // den troende mår så här mycket sämre när det inte finns något att offra
  offerDygn: 28, // människooffret: högst en gång på så här många dygn (år i spelet), och bara den som dömts
  kvadeTro: 3, kvadeHumor: 0.04, skald: 1, // kvädet vid högtiden (steg 10.3.23): tro och humör för de samlade troende, gånger skaldens kvalitet; skald = minsta skaldskapet
  framlingRel: 10, // främlingen: så mycket bättre relation med den som ger (maten är en portion ur förrådet, steg 10.2.35)
  hamndRel: 15, // hämnden: relationen till den som gjort en våldsam handling blir så här mycket sämre
  vecka: 7, // vilodagen, fastan och djuroffret: en gång på så här många dygn (år i spelet)
  tingTro: 3, tingHumor: -0.15, tingDygn: 2, // det heliga tinget är borta (steg 10.3.20): som när en helig plats vanhelgas
});

// rösten om ett bud (steg 10.3.9, "Hur var och en röstar" i designdokumentet; startvärden): vikterna för raderna i BUDROST
export const BUDROSTTAL = balans('budrost', {
  hard: 0.12, // tron mot hårdheten: så mycket mindre per storlek
  egen: 1, // andelen av tiden i handlingarna budet förbjuder
  intresse: 0.5, // radens eget intresse
  drag: 0.2, sed: 0.1, // den egna dragningen och byns sed, där en sed hör till budet
  ande: 0.1, // den andlige är mer för alla bud
  skala: 0.15, // hur långt trons skala står på budets sida
  humor: 0.1, // humöret jämfört med grundhumöret, gånger budets storlek
  matMycket: 20, // den som äger så här mycket mat är helt emot de bud som tar av maten
});
// den som skulle bli präst om tron fick en nu (steg 10.3.12)
const blivandePrast = (s: State, tr: Tro): Person | undefined => troende(s, tr).filter(q => ageOf(q, s.now) >= ALDER.vuxen && andlighet(s, q) >= KULT.prastAnde && farBliPrast(tr, q)).sort((a, b) => prastRang(s, b) - prastRang(s, a))[0];
// den som kunde bli präst men stängs ute av budet är emot det (steg 10.3.11)
const utestangd = (s: State, p: Person, kon: 'k' | 'm') => p.sex !== kon && ageOf(p, s.now) >= ALDER.vuxen && andlighet(s, p) >= KULT.prastAnde ? { v: -1, why: 'Kan inte bli präst med budet' } : { v: 0, why: '' };
// den som äger mycket mat är emot de bud som tar av den
const matIntresse = (s: State, p: Person) => { const egen = ownedStock(s, p), n = FOOD.reduce((a, k) => a + (egen[k] ?? 0), 0); return { v: -clamp(n / BUDROSTTAL.matMycket, 0, 1), why: 'Äger mycket mat' }; };
export interface BudDef { namn: string; sort: 'forbud' | 'krav' | 'offer'; storlek: 1 | 2 | 3 | 4; skala?: 'natur' | 'manga' | 'prast' | 'livet' | 'forlat' | 'fest' | 'krig' | 'oppen' | 'sprid'; sida?: 0 | 1; acts?: Act[]; text: string; kyla?: boolean
  // ett bud som bär ett värde (steg 10.3.1): de värden som går att föreslå just nu (en tidsålder, ett ting, en plats, en djurart, en ingrediens),
  // och vad värdet heter i budets namn. Samma rad kan antas en gång per värde; utan varden antas raden en gång
  varden?(s: State, tr: Tro): BudVarde[]; vardeNamn?(s: State, v: BudVarde): string
  kraver?: string; // budet kan bara föreslås när tron har det här (offret vid högtiden kräver en högtid)
  finns?(s: State): boolean; // budet kan bara föreslås när världen har det (offret i myren kräver en myr, steg 12.1.5)
  nu?(s: State, tr: Tro): boolean; // budets tillfälle är nu: det lyfts fram bland trons förslag (steg 10.3.3)
  om?(s: State, tr: Tro, b: AntagetBud): string // ritualbuden: när, vilka, var, vad som går åt (fliken Religion)
  och?: [NonNullable<BudDef['skala']>, 0 | 1]; // en andra skala som också ska stå på budets sida (skändningen: Krigisk och Sluten, steg 10.4.13)
  grupp?: string; // bud i samma grupp utesluter varandra: tron har högst ett av dem (steg 10.3.11)
  sed?: [Sed, 1 | -1]; // sederna som hör till budet: sedens sida som drar mot budet (steg 10.3.9)
  intresse?(s: State, p: Person, tr: Tro, v?: BudVarde): { v: number; why: string } // radens eget intresse, -1 till 1, för budets värde (steg 10.3.9)
  antas?(s: State, tr: Tro, b: AntagetBud): void // det som händer när budet antas (steg 10.3.10)
  tasBort?(s: State, tr: Tro, b: AntagetBud): void // och när det tas bort (steg 10.3.13)
  mat?(v?: BudVarde): string[]; dag?: true; // matbuden (steg 10.3.16): huvudingredienserna budet förbjuder, och om det bara gäller den heliga dagen
  storlekAv?(v: BudVarde): 1 | 2 | 3 | 4; // storleken när den hör till värdet (det heliga djuret, steg 10.3.15)
  ritual?: RitualId } // ritualen budet håller: den som står i kön hålls inte när budet tas bort
export type BudVarde = string | number;
// ett antaget bud: raden, värdet den gäller och när den antogs (steg 10.3.1)
export interface AntagetBud { id: BudId; v?: BudVarde; t: number }
// det heliga djurets art: namnet, och hur stor del av köttet byn slaktat som arten gett (steg 10.3.15)
export const ART_NAMN: Record<string, string> = { kanin: 'Haren', varg: 'Vargen', radjur: 'Rådjuret', vildsvin: 'Vildsvinet', far: 'Fåret', get: 'Geten', fagel: 'Fågeln', bjorn: 'Björnen' };
export function kottAndel(s: State, art: string) {
  let a = 0, alla = 0;
  for (const d of DJURARTER) { if (d.act !== 'slakta' || !d.kott) continue; const n = (s.stat?.[d.stat] ?? 0) * (d.slakt[d.kott] ?? 0); alla += n; if (d.art === art) a += n; }
  return alla > 0 ? a / alla : 0;
}
// storleken: 2 när arten ger mindre än en tjugondel av köttet, 3 under en fjärdedel, annars 4
export const djurStorlek = (s: State, art: string) => { const a = kottAndel(s, art); return a < 1 / 20 ? 2 : a < 1 / 4 ? 3 : 4; };
// begravningarnas tal för budens texter: grav.ts fyller i dem ur BEGRAVNINGAR (steg 12.1.120), så att texten följer koden
export const BEGR_TAL = { balVed: 4, balMin: 2, vattenMin: 2, vakaTim: 4, gravolTim: 2 };
export const BUD = {
  tacka: { namn: 'Tacka gudarna före maten', sort: 'krav', storlek: 1, skala: 'livet', sida: 0, text: 'Man tackar innan man äter' },
  tecken: { namn: 'Bära trons tecken', sort: 'krav', storlek: 1, skala: 'natur', sida: 0, text: 'De troende bär tecknet' },
  halsa: { namn: 'Hälsa elden på morgonen', sort: 'krav', storlek: 1, text: 'Man hälsar elden när man vaknar' },
  deDoda: { namn: 'Inte tala illa om de döda', sort: 'forbud', storlek: 1, skala: 'natur', sida: 1, text: 'De döda talar man väl om' },
  fodsel: { namn: 'Bön vid födsel och död', sort: 'krav', storlek: 1, text: 'Man ber när någon föds eller dör' },
  forstaFangst: { namn: 'Den första fångsten offras', sort: 'offer', storlek: 2, skala: 'livet', sida: 0, text: 'Det första man får går till tron', intresse: (s, p) => matIntresse(s, p) },
  gravgava: { namn: 'Gravgåvor till de döda', sort: 'offer', storlek: 2, skala: 'livet', sida: 1, text: 'De döda får något med sig' },
  medfolj: { namn: 'Det den döde bar följer med', sort: 'offer', storlek: 3, skala: 'livet', sida: 1, text: 'Allt den döde bar följer hen och ärvs inte' },
  lunden: { namn: 'Inte fälla träd i den heliga lunden', sort: 'forbud', storlek: 2, skala: 'natur', sida: 0, text: 'Lunden får stå', sed: ['natur', -1] },
  kottHelg: { namn: 'Inget kött på heliga dagar', sort: 'forbud', storlek: 2, skala: 'fest', sida: 1, text: 'Inget kött på den heliga dagen', mat: () => ['kott'], dag: true }, // ätandet, inte slakten (steg 10.3.16)
  // de nya förbuden (steg 10.3.22). Bud med dag gäller bara den heliga dagen (heligDag)
  ingetRus: { namn: 'Inget rus', sort: 'forbud', storlek: 3, skala: 'fest', sida: 1, text: 'De troende dricker inget som ger rus',
    om: () => 'De som följer budet tar inte öl, vin, mjöd eller sprit till kvällen eller mot törsten, och den som super sig full bryter budet.' }, // rus.ts frågar
  djurVilar: { namn: 'Djuren vilar på den heliga dagen', sort: 'forbud', storlek: 2, skala: 'natur', sida: 0, text: 'Ingen slaktar eller klipper djuren på den heliga dagen', acts: ['avliva', 'klippa'], dag: true },
  ingenHandel: { namn: 'Inte handla med främlingar', sort: 'forbud', storlek: 3, skala: 'oppen', sida: 1, text: 'Man handlar inte med främlingar', acts: ['handla', 'koa'] }, // gåvorna går som förut
  ingenStrid: { namn: 'Ingen strid på heliga dagar', sort: 'forbud', storlek: 3, skala: 'krig', sida: 0, text: 'Ingen börjar slåss på den heliga dagen', dag: true,
    om: () => 'På den heliga dagen börjar de som följer budet ingen strid, inget slagsmål och ingen brottning. Den som anfalls försvarar sig.' }, // kartstrid.ts, sport.ts, behov.ts och styre.ts frågar budHindrar
  ingenHan: { namn: 'Ingen hånar gudarna', sort: 'forbud', storlek: 1, skala: 'forlat', sida: 1, text: 'Ingen hånar gudarna' }, // budskapet hanaGud (framtradande.ts)
  // de nya kraven och offren (steg 10.3.23)
  olHogtid: { namn: 'Öl vid högtiden', sort: 'krav', storlek: 2, skala: 'fest', sida: 0, kraver: 'hogtid', text: 'Var och en dricker en öl ur kyrkans krukor vid högtiden',
    om: () => 'Vid varje högtid dricker varje vuxen som är med en öl ur en kruka som kyrkan äger, och den tomma krukan blir kvar. När kyrkan har färre krukor öl än det finns vuxna troende ger den som tappar öl en kruka till kyrkan. Saknas ölet mår de som följer budet lite sämre.' },
  forstaSkord: { namn: 'Den första skörden offras', sort: 'offer', storlek: 2, skala: 'livet', sida: 0, text: 'Det första ur varje skörd går till tron',
    om: () => 'Den första hela saken ur varje ny skörd på ett fält går till kyrkans egendom, när den som skördar följer budet.' }, // odling.ts frågar forstaSkorden
  valkomna: { namn: 'Handlaren ska välkomnas', sort: 'krav', storlek: 1, skala: 'oppen', sida: 0, text: 'Handlaren får mat när hen kommer',
    om: () => 'När handlaren kommer får handlaren en måltid ur byns förråd, en gång per besök, och de som följer budet kommer bättre överens med handlaren.' }, // handel.ts frågar valkomnaHandlare
  begravFiende: { namn: 'Den fallne fienden begravs', sort: 'krav', storlek: 2, skala: 'forlat', sida: 0, text: 'En fallen fiende får en grav',
    om: () => 'De som följer budet begraver en avrustad fiende på trons gravplats, med vanlig grävtid, i stället för att hen ligger kvar.' }, // grav.ts
  // vem som får en grav och vem som skändas (steg 10.4.13): den som tar hand om kroppen följer sin egen tros bud (grav.ts odeVal)
  egnaGrav: { namn: 'Bara byns egna får en grav', sort: 'forbud', storlek: 2, skala: 'oppen', sida: 1, text: 'En främling som dör bärs ut i skogen',
    om: () => 'En gäst som dör får ingen grav av den som följer budet, utan bärs ut i skogen som en fallen fiende.' },
  gottNamn: { namn: 'Bara den med gott namn får en grav', sort: 'forbud', storlek: 3, skala: 'oppen', sida: 1, text: 'Den som byn talar illa om bärs ut i skogen',
    om: () => 'En bybo vars anseende i byn är under noll får ingen grav av den som följer budet, utan bärs ut i skogen.' },
  skanda: { namn: 'De ovärdiga skändas', sort: 'krav', storlek: 4, skala: 'krig', sida: 1, och: ['oppen', 1], text: 'Brottslingen, den ökända och fienden skändas',
    antas: (s, tr, b) => { b.v = skandVal(s, tr); }, vardeNamn: (_s, v) => skandNamn(v),
    om: (_s, _tr, b) => `Den som följer budet ger brottslingen, den ökända och den fallne fienden trons skändning: ${skandNamn(b.v ?? '').toLowerCase()}. Att se en skändad kropp är värre än att se en död, och en gäst som ser den gör sin klan ovänligare.` },
  // gravens vård (steg 10.4.2): en rad i GRAVAR (grav.ts) per bud. Det som drar mest blir sed vid trons första begravning
  gravStolpe: { namn: 'En gravstolpe på graven', sort: 'krav', storlek: 1, skala: 'natur', sida: 0, grupp: 'gravvard', text: 'Graven får en stolpe av trä' },
  gravBrada: { namn: 'En gravbräda på graven', sort: 'krav', storlek: 1, skala: 'natur', sida: 1, grupp: 'gravvard', text: 'Graven får en bräda med den dödas namn' },
  stockram: { namn: 'En stockram kring graven', sort: 'krav', storlek: 1, skala: 'oppen', sida: 1, grupp: 'gravvard', text: 'Graven ramas in med stockar' },
  gravhus: { namn: 'Ett gravhus över graven', sort: 'krav', storlek: 2, skala: 'livet', sida: 1, grupp: 'gravvard', text: 'Graven får ett litet hus' },
  // begravningens former (steg 10.4.5): kroppens väg och samlingen, en rad i BEGRAVNINGAR (grav.ts) per bud
  bal: { namn: 'Bål', sort: 'krav', storlek: 1, skala: 'natur', sida: 0, grupp: 'vag', text: 'De döda bränns på ett bål',
    om: () => `${stor(antal(BEGR_TAL.balVed, 'ved'))} tas vid graven, och att lägga och tända bålet tar ${spelTid(BEGR_TAL.balMin * MIN)} till. Askan får en grav och en vård som andra. Saknas veden begravs den döda i jorden.` }, // talen ur BEGRAVNINGAR (grav.ts, steg 12.1.120)
  vattenGrav: { namn: 'Vattnet', sort: 'krav', storlek: 1, skala: 'natur', sida: 0, grupp: 'vag', text: 'De döda sänks i sjön',
    om: () => `Kroppen bärs till trons plats vid stranden och sänks där, vilket tar ${spelTid(BEGR_TAL.vattenMin * MIN)}. Sjön minns de sänkta.` },
  tystBegr: { namn: 'Den tysta begravningen', sort: 'krav', storlek: 1, skala: 'fest', sida: 1, grupp: 'samling', text: 'Bara familjen samlas vid graven',
    om: () => `Förälder, barn och partner samlas vid graven under ${spelTid(BEGR_TAL.vakaTim * HOUR)}. De får lite humör och tro.` },
  vanligBegr: { namn: 'Begravningen', sort: 'krav', storlek: 2, grupp: 'samling', text: 'Trosfränderna samlas vid graven',
    om: () => `Trosfränderna och familjen samlas vid graven under ${spelTid(BEGR_TAL.vakaTim * HOUR)}, och prästen leder när tron har en. De får humör och tro.` },
  // tilläggen till begravningen (steg 10.4.12): egna bud, en rad i BEGRAVNINGAR (grav.ts) var, som kan läggas till de andra formerna
  vaka: { namn: 'Vakan', sort: 'krav', storlek: 1, skala: 'natur', sida: 1, text: 'De nära sitter hos den döda kvällen efter',
    om: () => 'De som stod den döda nära sitter hos kroppen från kl. 20 kvällen efter dödsfallet till midnatt. Den som följer budet bär inte kroppen till graven före vakan.' },
  sorgkvade: { namn: 'Sorgkvädet', sort: 'krav', storlek: 2, text: 'Trons skald kväder om den döda vid begravningen',
    om: () => 'När trosfränderna samlas vid graven och en troende skald som minns den döda är med, sprids hens minne till alla som är där.' },
  gravol: { namn: 'Gravöl', sort: 'krav', storlek: 3, skala: 'fest', sida: 0, text: 'Byns vuxna äter och dricker öl efter begravningen',
    om: () => `Efter begravningen samlas byns vuxna vid elden under ${spelTid(BEGR_TAL.gravolTim * HOUR)}. En måltid per två och en kruka öl var tas ur kyrkans egendom. Räcker det inte hålls inget gravöl.` },
  // gravplatsen (steg 10.4.6): en rad i GRAVPLATSER (grav.ts) per bud. Den blir sed när den första troende dör, så att också hen hamnar där
  gravNara: { namn: 'Gravplatsen nära byn', sort: 'krav', storlek: 1, skala: 'natur', sida: 1, grupp: 'gravplats', text: 'De döda vilar strax utanför byn' },
  gravBryn: { namn: 'Gravplatsen i skogsbrynet', sort: 'krav', storlek: 1, skala: 'natur', sida: 0, grupp: 'gravplats', text: 'De döda vilar där skogen börjar' },
  gravSjo: { namn: 'Gravplatsen vid sjön', sort: 'krav', storlek: 1, skala: 'natur', sida: 0, grupp: 'gravplats', text: 'De döda vilar nära vattnet' },
  gravDjup: { namn: 'Gravplatsen djupt i skogen', sort: 'krav', storlek: 1, skala: 'natur', sida: 0, grupp: 'gravplats', text: 'De döda vilar inne i den täta skogen',
    om: () => 'Tio rutor utanför byn där skogen är tät. Långt att bära kroppen och långt till vården och besöken.' },
  gravLangt: { namn: 'Gravplatsen långt från byn', sort: 'krav', storlek: 1, skala: 'forlat', sida: 1, grupp: 'gravplats', text: 'De döda hålls långt från de levande',
    om: () => 'Femton rutor utanför byn. Långt att bära kroppen och långt till vården och besöken.' },
  gravHelig: { namn: 'Gravplatsen vid den heliga platsen', sort: 'krav', storlek: 1, grupp: 'gravplats', text: 'De döda vilar vid trons heliga plats' },
  gravsten: { namn: 'En gravsten med runor', sort: 'krav', storlek: 2, skala: 'natur', sida: 1, grupp: 'gravvard', text: 'Graven får en sten med runor' }, // stengravarna (steg 10.4.3)
  stensattning: { namn: 'En stensättning kring graven', sort: 'krav', storlek: 2, skala: 'oppen', sida: 1, grupp: 'gravvard', text: 'Graven får en ring av stenar' },
  skeppssattning: { namn: 'De stora får en skeppssättning', sort: 'krav', storlek: 2, skala: 'livet', sida: 1, grupp: 'storagrav', text: 'Ledare, helgon och legender får stenar i form av ett skepp',
    om: () => 'Den som varit ledare, är trons helgon eller var en legend med gott anseende när hen begravdes får stenar resta i form av ett skepp i stället för den vanliga vården.' },
  gravhog: { namn: 'De stora får en gravhög', sort: 'krav', storlek: 1, skala: 'livet', sida: 1, grupp: 'storagrav', text: 'Ledare, helgon och legender får en gravhög',
    om: () => 'Den som varit ledare, är trons helgon eller var en legend med gott anseende när hen begravdes får en gravhög av jord och torv i stället för den vanliga vården.' },
  kvade: { namn: 'Kväden vid högtiden', sort: 'krav', storlek: 1, skala: 'fest', sida: 0, kraver: 'hogtid', text: 'Den bästa skalden kväder om tron vid högtiden',
    om: () => 'Den som är bäst i skaldskap bland dem som är med framför ett kväde om tron för de samlade. Saknas skalden mår de som följer budet lite sämre.' },
  framling: { namn: 'Främlingar ska få mat', sort: 'krav', storlek: 2, skala: 'oppen', sida: 0, text: 'Den som kommer får äta', sed: ['gemenskap', 1] },
  orena: { namn: 'En fiendes saker är orena', sort: 'forbud', storlek: 2, skala: 'oppen', sida: 1, text: 'Man rör inte det fienden bar' }, // steg 10.3.6
  giftaTro: { namn: 'Inte gifta sig utanför tron', sort: 'forbud', storlek: 2, skala: 'oppen', sida: 1, text: 'Man gifter sig inom tron' },
  fasta: { namn: 'Fasta vissa dagar', sort: 'krav', storlek: 3, skala: 'fest', sida: 1, text: 'Vissa dagar äter man inte' },
  vilodag: { namn: 'En vilodag av sju', sort: 'forbud', storlek: 3, text: 'Den sjunde dagen arbetar ingen', sed: ['arbete', -1] },
  ingetKott: { namn: 'Inte döda djur', sort: 'forbud', storlek: 3, skala: 'krig', sida: 0, text: 'Man dödar inga djur och äter inget kött', acts: ['jakt', 'slakta'], mat: () => ['kott'], sed: ['natur', -1] },
  orent: { namn: 'Inte gräva i jorden', sort: 'forbud', storlek: 3, skala: 'natur', sida: 0, text: 'Jorden är helig', acts: ['stubbe', 'plantera'], sed: ['natur', -1] },
  tionde: { namn: 'Tionde till prästen', sort: 'offer', storlek: 3, skala: 'prast', sida: 1, text: 'En tiondel går till prästen', intresse: (s, p) => matIntresse(s, p) },
  hamnd: { namn: 'Hämnd är en plikt', sort: 'krav', storlek: 3, skala: 'forlat', sida: 1, text: 'Den som drabbas ska hämnas', sed: ['fejd', 1] },
  djuroffer: { namn: 'Djuroffer', sort: 'offer', storlek: 3, skala: 'krig', sida: 1, text: 'Tron kräver djur' },
  aldrigDoda: { namn: 'Aldrig döda en människa', sort: 'forbud', storlek: 4, skala: 'krig', sida: 0, text: 'Inte ens i försvar', acts: ['strid'], sed: ['krig', -1] },
  ingenRoj: { namn: 'Ingen ny mark får röjas', sort: 'forbud', storlek: 4, skala: 'natur', sida: 0, text: 'Skogen får stå', acts: ['falla'], sed: ['natur', -1] },
  ogifta: { namn: 'Prästerna lever ogifta', sort: 'forbud', storlek: 4, skala: 'fest', sida: 1, text: 'Prästen ger sig åt tron', intresse: (s, p, tr) => prastOf(s, tr) === p ? { v: -1, why: 'Är själv präst' } : { v: 0, why: '' } },
  // prästens bud (steg 10.3.11): vem som får bli präst och dräkten. Den som stängs ute och kunde bli präst röstar emot
  prastKvinna: { namn: 'Bara kvinnor blir präster', sort: 'forbud', storlek: 1, grupp: 'prastkon', text: 'Bara en kvinna kan bli präst', intresse: (s, p) => utestangd(s, p, 'k') },
  prastMan: { namn: 'Bara män blir präster', sort: 'forbud', storlek: 1, grupp: 'prastkon', text: 'Bara en man kan bli präst', intresse: (s, p) => utestangd(s, p, 'm') },
  // prästen (steg 10.3.12): den sittande prästen och den som skulle bli präst vill ha budet
  prast: { namn: 'Tron ska ha en präst', sort: 'krav', storlek: 2, text: 'Tron har en präst som leder den', tasBort: (s, tr) => { const pr = prastOf(s, tr); tr.prast = undefined; if (pr) log(s, `${pr.name} är inte längre präst i ${troNamn(tr).toLowerCase()}.`, 'rel', [pr.id]); }, intresse: (s, p, tr) => prastOf(s, tr) === p ? { v: 1, why: 'Är själv präst' } : !prastOf(s, tr) && blivandePrast(s, tr) === p ? { v: 1, why: 'Skulle själv bli präst' } : { v: 0, why: '' } },
  drakt: { namn: 'Prästen bär en egen dräkt', sort: 'krav', storlek: 1, text: 'Byn syr en dräkt åt prästen, och ritualen hon eller han leder ger mer i den' },
  // den heliga platsen (steg 10.3.10): den kandidat som kom först föreslås, och värdet är rutan. De troende vill ha den nära hemmet
  helig: { namn: 'En helig plats', sort: 'krav', storlek: 1, text: 'Tron ber och samlas vid en helig plats',
    varden: (s, tr) => { const k = heligaKandidater(s, tr)[0]; return k ? [heligVarde(k.x, k.y)] : []; },
    vardeNamn: (s, v) => { const [x, y] = String(v).split(',').map(Number), h = s.heliga?.find(q => q.x === x && q.y === y); if (h) return h.om; for (const tr of s.tron ?? []) { const k = heligaKandidater(s, tr).find(q => q.x === x && q.y === y); if (k) return k.om; } return `rutan ${v}`; },
    intresse: (s, p, _tr, v) => { const [x, y] = String(v).split(',').map(Number), hem = bedFor(s, p) ?? eldPlats(s), d = Math.hypot(hem.x - x, hem.y - y); return d > KULT.heligR ? { v: 0, why: '' } : { v: 1 - d / KULT.heligR, why: 'Platsen ligger nära hemmet' }; },
    antas: (s, tr, b) => { const [x, y] = String(b.v).split(',').map(Number), k = heligaKandidater(s, tr).find(q => q.x === x && q.y === y); helga(s, tr, x, y, k?.om ?? 'en helig plats'); },
    tasBort: (s, tr, b) => { const [x, y] = String(b.v).split(',').map(Number); s.heliga = (s.heliga ?? []).filter(h => !(h.tro === tr.id && h.x === x && h.y === y && !h.skandad)); }, // platsen slutar vara helig
    om: (s, _tr, b) => { const [x, y] = String(b.v).split(',').map(Number), h = s.heliga?.find(q => q.x === x && q.y === y); return h ? `De troende ber här när de bor inom ${KULT.heligR} rutor. ${h.boner ?? 0} böner och ${h.ritualer ?? 0} ritualer har hållits här.` : ''; } },
  // det heliga djuret (steg 10.3.15): arten kommer ur trons gudar, och storleken ur hur mycket av köttet byn slaktat som arten gav.
  // Jakten, slakten, avlivningen, ätandet och klädvalet frågar heligtFor (kultlatt.ts); svält och kyla går före och bryter budet
  heligtDjur: { namn: 'Ett heligt djur', sort: 'forbud', storlek: 2, text: 'De troende jagar, slaktar, äter och bär inte djuret',
    varden: (s: State, tr: Tro): string[] => [...new Set(gudarOf(tr).flatMap(g => g.omr.flatMap(o => GUDAR[o].djur as string[])))].filter(a => !tr.bud?.some((b: AntagetBud) => b.id === 'heligtDjur' && heligtDjurAv(b.v).art === a)).map(a => heligtDjurVarde(a, djurStorlek(s, a))),
    vardeNamn: (_s, v) => ART_NAMN[heligtDjurAv(v).art] ?? heligtDjurAv(v).art, storlekAv: v => heligtDjurAv(v).st as 2 | 3 | 4,
    intresse: (s, p, _tr, v) => { const a = kottAndel(s, heligtDjurAv(v).art), h = habitShare(p, ['jakt', 'slakta', 'avliva']); return a > 0 && h > 0 ? { v: -clamp(4 * a * h / 0.1, 0, 1), why: 'Jagar och slaktar djuret' } : { v: 0, why: '' }; },
    om: (_s, _tr, b) => `${ART_NAMN[heligtDjurAv(b.v).art]} är heligt. De som följer budet jagar, slaktar och avlivar det inte, äter inte dess råa kött och bär inte dess skinn, utom i svält och kyla.` },
  // det heliga tinget (steg 10.3.20): ett mästerverk som står på altaret i trons hus. Ägaren vill inte lämna det, den som gjorde det vill.
  // Finns tinget inte kvar faller budet (heligaTingKvar)
  heligtTing: { namn: 'Ett heligt ting', sort: 'offer', storlek: 2, text: 'Ett mästerverk står på altaret i trons hus och används inte',
    varden: (s: State, tr: Tro): number[] => { const t = heligtTingKandidat(s, tr); return t ? [t.id] : []; },
    vardeNamn: (s, v) => { const t = tingOf(s).find(q => q.id === Number(v)); return t ? heligtTingNamn(t) : 'ett ting som inte finns kvar'; },
    intresse: (s, p, _tr, v) => { const t = tingOf(s).find(q => q.id === Number(v)); return !t ? { v: 0, why: '' } : t.agare === p.id ? { v: -1, why: 'Äger tinget själv' } : t.av === p.id ? { v: 1, why: 'Gjorde tinget' } : { v: 0, why: '' }; },
    antas: (s, tr, b) => helgaTing(s, tr, Number(b.v)),
    tasBort: (s, tr, b) => { const t = tingOf(s).find(q => q.id === Number(b.v) && q.helig === tr.id); if (t) t.helig = t.vid = undefined; }, // det står kvar som ett vanligt mästerverk
    om: (s, _tr, b) => { const t = tingOf(s).find(q => q.id === Number(b.v)); return t ? `${heligtTingNamn(t)} står på altaret. Ingen arbetar med det eller bär det. Bönen i trons hus blir starkare, och tas tinget faller budet.` : ''; } },
  // maten som bud (steg 10.3.16): en huvudingrediens ur trons gudar. Förbudet gäller råvaran och alla rätter av den; kravet gör att
  // högtidens mat tas ur den först
  matForbud: { namn: 'Förbjuden mat', sort: 'forbud', storlek: 3, skala: 'fest', sida: 1, text: 'De troende äter inte maten, och en troende kock lagar den inte',
    varden: (_s: State, tr: Tro): string[] => matVarden(tr, 'matForbud'), vardeNamn: (s, v) => (n => n ? `${huvudNamn(v)} (${n})` : huvudNamn(v))(specialHuvud(s, String(v))), mat: v => [String(v)], // vardeNamn: byns egen rätt (steg 10.7.29)
    om: (_s, _tr, b) => `${huvudNamn(b.v)} och alla rätter av det. De som följer budet äter det inte, och en troende kock lagar det inte, utom i svält.` },
  matKrav: { namn: 'Högtidens mat', sort: 'krav', storlek: 1, skala: 'fest', sida: 0, kraver: 'hogtid', text: 'Maten vid högtiden tas ur huvudingrediensen först',
    varden: (_s: State, tr: Tro): string[] => matVarden(tr, 'matKrav'), vardeNamn: (_s, v) => huvudNamn(v),
    om: (_s, _tr, b) => `Vid högtiden äter man ${huvudNamn(b.v).toLowerCase()} först, lagat före rått. Saknas det mår de som följer budet lite sämre.` },
  // ritualerna som bud (steg 10.3.3)
  hogtid: { namn: 'Högtid', sort: 'krav', storlek: 1, ritual: 'hogtid', text: 'Tron firar en högtid i en tidsålder', varden: hogtidNu, vardeNamn: (_s, v) => hogtidNamn(v), nu: () => true,
    om: (s, tr, b) => { const { ai, form } = hogtidAv(b.v); return `${['I istiden', 'I vårtiden', 'I sommartiden', 'I hösttiden'][ai]}, under ${spelTid(RITUALER.hogtid.tim * HOUR)}. De troende samlas ${helig(s, tr) ? 'vid den heliga platsen' : 'vid elden'}. ${form === 'fasta' ? 'Ingen mat: ett år utan mat.' : 'En hel mat per närvarande, ur kyrkans egendom först och annars ur den egna maten.'}`; } },
  offer: { namn: 'Offer vid högtiden', sort: 'offer', storlek: 2, kraver: 'hogtid', text: 'Var och en lägger en mat på den heliga platsen',
    om: (s, tr) => `Vid varje högtid. Var och en som följer budet lägger en måltid av den mat de äger mest av, ${helig(s, tr) ? 'på den heliga platsen' : 'vid elden'}, och den är borta.` },
  valsigna: { namn: 'Bröllopet välsignas', sort: 'krav', storlek: 1, text: 'Paret vigs vid den heliga platsen', nu: (s, tr) => (tr.brollop ?? -Infinity) + KYRKA.tillfalle * DAY > s.now,
    om: (s, tr) => `När två i tron gifter sig. Byns fest hålls ${helig(s, tr) ? 'vid den heliga platsen' : 'vid elden'}, prästen leder, och de troende får tro. Maten är byns, som vid alla bröllop.` },
  dop: { namn: 'Dopet', sort: 'krav', storlek: 1, ritual: 'dop', text: 'Barnet välsignas när det fötts', nu: (s, tr) => (tr.fodd ?? -Infinity) + KYRKA.tillfalle * DAY > s.now,
    om: (s, tr) => `När ett barn föds och moderns tro, annars faderns, har budet. Byn samlas i en timme ${helig(s, tr) ? 'vid den heliga platsen' : 'vid elden'}. Inget går åt.` },
  vuxen: { namn: 'Vuxenblivandet', sort: 'krav', storlek: 1, ritual: 'vuxen', text: 'Den unga välsignas när hen blir vuxen', nu: (s, tr) => (tr.vuxen ?? -Infinity) + KYRKA.tillfalle * DAY > s.now,
    om: (s, tr) => `När någon fyller ${ALDER.vuxen} år och hens tro, annars moderns, annars faderns, har budet. Byn samlas i en timme ${helig(s, tr) ? 'vid den heliga platsen' : 'vid elden'}. Inget går åt.` },
  myrOffer: { namn: 'Offer i myren', sort: 'offer', storlek: 2, skala: 'natur', sida: 0, ritual: 'myrOffer', text: 'Det mest värda kyrkan äger sänks i myren', finns: s => harMyr(s),
    om: () => `En gång om året samlas de troende under ${spelTid(RITUALER.myrOffer.tim * HOUR)} vid myrens kant närmast byn och sänker det mest värda vapnet, smycket eller maten som kyrkan äger. Saken är borta för gott, och ju mer den var värd, desto mer stärks tron. Äger kyrkan inget sådant hålls inget offer.` },
  manniskooffer: { namn: 'Människooffer', sort: 'offer', storlek: 4, skala: 'krig', sida: 1, text: 'Tron kräver det yttersta' },
} satisfies Record<string, BudDef>;
export type BudId = keyof typeof BUD;
const BDEF: Record<BudId, BudDef> = BUD;
const budLag = (id: BudId) => 'bud_' + id;
// har tron antagit raden (för något värde)?
export const budIn = (tr: Tro | undefined, id: BudId): tr is Tro => !!tr?.bud?.some(b => b.id === id);
// budets namn, med värdet när det har ett
export const budNamn = (s: State, b: { id: BudId; v?: BudVarde }) => { const d = BDEF[b.id]; return b.v === undefined ? d.namn : `${d.namn}: ${d.vardeNamn ? d.vardeNamn(s, b.v) : String(b.v)}`; };
// de bud raden kan föreslås som nu: ett per värde som inte redan antagits, eller raden själv en gång
export const budForslag = (s: State, tr: Tro, id: BudId): { id: BudId; v?: BudVarde }[] => {
  const d = BDEF[id];
  if (!d.varden) return budIn(tr, id) ? [] : [{ id }];
  return d.varden(s, tr).filter(v => !tr.bud?.some(b => b.id === id && b.v === v)).map(v => ({ id, v }));
};
// ett bud tas bort (steg 10.3.13): budets egen borttagning körs, och ritualen det höll hålls inte när den står i kön
export function taBortBud(s: State, tr: Tro, b: { id: BudId; v?: BudVarde }) {
  const d = BDEF[b.id], gammal = tr.bud?.find(q => q.id === b.id && q.v === b.v);
  if (!gammal) return;
  tr.bud = tr.bud!.filter(q => q !== gammal);
  d.tasBort?.(s, tr, gammal);
  if (d.ritual) s.ritualKo = (s.ritualKo ?? []).filter(r => !(r.tro === tr.id && r.k === d.ritual && (b.id !== 'hogtid' || r.namn === hogtidNamn(b.v!))));
}
// budet som ett nytt bud skulle ersätta (steg 10.3.13): ett bud i samma grupp, eller den minst använda heliga platsen när tron har KULT.heligTak
export function ersatter(s: State, tr: Tro, b: { id: BudId; v?: BudVarde }): AntagetBud | undefined {
  const d = BDEF[b.id];
  if (d.grupp) return tr.bud?.find(q => q.id !== b.id && BDEF[q.id]?.grupp === d.grupp);
  if (b.id === 'helig' && heligaFor(s, tr).length >= KULT.heligTak) {
    const h = heligaFor(s, tr).sort((a, c) => (a.boner ?? 0) + (a.ritualer ?? 0) - (c.boner ?? 0) - (c.ritualer ?? 0))[0];
    return tr.bud?.find(q => q.id === 'helig' && q.v === heligVarde(h.x, h.y));
  }
  return undefined;
}
// ett bud som blivit lag är en rad i LAGAR (steg 8.6.11–8.6.12): den gäller alla och straffas på tinget
// följer p budet? De troende följer de små, de starkt troende mer (steg 8.6.8)
export const foljerStorlek = (p: Person, storlek: number) => (p.troStyrka ?? 0) >= (storlek <= 2 ? KYRKA.styrkaLiten : storlek === 3 ? KYRKA.styrkaStor : KYRKA.styrkaMycket);
export const foljer = (p: Person, id: BudId, v?: BudVarde) => foljerStorlek(p, budStorlek(BDEF[id], v));
// budets storlek: radens, eller den som hör till värdet (steg 10.3.15)
export const budStorlek = (b: BudDef, v?: BudVarde) => b.storlekAv && v !== undefined ? b.storlekAv(v) : b.storlek;
// budet som förbjuder handlingen, om det finns något för p (steg 8.6.6): valet av aktivitet frågar. Svält och kyla går före, men kostar (budBrutet)
export function budForbjuder(s: State, p: Person, act: Act): BudId | undefined {
  const tr = troOf(s, p.tro);
  for (const { id } of tr?.bud ?? []) if (BDEF[id].acts?.includes(act) && foljer(p, id) && (!BDEF[id].dag || heligDag(s, tr!))) return id;
  for (const id of Object.keys(BUD) as BudId[]) if (BDEF[id].acts?.includes(act) && lagGaller(s, budLag(id)) && (!BDEF[id].dag || (s.tron ?? []).some(t => budIn(t, id) && heligDag(s, t)))) return id; // lagen gäller alla (steg 8.6.12)
  return undefined;
}
// den heliga dagen (steg 10.3.16): ett dygn av sju (ett år i spelet av sju), och dygnet då en högtid hålls. Alla bud om heliga dagar frågar den
export const heligDag = (s: State, tr: Tro) => { const d = dagNr(s.now); return d % KYRKA.vecka === tr.id % KYRKA.vecka || tr.hogtidDag === d; };
// håller budet id p från något just nu (steg 10.3.22): p följer det, och ett bud om heliga dagar bara på den heliga dagen
export const budHindrar = (s: State, p: Person, id: BudId) => { const tr = troOf(s, p.tro); return !!tr && budIn(tr, id) && foljer(p, id) && (!BDEF[id].dag || heligDag(s, tr)); };
export const vilodagNu = (s: State, p: Person) => { const tr = troOf(s, p.tro); return budIn(tr, 'vilodag') && foljer(p, 'vilodag') && heligDag(s, tr); };
// ---------- maten som bud (steg 10.3.16) ----------
// huvudingrediensen i saken: rätten minns den, och råvaran är den
export const huvudAv = (k: string): string | undefined => rattInfo(k)?.huvud ?? INGREDIENSER[k]?.huvud;
export const huvudNamn = (v: unknown) => RATT_HUVUD[String(v) as RattHuvud]?.namn ?? String(v);
// ingredienserna trons gudar ger, som tron inte redan har ett bud av den raden om
const matVarden = (tr: Tro, id: BudId) => [...new Set(gudarOf(tr).flatMap(g => g.omr.flatMap(o => GUDAR[o].mat as string[])))].filter(h => !tr.bud?.some((b: AntagetBud) => b.id === id && b.v === h));
// matbudet p följer som förbjuder saken k just nu
export function matBud(s: State, p: Person, k: string): AntagetBud | undefined {
  const tr = troOf(s, p.tro), h = tr?.bud?.length ? huvudAv(k) : undefined;
  if (!tr || !h) return undefined;
  for (const b of tr.bud!) { const d = BDEF[b.id]; if (d.mat?.(b.v).includes(h) && (!d.dag || heligDag(s, tr)) && foljer(p, b.id, b.v)) return b; }
  return undefined;
}
// högtidens mat (steg 10.3.16): med kravet först det lagade av budets ingrediens, sedan det råa, sedan resten
export function hogtidMat(tr: Tro): string[] {
  const krav = (tr.bud ?? []).filter(b => b.id === 'matKrav').map(b => String(b.v));
  if (!krav.length) return [...FOOD];
  const rang = (k: string) => krav.includes(huvudAv(k) ?? '') ? (rattInfo(k) || /^(grill|torr|rok|salt)/.test(k) ? 0 : 1) : 2;
  return [...FOOD].sort((a, b) => rang(a) - rang(b));
}
export const hogtidKrav = (tr: Tro, k: string) => (tr.bud ?? []).some(b => b.id === 'matKrav' && b.v === huvudAv(k));
// ett brutet bud: skuld, sämre humör och svagare tro; en sträng och mäktig kyrka stöter ut den som syndat mycket (steg 8.6.9)
export function budBrutet(s: State, p: Person, id: BudId) {
  const tr = troOf(s, p.tro);
  count(s, 'bud_brutet');
  if (lagGaller(s, budLag(id))) handelseBud(s, p, id);
  if (!budIn(tr, id)) return;
  p.skuld = (p.skuld ?? 0) + KYRKA.skuld; p.troStyrka = Math.max(0, (p.troStyrka ?? 0) - KYRKA.skuldTro);
  think(p, `Bröt mot budet: ${BDEF[id].namn.toLowerCase()}`, KYRKA.skuldHumor, s.now, 12 * HOUR);
  if ((skalaV(tr, 'forlat') ?? 0) > 70 && rymsBud(s, tr, 4) && (p.skuld ?? 0) >= KYRKA.stotaUt) {
    p.tro = undefined; p.skuld = 0; count(s, 'utstott');
    log(s, `${troNamn(tr)} stötte ut ${p.name}.`, 'rel', [p.id]);
  }
}
let handelseBud: (s: State, p: Person, id: BudId) => void = () => {};
export const satBudHandelse = (f: typeof handelseBud) => { handelseBud = f; };
// bikten (steg 8.6.9): på Förlåtande-sidan, hos prästen
export const viltBikta = (s: State, p: Person) => { const tr = troOf(s, p.tro); return !!tr && (p.skuld ?? 0) > 0 && !!prastOf(s, tr) && (skalaV(tr, 'forlat') ?? 100) < 50; };

// ---------- kyrkans egendom (steg 8.6.2–8.6.4) ----------
// kyrkans förråd är saker i byns lager som tron äger (steg 10.3.17): gåvorna byter ägare, och det som kommer ur byns
// förråd (skatten, den första fångsten) blir kyrkans
const gavaIn = (s: State, tr: Tro, k: string, n: number, fran?: Person) => { if (fran) ownMove(s, k, n, fran.id, kyrkaId(tr.id)); else { const m = Math.min(n, takeLimit(s, k)); if (m >= 1) { use(s, undefined, k, Math.floor(m), true); put(s, k, Math.floor(m), { [kyrkaId(tr.id)]: Math.floor(m) }); } } };
export const kyrkansForrad = (s: State, tr: Tro) => ownedStock(s, kyrkaId(tr.id));
export const kyrkansAv = (s: State, tr: Tro, k: string) => Math.floor(ownsId(s, kyrkaId(tr.id), k) + 1e-9);
// den mat kyrkan har mest av, om den har minst n (steg 12.1.61, som gravölet)
const kyrkansMat = (s: State, tr: Tro, n: number) => { let b: string | undefined, bn = 0; for (const k of FOOD) { const a = kyrkansAv(s, tr, k); if (a > bn) { bn = a; b = k; } } return bn >= n ? b : undefined; };
export const forradSum = (s: State, tr: Tro) => Object.values(kyrkansForrad(s, tr)).reduce((a, b) => a + Math.floor(b + 1e-9), 0);
// kyrkans egna utgifter: n av slaget k ur kyrkans del, och bara ur den
export const kyrkanTar = (s: State, tr: Tro, k: string, n: number) => kyrkansAv(s, tr, k) >= n ? (use(s, undefined, k, n, true, kyrkaId(tr.id)), true) : false;
function offerTimme(s: State, tr: Tro, folk: Person[]) {
  let saknar: Record<string, number> | undefined;
  for (const p of folk) {
    if (andlighet(s, p) < KYRKA.offerAnde || rnd(s, 'tro', p) >= KYRKA.offerChans) continue;
    const k = [...Object.keys(saknar ??= troshusSaknar(s, tr)), 'ved', 'grenar', 'sten', 'bar', 'rep'].find(q => ownsAmount(s, p, q) >= 1); // helst det trons hus saknar (steg 10.3.19)
    if (!k) continue;
    gavaIn(s, tr, k, 1, p); count(s, 'kyrka_gava');
    think(p, 'Gav en gåva till tron', 0.02, s.now, 6 * HOUR);
  }
}
// kyrkskatten (steg 8.6.3): en lag när styret står åt Andlig, och styret kan förbjuda den när det står åt Världslig
function skattDygn(s: State) {
  if (!lagGaller(s, 'kyrkskatt') || lagGaller(s, 'ejKyrkskatt')) return;
  for (const tr of s.tron ?? []) {
    if (tr.slut !== undefined || !rymsBud(s, tr, 4)) continue;
    const n = Math.ceil(troende(s, tr).length / 5) * KYRKA.skatt, k = woodDays(s) - n / (hearthOf(s.fire).burn * 24) >= TROSKEL.forsokVed ? 'ved' : undefined; // bara ur ett överskott av ved, efter hur länge den räcker (steg 10.2.43)
    if (k) { const l = ledareOf(s) ?? living(s)[0]; if (l) { gavaIn(s, tr, k, n); count(s, 'kyrkskatt'); } }
  }
}
// vad förrådet går till (steg 8.6.4 och 10.7.18): kyrkans utgifter är rader i ett register. Varje rad har sitt villkor och sin
// vikt ur trons skalor, och den som talar för tron lägger fram den som väger tyngst
export interface KyrkUtgift { namn: string; vikt: (s: State, tr: Tro) => number; gor: (s: State, tr: Tro) => void }
export const KYRKUTGIFTER: Record<string, KyrkUtgift> = {
  // försörja prästen (Präster)
  prast: { namn: 'försörja prästen', vikt: (s, tr) => { const v = skalaV(tr, 'prast') ?? 50; return v > 60 && prastOf(s, tr) && kyrkansMat(s, tr, 1) ? (v - 50) / 50 : 0; },
    gor: (s, tr) => { const pr = prastOf(s, tr), m = kyrkansMat(s, tr, 1); if (pr && m && kyrkanTar(s, tr, m, 1)) { ata(pr, { [m]: KROPP.mattar }); count(s, 'atit', 1); think(pr, 'Fick mat av tron', 0.03, s.now, 6 * HOUR); } } }, // prästen äter den (steg 12.1.61)
  // gåvor till de fattiga (Öppen)
  fattig: { namn: 'ge åt de fattiga', vikt: (s, tr) => { const v = skalaV(tr, 'oppen') ?? 50; return v < 40 && kyrkansMat(s, tr, 2) ? (50 - v) / 50 : 0; },
    gor: (s, tr) => { const q = living(s).filter(p => p.hunger < 0.6).sort((a, b) => a.hunger - b.hunger)[0], m = kyrkansMat(s, tr, 1); if (q && m && kyrkanTar(s, tr, m, 1)) { ata(q, { [m]: KROPP.mattar }); count(s, 'atit', 1); think(q, 'Fick mat av tron', 0.05, s.now, 6 * HOUR); } } }, // en portion som äts (steg 10.11.10)
  // ett framträdande som sprider tron eller minnet av en död troende (Sprider sig, steg 10.7.18): kyrkan lägger undan
  // KYRKA.framPris hela saker av det den har mest av, och den troende som nästa gång uppträder med ett budskap får dem (kyrkFram)
  fram: { namn: 'betala ett framträdande', vikt: (s, tr) => { const v = skalaV(tr, 'sprid'); return v !== undefined && v < 40 && !tr.framPris && framSak(s, tr) ? (50 - v) / 50 : 0; },
    gor: (s, tr) => { const k = framSak(s, tr); if (k) { tr.framPris = k; count(s, 'kyrkFramBeslut'); } } },
};
// det kyrkan har mest av, när den har minst KYRKA.framPris hela
function framSak(s: State, tr: Tro) {
  let bast: string | undefined, n = KYRKA.framPris - 1;
  for (const k of Object.keys(kyrkansForrad(s, tr))) { const m = kyrkansAv(s, tr, k); if (m > n) { n = m; bast = k; } }
  return bast;
}
export function utgiftNu(s: State, tr: Tro): string | undefined {
  let bast: string | undefined, bv = 0;
  for (const [id, u] of Object.entries(KYRKUTGIFTER)) { const v = u.vikt(s, tr); if (v > bv) { bv = v; bast = id; } }
  return bast;
}
// den troende p uppträder med ett budskap (steg 10.7.18): har tron lagt undan saker för ett framträdande får p dem som sin
// egendom. Det som betalas är hela saker; finns de inte kvar betalas inget och beslutet glöms
export function kyrkFram(s: State, p: Person): { tro: Tro; k: string; n: number } | undefined {
  const tr = troOf(s, p.tro), k = tr?.framPris;
  if (!tr || !k) return undefined;
  delete tr.framPris;
  if (kyrkansAv(s, tr, k) < KYRKA.framPris) { count(s, 'kyrkFramMiste'); return undefined; }
  ownMove(s, k, KYRKA.framPris, kyrkaId(tr.id), p.id);
  count(s, 'kyrkFram');
  return { tro: tr, k, n: KYRKA.framPris };
}
// bud som fråga i trons krets (steg 8.6.7)
const sidan = (tr: Tro, sk: NonNullable<BudDef['skala']>, sida: 0 | 1 | undefined) => { const v = skalaV(tr, sk); return v !== undefined && (sida === 0 ? v < 50 : v >= 50); };
const passar = (tr: Tro, b: BudDef) => (!b.skala || sidan(tr, b.skala, b.sida)) && (!b.och || sidan(tr, b.och[0], b.och[1]));
// ---------- trons krets tar upp sina egna frågor (steg 10.3.2) ----------
// den som talar för tron: prästen, annars en profet, annars den främsta bland de vuxna troende (den som själv skulle bli präst)
export function trosTalare(s: State, tr: Tro): Person | undefined {
  return prastOf(s, tr) ?? living(s).find(p => p.tro === tr.id && p.profet) ?? troende(s, tr).filter(p => ageOf(p, s.now) >= ALDER.vuxen).sort((a, b) => prastRang(s, b) - prastRang(s, a))[0];
}
// vad som kan läggas fram i trons krets, som lagarnas TAS_UPP: den som talar föreslår det hen själv helst röstar för (prio = hens egen röst)
const forslag = (s: State, p: Person, f: string, d: FragaData): LagForslag => { const r = FRAGOR[f].rost(s, p, d); return { fr: { f, d, fram: p.id }, prio: r.v, varfor: `${p.name} vill det: ${r.why.toLowerCase()}` }; };
export const TROS_UPP: { id: string; lista(s: State, tr: Tro, p: Person): LagForslag[] }[] = [
  { id: 'kyrkutgift', lista: (s, tr, p) => { const vad = utgiftNu(s, tr); return vad ? [forslag(s, p, 'kyrkutgift', { tro: tr.id, vad })] : []; } },
  { id: 'nyttBud', lista: (s, tr, p) => (Object.keys(BUD) as BudId[]).filter(id => (BDEF[id].storlekAv || rymsBud(s, tr, BDEF[id].storlek)) && passar(tr, BDEF[id]) && (!BDEF[id].finns || BDEF[id].finns!(s)) && (!BDEF[id].kraver || budIn(tr, BDEF[id].kraver as BudId)))
    .flatMap(id => budForslag(s, tr, id)).filter(b => rymsBud(s, tr, budStorlek(BDEF[b.id], b.v))).map(b => {
      const g = ersatter(s, tr, b); // ett byte: det nya mot det gamla (steg 10.3.13)
      const f = g ? forslag(s, p, 'bytBud', { tro: tr.id, id: b.id, v: b.v, gid: g.id, gv: g.v }) : forslag(s, p, 'nyttBud', { tro: tr.id, id: b.id, v: b.v });
      return f.prio > 0 && BDEF[b.id].nu?.(s, tr) ? { ...f, prio: f.prio + KYRKA.nu } : f; // budet vars tillfälle är nu lyfts fram
    }) },
  // planen för trons hus, del för del (steg 10.3.18)
  { id: 'troshus', lista: (s, tr, p) => troshusForslag(s, tr).map(d => forslag(s, p, 'troshus', d)) },
  // ett bud tas bort när den som talar själv är emot det, tidigast KYRKA.nedrostat dygn efter att det antogs (steg 10.3.13)
  { id: 'taBortBud', lista: (s, tr, p) => (tr.bud ?? []).filter(b => b.t + KYRKA.nedrostat * DAY <= s.now).map(b => forslag(s, p, 'taBortBud', { tro: tr.id, id: b.id, v: b.v })) },
];
const trosNyckel = (fr: Fraga) => fr.f + ':' + JSON.stringify(fr.d);
// klockan 20: varje tro har sin chans att den som talar för den lägger fram något. Hen lägger bara fram det hen själv röstar ja till,
// och ett nedröstat förslag vilar i KYRKA.nedrostat dygn
export function kyrkaKvall(s: State) {
  for (const tr of s.tron ?? []) {
    if (tr.slut !== undefined) continue;
    const pr = trosTalare(s, tr);
    if (!pr || rnd(s, 'tro', pr) >= KYRKA.fram) continue;
    const ned = (tr.nedrostat ??= {});
    let bast: LagForslag | undefined;
    for (const r of TROS_UPP) for (const f of r.lista(s, tr, pr)) if (f.prio > 0 && (ned[trosNyckel(f.fr)] ?? 0) <= s.now && (!bast || f.prio > bast.prio)) bast = f;
    if (!bast) continue;
    const gick = rostaOm(s, bast.fr);
    if (!gick) ned[trosNyckel(bast.fr)] = s.now + KYRKA.nedrostat * DAY;
    for (const k of Object.keys(ned)) if (ned[k] <= s.now) delete ned[k];
    const o = tr.roster?.[tr.roster.length - 1];
    if (o) o.varfor = bast.varfor;
  }
}
// ---------- helgonen (steg 8.6.5) ----------
export function helgonDygn(s: State) {
  for (const tr of s.tron ?? []) {
    if (tr.slut !== undefined) continue;
    // den döda som byn fortfarande berättar om (steg 10.7.4): ryktbar bland de levande med gott anseende, den ryktbaraste först.
    // Framträdanden, kväden, bilder och stenar om hen håller ryktbarheten uppe (glomRykten i rykten.ts)
    let kand: Person | undefined, bast = KYRKA.helgonRykte;
    for (const p of s.people) {
      if (p.died === undefined || s.now - p.died < KYRKA.helgonDygn * DAY || p.tro !== tr.id || tr.helgon?.some(h => h.id === p.id)) continue;
      if (living(s).some(q => s.rels[relKey(p.id, q.id)])) continue;
      const { r, a } = ryktbarhet(s, p.id);
      if (r >= bast && a > 0) { bast = r; kand = p; }
    }
    if (!kand) continue;
    const om = samlatIntryck(s, kand.id).slice(0, 3).map(([k]) => `${kand!.name} var ${INTRYCK[k].namn}`);
    const fame = kand.fame.length ? kand.fame : om;
    (tr.helgon ??= []).push({ id: kand.id, namn: kand.name, t: s.now, krönika: fame.slice(0, 3).join('. ') + '.', myt: `${fame[0] ?? kand.name}. Så berättar de, och varje gång blir det större.` });
    count(s, 'helgon'); const gh = s.gravar?.find(g => g.vem === kand!.id); if (gh) gh.stor = true; // helgonet är stort och får de storas vård (steg 10.4.2)
    const t = `${kand.name} har blivit ett helgon i ${troNamn(tr).toLowerCase()}.`;
    log(s, t, 'rel', []); kronika(s, t, 'tro');
  }
}
// ---------- kvädena (steg 8.6.13) ----------
function kvadeDygn(s: State) {
  for (const tr of s.tron ?? []) {
    const pr = tr.slut === undefined ? prastOf(s, tr) : undefined;
    if (!pr || (tr.kvade?.t ?? -Infinity) + KYRKA.kvadeDygn * DAY > s.now) continue;
    const g = gudarOf(tr)[0], rad = [`${tr.bakom} vill ${tr.vill}.`, g ? `${g.namn} vakar.` : '', tr.ber ?? ''].filter(Boolean).join(' ');
    const lar = troende(s, tr).filter(p => p !== pr && ageOf(p, s.now) >= ALDER.vuxen).sort((a, b) => stat(b, 'minne', s.now) - stat(a, 'minne', s.now))[0];
    tr.kvade = { t: s.now, text: rad, av: pr.id, larjunge: lar?.id };
    count(s, 'kvade');
    if (lar) { lar.troStyrka = Math.min(100, (lar.troStyrka ?? 0) + 3); upplev(s, lar, 'tecken', 'de heliga kvädena'); }
  }
}
// ---------- överstepräst, välsignelse och fördömelse (steg 8.6.16) ----------
export const overstePrast = (s: State) => { const tr = (s.tron ?? []).filter(t => t.slut === undefined && prastOf(s, t)).sort((a, b) => troende(s, b).length - troende(s, a).length)[0]; return tr && prastOf(s, tr); };
// varje dygn: översteprästen välsignar eller fördömer ledaren efter vad hen tycker. Det väger efter var seden Världslig – Andlig står
function valsignaDygn(s: State) {
  const o = overstePrast(s), l = ledareOf(s), st = s.styre;
  if (!st || !l || !o || o === l) { if (st) st.kyrka = undefined; return; }
  const op = s.rels[relKey(o.id, l.id)]?.op ?? 0, andlig = Math.max(0, s.seder.v.andlig ?? 0), ny = op > 20 ? 1 : op < -20 ? -1 : 0;
  if (ny !== (st.kyrka ?? 0) && andlig > 0.2) log(s, ny > 0 ? `${o.name} välsignade ${l.name}.` : ny < 0 ? `${o.name} fördömde ${l.name}.` : `${o.name} teg om ${l.name}.`, 'rel', [o.id, l.id]);
  st.kyrka = ny; st.kyrkaVikt = andlig * KYRKA.valsigna;
}
// ---------- budens verkan (steg 8.6.6–8.6.10) ----------
// förbuden mot handlingar frågar valet av aktivitet (budForbjuder). Resten verkar här: kraven vid sin tid och offren vid sitt
// tillfälle varje dygn (budDygn), och de bud som rör andra system när det händer (budTillfalle, via folk.ts). Bara den som
// följer budet (foljer) påverkas; kyla och svält går före, som i fastan (behov.ts)
export const harBud = (s: State, p: Person | undefined, id: BudId) => { const tr = p && troOf(s, p.tro); return budIn(tr, id) && foljer(p!, id); };
let doda: (s: State, p: Person) => void = () => {};
export const satOffrad = (f: typeof doda) => { doda = f; };
function budDygn(s: State) {
  const dag = dagNr(s.now), fodda = (s.stat?.fodda ?? 0) + (s.stat?.doda ?? 0);
  for (const tr of s.tron ?? []) {
    if (tr.slut !== undefined || !tr.bud?.length) continue;
    const vuxna = troende(s, tr).filter(p => ageOf(p, s.now) >= ALDER.vuxen), med = (id: BudId) => budIn(tr, id) ? vuxna.filter(p => foljer(p, id)) : [];
    const krav = (id: BudId, text: string) => { for (const p of med(id)) { p.troStyrka = Math.min(100, (p.troStyrka ?? 0) + KYRKA.kravTro); think(p, text, KYRKA.kravHumor, s.now, 12 * HOUR); } };
    // kraven: att tacka före maten och hälsa elden på morgonen, och att be när någon fötts eller dött
    krav('tacka', 'Tackade gudarna för maten'); krav('halsa', 'Hälsade elden i morse');
    if (fodda !== (tr.fodda ?? fodda)) krav('fodsel', 'Bad för den som fötts eller dött');
    tr.fodda = fodda;
    // fastan: en dag av sju äter den troende inte (p.fasta, behov.ts)
    if ((dag + tr.id) % KYRKA.vecka === 3) for (const p of med('fasta')) p.fasta = s.now + DAY;
    // den första fångsten går till tron: en hel sak mat ur byns förråd per forstaPer som följer budet
    const ff = med('forstaFangst').length;
    if (ff) { const n = Math.ceil(ff / KYRKA.forstaPer), k = FOOD.filter(q => amountOf(s, q) >= n).sort((a, b) => amountOf(s, b) - amountOf(s, a))[0]; if (k) { gavaIn(s, tr, k, n); count(s, 'forstaFangst'); } }
    // tionde till prästen: en tiondel av den egna maten, i hela saker
    const pr = prastOf(s, tr);
    if (pr) for (const p of med('tionde')) {
      if (p === pr) continue;
      const egen = ownedStock(s, p);
      if (FOOD.reduce((a, k) => a + (egen[k] ?? 0), 0) < KYRKA.tiondeMin) continue;
      let gav = 0;
      for (const k of FOOD) { const m = Math.floor((egen[k] ?? 0) * KYRKA.tionde); if (m >= 1) gav += ownMove(s, k, m, p.id, pr.id); }
      if (gav >= 1) count(s, 'tionde');
    }
    // djuroffret en gång i veckan, och människooffret: bara den som dömts, högst en gång på offerDygn
    if ((dag + tr.id) % KYRKA.vecka === 0 && budIn(tr, 'djuroffer')) {
      const slag = KOTTSLAG.reduce((a, k) => takeLimit(s, k) > takeLimit(s, a) ? k : a, 'kott'); // det köttslag byn har mest av (steg 10.3.14)
      if (takeLimit(s, slag) >= KYRKA.djur) { use(s, undefined, slag, KYRKA.djur, true); count(s, 'djuroffer'); for (const p of med('djuroffer')) p.troStyrka = Math.min(100, (p.troStyrka ?? 0) + 2); }
      else for (const p of med('djuroffer')) think(p, 'Tron kräver djur, och det finns inget att offra', KYRKA.djurSakna, s.now, DAY);
    }
    if (budIn(tr, 'manniskooffer') && dag - (tr.offrad ?? -Infinity) >= KYRKA.offerDygn) {
      const q = living(s).find(p => p.straffad && p.tro !== tr.id); // den som straffats hårt på tinget
      if (q) { tr.offrad = dag; count(s, 'manniskooffer'); const t = `${troNamn(tr)} offrade ${q.name}, som dömts för sitt brott.`; log(s, t, 'death', [q.id]); kronika(s, t, 'tro'); doda(s, q); }
    }
  }
}
// de bud som verkar i andra system (folk.ts budTillfalle): true = budet stoppar det
function budTillfalleK(s: State, typ: BudTillfalle, p: Person, q?: Person): boolean {
  if (!s.tron?.length) return false;
  if (typ === 'framling') { // främlingar ska få mat: de som följer budet ger av sin mat ur förrådet (steg 10.2.35), och relationen blir bättre
    let gav: Person | undefined;
    for (const f of living(s)) if (f !== p && harBud(s, f, 'framling')) { const r = s.rels[relKey(f.id, p.id)]; if (r) r.op = Math.min(100, r.op + KYRKA.framlingRel); gav ??= f; }
    if (gav && (MAT.anvand(s, p) > 0 || MAT.anvand(s, p, gav) > 0)) count(s, 'framling_mat'); // ur byns förråd, annars av den som ger
    return false;
  }
  if (typ === 'par') return !!q && ((harBud(s, p, 'giftaTro') || harBud(s, q, 'giftaTro')) && p.tro !== q.tro || [p, q].some(x => harBud(s, x, 'ogifta') && prastOf(s, troOf(s, x.tro)!) === x));
  if (typ === 'skadad') { // hämnd är en plikt: den drabbade glömmer inte
    if (!q || !harBud(s, p, 'hamnd')) return false;
    const r = s.rels[relKey(p.id, q.id)]; if (r) r.op = Math.max(-100, r.op - KYRKA.hamndRel);
    think(p, `Måste hämnas på ${q.name}`, -0.03, s.now, 2 * DAY); count(s, 'hamnd_plikt');
    return false;
  }
  if (typ === 'talaIlla') return harBud(s, p, 'deDoda');
  if (typ === 'falla') return harBud(s, p, 'lunden');
  return false;
}
// ---------- de heliga tingen (steg 10.3.20) ----------
// det ting som föreslås: ett mästerverk som är byns eller en troendes (och då bara när ägaren själv skulle rösta ja). Det som profeten,
// prästen, grundaren eller ett helgon gjort eller äger först, sedan det med högst kvalitet. Altaret måste stå och rymmer TROSHUS.altarTing
export function heligtTingKandidat(s: State, tr: Tro): Ting | undefined {
  if (!altaret(s, tr) || tingOf(s).filter(t => t.helig === tr.id).length >= TROSHUS.altarTing) return undefined;
  const viktiga = new Set<number>([tr.grundare, ...(tr.prast !== undefined ? [tr.prast] : []), ...(tr.profeter ?? []), ...(tr.helgon ?? []).map(h => h.id)]);
  const vikt = (t: Ting) => viktiga.has(t.agare) || (t.av !== undefined && viktiga.has(t.av)) ? 1 : 0;
  const lista = tingOf(s).filter(t => (t.q ?? 0) >= MASTERVERK && t.helig === undefined && !t.halv && t.pa === undefined && (t.agare === BYN || byId(s, t.agare)?.tro === tr.id));
  lista.sort((a, b) => vikt(b) - vikt(a) || (b.q ?? 0) - (a.q ?? 0) || a.id - b.id);
  return lista.find(t => { if (t.agare === BYN) return true; const o = byId(s, t.agare); return !!o && budRost(s, o, tr, 'heligtTing', t.id).v > 0; });
}
export const heligtTingNamn = (t: Ting) => `${sakNamn(t.k)}${t.ber?.namn ? ` som kallas ${t.ber.namn}` : ''} (${kvNamn(t).toLowerCase()})`;
// budet antas: tinget blir byns och ställs på altaret
function helgaTing(s: State, tr: Tro, id: number) {
  const t = tingOf(s).find(q => q.id === id), alt = altaret(s, tr);
  if (!t || !alt) return;
  Object.assign(t, { helig: tr.id, agare: BYN, vid: alt.id, x: alt.x, y: alt.y, hos: undefined, bar: undefined, krok: undefined, lass: undefined });
  count(s, 'heligtTing');
  const tx = `${heligtTingNamn(t)} blev heligt i ${troNamn(tr).toLowerCase()} och ställdes på altaret.`;
  log(s, tx, 'rel'); kronika(s, tx, 'tro');
}
// finns tinget inte kvar i byn (taget i ett heligt krig, brunnet) faller budet, och de troende tappar tro och humör som när en helig plats vanhelgas
function heligaTingKvar(s: State, tr: Tro) {
  for (const b of (tr.bud ?? []).filter(q => q.id === 'heligtTing')) {
    if (tingOf(s).some(t => t.id === Number(b.v) && t.helig === tr.id)) continue;
    tr.bud = tr.bud!.filter(q => q !== b);
    count(s, 'heligtTingBort');
    const tx = `Det heliga tinget i ${troNamn(tr).toLowerCase()} finns inte längre, och budet föll.`;
    log(s, tx, 'rel'); kronika(s, tx, 'tro');
    for (const p of troende(s, tr)) { p.troStyrka = Math.max(0, (p.troStyrka ?? 0) - KYRKA.tingTro); think(p, 'Vårt heliga ting är borta', KYRKA.tingHumor, s.now, KYRKA.tingDygn * DAY); }
  }
}
// ---------- varje timme ----------
export function kyrkaTimme(s: State) {
  for (const tr of s.tron ?? []) if (tr.bud?.length) heligaTingKvar(s, tr);
  for (const tr of s.tron ?? []) { if (tr.slut !== undefined) continue; const folk = troende(s, tr); if (folk.length) offerTimme(s, tr, folk); }
  if (Math.floor(s.now / HOUR) % 24 === 12) { skattDygn(s); helgonDygn(s); kvadeDygn(s); valsignaDygn(s); budDygn(s); }
  const f = s.tron?.length ? living(s).filter(p => p.tro !== undefined).length : 0;
  if (f >= 3 && s.styre) oppnaAndlig(s);
}
let oppnaAndlig: (s: State) => void = () => {};
export const satOppnaAndlig = (f: typeof oppnaAndlig) => { oppnaAndlig = f; };
// ---------- rösten om ett bud (registret, steg 10.3.9) ----------
// rösten är summan av raderna, över noll är ja. ja och nej: skälet när raden drar åt det hållet. Vad hen tycker om den som
// föreslår räknas för alla frågor (rostaOm) och läggs inte till här
interface BudRostRad { ja: string; nej: string; v: (s: State, p: Person, tr: Tro, b: BudDef, bv?: BudVarde) => number; why?: (s: State, p: Person, tr: Tro, b: BudDef, bv?: BudVarde) => string }
export const BUDROST: Record<string, BudRostRad> = {
  tro: { ja: 'Tror att budet är rätt', nej: 'Tycker att budet är för hårt', v: (_s, p, _tr, b, bv) => (p.troStyrka ?? 0) / 100 - budStorlek(b, bv) * BUDROSTTAL.hard },
  egen: { ja: '', nej: 'Gör själv det budet förbjuder', v: (_s, p, _tr, b) => b.sort === 'forbud' && b.acts ? -BUDROSTTAL.egen * habitShare(p, b.acts) : 0 },
  intresse: { ja: '', nej: '', v: (s, p, tr, b, bv) => b.intresse ? BUDROSTTAL.intresse * b.intresse(s, p, tr, bv).v : 0, why: (s, p, tr, b, bv) => b.intresse!(s, p, tr, bv).why },
  sed: { ja: 'Budet passar hens sed', nej: 'Budet går emot hens sed', v: (s, p, _tr, b) => b.sed ? b.sed[1] * (BUDROSTTAL.drag * drar(s, p)[b.sed[0]] + BUDROSTTAL.sed * (s.seder.v[b.sed[0]] ?? 0)) : 0 },
  ande: { ja: 'Är andlig', nej: 'Är världslig', v: (s, p) => BUDROSTTAL.ande * (andlighet(s, p) - 50) / 50 },
  skala: { ja: 'Budet passar tron', nej: 'Budet passar inte tron', v: (_s, _p, tr, b) => { const v = b.skala ? skalaV(tr, b.skala) : undefined; return v === undefined ? 0 : BUDROSTTAL.skala * (b.sida ? v - 50 : 50 - v) / 50; } },
  humor: { ja: 'Mår bra', nej: 'Mår dåligt och vill inte ha fler bördor', v: (s, p, _tr, b, bv) => BUDROSTTAL.humor * budStorlek(b, bv) * (moodOf(p, s.now) - HUMOR.bas) },
};
// rösten om budet id: summan, delarna och skälet (den del som vägde tyngst åt det håll hen röstade)
export function budRost(s: State, p: Person, tr: Tro, id: BudId, bv?: BudVarde) {
  const b = BDEF[id], delar = Object.entries(BUDROST).map(([k, r]) => ({ k, v: r.v(s, p, tr, b, bv) }));
  const v = delar.reduce((a, d) => a + d.v, 0), ja = v > 0;
  const top = delar.filter(d => ja ? d.v > 0 : d.v < 0).sort((a, b2) => Math.abs(b2.v) - Math.abs(a.v))[0];
  const rad = top ? BUDROST[top.k] : undefined;
  const why = !rad || !top ? (ja ? BUDROST.tro.ja : BUDROST.tro.nej) : rad.why ? rad.why(s, p, tr, b, bv) : ja ? rad.ja : rad.nej;
  return { v, why, delar };
}
// raderna i LAGAR och FRAGOR som hör till kyrkan läggs till när allt är laddat (steg.ts)
export function kyrkaRegister() {
troshusRegister();
satHeligtDjur(foljerStorlek, (s, p) => budBrutet(s, p, 'heligtDjur'));
// budet först: farorna kostar, och för de flesta saker finns inget bud
satMatBud((s, p, k) => !!matBud(s, p, k) && !farorNu(s).svalt, (s, p, k) => { const b = matBud(s, p, k); if (b) budBrutet(s, p, b.id); });
satBudTillfalle((s, typ, p, q) => budTillfalleK(s, typ, p, q));
for (const id of Object.keys(BUD) as BudId[]) if (BDEF[id].sort === 'forbud' && BDEF[id].acts) LAGAR[budLag(id)] = { namn: BDEF[id].namn, sym: '📜', text: BDEF[id].text, straff: 4, brott: ['budbrott'], kan: s => (s.seder.v.andlig ?? 0) > 0.2 && !!s.tron?.some(t => budIn(t, id)), prio: s => (s.seder.v.andlig ?? 0) > 0.2 && s.tron?.some(t => budIn(t, id)) ? clamp((s.seder.v.andlig ?? 0), 0, 1) * 0.6 : 0, rost: (s, p) => { if (!s.tron?.some(t => budIn(t, id))) return { v: -1, why: 'Ingen tro har budet längre' }; const ja = budIn(troOf(s, p.tro), id); return { v: ja ? 0.6 : -0.4, why: ja ? 'Tror på budet' : 'Delar inte tron' }; }, om: 'kyrkans önskan' };
LAGAR.kyrkskatt = { namn: 'Kyrkskatt', sym: '📜', text: 'En del av byns förråd går till kyrkan', straff: 4, om: 'kyrkans krav', kan: s => !!s.tron?.some(t => t.slut === undefined && rymsBud(s, t, 4)), prio: s => (s.seder.v.andlig ?? 0) > 0.4 ? clamp(s.seder.v.andlig, 0, 1) * 0.7 : 0, rost: (_s, p) => ({ v: p.tro !== undefined ? 0.4 : -0.5, why: p.tro !== undefined ? 'Vill stödja tron' : 'Betalar inte för en tro hen inte har' }) };
LAGAR.ejKyrkskatt = { namn: 'Förbud mot kyrkskatt', sym: '📜', text: 'Kyrkan tar inget ur byns förråd', straff: 0, om: 'kyrkans makt', kan: s => !!s.tron?.length, prio: s => (s.seder.v.andlig ?? 0) < -0.4 ? clamp(-s.seder.v.andlig, 0, 1) * 0.6 : 0, rost: (_s, p) => ({ v: p.tro === undefined ? 0.5 : -0.4, why: p.tro === undefined ? 'Delar inte tron' : 'Vill stödja tron' }) };
FRAGOR.kyrkutgift = {
  namn: (s, d) => `${troNamn(troOf(s, d.tro as number)!)}: ${KYRKUTGIFTER[d.vad as string]?.namn ?? d.vad}`, krets: 'tro',
  rost: (s, p) => ({ v: 0.1 + (andlighet(s, p) - 50) / 100, why: 'Tycker att det är rätt för tron' }),
  gor: (s, d) => { const tr = troOf(s, d.tro as number); if (tr) KYRKUTGIFTER[d.vad as string]?.gor(s, tr); },
};
FRAGOR.taBortBud = {
  namn: (s, d) => `${troNamn(troOf(s, d.tro as number)!)}: ta bort ${budNamn(s, { id: d.id as BudId, v: d.v }).toLowerCase()}`, krets: 'tro',
  rost: (s, p, d) => { const tr = troOf(s, d.tro as number); if (!tr) return { v: 0, why: '' }; const r = budRost(s, p, tr, d.id as BudId, d.v as BudVarde | undefined); return { v: -r.v > 0 && tr.skrift ? -r.v * SKRIFT.heligTrog : -r.v, why: r.why }; }, // en helig skrift gör budet svårare att rösta bort (steg 10.6.3)
  gor: (s, d) => { const tr = troOf(s, d.tro as number)!, b = { id: d.id as BudId, v: d.v as BudVarde | undefined }; taBortBud(s, tr, b); count(s, 'bud_bort'); const t = `${troNamn(tr)} tog bort budet ${budNamn(s, b).toLowerCase()}.`; log(s, t, 'rel', []); kronika(s, t, 'tro'); },
};
FRAGOR.bytBud = {
  namn: (s, d) => `${troNamn(troOf(s, d.tro as number)!)}: ${budNamn(s, { id: d.id as BudId, v: d.v })} i stället för ${budNamn(s, { id: d.gid as BudId, v: d.gv }).toLowerCase()}`, krets: 'tro',
  rost: (s, p, d) => {
    const tr = troOf(s, d.tro as number); if (!tr) return { v: 0, why: '' };
    const ny = budRost(s, p, tr, d.id as BudId, d.v as BudVarde | undefined), gl = budRost(s, p, tr, d.gid as BudId, d.gv as BudVarde | undefined), v = ny.v - gl.v;
    return { v, why: v > 0 ? ny.why : gl.why };
  },
  gor: (s, d) => {
    const tr = troOf(s, d.tro as number)!; taBortBud(s, tr, { id: d.gid as BudId, v: d.gv as BudVarde | undefined });
    const b: AntagetBud = { id: d.id as BudId, ...(d.v !== undefined ? { v: d.v } : {}), t: s.now }; (tr.bud ??= []).push(b); BDEF[b.id].antas?.(s, tr, b); count(s, 'bud_byte');
    const t = `${troNamn(tr)} bytte ${budNamn(s, { id: d.gid as BudId, v: d.gv }).toLowerCase()} mot ${budNamn(s, b).toLowerCase()}.`; log(s, t, 'rel', []); kronika(s, t, 'tro');
  },
};
FRAGOR.nyttBud = {
  namn: (s, d) => `${troNamn(troOf(s, d.tro as number)!)}: ${budNamn(s, { id: d.id as BudId, v: d.v })}`, krets: 'tro',
  rost: (s, p, d) => { const tr = troOf(s, d.tro as number); if (!tr) return { v: 0, why: '' }; const r = budRost(s, p, tr, d.id as BudId, d.v as BudVarde | undefined); return { v: r.v, why: r.why }; },
  gor: (s, d) => { const tr = troOf(s, d.tro as number)!, b: AntagetBud = { id: d.id as BudId, ...(d.v !== undefined ? { v: d.v } : {}), t: s.now }; (tr.bud ??= []).push(b); BDEF[b.id].antas?.(s, tr, b); count(s, 'bud_ny'); const t = `${troNamn(tr)} fick ett nytt bud: ${budNamn(s, b).toLowerCase()}.`; log(s, t, 'rel', []); kronika(s, t, 'tro'); },
};
}

// ---------- de nya kraven och offren (steg 10.3.23) ----------
// kyrkans öl: krukor med öl som tron äger. Ingen annan dricker ur dem (vatskor.ts)
export const kyrkansOl = (s: State, tr: Tro) => tingOf(s).filter(t => t.agare === kyrkaId(tr.id) && t.inne?.v === 'ol' && t.inne.n > 0);
export const olAntal = (s: State, tr: Tro) => kyrkansOl(s, tr).reduce((a, t) => a + Math.floor(t.inne!.n + 1e-9), 0);
// tron som får ölet p tappar: p följer budet, och kyrkan har mindre öl än de vuxna troende (brygg.ts)
export function olTillKyrkan(s: State, p: Person): Tro | undefined {
  const tr = troOf(s, p.tro);
  return tr && harBud(s, p, 'olHogtid') && olAntal(s, tr) < vuxnaTroende(s, tr).length ? tr : undefined;
}
// ölet och kvädet när högtiden slutar (kult.ts hogtidSlut)
export function hogtidOlKvade(s: State, tr: Tro, med: Person[]) {
  if (budIn(tr, 'olHogtid')) for (const p of med) {
    if (ageOf(p, s.now) < ALDER.vuxen) continue;
    const t = budHindrar(s, p, 'ingetRus') ? undefined : kyrkansOl(s, tr)[0];
    if (t) { t.inne!.n -= 1; if (t.inne!.n <= 0) t.inne = undefined; drickAlkohol(s, p, 'ol', true); count(s, 'hogtid_ol'); } // den tomma krukan blir kvar
    else if (p.tro === tr.id && foljer(p, 'olHogtid') && !budHindrar(s, p, 'ingetRus')) think(p, 'Ölet saknades vid högtiden', KULT.offerInget, s.now, 12 * HOUR);
  }
  if (!budIn(tr, 'kvade')) return;
  const skald = med.filter(p => (p.skill[FRAM_SKILL] ?? 0) >= KYRKA.skald).sort((a, b) => (b.skill[FRAM_SKILL] ?? 0) - (a.skill[FRAM_SKILL] ?? 0) || a.id - b.id)[0];
  if (!skald) { for (const p of med) if (p.tro === tr.id && foljer(p, 'kvade')) think(p, 'Ingen kvad om tron vid högtiden', KULT.offerInget, s.now, 12 * HOUR); return; }
  const q = framKval(s, skald);
  for (const p of med) if (p !== skald && p.tro === tr.id) { p.troStyrka = Math.min(100, (p.troStyrka ?? 0) + KYRKA.kvadeTro * q); think(p, `Hörde ${gen(skald.name)} kväde om tron`, KYRKA.kvadeHumor * q, s.now, 12 * HOUR); }
  count(s, 'hogtid_kvade');
  log(s, `${skald.name} kvad om ${troNamn(tr)} vid högtiden.`, 'rel', [skald.id]);
}
// skändningen trons skalor väljer när budet antas, och vad den heter (sätts av grav.ts, som har registret ODEN, steg 10.4.13)
let skandVal: (s: State, tr: Tro) => string = () => 'djuren', skandNamn: (v: BudVarde) => string = v => String(v);
export const satSkand = (val: typeof skandVal, namn: typeof skandNamn) => { skandVal = val; skandNamn = namn; };
// sorgkvädet (steg 10.4.12): när begravningens samling slutar och trons bud finns, sprider den bästa troende skalden som minns den döda
// sitt starkaste minne av hen till alla som var där, som ett kväde om en person. Utan skald blir det inget kväde
export function sorgkvade(s: State, tr: Tro, om: number, med: Person[]) {
  if (!budIn(tr, 'sorgkvade')) return;
  const minne = (p: Person) => (p.intryck ?? []).filter(e => e.om === om).sort((a, b) => Math.abs(b.v) * b.c - Math.abs(a.v) * a.c)[0];
  const skald = med.filter(p => p.tro === tr.id && (p.skill[FRAM_SKILL] ?? 0) >= KYRKA.skald && minne(p)).sort((a, b) => (b.skill[FRAM_SKILL] ?? 0) - (a.skill[FRAM_SKILL] ?? 0) || a.id - b.id)[0];
  if (!skald) return;
  const e = minne(skald)!, q = framKval(s, skald), d = byId(s, om);
  for (const p of med) if (p !== skald) { beratta(s, skald, p, e, getRel(s, skald, p)); paminn(s, p, e.om, e.bev); // kvädet påminner (steg 10.6.15)
    think(p, `Hörde ${gen(skald.name)} sorgkväde om ${e.namn}`, KYRKA.kvadeHumor * q, s.now, 12 * HOUR); }
  count(s, 'sorgkvade');
  log(s, `${skald.name} kvad om ${d?.name ?? e.namn} vid graven.`, 'rel', [skald.id]);
}
// gravölet (steg 10.4.12, 10.11.10): byns vuxna vid elden efter begravningen. En portion mat som äts och en öl var ur kyrkans egendom; räcker det inte
// hålls inget gravöl. kan = det räcker för de vuxna som finns, slut = maten och ölet för dem som var med
const gravolMat = (s: State, tr: Tro) => FOOD.reduce((a, k) => a + kyrkansAv(s, tr, k), 0);
export const gravolKan = (s: State, tr: Tro | undefined) => { const n = living(s).filter(p => ageOf(p, s.now) >= ALDER.vuxen).length; return !!tr && n > 0 && gravolMat(s, tr) >= n && olAntal(s, tr) >= n; };
export function gravolSlut(s: State, tr: Tro, med: Person[]) {
  for (const p of med) {
    const k = FOOD.filter(q => kyrkansAv(s, tr, q) >= 1).sort((a, b) => kyrkansAv(s, tr, b) - kyrkansAv(s, tr, a))[0];
    if (k && kyrkanTar(s, tr, k, 1)) { ata(p, { [k]: KROPP.mattar }); count(s, 'atit', 1); } // en portion var (steg 10.11.10)
    const t = budHindrar(s, p, 'ingetRus') ? undefined : kyrkansOl(s, tr)[0];
    if (t) { t.inne!.n -= 1; if (t.inne!.n <= 0) t.inne = undefined; drickAlkohol(s, p, 'ol', true); count(s, 'gravol_ol'); } // den tomma krukan blir kvar
  }
}
// den första skörden (odling.ts): den första hela saken k ur en ny skörd på fältet f går till kyrkan. m = när rutan mognade; en ruta
// som mognat mer än ett dygn efter den som offrades hör till en ny skörd
export function forstaSkorden(s: State, p: Person, f: { offrat?: number }, k: string, m: number | undefined) {
  if (m === undefined || (f.offrat !== undefined && m < f.offrat + DAY) || !harBud(s, p, 'forstaSkord') || ownsAmount(s, p, k) < 1) return;
  const tr = troOf(s, p.tro)!;
  ownMove(s, k, 1, p.id, kyrkaId(tr.id)); f.offrat = m; count(s, 'forstaSkord');
  p.troStyrka = Math.min(100, (p.troStyrka ?? 0) + KYRKA.kravTro);
  think(p, 'Gav det första ur skörden till tron', KYRKA.kravHumor, s.now, 12 * HOUR);
}
// handlaren välkomnas när hen kommer fram (handel.ts), en gång per besök: en hel mat ur byns förråd, och de som följer budet får en bättre relation
export function valkomnaHandlare(s: State, h: Handlare) {
  const folj = living(s).filter(f => harBud(s, f, 'valkomna'));
  if (!folj.length) return;
  for (const f of folj) { const r = gastRel(s, h, f); if (r) r.op = Math.min(100, r.op + KYRKA.framlingRel); }
  if (MAT.anvand(s, hp(s, h)) > 0) count(s, 'handlare_valkommen');
}
import { specialHuvud } from './special';
import { dagNr } from './tid';
