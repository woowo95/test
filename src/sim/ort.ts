// ---------- platsen i minnet (fas 11.4, Flera samhällen: Platsen i minnet) ----------
// Det en person vet om en plats i världen är en lärdom av slaget ort (LARDOMAR i minne.ts): platsens nummer (a), nivån (v, en
// rad i ORTNIVA: rykte, känt eller besökt), säkerheten (c), tiden då uppgifterna senast hördes (t) och för ett rykte den som
// först berättade (fr), som ryktets förskjutning räknas ur. En person minns högst ORT.max platser, och det minst säkra trängs
// undan. Att höra om en plats igen, på samma eller en högre nivå, stärker minnet.
import { balans } from './balans';
import { findL, MINNE, nyhet, trimLardomar } from './minne';
import { delade } from './berattelser';
import { alive, byId, count, gjort, living } from './folk';
import { kronika } from './historik';
import { notis } from './notiser';
import { varldHandelseText, VarldHandelse } from './varldkronika';
import { clamp, hash3 } from './slump';
import { lognFaktor } from './rykten';
import { byPlats, LANDMARKEN, LandmarkDef, varldPlatsNr } from './landmarken';
import { VARLD } from './varldmark';
import type { Varlden } from './varlden';
import { klanById } from './klaner';
import { DAY, Lardom, Person, Rel, State } from './typer';
import { yearNo } from './tid';
import { BYSORTER, radNr, RadtalId, VarldRad } from './radtal';

export const ORT = balans('ort', {
  max: 10, // så många platser i världen minns en person högst (utöver de andra lärdomarna); det minst säkra trängs undan
  narDygn: 1, // närområdet: platserna utan folk inom så många dygns gång (fågelvägen i obanad slätt) från byn är kända för alla som bor där (steg 11.4.2)
  prat: 0.6, // en gäst som berättar om sin hemby i småpratet ger platsen som känd så här säkert; i en affär eller med ledaren helt säkert
  anfall: 0.5, // den som ser rövare från en grannby får ett rykte om byn de kom ifrån så här säkert
  // platserna bleknar (steg 11.4.3): så här många gånger personens vanliga tid för en lärdom, per nivå
  glomRykte: 4, glomKant: 10, glomBesokt: 25,
  ryktRadie: 0.5, // ett rykte är ett område med den här radien i dygns gång (steg 11.4.5) ...
  ryktFran: 0.3, ryktTill: 0.85, // ... och mitten ligger så här långt från platsen, i andelar av radien
  dela: 1, // hur gärna man berättar om en plats i världen i ett samtal, gånger säkerheten (som en plats med värdet 1, steg 11.4.4)
  nyStor: 0.3, nyVikt: 2, // en nyhet om en by (steg 11.4.9): invånarna ändrade med mer än så här stor andel; så mycket hellre berättas den
  gastKant: 0.75, gastRykte: 0.5, // så säkert en gäst känner det hens by känner och har rykten om (hembyn och det byn besökt: helt säkert, steg 11.4.11)
  histDygn: 5, histMax: 16, // byarnas historik (steg 11.4.8): en bild var femte dygn, högst så många per by
  nedC: 0.5, // en plats vars säkerhet sjunkit under MINNE.glomGrans sjunker en nivå och får den här säkerheten; ett rykte glöms
});

// nivåerna: vad personen vet om platsen. Ett led i berättandet tar bort en nivå (steg 11.4.4)
// glom: hur långsamt nivån bleknar, ett balanstal i ORT
export interface OrtNivaDef { namn: string; text: string; glom: 'glomRykte' | 'glomKant' | 'glomBesokt' }
export const ORTNIVA = [
  { namn: 'Rykte', text: 'har hört talas om', glom: 'glomRykte' }, // ungefär var, och bara sorten och namnet
  { namn: 'Känt', text: 'vet var den ligger', glom: 'glomKant' },
  { namn: 'Besökt', text: 'har varit där', glom: 'glomBesokt' },
] as const satisfies readonly OrtNivaDef[];
export const O_RYKTE = 0, O_KANT = 1, O_BESOKT = 2;

// p lär sig om platsen nr på nivån niva med säkerheten c; uppgifterna är från tiden t (nu om inget anges), av src (den som
// berättade) eller själv, och fr är den som först berättade ett rykte
// ny: uppgiften är en nyhet sedan den tiden (den som berättar en nyhet för den vidare, steg 11.4.9)
export function larOrt(s: State, p: Person, nr: number, niva: number, c: number, o: { t?: number; src?: number; led?: number; fr?: number; ny?: number } = {}): Lardom {
  const t = o.t ?? s.now, led = o.led ?? (o.src === undefined ? 0 : 1), e = findL(p, 'ort', nr);
  if (e) {
    if (niva > e.v) { e.v = niva; e.c = Math.max(e.c, c); if (niva > O_RYKTE) delete e.fr; }
    else e.c = niva === e.v ? Math.max(e.c, c, e.c + MINNE.berattaStark * (1 - e.c)) : Math.min(1, e.c + MINNE.berattaStark * (1 - e.c)); // att höra om det igen stärker minnet
    if (t > e.t) {
      const ny = o.ny ?? (storForandring(s, nr, e.t, t) ? s.now : undefined); // nyare uppgifter där något stort ändrats
      if (ny !== undefined && (e.ny === undefined || ny > e.ny)) { e.ny = ny; nyhetNarByn(s, p, nr, e.t, t, o.src); }
      e.t = t; e.src = o.src; e.led = led; if (o.src === undefined) delete e.src;
    }
    return e;
  }
  const l: Lardom = { k: 'ort', a: nr, v: niva, c, t, led, ...(o.src !== undefined ? { src: o.src } : {}), ...(niva === O_RYKTE && o.fr !== undefined ? { fr: o.fr } : {}), ...(o.ny !== undefined ? { ny: o.ny } : {}) };
  (p.lardomar ??= []).push(l);
  trimLardomar(s, p);
  return l;
}
// ---------- platserna bleknar (steg 11.4.3) ----------
// Säkerheten sjunker per tid som andra lärdomar (forget i minne.ts, en gång i timmen), långsammare ju högre nivån är. När den
// sjunkit under MINNE.glomGrans sjunker platsen en nivå, en i taget, och ett rykte glöms. Platserna dör med personen.
// tau är personens vanliga tid i timmar; true: lärdomen finns kvar
export function ortBleknar(l: Lardom, timmar: number, tau: number): boolean {
  l.c *= Math.exp(-timmar / (tau * ORT[ORTNIVA[l.v]?.glom ?? 'glomRykte']));
  if (l.c >= MINNE.glomGrans) return true;
  if (l.v <= O_RYKTE) return false;
  l.v--; l.c = ORT.nedC;
  return true;
}
// ---------- platserna i samtalen (steg 11.4.4) ----------
// a berättar för b om platsen i lärdomen l: ett led i berättandet tar bort en nivå (besökt blir känt, känt blir rykte), och
// säkerheten är den hos den som berättar gånger hur mycket b tror på a, som för andra lärdomar. Ett rykte som börjar här får a
// som den som först berättade (ryktets förskjutning, steg 11.4.5); ett rykte som berättas vidare behåller sin. Att berätta
// stärker det egna minnet. Samtalets ämne blir Fjärran platser
export function berattaOrt(s: State, a: Person, b: Person, l: Lardom, r: Rel) {
  l.c = Math.min(1, l.c + MINNE.berattaStark * (1 - l.c));
  const vl = s.varld, q = vl && varldPlatsNr(vl, l.a);
  delade('fjarran', 'karta', q ? (l.v === O_RYKTE ? `${LANDMARKEN[q.k].namn.toLowerCase()} som heter ${q.namn}` : q.namn) : 'en plats långt borta');
  const trust = clamp(MINNE.troBas + r.op / MINNE.troDiv, MINNE.troMin, MINNE.troMax) * lognFaktor(b, a);
  const niva = Math.max(O_RYKTE, l.v - 1), fore = findL(b, 'ort', l.a);
  larOrt(s, b, l.a, niva, l.c * trust * MINNE.troDel, { t: l.t, src: a.id, led: (l.led ?? 0) + 1, fr: l.v === O_RYKTE ? (l.fr ?? a.id) : a.id, ...(nyhet(s, l) ? { ny: l.ny } : {}) });
  if (!fore) { count(s, 'ortBerattad'); gjort(s, a, 'berattat'); }
}
// ---------- ryktets läge (steg 11.4.5) ----------
// Ett rykte är ett område i världen (i världsrutor): radien ORT.ryktRadie dygns gång, och mitten förskjuten från platsen åt ett
// håll och ett avstånd som räknas ur världens frö, platsen och den som först berättade, så att platsen alltid ligger inom
// området men inte i mitten. Samma rykte ligger på samma ställe hos alla som hört det av samma första berättare
export function ryktesLage(s: State, l: Lardom): { x: number; y: number; r: number } | undefined {
  const vl = s.varld, q = vl && varldPlatsNr(vl, l.a);
  if (!q) return undefined;
  const r = ORT.ryktRadie * VARLD.gangPerDygn, fr = l.fr ?? l.src ?? 0;
  const vinkel = hash3(vl.fro, l.a, 0x4f52 + fr * 7) * 2 * Math.PI, d = r * (ORT.ryktFran + (ORT.ryktTill - ORT.ryktFran) * hash3(vl.fro, fr, 0x5259 + l.a * 3));
  return { x: q.x + 0.5 + Math.cos(vinkel) * d, y: q.y + 0.5 + Math.sin(vinkel) * d, r };
}
// nivån p har i minnet för platsen nr (undefined: okänd)
export const ortNiva = (p: Person, nr: number): number | undefined => findL(p, 'ort', nr)?.v;

// ---------- närområdet (steg 11.4.2) ----------
// Marken och naturen inom ORT.narDygn dygns gång från byn är känd för var och en som bor där, utan att sparas hos personen.
// Platser med folk (folk i LANDMARKEN) hör inte dit: en ny by känner inga byar eller läger och får veta om dem genom en
// besökare, en handlare, ett anfall eller en upphittad karta. Byns egen plats är besökt
export function iNaromradet(s: State, nr: number): boolean {
  const vl = s.varld, q = vl && varldPlatsNr(vl, nr), h = vl?.huvud !== undefined ? byPlats(vl, vl.huvud) : undefined;
  if (!q || !h || (LANDMARKEN[q.k] as LandmarkDef).folk) return false;
  return Math.hypot(q.x - h.x, q.y - h.y) <= ORT.narDygn * VARLD.gangPerDygn;
}
// det en bybo vet om platsen nr: minnet, närområdet (känt) och byns egen plats (besökt); undefined: okänd
export function kannerOrt(s: State, p: Person, nr: number): number | undefined {
  const vl = s.varld, egen = !p.gast && vl?.huvud !== undefined && byPlats(vl, vl.huvud)?.nr === nr;
  if (egen) return O_BESOKT;
  const m = ortNiva(p, nr), n = !p.gast && iNaromradet(s, nr) ? O_KANT : undefined;
  return m === undefined ? n : n === undefined ? m : Math.max(m, n);
}
// platsen gästen g kommer ifrån: klanens by eller byn i världen hen flyttade ifrån
export function gastHemOrt(s: State, g: Person): number | undefined {
  const vl = s.varld, rad = klanById(s, g.gast?.klan)?.rad ?? g.gast?.hemRad;
  return vl && rad !== undefined ? byPlats(vl, rad)?.nr : undefined;
}
// gästen g berättar för bybon p var hen bor: p känner platsen med säkerheten c
export function horOmGast(s: State, p: Person, g: Person, c: number) {
  const nr = p.gast ? undefined : gastHemOrt(s, g);
  if (nr !== undefined) larOrt(s, p, nr, O_KANT, c, { src: g.id });
}
// bybon p ser rövare från klanen och får ett rykte om byn de kom ifrån; p är den som först berättar det
export function rovareSedda(s: State, p: Person, klan: number | undefined) {
  const vl = s.varld, rad = klanById(s, klan)?.rad, nr = vl && rad !== undefined ? byPlats(vl, rad)?.nr : undefined;
  if (nr !== undefined && !p.gast) larOrt(s, p, nr, O_RYKTE, ORT.anfall, { fr: p.id });
}

// lärdomen i ord (describe i minne.ts)
export function describeOrt(s: State, l: Lardom) {
  const vl = s.varld, q = vl && varldPlatsNr(vl, l.a), niva = ORTNIVA[l.v] ?? ORTNIVA[0];
  const sort = q ? LANDMARKEN[q.k].namn : 'En plats', place = q ? (l.v === O_RYKTE ? `${sort.toLowerCase()} som heter ${q.namn}` : q.namn) : 'en plats som inte finns längre';
  const what = `${cap(niva.text)} ${l.v === O_RYKTE ? place : `${sort.toLowerCase()} ${q?.namn ?? ''}`.trim()}`;
  const src = l.src === undefined ? (l.led ? 'fick höra om det' : l.v === O_BESOKT ? 'egen resa' : 'egen erfarenhet') : `hört av ${byId(s, l.src)?.name ?? 'någon'}${(l.led ?? 1) > 1 ? `, ${l.led} led från den som var där` : ''}`;
  const sure = l.c >= 0.75 ? 'säker' : l.c >= 0.4 ? 'ganska säker' : 'osäker';
  return { text: what, what, place: q?.namn ?? 'okänd plats', src, sure, wrong: q ? '' : 'platsen finns inte längre' };
}
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

// ---------- det byn vet (steg 11.4.6, Flera samhällen: Det byn vet) ----------
// Byns kunskap är en sammanställning och inget eget förråd: för varje plats den högsta nivån bland minnena hos dem som är
// hemma (inte den som är ute på resa), den senaste tiden för uppgifterna och vilka som vet. Den räknas en gång i timmen
// (TAKTER) och genast vid ett dödsfall, en hemkomst och en avfärd. Närområdet och byns egen plats står inte i den, eftersom
// de alltid är kända (bynKanner frågar dem). När en plats försvinner ur byns kunskap och ingen bybo längre minns den, inte
// heller den som är ute, skrivs en rad i krönikan, som när en teknik dör
export interface VetOrt { v: number; t: number; vem: number[] }
export interface BynVet { t: number; p: Record<number, VetOrt> }
export function raknaBynVet(s: State) {
  if (!s.varld) return;
  const ny: Record<number, VetOrt> = {};
  for (const p of living(s)) for (const l of p.lardomar ?? []) {
    if (l.k !== 'ort') continue;
    const e = ny[l.a];
    if (!e) ny[l.a] = { v: l.v, t: l.t, vem: [p.id] };
    else { e.v = Math.max(e.v, l.v); e.t = Math.max(e.t, l.t); e.vem.push(p.id); }
  }
  const fore = s.bynVet?.p;
  if (fore) for (const k in fore) {
    const nr = Number(k);
    if (ny[nr] || iNaromradet(s, nr)) continue;
    if (s.people.some(q => alive(q) && !q.gast && findL(q, 'ort', nr))) continue; // den som är ute minns den ännu
    const q = varldPlatsNr(s.varld, nr), om = fore[nr]!.vem.map(id => byId(s, id)).find(x => x && x.died !== undefined);
    kronika(s, `Ingen i byn minns längre ${q ? `${LANDMARKEN[q.k].namn.toLowerCase()} ${q.namn}` : 'en plats långt borta'}${om ? `; ${om.name} var den sista som visste om den` : ''}.`, 'forlust');
    count(s, 'ortGlomdIByn');
  }
  s.bynVet = { t: s.now, p: ny };
}
// det byn vet om platsen nr: sammanställningen, närområdet (känt) och byns egen plats (besökt); undefined: okänd
export function bynKanner(s: State, nr: number): VetOrt | undefined {
  const vl = s.varld;
  if (vl?.huvud !== undefined && byPlats(vl, vl.huvud)?.nr === nr) return { v: O_BESOKT, t: s.now, vem: [] };
  const e = s.bynVet?.p[nr];
  if (!iNaromradet(s, nr)) return e;
  return e && e.v >= O_KANT ? e : { v: O_KANT, t: s.now, vem: e?.vem ?? [] };
}

// ---------- byns karta (steg 11.4.7, Flera samhällen: Vad spelaren ser och vad byn vet) ----------
// Det världskartan behöver för sina två lager: nivån byn har för en plats (bynKanner), om en ruta ligger i närområdet och
// ryktenas områden (ett per plats byn bara har ett rykte om, läget ur minnet hos den första som vet). Det byn känner ritas
// tydligt, ryktena som grå områden och resten blekt; en hemlig plats (LANDMARKEN) syns först när byn har ett rykte om den
export interface BynsKarta { niva: (nr: number) => number | undefined; nara: (x: number, y: number) => boolean; rykten: { nr: number; x: number; y: number; r: number }[] }
export function bynsKarta(s: State): BynsKarta | undefined {
  const vl = s.varld, h = vl?.huvud !== undefined ? byPlats(vl, vl.huvud) : undefined;
  if (!vl) return undefined;
  const R = ORT.narDygn * VARLD.gangPerDygn, rykten: BynsKarta['rykten'] = [];
  for (const k in s.bynVet?.p ?? {}) {
    const nr = Number(k), e = s.bynVet!.p[nr]!;
    if (bynKanner(s, nr)?.v !== O_RYKTE) continue;
    const l = e.vem.map(id => byId(s, id)).map(q => q && findL(q, 'ort', nr)).find(x => x && x.v === O_RYKTE), o = l && ryktesLage(s, l);
    if (o) rykten.push({ nr, ...o });
  }
  return { niva: nr => bynKanner(s, nr)?.v, nara: (x, y) => !!h && Math.hypot(x - h.x, y - h.y) <= R, rykten };
}
// syns platsen på världskartan: allt utom en hemlig plats som byn inte har ett rykte om
export const syns = (k: BynsKarta | undefined, q: { nr: number; k: keyof typeof LANDMARKEN }) => !k || !(LANDMARKEN[q.k] as LandmarkDef).hemlig || k.niva(q.nr) !== undefined;

// ---------- byarnas historik (steg 11.4.8, Flera samhällen: Uppgifterna om en by och nyheterna) ----------
// Varje by sparar sina uppgifter glest, så att det en person tror om en by är byns tal vid tiden för uppgiften: en gammal
// uppgift men aldrig en påhittad. En bild sparas var ORT.histDygn:e dygn (vid radens tid, när den räknats fram dit), och när de
// blir fler än ORT.histMax tas den bild bort vars lucka blir minst i förhållande till hur gammal den är, så att de senaste
// ligger tätt och de äldre glesare. Den första och den senaste bilden tas aldrig bort.
export interface RadBild { t: number; tal: Record<RadtalId, number>; led?: string; tro?: string; lyder?: number; inst?: number; borta?: true }
export function radBild(r: VarldRad): RadBild {
  const b: RadBild = { t: r.t, tal: { ...r.tal } }, led = r.ledare !== undefined ? r.fasta[r.ledare]?.namn : undefined;
  if (led) b.led = led;
  if (r.tro) b.tro = r.tro.namn;
  if (r.lyder !== undefined) b.lyder = r.lyder;
  if (r.syn) b.inst = Math.round(r.syn.inst);
  if (!BYSORTER[r.sort].folk || r.tal.folk <= 0) b.borta = true;
  return b;
}
export function sparaHistorik(s: State) {
  const vl = s.varld, steg = ORT.histDygn * DAY;
  for (const r of vl?.rader ?? []) {
    const h = r.hist ??= [], sist = h[h.length - 1];
    if (sist?.borta) continue; // en by som gått under ändras inte mer
    if (sist && Math.floor(r.t / steg) <= Math.floor(sist.t / steg)) continue;
    h.push(radBild(r));
    while (h.length > ORT.histMax) {
      let bast = 1, min = Infinity;
      for (let i = 1; i < h.length - 1; i++) { const v = (h[i + 1]!.t - h[i - 1]!.t) / Math.max(1, r.t - h[i]!.t); if (v < min) { min = v; bast = i; } }
      h.splice(bast, 1);
    }
  }
}
// det man tror om byn med uppgifter från tiden t: den senaste bilden som inte är nyare än t (den första om t är äldre än alla)
export function radVid(r: VarldRad, t: number): RadBild | undefined {
  const h = r.hist;
  if (!h?.length) return undefined;
  let b = h[0]!;
  for (const x of h) if (x.t <= t) b = x; else break;
  return b;
}

// ---------- nyheterna (steg 11.4.9, Flera samhällen: Uppgifterna om en by och nyheterna) ----------
// Det en person tror om en by är byns bild vid tiden för uppgiften (radVid), och ett rykte ger bara sorten och namnet. Hör
// någon nyare uppgifter där något stort ändrats blir det en nyhet i MINNE.nyhetDygn dygn, som berättas ORT.nyVikt gånger hellre
// (share i minne.ts) och förs vidare som en nyhet: byn har gått under eller delats, fått en ny ledare eller börjat lyda under en
// annan, svultit, eller invånarna har ändrats med mer än ORT.nyStor. Krig och fred kommer med krigen mellan byarna
export const ortensRad = (s: State, nr: number): VarldRad | undefined => { const vl = s.varld, q = vl && varldPlatsNr(vl, nr); return q?.by !== undefined ? radNr(vl!, q.by) : undefined; };
export function trorOmBy(s: State, l: Lardom): RadBild | undefined {
  if (l.k !== 'ort' || l.v <= O_RYKTE) return undefined;
  const r = ortensRad(s, l.a);
  return r && radVid(r, l.t);
}
export function storForandring(s: State, nr: number, t0: number, t1: number): boolean {
  const r = ortensRad(s, nr), a = r && radVid(r, t0), b = r && radVid(r, t1);
  if (!r || !a || !b) return false;
  if (r.svalt !== undefined && r.svalt > t0 && r.svalt <= t1) return true;
  if ((s.varld!.rader ?? []).some(x => x.fran === r.nr && x.grundad > t0 && x.grundad <= t1)) return true; // byn har delats
  if (a === b) return false;
  return !!a.borta !== !!b.borta || a.led !== b.led || a.lyder !== b.lyder || Math.abs(b.tal.folk - a.tal.folk) > ORT.nyStor * Math.max(1, a.tal.folk);
}

// ---------- radens kunskap om platser (steg 11.4.10, Flera samhällen: Uppgifterna om en by och nyheterna) ----------
// En by i världen har ingen kunskap per person. Den känner byarna i sitt grannät, har rykten om grannarnas grannar och har
// besökt sin egen plats och det dess sällskap och handlare besökt (VarldRad.besokt, radBesoker). Det räknas när det frågas
export function radBesoker(vl: Varlden, radNr_: number | undefined, nr: number) {
  const r = radNr(vl, radNr_);
  if (!r) return;
  const b = r.besokt ??= [];
  if (!b.includes(nr)) b.push(nr);
}
export function radKanner(vl: Varlden, r: VarldRad, nr: number): number | undefined {
  const egen = byPlats(vl, r.nr);
  if (!egen) return undefined;
  if (egen.nr === nr || r.besokt?.includes(nr)) return O_BESOKT;
  const g = egen.grannar ?? [];
  if (g.some(x => x.nr === nr)) return O_KANT;
  for (const x of g) if (varldPlatsNr(vl, x.nr)?.grannar?.some(y => y.nr === nr)) return O_RYKTE;
  return undefined;
}

// ---------- gästernas platser (steg 11.4.11, Flera samhällen: Platsen i minnet) ----------
// En gäst (handlare, främling, rövare) har sin hemby som besökt och känner det hens by känner (radKanner), med uppgifter från
// i dag: så får byn i samtalen veta hur det står till i världen och höra om platser den inte sett. Det mest säkra går först
// när minnet är fullt (ORT.max)
export function gastensPlatser(s: State, g: Person) {
  const vl = s.varld, r = vl && radNr(vl, klanById(s, g.gast?.klan)?.rad ?? g.gast?.hemRad), egen = r && byPlats(vl!, r.nr);
  if (!vl || !r || !egen) return;
  const nr = new Set<number>([egen.nr, ...(r.besokt ?? [])]);
  for (const x of egen.grannar ?? []) { nr.add(x.nr); for (const y of varldPlatsNr(vl, x.nr)?.grannar ?? []) nr.add(y.nr); }
  for (const n of nr) {
    const v = radKanner(vl, r, n);
    if (v !== undefined && varldPlatsNr(vl, n)) larOrt(s, g, n, v, v === O_BESOKT ? 1 : v === O_KANT ? ORT.gastKant : ORT.gastRykte);
  }
}

// ---------- byns ruta på världskartan (steg 11.4.12, Flera samhällen: Det byn vet) ----------
// Rutan för en plats: spalten Byn tror (med året uppgifterna är från och varifrån de kom) bredvid Sant nu, vilka som känner
// platsen och varningen Bara en vet. Kartorna och böckerna som också kan bära byns kunskap kommer med kartorna
export interface RutaRad { namn: string; tror?: string; sant: string }
export interface PlatsRuta { namn: string; sort: string; niva?: string; ar?: number; kalla?: string; rader: RutaRad[]; vem: string[]; baraEn: boolean; egen: boolean }
function bildRader(s: State, b: RadBild | undefined): Record<string, string> {
  if (!b) return {};
  if (b.borta) return { kvar: 'Nej' };
  const vl = s.varld!;
  return { kvar: 'Ja', folk: String(b.tal.folk), mat: String(b.tal.mat), rikedom: String(b.tal.rikedom), styrka: String(b.tal.styrka), led: b.led ?? 'Ingen', tro: b.tro ?? 'Ingen', lyder: b.lyder !== undefined ? radNr(vl, b.lyder)?.namn ?? 'en annan by' : 'Ingen' };
}
const RUTARADER: [string, string][] = [['kvar', 'Finns kvar'], ['folk', 'Invånare'], ['mat', 'Mat'], ['rikedom', 'Rikedom'], ['styrka', 'Styrka'], ['led', 'Ledare'], ['tro', 'Tro'], ['lyder', 'Lyder under']];
export function platsRuta(s: State, nr: number): PlatsRuta | undefined {
  const vl = s.varld, q = vl && varldPlatsNr(vl, nr);
  if (!vl || !q) return undefined;
  const k = bynKanner(s, nr), egen = q.by !== undefined && q.by === vl.huvud;
  const vem = (k?.vem ?? []).map(id => byId(s, id)).filter((p): p is Person => !!p);
  // den senaste uppgiften bland dem som vet
  let bast: Lardom | undefined;
  for (const p of vem) { const l = findL(p, 'ort', nr); if (l && (!bast || l.t > bast.t)) bast = l; }
  const r = ortensRad(s, nr), sant = r && !egen ? bildRader(s, radBild(r)) : {};
  const tror = r && !egen && k && k.v > O_RYKTE ? bildRader(s, radVid(r, bast?.t ?? s.now)) : {};
  const rader = r && !egen ? RUTARADER.map(([id, namn]) => ({ namn, sant: sant[id] ?? '', ...(tror[id] !== undefined ? { tror: tror[id] } : {}) })) : [];
  return {
    namn: egen ? `Er by ${q.namn}` : q.namn, sort: LANDMARKEN[q.k].namn, egen, rader,
    ...(k ? { niva: ORTNIVA[k.v]!.namn } : {}), ...(bast ? { ar: yearNo(s, bast.t), kalla: describeOrt(s, bast).src } : {}),
    vem: vem.map(p => p.name), baraEn: !egen && !iNaromradet(s, nr) && vem.length === 1,
  };
}

// ---------- det byn hört i världens krönika (steg 11.4.13, Flera samhällen: Världens krönika) ----------
// Byn har hört en händelse när dess uppgifter om platsen är nyare än händelsen (minst känd; ett rykte ger bara namnet). Det
// som händer i byn själv har den alltid hört. En nyhet som når byn (den första i byn som får nyare uppgifter med en stor
// ändring) skrivs i byns krönika med vem som kom med den och ger en notis; händelserna däremellan i världens krönika är nyheten
export function hortHandelse(s: State, h: VarldHandelse): boolean {
  const vl = s.varld;
  if (!vl) return false;
  if (h.by === vl.huvud || h.mot === vl.huvud) return true;
  const nr = h.plats ?? (h.by !== undefined ? byPlats(vl, h.by)?.nr : undefined);
  const k = nr === undefined ? undefined : bynKanner(s, nr);
  return !!k && k.v >= O_KANT && k.t >= h.t;
}
function nyhetNarByn(s: State, p: Person, nr: number, t0: number, t1: number, src: number | undefined) {
  const vl = s.varld, e = s.bynVet?.p[nr];
  if (!vl || p.gast || (e && e.t >= t1)) return; // byn har redan hört det
  if (e) { e.t = t1; if (!e.vem.includes(p.id)) e.vem.push(p.id); }
  else (s.bynVet ??= { t: s.now, p: {} }).p[nr] = { v: findL(p, 'ort', nr)?.v ?? O_KANT, t: t1, vem: [p.id] }; // tills det räknas om
  const r = ortensRad(s, nr), q = varldPlatsNr(vl, nr);
  const vad = (vl.kronika ?? []).filter(h => h.t > t0 && h.t <= t1 && (h.by === r?.nr || h.mot === r?.nr || h.plats === nr)).map(h => varldHandelseText(vl, h));
  const fore = r && radVid(r, t0), nu = r && radVid(r, t1);
  if (!vad.length && fore && nu) {
    if (nu.borta && !fore.borta) vad.push(`${q?.namn ?? 'Byn'} har gått under`);
    else if (nu.led !== fore.led) vad.push(`${q?.namn ?? 'Byn'} har fått en ny ledare${nu.led ? `, ${nu.led}` : ''}`);
    else vad.push(`${q?.namn ?? 'Byn'} har nu ${nu.tal.folk} invånare (förut ${fore.tal.folk})`);
  }
  const kom = src !== undefined ? byId(s, src) : p, text = `Nyheter från ${q?.namn ?? 'en by långt borta'}: ${vad.join('. ')}. ${kom?.name ?? 'Någon'} kom med nyheten.`;
  kronika(s, text, 'nyhet');
  notis(s, 'nyhet', text, [p.id, ...(kom && kom !== p && !kom.gast ? [kom.id] : [])]);
  count(s, 'nyhetNarByn');
}

