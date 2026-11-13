// Slutgenomgången av utseendet (steg 5.5.1): samma by på dagen, i skymningen, på natten och i istiden, på datorn och i
// mobilen, i ljust och mörkt läge (steg 6.9.17: datorns inställning, som spelet följer). Byn räknas fram här utan grafik, läggs i webbläsarens sparfil och visas i det byggda spelet
// (samhallssimulatorn.html, kör npm run build först) med klockan ställd på byns tid i svensk tid. Varje bild sparas, och
// kartan kontrolleras: varje punkt som ritas ska ha en färg ur paletten (palett.ts; namnskyltarna är text och räknas inte), och
// varje bild i världen ska ritas i hel skala med skarpa punkter. Felkoden är 1 om något larmar.
//   npm run utseende -- [mapp] [by]   (mappen utseende/ och by 3 om inget anges). Mobilen tas bara på dagen (den ritar nio
//   gånger fler punkter och är det som tar tid; färgerna och skalan är desamma som på datorn), och spelet går SPELA_MS innan
//   bilden tas: 13 bilder. ALLA=1 tar mobilen i alla fall (24 bilder, över en timme i en stor by). LAGE=ljust eller
//   LAGE=morkt tar bara det ena läget, FALL=dag,natt bara de fallen
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { State, ageIndex, bynsMitt, createState, hourOf, rovarnaKommer, serialize, stallUpp, step } from '../sim';
import { FARGER, MORKARE } from '../palett';
import { START } from './kor';
const BEAT = 300; // fem minuter i spelet per anrop av step i testerna; simuleringen tar så många slag (KLOCKA.slag) som ryms

process.env.TZ = 'Europe/Stockholm'; // klockslagen i byn och i webbläsaren är svensk tid
const MAPP = resolve(process.argv[2] ?? 'utseende'), BY = Number(process.argv[3] ?? 3);
const SIDA = 'file://' + resolve('samhallssimulatorn.html');
// tidsåldern (0 istid, 2 sommar) och klockslaget i timmar: dagen, skymningen (18.5–19.5), natten och mitt i natten
const FALL = [
  { namn: 'dag', ai: 2, h: 12 },
  { namn: 'skymning', ai: 2, h: 19 },
  { namn: 'natt', ai: 2, h: 22 },
  { namn: 'mitt-i-natten', ai: 2, h: 1 },
  { namn: 'istid', ai: 0, h: 12 },
  { namn: 'istid-natt', ai: 0, h: 22 },
  { namn: 'natt-rovare', ai: 2, h: 22, rovare: true }, // ett rövargäng med fackla nära byn på natten (steg 10.2.99): ljuset kring alla människor
  { namn: 'inzoomning', ai: 0, h: 12, zoom: 20 }, // kartan så långt inzoomad det går, i istiden med snön (steg 10.2.56): allt ska vara skarpa hela punkter
];
const SPELA_MS = 3000; // så länge spelet går innan bilden tas, så att allt hinner ritas
const SKARMAR = [
  { namn: 'dator', opt: { viewport: { width: 1300, height: 850 } } },
  { namn: 'mobil', opt: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
];
// ljust och mörkt läge (steg 6.9.17); bilderna i mörkt läge får -morkt sist i namnet
const LAGEN = [{ namn: 'ljust', schema: 'light', fil: '' }, { namn: 'morkt', schema: 'dark', fil: '-morkt' }] as const;

// kör byn tills tidsåldern ai och klockslaget h (räknat från förra fallet, så att alla bilder är samma by)
function tills(s: State, ai: number, h: number) {
  for (let i = 0; i < 60 * 288; i++) {
    if (ageIndex(s) === ai && Math.abs(hourOf(s.now) - h) < 0.05) return true;
    step(s, BEAT);
  }
  return false;
}

// bilder som ännu ritas i en annan skala än hel och väntar på egna ritningar (steg 5.5.5): de visas men larmar inte
const KANDA: Record<string, string> = {}; // det som väntade på ritningar i steg 5.5.5 är byggt (v376)
const req = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { chromium } = req('playwright') as any;
const palett = [...new Set([...FARGER, ...MORKARE.flat()])].map(h => parseInt(h.slice(1), 16));
// mätningen i sidan, som text (tsx lägger annars till hjälpfunktioner som sidan inte har): bilderna i världen som inte
// ritas i hel skala med skarpa punkter, och punkterna på skärmen med en färg utanför paletten (namnskyltarna döljs medan)
const MATA = `pal => {
  const by = window.__byn, app = by.app, world = by.world, P = new Set(pal), skalor = {}, text = [];
  const ga = c => {
    for (const ch of c.children || []) {
      if (!ch.visible) continue;
      if (typeof ch.text === 'string') { text.push(ch); continue; }
      const bt = ch.texture && ch.texture.baseTexture;
      if (bt && bt.resource) {
        const sx = Math.abs(ch.scale.x), sy = Math.abs(ch.scale.y);
        const hel = Math.abs(sx - Math.round(sx)) < 1e-6 && Math.abs(sy - Math.round(sy)) < 1e-6 && sx >= 1;
        if (!hel || bt.scaleMode !== 0) { const k = sx.toFixed(2) + '×' + sy.toFixed(2) + ' (' + ch.texture.width + '×' + ch.texture.height + ')' + (bt.scaleMode !== 0 ? ' suddig' : ''); skalor[k] = (skalor[k] || 0) + 1; }
      }
      ga(ch);
    }
  };
  ga(world);
  text.forEach(t => { t.visible = false; });
  const px = app.renderer.extract.pixels(app.stage, app.screen);
  text.forEach(t => { t.visible = true; });
  let utanfor = 0, ritade = 0; const ex = {}, rutor = {}, W = Math.round(app.screen.width * app.renderer.resolution);
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 255) continue;
    ritade++;
    const c = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2];
    if (!P.has(c)) { utanfor++; const k = '#' + c.toString(16).padStart(6, '0'); ex[k] = (ex[k] || 0) + 1; const q = i / 4, x = q % W, y = Math.floor(q / W), r = Math.floor(x / 40) + ',' + Math.floor(y / 40); rutor[r] = (rutor[r] || 0) + 1; }
  }
  const topp = Object.entries(ex).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => k + ' ' + n);
  // LAGER=1: vilket lager punkterna kommer från (hur många som försvinner när lagret döljs)
  const lager = [];
  if (window.__lager) {
    const rakna = () => { const q = app.renderer.extract.pixels(app.stage, app.screen); let n = 0; for (let i = 0; i < q.length; i += 4) if (q[i + 3] === 255 && !P.has((q[i] << 16) | (q[i + 1] << 8) | q[i + 2])) n++; return n; };
    const alla = [...app.stage.children.map((c, i) => ['scen ' + i, c]), ...world.children.map((c, i) => ['värld ' + i, c]), ...(world.children[0].children || []).map((c, i) => ['mörk ' + i, c])];
    text.forEach(t => { t.visible = false; });
    for (const [namn, c] of alla) { if (!c.visible) continue; c.visible = false; const n = rakna(); c.visible = true; if (n < utanfor) lager.push(namn + ' (' + (c.constructor && c.constructor.name) + ') ' + (utanfor - n)); }
    text.forEach(t => { t.visible = true; });
  }
  const var_ = Object.entries(rutor).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => k.split(',').map(v => v * 40 / app.renderer.resolution).join(',') + ' ' + n);
  return { varld: world.scale.x * app.renderer.resolution, lager, var: var_, skalor, utanfor, ritade, topp, klocka: (document.getElementById('calTime') || {}).textContent, nu: new Date().toString(), by: new Date(by.s.now).toString() };
}`;

async function main() {
  mkdirSync(MAPP, { recursive: true });
  const s = createState(BY, START), larm: string[] = [];
  const b = await chromium.launch();
  for (const f of FALL.filter(f => !process.env.FALL || process.env.FALL.split(',').includes(f.namn))) {
    if (!tills(s, f.ai, f.h)) { larm.push(`${f.namn}: byn kom aldrig dit`); continue; }
    if ('rovare' in f) { rovarnaKommer(s, 4, true); const c = bynsMitt(s); if (s.rovare) stallUpp(s, s.rovare, c.x + 8, c.y + 2); }
    const fil = serialize(s), t = s.now;
    for (const sk of SKARMAR.filter(k => k.namn === 'dator' || f.namn === 'dag' || process.env.ALLA)) for (const lg of LAGEN.filter(l => !process.env.LAGE || process.env.LAGE === l.namn)) {
      const ctx = await b.newContext({ ...sk.opt, timezoneId: 'Europe/Stockholm', colorScheme: lg.schema });
      await ctx.addInitScript(`try { if (!sessionStorage.getItem('klar')) { localStorage.setItem('samhalle-save-v1', ${JSON.stringify(fil)}); sessionStorage.setItem('klar', '1'); } } catch (e) {}`);
      const pg = await ctx.newPage();
      await pg.clock.install({ time: t });
      const fel: string[] = [];
      pg.on('pageerror', (e: Error) => fel.push(e.message));
      if (process.env.LAGER) await ctx.addInitScript('window.__lager = true');
      await pg.goto(SIDA);
      if ('zoom' in f) await pg.evaluate(`(() => { const by = window.__byn, f = by.s.fire; by.cam.zoom = ${f.zoom}; by.layout(); })()`);
      await pg.clock.runFor(SPELA_MS);
      await pg.waitForTimeout(1500);
      await pg.screenshot({ path: `${MAPP}/${f.namn}-${sk.namn}${lg.fil}.png`, timeout: 120000 }); // mobilens bild är stor
      const r = await pg.evaluate(`(${MATA})(${JSON.stringify(palett)})`) as { varld: number; skalor: Record<string, number>; utanfor: number; ritade: number; topp: string[]; var: string[]; lager: string[]; klocka: string; nu: string; by: string };
      if (process.env.DEBUG) console.log(new Date(t).toString(), '|', r.nu, '|', r.by, '|', r.klocka, '\n   var (x,y i skärmpunkter):', r.var.join('; '));
      const andel = r.ritade ? r.utanfor / r.ritade : 1;
      const rad = `${f.namn.padEnd(14)} ${sk.namn.padEnd(6)} ${lg.namn.padEnd(5)} ${(andel * 100).toFixed(2).padStart(6)} % utanför paletten (${r.utanfor} av ${r.ritade} punkter)${r.topp.length ? ': ' + r.topp.join(', ') : ''}`;
      console.log(rad);
      const nya = Object.keys(r.skalor).filter(k => !KANDA[k]), kanda = Object.keys(r.skalor).filter(k => KANDA[k]);
      if (nya.length) console.log('   skala som inte är hel:', nya.map(k => `${k} ×${r.skalor[k]}`).join(', '));
      if (kanda.length) console.log('   väntar på ritningar (steg 5.5.5):', kanda.map(k => `${KANDA[k]} ×${r.skalor[k]}`).join(', '));
      if (r.lager.length) console.log('   lagren:', r.lager.join('; '));
      if (fel.length) console.log('   FEL på sidan:', fel.slice(0, 3).join(' | '));
      // inzoomad ritas varje punkt i världen som ett helt antal punkter på skärmen (steg 10.2.56)
      if ('zoom' in f && Math.abs(r.varld - Math.round(r.varld)) > 1e-6) larm.push(`${f.namn} ${sk.namn} ${lg.namn}: kartan i skalan ${r.varld.toFixed(3)}, inte hela punkter`);
      if ('zoom' in f) console.log(`   kartans skala: ${r.varld.toFixed(3)} punkter på skärmen per punkt i världen`);
      if (r.utanfor) larm.push(`${f.namn} ${sk.namn} ${lg.namn}: ${r.utanfor} punkter utanför paletten`);
      if (nya.length) larm.push(`${f.namn} ${sk.namn} ${lg.namn}: bilder i en skala som inte är hel`);
      if (fel.length) larm.push(`${f.namn} ${sk.namn} ${lg.namn}: fel på sidan`);
      await ctx.close();
    }
  }
  await b.close();
  console.log(larm.length ? `\nLARM:\n  ${larm.join('\n  ')}` : '\nAllt i paletten och i hel skala.');
  console.log(`Bilderna: ${MAPP}`);
  process.exit(larm.length ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
