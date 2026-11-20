// eldens skuggor (steg 12.3.2, Glöden, nävern och ljuset: Eldens skuggor): för varje lägereld räknas en gång, när något ändras
// (ett hus byggs eller rivs, ett träd växer upp eller fälls, elden flyttas), hur långt ljuset når åt SKUGGA.hall håll innan det
// träffar en vägg eller en stam. Nattfiltret (ui/natt.ts) slår upp det: en punkt bakom något blir ett eller två steg mörkare.
// Väggar och stammar skuggar, men inte kronorna och inte folk. Bara bilden; ingen grafik här, så att scenariot eldskugga prövar
// samma strålar som bilden
import { FOREST, H, MORKER, W, groundOf, isWall, type State } from '../sim';

export const SKUGGA = {
  hall: 360, // så många håll runt elden
  get r() { return Math.ceil(MORKER.eldR) + 1; }, // så många rutor ut räknas strålen (eldens sken når inte längre, steg 12.1.169)
  steg: 0.25, // strålen prövas så här ofta (rutor)
  forbi: 0.6, // skuggan börjar så här långt bakom kanten där strålen träffar, så att väggen och stammen själva är upplysta
  per: 8, // strålens längd sparas i åttondels rutor (0–255), alltså högst 31 rutor
};
export const INGEN = 255; // strålen träffade inget

// strålarna från en eld mitt i rutan (fx, fy): längden åt varje håll i åttondels rutor. Håll a går åt (cos a, sin a), med y nedåt
export function stralar(s: State, fx: number, fy: number, ut = new Uint8Array(SKUGGA.hall)) {
  const g = groundOf(s), ex = Math.floor(fx), ey = Math.floor(fy);
  for (let a = 0; a < SKUGGA.hall; a++) {
    const v = (a + 0.5) / SKUGGA.hall * 2 * Math.PI, dx = Math.cos(v), dy = Math.sin(v);
    let d = INGEN;
    for (let t = SKUGGA.steg; t <= SKUGGA.r; t += SKUGGA.steg) {
      const x = Math.floor(fx + dx * t), y = Math.floor(fy + dy * t);
      if (x === ex && y === ey) continue;
      if (isWall(s, x, y) || g.trees[y * W + x] >= FOREST) { d = Math.min(INGEN - 1, Math.round((t + SKUGGA.forbi) * SKUGGA.per)); break; }
    }
    ut[a] = d;
  }
  return ut;
}
// om punkten (x, y) i rutor ligger i skuggan från elden i (fx, fy), ur strålarna
export function iSkuggan(rad: Uint8Array, fx: number, fy: number, x: number, y: number) {
  const dx = x - fx, dy = y - fy, v = Math.atan2(dy, dx), a = Math.floor(((v / (2 * Math.PI)) % 1 + 1) % 1 * SKUGGA.hall) % SKUGGA.hall;
  return rad[a] !== INGEN && Math.hypot(dx, dy) * SKUGGA.per > rad[a];
}

// det som ändrar skuggorna kring eldarna: husen (byggV), eldarnas platser och stammarna inom SKUGGA.r. Strålarna räknas om bara
// när nyckeln ändrats
function nyckel(s: State, eldar: { x: number; y: number }[]) {
  const g = groundOf(s), R = SKUGGA.r;
  let h = s.byggV ?? 0;
  for (const e of eldar) {
    h = (h * 31 + Math.floor(e.x) * 7 + Math.floor(e.y) * 131) | 0;
    for (let y = Math.max(0, Math.floor(e.y) - R); y <= Math.min(H - 1, Math.floor(e.y) + R); y++) for (let x = Math.max(0, Math.floor(e.x) - R); x <= Math.min(W - 1, Math.floor(e.x) + R); x++) {
      const i = y * W + x;
      if (g.trees[i] >= FOREST) h = (h * 33 + i) | 0;
    }
  }
  return `${eldar.length}:${h}`;
}
const minne = new WeakMap<State, { k: string; rader: Uint8Array[] }>();
// strålarna för eldarna (mitt i rutan, i rutor), räknade om när något ändrats; ny = om de räknades om just nu
export function eldSkuggor(s: State, eldar: { x: number; y: number }[]): { rader: Uint8Array[]; ny: boolean } {
  const k = nyckel(s, eldar), m = minne.get(s);
  if (m && m.k === k) return { rader: m.rader, ny: false };
  const rader = eldar.map(e => stralar(s, e.x, e.y));
  minne.set(s, { k, rader });
  return { rader, ny: true };
}
