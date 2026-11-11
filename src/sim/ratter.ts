// Rätterna (system 9.6, Mat, matlagning och dryck): ingrediensgrupperna, måltidernas nivåer, sätten att laga mat och
// rätterna som blir av dem. Bara register och tal här, utan andra filer i spelet, så att saker.ts kan lägga rätterna bland
// sakerna; matlagningen (koka i lerkrukan, grilla) står i matlagning.ts och det man äter i behov.ts.
import type { SakDef } from './saker';
import { balans } from './balans';

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
  torrfisk: { grupper: ['protein'], huvud: 'fisk' }, rokfisk: { grupper: ['protein'], huvud: 'fisk' }, rokkott: { grupper: ['protein', 'fett'], huvud: 'kott' }, torrgadda: { grupper: ['protein'], huvud: 'fisk' }, torrmort: { grupper: ['protein', 'fett'], huvud: 'fisk' },
  grillfisk: { grupper: ['protein'], huvud: 'fisk' }, grillgadda: { grupper: ['protein'], huvud: 'fisk' }, grillmort: { grupper: ['protein', 'fett'], huvud: 'fisk' },
  braxen: { grupper: ['protein', 'fett'], huvud: 'fisk' }, braxkott: { grupper: ['protein', 'fett'], huvud: 'fisk' }, sik: { grupper: ['protein', 'fett'], huvud: 'fisk' }, sikkott: { grupper: ['protein', 'fett'], huvud: 'fisk' }, // steg 9.6.17
  agg: { grupper: ['protein', 'fett'] }, arter: { grupper: ['protein', 'starkelse'] },
  korn: { grupper: ['starkelse'], huvud: 'sad' }, // steg 9.6.11
  mjol: { grupper: ['starkelse'] }, // steg 9.6.22: till brödet
  brod: { grupper: ['starkelse'] }, // steg 9.6.23
  kal: { grupper: ['gront'] }, bonor: { grupper: ['protein', 'starkelse'] }, // steg 9.7.8
  jordgubbar: { grupper: ['sott'], huvud: 'bar' }, // steg 9.7.9
  appel: { grupper: ['sott'], huvud: 'bar' }, notter: { grupper: ['fett', 'protein'] }, // steg 9.7.13–9.7.14
  rotter: { grupper: ['starkelse'], huvud: 'rot' }, rovor: { grupper: ['starkelse'], huvud: 'rot' },
  svamp: { grupper: ['gront'], huvud: 'svamp' },
  bar: { grupper: ['sott'], huvud: 'bar' },
  rolleka: { grupper: ['smak'] }, salt: { grupper: ['smak'] }, lok: { grupper: ['smak'] }, // löken (steg 9.6.20) // saltet (steg 9.6.19)
  saltfisk: { grupper: ['protein'], huvud: 'fisk' }, saltkott: { grupper: ['protein', 'fett'], huvud: 'kott' },
  talg: { grupper: ['fett'] },
};
export const grupperAv = (k: string): Matgrupp[] => INGREDIENSER[k]?.grupper ?? [];

// ---------- måltidernas nivåer (steg 9.6.2) ----------
// nivån avgörs av hur många grupper som ingår och hur maten lagats; humor = tanken när man ätit den (festmåltiden, fyra grupper
// eller fler, kommer i 10.5.25). Det råa köttets och den råa fiskens minus står i matlagning.ts (ratt)
const MALTID = balans('maltidsniva', {
  lagad: 0.03, // humöret efter en lagad måltid
  fin: 0.06, // och efter en fin måltid
});
export const MALTIDSNIVA = {
  ratt: { namn: 'Rått', humor: 0, tanke: '' },
  enkel: { namn: 'Enkel', humor: 0, tanke: '' },
  lagad: { namn: 'Lagad', humor: MALTID.lagad, tanke: 'Åt en lagad måltid' },
  fin: { namn: 'Fin', humor: MALTID.fin, tanke: 'Åt en fin måltid' },
} satisfies Record<string, { namn: string; humor: number; tanke: string }>;
export type Maltidsniva = keyof typeof MALTIDSNIVA;
export const MALTIDSNIVA_LIST = Object.keys(MALTIDSNIVA) as Maltidsniva[];
// nivån för en lagad rätt med de här grupperna: två grupper är lagad, tre med smak bland dem är fin
// nivån på en sak man äter: rätten i krukan har sin, det grillade och torkade är enkelt, annars är det rått
export const maltidsNiva = (k: string): Maltidsniva => rattInfo(k)?.niva ?? (/^(grill|torr|rok|salt|brod)/.test(k) ? 'enkel' : 'ratt');
const NIVA_ORDNING: Maltidsniva[] = ['ratt', 'enkel', 'lagad', 'fin'];
// den högsta nivån i det som ätits (per = av varje slag, behov.ts)
export function basta(per: Record<string, number>): Maltidsniva {
  let b: Maltidsniva = 'ratt';
  for (const k in per) if (per[k] > 0 && NIVA_ORDNING.indexOf(maltidsNiva(k)) > NIVA_ORDNING.indexOf(b)) b = maltidsNiva(k);
  return b;
}
// variationen (steg 9.6.5): proteinet i det man åt, som ett namn (Fisk, Kött, Ägg, Ärter), eller undefined
export function proteinAv(k: string, namn: (k: string) => string): string | undefined {
  const r = rattInfo(k); if (r) return r.huvud === 'kott' || r.huvud === 'fisk' ? RATT_HUVUD[r.huvud].namn : undefined;
  const i = INGREDIENSER[k]; if (!i?.grupper.includes('protein')) return undefined;
  return i.huvud === 'kott' || i.huvud === 'fisk' ? RATT_HUVUD[i.huvud].namn : namn(k);
}
export const VARIATION = balans('variation', {
  minns: 8, // man minns proteinet i så många måltider ...
  trott: 6, // ... och tröttnar när lika många av dem var samma
  tanke: -0.02, tankeTim: 6, // tanken "Fisk igen": lite, så att en ny by som lever på fisk inte mår dåligt av det
});
// smaken för en rätt gäller huvudingrediensen (steg 9.6.6): fiskgrytan smakar fisk
const SMAK_SAK: Record<RattHuvud, string> = { kott: 'kott', fisk: 'fisk', sad: 'korn', rot: 'rotter', svamp: 'svamp', bar: 'bar' };
export const smakSak = (k: string) => { const r = rattInfo(k); return r ? SMAK_SAK[r.huvud] : k; };
export const nivaAvGrupper = (g: Set<Matgrupp>): Maltidsniva => g.size >= 3 && g.has('smak') ? 'fin' : g.size >= 2 ? 'lagad' : 'enkel';

// ---------- tillagningen och kategorierna (steg 9.6.3) ----------
// sätten att laga mat: vad som behövs, tekniken och vilka kategorier det ger. Grillen är grillställningen över elden
// (matlagning.ts), kokningen en mellanstor lerkruka i elden
export const TILLAGNING = {
  grilla: { namn: 'Grilla', behover: 'Grillställningen och elden', tek: 'grill', kategorier: ['grillat'], gor: 'En råvara i taget över elden. Rätten blir enkel' },
  baka: { namn: 'Baka', behover: 'Bakugnen, mjöl och vatten', tek: 'bakugn', kategorier: ['brod'], gor: 'Degen jäser och gräddas i ugnen utan bagaren. Brödet håller sex dygn' }, // steg 9.6.23
  steka: { namn: 'Steka', behover: 'Stekhällen över elden, och talg', tek: 'stekhall', kategorier: ['stek'], gor: 'Kött eller fisk med talg på den heta stenen. Steken smakar bättre' }, // steg 9.6.21
  koka: { namn: 'Koka', behover: 'En mellanstor lerkruka i elden', tek: 'kruka', kategorier: ['gryta', 'soppa', 'grot'], gor: 'Två eller tre grupper i krukan, som står på elden utan kocken. Kokningen dödar smitta' },
} satisfies Record<string, { namn: string; behover: string; tek: string; kategorier: string[]; gor: string }>;
// kategorierna: namnet efter huvudingrediensen, symbolen och hur länge rätten står på elden (minuter, passiv tid)
export const KATEGORIER = {
  grillat: { namn: 'grillat', tecken: '🔥', passiv: 0 },
  gryta: { namn: 'gryta', tecken: '🏺', passiv: 10 },
  soppa: { namn: 'soppa', tecken: '🍽', passiv: 15 },
  grot: { namn: 'gröt', tecken: '🍽', passiv: 5 },
  stek: { namn: 'stek', tecken: '🔥', passiv: 0 }, // på stekhällen (steg 9.6.21)
  brod: { namn: 'bröd', tecken: '🍽', passiv: 25 }, // degen jäser 20 minuter och gräddas 5 i bakugnen (steg 9.6.23)
} satisfies Record<string, { namn: string; tecken: string; passiv: number }>;
export type Kategori = keyof typeof KATEGORIER;
// huvudingredienserna, i den ordning de väljs, och kategorierna de kan bli i krukan (den första när rätten har stärkelse,
// annars den sista)
export const RATT_HUVUD = {
  kott: { namn: 'Kött', kat: ['gryta', 'soppa'] },
  fisk: { namn: 'Fisk', kat: ['gryta', 'soppa'] },
  sad: { namn: 'Korn', kat: ['grot'] }, // steg 9.6.11
  rot: { namn: 'Rot', kat: ['grot'] },
  svamp: { namn: 'Svamp', kat: ['soppa'] },
  bar: { namn: 'Bär', kat: ['grot'] },
} satisfies Record<string, { namn: string; kat: Kategori[] }>;
export type RattHuvud = keyof typeof RATT_HUVUD;
export const RATT_HUVUD_LIST = Object.keys(RATT_HUVUD) as RattHuvud[];

// rättens hållbarhet (steg 9.6.7): medelvärdet av ingrediensernas, avrundat till närmaste steg här (dygn, år i spelet)
export const HALLER_STEG = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20] as const;
export const hallerSteg = (d: number) => HALLER_STEG.reduce((b, h) => Math.abs(h - d) < Math.abs(b - d) ? h : b, HALLER_STEG[0] as number);
// rätten: huvudingrediensen, kategorin, nivån och hur många dygn den håller (inget tillägg för RATT.haller)
export const rattId = (h: RattHuvud, k: Kategori, n: Maltidsniva, haller: number = RATT.haller) => `r_${h}_${k}_${n}${haller !== RATT.haller ? '_h' + haller : ''}`;
export interface RattInfo { huvud: RattHuvud; kat: Kategori; niva: Maltidsniva; haller: number }
export function rattInfo(id: string): RattInfo | undefined {
  const m = /^r_(\w+?)_(\w+?)_(lagad|fin)(?:_h(\d+))?$/.exec(id);
  return m ? { huvud: m[1] as RattHuvud, kat: m[2] as Kategori, niva: m[3] as Maltidsniva, haller: m[4] ? +m[4] : RATT.haller } : undefined;
}
// rättens namn: huvudingrediensen och kategorin, med nivån efter (Fiskgryta · Fin)
export const rattNamn = (h: RattHuvud, k: Kategori, n: Maltidsniva) => `${RATT_HUVUD[h].namn}${KATEGORIER[k].namn} · ${MALTIDSNIVA[n].namn}`;
export const RATT = {
  ...balans('ratt', {
    tankeTim: 6, // tanken efter en lagad eller fin måltid varar så många timmar (steg 9.6.2)
    portioner: 4, // en sats i krukan ger så många portioner
    huvud: 2, andra: 2, smak: 1, // av huvudingrediensen, den andra gruppen och smaken
    haller: 3, // en rätt av ingredienser som inte ruttnar håller så många dygn (år i spelet); annars medelvärdet av ingrediensernas (HALLER_STEG)
  }),
};
// i vilken ordning rätten äts (mat i saker.ts): den som håller kortast först, och en färsk rätt före den råa maten
const rattMat = (haller: number) => Math.round(Math.min(6, Math.max(0.3, 0.45 * haller - 0.95)) * 100) / 100; // högst 6: det torkade äts sist
// rätterna som saker (saker.ts): en rad per huvudingrediens, kategori och nivå, och en som håller längre
const NARING: Record<RattHuvud, SakDef['naring']> = {
  kott: { protein: 1.6, fett: 0.8, energi: 1.1, mineral: 0.6, vitamin: 0.6 },
  fisk: { protein: 1.6, fett: 0.6, energi: 1, mineral: 0.7, vitamin: 0.6 },
  sad: { energi: 1.6, mineral: 0.7, vitamin: 0.6, protein: 0.6, fett: 0.3 },
  rot: { energi: 1.4, mineral: 0.6, vitamin: 0.9, protein: 0.4, fett: 0.2 },
  svamp: { protein: 0.6, mineral: 0.8, vitamin: 1, energi: 0.9, fett: 0.2 },
  bar: { energi: 1.1, vitamin: 1.6, mineral: 0.4, protein: 0.2, fett: 0.1 },
};
export function rattSaker(): Record<string, SakDef> {
  const ut: Record<string, SakDef> = {};
  const rad = (h: RattHuvud, k: Kategori, n: Maltidsniva, haller: number) => { ut[rattId(h, k, n, haller)] = { namn: rattNamn(h, k, n), varde: 1.5, stack: 25, ruta: 75, mapp: 'Mat', mat: rattMat(haller), naring: NARING[h], haller }; };
  for (const haller of HALLER_STEG) for (const n of ['lagad', 'fin'] as Maltidsniva[]) {
    for (const h of ['kott', 'fisk'] as RattHuvud[]) rad(h, 'stek', n, haller); // steken (steg 9.6.21)
    for (const h of RATT_HUVUD_LIST) for (const k of RATT_HUVUD[h].kat) rad(h, k, n, haller);
  }
  return ut;
}
export const RATT_SAKER = Object.keys(rattSaker());
// utsädet som sparas av fröet k (steg 10.2.32): det fälten byn har och planerar behöver (utsade i odling.ts, satt där)
export const utsadeKrok = { av: (_s: import('./typer').State, _k: string) => 0 };
