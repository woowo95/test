import { ALDER, KROPP, ageOf, count, isSick, living, log, think } from './folk';
import { halsa } from './halsa';
import { eldPlats } from './karta';
import { avbryt } from './lager';
import { canLight } from './eld';
import { byInne, ledig, lekplats, paLek, stationDef, stationerOf } from './stationer';
import { bitsOf, gridOf, housesOf, roomAt } from './byggnad';
import { isLight } from './tid';
import { kronika } from './historik';
import { HOUR, Person, State, W, inMap } from './typer';
import { balans } from './balans';

// ---------- elden flyttas (steg 2.10.4) ----------
// Elden står där byn grundades. Den flyttas i två fall (Björn efter v115): när ett hus behöver platsen där elden står
// (planBuild i bygg.ts väljer den bara när ingen annan plats finns, ELDFLYTT.husStraff), och när byn vuxit ifrån den: husens
// och lagrets mitt (byInne) ligger mer än ELDFLYTT.vuxit rutor från elden. Då släcks elden, stenarna i ringen bärs till den nya
// platsen och elden tänds där igen med flinta som vanligt (eld.ts). Grillställningen följer med elden.
export const ELDFLYTT = balans('eldflytt', {
  husMin: 3, // byn flyttar elden till sin mitt först när den har så här många färdiga hus ...
  vuxit: 8, // ... och husens och lagrets mitt ligger mer än så här många rutor från elden
  sok: 6, // den nya platsen söks så här många rutor runt målet
  marg: 2, // ingen vägg så här nära den nya elden (rutor), så att man kan gå runt den
  tim: 2, // så här många timmar tar det att släcka elden och bära stenarna, när man kommit fram ...
  gang: 4, // ... och så här många timmar får det ta att gå dit
  husStraff: 6, // ett hus som skulle stå där elden står väljs bara om ingen annan plats är så här mycket bättre (bygg.ts)
  tanke: 0.04, // den som flyttat elden blir så här mycket gladare ...
  tankeTim: 6, // ... i så här många timmar
});

// står rutan (x, y) inpå elden (elden och rutorna runt den)?
export const vidElden = (s: State, x: number, y: number) => { const f = eldPlats(s); return Math.max(Math.abs(x - f.x), Math.abs(y - f.y)) <= 1; };

// kan elden stå på rutan (x, y)? Rutan och de åtta runt den är lediga (inget vatten, sten, hus, fält, station, lager eller
// något som ligger där), ute och inte på lekplatsen, och ingen vägg står inom ELDFLYTT.marg rutor. ut = en rektangel (ett
// hus som planeras) där elden inte får stå
export function eldKanSta(s: State, x: number, y: number, ut?: { x: number; y: number; w: number; h: number }) {
  const M = ELDFLYTT.marg, at = gridOf(s).at;
  if (paLek(lekplats(s), x - 1, y - 1, 3, 3)) return false;
  if (ut && x + 1 + M >= ut.x && x - 1 - M < ut.x + ut.w && y + 1 + M >= ut.y && y - 1 - M < ut.y + ut.h) return false;
  for (let dy = -1 - M; dy <= 1 + M; dy++) for (let dx = -1 - M; dx <= 1 + M; dx++) {
    const xx = x + dx, yy = y + dy;
    if (!inMap(xx, yy)) return false;
    if (at.has(yy * W + xx)) return false;
    if (Math.max(Math.abs(dx), Math.abs(dy)) <= 1 && (!ledig(s, xx, yy) || roomAt(s, xx + 0.5, yy + 0.5))) return false;
  }
  return true;
}
// den lediga platsen för elden närmast (mx, my), högst ELDFLYTT.sok rutor därifrån (samma plats varje gång, ingen slump)
export function nyEldplats(s: State, mx: number, my: number, ut?: { x: number; y: number; w: number; h: number }) {
  const R = ELDFLYTT.sok, cx = Math.round(mx), cy = Math.round(my);
  let best: { x: number; y: number } | undefined, bd = Infinity;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const x = cx + dx, y = cy + dy, d = Math.hypot(x - mx, y - my);
    if (d > R || d >= bd || vidElden(s, x, y) || !eldKanSta(s, x, y, ut)) continue;
    bd = d; best = { x, y };
  }
  return best;
}

// en gång i timmen: ska elden flyttas, och vem gör det?
export function stepEldFlytt(s: State) {
  const f = s.fire, ppl = living(s);
  if (f.flytt && !eldKanSta(s, f.flytt.x, f.flytt.y)) delete f.flytt; // platsen har tagits: en ny väljs nedan
  if (!f.flytt) {
    // ett hus som ska stå där elden står väntar (bygg.ts bygger inget inpå elden): elden behöver en ny plats bredvid huset
    const e = eldPlats(s), h = housesOf(s).find(q => bitsOf(s).some(b => b.hus === q.id && b.b < 1 && vidElden(s, b.x, b.y)));
    const ny = h && nyEldplats(s, e.x, e.y, h);
    if (ny) f.flytt = { ...ny, varfor: 'plats' };
  }
  if (!f.flytt) {
    const klara = housesOf(s).filter(h => h.klar).length, mid = byInne(s), e = eldPlats(s);
    if (klara >= ELDFLYTT.husMin && Math.hypot(mid.x - e.x, mid.y - e.y) > ELDFLYTT.vuxit) {
      const ny = nyEldplats(s, mid.x, mid.y);
      if (ny) f.flytt = { ...ny, varfor: 'vuxit' };
    }
  }
  if (!f.flytt || ppl.some(p => p.task?.act === 'flyttaeld')) return;
  // elden flyttas på dagen och när den kan tändas igen på den nya platsen (flinta och tändmaterial i förrådet)
  if (!isLight(s.now) || !canLight(s)) return;
  const e = eldPlats(s);
  let best: Person | undefined, bs = Infinity;
  for (const p of ppl) {
    const t = p.task;
    if (ageOf(p, s.now) < ALDER.vuxen || isSick(p, s.now) || halsa(p) < KROPP.svag || t && (t.act === 'sova' || t.phase === 'back' && t.carry > 0 || t.items)) continue;
    const sc = Math.hypot(p.x - e.x, p.y - e.y) - p.skill.hantverk;
    if (sc < bs) { bs = sc; best = p; }
  }
  if (!best) return;
  avbryt(s, best); // bördan läggs ner där hen står
  best.task = { act: 'flyttaeld', phase: 'go', tx: e.x + 0.5, ty: e.y + 1.3, until: s.now + ELDFLYTT.gang * HOUR, carry: 0, why: f.flytt.varfor === 'plats' ? 'Ett hus ska byggas där elden står' : 'Byn har vuxit ifrån elden', dark: false };
}

// arbetet är klart: elden släcks och står sedan på den nya platsen, med ringen av stenar. Grillställningen flyttas med
export function flyttaElden(s: State, p: Person) {
  const f = s.fire, mal = f.flytt;
  if (!mal) return;
  if (!eldKanSta(s, mal.x, mal.y)) { delete f.flytt; return; } // platsen hann tas: byn väljer en ny nästa timme (stepEldFlytt)
  const gammal = eldPlats(s);
  Object.assign(f, { lit: false, fuel: 0, emberUntil: undefined, ash: 0, ashUntil: undefined, tryProg: 0 });
  f.at = { x: mal.x, y: mal.y };
  delete f.flytt;
  for (const t of stationerOf(s)) if (stationDef(t.k)?.eld && t.y === gammal.y && t.x === gammal.x - 1) { t.x = mal.x - 1; t.y = mal.y; } // grillen står med elden i mitten (siteEld i stationer.ts)
  s.byggV = (s.byggV ?? 0) + 1; // husen, stationerna och vägarna räknas om
  count(s, 'eldflytt');
  log(s, `${p.name} släckte elden och bar stenarna i ringen till en ny eldplats ${mal.varfor === 'plats' ? 'där ett hus ska byggas' : 'mitt i byn'}.`, 'world', [p.id]);
  if (s.stat!.eldflytt === 1) kronika(s, `${p.name} flyttade byns eld ${mal.varfor === 'plats' ? 'för att ge plats åt ett hus' : 'till byns mitt'}.`);
  think(p, 'Flyttade elden', ELDFLYTT.tanke, s.now, ELDFLYTT.tankeTim * HOUR);
}
