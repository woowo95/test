// Fordonen (steg 10.10.2 och 10.10.3): kälken och släden, och senare vagnen (11.3.6), är rader i registret FORDON. De är till
// för det som är för tungt eller otympligt att bära: det som lyfts med båda händerna (lyft i SAKER, virket) och det ingen orkar
// bära. Bär, grenar och annat smått bärs som förut. Fordonet följer med i bördan (tk.ting, som redskapen på rutan) och ställs i
// förrådet när bördan läggs där. Lasset är vikt, och farten på varje underlag gånger gångfarten: på snö och is full fart, på
// barmark radens bar. Kälken dras av en människa; släden av ett dragdjur (styrka och snabb på artens rad i TAMDJUR), som spänns
// för när turen börjar (Ting.djur), går bredvid den som kör och går tillbaka till hagen efteråt. Lasset är då djurets styrka
// gånger FORDON_TAL.lassPerStyrka och farten gånger djurets snabbhet. Den som hämtar något tungt tar händerna eller det fordon
// och det djur som ger mest per tid (valjFordon)
import { Ting, tingOf, ledigtTing, spand } from './agande';
import { MATERIAL, gridOf, roofed } from './byggnad';
import { markslag } from './mark';
import { paStrak } from './strak';
import type { Fardsatt } from './varldmark';
import { snoSmalt } from './brand';
import { groundOf, tileOf } from './mark';
import { SAKER, viktOf } from './saker';
import { snoPaMarken } from './vader';
import { Person, State, Task, DAY, inMap } from './typer';
import { balans } from './balans';
import { familjOf } from './folk';
import { Tamdjur, tamArt, tamEg, tamdjurOf } from './tamdjur';

// underlaget fordonet går på: en lagd väg, en stig (gångstråket eller bar jord), terrängen, snö och is (steg 11.11.2)
export type Underlag = 'vag' | 'stig' | 'terrang' | 'sno' | 'is';
// en rad: vem som drar, lasset (för den som drar själv) eller lasset per steg av dragdjurets styrka, farten på varje underlag som del
// av gångfarten, om den tar det som körs i byn (det tunga, lyft i SAKER) och färdsättet på världskartan (Fardsatt i varldmark.ts)
export interface FordonRad { sak: string; drar: 'manniska' | 'djur'; lass: number; lassPerStyrka: number; fart: Record<Underlag, number>; tar: boolean; fardsatt?: Fardsatt; namn: string }
export const FORDON_TAL = balans('fordon', {
  kalkeLass: 60, // så mycket vikt kälken rymmer: 3 virke
  kalkeBar: 0.4, // kälkens och slädens fart på barmark, som del av gångfarten (på snö och is: 1)
  lassPerStyrka: 60, // slädens lass för varje steg av dragdjurets styrka: oxen (4) 240, hästen (3) 180 (steg 10.10.3)
  vagnLassPerStyrka: 120, // vagnens lass per steg av styrka: dubbelt så stort som slädens (steg 11.11.2)
  vagnTerrang: 0.5, // vagnens fart i terrängen (på väg och stig: 1)
  vagnSno: 0.1, // vagnens fart i full snö
  packPerStyrka: 20, // packsadelns lass per steg av djurets styrka: hästen (3) 60, oxen (4) 80 (steg 11.11.3)
});
const medar = { vag: FORDON_TAL.kalkeBar, stig: FORDON_TAL.kalkeBar, terrang: FORDON_TAL.kalkeBar, sno: 1, is: 1 };
export const FORDON: Record<string, FordonRad> = {
  kalke: { sak: 'kalke', namn: 'Kälke', drar: 'manniska', lass: FORDON_TAL.kalkeLass, lassPerStyrka: 0, fart: medar, tar: true },
  slade: { sak: 'slade', namn: 'Släde', drar: 'djur', lass: 0, lassPerStyrka: FORDON_TAL.lassPerStyrka, fart: medar, tar: true },
  packsadel: { sak: 'packsadel', namn: 'Packsadel', drar: 'djur', lass: 0, lassPerStyrka: FORDON_TAL.packPerStyrka, fart: { vag: 1, stig: 1, terrang: 1, sno: 1, is: 1 }, tar: false, fardsatt: 'packdjur' }, // på resorna, aldrig i byn (steg 11.11.3)
  vagn: { sak: 'vagn', namn: 'Vagn', drar: 'djur', lass: 0, lassPerStyrka: FORDON_TAL.vagnLassPerStyrka, fart: { vag: 1, stig: 1, terrang: FORDON_TAL.vagnTerrang, sno: FORDON_TAL.vagnSno, is: FORDON_TAL.vagnTerrang }, tar: true, fardsatt: 'vagn' }, // byns egen vagn (steg 11.11.2)
};
export const fordonRad = (k: string) => Object.values(FORDON).find(f => f.sak === k);
// fordonet i en börda: raden, tinget och dragdjuret som är spänt för
export interface IBordan { f: FordonRad; g: Ting; d?: Tamdjur }
export function fordonI(s: State, t?: Task): IBordan | undefined {
  if (!t?.ting?.length) return undefined;
  for (const id of t.ting) {
    const g = tingOf(s).find(q => q.id === id), f = g && fordonRad(g.k);
    if (f) return { f, g, d: g.djur !== undefined ? tamdjurOf(s).find(d => d.id === g.djur) : undefined };
  }
  return undefined;
}
// lasset (vikt) för fordonet med djuret d
export const lassAv = (f: FordonRad, d?: Pick<Tamdjur, 'art'> & { id?: number }) => f.drar === 'djur' ? (d && tamArt(d.art).styrka ? tamEg(d).styrka * f.lassPerStyrka : 0) : f.lass; // individens styrka (steg 10.10.29)
// underlaget på rutan (x, y) utan snön: isen, en lagd väg, en stig (gångstråket eller bar jord) eller terrängen
export function underlag(s: State, x: number, y: number): Exclude<Underlag, 'sno'> {
  const fx = Math.floor(x), fy = Math.floor(y);
  if (!inMap(fx, fy)) return 'terrang';
  const i = tileOf(x, y), g = groundOf(s);
  if (g.tiles[i] === 0) return 'is'; // den som går på vattnet går på is
  const m = gridOf(s).at.get(i)?.m;
  if (m && MATERIAL[m]?.vag) return 'vag';
  return paStrak(s, fx, fy) || markslag(g, i) === 'bar' ? 'stig' : 'terrang';
}
// fordonets fart på rutan (x, y), som del av gångfarten: underlagets, och snöns där det ligger snö som inte smält; gånger djurets snabbhet
export function fordonFart(s: State, f: FordonRad, x: number, y: number, d?: Tamdjur) {
  const djur = f.drar === 'djur' ? (d ? tamEg(d).snabbhet : 1) : 1; // individens snabbhet (steg 10.10.29)
  const u = underlag(s, x, y);
  if (u === 'is') return f.fart.is * djur;
  const sno = roofed(s, x, y) ? 0 : Math.min(1, snoPaMarken(s)) * (1 - snoSmalt(s, x, y));
  return (f.fart[u] * (1 - sno) + f.fart.sno * sno) * djur;
}
export const fartI = (s: State, b: IBordan, x: number, y: number) => fordonFart(s, b.f, x, y, b.d);
// ryms bördan b på ett lass: bara det som lyfts med båda händerna, och högst lasset
export const fordonRyms = (lass: number) => (b: Record<string, number>) => Object.keys(b).every(k => b[k] <= 1e-9 || SAKER[k]?.lyft) && Object.values(b).reduce((a, v) => a + v, 0) <= lass + 1e-9;
export const rymsI = (b: IBordan) => fordonRyms(lassAv(b.f, b.d));
// hur många av saken k ett lass tar
export const fordonTar = (lass: number, k: string) => SAKER[k]?.lyft ? Math.floor((lass + 1e-9) / viktOf(k)) : 0;
// de vuxna dragdjur p får ta: hens egna, familjens och byns, som inte redan drar
export function lediga(s: State, p: Person) {
  const fam = new Set(familjOf(s, p.id).map(q => q.id));
  return tamdjurOf(s).filter(d => tamArt(d.art).styrka && (s.now - d.born) / DAY >= tamArt(d.art).vuxen && (d.agare === undefined || d.agare === p.id || fam.has(d.agare)) && !spand(s, d.id));
}
// p ska hämta saken k vid (x, y), och kan bära iHand av den i händerna: det lediga fordonet (och dragdjuret) som ger mest per tid
// och mer än händerna, eller undefined. Turen fram och tillbaka går i fordonets fart, så det som ges per tid är antalet gånger farten
export function valjFordon(s: State, p: Person, k: string, x: number, y: number, iHand: number, finns = Infinity): { g: Ting; d?: Tamdjur } | undefined {
  if (!SAKER[k]?.lyft) return undefined;
  let bast: { g: Ting; d?: Tamdjur; v: number } | undefined;
  for (const f of Object.values(FORDON)) {
    if (!f.tar) continue; // packsadeln och ridsadeln kör inget i byn
    const g = ledigtTing(s, p, f.sak);
    if (!g) continue;
    for (const d of f.drar === 'djur' ? lediga(s, p) : [undefined]) {
      const v = Math.min(finns, fordonTar(lassAv(f, d), k)) * fordonFart(s, f, x, y, d);
      if (v > iHand + 1e-9 && v > (bast?.v ?? 0) + 1e-9) bast = { g, d, v };
    }
  }
  return bast && { g: bast.g, d: bast.d };
}
// fordonet tas med i bördan, och dragdjuret spänns för: det följer med tills bördan läggs i förrådet (storeTings) eller där p
// står (dropLoad), och går sedan tillbaka till sin hage (stepBete)
export function taFordon(s: State, p: Person, t: Task, id: number, djur?: number) {
  const g = tingOf(s).find(q => q.id === id);
  if (!g) return;
  g.hos = undefined; g.krok = undefined; g.x = g.y = undefined; g.lass = p.id; g.djur = djur; (t.ting ??= []).push(g.id);
  const d = djur !== undefined ? tamdjurOf(s).find(q => q.id === djur) : undefined;
  if (d) { d.x = p.x; d.y = p.y; }
}
// dragdjuret går bredvid den som kör
export function dragdjurBredvid(p: Person, b: IBordan) { if (b.d) { b.d.x = p.x; b.d.y = p.y; } }
