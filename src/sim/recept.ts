import { balans } from './balans';
import type { TidSlag } from './tider';

// köttslagen (steg 10.3.14): det råa köttet av varje art som DJUR (redskap.ts) ger; grillen, torken, röken, saltet, ingredienserna,
// hundens foder och det vargen stjäl läser listan, och scenariot styckning kontrollerar att varje arts kött står här
export const KOTTSLAG: readonly string[] = ['kott', 'vargkott', 'radjurkott', 'farkott', 'getkott', 'kokott', 'svinkott', 'fagelkott', 'bjornkott'];

// ---------- recepten (steg 6.10.2) ----------
// Allt som görs av något annat har sitt recept här, i ett register som de andra registren frågar: sakerna (saker.ts),
// stationerna och möblerna och deras tillbehör (stationer.ts), dörrarna (byggnad.ts) och plaggen (klader.ts). Då syns och
// balanseras kostnaderna på ett ställe (npm run recept). En rad: av = materialet som går åt (hela saker), min = minuters
// arbete, och för sakerna slag (vilket slag av arbete tiden hör till, TIDSLAG i tider.ts), tek = tekniken som behövs,
// verktyg = något av dem behövs men finns kvar (med ordet för det i texterna) och ger = så många det blir (nävern). Ett
// plagg tar dessutom mangd bitar av sitt material (skinn eller rep, KLADMATERIAL i klader.ts), utöver det i av.
// Väggarna och golven (MATERIAL i byggnad.ts) räknas per ruta och står kvar där. Det som slaktas (kött, skinn, ben) har
// bara arbetet: materialet är djuret.
// bank = stationen där det görs fortare och bättre än för hand (steg 9.4.5), bara = det görs bara där, kniv = det täljs och kräver
// kniven som ligger på bänken
export interface ReceptRad { var: 'sak' | 'station' | 'tillbehor' | 'dorr' | 'plagg'; av?: Record<string, number>; ger?: number; min: number; slag?: TidSlag; tek?: string; verktyg?: Record<string, string>; mangd?: number; bank?: 'snickarbank' | 'drejskiva'; bara?: true; kniv?: true }

// Balanstal (regel 8): materialet och minuterna för stationerna, möblerna, tillbehören och dörrarna
export const RT = balans('recept', {
  slaktbankVirke: 3, // en slaktbänk kräver så mycket virke (steg 4.5.5.2) ...
  slaktbankMin: 20, // ... och så många minuters arbete
  scenVirke: 6, scenMin: 20, // scenen (steg 4.3.2.2): så många plankor till golvet (steg 10.2.90) och så många minuters arbete
  flatarbankVirke: 2, // en flätarbänk kräver så mycket virke ...
  flatarbankGrenar: 3, // ... och så många grenar ...
  flatarbankMin: 20, // ... och så många minuters arbete
  halmbaddHo: 4, // en halmbädd kräver så mycket hö ...
  halmbaddGrenar: 2, // ... och så många grenar ...
  halmbaddMin: 20, // ... och så många minuters arbete
  fallSkinn: 2, // en skinnfäll kräver så många skinn ... (steg 2.2.14)
  fallMin: 20, // ... och så många minuters arbete
  bordVirke: 1, // ett bord kräver så mycket virke för varje två rutor det tar, och ett till för stubbarna att sitta på runt det (steg 2.2.15, 4.5.5.2)
  bordMin: 15, bord2Min: 18, bord3Min: 20, // så många minuters arbete för det lilla bordet, bordet och långbordet
  hyllaVirke: 1, hyllaRep: 1, hyllaMin: 20, // en hylla kräver så mycket virke och rep och så många minuters arbete (hur mycket den rymmer står i STATION)
  kistaVirke: 2, kistaMin: 20, // en kista: virke och minuter (rymmer: STATION)
  stallVirke: 1, stallRep: 1, stallMin: 15, // ett ställ för redskap och vapen: virke, rep och minuter (rymmer: STATION)
  latrinMin: 20, // så många minuters arbete att gräva gropen, med benspaden (som slits enligt STATION.latrinSpade)
  grillGrenar: 3, grillRep: 1, grillMin: 15, // grillen: så många grenar och rep och så många minuters arbete
  torkGrenar: 5, torkRep: 1, torkMin: 20, // torkställningen: så många grenar och rep och så många minuters arbete
  brasaSten: 6, brasaMin: 15, // en lägereld till: så många stenar (som lägereldens ring) och så många minuters arbete
  hogsateVirke: 3, hogsateMin: 15, bankVirke: 2, bankMin: 12, // långhusets högsäte och bänkar (steg 10.2.68)
  krubbaVirke: 2, krubbaMin: 12, // krubban i fähuset (steg 10.2.88)
  skinndorrSkinn: 2, // en skinndörr görs av så många skinn ...
  skinndorrMin: 20, // ... och så många minuters arbete
  tradorrVirke: 2, tradorrRep: 1, // en trädörr görs av så mycket virke (steg 4.5.5.2) och rep ...
  tradorrMin: 20, // ... och så många minuters arbete
});
// trä till ett bord som tar w × h rutor, med stubbar på platserna runt det (platserAv i stationer.ts)
const bordSkiva = (w: number, h: number) => Math.ceil(w * h / 2) * RT.bordVirke; // skivan av plankor (steg 10.2.90): en planka för varje två rutor, och ett virke till stubbarna (litet bord 1, bord 2, långbord 3)

// det som skärs ur ett slaktat djur med kniven: lika för varje art, min minuter av slaget slag
function slakt<const K extends string>(ks: readonly K[], min: number, slag: 'liten' | 'stor') {
  return Object.fromEntries(ks.map(k => [k, { var: 'sak' as const, min, slag, tek: 'kniv' }])) as Record<K, { var: 'sak'; min: number; slag: 'liten' | 'stor'; tek: string }>;
}
const DEF = {
  // sakerna (saker.ts): redskapen, maten som lagas och det som slaktas
  kott: { var: 'sak', min: 3, slag: 'liten', tek: 'kniv' },
  fisk: { var: 'sak', av: { abborre: 1 }, min: 2, slag: 'liten' },
  // steg 7.5: stationerna och det som görs där
  stenhuggarplats: { var: 'station', av: { sten: 4, virke: 1 }, min: 20, slag: 'stor', tek: 'stenhuggarplats' },
  klyvplats: { var: 'station', av: { virke: 1, ved: 2 }, min: 15, slag: 'stor', tek: 'klyvplats' },
  ortkok: { var: 'station', av: { virke: 2, sten: 4 }, min: 20, slag: 'stor', tek: 'ortkok' },
  snickarbank: { var: 'station', av: { virke: 2, plankor: 2 }, min: 15, slag: 'stor', tek: 'snickarbank' }, // steg 9.4.4
  skrivpulpet: { var: 'station', av: { plankor: 2, virke: 1 }, min: 15, slag: 'stor', tek: 'skrivpulpet' }, // steg 10.6.11
  garvning: { var: 'station', av: { grenar: 4, rep: 2 }, min: 15, slag: 'stor', tek: 'garvning' },
  vavstol: { var: 'station', av: { virke: 2, sten: 4, rep: 1 }, min: 20, slag: 'stor', tek: 'vavstol' },
  harden: { var: 'station', av: { huggen_sten: 6 }, min: 20, slag: 'stor', tek: 'harden' },
  huggen_sten: { var: 'sak', av: { sten: 2 }, min: 5, slag: 'stor', tek: 'stenhuggarplats' },
  plankor: { var: 'sak', av: { virke: 1 }, min: 5, slag: 'stor', tek: 'klyvplats' },
  salva: { var: 'sak', av: { rolleka: 2, talg: 1 }, min: 5, slag: 'stor', tek: 'ortkok' },
  tjara: { var: 'sak', av: { ved: 3 }, min: 5, slag: 'stor', tek: 'ortkok' },
  benlim: { var: 'sak', av: { ben: 2 }, min: 5, slag: 'stor', tek: 'ortkok' },
  tval: { var: 'sak', av: { kol: 1, talg: 1 }, min: 5, slag: 'stor', tek: 'ortkok' },
  lader: { var: 'sak', av: { skinn: 1, talg: 1 }, min: 5, slag: 'stor', tek: 'garvning' },
  bok: { var: 'sak', av: { pergament: 8, plankor: 2 }, min: 5, slag: 'stor', tek: 'bok', bank: 'snickarbank', bara: true }, // steg 10.6.6: 8 blad mellan 2 plankor
  pergament: { var: 'sak', av: { skinn: 1 }, min: 5, slag: 'stor', tek: 'pergament' }, // steg 10.6.4: ett skinn blir 4 blad vid garvningsställningen
  lin: { var: 'sak', av: { ratlin: 1 }, min: 4, slag: 'liten', tek: 'tork' },
  trad: { var: 'sak', av: { lin: 2 }, min: 3, slag: 'liten', tek: 'slanda' },
  lintyg: { var: 'sak', av: { trad: 3 }, min: 5, slag: 'stor', tek: 'vavstol' },
  ulltrad: { var: 'sak', av: { ull: 2 }, min: 3, slag: 'liten', tek: 'slanda' }, ylle: { var: 'sak', av: { ulltrad: 3 }, min: 5, slag: 'stor', tek: 'vavstol' }, // ullen (steg 9.8.14): som linet
  leksak: { var: 'sak', av: { grenar: 1 }, min: 3, slag: 'liten', tek: 'leksak', bank: 'snickarbank' },
  snara: { var: 'sak', av: { rep: 1, grenar: 2, ben: 1 }, min: 4, slag: 'liten', tek: 'snara' },
  bur: { var: 'sak', av: { grenar: 4, rep: 2 }, min: 4, slag: 'liten', tek: 'bur' }, // buren (steg 10.10.13)
  ridsadel: { var: 'sak', av: { skinn: 2, rep: 2 }, min: 5, slag: 'stor', tek: 'ridning' }, // ridsadeln (steg 11.11.4): sys vid slöjdbänken
  packsadel: { var: 'sak', av: { skinn: 3, rep: 2, grenar: 2 }, min: 5, slag: 'stor', tek: 'ryggsack' }, // packsadeln (steg 11.11.3): sys vid slöjdbänken
  talt: { var: 'sak', av: { skinn: 4, grenar: 4, rep: 2 }, min: 5, slag: 'stor', tek: 'talt' }, // tältet (steg 11.11.1): sys vid slöjdbänken
  grop: { var: 'sak', av: {}, min: 5, slag: 'stor', tek: 'grop', verktyg: { benspade: 'benspaden' } }, // grävs på plats i skogen och täcks med grenar som bryts där (steg 10.2.84)
  byxor: { var: 'plagg', mangd: 2, av: { rep: 1 }, min: 5 },
  barnklader: { var: 'plagg', mangd: 2, av: { rep: 1 }, min: 5 }, // steg 13.2.4
  mossa: { var: 'plagg', mangd: 1, av: {}, min: 4 },
  snoskor: { var: 'plagg', mangd: 1, av: { grenar: 2, rep: 1 }, min: 5 },
  prastdrakt: { var: 'plagg', mangd: 3, av: { rep: 1 }, min: 5 }, tecken: { var: 'plagg', mangd: 1, av: { rep: 1 }, min: 3 }, mask: { var: 'plagg', mangd: 2, av: {}, min: 5 }, // system 8.5
  rokelse: { var: 'sak', av: { talg: 1 }, min: 5, slag: 'stor', tek: 'ortkok' }, brannolja: { var: 'sak', av: { talg: 1 }, min: 5, slag: 'stor', tek: 'ortkok' }, // steg 8.5.16
  rustning: { var: 'plagg', mangd: 4, av: { rep: 2 }, min: 5 }, hjalm: { var: 'plagg', mangd: 2, av: { rep: 1 }, min: 5 }, // steg 8.7.1–8.7.2
  skold: { var: 'sak', av: { ved: 3, rep: 1 }, min: 3, slag: 'liten', tek: 'skold', bank: 'snickarbank', bara: true }, bage: { var: 'sak', av: { virke: 2, rep: 1 }, min: 3, slag: 'liten', tek: 'bage', bank: 'snickarbank', bara: true, kniv: true }, pilar: { var: 'sak', av: { ved: 1, flinta: 1 }, min: 3, slag: 'liten', tek: 'bage', bank: 'snickarbank' }, slunga: { var: 'sak', av: { lader: 1, rep: 1 }, min: 3, slag: 'liten', tek: 'slunga' }, horn: { var: 'sak', av: { ben: 2 }, min: 3, slag: 'liten', tek: 'horn' }, // steg 8.7.3, 8.7.6, 8.7.11
  mantel: { var: 'plagg', mangd: 3, av: { rep: 1 }, min: 5 }, // steg 8.3.14
  halsband: { var: 'plagg', mangd: 3, av: { rep: 1 }, min: 5 },
  tunika: { var: 'plagg', mangd: 3, av: {}, min: 5 },
  skjorta: { var: 'plagg', mangd: 2, av: {}, min: 5 },
  hatt: { var: 'plagg', mangd: 2, av: {}, min: 3 }, // halmhatten (steg 12.1.34): två hö, en liten sak
  kappa: { var: 'plagg', mangd: 3, av: {}, min: 5 }, sjal: { var: 'plagg', mangd: 1, av: {}, min: 3 }, // ullens plagg (steg 9.8.15)
  braxkott: { var: 'sak', av: { braxen: 1 }, ger: 2, min: 3, slag: 'liten' }, /* en braxen ger två kött (rensa i DJUR) */ sikkott: { var: 'sak', av: { sik: 1 }, min: 3, slag: 'liten' }, // steg 9.6.17
  rokfisk: { var: 'sak', av: { fisk: 1 }, min: 2, slag: 'liten' }, rokkott: { var: 'sak', av: { kott: 1 }, min: 2, slag: 'liten' }, // steg 9.6.8
  saltfisk: { var: 'sak', av: { fisk: 4, salt: 1 }, ger: 4, min: 3, slag: 'liten' }, saltkott: { var: 'sak', av: { kott: 4, salt: 1 }, ger: 4, min: 3, slag: 'liten' }, // steg 9.6.19
  malt: { var: 'sak', av: { korn: 4 }, ger: 4, min: 2, slag: 'liten' }, mjol: { var: 'sak', av: { korn: 4 }, ger: 4, min: 4, slag: 'liten' }, brod: { var: 'sak', av: { mjol: 4 }, ger: 4, min: 3, slag: 'liten' }, // steg 9.6.13, 9.6.22 och 9.6.23
  gaddkott: { var: 'sak', av: { gadda: 1 }, min: 3, slag: 'liten' }, // gäddan ger 2 kött (steg 7.4.3)
  mortkott: { var: 'sak', av: { mort: 2 }, min: 2, slag: 'liten' }, // 2 mörtar rensas till 1 kött
  fangstbank: { var: 'station', av: { virke: 2, grenar: 2 }, min: 20, slag: 'stor', tek: 'fangstbank' }, // steg 7.4.1
  mjarde: { var: 'sak', av: { torrgras: 3, rep: 1 }, min: 5, slag: 'stor', tek: 'mjarde' }, // steg 7.4.2: görs bara vid fångstbänken
  yxa: { var: 'sak', av: { flinta: 1, grenar: 1 }, min: 5, slag: 'stor', tek: 'yxa' },
  fiskespjut: { var: 'sak', av: { grenar: 1 }, min: 4, slag: 'liten', tek: 'fiskespjut', verktyg: { yxa: 'yxan', flinta: 'en flintsten' }, bank: 'snickarbank' },
  korg: { var: 'sak', av: { torrgras: 3 }, min: 5, slag: 'stor', tek: 'korg' },
  rep: { var: 'sak', av: { torrgras: 2 }, min: 4, slag: 'liten', tek: 'rep' },
  talg: { var: 'sak', min: 3, slag: 'liten', tek: 'kniv' },
  ben: { var: 'sak', min: 3, slag: 'liten', tek: 'kniv' },
  flintspjut: { var: 'sak', av: { flinta: 1, rep: 1, grenar: 1 }, min: 4, slag: 'liten', tek: 'flintspjut', bank: 'snickarbank' },
  nat: { var: 'sak', av: { trad: 8, rep: 1, sten: 2 }, min: 5, slag: 'stor', tek: 'nat' }, // nätet (steg 9.6.16): mycket tråd, knutet vid slöjdbänken, med stenar som sänken
  metspo: { var: 'sak', av: { rep: 1, ben: 1, grenar: 1 }, min: 4, slag: 'liten', tek: 'metspo', bank: 'snickarbank' },
  kniv: { var: 'sak', av: { flinta: 1, grenar: 1 }, min: 4, slag: 'liten', tek: 'kniv' },
  skinn: { var: 'sak', min: 5, slag: 'stor', tek: 'kniv' },
  ...slakt(['vargkott', 'radjurkott', 'farkott', 'getkott', 'kokott', 'svinkott', 'fagelkott', 'bjornkott'], 3, 'liten'), // köttet av varje art (steg 10.3.14)
  ...slakt(['farskinn', 'getskinn', 'kohud', 'svinskinn', 'vitskinn', 'vargskinn'], 5, 'stor'), // skinnen
  fjadrar: { var: 'sak', min: 2, slag: 'liten', tek: 'kniv' },
  ...slakt(['radjursskinn', 'bjornskinn'], 5, 'stor'),
  bensyl: { var: 'sak', av: { ben: 1 }, min: 4, slag: 'liten', tek: 'bensyl', verktyg: { sten: 'en sten', flinta: 'en flinta' } },
  boll: { var: 'sak', av: { skinn: 1, torrgras: 1 }, min: 4, slag: 'liten', tek: 'boll' },
  slagtra: { var: 'sak', av: { ved: 1 }, min: 4, slag: 'liten', tek: 'slagtra', verktyg: { kniv: 'kniven', flinta: 'en flinta' }, bank: 'snickarbank' },
  mal: { var: 'sak', av: { grenar: 2, rep: 1 }, min: 3, slag: 'liten', tek: 'mal', bank: 'snickarbank' },
  trumma: { var: 'sak', av: { skinn: 1, ved: 1 }, min: 4, slag: 'liten', tek: 'trumma', bank: 'snickarbank' },
  benflojt: { var: 'sak', av: { ben: 1 }, min: 4, slag: 'liten', tek: 'benflojt', verktyg: { kniv: 'kniven', flinta: 'en flinta' } },
  lyra: { var: 'sak', av: { ved: 1, rep: 1 }, min: 5, slag: 'stor', tek: 'lyra', verktyg: { kniv: 'kniven', flinta: 'en flinta' }, bank: 'snickarbank', bara: true, kniv: true },
  skara: { var: 'sak', av: { flinta: 1, grenar: 1, rep: 1 }, min: 4, slag: 'liten', tek: 'kniv' }, // skäran till slåttern (steg 9.8.9)
  benspade: { var: 'sak', av: { ben: 3, rep: 1, grenar: 1 }, min: 5, slag: 'stor', tek: 'benspade' },
  grillfisk: { var: 'sak', av: { fisk: 1 }, min: 4, slag: 'liten', tek: 'grill' },
  grillkott: { var: 'sak', av: { kott: 1 }, min: 4, slag: 'liten', tek: 'grill' },
  torrkott: { var: 'sak', av: { kott: 1 }, min: 4, slag: 'liten', tek: 'tork' },
  torrfisk: { var: 'sak', av: { fisk: 1 }, min: 4, slag: 'liten', tek: 'tork' },
  grillgadda: { var: 'sak', av: { gaddkott: 1 }, min: 4, slag: 'liten', tek: 'grill' }, grillmort: { var: 'sak', av: { mortkott: 1 }, min: 4, slag: 'liten', tek: 'grill' },
  torrgadda: { var: 'sak', av: { gaddkott: 1 }, min: 4, slag: 'liten', tek: 'tork' }, torrmort: { var: 'sak', av: { mortkott: 1 }, min: 4, slag: 'liten', tek: 'tork' },
  talgljus: { var: 'sak', av: { talg: 2, torrgras: 1 }, min: 3, slag: 'liten', tek: 'fackla' },
  vaxljus: { var: 'sak', av: { bivax: 1, torrgras: 1 }, min: 3, slag: 'liten', tek: 'fackla' }, // steg 10.10.24: ett ljus av bivax som brinner dubbelt så länge
  slanda: { var: 'sak', av: { grenar: 1, sten: 1 }, min: 3, slag: 'liten', tek: 'slanda', bank: 'snickarbank' }, // steg 7.7.8: en pinne med en tyngd av sten
  fackla: { var: 'sak', av: { grenar: 1, torrgras: 1, talg: 1 }, min: 3, slag: 'liten', tek: 'fackla' },
  vattensack: { var: 'sak', av: { skinn: 2, rep: 1 }, min: 5, slag: 'stor', tek: 'vattensack' },
  naver: { var: 'sak', av: { ved: 1 }, ger: 4, min: 2, slag: 'liten', verktyg: { kniv: 'kniven', yxa: 'yxan' } },
  // stationerna och möblerna (stationer.ts)
  slaktbank: { var: 'station', av: { virke: RT.slaktbankVirke }, min: RT.slaktbankMin },
  flatarbank: { var: 'station', av: { virke: RT.flatarbankVirke, grenar: RT.flatarbankGrenar }, min: RT.flatarbankMin },
  halmbadd: { var: 'station', av: { torrgras: RT.halmbaddHo, grenar: RT.halmbaddGrenar }, min: RT.halmbaddMin },
  bord: { var: 'station', av: { virke: RT.bordVirke, plankor: bordSkiva(2, 1) }, min: RT.bordMin },
  bord2: { var: 'station', av: { virke: RT.bordVirke, plankor: bordSkiva(2, 2) }, min: RT.bord2Min },
  bord3: { var: 'station', av: { virke: RT.bordVirke, plankor: bordSkiva(3, 2) }, min: RT.bord3Min },
  hylla: { var: 'station', av: { plankor: RT.hyllaVirke, rep: RT.hyllaRep }, min: RT.hyllaMin },
  kista: { var: 'station', av: { plankor: RT.kistaVirke }, min: RT.kistaMin },
  stall: { var: 'station', av: { plankor: RT.stallVirke, rep: RT.stallRep }, min: RT.stallMin },
  bokhylla: { var: 'station', av: { plankor: 3 }, min: 15 }, // steg 10.6.16: där blad och böcker står
  latrin: { var: 'station', av: {}, min: RT.latrinMin },
  kolmila: { var: 'station', av: {}, min: 10 }, // grävs med spaden (steg 12.2.1)
  blasterugn: { var: 'station', av: { lera: 6, sten: 4, skinn: 2, virke: 1 }, min: 20 }, // skinnen och virket är bälgen (steg 12.2.3)
  smedja: { var: 'station', av: { huggen_sten: 6, lera: 2, skinn: 2, virke: 1, jarn: 1 }, min: 20 }, // järnet är hammaren och tången (steg 12.2.4)
  drejskiva: { var: 'station', av: { virke: 2, huggen_sten: 1 }, min: 15, slag: 'stor', tek: 'drejskiva' }, // drejskivan (steg 12.4.1): en skiva av trä på en axel, med en sten som svänghjul
  sang: { var: 'station', av: { plankor: 3, ull: 2 }, min: 18 }, // sängen (steg 12.4.3): en ram av plankor med ett bolster av ull
  pall: { var: 'sak', av: { plankor: 1 }, min: 5, slag: 'stor', tek: 'snickarbank', bank: 'snickarbank', bara: true }, // pallen (steg 12.4.4): en sittplats vid bordet, bättre än stubben
  stol: { var: 'sak', av: { plankor: 2, skinn: 1, ull: 1 }, min: 12, slag: 'station', tek: 'stol', bank: 'snickarbank', bara: true }, // stolen: en pall med ryggstöd och dyna av skinn och ull
  vagga: { var: 'station', av: { plankor: 2, ull: 1 }, min: 10 }, // vaggan (steg 12.4.5): en låg låda av plankor på medar, med en bädd av ull
  tunna: { var: 'sak', av: { plankor: 3, rep: 1 }, min: 5, slag: 'stor', tek: 'laggkar', bank: 'snickarbank', bara: true }, // tunnan (steg 12.4.6, tunna.ts): laggad av plankor och bunden med rep
  ost: { var: 'sak', min: 4, slag: 'liten', tek: 'ost' }, // osten (steg 12.4.7): 4 mjölk i en mellanstor lerkruka vid elden (TILLVERKA.ysta), materialet är mjölken
  brunn: { var: 'station', av: { huggen_sten: 6, virke: 1, rep: 1 }, min: 20, verktyg: { benspade: 'benspaden' } }, // brunnen (steg 12.4.8, torst.ts): grävs med spaden och sätts med huggen sten, med ett vindspel av virke och rep
  utedass: { var: 'station', av: { plankor: 4 }, min: 15, verktyg: { benspade: 'benspaden' } }, // utedasset (steg 12.4.9): en grop med väggar och tak av plankor
  fyrfat: { var: 'station', av: { lera: 3 }, min: 10 }, // fyrfatet (steg 12.4.11): ett fat av lera med glödande kol
  penna: { var: 'sak', av: { fjadrar: 1 }, min: 2, slag: 'liten', tek: 'pergament', verktyg: { kniv: 'kniven' } }, // fjäderpennan (steg 12.4.14): skärs av en fjäder med kniven, för hand
  oljelampa: { var: 'sak', av: { lera: 1 }, min: 3, slag: 'liten', tek: 'oljelampa', bank: 'drejskiva' }, // oljelampan (steg 12.4.2): formas av lera som krukan, torkar och bränns
  // järnredskapen (steg 12.2.6): smids i smedjan och bara där (handlingen smida, jarnsaker.ts)
  jarnyxa: { var: 'sak', av: { jarn: 2, grenar: 1 }, min: 5, slag: 'stor', tek: 'smedja' },
  jarnkniv: { var: 'sak', av: { jarn: 1, grenar: 1 }, min: 4, slag: 'liten', tek: 'smedja' },
  lie: { var: 'sak', av: { jarn: 2, grenar: 1 }, min: 5, slag: 'stor', tek: 'smedja' },
  jarnhjalm: { var: 'plagg', mangd: 2, av: { lader: 1 }, min: 5 }, ringbrynja: { var: 'plagg', mangd: 8, av: { lader: 1 }, min: 5 }, // smids i smedjan (steg 12.2.9)
  spanne: { var: 'plagg', mangd: 1, min: 3 }, // ett spänne av järn, pynt (steg 12.2.10)
  isborr: { var: 'sak', av: { jarn: 1, grenar: 1 }, min: 4, slag: 'liten', tek: 'smedja' }, // steg 12.2.11
  eldstal: { var: 'sak', av: { jarn: 1 }, min: 3, slag: 'liten', tek: 'smedja' }, // steg 12.2.12
  ullsax: { var: 'sak', av: { jarn: 1 }, min: 3, slag: 'liten', tek: 'smedja' }, // steg 12.5.2
  jarnnal: { var: 'sak', av: { jarn: 1 }, ger: 2, min: 3, slag: 'liten', tek: 'smedja' }, // 1 järn ger 2 nålar (steg 12.5.3)
  jarnhacka: { var: 'sak', av: { jarn: 2, grenar: 1 }, min: 5, slag: 'stor', tek: 'smedja' }, // steg 12.5.4
  jarngryta: { var: 'sak', av: { jarn: 3 }, min: 5, slag: 'stor', tek: 'smedja' }, // steg 12.5.5
  las: { var: 'sak', av: { jarn: 1 }, min: 4, slag: 'liten', tek: 'smedja' }, // låset till den låsta dörren (steg 12.5.6)
  sag: { var: 'sak', av: { jarn: 1, grenar: 1 }, min: 4, slag: 'liten', tek: 'smedja' }, // handsågen (steg 12.5.1): ligger vid klyvplatsen
  svard: { var: 'sak', av: { jarn: 3, lader: 1 }, min: 5, slag: 'stor', tek: 'vapensmide' }, // byns första rena vapen (steg 12.2.9)
  jarnspjut: { var: 'sak', av: { jarn: 1, grenar: 1, rep: 1 }, min: 4, slag: 'liten', tek: 'smedja' }, // smids (steg 12.2.8)
  jarnskold: { var: 'sak', av: { ved: 3, lader: 1, jarn: 1 }, min: 4, slag: 'liten', tek: 'skold', bank: 'snickarbank', bara: true }, // mest trä: vid snickarbänken, med järnet bland materialen (steg 12.2.8)
  bikupa: { var: 'station', av: { torrgras: 4, grenar: 2 }, min: 10, tek: 'bikupa' }, // bikupan (steg 10.10.16): en halmkupa flätad av hö på grenar
  kompost: { var: 'station', av: { virke: 1 }, min: 10, tek: 'kompost' }, // komposten (steg 9.7.6): en enkel inhägnad av lite trä
  grill: { var: 'station', av: { grenar: RT.grillGrenar, rep: RT.grillRep }, min: RT.grillMin },
  tork: { var: 'station', av: { grenar: RT.torkGrenar, rep: RT.torkRep }, min: RT.torkMin },
  bakugn: { var: 'station', av: { huggen_sten: 4, lera: 4 }, min: 20, tek: 'bakugn' }, // bakugnen (steg 9.6.23): ett valv av huggen sten tätat med lera (steg 10.2.66)
  kvarnsten: { var: 'station', av: { huggen_sten: 2 }, min: 20, tek: 'kvarnsten' }, // kvarnstenen (steg 9.6.22): två huggna stenar som kornet mals mellan
  kokgrop: { var: 'station', av: { sten: 8 }, min: 10, tek: 'kokgrop' }, // kokgropen (steg 10.7.28)
  bryggkar: { var: 'station', av: { virke: 1 }, min: 15, tek: 'bryggkar', verktyg: { yxa: 'yxan' } }, // bryggkaret (steg 9.6.12)
  vattenho: { var: 'station', av: { virke: 1 }, min: 10, tek: 'staket', verktyg: { yxa: 'yxan' } }, // vattenhon i hagen (steg 10.10.30)
  rokeri: { var: 'station', av: { huggen_sten: 3, grenar: 4, lera: 2 }, min: 20, tek: 'rokeri' }, // rökeriet (steg 9.6.8): en låg ugn av huggen sten med ett tak av grenar och lera (steg 10.2.66)
  brasa: { var: 'station', av: { sten: RT.brasaSten }, min: RT.brasaMin },
  scen: { var: 'station', av: { plankor: RT.scenVirke }, min: RT.scenMin },
  // proteserna (steg 9.5.11, protes.ts): kryckan och träbenet täljs och kroken görs av virke bara vid snickarbänken, ögonlappen av skinn för hand
  krycka: { var: 'sak', av: { virke: 1 }, min: 4, slag: 'liten', tek: 'protes', bank: 'snickarbank', bara: true, kniv: true }, traben: { var: 'sak', av: { virke: 1, rep: 1 }, min: 4, slag: 'liten', tek: 'protes', bank: 'snickarbank', bara: true, kniv: true },
  kalke: { var: 'sak', av: { virke: 2, rep: 2 }, min: 5, slag: 'stor', tek: 'slade', bank: 'snickarbank', bara: true }, // steg 10.10.2: två medar och ett flak
  slade: { var: 'sak', av: { virke: 4, rep: 4 }, min: 5, slag: 'stor', tek: 'slade', bank: 'snickarbank', bara: true }, // steg 10.10.3: större, med skaklar för ett dragdjur
  vagn: { var: 'sak', av: { virke: 6, rep: 4 }, min: 5, slag: 'stor', tek: 'vagn', bank: 'snickarbank', bara: true }, // steg 11.11.2: ett flak på två hjul, med skaklar
  bagborr: { var: 'sak', av: { ved: 1, grenar: 2, rep: 1 }, min: 3, slag: 'liten', tek: 'bagborr', bank: 'snickarbank', bara: true }, // steg 10.6.13: en båge av gren och rep, en pinne och en skiva
  krok: { var: 'sak', av: { virke: 1 }, min: 3, slag: 'liten', tek: 'protes', bank: 'snickarbank', bara: true }, ogonlapp: { var: 'sak', av: { skinn: 1 }, min: 3, slag: 'liten' },
  // förbanden (steg 9.5.15): remsor av skinn eller lin (två av varje), och nålen av ben som såret sys med
  remsa: { var: 'sak', av: { skinn: 1 }, ger: 2, min: 2, slag: 'liten', tek: 'kniv' }, remsa_lin: { var: 'sak', av: { lintyg: 1 }, ger: 2, min: 2, slag: 'liten', tek: 'kniv' },
  nal: { var: 'sak', av: { ben: 1 }, min: 3, slag: 'liten', tek: 'bensyl', verktyg: { sten: 'en sten', flinta: 'en flinta' } },
  naverask: { var: 'sak', av: { naver: 1, rep: 1 }, min: 3, slag: 'liten', tek: 'naverask' }, // näveraskan (steg 9.4.13): viks av näver och sys ihop med rep, för hand eller fortare vid slöjdbänken
  lerkruka_liten: { var: 'sak', av: { lera: 1 }, min: 3, slag: 'liten', tek: 'kruka', bank: 'drejskiva' }, lerkruka_mellan: { var: 'sak', av: { lera: 2 }, min: 4, slag: 'liten', tek: 'kruka', bank: 'drejskiva' }, lerkruka_stor: { var: 'sak', av: { lera: 4 }, min: 4, slag: 'liten', tek: 'kruka', bank: 'drejskiva' }, // lerkrukan i tre storlekar (steg 9.4.11, KRUKOR i kruka.ts): byggs upp för hand av lera med sand i
  hogsate: { var: 'station', av: { virke: RT.hogsateVirke }, min: RT.hogsateMin }, // långhusets högsäte och bänkar (steg 10.2.68)
  bank: { var: 'station', av: { virke: RT.bankVirke }, min: RT.bankMin },
  krubba: { var: 'station', av: { virke: RT.krubbaVirke }, min: RT.krubbaMin }, // foderhäcken i fähuset (steg 10.2.88)
  // tillbehören (stationer.ts) och dörrarna (byggnad.ts)
  brannpanna: { var: 'tillbehor', av: { sten: 4, lera: 2 }, min: 15, tek: 'sprit' }, // brännpannan (steg 10.7.26): härden och röret; den stora lerkrukan tas också (TILLBEHOR.brannpanna.kar)
  stekhall: { var: 'tillbehor', av: { huggen_sten: 1 }, min: 10, tek: 'stekhall' }, // stekhällen (steg 9.6.21): en flat huggen sten över elden vid grillen (steg 10.2.66)
  skinnfall: { var: 'tillbehor', av: { skinn: RT.fallSkinn }, min: RT.fallMin },
  ylletacke: { var: 'tillbehor', av: { ylle: 2 }, min: 15, tek: 'vavstol' }, // ylletäcket och fjäderkudden (steg 13.3.1): görs av den som kan vävstolen
  kudde: { var: 'tillbehor', av: { fjadrar: 2, lintyg: 1 }, min: 10, tek: 'vavstol' },
  skinndorr: { var: 'dorr', av: { skinn: RT.skinndorrSkinn }, min: RT.skinndorrMin },
  tradorr: { var: 'dorr', av: { plankor: RT.tradorrVirke, rep: RT.tradorrRep }, min: RT.tradorrMin },
  lasdorr: { var: 'dorr', av: { plankor: 2, las: 1 }, min: 20 }, // en trädörr med ett lås av järn (steg 12.5.6)
  // plaggen (klader.ts): mangd bitar av materialet, och det i av
  rock: { var: 'plagg', mangd: 3, av: { rep: 1 }, min: 5 },
  skor: { var: 'plagg', mangd: 1, av: { rep: 1 }, min: 5 },
  stovlar: { var: 'plagg', mangd: 2, av: { rep: 1 }, min: 5 }, // stövlarna av läder (steg 13.2.2)
  balte: { var: 'plagg', mangd: 2, av: {}, min: 5 },
  axelrem: { var: 'plagg', mangd: 1, av: { rep: 1 }, min: 5 }, // steg 7.1.2
  barsele: { var: 'plagg', mangd: 1, av: { rep: 1 }, min: 5 }, // steg 13.2.3
  ryggsack: { var: 'plagg', mangd: 3, av: { rep: 1 }, min: 5 }, // steg 7.1.3: tre skinn och remmar av rep, lika länge som de andra plaggen
} satisfies Record<string, ReceptRad>;
export const RECEPT: { [K in keyof typeof DEF]: typeof DEF[K] & ReceptRad } = DEF;
export type ReceptId = keyof typeof DEF;
export const RECEPT_LIST = Object.keys(DEF) as ReceptId[];
