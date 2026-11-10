// Rätterna (system 9.6, Mat, matlagning och dryck): ingrediensgrupperna, måltidernas nivåer, sätten att laga mat och
// rätterna som blir av dem. Bara register och tal här, utan andra filer i spelet, så att saker.ts kan lägga rätterna bland
// sakerna; matlagningen (koka i lerkrukan, grilla) står i matlagning.ts och det man äter i behov.ts.
import type { SakDef } from './saker';

// ---------- ingrediensgrupperna (steg 9.6.1) ----------
// varje råvara hör till en eller flera grupper. Gruppen avgör måltidens nivå (MALTIDSNIVA), och rättens huvudingrediens
export const MATGRUPPER = {
  starkelse: { namn: 'Stärkelse', tecken: '🟫' },
  protein: { namn: 'Protein', tecken: '🍖' },
  gront: { namn: 'Grönt', tecken: '🍃' },
  sott: { namn: 'Sött', tecken: '🫐' },
  smak: { namn: 'Smak', tecken: '🧂' },
  fett: { namn: 'Fett', tecken: '🧈' },
} satisfies Record<string, { namn: string; tecken: string }>;
export type Matgrupp = keyof typeof MATGRUPPER;
export const MATGRUPP_LIST = Object.keys(MATGRUPPER) as Matgrupp[];
// råvarorna och deras grupper. En ny råvara blir en rad här (och en sak i saker.ts). huvud = vilket slags huvudingrediens den
// är i en rätt (RATT_HUVUD), i den ordning huvudingrediensen väljs: kött och fisk, säd och rötter, grönt och bär
export const INGREDIENSER: Record<string, { grupper: Matgrupp[]; huvud?: RattHuvud }> = {
  vilt: { grupper: ['protein', 'fett'], huvud: 'kott' }, fagel: { grupper: ['protein'], huvud: 'kott' },
  kott: { grupper: ['protein', 'fett'], huvud: 'kott' }, vargkott: { grupper: ['protein', 'fett'], huvud: 'kott' },
  torrkott: { grupper: ['protein', 'fett'], huvud: 'kott' }, grillkott: { grupper: ['protein', 'fett'], huvud: 'kott' },
  fisk: { grupper: ['protein'], huvud: 'fisk' }, abborre: { grupper: ['protein'], huvud: 'fisk' }, gaddkott: { grupper: ['protein'], huvud: 'fisk' },
  gadda: { grupper: ['protein'], huvud: 'fisk' }, mortkott: { grupper: ['protein', 'fett'], huvud: 'fisk' }, mort: { grupper: ['protein', 'fett'], huvud: 'fisk' },
  torrfisk: { grupper: ['protein'], huvud: 'fisk' }, torrgadda: { grupper: ['protein'], huvud: 'fisk' }, torrmort: { grupper: ['protein', 'fett'], huvud: 'fisk' },
  grillfisk: { grupper: ['protein'], huvud: 'fisk' }, grillgadda: { grupper: ['protein'], huvud: 'fisk' }, grillmort: { grupper: ['protein', 'fett'], huvud: 'fisk' },
  agg: { grupper: ['protein', 'fett'] }, arter: { grupper: ['protein', 'starkelse'] },
  rotter: { grupper: ['starkelse'], huvud: 'rot' }, rovor: { grupper: ['starkelse'], huvud: 'rot' },
  svamp: { grupper: ['gront'], huvud: 'svamp' },
  bar: { grupper: ['sott'], huvud: 'bar' },
  rolleka: { grupper: ['smak'] },
  talg: { grupper: ['fett'] },
};
export const grupperAv = (k: string): Matgrupp[] => INGREDIENSER[k]?.grupper ?? [];

// ---------- måltidernas nivåer (steg 9.6.2) ----------
// nivån avgörs av hur många grupper som ingår och hur maten lagats; humor = tanken när man ätit den (festmåltiden, fyra grupper
// eller fler, kommer i 10.5.25). Det råa köttets och den råa fiskens minus står i matlagning.ts (ratt)
export const MALTIDSNIVA = {
  ratt: { namn: 'Rått', humor: 0, tanke: '' },
  enkel: { namn: 'Enkel', humor: 0, tanke: '' },
  lagad: { namn: 'Lagad', humor: 0.03, tanke: 'Åt en lagad måltid' },
  fin: { namn: 'Fin', humor: 0.06, tanke: 'Åt en fin måltid' },
} satisfies Record<string, { namn: string; humor: number; tanke: string }>;
export type Maltidsniva = keyof typeof MALTIDSNIVA;
export const MALTIDSNIVA_LIST = Object.keys(MALTIDSNIVA) as Maltidsniva[];
// nivån för en lagad rätt med de här grupperna: två grupper är lagad, tre med smak bland dem är fin
// nivån på en sak man äter: rätten i krukan har sin, det grillade och torkade är enkelt, annars är det rått
export const maltidsNiva = (k: string): Maltidsniva => rattInfo(k)?.niva ?? (/^(grill|torr)/.test(k) ? 'enkel' : 'ratt');
const NIVA_ORDNING: Maltidsniva[] = ['ratt', 'enkel', 'lagad', 'fin'];
// den högsta nivån i det som ätits (per = av varje slag, behov.ts)
export function basta(per: Record<string, number>): Maltidsniva {
  let b: Maltidsniva = 'ratt';
  for (const k in per) if (per[k] > 0 && NIVA_ORDNING.indexOf(maltidsNiva(k)) > NIVA_ORDNING.indexOf(b)) b = maltidsNiva(k);
  return b;
}
export const nivaAvGrupper = (g: Set<Matgrupp>): Maltidsniva => g.size >= 3 && g.has('smak') ? 'fin' : g.size >= 2 ? 'lagad' : 'enkel';

// ---------- tillagningen och kategorierna (steg 9.6.3) ----------
// sätten att laga mat: vad som behövs, tekniken och vilka kategorier det ger. Grillen är grillställningen över elden
// (matlagning.ts), kokningen en mellanstor lerkruka i elden
export const TILLAGNING = {
  grilla: { namn: 'Grilla', behover: 'Grillställningen och elden', tek: 'grill', kategorier: ['grillat'], gor: 'En råvara i taget över elden. Rätten blir enkel' },
  koka: { namn: 'Koka', behover: 'En mellanstor lerkruka i elden', tek: 'kruka', kategorier: ['gryta', 'soppa', 'grot'], gor: 'Två eller tre grupper i krukan, som står på elden utan kocken. Kokningen dödar smitta' },
} satisfies Record<string, { namn: string; behover: string; tek: string; kategorier: string[]; gor: string }>;
// kategorierna: namnet efter huvudingrediensen, symbolen och hur länge rätten står på elden (minuter, passiv tid)
export const KATEGORIER = {
  grillat: { namn: 'grillat', tecken: '🔥', passiv: 0 },
  gryta: { namn: 'gryta', tecken: '🏺', passiv: 10 },
  soppa: { namn: 'soppa', tecken: '🍽', passiv: 15 },
  grot: { namn: 'gröt', tecken: '🍽', passiv: 5 },
} satisfies Record<string, { namn: string; tecken: string; passiv: number }>;
export type Kategori = keyof typeof KATEGORIER;
// huvudingredienserna, i den ordning de väljs, och kategorierna de kan bli i krukan (den första när rätten har stärkelse,
// annars den sista)
export const RATT_HUVUD = {
  kott: { namn: 'Kött', kat: ['gryta', 'soppa'] },
  fisk: { namn: 'Fisk', kat: ['gryta', 'soppa'] },
  rot: { namn: 'Rot', kat: ['grot'] },
  svamp: { namn: 'Svamp', kat: ['soppa'] },
  bar: { namn: 'Bär', kat: ['grot'] },
} satisfies Record<string, { namn: string; kat: Kategori[] }>;
export type RattHuvud = keyof typeof RATT_HUVUD;
export const RATT_HUVUD_LIST = Object.keys(RATT_HUVUD) as RattHuvud[];

// rätten i krukan: huvudingrediensen, kategorin, nivån och om den håller länge (lang, steg 9.6.7: av torkade råvaror)
export const rattId = (h: RattHuvud, k: Kategori, n: Maltidsniva, lang = false) => `r_${h}_${k}_${n}${lang ? '_l' : ''}`;
export interface RattInfo { huvud: RattHuvud; kat: Kategori; niva: Maltidsniva; lang: boolean }
export function rattInfo(id: string): RattInfo | undefined {
  const m = /^r_(\w+?)_(\w+?)_(lagad|fin)(_l)?$/.exec(id);
  return m ? { huvud: m[1] as RattHuvud, kat: m[2] as Kategori, niva: m[3] as Maltidsniva, lang: !!m[4] } : undefined;
}
// rättens namn: huvudingrediensen och kategorin, med nivån efter (Fiskgryta · Fin)
export const rattNamn = (h: RattHuvud, k: Kategori, n: Maltidsniva) => `${RATT_HUVUD[h].namn}${KATEGORIER[k].namn} · ${MALTIDSNIVA[n].namn}`;
export const RATT = {
  tankeTim: 6, // tanken efter en lagad eller fin måltid varar så många timmar (steg 9.6.2)
  portioner: 4, // en sats i krukan ger så många portioner
  huvud: 2, andra: 2, smak: 1, // av huvudingrediensen, den andra gruppen och smaken
  haller: 3, // en rätt håller så många dygn (år i spelet) ...
  hallerLang: 10, // ... och så många när huvudingrediensen är torkad (steg 9.6.7: medelvärdet av ingrediensernas hållbarhet)
};
// rätterna som saker (saker.ts): en rad per huvudingrediens, kategori och nivå, och en som håller längre
const NARING: Record<RattHuvud, SakDef['naring']> = {
  kott: { protein: 1.6, fett: 0.8, energi: 1.1, mineral: 0.6, vitamin: 0.6 },
  fisk: { protein: 1.6, fett: 0.6, energi: 1, mineral: 0.7, vitamin: 0.6 },
  rot: { energi: 1.4, mineral: 0.6, vitamin: 0.9, protein: 0.4, fett: 0.2 },
  svamp: { protein: 0.6, mineral: 0.8, vitamin: 1, energi: 0.9, fett: 0.2 },
  bar: { energi: 1.1, vitamin: 1.6, mineral: 0.4, protein: 0.2, fett: 0.1 },
};
export function rattSaker(): Record<string, SakDef> {
  const ut: Record<string, SakDef> = {};
  for (const h of RATT_HUVUD_LIST) for (const k of RATT_HUVUD[h].kat) for (const n of ['lagad', 'fin'] as Maltidsniva[]) for (const lang of [false, true])
    ut[rattId(h, k, n, lang)] = { namn: rattNamn(h, k, n), varde: 1.5, stack: 25, ruta: 75, mapp: 'Mat', mat: lang ? 3.5 : 0.4, naring: NARING[h], haller: lang ? RATT.hallerLang : RATT.haller };
  return ut;
}
export const RATT_SAKER = Object.keys(rattSaker());
