import { husNytt } from './byggnad';
import { gen, hans } from './ord';
import { upplev } from './uppvaxt';
import { ALDER, ageOf, count, doingAct, forstaGang, livet, living, log } from './folk';
import { kronikaBer, personFalt } from './berattelser';
import { bitAt, vagBort, Bit, DORRAR, DorrDef, DorrSlag, Hus, MATERIAL, bitById, dorrDef, dorrRang, bitsOf, blocked, freeNear, gridOf, isWall, housesOf, husById, touch } from './byggnad';
import { vaderSlit } from './vader';
import { groundOf, nyttVatten, punktIRuta } from './mark';
import { kunnighet } from './ekonomi';
import { sparas } from './forradsmal';
import { ARSTID, iIstiden } from './tid';
import { knows } from './teknik';
import { amountOf, changed, enPerRuta, ownMove, ownsAmount, put, use, zonesOf } from './lager';
import { freeTools, nTools, tingOf } from './agande';
import { getable, Recept, takeMaterial } from './behov';
import { Del } from './egendom';
import { fellingTiles, kronaOver } from './skog';
import { stubbeOn } from './stubbar';
import { FOREST } from './vag';
import { HUS, bedTile, familjOf, fnOf, husKlar } from './byggnader';
import { GRANNAR4, HOUR_S, Person, State, Task, W, inMap } from './typer';
import { iVattnetNu } from './sjo';
import { FLOD } from './flod';
import { balans } from './balans';
import { vidElden } from './eldflytt';
import { } from './eld';
import { notis } from './notiser';

// ---------- balanstal (regel 8) ----------
// Planeringen (var ett nytt hus står) och arbetet (i vilken ordning och hur fort det byggs och lagas). Husens storlek och
// funktion står i HUS (byggnader.ts)
export const BYGG = balans('bygg', {
  maxInne: 72, // största hus: så många golvrutor inne (24 sovplatser med tre rutor per person, steg 9.2.36)
  husAvst: 5.5, // ett hus står helst minst så här långt från elden (rutor till husets närmaste vägg), för röken och gnistorna
  radieBas: 9, // ett hus planeras högst så här många rutor utanför det byn omsluter (tillHoljet i omrade.ts) ...
  radiePerPerson: 0.25, // ... plus så många per invånare
  utomVikt: 1, // en plats får så många poäng (färre är bättre) för varje ruta utanför det byn omsluter, så att byn håller ihop ...
  mittVikt: 0.2, // ... och så många för varje ruta från områdets mitt (bynsMitt), bland platserna innanför ...
  lagerMarg: 1, // ett hus står minst så här många rutor från en lagerplats
  byggareInt: 4, // när byn väljer byggare väger intelligensen så här många gånger mindre än hantverket
  omforsok: 12, // timmar innan byn försöker planera ett hus igen när det inte fanns någon plats
  perHus: 4, // så många får bygga på varje hus (platserna på bygget); fler väger en tredjedel (arbetarna, steg 6.1.13 i val.ts)
  laga: 0.5, // väggar under det skicket lagas
  prioJord: 100, // i vilken ordning man bygger: lagning först, sedan jordgolv, väggar och sist trägolv (plus rutor till platsen)
  prioVagg: 200,
  prioTra: 300,
  lagFart: 2, // lagning går så här många gånger fortare än att bygga ...
  lagMatDiv: 2, // ... och kräver materialet delat med så mycket
  ungFart: 0.6, // en ung byggare (yngre än ALDER.byggFullt) bygger med så här stor del av takten
});

// ---------- att bygga ----------
// var p sover: en egen ruta under tak om det finns, annars ingenstans (byggnader.ts)
export function bedFor(s: State, p: Person) {
  const i = bedTile(s, p);
  if (i === undefined) return undefined;
  return punktIRuta(s, i, p);
}

// ---------- arbete ----------
// fell = ett träd står där biten ska byggas och måste fällas först
interface Job { bit: Bit; repair: boolean; item?: string; need: number; missing: boolean; fell?: boolean; hugg?: number } // hugg = stocken som ligger inne i huset (steg 8.1.13)
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
// huset står på en gammal lagerplats (steg 8.1.15): bitarna väntar tills det som låg där är utburet, men inte i det oändliga
const lagerIVagen = (s: State, b: Bit) => { const h = husById(s, b.hus); return !!h?.barUt && s.now < h.barUt && b.b < 1 && (s.stackar ?? []).some(a => a.x === b.x && a.y === b.y); };
export const treeOn = (s: State, b: Bit) => groundOf(s).trees[b.y * W + b.x] >= FOREST;
// det p kan bygga härnäst: lagning av slitna väggar först, sedan jordgolv, väggar och sist trägolv. Det andra redan bygger tas inte
export function buildJob(s: State, p: Person, forb = false): Job | undefined {
  if (ageOf(p, s.now) < ALDER.bygger) return;
  const others = living(s).filter(q => q !== p);
  const taken = new Set(others.filter(q => q.task?.act === 'bygga').map(q => q.task!.ref));
  // först fälls träden där huset ska stå, även inne i huset, av den som har en ledig yxa
  if (freeTools(s, p, 'yxa') > 0) {
    const felling = fellingTiles(s, p);
    let fb: Bit | undefined, fs = Infinity;
    for (const b of bitsOf(s)) {
      if ((b.b >= 1 && b.k !== 'oppning') || !treeOn(s, b) || felling.has(b.y * W + b.x) || s.flod && iVattnetNu(s, b.y * W + b.x)) continue;
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d < fs) { fs = d; fb = b; }
    }
    if (fb) return { bit: fb, repair: false, need: 0, missing: false, fell: true };
    // sedan huggs de fällda träden inne i huset (steg 8.1.13), av den som har en ledig yxa: veden och virket bärs ut
    const hugger = new Set(others.filter(q => q.task?.act === 'hugga').map(q => q.task!.ref));
    for (const k of s.stockar ?? []) {
      const b = bitAt(s, Math.floor(k.x), Math.floor(k.y)), h = b && husById(s, b.hus);
      if (b && h && !h.klar && !hugger.has(k.id)) return { bit: b, repair: false, need: 0, missing: false, hugg: k.id };
    }
  }
  let best: Job | undefined, bs = Infinity;
  for (const b of bitsOf(s)) {
    if (b.forb && !forb) continue; // en förbättring väntar till nivån Förbättra (steg 7.2.10)
    if (b.hus !== undefined && husById(s, b.hus)?.flyttas !== undefined) continue; // huset byggs upp på en ny plats (steg 9.4.6): det gamla lagas inte
    if (lagerIVagen(s, b)) continue; // sakerna i den gamla lagerplatsen bärs ut först (steg 8.1.15)
    if (s.flod && iVattnetNu(s, b.y * W + b.x)) continue; // där vattnet står byggs och lagas inget förrän det sjunkit undan (flod.ts)
    if (taken.has(b.id) || b.k === 'oppning' || (b.b < 1 && (treeOn(s, b) || stubbeOn(s, b.x, b.y) || vidElden(s, b.x, b.y) || (b.k === 'vagg' && (s.stockar ?? []).some(k => Math.floor(k.x) === b.x && Math.floor(k.y) === b.y))))) continue; // en vägg byggs inte på en stock (steg 8.1.13) // där elden står byggs inget förrän den flyttats (eldflytt.ts)
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
  if (b.k !== 'vagg' && !(MATERIAL[b.m].brygga && b.b < 1)) return { x: b.x + 0.5, y: b.y + 0.5 };
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
  n = Math.floor(n + 1e-9); // bara hela stockar går till väggarna; resten ligger kvar på stammen
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
  b.c = 1; b.forb = undefined; count(s, 'byggt_' + b.m); touch(s);
  if (M.brygga) { s.bryggV = (s.bryggV ?? 0) + 1; nyttVatten(s); }
  if (b.m === 'jord') stigAv(s, b.x, b.y); // jordgolvet är en stig inne (steg 7.3.2): gräset är borta och marken är bar
  if (b.k === 'vagg') clearTile(s, b);
  const h = husById(s, b.hus);
  if (h && !h.klar && h.varKlar === undefined && !h.byggare?.includes(p.id)) (h.byggare ??= []).push(p.id); // de som byggde (steg 4.5.4.9)
  if (h?.ut && bitsOf(s).every(q => q.hus !== h.id || q.b >= 1)) slutUt(s, h, p);
  // huset är färdigt först när alla dess bitar är byggda: väggarna, öppningen och golvet (inte bara väggarna). Första gången
  // loggas det och skrivs i krönikan, och husKlar körs; efter en rasad vägg (varKlar) blir det bara klart igen
  if (h) husKlart(s, h, p);
  return true;
}
// ett fällt träd ligger inne i huset (steg 8.1.13); i en by utan yxa kan ingen hugga det, och då står huset ändå
const stockInne = (s: State, h: Hus) => nTools(s, 'yxa') > 0 && (s.stockar ?? []).some(k => bitAt(s, Math.floor(k.x), Math.floor(k.y))?.hus === h.id);
// en gång i timmen: det som ändå hamnat på en färdig vägg läggs bredvid (en lagerplats kan ha flyttat, steg 8.1.15)
export function vaggRensa(s: State) {
  for (const a of s.stackar ?? []) { if (isWall(s, a.x + 0.5, a.y + 0.5)) { const f = freeNear(s, a.x, a.y, true); a.x = Math.floor(f.x); a.y = Math.floor(f.y); changed(s); } }
  for (const t of tingOf(s)) { if (t.x === undefined || t.y === undefined || t.hos !== undefined || t.lass !== undefined) continue; if (isWall(s, t.x + 0.5, t.y + 0.5)) { const f = freeNear(s, t.x, t.y, true); t.x = Math.floor(f.x); t.y = Math.floor(f.y); t.vid = undefined; } }
  enPerRuta(s);
}
// huset är färdigt: alla bitar byggda och inga fällda träd kvar inne i det. Prövas när en bit blir klar och när en stock huggits slut
// en gång i timmen (stepByggnader): ett hus som väntade på att ett träd över det skulle fällas blir klart när det är borta
export function husKlaraTimme(s: State) { const p = living(s)[0]; if (p) for (const h of housesOf(s)) if (!h.klar) husKlart(s, h, p); }
export function husKlart(s: State, h: Hus, p: Person) {
  if (!h.klar && bitsOf(s).every(q => q.hus !== h.id || q.b >= 1) && !stockInne(s, h) && !kronaOver(s, h).length) { // ett träd vars krona når över huset fälls först (steg 9.2.49)
    h.klar = s.now;
    if (h.flyttFran !== undefined) flyttKlar(s, h);
    if (h.varKlar !== undefined) return;
    livet(s, p, 'hus'); // satte sista biten (steg 3.9.8)
    const n = gridOf(s).rooms.filter(r => r.hus === h.id).reduce((a, r) => a + r.tiles.length, 0);
    if (fnOf(h).sover) log(s, `${h.namn} är färdigt. Nu kan ${n} sova under tak.`, 'world', [p.id]);
    notis(s, 'hus', `${p.name} satte sista biten: ${h.namn} är färdigt.`, [p.id], { x: Math.floor(p.x), y: Math.floor(p.y) });
    { const hf = husFalt(h.namn); kronikaBer(s, 'k_husKlar', h.id, { ...personFalt(p), ...hf, hus2: hf.hus.replace(new RegExp(`^${gen(p.name)} `), `${hans(p)} `) }); } husKlar(s, h);
    if ((h.byggare?.length ?? 0) > 1) for (const q of living(s)) if (h.byggare!.includes(q.id)) upplev(s, q, 'byggdeHus', husFalt(h.namn).hus); // de byggde tillsammans (steg 4.5.4.9)
    h.byggare = undefined;
  }
}
// ett hus rivs: bitarna och huset försvinner, och HUS.rivTillbaka av träet går till ägaren (eller byn). Ger hur mycket trä det blev
export function rivHus(s: State, h: Hus) {
  const ved = Math.floor(bitsOf(s).filter(b => b.hus === h.id).reduce((a, b) => a + (MATERIAL[b.m].item === 'ved' ? b.mat : 0), 0) * HUS.rivTillbaka + 1e-9);
  s.byggen = bitsOf(s).filter(b => b.hus !== h.id); s.hus = housesOf(s).filter(q => q !== h);
  if (ved > 0) put(s, 'ved', ved, h.ag !== undefined ? { [h.ag]: ved } : undefined);
  touch(s); changed(s); count(s, 'rivet');
  return ved;
}
// det skadade huset har byggts upp på den nya platsen (steg 9.4.6): det nya får det gamlas funktion och rummens funktioner, och
// det gamla rivs
function flyttKlar(s: State, h: Hus) {
  const g = husById(s, h.flyttFran);
  h.flyttFran = undefined;
  if (!g) return;
  h.fn = g.fn; h.slag = g.slag; h.ag = g.ag;
  const ved = rivHus(s, g);
  count(s, 'husFlyttat');
  log(s, `${h.namn} står klart närmare byns mitt, och ${g.namn.toLowerCase()} som skadades revs.${ved ? ` ${ved} trä kom tillbaka.` : ''}`, 'world');
}
// material som inte längre finns i huset (en vägg som rasat eller rivits) räknas inte till det
function glomKom(h: Hus, k: string, n: number) {
  for (const q of Object.keys(h.kom ?? {})) {
    if (n <= 1e-9) return;
    if (!q.endsWith(':' + k)) continue;
    const d = Math.min(n, h.kom![q]);
    h.kom![q] -= d; n -= d;
    if (h.kom![q] <= 1e-9) delete h.kom![q];
  }
}
// marken blir bar jord, som en upptrampad stig (jordgolvet, steg 7.3.2)
function stigAv(s: State, x: number, y: number) {
  groundOf(s).cover[y * W + x] = 0;
}
// utbyggnaden (steg 7.2.5): när den nya delen är byggd öppnas den gamla väggen, ruta för ruta med samma arbete: den blir golv.
// Väggens material kommer tillbaka till den som äger huset (HUS.rivTillbaka). När de också är klara är huset ett större hus.
function slutUt(s: State, h: Hus, p: Person) {
  const ut = h.ut!;
  if (ut.oppnas.length) {
    let ved = 0;
    for (const [x, y, m] of ut.oppnas) {
      const b = bitsOf(s).find(q => q.hus === h.id && q.x === x && q.y === y);
      if (!b) continue;
      if (MATERIAL[b.m].item === 'ved') ved += b.mat;
      const M = MATERIAL[m];
      b.m = m; b.k = M.k; b.b = 0; b.mat = 0; b.c = 1; b.dorr = undefined; b.lp = b.lm = undefined;
    }
    ut.oppnas = [];
    h.rumFn = undefined; // rummen blir ett nytt rum med husets funktion
    // väggen finns inte längre: det materialet räknas inte till huset
    glomKom(h, 'ved', ved);
    const n = Math.floor(ved * HUS.rivTillbaka + 1e-9);
    if (n > 0) put(s, 'ved', n, h.ag !== undefined ? { [h.ag]: n } : undefined);
    touch(s); changed(s);
    return;
  }
  h.x = ut.x; h.y = ut.y; h.w = ut.w; h.h = ut.h; h.ut = undefined;
  if (fnOf(h).lager) for (const z of zonesOf(s)) if (z.hus === h.id) { z.x = h.x + 1; z.y = h.y + 1; z.w = h.w - 2; z.h = h.h - 2; changed(s); }
  count(s, 'utbyggt'); touch(s); husNytt(s, h, 'ut', 'Nyss utbyggt.');
  log(s, `${h.namn} är utbyggt.`, 'world', [p.id]);
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
  enPerRuta(s); // det som flyttats kan ha hamnat på en ruta där något redan låg
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
      log(s, `En vägg i ${h ? husFalt(h.namn).hus : 'ett hus'} var så sliten att den rasade.`, 'world');
    } else if (M.vag) vagBort(s, b);
    else { b.m = 'jord'; b.c = 1; }
    touch(s);
  }
}
// väggen b rasar (sliten, eller riven av tornadon i tornado.ts) och måste byggas om; huset är inte klart längre. Ger huset
export function rasar(s: State, b: Bit) {
  const h = husById(s, b.hus);
  if (h && MATERIAL[b.m].item) glomKom(h, MATERIAL[b.m].item!, b.mat);
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
// receptet till en dörr av sorten k som någon öppning saknar, när p kunde hänga den om materialet fanns (steg 6.2.19)
export function receptDorr(s: State, p: Person, k: DorrSlag): Recept | undefined {
  const d: DorrDef = DORRAR[k];
  if (!d.tek.some(t => knows(p, t)) || utanDorr(s, k).length <= (doingAct(s, 'dorr', p) ? 1 : 0)) return undefined;
  return { av: d.av };
}
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
// husets namn mitt i en mening ('långhuset', 'Stevids hus') och färdig eller färdigt efter genus (steg 4.5.1.4)
// huset i krönikan: "Förrådshus 2" blir "det andra förrådshuset" (inga siffror i texten, steg 6.7.4), "Hydda 3" "den tredje hyddan"
const NUMMER = ['', 'första', 'andra', 'tredje', 'fjärde', 'femte', 'sjätte', 'sjunde', 'åttonde', 'nionde', 'tionde', 'elfte', 'tolfte'];
function husFalt(namn: string) {
  const m = namn.match(/^(\S+) (\d+)$/);
  if (m) {
    const bas = m[1].toLowerCase(), ett = /hus$/.test(bas), best = ett ? `${bas}et` : bas.replace(/a$/, 'an'), n = +m[2];
    return { hus: n < NUMMER.length ? `${ett ? 'det' : 'den'} ${NUMMER[n]} ${best}` : `ännu ${ett ? 'ett' : 'en'} ${bas}`, klart: ett ? 'färdigt' : 'färdig' };
  }
  return { hus: / hus$/.test(namn) ? namn : namn.charAt(0).toLowerCase() + namn.slice(1), klart: /(et|hus)$/.test(namn) ? 'färdigt' : 'färdig' };
}
