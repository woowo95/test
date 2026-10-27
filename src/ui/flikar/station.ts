import { ACTS, DJURARTER, MIN, TEKNIK, TILLBEHOR_LIST, byId, isKlar, sakNamn, slagIkon, stationById, stationDef, tillbehorDef, tingOf, timeLabel } from '../../sim';
import { iconImg } from '../../ikoner';
import { condBar, esc, fmtN, pLink } from '../hjalp';
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
    const status = klar ? (st.klar !== undefined ? `Klar ${esc(timeLabel(s, st.klar))}.` : 'Klar.') : `Byggs: ${Math.round(100 - st.kvar / (d.min * MIN) * 100)} %.`;
    const knivar = tingOf(s).filter(k => k.vid === st.id);
    const platser = d.kniv ? Array.from({ length: d.kniv }, (_, i) => {
      const k = knivar[i];
      if (!k) return `<dt ${tip('Tom knivplats: byn gör en ny kniv')}>${iconImg('kniv')}</dt><dd class="muted">tom</dd>`;
      const var_ = k.hos !== undefined ? `används av ${pLink(byId(s, k.hos))}` : k.lass !== undefined ? 'bärs' : 'ligger här';
      return `<dt ${tip(`Bänkens kniv, skick ${Math.round(k.c * 100)} %`)}>${iconImg('kniv')}</dt><dd>${condBar(k.c)} ${var_}</dd>`;
    }).join('') : '';
    // tillbehören som hör till den (TILLBEHOR i stationer.ts): det som ligger i den, och det som saknas
    const tb = TILLBEHOR_LIST.filter(k => tillbehorDef(k)!.till === st.k).map(k => {
      const td = tillbehorDef(k)!, har = !!st.med?.includes(k);
      return `<dt ${tip(td.namn + (td.varme ? `: den som sover här kyls ${Math.round(td.varme * 100)} % mindre` : ''))}>${iconImg(td.ikon)}</dt><dd${har ? '' : ' class="muted"'}>${esc(td.namn)}${har ? '' : ', saknas'}</dd>`;
    }).join('');
    const av = Object.entries(d.av).map(([k, n]) => `<span ${tip(`${fmtN(n)} ${sakNamn(k).toLowerCase()}`)}>${iconImg(k)}${fmtN(n)}</span>`).join(' ');
    return `
    <div class="phead"><div><h2>${iconImg(d.ikon, 20)} ${esc(d.namn)}</h2><p class="muted">${status} ${st.inne ? 'Står inne.' : 'Står ute.'}</p>${vem.length ? `<p class="muted">Byggd av ${vem.map(p => pLink(p)).join(', ')}.</p>` : ''}</div></div>
    ${d.gor.length ? `<h3>Här görs</h3><dl class="kv">${d.gor.map(a => gorRad(a, !!d.bara?.includes(a))).join('')}</dl>` : ''}
    ${d.sover ? `<h3>Sovplats</h3><p class="muted">En sovplats. Den som sover här vilar upp sig fortare.</p>` : ''}
    ${tb ? `<h3>Tillbehör</h3><dl class="kv">${tb}</dl>` : ''}
    ${platser ? `<h3>Knivplatsen</h3><dl class="kv">${platser}</dl>` : ''}
    <h3>Material</h3><p ${tip(`${d.min} minuters arbete. Kräver ${d.tek.length > 1 ? 'någon av teknikerna' : 'tekniken'} ${d.tek.map(k => TEKNIK.find(q => q.id === k)?.namn ?? k).join(' eller ')}`)}>${av} <span class="muted">· ${d.min} min</span></p>`;
  },
};
