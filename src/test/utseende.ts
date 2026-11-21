// Slutgenomgången av utseendet (steg 5.5.1): samma by på dagen, i skymningen, på natten och i istiden, på datorn och i
// mobilen, i ljust och mörkt läge (steg 6.9.17: datorns inställning, som spelet följer). Byn räknas fram här utan grafik, läggs i webbläsarens sparfil och visas i det byggda spelet
// (samhallssimulatorn.html, kör npm run build först) med klockan ställd på byns tid i svensk tid. Varje bild sparas, och
// kartan kontrolleras: varje punkt som ritas ska ha en färg ur paletten (palett.ts; namnskyltarna är text och räknas inte), och
// varje bild i världen ska ritas i hel skala med skarpa punkter. Felkoden är 1 om något larmar.
//   npm run utseende -- [mapp] [by]   (mappen utseende/ och by 3 om inget anges). Mobilen tas bara på dagen (den ritar nio
//   gånger fler punkter och är det som tar tid; färgerna och skalan är desamma som på datorn), och spelet går SPELA_MS innan
//   bilden tas: 18 bilder, och var och en en gång till med teknikträdet öppet (-stationer sist i namnet). ALLA=1 tar mobilen i alla fall (32 bilder, över en timme i en stor by). LAGE=ljust eller
//   LAGE=morkt tar bara det ena läget, FALL=dag,natt bara de fallen. Sökhjälp: LAGER=1 visar vilket lager punkterna utanför
//   paletten kommer från, och DEBUG=1 var på skärmen de ligger
// Vakterna för formen (steg 12.1.43, formvakter.ts): i fallet dag öppnas varje flik och personens ruta, var och en mäts och
// fotograferas (mappen/flikar/), och larmen skrivs sist. De gör inte felkoden röd (FORM_FEL=1 gör det); UTAN_FORM=1 hoppar över dem
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { State, ageIndex, bynsMitt, createState, hourOf, rovarnaKommer, serializeParts, stallUpp, step } from '../sim';
import { FARGER, MORKARE } from '../palett';
import { BEAT, START } from './kor';
import { TACK_MATA, TACK_MAX } from './tackvakt';
import { FORM, FORMVAKTER, FORM_MATA, type FormLarm } from './formvakter';

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
const req = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { chromium } = req('playwright') as any;
const palett = [...new Set([...FARGER, ...MORKARE.flat()])].map(h => parseInt(h.slice(1), 16));
// ljusets övergång (steg 12.1.170): färgen blandas steglöst mellan två steg av mörker av samma palettfärg, och de färgerna
// räknas inte som fel. Paren är varje färg och samma färg ett steg mörkare
const hex = (h: string) => parseInt(h.slice(1), 16);
const steglos = FARGER.flatMap((_, i) => MORKARE.slice(0, -1).map((m, k) => [hex(m[i]), hex(MORKARE[k + 1][i])]));
// mätningen i sidan, som text (tsx lägger annars till hjälpfunktioner som sidan inte har): bilderna i världen som inte
// ritas i hel skala med skarpa punkter, och punkterna på skärmen med en färg utanför paletten (namnskyltarna döljs medan)
const MATA = `(pal, par) => {
  const by = window.__byn, app = by.app, world = by.world, P = new Set(pal), skalor = {}, text = [], blandad = new Map();
  // en färg mellan två steg av samma palettfärg (ljusets steglösa övergång, steg 12.1.170)
  const mellan = c => { let v = blandad.get(c); if (v !== undefined) return v; v = false;
    const r = c >> 16, g = (c >> 8) & 255, b = c & 255;
    for (const [x, y] of par) { const xr = x >> 16, xg = (x >> 8) & 255, xb = x & 255, dr = (y >> 16) - xr, dg = ((y >> 8) & 255) - xg, db = (y & 255) - xb, n = dr * dr + dg * dg + db * db;
      if (!n) continue; const t = ((r - xr) * dr + (g - xg) * dg + (b - xb) * db) / n;
      if (t < -0.01 || t > 1.01) continue;
      if (Math.abs(xr + t * dr - r) <= 2 && Math.abs(xg + t * dg - g) <= 2 && Math.abs(xb + t * db - b) <= 2) { v = true; break; } }
    blandad.set(c, v); return v; };
  let iOvergang = 0;
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
    if (!P.has(c) && mellan(c)) { iOvergang++; continue; }
    if (!P.has(c)) { utanfor++; const k = '#' + c.toString(16).padStart(6, '0'); ex[k] = (ex[k] || 0) + 1; const q = i / 4, x = q % W, y = Math.floor(q / W), r = Math.floor(x / 40) + ',' + Math.floor(y / 40); rutor[r] = (rutor[r] || 0) + 1; }
  }
  const topp = Object.entries(ex).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => k + ' ' + n);
  // LAGER=1: vilket lager punkterna kommer från (hur många som försvinner när lagret döljs)
  const lager = [];
  if (window.__lager) {
    const rakna = () => { const q = app.renderer.extract.pixels(app.stage, app.screen); let n = 0; for (let i = 0; i < q.length; i += 4) { const c = (q[i] << 16) | (q[i + 1] << 8) | q[i + 2]; if (q[i + 3] === 255 && !P.has(c) && !mellan(c)) n++; } return n; };
    const alla = [...app.stage.children.map((c, i) => ['scen ' + i, c]), ...world.children.map((c, i) => ['värld ' + i, c]), ...(world.children[0].children || []).map((c, i) => ['mörk ' + i, c])];
    text.forEach(t => { t.visible = false; });
    for (const [namn, c] of alla) { if (!c.visible) continue; c.visible = false; const n = rakna(); c.visible = true; if (n < utanfor) lager.push(namn + ' (' + (c.constructor && c.constructor.name) + ') ' + (utanfor - n)); }
    text.forEach(t => { t.visible = true; });
  }
  const var_ = Object.entries(rutor).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => k.split(',').map(v => v * 40 / app.renderer.resolution).join(',') + ' ' + n);
  return { iOvergang, varld: world.scale.x * app.renderer.resolution, lager, var: var_, skalor, utanfor, ritade, topp, klocka: (document.getElementById('calTime') || {}).textContent, nu: new Date().toString(), by: new Date(by.s.now).toString() };
}`;

// varje flik och personens ruta i sidan som visas: en bild var i mappen/flikar/ och formvakternas mått (steg 12.1.43)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function formRunda(pg: any, skarm: string, lage: string, fil: string): Promise<FormLarm[]> {
  mkdirSync(`${MAPP}/flikar`, { recursive: true });
  const ut: FormLarm[] = [], mobil = skarm === 'mobil';
  const flikar = await pg.evaluate(`[...document.querySelectorAll('.tabs button[data-tab]')].filter(b => b.getAttribute('aria-disabled') !== 'true').map(b => b.dataset.tab)`) as string[];
  const mat = async (flik: string) => {
    await pg.clock.runFor(300);
    await pg.screenshot({ path: `${MAPP}/flikar/${flik}-${skarm}${fil}.png`, timeout: 120000 });
    ut.push(...(await pg.evaluate(`(${FORM_MATA})(${JSON.stringify({ pal: palett, form: FORM, flik: `${flik} (${skarm}, ${lage})`, mobil })})`) as FormLarm[]));
  };
  for (const id of flikar) { await pg.evaluate(`document.querySelector('.tabs button[data-tab="${id}"]').click()`); await mat(id); }
  // personens ruta: den första i porträttraden, med den högra panelen stängd
  const har = await pg.evaluate(`(() => { document.querySelector('[data-stang="h"]')?.click(); const b = document.querySelector('[data-id]'); if (!b) return false; b.click(); return true; })()`);
  if (har) await mat('person');
  return ut;
}

async function main() {
  mkdirSync(MAPP, { recursive: true });
  const s = createState(BY, START), larm: string[] = [], tack: string[] = [];
  const formLarm: FormLarm[] = [];
  // i molnet finns Chromium under /opt/pw-browsers (projektets Playwright är en annan version)
  const b = await chromium.launch(process.env.CLAUDE_CODE_REMOTE && existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  for (const f of FALL.filter(f => !process.env.FALL || process.env.FALL.split(',').includes(f.namn))) {
    if (!tills(s, f.ai, f.h)) { larm.push(`${f.namn}: byn kom aldrig dit`); continue; }
    if ('rovare' in f) { rovarnaKommer(s, 4, true); const c = bynsMitt(s); if (s.rovare) stallUpp(s, s.rovare, c.x + 8, c.y + 2); }
    const delar = serializeParts(s), t = s.now;
    for (const sk of SKARMAR.filter(k => k.namn === 'dator' || f.namn === 'dag' || process.env.ALLA)) for (const lg of LAGEN.filter(l => !process.env.LAGE || process.env.LAGE === l.namn)) {
      const ctx = await b.newContext({ ...sk.opt, timezoneId: 'Europe/Stockholm', colorScheme: lg.schema });
      // byn läggs i webbläsarens databas som spelet sparar den (ui/lagring.ts, egen by): en post per del och en för byn. Skrivningen
      // börjar före spelets egen läsning, och databasen gör transaktionerna i den ordning de börjar
      await ctx.addInitScript(`try { if (!sessionStorage.getItem('klar')) { sessionStorage.setItem('klar', '1'); const delar = ${JSON.stringify(delar)}; const r = indexedDB.open('samhallssimulatorn', 1);
        r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('delar')) r.result.createObjectStore('delar'); };
        r.onsuccess = () => { const db = r.result, t = db.transaction('delar', 'readwrite'), st = t.objectStore('delar'); for (const d in delar) st.put(delar[d], 'egen/' + d); st.put({ delar: Object.keys(delar) }, 'egen'); t.oncomplete = () => db.close(); }; } } catch (e) {}`);
      const pg = await ctx.newPage();
      await pg.clock.install({ time: t });
      const fel: string[] = [];
      pg.on('pageerror', (e: Error) => fel.push(e.message));
      if (process.env.LAGER) await ctx.addInitScript('window.__lager = true');
      await pg.goto(SIDA);
      // byn läses in efter att sidan laddats (boot i main.ts): vänta tills den finns innan något i den läses (steg 12.1.160)
      for (let i = 0; i < 600 && !(await pg.evaluate('!!(window.__byn && window.__byn.s)')); i++) { await pg.clock.runFor(100); await pg.waitForTimeout(50); }
      if (!(await pg.evaluate('!!(window.__byn && window.__byn.s)'))) { larm.push(`${f.namn} ${sk.namn} ${lg.namn}: byn laddades aldrig`); await ctx.close(); continue; }
      if ('zoom' in f) await pg.evaluate(`(() => { const by = window.__byn; by.cam.zoom = ${f.zoom}; by.layout(); })()`);
      await pg.clock.runFor(SPELA_MS);
      await pg.waitForTimeout(1500);
      await pg.screenshot({ path: `${MAPP}/${f.namn}-${sk.namn}${lg.fil}.png`, timeout: 120000 }); // mobilens bild är stor
      const tackUtan = await pg.evaluate(TACK_MATA) as string[];
      const r = await pg.evaluate(`(${MATA})(${JSON.stringify(palett)}, ${JSON.stringify(steglos)})`) as { iOvergang: number; varld: number; skalor: Record<string, number>; utanfor: number; ritade: number; topp: string[]; var: string[]; lager: string[]; klocka: string; nu: string; by: string };
      if (process.env.DEBUG) console.log(new Date(t).toString(), '|', r.nu, '|', r.by, '|', r.klocka, '\n   var (x,y i skärmpunkter):', r.var.join('; '));
      const andel = r.ritade ? r.utanfor / r.ritade : 1;
      const rad = `${f.namn.padEnd(14)} ${sk.namn.padEnd(6)} ${lg.namn.padEnd(5)} ${(andel * 100).toFixed(2).padStart(6)} % utanför paletten (${r.utanfor} av ${r.ritade} punkter; ${r.iOvergang} i ljusets steglösa övergång)${r.topp.length ? ': ' + r.topp.join(', ') : ''}`;
      console.log(rad);
      const nya = Object.keys(r.skalor);
      if (nya.length) console.log('   skala som inte är hel:', nya.map(k => `${k} ×${r.skalor[k]}`).join(', '));
      if (r.lager.length) console.log('   lagren:', r.lager.join('; '));
      if (fel.length) console.log('   FEL på sidan:', fel.slice(0, 3).join(' | '));
      // inzoomad ritas varje punkt i världen som ett helt antal punkter på skärmen (steg 10.2.56)
      if ('zoom' in f && Math.abs(r.varld - Math.round(r.varld)) > 1e-6) larm.push(`${f.namn} ${sk.namn} ${lg.namn}: kartan i skalan ${r.varld.toFixed(3)}, inte hela punkter`);
      if ('zoom' in f) console.log(`   kartans skala: ${r.varld.toFixed(3)} punkter på skärmen per punkt i världen`);
      if (r.utanfor) larm.push(`${f.namn} ${sk.namn} ${lg.namn}: ${r.utanfor} punkter utanför paletten`);
      if (nya.length) larm.push(`${f.namn} ${sk.namn} ${lg.namn}: bilder i en skala som inte är hel`);
      // samma bild med teknikträdet öppet, där stationerna och möblerna visas förminskade (steg 12.1.72 och 12.1.160): bara en
      // bild att titta på, panelen är text och mäts inte
      await pg.evaluate(`window.__byn.visa('teknik')`);
      await pg.clock.runFor(500);
      await pg.waitForTimeout(500);
      await pg.screenshot({ path: `${MAPP}/${f.namn}-${sk.namn}${lg.fil}-stationer.png`, timeout: 120000 });
      // knappar som täcker annat (steg 12.1.51), med panelen stängd och öppen: listas sist och gör inte felkoden röd (FORM_FEL=1 gör det)
      for (const [nar, rader] of [['utan panel', tackUtan], ['med panelen öppen', await pg.evaluate(TACK_MATA) as string[]]] as const)
        for (const x of rader.slice(0, TACK_MAX)) tack.push(`${f.namn} ${sk.namn} ${lg.namn} ${nar}: ${x}`);
      if (fel.length) larm.push(`${f.namn} ${sk.namn} ${lg.namn}: fel på sidan`);
      if (f.namn === 'dag' && !process.env.UTAN_FORM) formLarm.push(...await formRunda(pg, sk.namn, lg.namn, lg.fil));
      await ctx.close();
    }
  }
  await b.close();
  if (tack.length) { console.log(`\nKNAPPAR SOM TÄCKER ANNAT (steg 12.1.51):\n  ${tack.join('\n  ')}`); if (process.env.FORM_FEL) larm.push(`${tack.length} knappar täcker annat`); }
  if (formLarm.length) {
    console.log('\nVakterna för formen (steg 12.1.43):');
    for (const v of FORMVAKTER) {
      const l = formLarm.filter(x => x.vakt === v.id);
      console.log(`${l.length ? 'LARM' : 'OK  '} ${v.id} (${v.namn}): ${l.length}`);
      for (const x of l.slice(0, 8)) console.log(`       ${x.flik}: ${x.sak} — ${x.matt}`);
    }
    if (process.env.FORM_FEL) larm.push(`${formLarm.length} larm från vakterna för formen`);
  }
  console.log(larm.length ? `\nLARM:\n  ${larm.join('\n  ')}` : '\nAllt i paletten och i hel skala.');
  console.log(`Bilderna: ${MAPP}`);
  process.exit(larm.length ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
