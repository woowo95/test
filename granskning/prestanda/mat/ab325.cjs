// Samma bildruta med nattfiltrets gamla shader (git HEAD~ eller REF) och den nya, i samma sida: antalet punkter som skiljer.
//   node ab325.cjs [scen] [ref]
const { chromium } = require('playwright');
const START = require('fs').existsSync(chromium.executablePath()) ? {} : { executablePath: '/opt/pw-browsers/chromium' };
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const HAR = __dirname;
const scen = process.argv[2] ?? 'natt', ref = process.argv[3] ?? 'HEAD';
const gammal = execSync(`git show ${ref}:src/ui/natt.ts`, { cwd: HAR }).toString();
const FRAG = gammal.slice(gammal.indexOf('const FRAG = `') + 14, gammal.indexOf('}`;', gammal.indexOf('const FRAG = `')) + 1).replaceAll('${MAX_ELDAR}', '8').replaceAll('${MAX_FOLK}', '64');
const PAL = JSON.parse(fs.readFileSync(path.join(HAR, 'byar/palett.json'), 'utf8'));
(async () => {
  const b = await chromium.launch(START);
  const { t, fil } = JSON.parse(fs.readFileSync(path.join(HAR, 'byar', scen + '.json'), 'utf8'));
  const ctx = await b.newContext({ viewport: { width: 1300, height: 850 }, timezoneId: 'Europe/Stockholm', colorScheme: 'light' });
  await ctx.addInitScript(`try { if (!sessionStorage.getItem('klar')) { localStorage.setItem('samhalle-save-v1', ${JSON.stringify(fil)}); sessionStorage.setItem('klar', '1'); } } catch (e) {}`);
  await ctx.addInitScript(`(() => { const OD = Date, off = ${t} - OD.now(); class D extends OD { constructor(...a) { if (a.length === 0) super(OD.now() + off); else super(...a); } static now() { return OD.now() + off; } } window.Date = D; })()`);
  const pg = await ctx.newPage();
  pg.on('pageerror', e => console.log('FEL', e.message));
  await pg.goto('file://' + path.join(HAR, 'matt.html'), { timeout: 180000 });
  await pg.waitForFunction(() => window.__M && window.__M.forsta && window.__byn.s && !window.__byn.ui.busy, null, { timeout: 600000, polling: 200 });
  await pg.waitForTimeout(8000);
  const r = await pg.evaluate(([FRAG, PAL]) => {
    const app = window.__byn.app; app.ticker.stop();
    let lager; const ga = c => { if (c.filters?.some(f => f.uniforms?.uAntalFolk !== undefined)) lager = c; for (const ch of c.children ?? []) ga(ch); };
    ga(app.stage);
    if (!lager) return 'hittar inte nattfiltret';
    const ny = lager.filters[0], u = ny.uniforms, hex = f => [1, 3, 5].map(i => parseInt(f.slice(i, i + 2), 16) / 255);
    const platt = a => new Float32Array(a.flatMap(hex));
    const gm = new ny.constructor(undefined, FRAG, { uPal: platt(PAL.FARGER), uM1: platt(PAL.MORKARE[1]), uM2: platt(PAL.MORKARE[2]), uM3: platt(PAL.MORKARE[3]), uBayer: new Float32Array(PAL.BAYER),
      uFran: u.uFran, uTill: u.uTill, uSvep: u.uSvep, uPos: u.uPos, uSkala: u.uSkala, uEld: u.uEld, uFolk: u.uFolk, uKart: u.uKart, uRand: u.uRand });
    const bild = () => app.renderer.extract.pixels(app.stage);
    const fo = u.uFolk, ut = [];
    // fallen: som scenen är, med två eldar (en riktig med negativ styrka och en glöd) vid de första människorna, och mitt i ett svep
    const fall = [
      ['som scenen', () => {}],
      ['två eldar', () => { u.uEld.set([fo[0] + 30, fo[1], 120, -1, fo[3] - 40, fo[4] + 20, 60, 0.6]); u.uAntalEldar = 2; }],
      ['svep 1→2 och eldar', () => { u.uFran = 1; u.uTill = 2; u.uSvep = 0.5; }],
    ];
    for (const [namn, gor] of fall) {
      gor();
      Object.assign(gm.uniforms, { uFran: u.uFran, uTill: u.uTill, uSvep: u.uSvep, uEld: u.uEld });
      lager.filters = [ny]; const a = bild(); lager.filters = [gm]; const g = bild(); lager.filters = [ny]; const a2 = bild();
      let n = 0, n2 = 0, max = 0;
      for (let i = 0; i < a.length; i += 4) { const d = Math.max(Math.abs(a[i] - g[i]), Math.abs(a[i + 1] - g[i + 1]), Math.abs(a[i + 2] - g[i + 2])); if (d) { n++; max = Math.max(max, d); } if (a[i] !== a2[i] || a[i + 1] !== a2[i + 1] || a[i + 2] !== a2[i + 2]) n2++; }
      ut.push(`${namn}: mörker ${u.uFran}→${u.uTill}, eldar ${u.uAntalEldar}, folk ${u.uAntalFolk}; ${n} av ${a.length / 4} punkter skiljer mellan gammal och ny shader (största skillnad ${max} av 255); ny mot ny igen: ${n2}`);
    }
    return ut.join('\n');
  }, [FRAG, PAL]);
  console.log(scen + ": " + r);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
