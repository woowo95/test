import { STRAK, straken } from './strak';
import { bynsMitt, utanforByn } from './omrade';
import { freeTools } from './agande';
import { budTillfalle, count, forstaGang, gjort, living, log, think } from './folk';
import { wearUsed } from './redskap';
import { groundOf, isForest, tileOf } from './mark';
import { FOREST, Ground } from './vag';
import { stadium, stadiumAv } from './trad';
import { pickNarmaste } from './slump';
import { Act, DAY, H, HOUR, Person, State, Stock, Task, W, inMap } from './typer';
import { housesOf } from './byggnad';
import { SNABBARE } from './handlingar';
import { balans } from './balans';
import { faltOf, faltRuta } from './odling';
import { stubbeOn, stubbRutor } from './stubbar';
import { heligRuta } from './kultlatt';
import { LAG_SKOG, lagGaller } from './lagar';
import { naturTanke } from './seder';
import { storlekAv } from './stationer';
export { stubbeOn, stubbRutor };

// ---------- skog: fälla träd, hugga ved, flinta och yxa ----------
// Utan yxa kan invånarna bara samla grenar på marken. Med en flintyxa kan de fälla träd.
// Ett fällt träd blir en liggande stam som sedan huggs till ved, och då blir det grenar också.
// Balanstal (regel 8): vad ett träd ger, hur lång tid det tar att fälla, och vilket träd man väljer. Hur många yxor byn vill
// ha och hur många som får bygga står i REDSKAP (redskap.ts)
export const SKOG = balans('skog', {
  stamVed: 6, // ett vuxet träd ger så här mycket trä ...
  stamGrenar: 5, // ... och så här många grenar
  liggande: 0.35, // viljan att fälla ett nytt träd för ett projekt delas med 1 + så här mycket per fälld stam som ligger i byn (steg 9.2.87)
  virkeVed: 2, // ett virke (steg 4.5.5.2) tar så här mycket av stammens trä
  fallTim: 0.1, // så många timmar tar det att fälla ett träd, delat med SNABBARE: fyra minuter (steg 2.3.8; 48 minuter förut)
  fallMin: 0.5, // ett litet träd fälls fortare, men aldrig på mindre än så här stor del av tiden
  stubbeDygn: 8, // en stubbe ruttnar bort efter så här många dygn (år i spelet)
  stubbeMin: 15, // minuter att gräva bort en stubbe för hand (steg 6.5.7) ...
  stubbeSpade: 2 / 15, // ... och så här stor del av tiden med benspaden: två minuter
  stubbeStor: 0.75, // en stubbe efter ett träd som gav minst så här stor del av ett fullvuxet träds trä ger 2 trä, annars 1
  tradMin: 0.95, // ett träd att fälla är minst så här stort (0 till 1) ...
  sokR: 22, // ... och står högst så här många rutor från lägret, i en cirkel (steg 9.2.82), så att det kala växer ut som en ring
  urval: 5, // man väljer slumpat bland de så här många närmaste träden
  forstaTanke: 0.1, // den som fäller byns första träd mår så här mycket bättre i forstaTankeTim timmar
  forstaTankeTim: 12,
});
// rutan ligger inom radien där träd fälls (steg 9.2.82): en cirkel kring lägret
export const iFallRadien = (f: { x: number; y: number }, x: number, y: number) => (x - f.x) ** 2 + (y - f.y) ** 2 <= SKOG.sokR ** 2;
export const stocks = (s: State) => (s.stockar ??= []);
const FALL_TID = SKOG.fallTim * HOUR / SNABBARE; // så lång tid det tar att fälla ett träd
// hur lång tid det tar att fälla trädet på ruta i: ett litet träd fälls fortare
export const fallTid = (s: State, i: number) => FALL_TID * Math.max(SKOG.fallMin, groundOf(s).trees[i]);

// rutorna med vuxna träd som ska fällas för att något ska ligga där: lagerplatserna som lagts i skogen och fälten som
// röjs, de rutor som inte är röjda än (steg 3.6.9)
// träden vars krona når in över huset h (steg 9.2.49): kronan reser sig uppåt från stammen, en rad för ett vuxet träd, två för
// ett gammalt och tre för ett jätteträd, så ett träd under huset kan skugga in över det fast stammen står utanför väggen
const KRONA: Record<string, number> = { vuxet: 1, gammalt: 2, jatte: 3, torraka: 1 };
export function kronaOver(s: State, h: { x: number; y: number; w: number; h: number }) {
  const g = groundOf(s), ut: number[] = [];
  for (let y = h.y + h.h; y <= h.y + h.h + 3; y++) for (let x = h.x; x < h.x + h.w; x++) {
    if (!inMap(x, y)) continue;
    const i = y * W + x, st = g.trees[i] >= FOREST ? stadium(g, i) : null;
    if (st && y - (KRONA[st] ?? 0) < h.y + h.h) ut.push(i);
  }
  return ut;
}
// där träd ska fällas: lagerplatser och fält som röjs, stationer ute, runt husen och gångstråken
export function skaRojas(s: State) {
  const g = groundOf(s), ut: number[] = [];
  for (const z of s.lagren ?? []) if (z.rojs && z.hus === undefined) for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) if (g.trees[y * W + x] >= FOREST) ut.push(y * W + x);
  for (const f of faltOf(s)) for (let k = 0; k < f.n; k++) if (rutorAv(f)[k].st === 'roja') { const i = faltRuta(f, k); if (g.trees[i] >= FOREST) ut.push(i); } // rutorna som ska röjas (steg 9.7.1)
  // en station på en plats med träd: de fälls som en del av bygget (steg 8.1.14)
  for (const t of s.stationer ?? []) if (!t.inne) { const { w, h } = storlekAv(t); for (let y = t.y; y < t.y + h; y++) for (let x = t.x; x < t.x + w; x++) if (g.trees[y * W + x] >= FOREST) ut.push(y * W + x); }
  // träden runt husen (steg 9.2.49): en ruta fri från träd runt varje byggnad och station ute, och de träd vars krona når in över
  // ett hus (kronaOver)
  { const sett = new Set(ut), lagg = (i: number) => { if (g.trees[i] >= FOREST && !sett.has(i)) { sett.add(i); ut.push(i); } };
    for (const h of housesOf(s)) { for (let y = h.y - 1; y <= h.y + h.h; y++) for (let x = h.x - 1; x <= h.x + h.w; x++) if (inMap(x, y)) lagg(y * W + x); for (const i of kronaOver(s, h)) lagg(i); }
    for (const t of s.stationer ?? []) if (!t.inne) { const { w, h } = storlekAv(t); for (let y = t.y - 1; y <= t.y + h; y++) for (let x = t.x - 1; x <= t.x + w; x++) if (inMap(x, y)) lagg(y * W + x); } }
  // ett träd som står i ett gångstråk fälls (steg 9.2.35, strak.ts)
  if (STRAK.pa) { const sett = new Set(ut); for (const v of straken(s).vagar) for (const i of v.rutor) if (g.trees[i] >= FOREST && !sett.has(i)) { sett.add(i); ut.push(i); } }
  return ut;
}
// det närmaste trädet att fälla i ett lager eller på ett fält i skogen, som ingen annan fäller (projektet rojning i projekt.ts)
// Träden i gångstråken fälls först (steg 9.2.35): de står där folk går varje dag
export function rojSpot(s: State, p: Person) {
  const taken = fellingTiles(s, p), strak = STRAK.pa ? straken(s).ruta : undefined; let best = -1, bd = Infinity;
  for (const i of skaRojas(s)) { const d = utanforByn(s, i % W, Math.floor(i / W)) - (strak?.[i] ? 1000 : 0); if (!taken.has(i) && d < bd) { bd = d; best = i; } }
  return best < 0 ? undefined : { x: (best % W) + 0.5, y: Math.floor(best / W) + 0.5, i: best };
}
// rutorna där någon annan än utom håller på att fälla ett träd
export const fellingTiles = (s: State, utom: Person) => new Set(living(s).filter(q => q !== utom && q.task?.act === 'falla').map(q => tileOf(q.task!.tx, q.task!.ty)));
// närmaste vuxna träd att fälla, helst i skogskanten nära byn (p väljer med sin egen slumpföljd)
const LUND_R = 4; // så många rutor runt en helig plats är den heliga lunden (budet, steg 8.6.6)
export function treeSpot(s: State, taken: Set<number>, p: Person): { x: number; y: number } | undefined {
  const g = groundOf(s), f = bynsMitt(s);
  // först träden där ett hus ska stå: de måste bort ändå, och stockarna blir husets väggar. Sedan träden på en lagerplats
  // och ett fält som röjs (steg 3.6.9): där fälls de först, och de blir trä
  let site = -1, sd = Infinity;
  const prova = (i: number) => { if (g.trees[i] >= FOREST && !taken.has(i)) { const d = utanforByn(s, i % W, Math.floor(i / W)); if (d < sd) { sd = d; site = i; } } };
  if (g.built) for (let i = 0; i < W * H; i++) if (g.built[i]) prova(i);
  if (site < 0) for (const i of skaRojas(s)) prova(i);
  if (site >= 0) return { x: (site % W) + 0.5, y: Math.floor(site / W) + 0.5 };
  // sedan ett träd som någon har börjat fälla (paborjat.ts): det närmaste
  let half = -1, hd = Infinity;
  for (const k in s.halvfallt ?? {}) { const i = +k, d = utanforByn(s, i % W, Math.floor(i / W)); if (isForest(s, i) && !taken.has(i) && d < hd) { hd = d; half = i; } }
  if (half >= 0) return { x: (half % W) + 0.5, y: Math.floor(half / W) + 0.5 };
  const c: { i: number; d: number }[] = [], skogsfred = lagGaller(s, 'skogsfred'), lund = !!s.heliga?.length && budTillfalle(s, 'falla', p);
  for (let y = Math.max(0, f.y - SKOG.sokR); y < Math.min(H, f.y + SKOG.sokR + 1); y++) for (let x = Math.max(0, f.x - SKOG.sokR); x < Math.min(W, f.x + SKOG.sokR + 1); x++) {
    if (!iFallRadien(f, x, y)) continue;
    const i = y * W + x;
    if (g.trees[i] < SKOG.tradMin || taken.has(i) || s.hamlade?.some(h => h.i === i)) continue; // det hamlade trädet fälls inte (steg 9.8.16)
    if (skogsfred && utanforByn(s, x, y) <= LAG_SKOG) continue; // lagen om skogen (steg 8.4.1)
    if (s.heliga?.length && (heligRuta(s, x, y) || lund && s.heliga.some(h => h.tro === p.tro && !h.skandad && Math.hypot(h.x - x, h.y - y) <= LUND_R))) continue; // den heliga platsen fälls inte (steg 8.5.5), och inte lunden runt den om budet säger så (steg 8.6.6)
    c.push({ i, d: utanforByn(s, x, y) });
  }
  if (!c.length) return undefined;
  c.sort((a, b) => a.d - b.d);
  const i = pickNarmaste(s, c, SKOG.urval, 'val', p).i;
  return { x: (i % W) + 0.5, y: Math.floor(i / W) + 0.5 };
}
// stammen som ett träd på ruta i blir när det fälls: trä och grenar efter hur stort trädet är och dess stadium (steg 5.1.4.4)
export function stamAv(g: Ground, i: number) {
  const st = stadium(g, i), d = st ? stadiumAv(st) : { stam: 1, grenar: 1 }, size = g.trees[i];
  return { ved: Math.round(SKOG.stamVed * size * d.stam), grenar: Math.round(SKOG.stamGrenar * size * d.grenar) };
}
// stockens längd i bilden (0–2, efter träet), som kartan ritar den (ui/foremal.ts), och rutorna bilden täcker: foten på
// stockens ruta och kronan åt höger, 1–3 rutor lång och upp i raden ovanför (steg 9.2.86)
export const stockLangd = (ved: number) => ved <= 3 ? 0 : ved <= 7 ? 1 : 2;
export function stockRutor(k: Stock) {
  const x0 = Math.floor(k.x), y0 = Math.floor(k.y), r: number[] = [];
  for (let y = y0 - 1; y <= y0; y++) for (let x = x0; x <= x0 + stockLangd(k.ved) + 1; x++) if (inMap(x, y)) r.push(y * W + x);
  return r;
}
// ligger stockens krona över ett färdigt hus? Den huggs då före alla andra stockar och före nästa fällning
export function overHus(s: State, k: Stock) {
  const hus = housesOf(s).filter(h => h.klar);
  return hus.length > 0 && stockRutor(k).some(i => { const x = i % W, y = Math.floor(i / W); return hus.some(h => x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h); });
}
export const stockOverHus = (s: State) => stocks(s).find(k => k.ved > 0 && overHus(s, k));
// stammen p själv fällt och som inte är huggen än (steg 9.2.87): hela trädet tas om hand innan nästa fälls
export const egenStock = (s: State, p: Person) => stocks(s).find(k => k.ved > 0 && k.av === p.id);
// viljan att fälla ett nytt träd för ett projekt sjunker med antalet fällda stammar som ligger i byn (steg 9.2.87)
export const fallVilja = (s: State) => 1 / (1 + SKOG.liggande * stocks(s).filter(k => k.ved > 0 && !utanforByn(s, k.x, k.y)).length);
const nearestStock = (s: State, p?: Person) => {
  const over = stockOverHus(s) ?? (p && egenStock(s, p));
  if (over) return over;
  const b = groundOf(s).built, onSite = (k: Stock) => b?.[tileOf(k.x, k.y)] ? 0 : 1; // stammarna där huset ska stå först
  return stocks(s).filter(k => k.ved > 0).sort((a, c) => onSite(a) - onSite(c) || utanforByn(s, a.x, a.y) - utanforByn(s, c.x, c.y))[0];
};

// trädet faller: det blir en liggande stam, och där det stod växer högt gräs
export function fellTree(s: State, p: Person, x: number, y: number) {
  const g = groundOf(s), i = tileOf(x, y);
  if (!isForest(s, i)) return;
  const stam = stamAv(g, i);
  g.trees[i] = 0; g.cover[i] = 1;
  if (s.halvfallt) delete s.halvfallt[i];
  const k: Stock = { id: (s.nextStock = (s.nextStock ?? 0) + 1), x: Math.floor(x) + 0.5, y: Math.floor(y) + 0.5, ...stam, av: p.id }; // den som fällde hugger helst själv (steg 9.2.87)
  stocks(s).push(k);
  nyStubbe(s, Math.floor(x), Math.floor(y), stam.ved); // stubben blir alltid kvar, också där ett hus ska stå (steg 6.5.7)
  s.fallda = (s.fallda ?? 0) + 1; gjort(s, p, 'trad'); naturTanke(s, 'Ett träd fälldes');
  if (s.fallda === 1) {
    log(s, `${p.name} fällde byns första träd med flintyxan.`, 'world', [p.id]);
    p.fame.push('Fällde byns första träd');
    think(p, 'Fällde ett träd', SKOG.forstaTanke, s.now, SKOG.forstaTankeTim * HOUR);
  }
  return k;
}
// en stubbe står kvar efter trädet och ruttnar sakta bort. v = träet den ger när den grävs bort (1–2 efter trädets storlek)
export const STUBBE_LIV = SKOG.stubbeDygn * DAY;
export function nyStubbe(s: State, x: number, y: number, ved: number) {
  (s.stubbar ??= []).push({ x, y, t: s.now, v: ved >= SKOG.stamVed * SKOG.stubbeStor ? 2 : 1 });
}
// stubbarna där något ska stå (steg 6.5.7): på husplatserna, i lagerplatserna och på fälten som röjs. De grävs bort först
export function skaGravas(s: State) {
  if (!s.stubbar?.length) return [];
  const g = groundOf(s), falt = new Set<number>();
  for (const f of faltOf(s)) for (let k = 0; k < f.n; k++) if (rutorAv(f)[k].st === 'roja') falt.add(faltRuta(f, k));
  const lager = (x: number, y: number) => (s.lagren ?? []).some(z => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h);
  return s.stubbar.filter(k => { const i = k.y * W + k.x; return !!g.built?.[i] || falt.has(i) || lager(k.x, k.y); });
}
// den närmaste stubbe att gräva bort som ingen annan gräver
export function stubbeSpot(s: State, p: Person) {
  const tagen = new Set(living(s).filter(q => q !== p && q.task?.act === 'stubbe').map(q => q.task!.ref));
  let best: { x: number; y: number } | undefined, bd = Infinity;
  for (const k of skaGravas(s)) { const i = k.y * W + k.x; if (tagen.has(i)) continue; const d = utanforByn(s, k.x, k.y); if (d < bd) { bd = d; best = k; } }
  return best;
}
// uppgiften: gräva bort stubben, fortare med benspaden
export function stubbeUppgift(s: State, p: Person) {
  const k = stubbeSpot(s, p);
  if (!k) return undefined;
  const spade = freeTools(s, p, 'benspade') > 0;
  return { act: 'stubbe' as const, text: 'Gräver bort en stubbe där något ska byggas.', min: SKOG.stubbeMin * (spade ? SKOG.stubbeSpade : 1), tool: spade ? 'benspade' : undefined, spot: { x: k.x + 0.5, y: k.y + 0.5 }, ref: k.y * W + k.x };
}
// stubben är bortgrävd (KLAR i steg.ts): den ger 1–2 trä men inga grenar, som ett litet stycke stam att hugga
export function stubbeGravd(s: State, p: Person, t: Task) {
  const i = t.ref ?? -1, x = i % W, y = Math.floor(i / W), k = (s.stubbar ?? []).find(q => q.x === x && q.y === y);
  if (!k) return;
  s.stubbar = s.stubbar!.filter(q => q !== k);
  stocks(s).push({ id: (s.nextStock = (s.nextStock ?? 0) + 1), x: x + 0.5, y: y + 0.5, ved: k.v ?? 1, grenar: 0 });
  if (t.tool) wearUsed(s, p, 1);
  count(s, 'stubbarGravda');
  if (forstaGang(s, 'stubbeForsta')) log(s, `${p.name} grävde bort en stubbe där byn ska bygga. Rötterna blir lite trä.`, 'world', [p.id]);
}
export function rotStumps(s: State) {
  if (s.stubbar?.length) s.stubbar = s.stubbar.filter(k => s.now - k.t < STUBBE_LIV);
}
// hugg ut ved och grenar ur en stam; ger det som blev, och tar bort stammen när den är slut
export function chopStock(s: State, ref: number | undefined, amount: number) {
  const k = stocks(s).find(q => q.id === ref);
  if (!k) return undefined;
  const ved = Math.min(k.ved, amount), gr = Math.min(k.grenar, ved * SKOG.stamGrenar / SKOG.stamVed), mossa = k.mossa ?? 0; // mossan tas med första gången (steg 2.5.2)
  k.ved -= ved; k.grenar -= gr; if (mossa) k.mossa = undefined;
  if (k.ved <= 1e-6) { k.grenar = 0; s.stockar = stocks(s).filter(q => q !== k); }
  return { ved, grenar: gr, mossa, done: k.ved <= 1e-6 };
}

// den fällda stam närmast byn som räcker till ett virke (steg 4.5.5.2)
// finns det en stam att klyva (utan att leta upp den närmaste)
export const finnsKlyvStam = (s: State) => (s.stockar ?? []).some(k => k.ved >= SKOG.virkeVed);
export const klyvStam = (s: State) => (s.stockar ?? []).filter(k => k.ved >= SKOG.virkeVed).sort((a, c) => utanforByn(s, a.x, a.y) - utanforByn(s, c.x, c.y))[0];
// en vuxen med en ledig yxa som ska skaffa ved: hugga en fälld stam eller fälla ett träd. Utan yxa görs en som projekt
// (withTools i val.ts, steg 6.2.17), eller samlas grenar
export function axeTask(s: State, p: Person): { act: Act; x: number; y: number; ref?: number; dur?: number; why: string } | undefined {
  if (freeTools(s, p, 'yxa') > 0) { // en yxa som ingen annan fäller eller hugger med
    const k = nearestStock(s, p);
    if (k) return { act: 'hugga', x: k.x + 0.3, y: k.y + 0.2, ref: k.id, why: 'Hugger ved av en fälld stam' };
    const t = treeSpot(s, fellingTiles(s, p), p);
    if (t) return { act: 'falla', x: t.x, y: t.y, dur: fallTid(s, tileOf(t.x, t.y)), why: 'Har en yxa och fäller ett träd' };
  }
  return undefined;
}
import { rutorAv } from './odling';
