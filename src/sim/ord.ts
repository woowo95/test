// Ordlagret (steg 6.7.1): orden för allt som simuleringen sätter in i en text, på ett ställe. Det simuleringen vet (ett tal,
// en sak, en lista med namn, en teknik, en skada) blir aldrig rådata i en mening: antal(n, sak) ger "en rot", "tre rötter"
// eller "många grenar", lista(namn) ger "A, B och fyra till", sin(sak) ger sin eller sitt, gora(teknik) ger "att odla" och
// skada(k, g) ger "ett lätt blåmärke". Registren: SAKORD (sakens artikel, ental och flertal när namnet i SAKER inte räcker)
// och GORA (vad den som kan en teknik gör). Kontrollerna i src/test/textkoll.ts (siffra före ord, och … och, hen, en före
// ett-ord, artikeln och ändelsen) larmar när en ny rad skriver rådata. Bara texten: inget här drar slump eller ändrar spelet.
import { SAKER } from './saker';

// ---------- talen ----------
const TAL = ['ingen', 'en', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio', 'elva', 'tolv'];
// ett tal som ord: 0–12 som ord, annars siffror (ålder, år och sådant där talet behövs). ett = ett-ord ("ett år")
export const talOrd = (n: number, ett = false) => n === 1 && ett ? 'ett' : TAL[n] ?? String(n);
// ett antal i löpande text: 0–12 som ord, fler än tolv "många", fler än 200 "otaliga" (ett = ett-ord vid 1)
export const tal = (n: number, ett = false) => n > 200 ? 'otaliga' : n > 12 ? 'många' : talOrd(Math.max(0, Math.round(n)), ett);
// "en gång", "tre gånger", "många gånger", "otaliga gånger"
export const ganger = (n: number) => n === 1 ? 'en gång' : `${tal(n)} gånger`;

// ---------- listor ----------
// namnen med kommatecken och "och" sist (det som redan har ett "och" i sig först, så att leden inte blandas ihop)
export const och = (l: string[]) => { l = [...l.filter(x => x.includes(' och ')), ...l.filter(x => !x.includes(' och '))]; return l.length > 1 ? `${l.slice(0, -1).join(', ')} och ${l[l.length - 1]}` : l[0] ?? ''; };
// en lista med namn: högst max namn, annars de två första och resten som tal ("Frörhild, Igik och fyra till")
export const lista = (l: string[], max = 4) => l.length <= max ? och(l) : `${l[0]}, ${l[1]} och ${tal(l.length - 2)} till`;

// ---------- sakerna ----------
// [artikel, ental, flertal] med gemen: där namnet i SAKER inte går att räkna (harkött, hö) står ett mått framför
type Ord = readonly [art: 'en' | 'ett', ental: string, flertal: string];
export const SAKORD: Record<string, Ord> = {
  bar: ['ett', 'bär', 'bär'], rotter: ['en', 'rot', 'rötter'], kott: ['en', 'bit harkött', 'bitar harkött'], fisk: ['en', 'bit fiskkött', 'bitar fiskkött'],
  svamp: ['en', 'svamp', 'svampar'], ved: ['ett', 'vedträ', 'vedträn'], grenar: ['en', 'gren', 'grenar'], torrgras: ['en', 'famn hö', 'famnar hö'],
  kol: ['en', 'bit kol', 'bitar kol'], flinta: ['en', 'flinta', 'flintor'], yxa: ['en', 'flintyxa', 'flintyxor'], fiskespjut: ['ett', 'träspjut', 'träspjut'],
  korg: ['en', 'korg', 'korgar'], giftsvamp: ['en', 'giftig svamp', 'giftiga svampar'], sten: ['en', 'sten', 'stenar'], rep: ['ett', 'rep', 'rep'],
  talg: ['en', 'klump talg', 'klumpar talg'], ben: ['ett', 'ben', 'ben'], flintspjut: ['ett', 'flintspjut', 'flintspjut'], metspo: ['ett', 'metspö', 'metspön'],
  vilt: ['ett', 'fällt djur', 'fällda djur'], kniv: ['en', 'flintkniv', 'flintknivar'], skinn: ['ett', 'harskinn', 'harskinn'], varg: ['en', 'fälld varg', 'fällda vargar'],
  vargkott: ['en', 'bit vargkött', 'bitar vargkött'], vargskinn: ['ett', 'vargskinn', 'vargskinn'], radjur: ['ett', 'fällt rådjur', 'fällda rådjur'],
  fagel: ['en', 'fälld fågel', 'fällda fåglar'], fjadrar: ['en', 'fjäder', 'fjädrar'], agg: ['ett', 'ägg', 'ägg'], radjursskinn: ['ett', 'rådjursskinn', 'rådjursskinn'],
  bjorn: ['en', 'fälld björn', 'fällda björnar'], bjornskinn: ['ett', 'björnskinn', 'björnskinn'], abborre: ['en', 'abborre', 'abborrar'],
  paborjat: ['ett', 'påbörjat arbete', 'påbörjade arbeten'], bensyl: ['en', 'bensyl', 'bensylar'],
  rock_kaninskinn: ['en', 'rock av harskinn', 'rockar av harskinn'], rock_vargskinn: ['en', 'rock av vargskinn', 'rockar av vargskinn'], rock_bjornskinn: ['en', 'rock av björnskinn', 'rockar av björnskinn'],
  skor_kaninskinn: ['ett', 'par skor av harskinn', 'par skor av harskinn'], skor_vargskinn: ['ett', 'par skor av vargskinn', 'par skor av vargskinn'], skor_bjornskinn: ['ett', 'par skor av björnskinn', 'par skor av björnskinn'],
  balte_rep: ['ett', 'bälte av rep', 'bälten av rep'], mossa: ['en', 'tuva mossa', 'tuvor mossa'], boll: ['en', 'boll', 'bollar'], slagtra: ['ett', 'slagträ', 'slagträn'],
  mal: ['ett', 'mål', 'mål'], trumma: ['en', 'trumma', 'trummor'], benflojt: ['en', 'benflöjt', 'benflöjter'], lyra: ['en', 'lyra', 'lyror'], benspade: ['en', 'benspade', 'benspadar'],
  grillfisk: ['en', 'grillad fisk', 'grillade fiskar'], grillkott: ['en', 'bit grillat kött', 'bitar grillat kött'], torrkott: ['en', 'bit torkat kött', 'bitar torkat kött'],
  torrfisk: ['en', 'torkad fisk', 'torkade fiskar'], talgljus: ['ett', 'talgljus', 'talgljus'], fackla: ['en', 'fackla', 'facklor'], vattensack: ['en', 'vattensäck', 'vattensäckar'],
  rovfron: ['ett', 'rovfrö', 'rovfrön'], rovor: ['en', 'rova', 'rovor'], arter: ['en', 'ärta', 'ärter'], artfron: ['ett', 'ärtfrö', 'ärtfrön'],
  silver: ['en', 'bit silver', 'bitar silver'], virke: ['ett', 'stycke virke', 'stycken virke'], naver: ['en', 'bit näver', 'bitar näver'],
  vargdel: ['ett', 'vargstycke', 'vargstycken'], radjurdel: ['ett', 'rådjursstycke', 'rådjursstycken'], bjorndel: ['ett', 'björnstycke', 'björnstycken'],
};
// orden för en sak: ur SAKORD, annars sakens namn i SAKER (samma i ental och flertal)
export function sakOrd(k: string): Ord {
  const o = SAKORD[k];
  if (o) return o;
  const d = SAKER[k], n = (d?.namn ?? k).toLowerCase();
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
// sin eller sitt framför saken (sina för flera)
export const sin = (k: string, n = 1) => n !== 1 ? 'sina' : enEtt(k) === 'ett' ? 'sitt' : 'sin';
// sin eller sitt efter en sak eller station med fältet ett (en lerkruka, ett väggbräde)
export const sinOrd = (d: { ett?: boolean }) => d.ett ? 'sitt' : 'sin';
export const enOrd = (d: { ett?: boolean }) => d.ett ? 'ett' : 'en';

// ---------- teknikerna ----------
// vad den som kan tekniken gör: "har lärt sig att odla", "kom på hur man kan leda byn", "Med Gunve dog konsten att odla"
export const GORA: Record<string, string> = {
  korg: 'fläta korgar', yxa: 'göra flintyxor', fiskespjut: 'tälja träspjut', rep: 'tvinna rep', flintspjut: 'göra flintspjut', metspo: 'göra metspön',
  kniv: 'slå flintknivar', timmervagg: 'bygga timmerhus', slaktbank: 'bygga en slaktbänk', flatarbank: 'bygga en slöjdbänk', halmbadd: 'göra halmbäddar',
  bord: 'bygga bord', hylla: 'göra hyllor och kistor', skinnfall: 'sy skinnfällar', skinndorr: 'hänga dörrar av skinn', tradorr: 'göra trädörrar',
  bensyl: 'slipa bensylar', skinnklader: 'sy kläder av skinn', vattensack: 'sy vattensäckar', balte: 'fläta bälten', mal: 'binda mål', boll: 'sy bollar',
  slagtra: 'tälja slagträn', scen: 'bygga en scen', trumma: 'göra trummor', benflojt: 'skära benflöjter', lyra: 'göra lyror', kruka: 'forma lerkrukor',
  bonad: 'göra bonader', vaggbrade: 'snida väggbräden', benspade: 'göra benspadar', latrin: 'gräva en latrin', grill: 'bygga en grillställning',
  tork: 'bygga en torkställning', odling: 'odla', ledarskap: 'leda byn', fackla: 'göra facklor', skogsvard: 'flytta plantor dit skogen behövs',
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

// ---------- pronomenen ----------
// han eller hon, honom eller henne, hans eller hennes efter personens kön (aldrig hen om en viss person)
type Kon = { sex: 'm' | 'k' | string };
export const han = (p: Kon) => p.sex === 'k' ? 'hon' : 'han';
export const honom = (p: Kon) => p.sex === 'k' ? 'henne' : 'honom';
export const hans = (p: Kon) => p.sex === 'k' ? 'hennes' : 'hans';
export const stor = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
export const liten = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

// ---------- marken ----------
// hur mycket mark (rutor) som brann eller översvämmades: "en liten bit mark", "ett stort stycke mark"
export const mark = (n: number) => n <= 3 ? 'en liten bit mark' : n <= 15 ? 'en bit mark' : n <= 60 ? 'ett stort stycke mark' : 'ett mycket stort stycke mark';
