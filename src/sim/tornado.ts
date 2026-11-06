import { balans } from './balans';
import { rasar } from './bygg';
import { MATERIAL, bitAt, blocked, roofed, touch, vagBort } from './byggnad';
import { alive, count, living, log } from './folk';
import { drabbadHus, upplev } from './uppvaxt';
import { kanGa, skada, Kroppsdel } from './halsa';
import { bynsMitt } from './omrade';
import { STRECK } from './karta';
import { avbryt, minska, nagotPa, stacksOf, tidy } from './lager';
import { die } from './liv';
import { groundOf } from './mark';
import { motgangNu, motgangTal } from './motgang';
import { larma, larmNu } from './rykten';
import { SAKER } from './saker';
import { nyStubbe, stamAv, stocks } from './skog';
import { forvarAt, stationAt, taBort } from './stationer';
import { eldXY, eldarOf } from './eld';
import { brinner, tand } from './brand';
import { vattenNu } from './sjo';
import { FOREST, isSoil } from './vag';
import { tingOf } from './agande';
import { FYND, UTTAG_IDS, takenOf } from './fynd';
import { faltTornado } from './odling';
import { bjornarOf, djurOf, dodaDjur, faglarOf, radjurOf } from './djur';
import { isLight } from './tid';
import { H, HOUR, MIN, SEC, Person, State, T, W, inMap } from './typer';
import { larmAvbryter } from './handlingar';

// Tornadon (steg 3.8.4, "Motgångarna i spelet" i designdokumentet): den enda stormen. En av motgångarna i registret
// MOTGANGAR (motgang.ts), på sommaren och hösten. Den kommer en gång under tidsåldern och är på kartan i 20–60 minuter (steg 6.4.8):
// den börjar vid kartans kant, går en ruta på 5 sekunder och svänger då och då, och den dras inte mot byn. När tiden är slut
// löses den upp, eller går ut ur kartan om den når kanten först. I sin väg fäller den träd (som blir liggande stammar och
// ger lätt trä), river väggar efter materialet (timmer håller bättre än ris: storm i MATERIAL, byggnad.ts) och lyfter
// saker ur förrådet, som hamnar utspridda runt banan; en del går sönder. Det som ligger i kistor och på hyllor, och under
// tak där väggarna håller, klarar sig. Folk ser den komma och ropar som vid vargen (larma i rykten.ts); de som är nära
// banan går undan (tornadoSkydd, i val.ts). Den som ändå är i vägen kan skadas. Efteråt bär invånarna in det som spridits
// (haulJob i lager.ts). När den kommer och hur länge den varar räknas ur tiden (tornadoTid); banan bestäms när den
// kommer och sparas i s.tornado, och allt den gör sker i stegen, så att det levande läget och ikappräkningen blir lika.

// Balanstal (regel 8)
export const TORNADO = balans('tornado', {
  borjar: [0.5, 5.5], // tornadon kommer så här många dygn (år i spelet) in i tidsåldern (slumpas mellan, hela timmar) ...
  min: [20, 60], // ... och är på kartan så här många minuter (spelets tid, slumpas mellan, hela minuter) om den inte går ut ur kartan först (steg 6.4.8)
  fart: 5, // den går en ruta på så här många sekunder (spelets tid)
  ben: [8, 30], // den går rakt så här många rutor (slumpas mellan) ...
  svang: [0.15, 0.7], // ... och svänger sedan så här mycket (radianer, slumpas mellan, åt vänster eller höger)
  in: 1, // den börjar vid kartans kant och går in mot kartan, högst så här många radianer från rakt in
  trad: 0.6, // nära (steg 6.4.10): chansen att ett vuxet träd fälls ...
  tradUtkant: 0.1, // ... och i utkanten (steg 6.4.11)
  stormTrad: 0.01, // stormen (steg 6.4.14): chansen att ett vuxet träd någonstans på kartan faller medan tornadon drar fram
  storm: [0.5, 1.5], // nära: en vägg förlorar så här mycket av sitt skick gånger materialets storm (slumpas mellan)
  trasig: 0.5, // nära: chansen att en dörr slits loss och att en station eller möbel går sönder
  djurNara: 0.5, // nära: chansen att ett djur dör
  sonder: 0.3, // nära: så stor del av det som lyfts går sönder (hela saker) ...
  sonderUtkant: 0.1, // ... och i utkanten
  flygNara: [5, 10], // nära: det som lyfts (saker, människor, glöden) hamnar så här många rutor bort (slumpas mellan) ...
  flygUtkant: [2, 4], // ... och i utkanten
  glod: 0.5, // nära: chansen att glöden från en eld som släcks tänder där den landar
  dodNara: 0.2, // nära: chansen att en människa som flyger dör direkt ...
  skadaNara: [0.6, 1], // ... annars skadas hen så här svårt (slumpas mellan)
  sikt: 25, // man ser den så här många rutor bort på dagen ...
  siktNatt: 0.4, // ... och så här stor del av det på natten
  fara: 6, // den som är så här nära banan som är kvar går undan ...
  undan: 5, // ... till så här många rutor längre bort från den
  skadas: 0.5, // i utkanten skadas den som flyger med den här chansen ...
  skadaGrad: [0.2, 0.5], // ... så här svårt (slumpas mellan)
  vind: 1, // det blåser så här mycket (0 till 1, vaderNu i vader.ts) medan den drar fram
});

// tornadons storlekar (steg 6.4.9 och 6.4.15), en rad var: hur stor del av tornadorna som har storleken, zonerna i
// hela rutor från mitten (kärnan förstör allt, nära ger stor skada och utkanten tar de vilda växterna, fälten och några
// träd), hur länge den är på kartan (gånger min i TORNADO) och hur många träd stormen fäller (gånger stormTrad)
export const TORNADOSTORLEKAR = {
  liten: { namn: 'liten', andel: 0.5, zon: [0, 2, 3], tid: 1, storm: 1 },
  medel: { namn: 'medel', andel: 0.4, zon: [1, 3, 6], tid: 1, storm: 1 },
  stor: { namn: 'stor', andel: 0.1, zon: [2, 5, 9], tid: 1.5, storm: 3 },
} as const;
export type TornadoStorlek = keyof typeof TORNADOSTORLEKAR;
export const zonerOf = (t: Tornado) => TORNADOSTORLEKAR[t.storlek ?? 'medel'].zon;
// storleken på tornadon som börjar vid start, lottad efter andelarna (steg 6.4.15)
export function tornadoStorlek(s: State, start: number): TornadoStorlek {
  const u = motgangTal(s, start, 3870);
  let acc = 0;
  for (const [k, d] of Object.entries(TORNADOSTORLEKAR) as [TornadoStorlek, (typeof TORNADOSTORLEKAR)[TornadoStorlek]][]) { acc += d.andel; if (u < acc) return k; }
  return 'medel';
}

// ett tal mellan 0 och 1 för tornadon som börjar vid start (salt skiljer talen åt)
const tal = (s: State, start: number, salt: number) => motgangTal(s, start, salt);
// banan för tornadon som börjar vid start: en bruten linje [x, y, x, y, …] från kartans kant, ur tiden (inte byn), så att den
// går att räkna ut i förväg. Den går in mot kartan, rakt en bit och svänger, tills tiden är slut eller den går ut ur kartan
export function tornadoBana(s: State, start: number, storlek = tornadoStorlek(s, start)): number[] {
  const kant = tal(s, start, 3823) * 2 * (W + H);
  let x: number, y: number, inV: number;
  if (kant < W) { x = kant; y = 0; inV = Math.PI / 2; }
  else if (kant < W + H) { x = W; y = kant - W; inV = Math.PI; }
  else if (kant < 2 * W + H) { x = 2 * W + H - kant; y = H; inV = -Math.PI / 2; }
  else { x = 0; y = 2 * (W + H) - kant; inV = 0; }
  let v = inV + (2 * tal(s, start, 3824) - 1) * TORNADO.in;
  const min = Math.round((TORNADO.min[0] + tal(s, start, 3822) * (TORNADO.min[1] - TORNADO.min[0])) * TORNADOSTORLEKAR[storlek].tid);
  let kvar = min * 60 / TORNADO.fart;
  const bana = [x, y];
  for (let n = 0; kvar > 0 && n < 100; n++) {
    let l = Math.min(kvar, TORNADO.ben[0] + tal(s, start, 3900 + n) * (TORNADO.ben[1] - TORNADO.ben[0]));
    const dx = Math.cos(v), dy = Math.sin(v);
    // går den ut ur kartan på vägen tar den slut där
    let ut = false;
    for (const [p, q] of [[dx, W - x], [-dx, x], [dy, H - y], [-dy, y]]) if (p > 1e-9 && q / p < l) { l = Math.max(0, q / p); ut = true; }
    x += dx * l; y += dy * l; kvar -= l;
    bana.push(x, y);
    if (ut) break;
    v += (tal(s, start, 4000 + n) < 0.5 ? -1 : 1) * (TORNADO.svang[0] + tal(s, start, 4100 + n) * (TORNADO.svang[1] - TORNADO.svang[0]));
  }
  return bana;
}
const banLangd = (b: number[]) => { let L = 0; for (let k = 2; k < b.length; k += 2) L += Math.hypot(b[k] - b[k - 2], b[k + 1] - b[k - 1]); return L; };
// när tornadon i tidsåldern som börjar vid start kommer, och när den har gått sin bana (hela sekunder)
export function tornadoTid(s: State, start: number) {
  const fran = start + Math.round((TORNADO.borjar[0] + tal(s, start, 3821) * (TORNADO.borjar[1] - TORNADO.borjar[0])) * 24) * HOUR;
  return { fran, till: fran + Math.round(banLangd(tornadoBana(s, start)) * TORNADO.fart) * SEC };
}
// drar en tornado fram vid tiden t? (vädret, vader.ts)
export const tornadoNu = (s: State, t = s.now) => motgangNu(s, t)?.id === 'tornado' || !!s.tornado?.test && t >= s.tornado.fran && t < s.tornado.till;

function nyBana(s: State, start: number, storlek = tornadoStorlek(s, start)): Tornado {
  const bana = tornadoBana(s, start, storlek), fran = tornadoTid(s, start).fran, till = fran + Math.round(banLangd(bana) * TORNADO.fart) * SEC;
  return { start, storlek, fran, till, bana, L: banLangd(bana), u: 0, trad: 0, vagg: 0, lyft: 0, sonder: 0, skadade: 0 };
}
export interface Tornado { test?: 1; storlek?: TornadoStorlek; doda?: number; djur?: number; forstort?: number; start: number; fran: number; till: number; bana: number[]; L: number; u: number; trad: number; vagg: number; lyft: number; sonder: number; skadade: number; traff?: number[]; lyftRutor?: number[]; tagna?: number[]; flyg?: Flygt[]; storm?: number[]; stormN?: number }
// det som flyger (steg 6.4.13, bara för bilden): slaget (en sak, 'folk' eller 'glod'), varifrån, vart och när
export interface Flygt { k: string; fx: number; fy: number; tx: number; ty: number; t: number }
// så länge något syns flyga (spelets tid, ms)
export const FLYGTID = 3 * SEC;
function flog(s: State, t: Tornado, k: string, fx: number, fy: number, tx: number, ty: number) {
  t.flyg = (t.flyg ?? []).filter(f => f.t > s.now - FLYGTID);
  if (t.flyg.length < 60) t.flyg.push({ k, fx, fy, tx, ty, t: s.now });
}
// hur långt längs banan tornadon har kommit vid tiden t (0 till 1), och var den är
export const tornadoAndel = (t: Tornado, nu: number) => Math.min(1, Math.max(0, (nu - t.fran) / (t.till - t.fran)));
export function tornadoPos(t: Tornado, u: number) {
  const b = t.bana;
  if (!b) return { x: -100, y: -100 }; // en tornado från en äldre sparning (tas bort i tornadoSteg)
  let d = u * t.L;
  for (let k = 2; k < b.length; k += 2) {
    const l = Math.hypot(b[k] - b[k - 2], b[k + 1] - b[k - 1]);
    if (d <= l || k === b.length - 2) { const f = l > 0 ? Math.min(1, d / l) : 0; return { x: b[k - 2] + (b[k] - b[k - 2]) * f, y: b[k - 1] + (b[k + 1] - b[k - 1]) * f }; }
    d -= l;
  }
  return { x: b[0], y: b[1] };
}
// var på banan punkten (x, y) ligger närmast: hur långt längs banan (rutor), hur långt från den, och banans riktning där
function narmastPa(t: Tornado, x: number, y: number) {
  const b = t.bana;
  let best = { f: 0, d: Infinity, ux: 1, uy: 0 }, f0 = 0;
  for (let k = 2; k < b.length; k += 2) {
    const vx = b[k] - b[k - 2], vy = b[k + 1] - b[k - 1], l = Math.hypot(vx, vy);
    if (l > 0) {
      const ux = vx / l, uy = vy / l, a = Math.max(0, Math.min(l, (x - b[k - 2]) * ux + (y - b[k - 1]) * uy));
      const d = Math.hypot(x - b[k - 2] - ux * a, y - b[k - 1] - uy * a);
      if (d < best.d) best = { f: f0 + a, d, ux, uy };
    }
    f0 += l;
  }
  return best;
}

// testläget (steg 6.4.7): en tornado kommer nu från kartans kant, med en bana genom byn som en vanlig och lika lång tid över
// kartan. Den gäller som en tornado i vädret och för larmet tills den gått över kartan. Går inte medan en tornado pågår
export const tornadoHinder = (s: State) => s.tornado ? 'En tornado drar redan fram' : undefined;
export function skickaTornado(s: State, storlek?: TornadoStorlek): { ok: boolean; text: string } {
  const h = tornadoHinder(s);
  if (h) return { ok: false, text: h };
  const t = nyBana(s, s.now, storlek), tid = t.till - t.fran;
  s.tornadoStig = undefined;
  t.fran = s.now; t.till = s.now + tid; t.test = 1;
  s.tornado = t;
  const e = bynsMitt(s), v = Math.atan2(t.bana[1] - e.y - 0.5, t.bana[0] - e.x - 0.5);
  const text = `Testläget: en ${t.storlek === 'medel' ? 'medelstor' : t.storlek} tornado kommer från ${STRECK[(Math.round(v / (Math.PI / 4)) + 8) % 8]} och är på kartan i ${Math.round(tid / MIN)} minuter`;
  log(s, text + '.', 'world');
  return { ok: true, text };
}

// ett tal mellan 0 och 1 för en ruta eller en person under tornadon (drar inget ur slumpföljderna)
const ur = (s: State, t: Tornado, a: number, salt: number) => motgangTal(s, t.start + a * HOUR, salt);

// ---------- varje steg (steg.ts) ----------
// rövarnas och handlarens del (rovare.ts och handel.ts), som steg.ts skickar med (de kan inte importeras hit utan en cirkel)
export interface TornadoGaster {
  rovarTornado: typeof import('./rovare').rovarTornado;
  handlarTornado: typeof import('./handel').handlarTornado;
  handlarPlats: typeof import('./handel').handlarPlats;
}
export function tornadoSteg(s: State, gaster?: TornadoGaster) {
  const m = motgangNu(s);
  if (m?.id === 'tornado' && s.tornado?.start !== m.start && !s.tornado?.test) { s.tornado = nyBana(s, m.start); s.tornadoStig = undefined; } // loggen och krönikan: stepMotgang
  const t = s.tornado;
  if (!t) return;
  if (!t.bana) { delete s.tornado; return; } // en rak bana från en äldre sparning
  const u = tornadoAndel(t, s.now);
  if (u > t.u) { svep(s, t, t.u, u, gaster); t.u = u; }
  if (m?.id === 'tornado' || t.test && u < 1) { ser(s, t); soker(s, t); return; }
  // den har gått över kartan
  const delar = [t.doda && `dödade ${t.doda} ${t.doda === 1 ? 'människa' : 'människor'}`, t.forstort && `förstörde ${t.forstort} saker`, t.trad && `fällde ${t.trad} träd`, t.vagg && `rev ${t.vagg} ${t.vagg === 1 ? 'vägg' : 'väggar'}`, t.lyft && `spred ${t.lyft} saker${t.sonder ? ` (${t.sonder} gick sönder)` : ''}`].filter(Boolean);
  log(s, delar.length ? `Tornadon ${delar.join(', ')}.` : 'Tornadon gick fram där inget fanns att ta.', 'world');
  delete s.tornado;
}

// det tornadon tar på vägen från andelen a till b av banan: varje ruta tas en gång, i steget då tornadon passerar den punkt
// på banan som ligger närmast rutan, efter zonen den ligger i (kärnan, nära och utkanten: hela rutor från mitten, efter
// storleken). Människorna och djuren efter hur nära tornadon de är i steget
function svep(s: State, t: Tornado, a: number, b: number, gaster?: TornadoGaster) {
  const z = zonerOf(t), R = z[2] + 0.99, L = t.L || 1;
  // punkter längs banan från a till b, en halv ruta isär (och till slutet när den är framme)
  const pkt: { x: number; y: number }[] = [];
  for (let d = a * L; ; d += 0.5) { const e = Math.min(d, b * L); pkt.push(tornadoPos(t, e / L)); if (e >= b * L) break; }
  const tagna = new Set(t.tagna), karna: number[] = [], nara: number[] = [], utkant: number[] = [], fa = a * L, fb = b * L;
  const xs = pkt.map(p => p.x), ys = pkt.map(p => p.y);
  for (let y = Math.max(0, Math.floor(Math.min(...ys) - R)); y <= Math.min(H - 1, Math.floor(Math.max(...ys) + R)); y++)
    for (let x = Math.max(0, Math.floor(Math.min(...xs) - R)); x <= Math.min(W - 1, Math.floor(Math.max(...xs) + R)); x++) {
      if (tagna.has(y * W + x)) continue;
      const np = narmastPa(t, x + 0.5, y + 0.5), d = Math.floor(np.d);
      if (d > z[2] || !(np.f > fa || a === 0 && np.f >= 0) || !(np.f <= fb || b >= 1)) continue;
      (d <= z[0] ? karna : d <= z[1] ? nara : utkant).push(y * W + x);
    }
  const alla = [...karna, ...nara, ...utkant];
  if (alla.length) (t.tagna ??= []).push(...alla);
  if (karna.length) karnan(s, t, karna);
  if (nara.length) naraZon(s, t, nara);
  if (karna.length || nara.length) eldarna(s, t, new Set([...karna, ...nara]));
  if (nara.length || utkant.length) lyft(s, t, new Set(nara), new Set(utkant));
  if (utkant.length) utkanten(s, t, utkant);
  if (alla.length) vaxterna(s, alla);
  // människorna och djuren: i kärnan dör de; nära och i utkanten flyger människorna och skadas (en gång per tornado)
  // (som rutorna: efter avståndet till banan, när tornadon passerar den punkt på banan som ligger närmast)
  const zonVid = (x: number, y: number) => {
    const np = narmastPa(t, x, y);
    if (!(np.f > fa - 1 || a === 0) || !(np.f <= fb + 1 || b >= 1)) return -1;
    return np.d <= z[0] + 0.5 ? 0 : np.d <= z[1] + 0.5 ? 1 : np.d <= z[2] + 0.5 ? 2 : -1;
  };
  for (const pp of living(s)) {
    if (!alive(pp)) continue;
    const zon = zonVid(pp.x, pp.y);
    if (zon === 0) { t.doda = (t.doda ?? 0) + 1; count(s, 'tornado dod'); die(s, pp, 'tornado'); continue; }
    if (zon < 1 || zon > 2 || t.traff?.includes(pp.id)) continue;
    (t.traff ??= []).push(pp.id);
    flyger(s, t, pp, zon);
  }
  // alla djuren på kartan som går att döda en och en: kaninerna, rådjuren, fåglarna och björnarna (vargflocken är en strid för sig)
  for (const d of [...djurOf(s), ...radjurOf(s), ...faglarOf(s), ...bjornarOf(s)]) {
    const zon = zonVid(d.x, d.y);
    if (zon === 0 || zon === 1 && ur(s, t, d.id, 3846) < TORNADO.djurNara) { dodaDjur(s, d.id); t.djur = (t.djur ?? 0) + 1; count(s, 'tornado djur'); }
  }
  if (gaster) gasterna(s, t, zonVid, L, gaster);
  stormen(s, t, b);
}
// stormen (steg 6.4.14): medan tornadon drar fram blåser det hårt överallt (vind i TORNADO, vader.ts) och vuxna träd var
// som helst på kartan kan falla. Vilka träd och när (en punkt på banan) lottas en gång, när tornadon kommer, och de faller
// när tornadon passerar sin punkt, om de står kvar
const stormU = (s: State, t: Tornado, i: number) => ur(s, t, i, 3862);
function stormen(s: State, t: Tornado, b: number) {
  const g = groundOf(s);
  if (!t.storm) {
    const v: number[] = [];
    for (let i = 0; i < W * H; i++) if (g.trees[i] >= FOREST && ur(s, t, i, 3861) < TORNADO.stormTrad * TORNADOSTORLEKAR[t.storlek ?? 'medel'].storm) v.push(i);
    t.storm = v.sort((p, q) => stormU(s, t, p) - stormU(s, t, q) || p - q); t.stormN = 0;
  }
  let n = t.stormN ?? 0;
  for (; n < t.storm.length; n++) {
    const i = t.storm[n];
    if (stormU(s, t, i) > b && b < 1) break;
    if (g.trees[i] >= FOREST) { fall(s, t, i); count(s, 'tornado storm'); }
  }
  t.stormN = n;
}
// rövarna och handlaren (steg 6.4.12) drabbas som byborna, en gång per tornado: i kärnan dör de, nära och i utkanten
// flyger de och kan dö eller skadas. Handlaren tappar en del av packningen och går hem, rövarna flyr
function gasterna(s: State, t: Tornado, zonVid: (x: number, y: number) => number, L: number, { rovarTornado, handlarTornado, handlarPlats }: TornadoGaster) {
  const f = s.rovare, fk = -1e6 - (f?.id ?? 0);
  if (f && !t.traff?.includes(fk)) {
    const zon = zonVid(f.x, f.y);
    if (zon >= 0) {
      (t.traff ??= []).push(fk);
      const till = zon > 0 ? landar(s, t, f.x, f.y, fk, zon, L, true) : undefined, doda0 = f.folk.length;
      rovarTornado(s, f, zon, zon === 1 ? TORNADO.dodNara : 0, zon === 1 ? 1 : TORNADO.skadas, zon === 1 ? TORNADO.skadaNara : TORNADO.skadaGrad, (j, salt) => ur(s, t, fk - j, 3855 + salt), till);
      t.doda = (t.doda ?? 0) + doda0 - (s.rovare?.folk.length ?? 0);
    }
  }
  const h = s.handlare;
  if (h && !t.traff?.includes(h.id)) {
    const p = handlarPlats(h, s.now), zon = zonVid(p.x, p.y);
    if (zon >= 0) {
      (t.traff ??= []).push(h.id);
      const dod = zon === 0 || zon === 1 && ur(s, t, h.id, 3859) < TORNADO.dodNara;
      if (dod) { t.doda = (t.doda ?? 0) + 1; count(s, 'tornado dod'); }
      h.x = p.x; h.y = p.y;
      handlarTornado(s, h, dod, zon === 1 ? TORNADO.sonder : TORNADO.sonderUtkant, ur(s, t, h.id, 3860), dod ? undefined : landar(s, t, p.x, p.y, h.id, zon, L, true));
    }
  }
}
// nära (steg 6.4.10): träden faller med stor risk och ungskogen slits upp, gräset blir en jordstig, väggarna tappar mycket
// skick efter materialet och rasar när det är slut, dörrarna kan slitas loss och stationerna och möblerna gå sönder (det
// som låg i dem blir lösa saker som flyger)
function naraZon(s: State, t: Tornado, rutor: number[]) {
  const g = groundOf(s);
  let rev = false, flytt = false;
  for (const i of rutor) {
    const x = i % W, y = Math.floor(i / W);
    if (g.trees[i] >= FOREST && ur(s, t, i, 3825) < TORNADO.trad) fall(s, t, i);
    else if (g.trees[i] > 0 && g.trees[i] < FOREST) g.trees[i] = 0;
    if (isSoil(g.tiles[i]) && !g.built?.[i] && g.trees[i] < FOREST) { if (g.cover[i] > 0) count(s, 'tornado stig'); g.cover[i] = 0; (s.tornadoStig ??= []).push(i); } // en jordstig (som syns efteråt, steg 6.4.13)
    const v = bitAt(s, x, y);
    if (v?.k === 'vagg' && v.b >= 1) {
      v.c -= (MATERIAL[v.m]?.storm ?? 1) * (TORNADO.storm[0] + ur(s, t, i, 3826) * (TORNADO.storm[1] - TORNADO.storm[0]));
      if (v.c <= 0) { const h = rasar(s, v); t.vagg++; count(s, 'tornado vagg'); drabbadHus(s, h, 'tornadon som förstörde huset'); }
      rev = true;
    } else if (v?.k === 'oppning' && v.dorr && ur(s, t, i, 3847) < TORNADO.trasig) { delete v.dorr; t.forstort = (t.forstort ?? 0) + 1; count(s, 'tornado forstort'); rev = true; }
    const st = s.stationer?.length ? stationAt(s, x, y) : undefined;
    if (st && ur(s, t, st.id, 3848) < TORNADO.trasig) {
      // redskapen som låg i den blir liggande på rutan
      for (const k of tingOf(s)) if (k.vid === st.id && k.hos === undefined && k.lass === undefined) { k.vid = undefined; k.x = x; k.y = y; }
      taBort(s, st); t.forstort = (t.forstort ?? 0) + 1; count(s, 'tornado forstort'); flytt = true;
    }
  }
  if (rev) touch(s);
  if (flytt) tidy(s);
}
// ett vuxet träd på rutan i faller och blir en liggande stam
function fall(s: State, t: Tornado, i: number) {
  const g = groundOf(s), x = i % W, y = Math.floor(i / W), stam = stamAv(g, i);
  g.trees[i] = 0;
  if (s.halvfallt) delete s.halvfallt[i];
  stocks(s).push({ id: (s.nextStock = (s.nextStock ?? 0) + 1), x: x + 0.5, y: y + 0.5, ...stam });
  nyStubbe(s, x, y, stam.ved);
  t.trad++; count(s, 'tornado trad');
}
// utkanten (steg 6.4.11): några vuxna träd faller (det som flyger far kortare, i lyft och flyger)
function utkanten(s: State, t: Tornado, rutor: number[]) {
  const g = groundOf(s);
  for (const i of rutor) if (g.trees[i] >= FOREST && ur(s, t, i, 3854) < TORNADO.tradUtkant) fall(s, t, i);
}
// i alla zonerna (steg 6.4.11): de vilda växterna försvinner (bär, svamp, rötter, rovor, ärter: allt i gruppen växter som
// kan plockas slut) och fälten med grödor förstörs. Växterna kommer tillbaka som när någon plockat dem
const VAXTER = UTTAG_IDS.filter(k => FYND[k].grupp === 'vaxter');
function vaxterna(s: State, rutor: number[]) {
  const d = takenOf(s);
  for (const k of VAXTER) { const a = d[k]; if (a) for (const i of rutor) a[i] = 1; }
  faltTornado(s, new Set(rutor));
}
// eldarna i kärnan och nära släcks, och glöden kan slängas iväg och tända en brand där den landar (steg 6.4.10)
function eldarna(s: State, t: Tornado, rutor: Set<number>) {
  for (const f of eldarOf(s)) {
    if (!f.lit) continue;
    const e = eldXY(s, f), i = e.y * W + e.x;
    if (!rutor.has(i)) continue;
    f.lit = false; f.fuel = 0; f.emberUntil = undefined;
    count(s, 'tornado eld');
    const v = 2 * Math.PI * ur(s, t, i, 3849), d = TORNADO.flygNara[0] + ur(s, t, i, 3850) * (TORNADO.flygNara[1] - TORNADO.flygNara[0]);
    const nx = Math.floor(e.x + 0.5 + Math.cos(v) * d), ny = Math.floor(e.y + 0.5 + Math.sin(v) * d);
    if (inMap(nx, ny)) flog(s, t, 'glod', e.x + 0.5, e.y + 0.5, nx + 0.5, ny + 0.5);
    if (inMap(nx, ny) && ur(s, t, i, 3851) < TORNADO.glod) { tand(s, ny * W + nx, 'gnista', ur(s, t, i, 3852)); if (brinner(s, ny * W + nx)) count(s, 'tornado glod'); }
  }
}
// det som ligger lösa (högarna, lagren, det som låg i en station som gått sönder) lyfts och hamnar en bit från banan: långt
// nära och kortare i utkanten. En del går sönder när det landar. Det i kistor och på hyllor och under tak som håller klarar sig
function lyft(s: State, t: Tornado, nara: Set<number>, utkant: Set<number>) {
  const L = t.L || 1;
  let flytt = false;
  for (const st of stacksOf(s)) {
    const i = st.y * W + st.x, zon = nara.has(i) ? 1 : utkant.has(i) ? 2 : 0;
    if (!zon || st.n < 1 || st.gor || SAKER[st.k]?.mark || forvarAt(s, st.x, st.y) || roofed(s, st.x, st.y) || t.lyftRutor?.includes(i)) continue;
    const n = Math.floor(st.n), del = zon === 1 ? TORNADO.sonder : TORNADO.sonderUtkant, sonder = Math.min(n, Math.floor(n * del + ur(s, t, i, 3827)));
    if (sonder) { minska(s, st, sonder); t.sonder += sonder; count(s, 'tornado sonder', sonder); }
    t.lyft += n; count(s, 'tornado lyft', n);
    flytt = true;
    if (st.n < 1) continue;
    const p = landar(s, t, st.x + 0.5, st.y + 0.5, i, zon, L);
    if (p) { flog(s, t, st.k, st.x + 0.5, st.y + 0.5, p.x + 0.5, p.y + 0.5); st.x = p.x; st.y = p.y; }
    (t.lyftRutor ??= []).push(st.y * W + st.x);
  }
  if (flytt) tidy(s);
}
// var något som flyger från (x, y) landar: åt sidan om banan, på samma sida, långt nära och kortare i utkanten, och en bit
// framåt. En ruta som inte är blockerad, utan station och utan något annat på
function landar(s: State, t: Tornado, x: number, y: number, a: number, zon: number, L: number, folk = false) {
  const np = narmastPa(t, x, y), dx = np.ux, dy = np.uy, bp = tornadoPos(t, np.f / L), f = zon === 1 ? TORNADO.flygNara : TORNADO.flygUtkant;
  const sid = ((x - bp.x) * -dy + (y - bp.y) * dx) >= 0 ? 1 : -1;
  for (let k = 0; k < 6; k++) {
    const d = f[0] + ur(s, t, a, 3828 + k) * (f[1] - f[0]), fram = (ur(s, t, a, 3834 + k) - 0.3) * d;
    const nx = Math.floor(x - dy * d * sid + dx * fram), ny = Math.floor(y + dx * d * sid + dy * fram);
    if (!inMap(nx, ny) || blocked(s, nx, ny) || stationAt(s, nx, ny) || !folk && nagotPa(s, nx, ny) || vattenNu(s)[ny * W + nx] === T.Vatten) continue;
    return { x: nx, y: ny };
  }
  return undefined;
}
// en människa nära tornadon eller i utkanten flyger och skadas när hen landar: nära långt och svårt, och hen kan dö direkt
function flyger(s: State, t: Tornado, pp: Person, zon: number) {
  const L = t.L || 1, p = landar(s, t, pp.x, pp.y, 10000 + pp.id, zon, L, true);
  if (p) { avbryt(s, pp); flog(s, t, 'folk', pp.x, pp.y, p.x + 0.5, p.y + 0.5); pp.x = p.x + 0.5; pp.y = p.y + 0.5; }
  count(s, 'tornado flog');
  if (zon === 1 && ur(s, t, pp.id, 3853) < TORNADO.dodNara) { t.doda = (t.doda ?? 0) + 1; count(s, 'tornado dod'); die(s, pp, 'tornado'); return; }
  if (ur(s, t, pp.id, 3840) >= (zon === 1 ? 1 : TORNADO.skadas)) return;
  const delar: Kroppsdel[] = ['huvud', 'bal', 'armV', 'armH', 'benV', 'benH'];
  const d = delar[Math.floor(ur(s, t, pp.id, 3841) * delar.length)], k = ur(s, t, pp.id, 3842) < 0.5 ? 'krossar' : ur(s, t, pp.id, 3843) < 0.5 ? 'blamarke' : 'benbrott';
  const g = zon === 1 ? TORNADO.skadaNara : TORNADO.skadaGrad, grad = g[0] + ur(s, t, pp.id, 3844) * (g[1] - g[0]);
  t.skadade++; count(s, 'tornado skadad');
  const dod = skada(s, pp, d, k, grad, 'tornado', 'i tornadon');
  if (dod) die(s, pp, dod); else upplev(s, pp, 'drabbad', 'tornadon'); // steg 4.1.1.2
}
// kärnan (steg 6.4.9) förstör allt på rutorna: väggarna rasar, golven blir jord och dörrarna försvinner, stationerna och
// möblerna med det som ligger i dem, alla saker, redskapen och de liggande stammarna. Träden välts till liggande stammar,
// och ungskogen slits upp
function karnan(s: State, t: Tornado, rutor: number[]) {
  const g = groundOf(s), set = new Set(rutor), pa = (x: number, y: number) => set.has(Math.floor(y) * W + Math.floor(x));
  let rev = false, flytt = false;
  const borta = (n = 1) => { t.forstort = (t.forstort ?? 0) + n; count(s, 'tornado forstort', n); };
  // de liggande stammarna går sönder (innan de nya läggs)
  const fore = stocks(s).length;
  s.stockar = stocks(s).filter(k => !pa(k.x, k.y));
  if (s.stockar.length < fore) borta(fore - s.stockar.length);
  for (const i of rutor) {
    const x = i % W, y = Math.floor(i / W);
    if (g.trees[i] >= FOREST) {
      const stam = stamAv(g, i);
      g.trees[i] = 0; g.cover[i] = 1;
      stocks(s).push({ id: (s.nextStock = (s.nextStock ?? 0) + 1), x: x + 0.5, y: y + 0.5, ...stam });
      nyStubbe(s, x, y, stam.ved);
      t.trad++; count(s, 'tornado trad');
    } else if (g.trees[i] > 0) g.trees[i] = 0;
    if (s.halvfallt) delete s.halvfallt[i];
    const v = bitAt(s, x, y);
    if (v?.k === 'vagg' && v.b >= 1) { const h = rasar(s, v); t.vagg++; count(s, 'tornado vagg'); drabbadHus(s, h, 'tornadon som förstörde huset'); rev = true; }
    else if (v?.k === 'golv' && v.m !== 'jord') { if (MATERIAL[v.m].vag) vagBort(s, v); else v.m = 'jord'; borta(); rev = true; }
    else if (v?.k === 'oppning' && v.dorr) { delete v.dorr; borta(); rev = true; }
    const st = s.stationer?.length ? stationAt(s, x, y) : undefined;
    if (st) { s.ting = tingOf(s).filter(q => !(q.vid === st.id && q.hos === undefined && q.lass === undefined)); taBort(s, st); borta(); flytt = true; }
  }
  // redskapen på marken och alla saker på rutorna
  const ting = tingOf(s), kvarTing = ting.filter(k => k.hos !== undefined || k.lass !== undefined || k.x === undefined || k.y === undefined || !pa(k.x, k.y));
  if (kvarTing.length < ting.length) { borta(ting.length - kvarTing.length); s.ting = kvarTing; }
  for (const st of stacksOf(s)) {
    if (st.n < 1 || !set.has(st.y * W + st.x)) continue;
    const n = Math.floor(st.n);
    minska(s, st, n); t.sonder += n; count(s, 'tornado sonder', n); flytt = true;
  }
  if (rev) touch(s);
  if (flytt) tidy(s);
}
// de som är vakna och ser tornadon ropar (som vid vargen)
function ser(s: State, t: Tornado) {
  const pos = tornadoPos(t, t.u), sikt = TORNADO.sikt * (isLight(s.now) ? 1 : TORNADO.siktNatt);
  const ser = living(s).filter(p => p.task?.act !== 'sova' && p.task?.act !== 'badd' && larmNu(s, p)?.vad !== 'tornado' && Math.hypot(p.x - pos.x, p.y - pos.y) <= sikt);
  if (!ser.length) return;
  if (!living(s).some(p => larmNu(s, p)?.vad === 'tornado')) count(s, 'tornado sedd');
  larma(s, 'tornado', 1, ser);
}
// den som vet om tornadon och är nära banan som är kvar avbryter det hen gör och går undan (inte den som slåss, vårdar eller bärs)
function soker(s: State, t: Tornado) {
  for (const p of living(s)) {
    if (!p.task || !larmAvbryter(p.task.act, 'tornado') || larmNu(s, p)?.vad !== 'tornado' || !fara(s, t, p)) continue;
    avbryt(s, p); count(s, 'tornado undan');
  }
}
// är p nära banan som är kvar? Då: platsen åt sidan dit hen går, och hur länge tills tornadon har passerat
function fara(s: State, t: Tornado, p: Person) {
  // den del av banan som är kvar: var den är närmast p, och åt vilket håll
  const L = t.L || 1, np = narmastPa(t, p.x, p.y), nu = t.u * L, ux = np.ux, uy = np.uy, fram = np.f, R = zonerOf(t)[2];
  if (fram < nu - R || np.d > TORNADO.fara + R) return;
  const bp = tornadoPos(t, fram / L), sid = -(p.x - bp.x) * uy + (p.y - bp.y) * ux;
  const tecken = sid > 0 || sid === 0 && ur(s, t, p.id, 3845) < 0.5 ? 1 : -1, d = (TORNADO.fara + R + TORNADO.undan) * tecken;
  const x = Math.min(W - 1.5, Math.max(1.5, bp.x - uy * d)), y = Math.min(H - 1.5, Math.max(1.5, bp.y + ux * d));
  const dur = Math.max(10 * MIN, (fram + TORNADO.fara + R - nu) / L * (t.till - t.fran));
  return { spot: { x, y }, dur };
}
// tornadon kommer och p vet om det och är nära dess väg: hen går undan (val.ts, som vid vargen)
export function tornadoSkydd(s: State, p: Person): { act: 'undan'; why: string; spot: { x: number; y: number }; dur: number } | undefined {
  const t = s.tornado;
  if (!t || !kanGa(p) || larmNu(s, p)?.vad !== 'tornado') return;
  const f = fara(s, t, p);
  return f && { act: 'undan', why: 'En tornado kommer, går undan från dess väg', spot: f.spot, dur: f.dur };
}
