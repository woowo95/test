import * as PIXI from 'pixi.js';
import '@pixi/unsafe-eval';
import {
  State, Person, T, W, H, DAY, HOUR, STATS, STAT_NAMES, SKILLS, SKILL_NAMES, AGES, ACT_NAMES, taskName, TalkEvent, LogEntry,
  createState, step, getMap, living, alive, ageOf, byId, relKey, moodOf, ageIndex, ageDay, yearNo, lightLevel, isLight,
  foodDays, timeLabel, temperature, serialize, compact, stat, migrate, hearthOf, igniterOf, fireHeat, heatRadius, fireWant, emberOn,
  ITEM_NAMES, FireLog, coverOf, groundOf, SEDER, SED_INFO, Sed, influence, duty, habitShare, habitTotal, Act,
  richness, stoneDist, Kind, KUNSKAP_NAMES, describe, Lardom, STUBBE_LIV,
} from './sim';
import { HIGH, BAR, FOREST } from './sim/vag';

const TS = 16; // pixlar per ruta i världen
const SAVE_KEY = 'samhalle-save-v1';
const $ = (id: string) => document.getElementById(id)!;
const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

let s: State;
let realState: State | null = null; // sparad verklig by medan testläget körs
let testMode = false;
let speed = 1;
let selected: number | undefined;
let busy = false; // ikappräkning pågår
let db: any = null, uid: string | null = null;
let tab: 'folk' | 'logg' | 'person' | 'eld' | 'seder' = 'folk';

// ---------- sparning ----------
function saveLocal() {
  if (testMode || !s) return;
  try { compact(s); localStorage.setItem(SAVE_KEY, serialize(s)); } catch { /* ignoreras */ }
}
async function saveDb() {
  if (testMode || !s || !db || !uid) return;
  try { compact(s); await db.doc(`data/users/${uid}/save`).set({ state: serialize(s), savedAt: Date.now() }); } catch { /* ignoreras */ }
}
function parse(txt: string | null | undefined): State | null {
  if (!txt) return null;
  try { const o = JSON.parse(txt); return o && o.v === 1 && Array.isArray(o.people) ? migrate(o) : null; } catch { return null; }
}
async function loadSaves(): Promise<State | null> {
  let local: State | null = null;
  try { local = parse(localStorage.getItem(SAVE_KEY)); } catch { /* ignoreras */ }
  let remote: State | null = null;
  try {
    const c = (window as any).claude;
    if (c?.use) {
      const timeout = new Promise<null>(r => setTimeout(() => r(null), 5000));
      const got = await Promise.race([(async () => {
        const d = await c.use('db'); const u = await c.use('user');
        if (!d || !u) return null;
        const id = await u.id(); if (!id) return null;
        db = d; uid = id;
        const snap = await d.doc(`data/users/${id}/save`).get();
        return snap.exists ? parse(String(snap.data()?.state ?? '')) : null;
      })(), timeout]);
      remote = got;
    }
  } catch { /* ignoreras */ }
  if (local && remote) return local.now >= remote.now ? local : remote;
  return local ?? remote;
}

// ---------- ikappräkning ----------
async function catchUp(target: number, showOverlay: boolean) {
  const span = target - s.now;
  if (span <= 0) return;
  busy = true;
  const logStart = s.log.length ? s.log[s.log.length - 1].t : 0;
  const from = s.now;
  const before = knowSnapshot();
  const ov = $('overlay');
  if (showOverlay) { ov.hidden = false; $('ovBody').innerHTML = `<p class="ovLead">Byn har levt vidare medan du var borta.</p><div class="prog"><div id="progBar"></div></div><p class="muted" id="progTxt"></p>`; }
  await new Promise<void>(resolve => {
    const chunk = () => {
      const t0 = performance.now();
      while (s.now < target && performance.now() - t0 < 30) step(s, Math.min(300, (target - s.now) / 1000), false);
      if (showOverlay) {
        const f = Math.min(1, (s.now - from) / span);
        const bar = document.getElementById('progBar'); if (bar) bar.style.width = (f * 100).toFixed(1) + '%';
        const pt = document.getElementById('progTxt'); if (pt) pt.textContent = `${timeLabel(s, s.now)} · ${Math.round(f * 100)} %`;
      }
      if (s.now < target - 500) setTimeout(chunk, 0); else resolve();
    };
    chunk();
  });
  busy = false;
  for (const p of living(s)) p.task = undefined;
  if (showOverlay) showSummary(from, logStart, before);
  saveLocal(); saveDb();
  drawTerrain(true);
}
// vad var och en kan och tror innan ikappräkningen, för att visa det nya i sammanställningen
function knowSnapshot() {
  const m = new Map<number, { k: Record<string, number>; l: Set<string> }>();
  for (const p of living(s)) m.set(p.id, { k: Object.fromEntries(Object.entries(p.kunskap ?? {}).map(([k, e]) => [k, e.v])), l: new Set((p.lardomar ?? []).map(l => l.k + ':' + l.a)) });
  return m;
}
const LKIND_NAMES: Record<string, string> = { samla: 'bär och rötter', jakt: 'vilt', fiske: 'fisk', flinta: 'flinta', fara: 'farliga platser' };
function knowHtml(before: ReturnType<typeof knowSnapshot>) {
  const nyK: string[] = [], per: Record<string, number> = {}, ex: string[] = [];
  let nyL = 0;
  for (const p of living(s)) {
    const b = before.get(p.id);
    for (const [k, e] of Object.entries(p.kunskap ?? {})) {
      const v0 = b?.k[k] ?? 0;
      if (e.v - v0 >= 0.2) nyK.push(`${esc(p.name)} har lärt sig ${esc((KUNSKAP_NAMES[k] ?? k).toLowerCase())} (${Math.round(v0 * 100)} → ${Math.round(e.v * 100)} %)`);
    }
    for (const l of p.lardomar ?? []) {
      if (b?.l.has(l.k + ':' + l.a)) continue;
      nyL++; per[l.k] = (per[l.k] ?? 0) + 1;
      if (ex.length < 4 && (l.k === 'fara' || l.k === 'flinta' || l.c >= 0.75)) ex.push(`${esc(p.name)}: ${esc(describe(s, p, l).text)}`);
    }
  }
  if (!nyK.length && !nyL) return '';
  const delar = Object.entries(per).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} om ${LKIND_NAMES[k] ?? k}`).join(', ');
  return `<h3>Ny kunskap och nya lärdomar</h3><ul class="sumList">${nyK.slice(0, 6).map(x => `<li>${x}</li>`).join('')}${nyK.length > 6 ? `<li class="muted">och ${nyK.length - 6} till</li>` : ''}
    ${nyL ? `<li>${nyL} nya lärdomar: ${delar}</li>${ex.map(x => `<li class="muted">${x}</li>`).join('')}` : ''}</ul>`;
}
function showSummary(from: number, logStart: number, before = knowSnapshot()) {
  const ev = s.log.filter(l => l.t > logStart && l.t > from);
  const years = (s.now - from) / DAY;
  const births = ev.filter(e => e.kind === 'birth').length, deaths = ev.filter(e => e.kind === 'death').length;
  const prio = (e: LogEntry) => e.kind === 'death' ? 5 : e.kind === 'birth' || e.kind === 'move' ? 4 : e.kind === 'skill' || /par\.|skilda|tända elden|slocknade/.test(e.text) ? 3 : e.kind === 'world' && /tiden|Byn|gniststen/.test(e.text) ? 2 : e.kind === 'rel' ? 1 : 0;
  const key = ev.map((e, i) => ({ e, i, p: prio(e) })).filter(x => x.p > 0).sort((a, b) => b.p - a.p || b.i - a.i).slice(0, 10).sort((a, b) => b.i - a.i).map(x => x.e);
  const yrs = years >= 1 ? `${years.toFixed(1).replace('.', ',')} år` : `${Math.round(years * 12)} månader`;
  $('ovBody').innerHTML = `
    <p class="ovLead">Medan du var borta gick ${yrs}.</p>
    <p class="muted">${births} födda · ${deaths} döda · ${living(s).length} lever nu i byn</p>
    <ol class="sumList">${key.map(e => `<li><span class="when">${timeLabel(s, e.t)}</span>${esc(e.text)}</li>`).join('') || '<li>Inget särskilt hände.</li>'}</ol>
    ${knowHtml(before)}
    <button id="ovClose" class="primary" type="button">Till byn</button>`;
  $('ovClose').onclick = () => { $('overlay').hidden = true; };
}

// ---------- grafik ----------
const app = new PIXI.Application({ background: 0x1d2420, antialias: true, resolution: Math.min(2, window.devicePixelRatio || 1), autoDensity: true });
const world = new PIXI.Container();
const terrainG = new PIXI.Graphics();
const structG = new PIXI.Graphics();
const peopleG = new PIXI.Graphics();
const bubbleG = new PIXI.Graphics();
const nightG = new PIXI.Graphics();
const glowG = new PIXI.Graphics();
glowG.blendMode = PIXI.BLEND_MODES.ADD;
const labels = new PIXI.Container();
world.addChild(terrainG, structG, peopleG, bubbleG, nightG, glowG, labels);
app.stage.addChild(world);
const nameStyle = new PIXI.TextStyle({ fontFamily: 'Alegreya Sans, system-ui, sans-serif', fontSize: 22, fill: 0xffffff, stroke: 0x111111, strokeThickness: 5, fontWeight: '700' });

const PAL = [
  // istid, vårtid, sommartid, hösttid
  { [T.Vatten]: 0xb9d2dc, [T.Sand]: 0xd8dbd3, [T.Gras]: 0xdfe5e6, [T.Skog]: 0xb0bdb9, [T.Sten]: 0xb7bab7, tree: 0x5c6e68 },
  { [T.Vatten]: 0x4a7a95, [T.Sand]: 0xc9b98a, [T.Gras]: 0x8daa5f, [T.Skog]: 0x527d47, [T.Sten]: 0x8e8d84, tree: 0x355e33 },
  { [T.Vatten]: 0x3e6e8a, [T.Sand]: 0xd2bf8b, [T.Gras]: 0x7c9a52, [T.Skog]: 0x426c3a, [T.Sten]: 0x8b8b82, tree: 0x2b4f2b },
  { [T.Vatten]: 0x456f84, [T.Sand]: 0xc7b183, [T.Gras]: 0xa59450, [T.Skog]: 0x7b6a36, [T.Sten]: 0x8b867b, tree: 0xa95c26 },
] as Array<Record<number, number> & { tree: number }>;
let drawnAge = -1, drawnSig = -1, lastSigCheck = 0;
const PATH_COL = [0xb4b9b3, 0x8e7752, 0x9a8258, 0x846c47]; // upptrampad mark per tidsålder (snö i istiden)
// hur sliten en ruta ser ut, i fem steg: 0 = orörd, 4 = bar jord
const wornLevel = (c: number) => c >= 0.85 ? 0 : c >= 0.65 ? 1 : c >= 0.45 ? 2 : c >= 0.25 ? 3 : 4;
// trädens storlek i fyra steg: 0 = inga, 1–2 = plantor, 3 = skog
const treeLevel = (v: number) => v >= 0.5 ? 3 : v >= 0.25 ? 2 : v > 0 ? 1 : 0;
function coverSig() {
  const g = groundOf(s); let h = 0;
  for (let i = 0; i < g.cover.length; i++) h = (Math.imul(h, 31) + wornLevel(g.cover[i]) * 4 + treeLevel(g.trees[i])) | 0;
  return h;
}
function mix(a: number, b: number, f: number) {
  const ch = (sh: number) => Math.round(((a >> sh) & 255) * (1 - f) + ((b >> sh) & 255) * f);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
function shadeCol(c: number, f: number) {
  const r = Math.min(255, ((c >> 16) & 255) * f), g = Math.min(255, ((c >> 8) & 255) * f), b = Math.min(255, (c & 255) * f);
  return (r << 16) | (g << 8) | b;
}
function drawTerrain(force = false) {
  const ai = ageIndex(s), now = performance.now();
  // stigarna ändras långsamt: kolla högst en gång i sekunden om något syns annorlunda
  let sig = drawnSig;
  if (force || now - lastSigCheck > 1000) { lastSigCheck = now; sig = coverSig(); }
  if (!force && ai === drawnAge && sig === drawnSig) return;
  drawnAge = ai; drawnSig = sig;
  const m = getMap(s.seed), pal = PAL[ai], g = groundOf(s);
  terrainG.clear();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, t = m.tiles[i], sh = m.shade[i];
    const soil = t === T.Gras || t === T.Skog, tr = soil ? g.trees[i] : 0;
    // jord: skogsmark under träden, annars gräs som trampas ner till kort gräs och bar jord
    let col = shadeCol(soil ? pal[tr >= 0.5 ? T.Skog : T.Gras] : pal[t], 0.94 + sh * 0.12);
    if (soil) { const lv = wornLevel(g.cover[i]); if (lv) col = mix(col, shadeCol(PATH_COL[ai], 0.95 + sh * 0.1), lv * 0.22); }
    terrainG.beginFill(col).drawRect(x * TS, y * TS, TS, TS).endFill();
    if (tr > 0) {
      // vuxna träd: två eller tre granar; plantor: en liten gran som växer
      const n = tr >= 0.5 ? 2 + Math.floor(sh * 2) : 1, k = tr >= 0.5 ? 1 : 0.35 + tr;
      terrainG.beginFill(pal.tree);
      for (let j = 0; j < n; j++) {
        const tx = x * TS + 3 + ((sh * 97 * (j + 1)) % 1) * 10, ty = y * TS + 3 + ((sh * 57 * (j + 2)) % 1) * 10;
        terrainG.drawPolygon([tx, ty - 4 * k, tx - 3.5 * k, ty + 3.5 * k, tx + 3.5 * k, ty + 3.5 * k]);
      }
      terrainG.endFill();
    } else if (soil && g.cover[i] >= 0.9 && ai !== 0) {
      // högt gräs: några strån
      terrainG.lineStyle(1, shadeCol(pal[T.Gras], 0.72), 0.8);
      for (let j = 0; j < 3; j++) { const gx = x * TS + 3 + ((sh * 71 * (j + 1)) % 1) * 10, gy = y * TS + 5 + ((sh * 43 * (j + 3)) % 1) * 8; terrainG.moveTo(gx, gy + 4).lineTo(gx - 1, gy).moveTo(gx + 1.5, gy + 4).lineTo(gx + 2.5, gy + 0.5); }
      terrainG.lineStyle(0);
    } else if (t === T.Sten) {
      terrainG.beginFill(shadeCol(pal[t], 0.78)).drawCircle(x * TS + 5 + sh * 6, y * TS + 6 + sh * 4, 2.2).drawCircle(x * TS + 11, y * TS + 11 - sh * 3, 1.6).endFill();
    } else if (t === T.Vatten && ai !== 0 && sh > 0.82) {
      terrainG.lineStyle(1, 0xffffff, 0.25).moveTo(x * TS + 3, y * TS + 8).lineTo(x * TS + 9, y * TS + 8).lineStyle(0);
    }
  }
}
function drawStructures(t: number) {
  const m = getMap(s.seed), ai = ageIndex(s);
  structG.clear();
  // förråd
  const st = m.stock;
  structG.beginFill(0x5b4a35, 0.35).drawRoundedRect(st.x * TS, st.y * TS, TS * 2, TS * 2, 3).endFill();
  const nf = Math.min(12, Math.ceil(s.food / 25)), nw = Math.min(8, Math.ceil(s.wood / 6)), ng = Math.min(8 - nw, Math.ceil((s.items.grenar ?? 0) / 15));
  for (let i = 0; i < nf; i++) structG.beginFill(i % 2 ? 0xa8463a : 0xc58b3e).drawRect(st.x * TS + 2 + (i % 4) * 7, st.y * TS + 2 + Math.floor(i / 4) * 6, 5, 4).endFill();
  for (let i = 0; i < nw; i++) structG.beginFill(0x6f4a2a).drawRoundedRect(st.x * TS + 2 + (i % 4) * 7, st.y * TS + 21 + Math.floor(i / 4) * 5, 6, 3, 1.5).endFill();
  for (let i = nw; i < nw + ng; i++) { const gx = st.x * TS + 2 + (i % 4) * 7, gy = st.y * TS + 22 + Math.floor(i / 4) * 5; structG.lineStyle(1, 0x7a5a36).moveTo(gx, gy + 2).lineTo(gx + 6, gy).moveTo(gx + 1, gy).lineTo(gx + 5, gy + 3).lineStyle(0); }
  // stubbar: bleknar medan de ruttnar bort
  for (const k of s.stubbar ?? []) {
    const a = 1 - (s.now - k.t) / STUBBE_LIV, x = k.x * TS + TS * 0.65, y = k.y * TS + TS * 0.6;
    structG.beginFill(0x4a3420, 0.9 * a).drawCircle(x, y, 3.2).endFill();
    structG.beginFill(0xb08a58, 0.9 * a).drawCircle(x, y - 0.6, 2.2).endFill();
  }
  // fällda träd som ligger och väntar på att huggas till ved
  for (const k of s.stockar ?? []) {
    const x = k.x * TS, y = k.y * TS, len = 6 + Math.min(8, k.ved);
    structG.lineStyle(4, 0x5a3c22).moveTo(x - len / 2, y + 2).lineTo(x + len / 2, y - 1).lineStyle(0);
    structG.beginFill(0xc9a46a).drawCircle(x - len / 2, y + 2, 1.8).endFill();
  }
  // eld
  const f = m.fire, cx = f.x * TS + TS / 2, cy = f.y * TS + TS / 2;
  // värmeområdet visas när eldens flik är öppen
  if (tab === 'eld' && s.fire.lit) structG.beginFill(0xff9a4a, 0.1).lineStyle(1, 0xffb070, 0.5).drawCircle(cx, cy, heatRadius(s) * TS).endFill().lineStyle(0);
  if (tab === 'eld') structG.lineStyle(1.5, 0xffffff, 0.9).drawCircle(cx, cy, 10).lineStyle(0);
  structG.beginFill(0x4b4640).drawCircle(cx, cy, 7).endFill();
  structG.beginFill(0x2d2620).drawCircle(cx, cy, 5.5).endFill();
  const fuel = s.fire.fuel, fl = 1 + Math.sin(t / 130) * 0.12 + Math.sin(t / 47) * 0.08;
  // vedträn: fler ju mer ved som ligger på
  const logs = Math.min(5, Math.ceil(fuel));
  for (let i = 0; i < logs; i++) { const a = i * 1.26 + 0.4; structG.lineStyle(2, 0x5a3a1e).moveTo(cx + Math.cos(a) * 1.5, cy + Math.sin(a) * 1.5).lineTo(cx + Math.cos(a) * 5.2, cy + Math.sin(a) * 5.2).lineStyle(0); }
  if (s.fire.lit) {
    const I = fireHeat(s);
    structG.beginFill(0xe2702e).drawCircle(cx, cy, (2.6 + 3 * I) * fl).endFill();
    structG.beginFill(0xffd36b).drawCircle(cx, cy - 0.5, (1.3 + 1.6 * I) * fl).endFill();
  } else if (emberOn(s)) {
    structG.beginFill(0xb3361e, 0.6 + Math.sin(t / 400) * 0.25).drawCircle(cx, cy, 2.6).endFill();
  } else if ((s.fire.ash ?? 0) >= 1) {
    // kolhög efter en utbrunnen eld
    structG.beginFill(0x1a1714).drawEllipse(cx, cy + 0.5, 5.5, 4.5).endFill();
    const n = Math.min(8, s.fire.ash!);
    for (let i = 0; i < n; i++) { const a = i * 2.4; structG.beginFill(i % 3 ? 0x3a3530 : 0x55504a).drawRect(cx + Math.cos(a) * 2.6 - 1, cy + Math.sin(a) * 2.2 - 1, 2, 2).endFill(); }
  }
}
const bubbles: { id: number; kind: string; good: boolean; until: number }[] = [];
function drawPeople(t: number) {
  peopleG.clear(); bubbleG.clear();
  labels.removeChildren().forEach(c => c.destroy());
  const ppl = living(s);
  for (const p of ppl) {
    const a = ageOf(p, s.now);
    const r = a < 3 ? 2.8 : a < 14 ? 3.8 : 5;
    const x = p.x * TS, y = p.y * TS;
    const sleeping = p.task?.act === 'sova';
    const col = hsl(p.hue, sleeping ? 0.15 : 0.5, sleeping ? 0.5 : 0.58);
    peopleG.beginFill(0x000000, 0.25).drawEllipse(x, y + r * 0.9, r * 0.9, r * 0.35).endFill();
    if (p.id === selected) peopleG.lineStyle(2.5, 0xffffff, 1);
    else peopleG.lineStyle(1.2, 0x1a1a1a, 0.8);
    peopleG.beginFill(col).drawCircle(x, y, r).endFill();
    peopleG.lineStyle(0);
    if (p.sickUntil && p.sickUntil > s.now) peopleG.beginFill(0x8fc46a).drawCircle(x + r * 0.7, y - r * 0.7, 1.8).endFill();
    if (p.pregnantSince !== undefined) peopleG.beginFill(0xf2c4d0).drawCircle(x - r * 0.7, y - r * 0.7, 1.6).endFill();
    if (p.task?.carry && p.task.carry > 0.05) peopleG.beginFill(p.task.act === 'ved' || p.task.act === 'elda' ? 0x6f4a2a : 0xc58b3e).drawRect(x + r - 1, y - 1, 4, 4).endFill();
  }
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    if (b.until < t) { bubbles.splice(i, 1); continue; }
    const p = byId(s, b.id); if (!p || !alive(p)) continue;
    const x = p.x * TS + 4, y = p.y * TS - 13;
    const col = b.kind === 'gräl' ? 0xd9534f : b.kind === 'flirt' ? 0xf0a3bd : b.kind === 'berättelse' ? 0xf2d27a : 0xffffff;
    bubbleG.beginFill(col, 0.95).drawRoundedRect(x - 6, y - 4, 12, 8, 3).drawPolygon([x - 3, y + 4, x, y + 4, x - 4, y + 7]).endFill();
    bubbleG.beginFill(0x333333);
    for (let k = -1; k <= 1; k++) bubbleG.drawCircle(x + k * 3, y, 0.9);
    bubbleG.endFill();
  }
  const sel = byId(s, selected);
  for (const p of [sel, hovered !== selected ? byId(s, hovered) : undefined]) {
    if (!p || !alive(p)) continue;
    const tx = new PIXI.Text(p.name, nameStyle);
    tx.scale.set(0.5); tx.anchor.set(0.5, 1); tx.position.set(p.x * TS, p.y * TS - 8);
    labels.addChild(tx);
  }
}
function drawNight(t: number) {
  const L = lightLevel(t);
  nightG.clear(); glowG.clear();
  if (L >= 1) return;
  const d = 1 - L;
  nightG.beginFill(0x0a1430, 0.58 * d).drawRect(0, 0, W * TS, H * TS).endFill();
  const I = fireHeat(s);
  if (I > 0 || emberOn(s)) {
    const m = getMap(s.seed); const cx = m.fire.x * TS + TS / 2, cy = m.fire.y * TS + TS / 2;
    const fl = 1 + Math.sin(t / 160) * 0.05, k = I > 0 ? 0.45 + 0.55 * I : 0.12;
    for (const [r, a] of [[TS * 6, 0.035], [TS * 4, 0.06], [TS * 2.4, 0.09], [TS * 1.1, 0.13]]) glowG.beginFill(0xff8a3a, a * d * (I > 0 ? 1 : 0.5)).drawCircle(cx, cy, r * fl * k).endFill();
  }
}
function hsl(h: number, sat: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12, a = sat * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return (Math.round(f(0) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(4) * 255);
}
let zoom = 2.4, camX = -1, camY = -1;
function layout() {
  const el = $('map');
  const w = el.clientWidth, h = el.clientHeight;
  if (app.renderer.width !== w * app.renderer.resolution || app.renderer.height !== h * app.renderer.resolution) app.renderer.resize(w, h);
  const fit = Math.min(w / (W * TS), h / (H * TS));
  zoom = Math.max(1, Math.min(6, zoom));
  const sc = fit * zoom;
  if (camX < 0 && s) { const f = getMap(s.seed).fire; camX = f.x * TS; camY = f.y * TS; }
  if (camX < 0) { camX = W * TS / 2; camY = H * TS / 2; }
  const hw = w / 2 / sc, hh = h / 2 / sc;
  camX = W * TS <= hw * 2 ? W * TS / 2 : Math.max(hw, Math.min(W * TS - hw, camX));
  camY = H * TS <= hh * 2 ? H * TS / 2 : Math.max(hh, Math.min(H * TS - hh, camY));
  world.scale.set(sc);
  world.position.set(w / 2 - camX * sc, h / 2 - camY * sc);
}
function zoomAt(f: number, gx?: number, gy?: number) {
  const el = $('map');
  if (gx === undefined || gy === undefined) { gx = el.clientWidth / 2; gy = el.clientHeight / 2; }
  const before = world.toLocal(new PIXI.Point(gx, gy));
  zoom *= f; layout();
  const after = world.toLocal(new PIXI.Point(gx, gy));
  camX += before.x - after.x; camY += before.y - after.y; layout();
}

// ---------- interaktion ----------
let hovered: number | undefined;
function personAt(gx: number, gy: number) {
  const p = world.toLocal(new PIXI.Point(gx, gy));
  let best: Person | undefined, bd = 12;
  for (const q of living(s)) { const d = Math.hypot(q.x * TS - p.x, q.y * TS - p.y); if (d < bd) { bd = d; best = q; } }
  return best;
}
app.stage.eventMode = 'static';
app.stage.hitArea = new PIXI.Rectangle(0, 0, 10000, 10000);
let drag: { x: number; y: number; cx: number; cy: number; moved: number } | null = null;
app.stage.on('pointerdown', e => { drag = { x: e.global.x, y: e.global.y, cx: camX, cy: camY, moved: 0 }; });
app.stage.on('pointerup', () => { setTimeout(() => { drag = null; }, 0); });
app.stage.on('pointerupoutside', () => { drag = null; });
function fireAt(gx: number, gy: number) {
  const p = world.toLocal(new PIXI.Point(gx, gy)), f = getMap(s.seed).fire;
  return Math.hypot(f.x * TS + TS / 2 - p.x, f.y * TS + TS / 2 - p.y) < 12;
}
app.stage.on('pointertap', e => {
  if (drag && drag.moved > 6) return;
  const p = personAt(e.global.x, e.global.y);
  if (p) selectPerson(p.id); else if (fireAt(e.global.x, e.global.y)) { tab = 'eld'; renderPanel(true); }
});
app.stage.on('pointermove', e => {
  if (drag && (e.buttons & 1 || e.pointerType === 'touch')) {
    const dx = e.global.x - drag.x, dy = e.global.y - drag.y;
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    if (drag.moved > 6) { stopFollow(); camX = drag.cx - dx / world.scale.x; camY = drag.cy - dy / world.scale.y; layout(); }
    return;
  }
  showHover(e.global.x, e.global.y);
  hovered = personAt(e.global.x, e.global.y)?.id; (app.view as HTMLCanvasElement).style.cursor = hovered || fireAt(e.global.x, e.global.y) ? 'pointer' : 'grab';
});
(app.view as HTMLCanvasElement).addEventListener('wheel', e => { e.preventDefault(); const r = (app.view as HTMLCanvasElement).getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
$('zIn').addEventListener('click', () => zoomAt(1.4));
$('zOut').addEventListener('click', () => zoomAt(1 / 1.4));
$('zHome').addEventListener('click', () => { stopFollow(); zoom = 2.4; const f = getMap(s.seed).fire; camX = f.x * TS; camY = f.y * TS; layout(); });

function selectPerson(id: number) { selected = id; tab = 'person'; renderPanel(true); renderPorts(); }

// ---------- rutan i hörnet: vad som finns under musen ----------
const RICH_WORD = (v: number) => v >= 0.7 ? 'gott om' : v >= 0.35 ? 'en del' : v >= 0.1 ? 'lite' : 'nästan inget';
function showHover(gx: number, gy: number) {
  const box = $('hoverBox'), w = world.toLocal(new PIXI.Point(gx, gy));
  const x = Math.floor(w.x / TS), y = Math.floor(w.y / TS);
  if (x < 0 || y < 0 || x >= W || y >= H) { box.hidden = true; return; }
  const m = getMap(s.seed), g = groundOf(s), i = y * W + x, t = m.tiles[i], tr = g.trees[i], c = g.cover[i];
  const soil = t === T.Gras || t === T.Skog;
  const ground = t === T.Vatten ? 'Vatten' : t === T.Sand ? 'Sand' : t === T.Sten ? 'Sten' : tr >= FOREST ? 'Skogsmark' : c >= HIGH ? 'Högt gräs' : c >= BAR ? 'Kort gräs' : 'Bar jord, stig';
  const rows: string[] = [`<b>${ground}</b>${soil && tr > 0 ? ` · ${tr >= FOREST ? 'skog' : tr >= 0.25 ? 'ungskog' : 'plantor'}` : ''}`];
  // bär och rötter i alla tider utom istiden, vilt där det finns skydd, fisk vid stranden
  const ai = ageIndex(s), finds: string[] = [];
  const add = (k: Kind, name: string) => { const cap = richness(s, k, x, y); if (cap > 0.04) finds.push(`${name}: ${RICH_WORD(cap)}`); };
  if (soil && ai !== 0) add('samla', 'Bär och rötter');
  if (soil) add('jakt', 'Vilt');
  add('fiske', 'Fisk');
  if (finds.length) rows.push(finds.join(' · '));
  if (t !== T.Vatten && stoneDist(s.seed)[i] <= 2) rows.push('Flinta är vanlig här');
  const near = (a: { x: number; y: number }, wd = 1, ht = 1) => x >= a.x && x < a.x + wd && y >= a.y && y < a.y + ht;
  if (near(m.fire)) rows.push(`Elden (${s.fire.lit ? 'brinner' : emberOn(s) ? 'glöder' : 'släckt'})`);
  if (near(m.stock, 2, 2)) rows.push(`Förrådet: ${Math.round(s.food)} mat, ${Math.round(s.wood)} ved`);
  const log = (s.stockar ?? []).find(k => Math.floor(k.x) === x && Math.floor(k.y) === y);
  if (log) rows.push(`Fällt träd, ca ${Math.ceil(log.ved)} ved kvar`);
  if ((s.stubbar ?? []).some(k => k.x === x && k.y === y)) rows.push('Stubbe efter ett fällt träd');
  const here = living(s).filter(p => Math.floor(p.x) === x && Math.floor(p.y) === y);
  if (here.length) rows.push(here.map(p => `${esc(p.name)} (${p.task ? taskName(p.task).toLowerCase() : 'vilar'})`).join(', '));
  box.innerHTML = rows.map(r => `<p>${r}</p>`).join('');
  box.hidden = false;
}

// ---------- porträttraden överst på kartan ----------
let follow: number | undefined;
function stopFollow() { if (follow === undefined) return; follow = undefined; $('followChip').hidden = true; }
function startFollow(id: number) {
  follow = id; const chip = $('followChip'), p = byId(s, id);
  chip.hidden = false; chip.textContent = `Följer ${p?.name ?? ''} ✕`;
}
$('followChip').addEventListener('click', stopFollow);
const portEls = new Map<number, HTMLButtonElement>();
const hex = (p: Person) => '#' + hsl(p.hue, 0.5, 0.58).toString(16).padStart(6, '0');
const shortAct = (p: Person) => p.task ? taskName(p.task) : '–';
function renderPorts() {
  const row = $('ports'), ppl = living(s).slice().sort((a, b) => a.born - b.born);
  const ids = new Set(ppl.map(p => p.id));
  for (const [id, el] of portEls) if (!ids.has(id)) { el.remove(); portEls.delete(id); }
  ppl.forEach((p, k) => {
    let el = portEls.get(p.id);
    if (!el) {
      el = document.createElement('button'); el.type = 'button'; el.className = 'port'; el.dataset.id = String(p.id);
      el.innerHTML = `<span class="dot"></span><span class="pn"></span><span class="pi"></span><span class="pa"></span>`;
      portEls.set(p.id, el);
    }
    if (row.children[k] !== el) row.insertBefore(el, row.children[k] ?? null);
    const low = p.hunger < 0.25 || p.health < 0.4 || p.warm < 0.3 || moodOf(p, s.now) < 0.25;
    el.classList.toggle('low', low);
    el.setAttribute('aria-pressed', String(selected === p.id));
    (el.children[0] as HTMLElement).style.background = hex(p);
    el.children[1].textContent = p.name;
    el.children[2].textContent = `${Math.floor(ageOf(p, s.now))} år${p.tag ? ' · ' + p.tag : ''}`;
    el.children[3].textContent = shortAct(p);
  });
  if (tipId !== undefined) showTip(tipId);
}
let tipId: number | undefined;
function showTip(id: number) {
  const p = byId(s, id), el = portEls.get(id), tip = $('portTip');
  if (!p || !el || !alive(p)) { hideTip(); return; }
  tipId = id;
  const m = moodOf(p, s.now);
  tip.innerHTML = `<h4>${esc(p.name)}</h4><p class="op">${p.sex === 'k' ? 'Kvinna' : 'Man'}, ${Math.floor(ageOf(p, s.now))} år${p.tag ? ' · ' + esc(p.tag) : ''}</p>
    <p>${shortAct(p)}</p>${p.task?.why ? `<p class="op">${esc(p.task.why)}</p>` : ''}
    <dl><dt>Humör</dt><dd>${bar(m, m < 0.35 ? 'low' : '', trend(p, 'humor', m))}</dd><dt>Mättnad</dt><dd>${bar(p.hunger, p.hunger < 0.25 ? 'low' : '', trend(p, 'hunger', p.hunger))}</dd>
    <dt>Vila</dt><dd>${bar(p.rest, '', trend(p, 'rest', p.rest))}</dd><dt>Hälsa</dt><dd>${bar(p.health, p.health < 0.5 ? 'low' : '', trend(p, 'health', p.health))}</dd><dt>Värme</dt><dd>${bar(p.warm, p.warm < 0.4 ? 'low' : '', trend(p, 'warm', p.warm))}</dd></dl>
    <p class="op">Klicka för att välja, dubbelklicka för att följa.</p>`;
  const wrap = $('ports').parentElement!.getBoundingClientRect(), r = el.getBoundingClientRect();
  tip.hidden = false;
  tip.style.top = `${r.bottom - wrap.top + 6}px`;
  tip.style.left = `${Math.max(8, Math.min(wrap.width - tip.offsetWidth - 8, r.left - wrap.left))}px`;
}
function hideTip() { tipId = undefined; $('portTip').hidden = true; }
$('ports').addEventListener('pointerover', e => { const b = (e.target as HTMLElement).closest<HTMLElement>('.port'); if (b) showTip(Number(b.dataset.id)); });
$('ports').addEventListener('pointerleave', hideTip);
(app.view as HTMLCanvasElement).addEventListener('pointerleave', () => { $('hoverBox').hidden = true; });
$('ports').addEventListener('click', e => { const b = (e.target as HTMLElement).closest<HTMLElement>('.port'); if (b) selectPerson(Number(b.dataset.id)); });
$('ports').addEventListener('dblclick', e => { const b = (e.target as HTMLElement).closest<HTMLElement>('.port'); if (b) startFollow(Number(b.dataset.id)); });

// ---------- panel ----------
function bar(v: number, cls = '', tr = '') { return `<span class="bar ${cls}"><span style="width:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%"></span></span>${tr}`; }
// pil vid en stapel som ändras märkbart just nu: jämför med värdet för en stund sedan (speltid)
const trendHist = new Map<string, { v: number; t: number; d: number }>();
function trend(p: Person, key: string, v: number) {
  const id = p.id + ':' + key, h = trendHist.get(id), now = s.now;
  if (!h || now < h.t) { trendHist.set(id, { v, t: now, d: 0 }); return ''; }
  if (now - h.t >= 10 * 60 * 1000) { h.d = (v - h.v) / ((now - h.t) / HOUR); h.v = v; h.t = now; }
  return h.d > 0.08 ? '<span class="trend up" title="Stiger">▲</span>' : h.d < -0.08 ? '<span class="trend down" title="Sjunker">▼</span>' : '';
}
function moodWord(m: number) { return m > 0.75 ? 'Lycklig' : m > 0.55 ? 'Nöjd' : m > 0.4 ? 'Okej' : m > 0.25 ? 'Nedstämd' : 'Olycklig'; }
function relWord(s: State, p: Person, q: Person, op: number) {
  if (p.partner === q.id) return 'Partner';
  if (q.mother === p.id || q.father === p.id) return 'Barn';
  if (p.mother === q.id || p.father === q.id) return 'Förälder';
  if (p.mother !== undefined && (p.mother === q.mother || p.father === q.father)) return 'Syskon';
  return op > 60 ? 'Nära vän' : op > 25 ? 'Vän' : op > -10 ? 'Bekant' : op > -45 ? 'Ogillar' : 'Ovän';
}
function pLink(p?: Person) { return p ? `<button class="plink" data-id="${p.id}" type="button">${esc(p.name)}</button>` : '–'; }
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
// lärdomar om samma plats visas tillsammans, rädslorna först
function groups(ls: Lardom[]) {
  const m = new Map<string, Lardom[]>();
  for (const l of ls) { const key = (l.k === 'fara' ? 'f' : 'p') + l.a; (m.get(key) ?? m.set(key, []).get(key)!).push(l); }
  return [...m.values()];
}
// kunskap (alltid rätt) och lärdomar (det personen tror, kan vara fel). Spelaren ser vad som inte stämmer.
function knowledgeHtml(p: Person) {
  const ks = Object.entries(p.kunskap ?? {}).filter(([, e]) => e.v >= 0.05);
  const ls = (p.lardomar ?? []).slice().sort((a, b) => (b.k === 'fara' ? 1 : 0) - (a.k === 'fara' ? 1 : 0) || b.c - a.c);
  return `<h3>Kunskap</h3>${ks.length ? `<dl class="kv">${ks.map(([k, e]) => `<dt>${esc(KUNSKAP_NAMES[k] ?? k)}</dt><dd>${bar(e.v, 'skill')}<span>${Math.round(e.v * 100)} %</span></dd>`).join('')}</dl>` : '<p class="muted">Ingen särskild kunskap ännu.</p>'}
      <h3>Lärdomar</h3>${ls.length ? `<ul class="lard">${groups(ls).map(g => `<li class="${g[0].k === 'fara' ? 'fara' : ''}"><b>${esc(cap(describe(s, p, g[0]).place))}</b>${g.map(l => { const d = describe(s, p, l); return `<span>${esc(d.what)} <small class="muted">${d.sure}, ${esc(d.src)}</small>${d.wrong ? `<small class="fel">${esc(d.wrong)}</small>` : ''}</span>`; }).join('')}</li>`).join('')}</ul>` : '<p class="muted">Inga lärdomar ännu.</p>'}`;
}
function renderPanel(force = false) {
  // elden har ingen egen flik: den öppnas genom att klicka på elden, och visas då i personfliken
  for (const b of document.querySelectorAll<HTMLButtonElement>('.tabs button')) {
    b.setAttribute('aria-selected', String(b.dataset.tab === tab || (tab === 'eld' && b.dataset.tab === 'person')));
    if (b.dataset.tab === 'person') b.textContent = tab === 'eld' ? 'Elden' : 'Person';
  }
  const ppl = living(s);
  $('sPop').textContent = String(ppl.length);
  const fd = foodDays(s);
  $('sFood').textContent = `${Math.round(s.food)}`;
  $('sFoodDays').textContent = `räcker ca ${fd >= 10 ? Math.round(fd) : fd.toFixed(1).replace('.', ',')} dygn`;
  $('sWood').textContent = `${Math.round(s.wood)}`;
  $('sGren').textContent = `${Math.round(s.items.grenar ?? 0)} grenar`;
  $('sFire').textContent = s.fire.lit ? 'brinner' : emberOn(s) ? 'glöder' : 'släckt';
  const box = $('panelBody');
  if (!force && (busy || performance.now() - lastPointer < 800)) return;
  if (tab === 'folk') {
    const rows = ppl.slice().sort((a, b) => b.born < a.born ? 1 : -1).sort((a, b) => ageOf(b, s.now) - ageOf(a, s.now));
    box.innerHTML = `<ul class="folk">${rows.map(p => {
      const m = moodOf(p, s.now);
      return `<li><button class="row" data-id="${p.id}" type="button"><span class="dot" style="background:#${hsl(p.hue, 0.5, 0.58).toString(16).padStart(6, '0')}"></span><span class="nm">${esc(p.name)}${p.tag ? ` <span class="tag">${esc(p.tag)}</span>` : ''}</span><span class="age">${Math.floor(ageOf(p, s.now))} år</span><span class="act">${p.task ? taskName(p.task) : '–'}</span><span class="rb">${bar(m, m < 0.35 ? 'low' : '', trend(p, 'humor', m))}</span></button></li>`;
    }).join('')}</ul>`;
  } else if (tab === 'logg') {
    box.innerHTML = `<ol class="logg">${s.log.slice().reverse().slice(0, 150).map(l => `<li class="k-${l.kind}"><span class="when">${timeLabel(s, l.t)}</span>${linkify(l)}</li>`).join('')}</ol>`;
  } else if (tab === 'eld') {
    box.innerHTML = fireHtml();
  } else if (tab === 'seder') {
    box.innerHTML = sederHtml();
  } else {
    const p = byId(s, selected);
    if (!p) { box.innerHTML = `<p class="muted">Klicka på en person på kartan eller i listan för att se allt om hen.</p>`; return; }
    const a = ageOf(p, s.now), now = s.now;
    const kids = s.people.filter(q => q.mother === p.id || q.father === p.id);
    const rels = s.people.filter(q => q.id !== p.id && s.rels[relKey(p.id, q.id)] && alive(q)).map(q => ({ q, r: s.rels[relKey(p.id, q.id)] }))
      .sort((x, y) => Math.abs(y.r.op) - Math.abs(x.r.op)).slice(0, 8);
    const status = alive(p) ? (p.task ? taskName(p.task) : '–') : p.died !== undefined ? `Dog ${p.cause} (${timeLabel(s, p.died)})` : `Flyttade från byn (${timeLabel(s, p.left!)})`;
    box.innerHTML = `
      <div class="phead"><span class="dot big" style="background:#${hsl(p.hue, 0.5, 0.58).toString(16).padStart(6, '0')}"></span><div><h2>${esc(p.name)}</h2>${p.tag && alive(p) ? `<p class="tag">${esc(p.tag)}</p>` : ''}
      <p class="muted">${p.sex === 'k' ? 'Kvinna' : 'Man'}, ${Math.floor(a)} år · född ${timeLabel(s, p.born)}</p><p class="status">${status}</p>${alive(p) && p.task?.why ? `<p class="why">Varför: ${esc(p.task.why)}</p>` : ''}</div></div>
      ${alive(p) ? `<h3>Mående</h3><dl class="kv">
        <dt>Humör</dt><dd>${bar(moodOf(p, now), '', trend(p, 'humor', moodOf(p, now)))}<span>${moodWord(moodOf(p, now))}</span></dd>
        <dt>Mättnad</dt><dd>${bar(p.hunger, '', trend(p, 'hunger', p.hunger))}</dd><dt>Vila</dt><dd>${bar(p.rest, '', trend(p, 'rest', p.rest))}</dd>
        <dt>Gemenskap</dt><dd>${bar(p.social, '', trend(p, 'social', p.social))}</dd><dt>Hälsa</dt><dd>${bar(p.health, p.health < 0.5 ? 'low' : '', trend(p, 'health', p.health))}</dd>
        <dt>Värme</dt><dd>${bar(p.warm, p.warm < 0.4 ? 'low' : '', trend(p, 'warm', p.warm))}</dd><dt>Toa</dt><dd>${bar(p.toa, p.toa < 0.25 ? 'low' : '', trend(p, 'toa', p.toa))}</dd></dl>
        ${p.fiske ? `<h3>Fiske med händerna</h3><p class="muted">${p.fiske.f} försök, ${p.fiske.n} napp, ${p.fiske.k} ${p.fiske.k === 1 ? 'fisk' : 'fiskar'}</p>` : ''}
        ${a >= 8 ? willHtml(p) : ''}
        ${p.thoughts.length ? `<ul class="thoughts">${p.thoughts.map(t => `<li class="${t.v < 0 ? 'neg' : 'pos'}">${esc(t.text)} <span>${t.v > 0 ? '+' : ''}${Math.round(t.v * 100)}</span></li>`).join('')}</ul>` : ''}` : ''}
      <h3>Egenskaper</h3><dl class="kv">${STATS.map(k => `<dt>${STAT_NAMES[k]}</dt><dd>${bar(stat(p, k, now) / 20)}<span>${stat(p, k, now).toFixed(1).replace('.', ',')}</span></dd>`).join('')}</dl>
      <h3>Färdigheter</h3><dl class="kv">${SKILLS.map(k => `<dt>${SKILL_NAMES[k]}</dt><dd>${bar(p.skill[k] / 20, 'skill')}<span>${p.skill[k].toFixed(1).replace('.', ',')}</span></dd>`).join('')}</dl>
      ${knowledgeHtml(p)}
      <h3>Familj</h3><dl class="kv fam"><dt>Föräldrar</dt><dd>${p.mother || p.father ? [byId(s, p.mother), byId(s, p.father)].filter(Boolean).map(q => pLink(q)).join(' och ') : 'Bland de första i byn'}</dd>
        <dt>Partner</dt><dd>${pLink(byId(s, p.partner))}</dd><dt>Barn</dt><dd>${kids.length ? kids.map(pLink).join(', ') : '–'}</dd></dl>
      <h3>Relationer</h3>${rels.length ? `<ul class="rels">${rels.map(({ q, r }) => `<li>${pLink(q)}<span class="rw ${r.op < -10 ? 'neg' : r.op > 25 ? 'pos' : ''}">${relWord(s, p, q, r.op)}</span><span class="muted">${r.talks} samtal</span></li>`).join('')}</ul>` : '<p class="muted">Inga relationer ännu.</p>'}
      <h3>Eftermäle</h3>${p.fame.length ? `<ul class="fame">${p.fame.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : '<p class="muted">Inget som minns ännu.</p>'}`;
  }
}
const num = (v: number, d = 1) => v.toFixed(d).replace('.', ',');
const times = (n: number) => `${n} ${n === 1 ? 'gång' : 'gånger'}`;
function durTxt(ms: number) {
  const h = ms / HOUR;
  const min = Math.max(1, Math.round(ms / 60000));
  return h >= 24 ? `${num(h / 24)} dygn` : h >= 1 ? `${num(h)} timmar` : `${min} ${min === 1 ? 'minut' : 'minuter'}`;
}
function clockTxt(t: number) { const d = new Date(t); return `${timeLabel(s, t)}, kl. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
function spreadWord(v: number) { return v >= 0.8 ? 'Hög' : v >= 0.3 ? 'Måttlig' : v >= 0.1 ? 'Låg' : 'Mycket låg'; }
function fireEntry(e: FireLog) {
  const who = pLink(byId(s, e.id));
  const txt = e.k === 'tänd' ? (e.id ? `${who} tände elden${e.n && e.n > 1 ? ` efter ${e.n} försök` : ''}.` : 'Byns grundare tände elden.')
    : e.k === 'fyll' ? `${who} lade på ${num(e.n ?? 0)} ved.`
    : e.k === 'glöd' ? `${who} blåste liv i glöden.`
    : e.k === 'sprack' ? `${who}s gniststen sprack.`
    : `Elden slocknade. Den hade bränt ${num(e.n ?? 0)} ved.`;
  return `<li><span class="when">${clockTxt(e.t)}</span>${txt}</li>`;
}
function fireHtml() {
  const f = s.fire, h = hearthOf(f), now = s.now, ig = igniterOf(s);
  const status = f.lit ? 'Brinner' : emberOn(s) ? `Glöder. Ny ved får den att brinna igen (${durTxt(f.emberUntil! - now)} kvar).` : (f.ash ?? 0) >= 1 ? 'Utbrunnen. Kvar ligger en svart hög med kol.' : 'Släckt. Den måste tändas på nytt.';
  const tender = living(s).find(p => p.task?.act === 'elda'), lighter = living(s).find(p => p.task?.act === 'tanda');
  const fills = Object.entries(f.fills).map(([id, n]) => ({ p: byId(s, Number(id)), n })).filter(x => x.p).sort((a, b) => b.n - a.n).slice(0, 6);
  const tgt = fireWant(s);
  return `
    <div class="phead"><span class="dot big" style="background:${f.lit ? '#e2702e' : emberOn(s) ? '#b3361e' : '#4b4640'}"></span><div><h2>${esc(h.name)}</h2>
    <p class="muted">${esc(h.desc)}</p><p class="status">${status}</p></div></div>
    <h3>Just nu</h3><dl class="kv">
      <dt>Ved på elden</dt><dd>${bar(f.fuel / h.maxFuel)}<span>${num(f.fuel)} av ${h.maxFuel}</span></dd>
      <dt>Värme</dt><dd>${bar(fireHeat(s))}<span>${f.lit ? `${num(heatRadius(s))} rutor ut` : '–'}</span></dd>
      <dt>Förbrukning</dt><dd>${num(h.burn)} ved i timmen</dd>
      <dt>Räcker</dt><dd>${f.lit ? `ca ${durTxt(f.fuel / h.burn * HOUR)}` : '–'}</dd>
      <dt>Önskat</dt><dd>${num(tgt)} ved på elden</dd>
      ${f.wantWhy && byId(s, f.wantBy) ? `<dt>Önskas av</dt><dd>${pLink(byId(s, f.wantBy))}: ${esc(f.wantWhy).toLowerCase()}</dd>` : ''}
      ${tender ? `<dt>Hämtar ved</dt><dd>${pLink(tender)}</dd>` : ''}
    </dl>
    ${f.lit ? `<h3>Denna eld</h3><dl class="kv fam">
      <dt>Brunnit i</dt><dd>${durTxt(now - (f.litAt ?? now))}</dd>
      <dt>Tändes</dt><dd>${f.litAt !== undefined ? clockTxt(f.litAt) : '–'}</dd>
      <dt>Tänd av</dt><dd>${f.litBy !== undefined ? pLink(byId(s, f.litBy)) : 'Byns grundare'}</dd>
      <dt>Ved använd</dt><dd>${num(f.burned)}</dd></dl>` : ''}
    <h3>Tändning</h3><dl class="kv fam">
      <dt>Tänddon</dt><dd>${ig ? `${esc(ig.name)} (${Math.floor(s.items[ig.id] ?? 0)} i förrådet)` : 'Inget. Någon måste hitta en gniststen.'}</dd>
      <dt>Torrt gräs</dt><dd>${Math.floor(s.items.torrgras ?? 0)} i förrådet</dd>
      <dt>Små pinnar</dt><dd>${Math.floor(s.items.pinnar ?? 0)} i förrådet</dd>
      <dt>Bränsle</dt><dd>${Math.floor(s.wood)} ved och ${Math.floor(s.items.grenar ?? 0)} grenar i förrådet (grenar brinner fort)</dd>
      ${(f.ash ?? 0) >= 1 ? `<dt>Kolhög</dt><dd>${f.ash} kol i den gamla elden, ligger kvar ca ${durTxt((f.ashUntil ?? now) - now)}</dd>` : ''}
      ${(s.items.kol ?? 0) >= 1 ? `<dt>Kol</dt><dd>${Math.floor(s.items.kol)} i förrådet</dd>` : ''}
      ${ig ? `<dt>Per försök</dt><dd>${ig.grass} gräs och ${ig.sticks} pinnar (eller 1 kol), ca ${ig.minutes} minuter${(f.ash ?? 0) >= 1 ? '. Kolhögen tar lättare fyr.' : ''}</dd>` : ''}
      ${!f.lit ? `<dt>Försök</dt><dd>${f.tries} sedan elden slocknade${lighter ? `, ${pLink(lighter)} försöker nu` : ''}</dd>` : ''}
    </dl>
    <h3>Totalt</h3><dl class="kv fam">
      <dt>Brunnit</dt><dd>${f.litSec > 0 ? durTxt(f.litSec * 1000) : 'Aldrig'}</dd>
      <dt>Ved bränd</dt><dd>${Math.round(f.totalBurned)}</dd>
      <dt>Tänd</dt><dd>${times(f.lightings)}, ${f.tryTotal} försök</dd>
      <dt>Slocknat</dt><dd>${times(f.outs)}</dd></dl>
    <h3>Eldstaden</h3><dl class="kv fam">
      <dt>Mest ved</dt><dd>${h.maxFuel}</dd>
      <dt>Välbehag</dt><dd>+${Math.round(h.comfort * 100)} i humör nära elden</dd>
      <dt>Inomhus</dt><dd>${h.indoor ? 'Ja' : 'Nej'}</dd>
      <dt>Spridningsrisk</dt><dd>${spreadWord(h.spread)}</dd></dl>
    ${fills.length ? `<h3>Fyller oftast på</h3><ul class="rels">${fills.map(x => `<li>${pLink(x.p)}<span></span><span class="muted">${times(x.n)}</span></li>`).join('')}</ul>` : ''}
    <h3>Historik</h3>${f.log.length ? `<ol class="logg">${f.log.slice().reverse().slice(0, 40).map(fireEntry).join('')}</ol>` : '<p class="muted">Elden har aldrig brunnit.</p>'}`;
}
const HABIT_GROUPS: { name: string; acts: Act[] }[] = [
  { name: 'Jakt', acts: ['jakt'] }, { name: 'Fiske', acts: ['fiske'] }, { name: 'Samla mat', acts: ['samla'] }, { name: 'Hugga ved', acts: ['ved'] },
  { name: 'Hantverk', acts: ['hantverk'] }, { name: 'Berätta', acts: ['beratta'] }, { name: 'Sköta elden', acts: ['elda', 'tanda'] },
  { name: 'Hålla vakt', acts: ['vakt'] }, { name: 'Prata', acts: ['samtal'] }, { name: 'Vila', acts: ['vila'] }, { name: 'Leka', acts: ['leka'] },
];
function willHtml(p: Person) {
  const d = duty(s, p), tot = habitTotal(p);
  const top = tot > 0 ? HABIT_GROUPS.map(g => ({ g, v: habitShare(p, g.acts, tot) })).filter(x => x.v >= 0.04).sort((a, b) => b.v - a.v).slice(0, 4) : [];
  return `<h3>Vilja</h3><dl class="kv">
    <dt>Pliktkänsla</dt><dd>${bar(d, 'skill')}<span>${d > 0.75 ? 'Plikttrogen' : d > 0.5 ? 'Gör sin del' : d > 0.3 ? 'Bekväm' : 'Lat'}</span></dd>
    ${top.map(x => `<dt>${x.g.name}</dt><dd>${bar(x.v / top[0].v)}<span>${Math.round(x.v * 100)} %</span></dd>`).join('')}</dl>
    ${top.length ? '<p class="muted small">Staplarna visar vad hen ägnat sin vakna tid åt de senaste dygnen.</p>' : ''}`;
}
function sedBar(v: number) {
  const w = Math.round(Math.abs(v) * 50);
  return `<span class="sbar"><span style="${v >= 0 ? `left:50%;width:${w}%` : `left:${50 - w}%;width:${w}%`}"></span></span>`;
}
function sedWord(k: Sed, v: number) {
  const i = SED_INFO[k], a = Math.abs(v);
  if (a < 0.12) return 'Ingen tydlig hållning';
  return `${a > 0.55 ? 'Starkt' : a > 0.3 ? 'Tydligt' : 'Lite'}: ${(v > 0 ? i.pos : i.neg).toLowerCase()}`;
}
function sederHtml() {
  const sd = s.seder;
  const voices = living(s).map(p => ({ p, w: influence(s, p) })).filter(x => x.w > 0).sort((a, b) => b.w - a.w).slice(0, 5);
  return `<p class="muted">Byns seder är vad invånarna tillsammans tycker är viktigt. De växer fram ur deras egenskaper och ur det som händer byn. Äldre och karismatiska röster väger tyngst. Sederna påverkar vad var och en väljer att göra.</p>
    <ul class="seder">${SEDER.map(k => `<li><div class="sedtop"><span>${SED_INFO[k].neg}</span><span>${SED_INFO[k].pos}</span></div>${sedBar(sd.v[k])}
      <p class="sedw">${sedWord(k, sd.v[k])}</p><p class="muted small">${SED_INFO[k].effect}</p></li>`).join('')}</ul>
    <h3>Tyngst röster</h3>${voices.length ? `<ul class="rels">${voices.map(x => `<li>${pLink(x.p)}<span></span><span class="muted">${Math.floor(ageOf(x.p, s.now))} år${x.p.tag ? `, ${esc(x.p.tag.toLowerCase())}` : ''}</span></li>`).join('')}</ul>` : '<p class="muted">–</p>'}
    <h3>Det som format sederna</h3>${sd.log.length ? `<ol class="logg">${sd.log.slice().reverse().map(l => `<li><span class="when">${timeLabel(s, l.t)}</span>${esc(l.text)}</li>`).join('')}</ol>` : '<p class="muted">Inget särskilt har hänt ännu.</p>'}`;
}
function linkify(l: LogEntry) {
  let t = esc(l.text);
  for (const id of l.ids) { const p = byId(s, id); if (p) t = t.replace(esc(p.name), `<button class="plink" data-id="${p.id}" type="button">${esc(p.name)}</button>`); }
  return t;
}
document.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest('[data-id]') as HTMLElement | null;
  if (b) { selectPerson(Number(b.dataset.id)); return; }
  const tb = (e.target as HTMLElement).closest('.tabs button') as HTMLElement | null;
  if (tb) { tab = tb.dataset.tab as any; renderPanel(true); }
});

function renderClock() {
  const t = s.now;
  const d = new Date(t);
  const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
  $('calYear').textContent = `År ${yearNo(s)}`;
  $('calAge').textContent = `${AGES[ageIndex(s)]}, dag ${ageDay(s)} av 7`;
  { const c = Math.round(temperature(s, t)); $('calTemp').textContent = `🌡 ${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(c)} °C`; }
  $('calTime').textContent = `${isLight(t) ? 'Ljus tid' : 'Mörk tid'} · ${hh}:${mm}${testMode ? ' (test)' : ''}`;
}

// ---------- kontroller ----------
function setSpeed(v: number) {
  speed = v;
  for (const b of document.querySelectorAll<HTMLButtonElement>('#speeds button')) b.setAttribute('aria-pressed', String(Number(b.dataset.v) === v));
}
$('testToggle').addEventListener('change', async e => {
  const on = (e.target as HTMLInputElement).checked;
  if (on) {
    saveLocal(); await saveDb();
    realState = s;
    s = JSON.parse(serialize(s));
    testMode = true; $('speeds').hidden = false; document.body.classList.add('testing'); setSpeed(3600);
  } else {
    testMode = false; $('speeds').hidden = true; document.body.classList.remove('testing'); setSpeed(1);
    if (realState) { s = realState; realState = null; }
    for (const p of living(s)) p.task = undefined;
    drawTerrain(true);
    await catchUp(Date.now(), Date.now() - s.now > 10 * 60 * 1000);
  }
  renderClock(); renderPanel(true);
});
for (const b of document.querySelectorAll<HTMLButtonElement>('#speeds button')) b.addEventListener('click', () => setSpeed(Number(b.dataset.v)));
$('newVillage').addEventListener('click', () => { $('confirmNew').hidden = false; });
$('cancelNew').addEventListener('click', () => { $('confirmNew').hidden = true; });
$('okNew').addEventListener('click', () => {
  $('confirmNew').hidden = true;
  if (testMode) { ($('testToggle') as HTMLInputElement).checked = false; testMode = false; realState = null; $('speeds').hidden = true; document.body.classList.remove('testing'); setSpeed(1); }
  s = createState(Math.floor(Math.random() * 2 ** 31), Date.now());
  selected = undefined; tab = 'folk'; camX = -1; layout();
  drawTerrain(true); saveLocal(); saveDb(); renderPanel(true);
});

// ---------- huvudloop ----------
const events: TalkEvent[] = [];
let lastUi = 0, lastLocal = 0, lastDb = 0;
function tick() {
  if (!s || busy) return;
  const realDt = Math.min(0.25, app.ticker.deltaMS / 1000);
  if (testMode) {
    let dt = realDt * speed;
    if (speed > 60) { while (dt > 0) { const d = Math.min(300, dt); step(s, d, false); dt -= d; } for (const p of living(s)) if (p.task) { p.x = p.task.tx; p.y = p.task.ty; } }
    else { while (dt > 0) { const d = Math.min(0.5, dt); step(s, d, true, events); dt -= d; } }
  } else {
    const lag = (Date.now() - s.now) / 1000;
    if (lag > 120) { catchUp(Date.now(), lag > 600); return; }
    let dt = lag;
    if (dt <= 0.01) step(s, 0, true, events);
    while (dt > 0.01) { const d = Math.min(0.5, dt); step(s, d, true, events); dt -= d; }
  }
  const now = performance.now();
  for (const e of events.splice(0)) { bubbles.push({ id: e.a, kind: e.kind, good: e.good, until: now + 2600 }); }
  if (follow !== undefined) {
    const p = byId(s, follow);
    if (p && alive(p)) { camX = p.x * TS + TS / 2; camY = p.y * TS + TS / 2; layout(); } else stopFollow();
  }
  drawTerrain();
  drawStructures(now);
  drawPeople(now);
  drawNight(s.now);
  if (now - lastUi > 600) { lastUi = now; renderClock(); renderPanel(); renderPorts(); }
  if (!testMode && now - lastLocal > 20000) { lastLocal = now; saveLocal(); }
  if (!testMode && now - lastDb > 60000) { lastDb = now; saveDb(); }
}
let lastPointer = 0;
document.addEventListener('pointerdown', () => { lastPointer = performance.now(); }, true);

document.addEventListener('visibilitychange', () => { if (document.hidden) { saveLocal(); saveDb(); } });
window.addEventListener('pagehide', () => { saveLocal(); });

async function boot() {
  $('map').appendChild(app.view as HTMLCanvasElement);
  layout();
  new ResizeObserver(layout).observe($('map'));
  const loaded = await loadSaves();
  if (loaded) {
    s = loaded;
    for (const p of living(s)) p.task = undefined;
    camX = -1; layout();
    drawTerrain(true);
    renderClock(); renderPanel(true);
    await catchUp(Date.now(), Date.now() - s.now > 10 * 60 * 1000);
  } else {
    s = createState(Math.floor(Math.random() * 2 ** 31), Date.now());
    camX = -1; layout();
    drawTerrain(true); saveLocal(); saveDb();
  }
  $('loading').hidden = true;
  renderClock(); renderPanel(true);
  app.ticker.add(tick);
}
boot();
// gör DAY/HOUR tillgängliga för felsökning i konsolen
(window as any).__byn = { get s() { return s; }, DAY, HOUR, getMap, coverOf, groundOf };
