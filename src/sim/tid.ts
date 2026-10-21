import { AGES, DAY, State, WEEK } from './typer';

// ---------- tid ----------
export function ageIndex(s: State, t = s.now) { return (((1 + Math.floor((t - s.founded) / WEEK)) % 4) + 4) % 4; }
export function ageDay(s: State, t = s.now) { return Math.floor(((t - s.founded) % WEEK) / DAY) + 1; }
export function yearNo(s: State, t = s.now) { return Math.floor((t - s.founded) / DAY) + 1; }
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
