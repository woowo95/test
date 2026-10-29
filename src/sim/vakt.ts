// Vakten patrullerar (steg 3.7.4, beslut Björn efter v158): nattens vakt går runt byn hela tiden och stannar bara kort vid
// elden ibland för att värma sig, lägga på ved eller för ett kort samtal. Vakten tar sitt eget bästa vapen eller ett som
// byn äger, aldrig någon annans, och har det i handen hela natten (striden räknar med det, strid.ts: personKampe)
import { tingOf } from './agande';
import { balans } from './balans';
import { freeNear } from './byggnad';
import { BYN } from './egendom';
import { getMap, eldPlats } from './karta';
import { rnd } from './slump';
import { MANNISKOVAPEN, VAPEN } from './strid';
import { MIN, Person, State, T, Task, W, inMap } from './typer';

export const VAKT = balans('vakt', {
  runda: 11, // rutor från elden som vakten går runt byn
  punkter: 10, // stopp längs rundan
  stoppMin: [0.3, 1.5], // minuter vakten stannar och ser sig om vid varje stopp
  eldVar: 5, // efter så här många stopp går vakten till elden ...
  eldMin: [2, 5], // ... och stannar så här många minuter (värmer sig, lägger på ved, pratar)
  fryser: 0.6, // är kroppsvärmen under detta går vakten till elden direkt
});

const mellan = (s: State, p: Person, [a, b]: readonly number[]) => (a + rnd(s, 'vakt', p) * (b - a)) * MIN;
// stoppet nummer i längs rundan: en punkt på land runt elden (närmare om det är vatten där)
function punkt(s: State, i: number) {
  const e = eldPlats(s), tl = getMap(s.seed).tiles, v = i / VAKT.punkter * Math.PI * 2;
  for (let r = VAKT.runda; r > 2; r--) {
    const x = Math.floor(e.x + 0.5 + Math.cos(v) * r), y = Math.floor(e.y + 0.5 + Math.sin(v) * r);
    if (inMap(x, y) && tl[y * W + x] !== T.Vatten) return freeNear(s, x + 0.5, y + 0.5);
  }
  return { x: e.x + 0.5, y: e.y + 1.5 };
}
// vakten (och den som försvarar byn mot vargarna, varg.ts) tar sitt eget bästa vapen eller byns, som ingen annan har i handen eller bär
export function taVapen(s: State, p: Person) {
  const ok = (MANNISKOVAPEN as readonly string[]).filter(v => v !== 'hand');
  const t = tingOf(s).filter(t => ok.includes(t.k) && !t.halv && (t.agare === p.id || t.agare === BYN) && (t.hos === undefined || t.hos === p.id) && t.lass === undefined && (t.bar === undefined || t.bar === p.id))
    .sort((a, b) => (VAPEN as Record<string, { skada: number }>)[b.k].skada - (VAPEN as Record<string, { skada: number }>)[a.k].skada || b.c - a.c)[0];
  if (!t) return false;
  if (t.hos === p.id) return true;
  for (const o of tingOf(s)) if (o.hos === p.id) o.hos = undefined;
  t.hos = p.id; t.x = t.y = undefined;
  return true;
}
// medan vakten står vid elden eller vid ett stopp (MEDAN i steg.ts): när stoppet är slut går hen vidare
export function vaktSteg(s: State, p: Person, tk: Task) {
  if (tk.runda === undefined) { tk.runda = Math.floor(rnd(s, 'vakt', p) * VAKT.punkter); tk.vidEld = true; taVapen(s, p); }
  if (tk.stopp === undefined) { tk.stopp = s.now + mellan(s, p, tk.vidEld ? VAKT.eldMin : VAKT.stoppMin); return; }
  if (s.now < tk.stopp) return;
  tk.stopp = undefined;
  if (!tk.vidEld && (p.warm < VAKT.fryser || ++tk.varv! % VAKT.eldVar === 0)) {
    const e = eldPlats(s), v = rnd(s, 'vakt', p) * Math.PI * 2, at = freeNear(s, e.x + 0.5 + Math.cos(v) * 2.6, e.y + 0.5 + Math.sin(v) * 2.6);
    tk.vidEld = true; tk.tx = at.x; tk.ty = at.y;
  } else {
    tk.vidEld = false; tk.runda = (tk.runda + 1) % VAKT.punkter; tk.varv ??= 0;
    const at = punkt(s, tk.runda); tk.tx = at.x; tk.ty = at.y;
  }
  tk.phase = 'go'; tk.pk = undefined; tk.path = undefined;
}
