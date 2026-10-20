import { AGES, DAY, State, WEEK } from './typer';

// ---------- tid ----------
export function ageIndex(s: State, t = s.now) { return (((1 + Math.floor((t - s.founded) / WEEK)) % 4) + 4) % 4; }
export function ageDay(s: State, t = s.now) { return Math.floor(((t - s.founded) % WEEK) / DAY) + 1; }
export function yearNo(s: State, t = s.now) { return Math.floor((t - s.founded) / DAY) + 1; }
export function isLight(t: number) { const h = new Date(t).getHours(); return h >= 7 && h < 19; }
export function lightLevel(t: number) {
  const d = new Date(t); const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 7.5 && h < 18.5) return 1;
  if (h >= 6.5 && h < 7.5) return (h - 6.5);
  if (h >= 18.5 && h < 19.5) return 1 - (h - 18.5);
  return 0;
}
export function timeLabel(s: State, t: number) {
  if (t < s.founded) { const y = Math.ceil((s.founded - t) / DAY); return `${y} år före grundandet`; }
  return `År ${yearNo(s, t)}, ${AGES[ageIndex(s, t)].toLowerCase()}`;
}
