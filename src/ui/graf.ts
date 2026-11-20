// Graferna (steg 5.4.1): byns historik (sim/historik.ts) som linjer, alla under varandra i stenen Byns tal (steg 9.3.2,
// flikar/tal.ts): invånarna, humöret, veden på elden, maten och veden i förrådet och byns rikedom (steg 6.9.13). Grafen visar Allt, 1 dygn,
// 1 säsong eller 4 säsonger (steg 9.2.8), och ett tryck eller drag längs den visar värdena där. Bara utseende: spelet läser den aldrig.
// En ny graf är en rad i GRAFER och `grafHtml('id')` där den ska stå; ett nytt tal är en rad i HISTORIK_TAL.
import { AGES, DAY, HISTORIK_TAL, WEEK, historikSerie, kalender, living, rikSerie, sakNamn, type RikRad } from '../sim';
import { esc, fallUt, hjalpText } from './hjalp';
import { tecknet } from '../ikoner';
import { ritaOm, s, vidNyBy } from './lage';

// en serie är ett tal i historiken (tal) eller punkter som räknas fram (punkter, t.ex. byns rikedom per dygn, steg 6.9.13)
// farg är en färg i paletten; linjen ritas i ton 2 i ljust läge och ton 3 i mörkt (--g-färg i template.html, steg 6.9.17)
interface Serie { tal?: string; namn?: string; farg: 'skiffer' | 'senap' | 'rost' | 'oliv' | 'jord'; punkter?: () => [number, number][] }
interface Graf { namn: string; serier: Serie[] | (() => Serie[]); max?: number; procent?: boolean; enhet?: 'st' | 'rik'; forkl?: string; topp?: () => string } // topp: val överst i grafen; enhet och forkl (steg 11.1.37): talets enhet i förklaringen, och texten som ett tryck på rubriken visar
// byns rikedom (steg 6.9.13): summan och delarna som i sidhuvudet, en punkt per dygn ur historikens rader
const rik = (namn: string, ton: Serie['farg'], v: (r: RikRad) => number): Serie => ({ namn, farg: ton, punkter: () => rikSerie(s, v) });
export const GRAFER: Record<string, Graf> = { // i den ordning de står i Byns tal
  folk: { namn: 'Invånare', serier: [{ tal: 'folk', farg: 'skiffer' }], enhet: 'st' },
  humor: { namn: 'Humör', serier: [{ tal: 'humor', farg: 'senap' }], max: 1, procent: true },
  eld: { namn: 'Trä på elden', serier: [{ tal: 'eld', farg: 'rost' }] },
  forrad: { namn: 'Förrådet', serier: [{ tal: 'mat', farg: 'oliv' }, { tal: 'tra', farg: 'jord' }], enhet: 'st' },
  rik: { namn: 'Byns rikedom', serier: () => rikSerier(), enhet: 'rik', topp: () => rikTopp() },
  // fler grafer (steg 12.1.138)
  silver: { namn: 'Silver i byn', serier: [{ tal: 'silver', farg: 'skiffer' }], enhet: 'st', forkl: 'Hur mycket silver som ligger i byns förråd.' },
  tamdjur: { namn: 'Tamdjur', serier: [{ tal: 'tamdjur', farg: 'jord' }], enhet: 'st', forkl: 'Hur många tamdjur byn har: hundarna, fåren, getterna, korna och de andra.' },
  skord: { namn: 'Skörd', serier: [{ tal: 'skord', farg: 'oliv' }], enhet: 'st', forkl: 'Hur mycket mat fälten gett sedan byns början.' },
  sjuka: { namn: 'Sjuka', serier: [{ tal: 'sjuka', farg: 'rost' }], enhet: 'st', forkl: 'Hur många som är sjuka och har tecken på det.' },
  troende: { namn: 'Troende', serier: [{ tal: 'troende', farg: 'senap' }], enhet: 'st', forkl: 'Hur många som har en tro.' },
  fangar: { namn: 'Fångar', serier: [{ tal: 'fangar', farg: 'jord' }], enhet: 'st', forkl: 'Hur många som sitter fångna i byn.' },
  strider: { namn: 'Strider', serier: [{ tal: 'strider', farg: 'rost' }], enhet: 'st', forkl: 'Hur många strider det varit i byn sedan dess början: mot rövare, vargar och björnar, holmgångar och slagsmål.' },
  resor: { namn: 'Resor', serier: [{ tal: 'resor', farg: 'skiffer' }], enhet: 'st', forkl: 'Hur många sällskap som rest ut i världen och kommit hem sedan byns början.' },
  bocker: { namn: 'Böcker', serier: [{ tal: 'bocker', farg: 'senap' }], enhet: 'st', forkl: 'Hur många böcker byn börjat skriva sedan dess början.' },
  matlagning: { namn: 'Matlagningen', serier: [{ tal: 'grillat', farg: 'senap' }, { tal: 'brant', farg: 'rost' }], enhet: 'st', forkl: 'Hur mycket mat som grillas och hur mycket som bränns vid elden. En ovan kock bränner mer, och den som lagat mat länge bränner mindre.' }, // det som grillats och bränts (steg 9.2.62)
};

// vad rikedomens graf visar (steg 6.9.14): hela byn (summan och delarna), en persons förmögenhet eller hur många av en sak
// byn har. Personen väljs i listan eller i porträttraden (ett tryck på ett porträtt medan grafen visar en person)
export const rikVal: { vy: 'byn' | 'person' | 'sak'; person?: number; sak?: string } = { vy: 'byn' };
vidNyBy.push(() => { rikVal.person = undefined; rikVal.sak = undefined; }); // personen och saken fanns i den förra byn
const RIK_VY = { byn: 'Hela byn', person: 'En person', sak: 'En sak' } as const;
// de som finns i rikedomens rader eller lever nu, och de saker byn haft
const rikFolk = () => { const ids = new Set(living(s).map(p => p.id)); for (const r of s.hist?.rik ?? []) for (const id in r[4]) ids.add(Number(id)); return s.people.filter(p => ids.has(p.id)).sort((a, b) => a.name.localeCompare(b.name, 'sv') || a.born - b.born); };
let sakerMinne: { rik?: unknown; n: number; saker: string[] } = { n: -1, saker: [] }; // räknas om när en rad tillkommit
const rikSaker = () => {
  const rik = s.hist?.rik ?? [];
  if (sakerMinne.rik !== rik || sakerMinne.n !== rik.length) {
    const k = new Set<string>(); for (const r of rik) for (const x in r[5]) k.add(x);
    sakerMinne = { rik, n: rik.length, saker: [...k].sort((a, b) => sakNamn(a).localeCompare(sakNamn(b), 'sv')) };
  }
  return sakerMinne.saker;
};
// saken som visas: den valda, annars veden om byn haft ved, annars den första
const forvaldSak = () => rikVal.sak ?? (rikSaker().includes('ved') ? 'ved' : rikSaker()[0]);
function rikSerier(): Serie[] {
  if (rikVal.vy === 'person') {
    const folk = rikFolk(), p = folk.find(q => q.id === rikVal.person) ?? living(s)[0] ?? folk[0];
    return p ? [rik(p.name, 'senap', r => r[4][p.id])] : [];
  }
  if (rikVal.vy === 'sak') {
    const k = forvaldSak();
    return k ? [rik(sakNamn(k), 'oliv', r => r[5][k] ?? 0)] : [];
  }
  return [rik('Hela byn', 'senap', r => r[1] + r[2] + r[3]), rik('Förrådet', 'oliv', r => r[1]), rik('Redskapen', 'skiffer', r => r[2]), rik('Husen', 'jord', r => r[3])];
}
function rikTopp() {
  const vy = `<select data-rikvy aria-label="Visa" title="Vad grafen visar">${Object.entries(RIK_VY).map(([id, n]) => `<option value="${id}"${id === rikVal.vy ? ' selected' : ''}>${n}</option>`).join('')}</select>`;
  if (rikVal.vy === 'byn') return `<div class="grafval">${vy}</div>`;
  const val = rikVal.vy === 'person'
    ? rikFolk().map(p => `<option value="${p.id}"${p.id === (rikVal.person ?? living(s)[0]?.id) ? ' selected' : ''}>${esc(p.name)}${p.died !== undefined ? ' †' : ''}</option>`)
    : (k => rikSaker().map(x => `<option value="${x}"${x === k ? ' selected' : ''}>${esc(sakNamn(x))}</option>`))(forvaldSak());
  const namn = rikVal.vy === 'person' ? 'Person' : 'Sak';
  return `<div class="grafval">${vy}<select data-rikval aria-label="${namn}" title="${rikVal.vy === 'person' ? 'Välj personen här eller tryck på hen i porträttraden' : 'Välj saken'}">${val.join('')}</select></div>`;
}

// fönstret per graf (steg 9.2.8): hur lång tid grafen visar (Allt = hela tiden sedan byns början), och tiden där man tryckt
// eller drar längs grafen (visa), vars värden står under grafen
const LANGD = { allt: { namn: 'Allt', t: Infinity }, dygn: { namn: '1 år', t: DAY }, sasong: { namn: '1 tidsålder', t: WEEK }, ar: { namn: '4 tidsåldrar', t: 4 * WEEK } } as const;
type Langd = keyof typeof LANGD;
const fonster: Record<string, { visa?: number; start?: number }> = {}; // start: grafens första mätpunkt (steg 9.2.124)
// tidsfönstret gäller alla grafer (steg 11.1.36): en rad överst i Byns tal
let langd: Langd = 'sasong';
export const langdRad = () => `<div class="grafval grafallaval" role="toolbar" aria-label="Tidsfönstret">${(Object.keys(LANGD) as Langd[]).map(l => `<button type="button" class="grafallt" data-graflangd="${l}" aria-pressed="${langd === l}">${LANGD[l].namn}</button>`).join('')}</div>`;
const B = 300, H = 70; // ritytan i SVG:ns enheter

function spann(id: string) {
  const f = fonster[id] ??= {}, start = Math.max(s.founded, Math.min(f.start ?? s.founded, s.now)), nu = s.now, l = LANGD[langd].t;
  return { fran: Math.max(start, nu - l), till: Math.max(nu, start + DAY / 24) };
}
const tidNamn = (t: number) => { const k = kalender(s, t); return `År ${k.ar}, ${AGES[k.ai].toLowerCase()}`; };
const talTxt = (g: Graf, v: number) => g.procent ? `${Math.round(v * 100)} %` : v >= 10 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1).replace('.', ',');
// talet med sin enhet i förklaringen (steg 11.1.37): "64 %", "34 st", rikedomen med vågens symbol före
const talEnhet = (g: Graf, v: number) => g.enhet === 'st' ? `${talTxt(g, v)} st` : g.enhet === 'rik' ? `${tecknet('sym_vag', '⚖', 12)} ${talTxt(g, v)}` : talTxt(g, v);
// seriens värde vid tiden t: den senaste punkten före eller vid t
const vardeVid = (p: [number, number][], t: number) => { let v: number | undefined; for (const q of p) { if (q[0] > t) break; v = q[1]; } return v; };

export function grafHtml(id: string, forsta = false) {
  const g = GRAFER[id], rader = (typeof g.serier === 'function' ? g.serier() : g.serier).map(se => ({ se, alla: se.punkter ? se.punkter() : historikSerie(s, se.tal!) }));
  // allt börjar vid grafens första mätpunkt och slutar nu (steg 9.2.124): en serie som började mätas senare än grundandet får inget tomt fält
  (fonster[id] ??= {}).start = Math.min(...rader.map(r => r.alla[0]?.[0] ?? Infinity));
  const { fran, till } = spann(id), f = fonster[id];
  const serier = rader.map(({ se, alla: alla0 }) => {
    const sista = alla0[alla0.length - 1], alla = sista && sista[0] < till ? [...alla0, [till, sista[1]] as [number, number]] : alla0; // linjen går fram till nu
    // punkterna i fönstret och en på var sida, så att linjen går ut till kanten
    const a = Math.max(0, alla.findIndex(p => p[0] >= fran) - 1), b = alla.findIndex(p => p[0] > till);
    return { ...se, namn: se.namn ?? HISTORIK_TAL.find(t => t.id === se.tal)?.namn ?? se.tal ?? '', p: alla.slice(a, b < 0 ? alla.length : b + 1) };
  });
  const max = g.max ?? 1.1 * Math.max(1, ...serier.flatMap(se => se.p.filter(p => p[0] >= fran && p[0] <= till).map(p => p[1])));
  const x = (t: number) => ((t - fran) / (till - fran) * B).toFixed(1), y = (v: number) => (H - Math.min(v, max) / max * (H - 2) - 1).toFixed(1);
  const linjer = serier.map(se => se.p.length ? `<polyline fill="none" style="stroke:var(--g-${se.farg})" stroke-width="1.5" vector-effect="non-scaling-stroke" points="${se.p.map(p => `${x(p[0])},${y(p[1])}`).join(' ')}"/>` : '').join('');
  const sist = (se: typeof serier[0]) => { const v = vardeVid(se.p, till); return v === undefined ? '–' : talEnhet(g, v); };
  const visa = f.visa !== undefined && f.visa >= fran && f.visa <= till ? f.visa : undefined;
  const strek = visa !== undefined ? `<line x1="${x(visa)}" y1="0" x2="${x(visa)}" y2="${H}" class="grafvisa" vector-effect="non-scaling-stroke"/>` : '';
  // under grafen: varje series färg och namn, och värdet där man tryckt (annars nu)
  const forklaring = serier.map(se => { const v = vardeVid(se.p, visa ?? till); return `<span class="grafserie"><i style="background:var(--g-${se.farg})"></i>${esc(se.namn)} <b>${v === undefined ? '–' : talEnhet(g, v)}</b></span>`; }).join('');
  return `<div class="graf" data-graf="${id}"${id === 'rik' ? ` data-rikvy="${rikVal.vy}"` : ''}>
    <div class="grafhuvud">${g.forkl ? `<span class="grafnamn klick falla" ${fallUt(`graf-${id}`)}>${g.namn}</span>` : `<span class="grafnamn">${g.namn}</span>`}${serier.length === 1 ? `<span class="grafserie">${sist(serier[0])}</span>` : ''}</div>
    ${g.forkl ? hjalpText(`graf-${id}`, `<p class="muted small">${esc(g.forkl)}</p>`) : ''}${g.topp?.() ?? ''}
    <div class="grafram"><span class="grafmax">${talTxt(g, max)}</span><span class="grafnoll">0</span><svg class="grafyta dra" viewBox="0 0 ${B} ${H}" preserveAspectRatio="none" role="img" aria-label="${g.namn} från ${tidNamn(fran)} till nu">
      <line x1="0" y1="${H - 0.5}" x2="${B}" y2="${H - 0.5}" class="grafaxel" vector-effect="non-scaling-stroke"/>${linjer}${strek}</svg></div>
    <div class="grafaxlar"><span>${tidNamn(fran)}</span><span class="muted">${visa !== undefined ? tidNamn(visa) : forsta ? 'tryck eller dra för värdet' : ''}</span><span>nu</span></div>
    <div class="grafforkl">${forklaring}</div>
  </div>`;
}

// ett tryck eller drag längs grafen visar värdena där (steg 9.2.8); panelen skrivs om medan man drar, så rörelsen följs på
// dokumentet och inte på grafens element (det byts ut)
let drag: { id: string; vanster: number; bredd: number } | undefined;
const visaVid = (clientX: number) => {
  if (!drag) return;
  const { fran, till } = spann(drag.id), a = Math.min(1, Math.max(0, (clientX - drag.vanster) / drag.bredd));
  fonster[drag.id].visa = fran + a * (till - fran);
  ritaOm();
};
if (typeof document !== 'undefined') {
document.addEventListener('pointerdown', e => {
  const el = (e.target as Element).closest<SVGElement>('.grafyta.dra'), id = el?.closest<HTMLElement>('[data-graf]')?.dataset.graf;
  if (!el || !id) return;
  const r = el.getBoundingClientRect();
  drag = { id, vanster: r.left, bredd: r.width };
  visaVid(e.clientX);
  e.preventDefault();
});
addEventListener('pointermove', e => visaVid(e.clientX));
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
  const b = (e.target as Element).closest<HTMLElement>('[data-graflangd]');
  if (!b) return;
  langd = b.dataset.graflangd as Langd; // fönstret gäller alla grafer (steg 11.1.36)
  for (const f of Object.values(fonster)) f.visa = undefined;
  ritaOm();
});
}
