import { State } from './typer';

// ---------- slump ----------
export function rnd(s: State): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export function gauss(s: State) { return (rnd(s) + rnd(s) + rnd(s) - 1.5) / 1.5; }
export function pick<X>(s: State, arr: X[]): X { return arr[Math.floor(rnd(s) * arr.length)]; }
export function chance(s: State, ratePerSec: number, dtSec: number) { return rnd(s) < 1 - Math.exp(-ratePerSec * dtSec); }
