// ---------- världskartan på pergament (steg 11.9.2, Spelaren och bilden: Två kartlägen) ----------
// Världskartan ritad som en gammal karta: landet är ljust pergament, kusten ett bläckstreck med ett eko ute i havet, havet och
// sjöarna blå med vågstreck, floderna som slingrande blå linjer, och marksorterna som tecken med bläck: lövträd i skogen,
// granar tätt i den täta skogen, tuvor och vattenstreck på myren och berg med skuggsida. Kusten ritas rund genom att landet
// räknas ut punkt för punkt mellan rutornas mitt, med lite brus, så att rutorna inte syns. Allt tar sina färger ur paletten.
// Hur varje marksort ritas är en rad i registret PERGAMENT. Platserna, lederna, lagren och huvudbyns ram ritas som på den
// vanliga kartan (varldbild.ts) tills tecknen och utsmyckningen är valda i bildstilen (11.9.3 och 11.9.4).
import { BynsKarta, MARK_IDS, MarkId, O_KANT, VARLDMARK, Varlden, VarldMark, FLOD_NEDRE, LANDMARKEN, syns } from '../sim';
import { hash3 } from '../sim/slump';
import { farg } from '../palett';
import { VK, VarldBild, ritaTecken, lager, huvudbynsPlats, RYKTFARG, BLEKFARG, RAMFARG, LEDFARG } from './varldbild';
import { ledKlass } from '../sim';

// ett tecken: rader där o = bläck, a = fyllning, b = ljus sida, c = skuggsida (punkt = inget)
type Glyf = string[];
export interface PergamentMark {
  tecken?: Glyf[]; // tecknen som strös ut över marken (ett väljs per plats)
  steg?: number; // avståndet i punkter mellan tecknen
  farg?: Record<string, readonly [string, 0 | 1 | 2 | 3]>; // tecknets färger
  streck?: boolean; // vattenstreck mellan tecknen (myren)
  grasstrå?: number; // så stor del av platserna får ett litet grässtrå (slätten)
}
const TRAD: Glyf[] = [['.ooo.', 'oaaao', 'oaaao', '.ooo.', '..o..'], ['.oo..', 'oaao.', 'oaaao', '.ooo.', '..o..']];
const GRAN: Glyf[] = [['..o..', '.oao.', '.oao.', 'oaaao', '..o..'], ['.o.', 'oao', 'oao', '.o.']];
const TUVA: Glyf[] = [['o.o.o', '.ooo.'], ['.o.o.', 'o.o.o']];
const BERG: Glyf[] = [
  ['.....o.....', '....obo....', '...obbco...', '...obbcco..', '..obbbccco.', '.obbbbcccco', 'obbbbbccccco'],
  ['....o......', '...obo..o..', '..obbcoobo.', '.obbbcobbco', '.obbbbcbcco', 'obbbbccbccco', 'obbbbbcccccc'].map(r => r.slice(0, 12)),
  ['...o....', '..obo...', '.obbco..', '.obbcco.', 'obbbccco'],
];
export const PERGAMENT: Record<MarkId, PergamentMark> = {
  hav: {},
  sjo: {},
  slatt: { grasstrå: 0.08, steg: 6, farg: { o: ['oliv', 2] } },
  skog: { tecken: TRAD, steg: 7, farg: { o: ['barr', 1], a: ['oliv', 2] } },
  tat: { tecken: GRAN, steg: 5, farg: { o: ['barr', 0], a: ['barr', 2] } },
  myr: { tecken: TUVA, steg: 6, streck: true, farg: { o: ['oliv', 1] } },
  berg: { tecken: BERG, steg: 8, farg: { o: ['kol', 1], b: ['ben', 3], c: ['jord', 2] } },
};

const PAPPER = { mork: farg('ben', 1), mitt: farg('ben', 2), ljus: farg('ben', 3) };
const VATTEN = { botten: farg('skiffer', 3), vag: farg('skiffer', 2), eko: farg('skiffer', 2), flod: farg('skiffer', 1) };
const BLACK = farg('kol', 1);
const KUST = 1, EKO = 4; // kustens bläck är punkterna närmast landet, ekot så långt ut i havet
const rgb = (hex: string) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

// ett mjukt brus mellan 0 och 1 ur världens frö, i punkter med rutnätet s
function brus(fro: number, x: number, y: number, s: number, salt: number) {
  const fx = x / s, fy = y / s, xi = Math.floor(fx), yi = Math.floor(fy), u = fx - xi, v = fy - yi;
  const a = hash3(fro, xi, yi, salt), b = hash3(fro, xi + 1, yi, salt), c = hash3(fro, xi, yi + 1, salt), d = hash3(fro, xi + 1, yi + 1, salt);
  const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
}

export function ritaPergament(vl: Varlden, v: VarldMark, kn?: BynsKarta, marken?: number[]): VarldBild {
  const W = v.w * VK, H = v.h * VK, N = W * H;
  const b: VarldBild = { w: W, h: H, data: new Uint8ClampedArray(N * 4) };
  const satt = (x: number, y: number, c: number[]) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4; b.data[i] = c[0]; b.data[i + 1] = c[1]; b.data[i + 2] = c[2]; b.data[i + 3] = 255;
  };
  const mk = (rx: number, ry: number) => v.mark[Math.max(0, Math.min(v.h - 1, ry)) * v.w + Math.max(0, Math.min(v.w - 1, rx))];
  const land = (rx: number, ry: number) => VARLDMARK[MARK_IDS[mk(rx, ry)]].land ? 1 : 0;
  // landet punkt för punkt: rutornas land (1) och vatten (0) vägs mellan rutornas mitt, och bruset flyttar kusten lite
  const arLand = new Uint8Array(N), sort = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const fx = (x + 0.5) / VK - 0.5, fy = (y + 0.5) / VK - 0.5, rx = Math.floor(fx), ry = Math.floor(fy), u = fx - rx, w = fy - ry;
    const l = land(rx, ry) * (1 - u) * (1 - w) + land(rx + 1, ry) * u * (1 - w) + land(rx, ry + 1) * (1 - u) * w + land(rx + 1, ry + 1) * u * w;
    const n = (brus(v.fro, x, y, 7, 0x51) - 0.5) * 0.35 + (brus(v.fro, x, y, 3, 0x52) - 0.5) * 0.12;
    const i = y * W + x;
    arLand[i] = l + n > 0.5 ? 1 : 0;
    // marksorten: rutan under punkten, med kanten mellan sorterna förskjuten av bruset
    const jx = Math.floor((x + (brus(v.fro, x, y, 6, 0x53) - 0.5) * 9) / VK), jy = Math.floor((y + (brus(v.fro, x, y, 6, 0x54) - 0.5) * 9) / VK);
    let m = mk(jx, jy);
    if (arLand[i] !== (VARLDMARK[MARK_IDS[m]].land ? 1 : 0)) { // kusten flyttade sig: ta en granne av rätt slag
      m = arLand[i] ? MARK_IDS.indexOf('slatt') : MARK_IDS.indexOf(mk(Math.floor(x / VK), Math.floor(y / VK)) === MARK_IDS.indexOf('sjo') ? 'sjo' : 'hav');
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const t = mk(Math.floor(x / VK) + dx, Math.floor(y / VK) + dy);
        if ((VARLDMARK[MARK_IDS[t]].land ? 1 : 0) === arLand[i]) { m = t; break; }
      }
    }
    sort[i] = m;
  }
  // avståndet i vattnet till närmaste land (i punkter, upp till ekot och lite till)
  const avst = new Uint8Array(N).fill(255), ko: number[] = [];
  for (let i = 0; i < N; i++) if (arLand[i]) { avst[i] = 0; ko.push(i); }
  for (let k = 0; k < ko.length; k++) {
    const i = ko[k], d = avst[i]; if (d >= EKO + 2) continue;
    const x = i % W, y = (i - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx; if (avst[j] > d + 1) { avst[j] = d + 1; ko.push(j); }
    }
  }
  const hav = MARK_IDS.indexOf('hav');
  const C = { pm: rgb(PAPPER.mork), pp: rgb(PAPPER.mitt), pl: rgb(PAPPER.ljus), vb: rgb(VATTEN.botten), vv: rgb(VATTEN.vag), ve: rgb(VATTEN.eko), fl: rgb(VATTEN.flod), bl: rgb(BLACK) };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, g = hash3(v.fro, x, y, 0x55);
    if (arLand[i]) { satt(x, y, g < 0.025 ? C.pm : g > 0.985 ? C.pl : C.pp); continue; }
    const a = avst[i];
    let c = C.vb;
    if (a === KUST) c = C.bl;
    else if (a === EKO && sort[i] === hav) c = C.ve;
    else if (a > EKO + 1) { // vågstreck: korta bågar i rader, glest
      const r = y + Math.round(Math.sin(x / 3 + y * 0.7) * 1.2);
      if (r % 6 === 0 && hash3(v.fro, Math.floor(x / 9), y, 0x56) > 0.55) c = C.vv;
    }
    satt(x, y, c);
  }
  // floderna: en slingrande linje från rutans mitt till nästa rutas mitt, smal i det övre loppet och bredare i det nedre
  const fm = VK / 2;
  for (let i = 0; i < v.w * v.h; i++) {
    if (!v.flod[i] || v.ned[i] < 0) continue;
    const x0 = (i % v.w) * VK + fm, y0 = Math.floor(i / v.w) * VK + fm, j = v.ned[i], x1 = (j % v.w) * VK + fm, y1 = Math.floor(j / v.w) * VK + fm;
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)), br = v.flod[i] === FLOD_NEDRE ? 2 : 1;
    const nx = -(y1 - y0) / (n || 1), ny = (x1 - x0) / (n || 1), bag = (hash3(v.fro, i, 0, 0x57) - 0.5) * 6; // en båge åt sidan
    for (let k = 0; k <= n; k++) {
      const t = k / (n || 1), s = Math.sin(t * Math.PI) * bag;
      const x = Math.round(x0 + (x1 - x0) * t + nx * s), y = Math.round(y0 + (y1 - y0) * t + ny * s);
      for (let dy = 0; dy < br; dy++) for (let dx = 0; dx < br; dx++) satt(x + dx, y + dy, C.fl);
    }
  }
  // marksorternas tecken på ett rutnät med lite slump, uppifrån och ner så att det som står längre ner hamnar framför
  const flodPunkt = (x: number, y: number) => v.flod[Math.floor(y / VK) * v.w + Math.floor(x / VK)] > 0;
  for (let y = 2; y < H; y++) for (let x = 2; x < W; x++) {
    const m = MARK_IDS[sort[y * W + x]], p = PERGAMENT[m];
    if (!p.steg || x % p.steg !== 0 || y % p.steg !== 0) continue;
    const ox = Math.floor(hash3(v.fro, x, y, 0x58) * p.steg * 0.6), oy = Math.floor(hash3(v.fro, x, y, 0x59) * p.steg * 0.6);
    const cx = x + ox, cy = y + oy; if (cx >= W || cy >= H) continue;
    if (p.grasstrå !== undefined) {
      if (hash3(v.fro, cx, cy, 0x5a) < p.grasstrå && arLand[cy * W + cx]) { const c = rgb(farg(...p.farg!.o)); satt(cx, cy, c); satt(cx - 1, cy - 1, c); satt(cx + 1, cy - 1, c); }
      continue;
    }
    const gl = p.tecken![Math.floor(hash3(v.fro, cx, cy, 0x5b) * p.tecken!.length)], gh = gl.length, gw = gl[0].length;
    const x0 = cx - (gw >> 1), y0 = cy - gh + 1;
    // hela tecknet står på samma marksort och på land, och inte på en flod
    let ok = true;
    for (const [qx, qy] of [[x0, y0], [x0 + gw - 1, y0], [x0, cy], [x0 + gw - 1, cy], [cx, cy + 1]]) {
      if (qx < 0 || qy < 0 || qx >= W || qy >= H || sort[qy * W + qx] !== sort[y * W + x] || !arLand[qy * W + qx] || avst[qy * W + qx] === 0 && flodPunkt(qx, qy)) { ok = false; break; }
    }
    if (!ok) continue;
    if (p.streck) for (let k = -3; k <= 3; k++) if (arLand[(cy + 2) * W + cx + k]) satt(cx + k + 2, cy + 2, C.ve); // myrens vattenstreck under tuvan
    gl.forEach((r, dy) => [...r].forEach((ch, dx) => { const f = p.farg![ch]; if (f) satt(x0 + dx, y0 + dy, rgb(farg(...f))); }));
  }
  // lederna som streckade bläcklinjer, platserna, lagren och huvudbyns ram som på den vanliga kartan
  if (vl.leder) for (const k of Object.keys(vl.leder)) {
    const i = +k, ki = ledKlass(vl, i); if (ki === 'obanad') continue;
    const x = i % v.w, y = Math.floor(i / v.w);
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= v.w || ny >= v.h || ledKlass(vl, ny * v.w + nx) === 'obanad') continue;
      const ax = x * VK + fm, ay = y * VK + fm, bx = nx * VK + fm, by = ny * VK + fm, n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
      for (let t = 0; t <= n; t++) if (t % 4 < 2) satt(Math.round(ax + (bx - ax) * t / n), Math.round(ay + (by - ay) * t / n), rgb(LEDFARG.led));
    }
  }
  for (const p of vl.platser ?? []) if (syns(kn, p)) ritaTecken(b, LANDMARKEN[p.k].tecken, p.x, p.y);
  if (kn) {
    const kand = new Set((vl.platser ?? []).filter(p => (kn.niva(p.nr) ?? -1) >= O_KANT).map(p => p.y * v.w + p.x)), rc = rgb(RYKTFARG), bc = rgb(BLEKFARG);
    for (let ry = 0; ry < v.h; ry++) for (let rx = 0; rx < v.w; rx++) {
      const l = lager(kn, kand, v.w, rx, ry); if (l === 'kant') continue;
      for (let y = 0; y < VK; y++) for (let x = 0; x < VK; x++)
        if (l === 'rykte' ? (x + y) % 2 === 0 : x % 2 === 0 && y % 2 === 0) satt(rx * VK + x, ry * VK + y, l === 'rykte' ? rc : bc);
    }
  }
  for (const nr of marken ?? []) { const p = vl.platser?.find(q => q.nr === nr); if (p) ritaTecken(b, 'uppdrag', p.x, p.y); }
  const hb = huvudbynsPlats(vl);
  if (hb) { const rc = rgb(RAMFARG); for (let i = 0; i < VK; i++) for (const [x, y] of [[i, 0], [i, VK - 1], [0, i], [VK - 1, i]]) satt(hb.x * VK + x, hb.y * VK + y, rc); }
  return b;
}
