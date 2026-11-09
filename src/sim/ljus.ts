// Ljuset och mörkret (steg 6.3.4). Ljuskällorna är rader i registret LJUSKALLOR: hur långt de lyser och var de finns just nu
// (kallor). Spelet frågar hur ljust det är på en ruta (ljusAt) som det frågar om värmen (heatAt i eld.ts). En eld som brinner
// lyser upp sin omgivning, och en eld inne lyser upp hela rummet. Glöden lyser inte. Facklan, de uppsatta facklorna och
// talgljusen blir rader här (steg 6.3.6–6.3.8).
// Mörkret: den som är vaken i totalmörker (natt, lightLevel 0, och inget ljus på rutan) går och arbetar MORKER.fart gånger
// så fort (gången i walk och arbetet i arbetsTakt, steg.ts) och får lite sämre humör (morkT; HUMOR.morkMinus i moodOf, humor.ts). Den som
// sover eller vilar bryr sig inte. Ljus är neutralt för humöret
import { balans } from './balans';
import { BRAND, brandLjus } from './brand';
import { eldXY, eldarOf, fireHeat } from './eld';
import { roomAt } from './byggnad';
import { ACTS } from './handlingar';
import { lightLevel } from './tid';
import { HOUR, Person, State, TalgLjus, Task, Uppsatt, W } from './typer';
import { isKlar, ledig, stationById, stationerOf } from './stationer';
import { omrade } from './omrade';
import { tileOf } from './mark';
import { isWall } from './byggnad';
import { Ting, tingOf } from './agande';
import { byId, alive, count, forstaGang, living, log } from './folk';

export const MORKER = balans('morker', {
  fart: 0.6, // den som är vaken i totalmörker går och arbetar så här fort
  eldR: 6, // en eld som brinner för fullt lyser så här många rutor bort ...
  eldMin: 0.5, // ... och en liten eld så här stor del av det
});
// facklan (steg 6.3.6)
export const FACKLA = balans('fackla', {
  brinnTim: 5, // en fackla brinner så här många timmar innan den brunnit ut
  r: 4, // ... och lyser så här många rutor bort
});

// de uppsatta facklorna (steg 6.3.7)
export const UPPSATT = balans('uppsatt', {
  trosk: 1.5, // en plats där folk varit vakna i mörker så här många timmar (som avtar) blir ett behov att sätta upp en fackla
  avta: 0.99, // ... och timmarna avtar så här mycket varje timme (hälften på knappt tre dygn)
  nara: 1, // facklan tänds när någon vaken är inom dess ljus och så här många rutor till, eller ska dit
  min: 20, // minuter att sätta upp en
  byPer: 0.5, // byn vill ha ljus över hela byn (steg 9.2.11): upp till så här många uppsatta facklor per invånare, där byn är mörk
});

// en ljuskälla just nu: platsen (rutans mitt), hur långt den lyser och rummet den lyser upp (en eld inne)
export interface Ljuspunkt { x: number; y: number; r: number; rum?: unknown; bar?: number } // bar = den som bär ljuset (en fackla)
interface Ljuskalla { namn: string; kallor(s: State): Ljuspunkt[] }
export const LJUSKALLOR = {
  eld: { namn: 'Elden', kallor: s => {
    const ut: Ljuspunkt[] = [];
    for (const f of eldarOf(s)) {
      const I = fireHeat(s, f);
      if (!I) continue;
      const e = eldXY(s, f);
      ut.push({ x: e.x + 0.5, y: e.y + 0.5, r: MORKER.eldR * (MORKER.eldMin + (1 - MORKER.eldMin) * I), rum: roomAt(s, e.x, e.y) });
    }
    return ut;
  } },
  fackla: { namn: 'Facklan', kallor: s => {
    const ut: Ljuspunkt[] = [];
    for (const t of tingOf(s)) { if (t.tand === undefined) continue; const p = byId(s, t.tand); if (p) ut.push({ x: p.x, y: p.y, r: FACKLA.r, bar: p.id }); }
    return ut;
  } },
  ljus: { namn: 'Talgljusen', kallor: s => (s.ljus ?? []).filter(l => l.tand).flatMap(l => { const st = stationById(s, l.st); return st ? [{ x: st.x + 0.5, y: st.y + 0.5, r: LJUS.r, rum: roomAt(s, st.x, st.y) }] : []; }) },
  // branden lyser (steg 9.2.20): rutorna i brandens kant, som ljus för dem som släcker eller arbetar och på kartan
  brand: { namn: 'Branden', kallor: s => brandLjus(s).map(i => ({ x: i % W + 0.5, y: Math.floor(i / W) + 0.5, r: BRAND.ljusR })) },
  uppsatt: { namn: 'Uppsatta facklor', kallor: s => (s.uppsatta ?? []).filter(u => u.tand).map(u => ({ x: u.x + 0.5, y: u.y + 0.5, r: FACKLA.r, rum: roomAt(s, u.x, u.y) })) }, // inne lyser den upp rummet (steg 9.2.11)
} satisfies Record<string, Ljuskalla>;
const KALLOR = Object.values(LJUSKALLOR) as Ljuskalla[];

// hur ljust det är på platsen från ljuskällorna (0–1; dagsljuset räknas inte). utan = den vars egen fackla inte räknas
export function ljusAt(s: State, x: number, y: number, utan?: number) {
  let v = 0, rum: unknown;
  for (const k of KALLOR) for (const l of k.kallor(s)) {
    if (utan !== undefined && l.bar === utan) continue;
    if (l.rum) { rum ??= roomAt(s, Math.floor(x), Math.floor(y)) ?? null; if (rum === l.rum) return 1; }
    const d = Math.hypot(x - l.x, y - l.y);
    if (d < l.r) v = Math.max(v, 1 - d / l.r);
  }
  return v;
}
// totalmörker på platsen: natt och inget ljus där
export const iMorker = (s: State, x: number, y: number) => lightLevel(s.now) <= 0 && ljusAt(s, x, y) <= 0;
// gången och arbetet gånger detta
export const morkFart = (s: State, p: Person) => iMorker(s, p.x, p.y) ? MORKER.fart : 1;
// en gång i timmen (steg.ts): den som är vaken i mörkret får lite sämre humör en stund
export function morkHumor(s: State, p: Person) {
  if (p.task && ACTS[p.task.act]?.vila) return;
  if (!iMorker(s, p.x, p.y)) return;
  p.morkT = s.now;
  const m = (s.morkPlats ??= {}), i = tileOf(p.x, p.y); m[i] = (m[i] ?? 0) + 1; // var folk är vakna i mörker (steg 6.3.7)
}

// ---------- facklan (steg 6.3.6) ----------
// Facklan är ett redskap (saker.ts) som görs av en gren, ett torrgräs och en talg. Den som går ut i mörkret utanför ljuset
// (till latrinen, vakten, den som arbetar ute på natten) tänder en vid elden när hen väljer vad hen ska göra, om byn har en
// fackla och en eld brinner. Hen bär den i en hand (Ting.tand) och den lyser där hen går (raden fackla i LJUSKALLOR). Den slits
// medan den brinner och är borta när den brunnit FACKLA.brinnTim timmar. Den som inte behöver ljuset längre (nästa uppgift är
// inne, i ljuset eller i sömnen, eller dagen har kommit) släcker den, och tänder den igen nästa gång
export const facklaHos = (s: State, p: Person) => tingOf(s).find(t => t.k === 'fackla' && t.tand === p.id);
// det som brunnit sedan förra gången räknas av; true = den brann ut
function brinn(s: State, t: Ting) {
  t.c -= (s.now - (t.tandT ?? s.now)) / (FACKLA.brinnTim * HOUR); t.tandT = s.now;
  if (t.c > 1e-9) return false;
  s.ting = tingOf(s).filter(x => x !== t); count(s, 'facklorBrunna');
  return true;
}
function slack(s: State, t: Ting) { if (!brinn(s, t)) { t.tand = undefined; t.tandT = undefined; } }
// p behöver ljus för det hen ska göra: natt, vaken, ute och mörkt där hen är eller dit hen går (utan sin egen fackla)
function behoverLjus(s: State, p: Person) {
  const tk = p.task;
  if (!tk || ACTS[tk.act]?.vila || lightLevel(s.now) > 0) return false;
  if (roomAt(s, Math.floor(tk.tx), Math.floor(tk.ty))) return false; // facklan används bara ute
  return ljusAt(s, tk.tx, tk.ty, p.id) <= 0 || ljusAt(s, p.x, p.y, p.id) <= 0;
}
// när p valt vad hen ska göra (chooseTask i val.ts): facklan tänds eller släcks
export function facklaVal(s: State, p: Person) {
  if (p.task && !ACTS[p.task.act]?.vila) {
    for (const u of s.uppsatta ?? []) if (nara(u, p.task.tx, p.task.ty) || nara(u, p.x, p.y)) tand(s, u); // de uppsatta dit hen går
    for (const l of s.ljus ?? []) if (iRummet(s, l, p.task)) tand(s, l); // och ljuset i rummet dit hen går
  }
  const t = facklaHos(s, p), behov = behoverLjus(s, p);
  if (t) { if (!behov) slack(s, t); return; }
  if (!behov || !eldarOf(s).some(f => f.lit)) return;
  const fri = friFackla(s);
  if (!fri) return;
  fri.tand = p.id; fri.tandT = s.now; count(s, 'facklorTanda');
  if (forstaGang(s, 'facklaForsta')) log(s, `${p.name} tände en fackla vid elden och gick ut i mörkret.`, 'world', [p.id]);
}
// en gång i timmen (steg.ts): facklorna brinner, och den som inte längre lever, sover eller behöver ljuset släcker sin
export function facklorTimme(s: State) {
  uppsattaTimme(s); ljusTimme(s);
  for (const t of tingOf(s).slice()) {
    if (t.tand === undefined) continue;
    const p = byId(s, t.tand);
    if (!p || !alive(p) || !behoverLjus(s, p)) slack(s, t); else brinn(s, t);
  }
}

// ---------- de uppsatta facklorna (steg 6.3.7) ----------
// Byn räknar var folk är vakna i mörker ute (morkPlats, i morkHumor ovan), och timmarna avtar. Där det händer ofta (latrinen,
// husens dörrar, bänken på kvällen, stigen dit) blir det ett behov i projekten (raden uppsatt i PROJEKT, projekt.ts) att
// sätta upp en av byns facklor, på väggen om en vägg finns intill, annars i marken. Den tänds när det är mörkt och någon
// vaken är nära eller ska dit, brinner ner som den burna facklan och släcks när ingen vaken är kvar. När den brunnit ut
// blir platsen mörk igen, och byn sätter upp en ny
const nara = (u: Uppsatt, x: number, y: number) => Math.hypot(x - u.x - 0.5, y - u.y - 0.5) <= FACKLA.r + UPPSATT.nara;
function tand(s: State, u: Uppsatt | TalgLjus) {
  if (u.tand || lightLevel(s.now) > 0) return;
  u.tand = true; u.tandT = s.now; count(s, 'uppsattaTanda');
}
// det som brunnit sedan förra gången; true = den brann ut och är borta
function brinnUppsatt(s: State, u: Uppsatt) {
  u.c -= (s.now - (u.tandT ?? s.now)) / (FACKLA.brinnTim * HOUR); u.tandT = s.now;
  if (u.c > 1e-9) return false;
  s.uppsatta = (s.uppsatta ?? []).filter(x => x !== u); count(s, 'facklorBrunna');
  return true;
}
const vaken = (q: Person) => !(q.task && ACTS[q.task.act]?.vila);
function uppsattaTimme(s: State) {
  const m = s.morkPlats;
  if (m) for (const k in m) { m[k] *= UPPSATT.avta; if (m[k] < 0.05) delete m[k]; }
  for (const u of (s.uppsatta ?? []).slice()) {
    if (u.tand && brinnUppsatt(s, u)) continue;
    const behov = lightLevel(s.now) <= 0 && living(s).some(q => vaken(q) && (nara(u, q.x, q.y) || !!q.task && nara(u, q.task.tx, q.task.ty)));
    if (behov) tand(s, u); else if (u.tand) { u.tand = undefined; u.tandT = undefined; }
  }
}
// platsen där en fackla behövs mest: där folk varit vakna i mörker flest timmar (rutan och de fyra intill), minst UPPSATT.trosk,
// och inte inom en uppsatt fackla, ute eller inne (steg 9.2.11: inne sitter den på väggen). Finns ingen sådan plats vill byn
// ändå ha ljus över hela byn: den ruta i byns område som ligger längst från elden och de uppsatta facklorna, så länge byn har
// färre än UPPSATT.byPer facklor per invånare (byMorkt). undefined = ingen
export function morkStalle(s: State): { x: number; y: number } | undefined {
  const m = s.morkPlats;
  let bast: { x: number; y: number } | undefined, bv = UPPSATT.trosk - 1e-9;
  if (m) for (const k in m) {
    const i = +k, x = i % W, y = Math.floor(i / W);
    const v = m[i] + (m[i - 1] ?? 0) + (m[i + 1] ?? 0) + (m[i - W] ?? 0) + (m[i + W] ?? 0);
    if (v <= bv || (roomAt(s, x, y) && !vaggIntill(s, x, y)) || (s.uppsatta ?? []).some(u => Math.hypot(u.x - x, u.y - y) < FACKLA.r)) continue;
    bv = v; bast = { x, y };
  }
  return bast ?? byMorkt(s);
}
const vaggIntill = (s: State, x: number, y: number) => [[0, -1], [-1, 0], [1, 0], [0, 1]].some(([dx, dy]) => isWall(s, x + dx, y + dy));
// den mörkaste rutan i byns område (steg 9.2.11): längst från elden och de uppsatta facklorna, och längre än en facklas ljus
// från dem. Räknas en gång i timmen (ett behov i projekten frågas ofta)
const morktMinne = new WeakMap<State, { t: number; p: { x: number; y: number } | undefined }>();
function byMorkt(s: State) {
  const n = (s.uppsatta ?? []).length, folk = living(s).length;
  if (n >= Math.ceil(UPPSATT.byPer * folk)) return undefined;
  const t = Math.floor(s.now / HOUR), c = morktMinne.get(s);
  if (c && c.t === t) return c.p;
  const ljus = [...(s.uppsatta ?? []).map(u => ({ x: u.x, y: u.y })), ...eldarOf(s).map(f => eldXY(s, f))];
  const o = omrade(s);
  let p: { x: number; y: number } | undefined, bd = FACKLA.r * 1.5;
  for (let y = o.y0; y <= o.y1; y++) for (let x = o.x0; x <= o.x1; x++) {
    if (o.inne[y * W + x] !== 1) continue;
    const d = ljus.reduce((m, l) => Math.min(m, Math.hypot(l.x - x, l.y - y)), Infinity);
    if (d <= bd || (roomAt(s, x, y) ? !vaggIntill(s, x, y) : !ledig(s, x, y))) continue;
    bd = d; p = { x, y };
  }
  morktMinne.set(s, { t, p });
  return p;
}
// en fackla som ingen bär och som inte är påbörjad
export const friFackla = (s: State) => tingOf(s).find(x => x.k === 'fackla' && x.tand === undefined && x.hos === undefined && !x.halv);
// när arbetet är klart (KLAR.uppsatt i steg.ts): facklan sätts upp på rutan, på väggen om en vägg finns intill
export function finishUppsatt(s: State, p: Person, tk: { tx: number; ty: number }) {
  const t = friFackla(s), x = Math.floor(tk.tx), y = Math.floor(tk.ty);
  if (!t || (s.uppsatta ?? []).some(u => Math.hypot(u.x - x, u.y - y) < FACKLA.r)) return;
  s.ting = tingOf(s).filter(q => q !== t);
  const v = [[0, -1], [-1, 0], [1, 0], [0, 1]].find(([dx, dy]) => isWall(s, x + dx, y + dy));
  (s.uppsatta ??= []).push({ x, y, c: t.c, ...(v ? { vx: v[0], vy: v[1] } : {}) });
  count(s, 'facklorUppsatta'); morktMinne.delete(s);
  if (forstaGang(s, 'uppsattForsta')) log(s, `${p.name} satte upp en fackla ${v ? 'på väggen' : 'i marken'}, där byn ofta går i mörkret.`, 'world', [p.id]);
}

// ---------- talgljusen (steg 6.3.8) ----------
// Ett talgljus (saker.ts) görs av två talg och ett torrgräs som veke, och står inne på ett bord eller en hylla (s.ljus).
// Byn vill ha ett på varje bord och hylla i ett rum där folk varit vakna i mörker (ljusPlatser; REDSKAPMAL i forradsmal.ts
// och raden ljus i PROJEKT, projekt.ts). Det tänds när det är mörkt och någon vaken är i rummet eller ska dit, lyser upp hela
// rummet (raden ljus i LJUSKALLOR) och släcks när ingen vaken är kvar där. Det brinner LJUS.brinnTim timmar
export const LJUS = balans('talgljus', {
  brinnTim: 8, // ett talgljus brinner så här många timmar
  r: 2, // ... och lyser så här långt utanför rummet (inne lyser det upp hela rummet)
  min: 5, // minuter att ställa fram ett
});
const LJUSBORD = new Set(['bord', 'bord2', 'bord3', 'hylla']);
// borden och hyllorna inne, utan ett ljus, i rum där folk varit vakna i mörker minst UPPSATT.trosk timmar (som avtar)
export function ljusPlatser(s: State) {
  const m = s.morkPlats;
  if (!m) return [];
  const rum = new Map<number, number>();
  for (const k in m) { const i = +k, r = roomAt(s, i % W, Math.floor(i / W)); if (r) rum.set(r.id, (rum.get(r.id) ?? 0) + m[i]); }
  if (!rum.size) return [];
  const har = new Set((s.ljus ?? []).map(l => l.st));
  return stationerOf(s).filter(st => LJUSBORD.has(st.k) && isKlar(st) && !har.has(st.id) && (rum.get(roomAt(s, st.x, st.y)?.id ?? -1) ?? 0) >= UPPSATT.trosk);
}
export const friLjus = (s: State) => tingOf(s).find(x => x.k === 'talgljus' && x.hos === undefined && !x.halv);
// tk (någons uppgift eller plats) är i rummet där ljuset l står
function iRummet(s: State, l: TalgLjus, tk: { tx: number; ty: number }) {
  const st = stationById(s, l.st), r = st && roomAt(s, st.x, st.y);
  return !!r && roomAt(s, Math.floor(tk.tx), Math.floor(tk.ty)) === r;
}
function ljusTimme(s: State) {
  for (const l of (s.ljus ?? []).slice()) {
    if (!stationById(s, l.st)) { s.ljus = s.ljus!.filter(x => x !== l); continue; } // bordet är borta, och ljuset med det
    if (l.tand) {
      l.c -= (s.now - (l.tandT ?? s.now)) / (LJUS.brinnTim * HOUR); l.tandT = s.now;
      if (l.c <= 1e-9) { s.ljus = s.ljus!.filter(x => x !== l); count(s, 'ljusBrunna'); continue; }
    }
    const behov = lightLevel(s.now) <= 0 && living(s).some(q => vaken(q) && (iRummet(s, l, { tx: q.x, ty: q.y }) || !!q.task && iRummet(s, l, q.task)));
    if (behov) tand(s, l); else if (l.tand) { l.tand = undefined; l.tandT = undefined; }
  }
}
// när arbetet är klart (KLAR.ljus i steg.ts): ljuset ställs på bordet eller hyllan (task.ref)
export function finishLjus(s: State, p: Person, tk: Task) {
  const t = friLjus(s), st = tk.ref !== undefined ? stationById(s, tk.ref) : undefined;
  if (!t || !st || (s.ljus ?? []).some(l => l.st === st.id)) return;
  s.ting = tingOf(s).filter(q => q !== t);
  (s.ljus ??= []).push({ st: st.id, c: t.c });
  count(s, 'ljusFram');
  if (forstaGang(s, 'ljusForsta')) log(s, `${p.name} ställde ett talgljus på ${st.k === 'hylla' ? 'hyllan' : 'bordet'} inne. Där är det ljust på kvällen.`, 'world', [p.id]);
}
