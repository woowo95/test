// Steg 12.1.180: växternas ritning (drawPlants) och hela bildrutan medan kameran panorerar, i datorns tid.
//   MATT=matt.html node pan180.cjs [scen]
const { chromium } = require('playwright');
const START = require('fs').existsSync(chromium.executablePath()) ? {} : { executablePath: '/opt/pw-browsers/chromium' };
const { oppnaBy } = require('./ladda.cjs');
const path = require('path');
const HAR = __dirname, scen = process.argv[2] ?? 'dag';
(async () => {
  const b = await chromium.launch(START);
  const ctx = await b.newContext({ viewport: { width: 1300, height: 850 }, timezoneId: 'Europe/Stockholm' });
  await oppnaBy(ctx, scen);
  const pg = await ctx.newPage();
  await pg.goto('file://' + path.join(HAR, process.env.MATT ?? 'matt.html'), { timeout: 180000 });
  await pg.waitForFunction(() => window.__M && window.__M.forsta && window.__byn.s && !window.__byn.ui.busy, null, { timeout: 600000, polling: 200 });
  await pg.waitForTimeout(15000);
  await pg.evaluate(() => { const M = window.__M; M.t = {}; M.on = true; const by = window.__byn, c = by.cam, x0 = c.x, y0 = c.y, t0 = performance.now(); window.__rorPa = true;
    const f = () => { if (!window.__rorPa) return; const u = (performance.now() - t0) / 1000; c.x = x0 + 600 * Math.sin(u * 0.7); c.y = y0 + 400 * Math.sin(u * 0.45); by.layout(); requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await pg.waitForTimeout(15000);
  const r = await pg.evaluate(() => { window.__rorPa = false; const M = window.__M; M.on = false; const s = k => (M.t[k] ?? []).reduce((a, b) => a + b, 0); return { rutor: (M.t['ritaKartan'] ?? []).length, plantsMs: +s('k.drawPlants').toFixed(0), kartanMs: +s('ritaKartan').toFixed(0) }; });
  console.log(JSON.stringify({ sida: process.env.MATT ?? 'matt.html', ...r }));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
