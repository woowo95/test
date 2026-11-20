import { gen } from './ord';
import { overskott } from './teknik';
// Sporten (steg 4.3.1, Kultur, sport och konst): barnens lekar blir sport för de vuxna. Några sociala sporter med enkla
// föremål, när byn har ett överskott av mat och ved och folk har fritid. Sporten ger glädje och tränar bara färdigheter
// (brottning och dragkamp närstrid, kast och bollspel träffsäkerhet), aldrig egenskaperna. Den är ingen stor del av spelet.
// En match i taget: den som har fritid börjar en på en plats i byn eller går med i den som väntar på spelare, och den spelas på
// dagen. Sporterna är rader i registret SPORTER; föremålen de kräver är saker i saker.ts som byn måste ha.
import { personHand } from './personlogg';
import { ALDER, ageOf, alive, byId, count, getRel, living, log, ovning, stat, paKartan } from './folk';
import { SAKER, isTool } from './saker';
import { nTools, ownsFree, tingOf, wearTool } from './agande';
import { kronika } from './historik';
import { foodDays } from './ekonomi';
import { woodDays } from './eld';
import { amountOf, avbryt } from './lager';
import { friRuta } from './omrade';
import { bitAt, freeNear, roomAt } from './byggnad';
import { ledig } from './stationer';
import { groundOf } from './mark';
import { FOREST } from './vag';
import { HALSA, kanGa } from './halsa';
import { ACTS, isWork } from './handlingar';
import { duty } from './seder';
import { raddFor } from './radsla';
import { kartStridAv, kartStridBorja } from './kartstrid';
import { clamp, rnd } from './slump';
import { hourOf } from './tid';
import { snoPaMarken } from './vader';
import { balans } from './balans';
import { notis } from './notiser';
import { och, tal } from './ord';
import { STRID } from './strid';
import { EFTER } from './efterstrid';
// kampen i brottningen är slut: ringen är ledig igen (steg 10.1.7)
EFTER.brottning = s => { if (s.sport) s.sport.brott = s.now; };
import { HOUR, HOUR_S, MIN, SEC, Person, Skill, State, Task, W, inMap } from './typer';
import { budHindrar } from './kyrka';
import { FEST, festNu, festVann } from './kultlatt';
import { betalning } from './framtradande';
import { ledareOf, legitimitet } from './styre';
import { handelse } from './rykten';
import { tanke } from './tankar';
import { upplev } from './uppvaxt';

export interface SportDef {
  id: string; namn: string;
  text: string; // vad man ser när den spelas
  foremal: string[]; // sakerna byn måste ha (saker.ts)
  skill: Skill; // färdigheten den tränar
  min: number; max: number; // så många spelare som behövs och som får vara med
  lag?: true; // två lag, som slumpas när matchen börjar; ett helt lag vinner (steg 10.7.14)
  yta: number; // radien av öppen mark i rutor som sporten behöver (steg 10.7.12)
  nar?: keyof typeof NAR; // spelas bara då (steg 4.3.1.3): sno = när det ligger snö på marken
  best: string; // matchen i bestämd form, i raden om vem som vann (steg 5.4.8.1)
  tyst?: 'alla' | 'kampen'; // vem som inte pratar (steg 9.2.100): alla som spelar, eller bara de två som brottas just nu; de andra hejar och pratar
  gor: string; titta: string; // uppgiftens namn för den som spelar och den som tittar (ACTS.sport och ACTS.titta, task.tool = sporten)
  upp: keyof typeof UPPSTALL; // hur de ställer upp (UPPSTALL)
  avst?: number; // på en rad: målet står så här många rutor framför raden (annars SPORT.kastAvst)
  kamp?: true; // två och två i mitten med stridens system, en kamp i taget (brottningen, steg 9.2.92)
  egen?: { k: string; haller: number }; // var och en spelar med sitt eget lediga redskap k, som slits och håller så här många timmars spel
  // hur sporten ritas (SPORTBILD i ui/manniskor.ts): figurernas rörelse, det som ritas runt matchen och det som flyger där
  bild: { figur: 'drag' | 'ring' | 'still' | 'sno' | 'slag'; rita?: 'rep' | 'mal' | 'sno' | 'boll'; skott?: 'sten' | 'pil' };
}
// uppställningarna (steg 4.5.6.10–11, 10.7.21): var den i:te som går med står, i rutor från matchens mitt (undefined = någonstans
// nära mitten). lag = när lagen delas går var och en till sitt lags sida
const radI = (j: number) => (j % 2 ? 1 : -1) * Math.ceil(j / 2) * SPORT.rad; // på en rad: mitten, sedan varannan över och under
interface UppDef { lag?: true; plats: (i: number, d: SportDef) => { x: number; y: number } | undefined }
export const UPPSTALL = {
  // två i mitten, de andra i en ring runt om
  ring: { plats: i => i < 2 ? { x: i ? 0.35 : -0.35, y: 0 } : { x: Math.cos(i * 2.4) * SPORT.ring, y: Math.sin(i * 2.4) * SPORT.ring } },
  // två lag på en rad på var sin sida om strecket i mitten: varannan till vänster och varannan till höger, de senare längre ut
  rep: { lag: true, plats: i => ({ x: (i % 2 ? 1 : -1) * (SPORT.dragMitt + Math.floor(i / 2) * SPORT.dragAvst), y: 0 }) },
  // på en rad, målet en bit framför (malAv)
  rad: { plats: (i, d) => ({ x: -(d.avst ?? SPORT.kastAvst) / 2, y: radI(i) }) },
  // två lag, var sin sida på var sin rad
  sidor: { lag: true, plats: i => ({ x: (i % 2 ? 1 : -1) * SPORT.snoAvst, y: radI(Math.floor(i / 2)) }) },
  // den som slår står i ena änden, de andra ute på planen (vandra i ACTS)
  slag: { plats: i => i === 0 ? { x: -SPORT.slagAvst, y: 0 } : undefined },
} satisfies Record<string, UppDef>;
const UPP: Record<string, UppDef> = UPPSTALL;
// när en sport kan spelas (SportDef.nar)
const NAR = { sno: (s: State) => snoPaMarken(s) > 0 };
export const SPORTER: SportDef[] = [
  { id: 'brottning', namn: 'Brottning', text: 'Två brottas i mitten och försöker trycka undan varandra, och de andra står i en ring runt om och hejar.', foremal: [], skill: 'narstrid', min: 2, max: 6, yta: 2, best: 'brottningen', tyst: 'kampen', gor: 'Brottas', titta: 'Tittar på brottningen', upp: 'ring', kamp: true, bild: { figur: 'ring' } },
  { id: 'dragkamp', namn: 'Dragkamp', text: 'Två lag drar i var sin ände av ett rep, tills det ena laget dras över strecket.', foremal: ['rep'], skill: 'narstrid', min: 4, max: 10, yta: 4, lag: true, best: 'dragkampen', tyst: 'alla', gor: 'Drar i dragkampen', titta: 'Tittar på dragkampen', upp: 'rep', bild: { figur: 'drag', rita: 'rep' } },
  { id: 'kast', namn: 'Kast mot mål', text: 'De kastar stenar och pinnar mot målet i tur och ordning, och den som träffar flest vinner.', foremal: ['mal'], skill: 'traff', min: 2, max: 6, yta: 3, best: 'kastandet mot målet', gor: 'Kastar mot målet', titta: 'Tittar på kastandet', upp: 'rad', bild: { figur: 'still', rita: 'mal', skott: 'sten' } },
  { id: 'snoboll', namn: 'Snöbollskrig', text: 'Två lag kastar snöbollar på varandra, och den som träffas är ute.', foremal: [], skill: 'traff', min: 2, max: 10, yta: 3, lag: true, nar: 'sno', best: 'snöbollskriget', tyst: 'alla', gor: 'Kastar snöboll', titta: 'Tittar på snöbollskriget', upp: 'sidor', bild: { figur: 'sno', rita: 'sno' } },
  { id: 'bollspel', namn: 'Bollspel', text: 'Två lag slår bollen med slagträet och springer efter den, som i knattleikr.', foremal: ['boll', 'slagtra'], skill: 'traff', min: 4, max: 10, yta: 4, lag: true, best: 'bollspelet', tyst: 'alla', gor: 'Spelar bollspel', titta: 'Tittar på bollspelet', upp: 'slag', bild: { figur: 'slag', rita: 'boll' } },
  // bågskyttet (steg 10.7.21): två till sex skyttar på rad, var och en med sin egen båge, som slits som vid jakt
  { id: 'bagskytte', namn: 'Bågskytte', text: 'Skyttarna står på en rad och skjuter pilar mot målet i tur och ordning, och den som träffar närmast mitten vinner.', foremal: ['mal', 'pilar'], skill: 'traff', min: 2, max: 6, yta: 4, avst: 6, best: 'bågskyttet', gor: 'Skjuter mot målet', titta: 'Tittar på bågskyttet', upp: 'rad', egen: { k: 'bage', haller: 40 }, bild: { figur: 'still', rita: 'mal', skott: 'pil' } },
];
// uppgifternas namn kommer ur raderna, så att en ny sport bara är en rad här
for (const d of SPORTER) { ACTS.sport.verktyg![d.id] = d.gor; ACTS.titta.verktyg![d.id] = d.titta; }
export const SPORT_AV: Record<string, SportDef> = Object.fromEntries(SPORTER.map(d => [d.id, d]));
// pratar inte p, som spelar, just nu (steg 9.2.100)? I brottningen bara de två som kämpar
export function tystISporten(s: State, p: Person) {
  const m = s.sport, d = m && SPORT_AV[m.k];
  return !!d && (d.tyst === 'alla' || d.tyst === 'kampen' && s.now < (m!.brott ?? 0) && !!m!.brottare?.includes(p.id));
}

export const SPORT = balans('sport', {
  vikt: 0.4, // vikten i fritiden (leisure i val.ts) att börja en match, gånger lugnet och (styrka + smidighet) / 20 ...
  med: 12, // ... och gånger så här mycket när en match väntar på spelare
  mat: 1.1, ved: 2, // fullt ut när maten räcker så här många dygn och veden så här många, mindre med mindre (overskott i teknik.ts, steg 10.2.43)
  minuter: 10, spann: 10, // en match varar så här många minuter från att den börjar, plus upp till spann (steg 10.7.13)
  vanta: 10, // minuter: så länge väntar man på spelare; matchen börjar senast då, om det kommit nog
  // samlingen (steg 10.7.12): den som ropar hörs nara rutor. Var och en som hör vill vara med med chansen folj gånger överskottet
  // gånger (styrka + smidighet) / 20, gånger (1 + foljTycke × tycket om den som samlar / 100), och för den som arbetar gånger
  // (1 - foljPlikt × pliktkänslan). Vill ingen blir den som samlade ledsen (ingen i ingenTim timmar)
  folj: 0.8, nara: 20, foljTycke: 0.5, foljPlikt: 0.5, ingen: 0.05, ingenTim: 1,
  utanfor: 10, // platsen ligger i byn eller högst så här många rutor utanför byns område
  ovning: 0.15, // övning i sportens färdighet per timme man spelar
  // när matchen avgörs (steg 10.7.15): vinnarna blir så här glada och förlorarna så här ledsna, i gladjeTim timmar
  gladje: 0.08, forlust: 0.04, gladjeTim: 1,
  slit: 0.05, // föremålen som är redskap (bollen, slagträet, målet) slits så här mycket per match (steg 4.3.1.2)
  vinnSkill: 10, // den som vinner en match: färdigheten i sporten (0–20) plus en slump upp till så här mycket
  snoVal: 0.5, // när en sport som bara går i snön kan spelas (nar) väljs den så här ofta (steg 4.3.1.3)
  dragMitt: 1, dragAvst: 0.7, // dragkampen: den första i varje lag står så här många rutor från strecket, och var och en efter så här mycket längre ut
  // platserna i de andra sporterna (steg 4.5.6.11), i rutor från mitten: ringen runt brottarna, raden som kastar och målet,
  // lagen i snöbollskriget, den som slår i bollspelet, och avståndet mellan de som står på rad
  ring: 1.8, kastAvst: 3, snoAvst: 2.5, slagAvst: 3, rad: 0.8,
  sparas: 20, // så här många matcher sparas i s.matcher (steg 5.4.8.1)
  titta: 1, // publiken (steg 10.7.16): vikten i fritiden att titta på en match som pågår eller väntar, gånger lugnet
  tittaGladje: 0.03, // de som står och tittar när matchen avgörs blir så här glada, i gladjeTim timmar
  bastMin: 5, // den som har vunnit så här många matcher i en sport, och fler än någon annan, är den bästa i den (eftermälet)
  // tävlingen (steg 10.7.20): när någon samlar till en match sätter ledaren upp sin minst värda lediga sak som pris med chansen
  // tavling × (1 - legitimiteten). Viljan att vara med blir (1 + prisVikt × färdigheten i sporten / 20) gånger större, och
  // spelarna och publiken tycker tavlingTack bättre om ledaren när priset delas ut
  tavling: 0.3, prisVikt: 2, tavlingTack: 3,
});

// matchen som pågår eller väntar på spelare: sporten, platsen, när den började (spelarnas task.ref) och slutar
// p: den som samlade, lista: de som ville vara med vid ropet (raden sport i val.ts för dem dit), platser: var och ens plats,
// titta: publiken i den ordning de kom (steg 10.7.16), igang: alla som var på väg har kommit fram (eller väntan är slut) och matchen har börjat
export interface Match { k: string; x: number; y: number; start: number; slut: number; p?: number; lista?: number[]; platser?: Record<number, { x: number; y: number }>; igang?: true; borjar?: number; lag?: Record<number, 0 | 1>; spelat?: true; avgjord?: true; n?: number; brott?: number; brottare?: number[]; bud?: number[]; titta?: number[]; pris?: { t: number; k: string; av: number } } // pris: tävlingens pris, tinget och ledaren som satte upp det (steg 10.7.20) // brott: när kampen i brottningen (steg 9.2.92) är slut // bud: de som avstått från kampen för budet om ingen strid (fynd 322) // n: så många som gått med (platsen i laget)

// matchens sammanställning (steg 5.4.8.1, Sporten i designdokumentet): sparas när matchen avgörs eller ställs in, inte ur
// loggen. Raden i Händelser och notisen pekar dit med numret (LogEntry.match), och fliken Matchen (ui/flikar/match.ts) visar
// den. spelare: var och en med färdigheten i sportens färdighet (0–20) och resultatet (färdigheten plus slumpen, vinnare()),
// glad: vinnarnas glädje och ledsen förlorarnas sorg efter matchen i hundradelar (SPORT.gladje, SPORT.forlust), installd: det kom för få.
// Lagen (steg 10.7.14) står hos var och en, och publik är de som stod och tittade när matchen avgjordes (steg 10.7.16)
export interface MatchSpelare { id: number; namn: string; f: number; v: number; l?: 0 | 1 } // l: laget (steg 10.7.14)
export interface MatchMinne { nr: number; k: string; t: number; slut: number; spelare: MatchSpelare[]; vinnare?: number; vnamn?: string; glad: number; ledsen?: number; installd?: true; vinnLag?: 0 | 1; publik?: { id: number; namn: string }[]; pris?: Pris }
// tävlingens pris (steg 10.7.20): saken, ledaren som gav den och den som fick den (ingen = saken fanns inte kvar)
export interface Pris { k: string; sak: string; av: number; avNamn: string; fick?: number; fickNamn?: string }
function matchMinne(s: State, d: SportDef, m: Match, har: Person[], v: Map<Person, number>, vinn?: Person, vinnLag?: 0 | 1, pris?: Pris) {
  const mm: MatchMinne = { nr: s.matchNr = (s.matchNr ?? 0) + 1, k: d.id, t: m.borjar ?? m.start, slut: s.now, glad: vinn ? Math.round(SPORT.gladje * 100) : 0, ...(vinn && har.length > 1 ? { ledsen: Math.round(SPORT.forlust * 100) } : {}),
    spelare: har.map(q => ({ id: q.id, namn: q.name, f: Math.round(q.skill[d.skill]), v: Math.round((v.get(q) ?? q.skill[d.skill]) * 10) / 10, ...(m.lag?.[q.id] !== undefined ? { l: m.lag[q.id] } : {}) })) };
  if (vinn) { mm.vinnare = vinn.id; mm.vnamn = vinn.name; } else mm.installd = true;
  if (vinnLag !== undefined) mm.vinnLag = vinnLag;
  if (pris) mm.pris = pris;
  const pub = publiken(s, m); if (pub.length) mm.publik = pub.map(q => ({ id: q.id, namn: q.name }));
  const text = vinnLag !== undefined ? `Laget med ${och(har.filter(q => m.lag?.[q.id] === vinnLag).map(q => q.name))} vann ${d.best}.` : vinn ? `${vinn.name} vann ${d.best}.` : `Det blev ingen ${d.namn.toLowerCase()}: det kom för få.`, ids = har.map(q => q.id);
  const ptext = pris?.fick !== undefined ? ` Det var en tävling, och ${pris.fick === pris.av ? `${pris.avNamn} behöll sitt pris, ${pris.sak}` : `${pris.fickNamn} fick ${pris.avNamn}s ${pris.sak}`}.` : pris ? ` Det var en tävling, men ${pris.avNamn}s ${pris.sak} fanns inte kvar.` : '';
  log(s, text + ptext, 'world', ids).match = mm.nr;
  notis(s, 'match', text + ptext, ids, { x: m.x, y: m.y }, { match: mm.nr });
  (s.matcher ??= []).push(mm);
  if (s.matcher.length > SPORT.sparas) s.matcher.splice(0, s.matcher.length - SPORT.sparas);
}
// matchen med numret nr, om den finns kvar
export const matchMinneAv = (s: State, nr: number) => s.matcher?.find(m => m.nr === nr);

// de som spelar i matchen (framme = de som kommit fram)
const spelare = (s: State, m: Match, framme: boolean) => s.people.filter(q => alive(q) && q.task?.act === 'sport' && q.task.ref === m.start && (!framme || q.task.phase === 'do'));
// sporter byn kan spela nu: föremålen finns, och det finns vuxna nog
// den som spelar med sitt eget redskap (SportDef.egen) har ett ledigt
const harEgen = (s: State, q: Person, d: SportDef) => !d.egen || ownsFree(s, q, d.egen.k);
const kanSpela = (s: State, d: SportDef, vuxna: number) => vuxna >= d.min && (!d.egen || living(s).filter(q => harEgen(s, q, d)).length >= d.min) && (!d.nar || NAR[d.nar](s)) && d.foremal.every(k => isTool(k) ? nTools(s, k) >= 1 : amountOf(s, k) >= 1); // ett slitet redskap är fortfarande ett
// matchen som går att gå med i (den som är slut glöms, när den är avgjord: spelarna avgör den när de är klara)
function oppen(s: State) {
  const m = s.sport;
  if (m && s.now >= m.slut) { if (!m.spelat || m.avgjord || !spelare(s, m, false).length) s.sport = undefined; return undefined; }
  return m && !m.igang && spelare(s, m, false).length < SPORT_AV[m.k].max ? m : undefined;
}
// hur många av föremålet k (ett redskap) byn vill ha: ett, när byn har vuxna nog till en sport som behöver det (VILL i redskap.ts)
export const sportFor = (s: State, k: string) => SPORTER.some(d => d.foremal.includes(k) && vuxna(s) >= d.min) ? 1 : 0;
const vuxna = (s: State) => living(s).filter(q => ageOf(q, s.now) >= ALDER.vuxen).length;

// vikten för sport i fritiden (leisure i val.ts): calm är lugnet där (1 när byn inte behöver arbete)
export function sportVikt(s: State, p: Person, calm: number) {
  const a = ageOf(p, s.now);
  if (a < ALDER.vuxen) return 0; // ingen åldersgräns uppåt: kroppen (styrkan och smidigheten) avgör (fynd 557)
  const m = oppen(s);
  if (!m && s.sport) return 0; // en match i taget
  if (m?.titta?.includes(p.id)) return 0; // den som tittar spelar inte (steg 10.7.16)
  if (m && !harEgen(s, p, SPORT_AV[m.k])) return 0; // utan eget redskap kan man inte vara med
  if (!m && !SPORTER.some(d => kanSpela(s, d, vuxna(s)))) return 0;
  return overskott(foodDays(s), woodDays(s), SPORT.mat, SPORT.ved) * SPORT.vikt * calm * (m ? SPORT.med * (m.pris ? prisLust(p, SPORT_AV[m.k]) : 1) : festNu(s) ? FEST.lust : 1) * (stat(p, 'styrka', s.now) + stat(p, 'smidighet', s.now)) / 20;
}
// att spela: gå med i matchen som väntar, annars samla folk till en ny (steg 10.7.12)
export function sportVal(s: State, p: Person): { why: string; spot: { x: number; y: number }; dur: number; ref: number; tool: string } | undefined {
  let m = oppen(s);
  if (!m && s.sport) return undefined; // en match i taget
  if (m?.titta?.includes(p.id)) return undefined; // den som tittar spelar inte (steg 10.7.16)
  if (m && !harEgen(s, p, SPORT_AV[m.k])) return undefined;
  const ny = !m;
  if (!m) {
    const morkt = s.now + (19 - hourOf(s.now)) * HOUR; // sporten spelas på dagen (isLight i tid.ts): matchen slutar när det blir mörkt
    if (morkt - s.now < (SPORT.vanta + SPORT.minuter + SPORT.spann) * MIN) return undefined; // väntan och den längsta matchen ryms före mörkret
    // den som samlar ropar, och var och en som hör avgör en gång om hen vill vara med
    const pris = prisAv(s), n = vuxna(s);
    // med ett pris väljer ledaren sporten först, och priset lockar de skickliga i den (steg 10.7.20)
    const d0 = pris ? (() => { const k = SPORTER.filter(d => kanSpela(s, d, n)); return k.length ? k[Math.floor(rnd(s, 'sport', p) * k.length)] : undefined; })() : undefined;
    const vill = living(s).filter(q => q !== p && horRopet(s, p, q) && rnd(s, 'sport', q) < foljChans(s, p, q) * (d0 ? prisLust(q, d0) : 1));
    const kan = SPORTER.filter(d => harEgen(s, p, d) && d.min <= vill.filter(q => harEgen(s, q, d)).length + 1 && kanSpela(s, d, n) && (!d0 || d === d0));
    if (!kan.length) { ingen(s, p); return undefined; }
    const sno = kan.filter(d => d.nar), val = sno.length && rnd(s, 'sport', p) < SPORT.snoVal ? sno : kan; // i snön blir det oftast snöbollskrig
    const d = val[Math.floor(rnd(s, 'sport', p) * val.length)];
    const at = sportPlats(s, p, d);
    if (!at) { count(s, 'sportIngenPlats'); return undefined; }
    m = s.sport = { k: d.id, x: at.x + 0.5, y: at.y + 0.5, start: s.now, slut: s.now + (SPORT.vanta + SPORT.minuter + SPORT.spann) * MIN, p: p.id, lista: vill.filter(q => harEgen(s, q, d)).slice(0, d.max - 1).map(q => q.id), ...(pris ? { pris } : {}) };
    count(s, 'sportMatcher');
    if (pris) count(s, 'tavlingar');
    // de som vill avbryter det de gör och väljer igen, där matchen är ett Tillfälle (sportListaVal)
    for (const id of m.lista!) { const q = byId(s, id); if (q?.task) avbryt(s, q); }
  }
  const d = SPORT_AV[m.k];
  return { why: ny ? `Vill ha ${d.namn.toLowerCase()} och samlar folk` : m.pris ? `Tävlar i ${d.namn.toLowerCase()} om ${prisNamn(m.pris.k)}` : `Är med i ${d.best}`, spot: platsFor(s, p, m), dur: m.slut - s.now, ref: m.start, tool: d.id };
}
// den som ville vara med vid ropet går till matchen (raden sport på nivån Tillfälle i val.ts), tills den har börjat
export function sportListaVal(s: State, p: Person) {
  const m = s.sport;
  if (!m || m.igang || s.now >= m.slut || !m.lista?.includes(p.id)) return undefined;
  const d = SPORT_AV[m.k];
  return { why: `Följer med ${byId(s, m.p ?? -1)?.name ?? 'de andra'} och spelar ${d.namn.toLowerCase()}`, spot: platsFor(s, p, m), dur: m.slut - s.now, ref: m.start, tool: d.id };
}
// hör q ropet från p och kan komma: en vuxen inom hörhåll, vaken, kan gå, strider inte, gör inget som
// inte ens ett larm avbryter, bär ingen död (den som bär en kropp till graven lägger inte ner den för att spela) och är inte
// rädd för att spela
function horRopet(s: State, p: Person, q: Person) {
  const a = ageOf(q, s.now), t = q.task;
  return paKartan(q) && !q.gast && a >= ALDER.vuxen && Math.hypot(q.x - p.x, q.y - p.y) <= SPORT.nara && kanGa(q)
    && !(t && (t.act === 'sport' || t.act === 'sova' || t.act === 'badd' || ACTS[t.act]?.fortsatter?.length)) && !kartStridAv(s, q) && !raddFor(s, q, 'sport') && !s.kvarlevor?.some(k => k.bars === q.id);
}
// chansen att q vill vara med när p samlar: överskottet, kroppen, tycket om p och, för den som arbetar, pliktkänslan
const foljChans = (s: State, p: Person, q: Person) => SPORT.folj * overskott(foodDays(s), woodDays(s), SPORT.mat, SPORT.ved) * (stat(q, 'styrka', s.now) + stat(q, 'smidighet', s.now)) / 20
  * (1 + SPORT.foljTycke * getRel(s, q, p).op / 100) * (q.task && isWork(q.task.act) ? 1 - SPORT.foljPlikt * duty(s, q) : 1);
// ingen ville vara med: den som samlade blir ledsen
function ingen(s: State, p: Person) { tanke(p, 'ingenSpela', s.now, { v: -SPORT.ingen, tid: SPORT.ingenTim * HOUR }); count(s, 'sportIngen'); }
// platsen: den fria ruta i byn eller minst utanför (högst SPORT.utanfor rutor), närmast den som samlar, där alla rutor inom
// sportens yta är lediga, utan tak och utan träd
export function sportPlats(s: State, p: Person, d: SportDef) {
  const tr = groundOf(s).trees, r = d.yta;
  return friRuta(s, SPORT.utanfor, (x, y) => {
    for (let j = y - r; j <= y + r; j++) for (let i = x - r; i <= x + r; i++) {
      if ((i - x) ** 2 + (j - y) ** 2 > r * r + r) continue;
      if (!inMap(i, j) || !ledig(s, i, j) || roomAt(s, i + 0.5, j + 0.5) || bitAt(s, i, j) || tr[j * W + i] >= FOREST) return false;
    }
    return true;
  }, festNu(s) ? { x: s.fest!.x, y: s.fest!.y } : { x: p.x, y: p.y }); // på festdagen helst nära festplatsen (steg 10.7.19)
}
// var och ens plats i matchen, bestämd en gång
export const platsFor = (s: State, p: Person, m: Match) => (m.platser ??= {})[p.id] ??= plats(s, p, m);
// var den som går med ställer sig, aldrig i en vägg. I dragkampen (steg 4.5.6.10) två lag på en rad på var sin sida om
// strecket i mitten: varannan till vänster och varannan till höger, de senare längre ut. De andra sporterna (steg 4.5.6.11)
// har också sina platser; i bollspelet springer de på planen (vandra i ACTS). Gränssnittet ritar resten
function plats(s: State, p: Person, m: Match, nr?: number) {
  const i = nr ?? m.n ?? 0;
  if (nr === undefined) m.n = i + 1;
  const d = SPORT_AV[m.k], u = d && UPP[d.upp].plats(i, d); // sportens uppställning (UPPSTALL)
  if (u) return freeNear(s, m.x + u.x, m.y + u.y);
  return freeNear(s, m.x + (rnd(s, 'sport', p) - 0.5) * 2, m.y + (rnd(s, 'sport', p) - 0.5) * 2);
}
// i dragkampen: vilket lag p drar i (-1 till vänster om strecket, 1 till höger), efter var hen står (gränssnittet ritar repet)
export const dragLag = (m: Match, x: number) => x < m.x ? -1 : 1;
// målet i kast mot mål: en bit framför raden som kastar
export const kastMal = (m: Match) => ({ x: m.x + (SPORT_AV[m.k]?.avst ?? SPORT.kastAvst) / 2, y: m.y });
// medan man spelar (MEDAN i steg.ts): övning när det är spelare nog. Kommer det inte nog, blir det ingen match
export function sportSteg(s: State, p: Person, t: Task, dtSec: number) {
  const m = s.sport;
  if (m && m.start === t.ref && s.now >= m.slut) avgor(s, m, p);
  if (!m || m.start !== t.ref || s.now >= m.slut) { t.until = Math.min(t.until, s.now); return; }
  let d = SPORT_AV[m.k];
  const har = spelare(s, m, true);
  if (!m.igang) {
    // matchen börjar när de som är på väg har kommit fram, senast när väntan är slut (steg 10.7.12)
    const slut = s.now > m.start + SPORT.vanta * MIN;
    if (har.length < d.min || !slut && spelare(s, m, false).some(q => q.task!.phase !== 'do')) {
      if (!slut) return;
      // det kom för få: de som kom spelar en sport som räcker till dem, eller går därifrån
      const annan = SPORTER.find(e => e.min <= har.length && kanSpela(s, e, har.length));
      if (!annan) {
        matchMinne(s, d, m, har, new Map()); s.sport = undefined; count(s, 'sportInstalld'); t.until = s.now;
        const q = byId(s, m.p ?? -1); if (q && alive(q)) ingen(s, q);
        return;
      }
      m.k = annan.id; d = annan;
      for (const q of spelare(s, m, false)) q.task!.tool = annan.id;
    }
    // tiden räknas från att matchen börjar, och mörkret kapar den
    m.igang = true; m.borjar = s.now;
    m.slut = Math.min(s.now + (19 - hourOf(s.now)) * HOUR, s.now + (SPORT.minuter + rnd(s, 'sport', p) * SPORT.spann) * MIN);
    for (const q of [...spelare(s, m, false), ...publiken(s, m, false)]) q.task!.until = m.slut;
    if (d.lag) delaLag(s, m, d, har);
  } else if (spelare(s, m, false).length < d.min) { s.sport = undefined; t.until = s.now; return; } // de andra har gått: matchen är slut
  else if (d.lag && m.lag?.[p.id] === undefined) tillLaget(s, m, d, p); // den som var på väg och kom efter början
  const h = dtSec / HOUR_S;
  if (!m.spelat) for (const k of d.foremal) if (isTool(k) && wearTool(s, p, k, SPORT.slit)) { const tr = SAKER[k]?.trasig; if (tr) { count(s, tr.stat); if (tr.text) log(s, tr.text.replace('{namn}', p.name), 'world', [p.id]); } } // föremålen slits en gång per match
  m.spelat = true;
  // brottningen (steg 9.2.92): två och två med stridens system, utan vapen och med svaga slag. En kamp i taget i ringen
  if (d.kamp && s.now >= (m.brott ?? 0)) { // en kamp börjar så fort ringen är ledig
    const orkar = (q: Person) => q.health > 0 && (q.blod ?? 1) >= HALSA.slass; // den som förlorat mycket blod orkar inte slåss (steg 9.5.17) och brottas inte
    // den heliga dagen (steg 10.3.22): den som följer budet börjar ingen kamp men står kvar i ringen och övar; det räknas en gång per match (fynd 322)
    const bud = budHindrar(s, p, 'ingenStrid');
    if (bud && !m.bud?.includes(p.id)) { (m.bud ??= []).push(p.id); count(s, 'bud_ingenStrid'); }
    const mot = orkar(p) && !bud ? har.filter(q => q !== p && orkar(q)) : [];
    if (mot.length) {
      // kampen sker på kartan och tar tid (steg 10.1.7): ringen är upptagen tills den är slut (EFTER.brottning)
      const q = mot[Math.floor(rnd(s, 'sport', p) * mot.length)];
      kartStridBorja(s, 'brottning', [[p], [q]], 'i brottningen', { typ: 'brottning' });
      m.brott = s.now + (STRID.maxTid + 60) * SEC; m.brottare = [p.id, q.id]; count(s, 'brottningar');
    }
  }
  if (d.egen && wearTool(s, p, d.egen.k, h / d.egen.haller)) { const tr = SAKER[d.egen.k]?.trasig; if (tr) count(s, tr.stat); if (tr?.text) log(s, tr.text.replace('{namn}', p.name), 'world', [p.id]); } // det egna redskapet slits med speltiden (bågen som vid jakt)
  ovning(p, d.skill, SPORT.ovning * h);
  t.prog = (t.prog ?? 0) + h;
  count(s, 'sportTim', h);
}
// efter matchen (KLAR i steg.ts): den som är kvar när tiden är slut avgör den
export function sportKlar(s: State, p: Person, t: Task) {
  const m = s.sport;
  if (m && m.start === t.ref && s.now >= m.slut) avgor(s, m, p);
}
// lagen (steg 10.7.14): när matchen börjar blandas de som är framme och delas varannan till två lag. I dragkampen och
// snöbollskriget går var och en till sin sida, och matchen fortsätter medan de går
function delaLag(s: State, m: Match, d: SportDef, har: Person[]) {
  const bland = har.map(q => ({ q, r: rnd(s, 'sport', q) })).sort((a, b) => a.r - b.r).map(x => x.q);
  m.lag = {};
  bland.forEach((q, i) => sattLag(s, m, d, q, (i % 2) as 0 | 1));
}
// den som kommer efter början går till laget med färre
function tillLaget(s: State, m: Match, d: SportDef, p: Person) {
  const v = Object.values(m.lag ?? {}), en = v.filter(x => x === 1).length;
  sattLag(s, m, d, p, en < v.length - en ? 1 : 0);
}
function sattLag(s: State, m: Match, d: SportDef, q: Person, l: 0 | 1) {
  const nr = Object.values(m.lag ??= {}).filter(x => x === l).length;
  m.lag[q.id] = l;
  if (!UPP[d.upp].lag || !q.task) return; // där uppställningen inte har sidor (bollspelet) finns lagen bara i redogörelsen
  const u = (m.platser ??= {})[q.id] = plats(s, q, m, 2 * nr + l);
  if (Math.hypot(u.x - q.x, u.y - q.y) > 0.3) { q.task.tx = u.x; q.task.ty = u.y; q.task.phase = 'go'; }
}
// vinnaren (steg 10.7.14) bestäms när tiden är slut, en gång, bland dem som är kvar: färdigheten plus slump. I en lagsport
// vinner laget med högst summa och vinsten räknas för alla i laget. Den som vunnit flest matcher i en sport (minst
// SPORT.bastMin) är den bästa i den och får det i sitt eftermäle (steg 4.3.1.2)
function avgor(s: State, m: Match, p: Person) {
  if (m.avgjord || !m.spelat) return;
  m.avgjord = true;
  const d = SPORT_AV[m.k], har = [p, ...spelare(s, m, false).filter(q => q !== p && (q.task!.phase === 'do' || m.lag?.[q.id] !== undefined))];
  const res = new Map<Person, number>();
  for (const q of har) res.set(q, q.skill[d.skill] + rnd(s, 'sport', q) * SPORT.vinnSkill);
  let vinnare: Person[], lag: 0 | 1 | undefined;
  if (d.lag && m.lag) {
    const sum = [0, 0]; for (const q of har) { const l = m.lag[q.id]; if (l !== undefined) sum[l] += res.get(q)!; }
    lag = sum[1]! > sum[0]! ? 1 : 0;
    vinnare = har.filter(q => m.lag![q.id] === lag);
  } else vinnare = har.length ? [har.reduce((a, q) => res.get(q)! > res.get(a)! ? q : a)] : [];
  if (!vinnare.length) return;
  const bast = vinnare.reduce((a, q) => res.get(q)! > res.get(a)! ? q : a);
  matchMinne(s, d, m, har, res, bast, lag, m.pris ? delaUt(s, m, d, bast, har) : undefined);
  festVann(s, vinnare.map(q => q.name)); // festen räknar vinsterna (steg 10.7.19)
  count(s, 'sportVinster');
  for (const q of vinnare) bastI(s, d, q);
  // glad eller ledsen (steg 10.7.15): vinnarna och förlorarna bland dem som var med i slutet
  const namn = d.namn.toLowerCase();
  for (const q of publiken(s, m)) { tanke(q, 'sagMatch', s.now, { namn, v: SPORT.tittaGladje, tid: SPORT.gladjeTim * HOUR }); upplev(s, q, 'fester'); } // publiken (steg 10.7.16)
  for (const q of har) if (vinnare.includes(q)) tanke(q, 'vannMatch', s.now, { namn, v: SPORT.gladje, tid: SPORT.gladjeTim * HOUR }); else tanke(q, 'forloradeMatch', s.now, { namn, v: -SPORT.forlust, tid: SPORT.gladjeTim * HOUR });
}
// publiken (steg 10.7.16): den som har fritid när en match pågår eller väntar på spelare, och inte spelar, kan gå dit och
// titta, utan åldersgräns. Var och en står på sin plats i en ring runt matchen, utanför spelarnas yta, i den ordning de kom,
// och går när matchen är slut eller ställs in. Den som tittar går aldrig med i matchen
const publiken = (s: State, m: Match, framme = true) => s.people.filter(q => alive(q) && q.task?.act === 'titta' && q.task.ref === m.start && (!framme || q.task.phase === 'do'));
const spelar = (m: Match, p: Person) => m.lista?.includes(p.id) || m.p === p.id || !!m.platser?.[p.id];
export function tittaVikt(s: State, p: Person, calm: number) {
  const m = s.sport;
  return m && s.now < m.slut && !spelar(m, p) ? SPORT.titta * calm : 0;
}
export function tittaVal(s: State, p: Person) {
  const m = s.sport;
  if (!m || s.now >= m.slut || spelar(m, p)) return undefined;
  const d = SPORT_AV[m.k], l = m.titta ??= [];
  if (!l.includes(p.id)) l.push(p.id);
  const i = l.indexOf(p.id), r = d.yta + 1, a = i * 2.4 + m.start % 7; // en plats per åskådare, runt om i ringen
  return { why: `Vill se ${d.best}`, spot: freeNear(s, m.x + Math.cos(a) * r, m.y + Math.sin(a) * r), dur: m.slut - s.now, ref: m.start, tool: d.id };
}
// medan man tittar (MEDAN i steg.ts): man går när matchen är slut eller har ställts in
export function tittaSteg(s: State, _p: Person, t: Task) {
  const m = s.sport;
  if (!m || m.start !== t.ref || s.now >= m.slut) t.until = Math.min(t.until, s.now);
  else if (t.tool !== m.k) t.tool = m.k; // det blev en annan sport
}
// ---------- tävlingen (steg 10.7.20) ----------
// ledaren sätter upp ett pris oftare när stödet är svagt: sin minst värda lediga sak (betalning i framtradande.ts)
function prisAv(s: State): Match['pris'] {
  const l = ledareOf(s);
  if (!l || rnd(s, 'sport', l) >= SPORT.tavling * (1 - legitimitet(s).v)) return undefined;
  const t = betalning(s, l);
  return t ? { t: t.id, k: t.k, av: l.id } : undefined;
}
const prisLust = (q: Person, d: SportDef) => 1 + SPORT.prisVikt * q.skill[d.skill] / 20;
const prisNamn = (k: string) => (SAKER[k]?.namn ?? k).toLowerCase();
// vinnaren (i en lagsport den i laget som gjorde bäst ifrån sig) får saken, om den finns kvar hos ledaren och är ledig. Spelarna
// och publiken tycker bättre om ledaren, och vinnaren blir omtalad och får titeln
function delaUt(s: State, m: Match, d: SportDef, bast: Person, har: Person[]): Pris {
  const pr = m.pris!, l = s.people.find(q => q.id === pr.av), t = tingOf(s).find(x => x.id === pr.t);
  const p: Pris = { k: pr.k, sak: prisNamn(pr.k), av: pr.av, avNamn: l?.name ?? 'ledaren' };
  if (!l || !t || t.agare !== l.id || t.halv || t.hos !== undefined || t.krok !== undefined || t.lass !== undefined || t.vid !== undefined || t.bar !== undefined) { count(s, 'tavlingMiste'); return p; }
  t.agare = bast.id; p.fick = bast.id; p.fickNamn = bast.name;
  for (const q of [...har, ...publiken(s, m)]) if (q !== l) { const r = getRel(s, q, l); r.op = clamp(r.op + SPORT.tavlingTack, -100, 100); }
  const gren = d.namn.toLowerCase(), titel = `Vann tävlingen i ${gren}`;
  if (!bast.fame.includes(titel)) { bast.fame.push(titel); personHand(s, bast, 'titel', `${titel}.`); }
  handelse(s, bast, 'tavling', undefined, gren);
  tanke(bast, 'vannTavling', s.now, { sak: p.sak, v: SPORT.gladje, tid: SPORT.gladjeTim * HOUR });
  kronika(s, bast === l ? `${l.name} satte upp ${p.sak} som pris i ${gren} och vann själv.` : `${bast.name} vann tävlingen i ${gren} och fick ${gen(l.name)} ${p.sak}.`, 'fritid');
  count(s, 'tavlingVunnen');
  return p;
}
function bastI(s: State, d: SportDef, bast: Person) {
  const n = (bast.sportVinst ??= {})[d.id] = (bast.sportVinst[d.id] ?? 0) + 1;
  const bast0 = (s.sportBast ??= {})[d.id];
  if (bast0 === bast.id || n < SPORT.bastMin) return;
  const fore = bast0 !== undefined ? s.people.find(q => q.id === bast0) : undefined;
  if (fore && (fore.sportVinst?.[d.id] ?? 0) >= n) return;
  s.sportBast[d.id] = bast.id;
  const titel = `Den bästa i ${d.namn.toLowerCase()}${d.id === 'kast' ? '' : 'en'}`;
  if (!bast.fame.includes(titel)) { bast.fame.push(titel); personHand(s, bast, 'titel', `${titel}.`); }
  const text = fore && alive(fore) ? `${bast.name} har vunnit fler matcher i ${d.namn.toLowerCase()} än ${fore.name} och är nu den bästa i byn.` : `${bast.name} har vunnit ${tal(n)} matcher i ${d.namn.toLowerCase()} och är den bästa i byn.`;
  log(s, text, 'world', [bast.id]); kronika(s, text, 'fritid');
}
