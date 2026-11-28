import { DAY, HONS, HOUR, INDIVID, TAMDJUR, byId, tamArt, fahusOf, hageById, honsOf, iIstiden, kalender, tamAlder, tamNamn, tamEg, HO, hoI, hageVidVatten, bjornarOf, stridOf, djurOf, dragOf, fagelFlockar, faglarOf, grupperOf, halsaOf, kortTal, FLOCKARTER, flockGrupper, flockdjurOf, vargarOf } from '../../sim';
import { djurBild, hasIcon, iconCanvas, iconImg } from '../../ikoner';
import { bar, condBar, esc, pLink } from '../hjalp';
import { HONS_ID0, arHona, arTamt, djurSynliga, tamBild } from '../vaxter';
import { s, ui } from '../lage';
import type { Flik } from '../panel';

// ett djur (steg 3.7.13): öppnas genom att trycka på det på kartan. Egenskaperna som staplar, som människornas (Björn efter
// v159): namnet, stapeln och talet, och texten syns när man håller musen över raden. Stapeln för styrka och snabbhet är full
// för den starkaste och snabbaste av arten (artens värde plus spannet mellan individerna, INDIVID.spann)
// egenskapernas symboler (steg 11.14.1): styrkan musklen, snabbheten tassen, tåligheten skölden, modet svärdet och tamheten sin egen
const EG_SYM: Record<string, string> = { Styrka: 'kb_sym_muskel', Snabbhet: 'kb_sym_tass', Tålighet: 'kb_sym_skold', Mod: 'kb_sym_svard', Tamhet: 'tamhet' };
const rad = (namn: string, andel: number, varde: string, text: string, cls = '', sym = false) =>
  `<dt title="${esc(text)}">${sym ? namn : EG_SYM[namn] && hasIcon(EG_SYM[namn]) ? `<span aria-label="${esc(namn)}">${iconImg(EG_SYM[namn], 16)}</span>` : esc(namn)}</dt><dd title="${esc(text)}">${cls === 'cond' ? condBar(andel) : bar(andel, cls)}<span>${varde}</span></dd>`;
// porträttet på kortet (steg 9.2.51): det levande djuret från sidan, helt och i sina egna proportioner (bilden på kartan), aldrig
// den döda bilden, som bara är kadavret på kartan. Gånger två, högst 64 punkter brett
function levande(d: { art: string; id: number }) {
  const art = d.art as 'varg' | 'kanin' | 'radjur' | 'vildsvin' | 'bjorn' | 'bjornunge', k = ['varg', 'kanin', 'radjur', 'vildsvin', 'bjorn', 'bjornunge'].includes(art) ? djurBild(art, d.id, 'sida', iIstiden(kalender(s, ui.nu).ai)) : undefined;
  if (!k || !hasIcon(k)) return iconImg(d.art, 32);
  const c = iconCanvas(k), sk = Math.max(1, Math.min(4, Math.floor(64 / Math.max(c.width, c.height))));
  return `<img class="ikon" src="${c.toDataURL()}" width="${c.width * sk}" height="${c.height * sk}" alt="" style="image-rendering: pixelated">`;
}
// det tama djurets porträtt (steg 15.1.150): artens egen bild från sidan (tamBild, samma som på kartan), annars dess symbol
function tamPortratt(d: { id: number; art: string; born: number }) {
  const k = tamBild(d)('sida');
  if (!k) return iconImg(d.art, 32);
  const c = iconCanvas(k), sk = Math.max(1, Math.min(4, Math.floor(64 / Math.max(c.width, c.height))));
  return `<img class="ikon" src="${c.toDataURL()}" width="${c.width * sk}" height="${c.height * sk}" alt="" style="image-rendering: pixelated">`;
}
// rutornas rader: symbolen och värdet med texten när musen är över, jämförelsen med de flesta av arten och procenten
const rd = (sym: string, text: string, inre: string) => `<dt title="${esc(text)}">${sym}</dt><dd title="${esc(text)}">${inre}</dd>`;
const jfr = (v: number, bas: number) => v > bas * 1.08 ? 'mer än de flesta' : v < bas * 0.92 ? 'mindre än de flesta' : 'som de flesta';
const pr = (v: number) => `${Math.round(v * 100)} %`;
// ett tamt djur (hund, får eller get, steg 9.8.1): porträttet, och raderna med samma etiketter i ord som de vilda djuren (steg 11.1.59:
// Ålder, Mättnad, Vätska, Ägare, och Lojalitet, Ull, Mjölk och Plats); texten kommer fram när man håller musen över raden.
// Allt läses ur simuleringens värden (tamAlder, hagen och fähusen); inget räknas om här
function tamHtml() {
  const d = (s.tamdjur ?? []).find(x => x.id === ui.djurId && x.dog === undefined);
  if (!d) return '<p class="muted">Djuret finns inte längre.</p>';
  const a = TAMDJUR[d.art], alder = Math.floor(tamAlder(s, d)), q = byId(s, d.agare), hage = hageById(s, d.hage), fahus = d.fahus !== undefined ? fahusOf(s).find(h => h.id === d.fahus) : undefined;
  const ho = hage ? hoI(s, hage) : undefined;
  const plats = fahus ? rd('Plats', 'Står i fähuset under istiden', 'Fähuset') : hage ? rd('Plats', ho ? `Går i hagen och betar. Vattenhon har ${ho.vatten ?? 0} av ${HO.rymmer} vatten` : hageVidVatten(s, hage) ? 'Går i hagen och betar, och dricker vid stranden' : 'Går i hagen och betar', `Hagen ${hage.w} × ${hage.h}${ho ? ` · ${ho.vatten ?? 0}/${HO.rymmer}` : ''}`) : rd('🍃', 'Går lös och betar där det finns bete', 'Lös');
  return `
    <div class="phead">${tamPortratt(d)}<div><h2 class="rutrub" data-passa="12">${esc(tamNamn(d))}</h2></div></div>
    <dl class="kv">
      ${rd('Ålder', `${alder} år gammal. ${tamNamn(d)} lever högst ${a.liv} år`, `${alder} år`)}
      ${rad('Mättnad', 1 - d.hunger, pr(1 - d.hunger), d.hunger >= 1 ? 'Svälter' : d.hunger >= 0.5 ? 'Hungrig: behöver mat' : 'Mätt', d.hunger > 0.6 ? 'low' : '')}
      ${rad('Vätska', 1 - (d.torst ?? 0), d.torstTim ? `${Math.floor(d.torstTim)} h utan` : pr(1 - (d.torst ?? 0)), d.torstTim ? `Har inte fått vatten på ${Math.floor(d.torstTim)} timmar och ger ingen mjölk` : 'Vätskan: djuret dricker när den är slut, vid stranden, ur vattenhon eller snö', d.torstTim ? 'low' : 'skill', true)}
      ${rd('Ägare', d.agare !== undefined ? 'Ägaren. Djuret ärvs och matas av hen' : 'Byn äger djuret', q ? pLink(q) : d.agare !== undefined ? '–' : 'Byn')}
      ${d.art === 'hund' && d.lojal !== undefined ? rad('Lojalitet', d.lojal, pr(d.lojal), 'Lojalitet mot ägaren: växer när ägaren matar och är nära, sjunker när hen är långt borta och när hunden är hungrig', 'skill') : ''}
      ${tamArt(d.art).ull ? rad('Ull', d.ull ?? 0, pr(d.ull ?? 0), (d.ull ?? 0) >= 1 ? 'Ullen är full och kan klippas' : 'Ullen växer ut och klipps med kniven', 'skill') : ''}
      ${tamArt(d.art).mjolk ? rad('Mjölk', d.mjolk ?? 0, pr(d.mjolk ?? 0), (d.mjolk ?? 0) >= 1 ? 'Full av mjölk och kan mjölkas' : `Mjölken växer till, och ${tamArt(d.art).ord[3]} mjölkas två gånger om året`, 'skill') : ''}
      ${d.art !== 'hund' ? plats : ''}
      ${egRader(tamEg(d), tamEg({ art: d.art }), !!tamArt(d.art).styrka)}
    </dl>`;
}
// djurets egenskaper (steg 10.10.29): styrka och snabbhet (bara dragdjuren, där de ger lasset och farten), tålighet, mod och tamhet; stapeln är full för den bästa av arten, och texten kommer fram när man håller musen över raden
function egRader(e: { styrka: number; snabbhet: number; talighet: number; mod: number; tamhet: number }, bas: typeof e, drag: boolean) {
  const topp = 1 + INDIVID.spann;
  // samma etiketter i ord som de vilda djuren (steg 11.1.59); styrkan och snabbheten mot artens bästa
  const r = (namn: string, k: keyof typeof e, text: string) => { const v = k === 'mod' ? e.mod : e[k] / (bas[k] * topp), bast = k === 'styrka' || k === 'snabbhet'; return rad(namn, v, bast ? `${Math.round(v * 100)} % av artens bästa` : `${Math.round(e[k] / bas[k] * 100)} %`, `${text}, ${jfr(e[k], bas[k])} av arten`, 'skill'); };
  return (drag ? r('Styrka', 'styrka', 'Styrka: hur tungt lass släden tar') + r('Snabbhet', 'snabbhet', 'Snabbhet: hur fort släden går') : '')
    + r('Tålighet', 'talighet', 'Tålighet: hur länge djuret tål svält, kyla och stick') + r('Mod', 'mod', 'Mod: hur nära en fara kommer innan djuret flyr')
    + r('Tamhet', 'tamhet', 'Tamhet: hur fort det går att leda, mjölka, klippa och spänna för djuret');
}
// hönsflocken (steg 9.8.10): hur många hönor, ägaren och äggen om dygnet (inga i istiden)
function honsHtml() {
  const h = honsOf(s);
  if (!h) return '<p class="muted">Hönsen finns inte längre.</p>';
  const q = byId(s, h.agare), agg = iIstiden(kalender(s).ai) ? 0 : h.n * HONS.agg * (DAY / HOUR);
  return `
    <div class="phead">${levande({ art: 'fagel', id: HONS_ID0 })}<div><h2 class="rutrub" data-passa="12">Höns</h2></div></div>
    <dl class="kv">
      ${rd('Flock', 'Så många hönor går i flocken. De letar mat själva, så ingen matar dem', `${h.n} ${h.n === 1 ? 'höna' : 'hönor'}`)}
      ${rd('Ägare', h.agare !== undefined ? 'Ägaren. Äggen blir hens' : 'Byn äger flocken', q ? pLink(q) : h.agare !== undefined ? '–' : 'Byn')}
      ${rd('Ägg', agg === 0 ? 'Inga ägg i istiden' : 'Ägg om året: ett per höna, utom i istiden', `${kortTal(agg)} ägg/år`)}
    </dl>`;
}
function djurHtml() {
  if (arHona(ui.djurId)) return honsHtml();
  if (arTamt(ui.djurId)) return tamHtml();
  const d = djurSynliga().find(x => x.id === ui.djurId) ?? [...djurOf(s, ui.nu), ...flockdjurOf(s, ui.nu), ...faglarOf(s, ui.nu), ...bjornarOf(s, ui.nu), ...vargarOf(s)].find(x => x.id === ui.djurId);
  if (!d) return '<p class="muted">Djuret syns inte längre här.</p>';
  const art = stridOf(d.art), drag = dragOf(d.art, d.id), h = halsaOf(s, d.id), g = d.art === 'kanin' ? grupperOf(s, ui.nu).find(x => x.id === d.grupp) : FLOCKARTER[d.art] ? flockGrupper(s, FLOCKARTER[d.art], ui.nu).find(x => x.id === d.grupp) : d.art === 'fagel' ? fagelFlockar(s, ui.nu).find(x => x.id === d.grupp) : undefined;
  const f = d.art === 'varg' ? s.vargar?.find(x => x.id === d.grupp) : undefined, topp = 1 + INDIVID.spann;
  return `
    <div class="phead">${levande(d)}<div><h2 class="rutrub" data-passa="12">${esc(art.art)}</h2></div></div>
    <dl class="kv">
      ${rad('Ålder', drag.alder / art.alder, `${drag.alder} år`, `${drag.alder} år gammal. Arten blir högst ${art.alder} år.`)}
      ${rad('Styrka', drag.styrka / (art.styrka * topp), `${Math.round(drag.styrka / (art.styrka * topp) * 100)} % av artens bästa`, `Styrka ${kortTal(drag.styrka)}, ${jfr(drag.styrka, art.styrka)}`)}
      ${rad('Snabbhet', drag.snabbhet / (art.fart * topp), `${Math.round(drag.snabbhet / (art.fart * topp) * 100)} % av artens bästa`, `Snabbhet ${kortTal(drag.snabbhet)}, ${jfr(drag.snabbhet, art.fart)}${drag.alder / art.alder > 0.7 ? '. Den är gammal och har blivit långsammare' : ''}`)}
      ${rad('Tålighet', drag.talighet / topp, pr(drag.talighet), 'Hur mycket skador och svält den tål', 'skill')}
      ${rad('Hälsa', h.blod, pr(h.blod), h.sar > 0 ? 'Skadad: blodet och såren läker med tiden' : 'Frisk', 'cond')}
      ${h.sar > 0 ? `<dt title="Summan av såren. De läker med tiden">Sår</dt><dd title="Summan av såren. De läker med tiden"><span>${kortTal(h.sar)}</span></dd>` : ''}
      ${rad('Mod', drag.mod, pr(drag.mod), d.art === 'varg' ? 'Hur modig vargen är. Flocken blir modigare ju fler den är, och den flyr när en varg faller eller ledarvargen dör' : 'Hur modig den är. Den skygga märker den som smyger tidigt och flyr', 'skill')}
      ${rad('Tamhet', 0, '0 %', 'Ett vilt djur är inte tamt alls', 'skill')}
      ${f ? rad('Mättnad', 1 - f.hunger, pr(1 - f.hunger), 'Flockens mättnad: full stapel är mätt. En hungrig flock jagar harar, smyger till förrådet på natten och kan anfalla den som är ensam', f.hunger > 0.6 ? 'low' : '') : ''}
      ${f ? `<dt>Flock</dt><dd title="${esc(f.vargar.length > 1 ? `Flocken har ${f.vargar.length} vargar${f.vargar[0] === d.id ? '. Den här är ledarvargen' : ''}` : 'En ensam varg')}"><span>${f.vargar.length} ${f.vargar.length === 1 ? 'varg' : 'vargar'}</span></dd>` : ''}
      ${g ? (gr => `<dt>Grupp</dt><dd title="Gruppen har ${g.n} ${gr} just nu"><span>${g.n} ${gr}</span></dd>`)(FLOCKARTER[d.art] ? FLOCKARTER[d.art].namn.toLowerCase() : d.art === 'fagel' ? (g.n === 1 ? 'fågel' : 'fåglar') : g.n === 1 ? 'hare' : 'harar') : ''}
    </dl>`;
}
export const djur: Flik = { namn: 'Djuret', knapp: 'person', html: djurHtml };
