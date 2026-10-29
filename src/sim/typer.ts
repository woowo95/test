import type { Act } from './handlingar';
export type { Act } from './handlingar';

// Samhällssimulatorn – simuleringskärna (ingen grafik här)
// Tidsmodell: 1 verkligt dygn = 1 levnadsår. En tidsålder = 1 vecka. Ljus tid 07–19 lokal tid.

export const SEC = 1000; // millisekunder på en sekund: tider i spelet är i ms
export const MIN = 60 * SEC;
export const HOUR = 3600 * SEC;
export const HOUR_S = 3600; // en timme i sekunder (dtSec / HOUR_S = timmar)
export const DAY = 24 * HOUR; // = ett levnadsår
export const WEEK = 7 * DAY; // = en tidsålder

// kartans storlek: varje by har sin egen (nya NEW_W×NEW_H). useMap(s) väljer byns karta och anropas när en by skapas,
// räknas fram eller visas. En äldre by (64×40 eller 80×50) får den stora kartan när den laddas (steg 2.10.9, kartflytt.ts):
// den gamla kartan ligger kvar i mitten med sitt hörn i (OX, OY) och sin storlek W0×H0, och allt som kommer ur kartans brus
// räknas från det hörnet, så att det gamla ser ut som förut. Utanför den fortsätter samma brus. En ny by har OX = OY = 0
export let W = 64;
export let H = 40;
export let OX = 0, OY = 0, W0 = 64, H0 = 40;
export const NEW_W = 120, NEW_H = 120;
export interface Kart { x: number; y: number; w: number; h: number } // den gamla kartans hörn och storlek
let KARTA = '64x40';
export function useMap(s: { W?: number; H?: number; kart?: Kart }) {
  W = s.W ?? 64; H = s.H ?? 40;
  OX = s.kart?.x ?? 0; OY = s.kart?.y ?? 0; W0 = s.kart?.w ?? W; H0 = s.kart?.h ?? H;
  KARTA = s.kart ? `${W}x${H}+${OX},${OY},${W0}x${H0}` : `${W}x${H}`;
}
export const kartNamn = () => KARTA; // kartans storlek och den gamla kartans plats: samma namn = samma karta för samma frö
export const mapKey = (seed: number) => `${seed}:${KARTA}`;
export const inMap = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H; // punkten eller rutan ligger på kartan

// Gränssnittet läser byn mellan stegen, och då är visning.pa sann (i webbläsaren, utom i step, createState och migrate, som
// räknar som simuleringen: `simulera`). En cache vars svar beror på när det räknas och inte bara på nyckeln har två delar
// (`tvaDelar`): sim fylls bara av simuleringen, och gränssnittet läser den när nyckeln stämmer men räknar annars i bild.
// Så utvecklas byn likadant vad gränssnittet än läser (regel 4 i ARKITEKTUR.md, scenariot ui-ren)
export const visning = { pa: false };
export interface TvaDelar<V> { sim: WeakMap<State, V>; bild: WeakMap<State, V> }
export const tvaDelar = <V>(): TvaDelar<V> => ({ sim: new WeakMap(), bild: new WeakMap() });
export const egen = <V>(c: TvaDelar<V>) => (visning.pa ? c.bild : c.sim); // delen som den som räknar nu fyller
export function simulera<T>(fn: () => T): T {
  const v = visning.pa;
  visning.pa = false;
  try { return fn(); } finally { visning.pa = v; }
}

export enum T { Vatten, Sand, Gras, Skog, Sten }

export const STATS = ['styrka', 'uthallighet', 'intelligens', 'nyfikenhet', 'karisma', 'skonhet', 'flit', 'empati', 'mod', 'minne', 'smidighet', 'aggression'] as const; // smidighet och aggression: steg 3.7.6
export type Stat = typeof STATS[number];
export const STAT_NAMES: Record<Stat, string> = {
  styrka: 'Styrka', uthallighet: 'Uthållighet', intelligens: 'Intelligens', nyfikenhet: 'Nyfikenhet',
  karisma: 'Karisma', skonhet: 'Skönhet', flit: 'Flit', empati: 'Empati', mod: 'Mod', minne: 'Minne', smidighet: 'Smidighet', aggression: 'Aggression',
};
// vad varje egenskap påverkar utöver arbetena som har den som egenskap (ACTS), med orden personrutan visar.
// Skriv till en rad när simuleringen börjar fråga efter egenskapen på ett nytt ställe
export const STAT_GOR: Record<Stat, string[]> = {
  styrka: ['Hur mycket hen orkar bära'],
  uthallighet: ['Att fisken sitter kvar när den nappat'],
  intelligens: ['Hur fort hen lär sig färdigheter, lärdomar och tekniker', 'Att tända elden', 'Att känna igen svamp', 'Att väljas till byggare'],
  nyfikenhet: ['Att komma på nya tekniker', 'Hur långt bort hen går på promenad', 'Att lita på platser hen inte känner', 'Att tända byns allra första eld'],
  karisma: ['Att dela med sig av lärdomar i samtal', 'Hur charmig hen är i samtal', 'Hur mycket hens röst väger när byns seder ändras'],
  skonhet: ['Hur charmig och attraktiv hen är i samtal'],
  flit: ['Pliktkänslan', 'Lusten att göra hantverk, också på kvällen', 'Att fylla på elden i rätt tid'],
  empati: ['Att trösta och ge gåvor', 'Att aldrig ta något utan lov, när den är hög', 'Att vilja ha eld när andra fryser', 'Hur ofta hen pratar med andra', 'Pliktkänslan'],
  mod: ['Att väljas till nattvakt', 'Hur långt bort hen vågar gå', 'Att inte låta rädslor styra'],
  minne: ['Hur länge hen minns platser och lärdomar'],
  smidighet: ['Att inte råka ut för olyckor i arbetet', 'Att fånga kaniner', 'Att fisken sitter kvar när den nappat', 'Hur fort hen tar sig fram i skog och snår', 'Hur fint det blir som hen tillverkar', 'Hur snabb hen är och hur bra hen duckar i en strid'],
  aggression: ['Att slå i stället för att gråta när hen mår dåligt', 'Att gräla', 'Hur hårt hen straffar som ledare', 'Blodtörsten: att vilja döda, med låg empati och dåligt humör', 'Att inte ge sig i en strid'],
};
export const SKILLS = ['samla', 'jakt', 'fiske', 'ved', 'hantverk', 'berattande', 'elda', 'matlagning', 'narstrid', 'traff'] as const; // matlagning: steg 2.8.1 (matlagning.ts); narstrid, traff: steg 3.7.2 (strid.ts)
export type Skill = typeof SKILLS[number];
export const SKILL_NAMES: Record<Skill, string> = {
  samla: 'Samling', jakt: 'Jakt', fiske: 'Fiske', ved: 'Trähuggning', hantverk: 'Hantverk', berattande: 'Berättande', elda: 'Eldkonst', matlagning: 'Matlagning', narstrid: 'Närstrid', traff: 'Träffsäkerhet',
};
// vad varje färdighet påverkar utöver arbetena som övar den (ACTS arbete), och hur den växer
export const SKILL_GOR: Record<Skill, string[]> = {
  samla: ['Att känna igen svamp'],
  jakt: [],
  fiske: ['Att fisken sitter kvar när den nappat'],
  ved: [],
  hantverk: ['Hur fort hen tillverkar och bygger', 'Att väljas till byggare', 'Lusten att göra hantverk'],
  berattande: ['Lusten att berätta på kvällen'],
  elda: ['Att tända elden', 'Att fylla på elden i rätt tid'],
  matlagning: ['Att inte bränna maten vid grillen'],
  narstrid: ['Att träffa, parera och slå hårt i en strid', 'Växer av slagsmål och brottning på lek'],
  traff: ['Att träffa med ett kast eller skott', 'Växer av kastlek och jakt'],
};

export const AGES = ['Istid', 'Vårtid', 'Sommartid', 'Hösttid'];
// det som står i händelseloggen när tidsåldern börjar (steg.ts), i samma ordning
export const AGES_BORJAR = ['Istiden har börjat. Sjön fryser och maten blir knapp.', 'Vårtiden har kommit. Isen släpper och marken tinar.', 'Sommartiden är här. Bär och fisk finns i överflöd.', 'Hösttiden har börjat. Nu gäller det att samla inför istiden.'];

export const GREN = 0.4; // en gren ger lika mycket bränsle som 0,4 ved: grenar brinner fort

export interface Thought { text: string; v: number; until: number }
// Det en person håller på med (p.task, sparas med personen). Fälten utan frågetecken finns alltid
export interface Task {
  act: Act; // handlingen (handlingar.ts)
  phase: 'go' | 'do' | 'back'; // på väg dit, arbetar där, på väg hem med det som bärs
  tx: number; ty: number; // platsen man går till och arbetar på
  until: number; // tiden då uppgiften är slut (ms)
  carry: number; // det som bärs, i enheten som handlingens `ger` anger
  items?: Record<string, number>; // saker som bärs bredvid bördan, per slag (rötter, svamp, grenar, materialet till ett bygge)
  cond?: Record<string, number>; // skicket på det som bärs, per slag (lager.ts)
  ag?: Record<string, Record<string, number>>; // vems det som bärs är, per slag (egendom.ts)
  ting?: number[]; // redskapen i bördan (agande.ts)
  why?: string; // varför personen valde uppgiften
  dark?: boolean; // påbörjad under mörk tid
  path?: number[]; // rutorna kvar att gå längs vägen (steg.ts, walk)
  runda?: number; varv?: number; stopp?: number; vidEld?: boolean; // vaktens runda: stoppet hen är vid, antal stopp sedan elden, när stoppet är slut, om hen står vid elden (vakt.ts)
  pk?: string; // nyckeln som vägen gäller för: målet och byggversionen. Ändras den räknas vägen om
  ref?: number; // det arbetet gäller: stammen som huggs, biten som byggs eller huset som ett träd fälls för
  prog?: number; // fiske: sekunder arbete mot nästa försök
  jf?: Jaktforsok; // jakten: försöket som pågår (jakt.ts, Björn efter v159)
  tool?: string; // redskapet som används, t.ex. fiskespjut, eller slaget av bygge eller hantverk (vagg, golv, laga, rep)
  tur?: number; // sekunder arbete sedan bördan bars hem sist
  lim?: number; // hur länge en tur varar (sekunder), innan bördan bärs hem
  res?: { x: number; y: number; until: number }; // var och till när arbetet fortsätter efter att bördan bärts hem
  site?: { x: number; y: number }; // bygget man går till efter att ha hämtat material
  mask?: number; // fiske: maskar på kroken till metspöet
  hal?: number; // fiske: sekunder kvar att hugga på hålet i isen (steg 2.11.3, is.ts); 0 = hålet är upphugget
  fran?: number; // den man tar ved av till elden (stöld, behov.ts)
  kom?: Record<string, number>; // var materialet till bygget kom ifrån (bygg.ts)
  sok?: true; // letar flinta eller stenar vid stenarna: blir platsen tom fortsätter man ändå i stället för att gå hem (steg.ts, workStep)
  pass?: number; // när ett pass med redskap som görs är slut (ms): blir ett klart före det görs ett till om byn vill ha fler (steg 2.3.8)
  tandmat?: true; // samlar tändmaterial åt en släckt eld: blir platsen tom på bär fortsätter man tills tändmaterialet räcker (steg.ts, workStep)
  bar?: number; // vården: den skadade som bärs hem (halsa.ts, steg 2.5.2)
  vatten?: number; // vattensäcken: rutan där den fylldes, vars smuts följer med vattnet (torst.ts, steg 2.10.1)
}

// ett jaktförsök (jakt.ts): planerat när det börjar och avgjort när det är slut, så att gränssnittet kan visa hur jägaren
// smyger, siktar och kastar. t = när det började; kaninen (id) satt vid x, y och jägaren stod vid sx, sy. stopp = hur nära
// kaninen jägaren smyger (rutor), kast = avståndet hen kastar från (−1 = inget kast), sett = kaninen såg jägaren innan hen
// slog till, extra = sekunder efter smygandet (att hämta spjutet eller leta en ny sten). g och blod: träffens grad och
// kaninens blod efter den
export interface Jaktforsok {
  t: number; id: number; x: number; y: number; sx: number; sy: number; v: string;
  stopp: number; kast: number; sett: boolean; ut: 'fangad' | 'skadad' | 'miss' | 'flydde'; hand?: true; extra: number; g: number; blod: number;
}

export interface Person {
  id: number; name: string; sex: 'm' | 'k';
  born: number; died?: number; cause?: string; left?: number;
  grundare?: true | 'ny'; // grundade byn, eller grundade den på nytt (steg 3.9.7)
  mother?: number; father?: number; partner?: number;
  rngs?: Record<string, number>; // var i sina egna slumpföljder personen är (slump.ts)
  pot: Record<Stat, number>; skill: Record<Skill, number>;
  delar?: Record<string, number>; // arbetet mot nästa hela sak, per slag (steg 2.10.7, lager.ts)
  hunger: number; rest: number; social: number; health: number;
  blot?: number; // hur blöt personen är av regnet, 0 till 1 (steg 2.11.1, vader.ts)
  warm: number; // kroppsvärme 0–1
  toa: number; // 1 = inget behov, 0 = olycka
  torst: number; // 1 = släckt, 0 = uttorkad (steg 2.4.1, torst.ts)
  blod: number; // 1 = allt blod, under HALSA.blodDod förblöder man (steg 2.5.1, halsa.ts)
  skador?: import('./halsa').Skada[]; // skadorna som inte läkt än (halsa.ts)
  naring?: Record<import('./naring').Naring, number>; // näringsvärdena 0–1; mättnaden (hunger) är en sammanfattning av dem (steg 2.6.1, naring.ts)
  langtan?: Partial<Record<import('./naring').Naring, number>>; // vad andra berättat att de längtar efter, och till när man minns det (steg 2.6.2)
  habit: Record<string, number>; // timmar per aktivitet, bleknar med tiden (ger yrkestaggar)
  sickUntil?: number; sickWhy?: string; poisonUntil?: number; stulet?: { av: number; k: string; n: number; l?: boolean }[]; pregnantSince?: number; pregnantBy?: number; lastBirth?: number; guardDay?: number; // pregnantBy: barnets far; guardDay: dygnet hen valdes till nattens vakt
  fiske?: { f: number; n: number; k: number }; // fiske med händerna: försök, napp och fångade fiskar
  tek?: Record<string, number>; // teknik: hur nära personen är att komma på något, 1 = kan det
  kunskap?: Record<string, { v: number; t: number }>; // det personen kan (alltid rätt), 0–1, och när det senast användes
  lardomar?: Lardom[]; // det personen tror om platser (kan vara fel, överdrivet eller inaktuellt)
  thoughts: Thought[];
  x: number; y: number; task?: Task;
  fame: string[];
  kallad?: string[]; // yrkestaggar personen redan fått, så att det bara står i loggen första gången
  hue: number;
  tag?: string; // yrkestagg efter vad personen ägnar mest tid åt
  // relationstyperna (steg 3.1.1, relationer.ts), räknade en gång i timmen: bästa vän, ärkefiende, rivaler (och yrket man tävlar
  // i, om någon rival har samma), och för den unga mentorn och färdigheten mentorn lär ut
  bast?: number; arke?: number; rivaler?: number[]; rivalom?: string; mentor?: number; mentorSk?: Skill;
  // uppväxten (steg 3.1.2, uppvaxt.ts): det hen var med om som barn, och anlagen (det hen föddes med, som barnen ärver).
  // p.pot är anlagen plus upplevelserna; anlag saknas så länge hen inte har någon upplevelse
  upp?: Upplevelse[]; anlag?: Record<Stat, number>;
  prat?: import('./berattelser').Prat; // det senaste samtalet: med vem och om vad (steg 3.9.5, berattelser.ts)
  binamn?: import('./berattelser').Binamn; // öknamnet eller hedersnamnet byn gav (steg 3.9.1, berattelser.ts)
  varsel?: { k: import('./motgang').MotgangId; t: number; c: number; src?: number }; // en motgång som personen anar eller hört om: när den börjar och hur säker (steg 3.8.1, motgang.ts)
  forv?: { f: number; w: number }; // förväntan och rikedom (humor.ts, steg 3.2.1)
  // utbrotten (steg 3.2.2, humor.ts): hur många nyss (klingar av), och det som väntar på att brista ut (slaget och när)
  utb?: number; ubr?: { k: string; t: number };
  lekt?: number; // när ett barn senast lekte (färre utbrott efteråt, steg 3.2.4)
  larm?: import('./rykten').Larm; // det senaste larmet man hört (steg 3.7.11, rykten.ts)
  intryck?: import('./rykten').Intryck[]; // det personen tycker att andra är, och varför (steg 3.3, rykten.ts)
  smak?: Record<string, number>; // tycke och smak: 'a:' + arbete, 'm:' + mat eller 'v:' + vapen (steg 3.7.10), -1 till 1 (steg 3.3.5, rykten.ts)
  reservAlltid?: true; // blev ifattsprungen utan reservvapen: tar alltid med ett i strid (steg 3.7.7, strid.ts)
  liv?: Record<string, number>; // det hen varit med om och gjort, i tal: vargar hen dödat, folk hen vårdat, hus, svält hen överlevt … och 't:' + slaget = när det senast räknades (steg 3.9.8, folk.ts livet)
  skam?: number; // straffad med skam av ledaren: håller sig undan elden och samtalen till dess (steg 3.5.3, styre.ts)
}
// en upplevelse i barndomen: slaget (UPPLEVELSER i uppvaxt.ts), åldern (år), när, vad den gjorde med egenskaperna och vem
// eller vad den gällde
export interface Upplevelse { k: import('./uppvaxt').UpplevelseTyp; a: number; t: number; e: Partial<Record<Stat, number>>; om?: string }

// En lärdom om en plats: k = vad, a = område (8×8 rutor), v = hur mycket (eller hur rädd), c = hur säker (0–1),
// t = när platsen sågs (den som hör det får samma tid; återväxten räknas därifrån), src = vem den hördes av (saknas = egen upplevelse), led = hur många led från den som var där, om = vad som hände.
// Slagen står i registret LARDOMAR i minne.ts
// ny: när någon kom dit och såg att platsen var sämre än man trott (växterna har flyttat eller den är tömd).
// Det är en nyhet som gärna berättas vidare i ett par dygn.
export interface Lardom { k: import('./minne').LKind; a: number; v: number; g?: number; c: number; t: number; src?: number; led?: number; om?: string; ny?: number }

// flags: 1 = nära vänner loggat, 2 = ovänner loggat, 4 = rivaler loggat, 8 = bästa vänner loggat (relationer.ts).
// par: när de blev ett par, gift: när de gifte sig, lart: hur många gånger den äldre lärt den yngre något (steg 3.1.1)
export interface Rel { chem: number; op: number; rom: number; talks: number; flags: number; par?: number; gift?: number; lart?: number; minns?: RelMinne }
// det två har varit med om tillsammans (steg 3.9.6): gräl, slagsmål, lekslagsmål, strider sida vid sida och gåvor åt båda
// hållen (gav[0] är gåvorna från den med lägst id)
export interface RelMinne { gral?: number; slag?: number; lek?: number; sida?: number; gav?: [number, number] }

export interface LogEntry { t: number; text: string; kind: 'birth' | 'death' | 'rel' | 'skill' | 'world' | 'move'; ids: number[] }

export interface State {
  v: number; // numret på den senaste uppgraderingen av sparfilen (UPPGRADERINGAR i varld.ts)
  seed: number; founded: number; now: number;
  rngs?: Record<string, number>; // var i sin slumpföljd varje system är (slump.ts)
  hist?: Historik; // byns historik: nyckeltal och krönika (historik.ts)
  W?: number; H?: number; // kartans storlek (saknas i de äldsta byarna: 64×40)
  kart?: Kart; // var den gamla kartan ligger i en äldre by som fått den stora kartan (steg 2.10.9, kartflytt.ts)
  people: Person[]; rels: Record<string, Rel>; nextId: number;
  food?: number; wood?: number; // äldre sparfiler (före v40): maten och veden i förrådet, nu räknade ur stackarna
  log: LogEntry[];
  lastAgeIdx: number; lastGuardDay?: number; // lastGuardDay: kalenderns dygn då nattens vakt senast valdes (val.ts)
  items?: Record<string, number>; // äldre sparfiler (före v40): sakerna och redskapen i förrådet som summor
  fire: Fire;
  seder: Seder;
  delning?: import('./delning').Delning; // byns rikedom och hur mycket av det nya som ges till byn (delning.ts)
  mark?: string; // markens grästäcke per ruta (stigar), packat
  skog?: string; // trädens tillväxt per ruta, packat
  stockar?: Stock[]; // fällda träd som ligger och väntar på att huggas
  lager?: { x: number; y: number; w: number; h: number }; // lagerplatsen, rutor
  mat?: Record<string, number>; // äldre sparfiler (före v40): maten per slag
  marken?: { x: number; y: number; k: string; n: number }[]; // gamla sparfiler: saker på marken (nu i stackar)
  lagren?: import('./lager').Zone[]; // lagerplatserna
  ting?: import('./agande').Ting[]; nextTing?: number; // varje redskap för sig, det enda som sparas om redskapen: skick, ägare (0 = byn), vem som har det i handen eller bördan, rutan det ligger på stationen det hör till, vem som gjorde det och när, kvaliteten (agande.ts, kvalitet.ts)
  tingVag?: { id: number; k: string; c: number; agare: number; hos?: number }[]; // äldre sparfiler (före v40): redskap som bars mellan lagerplatser
  agare?: Record<string, number[]>; // sparfiler från v30: redskapens ägare (blir s.ting)
  stackar?: { k: string; n: number; c: number; x: number; y: number; ag?: Record<string, number>; dold?: number }[]; // alla stackar med plats och skick (c: 1 = nytt), det enda som sparas om förrådet. ag = vems stacken är (lager.ts)
  delar?: Record<string, Record<string, number>>; forlust?: Record<string, number>; andelRest?: Record<string, number>; // det påbörjade per ägare och slag (under 1), det som försvunnit i delar, tills det blir hela saker, och det som blivit över av var och ens del när byn får en andel (steg 2.10.7, lager.ts)
  egna?: Record<string, Record<string, number>>; egnaT?: Record<string, number>; // äldre sparfiler (före v40): vems sakerna i förrådet var
  stubbar?: { x: number; y: number; t: number }[]; // stubbar efter fällda träd, t = när trädet fälldes
  nextStock?: number; fallda?: number;
  matSnitt?: number; // maten i förrådet i dygn för alla, glidande snitt över ungefär ett år (liv.ts)
  halvfallt?: Record<number, number>; // träd som någon har börjat fälla: ruta -> hur länge (ms) man har arbetat med det (paborjat.ts)
  fynd?: string; // hur mycket som tagits ur varje plats (bär, vilt, fisk), packat
  byggen?: import('./byggnad').Bit[]; hus?: import('./byggnad').Hus[]; byggV?: number; nextBit?: number; byggSok?: number; // väggar, golv och öppningar, husen byn planerat, ändringsräknare
  kunskap?: Record<string, number>; // äldre sparfiler: byns gemensamma kunskap, flyttas till varje person
  kal?: { t0: number; a0: number; b0: number }; // kalendern: tidsåldern a0 började t0 och slutar måndagen b0 (dagens nummer), se tid.ts
  ruttet?: number; // mat som ruttnat bort på sistone (glöms med tiden, byggnader.ts)
  atTakt?: number; atSist?: number; // det byn äter per person och dygn (glidande snitt) och räknaren atit förra timmen (ekonomi.ts, atSteg)
  stat?: Record<string, number>; // räknare: svamp, fiskeförsök, napp, fångst med mera
  sjoar?: Record<number, import('./sjo').SjoStat>; // fiske och bad per sjö (sjo.ts)
  stationer?: import('./stationer').Station[]; nextStation?: number; // arbetsstationerna, som slaktbänken (stationer.ts)
  falt?: import('./odling').Falt[]; nextFalt?: number; // fälten (steg 2.10.3, odling.ts)
  vader?: import('./vader').VaderMinne; // fukten och snön på marken (steg 2.11.1, vader.ts)
  is?: import('./is').IsMinne; // vattnets temperatur och isens tjocklek (steg 2.11.3, is.ts)
  brasa?: { vill: number; x: number; y: number }; // byn vill ha en brasa (0 till 1) nära mitten av sovplatserna x, y (brasor.ts, räknas varje timme)
  flackar?: import('./smuts').Flack[]; // fläckar på marken som bleknar: toa-smutsen (smuts.ts)
  blod?: import('./blod').Blodflack[]; // blodet på marken (bara utseende, blod.ts)
  hygien?: number; // hur mycket byn vet om att toa-smutsen gör vattnet sjukt (0–1, smuts.ts, steg 2.7.2)
  styre?: import('./styre').Styre; // ledaren, påbuden, straffen och vågskålarna (steg 3.5, styre.ts)
  djurHalsa?: import('./djur').DjurHalsa[]; djurDoda?: { id: number; t: number }[]; // skadade och dödade djur (steg 3.7.13, djur.ts)
  motgang?: { varslad?: number; pagar?: { k: import('./motgang').MotgangId; t: number; dog: number } }; // motgången som byn varslats om (när den börjar) och den som pågår (steg 3.8.1, motgang.ts)
  vargar?: Vargflock[]; vargNr?: number; // vargflockarna på kartan och hur många som kommit (steg 3.7.1, varg.ts)
  djurSkramd?: { g: number; t: number }[]; // kaningrupper som skrämts av en jägare, och när (steg 3.7.3, jakt.ts)
  strider?: import('./strid').StridMinne[]; // de senaste striderna i byn, så att arenan kan visa dem igen (steg 3.7.2, strid.ts)
}
// en vargflock (steg 3.7.1, varg.ts): vargarnas id (den första leder flocken), var den är och vart den går (mx, my), när den
// kom och när den drar vidare, hungern (0–1), vad den gör, personen den anfaller, när den senast sågs och jägarna efter den.
// dorr = öppningen (rutan) där den väntar utanför en stängd dörr, och vantar = sedan när (steg 3.7.21)
export interface Vargflock { id: number; vargar: number[]; x: number; y: number; mx: number; my: number; kom: number; gar: number; hunger: number; gor: 'stryker' | 'smyger' | 'anfaller' | 'vantar' | 'flyr'; byte?: number; sedd?: number; jagare?: number[]; samlas?: number; dorr?: { x: number; y: number }; vantar?: number; trottnat?: true }
// ett fällt träd: ved och grenar som finns kvar att hugga ut
export interface Stock { id: number; x: number; y: number; ved: number; grenar: number; mossa?: number } // mossa på stammen (steg 2.5.2)

// ---------- seder ----------
// Byns gemensamma värderingar, -1..1. Registret (SEDER) står i seder.ts.
// v = sederna nu, ev = tillskott från händelser (bleknar), at = senaste omräkning
export interface Seder { v: Record<import('./seder').Sed, number>; ev: Record<import('./seder').Sed, number>; log: { t: number; text: string }[]; at?: number }

// ---------- eldstäder och tänddon ----------
// Bara lägerelden går att ha i dag. De andra är förberedda och byggs när bygg- och teknikträdet finns.
// spread = relativ risk att elden tar sig ut i omgivningen (används när brandsystemet finns).
export interface Hearth { id: string; name: string; desc: string; indoor: boolean; maxFuel: number; burn: number; radius: number; comfort: number; spread: number; requires: string }
export const HEARTHS: Hearth[] = [
  { id: 'lagereld', name: 'Lägereld', desc: 'Trä staplat på marken innanför en ring av stenar. Lätt att göra, men mycket värme går förlorad och den kan inte stå inomhus.', indoor: false, maxFuel: 6, burn: 0.5, radius: 5, comfort: 0.04, spread: 1, requires: 'Eld' },
  { id: 'stenring', name: 'Stenring', desc: 'Elden ligger i en ring av stenar som håller glöden samlad och stänger ute vinden.', indoor: false, maxFuel: 8, burn: 0.45, radius: 5.5, comfort: 0.05, spread: 0.5, requires: 'Stenhuggning' },
  { id: 'hard', name: 'Härd', desc: 'Stensatt härd i golvet med rökhål i taket. Den första elden som går att ha inomhus.', indoor: true, maxFuel: 10, burn: 0.4, radius: 6, comfort: 0.07, spread: 0.3, requires: 'Bofast by' },
  { id: 'murad', name: 'Murad eldstad', desc: 'Eldstad av sten och lera med rökgång. Röken leds ut och värmen stannar i rummet.', indoor: true, maxFuel: 14, burn: 0.35, radius: 7, comfort: 0.09, spread: 0.12, requires: 'Murning' },
  { id: 'kakelugn', name: 'Kakelugn', desc: 'Lagrar värmen i tegel och kakel och värmer länge efter att träet brunnit ut.', indoor: true, maxFuel: 18, burn: 0.3, radius: 8, comfort: 0.11, spread: 0.03, requires: 'Keramik, murning' },
];
// chance = chans per försök, grass/sticks = tändmaterial per försök, minutes = tid per försök
export interface Igniter { id: string; name: string; desc: string; chance: number; grass: number; sticks: number; minutes: number; requires: string }
export const IGNITERS: Igniter[] = [
  { id: 'flinta', name: 'Flinta', desc: 'Flintan slås mot en annan sten så att gnistor faller i tändmaterialet. Kräver tålamod och mycket tändmaterial.', chance: 0.025, grass: 3, sticks: 3, minutes: 15, requires: '–' },
  { id: 'bagborr', name: 'Bågborr', desc: 'En pinne snurras snabbt mot en träskiva med hjälp av en båge tills glöd bildas.', chance: 0.2, grass: 2, sticks: 1, minutes: 10, requires: 'Träbearbetning' },
  { id: 'eldstal', name: 'Eldstål och flinta', desc: 'Stål mot flinta ger heta gnistor som fångas i fnöske.', chance: 0.45, grass: 1, sticks: 1, minutes: 5, requires: 'Smide' },
  { id: 'tandstickor', name: 'Tändstickor', desc: 'Tänds med ett drag.', chance: 0.9, grass: 0.5, sticks: 0.5, minutes: 1, requires: 'Kemi' },
];

// nyckeltalen i tal-ordning: [tid, värde, värde, …] per timme och per dygn, och krönikans rader [tid, text]
export interface Historik { tal: string[]; tim: number[][]; dygn: number[][]; kronika: ([number, string] | [number, string, string])[] }
export interface FireLog { t: number; k: 'tänd' | 'fyll' | 'slocknade' | 'glöd' | 'sprack'; id?: number; n?: number }
export interface Fire {
  hearth: string; fuel: number; lit: boolean; emberUntil?: number; ring?: boolean; // ringen av stenar runt eldplatsen
  litAt?: number; litBy?: number; burned: number; // denna eld
  totalBurned: number; litSec: number; lightings: number; outs: number;
  tries: number; tryTotal: number; tryProg: number; // försök sedan elden senast brann, totalt, sekunder in i pågående försök
  fills: Record<string, number>; log: FireLog[];
  want?: number; wantBy?: number; wantWhy?: string; // största önskan om ved på elden just nu, och vems
  ash?: number; ashUntil?: number; // kolhög efter en utbrunnen eld
  at?: { x: number; y: number }; // var elden står om den flyttats (steg 2.10.4); annars där kartan lade den (getMap(seed).fire)
  flytt?: { x: number; y: number; varfor: 'plats' | 'vuxit' }; // elden ska flyttas hit (eldflytt.ts)
}
