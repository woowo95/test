import { State, W } from './typer';

// ---------- stubbarna på kartan (steg 6.5.7, skog.ts gräver bort dem) ----------
// En egen liten fil så att bygget, lagret och fälten kan fråga om en stubbe utan att importera skog.ts
// rutorna med en stubbe, sparade så länge listan är densamma (nya stubbar läggs till, grävda och ruttnade filtreras bort)
const stubbCache = new WeakMap<object, { n: number; set: Set<number> }>();
export function stubbRutor(s: State) {
  const l = s.stubbar ?? [];
  let c = stubbCache.get(l);
  if (!c || c.n !== l.length) stubbCache.set(l, c = { n: l.length, set: new Set(l.map(k => k.y * W + k.x)) });
  return c.set;
}
export const stubbeOn = (s: State, x: number, y: number) => !!s.stubbar?.length && stubbRutor(s).has(y * W + x);
