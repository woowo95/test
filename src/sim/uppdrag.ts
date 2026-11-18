// ---------- uppdragen (steg 11.8.1, Flera samhällen: Uppdragen i tal) ----------
// Registret UPPDRAG säger hur en plats eller en nöd blir ett resmål: utlösaren (händelsen där uppdraget uppstår, aldrig en egen
// slump), platsen (landmärkets sorter, eller närområdet), vem som utlyser, belöningen (det någon lagt undan, eller platsens
// innehåll i hela saker), kravet (det som avgör vilka ledaren kallar, steg 11.8.5), tiden ett utlyst uppdrag gäller och vad som
// sker på platsen. Ett fynd (ruinskatten, karavanen, graven, det vaktade föremålet) är ingen post: det är platsens innehåll
// (VarldPlats.inne) och finns så länge det finns kvar. Bara det som någon utlyst är en egen post (Utlyst, vl.uppdrag), och den
// tar slut av sin tid: belöningen som lagts undan går då tillbaka till den som utlyste. Talen står i blocket UPPDRAGTAL.
import { balans } from './balans';
import { alive, byId, count, stat } from './folk';
import { delade } from './berattelser';
import { findL, MINNE, trimLardomar, UPPDRAGKROK } from './minne';
import { lognFaktor } from './rykten';
import { clamp } from './slump';
import { put } from './lager';
import { kyrkaId } from './egendom';
import { troNamn } from './religion';
import { LandmarkId, varldPlatsNr } from './landmarken';
import { radNr } from './radtal';
import { laggTillRad, tillGrupp } from './utpost';
import { grundvarde } from './varde';
import { KOHANDELSER, antalUr, laggIKo, varldSlump } from './varldslag';
import { Varlden } from './varlden';
import { DAY, Lardom, Person, Rel, State } from './typer';
import { SAKER } from './saker';
import { VarldRad } from './radtal';
import { lever } from './rad';

export const UPPDRAGTAL = balans('uppdrag', {
  tid: 5, // ett utlyst uppdrag gäller så många dygn (år i spelet) om inte raden säger annat
  vilseTid: 1, // vilsegången gäller ett dygn: sedan finns inget att leta efter
  max: 6, // så många uppdrag minns en person som mest
  dela: 1.5, // vikten för att berätta om ett uppdrag i ett samtal (en plats väger ORT.dela)
  glom: 2, // ett uppdrag glöms så här mycket långsammare än en vanlig lärdom
  krav: 1, // vikten för hur väl en bybo passar uppdragets krav när ledaren kallar (steg 11.8.5), mot modet och tycket
  tilltro: 3, // tilltron till en uppgift halveras på så många dygn (år i spelet) efter att den utlystes
  glad: 0.12, // humöret för den som var med och klarade ett uppdrag (steg 11.8.17) ...
  besviken: 0.06, // ... och för den som kom fram till en tom plats eller inte kunde göra det
  tanke: 2, // så många dygn (år i spelet) sitter upplevelsen i humöret
  hjalpDygn: 2, // så många dygn (år i spelet) stannar sällskapet för att hjälpa en by (steg 11.13.23) ...
  hjalpTim: 6, // ... och så många timmar arbete per person räknas som att byn fått hjälp
  vittra: 0.03, // det i en ruin som inte ruttnar vittrar bort med så stor del per dygn (det som ruttnar: 1 / SAKER.haller per dygn)
});

// vem som utlyser: en anhörig eller en annan person (ur det hen har över), styret (ur budgetens del för uppdrag), kyrkan (ur
// sitt förråd), eller ingen (fyndet är sin egen belöning)
export type UtlysarId = 'anhorig' | 'person' | 'styre' | 'kyrka' | 'ingen';
// det som avgör vilka ledaren kallar (steg 11.8.5)
export type UppdragKrav = 'bara' | 'styrka' | 'mod' | 'sparning';
// hur väl en bybo passar kravet (steg 11.8.5): 0 för en medelmåttig, mer för den som passar. Bära: styrkan och uthålligheten;
// styrka: styrkan och närstriden; mod: modet; spårning: jakten (den som kan läsa spår) och minnet
export const KRAV: Record<UppdragKrav, (s: State, p: Person) => number> = {
  bara: (s, p) => (stat(p, 'styrka', s.now) + stat(p, 'uthallighet', s.now) - 20) / 20,
  styrka: (s, p) => (stat(p, 'styrka', s.now) - 10) / 10 + p.skill.narstrid / 20,
  mod: (s, p) => (stat(p, 'mod', s.now) - 10) / 10,
  sparning: (s, p) => p.skill.jakt / 20 + (stat(p, 'minne', s.now) - 10) / 20,
};
// hur väl q passar kravet för uppdraget ledaren tror på (det ledaren minns om det)
export function kravPassar(s: State, led: Person, id: number, q: Person) {
  const k = findL(led, 'uppdrag', id)?.om as UppdragId | undefined;
  return k && UPPDRAG[k] ? UPPDRAGTAL.krav * KRAV[uppdragDef(k).krav](s, q) : 0;
}
// det som sker på platsen
export type UppdragGor = 'leta' | 'ta' | 'strida' | 'hjalpa' | 'leverera';
export interface UppdragDef {
  namn: string;
  utlosare: string; // händelsen där uppdraget uppstår
  plats: readonly (LandmarkId | 'narhet')[]; // var det är: landmärkets sorter, eller närområdet runt den egna byn
  utlysare: readonly UtlysarId[];
  belon: 'utlyst' | 'innehall'; // det som lagts undan, eller platsens innehåll i hela saker
  krav: UppdragKrav;
  tid?: keyof typeof UPPDRAGTAL; // hur länge ett utlyst uppdrag gäller (UPPDRAGTAL.tid om inget anges)
  gor: UppdragGor;
  text: string; // hur det berättas: {plats}
}
export const UPPDRAG = {
  vilsegang: { namn: 'Vilsegången', utlosare: 'saknad', plats: ['narhet'], utlysare: ['anhorig'], belon: 'utlyst', krav: 'sparning', tid: 'vilseTid', gor: 'leta', text: 'att leta efter den som inte kommit hem' },
  ruinskatt: { namn: 'Ruinskatten', utlosare: 'undergang', plats: ['ruin'], utlysare: ['ingen'], belon: 'innehall', krav: 'bara', gor: 'ta', text: 'det som finns kvar i ruinen vid {plats}' },
  karavan: { namn: 'Den plundrade karavanen', utlosare: 'karavanran', plats: ['karavanrest'], utlysare: ['ingen'], belon: 'innehall', krav: 'bara', gor: 'ta', text: 'det rövarna lämnade kvar vid {plats}' },
  grav: { namn: 'Graven', utlosare: 'gravlagd', plats: ['gravhog'], utlysare: ['ingen'], belon: 'innehall', krav: 'mod', gor: 'ta', text: 'gravgåvorna i högen vid {plats}' },
  vaktat: { namn: 'Det vaktade föremålet', utlosare: 'ran', plats: ['rovarlager'], utlysare: ['ingen'], belon: 'innehall', krav: 'styrka', gor: 'strida', text: 'det som vaktas vid {plats}' },
  hjalp: { namn: 'Hjälp på en plats', utlosare: 'nod', plats: ['by'], utlysare: ['styre', 'kyrka'], belon: 'utlyst', krav: 'styrka', gor: 'hjalpa', text: 'att hjälpa {plats}' },
  leverans: { namn: 'Leveransen', utlosare: 'brist', plats: ['by'], utlysare: ['person', 'styre'], belon: 'utlyst', krav: 'sparning', gor: 'leverera', text: 'att föra en sak till {plats}' },
} as const satisfies Record<string, UppdragDef>;
export type UppdragId = keyof typeof UPPDRAG;
export const UPPDRAG_IDS = Object.keys(UPPDRAG) as UppdragId[];
export const uppdragDef = (k: UppdragId): UppdragDef => UPPDRAG[k];

// den som utlyst: en person i huvudbyn (id), huvudbyns styre eller kyrka, eller en by i världen (radens nummer)
export interface Utlysare { k: UtlysarId; person?: number; rad?: number; tro?: number /* kyrkans tro (steg 11.13.29) */ }
// ett utlyst uppdrag: sorten, platsen (världsplatsens nummer), vem som utlyst, belöningen som lagts undan i hela saker, när det
// utlystes och när det tar slut; om = den saknade (vilsegången), sak = det som ska föras dit (leveransen)
export interface Utlyst { id: number; k: UppdragId; mal: number; av: Utlysare; belon: Record<string, number>; t: number; slut: number; om?: number; sak?: [string, number] }

const uppdragTid = (k: UppdragId) => UPPDRAGTAL[uppdragDef(k).tid ?? 'tid'] * DAY;
// utlys ett uppdrag: belöningen har redan lagts undan av den som utlyser (steg 11.8.11–12), i hela saker. Slutet läggs i
// världens kö, så att det räknas vid den tiden och inte varje gång
export function utlys(vl: Varlden, k: UppdragId, mal: number, av: Utlysare, belon: Record<string, number>, t: number, o: { om?: number; sak?: [string, number] } = {}): Utlyst | undefined {
  if (uppdragDef(k).belon !== 'utlyst' || !varldPlatsNr(vl, mal)) return undefined;
  const hela: Record<string, number> = {};
  for (const [sak, n] of Object.entries(belon)) if (Math.floor(n) >= 1) hela[sak] = Math.floor(n);
  const u: Utlyst = { id: vl.nastaUppdrag = (vl.nastaUppdrag ?? 0) + 1, k, mal, av, belon: hela, t, slut: t + uppdragTid(k), ...o };
  (vl.uppdrag ??= []).push(u);
  laggIKo(vl, u.slut, 'uppdragSlut', { sak: u.id });
  return u;
}
export const uppdragen = (vl: Varlden) => vl.uppdrag ?? [];
export const uppdragNr = (vl: Varlden, id: number) => vl.uppdrag?.find(u => u.id === id);
export const belonVarde = (u: Utlyst) => Object.entries(u.belon).reduce((a, [k, n]) => a + n * grundvarde(k), 0);

// uppdraget tas bort; utan att någon klarat det går belöningen tillbaka till den som lade undan den
export function avslutaUppdrag(s: State, vl: Varlden, u: Utlyst, klarat: boolean) {
  vl.uppdrag = (vl.uppdrag ?? []).filter(x => x !== u);
  if (!vl.uppdrag.length) delete vl.uppdrag;
  if (klarat) { count(s, 'uppdragKlart'); return; }
  aterLamna(s, vl, u);
  count(s, 'uppdragUte');
}
function aterLamna(s: State, vl: Varlden, u: Utlyst) {
  const r = u.av.rad !== undefined ? radNr(vl, u.av.rad) : undefined;
  for (const [k, n] of Object.entries(u.belon)) {
    if (n < 1) continue;
    if (r) { if (lever(vl, r)) laggTillRad(r, tillGrupp(k), Math.round(n * grundvarde(k))); continue; } // en by i världen: i radens varor
    if (u.av.tro !== undefined && s.tron?.some(t => t.id === u.av.tro && t.slut === undefined)) { put(s, k, n, { [kyrkaId(u.av.tro)]: n }); continue; } // tillbaka till kyrkans förråd
    const agare = u.av.person !== undefined && s.people.some(p => p.id === u.av.person && alive(p)) ? u.av.person : undefined;
    put(s, k, n, agare !== undefined ? { [agare]: n } : undefined); // huvudbyn: tillbaka till personen, annars till byn
  }
  u.belon = {};
}
// tiden är ute
KOHANDELSER.uppdragSlut = (s, vl, p) => { const u = p.sak !== undefined ? uppdragNr(vl, p.sak) : undefined; if (u) avslutaUppdrag(s, vl, u, false); };

// ---------- ruinskatten (steg 11.8.2) ----------
// En ruin har det som fanns kvar när byn gick under (VarldRad.kvar, byflytt.ts), i hela saker. Det vittrar per tid: det som
// ruttnar med 1 / SAKER.haller per dygn, annat med UPPDRAGTAL.vittra. Det som finns kvar vid tiden t räknas ur det som fanns vid
// kvarT: det väntade antalet (n gånger andelen kvar) avrundat med ett fast slumptal per sak, så att det är samma vid samma tid,
// aldrig ökar, och inte ändrar något förrän någon tar något (då blir det som är kvar den nya grunden)
const VITTRA = 21; // ärendet i världens slump
const vittrarPerDygn = (k: string) => { const h = SAKER[k]?.haller; return h ? 1 / h : UPPDRAGTAL.vittra; };
export function ruinKvar(vl: Varlden, r: VarldRad, t: number): Record<string, number> {
  const ut: Record<string, number> = {}, dygn = Math.max(0, t - (r.kvarT ?? r.t)) / DAY;
  Object.entries(r.kvar ?? {}).forEach(([k, n], i) => { const m = antalUr(n * Math.exp(-vittrarPerDygn(k) * dygn), varldSlump(vl, r.nr, i, VITTRA)); if (m > 0) ut[k] = Math.min(n, m); });
  return ut;
}
export const ruinRad = (vl: Varlden, nr: number) => { const p = varldPlatsNr(vl, nr), r = p?.by !== undefined ? radNr(vl, p.by) : undefined; return p?.k === 'ruin' && r ? r : undefined; };
// den som når ruinen vid tiden t tar det som finns kvar, högst bar i vikt (viktAv); det som blir kvar är den nya grunden
export function taRuin(s: State, vl: Varlden, r: VarldRad, t: number, bar: number, viktAv: (k: string) => number): Record<string, number> {
  const kvar = ruinKvar(vl, r, t), tagit: Record<string, number> = {};
  let plats = bar;
  for (const k of Object.keys(kvar).sort((a, b) => grundvarde(b) / Math.max(0.1, viktAv(b)) - grundvarde(a) / Math.max(0.1, viktAv(a)))) {
    const n = Math.min(kvar[k]!, Math.floor(plats / Math.max(1e-9, viktAv(k))));
    if (n < 1) continue;
    tagit[k] = n; kvar[k]! -= n; plats -= n * viktAv(k);
    if (kvar[k]! <= 0) delete kvar[k];
  }
  if (Object.keys(kvar).length) { r.kvar = kvar; r.kvarT = t; } else { delete r.kvar; delete r.kvarT; }
  if (Object.keys(tagit).length) count(s, 'ruinTagit', Object.values(tagit).reduce((a, n) => a + n, 0));
  return tagit;
}

// ---------- uppdraget är kunskap (steg 11.8.3, Platsen i minnet) ----------
// Ett utlyst uppdrag är en lärdom (k = 'uppdrag', a = uppdragets nummer, t = när det utlystes): det minns och bleknar som andra
// lärdomar (UPPDRAGTAL.glom gånger långsammare) och berättas i samtal (UPPDRAGTAL.dela). Tilltron är säkerheten gånger en halvering
// med uppgiftens ålder (UPPDRAGTAL.tilltro dygn). Den som hört om det vet inte om det redan är taget eller utgånget.
// v = den trodda belöningens värde, g = platsens nummer: båda är det personen tror, och finns kvar när uppdraget är taget eller slut
export function larUppdrag(s: State, p: Person, id: number, c: number, o: { t: number; v: number; mal: number; k: UppdragId; src?: number; led?: number }): Lardom {
  const e = findL(p, 'uppdrag', id);
  if (e) { e.c = Math.max(e.c, c, Math.min(1, e.c + MINNE.berattaStark * (1 - e.c))); return e; }
  const l: Lardom = { k: 'uppdrag', a: id, v: Math.round(o.v), g: o.mal, om: o.k, c, t: o.t, led: o.led ?? (o.src === undefined ? 0 : 1), ...(o.src !== undefined ? { src: o.src } : {}) };
  (p.lardomar ??= []).push(l);
  trimLardomar(s, p);
  return l;
}
// ett uppdrag personen tror på, som mål för en resa (steg 11.8.4): den trodda belöningen gånger tilltron, för platsen nr
export function uppdragVid(s: State, p: Person, nr: number): { id: number; varde: number } | undefined {
  let bast: { id: number; varde: number } | undefined;
  for (const l of p.lardomar ?? []) if (l.k === 'uppdrag' && l.g === nr) {
    const varde = l.v * tilltro(s, l);
    if (varde > 0 && (!bast || varde > bast.varde)) bast = { id: l.a, varde };
  }
  return bast;
}
// ---------- fyndet berättas (steg 11.8.8) ----------
// Ett fynd (det som finns kvar i en ruin) är ingen utlyst post, men den som sett det minns det som ett uppdrag med numret
// fyndId(platsen): det trodda värdet av det som finns kvar, platsen och när hen såg det. Det berättas och väger som mål för en
// resa som ett utlyst uppdrag. Den som ser att det är tomt minns det (värdet 0) och berättar det också.
export const fyndId = (nr: number) => -(nr + 1);
export function saFynd(s: State, vl: Varlden, p: Person, r: VarldRad, nr: number, t: number) {
  const v = Math.round(Object.entries(ruinKvar(vl, r, t)).reduce((a, [k, n]) => a + n * grundvarde(k), 0));
  const l = larUppdrag(s, p, fyndId(nr), 1, { t, v, mal: nr, k: 'ruinskatt' });
  l.v = v; l.t = t; l.c = 1; l.src = undefined; l.led = 0;
}
export const tilltro = (s: State, l: Lardom) => l.c * 0.5 ** (Math.max(0, s.now - l.t) / (UPPDRAGTAL.tilltro * DAY));
export function berattaUppdrag(s: State, a: Person, b: Person, l: Lardom, r: Rel) {
  l.c = Math.min(1, l.c + MINNE.berattaStark * (1 - l.c));
  const vl = s.varld, u = vl && uppdragNr(vl, l.a), q = u && vl && varldPlatsNr(vl, u.mal);
  delade('fjarran', 'karta', u ? `${uppdragDef(u.k).namn.toLowerCase()}${q ? ` vid ${q.namn}` : ''}` : 'ett uppdrag');
  const trust = clamp(MINNE.troBas + r.op / MINNE.troDiv, MINNE.troMin, MINNE.troMax) * lognFaktor(b, a), fore = findL(b, 'uppdrag', l.a);
  larUppdrag(s, b, l.a, l.c * trust * MINNE.troDel, { t: l.t, v: l.v, mal: l.g ?? -1, k: (l.om ?? 'leverans') as UppdragId, src: a.id, led: (l.led ?? 0) + 1 });
  if (!fore) count(s, 'uppdragBerattat');
}
UPPDRAGKROK.tal = UPPDRAGTAL;
UPPDRAGKROK.beratta = (s, a, b, l, r) => berattaUppdrag(s, a, b, l, r);
UPPDRAGKROK.describe = (s, l) => describeUppdrag(s, l);
export function describeUppdrag(s: State, l: Lardom) {
  const vl = s.varld, u = vl && uppdragNr(vl, l.a), q = vl && l.g !== undefined ? varldPlatsNr(vl, l.g) : undefined;
  const k = (u?.k ?? l.om) as UppdragId | undefined, def = k && UPPDRAG[k] ? uppdragDef(k) : undefined;
  const what = def ? `${def.namn}${q ? ` vid ${q.namn}` : ''}${l.a < 0 ? (l.v > 0 ? `, värt ${l.v}` : ', tomt') : ''}` : 'Ett uppdrag';
  const src = l.src === undefined ? 'hörde det själv' : `hört av ${byId(s, l.src)?.name ?? 'någon'}`;
  const tt = tilltro(s, l), sure = tt >= 0.6 ? 'tror på det' : tt >= 0.25 ? 'tror kanske på det' : 'tvivlar';
  return { text: what, what, place: q?.namn ?? 'okänd plats', src, sure, wrong: '' };
}

// ---------- det byn känner till (steg 11.8.16, delen Uppdrag i Omvärlden och märkena på världskartan) ----------
// Varje uppdrag och fynd som någon levande bybo vet om, med den säkraste uppgiften: sorten, platsen, vem som utlyst (bara det
// den som vet kan veta: posten om den finns kvar), den trodda belöningen, hur gammal uppgiften är och vilka som vet
export interface BynsUppdrag { id: number; k?: UppdragId; namn: string; nr?: number; plats: string; av: string; varde: number; t: number; tilltro: number; vet: string[]; fynd: boolean; tomt: boolean }
export function utlysarNamn(s: State, vl: Varlden, a: Utlysare): string {
  if (a.person !== undefined) return byId(s, a.person)?.name ?? 'en bybo';
  if (a.rad !== undefined) { const r = radNr(vl, a.rad); return r ? `${a.k === 'kyrka' ? 'kyrkan i' : 'styret i'} ${r.namn}` : 'en by'; }
  if (a.tro !== undefined) { const tr = s.tron?.find(t => t.id === a.tro); if (tr) return `kyrkan för ${troNamn(tr).toLowerCase()}`; }
  return a.k === 'kyrka' ? 'byns kyrka' : a.k === 'styre' ? 'byns styre' : 'ingen';
}
export function bynsUppdrag(s: State): BynsUppdrag[] {
  const vl = s.varld;
  if (!vl) return [];
  const per = new Map<number, { l: Lardom; tt: number; vet: string[] }>();
  for (const p of s.people) {
    if (!alive(p) || p.gast) continue;
    for (const l of p.lardomar ?? []) {
      if (l.k !== 'uppdrag') continue;
      const tt = tilltro(s, l), f = per.get(l.a);
      if (!f) per.set(l.a, { l, tt, vet: [p.name] });
      else { f.vet.push(p.name); if (tt > f.tt) { f.l = l; f.tt = tt; } }
    }
  }
  return [...per.entries()].map(([id, { l, tt, vet }]) => {
    const u = uppdragNr(vl, id), k = (u?.k ?? l.om) as UppdragId | undefined, def = k && UPPDRAG[k] ? uppdragDef(k) : undefined;
    const nr = u?.mal ?? l.g, q = nr !== undefined ? varldPlatsNr(vl, nr) : undefined, fynd = id < 0;
    return { id, k, namn: def?.namn ?? 'Ett uppdrag', nr, plats: q?.namn ?? 'okänd plats', av: u ? utlysarNamn(s, vl, u.av) : fynd ? 'ingen' : 'okänt', varde: l.v, t: l.t, tilltro: tt, vet, fynd, tomt: fynd && l.v <= 0 };
  }).sort((a, b) => b.varde * b.tilltro - a.varde * a.tilltro);
}
