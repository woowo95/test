import { HOUR, H, Person, State, Task, W } from './typer';
import { balans } from './balans';
import { groundOf, skuggad } from './mark';
import { FOREST, HIGH, isSoil } from './vag';
import { SKOG, fallTid, skaRojas, stamAv, stocks } from './skog';
import { hash } from './karta';
import { vaderNu } from './vader';
import { tornadoNu } from './tornado';
import { bynsMitt, utanforByn } from './omrade';
import { count, forstaGang, living, log, think } from './folk';
import { knows, tankePa } from './teknik';
import { faltOf, faltRutor } from './odling';
import { freeTools } from './agande';
import { wearUsed } from './redskap';

// ---------- skogen som byn sköter (steg 6.5.2) ----------
// Med tekniken Skogsvård kan man gräva upp en planta och sätta den på en annan jordruta. Tekniken kommer man på när man fäller
// träd långt från byn (tankePa i KLAR.falla, steg.ts). Plantorna tas helst där de står skuggade (skuggad i mark.ts), annars
// långt från byn, och sätts nära byn där inget ska byggas: bredvid stubbar och skog, på högt gräs (en stig stoppar
// växandet). Byn vill flytta plantor när de närmaste träden att fälla står långt bort (raden skogsvard i PROJEKT, projekt.ts).
// Arbetet går fortare med en benspade
export const SKOGSVARD = balans('skogsvard', {
  langt: 8, // de närmaste träden att fälla står så här många rutor utanför byn: byn vill ha skog närmare, och den som fäller där kommer på tekniken
  minAvst: 2, // plantan sätts minst så här många rutor utanför byn (så att gångarna närmast husen är fria) ...
  maxAvst: 6, // ... och högst så här många
  gravMin: 12, // minuter att gräva upp en planta för hand ...
  spade: 0.5, // ... och så här stor del av tiden med benspaden
  tanke: 1, // den som fäller ett träd långt bort tänker på skogsvården så här många gånger fällningstiden
  glad: 0.04, glatTim: 6, // den som satt en planta mår så här mycket bättre i så här många timmar
});

// avståndet utanför byn till det närmaste träd som kan fällas (som treeSpot i skog.ts letar), Infinity om inget finns
export function narmasteFall(s: State) {
  const g = groundOf(s), f = bynsMitt(s); let bd = Infinity;
  for (let y = Math.max(0, f.y - SKOG.sokY); y < Math.min(H, f.y + SKOG.sokY + 1); y++) for (let x = Math.max(0, f.x - SKOG.sokX); x < Math.min(W, f.x + SKOG.sokX + 1); x++) {
    if (g.trees[y * W + x] < SKOG.tradMin) continue;
    const d = utanforByn(s, x, y); if (d < bd) bd = d;
  }
  return bd;
}
// den som fäller ett träd långt från byn (KLAR.falla i steg.ts) tänker på skogsvården
export function fallTanke(s: State, p: Person, i: number) {
  if (utanforByn(s, i % W, Math.floor(i / W)) >= SKOGSVARD.langt) tankePa(s, p, 'skogsvard', fallTid(s, i) / 1000 * SKOGSVARD.tanke);
}
const planta = (t: number) => t > 0 && t < FOREST;
// rutorna som någon annan redan tar en planta från eller sätter en på
function upptagna(s: State, utom?: Person) {
  const r = new Set<number>();
  for (const q of living(s)) if (q !== utom && q.task?.act === 'plantera') { if (q.task.phase !== 'back') r.add(q.task.ref ?? -1); r.add(Math.floor(q.task.ty) * W + Math.floor(q.task.tx)); }
  return r;
}
// plantan att gräva upp: den skuggade närmast byn, annars en planta långt från byn (utanför där plantorna sätts)
export function plantaKalla(s: State, p?: Person) {
  const g = groundOf(s), f = bynsMitt(s), tagen = upptagna(s, p); let best = -1, bd = Infinity;
  for (let y = Math.max(0, f.y - SKOG.sokY); y < Math.min(H, f.y + SKOG.sokY + 1); y++) for (let x = Math.max(0, f.x - SKOG.sokX); x < Math.min(W, f.x + SKOG.sokX + 1); x++) {
    const i = y * W + x;
    if (!planta(g.trees[i]) || tagen.has(i)) continue;
    const d = utanforByn(s, x, y), sk = skuggad(g, i);
    if (!sk && d <= SKOGSVARD.maxAvst) continue;
    const v = d + (sk ? 0 : 1000);
    if (v < bd) { bd = v; best = i; }
  }
  return best < 0 ? undefined : best;
}
// platsen att sätta plantan: en jordruta med högt gräs nära byn, utan träd, hus, lager, fält eller stubbe, där det inte är
// för trångt, bredvid en stubbe eller skog (där träd fällts); den närmaste byn
export function plantaMal(s: State, p?: Person) {
  const g = groundOf(s), f = bynsMitt(s), tagen = upptagna(s, p);
  const stubbe = new Set((s.stubbar ?? []).map(k => k.y * W + k.x)), hinder = new Set([...skaRojas(s), ...faltOf(s).flatMap(faltRutor)]);
  const lager = (x: number, y: number) => (s.lagren ?? []).some(z => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h);
  let best = -1, bd = Infinity;
  const R = SKOGSVARD.maxAvst + 12;
  for (let y = Math.max(1, f.y - R); y < Math.min(H - 1, f.y + R + 1); y++) for (let x = Math.max(1, f.x - R); x < Math.min(W - 1, f.x + R + 1); x++) {
    const i = y * W + x, d = utanforByn(s, x, y);
    if (d < SKOGSVARD.minAvst || d > SKOGSVARD.maxAvst || d >= bd) continue;
    if (!isSoil(g.tiles[i]) || g.trees[i] > 0 || g.cover[i] < HIGH || g.built?.[i] || stubbe.has(i) || hinder.has(i) || tagen.has(i) || lager(x, y) || skuggad(g, i)) continue;
    let nara = false;
    for (let dy = -1; dy <= 1 && !nara; dy++) for (let dx = -1; dx <= 1; dx++) { const j = i + dy * W + dx; if (stubbe.has(j) || g.trees[j] >= FOREST) { nara = true; break; } }
    if (nara) { bd = d; best = i; }
  }
  return best < 0 ? undefined : best;
}
// byn vill flytta plantor: någon kan skogsvård, och de närmaste träden att fälla står långt bort
export const skogsvardBrist = (s: State) => living(s).some(q => knows(q, 'skogsvard')) && narmasteFall(s) >= SKOGSVARD.langt && plantaMal(s) !== undefined ? 1 : 0;
export const kanPlantera = (s: State, p: Person) => knows(p, 'skogsvard') && narmasteFall(s) >= SKOGSVARD.langt && plantaKalla(s, p) !== undefined && plantaMal(s, p) !== undefined;
// uppgiften: gå till plantan och gräva upp den (med spaden om en är ledig)
export function planteraUppgift(s: State, p: Person) {
  const k = plantaKalla(s, p);
  if (k === undefined) return undefined;
  const spade = freeTools(s, p, 'benspade') > 0;
  return { act: 'plantera' as const, text: 'Gräver upp en planta för att sätta den närmare byn.', min: SKOGSVARD.gravMin * (spade ? SKOGSVARD.spade : 1), tool: spade ? 'benspade' : undefined, spot: { x: k % W + 0.5, y: Math.floor(k / W) + 0.5 }, ref: k };
}
// plantan är uppgrävd (KLAR i steg.ts): den bärs till platsen där den ska stå. Storleken och sorten följer med i uppgiften
export function plantaUppgravd(s: State, p: Person, t: Task) {
  const g = groundOf(s), k = t.ref ?? -1, m = plantaMal(s, p);
  if (k < 0 || !planta(g.trees[k]) || m === undefined) return;
  t.prog = g.trees[k]; t.ref = g.art?.[k] ?? 0; // storleken och sorten
  g.trees[k] = 0;
  if (t.tool) wearUsed(s, p, 1);
  t.phase = 'back'; t.tx = m % W + 0.5; t.ty = Math.floor(m / W) + 0.5; t.why = 'Bär en planta dit byn vill ha skog';
}
// framme med plantan (LAMNA i steg.ts): den sätts i jorden, om platsen fortfarande är fri
export function plantaSatt(s: State, p: Person, t: Task) {
  const g = groundOf(s), i = Math.floor(t.ty) * W + Math.floor(t.tx);
  if (t.prog && isSoil(g.tiles[i]) && g.trees[i] === 0 && !g.built?.[i]) {
    g.trees[i] = t.prog; if (g.art) g.art[i] = t.ref ?? 0;
    count(s, 'plantorFlyttade');
    think(p, 'Satte en planta', SKOGSVARD.glad, s.now, SKOGSVARD.glatTim * HOUR);
    if (forstaGang(s, 'plantaForsta')) log(s, `${p.name} grävde upp en planta och satte den närmare byn, där skogen ska växa tillbaka.`, 'world', [p.id]);
  }
  p.task = undefined;
}

// ---------- vindfällen (steg 6.5.5, "Skogen som byn sköter" i designdokumentet, stycket Vindfällen) ----------
// När det blåser väldigt hårt utan en tornado (stormen under tornadon är tornado.ts) kan vuxna träd falla och bli liggande stammar
// som ger lätt trä, med samma bild som ett träd fällt med yxa. Ju hårdare det blåser, desto större risk; under VINDFALL.fran
// faller inga. Räknas en gång i timmen ur timmen och rutan (timsteget i steg.ts), så att levande läget och snabbläget blir lika
export const VINDFALL = balans('vindfall', {
  fran: 0.8, // vinden (0–1, vader.ts) ska vara starkare än så här för att träd ska falla (det blåser så hårt ungefär 3 % av timmarna) ...
  chans: 0.0002, // ... och i den hårdaste vinden faller ett vuxet träd med den här chansen i timmen (mindre i svagare vind)
});
export function vindfallen(s: State) {
  const v = vaderNu(s).vind;
  if (v <= VINDFALL.fran || tornadoNu(s)) return;
  const c = VINDFALL.chans * (v - VINDFALL.fran) / (1 - VINDFALL.fran), g = groundOf(s), tim = Math.floor(s.now / HOUR);
  for (let i = 0; i < W * H; i++) {
    if (g.trees[i] < FOREST || hash(s.seed + tim * 13 + 6505, i % W, Math.floor(i / W)) >= c) continue;
    const x = i % W, y = Math.floor(i / W), stam = stamAv(g, i);
    g.trees[i] = 0;
    if (s.halvfallt) delete s.halvfallt[i];
    stocks(s).push({ id: (s.nextStock = (s.nextStock ?? 0) + 1), x: x + 0.5, y: y + 0.5, ...stam });
    if (!g.built?.[i]) (s.stubbar ??= []).push({ x, y, t: s.now });
    count(s, 'vindfall');
    if (forstaGang(s, 'vindfallForsta')) log(s, 'Ett träd föll i den hårda vinden och ligger nu i skogen.', 'world', []);
  }
}
