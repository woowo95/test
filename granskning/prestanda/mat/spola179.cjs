// Steg 12.1.179: snabbspolningen efter en frånvaro. Mäter väggtiden för ikappräkningen och hur många bilder som ritades
// och hur lång tid ritningen tog (ikapp.rita och app.render, räknade i mätversionen av spara.ts, bygg-matt.mjs).
//   MATT=matt-179fore.html TIM=1 node spola179.cjs
const { chromium } = require('playwright');
const START = require('fs').existsSync(chromium.executablePath()) ? {} : { executablePath: '/opt/pw-browsers/chromium' };
const { oppnaBy } = require('./ladda.cjs');
const fs = require('fs'), path = require('path');
const HAR = __dirname, TIM = Number(process.env.TIM ?? 1);
(async () => {
  const b = await chromium.launch(START);
  const ctx = await b.newContext({ viewport: { width: 1300, height: 850 }, timezoneId: 'Europe/Stockholm' });
  await oppnaBy(ctx, process.env.SCEN ?? 'dag', { forskjut: TIM * 3600000, extra: "localStorage.setItem('samhallssimulatorn.spola', '1');" });
  const pg = await ctx.newPage();
  const fel = []; pg.on('pageerror', e => fel.push(e.message));
  const t0 = Date.now();
  await pg.goto('file://' + path.join(HAR, process.env.MATT ?? 'matt.html'), { timeout: 180000 });
  for (;;) {
    const l = await pg.evaluate(() => ({ sp: window.__spola, busy: window.__byn?.ui?.busy, ikapp: !!window.__byn?.s && window.__byn.s.now > Date.now() - 150000, prog: document.getElementById('progTxt')?.textContent })).catch(e => ({ fel: String(e) }));
    if (process.env.VISA) console.error(JSON.stringify(l));
    if (l.sp?.t1 && !l.busy && l.ikapp) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  const R = await pg.evaluate(() => window.__spola);
  console.log(JSON.stringify({ sida: process.env.MATT, tim: TIM, spola: R.spola, ikappS: +((R.t1 - R.t0) / 1000).toFixed(1), ggr: R.ggr, helaS: (Date.now() - t0) / 1000, bilder: R.n, ritS: +(R.ms / 1000).toFixed(1), fel }));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
