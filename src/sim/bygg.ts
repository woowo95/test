import { ageOf, count, living, log, stat } from './folk';
import { Bit, Hus, MATERIAL, beds, bitsOf, blocked, freeNear, gridOf, housesOf, touch } from './byggnad';
import { getMap } from './karta';
import { groundOf } from './mark';
import { campCenter } from './plats';
import { sedEvent } from './seder';
import { rnd } from './slump';
import { knows } from './teknik';
import { addTo, amountOf, zonesOf } from './lager';
import { freeTools } from './agande';
import { FOREST } from './vag';
import { H, HOUR, Person, State, T, W } from './typer';

// ---------- att bygga ----------
const RESERVE: Record<string, number> = { grenar: 15, torrgras: 6, ved: 6 }; // det som lämnas kvar i förrådet till elden
const MAX_INNE = 24; // största hus: så många sovplatser
const LAGA = 0.5; // väggar under det skicket lagas

// var p sover: en egen ruta under tak om det finns, annars ingenstans
export function bedFor(s: State, p: Person) {
  const b = beds(s);
  if (!b.length) return undefined;
  const ppl = living(s).sort((a, c) => a.id - c.id), i = b[Math.max(0, ppl.indexOf(p)) % b.length];
  return { x: i % W + 0.3 + rnd(s) * 0.4, y: Math.floor(i / W) + 0.3 + rnd(s) * 0.4 };
}

// ---------- planering: byn bestämmer vad som byggs ----------
const tileOk = (s: State, x: number, y: number) => {
  if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return false;
  const m = getMap(s.seed), i = y * W + x, t = m.tiles[i], f = m.fire;
  if (t === T.Vatten || t === T.Sten) return false; // träden spelar ingen roll: de fälls innan bygget börjar
  if (Math.max(Math.abs(x - f.x), Math.abs(y - f.y)) < 2) return false; // inte inpå elden
  if (gridOf(s).at.has(i)) return false;
  if (zonesOf(s).some(z => x >= z.x - 1 && x < z.x + z.w + 1 && y >= z.y - 1 && y < z.y + z.h + 1)) return false;
  if ((s.stackar ?? []).some(a => a.x === x && a.y === y) || (s.stockar ?? []).some(k => Math.floor(k.x) === x && Math.floor(k.y) === y) || (s.stubbar ?? []).some(k => k.x === x && k.y === y)) return false;
  return true;
};
// en plats för ett hus med yttermåtten w×h inom byområdet, helst en bit från elden och inte på lekplatsen. Träden där
// huset ska stå fälls först, men en plats med färre träd går fortare
function siteFor(s: State, w: number, h: number, okAt: Uint8Array) {
  const f = getMap(s.seed).fire, mid = campCenter(s), R = 9 + living(s).length * 0.25, g = groundOf(s);
  let best: { x: number; y: number } | undefined, bs = Infinity;
  for (let y = 1; y + h < H; y++) for (let x = 1; x + w < W; x++) {
    const cx = x + w / 2, cy = y + h / 2;
    if (Math.hypot(cx - mid.x, cy - mid.y) > R) continue;
    let ok = true;
    for (let yy = y - 1; yy <= y + h && ok; yy++) for (let xx = x - 1; xx <= x + w && ok; xx++) {
      const inside = xx >= x && xx < x + w && yy >= y && yy < y + h;
      if (inside ? !okAt[yy * W + xx] : gridOf(s).at.has(yy * W + xx)) ok = false; // en ruta fritt runt andra hus
    }
    if (!ok) continue;
    const dx = Math.max(x - f.x, 0, f.x - (x + w - 1)), dy = Math.max(y - f.y, 0, f.y - (y + h - 1)), near = Math.hypot(dx, dy);
    const lek = x <= f.x + 4 && x + w > f.x - 4 && y <= f.y + 6 && y + h > f.y + 3 ? 3 : 0;
    let trad = 0; // helst en plats med få träd: varje träd ska fällas först
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (g.trees[yy * W + xx] >= FOREST) trad++;
    const sc = Math.abs(near - HUS_AVST) + 0.2 * Math.hypot(cx - mid.x, cy - mid.y) + lek + 0.15 * trad;
    if (sc < bs) { bs = sc; best = { x, y }; }
  }
  return best;
}
const HUS_AVST = 5.5; // så långt från elden man helst bygger (rutor till husets närmaste vägg)
const canBuildWalls = (p: Person, s: State) => ageOf(p, s.now) >= 14 && knows(p, 'timmervagg');
// en gång i timmen: planera ett nytt hus om någon kan bygga väggar och alla inte har en sovplats under tak
export function planBuild(s: State) {
  const ppl = living(s), hs = housesOf(s);
  if (!ppl.length || hs.some(h => !h.klar)) return;
  const by = ppl.filter(p => canBuildWalls(p, s)).sort((a, b) => (b.skill.hantverk + stat(b, 'intelligens', s.now) / 4) - (a.skill.hantverk + stat(a, 'intelligens', s.now) / 4))[0];
  const need = ppl.length - beds(s).length;
  if (!by || need <= 0 || s.now < (s.byggSok ?? 0)) return;
  // storleken efter hur många som behöver en sovplats och lite till för barn som kommer; så nära kvadratiskt som möjligt
  const sizes: { w: number; h: number }[] = [];
  for (let h = 2; h <= 4; h++) for (let w = h; w <= 2 * h; w++) sizes.push({ w, h });
  const want = Math.min(MAX_INNE, need + 2);
  sizes.sort((a, b) => (a.w * a.h < want ? 1000 - a.w * a.h : 0) - (b.w * b.h < want ? 1000 - b.w * b.h : 0) || a.w * a.h - b.w * b.h || (a.w - a.h) - (b.w - b.h));
  const okAt = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) okAt[i] = tileOk(s, i % W, Math.floor(i / W)) ? 1 : 0;
  for (const { w, h } of sizes) {
    const at = siteFor(s, w + 2, h + 2, okAt);
    if (!at) continue;
    const f = getMap(s.seed).fire, cx = at.x + (w + 1) / 2, cy = at.y + (h + 1) / 2;
    // öppningen mitt på den sida som vetter mot elden
    const side = Math.abs(f.x + 0.5 - cx) > Math.abs(f.y + 0.5 - cy) ? (f.x < cx ? 'v' : 'o') : (f.y < cy ? 'n' : 's');
    const ox = side === 'v' ? at.x : side === 'o' ? at.x + w + 1 : at.x + 1 + Math.floor(w / 2);
    const oy = side === 'n' ? at.y : side === 's' ? at.y + h + 1 : at.y + 1 + Math.floor(h / 2);
    const big = w * h >= 8, base = big ? 'Långhuset' : 'Hyddan', same = hs.filter(q => q.namn.startsWith(big ? 'Långhus' : 'Hydda')).length;
    const hus: Hus = { id: (s.nextBit ??= 1), namn: same ? `${big ? 'Långhus' : 'Hydda'} ${same + 1}` : base, x: at.x, y: at.y, w: w + 2, h: h + 2, t: s.now, by: by.id };
    s.nextBit++;
    const golv = 'tra';
    for (let y = at.y; y < at.y + h + 2; y++) for (let x = at.x; x < at.x + w + 2; x++) {
      const edge = x === at.x || y === at.y || x === at.x + w + 1 || y === at.y + h + 1, open = x === ox && y === oy;
      const m = open ? 'oppning' : edge ? 'timmer' : golv;
      bitsOf(s).push({ id: s.nextBit++, x, y, k: MATERIAL[m].k, m, b: open ? 1 : 0, mat: 0, c: 1, hus: hus.id });
    }
    hs.push(hus); touch(s);
    log(s, `${by.name} planerar ${big ? 'ett långhus' : 'en hydda'}${same ? ' till' : ''} med plats för ${w * h} att sova under tak.`, 'world', [by.id]);
    return;
  }
  s.byggSok = s.now + 12 * HOUR; // ingen plats nu: försök igen om ett tag
}

// ---------- arbete ----------
// fell = ett träd står där biten ska byggas och måste fällas först
export interface Job { bit: Bit; repair: boolean; item?: string; need: number; missing: boolean; fell?: boolean }
export const avail = (s: State, k: string) => amountOf(s, k) - (RESERVE[k] ?? 0);
export const treeOn = (s: State, b: Bit) => groundOf(s).trees[b.y * W + b.x] >= FOREST;
// det p kan bygga härnäst: lagning av slitna väggar först, sedan jordgolv, väggar och sist trägolv. Det andra redan bygger tas inte
export function buildJob(s: State, p: Person): Job | undefined {
  if (ageOf(p, s.now) < 12) return;
  const others = living(s).filter(q => q !== p);
  const taken = new Set(others.filter(q => q.task?.act === 'bygga').map(q => q.task!.ref));
  // först fälls träden där huset ska stå, även inne i huset, av den som har en ledig yxa
  const fallers = others.filter(q => q.task?.act === 'falla' || q.task?.act === 'hugga');
  if (freeTools(s, p, 'yxa') > 0) {
    const felling = new Set(fallers.filter(q => q.task!.act === 'falla').map(q => Math.floor(q.task!.ty) * W + Math.floor(q.task!.tx)));
    let fb: Bit | undefined, fs = Infinity;
    for (const b of bitsOf(s)) {
      if ((b.b >= 1 && b.k !== 'oppning') || !treeOn(s, b) || felling.has(b.y * W + b.x)) continue;
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d < fs) { fs = d; fb = b; }
    }
    if (fb) return { bit: fb, repair: false, need: 0, missing: false, fell: true };
  }
  if (taken.size >= 4) return;
  let best: Job | undefined, bs = Infinity;
  for (const b of bitsOf(s)) {
    if (taken.has(b.id) || b.k === 'oppning' || (b.b < 1 && treeOn(s, b))) continue;
    const M = MATERIAL[b.m], repair = b.b >= 1;
    if (repair && b.c >= LAGA) continue;
    if (M.tek && !knows(p, M.tek)) continue;
    const need = needOf(b);
    const sc = (repair ? 0 : b.k === 'golv' ? (M.item ? 300 : 100) : 200) + Math.hypot(b.x - p.x, b.y - p.y);
    if (sc < bs) { bs = sc; best = { bit: b, repair, item: M.item, need, missing: need > 0 && avail(s, M.item!) < need }; }
  }
  return best;
}
export const bitById = (s: State, id?: number) => bitsOf(s).find(b => b.id === id);
// material som fattas på bygget eller lagningen
export function needOf(b: Bit) {
  const M = MATERIAL[b.m];
  if (!M.item) return 0;
  return Math.max(0, b.b >= 1 ? Math.ceil(M.n / 2) - (b.lm ?? 0) : M.n - b.mat);
}
export const lacks = (b: Bit) => needOf(b) > 1e-9;
// var man står när man bygger: på golvet, eller bredvid väggen (helst inne i huset)
export function siteOf(s: State, b: Bit) {
  if (b.k !== 'vagg') return { x: b.x + 0.5, y: b.y + 0.5 };
  const hus = housesOf(s).find(h => h.id === b.hus);
  const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: b.x + dx, y: b.y + dy })).filter(o => o.x >= 0 && o.y >= 0 && o.x < W && o.y < H && !blocked(s, o.x, o.y))
    .sort((a, c) => inHus(hus, c) - inHus(hus, a));
  const o = opts[0] ?? freeNear(s, b.x, b.y);
  return { x: o.x + 0.5, y: o.y + 0.5 };
}
const inHus = (h: Hus | undefined, o: { x: number; y: number }) => h && o.x > h.x && o.y > h.y && o.x < h.x + h.w - 1 && o.y < h.y + h.h - 1 ? 1 : 0;
// lägg material på bygget
export function deliver(b: Bit, n: number, repair: boolean) { if (repair) b.lm = (b.lm ?? 0) + n; else b.mat += n; }
// stockar till ett hus som byggs läggs direkt i väggarna: från träd som stod där huset ska stå, eller som fälldes
// för bygget (hus = husets id). Ger hur mycket som gick åt
export function toWalls(s: State, x: number, y: number, n: number, hus?: number) {
  const h = housesOf(s).find(q => !q.klar && (hus ? q.id === hus : x >= q.x && y >= q.y && x < q.x + q.w && y < q.y + q.h));
  if (!h || n <= 0) return 0;
  let used = 0;
  const walls = bitsOf(s).filter(b => b.hus === h.id && b.k === 'vagg' && b.b < 1 && MATERIAL[b.m].item === 'ved' && lacks(b)).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
  for (const b of walls) { const d = Math.min(needOf(b), n - used); deliver(b, d, false); used += d; if (used >= n - 1e-9) break; }
  return used;
}
// ta material ur förrådet till bygget (snabbläget, där ingen bär)
export function takeFor(s: State, j: Job) {
  if (!j.item || j.need <= 0) return true;
  if (avail(s, j.item) < j.need) return false;
  addTo(s, j.item, -j.need); deliver(j.bit, j.need, j.repair);
  return true;
}
// en stunds arbete på en ruta. Ger true när rutan är klar
export function workOn(s: State, p: Person, b: Bit, dtSec: number) {
  const M = MATERIAL[b.m], repair = b.b >= 1;
  const rate = dtSec / 3600 / (M.tim || 0.01) * (0.6 + p.skill.hantverk / 25) * (ageOf(p, s.now) < 16 ? 0.6 : 1);
  if (repair) {
    if (M.item && (b.lm ?? 0) < Math.ceil(M.n / 2) - 1e-9) return false;
    b.lp = (b.lp ?? 0) + rate * 2;
    if (b.lp < 1) return false;
    b.c = 1; b.lp = b.lm = undefined; count(s, 'lagat');
    if (s.stat!.lagat === 1) log(s, `${p.name} lagade en sliten vägg för första gången.`, 'world', [p.id]);
    return true;
  }
  if (M.item && b.mat < M.n - 1e-9) return false;
  b.b = Math.min(1, b.b + rate);
  if (b.b < 1) return false;
  b.c = 1; count(s, 'byggt_' + b.m); touch(s);
  if (b.k === 'vagg') clearTile(s, b);
  const h = housesOf(s).find(q => q.id === b.hus);
  // huset är färdigt när väggarna står: trägolvet läggs efter hand och gör det bara skönare att sova där
  if (h && !h.klar && bitsOf(s).every(q => q.hus !== h.id || q.b >= 1)) {
    h.klar = s.now;
    const n = gridOf(s).rooms.filter(r => r.hus === h.id).reduce((a, r) => a + r.tiles.length, 0);
    log(s, `${h.namn} är färdigt. Nu kan ${n} sova under tak.`, 'world', [p.id]);
    sedEvent(s, 'gemenskap', 0.03);
  }
  return true;
}
// en vägg som just blivit klar: den som står där kliver åt sidan, och det som ligger där flyttas
function clearTile(s: State, b: Bit) {
  const free = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]].map(([dx, dy]) => ({ x: b.x + dx, y: b.y + dy })).find(o => o.x >= 0 && o.y >= 0 && o.x < W && o.y < H && !blocked(s, o.x, o.y));
  if (!free) return;
  for (const p of living(s)) if (Math.floor(p.x) === b.x && Math.floor(p.y) === b.y) { p.x = free.x + 0.5; p.y = free.y + 0.5; if (p.task) p.task.pk = undefined; }
  for (const a of s.stackar ?? []) if (a.x === b.x && a.y === b.y) { a.x = free.x; a.y = free.y; }
}

// ---------- slitage ----------
// en gång i timmen: väggar och golv slits, mest i istiden. En helt sliten vägg rasar och måste byggas om;
// ett utslitet golv blir jordgolv
export function wearBuild(s: State, hours: number, ai: number) {
  for (const b of bitsOf(s)) {
    const M = MATERIAL[b.m];
    if (b.b < 1 || !M.slit) continue;
    b.c -= M.slit * hours * (ai === 0 ? 1.5 : 1);
    if (b.c > 0) continue;
    const h = housesOf(s).find(q => q.id === b.hus);
    if (b.k === 'vagg') {
      b.b = 0; b.mat = 0; b.c = 1; b.lp = b.lm = undefined; count(s, 'rasat');
      if (h) h.klar = undefined;
      log(s, `En vägg i ${h ? h.namn.toLowerCase() : 'ett hus'} var så sliten att den rasade.`, 'world');
    } else { b.m = 'jord'; b.c = 1; }
    touch(s);
  }
}
