// ---------- pergamentkartans tecken och utsmyckning (steg 13.1.2) ----------
// Bilderna som Björn valt i bildstilen: platsernas femton tecken i bläck (kortet f11_platstecken, version 1) och kartans ram,
// kompassros och havets bilder (f11_utsmyckning): runbandet med runor och knutar i hörnen, det runda gradnätet som samlas i
// kompassrosen med röd nordspets, stämpeln i rött bläck, havsormen och skeppet. Utsmyckningen ritas på ett grövre rutnät, två
// punkter per världsruta som i bildstilen, där varje punkt är ett block på BL × BL punkter i spelets bild, så att den får samma
// storlek mot kartan som kortet visar. Allt tar sina färger ur paletten.
import { MARK_IDS, VARLDMARK, VarldMark } from '../sim';
import { hash3 } from '../sim/slump';
import { farg } from '../palett';
import { rgb255 } from './pixel';
import { VK } from './varldbild';

type Satt = (x: number, y: number, c: number[]) => void;
const F = (namn: string, ton: 0 | 1 | 2 | 3) => rgb255(farg(namn, ton));

// ---------- platsernas tecken (o = bläck, a = pergamentet, b = mörkt pergament, r och R = rött, j och J = jord, g = grönt,
// s = blågrått, y = gult) ----------
const TECKEN_FARG: Record<string, readonly [string, 0 | 1 | 2 | 3]> = {
  o: ['kol', 1], a: ['ben', 3], b: ['ben', 1], r: ['rost', 1], R: ['rost', 2], j: ['jord', 2], J: ['jord', 1], g: ['oliv', 2], G: ['oliv', 1], s: ['skiffer', 2], d: ['skiffer', 1], y: ['senap', 2],
};
export const PLATSTECKEN: Record<string, string[]> = {
  by: ['.....oo.....', '....oaao....', '...oaaaao...', '..oaaaaaao..', '.oaaaaaaaao.', 'oooooooooooo', '.oaaaaaaaao.', '.oaaarraaao.', '.oaaarraaao.', '.oooooooooo.'],
  handelslager: ['.....r......', '.....rr.....', '.....o......', '....oao.....', '...oaoao....', '..oaaoaao...', '.oaaaoaaao..', 'oaaaaoaaaao.', 'ooooooooooo.'],
  rovarlager: ['o.........o.', '.o.......o..', '..o.....o...', '...o...o....', '....o.o.....', '.....o......', '....oro.....', '...orrro....', '..o.rrr.o...', '.o..ooo..o..'],
  utpost: ['..o.o.o.o...', '..ooooooo...', '..oaaaaao...', '..ooooooo...', '...oa.ao....', '...o.o.o....', '...oo.oo....', '...o.o.o....', '..oo...oo...', '.oo.....oo..'],
  ruin: ['..oo........', '..oao...oo..', '..oao...oao.', '..oaoo..oao.', '..oaaoooaao.', '..oaoaaoaao.', '..oooooooooo', '.b...b...b..'],
  helig: ['.....oo.....', '..o.oaao.o..', '....oaao....', '.o..oaro..o.', '....oaao....', '....oaao....', '...oaaaao...', '..oooooooo..'],
  gravhog: ['.....o......', '....oao.....', '...ooooo....', '..oagagao...', '.oaaaaaaao..', 'oaagaaagaao.', 'oooooooooooo'],
  runsten: ['...oooo.....', '..oaaaao....', '..oaraao....', '..oarrao....', '..oaraao....', '..oaarao....', '..oaraao....', '..oaaaao....', '.oooooooo...'],
  fyndplats: ['.r.......r..', '..r.....r...', '...r...r....', '....r.r.....', '.....r......', '....r.r.....', '...r...r....', '..r.....r...', '.r.......r..'],
  karavanrest: ['...ooooo....', '..o..o..o...', '.o...o...o..', '.o.o.o.o.o..', '.ooooooooo..', '.o.o.o.o.o..', '.o...o...o..', '..o..o..o...', '...ooooo....'],
  gomma: ['....o.o.....', '.....o......', '....ooo.....', '...oaaao....', '..oaaaaao...', '..oaajaao...', '..oaaaaao...', '...ooooo....'],
  bro: ['oooooooooooo', 'oaoaoaoaoaoa', 'oooooooooooo', 'oo........oo', 'o..........o', '.ssss..ssss.'],
  spang: ['............', 'oooooooooooo', 'oajojaojajoo', 'oooooooooooo', '.o...o...o..', 'ss.ss.ss.ss.'],
  passage: ['......oo....', '.....oaao...', '....o.ooo...', '...o..oo....', '..o.........', '.oooooooo...', '.ojjjjjjo...', '.ojjjjjjo...', 'oooooooooo..'],
  rastplats: ['.....r......', '....rr......', '....rrr.....', '...rryrr....', '...o.o.o....', '..o.o.o.o...', '.oo.ooo.oo..'],
};
// platsens tecken mitt i rutan; false när sorten inte har något tecken på pergamentet (då ritas spelets vanliga)
export function ritaPlatstecken(satt: Satt, sort: string, rx: number, ry: number) {
  const r = PLATSTECKEN[sort]; if (!r) return false;
  const h = r.length, w = Math.max(...r.map(q => q.length)), x0 = rx * VK + ((VK - w) >> 1), y0 = ry * VK + ((VK - h) >> 1);
  r.forEach((rad, y) => [...rad].forEach((ch, x) => { const f = TECKEN_FARG[ch]; if (f) satt(x0 + x, y0 + y, F(...f)); }));
  return true;
}

// ---------- utsmyckningen ----------
export const BL = VK / 2; // ett block i utsmyckningen: två block per världsruta
const ROS = 15, RAM = 10;
const RUNOR = [
  ['#.#', '##.', '#.#', '#..', '#..'], ['##.', '#.#', '#.#', '#.#', '#.#'], ['#..', '##.', '#.#', '##.', '#..'],
  ['##.', '#.#', '##.', '#.#', '#.#'], ['#.#', '##.', '#..', '#..', '#..'], ['#.#', '.#.', '###', '.#.', '#.#'],
  ['.#.', '.##', '##.', '.#.', '.#.'], ['.#.', '.#.', '.#.', '.#.', '.#.'], ['..#', '.#.', '#..', '.#.', '..#'],
  ['.#.', '#.#', '.#.', '.#.', '.#.'], ['##.', '#.#', '##.', '#.#', '##.'], ['##.', '#.#', '#..', '#..', '#..'],
];
const SKEPP = ['....o....', '...oao...', '..oaaao..', '....o....', 'oo..o..oo', '.oooooo..'];

interface Hav { W: number; H: number; hav: Uint8Array; avst: Uint16Array; djup: [number, number][]; ros?: [number, number] }
// havet på det grova rutnätet: var det är hav, avståndet till land, och de två djupaste ställena långt från varandra
function havet(v: VarldMark): Hav {
  const W = v.w * 2, H = v.h * 2, N = W * H, hav = new Uint8Array(N), avst = new Uint16Array(N).fill(65535), ko: number[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, m = MARK_IDS[v.mark[(y >> 1) * v.w + (x >> 1)]];
    if (m === 'hav') hav[i] = 1; else if (!VARLDMARK[m].land) hav[i] = 2; // 2 = en sjö: vatten men inte havet
    if (hav[i] !== 1) { avst[i] = 0; ko.push(i); }
  }
  for (let k = 0; k < ko.length; k++) {
    const i = ko[k], x = i % W;
    for (const d of [-1, 1, -W, W]) { const j = i + d; if (j < 0 || j >= N || (d === -1 && x === 0) || (d === 1 && x === W - 1) || avst[j] <= avst[i] + 1) continue; avst[j] = avst[i] + 1; ko.push(j); }
  }
  const kand: [number, number, number][] = [];
  for (let i = 0; i < N; i++) { const x = i % W, y = (i / W) | 0; if (hav[i] === 1 && x > W * 0.15 && x < W * 0.8 && y > H * 0.15 && y < H * 0.8) kand.push([avst[i], x, y]); }
  kand.sort((a, b) => b[0] - a[0]);
  const djup: [number, number][] = [];
  for (const [, x, y] of kand) { if (djup.length >= 2) break; if (djup.every(([a, b]) => Math.hypot(a - x, b - y) > W / 3)) djup.push([x, y]); }
  if (!djup.length) djup.push([W >> 1, H >> 1]);
  return { W, H, hav, avst, djup };
}
// en fri plats ute i havet: minst avståndet d till land, inte nära kanten, skeppet, havsormen eller det som ska undvikas, så nära
// den önskade punkten som möjligt
function friHavsplats(V: Hav, d: number, px: number, py: number, undan: [number, number, number][] = []): [number, number] {
  let bast: [number, number, number] | undefined;
  const [sx, sy] = V.djup[0];
  for (let y = d + 12; y < V.H - d - 12; y++) for (let x = d + 12; x < V.W - d - 12; x++) {
    const i = y * V.W + x; if (V.hav[i] !== 1 || V.avst[i] < d) continue;
    if (V.djup.slice(1).some(([a, b]) => Math.hypot(a - x, b - y) < d + 8) || (x > sx - 18 - d && x < sx + 20 + d && Math.abs(y - sy) < d + 6)) continue;
    if (undan.some(([a, b, r]) => Math.hypot(a - x, b - y) < r + d + 6)) continue;
    const e = Math.hypot(x - px, y - py); if (!bast || e < bast[2]) bast = [x, y, e];
  }
  return bast ? [bast[0], bast[1]] : [Math.round(px), Math.round(py)];
}
const rosPlats = (V: Hav) => V.ros ??= friHavsplats(V, ROS + 4, V.W * 0.2, V.H * 0.22);

// utsmyckningen under platserna: det runda gradnätet i havet, havsormen och skeppet
export function prydUnder(v: VarldMark, satt: Satt) {
  const V = havet(v), blk = blockare(satt), BLACK = F('kol', 1);
  const [cx, cy] = rosPlats(V), inne = (x: number, y: number) => x >= RAM && y >= RAM && x < V.W - RAM && y < V.H - RAM;
  const nat = (x: number, y: number) => { if (inne(x, y) && V.hav[y * V.W + x] === 1) blk(x, y, F('jord', 1)); };
  const maxR = Math.hypot(Math.max(cx, V.W - cx), Math.max(cy, V.H - cy));
  for (let r = ROS + 30; r < maxR; r += 42) { const n = Math.ceil(2 * Math.PI * r * 2); for (let k = 0; k < n; k++) if (Math.floor(k / 2) % 2 === 0) { const a = k / n * 2 * Math.PI; nat(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r)); } }
  for (let j = 0; j < 16; j++) for (let t = (ROS + 3) * 2; t < maxR * 2; t++) {
    if (Math.floor(t / 2) % 2) continue;
    const r = t / 2, a = j / 16 * 2 * Math.PI + r / maxR * 0.45; // bågen: vinkeln växer lite med avståndet
    nat(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r));
  }
  // havsormen: tre bågar och ett huvud, i det djupaste havet
  const [sx, sy] = V.djup[0];
  for (let k = 0; k < 3; k++) for (let a = 0; a <= 8; a++) { const x = Math.round(sx - 10 + k * 7 + a * 0.6), y = sy - Math.round(Math.sin(a / 8 * Math.PI) * 3); blk(x, y, BLACK); blk(x, y + 1, F('barr', 2)); }
  glyf(blk, ['.oo.', 'oaao', '.oao', '..o.'], { o: BLACK, a: F('barr', 2) }, sx + 13, sy - 3);
  for (const [x, y] of V.djup.slice(1)) glyf(blk, SKEPP, { o: BLACK, a: F('ben', 3) }, x, y);
}
// utsmyckningen över platserna: kompassrosen, stämpeln och runbandet runt kanten
export function prydOver(v: VarldMark, satt: Satt) {
  const V = havet(v), blk = blockare(satt);
  kompassros(V, blk); stampel(V, v.fro, blk); runband(V, v.fro, blk);
}

const blockare = (satt: Satt): Satt => (x, y, c) => { for (let dy = 0; dy < BL; dy++) for (let dx = 0; dx < BL; dx++) satt(x * BL + dx, y * BL + dy, c); };
function glyf(blk: Satt, rader: string[], leg: Record<string, number[]>, cx: number, cy: number) {
  const h = rader.length, w = rader[0].length, x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2);
  rader.forEach((r, y) => [...r].forEach((ch, x) => { const c = leg[ch]; if (c) blk(x0 + x, y0 + y, c); }));
}
// kompassrosen där gradnätet samlas: en dubbel ring och en stjärna med åtta uddar, de långa åt väderstrecken, norr i rött
function kompassros(V: Hav, blk: Satt) {
  const [cx, cy] = rosPlats(V), R = ROS, L = R - 2, BLACK = F('kol', 1);
  const prov = (x: number, y: number, k: number, Ls: number, Wm: number) => {
    const f = k * Math.PI / 4, fram = x * Math.cos(f) + y * Math.sin(f), tvar = -x * Math.sin(f) + y * Math.cos(f);
    return fram >= -0.5 && fram <= Ls && Math.abs(tvar) <= Wm * (1 - Math.max(0, fram) / Ls) + 0.35 ? { inne: true, ljus: tvar > 0, norr: k === 6, lang: k % 2 === 0 } : undefined;
  };
  const udd = (x: number, y: number) => {
    const a = Math.atan2(y, x), lang = ((Math.round(a / (Math.PI / 2)) % 4) + 4) % 4 * 2, kort = ((Math.round((a - Math.PI / 4) / (Math.PI / 2)) % 4) + 4) % 4 * 2 + 1;
    return prov(x, y, lang, L, 3) ?? prov(x, y, kort, L * 0.6, 2) ?? { inne: false, ljus: false, norr: false, lang: false };
  };
  for (let y = -R - 1; y <= R + 1; y++) for (let x = -R - 1; x <= R + 1; x++) {
    const d = Math.hypot(x, y); if (d > R + 0.5) continue;
    let c = Math.abs(d - R) < 0.5 || Math.abs(d - (R - 3)) < 0.5 ? BLACK : F('ben', 2);
    const u = udd(x, y);
    if (u.inne) {
      const kant = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !udd(x + a, y + b).inne);
      c = kant ? BLACK : u.norr ? (u.ljus ? F('rost', 2) : F('rost', 1)) : u.ljus ? F('ben', 3) : u.lang ? F('jord', 1) : F('jord', 2);
    }
    blk(cx + x, cy + y, c);
  }
  glyf(blk, ['o.o', 'oo.', 'o.o', 'o..', 'o..'], { o: BLACK }, cx, cy - R - 5); // en runa ovanför norr
}
// en gammaldags stämpel i rött bläck: två ringar, prickar runt om och en runa i mitten, lite sned och nött där bläcket inte tog
function stampel(V: Hav, fro: number, blk: Satt) {
  const R = 15, [cx, cy] = friHavsplats(V, R + 2, V.W * 0.8, V.H * 0.82, [[...rosPlats(V), ROS]]), BLR = F('rost', 1);
  const RUNA = ['##.', '#.#', '##.', '#.#', '#.#'];
  const bit = (x: number, y: number) => {
    const d = Math.hypot(x, y), a = Math.atan2(y, x);
    if ((d > R - 1.6 && d <= R + 0.4) || Math.abs(d - (R - 5)) < 0.6) return true;
    if (Math.abs(d - (R - 3)) < 0.8 && Math.abs(((a / (Math.PI / 6)) % 1 + 1) % 1 - 0.5) < 0.12) return true;
    const rx = Math.floor((x + 3) / 2), ry = Math.floor((y + 5) / 2);
    return ry >= 0 && ry < 5 && rx >= 0 && rx < 3 && RUNA[ry][rx] === '#';
  };
  const s = -0.25; // stämpeln sitter lite snett
  for (let Y = cy - R - 2; Y <= cy + R + 2; Y++) for (let X = cx - R - 2; X <= cx + R + 2; X++) {
    const dx = X - cx, dy = Y - cy, x = dx * Math.cos(s) + dy * Math.sin(s), y = -dx * Math.sin(s) + dy * Math.cos(s);
    if (bit(x, y) && hash3(fro, X, Y, 0x91) >= 0.12) blk(X, Y, BLR); // nött där bläcket inte tog
  }
}
// runbandet: en ram av två bläcklinjer med runor emellan och en knut i varje hörn, som på en runsten
function runband(V: Hav, fro: number, blk: Satt) {
  const { W, H } = V, BLACK = F('kol', 1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = Math.min(x, y, W - 1 - x, H - 1 - y); if (k >= RAM) continue;
    const g = hash3(fro, x, y, 0x81);
    blk(x, y, k === 0 || k === RAM - 1 ? BLACK : k === 1 ? F('senap', 3) : g < 0.06 ? F('ben', 3) : g > 0.97 ? F('ben', 1) : F('ben', 2));
  }
  const runrad = (x: number, y: number, n: number, salt: number, lodratt = false) => {
    for (let k = 0; k < n; k++) {
      const r = RUNOR[Math.floor(hash3(fro, k, salt, 0x33) * RUNOR.length)];
      r.forEach((rad, dy) => [...rad].forEach((ch, dx) => { if (ch === '#') lodratt ? blk(x + 4 - dy, y + k * 4 + dx, BLACK) : blk(x + k * 4 + dx, y + dy, BLACK); }));
    }
  };
  const nv = Math.floor((W - 28) / 4), nl = Math.floor((H - 28) / 4) - 1;
  runrad(14, 3, nv, 11); runrad(14, H - 8, nv, 12); runrad(3, 14, nl, 14, true); runrad(W - 8, 14, nl, 15, true);
  for (const [x, y] of [[5, 5], [W - 5, 5], [5, H - 5], [W - 5, H - 5]]) glyf(blk, ['.ooo.', 'oaoao', 'ooboo', 'oaoao', '.ooo.'], { o: BLACK, a: F('rost', 1), b: F('ben', 3) }, x, y);
}
