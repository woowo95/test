import { fritidLista } from './fram';
import { PYNT } from '../../sim/pynt';
import { kvOf } from '../../sim/kvalitet';
import { delarAv, flyttaDel, helStation, flyttaStation, sakBerattelse, ACTS, DJURARTER, STATION, bordPlatser, pilesOf, living, TEKNIK, TILLBEHOR_LIST, byId, isKlar, sakNamn, actIkon, verbOf, stationById, stationDef, stationKlar, tillbehorDef, tingOf, timeLabel, FLACKAR, condOf, smutsVid, blodVid, storlekAv, TORK, torrDel } from '../../sim';
import { iconImg } from '../../ikoner';
import { frystAttr, sakAttr } from './sak';
import { iBruk } from '../ibruk';
import { taBortITest } from '../testborta';
import { condBar, durTxt, esc, fmtN, kvMark, kvOrdning, kvText, pLink, pileTxt } from '../hjalp';
import { s, ui } from '../lage';
import type { Flik } from '../panel';

// en station eller möbel (stationer.ts): öppnas genom att trycka på den på kartan. Allt står i registret STATIONER, så en
// ny station får samma ruta av sig själv. Symbolerna först; namnen när musen är över
const tip = (t: string) => `title="${esc(t)}" aria-label="${esc(t)}"`;
// det som görs vid stationen: djuret och det det blir (DJUR i redskap.ts), annars handlingens symbol
function gorRad(a: keyof typeof ACTS, bara: boolean) {
  const art = DJURARTER.find(d => d.act === a), px = actIkon(a);
  const vad = art ? `${iconImg(art.sak)} → ${Object.keys(art.slakt).map(k => iconImg(k)).join('')}` : px ? iconImg(px) : '';
  const om = art ? `${ACTS[a].namn}: ${sakNamn(art.sak).toLowerCase()} blir ${Object.keys(art.slakt).map(k => sakNamn(k).toLowerCase()).join(', ')}` : ACTS[a].namn;
  return `<dt ${tip(om + (bara ? '. Görs bara här' : ''))}>${vad}</dt><dd>${esc(ACTS[a].namn)}${bara ? ' <span class="muted">bara här</span>' : ''}</dd>`;
}
// testläget (steg 3.10.1): stationen kan tas bort eller flyttas till en ruta man trycker på på kartan (interaktion.ts)
function testRad(id: number) {
  if (!ui.testMode) return '';
  const val = ui.flytta === id;
  return `<h3>Testläget</h3><p><button type="button" class="ghost" data-test="flytta" aria-pressed="${val}" ${tip('Flytta: tryck sedan på rutan på kartan där hörnet uppe till vänster ska stå')}>✥</button> <button type="button" class="ghost" data-test="bort" ${tip('Ta bort')}>🗑️</button>`
    + `${val ? ' <span class="muted">Tryck på kartan där den ska stå.</span>' : ui.flyttFel ? ' <span class="muted">Den fick inte plats där.</span>' : ''}</p>`
    + delRader(id);
}
// en station med delar (steg 9.4.2): varje del flyttas och vrids för sig
function delRader(id: number) {
  const st = stationById(s, id);
  if (!st?.delar?.length) return '';
  return `<p class="muted small">${helStation(s, st) ? 'Hel: alla delar står i samma rum.' : 'Inte hel: delarna står i olika rum, och ingen kan arbeta vid den.'}</p><ul class="rels">${delarAv(st).map(q => `<li>${esc(q.del?.namn ?? '')}<span></span><span><button type="button" class="ghost" data-del="${q.i}" data-delgor="flytta" aria-pressed="${ui.flytta === id && ui.flyttaDel === q.i}" ${tip('Flytta delen: tryck sedan på kartan')}>✥</button> <button type="button" class="ghost" data-del="${q.i}" data-delgor="vrid" ${tip('Vrid delen ett kvarts varv')}>⟳</button></span></li>`).join('')}</ul>`;
}
// den markerade stationen flyttas hit (trycket på kartan i testläget). false = den fick inte plats
export function flyttaHit(x: number, y: number) {
  const st = stationById(s, ui.flytta);
  const del = ui.flyttaDel;
  ui.flytta = -1; ui.flyttaDel = -1;
  ui.flyttFel = !!st && !(del >= 0 ? flyttaDel(s, st, del, x, y) : flyttaStation(s, st, x, y));
}
export const station: Flik = {
  namn: 'Stationen',
  knapp: 'person',
  klick(el) {
    const d = el.closest<HTMLElement>('[data-delgor]'), sd = d && ui.testMode ? stationById(s, ui.stationId) : undefined;
    if (d && sd) { // en del (steg 9.4.2): vrid den där den står, eller välj den och tryck sedan på kartan
      const i = Number(d.dataset.del), q = delarAv(sd)[i];
      ui.flyttFel = false;
      if (d.dataset.delgor === 'vrid') ui.flyttFel = !flyttaDel(s, sd, i, q.x, q.y, true);
      else { const val = ui.flytta === sd.id && ui.flyttaDel === i; ui.flytta = val ? -1 : sd.id; ui.flyttaDel = val ? -1 : i; }
      return true;
    }
    const b = el.closest<HTMLElement>('[data-test="flytta"],[data-test="bort"]'), st = b && ui.testMode ? stationById(s, ui.stationId) : undefined;
    if (!b || !st) return false;
    ui.flyttFel = false; ui.flyttaDel = -1;
    if (b.dataset.test === 'bort') { taBortITest(s, st); ui.flytta = -1; } else ui.flytta = ui.flytta === st.id ? -1 : st.id;
    return true;
  },
  html() {
    const st = stationById(s, ui.stationId), d = st && stationDef(st.k);
    if (!st || !d) return '<p class="muted">Den finns inte längre.</p>';
    const klar = isKlar(st), vem = (st.vem ?? []).map(id => byId(s, id)).filter(p => p);
    const status = klar ? (st.klar !== undefined ? `Klar ${esc(timeLabel(s, st.klar))}.` : 'Klar.') : `Byggs: ${Math.round(stationKlar(st) * 100)} %.`;
    // redskapsplatserna (vid i registret): kniven vid slaktbänken, bensylen vid slöjdbänken
    const platser = Object.entries(d.vid ?? {}).map(([slag, n]) => {
      const har = tingOf(s).filter(k => k.vid === st.id && k.k === slag), namn = sakNamn(slag).toLowerCase();
      return Array.from({ length: n }, (_, i) => {
        const k = har[i];
        if (!k) return `<dt ${tip(`Tom plats: byn gör en ny ${namn}`)}>${iconImg(slag)}</dt><dd class="muted">tom</dd>`;
        const var_ = k.hos !== undefined ? `används av ${pLink(byId(s, k.hos))}` : k.lass !== undefined ? 'bärs' : 'ligger här';
        return `<dt class="tryck" data-sak="t:${k.id}" ${tip(`Bänkens ${namn}, skick ${Math.round(k.c * 100)} %`)}>${iconImg(slag)}</dt><dd>${condBar(k.c)} ${var_}</dd>`;
      }).join('');
    }).join('');
    // tillbehören som hör till den (TILLBEHOR i stationer.ts): det som ligger i den, och det som saknas
    const tb = TILLBEHOR_LIST.filter(k => tillbehorDef(k)!.till === st.k).map(k => {
      const td = tillbehorDef(k)!, har = !!st.med?.includes(k);
      return `<dt ${tip(td.namn + (td.varme ? `: den som sover här kyls ${Math.round(td.varme * 100)} % mindre` : ''))}>${iconImg(td.ikon)}</dt><dd${har ? '' : ' class="muted"'}>${esc(td.namn)}${har ? '' : ', saknas'}</dd>`;
    }).join('');
    // platserna runt ett bord (steg 2.2.15): en stubbe per plats, och den som sitter där
    const sitter = (x: number, y: number) => living(s).find(p => p.task?.phase === 'do' && Math.floor(p.task.tx) === x && Math.floor(p.task.ty) === y && Math.floor(p.x) === x && Math.floor(p.y) === y);
    const stubbar = klar ? bordPlatser(st).map(q => { const p = sitter(q.x, q.y); return p ? `<span ${tip(`${p.name}: ${ACTS[p.task!.act].namn.toLowerCase()}`)}>${iconImg('sittplats')}${pLink(p)}</span>` : `<span class="muted" ${tip('Ledig plats')}>${iconImg('sittplats')}</span>`; }).join(' ') : '';
    // förvaringen (steg 2.3.6): det som ligger i den och hur mycket den rymmer. Kistan i sovrummet (steg 2.10.18): ägarens
    // redskap och kläder som ingen använder
    const har = d.forvar && st.ag === undefined ? pilesOf(s).filter(a => a.x === st.x && a.y === st.y) : [], agare = byId(s, st.ag);
    const forvar = !d.forvar ? '' : st.ag !== undefined ? `Rymmer ${STATION.kistaTing} redskap och kläder som ägaren inte använder, och de slits som under tak.` : d.forvar.redskap ? `Rymmer ${d.forvar.rymmer} redskap eller vapen.` : `Rymmer ${d.forvar.rymmer} högar av ett slag${d.forvar.tak ? ', och det som ligger i den slits som under tak' : ''}.`;
    // innehållet visas som i ett lager (steg 4.5.7.9); det som någon tagit ur kistan står inte där förrän det läggs tillbaka (steg 6.8.11): samma lista med symbol, antal, kvalitet och skick
    const rad = (attr: string, txt: string, c: number, k: string) => `<dt class="tryck${frystAttr(k)}" ${attr}>${txt}</dt><dd>${condBar(c)}<span>${Math.round(c * 100)} %</span></dd>`;
    const inne = (st.ag !== undefined
      ? tingOf(s).filter(k => k.vid === st.id && k.hos === undefined && k.lass === undefined && k.bar === undefined).sort(kvOrdning).map(k => rad(`data-sak="t:${k.id}"`, pileTxt({ k: k.k, n: 1, max: 1, q: k.q }), k.c, k.k))
      : [...har].sort((a, b) => kvOrdning(a, b) || sakNamn(a.k).localeCompare(sakNamn(b.k), 'sv') || b.n - a.n || condOf(b) - condOf(a)).map(a => rad(sakAttr(a), pileTxt(a), condOf(a), a.k))).join('');
    // smutsen (steg 2.7.1): blodet vid slaktbänken, som bleknar på ett par dygn. Bara utseende
    const { w: bw, h: bh } = storlekAv(st), bv = blodVid(s, st, bw, bh);
    const smuts = (bv > 0 ? `<span ${tip(`Blod runt omkring, ${Math.round(bv * 100)} % färskt. Det bleknar bort på ett par dygn`)}>🩸 ${Math.round(bv * 100)} %</span> ` : '') + Object.entries(smutsVid(s, st)).filter(([, v]) => v > 0).map(([k, v]) => { const fd = (FLACKAR as Record<string, { namn: string; bleknar: number }>)[k]; return fd ? `<span ${tip(`${fd.namn} runt omkring, ${Math.round(v * 100)} %. Det bleknar bort på ${Math.round(fd.bleknar / 24)} dygn`)}>· ${Math.round(v * 100)} %</span>` : ''; }).join(' ');
    // latrinen (steg 2.7.2): hur full den är. När den är full fylls den igen och byn gräver en ny
    // det som hänger på torkställningen (steg 2.8.2): råvaran, hur många bitar (steg 4.5.3.1) och hur långt torkningen kommit
    const hanger = (st.tork ?? []).map(q => `<span ${tip(`${fmtN(q.n)} ${sakNamn(q.k).toLowerCase()}, torkat till ${Math.round(torrDel(s, q) * 100)} % av ${TORK.dygn} dygn`)}>${iconImg(q.k)} ×${fmtN(q.n)} · ${Math.round(torrDel(s, q) * 100)} %</span>`).join(' ');
    // talgljuset på bordet eller hyllan (ljus.ts, steg 6.3.8): om det brinner och hur mycket som är kvar
    const tl = s.ljus?.find(q => q.st === st.id);
    const ljuset = tl ? `<p ${tip(`Ett talgljus, ${tl.tand ? 'tänt' : 'släckt'}, ${Math.round(tl.c * 100)} % kvar`)}>${iconImg('talgljus')} ${tl.tand ? 'Tänt' : 'Släckt'} ${condBar(tl.c)}<span>${Math.round(tl.c * 100)} %</span></p>` : '';
    const fyllt = ljuset + (hanger ? `<p>${hanger}</p>` : '') + (d.gor.includes('toa') && klar ? `<p ${tip(`Fylld till ${Math.round((st.fyllt ?? 0) * 100)} %. När den är full fylls den igen med jord, och byn gräver en ny`)}>${iconImg('latrin')} ${Math.round((st.fyllt ?? 0) * 100)} %</p>` : '');
    // det som används just nu (steg 3.6.6): den som arbetar, sakerna på bänken och hur långt arbetet kommit
    const ib = klar ? iBruk(st) : undefined;
    const bruk = ib ? `<h3>Används nu</h3><p>${pLink(ib.p)} ${esc(verbOf(ib.p.task!.act))} ${ib.saker.map(k => `<span ${tip(sakNamn(k))}>${iconImg(k)}</span>`).join('')}${ib.gor ? ` → <span ${tip(sakNamn(ib.gor))}>${iconImg(ib.gor)}</span>` : ''}</p>`
      + (ib.klar !== undefined ? `<p ${tip(`${Math.round(ib.klar * 100)} % klart`)}>${condBar(ib.klar)}<span>${Math.round(ib.klar * 100)} %</span></p>` : ib.p.task!.until > s.now ? `<p class="muted">${durTxt(ib.p.task!.until - s.now)} kvar</p>` : '') : '';
    const av = Object.entries(d.av).map(([k, n]) => `<span ${tip(`${fmtN(n)} ${sakNamn(k).toLowerCase()}`)}>${iconImg(k)}${fmtN(n)}</span>`).join(' ');
    return `
    <div class="phead"><div><h2>${iconImg(d.ikon, 20)} ${st.ber?.namn ? `★ ${esc(st.ber.namn)}: ` : ''}${esc(d.namn)}</h2><p class="muted">${status}${st.q !== undefined ? ` ${kvMark(st, 12)} ${esc(kvText(st))}.` : ''} ${st.inne ? 'Står inne.' : d.inne ? 'Står ute, men bärs in när ett hus har plats.' : 'Står ute.'}</p>${st.ber ? `<p class="besk">${esc(sakBerattelse(s, st, d.namn))}</p>` : ''}${smuts ? `<p>${smuts}</p>` : ''}${fyllt}${d.pynt && klar ? `<p ${tip(`Pynt: ägaren trivs i rummet med det (humör +${Math.round(PYNT.glad[kvOf(st)] * 100)} %), och de som ser det där tycker bättre om hen. Ju finare det är, desto mer`)}>😊 +${Math.round(PYNT.glad[kvOf(st)] * 100)} % 🏺</p>` : ''}${agare ? `<p>Ägs av ${pLink(agare)}.</p>` : ''}${vem.length ? `<p class="muted">Byggd av ${vem.map(p => pLink(p)).join(', ')}.</p>` : ''}</div></div>
    ${bruk}
    ${st.k === 'scen' && fritidLista({ scen: st.id }) ? `<h3>Framträdanden här</h3>${fritidLista({ scen: st.id, antal: 10 })}` : ''}
    ${d.gor.length ? `<h3>Här görs</h3><dl class="kv">${d.gor.map(a => gorRad(a, !!d.bara?.includes(a))).join('')}</dl>` : ''}
    ${d.sover ? `<h3>Sovplats</h3><p class="muted">En sovplats. Den som sover här vilar upp sig fortare.</p>` : ''}
    ${d.platser ? `<h3>Platser</h3><p ${tip('Här äter man tillsammans och blir glad av det, och här samtalar man')}>${stubbar || `<span class="muted">${bordPlatser(st).length} stubbar när bordet är klart</span>`}</p>` : ''}
    ${tb ? `<h3>Tillbehör</h3><dl class="kv">${tb}</dl>` : ''}
    ${d.forvar ? `<h3>Förvaring</h3>${inne ? `<dl class="kv stk">${inne}</dl>` : '<p class="muted">tom</p>'}<p class="muted">${forvar}</p>` : ''}
    ${platser ? `<h3>Redskap</h3><dl class="kv">${platser}</dl>` : ''}
    <h3>Material</h3><p ${tip(`${d.min} minuters arbete. ${d.tek.length ? `Kräver ${d.tek.length > 1 ? 'någon av teknikerna' : 'tekniken'} ${d.tek.map(k => TEKNIK.find(q => q.id === k)?.namn ?? k).join(' eller ')}` : 'Kräver ingen teknik'}`)}>${av} <span class="muted">· ${d.min} min</span></p>
    ${testRad(st.id)}`;
  },
};
