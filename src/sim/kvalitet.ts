import { balans } from './balans';
import { alive, byId, count, franMitt, log, think } from './folk';
import { gauss } from './slump';
import { HOUR, Person, State } from './typer';
import { handelse } from './rykten';

// ---------- kvaliteten (steg 2.2.2) ----------
// Det någon gör blir olika bra: usel, slarvig, normal, fin, mästerverk eller ett perfekt mästerverk (★). Kvaliteten följer
// görarens färdighet i hantverk och lite slump; vid slöjdbänken blir det lite bättre. Den sätts en gång, när saken blir
// klar, och står i tinget eller möbeln som q (index i KVALITET; utan q är saken normal, som allt från före v103).
// Kvalitet har redskap och vapen, kläder och utrustning (bälte, vattensäck, korg) och möbler (mobel i stationer.ts).
// Stationerna (slaktbänk, slöjdbänk, grill, tork, latrin, brasa) har ingen kvalitet (Björn efter v102: det påverkar för
// mycket), inte heller råvaror; husen och maten kan få det senare.
// Vad den gör: hur länge saken håller (haller delar slitaget), vad den är värd (varde, i byten och arv), hur bra den
// fungerar (effekt: vad redskapet ger i arbetet, hur varma kläderna är, hur gott man sover i bädden och hur glad man blir
// av bordet) och görarens humör. Skillnaden mellan slarvig och mästerverk är liten; usel håller mycket kort tid och är
// nästan inget värd, och det perfekta mästerverket har en extra stor bonus som inte följer de andra.
// Senare (3.4.3): byn minns mästerverken och skrattar åt de usla.
export const KV = balans('kvalitet', {
  kunnig: 12, // färdigheten i hantverk delas med detta: 0 = ingen färdighet, 1 = kunnig
  brus: 0.3, // slumpen: högst så här mycket upp eller ner (oftast mycket mindre)
  bank: 0.1, // vid slöjdbänken blir det så här mycket bättre
  smid: 0.1, // den smidiga gör finare arbete: så här mycket gånger (smidigheten − 10) / 10 (steg 3.7.6)
  grans: [0, 0.25, 0.85, 1.3, 1.9], // gränserna mellan nivåerna: under den första usel, sedan slarvig, normal, fin, mästerverk och ★
  haller: [0.3, 0.85, 1, 1.15, 1.3, 2], // hur länge saken håller (slitaget delas med detta), per nivå
  varde: [0.25, 0.8, 1, 1.3, 1.8, 4], // vad den är värd
  effekt: [0.85, 0.95, 1, 1.05, 1.1, 1.3], // hur bra den fungerar
  glad: [-0.04, -0.01, 0, 0.03, 0.06, 0.12], // görarens humör av det hen gjort ...
  gladTim: 24, // ... i så många timmar
});
// nivåerna: namnet och tanken hos den som gjorde saken. Symbolerna ritas i gränssnittet (kvSvg i ikoner.ts)
export const KVALITET = [
  { namn: 'Usel', tanke: 'Skäms över sitt usla arbete' },
  { namn: 'Slarvig', tanke: 'Slarvade med arbetet' },
  { namn: 'Normal', tanke: '' },
  { namn: 'Fin', tanke: 'Nöjd med sitt fina arbete' },
  { namn: 'Mästerverk', tanke: 'Stolt över sitt mästerverk' },
  { namn: 'Perfekt mästerverk', tanke: 'Gjorde ett perfekt mästerverk' },
] as const;
export const NORMAL = 2, MASTERVERK = 4, PERFEKT = 5;

// saken (ett ting eller en möbel) har kvaliteten q; utan q är den normal
export const kvOf = (t?: { q?: number }) => t?.q ?? NORMAL;
export const kvHaller = (t?: { q?: number }) => KV.haller[kvOf(t)];
export const kvVarde = (t?: { q?: number }) => KV.varde[kvOf(t)];
export const kvEffekt = (t?: { q?: number }) => KV.effekt[kvOf(t)];
export const kvNamn = (t?: { q?: number }) => KVALITET[kvOf(t)].namn;

// hur bra det blir som p gör nu: färdigheten, slumpen (kvalitetens egen följd) och slöjdbänken
export function rullaKvalitet(s: State, p: Person, bank: boolean) {
  const v = p.skill.hantverk / KV.kunnig + gauss(s, 'kvalitet', p) * KV.brus + (bank ? KV.bank : 0) + KV.smid * franMitt(p, 'smidighet', s.now);
  let q = 0;
  while (q < KV.grans.length && v >= KV.grans[q]) q++;
  return q;
}
// saken t blev klar och fick sin kvalitet: görarens humör, byns statistik och loggen för mästerverken
export function nyKvalitet(s: State, p: Person, t: { q?: number }, bank: boolean, namn: string) {
  const q = t.q = rullaKvalitet(s, p, bank), k = KVALITET[q];
  count(s, 'kv_' + q);
  if (KV.glad[q]) think(p, k.tanke, KV.glad[q], s.now, KV.gladTim * HOUR);
  if (q >= MASTERVERK) log(s, `${p.name} gjorde ${q === PERFEKT ? 'ett perfekt mästerverk' : 'ett mästerverk'}: ${namn}.`, 'world', [p.id]);
  // de som ser det blir imponerade (eller avundsjuka) och skrattar åt det usla (steg 3.3.1, 3.4.3)
  if (q >= MASTERVERK) handelse(s, p, q === PERFEKT ? 'perfekt' : 'masterverk', undefined, namn.toLowerCase());
  else if (q === 0) handelse(s, p, 'usel', undefined, namn.toLowerCase());
}
// ett mästerverk vars görare är död blir en klenod: byn minns hen genom saken (steg 3.4.3). Ger den döda göraren, annars inget
export function klenod(s: State, t: { q?: number; av?: number }) {
  if (kvOf(t) < MASTERVERK || t.av === undefined) return;
  const p = byId(s, t.av);
  return p && !alive(p) ? p : undefined;
}
