import { storStridNu, nastaSteg, Borta, MIN, State, joinParts, living, serializeParts, spar, step, stridBild, DAY } from '../sim';
import { lasBy, sparaBy, tolkaText, webbBas } from './lagring';
import { $, esc } from './hjalp';
import { bortaHtml, ikappHtml, spolaText } from './borta';
import { gaHem, huvud, s, ui } from './lage';
import { drawTerrain } from './terrang';
import { drawPlants } from './vaxter';
import { sparaAnnan } from './byar';
import { app } from './scen';

// ---------- sparning: i webbläsaren och i artefaktens databas; den nyaste vinner när byn läses in ----------
// I webbläsaren ligger byn i webbläsarens databas, en post per del (lagring.ts, steg 11.2.1)
const EGEN = 'egen';
let lokalLarm = false; // felet skrivs i konsolen en gång, inte var tjugonde sekund
export function saveLocal() {
  const s = huvud(); // huvudbyn också när en väckt by visas (steg 11.13.11)
  if (ui.testMode || !s) return;
  if (ui.annanBy) { void sparaAnnan().then(ok => { ui.lokalFel = !ok; }); return; } // en annan by sparas för sig (steg 9.2.16, byar.ts)
  sparaBy(webbBas, EGEN, s).then(() => { ui.lokalFel = lokalLarm = false; ui.lokalFelNamn = undefined; }, e => {
    ui.lokalFel = true; ui.lokalFelNamn = (e as { name?: string } | undefined)?.name ?? String(e); /* varningen säger felets namn (steg 12.1.23) */ if (!lokalLarm) console.error('Byn kunde inte sparas i webbläsaren', e); lokalLarm = true;
  });
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
  const s = huvud();
  if (ui.testMode || !s || !db || !uid || sparar || ui.annanBy) return; // i molnet bara den egna byn (steg 9.2.16)
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
const parseMoln = (txt: string) => tolkaText(txt) ?? (() => { throw new Error('byn i molnet gick inte att tolka'); })();
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
  try { local = (await lasBy(webbBas, EGEN))?.by ?? null; } catch (e) { console.warn('Byn i webbläsaren gick inte att läsa', e); }
  try { const v = localStorage.getItem(GRUND_KEY); g = v === null ? null : Number(v); } catch { /* ignoreras */ }
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
// snabbspolningen (steg 5.4.5.1): main.ts ger funktionen som ritar kartan; valet sparas i webbläsaren
export const ikapp: { rita?: () => void } = {};
const SPOLA_NYCKEL = 'samhallssimulatorn.spola';
try { ui.spola = localStorage.getItem(SPOLA_NYCKEL) === '1'; } catch { /* utan webbläsarens lagring: av */ }
// Under ikappräkningen ritas ingen bild (spelets bildrutor står still), utom när den visas som snabbspolning: annars går
// det mesta av tiden till att rita kartan mellan bitarna. Vägarna och slagen sparas bara för bilden (spar, stridBild) och
// sparas därför bara när den syns. Byn sparas efter hand (IKAPP_LOKAL_MS och IKAPP_MOLN_MS), så att en omladdning
// fortsätter där räknandet var och inte börjar om; sammanställningen (s.borta) sparas med byn och gäller hela tiden
const BIT_MS = 100, BIT_SPOLA_MS = 30; // datorns tid per bit, och när kartan visas medan den räknas
const IKAPP_LOKAL_MS = 15000, IKAPP_MOLN_MS = MIN; // hur ofta byn sparas i webbläsaren och i molnet under räknandet
// nästa bit efter att webbläsaren fått svara (förloppet, knapparna): ett meddelande till sig själv, som inte väntar de minst
// 4 ms en setTimeout gör och inte stryps till en gång i sekunden när fliken är gömd
const kanal = typeof MessageChannel === 'function' ? new MessageChannel() : undefined;
let vantande: (() => void) | undefined;
if (kanal) kanal.port1.onmessage = () => { const f = vantande; vantande = undefined; f?.(); };
const nasta = (f: () => void) => { if (kanal) { vantande = f; kanal.port2.postMessage(0); } else setTimeout(f, 0); };
export async function catchUp(target: number) {
  gaHem(); // ikappräkningen visar huvudbyn (steg 11.13.11)
  const span = target - s.now;
  if (span <= 0) { if (s.borta) { $('overlay').hidden = false; showSummary(s.borta); } drawTerrain(true, false); drawPlants(true); return; }
  const showOverlay = span > 10 * MIN || !!s.borta; // efter mer än tio minuter visas en sammanställning
  ui.busy = true;
  const from = s.now;
  if (showOverlay) s.borta ??= { fran: from, fodda: s.stat?.fodda ?? 0, doda: s.stat?.doda ?? 0, folk: living(s).length };
  const ov = $('overlay');
  let senastRitad = 0;
  const rita = ikapp.rita, spolar = () => showOverlay && ui.spola && !!rita;
  const visaSpola = () => {
    ov.classList.toggle('spolar', spolar());
    const k = document.getElementById('ovSpola'); if (k) { k.innerHTML = spolaText(ui.spola); k.setAttribute('aria-pressed', String(ui.spola)); }
  };
  if (showOverlay) {
    ov.hidden = false; $('ovBody').innerHTML = ikappHtml(ui.spola, !!rita);
    const k = document.getElementById('ovSpola');
    if (k) k.onclick = () => { ui.spola = !ui.spola; try { localStorage.setItem(SPOLA_NYCKEL, ui.spola ? '1' : '0'); } catch { /* sparas inte */ } visaSpola(); };
    visaSpola();
  }
  app.ticker.stop();
  let sparatLokal = performance.now(), sparatMoln = performance.now();
  await new Promise<void>((resolve, reject) => {
    const chunk = () => {
      const t0 = performance.now(), syns = spolar();
      spar.pa = syns; stridBild.pa = syns;
      try { while (s.now < target && performance.now() - t0 < (syns ? BIT_SPOLA_MS : BIT_MS) && !storStridNu(s)) step(s, nastaSteg(s)); } catch (e) { reject(e); return; }
      const nu = performance.now();
      if (nu - sparatLokal > IKAPP_LOKAL_MS) { sparatLokal = nu; saveLocal(); }
      if (nu - sparatMoln > IKAPP_MOLN_MS) { sparatMoln = nu; void saveDb(); }
      if (storStridNu(s)) { resolve(); return; } // en stor strid stannar ikappräkningen och visas i levande läge (steg 8.8.9); klockan hinner ikapp efteråt
      if (showOverlay) {
        const f = Math.min(1, (s.now - from) / span);
        const bar = document.getElementById('progBar'); if (bar) bar.style.width = (f * 100).toFixed(1) + '%';
        // förloppet i år (steg 11.1.64): År 3 av 5 · 60 %, och bara procenten när det är mindre än ett år
        const arN = Math.ceil(span / DAY), arK = Math.min(arN, Math.floor((s.now - from) / DAY) + 1);
        const pt = document.getElementById('progTxt'); if (pt) pt.textContent = `${arN >= 2 ? `År ${arK} av ${arN} · ` : ''}${Math.round(f * 100)} %`;
        // kartan som den ser ut nu: byn spolas fram medan den räknas (högst åtta bilder i sekunden, så att räknandet går fort)
        if (syns && performance.now() - senastRitad > 120) { rita!(); app.render(); senastRitad = performance.now(); }
      }
      if (s.now < target) nasta(chunk); else resolve();
    };
    chunk();
  }).finally(() => { spar.pa = true; stridBild.pa = true; app.ticker.start(); }).catch(e => {
    // ett fel i simuleringen: spelet står still (det skulle bara hända igen), men spelaren får veta det
    ov.classList.remove('spolar'); ov.hidden = false; $('ovBody').innerHTML = `<p class="ovLead">Något gick fel när byn räknades ikapp.</p><p class="muted">${esc(String(e))}</p>`;
    throw e;
  });
  ui.busy = false; ui.nu = target;
  ov.classList.remove('spolar');
  if (showOverlay && s.borta) showSummary(s.borta);
  saveLocal(); saveDb();
  drawTerrain(true, false); drawPlants(true); // kartan ritas efter hand i bildrutorna, det som syns först
}
// sammanställningen efter ikappräkningen (steg 5.4.3.4, ui/borta.ts): tiden, talen och de nya notiserna
function showSummary(b: Borta) {
  $('ovBody').innerHTML = bortaHtml(b);
  const stang = () => { $('overlay').hidden = true; s.borta = undefined; saveLocal(); saveDb(); };
  $('ovClose').onclick = stang;
  // knappen öppnar notiserna (ui/notiser.ts tar hand om data-notis) och stänger sammanfattningen
  const nb = document.getElementById('ovNotiser'); if (nb) nb.addEventListener('click', stang);
  for (const l of document.querySelectorAll('#ovBody [data-kar-lank]')) l.addEventListener('click', stang); // I krönikan (steg 11.1.64) stänger också
}
