import { getMap } from './karta';
import { freeNear } from './byggnad';
import { clamp, gauss, pick, rnd } from './slump';
import { Act, DAY, LogEntry, Person, Rel, SKILLS, STATS, Skill, Stat, State } from './typer';
import { balans } from './balans';

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
  // hunger
  hungrig: 0.45, // under detta är man hungrig och äter
  bordHunger: 0.15, // vid ett bord äter man redan när mättnaden är så här mycket över hungrig (måltiden, steg 2.2.15) ...
  bordGlad: 0.06, bordGladTim: 6, // ... och blir så här mycket gladare av det, i så många timmar
  hungerTim: 16, // timmar från full mättnad till tom
  hungerBarn: 0.7, // ett barn (matBarn) blir hungrigt så här mycket långsammare
  portionBarn: 0.6, // ett barn äter så stor del av en portion
  svaltTim: 5, // timmar som svälten tar från full hälsa
  lakerMat: 0.3, // hälsan läker bara när mättnaden är över detta (och man inte är sjuk)
  lakerTim: 10, // timmar som läkningen tar från ingen hälsa till full
  // vila (rest)
  trottDag: 0.15, // under detta är man trött på dagen ...
  trottNatt: 0.12, // ... och på natten
  latVila: 0.2, // så mycket högre är gränsen för den som är helt lat
  restVila: 0.09, // vila per timme när man vilar
  restArbete: -0.06, // ... när man arbetar hårt
  restVaken: -0.03, // ... annars
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
const N1 = ['A', 'Bo', 'Da', 'E', 'Fa', 'Gu', 'Ha', 'I', 'Ka', 'Lo', 'Ma', 'Ny', 'O', 'Ra', 'Si', 'Tu', 'U', 'Ve', 'Y', 'Å', 'Ste', 'Tor', 'Al', 'Ger'];
const N2 = ['r', 'n', 'l', 'rk', 'nd', 'st', 'g', 'v', 'm', 'sk', 'lv', 'rn', 'k', 'd'];
const NK = ['a', 'e', 'ja', 'ra', 'dis', 'run', 'hild', 'frid', 'ny', 'vi', 'ka'];
const NM = ['e', 'o', 'ar', 'ik', 'ulf', 'mund', 'björn', 'vid', 'stig', 'ger', 'an'];
function makeName(s: State, sex: 'm' | 'k') {
  for (let i = 0; i < 20; i++) {
    const n = pick(s, N1, 'folk') + (rnd(s, 'folk') < 0.7 ? pick(s, N2, 'folk') : '') + pick(s, sex === 'k' ? NK : NM, 'folk');
    const nn = n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
    if (nn.length >= 3 && nn.length <= 9 && !s.people.some(p => p.name === nn && alive(p))) return nn;
  }
  return pick(s, N1, 'folk') + pick(s, sex === 'k' ? NK : NM, 'folk');
}

// ---------- personer ----------
export const alive = (p: Person) => p.died === undefined && p.left === undefined;
export const ageOf = (p: Person, now: number) => ((p.died ?? p.left ?? now) - p.born) / DAY;
export function living(s: State) { return s.people.filter(alive); }
// sjuk just nu (sickUntil är aldrig 0 eller NaN i spelet; då ger uttrycket ändå samma svar som !!sickUntil &&)
export const isSick = (p: Person, now: number) => p.sickUntil !== undefined && p.sickUntil > now;
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
  else if (k === 'minne' && a > ALDER.minneFran) g *= clamp(1 - (a - ALDER.minneFran) / ALDER.minneSpann, ALDER.minneGolv, 1);
  else if (k === 'skonhet' && a > ALDER.skonhetFran) g *= clamp(1 - (a - ALDER.skonhetFran) / ALDER.skonhetSpann, ALDER.skonhetGolv, 1);
  else if ((k === 'intelligens' || k === 'nyfikenhet' || k === 'flit' || k === 'mod') && a > ALDER.sinneFran) g *= clamp(1 - (a - ALDER.sinneFran) / ALDER.sinneSpann, ALDER.sinneGolv, 1);
  return p.pot[k] * g;
}

// färdigheterna en nykomling har efter sin ålder (en dragning ur 'folk' per färdighet, i SKILLS ordning)
export function startSkills(s: State, p: Person, age: number) {
  for (const k of SKILLS) p.skill[k] = clamp((age - ALDER.skickFran) * 0.25 * (0.4 + rnd(s, 'folk')) * (p.pot.intelligens / 12), 0, 12);
}

// övning: färdigheten k ökar med vinst gånger det som återstår till den mjuka gränsen (21), högst taket (20)
const SKILL_SOFT = 21, SKILL_MAX = 20;
export function ovning(p: Person, k: Skill, vinst: number) { p.skill[k] = clamp(p.skill[k] + vinst * (1 - p.skill[k] / SKILL_SOFT), 0, SKILL_MAX); }

export function newPerson(s: State, sex: 'm' | 'k', born: number, mother?: Person, father?: Person): Person {
  const pot = {} as Record<Stat, number>;
  for (const k of STATS) {
    const base = mother && father ? (mother.pot[k] + father.pot[k]) / 2 : 10;
    const spread = mother && father ? 3 : 4.5;
    pot[k] = clamp(base + gauss(s, 'folk') * spread * 1.6, 1, 20);
  }
  const skill = {} as Record<Skill, number>;
  for (const k of SKILLS) skill[k] = 0;
  const m = getMap(s.seed);
  const p: Person = {
    id: s.nextId++, name: '', sex, born, mother: mother?.id, father: father?.id,
    pot, skill, hunger: 0.8, rest: 0.9, social: 0.7, health: 1, warm: 1, toa: 0.6 + rnd(s, 'folk') * 0.4, habit: {}, thoughts: [],
    x: m.fire.x + (rnd(s, 'folk') - 0.5) * 3, y: m.fire.y + (rnd(s, 'folk') - 0.5) * 3, fame: [],
    hue: Math.floor(rnd(s, 'folk') * 360),
  };
  p.name = makeName(s, sex);
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
export const childrenOf = (s: State, p: Person) => s.people.filter(c => isParent(p, c));
export function isKin(a: Person, b: Person) {
  return isParent(b, a) || isParent(a, b) ||
    (a.mother !== undefined && a.mother === b.mother) || (a.father !== undefined && a.father === b.father);
}
export function similarity(a: Person, b: Person) {
  let d = 0;
  for (const k of ['nyfikenhet', 'flit', 'empati', 'mod'] as Stat[]) d += Math.abs(a.pot[k] - b.pot[k]);
  return 1 - d / 40; // ~ -0.5..1
}

export function log(s: State, text: string, kind: LogEntry['kind'], ids: number[] = []) {
  s.log.push({ t: s.now, text, kind, ids });
  if (s.log.length > 400) s.log.splice(0, s.log.length - 400);
}
// räknar det som händer i byn (statistiken i s.stat)
export const count = (s: State, k: string, n = 1) => { (s.stat ??= {})[k] = (s.stat[k] ?? 0) + n; };
// räknar k och ger true första gången det händer i byn (för raderna om 'byns första …' i loggen)
export const forstaGang = (s: State, k: string) => { count(s, k); return s.stat![k] === 1; };
export function think(p: Person, text: string, v: number, now: number, dur: number) {
  p.thoughts = p.thoughts.filter(t => t.text !== text);
  p.thoughts.push({ text, v, until: now + dur });
}
