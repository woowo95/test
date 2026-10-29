// Striden (fas 3, system 3.7). Grunden byggdes med testarenan (steg 3.7.5): en strid är två sidor av kämpar (Kampe) på en
// liten plats, med en avsikt (AVSIKTER) som avgör när den slutar. Den räknas i fasta tidssteg om STRID.tick sekunder
// (stridSteg), så att den blir likadan i levande läge och i snabbläget. Var och en väljer mål, går fram och slår när målet
// är inom räckhåll; ett slag träffar eller missar, och en träff hamnar på en kroppsdel (KROPPSDELAR i halsa.ts) och blir en
// skada (SKADOR i halsa.ts) efter vapnets slag (VAPEN: hugg, stick, slag eller bett), minus det kläderna tar (SKYDD).
// Smärtan och blodet fäller den skadade, och stridsmodet sjunker av skador tills man ger upp eller flyr. Allt som händer
// står i stridens egen logg (Strid.logg, raderna i STRIDHANDELSER), som sparas med striden och inte i händelseloggen, och
// stridRapport sammanfattar den. Slumpen är stridens egen följd (Strid.r): striden är en ren funktion av uppställningen och
// fröet, så att arenan kan köra om samma strid. När striden kommer in i byn (steg 3.7.2) tas fröet ur byns följd 'strid'.
// Smidigheten (steg 3.7.6) gör en kämpe snabbare och svårare att träffa, och blodtörsten (aggressionen, låg empati och dåligt
// humör, humor.ts) gör att man ger sig senare. Försvaret (steg 3.7.2): den som har den som slår som mål kan parera (med vapen
// bättre än med händerna) eller ducka (smidigheten); den som slåss med någon annan är inringad och försvarar sig inte, och
// den som är utmattad backar undan medan en vän håller striden. Ett djupt stick blir ett sticksår och ett hårt slag mot
// huvudet en hjärnskakning. Byns slagsmål och lek finns längst ner (stridIByn, steg 3.7.2). Avståndet (steg 3.7.7): ett vapen
// som kan kastas (VAPEN.kast) kastas på avstånd med färdigheten Träffsäkerhet (sikte), sämre ju längre bort och ju hårdare
// det blåser (Strid.vind). Skytten håller avståndet, backar undan om hen är snabbare än den som kommer, byter annars till
// reservvapnet i bältet (Kampe.reserv) eller slår med det hen har. Står målet i närstrid med en vän väntar en god och lugn
// skytt eller byter mål; den ovana chansar, och en miss kan träffa vännen (vådaskott). Ett kastat spjut kan fastna i såret:
// det blöder mindre så länge det sitter, och den som står kvar drar ut det (mer blod), annars sitter det kvar till vården.
// Knuffen och fallet (steg 3.7.8): i stället för att slå kan man knuffa. Knuffen gör ingen skada men kan fälla, lättare
// den som är trött, skadad, bär tungt eller står på hal mark (Strid.halt: lera och snö); den som springer på hal mark kan
// halka. Den som ligger kan inte parera eller ducka och är lätt att träffa tills hen rest sig; i ett slagsmål låter den
// som inte är blodtörstig hen resa sig, de andra rusar fram. Ett vapen kan tappas av en träff i armen eller handen och när
// man faller: det blir en sak på marken (Strid.marken) som ägaren eller en motståndare utan vapen hämtar, och den som böjer
// sig ner är lätt att träffa. Sluttningar får betydelse när kartan får höjder.
// Hotet (steg 3.7.9): hela tiden jämför varje sida sin styrka (hur många som står, deras styrka, vapen, ork och smärta) med
// motståndarnas, och de främstas mod drar med de andra. Det läggs till var och ens stridsmod (modNu): den som är svagare
// eller vars främsta tvekar ger upp eller flyr tidigare, i början, mitten eller slutet, och före första slaget kan den som
// är rädd dra sig undan utan strid. Den som är rädd eller utmattad drar sig bakom vännerna medan de håller striden. Leken
// följer inte hotet. Ropen räknas med när larmen kommer (3.7.11), och behovet (hunger, att försvara hemmet) med rovdjuren
// (3.7.1) och räderna (11.2.5).
import { balans } from './balans';
import { HALSA, KROPPSDELAR, Kroppsdel, SKADOR, SkadaTyp, skada } from './halsa';
import { DJUR } from './redskap';
import { SAKER, sakNamn } from './saker';
import { clamp, rnd } from './slump';
import { ALDER, ageOf, count, getRel, log, ovning, stat, think } from './folk';
import { blodtorst } from './humor';
import { die } from './liv';
import { handelse, smaka, smakAv } from './rykten';
import { avbryt } from './lager';
import { HOUR, SEC } from './typer';
import { harBalte, paSig, paSigVikt } from './utrustning';
import { capacity } from './lager';
import { snoPaMarken, vaderNu } from './vader';
import { bordOf } from './saker';
import { ownedBy } from './agande';
import type { Person, State } from './typer';

// ---------- balanstal (regel 8) ----------
export const STRID = balans('strid', {
  tick: 0.2, // sekunder i spelet per tidssteg i striden (samma i båda lägena)
  maxTid: 240, // en strid slutar senast efter så här många sekunder (oavgjort)
  fart: 1.6, // rutor i sekunden för en frisk vuxen som springer i strid (gånger djurets fart)
  traffBas: 0.6, // chansen att träffa någon som är lika skicklig
  traffPer: 0.03, // ... och så här mycket mer per poäng skicklighet över motståndarens
  smidUndan: 0.015, // ... och så här mycket mindre per poäng smidighet hos motståndaren över 10 (steg 3.7.6)
  smidFart: 0.02, // farten gånger 1 + smidFart × (smidigheten − 10)
  torst: 0.3, // stridsmodet i början plus så här mycket gånger blodtörsten (0–1)
  traffMin: 0.1, traffMax: 0.95, // chansen att träffa är aldrig lägre eller högre än så här
  trott: 0.4, // den som är helt utmattad träffar så här mycket sämre
  styrka: 0.05, // skadan gånger 1 + (styrka − 10) × detta
  slump: 0.6, // skadan gånger ett tal mellan 1 − slump/2 och 1 + slump/2
  ingen: 0.03, // en träff som blir mindre än så här efter kläderna gör ingen skada
  orkSlag: 0.05, // ett slag tar så mycket ork (0–1), mindre för den uthållige ...
  orkVila: 0.04, // ... och orken kommer tillbaka så här mycket i sekunden mellan slagen
  blodSlag: 0.25, // ett öppet sår tar så här mycket blod direkt (gånger skadans blod och grad) ...
  blodSek: 0.002, // ... och sedan så här mycket i sekunden medan det blöder
  nere: 0.9, // den som har så här ont faller och kan inte slåss längre
  modStart: 0.4, // stridsmodet när striden börjar: modStart + mod / 20 × modMod
  modMod: 0.6,
  modSkada: 1.1, // stridsmodet sjunker så här mycket gånger graden av en skada ...
  modVan: 0.2, // ... och så här mycket när en vän faller
  lek: 0.2, // i lek slutar striden vid första skada av den här graden
  utsatt: 1.5, // chansen att träffa den som ligger eller flyr, gånger detta
  takt: 0.3, // tiden mellan slagen gånger 1 − (uthållighet − 10) / 20 × detta
  // försvaret (steg 3.7.2): bara den som står och har den som slår som mål kan parera eller ducka
  parera: 0.3, // chansen att parera ett slag som skulle ha träffat, med vapen och lika skicklig som den som slår ...
  pareraHand: 0.12, // ... och med händerna
  pareraPer: 0.03, // ... och så här mycket mer per poäng skicklighet över den som slår
  duck: 0.15, // chansen att ducka ett slag som inte parerades, för den med smidighet 10 och full ork ...
  duckSmid: 0.06, // ... gånger 1 + duckSmid × (smidigheten − 10)
  duckTung: 0.15, // ... och så här mycket mindre med skinnrock (tungt att röra sig i)
  ringa: 1.5, // ett mål vars uppmärksamhet är på någon annan (inringat) väljs som om det stod så här många rutor närmare
  backa: 0.25, // den som har så lite ork backar undan om en vän står kvar i striden ...
  backaTill: 0.6, // ... tills orken är tillbaka till så här mycket
  hjarna: 0.2, // ett slag mot huvudet av minst den här graden ger hjärnskakning ...
  hjarnaOrk: 0.4, // ... som tar så här mycket ork
  // avståndet (steg 3.7.7)
  langt: 0.5, // ett kast träffar så här mycket sämre vid kastets längsta räckvidd (mindre närmare) ...
  vind: 0.6, // ... och så här mycket sämre i den hårdaste blåsten vid längsta räckvidden
  nara: 2.2, // en fiende som har skytten som mål och är så här nära har nått skytten
  hall: 4, // skytten backar undan från den som kommer närmare än så här, om hen är snabbare
  byta: 0.7, // sekunder det tar att byta till reservvapnet i bältet
  kastMin: 2.5, // ett spjut kastas bara mot den som är minst så här långt bort
  vanta: 0.55, // skyttens tålamod (sikte / 20 × 0.6 + stridsmodet × 0.4) från vilket hen väntar på fritt läge ...
  vadaNara: 1.4, // ... när en vän står så här nära målet
  vada: 0.35, // en miss mot den som slåss med en vän träffar vännen med den här chansen
  fastna: 0.6, // chansen att ett kastat spjut som sticker minst fastnaGrad fastnar i såret
  fastnaGrad: 0.25,
  fastBlod: 0.5, // såret blöder så här mycket medan spjutet sitter kvar ...
  draUt: 0.4, // ... den som står kvar drar ut det med den här chansen i sekunden ...
  draBlod: 1, // ... och det tar så här mycket blod till (gånger skadans blod, grad och blodSlag)
  // knuff, fall och tappade vapen (steg 3.7.8)
  knuff: 0.12, // chansen att man knuffar i stället för att slå, med vapen ...
  knuffHand: 0.3, // ... och med händerna
  fallBas: 0.22, // chansen att en knuff fäller någon lika stark, utvilad och frisk på torr mark ...
  fallStyrka: 0.06, // ... gånger 1 + (styrkan − den knuffades styrka) × detta ...
  fallTrott: 1, fallSkadad: 1.5, fallTung: 1, fallHalt: 1.5, // ... och gånger 1 + detta × tröttheten (1 − ork), skadorna (1 − rörligheten), bördan och halkan (0–1)
  ligga: 1.5, // sekunder den som fallit ligger innan hen är uppe (dubbelt så länge för den utmattade)
  halka: 0.05, // chansen i sekunden att halka omkull när man springer, gånger halkan
  leraFran: 0.6, // marken blir hal av fukten över så här mycket (vader.ts) ...
  snoHalt: 0.5, // ... och av snön på marken, gånger detta
  tappa: 0.4, // chansen att tappa vapnet av en träff i armen eller handen av minst tappaGrad ...
  tappaGrad: 0.25,
  tappaFall: 0.3, // ... och när man faller
  hamta: 4, // ett vapen på marken hämtas av den som saknar vapen och är så här nära
  plocka: 0.6, // sekunder det tar att böja sig ner och ta upp det
  ruser: 0.35, // den som har så här mycket blodtörst rusar fram mot den som ligger i ett slagsmål (de andra låter hen resa sig)
  // hotet (steg 3.7.9)
  hot: 0.6, // stridsmodet ändras så här mycket gånger (sidans andel av styrkan − ½) × 2: −hot ensam mot en övermakt ...
  framst: 0.3, // ... och så här mycket gånger (de främstas stridsmod − ½), de två som står närmast fienden
  avsta: 0.2, // före första slaget drar sig den undan vars stridsmod med hotet är under så här mycket
  tyckeSkick: 2, // tycket för vapnet (steg 3.7.10, -1 till 1) ger så här mycket skicklighet med det ...
  tyckeVal: 0.3, // ... och drar så här mycket i valet av vapen inför striden (skadan gånger 1 + tyckeVal × tycket)
  tyckeVann: 0.15, // den som vann med vapnet får så här mycket tycke för det ...
  tyckeLek: 0.02, // ... den som lekte (övade) med det så här mycket ...
  tyckeForlust: 0.25, // ... och den som förlorade svårt (låg nere eller blev svårt skadad) så här mycket ogillande
  tyckeSvar: 0.3, // en svår förlust: skadornas grad sammanlagt minst så här mycket
  backaMod: 0.15, // den som har så lite stridsmod med hotet drar sig bakom vännerna (som den utmattade) ...
  backaModTill: 0.3, // ... tills hen har så här mycket igen
});

// ---------- vapnen (registret) ----------
// skada = grad av en full träff från en normalstark vuxen, takt = sekunder mellan slagen, rack = räckvidd i rutor,
// slag = vad det gör med kroppen (SLAGEN), ord = verbet i loggen. Ett vapen är en sak i saker.ts (samma id), utom
// händerna och djurens bett. kast = vapnet kan kastas (steg 3.7.7): räckvidden, skadan, hur många kast man har (skott) och om
// det fastnar i såret; ett vapen som bara kastas när man har ett reservvapen (spjutet) har reserv. Pilbågen kommer i 9.4.1
interface KastDef { rack: number; skada: number; skott: number; fastnar?: true; reserv?: true }
interface VapenDef { namn: string; skada: number; takt: number; rack: number; slag: Slag; ord: string; tecken: string; kast?: KastDef; liten?: true }
export const VAPEN = {
  hand: { namn: 'Knytnävarna', skada: 0.14, takt: 0.9, rack: 0.9, slag: 'slag', ord: 'slår', tecken: '👊' },
  kniv: { namn: 'Flintkniven', skada: 0.32, takt: 0.9, rack: 0.9, slag: 'hugg', ord: 'skär', tecken: '🔪', liten: true }, // liten = ryms i bältet som reserv
  yxa: { namn: 'Flintyxan', skada: 0.5, takt: 1.5, rack: 1.1, slag: 'hugg', ord: 'hugger', tecken: '🪓', liten: true },
  fiskespjut: { namn: 'Träspjutet', skada: 0.32, takt: 1.3, rack: 1.8, slag: 'stick', ord: 'sticker', tecken: '🔱', kast: { rack: 6, skada: 0.3, skott: 1, fastnar: true, reserv: true } },
  flintspjut: { namn: 'Flintspjutet', skada: 0.45, takt: 1.3, rack: 1.8, slag: 'stick', ord: 'sticker', tecken: '🔱', kast: { rack: 6, skada: 0.42, skott: 1, fastnar: true, reserv: true } },
  benspade: { namn: 'Benspaden', skada: 0.28, takt: 1.4, rack: 1.3, slag: 'slag', ord: 'slår', tecken: '🦴' },
  sten: { namn: 'Stenen', skada: 0.25, takt: 1.1, rack: 0.9, slag: 'slag', ord: 'slår', tecken: '🪨', kast: { rack: 8, skada: 0.22, skott: 3 } }, // tre stenar att kasta, sedan slår man med den sista
  bett: { namn: 'Tänderna', skada: 0.1, takt: 0.8, rack: 0.7, slag: 'bett', ord: 'biter', tecken: '🦷' },
} satisfies Record<string, VapenDef>;
export type Vapen = keyof typeof VAPEN;
const VAP: Record<string, VapenDef> = VAPEN;
export const VAPEN_LIST = Object.keys(VAPEN) as Vapen[];
// vapnen en människa kan ha i arenan (händerna och sakerna som finns)
export const MANNISKOVAPEN = VAPEN_LIST.filter(v => v === 'hand' || SAKER[v]);

// ---------- slagen: vad ett vapen gör med kroppen ----------
// skada = skadan i SKADOR efter graden (den första vars gräns graden når, från slutet)
type Slag = 'hugg' | 'stick' | 'slag' | 'bett';
const SLAGEN: Record<Slag, { namn: string; skada: [number, SkadaTyp][] }> = {
  hugg: { namn: 'Hugg', skada: [[0, 'skarsar']] },
  stick: { namn: 'Stick', skada: [[0, 'skarsar'], [0.35, 'sticksar']] }, // ett djupt stick blöder mer (steg 3.7.2)
  slag: { namn: 'Slag', skada: [[0, 'blamarke'], [0.3, 'krossar'], [0.65, 'benbrott']] },
  bett: { namn: 'Bett', skada: [[0, 'bett']] },
};
// ett hårt slag mot huvudet blir hjärnskakning (steg 3.7.2)
const skadaAv = (sl: Slag, g: number, d: Kroppsdel): SkadaTyp => {
  if (sl === 'slag' && d === 'huvud' && g >= STRID.hjarna) return 'hjarnskakning';
  const r = SLAGEN[sl].skada; for (let i = r.length - 1; i > 0; i--) if (g >= r[i][0]) return r[i][1]; return r[0][1];
};

// ---------- var slagen träffar ----------
// hur ofta en träff hamnar på varje del (huvudet sällan)
const TRAFFDEL: Record<Kroppsdel, number> = { huvud: 0.07, bal: 0.33, armV: 0.11, armH: 0.11, handV: 0.05, handH: 0.05, benV: 0.1, benH: 0.1, fotV: 0.04, fotH: 0.04 };
const DELAR = Object.keys(TRAFFDEL) as Kroppsdel[];

// ---------- det kläderna tar (registret) ----------
// per klädesplagg i saker.ts: delarna det täcker och hur stor del av skadan det tar per slag. Rustningen kommer i 9.4.1
export const SKYDD: Record<string, { delar: Kroppsdel[]; tar: Partial<Record<Slag, number>> }> = {
  skinnrock: { delar: ['bal', 'armV', 'armH'], tar: { hugg: 0.25, stick: 0.15, slag: 0.2, bett: 0.3 } },
  skinnskor: { delar: ['fotV', 'fotH'], tar: { hugg: 0.2, stick: 0.2, slag: 0.1, bett: 0.3 } },
};
export const KLADER_STRID = Object.keys(SKYDD);

// ---------- avsikten (registret) ----------
// vapen = man slåss med vapen (annars med händerna), nere = man slår den som ligger, slut = vad som avslutar striden för
// den drabbade: 'skada' vid första skadan av graden STRID.lek, 'ge' att man ger upp när modet tar slut, 'fly' att man flyr
interface AvsiktDef { namn: string; text: string; vapen: boolean; nere: boolean; modSlut: 'ge' | 'fly'; lek?: true }
export const AVSIKTER = {
  lek: { namn: 'Lek', text: 'Man brottas och slår på skoj och slutar vid första riktiga smärta.', vapen: false, nere: false, modSlut: 'ge', lek: true },
  slagsmal: { namn: 'Slagsmål', text: 'Med händerna tills den ena ger upp eller ligger.', vapen: false, nere: false, modSlut: 'ge' },
  skada: { namn: 'Skada', text: 'Med vapen tills den andra ligger, flyr eller ger upp.', vapen: true, nere: false, modSlut: 'fly' },
  doda: { namn: 'Döda', text: 'Med vapen, och den som ligger slås ihjäl.', vapen: true, nere: true, modSlut: 'fly' },
} satisfies Record<string, AvsiktDef>;
export type Avsikt = keyof typeof AVSIKTER;
const AVS: Record<Avsikt, AvsiktDef> = AVSIKTER;

// ---------- händelserna i loggen (registret) ----------
// tecken = symbolen först i loggen (platshållare tills bildstilen har dem), ord = hur meningen börjar
export const STRIDHANDELSER = {
  borjar: { tecken: '⚔️', namn: 'Striden börjar' },
  traff: { tecken: '💥', namn: 'Träff' },
  tog: { tecken: '🛡️', namn: 'Kläderna tog slaget' },
  miss: { tecken: '💨', namn: 'Miss' },
  parera: { tecken: '⚔️', namn: 'Parerar' }, // steg 3.7.2
  duck: { tecken: '🌀', namn: 'Duckar' },
  backar: { tecken: '↩️', namn: 'Backar' },
  avstand: { tecken: '🏹', namn: 'Håller avståndet' }, // steg 3.7.7
  byter: { tecken: '🔁', namn: 'Byter vapen' },
  vantar: { tecken: '✋', namn: 'Väntar på fritt läge' },
  vada: { tecken: '😬', namn: 'Vådaträff' },
  fastnar: { tecken: '📍', namn: 'Fastnar i såret' },
  drar: { tecken: '🩸', namn: 'Drar ut' },
  knuff: { tecken: '🤚', namn: 'Knuffar' }, // steg 3.7.8
  omkull: { tecken: '⬇️', namn: 'Faller omkull' },
  halkar: { tecken: '💫', namn: 'Halkar' },
  upp: { tecken: '⬆️', namn: 'Reser sig' },
  later: { tecken: '🖐️', namn: 'Låter hen resa sig' },
  tappar: { tecken: '👐', namn: 'Tappar vapnet' },
  plockar: { tecken: '🤲', namn: 'Tar upp' },
  nere: { tecken: '⤵️', namn: 'Faller' },
  ger: { tecken: '🏳️', namn: 'Ger upp' },
  flykt: { tecken: '🏃', namn: 'Flyr' },
  borta: { tecken: '🚪', namn: 'Har flytt' },
  avstar: { tecken: '🙅', namn: 'Drar sig undan' }, // steg 3.7.9
  dod: { tecken: '💀', namn: 'Död' },
  slut: { tecken: '🏁', namn: 'Striden är slut' },
} as const;
export type Handelse = keyof typeof STRIDHANDELSER;

// ---------- en strid ----------
// torst = blodtörsten 0–1 (steg 3.7.6), sikte = skickligheten med kast (Träffsäkerhet, steg 3.7.7; annars skicklighet)
export interface KampeStats { styrka: number; uthallighet: number; mod: number; smidighet: number; skicklighet: number; torst?: number; sikte?: number }
export type KampeLage = 'strid' | 'nere' | 'ger' | 'flykt' | 'borta' | 'dod';
export interface Kampe {
  id: number; namn: string; sida: 0 | 1; pid?: number; djur?: string; // pid = personen i byn, djur = arten i DJUR
  st: KampeStats; vapen: Vapen; klader: string[]; fart: number; // fart = gånger STRID.fart
  x: number; y: number; // rutor (med decimaler)
  skador: { d: Kroppsdel; k: SkadaTyp; g: number; ny: number; fast?: 1 }[]; // ny = öppet sår som blöder (1) eller levrat (0), fast = ett spjut sitter kvar
  blod: number; ork: number; modNu: number; lage: KampeLage;
  vant: number; mal?: number; backar?: true; // sekunder till nästa slag, målet, och om hen backar undan för att hämta andan
  slag: number; traffar: number; gjort: number; // för rapporten: slag, träffar och summan av skadornas grad
  reserv?: Vapen; skott?: number; // steg 3.7.7: reservvapnet i bältet och kasten som är kvar
  haller?: true; vantar?: true; ifatt?: true; vada?: number; // håller avståndet, väntar på fritt läge, blev ifattsprungen utan reserv, vådaträffar
  tung?: number; // steg 3.7.8: bördan (det hen bär genom vad hen orkar, 0–1) ...
  ligger?: number; bocker?: number; later?: number; // ... sekunder kvar på marken och kvar av att böja sig ner, den hen låter resa sig
}
// en rad i loggen: tiden (sekunder), vem (a) och mot vem (b), del, skada och grad, och det kläderna tog
export interface StridRad { t: number; h: Handelse; a?: number; b?: number; d?: Kroppsdel; k?: SkadaTyp; g?: number; v?: Vapen; kl?: string; kast?: 1 }
export interface Strid {
  avsikt: Avsikt; t: number; w: number; h: number; r: number; fro: number; vind: number; // vind = blåsten 0–1 (vädret)
  halt: number; marken: { v: Vapen; x: number; y: number; av: number }[]; // halkan 0–1 och vapnen som tappats (steg 3.7.8)
  kampar: Kampe[]; logg: StridRad[];
  slut?: { t: number; vinnare: 0 | 1 | -1 };
}
// uppställningen som en strid börjar ur (arenan och, senare, byn)
export interface Uppstallning { avsikt: Avsikt; w: number; h: number; vind?: number; halt?: number; kampar: Omit<Kampe, 'skador' | 'blod' | 'ork' | 'modNu' | 'lage' | 'vant' | 'mal' | 'backar' | 'slag' | 'traffar' | 'gjort' | 'skott' | 'haller' | 'vantar' | 'ifatt' | 'vada' | 'ligger' | 'bocker' | 'later'>[] }

// stridens egen slumpföljd (samma blandning som rnd i slump.ts)
function slump(st: Strid) {
  let t = (st.r = (st.r + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function nyStrid(u: Uppstallning, fro: number): Strid {
  const kampar: Kampe[] = u.kampar.map(k => ({
    ...k, st: { ...k.st }, klader: [...k.klader], skador: [], blod: 1, ork: 1,
    modNu: clamp(STRID.modStart + (k.st.mod / 20) * STRID.modMod + (k.st.torst ?? 0) * STRID.torst, 0.05, 1), lage: 'strid', vant: 0, slag: 0, traffar: 0, gjort: 0,
  }));
  const st: Strid = { avsikt: u.avsikt, t: 0, w: u.w, h: u.h, r: fro | 0, fro, vind: u.vind ?? 0, halt: u.halt ?? 0, marken: [], kampar, logg: [{ t: 0, h: 'borjar' }] };
  if (!AVS[u.avsikt].vapen) for (const k of kampar) if (!k.djur) { k.vapen = 'hand'; k.reserv = undefined; }
  for (const k of kampar) { const kv = VAP[k.vapen].kast; if (kv) k.skott = kv.skott; }
  for (const k of kampar) k.vant = slump(st) * VAP[k.vapen].takt; // ingen slår exakt samtidigt
  return st;
}

// ---------- kroppen i striden ----------
const smartaAv = (k: Kampe) => k.skador.reduce((a, w) => a + SKADOR[w.k].smarta * w.g, 0);
const delFel = (k: Kampe, d: Kroppsdel) => Math.min(1, k.skador.reduce((a, w) => a + (w.d === d ? SKADOR[w.k].fel * w.g : 0), 0));
const smidFart = (k: Kampe) => 1 + STRID.smidFart * (k.st.smidighet - 10); // den smidiga är snabbare (steg 3.7.6)
function rorlighet(k: Kampe) {
  let v = 0;
  for (const d of DELAR) v += ((KROPPSDELAR[d] as { rorlighet?: number }).rorlighet ?? 0) * delFel(k, d);
  return Math.max(HALSA.minst, 1 - v);
}
// den som kan slåss: står kvar i striden
const iStrid = (k: Kampe) => k.lage === 'strid';
const dist = (a: Kampe, b: Kampe) => Math.hypot(a.x - b.x, a.y - b.y);

// målet: den närmaste fienden som går att slå (den som ligger eller flyr bara om avsikten är att döda)
function valjMal(st: Strid, k: Kampe) {
  const nere = AVS[st.avsikt].nere;
  let bast: Kampe | undefined, bd = Infinity;
  for (const m of st.kampar) {
    if (m.sida === k.sida || !(iStrid(m) || (nere && (m.lage === 'nere' || m.lage === 'flykt')))) continue;
    const d = dist(k, m) + (m.lage === 'nere' ? 2 : 0) - (iStrid(m) && m.mal !== undefined && m.mal !== k.id ? STRID.ringa : 0); // den som står är farligare än den som ligger, och den som slåss med en annan är lättast (ringa in)
    if (d < bd) { bd = d; bast = m; }
  }
  return bast;
}

function ga(st: Strid, k: Kampe, mx: number, my: number, langd: number) {
  const dx = mx - k.x, dy = my - k.y, d = Math.hypot(dx, dy);
  if (d < 1e-6) return;
  const f = Math.min(1, langd / d);
  k.x = clamp(k.x + dx * f, 0.3, st.w - 0.3); k.y = clamp(k.y + dy * f, 0.3, st.h - 0.3);
}

function falla(st: Strid, k: Kampe, h: 'nere' | 'dod' | 'ger' | 'flykt', rad: Handelse = h) {
  k.lage = h; k.mal = undefined; k.ligger = undefined; k.bocker = undefined;
  st.logg.push({ t: st.t, h: rad, a: k.id });
  if (h === 'nere' || h === 'dod') for (const v of st.kampar) if (v.sida === k.sida && v !== k && iStrid(v)) v.modNu -= STRID.modVan;
}

const orkAv = (a: Kampe) => { a.slag++; a.ork = Math.max(0, a.ork - STRID.orkSlag * (1 - (a.st.uthallighet - 10) / 40)); };
const chansMot = (a: Kampe, b: Kampe, skick: number) => clamp((STRID.traffBas + (skick - b.st.skicklighet) * STRID.traffPer - (b.st.smidighet - 10) * STRID.smidUndan) * (1 - STRID.trott * (1 - a.ork)), STRID.traffMin, STRID.traffMax) * (b.lage === 'nere' || b.lage === 'flykt' || b.ligger || b.bocker ? STRID.utsatt : 1); // den som ligger, böjer sig ner eller vänt ryggen är lätt att träffa
const duckar = (st: Strid, b: Kampe) => !b.ligger && !b.bocker && slump(st) < STRID.duck * Math.max(0, 1 + STRID.duckSmid * (b.st.smidighet - 10)) * rorlighet(b) * b.ork * (b.klader.includes('skinnrock') ? 1 - STRID.duckTung : 1);
function slaEtt(st: Strid, a: Kampe, b: Kampe) {
  const v = VAP[a.vapen];
  orkAv(a);
  if (slump(st) >= chansMot(a, b, a.st.skicklighet)) { st.logg.push({ t: st.t, h: 'miss', a: a.id, b: b.id, v: a.vapen }); return; }
  if (iStrid(b) && b.mal === a.id && !b.backar && !b.ligger && !b.bocker) { // försvaret: bara mot den man vänt sig mot (den inringade försvarar sig inte)
    const par = (b.vapen === 'hand' || b.vapen === 'bett' ? STRID.pareraHand : STRID.parera) + (b.st.skicklighet - a.st.skicklighet) * STRID.pareraPer;
    if (slump(st) < par * b.ork) { st.logg.push({ t: st.t, h: 'parera', a: b.id, b: a.id, v: b.vapen }); return; }
    if (duckar(st, b)) { st.logg.push({ t: st.t, h: 'duck', a: b.id, b: a.id }); return; }
  }
  traffa(st, a, b, v.skada, v.slag);
}
// vännen som står i närstrid med målet m (för skytten a), om någon
const vanVid = (st: Strid, a: Kampe, m: Kampe) => st.kampar.find(f => f.sida === a.sida && f !== a && iStrid(f) && dist(f, m) <= STRID.vadaNara && (f.mal === m.id || m.mal === f.id));
// ett kast (steg 3.7.7): sämre på avstånd och i blåsten, och bara den som ser det komma (har kastaren som mål) duckar.
// Missen mot den som slåss med en vän kan träffa vännen
function kasta(st: Strid, a: Kampe, b: Kampe) {
  const v = VAP[a.vapen], kv = v.kast!, d = dist(a, b) / kv.rack;
  orkAv(a);
  a.skott = (a.skott ?? 1) - 1;
  const van = vanVid(st, a, b);
  const chans = chansMot(a, b, a.st.sikte ?? a.st.skicklighet) * (1 - STRID.langt * d) * (1 - STRID.vind * st.vind * d);
  const traff = slump(st) < chans && !(iStrid(b) && b.mal === a.id && duckar(st, b));
  if (!traff && van && slump(st) < STRID.vada) {
    a.vada = (a.vada ?? 0) + 1;
    st.logg.push({ t: st.t, h: 'vada', a: a.id, b: van.id, v: a.vapen });
    traffa(st, a, van, kv.skada, v.slag, true);
  } else if (traff) traffa(st, a, b, kv.skada, v.slag, true);
  else st.logg.push({ t: st.t, h: 'miss', a: a.id, b: b.id, v: a.vapen, kast: 1 });
  if (kv.reserv || !a.skott) byt(st, a); // spjutet är kastat: till reservvapnet (stenarna: den sista slår man med)
}
function byt(st: Strid, a: Kampe) {
  if (!VAP[a.vapen].kast?.reserv && a.skott === 0) { a.skott = undefined; return; } // den sista stenen har man kvar i handen
  const ny = a.reserv ?? 'hand';
  a.reserv = undefined; a.skott = undefined; a.haller = undefined; a.vapen = ny; a.vant = Math.max(a.vant, STRID.byta);
  st.logg.push({ t: st.t, h: 'byter', a: a.id, v: ny });
}
// en träff av graden skada med slaget sl: kroppsdelen, kläderna, skadan och följderna
function traffa(st: Strid, a: Kampe, b: Kampe, skada0: number, sl: Slag, kast?: true) {
  const kastad = kast ? VAP[a.vapen].kast : undefined;
  let x = slump(st);
  let d: Kroppsdel = 'bal';
  for (const del of DELAR) { x -= TRAFFDEL[del]; if (x <= 0) { d = del; break; } }
  let g = skada0 * (1 + (a.st.styrka - 10) * STRID.styrka) * (1 - STRID.slump / 2 + slump(st) * STRID.slump);
  let kl: string | undefined;
  for (const c of b.klader) { const sk = SKYDD[c]; if (sk?.delar.includes(d)) { g *= 1 - (sk.tar[sl] ?? 0); kl = c; } }
  g = Math.min(1, g);
  a.traffar++;
  const kf = kast ? 1 as const : undefined;
  if (g < STRID.ingen) { st.logg.push({ t: st.t, h: 'tog', a: a.id, b: b.id, d, v: a.vapen, kl, kast: kf }); return; }
  const k = skadaAv(sl, g, d);
  if (k === 'hjarnskakning') b.ork = Math.max(0, b.ork - STRID.hjarnaOrk);
  const fast = kastad?.fastnar && sl === 'stick' && g >= STRID.fastnaGrad && slump(st) < STRID.fastna ? 1 as const : undefined;
  b.skador.push({ d, k, g, ny: SKADOR[k].blod > 0 ? 1 : 0, fast });
  b.blod -= SKADOR[k].blod * g * STRID.blodSlag;
  b.modNu -= STRID.modSkada * g;
  a.gjort += g;
  st.logg.push({ t: st.t, h: 'traff', a: a.id, b: b.id, d, k, g, v: a.vapen, kl, kast: kf });
  if (fast) st.logg.push({ t: st.t, h: 'fastnar', a: b.id, d, v: a.vapen });
  if (iStrid(b) && d !== 'huvud' && d !== 'bal' && !d.startsWith('ben') && !d.startsWith('fot') && g >= STRID.tappaGrad && slump(st) < STRID.tappa) tappa(st, b); // en träff i armen eller handen
  if (((KROPPSDELAR[d] as { livsviktig?: true }).livsviktig && g >= HALSA.dodGrad) || b.blod < HALSA.blodDod) return falla(st, b, 'dod');
  if (AVS[st.avsikt].lek && g >= STRID.lek) return falla(st, b, 'ger');
  if (b.lage === 'nere') return; // den som redan ligger
  if (smartaAv(b) >= STRID.nere) return falla(st, b, 'nere');
}

// knuffen (steg 3.7.8): ingen skada, men den kan fälla. Den som ser den komma kan kliva undan
function knuffa(st: Strid, a: Kampe, b: Kampe) {
  orkAv(a);
  if (iStrid(b) && b.mal === a.id && duckar(st, b)) { st.logg.push({ t: st.t, h: 'duck', a: b.id, b: a.id }); return; }
  const c = STRID.fallBas * Math.max(0.2, 1 + (a.st.styrka - b.st.styrka) * STRID.fallStyrka)
    * (1 + STRID.fallTrott * (1 - b.ork) + STRID.fallSkadad * (1 - rorlighet(b)) + STRID.fallTung * (b.tung ?? 0) + STRID.fallHalt * st.halt);
  if (slump(st) < c) omkull(st, b, a); else st.logg.push({ t: st.t, h: 'knuff', a: a.id, b: b.id });
}
// k faller omkull (knuffad av av, annars halkade hen) och kan tappa vapnet
function omkull(st: Strid, k: Kampe, av?: Kampe) {
  k.ligger = STRID.ligga * (2 - k.ork); k.bocker = undefined; k.haller = undefined; k.backar = undefined;
  st.logg.push(av ? { t: st.t, h: 'omkull', a: av.id, b: k.id } : { t: st.t, h: 'halkar', a: k.id });
  if (slump(st) < STRID.tappaFall) tappa(st, k);
}
// vapnet hamnar på marken (händerna och betten tappar man inte)
function tappa(st: Strid, k: Kampe) {
  if (k.vapen === 'hand' || k.vapen === 'bett') return;
  st.marken.push({ v: k.vapen, x: clamp(k.x + slump(st) - 0.5, 0.3, st.w - 0.3), y: clamp(k.y + slump(st) - 0.5, 0.3, st.h - 0.3), av: k.id });
  st.logg.push({ t: st.t, h: 'tappar', a: k.id, v: k.vapen });
  k.vapen = 'hand'; k.skott = undefined; k.haller = undefined;
}
// den som saknar vapen (när avsikten är vapen) tar reservvapnet eller hämtar ett vapen på marken. Returnerar true om
// kämpen gjort sitt i det här steget
function hamtaSteg(st: Strid, k: Kampe, dt: number): boolean {
  if (k.vapen !== 'hand' || k.djur || !AVS[st.avsikt].vapen) return false;
  if (k.reserv) { byt(st, k); return true; }
  let g: Strid['marken'][number] | undefined, gd = STRID.hamta;
  for (const o of st.marken) { const d = Math.hypot(o.x - k.x, o.y - k.y); if (d <= gd) { gd = d; g = o; } }
  if (!g) return false;
  if (gd <= 0.6) k.bocker = STRID.plocka; else ga(st, k, g.x, g.y, farten(k) * dt);
  return true;
}
function plocka(st: Strid, k: Kampe) {
  let i = -1, bd = 0.8;
  st.marken.forEach((o, j) => { const d = Math.hypot(o.x - k.x, o.y - k.y); if (d <= bd) { bd = d; i = j; } });
  if (i < 0) return; // någon annan hann före
  const [o] = st.marken.splice(i, 1);
  k.vapen = o.v; k.skott = VAP[o.v].kast?.skott;
  st.logg.push({ t: st.t, h: 'plockar', a: k.id, b: o.av === k.id ? undefined : o.av, v: o.v });
}

// hotet (steg 3.7.9): kämpens styrka i striden, och stridsmodet med sidans styrka mot motståndarnas och de främstas mod
const kraft = (k: Kampe) => (k.st.styrka / 10) * (0.5 + VAP[k.vapen].skada) * (0.5 + 0.5 * k.ork) * Math.max(0.2, 1 - smartaAv(k)) * (k.ligger ? 0.5 : 1);
function hotet(st: Strid): { andel: [number, number]; framst: [number, number] } {
  const kr = [0, 0], fr: [number, number] = [0.5, 0.5];
  for (const k of st.kampar) if (iStrid(k)) kr[k.sida] += kraft(k);
  for (const sd of [0, 1] as const) {
    const egna = st.kampar.filter(k => k.sida === sd && iStrid(k)), fi = st.kampar.filter(k => k.sida !== sd && iStrid(k));
    if (!egna.length || !fi.length) continue;
    const nara = egna.map(k => ({ k, d: Math.min(...fi.map(f => dist(k, f))) })).sort((a, b) => a.d - b.d).slice(0, 2);
    fr[sd] = nara.reduce((a, x) => a + x.k.modNu, 0) / nara.length;
  }
  const sum = kr[0] + kr[1] || 1;
  return { andel: [kr[0] / sum, kr[1] / sum], framst: fr };
}
const modMed = (k: Kampe, h: ReturnType<typeof hotet>) => k.modNu + STRID.hot * (h.andel[k.sida] - 0.5) * 2 + STRID.framst * (h.framst[k.sida] - 0.5);

const farten = (k: Kampe) => STRID.fart * k.fart * smidFart(k) * rorlighet(k);
// den som kan kasta (steg 3.7.7): håller avståndet och kastar. Den som nåtts av en fiende backar om hen är snabbare, byter
// annars till reservvapnet eller slår med det hen har (och minns att hen saknade en reserv). Spjutet kastas bara av den som
// har ett reservvapen och mot den som är en bit bort. Returnerar true om kämpen gjort sitt i det här steget
function avstandSteg(st: Strid, k: Kampe, m: Kampe, d: number, dt: number): boolean {
  const kv = VAP[k.vapen].kast;
  if (!kv || !k.skott || (kv.reserv && !k.reserv)) return false;
  if (kv.reserv) { // spjutet: kastas när målet är på avstånd, annars sticker man med det
    if (d < STRID.kastMin || d > kv.rack || k.vant > 0) return false;
    return kastaMot(st, k, m);
  }
  let hot: Kampe | undefined, hd = Infinity;
  for (const o of st.kampar) if (o.sida !== k.sida && iStrid(o) && o.mal === k.id && dist(o, k) < hd) { hd = dist(o, k); hot = o; }
  if (hot && hd <= STRID.nara) {
    if (farten(k) > farten(hot)) { backaFran(st, k, hot, hd, dt); kastaMot(st, k, m, true); return true; }
    if (k.reserv) { byt(st, k); return true; }
    k.ifatt = true; k.haller = undefined;
    return false; // slår med stenen hen har
  }
  if (hot && hd < STRID.hall && farten(k) > farten(hot)) backaFran(st, k, hot, hd, dt);
  else if (d > kv.rack * 0.85) ga(st, k, m.x, m.y, Math.min(d - kv.rack * 0.8, farten(k) * dt));
  if (k.vant <= 0 && dist(k, m) <= kv.rack) kastaMot(st, k, m);
  return true;
}
function backaFran(st: Strid, k: Kampe, o: Kampe, d: number, dt: number) {
  if (!k.haller) { k.haller = true; st.logg.push({ t: st.t, h: 'avstand', a: k.id, b: o.id }); }
  const l = d || 1; ga(st, k, k.x - (o.x - k.x) / l * 3, k.y - (o.y - k.y) / l * 3, farten(k) * dt);
}
// kastet mot m, om läget är fritt: står målet i närstrid med en vän väntar den gode och lugne skytten eller byter mål,
// och den ovane eller rädde chansar. Returnerar true om hen kastade
function kastaMot(st: Strid, k: Kampe, m: Kampe, snabbt?: true): boolean {
  if (k.vant > 0) return false;
  const kv = VAP[k.vapen].kast!;
  let mal: Kampe | undefined = m;
  if (vanVid(st, k, m) && !snabbt && ((k.st.sikte ?? k.st.skicklighet) / 20) * 0.6 + k.modNu * 0.4 >= STRID.vanta) {
    mal = st.kampar.find(o => o.sida !== k.sida && iStrid(o) && dist(k, o) <= kv.rack && !vanVid(st, k, o));
    if (!mal) { if (!k.vantar) { k.vantar = true; st.logg.push({ t: st.t, h: 'vantar', a: k.id, b: m.id }); } k.vant = 0.4; return false; }
  }
  k.vantar = undefined; k.mal = mal.id;
  kasta(st, k, mal);
  if (k.vant <= 0) k.vant = VAP[k.vapen].takt * (1 - ((k.st.uthallighet - 10) / 20) * STRID.takt) * (0.85 + slump(st) * 0.3) + (VAP[k.vapen].kast ? 0.4 : 0); // att ta fram nästa sten
  return true;
}

// ett tidssteg (STRID.tick sekunder)
export function stridSteg(st: Strid) {
  if (st.slut) return;
  const dt = STRID.tick, avs = AVS[st.avsikt];
  st.t += dt;
  const hot = hotet(st), slagits = st.logg.some(r => r.h === 'traff' || r.h === 'miss' || r.h === 'tog' || r.h === 'knuff' || r.h === 'omkull');
  for (const k of st.kampar) {
    if (k.lage === 'borta' || k.lage === 'dod') continue;
    // blodet rinner ur öppna sår, också hos den som ligger
    for (const w of k.skador) if (w.ny) k.blod -= SKADOR[w.k].blod * w.g * STRID.blodSek * dt * (w.fast ? STRID.fastBlod : 1);
    // den som står kvar drar ut ett spjut som fastnat: det blöder mer (steg 3.7.7)
    if (iStrid(k)) for (const w of k.skador) if (w.fast && slump(st) < STRID.draUt * dt) { w.fast = undefined; k.blod -= SKADOR[w.k].blod * w.g * STRID.blodSlag * STRID.draBlod; st.logg.push({ t: st.t, h: 'drar', a: k.id, d: w.d }); }
    if (k.blod < HALSA.blodDod) { falla(st, k, 'dod'); continue; }
    if (k.lage === 'flykt') { // springer mot närmaste kanten och är borta när hen når den
      const ut = [k.x, st.w - k.x, k.y, st.h - k.y], i = ut.indexOf(Math.min(...ut));
      const lang = farten(k) * dt;
      ga(st, k, i === 0 ? 0 : i === 1 ? st.w : k.x, i === 2 ? 0 : i === 3 ? st.h : k.y, lang);
      if (Math.min(k.x, st.w - k.x, k.y, st.h - k.y) <= 0.31) { k.lage = 'borta'; st.logg.push({ t: st.t, h: 'borta', a: k.id }); }
      continue;
    }
    if (!iStrid(k)) continue;
    const mod = avs.lek ? k.modNu : modMed(k, hot); // leken följer inte hotet
    if (!avs.lek && !slagits && !k.djur && mod < STRID.avsta) { falla(st, k, avs.modSlut === 'fly' ? 'flykt' : 'ger', 'avstar'); continue; } // drar sig undan utan strid
    if (mod <= 0) { falla(st, k, avs.modSlut === 'fly' ? 'flykt' : 'ger'); continue; }
    k.ork = Math.min(1, k.ork + STRID.orkVila * dt);
    k.vant -= dt;
    // den som ligger reser sig, och den som böjt sig ner tar upp vapnet (steg 3.7.8)
    if (k.ligger) { k.ligger -= dt; if (k.ligger <= 0) { k.ligger = undefined; st.logg.push({ t: st.t, h: 'upp', a: k.id }); } continue; }
    if (k.bocker) { k.bocker -= dt; if (k.bocker <= 0) { k.bocker = undefined; plocka(st, k); } continue; }
    if (hamtaSteg(st, k, dt)) continue;
    const m = valjMal(st, k);
    k.mal = m?.id;
    if (!m) continue;
    const v = VAP[k.vapen], d = dist(k, m);
    // den som är utmattad backar undan och hämtar andan medan en vän håller striden igång (steg 3.7.2)
    if (k.backar && k.ork >= STRID.backaTill && mod >= STRID.backaModTill) k.backar = undefined;
    else if (!k.backar && (k.ork < STRID.backa || (!avs.lek && mod < STRID.backaMod)) && st.kampar.some(o => o.sida === k.sida && o !== k && iStrid(o) && !o.backar)) { k.backar = true; st.logg.push({ t: st.t, h: 'backar', a: k.id }); }
    if (k.backar) { const l = d || 1, f = farten(k) * dt * 0.6; ga(st, k, k.x - (m.x - k.x) / l * 3, k.y - (m.y - k.y) / l * 3, f); continue; }
    if (avstandSteg(st, k, m, d, dt)) continue;
    if (d > v.rack) {
      ga(st, k, m.x, m.y, Math.min(d - v.rack * 0.9, farten(k) * dt));
      if (st.halt && slump(st) < STRID.halka * st.halt * dt) { omkull(st, k); continue; } // på hal mark
    }
    // den som ligger: i ett slagsmål låter den som inte är blodtörstig hen resa sig, de andra rusar fram (steg 3.7.8)
    if (m.ligger && !avs.nere && (avs.lek || (!avs.vapen && (k.st.torst ?? 0) < STRID.ruser))) {
      if (k.later !== m.id) { k.later = m.id; st.logg.push({ t: st.t, h: 'later', a: k.id, b: m.id }); }
      continue;
    }
    if (dist(k, m) <= v.rack && k.vant <= 0) { // den som just kom fram slår samma ögonblick
      if (!m.ligger && slump(st) < (k.vapen === 'hand' ? STRID.knuffHand : STRID.knuff)) knuffa(st, k, m); // eller knuffar
      else slaEtt(st, k, m);
      k.vant = v.takt * (1 - ((k.st.uthallighet - 10) / 20) * STRID.takt) * (0.85 + slump(st) * 0.3);
    }
  }
  // striden pågår så länge båda sidor har någon som står, tills de som flyr har kommit undan och, om avsikten är att
  // döda, tills de som ligger är döda
  const kvar = [0, 1].map(sd => st.kampar.some(k => k.sida === sd && iStrid(k)));
  const ofardig = st.kampar.some(k => k.lage === 'flykt' || (avs.nere && k.lage === 'nere' && kvar[1 - k.sida]));
  if ((!kvar[0] || !kvar[1]) && !ofardig || st.t >= STRID.maxTid) {
    const vinnare = kvar[0] && !kvar[1] ? 0 : kvar[1] && !kvar[0] ? 1 : -1;
    st.slut = { t: st.t, vinnare };
    st.logg.push({ t: st.t, h: 'slut' });
  }
}
// hela striden till slutet
export function stridTillSlut(st: Strid) { while (!st.slut) stridSteg(st); return st; }

// ---------- texten ----------
const GRAD = (g: number) => g >= 0.75 ? 'mycket svårt' : g >= 0.45 ? 'svårt' : g >= 0.2 ? 'måttligt' : 'lätt';
export const gradOrd = GRAD;
export const delNamn = (d: Kroppsdel) => KROPPSDELAR[d].i;
const namnOf = (st: Strid, id?: number) => st.kampar.find(k => k.id === id)?.namn ?? '?';
// hela meningen för en rad i loggen (syns när man trycker på raden eller håller musen över den)
export function stridText(st: Strid, r: StridRad): string {
  const a = namnOf(st, r.a), b = namnOf(st, r.b), v = r.v ? VAP[r.v] : undefined;
  const med = v && r.v !== 'hand' && r.v !== 'bett' ? ` med ${v.namn.toLowerCase()}` : '';
  switch (r.h) {
    case 'borjar': return `Striden börjar: ${AVS[st.avsikt].namn.toLowerCase()}. ${AVS[st.avsikt].text}`;
    case 'miss': return r.kast ? `${a} kastar ${v?.namn.toLowerCase()} mot ${b} men missar.` : `${a} ${v?.ord ?? 'slår'} efter ${b}${med} men missar.`;
    case 'avstand': return `${a} backar undan från ${b} och håller avståndet.`;
    case 'byter': return r.v === 'hand' ? `${a} har inget mer att kasta och slåss med händerna.` : `${a} tar ${v?.namn.toLowerCase()} ur bältet.`;
    case 'vantar': return `${a} väntar med kastet: ${b} slåss med en vän.`;
    case 'vada': return `${a} kastar ${v?.namn.toLowerCase()} men träffar sin vän ${b}.`;
    case 'fastnar': return `${v?.namn ?? 'Spjutet'} fastnar i ${delNamn(r.d!)} på ${a}.`;
    case 'drar': return `${a} drar ut spjutet ur ${delNamn(r.d!)}, och det blöder mer.`;
    case 'parera': return `${a} parerar slaget från ${b}${med}.`;
    case 'duck': return `${a} duckar undan slaget från ${b}.`;
    case 'backar': return `${a} drar sig bakom vännerna och hämtar andan.`;
    case 'tog': return `${a} ${r.kast ? 'träffar' : v?.ord ?? 'slår'} ${b} i ${delNamn(r.d!)}${med}, men ${sakNamn(r.kl ?? '').toLowerCase()} tar slaget.`;
    case 'traff': return `${a} ${r.kast ? 'kastar och träffar' : v?.ord ?? 'slår'} ${b} i ${delNamn(r.d!)}${med}: ${SKADOR[r.k!].ett}, ${GRAD(r.g!)}${r.kl ? ` (${sakNamn(r.kl).toLowerCase()} tog en del)` : ''}.`;
    case 'knuff': return `${a} knuffar ${b}, men ${b} står kvar.`;
    case 'omkull': return `${a} knuffar omkull ${b}.`;
    case 'halkar': return `${a} halkar och faller omkull.`;
    case 'upp': return `${a} reser sig.`;
    case 'later': return `${a} låter ${b} resa sig.`;
    case 'tappar': return `${a} tappar ${v?.namn.toLowerCase()}.`;
    case 'plockar': return r.b !== undefined ? `${a} tar upp ${v?.namn.toLowerCase()} som ${b} tappade.` : `${a} tar upp ${v?.namn.toLowerCase()} igen.`;
    case 'nere': return `${a} faller och kan inte slåss längre.`;
    case 'ger': return `${a} ger upp.`;
    case 'flykt': return `${a} vänder och flyr.`;
    case 'borta': return `${a} har flytt från platsen.`;
    case 'avstar': return `${a} vågar inte och drar sig undan utan strid.`;
    case 'dod': return `${a} dör.`;
    case 'slut': return st.slut?.vinnare === -1 ? 'Striden är slut utan att någon sida vann.' : `Striden är slut. ${sidaNamn(st, st.slut!.vinnare as 0 | 1)} vann.`;
  }
}
export const sidaNamn = (st: Strid, sd: 0 | 1) => { const n = st.kampar.filter(k => k.sida === sd).map(k => k.namn); return n.length <= 2 ? n.join(' och ') : `${n[0]} med ${n.length - 1} till`; };

// ---------- rapporten efter striden ----------
export const LAGE_ORD: Record<KampeLage, string> = { strid: 'står kvar', nere: 'ligger skadad', ger: 'gav upp', flykt: 'flydde', borta: 'flydde', dod: 'dog' };
export interface StridRapport {
  vinnare: 0 | 1 | -1; tid: number;
  sidor: { sida: 0 | 1; namn: string; folk: { id: number; namn: string; lage: KampeLage; skador: string[]; slag: number; traffar: number }[] }[];
  mest?: { id: number; namn: string; varfor: string };
}
export function stridRapport(st: Strid): StridRapport {
  const sidor = ([0, 1] as const).map(sd => ({
    sida: sd, namn: sidaNamn(st, sd),
    folk: st.kampar.filter(k => k.sida === sd).map(k => ({
      id: k.id, namn: k.namn, lage: k.lage, slag: k.slag, traffar: k.traffar,
      skador: k.skador.map(w => `${SKADOR[w.k].namn} i ${delNamn(w.d)}, ${GRAD(w.g)}`),
    })),
  }));
  let mest: Kampe | undefined;
  for (const k of st.kampar) if (k.gjort > 0 && (!mest || k.gjort > mest.gjort)) mest = k;
  return {
    vinnare: st.slut?.vinnare ?? -1, tid: st.slut?.t ?? st.t, sidor,
    mest: mest && { id: mest.id, namn: mest.namn, varfor: `${mest.traffar} träffar av ${mest.slag} slag` },
  };
}

// ---------- samma strid många gånger (arenan) ----------
export interface ManyResultat { n: number; vann: [number, number]; oavgjort: number; tid: number; slut: Record<KampeLage, number>; per: { id: number; namn: string; vann: number; dog: number; nere: number; traffar: number }[] }
export function korManga(u: Uppstallning, fro: number, n: number): ManyResultat {
  const res: ManyResultat = { n, vann: [0, 0], oavgjort: 0, tid: 0, slut: { strid: 0, nere: 0, ger: 0, flykt: 0, borta: 0, dod: 0 }, per: u.kampar.map(k => ({ id: k.id, namn: k.namn, vann: 0, dog: 0, nere: 0, traffar: 0 })) };
  for (let i = 0; i < n; i++) {
    const st = stridTillSlut(nyStrid(u, (fro + Math.imul(i + 1, 0x9e3779b9)) | 0));
    const w = st.slut!.vinnare;
    if (w === -1) res.oavgjort++; else res.vann[w]++;
    res.tid += st.slut!.t / n;
    st.kampar.forEach((k, j) => {
      if (k.lage !== 'strid') res.slut[k.lage]++;
      const p = res.per[j];
      if (k.sida === w) p.vann++;
      if (k.lage === 'dod') p.dog++;
      if (k.lage === 'nere') p.nere++;
      p.traffar += k.traffar / n;
    });
  }
  return res;
}

// ---------- kämpar ur byn och påhittade ----------
// en kämpe ur en person i byn: anlagen (åldern med), det bästa vapnet hen bär och kläderna. Skickligheten är färdigheten
// Närstrid (steg 3.7.2) och siktet Träffsäkerhet (steg 3.7.7); smidigheten och blodtörsten (steg 3.7.6). Reservvapnet
// (steg 3.7.7): ett litet vapen i bältet, om hen har ett bälte på sig och orkar bära det; den som en gång blev ifattsprungen
// utan reserv tar alltid med en
export function personKampe(s: State, p: Person, id: number, sida: 0 | 1, x: number, y: number): Uppstallning['kampar'][number] {
  const bar = [...new Set([...paSig(s, p), ...ownedBy(s, p)].map(t => t.k))]; // det hen bär och äger (i arenan har man sina saker med sig)
  const val = (v: Vapen) => VAP[v].skada * (1 + STRID.tyckeVal * smakAv(p, 'v:' + v)); // tycket drar i valet (steg 3.7.10)
  const vapen = MANNISKOVAPEN.filter(v => bar.includes(v)).sort((a, b) => val(b) - val(a))[0] ?? 'hand';
  const res = (MANNISKOVAPEN.filter(v => v !== vapen && VAP[v].liten && bar.includes(v)) as Vapen[]).sort((a, b) => VAP[a].takt - VAP[b].takt)[0]; // den snabbaste (kniven)
  const reserv = res && (p.reservAlltid || (harBalte(s, p) && paSigVikt(s, p) + bordOf(res) <= capacity(s, p))) ? res : undefined;
  return {
    id, namn: p.name, sida, pid: p.id, vapen, reserv, klader: bar.filter(k => SKYDD[k]), fart: 1, x, y, tung: clamp(paSigVikt(s, p) / Math.max(1, capacity(s, p)), 0, 1),
    st: { styrka: stat(p, 'styrka', s.now), uthallighet: stat(p, 'uthallighet', s.now), mod: stat(p, 'mod', s.now), smidighet: stat(p, 'smidighet', s.now), skicklighet: 5 + (p.skill.narstrid ?? 0) / 2 + STRID.tyckeSkick * smakAv(p, 'v:' + vapen), sikte: 5 + (p.skill.traff ?? 0) / 2, torst: blodtorst(s, p) },
  };
}
// en kämpe ur ett djur i djurregistret (DJUR.strid)
export function djurKampe(art: string, id: number, sida: 0 | 1, x: number, y: number): Uppstallning['kampar'][number] {
  const d = (DJUR as Record<string, { strid?: DjurStrid }>)[art].strid!;
  return { id, namn: d.namn, sida, djur: art, st: { styrka: d.styrka, uthallighet: d.uthallighet, mod: d.mod, smidighet: d.smidighet, skicklighet: d.skicklighet }, vapen: d.vapen, klader: [], fart: d.fart, x, y };
}
// det en djurart har i strid (djurregistret i redskap.ts)
export interface DjurStrid { namn: string; styrka: number; uthallighet: number; mod: number; smidighet: number; skicklighet: number; fart: number; vapen: Vapen }
export const STRIDSDJUR = () => Object.keys(DJUR).filter(a => (DJUR as Record<string, { strid?: DjurStrid }>)[a].strid);

// ---------- striden i byn (steg 3.7.2) ----------
// Ett gräl kan bli ett slagsmål, och barn som leker brottas ibland. Striden räknas färdigt på en gång (stridTillSlut, med
// fröet ur byns följd 'strid'), så att den blir likadan i båda lägena; sedan står de som var med och slåss (handlingen
// strid) så länge striden tog, och under tiden väntar de andra behoven (Björn efter v144): ingen går på toa, äter eller
// dricker mitt i striden. Skadorna blir riktiga skador (halsa.ts), den som dog i striden dör, och den som vann ett
// slagsmål blir ett rykte (rykten.ts). De senaste striderna sparas i byn (s.strider) så att arenan kan visa dem igen
export const SLAGSMAL = balans('slagsmal', {
  gral: 0.04, // chansen att ett gräl mellan två som är minst småbarn blir ett slagsmål ...
  gralTorst: 4, // ... gånger 1 + gralTorst × blodtörsten hos den som grälar (humor.ts)
  lek: 0.12, // chansen i timmen att ett barn som leker brottas med ett annat barn som leker nära ...
  lekNara: 3, // ... inom så här många rutor
  ovning: 0.15, // närstriden växer så här mycket efter en strid (ovning i folk.ts) ...
  ovningLek: 0.06, // ... och efter en lek
  kast: 0.03, // träffsäkerheten växer så här mycket per timme lek (kastlek med stenar och pinnar)
  jakt: 0.05, // ... och så här mycket per kanin man fångar
  op: 8, // relationen sjunker så här mycket efter ett slagsmål ...
  lekOp: 2, // ... och stiger så här mycket efter en lek
  vann: 0.15, forlora: 0.2, tankeTim: 8, // tanken efter att ha vunnit eller förlorat, och hur många timmar den varar
  minst: 20, // den som slåss står kvar minst så här många sekunder (striden tar tid också när den är kort)
  sparas: 10, // så många strider sparas i byn
});
// en strid som sparats i byn: när, varför, uppställningen och fröet (samma strid kan räknas om i arenan) och vem som vann
export interface StridMinne { t: number; orsak: string; u: Uppstallning; fro: number; vinnare: 0 | 1 | -1 }

// en strid mellan två sidor av folk i byn. Returnerar striden (för scenarierna)
export function stridIByn(s: State, avsikt: Avsikt, sidor: [Person[], Person[]], orsak: string): Strid {
  const vap = AVSIKTER[avsikt].vapen, W = vap ? 14 : 8, H = 6, isar = vap ? 3 : 1; // med vapen börjar striden på avstånd (steg 3.7.7)
  const kampar = sidor.flatMap((sida, sd) => sida.map((p, i) => personKampe(s, p, 0, sd as 0 | 1, sd === 0 ? W / 2 - isar : W / 2 + isar, H / 2 + (i - (sida.length - 1) / 2))));
  kampar.forEach((k, i) => { k.id = i + 1; });
  const halt = clamp(Math.max(((s.vader?.fukt ?? 0) - STRID.leraFran) / (1 - STRID.leraFran), snoPaMarken(s) * STRID.snoHalt), 0, 1); // lera och snö (steg 3.7.8)
  const u: Uppstallning = { avsikt, w: W, h: H, vind: vaderNu(s).vind, halt, kampar };
  const fro = Math.floor(rnd(s, 'strid') * 2147483647);
  const st = stridTillSlut(nyStrid(u, fro));
  const lek = !!(AVSIKTER[avsikt] as { lek?: true }).lek, vinnare = st.slut!.vinnare;
  (s.strider ??= []).push({ t: s.now, orsak, u, fro, vinnare });
  if (s.strider.length > SLAGSMAL.sparas) s.strider.splice(0, s.strider.length - SLAGSMAL.sparas);
  count(s, 'strider'); count(s, 'strid_' + avsikt);
  const folk = st.kampar.map(k => ({ k, p: sidor[k.sida][st.kampar.filter(o => o.sida === k.sida).indexOf(k)] }));
  const namn = (sd: 0 | 1) => sidor[sd].map(p => p.name).join(' och ');
  if (!lek) log(s, `${namn(0)} och ${namn(1)} slogs (${orsak}). ${vinnare === -1 ? 'Ingen vann.' : `${namn(vinnare as 0 | 1)} vann.`}`, 'rel', folk.map(f => f.p.id));
  for (const { k, p } of folk) {
    const mot = sidor[1 - k.sida];
    let dod = k.lage === 'dod';
    for (const w of k.skador) {
      if (!dod && skada(s, p, w.d, w.k, w.g, 'drap', `i ett ${lek ? 'lekslagsmål' : 'slagsmål'} med ${mot.map(q => q.name).join(' och ')}`)) dod = true;
      if (w.fast && p.skador?.length) p.skador[p.skador.length - 1].fast = 1; // spjutet sitter kvar till vården (steg 3.7.7)
    }
    if (dod) { count(s, 'drap'); die(s, p, 'drap'); continue; }
    p.blod = Math.min(p.blod ?? 1, Math.max(HALSA.blodDod, k.blod));
    ovning(p, 'narstrid', lek ? SLAGSMAL.ovningLek : SLAGSMAL.ovning);
    // tycket för vapnet (steg 3.7.10): den som vann eller övade med det gillar det, en svår förlust ger ogillande
    const svar = k.lage === 'nere' || k.skador.reduce((a, w) => a + w.g, 0) >= STRID.tyckeSvar;
    if (lek) smaka(p, 'v:' + k.vapen, STRID.tyckeLek);
    else if (vinnare === k.sida) smaka(p, 'v:' + k.vapen, STRID.tyckeVann);
    else if (vinnare !== -1 && svar) smaka(p, 'v:' + k.vapen, -STRID.tyckeForlust);
    if (k.ifatt) p.reservAlltid = true; // ifattsprungen utan reserv: tar alltid med en sedan (steg 3.7.7)
    if (k.vada) { // vådaträffen: skytten minns det, och de som såg det tycker hen är en klåpare
      const offer = st.kampar.find(o => o.sida === k.sida && o !== k && st.logg.some(r => r.h === 'vada' && r.a === k.id && r.b === o.id));
      const q = offer && sidor[offer.sida][st.kampar.filter(o => o.sida === offer.sida).indexOf(offer)];
      if (q) { think(p, `Träffade ${q.name} av misstag`, -SLAGSMAL.forlora, s.now, SLAGSMAL.tankeTim * HOUR); handelse(s, p, 'vadaskott', q); }
    }
    if (!lek && (k.lage === 'flykt' || k.lage === 'borta' || st.logg.some(r => r.h === 'avstar' && r.a === k.id)) && mot[0]) handelse(s, p, 'backade', mot[0]); // steg 3.7.9
    for (const q of mot) { const r = getRel(s, p, q); r.op = Math.max(-100, Math.min(100, r.op + (lek ? SLAGSMAL.lekOp : -SLAGSMAL.op / 2))); } // båda hållen: op/2 var
    if (!lek && vinnare !== -1) think(p, k.sida === vinnare ? `Vann slagsmålet mot ${mot[0].name}` : `Förlorade slagsmålet mot ${mot[0].name}`, k.sida === vinnare ? SLAGSMAL.vann : -SLAGSMAL.forlora, s.now, SLAGSMAL.tankeTim * HOUR);
    // striden tar tid: hen står kvar och slåss medan de andra behoven väntar
    avbryt(s, p);
    p.task = { act: 'strid', phase: 'do', tx: p.x, ty: p.y, until: s.now + Math.max(SLAGSMAL.minst, st.slut!.t) * SEC, carry: 0, why: orsak };
  }
  // vinnaren blir ett rykte i byn (steg 3.3.1): de som såg det minns det
  if (!lek && vinnare !== -1) for (const p of sidor[vinnare]) if (p.health > 0) handelse(s, p, 'vannSlagsmal', sidor[1 - vinnare][0]);
  return st;
}

// ett gräl (samtal.ts) kan bli ett slagsmål: oftare hos den blodtörstiga
export function gralBlirSlagsmal(s: State, a: Person, b: Person) {
  if (ageOf(a, s.now) < ALDER.smabarn || ageOf(b, s.now) < ALDER.smabarn || a.task?.act === 'strid' || b.task?.act === 'strid') return;
  if (rnd(s, 'strid', a) >= SLAGSMAL.gral * (1 + SLAGSMAL.gralTorst * blodtorst(s, a))) return;
  stridIByn(s, 'slagsmal', [[a], [b]], 'efter ett gräl');
  if (a.health > 0 && b.health > 0) handelse(s, a, 'sla', b); // den som började slagsmålet slog först
}

// medan ett barn leker: kastlek ger träffsäkerhet, och ibland brottas hen med ett annat barn som leker nära
export function lekSteg(s: State, p: Person, dtSec: number) {
  const h = dtSec / 3600;
  ovning(p, 'traff', SLAGSMAL.kast * h);
  if (rnd(s, 'strid', p) >= SLAGSMAL.lek * h) return;
  const andra = s.people.filter(q => q !== p && q.health > 0 && q.task?.act === 'leka' && q.task.phase === 'do' && Math.hypot(q.x - p.x, q.y - p.y) <= SLAGSMAL.lekNara);
  if (!andra.length) return;
  stridIByn(s, 'lek', [[p], [andra[Math.floor(rnd(s, 'strid', p) * andra.length)]]], 'på lek');
}
