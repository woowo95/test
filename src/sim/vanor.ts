// Vanorna: timmar per handling för varje person (p.habit), som bleknar med tiden och ger yrkestaggarna (seder.ts). Filen
// läser inga andra filer i simuleringen, så att sparningen (steg.ts) och gästerna (gast.ts) kan fråga den
import type { Act } from './typer';
import type { Person } from './typer';

// Vanornas timmar räknas i en lista bredvid vanobjektet (p.habit), i den ordning slagen lades till (som for-in ger dem): alla
// bleknar i varje steg för varje person, och med många slag är vanobjektet ett uppslagsverk i V8, där varje läsning och
// skrivning är dyr. Listan är sanningen medan byn räknas; vanobjektet har alltid alla slagen, och talen skrivs dit av
// skrivVanor innan byn eller en person sparas eller kopieras (som packGround för marken). Läs därför vanorna genom
// funktionerna här (vana, vanaSumma, habitTotal, habitShare), aldrig talen i p.habit direkt
interface Vanor { h: Record<string, number>; ks: string[]; v: number[]; ix: Map<string, number> }
const vanor = new WeakMap<Record<string, number>, Vanor>();
const oskrivna = new Set<Vanor>(); // de som ändrats sedan talen skrevs till vanobjektet
function vanorAv(h: Record<string, number>) {
  let c = vanor.get(h);
  if (!c) { const ks = Object.keys(h); vanor.set(h, c = { h, ks, v: ks.map(k => h[k]), ix: new Map(ks.map((k, i) => [k, i])) }); }
  return c;
}
// talen skrivs till vanobjekten (före sparning och när en person kopieras)
export function skrivVanor() {
  for (const c of oskrivna) for (let i = 0; i < c.ks.length; i++) c.h[c.ks[i]] = c.v[i];
  oskrivna.clear();
}
// timmarna för handlingen act (0 om p aldrig gjort den)
export function vana(p: Person, act: string) { const c = vanorAv(p.habit), i = c.ix.get(act); return i === undefined ? 0 : c.v[i]; }
// summan av timmarna för de slag som villkoret godtar, i den ordning slagen lades till
export function vanaSumma(p: Person, villkor: (act: string) => boolean) {
  const c = vanorAv(p.habit);
  let t = 0;
  for (let i = 0; i < c.ks.length; i++) if (villkor(c.ks[i])) t += c.v[i];
  return t;
}
export function habitTotal(p: Person) {
  const v = vanorAv(p.habit).v;
  let t = 0;
  for (let i = 0; i < v.length; i++) t += v[i];
  return t;
}
// alla vanor bleknar med faktorn hf, och tim timmar läggs till act
export function addHabit(p: Person, act: Act, hf: number, tim: number) {
  const c = vanorAv(p.habit), v = c.v;
  for (let i = 0; i < v.length; i++) v[i] *= hf;
  const i = c.ix.get(act);
  if (i === undefined) { c.ix.set(act, v.length); c.ks.push(act); v.push(tim); c.h[act] = tim; } // slaget finns i vanobjektet från början
  else v[i] += tim;
  oskrivna.add(c);
}
export function habitShare(p: Person, acts: readonly Act[], tot = habitTotal(p)) {
  if (!(tot > 0)) return 0;
  const c = vanorAv(p.habit);
  let a = 0;
  for (const k of acts) { const i = c.ix.get(k); a += i === undefined ? 0 : c.v[i]; }
  return a / tot;
}
