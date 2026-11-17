// ---------- sällskapet och resan (steg 11.5.2–, Flera samhällen: Sällskapet, Packningen i tal, Farten i tal) ----------
// Ett sällskap är en post i världen (vl.sallskap): en ledare och medlemmar (byborna som reser, borta från byn under resan,
// ute.ts), djur och fordon, ett mål (en plats i världen) och ett skäl (en rad i registret RESMAL), ett skede (samlas, packar,
// ute, framme, hemåt, hemma), en plats på vägen, en gemensam packning i hela saker och en bok över insatserna. Talen för resan
// står i blocket RESA. Ingen person är med i två sällskap.
import { balans } from './balans';
import { LandmarkId } from './landmarken';
import { Person, State } from './typer';
import { Varlden } from './varlden';

export const RESA = balans('resa', {
  samlaSek: 3600, // så länge (sekunder i verkligheten) ledaren får samla sällskapet innan resan ställs in (en timme, ett kvarts dygn i spelet)
});

// skälen att resa: namnet, vilka sorters platser som är ett mål, och hur länge (dygn) sällskapet stannar framme
export interface ResmalDef { namn: string; mal: readonly LandmarkId[]; stannar: number }
export const RESMAL = {
  handel: { namn: 'Handel', mal: ['by', 'handelslager'], stannar: 1 },
  uppdrag: { namn: 'Uppdrag', mal: ['by', 'ruin', 'helig', 'gravhog', 'runsten', 'fyndplats', 'utpost'], stannar: 1 },
  turne: { namn: 'Turné', mal: ['by'], stannar: 1 },
  slakt: { namn: 'Besök hos släkt', mal: ['by'], stannar: 2 },
  se: { namn: 'Se en plats', mal: ['ruin', 'helig', 'gravhog', 'runsten', 'fyndplats', 'karavanrest', 'rastplats', 'by', 'handelslager', 'utpost'], stannar: 0.25 },
  sandebud: { namn: 'Sändebud', mal: ['by'], stannar: 1 },
} as const satisfies Record<string, ResmalDef>;
export type ResmalId = keyof typeof RESMAL;
export const RESMAL_IDS = Object.keys(RESMAL) as ResmalId[];

export type Skede = 'samlas' | 'packar' | 'ute' | 'framme' | 'hemat' | 'hemma';
// en insats i boken: vem som äger den, saken (eller djuret) och hur många, i hela saker, och värdet när resan började
export interface Insats { agare: number | 'by'; sak: string; n: number; varde: number; djur?: number }
export interface Sallskap {
  id: number; by: number; // sällskapets nummer och raden det kommer från
  ledare: number; medl: number[]; djur: number[]; fordon: string[]; // personernas och djurens id (ledaren är en av medlemmarna)
  mal: number; skal: ResmalId; skede: Skede; // målets plats i världen, skälet och skedet
  borjan: number; t: number; // när ledaren började samla, och tiden sällskapet räknats till
  ruta?: number; vag?: { fran: number; till: number; steg: string }; pos?: number; // rutan sällskapet är på, vägen och hur långt längs den (rutor)
  pack: Record<string, number>; // den gemensamma packningen, hela saker
  insatser: Insats[];
  dagbok: [number, string][]; // resans dagbok (steg 11.5.13)
}

// ett nytt sällskap med ledaren som första medlem; det samlas tills det packar
export function nyttSallskap(s: State, ledare: Person, mal: number, skal: ResmalId): Sallskap | undefined {
  const vl = s.varld;
  if (!vl || vl.huvud === undefined || sallskapFor(vl, ledare.id)) return undefined;
  const sl: Sallskap = { id: vl.nastaSallskap = (vl.nastaSallskap ?? 0) + 1, by: vl.huvud, ledare: ledare.id, medl: [ledare.id], djur: [], fordon: [], mal, skal, skede: 'samlas', borjan: s.now, t: s.now, pack: {}, insatser: [], dagbok: [] };
  (vl.sallskap ??= []).push(sl);
  return sl;
}
// sällskapet en person är med i (inte de som kommit hem)
export const sallskapFor = (vl: Varlden | undefined, id: number) => vl?.sallskap?.find(x => x.skede !== 'hemma' && x.medl.includes(id));
// en till följer med medan sällskapet samlas
export function foljMed(vl: Varlden, sl: Sallskap, p: Person) {
  if (sl.skede !== 'samlas' || sallskapFor(vl, p.id)) return false;
  sl.medl.push(p.id);
  return true;
}
// ett djur följer med (ett packdjur, en häst)
export function djurMed(sl: Sallskap, djurId: number) { if (!sl.djur.includes(djurId)) sl.djur.push(djurId); }
// de sällskap som är på väg, framme eller packar (inte de som kommit hem)
export const sallskapNu = (vl: Varlden | undefined) => (vl?.sallskap ?? []).filter(x => x.skede !== 'hemma');
