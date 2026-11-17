import { hp, rovarna, KLAN, KLAN_ROLLER, VAPEN, amountOf, isTool, nTools, instText, klanerOf, living, sakNamn, timeLabel } from '../../sim';
import { iconImg, tecknet } from '../../ikoner';
import { delRad, esc, hjalpKnapp, hjalpText, kronikaLank, omUngefar, pLink } from '../hjalp';
import { s, ui } from '../lage';
import type { Flik } from '../panel';

// grannklanerna (steg 4.4.3, klaner.ts), en del i stenen Omvärlden (steg 9.3.3): en lista utan karta (världskartan är steg 11.1.3). Namn, var de bor, hur många de
// är, hur många som kan slåss, hur mycket de har, hur de ser på byn och de namngivna personerna. Texten syns med musen över
const ROLL_IKON: Record<string, string> = { hovding: 'ledarskap', handlare: 'handlare', aldste: 'i_legend', jagare: 'i_vargdodare', grundare: 'i_rik' };
// klanens hållning mot byn (steg 11.1.39): en stapel från mitten, som vågarna i Seder, rost åt det fientliga hållet och grönt åt
// det vänliga, så att fientlig inte ser ut som lite
const hallBar = (v: number) => { const w = Math.round(Math.min(1, Math.abs(v) / 100) * 50); return `<span class="sbar hall${v < 0 ? ' neg' : ''}"><span style="${v >= 0 ? `left:50%;width:${w}%` : `left:${50 - w}%;width:${w}%`}"></span></span>`; };
// vad hållningen är, vad som ändrar den och vad vakten gör (?-knappen i fliken)
const hallText = () => `<p class="muted small">Hållningen är hur klanen ser på byn, från fientlig till vänner. Den blir vänligare när byn byter med klanens handlare och när en främling från klanen får stanna, och fientligare när handlaren märker att byn lurat hen, när en främling visas bort och när klanens rövare dör vid byn. Med åren glöms det, och hållningen går tillbaka mot det neutrala.</p>
  <p class="muted small">En klan som är för fientlig skickar ingen handlare, och rövarna kommer från den klan som tycker sämst om byn. Vakten håller sig vaken om natten och väcker byn när rövare kommer.</p>`;
function grannarHtml() {
  const k = klanerOf(s);
  if (!k.length) return '<p class="muted">Byn känner inga grannar.</p>';
  // en ruta per klan med namnet överst i mitten, som påbuden i Styre (steg 4.5.4.2)
  return `<div class="rutor">${k.map(c => {
    const t = instText(c.inst);
    const folk = `Så många är de: ${c.folk}, barn och gamla medräknade`, slass = `Så många av dem kan slåss: ${c.styrka}`;
    const rik = `Så mycket har de: ${c.resurser}, räknat som byns rikedom (ungefär arbetstimmar)`;
    const hall = `Hur de ser på byn: ${t} (${c.inst} av −100 till 100)${c.inst < KLAN.handelMin ? '. De skickar ingen handlare' : ''}`;
    const per = c.personer.map(p => `<li title="${esc(`${KLAN_ROLLER[p.roll]?.namn ?? p.roll}: ${p.namn}`)}">${iconImg(ROLL_IKON[p.roll] ?? '', 12)} ${esc(p.namn)}</li>`).join('');
    return `<div class="ruta"><div class="rutnamn" title="${esc(`${c.namn} bor vid ${c.hem}${c.utbrytare ? '. Grundad av några som lämnade byn' : ''}`)}"><b>${esc(c.namn)}</b><div class="small muted">${esc(c.hem)}</div></div>
    <dl class="kv smal">
      <dt title="${esc(folk)}">👥</dt><dd title="${esc(folk)}"><span>${c.folk}</span></dd>
      <dt title="${esc(slass)}">⚔️</dt><dd title="${esc(slass)}"><span>${c.styrka}</span></dd>
      <dt title="${esc(rik)}">${tecknet('sym_vag', '⚖', 12)}</dt><dd title="${esc(rik)}"><span>${c.resurser}</span></dd>
      <dt title="${esc(hall)}">♥</dt><dd title="${esc(hall)}">${hallBar(c.inst)}<span>${esc(t)}</span></dd>
    </dl>
    <ul class="bytt">${per}</ul></div>`;
  }).join('')}</div>`;
}
// handlarna som kommit (steg 4.4.1.2, handel.ts): den som är på besök, hur många som kommit och när nästa väntas
function handlareHtml() {
  const h = s.handlare, n = s.handlarNr ?? 0;
  if (!n && !h) return '<p class="muted">Ingen handlare har kommit än.</p>';
  const nu = h ? `<p>${iconImg('handlare', 16)} ${pLink(hp(s, h))} från ${esc(hp(s, h).gast!.hem!)} ${h.fas === 'kommer' ? 'är på väg hit' : h.fas === 'gar' ? 'går hem' : 'är här'}.</p>` : '';
  // handlarna som byarna skickat och som är på väg (steg 11.6.8): byn och när hen är framme
  const vl = s.varld, pa = (vl?.farder ?? []).filter(f => f.handlare && f.t2 === undefined && f.t1 > s.now);
  const nasta = pa.map(f => `<p title="${esc(timeLabel(s, f.t1))}">${iconImg('handlare', 16)} En handlare från ${esc(vl!.rader?.find(r => r.nr === f.fran)?.namn ?? 'en by')} är på väg, framme om ungefär ${esc(omUngefar(f.t1 - s.now))}.</p>`).join('');
  return `${nu}${nasta}<h4>Sedan byn grundades</h4><dl class="kv smal"><dt>Handlare som kommit</dt><dd>${n}</dd></dl><p>${kronikaLank('grannar', 'Bytena i krönikan')}</p>`;
}
// räderna (steg 4.4.5, rovare.ts): flocken som är här nu och det som hänt
function raderHtml() {
  const st = s.stat ?? {}, n = s.rovarNr ?? 0, f = s.rovare;
  if (!n && !f) return '<p class="muted">Inga rövare har kommit än.</p>';
  const nu = f ? `<p class="low">⚔️ ${f.folk.length} rövare är vid byn: ${rovarna(s, f).map(p => pLink(p)).join(', ')}.</p>` : '';
  const rad = (namn: string, v: unknown) => `<dt>${namn}</dt><dd>${Number(v ?? 0)}</dd>`;
  return `${nu}<h4>Sedan byn grundades</h4><dl class="kv smal">${rad('Flockar som kommit', n)}${rad('Rövare som kommit', st.rovare)}${rad('Strider', st.rovarStrid)}${rad('Rövare som dött', st.rovarDoda)}${rad('Gånger vakten väckte byn', st.rovarVackt)}</dl><p>${kronikaLank('strid', 'Striderna i krönikan')}</p>`;
}
// byns försvar: vakten i natt, de som håller vakt nu och vapnen i förrådet (strid.ts VAPEN)
function forsvarHtml() {
  const vakter = living(s).filter(p => p.guardDay !== undefined && p.guardDay === s.lastGuardDay), nu = living(s).filter(p => p.task?.act === 'vakt');
  const vapen = Object.keys(VAPEN).filter(k => k !== 'hand').map(k => [k, isTool(k) ? nTools(s, k) : Math.floor(amountOf(s, k) + 1e-9)] as const).filter(([, n]) => n > 0);
  return `<dl class="kv smal"><dt>Vaktade i natt</dt><dd>${vakter.length ? vakter.map(p => pLink(p)).join(', ') : '<span class="muted">ingen</span>'}</dd>
    <dt>Vaktar nu</dt><dd>${nu.length ? nu.map(p => pLink(p)).join(', ') : '<span class="muted">ingen</span>'}</dd></dl>
    <h4>Vapnen</h4>${vapen.length ? `<ul class="bytt">${vapen.map(([k, n]) => `<li title="${esc(sakNamn(k))}">${iconImg(k, 12)} ${esc(sakNamn(k))} ${n}</li>`).join('')}</ul>` : '<p class="muted">Byn har inga vapen.</p>'}`;
}

// stenen Omvärlden (steg 9.3.3): grannklanerna, handlarna, räderna och byns försvar i delar överst. Blek tills byn känner någon
// utanför. Registret: en ny del är en rad i DELAR
interface Del { id: string; tecken: string; namn: string; html(): string }
const DELAR: Del[] = [
  { id: 'grannar', tecken: '👥', namn: 'Grannarna', html: grannarHtml },
  { id: 'handlare', tecken: '⚖️', namn: 'Handlarna', html: handlareHtml },
  { id: 'rader', tecken: '⚔️', namn: 'Räderna', html: raderHtml },
  { id: 'forsvar', tecken: '🛡️', namn: 'Försvaret', html: forsvarHtml },
];
const oppen = () => DELAR.find(d => d.id === ui.omvDel) ?? DELAR[0];
export const grannar: Flik = {
  namn: 'Omvärlden',
  krav: 'öppnas när byn känner en klan eller har haft handlare eller rövare',
  syns: () => !!klanerOf(s).length || !!s.handlarNr || !!s.rovarNr || !!s.handlare || !!s.rovare,
  html() {
    const del = oppen();
    return `${delRad('data-odel', DELAR, del.id)}
      <div class="phead"><div></div>${hjalpKnapp('omvarlden', 'Vad är klanernas hållning?')}</div>${hjalpText('omvarlden', hallText())}${del.html()}`;
  },
  klick(el) {
    const b = el.closest<HTMLButtonElement>('[data-odel]');
    if (!b) return false;
    ui.omvDel = b.dataset.odel!;
    return true;
  },
};
