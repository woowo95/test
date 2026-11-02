import * as PIXI from 'pixi.js';
import { ACTS, ALDER, Person, actIkon, utbIkon, SEC, TalkEvent, ageOf, alive, bordVid, byId, homeKind, isSocial, pratarMed, kanGa, living, load, REL, relKey, sparPlats, storlekAv, handlarNu, handlarPlats } from '../sim';
import { PRICKAR, personFarg } from './hjalp';
import { s, sakVar, ui, uppgiftVid, vidNyBy } from './lage';
import { Ikoner, TS, bubbleG, labels, markLayer, peopleG } from './scen';
import { jaktPlats } from './jakt';
import { hasIcon, iconCanvas, ljusSymbol } from '../ikoner';

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
  if (still && tk?.phase === 'do' && d && !d.stilla) {
    const w = d.vandra, k = t / SEC, r = w ? w.r * 0.6 : 0.12, f = w ? w.v / (w.r * 6) : 0.05;
    x += Math.sin(k * f + p.id * 1.7) * r * Math.sin(k * f * 0.37 + p.id);
    y += Math.cos(k * f * 0.83 + p.id * 2.3) * r * Math.sin(k * f * 0.29 + p.id * 0.5);
  }
  return { x, y, still };
}
// de som står still sprider ut sig lite så att de inte står i varandra (Björn efter v89), bara i bilden. Den som går rör
// sig inte undan och knuffar ingen, så att man kan mötas i en smal gång. SPRID = avståndet de vill ha (rutor), NARMRE = hur
// långt från sin plats man högst flyttar sig
const SPRID = 0.55, NARMRE = 0.4;
let synlig = new Map<number, { x: number; y: number }>(), synligNu = NaN;
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
const PRAT_FARG = 0xf3ead2, PRAT_KANT = 0x3b2f25; // pratbubblans ljusa botten och mörka kant
function pratRuta(x: number, top: number, bob: number, kind: string | undefined, rel: 'karlek' | 'van' | 'ovan' | 'neutral', ikon?: string) {
  const kant = kind === 'gräl' ? 0xd9534f : kind === 'flirt' ? 0xf0a3bd : kind === 'berättelse' ? 0xf2d27a
    : rel === 'karlek' ? 0xf0a3bd : rel === 'ovan' ? 0x8a2a22 : rel === 'van' ? 0x7fbf5a : undefined;
  // en ljus, rundad pratbubbla med en spets ner mot den som pratar, så att den inte ser ut som arbetets mörka ruta (steg 4.5.6.9)
  const y0 = top + bob, linje = kant ?? PRAT_KANT, b = kant !== undefined ? 1.2 : 0.8;
  bubbleG.lineStyle(b, linje, 0.95).beginFill(PRAT_FARG, 0.94).drawRoundedRect(x - 6, y0 - 6, 12, 11, 4).endFill();
  bubbleG.lineStyle(0).beginFill(PRAT_FARG, 0.94).drawPolygon([x - 2.6, y0 + 4.4, x + 1.4, y0 + 4.4, x - 1.8, y0 + 8.2]).endFill();
  bubbleG.lineStyle(b, linje, 0.95).moveTo(x - 2.6, y0 + 5).lineTo(x - 1.8, y0 + 8.2).lineTo(x + 1.4, y0 + 5).lineStyle(0);
  const k = ikon && hasIcon(ikon) ? ikon : 'a_prata';
  markIcons.add(k, x - 4, top - 4.5 + bob, 8 / iconCanvas(k).width, ljusSymbol(k) ? PRAT_KANT : 0xffffff);
}
const markIcons = new Ikoner(markLayer);
// namnet över den valda och den under musen. Två texter som återanvänds: att skapa en text varje bildruta är dyrt
const nameStyle = new PIXI.TextStyle({ fontFamily: 'Alegreya Sans, system-ui, sans-serif', fontSize: 22, fill: 0xffffff, stroke: 0x111111, strokeThickness: 5, fontWeight: '700' });
const nameTags = [0, 1].map(() => { const tx = new PIXI.Text('', nameStyle); tx.scale.set(0.5); tx.anchor.set(0.5, 1); tx.visible = false; labels.addChild(tx); return tx; });
// de ur byn som slåss i testarenan: de syns bara i striden (ui/arena.ts)
export const dolda = new Set<number>();
export function drawPeople(t: number) {
  peopleG.clear(); bubbleG.clear();
  const ppl = dolda.size ? living(s).filter(p => !dolda.has(p.id)) : living(s), pos = new Map<number, { x: number; y: number }>();
  synlig = sprid(ppl); synligNu = ui.nu;
  markIcons.start();
  const sv = ui.tab === 'sak' ? sakVar() : undefined, harSaken = sv && 'person' in sv ? sv.person : undefined; // den som har den markerade saken (steg 3.10.4)
  for (const p of ppl) {
    const a = ageOf(p, s.now);
    const r = a < ALDER.smabarn ? 2.8 : a < ALDER.vuxen ? 3.8 : 5;
    const q = posOf(p), x = q.x * TS, y = q.y * TS;
    pos.set(p.id, q);
    const tk = uppgiftVid(p), sleeping = tk?.act === 'sova';
    const col = personFarg(p, sleeping);
    peopleG.beginFill(0x000000, 0.25).drawEllipse(x, y + r * 0.9, r * 0.9, r * 0.35).endFill();
    if (p.id === ui.selected || p.id === harSaken) peopleG.lineStyle(2.5, 0xffffff, 1);
    else peopleG.lineStyle(1.2, 0x1a1a1a, 0.8);
    if (!sleeping && !kanGa(p)) peopleG.beginFill(col).drawEllipse(x, y + r * 0.4, r * 1.3, r * 0.6).endFill(); // den som inte kan gå ligger och kravlar (steg 3.7.19)
    else peopleG.beginFill(col).drawCircle(x, y, r).endFill();
    peopleG.lineStyle(0);
    if (PRICKAR.sjuk.har(p)) peopleG.beginFill(PRICKAR.sjuk.farg).drawCircle(x + r * 0.7, y - r * 0.7, 1.8).endFill();
    if (PRICKAR.gravid.har(p)) peopleG.beginFill(PRICKAR.gravid.farg).drawCircle(x - r * 0.7, y - r * 0.7, 1.6).endFill();
    if (tk && load(tk, s) > 0) markIcons.add(homeKind(tk), x + r - 2.5, y - 1, 4.8 / iconCanvas(homeKind(tk)).width); // det man bär syns på figuren, hur lite det än är (steg 3.6.5)
    const mal = tk?.act === 'maltid' && tk.phase === 'do' && tk.mal, bord = mal && hasIcon(mal) ? bordVid(s, q) : undefined; // (vid bordet där hen syns sitta)
    if (mal && bord) { // den som äter vid bordet har maten i händerna och framför sig på bordet (steg 3.10.3)
      const { w, h } = storlekAv(bord), dx = (bord.x + w / 2) * TS - x, dy = (bord.y + h / 2) * TS - y, d = Math.hypot(dx, dy) || 1, f = Math.min(1, TS * 0.7 / d);
      markIcons.add(mal, x + r - 2.5, y - 1, 0.6);
      markIcons.add(mal, x + dx * f - 2.4, y + dy * f - 2.4, 0.6);
    }
  }
  // pågående samtal och symboler
  const flash = new Map<number, string>();
  const flashIkon = new Map<number, string | undefined>();
  for (let i = bubbles.length - 1; i >= 0; i--) { const b = bubbles[i]; if (b.until < t) bubbles.splice(i, 1); else { flash.set(b.id, b.kind); flashIkon.set(b.id, b.i); } }
  for (const p of ppl) {
    const pp = pos.get(p.id)!, x = pp.x * TS, y = pp.y * TS, a = ageOf(p, s.now), top = y - (a < ALDER.smabarn ? 9 : a < ALDER.vuxen ? 11 : 13);
    const o = talkWith.get(p.id), q = o !== undefined ? byId(s, o) : undefined;
    // bara medan de pratar: en stund efter samtalet (steg 3.10.3), inte så länge de sitter nära varandra
    const talking = !!q && pratarMed(s, p) === q;
    if (!talking && o !== undefined && !flash.has(p.id)) talkWith.delete(p.id);
    const medGast = o !== undefined && o < 0 && flash.has(p.id); // småprat med handlaren (steg 4.5.4.15)
    if (talking || flash.has(p.id) && (isSocial(p) || medGast)) { // bara den som gör något socialt just nu, som personrutan säger (steg 2.3.7)
      const r = q ? s.rels[relKey(p.id, q.id)] : undefined;
      // bubblans färg: kär (partnern eller mycket romans), grälar (som i folk.ts), goda vänner eller annars
      const rel = q && (p.partner === q.id || (r?.rom ?? 0) > 40) ? 'karlek' : (r?.op ?? 0) < REL.gral ? 'ovan' : (r?.op ?? 0) > REL.van ? 'van' : 'neutral';
      const ikon = flash.has(p.id) ? flashIkon.get(p.id) : q && p.prat?.m === q.id ? p.prat.i : undefined; // ämnet (steg 3.9.5)
      pratRuta(x, top, Math.sin(t / 500 + p.id) * 0.6, flash.get(p.id), rel, ikon);
      if (medGast && s.handlare?.id === o) { const hp = handlarPlats(s.handlare, ui.nu); pratRuta(hp.x * TS, hp.y * TS - 13, Math.sin(t / 500) * 0.6, flash.get(p.id), 'neutral'); } // handlaren pratar också
      continue;
    }
    // vid handlarens filt (steg 4.4.1.5): pratbubblor med varornas symboler, en i taget
    if (handlarNu(s, p) && s.handlare?.varor.length) {
      const v = s.handlare.varor, k = v[Math.floor(t / 1400 + p.id) % v.length].k;
      pratRuta(x, top, Math.sin(t / 500 + p.id) * 0.6, undefined, 'neutral', k);
      const hp = handlarPlats(s.handlare, ui.nu), svar = Math.floor(t / 1400 + p.id) % 2 ? 'silver' : k; // handlaren svarar: priset i silver
      pratRuta(hp.x * TS, hp.y * TS - 13, Math.sin(t / 500) * 0.6, undefined, 'neutral', svar);
      continue;
    }
    const m = markOf(p);
    if (m === 'zzz') { // z som stiger och bleknar
      for (let k = 0; k < 2; k++) {
        const f = ((t / 1800 + p.id * 0.37 + k * 0.5) % 1), w = 2 + f * 2, zx = x + 3 + f * 3, zy = top + 2 - f * 6;
        bubbleG.lineStyle(1, 0xdfe6ff, 0.9 * (1 - f)).moveTo(zx, zy).lineTo(zx + w, zy).lineTo(zx, zy + w).lineTo(zx + w, zy + w).lineStyle(0);
      }
    } else if (m) {
      const bob = Math.sin(t / 500 + p.id) * 0.6;
      bubbleG.beginFill(0x111111, 0.35).drawRoundedRect(x - 5, top - 5 + bob, 10, 10, 3).endFill();
      markIcons.add(m, x - 4, top - 4 + bob, 8 / iconCanvas(m).width);
    }
  }
  markIcons.end();
  let n = 0;
  for (const p of [byId(s, ui.selected), ui.hovered !== ui.selected ? byId(s, ui.hovered) : undefined]) {
    if (!p || !alive(p)) continue;
    const tx = nameTags[n++];
    if (tx.text !== p.name) tx.text = p.name;
    const q = posOf(p); tx.position.set(q.x * TS, q.y * TS - 8); tx.visible = true;
  }
  for (; n < nameTags.length; n++) nameTags[n].visible = false;
}
