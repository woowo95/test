// ---------- affären (steg 14.1.8, Ekonomi och handel: Kassan och affären, i fliken Människan) ----------
// Affären säljer det som ligger på varubordet i sitt rum: det ägaren har över bärs dit av ägaren eller en anställd, det som flest
// i byn saknar först. Varubordets rutor hör till förrådet (lager.ts), men det som ligger där är ägarens och bärs inte därifrån av
// andra. Kunden betalar vid disken (kassa.ts) och får saken: ett ting byter ägare, och en hög bärs hem till förrådet som kundens.
import { W, type Person, type State, type Task } from './typer';
import { balans } from './balans';
import { count, familjOf, living } from './folk';
import { brukAv, MAT, ownFor, saknarNu } from './behov';
import { VED } from './eld';
import { FORETAG, foretagare, foretagOf, foretagRum, type Foretag } from './foretag';
import { arAgd, taUrStack, lying, rymdPa, stacksOf, changed, tidy, dropSpot, besokLager, stallPaRutan, iHelaForradet } from './lager';
import { betjanar, diskarAv, prisAv, saljPart } from './kassa';
import { foretagBord, isKlar, type Station, stationDef, stationerOf, stationRum } from './stationer';
import { grundvarde } from './varde';
import { isTool, viktOf } from './saker';
import { ryms } from './utrustning';
import { tingOf, type Ting } from './agande';
import type { Part } from './byte';

export const AFFAR = balans('affar', {
  min: 1, // så lång tid (minuter) tar det att ta det som ska ställas fram
  buffert: 0.3, // den som saknar mat eller ved till sitt eget förråd räknas så mycket mot den som saknar det nu
  vikt: 0.5, // så mycket väger att ställa fram, per det de som saknar saken skulle betala
});
const varubord = (s: State, f: Foretag): Station[] => { const rum = foretagRum(s, f); return rum.length ? stationerOf(s).filter(t => stationDef(t.k)?.vara && isKlar(t) && rum.includes(stationRum(s, t)!)) : []; };
const rutor = (s: State, f: Foretag) => varubord(s, f).flatMap(t => { const ut = []; const w = t.rot ? 1 : 2, h = t.rot ? 2 : 1; for (let y = t.y; y < t.y + h; y++) for (let x = t.x; x < t.x + w; x++) ut.push({ x, y }); return ut; });
// bristen: rummen utan varubord, och de där alla är fulla
const affarer = (s: State) => foretagOf(s).filter(f => f.verk.includes('affar') && foretagRum(s, f).length);
// ett varubord till är bara värt något när det som står framme säljs, alltså när affären har en disk att sälja vid, och när
// ägaren har mer att ställa fram än borden rymmer
const vill = (s: State, f: Foretag) => { const rum = foretagRum(s, f), n = stationerOf(s).filter(t => stationDef(t.k)?.vara && rum.includes(stationRum(s, t)!)).length; return !n || diskarAv(s, f).length > 0 && !ledigRuta(s, f) && !!attStalla(s, f, true); }; // inget tak (steg 15.1.155): borden följer det ägaren har att sälja, och rummet sätter gränsen när inget bord får plats
foretagBord.varuRum = s => { const f = affarer(s).find(q => vill(s, q)); return f && foretagRum(s, f)[0]; };
foretagBord.varuEgen = (s, fam) => affarer(s).some(f => vill(s, f) && fam.some(q => q === foretagare(s, f.ag))) ? 1 : 0; // ägarens familj saknar varubordet i sin affär
foretagBord.varuBrist = s => { const a = affarer(s); return a.length ? a.filter(f => vill(s, f)).length / a.length : 0; };
// ---------- det som är till salu ----------
export interface HyllVara { k: string; n: number; x: number; y: number; t?: Ting; tillbaka?: true /* bärs från varubordet till förrådet (steg 15.1.99) */ }
export function hyllan(s: State, f: Foretag): HyllVara[] {
  const ut: HyllVara[] = [], r = new Set(rutor(s, f).map(q => q.y * W + q.x));
  if (!r.size) return ut;
  for (const a of stacksOf(s)) if (r.has(a.y * W + a.x)) { const n = Math.floor(arAgd(a, f.ag) + 1e-9); if (n >= 1) ut.push({ k: a.k, n, x: a.x, y: a.y }); }
  for (const t of lying(s)) if (t.agare === f.ag && r.has(t.y! * W + t.x!)) ut.push({ k: t.k, n: 1, x: t.x!, y: t.y!, t });
  return ut;
}
// så många av k som p skulle köpa: det hen saknar till sitt arbete och sina behov
export function vilMangd(s: State, p: Person, k: string): number {
  const r = brukAv(k);
  if (k === 'silver') return 0;
  if (r.behov) { const b = r.behov(); return Math.ceil(Math.max(r.saknar(s, p, b.id), r.behall(s, p, k) - ownFor(s, p, b)) / (b.per?.[k] ?? 1) - 1e-9); } // upp till det hen vill ha kvar (maten till den egna gränsen, steg 14.1.15)
  return Math.ceil(r.saknar(s, p, k) - 1e-9);
}
// ---------- att ställa fram ----------
const ledigRuta = (s: State, f: Foretag) => { const upp = new Set(stacksOf(s).filter(a => a.n > 1e-6).map(a => a.y * W + a.x)); for (const t of tingOf(s)) if (t.x !== undefined && t.hos === undefined) upp.add(t.y! * W + t.x); for (const q of living(s)) if (q.task?.act === 'stallaFram') upp.add(Math.floor(q.task.ty) * W + Math.floor(q.task.tx)); return rutor(s, f).find(q => !upp.has(q.y * W + q.x)); };
// hur gärna byborna vill ha slaget: de som saknar det gånger värdet
export function efterfragat(s: State, ag: number): Map<string, number> {
  const m = new Map<string, number>();
  const fam = ag > 0 ? familjOf(s, ag) : [];
  for (const p of living(s)) if (!p.gast && p.id !== ag && !fam.includes(p)) for (const k of saknarNu(s, p)) if (BEHOVEN.includes(k) || vilMangd(s, p, k) > 0) m.set(k, (m.get(k) ?? 0) + 1);
  // maten och veden vill man också ha upp till det man själv vill ha kvar (steg 14.1.15)
  for (const p of living(s)) if (!p.gast && p.id !== ag && !fam.includes(p)) for (const b of [MAT, VED]) if (brukAv(b.id).behall(s, p, b.id) - ownFor(s, p, b) >= 1) m.set(b.id, (m.get(b.id) ?? 0) + AFFAR.buffert);
  return m;
}
const BEHOVEN: string[] = [MAT.id, VED.id]; // deras nyckel är behovets
const lust = (m: Map<string, number>, k: string) => (m.get(k) ?? (MAT.slag.includes(k) ? m.get(MAT.id) : VED.slag.includes(k) ? m.get(VED.id) : undefined) ?? 0) * grundvarde(k);
// hur mycket n av varan k väntas ge på varubordet (steg 15.1.99): kunderna per dygn, det som sålts av den och de som saknar
// den, upp till n, gånger det ägaren får över det varan är värd för hen
export function hyllVarde(s: State, f: Foretag, G: Part, m: Map<string, number>, k: string, n: number, framme = 0) {
  const gv = grundvarde(k), kunder = Math.max(0, (f.saltVara?.[k] ?? 0) * FORETAG.minne + (gv > 0 ? lust(m, k) / gv : 0) - framme);
  return Math.min(n, kunder) * Math.max(0, prisAv(s, f, 'affar', k, G) - gv * G.varde(k));
}
// varje plats på varubordet till den vara som väntas ge mest (steg 15.1.99): det ägaren har över, och det som redan ligger
// framme räknas av från de kunder varan väntar. Är varubordet fullt och ger det som ligger där mindre än det bästa som väntar,
// bärs det tillbaka till förrådet (tillbaka). v = det varan väntas ge
export function attStalla(s: State, f: Foretag, utanRuta = false): (HyllVara & { v: number }) | undefined {
  const G: Part | undefined = saljPart(s, f);
  if (!G) return undefined;
  const m = efterfragat(s, f.ag), fram = hyllan(s, f), r = new Set(rutor(s, f).map(q => q.y * W + q.x)), framN = (k: string) => fram.reduce((n, h) => n + (h.k === k ? h.n : 0), 0);
  let bast: (HyllVara & { v: number }) | undefined;
  for (const w of G.over([])) {
    if (w.k === 'silver' || w.n < 1) continue;
    if (w.t) { const v = hyllVarde(s, f, G, m, w.k, 1, framN(w.k)); if (v <= (bast?.v ?? 0)) continue; const t = lying(s).find(q => q.k === w.k && q.agare === f.ag && !r.has(q.y! * W + q.x!)); if (t) bast = { k: w.k, n: 1, x: t.x!, y: t.y!, t, v }; continue; }
    if (isTool(w.k)) continue;
    const a = stacksOf(s).find(q => q.k === w.k && !r.has(q.y * W + q.x) && arAgd(q, f.ag) >= 1);
    if (!a) continue;
    const n = Math.min(Math.floor(w.n), Math.floor(arAgd(a, f.ag) + 1e-9)), v = hyllVarde(s, f, G, m, w.k, n, framN(w.k));
    if (v > (bast?.v ?? 0)) bast = { k: w.k, n, x: a.x, y: a.y, v };
  }
  if (!bast || utanRuta || ledigRuta(s, f)) return bast;
  // fullt: det som ger minst bärs tillbaka, när det ger mindre än det bästa som väntar
  let samst: (HyllVara & { v: number }) | undefined;
  for (const h of fram) { const v = hyllVarde(s, f, G, m, h.k, h.n, framN(h.k) - h.n); if (!samst || v < samst.v) samst = { ...h, v }; }
  return samst && samst.v < bast.v ? { ...samst, tillbaka: true, v: bast.v - samst.v } : undefined;
}
// så många varor till som går att ställa fram: det ägaren har över som efterfrågas och inte ligger framme, högst de lediga rutorna
function kvarAttStalla(s: State, f: Foretag): number {
  const G = saljPart(s, f);
  if (!G) return 0;
  const m = efterfragat(s, f.ag), fram = new Set(hyllan(s, f).map(h => h.k));
  const varor = G.over([]).filter(w => w.k !== 'silver' && w.n >= 1 && !fram.has(w.k) && lust(m, w.k) > 0 && (!!w.t || !isTool(w.k))).length;
  const upp = new Set(stacksOf(s).filter(a => a.n > 1e-6).map(a => a.y * W + a.x));
  for (const t of tingOf(s)) if (t.x !== undefined && t.hos === undefined) upp.add(t.y! * W + t.x);
  for (const q of living(s)) if (q.task?.act === 'stallaFram') upp.add(Math.floor(q.task.ty) * W + Math.floor(q.task.tx));
  return Math.min(varor, rutor(s, f).filter(q => !upp.has(q.y * W + q.x)).length);
}
export function stallaVal(s: State, p: Person): { f: Foretag; h: HyllVara; sc: number } | undefined {
  let bast: { f: Foretag; h: HyllVara; sc: number } | undefined;
  for (const f of s.foretag ?? []) {
    if (!f.verk.includes('affar') || !diskarAv(s, f).length) continue; // utan disk kan inget säljas, och då är det inget värt att ställa fram (steg 15.1.14)
    const g = betjanar(s, p, f);
    if (g <= 0) continue;
    // det som återstår delat med dem som redan ställer fram (steg 15.1.154): en till hjälper när det är mycket
    const andra = living(s).filter(q => q !== p && q.task?.act === 'stallaFram' && q.task.ref === f.id).length;
    const h = attStalla(s, f), kvar = andra ? kvarAttStalla(s, f) : 1;
    if (h) { const sc = g * AFFAR.vikt * h.v * Math.min(1, kvar / (andra + 1)); if (sc > (bast?.sc ?? 0)) bast = { f, h, sc }; }
  }
  return bast;
}
// framme vid saken (KLAR): ägarens del av högen, så mycket som går att bära och ryms på varubordet, eller tinget
export function stallaKlar(s: State, p: Person, t: Task) {
  const f = foretagOf(s).find(q => q.id === t.ref), x = Math.floor(t.tx), y = Math.floor(t.ty);
  if (f && rutor(s, f).some(q => q.x === x && q.y === y)) return tillbakaKlar(s, p, t, f, x, y); // från varubordet till förrådet (steg 15.1.99)
  const till = f && ledigRutaFor(s, f, p);
  if (!f || !till) return;
  const g = lying(s).find(q => q.x === x && q.y === y && q.k === t.tool && q.agare === f.ag);
  if (g) { g.x = g.y = undefined; g.lass = p.id; (t.ting ??= []).push(g.id); changed(s); return; }
  const a = stacksOf(s).find(q => q.x === x && q.y === y && q.k === t.tool);
  if (!a) return;
  const over = iHelaForradet(() => saljPart(s, f)?.over([]).find(w => w.k === a.k && !w.t)?.n ?? 0), // på hela förrådet, som när arbetet valdes (steg 15.1.14)
    max = Math.min(Math.floor(arAgd(a, f.ag) + 1e-9), Math.floor(over + 1e-9), rymdPa(s, till.x, till.y, a.k)), r = ryms(s, p);
  let n = 0;
  while (n < max && r({ [a.k]: (n + 1) * viktOf(a.k) })) n++;
  if (n > 0) { taUrStack(s, a, n, f.ag, t); tidy(s); }
}
// varan på varubordet tas upp och bärs till förrådet som ägarens (backSpot i lager.ts)
function tillbakaKlar(s: State, p: Person, t: Task, f: Foretag, x: number, y: number) {
  t.tillbaka = true;
  const g = lying(s).find(q => q.x === x && q.y === y && q.k === t.tool && q.agare === f.ag);
  if (g) { g.x = g.y = undefined; g.lass = p.id; (t.ting ??= []).push(g.id); changed(s); return; }
  const a = stacksOf(s).find(q => q.x === x && q.y === y && q.k === t.tool);
  if (!a) return;
  const max = Math.floor(arAgd(a, f.ag) + 1e-9), r = ryms(s, p);
  let n = 0;
  while (n < max && r({ [a.k]: (n + 1) * viktOf(a.k) })) n++;
  if (n > 0) { taUrStack(s, a, n, f.ag, t); tidy(s); count(s, 'burenTillbaka'); }
}
const ledigRutaFor = (s: State, f: Foretag, p: Person) => { const t = p.task; p.task = undefined; try { return ledigRuta(s, f); } finally { p.task = t; } };
// dit det ska (backSpot i lager.ts); är det fullt bärs det till förrådet
besokLager.till.stallaFram = (s, t) => { if (t.tillbaka) return undefined; const f = foretagOf(s).find(q => q.id === t.ref), r = f && ledigRuta(s, f); return r && { x: r.x + 0.5, y: r.y + 0.5 }; };
// framme vid varubordet (LAMNA i steg.ts)
export function stallaFramme(s: State, t: Task) {
  const f = foretagOf(s).find(q => q.id === t.ref), at = { x: Math.floor(t.tx), y: Math.floor(t.ty) };
  if (t.tillbaka) return false; // till förrådet
  if (f && rutor(s, f).some(q => q.x === at.x && q.y === at.y) && stallPaRutan(s, t, at.x, at.y)) { count(s, 'stalltFram'); return true; }
  return false;
}
// ---------- köpet ----------
// kunden får saken h (n av den) från företaget: tinget byter ägare, och högen bär hen hem
export function taVaran(s: State, f: Foretag, p: Person, h: HyllVara, n: number): number {
  if (h.t) { h.t.agare = p.id; changed(s); return 1; }
  const a = stacksOf(s).find(q => q.x === h.x && q.y === h.y && q.k === h.k);
  if (!a) return 0;
  const t: Task = { act: 'bara', phase: 'back', tx: 0, ty: 0, until: s.now, carry: 0, why: `Bär hem det hen köpt: ${f.namn}` }, v = Math.min(n, Math.floor(arAgd(a, f.ag) + 1e-9));
  if (v < 1) return 0;
  taUrStack(s, a, v, f.ag, t);
  t.ag = { [h.k]: { [p.id]: v } };
  const d = dropSpot(s, h.k);
  t.tx = d.x; t.ty = d.y; p.task = t;
  tidy(s);
  return v;
}
// bärlistan (lager.ts): det ägaren ställt på sitt varubord får stå där
besokLager.framme = s => { const m = new Map<number, number>(); for (const f of foretagOf(s)) if (f.verk.includes('affar')) for (const q of rutor(s, f)) m.set(q.y * W + q.x, f.ag); return m; };
