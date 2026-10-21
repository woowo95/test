import { log } from './folk';
import { chance } from './slump';

// Samhällssimulatorn – simuleringskärna (ingen grafik här)
// Tidsmodell: 1 verkligt dygn = 1 levnadsår. En tidsålder = 1 vecka. Ljus tid 07–19 lokal tid.

export const SEC = 1000;
export const HOUR = 3600 * SEC;
export const DAY = 24 * HOUR; // = ett levnadsår
export const WEEK = 7 * DAY; // = en tidsålder

export const W = 64;
export const H = 40;

export enum T { Vatten, Sand, Gras, Skog, Sten }

export const STATS = ['styrka', 'uthallighet', 'intelligens', 'nyfikenhet', 'vanlighet', 'karisma', 'skonhet', 'flit', 'empati', 'mod', 'minne'] as const;
export type Stat = typeof STATS[number];
export const STAT_NAMES: Record<Stat, string> = {
  styrka: 'Styrka', uthallighet: 'Uthållighet', intelligens: 'Intelligens', nyfikenhet: 'Nyfikenhet',
  vanlighet: 'Vänlighet', karisma: 'Karisma', skonhet: 'Skönhet', flit: 'Flit', empati: 'Empati', mod: 'Mod', minne: 'Minne',
};
export const SKILLS = ['samla', 'jakt', 'fiske', 'ved', 'hantverk', 'berattande', 'elda'] as const;
export type Skill = typeof SKILLS[number];
export const SKILL_NAMES: Record<Skill, string> = {
  samla: 'Insamling', jakt: 'Jakt', fiske: 'Fiske', ved: 'Vedhuggning', hantverk: 'Hantverk', berattande: 'Berättande', elda: 'Eldkonst',
};

export const AGES = ['Istid', 'Vårtid', 'Sommartid', 'Hösttid'];

export type Act = 'samla' | 'jakt' | 'fiske' | 'ved' | 'leka' | 'vila' | 'samtal' | 'beratta' | 'hantverk' | 'vakt' | 'sova' | 'elda' | 'tanda' | 'varma' | 'toa' | 'kol' | 'falla' | 'hugga' | 'yxa' | 'spjut' | 'promenad' | 'bada' | 'bara' | 'strand' | 'korg' | 'bygga';
export const ACT_NAMES: Record<Act, string> = {
  samla: 'Samlar bär och rötter', jakt: 'Jagar', fiske: 'Fiskar med händerna', ved: 'Samlar grenar', leka: 'Leker',
  vila: 'Vilar', samtal: 'Samtalar vid elden', beratta: 'Berättar vid elden', hantverk: 'Gör handarbete',
  vakt: 'Håller vakt', sova: 'Sover', elda: 'Lägger ved på elden', tanda: 'Försöker tända elden', varma: 'Värmer sig vid elden',
  toa: 'Går avsides på toa', kol: 'Hämtar kol ur den slocknade elden',
  falla: 'Fäller ett träd med yxa', hugga: 'Hugger ved av ett fällt träd', yxa: 'Gör en yxa av en pinne och flinta', spjut: 'Täljer ett fiskespjut', promenad: 'Tar en promenad', bada: 'Badar i sjön', bara: 'Bär in saker till lagret', strand: 'Sitter vid stranden och ser ut över vattnet', korg: 'Flätar en korg av torrt gräs', bygga: 'Bygger',
};
export const WORK: Act[] = ['samla', 'jakt', 'fiske', 'ved'];
export const GREN = 0.4; // en gren ger lika mycket bränsle som 0,4 ved: grenar brinner fort
export const AXE_WORK: Act[] = ['falla', 'hugga']; // arbete med yxa, räknas som vedarbete
export const isWork = (a: Act) => WORK.includes(a) || AXE_WORK.includes(a);
export const taskName = (t: Task) => t.act === 'bygga' ? (t.tool === 'laga' ? 'Lagar en vägg' : t.tool === 'golv' ? 'Lägger golv' : 'Bygger en vägg') : t.act === 'fiske' && t.tool === 'fiskespjut' ? 'Fiskar med spjut' : t.act === 'samla' && t.tool === 'korg' ? 'Samlar bär och rötter med korg' : ACT_NAMES[t.act];

export interface Thought { text: string; v: number; until: number }
// why = varför personen valde uppgiften, dark = påbörjad under mörk tid
export interface Task { act: Act; phase: 'go' | 'do' | 'back'; tx: number; ty: number; until: number; carry: number; items?: Record<string, number>; cond?: Record<string, number>; why?: string; dark?: boolean; path?: number[]; pk?: string; ref?: number; prog?: number; tool?: string; stint?: number; fynd?: number; lim?: number; res?: { x: number; y: number; until: number }; wx?: number; wy?: number; hold?: number; site?: { x: number; y: number } } // tool = redskap som används, t.ex. fiskespjut. stint = när arbetspasset slutar och bördan bärs hem, res = var och till när arbetet fortsätter efteråt, wx/wy/hold = vart man går härnäst på platsen och hur länge man står still, site = bygget man går till efter att ha hämtat material

export interface Person {
  id: number; name: string; sex: 'm' | 'k';
  born: number; died?: number; cause?: string; left?: number;
  mother?: number; father?: number; partner?: number;
  pot: Record<Stat, number>; skill: Record<Skill, number>;
  hunger: number; rest: number; social: number; health: number;
  warm: number; // kroppsvärme 0–1
  toa: number; // 1 = inget behov, 0 = olycka
  habit: Record<string, number>; // timmar per aktivitet, bleknar med tiden (ger yrkestaggar)
  sickUntil?: number; sickWhy?: string; poisonUntil?: number; pregnantSince?: number; lastBirth?: number;
  fiske?: { f: number; n: number; k: number }; // fiske med händerna: försök, napp och fångade fiskar
  tek?: Record<string, number>; // teknik: hur nära personen är att komma på något, 1 = kan det
  kunskap?: Record<string, { v: number; t: number }>; // det personen kan (alltid rätt), 0–1, och när det senast användes
  lardomar?: Lardom[]; // det personen tror om platser (kan vara fel, överdrivet eller inaktuellt)
  thoughts: Thought[];
  x: number; y: number; task?: Task;
  fame: string[];
  hue: number;
  tag?: string; // yrkestagg efter vad personen ägnar mest tid åt
}

// En lärdom om en plats: k = vad, a = område (8×8 rutor), v = hur mycket (eller hur rädd), c = hur säker (0–1),
// t = senast stärkt, src = vem den hördes av (saknas = egen upplevelse), led = hur många led från den som var där, om = vad som hände
export type LKind = 'samla' | 'jakt' | 'fiske' | 'flinta' | 'fara';
export interface Lardom { k: LKind; a: number; v: number; c: number; t: number; src?: number; led?: number; om?: string }

export interface Rel { chem: number; op: number; rom: number; talks: number; flags: number }
// flags: 1 = nära vänner loggat, 2 = ovänner loggat

export interface LogEntry { t: number; text: string; kind: 'birth' | 'death' | 'rel' | 'skill' | 'world' | 'move'; ids: number[] }

export interface State {
  v: 1; seed: number; rng: number; founded: number; now: number;
  people: Person[]; rels: Record<string, Rel>; nextId: number;
  food: number; wood: number; log: LogEntry[];
  lastAgeIdx: number; lastGuardDay: number;
  items: Record<string, number>; // föremål i förrådet, t.ex. gniststen, torrt gräs, grenar
  fire: Fire;
  seder: Seder;
  mark?: string; // markens grästäcke per ruta (stigar), packat
  skog?: string; // trädens tillväxt per ruta, packat
  stockar?: Stock[]; // fällda träd som ligger och väntar på att huggas
  lager?: { x: number; y: number; w: number; h: number }; // lagerplatsen, rutor
  mat?: Record<string, number>; // maten per slag (bär, kött, fisk, svamp); s.food är summan
  marken?: { x: number; y: number; k: string; n: number }[]; // gamla sparfiler: saker på marken (nu i stackar)
  lagren?: { x: number; y: number; w: number; h: number; namn?: string; slag?: 'mat' | 'material'; prio?: number }[]; // lagerplatserna
  stackar?: { k: string; n: number; c: number; x: number; y: number }[]; // alla stackar med plats och skick (c: 1 = nytt)
  stubbar?: { x: number; y: number; t: number }[]; // stubbar efter fällda träd, t = när trädet fälldes
  nextStock?: number; fallda?: number;
  fynd?: string; // hur mycket som tagits ur varje plats (bär, vilt, fisk), packat
  byggen?: import('./bygg').Bit[]; hus?: import('./bygg').Hus[]; byggV?: number; nextBit?: number; byggSok?: number; // väggar, golv och öppningar, husen byn planerat, ändringsräknare
  kunskap?: Record<string, number>; // äldre sparfiler: byns gemensamma kunskap, flyttas till varje person
  stat?: Record<string, number>; // räknare: svamp, fiskeförsök, napp, fångst med mera
}
// ett fällt träd: ved och grenar som finns kvar att hugga ut
export interface Stock { id: number; x: number; y: number; ved: number; grenar: number }

// ---------- seder ----------
// Byns gemensamma värderingar, -1..1. Växer fram ur invånarnas personlighet och det byn varit med om.
export const SEDER = ['arbete', 'gemenskap', 'barn', 'nyfikenhet', 'forsiktighet'] as const;
export type Sed = typeof SEDER[number];
export const SED_INFO: Record<Sed, { pos: string; neg: string; effect: string }> = {
  arbete: { pos: 'Arbete', neg: 'Lugn', effect: 'Pliktkänsla: hur mycket man jobbar för byn och hur mycket man vilar.' },
  gemenskap: { pos: 'Gemenskap', neg: 'Var och en för sig', effect: 'Hur mycket man bryr sig om att andra fryser och hjälper dem med elden.' },
  barn: { pos: 'Barnkär', neg: 'Barnsnål', effect: 'Hur gärna par skaffar barn, och om barnen får leka eller måste hjälpa till.' },
  nyfikenhet: { pos: 'Nyfikenhet', neg: 'Tradition', effect: 'Hur snabbt invånarna lär sig nya färdigheter.' },
  forsiktighet: { pos: 'Försiktighet', neg: 'Leva i nuet', effect: 'Hur stora förråd byn vill ha innan man slappnar av, och om elden hålls vid liv.' },
};
// v = sederna nu, ev = tillskott från händelser (bleknar), at = senaste omräkning
export interface Seder { v: Record<Sed, number>; ev: Record<Sed, number>; log: { t: number; text: string }[]; at?: number }

// ---------- eldstäder och tänddon ----------
// Bara lägerelden går att ha i dag. De andra är förberedda och byggs när bygg- och teknikträdet finns.
// spread = relativ risk att elden tar sig ut i omgivningen (används när brandsystemet finns).
export interface Hearth { id: string; name: string; desc: string; indoor: boolean; maxFuel: number; burn: number; radius: number; comfort: number; spread: number; requires: string }
export const HEARTHS: Hearth[] = [
  { id: 'lagereld', name: 'Lägereld', desc: 'Ved staplad direkt på marken. Lätt att göra, men mycket värme går förlorad och den kan inte stå inomhus.', indoor: false, maxFuel: 6, burn: 0.5, radius: 5, comfort: 0.04, spread: 1, requires: 'Eld' },
  { id: 'stenring', name: 'Stenring', desc: 'Elden ligger i en ring av stenar som håller glöden samlad och stänger ute vinden.', indoor: false, maxFuel: 8, burn: 0.45, radius: 5.5, comfort: 0.05, spread: 0.5, requires: 'Stenhuggning' },
  { id: 'hard', name: 'Härd', desc: 'Stensatt härd i golvet med rökhål i taket. Den första elden som går att ha inomhus.', indoor: true, maxFuel: 10, burn: 0.4, radius: 6, comfort: 0.07, spread: 0.3, requires: 'Bofast by' },
  { id: 'murad', name: 'Murad eldstad', desc: 'Eldstad av sten och lera med rökgång. Röken leds ut och värmen stannar i rummet.', indoor: true, maxFuel: 14, burn: 0.35, radius: 7, comfort: 0.09, spread: 0.12, requires: 'Murning' },
  { id: 'kakelugn', name: 'Kakelugn', desc: 'Lagrar värmen i tegel och kakel och värmer länge efter att veden brunnit ut.', indoor: true, maxFuel: 18, burn: 0.3, radius: 8, comfort: 0.11, spread: 0.03, requires: 'Keramik, murning' },
];
// chance = chans per försök, grass/sticks = tändmaterial per försök, minutes = tid per försök
export interface Igniter { id: string; name: string; desc: string; chance: number; grass: number; sticks: number; minutes: number; requires: string }
export const IGNITERS: Igniter[] = [
  { id: 'gniststen', name: 'Gniststen', desc: 'Slås mot en annan sten så att gnistor faller i tändmaterialet. Kräver tålamod och mycket tändmaterial.', chance: 0.025, grass: 3, sticks: 3, minutes: 15, requires: '–' },
  { id: 'bagborr', name: 'Bågborr', desc: 'En pinne snurras snabbt mot en träskiva med hjälp av en båge tills glöd bildas.', chance: 0.2, grass: 2, sticks: 1, minutes: 10, requires: 'Träbearbetning' },
  { id: 'eldstal', name: 'Eldstål och flinta', desc: 'Stål mot flinta ger heta gnistor som fångas i fnöske.', chance: 0.45, grass: 1, sticks: 1, minutes: 5, requires: 'Smide' },
  { id: 'tandstickor', name: 'Tändstickor', desc: 'Tänds med ett drag.', chance: 0.9, grass: 0.5, sticks: 0.5, minutes: 1, requires: 'Kemi' },
];
export const ITEM_NAMES: Record<string, string> = { gniststen: 'Gniststen', torrgras: 'Torrt gräs', kol: 'Kol', grenar: 'Grenar', flinta: 'Flinta', yxa: 'Flintyxa' };

export interface FireLog { t: number; k: 'tänd' | 'fyll' | 'slocknade' | 'glöd' | 'sprack'; id?: number; n?: number }
export interface Fire {
  hearth: string; fuel: number; lit: boolean; emberUntil?: number;
  litAt?: number; litBy?: number; burned: number; // denna eld
  totalBurned: number; litSec: number; lightings: number; outs: number;
  tries: number; tryTotal: number; tryProg: number; // försök sedan elden senast brann, totalt, sekunder in i pågående försök
  fills: Record<string, number>; log: FireLog[];
  want?: number; wantBy?: number; wantWhy?: string; // största önskan om ved på elden just nu, och vems
  ash?: number; ashUntil?: number; // kolhög efter en utbrunnen eld
}
