// Ordlagret (steg 6.7.1): orden för allt som simuleringen sätter in i en text, på ett ställe. Det simuleringen vet (ett tal,
// en sak, en lista med namn, en teknik, en skada) blir aldrig rådata i en mening: antal(n, sak) ger "en rot", "tre rötter"
// eller "många grenar", lista(namn) ger "A, B och fyra till", sin(sak) ger sin eller sitt, gora(teknik) ger "att odla" och
// skada(k, g) ger "ett lätt blåmärke". Registren: SAKORD (sakens artikel, ental och flertal när namnet i SAKER inte räcker)
// och GORA (vad den som kan en teknik gör). Kontrollerna i src/test/textkoll.ts (siffra före ord, och … och, hen, en före
// ett-ord, artikeln och ändelsen) larmar när en ny rad skriver rådata. Bara texten: inget här drar slump eller ändrar spelet.
import { SAKER } from './saker';

// ---------- lyssnaren på texterna ----------
// verktyget som samlar texterna (npm run texter) och testernas vakt får varje text som skrivs (steg 4.5.1.1). Mallarnas texter
// kommer från berattelser.ts; det som skrivs utanför mallarna (loggen, krönikan, notiserna, tankarna och resans dagbok) anmäls
// med horText (steg 12.1.118), med platsen -2 och inga fält. Bara i verktyget och vakten; spelet sätter den aldrig
export type TextLyssnare = (mall: string, i: number, text: string, f: Record<string, string | number | boolean | undefined>) => void;
export const TEXTLYSS: { f?: TextLyssnare } = {};
export const horText = (slag: string, text: string) => { if (TEXTLYSS.f) TEXTLYSS.f(slag, -2, text, {}); };

// ---------- talen ----------
const TAL = ['ingen', 'en', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio', 'elva', 'tolv'];
// ett tal som ord: 0–12 som ord, annars siffror (ålder, år och sådant där talet behövs). ett = ett-ord ("ett år")
export const talOrd = (n: number, ett = false) => n === 1 && ett ? 'ett' : TAL[n] ?? String(n);
// ett tal i ord också över tolv, upp till 99 (folket i en by: "sexton"), annars siffror (steg 12.1.122)
const TIOTAL = ['', '', 'tjugo', 'trettio', 'fyrtio', 'femtio', 'sextio', 'sjuttio', 'åttio', 'nittio'], TONAR = ['tretton', 'fjorton', 'femton', 'sexton', 'sjutton', 'arton', 'nitton'];
export const heltOrd = (n: number, ett = false) => { n = Math.max(0, Math.round(n)); return n <= 12 ? talOrd(n, ett) : n < 20 ? TONAR[n - 13] : n < 100 ? TIOTAL[Math.floor(n / 10)] + (n % 10 ? talOrd(n % 10, ett) : '') : String(n); };
// ett antal i löpande text: 0–12 som ord, fler än tolv "många", fler än 200 "otaliga" (ett = ett-ord vid 1)
export const tal = (n: number, ett = false) => n > 200 ? 'otaliga' : n > 12 ? 'många' : talOrd(Math.max(0, Math.round(n)), ett);
// "en gång", "tre gånger", "många gånger", "otaliga gånger"
export const ganger = (n: number) => n === 1 ? 'en gång' : `${tal(n)} gånger`;

// ---------- tiden (steg 12.1.120) ----------
// ett tidsspann i verkligheten som tid i spelet, i hela tal och med ord: ett dygn är ett år, en vecka en tidsålder, två timmar en
// månad, fyra minuter ungefär en dag och tio sekunder en timme. Allt som spelaren ser om hur länge något varar går genom den, i
// simuleringens texter och i gränssnittet ("två månader", "ett år", "några timmar"); aldrig verkliga minuter eller decimaler
const T_AR = 24 * 3600 * 1000, T_DAG = T_AR / 365, T_TIM = T_DAG / 24;
const st_ = (x: number, en: string, fler: string, ett = false) => { const m = Math.max(1, Math.round(x)); return m === 1 ? `${ett ? 'ett' : 'en'} ${en}` : `${tal(m)} ${fler}`; };
export function spelTid(ms: number) {
  if (ms >= 6.5 * T_AR) return st_(ms / (7 * T_AR), 'tidsålder', 'tidsåldrar');
  if (ms >= 0.95 * T_AR) return st_(ms / T_AR, 'år', 'år', true);
  if (ms >= 27 * T_DAG) return st_(Math.min(11, ms / (T_AR / 12)), 'månad', 'månader');
  if (ms >= 6.5 * T_DAG) return st_(ms / (7 * T_DAG), 'vecka', 'veckor');
  if (ms >= 0.9 * T_DAG) return st_(ms / T_DAG, 'dag', 'dagar');
  if (ms >= 0.9 * T_TIM) return Math.round(ms / T_TIM) > 12 ? 'nästan en dag' : st_(ms / T_TIM, 'timme', 'timmar');
  return 'en stund';
}

// ---------- listor ----------
// namnen med kommatecken och "och" sist (det som redan har ett "och" i sig först, så att leden inte blandas ihop)
export const och = (l: string[]) => { l = [...l.filter(x => x.includes(' och ')), ...l.filter(x => !x.includes(' och '))]; return l.length > 1 ? `${l.slice(0, -1).join(', ')} och ${l[l.length - 1]}` : l[0] ?? ''; };
// en lista med namn: högst max namn, annars de två första och resten som tal ("Frörhild, Igik och fyra till")
export const lista = (l: string[], max = 4) => l.length <= max ? och(l) : `${l[0]}, ${l[1]} och ${tal(l.length - 2)} till`;

// ---------- sakerna ----------
// [artikel, ental, flertal] med gemen: där namnet i SAKER inte går att räkna (harkött, hö) står ett mått framför
type Ord = readonly [art: 'en' | 'ett', ental: string, flertal: string];
const SAKORD: Record<string, Ord> = {
  bikupa: ['en', 'bikupa', 'bikupor'], // byns ägda stationer som ärvs och räknas ihop (arv.ts, steg 12.1.199)
  bar: ['ett', 'bär', 'bär'], rotter: ['en', 'rot', 'rötter'], kott: ['en', 'bit harkött', 'bitar harkött'], fisk: ['en', 'bit fiskkött', 'bitar fiskkött'],
  svamp: ['en', 'svamp', 'svampar'], ved: ['ett', 'vedträ', 'vedträn'], grenar: ['en', 'gren', 'grenar'], torrgras: ['en', 'famn hö', 'famnar hö'],
  kol: ['en', 'bit kol', 'bitar kol'], flinta: ['en', 'flinta', 'flintor'], yxa: ['en', 'flintyxa', 'flintyxor'], fiskespjut: ['ett', 'träspjut', 'träspjut'],
  ratlin: ['ett', 'knippe rått lin', 'knippen rått lin'], huggen_sten: ['en', 'huggen sten', 'huggna stenar'], plankor: ['en', 'planka', 'plankor'], rolleka: ['en', 'rölleka', 'röllekor'], blomma: ['en', 'blomma', 'blommor'], honung: ['en', 'honungskaka', 'honungskakor'], salva: ['en', 'salva', 'salvor'], tjara: ['en', 'tjärklump', 'tjärklumpar'], benlim: ['en', 'limklump', 'limklumpar'], tval: ['en', 'tvålbit', 'tvålbitar'], lader: ['en', 'läderbit', 'läderbitar'], lin: ['ett', 'knippe lin', 'knippen lin'], linfron: ['ett', 'linfrö', 'linfrön'], trad: ['en', 'lintråd', 'lintrådar'], ulltrad: ['en', 'ulltråd', 'ulltrådar'], ylle: ['ett', 'stycke ylletyg', 'stycken ylletyg'], lintyg: ['ett', 'stycke lintyg', 'stycken lintyg'], vargtand: ['en', 'vargtand', 'vargtänder'], leksak: ['en', 'leksak', 'leksaker'], snara: ['en', 'snara', 'snaror'], grop: ['en', 'fångstgrop', 'fångstgropar'],
  gadda: ['en', 'gädda', 'gäddor'], mort: ['en', 'mört', 'mörtar'], gaddkott: ['en', 'köttbit av gädda', 'köttbitar av gädda'], mortkott: ['en', 'köttbit av mört', 'köttbitar av mört'], grillgadda: ['en', 'grillad gädda', 'grillade gäddor'], grillmort: ['en', 'grillad mört', 'grillade mörtar'], torrgadda: ['en', 'torkad gädda', 'torkade gäddor'], torrmort: ['en', 'torkad mört', 'torkade mörtar'], mjarde: ['en', 'mjärde', 'mjärdar'],
  korg: ['en', 'korg', 'korgar'], giftsvamp: ['en', 'giftig svamp', 'giftiga svampar'], sten: ['en', 'sten', 'stenar'], lera: ['en', 'klump lera', 'klumpar lera'], byggsten: ['en', 'byggsten', 'byggstenar'], rep: ['ett', 'rep', 'rep'],
  talg: ['en', 'klump talg', 'klumpar talg'], ull: ['en', 'tuss ull', 'tussar ull'], levfar: ['ett', 'får', 'får'], levget: ['en', 'get', 'getter'], levko: ['en', 'ko', 'kor'], slaktko: ['en', 'slaktad ko', 'slaktade kor'], kokott: ['en', 'bit nötkött', 'bitar nötkött'], kohud: ['en', 'kohud', 'kohudar'], levhons: ['en', 'höna', 'hönor'], ben: ['ett', 'ben', 'ben'], flintspjut: ['ett', 'flintspjut', 'flintspjut'], metspo: ['ett', 'metspö', 'metspön'],
  vilt: ['ett', 'fällt djur', 'fällda djur'], kniv: ['en', 'flintkniv', 'flintknivar'], skinn: ['ett', 'harskinn', 'harskinn'], varg: ['en', 'fälld varg', 'fällda vargar'],
  vargkott: ['en', 'bit vargkött', 'bitar vargkött'], radjurkott: ['en', 'bit rådjurskött', 'bitar rådjurskött'], farkott: ['en', 'bit fårkött', 'bitar fårkött'], getkott: ['en', 'bit getkött', 'bitar getkött'],
  fagelkott: ['en', 'bit fågelkött', 'bitar fågelkött'], bjornkott: ['en', 'bit björnkött', 'bitar björnkött'], farskinn: ['ett', 'fårskinn', 'fårskinn'], getskinn: ['ett', 'getskinn', 'getskinn'], vitskinn: ['ett', 'vitt harskinn', 'vita harskinn'], vargskinn: ['ett', 'vargskinn', 'vargskinn'], radjur: ['ett', 'fällt rådjur', 'fällda rådjur'],
  fagel: ['en', 'fälld fågel', 'fällda fåglar'], fjadrar: ['en', 'fjäder', 'fjädrar'], agg: ['ett', 'ägg', 'ägg'], radjursskinn: ['ett', 'rådjursskinn', 'rådjursskinn'],
  bjorn: ['en', 'fälld björn', 'fällda björnar'], bjornskinn: ['ett', 'björnskinn', 'björnskinn'], abborre: ['en', 'abborre', 'abborrar'],
  paborjat: ['ett', 'påbörjat arbete', 'påbörjade arbeten'], bensyl: ['en', 'bensyl', 'bensylar'],
  rock_kaninskinn: ['en', 'rock av harskinn', 'rockar av harskinn'], rock_vargskinn: ['en', 'rock av vargskinn', 'rockar av vargskinn'], rock_bjornskinn: ['en', 'rock av björnskinn', 'rockar av björnskinn'],
  skor_kaninskinn: ['ett', 'par skor av harskinn', 'par skor av harskinn'], skor_vargskinn: ['ett', 'par skor av vargskinn', 'par skor av vargskinn'], skor_bjornskinn: ['ett', 'par skor av björnskinn', 'par skor av björnskinn'],
  balte_rep: ['ett', 'bälte av rep', 'bälten av rep'], axelrem_kaninskinn: ['en', 'axelrem av harskinn', 'axelremmar av harskinn'], axelrem_vargskinn: ['en', 'axelrem av vargskinn', 'axelremmar av vargskinn'], axelrem_bjornskinn: ['en', 'axelrem av björnskinn', 'axelremmar av björnskinn'], ryggsack_kaninskinn: ['en', 'ryggsäck av harskinn', 'ryggsäckar av harskinn'], ryggsack_vargskinn: ['en', 'ryggsäck av vargskinn', 'ryggsäckar av vargskinn'], ryggsack_bjornskinn: ['en', 'ryggsäck av björnskinn', 'ryggsäckar av björnskinn'], mossa: ['en', 'tuva mossa', 'tuvor mossa'], boll: ['en', 'boll', 'bollar'], slagtra: ['ett', 'slagträ', 'slagträn'],
  mal: ['ett', 'mål', 'mål'], trumma: ['en', 'trumma', 'trummor'], benflojt: ['en', 'benflöjt', 'benflöjter'], lyra: ['en', 'lyra', 'lyror'], benspade: ['en', 'benspade', 'benspadar'],
  grillfisk: ['en', 'grillad fisk', 'grillade fiskar'], grillkott: ['en', 'bit grillat kött', 'bitar grillat kött'], torrkott: ['en', 'bit torkat kött', 'bitar torkat kött'],
  torrfisk: ['en', 'torkad fisk', 'torkade fiskar'], talgljus: ['ett', 'talgljus', 'talgljus'], talt: ['ett', 'tält', 'tält'], packsadel: ['en', 'packsadel', 'packsadlar'], ridsadel: ['en', 'ridsadel', 'ridsadlar'], vagn: ['en', 'vagn', 'vagnar'], vaxljus: ['ett', 'vaxljus', 'vaxljus'], fackla: ['en', 'fackla', 'facklor'], slanda: ['en', 'slända', 'sländor'], kalke: ['en', 'kälke', 'kälkar'], slade: ['en', 'släde', 'slädar'], levoxe: ['en', 'oxe', 'oxar'], levhast: ['en', 'häst', 'hästar'], kulting: ['en', 'kulting', 'kultingar'], slaktgris: ['en', 'slaktad gris', 'slaktade grisar'], bur: ['en', 'bur', 'burar'], bagborr: ['en', 'bågborr', 'bågborrar'], hus: ['ett', 'hus', 'hus'], vattensack: ['en', 'vattensäck', 'vattensäckar'],
  rovfron: ['ett', 'rovfrö', 'rovfrön'], rovor: ['en', 'rova', 'rovor'], arter: ['en', 'ärta', 'ärter'], artfron: ['ett', 'ärtfrö', 'ärtfrön'],
  rokelse: ['en', 'bit rökelse', 'bitar rökelse'], // steg 12.1.48
  silver: ['en', 'bit silver', 'bitar silver'], salt: ['en', 'näve salt', 'nävar salt'], virke: ['ett', 'stycke virke', 'stycken virke'], naver: ['en', 'bit näver', 'bitar näver'],
  vargdel: ['ett', 'vargstycke', 'vargstycken'], radjurdel: ['ett', 'rådjursstycke', 'rådjursstycken'], vildsvindel: ['ett', 'vildsvinsstycke', 'vildsvinsstycken'], vildsvin: ['ett', 'fällt vildsvin', 'fällda vildsvin'], svinkott: ['en', 'bit fläsk', 'bitar fläsk'], svinskinn: ['ett', 'svinskinn', 'svinskinn'], bjorndel: ['ett', 'björnstycke', 'björnstycken'],
  appel: ['ett', 'äpple', 'äpplen'], pilar: ['en', 'pil', 'pilar'], vaxtrest: ['en', 'växtrest', 'växtrester'], bonor: ['en', 'böna', 'bönor'], kalfron: ['ett', 'kålfrö', 'kålfrön'], jordgubbar: ['en', 'jordgubbe', 'jordgubbar'], notter: ['en', 'hasselnöt', 'hasselnötter'], lok: ['en', 'lök', 'lökar'], kal: ['ett', 'kålhuvud', 'kålhuvuden'], // steg 12.1.118: namnen i SAKER som står i plural eller inte går att räkna
  braxen: ['en', 'braxen', 'braxnar'], sik: ['en', 'sik', 'sikar'], korn: ['en', 'näve korn', 'nävar korn'], mjol: ['en', 'näve mjöl', 'nävar mjöl'], malt: ['en', 'näve malt', 'nävar malt'], torv: ['en', 'torva', 'torvor'], malm: ['en', 'klump malm', 'klumpar malm'], jarn: ['en', 'bit järn', 'bitar järn'],
  krok: ['en', 'krok', 'krokar'], krycka: ['en', 'krycka', 'kryckor'], remsa: ['en', 'remsa', 'remsor'], nal: ['en', 'bennål', 'bennålar'], naverask: ['en', 'näverask', 'näveraskar'], lerkruka_liten: ['en', 'liten lerkruka', 'små lerkrukor'], lerkruka_mellan: ['en', 'mellanstor lerkruka', 'mellanstora lerkrukor'], lerkruka_stor: ['en', 'stor lerkruka', 'stora lerkrukor'],
  skara: ['en', 'skära', 'skäror'], slunga: ['en', 'slunga', 'slungor'], bage: ['en', 'pilbåge', 'pilbågar'], skold: ['en', 'sköld', 'sköldar'], isborr: ['en', 'isborr', 'isborrar'], lie: ['en', 'lie', 'liar'], jarnyxa: ['en', 'järnyxa', 'järnyxor'], jarnkniv: ['en', 'järnkniv', 'järnknivar'], bok: ['en', 'bok', 'böcker'],
};
const RATT_ADJ: Record<string, string> = { Rått: 'rå', Enkel: 'enkel', Lagad: 'lagad', Fin: 'fin', Fest: 'festlig' }; // måltidens nivå (MALTIDSNIVA i ratter.ts) som ett ord
// orden för en sak: ur SAKORD, annars sakens namn i SAKER (samma i ental och flertal)
export function sakOrd(k: string): Ord {
  const o = SAKORD[k];
  if (o) return o;
  const d = SAKER[k], [namn, niva] = (d?.namn ?? k).split(' · '), n = namn.toLowerCase();
  // rätterna (steg 12.1.48): "Rotgröt · Fin" blir "en portion fin rotgröt" och "sju portioner fin rotgröt", med måltidens nivå som ett ord
  if (niva) { const r = `${RATT_ADJ[niva] ?? niva.toLowerCase()} ${n}`; return ['en', `portion ${r}`, `portioner ${r}`]; }
  if (d?.par) return ['ett', `par ${n}`, `par ${n}`]; // plaggen som är ett par (steg 13.2.2)
  return [d?.ett ? 'ett' : 'en', n, n];
}
// en eller ett framför saken
export const enEtt = (k: string) => sakOrd(k)[0];
// "en rot", "tre rötter", "många grenar", "lite rötter"
export function antal(n: number, k: string) {
  const [art, en, fler] = sakOrd(k);
  if (n < 0.5) return `lite ${fler}`;
  const m = Math.round(n);
  return m === 1 ? `${art} ${en}` : `${tal(m)} ${fler}`;
}
// ett antal med siffror i gränssnittet, med sakens ental eller flertal: "1 äpple", "5 abborrar" (siffra = hur talet skrivs)
export function styck(n: number, k: string, siffra: (n: number) => string = String) { const [, en, fler] = sakOrd(k); return `${siffra(n)} ${Math.abs(n - 1) < 1e-9 ? en : fler}`; }
// ett ord med siffror och rätt form: "1 sovplats", "3 sovplatser"
export const stOrd = (n: number, en: string, fler: string, siffra: (n: number) => string = String) => `${siffra(n)} ${Math.abs(n - 1) < 1e-9 ? en : fler}`;
// sin eller sitt framför saken (sina för flera)
export const sin = (k: string, n = 1) => n !== 1 ? 'sina' : enEtt(k) === 'ett' ? 'sitt' : 'sin';
// sin eller sitt efter en sak eller station med fältet ett (en lerkruka, ett bord)
export const sinOrd = (d: { ett?: boolean }) => d.ett ? 'sitt' : 'sin';
export const enOrd = (d: { ett?: boolean }) => d.ett ? 'ett' : 'en';

// ---------- bestämd form ----------
const NEUTRUM = ['spjut', 'spö', 'bord', 'ställ', 'bälte', 'altare', 'trä', 'kar', 'nät', 'horn', 'tält', 'hus', 'skjul', 'läger'];
// sakernas namn med gemen som är ett-ord (SAKER), för den bestämda formen
let ettNamn: Set<string> | undefined;
const arEtt = (n: string) => (ettNamn ??= new Set(Object.values(SAKER).filter(d => d?.ett).map(d => d!.namn.toLowerCase()))).has(n) || NEUTRUM.some(e => n.endsWith(e));
// substantivets bestämda form: "lerkrukan", "spöet", "bältet", "kitteln"
const bestOrd = (n: string, ett: boolean) => ett ? n + (/e$/.test(n) ? 't' : 'et') : n + (/[aeiouyåäö]$|el$/.test(n) ? 'n' : 'en');
// adjektivets svaga form framför ett substantiv i bestämd form: "den mellanstora", "det lilla", "den grillade"
const svag = (a: string) => /^lit(en|et)$/.test(a) ? 'lilla' : /ad$/.test(a) ? a + 'e' : /[aeo]$/.test(a) ? a : a.replace(/tt$/, 't') + 'a';
// ett namn med ett nummer mitt i en mening (inga siffror i texten, steg 6.7.4): "Hydda 3" blir "den tredje hyddan", "Lagerplats 2"
// "den andra lagerplatsen", och efter det tolfte "ännu en hydda"; andra namn står som de är (steg 12.1.118)
const NUMMER = ['', 'första', 'andra', 'tredje', 'fjärde', 'femte', 'sjätte', 'sjunde', 'åttonde', 'nionde', 'tionde', 'elfte', 'tolfte'];
export function iMening(namn: string) {
  const m = namn.match(/^(\S+) (\d+)$/);
  if (!m) return namn;
  const [best, den] = bestamd(m[1]), n = +m[2];
  return n < NUMMER.length ? `${den} ${NUMMER[n]} ${best}` : `ännu ${den === 'det' ? 'ett' : 'en'} ${m[1].toLowerCase()}`;
}
// ett hus namn mitt i en mening: "den andra hyddan", "långhuset", men "Stevids hus" som det står (ett namn)
export const husIMening = (namn: string) => /^\S+ \d+$/.test(namn) ? iMening(namn) : /^\S+s hus$/.test(namn) ? namn : liten(namn);
// en eller ett framför ett namn ur ett register ("en runsten", "ett rövarläger")
export const artikel = (namn: string) => arEtt(namn.toLowerCase()) ? 'ett' : 'en';
// sakens bestämda form och pronomen: "den mellanstora lerkrukan", "det" för slagträet (steg 12.1.118, fynd 14)
export function bestamd(namn: string, ett?: boolean): [string, string] {
  const av = namn.indexOf(' av ');
  if (av > 0) { const [b, h] = bestamd(namn.slice(0, av), ett); return [b + namn.slice(av).toLowerCase(), h]; }
  const n = namn.toLowerCase();
  if (/(skor|byxor|stövlar)$/.test(n)) return [n + 'na', 'de'];
  const o = n.split(' '), sub = o[o.length - 1], e = ett ?? arEtt(n);
  if (o.length > 1) return [`${e ? 'det' : 'den'} ${o.slice(0, -1).map(svag).join(' ')} ${bestOrd(sub, e)}`, e ? 'det' : 'den'];
  return [bestOrd(n, e), e ? 'det' : 'den'];
}

// ---------- teknikerna ----------
// vad den som kan tekniken gör: "har lärt sig att odla", "kom på hur man kan välja en ledare", "Med Gunve dog konsten att odla"
export const GORA: Record<string, string> = {
  rustning: 'sy läderrustningar', skold: 'göra sköldar', bagborr: 'göra bågborrar', slade: 'göra kälkar och slädar', vagn: 'göra vagnar', bage: 'göra pilbågar', slunga: 'göra slungor', horn: 'göra horn', lag: 'stifta lagar', lon: 'betala lön', stenhuggarplats: 'hugga sten', klyvplats: 'klyva plankor', harden: 'lägga härdar', ortkok: 'koka örter', snickarbank: 'snickra', pergament: 'göra pergament', bok: 'binda böcker', skrivpulpet: 'skriva vid en pulpet', naverask: 'vika näveraskar', protes: 'tälja proteser', orte: 'koka örtte', lakesalva: 'koka läkesalva', leksak: 'tälja leksaker', snara: 'sätta snaror', grop: 'gräva fångstgropar', garvning: 'garva skinn', lin: 'odla lin', slanda: 'spinna lin', vavstol: 'väva lintyg', fangstbank: 'göra fällor', mjarde: 'fläta mjärdar', stockvag: 'lägga stockvägar', byggsten: 'bryta byggsten', brygga: 'bygga bryggor',
  sprit: 'bränna sprit', mjod: 'brygga mjöd', kokgrop: 'baka i kokgropar', // steg 10.7.25–10.7.28
  drejskiva: 'dreja krukor', oljelampa: 'forma oljelampor', sang: 'snickra sängar', stol: 'snickra stolar', laggkar: 'laga tunnor och kar', ost: 'ysta ost', brunn: 'gräva brunnar', utedass: 'bygga utedass', sjukstuga: 'inreda sjukstugor', fyrfat: 'göra fyrfat', // steg 12.1.192
  fagelskramma: 'sätta upp fågelskrämmor', staket: 'sätta staket', kompost: 'gödsla fälten', bakugn: 'baka bröd', kvarnsten: 'mala mjöl', stekhall: 'steka på stekhällen', bryggkar: 'göra vin', ol: 'brygga öl', sadesodling: 'så korn', nat: 'knyta nät', rokeri: 'röka kött och fisk', // steg 9.6.8–9.6.16
  korg: 'fläta korgar', yxa: 'göra flintyxor', fiskespjut: 'tälja träspjut', rep: 'tvinna rep', flintspjut: 'göra flintspjut', metspo: 'göra metspön',
  kniv: 'slå flintknivar', timmervagg: 'bygga timmerhus', slaktbank: 'bygga en slaktbänk', flatarbank: 'bygga en slöjdbänk', halmbadd: 'göra halmbäddar',
  bord: 'bygga bord', hylla: 'göra hyllor och kistor', skinnfall: 'sy skinnfällar', skinndorr: 'hänga dörrar av skinn', tradorr: 'göra trädörrar',
  bensyl: 'slipa bensylar', skinnklader: 'sy kläder av skinn', barnklader: 'sy barnkläder', barsele: 'sy bärselar', vattensack: 'sy vattensäckar', balte: 'fläta bälten', axelrem: 'sy axelremmar', ryggsack: 'sy ryggsäckar', talt: 'sy tält', ridning: 'rida', mal: 'göra mål till bollspelen', boll: 'sy bollar',
  slagtra: 'tälja slagträn', scen: 'bygga en scen', trumma: 'göra trummor', benflojt: 'skära benflöjter', lyra: 'göra lyror', kruka: 'bygga upp lerkrukor',
  matta: 'väva mattor', benspade: 'göra benspadar', latrin: 'gräva en latrin', grill: 'bygga en grillställning',
  tork: 'bygga en torkställning', bikupa: 'fläta bikupor', bur: 'bygga burar', odling: 'odla', ledarskap: 'leda byn', fackla: 'göra facklor', skogsvard: 'flytta plantor dit skogen behövs',
  kolmila: 'kola ved i en mila', blasterugn: 'blåsa järn ur malm', smedja: 'smida järn', vapensmide: 'smida svärd och brynjor', las: 'smida lås', // steg 12.2.1–12.2.9 och 12.5.6
};
// teknikens namn med gemen till dess id; teknik.ts fyller i det när TEKNIK läses (för det som bara sparat namnet, som p.fame)
export const TEKNAMN: Record<string, string> = {};
// "odla" (utan att); en teknik som saknas i GORA blir "göra" och namnet (scenariot ord larmar för den)
export const goraUtan = (t: { id: string; namn: string }) => GORA[t.id] ?? `göra ${t.namn.toLowerCase()}`;
export const gora = (t: { id: string; namn: string }) => `att ${goraUtan(t)}`;
// samma efter bara namnet ("Odling" ger "odla")
export const goraNamn = (namn: string) => { const id = TEKNAMN[namn.toLowerCase()]; return id ? goraUtan({ id, namn }) : `göra ${namn.toLowerCase()}`; };

// ---------- skadorna ----------
// graden före skadan, böjd efter genus: "ett lätt blåmärke", "en svår blödning", "ett mycket svårt skärsår", "lätta klösmärken"
export function skada(ett: string, g: number) {
  const grad = g >= 0.75 ? 'mycket svår' : g >= 0.45 ? 'svår' : g >= 0.2 ? 'måttlig' : 'lätt';
  const [art, ...rest] = ett.split(' ');
  if (art === 'ett') return `ett ${grad === 'lätt' ? 'lätt' : grad + 't'} ${rest.join(' ')}`;
  if (art === 'en') return `en ${grad} ${rest.join(' ')}`;
  return `${grad === 'lätt' ? 'lätta' : grad.replace(/svår$/, 'svåra').replace('måttlig', 'måttliga')} ${ett}`; // flertal (klösmärken)
}

// ---------- väderstrecken (kodgenomgången, fynd 230) ----------
// vinkeln (Math.atan2, x åt öster och y åt söder) i ord: öster, sydost … nordost
export const STRECK = ['öster', 'sydost', 'söder', 'sydväst', 'väster', 'nordväst', 'norr', 'nordost'];
export const streckAv = (vinkel: number) => STRECK[((Math.round(vinkel / (Math.PI / 4)) % 8) + 8) % 8]!;

// ---------- pronomenen ----------
// han eller hon, honom eller henne, hans eller hennes efter personens kön (aldrig hen om en viss person)
type Kon = { sex: 'm' | 'k' | string };
export const han = (p: Kon) => p.sex === 'k' ? 'hon' : 'han';
export const honom = (p: Kon) => p.sex === 'k' ? 'henne' : 'honom';
export const hans = (p: Kon) => p.sex === 'k' ? 'hennes' : 'hans';
export const stor = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
export const liten = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

// de svårt skadade efter en strid, utan att namnen upprepas (steg 12.1.121): "Hon skadades svårt.", "Alla tre skadades svårt."
export function svaraText(folk: (Kon & { name: string })[], svara: string[]) {
  if (!svara.length) return '';
  if (svara.length === folk.length) return folk.length === 1 ? ` ${stor(han(folk[0]))} skadades svårt.` : folk.length === 2 ? ' Båda skadades svårt.' : ` Alla ${tal(folk.length)} skadades svårt.`;
  return ` ${och(svara)} skadades svårt.`;
}

// ---------- marken ----------
// hur mycket mark (rutor) som brann eller översvämmades: "en liten bit mark", "ett stort stycke mark"
export const mark = (n: number) => n <= 3 ? 'en liten bit mark' : n <= 15 ? 'en bit mark' : n <= 60 ? 'ett stort stycke mark' : 'ett mycket stort stycke mark';

// ---------- släkten (steg 6.7.2) ----------
// genitiv av ett namn: "Ylvars", men "Ask" blir "Asks" och "Ines" "Ines"
export const gen = (namn: string) => /[sxz]$/i.test(namn) ? namn : `${namn}s`;
// bara ändelsen, för ett namn som står i en länk: "Ask" + "s", "Asdis" + ""
export const genS = (namn: string) => /[sxz]$/i.test(namn) ? '' : 's';
// vad q är för p: mor, far, son, dotter, bror eller syster (undefined om de inte är så nära släkt)
type Slakt = { id: number; sex: 'm' | 'k' | string; mother?: number; father?: number };
export function slaktOrd(p: Slakt, q: Slakt): string | undefined {
  if (p.mother === q.id || p.father === q.id) return q.sex === 'k' ? 'mor' : 'far';
  if (q.mother === p.id || q.father === p.id) return q.sex === 'k' ? 'dotter' : 'son';
  if ((p.mother !== undefined && p.mother === q.mother) || (p.father !== undefined && p.father === q.father)) return q.sex === 'k' ? 'syster' : 'bror';
  return undefined;
}
