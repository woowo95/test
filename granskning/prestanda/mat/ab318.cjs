// A/B för skuggbilden i två delar (förslag 318): samma bildruta i samma sida med den fasta och den rörliga delen (som spelet
// ritar dem) och med en gemensam bild som ritas på nytt ur samma behållare (som före förslaget). Också efter panorering och zoom,
// så att en rörlig del som inte ritats om syns. Kräver matt.html byggd med kroken __skugga (bygg-matt.mjs).
//   node ab318.cjs [scen]
const { chromium } = require('playwright');
const START = require('fs').existsSync(chromium.executablePath()) ? {} : { executablePath: '/opt/pw-browsers/chromium' };
const fs = require('fs'), path = require('path');
const HAR = __dirname, scen = process.argv[2] ?? 'dag';
const sov = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(START);
  const { t, fil } = JSON.parse(fs.readFileSync(path.join(HAR, 'byar', scen + '.json'), 'utf8'));
  const ctx = await b.newContext({ viewport: { width: 1300, height: 850 }, timezoneId: 'Europe/Stockholm', colorScheme: 'light' });
  await ctx.addInitScript(`try { if (!sessionStorage.getItem('klar')) { localStorage.setItem('samhalle-save-v1', ${JSON.stringify(fil)}); sessionStorage.setItem('klar', '1'); } } catch (e) {}`);
  await ctx.addInitScript(`(() => { const OD = Date, off = ${t} - OD.now(); class D extends OD { constructor(...a) { if (a.length === 0) super(OD.now() + off); else super(...a); } static now() { return OD.now() + off; } } window.Date = D; })()`);
  const pg = await ctx.newPage();
  pg.on('pageerror', e => console.log('FEL', e.message));
  await pg.goto('file://' + path.join(HAR, process.env.MATT ?? 'matt.html'), { timeout: 180000 });
  await pg.waitForFunction(() => window.__M && window.__M.forsta && window.__byn.s && !window.__byn.ui.busy, null, { timeout: 600000, polling: 200 });
  await sov(6000);
  const jamfor = namn => pg.evaluate(namn => {
    const by = window.__byn, app = by.app, S = window.__skugga; app.ticker.stop();
    let f; const ga = c => { for (const x of c.filters ?? []) if (x.uniforms?.uRor !== undefined) f = x; for (const ch of c.children ?? []) ga(ch); };
    ga(app.stage);
    if (!f || !S?.rtRor) return namn + ': hittar inte skuggfiltret eller den rörliga delen';
    const u = f.uniforms, l = S.delar(), R = app.renderer, PIXI = { RT: S.rt.constructor };
    const bild = () => { R.render(app.stage); return R.extract.pixels(); }; // det som syns på skärmen
    const a = bild();
    // som före förslaget: allt i en bild över hela kartan, nyritat ur behållarna
    const hel = PIXI.RT.create({ width: S.rt.width, height: S.rt.height, scaleMode: 0, resolution: 1 });
    R.render(l.scen, { renderTexture: hel, clear: true }); R.render(l.ror, { renderTexture: hel, clear: false });
    const gU = u.uSkugga, gP = [u.uRorPos[0], u.uRorPos[1]];
    u.uSkugga = hel; u.uRorPos[0] = -1e6; u.uRorPos[1] = -1e6;
    const g = bild();
    // och utan filtret alls: hur många punkter skuggorna mörkar (så att 0 skillnader betyder något)
    const mott = []; const gm = c => { if (c.filters?.includes(f)) mott.push(c); for (const ch of c.children ?? []) gm(ch); }; gm(app.stage);
    for (const m of mott) m.filters = null; const ingen = bild(); for (const m of mott) m.filters = [f];
    let skuggade = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== ingen[i] || a[i + 1] !== ingen[i + 1] || a[i + 2] !== ingen[i + 2]) skuggade++;
    u.uSkugga = gU; u.uRorPos[0] = gP[0]; u.uRorPos[1] = gP[1]; hel.destroy(true);
    let n = 0;
    for (let i = 0; i < a.length; i += 4) if (a[i] !== g[i] || a[i + 1] !== g[i + 1] || a[i + 2] !== g[i + 2]) n++;
    app.ticker.start();
    const synliga = l.ror.children.reduce((s, c) => s + (c.geometry ? c.geometry.graphicsData.length : c.children.filter(x => x.visible).length), 0);
    return `${namn}: zoom ${by.cam.zoom.toFixed(1)}, rörlig del ${S.rtRor.width}×${S.rtRor.height} vid (${gP[0]}, ${gP[1]}), ${synliga} rörliga former; ${n} av ${a.length / 4} punkter skiljer (skuggorna mörkar ${skuggade})`;
  }, namn);
  console.log(await jamfor(scen + ' stilla'));
  // panorering: kameran flyttas varje bildruta, och stannar
  await pg.evaluate(() => { const by = window.__byn, c = by.cam, x0 = c.x, y0 = c.y, t0 = performance.now(); window.__rorPa = true;
    const f = () => { if (!window.__rorPa) return; const u = (performance.now() - t0) / 1000; c.x = x0 + 300 * Math.sin(u * 0.7); c.y = y0 + 200 * Math.sin(u * 0.45); by.layout(); requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await sov(4000);
  await pg.evaluate(() => { window.__rorPa = false; });
  console.log(await jamfor(scen + ' under panorering (stannad)'));
  await pg.evaluate(() => { window.__rorPa = false; const by = window.__byn; by.cam.x += 37; by.layout(); });
  console.log(await jamfor(scen + ' direkt efter en flytt utan ny ritning'));
  for (const z of [1, 7.3, 20]) {
    await pg.evaluate(z => { const by = window.__byn; by.cam.zoom = z; by.layout(); }, z);
    await sov(2500);
    console.log(await jamfor(`${scen} zoom ${z}`));
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
