import { DAY, KUNSKAP_NAMES, LogEntry, State, compact, describe, living, migrate, serialize, step, timeLabel } from '../sim';
import { $, esc } from './hjalp';
import { s, ui } from './lage';
import { drawTerrain } from './terrang';
import { drawPlants } from './vaxter';

// ---------- sparning: i webbläsaren och i artefaktens databas; den nyaste vinner när byn läses in ----------
const SAVE_KEY = 'samhalle-save-v1';
let db: any = null, uid: string | null = null;
export function saveLocal() {
  if (ui.testMode || !s) return;
  try { compact(s); localStorage.setItem(SAVE_KEY, serialize(s)); } catch { /* ignoreras */ }
}
export async function saveDb() {
  if (ui.testMode || !s || !db || !uid) return;
  try { compact(s); await db.doc(`data/users/${uid}/save`).set({ state: serialize(s), savedAt: Date.now() }); } catch { /* ignoreras */ }
}
function parse(txt: string | null | undefined): State | null {
  if (!txt) return null;
  try { const o = JSON.parse(txt); return o && o.v === 1 && Array.isArray(o.people) ? migrate(o) : null; } catch { return null; }
}
export async function loadSaves(): Promise<State | null> {
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

// ---------- ikappräkning: byn lever vidare i snabbläget medan spelaren var borta ----------
export async function catchUp(target: number, showOverlay: boolean) {
  const span = target - s.now;
  if (span <= 0) return;
  ui.busy = true;
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
  ui.busy = false;
  for (const p of living(s)) p.task = undefined;
  if (showOverlay) showSummary(from, logStart, before);
  saveLocal(); saveDb();
  drawTerrain(true); drawPlants(true);
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
      if (ex.length < 4 && (l.k === 'fara' || l.k === 'flinta' || l.c >= 0.75)) ex.push(`${esc(p.name)}: ${esc(describe(s, l).text)}`);
    }
  }
  if (!nyK.length && !nyL) return '';
  const delar = Object.entries(per).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} om ${LKIND_NAMES[k] ?? k}`).join(', ');
  return `<h3>Ny kunskap och nya lärdomar</h3><ul class="sumList">${nyK.slice(0, 6).map(x => `<li>${x}</li>`).join('')}${nyK.length > 6 ? `<li class="muted">och ${nyK.length - 6} till</li>` : ''}
    ${nyL ? `<li>${nyL} nya lärdomar: ${delar}</li>${ex.map(x => `<li class="muted">${x}</li>`).join('')}` : ''}</ul>`;
}
// sammanställningen efter ikappräkningen: det viktigaste som hänt
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
