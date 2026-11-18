// Kartrecepten (steg 11.9.1): hur en karta skapas. Ett recept är en rad i KARTRECEPT med storleken, om en sjö läggs,
// trösklarna för vatten, sand, sten och skog och om en byplats väljs. Receptet by ger exakt den karta byarna alltid haft;
// receptet plats ger en liten karta utan byplats för en plats i världen. Marken där kartan ligger i världen (VARLDMARK)
// flyttar trösklarna (MARKTROSKEL), så att en by i bergen får mer sten och en by på myren mer vatten. Huvudbyn har ingen
// marksort i receptet: dess karta är densamma som förut. Brusets höjd h avgör vatten, sand och sten, skogens brus f skogen
import { H, H0, OX, OY, T, W, W0 } from './typer';
import { fbm, hash } from './karta';
import type { MarkId } from './varldmark';

export interface KartRecept {
  namn: string;
  sjo: boolean; // en sjö sänks ner i bruset
  vatten: number; sand: number; sten: number; skog: number; // h under vatten blir vatten, under sand sand, över sten sten; f över skog skog
  byplats: boolean; // en plats för elden och det första lagret väljs
  bredd?: number; hojd?: number; // storleken i rutor; utan den byns karta (W × H)
}
export const KARTRECEPT = {
  by: { namn: 'Byn', sjo: true, vatten: 0.22, sand: 0.27, sten: 0.72, skog: 0.55, byplats: true },
  plats: { namn: 'En plats', sjo: false, vatten: 0.22, sand: 0.27, sten: 0.72, skog: 0.55, byplats: false, bredd: 40, hojd: 28 },
} as const satisfies Record<string, KartRecept>;
export type KartReceptId = keyof typeof KARTRECEPT;

// hur världsrutans marksort flyttar trösklarna: högre vatten och sand = mer strand och vatten, lägre sten = mer sten,
// lägre skog = mer skog
export interface Troskel { vatten?: number; sand?: number; sten?: number; skog?: number }
export const MARKTROSKEL: Record<MarkId, Troskel> = {
  hav: { vatten: 0.08, sand: 0.08 },
  slatt: { skog: 0.08 },
  skog: { skog: -0.06 },
  tat: { skog: -0.14 },
  myr: { vatten: 0.05, sand: 0.07, skog: 0.04 },
  berg: { sten: -0.14, skog: 0.04 },
  sjo: { vatten: 0.08, sand: 0.08 },
};

export interface KartData { tiles: Uint8Array; fire: { x: number; y: number }; stock: { x: number; y: number }; shade: Float32Array; w: number; h: number }
export interface KartLage { w: number; h: number; ox: number; oy: number; w0: number; h0: number } // storleken och den gamla kartans hörn och storlek (typer.ts)
const byLage = (): KartLage => ({ w: W, h: H, ox: OX, oy: OY, w0: W0, h0: H0 });

// kartan ur fröet och receptet. Kartan räknas från den gamla kartans hörn (ox, oy): sjön och byplatsen ligger där de låg på
// den gamla kartan, och bruset ger samma mark där (steg 2.10.9)
export function skapaKarta(seed: number, id: KartReceptId, mark?: MarkId, l0?: KartLage): KartData {
  const r: KartRecept = KARTRECEPT[id], d = mark ? MARKTROSKEL[mark] : {};
  const l = l0 ?? (r.bredd ? { w: r.bredd, h: r.hojd!, ox: 0, oy: 0, w0: r.bredd, h0: r.hojd! } : byLage());
  const { w: Wk, h: Hk, ox, oy, w0, h0 } = l;
  const vatten = r.vatten + (d.vatten ?? 0), sand = r.sand + (d.sand ?? 0), sten = r.sten + (d.sten ?? 0), skog = r.skog + (d.skog ?? 0);
  const tiles = new Uint8Array(Wk * Hk);
  const shade = new Float32Array(Wk * Hk);
  const lx = w0 * (0.3 + hash(seed, 1, 1) * 0.4), ly = h0 * (0.25 + hash(seed, 2, 2) * 0.5);
  for (let y = 0; y < Hk; y++) for (let x = 0; x < Wk; x++) {
    const gx = x - ox, gy = y - oy; // läget på den gamla kartan
    const dd = Math.hypot((gx - lx) / 1.4, gy - ly);
    const lake = r.sjo ? Math.max(0, 1 - dd / (9 * Math.sqrt(w0 * h0 / 2560))) : 0;
    const hh = fbm(seed, gx, gy) - lake * 0.55;
    const f = fbm(seed + 99, gx, gy);
    let t: T;
    if (hh < vatten) t = T.Vatten;
    else if (hh < sand) t = T.Sand;
    else if (hh > sten) t = T.Sten;
    else if (f > skog) t = T.Skog;
    else t = T.Gras;
    tiles[y * Wk + x] = t;
    shade[y * Wk + x] = hash(seed + 5, gx, gy);
  }
  const mitt = { x: ox + (w0 >> 1), y: oy + (h0 >> 1) };
  if (!r.byplats) return { tiles, fire: mitt, stock: mitt, shade, w: Wk, h: Hk };
  // byplats: gräs nära vatten och skog, nära mitten av den gamla kartan (och bara inom den, så att den blir densamma)
  const inne = (x: number, y: number) => x >= ox && y >= oy && x < ox + w0 && y < oy + h0;
  let best = mitt, bs = -1e9;
  for (let y = oy + 5; y < oy + h0 - 5; y++) for (let x = ox + 6; x < ox + w0 - 6; x++) {
    if (tiles[y * Wk + x] !== T.Gras) continue;
    let water = 99, forest = 99, okArea = true;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const t = tiles[(y + dy) * Wk + x + dx];
      if (t === T.Vatten || t === T.Sten) okArea = false;
    }
    if (!okArea) continue;
    for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++) {
      const xx = x + dx, yy = y + dy;
      if (!inne(xx, yy)) continue;
      const t = tiles[yy * Wk + xx], dd = Math.hypot(dx, dy);
      if (t === T.Vatten) water = Math.min(water, dd);
      if (t === T.Skog) forest = Math.min(forest, dd);
    }
    const sc = -Math.abs(water - 6) * 2 - Math.abs(forest - 6) - Math.hypot(x - ox - w0 / 2, y - oy - h0 / 2) * 0.3;
    if (sc > bs) { bs = sc; best = { x, y }; }
  }
  const fe = best;
  // första lagerplatsen (2×2, som LAGER.startBredd × startHojd i lager.ts) helst fire + (4, −1), annars närmaste
  // plats därifrån där inget är vatten eller sten och inget ligger inpå elden (som usable i lager.ts)
  const fri = (x: number, y: number) => {
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const xx = x + dx, yy = y + dy;
      if (!inne(xx, yy) || tiles[yy * Wk + xx] === T.Vatten || tiles[yy * Wk + xx] === T.Sten || Math.max(Math.abs(xx - fe.x), Math.abs(yy - fe.y)) <= 1) return false;
    }
    return true;
  };
  let stock = { x: fe.x + 4, y: fe.y - 1 }, sd = Infinity;
  for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
    const x = fe.x + 4 + dx, y = fe.y - 1 + dy, dd = Math.hypot(dx, dy);
    if (dd < sd && fri(x, y)) { sd = dd; stock = { x, y }; }
  }
  return { tiles, fire: fe, stock, shade, w: Wk, h: Hk };
}
// andelen rutor av sorten t på kartan
export const kartAndel = (k: KartData, t: T) => { let n = 0; for (let i = 0; i < k.tiles.length; i++) if (k.tiles[i] === t) n++; return n / k.tiles.length; };
