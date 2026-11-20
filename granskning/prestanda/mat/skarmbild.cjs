// Deterministisk skärmbild av en scen (fejkad klocka som i utseende-testet), för att jämföra bilden före och efter en ändring.
//   node skarmbild.cjs <scen> <namn>           ra/<scen>-<namn>.png
//   node skarmbild.cjs jamfor <a.png> <b.png>  antalet punkter som skiljer
const { chromium } = require('playwright');
const START = require('fs').existsSync(chromium.executablePath()) ? {} : { executablePath: '/opt/pw-browsers/chromium' };
const fs = require('fs'), path = require('path');
const HAR = __dirname, RA = path.join(HAR, 'ra');
(async () => {
  const [a, b1, c1] = process.argv.slice(2);
  const b = await chromium.launch(START);
  if (a === 'jamfor') {
    const pg = await b.newPage();
    const url = f => 'data:image/png;base64,' + fs.readFileSync(path.resolve(f)).toString('base64');
    const r = await pg.evaluate(async ([u1, u2]) => {
      const las = u => new Promise(res => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); res(g.getImageData(0, 0, i.width, i.height)); }; i.src = u; });
      const x = await las(u1), y = await las(u2); let n = 0;
      if (x.width !== y.width || x.height !== y.height) return 'olika storlek';
      for (let i = 0; i < x.data.length; i += 4) if (x.data[i] !== y.data[i] || x.data[i + 1] !== y.data[i + 1] || x.data[i + 2] !== y.data[i + 2]) n++;
      return `${n} av ${x.width * x.height} punkter skiljer`;
    }, [url(b1), url(c1)]);
    console.log(r); await b.close(); return;
  }
  const { t, fil } = JSON.parse(fs.readFileSync(path.join(HAR, 'byar', a + '.json'), 'utf8'));
  const ctx = await b.newContext({ viewport: { width: 1300, height: 850 }, timezoneId: 'Europe/Stockholm', colorScheme: 'light' });
  await ctx.addInitScript(`try { if (!sessionStorage.getItem('klar')) { localStorage.setItem('samhalle-save-v1', ${JSON.stringify(fil)}); sessionStorage.setItem('klar', '1'); } } catch (e) {}`);
  const pg = await ctx.newPage();
  await pg.clock.install({ time: t });
  await pg.goto('file://' + path.join(HAR, 'matt.html'), { timeout: 180000 });
  await pg.clock.runFor(Number(process.env.MS ?? 1000));
  await pg.waitForTimeout(1500);
  await pg.locator('#map').screenshot({ path: path.join(RA, `${a}-${b1}.png`), timeout: 120000 });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
