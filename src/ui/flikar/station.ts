import { ACTS, DJURARTER, STATION, bordPlatser, pilesOf, living, TEKNIK, TILLBEHOR_LIST, byId, isKlar, sakNamn, slagIkon, stationById, stationDef, stationKlar, tillbehorDef, tingOf, timeLabel, isTool, FLACKAR, smutsVid, blodVid, storlekAv, TORK, torrDel, BRASA } from '../../sim';
import { iconImg } from '../../ikoner';
import { sakAttr } from './sak';
import { condBar, esc, fmtN, kvMark, kvText, pLink } from '../hjalp';
import { s, ui } from '../lage';
import type { Flik } from '../panel';

// en station eller möbel (stationer.ts): öppnas genom att trycka på den på kartan. Allt står i registret STATIONER, så en
// ny station får samma ruta av sig själv. Symbolerna först; namnen när musen är över
const tip = (t: string) => `title="${esc(t)}" aria-label="${esc(t)}"`;
// det som görs vid stationen: djuret och det det blir (DJUR i redskap.ts), annars handlingens symbol
function gorRad(a: keyof typeof ACTS, bara: boolean) {
  const art = DJURARTER.find(d => d.act === a), sl = ACTS[a].slag, px = sl && slagIkon(sl);
  const vad = art ? `${iconImg(art.sak)} → ${Object.keys(art.slakt).map(k => iconImg(k)).join('')}` : px ? iconImg(px) : '';
  const om = art ? `${ACTS[a].namn}: ${sakNamn(art.sak).toLowerCase()} blir ${Object.keys(art.slakt).map(k => sakNamn(k).toLowerCase()).join(', ')}` : ACTS[a].namn;
  return `<dt ${tip(om + (bara ? '. Görs bara här' : ''))}>${vad}</dt><dd>${esc(ACTS[a].namn)}${bara ? ' <span class="muted">bara här</span>' : ''}</dd>`;
}
export const station: Flik = {
  namn: 'Stationen',
  knapp: 'person',
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
    const inne = st.ag !== undefined ? tingOf(s).filter(k => k.vid === st.id).map(k => `<span class="tryck" data-sak="t:${k.id}" ${tip(`${sakNamn(k.k)}, skick ${Math.round(k.c * 100)} %`)}>${iconImg(k.k)}</span>`).join(' ')
      : har.map(a => `<span class="tryck" ${sakAttr(a)} ${tip(`${sakNamn(a.k)}: ${fmtN(a.n)} av ${fmtN(a.max)}`)}>${iconImg(a.k)}${isTool(a.k) ? '' : fmtN(a.n)}</span>`).join(' ');
    // smutsen (steg 2.7.1): blodet vid slaktbänken, som bleknar på ett par dygn. Bara utseende
    const { w: bw, h: bh } = storlekAv(st), bv = blodVid(s, st, bw, bh);
    const smuts = (bv > 0 ? `<span ${tip(`Blod runt omkring, ${Math.round(bv * 100)} % färskt. Det bleknar bort på ett par dygn`)}>🩸 ${Math.round(bv * 100)} %</span> ` : '') + Object.entries(smutsVid(s, st)).filter(([, v]) => v > 0).map(([k, v]) => { const fd = (FLACKAR as Record<string, { namn: string; bleknar: number }>)[k]; return fd ? `<span ${tip(`${fd.namn} runt omkring, ${Math.round(v * 100)} %. Det bleknar bort på ${Math.round(fd.bleknar / 24)} dygn`)}>· ${Math.round(v * 100)} %</span>` : ''; }).join(' ');
    // latrinen (steg 2.7.2): hur full den är. När den är full fylls den igen och byn gräver en ny
    // det som hänger på torkställningen (steg 2.8.2): råvaran, hur mycket och hur långt torkningen kommit
    const hanger = (st.tork ?? []).map(q => `<span ${tip(`${fmtN(q.n)} ${sakNamn(q.k).toLowerCase()}, torkat till ${Math.round(torrDel(s, q) * 100)} % av ${TORK.dygn} dygn`)}>${iconImg(q.k)} ${Math.round(torrDel(s, q) * 100)} %</span>`).join(' ');
    const fyllt = (hanger ? `<p>${hanger}</p>` : '') + (d.gor.includes('toa') && klar ? `<p ${tip(`Fylld till ${Math.round((st.fyllt ?? 0) * 100)} %. När den är full fylls den igen med jord, och byn gräver en ny`)}>${iconImg('latrin')} ${Math.round((st.fyllt ?? 0) * 100)} %</p>` : '');
    // brasan (steg 2.9.1): elden i den och de som sover närmast den
    const be = d.brasa && klar ? st.eld : undefined, bfolk = (be?.folk ?? []).map(id => byId(s, id)).filter(p => p);
    const brasa = d.brasa && klar ? `<h3>Eld</h3><p ${tip(be?.lit ? `Brinner, ${fmtN(be.fuel)} timmar ved kvar` : 'Släckt. Den tänds med en brand från lägerelden')}>${iconImg('brasa')} ${be?.lit ? `🔥 ${fmtN(be.fuel)} h` : '<span class="muted">släckt</span>'}</p>`
      + `<p ${tip(`De som sover närmast den. När ingen gör det och den är släckt tas den isär efter ${BRASA.tomDygn} dygn, och stenarna läggs i en hög`)}>${bfolk.length ? bfolk.map(p => pLink(p)).join(' ') : '<span class="muted">ingen sover nära</span>'}</p>` : '';
    const av = Object.entries(d.av).map(([k, n]) => `<span ${tip(`${fmtN(n)} ${sakNamn(k).toLowerCase()}`)}>${iconImg(k)}${fmtN(n)}</span>`).join(' ');
    return `
    <div class="phead"><div><h2>${iconImg(d.ikon, 20)} ${esc(d.namn)}</h2><p class="muted">${status}${st.q !== undefined ? ` ${kvMark(st, 12)} ${esc(kvText(st))}.` : ''} ${st.inne ? 'Står inne.' : d.inne ? 'Står ute, men bärs in när ett hus har plats.' : 'Står ute.'}</p>${smuts ? `<p>${smuts}</p>` : ''}${fyllt}${agare ? `<p>Ägs av ${pLink(agare)}.</p>` : ''}${vem.length ? `<p class="muted">Byggd av ${vem.map(p => pLink(p)).join(', ')}.</p>` : ''}</div></div>
    ${d.gor.length ? `<h3>Här görs</h3><dl class="kv">${d.gor.map(a => gorRad(a, !!d.bara?.includes(a))).join('')}</dl>` : ''}
    ${d.sover ? `<h3>Sovplats</h3><p class="muted">En sovplats. Den som sover här vilar upp sig fortare.</p>` : ''}
    ${d.platser ? `<h3>Platser</h3><p ${tip('Här äter man tillsammans och blir glad av det, och här samtalar man')}>${stubbar || `<span class="muted">${bordPlatser(st).length} stubbar när bordet är klart</span>`}</p>` : ''}
    ${brasa}
    ${tb ? `<h3>Tillbehör</h3><dl class="kv">${tb}</dl>` : ''}
    ${d.forvar ? `<h3>Förvaring</h3><p>${inne || '<span class="muted">tom</span>'}</p><p class="muted">${forvar}</p>` : ''}
    ${platser ? `<h3>Redskap</h3><dl class="kv">${platser}</dl>` : ''}
    <h3>Material</h3><p ${tip(`${d.min} minuters arbete. ${d.tek.length ? `Kräver ${d.tek.length > 1 ? 'någon av teknikerna' : 'tekniken'} ${d.tek.map(k => TEKNIK.find(q => q.id === k)?.namn ?? k).join(' eller ')}` : 'Kräver ingen teknik'}`)}>${av} <span class="muted">· ${d.min} min</span></p>`;
  },
};
