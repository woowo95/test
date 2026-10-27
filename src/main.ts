import { AGES, BEAT, DAY, HOUR, MIN, SEC, TalkEvent, VADERLAGE, vaderNu, kalender, alive, byId, cloneState, coverOf, createState, getMap, groundOf, isLight, rikedomDelar, spar, step, temperature, visning, yearNo, State } from './sim';
import { $ } from './ui/hjalp';
import { s, setByn, ui, nyBild, vidNyBy } from './ui/lage';
import { TS, app, cam, layout, view, world } from './ui/scen';
import { drawNight, drawTerrain } from './ui/terrang';
import { drawVader } from './ui/vaderbild';
import { drawStructures } from './ui/foremal';
import { drawFilter } from './ui/filter';
import { drawAnimals, drawPlants } from './ui/vaxter';
import { drawFlackar } from './ui/smuts';
import { addTalks, drawPeople, posOf } from './ui/manniskor';
import { renderPanel } from './ui/panel';
import { renderPorts, stopFollow } from './ui/portratt';
import { catchUp, loadSaves, nyByVald, saveDb, saveLocal } from './ui/spara';
import './ui/interaktion';

// startpunkten: klockan, kontrollerna, huvudloopen och uppstarten. Allt annat i gränssnittet ligger i ui/
function renderClock() {
  const t = ui.nu;
  const d = new Date(t);
  const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
  $('calYear').textContent = `År ${yearNo(s, t)}`;
  { const k = kalender(s, t); $('calAge').textContent = `${AGES[k.ai]}, dag ${k.dag} av ${k.av}`; }
  { // temperaturen och vädret (steg 2.11.1); vädrets namn och vad det gör visas när man håller musen över det
    const c = Math.round(temperature(s, t)), v = VADERLAGE[vaderNu(s, t).lage], el = $('calTemp');
    el.textContent = `${v.ikon} 🌡 ${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(c)} °C`; el.title = `${v.namn}. ${v.text}`;
  }
  { // byns rikedom (varde.ts): talet, och vad den består av när musen är över
    const r = rikedomDelar(s), sum = r.forrad + r.redskap + r.hus, el = $('calRik'), a = s.delning?.andel ?? 0;
    el.textContent = `⚖ ${Math.round(sum)}`;
    el.title = `Byns rikedom: ${Math.round(sum)} (ungefär arbetstimmar)\nFörrådet ${Math.round(r.forrad)} · redskapen ${Math.round(r.redskap)} · husen ${Math.round(r.hus)}\n${a > 0 ? `${Math.round(a * 100)} % av det folk skaffar går till byn` : 'Byn är så rik att folk behåller det de skaffar'}`;
  }
  $('sparFel').hidden = !ui.sparFel;
  $('molnFel').hidden = !ui.molnFel;
  $('lokalFel').hidden = !ui.lokalFel;
  $('calTime').textContent = `${isLight(t) ? 'Ljus tid' : 'Mörk tid'} · ${hh}:${mm}${ui.testMode ? ' (test)' : ''}`;
}

// ---------- kontroller ----------
let speed = 1;
let realState: State | null = null; // sparad verklig by medan testläget körs
function setSpeed(v: number) {
  speed = v;
  for (const b of document.querySelectorAll<HTMLButtonElement>('#speeds button')) b.setAttribute('aria-pressed', String(Number(b.dataset.v) === v));
}
function leaveTest() { ui.testMode = false; $('speeds').hidden = true; document.body.classList.remove('testing'); setSpeed(1); }
// testläget stängs utan att den verkliga byn kommer tillbaka (en annan by tar dess plats)
function dropTest() { if (ui.testMode) { ($('testToggle') as HTMLInputElement).checked = false; realState = null; leaveTest(); } }
// en ny by med slumpat frö, sparad direkt
function nyBy() {
  setByn(createState(Math.floor(Math.random() * 2 ** 31), Date.now()));
  cam.x = -1; layout();
  drawTerrain(true); drawPlants(true); saveLocal(); saveDb();
}
// en inläst by, räknad ikapp till nu
async function laddaIn(by: State) {
  setByn(by);
  cam.x = -1; layout();
  drawTerrain(true); drawPlants(true);
  renderClock(); renderPanel(true);
  await catchUp(Date.now());
}
// byn i molnet gick att läsa först senare och är nyare än den som spelas: den tar över
function nyareIMolnet(by: State) {
  dropTest();
  ui.selected = undefined; ui.tab = 'folk';
  laddaIn(by).then(() => { renderClock(); renderPanel(true); });
}
$('testToggle').addEventListener('change', async e => {
  const on = (e.target as HTMLInputElement).checked;
  if (on) {
    saveLocal(); await saveDb();
    realState = s;
    setByn(cloneState(s));
    spar.v = new WeakMap();
    ui.testMode = true; $('speeds').hidden = false; document.body.classList.add('testing'); setSpeed(3600);
  } else {
    leaveTest();
    if (realState) { setByn(realState); realState = null; }
    drawTerrain(true); drawPlants(true);
    await catchUp(Date.now());
  }
  renderClock(); renderPanel(true);
});
for (const b of document.querySelectorAll<HTMLButtonElement>('#speeds button')) b.addEventListener('click', () => setSpeed(Number(b.dataset.v)));
$('newVillage').addEventListener('click', () => { $('confirmNew').hidden = false; });
$('cancelNew').addEventListener('click', () => { $('confirmNew').hidden = true; });
$('okNew').addEventListener('click', () => {
  $('confirmNew').hidden = true;
  dropTest(); nyByVald();
  ui.selected = undefined; ui.tab = 'folk';
  nyBy(); renderPanel(true);
});

// ---------- huvudloop ----------
// Byn räknas i slag om fem minuter (BEAT), alltid ett slag före klockan som visas (ui.nu). Under slaget ritas folk där
// de är enligt det som räknades (manniskor.ts), så spelet visar samma sak som räknades
const events: TalkEvent[] = [];
vidNyBy.push(() => { events.length = 0; });
const IKAPP_EFTER = 120 * SEC; // är byn mer än två minuter efter klockan (fliken var gömd) räknas den ikapp
const MAX_SLAG = 300; // högst så här många slag per bildruta (25 timmar i spelet)
const PANEL_MS = 600, LOKAL_MS = 20000, MOLN_MS = MIN; // hur ofta (datorns tid) panelen ritas om och byn sparas i webbläsaren och i molnet
let lastUi = 0, lastLocal = 0, lastDb = 0;
function tick() {
  if (!s || ui.busy) return;
  const realDt = Math.min(0.25, app.ticker.deltaMS / 1000);
  let vt: number;
  if (ui.testMode) vt = Math.max(ui.nu, s.now - BEAT * SEC) + realDt * speed * SEC;
  else {
    vt = Date.now();
    if (vt - s.now > IKAPP_EFTER) { catchUp(vt); return; }
  }
  // spar.pa är på också här: varje slag börjar om vägen (steg.ts), så bara det sista slaget sparas och ritas
  for (let n = 0; s.now < vt && n < MAX_SLAG; n++) step(s, BEAT, events);
  ui.nu = Math.min(vt, s.now);
  nyBild();
  const now = performance.now();
  addTalks(events, now, ui.nu);
  if (ui.follow !== undefined) {
    const p = byId(s, ui.follow);
    if (p && alive(p)) { const q = posOf(p); cam.x = q.x * TS + TS / 2; cam.y = q.y * TS + TS / 2; layout(); } else stopFollow();
  }
  drawTerrain();
  drawPlants(); drawFlackar(); drawAnimals();
  drawStructures(now);
  drawPeople(now);
  drawNight(ui.nu);
  drawFilter();
  drawVader(now);
  if (now - lastUi > PANEL_MS) { lastUi = now; renderClock(); renderPanel(); renderPorts(); }
  if (!ui.testMode && now - lastLocal > LOKAL_MS) { lastLocal = now; saveLocal(); }
  if (!ui.testMode && now - lastDb > MOLN_MS) { lastDb = now; saveDb(); }
}

document.addEventListener('visibilitychange', () => { if (document.hidden) { saveLocal(); saveDb(); } });
window.addEventListener('pagehide', () => { saveLocal(); });

async function boot() {
  spar.pa = true; // vägen var och en går under slaget sparas för att ritas
  visning.pa = true; // gränssnittet läser byn utan att ändra den (typer.ts); step räknar ändå som simuleringen
  $('map').appendChild(view);
  layout();
  new ResizeObserver(layout).observe($('map'));
  const loaded = await loadSaves(nyareIMolnet);
  if (loaded) await laddaIn(loaded);
  else nyBy();
  $('loading').hidden = true;
  renderClock(); renderPanel(true);
  app.ticker.add(tick);
}
boot();
// byn och kartan tillgängliga för felsökning i konsolen
(window as any).__byn = { get s() { return s; }, DAY, HOUR, getMap, coverOf, groundOf, get world() { return world; } };
