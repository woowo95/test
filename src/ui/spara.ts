import { BEAT, DAY, KUNSKAP_NAMES, LogEntry, MIN, State, compact, describe, joinParts, living, migrate, serialize, serializeParts, step, timeLabel } from '../sim';
import { $, esc } from './hjalp';
import { s, ui } from './lage';
import { drawTerrain } from './terrang';
import { drawPlants } from './vaxter';

// ---------- sparning: i webbläsaren och i artefaktens databas; den nyaste vinner när byn läses in ----------
const SAVE_KEY = 'samhalle-save-v1';
let lokalLarm = false; // felet skrivs i konsolen en gång, inte var tjugonde sekund
export function saveLocal() {
  if (ui.testMode || !s) return;
  try { compact(s); localStorage.setItem(SAVE_KEY, serialize(s)); ui.lokalFel = lokalLarm = false; }
  catch (e) { ui.lokalFel = true; if (!lokalLarm) console.error('Byn kunde inte sparas i webbläsaren', e); lokalLarm = true; }
}
// I databasen: varje del av byn (serializeParts) i ett eller flera dokument om högst BIT tecken (ett dokument rymmer 256 KB),
// och sist dokumentet "byn" som säger vilken uppsättning (a eller b) som är hel. En sparning som avbryts halvvägs lämnar
// alltså den förra uppsättningen orörd. Gamla sparningar låg i ett enda dokument, "save", som bara läses.
// Historiken (en del per vecka, historik.ts) ligger utanför uppsättningarna och skrivs bara när veckans del ändrats,
// så att de gamla veckorna inte skrivs om varje gång.
// Byn sparas i molnet först när den lästs därifrån eller visat sig inte finnas (db och uid sätts då), så att en by som
// inte gick att läsa aldrig skrivs över. Gick den inte att läsa visas ☁? (ui.molnFel) och spelet försöker igen.
const BIT = 80000;
let db: any = null, uid: string | null = null;
let slot = 'a', sparar = false;
const skrivet = new Map<string, string>(); // historikdelarna som de ser ut i databasen
const isHist = (d: string) => d.startsWith('historik-');
const docOf = (d: any, id: string, namn: string) => d.doc(`data/users/${id}/${namn}`);
const delNamn = (sl: string, d: string, i: number) => (isHist(d) ? `${d}-${i}` : `del-${sl}-${d}-${i}`);
export async function saveDb() {
  if (ui.testMode || !s || !db || !uid || sparar) return;
  sparar = true;
  try {
    compact(s);
    const ny = slot === 'a' ? 'b' : 'a', delar: Record<string, number> = {};
    for (const [d, txt] of Object.entries(serializeParts(s))) {
      const n = Math.max(1, Math.ceil(txt.length / BIT));
      delar[d] = n;
      if (isHist(d) && skrivet.get(d) === txt) continue;
      for (let i = 0; i < n; i++) await docOf(db, uid, delNamn(ny, d, i)).set({ t: txt.slice(i * BIT, (i + 1) * BIT) });
      if (isHist(d)) skrivet.set(d, txt);
    }
    await docOf(db, uid, 'byn').set({ slot: ny, delar, now: s.now, savedAt: Date.now() });
    slot = ny; ui.sparFel = false;
  } catch { ui.sparFel = true; }
  sparar = false;
}

// det som lästs ur molnet: byn (null om det inte finns någon), uppsättningen den låg i och historikdelarna som de står där
interface Last { d: any; id: string; by: State | null; slot?: string; hist: [string, string][] }
function parse(txt: string | null | undefined): State | null {
  if (!txt) return null;
  try { const o = JSON.parse(txt); return o && typeof o.v === 'number' && Array.isArray(o.people) ? migrate(o) : null; } catch { return null; }
}
const parseMoln = (txt: string) => parse(txt) ?? (() => { throw new Error('byn i molnet gick inte att tolka'); })();
// delarna läses samtidigt, men bara ur uppsättningen som "byn" pekar ut (den senast hela). Saknas en del, eller går byn inte
// att tolka, kastas ett fel: då gick byn inte att läsa, och den får inte skrivas över
async function readDb(d: any, id: string): Promise<Last> {
  const m = await docOf(d, id, 'byn').get();
  if (m.exists) {
    const { slot: sl, delar } = m.data() as { slot: string; delar: Record<string, number> };
    const namn = Object.keys(delar);
    const texter = await Promise.all(namn.map(async del => {
      const bs = await Promise.all(Array.from({ length: delar[del] }, (_, i) => docOf(d, id, delNamn(sl, del, i)).get()));
      if (bs.some(b => !b.exists)) throw new Error(`delen ${del} saknas i molnet`);
      return bs.map(b => String(b.data()?.t ?? '')).join('');
    }));
    return { d, id, by: parseMoln(joinParts(texter)), slot: sl, hist: namn.map((k, i): [string, string] => [k, texter[i]]).filter(([k]) => isHist(k)) };
  }
  const snap = await docOf(d, id, 'save').get();
  return { d, id, by: snap.exists ? parseMoln(String(snap.data()?.state ?? '')) : null, hist: [] };
}
const LAS_MS = 5000, IGEN_LAS_MS = 30000; // så länge uppstarten väntar på molnet, och ett nytt försök
const IGEN_MS = 15000, IGEN_MAX_MS = 5 * 60000; // nästa försök efter 15 s, sedan dubbelt så länge, högst fem minuter
// undefined: det finns inget moln (inte i artefakten, eller ingen användare). Kastar om byn inte gick att läsa
async function fromCloud(ms: number): Promise<Last | undefined> {
  const c = (window as any).claude;
  if (!c?.use) return undefined;
  let tid = 0;
  const sent = new Promise<never>((_, nej) => { tid = window.setTimeout(() => nej(new Error('molnet svarade inte')), ms); });
  try {
    return await Promise.race([(async () => {
      const d = await c.use('db'), u = await c.use('user');
      if (!d || !u) return undefined;
      const id = await u.id();
      return id ? await readDb(d, id) : undefined;
    })(), sent]);
  } finally { clearTimeout(tid); }
}
// byn i molnet är läst: från och med nu sparas den där, i den andra uppsättningen
function connect(r: Last) {
  db = r.d; uid = r.id;
  if (r.slot) slot = r.slot;
  for (const [k, t] of r.hist) skrivet.set(k, t);
  ui.molnFel = false;
  try { localStorage.removeItem(GRUND_KEY); } catch { /* ignoreras */ }
}
// Tiden i byn som den här webbläsarens by utgick från medan molnet inte gick att läsa (-Infinity för en ny by). En by i molnet
// som är nyare än så vinner när molnet till slut läses, också efter en omladdning, så att den inte skrivs över
const GRUND_KEY = 'samhalle-grund-v1';
let grund = -Infinity;
function setGrund(v: number) { grund = v; try { localStorage.setItem(GRUND_KEY, String(v)); } catch { /* ignoreras */ } }
// spelaren valde en ny by medan molnet inte gick att läsa: den nya byn vinner över den i molnet
export function nyByVald() { if (ui.molnFel) setGrund(Infinity); }
// läser byn ur webbläsaren och molnet; den nyaste vinner. Gick molnet inte att läsa försöker spelet igen, och är byn där
// nyare än den som spelas byts den in med nyare(by)
export async function loadSaves(nyare: (by: State) => void): Promise<State | null> {
  let local: State | null = null, g: number | null = null;
  try { local = parse(localStorage.getItem(SAVE_KEY)); const v = localStorage.getItem(GRUND_KEY); g = v === null ? null : Number(v); } catch { /* ignoreras */ }
  try {
    const r = await fromCloud(LAS_MS);
    if (!r) return local;
    connect(r);
    if (local && r.by) return (g ?? local.now) >= r.by.now ? local : r.by;
    return local ?? r.by;
  } catch (e) {
    console.warn('Byn i molnet gick inte att läsa', e);
    ui.molnFel = true;
    setGrund(g ?? local?.now ?? -Infinity);
    retry(nyare, IGEN_MS);
    return local;
  }
}
function retry(nyare: (by: State) => void, ms: number) {
  window.setTimeout(async () => {
    if (ui.busy) { retry(nyare, ms); return; } // inte mitt i en ikappräkning
    try {
      const r = await fromCloud(IGEN_LAS_MS);
      if (!r) return;
      if (ui.busy) { retry(nyare, ms); return; }
      connect(r);
      if (r.by && r.by.now > grund) nyare(r.by);
    } catch (e) { console.warn('Byn i molnet gick inte att läsa', e); retry(nyare, Math.min(IGEN_MAX_MS, ms * 2)); }
  }, ms);
}

// ---------- ikappräkning: byn lever vidare i samma takt som i spelet medan spelaren var borta ----------
export async function catchUp(target: number) {
  const span = target - s.now;
  if (span <= 0) return;
  const showOverlay = span > 10 * MIN; // efter mer än tio minuter visas en sammanställning
  ui.busy = true;
  const from = s.now;
  const before = knowSnapshot(), stat0 = { ...s.stat };
  const ov = $('overlay');
  if (showOverlay) { ov.hidden = false; $('ovBody').innerHTML = `<p class="ovLead">Byn har levt vidare medan du var borta.</p><div class="prog"><div id="progBar"></div></div><p class="muted" id="progTxt"></p>`; }
  await new Promise<void>(resolve => {
    const chunk = () => {
      const t0 = performance.now();
      while (s.now < target && performance.now() - t0 < 30) step(s, BEAT);
      if (showOverlay) {
        const f = Math.min(1, (s.now - from) / span);
        const bar = document.getElementById('progBar'); if (bar) bar.style.width = (f * 100).toFixed(1) + '%';
        const pt = document.getElementById('progTxt'); if (pt) pt.textContent = `${timeLabel(s, s.now)} · ${Math.round(f * 100)} %`;
      }
      if (s.now < target) setTimeout(chunk, 0); else resolve();
    };
    chunk();
  });
  ui.busy = false; ui.nu = target;
  if (showOverlay) showSummary(from, before, stat0);
  saveLocal(); saveDb();
  drawTerrain(true); drawPlants(true);
}
// vad var och en kan och tror innan ikappräkningen, för att visa det nya i sammanställningen
function knowSnapshot() {
  const m = new Map<number, { k: Record<string, number>; l: Set<string> }>();
  for (const p of living(s)) m.set(p.id, { k: Object.fromEntries(Object.entries(p.kunskap ?? {}).map(([k, e]) => [k, e.v])), l: new Set((p.lardomar ?? []).map(l => l.k + ':' + l.a)) });
  return m;
}
const LKIND_NAMES: Record<string, string> = { samla: 'bär och rötter', jakt: 'vilt', fiske: 'abborre', flinta: 'flinta', fara: 'farliga platser' };
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
      if (ex.length < 4 && (l.k === 'fara' || l.k === 'flinta' || l.c >= 0.75)) ex.push(`${esc(p.name)}: ${esc(describe(s, l).text)}`);
    }
  }
  if (!nyK.length && !nyL) return '';
  const delar = Object.entries(per).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} om ${LKIND_NAMES[k] ?? k}`).join(', ');
  return `<h3>Ny kunskap och nya lärdomar</h3><ul class="sumList">${nyK.slice(0, 6).map(x => `<li>${x}</li>`).join('')}${nyK.length > 6 ? `<li class="muted">och ${nyK.length - 6} till</li>` : ''}
    ${nyL ? `<li>${nyL} nya lärdomar: ${delar}</li>${ex.map(x => `<li class="muted">${x}</li>`).join('')}` : ''}</ul>`;
}
// sammanställningen efter ikappräkningen: det viktigaste som hänt
function showSummary(from: number, before: ReturnType<typeof knowSnapshot>, stat0: Record<string, number>) {
  const ev = s.log.filter(l => l.t > from);
  const years = (s.now - from) / DAY;
  const births = (s.stat?.fodda ?? 0) - (stat0.fodda ?? 0), deaths = (s.stat?.doda ?? 0) - (stat0.doda ?? 0);
  const prio = (e: LogEntry) => e.kind === 'death' ? 5 : e.kind === 'birth' || e.kind === 'move' ? 4 : e.kind === 'skill' || /par\.|skilda|tända elden|slocknade/.test(e.text) ? 3 : e.kind === 'world' && /tiden|Byn|flinta|stenar/.test(e.text) ? 2 : e.kind === 'rel' ? 1 : 0;
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
