// Framträdandena (steg 4.3.2, "Kulturen i fas 4" i designdokumentet): på kvällen när det är mörkt uppträder någon vid elden
// (eller i långhuset när det är kallt eller regnar) för de andra, högst en gång per kväll. Den enklaste formen, ett kväde,
// finns från början, så att även en liten by har framträdanden. Formerna är rader i registret FRAMTRADANDEN. Framträdandet
// ger publiken glädje (mer ju skickligare och mer karismatisk den som uppträder är) och får en kort text som beskriver det.
// Ett framträdande i taget, i s.fram; de senaste står i s.framtradanden.
import { ALDER, ageOf, alive, count, getRel, isSick, living, log, ovning, stat, think } from './folk';
import { avbryt } from './lager';
import { eldPlats } from './karta';
import { INTRYCK } from './rykten';
import { share } from './minne';
import { SAMTALSSLAG } from './samtal';
import { rnd } from './slump';
import { hourOf } from './tid';
import { coldOf, nederbord, temperature } from './vader';
import { Station, isKlar, redskapVid, stationById, stationerOf, vidStation } from './stationer';
import { kvHaller } from './kvalitet';
import { SAKER } from './saker';
import { balans } from './balans';
import { DAY, HOUR, HOUR_S, MIN, Person, Skill, State, Task } from './typer';

export interface FramDef {
  id: string; namn: string;
  text: string; // den korta texten: {namn} är den som uppträder, {hen} hon eller han, och {amne} vad det handlar om
  min?: number; // så här mycket i färdigheten (FRAM_SKILL) behövs
  instrument?: true; // behöver ett instrument (steg 4.3.2.2)
  kval: number; // hur mycket glädje formen ger jämfört med ett kväde
  amne: keyof typeof AMNE; // vad det handlar om
}
// vad ett framträdande handlar om (FramDef.amne): ger texten till {amne}
const AMNE = {
  minne: (s: State, p: Person) => minneAmne(s, p) ?? 'de första som kom till sjön',
  byn: () => 'det byn har klarat och det som väntar',
  kunskap: () => 'skogen, sjön och arbetet',
  handelse: (s: State, p: Person) => minneAmne(s, p) ?? 'när byn kom till sjön',
};
export const FRAMTRADANDEN: FramDef[] = [
  { id: 'kvade', namn: 'Kväde', text: '{namn} kväder vid elden om {amne}, och de andra lyssnar.', kval: 1, amne: 'minne' },
  { id: 'tal', namn: 'Tal', text: '{namn} håller ett tal om {amne}.', min: 2, kval: 0.8, amne: 'byn' },
  { id: 'forelasning', namn: 'Föreläsning', text: '{namn} lär de andra vad {hen} vet om {amne}.', min: 4, kval: 0.6, amne: 'kunskap' },
  { id: 'teater', namn: 'Teater', text: '{namn} spelar upp en berättelse för de andra om {amne}, med röster och rörelser.', min: 6, kval: 1.3, amne: 'handelse' },
  { id: 'sang', namn: 'Sång', text: '{namn} sjunger om {amne} till {inst}.', instrument: true, kval: 1.2, amne: 'minne' },
  { id: 'musik', namn: 'Musik', text: '{namn} spelar på {inst} för de andra.', instrument: true, kval: 1.2, amne: 'minne' },
];
// instrumenten (steg 4.3.2.2): saker (saker.ts) som ligger vid scenen. kval gånger formens, ord = i texten, sang = man kan
// sjunga till det (till flöjten kan man bara spela). Lyran är svårast att göra och ger mest glädje
export interface InstrumentDef { kval: number; ord: string; sang?: true }
export const INSTRUMENT: Record<string, InstrumentDef> = {
  trumma: { kval: 1, ord: 'trumman', sang: true },
  benflojt: { kval: 1, ord: 'benflöjten' },
  lyra: { kval: 1.4, ord: 'lyran', sang: true },
};
export const FRAM_AV: Record<string, FramDef> = Object.fromEntries(FRAMTRADANDEN.map(d => [d.id, d]));
// färdigheten som gör framträdandet bättre och som övas när man uppträder
export const FRAM_SKILL: Skill = 'berattande';

export const FRAM = balans('framtradande', {
  fran: 18, till: 23, // ett framträdande börjar på kvällen mellan dessa timmar, när det är mörkt
  vilja: 0.15, // chansen när en vuxen väljer vad hen gör på kvällen: vilja × (färdigheten + karisma) / 20
  publik: 2, // minst så här många som sitter vid elden (samtalar eller berättar) och lyssnar
  nara: 15, // rutor från elden: de som är närmare än så lyssnar
  med: 0.8, // den som väljer vad hen gör medan ett framträdande pågår lyssnar så här ofta
  sent: 10, // minuter: så här nära slutet går ingen ny dit för att lyssna
  minuter: 30, spann: 30, // ett framträdande varar så här många minuter, plus upp till spann
  gladje: 0.06, gladjeTim: 10, // publikens glädje: gladje × formens kval × kvaliteten, i så här många timmar
  egen: 0.05, // den som uppträder blir så här glad när publiken är minst publik
  op: 3, // publiken tycker så här mycket bättre om den som uppträder, gånger (kvaliteten − 0,5)
  ovning: 0.3, // övning i färdigheten per timme man uppträder
  sparas: 20, // så här många framträdanden sparas i s.framtradanden
  slit: 0.03, // instrumentet slits så här mycket per framträdande (steg 4.3.2.2)
});

// framträdandet som pågår: formen, den som uppträder, när det började (task.ref) och slutar, publiken som varit där och texten
export interface Fram { k: string; p: number; start: number; slut: number; publik: number[]; text: string; inst?: string; scen?: number } // inst = instrumentet, scen = stationen där det sker
export interface FramMinne { t: number; k: string; p: number; namn: string; text: string; n: number; q: number; inst?: string }

// kvällen: tolv timmar bakåt, så att kvällen och natten efter hör till samma dygn
const kvall = (t: number) => Math.floor((t - 12 * HOUR) / DAY);
// kvaliteten: färdigheten och karisman, 0 till 2
export const framKval = (s: State, p: Person) => (p.skill[FRAM_SKILL] + stat(p, 'karisma', s.now)) / 20;
// det den som uppträder minns starkast om en annan, helst en död: "om Åsa, som var generös"
function minneAmne(s: State, p: Person) {
  let bast: { namn: string; ord: string } | undefined, b = 0;
  for (const e of p.intryck ?? []) {
    const q = s.people.find(x => x.id === e.om), dod = !q || !alive(q), v = e.v * (dod ? 2 : 1);
    if (e.om === p.id || v <= b) continue;
    const d = INTRYCK[e.k];
    b = v; bast = { namn: e.namn, ord: d.som ?? d.namn };
  }
  return bast && `${bast.namn}, som ${s.people.some(x => x.id !== p.id && x.name === bast!.namn && alive(x)) ? 'är' : 'var'} ${bast.ord}`;
}
// framträdandet som går att lyssna på
export function framOppen(s: State) {
  const f = s.fram; // det som är slut ligger kvar tills den som uppträdde är klar (upptradaKlar), eller nästa kväll
  return f && s.now < f.slut - FRAM.sent * MIN ? f : undefined;
}
// de som sitter vid elden och lyssnar när ett framträdande börjar
const PUBLIK = new Set<string>(['samtal', 'beratta']);
function publik(s: State, p: Person) {
  const f = eldPlats(s);
  return living(s).filter(q => q !== p && !!q.task && PUBLIK.has(q.task.act) && q.task.phase === 'do' && Math.hypot(q.x - f.x, q.y - f.y) <= FRAM.nara);
}
// scenen (steg 4.3.2.2): en färdig scen, när det inte är kallt eller regnar (då är man vid elden eller inne som förut)
export function scenen(s: State) {
  if (nederbord(s) || coldOf(temperature(s)) > 0) return undefined;
  return stationerOf(s).find(t => t.k === 'scen' && isKlar(t));
}
// instrumenten som ligger vid scenen, det som ger mest glädje först
const instrumentVid = (s: State, sc: Station) => Object.keys(INSTRUMENT).filter(k => redskapVid(s, sc, k).length).sort((a, b) => INSTRUMENT[b].kval - INSTRUMENT[a].kval);
// instrumentet till formen d: sången behöver ett man kan sjunga till
const instrumentFor = (d: FramDef, inst: string[]) => inst.find(k => d.id !== 'sang' || INSTRUMENT[k].sang);
// formerna den som uppträder kan: färdigheten räcker, och ett instrument finns vid scenen när formen behöver ett
const kan = (p: Person, inst: string[]) => FRAMTRADANDEN.filter(d => (d.min ?? 0) <= p.skill[FRAM_SKILL] && (!d.instrument || !!instrumentFor(d, inst)));

// på kvällen (night i val.ts): p uppträder, eller lyssnar på det som pågår. plats ger var man sitter vid elden (spotFor i val.ts)
export function framVal(s: State, p: Person, plats: (q: Person) => { x: number; y: number }): { act: 'upptrada' | 'lyssna'; why: string; dur: number; ref: number; tool: string; spot?: { x: number; y: number } } | undefined {
  const a = ageOf(p, s.now), f = framOppen(s);
  if (f) {
    if (f.p === p.id || a < ALDER.hjalper || rnd(s, 'fram', p) >= FRAM.med) return undefined; // de minsta barnen sover
    const d = FRAM_AV[f.k], vem = s.people.find(q => q.id === f.p);
    return { act: 'lyssna', why: `Lyssnar på ${vem?.name ?? 'någon'}s ${d.namn.toLowerCase()}`, dur: f.slut - s.now, ref: f.start, tool: f.k };
  }
  const h = hourOf(s.now);
  if (a < ALDER.vuxen || h < FRAM.fran || h >= FRAM.till || s.framKvall === kvall(s.now) || isSick(p, s.now)) return undefined;
  if (rnd(s, 'fram', p) >= FRAM.vilja * framKval(s, p)) return undefined;
  const sc = scenen(s), inst = sc ? instrumentVid(s, sc) : [];
  const pub = publik(s, p), former = kan(p, inst);
  if (pub.length < FRAM.publik || !former.length) return undefined;
  const d = former[Math.floor(rnd(s, 'fram', p) * former.length)], i = d.instrument ? instrumentFor(d, inst) : undefined;
  const start = s.now, slut = start + (FRAM.minuter + rnd(s, 'fram', p) * FRAM.spann) * MIN;
  const text = d.text.replace('{namn}', p.name).replace('{hen}', p.sex === 'k' ? 'hon' : 'han').replace('{amne}', AMNE[d.amne](s, p)).replace('{inst}', i ? INSTRUMENT[i].ord : '');
  s.fram = { k: d.id, p: p.id, start, slut, publik: [], text, inst: i, scen: sc?.id };
  s.framKvall = kvall(start);
  count(s, 'framtradanden');
  for (const q of pub) {
    avbryt(s, q);
    const u = plats(q);
    q.task = { act: 'lyssna', phase: 'go', tx: u.x, ty: u.y, until: slut, carry: 0, ref: start, tool: d.id, dark: true, why: `Lyssnar på ${p.name}s ${d.namn.toLowerCase()}` };
  }
  return { act: 'upptrada', why: `${d.namn}: ${text}`, dur: slut - start, ref: start, tool: d.id, spot: sc && vidStation(sc) }; // på scenen när byn har en
}
// medan man uppträder (MEDAN i steg.ts): övning, och de som lyssnar räknas till publiken
export function upptradaSteg(s: State, p: Person, t: Task, dtSec: number) {
  const f = s.fram;
  if (!f || f.start !== t.ref || f.p !== p.id) { t.until = Math.min(t.until, s.now); return; }
  const h = dtSec / HOUR_S;
  ovning(p, FRAM_SKILL, FRAM.ovning * h);
  t.prog = (t.prog ?? 0) + h;
  for (const q of s.people) if (alive(q) && q.task?.act === 'lyssna' && q.task.ref === f.start && q.task.phase === 'do' && !f.publik.includes(q.id)) f.publik.push(q.id);
}
// medan man lyssnar: slutar den som uppträder, går man därifrån
export function lyssnaSteg(s: State, _p: Person, t: Task) {
  const f = s.fram;
  if (!f || f.start !== t.ref) t.until = Math.min(t.until, s.now);
}
// när framträdandet är slut (KLAR i steg.ts): glädjen hos publiken, vad de tycker om den som uppträdde, och texten
export function upptradaKlar(s: State, p: Person, t: Task) {
  const f = s.fram;
  if (!f || f.start !== t.ref || f.p !== p.id) return;
  const d = FRAM_AV[f.k], q = framKval(s, p) * (f.inst ? INSTRUMENT[f.inst].kval : 1), pub = f.publik.map(id => s.people.find(x => x.id === id)).filter((x): x is Person => !!x && alive(x));
  s.fram = undefined;
  if (f.inst) slitInstrument(s, f);
  if (!pub.length) return;
  for (const b of pub) {
    think(b, `Lyssnade på ${p.name}s ${d.namn.toLowerCase()}`, FRAM.gladje * d.kval * q, s.now, FRAM.gladjeTim * HOUR);
    const r = getRel(s, b, p);
    r.op = Math.max(-100, Math.min(100, r.op + FRAM.op * (q - 0.5)));
    if (d.id === 'forelasning') share(s, p, b, getRel(s, p, b), SAMTALSSLAG['berättelse']); // föreläsningen för det hen vet vidare
  }
  if (pub.length >= FRAM.publik) think(p, `Uppträdde för ${pub.length} vid elden`, FRAM.egen, s.now, FRAM.gladjeTim * HOUR);
  count(s, 'framPublik', pub.length);
  log(s, f.text, 'world', [p.id]);
  (s.framtradanden ??= []).push({ t: f.start, k: f.k, p: p.id, namn: p.name, text: f.text, n: pub.length, q: Math.round(q * 100) / 100, inst: f.inst });
  if (s.framtradanden.length > FRAM.sparas) s.framtradanden.splice(0, s.framtradanden.length - FRAM.sparas);
}
// instrumentet slits en gång per framträdande, och går det sönder står det i loggen
function slitInstrument(s: State, f: Fram) {
  const sc = f.scen !== undefined ? stationById(s, f.scen) : undefined, r = sc && redskapVid(s, sc, f.inst!).sort((a, b) => a.c - b.c)[0];
  if (!r) return;
  r.c -= FRAM.slit / kvHaller(r);
  if (r.c > 1e-9) return;
  s.ting = (s.ting ?? []).filter(x => x !== r);
  const tr = SAKER[r.k]?.trasig;
  if (tr) { count(s, tr.stat); if (tr.text) log(s, tr.text, 'world'); }
}
