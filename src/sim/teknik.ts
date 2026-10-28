import { allaBarn } from './uppvaxt';
import { ALDER, ageOf, count, log, stat, think } from './folk';
import { sedEvent } from './seder';
import { rnd } from './slump';
import { kronika } from './historik';
import { amountOf } from './lager';
import { SAKER, isTool } from './saker';
import { STATIONER, TILLBEHOR } from './stationer';
import { DORRAR, MATERIAL } from './byggnad';
import { tingOf } from './agande';
import { Act, HOUR, HOUR_S, Person, State } from './typer';
import { balans } from './balans';
import { ACTS, ACT_LIST } from './handlingar';
import type { SamtalDef } from './samtal';
import { lartUt } from './relationer';

// ---------- teknik ----------
// Ingen föds med kunskapen om hur man gör en yxa. Den som arbetar med något kommer så småningom på hur det kan göras
// bättre: ju nyfiknare, desto oftare funderar hen på det, och ju intelligentare, desto fortare går det. Det som kommits
// på kan var och en bara själv, tills hen lärt någon annan i samtal. Dör den som kan något utan att ha lärt ut det är
// kunskapen borta.
export interface Tek {
  id: string; namn: string; text: string; effekt: string;
  omr: Act[]; // arbete där man kommer på den
  krav: string[]; // teknik man måste kunna först
  niva: number; // 1 för grundnivån (inga krav), annars ett mer än det högsta den kräver (steg 2.12.9)
  // arbetstimmar för en person med medelmåttig nyfikenhet och intelligens. Mätt med npm run teknik, så att en by som gör
  // arbetet som vanligt kommer på tekniken inom TEKTAL.nivaDygn för nivån, räknat från när den blev öppen
  tid: number;
  // ju mer byn har gjort av något (statistiken stat), desto fortare kommer man på det: tiden delas med 1 + stat / per, högst
  // TEKTAL.okarMax gånger fortare (odlingen, steg 2.10.2)
  okar?: { stat: string; per: number };
  // det enda tillfälle då man kommer på den, i stället för arbetet i omr: systemet som har det tillfället anropar tankePa
  // (odlingen kommer man bara på när man plockar vilda frön, steg 2.10.11). Texten visas i teknikträdet
  nar?: string;
}
// trädet på bredden (steg 2.12.7, Björn efter v115): grillen efter slaktbänken, torkställningen efter grillen, hyllor och
// kistor efter bordet, metspöet efter träspjutet, skinndörren och skinnfällen efter skinnkläderna
export const TEKNIK: Tek[] = [
  { id: 'korg', namn: 'Korg', text: 'En korg flätad av hö.', effekt: 'Man bär hem mer från varje tur och spiller mindre bär.',
    omr: ['samla', 'hantverk'], krav: ['flatarbank'], niva: 3, tid: 9 }, // korgen flätas bara vid slöjdbänken
  { id: 'yxa', namn: 'Flintyxa', text: 'En vass flintsten bunden vid en pinne.', effekt: 'Med yxa kan man fälla träd och hugga trä.',
    omr: ['samla', 'ved', 'hantverk'], krav: [], niva: 1, tid: 10 },
  { id: 'fiskespjut', namn: 'Träspjut', text: 'En pinne som täljts spetsig med en flintsten eller en yxa.', effekt: 'Ger mycket mer fisk än händerna och hjälper på jakten, men slits fort.',
    omr: ['fiske', 'ved'], krav: [], niva: 1, tid: 7 },
  { id: 'rep', namn: 'Rep', text: 'Växtfibrer som tvinnas till rep på kvällen vid elden. Senor från slaktat vilt blir också rep.', effekt: 'Rep behövs till flintspjut och metspö.',
    omr: ['hantverk', 'samla'], krav: [], niva: 1, tid: 10 },
  { id: 'flintspjut', namn: 'Flintspjut', text: 'En flintspets som surras fast med rep vid en pinne.', effekt: 'Håller fyra gånger så länge som ett träspjut.',
    omr: ['fiske', 'jakt', 'hantverk'], krav: ['fiskespjut', 'rep'], niva: 2, tid: 16 },
  { id: 'metspo', namn: 'Metspö', text: 'Ett spö med ett rep och en krok av ben från slaktat vilt. Mask grävs fram och sätts på kroken.', effekt: 'Fisken nappar oftare och sitter kvar bättre än på spjutet.',
    omr: ['fiske'], krav: ['rep', 'fiskespjut'], niva: 2, tid: 4 },
  { id: 'kniv', namn: 'Flintkniv', text: 'En vass flintskärva med ett skaft av trä.', effekt: 'Med kniv slaktas vilt till mer kött, ben, skinn och senor.',
    omr: ['jakt', 'hantverk'], krav: [], niva: 1, tid: 6.5 },
  { id: 'timmervagg', namn: 'Timmerhus', text: 'Stockar som huggs till och läggs på varandra till en vägg, och trä som läggs som golv.', effekt: 'Byn kan bygga hus att sova i, med väggar och golv av trä.',
    omr: ['ved', 'falla', 'hugga', 'hantverk'], krav: ['yxa'], niva: 2, tid: 4 },
  // stationerna och möblerna är tekniker som byn måste komma på innan de kan byggas (steg 2.2.11); tekniken har samma id
  // som stationen i STATIONER (stationer.ts) och receptet är stationens material
  { id: 'slaktbank', namn: 'Slaktbänk', text: 'En kluven stock på ben, där viltet slaktas och fisken rensas.', effekt: 'Viltet slaktas och fisken rensas bara vid slaktbänken, och en kniv ligger kvar vid den.',
    omr: ['jakt', 'hantverk'], krav: ['kniv'], niva: 2, tid: 12 },
  { id: 'flatarbank', namn: 'Slöjdbänk', text: 'Två plankor på ben, med två stolpar och ett rep spänt emellan.', effekt: 'Vid bänken tvinnas rep dubbelt så fort, enkla redskap görs lite fortare, och korgar flätas bara där.',
    omr: ['hantverk'], krav: ['rep'], niva: 2, tid: 1 },
  { id: 'halmbadd', namn: 'Halmbädd', text: 'Hö som bäddas på en ram av grenar på golvet i huset.', effekt: 'Den som sover i en halmbädd vilar upp sig fortare.',
    omr: ['hantverk', 'bygga'], krav: ['timmervagg'], niva: 3, tid: 4 },
  // borden (steg 2.2.15): en teknik för alla tre storlekarna, med samma id som det minsta (bord i STATIONER)
  { id: 'bord', namn: 'Bord', text: 'Kluvna stockar på ben, med stubbar att sitta på runt omkring.', effekt: 'Vid bordet äter man tillsammans, blir glad av det och samtalar.',
    omr: ['hantverk', 'bygga'], krav: ['timmervagg'], niva: 3, tid: 4 },
  // förvaringen (steg 2.3.6): en teknik för hyllan, kistan och redskapsstället, med samma id som hyllan
  { id: 'hylla', namn: 'Hyllor och kistor', text: 'Hyllor och ställ av trä och rep i förrådshuset, och kistor i sovrummet för egna redskap och kläder.', effekt: 'Flera högar ryms på samma plats, så att lagret tar mindre plats. I kistan slits det som under tak.',
    omr: ['hantverk'], krav: ['rep', 'bord'], niva: 4, tid: 3.3 },
  // tillbehören till möblerna (TILLBEHOR i stationer.ts, steg 2.2.14) har också samma id som raden där
  { id: 'skinnfall', namn: 'Skinnfäll', text: 'Skinn som sys ihop till ett täcke och läggs i halmbädden.', effekt: 'Den som sover under en skinnfäll fryser mindre.',
    omr: ['hantverk', 'jakt'], krav: ['halmbadd', 'skinnklader'], niva: 5, tid: 16 },
  // dörrarna (DORRAR i byggnad.ts, steg 2.2.16) har också samma id som raden där
  { id: 'skinndorr', namn: 'Skinndörr', text: 'En hud som hängs i dörröppningen.', effekt: 'Huset släpper ut mindre värme genom dörren.',
    omr: ['bygga', 'hantverk'], krav: ['timmervagg', 'skinnklader'], niva: 5, tid: 6.7 },
  // kläderna (steg 2.3.2): bensylen slipas av ett ben och läggs vid slöjdbänken, och med den sys kläderna där
  { id: 'bensyl', namn: 'Bensyl', text: 'Ett vasst ben som slipas mot en sten eller en flinta.', effekt: 'Med bensylen vid slöjdbänken kan man sy skinn.',
    omr: ['hantverk'], krav: ['flatarbank', 'kniv'], niva: 3, tid: 4.2 },
  { id: 'skinnklader', namn: 'Skinnkläder', text: 'Skinn som sys ihop med rep av senor till en rock och ett par skor.', effekt: 'Den som har kläderna på sig fryser mindre.',
    omr: ['hantverk', 'jakt'], krav: ['bensyl'], niva: 4, tid: 14 },
  // vattensäcken (steg 2.10.1): sys av skinn som kläderna. Man kommer på den när man ger vatten åt den som inte kan gå
  { id: 'vattensack', namn: 'Vattensäck', text: 'Ett skinn som sys ihop till en säck och knyts med rep.', effekt: 'Man kan bära vatten till den som inte kan gå till vattnet.',
    omr: ['hantverk', 'dricka', 'varda'], krav: ['skinnklader'], niva: 5, tid: 5.4 },
  // bältet (steg 2.3.3): kommer man på när man bär hem både redskap och börda, ganska tidigt
  { id: 'balte', namn: 'Bälte', text: 'Ett rep som flätas till ett bälte runt midjan.', effekt: 'Redskapet hänger i bältet när man bär hem, så båda händerna är fria och man bär mer.',
    omr: ['ved', 'samla', 'fiske', 'hantverk'], krav: ['rep'], niva: 2, tid: 11 },
  // latrinen och benspaden (steg 2.7.2): spaden görs av ben, rep och en gren vid slöjdbänken, och med den grävs latrinen
  // (LATRIN i STATIONER, samma id) och rötterna fortare
  { id: 'benspade', namn: 'Benspade', text: 'Tre ben bredvid varandra som ett blad, surrade med rep vid en gren som skaft.', effekt: 'Med spaden gräver man fram rötter fortare, och gropar.',
    omr: ['hantverk', 'samla'], krav: ['slaktbank', 'rep'], niva: 3, tid: 5 },
  { id: 'latrin', namn: 'Latrin', text: 'En grop i byns utkant, grävd med benspaden.', effekt: 'Man går på toa på ett ställe, närmare än förut, och lämnar ingen smuts efter sig. Gropen fylls och måste ersättas.',
    omr: ['toa', 'hantverk', 'bygga'], krav: ['benspade'], niva: 4, tid: 9 },
  // grillställningen (steg 2.8.1, matlagning.ts; grill i STATIONER, samma id)
  { id: 'grill', namn: 'Grillställning', text: 'Två grenar med en klyka var på var sin sida om elden, och ett spett med vev som vilar i klykorna, surrat med rep.', effekt: 'Kött och fisk grillas över elden. Den grillade maten håller längre, och den som äter den blir inte sjuk av rått kött.',
    omr: ['hantverk', 'slakta', 'rensa', 'fiske'], krav: ['rep', 'slaktbank'], niva: 3, tid: 5.4 },
  // torkställningen (steg 2.8.2, matlagning.ts; tork i STATIONER, samma id)
  { id: 'tork', namn: 'Torkställning', text: 'Två A av korsade grenar som bär en lång slå, surrade med rep. På slån hänger köttet i remsor och fisken i stjärten.', effekt: 'Det kött och den fisk som byn inte hinner äta torkar på fem dygn och håller sedan länge i lagret.',
    omr: ['hantverk', 'slakta', 'rensa', 'fiske'], krav: ['rep', 'grill'], niva: 4, tid: 14 },
  // odlingen (steg 2.10.2, odling.ts): kommer man bara på när man plockar vilda frön (froFynd), fortare ju fler vilda frön
  // byn plockat; det krävs inte så många (Björn efter v107, steg 2.10.11)
  { id: 'odling', namn: 'Odling', text: 'Frön som sätts i jorden blir nya grödor.', effekt: 'Man kan så frön på ett fält och skörda grödorna.',
    omr: ['samla'], krav: [], niva: 1, tid: 0.15, okar: { stat: 'vildgrodor', per: 5 }, nar: 'plockar vilda frön' },
];
export const TEK = Object.fromEntries(TEKNIK.map(t => [t.id, t])) as Record<string, Tek>;

// Balanstal (regel 8): hur fort man kommer på något står i raden för tekniken (`tid`, arbetstimmar), och här vad det ger och hur man lär ut
// det. Åldrarna för att komma på och lära sig tekniker står i ALDER (folk.ts)
export const TEKTAL = balans('teknik', {
  materialMin: 1, // materialet till en teknik räknas finnas i byn när det är minst så här mycket (ett redskap räknas om det finns)
  kommaPa: 0.15, // den som kommer på något mår så här mycket bättre ...
  kommaPaTim: 12, // ... i så här många timmar
  forstaNyfiken: 0.04, // byns första som kommer på något gör sedernas nyfikenhet så här mycket större
  larChansBra: 0.5, // chansen att den som kan något lär ut det i ett samtal: i en berättelse eller ett djupt samtal (lar i SAMTALSSLAG, samtal.ts) ...
  larChans: 0.2, // ... och i andra samtal
  larFramsteg: 0.2, // den som lyssnar kommer så här långt (av 1) mot tekniken i ett samtal, gånger larBas + intelligens / 20
  larBas: 0.5,
  okarMax: 3, // en teknik med `okar` kommer man på högst så här många gånger fortare
  // dygn (år i spelet) från att en teknik blivit öppen (kraven kan man och materialet finns) tills en by som gör arbetet som
  // vanligt kommer på den, för nivå 1, 2, 3 …: grundnivån inom ett par dygn och senare nivåer några dygn till (Björn efter
  // v115, steg 2.12.9). Tiderna (tid i raderna) mäts fram mot dem med npm run teknik
  nivaDygn: [2, 3, 4, 5, 6],
});

export const knows = (p: Person, id: string) => (p.tek?.[id] ?? 0) >= 1;
// finns saken i byn: ett redskap räknas om det finns, hur slitet det än är; annat räknas i mängd
export const harSak = (s: State, k: string) => isTool(k) ? tingOf(s).some(q => q.k === k) : amountOf(s, k) >= TEKTAL.materialMin;
// det som måste finnas i byn för att man ska komma på tekniken: en av sakerna i varje grupp. Det räknas ur receptet
// (steg 2.12.5): det som har samma id som tekniken (en sak, station, ett tillbehör eller en dörr), annars det första
// redskapet eller väggmaterialet som tekniken ger. Varje sak i receptet är en grupp, och verktygen (ett av dem räcker) en
const recept = (id: string): { av: Record<string, number>; verktyg: string[] } | undefined => {
  const sak = SAKER[id]?.skaffa ?? Object.values(SAKER).find(d => d?.redskap && d.skaffa?.tek === id)?.skaffa;
  if (sak?.av) return { av: sak.av, verktyg: Object.keys(sak.verktyg ?? {}) };
  const st = (STATIONER as Record<string, { av: Record<string, number>; verktyg?: string }>)[id] ?? (TILLBEHOR as Record<string, { av: Record<string, number> }>)[id] ?? (DORRAR as Record<string, { av: Record<string, number> }>)[id];
  if (st) return { av: st.av, verktyg: 'verktyg' in st && st.verktyg ? [st.verktyg] : [] };
  const m = Object.values(MATERIAL).find(d => d.tek === id && d.item);
  return m?.item ? { av: { [m.item]: m.n }, verktyg: [] } : undefined;
};
const MAT: Record<string, string[][]> = {};
export const materialOf = (t: Tek) => MAT[t.id] ??= (r => r ? [...Object.keys(r.av).map(k => [k]), ...(r.verktyg.length ? [r.verktyg] : [])] : [])(recept(t.id));
export const hasMaterial = (s: State, t: Tek) => materialOf(t).every(g => g.some(k => harSak(s, k)));
export const canThink = (p: Person, t: Tek) => !knows(p, t.id) && t.krav.every(k => knows(p, k));

// den som kommer på eller lär sig något
function learn(s: State, p: Person, t: Tek, from?: Person) {
  p.tek![t.id] = 1;
  if (from) { log(s, `${p.name} har lärt sig av ${from.name} att göra ${t.namn.toLowerCase()}.`, 'skill', [p.id, from.id]); return; }
  const first = !s.people.some(q => q !== p && knows(q, t.id)) && !(s.stat?.['tek_' + t.id]);
  count(s, 'tek_' + t.id);
  if (first) kronika(s, `${p.name} uppfann ${t.namn.toLowerCase()}.`);
  log(s, `${p.name} kom på hur man gör ${t.namn.toLowerCase()}. ${t.effekt}`, 'skill', [p.id]);
  think(p, `Kom på hur man gör ${t.namn.toLowerCase()}`, TEKTAL.kommaPa, s.now, TEKTAL.kommaPaTim * HOUR);
  if (first) { p.fame.push(`Uppfann ${t.namn.toLowerCase()}`); sedEvent(s, 'nyfikenhet', TEKTAL.forstaNyfiken); allaBarn(s, 'uppfinning', `uppfann ${t.namn.toLowerCase()}`); }
}

// arbete för tankarna framåt mot det som hör till arbetet (omr). Hantverk (slag hantverk i handlingar.ts: att tvinna rep,
// fläta en korg, göra ett redskap) räknas som hantverk, utom det som själv står i någon tekniks omr: att slakta och rensa
// ger bara idéer till de tekniker som nämner dem (grillen och torkställningen). Andra handlingar ger inga idéer
const OMR = new Set(TEKNIK.flatMap(t => t.omr));
const HANTVERK = new Set(ACT_LIST.filter(a => ACTS[a].slag === 'hantverk'));
const omrAv = (act: Act): Act => HANTVERK.has(act) ? 'hantverk' : act;
export function thinkWhileWorking(s: State, p: Person, act0: Act, dtSec: number) {
  const act = OMR.has(act0) ? act0 : omrAv(act0);
  if (!OMR.has(act) || ageOf(p, s.now) < ALDER.uppfinner) return;
  for (const t of TEKNIK) if (!t.nar && t.omr.includes(act)) framat(s, p, t, dtSec);
}
// tillfället i nar (raden i TEKNIK): p tänker på tekniken id i dtSec sekunder
export function tankePa(s: State, p: Person, id: string, dtSec: number) {
  if (ageOf(p, s.now) >= ALDER.uppfinner) framat(s, p, TEK[id], dtSec);
}
function framat(s: State, p: Person, t: Tek, dtSec: number) {
  if (!canThink(p, t) || !hasMaterial(s, t)) return;
  const nyf = stat(p, 'nyfikenhet', s.now) / 10, intel = stat(p, 'intelligens', s.now) / 10;
  p.tek ??= {};
  // arbetstimmarna medan tekniken är öppen och ingen i byn kommit på den än (npm run teknik, steg 2.12.9)
  if (!s.stat?.['tek_' + t.id]) count(s, 'tekTim_' + t.id, dtSec / HOUR_S);
  const okar = t.okar ? Math.min(TEKTAL.okarMax, 1 + (s.stat?.[t.okar.stat] ?? 0) / t.okar.per) : 1;
  const d = Math.min(1 - (p.tek[t.id] ?? 0), dtSec / HOUR_S / t.tid * nyf * intel * okar);
  p.tek[t.id] = (p.tek[t.id] ?? 0) + d; count(s, 'tekTankt', d);
  if (p.tek[t.id] >= 1) learn(s, p, t);
}

// i samtal lär den som kan något ut det, och den som lyssnar lär sig fortare ju intelligentare hen är
export function teach(s: State, a: Person, b: Person, slag: SamtalDef, mer = 1) { // mer: mentorn lär ut mer (relationer.ts)
  if (!a.tek || ageOf(b, s.now) < ALDER.lar) return;
  for (const t of TEKNIK) {
    if (!knows(a, t.id) || knows(b, t.id) || !t.krav.every(k => knows(b, k))) continue;
    if (rnd(s, 'kunskap', a) > TEKTAL[slag.lar ?? 'larChans'] * mer) continue;
    lartUt(s, a, b);
    b.tek ??= {};
    const d = Math.min(1 - (b.tek[t.id] ?? 0), TEKTAL.larFramsteg * (TEKTAL.larBas + stat(b, 'intelligens', s.now) / 20));
    b.tek[t.id] = (b.tek[t.id] ?? 0) + d; count(s, 'tekLart', d);
    if (b.tek[t.id] >= 1) learn(s, b, t, a);
  }
}

// äldre sparfiler: den som redan gjort yxor eller spjut kan det
export function migrateTek(s: State) {
  for (const p of s.people) {
    if ((p.habit?.yxa ?? 0) > 0 || p.fame.some(f => f.includes('första yxa'))) (p.tek ??= {}).yxa = 1;
    if ((p.habit?.spjut ?? 0) > 0) (p.tek ??= {}).fiskespjut = 1;
  }
}
