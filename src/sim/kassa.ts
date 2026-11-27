// ---------- kassan (steg 14.1.6, Ekonomi och handel: Kassan och affären, i fliken Människan) ----------
// Disken är en station i ett rum med verksamheten. Kunden väljer företaget när det hen får är mer värt för hen än det det
// kostar (kundVal), går till disken och väntar där (koaDisk), flera i kö. Att betjäna är ett arbete (betjanVal, ARBETEN i
// val.ts): poängen växer med dem som väntar och hur länge de väntat. Betjänaren tar emot den första i kön, som betalar med
// silver och varor som i alla byten (byte.ts), och det hen köpte äts vid bordet. Den som väntat för länge går.
import { MIN, W, type Person, type State, type Task } from './typer';
import { balans } from './balans';
import { ALDER, ageOf, alive, byId, count, familjOf, forstaGang, living, log } from './folk';
import { ACTS } from './handlingar';
import { gastLever } from './gast';
import { kanGa } from './halsa';
import { BYN } from './egendom';
import { blocked, husById } from './byggnad';
import { genomfor, betalVaror, betalaAv, bynPart, personPart, ataPortion } from './behov';
import { flytta, type Part, type Vara } from './byte';
import { avbryt, dropLoad, iHelaForradet, iRackhall, ownsId, use } from './lager';
import { grundvarde } from './varde';
import { SAK_LIST, isTool, viktOf } from './saker';
import { type Ting, tingOf } from './agande';
import { dryckAv } from './vatskor';
import { drickAlkohol } from './rus';
import { foretagOf, type Foretag, foretagare, foretagRum, FORETAG, oppna, troAvAgare, VERKSAMHETER } from './foretag';
import { foretagBord, isKlar, ledigPlats, stationerOf, stationRum, storlekAv, type Station, vidStation } from './stationer';
import { tanke } from './tankar';
import { kvOf, kvVarde } from './kvalitet';

export const KASSA = balans('kassa', {
  min: 0.5, // så lång tid (minuter) tar det att betjäna en kund
  tal: 8, // så länge (minuter) väntar en kund vid disken innan hen går
  ata: 10, // så länge (minuter) sitter kunden vid bordet med det hen köpt
  langd: 40, // längre än så här (rutor) går ingen för en måltid
  vag: 0.005, // vägen kostar så mycket per ruta
  koNet: 0.1, // varje kund som redan väntar gör köpet så mycket mindre värt
  lust: 0.6, // så mycket mer väger måltiden i serveringen än maten där den ligger, per silver kunden vinner
  kalla: 2, // så ofta (minuter) kallas den som kan betjäna till disken
  vanta: 0.2, // poängen för att betjäna växer så mycket per minut någon väntat
  familj: 0.7, // ägarens familj betjänar, mindre gärna än ägaren och de anställda
});
// en kund i kön: vad hen vill köpa och när hen ställde sig där
export interface KoRad { p: number; v: string; k: string; n: number; t: number; klar?: number }
// ---------- disken ----------
export const diskarAv = (s: State, f: Foretag): Station[] => { const rum = new Set(foretagRum(s, f)); return rum.size ? stationerOf(s).filter(t => t.k === 'disk' && isKlar(t) && rum.has(stationRum(s, t)!)) : []; };
// företagen med ett rum som saknar en disk (också en som är under arbete)
const utanDisk = (s: State) => foretagOf(s).filter(f => { const rum = foretagRum(s, f); return rum.length && !stationerOf(s).some(t => t.k === 'disk' && rum.includes(stationRum(s, t)!)); });
foretagBord.diskRum = s => { const f = utanDisk(s)[0]; return f && foretagRum(s, f)[0]; };
foretagBord.diskEgen = (s, fam) => utanDisk(s).some(f => fam.some(q => q === foretagare(s, f.ag))) ? 1 : 0; // ägarens familj saknar disken i sitt företag
foretagBord.diskBrist = s => { const n = foretagOf(s).filter(f => foretagRum(s, f).length).length; return n ? utanDisk(s).length / n : 0; };
// var kunden i kön står: rummets lediga rutor, närmast disken först, inte där betjänaren eller en annan kund står
export function koPlats(s: State, t: Station, upptagna: { x: number; y: number }[] = []): { x: number; y: number } {
  const bak = vidStation(t), bi = Math.floor(bak.y) * W + Math.floor(bak.x), cx = t.x + (t.rot ? 0.5 : 1), cy = t.y + (t.rot ? 1 : 0.5);
  const { w: dw, h: dh } = storlekAv(t), paDisken = (j: number) => j % W >= t.x && j % W < t.x + dw && Math.floor(j / W) >= t.y && Math.floor(j / W) < t.y + dh; // också en vriden disk
  const r = stationRum(s, t), fria = (r?.tiles ?? []).filter(j => j !== bi && !blocked(s, j % W, Math.floor(j / W)) && !paDisken(j));
  fria.sort((a, b) => Math.hypot(a % W + 0.5 - cx, Math.floor(a / W) + 0.5 - cy) - Math.hypot(b % W + 0.5 - cx, Math.floor(b / W) + 0.5 - cy) || a - b);
  const tagna = new Set(upptagna.map(q => Math.floor(q.y) * W + Math.floor(q.x))), j = fria.find(q => !tagna.has(q)) ?? fria[fria.length - 1];
  return j === undefined ? bak : { x: j % W + 0.5, y: Math.floor(j / W) + 0.5 };
}
// ---------- den som säljer ----------
// ägaren som part i bytet: personen eller byn som i alla byten, och kyrkan med det den äger
export function saljPart(s: State, f: Foretag): Part | undefined {
  const h = husById(s, f.hus), x = h ? h.x + h.w / 2 : 0, y = h ? h.y + h.h / 2 : 0, p = foretagare(s, f.ag);
  if (f.ag > 0) return p && personPart(s, p);
  if (f.ag === BYN) return bynPart(s, x, y);
  if (!troAvAgare(s, f.ag)) return undefined;
  return { id: f.ag, namn: 'Kyrkan', x, y, handel: p?.skill.handel ?? 0, varde: () => 1,
    over: utom => SAK_LIST.filter(k => !utom.includes(k) && !isTool(k) && grundvarde(k) > 0 && ownsId(s, f.ag, k) >= 1).map(k => ({ k, n: Math.floor(ownsId(s, f.ag, k) + 1e-9) })) };
}
// dryckerna företaget kan sälja: i ett kärl som är ägarens
const karl = (s: State, f: Foretag, k: string): Ting | undefined => tingOf(s).filter(t => t.inne?.v === k && t.inne.n >= 1 && (t.agare ?? BYN) === f.ag && t.hos === undefined && t.bar === undefined).sort((a, b) => kvOf(b.inne) - kvOf(a.inne))[0];
// varans kvalitet i pris och nytta (steg 14.1.9): det som är bättre gjort är mer värt, som i alla byten
const kvAv = (s: State, f: Foretag, v: string, k: string) => { const V = VERKSAMHETER[v]; return V.vatska ? kvVarde(karl(s, f, k)?.inne) : V.hylla ? kvVarde(hyllan(s, f).find(h => h.k === k)?.t) : 1; };
// det företaget har att sälja av verksamheten v
export function varorAv(s: State, f: Foretag, v: string, G = saljPart(s, f)): string[] {
  if (!G) return [];
  const V = VERKSAMHETER[v];
  if (V.hylla) return [...new Set(hyllan(s, f).map(h => h.k))];
  const alla = V.varor(s);
  if (!alla.length) return [];
  if (V.egen) return V.egen.har(s, f);
  if (V.vatska) return alla.filter(k => karl(s, f, k));
  const har = new Set(G.over([]).filter(w => !w.t && w.n >= 1).map(w => w.k));
  return alla.filter(k => har.has(k));
}
// priset på en vara i hela silver: det varan är värd för ägaren och hälften av det en vanlig kund vinner, gånger ägarens pris (steg 14.1.9)
// (konkurrens.ts), men aldrig under det varan är värd för ägaren: för mindre säljer hen inte
export const prisAv = (s: State, f: Foretag, v: string, k: string, G: Part, n = 1) => { const egen = n * kvAv(s, f, v, k) * (VERKSAMHETER[v].grund?.(k) ?? grundvarde(k) * G.varde(k)); return Math.max(1, Math.ceil(egen - 1e-9), Math.round((egen + n * VERKSAMHETER[v].snitt(k) * FORETAG.del) * (f.pris?.[v] ?? 1))); };
// det M betalar: silver, varor eller allt hen har över, det som kostar minst för hen
type Betalvaror = ReturnType<typeof betalVaror>;
function betalar(varor: Betalvaror, G: Part, pris: number) {
  let bast: ReturnType<typeof betalaAv> | undefined;
  for (const del of [varor.filter(w => w.k === 'silver'), varor.filter(w => !w.t && w.k !== 'silver'), varor]) {
    const b = betalaAv(del, G, pris);
    if (b.fick >= pris - 1e-9 && (!bast || b.kost < bast.kost - 1e-9)) bast = b;
  }
  return bast;
}
// ---------- kunden ----------
import { hyllan, type HyllVara, taVaran, vilMangd } from './affar';
import { ryms } from './utrustning';
export interface Erbjudande { n: number; f: Foretag; v: string; k: string; pris: number; net: number; disk: Station }
// gästen som kund (foretagsgast.ts, steg 14.1.11): hen har sitt silver hos sig och bär det hen köper
export const gastKund = {
  part: (_s: State, _p: Person): Part => ({ id: _p.id, namn: _p.name, x: _p.x, y: _p.y, varde: () => 1, over: () => [] }),
  noje: (_s: State, _p: Person, _v: string, _k: string) => 0,
  mangd: (_s: State, _p: Person, _h: HyllVara) => 0,
  betalar: (_s: State, _f: Foretag, _p: Person, _betal: Vara[]) => {},
  far: (_s: State, _f: Foretag, _p: Person, _h: HyllVara, _n: number) => {},
  at: (_s: State, _p: Person, _k: string) => {},
  klar: (_s: State, _p: Person, _v: string, _sitter: boolean) => {},
};
const kundPart = (s: State, p: Person) => p.gast ? gastKund.part(s, p) : personPart(s, p);
const kundNoje = (s: State, p: Person, v: string, k: string) => p.gast ? gastKund.noje(s, p, v, k) : VERKSAMHETER[v].noje(s, p, k);
// vad kunden p tycker om företaget utöver varan (finheten mot förväntan, ryktet: steg 14.1.9 och 14.1.10 lägger till)
export const tycker: ((s: State, p: Person, f: Foretag, v: string) => number)[] = [];
// det bästa p kan köpa av verksamheten v nu, om det är mer värt för hen än det kostar
export const kundVal = (s: State, p: Person, v: string): Erbjudande | undefined => erbjudandet(s, p, v);
// bara = bara det företaget (gästen som kommit dit)
// kan = bara de varorna (kopbuffert.ts)
export function erbjudandet(s: State, p: Person, v: string, bara?: Foretag, kan?: (k: string) => boolean): Erbjudande | undefined {
  if (!s.foretag?.length) return undefined;
  let bast: Erbjudande | undefined, M: Part | undefined;
  const ville: Foretag[] = [];
  for (const f of s.foretag) {
    if (bara && f !== bara || !f.verk.includes(v) || f.ag === p.id || !oppna(s, f).includes(v)) continue;
    const disk = diskarAv(s, f)[0];
    if (!disk) continue;
    const d = Math.hypot(disk.x - p.x, disk.y - p.y);
    if (d > KASSA.langd || familjOf(s, f.ag).includes(p)) continue;
    const G = saljPart(s, f);
    if (!G) continue;
    const om = tycker.reduce((a, g) => a + g(s, p, f, v), 0) - d * KASSA.vag - (f.ko?.length ?? 0) * KASSA.koNet;
    let varor: Betalvaror | undefined;
    for (const k of varorAv(s, f, v, G)) {
      if (kan && !kan(k)) continue;
      M ??= kundPart(s, p);
      const n = VERKSAMHETER[v].hylla ? kopMangd(s, p, f, k) : 1;
      if (n < 1 || VERKSAMHETER[v].egen && kundNoje(s, p, v, k) <= 0) continue; // den som inte har någon nytta av tjänsten
      const kv = kvAv(s, f, v, k), far = n * kv * ((VERKSAMHETER[v].grund?.(k) ?? grundvarde(k) * M.varde(k)) + kundNoje(s, p, v, k)) + om, pris = prisAv(s, f, v, k, G, n);
      if (far > 0 && !ville.includes(f)) ville.push(f);
      if (far <= (bast?.net ?? 0)) continue;
      varor ??= betalVaror(M, G, []);
      const b = betalar(varor, G, pris);
      if (!b) continue; // kan inte betala
      const net = far - b.kost;
      if (net > (bast?.net ?? 0)) bast = { f, v, k, n, pris, net, disk };
    }
  }
  if (!kan) for (const f of ville) for (const g of fragat) g(s, p, f, v, f === bast?.f);
  return bast;
}
// den som ville ha något av företagets varor och valde det eller inte (priset följer det, steg 14.1.9)
export const fragat: ((s: State, p: Person, f: Foretag, v: string, valde: boolean) => void)[] = [];
// så många av k kunden köper från varubordet: det hen saknar, finns där och kan bära
function kopMangd(s: State, p: Person, f: Foretag, k: string) {
  const h = hyllan(s, f).find(q => q.k === k), r = ryms(s, p);
  if (!h) return 0;
  if (p.gast) return gastKund.mangd(s, p, h);
  const max = Math.min(h.n, vilMangd(s, p, k));
  if (h.t) return max;
  let n = 0;
  while (n < max && r({ [k]: (n + 1) * viktOf(k) })) n++;
  return n;
}
// kunden ställer sig i kön: platsen, tiden och varför
export function stallIKo(s: State, p: Person, e: Erbjudande) {
  rensaKo(s, e.f);
  const ko = e.f.ko ??= [], i = ko.findIndex(q => q.p === p.id);
  if (i >= 0) ko.splice(i, 1);
  ko.push({ p: p.id, v: e.v, k: e.k, n: e.n, t: s.now });
  return { spot: koPlats(s, e.disk, ko.flatMap(r => { const q = r.p !== p.id && byId(s, r.p), tk = q && q.task; return tk ? [{ x: tk.tx, y: tk.ty }] : []; })), dur: KASSA.tal * MIN, ref: e.f.id, why: `Går till ${e.f.namn}` };
}
const iKo = (p: Person | undefined, f: Foretag, now: number, r: KoRad) => !!p && (alive(p) || gastLever(p)) && (r.t === now || p.task?.act === 'koaDisk' && p.task.ref === f.id);
function rensaKo(s: State, f: Foretag) { if (f.ko?.length) f.ko = f.ko.filter(r => iKo(byId(s, r.p), f, s.now, r)); }
const framme = (s: State, f: Foretag) => (f.ko ?? []).filter(r => byId(s, r.p)?.task?.phase === 'do');
// den som väntat för länge går (KLAR i steg.ts)
export function koaKlar(s: State, p: Person, t: Task) {
  const f = foretagOf(s).find(q => q.id === t.ref), i = f?.ko?.findIndex(r => r.p === p.id) ?? -1;
  if (!f || i < 0) return;
  const v = f.ko!.splice(i, 1)[0].v; (f.dag ??= {})[v] = { ...f.dag?.[v], gatt: (f.dag?.[v]?.gatt ?? 0) + 1 };
  f.lamnat = (f.lamnat ?? 0) + 1;
  tanke(p, 'vantadeForgaves', s.now); count(s, 'koLamnat');
  for (const g of omdome) g(s, p, f);
}
// det som händer när kunden fått en vara (k) eller gått utan (undefined): omdömet och försäljningen (steg 14.1.9 och 14.1.10)
// besöket: far = det varan var värd för kunden, net = det som är kvar när den är betald, kv = kvaliteten, vantat = minuter i kön
export const omdome: ((s: State, p: Person, f: Foretag, b?: { v: string; far: number; net: number; kv: number; vantat: number }) => void)[] = [];
// ---------- att betjäna ----------
// så gärna p betjänar i företaget f: ägaren och de anställda, och ägarens familj
export const arbetarI: ((s: State, p: Person, f: Foretag) => number)[] = [];
export function betjanar(s: State, p: Person, f: Foretag): number {
  if (p.gast || ageOf(p, s.now) < ALDER.vuxen) return 0;
  if (foretagare(s, f.ag) === p) return 1;
  const a = Math.max(0, ...arbetarI.map(g => g(s, p, f)));
  return a || (f.ag > 0 && familjOf(s, f.ag).includes(p) ? KASSA.familj : 0);
}
// den anställda (steg 14.1.7)
arbetarI.push((_s, p, f) => p.anst?.arb === 'foretag' && p.anst.mal === f.id ? 1 : 0);
const nagonBetjanar = (s: State, f: Foretag, utom?: Person) => living(s).some(q => q !== utom && q.task?.act === 'betjana' && q.task.ref === f.id);
export function betjanPoang(s: State, p: Person, f: Foretag) {
  const ko = framme(s, f);
  if (!ko.length) return 0;
  const langst = Math.max(...ko.map(r => s.now - r.t)) / MIN;
  return betjanar(s, p, f) * (ko.length + langst * KASSA.vanta);
}
export function betjanVal(s: State, p: Person): { f: Foretag; sc: number; spot: { x: number; y: number }; dur: number } | undefined {
  let bast: { f: Foretag; sc: number } | undefined;
  for (const f of s.foretag ?? []) if (f.ko?.length) { const sc = betjanPoang(s, p, f); if (sc > (bast?.sc ?? 0) && !nagonBetjanar(s, f, p)) bast = { f, sc }; }
  const disk = bast && diskarAv(s, bast.f)[0];
  return bast && disk ? { ...bast, spot: vidStation(disk), dur: KASSA.min * MIN } : undefined;
}
// det den som betjänar hämtar till disken (hamtning.ts): maten kunderna framme vid den vill ha, av ägarens
export function betjanHamtas(s: State, t: Task): Record<string, number> | undefined {
  const f = foretagOf(s).find(q => q.id === t.ref), av: Record<string, number> = {};
  if (f) for (const r of framme(s, f)) if (!VERKSAMHETER[r.v].vatska && !VERKSAMHETER[r.v].egen && !VERKSAMHETER[r.v].hylla) av[r.k] = Math.min(Math.floor(ownsId(s, f.ag, r.k) + 1e-9), (av[r.k] ?? 0) + 1);
  for (const k in av) if (av[k] < 1) delete av[k];
  return Object.keys(av).length ? av : undefined;
}
export const betjanFran = (s: State, t: Task) => foretagOf(s).find(q => q.id === t.ref)?.ag;
// en kund är betjänad (KLAR i steg.ts): den första i kön köper
export function betjanaKlar(s: State, q: Person, t: Task) {
  const f = foretagOf(s).find(q => q.id === t.ref);
  if (!f) return;
  rensaKo(s, f);
  if (t.items) dropLoad(s, t, q.x, q.y, undefined, true); // maten ställs fram vid disken
  const r = framme(s, f)[0], p = r && byId(s, r.p);
  if (!p) return;
  f.ko = f.ko!.filter(q => q !== r);
  iHelaForradet(() => kopVid(s, f, p, r, q)); // köpet är ett byte: sakerna byter ägare där de ligger
}
// kunden p betalar och får det hen vill ha. Svarar med sant om köpet blev av
export function kopVid(s: State, f: Foretag, p: Person, r: KoRad, at: Person): boolean {
  const V = VERKSAMHETER[r.v], G = saljPart(s, f), M = kundPart(s, p), t = V.vatska ? karl(s, f, r.k) : undefined;
  p.task = undefined;
  const fel = () => { for (const g of omdome) g(s, p, f); count(s, 'koUtan'); return false; };
  if (V.ats && iRackhall(at.x, at.y, () => ownsId(s, f.ag, r.k)) < 1) return fel(); // maten kom aldrig fram
  if (!G || (V.vatska ? !t : !varorAv(s, f, r.v, G).includes(r.k))) return fel(); // slut
  const h = V.hylla ? hyllan(s, f).find(q => q.k === r.k) : undefined, n = h ? Math.min(r.n, h.n) : 1;
  const pris = prisAv(s, f, r.v, r.k, G, n), kv = kvAv(s, f, r.v, r.k), far = n * kv * ((V.grund?.(r.k) ?? grundvarde(r.k) * M.varde(r.k)) + kundNoje(s, p, r.v, r.k)), b = betalar(betalVaror(M, G, []), G, pris);
  if (!b) return fel();
  const betala = () => { if (p.gast) gastKund.betalar(s, f, p, b.betal); else for (const w of b.betal) flytta(s, w, M, G); };
  if (h) {
    betala();
    if (p.gast) gastKund.far(s, f, p, h, n); else taVaran(s, f, p, h, n);
  } else if (V.egen) {
    betala();
    V.egen.ge(s, f, p, r.k);
  } else if (t) {
    betala();
    t.inne!.n -= 1; if (t.inne!.n <= 0) t.inne = undefined;
    drickAlkohol(s, p, r.k as never, true);
    p.torst = Math.min(1, p.torst + (dryckAv(r.k)?.slacker ?? 0));
  } else if (p.gast) { // gästen äter det vid bordet
    betala();
    iRackhall(at.x, at.y, () => use(s, at, r.k, 1, true, f.ag)); gastKund.at(s, p, r.k);
  } else {
    const fatt: Vara[] = [{ k: r.k, n: 1 }];
    genomfor(s, M, G, fatt, b.betal, r.v);
    if (V.ats) { iRackhall(at.x, at.y, () => use(s, at, r.k, 1, true, p.id)); ataPortion(s, p, r.k); }
  }
  const betalt = b.betal.reduce((a, w) => a + grundvarde(w.k) * w.n, 0);
  (f.dag ??= {})[r.v] = { ...f.dag?.[r.v], salt: (f.dag?.[r.v]?.salt ?? 0) + 1 };
  (f.salt ??= {})[r.v] = (f.salt[r.v] ?? 0) + 1; f.intakt = (f.intakt ?? 0) + betalt; f.vinst = (f.vinst ?? 0) + betalt - n * kv * (V.grund?.(r.k) ?? grundvarde(r.k) * G.varde(r.k));
  count(s, 'foretagSalt'); count(s, 'foretagSalt_' + r.v);
  if (forstaGang(s, 'foretagSalt')) log(s, `${p.name} blev den första kunden: ${f.namn}.`, 'world', [p.id]);
  for (const g of omdome) g(s, p, f, { v: r.v, far, net: far - b.kost, kv, vantat: (s.now - r.t) / MIN });
  // kunden sätter sig vid ett bord i rummet med det hen köpt
  if (p.gast) gastKund.klar(s, p, r.v, !!(V.ats || t));
  else if (V.ats || t) {
    const plats = ledigPlats(s, p) ?? { x: p.x, y: p.y };
    p.task = { act: 'maltid', phase: 'go', tx: plats.x, ty: plats.y, until: s.now + KASSA.ata * MIN, carry: 0, why: `Äter och dricker: ${f.namn}` };
  }
  return true;
}
// ---------- varje halvminut (TAKTER): den som kan betjäna kallas till disken ----------
export const SOVER = new Set<string>(['sova', 'vila', 'badd']);
const kanKomma = (q: Person) => alive(q) && kanGa(q) && !(q.task && (SOVER.has(q.task.act) || q.task.act === 'betjana' || q.task.act === 'koaDisk' || ACTS[q.task.act]?.fortsatter?.length || ACTS[q.task.act]?.vila));
export function kassaTakt(s: State) {
  for (const f of s.foretag ?? []) {
    if (!f.ko?.length) continue;
    rensaKo(s, f);
    if (!framme(s, f).length || nagonBetjanar(s, f) || f.kallad !== undefined && s.now - f.kallad < KASSA.kalla * MIN) continue;
    const disk = diskarAv(s, f)[0];
    if (!disk) continue;
    let b: Person | undefined, bs = 0;
    for (const q of living(s)) { const n = kanKomma(q) ? betjanar(s, q, f) / (1 + Math.hypot(q.x - disk.x, q.y - disk.y) / 20) : 0; if (n > bs) { bs = n; b = q; } }
    if (b) { f.kallad = s.now; avbryt(s, b); b.task = undefined; }
  }
}
