// Graferna (steg 5.4.1): byns historik (sim/historik.ts) som linjer, alla under varandra i Krönikans del Grafer (steg
// 6.9.12): invånarna, humöret, veden på elden, maten och veden i förrådet och byns rikedom (steg 6.9.13). Grafen visar en vecka (sju dygn, sju år i
// spelet) och går att dra bakåt ända till byns början; Allt visar hela tiden på en gång. Bara utseende: spelet läser den aldrig.
// En ny graf är en rad i GRAFER och `grafHtml('id')` där den ska stå; ett nytt tal är en rad i HISTORIK_TAL.
import { AGES, DAY, HISTORIK_TAL, WEEK, historikSerie, kalender, living, rikSerie, sakNamn, type RikRad } from '../sim';
import { esc } from './hjalp';
import { ritaOm, s } from './lage';

// en serie är ett tal i historiken (tal) eller punkter som räknas fram (punkter, t.ex. byns rikedom per dygn, steg 6.9.13)
// farg är en färg i paletten; linjen ritas i ton 2 i ljust läge och ton 3 i mörkt (--g-färg i template.html, steg 6.9.17)
interface Serie { tal?: string; namn?: string; farg: 'skiffer' | 'senap' | 'rost' | 'oliv' | 'jord'; punkter?: () => [number, number][] }
interface Graf { namn: string; serier: Serie[] | (() => Serie[]); max?: number; procent?: boolean; topp?: () => string } // topp: val överst i grafen
// byns rikedom (steg 6.9.13): summan och delarna som i sidhuvudet, en punkt per dygn ur historikens rader
const rik = (namn: string, ton: Serie['farg'], v: (r: RikRad) => number): Serie => ({ namn, farg: ton, punkter: () => rikSerie(s, v) });
export const GRAFER: Record<string, Graf> = { // i den ordning de står i Krönikan
  folk: { namn: 'Invånare', serier: [{ tal: 'folk', farg: 'skiffer' }] },
  humor: { namn: 'Humör', serier: [{ tal: 'humor', farg: 'senap' }], max: 1, procent: true },
  eld: { namn: 'Trä på elden', serier: [{ tal: 'eld', farg: 'rost' }] },
  forrad: { namn: 'Förrådet', serier: [{ tal: 'mat', farg: 'oliv' }, { tal: 'tra', farg: 'jord' }] },
  rik: { namn: 'Byns rikedom', serier: () => rikSerier(), topp: () => rikTopp() },
};

// vad rikedomens graf visar (steg 6.9.14): hela byn (summan och delarna), en persons förmögenhet eller hur många av en sak
// byn har. Personen väljs i listan eller i porträttraden (ett tryck på ett porträtt medan grafen visar en person)
export const rikVal: { vy: 'byn' | 'person' | 'sak'; person?: number; sak?: string } = { vy: 'byn' };
const RIK_VY = { byn: 'Hela byn', person: 'En person', sak: 'En sak' } as const;
// de som finns i rikedomens rader eller lever nu, och de saker byn haft
const rikFolk = () => { const ids = new Set(living(s).map(p => p.id)); for (const r of s.hist?.rik ?? []) for (const id in r[4]) ids.add(Number(id)); return s.people.filter(p => ids.has(p.id)).sort((a, b) => a.name.localeCompare(b.name, 'sv') || a.born - b.born); };
const rikSaker = () => { const k = new Set<string>(); for (const r of s.hist?.rik ?? []) for (const x in r[5]) k.add(x); return [...k].sort((a, b) => sakNamn(a).localeCompare(sakNamn(b), 'sv')); };
function rikSerier(): Serie[] {
  if (rikVal.vy === 'person') {
    const folk = rikFolk(), p = folk.find(q => q.id === rikVal.person) ?? living(s)[0] ?? folk[0];
    return p ? [rik(p.name, 'senap', r => r[4][p.id])] : [];
  }
  if (rikVal.vy === 'sak') {
    const k = rikVal.sak ?? (rikSaker().includes('ved') ? 'ved' : rikSaker()[0]);
    return k ? [rik(sakNamn(k), 'oliv', r => r[5][k] ?? 0)] : [];
  }
  return [rik('Hela byn', 'senap', r => r[1] + r[2] + r[3]), rik('Förrådet', 'oliv', r => r[1]), rik('Redskapen', 'skiffer', r => r[2]), rik('Husen', 'jord', r => r[3])];
}
function rikTopp() {
  const vy = `<select data-rikvy aria-label="Visa" title="Vad grafen visar">${Object.entries(RIK_VY).map(([id, n]) => `<option value="${id}"${id === rikVal.vy ? ' selected' : ''}>${n}</option>`).join('')}</select>`;
  if (rikVal.vy === 'byn') return `<div class="grafval">${vy}</div>`;
  const val = rikVal.vy === 'person'
    ? rikFolk().map(p => `<option value="${p.id}"${p.id === (rikVal.person ?? living(s)[0]?.id) ? ' selected' : ''}>${esc(p.name)}${p.died !== undefined ? ' †' : ''}</option>`)
    : (k => rikSaker().map(x => `<option value="${x}"${x === k ? ' selected' : ''}>${esc(sakNamn(x))}</option>`))(rikVal.sak ?? (rikSaker().includes('ved') ? 'ved' : rikSaker()[0]));
  const namn = rikVal.vy === 'person' ? 'Person' : 'Sak';
  return `<div class="grafval">${vy}<select data-rikval aria-label="${namn}" title="${rikVal.vy === 'person' ? 'Välj personen här eller tryck på hen i porträttraden' : 'Välj saken'}">${val.join('')}</select></div>`;
}

// fönstret per graf: slut = tiden längst till höger (undefined = nu), allt = hela tiden sedan byns början
const fonster: Record<string, { slut?: number; allt?: boolean }> = {};
const B = 300, H = 70; // ritytan i SVG:ns enheter

function spann(id: string) {
  const f = fonster[id] ??= {}, start = s.founded, nu = s.now;
  if (f.allt || nu - start <= WEEK) return { fran: start, till: Math.max(nu, start + DAY / 24) };
  const till = Math.min(nu, Math.max(start + WEEK, f.slut ?? nu));
  return { fran: till - WEEK, till };
}
const tidNamn = (t: number) => { const k = kalender(s, t); return `År ${k.ar}, ${AGES[k.ai].toLowerCase()}`; };
const talTxt = (g: Graf, v: number) => g.procent ? `${Math.round(v * 100)} %` : v >= 10 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1).replace('.', ',');

export function grafHtml(id: string) {
  const g = GRAFER[id], { fran, till } = spann(id), f = fonster[id];
  const serier = (typeof g.serier === 'function' ? g.serier() : g.serier).map(se => {
    const alla = se.punkter ? se.punkter() : historikSerie(s, se.tal!);
    // punkterna i fönstret och en på var sida, så att linjen går ut till kanten
    const a = Math.max(0, alla.findIndex(p => p[0] >= fran) - 1), b = alla.findIndex(p => p[0] > till);
    return { ...se, namn: se.namn ?? HISTORIK_TAL.find(t => t.id === se.tal)?.namn ?? se.tal ?? '', p: alla.slice(a, b < 0 ? alla.length : b + 1) };
  });
  const max = g.max ?? 1.1 * Math.max(1, ...serier.flatMap(se => se.p.filter(p => p[0] >= fran && p[0] <= till).map(p => p[1])));
  const x = (t: number) => ((t - fran) / (till - fran) * B).toFixed(1), y = (v: number) => (H - Math.min(v, max) / max * (H - 2) - 1).toFixed(1);
  const linjer = serier.map(se => se.p.length ? `<polyline fill="none" style="stroke:var(--g-${se.farg})" stroke-width="1.5" vector-effect="non-scaling-stroke" points="${se.p.map(p => `${x(p[0])},${y(p[1])}`).join(' ')}"/>` : '').join('');
  const sist = (se: typeof serier[0]) => { const i = se.p.findIndex(p => p[0] > till); const p = se.p[(i < 0 ? se.p.length : i) - 1]; return p ? talTxt(g, p[1]) : '–'; };
  const nu = !f.allt && (f.slut === undefined || f.slut >= s.now);
  const kanDra = !f.allt && s.now - s.founded > WEEK;
  return `<div class="graf" data-graf="${id}"${id === 'rik' ? ` data-rikvy="${rikVal.vy}"` : ''}>
    <div class="grafhuvud"><span class="grafnamn">${g.namn}</span>${serier.map(se => `<span class="grafserie" title="${se.namn}"><i style="background:var(--g-${se.farg})"></i>${sist(se)}</span>`).join('')}
    <button type="button" class="grafallt" data-grafallt="${id}" aria-pressed="${!!f.allt}" title="${f.allt ? 'Visa en vecka (sju år i spelet)' : 'Visa hela tiden sedan byns början'}">${f.allt ? '7 år' : 'Allt'}</button></div>${g.topp?.() ?? ''}
    <div class="grafram"><span class="grafmax">${talTxt(g, max)}</span><svg class="grafyta${kanDra ? ' dra' : ''}" viewBox="0 0 ${B} ${H}" preserveAspectRatio="none" role="img" aria-label="${g.namn} från ${tidNamn(fran)} till ${nu ? 'nu' : tidNamn(till)}">
      <line x1="0" y1="${H - 0.5}" x2="${B}" y2="${H - 0.5}" class="grafaxel" vector-effect="non-scaling-stroke"/>${linjer}</svg></div>
    <div class="grafaxlar"><span>${tidNamn(fran)}</span><span class="muted">${kanDra ? '⇠ dra ⇢' : ''}</span><span>${nu ? 'nu' : tidNamn(till)}</span></div>
  </div>`;
}

// att dra i grafen flyttar fönstret bakåt eller framåt i tiden; panelen skrivs om medan man drar, så rörelsen följs på
// fönstret och inte på grafens element (det byts ut)
let drag: { id: string; x: number; slut: number; bredd: number } | undefined;
if (typeof document !== 'undefined') {
document.addEventListener('pointerdown', e => {
  const el = (e.target as Element).closest<SVGElement>('.grafyta.dra'), id = el?.closest<HTMLElement>('[data-graf]')?.dataset.graf;
  if (!el || !id) return;
  drag = { id, x: e.clientX, slut: spann(id).till, bredd: el.getBoundingClientRect().width };
  e.preventDefault();
});
addEventListener('pointermove', e => {
  if (!drag) return;
  const t = drag.slut - (e.clientX - drag.x) / drag.bredd * WEEK;
  fonster[drag.id].slut = t >= s.now ? undefined : t;
  ritaOm();
});
const slapp = () => { drag = undefined; };
addEventListener('pointerup', slapp);
addEventListener('pointercancel', slapp);
// rikedomens val (steg 6.9.14): listorna överst, och ett tryck i porträttraden medan grafen visar en person
document.addEventListener('change', e => {
  const el = (e.target as Element).closest<HTMLSelectElement>('[data-rikvy], [data-rikval]');
  if (!el) return;
  if (el.matches('select[data-rikvy]')) rikVal.vy = el.value as typeof rikVal.vy;
  else if (rikVal.vy === 'person') rikVal.person = Number(el.value); else rikVal.sak = el.value;
  ritaOm();
});
document.addEventListener('click', e => {
  const p = (e.target as Element).closest<HTMLElement>('#ports [data-id]');
  if (!p || !document.querySelector('.graf[data-rikvy="person"]')) return;
  rikVal.person = Number(p.dataset.id);
  e.stopImmediatePropagation(); ritaOm();
}, true);
document.addEventListener('click', e => {
  const b = (e.target as Element).closest<HTMLElement>('[data-grafallt]');
  if (!b) return;
  const f = fonster[b.dataset.grafallt!] ??= {};
  f.allt = !f.allt; f.slut = undefined;
  ritaOm();
});
}
