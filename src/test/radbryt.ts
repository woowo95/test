// Radbrytningarna (steg 13.10.43): npm run granska öppnar varje flik med alla sina delar, personens alla delar och rutorna för
// husen, stationerna, eldarna och lagerplatserna i en av testbyarna, på datorn och i mobilen, och mäter var raderna bryts
// (RADBRYT_MATA, en text som körs i sidan). Det som larmar skrivs till radbryt.md i underlaget, med en bild av varje ruta som
// larmar. Läsaren för radbrytningarna (.claude/workflows/granska.js) tittar på bilderna.
//   npx tsx src/test/radbryt.ts mapp [fil i test/facit-byar/]   (kör npm run build först)
import './utc';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { alive, eldarOf, isKlar, living, serializeParts, stationerOf } from '../sim';
import { lasBy } from './delby';

export const RADBRYT = {
  smal: 96, smalRader: 4, // en ruta smalare än så här (punkter) med minst så här många rader text
  max: 6, // så många exempel per slag och ruta
  per: 12, // så många rutor av varje slag (hus, stationer) öppnas, olika sorter först
};
export const RADBRYTVAKTER: { id: string; namn: string }[] = [
  { id: 'pil', namn: 'En pil eller symbol ensam på en rad' },
  { id: 'tal', namn: 'Ett tal skilt från sin symbol eller enhet' },
  { id: 'tecken', namn: 'Ett skiljetecken först på en rad' },
  { id: 'ensamt', namn: 'Ett ensamt ord sist i ett stycke' },
  { id: 'sak', namn: 'En knapp eller sak ensam på en ny rad' },
  { id: 'smal', namn: 'Många rader i en smal ruta' },
];
export interface RadLarm { vakt: string; vy: string; sak: string; matt: string }
// mätningen i sidan: ({ g, vy }) => RadLarm[]. Innehållet i varje stycke är en följd av ord och symboler; en rad tar slut där
// nästa ligger under den förra
export const RADBRYT_MATA = `({ g, vy }) => {
  const ut = [], antal = {};
  const larm = (vakt, el, matt) => { antal[vakt] = (antal[vakt] || 0) + 1; if (antal[vakt] > g.max) return; ut.push({ vakt, vy, sak: (el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).join('.') : '') + ' "' + (el.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 50) + '"'), matt }); };
  const syns = el => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const c = getComputedStyle(el); return c.visibility !== 'hidden' && c.display !== 'none' && +c.opacity > 0.05; };
  const inline = el => /^(inline|contents|inline-block|inline-flex|inline-grid|ruby)/.test(getComputedStyle(el).display);
  const ENHET = /^(%|dygn|år|månad(er)?|veckor?|timm(e|ar)|min(uter)?|kg|grader|°C?)\\b|^%/;
  const TAL = /^[−-]?\\d+([,.]\\d+)?$/;
  const SKILJE = /^[·,.;:)⇄+=]/;
  for (const pan of [...document.querySelectorAll('.panel:not([hidden]) .panelkropp')].filter(syns)) {
    const alla = [...pan.querySelectorAll('*')].filter(syns);
    for (const el of alla) {
      const d = getComputedStyle(el).display;
      // pilen först på raden: orden efter den ska börja på samma rad
      if (el.classList.contains('falla')) {
        const rg = document.createRange(); rg.selectNodeContents(el);
        const q = [...rg.getClientRects()].find(x => x.width > 1 && x.height > 4), r = el.getBoundingClientRect(), pad = parseFloat(getComputedStyle(el).paddingTop) || 0;
        if (q && !/(flex|grid)/.test(d) && q.top - r.top - pad > Math.max(14, q.height * 0.8)) larm('pil', el, 'pilen står ' + Math.round(q.top - r.top - pad) + ' punkter ovanför orden');
      }
      if (inline(el) || /(flex|grid|table|table-row)$/.test(d) && !/^(block)/.test(d)) {
        // en rad av saker som bryts: den sista ensam på en ny rad
        if (/^flex/.test(d) && getComputedStyle(el).flexWrap === 'wrap') {
          const barn = [...el.children].filter(syns), sist = barn[barn.length - 1], forra = barn[barn.length - 2];
          if (sist && forra && sist.getBoundingClientRect().top >= forra.getBoundingClientRect().bottom - 2 && sist.getBoundingClientRect().width < 60 && barn.length > 2 && barn.filter(b => b.getBoundingClientRect().top === sist.getBoundingClientRect().top).length === 1 && (sist.matches('button, img, svg') || sist.querySelector('img, svg')) && !sist.matches('.famp')) larm('sak', el, 'det sista står ensamt på en ny rad');
        }
        continue;
      }
      // bitarna i stycket i ordning: ord och symboler (också i inline-delar)
      const bitar = [];
      const ga = n => {
        for (const b of n.childNodes) {
          if (b.nodeType === 3) { const rg = document.createRange(); for (const o of b.textContent.matchAll(/[^\\s]+/g)) { rg.setStart(b, o.index); rg.setEnd(b, o.index + o[0].length); const rs = [...rg.getClientRects()].filter(q => q.width > 0); if (rs.length) bitar.push({ t: o[0], el: n, r: rs[0], e: rs[rs.length - 1] }); } }
          else if (b.nodeType === 1 && syns(b)) {
            if (/^(IMG|SVG|CANVAS)$/i.test(b.tagName)) { const q = b.getBoundingClientRect(); bitar.push({ t: '', sym: true, el: n, r: q, e: q }); }
            else if (/absolute|fixed/.test(getComputedStyle(b).position)) continue;
            else if (b.tagName === 'SELECT' || b.tagName === 'INPUT') { const q = b.getBoundingClientRect(); bitar.push({ t: 'x', el: n, r: q, e: q }); }
            else if (inline(b)) { if (b.classList.contains('bar')) { const q = b.getBoundingClientRect(); bitar.push({ t: '', stapel: true, el: n, r: q, e: q }); } else ga(b); }
            else bitar.push({ brott: true });
          } 
        }
      };
      ga(el);
      // raderna
      const rader = []; let rad = [];
      for (const b of bitar) {
        if (b.brott) { if (rad.length) { rader.push(rad); rad = []; } rader.push(undefined); continue; }
        const f = rad[rad.length - 1];
        if (f && b.r.left < f.e.right - 1 && b.r.top > f.e.top + f.e.height * 0.5) { rader.push(rad); rad = []; }
        rad.push(b);
      }
      if (rad.length) rader.push(rad);
      const st = getComputedStyle(el), lh = parseFloat(st.lineHeight) || parseFloat(st.fontSize) * 1.25;
      for (let i = 0; i + 1 < rader.length; i++) {
        const A = rader[i], B = rader[i + 1];
        if (!A || !B) continue;
        const a = A[A.length - 1], b = B[0];
        if (b.r.top - a.e.top > lh * 2.2) continue; // en <br> eller ett nytt block
        if (A.length === 1 && a.sym && !b.sym) larm('pil', el, 'symbolen står ensam på raden före "' + b.t + '"');
        if (B.length === 1 && b.sym && !(rader[i + 2]) && !a.sym) larm('pil', el, 'symbolen står ensam på raden efter "' + a.t + '"');
        if (TAL.test(a.t) && ENHET.test(b.t) || a.sym && TAL.test(b.t) && a.el === b.el.parentElement || a.sym && TAL.test(b.t) && a.el === b.el || TAL.test(a.t) && b.sym && a.el === b.el) larm('tal', el, (a.t || 'symbolen') + ' | ' + (b.t || 'symbolen'));
        if (SKILJE.test(b.t || '') && !/^[.,]\\d/.test(b.t)) larm('tecken', el, '"' + b.t + '" står först på raden');
      }
      const hela = rader.filter(Boolean).flat(), sista = rader[rader.length - 1], nast = rader[rader.length - 2];
      if (sista && nast && sista.length === 1 && !sista[0].sym && !sista[0].stapel && hela.filter(b => !b.sym).length >= 4 && sista[0].r.top - nast[nast.length - 1].e.top < lh * 2.2 && sista[0].r.width < el.clientWidth * 0.3) larm('ensamt', el, '"' + sista[0].t + '" ensamt på sista raden');
      if (el.clientWidth && el.clientWidth < g.smal && rader.filter(Boolean).length >= g.smalRader && !rader.includes(undefined)) larm('smal', el, rader.length + ' rader i ' + el.clientWidth + ' punkter');
    }
  }
  return ut;
}`;

const MAPP = resolve(process.argv[2] ?? 'radbryt');
const DIR = fileURLToPath(new URL('../../test/facit-byar/', import.meta.url));
const SKARMAR = [
  { namn: 'dator', opt: { viewport: { width: 1300, height: 850 } } },
  { namn: 'mobil', opt: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
];
async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { chromium } = createRequire(import.meta.url)('playwright') as any;
  mkdirSync(`${MAPP}/radbryt`, { recursive: true });
  // den sparade testby som har flest invånare och stationer
  const filer = process.argv[3] ? [process.argv[3]] : readdirSync(DIR).filter(f => f.endsWith('.json.gz'));
  const val = filer.map(f => ({ f, s: lasBy(DIR + f) })).sort((a, b) => living(b.s).length * 3 + stationerOf(b.s).length - living(a.s).length * 3 - stationerOf(a.s).length)[0];
  const s = val.s, delar = serializeParts(s);
  // rutorna: en av varje sort först
  const sorter = <T>(xs: T[], k: (x: T) => string) => { const sedda = new Set<string>(); return xs.filter(x => { const y = k(x); if (sedda.has(y)) return false; sedda.add(y); return true; }).slice(0, RADBRYT.per); };
  const stn = sorter(stationerOf(s).filter(isKlar), x => x.k).map(x => x.id), hus = sorter(s.hus ?? [], h => h.fn ?? '').map(h => h.id);
  const folk = living(s).filter(alive).sort((a, b) => b.name.length - a.name.length).slice(0, 2).map(p => p.id); // de längsta namnen
  const b = await chromium.launch(process.env.CLAUDE_CODE_REMOTE && existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const larm: RadLarm[] = [], fel: string[] = [];
  let vyer = 0;
  for (const sk of SKARMAR) {
    const ctx = await b.newContext({ ...sk.opt, timezoneId: 'Europe/Stockholm', colorScheme: 'light' });
    await ctx.addInitScript(`try { if (!sessionStorage.getItem('klar')) { sessionStorage.setItem('klar', '1'); const delar = ${JSON.stringify(delar)}; const r = indexedDB.open('samhallssimulatorn', 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('delar')) r.result.createObjectStore('delar'); };
      r.onsuccess = () => { const db = r.result, t = db.transaction('delar', 'readwrite'), st = t.objectStore('delar'); for (const d in delar) st.put(delar[d], 'egen/' + d); st.put({ delar: Object.keys(delar) }, 'egen'); t.oncomplete = () => db.close(); }; } } catch (e) {}`);
    const pg = await ctx.newPage();
    await pg.clock.install({ time: s.now });
    pg.on('pageerror', (e: Error) => fel.push(e.message));
    await pg.goto('file://' + resolve('samhallssimulatorn.html'));
    for (let i = 0; i < 600 && !(await pg.evaluate('!!(window.__byn && window.__byn.s && window.__byn.s.people.length > 4)')); i++) { await pg.clock.runFor(100); await pg.waitForTimeout(50); }
    await pg.clock.runFor(500);
    await pg.evaluate(`document.fonts && document.fonts.ready`);
    await pg.evaluate(`window.__byn.app?.ticker?.stop?.(); document.getElementById('map').style.display = 'none'`); // kartan mäts inte, och utan den går mätningen fort
    const vy = async (namn: string, panel: string) => {
      vyer++;
      const id = `${namn}-${sk.namn}`.replace(/[^a-zA-ZåäöÅÄÖ0-9-]+/g, '-');
      const xs = (await pg.evaluate(`(${RADBRYT_MATA})(${JSON.stringify({ g: RADBRYT, vy: id })})`)) as RadLarm[];
      larm.push(...xs);
      if (!xs.length && !process.env.ALLA) return;
      // hela rutan på bilden, också det som rullas
      await pg.evaluate(`(() => { const p = document.querySelector('${panel}'); if (!p) return; p.dataset.foto = '1'; p.style.cssText = 'height:auto;max-height:none;bottom:auto;top:0;z-index:99;animation:none;transition:none;' + ('${panel}' === '#ruta' ? 'left:0;' : ''); p.querySelector('.panelkropp').style.overflow = 'visible'; })()`);
      await pg.locator(panel).screenshot({ path: `${MAPP}/radbryt/${id}.png`, timeout: 60000 }).catch((e: Error) => fel.push(id + ' ' + e.message.slice(0, 80)));
      await pg.evaluate(`(() => { const p = document.querySelector('${panel}'); if (!p) return; p.style.cssText = ''; p.querySelector('.panelkropp').style.overflow = ''; })()`);
    };
    // allt utfällbart i panelen fälls ut, en gång var
    const fallUt = async (panel: string) => { for (let n = 0; n < 12; n++) { const k = await pg.evaluate(`(() => { const xs = [...document.querySelectorAll('${panel} .falla[aria-expanded="false"]')]; const x = xs.find(e => !(window.__falld ||= new Set()).has(e.textContent)); if (!x) return false; window.__falld.add(x.textContent); x.click(); return true; })()`); if (!k) break; await pg.clock.runFor(50); } };
    const delarna = async (panel: string, namn: string) => {
      const n = (await pg.evaluate(`document.querySelectorAll('${panel} .pdelar button:not([disabled])').length`)) as number;
      if (!n) { await vy(namn, panel); return; }
      for (let i = 0; i < n; i++) {
        await pg.evaluate(`document.querySelectorAll('${panel} .pdelar button:not([disabled])')[${i}]?.click()`);
        await pg.clock.runFor(150); await pg.evaluate('window.__falld = new Set()'); await fallUt(panel);
        await vy(`${namn}-${i + 1}`, panel);
      }
    };
    const flikar = (await pg.evaluate(`[...document.querySelectorAll('.tabs button[data-tab]')].filter(b => b.getAttribute('aria-disabled') !== 'true').map(b => b.dataset.tab)`)) as string[];
    for (const id of [...flikar, 'forrad']) { await pg.evaluate(`window.__byn.visa('${id}')`); await pg.clock.runFor(150); await delarna('#hPanel', id); }
    await pg.evaluate(`document.querySelector('[data-stang="h"]')?.click()`);
    for (const id of folk) { await pg.evaluate(`window.__byn.selectPerson(${id})`); await pg.clock.runFor(150); await delarna('#vPanel', `person${folk.indexOf(id) + 1}`); }
    await pg.evaluate(`document.querySelector('[data-stang="v"]')?.click()`);
    const ruta = async (namn: string, satt: string, tab: string) => { await pg.evaluate(`(() => { const u = window.__byn.ui; ${satt}; window.__byn.visa('${tab}'); })()`); await pg.clock.runFor(100); await vy(namn, '#ruta'); };
    for (const id of hus) await ruta(`hus${id}`, `u.husId = ${id}`, 'hus');
    for (const id of stn) await ruta(`station-${stationerOf(s).find(x => x.id === id)!.k}`, `u.stationId = ${id}`, 'station');
    for (let i = 0; i < Math.min(2, eldarOf(s).length); i++) await ruta(`eld${i}`, `u.eld = ${i ? i - 1 : "undefined"}`, 'eld');
    for (let i = 0; i < 3; i++) await ruta(`lager${i}`, `u.lagerNr = ${i}`, 'lager');
    await ctx.close();
  }
  await b.close();
  const text = ['# Radbrytningarna (steg 13.10.43)', '', `Byn ${val.f}, ${living(s).length} invånare: ${vyer} vyer på datorn och i mobilen. Bilderna av det som larmar ligger i radbryt/.`, ''];
  for (const v of RADBRYTVAKTER) { const l = larm.filter(x => x.vakt === v.id); text.push(`## ${l.length ? 'LARM' : 'OK'} ${v.namn}: ${l.length}`, ...l.map(x => `- radbryt/${x.vy}.png: ${x.sak} — ${x.matt}`), ''); console.log(`${l.length ? 'LARM' : 'OK  '} ${v.id} (${v.namn}): ${l.length}`); }
  if (fel.length) text.push('## Fel på sidan', ...fel.map(f => '- ' + f));
  writeFileSync(`${MAPP}/radbryt.md`, text.join('\n'));
  console.log(`${vyer} vyer; ${MAPP}/radbryt.md${fel.length ? `; FEL på sidan: ${fel.slice(0, 3).join(' | ')}` : ''}`);
}
main().catch(e => { console.error(e); process.exit(1); });
