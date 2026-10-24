import { AGES, DAY, State, WEEK } from './typer';

// ---------- kalendern ----------
// Ett år i spelet är ett dygn och byter vid midnatt. En tidsålder är en vecka, måndag 00.00 till söndag 24.00 (lokal tid).
// Bytet räknas efter kalendern, så sommartid flyttar det inte. Byns kalender (s.kal): tidsåldern a0 började t0 och slutar
// måndagen b0 (dagens nummer). En ny koloni börjar med vårtid fram till den måndag som ligger minst en vecka bort (7–13 dygn),
// och en äldre by kommer i fas när den läses in (inFas). Allt som frågar om tidsålder, dag eller år frågar kalender().
export interface Kal { ai: number; dag: number; av: number; ar: number; start: number; slut: number } // dag av av i tidsåldern
const dagNr = (t: number) => { const d = new Date(t); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY); };
const midnatt = (n: number) => { const d = new Date(n * DAY); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).getTime(); };
const mandag = (n: number) => n + (7 - (n + 3) % 7) % 7; // första måndagen från dag n (dag 0, 1 januari 1970, var en torsdag)
// en ny koloni: tidsåldern a0 från t0 till måndagen minst en vecka bort
export function nyKalender(t0: number, a0 = 1) {
  const n = dagNr(t0);
  return { t0, a0, b0: mandag(midnatt(n) === t0 ? n + 7 : n + 8) };
}
// en by från före kalendern: tidsåldern som pågår slutar den måndag som ligger närmast dess vanliga slut och inte redan varit
export function inFas(s: State) {
  const k = Math.floor((s.now - s.founded) / WEEK), slut = s.founded + (k + 1) * WEEK;
  const fore = mandag(dagNr(slut) - 6), efter = fore + 7;
  const b0 = midnatt(fore) > s.now && slut - midnatt(fore) <= midnatt(efter) - slut ? fore : efter;
  return { t0: s.founded + k * WEEK, a0: (((1 + k) % 4) + 4) % 4, b0 };
}
// kalendern frågas många gånger med samma tid, så det senaste svaret sparas per by
const memo = new WeakMap<State, { t: number; k: Kal }>();
export function kalender(s: State, t = s.now): Kal {
  const m = memo.get(s);
  if (m && m.t === t) return m.k;
  const c = s.kal ??= inFas(s), d = dagNr(t), ar = d - dagNr(s.founded) + 1;
  let k: Kal;
  if (d < c.b0 && t >= c.t0) k = { ai: c.a0, dag: d - dagNr(c.t0) + 1, av: c.b0 - dagNr(c.t0), ar, start: c.t0, slut: midnatt(c.b0) };
  else {
    const w = Math.floor((d - c.b0) / 7), n = c.b0 + 7 * w;
    k = { ai: ((c.a0 + 1 + w) % 4 + 4) % 4, dag: d - n + 1, av: 7, ar, start: midnatt(n), slut: midnatt(n + 7) };
  }
  memo.set(s, { t, k });
  return k;
}
export const ageIndex = (s: State, t = s.now) => kalender(s, t).ai;
export const ageDay = (s: State, t = s.now) => kalender(s, t).dag;
export const yearNo = (s: State, t = s.now) => kalender(s, t).ar;
// var i året: 0 = istidens början, 1 = vårtidens början … (med bråkdelen av tidsåldern som gått)
export function yearPos(s: State, t = s.now) { const k = kalender(s, t); return k.ai + (t - k.start) / (k.slut - k.start); }
// när tidsåldern ai börjar första gången efter att byns kalender började (för tester)
export function ageStart(s: State, ai: number) {
  const c = s.kal ??= inFas(s);
  return ai === c.a0 ? c.t0 : midnatt(c.b0 + 7 * (((ai - c.a0 - 1) % 4 + 4) % 4));
}
// klockslaget i timmar (lokal tid). Det frågas efter samma tidpunkt många gånger i varje steg, så det sparas
let memoT = NaN, memoH = 0;
export function hourOf(t: number) {
  if (t !== memoT) { const d = new Date(t); memoT = t; memoH = d.getHours() + d.getMinutes() / 60; }
  return memoH;
}
export function isLight(t: number) { const h = hourOf(t); return h >= 7 && h < 19; }
export function lightLevel(t: number) {
  const h = hourOf(t);
  if (h >= 7.5 && h < 18.5) return 1;
  if (h >= 6.5 && h < 7.5) return (h - 6.5);
  if (h >= 18.5 && h < 19.5) return 1 - (h - 18.5);
  return 0;
}
export function timeLabel(s: State, t: number) {
  if (t < s.founded) { const y = Math.ceil((s.founded - t) / DAY); return `${y} år före grundandet`; }
  return `År ${yearNo(s, t)}, ${AGES[ageIndex(s, t)].toLowerCase()}`;
}
