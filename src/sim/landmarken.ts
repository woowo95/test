// ---------- landmärkena (steg 11.2.8, Flera samhällen: Världen i tal: landmärkena) ----------
// Allt som har en plats i världen är en rad i registret LANDMARKEN: namnet, tecknet på världskartan, vilken mark den får
// ligga på, minsta avstånd till andra platser, om den är tillfällig och vad den gör med kostnaden på sin ruta. En plats är en post i världen (Varlden.platser): nummer,
// sort, ruta, namn, eget frö, när den uppstod, när den upphör och vilken by den hör till. Bron tar bort flodens kostnad och
// släpper över vagnen, spången tar bort myrens (men en vagn kommer inte fram på den), och den röjda passagen gör tät skog
// till skog. Var platserna läggs ut
// avgörs i steg 11.2.13 och 11.2.14.
import { hash3 } from './slump';
import { FLOD_NEDRE, FLOD_OVRE, Fardsatt, MARK_IDS, MarkDef, MarkId, VARLD, VARLDMARK, VarldMark } from './varldmark';
import { Varlden } from './varlden';
import { NAMNSLAG, varldNamn } from './varldnamn';
import { laggIKo } from './varldslag';

export interface LandmarkDef {
  namn: string;
  tecken: string; // tecknet på världskartan (ritas i steg 11.2.16)
  mark: readonly MarkId[]; // marken platsen får ligga på
  avst: number; // minsta avstånd i världsrutor till en annan plats
  tillfallig?: true; // platsen upphör (ett läger bryts upp, en gömma töms)
  flodFri?: true; // tar bort flodens kostnad och släpper över vagnen (bron)
  blir?: Partial<Record<MarkId, MarkId>>; // gör rutans mark till en annan när man går (den röjda passagen)
  kostnad?: Partial<Record<MarkId, number>>; // kostnaden att gå på marken, utan att fler färdsätt kommer fram (spången)
  hemlig?: true; // syns inte på världskartan förrän byn har ett rykte om den (ort.ts, steg 11.4.7)
  folk?: true; // en plats med folk (en by, ett läger): inte känd i närområdet, byn får veta om den genom någon (ort.ts, steg 11.4.2)
  karta?: true; // sällskapet som kommer fram går in på en liten karta för platsen (kartreceptet plats, vacktplats.ts, steg 11.13.25)
  tathet?: number; // chansen per landruta att platsen finns när världen skapas (placering.ts, steg 11.2.14); utan: den uppstår i spelet
}
const LAND: readonly MarkId[] = ['slatt', 'skog', 'tat', 'myr', 'berg'];
export const LANDMARKEN = {
  by: { namn: 'By', tecken: 'hus', mark: ['slatt', 'skog'], avst: 1, folk: true }, // inte på en annan bys karta; hur nära grannen ligger säger ingen regel
  handelslager: { namn: 'Handelsläger', tecken: 'talt', mark: ['slatt', 'skog'], avst: 4, tillfallig: true, folk: true },
  rovarlager: { namn: 'Rövarläger', tecken: 'eldstad', mark: ['skog', 'tat', 'berg'], avst: 4, tillfallig: true, folk: true, karta: true },
  utpost: { namn: 'Utpost', tecken: 'torn', mark: ['slatt', 'skog', 'berg'], avst: 3, folk: true },
  ruin: { namn: 'Ruin', tecken: 'ruin', mark: LAND, avst: 3, karta: true },
  helig: { namn: 'Helig plats', tecken: 'sten', mark: LAND, avst: 3, tathet: 0.004, karta: true },
  gravhog: { namn: 'Gravhög', tecken: 'hog', mark: ['slatt', 'skog'], avst: 2, tathet: 0.005, karta: true },
  runsten: { namn: 'Runsten', tecken: 'runsten', mark: ['slatt', 'skog'], avst: 2, tathet: 0.003, karta: true },
  fyndplats: { namn: 'Fyndplats', tecken: 'kors', mark: LAND, avst: 2, tillfallig: true, tathet: 0.004, karta: true },
  karavanrest: { namn: 'Karavanrest', tecken: 'vagn', mark: LAND, avst: 1, tillfallig: true, karta: true },
  gomma: { namn: 'Gömma', tecken: 'packning', mark: LAND, avst: 1, tillfallig: true, hemlig: true, karta: true },
  bro: { namn: 'Bro', tecken: 'bro', mark: ['slatt', 'skog', 'tat', 'myr'], avst: 1, flodFri: true },
  spang: { namn: 'Spång', tecken: 'spang', mark: ['myr'], avst: 1, kostnad: { myr: 1 } },
  passage: { namn: 'Röjd passage', tecken: 'stubbe', mark: ['tat'], avst: 1, blir: { tat: 'skog' } },
  rastplats: { namn: 'Rastplats', tecken: 'eld', mark: ['slatt', 'skog'], avst: 2, tathet: 0.003, karta: true },
  silvergruva: { namn: 'Silvergruva', tecken: 'gruva', mark: ['berg'], avst: 3 }, // läggs ut av laggGruvor (gruva.ts, steg 11.10.1)
  jarngruva: { namn: 'Järngruva', tecken: 'jarngruva', mark: ['berg'], avst: 3 }, // läggs ut av laggJarngruvor (gruva.ts, steg 12.2.13)
} as const satisfies Record<string, LandmarkDef>;
export type LandmarkId = keyof typeof LANDMARKEN;
export const LANDMARK_IDS = Object.keys(LANDMARKEN) as LandmarkId[];
const def = (k: LandmarkId): LandmarkDef => LANDMARKEN[k];

// en plats i världen
export interface VarldPlats {
  nr: number; k: LandmarkId; x: number; y: number;
  namn: string; // ur namnregistret (varldnamn.ts, steg 11.2.12)
  fro: number; // platsens eget frö, ur världens frö och numret
  fran: number; till?: number; // när den uppstod och när den upphör (tillfälliga platser)
  by?: number; // platsens nummer för byn den hör till
  inne?: Record<string, number>; // innehållet i hela saker (fyndplatsen, steg 11.6.18, utpost.ts)
  grannar?: import('./grannat').Granne[]; // byns grannät (steg 11.2.21, grannat.ts)
}
export const varldPlatser = (vl: Varlden) => vl.platser ??= [];
// platserna efter numret och efter byns rad, räknade en gång per lista och längd; en plats får sin rad (p.by) efter att den
// lagts till, så en saknad eller ändrad rad söks på nytt
const register = new WeakMap<VarldPlats[], { n: number; nr: Map<number, VarldPlats>; by: Map<number, VarldPlats> }>();
function reg(l: VarldPlats[]) {
  let c = register.get(l);
  if (!c || c.n !== l.length) { c = { n: l.length, nr: new Map(l.map(p => [p.nr, p])), by: new Map() }; register.set(l, c); }
  return c;
}
export const varldPlatsNr = (vl: Varlden, nr: number) => vl.platser ? reg(vl.platser).nr.get(nr) : undefined;
// platsen som den finns i världen, eller som byn minns den sedan den tagits bort (minnesplatserna, steg 12.1.146, ort.ts)
export const kandPlats = (vl: Varlden, nr: number) => varldPlatsNr(vl, nr) ?? vl.minnesplatser?.find(p => p.nr === nr);
export function byPlats(vl: Varlden, rad: number): VarldPlats | undefined {
  const l = vl.platser;
  if (!l) return undefined;
  const c = reg(l), p = c.by.get(rad);
  if (p && p.by === rad && p.k !== undefined) return p;
  const q = l.find(x => x.by === rad);
  if (q) c.by.set(rad, q); else c.by.delete(rad);
  return q;
}
// platserna per ruta, räknade en gång per lista och längd (en plats läggs till med push, och tas bort med en ny lista)
const perRuta = new WeakMap<VarldPlats[], { n: number; m: Map<number, VarldPlats[]> }>();
const TOMT: VarldPlats[] = [];
export function varldPlatserPa(vl: Varlden, x: number, y: number): VarldPlats[] {
  const l = vl.platser;
  if (!l) return TOMT;
  let c = perRuta.get(l);
  if (!c || c.n !== l.length) {
    c = { n: l.length, m: new Map() };
    for (const p of l) { const k = p.x * 65536 + p.y, a = c.m.get(k); if (a) a.push(p); else c.m.set(k, [p]); }
    perRuta.set(l, c);
  }
  return c.m.get(x * 65536 + y) ?? TOMT;
}

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
  const p: VarldPlats = { nr, k, x, y, namn: o.namn ?? varldNamn(vl, NAMNSLAG[k], nr), fro: Math.floor(hash3(vl.fro, nr, 0x504c) * 2 ** 31), fran: nu, ...(o.till !== undefined ? { till: o.till } : {}), ...(o.by !== undefined ? { by: o.by } : {}) };
  varldPlatser(vl).push(p);
  if (o.till !== undefined) laggIKo(vl, o.till, 'platsUpphor', { sak: nr }); // en plats med sluttid tas bort vid den tiden (steg 12.1.164, ort.ts)
  return p;
}
// de tillfälliga platser som upphört tas bort
export function platserUpphor(vl: Varlden, nu: number) {
  if (vl.platser?.some(p => p.till !== undefined && p.till <= nu)) vl.platser = vl.platser.filter(p => p.till === undefined || p.till > nu);
}

// vad det kostar att gå in på rutan med ett färdsätt, med platserna där (Infinity: det kommer inte fram); med extra som om en
// plats av den sorten också låg där (en by som väger om den ska bygga en bro, platsbygge.ts)
export function rutKostnad(vl: Varlden, v: VarldMark, i: number, fs: Fardsatt, extra?: LandmarkId): number {
  const x = i % v.w, y = Math.floor(i / v.w), pl0 = varldPlatserPa(vl, x, y), pl: readonly { k: LandmarkId }[] = extra ? [...pl0, { k: extra }] : pl0;
  let m = MARK_IDS[v.mark[i]];
  for (const p of pl) m = def(p.k).blir?.[m] ?? m;
  if (vl.frusen && (VARLDMARK[m] as MarkDef).frys) m = 'slatt'; // den frusna marken i istiden (steg 11.11.8)
  const r = VARLDMARK[m];
  if (!(r.fram as readonly Fardsatt[]).includes(fs)) return Infinity;
  let k: number = r.kostnad;
  for (const p of pl) k = Math.min(k, def(p.k).kostnad?.[m] ?? k);
  const f = v.flod[i];
  if (!f || vl.frusen || pl.some(p => def(p.k).flodFri)) return k; // floden är frusen i istiden (steg 11.11.8)
  if (f === FLOD_NEDRE && fs === 'vagn') return Infinity; // vagnen kommer inte över det breda loppet utan bro
  return k + (f === FLOD_OVRE ? VARLD.flodOvre : VARLD.flodNedre);
}
