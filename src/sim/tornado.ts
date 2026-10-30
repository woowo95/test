import { balans } from './balans';
import { rasar } from './bygg';
import { MATERIAL, bitAt, blocked, roofed, touch } from './byggnad';
import { alive, count, living, log } from './folk';
import { kanGa, skada, Kroppsdel } from './halsa';
import { eldPlats } from './karta';
import { avbryt, minska, nagotPa, stacksOf, tidy } from './lager';
import { die } from './liv';
import { groundOf } from './mark';
import { motgangNu, motgangTal } from './motgang';
import { larma, larmNu } from './rykten';
import { SAKER } from './saker';
import { SKOG, stocks } from './skog';
import { forvarAt, stationAt } from './stationer';
import { isLight } from './tid';
import { H, HOUR, MIN, Person, State, W, inMap } from './typer';
import { FOREST } from './vag';

// Tornadon (steg 3.8.4, "Motgångarna i spelet" i designdokumentet): den enda stormen. En av motgångarna i registret
// MOTGANGAR (motgang.ts), på sommaren och hösten. Den kommer en gång under tidsåldern, varar några timmar och går långsamt
// längs en rak bana från kartans kant till kartans kant, nära byn. I sin väg fäller den träd (som blir liggande stammar och
// ger lätt trä), river väggar efter materialet (timmer håller bättre än ris: storm i MATERIAL, byggnad.ts) och lyfter
// saker ur förrådet, som hamnar utspridda runt banan; en del går sönder. Det som ligger i kistor och på hyllor, och under
// tak där väggarna håller, klarar sig. Folk ser den komma och ropar som vid vargen (larma i rykten.ts); de som är nära
// banan går undan (tornadoSkydd, i val.ts). Den som ändå är i vägen kan skadas. Efteråt bär invånarna in det som spridits
// (haulJob i lager.ts). När den kommer och hur länge den varar räknas ur tiden (tornadoTid); banan bestäms när den
// kommer och sparas i s.tornado, och allt den gör sker i stegen, så att det levande läget och ikappräkningen blir lika.

// Balanstal (regel 8)
export const TORNADO = balans('tornado', {
  borjar: [0.5, 5.5], // tornadon kommer så här många dygn (år i spelet) in i tidsåldern (slumpas mellan, hela timmar) ...
  tim: [3, 5], // ... och går över kartan på så här många timmar (slumpas mellan, hela timmar)
  nara: 10, // banan går högst så här många rutor från elden (slumpas)
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

// ett tal mellan 0 och 1 för tornadon som börjar vid start (salt skiljer talen åt)
const tal = (s: State, start: number, salt: number) => motgangTal(s, start, salt);
// när tornadon i tidsåldern som börjar vid start kommer, och när den har gått över kartan (hela timmar)
export function tornadoTid(s: State, start: number) {
  const fran = start + Math.round((TORNADO.borjar[0] + tal(s, start, 3821) * (TORNADO.borjar[1] - TORNADO.borjar[0])) * 24) * HOUR;
  return { fran, till: fran + Math.round(TORNADO.tim[0] + tal(s, start, 3822) * (TORNADO.tim[1] - TORNADO.tim[0])) * HOUR };
}
// drar en tornado fram vid tiden t? (vädret, vader.ts)
export const tornadoNu = (s: State, t = s.now) => motgangNu(s, t)?.id === 'tornado';

// banan: en rak linje genom en punkt nära elden, i en riktning ur tiden, från kartans kant till kartans kant
function nyBana(s: State, start: number): Tornado {
  const e = eldPlats(s), v = tal(s, start, 3823) * 2 * Math.PI, dx = Math.cos(v), dy = Math.sin(v);
  const sida = (2 * tal(s, start, 3824) - 1) * TORNADO.nara, cx = e.x + 0.5 - dy * sida, cy = e.y + 0.5 + dx * sida;
  // var linjen går in och ut ur kartan (Liang–Barsky)
  let u0 = -Infinity, u1 = Infinity;
  for (const [p, q] of [[-dx, cx], [dx, W - cx], [-dy, cy], [dy, H - cy]]) {
    if (Math.abs(p) < 1e-9) continue;
    const r = q / p;
    if (p < 0) u0 = Math.max(u0, r); else u1 = Math.min(u1, r);
  }
  const { fran, till } = tornadoTid(s, start);
  return { start, fran, till, x0: cx + dx * u0, y0: cy + dy * u0, x1: cx + dx * u1, y1: cy + dy * u1, u: 0, trad: 0, vagg: 0, lyft: 0, sonder: 0, skadade: 0 };
}
export interface Tornado { start: number; fran: number; till: number; x0: number; y0: number; x1: number; y1: number; u: number; trad: number; vagg: number; lyft: number; sonder: number; skadade: number; traff?: number[] }
// hur långt längs banan tornadon har kommit vid tiden t (0 till 1), och var den är
export const tornadoAndel = (t: Tornado, nu: number) => Math.min(1, Math.max(0, (nu - t.fran) / (t.till - t.fran)));
export const tornadoPos = (t: Tornado, u: number) => ({ x: t.x0 + (t.x1 - t.x0) * u, y: t.y0 + (t.y1 - t.y0) * u });

// ett tal mellan 0 och 1 för en ruta eller en person under tornadon (drar inget ur slumpföljderna)
const ur = (s: State, t: Tornado, a: number, salt: number) => motgangTal(s, t.start + a * HOUR, salt);

// ---------- varje steg (steg.ts) ----------
export function tornadoSteg(s: State) {
  const m = motgangNu(s);
  if (m?.id === 'tornado' && s.tornado?.start !== m.start) s.tornado = nyBana(s, m.start); // loggen och krönikan: stepMotgang
  const t = s.tornado;
  if (!t) return;
  const u = tornadoAndel(t, s.now);
  if (u > t.u) { svep(s, t, t.u, u); t.u = u; }
  if (m?.id === 'tornado') { ser(s, t); soker(s, t); return; }
  // den har gått över kartan
  const delar = [t.trad && `fällde ${t.trad} träd`, t.vagg && `rev ${t.vagg} ${t.vagg === 1 ? 'vägg' : 'väggar'}`, t.lyft && `spred ${t.lyft} saker${t.sonder ? ` (${t.sonder} gick sönder)` : ''}`].filter(Boolean);
  log(s, delar.length ? `Tornadon ${delar.join(', ')}.` : 'Tornadon gick fram där inget fanns att ta.', 'world');
  delete s.tornado;
}

// det tornadon tar på vägen från andelen a till b av banan: träden, väggarna, sakerna och den som är i vägen. Varje ruta
// tas en gång, i steget då tornadon passerar den (där rutan ligger längs banan)
function svep(s: State, t: Tornado, a: number, b: number) {
  const p = tornadoPos(t, a), q = tornadoPos(t, b), R = TORNADO.radie;
  const L = Math.hypot(t.x1 - t.x0, t.y1 - t.y0) || 1, ux = (t.x1 - t.x0) / L, uy = (t.y1 - t.y0) / L;
  const nar = (x: number, y: number) => { const f = (x - t.x0) * ux + (y - t.y0) * uy; return f >= a * L && f < (b >= 1 ? L + R : b * L) && Math.abs(-(x - t.x0) * uy + (y - t.y0) * ux) <= R; };
  const rutor: number[] = [];
  for (let y = Math.max(0, Math.floor(Math.min(p.y, q.y) - R)); y <= Math.min(H - 1, Math.floor(Math.max(p.y, q.y) + R)); y++)
    for (let x = Math.max(0, Math.floor(Math.min(p.x, q.x) - R)); x <= Math.min(W - 1, Math.floor(Math.max(p.x, q.x) + R)); x++)
      if (nar(x + 0.5, y + 0.5)) rutor.push(y * W + x);
  // träden: ett vuxet träd blir en liggande stam, och där det stod växer högt gräs
  const g = groundOf(s);
  for (const i of rutor) {
    if (g.trees[i] < FOREST || ur(s, t, i, 3825) >= TORNADO.trad) continue;
    const size = g.trees[i], x = i % W, y = Math.floor(i / W);
    g.trees[i] = 0; g.cover[i] = 1;
    if (s.halvfallt) delete s.halvfallt[i];
    stocks(s).push({ id: (s.nextStock = (s.nextStock ?? 0) + 1), x: x + 0.5, y: y + 0.5, ved: Math.round(SKOG.stamVed * size), grenar: Math.round(SKOG.stamGrenar * size) });
    if (!g.built?.[i]) (s.stubbar ??= []).push({ x, y, t: s.now });
    t.trad++; count(s, 'tornado trad');
  }
  // väggarna: skicket minskar efter materialet, och en vägg utan skick rasar
  let rev = false;
  for (const i of rutor) {
    const v = bitAt(s, i % W, Math.floor(i / W));
    if (!v || v.k !== 'vagg' || v.b < 1) continue;
    v.c -= (MATERIAL[v.m]?.storm ?? 1) * (TORNADO.storm[0] + ur(s, t, i, 3826) * (TORNADO.storm[1] - TORNADO.storm[0]));
    if (v.c <= 0) { rasar(s, v); t.vagg++; count(s, 'tornado vagg'); }
    rev = true;
  }
  if (rev) touch(s);
  // sakerna som ligger ute eller under ett tak som inte håller: en del går sönder, resten hamnar en bit från banan
  const dx = t.x1 - t.x0, dy = t.y1 - t.y0;
  let flytt = false;
  for (const st of stacksOf(s)) {
    if (st.n < 1 || st.gor || SAKER[st.k]?.mark || !nar(st.x + 0.5, st.y + 0.5) || forvarAt(s, st.x, st.y) || roofed(s, st.x, st.y)) continue;
    const i = st.y * W + st.x, n = Math.floor(st.n), sonder = Math.min(n, Math.floor(n * TORNADO.sonder + ur(s, t, i, 3827)));
    if (sonder) { minska(s, st, sonder); t.sonder += sonder; count(s, 'tornado sonder', sonder); }
    t.lyft += n; count(s, 'tornado lyft', n);
    flytt = true;
    if (st.n < 1) continue;
    // åt sidan om banan, på samma sida som stacken låg, och en bit framåt
    const sid = ((st.x + 0.5 - t.x0) * -dy + (st.y + 0.5 - t.y0) * dx) >= 0 ? 1 : -1;
    for (let f = 0; f < 6; f++) {
      const d = TORNADO.sprid[0] + ur(s, t, i, 3828 + f) * (TORNADO.sprid[1] - TORNADO.sprid[0]), fram = (ur(s, t, i, 3834 + f) - 0.3) * d;
      const nx = Math.floor(st.x + 0.5 - dy / L * d * sid + dx / L * fram), ny = Math.floor(st.y + 0.5 + dx / L * d * sid + dy / L * fram);
      if (!inMap(nx, ny) || blocked(s, nx, ny) || stationAt(s, nx, ny) || nagotPa(s, nx, ny)) continue;
      st.x = nx; st.y = ny; break;
    }
  }
  if (flytt) tidy(s);
  // den som är i vägen (nära tornadon nu)
  for (const pp of living(s)) {
    if (!alive(pp) || avstTill(pp.x, pp.y, p, q) > R || t.traff?.includes(pp.id)) continue;
    (t.traff ??= []).push(pp.id); // en gång per tornado
    if (ur(s, t, pp.id, 3840) >= TORNADO.skadas) continue;
    const delar: Kroppsdel[] = ['huvud', 'bal', 'armV', 'armH', 'benV', 'benH'];
    const d = delar[Math.floor(ur(s, t, pp.id, 3841) * delar.length)], k = ur(s, t, pp.id, 3842) < 0.5 ? 'krossar' : ur(s, t, pp.id, 3843) < 0.5 ? 'blamarke' : 'benbrott';
    const grad = TORNADO.skadaGrad[0] + ur(s, t, pp.id, 3844) * (TORNADO.skadaGrad[1] - TORNADO.skadaGrad[0]);
    t.skadade++; count(s, 'tornado skadad');
    const dod = skada(s, pp, d, k, grad, 'tornado', 'i tornadon');
    if (dod) die(s, pp, dod);
  }
}
// avståndet från punkten (x, y) till sträckan p–q
function avstTill(x: number, y: number, p: { x: number; y: number }, q: { x: number; y: number }) {
  const vx = q.x - p.x, vy = q.y - p.y, l2 = vx * vx + vy * vy;
  const k = l2 > 0 ? Math.max(0, Math.min(1, ((x - p.x) * vx + (y - p.y) * vy) / l2)) : 0;
  return Math.hypot(x - p.x - k * vx, y - p.y - k * vy);
}

// de som är vakna och ser tornadon ropar (som vid vargen)
function ser(s: State, t: Tornado) {
  const pos = tornadoPos(t, t.u), sikt = TORNADO.sikt * (isLight(s.now) ? 1 : TORNADO.siktNatt);
  const ser = living(s).filter(p => p.task?.act !== 'sova' && p.task?.act !== 'badd' && larmNu(s, p)?.vad !== 'tornado' && Math.hypot(p.x - pos.x, p.y - pos.y) <= sikt);
  if (!ser.length) return;
  if (!living(s).some(p => larmNu(s, p)?.vad === 'tornado')) count(s, 'tornado sedd');
  larma(s, pos.x, pos.y, 'tornado', 1, ser);
}
// den som vet om tornadon och är nära banan som är kvar avbryter det hen gör och går undan (inte den som slåss, vårdar eller bärs)
const AVBRYTS_INTE = new Set<string>(['strid', 'vargjakt', 'buren', 'fatt', 'varda', 'undan']);
function soker(s: State, t: Tornado) {
  for (const p of living(s)) {
    if (!p.task || AVBRYTS_INTE.has(p.task.act) || larmNu(s, p)?.vad !== 'tornado' || !fara(s, t, p)) continue;
    avbryt(s, p); count(s, 'tornado undan');
  }
}
// är p nära banan som är kvar? Då: platsen åt sidan dit hen går, och hur länge tills tornadon har passerat
function fara(s: State, t: Tornado, p: Person) {
  const dx = t.x1 - t.x0, dy = t.y1 - t.y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const fram = (p.x - t.x0) * ux + (p.y - t.y0) * uy, sid = -(p.x - t.x0) * uy + (p.y - t.y0) * ux, nu = t.u * L;
  if (fram < nu - TORNADO.radie || fram > L + TORNADO.radie || Math.abs(sid) > TORNADO.fara + TORNADO.radie) return;
  const tecken = sid > 0 || sid === 0 && ur(s, t, p.id, 3845) < 0.5 ? 1 : -1, d = (TORNADO.fara + TORNADO.radie + TORNADO.undan) * tecken;
  const x = Math.min(W - 1.5, Math.max(1.5, t.x0 + ux * fram - uy * d)), y = Math.min(H - 1.5, Math.max(1.5, t.y0 + uy * fram + ux * d));
  const dur = Math.max(10 * MIN, (fram + TORNADO.fara + TORNADO.radie - nu) / L * (t.till - t.fran));
  return { spot: { x, y }, dur };
}
// tornadon kommer och p vet om det och är nära dess väg: hen går undan (val.ts, som vid vargen)
export function tornadoSkydd(s: State, p: Person): { act: 'undan'; why: string; spot: { x: number; y: number }; dur: number } | undefined {
  const t = s.tornado;
  if (!t || !kanGa(p) || larmNu(s, p)?.vad !== 'tornado') return;
  const f = fara(s, t, p);
  return f && { act: 'undan', why: 'En tornado kommer, går undan från dess väg', spot: f.spot, dur: f.dur };
}
