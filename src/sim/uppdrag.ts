// ---------- uppdragen (steg 11.8.1, Flera samhällen: Uppdragen i tal) ----------
// Registret UPPDRAG säger hur en plats eller en nöd blir ett resmål: utlösaren (händelsen där uppdraget uppstår, aldrig en egen
// slump), platsen (landmärkets sorter, eller närområdet), vem som utlyser, belöningen (det någon lagt undan, eller platsens
// innehåll i hela saker), kravet (det som avgör vilka ledaren kallar, steg 11.8.5), tiden ett utlyst uppdrag gäller och vad som
// sker på platsen. Ett fynd (ruinskatten, karavanen, graven, det vaktade föremålet) är ingen post: det är platsens innehåll
// (VarldPlats.inne) och finns så länge det finns kvar. Bara det som någon utlyst är en egen post (Utlyst, vl.uppdrag), och den
// tar slut av sin tid: belöningen som lagts undan går då tillbaka till den som utlyste. Talen står i blocket UPPDRAGTAL.
import { balans } from './balans';
import { alive, count } from './folk';
import { put } from './lager';
import { LandmarkId, varldPlatsNr } from './landmarken';
import { radNr } from './radtal';
import { laggTillRad, tillGrupp } from './utpost';
import { grundvarde } from './varde';
import { KOHANDELSER, laggIKo } from './varldslag';
import { Varlden } from './varlden';
import { DAY, State } from './typer';
import { lever } from './rad';

export const UPPDRAGTAL = balans('uppdrag', {
  tid: 5, // ett utlyst uppdrag gäller så många dygn (år i spelet) om inte raden säger annat
  vilseTid: 1, // vilsegången gäller ett dygn: sedan finns inget att leta efter
});

// vem som utlyser: en anhörig eller en annan person (ur det hen har över), styret (ur budgetens del för uppdrag), kyrkan (ur
// sitt förråd), eller ingen (fyndet är sin egen belöning)
export type UtlysarId = 'anhorig' | 'person' | 'styre' | 'kyrka' | 'ingen';
// det som avgör vilka ledaren kallar (steg 11.8.5)
export type UppdragKrav = 'bara' | 'styrka' | 'mod' | 'sparning';
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
  vaktat: { namn: 'Det vaktade föremålet', utlosare: 'gomd', plats: ['gomma', 'ruin'], utlysare: ['ingen'], belon: 'innehall', krav: 'styrka', gor: 'strida', text: 'det som vaktas vid {plats}' },
  hjalp: { namn: 'Hjälp på en plats', utlosare: 'nod', plats: ['by'], utlysare: ['styre', 'kyrka'], belon: 'utlyst', krav: 'styrka', gor: 'hjalpa', text: 'att hjälpa {plats}' },
  leverans: { namn: 'Leveransen', utlosare: 'brist', plats: ['by'], utlysare: ['person', 'styre'], belon: 'utlyst', krav: 'sparning', gor: 'leverera', text: 'att föra en sak till {plats}' },
} as const satisfies Record<string, UppdragDef>;
export type UppdragId = keyof typeof UPPDRAG;
export const UPPDRAG_IDS = Object.keys(UPPDRAG) as UppdragId[];
export const uppdragDef = (k: UppdragId): UppdragDef => UPPDRAG[k];

// den som utlyst: en person i huvudbyn (id), huvudbyns styre eller kyrka, eller en by i världen (radens nummer)
export interface Utlysare { k: UtlysarId; person?: number; rad?: number }
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
    const agare = u.av.person !== undefined && s.people.some(p => p.id === u.av.person && alive(p)) ? u.av.person : undefined;
    put(s, k, n, agare !== undefined ? { [agare]: n } : undefined); // huvudbyn: tillbaka till personen, annars till byn
  }
  u.belon = {};
}
// tiden är ute
KOHANDELSER.uppdragSlut = (s, vl, p) => { const u = p.sak !== undefined ? uppdragNr(vl, p.sak) : undefined; if (u) avslutaUppdrag(s, vl, u, false); };
