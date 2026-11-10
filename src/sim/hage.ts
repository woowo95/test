// ---------- hagen (steg 9.8.4–9.8.6, Djuren i detalj: Hagen) ----------
// En egen fil för hagen och betet, så att tamdjur.ts (som varg.ts och arv.ts läser tidigt) inte drar in marken och odlingen.
import { balans } from './balans';
import { ALDER, ageOf, byId, count, forstaGang, gjort, living, log, ovning } from './folk';
import { getable, takeMaterial } from './behov';
import { rnd } from './slump';
import { H, Person, State, T, W, inMap } from './typer';
import { groundOf } from './mark';
import { BAR, FOREST } from './vag';
import { tabortBuske } from './buskar';
import { knows } from './teknik';
import { isLight } from './tid';
import { STAKET, faltRiktning, faltSite, harStaket } from './odling';
import { getMap } from './karta';
import { bynsMitt } from './omrade';
import { TAM, Tamdjur, tamArt, tamdjurOf } from './tamdjur';

// en timme för hagarna och betesdjuren (efter stepTamdjur): byn lägger ut en hage, djuren betar, staketet slits
export function stepHagar(s: State) {
  for (const d of betesdjurOf(s)) stepBete(s, d);
  planeraHage(s);
  for (const h of hagarOf(s)) slitHage(s, h);
}
// En inhägnad av staketet (steg 9.7.10) på gräs nära byn, en rektangel på HAGE.sida × HAGE.sida rutor med staket runt om.
// Djuren äter det som redan finns i marken (mark.ts, buskar.ts): getterna helst buskar och ungträd, fåren gräset. Är hagen för
// liten äts betet upp fortare än det växer, marken blir bar och djuren svälter. Staketet slits av vädret och djuren; ett hål
// släpper ut djuren, som betar fritt tills någon lagat hålet och lett tillbaka dem med ett rep (handlingen valla)
export interface Hage { id: number; x: number; y: number; w: number; h: number }
export const HAGE = balans('hage', {
  sida: 6, // hagens sida i rutor
  slit: 0.002, // chansen i timmen att en ruta av hagens staket går sönder ...
  slitDjur: 0.3, // ... gånger 1 + slitDjur för varje djur i hagen
  rymma: 0.08, // chansen i timmen att ett djur hittar hålet i staketet
  bettMin: 0.25, // djuret äter när hungern är minst så här stor
  bett: 0.15, // ett bett tar så mycket av gräset på rutan (täcket 0–1) ...
  grasMat: 0.25, // ... och stillar så mycket hunger
  buskMat: 0.5, // en buske stillar så mycket hunger (geten äter upp den)
  tradMat: 0.3, // ett ungträd stillar så mycket hunger (geten äter upp det)
  vallaMin: 15, // minuter för att leda ett djur med rep in i hagen
  ovning: 0.03, // djurskötseln växer så mycket när man vallar
  fri: 12, // ett djur utan hage strövar högst så här långt (rutor) från byns mitt
});
export const hagarOf = (s: State) => s.hagar ?? [];
export const hageById = (s: State, id?: number) => id === undefined ? undefined : hagarOf(s).find(h => h.id === id);
export const hageAt = (s: State, x: number, y: number) => hagarOf(s).find(h => x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h);
export function hageRutor(h: Hage) { const r: number[] = []; for (let y = h.y; y < h.y + h.h; y++) for (let x = h.x; x < h.x + h.w; x++) r.push(y * W + x); return r; }
// rutorna runt hagen som ska ha staket (inte i vattnet)
export function hageKant(s: State, h: Hage) {
  const t = getMap(s.seed).tiles, r: number[] = [];
  for (let y = h.y - 1; y <= h.y + h.h; y++) for (let x = h.x - 1; x <= h.x + h.w; x++) {
    if (x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h) continue;
    if (inMap(x, y) && t[y * W + x] !== T.Vatten) r.push(y * W + x);
  }
  return r;
}
export const hageHel = (s: State, h: Hage) => hageKant(s, h).every(i => harStaket(s, i));
export const betesdjurOf = (s: State) => tamdjurOf(s).filter(d => tamArt(d.art).bete);
export const djurIHagen = (s: State, h: Hage) => tamdjurOf(s).filter(d => d.hage === h.id);
// betet som är kvar i hagen: gräs (summan av täcket över bar jord), buskar och ungträd
export function hageBete(s: State, h: Hage) {
  const g = groundOf(s); let gras = 0, buskar = 0, unga = 0;
  for (const i of hageRutor(h)) { gras += Math.max(0, g.cover[i] - BAR); if (g.buske?.[i]) buskar++; if (g.trees[i] > 0 && g.trees[i] < FOREST) unga++; }
  return { gras, buskar, unga };
}
// hur många dygn betet räcker för djuren som går där (utan återväxt)
export function hageDygn(s: State, h: Hage) {
  const n = djurIHagen(s, h).length;
  if (!n) return Infinity;
  const b = hageBete(s, h), mat = b.gras / HAGE.bett * HAGE.grasMat + b.buskar * HAGE.buskMat + b.unga * HAGE.tradMat;
  return mat / (n * TAM.hungerTim * 24);
}

// byn lägger ut en hage när den har betesdjur och ingen hage, om någon kan sätta staket. Samma plats som ett fält skulle få
function planeraHage(s: State) {
  if (hagarOf(s).length || !betesdjurOf(s).length || !living(s).some(p => knows(p, 'staket'))) return;
  const n = HAGE.sida, at = faltSite(s, n, n * n);
  if (!at) return;
  const y = faltRiktning(s, at.y) > 0 ? at.y : at.y - (n - 1);
  (s.hagar ??= []).push({ id: (s.hagar?.length ?? 0) + 1, x: at.x, y, w: n, h: n });
  s.byggV = (s.byggV ?? 0) + 1; count(s, 'hagar');
  log(s, 'Byn märkte ut en plats för en hage åt djuren.', 'world', []);
}
// nästa staketruta p sätter runt en hage (också där staketet gått sönder)
export function hageVal(s: State, p: Person) {
  if (!knows(p, 'staket') || getable(s, p, 'grenar') < STAKET.grenar || !isLight(s.now)) return undefined;
  for (const h of hagarOf(s)) {
    const i = hageKant(s, h).find(j => !harStaket(s, j) && !living(s).some(q => q !== p && q.task?.act === 'hage' && q.task.ref === j));
    if (i !== undefined) return { h, i };
  }
  return undefined;
}
export function hageKlar(s: State, p: Person, i?: number) {
  if (i === undefined || harStaket(s, i) || getable(s, p, 'grenar') < STAKET.grenar) return;
  const h = hagarOf(s).find(q => hageKant(s, q).includes(i));
  if (!h) return;
  takeMaterial(s, p, 'grenar', STAKET.grenar);
  (s.staket ??= []).push(i); count(s, 'hageStaket');
  if (hageHel(s, h) && forstaGang(s, 'hageKlar')) log(s, `${p.name} satte den sista pinnen i byns första hage.`, 'world', [p.id]);
}
// staketet slits av vädret och djuren: ibland går en ruta sönder
function slitHage(s: State, h: Hage) {
  const n = djurIHagen(s, h).length;
  if (rnd(s, 'tamdjur') >= HAGE.slit * (1 + n * HAGE.slitDjur)) return;
  const k = hageKant(s, h).filter(i => harStaket(s, i));
  if (!k.length) return;
  const i = k[Math.floor(rnd(s, 'tamdjur') * k.length)];
  s.staket = (s.staket ?? []).filter(j => j !== i); count(s, 'staketSonder');
}
// rutan djuret helst äter på av rutorna rs (geten buskar och ungträd först), eller undefined
function betesRuta(s: State, d: Tamdjur, rs: number[]) {
  const g = groundOf(s), t = getMap(s.seed).tiles, bete = tamArt(d.art).bete;
  if (bete === 'buskar') {
    const b = rs.find(i => g.buske?.[i]); if (b !== undefined) return { i: b, slag: 'buske' as const };
    const u = rs.find(i => g.trees[i] > 0 && g.trees[i] < FOREST); if (u !== undefined) return { i: u, slag: 'trad' as const };
  }
  let bi = -1, bc = BAR + HAGE.bett / 2;
  for (const i of rs) if (t[i] !== T.Vatten && g.cover[i] > bc) { bc = g.cover[i]; bi = i; }
  return bi >= 0 ? { i: bi, slag: 'gras' as const } : undefined;
}
// en timme för ett betesdjur: rymmer genom ett hål, äter i hagen (eller där det strövar) och flyttar sig
function stepBete(s: State, d: Tamdjur) {
  let h = hageById(s, d.hage);
  if (h && !hageHel(s, h) && rnd(s, 'tamdjur') < HAGE.rymma) {
    const hal = hageKant(s, h).find(i => !harStaket(s, i))!, hx = hal % W, hy = Math.floor(hal / W);
    const ux = Math.sign(hx - (h.x + h.w / 2)), uy = Math.sign(hy - (h.y + h.h / 2));
    d.hage = undefined; d.x = hx + 0.5 + ux * 2; d.y = hy + 0.5 + uy * 2; h = undefined;
    count(s, 'tamRymde');
    const q = d.agare !== undefined ? byId(s, d.agare) : undefined;
    log(s, `${q ? `${q.name}s` : 'Byns'} ${tamArt(d.art).ord[1]} rymde genom ett hål i hagens staket.`, 'world', q ? [q.id] : []);
  }
  if (d.hunger < HAGE.bettMin) return;
  let rs: number[];
  if (h) rs = hageRutor(h);
  else {
    rs = [];
    const cx = Math.floor(d.x), cy = Math.floor(d.y);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inMap(cx + dx, cy + dy) && cy + dy < H) rs.push((cy + dy) * W + cx + dx);
  }
  const b = betesRuta(s, d, rs), g = groundOf(s);
  if (!b) {
    if (!h) { // inget att äta här: djuret strövar vidare, mot byn om det kommit för långt bort
      const m = bynsMitt(s), langt = Math.hypot(d.x - m.x, d.y - m.y) > HAGE.fri;
      const v = rnd(s, 'tamdjur') * Math.PI * 2, nx = langt ? d.x + Math.sign(m.x - d.x) : d.x + Math.round(Math.cos(v)), ny = langt ? d.y + Math.sign(m.y - d.y) : d.y + Math.round(Math.sin(v));
      if (inMap(Math.floor(nx), Math.floor(ny)) && getMap(s.seed).tiles[Math.floor(ny) * W + Math.floor(nx)] !== T.Vatten) { d.x = nx; d.y = ny; }
    }
    return;
  }
  if (b.slag === 'buske') { tabortBuske(g, b.i); d.hunger = Math.max(0, d.hunger - HAGE.buskMat); count(s, 'betadeBuskar'); }
  else if (b.slag === 'trad') { g.trees[b.i] = 0; d.hunger = Math.max(0, d.hunger - HAGE.tradMat); count(s, 'betadeTrad'); }
  else { g.cover[b.i] = Math.max(0, g.cover[b.i] - HAGE.bett); d.hunger = Math.max(0, d.hunger - HAGE.grasMat); count(s, 'betadeGras'); }
  d.x = b.i % W + 0.5; d.y = Math.floor(b.i / W) + 0.5;
}

// ---------- valla: leda ett djur med rep in i hagen ----------
// Den vuxne som har ett rep leder ett betesdjur som går utanför hagen (nyköpt eller rymt) in i en hel hage
export function vallaVal(s: State, p: Person) {
  if (ageOf(p, s.now) < ALDER.vuxen || getable(s, p, 'rep') < 1 || !isLight(s.now)) return undefined;
  if (!hagarOf(s).some(h => hageHel(s, h))) return undefined;
  let b: Tamdjur | undefined, bd = TAM.mataR * 2;
  for (const d of betesdjurOf(s)) {
    if (d.hage !== undefined || living(s).some(q => q !== p && q.task?.act === 'valla' && q.task.ref === d.id)) continue;
    const dd = Math.hypot(d.x - p.x, d.y - p.y);
    if (dd < bd) { b = d; bd = dd; }
  }
  return b;
}
export function vallaKlar(s: State, p: Person, ref?: number) {
  const d = tamdjurOf(s).find(q => q.id === ref);
  if (!d || d.hage !== undefined) return;
  const h = hagarOf(s).filter(q => hageHel(s, q)).sort((a, b) => Math.hypot(a.x - d.x, a.y - d.y) - Math.hypot(b.x - d.x, b.y - d.y))[0];
  if (!h) return;
  const rs = hageRutor(h), i = rs[Math.floor(rnd(s, 'tamdjur') * rs.length)];
  d.hage = h.id; d.x = i % W + 0.5; d.y = Math.floor(i / W) + 0.5;
  ovning(p, 'skotsel', HAGE.ovning); gjort(s, p, 'vallat'); count(s, 'vallat');
  if (forstaGang(s, 'vallatDjur')) log(s, `${p.name} ledde ${tamArt(d.art).ord[3]} in i hagen med ett rep.`, 'world', [p.id]);
}
