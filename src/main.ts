import { AGES, DAY, HOUR, TalkEvent, kalender, alive, byId, coverOf, createState, getMap, groundOf, isLight, living, serialize, step, temperature, yearNo, State } from './sim';
import { $ } from './ui/hjalp';
import { s, setByn, ui, nyBild } from './ui/lage';
import { TS, app, cam, layout, view, world } from './ui/scen';
import { drawNight, drawTerrain } from './ui/terrang';
import { drawStructures } from './ui/foremal';
import { drawFilter } from './ui/filter';
import { drawAnimals, drawPlants } from './ui/vaxter';
import { addTalks, drawPeople } from './ui/manniskor';
import { renderPanel } from './ui/panel';
import { renderPorts, stopFollow } from './ui/portratt';
import { catchUp, loadSaves, saveDb, saveLocal } from './ui/spara';
import './ui/interaktion';

// startpunkten: klockan, kontrollerna, huvudloopen och uppstarten. Allt annat i gränssnittet ligger i ui/
function renderClock() {
  const t = s.now;
  const d = new Date(t);
  const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
  $('calYear').textContent = `År ${yearNo(s)}`;
  { const k = kalender(s); $('calAge').textContent = `${AGES[k.ai]}, dag ${k.dag} av ${k.av}`; }
  { const c = Math.round(temperature(s, t)); $('calTemp').textContent = `🌡 ${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(c)} °C`; }
  $('sparFel').hidden = !ui.sparFel;
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
$('testToggle').addEventListener('change', async e => {
  const on = (e.target as HTMLInputElement).checked;
  if (on) {
    saveLocal(); await saveDb();
    realState = s;
    setByn(JSON.parse(serialize(s)));
    ui.testMode = true; $('speeds').hidden = false; document.body.classList.add('testing'); setSpeed(3600);
  } else {
    leaveTest();
    if (realState) { setByn(realState); realState = null; }
    for (const p of living(s)) p.task = undefined;
    drawTerrain(true); drawPlants(true);
    await catchUp(Date.now(), Date.now() - s.now > 10 * 60 * 1000);
  }
  renderClock(); renderPanel(true);
});
for (const b of document.querySelectorAll<HTMLButtonElement>('#speeds button')) b.addEventListener('click', () => setSpeed(Number(b.dataset.v)));
$('newVillage').addEventListener('click', () => { $('confirmNew').hidden = false; });
$('cancelNew').addEventListener('click', () => { $('confirmNew').hidden = true; });
$('okNew').addEventListener('click', () => {
  $('confirmNew').hidden = true;
  if (ui.testMode) { ($('testToggle') as HTMLInputElement).checked = false; realState = null; leaveTest(); }
  setByn(createState(Math.floor(Math.random() * 2 ** 31), Date.now()));
  ui.selected = undefined; ui.tab = 'folk'; cam.x = -1; layout();
  drawTerrain(true); drawPlants(true); saveLocal(); saveDb(); renderPanel(true);
});

// ---------- huvudloop ----------
const events: TalkEvent[] = [];
let lastUi = 0, lastLocal = 0, lastDb = 0;
function tick() {
  if (!s || ui.busy) return;
  const realDt = Math.min(0.25, app.ticker.deltaMS / 1000);
  if (ui.testMode) {
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
  nyBild();
  const now = performance.now();
  addTalks(events, now);
  if (ui.follow !== undefined) {
    const p = byId(s, ui.follow);
    if (p && alive(p)) { cam.x = p.x * TS + TS / 2; cam.y = p.y * TS + TS / 2; layout(); } else stopFollow();
  }
  drawTerrain();
  drawPlants(); drawAnimals();
  drawStructures(now);
  drawPeople(now);
  drawNight(s.now);
  drawFilter();
  if (now - lastUi > 600) { lastUi = now; renderClock(); renderPanel(); renderPorts(); }
  if (!ui.testMode && now - lastLocal > 20000) { lastLocal = now; saveLocal(); }
  if (!ui.testMode && now - lastDb > 60000) { lastDb = now; saveDb(); }
}

document.addEventListener('visibilitychange', () => { if (document.hidden) { saveLocal(); saveDb(); } });
window.addEventListener('pagehide', () => { saveLocal(); });

async function boot() {
  $('map').appendChild(view);
  layout();
  new ResizeObserver(layout).observe($('map'));
  const loaded = await loadSaves();
  if (loaded) {
    setByn(loaded);
    for (const p of living(s)) p.task = undefined;
    cam.x = -1; layout();
    drawTerrain(true); drawPlants(true);
    renderClock(); renderPanel(true);
    await catchUp(Date.now(), Date.now() - s.now > 10 * 60 * 1000);
  } else {
    setByn(createState(Math.floor(Math.random() * 2 ** 31), Date.now()));
    cam.x = -1; layout();
    drawTerrain(true); drawPlants(true); saveLocal(); saveDb();
  }
  $('loading').hidden = true;
  renderClock(); renderPanel(true);
  app.ticker.add(tick);
}
boot();
// byn och kartan tillgängliga för felsökning i konsolen
(window as any).__byn = { get s() { return s; }, DAY, HOUR, getMap, coverOf, groundOf, get world() { return world; } };
