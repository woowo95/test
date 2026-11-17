import { DAY, MIN, Person, State, W } from './typer';
import { balans } from './balans';
import { clamp } from './slump';
import { byId, count, log, stat } from './folk';
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
});
// larmet, brottet och branden sätts av steg.ts, så att den här filen inte drar in dem (och importerna inte går runt)
export const fangelseKrok: { larma(s: State, p: Person): void; brott(s: State, p: Person): void; brinner(s: State, x: number, y: number): boolean } = { larma: () => undefined, brott: () => undefined, brinner: () => false };
const HARDA = new Set([2, 3, 6]); // Slag, Utvisning och Döden i STRAFF_REG (styre.ts)
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
// p sätts i fängelset h (av domen i steg 11.12.3 och fångarna i 11.12.6, och av scenarierna): till = när hen släpps
export function satt(s: State, p: Person, h: Hus, varfor: string, till?: number) {
  p.fange = { hus: h.id, t: s.now, varfor, ...(till !== undefined ? { till } : {}) };
  const i = rutorI(s, h)[p.id % Math.max(1, rutorI(s, h).length)];
  if (i !== undefined) { p.x = i % W + 0.5; p.y = Math.floor(i / W) + 0.5; }
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
// den som sitter inne och de som vill ut (gränssnittet och scenarierna)
export const fangeI = (s: State, x: number, y: number) => { const r = roomAt(s, x, y); return r ? fangar(s).filter(p => p.fange!.hus === r.hus) : []; };
export const fangeNamn = (s: State, id: number) => byId(s, id)?.name;
