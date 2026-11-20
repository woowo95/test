// A/B för skuggbilden (steg 12.1.181 och 12.1.182): samma bildruta i samma sida med skuggbilderna som spelet ritar dem (trädens
// egen bild, och efter 182 den fasta och den rörliga delen) och med en enda bild över hela kartan som ritas på nytt som före
// stegen: trädens ovaler form för form (fotSkugga i en Graphics), väggarna, väggarnas hål, folket och bilderna. Stilla, efter
// panorering, direkt efter en flytt och vid flera zoomnivåer. Räknar också hur många punkter skuggorna mörkar.
// Kräver matt.html byggd med krokarna __skugga och __trad (bygg-matt.mjs).
//   node ab181.cjs [scen]
const { chromium } = require('playwright');
const START = require('fs').existsSync(chromium.executablePath()) ? {} : { executablePath: '/opt/pw-browsers/chromium' };
const { oppnaBy } = require('./ladda.cjs');
const fs = require('fs'), path = require('path');
const HAR = __dirname, scen = process.argv[2] ?? 'dag';
const sov = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(START);
  const ctx = await b.newContext({ viewport: { width: 1300, height: 850 }, timezoneId: 'Europe/Stockholm', colorScheme: 'light' });
  await oppnaBy(ctx, scen);
  const pg = await ctx.newPage();
  pg.on('pageerror', e => console.log('FEL', e.message));
  await pg.goto('file://' + path.join(HAR, process.env.MATT ?? 'matt.html'), { timeout: 180000 });
  await pg.waitForFunction(() => window.__M && window.__M.forsta && window.__byn.s && !window.__byn.ui.busy, null, { timeout: 600000, polling: 200 });
  await sov(8000);
  const jamfor = namn => pg.evaluate(namn => {
    const by = window.__byn, app = by.app, S = window.__skugga, T = window.__trad, R = app.renderer; app.ticker.stop();
    const f = S.filter(), u = f.uniforms, l = S.delar();
    const bild = () => { R.render(app.stage); return R.extract.pixels(); };
    const a = bild();
    // som före stegen: allt i en bild över hela kartan, trädens ovaler form för form först
    const RT = S.rt.constructor, Gr = l.folk.constructor;
    const hel = RT.create({ width: S.rt.width, height: S.rt.height, scaleMode: 0, resolution: 1 });
    const g = new Gr(); g.beginFill(0xffffff);
    for (const { b, x, y } of T.sprites.values()) S.fotSkugga(g, x, y, T.skuggW(b), T.skuggRy2(b), T.lang);
    g.endFill();
    R.render(g, { renderTexture: hel, clear: true });
    for (const k of ['vaggar', 'vaggHal', 'folk', 'ikoner', 'ikonerRor']) if (l[k]) R.render(l[k], { renderTexture: hel, clear: false });
    const spar = { uSkugga: u.uSkugga, uTrad: u.uTrad }; if (u.uRor !== undefined) spar.uRor = u.uRor;
    const tom = hel.constructor.EMPTY ?? u.uTak.constructor.EMPTY;
    u.uSkugga = hel; u.uTrad = tom; if (u.uRor) u.uRor = tom;
    const gm = bild();
    // och utan filtret: hur många punkter skuggorna mörkar
    const mott = []; const ga = c => { if (c.filters?.includes(f)) mott.push(c); for (const ch of c.children ?? []) ga(ch); }; ga(app.stage);
    Object.assign(u, spar);
    for (const m of mott) m.filters = null; const ingen = bild(); for (const m of mott) m.filters = [f];
    hel.destroy(true); g.destroy();
    let n = 0, skuggade = 0;
    for (let i = 0; i < a.length; i += 4) { if (a[i] !== gm[i] || a[i + 1] !== gm[i + 1] || a[i + 2] !== gm[i + 2]) n++; if (a[i] !== ingen[i] || a[i + 1] !== ingen[i + 1] || a[i + 2] !== ingen[i + 2]) skuggade++; }
    app.ticker.start();
    return `${namn}: zoom ${by.cam.zoom.toFixed(1)}, ${T.sprites.size} träd${S.rtRor ? `, rörlig del ${S.rtRor.width}×${S.rtRor.height}` : ''}; ${n} av ${a.length / 4} punkter skiljer (skuggorna mörkar ${skuggade})`;
  }, namn);
  console.log(await jamfor(scen + ' stilla'));
  await pg.evaluate(() => { const by = window.__byn, c = by.cam, x0 = c.x, y0 = c.y, t0 = performance.now(); window.__rorPa = true;
    const f = () => { if (!window.__rorPa) return; const u = (performance.now() - t0) / 1000; c.x = x0 + 300 * Math.sin(u * 0.7); c.y = y0 + 200 * Math.sin(u * 0.45); by.layout(); requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await sov(4000);
  await pg.evaluate(() => { window.__rorPa = false; });
  console.log(await jamfor(scen + ' efter panorering'));
  await pg.evaluate(() => { const by = window.__byn; by.cam.x += 37; by.layout(); });
  console.log(await jamfor(scen + ' direkt efter en flytt utan ny ritning'));
  for (const z of [1, 7.3, 20]) {
    await pg.evaluate(z => { const by = window.__byn; by.cam.zoom = z; by.layout(); }, z);
    await sov(2500);
    console.log(await jamfor(`${scen} zoom ${z}`));
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
