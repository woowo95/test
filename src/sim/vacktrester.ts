// ---------- ruinen och karavanresten på den lilla kartan (steg 11.13.26, Flera samhällen: Uppdragen i tal) ----------
// Resterna är rader i registret PLATSRESTER: det som står kvar av ett hus (den rasade muren) och av en vagn. När den lilla kartan
// för en ruin skapas (vacktplats.ts) står byns hus kvar som murar med luckor där de rasat, så många som byn hade (minnesbilden, annars värdet VarldRad.hus delat med VACKTRESTER.husVarde,
// inom VACKTRESTER.husMin–husMax), runt mitten av kartan. Det som finns kvar i ruinen (ruinKvar i uppdrag.ts, i hela saker,
// efter vittringen och det andra redan tagit) ligger inne i husen, där det lämnades. Karavanresten har sina trasiga vagnar.
// Allt räknas ur platsens frö med hash3, så att samma plats ser likadan ut vid varje besök
import { balans } from './balans';
import { changed } from './lager';
import { getMap } from './karta';
import { radNr } from './radtal';
import { rutaOf } from './saker';
import { hash3 } from './slump';
import { ruinKvar } from './uppdrag';
import { State, T, W, H } from './typer';

export interface PlatsRestDef { namn: string }
export const PLATSRESTER = {
  mur: { namn: 'Rasad mur' }, // en ruta av ett hus som står kvar
  vagn: { namn: 'Trasig vagn' }, // en vagn som lämnats
  hog: { namn: 'Gravhög' }, // en ruta av en gravhög (steg 11.13.28)
} as const satisfies Record<string, PlatsRestDef>;
export type PlatsRestId = keyof typeof PLATSRESTER;
export interface PlatsRest { x: number; y: number; k: PlatsRestId; m?: 1 /* högens mitt */ }

export const VACKTRESTER = balans('vacktrester', {
  husMin: 2, husMax: 6, // så många hus som minst och mest står kvar i en ruin
  kvar: 0.6, // så stor del av murarna står kvar; resten har rasat
  vagnar: 2, // så många vagnar ligger vid en karavanrest
  husVarde: 400, // ett hus värde i radens rikedom (VarldRad.hus är värdet av husen, inte antalet), när byn inte har en minnesbild
});
const HUS_B = 5, HUS_H = 4; // husets storlek i rutor (som ett litet hus, byggnader.ts)

export const resterOf = (b: State) => b.rester ?? [];

// resterna på den lilla kartan b för platsen p (vacktplats.ts)
export function byggRester(b: State, p: { nr: number; k: string; by?: number }) {
  const vl = b.varld;
  if (!vl) return;
  const tiles = getMap(b.seed).tiles, fro = b.seed, mitt = { x: W >> 1, y: H >> 1 };
  const land = (x: number, y: number) => x >= 1 && y >= 1 && x < W - 1 && y < H - 1 && tiles[y * W + x] !== T.Vatten && tiles[y * W + x] !== T.Sten;
  const rester: PlatsRest[] = (b.rester ??= []);
  if (p.k === 'karavanrest') {
    for (let i = 0; i < VACKTRESTER.vagnar; i++) {
      const x = mitt.x - 2 + i * 3 + Math.floor(hash3(fro, i, 1, 0x7a61) * 2), y = mitt.y + Math.floor(hash3(fro, i, 2, 0x7a61) * 3) - 1;
      if (land(x, y)) rester.push({ x, y, k: 'vagn' });
    }
    return;
  }
  if (p.k === 'gravhog') { // högen vid mitten, 3 × 2 rutor; gåvorna ligger i den och syns inte (steg 11.13.28)
    for (let y = mitt.y - 1; y <= mitt.y; y++) for (let x = mitt.x - 1; x <= mitt.x + 1; x++) if (land(x, y)) rester.push({ x, y, k: 'hog', ...(x === mitt.x ? { m: 1 as const } : {}) });
    changed(b);
    return;
  }
  if (p.k === 'rovarlager') { // det stulna ligger vid lägrets mitt (steg 11.13.27)
    const L = p.by !== undefined ? radNr(vl, p.by) : undefined, stackar = (b.stackar ??= []);
    let i = 0;
    for (const [k, m0] of Object.entries(L?.stulet ?? {}).sort((a, c) => a[0].localeCompare(c[0]))) for (let m = m0; m >= 1 && i < 40; i++) {
      const x = mitt.x - 3 + (i % 7), y = mitt.y - 1 + Math.floor(i / 7), n1 = Math.min(m, rutaOf(k));
      if (!land(x, y)) continue;
      stackar.push({ k, n: n1, c: 1, x, y }); m -= n1;
    }
    if (!stackar.length) delete b.stackar;
    changed(b);
    return;
  }
  if (p.k !== 'ruin') return;
  const r = p.by !== undefined ? radNr(vl, p.by) : undefined;
  const n = Math.max(VACKTRESTER.husMin, Math.min(VACKTRESTER.husMax, r?.minne?.hus.length ?? Math.round((r?.hus ?? 0) / VACKTRESTER.husVarde)));
  // husen på land närmast mitten, med en ruta mellan sig (lite spridda ur platsens frö)
  const inne: { x: number; y: number }[] = [], tagen = new Set<number>(), kand: { x: number; y: number; d: number }[] = [];
  for (let y0 = 1; y0 + HUS_H < H; y0++) for (let x0 = 1; x0 + HUS_B < W; x0++) kand.push({ x: x0, y: y0, d: Math.hypot(x0 + HUS_B / 2 - mitt.x, (y0 + HUS_H / 2 - mitt.y) * 1.4) + hash3(fro, x0, y0, 0x7a61) * 4 });
  kand.sort((a, c) => a.d - c.d || a.y - c.y || a.x - c.x);
  let lagda = 0;
  for (const { x: x0, y: y0 } of kand) {
    if (lagda >= n) break;
    let ok = true;
    for (let y = y0 - 1; y <= y0 + HUS_H && ok; y++) for (let x = x0 - 1; x <= x0 + HUS_B; x++) if (!land(x, y) || tagen.has(y * W + x)) { ok = false; break; }
    if (!ok) continue;
    for (let y = y0 - 1; y <= y0 + HUS_H; y++) for (let x = x0 - 1; x <= x0 + HUS_B; x++) tagen.add(y * W + x);
    lagda++;
    for (let y = y0; y < y0 + HUS_H; y++) for (let x = x0; x < x0 + HUS_B; x++) {
      const kant = x === x0 || y === y0 || x === x0 + HUS_B - 1 || y === y0 + HUS_H - 1;
      if (!kant) inne.push({ x, y });
      else if (hash3(fro, x, y, 0x7a62) < VACKTRESTER.kvar) rester.push({ x, y, k: 'mur' });
    }
  }
  // sakerna som är kvar ligger inne i husen, en stack per ruta så stor som rutan rymmer
  if (!r) return;
  const stackar = (b.stackar ??= []);
  let i = 0;
  for (const [k, m0] of Object.entries(ruinKvar(vl, r, b.now)).sort((a, c) => a[0].localeCompare(c[0]))) {
    for (let m = m0; m >= 1 && i < inne.length; i++) { const q = inne[i], n1 = Math.min(m, rutaOf(k)); stackar.push({ k, n: n1, c: 1, x: q.x, y: q.y }); m -= n1; }
  }
  if (!stackar.length) delete b.stackar;
  changed(b);
}
