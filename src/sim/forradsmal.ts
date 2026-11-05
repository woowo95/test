// Förråden (steg 6.2.13, "Arbetsordningen (Förråden)" i designdokumentet): registret FORRADSMAL har en rad per resurs med
// två mål. Bufferten är det byn behöver för att klara sig tills den kan hämta mer: under den är resursen ett behov under
// Försörjning (val.ts), och behovet växer ju mer som fattas. Lyxtaket ligger över bufferten: mellan dem fylls resursen bara
// när inget annat finns på Förbättra, och över taket arbetar ingen för den. Målen räknas i dygn som förrådet räcker, och
// räknas om en gång i timmen (och när ledarens påbud om förrådet ändras). Seden Förutseende och påbudet (styre.ts) höjer
// båda. En ny resurs är en ny rad.
// Materialen (steg 6.2.14): grenar, hö, sten, flinta och virke har var sin rad i MATERIALMAL. Bufferten är förbrukningen de
// senaste dygnen (s.forbruk, räknad när något tas ur förrådet i lager.ts) gånger materialDygn, minst radens minsta tal, och
// det som projekten och bygget väntar på. Taket är materialMatt gånger bufferten, aldrig mer än lagerplatserna rymmer. Under
// bufferten är materialet ett behov under Försörjning, och över taket plockar ingen av det (eld.ts, val.ts, projekt.ts).
// Målen räknas en gång i timmen med arbetarna (arbetsTimme i val.ts) och sparas i s.arbBehov, så att alla lägen räknar likadant.
import { balans } from './balans';
import { bitsOf, MATERIAL } from './byggnad';
import { needOf } from './bygg';
import { RESERV } from './ekonomi';
import { FANGST } from './fynd';
import { allows, amountOf, rymd, zonesOf } from './lager';
import { Pabud, pabud } from './styre';
import { HOUR, State } from './typer';

export const FORRAD = balans('forrad', {
  forsiktig: 0.25, // en försiktig by (seden Förutseende eller påbudet) vill ha så mycket större förråd
  behovTomt: 3.2, behovMax: 3.5, // vikten av ett tomt förråd under Försörjning, och den högsta vikten
  // mat: förrådets dygn dämpar vikten ner till Min när förrådet räcker så länge byn vill (bufferten) ...
  matDygn: 1.1, matMin: 0.4,
  matMatt: 2, matMinMatt: 0.04, // ... och sedan vidare ner till MinMatt vid taket, Matt gånger bufferten: då upphör matarbetet nästan (steg 3.10.9)
  vedDygn: 2, vedMin: 0.15, // ... och för ved
  vedMatt: 12, vedMinMatt: 0.01, // över taket (Matt gånger bufferten) sjunker golvet mot MinMatt, som ligger där vid dubbla tiden (steg 6.1.5)
  forbrukDygn: 3, // förbrukningen av ett material räknas över ungefär så här många dygn (ett glidande medel, steg 6.2.14)
  materialDygn: 2, // bufferten av ett material räcker så här många dygn med den förbrukningen ...
  materialMatt: 3, // ... och taket är så här många gånger bufferten
});

export interface Forradsmal {
  dygn: number; // förrådets dygn räknas mot så här många (gånger försiktigheten) ...
  min: number; // ... och vid bufferten väger behovet så här mycket
  matt: number; // lyxtaket: så här många gånger bufferten
  minMatt: number; // vid taket väger behovet så här lite
  pabud: Pabud; // ledarens påbud om förrådet (styre.ts)
}
export const FORRADSMAL = {
  mat: { dygn: FORRAD.matDygn, min: FORRAD.matMin, matt: FORRAD.matMatt, minMatt: FORRAD.matMinMatt, pabud: 'matlager' },
  ved: { dygn: FORRAD.vedDygn, min: FORRAD.vedMin, matt: FORRAD.vedMatt, minMatt: FORRAD.vedMinMatt, pabud: 'vedlager' },
} as const satisfies Record<string, Forradsmal>;
export type Resurs = keyof typeof FORRADSMAL;

// bufferten i dygn för förrådsseden eller påbudet v, och extra (den som anar en hård vinter, motgang.ts)
export const onskatDygn = (k: Resurs, v: number, extra = 0) => { const r = FORRADSMAL[k]; return r.dygn * (1 + FORRAD.forsiktig * v + extra) * (FORRAD.behovTomt - r.min); };

// byns mål, räknade en gång i timmen (inte sparade: de räknas ur påbudet)
interface Mal { key: string; buffert: number; tak: number }
const cache = new WeakMap<State, Record<string, Mal>>();
function mal(s: State, k: Resurs): Mal {
  const v = pabud(s, FORRADSMAL[k].pabud), key = `${Math.floor(s.now / HOUR)}:${v}`, c = cache.get(s) ?? {};
  let m = c[k];
  if (!m || m.key !== key) { const b = onskatDygn(k, v); m = c[k] = { key, buffert: b, tak: FORRADSMAL[k].matt * b }; cache.set(s, c); }
  return m;
}
// bufferten och lyxtaket i dygn. extra: p:s aning om en hård vinter (räknas då direkt)
export const buffert = (s: State, k: Resurs, extra = 0) => extra ? onskatDygn(k, pabud(s, FORRADSMAL[k].pabud), extra) : mal(s, k).buffert;
export const lyxtak = (s: State, k: Resurs, extra = 0) => extra ? FORRADSMAL[k].matt * buffert(s, k, extra) : mal(s, k).tak;

// ---------- materialen (steg 6.2.14) ----------
interface Materialmal {
  min: (s: State) => number; // byn vill alltid ha minst så här mycket (tändmaterialet till elden, flintan)
  vantar?: (s: State) => number; // det som projekten och bygget väntar på
}
// det projekten väntar på, per material: projekt.ts lägger in sin funktion när den laddas (så att filerna inte laddar varandra)
const projektVantar: Record<string, (s: State) => number> = {};
export const vantarPa = (k: Materialslag, f: (s: State) => number) => { projektVantar[k] = f; };
// det bygget saknar av slaget k: väggar och golv som inte är klara eller ska lagas
const byggVantar = (k: string) => (s: State) => { let n = 0; for (const b of bitsOf(s)) if (MATERIAL[b.m].item === k) n += needOf(b); return n; };
const tand = (s: State) => s.fire.lit ? RESERV.tandVill : RESERV.tandVillSlocknad; // tändmaterialet invånarna vill ha
export const MATERIALMAL = {
  grenar: { min: tand, vantar: byggVantar('grenar') },
  torrgras: { min: tand, vantar: byggVantar('torrgras') },
  sten: { min: () => 0 },
  flinta: { min: () => FANGST.flintaMinsta },
  virke: { min: () => 0, vantar: s => projektVantar.virke?.(s) ?? 0 }, // projekt.ts säger vad projekten väntar på (virkeBehov)
} as const satisfies Record<string, Materialmal>;
export type Materialslag = keyof typeof MATERIALMAL;
export const MATERIAL_LIST = Object.keys(MATERIALMAL) as Materialslag[];
export const arMaterial = (k: string): k is Materialslag => k in MATERIALMAL;

const r3 = (x: number) => Math.round(x * 1000) / 1000;
// det som tas ur förrådet av ett material räknas som förbrukat (lager.ts); bränslet till elden räknas inte (veden har sin rad)
export function forbrukat(s: State, k: string, n: number) {
  if (!arMaterial(k) || !n) return;
  const f = s.forbruk ??= {};
  f[k] = Math.max(0, (f[k] ?? 0) + n);
}
// en gång i timmen (timblocket i steg.ts): förbrukningen glöms långsamt, så att den följer de senaste dygnen
export function forbrukTimme(s: State) {
  const f = s.forbruk;
  if (!f) return;
  for (const k in f) { f[k] = r3(f[k] * (1 - 1 / (24 * FORRAD.forbrukDygn))); if (f[k] <= 0) delete f[k]; }
}
// så mycket av slaget k lagerplatserna rymmer
function rymmer(s: State, k: string) {
  let n = 0;
  for (const z of zonesOf(s)) if (allows(z, k)) for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) n += rymd(s, x, y, k);
  return n;
}
// bufferten och taket för varje material, räknade en gång i timmen (arbetsTimme i val.ts): b utan det minsta talet, t taket
export function materialTimme(s: State): Record<string, { b: number; t: number }> {
  const ut: Record<string, { b: number; t: number }> = {};
  for (const k of MATERIAL_LIST) {
    const r: Materialmal = MATERIALMAL[k];
    const b = r3((s.forbruk?.[k] ?? 0) / FORRAD.forbrukDygn * FORRAD.materialDygn + (r.vantar?.(s) ?? 0));
    ut[k] = { b, t: r3(rymmer(s, k)) };
  }
  return ut;
}
// bufferten och taket för materialet k: det minsta talet räknas nu (elden kan ha tänts sedan timmens början)
export function materialBuffert(s: State, k: Materialslag, m = s.arbBehov?.mal?.[k]) {
  return Math.max(MATERIALMAL[k].min(s), m?.b ?? 0);
}
export function materialTak(s: State, k: Materialslag) {
  const m = s.arbBehov?.mal?.[k], b = materialBuffert(s, k, m);
  return Math.max(b, Math.min(FORRAD.materialMatt * b, m?.t ?? Infinity));
}
// är materialet under bufferten (ett behov), eller vid eller över taket (ingen plockar det)? Det man bär räknas med
export const underBuffert = (s: State, k: Materialslag, extra = 0) => amountOf(s, k) + extra < materialBuffert(s, k);
export const overTak = (s: State, k: Materialslag, extra = 0) => amountOf(s, k) + extra >= materialTak(s, k);
