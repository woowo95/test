// ---------- relationen mellan två byar (steg 11.3.4, Flera samhällen: Relationen och läget mellan två byar) ----------
// Relationen är ett helt tal från −100 till 100 åt varje håll: hur byn a ser på byn b. Den sparas bara för par som mött
// varandra (vl.rel, nyckeln "a>b"). Huvudbyns förbindelse med en by bär redan byns syn på huvudbyn (Klan.inst, klaner.ts), så
// det talet är relationen från den byn till huvudbyn. Grundläget räknas ur tron (samma tro drar ihop, en annan tro stöter bort
// efter hur krigisk den egna tron är) och släktbanden (moderbyn och giftermålen, vl.slakt), och talet glöms mot grundläget med
// BYREL.glom per dygn, minst ett steg (raden 'relationerna glöms' i PERIODRADER, rad.ts). Det som ändrar talet är raderna i
// registret BYHANDELSER: den som tar emot handlingen ändrar sin syn på den som gjorde den. En muta går till ledaren själv
// (vl.mutor); hälften av verkan faller bort när ledaren byts (steg 11.3.10).
import { balans } from './balans';
import { Klan, andraInst } from './klaner';
import { clamp } from './slump';
import { Varlden } from './varlden';
import { radNr } from './radtal';

export const BYREL = balans('byrel', {
  glom: 0.03, // så stor del av avståndet till grundläget glöms per dygn (ett år i spelet), minst ett steg
  samTro: 15, // grundläget mellan två byar med samma tro
  annanTro: 20, // ... och med olika tro, gånger hur krigisk den egna tron är (0–1), bort
  slakt: 5, // grundläget för varje släktband (en flytt eller ett giftermål mellan byarna) ...
  slaktTak: 30, // ... högst så mycket
  moderby: 3, // en by och dess moderby har så många släktband från början
  // verkan av handlingarna i BYHANDELSER
  handel: 2, gava: 1, muta: 4, fjask: 2, turne: 5, besked: 3, ovanligt: 6, mottagen: 3, bortvisad: 6,
  lurad: 10, ran: 10, plundring: 20, dodade: 15, skandad: 5, bruten: 25,
});
type Tal = keyof typeof BYREL;
export interface ByHandelse { namn: string; tal: Tal; tecken: 1 | -1; ledare?: true }
// det som ändrar relationen: mottagarens syn på den som gjorde det, BYREL[tal] gånger mängden (gåvan: värdet i tiotal)
export const BYHANDELSER = {
  handel: { namn: 'genomförd handel', tal: 'handel', tecken: 1 },
  gava: { namn: 'gåva', tal: 'gava', tecken: 1 },
  muta: { namn: 'muta', tal: 'muta', tecken: 1, ledare: true },
  fjask: { namn: 'fjäsk', tal: 'fjask', tecken: 1 },
  turne: { namn: 'turné', tal: 'turne', tecken: 1 },
  besked: { namn: 'vänligt besked', tal: 'besked', tecken: 1 },
  ovanligt: { namn: 'ovänligt besked', tal: 'ovanligt', tecken: -1 },
  mottagen: { namn: 'mottagen främling', tal: 'mottagen', tecken: 1 },
  bortvisad: { namn: 'bortvisad främling', tal: 'bortvisad', tecken: -1 },
  lurad: { namn: 'lurad i handeln', tal: 'lurad', tecken: -1 },
  ran: { namn: 'rån', tal: 'ran', tecken: -1 },
  plundring: { namn: 'plundring', tal: 'plundring', tecken: -1 },
  dodade: { namn: 'dödade', tal: 'dodade', tecken: -1 },
  skandad: { namn: 'skändad död', tal: 'skandad', tecken: -1 },
  bruten: { namn: 'bruten överenskommelse', tal: 'bruten', tecken: -1 },
} as const satisfies Record<string, ByHandelse>;
export type ByHandelseId = keyof typeof BYHANDELSER;

const nyckel = (a: number, b: number) => `${a}>${b}`;
const par = (a: number, b: number) => a < b ? `${a}-${b}` : `${b}-${a}`;
const rad = (vl: Varlden, nr: number) => radNr(vl, nr);
// huvudbyns förbindelse med byn a bär a:s syn på huvudbyn
const synMot = (vl: Varlden, a: number, b: number) => b === vl.huvud ? rad(vl, a)?.syn : undefined;

// släktbanden mellan två byar: moderbyn och de flyttar och giftermål som räknats (vl.slakt)
export function slaktband(vl: Varlden, a: number, b: number): number {
  const ra = rad(vl, a), rb = rad(vl, b);
  return (vl.slakt?.[par(a, b)] ?? 0) + (ra?.fran === b || rb?.fran === a ? BYREL.moderby : 0);
}
export function nyttSlaktband(vl: Varlden, a: number, b: number, n = 1) { const k = par(a, b); (vl.slakt ??= {})[k] = (vl.slakt[k] ?? 0) + n; }
// grundläget: hur a ser på b utan något som hänt, ur tron och släktbanden
export function grundlage(vl: Varlden, a: number, b: number): number {
  const ta = rad(vl, a)?.tro, tb = rad(vl, b)?.tro;
  const tro = !ta || !tb ? 0 : ta.namn === tb.namn ? BYREL.samTro : -BYREL.annanTro * ta.krig / 100;
  return clamp(Math.round(tro + Math.min(BYREL.slaktTak, slaktband(vl, a, b) * BYREL.slakt)), -100, 100);
}
// hur a ser på b, undefined om de inte mött varandra
export function relation(vl: Varlden, a: number, b: number): number | undefined {
  return synMot(vl, a, b)?.inst ?? vl.rel?.[nyckel(a, b)];
}
function satt(vl: Varlden, a: number, b: number, v: number) {
  const k = synMot(vl, a, b);
  if (k) k.inst = clamp(Math.round(v), -100, 100); else (vl.rel ??= {})[nyckel(a, b)] = clamp(Math.round(v), -100, 100);
}
// två byar möts: åt de håll som inte har ett tal börjar det i grundläget
export function mots(vl: Varlden, a: number, b: number) {
  if (relation(vl, a, b) === undefined) satt(vl, a, b, grundlage(vl, a, b));
  if (relation(vl, b, a) === undefined) satt(vl, b, a, grundlage(vl, b, a));
}
// byn gor gör något mot byn mot: mot:s syn på gor ändras
// ---------- läget mellan två byar (steg 11.6.22): registret BYLAGEN ----------
// Ett par byar har ett läge åt båda hållen: fred (inget sparat), krig eller lyder under (kungadömena, senare). Läget säger
// vad som gäller mellan dem: om de handlar med varandra och hur mycket de vill plundra varandra (fejden, byhandling.ts).
// Kriget börjar och slutar med raderna krig och fred i BYHANDLINGAR, när poängen går över noll
export interface ByLageDef { namn: string; sym: string; handel: boolean; fejd: number }
export const BYLAGEN = {
  fred: { namn: 'Fred', sym: '🕊️', handel: true, fejd: 0 },
  krig: { namn: 'Krig', sym: '⚔️', handel: false, fejd: 1 }, // i krig vill båda plundra den andra fullt ut
  lyder: { namn: 'Lyder under', sym: '👑', handel: true, fejd: 0 },
} as const satisfies Record<string, ByLageDef>;
export type ByLageId = keyof typeof BYLAGEN;
const lageNyckel = (a: number, b: number) => a < b ? `${a}>${b}` : `${b}>${a}`;
export const byLage = (vl: Varlden, a: number, b: number): ByLageId => vl.lage?.[lageNyckel(a, b)]?.k ?? 'fred';
export const lageSedan = (vl: Varlden, a: number, b: number) => vl.lage?.[lageNyckel(a, b)]?.t;
export function sattLage(vl: Varlden, a: number, b: number, k: ByLageId, t: number) {
  const n = lageNyckel(a, b);
  if (k === 'fred') { if (vl.lage) delete vl.lage[n]; } else (vl.lage ??= {})[n] = { k, t };
}
export function byHandelse(vl: Varlden, id: ByHandelseId, gor: number, mot: number, mangd = 1) {
  const h: ByHandelse = BYHANDELSER[id], d = Math.round(h.tecken * BYREL[h.tal] * mangd);
  mots(vl, gor, mot);
  satt(vl, mot, gor, relation(vl, mot, gor)! + d);
  if (h.ledare) { const k = nyckel(mot, gor); (vl.mutor ??= {})[k] = (vl.mutor[k] ?? 0) + d; }
}
// gåvans verkan på mottagarens syn (steg 11.6.14): värdet (i grundvärde) i tiotal gånger BYREL.gava, i hela tal och lägst 1
export const gavaRel = (varde: number) => Math.max(1, Math.round(BYREL.gava * varde / 10));
// huvudbyn gör något mot byn bakom förbindelsen k (handeln, främlingarna, striderna)
export function klanHandelse(vl: Varlden | undefined, k: Klan, id: ByHandelseId, mangd = 1) {
  if (vl && vl.huvud !== undefined && k.rad !== undefined) byHandelse(vl, id, vl.huvud, k.rad, mangd);
  else { const h: ByHandelse = BYHANDELSER[id]; andraInst(k, h.tecken * BYREL[h.tal] * mangd); }
}
// ledaren i byn nr byts (radperson.ts, steg 11.3.10): hälften av mutornas verkan på byns syn faller bort
export function ledarBytet(vl: Varlden, nr: number) {
  for (const k of Object.keys(vl.mutor ?? {})) {
    const [a, b] = k.split('>').map(Number);
    if (a !== nr) continue;
    const m = vl.mutor![k], bort = Math.trunc(m / 2), v = relation(vl, a, b);
    if (v !== undefined) satt(vl, a, b, v - bort);
    if (m - bort) vl.mutor![k] = m - bort; else delete vl.mutor![k];
  }
}
// en gång om dygnet (ett år i spelet): varje relation glöms mot grundläget, minst ett steg
const glom = (v: number, mal: number) => v === mal ? v : v - Math.sign(v - mal) * Math.min(Math.abs(v - mal), Math.max(1, Math.round(Math.abs(v - mal) * BYREL.glom)));
export function relGlom(vl: Varlden) {
  for (const k of Object.keys(vl.rel ?? {})) {
    const [a, b] = k.split('>').map(Number);
    vl.rel![k] = glom(vl.rel![k], grundlage(vl, a, b));
  }
  if (vl.huvud !== undefined) for (const r of vl.rader ?? []) if (r.syn) r.syn.inst = glom(r.syn.inst, grundlage(vl, r.nr, vl.huvud));
}
