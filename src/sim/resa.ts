// ---------- sällskapet och resan (steg 11.5.2–, Flera samhällen: Sällskapet, Packningen i tal, Farten i tal) ----------
// Ett sällskap är en post i världen (vl.sallskap): en ledare och medlemmar (byborna som reser, borta från byn under resan,
// ute.ts), djur och fordon, ett mål (en plats i världen) och ett skäl (en rad i registret RESMAL), ett skede (samlas, packar,
// ute, framme, hemåt, hemma), en plats på vägen, en gemensam packning i hela saker och en bok över insatserna. Talen för resan
// står i blocket RESA. Ingen person är med i två sällskap.
import { balans } from './balans';
import { TIMMINNEN } from './timminne';
import { LandmarkId } from './landmarken';
import { H, HOUR, Person, State, Task, W } from './typer';
import { isLight } from './tid';
import { temperature, vaderNu } from './vader';
import { KROPP, count, alive, ageOf, ALDER, makeName, getRel, isSick, living, stat, log, ovning } from './folk';
import { TORST } from './torst';
import { SAKER, sakNamn } from './saker';
import { BYN } from './egendom';
import { amountOf, capacity, dropLoad, iHelaForradet, laggIn, load } from './lager';
import { FOOD } from './saker';
import { bynsMitt, utanforByn } from './omrade';
import { blocked, freeNear } from './byggnad';
import { groundOf } from './mark';
import { findPath } from './vag';
import { gaBort, ute } from './ute';
import { Varlden, varldMark } from './varlden';
import { byPlats, kandPlats, varldPlatserPa, varldPlatsNr, type VarldPlats } from './landmarken';
import { clamp } from './slump';
import { ryggsack } from './utrustning';
import { Tamdjur, tamArt, tamdjurOf, tamEg } from './tamdjur';
import { FORDON, lassAv, lediga, taFordon, valjDragfordon, type FordonRad, type Underlag } from './fordon';
import { ledigtTing, tingOf, type Ting } from './agande';
import type { Fardsatt } from './varldmark';
import { viktOf } from './saker';
import { grundvarde } from './varde';
import { GRUVSAK, SILVER, laggGruvor, silverKvar } from './gruva';
import { VARLD, VARLDMARK, MARK_IDS, VarldMark } from './varldmark';
import { kostnader, sparadVag, vagMellan, vagRutor, VarldVag } from './vagval';
import { delFel, GADELAR } from './halsa';
import { snoPaMarken } from './vader';
import { ledKlass, sallskapTyngd, trampa } from './leder';
import type { Skill } from './typer';
import { kommHem } from './ute';
import { larOrt, O_BESOKT, radBesoker } from './ort';
import { BYSORTER, radNr, type VarldRad } from './radtal';
import { byPaslag, gruppAv, radHar, radPaslag, radPrisAndras, radTar } from './priser';
import { rnd } from './slump';
import { DAY } from './typer';
import { kanGa } from './halsa';
import { SEC } from './typer';
import { kannerOrt, O_RYKTE, taBortPlats, vetBorta } from './ort';
import { MATERIALMAL, villHaAv } from './forradsmal';
import { kannerPris, trorPris } from './minne';
import { PAB, pabud } from './styre';
import { avslutaUppdrag, kravPassar, ruinRad, saFynd, taRuin, uppdragDef, uppdragNr, uppdragVid, UPPDRAGTAL } from './uppdrag';
import { handelse, ryktbarhet, RYKTE } from './rykten';
import { DJUR } from './redskap';
import { SLAKTAD } from './boskap';
import { handelsPris } from './handel';
import { notis } from './notiser';
import { ARMAR, BEN, FOTTER, HANDER, HALSA, VARD, halsaSteg, skada, vardKalla, vardKan, type Kroppsdel, type SkadaTyp } from './halsa';
import { SJUK_DOD, insjukna, sjukSteg, type SjukId } from './sjukdom';
import { DODSORSAKER, die, type Dodsorsak } from './liv';
import { GRODOR, rutorAv } from './odling';
import { TORKA } from './torka';
import { BYREL, byHandelse, gavaRel } from './byrel';
import { kronika } from './historik';
import { antal, han, hans, honom, horText, och, spelTid, stor, tal } from './ord';
import { kronikaBer } from './berattelser';
import { tanke } from './tankar';
import { upplev } from './uppvaxt';
// "en sak", "tre saker"
const saker = (n: number) => n === 1 ? 'en sak' : `${tal(n)} saker`;

export const RESA = balans('resa', {
  minDygn: 0.1, // en resa tar minst så här många dygn, också till en plats på byns egen ruta i världen
  samlaSek: 3600, // så länge (sekunder i verkligheten) ledaren får samla sällskapet innan resan ställs in (en timme, ett kvarts dygn i spelet)
  // packningen (steg 11.5.3)
  matPerDygn: 1.6, // portioner per resenär och dygn (en vuxens måltid är en portion)
  margModig: 1, margMitt: 1.25, margForsiktig: 1.5, // ledarens marginal: den modiga och slarviga, mitten och den försiktiga
  utanVatten: 0.5, // en sträcka utan vatten längre än så många dygn kräver en vattensäck per resenär
  foderPerDygn: 2, // hö per djur och dygn där det inte går att beta
  hander: 20, rygg: 20, // vikt en resenär bär i händerna och i en ryggsäck
  andelVarde: 40, // en andel per så mycket i värde för varje insats (Andelarna i tal)
  packTim: 6, // timmar en resenär väntar vid samlingsplatsen innan hen väljer om (sällskapet ställs in i steg 11.5.11)
  // behoven på vägen (steg 11.5.6): orken per timme i gång och i nattens rast, och tappet en natt utan tak
  orkGang: 0.06, // så mycket ork per timme i gång på dagen (en hel dag tar 0,72)
  orkVila: 0.1, // så mycket ork per timme i nattens rast (en hel natt ger 1,2)
  koldFran: 8, // grader: under så kallt drar natten ute ork ...
  orkKold: 0.012, // ... så mycket per timme och grad under koldFran, för den som inte ryms i tälten
  orkBlot: 0.08, // så mycket per timme i det kraftigaste regnet eller snöfallet, för den som inte ryms i tälten
  talt: 4, // så många ryms i ett tält
  orkFartFran: 0.5, orkFartMin: 0.6, // under så mycket ork går sällskapet långsammare, jämnt ner till orkFartMin vid ingen ork
  // farten (steg 11.5.7)
  fartBarn: 0.75, fartGammal: 0.75, fartBen: 0.5, // barn och gamla, och den med skadade ben (ner till så här)
  lastFran: 0.5, lastMin: 0.8, // lasten bromsar över så stor del av bärförmågan, jämnt ner till lastMin vid full last
  snoFran: 0.3, snoFart: 0.8, // så mycket snö på marken, och farten i den
  dagTim: 12, // timmar i gång per dygn (dagsljuset, isLight)
  // besöket hos en rad (steg 11.5.8)
  besokInst: 2, // så mycket bättre blir inställningen hos byn som får besök
  matKvar: 0.5, // så stor del av sin mat säljer en by högst
  mott: 3, // så många av byns folk som huvudbyn mött minns raden
  // att samla till en resa (steg 11.5.10)
  vikt: 0.03, // poängen per väntat värde (arbetstimmar) per dygn borta och resenär, på samma skala som Förbättra (VAL.forb…)
  bud: 20, // äran av att bära byns besked, för en medelmåttigt lämplig (arbetstimmar; lämpligheten: karisma, Handel och släkt i byn, steg 11.6.23)
  budSlakt: 0.5, // så mycket mer lämplig är den som har släkt i byn (kommer därifrån)
  budGava: 40, // så mycket (i grundvärde) av det byn har över bär ett vänligt bud som gåva
  // turnén (steg 11.8.18)
  turneGava: 30, // gåvan (i grundvärde, hela saker) en grannby ger den bästa, som hela byn talar om, efter ett framträdande; mindre för den mindre kända och skickliga
  turneVan: 10, // grannbyn måste tycka så här bra om byn (hållningen, -100 till 100) för att ta emot en turné
  seVarde: 15, // det väntade värdet av att se en plats man bara hört rykten om, för en medelmåttigt nyfiken (arbetstimmar)
  omvag: 1.5, // en väg ingen gått räknas som fågelvägen gånger så här mycket
  poangTim: 1, // så ofta (timmar i spelet) resans poäng för varje plats räknas om (steg 12.1.11)
  faraDygn: 0.04, // ledens fara per dygn på vägen i valet av resa: ett fast tal, inte räknat ur vägens händelser
  // kallelsen (steg 11.5.11)
  kraftPerFara: 15, // den kraft sällskapet behöver per del av ledens fara (en medelstark vuxen har kraften 1)
  foljMod: 0.4, foljTycke: 0.4, foljNyfiken: 0.3, foljSlump: 0.6, // viljan att följa med: modet, tycket om ledaren, nyfikenheten och slumpen ...
  foljVinst: 0.05, // ... och den egna delen av resans väntade värde per dygn (värdet delat med resenärerna) ...
  folj: 0.35, // ... över så mycket följer man med
  // dagboken och redogörelsen (steg 11.5.13)
  minns: 20, // så många resor som kommit hem minns byn (redogörelsen), de äldsta glöms
  // vägens händelser (steg 11.5.14)
  fardSank: 0.5, // den bästa i sällskapet med full färdighet (20) ändrar risken så här mycket (sänker den, eller höjer ett fynd)
  vilseStig: 0.02, // risken per dygn att gå vilse på stig, led och väg (på obanad mark står den i VAGHANDELSER)
  vilseTim: 4, // timmar i gång som går förlorade när sällskapet går vilse
  ovaderTim: 6, ovaderOrk: 0.2, // timmar sällskapet väntar ut ovädret, och orken det drar för den som inte ryms i tälten
  ovaderNb: 2, // risken för oväder gånger (1 + så här mycket gånger regnet eller snön just nu, 0–1)
  tappadLast: 2, // risken att tappa något gånger (1 + så här mycket gånger lasten delat med bärförmågan)
  fyndMat: 0.5, // portioner per resenär i ett fynd av mat (minst en hel)
  fyndVarm: 5, fyndKall: 0.3, // under så många grader hittar sällskapet bara så stor del så ofta
  hjulTim: 8, // timmar det tar att laga ett trasigt hjul för den som inte kan hantverk; den bästa i sällskapet kortar det (fardSank) (steg 12.1.144)
  viltMin: 0.15, // chansen att fälla viltet för ett sällskap utan jägare; den bästa jägaren höjer den upp till 1 vid full färdighet (steg 12.1.144)
  viltKott: 3, // kött i packningen när sällskapet fäller viltet (en kanins kött)
  viltTim: 2, // timmar jakten tar, fälld eller inte
  // när maten tar slut (steg 11.5.15)
  hungerKost: 5, // det ett dygn utan mat kostar en resenär, i värde (samma skala som resans värde)
  tidKost: 3, // det ett dygn längre resa kostar en resenär, i värde
  matEmpati: 0.5, matTycke: 0.5, // ledarens omtanke väger hungern tyngre: empatin och tycket om de andra resenärerna
  letaTim: 6, letaMat: 0.8, // timmar sällskapet letar mat, och portionerna per resenär det väntar sig hitta (färdigheten Samla och kylan som för ett fynd)
  matOmTim: 12, // timmar innan ledaren väger igen, om det fortfarande inte finns mat
  orkSvalt: 0.02, // så mycket ork per timme drar hungern när mättnaden är slut
  olyckaObanad: 2, // en olycka är så här mycket vanligare på obanad mark än på stig, led och väg (steg 11.5.16)
  olyckaMin: 0.2, olyckaMax: 0.7, // hur svår skadan blir (som i OLYCKOR: de flesta lätta)
  langsam: 0.7, // en resenär under den här farten är långsam, och ledaren väger utvägarna i UTVAGAR (steg 11.5.17)
  utvagOmTim: 12, // så många timmar innan ledaren väger igen
  personVikt: 60, // en människa som åker på ett djur eller en vagn väger så här mycket (som packningen)
  barFart: 0.75, // ett sällskap som bär en bår går så här mycket långsammare
  rastTim: 24, // en rast för att vila upp sig
  lamnaKost: 150, // det kostar ledaren så mycket att lämna någon (i värde), mer för den som bryr sig och om hen tycker om personen
  lamnaEmpati: 0.5, lamnaTycke: 1,
  behovVarde: 50, // så mycket (i värde) är en portion mat, en vattensäck, ett hö eller ett tält värt när resan behöver det för dygnen som återstår (steg 12.1.145)
  gommaDygn: 20, // det som släpps ligger i en gömma så här många dygn (år i spelet)
  forsvunnen: 3, // kommer ingen hem räknas resenärerna som försvunna efter så många gånger den väntade tiden (steg 11.5.18)
});
// det sällskapet behåller för vägen och inte säljer (maten säljs inte heller)
export const BEHALL = ['torrgras', 'vattensack', 'talt', 'silver', 'packsadel', 'ridsadel', 'vagn'];
// sällskapets mål och hemby i världen (kodgenomgången, fynd 185)
const slMal = (s: State, sl: Sallskap) => s.varld && kandPlats(s.varld, sl.mal); // också en plats byn tror finns men som tagits bort (steg 12.1.146)
const slHem = (s: State, sl: Sallskap) => s.varld && byPlats(s.varld, sl.by);
// det sällskapet kan sälja eller ge bort: inte det det behåller eller maten, och bara det som har ett värde (kodgenomgången, fynd 185)
export const saljbar = (k: string) => !BEHALL.includes(k) && !FOOD.includes(k) && grundvarde(k) > 0;

// skälen att resa: namnet, vilka sorters platser som är ett mål, och hur länge (dygn) sällskapet stannar framme
export interface ResmalDef { namn: string; resa: string; mal: readonly LandmarkId[]; stannar: number } // resa: färden i en mening ("kom hem från en handelsresa")
export const RESMAL = {
  handel: { namn: 'Handel', resa: 'en handelsresa', mal: ['by', 'handelslager'], stannar: 1 },
  uppdrag: { namn: 'Uppdrag', resa: 'ett uppdrag', mal: ['by', 'ruin', 'helig', 'gravhog', 'runsten', 'fyndplats', 'utpost', 'rovarlager', 'gomma'], stannar: 1 },
  turne: { namn: 'Turné', resa: 'en turné', mal: ['by'], stannar: 1 },
  slakt: { namn: 'Besök hos släkt', resa: 'ett besök hos släkten', mal: ['by'], stannar: 2 },
  se: { namn: 'Se en plats', resa: 'en färd för att se platsen', mal: ['ruin', 'helig', 'gravhog', 'runsten', 'fyndplats', 'karavanrest', 'rastplats', 'by', 'handelslager', 'utpost'], stannar: 0.25 },
  sandebud: { namn: 'Sändebud', resa: 'en färd som sändebud', mal: ['by'], stannar: 1 },
  budbarare: { namn: 'Budbärare', resa: 'en färd med ett bud', mal: ['by'], stannar: 0.25 }, // den som utlyst ett uppdrag skickar det till en grannby (steg 11.8.13, utlysa.ts)
  hamta: { namn: 'Hämta', resa: 'en färd till gruvan', mal: ['silvergruva', 'jarngruva'], stannar: 1 }, // och malmen i järngruvan (steg 12.2.13) // det en plats ger: silvret i gruvan; tiden nere väljs i packskedet (steg 11.10.1)
} as const satisfies Record<string, ResmalDef>;
export type ResmalId = keyof typeof RESMAL;
// dygnen sällskapet stannar framme: tiden nere i gruvan när den är vald, annars skälets
export const stannarFor = (sl: { skal: ResmalId; nere?: number; hjalp?: 1 }) => sl.nere ?? (sl.hjalp ? UPPDRAGTAL.hjalpDygn : RESMAL[sl.skal].stannar); // hjälpen tar några dygn (steg 11.13.23)

export type Skede = 'samlas' | 'packar' | 'gar' | 'ute' | 'framme' | 'hemat' | 'hemma' | 'forsvunnet'; // forsvunnet: ingen kom hem (steg 11.5.18) // gar: på väg ut ur byn
// en insats i boken: vem som äger den, saken (eller djuret) och hur många, i hela saker, och värdet när resan började
export interface Insats { agare: number | 'by'; sak: string; n: number; varde: number; djur?: number; ting?: number } // ting: vagnen eller släden (steg 12.1.10)
export interface Sallskap {
  id: number; by: number; // sällskapets nummer och raden det kommer från
  ledare: number; medl: number[]; djur: number[]; fordon: string[]; rider?: [number, number][]; // rider: ryttaren och hästen (steg 11.11.4) // personernas och djurens id (ledaren är en av medlemmarna)
  mal: number; skal: ResmalId; skede: Skede; // målets plats i världen, skälet och skedet
  borjan: number; t: number; // när ledaren började samla, och tiden sällskapet räknats till
  ruta?: number; vag?: { fran: number; till: number; steg: string }; pos?: number; // rutan sällskapet är på, vägen och hur långt längs den (rutor)
  pack: Record<string, number>; // den gemensamma packningen, hela saker
  forlust?: [number | 'by', number, number][]; // det rövarna tog: ägaren, värdet och lägrets rad, för utlysningen hemma (steg 11.8.11, utlysa.ts)
  hjalp?: 1; hjalpTim?: number; // uppdraget är att hjälpa en by, och timmarna sällskapet arbetat i den väckta byn (steg 11.13.23)
  insatser: Insats[];
  borta?: 1; // framme fanns platsen inte längre (steg 12.1.146)
  dagbok: [number, string, DagbokId?][]; // resans dagbok: tiden, texten och händelsens slag (steg 11.5.13)
  att?: Record<string, number>; // det ledaren bestämt att packa, som resenärerna hämtar ur förrådet och bär till samlingsplatsen (steg 12.1.8)
  ut?: Utgang; vid?: number[]; packar?: number; // samlingsplatsen och kanten, de som är framme vid samlingsplatsen och när packningen började (steg 11.5.5)
  behov?: ResBehov; // mättnaden, vätskan och orken på vägen, för hela gruppen (steg 11.5.6)
  gang?: number; framme?: number; // gången mot nästa ruta (i rutans kostnad) och när sällskapet kom fram (steg 11.5.7)
  delning?: Andelar; // hur det delades hemma (steg 11.5.9)
  uppdrag?: number; // uppdraget sällskapet reser för (steg 11.8.4)
  vilse?: 1; // sällskapet är saknat och vägt för en vilsegång (steg 11.8.6, vilsegang.ts)
  utfall?: UppdragUtfall; // hur det gick på platsen (steg 11.8.7)
  turne?: number; // turnén är gjord: silvret grannbyn gav (steg 11.8.18)
  varor?: [string, number][]; // det ledaren tänkt sälja, som tas i packningen (steg 11.5.10)
  kop?: [string, number][]; // det ledaren tänkt köpa hem, det byn har brist på (steg 11.6.11)
  krav?: number; // kraften sällskapet behöver mot ledens fara (steg 11.5.11)
  berattad?: number; // när resan berättades hemma (steg 11.5.13)
  ton?: import('./byhandling').BeskedTon; av?: 'staten' | 'kyrkan'; // sändebudets besked och vem som sände det (steg 11.6.23)
  varde?: number; matNasta?: number; // resans väntade värde (resaPlan), och när ledaren väger nästa gång om maten tar slut (steg 11.5.15)
  forlorat?: number; // timmar i gång som går förlorade: vilse eller ett oväder som väntas ut (steg 11.5.14)
  spar?: number[]; mott?: string[]; // rutorna sällskapet gått sedan förra timmen, och de sällskap det mött (steg 11.6.12)
  buren?: [number, BurenSatt][]; utvagNasta?: number; // de som bärs och hur, och när ledaren väger nästa gång om någon är långsam (steg 11.5.17)
  nere?: number; silverArb?: number; // dygnen nere i gruvan, valda i packskedet, och arbetet mot nästa silver (steg 11.10.1)
  drag?: { g: number; d: number; p: number; ting?: Ting }; // vagnen eller släden (steg 12.1.10): tinget, dragdjuret och den som kör; tinget självt medan det är ute ur byn
  gaster?: [number, number][]; vacktMat?: [string, number][]; // resenärerna som gäster i den väckta byn (personens id och gästens), och maten de tog med sig dit (steg 11.13.10, vacktgast.ts)
}
export type BurenSatt = 'vagn' | 'djur' | 'bar';
// sällskapets tre tal på vägen (0–1), de fyllda vattensäckarna och fodret djuren ätit sedan sist (arbetet mot nästa hela hö)
export interface ResBehov { matt: number; vatska: number; ork: number; fulla: number; foder: number }

// ett nytt sällskap med ledaren som första medlem; det samlas tills det packar
export function nyttSallskap(s: State, ledare: Person, mal: number, skal: ResmalId): Sallskap | undefined {
  const vl = s.varld;
  if (!vl || vl.huvud === undefined || sallskapFor(vl, ledare.id)) return undefined;
  const sl: Sallskap = { id: vl.nastaSallskap = (vl.nastaSallskap ?? 0) + 1, by: vl.huvud, ledare: ledare.id, medl: [ledare.id], djur: [], fordon: [], mal, skal, skede: 'samlas', borjan: s.now, t: s.now, pack: {}, insatser: [], dagbok: [] };
  (vl.sallskap ??= []).push(sl);
  return sl;
}
// sällskapet en person är med i (inte de som kommit hem)
export const sallskapFor = (vl: Varlden | undefined, id: number) => vl?.sallskap?.find(x => x.skede !== 'hemma' && x.skede !== 'forsvunnet' && x.medl.includes(id));
// en till följer med medan sällskapet samlas
export function foljMed(vl: Varlden, sl: Sallskap, p: Person) {
  if (sl.skede !== 'samlas' || sallskapFor(vl, p.id)) return false;
  sl.medl.push(p.id);
  return true;
}
// ett djur följer med (ett packdjur, en häst)
export function djurMed(sl: Sallskap, djurId: number) { if (!sl.djur.includes(djurId)) sl.djur.push(djurId); }
// de sällskap som är på väg, framme eller packar (inte de som kommit hem)
export const sallskapNu = (vl: Varlden | undefined) => (vl?.sallskap ?? []).filter(x => x.skede !== 'hemma' && x.skede !== 'forsvunnet');

// ---------- packningen (steg 11.5.3, Packningen i tal) ----------
// ledarens marginal: 1,25 i mitten, mot 1,0 för den modiga och slarviga (högt mod, låg flit) och 1,5 för den försiktiga
export function marginal(p: Person) {
  const x = clamp(((p.pot.flit - 10) - (p.pot.mod - 10)) / 18, -1, 1);
  return x >= 0 ? RESA.margMitt + x * (RESA.margForsiktig - RESA.margMitt) : RESA.margMitt + x * (RESA.margMitt - RESA.margModig);
}
// finns det vatten på eller bredvid rutan (en flod, en sjö, en myr; havet är salt)
function vattenVid(v: VarldMark, i: number) {
  if (v.flod[i] || VARLDMARK[MARK_IDS[v.mark[i]]].vatten) return true;
  const x = i % v.w, y = Math.floor(i / v.w);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < v.w && ny < v.h && MARK_IDS[v.mark[ny * v.w + nx]] === 'sjo') return true;
  }
  return false;
}
// vägen dit räknad i dygn: hela sträckan, den längsta sträckan utan vatten och dygnen där djuren inte kan beta (i en frisk
// vuxens gångfart; farten kommer i steg 11.5.7)
export interface VagDygn { rutor: number[]; dygn: number; torr: number; utanBete: number }
export function vagDygn(s: State, fran: number, till: number, fs: Fardsatt = 'fots'): VagDygn | undefined {
  const vl = s.varld, v = varldMark(s);
  if (!vl || !v) return undefined;
  const vag = vagMellan(vl, v, fran, till, fs, s.now);
  if (!vag) return undefined;
  const rutor = vagRutor(vag, v.w), k = kostnader(vl, v, fs);
  let torr = 0, hit = 0, utanBete = 0;
  for (let n = 1; n < rutor.length; n++) {
    const i = rutor[n], d = k[i] / VARLD.gangPerDygn;
    hit = vattenVid(v, i) ? 0 : hit + d; torr = Math.max(torr, hit);
    if (!VARLDMARK[MARK_IDS[v.mark[i]]].bete && !varldPlatserPa(vl, i % v.w, Math.floor(i / v.w)).some(p => p.k === 'by')) utanBete += d;
  }
  return { rutor, dygn: vag.kostnad / VARLD.gangPerDygn, torr, utanBete };
}
// vad en resenär bär och vad ett djur bär
export const barResenar = (s: State, p: Person) => RESA.hander + (ryggsack(s, p) ? RESA.rygg : 0);
// ett djur bär med packsadel (FORDON.packsadel, steg 11.11.3); utan sadel bär det inget
export const barDjur = (s: State, id: number) => { const d = (s.tamdjur ?? []).find(q => q.id === id && q.dog === undefined); return d ? lassAv(FORDON.packsadel!, d) : 0; };
// djuren i sällskapet bär: lika många som det finns packsadlar i packningen, de starkaste först
// hästen personen rider på i sällskapet, om den lever och följer med (steg 11.11.4)
export function ridHast(s: State, sl: Sallskap, pid: number) {
  const r = sl.rider?.find(x => x[0] === pid);
  return r && sl.djur.includes(r[1]) ? (s.tamdjur ?? []).find(d => d.id === r[1] && d.dog === undefined) : undefined;
}
const ridna = (sl: Sallskap) => new Set([...(sl.rider ?? []).map(x => x[1]), ...sl.drag ? [sl.drag.d] : []]); // ryttarnas hästar och dragdjuret bär ingen packsadel
// en ryttares fart: ridsadelns gånger hästens snabbhet
export const ryttarFart = (d: Tamdjur) => FORDON.ridsadel!.fart.terrang * tamEg(d).snabbhet;
export function barDjurAlla(s: State, sl: Sallskap, pack = sl.pack) {
  const rid = ridna(sl);
  const lass = sl.djur.filter(id => !rid.has(id)).map(id => barDjur(s, id)).sort((a, b) => b - a);
  const sadlar = Math.max(pack.packsadel ?? 0, pack === sl.pack ? sl.att?.packsadel ?? 0 : 0); // medan sällskapet packar: de sadlar ledaren bestämt (steg 12.1.8)
  return lass.slice(0, Math.floor(sadlar + 1e-9)).reduce((a, n) => a + n, 0);
}

// ---------- vagnen eller släden på resan (steg 12.1.10, Flera samhällen: Packningen i tal och Farten i tal) ----------
// Färdsättet på världskartan: med vagn eller släde vagnens (runt myr, berg och tät skog), med djur packdjurens, annars till fots
export const fardsatt = (sl: Sallskap): Fardsatt => sl.fordon.length ? FORDON[sl.fordon[0]!]?.fardsatt ?? 'vagn' : sl.djur.length ? 'packdjur' : 'fots';
// dragdjuret som drar vagnen, om det lever och följer med
const dragdjur = (s: State, sl: Sallskap) => sl.drag && sl.djur.includes(sl.drag.d) ? (s.tamdjur ?? []).find(d => d.id === sl.drag!.d && d.dog === undefined) : undefined;
const vagnRad = (sl: Sallskap) => sl.fordon.length ? FORDON[sl.fordon[0]!] : undefined;
// vagnens lass: dragdjurets styrka gånger fordonets lass per styrka (FORDON)
export const vagnLass = (s: State, sl: Sallskap) => { const f = vagnRad(sl), d = f && dragdjur(s, sl); return f && d ? lassAv(f, d) : 0; };
// underlaget på världsrutan i för ett fordon: en väg, en stig eller led, annars terrängen
const ledUnderlag = (vl: Varlden, i: number): Underlag => { const k = ledKlass(vl, i); return k === 'vag' ? 'vag' : k === 'obanad' ? 'terrang' : 'stig'; };
// fordonets fart på världsrutan i med dragdjuret d, som i byn (fordonFart): underlagets och snöns, gånger djurets snabbhet
export function vagnFartPa(s: State, f: FordonRad, d: Tamdjur, i: number) {
  const sno = Math.min(1, snoPaMarken(s)), u = ledUnderlag(s.varld!, i);
  return (f.fart[u] * (1 - sno) + f.fart.sno * sno) * tamEg(d).snabbhet;
}

// har en resa som börjar t0 och tar dygn dygn en natt (klockan 19–7, som isLight)? En resa på tolv timmar eller mer har alltid det
export function harNatt(t0: number, dygn: number) {
  if (dygn * DAY >= 12 * HOUR) return true;
  for (let t = t0; t <= t0 + dygn * DAY; t += 15 * 60 * SEC) if (!isLight(t)) return true;
  return !isLight(t0 + dygn * DAY);
}
// packningens behov för en resa: maten, vattensäckarna och fodret i hela saker, dygnen och bärförmågan. Går inte allt in tas
// maten före fodret, och vattnet först (utan vatten kommer ingen fram)
export interface Packbehov { dygn: number; mat: number; vatten: number; foder: number; talt: number; taltBehov: number; bar: number; vikt: number; behov: number; ryms: boolean } // talt: tälten som packas (de byn har), taltBehov: de som behövs (steg 11.11.1)
export function packbehov(s: State, sl: Sallskap): Packbehov | undefined {
  const vl = s.varld, v = varldMark(s), hem = slHem(s, sl), mal = slMal(s, sl);
  if (!vl || !v || !hem || !mal) return undefined;
  const vd = vagDygn(s, hem.y * v.w + hem.x, mal.y * v.w + mal.x, fardsatt(sl));
  if (!vd) return undefined;
  const folk = sl.medl.map(id => s.people.find(p => p.id === id)).filter((p): p is Person => !!p), led = folk.find(p => p.id === sl.ledare) ?? folk[0];
  const n = folk.length, dygn = 2 * vd.dygn + stannarFor(sl);
  const bar = folk.reduce((a, p) => a + barResenar(s, p), 0) + barDjurAlla(s, sl) + vagnLass(s, sl);
  const vatten = vd.torr > RESA.utanVatten ? n : 0;
  let mat = Math.ceil(n * RESA.matPerDygn * dygn * (led ? marginal(led) : RESA.margMitt) - 1e-9);
  let foder = Math.ceil(sl.djur.length * RESA.foderPerDygn * 2 * vd.utanBete - 1e-9);
  // tälten (steg 11.11.1): ett per RESA.talt resenärer när resan har en natt på vägen, så många som byn har
  const taltBehov = harNatt(s.now, dygn) ? Math.ceil(n / RESA.talt) : 0;
  let talt = Math.min(taltBehov, Math.floor(amountOf(s, 'talt') + 1e-9));
  const vMat = 1, vVatten = viktOf('vattensack'), vFoder = viktOf('torrgras'), vTalt = viktOf('talt');
  const behov = mat * vMat + vatten * vVatten + foder * vFoder + talt * vTalt, ryms = behov <= bar;
  if (!ryms) { // vattnet först, sedan maten, tälten och fodret
    let rum = bar - vatten * vVatten;
    mat = Math.max(0, Math.min(mat, Math.floor(rum / vMat))); rum -= mat * vMat;
    talt = Math.max(0, Math.min(talt, Math.floor(rum / vTalt))); rum -= talt * vTalt;
    foder = Math.max(0, Math.min(foder, Math.floor(rum / vFoder)));
  }
  return { dygn: Math.round(dygn * 100) / 100, mat, vatten, foder, talt, taltBehov, bar, behov, vikt: mat * vMat + vatten * vVatten + foder * vFoder + talt * vTalt, ryms };
}

// ---------- boken över insatserna (steg 11.5.4, Andelarna i tal) ----------
// Vem som satsat vad i sällskapet: egna saker, något ur byns förråd ('by') eller ett djur (en annans häst), i hela saker med
// värdet när resan började. Den som äger en insats behöver inte följa med, och risken är ägarens.
export function satsa(sl: Sallskap, agare: number | 'by', sak: string, n: number): Insats | undefined {
  n = Math.floor(n);
  if (n <= 0) return undefined;
  const e = sl.insatser.find(x => x.agare === agare && x.sak === sak && x.djur === undefined);
  sl.pack[sak] = (sl.pack[sak] ?? 0) + n;
  if (e) { e.n += n; e.varde = Math.round(e.n * grundvarde(sak)); return e; }
  const ny: Insats = { agare, sak, n, varde: Math.round(n * grundvarde(sak)) };
  sl.insatser.push(ny);
  return ny;
}
// ett djur som insats: ägaren är djurets ägare (eller byn), och värdet är artens
export function satsaDjur(s: State, sl: Sallskap, djurId: number): Insats | undefined {
  const d = tamdjurOf(s).find(q => q.id === djurId);
  if (!d || sl.insatser.some(x => x.djur === djurId)) return undefined;
  djurMed(sl, djurId);
  const ny: Insats = { agare: d.agare ?? 'by', sak: d.art, n: 1, varde: tamArt(d.art).varde, djur: djurId };
  sl.insatser.push(ny);
  return ny;
}
// värdet var och en satsat, per ägare
export function insatsPer(sl: Sallskap): Map<number | 'by', number> {
  const m = new Map<number | 'by', number>();
  for (const x of sl.insatser) m.set(x.agare, (m.get(x.agare) ?? 0) + x.varde);
  return m;
}

// ---------- packningsskedet i byn (steg 11.5.5, Packningen i tal) ----------
// Ledaren bestämmer att sällskapet packar: maten och fodret tas ur förrådet i hela saker (bokförda som insatser hos dem som
// ägde dem, det som var byns som byns), och samlingsplatsen är där linjen från byns mitt mot rätt kant (målets håll i världen)
// lämnar byns område. Varje resenär går dit med sitt (handlingen resa); när alla är framme lastas djuren och sällskapet går
// ut ur kartan längs samma linje. Den som når kanten är borta (gaBort), och när alla gått är sällskapet ute på vägen.
export interface Utgang { samla: { x: number; y: number }; kant: { x: number; y: number } }
export function utgang(s: State, sl: Sallskap): Utgang | undefined {
  const hem = slHem(s, sl), mal = slMal(s, sl);
  if (!hem || !mal) return undefined;
  const c = bynsMitt(s), dx = mal.x - hem.x, dy = mal.y - hem.y;
  const [sx, sy] = Math.abs(dx) >= Math.abs(dy) ? [Math.sign(dx) || 1, 0] : [0, Math.sign(dy) || 1];
  const d = sx > 0 ? W - 1 - c.x : sx < 0 ? c.x : sy > 0 ? H - 1 - c.y : c.y;
  // samlingsplatsen är den första platsen utanför byn på linjen som går att gå till från byns mitt, inte en udde på andra
  // sidan en sjö som ingen når. En sträcka land på linjen som inte går att nå prövas en gång
  // vägen räknas från en fri ruta vid byns mitt: står ett hus eller en station mitt i byn går ingen väg därifrån
  const g = groundOf(s), fran = freeNear(s, c.x, c.y);
  let samla: { x: number; y: number } | undefined, onad = false;
  for (let n = 0; n <= d && !samla; n++) {
    const x = c.x + sx * n, y = c.y + sy * n;
    if (blocked(s, x, y)) { onad = false; continue; }
    if (onad || utanforByn(s, x, y) < 1) continue;
    if (findPath(g, fran.x, fran.y, x, y)) samla = { x, y }; else onad = true;
  }
  return { samla: samla ?? freeNear(s, c.x + sx * d, c.y + sy * d), kant: freeNear(s, c.x + sx * d, c.y + sy * d) };
}
// maten och fodret till packningen: den mat det finns mest av först, i hela saker. Inget svävar (steg 11.1.74 och 12.1.8):
// ledaren bestämmer vad som packas, och resenärerna hämtar det ur förrådet och bär det till samlingsplatsen (resaHamtas), där
// det läggs i packningen bokfört hos ägarna (iPackningen)
function taIPackning(_s: State, sl: Sallskap, k: string, n: number, _led?: Person) {
  n = Math.floor(n + 1e-9);
  if (n > 0) (sl.att ??= {})[k] = (sl.att[k] ?? 0) + n;
}
// det resenären p ska hämta till packningen: det som inte packats och som ingen annan i sällskapet redan bär eller går efter, så mycket hen orkar
export function resaHamtas(s: State, p: Person, tk: Task): Record<string, number> | undefined {
  const sl = s.varld?.sallskap?.find(x => x.id === tk.ref);
  if (sl?.skede !== 'packar' || !sl.att || !sl.medl.includes(p.id)) return undefined;
  const bars: Record<string, number> = {};
  // det de andra bär, och det de är på väg till förrådet efter (annars hämtar två samma sista sak)
  for (const id of sl.medl) {
    const q = s.people.find(x => x.id === id), tq = q?.task;
    if (!q || q === p || tq?.act !== 'resa' || tq.ref !== sl.id) continue;
    for (const k of new Set([...Object.keys(tq.items ?? {}), ...Object.keys(tq.site ? tq.hamta ?? {} : {})])) bars[k] = (bars[k] ?? 0) + Math.max(tq.items?.[k] ?? 0, tq.site ? tq.hamta?.[k] ?? 0 : 0);
  }
  let rum = capacity(s, p) - load(tk, s);
  const ut: Record<string, number> = {};
  for (const k in sl.att) {
    const n = Math.min(Math.floor(sl.att[k]! - (sl.pack[k] ?? 0) - (bars[k] ?? 0) + 1e-9), Math.floor(rum / Math.max(1e-9, viktOf(k)) + 1e-9));
    if (n >= 1) { ut[k] = n; rum -= n * viktOf(k); }
  }
  return Object.keys(ut).length ? ut : undefined;
}
// framme vid samlingsplatsen: det resenären bär läggs i packningen, bokfört hos ägarna
function iPackningen(sl: Sallskap, tk: Task) {
  for (const k in tk.items ?? {}) {
    const ag = tk.ag?.[k] ?? {};
    for (const o in ag) { const m = Math.floor(ag[o]! + 1e-9); if (m > 0) satsa(sl, +o === BYN ? 'by' : +o, k, m); }
  }
  tk.items = undefined; tk.ag = undefined;
}
// vikten av det ledaren tänkt sälja som finns i byn och inte lyfts med båda händerna (det bärs i händerna)
const varorVikt = (s: State, sl: Sallskap) => (sl.varor ?? []).reduce((a, [k, n]) => a + (SAKER[k]?.lyft ? 0 : Math.min(n, Math.floor(amountOf(s, k) + 1e-9)) * viktOf(k)), 0);
// packdjuren (steg 11.11.3): de lediga hästarna och oxarna resenärerna får ta (egna, familjens och byns), mest lass per tid
// först, tas med en packsadel var så länge packningen och varorna väger mer än sällskapet bär. Djuret och sadeln skrivs
// som insatser. De djur som skulle behövts men inte fick någon sadel räknas i det byn vill ha (sadelVill)
const packdjurFram = (s: State, sl: Sallskap) => { const v = varldMark(s), hem = slHem(s, sl), mal = slMal(s, sl); return !!(v && hem && mal && vagDygn(s, hem.y * v.w + hem.x, mal.y * v.w + mal.x, 'packdjur')); };
function valjPackdjur(s: State, sl: Sallskap, led?: Person) {
  const upptagna = new Set(sallskapNu(s.varld).flatMap(x => x.djur)), sedda = new Set<number>();
  const kand: Tamdjur[] = [];
  for (const id of sl.medl) {
    const p = s.people.find(q => q.id === id);
    if (p) for (const d of lediga(s, p)) if (!upptagna.has(d.id) && !sedda.has(d.id)) { sedda.add(d.id); kand.push(d); }
  }
  if (kand.length && !packdjurFram(s, sl)) kand.length = 0; // packdjuren kommer inte fram (myren): sällskapet går till fots
  const varde = (d: Tamdjur) => lassAv(FORDON.packsadel!, d) * tamEg(d).snabbhet;
  kand.sort((a, b) => varde(b) - varde(a) || a.id - b.id);
  let sadlar = Math.floor(amountOf(s, 'packsadel') + 1e-9), utan = 0, behov = 0;
  // ridningen (steg 11.11.4): varje delning av hästarna prövas, från ingen ryttare till så många som det finns ridsadlar, och
  // den där packningen ryms och resan går fortast tas. De långsammaste resenärerna sitter upp först
  const pb0 = packbehov(s, sl), folk = sl.medl.map(id => s.people.find(q => q.id === id)).filter((p): p is Person => !!p && alive(p)).sort((a, b) => personFart(s, a) - personFart(s, b) || a.id - b.id);
  const hastar = kand.filter(d => tamArt(d.art).rids).sort((a, b) => tamEg(b).snabbhet - tamEg(a).snabbhet || a.id - b.id);
  const maxR = Math.min(hastar.length, folk.length, Math.floor(amountOf(s, 'ridsadel') + 1e-9));
  if (pb0 && maxR > 0) {
    const need = pb0.behov + varorVikt(s, sl);
    let bast: { r: number; ryms: boolean; bar: number; fart: number } | undefined;
    for (let r = 0; r <= maxR; r++) {
      const rid = hastar.slice(0, r), farter = [...rid.map(ryttarFart), ...folk.slice(r).map(p => Math.min(1, personFart(s, p)))];
      let bar = folk.reduce((a, p) => a + barResenar(s, p), 0), sd = sadlar;
      for (const d of kand) { if (bar >= need - 1e-9 || sd <= 0) break; if (rid.includes(d)) continue; bar += lassAv(FORDON.packsadel!, d); sd--; farter.push(tamEg(d).snabbhet); }
      const x = { r, ryms: bar >= need - 1e-9, bar, fart: Math.min(...farter) };
      // packningen som ryms går först, sedan farten; ryms den i ingen delning, den som bär mest
      if (!bast || (x.ryms && !bast.ryms) || (x.ryms && bast.ryms && x.fart > bast.fart + 1e-9) || (!x.ryms && !bast.ryms && x.bar > bast.bar + 1e-9)) bast = x;
    }
    for (let i = 0; i < bast!.r; i++) {
      const h = hastar[i]!;
      satsaDjur(s, sl, h.id); taIPackning(s, sl, 'ridsadel', 1, led); (sl.rider ??= []).push([folk[i]!.id, h.id]);
    }
  }
  valjVagn(s, sl, led, kand, sadlar);
  for (const d of kand) {
    if (sl.djur.includes(d.id)) continue; // hästen rids, eller drar vagnen
    const pb = packbehov(s, sl);
    if (!pb || pb.behov + varorVikt(s, sl) <= pb.bar + utan + 1e-9) break;
    behov++;
    if (sadlar > 0) { satsaDjur(s, sl, d.id); taIPackning(s, sl, 'packsadel', 1, led); sadlar--; }
    else utan += lassAv(FORDON.packsadel!, d);
  }
  if (behov > 0 && sl.by === s.varld?.huvud) (s.sadelBehov = (s.sadelBehov ?? []).filter(([t]) => t > s.now - DAY)).push([s.now, behov]);
}
// vagnen eller släden (steg 12.1.10): räcker inte det sällskapet bär, väger ledaren byns vagn (i snö släden, valjDragfordon) med
// det starkaste lediga dragdjuret mot packdjuren. Det som får plats går först, sedan den kortaste tiden på vägen: vagnens väg går
// runt myr, berg och tät skog, och dess fart följer ledens underlag (vagnFartPa). Djuret och vagnen skrivs som insatser
function valjVagn(s: State, sl: Sallskap, led: Person | undefined, kand: Tamdjur[], sadlar: number) {
  const vl = s.varld, v = varldMark(s), hem = slHem(s, sl), mal = slMal(s, sl), pb = packbehov(s, sl);
  if (!led || !vl || !v || !hem || !mal || !pb) return;
  const need = pb.behov + varorVikt(s, sl);
  if (need <= pb.bar + 1e-9) return; // det ryms utan
  const har = ['vagn', 'slade'].filter(k => ledigtTing(s, led, k));
  if (!har.length) return;
  const k = valjDragfordon(har, snoPaMarken(s) >= RESA.snoFran ? 'sno' : 'stig'), f = FORDON[k]!, g = ledigtTing(s, led, k)!;
  const fria = kand.filter(d => !sl.djur.includes(d.id));
  const d = [...fria].sort((a, b) => lassAv(f, b) * tamEg(b).snabbhet - lassAv(f, a) * tamEg(a).snabbhet || a.id - b.id)[0];
  if (!d) return;
  const a = hem.y * v.w + hem.x, b = mal.y * v.w + mal.x;
  const gang = Math.min(1, ...resenarer(s, sl).map(p => { const h = ridHast(s, sl, p.id); return h ? ryttarFart(h) : Math.min(1, personFart(s, p)); }));
  // tiden på vägen i dygn: varje rutas kostnad delat med den långsammaste farten där
  const tid = (fs: Fardsatt, fart: (i: number) => number) => {
    const vd = vagDygn(s, a, b, fs);
    if (!vd) return undefined;
    const kk = kostnader(vl, v, fs);
    let x = 0;
    for (let n = 1; n < vd.rutor.length; n++) x += kk[vd.rutor[n]!]! / Math.max(0.05, fart(vd.rutor[n]!));
    return x / VARLD.gangPerDygn;
  };
  // packdjuren: en packsadel var, de som bär mest först, tills det ryms
  let barA = pb.bar, fartA = gang, nA = 0;
  for (const x of [...fria].sort((p, q) => lassAv(FORDON.packsadel!, q) - lassAv(FORDON.packsadel!, p) || p.id - q.id)) {
    if (barA >= need - 1e-9 || nA >= sadlar) break;
    barA += lassAv(FORDON.packsadel!, x); fartA = Math.min(fartA, tamEg(x).snabbhet); nA++;
  }
  const tidA = tid(nA || sl.djur.length ? 'packdjur' : 'fots', () => fartA);
  const barB = pb.bar + lassAv(f, d), tidB = tid(f.fardsatt ?? 'vagn', i => Math.min(gang, vagnFartPa(s, f, d, i)));
  if (tidB === undefined) return; // vagnen kommer inte fram
  const rymsA = barA >= need - 1e-9 && tidA !== undefined, rymsB = barB >= need - 1e-9;
  if (rymsA && !rymsB) return;
  if (rymsA === rymsB && (rymsA ? tidB >= tidA! - 1e-9 : barB <= barA + 1e-9)) return;
  satsaDjur(s, sl, d.id);
  sl.fordon = [k]; sl.drag = { g: g.id, d: d.id, p: led.id };
  sl.insatser.push({ agare: g.agare === BYN ? 'by' : g.agare, sak: k, n: 1, varde: Math.round(grundvarde(k)), ting: g.id });
  count(s, 'resa med vagn');
}
export function borjaPacka(s: State, sl: Sallskap): boolean {
  const ut0 = sl.skede === 'samlas' ? utgang(s, sl) : undefined;
  if (!ut0) return false;
  const led = s.people.find(p => p.id === sl.ledare);
  valjPackdjur(s, sl, led);
  if (sl.skal === 'hamta') sl.nere = gruvPlanFor(s, sl)?.nere ?? RESMAL.hamta.stannar; // tiden nere (steg 11.10.1)
  const pb = packbehov(s, sl), ut = ut0;
  if (!pb) return false;
  let mat = pb.mat;
  for (const k of [...FOOD].sort((a, b) => amountOf(s, b) - amountOf(s, a))) {
    if (mat <= 0) break;
    const n = Math.min(mat, Math.floor(amountOf(s, k)));
    if (n > 0) { taIPackning(s, sl, k, n, led); mat -= n; }
  }
  const ho = Math.min(pb.foder, Math.floor(amountOf(s, 'torrgras')));
  if (ho > 0) taIPackning(s, sl, 'torrgras', ho, led);
  if (pb.talt > 0) taIPackning(s, sl, 'talt', pb.talt, led); // tälten (steg 11.11.1)
  if (pb.taltBehov > 0 && sl.by === s.varld?.huvud) (s.taltBehov = (s.taltBehov ?? []).filter(([t]) => t > s.now - DAY)).push([s.now, pb.taltBehov]); // det byn vill ha
  // varorna att sälja i den bärförmåga som blir över (steg 11.5.10)
  // det som lyfts med båda händerna bärs bara i händerna, aldrig på en packsadel (steg 11.11.3)
  const allt = { ...sl.pack }; for (const k in sl.att ?? {}) allt[k] = (allt[k] ?? 0) + sl.att![k]!; // det som packas räknas med
  let rum = pb.bar - packVikt(sl, allt), hander = sl.medl.length * RESA.hander;
  for (const [k, n] of sl.varor ?? []) {
    const lyft = !!SAKER[k]?.lyft, m = Math.min(n, Math.floor(amountOf(s, k) + 1e-9), Math.floor(Math.min(rum, lyft ? hander : Infinity) / Math.max(1e-9, viktOf(k))));
    if (m > 0) { taIPackning(s, sl, k, m, led); rum -= m * viktOf(k); if (lyft) hander -= m * viktOf(k); }
  }
  sl.skede = 'packar'; sl.ut = ut; sl.vid = []; sl.packar = s.now;
  return true;
}
// nivån Tillfälle (val.ts): resenären i ett sällskap som packar går till samlingsplatsen, och när sällskapet går, till kanten
export function resaVal(s: State, p: Person): { spot: { x: number; y: number }; dur: number; why: string; ref: number } | undefined {
  const sl = sallskapFor(s.varld, p.id);
  if (!sl?.ut || (sl.skede !== 'samlas' && sl.skede !== 'packar' && sl.skede !== 'gar') || ute(p)) return undefined;
  const namn = slMal(s, sl)?.namn ?? '';
  if (sl.skede === 'samlas') {
    const led = sl.ledare === p.id ? undefined : s.people.find(q => q.id === sl.ledare);
    return { spot: sl.ut.samla, dur: RESA.packTim * HOUR, why: led ? `Följer ${led.name} på en resa till ${namn}` : `Samlar till en resa till ${namn}`, ref: sl.id };
  }
  return sl.skede === 'packar'
    ? { spot: sl.ut.samla, dur: RESA.packTim * HOUR, why: `Packar för resan till ${namn}`, ref: sl.id }
    : { spot: sl.ut.kant, dur: RESA.packTim * HOUR, why: `Går ut på resan till ${namn}`, ref: sl.id };
}
// resenären är framme (MEDAN i steg.ts): vid samlingsplatsen väntar hen in de andra, vid kanten lämnar hen byn
export function resaSteg(s: State, p: Person, tk: Task) {
  const sl = s.varld?.sallskap?.find(x => x.id === tk.ref);
  if (!sl?.ut || !sl.medl.includes(p.id)) { tk.until = s.now; return; }
  if (sl.skede === 'samlas') { samlasSteg(s, sl, p); return; }
  if (sl.skede === 'packar') {
    if (hamtaVagn(s, sl, p, tk)) return;
    // det hen bar läggs i packningen, och finns mer att hämta går hen en vända till (MEDAN.resa i steg.ts hämtar först)
    if (tk.items) { iPackningen(sl, tk); if (resaHamtas(s, p, tk)) { tk.hamtad = undefined; sl.vid = sl.vid!.filter(id => id !== p.id); return; } }
    if (!sl.vid!.includes(p.id)) sl.vid!.push(p.id);
    const kvar = sl.medl.filter(id => { const q = s.people.find(x => x.id === id); return q && alive(q) && !ute(q) && !sl.vid!.includes(id); });
    if (kvar.length && !utanDeSomInteKom(s, sl, p, id => sl.vid!.includes(id), sl.packar ?? sl.borjan)) return;
    sl.skede = 'gar'; sl.t = s.now; sl.att = undefined; // alla är framme: djuren lastas och sällskapet går
    for (const d of tamdjurOf(s)) if (sl.djur.includes(d.id)) { d.x = sl.ut.samla.x; d.y = sl.ut.samla.y; }
    for (const id of sl.medl) { const q = s.people.find(x => x.id === id); if (q?.task?.act === 'resa') { q.task.tx = sl.ut.kant.x; q.task.ty = sl.ut.kant.y; q.task.phase = 'go'; } }
    return;
  }
  if (sl.skede !== 'gar' || Math.hypot(p.x - sl.ut.kant.x, p.y - sl.ut.kant.y) > 1.5) return;
  vagnUt(s, sl, p, tk);
  gaBort(s, p);
  const utanfor = (id: number) => { const q = s.people.find(x => x.id === id); return !q || !alive(q) || ute(q); };
  if (sl.medl.every(utanfor) || utanDeSomInteKom(s, sl, p, id => { const q = s.people.find(x => x.id === id); return !!q && alive(q) && ute(q); }, sl.t)) {
    if (sl.drag && !sl.drag.ting) utanVagn(s, sl); // vagnen kom aldrig med ut
    for (const d of s.tamdjur ?? []) if (sl.djur.includes(d.id) && d.dog === undefined) d.ute = s.now; // djuren följer med ut
    const hem = slHem(s, sl), v = varldMark(s);
    sl.skede = 'ute'; sl.t = s.now; sl.ruta = hem && v ? hem.y * v.w + hem.x : undefined; sl.pos = 0; sl.gang = 0;
    satVag(s, sl, true);
    dagbok(s, sl, 'ut', 'Gav sig av.');
    const mal = slMal(s, sl), vd = hem && v && mal ? vagDygn(s, hem.y * v.w + hem.x, mal.y * v.w + mal.x, fardsatt(sl)) : undefined;
    if (mal?.k === 'by' && mal.by !== undefined && vd) vackKrok.borja?.(s, mal.by, s.now, vd.dygn / Math.max(0.05, sallskapFart(s, sl))); // byn dit börjar väckas (vackt.ts, steg 11.13.8)
  }
}

// den som kör (steg 12.1.10) går först till vagnen, spänner för dragdjuret (taFordon, som i byn) och kör den till samlingsplatsen.
// Svarar true när hen är på väg. Finns vagnen eller djuret inte längre går resan utan vagn
function hamtaVagn(s: State, sl: Sallskap, p: Person, tk: Task) {
  const dr = sl.drag;
  if (!dr || dr.p !== p.id || tk.ting?.includes(dr.g)) return false;
  const g = tingOf(s).find(q => q.id === dr.g), d = tamdjurOf(s).find(q => q.id === dr.d);
  if (!g || !d || g.lass !== undefined || g.hos !== undefined || g.x === undefined || g.y === undefined) { utanVagn(s, sl); return false; }
  if (Math.hypot(p.x - g.x, p.y - g.y) > 1.5) { tk.tx = g.x; tk.ty = g.y; tk.phase = 'go'; sl.vid = sl.vid?.filter(id => id !== p.id); return true; }
  taFordon(s, p, tk, g.id, d.id);
  tk.tx = sl.ut!.samla.x; tk.ty = sl.ut!.samla.y; tk.phase = 'go';
  return true;
}
// vid kanten lämnar vagnen byn med den som kör: tinget följer sällskapet (sl.drag.ting) och finns inte i byn medan resan pågår
function vagnUt(s: State, sl: Sallskap, p: Person, tk: Task) {
  const dr = sl.drag;
  if (!dr || dr.p !== p.id || dr.ting || !tk.ting?.includes(dr.g)) return;
  const g = tingOf(s).find(q => q.id === dr.g);
  if (!g) return;
  tk.ting = tk.ting.filter(id => id !== g.id);
  s.ting = tingOf(s).filter(q => q !== g);
  g.lass = undefined; g.djur = undefined; g.x = g.y = undefined;
  dr.ting = g;
}
// resan går utan vagnen: djuret som skulle dra den följer med som de andra djuren, och vagnen räknas inte längre
function utanVagn(s: State, sl: Sallskap) {
  if (sl.drag?.ting && PA_VAGEN.includes(sl.skede)) count(s, 'resa vagn lämnad');
  else vagnTillbaka(s, sl); // den som skulle köra ställer den där hen står
  sl.insatser = sl.insatser.filter(x => !(x.ting !== undefined && x.ting === sl.drag?.g && !sl.drag.ting)); // den som aldrig kom med är ingen insats
  sl.drag = undefined; sl.fordon = [];
}
// hemma: vagnen ställs vid kanten där sällskapet kommer in, och bärs till förrådet som andra redskap (placeTools)
function vagnHem(s: State, sl: Sallskap, x: number, y: number) {
  const g = sl.drag?.ting;
  if (!g) return;
  g.x = Math.floor(x); g.y = Math.floor(y);
  tingOf(s).push(g);
  sl.drag!.ting = undefined;
}

// ---------- behoven på vägen (steg 11.5.6, Packningen i tal och Orken och tälten på resan) ----------
// Ute på vägen räknas sällskapet var tionde minut (en rad i TAKTER) med tre tal för hela gruppen. Mättnaden sjunker som en
// bybos, och när gruppen är hungrig äter den en portion per resenär ur packningen, den mat som håller kortast först. Vätskan
// sjunker som törsten; vid vatten dricker gruppen och fyller säckarna, och på en torr sträcka dricker den ur säckarna, en per
// resenär. Djuren äter hö där det inte går att beta, i hela saker. Orken sjunker i gång på dagen och stiger i nattens rast, och
// en natt utan tak drar ork efter kölden och regnet eller snön för den del av gruppen som inte ryms i tälten. Framme tär
// vädret inte. Låg ork sänker farten (orkFart, steg 11.5.7).
export const PA_VAGEN: readonly Skede[] = ['ute', 'framme', 'hemat'];
// väckningen av byn dit (vackt.ts sätter den, så att resa.ts inte importerar vackt.ts)
export const vackKrok: { borja?: (s: State, nr: number, t0: number, dygn: number) => unknown; framme?: (s: State, sl: Sallskap) => void; vander?: (s: State, sl: Sallskap, t: number) => void } = {}; // framme och vander: resenärerna kliver in i och ut ur den väckta byn (vacktgast.ts, steg 11.13.10)
const behovOf = (sl: Sallskap) => sl.behov ??= { matt: 1, vatska: 1, ork: 1, fulla: sl.pack.vattensack ?? 0, foder: 0 };
// rutan sällskapet är på (i världen), och om det går att beta och finns vatten där
function rutaNu(s: State, sl: Sallskap) {
  const v = varldMark(s), i = sl.ruta;
  if (!v || i === undefined) return { vatten: false, bete: true };
  const by = varldPlatserPa(s.varld!, i % v.w, Math.floor(i / v.w)).some(p => p.k === 'by');
  return { vatten: vattenVid(v, i) || by, bete: by || !!VARLDMARK[MARK_IDS[v.mark[i]]].bete };
}
// den mat i packningen som håller kortast
const kortastMat = (sl: Sallskap) => FOOD.filter(k => (sl.pack[k] ?? 0) >= 1).sort((a, b) => (SAKER[a]!.haller ?? 99) - (SAKER[b]!.haller ?? 99))[0];
export function tappa(sl: Sallskap, k: string, n: number) { sl.pack[k] = (sl.pack[k] ?? 0) - n; if (sl.pack[k]! <= 0) delete sl.pack[k]; }
// sällskapets fart efter orken (en faktor i Farten i tal)
export const orkFart = (sl: Sallskap, ork?: number) => {
  const o = ork ?? sl.behov?.ork ?? 1;
  return o >= RESA.orkFartFran ? 1 : RESA.orkFartMin + (1 - RESA.orkFartMin) * Math.max(0, o) / RESA.orkFartFran;
};
// tappet i ork per timme en natt utan tak, för hela gruppen (tälten skyddar fyra var)
export function nattTapp(s: State, sl: Sallskap, t = s.now) {
  const n = resenarer(s, sl).length, talt = Math.floor(sl.pack.talt ?? 0), utan = n ? Math.max(0, n - RESA.talt * talt) / n : 0;
  const v = vaderNu(s, t);
  return utan * (Math.max(0, RESA.koldFran - temperature(s, t)) * RESA.orkKold + v.nb * RESA.orkBlot);
}
// en bit av tiden (dt millisekunder, högst tio minuter) för ett sällskap på vägen
function behovBit(s: State, sl: Sallskap, t: number, dt: number) {
  if (sl.drag?.ting && !dragdjur(s, sl)) { dagbok(s, sl, 'tappad', `${SAKER[sl.fordon[0] ?? '']?.namn ?? 'Vagnen'} fick lämnas kvar vid leden när djuret som drog den inte längre fanns.`, t); utanVagn(s, sl); } // (steg 12.1.10)
  if (sl.skede !== 'framme' && isLight(t)) ga(s, sl, t, dt);
  else if (sl.skede === 'framme' && t - (sl.framme ?? t) >= stannarFor(sl) * 24 * HOUR) {
    if (sl.skal === 'hamta') { const k = gruvSakFor(s, sl); dagbok(s, sl, 'fram', `Kom upp ur gruvan med ${sl.pack[k] ?? 0} ${sakNamn(k).toLowerCase()}.`, t); }
    vackKrok.vander?.(s, sl, t); // ut ur den väckta byn, med det som ändrats (steg 11.13.10)
    if (sl.hjalp) hjalpSlut(s, sl, t);
    sl.skede = 'hemat'; satVag(s, sl, false); dagbok(s, sl, 'ut', 'Vänder hem.', t);
  }
  if (!PA_VAGEN.includes(sl.skede)) return;
  if (sl.skede !== 'framme') vagHandelser(s, sl, t, dt);
  if (!PA_VAGEN.includes(sl.skede)) return;
  if (sl.skede === 'framme' && sl.gaster) return; // i den väckta byn räknar byn kropparna och behoven (steg 11.13.10)
  kropparPaVagen(s, sl, t, dt);
  if (!PA_VAGEN.includes(sl.skede)) return;
  if (sl.skede === 'framme' && sl.skal === 'hamta') gruvBit(s, sl, t, dt);
  if (!PA_VAGEN.includes(sl.skede)) return;
  if (sl.skede !== 'framme') langsamma(s, sl, t);
  if (!PA_VAGEN.includes(sl.skede)) return;
  const b = behovOf(sl), tim = dt / HOUR, dag = isLight(t), framme = sl.skede === 'framme', r = rutaNu(s, sl), n = resenarer(s, sl).length; // de levande äter och dricker (steg 12.1.64)
  b.matt = clamp(b.matt - tim / KROPP.hungerTim, 0, 1);
  b.vatska = clamp(b.vatska - tim / TORST.tim * (dag ? 1 : TORST.somn), 0, 1);
  if (dag && !framme) b.ork -= tim * RESA.orkGang;
  else if (!dag) b.ork += tim * RESA.orkVila - (framme ? 0 : tim * nattTapp(s, sl, t));
  if (b.matt <= 0) b.ork -= tim * RESA.orkSvalt; // den som inte ätit orkar mindre (steg 11.5.15)
  b.ork = clamp(b.ork, 0, 1);
  // äta: en portion per resenär, den mat som håller kortast först
  while (b.matt < KROPP.hungrig) {
    let at = 0;
    for (let k = kortastMat(sl); k && at < n; k = kortastMat(sl)) { const m = Math.min(n - at, Math.floor(sl.pack[k]!)); tappa(sl, k, m); at += m; }
    if (!at) { count(s, 'resa utan mat'); if (t >= (sl.matNasta ?? 0)) { sl.matNasta = t + RESA.matOmTim * HOUR; matSlut(s, sl, t); if (kortastMat(sl)) continue; } break; }
    b.matt = clamp(b.matt + KROPP.mattar * at / n, 0, 1);
    count(s, 'resa måltid');
  }
  // dricka: vid vatten fylls säckarna, annars dricker gruppen ur dem, en per resenär
  if (r.vatten) { b.vatska = 1; b.fulla = Math.floor(sl.pack.vattensack ?? 0); }
  else if (b.vatska < TORST.torstig) {
    if (b.fulla >= n) { b.fulla -= n; b.vatska = 1; count(s, 'resa dricker ur säcken'); } else count(s, 'resa utan vatten');
  }
  // djuren äter hö där det inte går att beta
  if (!r.bete && sl.djur.length) {
    b.foder += sl.djur.length * RESA.foderPerDygn * tim / 24;
    while (b.foder >= 1 - 1e-9) { if ((sl.pack.torrgras ?? 0) < 1) { count(s, 'resa djur utan foder'); b.foder = 0; break; } tappa(sl, 'torrgras', 1); b.foder = Math.max(0, b.foder - 1); }
  }
}
// ---------- silvergruvan (steg 11.10.1, Flera samhällen: Silvergruvan i tal) ----------
// Hur länge sällskapet stannar nere väljs i packskedet: den tid (i hela timmar, högst SILVER.maxDygn dygn) som ger mest silver
// per dygn borta. Takten faller ju längre de är nere (kroppen tröttnar, silverMellan i gruva.ts), så en lång väg dit gör en
// längre tid nere värd det, där resan dit och hem räknas med och maten för hela tiden tar plats som silvret annars fått. n resenärer,
// rum = bärförmågan som blir över när vattnet och fodret är packade, vag = dygnen dit, marg = ledarens marginal
export function silverPlan(n: number, rum: number, vag: number, marg: number, gruva = 'silvergruva'): { nere: number; silver: number } | undefined {
  const g = GRUVSAK[gruva] ?? GRUVSAK.silvergruva, vs = viktOf(g.sak); // järngruvan ger malm (steg 12.2.13)
  let bast: { nere: number; silver: number; v: number } | undefined;
  for (let h = 1; h <= SILVER.maxDygn * 24; h++) {
    const dygn = 2 * vag + h / 24, mat = Math.ceil(n * RESA.matPerDygn * (h / 24 + vag) * marg - 1e-9); // maten för vägen dit är uppäten framme
    const silver = Math.min(Math.floor(n * g.mellan(0, h) + 1e-9), Math.floor((rum - mat) / vs + 1e-9));
    if (silver <= 0) continue;
    const v = silver / dygn;
    if (!bast || v > bast.v + 1e-9) bast = { nere: h / 24, silver, v };
  }
  return bast && { nere: bast.nere, silver: bast.silver };
}
// planen för ett sällskap som samlats: dess resenärer, bärförmåga och väg
export function gruvPlanFor(s: State, sl: Sallskap) {
  const nere = sl.nere;
  sl.nere = 0;
  const pb = packbehov(s, sl);
  sl.nere = nere;
  if (!pb) return undefined;
  const led = s.people.find(p => p.id === sl.ledare), vag = pb.dygn / 2;
  return silverPlan(sl.medl.length, pb.bar - pb.vatten * viktOf('vattensack') - pb.foder * viktOf('torrgras') - pb.talt * viktOf('talt'), vag, led ? marginal(led) : RESA.margMitt, gruvaFor(s, sl));
}
// sällskapets bärförmåga nu: resenärerna och djuren
const barNu = (s: State, sl: Sallskap) => resenarer(s, sl).reduce((a, p) => a + barResenar(s, p), 0) + barDjurAlla(s, sl);
// en bit nere i gruvan: varje resenär bryter silver i takten efter timmarna nere (silverMellan), och silvret läggs i packningen i hela saker så länge
// det ryms; när sällskapet bär fullt är tiden nere slut. Arbetet har en risk för olycka per person och timme (SILVER.olycka)
// en olycka (i gruvan eller på vägen, kodgenomgången fynd 185): en skada av en av tre sorter på en av kroppsdelarna, oftast lätt
function olycka(s: State, sl: Sallskap, p: Person, t: number, delar: Kroppsdel[], var_: string, stat: string, text: string) {
  const typer: SkadaTyp[] = ['krossar', 'benbrott', 'skarsar'];
  const k = typer[Math.floor(rnd(s, 'resa') * typer.length)]!, d = delar[Math.floor(rnd(s, 'resa') * delar.length)]!, u = rnd(s, 'resa');
  const dod = skada(s, p, d, k, RESA.olyckaMin + u * u * (RESA.olyckaMax - RESA.olyckaMin), 'olycka', var_);
  count(s, stat);
  dagbok(s, sl, 'skada', text, t);
  if (dod) dorPaVagen(s, sl, p, dod, t);
}
function gruvBit(s: State, sl: Sallskap, t: number, dt: number) {
  const folk = resenarer(s, sl), tim = dt / HOUR;
  for (const p of folk) {
    if (rnd(s, 'resa') >= 1 - Math.exp(-SILVER.olycka * tim)) continue;
    olycka(s, sl, p, t, [...BEN, ...FOTTER, ...ARMAR, ...HANDER, 'huvud'], 'i gruvan', 'gruva olycka', `${p.name} skadade sig i gruvan.`);
  }
  const n = resenarer(s, sl).length;
  if (!n) return;
  const h1 = (t - (sl.framme ?? t)) / HOUR;
  const gs = GRUVSAK[gruvaFor(s, sl)] ?? GRUVSAK.silvergruva; // silvret, eller malmen i järngruvan (steg 12.2.13)
  sl.silverArb = (sl.silverArb ?? 0) + n * gs.mellan(Math.max(0, h1 - tim), h1);
  // silvergruvan har sitt innehåll (steg 15.1.10): det sista bryts bara så långt det räcker
  const q = slMal(s, sl), finns = q ? Math.floor(silverKvar(q) + 1e-9) : Infinity;
  const m = Math.floor(sl.silverArb + 1e-9), rum = Math.floor((barNu(s, sl) - packVikt(sl)) / viktOf(gs.sak) + 1e-9), fick = Math.max(0, Math.min(m, rum, finns));
  if (fick > 0) { sl.pack[gs.sak] = (sl.pack[gs.sak] ?? 0) + fick; sl.silverArb -= fick; if (q && finns < Infinity) (q.inne ??= {}).silver = finns - fick; }
  if (m > rum) { sl.silverArb = 0; sl.nere = Math.min(stannarFor(sl), (t - (sl.framme ?? t)) / DAY); } // fullt: tiden nere är slut
  else if (q && finns - fick <= 0) { sl.silverArb = 0; sl.nere = Math.min(stannarFor(sl), (t - (sl.framme ?? t)) / DAY); gruvanTom(s, sl, q, folk); } // tom: sällskapet vänder hem
}
// gruvan är tom (steg 15.1.10): den tas bort ur världen, sällskapet vet att den är borta (byn får höra det när de kommer hem),
// och en ny gruva läggs på ett berg där ingen gruva tömts, så att världen åter har SILVER.gruvor gruvor
function gruvanTom(s: State, sl: Sallskap, q: VarldPlats, folk: Person[]) {
  const vl = s.varld, v = varldMark(s);
  if (!vl || !vl.platser?.includes(q)) return;
  if (v) (vl.tommaGruvor ??= []).push(q.y * v.w + q.x);
  taBortPlats(s, vl, q); vetBorta(s, folk, q.nr);
  if (v) laggGruvor(vl, v, s.now);
  dagbok(s, sl, 'fram', `Gruvan är tom. Det sista silvret är brutet.`); count(s, 'gruvaTom');
}
// på väg ut ur byn sitter ryttaren på hästen: hästen följer hen till kanten (steg 11.11.4)
export function ridBredvid(s: State, p: Person) {
  const sl = sallskapFor(s.varld, p.id);
  if (sl?.skede !== 'gar') return;
  const h = ridHast(s, sl, p.id);
  if (h) { h.x = p.x; h.y = p.y; }
}
// var tionde minut (TAKTER): sällskapen på vägen, i bitar om högst tio minuter (dt i millisekunder, som s.now)
// sällskapet som ingen längre går till (steg 12.1.8): alla har dött, sitter fångna eller ligger sjuka, och ingen har kommit
// till samlingsplatsen eller kanten på lika lång tid som ledaren väntar. Resan ställs in, och packningen går tillbaka
function inteIvag(s: State, sl: Sallskap) {
  const sedan = sl.skede === 'samlas' ? sl.borjan : sl.skede === 'packar' ? sl.packar ?? sl.borjan : sl.t;
  if (s.now - sedan < RESA.samlaSek * SEC) return;
  const paVag = (id: number) => { const q = s.people.find(x => x.id === id); return !!q && alive(q) && !q.fange && (ute(q) || !!sl.vid?.includes(id) || q.task?.act === 'resa' && q.task.ref === sl.id); };
  if (!sl.medl.some(paVag)) stallIn(s, sl);
}
export function resaBehov(s: State, dt: number) {
  const vl = s.varld;
  if (vl?.gommor) delete vl.gommor; // (en äldre sparning: gömmorna är platser i världen sedan steg 12.1.9)
  for (const sl of sallskapNu(s.varld)) {
    if (!PA_VAGEN.includes(sl.skede)) { inteIvag(s, sl); continue; }
    SAKNADKROK.koll?.(s, sl); // den som inte kommit hem i tid blir saknad (steg 11.8.6, vilsegang.ts)
    if (!resenarer(s, sl).length) { forsvunnet(s, sl); continue; } // alla är döda: sällskapet står, och efter en tid räknas det som försvunnet (steg 11.5.18)
    for (let gjort = 0; gjort < dt - 1e-9;) { const d = Math.min(600 * SEC, dt - gjort); behovBit(s, sl, s.now - dt + gjort + d, d); gjort += d; }
  }
}

// ---------- farten och gången längs leden (steg 11.5.7, Farten i tal) ----------
// Sällskapets fart är den långsammaste medlemmens (en frisk vuxen 1, barn och gamla 0,75, skadade ben ner till 0,5, ett djur
// sin egen) gånger lastens, årstidens (snön) och orkens. Ledens fart ligger i rutans kostnad (vagval.ts), så en stig går
// fortare än obanad mark. Lasten bromsar bara på resan, inte i byn. Sällskapet går i dagsljuset, ruta för ruta längs vägen,
// och trampar leden (leder.ts) där det går; framme stannar det så många dygn som skälet säger och går sedan hem.
export const resenarer = (s: State, sl: Sallskap) => sl.medl.map(id => s.people.find(p => p.id === id)).filter((p): p is Person => !!p && alive(p) && !p.dodVag); // den som dött på vägen är inte med (steg 11.5.18)
export function personFart(s: State, p: Person) {
  const a = ageOf(p, s.now), ben = Math.max(0, ...GADELAR.map(d => clamp(delFel(p, d), 0, 1)));
  return Math.min(a < ALDER.vuxen ? RESA.fartBarn : a >= ALDER.gammal ? RESA.fartGammal : 1, 1 - (1 - RESA.fartBen) * ben);
}
// vad en sak väger i packningen: maten en per portion, som i packbehov, annars sakens vikt (steg 12.1.250)
export const packViktAv = (k: string) => FOOD.includes(k) ? 1 : viktOf(k);
// packningens vikt
export const packVikt = (sl: Sallskap, pack = sl.pack) => Object.entries(pack).reduce((a, [k, n]) => a + n * packViktAv(k), 0);
// en utväg som prövas (UTVAGAR, steg 11.5.17): de som bärs, den som lämnas, packningen och orken som de blir om den väljs
export interface FartOm { buren?: [number, BurenSatt][]; utan?: number; pack?: Record<string, number>; ork?: number }
// bärförmågan och lasten med det som prövas: packsadlarna i den prövade packningen avgör hur många djur som bär (steg 12.1.250)
export function lastLage(s: State, sl: Sallskap, om: FartOm = {}) {
  const buren = om.buren ?? sl.buren ?? [], bars = new Set(buren.map(b => b[0])), bar_ = buren.filter(b => b[1] === 'bar').length;
  const folk = resenarer(s, sl).filter(p => p.id !== om.utan && !bars.has(p.id));
  // den som bärs bär inget; en bår tar två bärares händer, och den som åker på djuret eller vagnen väger som packning
  const bar = folk.reduce((a, p) => a + barResenar(s, p), 0) - 2 * RESA.hander * bar_ + barDjurAlla(s, sl, om.pack ?? sl.pack) + vagnLass(s, sl);
  const vikt = packVikt(sl, om.pack ?? sl.pack) + RESA.personVikt * (buren.length - bar_);
  return { bar, vikt };
}
export function lastFart(s: State, sl: Sallskap, om: FartOm = {}) {
  const { bar, vikt } = lastLage(s, sl, om);
  const x = bar > 0 ? vikt / bar : 1;
  return x <= RESA.lastFran ? 1 : Math.max(RESA.lastMin, 1 - (1 - RESA.lastMin) * (x - RESA.lastFran) / (1 - RESA.lastFran));
}
export function sallskapFart(s: State, sl: Sallskap, om: FartOm = {}) {
  const buren = om.buren ?? sl.buren ?? [], bars = new Set(buren.map(b => b[0]));
  const rid = ridna(sl), folk = resenarer(s, sl).filter(p => p.id !== om.utan && !bars.has(p.id)), djur = (s.tamdjur ?? []).filter(d => sl.djur.includes(d.id) && d.dog === undefined && !rid.has(d.id));
  // den långsammaste: den som går (högst gångfarten), ryttaren i hästens fart (steg 11.11.4) och packdjuret i sin egen snabbhet (steg 11.11.3)
  const farter = [...folk.map(p => { const h = ridHast(s, sl, p.id); return h ? ryttarFart(h) : Math.min(1, personFart(s, p)); }), ...djur.map(d => tamEg(d).snabbhet)];
  const dd = dragdjur(s, sl), f = vagnRad(sl);
  if (dd && f && sl.ruta !== undefined) farter.push(vagnFartPa(s, f, dd, sl.ruta)); // vagnen i sin fart på rutans underlag (steg 12.1.10)
  const lang = farter.length ? Math.min(...farter) : 1;
  return lang * (buren.some(b => b[1] === 'bar') ? RESA.barFart : 1) * lastFart(s, sl, om) * (snoPaMarken(s) >= RESA.snoFran ? RESA.snoFart : 1) * orkFart(sl, om.ork);
}
// vägen bort till målet, eller hem igen från rutan där sällskapet står: målet kan vara borta och glömt (steg 12.1.246)
function satVag(s: State, sl: Sallskap, bort: boolean) {
  const vl = s.varld, v = varldMark(s), hem = slHem(s, sl), mal = slMal(s, sl);
  if (!vl || !v || !hem) return;
  const a = hem.y * v.w + hem.x, b = bort ? (mal ? mal.y * v.w + mal.x : undefined) : sl.ruta ?? (mal ? mal.y * v.w + mal.x : undefined);
  if (b === undefined) return;
  const vag = vagMellan(vl, v, bort ? a : b, bort ? b : a, fardsatt(sl), s.now);
  sl.vag = vag ? { fran: vag.fran, till: vag.till, steg: vag.steg } : undefined; sl.pos = 0; sl.gang = 0; sl.ruta = bort ? a : b;
}
export const vagenRutor = (s: State, sl: Sallskap) => { const v = varldMark(s); return v && sl.vag ? vagRutor(sl.vag as VarldVag, v.w) : []; };
// en bit av dagen i gång (dt millisekunder): framåt längs vägen i rutornas kostnad
function ga(s: State, sl: Sallskap, t: number, dt: number) {
  const vl = s.varld, v = varldMark(s), rutor = vagenRutor(s, sl);
  if (!vl || !v || !rutor.length) return;
  if (sl.forlorat && sl.forlorat > 0) { const d = Math.min(dt, sl.forlorat * HOUR); sl.forlorat = Math.max(0, sl.forlorat - d / HOUR); dt -= d; if (dt <= 0) return; } // vilse eller väntar ut ett oväder (steg 11.5.14)
  const fs = fardsatt(sl), k = kostnader(vl, v, fs), tyngd = sallskapTyngd(resenarer(s, sl).length, sl.djur.length - (sl.drag ? 1 : 0), sl.drag ? 1 : 0);
  sl.gang = (sl.gang ?? 0) + VARLD.gangPerDygn / RESA.dagTim * sallskapFart(s, sl) * dt / HOUR;
  let pos = sl.pos ?? 0;
  // isen har gått (steg 11.11.8): den som står på land och har vatten framför sig tar en ny väg därifrån; den som är ute på isen
  // har hunnit över och går vidare som på slätt
  if (pos < rutor.length - 1 && !isFinite(k[rutor[pos + 1]]) && isFinite(k[rutor[pos]])) {
    const vag = vagMellan(vl, v, rutor[pos], rutor[rutor.length - 1], fs, t);
    const r2 = vag && vagRutor(vag, v.w);
    if (vag && r2!.length > 1 && isFinite(k[r2![1]])) { sl.vag = { fran: vag.fran, till: vag.till, steg: vag.steg }; sl.pos = 0; count(s, 'resa isen gick'); return ga(s, sl, t, 0); }
  }
  const kost = (i: number) => isFinite(k[i]) ? k[i] : 1;
  while (pos < rutor.length - 1 && sl.gang >= kost(rutor[pos + 1]) - 1e-9) {
    sl.gang -= kost(rutor[pos + 1]);
    trampa(vl, [rutor[pos], rutor[pos + 1]], tyngd, t);
    pos++; sl.ruta = rutor[pos]; (sl.spar ??= []).push(sl.ruta); // rutorna sedan sist, för mötena (steg 11.6.12)
  }
  sl.pos = pos;
  if (pos < rutor.length - 1) return;
  sl.gang = 0;
  if (sl.skede === 'ute') { sl.skede = 'framme'; sl.framme = t; count(s, 'resa framme'); radBesok(s, sl, t); vackKrok.framme?.(s, sl); }
  else if (sl.skede === 'hemat') hemkomst(s, sl, t);
}
// sällskapet är hemma: resenärerna kommer in vid kanten de gick ut från, och djuren med dem
export function hemkomst(s: State, sl: Sallskap, t: number) {
  const in_ = sl.ut?.kant ?? bynsMitt(s);
  for (const p of resenarer(s, sl)) if (ute(p)) { const borta = t - (p.ute ?? t); kommHem(s, p, in_.x, in_.y); tanke(p, 'komHem', t); upplev(s, p, 'resaBarn'); if (borta >= RYKTE.berestDygn * DAY) handelse(s, p, 'reste'); } // (steg 12.1.131)
  for (const d of s.tamdjur ?? []) if (sl.djur.includes(d.id) && d.ute !== undefined) { delete d.ute; d.x = in_.x; d.y = in_.y; }
  vagnHem(s, sl, in_.x, in_.y);
  delaHemma(s, sl);
  beskedet(s, sl); // den som dog på vägen: arvet delas nu (steg 11.5.18)
  if (sl.borta) vetBorta(s, living(s).filter(p => !p.gast), sl.mal); // nyheten att platsen är borta når byn (steg 12.1.146)
  sl.skede = 'hemma'; sl.t = t;
  count(s, 'resa hemma');
  redogorelse(s, sl, t);
  HEMKROK.f?.(s, sl, t); // den som förlorat något på vägen utlyser (steg 11.8.11, utlysa.ts)
}
export const HEMKROK: { f?: (s: State, sl: Sallskap, t: number) => void } = {};
// budbäraren (steg 11.8.13, utlysa.ts): vilket uppdrag p vill bära till byn rad och värdet, och vad som sker framme
export const BUDBARKROK: { f?: (s: State, p: Person, rad: number) => { id: number; varde: number } | undefined; fram?: (s: State, sl: Sallskap, r: VarldRad, t: number) => void } = {};

// sändebudet framme (steg 11.6.23): beskedet verkar hos byn, och ett vänligt bud lämnar det det bär (utom det som behövs för
// vägen och maten) som gåva, i hela saker i byns förråd; byns syn går upp efter gåvans värde
function budFram(s: State, sl: Sallskap, r: import('./radtal').VarldRad, t: number) {
  const vl = s.varld!;
  if (!sl.ton || vl.huvud === undefined) return;
  byHandelse(vl, sl.ton, vl.huvud, r.nr);
  let varde = 0;
  const gav: string[] = [];
  for (const sak of sl.ton === 'besked' ? Object.keys(sl.pack).sort() : []) {
    if (!saljbar(sak)) continue;
    const n = Math.floor(sl.pack[sak]!);
    if (n <= 0) continue;
    tappa(sl, sak, n); radTar(r, sak, n); varde += n * grundvarde(sak); gav.push(antal(n, sak));
  }
  if (varde > 0) byHandelse(vl, 'gava', vl.huvud, r.nr, gavaRel(varde) / BYREL.gava);
  const fran = sl.av === 'kyrkan' ? 'kyrkans' : 'byns';
  const text = `Bar ${fran} ${sl.ton === 'besked' ? 'vänliga' : 'ovänliga'} besked till ${r.namn}${gav.length ? ` och gav ${och(gav)}` : ''}.`;
  dagbok(s, sl, 'besked', text, t);
  kronika(s, `Ett sändebud ${text.charAt(0).toLowerCase()}${text.slice(1)}`, 'sandebud');
  count(s, sl.ton === 'besked' ? 'sandebud ut vänligt' : 'sandebud ut ovänligt');
  sl.ton = undefined; // beskedet är framfört
}
// turnén framme (steg 11.8.18): ledaren uppträder eller tävlar, grannbyn tycker bättre om byn (BYHANDELSER.turne), minns hen en
// tid (VarldRad.turne) och ger en gåva i hela silver ur det den har, så mycket hen är värd (turneKraft)
function turneFram(s: State, sl: Sallskap, r: import('./radtal').VarldRad, t: number) {
  const vl = s.varld!, led = resenarer(s, sl).find(p => p.id === sl.ledare);
  if (!led || vl.huvud === undefined) return;
  byHandelse(vl, 'turne', vl.huvud, r.nr);
  r.turne = { id: led.id, namn: led.name, t };
  const n = Math.max(0, Math.min(Math.floor(r.tal.silver), Math.floor(RESA.turneGava * turneKraft(s, led) / Math.max(1e-9, grundvarde('silver')) + 1e-9)));
  if (n > 0) { radTar(r, 'silver', -n); sl.pack.silver = (sl.pack.silver ?? 0) + n; }
  const vad = led.skill.skaldskap / 20 >= (led.bedrift?.h === 'tavling' ? 1 : 0) ? 'uppträdde' : 'tävlade';
  const text = `${led.name} ${vad} i ${r.namn}${n > 0 ? ` och fick ${antal(n, 'silver')} i gåva` : ''}.`;
  dagbok(s, sl, 'turne', text, t);
  sl.turne = n;
  count(s, 'turne framme');
}
// ---------- besöket hos en rad (steg 11.5.8, Besöket hos en rad) ----------
// Sällskapet som kommer fram: platsen blir besökt för huvudbyns rad och för var och en av resenärerna. Är platsen en by med
// folk säljer sällskapet det det har med sig att byta (allt utom maten och det som behövs för vägen) mot byns silver, efter
// byns pris, och köper mat för vägen hem för silvret, aldrig mer än byns överskott. Byns tal ändras i hela saker: silvret,
// maten och rikedomen. Resenärerna möter byns folk, och byn minns dem som mött huvudbyn (de fasta personerna, rollen mott).
export function radBesok(s: State, sl: Sallskap, t: number) {
  const vl = s.varld, plats = slMal(s, sl);
  if (!vl || !plats) return;
  const folk = resenarer(s, sl);
  if (!varldPlatsNr(vl, sl.mal)) { // platsen är borta (steg 12.1.146): de ser det, glömmer den och berättar det hemma
    vetBorta(s, folk, sl.mal, t); sl.borta = 1;
    dagbok(s, sl, 'fram', `Kom fram till platsen där ${plats.namn} låg, men där fanns ingen längre.`, t);
    return;
  }
  for (const p of folk) larOrt(s, p, sl.mal, O_BESOKT, 1, { t });
  const r = plats.by !== undefined ? radNr(vl, plats.by) : undefined;
  dagbok(s, sl, 'fram', `Kom fram till ${plats.namn}.`, t);
  if (plats.by === undefined) for (const p of folk) tanke(p, 'sagStort', t); // ett landmärke (steg 12.1.131)
  if (sl.skal === 'uppdrag') uppdragFram(s, sl, t);
  if (sl.skal === 'hamta') dagbok(s, sl, 'fram', `Gick ner i gruvan och stannade där i ${spelTid(stannarFor(sl) * DAY)}.`, t);
  const ruin = ruinRad(vl, sl.mal);
  if (ruin) for (const p of folk) saFynd(s, vl, p, ruin, sl.mal, t); // de som sett ruinen minns det som finns kvar (steg 11.8.8)
  if (plats.k === 'gravhog') for (const p of folk) FYNDSETT.grav?.(s, p, sl.mal, t); // och gravgåvorna i högen (steg 11.13.28)
  if (plats.k === 'gomma') for (const p of folk) FYNDSETT.gomma?.(s, p, sl.mal, t); // och det som ligger i gömman (steg 12.1.9)
  if (!r || !BYSORTER[r.sort].folk || r.tal.folk <= 0) return;
  const k = r.syn;
  if (sl.skal === 'sandebud') budFram(s, sl, r, t);
  if (sl.skal === 'turne') turneFram(s, sl, r, t);
  if (sl.skal === 'budbarare') BUDBARKROK.fram?.(s, sl, r, t);
  // sälja: varorna mot byns silver
  let fick = 0, salda = 0;
  for (const sak of Object.keys(sl.pack).sort()) {
    if (!saljbar(sak)) continue;
    const per = grundvarde(sak) * radPaslag(s, r, sak);
    const m = Math.min(Math.floor(sl.pack[sak]!), Math.floor(r.tal.silver / per));
    if (m <= 0) continue;
    const pay = Math.floor(m * per);
    fick += pay; salda += m; tappa(sl, sak, m);
    radTar(r, sak, m); radTar(r, 'silver', -pay);
    radPrisAndras(s, r, sak, pay, -1);
  }
  if (fick) { sl.pack.silver = (sl.pack.silver ?? 0) + fick; dagbok(s, sl, 'handel', `Sålde ${saker(salda)} i ${r.namn} för ${antal(fick, 'silver')}.`, t); count(s, 'resa sålde', salda); }
  // köpa: det byn har brist på, om det fortfarande är billigare här än hemma, så mycket byn har och silvret räcker till (steg 11.6.11)
  let kopta = 0, gav = 0;
  for (const [sak, n] of sl.kop ?? []) {
    const g = gruppAv(sak), per = grundvarde(sak) * radPaslag(s, r, sak);
    if (!g || g === 'mat' || radPaslag(s, r, sak) >= byPaslag(s, sak)) continue;
    let m = Math.min(n, Math.floor(radHar(r, g) * RESA.matKvar / grundvarde(sak) + 1e-9), Math.floor((sl.pack.silver ?? 0) / per + 1e-9));
    while (m > 0 && Math.ceil(m * per - 1e-9) > (sl.pack.silver ?? 0)) m--;
    if (m <= 0) continue;
    const pay = Math.ceil(m * per - 1e-9);
    tappa(sl, 'silver', pay); sl.pack[sak] = (sl.pack[sak] ?? 0) + m;
    radTar(r, sak, -m); radTar(r, 'silver', pay);
    radPrisAndras(s, r, sak, pay, 1);
    kopta += m; gav += pay;
  }
  if (kopta) { dagbok(s, sl, 'handel', `Köpte ${saker(kopta)} i ${r.namn} för ${antal(gav, 'silver')} att ta hem.`, t); count(s, 'resa köpte hem', kopta); }
  // köpa: mat för vägen hem
  const v = varldMark(s), hem = slHem(s, sl), vd = v && hem ? vagDygn(s, plats.y * v.w + plats.x, hem.y * v.w + hem.x) : undefined;
  const led = folk.find(p => p.id === sl.ledare) ?? folk[0];
  const behov = vd ? Math.ceil(folk.length * RESA.matPerDygn * (vd.dygn + stannarFor(sl)) * (led ? marginal(led) : RESA.margMitt) - 1e-9) : 0;
  const har = FOOD.reduce((a, f) => a + Math.floor(sl.pack[f] ?? 0), 0), kop = FOOD.filter(f => grundvarde(f) > 0).sort((a, b) => (SAKER[b]!.haller ?? 0) - (SAKER[a]!.haller ?? 0))[0];
  if (kop && behov > har) {
    const per = grundvarde(kop) * radPaslag(s, r, kop);
    let m = Math.min(behov - har, Math.floor(r.tal.mat * RESA.matKvar), Math.floor((sl.pack.silver ?? 0) / per));
    while (m > 0 && Math.ceil(m * per) > (sl.pack.silver ?? 0)) m--;
    if (m > 0) {
      const pay = Math.ceil(m * per);
      tappa(sl, 'silver', pay); sl.pack[kop] = (sl.pack[kop] ?? 0) + m;
      radTar(r, kop, -m); radTar(r, 'silver', pay);
      radPrisAndras(s, r, kop, pay, 1);
      dagbok(s, sl, 'handel', `Köpte ${antal(m, kop)} för ${antal(pay, 'silver')} till vägen hem.`, t); count(s, 'resa köpte', m);
    }
  }
  // mötet: byn minns resenärerna som mött huvudbyn, och inställningen blir lite bättre
  const mott = r.fasta.filter(f => f.roll === 'mott').length;
  if (mott < RESA.mott) {
    const kon = rnd(s, 'resa') < 0.5 ? 'm' : 'k';
    r.fasta.push({ namn: makeName(s, kon, 'resa'), kon, fodd: Math.round(t - (18 + rnd(s, 'resa') * 30) * DAY), roll: 'mott' });
  }
  if (k) k.inst = Math.min(100, k.inst + RESA.besokInst);
  for (const g of motkrok) g(s, r.nr, folk);
  dagbok(s, sl, 'mote', `Mötte folket i ${r.namn}.`, t); count(s, 'resa besök');
}

// det som händer när resenärerna möter folket i grannbyn (foretagsrykte.ts)
export const motkrok: ((s: State, nr: number, folk: Person[]) => void)[] = [];

// ---------- hemkomsten och andelarna (steg 11.5.9, Andelarna i tal) ----------
// Hemma går det som finns kvar av insatserna tillbaka till sina ägare (av en sak som flera satsat delat efter hur mycket var och
// en satsade, i hela saker), och ett djur som lever går tillbaka; ett djur som dött ersätts inte. Varje delägare får en fordran:
// värdet av det hen satsade som gått åt, plus hens del av vinsten (bytets värde minus det som gått åt). Andelarna är en per
// resenär och en per RESA.andelVarde i värde för varje insats. Bytet (det som är kvar i packningen) delas i hela saker, den mest
// värda först till den som har störst fordran kvar.
export type Agare = number | 'by';
export interface Andelar { tillbaka: [Agare, string, number][]; byte: [Agare, string, number][]; gatt: number; varde: number; vinst: number; fordran: [Agare, number][]; andelar: [Agare, number][] }
export function delaAndelar(insatser: Insats[], resenarer: number[], kvar: Record<string, number>, djurLever: (id: number) => boolean, varde: (k: string) => number = grundvarde, tingKvar: (id: number) => boolean = () => true): Andelar {
  const pack: Record<string, number> = {};
  for (const k in kvar) { const n = Math.floor(kvar[k]! + 1e-9); if (n > 0) pack[k] = n; }
  const tillbaka: [Agare, string, number][] = [], gattPer = new Map<Agare, number>(), andel = new Map<Agare, number>();
  const lagg = <K>(m: Map<K, number>, k: K, v: number) => m.set(k, (m.get(k) ?? 0) + v);
  for (const id of resenarer) lagg(andel, id as Agare, 1);
  for (const x of insatser) { const a = Math.floor(x.varde / RESA.andelVarde); if (a > 0) lagg(andel, x.agare, a); }
  // djuren: det levande går tillbaka, det döda ersätts inte
  for (const x of insatser) if (x.djur !== undefined && djurLever(x.djur)) tillbaka.push([x.agare, x.sak, 1]);
  // vagnen (steg 12.1.10): den som kom hem står i byn igen, och den som blev kvar på vägen har gått åt
  for (const x of insatser) if (x.ting !== undefined && !tingKvar(x.ting)) lagg(gattPer, x.agare, x.varde);
  // sakerna: det som är kvar av varje sak delas efter insatserna, i hela saker (störst rest först)
  const saker = [...new Set(insatser.filter(x => x.djur === undefined && x.ting === undefined).map(x => x.sak))].sort();
  for (const sak of saker) {
    const ins = insatser.filter(x => x.djur === undefined && x.ting === undefined && x.sak === sak), N = ins.reduce((a, x) => a + x.n, 0), har = Math.min(pack[sak] ?? 0, N);
    const del = ins.map(x => ({ x, n: Math.floor(har * x.n / N), rest: har * x.n / N - Math.floor(har * x.n / N) }));
    let over = har - del.reduce((a, d) => a + d.n, 0);
    for (const d of [...del].sort((a, b) => b.rest - a.rest)) { if (over <= 0) break; d.n++; over--; }
    for (const d of del) {
      if (d.n > 0) tillbaka.push([d.x.agare, sak, d.n]);
      lagg(gattPer, d.x.agare, (d.x.n - d.n) * d.x.varde / d.x.n);
    }
    pack[sak] = (pack[sak] ?? 0) - har; if (pack[sak]! <= 0) delete pack[sak];
  }
  const gatt = [...gattPer.values()].reduce((a, v) => a + v, 0);
  const vardeByte = Object.entries(pack).reduce((a, [k, n]) => a + n * varde(k), 0), vinst = vardeByte - gatt;
  const summa = [...andel.values()].reduce((a, v) => a + v, 0);
  const fordran = new Map<Agare, number>();
  for (const a of new Set<Agare>([...gattPer.keys(), ...andel.keys()])) fordran.set(a, (gattPer.get(a) ?? 0) + (summa ? vinst * (andel.get(a) ?? 0) / summa : 0));
  // bytet: den mest värda saken först till den som har störst fordran kvar
  const kvarF = new Map(fordran), byte = new Map<string, number>();
  const ordning = [...fordran.keys()];
  for (const k of Object.keys(pack).sort((a, b) => varde(b) - varde(a) || (a < b ? -1 : 1))) {
    for (let n = 0; n < pack[k]!; n++) {
      let bast = ordning[0]!;
      for (const a of ordning) if ((kvarF.get(a) ?? 0) > (kvarF.get(bast) ?? 0) + 1e-9) bast = a;
      if (bast === undefined) break;
      kvarF.set(bast, (kvarF.get(bast) ?? 0) - varde(k));
      const nyckel = JSON.stringify([bast, k]); byte.set(nyckel, (byte.get(nyckel) ?? 0) + 1);
    }
  }
  const r2 = (x: number) => Math.round(x * 100) / 100;
  return {
    tillbaka, byte: [...byte].map(([k, n]) => { const [a, sak] = JSON.parse(k) as [Agare, string]; return [a, sak, n] as [Agare, string, number]; }),
    gatt: r2(gatt), varde: r2(vardeByte), vinst: r2(vinst), fordran: [...fordran].map(([a, v]) => [a, r2(v)] as [Agare, number]), andelar: [...andel],
  };
}
// hemma: insatserna tillbaka och bytet delat, i förrådet hos ägarna (byns det som är byns, och den döda ägarens går till byn)
function delaHemma(s: State, sl: Sallskap) {
  const lever = (id: number) => (s.tamdjur ?? []).some(d => d.id === id && d.dog === undefined);
  const a = delaAndelar(sl.insatser, sl.medl, sl.pack, lever, grundvarde, id => tingOf(s).some(g => g.id === id));
  const agareI = (x: Agare) => { if (x === 'by') return undefined; const p = s.people.find(q => q.id === x); return p && alive(p) ? x : undefined; };
  const djurArt = new Set(sl.insatser.filter(x => x.djur !== undefined).map(x => x.sak)); // djuret går själv hem (hemkomst)
  for (const [ag, sak, n] of a.tillbaka) if (!djurArt.has(sak)) laggIn(s, sak, n, agareI(ag));
  for (const [ag, sak, n] of a.byte) laggIn(s, sak, n, agareI(ag));
  sl.pack = {}; sl.delning = a;
  count(s, 'resa bytets värde', Math.round(a.varde));
  if (sl.skal === 'hamta') count(s, 'silver hämtat', a.byte.reduce((x, [, sak, n]) => x + (sak === 'silver' ? n : 0), 0)); // silvret ur gruvan (steg 11.10.1)
  dagbok(s, sl, 'hem', `Hemma: bytet var värt ${antal(a.varde / grundvarde('silver'), 'silver')}, och det som gått åt ${antal(a.gatt / grundvarde('silver'), 'silver')}.`);
}

// ---------- att samla till en resa (steg 11.5.10, Flera samhällen: Sällskapet) ----------
// Raden samla till resa i ARBETEN (Förbättra, val.ts) väger resan mot byns andra arbeten. Personen väljer det mål hen tror mest
// om: en by med folk där de varor byn har över sina förrådsmål tros betala bättre än hemma (handel), eller en plats hen bara
// hört rykten om (se). Värdet är vinsten byn tror på (det trodda priset hos byns klan minus handelspriset hemma, ett okänt pris
// räknas som 1) eller nyfikenheten, delat med dygnen borta och resenärerna, gånger lusten (nyfikenhet och mod, färdigheten
// Handel på en handelsresa), gånger hur väl förråden hemma räcker resan ut (bristen hemma), och ledens fara drar ner det för
// den försiktiga. Dygnen är den sparade vägens, annars fågelvägen gånger omvag; ingen väg räknas i valet.
const ingenDod = (s: State, a: number | 'by') => { if (a === 'by') return undefined; const p = s.people.find(q => q.id === a); return p && alive(p) ? a : undefined; }; // den dödes del går till byn
// resan ställs in: den som kör ställer vagnen där hen står (eller vid kanten, om den redan var ute), och den bärs till förrådet
function vagnTillbaka(s: State, sl: Sallskap) {
  const dr = sl.drag, kor = dr && s.people.find(q => q.id === dr.p);
  if (dr?.ting && sl.ut) vagnHem(s, sl, sl.ut.kant.x, sl.ut.kant.y);
  else if (dr && kor?.task?.ting?.includes(dr.g)) {
    kor.task.ting = kor.task.ting.filter(id => id !== dr.g);
    const g = tingOf(s).find(q => q.id === dr.g);
    if (g) { g.lass = undefined; g.djur = undefined; g.x = Math.floor(kor.x); g.y = Math.floor(kor.y); }
  }
}
export function stallIn(s: State, sl: Sallskap) {
  const vl = s.varld;
  // det som packats går tillbaka till ägarna (steg 12.1.8): ingen resa ställs in med packningen kvar på samlingsplatsen
  // (det läggs på samlingsplatsen, där det bärs in som annat som ligger på marken)
  vagnTillbaka(s, sl);
  for (const x of sl.insatser) if (x.djur === undefined && x.ting === undefined && (sl.pack[x.sak] ?? 0) >= 1) {
    const n = Math.min(x.n, Math.floor(sl.pack[x.sak]! + 1e-9)), o = ingenDod(s, x.agare);
    if (sl.ut) dropLoad(s, { act: 'resa', items: { [x.sak]: n }, ag: { [x.sak]: { [o ?? BYN]: n } } } as unknown as Task, sl.ut.samla.x, sl.ut.samla.y, o ?? BYN);
    else laggIn(s, x.sak, n, o);
    tappa(sl, x.sak, n);
  }
  if (vl?.sallskap) vl.sallskap = vl.sallskap.filter(x => x !== sl);
  for (const id of sl.medl) { const q = s.people.find(x => x.id === id); if (q?.task?.act === 'resa' && q.task.ref === sl.id) q.task.until = s.now; }
  count(s, 'resa inställd');
}
// varorna byn har över sina förrådsmål som tros betala bättre i klanens by, så mycket en resenär bär, mest vinst per vikt först
// (sälja), och det byn har brist på som personen tror är billigare där än hemma, efter ett prisminne (köpa, steg 11.6.11): för silvret byn har och det
// försäljningen tros ge, så mycket sällskapet bär hem, mest vinst per vikt först. Silvret till köpen tas med bland varorna.
export function resaVaror(s: State, p: Person, klan: number | undefined): { varor: [string, number][]; vinst: number; kop: [string, number][] } {
  const bar = barResenar(s, p), varor: [string, number][] = [];
  let vikt = 0, vinst = 0;
  const rad = (Object.keys(MATERIALMAL) as (keyof typeof MATERIALMAL)[]).filter(saljbar)
    .map(k => ({ k, d: grundvarde(k) * ((klan === undefined ? 1 : trorPris(p, klan, k)) - handelsPris(s, k)), n: Math.floor(amountOf(s, k) - villHaAv(s, k) + 1e-9) }))
    .filter(x => x.d > 1e-9 && x.n > 0).sort((a, b) => b.d / viktOf(b.k) - a.d / viktOf(a.k) || (a.k < b.k ? -1 : 1));
  for (const x of rad) {
    const m = Math.min(x.n, Math.floor((bar - vikt) / Math.max(1e-9, viktOf(x.k)) + 1e-9));
    if (m <= 0) continue;
    varor.push([x.k, m]); vikt += m * viktOf(x.k); vinst += m * x.d;
  }
  // köpa: det byn har under sina förrådsmål, där klanens pris tros vara lägre än byns eget
  const kop: [string, number][] = [];
  if (klan === undefined) return { varor, vinst, kop };
  const harSilver = Math.floor(amountOf(s, 'silver') + 1e-9);
  let budget = harSilver + varor.reduce((a, [k, n]) => a + Math.floor(n * grundvarde(k) * trorPris(p, klan, k)), 0), hemVikt = 0, kostar = 0;
  const brist = (Object.keys(MATERIALMAL) as (keyof typeof MATERIALMAL)[]).filter(saljbar)
    .map(k => ({ k, per: grundvarde(k) * trorPris(p, klan, k), d: grundvarde(k) * (byPaslag(s, k) - trorPris(p, klan, k)), n: Math.ceil(villHaAv(s, k) - amountOf(s, k) - 1e-9) }))
    .filter(x => x.d > 1e-9 && x.n > 0 && kannerPris(p, klan, x.k)).sort((a, b) => b.d / viktOf(b.k) - a.d / viktOf(a.k) || (a.k < b.k ? -1 : 1));
  for (const x of brist) {
    const m = Math.min(x.n, Math.floor(budget / Math.max(1e-9, x.per) + 1e-9), Math.floor((bar - hemVikt) / Math.max(1e-9, viktOf(x.k)) + 1e-9));
    if (m <= 0) continue;
    kop.push([x.k, m]); hemVikt += m * viktOf(x.k); vinst += m * x.d;
    const pay = Math.ceil(m * x.per - 1e-9); budget -= pay; kostar += pay;
  }
  const silver = Math.min(harSilver, kostar);
  if (silver > 0) varor.push(['silver', silver]);
  return { varor, vinst, kop };
}
// dygnen dit som personen räknar dem: den sparade vägens, annars fågelvägen
function dygnDit(s: State, fran: { x: number; y: number }, till: { x: number; y: number }) {
  const vl = s.varld!, v = varldMark(s)!, a = fran.y * v.w + fran.x, b = till.y * v.w + till.x;
  const sparad = sparadVag(vl, 'fots', a, b);
  return (sparad ? sparad.kostnad : Math.hypot(till.x - fran.x, till.y - fran.y) * RESA.omvag) / VARLD.gangPerDygn;
}
export interface ResPlan { mal: number; namn: string; skal: ResmalId; uppdrag?: number; varde: number; dygn: number; fara: number; sc: number; varor: [string, number][]; kop?: [string, number][] }
// resans poäng för varje plats räknas en gång per RESA.poangTim timmar och person (steg 12.1.11): målen med poängen utan byns
// förråd, som bara är en faktor. En resenär väljer alltså på poäng som kan vara en timme gammal (sex minuter i verkligheten)
interface ResMal extends Omit<ResPlan, 'sc'> { bas: number; d: number } // d: dygnen utan avrundning
const resMalMinne = new WeakMap<State, Map<number, { h: number; l: ResMal[] }>>();
TIMMINNEN.resMal = { ut: s => { const m = resMalMinne.get(s); return m?.size ? [...m] : undefined; }, in: (s, v) => { resMalMinne.set(s, new Map(v as [number, { h: number; l: ResMal[] }][])); } }; // (steg 12.1.248)
// den resa personen helst skulle samla till och dess poäng (utan bruset); fd och wd är dygnen byns mat och ved räcker
export function resaPlan(s: State, p: Person, fd: number, wd: number): ResPlan | undefined {
  const vl = s.varld, v = varldMark(s), hem = vl?.huvud !== undefined ? byPlats(vl, vl.huvud) : undefined;
  if (!vl || !v || !hem || p.gast || ute(p) || sallskapFor(vl, p.id)) return undefined;
  let m = resMalMinne.get(s);
  if (!m) resMalMinne.set(s, m = new Map());
  const h = Math.floor(s.now / (RESA.poangTim * HOUR));
  let e = m.get(p.id);
  if (e?.h !== h) m.set(p.id, e = { h, l: resMal(s, p, vl, hem) });
  let bast: ResPlan | undefined;
  for (const x of e.l) {
    if (x.skal === 'sandebud' && !vl.bud) continue; // budet har redan gått med någon annan under timmen
    const sc = x.bas * clamp(Math.min(fd, wd) / x.d, 0, 1);
    if (sc > 0 && (!bast || sc > bast.sc)) { const { bas: _b, d: _d, ...r } = x; bast = { ...r, sc }; }
  }
  return bast;
}
function resMal(s: State, p: Person, vl: Varlden, hem: VarldPlats): ResMal[] {
  const ut: ResMal[] = [];
  const ny = stat(p, 'nyfikenhet', s.now), mod = stat(p, 'mod', s.now), utfar = Math.max(0, 1 + pabud(s, 'utfarder') * PAB.utfarMax); // påbudet Utfärder (steg 11.8.15)
  for (const q of [...vl.platser ?? [], ...vl.minnesplatser ?? []]) { // och platserna byn tror finns (steg 12.1.146)
    if (q.nr === hem.nr) continue;
    const niva = kannerOrt(s, p, q.nr);
    if (niva === undefined) continue;
    const r = q.by !== undefined ? radNr(vl, q.by) : undefined;
    let skal: ResmalId | undefined, varde = 0, varor: [string, number][] = [], kop: [string, number][] = [];
    if (q.k === 'by' && r && vl.bud?.mot === r.nr && BYSORTER[r.sort].folk && r.tal.folk > 0) { // sändebudet (steg 11.6.23): äran gånger lämpligheten
      skal = 'sandebud'; varde = RESA.bud * budLamplig(s, p, r.syn?.id); varor = vl.bud.ton === 'besked' ? budGava(s) : [];
    }
    if (!skal && q.k === 'by' && r && BYSORTER[r.sort].folk && r.tal.folk > 0) {
      const h = resaVaror(s, p, r.nr);
      if (h.vinst > 0) { skal = 'handel'; varde = h.vinst * (1 + p.skill.handel / 20); varor = h.varor; kop = h.kop; }
    }
    // turnén (steg 11.8.18): till en grannby som tycker om byn, för den som är skicklig och känd; gåvan väger som handelns vinst
    if (skal !== 'sandebud' && q.k === 'by' && r && BYSORTER[r.sort].folk && r.tal.folk > 0 && (r.syn?.inst ?? -100) >= RESA.turneVan) {
      const g = RESA.turneGava * turneKraft(s, p);
      if (g > varde) { skal = 'turne'; varde = g; varor = []; kop = []; }
    }
    // ett uppdrag personen tror på (steg 11.8.4): den trodda belöningen gånger tilltron, mot samma kostnad och risk som annat
    let uid: number | undefined;
    // budbäraren (steg 11.8.13): ett uppdrag som p:s hushåll eller styre utlyst, till en grannby som inte vet om det
    const bud = skal !== 'sandebud' && q.k === 'by' && r && BYSORTER[r.sort].folk && r.tal.folk > 0 ? BUDBARKROK.f?.(s, p, r.nr) : undefined;
    if (bud && (!skal || bud.varde > varde)) { skal = 'budbarare'; varde = bud.varde; uid = bud.id; varor = []; kop = []; }
    const upp = skal !== 'sandebud' && ((RESMAL.uppdrag.mal as readonly string[]).includes(q.k) || vilseVid(p, q.nr)) ? uppdragVid(s, p, q.nr) : undefined; // en vilsegång längs vägen till vilket mål som helst (steg 11.8.6)
    if (upp && (!skal || upp.varde > varde)) { skal = 'uppdrag'; varde = upp.varde; uid = upp.id; varor = []; kop = []; }
    // silvergruvan (steg 11.10.1): silvret personen väntar sig bära hem efter den bästa tiden nere, mindre för ett rykte
    let nere: number | undefined;
    if (!skal && (RESMAL.hamta.mal as readonly string[]).includes(q.k)) {
      const g = silverPlan(1, barResenar(s, p), dygnDit(s, hem, q), marginal(p), q.k);
      if (g) { skal = 'hamta'; nere = g.nere; varde = g.silver * grundvarde(GRUVSAK[q.k]?.sak ?? 'silver') * (niva === O_RYKTE ? SILVER.rykte : 1); }
    }
    if (!skal && niva === O_RYKTE && (RESMAL.se.mal as readonly string[]).includes(q.k)) { skal = 'se'; varde = RESA.seVarde * ny / 10; }
    if (!skal) continue;
    const dygn = Math.max(RESA.minDygn, 2 * dygnDit(s, hem, q) + (nere ?? RESMAL[skal].stannar));
    const fara = 1 - Math.exp(-RESA.faraDygn * dygn), forsiktig = clamp((20 - mod) / 10, 0, 2);
    const lust = (ny + mod) / 20, dygnR = Math.round(dygn * 100) / 100;
    const bas = RESA.vikt * utfar * (varde - hemmaForlust(s, p, dygn)) / dygn * lust * Math.max(0, 1 - fara * forsiktig);
    if (bas > 0) ut.push({ mal: q.nr, namn: q.namn, skal, varde: Math.round(varde * 10) / 10, dygn: dygnR, fara: Math.round(fara * 1000) / 1000, varor, kop, ...(uid !== undefined ? { uppdrag: uid } : {}), bas, d: dygn });
  }
  return ut;
}
// hur lämplig p är att bära byns besked (1 för en medelmåttig): karismen, Handel och släkt i byn (den hen kommer ifrån)
export const budLamplig = (s: State, p: Person, klan: number | undefined) => stat(p, 'karisma', s.now) / 10 * (1 + p.skill.handel / 20) * (klan !== undefined && p.fran === klan ? 1 + RESA.budSlakt : 1);
// turnén (steg 11.8.18): hur skicklig p är som skald eller i sporten (skaldskapen, eller den senaste bedriften en vunnen tävling)
// gånger hur mycket byn talar om hen (ryktbarheten per bybo), 0 till 1. Gåvan grannbyn ger är RESA.turneGava gånger det
export function turneKraft(s: State, p: Person) {
  const konst = Math.max(p.skill.skaldskap / 20, p.bedrift?.h === 'tavling' ? 1 : 0), folk = living(s).length;
  return clamp(konst, 0, 1) * clamp(ryktbarhet(s, p.id).r / Math.max(1, folk), 0, 1);
}
// gåvan med ett vänligt bud: det byn har mest över (över förrådsmålen), störst värde först, tills den är värd RESA.budGava
export function budGava(s: State): [string, number][] {
  const over = (Object.keys(MATERIALMAL) as (keyof typeof MATERIALMAL)[]).filter(saljbar)
    .map(k => ({ k, n: Math.floor(amountOf(s, k) - villHaAv(s, k) + 1e-9) })).filter(x => x.n > 0).sort((a, b) => b.n * grundvarde(b.k) - a.n * grundvarde(a.k) || (a.k < b.k ? -1 : 1));
  const ut: [string, number][] = [];
  let v = 0;
  for (const x of over) {
    const n = Math.min(x.n, Math.floor((RESA.budGava - v) / grundvarde(x.k) + 1e-9));
    if (n > 0) { ut.push([x.k, n]); v += n * grundvarde(x.k); }
  }
  return ut;
}
// det p förlorar hemma medan hen är borta: de egna grödorna som vissnar under torkan innan hen är tillbaka och kan vattna (steg
// 3.8.2), i värdet av skörden. Det vägs mot resans värde, för ledaren och för den som väljer att följa med
export function hemmaForlust(s: State, p: Person, dygn: number) {
  if (!s.sjoTorr?.pa) return 0;
  let v = 0;
  for (const f of s.falt ?? []) {
    if (f.agare !== p.id) continue;
    for (const x of rutorAv(f)) if (x.st === 'vaxer' && x.g && (x.fu ?? 1) * TORKA.fuktTim * HOUR < dygn * DAY) v += GRODOR[x.g].perRuta * grundvarde(GRODOR[x.g].sak); // rutan torkar ut innan hen är tillbaka (steg 12.1.79)
  }
  return v;
}
// ledaren samlar: ett nytt sällskap med målet, varorna och samlingsplatsen
export function samlaResa(s: State, p: Person, r: ResPlan): Sallskap | undefined {
  const sl = nyttSallskap(s, p, r.mal, r.skal);
  if (!sl) return undefined;
  sl.varor = r.varor.map(([k, n]) => [k, n]); sl.varde = r.varde;
  const vl = s.varld!;
  if (r.skal === 'sandebud' && vl.bud) { sl.ton = vl.bud.ton; sl.av = vl.bud.av; vl.bud = undefined; } // budet är sänt
  if (r.kop?.length) sl.kop = r.kop.map(([k, n]) => [k, n]);
  if (r.uppdrag !== undefined) { sl.uppdrag = r.uppdrag; const u = uppdragNr(vl, r.uppdrag); if (u && uppdragDef(u.k).gor === 'hjalpa') sl.hjalp = 1; }
  sl.ut = utgang(s, sl);
  if (!sl.ut) { stallIn(s, sl); return undefined; }
  dagbok(s, sl, 'samlas', `${p.name} samlar till en resa till ${r.namn}.`);
  count(s, 'resa samlas');
  kallelse(s, sl, r);
  return sl;
}

// ---------- kallelsen (steg 11.5.11, Flera samhällen: Sällskapet) ----------
// När ledaren samlar kallar hen, som vid björnjakten: varje vuxen som kan gå väger att följa med efter modet, tycket om ledaren,
// nyfikenheten och sin egen del av resans väntade värde, som späds för varje ny resenär. Ledaren tar de villigaste tills
// kraften räcker mot ledens fara (RESA.kraftPerFara gånger faran) och bärförmågan räcker till packningen; fler än så späder bara
// andelarna. Resenärerna går till samlingsplatsen. När alla är där packar sällskapet; har det inte kommit ihop inom en timme
// (RESA.samlaSek) går ledaren med dem som kommit, om kraften räcker, och annars ställs resan in.
export const resKraft = (s: State, p: Person) => (stat(p, 'styrka', s.now) + stat(p, 'mod', s.now)) / 20;
export const sallskapKraft = (s: State, sl: Sallskap) => resenarer(s, sl).reduce((a, p) => a + resKraft(s, p), 0);
export function kallelse(s: State, sl: Sallskap, r: ResPlan) {
  const vl = s.varld!, led = s.people.find(p => p.id === sl.ledare);
  if (!led) return;
  sl.krav = Math.round(RESA.kraftPerFara * r.fara * 100) / 100;
  // (den som håller vakt i natt är upptagen tills morgonen, som vid larmet, rovare.ts)
  const kan = living(s).filter(q => q !== led && !q.gast && ageOf(q, s.now) >= ALDER.vuxen && kanGa(q) && !isSick(q, s.now) && !ute(q) && !sallskapFor(vl, q.id) && q.task?.act !== 'vakt');
  const vilja = kan.map(q => ({ q, v: RESA.foljMod * (stat(q, 'mod', s.now) - 10) / 10 + RESA.foljTycke * getRel(s, q, led).op / 100 + RESA.foljNyfiken * (stat(q, 'nyfikenhet', s.now) - 10) / 10 + RESA.foljSlump * (rnd(s, 'resa', q) - 0.5) + (sl.uppdrag !== undefined ? kravPassar(s, led, sl.uppdrag, q) : 0) }))
    .sort((a, b) => b.v - a.v || a.q.id - b.q.id);
  for (const x of vilja) {
    const pb = packbehov(s, sl);
    if (sallskapKraft(s, sl) >= sl.krav && (!pb || pb.ryms)) break; // sällskapet räcker: fler späder bara andelarna
    if (x.v + RESA.foljVinst * (r.varde / (sl.medl.length + 1) - hemmaForlust(s, x.q, r.dygn)) / r.dygn <= RESA.folj) continue;
    if (foljMed(vl, sl, x.q)) count(s, 'resa följer med');
  }
  if (sl.medl.length > 1) dagbok(s, sl, 'samlas', `${stor(tal(sl.medl.length - 1))} följer med.`);
}
// den som är vid samlingsplatsen medan sällskapet samlas: ledaren väntar in de andra
// (steg 12.1.8): har ledaren inte kommit när väntetiden gått, för att hen dött, är borta eller inte kan gå dit, tar den som
// kom först över efter lika lång väntan
function samlasSteg(s: State, sl: Sallskap, p: Person) {
  const vid = sl.vid ??= [];
  if (!vid.includes(p.id)) vid.push(p.id);
  const vantat = s.now - sl.borjan >= RESA.samlaSek * SEC;
  if (sl.ledare !== p.id && !(vantat && !vid.includes(sl.ledare) && vid.find(id => sl.medl.includes(id)) === p.id)) return;
  const alla = sl.medl.every(id => { const q = s.people.find(x => x.id === id); return !q || !alive(q) || vid.includes(id); });
  if (!alla && !vantat) return;
  if (!alla) sl.medl = sl.medl.filter(id => vid.includes(id)); // de som inte kom är inte med
  if (sl.ledare !== p.id) { sl.ledare = p.id; dagbok(s, sl, 'samlas', `${p.name} leder resan i stället.`); count(s, 'resa ny ledare'); }
  if (sallskapKraft(s, sl) < (sl.krav ?? 0) - 1e-9 || !iHelaForradet(() => borjaPacka(s, sl))) stallIn(s, sl); // ledaren planerar på hela förrådet
}
// den som inte kommit fram till samlingsplatsen (när sällskapet packar) eller till kanten (när det går) efter lika lång väntan
// som vid samlingen är inte med längre: hen sitter fången, ligger sjuk eller har dött (steg 12.1.8). Är ledaren en av dem
// leder den som är kvar
function utanDeSomInteKom(s: State, sl: Sallskap, p: Person, framme: (id: number) => boolean, sedan: number) {
  if (s.now - sedan < RESA.samlaSek * SEC) return false;
  const borta = sl.medl.filter(id => !framme(id));
  if (!borta.length) return false;
  sl.medl = sl.medl.filter(framme);
  if (!sl.medl.includes(sl.ledare)) { sl.ledare = p.id; dagbok(s, sl, 'samlas', `${p.name} leder resan i stället.`); count(s, 'resa ny ledare'); }
  return true;
}

// ---------- sällskapet på världskartan (steg 11.5.12, Flera samhällen: Vad spelaren ser och vad byn vet) ----------
// Spelaren ser sällskapet som det är: en bild som rör sig längs vägen, mellan rutan det är på och nästa (gången mot nästa ruta i
// rutans kostnad), vänd åt sitt håll, och en ruta med skälet, målet, skedet, medlemmarna, djuren, packningen och hur långt det
// är kvar i dygn (i sällskapets fart nu), eller hur länge det stannar framme.
export const SKEDEN: Record<Skede, string> = { samlas: 'Samlas', packar: 'Packar', gar: 'Går ut ur byn', ute: 'På väg dit', framme: 'Framme', hemat: 'På väg hem', hemma: 'Hemma', forsvunnet: 'Försvunnet' };
export interface SallskapLage { x: number; y: number; dx: number; dy: number; kvar: number }
export function sallskapLage(s: State, sl: Sallskap): SallskapLage | undefined {
  const vl = s.varld, v = varldMark(s);
  if (!vl || !v || !PA_VAGEN.includes(sl.skede)) return undefined;
  const rutor = vagenRutor(s, sl), pos = sl.pos ?? 0;
  if (sl.skede === 'framme' || !rutor.length) {
    const i = sl.skede === 'framme' && rutor.length ? rutor[rutor.length - 1] : sl.ruta;
    if (i === undefined) return undefined;
    const kvar = sl.skede === 'framme' ? Math.max(0, stannarFor(sl) - (s.now - (sl.framme ?? s.now)) / DAY) : 0;
    return { x: i % v.w, y: Math.floor(i / v.w), dx: 0, dy: 0, kvar: Math.round(kvar * 100) / 100 };
  }
  const k = kostnader(vl, v, fardsatt(sl)), a = rutor[pos], b = rutor[Math.min(pos + 1, rutor.length - 1)];
  const f = a === b ? 0 : clamp((sl.gang ?? 0) / k[b], 0, 1), ax = a % v.w, ay = Math.floor(a / v.w), bx = b % v.w, by = Math.floor(b / v.w);
  let kvar = -(sl.gang ?? 0);
  for (let n = pos + 1; n < rutor.length; n++) kvar += k[rutor[n]];
  kvar = Math.max(0, kvar) / (VARLD.gangPerDygn * Math.max(1e-9, sallskapFart(s, sl)));
  return { x: ax + (bx - ax) * f, y: ay + (by - ay) * f, dx: Math.sign(bx - ax), dy: Math.sign(by - ay), kvar: Math.round(kvar * 100) / 100 };
}
export interface SallskapRuta { titel: string; mal: string; varfor: string; skede: string; ledare: string; medl: string[]; vem: { id: number; namn: string }[]; djur: string[]; pack: [string, number][]; kvar?: number; stannar?: number } // mal, varfor och vem (ledaren först): rutan på världskartan (steg 12.1.31)
export function sallskapRuta(s: State, sl: Sallskap): SallskapRuta {
  const mal = s.varld?.platser?.find(p => p.nr === sl.mal)?.namn ?? '', lage = sallskapLage(s, sl);
  const namn = (id: number) => s.people.find(p => p.id === id)?.name ?? '';
  const djur = [...sl.djur.map(id => s.tamdjur?.find(d => d.id === id)).filter(d => !!d).map(d => tamArt(d!.art).namn), ...sl.fordon.map(k => SAKER[k]?.namn ?? k)]; // och vagnen (steg 12.1.10)
  return {
    titel: `${RESMAL[sl.skal].namn}: ${mal}`, mal, varfor: sl.hjalp ? 'Hjälpa byn' : RESMAL[sl.skal].namn, skede: SKEDEN[sl.skede], ledare: namn(sl.ledare), medl: sl.medl.filter(id => id !== sl.ledare).map(namn).filter(Boolean),
    vem: [sl.ledare, ...sl.medl.filter(id => id !== sl.ledare)].map(id => ({ id, namn: namn(id) })).filter(x => x.namn),
    djur, pack: Object.entries(sl.pack).filter(([, n]) => n >= 1).map(([k, n]) => [SAKER[k]?.namn ?? k, Math.floor(n)] as [string, number]).sort((a, b) => b[1] - a[1]),
    ...(lage && sl.skede !== 'framme' ? { kvar: lage.kvar } : {}), ...(lage && sl.skede === 'framme' ? { stannar: lage.kvar } : {}),
  };
}

// ---------- resans dagbok och redogörelsen (steg 11.5.13, Flera samhällen: Resor, Besöket hos en rad) ----------
// Spelaren följer resan medan den pågår: varje händelse skrivs i sällskapets dagbok i samma stund som den sker, med sitt slag
// (en rad i registret DAGBOK), och det stora ger också en notis. Byn hemma vet inget om resan förrän någon kommit hem: först
// då blir målet besökt för byns rad, och resan berättas som en redogörelse, en rad i byns händelser och en notis med knappen
// till hela resan (dagboken och hur bytet delades). Byn minns de senaste RESA.minns resorna som kommit hem.
export interface DagbokDef { namn: string; sym: string; stor?: true }
export const DAGBOK = {
  samlas: { namn: 'Samlas', sym: '🎒' },
  ut: { namn: 'På väg', sym: '🚶' },
  fram: { namn: 'Framme', sym: '📍' },
  handel: { namn: 'Handel', sym: '⚖️' },
  mote: { namn: 'Möte', sym: '🤝' },
  vagmote: { namn: 'Möte på vägen', sym: '🤝', stor: true }, // steg 11.6.12
  fynd: { namn: 'Fynd', sym: '🎁', stor: true },
  vilse: { namn: 'Vilse', sym: '❔' },
  ovader: { namn: 'Oväder', sym: '🌧️' },
  tappad: { namn: 'Tappat', sym: '👐' },
  mat: { namn: 'Mat', sym: '🫐' },
  hjul: { namn: 'Trasigt hjul', sym: '🛞' }, // steg 12.1.144
  vilt: { namn: 'Vilt', sym: '🦌' },
  ran: { namn: 'Rån', sym: '🗡️', stor: true },
  strid: { namn: 'Strid', sym: '⚔️', stor: true },
  skada: { namn: 'Skada', sym: '🩹', stor: true },
  dod: { namn: 'Död', sym: '✝️', stor: true },
  besked: { namn: 'Beskedet', sym: '📜', stor: true }, // sändebudets besked (steg 11.6.23)
  uppdrag: { namn: 'Uppdraget', sym: '📜', stor: true }, // det som sker på uppdragets plats (steg 11.8.7)
  turne: { namn: 'Turnén', sym: '⭐', stor: true }, // framträdandet i grannbyn (steg 11.8.18)
  hem: { namn: 'Hemma', sym: '🏠' },
} as const satisfies Record<string, DagbokDef>;
export type DagbokId = keyof typeof DAGBOK;
export function dagbok(s: State, sl: Sallskap, slag: DagbokId, text: string, t = s.now) {
  horText('dagbok', text);
  sl.dagbok.push([t, text, slag]);
  if ((DAGBOK[slag] as DagbokDef).stor) notis(s, 'resa', `${RESMAL[sl.skal].namn}, ${malNamn(s, sl)}: ${text}`, sl.medl, undefined, { resa: sl.id });
}
const malNamn = (s: State, sl: Sallskap) => s.varld?.platser?.find(p => p.nr === sl.mal)?.namn ?? '';
// ---------- uppdraget på platsen (steg 11.8.7, Flera samhällen: Uppdragen i tal) ----------
// Framme gör sällskapet det uppdraget säger: i en ruin tar det det som finns kvar så långt bärförmågan räcker, en hjälp ges
// under dagen det stannar och en leverans lämnas om saken finns i packningen. Ett utlyst uppdrag som någon redan tagit eller
// vars tid är ute finns inte längre, och platsen är tom. Belöningen läggs i packningen och delas hemma som allt annat (Andelar).
// Det som sker står i dagboken, och utfallet berättas i redogörelsen hemma.
export interface UppdragUtfall { namn: string; hur: 'klart' | 'tomt' | 'misslyckat'; fick: Record<string, number> }
// fynden med egna filer: det vaktade föremålet i ett rövarläger (steg 11.13.27, vaktat.ts) och gravgåvorna (steg 11.13.28, gravfynd.ts)
type FramKrok = (s: State, sl: Sallskap, t: number) => (UppdragUtfall & { text: string }) | undefined;
export const UPPDRAGFRAM: { vaktat?: FramKrok; grav?: FramKrok; gomma?: FramKrok } = {};
// den som kommer till en plats ser fyndet där (steg 11.13.28): gravfynd.ts sätter kroken
export const FYNDSETT: { grav?: (s: State, p: Person, nr: number, t: number) => void; gomma?: (s: State, p: Person, nr: number, t: number) => void } = {};
// gömman längs leden (steg 12.1.9): gomma.ts sätter kroken
export const GOMMAKROK: { lagg?: (s: State, sl: Sallskap, saker: Record<string, number>, t: number) => unknown } = {};
// p känner till en vilsegång på vägen till platsen nr (steg 11.8.6)
const vilseVid = (p: Person, nr: number) => !!p.lardomar?.some(l => l.k === 'uppdrag' && l.om === 'vilsegang' && l.g === nr);
export function uppdragFram(s: State, sl: Sallskap, t: number) {
  const vl = s.varld!, u = sl.uppdrag !== undefined ? uppdragNr(vl, sl.uppdrag) : undefined, ruin = ruinRad(vl, sl.mal);
  const vk = !u || u.mal !== sl.mal || u.k === 'vaktat' ? UPPDRAGFRAM.vaktat?.(s, sl, t) ?? UPPDRAGFRAM.grav?.(s, sl, t) ?? UPPDRAGFRAM.gomma?.(s, sl, t) : undefined; // det vaktade också när någon utlyst en belöning för det (steg 11.8.11)
  if (vk) { uppdragUtfall(s, sl, vk.namn, vk.hur, vk.fick, vk.text, t); return; }
  const fick: Record<string, number> = {};
  let namn = u ? uppdragDef(u.k).namn : ruin ? 'Ruinskatten' : 'Uppdraget', hur: UppdragUtfall['hur'] = 'tomt', text: string;
  if (ruin && (!u || u.mal !== sl.mal)) {
    const bar = barNu(s, sl);
    Object.assign(fick, taRuin(s, vl, ruin, t, Math.max(0, bar - packVikt(sl)), viktOf));
    hur = Object.keys(fick).length ? 'klart' : 'tomt'; namn = 'Ruinskatten';
    text = hur === 'klart' ? `Tog det som fanns kvar i ruinen: ${sakLista(fick)}.` : 'Ruinen var tom: någon hade hunnit före, eller allt hade vittrat.';
  } else if (!u || u.mal !== sl.mal) {
    text = 'Uppdraget fanns inte längre: någon hade hunnit före, eller tiden var ute.';
  } else {
    const gor = uppdragDef(u.k).gor;
    if (gor === 'hjalpa') { dagbok(s, sl, 'uppdrag', `Började hjälpa ${malNamn(s, sl)}.`, t); return; } // avgörs när sällskapet vänder (hjalpSlut)
    if (gor === 'leverera' && u.sak && (sl.pack[u.sak[0]] ?? 0) >= u.sak[1]) { tappa(sl, u.sak[0], u.sak[1]); hur = 'klart'; }
    else hur = 'misslyckat';
    if (hur === 'klart') {
      Object.assign(fick, u.belon); u.belon = {};
      avslutaUppdrag(s, vl, u, true);
      text = `${namn}: uppdraget är utfört. Belöningen: ${sakLista(fick) || 'ingen'}.`;
    } else text = `${namn} gick inte att göra${gor === 'leverera' ? ': saken fanns inte i packningen' : ''}.`;
  }
  uppdragUtfall(s, sl, namn, hur, fick, text, t);
}
function uppdragUtfall(s: State, sl: Sallskap, namn: string, hur: UppdragUtfall['hur'], fick: Record<string, number>, text: string, t: number) {
  for (const [k, n] of Object.entries(fick)) if (n >= 1) sl.pack[k] = (sl.pack[k] ?? 0) + Math.floor(n);
  sl.utfall = { namn, hur, fick };
  dagbok(s, sl, 'uppdrag', text, t);
  count(s, `uppdrag ${hur}`);
}
// hjälpen avgörs när sällskapet vänder (steg 11.13.23): i en väckt by har resenärerna arbetat i byn (vackthjalp.ts), och har de
// arbetat UPPDRAGTAL.hjalpTim timmar var är hjälpen given. Utan en väckt by räknas dygnen de stannat som hjälpen
export function hjalpSlut(s: State, sl: Sallskap, t: number) {
  const vl = s.varld!, u = sl.uppdrag !== undefined ? uppdragNr(vl, sl.uppdrag) : undefined, folk = resenarer(s, sl).length;
  if (!u || u.mal !== sl.mal) { uppdragUtfall(s, sl, 'Hjälp på en plats', 'tomt', {}, 'Byn behövde ingen hjälp längre: någon hade hunnit före, eller tiden var ute.', t); return; }
  const namn = uppdragDef(u.k).namn, tim = sl.hjalpTim, fick: Record<string, number> = {};
  if (tim !== undefined && tim < UPPDRAGTAL.hjalpTim * Math.max(1, folk)) { uppdragUtfall(s, sl, namn, 'misslyckat', fick, `Hjälpte bara till i ${spelTid(tim * HOUR)}, och byn gav ingen belöning.`, t); return; }
  Object.assign(fick, u.belon); u.belon = {};
  avslutaUppdrag(s, vl, u, true);
  uppdragUtfall(s, sl, namn, 'klart', fick, `${namn}: uppdraget är utfört${tim !== undefined ? ` efter ${spelTid(tim * HOUR)} av arbete` : ''}. Belöningen: ${sakLista(fick) || 'ingen'}.`, t);
}
export const sakLista = (x: Record<string, number>) => och(Object.entries(x).filter(([, n]) => n >= 1).map(([k, n]) => antal(Math.floor(n), k)));
// hemkomsten: byn får veta om resan
export function redogorelse(s: State, sl: Sallskap, t: number) {
  const vl = s.varld;
  if (!vl) return;
  radBesoker(vl, vl.huvud, sl.mal);
  const folk = resenarer(s, sl), led = folk.find(p => p.id === sl.ledare) ?? folk[0];
  const dygn = Math.max(1, Math.round((t - sl.borjan) / DAY));
  const text = `${led?.name ?? 'Sällskapet'}${folk.length > 1 ? ` och ${tal(folk.length - 1)} till` : ''} kom hem från ${RESMAL[sl.skal].resa}${malNamn(s, sl) ? ` till ${malNamn(s, sl)}` : ''} efter ${spelTid(dygn * DAY)}.`;
  sl.berattad = t;
  const u = sl.utfall, upp = u ? ` ${u.namn}: ${u.hur === 'klart' ? `klart${sakLista(u.fick) ? `, med ${sakLista(u.fick)}` : ''}` : u.hur === 'tomt' ? 'platsen var tom' : 'gick inte'}.` : '';
  log(s, text + upp, 'world', folk.map(p => p.id)).resa = sl.id; // minnet hos dem som var med (personens logg)
  notis(s, 'resa', text + upp, folk.map(p => p.id), undefined, { resa: sl.id });
  if (u) { kronika(s, `${text}${upp}`, 'uppdrag'); count(s, 'uppdrag berättat'); } // uppdragets redogörelse (steg 11.8.7)
  // en vanlig resa (utan uppdrag och turné) står i krönikan med mallen k_resa (steg 12.1.233)
  else if (sl.turne === undefined && led) kronikaBer(s, 'k_resa', sl.id, { folk: och(folk.map(p => p.name)), resa: RESMAL[sl.skal].resa, mal: malNamn(s, sl) || 'grannbyn', borta: spelTid(dygn * DAY), De: folk.length > 1 ? 'De' : stor(han(led)) });
  // ryktet och upplevelsen (steg 11.8.17): de som ser sällskapet komma hem med ett klarat uppdrag får intrycket äventyrare om var
  // och en som var med, och det sprids som andra rykten. Resan sitter en tid i humöret, glad eller besviken efter hur det gick
  if (sl.turne !== undefined) { // turnén (steg 11.8.18): den som uppträdde får en bedrift, och krönikan en rad
    const p = folk.find(x => x.id === sl.ledare);
    const r = slMal(s, sl);
    if (p) { handelse(s, p, 'turne', undefined, r?.namn ?? 'grannbyn'); kronika(s, `${p.name} kom hem från en turné till ${r?.namn ?? 'grannbyn'}${sl.turne ? ` med ${sl.turne} silver i gåva` : ''}.`, 'grannar'); }
  }
  if (u) for (const p of folk) {
    if (u.hur === 'klart') { handelse(s, p, 'uppdrag', undefined, u.namn.toLowerCase()); tanke(p, 'klaradeUppdrag', t, { namn: u.namn.toLowerCase(), v: UPPDRAGTAL.glad, tid: UPPDRAGTAL.tanke * DAY }); }
    else tanke(p, u.hur === 'tomt' ? 'tomPlats' : 'uppdragGickInte', t, { v: -UPPDRAGTAL.besviken, tid: UPPDRAGTAL.tanke * DAY });
  }
  count(s, 'resa redogörelse');
  // byn minns de senaste resorna; de äldsta som kommit hem glöms
  const hemma = (vl.sallskap ?? []).filter(x => x.skede === 'hemma' || x.skede === 'forsvunnet').sort((a, b) => (a.t ?? 0) - (b.t ?? 0) || a.id - b.id); // också de försvunna, efter när de kom hem eller försvann
  if (hemma.length > RESA.minns) { const glom = new Set(hemma.slice(0, hemma.length - RESA.minns)); vl.sallskap = vl.sallskap!.filter(x => !glom.has(x)); }
}
// resan som byn känner till: bara den som kommit hem och berättats
export const resaAv = (s: State, id: number) => s.varld?.sallskap?.find(x => x.id === id && x.berattad !== undefined);
export interface Redogorelse { titel: string; borjan: number; hem: number; ledare: number; medl: number[]; dagbok: [number, string, DagbokId?][]; delning?: Andelar }
export function redogorelseAv(s: State, id: number): Redogorelse | undefined {
  const sl = resaAv(s, id);
  if (!sl) return undefined;
  return { titel: `${RESMAL[sl.skal].namn}: ${malNamn(s, sl)}`, borjan: sl.borjan, hem: sl.berattad!, ledare: sl.ledare, medl: sl.medl, dagbok: sl.dagbok, delning: sl.delning };
}

// ---------- vägens händelser (steg 11.5.14, Flera samhällen: Vägens händelser i tal) ----------
// Registret VAGHANDELSER har en rad per händelse på vägen: risken per dygn, vad som höjer den (risk), färdigheten i sällskapet
// som ändrar den (den bästa resenärens, fardighet; ett fynd blir vanligare, det andra ovanligare) och utfallet (gor). Risken är
// en chans per tid: under en bit på dt sekunder sker händelsen med chansen 1 − e^(−risk·dt/dygn). Händelserna sker på vägen
// (inte framme) och skrivs i dagboken. Här finns de ofarliga raderna; sjukdom, olycka, rån och rovdjur kommer senare.
export interface VagHandelseDef { namn: string; dygn: number; fardighet?: Skill; okar?: true; risk?: (s: State, sl: Sallskap, t: number) => number; gor: (s: State, sl: Sallskap, t: number) => void }
const basta = (s: State, sl: Sallskap, k: Skill) => Math.max(0, ...resenarer(s, sl).map(p => p.skill[k] ?? 0));
export const VAGHANDELSER: Record<string, VagHandelseDef> = {
  vilse: {
    namn: 'Gå vilse', dygn: 0.06, fardighet: 'jakt', // på obanad mark; på stig och bättre RESA.vilseStig
    risk: (s, sl) => { const vl = s.varld; return vl && sl.ruta !== undefined && ledKlass(vl, sl.ruta) !== 'obanad' ? RESA.vilseStig / VAGHANDELSER.vilse!.dygn : 1; },
    gor: (s, sl, t) => { sl.forlorat = (sl.forlorat ?? 0) + RESA.vilseTim; dagbok(s, sl, 'vilse', `Gick vilse och förlorade ${spelTid(RESA.vilseTim * HOUR)}.`, t); },
  },
  ovader: {
    namn: 'Oväder', dygn: 0.05,
    risk: (s, _sl, t) => 1 + RESA.ovaderNb * vaderNu(s, t).nb,
    gor: (s, sl, t) => {
      const n = resenarer(s, sl).length, utan = n ? Math.max(0, n - RESA.talt * Math.floor(sl.pack.talt ?? 0)) / n : 0;
      sl.forlorat = (sl.forlorat ?? 0) + RESA.ovaderTim; const b = behovOf(sl); b.ork = clamp(b.ork - RESA.ovaderOrk * utan, 0, 1);
      dagbok(s, sl, 'ovader', `Ett oväder: väntade ut det i ${spelTid(RESA.ovaderTim * HOUR)}${utan > 0 ? ' utan tak' : ' i tälten'}.`, t);
    },
  },
  tappad: {
    namn: 'Tappad utrustning', dygn: 0.03, fardighet: 'hantverk',
    risk: (s, sl) => { const bar = barNu(s, sl); return 1 + RESA.tappadLast * (bar > 0 ? Math.min(1, packVikt(sl) / bar) : 0); },
    gor: (s, sl, t) => {
      const saker = Object.keys(sl.pack).filter(k => !FOOD.includes(k) && (sl.pack[k] ?? 0) >= 1).sort();
      const alla = saker.reduce((a, k) => a + Math.floor(sl.pack[k]!), 0);
      if (!alla) return;
      let x = Math.floor(rnd(s, 'resa') * alla), k = saker[0]!;
      for (const q of saker) { x -= Math.floor(sl.pack[q]!); if (x < 0) { k = q; break; } }
      tappa(sl, k, 1); count(s, 'resa tappade');
      dagbok(s, sl, 'tappad', `Tappade ${SAKER[k]?.namn.toLowerCase() ?? k} på vägen.`, t);
    },
  },
  // sjukdom och olycka (steg 11.5.16): en resenär får en riktig sjukdom eller skada, som vårdas med det sällskapet har med sig
  sjukdom: {
    namn: 'Sjukdom', dygn: 0.03, fardighet: 'lakekonst',
    gor: (s, sl, t) => {
      const folk = resenarer(s, sl).filter(p => !p.sjuk);
      if (!folk.length) return;
      const p = folk[Math.floor(rnd(s, 'resa') * folk.length)]!, k: SjukId = temperature(s, t) < RESA.koldFran ? 'forkylning' : 'magsjuka';
      if (!insjukna(s, p, k, 'på resan')) return;
      p.sjuk!.tecken = s.now; p.sjuk!.st = 0; // på vägen märks det genast, och byn hemma vet inget om det (ingen smitta dit)
      count(s, 'resa sjuk');
      dagbok(s, sl, 'skada', `${p.name} blev sjuk: ${k === 'forkylning' ? 'förkyld i kylan' : 'ont i magen av maten och vattnet'}.`, t);
    },
  },
  olycka: {
    namn: 'Olycka', dygn: 0.02,
    risk: (s, sl) => { const vl = s.varld; return vl && sl.ruta !== undefined && ledKlass(vl, sl.ruta) === 'obanad' ? RESA.olyckaObanad : 1; },
    gor: (s, sl, t) => {
      const folk = resenarer(s, sl);
      if (!folk.length) return;
      const p = folk[Math.floor(rnd(s, 'resa') * folk.length)]!;
      olycka(s, sl, p, t, [...BEN, ...FOTTER, ...ARMAR], 'på resan', 'resa olycka', `${p.name} föll och skadade sig.`);
    },
  },
  // trasigt hjul (steg 12.1.144): bara för sällskap med ett fordon på hjul; den som kan hantverk bäst sänker risken och lagar fortare
  hjul: {
    namn: 'Trasigt hjul', dygn: 0.04, fardighet: 'hantverk',
    risk: (_s, sl) => sl.fordon.some(k => FORDON[k]?.hjul) ? 1 : 0,
    gor: (s, sl, t) => {
      const tim = Math.round(RESA.hjulTim * Math.max(0, 1 - basta(s, sl, 'hantverk') / 20 * RESA.fardSank) * 10) / 10;
      sl.forlorat = (sl.forlorat ?? 0) + tim;
      dagbok(s, sl, 'hjul', `Ett hjul på vagnen gick sönder; det tog ${spelTid(tim * HOUR)} att laga det.`, t);
    },
  },
  // vilt (steg 12.1.144): sällskapet får syn på vilt, och den bästa jägaren avgör om det blir kött i packningen
  vilt: {
    namn: 'Vilt', dygn: 0.06,
    gor: (s, sl, t) => {
      sl.forlorat = (sl.forlorat ?? 0) + RESA.viltTim;
      const chans = RESA.viltMin + (1 - RESA.viltMin) * basta(s, sl, 'jakt') / 20;
      if (rnd(s, 'resa') < chans) {
        sl.pack.kott = (sl.pack.kott ?? 0) + RESA.viltKott; count(s, 'resa fällde vilt');
        dagbok(s, sl, 'vilt', `Fick syn på vilt och fällde det; ${antal(RESA.viltKott, 'kott')} i packningen.`, t);
      } else dagbok(s, sl, 'vilt', 'Fick syn på vilt, men det kom undan.', t);
    },
  },
  mat: {
    namn: 'Fynd av mat', dygn: 0.08, fardighet: 'samla', okar: true,
    risk: (s, _sl, t) => temperature(s, t) >= RESA.fyndVarm ? 1 : RESA.fyndKall,
    gor: (s, sl, t) => {
      const m = Math.max(1, Math.floor(resenarer(s, sl).length * RESA.fyndMat));
      sl.pack.bar = (sl.pack.bar ?? 0) + m; count(s, 'resa hittade mat', m);
      dagbok(s, sl, 'mat', `Hittade ${m} ${m === 1 ? 'portion' : 'portioner'} bär längs vägen.`, t);
    },
  },
};
// (raderna kan läggas till från andra filer, som vagran.ts, så listan görs första gången den behövs)
let vagIds: string[] | undefined;
export const vagHandelseIds = () => vagIds ??= Object.keys(VAGHANDELSER).sort();
// risken per dygn för en händelse just nu
export function vagRisk(s: State, sl: Sallskap, id: string, t = s.now) {
  const h = VAGHANDELSER[id]!, f = h.fardighet ? basta(s, sl, h.fardighet) / 20 * RESA.fardSank : 0;
  return h.dygn * (h.risk?.(s, sl, t) ?? 1) * (h.okar ? 1 + f : Math.max(0, 1 - f));
}
export function vagHandelser(s: State, sl: Sallskap, t: number, dt: number) {
  for (const id of vagHandelseIds()) {
    const p = 1 - Math.exp(-vagRisk(s, sl, id, t) * dt / DAY);
    if (rnd(s, 'resa') < p) { VAGHANDELSER[id]!.gor(s, sl, t); count(s, `resa ${VAGHANDELSER[id]!.namn.toLowerCase()}`); }
  }
}

// ---------- när maten tar slut (steg 11.5.15, Flera samhällen: Farten i tal) ----------
// Har sällskapet ingen mat kvar och är hungrigt väger ledaren fyra utvägar i registret MATSLUT med en poäng: värdet av det
// som återstår av resan (resans väntade värde, eller inget om sällskapet vänder) minus hungern (dygnen utan mat gånger
// resenärerna gånger RESA.hungerKost) minus det utvägen kostar. Hungern väger tyngre för en ledare med empati och som tycker
// om de andra. Att leta kostar tid och ger det väntade fyndet, att vända gör vägen kortare men resan värdelös, att slakta ett
// packdjur ger köttet (som vid slaktbänken) men kostar djuret, och att hungra kostar bara hungern. Ledaren väger igen efter
// RESA.matOmTim timmar om maten fortfarande är slut. Ett dygn helt utan mat drar ork (RESA.orkSvalt), så att farten sjunker.
export interface MatLage { n: number; kvar: number; hem: number; hk: number; varde: number; leta: number; djur?: { id: number; kott: string; m: number; varde: number } }
export interface MatslutDef { namn: string; kan?: (l: MatLage, sl: Sallskap) => boolean; sc: (l: MatLage) => number; gor: (s: State, sl: Sallskap, l: MatLage, t: number) => void }
const matDygn = (l: MatLage, m: number) => m / Math.max(1, l.n * RESA.matPerDygn); // dygn som m portioner räcker sällskapet
export const MATSLUT: Record<string, MatslutDef> = {
  hungra: { namn: 'Hungra', sc: l => l.varde - l.kvar * l.n * l.hk, gor: (s, sl, _l, t) => dagbok(s, sl, 'mat', 'Maten tog slut; sällskapet går vidare hungrigt.', t) },
  leta: {
    namn: 'Leta mat', sc: l => l.varde - Math.max(0, l.kvar - matDygn(l, l.leta)) * l.n * l.hk - RESA.letaTim / 24 * l.n * RESA.tidKost,
    gor: (s, sl, l, t) => {
      const m = Math.floor(l.leta + rnd(s, 'resa'));
      sl.forlorat = (sl.forlorat ?? 0) + RESA.letaTim;
      if (m > 0) sl.pack.bar = (sl.pack.bar ?? 0) + m;
      count(s, 'resa letade mat'); dagbok(s, sl, 'mat', m > 0 ? `Maten tog slut; letade i ${spelTid(RESA.letaTim * HOUR)} och hittade ${m === 1 ? 'en portion' : `${tal(m)} portioner`}.` : `Maten tog slut; letade i ${spelTid(RESA.letaTim * HOUR)} men hittade inget.`, t);
    },
  },
  vanda: {
    namn: 'Vända hem', kan: (_l, sl) => sl.skede === 'ute', sc: l => -l.hem * l.n * l.hk,
    gor: (s, sl, _l, t) => { vandHem(s, sl); count(s, 'resa vände'); dagbok(s, sl, 'ut', 'Maten tog slut; sällskapet vände hem.', t); },
  },
  slakta: {
    namn: 'Slakta ett packdjur', kan: l => !!l.djur, sc: l => l.varde - Math.max(0, l.kvar - matDygn(l, l.djur!.m)) * l.n * l.hk - l.djur!.varde,
    gor: (s, sl, l, t) => {
      const d = (s.tamdjur ?? []).find(x => x.id === l.djur!.id);
      if (!d) return;
      d.dog = t; sl.djur = sl.djur.filter(id => id !== d.id);
      sl.pack[l.djur!.kott] = (sl.pack[l.djur!.kott] ?? 0) + l.djur!.m;
      count(s, 'resa slaktade'); dagbok(s, sl, 'mat', `Maten tog slut; slaktade ${tamArt(d.art).ord[3]} och fick ${antal(l.djur!.m, l.djur!.kott)}.`, t);
    },
  },
};
export const MATSLUT_IDS = Object.keys(MATSLUT);
// läget när maten tagit slut: dygnen kvar av resan och hem härifrån, hungerns vikt, resans värde, väntat fynd och djuret
export function matLage(s: State, sl: Sallskap, t = s.now): MatLage {
  const folk = resenarer(s, sl), n = Math.max(1, folk.length), led = folk.find(p => p.id === sl.ledare) ?? folk[0];
  const v = varldMark(s), hem = slHem(s, sl), mal = slMal(s, sl);
  const lage = sallskapLage(s, sl), nu = v && sl.ruta !== undefined ? { x: sl.ruta % v.w, y: Math.floor(sl.ruta / v.w) } : hem;
  const tillbaka = hem && mal ? dygnDit(s, { x: mal.x, y: mal.y }, { x: hem.x, y: hem.y }) : 0;
  const harifran = hem && nu ? dygnDit(s, nu, { x: hem.x, y: hem.y }) : 0;
  const kvar = sl.skede === 'hemat' ? (lage?.kvar ?? harifran) : (lage?.kvar ?? 0) + stannarFor(sl) + tillbaka;
  const andra = folk.filter(p => p !== led), tycke = led && andra.length ? andra.reduce((a, p) => a + getRel(s, led, p).op, 0) / andra.length : 0;
  const hk = RESA.hungerKost * (led ? Math.max(0, 1 + RESA.matEmpati * (stat(led, 'empati', s.now) - 10) / 10) : 1) * Math.max(0, 1 + RESA.matTycke * tycke / 100);
  const samla = Math.max(0, ...folk.map(p => p.skill.samla ?? 0)) / 20 * RESA.fardSank;
  const leta = n * RESA.letaMat * (1 + samla) * (temperature(s, t) >= RESA.fyndVarm ? 1 : RESA.fyndKall);
  let djur: MatLage['djur'];
  for (const d of (s.tamdjur ?? []).filter(x => sl.djur.includes(x.id) && x.dog === undefined)) {
    const e = Object.values(DJUR).find(x => 'kott' in x && x.sak === SLAKTAD[d.art]) as { kott: string; slakt: Record<string, number> } | undefined;
    if (!e) continue; // hästen slaktas inte
    const varde = tamArt(d.art).varde, m = e.slakt[e.kott] ?? 0;
    if (m > 0 && (!djur || varde / m < djur.varde / djur.m)) djur = { id: d.id, kott: e.kott, m, varde }; // det billigaste köttet
  }
  return { n, kvar: Math.round(kvar * 100) / 100, hem: Math.round((sl.skede === 'ute' ? harifran : kvar) * 100) / 100, hk, varde: sl.varde ?? RESA.seVarde, leta, djur };
}
// poängen för varje utväg som går
export function matslutVal(s: State, sl: Sallskap, t = s.now) {
  const l = matLage(s, sl, t);
  return { l, val: MATSLUT_IDS.filter(id => MATSLUT[id]!.kan?.(l, sl) ?? true).map(id => ({ id, sc: MATSLUT[id]!.sc(l) })).sort((a, b) => b.sc - a.sc) };
}
function matSlut(s: State, sl: Sallskap, t: number) {
  const { l, val } = matslutVal(s, sl, t), bast = val[0];
  if (!bast) return;
  MATSLUT[bast.id]!.gor(s, sl, l, t);
}
// sällskapet vänder och går hem från rutan det står på
export function vandHem(s: State, sl: Sallskap) {
  const vl = s.varld, v = varldMark(s), hem = slHem(s, sl);
  sl.skede = 'hemat';
  if (!vl || !v || !hem || sl.ruta === undefined) return;
  const vag = sl.ruta !== hem.y * v.w + hem.x ? vagMellan(vl, v, sl.ruta, hem.y * v.w + hem.x, fardsatt(sl), s.now) : undefined;
  sl.vag = vag ? { fran: vag.fran, till: vag.till, steg: vag.steg } : undefined; sl.pos = 0; sl.gang = 0;
  if (!vag) hemkomst(s, sl, s.now); // redan vid byn (eller ingen väg): hemma
}

// ---------- sjukdom och olycka på vägen (steg 11.5.16, Flera samhällen: Vägens händelser i tal) ----------
// Resenärernas kroppar räknas på vägen som hemma: blödningen, läkningen, infektionen och sjukdomen (halsaSteg och sjukSteg), men
// inget hamnar på byns karta. Vården är densamma som i byn (VARD) med materialet ur sällskapets packning i stället för byns
// förråd (vardKalla): den resenär som kan läkekonsten bäst vårdar de andra, och den skadade sig själv i det som går att göra
// själv. På vägen görs det som går med händerna och packningen; det som kräver byn (salvan, nålen, amputationen) väntar.
export const VAGVARD = ['avsnora', 'dra_ut', 'trycka', 'forband', 'byta', 'satta', 'spala', 'skolja'];
function kropparPaVagen(s: State, sl: Sallskap, t: number, dt: number) {
  const folk = resenarer(s, sl);
  if (!folk.some(p => p.skador?.length || p.sjuk)) return;
  const sek = dt / SEC, natt = !isLight(t);
  for (const p of folk) {
    if (!p.skador?.length && !p.sjuk) continue;
    vardaPaVagen(s, sl, p, folk);
    const sjukDod = sjukSteg(s, p, sek, natt, !natt && sl.skede !== 'framme');
    if (sjukDod) { dorPaVagen(s, sl, p, SJUK_DOD[sjukDod], t); continue; }
    const dod = halsaSteg(s, p, sek);
    if (dod) dorPaVagen(s, sl, p, dod, t);
  }
}
// den som kan läkekonsten bäst vårdar q med det som finns i packningen
export function vardaPaVagen(s: State, sl: Sallskap, q: Person, folk = resenarer(s, sl)) {
  if (!q.skador?.length) return;
  const andra = folk.filter(g => g !== q && kanGa(g)), g = andra.length ? andra.reduce((a, b) => (b.skill.lakekonst ?? 0) > (a.skill.lakekonst ?? 0) ? b : a) : q;
  vardKalla.pack = sl.pack;
  let gjorde = false;
  try {
    for (const w of [...q.skador ?? []]) for (const k of VAGVARD) {
      const v = VARD[k]!, vem = v.andra && g === q ? undefined : g;
      if (vem && v.krav(s, q, w, vem) && vardKan(s, vem, v, q)) { v.gor(s, vem, q, w); gjorde = true; }
    }
  } finally { vardKalla.pack = undefined; }
  if (!gjorde) return;
  count(s, 'resa vård');
  ovning(g, 'lakekonst', HALSA.lakeOvning);
}
// en resenär dör på vägen: hen dör som hemma (die), men kroppen ligger inte på byns karta; sällskapet går vidare utan hen
export function dorPaVagen(s: State, sl: Sallskap, p: Person, orsak: Dodsorsak, t: number) {
  if (!alive(p) || p.dodVag) return;
  p.dodVag = { orsak, t }; p.sjuk = undefined;
  if (sl.ledare === p.id) { const ny = resenarer(s, sl)[0]; if (ny) sl.ledare = ny.id; } // den som är kvar leder
  if (sl.buren) { sl.buren = sl.buren.filter(b => b[0] !== p.id); if (!sl.buren.length) delete sl.buren; }
  count(s, 'resa död');
  dagbok(s, sl, 'dod', `${p.name} dog ${DODSORSAKER[orsak].text} på vägen.`, t);
  // de andra begraver hen vid leden
  const vl = s.varld;
  if (vl && sl.ruta !== undefined && resenarer(s, sl).length) {
    (vl.gravar ??= []).push({ ruta: sl.ruta, vem: p.id, namn: p.name, t });
    count(s, 'resa begravd');
    dagbok(s, sl, 'dod', `${p.name} begravdes vid leden.`, t);
  }
}

// ---------- den som inte kommer hem (steg 11.5.18, Flera samhällen: Andelarna i tal) ----------
// Den som dör på vägen är död för sällskapet men inte för byn: hen begravs vid leden (en grav på världskartan), och dödsfallet
// räknas i byn (die i liv.ts: arvet, sorgen, krönikan) först när beskedet kommer, när någon från sällskapet kommer hem. Kommer
// ingen hem räknas resenärerna som försvunna när tre gånger den väntade tiden gått (RESA.forsvunnen), och sällskapet är borta.
export interface VagGrav { ruta: number; vem: number; namn: string; t: number }
function beskedet(s: State, sl: Sallskap, orsak?: Dodsorsak) {
  for (const id of sl.medl) {
    const p = s.people.find(q => q.id === id);
    if (!p || !alive(p) || (!p.dodVag && !orsak)) continue;
    const t = p.dodVag?.t ?? s.now, o = (p.dodVag?.orsak ?? orsak) as Dodsorsak;
    p.dodVag = undefined;
    die(s, p, o); p.died = Math.min(t, s.now); // hen dog när hen dog, även om byn får veta det nu
    count(s, 'resa besked');
  }
}
// den väntade tiden för resan, i dygn: dit och hem och tiden framme
export function vantadDygn(s: State, sl: Sallskap) {
  const hem = slHem(s, sl), mal = slMal(s, sl);
  return (hem && mal ? 2 * dygnDit(s, { x: hem.x, y: hem.y }, { x: mal.x, y: mal.y }) : 0) + stannarFor(sl);
}
// den saknade (steg 11.8.6, vilsegang.ts): kroken väger om någon hemma utlyser en vilsegång, och mötet säger när sällskapet hittas
export const SAKNADKROK: { koll?: (s: State, sl: Sallskap) => void; mots?: (s: State, a: Sallskap, b: Sallskap, t: number) => void; fard?: (s: State, sl: Sallskap, f: import('./byhandling').RadFard, t: number) => void } = {};
function forsvunnet(s: State, sl: Sallskap, hittad?: string) {
  if (!hittad && s.now - sl.borjan < RESA.forsvunnen * Math.max(1, vantadDygn(s, sl)) * DAY) return;
  const namn = resenarNamn(s, sl);
  beskedet(s, sl, 'forsvunnen');
  sl.skede = 'forsvunnet'; sl.t = s.now;
  if (s.tamdjur && sl.djur.length) s.tamdjur = s.tamdjur.filter(d => !(sl.djur.includes(d.id) && d.ute !== undefined)); // djuren som följde med är borta med sällskapet
  count(s, 'resa försvunnet');
  const text = hittad ? `${hittad} hittade ${namn} döda vid leden till ${malNamn(s, sl)}.` : `${namn} kom aldrig hem från ${RESMAL[sl.skal].namn.toLowerCase()} till ${malNamn(s, sl)} och räknas som försvunna.`;
  log(s, text, 'world', sl.medl);
  notis(s, 'resa', text, sl.medl, undefined, { resa: sl.id });
}
// sällskapet där alla dött hittas av dem som letar (steg 11.8.6): beskedet kommer hem med dem
export const hittadDod = (s: State, sl: Sallskap, av: string) => forsvunnet(s, sl, av);
export const resenarNamn = (s: State, sl: Sallskap) => { const n = sl.medl.map(id => s.people.find(p => p.id === id)?.name).filter(Boolean) as string[]; return n.length > 1 ? `${n.slice(0, -1).join(', ')} och ${n[n.length - 1]}` : n[0] ?? 'Sällskapet'; };

// ---------- när någon blir långsam (steg 11.5.17, Flera samhällen: Farten i tal) ----------
// Sällskapet går i den långsammaste medlemmens fart. Blir någon långsam (under RESA.langsam, t.ex. med skadade ben) väger
// ledaren utvägarna i registret UTVAGAR med en poäng, som när maten tar slut: värdet av det som återstår av resan minus tiden
// det tar (dygnen gånger resenärerna gånger RESA.tidKost) minus det utvägen kostar. Varje utväg prövas med den fart den ger
// (sallskapFart med FartOm). Att lämna någon kostar efter ledarens empati och vad hen tycker om personen. Det som släpps blir
// en gömma på världskartan, som ligger kvar RESA.gommaDygn dygn. Den som bärs går själv igen när den inte längre är långsam.
export interface Gomma { ruta: number; saker: Record<string, number>; t: number; by: number }
export interface UtvagLage { n: number; varde: number; kvar: number; hem: number; f0: number; langsam: Person; led?: Person; slapp: Record<string, number>; slappVarde: number }
export interface UtvagDef { namn: string; kan?: (s: State, sl: Sallskap, l: UtvagLage) => boolean; om?: (s: State, sl: Sallskap, l: UtvagLage) => FartOm; kost?: (s: State, sl: Sallskap, l: UtvagLage) => number; gor: (s: State, sl: Sallskap, l: UtvagLage, t: number) => void }
const bara = (sl: Sallskap, l: UtvagLage, hur: BurenSatt): FartOm => ({ buren: [...(sl.buren ?? []), [l.langsam.id, hur]] });
const bars = (sl: Sallskap, id: number) => sl.buren?.some(b => b[0] === id);
// ett djur som kan bära en människa till (lasten räknas i lastFart)
const barDjurFor = (s: State, sl: Sallskap) => sl.djur.some(id => barDjur(s, id) >= RESA.personVikt);
export const UTVAGAR: Record<string, UtvagDef> = {
  fortsatta: { namn: 'Fortsätta', gor: (s, sl, l, t) => dagbok(s, sl, 'ut', `${l.langsam.name} går långsamt; sällskapet går i ${hans(l.langsam)} takt.`, t) },
  vagn: {
    namn: 'Åka på vagnen', kan: (_s, sl) => sl.fordon.length > 0, om: (_s, sl, l) => bara(sl, l, 'vagn'),
    gor: (s, sl, l, t) => { (sl.buren ??= []).push([l.langsam.id, 'vagn']); dagbok(s, sl, 'ut', `${l.langsam.name} går långsamt och får åka på vagnen.`, t); },
  },
  djur: {
    namn: 'Rida på ett djur', kan: (s, sl) => barDjurFor(s, sl), om: (_s, sl, l) => bara(sl, l, 'djur'),
    gor: (s, sl, l, t) => { (sl.buren ??= []).push([l.langsam.id, 'djur']); dagbok(s, sl, 'ut', `${l.langsam.name} går långsamt och får sitta på ett av djuren.`, t); },
  },
  bar: {
    namn: 'Bära på en bår', kan: (s, sl, l) => resenarer(s, sl).filter(p => p !== l.langsam && !bars(sl, p.id) && kanGa(p) && personFart(s, p) >= RESA.langsam).length >= 2 && !sl.buren?.some(b => b[1] === 'bar'),
    om: (_s, sl, l) => bara(sl, l, 'bar'),
    gor: (s, sl, l, t) => { (sl.buren ??= []).push([l.langsam.id, 'bar']); dagbok(s, sl, 'ut', `${l.langsam.name} går långsamt; två bär ${honom(l.langsam)} på en bår.`, t); },
  },
  slappa: {
    namn: 'Släppa utrustning', kan: (_s, _sl, l) => Object.keys(l.slapp).length > 0, om: (_s, sl, l) => { const pack = { ...sl.pack }; for (const [k, n] of Object.entries(l.slapp)) { pack[k] = (pack[k] ?? 0) - n; if (pack[k]! <= 0) delete pack[k]; } return { pack }; },
    kost: (_s, _sl, l) => l.slappVarde,
    gor: (s, sl, l, t) => {
      const vl = s.varld;
      if (!vl || sl.ruta === undefined || !Object.keys(l.slapp).length) return;
      for (const [k, n] of Object.entries(l.slapp)) tappa(sl, k, n);
      GOMMAKROK.lagg?.(s, sl, { ...l.slapp }, t); // en gömma i världen som de minns (steg 12.1.9, gomma.ts)
      dagbok(s, sl, 'ut', `Lasten var för tung; sällskapet gömde ${sakLista(l.slapp)} vid vägen.`, t);
    },
  },
  rasta: {
    namn: 'Rasta', kan: (_s, sl) => (sl.behov?.ork ?? 1) < RESA.orkFartFran, om: () => ({ ork: 1 }), kost: (_s, _sl, l) => RESA.rastTim / 24 * l.n * RESA.tidKost,
    gor: (s, sl, _l, t) => { sl.forlorat = (sl.forlorat ?? 0) + RESA.rastTim; behovOf(sl).ork = 1; dagbok(s, sl, 'ut', `Sällskapet rastade i ${spelTid(RESA.rastTim * HOUR)} för att vila upp sig.`, t); },
  },
  vanda: {
    namn: 'Vända hem', kan: (_s, sl) => sl.skede === 'ute', kost: (_s, _sl, l) => l.varde + l.hem / Math.max(1e-9, l.f0) * l.n * RESA.tidKost - l.kvar / Math.max(1e-9, l.f0) * l.n * RESA.tidKost, // resan ger inget, och vägen hem kostar i stället
    gor: (s, sl, l, t) => { vandHem(s, sl); count(s, 'resa vände'); dagbok(s, sl, 'ut', `${l.langsam.name} går för långsamt; sällskapet vände hem.`, t); },
  },
  lamna: {
    namn: 'Lämna personen', kan: (_s, sl, l) => l.langsam.id !== sl.ledare && l.n >= 2, om: (_s, _sl, l) => ({ utan: l.langsam.id }),
    kost: (s, _sl, l) => RESA.lamnaKost * (l.led ? Math.max(0, 1 + RESA.lamnaEmpati * (stat(l.led, 'empati', s.now) - 10) / 10) * Math.max(0, 1 + RESA.lamnaTycke * getRel(s, l.led, l.langsam).op / 100) : 1),
    gor: (s, sl, l, t) => lamnaKvar(s, sl, l.langsam, t),
  },
};
export const UTVAG_IDS = Object.keys(UTVAGAR);
// läget när någon är långsam: den långsammaste som går själv, dygnen kvar (i fart 1) och hem, och det som kan släppas
export function utvagLage(s: State, sl: Sallskap, t = s.now): UtvagLage | undefined {
  const folk = resenarer(s, sl).filter(p => !bars(sl, p.id)), langsam = folk.reduce<Person | undefined>((a, p) => !a || personFart(s, p) < personFart(s, a) ? p : a, undefined);
  if (!langsam) return undefined;
  const m = matLage(s, sl, t), f0 = sallskapFart(s, sl);
  const vagKvar = sl.skede === 'hemat' ? m.kvar : m.kvar - stannarFor(sl); // dygnen i gång, utan tiden framme
  // det som kan släppas: allt i packningen, en sak i taget, den som kostar minst per vunnen marginal (bärförmågan minus lasten,
  // med den prövade packningen: en packsadel som släpps tar djurets lass med sig) först, tills lasten inte bromsar (steg
  // 12.1.250). Maten, vattnet, fodret och tälten är värda mycket (RESA.behovVarde) så länge de behövs för dygnen som återstår
  // (steg 12.1.145), annars bara sitt grundvärde
  const slapp: Record<string, number> = {}; let slappVarde = 0;
  const pack = { ...sl.pack }, behov = resBehov(sl, m.kvar, resenarer(s, sl).length);
  const kostar = (k: string) => grundvarde(k) + (behovKvar(pack, behov, k) ? RESA.behovVarde : 0);
  const marg = (pk: Record<string, number>) => { const l = lastLage(s, sl, { pack: pk }); return l.bar - l.vikt; };
  while (lastFart(s, sl, { pack }) < 1) {
    let bast: string | undefined, bv = Infinity;
    const m0 = marg(pack);
    for (const k of Object.keys(pack).sort()) {
      if ((pack[k] ?? 0) < 1) continue;
      const vinst = marg({ ...pack, [k]: pack[k]! - 1 }) - m0;
      if (vinst <= 1e-9) continue;
      const v = kostar(k) / vinst;
      if (v < bv) { bv = v; bast = k; }
    }
    if (!bast) break;
    slappVarde += kostar(bast); pack[bast]! -= 1; slapp[bast] = (slapp[bast] ?? 0) + 1;
  }
  if (lastFart(s, sl, { pack }) < 1) { for (const k of Object.keys(slapp)) delete slapp[k]; slappVarde = 0; } // hjälper det inte släpps inget
  return { n: folk.length + (sl.buren?.length ?? 0), varde: m.varde, kvar: Math.max(0, vagKvar * f0), hem: m.hem * f0, f0, langsam, led: resenarer(s, sl).find(p => p.id === sl.ledare), slapp, slappVarde };
}
// det resan behöver för dygnen som återstår (steg 12.1.145): maten (portionerna i alla sorter tillsammans), en vattensäck per
// resenär, fodret till djuren och tälten
export function resBehov(sl: Sallskap, dygn: number, n: number): Record<string, number> {
  return { mat: Math.ceil(n * RESA.matPerDygn * dygn - 1e-9), vattensack: n, torrgras: Math.ceil(sl.djur.length * RESA.foderPerDygn * dygn - 1e-9), talt: Math.ceil(n / RESA.talt) };
}
// behövs den sista av sakerna k i packningen för resan, så att den inte går att släppa utan att något saknas?
function behovKvar(pack: Record<string, number>, behov: Record<string, number>, k: string) {
  if (FOOD.includes(k)) return FOOD.reduce((a, q) => a + Math.floor(pack[q] ?? 0), 0) <= (behov.mat ?? 0);
  return k in behov && Math.floor(pack[k] ?? 0) <= behov[k]!;
}
// poängen för varje utväg som går: resans värde minus dygnen i den fart utvägen ger minus det den kostar
export function utvagVal(s: State, sl: Sallskap, t = s.now) {
  const l = utvagLage(s, sl, t);
  if (!l) return undefined;
  const val = UTVAG_IDS.filter(id => UTVAGAR[id]!.kan?.(s, sl, l) ?? true).map(id => {
    const u = UTVAGAR[id]!, om = u.om?.(s, sl, l) ?? {}, f = sallskapFart(s, sl, om), n = om.utan !== undefined ? l.n - 1 : l.n;
    return { id, sc: l.varde - l.kvar / Math.max(1e-9, f) * n * RESA.tidKost - (u.kost?.(s, sl, l) ?? 0) };
  }).sort((a, b) => b.sc - a.sc || (a.id < b.id ? -1 : 1));
  return { l, val };
}
// varje bit: den som bärs och inte längre är långsam går själv, och är någon långsam väger ledaren utvägarna (högst var
// RESA.utvagOmTim timme)
function langsamma(s: State, sl: Sallskap, t: number) {
  if (sl.buren?.length) {
    sl.buren = sl.buren.filter(([id]) => { const p = s.people.find(q => q.id === id); return !!p && alive(p) && sl.medl.includes(id) && personFart(s, p) < RESA.langsam; });
    if (!sl.buren.length) delete sl.buren;
  }
  if (t < (sl.utvagNasta ?? 0)) return;
  const folk = resenarer(s, sl).filter(p => !bars(sl, p.id));
  if (!folk.some(p => personFart(s, p) < RESA.langsam)) return;
  sl.utvagNasta = t + RESA.utvagOmTim * HOUR;
  const v = utvagVal(s, sl, t), bast = v?.val[0];
  if (!v || !bast) return;
  count(s, `resa utväg ${UTVAGAR[bast.id]!.namn.toLowerCase()}`);
  UTVAGAR[bast.id]!.gor(s, sl, v.l, t);
}
// den långsamma lämnas: hen går hem ensam i sitt eget sällskap, med en del av maten och vattnet
function lamnaKvar(s: State, sl: Sallskap, p: Person, t: number) {
  const vl = s.varld;
  if (!vl) return;
  sl.medl = sl.medl.filter(id => id !== p.id);
  if (sl.buren) { sl.buren = sl.buren.filter(b => b[0] !== p.id); if (!sl.buren.length) delete sl.buren; }
  const ny = nyttSallskap(s, p, sl.mal, sl.skal);
  if (!ny) return;
  ny.skede = 'hemat'; ny.ruta = sl.ruta; ny.ut = sl.ut; ny.borjan = sl.borjan; ny.behov = { ...behovOf(sl), fulla: 0, foder: 0 };
  const n = resenarer(s, sl).length + 1;
  for (const k of [...FOOD, 'vattensack']) { const m = Math.floor((sl.pack[k] ?? 0) / n); if (m > 0) { tappa(sl, k, m); ny.pack[k] = m; } }
  ny.behov.fulla = Math.floor(ny.pack.vattensack ?? 0);
  vandHem(s, ny);
  count(s, 'resa lämnade');
  dagbok(s, sl, 'ut', `${p.name} gick för långsamt och lämnades att gå hem ensam.`, t);
  dagbok(s, ny, 'ut', `Lämnades av sällskapet och går hem ensam.`, t);
}
// gruvan sällskapet reser till (steg 12.2.13): målets sort, silvergruvan om målet inte är en järngruva
function gruvaFor(s: State, sl: Sallskap) { const q = slMal(s, sl); return q?.k === 'jarngruva' ? 'jarngruva' : 'silvergruva'; }
const gruvSakFor = (s: State, sl: Sallskap) => GRUVSAK[gruvaFor(s, sl)].sak;
