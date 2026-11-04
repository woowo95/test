import { BEAT, Borta, MIN, State, joinParts, living, migrate, serialize, serializeParts, step, timeLabel } from '../sim';
import { $, esc } from './hjalp';
import { bortaHtml } from './borta';
import { s, ui } from './lage';
import { drawTerrain } from './terrang';
import { drawPlants } from './vaxter';

// ---------- sparning: i webbläsaren och i artefaktens databas; den nyaste vinner när byn läses in ----------
const SAVE_KEY = 'samhalle-save-v1';
let lokalLarm = false; // felet skrivs i konsolen en gång, inte var tjugonde sekund
export function saveLocal() {
  if (ui.testMode || !s) return;
  try { localStorage.setItem(SAVE_KEY, serialize(s)); ui.lokalFel = lokalLarm = false; }
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
    const ny = slot === 'a' ? 'b' : 'a', delar: Record<string, number> = {};
    for (const [d, txt] of Object.entries(serializeParts(s))) {
      const n = Math.max(1, Math.ceil(txt.length / BIT));
      delar[d] = n;
      if (isHist(d) && skrivet.get(d) === txt) continue;
      for (let i = 0; i < n; i++) await docOf(db, uid, delNamn(ny, d, i)).set({ t: txt.slice(i * BIT, (i + 1) * BIT) });
      if (isHist(d)) skrivet.set(d, txt);
    }
    await docOf(db, uid, 'byn').set({ slot: ny, delar });
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
// Sammanställningen ligger kvar tills spelaren stänger den med "Till byn" (steg 3.10.22): den sparas med byn (s.borta) och
// visas igen efter en omladdning, och en ny ikappräkning innan den stängts gäller hela tiden sedan den förra stängdes
export async function catchUp(target: number) {
  const span = target - s.now;
  if (span <= 0) { if (s.borta) { $('overlay').hidden = false; showSummary(s.borta); } return; }
  const showOverlay = span > 10 * MIN || !!s.borta; // efter mer än tio minuter visas en sammanställning
  ui.busy = true;
  const from = s.now;
  if (showOverlay) s.borta ??= { fran: from, fodda: s.stat?.fodda ?? 0, doda: s.stat?.doda ?? 0, folk: living(s).length };
  const ov = $('overlay');
  if (showOverlay) { ov.hidden = false; $('ovBody').innerHTML = `<p class="ovLead">Byn har levt vidare medan du var borta.</p><div class="prog"><div id="progBar"></div></div><p class="muted" id="progTxt"></p>`; }
  await new Promise<void>((resolve, reject) => {
    const chunk = () => {
      const t0 = performance.now();
      try { while (s.now < target && performance.now() - t0 < 30) step(s, BEAT); } catch (e) { reject(e); return; }
      if (showOverlay) {
        const f = Math.min(1, (s.now - from) / span);
        const bar = document.getElementById('progBar'); if (bar) bar.style.width = (f * 100).toFixed(1) + '%';
        const pt = document.getElementById('progTxt'); if (pt) pt.textContent = `${timeLabel(s, s.now)} · ${Math.round(f * 100)} %`;
      }
      if (s.now < target) setTimeout(chunk, 0); else resolve();
    };
    chunk();
  }).catch(e => {
    // ett fel i simuleringen: spelet står still (det skulle bara hända igen), men spelaren får veta det
    ov.hidden = false; $('ovBody').innerHTML = `<p class="ovLead">Något gick fel när byn räknades ikapp.</p><p class="muted">${esc(String(e))}</p>`;
    throw e;
  });
  ui.busy = false; ui.nu = target;
  if (showOverlay && s.borta) showSummary(s.borta);
  saveLocal(); saveDb();
  drawTerrain(true); drawPlants(true);
}
// sammanställningen efter ikappräkningen (steg 5.4.3.4, ui/borta.ts): tiden, talen och de nya notiserna
function showSummary(b: Borta) {
  $('ovBody').innerHTML = bortaHtml(b);
  const stang = () => { $('overlay').hidden = true; s.borta = undefined; saveLocal(); saveDb(); };
  $('ovClose').onclick = stang;
  // knappen öppnar notiserna (ui/notiser.ts tar hand om data-notis) och stänger sammanfattningen
  const nb = document.getElementById('ovNotiser'); if (nb) nb.addEventListener('click', stang);
}
