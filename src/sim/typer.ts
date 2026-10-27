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

// kartans storlek: varje by har sin egen (äldre byar 64×40, nya NEW_W×NEW_H). useMap(s) väljer byns karta och
// anropas när en by skapas, räknas fram eller visas.
export let W = 64;
export let H = 40;
export const NEW_W = 80, NEW_H = 50;
export function useMap(s: { W?: number; H?: number }) { W = s.W ?? 64; H = s.H ?? 40; }
export const mapKey = (seed: number) => `${seed}:${W}x${H}`;
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

export const STATS = ['styrka', 'uthallighet', 'intelligens', 'nyfikenhet', 'karisma', 'skonhet', 'flit', 'empati', 'mod', 'minne'] as const;
export type Stat = typeof STATS[number];
export const STAT_NAMES: Record<Stat, string> = {
  styrka: 'Styrka', uthallighet: 'Uthållighet', intelligens: 'Intelligens', nyfikenhet: 'Nyfikenhet',
  karisma: 'Karisma', skonhet: 'Skönhet', flit: 'Flit', empati: 'Empati', mod: 'Mod', minne: 'Minne',
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
};
export const SKILLS = ['samla', 'jakt', 'fiske', 'ved', 'hantverk', 'berattande', 'elda'] as const;
export type Skill = typeof SKILLS[number];
export const SKILL_NAMES: Record<Skill, string> = {
  samla: 'Samling', jakt: 'Jakt', fiske: 'Fiske', ved: 'Trähuggning', hantverk: 'Hantverk', berattande: 'Berättande', elda: 'Eldkonst',
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
};

export const AGES = ['Istid', 'Vårtid', 'Sommartid', 'Hösttid'];

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
  pk?: string; // nyckeln som vägen gäller för: målet och byggversionen. Ändras den räknas vägen om
  ref?: number; // det arbetet gäller: stammen som huggs, biten som byggs eller huset som ett träd fälls för
  prog?: number; // fiske: sekunder arbete mot nästa försök
  tool?: string; // redskapet som används, t.ex. fiskespjut, eller slaget av bygge eller hantverk (vagg, golv, laga, rep)
  tur?: number; // sekunder arbete sedan bördan bars hem sist
  lim?: number; // hur länge en tur varar (sekunder), innan bördan bärs hem
  res?: { x: number; y: number; until: number }; // var och till när arbetet fortsätter efter att bördan bärts hem
  site?: { x: number; y: number }; // bygget man går till efter att ha hämtat material
  mask?: number; // fiske: maskar på kroken till metspöet
  fran?: number; // den man tar ved av till elden (stöld, behov.ts)
  kom?: Record<string, number>; // var materialet till bygget kom ifrån (bygg.ts)
  sok?: true; // letar flinta eller stenar vid stenarna: blir platsen tom fortsätter man ändå i stället för att gå hem (steg.ts, workStep)
  pass?: number; // när ett pass med redskap som görs är slut (ms): blir ett klart före det görs ett till om byn vill ha fler (steg 2.3.8)
  tandmat?: true; // samlar tändmaterial åt en släckt eld: blir platsen tom på bär fortsätter man tills tändmaterialet räcker (steg.ts, workStep)
  bar?: number; // vården: den skadade som bärs hem (halsa.ts, steg 2.5.2)
}

export interface Person {
  id: number; name: string; sex: 'm' | 'k';
  born: number; died?: number; cause?: string; left?: number;
  mother?: number; father?: number; partner?: number;
  rngs?: Record<string, number>; // var i sina egna slumpföljder personen är (slump.ts)
  pot: Record<Stat, number>; skill: Record<Skill, number>;
  hunger: number; rest: number; social: number; health: number;
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
}

// En lärdom om en plats: k = vad, a = område (8×8 rutor), v = hur mycket (eller hur rädd), c = hur säker (0–1),
// t = när platsen sågs (den som hör det får samma tid; återväxten räknas därifrån), src = vem den hördes av (saknas = egen upplevelse), led = hur många led från den som var där, om = vad som hände.
// Slagen står i registret LARDOMAR i minne.ts
// ny: när någon kom dit och såg att platsen var sämre än man trott (växterna har flyttat eller den är tömd).
// Det är en nyhet som gärna berättas vidare i ett par dygn.
export interface Lardom { k: import('./minne').LKind; a: number; v: number; g?: number; c: number; t: number; src?: number; led?: number; om?: string; ny?: number }

export interface Rel { chem: number; op: number; rom: number; talks: number; flags: number }
// flags: 1 = nära vänner loggat, 2 = ovänner loggat

export interface LogEntry { t: number; text: string; kind: 'birth' | 'death' | 'rel' | 'skill' | 'world' | 'move'; ids: number[] }

export interface State {
  v: number; // numret på den senaste uppgraderingen av sparfilen (UPPGRADERINGAR i varld.ts)
  seed: number; founded: number; now: number;
  rngs?: Record<string, number>; // var i sin slumpföljd varje system är (slump.ts)
  hist?: Historik; // byns historik: nyckeltal och krönika (historik.ts)
  W?: number; H?: number; // kartans storlek (saknas i äldre byar: 64×40)
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
  ting?: { id: number; k: string; c: number; agare: number; hos?: number; lass?: number; x?: number; y?: number; halv?: { gor: string; av: Record<string, number>; kvar: number; ag: number }; vid?: number; bar?: number; av?: number; gjord?: number }[]; nextTing?: number; // varje redskap för sig, det enda som sparas om redskapen: skick, ägare (0 = byn), vem som har det i handen eller bördan, rutan det ligger på stationen det hör till, vem som gjorde det och när (agande.ts)
  tingVag?: { id: number; k: string; c: number; agare: number; hos?: number }[]; // äldre sparfiler (före v40): redskap som bars mellan lagerplatser
  agare?: Record<string, number[]>; // sparfiler från v30: redskapens ägare (blir s.ting)
  stackar?: { k: string; n: number; c: number; x: number; y: number; ag?: Record<string, number>; dold?: number }[]; // alla stackar med plats och skick (c: 1 = nytt), det enda som sparas om förrådet. ag = vems stacken är (lager.ts)
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
  stat?: Record<string, number>; // räknare: svamp, fiskeförsök, napp, fångst med mera
  sjoar?: Record<number, import('./sjo').SjoStat>; // fiske och bad per sjö (sjo.ts)
  stationer?: import('./stationer').Station[]; nextStation?: number; // arbetsstationerna, som slaktbänken (stationer.ts)
  flackar?: import('./smuts').Flack[]; // fläckar på marken som bleknar: blodet vid slaktbänken (bara utseende) och toa-smutsen (smuts.ts)
  hygien?: number; // hur mycket byn vet om att toa-smutsen gör vattnet sjukt (0–1, smuts.ts, steg 2.7.2)
}
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
export interface Historik { tal: string[]; tim: number[][]; dygn: number[][]; kronika: [number, string][] }
export interface FireLog { t: number; k: 'tänd' | 'fyll' | 'slocknade' | 'glöd' | 'sprack'; id?: number; n?: number }
export interface Fire {
  hearth: string; fuel: number; lit: boolean; emberUntil?: number; ring?: boolean; // ringen av stenar runt eldplatsen
  litAt?: number; litBy?: number; burned: number; // denna eld
  totalBurned: number; litSec: number; lightings: number; outs: number;
  tries: number; tryTotal: number; tryProg: number; // försök sedan elden senast brann, totalt, sekunder in i pågående försök
  fills: Record<string, number>; log: FireLog[];
  want?: number; wantBy?: number; wantWhy?: string; // största önskan om ved på elden just nu, och vems
  ash?: number; ashUntil?: number; // kolhög efter en utbrunnen eld
}
