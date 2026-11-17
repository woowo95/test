// ---------- landmärkena (steg 11.2.8, Flera samhällen: Världen i tal: landmärkena) ----------
// Allt som har en plats i världen är en rad i registret LANDMARKEN: namnet, tecknet på världskartan, vilken mark den får
// ligga på, minsta avstånd till andra platser, om den är tillfällig, om den har ett innehåll i hela saker (ett fynd), om den
// byggs som ett projekt och vad den gör med kostnaden på sin ruta. En plats är en post i världen (Varlden.platser): nummer,
// sort, ruta, namn, eget frö, när den uppstod, när den upphör och vilken by den hör till. Bron tar bort flodens kostnad och
// släpper över vagnen, spången tar bort myrens (men en vagn kommer inte fram på den), och den röjda passagen gör tät skog
// till skog. Var platserna läggs ut
// avgörs i steg 11.2.13 och 11.2.14.
import { hash3 } from './slump';
import { FLOD_NEDRE, FLOD_OVRE, Fardsatt, MARK_IDS, MarkId, VARLD, VARLDMARK, VarldMark } from './varldmark';
import { Varlden } from './varlden';

export interface LandmarkDef {
  namn: string;
  tecken: string; // tecknet på världskartan (ritas i steg 11.2.16)
  mark: readonly MarkId[]; // marken platsen får ligga på
  avst: number; // minsta avstånd i världsrutor till en annan plats
  tillfallig?: true; // platsen upphör (ett läger bryts upp, en gömma töms)
  fynd?: true; // har ett innehåll i hela saker
  projekt?: true; // byggs som ett projekt
  flodFri?: true; // tar bort flodens kostnad och släpper över vagnen (bron)
  blir?: Partial<Record<MarkId, MarkId>>; // gör rutans mark till en annan när man går (den röjda passagen)
  kostnad?: Partial<Record<MarkId, number>>; // kostnaden att gå på marken, utan att fler färdsätt kommer fram (spången)
}
const LAND: readonly MarkId[] = ['slatt', 'skog', 'tat', 'myr', 'berg'];
export const LANDMARKEN = {
  by: { namn: 'By', tecken: 'hus', mark: ['slatt', 'skog'], avst: 3 },
  handelslager: { namn: 'Handelsläger', tecken: 'talt', mark: ['slatt', 'skog'], avst: 4, tillfallig: true },
  rovarlager: { namn: 'Rövarläger', tecken: 'eldstad', mark: ['skog', 'tat', 'berg'], avst: 4, tillfallig: true },
  utpost: { namn: 'Utpost', tecken: 'torn', mark: ['slatt', 'skog', 'berg'], avst: 3, projekt: true },
  ruin: { namn: 'Ruin', tecken: 'ruin', mark: LAND, avst: 3, fynd: true },
  helig: { namn: 'Helig plats', tecken: 'sten', mark: LAND, avst: 3 },
  gravhog: { namn: 'Gravhög', tecken: 'hog', mark: ['slatt', 'skog'], avst: 2 },
  runsten: { namn: 'Runsten', tecken: 'runsten', mark: ['slatt', 'skog'], avst: 2, projekt: true },
  fyndplats: { namn: 'Fyndplats', tecken: 'kors', mark: LAND, avst: 2, fynd: true, tillfallig: true },
  karavanrest: { namn: 'Karavanrest', tecken: 'vagn', mark: LAND, avst: 1, fynd: true, tillfallig: true },
  gomma: { namn: 'Gömma', tecken: 'packning', mark: LAND, avst: 1, fynd: true, tillfallig: true },
  bro: { namn: 'Bro', tecken: 'bro', mark: ['slatt', 'skog', 'tat', 'myr'], avst: 1, projekt: true, flodFri: true },
  spang: { namn: 'Spång', tecken: 'spang', mark: ['myr'], avst: 1, projekt: true, kostnad: { myr: 1 } },
  passage: { namn: 'Röjd passage', tecken: 'stubbe', mark: ['tat'], avst: 1, projekt: true, blir: { tat: 'skog' } },
  rastplats: { namn: 'Rastplats', tecken: 'eld', mark: ['slatt', 'skog'], avst: 2 },
} as const satisfies Record<string, LandmarkDef>;
export type LandmarkId = keyof typeof LANDMARKEN;
export const LANDMARK_IDS = Object.keys(LANDMARKEN) as LandmarkId[];
const def = (k: LandmarkId): LandmarkDef => LANDMARKEN[k];

// en plats i världen
export interface VarldPlats {
  nr: number; k: LandmarkId; x: number; y: number;
  namn: string; // ur namnregistret (steg 11.2.12); tills dess sortens namn
  fro: number; // platsens eget frö, ur världens frö och numret
  fran: number; till?: number; // när den uppstod och när den upphör (tillfälliga platser)
  by?: number; // platsens nummer för byn den hör till
}
export const varldPlatser = (vl: Varlden) => vl.platser ??= [];
export const varldPlatsNr = (vl: Varlden, nr: number) => vl.platser?.find(p => p.nr === nr);
export const varldPlatserPa = (vl: Varlden, x: number, y: number) => (vl.platser ?? []).filter(p => p.x === x && p.y === y);

// varför en plats inte får ligga där (undefined: den får det)
export function hinder(vl: Varlden, v: VarldMark, k: LandmarkId, x: number, y: number): string | undefined {
  if (x < 0 || y < 0 || x >= v.w || y >= v.h) return 'utanför världen';
  const d = def(k), m = MARK_IDS[v.mark[y * v.w + x]];
  if (!d.mark.includes(m)) return `${d.namn.toLowerCase()} får inte ligga på ${VARLDMARK[m].namn.toLowerCase()}`;
  if (d.flodFri && !v.flod[y * v.w + x]) return 'ingen flod att bygga över';
  for (const p of vl.platser ?? []) if (Math.max(Math.abs(p.x - x), Math.abs(p.y - y)) < Math.max(d.avst, def(p.k).avst)) return `för nära ${def(p.k).namn.toLowerCase()}`;
  return undefined;
}
// en ny plats; undefined om den inte får ligga där
export function laggPlats(vl: Varlden, v: VarldMark, k: LandmarkId, x: number, y: number, nu: number, o: { till?: number; by?: number; namn?: string } = {}): VarldPlats | undefined {
  if (hinder(vl, v, k, x, y)) return undefined;
  const nr = vl.nastaPlats = (vl.nastaPlats ?? 0) + 1;
  const p: VarldPlats = { nr, k, x, y, namn: o.namn ?? def(k).namn, fro: Math.floor(hash3(vl.fro, nr, 0x504c) * 2 ** 31), fran: nu, ...(o.till !== undefined ? { till: o.till } : {}), ...(o.by !== undefined ? { by: o.by } : {}) };
  varldPlatser(vl).push(p);
  return p;
}
// de tillfälliga platser som upphört tas bort
export function platserUpphor(vl: Varlden, nu: number) {
  if (vl.platser?.some(p => p.till !== undefined && p.till <= nu)) vl.platser = vl.platser.filter(p => p.till === undefined || p.till > nu);
}

// vad det kostar att gå in på rutan med ett färdsätt, med platserna där (Infinity: det kommer inte fram)
export function rutKostnad(vl: Varlden, v: VarldMark, i: number, fs: Fardsatt): number {
  const x = i % v.w, y = Math.floor(i / v.w), pl = varldPlatserPa(vl, x, y);
  let m = MARK_IDS[v.mark[i]];
  for (const p of pl) m = def(p.k).blir?.[m] ?? m;
  const r = VARLDMARK[m];
  if (!(r.fram as readonly Fardsatt[]).includes(fs)) return Infinity;
  let k: number = r.kostnad;
  for (const p of pl) k = Math.min(k, def(p.k).kostnad?.[m] ?? k);
  const f = v.flod[i];
  if (!f || pl.some(p => def(p.k).flodFri)) return k;
  if (f === FLOD_NEDRE && fs === 'vagn') return Infinity; // vagnen kommer inte över det breda loppet utan bro
  return k + (f === FLOD_OVRE ? VARLD.flodOvre : VARLD.flodNedre);
}
