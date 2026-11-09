// Striderna mot djur på kartan (steg 9.2.29, "Striderna mot djur på kartan" i designdokumentet). Striden mot björnen, mot
// vargflocken och vargjakten spelas upp som striden med rövarna (6.6.10): djuret är en kämpe med plats, människorna står var
// och en i sin ruta runt det, och striden går i spelets tid. Varje slag räknas striden om från början till tiden som gått
// (spelaUpp i strid.ts), så att den blir likadan i båda lägena och kan ritas på kartan (ui/stridkarta.ts). Skadorna blir
// riktiga först när striden är slut, så ingen vårdas förrän djuret fallit eller gått. Det som händer efteråt skiljer sig per
// djur och står i bjorn.ts och varg.ts (SLUT)
import { avbryt } from './lager';
import { SEC, State, Person } from './typer';
import { STRID, type Avsikt, type Strid, type StridGang, type Uppstallning, spelaUpp } from './strid';
import { byId, count } from './folk';
import { vattenNu } from './sjo';
import { T, inMap } from './typer';
import { isWall } from './byggnad';
import { tileOf } from './mark';

export type DjurStridArt = 'bjorn' | 'varg';
// en strid som pågår: uppställningen (StridGang), när den började (t0) och arenans hörn på kartan (ox, oy), folket (efter
// kämpens ordning) och djuren (id:n, i kämparnas ordning efter folket), avsikten och orsaken, och det djuret behöver efteråt
export interface DjurKamp extends StridGang {
  art: DjurStridArt; t0: number; ox: number; oy: number; folk: number[]; djur: number[]; avsikt: Avsikt; orsak: string;
  ungar?: 1; flock?: number; dx?: number; dy?: number; // dx, dy = där djuret (det första) står just nu
}
// det som händer när striden är slut, per djur (bjorn.ts och varg.ts lägger till sina)
export const SLUT: Partial<Record<DjurStridArt, (s: State, g: DjurKamp, st: Strid) => void>> = {};

const iArenan = (v: number, w: number) => Math.min(w - 0.5, Math.max(0.5, v));
// arenan runt djuret: w × h rutor med djuret i mitten; kämparna får sina platser i arenan ur platserna på kartan
export function arena(x: number, y: number, w: number, h: number) { return { ox: Math.round(x - w / 2), oy: Math.round(y - h / 2), w, h }; }
export const iArena = (a: { ox: number; oy: number; w: number; h: number }, x: number, y: number) => ({ x: iArenan(x - a.ox, a.w), y: iArenan(y - a.oy, a.h) });

// den som slåss står kvar i striden tills den är slut
export function iDjurStriden(s: State, p: Person, g: DjurKamp) {
  if (p.died !== undefined) return; // en död ger sig inte in i striden
  avbryt(s, p);
  p.task = { act: 'strid', phase: 'do', tx: p.x, ty: p.y, until: g.t0 + (STRID.maxTid + 300) * SEC, carry: 0, why: g.orsak };
}
export function borjaDjurStrid(s: State, g: DjurKamp, folk: Person[]) {
  (s.djurStrider ??= []).push(g);
  count(s, 'djurStrid');
  for (const p of folk) iDjurStriden(s, p, g);
  const st = spelaUpp(g, 0), k = st.kampar[folk.length];
  if (k) { g.dx = g.ox + k.x; g.dy = g.oy + k.y; }
}
// striden räknad till tiden nu
export const djurStridNu = (g: DjurKamp, nu: number) => spelaUpp(g, Math.max(0, (nu - g.t0) / SEC));
// en strid med det här djuret som pågår
export const djurIStrid = (s: State, art: DjurStridArt, id?: number) => s.djurStrider?.find(g => g.art === art && (id === undefined || g.djur.includes(id)));
// en ny kämpe ger sig in i striden (den som jagar nära björnstriden, steg 9.2.29)
export function gerSigIn(s: State, g: DjurKamp, p: Person, k: Uppstallning['kampar'][number], st: Strid) {
  (g.in ??= []).push({ t: st.t, k });
  g.folk.push(p.id);
  iDjurStriden(s, p, g);
}

// varje slag (steg.ts): djurets plats följer striden, och när striden är slut blir det som hände riktigt (SLUT)
export function djurStriderSteg(s: State) {
  if (!s.djurStrider?.length) return;
  for (const g of s.djurStrider.slice()) {
    const st = djurStridNu(g, s.now), k = st.kampar.find(q => q.djur && q.lage !== 'borta') ?? st.kampar.find(q => q.djur);
    if (k) { g.dx = g.ox + k.x; g.dy = g.oy + k.y; }
    if (!st.slut) continue;
    s.djurStrider = s.djurStrider.filter(q => q !== g);
    // folket står där striden lämnade dem (den som flydde har sprungit undan), inte i vattnet, i en vägg eller utanför kartan
    g.folk.forEach(id => {
      const p = byId(s, id), kp = st.kampar.find(q => q.pid === id);
      if (!p || !kp) return;
      const x = g.ox + kp.x, y = g.oy + kp.y;
      if (inMap(x, y) && vattenNu(s)[tileOf(x, y)] !== T.Vatten && !isWall(s, x, y)) { p.x = x; p.y = y; } // inte utanför kartan eller i en vägg
    });
    SLUT[g.art]?.(s, g, st);
  }
  if (!s.djurStrider.length) delete s.djurStrider;
}
