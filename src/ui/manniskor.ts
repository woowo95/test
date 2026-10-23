import * as PIXI from 'pixi.js';
import { ACTS, Person, TalkEvent, ageOf, alive, byId, homeKind, living, load, relKey } from '../sim';
import { hsl } from './hjalp';
import { s, ui } from './lage';
import { Ikoner, TS, bubbleG, labels, markLayer, peopleG } from './scen';

// människorna på kartan: kroppen, det de bär, pratbubblor, symbolen för vad de gör och namnet
const bubbles: { id: number; kind: string; good: boolean; until: number }[] = [];
// vem var och en senast pratade med: bubblan står kvar så länge båda är kvar i samtalet
const talkWith = new Map<number, number>();
// samtal som startat sedan förra bildrutan: en bubbla i samtalets färg en stund
export function addTalks(events: TalkEvent[], now: number) {
  for (const e of events.splice(0)) { bubbles.push({ id: e.a, kind: e.kind, good: e.good, until: now + 2600 }); talkWith.set(e.a, e.b); talkWith.set(e.b, e.a); }
}
// symbolen över huvudet för det man gör på platsen (mark i handlingar.ts); vissa redskap och material syns i stället
const MARK_TOOL: Record<string, string> = { fiskespjut: 'fiskespjut', flintspjut: 'flintspjut', metspo: 'metspo', rep: 'rep', golv: 'tragolv' };
function markOf(p: Person): string | undefined {
  const t = p.task; if (!t || t.phase !== 'do') return;
  return (t.tool && MARK_TOOL[t.tool]) || ACTS[t.act].mark;
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
  const ppl = living(s);
  markIcons.start();
  for (const p of ppl) {
    const a = ageOf(p, s.now);
    const r = a < 3 ? 2.8 : a < 14 ? 3.8 : 5;
    const x = p.x * TS, y = p.y * TS;
    const sleeping = p.task?.act === 'sova';
    const col = hsl(p.hue, sleeping ? 0.15 : 0.5, sleeping ? 0.5 : 0.58);
    peopleG.beginFill(0x000000, 0.25).drawEllipse(x, y + r * 0.9, r * 0.9, r * 0.35).endFill();
    if (p.id === ui.selected) peopleG.lineStyle(2.5, 0xffffff, 1);
    else peopleG.lineStyle(1.2, 0x1a1a1a, 0.8);
    peopleG.beginFill(col).drawCircle(x, y, r).endFill();
    peopleG.lineStyle(0);
    if (p.sickUntil && p.sickUntil > s.now) peopleG.beginFill(0x8fc46a).drawCircle(x + r * 0.7, y - r * 0.7, 1.8).endFill();
    if (p.pregnantSince !== undefined) peopleG.beginFill(0xf2c4d0).drawCircle(x - r * 0.7, y - r * 0.7, 1.6).endFill();
    if (p.task && load(p.task) > 0.02) markIcons.add(homeKind(p.task), x + r - 2.5, y - 1, 0.6); // det man bär syns på figuren
  }
  // pågående samtal och symboler
  const flash = new Map<number, string>();
  for (let i = bubbles.length - 1; i >= 0; i--) { const b = bubbles[i]; if (b.until < t) bubbles.splice(i, 1); else flash.set(b.id, b.kind); }
  for (const p of ppl) {
    const x = p.x * TS, y = p.y * TS, a = ageOf(p, s.now), top = y - (a < 3 ? 9 : a < 14 ? 11 : 13);
    const o = talkWith.get(p.id), q = o !== undefined ? byId(s, o) : undefined;
    const talking = q && alive(q) && p.task?.phase === 'do' && ACTS[p.task.act].social && q.task?.phase === 'do' && ACTS[q.task.act].social && Math.hypot(q.x - p.x, q.y - p.y) < 4;
    if (!talking && o !== undefined && !flash.has(p.id)) talkWith.delete(p.id);
    if (talking || flash.has(p.id)) {
      const r = q ? s.rels[relKey(p.id, q.id)] : undefined;
      const rel = q && (p.partner === q.id || (r?.rom ?? 0) > 40) ? 'karlek' : (r?.op ?? 0) < -20 ? 'ovan' : (r?.op ?? 0) > 30 ? 'van' : 'neutral';
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
    tx.position.set(p.x * TS, p.y * TS - 8); tx.visible = true;
  }
  for (; n < nameTags.length; n++) nameTags[n].visible = false;
}
