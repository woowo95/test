// Steg 12.1.183: samma bildruta med nattfiltrets gamla shader (git REF, varld om inget anges) och den nya, i samma sida: antalet
// punkter som skiljer. Fallen: scenen som den är, med påhittade eldar (en eld, en glöd och en fackla) och folk, mitt i ett svep,
// och med halvgenomskinliga trädkronor (kanter med halv genomskinlighet).
//   node ab183.cjs [scen] [ref]     MOBIL=1: i en mobilskärm (390 × 844, tre punkter per punkt)
const { chromium } = require('playwright');
const START = require('fs').existsSync(chromium.executablePath()) ? {} : { executablePath: '/opt/pw-browsers/chromium' };
const { oppnaBy } = require('./ladda.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const HAR = __dirname, KOD = path.resolve(HAR, '../../..');
const scen = process.argv[2] ?? 'natt', ref = process.argv[3] ?? 'origin/varld';
const gammal = execSync(`git show ${ref}:src/ui/natt.ts`, { cwd: HAR }).toString();
const K = JSON.parse(execSync(`npx tsx -e "import { SKUGGA } from './src/ui/eldskugga'; import { FARGER, MORKARE, BAYER } from './src/palett'; console.log(JSON.stringify({ SKUGGA, FARGER, MORKARE, BAYER }))"`, { cwd: KOD }).toString());
const SKUGGA_LJUS = gammal.match(/const SKUGGA_LJUS = '([^']+)'/)[1];
const FRAG = gammal.slice(gammal.indexOf('const FRAG = `') + 14, gammal.indexOf('}`;', gammal.indexOf('const FRAG = `')) + 1)
  .replaceAll('${MAX_ELDAR}', '8').replaceAll('${MAX_FOLK}', '64').replaceAll('${SKUGGA.hall}', String(K.SKUGGA.hall))
  .replaceAll('${SKUGGA_LJUS}', SKUGGA_LJUS).replaceAll('${16 / SKUGGA.per}', String(16 / K.SKUGGA.per));
if (FRAG.includes('${')) throw new Error('mall kvar i den gamla shadern');
(async () => {
  const b = await chromium.launch(START);
  const ctx = await b.newContext({ ...(process.env.MOBIL ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 1300, height: 850 } }), timezoneId: 'Europe/Stockholm', colorScheme: 'light' });
  await oppnaBy(ctx, scen);
  const pg = await ctx.newPage();
  pg.on('pageerror', e => console.log('FEL', e.message));
  await pg.goto('file://' + path.join(HAR, process.env.MATT ?? 'matt.html'), { timeout: 180000 });
  await pg.waitForFunction(() => window.__M && window.__M.forsta && window.__byn.s && !window.__byn.ui.busy, null, { timeout: 600000, polling: 200 });
  await pg.waitForTimeout(8000);
  const r = await pg.evaluate(([FRAG, K]) => {
    const app = window.__byn.app; app.ticker.stop();
    let lager; const ga = c => { if (c.filters?.some(f => f.uniforms?.uAntalFolk !== undefined)) lager = c; for (const ch of c.children ?? []) ga(ch); };
    ga(app.stage);
    if (!lager) return 'hittar inte nattfiltret (är det natt?)';
    const ny = lager.filters[0], u = ny.uniforms, hex = f => [1, 3, 5].map(i => parseInt(f.slice(i, i + 2), 16) / 255);
    const platt = a => new Float32Array(a.flatMap(hex));
    const gm = new ny.constructor(undefined, FRAG, { uPal: platt(K.FARGER), uM1: platt(K.MORKARE[1]), uM2: platt(K.MORKARE[2]), uM3: platt(K.MORKARE[3]), uBayer: new Float32Array(K.BAYER) });
    const kopiera = () => { for (const k of ['uFran', 'uTill', 'uSvep', 'uPos', 'uSkala', 'uEld', 'uFolk', 'uKart', 'uRand', 'uSkugga', 'uHarSkugga', 'uBorjar']) gm.uniforms[k] = u[k]; };
    const bild = () => app.renderer.extract.pixels(app.stage);
    const fo = u.uFolk, ut = [];
    // trädkronorna halvgenomskinliga, som när folk står bakom dem
    let krona = []; const tr = c => { for (const ch of c.children ?? []) { if (ch.texture && ch.zIndex !== undefined && ch.alpha === 1 && ch.texture.height > 20) krona.push(ch); tr(ch); } }; tr(lager);
    const fall = [
      ['som scenen', () => {}],
      ['tre eldar och folk', () => { u.uEld.fill(0); u.uHarSkugga.fill(0); u.uEld.set([fo[0] + 30, fo[1], 220, -1, fo[3] - 40, fo[4] + 20, 24, 0.6, fo[0] - 60, fo[1] - 30, 150, -0.8]); u.uAntalEldar = 3; }],
      ['svep 1→2 med eldarna', () => { u.uFran = 1; u.uTill = 2; u.uSvep = 0.5; }],
      ['svep 0→1 (punkter utan mörker)', () => { u.uFran = 0; u.uTill = 1; u.uSvep = 0.4; }],
      ['halvgenomskinliga kronor', () => { for (const k of krona) k.alpha = 0.45; }],
    ];
    for (const [namn, gor] of fall) {
      gor(); kopiera();
      lager.filters = [ny]; const a = bild(); lager.filters = [gm]; const g = bild(); lager.filters = [ny];
      let n = 0, max = 0;
      for (let i = 0; i < a.length; i += 4) { const d = Math.max(Math.abs(a[i] - g[i]), Math.abs(a[i + 1] - g[i + 1]), Math.abs(a[i + 2] - g[i + 2])); if (d) { n++; max = Math.max(max, d); } }
      ut.push(`${namn}: mörker ${u.uFran}→${u.uTill}, eldar ${u.uAntalEldar}, folk ${u.uAntalFolk}; ${n} av ${a.length / 4} punkter skiljer mellan gammal och ny shader (största skillnad ${max} av 255)`);
    }
    for (const k of krona) k.alpha = 1;
    return ut.join('\n') + `\n(${krona.length} kronor gjorda halvgenomskinliga)`;
  }, [FRAG, K]);
  console.log(scen + ': ' + r);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
