import { DAY, MIN, Person, State, W } from './typer';
import { balans } from './balans';
import { clamp } from './slump';
import { REL, byId, count, log, relKey, stat, think } from './folk';
import { bitsOf, dorrDef, gridOf, housesOf, husById, roomAt, type Hus } from './byggnad';
import { moodOf } from './humor';

// ---------- fängelset (steg 11.12.1, Fångar och fängelset i designdokumentet) ----------
// Ett hus med funktionen Fängelse och en trädörr. Styret vill ha det genom påbudet Fängelse, och byn bygger det som ett projekt
// (BYGGNADER.fangelse i byggnader.ts). Den som sitter där (Person.fange) går inte ut genom dörren, men kan slå sönder den på
// trädörrens 20 minuter (RADER.dorrMin): hen har lämnat redskap och vapen utanför, och bommen hålls av dem som är inne. Då går
// larmet rymning, och den som rymt är fri. För en bybo är rymningen ett brott (HANDELSER.rymning) som döms som andra brott
export const FANG = balans('fangelse', {
  domDygn: 10, // domarna till Slag eller hårdare de senaste så här många dygnen (år i spelet) drar viljan att ha ett fängelse ...
  domVikt: 0.35, // ... så här mycket var
  rang: 0.3, // seden Rang drar så här mycket
  aggression: 0.04, // och ledarens aggression över mitten (10) så här mycket per steg
  bas: 0.5, // viljan börjar så här långt under noll
  galler: 0.33, // påbudet gäller över så här
  akut: 0.6, // byggbehovets vikt när påbudet gäller och byn saknar fängelse, eller det är fullt
  bryt: 0.75, // fången börjar slå sönder dörren när viljan att komma ut går över detta
  modV: 0.04, // viljan att komma ut: modet över mitten (10), per steg ...
  humorV: 0.8, // ... lågt humör (1 − humöret) ...
  dygnV: 0.05, // ... varje dygn som återstår ...
  brandV: 1, // ... och mycket när det brinner nära
  brytMin: 20, // trädörrens tid utan yxa och bom (RADER.dorrMin, Dörrar mot anfallare), i minuter
  // mat och vatten till fången (steg 11.12.2): var och en går när fångens hunger eller törst gånger närheten är minst hjalp
  hjalp: 0.15, // familj och partner (närhet 1) går tidigt ...
  van: 0.5, // ... en vän (närhet så här) senare ...
  framling: 0.2, // ... och en främling först när nöden är stor
  // straffet Fängelse (steg 11.12.3): domen är 1 till 5 hela dygn (år i spelet) efter brottets vikt
  domPerVikt: 5, // dygn per vikt (dråp 1 ger fem dygn, en stöld 0,5 tre)
  dom: 0.75, // i en dom utan lag blir det fängelse från så här mycket (händelsens vikt gånger hårdheten), mellan slag och utvisning
});
// larmet, brottet och branden sätts av steg.ts, så att den här filen inte drar in dem (och importerna inte går runt)
export const fangelseKrok: { larma(s: State, p: Person): void; brott(s: State, p: Person): void; brinner(s: State, x: number, y: number): boolean; matStack(s: State, p: Person): { x: number; y: number } | undefined; taMat(s: State, p: Person): string | undefined; ata(s: State, q: Person, k: string): void } = { larma: () => undefined, brott: () => undefined, brinner: () => false, matStack: () => undefined, taMat: () => undefined, ata: () => undefined };
const HARDA = new Set([2, 3, 6, 9]); // Slag, Utvisning, Döden och Fängelse i STRAFF_REG (styre.ts)
export const hardaDomar = (s: State) => (s.styre?.ratt ?? []).filter(r => s.now - r.t < FANG.domDygn * DAY && HARDA.has(r.steg)).length;
// hur mycket ledaren l vill ha ett fängelse (påbudet Fängelse i styre.ts), −1 till 1
export const fangelseAsikt = (s: State, l: Person) => clamp(hardaDomar(s) * FANG.domVikt + (s.seder.v.rang ?? 0) * FANG.rang + (stat(l, 'aggression', s.now) - 10) * FANG.aggression - FANG.bas, -1, 1);
// påbudet gäller (sätts av styre.ts, så att filerna inte importerar varandra)
export const fangelsePabud = { galler: (_s: State) => false };
export const fangelseHus = (s: State) => housesOf(s).filter(h => h.fn === 'fangelse');
// dörröppningen i fängelset
export const fangelseDorr = (s: State, h: Hus) => bitsOf(s).find(b => b.hus === h.id && b.k === 'oppning');
// fängelset räknas som byggt när huset är klart och en dörr som stängs hänger i öppningen
export const fangelseKlart = (s: State, h: Hus) => !!h.klar && !!dorrDef(fangelseDorr(s, h)?.dorr)?.stanger;
export const fangar = (s: State, h?: Hus) => s.people.filter(p => p.fange && (!h || p.fange.hus === h.id));
// rutorna inne i fängelset
const rutorI = (s: State, h: Hus) => gridOf(s).rooms.filter(r => r.hus === h.id).flatMap(r => r.tiles);
// platserna: så många som sitter där nu och en till (ett tomt fängelse har en plats), så att det byggs ut när det är fullt
export const fangelsePlatser = (s: State) => Math.max(1, fangar(s).length + 1);
// byggbehovet (BYGGNADER.fangelse): när påbudet gäller och byn saknar ett fängelse, eller det som finns är fullt
export function fangelseAkut(s: State) {
  if (!fangelsePabud.galler(s)) return { v: 0, plats: 0 };
  const hs = fangelseHus(s), fullt = hs.length > 0 && hs.every(h => rutorI(s, h).length > 0 && fangar(s, h).length >= rutorI(s, h).length);
  return !hs.length || fullt ? { v: FANG.akut, plats: fangelsePlatser(s) } : { v: 0, plats: 0 };
}
// ett byggt fängelse med ledig plats (straffet Fängelse kräver det, steg 11.12.3)
export const fangelseLedigt = (s: State) => fangelseHus(s).find(h => fangelseKlart(s, h) && fangar(s, h).length < rutorI(s, h).length);
// domens längd i hela dygn för ett brott med vikten v
export const fangelseDygn = (v: number) => clamp(Math.round(v * FANG.domPerVikt), 1, 5);
// p sätts i fängelset h (av domen i steg 11.12.3 och fångarna i 11.12.6, och av scenarierna): till = när hen släpps. Den dömde
// går dit själv (ga), annars hamnar p inne direkt
export function satt(s: State, p: Person, h: Hus, varfor: string, till?: number, ga = false) {
  p.fange = { hus: h.id, t: s.now, varfor, ...(till !== undefined ? { till } : {}) };
  const i = rutorI(s, h)[p.id % Math.max(1, rutorI(s, h).length)];
  if (i !== undefined && !ga) { p.x = i % W + 0.5; p.y = Math.floor(i / W) + 0.5; }
  p.task = undefined; count(s, 'fangelse_in');
}
// viljan att komma ut: modet, lågt humör, dygnen som återstår och mycket vid brand
export function utVilja(s: State, p: Person) {
  const f = p.fange!, kvar = f.till !== undefined ? Math.max(0, f.till - s.now) / DAY : 1;
  return (stat(p, 'mod', s.now) - 10) * FANG.modV + (1 - moodOf(p, s.now)) * FANG.humorV + kvar * FANG.dygnV + (fangelseKrok.brinner(s, p.x, p.y) ? FANG.brandV : 0);
}
// fångens val (chooseTask i val.ts frågar först): sitta kvar inne, eller slå sönder dörren när viljan går över FANG.bryt.
// Saknas fängelset eller dörren, eller har tiden gått, är hen fri och väljer som vanligt (false)
export function fangeVal(s: State, p: Person): boolean {
  const f = p.fange;
  if (!f) return false;
  const h = husById(s, f.hus), dorr = h && fangelseDorr(s, h);
  if (!h || !dorr || !dorrDef(dorr.dorr)?.stanger) { p.fange = undefined; count(s, 'fangelse_ut_oppet'); return false; }
  if (f.till !== undefined && s.now >= f.till) { p.fange = undefined; count(s, 'fangelse_slappt'); log(s, `${p.name} släpptes ur fängelset.`, 'world', [p.id]); return false; }
  const rutor = rutorI(s, h);
  if (!rutor.length) { p.fange = undefined; return false; }
  if (utVilja(s, p) >= FANG.bryt) {
    // på rutan inne vid dörren
    const inne = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (dorr.y + dy) * W + dorr.x + dx).find(i => rutor.includes(i)) ?? rutor[0];
    p.task = { act: 'rymma', phase: 'go', tx: inne % W + 0.5, ty: Math.floor(inne / W) + 0.5, until: s.now + FANG.brytMin * MIN, arbTid: FANG.brytMin * MIN, carry: 0, why: 'Vill ut ur fängelset', dark: false, ref: dorr.id };
    count(s, 'fangelse_bryter');
    return true;
  }
  const i = rutor[p.id % rutor.length];
  p.task = { act: 'fangen', phase: 'go', tx: i % W + 0.5, ty: Math.floor(i / W) + 0.5, until: s.now + 30 * MIN, carry: 0, why: f.varfor, dark: false };
  return true;
}
// dörren är sönder (KLAR i steg.ts): hen är fri, larmet rymning går, och för en bybo är rymningen ett brott
export function brytKlar(s: State, p: Person, ref?: number) {
  const b = bitsOf(s).find(q => q.id === ref);
  if (!b || !p.fange) return;
  b.dorr = undefined; count(s, 'dorr_sonder'); count(s, 'rymning');
  const h = husById(s, p.fange.hus);
  p.fange = undefined;
  log(s, `${p.name} slog sönder dörren och rymde ur ${h ? h.namn.toLowerCase() : 'fängelset'}.`, 'world', [p.id]);
  fangelseKrok.larma(s, p);
  if (!p.gast) fangelseKrok.brott(s, p);
}
// ---------- mat och vatten till fången (steg 11.12.2) ----------
// hur nära p står fången q: familj och partner 1, en vän FANG.van, annars FANG.framling
export function fangNarhet(s: State, p: Person, q: Person) {
  if (p.partner === q.id || q.partner === p.id || p.mother === q.id || p.father === q.id || q.mother === p.id || q.father === p.id) return 1;
  if (p.mother !== undefined && (p.mother === q.mother || p.father === q.father)) return 1; // syskon
  const op = s.rels[relKey(p.id, q.id)]?.op ?? 0;
  return op > REL.van ? FANG.van : FANG.framling;
}
// p går när fångens nöd (hunger eller törst, 0–1) gånger närheten är stor nog
export const hjalperFange = (s: State, p: Person, q: Person, nod: number) => nod * fangNarhet(s, p, q) >= FANG.hjalp;
// maten till fången (ARBETEN i val.ts): den hungrigaste fången som p går till och som ingen annan bär mat till, och det
// närmaste i förrådet där det finns mat
export function matTillFange(s: State, p: Person): { spot: { x: number; y: number }; ref: number; why: string } | undefined {
  if (p.fange) return undefined;
  let best: Person | undefined, bn = 0;
  for (const q of fangar(s)) {
    const nod = 1 - q.hunger;
    if (q === p || nod <= bn || !hjalperFange(s, p, q, nod) || s.people.some(o => o !== p && o.task?.act === 'barmat' && o.task.ref === q.id)) continue;
    best = q; bn = nod;
  }
  if (!best) return undefined;
  const spot = matStack(s, p);
  return spot ? { spot, ref: best.id, why: `Hämtar mat åt ${best.name}, som sitter i fängelset` } : undefined;
}
// det närmaste i förrådet där det ligger mat (fangelseKrok.matStack sätts av steg.ts)
const matStack = (s: State, p: Person) => fangelseKrok.matStack(s, p);
// maten är tagen (KLAR i steg.ts): en hel portion av det som finns, och den bärs till fången
export function matTagen(s: State, p: Person, t: import('./typer').Task) {
  const q = byId(s, t.ref), k = q ? fangelseKrok.taMat(s, p) : undefined;
  if (!q || !k) { t.until = s.now; return; }
  t.tool = k; t.phase = 'back'; t.tx = q.x; t.ty = q.y; t.why = `Bär mat till ${q.name}`;
}
// framme hos fången (LAMNA i steg.ts): hen äter portionen
export function matFram(s: State, p: Person, t: import('./typer').Task) {
  const q = byId(s, t.ref);
  if (q && t.tool && Math.hypot(q.x - p.x, q.y - p.y) <= 2) { fangelseKrok.ata(s, q, t.tool); think(q, `${p.name} bar mat till mig`, 0.1, s.now, 12 * 3600 * 1000); count(s, 'bar mat till fangen'); }
  p.task = undefined;
}
// den som sitter inne och de som vill ut (gränssnittet och scenarierna)
export const fangeI = (s: State, x: number, y: number) => { const r = roomAt(s, x, y); return r ? fangar(s).filter(p => p.fange!.hus === r.hus) : []; };
export const fangeNamn = (s: State, id: number) => byId(s, id)?.name;
