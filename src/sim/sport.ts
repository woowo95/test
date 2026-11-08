// Sporten (steg 4.3.1, Kultur, sport och konst): barnens lekar blir sport för de vuxna. Några sociala sporter med enkla
// föremål, när byn har ett överskott av mat och ved och folk har fritid. Sporten ger glädje och tränar bara färdigheter
// (brottning och dragkamp närstrid, kast och bollspel träffsäkerhet), aldrig egenskaperna. Den är ingen stor del av spelet.
// En match i taget: den som har fritid börjar en på en plats i byn eller går med i den som väntar på spelare, och den spelas på
// dagen. Sporterna är rader i registret SPORTER; föremålen de kräver är saker i saker.ts som byn måste ha.
import { ALDER, ageOf, alive, count, living, log, ovning, stat, think } from './folk';
import { SAKER, isTool } from './saker';
import { nTools, wearTool } from './agande';
import { kronika } from './historik';
import { foodDays } from './ekonomi';
import { woodDays } from './eld';
import { amountOf, avbryt } from './lager';
import { platsIByn } from './omrade';
import { freeNear } from './byggnad';
import { rnd } from './slump';
import { hourOf } from './tid';
import { snoPaMarken } from './vader';
import { balans } from './balans';
import { notis } from './notiser';
import { tal } from './ord';
import { HOUR, HOUR_S, MIN, Person, Skill, State, Task } from './typer';

export interface SportDef {
  id: string; namn: string;
  text: string; // vad man ser när den spelas
  foremal: string[]; // sakerna byn måste ha (saker.ts)
  skill: Skill; // färdigheten den tränar
  min: number; max: number; // så många spelare som behövs och som får vara med
  nar?: keyof typeof NAR; // spelas bara då (steg 4.3.1.3): sno = när det ligger snö på marken
  best: string; // matchen i bestämd form, i raden om vem som vann (steg 5.4.8.1)
}
// när en sport kan spelas (SportDef.nar)
const NAR = { sno: (s: State) => snoPaMarken(s) > 0 };
export const SPORTER: SportDef[] = [
  { id: 'brottning', namn: 'Brottning', text: 'Två brottas i mitten och försöker trycka undan varandra, och de andra står i en ring runt om och hejar.', foremal: [], skill: 'narstrid', min: 2, max: 6, best: 'brottningen' },
  { id: 'dragkamp', namn: 'Dragkamp', text: 'Två lag drar i var sin ände av ett rep, tills det ena laget dras över strecket.', foremal: ['rep'], skill: 'narstrid', min: 4, max: 10, best: 'dragkampen' },
  { id: 'kast', namn: 'Kast mot mål', text: 'De kastar stenar och pinnar mot målet i tur och ordning, och den som träffar flest vinner.', foremal: ['mal'], skill: 'traff', min: 2, max: 6, best: 'kastandet mot målet' },
  { id: 'snoboll', namn: 'Snöbollskrig', text: 'Två lag kastar snöbollar på varandra bakom vallar av snö, och den som träffas är ute.', foremal: [], skill: 'traff', min: 2, max: 10, nar: 'sno', best: 'snöbollskriget' },
  { id: 'bollspel', namn: 'Bollspel', text: 'Två lag slår bollen med slagträet och springer efter den, som i knattleikr.', foremal: ['boll', 'slagtra'], skill: 'traff', min: 4, max: 10, best: 'bollspelet' },
];
export const SPORT_AV: Record<string, SportDef> = Object.fromEntries(SPORTER.map(d => [d.id, d]));

export const SPORT = balans('sport', {
  vikt: 0.4, // vikten i fritiden (leisure i val.ts) att börja en match, gånger lugnet och (styrka + smidighet) / 20 ...
  med: 12, // ... och gånger så här mycket när en match väntar på spelare
  mat: 1.1, ved: 2, // bara när maten räcker så här många dygn och veden så här många (byn har ett överskott)
  alderTill: 50, // över detta spelar man inte
  minuter: 50, spann: 40, // en match varar så här många minuter, plus upp till spann
  vanta: 30, // minuter: har inte tillräckligt många kommit fram så här länge efter starten, blir det ingen match
  sent: 15, // minuter: så här nära slutet går ingen ny med
  fler: 2, // en sport som behöver upp till så här många fler än de som följer med kan börja: de andra kommer medan man väntar (vanta)
  folj: 0.8, nara: 20, // den som har fritid (FRITID) och är högst nara rutor från matchens plats när den börjar följer med så här ofta, gånger (styrka + smidighet) / 20
  ovning: 0.15, // övning i sportens färdighet per timme man spelar
  gladje: 0.08, gladjeTim: 8, // tanken efter en match (minst gladjeMin timmar spelat): så här glad i så här många timmar
  gladjeMin: 0.25,
  slit: 0.05, // föremålen som är redskap (bollen, slagträet, målet) slits så här mycket per match (steg 4.3.1.2)
  vinnSkill: 10, // den som vinner en match: färdigheten i sporten (0–20) plus en slump upp till så här mycket
  snoVal: 0.5, // när en sport som bara går i snön kan spelas (nar) väljs den så här ofta (steg 4.3.1.3)
  dragMitt: 1, dragAvst: 0.7, // dragkampen: den första i varje lag står så här många rutor från strecket, och var och en efter så här mycket längre ut
  // platserna i de andra sporterna (steg 4.5.6.11), i rutor från mitten: ringen runt brottarna, raden som kastar och målet,
  // lagen bakom snövallarna, den som slår i bollspelet, och avståndet mellan de som står på rad
  ring: 1.8, kastAvst: 5, snoAvst: 2.5, slagAvst: 3, rad: 0.8,
  sparas: 20, // så här många matcher sparas i s.matcher (steg 5.4.8.1)
  bastMin: 5, // den som har vunnit så här många matcher i en sport, och fler än någon annan, är den bästa i den (eftermälet)
});

// matchen som pågår eller väntar på spelare: sporten, platsen, när den började (spelarnas task.ref) och slutar
export interface Match { k: string; x: number; y: number; start: number; slut: number; spelat?: true; avgjord?: true; n?: number } // n: så många som gått med (platsen i laget)

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
  return m && s.now < m.slut - SPORT.sent * MIN && spelare(s, m, false).length < SPORT_AV[m.k].max ? m : undefined;
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
  if (foodDays(s) < SPORT.mat || woodDays(s) < SPORT.ved) return 0;
  return SPORT.vikt * calm * (m ? SPORT.med : 1) * (stat(p, 'styrka', s.now) + stat(p, 'smidighet', s.now)) / 20;
}
// att spela: gå med i matchen som väntar, annars börja en ny med en sport byn kan spela
export function sportVal(s: State, p: Person): { why: string; spot: { x: number; y: number }; dur: number; ref: number; tool: string } | undefined {
  let m = oppen(s);
  const ny = !m;
  if (!m) {
    // den som börjar en match väljer en plats i byn och samlar folk; följer ingen med blir det ingen match
    const at = platsIByn(s, p, 'sport'), folj = foljare(s, p, at), n = vuxna(s);
    const kan = SPORTER.filter(d => d.min <= folj.length + 1 + SPORT.fler && kanSpela(s, d, n));
    const morkt = s.now + (19 - hourOf(s.now)) * HOUR; // sporten spelas på dagen (isLight i tid.ts): matchen slutar när det blir mörkt
    if (!kan.length || !folj.length || morkt - s.now < SPORT.minuter * MIN) return undefined;
    const sno = kan.filter(d => d.nar), val = sno.length && rnd(s, 'sport', p) < SPORT.snoVal ? sno : kan; // i snön blir det oftast snöbollskrig
    const d = val[Math.floor(rnd(s, 'sport', p) * val.length)];
    m = s.sport = { k: d.id, x: at.x, y: at.y, start: s.now, slut: Math.min(morkt, s.now + (SPORT.minuter + rnd(s, 'sport', p) * SPORT.spann) * MIN) };
    count(s, 'sportMatcher');
    for (const q of folj.slice(0, d.max - 1)) {
      const u = plats(s, q, m);
      avbryt(s, q);
      q.task = { act: 'sport', phase: 'go', tx: u.x, ty: u.y, until: m.slut, carry: 0, ref: m.start, tool: d.id, dark: false, why: `Följer med ${p.name} och spelar ${d.namn.toLowerCase()}` };
    }
  }
  const d = SPORT_AV[m.k];
  return { why: ny ? `Vill ha ${d.namn.toLowerCase()} och samlar folk` : `Är med i ${d.best}`, spot: plats(s, p, m), dur: m.slut - s.now, ref: m.start, tool: d.id };
}
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
  if (m.k === 'snoboll') return freeNear(s, m.x + (i % 2 ? 1 : -1) * SPORT.snoAvst, m.y + rad(Math.floor(i / 2))); // två lag, var sin vall
  if (m.k === 'bollspel' && i === 0) return freeNear(s, m.x - SPORT.slagAvst, m.y); // den som slår står i ena änden, de andra ute på planen
  return freeNear(s, m.x + (rnd(s, 'sport', p) - 0.5) * 2, m.y + (rnd(s, 'sport', p) - 0.5) * 2);
}
// i dragkampen: vilket lag p drar i (-1 till vänster om strecket, 1 till höger), efter var hen står (gränssnittet ritar repet)
export const dragLag = (m: Match, x: number) => x < m.x ? -1 : 1;
// målet i kast mot mål: en bit framför raden som kastar
export const kastMal = (m: Match) => ({ x: m.x + SPORT.kastAvst / 2, y: m.y });
// de som följer med den som börjar en match: de vuxna som har fritid (vilar på dagen, samtalar, sitter vid stranden,
// promenerar), de starka och smidiga oftare
const FRITID = new Set<string>(['vila', 'samtal', 'strand', 'promenad']);
const foljare = (s: State, p: Person, at: { x: number; y: number }) => { const mx = at.x, my = at.y; return living(s).filter(q => {
  const t = q.task;
  return q !== p && Math.hypot(q.x - mx, q.y - my) <= SPORT.nara && !!t && FRITID.has(t.act) && t.phase !== 'back' && !t.dark && sportVikt(s, q, 1) > 0
    && rnd(s, 'sport', q) < SPORT.folj * (stat(q, 'styrka', s.now) + stat(q, 'smidighet', s.now)) / 20;
}); };
// medan man spelar (MEDAN i steg.ts): övning när det är spelare nog. Kommer det inte nog, blir det ingen match
export function sportSteg(s: State, p: Person, t: Task, dtSec: number) {
  const m = s.sport;
  if (!m || m.start !== t.ref || s.now >= m.slut) { t.until = Math.min(t.until, s.now); return; }
  let d = SPORT_AV[m.k];
  const har = spelare(s, m, true);
  if (har.length < d.min) {
    if (s.now <= m.start + SPORT.vanta * MIN) return;
    if (m.spelat) { s.sport = undefined; t.until = s.now; return; } // de andra har gått: matchen är slut
    // det kom för få: de som kom spelar en sport som räcker till dem, eller går därifrån
    const annan = SPORTER.find(e => e.min <= har.length && kanSpela(s, e, har.length));
    if (!annan) { matchMinne(s, d, m, har, new Map()); s.sport = undefined; count(s, 'sportInstalld'); t.until = s.now; return; }
    m.k = annan.id; d = annan;
    for (const q of spelare(s, m, false)) q.task!.tool = annan.id;
  }
  const h = dtSec / HOUR_S;
  if (!m.spelat) for (const k of d.foremal) if (isTool(k) && wearTool(s, p, k, SPORT.slit)) { const tr = SAKER[k]?.trasig; if (tr) { count(s, tr.stat); if (tr.text) log(s, tr.text.replace('{namn}', p.name), 'world', [p.id]); } } // föremålen slits en gång per match
  m.spelat = true;
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
  if (!bast.fame.includes(titel)) bast.fame.push(titel);
  const text = fore && alive(fore) ? `${bast.name} har vunnit fler matcher i ${d.namn.toLowerCase()} än ${fore.name} och är nu den bästa i byn.` : `${bast.name} har vunnit ${tal(n)} matcher i ${d.namn.toLowerCase()} och är den bästa i byn.`;
  log(s, text, 'world', [bast.id]); kronika(s, text);
}
