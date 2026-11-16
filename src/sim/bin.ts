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
import { chance, rnd } from './slump';
import { count, forstaGang, log } from './folk';
import { notis } from './notiser';
import { hardVinter } from './vader';
import { ALDER, ageOf, alive, byId, gjort, living, ovning } from './folk';
import { kn, learnK, useK } from './kunskap';
import { isLight } from './tid';
import { capacity, put } from './lager';
import { viktOf } from './saker';
import type { Person } from './typer';

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
  svarmHonung: 2, // det nya samhället börjar med så många honungskakor (och en kupa som svärmar mister lika många hela kakor)
  svarmVid: 7, // ett samhälle med minst så många kakor svärmar (steg 10.10.19) ...
  kupSvarm: 0.5, // ... och lägger så mycket till tillgången på svärmar för en tom kupa inom BIN.svarmR rutor
  varde: 15, // ett bisamhälle räknas så här mycket i ägarens rikedom
  // binas år (steg 10.10.18)
  honungTim: 1 / 24, // honungskakor per timme som samhället samlar vid fullt drag
  aterTim: 1 / 120, // honungskakor per timme som samhället äter, hela året
  hardVinter: 0.5, // i en hård vinter äter det så här mycket mer
  rymmer: 10, // kupan rymmer så många kakor
  // skattningen (steg 10.10.20)
  skattaMin: 2, // minuter det tar att skatta kupan
  gissa: 1, // så många kakor lämnar den som skattar åt bina när hen inte kan Vinterhonungen ...
  kan: 0.3, // ... och den som kan den (minst så här mycket, steg 10.10.21) ...
  vinter: 3, // ... lämnar så många, som räcker över en vanlig vinter men inte alltid en hård
  vaxPer: 2, // varannan skattad kaka ger ett bivax (räknat på kupan)
  ovning: 0.03, // så mycket övar skattningen djurskötseln (som klippningen och mjölkningen)
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
// vildbinas del av tillgången på svärmar vid (x, y): lagret inom BIN.svarmR rutor delat med BIN.svarmFullt
export function vildSvarm(s: State, x: number, y: number) {
  const r = BIN.svarmR; let n = 0;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r && inMap(x + dx, y + dy)) n += fyndAt(s, 'honung', (y + dy) * W + x + dx);
  return n / BIN.svarmFullt;
}
// samhällena som kan svärma till (x, y) (steg 10.10.19): minst BIN.svarmVid kakor och inom BIN.svarmR rutor
export const starkaNara = (s: State, x: number, y: number) => samhallen(s).filter(t => t.bi! >= BIN.svarmVid && Math.hypot(t.x - x, t.y - y) <= BIN.svarmR);
// tillgången på svärmar vid (x, y), högst 1: vildbinas del och BIN.kupSvarm för varje starkt samhälle inom räckhåll
export const svarmTillgang = (s: State, x: number, y: number) => Math.min(1, vildSvarm(s, x, y) + BIN.kupSvarm * starkaNara(s, x, y).length);
// binas år (steg 10.10.18): samhället samlar honung efter draget och äter hela tiden, mer i en hård vinter. Kupan rymmer
// BIN.rymmer kakor, och decimalerna är arbetet mot nästa kaka. När honungen är slut dör samhället och kupan står tom
function binasAr(s: State, dt: number) {
  const h = dt / HOUR_S, at = BIN.aterTim * (1 + BIN.hardVinter * hardVinter(s)) * h;
  for (const t of samhallen(s)) {
    t.bi = Math.min(BIN.rymmer, t.bi! + BIN.honungTim * dragDelat(s, t.x, t.y, t) * h - at);
    if (t.bi > 1e-9) continue;
    t.bi = undefined; count(s, 'bidod');
    // Vinterhonungen (steg 10.10.21): ägaren och den som skattade sist förstår att bina behövde honungen
    for (const q of new Set([t.ag, t.skattare].map(id => id !== undefined ? byId(s, id) : undefined))) {
      if (!q || !alive(q) || kn(q, 'vinterhonung') >= 1) continue;
      learnK(q, 'vinterhonung', 1, s.now); count(s, 'larVinterhonung');
      log(s, `${q.name} förstod att bina behöver honung kvar över istiden.`, 'world', [q.id]);
    }
    log(s, 'Bisamhället i en av kuporna dog när honungen tog slut. Kupan står tom.', 'world', t.ag !== undefined ? [t.ag] : []);
    notis(s, 'bin', 'Ett bisamhälle dog när honungen tog slut, och kupan står tom tills en ny svärm flyttar in.', t.ag !== undefined ? [t.ag] : [], { x: t.x + 0.5, y: t.y + 0.5 });
  }
}
// binas takt (en rad i TAKTER, var fjärde timme): på sommaren kan en svärm flytta in i en tom kupa, räknat per tid
export function binSteg(s: State, dt: number) {
  binasAr(s, dt);
  for (const t of samhallen(s)) { const q = t.ag !== undefined ? byId(s, t.ag) : undefined; if (q && alive(q)) useK(q, 'vinterhonung', s.now); } // den som äger ett levande samhälle glömmer inte Vinterhonungen
  if (kalender(s).ai !== SOMMAR) return;
  for (const t of kupor(s)) {
    if (t.bi !== undefined) continue;
    const vild = vildSvarm(s, t.x, t.y), starka = starkaNara(s, t.x, t.y), kup = BIN.kupSvarm * starka.length, till = Math.min(1, vild + kup);
    if (till <= 0 || !chance(s, BIN.svarmTim * till / HOUR_S, dt, 'bin')) continue;
    // varifrån svärmen kom: vildbina eller ett av de starka samhällena, efter deras del av tillgången
    const u = rnd(s, 'bin') * (vild + kup), fran = u < vild ? undefined : starka[Math.min(starka.length - 1, Math.floor((u - vild) / BIN.kupSvarm))];
    if (fran) { fran.bi! -= BIN.svarmHonung; count(s, 'bisvarmKupa'); }
    t.bi = BIN.svarmHonung; count(s, 'bisvarm');
    log(s, fran ? 'En svärm lämnade en full bikupa och flyttade in i en tom.' : 'En svärm bin flyttade in i en tom bikupa.', 'world', t.ag !== undefined ? [t.ag] : []);
    if (forstaGang(s, 'forstaBisamhalle')) notis(s, 'bin', 'En svärm bin har flyttat in i en av byns kupor. Byn har fått sitt första bisamhälle.', t.ag !== undefined ? [t.ag] : [], { x: t.x + 0.5, y: t.y + 0.5 });
  }
}

// ---------- skattningen (steg 10.10.20, Djuren i detalj: Skattningen) ----------
// de hela kakor den som skattar kan ta ur kupan: det som ligger över det hen lämnar åt bina
// hur mycket p lämnar åt bina: en kaka, eller BIN.vinter för den som kan Vinterhonungen (steg 10.10.21)
export const lamnar = (p: Person) => kn(p, 'vinterhonung') >= BIN.kan ? BIN.vinter : BIN.gissa;
export const attTa = (t: Station, p: Person) => t.bi === undefined ? 0 : Math.max(0, Math.floor(t.bi - lamnar(p) + 1e-9));
// ägaren skattar den av sina kupor där det finns mest att ta (en kupa utan ägare skattas av vem som helst), och två tar aldrig
// samma kupa. Ingen regel säger när på året: på våren finns inget över, och överskottet kommer på sommaren
export function skattaVal(s: State, p: Person) {
  if (ageOf(p, s.now) < ALDER.vuxen || !isLight(s.now) || capacity(s, p) < viktOf('honung')) return undefined;
  let b: Station | undefined, bn = 0, bd = Infinity;
  for (const t of samhallen(s)) {
    if (t.ag !== undefined && t.ag !== p.id) continue;
    const n = attTa(t, p), d = Math.hypot(t.x - p.x, t.y - p.y);
    if (n < 1 || n < bn || (n === bn && d >= bd)) continue;
    if (living(s).some(q => q !== p && q.task?.act === 'skatta' && q.task.ref === t.id)) continue;
    b = t; bn = n; bd = d;
  }
  return b;
}
// hen tar så många hela kakor hen kan bära; varannan skattad kaka ger ett bivax av de tomma vaxkakor som skärs bort.
// Honungen och vaxet är ägarens, och arbetet övar djurskötseln
export function skattaKlar(s: State, p: Person, ref?: number) {
  const t = kupor(s).find(q => q.id === ref);
  if (!t) return;
  const n = Math.min(attTa(t, p), Math.floor(capacity(s, p) / viktOf('honung') + 1e-9));
  if (n < 1) return;
  const ag = t.ag ?? p.id;
  t.bi! -= n; put(s, 'honung', n, { [ag]: n }); t.skattare = p.id; useK(p, 'vinterhonung', s.now);
  t.skattat = (t.skattat ?? 0) + n;
  const vax = Math.floor(t.skattat / BIN.vaxPer);
  if (vax > 0) { t.skattat -= vax * BIN.vaxPer; put(s, 'bivax', vax, { [ag]: vax }); count(s, 'bivax', vax); }
  ovning(p, 'skotsel', BIN.ovning); gjort(s, p, 'skattat'); count(s, 'honungKupa', n);
  if (forstaGang(s, 'forstaSkattning')) log(s, `${p.name} skattade byns första bikupa och fick ${n} honungskakor.`, 'world', [p.id]);
}
