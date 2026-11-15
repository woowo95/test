import { overskott } from './teknik';
// Sporten (steg 4.3.1, Kultur, sport och konst): barnens lekar blir sport för de vuxna. Några sociala sporter med enkla
// föremål, när byn har ett överskott av mat och ved och folk har fritid. Sporten ger glädje och tränar bara färdigheter
// (brottning och dragkamp närstrid, kast och bollspel träffsäkerhet), aldrig egenskaperna. Den är ingen stor del av spelet.
// En match i taget: den som har fritid börjar en på en plats i byn eller går med i den som väntar på spelare, och den spelas på
// dagen. Sporterna är rader i registret SPORTER; föremålen de kräver är saker i saker.ts som byn måste ha.
import { personHand } from './personlogg';
import { ALDER, ageOf, alive, byId, count, getRel, living, log, ovning, stat, think } from './folk';
import { SAKER, isTool } from './saker';
import { nTools, wearTool } from './agande';
import { kronika } from './historik';
import { foodDays } from './ekonomi';
import { woodDays } from './eld';
import { amountOf, avbryt } from './lager';
import { friRuta } from './omrade';
import { bitAt, freeNear, roomAt } from './byggnad';
import { ledig } from './stationer';
import { groundOf } from './mark';
import { FOREST } from './vag';
import { kanGa } from './halsa';
import { ACTS, isWork } from './handlingar';
import { duty } from './seder';
import { raddFor } from './lagar';
import { kartStridAv } from './kartstrid';
import { rnd } from './slump';
import { hourOf } from './tid';
import { snoPaMarken } from './vader';
import { balans } from './balans';
import { notis } from './notiser';
import { tal } from './ord';
import { STRID } from './strid';
import { kartStridBorja } from './kartstrid';
import { EFTER } from './efterstrid';
// kampen i brottningen är slut: ringen är ledig igen (steg 10.1.7)
EFTER.brottning = s => { if (s.sport) s.sport.brott = s.now; };
import { HOUR, HOUR_S, MIN, SEC, Person, Skill, State, Task, W, inMap } from './typer';
import { budHindrar } from './kyrka';

export interface SportDef {
  id: string; namn: string;
  text: string; // vad man ser när den spelas
  foremal: string[]; // sakerna byn måste ha (saker.ts)
  skill: Skill; // färdigheten den tränar
  min: number; max: number; // så många spelare som behövs och som får vara med
  yta: number; // radien av öppen mark i rutor som sporten behöver (steg 10.7.12)
  nar?: keyof typeof NAR; // spelas bara då (steg 4.3.1.3): sno = när det ligger snö på marken
  best: string; // matchen i bestämd form, i raden om vem som vann (steg 5.4.8.1)
  tyst?: 'alla' | 'kampen'; // vem som inte pratar (steg 9.2.100): alla som spelar, eller bara de två som brottas just nu; de andra hejar och pratar
}
// när en sport kan spelas (SportDef.nar)
const NAR = { sno: (s: State) => snoPaMarken(s) > 0 };
export const SPORTER: SportDef[] = [
  { id: 'brottning', namn: 'Brottning', text: 'Två brottas i mitten och försöker trycka undan varandra, och de andra står i en ring runt om och hejar.', foremal: [], skill: 'narstrid', min: 2, max: 6, yta: 2, best: 'brottningen', tyst: 'kampen' },
  { id: 'dragkamp', namn: 'Dragkamp', text: 'Två lag drar i var sin ände av ett rep, tills det ena laget dras över strecket.', foremal: ['rep'], skill: 'narstrid', min: 4, max: 10, yta: 4, best: 'dragkampen', tyst: 'alla' },
  { id: 'kast', namn: 'Kast mot mål', text: 'De kastar stenar och pinnar mot målet i tur och ordning, och den som träffar flest vinner.', foremal: ['mal'], skill: 'traff', min: 2, max: 6, yta: 3, best: 'kastandet mot målet' },
  { id: 'snoboll', namn: 'Snöbollskrig', text: 'Två lag kastar snöbollar på varandra, och den som träffas är ute.', foremal: [], skill: 'traff', min: 2, max: 10, yta: 3, nar: 'sno', best: 'snöbollskriget', tyst: 'alla' },
  { id: 'bollspel', namn: 'Bollspel', text: 'Två lag slår bollen med slagträet och springer efter den, som i knattleikr.', foremal: ['boll', 'slagtra'], skill: 'traff', min: 4, max: 10, yta: 4, best: 'bollspelet', tyst: 'alla' },
];
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
  alderTill: 50, // över detta spelar man inte
  minuter: 50, spann: 40, // en match varar så här många minuter, plus upp till spann
  vanta: 30, // minuter: har inte tillräckligt många kommit fram så här länge efter starten, blir det ingen match
  sent: 15, // minuter: så här nära slutet går ingen ny med
  // samlingen (steg 10.7.12): den som ropar hörs nara rutor. Var och en som hör vill vara med med chansen folj gånger överskottet
  // gånger (styrka + smidighet) / 20, gånger (1 + foljTycke × tycket om den som samlar / 100), och för den som arbetar gånger
  // (1 - foljPlikt × pliktkänslan). Vill ingen blir den som samlade ledsen (ingen i ingenTim timmar)
  folj: 0.8, nara: 20, foljTycke: 0.5, foljPlikt: 0.5, ingen: 0.05, ingenTim: 1,
  utanfor: 10, // platsen ligger i byn eller högst så här många rutor utanför byns område
  ovning: 0.15, // övning i sportens färdighet per timme man spelar
  gladje: 0.08, gladjeTim: 8, // tanken efter en match (minst gladjeMin timmar spelat): så här glad i så här många timmar
  gladjeMin: 0.25,
  slit: 0.05, // föremålen som är redskap (bollen, slagträet, målet) slits så här mycket per match (steg 4.3.1.2)
  vinnSkill: 10, // den som vinner en match: färdigheten i sporten (0–20) plus en slump upp till så här mycket
  snoVal: 0.5, // när en sport som bara går i snön kan spelas (nar) väljs den så här ofta (steg 4.3.1.3)
  dragMitt: 1, dragAvst: 0.7, // dragkampen: den första i varje lag står så här många rutor från strecket, och var och en efter så här mycket längre ut
  // platserna i de andra sporterna (steg 4.5.6.11), i rutor från mitten: ringen runt brottarna, raden som kastar och målet,
  // lagen i snöbollskriget, den som slår i bollspelet, och avståndet mellan de som står på rad
  ring: 1.8, kastAvst: 3, snoAvst: 2.5, slagAvst: 3, rad: 0.8,
  sparas: 20, // så här många matcher sparas i s.matcher (steg 5.4.8.1)
  brottTakt: 4, // brottningen (steg 9.2.92): så många gånger i timmen varje brottare i en ledig ring börjar en kamp med en annan spelare
  bastMin: 5, // den som har vunnit så här många matcher i en sport, och fler än någon annan, är den bästa i den (eftermälet)
});

// matchen som pågår eller väntar på spelare: sporten, platsen, när den började (spelarnas task.ref) och slutar
// p: den som samlade, lista: de som ville vara med vid ropet (raden sport i val.ts för dem dit), platser: var och ens plats,
// igang: alla som var på väg har kommit fram (eller väntan är slut) och matchen har börjat
export interface Match { k: string; x: number; y: number; start: number; slut: number; p?: number; lista?: number[]; platser?: Record<number, { x: number; y: number }>; igang?: true; spelat?: true; avgjord?: true; n?: number; brott?: number; brottare?: number[] } // brott: när kampen i brottningen (steg 9.2.92) är slut // n: så många som gått med (platsen i laget)

// matchens sammanställning (steg 5.4.8.1, Sporten i designdokumentet): sparas när matchen avgörs eller ställs in, inte ur
// loggen. Raden i Händelser och notisen pekar dit med numret (LogEntry.match), och fliken Matchen (ui/flikar/match.ts) visar
// den. spelare: var och en med färdigheten i sportens färdighet (0–20) och resultatet (färdigheten plus slumpen, vinnare()),
// glad: glädjen efter matchen i hundradelar (SPORT.gladje), installd: det kom för få. Lagen och publiken kommer med 10.3.6
export interface MatchSpelare { id: number; namn: string; f: number; v: number }
export interface MatchMinne { nr: number; k: string; t: number; slut: number; spelare: MatchSpelare[]; vinnare?: number; vnamn?: string; glad: number; installd?: true }
function matchMinne(s: State, d: SportDef, m: Match, har: Person[], v: Map<Person, number>, vinn?: Person) {
  const mm: MatchMinne = { nr: s.matchNr = (s.matchNr ?? 0) + 1, k: d.id, t: m.start, slut: s.now, glad: vinn ? Math.round(SPORT.gladje * 100) : 0,
    spelare: har.map(q => ({ id: q.id, namn: q.name, f: Math.round(q.skill[d.skill]), v: Math.round((v.get(q) ?? q.skill[d.skill]) * 10) / 10 })) };
  if (vinn) { mm.vinnare = vinn.id; mm.vnamn = vinn.name; } else mm.installd = true;
  const text = vinn ? `${vinn.name} vann ${d.best}.` : `Det blev ingen ${d.namn.toLowerCase()}: det kom för få.`, ids = har.map(q => q.id);
  log(s, text, 'world', ids).match = mm.nr;
  notis(s, 'match', text, ids, { x: m.x, y: m.y }, { match: mm.nr });
  (s.matcher ??= []).push(mm);
  if (s.matcher.length > SPORT.sparas) s.matcher.splice(0, s.matcher.length - SPORT.sparas);
}
// matchen med numret nr, om den finns kvar
export const matchMinneAv = (s: State, nr: number) => s.matcher?.find(m => m.nr === nr);

// de som spelar i matchen (framme = de som kommit fram)
const spelare = (s: State, m: Match, framme: boolean) => s.people.filter(q => alive(q) && q.task?.act === 'sport' && q.task.ref === m.start && (!framme || q.task.phase === 'do'));
// sporter byn kan spela nu: föremålen finns, och det finns vuxna nog
const kanSpela = (s: State, d: SportDef, vuxna: number) => vuxna >= d.min && (!d.nar || NAR[d.nar](s)) && d.foremal.every(k => isTool(k) ? nTools(s, k) >= 1 : amountOf(s, k) >= 1); // ett slitet redskap är fortfarande ett
// matchen som går att gå med i (den som är slut glöms)
function oppen(s: State) {
  const m = s.sport;
  if (m && s.now >= m.slut) { s.sport = undefined; return undefined; }
  return m && !m.igang && s.now < m.slut - SPORT.sent * MIN && spelare(s, m, false).length < SPORT_AV[m.k].max ? m : undefined;
}
// hur många av föremålet k (ett redskap) byn vill ha: ett, när byn har vuxna nog till en sport som behöver det (VILL i redskap.ts)
export const sportFor = (s: State, k: string) => SPORTER.some(d => d.foremal.includes(k) && vuxna(s) >= d.min) ? 1 : 0;
const vuxna = (s: State) => living(s).filter(q => { const a = ageOf(q, s.now); return a >= ALDER.vuxen && a <= SPORT.alderTill; }).length;

// vikten för sport i fritiden (leisure i val.ts): calm är lugnet där (1 när byn inte behöver arbete)
export function sportVikt(s: State, p: Person, calm: number) {
  const a = ageOf(p, s.now);
  if (a < ALDER.vuxen || a > SPORT.alderTill) return 0;
  const m = oppen(s);
  if (!m && !SPORTER.some(d => kanSpela(s, d, vuxna(s)))) return 0;
  return overskott(foodDays(s), woodDays(s), SPORT.mat, SPORT.ved) * SPORT.vikt * calm * (m ? SPORT.med : 1) * (stat(p, 'styrka', s.now) + stat(p, 'smidighet', s.now)) / 20;
}
// att spela: gå med i matchen som väntar, annars samla folk till en ny (steg 10.7.12)
export function sportVal(s: State, p: Person): { why: string; spot: { x: number; y: number }; dur: number; ref: number; tool: string } | undefined {
  let m = oppen(s);
  const ny = !m;
  if (!m) {
    const morkt = s.now + (19 - hourOf(s.now)) * HOUR; // sporten spelas på dagen (isLight i tid.ts): matchen slutar när det blir mörkt
    if (morkt - s.now < SPORT.minuter * MIN) return undefined;
    // den som samlar ropar, och var och en som hör avgör en gång om hen vill vara med
    const vill = living(s).filter(q => q !== p && horRopet(s, p, q) && rnd(s, 'sport', q) < foljChans(s, p, q)), n = vuxna(s);
    const kan = SPORTER.filter(d => d.min <= vill.length + 1 && kanSpela(s, d, n));
    if (!kan.length) { ingen(s, p); return undefined; }
    const sno = kan.filter(d => d.nar), val = sno.length && rnd(s, 'sport', p) < SPORT.snoVal ? sno : kan; // i snön blir det oftast snöbollskrig
    const d = val[Math.floor(rnd(s, 'sport', p) * val.length)];
    const at = sportPlats(s, p, d);
    if (!at) { count(s, 'sportIngenPlats'); return undefined; }
    m = s.sport = { k: d.id, x: at.x + 0.5, y: at.y + 0.5, start: s.now, slut: Math.min(morkt, s.now + (SPORT.minuter + rnd(s, 'sport', p) * SPORT.spann) * MIN), p: p.id, lista: vill.slice(0, d.max - 1).map(q => q.id) };
    count(s, 'sportMatcher');
    // de som vill avbryter det de gör och väljer igen, där matchen är ett Tillfälle (sportListaVal)
    for (const id of m.lista!) { const q = byId(s, id); if (q?.task) avbryt(s, q); }
  }
  const d = SPORT_AV[m.k];
  return { why: ny ? `Vill ha ${d.namn.toLowerCase()} och samlar folk` : `Är med i ${d.best}`, spot: platsFor(s, p, m), dur: m.slut - s.now, ref: m.start, tool: d.id };
}
// den som ville vara med vid ropet går till matchen (raden sport på nivån Tillfälle i val.ts), tills den har börjat
export function sportListaVal(s: State, p: Person) {
  const m = s.sport;
  if (!m || m.igang || s.now >= m.slut || !m.lista?.includes(p.id)) return undefined;
  const d = SPORT_AV[m.k];
  return { why: `Följer med ${byId(s, m.p ?? -1)?.name ?? 'de andra'} och spelar ${d.namn.toLowerCase()}`, spot: platsFor(s, p, m), dur: m.slut - s.now, ref: m.start, tool: d.id };
}
// hör q ropet från p och kan komma: en vuxen upp till SPORT.alderTill inom hörhåll, vaken, kan gå, strider inte, gör inget som
// inte ens ett larm avbryter, och är inte rädd för att spela
function horRopet(s: State, p: Person, q: Person) {
  const a = ageOf(q, s.now), t = q.task;
  return alive(q) && !q.gast && a >= ALDER.vuxen && a <= SPORT.alderTill && Math.hypot(q.x - p.x, q.y - p.y) <= SPORT.nara && kanGa(q)
    && !(t && (t.act === 'sport' || t.act === 'sova' || t.act === 'badd' || ACTS[t.act]?.fortsatter?.length)) && !kartStridAv(s, q) && !raddFor(s, q, 'sport');
}
// chansen att q vill vara med när p samlar: överskottet, kroppen, tycket om p och, för den som arbetar, pliktkänslan
const foljChans = (s: State, p: Person, q: Person) => SPORT.folj * overskott(foodDays(s), woodDays(s), SPORT.mat, SPORT.ved) * (stat(q, 'styrka', s.now) + stat(q, 'smidighet', s.now)) / 20
  * (1 + SPORT.foljTycke * getRel(s, q, p).op / 100) * (q.task && isWork(q.task.act) ? 1 - SPORT.foljPlikt * duty(s, q) : 1);
// ingen ville vara med: den som samlade blir ledsen
function ingen(s: State, p: Person) { think(p, 'Ingen ville spela', -SPORT.ingen, s.now, SPORT.ingenTim * HOUR); count(s, 'sportIngen'); }
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
  }, { x: p.x, y: p.y });
}
// var och ens plats i matchen, bestämd en gång
export const platsFor = (s: State, p: Person, m: Match) => (m.platser ??= {})[p.id] ??= plats(s, p, m);
// var den som går med ställer sig, aldrig i en vägg. I dragkampen (steg 4.5.6.10) två lag på en rad på var sin sida om
// strecket i mitten: varannan till vänster och varannan till höger, de senare längre ut. De andra sporterna (steg 4.5.6.11)
// har också sina platser; i bollspelet springer de på planen (vandra i ACTS). Gränssnittet ritar resten
function plats(s: State, p: Person, m: Match) {
  const i = m.n ?? 0;
  m.n = i + 1;
  const rad = (j: number) => (j % 2 ? 1 : -1) * Math.ceil(j / 2) * SPORT.rad; // på en rad: mitten, sedan varannan över och under
  if (m.k === 'dragkamp') { const sida = i % 2 ? 1 : -1, nr = Math.floor(i / 2); return freeNear(s, m.x + sida * (SPORT.dragMitt + nr * SPORT.dragAvst), m.y); }
  if (m.k === 'brottning') return i < 2 ? freeNear(s, m.x + (i ? 0.35 : -0.35), m.y) : freeNear(s, m.x + Math.cos(i * 2.4) * SPORT.ring, m.y + Math.sin(i * 2.4) * SPORT.ring); // två i mitten, de andra i en ring
  if (m.k === 'kast') return freeNear(s, m.x - SPORT.kastAvst / 2, m.y + rad(i)); // på en rad, målet en bit bort (kastMal)
  if (m.k === 'snoboll') return freeNear(s, m.x + (i % 2 ? 1 : -1) * SPORT.snoAvst, m.y + rad(Math.floor(i / 2))); // två lag, var sin sida
  if (m.k === 'bollspel' && i === 0) return freeNear(s, m.x - SPORT.slagAvst, m.y); // den som slår står i ena änden, de andra ute på planen
  return freeNear(s, m.x + (rnd(s, 'sport', p) - 0.5) * 2, m.y + (rnd(s, 'sport', p) - 0.5) * 2);
}
// i dragkampen: vilket lag p drar i (-1 till vänster om strecket, 1 till höger), efter var hen står (gränssnittet ritar repet)
export const dragLag = (m: Match, x: number) => x < m.x ? -1 : 1;
// målet i kast mot mål: en bit framför raden som kastar
export const kastMal = (m: Match) => ({ x: m.x + SPORT.kastAvst / 2, y: m.y });
// medan man spelar (MEDAN i steg.ts): övning när det är spelare nog. Kommer det inte nog, blir det ingen match
export function sportSteg(s: State, p: Person, t: Task, dtSec: number) {
  const m = s.sport;
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
    m.igang = true;
  } else if (har.length < d.min) { s.sport = undefined; t.until = s.now; return; } // de andra har gått: matchen är slut
  const h = dtSec / HOUR_S;
  if (!m.spelat) for (const k of d.foremal) if (isTool(k) && wearTool(s, p, k, SPORT.slit)) { const tr = SAKER[k]?.trasig; if (tr) { count(s, tr.stat); if (tr.text) log(s, tr.text.replace('{namn}', p.name), 'world', [p.id]); } } // föremålen slits en gång per match
  m.spelat = true;
  // brottningen (steg 9.2.92): två och två med stridens system, utan vapen och med svaga slag. En kamp i taget i ringen
  if (m.k === 'brottning' && s.now >= (m.brott ?? 0) && rnd(s, 'sport', p) < SPORT.brottTakt * h) {
    const mot = har.filter(q => q !== p && q.health > 0);
    if (mot.length) {
      // kampen sker på kartan och tar tid (steg 10.1.7): ringen är upptagen tills den är slut (EFTER.brottning)
      const q = mot[Math.floor(rnd(s, 'sport', p) * mot.length)];
      if (budHindrar(s, p, 'ingenStrid')) { count(s, 'bud_ingenStrid'); return; } // den heliga dagen (steg 10.3.22)
      kartStridBorja(s, 'brottning', [[p], [q]], 'i brottningen', { typ: 'brottning' });
      m.brott = s.now + (STRID.maxTid + 60) * SEC; m.brottare = [p.id, q.id]; count(s, 'brottningar');
    }
  }
  ovning(p, d.skill, SPORT.ovning * h);
  t.prog = (t.prog ?? 0) + h;
  count(s, 'sportTim', h);
}
// efter matchen (KLAR i steg.ts): glädjen hos den som spelade en stund
export function sportKlar(s: State, p: Person, t: Task) {
  const d = t.tool ? SPORT_AV[t.tool] : undefined;
  const m = s.sport;
  if (d && m && m.start === t.ref && m.spelat && !m.avgjord) { m.avgjord = true; vinnare(s, d, m, [p, ...spelare(s, m, true).filter(q => q !== p)]); }
  if (d && (t.prog ?? 0) >= SPORT.gladjeMin) think(p, `Spelade ${d.namn.toLowerCase()}`, SPORT.gladje, s.now, SPORT.gladjeTim * HOUR);
}
// vem som vann matchen: den som först går därifrån avgör den bland de som spelade. Den som vunnit flest matcher i en sport
// (minst SPORT.bastMin) är den bästa i den och får det i sitt eftermäle (steg 4.3.1.2)
function vinnare(s: State, d: SportDef, m: Match, har: Person[]) {
  let bast: Person | undefined, b = -1;
  const res = new Map<Person, number>();
  for (const q of har) { const v = q.skill[d.skill] + rnd(s, 'sport', q) * SPORT.vinnSkill; res.set(q, v); if (v > b) { b = v; bast = q; } }
  if (!bast) return;
  matchMinne(s, d, m, har, res, bast);
  const n = (bast.sportVinst ??= {})[d.id] = (bast.sportVinst[d.id] ?? 0) + 1;
  count(s, 'sportVinster');
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
