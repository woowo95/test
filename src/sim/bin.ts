import { antal, spelTid } from './ord';
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
import { fyndAt, vildboKrok } from './fynd';
import { H, HOUR_S, MIN, State, W, inMap } from './typer';
import { Station, isKlar, stationerOf } from './stationer';
import { antalPa, chance, rnd } from './slump';
import { count, forstaGang, log } from './folk';
import { notis } from './notiser';
import { hardVinter } from './vader';
import { ALDER, ageOf, alive, byId, gjort, living, ovning } from './folk';
import { kn, learnK, useK } from './kunskap';
import { isLight } from './tid';
import { capacity, put } from './lager';
import { viktOf } from './saker';
import { wearUsed } from './redskap';
import type { Person } from './typer';
import { blocked } from './byggnad';
import { SKADOR, kanGa, retadStick } from './halsa';
import { avbryt } from './lager';
import { kartStrider } from './kartstrid';
import { tamArt, tamDor, tamEg, tamdjurOf } from './tamdjur';
import { FAROR } from './efterstrid';

export const BIN = balans('bin', {
  r: 10, // bina flyger så här många rutor från samhället
  pollen: 0.2, // grödorna som blommar för bina ger så här mycket mer i skörd när ett samhälle når fältrutan (steg 10.10.25)
  dragFullt: 20, // så mycket som blommar inom räckhåll ger draget 1
  torka: 0.6, // i torkan blommar buskar och grödor så här mycket (ängsblommorna har lagrets egen torka)
  // vildbina (steg 10.10.15)
  dragNog: 0.6, // byn vill ha en bikupa till där draget är minst så här stort (steg 10.10.16)
  boSyns: 0.6, // boet syns där vildbinas lager är minst så här rikt och ett vuxet träd står
  vildTim: 6, // så många honungskakor i timmen tar den som samlar intill ett rikt bo: en tur till boet är ett arbete på 3–10 minuter och ger hela kakor
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
  // bisticken (steg 10.10.22, halsa.ts binStick)
  stick: 8, // stick i timmen för den ovana vid en full kupa (ungefär ett på var fjärde skattning)
  vildStick: 2, // vid ett vildbo så här många gånger fler
  rok: 0.3, // med en fackla som ryker blir så här mycket av risken kvar
  kladSkydd: 0.8, // kläderna tar bort upp till så här mycket av sticken (gånger plaggens värme)
  smarta: 0.04, // så ont gör ett stick
  giftYr: 30, // från så många stick sjunker medvetandet hos en vuxen ...
  giftDod: 120, // ... och vid så många dör man
  barnTal: 0.5, // ett barn tål så här stor del
  // det uppretade boet (steg 10.10.27, registret RETAR)
  retas: 1, // arbetet vid ett fullt bo retar upp det så här många gånger i timmen för den ovana utan rök
  fallRetas: 1, // chansen att boet retas när trädet med vildboet fälls
  kupaRetas: 1, // chansen att boet retas när kupan välts, rivs eller blåser sönder
  stridRetas: 6, // en strid intill boet retar upp det så här många gånger i timmen
  retadR: 3, // det uppretade boet sticker alla inom så här många rutor
  retadStick: 10, // stick i minuten och kropp vid ett fullt uppretat bo (färre vid ett litet)
  retadTid: 10, // minuter som boet är uppretat innan det lugnar sig
  undan: 4, // den som flyr går så här många rutor bortom BIN.retadR
});

// en dragkälla: vad den ger på varje ruta i rutan x0–x1, y0–y1 (add med rutans index och värdet), i tidsåldern ai, med eller
// utan torka. ikon = symbolen i kupans ruta. Summan inom räckhåll av en plats räknas ur rutorna (dragDelar och dragSok)
export type DragRuta = { x0: number; y0: number; x1: number; y1: number };
export interface DragKalla { namn: string; ikon: string; rutor: (s: State, ai: number, torr: boolean, r: DragRuta, add: (i: number, v: number) => void) => void }
const iRutan = (r: DragRuta, fn: (i: number) => void) => { for (let y = Math.max(0, r.y0); y <= Math.min(H - 1, r.y1); y++) for (let x = Math.max(0, r.x0); x <= Math.min(W - 1, r.x1); x++) fn(y * W + x); };
// bärbuskarna blommar mest på våren
const BUSK_ARSTID = [0, 0.5, 0.25, 0];
export const DRAGKALLOR: Record<string, DragKalla> = {
  // ängsblommorna: värmekartans lager, 1 per full ruta, med lagrets egen årstid och torka
  blomma: { namn: 'Ängsblommor', ikon: 'blomma', rutor: (s, _ai, _torr, r, add) => iRutan(r, i => { const n = fyndAt(s, 'blomma', i); if (n) add(i, n); }) },
  // bärbuskarna: 0,5 per buske på våren och 0,25 på sommaren
  barbuske: { namn: 'Bärbuskar', ikon: 'bar', rutor: (s, ai, torr, r, add) => {
    const b = groundOf(s).buske, v = BUSK_ARSTID[ai] * (torr ? BIN.torka : 1);
    if (b && v) iRutan(r, i => { if (b[i] === BUSKE + BARBUSKE) add(i, v); });
  } },
  // fältrutorna som växer eller är mogna med en gröda som har ett dragtal (drag på grödans rad i GRODOR), på våren och sommaren
  grodor: { namn: 'Grödor', ikon: 'bonor', rutor: (s, ai, torr, r, add) => {
    if (ai !== VAR && ai !== SOMMAR) return;
    for (const f of faltOf(s)) rutorAv(f).forEach((q, k) => {
      const d = q.g && (GRODOR[q.g as GrodaSlag] as { drag?: number }).drag;
      if (!d || (q.st !== 'vaxer' && q.st !== 'mogen')) return;
      const i = faltRuta(f, k), x = i % W, y = Math.floor(i / W);
      if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) add(i, d * (torr ? BIN.torka : 1));
    });
  } },
};
export const DRAG_LIST = Object.keys(DRAGKALLOR);
// något blommar: draget är noll på hösten och i istiden
export const blommar = (s: State) => { const ai = kalender(s).ai; return ai !== HOST && ai !== ISTID; };
// halva bredden av cirkeln med radien BIN.r på varje rad dy (-r … r): rutorna med dx² + dy² ≤ r²
const halvBredd = () => Array.from({ length: 2 * BIN.r + 1 }, (_, j) => Math.floor(Math.sqrt(BIN.r * BIN.r - (j - BIN.r) ** 2) + 1e-9));
// källan k:s summa inom räckhåll av (x, y) i tidsåldern ai, med eller utan torka
export function dragSumma(s: State, k: string, x: number, y: number, ai: number, torr: boolean) {
  const cx = Math.floor(x), cy = Math.floor(y), r = BIN.r, hw = halvBredd();
  let n = 0;
  DRAGKALLOR[k].rutor(s, ai, torr, { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r }, (i, v) => { if (Math.abs(i % W - cx) <= hw[Math.floor(i / W) - cy + r]) n += v; });
  return n;
}
// varje källas del av det som blommar inom räckhåll av (x, y) just nu
export function dragDelar(s: State, x: number, y: number): Record<string, number> {
  const ai = kalender(s).ai, ut: Record<string, number> = {};
  const torr = ai === HOST || ai === ISTID ? false : torkaNu(s);
  for (const k of DRAG_LIST) ut[k] = ai === HOST || ai === ISTID ? 0 : dragSumma(s, k, x, y, ai, torr);
  return ut;
}
// draget på många platser i samma sökning (bikupans plats, sokUtkant i stationer.ts): rutornas värde räknas en gång för hela
// kartan (eller rutan där platserna prövas, ruta, och BIN.r runt om), och summan inom räckhåll av en plats tas ur radernas
// löpande summor. Svaret är dragDelat(s, x, y)
export function dragSok(s: State, ruta: DragRuta = { x0: 0, y0: 0, x1: W - 1, y1: H - 1 }): (x: number, y: number) => number {
  const ai = kalender(s).ai;
  if (ai === HOST || ai === ISTID) return () => 0;
  const torr = torkaNu(s), v = new Float64Array(W * H), r = BIN.r, hw = halvBredd(), sam = samhallen(s);
  for (const k of DRAG_LIST) DRAGKALLOR[k].rutor(s, ai, torr, { x0: ruta.x0 - r, y0: ruta.y0 - r, x1: ruta.x1 + r, y1: ruta.y1 + r }, (i, n) => { v[i] += n; });
  const P = new Float64Array((W + 1) * H); // P[y·(W+1) + x] = summan av rad y till vänster om x
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) P[y * (W + 1) + x + 1] = P[y * (W + 1) + x] + v[y * W + x];
  return (x, y) => {
    const cx = Math.floor(x), cy = Math.floor(y);
    let n = 0;
    for (let dy = -r; dy <= r; dy++) {
      const yy = cy + dy, a = Math.max(0, cx - hw[dy + r]), b = Math.min(W - 1, cx + hw[dy + r]);
      if (yy >= 0 && yy < H && a <= b) n += P[yy * (W + 1) + b + 1] - P[yy * (W + 1) + a];
    }
    return Math.min(1, n / BIN.dragFullt) / (1 + sam.filter(t => Math.hypot(t.x - x, t.y - y) <= BIN.r).length);
  };
}
// draget på (x, y): summan delad med BIN.dragFullt, högst 1
// vildboet syns på ruta i (steg 10.10.15): på sommaren och hösten, där vildbinas lager är rikt och ett vuxet träd står
vildboKrok.syns = () => BIN.boSyns; // honungen finns bara i ett bo (fynd.ts)
export const vildboSyns = (s: State, i: number) => { const ai = kalender(s).ai; return (ai === SOMMAR || ai === HOST) && groundOf(s).trees[i] >= FOREST && fyndAt(s, 'honung', i) >= BIN.boSyns; };
export const drag = (s: State, x: number, y: number) => Math.min(1, Object.values(dragDelar(s, x, y)).reduce((a, b) => a + b, 0) / BIN.dragFullt);


// ---------- kuporna och svärmen (steg 10.10.17, Djuren i detalj: Svärmen) ----------
// de färdiga kuporna, och de som har ett bisamhälle (honungen i kupan, t.bi)
export const kupor = (s: State) => stationerOf(s).filter(t => t.k === 'bikupa' && isKlar(t));
export const samhallen = (s: State) => kupor(s).filter(t => t.bi !== undefined);
// pollineringen (steg 10.10.25): ett levande samhälle inom BIN.r rutor från rutan i (vildbina räknas inte)
export const pollinerad = (s: State, i: number) => { const x = i % W + 0.5, y = Math.floor(i / W) + 0.5; return samhallen(s).some(t => (t.bi ?? 0) > 0 && Math.hypot(t.x + 0.5 - x, t.y + 0.5 - y) <= BIN.r); };
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
  if (p.task?.tool === 'fackla') wearUsed(s, p, 1); // facklan slits som andra redskap
  ovning(p, 'skotsel', BIN.ovning); gjort(s, p, 'skattat'); count(s, 'honungKupa', n);
  if (forstaGang(s, 'forstaSkattning')) log(s, `${p.name} skattade byns första bikupa och fick ${antal(n, 'honung')}.`, 'world', [p.id]);
}

// ---------- det uppretade boet (steg 10.10.27, Djuren i detalj: Det uppretade boet) ----------
// Det som retar upp ett bo är rader i registret RETAR, var och en med sin chans: perTim = chansen räknas per tid (gånger
// timmarna), annars en gång när det händer. Det uppretade boet (s.retade) sticker alla inom BIN.retadR rutor, människor och
// djur, i BIN.retadTid minuter och lugnar sig sedan. Människorna och djuren flyr ifrån det, och den som inte kan fly ligger kvar
export interface RetaDef { namn: string; chans: number; perTim?: true }
export const RETAR: Record<string, RetaDef> = {
  arbete: { namn: 'arbetet vid boet', get chans() { return BIN.retas; }, perTim: true }, // skattningen och den som tar honung ur ett vildbo (halsa.ts binStick)
  fall: { namn: 'trädet som fälldes', get chans() { return BIN.fallRetas; } }, // skog.ts fellTree
  kupa: { namn: 'kupan som välts eller revs', get chans() { return BIN.kupaRetas; } }, // stationer.ts taBort
  strid: { namn: 'striden intill boet', get chans() { return BIN.stridRetas; }, perTim: true }, // retadeSteg
};
export interface Retat { x: number; y: number; slut: number; st: number; kupa?: number }
export const retadeOf = (s: State) => s.retade ?? [];
// boets storlek: kupans honung mot BIN.rymmer, vildbinas lager på rutan
function boStorlek(s: State, x: number, y: number, kupa?: number) {
  if (kupa !== undefined) { const t = kupor(s).find(q => q.id === kupa); return t?.bi ? Math.min(1, t.bi / BIN.rymmer) : 0; }
  return Math.min(1, fyndAt(s, 'honung', Math.floor(y) * W + Math.floor(x)));
}
// raden orsak kan reta upp boet på (x, y): dtSec = tiden (redan gånger det som höjer och sänker chansen) för en rad per tid.
// st = boets storlek när kupan redan är borta. Ett bo som redan är uppretat förblir det BIN.retadTid minuter från nu
export function retaBo(s: State, orsak: keyof typeof RETAR, x: number, y: number, dtSec = 0, kupa?: number, st?: number) {
  const rad = RETAR[orsak], storlek = st ?? boStorlek(s, x, y, kupa);
  if (storlek <= 0) return false;
  if (rad.perTim ? !chance(s, rad.chans / HOUR_S, dtSec, 'bin') : rnd(s, 'bin') >= rad.chans) return false;
  const slut = s.now + BIN.retadTid * MIN, f = retadeOf(s).find(r => Math.hypot(r.x - x, r.y - y) < 1);
  if (f) { f.slut = slut; return true; }
  (s.retade ??= []).push({ x, y, slut, st: storlek, kupa });
  count(s, 'boRetat'); count(s, 'boRetat ' + orsak);
  const nara = living(s).filter(p => Math.hypot(p.x - x, p.y - y) <= BIN.retadR + 1).map(p => p.id);
  log(s, `Bina blev uppretade av ${rad.namn} och sticker alla som kommer nära.`, 'world', nara);
  notis(s, 'retat', `Bina i ${kupa !== undefined || orsak === 'kupa' ? 'en bikupa' : 'ett vildbo'} blev uppretade av ${rad.namn}. De sticker alla som kommer nära under ${spelTid(BIN.retadTid * MIN)}.`, nara, { x, y });
  return true;
}
// närmaste uppretade bo inom räckhåll r från (x, y)
export function retatNara(s: State, x: number, y: number, r = BIN.retadR + 1) {
  let b: Retat | undefined, bd = r;
  for (const q of retadeOf(s)) { const d = Math.hypot(q.x - x, q.y - y); if (d <= bd) { b = q; bd = d; } }
  return b;
}
// platsen dit p flyr från boet b: BIN.retadR + BIN.undan rutor bort, rakt ifrån boet eller åt sidan om det är vatten eller vägg
export function flyFranBin(s: State, p: Person, b: Retat) {
  const dx = p.x - b.x, dy = p.y - b.y, l = Math.hypot(dx, dy), u = (p.id * 2.399) % (2 * Math.PI);
  const ux = l > 0.1 ? dx / l : Math.cos(u), uy = l > 0.1 ? dy / l : Math.sin(u), R = BIN.retadR + BIN.undan;
  for (const v of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) {
    const c = Math.cos(v), sn = Math.sin(v), x = b.x + (ux * c - uy * sn) * R, y = b.y + (ux * sn + uy * c) * R;
    if (inMap(Math.floor(x), Math.floor(y)) && !blocked(s, x, y)) return { x, y };
  }
  return { x: p.x, y: p.y };
}
// stick i timmen vid boet b (gånger storleken)
const perTim = (b: Retat) => BIN.retadStick * 60 * b.st;
// det uppretade boets takt (en rad i TAKTER, varje slag): strider intill ett bo retar upp det, och det uppretade boet sticker
// människor och djur inom BIN.retadR rutor efter tiden sedan sist. Efter BIN.retadTid lugnar det sig
export function retadeSteg(s: State, dt: number) {
  for (const g of kartStrider(s)) for (const k of g.st.kampar) {
    if (k.lage !== 'strid') continue;
    for (const t of samhallen(s)) if ((t.bi ?? 0) > 0 && Math.hypot(t.x + 0.5 - k.x, t.y + 0.5 - k.y) <= BIN.retadR) retaBo(s, 'strid', t.x + 0.5, t.y + 0.5, dt, t.id);
    const cx = Math.floor(k.x), cy = Math.floor(k.y), r = BIN.retadR;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx, y = cy + dy;
      if (dx * dx + dy * dy <= r * r && inMap(x, y) && vildboSyns(s, y * W + x)) retaBo(s, 'strid', x + 0.5, y + 0.5, dt);
    }
  }
  if (!s.retade?.length) return;
  for (const b of s.retade) {
    for (const p of living(s)) if (Math.hypot(p.x - b.x, p.y - b.y) <= BIN.retadR) {
      retadStick(s, p, dt, perTim(b));
      if (kanGa(p) && p.task?.act !== 'flyBin') avbryt(s, p); // den som kan går undan (valet av aktivitet, raden binFly)
    }
    for (const d of tamdjurOf(s)) {
      const dx = d.x - b.x, dy = d.y - b.y, l = Math.hypot(dx, dy);
      if (l > BIN.retadR) continue;
      const a = tamArt(d.art), n = antalPa(s, perTim(b) * (a.pals ?? 1) * dt / HOUR_S, 'bin');
      if (n > 0) { const g = d.bistick ?? { n: 0, g: 1 }; d.bistick = { n: g.n * g.g + n, g: 1 }; count(s, 'bistickDjur', n); }
      if (d.bistick && d.bistick.n * d.bistick.g >= BIN.giftDod * a.ater * tamEg(d).talighet) tamDor(s, d, 'av bistick'); // djuret springer undan efter sitt mod (djurflykt.ts)
    }
  }
  const kvar = s.retade.filter(b => s.now < b.slut);
  if (kvar.length < s.retade.length) log(s, 'De uppretade bina lugnade sig.', 'world');
  if (kvar.length) s.retade = kvar; else delete s.retade;
}
// djurens stick läker på samma tid som människans (SKADOR.bistick.lakTim): en rad i TAKTER var tionde minut
export function djurStickSteg(s: State, dt: number) {
  for (const d of tamdjurOf(s)) if (d.bistick) { d.bistick.g -= dt / HOUR_S / SKADOR.bistick.lakTim; if (d.bistick.g <= 0) d.bistick = undefined; }
}
// den som dött av bistick får en notis
export function binDod(s: State, p: Person) { notis(s, 'retat', `${p.name} dog av bistick.`, [p.id], { x: p.x, y: p.y }); }
FAROR.push(s => !!s.retade?.length); // korta slag medan bina sticker
