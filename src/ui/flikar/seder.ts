import { MAKT_SEDER, SEDER, SED_LIST, type Sed, ageOf, roster, sedDrag, sedOppen, upplevelseKort, yrkeNamn } from '../../sim';
import { tecknet } from '../../ikoner';
import { esc, hjalpKnapp, hjalpText, pLink } from '../hjalp';
import { s } from '../lage';
import type { Flik } from '../panel';
import { vagSvg } from '../framsteg';

// byns seder: vad invånarna tillsammans tycker är viktigt, och vem som väger tyngst
export const seder: Flik = {
  namn: 'Seder',
  html() {
    const sd = s.seder;
    const voices = roster(s).slice(0, 5); // med ledarens extra vikt (steg 4.5.4.10)
    return `<div class="tekhead">${hjalpKnapp('seder', 'Vad är seder?')}</div>
    ${hjalpText('seder', '<p class="muted">Byns seder är vad invånarna tillsammans tycker är viktigt. Var och en drar dem efter sin personlighet och det hen varit med om. Äldre och karismatiska röster väger tyngst. Sederna påverkar vad var och en väljer att göra.</p>')}
    <ul class="seder">${SED_LIST.filter(k => sedOppen(s, k) && !MAKT_SEDER.includes(k)).map(k => `<li title="${esc(SEDER[k].effect)}">${sedVag(sd.v[k], SEDER[k].neg, SEDER[k].pos)}${sedFormat(k)}
      ${hjalpText('seder', `<p class="muted small">${SEDER[k].effect}</p><p class="muted small">Under vågen: det invånarna varit med om som drar seden, med pilar åt det håll det drar (fler pilar drar mer) och hur många som minns det.</p>`)}</li>`).join('')}</ul>
    <h3>Tyngsta röster</h3>${voices.length ? `<ul class="rels">${voices.map(x => `<li>${pLink(x.p)}<span>${esc(yrkeNamn(s, x.p) ?? '')}</span><span class="muted">${Math.floor(ageOf(x.p, s.now))} år</span><span title="Andel av byns röst i sederna">${Math.round(x.andel * 100)} %</span></li>`).join('')}</ul>` : '<p class="muted">–</p>'}
`;
  },
};

// en sed som köpmansvåg (steg 5.3.3.3, ritad som i bildstilen sedan steg 6.9.9): varje steg från mitten är en vikt i skålen på
// den sidan, högst VIKTER, och den tunga skålen sjunker. Orden står vid ändarna, stora nog att väga upp vågen
const VIKTER = 5;
// långa ord delas vid sammansättningen med ett mjukt bindestreck, som i skissen (Själv-försörjning)
const bryt = (o: string) => o.replace(/^(Själv|Samman|Gemen)(?=\S{5})/, '$1&shy;');
export function sedVag(v: number, neg = '', pos = '') {
  const n = Math.min(VIKTER, Math.round(Math.abs(v) * VIKTER));
  return `<div class="sedvag"><span class="sedord">${bryt(neg)}</span><span class="vag" role="img" aria-label="${n ? `${n} av ${VIKTER} åt ${v < 0 ? 'vänster' : 'höger'}` : 'i jämvikt'}">${vagSvg(n, v < 0 ? -1 : 1)}</span><span class="sedord">${bryt(pos)}</span></div>`;
}
export function sedBar(v: number) {
  const w = Math.round(Math.abs(v) * 50);
  return `<span class="sbar"><span style="${v >= 0 ? `left:50%;width:${w}%` : `left:${50 - w}%;width:${w}%`}"></span></span>`;
}

// det som format seden k (steg 9.2.5): de upplevelser invånarna minns som drar den, under vågen. Symbolen, en till tre pilar åt
// det håll den drar (fler drar mer) och hur många som minns; texten när musen är över. Symbolerna är de som redan finns
const UPP_IKON: Partial<Record<string, string>> = {
  skadad: 's_skarsar', svalt: 's_mat', frys: 's_kall', svamp: 'spindling', sjuk: 's_inf', foralder: 's_dod', syskon: 's_dod', sagDod: 'dodkropp',
  foraldralos: 's_dod', skilsmassa: 'b_skam', gral: 'r_rival', syskonFodd: 's_barn', bestulen: 'i_tjuv', tjuv: 'i_tjuv', hardVinter: 'm_hardVinter',
  torka: 'm_torka', tornado: 'm_tornado', brand: 'tro_brand', oversvamning: 'm_oversvamning', lek: 'a_leka', bastaVan: 'r_bast', mentor: 'r_mentor',
  uppfinning: 'i_skicklig', trygg: 'r_naravan', slagen: 's_krossar', slagenIgen: 's_krossar', barnDod: 's_dod', ledFramgang: 'ledarskap',
  ledFordarv: 'b_skam', drabbad: 'l_fara', vargbett: 'varg', fallde: 'yxa', usla: 'i_klapare', perfekta: 'i_skicklig', egenTeknik: 'i_skicklig',
  raddade: 'a_varda', raddad: 'a_varda', dodade: 'i_valdsam', ranad: 'rovare', lamnad: 'b_skam', oknamn: 'b_skam', hedersnamn: 'b_heder',
  holdBarn: 's_barn', flyttade: 'i_okand', barnFott: 's_barn', gammal: 'i_legend', bonHjalpte: 'a_be', bonInte: 'a_be', tecken: 'tro_blixt',
  byggdeHus: 'a_bygga', forstaMastare: 'i_skicklig', overflod: 'a_gott', sorjde: 's_dod',
};
export function sedFormat(k: Sed) {
  const rader = sedDrag(s).filter(r => Math.abs(r.d[k]) >= 0.005).sort((a, b) => Math.abs(b.d[k]) - Math.abs(a.d[k])).slice(0, 5);
  if (!rader.length) return '';
  return `<div class="sedformat">${rader.map(r => {
    const d = r.d[k], m = Math.abs(d), pil = (d > 0 ? '→' : '←').repeat(m >= 0.15 ? 3 : m >= 0.05 ? 2 : 1), mot = d > 0 ? SEDER[k].pos : SEDER[k].neg;
    const text = `${upplevelseKort(r.k)}: drar mot ${mot.toLowerCase()} (${Math.max(1, Math.round(m * 100))} av 100), ${r.n} ${r.n === 1 ? 'minns' : 'minns'} det`;
    return `<span class="sedupp" title="${esc(text)}">${tecknet(UPP_IKON[r.k] ?? 'i_okand', '•')}<b>${pil}</b><span class="muted">${r.n}</span></span>`;
  }).join('')}</div>`;
}
