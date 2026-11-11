import { nastaSteg, stridBild, testSlagsmal, torkaTest, storStridNu, BEAT, DAY, HOUR, MIN, SEC, TalkEvent, alive, byId, cloneState, coverOf, createState, getMap, groundOf, isLight, spar, step, visning, yearNo, State, motgangNu, motgangNasta, motgangDef, varslade, ROVARFLOCK, skickaRovare, skickaHandlare, rovarHinder, handlarHinder, skickaTornado, tornadoHinder, lightLevel, rovarna } from './sim';
import { brandKnapp, testSvara } from './ui/interaktion';
import { testBortaIByn } from './ui/testborta';
import { $ } from './ui/hjalp';
import { iconImg, tecknet } from './ikoner';
import { s, setByn, ui, nyBild, vidNyBy } from './ui/lage';
import { TS, app, cam, layout, view, world } from './ui/scen';
import { drawNight, drawSkuggor, drawTerrain } from './ui/terrang';
import { sattSkuggLangd, skuggLangdAv } from './ui/skugga';
import { drawVader } from './ui/vaderbild';
import { drawStructures } from './ui/foremal';
import { drawFilter } from './ui/filter';
import { drawAnimals, drawPlants } from './ui/vaxter';
import { drawFlackar } from './ui/smuts';
import { addTalks, drawPeople, posOf } from './ui/manniskor';
import { drawHandel } from './ui/handel';
import { renderPanel, selectPerson, visa } from './ui/panel';
import { renderRaden } from './ui/raden';
import { renderPorts, startFollow, stopFollow } from './ui/portratt';
import { gaster, rovarGastId } from './ui/gaster';
import { catchUp, ikapp, loadSaves, nyByVald, saveDb, saveLocal } from './ui/spara';
import { aktivBy, byarHtml, byte, bytTill, laggTillTestby, taBort, testbyIAdressen } from './ui/byar';
import './ui/interaktion';
import './ui/ram';
import './ui/symboler'; // emojierna blir pixelsymboler (steg 5.3.2.1)
import './ui/ark'; // panelerna som ark nerifrån på en liten skärm (steg 5.3.7)
import { drawArena, oppnaArena } from './ui/arena';
import { drawTona } from './ui/tona';
import { drawOmrade } from './ui/omradebild';

// startpunkten: klockan, kontrollerna, huvudloopen och uppstarten. Allt annat i gränssnittet ligger i ui/
function renderClock() {
  const t = ui.nu;
  const d = new Date(t);
  const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
  $('calYear').textContent = `År ${yearNo(s, t)}`;
  renderRaden(t); // årstiden, tidsstaven och nyckeltalen (ui/raden.ts, steg 5.3.1.2)
  { // motgången som pågår, eller som någon i byn anar (steg 3.8.1, motgang.ts): symbolen, och vad den gör när musen är över den
    const nu = motgangNu(s, t), na = nu ? undefined : motgangNasta(s, t), n = na ? varslade(s, na.start) : 0, el = $('calMotgang');
    const m = nu ?? (n ? na : undefined), d = m && motgangDef(m.id);
    el.hidden = !d;
    if (d) {
      const html = tecknet(d.ikon, d.tecken, 20);
      if (el.dataset.v !== html) { el.innerHTML = html; el.dataset.v = html; }
      el.style.opacity = nu ? '1' : '0.55';
      el.title = nu ? `${d.namn}. ${d.text}` : `${n === 1 ? 'En' : n} i byn anar att det blir en ${d.namn.toLowerCase()}. ${d.text}`;
    }
  }
  $('sparFel').hidden = !ui.sparFel;
  $('molnFel').hidden = !ui.molnFel;
  $('lokalFel').hidden = !ui.lokalFel;
  $('calTime').textContent = `${isLight(t) ? 'Dag' : 'Natt'} · ${hh}:${mm}${ui.testMode ? ' (test)' : ''}`;
}

// ---------- kontroller ----------
let speed = 1;
let realState: State | null = null; // sparad verklig by medan testläget körs
function setSpeed(v: number) {
  speed = v;
  for (const b of document.querySelectorAll<HTMLButtonElement>('#speeds button')) b.setAttribute('aria-pressed', String(Number(b.dataset.v) === v));
}
function leaveTest() { testSvara(''); ui.brandTest = false; ui.blixtTest = false; brandKnapp(); ui.testMode = false; $('arena').hidden = true; $('speeds').hidden = true; $('testSkicka').hidden = true; document.body.classList.remove('testing'); setSpeed(1); }
// testläget stängs utan att den verkliga byn kommer tillbaka (en annan by tar dess plats)
function dropTest() { if (ui.testMode) { ($('testToggle') as HTMLInputElement).checked = false; realState = null; ui.testBorta = { st: [], lager: [] }; leaveTest(); } }
// en ny by med slumpat frö, sparad direkt
// klockan för den valda byn: den egna går i klockans tid, en annan by så långt efter som den låg stilla (steg 9.2.16)
const klockan = () => Date.now() - ui.forskjut;
function nyBy() {
  ui.annanBy = undefined; ui.forskjut = 0; // en ny by ersätter den egna byn
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
  await catchUp(klockan());
}
// byn i molnet gick att läsa först senare och är nyare än den som spelas: den tar över
function nyareIMolnet(by: State) {
  if (ui.annanBy) return; // en annan by är vald: den egna byn läses in när man byter tillbaka (steg 9.2.16)
  dropTest();
  ui.selected = undefined; ui.tab = undefined;
  laddaIn(by).then(() => { renderClock(); renderPanel(true); });
}
// testläget byter till en kopia av byn och tillbaka: det som är valt i panelen är kvar (finns det inte visar fliken det)
function bytBy(n: State) {
  const { husId, stationId, hogAt, sak, faltId, faltRuta } = ui;
  setByn(n);
  Object.assign(ui, { husId, stationId, hogAt, sak, faltId, faltRuta });
}
$('testToggle').addEventListener('change', async e => {
  const on = (e.target as HTMLInputElement).checked;
  if (on) {
    saveLocal(); await saveDb();
    realState = s; ui.testBorta = { st: [], lager: [] };
    bytBy(cloneState(s));
    spar.v = new WeakMap();
    ui.testMode = true; $('speeds').hidden = false; $('testSkicka').hidden = false; document.body.classList.add('testing'); setSpeed(1);
  } else {
    leaveTest();
    if (realState) { testBortaIByn(realState); bytBy(realState); realState = null; } // det som togs bort i testläget tas bort i byn (steg 4.5.7.8)
    drawTerrain(true); drawPlants(true);
    await catchUp(klockan());
  }
  renderClock(); renderPanel(true); renderByar();
});
for (const b of document.querySelectorAll<HTMLButtonElement>('#speeds button')) b.addEventListener('click', () => setSpeed(Number(b.dataset.v)));
$('arenaKnapp').addEventListener('click', oppnaArena);
// testläget (steg 4.5.4.4): en rövarflock (liten, mellan, stor) eller en handlare kommer nu. Bara i kopian av byn
{
  const flock: [keyof typeof ROVARFLOCK, string][] = [['liten', 'En liten rövarflock'], ['mellan', 'En mellanstor rövarflock'], ['stor', 'En stor rövarflock']];
  $('testSkicka').innerHTML = flock.map(([k, t]) => `<button type="button" data-flock="${k}" title="${t} (${ROVARFLOCK[k]} rövare) kommer nu">${iconImg('rovare', 14)}${ROVARFLOCK[k]}</button>`).join('')
    + `<button type="button" data-handlare="1" title="En handlare kommer nu">${iconImg('handlare', 14)}</button>`
    + `<button type="button" data-brand="1" title="Tänd en brand: tryck sedan på kartan där den ska börja">${iconImg('brand', 14)}</button>`
    + `<button type="button" data-blixt="1" title="Blixten: tryck sedan på kartan där den ska slå ner, flera gånger; tryck här igen för att sluta">${iconImg('n_energi', 14)}</button>`
    + `<button type="button" data-tornado="1" title="En tornado kommer nu från kartans kant">${iconImg('tornado', 14)}</button>`
    + `<button type="button" data-slagsmal="1" title="Ett slagsmål: de två vakna vuxna som står närmast varandra börjar slåss">${iconImg('kk_strid', 14)}</button>`
    + `<button type="button" data-torka="1" title="Torka marken helt, så att en brand kan provas när som helst">${iconImg('torrgras', 14)}</button><span id="testSvar"></span>`;
  // knappen svarar direkt (steg 4.5.6.4): den lyser upp, och raden under knapparna säger vad som skickats och varifrån, eller
  // varför det inte går just nu. En knapp som inte kan användas är grå (testKnappar)
  $('testSkicka').addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!b || !ui.testMode || !s) return;
    // brandknappen (steg 4.5.6.6): ett tryck gör den aktiv, och nästa tryck på kartan tänder rutan där (interaktion.ts); ett nytt tryck avbryter
    if (b.dataset.brand) { ui.brandTest = !ui.brandTest; ui.blixtTest = false; brandKnapp(); testSvara(ui.brandTest ? 'Tryck på kartan där branden ska börja' : ''); return; }
    // blixtknappen (steg 6.4.7): som brandknappen, men den är kvar aktiv så att flera blixtar kan slå ner i rad
    if (b.dataset.blixt) { ui.blixtTest = !ui.blixtTest; ui.brandTest = false; brandKnapp(); testSvara(ui.blixtTest ? 'Tryck på kartan där blixten ska slå ner' : ''); return; }
    if (b.dataset.torka) { testSvara(torkaTest(s).text); return; } // (steg 9.2.24)
    // striden på kartan (steg 10.1.5). Spelet räknar upp till fem minuter före bilden, så striden syns när bilden kommit dit
    if (b.dataset.slagsmal) { const r = testSlagsmal(s), sek = Math.round((s.now - ui.nu) / SEC); testSvara(r.ok && sek > 2 ? `${r.text} om ${sek} sekunder` : r.text); renderPanel(true); return; }
    const r = b.dataset.flock ? skickaRovare(s, ROVARFLOCK[b.dataset.flock as keyof typeof ROVARFLOCK]) : b.dataset.tornado ? skickaTornado(s) : skickaHandlare(s);
    testSvara(r.text);
    // kameran visar var flocken dök upp (steg 4.5.7.10) och följer den första rövaren in (steg 6.6.12)
    if (r.ok && b.dataset.flock && s.rovare) { stopFollow(); cam.x = s.rovare.x * TS; cam.y = s.rovare.y * TS; layout(); startFollow(rovarGastId(s.rovare.id, 0), rovarna(s, s.rovare)[0]?.name); }
    b.classList.remove('tryckt'); void b.offsetWidth; b.classList.add('tryckt');
    testKnappar(); renderPanel(true);
  });
}
// knapparna som inte kan användas just nu är grå
function testKnappar() {
  if (!ui.testMode || !s) return;
  for (const b of document.querySelectorAll<HTMLButtonElement>('#testSkicka button')) b.classList.toggle('ej', !!(b.dataset.flock ? rovarHinder(s) : b.dataset.handlare ? handlarHinder(s) : b.dataset.tornado ? tornadoHinder(s) : undefined));
}
// inställningarna (testläget och ny by) öppnas med kugghjulet längst ner bland flikknapparna (steg 5.3.1.1)
$('installKnapp').addEventListener('click', () => { const r = $('installningar'); r.hidden = !r.hidden; $('installKnapp').setAttribute('aria-expanded', String(!r.hidden)); });
// ljust eller mörkt läge (steg 5.3.1.3): data-tema på html byter grundens färger i template.html. Läget följer datorns
// inställning och byter direkt när datorn byter (steg 6.9.16); knappen ◐ växlar mellan Datorn, Ljust och Mörkt, och valet
// sparas i webbläsaren. Står det på Ljust eller Mörkt följer spelet inte datorn förrän man väljer Datorn igen
const TEMA_KEY = 'samhallssim-tema';
const TEMAN = { datorn: 'Datorn', ljust: 'Ljust', morkt: 'Mörkt' } as const;
type Tema = keyof typeof TEMAN;
const datornMork = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : undefined;
let tema: Tema = 'datorn';
function sattTema() {
  const morkt = tema === 'morkt' || (tema === 'datorn' && !!datornMork?.matches);
  document.documentElement.dataset.tema = morkt ? 'morkt' : 'ljust';
  const b = $('temaKnapp'); b.textContent = `◐ ${TEMAN[tema]}`;
  b.title = `Ljust eller mörkt läge: ${tema === 'datorn' ? `som datorn (nu ${morkt ? 'mörkt' : 'ljust'})` : TEMAN[tema].toLowerCase()}. Tryck för att byta`;
}
try { const v = localStorage.getItem(TEMA_KEY); if (v && v in TEMAN) tema = v as Tema; } catch { /* ignoreras */ }
sattTema();
datornMork?.addEventListener('change', sattTema);
$('temaKnapp').addEventListener('click', () => {
  const ids = Object.keys(TEMAN) as Tema[]; tema = ids[(ids.indexOf(tema) + 1) % ids.length]; sattTema();
  try { localStorage.setItem(TEMA_KEY, tema); } catch { /* ignoreras */ }
});
// byarna under kugghjulet (steg 9.2.16, ui/byar.ts): byt by, ta bort en, och i testläget lägg till en by ur testerna
function renderByar() { $('byar').innerHTML = byarHtml(); }
byte.fore = () => { saveLocal(); saveDb(); dropTest(); ui.selected = undefined; ui.tab = undefined; };
byte.ladda = async by => { await laddaIn(by); renderClock(); renderPanel(true); renderByar(); };
byte.egen = async () => { const by = await loadSaves(nyareIMolnet); if (by) await byte.ladda!(by); else { nyBy(); renderByar(); } };
$('byar').addEventListener('click', async e => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!b) return;
  if (b.dataset.bort) { taBort(b.dataset.bort); renderByar(); return; }
  if (b.id === 'tbLagg') {
    const fro = Number(($('tbFro') as HTMLInputElement).value), dag = Number(($('tbDag') as HTMLInputElement).value);
    await laggTillTestby(fro, dag); renderByar(); return;
  }
  if (b.dataset.by !== undefined) { await bytTill(b.dataset.by || undefined); renderByar(); }
});
$('installKnapp').addEventListener('click', renderByar);
$('newVillage').addEventListener('click', () => { $('confirmNew').hidden = false; });
$('cancelNew').addEventListener('click', () => { $('confirmNew').hidden = true; });
$('okNew').addEventListener('click', () => {
  $('confirmNew').hidden = true;
  dropTest(); nyByVald();
  ui.selected = undefined; ui.tab = undefined;
  nyBy(); renderPanel(true); renderByar();
});

// ---------- huvudloop ----------
// Byn räknas i slag om fem minuter (BEAT), alltid ett slag före klockan som visas (ui.nu). Under slaget ritas folk där
// de är enligt det som räknades (manniskor.ts), så spelet visar samma sak som räknades
const events: TalkEvent[] = [];
vidNyBy.push(() => { events.length = 0; });
const IKAPP_EFTER = 120 * SEC; // är byn mer än två minuter efter klockan (fliken var gömd) räknas den ikapp
const MAX_SLAG = 300; // högst så här många slag per bildruta (25 timmar i spelet)
// och högst så här länge (datorns tid) räknas byn per bildruta: hinner den inte med farten i testläget går spelet
// långsammare, men bilden och knapparna svarar (steg 3.10.4)
const RAKNA_MS = 40;
const PANEL_MS = 600, LOKAL_MS = 20000, MOLN_MS = MIN; // hur ofta (datorns tid) panelen ritas om och byn sparas i webbläsaren och i molnet
let lastUi = 0, lastLocal = 0, lastDb = 0;
// kartan i den tid som visas (ui.nu): i varje bildruta, och under ikappräkningen när den visas som snabbspolning (steg 5.4.5.1)
function ritaKartan(now: number) {
  sattSkuggLangd(skuggLangdAv(lightLevel(ui.nu))); // skuggan blir längre i skymningen (steg 5.1.8.2)
  drawTerrain();
  drawPlants(); drawFlackar(); drawAnimals();
  drawStructures(now);
  drawPeople(now); drawHandel(); drawArena(); drawTona();
  drawSkuggor();
  drawNight(ui.nu);
  drawFilter();
  drawOmrade();
  drawVader(now);
}
ikapp.rita = () => { ui.nu = s.now; nyBild(); ritaKartan(performance.now()); renderClock(); };
function tick() {
  if (!s || ui.busy) return;
  const realDt = Math.min(0.25, app.ticker.deltaMS / 1000);
  let vt: number;
  if (ui.testMode) vt = Math.max(ui.nu, s.now - BEAT * SEC) + realDt * speed * SEC;
  else {
    vt = klockan();
    if (vt - s.now > IKAPP_EFTER && !storStridNu(s)) { catchUp(vt); return; } // en stor strid visas i levande läge (steg 8.8.9)
  }
  // spar.pa är på också här: varje slag börjar om vägen (steg.ts), så bara det sista slaget sparas och ritas
  const t0 = performance.now();
  // så långt som nästa steg är (nastaSteg, kartstrid.ts): korta steg medan en strid pågår, annars fem minuter (steg 10.1.4)
  for (let n = 0; s.now < vt && n < MAX_SLAG && (!n || performance.now() - t0 < RAKNA_MS); n++) step(s, nastaSteg(s), events);
  ui.nu = Math.min(vt, s.now);
  nyBild();
  const now = performance.now();
  addTalks(events, now, ui.nu);
  if (ui.follow !== undefined) {
    const p = ui.follow > 0 ? byId(s, ui.follow) : undefined, g = ui.follow < 0 ? gaster().find(x => x.id === ui.follow) : undefined;
    const q = p && alive(p) ? posOf(p) : g;
    if (q) { cam.x = q.x * TS + TS / 2; cam.y = q.y * TS + TS / 2; layout(); } else stopFollow();
  }
  ritaKartan(now);
  if (now - lastUi > PANEL_MS) { lastUi = now; renderClock(); renderPanel(); renderPorts(); testKnappar(); }
  if (!ui.testMode && now - lastLocal > LOKAL_MS) { lastLocal = now; saveLocal(); }
  if (!ui.testMode && now - lastDb > MOLN_MS) { lastDb = now; saveDb(); }
}

document.addEventListener('visibilitychange', () => { if (document.hidden) { saveLocal(); saveDb(); } });
window.addEventListener('pagehide', () => { saveLocal(); });

async function boot() {
  spar.pa = true; // vägen var och en går under slaget sparas för att ritas
  stridBild.pa = true; // och slagen i striderna på kartan läggs till bilden (steg 10.1.5)
  visning.pa = true; // gränssnittet läser byn utan att ändra den (typer.ts); step räknar ändå som simuleringen
  $('map').appendChild(view);
  layout();
  new ResizeObserver(layout).observe($('map'));
  const annan = aktivBy();
  if (annan) { $('loading').hidden = true; await bytTill(annan); }
  if (!ui.annanBy) {
    const loaded = await loadSaves(nyareIMolnet);
    if (loaded) await laddaIn(loaded);
    else nyBy();
  }
  $('loading').hidden = true;
  await testbyIAdressen(); // #testby=frö:dygn: en by ur testerna läggs till och väljs (steg 9.2.16)
  renderClock(); renderPanel(true);
  app.ticker.add(tick);
}
boot();
// byn och kartan tillgängliga för felsökning i konsolen
(window as any).__byn = { get s() { return s; }, ui, selectPerson, visa, DAY, HOUR, getMap, coverOf, groundOf, get world() { return world; }, get app() { return app; } };
