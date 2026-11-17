import { MAKT_SEDER, SEDER, SED_LIST, type Sed, ageOf, byId, roster, sedDrag, sedLaggning, sedOppen, sederTarget, upplevelseKort, yrkeNamn } from '../../sim';
import { tecknet } from '../../ikoner';
import { esc, fallUt, hjalpKnapp, hjalpOppen, hjalpText, pLink } from '../hjalp';
import { s } from '../lage';
import type { Flik } from '../panel';
import { vagSvg } from '../framsteg';

// byns seder: vad invånarna tillsammans tycker är viktigt, och vem som väger tyngst
export const seder: Flik = {
  namn: 'Seder',
  html() {
    const sd = s.seder, mal = sederTarget(s);
    const voices = roster(s).slice(0, 5); // med ledarens extra vikt (steg 4.5.4.10)
    return `<div class="tekhead">${hjalpKnapp('seder', 'Vad är seder?')}</div>
    ${hjalpText('seder', '<p class="muted">Byns seder är vad invånarna tillsammans tycker är viktigt. Var och en drar dem efter sin personlighet och det hen varit med om. Äldre och karismatiska röster väger tyngst. Sederna påverkar vad var och en väljer att göra.</p><p class="muted small">Under vågen står det som drar seden: invånarnas läggning och det de varit med om, med pilar åt det håll det drar (fler pilar drar mer) och hur många som minns det. Tryck på en sed för hela listan och vad seden gör.</p>')}
    <ul class="seder">${SED_LIST.filter(k => sedOppen(s, k) && !MAKT_SEDER.includes(k)).map(k => `<li ${sedKlick(k)}>${sedVag(sd.v[k], SEDER[k].neg, SEDER[k].pos, mal[k])}${sedFormat(k)}${sedLista(k)}</li>`).join('')}${SED_LIST.filter(k => !sedOppen(s, k) && !MAKT_SEDER.includes(k)).map(k => lastSed(`${SEDER[k].neg} – ${SEDER[k].pos}`)).join('')}</ul>
    <h3>Störst inflytande</h3>${voices.length ? `<ul class="rels">${voices.map(x => `<li>${pLink(x.p)}<span>${esc(yrkeNamn(s, x.p) ?? '')}</span><span class="muted">${Math.floor(ageOf(x.p, s.now))} år</span><span title="Andel av inflytandet över byns seder">${Math.round(x.andel * 100)} %</span></li>`).join('')}</ul>` : '<p class="muted">–</p>'}
`;
  },
};

// en sed som köpmansvåg (steg 5.3.3.3, ritad som i bildstilen sedan steg 6.9.9): varje steg från mitten är en vikt i skålen på
// den sidan, högst VIKTER, och den tunga skålen sjunker. Orden står vid ändarna, stora nog att väga upp vågen
const VIKTER = 5;
// långa ord delas vid sammansättningen med ett mjukt bindestreck, som i skissen (Själv-försörjning)
const bryt = (o: string) => o.replace(/^(Själv|Samman|Gemen)(?=\S{5})/, '$1&shy;');
// vart vågen är på väg (steg 11.1.12): när det som drar (mal, byns mål) pekar åt ett annat håll än vågen lutar, eller mycket
// längre, står en liten pil vid vågen åt det hållet. Skillnaden som räcker är en halv vikt
const PIL_SKILLNAD = 0.5 / VIKTER;
export function sedVag(v: number, neg = '', pos = '', mal?: number) {
  const n = Math.min(VIKTER, Math.round(Math.abs(v) * VIKTER));
  const d = mal === undefined ? 0 : mal - v, pil = Math.abs(d) >= PIL_SKILLNAD
    ? `<span class="sedmot" title="${esc(`På väg mot ${(d > 0 ? pos : neg).replace(/&shy;/g, '').toLowerCase()}: det som drar seden pekar dit, men sederna rör sig långsamt, så vågen följer efter en tid`)}">${d > 0 ? '→' : '←'}</span>` : '';
  return `<div class="sedvag"><span class="sedord">${bryt(neg)}</span><span class="vag" role="img" aria-label="${n ? `${n} av ${VIKTER} åt ${v < 0 ? 'vänster' : 'höger'}` : 'i jämvikt'}">${d < 0 ? pil : ''}${vagSvg(n, v < 0 ? -1 : 1)}${d > 0 ? pil : ''}</span><span class="sedord">${bryt(pos)}</span></div>`;
}
export function sedBar(v: number) {
  const w = Math.round(Math.abs(v) * 50);
  return `<span class="sbar"><span style="${v >= 0 ? `left:50%;width:${w}%` : `left:${50 - w}%;width:${w}%`}"></span></span>`;
}

// det som format seden k (steg 9.2.5): de upplevelser invånarna minns som drar den, under vågen. Symbolen, en till tre pilar åt
// det håll den drar (fler drar mer) och hur många som minns; texten när musen är över. Symbolerna är de som redan finns
const UPP_IKON: Partial<Record<string, string>> = {
  skadad: 's_skarsar', svalt: 's_mat', frys: 's_kall', svamp: 'spindling', sjuk: 's_inf', foralder: 's_dod', syskon: 's_dod', sagDod: 'dodkropp', sagSkandad: 'skandad',
  foraldralos: 's_dod', skilsmassa: 'b_skam', gral: 'r_rival', syskonFodd: 's_barn', bestulen: 'i_tjuv', tjuv: 'i_tjuv', hardVinter: 'm_hardVinter',
  torka: 'm_torka', tornado: 'm_tornado', brand: 'tro_brand', oversvamning: 'm_oversvamning', lek: 'a_leka', bastaVan: 'r_bast', mentor: 'r_mentor',
  uppfinning: 'i_skicklig', trygg: 'r_naravan', slagen: 's_krossar', slagenIgen: 's_krossar', barnDod: 's_dod', ledFramgang: 'ledarskap',
  ledFordarv: 'b_skam', drabbad: 'l_fara', vargbett: 'varg', fallde: 'yxa', usla: 'i_klapare', perfekta: 'i_skicklig', egenTeknik: 'i_skicklig',
  raddade: 'a_varda', raddad: 'a_varda', dodade: 'i_valdsam', ranad: 'rovare', lamnad: 'b_skam', oknamn: 'b_skam', hedersnamn: 'b_heder',
  holdBarn: 's_barn', flyttade: 'i_okand', barnFott: 's_barn', gammal: 'i_legend', bonHjalpte: 'a_be', bonInte: 'a_be', tecken: 'tro_blixt',
  byggdeHus: 'a_bygga', forstaMastare: 'i_skicklig', overflod: 'a_gott', sorjde: 's_dod',
};
// raden är en upplevelse eller minnet av en död (steg 10.4.9)
// invånarnas läggning (steg 11.1.11) är en rad som upplevelserna: personligheten, och föräldraskapet där det räknas
type Rad = { k?: string; om?: { id: number; namn: string; i: string }; lagg?: true; n: number; vem: number[]; d: Record<Sed, number> };
const radNamn = (r: Rad) => r.lagg ? 'Invånarnas läggning' : r.om ? `Minnet av ${r.om.namn}` : upplevelseKort(r.k! as never);
const radIkon = (r: Rad) => r.om ? 'i_' + r.om.i : UPP_IKON[r.k!] ?? 'i_okand';
const radTecken = (r: Rad) => r.lagg ? '{sym_egenskaper}' : tecknet(radIkon(r), '•');
// allt som drar seden: läggningen först, sedan upplevelserna och minnena, så att raderna tillsammans är det vågen går mot
function sedRader(): Rad[] {
  const l = sedLaggning(s), vuxna = roster(s).filter(x => x.w > 0).map(x => x.p.id);
  return [{ lagg: true, n: vuxna.length, vem: vuxna, d: l }, ...sedDrag(s)];
}
export function sedFormat(k: Sed) {
  const alla = sedRader().filter(r => Math.abs(r.d[k]) >= 0.005), rader = alla.slice().sort((a, b) => +!!b.lagg - +!!a.lagg || Math.abs(b.d[k]) - Math.abs(a.d[k])).slice(0, 5);
  if (!rader.length) return '';
  return `<div class="sedformat">${rader.map(r => {
    const d = r.d[k], m = Math.abs(d), pil = (d > 0 ? '→' : '←').repeat(m >= 0.15 ? 3 : m >= 0.05 ? 2 : 1), mot = d > 0 ? SEDER[k].pos : SEDER[k].neg;
    const text = `${radNamn(r)}: drar mot ${mot.toLowerCase()} (${Math.max(1, Math.round(m * 100))} av 100)${r.lagg ? '' : `, ${r.n} ${r.n === 1 ? 'minns' : 'minns'} det`}`;
    return `<span class="sedupp" title="${esc(text)}">${radTecken(r)}<b>${pil}</b><span class="muted">${r.n}</span></span>`;
  }).join('')}</div>`;
}

// en sed går att trycka på (steg 9.2.66): ett tryck öppnar en lista under vågen med vad seden gör och en rad per upplevelse som
// drar den: symbolen, namnet, åt vilket håll och hur mycket den drar, och hur många och vilka som minns den. Ett tryck till stänger.
// Samma i Seder och i Styres vågskålar; en sed i taget är öppen (gruppen sed-)
// en sed som inte är upplåst (steg 11.1.14): en grå rad sist, likadant i Seder och Styre, utan att säga när den kommer
export const lastSed = (namn: string) => `<li class="muted lastsed" title="Inte upplåst än">❔ ${esc(namn)}</li>`;
export const sedKlick = (k: Sed) => `class="klick falla" ${fallUt(`sed-${k}`, 'sed-')} title="${esc(SEDER[k].effect)}"`;
export function sedLista(k: Sed) {
  if (!hjalpOppen(`sed-${k}`)) return '';
  const rader = sedRader().filter(r => Math.abs(r.d[k]) >= 0.005).sort((a, b) => +!!b.lagg - +!!a.lagg || Math.abs(b.d[k]) - Math.abs(a.d[k]));
  const rad = (r: (typeof rader)[number]) => {
    const d = r.d[k], mot = (d > 0 ? SEDER[k].pos : SEDER[k].neg).toLowerCase(), vem = r.vem.map(id => byId(s, id)).filter(p => !!p);
    return `<li>${radTecken(r)}<span><b>${esc(radNamn(r))}</b>: drar mot ${esc(mot)}, ${Math.max(1, Math.round(Math.abs(d) * 100))} av 100. <span class="muted">${r.lagg ? 'Personligheten hos dem som har inflytande, och föräldraskapet där det räknas' : `${r.n} minns det: ${vem.map(p => pLink(p)).join(', ')}`}</span></span></li>`;
  };
  return `<div class="sedlista"><p class="muted small">${esc(SEDER[k].effect)}</p>${rader.length ? `<ul>${rader.map(rad).join('')}</ul>` : '<p class="muted small">Inget som invånarna varit med om drar den här seden just nu.</p>'}</div>`;
}
