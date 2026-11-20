// prövar ikappräkningen i arbetaren: en timmes frånvaro, med och utan snabbspolning (SPOLA=1), eller utan arbetare (UTAN=1)
const { chromium } = require('playwright');
const path = require('path');
const MAT = '/Users/bjornhansson/Documents/GitHub/test/granskning/prestanda/mat';
const { oppnaBy } = require(MAT + '/ladda.cjs');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1300, height: 850 }, timezoneId: 'Europe/Stockholm' });
  const extra = (process.env.SPOLA ? "localStorage.setItem('samhallssimulatorn.spola', '1');" : "localStorage.setItem('samhallssimulatorn.spola', '0');") + (process.env.UTAN ? 'window.Worker = undefined;' : '');
  const t = await oppnaBy(ctx, 'dag', { forskjut: Number(process.env.TIM ?? 1) * 3600000, extra });
  const pg = await ctx.newPage();
  const fel = [], logg = []; pg.on('pageerror', e => fel.push(e.message)); pg.on('console', m => logg.push(m.type() + ': ' + m.text()));
  const t0 = Date.now(); let svar = [];
  await pg.goto('file:///Users/bjornhansson/Documents/GitHub/test/samhallssimulatorn.html', { timeout: 180000 });
  for (;;) {
    const s0 = Date.now();
    const l = await pg.evaluate(() => ({ busy: window.__byn?.ui?.busy, now: window.__byn?.s?.now, prog: document.getElementById('progTxt')?.textContent, ov: !document.getElementById('overlay').hidden })).catch(e => ({ fel: String(e) }));
    svar.push(Date.now() - s0);
    if (process.env.VISA) console.error(JSON.stringify(l));
    if (l.busy === false && l.now >= t + 3500000) break;
    if (Date.now() - t0 > 600000) { console.log('TID UTE'); break; }
    await new Promise(r => setTimeout(r, 500));
  }
  const slut = await pg.evaluate(() => ({ now: window.__byn.s.now, folk: window.__byn.s.people.filter(p => !p.dead).length, sum: document.getElementById('ovBody')?.innerText.slice(0, 120) }));
  console.log(JSON.stringify({ sek: (Date.now() - t0) / 1000, sidanSvarMaxMs: Math.max(...svar), sidanSvarMedelMs: Math.round(svar.reduce((a, b) => a + b, 0) / svar.length), timmar: (slut.now - t) / 3600000, folk: slut.folk, sum: slut.sum, fel, logg: logg.filter(x => !x.startsWith('log')).slice(0, 40) }));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
