// Steg 12.1.179: snabbspolningen efter en frånvaro. Mäter väggtiden för ikappräkningen och hur många bilder som ritades
// och hur lång tid ritningen tog (renderer.render och ikapp.rita räknas via requestAnimationFrame-fri krok på renderer).
//   MATT=matt-179fore.html TIM=1 node spola179.cjs
const { chromium } = require('playwright');
const START = require('fs').existsSync(chromium.executablePath()) ? {} : { executablePath: '/opt/pw-browsers/chromium' };
const fs = require('fs'), path = require('path');
const HAR = __dirname, TIM = Number(process.env.TIM ?? 1);
(async () => {
  const { t, fil } = JSON.parse(fs.readFileSync(path.join(HAR, 'byar', (process.env.SCEN ?? 'dag') + '.json'), 'utf8'));
  const b = await chromium.launch(START);
  const ctx = await b.newContext({ viewport: { width: 1300, height: 850 }, timezoneId: 'Europe/Stockholm' });
  await ctx.addInitScript(`try { if (!sessionStorage.getItem('klar')) { localStorage.setItem('samhalle-save-v1', ${JSON.stringify(fil)}); localStorage.setItem('samhallssimulatorn.spola', '1'); sessionStorage.setItem('klar', '1'); } } catch (e) {}`);
  await ctx.addInitScript(`(() => { const OD = Date, off = ${t + TIM * 3600000} - OD.now();
    class D extends OD { constructor(...a) { if (a.length === 0) super(OD.now() + off); else super(...a); } static now() { return OD.now() + off; } }
    window.Date = D; })()`);
  const pg = await b.newPage ? await ctx.newPage() : null;
  const fel = []; pg.on('pageerror', e => fel.push(e.message));
  const t0 = Date.now();
  await pg.goto('file://' + path.join(HAR, process.env.MATT ?? 'matt.html'), { timeout: 180000 });
  await pg.waitForFunction(() => window.__byn && window.__byn.app && window.__byn.app.renderer, null, { timeout: 600000, polling: 20 });
  await pg.evaluate(() => { const r = window.__byn.app.renderer, o = r.render.bind(r); window.__R = { n: 0, ms: 0, spolar: 0 };
    r.render = (...a) => { const x = performance.now(); const y = o(...a); window.__R.ms += performance.now() - x; window.__R.n++; if (document.getElementById('overlay')?.classList.contains('spolar')) window.__R.spolar++; return y; }; });
  await pg.waitForFunction(() => window.__byn.ui.busy, null, { timeout: 600000, polling: 20 }).catch(() => {});
  const t1 = Date.now();
  await pg.waitForFunction(() => window.__byn.s && !window.__byn.ui.busy, null, { timeout: 3600000, polling: 100 });
  const t2 = Date.now();
  const R = await pg.evaluate(() => window.__R);
  console.log(JSON.stringify({ sida: process.env.MATT, tim: TIM, ikappS: (t2 - t1) / 1000, helaS: (t2 - t0) / 1000, bilder: R.n, bilderSpolar: R.spolar, renderS: +(R.ms / 1000).toFixed(1), fel }));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
