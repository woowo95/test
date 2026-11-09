import { hp, KLAN_ROLLER, VAPEN, amountOf, isTool, nTools, instText, klanerOf, living, sakNamn, timeLabel } from '../../sim';
import { iconImg } from '../../ikoner';
import { bar, esc } from '../hjalp';
import { s, ui } from '../lage';
import type { Flik } from '../panel';

// grannklanerna (steg 4.4.3, klaner.ts), en del i stenen Omvärlden (steg 9.3.3): en lista utan karta (världskartan är steg 11.1.3). Namn, var de bor, hur många de
// är, hur många som kan slåss, hur mycket de har, hur de ser på byn och de namngivna personerna. Texten syns med musen över
const ROLL_IKON: Record<string, string> = { hovding: 'ledarskap', handlare: 'handlare', aldste: 'i_legend', jagare: 'i_vargdodare', grundare: 'i_rik' };
function grannarHtml() {
  const k = klanerOf(s);
  if (!k.length) return '<p class="muted">Byn känner inga grannar.</p>';
  // en ruta per klan med namnet överst i mitten, som påbuden i Styre (steg 4.5.4.2)
  return `<div class="rutor">${k.map(c => {
    const t = instText(c.inst), cls = c.inst <= -15 ? 'low' : '';
    const per = c.personer.map(p => `<li title="${esc(`${KLAN_ROLLER[p.roll]?.namn ?? p.roll}: ${p.namn}`)}">${iconImg(ROLL_IKON[p.roll] ?? '', 12)} ${esc(p.namn)}</li>`).join('');
    return `<div class="ruta"><div class="rutnamn" title="${esc(`${c.namn} bor vid ${c.hem}${c.utbrytare ? '. Grundad av några som lämnade byn' : ''}`)}"><b>${esc(c.namn)}</b><div class="small muted">${esc(c.hem)}</div></div>
    <dl class="kv smal">
      <dt title="Så många är de">👥</dt><dd title="Så många är de"><span>${c.folk}</span></dd>
      <dt title="Så många kan slåss">⚔️</dt><dd title="Så många kan slåss"><span>${c.styrka}</span></dd>
      <dt title="Så mycket har de (ungefär arbetstimmar)">${iconImg('i_rik', 12)}</dt><dd title="Så mycket har de (ungefär arbetstimmar)"><span>${c.resurser}</span></dd>
      <dt title="${esc(`Hur de ser på byn: ${t} (${c.inst} av −100 till 100)`)}">♥</dt><dd title="${esc(`Hur de ser på byn: ${t} (${c.inst} av −100 till 100)`)}">${bar((c.inst + 100) / 200, cls)}<span>${esc(t)}</span></dd>
    </dl>
    <ul class="bytt">${per}</ul></div>`;
  }).join('')}</div>`;
}
// handlarna som kommit (steg 4.4.1.2, handel.ts): den som är på besök, hur många som kommit och när nästa väntas
function handlareHtml() {
  const h = s.handlare, n = s.handlarNr ?? 0;
  if (!n && !h) return '<p class="muted">Ingen handlare har kommit än.</p>';
  const nu = h ? `<p>${iconImg('handlare', 16)} <b>${esc(hp(s, h).name)}</b> från ${esc(hp(s, h).gast!.hem!)} ${h.fas === 'kommer' ? 'är på väg hit' : h.fas === 'gar' ? 'går hem' : 'är här'}.</p>` : '';
  return `${nu}<dl class="kv smal"><dt>Handlare som kommit</dt><dd>${n}</dd>${!h && s.nastaHandlare ? `<dt>Nästa väntas</dt><dd>${esc(timeLabel(s, s.nastaHandlare))}</dd>` : ''}</dl>`;
}
// räderna (steg 4.4.5, rovare.ts): flocken som är här nu och det som hänt
function raderHtml() {
  const st = s.stat ?? {}, n = s.rovarNr ?? 0, f = s.rovare;
  if (!n && !f) return '<p class="muted">Inga rövare har kommit än.</p>';
  const nu = f ? `<p class="low">⚔️ ${f.folk.length} rövare är vid byn.</p>` : '';
  const rad = (namn: string, v: unknown) => `<dt>${namn}</dt><dd>${Number(v ?? 0)}</dd>`;
  return `${nu}<dl class="kv smal">${rad('Flockar som kommit', n)}${rad('Rövare', st.rovare)}${rad('Strider', st.rovarStrid)}${rad('Rövare som dött', st.rovarDoda)}${rad('Gånger vakten väckte byn', st.rovarVackt)}</dl>`;
}
// byns försvar: vakten i natt, de som håller vakt nu och vapnen i förrådet (strid.ts VAPEN)
function forsvarHtml() {
  const vakter = living(s).filter(p => p.guardDay !== undefined && p.guardDay === s.lastGuardDay), nu = living(s).filter(p => p.task?.act === 'vakt');
  const vapen = Object.keys(VAPEN).filter(k => k !== 'hand').map(k => [k, isTool(k) ? nTools(s, k) : Math.floor(amountOf(s, k) + 1e-9)] as const).filter(([, n]) => n > 0);
  return `<dl class="kv smal"><dt>Vakten i natt</dt><dd>${vakter.length ? vakter.map(p => esc(p.name)).join(', ') : '<span class="muted">ingen</span>'}</dd>
    <dt>Håller vakt nu</dt><dd>${nu.length ? nu.map(p => esc(p.name)).join(', ') : '<span class="muted">ingen</span>'}</dd></dl>
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
  syns: () => !!s.klaner?.length || !!s.handlarNr || !!s.rovarNr || !!s.handlare || !!s.rovare,
  html() {
    const del = oppen();
    return `<div class="pdelar" role="tablist">${DELAR.map(d => `<button type="button" role="tab" data-odel="${d.id}" aria-selected="${d === del}" title="${d.namn}" aria-label="${d.namn}">${d.tecken}</button>`).join('')}</div>
      <h3>${del.namn}</h3>${del.html()}`;
  },
  klick(el) {
    const b = el.closest<HTMLButtonElement>('[data-odel]');
    if (!b) return false;
    ui.omvDel = b.dataset.odel!;
    return true;
  },
};
