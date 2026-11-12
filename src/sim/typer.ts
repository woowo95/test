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

// kartans storlek: varje by har sin egen (nya KARTA.bredd × KARTA.hojd, balanstalen i kartflytt.ts, steg 9.1.9). useMap(s) väljer byns karta och anropas när en by skapas,
// räknas fram eller visas. En äldre by (64×40 eller 80×50) får den stora kartan när den laddas (steg 2.10.9, kartflytt.ts):
// den gamla kartan ligger kvar i mitten med sitt hörn i (OX, OY) och sin storlek W0×H0, och allt som kommer ur kartans brus
// räknas från det hörnet, så att det gamla ser ut som förut. Utanför den fortsätter samma brus. En ny by har OX = OY = 0
export let W = 64;
export let H = 40;
export let OX = 0, OY = 0, W0 = 64, H0 = 40;
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
export const GRANNAR4 = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const; // rutorna bredvid, utan de snett

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

export enum T { Vatten, Sand, Gras, Skog, Sten, Lera } // Lera: torr sjöbotten under en torka (steg 3.8.2, torka.ts)

export const STATS = ['styrka', 'uthallighet', 'intelligens', 'nyfikenhet', 'karisma', 'skonhet', 'flit', 'empati', 'mod', 'minne', 'smidighet', 'aggression'] as const; // smidighet och aggression: steg 3.7.6
export type Stat = typeof STATS[number];
export const STAT_NAMES: Record<Stat, string> = {
  styrka: 'Styrka', uthallighet: 'Uthållighet', intelligens: 'Intelligens', nyfikenhet: 'Nyfikenhet',
  karisma: 'Karisma', skonhet: 'Skönhet', flit: 'Flit', empati: 'Empati', mod: 'Mod', minne: 'Minne', smidighet: 'Smidighet', aggression: 'Aggression',
};
// vad varje egenskap påverkar utöver arbetena som har den som egenskap (ACTS), med orden personrutan visar.
// Skriv till en rad när simuleringen börjar fråga efter egenskapen på ett nytt ställe
export const STAT_GOR: Record<Stat, string[]> = {
  styrka: ['Hur mycket man orkar bära'],
  uthallighet: ['Att fisken sitter kvar när den nappat'],
  intelligens: ['Hur fort man lär sig färdigheter, lärdomar och tekniker', 'Att tända elden', 'Att känna igen svamp', 'Att väljas till byggare'],
  nyfikenhet: ['Att komma på nya tekniker', 'Hur långt bort man går på promenad', 'Att lita på platser man inte känner', 'Att tända byns allra första eld'],
  karisma: ['Att dela med sig av lärdomar i samtal', 'Hur charmig man är i samtal', 'Hur mycket rösten väger när byns seder ändras'],
  skonhet: ['Hur charmig och attraktiv man är i samtal'],
  flit: ['Pliktkänslan', 'Lusten att göra hantverk, också på kvällen', 'Att fylla på elden i rätt tid'],
  empati: ['Att trösta och ge gåvor', 'Att aldrig ta något utan lov, när den är hög', 'Att vilja ha eld när andra fryser', 'Hur ofta man pratar med andra', 'Pliktkänslan'],
  mod: ['Att väljas till nattvakt', 'Hur långt bort man vågar gå', 'Att inte låta rädslor styra'],
  minne: ['Hur länge man minns platser och lärdomar'],
  smidighet: ['Att inte råka ut för olyckor i arbetet', 'Att fånga harar', 'Att fisken sitter kvar när den nappat', 'Hur fort man tar sig fram i skog och snår', 'Hur fint det blir som man tillverkar', 'Hur snabb man är och hur bra man duckar i en strid'],
  aggression: ['Att slå i stället för att gråta när man mår dåligt', 'Att gräla', 'Hur hårt man straffar som ledare', 'Blodtörsten: att vilja döda, med låg empati och dåligt humör', 'Att inte ge sig i en strid'],
};
export const SKILLS = ['samla', 'jakt', 'fiske', 'ved', 'hantverk', 'berattande', 'matlagning', 'narstrid', 'traff', 'skaldskap', 'handel', 'lakekonst', 'odling', 'skotsel'] as const; // skotsel: steg 9.8.1 (djuren, tamdjur.ts); // odling: steg 9.7.7 (fälten, odling.ts); // lakekonst: steg 9.5.7 (vården, halsa.ts); // handel: steg 4.4.1.4 (byten, behov.ts); skaldskap: steg 4.3.2.5 (framtradande.ts); matlagning: steg 2.8.1 (matlagning.ts); narstrid, traff: steg 3.7.2 (strid.ts). Eldkonsten togs bort i steg 3.10.8
export type Skill = typeof SKILLS[number];
export const SKILL_NAMES: Record<Skill, string> = {
  samla: 'Samling', jakt: 'Jakt', fiske: 'Fiske', ved: 'Trähuggning', hantverk: 'Hantverk', berattande: 'Berättande', matlagning: 'Matlagning', narstrid: 'Närstrid', traff: 'Träffsäkerhet', skaldskap: 'Skaldskap', handel: 'Handel', lakekonst: 'Läkekonst', odling: 'Odling', skotsel: 'Djurskötsel',
};
// vad varje färdighet påverkar utöver arbetena som övar den (ACTS arbete), och hur den växer
export const SKILL_GOR: Record<Skill, string[]> = {
  samla: ['Att känna igen svamp'],
  jakt: [],
  fiske: ['Att fisken sitter kvar när den nappat'],
  ved: [],
  hantverk: ['Hur fort man tillverkar och bygger', 'Att väljas till byggare', 'Lusten att göra hantverk', 'Att tända elden', 'Att väljas till att tända och flytta elden'],
  berattande: ['Lusten att berätta på kvällen'],
  matlagning: ['Att inte bränna maten vid grillen'],
  narstrid: ['Att träffa, parera och slå hårt i en strid', 'Växer av slagsmål och brottning på lek'],
  traff: ['Att träffa med ett kast eller skott', 'Växer av kastlek och jakt'],
  skaldskap: ['Hur bra framträdandena blir och vilka former man kan', 'Att vilja uppträda på kvällen', 'Växer när man berättar, sjunger, spelar eller talar'],
  lakekonst: ['Hur länge ett rengjort sår håller sig rent', 'Växer när man vårdar en skadad'], // steg 9.5.7
  odling: ['Hur fort man arbetar på fältet', 'Hur stor skörden blir', 'Växer av arbetet på fältet'], // steg 9.7.7
  skotsel: ['Hur väl man sköter byns djur', 'Växer när man matar, mjölkar, klipper och vallar'], // steg 9.8.1
  handel: ['Hur stor del av vinsten i ett byte man får', 'Att lura en ovan, och att märka när man själv blir lurad', 'Att väljas att handla för byn', 'Växer av varje byte'],
};

// det personrutan visar när man trycker på en färdighet (steg 3.10.6): nycklarna i p.gjort (gjort i folk.ts), det senaste
// dygnet och totalt. av = nyckeln det är en del av, så att andelen visas (hur stor del av försöken som gav fisk)
export const SKILL_STAT: Record<Skill, { k: string; namn: string; av?: string }[]> = {
  samla: [{ k: 'samlat', namn: 'Bär och rötter samlade' }],
  jakt: [{ k: 'jaktForsok', namn: 'Försök' }, { k: 'kanin', namn: 'Harar fångade', av: 'jaktForsok' }, { k: 'fagel', namn: 'Fåglar fällda' }, { k: 'radjur', namn: 'Rådjur fällda' }],
  fiske: [{ k: 'fiskeForsok', namn: 'Försök' }, { k: 'fisk', namn: 'Gav fisk', av: 'fiskeForsok' }],
  ved: [{ k: 'trad', namn: 'Träd fällda' }],
  hantverk: [{ k: 'gjort', namn: 'Saker gjorda' }, { k: 'mobel', namn: 'Möbler och stationer byggda' }, { k: 'tandForsok', namn: 'Försök att tända elden' }, { k: 'tande', namn: 'Tände elden', av: 'tandForsok' }], // tändningen räknas ur hantverket (steg 3.10.8)
  berattande: [{ k: 'berattat', namn: 'Lärdomar berättade' }],
  matlagning: [{ k: 'grillat', namn: 'Grillat' }],
  narstrid: [{ k: 'slagsmal', namn: 'Slagsmål' }, { k: 'vann', namn: 'Vann', av: 'slagsmal' }],
  traff: [{ k: 'kast', namn: 'Kast' }, { k: 'kastTraff', namn: 'Träffade', av: 'kast' }],
  skaldskap: [{ k: 'upptradt', namn: 'Framträdanden' }],
  lakekonst: [{ k: 'vardat', namn: 'Vårdtillfällen' }],
  odling: [{ k: 'odlat', namn: 'Rutor skötta' }],
  skotsel: [{ k: 'matat', namn: 'Matade djur' }, { k: 'vallat', namn: 'Vallade djur' }, { k: 'klippt', namn: 'Klippta får' }, { k: 'mjolkat', namn: 'Mjölkade getter' }, { k: 'avlivat', namn: 'Avlivade djur' }, { k: 'slagit', namn: 'Slagna ängsrutor' }, { k: 'hamlat', namn: 'Hamlade björkar' }],
  handel: [{ k: 'bytt', namn: 'Byten' }, { k: 'lurade', namn: 'Lurade någon', av: 'bytt' }, { k: 'lurad', namn: 'Märkte att någon lurade', av: 'bytt' }],
};

export const AGES = ['Istid', 'Vårtid', 'Sommartid', 'Hösttid'];
// det som står i händelseloggen när tidsåldern börjar (steg.ts), i samma ordning
export const AGES_BORJAR = ['Istiden har börjat. Sjön fryser och maten blir knapp.', 'Vårtiden har kommit. Isen släpper och marken tinar.', 'Sommartiden är här. Bär och fisk finns i överflöd.', 'Hösttiden har börjat. Nu gäller det att samla inför istiden.'];

export const GREN = 0.4; // en gren ger lika mycket bränsle som 0,4 ved: grenar brinner fort

export interface Thought { text: string; v: number; until: number }
// Det en person håller på med (p.task, sparas med personen). Fälten utan frågetecken finns alltid
export interface Task {
  fr?: number; // odla: rutan på fältet man arbetar på (steg 9.7.1, odling.ts)
  arbTid?: number; // ett arbete som räknas från framkomsten (framme i ACTS): så lång tid tar det när man är framme (steg 9.2.130)
  mortBete?: 0 | 1; // fiske: en mört används som bete (steg 7.4.4)
  blotVed?: number; // så stor del av veden som bärs som är blöt (steg 7.3.4)
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
  med?: number; // den man samtalar med och står bredvid (steg 4.5.6.7, samtalMed i samtal.ts)
  stracka?: number[]; // rutorna samlaren valt att gå till i tur och ordning (steg 10.2.21, nastaPaStrackan i steg.ts)
  vant?: number; // sekunder som den som står still vid arbetet väntat med att räknas (steg 10.2.21, vantar i steg.ts)
  ensam?: number; // sekunder som den som gått för att samtala inte haft någon att prata med (steg 10.2.16)
  skiljs?: 1; // samtalet är slut och man går ifrån varandra en bit (steg 4.5.6.7)
  path?: number[]; // rutorna kvar att gå längs vägen (steg.ts, walk)
  runda?: number; varv?: number; stopp?: number; vidEld?: boolean; // vaktens runda: stoppet hen är vid, antal stopp sedan elden, när stoppet är slut, om hen står vid elden (vakt.ts)
  kring?: { x: number; y: number }; // promenaden: mitten av området man går runt i (steg 6.2.8, turSteg i steg.ts)
  rikt?: number; // promenaden: riktningen man går åt (radianer, steg 9.2.84); nästa punkt väljs ungefär åt samma håll
  stanna?: boolean; // vårdaren hinner inte hämta förband utan går direkt och trycker (steg 9.5.16)
  hopp?: boolean; plock?: number; sett?: number[]; // rundan (steg 4.5.6.1, steg.ts): på väg till nästa ruta, sekunder kvar av stoppet, rutorna man nyss plockat på
  letat?: number; // på rundan (steg 9.2.55): sekunder som gåtts sedan förra plocket; det man hittar under tiden (ägg, mossa, hö) räknas på dem
  pk?: string; // nyckeln som vägen gäller för: målet och byggversionen. Ändras den räknas vägen om
  ref?: number; // det arbetet gäller: stammen som huggs, biten som byggs eller huset som ett träd fälls för
  koll?: number; // sekunder arbetade sedan platsen senast bedömdes (fisket: är stranden utfiskad?), så att bedömningen inte följer stegens längd
  prog?: number; // fiske: sekunder arbete mot nästa försök
  styckTill?: number; // styckningen av ett fällt djur pågår till dess (styckning.ts, steg 6.6.2)
  jf?: Jaktforsok; // jakten: försöket som pågår (jakt.ts, Björn efter v159)
  mal?: string; // måltiden vid bordet: det som åts, som syns på bordet och i händerna (behov.ts, steg 3.10.3)
  leta?: 'grupp' | 'karta'; // jakten: hen går mot en grupp kaniner hen ser, eller letar dit kaninerna brukar vara (jakt.ts, steg 3.10.3)
  tool?: string; // redskapet som används, t.ex. fiskespjut, eller slaget av bygge eller hantverk (vagg, golv, laga, rep)
  res?: { x: number; y: number; until: number }; // var och till när arbetet fortsätter efter att bördan bärts hem
  site?: { x: number; y: number }; // bygget (eller platsen för arbetet, steg 9.2.43) man går till efter att ha hämtat material
  mx?: number; my?: number; // där man står för att arbeta på rutan (tx, ty), en grannruta (steg 9.2.47)
  hamta?: 1; // på väg till lagret efter materialet (steg 9.2.43)
  hamtat?: Record<string, number>; // materialet till ett hantverk som bärs från lagret till platsen (steg 9.2.43); det ligger redan i det påbörjade
  mask?: number; // fiske: maskar på kroken till metspöet
  hal?: number; // fiske: sekunder kvar att hugga på hålet i isen (steg 2.11.3, is.ts); 0 = hålet är upphugget
  fran?: number; // den man tar ved av till elden (stöld, behov.ts)
  kom?: Record<string, number>; // var materialet till bygget kom ifrån (bygg.ts)
  sok?: true; // letar flinta eller stenar vid stenarna: blir platsen tom fortsätter man ändå i stället för att gå hem (steg.ts, workStep)
  pass?: number; // när ett pass med redskap som görs är slut (ms): blir ett klart före det görs ett till om byn vill ha fler (steg 2.3.8)
  handel?: true; // görs att byta med handlaren (steg 6.2.11): redskapet är slaget i tool, repet tvinnas över det byn vill ha
  hamtar?: string; // materialet uppgiften hämtar till ett projekt eller bygge (steg 6.1.17): samlandet ger det, också när förrådet har tändmaterial nog
  tandmat?: true; // samlar tändmaterial åt en släckt eld: blir platsen tom på bär fortsätter man tills tändmaterialet räcker (steg.ts, workStep)
  bar?: number; // vården: den skadade som bärs hem (halsa.ts, steg 2.5.2)
  falt?: true; // vattensäcken bärs till fältet ref i stället för till en människa (torka.ts, steg 3.8.2)
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
  te?: { till: number; q: number };
  larmRoll?: { hot: string; roll: import('./roller').LarmRoll; v: number; t: number }; // rollen vid larmet och när den valdes (steg 9.5.19, roller.ts)
  foder?: { f: string; till: number; hjalp?: number }; // förlossningen pågår: förloppet, när barnet föds och hjälparen (steg 9.5.29, forlossning.ts)
  krycka?: 1; // hen har en krycka till sitt brutna ben (steg 9.5.28, protes.ts)
  forbandMed?: number; ropT?: number; // remsorna i bältet och när hen senast ropade på hjälp (steg 9.5.16, halsa.ts)
  rus?: number; supit?: number; fylla?: 1; bak?: number; // fylla = var full i kväll, bak = timmar bakfylla kvar (steg 9.6.15) // berusningen nu och det man supit på sistone (steg 9.6.14, rus.ts)
  protMinne?: string[]; // proteinet i de senaste måltiderna (steg 9.6.5, behov.ts)
  hn?: Record<string, number>; hnBlodat?: 1; // hälsans tecken förra timmen och att hen blött (steg 9.5.31, halsonotiser.ts)
  blodNotis?: 1; // notisen om att hen snart förblöder är skickad (steg 9.5.14, halsa.ts) // örtteet hjälper motståndet till dess, med teets kvalitet (steg 9.5.8, vatskor.ts)
  sorg?: { namn: string; ord: string; v: number; dygn: number; t0: number; s2?: 1; s3?: 1 }[]; // sorgen i stadier efter en död (steg 9.2.33, liv.ts)
  pratArbete?: number; // samtalen hen haft medan hen arbetat (steg 8.1.12)
  id: number; name: string; sex: 'm' | 'k';
  gavSig?: number; // när hen flydde eller gav upp i en strid med rövare (steg 10.1.14): hen ställer sig inte i vägen igen på en stund (rovarSkydd)
  framme?: number; // räknad fram till den här tiden: under de korta stegen tar den som inte är inblandad i faran sitt arbete en minutbit i förväg (steg 10.1.4, slag i steg.ts)
  gast?: import('./gast').GastRad; smitta?: import('./sjukdom').SjukId; // en gäst: handlaren, en rövare eller en främling (steg 9.2.111, gast.ts); id är då negativt; smitta: sjukdomen en gäst bär utan att någon ser det (steg 9.5.5)
  born: number; died?: number; cause?: string; left?: number;
  fran?: number; // grannklanen hen kom ifrån (en främling, steg 4.4.4.2)
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
  brinner?: number; // när hen började brinna, tills elden släckts (steg 6.4.16, brand.ts)
  blod: number; // 1 = allt blod, under HALSA.blodDod förblöder man (steg 2.5.1, halsa.ts)
  skador?: import('./halsa').Skada[]; // skadorna som inte läkt än (halsa.ts)
  saknas?: import('./halsa').Kroppsdel[]; // förlorade kroppsdelar (steg 8.2.3)
  protes?: Partial<Record<import('./halsa').Kroppsdel, string>>; // protesen på en förlorad del: träbenet, kryckan, kroken eller ögonlappen (steg 9.5.11, protes.ts)
  men?: import('./halsa').Men[]; // det som läkt fel (steg 8.2.4)
  arr?: { d: import('./halsa').Kroppsdel; n: number }[]; // ärren (steg 8.2.4)
  sinnen?: number; // karisman gånger detta, när synen, hörseln eller talet är sämre (steg 8.2.2)
  svimmat?: boolean; // ligger medvetslös (steg 8.2.6)
  bonD?: number; bonNodD?: number; bonVan?: { t: number; o: string; vem?: number }; tack?: string; tvivel?: number; profet?: boolean; sedDod?: number[]; fasta?: number; skuld?: number; // bönen och tron (system 8.5)
  drag?: { namn: string; v: number; t: number }; // anfallarnas tro som en dragning efter att ha svurit trohet (steg 8.8.6)
  missnoje?: number; // missnöjet med styret, 0–1 (steg 8.3.10, rost.ts)
  straffad?: boolean; utanRost?: boolean; utanVard?: number; tjanst?: number; brottsling?: boolean; // straffen (steg 8.4.8): straffad, förlorad röst, utan vård till (steg 9.5.30), samhällstjänsten till, avrättad
  naring?: Record<import('./naring').Naring, number>; // näringsvärdena 0–1; mättnaden (hunger) är en sammanfattning av dem (steg 2.6.1, naring.ts)
  langtan?: Partial<Record<import('./naring').Naring, number>>; // vad andra berättat att de längtar efter, och till när man minns det (steg 2.6.2)
  habit: Record<string, number>; // timmar per aktivitet, bleknar med tiden (ger yrkestaggar)
  sjuk?: import('./sjukdom').Sjuk; immun?: Record<string, 1>; // sjukdomen hen har och de hen är immun mot (steg 9.5.1, sjukdom.ts)
  sickUntil?: number; sickWhy?: string; poisonUntil?: number; stulet?: { av: number; k: string; n: number; l?: boolean }[]; pregnantSince?: number; pregnantBy?: number; lastBirth?: number; guardDay?: number; // pregnantBy: barnets far; guardDay: dygnet hen valdes till nattens vakt
  fiske?: { f: number; n: number; k: number }; // fiske med händerna: försök, napp och fångade fiskar
  gjort?: { h: number; n: Record<string, number>; t: Record<string, number[]> }; // det hen gjort, totalt (n) och per timme det senaste dygnet (t), h = timmen då något räknades sist (gjort i folk.ts, steg 3.10.6)
  tek?: Record<string, number>; // teknik: hur nära personen är att komma på något, 1 = kan det
  byten?: ByteMinne[]; // de senaste bytena hen var med i (BYTE.minnas, steg 4.5.4.17)
  hopp?: string[]; // teknikerna hen kommit närmare genom ett köpt redskap (steg 4.5.4.16), en gång per teknik
  lar?: { av: number; tek: string }; // lärling hos mästaren av i tekniken tek (nivå 4–5, steg 4.2.3.3)
  halvminne?: string[]; // tekniker hen var lärling i när mästaren dog: det hen hunnit lära sig finns kvar i tek (steg 4.2.3.4)
  kunskap?: Record<string, { v: number; t: number }>; // det personen kan (alltid rätt), 0–1, och när det senast användes
  lardomar?: Lardom[]; // det personen tror om platser (kan vara fel, överdrivet eller inaktuellt)
  raddAkt?: Record<string, number>; // rädslan för en handling efter en olycka, per rad i TABU_AKT (steg 8.4.10)
  thoughts: Thought[];
  x: number; y: number; task?: Task;
  fame: string[];
  hand?: import('./personlogg').PersonRad[]; // personens händelser, de senaste (steg 9.2.107, personlogg.ts)
  sportVinst?: Record<string, number>; // matcher personen vunnit i varje sport (steg 4.3.1.2, sport.ts)
  kallad?: string[]; // yrkestaggar personen redan fått, så att det bara står i loggen första gången
  hue: number;
  tag?: string; // yrkestagg efter vad personen ägnar mest tid åt
  // relationstyperna (steg 3.1.1, relationer.ts), räknade en gång i timmen: bästa vän, ärkefiende, rivaler (och yrket man tävlar
  // i, om någon rival har samma), och för den unga mentorn och färdigheten mentorn lär ut
  bast?: number; arke?: number; rivaler?: number[]; rivalom?: string; mentor?: number; mentorSk?: Skill;
  // uppväxten (steg 3.1.2, uppvaxt.ts): det hen var med om som barn, och anlagen (det hen föddes med, som barnen ärver).
  // p.pot är anlagen plus upplevelserna; anlag saknas så länge hen inte har någon upplevelse
  upp?: Upplevelse[]; anlag?: Record<Stat, number>;
  andlig?: number; // andligheten, 0–100: hur viktigt det heliga är för hen (steg 4.1.1.1, religion.ts)
  tro?: number; troStyrka?: number; // tron hen har (id i s.tron) och hur stark den är, 0–100 (steg 4.1.2, religion.ts)
  svartSjuk?: 1; // är svårt sjuk just nu: när hen blir frisk är det ett tecken för föräldrarna (steg 4.1.2.1)
  prat?: import('./berattelser').Prat; // det senaste samtalet: med vem och om vad (steg 3.9.5, berattelser.ts)
  binamn?: import('./berattelser').Binamn; // öknamnet eller hedersnamnet byn gav (steg 3.9.1, berattelser.ts)
  varsel?: { k: import('./motgang').MotgangId; t: number; c: number; src?: number }; // en motgång som personen anar eller hört om: när den börjar och hur säker (steg 3.8.1, motgang.ts)
  forv?: { f: number; w: number }; // förväntan och rikedom (humor.ts, steg 3.2.1)
  // utbrotten (steg 3.2.2, humor.ts): hur många nyss (klingar av), och det som väntar på att brista ut (slaget och när)
  utb?: number; ubr?: { k: string; t: number };
  lekt?: number; // när ett barn senast lekte (färre utbrott efteråt, steg 3.2.4)
  morkT?: number; // när hen senast var vaken i mörkret (lite sämre humör en stund, steg 6.3.4, ljus.ts)
  larm?: import('./rykten').Larm; // det senaste larmet man hört (steg 3.7.11, rykten.ts)
  intryck?: import('./rykten').Intryck[]; // det personen tycker att andra är, och varför (steg 3.3, rykten.ts)
  smak?: Record<string, number>; // tycke och smak: 'a:' + arbete, 'm:' + mat eller 'v:' + vapen (steg 3.7.10), -1 till 1 (steg 3.3.5, rykten.ts)
  reservAlltid?: true; // blev ifattsprungen utan reservvapen: tar alltid med ett i strid (steg 3.7.7, strid.ts)
  liv?: Record<string, number>; // det hen varit med om och gjort, i tal: vargar hen dödat, folk hen vårdat, hus, svält hen överlevt … och 't:' + slaget = när det senast räknades (steg 3.9.8, folk.ts livet)
  skam?: number; // straffad med skam av ledaren: håller sig undan elden och samtalen till dess (steg 3.5.3, styre.ts)
}
// en upplevelse i barndomen eller vuxenlivet: slaget (UPPLEVELSER i uppvaxt.ts), åldern (år), vad den gjorde med egenskaperna och vem
// eller vad den gällde
// v = från vuxenlivet och t = när (steg 4.1.1.2), n = hur mycket den flyttade andligheten (steg 4.1.1.3), b = hur många steg den bleknat (steg 4.1.1.4)
export interface Upplevelse { k: import('./uppvaxt').UpplevelseTyp; a: number; e: Partial<Record<Stat, number>>; om?: string; v?: 1; t?: number; n?: number; b?: number }

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

export interface LogEntry { t: number; text: string; kind: 'birth' | 'death' | 'rel' | 'skill' | 'world' | 'move'; ids: number[]; byte?: ByteMinne; bnr?: number; fram?: number; match?: number; sam?: { slag: 'lar' | 'byte'; k: number; n: string; d: string[] }; m?: string } // byte = bytet raden handlar om (steg 4.5.4.17), bnr = bara dess nummer när en bybo minns bytet (p.byten), så att det inte sparas två gånger (steg 5.5.6), fram = framträdandets nummer (steg 5.4.7.1), match = matchens (steg 5.4.8.1), sam = raden samlar flera händelser av samma slag (SAMLA i folk.ts, steg 6.7.5), m = mallen raden skrevs ur (loggBer i berattelser.ts, steg 6.7.7)
// ett byte som det minns (steg 4.5.4.17): med raden i loggen, hos bybor som var med (p.byten) och hos handlaren. a köpte (m i
// byteKlart) och gav ag, b gav bg; p = priset i silver styck när bytet gjordes. fa/fb = var a:s och b:s filt låg (där sakerna
// syns gå från den ena filten till den andra), saknas när bytet gjordes från hand till hand
export interface ByteVara { k: string; n: number; p: number }
// forsok = buden i en affär med handlaren (steg 5.4.6.1), avbruten = de blev inte överens (ag och bg är då tomma), rel =
// hur mycket handlaren gillade bybon före och efter affären (−100 till 100)
export interface ByteMinne { nr: number; t: number; a: number; an: string; b: number; bn: string; ag: ByteVara[]; bg: ByteVara[]; fa?: { x: number; y: number }; fb?: { x: number; y: number }; forsok?: ByteForsok[]; avbruten?: true; rel?: [number, number]; arg?: string[] } // arg = argumenten i berättelsen (steg 5.4.6.2, handelsber.ts)
// ett bud i förhandlingen (steg 5.4.6.1): det kunden ville ha, det hen bjöd, vad handlaren krävde och vad budet var värt för
// hen (i silver), och om hen sa ja
export interface ByteForsok { vill: { k: string; n: number }[]; bud: { k: string; n: number }[]; krav: number; bjod: number; ja?: true }

export interface State {
  v: number; // numret på den senaste uppgraderingen av sparfilen (UPPGRADERINGAR i varld.ts)
  seed: number; founded: number; now: number;
  rngs?: Record<string, number>; // var i sin slumpföljd varje system är (slump.ts)
  hist?: Historik; // byns historik: nyckeltal och krönika (historik.ts)
  textminne?: Record<string, string[]>; // textminnet (steg 6.7.3): början på de tre senaste krönikaraderna per mall, utan historiken
  notiser?: import('./notiser').Notiser; // notiserna som spelaren inte tagit bort (notiser.ts, steg 5.4.3)
  W?: number; H?: number; // kartans storlek (saknas i de äldsta byarna: 64×40)
  kart?: Kart; // var den gamla kartan ligger i en äldre by som fått den stora kartan (steg 2.10.9, kartflytt.ts)
  people: Person[]; rels: Record<string, Rel>; nextId: number;
  food?: number; wood?: number; // äldre sparfiler (före v40): maten och veden i förrådet, nu räknade ur stackarna
  log: LogEntry[];
  lastAgeIdx: number; lastGuardDay?: number; // lastGuardDay: kalenderns dygn då nattens vakt senast valdes (val.ts)
  arbBehov?: { mat: number; ved: number; arb: Record<'mat' | 'ved' | 'bygga' | 'tand' | 'leta' | 'kol', number>; mal?: Record<string, { b: number; t: number }>; brist?: Record<string, number>; bv?: number }; // byns behov för arbetsordningen och arbetarna för varje rad, räknat en gång i timmen (dygn mat och ved, val.ts steg 6.1.12–6.1.13; materialens buffert och lagrets plats, forradsmal.ts steg 6.2.14)
  forbruk?: Record<string, number>; // materialen som tagits ur förrådet, ett glidande medel över FORRAD.forbrukDygn (forradsmal.ts, steg 6.2.14)
  items?: Record<string, number>; // äldre sparfiler (före v40): sakerna och redskapen i förrådet som summor
  fire: Fire;
  seder: Seder;
  tron?: import('./religion').Tro[]; // trosriktningarna i byn (steg 4.1.2, religion.ts)
  troSkalor?: import('./religion').SkalaId[]; // skalorna som låsts upp efter de två första (steg 4.1.4, religion.ts)
  delning?: import('./delning').Delning; // byns rikedom och hur mycket av det nya som ges till byn (delning.ts)
  mark?: string; // markens grästäcke per ruta (stigar), packat
  skog?: string; // trädens tillväxt per ruta, packat
  tradSort?: string; // trädens sort per ruta (gran eller björk), packat (trad.ts, steg 5.1.6)
  buskar?: string; // buskarna och hur länge gräset stått orört per ruta, packat (buskar.ts, steg 6.5.3)
  barbuskar?: number; // 1 = bärbuskarna är utsådda (steg 6.5.4, buskar.ts)
  tradAlder?: string; // trädens ålder efter att de vuxit klart, dygn per ruta, packat (trad.ts, steg 5.1.4.2)
  stockar?: Stock[]; // fällda träd som ligger och väntar på att huggas
  stridRapporter?: { t: number; orsak: string; vinnare?: number; n: number }[]; // de äldre striderna (steg 8.8.10)
  tabun?: import('./lagar').Tabu[]; // farliga platser som hela byn undviker (steg 8.4.10)
  tabuAkt?: import('./lagar').TabuAkt[]; // handlingar som hela byn låter bli (steg 8.4.10)
  skattLedare?: number; // så mycket har gått till ledarens förråd som skatt (steg 8.4.17)
  aktOm?: Record<string, string>; // vad byn minns om olyckan bakom rädslan för en handling
  gravar?: import('./kvarlevor').Grav[]; gravplatser?: Record<string, { x: number; y: number }>; heliga?: import('./kult').HeligPlats[]; ritual?: import('./kult').Ritual; ritualKo?: import('./kult').Ritual[]; // graven, de heliga platserna och ritualerna (system 8.5)
  kvarlevor?: import('./kvarlevor').Kvarleva[]; nextKvar?: number; // det som blir kvar av en människa (steg 8.2.3, kvarlevor.ts)
  lager?: { x: number; y: number; w: number; h: number }; // lagerplatsen, rutor
  mat?: Record<string, number>; // äldre sparfiler (före v40): maten per slag
  marken?: { x: number; y: number; k: string; n: number }[]; // gamla sparfiler: saker på marken (nu i stackar)
  lagren?: import('./lager').Zone[]; // lagerplatserna
  gastTing?: import('./agande').Ting[]; gastTingNr?: number; // det gästerna bär (steg 10.1.8, gast.ts): samma slags ting som byns, men i en egen lista, så att byns räkningar inte ser dem
  ting?: import('./agande').Ting[]; nextTing?: number; // varje redskap för sig, det enda som sparas om redskapen: skick, ägare (0 = byn), vem som har det i handen eller bördan, rutan det ligger på stationen det hör till, vem som gjorde det och när, kvaliteten (agande.ts, kvalitet.ts)
  tingVag?: { id: number; k: string; c: number; agare: number; hos?: number }[]; // äldre sparfiler (före v40): redskap som bars mellan lagerplatser
  agare?: Record<string, number[]>; // sparfiler från v30: redskapens ägare (blir s.ting)
  stackar?: { k: string; n: number; c: number; x: number; y: number; ag?: Record<string, number>; dold?: number }[]; // alla stackar med plats och skick (c: 1 = nytt), det enda som sparas om förrådet. ag = vems stacken är (lager.ts)
  delar?: Record<string, Record<string, number>>; forlust?: Record<string, number>; andelRest?: Record<string, number>; // det påbörjade per ägare och slag (under 1), det som försvunnit i delar, tills det blir hela saker, och det som blivit över av var och ens del när byn får en andel (steg 2.10.7, lager.ts)
  egna?: Record<string, Record<string, number>>; egnaT?: Record<string, number>; // äldre sparfiler (före v40): vems sakerna i förrådet var
  uppsatta?: Uppsatt[]; // de uppsatta facklorna (ljus.ts, steg 6.3.7)
  ljus?: TalgLjus[]; // talgljusen på borden och hyllorna inne (ljus.ts, steg 6.3.8)
  morkPlats?: Record<number, number>; // ruta -> hur många timmar någon varit vaken i mörker där, som avtar (ljus.ts)
  kolnad?: number[]; // de kolnade stammarna efter en brand (steg 9.2.26, brand.ts): rutorna, torrakor tills de faller eller huggs
  stubbar?: { x: number; y: number; t: number; v?: number; kol?: 1 }[]; // stubbar efter fällda träd, t = när trädet fälldes, v = träet den ger när den grävs bort (steg 6.5.7)
  nextStock?: number; fallda?: number;
  matSnitt?: number; // maten i förrådet i dygn för alla, glidande snitt över ungefär ett år (liv.ts)
  halvfallt?: Record<number, number>; // träd som någon har börjat fälla: ruta -> hur länge (ms) man har arbetat med det (paborjat.ts)
  fynd?: string; // hur mycket som tagits ur varje plats (bär, vilt, fisk), packat
  byggen?: import('./byggnad').Bit[]; hus?: import('./byggnad').Hus[]; byggV?: number; nextBit?: number; byggSok?: number; byggBehov?: Record<string, number>; mjardar?: import('./fisk').Mjarde[]; torg?: { x: number; y: number; w: number; h: number }; infart?: { klar?: 1; stopp?: 1 }; bryggV?: number; byplan?: import('./byggplan').Byplan; // väggar, golv och öppningar, husen byn planerat, ändringsräknare
  kunskap?: Record<string, number>; // äldre sparfiler: byns gemensamma kunskap, flyttas till varje person
  kal?: { t0: number; a0: number; b0: number }; // kalendern: tidsåldern a0 började t0 och slutar måndagen b0 (dagens nummer), se tid.ts
  ruttet?: number; // mat som ruttnat bort på sistone (glöms med tiden, byggnader.ts)
  skramma?: number[]; // fälten som har en fågelskrämma (steg 9.7.11, odling.ts)
  tamdjur?: import('./tamdjur').Tamdjur[]; nextTam?: number; // de tama djuren (fas 9.8, tamdjur.ts) och nästa lediga nummer
  hons?: import('./hons').Hons; // hönsflocken (steg 9.8.10, hons.ts)
  angar?: import('./slatter').Ang[]; // slåtterängarna (steg 9.8.9, slatter.ts)
  hamlade?: import('./slatter').Hamlat[]; // de hamlade björkarna (steg 9.8.16, slatter.ts)
  godsel?: number; // gödseln från fähuset som ännu inte blivit en hel rest i komposten (steg 9.8.9)
  hagar?: import('./hage').Hage[]; // hagarna (steg 9.8.4, tamdjur.ts)
  staket?: number[]; // rutorna med staket (steg 9.7.10, odling.ts)
  sophog?: { x: number; y: number; n: number }; // sophögen och resterna på den (steg 9.7.5, rester.ts)
  bord?: Record<number, number>; // bördigheten på de rutor där den inte är full (steg 9.7.2, odling.ts)
  kockHand?: Record<string, number>; // hur skicklig kocken var, per slag av lagad mat i förrådet (0–1, steg 9.6.4, matlagning.ts)
  atTakt?: number; atSist?: number; // det byn äter per person och dygn (glidande snitt) och räknaren atit förra timmen (ekonomi.ts, atSteg)
  stat?: Record<string, number>; // räknare: svamp, fiskeförsök, napp, fångst med mera
  sjoar?: Record<number, import('./sjo').SjoStat>; // fiske och bad per sjö (sjo.ts)
  stationer?: import('./stationer').Station[]; nextStation?: number; // arbetsstationerna, som slaktbänken (stationer.ts)
  falt?: import('./odling').Falt[]; nextFalt?: number; // fälten (steg 2.10.3, odling.ts)
  vader?: import('./vader').VaderMinne; // fukten och snön på marken (steg 2.11.1, vader.ts)
  is?: import('./is').IsMinne; // vattnets temperatur och isens tjocklek (steg 2.11.3, is.ts)
  brasa?: { vill: number; x: number; y: number }; // byn vill ha en lägereld till (0 till 1) nära mitten av sovplatserna x, y (brasor.ts, räknas varje timme)
  eldar?: Fire[]; // lägereldarna efter den första (s.fire), med plats (at) och nummer (id), steg 4.5.6.8 (eld.ts, brasor.ts)
  flackar?: import('./smuts').Flack[]; // fläckar på marken som bleknar: toa-smutsen (smuts.ts)
  blod?: import('./blod').Blodflack[]; // blodet på marken (bara utseende, blod.ts)
  hygien?: number; // hur mycket byn vet om att toa-smutsen gör vattnet sjukt (0–1, smuts.ts, steg 2.7.2)
  styre?: import('./styre').Styre; // ledaren, påbuden, straffen och vågskålarna (steg 3.5, styre.ts)
  djurHalsa?: import('./djur').DjurHalsa[]; djurDoda?: { id: number; t: number }[]; // skadade och dödade djur (steg 3.7.13, djur.ts)
  bjornMott?: { ar: number; ids: number[] }; // de som mött björnen i år (steg 6.6.5, bjorn.ts): var och en en gång per år
  // björnjakten (steg 6.6.6, bjorn.ts): när och av vem björnen senast sågs, jägarna och den som kallade, och året björnen fälldes
  bjornJakt?: { ar: number; sedd: number; sag: number; x?: number; y?: number; timme?: number; jagare?: number[]; kallare?: number; kallTill?: number; jaktTill?: number; samlas?: number };
  bjornFalld?: number;
  flod?: { niva: number; hogst?: number; mindes?: 1 }; // översvämningen (steg 3.8.3, flod.ts): så många rutor upp på land som vattnet står, det högsta det nått och om byn redan minns det (steg 3.8.7)
  husAffar?: { hus: number; ag: number; t: number }; // ett hus som ska byta ägare när köparen och säljaren möts (steg 7.2.12, byggplan.ts)
  flodHot?: number; flodBlot?: number; flodMinne?: number; // medan vattnet stiger: så många rutor upp på land som byn bär undan maten från; så många som är blöta (vattnet står där nu eller stod där nyss, ingen sover där); och så högt som byn minns att vattnet nått (inget byggs där). Räknas varje timme (steg 3.8.7, flod.ts, flodHotad i sjo.ts)
  tornadoStig?: number[]; // rutorna där tornadon slet upp gräset till en jordstig, bara för bilden (steg 6.4.13): de syns tills gräset vuxit tillbaka
  tornado?: import('./tornado').Tornado; // tornadon som drar fram (steg 3.8.4, tornado.ts): banan, hur långt den kommit och vad den gjort
  kartStrider?: import('./kartstrid').KartStrid[]; kartStridNr?: number; // striderna som pågår på kartan (steg 10.1.4, kartstrid.ts)
  stegRest?: number; // (äldre sparning: det som var kvar av ett delat slag; tas bort)
  skuld?: number; // sekunder som ska räknas men inte räcker till ett helt slag (step i steg.ts, steg 10.2.14)
  takter?: Record<string, number>; // när varje rad i TAKTER räknades sist (steg 10.2.14, steg.ts)
  bjornUndan?: { fran: number; till: number; x0: number; y0: number; x1: number; y1: number }; // björnen går bort efter en strid (steg 9.2.30)
  stationFlytt?: { id: number; x: number; y: number; rot?: 1; vinst: number }; // den station ute som är mest värd att flytta närmare dem som använder den (steg 9.4.8, stationer.ts)
  larmV?: number; // ökar när något händer i ett larm (någon skadas eller dör), så att rollerna väljs om (steg 9.5.19, roller.ts)
  lagerFlytt?: { i: number; ny: { x: number; y: number }; vinst: number; saker: number }; // den lagerplats som är mest värd att flytta närmare mitten, räknad varje timme (steg 9.4.7, lager.ts)
  plockat?: Record<string, { n: number; t: number }>; // det som plockats av grenar och stenar på en ruta och när (steg 9.2.53, steg.ts); det växer tillbaka
  testTorr?: 1; // testläget: marken är torkad helt (steg 9.2.24, brand.ts); bara i kopian av byn
  nedslag?: { x: number; y: number; t: number }[]; // blixtens senaste nedslag (steg 9.2.21, brand.ts): gränssnittet ritar blixten där
  brand?: import('./brand').Brand; // eldsvådan som brinner (steg 3.8.5, brand.ts): rutorna som brinner och det den gjort
  aska?: [number, number][]; // rutorna som brann nyss och när (steg 3.8.5, brand.ts): marken är svart en tid
  sjoTorr?: { niva: number; tomma: number[]; v: number; t: number; pa?: true; regn?: number }; // torkan (steg 3.8.2, torka.ts): så många rutor vid kanten som är torr sjöbotten, sjöarna som torkat ut, ändringsräknaren, när det senast ändrades, om torkan pågår och regnet sedan vattnet steg senast
  motgang?: { varslad?: number; klok?: number; pagar?: { k: import('./motgang').MotgangId; t: number; dog: number } }; // motgången som byn varslats om (när den börjar), den som den klokaste anat (steg 3.8.6) och den som pågår (steg 3.8.1, motgang.ts)
  vargar?: Vargflock[]; vargNr?: number; // vargflockarna på kartan och hur många som kommit (steg 3.7.1, varg.ts)
  djurSkramd?: { g: number; t: number }[]; // kaningrupper som skrämts av en jägare, och när (steg 3.7.3, jakt.ts)
  djurFlykt?: { g: number; t: number; dx: number; dy: number; sek?: number }[]; // kaningrupper som flytt från en jägare: från tiden t så här långt (steg 4.5.4.1, djur.ts)
  kaninStart?: Record<string, { x0: number; y0: number; x1: number; y1: number; n0: number } | null>; // där kaningrupperna dök upp och vart de glider, per grupp och tid (steg 6.6.8, djur.ts)
  bjornVag?: { t0: number; v: { x: number; y: number; fram: number; gar: number; bar: boolean }[] | null }; // björnens väg i dag, räknad när dygnet började och sparad i byn, så att den är densamma efter inläsning (steg 6.6.4, djur.ts)
  faglarBorta?: { x: number; y: number; t: number }[]; // platser där fåglarna flugit bort från kartan, och när (steg 6.6.3, djur.ts)
  sportBast?: Record<string, number>; // den bästa i varje sport (personens id, steg 4.3.1.2)
  fram?: import('./framtradande').Fram; framKvall?: number; framNr?: number; // framträdandet som pågår och kvällen då det senaste hölls (steg 4.3.2.1)
  framtradanden?: import('./framtradande').FramMinne[]; // de senaste framträdandena
  matcher?: import('./sport').MatchMinne[]; matchNr?: number; // de senaste matcherna (steg 5.4.8.1)
  overl?: import('./byte').Overl[]; filtar?: import('./byte').Filt[]; filtNr?: number; byteNr?: number; bytt?: import('./byte').Bytt[];
  rovareFler?: import('./rovare').Rovarflock[]; // flockar som väntar på att få gå (steg 8.7.18)
  rovare?: import('./rovare').Rovarflock; rovarNr?: number; rovarVila?: number; // rövarflocken på kartan, hur många som kommit och när nästa tidigast kommer (steg 4.4.5, rovare.ts)
  klaner?: import('./klaner').Klan[]; klanNr?: number; // grannklanerna (steg 4.4.3, klaner.ts)
  handlarKopt?: Record<string, number>; // det handlarna köpt av byn och byborna, per slag, på det senaste besök då slaget köptes (steg 6.2.11, handel.ts)
  epidemi?: { k: import('./sjukdom').SjukId; ids: number[]; skriven?: 1 }; // utbrottet som pågår (steg 9.5.5, sjukdom.ts)
  handlare?: import('./handel').Handlare; nastaHandlare?: number; handlarNr?: number; gastNr?: number; // handlaren som är på besök, när nästa kommer och hur många som kommit (steg 4.4.1.2, handel.ts) // det som syns gå från hand till hand och filtarna med det som byts (bara för bilden), och det som nyss bytts bort (steg 4.4.1.1, byte.ts)
  sport?: import('./sport').Match; // matchen som pågår eller väntar på spelare (steg 4.3.1, sport.ts)
  borta?: Borta; // sammanfattningen efter bortavaron som spelaren inte stängt än (steg 3.10.22, ui/spara.ts); simuleringen rör den inte
}
// sammanfattningen efter bortavaron (steg 3.10.22): när den började, hur många som fötts och dött då, och vad var och en
// kunde (kunskapen, 0–1) och trodde (lärdomarna som 'slag:plats') då. Sparas med byn tills spelaren stänger den
export interface Borta { fran: number; fodda: number; doda: number; folk?: number; kan?: Record<number, { k: Record<string, number>; l: string[] }> } // kan: bara i äldre sparfiler (före steg 5.4.3.4)
// en vargflock (steg 3.7.1, varg.ts): vargarnas id (den första leder flocken), var den är och vart den går (mx, my), när den
// drar vidare, hungern (0–1), vad den gör, personen den anfaller, när den senast sågs och av vem (sag, steg 3.10.20) och jägarna efter den.
// dorr = öppningen (rutan) där den väntar utanför en stängd dörr, och vantar = sedan när (steg 3.7.21)
export interface Vargflock { sx?: number; sy?: number; id: number; vargar: number[]; x: number; y: number; mx: number; my: number; gar: number; hunger: number; gor: 'stryker' | 'smyger' | 'anfaller' | 'vantar' | 'flyr'; byte?: number; sedd?: number; sag?: number; jagare?: number[]; kallare?: number; kallTill?: number; jaktTill?: number; samlas?: number; dorr?: { x: number; y: number }; vantar?: number; trottnat?: true; valp?: true; tam?: number } // valp: en vargvalp går med flocken (steg 9.8.2, tamdjur.ts)
// ett fällt träd: ved och grenar som finns kvar att hugga ut
export interface Stock { id: number; x: number; y: number; ved: number; grenar: number; mossa?: number; av?: number } // mossa på stammen (steg 2.5.2), den som fällde (steg 9.2.87)

// ---------- seder ----------
// Byns gemensamma värderingar, -1..1. Registret (SEDER) står i seder.ts.
// v = sederna nu, ev = tillskott från händelser (bleknar), at = senaste omräkning
export interface Seder { v: Record<import('./seder').Sed, number>; at?: number } // händelserna som flyttade byns seder direkt (ev, log) togs bort i steg 4.5.4.9

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
export interface Historik { tal: string[]; tim: number[][]; dygn: number[][]; kronika: ([number, string] | [number, string, string])[]; kartor?: [number, string][]; rik?: RikRad[] } // kartor: en bild av kartan per dygn (kartminne.ts, steg 5.4.5.2); rik: byns rikedom per dygn (historik.ts, steg 6.9.13)
// tid, förrådets, redskapens och husens värde, varje levande persons förmögenhet (id till värde) och antalet av varje sak
export type RikRad = [number, number, number, number, Record<string, number>, Record<string, number>];
export interface FireLog { t: number; k: 'tänd' | 'fyll' | 'slocknade' | 'glöd' | 'sprack'; id?: number; n?: number }
export interface Fire {
  blot?: number; // så stor del av bränslet som är blött (steg 7.3.4)
  hearth: string; fuel: number; lit: boolean; emberUntil?: number; ring?: boolean; // ringen av stenar runt eldplatsen
  litAt?: number; litBy?: number; burned: number; // denna eld
  totalBurned: number; litSec: number; lightings: number; outs: number;
  tries: number; tryTotal: number; tryProg: number; // försök sedan elden senast brann, totalt, sekunder in i pågående försök
  fills: Record<string, number>; log: FireLog[];
  want?: number; wantBy?: number; wantWhy?: string; // största önskan om ved på elden just nu, och vems
  ash?: number; ashUntil?: number; // kolhög efter en utbrunnen eld
  at?: { x: number; y: number }; // var elden står om den flyttats (steg 2.10.4); annars där kartan lade den (getMap(seed).fire)
  flytt?: { x: number; y: number; varfor: 'plats' | 'vuxit' }; // elden ska flyttas hit (eldflytt.ts)
  // en lägereld till (steg 4.5.6.8, s.eldar): numret (task.ref för den som eldar, tänder eller hämtar kol vid den), de som har
  // sin sovplats närmast den (räknas varje timme i brasor.ts), när den slocknade och när ringen lades
  id?: number; folk?: number[]; ut?: number; klar?: number;
}

// en fackla som satts upp i marken eller på en vägg (ljus.ts, steg 6.3.7): rutan, hur mycket som är kvar av den (c, 0–1),
// om den brinner och sedan när (tandT), och åt vilket håll väggen den sitter på står (vx, vy; ingen = i marken)
export interface Uppsatt { x: number; y: number; c: number; tand?: true; tandT?: number; vx?: number; vy?: number }
// ett talgljus som står på ett bord eller en hylla inne (ljus.ts, steg 6.3.8): stationen, hur mycket som är kvar (c, 0–1), om det brinner
export interface TalgLjus { st: number; c: number; tand?: true; tandT?: number }
