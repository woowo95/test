// Träden (steg 5.1.4, "Mark, stigar och skog" i designdokumentet, Ett träd per ruta): högst ett träd per jordruta, och varje
// träd följs för sig med art, ålder och växtstadium. Hur stort trädet är (0 till 1: planta, ungträd och vuxet) står i
// g.trees som förut (mark.ts växer det), och åldern efter att det blivit vuxet i g.alder (dygn, år i spelet). Ett vuxet träd
// blir gammalt om det står fritt (inga andra vuxna träd i rutorna närmast) och torkar annars; ett gammalt träd blir en
// torraka, och torrakan faller till sist och lämnar en glänta där nya plantor slår rot. Art och startålder räknas ur byns
// frö och rutan, inte ur spelets slump, så att spelet utvecklas likadant. Frön är inte träd: att ett frö gror är chansen per
// timme i mark.ts (fro), och då står en planta på rutan.
import { hash, vnoise } from './karta';
import { balans } from './balans';
import { FOREST, Ground, VAG } from './vag';
import { H, T, W, inMap } from './typer';

export const TRAD = balans('trad', {
  vuxenDygn: 120, // ett träd är vuxet så här många dygn (år i spelet) efter att det vuxit klart ...
  gammalDygn: 60, // ... sedan gammalt så här länge (bara ett träd som står fritt; i en tät dunge torkar det i stället) ...
  torrDygn: 15, // ... och står sedan som torraka så här länge innan det faller
  jatte: 0.02, // så stor del av de gamla träden är jätteträd (räknat ur rutan, steg 5.1.4.5)
  // trädsorterna (steg 5.1.6): en långsam våg över kartan ger granskog, blandskog och björkdungar
  artVag: 16, // vågens storlek i rutor
  bjorkGran: 0.05, // chansen för en björk där vågen är låg (granskogen) ...
  bjorkDunge: 0.85, // ... och där den är hög (björkdungarna); däremellan blandskog
  bjorkKant: 0.3, // så mycket mer björk i skogskanten och där skogen kommer tillbaka (efter en brand)
  bjorkVatten: 0.35, // och så mycket mer björk med vatten högst två rutor bort
});

// sorterna (register, steg 5.1.6): granen och björken. Bara utseende, båda ger samma trä. Rutans sort står i g.art (platsen i
// registret) och bestäms när plantan slår rot, ur rutan och inte ur spelets slump: en långsam våg över kartan (räknad ur
// byns frö, som skogsmarken) gör områden med mörk granskog, blandskog och ljusa björkdungar, och björken växer helst i
// skogskanten, vid vattnet och där skogen kommer tillbaka. Fler sorter (tall, ek, lind, ask) kommer i steg 14.5.1
export interface TradArt { id: 'gran' | 'bjork'; namn: string }
export const TRADARTER: TradArt[] = [{ id: 'gran', namn: 'Gran' }, { id: 'bjork', namn: 'Björk' }];
export const GRAN = 0, BJORK = 1;
export const tradArt = (g: Ground, i: number): TradArt => TRADARTER[g.art?.[i] ?? GRAN] ?? TRADARTER[GRAN];
// björkens chans på rutan i: vågen, skogskanten (få vuxna träd runt om) eller ny skog, och vattnet nära
export function bjorkChans(seed: number, g: { trees: Float32Array; tiles: Uint8Array }, i: number, ny: boolean) {
  const x = i % W, y = (i / W) | 0, k = TRAD.artVag;
  const v = vnoise(seed + 881, x / k, y / k) * 0.7 + vnoise(seed + 887, x / (k / 2.3), y / (k / 2.3)) * 0.3;
  const f = Math.max(0, Math.min(1, (v - 0.38) / 0.24));
  let p = TRAD.bjorkGran + (TRAD.bjorkDunge - TRAD.bjorkGran) * f, skog = 0, vatten = false;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const xx = x + dx, yy = y + dy;
    if ((!dx && !dy) || !inMap(xx, yy)) continue;
    const j = yy * W + xx;
    if (g.tiles[j] === T.Vatten) vatten = true;
    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && g.trees[j] >= FOREST) skog++;
  }
  if (ny || skog < 5) p += TRAD.bjorkKant;
  if (vatten) p += TRAD.bjorkVatten;
  return p;
}
export const valjArt = (seed: number, g: { trees: Float32Array; tiles: Uint8Array }, i: number, ny: boolean) =>
  hash(seed + 883, i % W, (i / W) | 0) < bjorkChans(seed, g, i, ny) ? BJORK : GRAN;
// sorterna när urskogen börjar (eller i en äldre sparfil): varje träd som står där
export function startArt(seed: number, trees: Float32Array, tiles: Uint8Array) {
  const a = new Uint8Array(W * H);
  for (let i = 0; i < a.length; i++) if (trees[i] > 0) a[i] = valjArt(seed, { trees, tiles }, i, false);
  return a;
}
export const packaArt = (a: Uint8Array) => btoa(Array.from(a, v => String.fromCharCode(v)).join(''));
export function lasArt(txt: string) {
  const a = new Uint8Array(W * H);
  try { const bin = atob(txt); for (let i = 0; i < Math.min(bin.length, a.length); i++) a[i] = bin.charCodeAt(i); } catch { /* nya sorter */ }
  return a;
}

// stadierna (register), i den ordning trädet går igenom dem. stam = hur mycket trä och grenar trädet ger när det fälls,
// gånger ett vuxet träds (SKOG.stamVed och stamGrenar i skog.ts) och gånger trädets storlek (steg 5.1.4.4): ett gammalt
// träd är grövre, och torrakan har tappat grenarna men stammen står kvar
export type Stadium = 'planta' | 'ungtrad' | 'vuxet' | 'gammalt' | 'jatte' | 'torraka';
export const STADIER: { id: Stadium; namn: string; stam: number; grenar: number }[] = [
  { id: 'planta', namn: 'Planta', stam: 1, grenar: 1 }, { id: 'ungtrad', namn: 'Ungträd', stam: 1, grenar: 1 },
  { id: 'vuxet', namn: 'Vuxet träd', stam: 1, grenar: 1 }, { id: 'gammalt', namn: 'Gammalt träd', stam: 1.5, grenar: 1.4 },
  { id: 'jatte', namn: 'Jätteträd', stam: 2, grenar: 1.8 }, // ett sällsynt gammalt träd som blivit väldigt stort
  { id: 'torraka', namn: 'Torraka', stam: 1.25, grenar: 0.4 },
];
export const stadiumAv = (id: Stadium) => STADIER.find(q => q.id === id)!;
const GAMMAL = () => TRAD.vuxenDygn, TORR = () => TRAD.vuxenDygn + TRAD.gammalDygn, FALL = () => TRAD.vuxenDygn + TRAD.gammalDygn + TRAD.torrDygn;
// är det gamla trädet på ruta i ett jätteträd (ett av femtio, räknat ur rutan)
export const arJatte = (i: number) => hash(9173, i % W, (i / W) | 0) < TRAD.jatte;
export function stadium(g: Ground, i: number): Stadium | null {
  const v = g.trees[i];
  if (v <= 0) return null;
  if (v < VAG.ungskog) return 'planta';
  if (v < 1) return 'ungtrad';
  const a = g.alder?.[i] ?? 0;
  return a < GAMMAL() ? 'vuxet' : a < TORR() ? (arJatte(i) ? 'jatte' : 'gammalt') : 'torraka';
}
// trädets ålder i dygn (år i spelet): tiden det tog att växa (tradDygn i mark.ts, efter hur stort det är) och åldern som vuxet
export const tradAlder = (g: Ground, i: number, tradDygn: number) => g.trees[i] < 1 ? g.trees[i] * tradDygn : tradDygn + (g.alder?.[i] ?? 0);

// står trädet fritt: inga andra vuxna träd (skog) i de åtta rutorna närmast
function fritt(trees: Float32Array, i: number) {
  const x = i % W, y = (i / W) | 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && inMap(x + dx, y + dy) && trees[(y + dy) * W + x + dx] >= FOREST) return false;
  return true;
}
// åldrarna när urskogen börjar: jämnt utspridda över ett träds liv. Ett träd i en tät dunge blir aldrig gammalt, så dess
// liv är kortare (vuxet och sedan torraka), och åldern sprids över det
export function startAlder(seed: number, trees: Float32Array) {
  const a = new Float32Array(W * H);
  for (let i = 0; i < a.length; i++) {
    if (trees[i] < 1) continue;
    const r = hash(seed + 71, i % W, (i / W) | 0);
    if (fritt(trees, i)) { a[i] = r * FALL(); continue; }
    const v = r * (GAMMAL() + TRAD.torrDygn);
    a[i] = v < GAMMAL() ? v : TORR() + v - GAMMAL();
  }
  return a;
}
// en timme (eller flera) för träden som vuxit klart: de åldras, och torrakan faller (trädet är borta och rutan blir en glänta)
export function aldras(g: Ground, i: number, hours: number) {
  const a = g.alder!, fore = a[i], efter = fore + hours / 24;
  if (fore < GAMMAL() && efter >= GAMMAL() && !fritt(g.trees, i)) { a[i] = TORR(); return; } // i en tät dunge torkar det
  if (efter >= FALL()) { g.trees[i] = 0; a[i] = 0; return; }
  a[i] = efter;
}
// åldern packad i sparfilen: ett tecken per ruta, hela dygn
export const ALDER_MAX = 255;
export const packaAlder = (a: Float32Array) => btoa(Array.from(a, v => String.fromCharCode(Math.min(ALDER_MAX, Math.round(v)))).join(''));
export function lasAlder(txt: string) {
  const a = new Float32Array(W * H);
  try { const bin = atob(txt); for (let i = 0; i < Math.min(bin.length, a.length); i++) a[i] = bin.charCodeAt(i); } catch { /* ny ålder */ }
  return a;
}

