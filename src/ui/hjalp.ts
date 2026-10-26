import { iconImg } from '../ikoner';
import { HOUR, LogEntry, MIN, Person, REL, byId, capacity, carryKind, clamp, isParent, isSick, load, num, sak, sakNamn, timeLabel } from '../sim';
import { s, vidNyBy } from './lage';

// små hjälpare för text, tal, färger och staplar som alla delar av gränssnittet använder
export const $ = (id: string) => document.getElementById(id)!;
export const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
export { num }; // decimalkomma (format.ts), här för gränssnittets skull
export const fmtN = (n: number) => String(n > 0 && n < 1 ? 1 : Math.round(n)); // förråd och stackar: alltid hela tal
export const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
export const times = (n: number) => `${n} ${n === 1 ? 'gång' : 'gånger'}`;
export function durTxt(ms: number) {
  const h = ms / HOUR;
  const min = Math.max(1, Math.round(ms / MIN));
  return h >= 24 ? `${num(h / 24)} dygn` : h >= 1 ? `${num(h)} timmar` : `${min} ${min === 1 ? 'minut' : 'minuter'}`;
}
export function clockTxt(t: number) { const d = new Date(t); return `${timeLabel(s, t)}, kl. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

// färger
export function hsl(h: number, sat: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12, a = sat * Math.min(l, 1 - l);
  const f = (n: number) => l - a * clamp(Math.min(k(n) - 3, 9 - k(n)), -1, 1);
  return (Math.round(f(0) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(4) * 255);
}
export const cssFarg = (c: number) => '#' + c.toString(16).padStart(6, '0');
// personens egen färg, blekare när hen sover (figuren på kartan), och samma som css
export const personFarg = (p: Person, sover = false) => hsl(p.hue, sover ? 0.15 : 0.5, sover ? 0.5 : 0.58);
export const hex = (p: Person) => cssFarg(personFarg(p));

// staplar
export function bar(v: number, cls = '', tr = '') { return `<span class="bar ${cls}"><span style="width:${Math.round(clamp(v, 0, 1) * 100)}%"></span></span>${tr}`; }
// när en stapel eller ett porträtt märks som låg (röd). Det är bara bildens gränser; där simuleringen har en egen gräns läser
// bilden den (KROPP.kallt, KROPP.svag, KROPP.toaBehov). Gränserna skiljer sig med avsikt: porträttraden varnar vid sämre värden än rutan
export const LAG = {
  humor: 0.35, // stapeln för humör (porträttets ruta och invånarlistan)
  olycklig: 0.25, // humöret är så lågt att personen kallas olycklig (moodWord), och porträttet i raden märks
  hunger: 0.25, // mättnad (porträttets ruta, och porträttet i raden)
  halsa: 0.5, // hälsa (porträttets ruta och personfliken)
  varmeRad: 0.3, // porträttet i raden märks när värmen är under detta (stapeln märks vid KROPP.kallt)
  skick: 0.5, // skicket på ett redskap eller en vägg (condBar)
} as const;
export const condBar = (c: number) => bar(c, c < LAG.skick ? 'low' : '');
// förklaringar bakom en ?-knapp (symboler först): knappen och texten har samma id, och ett tryck på knappen visar eller döljer texten
const oppna = new Set<string>();
export const hjalpKnapp = (id: string, title: string) => `<button type="button" class="hjalp" data-hjalp="${id}" aria-expanded="${oppna.has(id)}" title="${esc(title)}" aria-label="${esc(title)}">?</button>`;
export const hjalpText = (id: string, html: string) => oppna.has(id) ? html : '';
export function hjalpKlick(el: HTMLElement) {
  const b = el.closest<HTMLElement>('[data-hjalp]');
  if (!b) return false;
  if (!oppna.delete(b.dataset.hjalp!)) oppna.add(b.dataset.hjalp!);
  return true;
}
// pil vid en stapel som ändras märkbart just nu: jämför med värdet för en stund sedan (speltid). Gränsen är per stapel och
// timme, under hur fort stapeln brukar ändras (mättnaden sjunker 1/16 i timmen, vilan högst 0,06)
const TREND: Record<string, number> = { humor: 0.08, hunger: 0.03, rest: 0.03, social: 0.03, health: 0.03, warm: 0.08, toa: 0.08 };
const trendHist = new Map<string, { v: number; t: number; d: number }>();
vidNyBy.push(() => trendHist.clear());
export function trend(p: Person, key: string, v: number) {
  const id = p.id + ':' + key, h = trendHist.get(id), now = s.now;
  if (!h || now < h.t) { trendHist.set(id, { v, t: now, d: 0 }); return ''; }
  if (now - h.t >= 10 * MIN) { h.d = (v - h.v) / ((now - h.t) / HOUR); h.v = v; h.t = now; }
  const g = TREND[key] ?? 0.08;
  return h.d > g ? '<span class="trend up" title="Stiger">▲</span>' : h.d < -g ? '<span class="trend down" title="Sjunker">▼</span>' : '';
}

// personer
export function pLink(p?: Person) { return p ? `<button class="plink" data-id="${p.id}" type="button">${esc(p.name)}</button>` : '–'; }
export function moodWord(m: number) { return m > 0.75 ? 'Lycklig' : m > 0.55 ? 'Nöjd' : m > 0.4 ? 'Okej' : m > LAG.olycklig ? 'Nedstämd' : 'Olycklig'; }
export function relWord(p: Person, q: Person, op: number) {
  if (p.partner === q.id) return 'Partner';
  if (isParent(p, q)) return 'Barn';
  if (isParent(q, p)) return 'Förälder';
  if ((p.mother !== undefined && p.mother === q.mother) || (p.father !== undefined && p.father === q.father)) return 'Syskon';
  return op > REL.naraVan ? 'Nära vän' : op > REL.vanOrd ? 'Vän' : op > REL.osams ? 'Bekant' : op > REL.ovan ? 'Ogillar' : 'Ovän';
}
export const sickNow = (p: Person) => isSick(p, s.now);
// prickarna på figuren på kartan (manniskor.ts ritar dem): färgen och vad de betyder
export const PRICKAR = {
  sjuk: { farg: 0x8fc46a, namn: 'Sjuk', har: sickNow },
  gravid: { farg: 0xf2c4d0, namn: 'Väntar barn', har: (p: Person) => p.pregnantSince !== undefined },
};
// prickarna som symboler med förklaringen vid musen; ord = ordet skrivs också ut (rutan i hörnet, som inte går att hålla musen över)
export const prickar = (p: Person, ord = false) => Object.values(PRICKAR).filter(q => q.har(p))
  .map(q => ` <span class="prick" style="background:${cssFarg(q.farg)}" title="${q.namn}" aria-label="${q.namn}"></span>${ord ? ' ' + q.namn.toLowerCase() : ''}`).join('');
// en stack i en lista: symbolen och namnet. Ett påbörjat redskap har det det ska bli med timglaset bredvid
export const pileTxt = (p: { k: string; n: number; max: number; gor?: string }) => p.gor ? `${iconImg(p.gor)}${iconImg('paborjat', 10)}${sakNamn(p.gor)} (inte klar)` : `${iconImg(p.k)}${sakNamn(p.k)}${p.max === 1 ? '' : ` ${fmtN(p.n)} st`}`;
// vad en person bär och hur mycket hen orkar
export function carryTxt(p: Person) {
  const t = p.task, orkar = capacity(s, p), parts: string[] = [];
  if (t && t.carry > 0.05) parts.push(`${fmtN(t.carry)} ${sakNamn(carryKind(t.act)).toLowerCase()}`);
  for (const k in t?.items ?? {}) if (t!.items![k] >= 0.5 && !sak(k)?.dold) parts.push(`${fmtN(t!.items![k])} ${sakNamn(k).toLowerCase()}`);
  return parts.length ? `Bär ${parts.join(' och ')} (${Math.round(load(t!) / orkar * 100)} % av vad hen orkar)` : `Bär inget just nu, orkar bära ${Math.round(orkar * 100)} % av en full stack`;
}
// en rad i loggen där namnen går att trycka på
export function linkify(l: LogEntry) {
  let t = esc(l.text);
  for (const id of l.ids) { const p = byId(s, id); if (p) t = t.replace(esc(p.name), pLink(p)); }
  return t;
}
