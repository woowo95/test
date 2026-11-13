import * as PIXI from 'pixi.js';
import { tidKvar, HALSA, ACTS, ALDER, Person, actIkon, utbIkon, SEC, TalkEvent, ageOf, alive, bordVid, byId, homeKind, bordaIHander, utrustning, isSocial, pratarMed, kanGa, living, load, REL, relKey, sparPlats, storlekAv, handlarNu, handlarPlats, Match, Task, dragLag, kastMal, SPORT, bakomFilt, blocked, stationAt, isKlar, stationDef, soverNu, lekGang, kroppFart } from '../sim';
// lågorna på den som brinner (steg 6.4.16, Björns val f6_brinner i steg 8.10.1): en låga med foten i (x, y) och längden l i
// bilden f (0–3): ljus kärna, gul mitt och röd spets, en tunga vid sidan som byter sida, och ibland en lös flamma överst
const BRAND_TAKT = 140, HOJD = [0, 2, 1, -1], SVAJ = [0, 1, 0, -1];
const LAGFARG = { karna: fargTal(farg('ben', 3)), gul: fargTal(farg('senap', 3)), mitt: fargTal(farg('senap', 2)), spets: fargTal(farg('rost', 2)), los: fargTal(farg('rost', 1)) };
function laga(g: PIXI.Graphics, x: number, y: number, l: number, f: number) {
  const h = l + HOJD[f], sv = SVAJ[f], prick = (px: number, py: number, c: number) => g.beginFill(c).drawRect(px, py, 1, 1).endFill();
  for (let i = 0; i < h; i++) {
    const dx = i >= h - 3 ? sv : 0;
    prick(x + dx, y - i, i === 0 ? LAGFARG.karna : i < h - 2 ? (i > 2 ? LAGFARG.mitt : LAGFARG.gul) : LAGFARG.spets);
    if (i > 0 && i < h - 2) prick(x + dx + ((i + f) % 2 ? -1 : 1), y - i, LAGFARG.mitt);
  }
  if (f === 1) prick(x + sv * 2, y - h - 1, LAGFARG.spets);
  if (f === 2) prick(x - 1, y - h, LAGFARG.los);
}
import { farg, fargTal } from '../palett';
import { sinHash as hash } from './pixel';
import { s, sakVar, ui, uppgiftVid, vidNyBy } from './lage';
import { Ikoner, TS, bubbleG, figurLayer, labels, symbolLayer, peopleG } from './scen';
import { type Arm, type Ben, type Rikt, figurHand, figurTex } from './folkbild';
import { ARBETEN, STRIDBILD, arbetsBild, ritaArbete } from './arbetsbild';
import { rovarSkapad, handlarSkapad, skapad } from './utseende';
import { gaster } from './gaster';
import { fotSkugga, skuggFolk, skuggLangd } from './skugga';
import { jaktPlats } from './jakt';
import { kartKampe, slagAv } from './stridbild';
import { slag } from './animation';
import { stalle, vidArbetet } from './stalle';
import { hasIcon, iconCanvas, kartbild, ljusSymbol } from '../ikoner';

// människorna på kartan: kroppen, det de bär, pratbubblor, symbolen för vad de gör och namnet
const bubbles: { id: number; kind: string; good: boolean; until: number; i?: string }[] = [];
// vem var och en senast pratade med: bubblan står kvar så länge båda är kvar i samtalet, men bara PRATAR_SEK sekunder
// (spelets tid) efter samtalet: sedan sitter de tysta tills nästa (steg 3.10.3)
const talkWith = new Map<number, number>();
vidNyBy.push(() => { bubbles.length = 0; talkWith.clear(); });
// samtal som startat sedan förra bildrutan (vid tiden som visas, nu): en bubbla i samtalets färg en stund. Samtal som
// hunnit bli gamla, när tiden spolas fram, visas inte
export function addTalks(events: TalkEvent[], now: number, nu: number) {
  let n = 0;
  for (const e of events) {
    if (e.t > nu) break;
    n++;
    if (nu - e.t < 20 * SEC) { bubbles.push({ id: e.a, kind: e.kind, good: e.good, until: now + 2600, i: e.i }); talkWith.set(e.a, e.b); talkWith.set(e.b, e.a); }
  }
  events.splice(0, n);
}
// var personen syns vid tiden som visas: längs vägen hen gick under slaget (spar i steg.ts). På platsen rör man sig lite
// för att det ska se levande ut, bara i bilden: från buske till buske, eller några steg hit och dit
function platsAv(p: Person) {
  const j = jaktPlats(p); // jägaren som smyger, siktar och hämtar (jakt.ts)
  if (j) return { x: j.x, y: j.y, still: false };
  const t = ui.nu, sp = sparPlats(p, t);
  let x = sp?.x ?? p.x, y = sp?.y ?? p.y;
  const still = sp?.still ?? true;
  const tk = uppgiftVid(p), d = tk && ACTS[tk.act];
  const m = tk && iMatchen(tk), sp2 = still && m ? sportPlats(m, p, x, y, t) : undefined;
  if (sp2) return { ...sp2, still }; // sporten (steg 4.5.6.10–11)
  const f = still ? s.filtar?.find(g => g.vem === p.id && !g.handlare && g.slut > t) : undefined;
  if (f) return { ...bakomFilt(s, f), still }; // bakom sin egen filt i ett byte (steg 4.5.7.1)
  // promenaden går på riktigt mellan punkter (steg 6.2.8) och svänger inte. Svängningen går aldrig in i en vägg, ett hus,
  // vattnet eller en station: då blir den kortare, eller ingen alls
  if (still && tk?.phase === 'do' && d && !d.stilla && !d.tur) {
    const w = d.vandra, k = t / SEC, r = w ? w.r * 0.6 : 0.12, f = w ? w.v / (w.r * 6) : 0.05;
    // lek och sport (steg 9.2.91): i vanlig gångfart till en ny punkt, sedan står man still en stund där
    const lek = w && d.slag === 'leka' ? lekGang(p.id, r, (w.h0 + w.h1) / 2, kroppFart(p, t), t) : undefined;
    const dx = lek ? lek.dx : Math.sin(k * f + p.id * 1.7) * r * Math.sin(k * f * 0.37 + p.id), dy = lek ? lek.dy : Math.cos(k * f * 0.83 + p.id * 2.3) * r * Math.sin(k * f * 0.29 + p.id * 0.5);
    const hem = Math.floor(y) * 10000 + Math.floor(x);
    const fri = (nx: number, ny: number) => Math.floor(ny) * 10000 + Math.floor(nx) === hem || !blocked(s, nx, ny) && !stationAt(s, Math.floor(nx), Math.floor(ny));
    for (const del of [1, 0.5, 0.25]) if (fri(x + dx * del, y + dy * del)) { x += dx * del; y += dy * del; break; }
  }
  return { x, y, still };
}
// dragkampen (steg 4.5.6.10), bara i bilden: lagen står på sina platser (sport.ts), hela raden glider fram och tillbaka med
// repet och lutar sig bakåt. Repet ligger på marken medan de samlas och spänns mellan lagen när de drar; strecket i mitten
const DRAG = { glid: 0.3, takt: 0.5, luta: 0.12 };
// sportens saker i punkter ur paletten, som Björn valde i bildstilen (steg 5.5.2): strecket, repet och tofsen,
// stenarna som missat och det som flyger i en båge (en boll med mörk kant)
const SP = { jord: [0, 1, 2, 3].map(i => fargTal(farg('jord', i as 0))), rost: [0, 1, 2, 3].map(i => fargTal(farg('rost', i as 0))), ben: [0, 1, 2, 3].map(i => fargTal(farg('ben', i as 0))), skiffer: [0, 1, 2, 3].map(i => fargTal(farg('skiffer', i as 0))), kol: fargTal(farg('kol', 0)) };
const pt = (x: number, y: number, c: number, w = 1, h = 1) => peopleG.beginFill(c).drawRect(Math.round(x), Math.round(y), w, h).endFill();
const iMatchen = (tk: Task) => { const m = s.sport; return tk.act === 'sport' && tk.phase === 'do' && m && m.start === tk.ref ? m : undefined; };
const dragGlid = (m: Match, t: number) => m.spelat ? DRAG.glid * Math.sin(t / SEC * DRAG.takt + m.start % 7) * Math.sin(t / SEC * DRAG.takt * 0.31 + 1) : 0;
// var spelaren syns (steg 4.5.6.11), med de rörelser som redan finns: i dragkampen lutar de och glider med repet, brottarna
// i mitten trycker mot varandra och ringen runt om hejar, i kast och snöbollskriget står de på sina platser, och i bollspelet
// står den som slår still medan de andra springer på planen (vandra i ACTS, undefined här). Ingen hamnar på marken
function sportPlats(m: Match, p: Person, x: number, y: number, t: number): { x: number; y: number } | undefined {
  const k = t / SEC;
  switch (m.k) {
    case 'dragkamp': return { x: x + dragGlid(m, t) + dragLag(m, x) * DRAG.luta, y };
    case 'brottning': {
      if (Math.abs(x - m.x) < 0.7 && Math.abs(y - m.y) < 0.7) { const tryck = Math.sin(k * 0.9 + m.start % 5) * 0.15; return { x: m.x + Math.sign(x - m.x || 1) * (0.22 + Math.abs(Math.sin(k * 2.1)) * 0.08) + tryck, y: y + Math.sin(k * 1.7 + p.id) * 0.06 }; }
      return { x, y: y + Math.abs(Math.sin(k * 3 + p.id)) * -0.06 }; // hejar
    }
    case 'kast': return { x, y };
    case 'snoboll': { const c = snoCykel(p.id, m, t); return { x: x + c.dx, y: y + c.dy }; }
    case 'bollspel': return x < m.x - 1.5 ? { x, y } : undefined;
  }
  return undefined;
}
// snöbollskriget (steg 9.2.129), bara i bilden: var och en i sin egen takt (P sekunder): böjer sig ner och gör en boll, kastar,
// och flyttar sig sedan och duckar tills nästa boll. f = var i cykeln, n = vilken boll i ordningen, dx/dy = hur figuren flyttas
const SNO = { pMin: 2.2, pVar: 1.4, bojaTill: 0.3, kast: 0.38, flyg: 0.7 };
function snoCykel(id: number, m: Match, t: number) {
  const k = t / SEC + hash(id * 13 + m.start % 89) * 10, P = SNO.pMin + hash(id * 7 + 3) * SNO.pVar, n = Math.floor(k / P), f = k / P - n;
  const boj = f < SNO.bojaTill ? Math.sin(f / SNO.bojaTill * Math.PI) * 0.12 : 0; // böjer sig ner efter snö
  const efter = f > SNO.kast ? (f - SNO.kast) / (1 - SNO.kast) : 0, sida = (hash(id + n * 3) - 0.5) * 0.5;
  return { n, f, P, dx: Math.sin(efter * Math.PI) * sida, dy: boj + (efter > 0.6 && efter < 0.8 ? 0.08 : 0) }; // flyttar sig åt sidan och duckar
}
// något som flyger i en båge från a till b, f = 0–1 av vägen: en boll i punkter (kol runt om, rampens ton i mitten) och
// dess skugga på marken
function flyg(ax: number, ay: number, bx: number, by: number, f: number, ramp: number[], ton: number, h: number) {
  const x = Math.round(ax + (bx - ax) * f), y = Math.round(ay + (by - ay) * f - h * 4 * f * (1 - f)), gy = Math.round(ay + (by - ay) * f) + 2;
  pt(x - 1, gy, 0x372f25, 3, 1);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const r = Math.abs(dx) + Math.abs(dy);
    if (r > 2 && !(Math.abs(dx) < 2 && Math.abs(dy) < 2)) continue;
    pt(x + dx, y + dy, r >= 2 && !(Math.abs(dx) === 1 && Math.abs(dy) === 1) ? SP.kol : ramp[dx + dy < 0 ? ton : Math.max(0, ton - 1)]);
  }
}
// ett litet stänk av snö där en snöboll träffar (steg 9.2.129): några punkter ur paletten som flyger ut och faller, g = 0–0.5 av tiden
function snoStank(x: number, y: number, g: number) {
  const r = 1 + g * 8, a = 1 - g * 2;
  if (a <= 0) return;
  for (let i = 0; i < 6; i++) { const v = i * Math.PI / 3 + 0.4; pt(x + Math.cos(v) * r, y + Math.sin(v) * r * 0.6 + g * 6, SP.ben[i % 2 ? 3 : 2]); }
}
// det som syns runt matchen, bara i bilden: repet och strecket, målet, bollen och det som kastas
function ritaSport(t: number) {
  const m = s.sport;
  if (!m || s.now >= m.slut) return;
  if (m.k === 'dragkamp') { ritaDragkamp(m, t); return; }
  const k = t / SEC, med: { x: number; y: number }[] = [];
  for (const p of living(s)) { const tk = uppgiftVid(p); if (tk && iMatchen(tk)) { const q = synlig.get(p.id); if (q) med.push({ x: q.x * TS, y: q.y * TS }); } } // (platsen i bilden: synlig)
  const mx = m.x * TS, my = m.y * TS;
  if (m.k === 'kast') {
    const mal = kastMal(m), ax = mal.x * TS, ay = mal.y * TS;
    markIcons.add('mal', ax - 4, ay - 6, 8 / iconCanvas('mal').width);
    if (!m.spelat || !med.length) return;
    med.sort((a, b) => a.y - b.y);
    const P = 2.2, n = Math.floor(k / P), f = k / P - n, v = med[n % med.length], miss = hash(n + m.start % 97) < 0.4;
    for (const d of [-12, 8]) pt(ax + d, ay + 5, SP.skiffer[2], 2, 1); // stenar som missat ligger i gräset
    if (f < 0.6) flyg(v.x + 3, v.y - 3, ax + (miss ? (hash(n) - 0.5) * 18 : 0), ay + (miss ? 5 : -2), f / 0.6, SP.skiffer, 3, 10); // i tur och ordning: träff eller miss
  } else if (m.k === 'snoboll') {
    // inga vallar (steg 9.2.129): var och en kastar i sin egen takt mot någon i andra laget, så att flera bollar är i luften i olika
    // bågar, och en träff ger ett litet stänk av snö (platshållare i paletten tills ett stänk valts i bildstilen)
    if (!m.spelat) return;
    const lag = [med.filter(q => q.x < mx), med.filter(q => q.x >= mx)];
    if (!lag[0].length || !lag[1].length) return;
    for (const p of living(s)) {
      const tk = uppgiftVid(p), q = tk && iMatchen(tk) ? synlig.get(p.id) : undefined;
      if (!q) continue;
      const c = snoCykel(p.id, m, t), mot = lag[q.x * TS < mx ? 1 : 0], b = mot[Math.floor(hash(p.id * 5 + c.n) * mot.length)];
      const a = { x: q.x * TS, y: q.y * TS }, ff = (c.f - SNO.kast) / (SNO.flyg - SNO.kast);
      if (ff >= 0 && ff < 1) flyg(a.x + 2, a.y - 5, b.x, b.y - 4, ff, SP.ben, 3, 6 + hash(p.id + c.n * 11) * 12);
      else if (ff >= 1 && ff < 1.5 && hash(p.id * 3 + c.n) < 0.6) snoStank(b.x, b.y - 4, ff - 1); // träff
    }
  } else if (m.k === 'bollspel') {
    const slag = med.length ? med.reduce((a, b) => (a.x < b.x ? a : b)) : { x: mx - SPORT.slagAvst * TS, y: my };
    markIcons.add('slagtra', Math.round(slag.x + 1), Math.round(slag.y - 16), 1); // i sina egna 16 punkter som i bildstilen (steg 5.5.1: hel skala)
    const P = 4, n = Math.floor(k / P), f = k / P - n, bx = mx + (hash(n) * 3) * TS, by = my + (hash(n + 3) - 0.5) * 4 * TS;
    if (!m.spelat) { markIcons.add('boll_liten', Math.round(mx - 3), Math.round(my - 3), 1); return; }
    if (f < 0.5) flyg(slag.x + 3, slag.y - 3, bx, by, f / 0.5, SP.jord, 2, 14); // slaget flyger ut på planen ...
    else markIcons.add('boll_liten', Math.round(bx - 3), Math.round(by - 3), 1); // ... och ligger där tills någon hinner fram
  }
}
function ritaDragkamp(m: Match, t: number) {
  const mx = Math.round(m.x * TS), my = Math.round(m.y * TS);
  pt(mx, my - 9, SP.jord[0], 1, 19); pt(mx + 1, my - 9, SP.jord[1], 1, 19); // strecket ristat i marken
  const xs: number[] = [];
  for (const p of living(s)) { const tk = uppgiftVid(p); if (tk && iMatchen(tk)) { const q = synlig.get(p.id); if (q) xs.push(q.x * TS); } } // (platsen i bilden: synlig)
  if (!m.spelat || xs.length < 2) { // repet ligger hoprullat på marken medan de samlas
    for (let i = 0; i < 22; i++) pt(mx - 22 + i, my + 2 + (Math.floor(i / 3) % 2), SP.jord[i % 2 ? 1 : 2]);
    return;
  }
  const glid = Math.round(dragGlid(m, t) * TS), a = Math.round(Math.min(...xs) - 3), b = Math.round(Math.max(...xs) + 3), ry = my - 1;
  pt(a, ry, SP.jord[2], b - a + 1, 1); pt(a, ry + 1, SP.jord[1], b - a + 1, 1); // repet spänt mellan lagen
  pt(mx + glid, ry - 1, SP.rost[2], 1, 5); pt(mx + glid + 1, ry - 1, SP.rost[1], 1, 5); // tofsen mitt på repet, som ska dras över strecket
}
// de som står still sprider ut sig lite så att de inte står i varandra (Björn efter v89), bara i bilden. Den som går rör
// sig inte undan och knuffar ingen, så att man kan mötas i en smal gång. SPRID = avståndet de vill ha (rutor), NARMRE = hur
// långt från sin plats man högst flyttar sig
const SPRID = 0.55, NARMRE = 0.4;
let synlig = new Map<number, { x: number; y: number }>(), synligNu = NaN;
// inga hopp (steg 6.8.4): flyttar sig någon mer än en bit på en bildruta, när hen byter aktivitet och platsen vid arbetet
// skiljer sig från den där hen stod, ritas hen där hen var och glider till den nya platsen. Längre hopp (in i ett hus,
// en ny by) sker direkt
const HOPP = 0.35, HOPP_MAX = 4, GLID_MS = 130; // rutor på en bildruta som räknas som ett hopp, det längsta som glider, glidningens halva tid
const glidning = new Map<number, { x: number; y: number; ox: number; oy: number; t: number }>();
vidNyBy.push(() => glidning.clear());
function glid(id: number, q: { x: number; y: number }, nu: number) {
  const e = glidning.get(id);
  let ox = 0, oy = 0;
  if (e) {
    const f = Math.exp(-Math.max(0, nu - e.t) / GLID_MS * Math.LN2), dx = q.x - e.x, dy = q.y - e.y, d = Math.hypot(dx, dy);
    ox = e.ox * f; oy = e.oy * f;
    if (d > HOPP && d < HOPP_MAX) { ox -= dx; oy -= dy; }
    else if (d >= HOPP_MAX) ox = oy = 0;
    if (Math.abs(ox) + Math.abs(oy) < 0.01) ox = oy = 0;
  }
  glidning.set(id, { x: q.x, y: q.y, ox, oy, t: nu }); // (platsen i bilden)
  return ox || oy ? { x: q.x + ox, y: q.y + oy } : q;
}
function sprid(ppl: Person[]) {
  const q = ppl.map(p => ({ id: p.id, ...platsAv(p) })), bas = q.map(o => ({ x: o.x, y: o.y }));
  for (let varv = 0; varv < 3; varv++) for (let i = 0; i < q.length; i++) for (let j = i + 1; j < q.length; j++) {
    const a = q[i], b = q[j];
    if (!a.still || !b.still) continue;
    let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d >= SPRID) continue;
    if (d < 1e-4) { const v = (a.id * 2.399 + b.id) % (Math.PI * 2); dx = Math.cos(v); dy = Math.sin(v); d = 1; } // på samma punkt: ett håll efter vilka de är
    const k = (SPRID - Math.min(d, SPRID)) / 2 / d;
    a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k;
  }
  const m = new Map<number, { x: number; y: number }>();
  q.forEach((o, i) => {
    const ox = o.x - bas[i].x, oy = o.y - bas[i].y, l = Math.hypot(ox, oy), f = l > NARMRE ? NARMRE / l : 1;
    m.set(o.id, { x: bas[i].x + ox * f, y: bas[i].y + oy * f });
  });
  return m;
}
// där personen syns: samma plats som i bilden som ritades senast, så att ett tryck träffar rätt (kameran frågar innan
// bilden ritas och får då platsen innan de som står tätt knuffats isär)
export function posOf(p: Person) {
  const q = synligNu === ui.nu ? synlig.get(p.id) : undefined;
  if (q) return q;
  const { x, y } = platsAv(p);
  return { x, y };
}
// symbolen över huvudet: slaget av arbete man gör på platsen (SLAG i handlingar.ts), eller handlingens egen (toa, steg 3.10.3)
function markOf(p: Person): string | undefined {
  const j = jaktPlats(p);
  if (j) return j.mark ?? 'a_jaga'; // smyger, siktar eller jagar (jakt.ts)
  const t = uppgiftVid(p);
  return t?.phase === 'do' ? utbIkon(t) ?? actIkon(t.act) : undefined;
}
// pratbubblan (steg 3.10.3): samma ruta som arbetssymbolerna, med pratbubblan i pixlar eller ämnets symbol (ikon, steg 3.9.5).
// Kanten följer samtalet och relationen: rött gräl, rosa flirt eller kärlek, guld berättelse, grönt vänner, mörkrött ovänner
const PRAT_FARG = 0xdad0bb, PRAT_KANT = 0x372f25; // pratbubblans ljusa botten och mörka kant
function pratRuta(x: number, top: number, bob: number, kind: string | undefined, rel: 'karlek' | 'van' | 'ovan' | 'neutral', ikon?: string) {
  const kant = kind === 'gräl' ? 0xa14808 : kind === 'flirt' ? 0xbd753e : kind === 'berättelse' ? 0xd8b25f
    : rel === 'karlek' ? 0xbd753e : rel === 'ovan' ? 0x742a01 : rel === 'van' ? 0x647025 : undefined;
  // en ljus, rundad pratbubbla med en spets ner mot den som pratar, så att den inte ser ut som arbetets mörka ruta (steg 4.5.6.9)
  const y0 = top + bob, linje = kant ?? PRAT_KANT, b = kant !== undefined ? 1.2 : 0.8;
  // en enda storlek, den lilla (steg 9.2.10): tecknet i 8 punkter. Ett ämne har sin egen symbol i 8 punkter (amneIkon), och en
  // bild som är större än 8 punkter visas som det vanliga tecknet, så att inget ritas i halv storlek
  const k = ikon && hasIcon(ikon) && (iconCanvas(ikon).width || 8) <= 8 ? ikon : 'a_prata';
  bubbleG.lineStyle(b, linje).beginFill(PRAT_FARG).drawRoundedRect(x - 6, y0 - 6, 12, 11, 4).endFill();
  bubbleG.lineStyle(0).beginFill(PRAT_FARG).drawPolygon([x - 2.6, y0 + 4.4, x + 1.4, y0 + 4.4, x - 1.8, y0 + 8.2]).endFill();
  bubbleG.lineStyle(b, linje).moveTo(x - 2.6, y0 + 5).lineTo(x - 1.8, y0 + 8.2).lineTo(x + 1.4, y0 + 5).lineStyle(0);
  markIcons.add(k, x - 4, top - 4.5 + bob, 1, ljusSymbol(k) ? PRAT_KANT : 0xffffff);
}
// ämnets symbol i 8 punkter (steg 9.2.10): en per ämne i AMNEN, vädret efter sin sort
function amneIkon(x: { k: string; i?: string } | undefined) {
  if (!x) return undefined;
  const k = x.k === 'vader' ? 'amne_vader_' + (x.i?.replace('vader_', '') ?? 'klart') : 'amne_' + x.k;
  return hasIcon(k) ? k : undefined;
}
const markIcons = new Ikoner(symbolLayer);
// en sak med mitten i (cx, cy): kartbilden i sin naturliga storlek, annars den gamla bilden storlek punkter stor
function bar(k: string, cx: number, cy: number, storlek: number) {
  const kb = kartbild(k), c = iconCanvas(kb ?? k), sc = kb ? 1 : storlek / (c.width || 8);
  markIcons.add(kb ?? k, Math.round(cx - c.width * sc / 2), Math.round(cy - c.height * sc / 2), sc);
}
// namnet över den valda och den under musen. Två texter som återanvänds: att skapa en text varje bildruta är dyrt
// Pixelify Sans som brödtexten (steg 5.3.2.3), i panelens ljusa och mörka färg; när typsnittet laddats ritas namnen om med det
const NAMNFONT = '"Pixelify Sans", system-ui, sans-serif';
const nameStyle = new PIXI.TextStyle({ fontFamily: NAMNFONT, fontSize: 22, fill: 0xdad0bb, stroke: 0x24201d, strokeThickness: 5, fontWeight: '700' });
if (typeof document !== 'undefined') document.fonts?.ready.then(() => { nameStyle.fontFamily = 'system-ui'; nameStyle.fontFamily = NAMNFONT; });
const nameTags = [0, 1].map(() => { const tx = new PIXI.Text('', nameStyle); tx.scale.set(0.5); tx.anchor.set(0.5, 1); tx.visible = false; labels.addChild(tx); return tx; });
// tiden kvar till förblödning (steg 9.5.14): en röd siffra i minuter över huvudet när den är kort (HALSA.kortTim)
const blodStyle = new PIXI.TextStyle({ fontFamily: NAMNFONT, fontSize: 20, fill: 0xa14808, stroke: 0x24201d, strokeThickness: 5, fontWeight: '700' });
const blodTexter: PIXI.Text[] = [];
// de ur byn som slåss i testarenan: de syns bara i striden (ui/arena.ts)
export const dolda = new Set<number>();
// figurerna, en sprite per person som återanvänds
const figurer = new Map<number, PIXI.Sprite>(), sedd = new Set<number>();
function figurAv(id: number) {
  let sp = figurer.get(id);
  if (!sp) { sp = new PIXI.Sprite(); figurer.set(id, sp); figurLayer.addChild(sp); }
  return sp;
}
// kartfigurens läge (steg 5.2.3.2, Kartfigurens lägen) efter det personen gör: riktningen efter hur hen rört sig sedan förra
// bildrutan (står kvar när hen står still), sittande vid måltiden, samtalet och vilan, armarna fulla när hen bär något, i
// slaget vid de tunga arbetena och framför sig vid stationen. Den som rört sig nyss går (steg 5.1.9.3): gångsteg 1, stå,
// gångsteg 2, stå, som bildstilens gång, en bild per slag i animationernas klocka (ui/animation.ts) och förskjutet per person
const huvud = new Map<number, number>(), SYMBOL_LUFT = 8; // figurens översta punkt i bildrutan, och så långt ovanför den symbolens mitt står
vidNyBy.push(() => huvud.clear());
// striden hen är med i just nu (steg 5.1.9.5): vapnet och var den närmaste motståndaren står, ur byns senaste strider
function stridNu(p: Person): { vapen: string; mot?: { x: number; y: number }; ruta?: number } | undefined {
  // striden på kartan (steg 10.1.5): vapnet och målet är kämpens, och armen gör slagets rörelse just när ett slag sker (ruta 0 annars)
  const kk = kartKampe(s, p);
  if (kk) { const sl = slagAv(p.id, ui.nu); return { vapen: kk.k.vapen as string, mot: sl?.mot ?? kk.mot, ruta: sl ? Math.min(3, Math.floor(sl.andel * 4)) : 0 }; }
  return undefined;
}
const SLA = new Set(['falla', 'bygga', 'krossa', 'slakta', 'yxa', 'dorr']);
const forra = new Map<number, { x: number; y: number; rx: number; ry: number; rikt: Rikt; rorde: boolean }>();
const GANG: [Ben, Arm][] = [['gang1', 'gang1'], ['sta', 'hanga'], ['gang2', 'gang2'], ['sta', 'hanga']];
// figuren går bara när den flyttat sig sedan förra bilden (steg 10.2.55): den som står still går aldrig i bilden
const gar = (id: number) => !!forra.get(id)?.rorde;
vidNyBy.push(() => forra.clear());
const SVANG = 2; // hur mycket större det nya hållet ska vara för att figuren ska vända sig (steg 6.8.2)
// (rx, ry) = platsen utan knuffarna och glidningen i bilden: bara den räknas som att hen går (steg 8.1.2), så att den som står vid latrinen eller dricker vatten står stilla i bilden
function riktning(id: number, x: number, y: number, rx = x, ry = y): Rikt {
  const f = forra.get(id); let rikt: Rikt = f?.rikt ?? 'fram', rorde = false;
  if (f) {
    const dx = x - f.x, dy = y - f.y;
    if (Math.abs(dx) + Math.abs(dy) > 0.01) {
      const ny: Rikt = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'sida' : 'vast') : dy > 0 ? 'fram' : 'bak';
      // den som går snett håller sin riktning tills hen svänger tydligt (steg 6.8.2): den gamla riktningen står kvar så
      // länge hen fortfarande rör sig åt det hållet och det andra hållet inte är minst SVANG gånger större
      const langs = rikt === 'sida' ? dx : rikt === 'vast' ? -dx : rikt === 'fram' ? dy : -dy;
      const tvars = rikt === 'sida' || rikt === 'vast' ? Math.abs(dy) : Math.abs(dx);
      if (!(langs > 0 && tvars < langs * SVANG)) rikt = ny;
    }
    rorde = Math.abs(rx - f.rx) + Math.abs(ry - f.ry) > 1e-4;
  }
  forra.set(id, { x, y, rx, ry, rikt, rorde });
  return rikt;
}
// gästerna: handlaren som en person (steg 8.1.8) och rövarna (steg 6.6.12), figurer ur skaparen som byborna (ui/utseende.ts), som går, slåss med sitt vapen mot
// den de slår och ligger när de fallit. Arga i striden och rädda på flykten
// markeringen runt den valda försvinner när man markerar något annat (steg 6.8.12): då är en ruta för det andra öppen
const markeradNu = () => ui.tab === undefined || ui.tab === 'person' ? ui.selected : undefined;
// bytet rövaren bär syns på figuren (steg 10.2.28): det hen har mest av, vid handen
const bytesIkoner = new Ikoner(figurLayer, true);
function ritaRovarna(skugga: PIXI.Graphics) {
  bytesIkoner.start();
  for (const g of gaster()) {
    // i striden på kartan (steg 10.1.14): kämpen är personen, och armen gör slagets rörelse just när ett slag sker (ui/stridbild.ts)
    const gp = s.people.find(q => q.id === g.id && q.gast), kk = gp && kartKampe(s, gp), sl = kk ? slagAv(g.id, ui.nu) : undefined;
    const r = g.rovare, sk = kk ? { k: kk.k, mot: sl?.mot ?? kk.mot } : undefined, ligger = !!g.ligger || !!kk?.ligger, x = g.x * TS, y = g.y * TS;
    let rikt = riktning(g.id, g.x, g.y);
    const strid = sk && !ligger ? STRIDBILD[sk.k.vapen as string] ?? STRIDBILD.hand : undefined, ab = strid ? arbetsBild(strid, kk ? (sl ? Math.min(3, Math.floor(sl.andel * 4)) : 0) : slag() - g.id) : undefined;
    if (sk?.mot) rikt = sk.mot.x < g.x ? 'vast' : 'sida';
    const steg = !ligger && !ab && gar(g.id) ? GANG[(slag() - g.id) % 4] : undefined;
    const ben: Ben = ab ? ab.ben : steg ? steg[0] : 'sta', arm: Arm = ab ? ab.arm : steg ? steg[1] : 'hanga';
    const humor = sk ? 'arg' : s.rovare?.gor === 'flyr' ? 'radd' : 'lugn';
    const sp = figurAv(g.id);
    sp.texture = figurTex(r ? rovarSkapad(s, r, humor) : g.sort === 'Främling' ? skapad(s, g.p) : handlarSkapad(s, g.namn, g.sex, s.people.find(q => q.id === g.id && q.gast)), { rikt, ben, arm, ligga: ligger }, g.id === markeradNu());
    const w = sp.texture.width, h = sp.texture.height;
    if (ligger) sp.position.set(x - w / 2, y - h / 2);
    else sp.position.set(x - w / 2 + (ab?.b.ut ?? 0) * (rikt === 'vast' ? -1 : 1), y + 5 * 0.9 - h + 1);
    const hand = ab && figurHand(sp.texture);
    if (strid && ab && hand) ritaArbete(peopleG, strid, ab.b, sp.position.x + hand[0], sp.position.y + hand[1], rikt === 'vast' ? -1 : 1, 1);
    sp.zIndex = y + 5 * 0.9;
    if (!ligger) fotSkugga(skugga, x - 4, Math.round(sp.zIndex) - 1, 4, 2, skuggLangd());
    sp.visible = true; sedd.add(g.id);
    // rövaren som pratar med en annan i gänget (steg 10.2.24): bubblan som byns
    const bb = r && !sk ? bubbles.find(q => q.id === r.id && q.until >= performance.now()) : undefined;
    if (bb) pratRuta(x, sp.position.y - SYMBOL_LUFT, Math.sin(performance.now() / 500 + r!.id) * 0.6, bb.kind, 'neutral', bb.i);
    const byte = r && !ligger ? Object.entries(r.gast?.bar ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] : undefined;
    if (byte) bytesIkoner.add(byte, Math.round(sp.position.x + w - 4), Math.round(sp.position.y + h / 2 - 2), 1);
  }
  bytesIkoner.end();
}
export function drawPeople(t: number) {
  peopleG.clear(); bubbleG.clear();
  sedd.clear();
  const skugga = skuggFolk().clear().beginFill(0xffffff); // skuggorna vid fötterna (steg 5.1.8, ui/skugga.ts)
  const ppl = dolda.size ? living(s).filter(p => !dolda.has(p.id)) : living(s), pos = new Map<number, { x: number; y: number }>();
  synlig = sprid(ppl); synligNu = ui.nu;
  { const nu = performance.now(); for (const [id, q] of synlig) synlig.set(id, glid(id, q, nu)); }
  markIcons.start();
  ritaSport(t);
  const markerad = markeradNu();
  const sv = ui.tab === 'sak' ? sakVar() : undefined, harSaken = sv && 'person' in sv ? sv.person : undefined; // den som har den markerade saken (steg 3.10.4)
  for (const p of ppl) {
    const a = ageOf(p, s.now);
    const r = a < ALDER.smabarn ? 2.8 : a < ALDER.vuxen ? 3.8 : 5;
    const q = posOf(p);
    let x = q.x * TS, y = q.y * TS;
    pos.set(p.id, q);
    const tk = uppgiftVid(p), sleeping = !!tk && soverNu(p, tk); // den som går till sängen går upprätt och lägger sig först i bädden (steg 9.2.89)
    // figuren ur porträttgeneratorn (steg 5.2.3.2, ui/folkbild.ts) med fötterna under punkten; den som sover eller inte kan
    // gå ligger ner (steg 3.7.19), under täcket när hen sover, och de minsta barnen har en egen, lägre mall i hel skala (steg 5.5.5)
    const sp = figurAv(p.id), ligger = sleeping || !kanGa(p) || !!kartKampe(s, p)?.ligger, liten = a < ALDER.smabarn;
    const gor = tk?.phase === 'do' ? tk.act : undefined;
    // vid en bänk med stol (steg 6.8.6): den som arbetar på rutan framför sitter på stolen, vänd mot bänken, med arbetets
    // rörelse i armarna
    const bank = gor && !ligger ? stationAt(s, q.x, q.y - 1) : undefined, bd = bank && isKlar(bank) ? stationDef(bank.k) : undefined;
    const vidBank = !!(bank && bd?.sitt && bd.gor.includes(gor as never) && Math.floor(q.y) === bank.y + storlekAv(bank).h);
    const ra = platsAv(p);
    let rikt = riktning(p.id, q.x, q.y, ra.x, ra.y);
    // sitter bara på en sittplats, går bara när hen flyttat sig (steg 10.2.55, ui/stalle.ts)
    const st = stalle(s, { ligger, gor, x: q.x, y: q.y, vidBank, rorde: gar(p.id) }), sitter = st === 'sitta';
    if (sitter && rikt === 'bak') rikt = 'fram';
    // stå vid arbetet (steg 10.2.78): på en ruta intill arbetsrutan och vänd mot den
    const va = !ligger ? vidArbetet(s, gor, q.x, q.y) : undefined;
    if (va) { x = va.x * TS; y = va.y * TS; rikt = va.rikt; }
    if (vidBank) { rikt = 'bak'; x = (bank!.x + storlekAv(bank!).w / 2) * TS; y = (bank!.y + storlekAv(bank!).h) * TS + TS / 2 - r * 0.9; }
    // arbetet i bild (steg 5.1.9.4, ui/arbetsbild.ts): rörelsen från sidan, en bild per slag, förskjutet per person
    const strid = gor === 'strid' && !ligger ? stridNu(p) : undefined;
    const arb = strid ? STRIDBILD[strid.vapen] ?? STRIDBILD.hand : !ligger && (!sitter || vidBank) && gor && (gor === 'bygga' || !(tk && load(tk, s) > 0)) ? ARBETEN[gor] : undefined; // byggaren har materialet i händerna medan hen bygger (steg 9.2.90)
    const ab = arb ? arbetsBild(arb, strid?.ruta ?? slag() + p.id) : undefined; // i striden på kartan styr slaget rörelsen, inte klockan
    if (strid?.mot) rikt = strid.mot.x < q.x ? 'vast' : 'sida'; // vänd mot motståndaren (steg 5.1.9.5)
    else if (ab && !vidBank && rikt !== 'sida' && rikt !== 'vast') rikt = p.id % 2 ? 'vast' : 'sida';
    const steg = st === 'ga' ? GANG[(slag() + p.id) % 4] : undefined;
    const ben: Ben = sitter ? 'sitta' : ab ? ab.ben : steg ? steg[0] : 'sta';
    let arm: Arm = tk && load(tk, s) > 0 && gor !== 'bygga' ? 'bara' : gor && SLA.has(gor) ? 'sla' : gor === 'station' ? 'framfor' : 'hanga';
    if (steg && arm === 'hanga') arm = steg[1];
    if (ab) arm = ab.arm;
    // sängen (steg 6.8.5): den som sover i en färdig säng ligger mitt i den med huvudet i bäddens huvudände (vänster i den
    // liggande bädden, uppåt i den stående), och bara under ett byggt täcke (ett tillbehör i bädden, skinnfällen) har hen täcke
    const badd = sleeping ? stationAt(s, q.x, q.y) : undefined, sang = badd && isKlar(badd) && stationDef(badd.k)?.sover ? badd : undefined;
    sp.texture = figurTex(skapad(s, p), { rikt, ben, arm, ligga: ligger, tacke: !!sang?.med?.length, smabarn: liten || undefined }, p.id === markerad || p.id === harSaken);
    const w = sp.texture.width, h = sp.texture.height;
    sp.anchor.set(0); sp.rotation = 0; sp.scale.x = 1;
    if (sang) {
      const { w: bw, h: bh } = storlekAv(sang);
      sp.anchor.set(0.5); sp.position.set((sang.x + bw / 2) * TS, (sang.y + bh / 2) * TS - 2);
      if (bh > bw) sp.rotation = -Math.PI / 2; else sp.scale.x = -1;
    } else if (ligger) sp.position.set(x - w / 2, y - h / 2);
    else sp.position.set(x - w / 2 + (ab?.b.ut ?? 0) * (rikt === 'vast' ? -1 : 1), y + r * 0.9 - h + 1);
    const hand = ab && figurHand(sp.texture);
    if (arb && ab && hand) ritaArbete(peopleG, arb, ab.b, sp.position.x + hand[0], sp.position.y + hand[1], rikt === 'vast' ? -1 : 1, 1);
    sp.zIndex = y + r * 0.9; // fötterna (ordningen söderut, steg 5.1.4.5)
    huvud.set(p.id, sang ? sp.position.y - h / 2 : sp.position.y);
    if (!ligger) fotSkugga(skugga, x - 4, Math.round(sp.zIndex) - 1, 4, 2, skuggLangd());
    sp.visible = true; sedd.add(p.id);
    // den som brinner (steg 6.4.16): Björns val i bildstilen (f6_brinner, den vänstra figuren, steg 8.10.1): sex lågor på
    // axlarna, armarna och i håret som fladdrar var och en i sin takt (fyra bilder): varje låga växer och krymper, toppen
    // slår åt sidan och ibland slits en lös flamma av
    if (p.brinner !== undefined) {
      const ruta = Math.floor(performance.now() / BRAND_TAKT), cx = Math.round(sp.position.x + w / 2), fot = Math.round(sp.position.y + h) - 1, hw = Math.floor(w / 2);
      ([[-hw + 1, 0.62, 9], [hw - 2, 0.62, 9], [-1, 0.95, 7], [1, 0.97, 9], [-hw, 0.42, 7], [hw - 1, 0.42, 7]] as const)
        .forEach(([dx, dy, l], k) => laga(peopleG, cx + dx, fot - Math.round(h * dy), l, (ruta + k * 3 + p.id) % 4));
    }
    // det man bär syns på figuren, hur lite det än är (steg 3.6.5): framför kroppen, och med en kartbild ur bildstilen i sin
    // naturliga storlek (steg 5.1.2.1)
    // varje hand sitt eget (steg 6.1.2): två slag syns i var sin hand, ett slag framför kroppen som förut
    if (tk && load(tk, s) > 0) {
      // i famnen (steg 6.8.3): figurens hand i armläget bära, räknat från figuren, så att saken följer den mjukt
      const ih = bordaIHander(s, p, tk, utrustning(s, p, true)), sv = rikt === 'vast' ? -1 : 1, fh = !ligger && figurHand(sp.texture);
      const fx = fh ? sp.position.x + fh[0] + 0.5 : x, fy = fh ? sp.position.y + fh[1] + 0.5 : y - r * 0.4;
      if (ih.hoger && ih.vanster && ih.hoger.k !== ih.vanster.k) { bar(ih.hoger.k, fx + 2.5 * sv, fy, 4.8); bar(ih.vanster.k, fx - 2.5 * sv, fy, 4.8); }
      else bar(ih.hoger?.k ?? ih.vanster?.k ?? homeKind(tk), fx, fy, 4.8);
    }
    const mal = tk?.act === 'maltid' && tk.phase === 'do' && tk.mal, bord = mal && hasIcon(mal) ? bordVid(s, q) : undefined; // (vid bordet där hen syns sitta)
    if (mal && bord) { // den som äter vid bordet har maten i händerna och framför sig på bordet (steg 3.10.3)
      const { w, h } = storlekAv(bord), dx = (bord.x + w / 2) * TS - x, dy = (bord.y + h / 2) * TS - y, d = Math.hypot(dx, dy) || 1, f = Math.min(1, TS * 0.7 / d);
      const fh = figurHand(sp.texture);
      bar(mal, fh ? sp.position.x + fh[0] + 0.5 : x + r - 0.1, fh ? sp.position.y + fh[1] + 0.5 : y - r * 0.4, 4.8);
      bar(mal, x + dx * f, y + dy * f, 4.8);
    }
  }
  ritaRovarna(skugga);
  for (const [id, sp] of figurer) if (!sedd.has(id)) { sp.destroy(); figurer.delete(id); }
  // pågående samtal och symboler
  const flash = new Map<number, string>();
  const flashIkon = new Map<number, string | undefined>();
  for (let i = bubbles.length - 1; i >= 0; i--) { const b = bubbles[i]; if (b.until < t) bubbles.splice(i, 1); else { flash.set(b.id, b.kind); flashIkon.set(b.id, b.i); } }
  for (const p of ppl) {
    // symbolerna står ovanför huvudet med lite luft emellan, så att ansiktet alltid syns (steg 8.1.17): räknat från figurens egen topp
    const pp = pos.get(p.id)!, x = pp.x * TS, top = (huvud.get(p.id) ?? pp.y * TS - 13) - SYMBOL_LUFT;
    const o = talkWith.get(p.id), q = o !== undefined ? byId(s, o) : undefined;
    // bara medan de pratar: en stund efter samtalet (steg 3.10.3), inte så länge de sitter nära varandra
    const talking = !!q && pratarMed(s, p) === q;
    if (!talking && o !== undefined && !flash.has(p.id)) talkWith.delete(p.id);
    const medGast = o !== undefined && o < 0 && flash.has(p.id); // småprat med handlaren (steg 4.5.4.15)
    if (talking || flash.has(p.id) && (isSocial(p) || medGast)) { // bara den som gör något socialt just nu, som personrutan säger (steg 2.3.7)
      const r = q ? s.rels[relKey(p.id, q.id)] : undefined;
      // bubblans färg: kär (partnern eller mycket romans), grälar (som i folk.ts), goda vänner eller annars
      const rel = q && (p.partner === q.id || (r?.rom ?? 0) > 40) ? 'karlek' : (r?.op ?? 0) < REL.gral ? 'ovan' : (r?.op ?? 0) > REL.van ? 'van' : 'neutral';
      const ikon = (flash.has(p.id) || q && p.prat?.m === q.id) ? amneIkon(p.prat) : undefined; // ämnet (steg 3.9.5, 9.2.10)
      pratRuta(x, top, Math.sin(t / 500 + p.id) * 0.6, flash.get(p.id), rel, ikon);
      if (medGast && s.handlare?.id === o) { const hp = handlarPlats(s, s.handlare, ui.nu); pratRuta(hp.x * TS, hp.y * TS - 13, Math.sin(t / 500) * 0.6, flash.get(p.id), 'neutral'); } // handlaren pratar också
      continue;
    }
    // vid handlarens filt (steg 4.4.1.5 och 4.5.7.4): bybon frågar vad handlaren har och hen svarar med varornas symboler, en i
    // taget; sedan visar bybon sitt bud och handlaren det bybon vill köpa
    const hn = handlarNu(s, p);
    if (hn && s.handlare) {
      const i = Math.floor(t / 1400 + p.id), en = (v: string[]) => v.length ? v[i % v.length] : undefined;
      pratRuta(x, top, Math.sin(t / 500 + p.id) * 0.6, undefined, 'neutral', en(hn.bybo));
      const hp = handlarPlats(s, s.handlare, ui.nu);
      pratRuta(hp.x * TS, hp.y * TS - 13, Math.sin(t / 500) * 0.6, undefined, 'neutral', en(hn.handlare));
      continue;
    }
    const m = markOf(p);
    if (m) {
      const bob = Math.sin(t / 500 + p.id) * 0.6;
      bubbleG.beginFill(0x24201d).drawRoundedRect(x - 5, top - 5 + bob, 10, 10, 3).endFill();
      markIcons.add(m, x - 4, top - 4 + bob, 8 / iconCanvas(m).width);
    }
  }
  markIcons.end();
  let n = 0;
  for (const p of [byId(s, ui.selected), ui.hovered !== ui.selected ? byId(s, ui.hovered) : undefined]) {
    if (!p || !alive(p)) continue;
    const tx = nameTags[n++];
    if (tx.text !== p.name) tx.text = p.name;
    // namnet ovanför figuren, det hen bär på huvudet och symbolen över huvudet (steg 9.2.27), så att det inte täcker figuren
    // eller den som står bredvid
    const q = posOf(p), topp = huvud.get(p.id) ?? q.y * TS - 13; tx.position.set(q.x * TS, topp - SYMBOL_LUFT - 6); tx.visible = true;
  }
  for (; n < nameTags.length; n++) nameTags[n].visible = false;
  let b = 0;
  for (const p of living(s)) {
    const kvar = tidKvar(p);
    if (kvar >= HALSA.kortTim || dolda.has(p.id)) continue;
    const tx = blodTexter[b] ?? (blodTexter[b] = (() => { const t2 = new PIXI.Text('', blodStyle); t2.scale.set(0.5); t2.anchor.set(0.5, 1); labels.addChild(t2); return t2; })());
    b++;
    const txt = `${Math.max(1, Math.round(kvar * 60))}`;
    if (tx.text !== txt) tx.text = txt;
    const q = posOf(p), topp = huvud.get(p.id) ?? q.y * TS - 13; tx.position.set(q.x * TS + 8, topp - 2); tx.visible = true;
  }
  for (; b < blodTexter.length; b++) blodTexter[b].visible = false;
}
