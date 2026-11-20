// Mäter bilden och panelerna i webbläsaren (Chromium via Playwright, headless, SwiftShader).
//   node mat.cjs <del> [...]     delar: bild, panorering, paneler, start, ikapp, mobil, alla
//   node mat.cjs bild natt dag   bara de scenerna; ETIKETT=fore ger filnamnen bild-dator-natt-fore.json
// Läser byarna i byar/<scen>.json (forbered.ts) och mätversionen matt.html (bygg-matt.mjs).
// Skriver ra/<namn>.json (tider per del per bildruta, CDP-mått) och ra/<namn>.cpuprofile (profileraren).
// BILD=fil.png: en skärmbild av kartan efter mätningen (bara bild)
const { chromium } = require('playwright');
// i molnet finns bara den förinstallerade webbläsaren, inte den som repots Playwright väntar sig
const START = require('fs').existsSync(chromium.executablePath()) ? {} : { executablePath: '/opt/pw-browsers/chromium' };
const fs = require('fs'), path = require('path');
const HAR = __dirname, RA = path.join(HAR, 'ra');
fs.mkdirSync(RA, { recursive: true });
const SIDA = 'file://' + path.join(HAR, process.env.MATT ?? 'matt.html'); // MATT=annan.html: en sparad mätversion (växelvis före och efter)
const ETIKETT = process.env.ETIKETT ? '-' + process.env.ETIKETT : '';
const SKARMAR = {
  dator: { viewport: { width: 1300, height: 850 } },
  mobil: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
};
const byar = {};
const by = n => byar[n] ??= JSON.parse(fs.readFileSync(path.join(HAR, 'byar', n + '.json'), 'utf8'));
const sov = ms => new Promise(r => setTimeout(r, ms));
const logg = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// en sida med byn: sparningen i webbläsarens enkla minne (som utseende-testet), och klockan ställd på byns tid
// (+ forskjut ms: en frånvaro som räknas ikapp). performance.now är orörd. mon: mätningen på från början
// mobilen: samma sida med raden om skärmens bredd (viewport), som artefaktens skal lägger till när sidan publiceras
const SIDA_MOBIL = 'file://' + path.join(HAR, 'matt-mobil.html');
async function oppna(b, scen, skarm, { forskjut = 0, mon = false, sida = skarm === 'mobil' ? SIDA_MOBIL : SIDA, spola = false, ga = !mon } = {}) {
  const { t, fil } = by(scen);
  const ctx = await b.newContext({ ...SKARMAR[skarm], timezoneId: 'Europe/Stockholm', colorScheme: 'light' });
  await ctx.addInitScript(`try { if (!sessionStorage.getItem('klar')) { localStorage.setItem('samhalle-save-v1', ${JSON.stringify(fil)}); localStorage.setItem('samhallssimulatorn.spola', '${spola ? 1 : 0}'); sessionStorage.setItem('klar', '1'); } } catch (e) {}`);
  await ctx.addInitScript(`(() => { const OD = Date, off = ${t + forskjut} - OD.now();
    class D extends OD { constructor(...a) { if (a.length === 0) super(OD.now() + off); else super(...a); } static now() { return OD.now() + off; } }
    window.Date = D; ${mon ? 'window.__MON = true;' : ''}
    window.__ramar = []; window.__ramPa = false; const r = ts => { if (window.__ramPa) window.__ramar.push(ts); requestAnimationFrame(r); }; requestAnimationFrame(r);
    window.__langa = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__langa.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true }); } catch (e) {} })()`);
  const pg = await ctx.newPage();
  const fel = [];
  pg.on('pageerror', e => fel.push(e.message));
  pg.on('console', m => { if (m.type() === 'error') fel.push('console: ' + m.text().slice(0, 200)); });
  const cdp = await ctx.newCDPSession(pg);
  await cdp.send('Performance.enable', { timeDomain: 'timeTicks' });
  if (ga) await pg.goto(sida, { timeout: 180000 });
  return { ctx, pg, cdp, fel };
}
async function klar(pg, ms = 600000) {
  await pg.waitForFunction(() => window.__M && window.__M.forsta && window.__byn && window.__byn.s && !window.__byn.ui.busy, null, { timeout: ms, polling: 200 });
}
// Pixis ritning (renderer.render) får egen tid; inne i en annan del (skuggbilden) räknas den som del av den
async function kladIn(pg) {
  await pg.evaluate(() => {
    const r = window.__byn.app.renderer, orig = r.render.bind(r), M = window.__M;
    if (r.__klad) return; r.__klad = true;
    r.render = function (...a) { const t = performance.now(); const x = orig(...a); const d = performance.now() - t; if (M.on) { const k = M.cur ? 'render.inne.' + M.cur : 'pixi.render'; (M.t[k] ??= []).push(d); } return x; };
  });
}
const METRIK = ['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'LayoutCount', 'RecalcStyleCount', 'JSHeapUsedSize', 'JSHeapTotalSize', 'Nodes', 'JSEventListeners', 'Documents', 'Frames'];
async function metrik(cdp) { const { metrics } = await cdp.send('Performance.getMetrics'); const o = {}; for (const m of metrics) if (METRIK.includes(m.name)) o[m.name] = m.value; return o; }
const stat = a => { if (!a.length) return { n: 0 }; const s = [...a].sort((x, y) => x - y), sum = a.reduce((x, y) => x + y, 0); return { n: a.length, sum: +sum.toFixed(2), medel: +(sum / a.length).toFixed(3), median: +s[Math.floor(s.length / 2)].toFixed(3), p95: +s[Math.floor(s.length * 0.95)].toFixed(3), max: +s[s.length - 1].toFixed(3) }; };

// tidtagningen i sek sekunder: tider per del, bildrutor, långa uppgifter och CDP:s mått
async function tidta(pg, cdp, sek, under) {
  await pg.evaluate(() => { const M = window.__M; M.t = {}; M.slag = []; M.on = true; window.__ramar = []; window.__ramPa = true; window.__langa = []; window.__t0 = performance.now(); });
  const m0 = await metrik(cdp), t0 = Date.now();
  if (under) await under(); else await sov(sek * 1000);
  const m1 = await metrik(cdp), vagg = (Date.now() - t0) / 1000;
  const r = await pg.evaluate(() => { const M = window.__M; M.on = false; window.__ramPa = false; return { t: M.t, slag: M.slag, ramar: window.__ramar, langa: window.__langa.filter(x => x[0] >= window.__t0) }; });
  const ram = r.ramar, dt = ram.slice(1).map((x, i) => x - ram[i]);
  const delar = {}; for (const [k, v] of Object.entries(r.t)) delar[k] = stat(v);
  const d = {}; for (const k of METRIK) d[k] = +((m1[k] ?? 0) - (m0[k] ?? 0)).toFixed(4);
  return { sek: vagg, bildrutor: ram.length, fps: +(ram.length / vagg).toFixed(1), ramtid: stat(dt), delar, slagPerRuta: stat(r.slag), langaUppgifter: { n: r.langa.length, summaMs: +r.langa.reduce((a, x) => a + x[1], 0).toFixed(0), max: +Math.max(0, ...r.langa.map(x => x[1])).toFixed(0) }, cdpDelta: d, cdpNu: m1 };
}
async function profilera(cdp, namn, sek, under) {
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 250 });
  await cdp.send('Profiler.start');
  if (under) await under(); else await sov(sek * 1000);
  const { profile } = await cdp.send('Profiler.stop');
  fs.writeFileSync(path.join(RA, namn + '.cpuprofile'), JSON.stringify(profile));
  await cdp.send('Profiler.disable');
}
async function minne(pg, cdp) {
  await cdp.send('HeapProfiler.enable').catch(() => {});
  await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
  const h = await cdp.send('Runtime.getHeapUsage');
  const px = await pg.evaluate(() => {
    const app = window.__byn.app, tm = app.renderer.texture; let sprites = 0, graphics = 0, cont = 0, synliga = 0, pts = 0;
    const ga = c => { for (const ch of c.children || []) { if (ch.constructor.name === 'Sprite' || ch.texture) sprites++; else if (ch.geometry) { graphics++; pts += ch.geometry.graphicsData?.length ?? 0; } else cont++; if (ch.visible) synliga++; ga(ch); } };
    ga(app.stage);
    let texPunkter = 0; for (const t of tm.managedTextures) texPunkter += (t.realWidth || t.width) * (t.realHeight || t.height);
    return { texturer: tm.managedTextures.length, texturMB: +(texPunkter * 4 / 1048576).toFixed(1), sprites, graphics, graphicsDelar: pts, behallare: cont, synligaObjekt: synliga, domNoder: document.getElementsByTagName('*').length, canvas: [app.view.width, app.view.height], upplosning: app.renderer.resolution, zoom: window.__byn.cam.zoom };
  });
  const m = await metrik(cdp);
  return { jsHeapAnvantMB: +(h.usedSize / 1048576).toFixed(1), jsHeapTotalMB: +(h.totalSize / 1048576).toFixed(1), ...px, noder: m.Nodes, lyssnare: m.JSEventListeners };
}
function spara(namn, data) { fs.writeFileSync(path.join(RA, namn + '.json'), JSON.stringify(data, null, 1)); }
const kort = r => `${r.fps} fps, ramtid median ${r.ramtid.median} p95 ${r.ramtid.p95} ms; tick ${r.delar.tick?.medel} ms; render ${r.delar['pixi.render']?.medel} ms; skuggor ${r.delar['k.drawSkuggor']?.medel} ms; långa ${r.langaUppgifter.n}`;

// ---------- delarna ----------
const SEK = 10, PROF = 10;
// bilden: varje scen på datorn (eller mobilen): stilla kamera, tider och profil
async function bild(b, skarm = 'dator', scener = ['dag', 'natt', 'regn', 'sno', 'istid']) {
  for (const sc of scener) {
    const { ctx, pg, cdp, fel } = await oppna(b, sc, skarm);
    await klar(pg); await kladIn(pg); await sov(5000); // kartan ritas efter hand de första sekunderna
    const r = await tidta(pg, cdp, SEK);
    r.minne = await minne(pg, cdp);
    if (!process.env.UTAN_PROFIL) await profilera(cdp, `bild-${skarm}-${sc}${ETIKETT}`, PROF);
    if (process.env.BILD) await pg.locator('#map').screenshot({ path: path.join(RA, `${sc}-${process.env.BILD}`) });
    r.fel = fel; spara(`bild-${skarm}-${sc}${ETIKETT}`, r); logg(skarm, sc, kort(r), 'heap', r.minne.jsHeapAnvantMB, 'MB', fel.length ? 'FEL ' + fel[0] : '');
    await ctx.close();
  }
}
// efter två minuter: träden och marken över hela kartan har hunnit ritas (det som inte syns ritas efter hand)
async function stadigt(b, skarm = 'dator', scen = 'dag') {
  const { ctx, pg, cdp, fel } = await oppna(b, scen, skarm);
  await klar(pg); await kladIn(pg); await sov(120000);
  const r = await tidta(pg, cdp, SEK);
  r.minne = await minne(pg, cdp);
  await profilera(cdp, `stadigt-${skarm}-${scen}`, PROF);
  r.fel = fel; spara(`stadigt-${skarm}-${scen}`, r); logg('stadigt', skarm, scen, kort(r), 'heap', r.minne.jsHeapAnvantMB, 'MB', 'sprites', r.minne.sprites);
  await ctx.close();
}
// panorering och zoom: kameran flyttas varje bildruta i sidan; utzoomad (hela kartan) och inzoomad stilla
async function panorering(b, skarm = 'dator') {
  const { ctx, pg, cdp, fel } = await oppna(b, 'dag', skarm);
  await klar(pg); await kladIn(pg); await sov(5000);
  const rorelse = {
    pan: `(() => { const by = window.__byn, c = by.cam, x0 = c.x, y0 = c.y, t0 = performance.now(); window.__rorPa = true;
      const f = () => { if (!window.__rorPa) return; const u = (performance.now() - t0) / 1000; c.x = x0 + 900 * Math.sin(u * 0.7); c.y = y0 + 500 * Math.sin(u * 0.45); by.layout(); requestAnimationFrame(f); }; requestAnimationFrame(f); })()`,
    zoom: `(() => { const by = window.__byn, c = by.cam, t0 = performance.now(); window.__rorPa = true;
      const f = () => { if (!window.__rorPa) return; const u = (performance.now() - t0) / 1000; c.zoom = 1 + 7 * (0.5 - 0.5 * Math.cos(u * 0.9)); by.layout(); requestAnimationFrame(f); }; requestAnimationFrame(f); })()`,
  };
  const ut = {};
  for (const [namn, js] of Object.entries(rorelse)) {
    const cam0 = await pg.evaluate(() => ({ ...window.__byn.cam }));
    await pg.evaluate(js);
    await sov(1000);
    ut[namn] = await tidta(pg, cdp, SEK);
    await profilera(cdp, `${namn}-${skarm}`, PROF);
    await pg.evaluate(c => { window.__rorPa = false; Object.assign(window.__byn.cam, c); window.__byn.layout(); }, cam0);
    logg(skarm, namn, kort(ut[namn]));
    await sov(1500);
  }
  // stilla på olika zoom: 1 (hela kartan syns), standard 2.4, 8 och 20
  for (const z of [1, 8, 20]) {
    await pg.evaluate(z => { window.__byn.cam.zoom = z; window.__byn.layout(); }, z);
    await sov(4000);
    ut['zoom' + z] = await tidta(pg, cdp, SEK);
    ut['zoom' + z].minne = await minne(pg, cdp);
    if (z === 1) await profilera(cdp, `zoom1-${skarm}`, PROF);
    logg(skarm, 'zoom', z, kort(ut['zoom' + z]));
  }
  ut.fel = fel; spara(`rorelse-${skarm}`, ut);
  await ctx.close();
}
// panelerna: varje flik för sig (och personens flikar), tider för renderPanel i spelets takt och tvingad omritning
const PERSONFLIKAR = ['om', 'behov', 'egen', 'halsa', 'saker', 'folk', 'kun', 'logg'];
const HOGER = ['forrad', 'teknik', 'kronika', 'seder', 'styre', 'religion', 'tal', 'grannar'];
const RUTOR = ['eld', 'lager', 'hus', 'station', 'sjo', 'falt', 'sak', 'djur', 'hog'];
async function paneler(b, skarm = 'dator', urval) {
  const { ctx, pg, cdp, fel } = await oppna(b, 'dag', skarm);
  await klar(pg); await kladIn(pg); await sov(5000);
  const ut = {};
  // utan panel först, som jämförelse
  ut['(ingen)'] = await tidta(pg, cdp, 6);
  const fall = [];
  for (const d of PERSONFLIKAR) fall.push({ namn: 'person.' + d, gor: `(() => { const by = window.__byn, s = by.s, p = s.people.filter(p => !p.dead && p.dod === undefined)[0] ?? s.people[0]; by.ui.personDel = '${d}'; by.selectPerson(p.id); })()` });
  for (const id of HOGER) fall.push({ namn: 'höger.' + id, gor: `(() => { const by = window.__byn; by.ui.selected = undefined; by.ui.tab = undefined; by.visa('${id}'); })()` });
  for (const id of RUTOR) fall.push({ namn: 'ruta.' + id, gor: `(() => { const by = window.__byn, s = by.s, u = by.ui; u.hoger = undefined;
    if ('${id}' === 'hus') u.husId = (s.hus ?? [])[0]?.id ?? -1; if ('${id}' === 'station') u.stationId = (s.stationer ?? []).slice().sort((a,b) => (b.saker?.length ?? 0) - (a.saker?.length ?? 0))[0]?.id ?? -1;
    if ('${id}' === 'falt') u.faltId = (s.falt ?? [])[0]?.id ?? -1; if ('${id}' === 'djur') u.djurId = (s.tamdjur ?? [])[0]?.id ?? -1;
    if ('${id}' === 'sak') u.sak = 't:' + ((s.ting ?? [])[0]?.id ?? 0);
    const p = s.people[0]; u.selected = p.id; by.visa('${id}'); })()` });
  for (const f of fall.filter(f => !urval || urval.some(u => f.namn.includes(u)))) {
    try {
      await pg.evaluate(f.gor);
      await sov(800);
      const r = await tidta(pg, cdp, 6);
      // tvingad omritning (ett tryck): renderPanel(true) tjugo gånger
      r.tvingad = await pg.evaluate(() => { const by = window.__byn, tid = []; for (let i = 0; i < 20; i++) { const a = performance.now(); by.visa(by.ui.hoger ?? by.ui.tab); tid.push(performance.now() - a); } const sorted = tid.slice().sort((a, b) => a - b); return { median: sorted[10], max: sorted[19], html: (document.getElementById('panelBody').innerHTML.length + document.getElementById('vBody').innerHTML.length + document.getElementById('rutaBody').innerHTML.length) }; });
      // tiden för stil och layout efter en tvingad omritning
      r.layoutEfter = await pg.evaluate(() => { const by = window.__byn; by.visa(by.ui.hoger ?? by.ui.tab); const a = performance.now(); document.body.offsetHeight; return performance.now() - a; });
      ut[f.namn] = r;
      logg(skarm, f.namn, 'renderPanel medel', r.delar['p.renderPanel']?.medel, 'max', r.delar['p.renderPanel']?.max, 'tvingad median', r.tvingad.median.toFixed(2), 'layout', r.layoutEfter.toFixed(2), 'html', r.tvingad.html, 'layoutMs', r.cdpDelta.LayoutDuration, 'stilMs', r.cdpDelta.RecalcStyleDuration);
    } catch (e) { ut[f.namn] = { fel: String(e) }; logg('FEL', f.namn, String(e).slice(0, 200)); }
    await pg.evaluate(() => { const by = window.__byn; by.ui.hoger = undefined; by.ui.tab = undefined; by.ui.selected = undefined; }).catch(() => {});
  }
  // en profil när flikarna byts en gång i sekunden (alla)
  const ids = fall.map(f => f.gor);
  await profilera(cdp, `paneler-${skarm}`, 0, async () => { for (const g of ids) { await pg.evaluate(g).catch(() => {}); await sov(1000); } });
  ut.fel = fel; spara(`paneler-${skarm}`, ut);
  await ctx.close();
}
// starten: från att sidan öppnas tills byn syns; första gången (sparningen flyttas till databasen) och omladdning
async function start(b, skarm = 'dator', sida = SIDA, namn = 'start') {
  const { ctx, pg, cdp, fel } = await oppna(b, 'dag', skarm, { mon: true, sida });
  const ut = {};
  for (const varv of ['forsta', 'omladdning']) {
    const t0 = Date.now();
    if (varv === 'forsta') await pg.goto(sida, { waitUntil: 'commit' }); else await pg.reload({ waitUntil: 'commit' });
    await pg.waitForFunction(() => window.__byn && window.__byn.s && !window.__byn.ui.busy && (window.__M ? window.__M.forsta : true), null, { timeout: 600000, polling: 50 });
    const vagg = Date.now() - t0;
    await sov(15000);
    const r = await pg.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0], m = {};
      for (const e of performance.getEntriesByType('mark')) m[e.name] = +e.startTime.toFixed(1);
      const M = window.__M ?? { t: {} }, terr = M.t['k.drawTerrain'] ?? [], tick = M.t['tick'] ?? [];
      return { nav: { domInteractive: nav.domInteractive, domContentLoaded: nav.domContentLoadedEventEnd, load: nav.loadEventEnd, responseEnd: nav.responseEnd }, marks: m, terrangPerRuta: terr.map(x => +x.toFixed(1)), tickPerRuta: tick.map(x => +x.toFixed(1)), paint: performance.getEntriesByType('paint').map(p => [p.name, +p.startTime.toFixed(1)]) };
    });
    r.vaggMs = vagg; r.minne = await minne(pg, cdp);
    ut[varv] = r;
    logg(namn, skarm, varv, 'väggtid till första ritning', vagg, 'ms; märken', JSON.stringify(r.marks));
  }
  ut.fel = fel; spara(`${namn}-${skarm}`, ut);
  await ctx.close();
}
// starten med profil (första gången)
async function startProfil(b, skarm = 'dator') {
  const { ctx, pg, cdp } = await oppna(b, 'dag', skarm, { mon: true });
  await profilera(cdp, `start-${skarm}`, 0, async () => {
    await pg.goto(SIDA, { waitUntil: 'commit' });
    await pg.waitForFunction(() => window.__byn && window.__byn.s && !window.__byn.ui.busy && window.__M && window.__M.forsta, null, { timeout: 600000, polling: 50 });
    await sov(6000);
  });
  await ctx.close();
}
// ikappräkningen efter en frånvaro: klockan står timmar efter byn
async function ikapp(b, fall = [[1, false], [6, false], [6, true], [24, false]], skarm = 'dator') {
  const ut = {};
  for (const [tim, spola] of fall) {
    const { ctx, pg, cdp, fel } = await oppna(b, 'dag', skarm, { forskjut: tim * 3600000, mon: true, spola });
    const prof = tim === 6 && !spola;
    if (prof) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 1000 }); await cdp.send('Profiler.start'); }
    const t0 = Date.now();
    await pg.goto(SIDA, { waitUntil: 'commit' });
    await pg.waitForFunction(() => window.__byn && window.__byn.s && !window.__byn.ui.busy && window.__M && window.__M.forsta, null, { timeout: 1800000, polling: 200 });
    const vagg = Date.now() - t0;
    if (prof) { const { profile } = await cdp.send('Profiler.stop'); fs.writeFileSync(path.join(RA, `ikapp-${tim}h.cpuprofile`), JSON.stringify(profile)); }
    const m = await pg.evaluate(() => { const o = {}; for (const e of performance.getEntriesByType('mark')) o[e.name] = +e.startTime.toFixed(0); return o; });
    const r = { tim, spola, vaggMs: vagg, ikappMs: m['ikapp-klar'] - m['lasta'], marks: m, minne: await minne(pg, cdp), fel };
    ut[`${tim}h${spola ? '-spola' : ''}`] = r;
    logg('ikapp', tim, 'h', spola ? 'spola' : '', 'räknas på', r.ikappMs, 'ms; hela vägen', vagg, 'ms; heap', r.minne.jsHeapAnvantMB);
    await ctx.close();
  }
  spara(`ikapp-${skarm}`, ut);
}
// minnet över tid: en minut i dag-scenen
async function minneTid(b, skarm = 'dator') {
  const { ctx, pg, cdp } = await oppna(b, 'dag', skarm);
  await klar(pg); await sov(3000);
  const ut = [];
  for (let i = 0; i <= 6; i++) { ut.push({ sek: i * 20, ...(await minne(pg, cdp)) }); logg('minne', i * 20, 's', ut[ut.length - 1].jsHeapAnvantMB, 'MB'); if (i < 6) await sov(20000); }
  spara(`minne-${skarm}`, ut);
  await ctx.close();
}

(async () => {
  const delar = process.argv.slice(2);
  const SCENER = ['dag', 'natt', 'regn', 'sno', 'istid'];
  const valda = delar.filter(d => SCENER.includes(d));
  const b = await chromium.launch(START);
  logg('Chromium', b.version());
  const har = d => delar.includes(d) || delar.includes('alla');
  if (har('bild')) await bild(b, 'dator', valda.length ? valda : SCENER);
  if (har('panorering')) await panorering(b);
  if (har('paneler')) await paneler(b);
  if (har('start')) { await start(b); await start(b, 'dator', 'file://' + path.resolve(HAR, '../../../samhallssimulatorn.html'), 'start-officiell').catch(e => logg('officiell start', String(e).slice(0, 200))); await startProfil(b); }
  if (har('startoff')) await start(b, 'dator', 'file://' + path.resolve(HAR, '../../../samhallssimulatorn.html'), 'start-officiell');
  if (har('stadigt')) { await stadigt(b); await stadigt(b, 'dator', 'natt'); }
  if (har('ikapp')) await ikapp(b);
  if (har('minne')) await minneTid(b);
  if (har('mobil')) { if (!fs.existsSync(SIDA_MOBIL.slice(7))) logg('matt-mobil.html finns inte; mobilen hoppas över'); else { await bild(b, 'mobil', ['dag', 'natt', 'sno']); await panorering(b, 'mobil'); await paneler(b, 'mobil', ['person.om', 'person.behov', 'höger.kronika', 'höger.teknik', 'höger.forrad', 'ruta.station']); await start(b, 'mobil', SIDA_MOBIL); } }
  if (har('prov')) { const { ctx, pg, cdp } = await oppna(b, 'dag', 'dator'); await klar(pg); await kladIn(pg); await sov(3000); const r = await tidta(pg, cdp, 8); spara('prov', r); console.log(await minne(pg, cdp)); await ctx.close(); }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
