// Vakten patrullerar (steg 3.7.4, beslut Björn efter v158): nattens vakt går runt byn hela tiden och stannar bara kort vid
// elden ibland för att värma sig, lägga på ved eller för ett kort samtal. Den som fryser på passet gör vid nästa stopp det
// värmen erbjuder (VARMA i varme.ts: tänder elden, lägger på ved eller går in en stund) och går sedan vakt igen (steg 15.1.42). Vakten tar sitt eget bästa vapen eller ett som
// byn äger, aldrig någon annans, och har det i handen hela natten (striden räknar med det, strid.ts: personKampe)
import { glesPlats } from './trangsel';
import { tingOf } from './agande';
import { balans } from './balans';
import { friUteNear } from './byggnad';
import { BYN } from './egendom';
import { ACTS } from './handlingar';
import { getMap, eldPlats } from './karta';
import { bynsMitt, utanforByn } from './omrade';
import { rnd } from './slump';
import { MANNISKOVAPEN, PILSLAG, VAPEN, bastaBurna, bastaIForradet, burna, vapnetsAmmo } from './strid';
import { MIN, Person, State, T, Task, W, inMap } from './typer';
import { amountOf, iRackhall, laggPaRutan, put } from './lager';
// att ta ur förrådet (behov.ts) sätts i steg.ts: en direkt import ger en importcirkel
export const stenKrok: { ta: typeof import('./behov').takeMaterial } = { ta: () => ({}) };

export const VAKT = balans('vakt', {
  utom: 1, // vakten går runt byn så här många rutor utanför dess område (omrade.ts, steg 6.2.4)
  punkter: 10, // stopp längs rundan
  stoppMin: [0.3, 1.5], // minuter vakten stannar och ser sig om vid varje stopp
  eldVar: 5, // efter så här många stopp går vakten till elden ...
  eldMin: [2, 5], // ... och stannar så här många minuter (värmer sig, lägger på ved, pratar)
});

// fryser vakten, som valet räknar det (val.ts sätter kroken: raden fryser i ARBETEN)
export const vaktKrok = { fryser: (_s: State, _p: Person) => false };
const mellan = (s: State, p: Person, [a, b]: readonly number[]) => (a + rnd(s, 'vakt', p) * (b - a)) * MIN;
// stoppet nummer i längs rundan: en punkt på land strax utanför byns område, i riktningen från områdets mitt (närmare
// om det är vatten där)
function punkt(s: State, i: number) {
  const m = bynsMitt(s), tl = getMap(s.seed).tiles, v = i / VAKT.punkter * Math.PI * 2;
  let land: { x: number; y: number } | undefined;
  for (let r = 1; r < W; r++) {
    const x = Math.floor(m.x + 0.5 + Math.cos(v) * r), y = Math.floor(m.y + 0.5 + Math.sin(v) * r);
    if (!inMap(x, y)) break;
    const ute = utanforByn(s, x, y) >= VAKT.utom;
    if (tl[y * W + x] === T.Vatten) { if (ute) break; continue; }
    land = { x, y };
    if (ute) break;
  }
  if (land) return friUteNear(s, land.x + 0.5, land.y + 0.5);
  const e = eldPlats(s);
  return friUteNear(s, e.x + 0.5, e.y + 1.5);
}
// vakten (och den som försvarar byn mot vargarna, varg.ts) tar sitt eget bästa vapen eller byns, som ingen annan har i handen eller bär
export function bastaVapen(s: State, p: Person, utom?: Set<number>) {
  const ok = (MANNISKOVAPEN as readonly string[]).filter(v => v !== 'hand');
  return tingOf(s).filter(t => !utom?.has(t.id) && ok.includes(t.k) && !t.halv && t.helig === undefined && (t.agare === p.id || t.agare === BYN) && (t.hos === undefined || t.hos === p.id) && (t.krok === undefined || t.krok === p.id) && t.lass === undefined && (t.bar === undefined || t.bar === p.id))
    .sort((a, b) => (VAPEN as Record<string, { skada: number }>)[b.k].skada - (VAPEN as Record<string, { skada: number }>)[a.k].skada || b.c - a.c)[0];
}
// det man har i handen att kasta och skjuta (steg 15.1.69, Person.ammo): när larmet går tar den som får en båge eller en slunga
// så många skott som vapnet rymmer (kast.skott) av det bästa slaget, och den som inget vapen får tar stenar att kasta. Hämtningen
// (HAMTAS i hamtning.ts) går till stacken med dem, som för allt annat arbete
export const ammoVidLarm = (s: State, p: Person) => ammoTill(s, p, bastaVapen(s, p)?.k ?? 'sten');
// det p saknar av det vapnet v skjuter eller kastar (stenen kastas själv): upp till så många skott som vapnet rymmer, av det bästa
// slaget hen har eller förrådet har. Också jägaren med båge eller slunga (HAMTAS.jakt)
export function ammoTill(s: State, p: Person, v: string): Record<string, number> | undefined {
  const am = v === 'sten' ? 'sten' : vapnetsAmmo(v), kast = (VAPEN as Record<string, { kast?: { skott: number } }>)[v]?.kast;
  if (!am || !kast) return undefined;
  const k = bastaBurna(p, am) ?? bastaIForradet(s, am);
  const n = k ? kast.skott - burna(p, k) : 0;
  return k && n >= 1 ? { [k]: n } : undefined;
}
const AMMO = new Set(['sten', ...Object.keys(PILSLAG)]);
// det som ligger inom räckhåll av det p vill ha i handen tas, av byns först, och bara hela saker (anroparen säger var, iRackhall).
// Svarar om hen har något i handen
export function taAmmo(s: State, p: Person) {
  for (const [k, n] of Object.entries(ammoVidLarm(s, p) ?? {})) {
    const ag = stenKrok.ta(s, p, k, Math.min(n, Math.floor(amountOf(s, k) + 1e-9)), true), hela: Record<number, number> = {};
    for (const [o, v] of Object.entries(ag)) { const h = Math.floor(v + 1e-9); if (h >= 1) hela[+o] = h; if (v - h > 1e-9) put(s, k, v - h, { [+o]: v - h }); } // bara hela saker
    iHanden(p, k, hela);
  }
  return !!p.ammo && Object.values(p.ammo).some(h => h.n >= 1);
}
function iHanden(p: Person, k: string, ag: Record<number, number>) {
  const g = Object.values(ag).reduce((a, b) => a + b, 0);
  if (g < 1 - 1e-9) return;
  const h = (p.ammo ??= {})[k] ??= { n: 0, ag: {} };
  h.n += g; for (const [o, v] of Object.entries(ag)) if (v > 1e-9) h.ag[+o] = (h.ag[+o] ?? 0) + v;
}
// den som inte längre väntar på faran eller slåss lägger det hen har i handen där hen står, med ägarna, och det bärs in som allt
// annat som ligger utanför förrådet (steg 15.1.69); också den som dött eller flytt
// det som hämtats till platsen (HAMTAS i hamtning.ts) tas i handen, och det som ligger inom räckhåll (MEDAN i steg.ts)
export function ammoIHanden(s: State, p: Person, tk: Task) {
  for (const k of Object.keys(tk.items ?? {})) {
    const n = Math.floor((tk.items![k] ?? 0) + 1e-9), ag = tk.ag?.[k];
    if (!AMMO.has(k) || n < 1 || !ag) continue;
    iHanden(p, k, ag); delete tk.items![k]; delete tk.ag![k];
  }
  taAmmo(s, p);
}
export function slappAmmo(s: State) {
  for (const p of s.people) if (p.ammo && (p.died !== undefined || !p.task || !(ACTS[p.task.act].vapen || p.task.act === 'strid'))) {
    if (p.died === undefined || p.x !== undefined) for (const [k, h] of Object.entries(p.ammo)) for (const [o, v] of Object.entries(h.ag)) laggPaRutan(s, k, v, p.x, p.y, { [+o]: v });
    p.ammo = undefined;
  }
}
export function taVapen(s: State, p: Person) {
  const t = bastaVapen(s, p);
  if (!t) { iRackhall(p.x, p.y, () => taAmmo(s, p)); return false; } // stenarna inom räckhåll; annars hämtas de när hen är framme (HAMTAS)
  if (t.hos === p.id) return true;
  for (const o of tingOf(s)) if (o.hos === p.id) o.hos = undefined;
  t.hos = p.id; t.x = t.y = t.krok = undefined;
  iRackhall(p.x, p.y, () => taAmmo(s, p)); // pilarna och slungans stenar inom räckhåll, som stenarna
  return true;
}
// medan vakten står vid elden eller vid ett stopp (MEDAN i steg.ts): när stoppet är slut går hen vidare
export function vaktSteg(s: State, p: Person, tk: Task) {
  if (tk.runda === undefined) { tk.runda = Math.floor(rnd(s, 'vakt', p) * VAKT.punkter); tk.vidEld = true; taVapen(s, p); }
  if (tk.stopp === undefined) { tk.stopp = s.now + mellan(s, p, tk.vidEld ? VAKT.eldMin : VAKT.stoppMin); return; }
  if (s.now < tk.stopp) return;
  tk.stopp = undefined;
  // fryser vakten lämnar hen passet här, och valet väljer som för vem som helst: värmen (raden fryser i ARBETEN, val.ts) går före
  // vakten, som väljs igen när hen är varm. Inom passet går bara Fara och Nöd före det
  if (vaktKrok.fryser(s, p)) { p.task = undefined; return; }
  if (!tk.vidEld && ++tk.varv! % VAKT.eldVar === 0) {
    const e = eldPlats(s), at = glesPlats(s, p, () => { const v = rnd(s, 'vakt', p) * Math.PI * 2; return friUteNear(s, e.x + 0.5 + Math.cos(v) * ACTS.vakt.radie!, e.y + 0.5 + Math.sin(v) * ACTS.vakt.radie!); })!; // som första platsen (spotFor), men inte bland dem som vilar där (trängseln, steg B.21)
    tk.vidEld = true; tk.tx = at.x; tk.ty = at.y;
  } else {
    tk.vidEld = false; tk.runda = (tk.runda + 1) % VAKT.punkter; tk.varv ??= 0;
    const at = punkt(s, tk.runda); tk.tx = at.x; tk.ty = at.y;
  }
  tk.phase = 'go'; tk.pk = undefined; tk.path = undefined;
}
