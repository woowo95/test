// ---------- kassan (steg 14.1.6, Ekonomi och handel: Kassan och affären, i fliken Människan) ----------
// Disken är en station i ett rum med verksamheten. Kunden väljer företaget när det hen får är mer värt för hen än det det
// kostar (kundVal), går till disken och väntar där (koaDisk), flera i kö. Att betjäna är ett arbete (betjanVal, ARBETEN i
// val.ts): poängen växer med dem som väntar och hur länge de väntat. Betjänaren tar emot den första i kön, som betalar med
// silver och varor som i alla byten (byte.ts), och det hen köpte äts vid bordet. Den som väntat för länge går.
import { kunnaFart } from './kunna';
import { HOUR, MIN, W, egen, tvaDelar, visning, type Person, type State, type Task } from './typer';
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
import { foretagOf, type Foretag, foretagare, foretagRum, FORETAG, oppna, startPoang, troAvAgare, VERKSAMHETER } from './foretag';
import { receptKostnad } from './projekt';
import { foretagBord, STATIONER, isKlar, ledigPlats, stationerOf, stationRum, storlekAv, type Station, vidStation } from './stationer';
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
  koDisk: 3, // står så många framme i kön per disk saknar företaget en disk till (steg 15.1.154)
});
// en kund i kön: vad hen vill köpa och när hen ställde sig där
export interface KoRad { p: number; v: string; k: string; n: number; t: number; klar?: number }
// ---------- disken ----------
export const diskarAv = (s: State, f: Foretag): Station[] => { const rum = new Set(foretagRum(s, f)); return rum.size ? stationerOf(s).filter(t => t.k === 'disk' && isKlar(t) && rum.has(stationRum(s, t)!)) : []; };
// företagen med ett rum som saknar en disk (också en som är under arbete räknas), eller en disk till när kön är lång (steg 15.1.154)
const utanDisk = (s: State) => foretagOf(s).filter(f => { const rum = foretagRum(s, f); if (!rum.length) return false; const n = stationerOf(s).filter(t => t.k === 'disk' && rum.includes(stationRum(s, t)!)).length; return !n || framme(s, f).length >= KASSA.koDisk * n; });
foretagBord.diskRum = s => { const f = utanDisk(s)[0]; return f && foretagRum(s, f)[0]; };
// diskens värde för ägarens familj (steg 15.1.24): det företaget tjänar på ett år med disken (startPoang för verksamheterna, utan
// huset som redan finns och utan företaget självt som konkurrent), delat med vad disken kostar. Den som väntar många kunder bygger först
// Vinsten räknas en gång i timmen per företag (som timräkningen i val.ts): den frågas i varje val (gränssnittet i en egen del, typer.ts)
const diskVinst = tvaDelar<{ t: number; v: Map<number, number> }>();
const diskVinstNu = (s: State, f: Foretag) => {
  const t = Math.floor(s.now / HOUR), d = egen(diskVinst);
  let c = diskVinst.sim.get(s);
  if (visning.pa && c?.t !== t) c = diskVinst.bild.get(s);
  if (!c || c.t !== t) d.set(s, c = { t, v: new Map() });
  let v = c.v.get(f.id);
  if (v === undefined) c.v.set(f.id, v = startPoang(s, f.ag, f.verk, 0, f).poang);
  return v;
};
foretagBord.diskEgen = (s, fam) => {
  let v = 0;
  for (const f of utanDisk(s)) if (fam.some(q => q === foretagare(s, f.ag))) v = Math.max(v, diskVinstNu(s, f) / Math.max(1e-9, receptKostnad(STATIONER.disk)));
  return Math.max(0, v);
};
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
// (konkurrens.ts), men aldrig under det varan är värd för ägaren: för mindre säljer hen inte. Varans värde för ägaren räknas i
// silver, delat med vad ett silver är värt för hen (steg 15.1.17)
export const silverVarde = (G: Part) => Math.max(1e-9, grundvarde('silver') * G.varde('silver'));
// priset gäller per vara (steg 15.1.98): nyckeln i f.pris och f.dag är verksamheten och varan
export const varuNyckel = (v: string, k: string) => `${v}:${k}`;
export const prisAv = (s: State, f: Foretag, v: string, k: string, G: Part, n = 1) => { const egen = n * kvAv(s, f, v, k) * (VERKSAMHETER[v].grund?.(k) ?? grundvarde(k) * G.varde(k) / silverVarde(G)); return Math.max(1, Math.ceil(egen - 1e-9), Math.round((egen + n * VERKSAMHETER[v].snitt(k) * FORETAG.del) * (f.pris?.[varuNyckel(v, k)] ?? f.pris?.[v] ?? 1))); };
// det affärens ruta visar (steg 15.1.163): för varje verksamhet om den har öppet (en disk i rummet, rummet passar och det finns
// något att sälja), de första varorna med priset i silver, och hur många som står i kön
export function affarLage(s: State, f: Foretag) {
  const G = saljPart(s, f), disk = diskarAv(s, f).length > 0, opp = oppna(s, f);
  const verk = f.verk.map(v => {
    const varor = G && disk && opp.includes(v) ? iHelaForradet(() => varorAv(s, f, v, G)) : [];
    return { v, oppet: varor.length > 0, varor: varor.slice(0, 4).map(k => ({ k, pris: prisAv(s, f, v, k, G!) })), fler: Math.max(0, varor.length - 4) };
  });
  return { verk, ko: f.ko?.length ?? 0 };
}
// det M betalar: silvret först och det som inte räcker med varor, som i alla byten (betalVaror, steg 15.1.29). Priset är i
// silver: G ska få lika mycket som så många silver är värda för hen (steg 15.1.17)
type Betalvaror = ReturnType<typeof betalVaror>;
function betalar(varor: Betalvaror, G: Part, pris: number) {
  const mal = pris * silverVarde(G), b = betalaAv(varor, G, mal);
  return b.fick >= mal - 1e-9 ? b : undefined;
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
  forsok: (_s: State, _p: Person) => {}, // ett köp vid disken, också ett som inte blir av (steg 15.1.56)
  fel: (_s: State, _p: Person, _k: string) => {}, // ett köp vid disken som inte blev av: gästen minns varan (steg 15.1.56)
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
  const ville = new Map<Foretag, { k: string; far: number }>(); // varan kunden helst ville ha hos varje företag (steg 15.1.98)
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
      if (far <= 0) continue;
      varor ??= betalVaror(M, G, []);
      if (varor.length && far > (ville.get(f)?.far ?? 0)) ville.set(f, { k, far }); // den som inget har att betala med påverkar inte priset (steg 15.1.17); varan hen helst ville ha (steg 15.1.98)
      if (far <= (bast?.net ?? 0)) continue;
      const b = betalar(varor, G, pris);
      if (!b) continue; // kan inte betala
      const net = far - b.kost;
      if (net > (bast?.net ?? 0)) bast = { f, v, k, n, pris, net, disk };
    }
  }
  if (!kan) for (const [f, w] of ville) for (const g of fragat) g(s, p, f, v, f === bast?.f, f === bast?.f ? bast.k : w.k);
  return bast;
}
// den som ville ha något av företagets varor och valde det eller inte (priset följer det, steg 14.1.9), och varan hen ville ha (steg 15.1.98)
export const fragat: ((s: State, p: Person, f: Foretag, v: string, valde: boolean, k: string) => void)[] = [];
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
  const r = f.ko!.splice(i, 1)[0], v = varuNyckel(r.v, r.k); (f.dag ??= {})[v] = { ...f.dag?.[v], gatt: (f.dag?.[v]?.gatt ?? 0) + 1 };
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
// en person vid varje disk (steg 15.1.154): disken har en plats, där den som betjänar står
const betjanare = (s: State, f: Foretag, utom?: Person) => living(s).filter(q => q !== utom && q.task?.act === 'betjana' && q.task.ref === f.id);
const ledigDisk = (s: State, f: Foretag, utom?: Person) => { const upp = betjanare(s, f, utom).map(q => q.task!); return diskarAv(s, f).find(t => { const v = vidStation(t); return !upp.some(u => Math.floor(u.tx) === Math.floor(v.x) && Math.floor(u.ty) === Math.floor(v.y)); }); };
// poängen: kön framme delad med dem som redan betjänar och p, och hur länge den första väntat
export function betjanPoang(s: State, p: Person, f: Foretag) {
  const ko = framme(s, f);
  if (!ko.length) return 0;
  const langst = Math.max(...ko.map(r => s.now - r.t)) / MIN, andra = betjanare(s, f, p).length;
  return betjanar(s, p, f) * (Math.min(1, ko.length / (andra + 1)) * ko.length + langst * KASSA.vanta);
}
export function betjanVal(s: State, p: Person): { f: Foretag; sc: number; spot: { x: number; y: number }; dur: number } | undefined {
  let bast: { f: Foretag; sc: number; disk: Station } | undefined;
  for (const f of s.foretag ?? []) if (f.ko?.length) { const disk = ledigDisk(s, f, p), sc = disk && framme(s, f).length > betjanare(s, f, p).length ? betjanPoang(s, p, f) : 0; if (disk && sc > (bast?.sc ?? 0)) bast = { f, sc, disk }; }
  return bast && { f: bast.f, sc: bast.sc, spot: vidStation(bast.disk), dur: KASSA.min * MIN / kunnaFart(s, p, 'betjana') }; // den skickliga betjänar fortare (steg 15.1.23)
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
  if (p.gast) gastKund.forsok(s, p); // köpet räknas som ett besök vid disken, vare sig det blir av eller inte (steg 15.1.56)
  const fel = () => { for (const g of omdome) g(s, p, f); count(s, 'koUtan'); if (p.gast) gastKund.fel(s, p, r.k); return false; }; // gästen minns varan som inte gick att få (steg 15.1.56)
  if (V.ats && iRackhall(at.x, at.y, () => ownsId(s, f.ag, r.k)) < 1) return fel(); // maten kom aldrig fram
  if (!G || (V.vatska ? !t : !varorAv(s, f, r.v, G).includes(r.k))) return fel(); // slut
  const h = V.hylla ? hyllan(s, f).find(q => q.k === r.k) : undefined, n = h ? Math.min(r.n, h.n) : 1;
  const pris = prisAv(s, f, r.v, r.k, G, n), kv = kvAv(s, f, r.v, r.k), far = n * kv * ((V.grund?.(r.k) ?? grundvarde(r.k) * M.varde(r.k)) + kundNoje(s, p, r.v, r.k)), b = betalar(betalVaror(M, G, []), G, pris);
  if (!b) return fel();
  const betala = () => { if (p.gast) gastKund.betalar(s, f, p, b.betal); else for (const w of b.betal) flytta(s, w, M, G); };
  if (h) {
    if (p.gast) { betala(); gastKund.far(s, f, p, h, n); }
    else { const v = taVaran(s, f, p, h, n); if (v < 1) return fel(); genomfor(s, M, G, [{ k: r.k, n: v, ...h.t ? { t: h.t } : {} }], b.betal, r.v, false, false, undefined, true); } // ett byte som andra (steg 15.1.99): säljaren övar handel och relationen växer
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
  const dk = varuNyckel(r.v, r.k); (f.dag ??= {})[dk] = { ...f.dag?.[dk], salt: (f.dag?.[dk]?.salt ?? 0) + 1 };
  (f.salt ??= {})[r.v] = (f.salt[r.v] ?? 0) + 1; (f.saltVara ??= {})[r.k] = (f.saltVara[r.k] ?? 0) + 1; f.vinst = (f.vinst ?? 0) + betalt - n * kv * (V.grund?.(r.k) ?? grundvarde(r.k) * G.varde(r.k));
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
    if (framme(s, f).length <= betjanare(s, f).length || f.kallad !== undefined && s.now - f.kallad < KASSA.kalla * MIN) continue;
    const disk = ledigDisk(s, f);
    if (!disk) continue;
    let b: Person | undefined, bs = 0;
    for (const q of living(s)) { const n = kanKomma(q) ? betjanar(s, q, f) / (1 + Math.hypot(q.x - disk.x, q.y - disk.y) / 20) : 0; if (n > bs) { bs = n; b = q; } }
    if (b) { f.kallad = s.now; avbryt(s, b); b.task = undefined; }
  }
}
