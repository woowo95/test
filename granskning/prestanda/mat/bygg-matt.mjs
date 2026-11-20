// Bygger en mätversion av spelet utan att röra koden: main.ts läses och får tidtagning runt huvudloopens delar
// (window.__M), och bunten byggs utan förminskning så att profileraren ger funktionernas namn. Skriver matt.html här.
// Skriver också storleken per källfil (metafile) för den vanliga, förminskade bunten: storlek.json.
//   node bygg-matt.mjs
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HAR = dirname(fileURLToPath(import.meta.url));
const KOD = resolve(HAR, '../../..');
const req = createRequire(KOD + '/package.json');
const { build } = req('esbuild');

const MAIN = resolve(KOD, 'src/main.ts');
function andraMain(txt) {
  const byt = (fran, till) => { if (!txt.includes(fran)) throw new Error('hittar inte: ' + fran.slice(0, 80)); txt = txt.replace(fran, () => till); };
  // hjälparen efter importerna
  byt("// startpunkten:", `
const __M: any = (window as any).__M = { on: !!(window as any).__MON, t: {} as Record<string, number[]>, cur: '', slag: [] as number[], forsta: false };
performance.mark('main-start');
function __T<T>(n: string, f: () => T): T {
  const a = performance.now(), prev = __M.cur; __M.cur = n;
  try { return f(); } finally { __M.cur = prev; if (__M.on) (__M.t[n] ??= []).push(performance.now() - a); }
}
// startpunkten:`);
  byt(`function ritaKartan(now: number) {
  sattSkuggLangd(skuggLangdAv(lightLevel(ui.nu))); // skuggan blir längre i skymningen (steg 5.1.8.2)
  drawTerrain();
  drawPlants(); drawFlackar(); drawAnimals();
  drawStructures(now);
  drawPeople(now); drawHandel(); drawTona();
  drawSkuggor();
  drawNight(ui.nu);
  drawFilter();
  drawNal();
  drawOmrade();
  drawVader(now);
}`, `function ritaKartan(now: number) { __T('ritaKartan', () => {
  __T('k.skuggLangd', () => sattSkuggLangd(skuggLangdAv(lightLevel(ui.nu))));
  __T('k.drawTerrain', () => drawTerrain());
  __T('k.drawPlants', () => drawPlants()); __T('k.drawFlackar', () => drawFlackar()); __T('k.drawAnimals', () => drawAnimals());
  __T('k.drawStructures', () => drawStructures(now));
  __T('k.drawPeople', () => drawPeople(now)); __T('k.drawHandel', () => drawHandel()); __T('k.drawTona', () => drawTona());
  __T('k.drawSkuggor', () => drawSkuggor());
  __T('k.drawNight', () => drawNight(ui.nu));
  __T('k.drawFilter', () => drawFilter());
  __T('k.drawNal', () => drawNal());
  __T('k.drawOmrade', () => drawOmrade());
  __T('k.drawVader', () => drawVader(now));
}); }`);
  byt(`  for (let n = 0; h.now < vt && n < MAX_SLAG && (!n || performance.now() - t0 < RAKNA_MS); n++) step(h, nastaSteg(h), events, s);`,
    `  __T('sim', () => { let n = 0; for (; h.now < vt && n < MAX_SLAG && (!n || performance.now() - t0 < RAKNA_MS); n++) step(h, nastaSteg(h), events, s); if (__M.on) __M.slag.push(n); });`);
  byt(`  nyBild();
  const now = performance.now();
  addTalks(events, now, ui.nu);`, `  __T('nyBild', () => nyBild());
  const now = performance.now();
  __T('addTalks', () => addTalks(events, now, ui.nu));`);
  byt(`if (now - lastUi > PANEL_MS) { lastUi = now; renderClock(); renderPanel(); renderPorts(); testKnappar(); }`,
    `if (now - lastUi > PANEL_MS) { lastUi = now; __T('p.renderClock', () => renderClock()); __T('p.renderPanel', () => renderPanel()); __T('p.renderPorts', () => renderPorts()); __T('p.testKnappar', () => testKnappar()); }`);
  byt(`{ lastLocal = now; saveLocal(); }`, `{ lastLocal = now; __T('saveLocal', () => saveLocal()); }`);
  byt(`{ lastDb = now; saveDb(); }`, `{ lastDb = now; __T('saveDb', () => saveDb()); }`);
  byt(`function tick() {
  if (!s || ui.busy) return;`, `function tick() { if (!__M.forsta && s && !ui.busy) { __M.forsta = true; performance.mark('forsta-tick'); } __T('tick', tick0); if (__M.forstaKlar !== true && __M.forsta) { __M.forstaKlar = true; performance.mark('forsta-tick-klar'); } }
function tick0() {
  if (!s || ui.busy) return;`);
  byt(`async function boot() {`, `async function boot() { performance.mark('boot-start');`);
  byt(`    const loaded = await loadSaves(nyareIMolnet);`, `    const loaded = await loadSaves(nyareIMolnet); performance.mark('lasta');`);
  byt(`    if (loaded) await laddaIn(loaded);`, `    if (loaded) { await laddaIn(loaded); performance.mark('ikapp-klar'); }`);
  byt(`  app.ticker.add(tick);
}`, `  app.ticker.add(tick); performance.mark('boot-klar');
}`);
  return txt;
}
const plugin = {
  name: 'matt',
  setup(b) {
    b.onLoad({ filter: /src[\\/]main\.ts$/ }, a => ({ contents: andraMain(readFileSync(a.path, 'utf8')), loader: 'ts', resolveDir: dirname(a.path) }));
    // skuggbildens delar syns för A/B-proven (ab318.cjs), bara i mätversionen
    b.onLoad({ filter: /src[\\/]ui[\\/]skugga\.ts$/ }, a => ({ contents: readFileSync(a.path, 'utf8') + "\n(window as any).__skugga = { delar, fotSkugga, filter: () => filter, get rt() { return rt; }, get rtTak() { return rtTak; }, get rtTrad() { return rtTrad; }, get rtRor() { return typeof rtRor === 'undefined' ? undefined : rtRor; } };\n", loader: 'ts', resolveDir: dirname(a.path) }));
    // snabbspolningen (spola179.cjs, steg 12.1.179): ikappräkningens tid och bilderna den ritar, bara i mätversionen
    b.onLoad({ filter: /src[\\/]ui[\\/]spara\.ts$/ }, a => {
      let txt = readFileSync(a.path, 'utf8');
      const byt = (fran, till) => { if (!txt.includes(fran)) throw new Error('hittar inte: ' + fran); txt = txt.replace(fran, () => till); };
      byt('rita!(); app.render();', '{ const __a = performance.now(); rita!(); app.render(); const __w = (window as any).__spola; __w.n++; __w.ms += performance.now() - __a; }');
      byt('  ui.busy = true;\n', '  ui.busy = true; const __s = (window as any).__spola ??= { n: 0, ms: 0, t0: performance.now(), ggr: 0, spola: ui.spola }; __s.ggr++;\n');
      byt('  ui.busy = false; ui.nu = target;', '  ui.busy = false; ui.nu = target; if ((window as any).__spola) (window as any).__spola.t1 = performance.now();');
      return { contents: txt, loader: 'ts', resolveDir: dirname(a.path) };
    });
    // trädens skuggor som förut (ab181.cjs, steg 12.1.181): fötterna och formerna, bara i mätversionen
    b.onLoad({ filter: /src[\\/]ui[\\/]trad\.ts$/ }, a => ({ contents: readFileSync(a.path, 'utf8') + "\n(window as any).__trad = { sprites, skuggW, skuggRy2, get lang() { return skuggLang; } };\n", loader: 'ts', resolveDir: dirname(a.path) }));
    // växterna som förut, i en Graphics ur samma rutor (ab180.cjs, steg 12.1.180), bara i mätversionen
    if (!process.env.UTAN_VAXT) b.onLoad({ filter: /src[\\/]ui[\\/]vaxter\.ts$/ }, a => ({ contents: readFileSync(a.path, 'utf8') + "\n(window as any).__vaxter = { plantLayer, bitar, drawPlants, rutaOps, synligaRutor, BW, BIT, gammal(g: any) { const v = synligaRutor(); g.clear(); for (let ry = v.y0; ry <= v.y1; ry++) for (let rx = v.x0; rx <= v.x1; rx++) ritaRuta(rx, ry, rutaOps(rx, ry), (x: number, y: number, c: number) => g.beginFill(c).drawRect(x, y, 1, 1).endFill()); } };\n", loader: 'ts', resolveDir: dirname(a.path) }));
  },
};
const r = await build({ entryPoints: [MAIN], bundle: true, minify: false, format: 'iife', target: 'es2020', write: false, legalComments: 'none', plugins: [plugin], banner: { js: "performance.mark('bunt-start');" }, absWorkingDir: KOD });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
writeFileSync(resolve(HAR, 'matt-bunt.js'), js);
const html = readFileSync(resolve(KOD, 'src/template.html'), 'utf8').replace('/*BUNDLE*/', () => js);
writeFileSync(resolve(HAR, 'matt.html'), html);
console.log('matt.html', (html.length / 1024).toFixed(0), 'KB');

// den vanliga bunten (som build.mjs) med metafile: storleken per källfil
const r2 = await build({ entryPoints: [MAIN], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false, legalComments: 'none', metafile: true, absWorkingDir: KOD });
const ut = Object.values(r2.metafile.outputs)[0];
const filer = Object.entries(ut.inputs).map(([f, v]) => ({ f, b: v.bytesInOutput })).sort((a, b) => b.b - a.b);
writeFileSync(resolve(HAR, 'storlek.json'), JSON.stringify({ total: r2.outputFiles[0].text.length, filer }, null, 1));
console.log('bunten', (r2.outputFiles[0].text.length / 1024).toFixed(0), 'KB');
