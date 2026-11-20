// A/B för växterna i sparade bitar (steg 12.1.180): samma bildruta i samma sida med bitarna (som spelet ritar dem) och med alla
// växter ritade på nytt i en Graphics, ruta för ruta i samma ordning som före steget. Stilla, efter panorering, direkt efter en
// flytt och vid flera zoomnivåer. Räknar också hur många punkter växterna ändrar, så att 0 skillnader betyder något.
// Kräver matt.html byggd med kroken __vaxter (bygg-matt.mjs).
//   node ab180.cjs [scen]
const { chromium } = require('playwright');
const START = require('fs').existsSync(chromium.executablePath()) ? {} : { executablePath: '/opt/pw-browsers/chromium' };
const { oppnaBy } = require('./ladda.cjs');
const fs = require('fs'), path = require('path');
const HAR = __dirname, scen = process.argv[2] ?? 'dag';
const sov = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(START);
  const ctx = await b.newContext({ viewport: { width: 1300, height: 850 }, deviceScaleFactor: Number(process.env.DPR ?? 1), timezoneId: 'Europe/Stockholm', colorScheme: 'light' });
  await oppnaBy(ctx, scen);
  const pg = await ctx.newPage();
  pg.on('pageerror', e => console.log('FEL', e.message));
  await pg.goto('file://' + path.join(HAR, process.env.MATT ?? 'matt.html'), { timeout: 180000 });
  await pg.waitForFunction(() => window.__M && window.__M.forsta && window.__byn.s && !window.__byn.ui.busy, null, { timeout: 600000, polling: 200 });
  await sov(6000);
  const jamfor = namn => pg.evaluate(namn => {
    const by = window.__byn, app = by.app, V = window.__vaxter, R = app.renderer; app.ticker.stop();
    const L = V.plantLayer;
    const Graphics = window.__GR ??= (() => { let g; const ga = c => { if (!g && c.geometry && c.clear) g = c.constructor; for (const ch of c.children ?? []) ga(ch); }; ga(app.stage); return g; })();
    const g = new Graphics(); L.parent.addChildAt(g, L.parent.getChildIndex(L) + 1);
    const bild = () => { R.render(app.stage); return R.extract.pixels(); };
    g.visible = false; const a = bild();
    V.gammal(g); g.visible = true; L.visible = false; const gm = bild();
    g.visible = false; const ingen = bild();
    L.visible = true; g.destroy();
    let n = 0, vaxt = 0;
    for (let i = 0; i < a.length; i += 4) { if (a[i] !== gm[i] || a[i + 1] !== gm[i + 1] || a[i + 2] !== gm[i + 2]) n++; if (a[i] !== ingen[i] || a[i + 1] !== ingen[i + 1] || a[i + 2] !== ingen[i + 2]) vaxt++; }
    if (window.__DUMP) { const W = app.renderer.width, H = app.renderer.height, png = d => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), im = g.createImageData(W, H); im.data.set(d); g.putImageData(im, 0, 0); return c.toDataURL(); };
      const df = new Uint8ClampedArray(a.length); for (let i = 0; i < a.length; i += 4) { const s = a[i] !== gm[i] || a[i + 1] !== gm[i + 1] || a[i + 2] !== gm[i + 2]; df[i] = s ? 255 : a[i] / 3; df[i + 1] = s ? 0 : a[i + 1] / 3; df[i + 2] = s ? 0 : a[i + 2] / 3; df[i + 3] = 255; }
      window.__DUMP.push([namn, png(a), png(gm), png(df)]); }
    app.ticker.start();
    const synliga = L.children.filter(c => c.visible).length;
    return `${namn}: zoom ${by.cam.zoom.toFixed(1)}, skala ${app.stage.children[0].scale.x * R.resolution} läge ${app.stage.children[0].position.x * R.resolution},${app.stage.children[0].position.y * R.resolution}, ${synliga} synliga bitar av ${V.bitar.size}; ${n} av ${a.length / 4} punkter skiljer (växterna ändrar ${vaxt})`;
  }, namn);
  if (process.env.DUMP) await pg.evaluate(() => { window.__DUMP = []; });
  console.log(await jamfor(scen + ' stilla'));
  if (process.env.TVINGA) { await pg.evaluate(() => window.__vaxter.drawPlants(true)); console.log(await jamfor(scen + ' stilla efter drawPlants(true)')); }
  if (process.env.DUMP) { const d = await pg.evaluate(() => window.__DUMP); fs.mkdirSync(path.join(HAR, 'ra'), { recursive: true }); d.forEach(([n, ...b]) => b.forEach((u, i) => fs.writeFileSync(path.join(HAR, 'ra', `ab180-${i}.png`), Buffer.from(u.split(',')[1], 'base64')))); await b.close(); return; }
  await pg.evaluate(() => { const by = window.__byn, c = by.cam, x0 = c.x, y0 = c.y, t0 = performance.now(); window.__rorPa = true;
    const f = () => { if (!window.__rorPa) return; const u = (performance.now() - t0) / 1000; c.x = x0 + 600 * Math.sin(u * 0.7); c.y = y0 + 400 * Math.sin(u * 0.45); by.layout(); requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await sov(6000);
  await pg.evaluate(() => { window.__rorPa = false; });
  await sov(1500);
  console.log(await jamfor(scen + ' efter panorering'));
  await pg.evaluate(() => { const by = window.__byn; by.cam.x += 37; by.layout(); });
  console.log(await jamfor(scen + ' direkt efter en flytt utan ny ritning'));
  for (const z of (process.env.ZOOM ?? '1,1.7,4.5,7.3,20').split(',').map(Number)) {
    await pg.evaluate(z => { const by = window.__byn; by.cam.zoom = z; by.layout(); }, z);
    await sov(2500);
    console.log(await jamfor(`${scen} zoom ${z}`));
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
