import { balans } from './balans';
import { rasar } from './bygg';
import { MATERIAL, bitAt, blocked, roofed, touch } from './byggnad';
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
import { stamAv, stocks } from './skog';
import { forvarAt, stationAt, taBort } from './stationer';
import { tingOf } from './agande';
import { djurOf, dodaDjur } from './djur';
import { isLight } from './tid';
import { H, HOUR, MIN, SEC, Person, State, W, inMap } from './typer';
import { FOREST } from './vag';
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
  radie: 2, // den tar allt inom så här många rutor från mitten
  trad: 0.6, // chansen att ett vuxet träd i vägen fälls
  storm: [0.5, 1.5], // en vägg i vägen förlorar så här mycket av sitt skick gånger materialets storm (slumpas mellan)
  sonder: 0.3, // så stor del av det som lyfts går sönder (hela saker)
  sprid: [3, 8], // det som lyfts hamnar så här många rutor från banan (slumpas mellan)
  sikt: 25, // man ser den så här många rutor bort på dagen ...
  siktNatt: 0.4, // ... och så här stor del av det på natten
  fara: 6, // den som är så här nära banan som är kvar går undan ...
  undan: 5, // ... till så här många rutor längre bort från den
  skadas: 0.5, // den som ändå är i vägen skadas med den här chansen ...
  skadaGrad: [0.3, 0.9], // ... så här svårt (slumpas mellan)
  vind: 1, // det blåser så här mycket (0 till 1, vaderNu i vader.ts) medan den drar fram
});

// tornadons storlekar (steg 6.4.9 och 6.4.15), en rad var: hur stor del av tornadorna som har storleken, och zonerna i
// hela rutor från mitten: kärnan (förstör allt), nära (stor skada) och utkanten (de vilda växterna, fälten, några träd)
export const TORNADOSTORLEKAR = {
  liten: { namn: 'liten', andel: 0.5, zon: [0, 2, 3] },
  medel: { namn: 'medel', andel: 0.4, zon: [1, 3, 6] },
  stor: { namn: 'stor', andel: 0.1, zon: [2, 5, 9] },
} as const;
export type TornadoStorlek = keyof typeof TORNADOSTORLEKAR;
export const zonerOf = (t: Tornado) => TORNADOSTORLEKAR[t.storlek ?? 'medel'].zon;

// ett tal mellan 0 och 1 för tornadon som börjar vid start (salt skiljer talen åt)
const tal = (s: State, start: number, salt: number) => motgangTal(s, start, salt);
// banan för tornadon som börjar vid start: en bruten linje [x, y, x, y, …] från kartans kant, ur tiden (inte byn), så att den
// går att räkna ut i förväg. Den går in mot kartan, rakt en bit och svänger, tills tiden är slut eller den går ut ur kartan
export function tornadoBana(s: State, start: number): number[] {
  const kant = tal(s, start, 3823) * 2 * (W + H);
  let x: number, y: number, inV: number;
  if (kant < W) { x = kant; y = 0; inV = Math.PI / 2; }
  else if (kant < W + H) { x = W; y = kant - W; inV = Math.PI; }
  else if (kant < 2 * W + H) { x = 2 * W + H - kant; y = H; inV = -Math.PI / 2; }
  else { x = 0; y = 2 * (W + H) - kant; inV = 0; }
  let v = inV + (2 * tal(s, start, 3824) - 1) * TORNADO.in;
  const min = Math.round(TORNADO.min[0] + tal(s, start, 3822) * (TORNADO.min[1] - TORNADO.min[0]));
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

function nyBana(s: State, start: number): Tornado {
  const bana = tornadoBana(s, start), { fran, till } = tornadoTid(s, start);
  return { start, fran, till, bana, L: banLangd(bana), u: 0, trad: 0, vagg: 0, lyft: 0, sonder: 0, skadade: 0 };
}
export interface Tornado { test?: 1; storlek?: TornadoStorlek; doda?: number; djur?: number; forstort?: number; start: number; fran: number; till: number; bana: number[]; L: number; u: number; trad: number; vagg: number; lyft: number; sonder: number; skadade: number; traff?: number[]; lyftRutor?: number[]; tagna?: number[] }
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
export function skickaTornado(s: State): { ok: boolean; text: string } {
  const h = tornadoHinder(s);
  if (h) return { ok: false, text: h };
  const t = nyBana(s, s.now), tid = t.till - t.fran;
  t.fran = s.now; t.till = s.now + tid; t.test = 1;
  s.tornado = t;
  const e = bynsMitt(s), v = Math.atan2(t.bana[1] - e.y - 0.5, t.bana[0] - e.x - 0.5);
  const text = `Testläget: en tornado kommer från ${STRECK[(Math.round(v / (Math.PI / 4)) + 8) % 8]} och är på kartan i ${Math.round(tid / MIN)} minuter`;
  log(s, text + '.', 'world');
  return { ok: true, text };
}

// ett tal mellan 0 och 1 för en ruta eller en person under tornadon (drar inget ur slumpföljderna)
const ur = (s: State, t: Tornado, a: number, salt: number) => motgangTal(s, t.start + a * HOUR, salt);

// ---------- varje steg (steg.ts) ----------
export function tornadoSteg(s: State) {
  const m = motgangNu(s);
  if (m?.id === 'tornado' && s.tornado?.start !== m.start && !s.tornado?.test) s.tornado = nyBana(s, m.start); // loggen och krönikan: stepMotgang
  const t = s.tornado;
  if (!t) return;
  if (!t.bana) { delete s.tornado; return; } // en rak bana från en äldre sparning
  const u = tornadoAndel(t, s.now);
  if (u > t.u) { svep(s, t, t.u, u); t.u = u; }
  if (m?.id === 'tornado' || t.test && u < 1) { ser(s, t); soker(s, t); return; }
  // den har gått över kartan
  const delar = [t.doda && `dödade ${t.doda} ${t.doda === 1 ? 'människa' : 'människor'}`, t.forstort && `förstörde ${t.forstort} saker`, t.trad && `fällde ${t.trad} träd`, t.vagg && `rev ${t.vagg} ${t.vagg === 1 ? 'vägg' : 'väggar'}`, t.lyft && `spred ${t.lyft} saker${t.sonder ? ` (${t.sonder} gick sönder)` : ''}`].filter(Boolean);
  log(s, delar.length ? `Tornadon ${delar.join(', ')}.` : 'Tornadon gick fram där inget fanns att ta.', 'world');
  delete s.tornado;
}

// det tornadon tar på vägen från andelen a till b av banan: träden, väggarna, sakerna och den som är i vägen. Varje ruta
// tas en gång, i steget då tornadon passerar den (där rutan ligger längs banan)
function svep(s: State, t: Tornado, a: number, b: number) {
  const z = zonerOf(t), R = Math.max(TORNADO.radie, z[2]) + 0.99, L = t.L || 1;
  // punkter längs banan från a till b, en halv ruta isär (och till slutet när den är framme)
  const pkt: { x: number; y: number }[] = [];
  for (let d = a * L; ; d += 0.5) { const e = Math.min(d, b * L); pkt.push(tornadoPos(t, e / L)); if (e >= b * L) break; }
  const vid = (x: number, y: number) => pkt.some(p => Math.hypot(x - p.x, y - p.y) <= R);
  // rutorna den når, var och en en gång per tornado: när tornadon passerar den punkt på banan som ligger närmast rutan
  const tagna = new Set(t.tagna), rutor: number[] = [], karna: number[] = [], fa = a * L, fb = b * L;
  const xs = pkt.map(p => p.x), ys = pkt.map(p => p.y);
  for (let y = Math.max(0, Math.floor(Math.min(...ys) - R)); y <= Math.min(H - 1, Math.floor(Math.max(...ys) + R)); y++)
    for (let x = Math.max(0, Math.floor(Math.min(...xs) - R)); x <= Math.min(W - 1, Math.floor(Math.max(...xs) + R)); x++) {
      if (tagna.has(y * W + x)) continue;
      const np = narmastPa(t, x + 0.5, y + 0.5);
      if (np.d > R || !(np.f > fa || a === 0 && np.f >= 0) || !(np.f <= fb || b >= 1)) continue;
      // kärnan (steg 6.4.9): rutorna högst så många hela rutor från mitten; resten tar det som förut inom radien
      if (Math.floor(np.d) <= z[0]) karna.push(y * W + x); else if (Math.floor(np.d) <= TORNADO.radie) rutor.push(y * W + x);
      else (t.tagna ??= []).push(y * W + x);
    }
  if (karna.length) { (t.tagna ??= []).push(...karna); karnan(s, t, karna); }
  if (rutor.length) (t.tagna ??= []).push(...rutor);
  const iRutor = new Set(rutor), nar = (x: number, y: number) => iRutor.has(Math.floor(y) * W + Math.floor(x));
  // träden: ett vuxet träd blir en liggande stam, och där det stod växer högt gräs
  const g = groundOf(s);
  for (const i of rutor) {
    if (g.trees[i] < FOREST || ur(s, t, i, 3825) >= TORNADO.trad) continue;
    const stam = stamAv(g, i), x = i % W, y = Math.floor(i / W);
    g.trees[i] = 0; g.cover[i] = 1;
    if (s.halvfallt) delete s.halvfallt[i];
    stocks(s).push({ id: (s.nextStock = (s.nextStock ?? 0) + 1), x: x + 0.5, y: y + 0.5, ...stam });
    if (!g.built?.[i]) (s.stubbar ??= []).push({ x, y, t: s.now });
    t.trad++; count(s, 'tornado trad');
  }
  // väggarna: skicket minskar efter materialet, och en vägg utan skick rasar
  let rev = false;
  for (const i of rutor) {
    const v = bitAt(s, i % W, Math.floor(i / W));
    if (!v || v.k !== 'vagg' || v.b < 1) continue;
    v.c -= (MATERIAL[v.m]?.storm ?? 1) * (TORNADO.storm[0] + ur(s, t, i, 3826) * (TORNADO.storm[1] - TORNADO.storm[0]));
    if (v.c <= 0) { const h = rasar(s, v); t.vagg++; count(s, 'tornado vagg'); drabbadHus(s, h, 'tornadon som förstörde huset'); }
    rev = true;
  }
  if (rev) touch(s);
  // sakerna som ligger ute eller under ett tak som inte håller: en del går sönder, resten hamnar en bit från banan
  let flytt = false;
  for (const st of stacksOf(s)) {
    // en hög lyfts en gång: den som inte hittar en fri ruta blir liggande på banan och lyfts inte igen och igen
    if (st.n < 1 || st.gor || SAKER[st.k]?.mark || !nar(st.x + 0.5, st.y + 0.5) || forvarAt(s, st.x, st.y) || roofed(s, st.x, st.y) || t.lyftRutor?.includes(st.y * W + st.x)) continue;
    const i = st.y * W + st.x, n = Math.floor(st.n), sonder = Math.min(n, Math.floor(n * TORNADO.sonder + ur(s, t, i, 3827)));
    if (sonder) { minska(s, st, sonder); t.sonder += sonder; count(s, 'tornado sonder', sonder); }
    t.lyft += n; count(s, 'tornado lyft', n);
    flytt = true;
    if (st.n < 1) continue;
    // åt sidan om banan, på samma sida som stacken låg, och en bit framåt
    const np = narmastPa(t, st.x + 0.5, st.y + 0.5), dx = np.ux, dy = np.uy, bp = tornadoPos(t, np.f / L);
    const sid = ((st.x + 0.5 - bp.x) * -dy + (st.y + 0.5 - bp.y) * dx) >= 0 ? 1 : -1;
    for (let f = 0; f < 6; f++) {
      const d = TORNADO.sprid[0] + ur(s, t, i, 3828 + f) * (TORNADO.sprid[1] - TORNADO.sprid[0]), fram = (ur(s, t, i, 3834 + f) - 0.3) * d;
      const nx = Math.floor(st.x + 0.5 - dy * d * sid + dx * fram), ny = Math.floor(st.y + 0.5 + dx * d * sid + dy * fram);
      if (!inMap(nx, ny) || blocked(s, nx, ny) || stationAt(s, nx, ny) || nagotPa(s, nx, ny)) continue;
      st.x = nx; st.y = ny; break;
    }
    (t.lyftRutor ??= []).push(st.y * W + st.x);
  }
  if (flytt) tidy(s);
  // den som är i vägen (nära tornadon nu): i kärnan dör hen, och djuren där dör (steg 6.4.9)
  const iKarnan = (x: number, y: number) => pkt.some(p => Math.hypot(x - p.x, y - p.y) <= z[0] + 0.5);
  for (const pp of living(s)) {
    if (!alive(pp) || !iKarnan(pp.x, pp.y)) continue;
    t.doda = (t.doda ?? 0) + 1; count(s, 'tornado dod');
    die(s, pp, 'tornado');
  }
  for (const d of djurOf(s)) if (iKarnan(d.x, d.y)) { dodaDjur(s, d.id); t.djur = (t.djur ?? 0) + 1; count(s, 'tornado djur'); }
  for (const pp of living(s)) {
    if (!alive(pp) || !vid(pp.x, pp.y) || t.traff?.includes(pp.id)) continue;
    (t.traff ??= []).push(pp.id); // en gång per tornado
    if (ur(s, t, pp.id, 3840) >= TORNADO.skadas) continue;
    const delar: Kroppsdel[] = ['huvud', 'bal', 'armV', 'armH', 'benV', 'benH'];
    const d = delar[Math.floor(ur(s, t, pp.id, 3841) * delar.length)], k = ur(s, t, pp.id, 3842) < 0.5 ? 'krossar' : ur(s, t, pp.id, 3843) < 0.5 ? 'blamarke' : 'benbrott';
    const grad = TORNADO.skadaGrad[0] + ur(s, t, pp.id, 3844) * (TORNADO.skadaGrad[1] - TORNADO.skadaGrad[0]);
    t.skadade++; count(s, 'tornado skadad');
    const dod = skada(s, pp, d, k, grad, 'tornado', 'i tornadon');
    if (dod) die(s, pp, dod); else upplev(s, pp, 'drabbad', 'tornadon'); // steg 4.1.1.2
  }
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
      if (!g.built?.[i]) (s.stubbar ??= []).push({ x, y, t: s.now });
      t.trad++; count(s, 'tornado trad');
    } else if (g.trees[i] > 0) g.trees[i] = 0;
    if (s.halvfallt) delete s.halvfallt[i];
    const v = bitAt(s, x, y);
    if (v?.k === 'vagg' && v.b >= 1) { const h = rasar(s, v); t.vagg++; count(s, 'tornado vagg'); drabbadHus(s, h, 'tornadon som förstörde huset'); rev = true; }
    else if (v?.k === 'golv' && v.m !== 'jord') { v.m = 'jord'; borta(); rev = true; }
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
  const L = t.L || 1, np = narmastPa(t, p.x, p.y), nu = t.u * L, ux = np.ux, uy = np.uy, fram = np.f, R = Math.max(TORNADO.radie, zonerOf(t)[2]);
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
