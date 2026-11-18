// ---------- röjd skog, stubbar och stigar i den väckta byn (steg 11.13.21, Flera samhällen: Den väckta byn i tal) ----------
// Byggaren lägger det en by i samma ålder har gjort med marken runt sig. Byn har fällt träd till ved och virke, ungefär
// VACKTSKOG.trad per invånare och dygn (år i spelet), de närmaste inom fällradien först (SKOG.sokR), så att det kala växer ut som
// en ring. De träd som fälldes för länge sedan har vuxit upp igen (MARK.tradDygn), så bara de senaste åren räknas, och träden
// som fälldes tidigast, närmast lägret, har vuxit längst. Där ett träd fälldes för kortare tid sedan än en stubbe ruttnar
// (SKOG.stubbeDygn) står stubben kvar. Folket har gått mellan elden och det de går till varje dag, fälten, hagen, lagren och
// vattnet, och mot huvudbyn, så att stigar av bar jord går dit (som wear i vag.ts nöter fram dem)
import { balans } from './balans';
import { alive } from './folk';
import { faltAt, faltOf, faltRuta } from './odling';
import { hagarOf } from './hage';
import { groundOf, MARK } from './mark';
import { SKOG } from './skog';
import { ledig } from './stationer';
import { stubbeOn } from './stubbar';
import { eldPlats } from './karta';
import { kantMotBy } from './grannbyar';
import { hash3 } from './slump';
import { FOREST, findPath, isSoil } from './vag';
import { DAY, State, T, W, H, inMap } from './typer';
import type { VarldRad } from './radtal';

export const VACKTSKOG = balans('vacktskog', {
  trad: 0.7, // träd som fälls per invånare och dygn (stubbarna i testbyarna: 0,1–1,7 per invånare och dygn, oftast 0,7)
  stig: 0.1, // marktäcket på en stig (bar jord, under BAR)
  vattenR: 40, // vattnet byn går till ligger högst så här långt från elden (rutor)
});

export function byggSkog(b: State, r: VarldRad) {
  const folk = b.people.filter(p => alive(p) && !p.gast).length;
  if (!folk) return;
  const g = groundOf(b), e = eldPlats(b), ar = Math.max(0, (b.now - r.grundad) / DAY), A = Math.min(ar, MARK.tradDygn);
  // de fällda träden: skogen inom fällradien, närmast först (med lite spridning ur byns frö, som urvalet bland de närmaste)
  const kand: { i: number; d: number }[] = [];
  for (let y = Math.max(0, e.y - SKOG.sokR); y <= Math.min(H - 1, e.y + SKOG.sokR); y++) for (let x = Math.max(0, e.x - SKOG.sokR); x <= Math.min(W - 1, e.x + SKOG.sokR); x++) {
    const i = y * W + x, d = Math.hypot(x - e.x, y - e.y);
    if (d > SKOG.sokR || !isSoil(g.tiles[i]) || g.trees[i] < FOREST || !fri(b, x, y)) continue;
    kand.push({ i, d: d + hash3(b.seed, i, 0x5c06) * 2 });
  }
  kand.sort((a, c) => a.d - c.d || a.i - c.i);
  const n = Math.min(kand.length, Math.round(VACKTSKOG.trad * folk * A));
  const stubbar = (b.stubbar ??= []);
  for (let k = 0; k < n; k++) {
    const i = kand[k].i, t = Math.round(b.now - A * DAY * (1 - k / n)), x = i % W, y = Math.floor(i / W);
    g.trees[i] = Math.min(0.99, (b.now - t) / DAY / MARK.tradDygn); // det som fälldes tidigt har vuxit upp igen
    if (b.now - t < SKOG.stubbeDygn * DAY && !stubbeOn(b, x, y)) stubbar.push({ x, y, t, v: 2 });
  }
  if (!stubbar.length) delete b.stubbar;
  // stigarna från elden
  if (ar < 1) return;
  const mal: { x: number; y: number }[] = [];
  for (const f of faltOf(b)) { const i = faltRuta(f, 0); mal.push({ x: i % W, y: Math.floor(i / W) }); }
  for (const h of hagarOf(b)) mal.push({ x: h.x + Math.floor(h.w / 2), y: h.y - 1 });
  for (const z of b.lagren ?? []) mal.push({ x: z.x + Math.floor(z.w / 2), y: z.y + Math.floor(z.h / 2) });
  const v = vattnet(b, e.x, e.y); if (v) mal.push(v);
  const k = b.varld ? kantMotBy(b, b.varld.huvud) : undefined; if (k) mal.push({ x: Math.floor(k.x), y: Math.floor(k.y) });
  for (const m of mal) for (const i of findPath(g, e.x, e.y, m.x, m.y) ?? []) {
    if (!isSoil(g.tiles[i]) || faltAt(b, i % W, Math.floor(i / W))) continue;
    g.cover[i] = Math.min(g.cover[i], VACKTSKOG.stig);
    if (g.trees[i] < FOREST) g.trees[i] = 0;
  }
}
// rutan är ledig för att ha fällts: inget står där, inget fält och ingen hage
const fri = (b: State, x: number, y: number) => ledig(b, x, y) && !faltAt(b, x, y) && !hagarOf(b).some(h => x >= h.x - 1 && x <= h.x + h.w && y >= h.y - 1 && y <= h.y + h.h);
// den närmaste vattenrutan med land bredvid, inom VACKTSKOG.vattenR
function vattnet(b: State, x0: number, y0: number) {
  const g = groundOf(b), R = VACKTSKOG.vattenR;
  let best: { x: number; y: number } | undefined, bd = Infinity;
  for (let y = y0 - R; y <= y0 + R; y++) for (let x = x0 - R; x <= x0 + R; x++) {
    if (!inMap(x, y) || g.tiles[y * W + x] !== T.Vatten) continue;
    const d = Math.hypot(x - x0, y - y0);
    if (d < bd && d <= R) { bd = d; best = { x, y }; }
  }
  return best;
}
