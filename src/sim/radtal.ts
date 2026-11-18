// ---------- raden i tal (steg 11.2.9, Flera samhällen: Raden i tal) ----------
// En by i världen är en rad med hela tal. Registret RADTAL säger hur varje tal läses ur en by som går i simuleringen: folket
// (byborna, också de som är borta), maten i portioner (en vuxens måltid är en portion), rikedomen (samma mått som byns rikedom),
// silvret i förrådet och styrkan (de vuxna i byn som kan slåss, samma som försvaret räknar). Huvudbyn har därför också en rad, som skrivs
// en gång i timmen ur byn (en rad i TAKTER), och en väckt by skrivs senare tillbaka på samma sätt. Att läsa raden ändrar inget i
// byn och drar inget ur dess slump.
import { alive, living } from './folk';
import { bynsNamn } from './bynamn';
import { LandmarkId } from './landmarken';
import { skalaV, troNamn, troOf } from './religion';
import { ledareOf } from './styre';
import { knows, TEKNIK } from './teknik';
import { amountOf, foodOf } from './lager';
import { vuxenKan } from './rovare';
import { Person, State } from './typer';
import { rikedom } from './varde';

export interface RadtalDef { namn: string; las: (s: State) => number }
export const RADTAL = {
  folk: { namn: 'Folk', las: s => s.people.filter(alive).length },
  mat: { namn: 'Mat (portioner)', las: s => Math.floor(foodOf(s)) },
  rikedom: { namn: 'Rikedom', las: s => Math.round(rikedom(s)) },
  silver: { namn: 'Silver', las: s => Math.floor(amountOf(s, 'silver')) },
  styrka: { namn: 'Styrka', las: s => living(s).filter(p => vuxenKan(s, p)).length },
} as const satisfies Record<string, RadtalDef>;
export type RadtalId = keyof typeof RADTAL;
export const RADTAL_IDS = Object.keys(RADTAL) as RadtalId[];

// ---------- bysorterna (steg 11.2.11) ----------
// Vad som gäller en sort av rad: om folket föder barn, om det skaffar egen mat, om det finns en ledare, om den hör till en
// moderby och vad som gör slut på den (folket, tiden, moderbyn eller resursen); plats = sortens rad i LANDMARKEN
export interface BysortDef { namn: string; plats: LandmarkId; folk: boolean; barn: boolean; egenMat: boolean; ledare: boolean; moder: boolean; slut?: 'folk' | 'tid' | 'moder' }
export const BYSORTER = {
  by: { namn: 'By', plats: 'by', folk: true, barn: true, egenMat: true, ledare: true, moder: false },
  rovarlager: { namn: 'Rövarläger', plats: 'rovarlager', folk: true, barn: false, egenMat: false, ledare: true, moder: false, slut: 'folk' }, // lever på byte och löses upp när folket är slut
  handelslager: { namn: 'Handelsläger', plats: 'handelslager', folk: true, barn: false, egenMat: false, ledare: false, moder: false, slut: 'tid' }, // bryts upp vid sin tid
  utpost: { namn: 'Utpost', plats: 'utpost', folk: true, barn: false, egenMat: true, ledare: false, moder: true, slut: 'moder' }, // finns så länge resursen och moderbyn finns
  ruin: { namn: 'Ruin', plats: 'ruin', folk: false, barn: false, egenMat: false, ledare: false, moder: false }, // inget folk, men kan ha saker kvar
} as const satisfies Record<string, BysortDef>;
export type BysortId = keyof typeof BYSORTER;
export const BYSORT_IDS = Object.keys(BYSORTER) as BysortId[];

// en fast person i liten form: namn, kön, född och roll (ledaren, en handlare eller någon huvudbyn träffat); id när personen
// finns i en by som går i simuleringen. Resten byggs ur raden när personen behövs (fas 11.3)
export interface FastPerson { namn: string; kon: 'm' | 'k'; fodd: number; roll: 'ledare' | 'handlare' | 'mott'; id?: number; nyckel?: number; dor?: number } // nyckel och dor (dödsdagen): en fast person i en by i världen (radperson.ts, steg 11.3.10)
// tron i raden: namnet, andelen troende i procent och läggningen från fridsam (0) till krigisk (100)
export interface RadTro { namn: string; andel: number; krig: number; annan?: RadTro } // annan: den näst största tron i byn (steg 11.3.11)

// en by som en rad i världen: de fasta fälten (nummer, sort, namn, plats, när den grundades, raden den kom ur och den den
// lyder under), talen, teknikerna, tron, ledaren och de fasta personerna
export interface VarldRad {
  nr: number; sort: BysortId; namn: string; x?: number; y?: number; grundad: number; fran?: number; lyder?: number;
  t: number; tal: Record<RadtalId, number>; tek: string[]; tro?: RadTro; ledare?: number; fasta: FastPerson[];
  kalla?: number; // fyndplatsen utposten bryter ur (steg 11.6.18, utpost.ts)
  svalt?: number; // senaste svälten (steg 11.3.2, rad.ts)
  kvar?: Record<string, number>; kvarT?: number; // det som finns kvar i en ruin, i hela saker (steg 11.3.8, byflytt.ts), och när det räknades (vittringen, steg 11.8.2)
  besokt?: number[]; // platserna byns sällskap och handlare besökt (steg 11.4.10, ort.ts)
  hist?: import('./ort').RadBild[]; // byns tal sparade glest, de senaste tätt (steg 11.4.8, ort.ts)
  varor?: Partial<Record<string, number>>; hus?: number; // rikedomen: tillgången per varugrupp utom maten, och husen (steg 11.6.3, priser.ts)
  egen?: Record<string, number>; // de saker vars pris avviker från gruppen: sakens eget påslag (steg 11.6.3, priser.ts)
  syn?: import('./klaner').Klan; // huvudbyns förbindelse med byn: hållningen, de namngivna personerna och priserna (steg 11.2.15, grannbyar.ts)
}
// det radens regler (rad.ts) säger om en ny rad; rad.ts sätter det när den laddas, så att filerna som skapar rader inte
// behöver ladda reglerna
export const radKrok = { startMat: (_folk: number) => 0, startTek: (): string[] => [], utflytt: (_s: State, _n: number) => {}, nybyggare: (_s: State, _n: number): VarldRad | null | undefined => undefined }; // utflytt: de som lämnar huvudbyn (byflytt.ts, steg 11.3.5); nybyggare: byn de kommer ur, null om ingen by kan skicka dem, undefined utan värld (steg 11.6.13)
const fast = (p: Person, roll: FastPerson['roll']): FastPerson => ({ namn: p.name, kon: p.sex, fodd: p.born, roll, id: p.id });
// tron flest bybor har, och den näst största som annan
function radTro(s: State): RadTro | undefined {
  const folk = s.people.filter(alive), n = new Map<number, number>();
  for (const p of folk) if (p.tro !== undefined) n.set(p.tro, (n.get(p.tro) ?? 0) + 1);
  const ord = [...n].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const som = ([id, m]: [number, number]): RadTro | undefined => { const tr = troOf(s, id); return tr ? { namn: troNamn(tr), andel: Math.round(100 * m / Math.max(1, folk.length)), krig: Math.round(skalaV(tr, 'krig') ?? 50) } : undefined; };
  const forsta = ord[0] && som(ord[0]), andra = ord[1] && som(ord[1]);
  if (forsta && andra) forsta.annan = andra;
  return forsta;
}
// de fasta fälten och listorna ur en by som går i simuleringen (sorten och raden den kom ur ändras inte)
function lasFasta(s: State, r: VarldRad) {
  const folk = s.people.filter(alive), led = ledareOf(s);
  r.namn = bynsNamn(s);
  r.tek = TEKNIK.filter(t => folk.some(p => knows(p, t.id))).map(t => t.id);
  const tro = radTro(s);
  if (tro) r.tro = tro; else delete r.tro;
  r.fasta = led ? [fast(led, 'ledare')] : [];
  if (led) r.ledare = 0; else delete r.ledare; // ledaren är den fasta personen på den platsen
}

// talen läses ur en by som går i simuleringen
export function lasRad(s: State): Record<RadtalId, number> {
  const tal = {} as Record<RadtalId, number>;
  for (const k of RADTAL_IDS) tal[k] = RADTAL[k].las(s);
  return tal;
}
// raden med numret nr, ur ett register som räknas en gång per lista och längd (rader läggs bara till)
const radReg = new WeakMap<VarldRad[], { n: number; m: Map<number, VarldRad> }>();
export function radNr(vl: { rader?: VarldRad[] }, nr: number | undefined): VarldRad | undefined {
  const l = vl.rader;
  if (!l || nr === undefined) return undefined;
  let c = radReg.get(l);
  if (!c || c.n !== l.length) radReg.set(l, c = { n: l.length, m: new Map(l.map(r => [r.nr, r])) });
  return c.m.get(nr);
}
// huvudbyns rad i världen (den första gången får den ett nummer)
export function huvudRad(s: State): VarldRad | undefined {
  const vl = s.varld;
  if (!vl) return undefined;
  vl.rader ??= [];
  let r = vl.rader.find(x => x.nr === vl.huvud);
  if (!r) {
    r = { nr: vl.huvud = (vl.nastaRad ?? 0) + 1, sort: 'by', namn: '', grundad: s.founded, t: s.now, tal: lasRad(s), tek: [], fasta: [] };
    lasFasta(s, r);
    vl.nastaRad = r.nr; vl.rader.push(r);
  }
  return r;
}
// en gång i timmen (TAKTER): huvudbyns rad skrivs ur byn, talen och de fasta fälten
export function skrivHuvudRad(s: State) {
  const r = huvudRad(s);
  if (!r) return;
  r.t = s.now; r.tal = lasRad(s); lasFasta(s, r);
  const p = s.varld!.platser?.find(q => q.by === r.nr);
  if (p) p.namn = r.namn; // huvudbyns plats heter som byn
}
