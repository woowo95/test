import { ALDER, ageOf, count, doingAct, forstaGang, livet, living, log, stat } from './folk';
import { kronikaBer, personFalt } from './berattelser';
import { Bit, DORRAR, DorrDef, DorrSlag, Hus, MATERIAL, bitById, dorrDef, dorrRang, bitsOf, blocked, freeNear, gridOf, housesOf, husById, touch } from './byggnad';
import { eldPlats, getMap } from './karta';
import { vaderSlit } from './vader';
import { groundOf, punktIRuta } from './mark';
import { PLATS, campCenter, rektAvstand } from './plats';
import { lekplats, paLek, stangerIn, uteStation } from './stationer';
import { sedEvent } from './seder';
import { kunnighet, sparas } from './ekonomi';
import { ARSTID, iIstiden } from './tid';
import { knows } from './teknik';
import { amountOf, changed, nearZone, ownMove, ownsAmount, use, usable, zonesOf } from './lager';
import { freeTools, tingOf } from './agande';
import { getable, takeMaterial } from './behov';
import { Del } from './egendom';
import { fellingTiles } from './skog';
import { FOREST, findPath } from './vag';
import { BYGGNADER, Byggnad, Fn, HUS, antalLika, bedTile, familjOf, fnOf, husKlar, mostUrgent } from './byggnader';
import { GRANNAR4, H, HOUR, HOUR_S, Person, State, T, Task, W, inMap } from './typer';
import { iVattnetNu, underMinnet } from './sjo';
import { FLOD } from './flod';
import { balans } from './balans';
import { ELDFLYTT, nyEldplats, vidElden } from './eldflytt';
import { canLight } from './eld';

// ---------- balanstal (regel 8) ----------
// Planeringen (var ett nytt hus står) och arbetet (i vilken ordning och hur fort det byggs och lagas). Husens storlek och
// funktion står i HUS (byggnader.ts), lekplatsens läge i PLATS (plats.ts)
const BYGG = balans('bygg', {
  maxInne: 24, // största hus: så många sovplatser
  husAvst: 5.5, // så långt från elden man helst bygger (rutor till husets närmaste vägg)
  radieBas: 9, // ett hus planeras inom så här många rutor från byns mitt ...
  radiePerPerson: 0.25, // ... plus så många per invånare
  lagerMarg: 1, // ett hus står minst så här många rutor från en lagerplats
  mittVikt: 0.2, // en plats får så många poäng (färre är bättre) för varje ruta från byns mitt ...
  lekStraff: 3, // ... så många om huset står på lekplatsen ...
  tradVikt: 0.15, // ... och så många för varje träd som måste fällas först
  byggareInt: 4, // när byn väljer byggare väger intelligensen så här många gånger mindre än hantverket
  omforsok: 12, // timmar innan byn försöker planera ett hus igen när det inte fanns någon plats
  samtidiga: 4, // högst så här många rutor byggs på samtidigt
  laga: 0.5, // väggar under det skicket lagas
  prioJord: 100, // i vilken ordning man bygger: lagning först, sedan jordgolv, väggar och sist trägolv (plus rutor till platsen)
  prioVagg: 200,
  prioTra: 300,
  lagFart: 2, // lagning går så här många gånger fortare än att bygga ...
  lagMatDiv: 2, // ... och kräver materialet delat med så mycket
  ungFart: 0.6, // en ung byggare (yngre än ALDER.byggFullt) bygger med så här stor del av takten
  klartGemenskap: 0.03, // när ett hus blir färdigt stärks seden Sammanhållning så här mycket
});

// ---------- att bygga ----------
// var p sover: en egen ruta under tak om det finns, annars ingenstans (byggnader.ts)
export function bedFor(s: State, p: Person) {
  const i = bedTile(s, p);
  if (i === undefined) return undefined;
  return punktIRuta(s, i, p);
}

// ---------- planering: byn bestämmer vad som byggs ----------
// utomElden = huset får stå där elden står: elden flyttas då först (steg 2.10.4, eldflytt.ts)
const tileOk = (s: State, x: number, y: number, utomElden: boolean) => {
  if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return false;
  if (!usable(s, x, y, utomElden)) return false; // inte vatten, sten, inpå elden (utom när elden kan flyttas) eller på ett annat bygge (träden spelar ingen roll: de fälls innan bygget börjar)
  if (zonesOf(s).some(z => nearZone(z, x, y, BYGG.lagerMarg))) return false;
  if (underMinnet(s, y * W + x)) return false; // byn minns att vattnet nådde hit (steg 3.8.7, flod.ts)
  if ((s.stackar ?? []).some(a => a.x === x && a.y === y) || tingOf(s).some(k => k.x === x && k.y === y && k.hos === undefined && k.lass === undefined) || (s.stockar ?? []).some(k => Math.floor(k.x) === x && Math.floor(k.y) === y) || (s.stubbar ?? []).some(k => k.x === x && k.y === y)) return false;
  return true;
};
// en plats för ett hus med yttermåtten w×h inom byområdet, PLATS.husMellan rutor från andra hus och PLATS.uteFri från stationer
// som står ute, helst en bit från elden och inte på lekplatsen, och inte så att väggarna stänger in mark. Träden där
// huset ska stå fälls först, men en plats med färre träd går fortare
function siteFor(s: State, w: number, h: number, okAt: Uint8Array) {
  const f = eldPlats(s), mid = campCenter(s), R = BYGG.radieBas + living(s).length * BYGG.radiePerPerson, g = groundOf(s), lekR = lekplats(s), M = Math.max(PLATS.husMellan, PLATS.uteFri);
  const platser: { x: number; y: number; sc: number }[] = [];
  for (let y = 1; y + h < H; y++) for (let x = 1; x + w < W; x++) {
    const cx = x + w / 2, cy = y + h / 2;
    if (Math.hypot(cx - mid.x, cy - mid.y) > R) continue;
    let ok = true;
    for (let yy = y - M; yy < y + h + M && ok; yy++) for (let xx = x - M; xx < x + w + M && ok; xx++) {
      const inside = xx >= x && xx < x + w && yy >= y && yy < y + h;
      if (inside) { ok = !!okAt[yy * W + xx]; continue; }
      if (!inMap(xx, yy)) continue;
      const d = Math.max(x - xx, xx - (x + w - 1), y - yy, yy - (y + h - 1)); // så många rutor från huset
      if (gridOf(s).at.has(yy * W + xx) || d <= PLATS.uteFri && uteStation(s, xx, yy)) ok = false; // plats för en stig mellan husen och runt stationerna ute (steg 2.10.8)
    }
    if (!ok) continue;
    const near = rektAvstand(f.x, f.y, x, y, w, h);
    const lek = paLek(lekR, x, y, w, h) ? BYGG.lekStraff : 0; // lekplatsen räknas från byns inre (plats.ts, steg 2.10.4)
    let trad = 0; // helst en plats med få träd: varje träd ska fällas först
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (g.trees[yy * W + xx] >= FOREST) trad++;
    const eld = rektAvstand(f.x, f.y, x - 1, y - 1, w + 2, h + 2) === 0 ? ELDFLYTT.husStraff : 0; // där elden står bara om ingen annan plats finns: elden flyttas först
    const sc = Math.abs(near - BYGG.husAvst) + BYGG.mittVikt * Math.hypot(cx - mid.x, cy - mid.y) + lek + BYGG.tradVikt * trad + eld;
    platser.push({ x, y, sc });
  }
  // den bästa platsen som inte stänger in någon mark (stationer.ts); lika bra platser i samma ordning som de söktes
  const at = platser.sort((a, b) => a.sc - b.sc).find(q => !stangerIn(s, q.x, q.y, w, h));
  return at && { x: at.x, y: at.y };
}
// kan man gå från rutan (ux, uy) utanför dörren till elden f, med huset på platsen at (yttermåtten w×h) i vägen?
function kanGaUt(s: State, at: { x: number; y: number }, w: number, h: number, ux: number, uy: number, f: { x: number; y: number }) {
  if (!inMap(ux, uy) || getMap(s.seed).tiles[uy * W + ux] === T.Vatten || gridOf(s).at.has(uy * W + ux)) return false;
  const g = groundOf(s), solid = g.solid ? g.solid.slice() : new Uint8Array(W * H);
  for (let y = at.y; y < at.y + h; y++) for (let x = at.x; x < at.x + w; x++) solid[y * W + x] = 1;
  return findPath({ ...g, solid }, ux + 0.5, uy + 0.5, f.x + 0.5, f.y + 0.5) !== null;
}
const canBuildWalls = (p: Person, s: State) => ageOf(p, s.now) >= ALDER.vuxen && knows(p, 'timmervagg');
// en gång i timmen: planera ett nytt hus för det mest akuta behovet (BYGGNADER i byggnader.ts) om någon kan bygga väggar
export function planBuild(s: State) {
  const ppl = living(s), hs = housesOf(s);
  if (!ppl.length || hs.some(h => !h.klar)) return;
  const byggare = ppl.filter(p => canBuildWalls(p, s)).sort((a, b) => (b.skill.hantverk + stat(b, 'intelligens', s.now) / BYGG.byggareInt) - (a.skill.hantverk + stat(a, 'intelligens', s.now) / BYGG.byggareInt));
  if (!byggare.length || s.now < (s.byggSok ?? 0)) return;
  const u = mostUrgent(s);
  if (!u) return;
  // vem som planerar (by, namnet i loggen): ett familjehus planeras av den skickligaste byggaren i familjen, annars av familjens
  // ägare (finns hen inte kvar: byns skickligaste byggare); andra hus av byns skickligaste byggare. Det måste finnas en byggare i
  // byn, men planeraren behöver inte själv kunna bygga väggar. Vem som sedan bygger väljs i val.ts (buildJob)
  const fam = u.a.ag !== undefined ? familjOf(s, u.a.ag) : [], by = byggare.find(p => fam.includes(p)) ?? (fam.find(p => p.id === u.a.ag) ?? byggare[0]);
  const row: Byggnad = BYGGNADER[u.fn];
  // storleken efter behovet; så nära kvadratiskt som möjligt
  const sizes: { w: number; h: number }[] = [];
  for (let h = HUS.minSida; h <= HUS.maxSida; h++) for (let w = h; w <= HUS.langSida * h; w++) sizes.push({ w, h });
  const want = Math.min(BYGG.maxInne, u.a.plats);
  sizes.sort((a, b) => (a.w * a.h < want ? 1000 - a.w * a.h : 0) - (b.w * b.h < want ? 1000 - b.w * b.h : 0) || a.w * a.h - b.w * b.h || (a.w - a.h) - (b.w - b.h));
  const okAt = new Uint8Array(W * H), utomElden = canLight(s); // elden flyttas bara om den kan tändas igen
  for (let i = 0; i < W * H; i++) okAt[i] = tileOk(s, i % W, Math.floor(i / W), utomElden) ? 1 : 0;
  for (const { w, h } of sizes) {
    const at = siteFor(s, w + 2, h + 2, okAt);
    if (!at) continue;
    // står huset där elden står, flyttas elden till närmaste lediga plats, och dörren vetter mot den nya platsen
    const e = eldPlats(s), paElden = rektAvstand(e.x, e.y, at.x - 1, at.y - 1, w + 4, h + 4) === 0;
    const ny = paElden ? nyEldplats(s, e.x, e.y, { x: at.x, y: at.y, w: w + 2, h: h + 2 }) : undefined;
    if (paElden && !ny) continue;
    const f = ny ?? e, cx = at.x + (w + 1) / 2, cy = at.y + (h + 1) / 2;
    // öppningen mitt på den sida som vetter mot elden, om man kan gå därifrån till elden när huset står där (inte ut
    // i vattnet eller en ficka mellan vattnet och väggarna); annars den sida närmast elden där det går
    const mot = Math.abs(f.x + 0.5 - cx) > Math.abs(f.y + 0.5 - cy) ? (f.x < cx ? 'v' : 'o') : (f.y < cy ? 'n' : 's');
    const sidor = (['v', 'o', 'n', 's'] as const).map(side => {
      const ox = side === 'v' ? at.x : side === 'o' ? at.x + w + 1 : at.x + 1 + Math.floor(w / 2);
      const oy = side === 'n' ? at.y : side === 's' ? at.y + h + 1 : at.y + 1 + Math.floor(h / 2);
      const ux = ox + (side === 'v' ? -1 : side === 'o' ? 1 : 0), uy = oy + (side === 'n' ? -1 : side === 's' ? 1 : 0);
      return { side, ox, oy, ux, uy, d: Math.hypot(ux - f.x, uy - f.y) };
    }).sort((a, b) => (a.side === mot ? -1 : 0) - (b.side === mot ? -1 : 0) || a.d - b.d);
    const dorr = sidor.find(o => kanGaUt(s, at, w + 2, h + 2, o.ux, o.uy, f));
    if (!dorr) continue;
    const { ox, oy } = dorr;
    const same = antalLika(s, u.fn, w, h);
    const hus: Hus = { id: (s.nextBit ??= 1), namn: row.namnFor!(s, w, h, same, u.a), x: at.x, y: at.y, w: w + 2, h: h + 2, fn: u.fn, slag: u.a.slag, ag: u.a.ag };
    s.nextBit++;
    const golv = 'tra';
    for (let y = at.y; y < at.y + h + 2; y++) for (let x = at.x; x < at.x + w + 2; x++) {
      const edge = x === at.x || y === at.y || x === at.x + w + 1 || y === at.y + h + 1, open = x === ox && y === oy;
      const m = open ? 'oppning' : edge ? 'timmer' : golv;
      bitsOf(s).push({ id: s.nextBit++, x, y, k: MATERIAL[m].k, m, b: open ? 1 : 0, mat: 0, c: 1, hus: hus.id });
    }
    hs.push(hus); touch(s);
    if (ny) s.fire.flytt = { x: ny.x, y: ny.y, varfor: 'plats' };
    log(s, planText(by, u.fn, hus, w * h, same) + (ny ? ' Elden måste flyttas först.' : ''), 'world', [by.id]); count(s, 'planerat_' + u.fn);
    if (u.fn === 'sovsal' && w * h >= HUS.langhus) count(s, 'planerat_langhus'); // ett långhus (så ofta det händer, samhalle-192)
    return;
  }
  s.byggSok = s.now + BYGG.omforsok * HOUR; // ingen plats nu: försök igen om ett tag
}
function planText(by: Person, fn: Fn, h: Hus, n: number, same: number) {
  if (fn === 'sovsal') return `${by.name} planerar ${n >= HUS.langhus ? 'ett långhus' : 'en hydda'}${same ? ' till' : ''} med plats för ${n} att sova under tak.`;
  if (fn === 'familjehus') return `${by.name} och familjen bestämmer sig för att bygga ett eget hus, ${h.namn.toLowerCase()}.`;
  return `${by.name} planerar ${h.namn.toLowerCase()}.`;
}

// ---------- arbete ----------
// fell = ett träd står där biten ska byggas och måste fällas först
interface Job { bit: Bit; repair: boolean; item?: string; need: number; missing: boolean; fell?: boolean }
// det som finns att bygga med (av p: det p kan få, behov.ts, och till ett familjehus också familjens), utom det som sparas.
// Den som får ta av andra (getable = allt i byn) har redan familjens med: aldrig mer än allt
export const avail = (s: State, k: string, p?: Person, hus?: number) => (p ? Math.min(amountOf(s, k), getable(s, p, k) + famOwn(s, p, k, hus)) : amountOf(s, k)) - sparas(k);
const famHus = (s: State, hus?: number) => { const h = husById(s, hus); return h?.ag !== undefined ? h : undefined; };
const famOwn = (s: State, p: Person, k: string, hus?: number) => { const h = famHus(s, hus); return h ? familjOf(s, h.ag).filter(q => q !== p).reduce((a, q) => a + ownsAmount(s, q, k), 0) : 0; };
// p tar n av slaget k till ett hus. Till byns hus tas byns först; till ett familjehus familjens eget först (ägaren, partnern,
// barnen), sedan efter behovsstegen som till ett eget arbete. Ger vems det var
export function takeForHouse(s: State, p: Person, hus: number | undefined, k: string, n: number, kom: Record<string, number>): Del {
  const h = famHus(s, hus);
  if (!h) return takeMaterial(s, p, k, n, true, kom);
  const ag: Del = {};
  let rest = n;
  for (const q of familjOf(s, h.ag).sort((a, b) => (b.id === h.ag ? 1 : 0) - (a.id === h.ag ? 1 : 0) || a.id - b.id)) {
    if (rest <= 1e-9) break;
    const v = Math.min(rest, ownsAmount(s, q, k));
    if (v <= 1e-9) continue;
    if (q !== p) ownMove(s, k, v, q.id, p.id);
    use(s, p, k, v);
    ag[q.id] = (ag[q.id] ?? 0) + v; rest -= v;
    const key = `${q === p ? 'eget' : 'familj'}:${q.id}:${k}`; kom[key] = (kom[key] ?? 0) + v;
  }
  if (rest > 1e-9) for (const [o, v] of Object.entries(takeMaterial(s, p, k, rest, false, kom))) ag[+o] = (ag[+o] ?? 0) + v;
  return ag;
}
export const treeOn = (s: State, b: Bit) => groundOf(s).trees[b.y * W + b.x] >= FOREST;
// det p kan bygga härnäst: lagning av slitna väggar först, sedan jordgolv, väggar och sist trägolv. Det andra redan bygger tas inte
export function buildJob(s: State, p: Person): Job | undefined {
  if (ageOf(p, s.now) < ALDER.bygger) return;
  const others = living(s).filter(q => q !== p);
  const taken = new Set(others.filter(q => q.task?.act === 'bygga').map(q => q.task!.ref));
  // först fälls träden där huset ska stå, även inne i huset, av den som har en ledig yxa
  if (freeTools(s, p, 'yxa') > 0) {
    const felling = fellingTiles(s, p);
    let fb: Bit | undefined, fs = Infinity;
    for (const b of bitsOf(s)) {
      if ((b.b >= 1 && b.k !== 'oppning') || !treeOn(s, b) || felling.has(b.y * W + b.x)) continue;
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d < fs) { fs = d; fb = b; }
    }
    if (fb) return { bit: fb, repair: false, need: 0, missing: false, fell: true };
  }
  if (taken.size >= BYGG.samtidiga) return;
  let best: Job | undefined, bs = Infinity;
  for (const b of bitsOf(s)) {
    if (taken.has(b.id) || b.k === 'oppning' || (b.b < 1 && (treeOn(s, b) || vidElden(s, b.x, b.y)))) continue; // där elden står byggs inget förrän den flyttats (eldflytt.ts)
    const M = MATERIAL[b.m], repair = b.b >= 1;
    if (repair && b.c >= BYGG.laga) continue;
    if (M.tek && !knows(p, M.tek)) continue;
    const need = needOf(b);
    const sc = (repair ? 0 : b.k === 'golv' ? (M.item ? BYGG.prioTra : BYGG.prioJord) : BYGG.prioVagg) + Math.hypot(b.x - p.x, b.y - p.y);
    if (sc < bs) { bs = sc; best = { bit: b, repair, item: M.item, need, missing: need > 0 && avail(s, M.item!, p, b.hus) < need }; }
  }
  return best;
}
// materialet en lagning kräver: en del av det nya, i hela saker och minst en (steg 3.6.13: inga resurser i decimaler)
export const lagKostnad = (M: { n: number }) => M.n > 0 ? Math.max(1, Math.floor(M.n / BYGG.lagMatDiv)) : 0;
// material som fattas på bygget eller lagningen
export function needOf(b: Bit) {
  const M = MATERIAL[b.m];
  if (!M.item) return 0;
  return Math.max(0, b.b >= 1 ? lagKostnad(M) - (b.lm ?? 0) : M.n - b.mat);
}
export const lacks = (b: Bit) => needOf(b) > 1e-9;
// var man står när man bygger: på golvet, eller bredvid väggen (helst inne i huset)
export function siteOf(s: State, b: Bit) {
  if (b.k !== 'vagg') return { x: b.x + 0.5, y: b.y + 0.5 };
  const hus = husById(s, b.hus);
  const opts = GRANNAR4.map(([dx, dy]) => ({ x: b.x + dx, y: b.y + dy })).filter(o => inMap(o.x, o.y) && !blocked(s, o.x, o.y))
    .sort((a, c) => inHus(hus, c) - inHus(hus, a));
  const o = opts[0] ?? freeNear(s, b.x, b.y, true); // aldrig på väggen själv: då står man i den när den är klar
  return { x: o.x + 0.5, y: o.y + 0.5 };
}
const inHus = (h: Hus | undefined, o: { x: number; y: number }) => h && o.x > h.x && o.y > h.y && o.x < h.x + h.w - 1 && o.y < h.y + h.h - 1 ? 1 : 0;
// lägg material på bygget
export function deliver(b: Bit, n: number, repair: boolean) { if (repair) b.lm = (b.lm ?? 0) + n; else b.mat += n; }
// ---------- var materialet kom ifrån ----------
// Varje hus minns var materialet till det kom ifrån, så att det kan visas när man trycker på huset. Nycklarna är
// `hur:vem:slag`: byn (byns förråd), eget (byggarens), familj (familjens, som man får ta), gava (skänkt av vem),
// stold (taget utan lov av vem), fallt (stockar från träd som vem fällde eller högg för bygget). Ändrar inget i spelet
export const KOM = ['byn', 'eget', 'familj', 'gava', 'fallt', 'stold'] as const;
export function noteKom(s: State, husId: number | undefined, kom: Record<string, number>) {
  const h = husById(s, husId);
  if (!h) return;
  const m = (h.kom ??= {});
  for (const key in kom) m[key] = (m[key] ?? 0) + kom[key];
}
export function komOf(h: Hus) {
  return Object.entries(h.kom ?? {}).map(([key, n]) => { const [hur, vem, k] = key.split(':'); return { hur: hur as typeof KOM[number], vem: +vem, k, n }; });
}
// stockar till ett hus som byggs läggs direkt i väggarna: från träd som stod där huset ska stå, eller som fälldes
// för bygget (hus = husets id). Ger hur mycket som gick åt
export function toWalls(s: State, x: number, y: number, n: number, hus?: number, by?: Person) {
  const h = housesOf(s).find(q => !q.klar && (hus ? q.id === hus : x >= q.x && y >= q.y && x < q.x + q.w && y < q.y + q.h));
  if (!h || n <= 0) return 0;
  let used = 0;
  const walls = bitsOf(s).filter(b => b.hus === h.id && b.k === 'vagg' && b.b < 1 && MATERIAL[b.m].item === 'ved' && lacks(b)).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
  for (const b of walls) { const d = Math.min(needOf(b), n - used); deliver(b, d, false); used += d; if (used >= n - 1e-9) break; }
  if (by && used > 1e-9) noteKom(s, h.id, { [`fallt:${by.id}:ved`]: used });
  return used;
}
// en stunds arbete på en ruta. Ger true när rutan är klar
// har = materialet som byggaren håller i händerna (steg 3.6.5): det läggs i bygget först när biten är klar
export function workOn(s: State, p: Person, b: Bit, dtSec: number, har = 0) {
  const M = MATERIAL[b.m], repair = b.b >= 1;
  const rate = dtSec / HOUR_S / (M.tim || 0.01) * kunnighet(p.skill.hantverk) * (ageOf(p, s.now) < ALDER.byggFullt ? BYGG.ungFart : 1);
  if (repair) {
    if (M.item && (b.lm ?? 0) + har < lagKostnad(M) - 1e-9) return false;
    b.lp = (b.lp ?? 0) + rate * BYGG.lagFart;
    if (b.lp < 1) return false;
    deliver(b, har, true);
    b.c = 1; b.lp = b.lm = undefined;
    if (forstaGang(s, 'lagat')) log(s, `${p.name} lagade ${b.k === 'golv' ? 'ett slitet golv' : 'en sliten vägg'} för första gången.`, 'world', [p.id]);
    return true;
  }
  if (M.item && b.mat + har < M.n - 1e-9) return false;
  b.b = Math.min(1, b.b + rate);
  if (b.b < 1) return false;
  deliver(b, har, false);
  b.c = 1; count(s, 'byggt_' + b.m); touch(s);
  if (b.k === 'vagg') clearTile(s, b);
  const h = husById(s, b.hus);
  // huset är färdigt först när alla dess bitar är byggda: väggarna, öppningen och golvet (inte bara väggarna). Första gången
  // loggas det och skrivs i krönikan, och husKlar körs; efter en rasad vägg (varKlar) blir det bara klart igen
  if (h && !h.klar && bitsOf(s).every(q => q.hus !== h.id || q.b >= 1)) {
    h.klar = s.now;
    if (h.varKlar !== undefined) return true;
    livet(s, p, 'hus'); // satte sista biten (steg 3.9.8)
    const n = gridOf(s).rooms.filter(r => r.hus === h.id).reduce((a, r) => a + r.tiles.length, 0);
    if (fnOf(h).sover) log(s, `${h.namn} är färdigt. Nu kan ${n} sova under tak.`, 'world', [p.id]);
    kronikaBer(s, 'k_husKlar', h.id, { ...personFalt(p), hus: h.namn }); husKlar(s, h);
    sedEvent(s, 'gemenskap', BYGG.klartGemenskap);
  }
  return true;
}
// en vägg som just blivit klar: den som står där kliver åt sidan, och det som ligger där (stackar och redskap) flyttas
function clearTile(s: State, b: Bit) {
  const free = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]].map(([dx, dy]) => ({ x: b.x + dx, y: b.y + dy })).find(o => inMap(o.x, o.y) && !blocked(s, o.x, o.y)) ?? freeNear(s, b.x, b.y, true);
  for (const p of living(s)) if (Math.floor(p.x) === b.x && Math.floor(p.y) === b.y) { p.x = free.x + 0.5; p.y = free.y + 0.5; if (p.task) p.task.pk = undefined; }
  // den som var på väg dit, eller arbetar där med något annat, ställer sig bredvid i stället
  for (const p of living(s)) if (p.task && Math.floor(p.task.tx) === b.x && Math.floor(p.task.ty) === b.y) { p.task.tx = free.x + 0.5; p.task.ty = free.y + 0.5; p.task.pk = undefined; }
  // den som bär hem en börda och ska fortsätta där fortsätter bredvid
  for (const p of living(s)) { const r = p.task?.res; if (r && Math.floor(r.x) === b.x && Math.floor(r.y) === b.y) { r.x = free.x + 0.5; r.y = free.y + 0.5; } }
  // den som hämtar material och ska bygga härifrån får en ny byggplats bredvid sin bit (siteOf drar inga slumptal)
  for (const p of living(s)) { const st = p.task?.site; if (st && Math.floor(st.x) === b.x && Math.floor(st.y) === b.y) { const tb = bitById(s, p.task!.ref); p.task!.site = tb ? siteOf(s, tb) : { x: free.x + 0.5, y: free.y + 0.5 }; } }
  for (const a of s.stackar ?? []) if (a.x === b.x && a.y === b.y) { a.x = free.x; a.y = free.y; }
  // ett redskap som ligger på rutan (inte i handen eller en börda) läggs bredvid
  for (const t of tingOf(s)) if (t.x === b.x && t.y === b.y && t.hos === undefined && t.lass === undefined) { t.x = free.x; t.y = free.y; }
  changed(s); // summorna i förrådet räknas om (lager.ts)
}

// ---------- slitage ----------
// en gång i timmen: väggar och golv slits, mest i istiden. En helt sliten vägg rasar och måste byggas om;
// ett utslitet golv blir jordgolv
export function wearBuild(s: State, hours: number, ai: number) {
  for (const b of bitsOf(s)) {
    const M = MATERIAL[b.m];
    if (b.b < 1 || !M.slit) continue;
    b.c -= M.slit * hours * (iIstiden(ai) ? ARSTID.slitIstid : 1) * (b.k === 'vagg' ? vaderSlit(s) * (s.flod && iVattnetNu(s, b.y * W + b.x) ? FLOD.vaggSlit : 1) : 1); // väggarna slits mer i regnet och snön (steg 2.11.2) och i en översvämnings vatten (steg 3.8.7, flod.ts)
    if (b.c > 0) continue;
    if (b.k === 'vagg') {
      const h = rasar(s, b);
      log(s, `En vägg i ${h ? h.namn.toLowerCase() : 'ett hus'} var så sliten att den rasade.`, 'world');
    } else { b.m = 'jord'; b.c = 1; }
    touch(s);
  }
}
// väggen b rasar (sliten, eller riven av tornadon i tornado.ts) och måste byggas om; huset är inte klart längre. Ger huset
export function rasar(s: State, b: Bit) {
  const h = husById(s, b.hus);
  b.b = 0; b.mat = 0; b.c = 1; b.lp = b.lm = undefined; count(s, 'rasat');
  if (h) { h.varKlar ??= h.klar; h.klar = undefined; }
  return h;
}

// ---------- dörrarna (steg 2.2.16) ----------
// En dörr (en rad i DORRAR, byggnad.ts) hängs i öppningen till ett färdigt hus där man bor eller umgås (inte i ett förrådshus),
// av den som har tid för handarbete när projektet säger att byn har öppningar utan dörr (projekt.ts). Materialet tas när
// arbetet är klart, så att inget går förlorat om det avbryts. Rivs huset försvinner dörren med öppningen.
export const dorrOppningar = (s: State) => bitsOf(s).filter(b => {
  if (b.k !== 'oppning') return false;
  const h = husById(s, b.hus);
  return !!h?.klar && !fnOf(h).lager;
});
// öppningarna som saknar dörren k eller en bättre (en skinndörr ersätter aldrig en trädörr)
export const utanDorr = (s: State, k: DorrSlag) => dorrOppningar(s).filter(b => dorrRang(b.dorr) < dorrRang(k));
// p kan hänga dörren: p kan tekniken, det finns fler öppningar utan den än de som redan hänger en, och p kan få tag i materialet
export function kanHangaDorr(s: State, p: Person, k: DorrSlag) {
  const d: DorrDef = DORRAR[k];
  if (!d.tek.some(t => knows(p, t))) return false;
  const gor = doingAct(s, 'dorr', p) ? 1 : 0, utan = utanDorr(s, k).length;
  return utan > gor && Object.entries(d.av).every(([m, n]) => getable(s, p, m) >= n + sparas(m));
}
// platsen dit den som hänger dörren går: i den första öppningen som saknar den
export function dorrSpot(s: State, k: DorrSlag) {
  const b = utanDorr(s, k)[0];
  return b ? { x: b.x + 0.5, y: b.y + 0.5 } : undefined;
}
// klart: materialet tas och dörren hängs i den första öppningen som saknar den (har någon annan hunnit före blir det nästa,
// och saknar ingen den längre blir det inget). Byns statistik räknar dem (dorr_ + sorten), och den första står i loggen
export function finishDorr(s: State, p: Person, tk: Task) {
  const k = tk.tool as DorrSlag, d = dorrDef(k);
  if (!d) return;
  const b = utanDorr(s, k)[0];
  if (!b || !Object.entries(d.av).every(([m, n]) => getable(s, p, m) >= n)) return;
  for (const [m, n] of Object.entries(d.av)) takeMaterial(s, p, m, n);
  b.dorr = k; touch(s);
  if (forstaGang(s, 'dorr_' + k)) { log(s, d.forsta.replace('{namn}', p.name), 'world', [p.id]); p.fame.push(`Hängde byns första ${d.namn.toLowerCase()}`); }
}
