import type { Act } from './handlingar';
export type { Act } from './handlingar';

// Samhällssimulatorn – simuleringskärna (ingen grafik här)
// Tidsmodell: 1 verkligt dygn = 1 levnadsår. En tidsålder = 1 vecka. Ljus tid 07–19 lokal tid.

export const SEC = 1000;
export const HOUR = 3600 * SEC;
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

export enum T { Vatten, Sand, Gras, Skog, Sten }

export const STATS = ['styrka', 'uthallighet', 'intelligens', 'nyfikenhet', 'karisma', 'skonhet', 'flit', 'empati', 'mod', 'minne'] as const;
export type Stat = typeof STATS[number];
export const STAT_NAMES: Record<Stat, string> = {
  styrka: 'Styrka', uthallighet: 'Uthållighet', intelligens: 'Intelligens', nyfikenhet: 'Nyfikenhet',
  karisma: 'Karisma', skonhet: 'Skönhet', flit: 'Flit', empati: 'Empati', mod: 'Mod', minne: 'Minne',
};
export const SKILLS = ['samla', 'jakt', 'fiske', 'ved', 'hantverk', 'berattande', 'elda'] as const;
export type Skill = typeof SKILLS[number];
export const SKILL_NAMES: Record<Skill, string> = {
  samla: 'Samling', jakt: 'Jakt', fiske: 'Fiske', ved: 'Trähuggning', hantverk: 'Hantverk', berattande: 'Berättande', elda: 'Eldkonst',
};

export const AGES = ['Istid', 'Vårtid', 'Sommartid', 'Hösttid'];

export const GREN = 0.4; // en gren ger lika mycket bränsle som 0,4 ved: grenar brinner fort

export interface Thought { text: string; v: number; until: number }
// why = varför personen valde uppgiften, dark = påbörjad under mörk tid
export interface Task { act: Act; phase: 'go' | 'do' | 'back'; tx: number; ty: number; until: number; carry: number; items?: Record<string, number>; cond?: Record<string, number>; why?: string; dark?: boolean; path?: number[]; pk?: string; ref?: number; prog?: number; tool?: string; tur?: number; lim?: number; res?: { x: number; y: number; until: number }; site?: { x: number; y: number }; mask?: number; ag?: Record<string, Record<string, number>>; ting?: number[]; fran?: number } // fran = den man tar ved av till elden (stöld, behov.ts) // ting = redskapen i bördan (agande.ts) // ag = vems det som bärs är, per slag (egendom.ts) // mask = maskar på kroken till metspöet // tool = redskap som används, t.ex. fiskespjut. tur = sekunder arbete sedan bördan bars hem och lim hur länge turen varar, res = var och till när arbetet fortsätter efteråt, site = bygget man går till efter att ha hämtat material

export interface Person {
  id: number; name: string; sex: 'm' | 'k';
  born: number; died?: number; cause?: string; left?: number;
  mother?: number; father?: number; partner?: number;
  rngs?: Record<string, number>; // var i sina egna slumpföljder personen är (slump.ts)
  pot: Record<Stat, number>; skill: Record<Skill, number>;
  hunger: number; rest: number; social: number; health: number;
  warm: number; // kroppsvärme 0–1
  toa: number; // 1 = inget behov, 0 = olycka
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
// t = senast stärkt, src = vem den hördes av (saknas = egen upplevelse), led = hur många led från den som var där, om = vad som hände
export type LKind = 'samla' | 'jakt' | 'fiske' | 'flinta' | 'fara';
// ny: när någon kom dit och såg att platsen var sämre än man trott (växterna har flyttat eller den är tömd).
// Det är en nyhet som gärna berättas vidare i ett par dygn.
export interface Lardom { k: LKind; a: number; v: number; g?: number; c: number; t: number; src?: number; led?: number; om?: string; ny?: number }

export interface Rel { chem: number; op: number; rom: number; talks: number; flags: number }
// flags: 1 = nära vänner loggat, 2 = ovänner loggat

export interface LogEntry { t: number; text: string; kind: 'birth' | 'death' | 'rel' | 'skill' | 'world' | 'move'; ids: number[] }

export interface State {
  v: number; // numret på den senaste uppgraderingen av sparfilen (UPPGRADERINGAR i varld.ts)
  seed: number; founded: number; now: number;
  rng?: number; // den gemensamma slumpen före steg 1.1.1 (bara i äldre byar, används inte)
  rngs?: Record<string, number>; // var i sin slumpföljd varje system är (slump.ts)
  hist?: Historik; // byns historik: nyckeltal och krönika (historik.ts)
  W?: number; H?: number; // kartans storlek (saknas i äldre byar: 64×40)
  people: Person[]; rels: Record<string, Rel>; nextId: number;
  food?: number; wood?: number; // äldre sparfiler (före v40): maten och veden i förrådet, nu räknade ur stackarna
  log: LogEntry[];
  lastAgeIdx: number; lastGuardDay: number;
  items?: Record<string, number>; // äldre sparfiler (före v40): sakerna och redskapen i förrådet som summor
  fire: Fire;
  seder: Seder;
  delning?: import('./delning').Delning; // delningen i nöd (delning.ts)
  mark?: string; // markens grästäcke per ruta (stigar), packat
  skog?: string; // trädens tillväxt per ruta, packat
  stockar?: Stock[]; // fällda träd som ligger och väntar på att huggas
  lager?: { x: number; y: number; w: number; h: number }; // lagerplatsen, rutor
  mat?: Record<string, number>; // äldre sparfiler (före v40): maten per slag
  marken?: { x: number; y: number; k: string; n: number }[]; // gamla sparfiler: saker på marken (nu i stackar)
  lagren?: { x: number; y: number; w: number; h: number; namn?: string; slag?: 'mat' | 'material'; prio?: number }[]; // lagerplatserna
  ting?: { id: number; k: string; c: number; agare: number; hos?: number; lass?: number; x?: number; y?: number }[]; nextTing?: number; // varje redskap för sig, det enda som sparas om redskapen: skick, ägare (0 = byn), vem som har det i handen eller bördan, och rutan det ligger på (agande.ts)
  tingVag?: { id: number; k: string; c: number; agare: number; hos?: number }[]; // äldre sparfiler (före v40): redskap som bars mellan lagerplatser
  agare?: Record<string, number[]>; // sparfiler från v30: redskapens ägare (blir s.ting)
  stackar?: { k: string; n: number; c: number; x: number; y: number; ag?: Record<string, number>; dold?: number }[]; // alla stackar med plats och skick (c: 1 = nytt), det enda som sparas om förrådet. ag = vems stacken är (lager.ts)
  egna?: Record<string, Record<string, number>>; egnaT?: Record<string, number>; // äldre sparfiler (före v40): vems sakerna i förrådet var
  stubbar?: { x: number; y: number; t: number }[]; // stubbar efter fällda träd, t = när trädet fälldes
  nextStock?: number; fallda?: number;
  fynd?: string; // hur mycket som tagits ur varje plats (bär, vilt, fisk), packat
  byggen?: import('./byggnad').Bit[]; hus?: import('./byggnad').Hus[]; byggV?: number; nextBit?: number; byggSok?: number; // väggar, golv och öppningar, husen byn planerat, ändringsräknare
  kunskap?: Record<string, number>; // äldre sparfiler: byns gemensamma kunskap, flyttas till varje person
  kal?: { t0: number; a0: number; b0: number }; // kalendern: tidsåldern a0 började t0 och slutar måndagen b0 (dagens nummer), se tid.ts
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
