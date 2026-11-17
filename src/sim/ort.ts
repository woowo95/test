// ---------- platsen i minnet (fas 11.4, Flera samhällen: Platsen i minnet) ----------
// Det en person vet om en plats i världen är en lärdom av slaget ort (LARDOMAR i minne.ts): platsens nummer (a), nivån (v, en
// rad i ORTNIVA: rykte, känt eller besökt), säkerheten (c), tiden då uppgifterna senast hördes (t) och för ett rykte den som
// först berättade (fr), som ryktets förskjutning räknas ur. En person minns högst ORT.max platser, och det minst säkra trängs
// undan. Att höra om en plats igen, på samma eller en högre nivå, stärker minnet.
import { balans } from './balans';
import { byId } from './folk';
import { findL, MINNE, trimLardomar } from './minne';
import { LANDMARKEN, varldPlatsNr } from './landmarken';
import { Lardom, Person, State } from './typer';

export const ORT = balans('ort', {
  max: 10, // så många platser i världen minns en person högst (utöver de andra lärdomarna); det minst säkra trängs undan
});

// nivåerna: vad personen vet om platsen. Ett led i berättandet tar bort en nivå (steg 11.4.4)
export interface OrtNivaDef { namn: string; text: string }
export const ORTNIVA = [
  { namn: 'Rykte', text: 'har hört talas om' }, // ungefär var, och bara sorten och namnet
  { namn: 'Känt', text: 'vet var den ligger' },
  { namn: 'Besökt', text: 'har varit där' },
] as const satisfies readonly OrtNivaDef[];
export const O_RYKTE = 0, O_KANT = 1, O_BESOKT = 2;

// p lär sig om platsen nr på nivån niva med säkerheten c; uppgifterna är från tiden t (nu om inget anges), av src (den som
// berättade) eller själv, och fr är den som först berättade ett rykte
export function larOrt(s: State, p: Person, nr: number, niva: number, c: number, o: { t?: number; src?: number; led?: number; fr?: number } = {}): Lardom {
  const t = o.t ?? s.now, led = o.led ?? (o.src === undefined ? 0 : 1), e = findL(p, 'ort', nr);
  if (e) {
    if (niva > e.v) { e.v = niva; e.c = Math.max(e.c, c); if (niva > O_RYKTE) delete e.fr; }
    else e.c = niva === e.v ? Math.max(e.c, c, e.c + MINNE.berattaStark * (1 - e.c)) : Math.min(1, e.c + MINNE.berattaStark * (1 - e.c)); // att höra om det igen stärker minnet
    if (t > e.t) { e.t = t; e.src = o.src; e.led = led; if (o.src === undefined) delete e.src; }
    return e;
  }
  const l: Lardom = { k: 'ort', a: nr, v: niva, c, t, led, ...(o.src !== undefined ? { src: o.src } : {}), ...(niva === O_RYKTE && o.fr !== undefined ? { fr: o.fr } : {}) };
  (p.lardomar ??= []).push(l);
  trimLardomar(s, p);
  return l;
}
// nivån p har för platsen nr (undefined: okänd)
export const ortNiva = (p: Person, nr: number): number | undefined => findL(p, 'ort', nr)?.v;

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
