import { HOUR, W, H, State } from './typer';
import { balans } from './balans';
import { BUSKE, Ground, BAR, FOREST, VAG, isSoil } from './vag';
import { hash } from './karta';

// ---------- buskarna (steg 6.5.3, "Skogen som byn sköter" i designdokumentet, stycket Buskar) ----------
// Högt gräs som ingen gått på på länge kan bli en buske, och sedan växer skogen in genom buskarna. Buskar blir oftast i
// skogsbrynet, i gläntorna och på öppen mark: chansen är mindre ju fler stora träd som står runt rutan (trängseln, mark.ts).
// En buske är ett slags mark (markslag i mark.ts), inte en sak: den gör gången långsammare som ungskog, ger grenar åt den som
// samlar där, brinner lätt (BRAND.buske), och kaninerna trivs i den (fynd.ts). Där något byggs, ett fält röjs eller en stig
// trampas upp försvinner busken, och när ett träd växt till skog tar skogen över.
// Lagret g.buske (en byte per ruta, sparat i s.buskar): 0 till ORORD = hur många timmar det höga gräset stått orört, och
// BUSKE + raden i BUSKAR = en buske av den sorten
export const BUSKTAL = balans('buskar', {
  orordDygn: 10, // gräset ska ha stått högt och orört så här många dygn (år i spelet) innan en buske kan växa där ...
  chans: 0.0005, // ... och sedan är chansen per timme så här stor att den gör det (i snitt efter ungefär 80 dygn till) ...
  trang: 0.5, // ... delat med 1 + så här mycket per stort träd runt rutan (trängseln), så att buskarna blir få inne i skogen
  grenar: 1.5, // den som samlar vid en buske hittar så här många gånger så många grenar
});

// sorterna. ikon = bilden (ui/buske.ts), grenar = om den ger grenar åt den som samlar
export interface Busksort { id: string; namn: string; text: string; grenar: boolean }
export const BUSKAR: Busksort[] = [
  { id: 'vanlig', namn: 'Buske', text: 'En snårig buske. Den ger grenar, gör det tyngre att gå och brinner lätt.', grenar: true },
];
export const ORORD = Math.min(240, BUSKTAL.orordDygn * 24); // timmarna räknas i en byte
export { BUSKE };
export const busksort = (g: Ground, i: number): Busksort | undefined => (g.buske?.[i] ?? 0) >= BUSKE ? BUSKAR[g.buske![i] - BUSKE] : undefined;
export const arBuske = (g: Ground, i: number) => (g.buske?.[i] ?? 0) >= BUSKE;

// en timme på jordruta i (från growGround i mark.ts, efter att gräset och träden vuxit): räkna de orörda timmarna, låt en
// buske växa upp (inte när inget växer, ts = trädens tillväxt i tidsåldern), och ta bort den där skogen tagit över eller en
// stig trampats upp. trang = trängseln (mark.ts), räknas bara när en buske kan växa
export function vaxBuske(s: State, g: Ground, i: number, hours: number, ts: number, trang: (g: Ground, i: number) => number) {
  const b = g.buske!, v = b[i];
  if (v >= BUSKE) { if (g.trees[i] >= FOREST || g.cover[i] < BAR) b[i] = 0; return; }
  if (g.cover[i] < 1 || g.trees[i] >= VAG.ungskog) { b[i] = 0; return; } // någon har gått här (gräset är inte helt uppvuxet), eller ungskog står här
  if (v < ORORD) { b[i] = Math.min(ORORD, v + hours); return; }
  if (!ts) return;
  const x = i % W, y = (i - x) / W;
  if (hash(s.seed + Math.floor(s.now / HOUR) * 7 + 911, x, y) < hours * BUSKTAL.chans / (1 + BUSKTAL.trang * trang(g, i))) b[i] = BUSKE; // en vanlig buske
}
// grenarna: den som samlar på en buske eller bredvid en (de fyra grannarna) hittar fler, om busken ger grenar
export function grenFaktor(g: Ground, i: number) {
  const x = i % W, ger = (j: number) => busksort(g, j)?.grenar;
  return ger(i) || (x > 0 && ger(i - 1)) || (x < W - 1 && ger(i + 1)) || (i >= W && ger(i - W)) || (i + W < W * H && ger(i + W)) ? BUSKTAL.grenar : 1;
}
// busken tas bort (rutan byggs på, röjs eller brinner)
export function tabortBuske(g: Ground, i: number) { if (g.buske) g.buske[i] = 0; }
export const nyaBuskar = () => new Uint8Array(W * H);
// för scenariot: antalet buskar på kartan
export function antalBuskar(g: Ground) { let n = 0; for (let i = 0; i < W * H; i++) if (isSoil(g.tiles[i]) && arBuske(g, i)) n++; return n; }

