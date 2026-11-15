// ---------- skulden och förlåtelsen (steg 10.8.1–10.8.3, Kunskap och lärdomar: Skuld och förlåtelse) ----------
// Den som i ett utbrott gjort någon illa bär en skuld (humor.ts skapar den). Den tynger humöret och bleknar. Den som bär en
// skuld väljer hellre den hen gjort illa att samtala med och ber om förlåtelse med en botgåva ur det hen har över
import { ALDER, REL, ageOf, alive, count, getRel, isParent, living, stat, think } from './folk';
import { balans } from './balans';
import { clamp, rnd } from './slump';
import { Anger, DAY, HOUR, Person, State } from './typer';
import { Vara, flytta, gavaKlar } from './byte';
import { behovAv, payable, personPart } from './behov';
import { grundvarde } from './varde';
import { SAKER } from './saker';

export const SKULD = balans('skuld', {
  bas: 0.15, // styrkan: bas × allvaret × empatin / 10 × hur mycket man bryr sig × (1 + andelen vuxna som vet), ...
  max: 0.3, // ... högst så här mycket
  dygn: 3, // bleknar med den här tidskonstanten (dygn, år i spelet)
  min: 0.01, // under detta är skulden borta
  antal: 3, // så många skulder bär en person; den svagaste trängs undan
  bryrMin: 0.3, // hur mycket man bryr sig om någon som inte står nära: från bryrMin (relationen 0 eller sämre) till 1 vid nära vän
  // bönen (steg 10.8.2)
  valj: 1.5, // den som bär en skuld väljer den hen gjort illa att samtala med med så här mycket större vikt (som bästa vännen)
  be: 0.5, // chansen att be om förlåtelse i ett samtal som inte är ett gräl ...
  beDygn: 2, // ... som efter ett försök växer tillbaka med den här tidskonstanten (dygn, år i spelet)
  krav: 12, // botgåvans krav: så här mycket gånger allvaret, räknat i vad sakerna är värda för den som ger
});
// hur mycket p bryr sig om q: fullt om partnern, bästa vännen, en förälder och sitt eget barn, annars efter relationen innan
const bryr = (p: Person, q: Person | undefined, op0: number) => q && (q.id === p.partner || q.id === p.bast || isParent(q, p) || isParent(p, q)) ? 1
  : clamp(SKULD.bryrMin + (1 - SKULD.bryrMin) * op0 / REL.naraVan, SKULD.bryrMin, 1);
// andelen av byns andra vuxna som vet om händelsen (har ett intryck av p med beviset mot den drabbade från den tiden)
function skam(s: State, p: Person, a: Anger) {
  const v = living(s).filter(q => q !== p && q.id !== a.om && ageOf(q, s.now) >= ALDER.vuxen);
  if (!v.length) return 0;
  return v.filter(q => q.intryck?.some(e => e.om === p.id && e.bev?.some(b => b.mot === a.om && Math.abs(b.t - a.t) < HOUR))).length / v.length;
}
function angerV(s: State, p: Person, a: Anger) {
  const q = s.people.find(x => x.id === a.om); // också den döda
  const bas = Math.min(SKULD.max, SKULD.bas * a.allv * stat(p, 'empati', s.now) / 10 * bryr(p, q, a.op0) * (1 + skam(s, p, a)));
  return bas * Math.exp(-(s.now - a.t) / (SKULD.dygn * DAY));
}
// p gjorde q illa i ett utbrott med allvaret allv: skulden, och relationen minns det
export function angra(s: State, p: Person, q: Person, allv: number, text: string, op0: number) {
  const r = getRel(s, p, q), m = (r.minns ??= {});
  m.illa = (m.illa ?? 0) + 1;
  const a: Anger = { om: q.id, namn: q.name, allv, t: s.now, op0, text, v: 0 };
  a.v = angerV(s, p, a);
  const l = [...(p.angr ?? []), a].sort((x, y) => y.v - x.v).slice(0, SKULD.antal);
  p.angr = l;
  count(s, 'skuld');
}
// en gång i timmen: styrkan räknas om ur tiden sedan utbrottet; den som bleknat bort försvinner
export function angerTim(s: State, p: Person) {
  if (!p.angr) return;
  for (const a of p.angr) a.v = angerV(s, p, a);
  p.angr = p.angr.filter(a => a.v >= SKULD.min);
  if (!p.angr.length) p.angr = undefined;
}
// raden i humörlistan: "Ångrar att han slog Ulf"
export const angerText = (p: Person, a: Anger) => `Ångrar att ${p.sex === 'k' ? 'hon' : 'han'} ${a.text} ${a.namn}`;


// ---------- bönen (steg 10.8.2) ----------
// vikten i valet av vem man samtalar med: den man bär en skuld mot väljs hellre
export const skuldVal = (p: Person, q: Person) => p.angr?.some(a => a.om === q.id) ? SKULD.valj : 0;
// det g har över, i hela saker, och vad varje sak är värd för g
function enheter(s: State, g: Person) {
  const ut: { k: string; t?: Vara['t']; v: number }[] = [];
  for (const w of payable(s, g, [])) {
    const v = grundvarde(w.k) * behovAv(s, g, w.k);
    if (v <= 0) continue;
    if (w.t) { ut.push({ k: w.k, t: w.t, v }); continue; }
    for (let i = 0; i < Math.floor(w.n + 1e-9); i++) ut.push({ k: w.k, v });
  }
  return ut;
}
// botgåvan för skulden med allvaret allv: den billigaste sak som ensam räcker, annars de dyraste först tills kravet är nått,
// och räcker inte allt ges allt. Inget när g inget har över
export function botGava(s: State, g: Person, allv: number): Vara[] | undefined {
  const e = enheter(s, g), krav = SKULD.krav * allv;
  if (!e.length) return undefined;
  const en = e.filter(x => x.v >= krav).sort((a, b) => a.v - b.v)[0];
  const val: typeof e = [];
  if (en) val.push(en);
  else { let sum = 0; for (const x of e.sort((a, b) => b.v - a.v)) { if (sum >= krav) break; val.push(x); sum += x.v; } }
  const ut: Vara[] = [];
  for (const x of val) {
    if (x.t) { ut.push({ k: x.k, n: 1, t: x.t }); continue; }
    const f = ut.find(w => w.k === x.k && !w.t);
    if (f) f.n++; else ut.push({ k: x.k, n: 1 });
  }
  return ut;
}
const varorNamn = (v: Vara[]) => v.map(w => `${w.t || w.n === 1 ? (SAKER[w.k]?.ett ? 'ett' : 'en') : w.n} ${(SAKER[w.k]?.namn ?? w.k).toLowerCase()}`).join(' och ');
// a samtalar med b, och det är inget gräl: den av dem som bär en skuld mot den andra kan be om förlåtelse. Chansen växer
// tillbaka efter ett försök. Den som inget har över ber inte nu
export function beOmForlatelse(s: State, a: Person, b: Person) {
  for (const [p, q] of [[a, b], [b, a]] as const) {
    const x = p.angr?.find(e => e.om === q.id);
    if (!x || !alive(q)) continue;
    const chans = SKULD.be * (x.bad === undefined ? 1 : 1 - Math.exp(-(s.now - x.bad) / (SKULD.beDygn * DAY)));
    if (rnd(s, 'skuld', p) >= chans) continue;
    const gava = botGava(s, p, x.allv);
    if (!gava) continue;
    x.bad = s.now;
    count(s, 'skuldBon');
    forlat(s, p, q, x, gava);
    return;
  }
}
// q tar emot botgåvan från p och förlåter
function forlat(s: State, p: Person, q: Person, x: Anger, gava: Vara[]) {
  const g = personPart(s, p), m = personPart(s, q);
  for (const w of gava) flytta(s, w, g, m);
  gavaKlar(s, g, m, gava, false);
  think(q, `Fick ${varorNamn(gava)} av ${p.name} som bot`, 0.05, s.now, 12 * HOUR);
  p.angr = p.angr!.filter(e => e !== x);
  if (!p.angr.length) p.angr = undefined;
  count(s, 'skuldForlaten');
}
