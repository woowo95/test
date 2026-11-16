// ---------- bina (system 10.10, steg 10.10.14–10.10.27; Djuren i detalj: Bina) ----------
// Binas drag (steg 10.10.14): hur mycket som blommar för bina på en plats, ett tal mellan 0 och 1. Det som blommar är rader i
// registret DRAGKALLOR, och en ny dragväxt är en ny rad. Summan inom BIN.r rutor delas med BIN.dragFullt, och talet är högst 1.
// På hösten och i istiden blommar inget. Draget räknas när någon frågar (kupans plats och ruta), inte varje slag
import { balans } from './balans';
import { groundOf } from './mark';
import { BUSKE, FOREST } from './vag';
import { BARBUSKE } from './buskar';
import { GRODOR, GrodaSlag, faltOf, faltRuta, rutorAv } from './odling';
import { torkaNu } from './torka';
import { HOST, ISTID, SOMMAR, VAR, kalender } from './tid';
import { fyndAt } from './fynd';
import { HOUR_S, State, W, inMap } from './typer';
import { Station, isKlar, stationerOf } from './stationer';
import { chance } from './slump';
import { count, forstaGang, log } from './folk';
import { notis } from './notiser';

export const BIN = balans('bin', {
  r: 10, // bina flyger så här många rutor från samhället
  dragFullt: 20, // så mycket som blommar inom räckhåll ger draget 1
  torka: 0.6, // i torkan blommar buskar och grödor så här mycket (ängsblommorna har lagrets egen torka)
  // vildbina (steg 10.10.15)
  dragNog: 0.6, // byn vill ha en bikupa till där draget är minst så här stort (steg 10.10.16)
  boSyns: 0.6, // boet syns där vildbinas lager är minst så här rikt och ett vuxet träd står
  vildTim: 0.4, // så många honungskakor i timmen tar den som samlar intill ett rikt bo
  // svärmen (steg 10.10.17)
  svarmTim: 1 / 48, // chansen per timme att en svärm flyttar in i en tom kupa på sommaren, gånger tillgången på svärmar
  svarmR: 20, // vildbinas bon inom så här många rutor från kupan ger svärmar ...
  svarmFullt: 4, // ... och så mycket av lagret (summan) ger full tillgång
  svarmHonung: 2, // det nya samhället börjar med så många honungskakor
  varde: 15, // ett bisamhälle räknas så här mycket i ägarens rikedom
});

// en dragkälla: vad den ger inom räckhåll av (x, y), i tidsåldern ai, med eller utan torka. ikon = symbolen i kupans ruta
export interface DragKalla { namn: string; ikon: string; summa: (s: State, x: number, y: number, ai: number, torr: boolean) => number }
// rutorna inom BIN.r rutor från (x, y)
function inomR(x: number, y: number, fn: (i: number) => void) {
  const cx = Math.floor(x), cy = Math.floor(y), r = BIN.r;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > r * r) continue;
    const xx = cx + dx, yy = cy + dy;
    if (inMap(xx, yy)) fn(yy * W + xx);
  }
}
// bärbuskarna blommar mest på våren
const BUSK_ARSTID = [0, 0.5, 0.25, 0];
export const DRAGKALLOR: Record<string, DragKalla> = {
  // ängsblommorna: värmekartans lager, 1 per full ruta, med lagrets egen årstid och torka
  blomma: { namn: 'Ängsblommor', ikon: 'blomma', summa: (s, x, y) => { let n = 0; inomR(x, y, i => { n += fyndAt(s, 'blomma', i); }); return n; } },
  // bärbuskarna: 0,5 per buske på våren och 0,25 på sommaren
  barbuske: { namn: 'Bärbuskar', ikon: 'bar', summa: (s, x, y, ai, torr) => {
    const b = groundOf(s).buske, v = BUSK_ARSTID[ai] * (torr ? BIN.torka : 1);
    if (!b || !v) return 0;
    let n = 0; inomR(x, y, i => { if (b[i] === BUSKE + BARBUSKE) n += v; }); return n;
  } },
  // fältrutorna som växer eller är mogna med en gröda som har ett dragtal (drag på grödans rad i GRODOR), på våren och sommaren
  grodor: { namn: 'Grödor', ikon: 'bonor', summa: (s, x, y, ai, torr) => {
    if (ai !== VAR && ai !== SOMMAR) return 0;
    const r2 = BIN.r * BIN.r, cx = Math.floor(x), cy = Math.floor(y);
    let n = 0;
    for (const f of faltOf(s)) rutorAv(f).forEach((r, k) => {
      const d = r.g && (GRODOR[r.g as GrodaSlag] as { drag?: number }).drag;
      if (!d || (r.st !== 'vaxer' && r.st !== 'mogen')) return;
      const i = faltRuta(f, k), dx = i % W - cx, dy = Math.floor(i / W) - cy;
      if (dx * dx + dy * dy <= r2) n += d;
    });
    return n * (torr ? BIN.torka : 1);
  } },
};
export const DRAG_LIST = Object.keys(DRAGKALLOR);
// varje källas del av det som blommar inom räckhåll av (x, y) just nu
export function dragDelar(s: State, x: number, y: number): Record<string, number> {
  const ai = kalender(s).ai, ut: Record<string, number> = {};
  if (ai === HOST || ai === ISTID) { for (const k of DRAG_LIST) ut[k] = 0; return ut; }
  const torr = torkaNu(s);
  for (const k of DRAG_LIST) ut[k] = DRAGKALLOR[k].summa(s, x, y, ai, torr);
  return ut;
}
// draget på (x, y): summan delad med BIN.dragFullt, högst 1
// vildboet syns på ruta i (steg 10.10.15): på sommaren och hösten, där vildbinas lager är rikt och ett vuxet träd står
export const vildboSyns = (s: State, i: number) => { const ai = kalender(s).ai; return (ai === SOMMAR || ai === HOST) && groundOf(s).trees[i] >= FOREST && fyndAt(s, 'honung', i) >= BIN.boSyns; };
export const drag = (s: State, x: number, y: number) => Math.min(1, Object.values(dragDelar(s, x, y)).reduce((a, b) => a + b, 0) / BIN.dragFullt);


// ---------- kuporna och svärmen (steg 10.10.17, Djuren i detalj: Svärmen) ----------
// de färdiga kuporna, och de som har ett bisamhälle (honungen i kupan, t.bi)
export const kupor = (s: State) => stationerOf(s).filter(t => t.k === 'bikupa' && isKlar(t));
export const samhallen = (s: State) => kupor(s).filter(t => t.bi !== undefined);
// draget ett samhälle på (x, y) får: samhällen inom BIN.r rutor från varandra delar på det (utan = kupan själv)
export function dragDelat(s: State, x: number, y: number, utan?: Station) {
  const n = samhallen(s).filter(t => t !== utan && Math.hypot(t.x - x, t.y - y) <= BIN.r).length;
  return drag(s, x, y) / (1 + n);
}
// tillgången på svärmar vid (x, y): vildbinas lager inom BIN.svarmR rutor delat med BIN.svarmFullt, högst 1
export function svarmTillgang(s: State, x: number, y: number) {
  const r = BIN.svarmR; let n = 0;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r && inMap(x + dx, y + dy)) n += fyndAt(s, 'honung', (y + dy) * W + x + dx);
  return Math.min(1, n / BIN.svarmFullt);
}
// binas takt (en rad i TAKTER, var fjärde timme): på sommaren kan en svärm flytta in i en tom kupa, räknat per tid
export function binSteg(s: State, dt: number) {
  if (kalender(s).ai !== SOMMAR) return;
  for (const t of kupor(s)) {
    if (t.bi !== undefined) continue;
    const till = svarmTillgang(s, t.x, t.y);
    if (till <= 0 || !chance(s, BIN.svarmTim * till / HOUR_S, dt, 'bin')) continue;
    t.bi = BIN.svarmHonung; count(s, 'bisvarm');
    log(s, 'En svärm bin flyttade in i en tom bikupa.', 'world', t.ag !== undefined ? [t.ag] : []);
    if (forstaGang(s, 'forstaBisamhalle')) notis(s, 'bin', 'En svärm bin har flyttat in i en av byns kupor. Byn har fått sitt första bisamhälle.', t.ag !== undefined ? [t.ag] : [], { x: t.x + 0.5, y: t.y + 0.5 });
  }
}
