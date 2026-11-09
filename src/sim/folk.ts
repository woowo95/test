import { eldPlats } from './karta';
import { freeNear } from './byggnad';
import { Strom, clamp, gauss, pick, rnd } from './slump';
import { Act, DAY, HOUR, LogEntry, Person, Rel, SKILLS, STATS, Skill, Stat, State, Task } from './typer';
import { balans } from './balans';
import { nyAndlighet } from './religion';
import { hourOf } from './tid';
import { lista, och, tal } from './ord';

// ---------- balanstal (regel 8) ----------
// Kroppen: mätarna hunger, rest, warm, social, toa och health går från 0 (slut) till 1 (full). Här står gränserna där folk
// börjar bry sig om dem (val.ts väljer efter dem, steg.ts och behov.ts räknar med dem, gränssnittet visar dem) och takten
// de ändras i (per timme om inget annat sägs). Lathet (lazy, 0 till 1, val.ts) höjer gränserna för grundbehoven
export const KROPP = balans('kropp', {
  // värme (warm)
  frysdod: 0.12, // under detta fryser man ihjäl: hälsan sjunker och döden blir av kyla
  farligt: 0.25, // under detta fryser man farligt och går till elden eller in i huset genast
  fryser: 0.35, // under detta fryser man (en tanke), och vill ha ved på elden
  kallt: 0.4, // under detta söker man värme (högre för den lata, latVarme); byn räknar hur många som fryser
  latVarme: 0.15, // så mycket högre är gränsen kallt för den som är helt lat
  badMin: 0.4, // ett bad kyler aldrig under detta ...
  badKyla: 0.1, // ... men kyler så mycket
  eldVarme: 2, // värme per timme från en full eld (gånger styrkan i närheten)
  mildVarme: 0.5, // värme per timme när det inte är kallt ute
  eldNara: 0.15, // värmen från elden över detta: man värms av den och vilar vid den
  frysTim: 20, // timmar som frysdöden tar från full hälsa
  // för varm (steg 2.3.4): 1 är idealet och värmen kan gå upp till maxVarm. Över idealet värmer bara solen, kläderna när det
  // inte är kallt och att sitta tätt vid elden (hetta i varmeDelar, steg.ts); elden och det milda vädret fyller bara upp till idealet
  maxVarm: 2,
  forVarm: 1.3, // över detta är man för varm: en tanke (sämre humör), lockas till bad och tar av sig de varma kläderna ...
  extremVarm: 1.7, // ... men först över detta blir man tröttare och lägger tid på att svalka sig i skuggan (steg 2.10.20)
  svalnar: 0.15, // över idealet svalnar kroppen så här mycket per timme, aldrig under idealet
  solFran: 14, solDiv: 20, // solen värmer (temperaturen - solFran) / solDiv per timme, inte i ett hus eller under träd
  skugga: 0.5, // under ett träd så här stort (0–1) är det skugga
  kladFran: 8, kladDiv: 8, // kläderna värmer sitt skydd (klad) gånger (temperaturen - kladFran) / kladDiv per timme
  eldTatt: 0.7, // elden värmer över idealet när värmen från den är över detta (tätt vid elden) ...
  eldHetta: 1, // ... med (värmen - eldTatt) gånger detta per timme
  varmTrott: 0.1, // den som är extremt varm blir tröttare: vilan sjunker så här mycket per timme gånger värmen över idealet
  badSvalka: 0.4, // ett bad kyler den som är varmare än idealet så här mycket, ner till idealet
  kladTemp: 12, // kläderna tas på först när det är kallare än så här (grader) och ingen är varmare än idealet
  // hunger
  hungrig: 0.45, // under detta är man hungrig och äter
  bordHunger: 0.15, // vid ett bord äter man redan när mättnaden är så här mycket över hungrig (måltiden, steg 2.2.15) ...
  bordGlad: 0.06, bordGladTim: 6, // ... och blir så här mycket gladare av det, i så många timmar
  hungerTim: 22, // timmar från full mättnad till tom (16 före balansen av fas 2, steg 2.12.1)
  mattar: 0.55, // en hel portion av god mat höjer mättnaden så mycket (eat i behov.ts)
  hungerBarn: 0.7, // ett barn (matBarn) blir hungrigt så här mycket långsammare
  portionBarn: 0.6, // ett barn äter så stor del av en portion
  svaltTim: 5, // timmar som svälten tar från full hälsa
  lakerMat: 0.3, // hälsan läker bara när mättnaden är över detta (och man inte är sjuk)
  lakerTim: 10, // timmar som läkningen tar från ingen hälsa till full
  // vila (rest)
  // Sedan steg 2.3.10 räcker vilan hela dagen (den tar slut långsammare) och man vilar ut när det är mörkt (VAL.nattVila i val.ts)
  trottDag: 0.1, // under detta är man så trött på dagen att man måste vila (bufferten nästan tom) ...
  trottNatt: 0.12, // ... och på natten
  latVila: 0.2, // så mycket högre är gränsen för den som är helt lat
  restVila: 0.09, // vila per timme när man vilar
  restArbete: -0.04, // ... när man arbetar hårt (-0,06 före steg 2.3.10)
  restVaken: -0.02, // ... annars (-0,03 före steg 2.3.10)
  restGolv: 0.03, // extra vila per timme när man sover inomhus på golv
  restTak: 0.02, // ... på bar mark under tak
  restBadd: 0.05, // ... i en halmbädd (steg 2.2.5)
  strandVila: 0.05, // att sitta vid vattnet ger så mycket vila
  // umgänge (social) och toa
  socialTim: 18, // timmar från fullt umgänge till tomt
  toaTim: 7, // timmar från tom till full toa-nöd
  toaSomn: 0.5, // i sömnen går det så här mycket långsammare
  toaGenast: 0.12, // under detta måste man gå på toa genast
  toaBehov: 0.25, // under detta behöver man gå på toa (högre för den lata, latToa)
  latToa: 0.1, // så mycket högre är gränsen för den som är helt lat
  toaAvbryt: 0.08, // under detta avbryter nöden det man håller på med
  // hälsa (health)
  svag: 0.4, // under detta är man för svag för att orka något
  sjukTim: 40, // timmar som sjukdomen tar från full hälsa
  sjukMin: 3, // en sjukdom varar minst så många timmar ...
  sjukSpann: 8, // ... och upp till så många timmar till
  svartSjuk: 8, // en sjukdom som varar längre än så här loggas som svår
  // risken per dygn att dö av olycka eller ålder (Gompertz): dodBas + dodAlder * e^(dodTakt * ålder), dodBarn extra för små barn
  dodBas: 0.0015,
  dodAlder: 0.00004,
  dodTakt: 0.105,
  dodBarn: 0.02,
});
// Åldrar (år i spelet, alltså dygn) som styr vad man får och orkar göra. Gränserna skiljer sig med avsikt mellan handlingar
// (barn blir vuxna för olika saker vid olika år), så varje handling har sitt eget namn även när siffran är densamma. Jämförelserna
// (< eller <=) står kvar i koden som de var
export const ALDER = balans('alder', {
  // små barn och barn
  smabarn: 3, // under detta är man ett litet barn: sover under dagen och går inte själv på toa
  barnsjuk: 5, // under detta dör man lättare, och döden räknas som en barnsjukdom
  gangBarn: 6, // under detta går man långsammare
  hjalper: 8, // från detta hjälper man till (hämtar ved åt elden), och personfliken visar vad hen vill; yngre leker
  lar: 8, // från detta lär man sig tekniker av andra
  skickFran: 8, // en nykomlings färdigheter räknas från detta (de växer med åren över det)
  matBarn: 10, // under detta äter man mindre och blir hungrig långsammare
  rensar: 10, // från detta rensar man fisk
  grillar: 10, // ... och grillar mat (steg 2.8.1)
  // ungdom
  ansvar: 12, // från detta tänder man elden, hämtar kol och bär in saker i mörkret
  bygger: 12, // från detta hjälper man till att bygga (golv, lagning och att fälla träd); väggar byggs först som vuxen
  uppfinner: 12, // från detta kommer man på tekniker medan man arbetar
  vuxen: 14, // från detta arbetar man för byn; yngre hjälper bara till eller leker. Också de som bygger väggar, har yrke och har en röst i sederna
  vaktFran: 16, // från detta kan man hålla vakt ...
  vaktTill: 60, // ... och under detta
  byggFullt: 16, // under detta bygger man långsammare (BYGG.ungFart)
  flirtFran: 16, // från detta flirtar man och kan bli ett par
  gravFran: 17, // en kvinna kan bli gravid från detta ...
  gravTill: 43, // ... och till detta
  potVaxt: 18, // en människas egenskaper växer med så här många år till full styrka: potentialen gånger (potFodd + år / potVaxt), högst 1
  fullvuxen: 20, // under detta väger ens röst i sederna bara hälften
  // vuxna och gamla
  flirtSkillnad: 18, // två som flirtar är mindre än så här många år från varandra
  aldre: 50, // över detta väger ens röst i sederna mest
  alderdom: 55, // över detta räknas döden som ålderdom, annars som olycka
  gammal: 60, // över detta orkar man mindre i arbetet (EKONOMI.gammalArbete)
  gangGammal: 65, // över detta går man långsammare
  sovGammal: 68, // över detta sover man ofta på natten
  hogAlder: 70, // den som dör så här gammal eller äldre minns man för det (eftermälet)
  // åldrandet: egenskapen backar från Fran år, och tappar hela sin kraft på Spann år till, men aldrig under Golv
  potFodd: 0.06, // en nyfödd har så här stor del av sin potential
  styrkaFran: 45, styrkaSpann: 45, styrkaGolv: 0.25, // styrka och uthållighet
  smidFran: 35, smidSpann: 45, smidGolv: 0.3, // smidigheten sjunker tidigare än styrkan (steg 3.7.6)
  minneFran: 50, minneSpann: 40, minneGolv: 0.3, // minne
  skonhetFran: 40, skonhetSpann: 70, skonhetGolv: 0.5, // skönhet
  sinneFran: 60, sinneSpann: 60, sinneGolv: 0.5, // intelligens, nyfikenhet, flit och mod
});
// Relationerna: hur mycket två tycker om varandra (op, från -100 till 100) avgör vad de gör för varandra. Gränserna läses av
// samtal.ts, behov.ts, liv.ts och gränssnittet (orden Ovän, Ogillar, Bekant, Vän och Nära vän). Jämförelserna (< eller >)
// står kvar i koden som de var: osams är under, lånar ut är över
export const REL = balans('rel', {
  ovan: -45, // under detta är man ovän (loggas en gång)
  gral: -25, // under detta grälar man ofta, och ett par går isär
  osams: -10, // under detta är man osams: ger inget, byter inte och lånar inte ut. Över detta är man bekant
  slakt: 25, // släkt har så mycket op från början
  vanOrd: 25, // över detta kallas relationen Vän (personfliken)
  van: 30, // över detta är man goda vänner: djupa samtal, och kan bli ett par
  saknar: 40, // över detta saknar man den som dör eller flyttar
  naraVan: 60, // över detta är man nära vänner (loggas en gång)
  parRom: 70, // en relation med romans (rom) över detta, och goda vänner, blir ett par
});

// ---------- namn ----------
export const N1 = ['A', 'Bo', 'Da', 'E', 'Fa', 'Gu', 'Ha', 'I', 'Ka', 'Lo', 'Ma', 'Ny', 'O', 'Ra', 'Si', 'Tu', 'U', 'Ve', 'Y', 'Å', 'Ste', 'Tor', 'Al', 'Ger',
  'As', 'Bje', 'Eri', 'Gun', 'Hal', 'Ing', 'Os', 'Rag', 'Sig', 'Sva', 'Tus', 'Ulv', 'Vi', 'Hil', 'Ar', 'Frö', 'Kol', 'Ylv']; // fler från steg 4.5.4.8
export const N2 = ['r', 'n', 'l', 'rk', 'nd', 'st', 'g', 'v', 'm', 'sk', 'lv', 'rn', 'k', 'd', 'nn', 'll', 'rd', 'ns'];
export const NK = ['a', 'e', 'ja', 'ra', 'dis', 'run', 'hild', 'frid', 'ny', 'vi', 'ka', 'borg', 'gerd', 'veig', 'unn', 'laug', 've'];
export const NM = ['e', 'o', 'ar', 'ik', 'ulf', 'mund', 'björn', 'vid', 'stig', 'ger', 'an', 'kel', 'vald', 'gaut', 'fast', 'leif', 'orm'];
export const NAMN = balans('namn', {
  arv: 0.15, // så ofta får ett barn en del av en förälders namn: början eller slutet (Torbjörn → Tuskbjörn, steg 4.5.4.8)
});
const stor = (n: string) => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
const ledigt = (s: State, n: string) => n.length >= 3 && n.length <= 9 && !s.people.some(p => p.name === n && alive(p));
// den längsta början (N1) och det längsta slutet (NM eller NK) som namnet har (steg 4.5.4.8)
const langst = (del: string[], n: string, slut: boolean) => del.filter(d => slut ? n.endsWith(d.toLowerCase()) && d.length < n.length : n.startsWith(d)).sort((a, b) => b.length - a.length)[0];
export const namnSlut = (n: string) => langst([...NM, ...NK], n.toLowerCase(), true);
// ett nytt namn, med följden strom (handlaren tar sitt ur handel, så att följden folk inte ändras). Ett barn får ibland
// början eller slutet av en förälders namn (slutet bara av föräldern med samma kön, steg 4.5.4.8)
// början + mitten + slutet, men mitten tas bort när namnet blir svårt att uttala med den och lättare utan den (steg 6.7.6):
// Osllo blir Oso, Kolrkfast Kolfast. Tre konsonanter i rad går bara som slut + början av en stavelse (Askborg, Verkmund)
const CODA = ['rk', 'rn', 'nd', 'st', 'sk', 'lv', 'rd', 'ns', 'ld', 'lf', 'rg', 'ng', 'lm', 'rm', 'lg', 'nk', 'rv'];
const ONSET = ['tr', 'kr', 'gr', 'br', 'dr', 'fr', 'bj', 'sk', 'st', 'sv', 'kv', 'sm', 'sn'];
const garUttala = (k: string) => k.length <= 2 || (
  k.length === 3 && k[0] !== k[1] && k[1] !== k[2] && ((CODA.includes(k.slice(0, 2)) && 'bdfgmv'.includes(k[2])) || ('rlns'.includes(k[0]) && ONSET.includes(k.slice(1)))));
const klungor = (n: string) => (n.toLowerCase().slice(1).match(/[bcdfghjklmnpqrstvwxz]+/g) ?? []).filter(k => !n.toLowerCase().endsWith(k));
const uttalbart = (n: string) => klungor(n).every(garUttala);
const langstKlunga = (n: string) => Math.max(0, ...klungor(n).map(k => k.length));
export function foga(borjan: string, mitt: string, slut: string) {
  const med = borjan + mitt + slut, utan = borjan + slut;
  return mitt && !uttalbart(med) && (uttalbart(utan) || langstKlunga(utan) < langstKlunga(med)) ? utan : med;
}
export function makeName(s: State, sex: 'm' | 'k', strom: Strom = 'folk', foraldrar: (Person | undefined)[] = []) {
  const f = foraldrar.filter((q): q is Person => !!q);
  if (f.length && rnd(s, strom) < NAMN.arv) {
    const q = pick(s, f, strom), slut = q.sex === sex ? namnSlut(q.name) : undefined, borjan = langst(N1, q.name, false);
    const n = slut && (!borjan || rnd(s, strom) < 0.5)
      ? stor(foga(pick(s, N1, strom), rnd(s, strom) < 0.7 ? pick(s, N2, strom) : '', slut))
      : borjan ? stor(foga(borjan, rnd(s, strom) < 0.7 ? pick(s, N2, strom) : '', pick(s, sex === 'k' ? NK : NM, strom))) : '';
    if (n && n !== q.name && ledigt(s, n)) return n;
  }
  for (let i = 0; i < 20; i++) {
    const nn = stor(foga(pick(s, N1, strom), rnd(s, strom) < 0.7 ? pick(s, N2, strom) : '', pick(s, sex === 'k' ? NK : NM, strom)));
    if (ledigt(s, nn)) return nn;
  }
  return pick(s, N1, strom) + pick(s, sex === 'k' ? NK : NM, strom);
}

// ---------- personer ----------
export const alive = (p: Person) => p.died === undefined && p.left === undefined;
// personens statistik över livet (steg 3.9.8): räknas när det händer. Med en episod räknas samma slag bara en gång
// per dygn (en svältperiod, en strid med flera bett). Drar ingen slump
export function livet(s: State, p: Person, k: string, episod = false) {
  const l = (p.liv ??= {});
  if (episod) { if (s.now - (l['t:' + k] ?? -Infinity) < DAY) { l['t:' + k] = s.now; return; } l['t:' + k] = s.now; }
  l[k] = (l[k] ?? 0) + 1;
}
export const ageOf = (p: Person, now: number) => ((p.died ?? p.left ?? now) - p.born) / DAY;
export function living(s: State) { return s.people.filter(alive); }
// sjuk just nu (sickUntil är aldrig 0 eller NaN i spelet; då ger uttrycket ändå samma svar som !!sickUntil &&)
export { isSick } from './sjukdom'; // sjukdomarna (steg 9.5.1, sjukdom.ts); den gamla klockan sickUntil räknas tills den gått ut
export function byId(s: State, id?: number) { return id === undefined ? undefined : s.people.find(p => p.id === id); }
// gör någon levande (utom `utom`) handlingen act just nu? (drar ingen slump)
export function doingAct(s: State, act: Act, utom?: Person) {
  for (const q of s.people) if (q !== utom && alive(q) && q.task?.act === act) return true;
  return false;
}

export function stat(p: Person, k: Stat, now: number) {
  const a = ageOf(p, now);
  let g = clamp(ALDER.potFodd + a / ALDER.potVaxt, ALDER.potFodd, 1);
  // åldrande: minne, styrka och uthållighet backar först och fortast, det mesta annat långsamt efter 60
  if ((k === 'styrka' || k === 'uthallighet') && a > ALDER.styrkaFran) g *= clamp(1 - (a - ALDER.styrkaFran) / ALDER.styrkaSpann, ALDER.styrkaGolv, 1);
  else if (k === 'smidighet' && a > ALDER.smidFran) g *= clamp(1 - (a - ALDER.smidFran) / ALDER.smidSpann, ALDER.smidGolv, 1);
  else if (k === 'minne' && a > ALDER.minneFran) g *= clamp(1 - (a - ALDER.minneFran) / ALDER.minneSpann, ALDER.minneGolv, 1);
  else if (k === 'skonhet' && a > ALDER.skonhetFran) g *= clamp(1 - (a - ALDER.skonhetFran) / ALDER.skonhetSpann, ALDER.skonhetGolv, 1);
  else if ((k === 'intelligens' || k === 'nyfikenhet' || k === 'flit' || k === 'mod') && a > ALDER.sinneFran) g *= clamp(1 - (a - ALDER.sinneFran) / ALDER.sinneSpann, ALDER.sinneGolv, 1);
  if (k === 'karisma' && p.sinnen !== undefined) g *= p.sinnen; // blicken, hörseln och talet (steg 8.2.2)
  return p.pot[k] * g;
}
// egenskapen k från mitten: 0 för den som har 10, −0,9 och +1 i ändarna (för det som ska bli som förut i snitt, steg 3.7.6)
export const franMitt = (p: Person, k: Stat, now: number) => (stat(p, k, now) - 10) / 10;

// färdigheterna en nykomling har efter sin ålder (en dragning ur 'folk' per färdighet, i SKILLS ordning). Matlagningen
// (steg 2.8.1) börjar av samlingen, utan en egen dragning (steg 3.10.8: eldkonsten är ingen färdighet längre)
export function startSkills(s: State, p: Person, age: number) {
  for (const k of SKILLS) if (k !== 'matlagning' && k !== 'narstrid' && k !== 'traff' && k !== 'skaldskap' && k !== 'handel' && k !== 'lakekonst') p.skill[k] = clamp((age - ALDER.skickFran) * 0.25 * (0.4 + rnd(s, 'folk')) * (p.pot.intelligens / 12), 0, 12);
  p.skill.matlagning = p.skill.samla;
  p.skill.skaldskap = p.skill.berattande * SKALD_START; // skaldskapen (steg 4.3.2.5) börjar av berättandet, utan en egen dragning
  p.skill.handel = handelStart(p); // handeln (steg 4.4.1.4) börjar av berättandet och hantverket, utan en egen dragning
  stridSkills(s, p, age);
}
export const SKALD_START = 0.5;
// den som kan tala för sig och vet vad saker är värda har lite handel i sig från början
export const handelStart = (p: Person) => ((p.skill.berattande ?? 0) + (p.skill.hantverk ?? 0)) / 4;
// närstriden och träffsäkerheten (steg 3.7.2) efter ålder, ur följden 'anlag' så att de andra dragningarna blir som förut
export function stridSkills(s: State, p: Person, age: number) {
  for (const k of ['narstrid', 'traff'] as const) p.skill[k] = clamp((age - ALDER.skickFran) * 0.1 * (0.4 + rnd(s, 'anlag')) * (p.pot.smidighet ?? 10) / 10, 0, 6);
}

// övning: färdigheten k ökar med vinst gånger det som återstår till den mjuka gränsen, högst taket
const OVNING = balans('ovning', {
  mjuk: 21, // ökningen avtar mot den här gränsen (vid färdigheten 10,5 ger övningen hälften så mycket som vid 0) ...
  tak: 20, // ... och färdigheten blir aldrig högre än så här
});
export function ovning(p: Person, k: Skill, vinst: number) { p.skill[k] = clamp(p.skill[k] + vinst * (1 - p.skill[k] / OVNING.mjuk), 0, OVNING.tak); }

// Egenskaperna (steg 2.3.11): utpräglade personligheter. En egenskap slumpas med tyngd i ändarna, så att de flesta är
// tydligt låga eller höga i något och en helt balanserad person är ovanlig. Ett barn får varje egenskap från en av
// föräldrarna (lite ändrad), och ibland en egen ny, så att fördelningen inte drar mot mitten med släktleden. En del av
// nykomlingarna är balanserade, med alla egenskaper nära mitten.
export const EGENSKAP = balans('egenskap', {
  mitt: 10, // mitten av skalan 1–20
  vidd: 9, // så långt från mitten den mest utpräglade kommer
  utprag: 0.5, // avståndet från mitten är slumptalet upphöjt till detta: 1 ger jämn fördelning, mindre ger tyngd i ändarna
  balanserad: 0.15, // så stor del av nykomlingarna är balanserade: egenskaperna samlas kring mitten som förr
  balanseradVidd: 7.2, // hur långt (gånger gauss, högst) en balanserad persons egenskaper hamnar från mitten
  ny: 0.1, // så stor chans att ett barn får en egen ny egenskap i stället för en förälders
  arvSlump: 1.2, // så mycket (gånger gauss) en ärvd egenskap ändras
});
// en ny egenskap: en dragning för hållet och en för avståndet
const nyEgenskap = (s: State, f: Strom) => {
  const hall = rnd(s, f) < 0.5 ? -1 : 1;
  return EGENSKAP.mitt + hall * Math.pow(rnd(s, f), EGENSKAP.utprag) * EGENSKAP.vidd;
};
// egenskaperna som kom senare slumpas ur en egen följd, så att följden folk (och alla nya människor) blev som förut
const SENARE: Stat[] = ['smidighet', 'aggression'];

export function newPerson(s: State, sex: 'm' | 'k', born: number, mother?: Person, father?: Person): Person {
  const pot = {} as Record<Stat, number>;
  const balanserad = !mother || !father ? rnd(s, 'folk') < EGENSKAP.balanserad : false;
  for (const k of STATS) {
    let v: number;
    const fs: Strom = SENARE.includes(k) ? 'anlag' : 'folk';
    if (balanserad) v = EGENSKAP.mitt + gauss(s, fs) * EGENSKAP.balanseradVidd;
    else if (!mother || !father) v = nyEgenskap(s, fs);
    else {
      const r = rnd(s, fs);
      const f = r < (1 + EGENSKAP.ny) / 2 ? mother : father; // barnet ärver anlagen, inte det föräldern varit med om (steg 3.1.2)
      v = r < EGENSKAP.ny ? nyEgenskap(s, fs) : ((f.anlag ?? f.pot)[k] ?? EGENSKAP.mitt) + gauss(s, fs) * EGENSKAP.arvSlump;
    }
    pot[k] = clamp(v, 1, 20);
  }
  const skill = {} as Record<Skill, number>;
  for (const k of SKILLS) skill[k] = 0;
  const f = eldPlats(s);
  const p: Person = {
    id: s.nextId++, name: '', sex, born, mother: mother?.id, father: father?.id,
    pot, skill, hunger: 0.8, rest: 0.9, social: 0.7, health: 1, warm: 1, toa: 0.6 + rnd(s, 'folk') * 0.4, torst: 1, blod: 1, habit: {}, thoughts: [],
    x: f.x + (rnd(s, 'folk') - 0.5) * 3, y: f.y + (rnd(s, 'folk') - 0.5) * 3, fame: [],
    hue: Math.floor(rnd(s, 'folk') * 360),
  };
  p.name = makeName(s, sex, 'folk', [mother, father]);
  p.andlig = nyAndlighet(s, p, mother, father); // ur personens egen följd (steg 4.1.1.1)
  const at = freeNear(s, p.x, p.y); p.x = at.x; p.y = at.y; // inte i en husvägg
  return p;
}

export function relKey(a: number, b: number) { return a < b ? a + '-' + b : b + '-' + a; }
export function getRel(s: State, a: Person, b: Person): Rel {
  const k = relKey(a.id, b.id);
  let r = s.rels[k];
  if (!r) {
    r = { chem: clamp(gauss(s, 'samtal') * 0.6, -1, 1), op: 0, rom: 0, talks: 0, flags: 0 };
    if (isKin(a, b)) r.op = REL.slakt;
    s.rels[k] = r;
  }
  return r;
}
// p är förälder till c, och p:s barn bland alla i byn (också döda och bortflyttade)
export const isParent = (p: Person, c: Person) => c.mother === p.id || c.father === p.id;
// familjen (steg 1.6.3): personen med id ag, partnern och de barn till dem som inte har egen partner. Den bor i samma hus
// (byggnader.ts) och odlar på samma fält (odling.ts)
const barnTill = (q: Person, o?: Person) => !!o && isParent(o, q);
export function familjOf(s: State, ag?: number): Person[] {
  const o = byId(s, ag);
  if (!o || !alive(o)) return [];
  const pa = byId(s, o.partner), partner = pa && alive(pa) ? pa : undefined;
  return living(s).filter(q => q === o || q === partner || ((barnTill(q, o) || barnTill(q, partner)) && !q.partner));
}
export const childrenOf = (s: State, p: Person) => s.people.filter(c => isParent(p, c));
export function isKin(a: Person, b: Person) {
  return isParent(b, a) || isParent(a, b) ||
    (a.mother !== undefined && a.mother === b.mother) || (a.father !== undefined && a.father === b.father);
}
export function similarity(a: Person, b: Person) {
  let d = 0;
  for (const k of ['nyfikenhet', 'flit', 'empati', 'mod'] as Stat[]) d += Math.abs(a.pot[k] - b.pot[k]);
  return 1 - d / 40; // -0,9 (helt olika) till 1 (lika)
}

// En rad i loggen. sam (steg 6.7.5): raden kan samlas med andra av samma slag. Står en rad med samma slag och samma nyckel
// redan bland de senaste i loggen, inom slagets fönster (SAMLA), byggs den på med den nya delen och flyttas överst, i stället
// för att en ny rad läggs till. Bara texten: statistiken räknar varje händelse som förut
export function log(s: State, text: string, kind: LogEntry['kind'], ids: number[] = [], sam?: { slag: SamSlag; k: number; n: string; d: string }) {
  if (sam) {
    const def = SAMLA[sam.slag], f = def.fonster(s.now);
    for (let i = s.log.length - 1; i >= Math.max(0, s.log.length - SAMLA_BAKAT); i--) {
      const e = s.log[i];
      if (def.fonster(e.t) !== f) break;
      if (e.sam?.slag !== sam.slag || e.sam.k !== sam.k) continue;
      e.sam.d.push(sam.d); e.t = s.now; e.text = def.text(e.sam.n, e.sam.d, s.now);
      for (const id of ids) if (!e.ids.includes(id) && e.ids.length < 8) e.ids.push(id);
      delete e.byte; delete e.bnr;
      s.log.splice(i, 1); s.log.push(e);
      return e;
    }
  }
  const e: LogEntry = { t: s.now, text, kind, ids };
  if (sam) e.sam = { slag: sam.slag, k: sam.k, n: sam.n, d: [sam.d] };
  s.log.push(e);
  if (s.log.length > 400) s.log.splice(0, s.log.length - 400);
  return e;
}
// slagen av rader som samlas (steg 6.7.5): fonster = det tidsfönster raderna måste dela (samma timme, samma del av dygnet),
// text = raden när den samlat fler än en del (n = personens namn, d = delarna)
const SAMLA_BAKAT = 30; // så här många rader bakåt söks en rad att bygga på
const DYGNSDEL = (t: number) => { const h = hourOf(t); return h < 6 || h >= 22 ? 'natten' : h < 10 ? 'morgonen' : h < 18 ? 'dagen' : 'kvällen'; };
export const SAMLA = {
  // "Ragde har lärt sig av Asunn att odla." d = "lärare|att …"
  lar: {
    fonster: (t: number) => Math.floor(t / HOUR),
    text: (n: string, d: string[]) => {
      const av = [...new Set(d.map(x => x.split('|')[0]))], vad = [...new Set(d.map(x => x.split('|')[1]))];
      const sak = vad.length > 3 ? `${vad[0]}, ${vad[1]} och ${tal(vad.length - 2)} saker till` : och(vad);
      return `${n} lärde sig ${vad.length > 3 ? 'mycket ' : ''}av ${lista(av)}: ${sak}.`;
    },
  },
  // vardagens byten i byn (byteKlart i byte.ts), d = "det som köptes mot det som betalades", utan antal
  byte: {
    fonster: (t: number) => `${Math.floor((t - 6 * HOUR) / DAY)}${DYGNSDEL(t)}`,
    text: (_n: string, d: string[], t: number) => {
      const r: Record<string, number> = {};
      for (const x of d) r[x] = (r[x] ?? 0) + 1;
      const mest = Object.keys(r).sort((a, b) => r[b] - r[a])[0];
      return `Under ${DYGNSDEL(t)} gjorde byn ${tal(d.length)} byten${r[mest] > 1 ? `, mest ${mest}` : ''}.`;
    },
  },
} satisfies Record<string, { fonster: (t: number) => number | string; text: (n: string, d: string[], t: number) => string }>;
export type SamSlag = keyof typeof SAMLA;
// räknar det som händer i byn (statistiken i s.stat)
export const count = (s: State, k: string, n = 1) => { (s.stat ??= {})[k] = (s.stat[k] ?? 0) + n; };
// en olycka gör de som såg den rädda för handlingen (steg 8.4.10, lagar.ts sätter funktionen när allt är laddat)
type AktRadd = (s: State, p: Person, act: Act | undefined, om: string, orsak?: string) => void;
let aktRaddF: AktRadd = () => {};
export const satAktRadd = (f: AktRadd) => { aktRaddF = f; };
export const raddAkt: AktRadd = (s, p, act, om, orsak) => aktRaddF(s, p, act, om, orsak);
// buden som verkar i andra system (steg 8.6.6–8.6.10, kyrka.ts sätter funktionen när allt är laddat). Tillfället säger var:
// en främling kommer (p), två ska bli ett par (p och q), p skadades av q, p vill tala illa om en död, p vill fälla trädet (x, y).
// true = budet stoppar det
export type BudTillfalle = 'framling' | 'par' | 'skadad' | 'talaIlla' | 'falla';
type BudH = (s: State, typ: BudTillfalle, p: Person, q?: Person, x?: number, y?: number) => boolean;
let budH: BudH = () => false;
export const satBudTillfalle = (f: BudH) => { budH = f; };
export const budTillfalle: BudH = (s, typ, p, q, x, y) => budH(s, typ, p, q, x, y);
// det en person gjort (steg 3.10.6), för färdigheterna i personrutan (SKILL_STAT i typer.ts): totalt (n) och timme för timme
// det senaste dygnet (t[k][timmen % 24]). Timmarna sparas bara för det hen gjort det senaste dygnet, så att sparfilen inte
// växer, och de döda har inga (die i liv.ts). Drar ingen slump
export function gjort(s: State, p: Person, k: string, n = 1) {
  const h = Math.floor(s.now / HOUR), g = (p.gjort ??= { h, n: {}, t: {} });
  if (h > g.h) for (const j in g.t) { // timmarna sedan sist är tomma, och det som är tomt hela dygnet tas bort
    const t = g.t[j];
    for (let x = Math.max(g.h + 1, h - 23); x <= h; x++) t[x % 24] = 0;
    if (t.every(v => !v)) delete g.t[j];
  }
  g.h = Math.max(g.h, h);
  (g.t[k] ??= Array(24).fill(0))[h % 24] += n; g.n[k] = (g.n[k] ?? 0) + n;
}
// hur mycket av k personen gjort det senaste dygnet (24 timmar)
export function gjortDygn(s: State, p: Person, k: string) {
  const g = p.gjort, t = g?.t[k], h = Math.floor(s.now / HOUR);
  if (!g || !t) return 0;
  let n = 0;
  for (let x = Math.max(g.h - 23, h - 23); x <= g.h; x++) n += t[x % 24];
  return n;
}
// räknar k och ger true första gången det händer i byn (för raderna om 'byns första …' i loggen)
export const forstaGang = (s: State, k: string) => { count(s, k); return s.stat![k] === 1; };
export function think(p: Person, text: string, v: number, now: number, dur: number) {
  p.thoughts = p.thoughts.filter(t => t.text !== text);
  p.thoughts.push({ text, v, until: now + dur });
}

// den som ska sova ligger först när hen är framme vid bädden eller platsen; på vägen dit går hen upprätt (steg 9.2.89)
export const soverNu = (p: Person, tk: Task) => tk.act === 'sova' && tk.phase !== 'go' && Math.hypot(p.x - tk.tx, p.y - tk.ty) < 0.6;
