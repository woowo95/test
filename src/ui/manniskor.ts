import * as PIXI from 'pixi.js';
import { ACTS, ALDER, Person, slagIkon, SEC, TalkEvent, ageOf, SAMTAL, alive, byId, clamp, homeKind, isSocial, living, load, REL, relKey, spar } from '../sim';
import { PRICKAR, personFarg } from './hjalp';
import { s, ui, vidNyBy } from './lage';
import { Ikoner, TS, bubbleG, labels, markLayer, peopleG } from './scen';

// människorna på kartan: kroppen, det de bär, pratbubblor, symbolen för vad de gör och namnet
const bubbles: { id: number; kind: string; good: boolean; until: number }[] = [];
// vem var och en senast pratade med: bubblan står kvar så länge båda är kvar i samtalet
const talkWith = new Map<number, number>();
vidNyBy.push(() => { bubbles.length = 0; talkWith.clear(); });
// samtal som startat sedan förra bildrutan (vid tiden som visas, nu): en bubbla i samtalets färg en stund. Samtal som
// hunnit bli gamla, när tiden spolas fram, visas inte
export function addTalks(events: TalkEvent[], now: number, nu: number) {
  let n = 0;
  for (const e of events) {
    if (e.t > nu) break;
    n++;
    if (nu - e.t < 20 * SEC) { bubbles.push({ id: e.a, kind: e.kind, good: e.good, until: now + 2600 }); talkWith.set(e.a, e.b); talkWith.set(e.b, e.a); }
  }
  events.splice(0, n);
}
// var personen syns vid tiden som visas: längs vägen hen gick under slaget (spar i steg.ts). På platsen rör man sig lite
// för att det ska se levande ut, bara i bilden: från buske till buske, eller några steg hit och dit
function platsAv(p: Person) {
  const v = spar.v.get(p), t = ui.nu;
  let x = p.x, y = p.y, still = true;
  if (v && v.length >= 6 && t < v[v.length - 3]) {
    let i = 0;
    while (i + 3 < v.length - 3 && v[i + 3] <= t) i += 3;
    const t0 = v[i], t1 = v[i + 3], f = t1 > t0 ? clamp((t - t0) / (t1 - t0), 0, 1) : 1;
    x = v[i + 1] + (v[i + 4] - v[i + 1]) * f; y = v[i + 2] + (v[i + 5] - v[i + 2]) * f;
    still = v[i + 1] === v[i + 4] && v[i + 2] === v[i + 5];
  }
  const tk = p.task, d = tk && ACTS[tk.act];
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
// symbolen över huvudet: slaget av arbete man gör på platsen (SLAG i handlingar.ts)
function markOf(p: Person): string | undefined {
  const t = p.task, k = t?.phase === 'do' ? ACTS[t.act].slag : undefined;
  return k && slagIkon(k);
}
// pratbubblan: utseendet följer relationen, ett nytt samtal syns en stund i sin egen färg
function drawBubble(x: number, y: number, kind: string | undefined, rel: 'karlek' | 'van' | 'ovan' | 'neutral', t: number, seed: number) {
  const fill = kind === 'gräl' ? 0xd9534f : kind === 'flirt' ? 0xf0a3bd : kind === 'berättelse' ? 0xf2d27a : kind ? 0xffffff
    : rel === 'karlek' ? 0xf6c6d6 : rel === 'ovan' ? 0xc98a80 : rel === 'van' ? 0xe4f2d8 : 0xf2f2ee;
  const edge = rel === 'karlek' ? 0xd0607e : rel === 'ovan' ? 0x7a2a22 : rel === 'van' ? 0x5f9a44 : 0x555555;
  bubbleG.lineStyle(0.8, edge, 0.9).beginFill(fill, 0.95).drawRoundedRect(x - 6, y - 4, 12, 8, 3).endFill().lineStyle(0);
  bubbleG.beginFill(fill, 0.95).drawPolygon([x - 3, y + 3.6, x, y + 3.6, x - 4, y + 7]).endFill();
  if (kind === 'gräl' || (!kind && rel === 'ovan')) { // sicksack: osams
    bubbleG.lineStyle(1, 0x3a1410, 0.9).moveTo(x - 4, y + 1).lineTo(x - 2, y - 1.5).lineTo(x, y + 1).lineTo(x + 2, y - 1.5).lineTo(x + 4, y + 1).lineStyle(0);
  } else if (kind === 'flirt' || (!kind && rel === 'karlek')) { // hjärta
    bubbleG.beginFill(0xc0304e).drawCircle(x - 1.2, y - 0.8, 1.4).drawCircle(x + 1.2, y - 0.8, 1.4).drawPolygon([x - 2.6, y - 0.4, x + 2.6, y - 0.4, x, y + 2.6]).endFill();
  } else { // tre punkter som tänds en i taget
    const on = Math.floor(t / 400 + seed) % 3;
    for (let k = -1; k <= 1; k++) bubbleG.beginFill(0x333333, k + 1 === on ? 1 : 0.45).drawCircle(x + k * 3, y, 0.9).endFill();
  }
}
const markIcons = new Ikoner(markLayer);
// namnet över den valda och den under musen. Två texter som återanvänds: att skapa en text varje bildruta är dyrt
const nameStyle = new PIXI.TextStyle({ fontFamily: 'Alegreya Sans, system-ui, sans-serif', fontSize: 22, fill: 0xffffff, stroke: 0x111111, strokeThickness: 5, fontWeight: '700' });
const nameTags = [0, 1].map(() => { const tx = new PIXI.Text('', nameStyle); tx.scale.set(0.5); tx.anchor.set(0.5, 1); tx.visible = false; labels.addChild(tx); return tx; });
export function drawPeople(t: number) {
  peopleG.clear(); bubbleG.clear();
  const ppl = living(s), pos = new Map<number, { x: number; y: number }>();
  synlig = sprid(ppl); synligNu = ui.nu;
  markIcons.start();
  for (const p of ppl) {
    const a = ageOf(p, s.now);
    const r = a < ALDER.smabarn ? 2.8 : a < ALDER.vuxen ? 3.8 : 5;
    const q = posOf(p), x = q.x * TS, y = q.y * TS;
    pos.set(p.id, q);
    const sleeping = p.task?.act === 'sova';
    const col = personFarg(p, sleeping);
    peopleG.beginFill(0x000000, 0.25).drawEllipse(x, y + r * 0.9, r * 0.9, r * 0.35).endFill();
    if (p.id === ui.selected) peopleG.lineStyle(2.5, 0xffffff, 1);
    else peopleG.lineStyle(1.2, 0x1a1a1a, 0.8);
    peopleG.beginFill(col).drawCircle(x, y, r).endFill();
    peopleG.lineStyle(0);
    if (PRICKAR.sjuk.har(p)) peopleG.beginFill(PRICKAR.sjuk.farg).drawCircle(x + r * 0.7, y - r * 0.7, 1.8).endFill();
    if (PRICKAR.gravid.har(p)) peopleG.beginFill(PRICKAR.gravid.farg).drawCircle(x - r * 0.7, y - r * 0.7, 1.6).endFill();
    if (p.task && load(p.task, s) > 0.02) markIcons.add(homeKind(p.task), x + r - 2.5, y - 1, 0.6); // det man bär syns på figuren
  }
  // pågående samtal och symboler
  const flash = new Map<number, string>();
  for (let i = bubbles.length - 1; i >= 0; i--) { const b = bubbles[i]; if (b.until < t) bubbles.splice(i, 1); else flash.set(b.id, b.kind); }
  for (const p of ppl) {
    const pp = pos.get(p.id)!, x = pp.x * TS, y = pp.y * TS, a = ageOf(p, s.now), top = y - (a < ALDER.smabarn ? 9 : a < ALDER.vuxen ? 11 : 13);
    const o = talkWith.get(p.id), q = o !== undefined ? byId(s, o) : undefined;
    const talking = q && alive(q) && isSocial(p) && isSocial(q) && Math.hypot(q.x - p.x, q.y - p.y) < SAMTAL.radie;
    if (!talking && o !== undefined && !flash.has(p.id)) talkWith.delete(p.id);
    if (talking || flash.has(p.id) && isSocial(p)) { // bara den som gör något socialt just nu, som personrutan säger (steg 2.3.7)
      const r = q ? s.rels[relKey(p.id, q.id)] : undefined;
      // bubblans färg: kär (partnern eller mycket romans), grälar (som i folk.ts), goda vänner eller annars
      const rel = q && (p.partner === q.id || (r?.rom ?? 0) > 40) ? 'karlek' : (r?.op ?? 0) < REL.gral ? 'ovan' : (r?.op ?? 0) > REL.van ? 'van' : 'neutral';
      drawBubble(x + 4, top, flash.get(p.id), rel, t, p.id);
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
      markIcons.add(m, x - 4, top - 4 + bob, 1);
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
