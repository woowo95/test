import { iconImg } from '../ikoner';
import { HOUR, LogEntry, Person, byId, capacity, carryKind, clamp, isParent, isSick, load, sak, sakNamn, timeLabel } from '../sim';
import { s } from './lage';

// små hjälpare för text, tal, färger och staplar som alla delar av gränssnittet använder
export const $ = (id: string) => document.getElementById(id)!;
export const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
export const num = (v: number, d = 1) => v.toFixed(d).replace('.', ',');
export const fmtN = (n: number) => String(n > 0 && n < 1 ? 1 : Math.round(n)); // förråd och stackar: alltid hela tal
export const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
export const times = (n: number) => `${n} ${n === 1 ? 'gång' : 'gånger'}`;
export function durTxt(ms: number) {
  const h = ms / HOUR;
  const min = Math.max(1, Math.round(ms / 60000));
  return h >= 24 ? `${num(h / 24)} dygn` : h >= 1 ? `${num(h)} timmar` : `${min} ${min === 1 ? 'minut' : 'minuter'}`;
}
export function clockTxt(t: number) { const d = new Date(t); return `${timeLabel(s, t)}, kl. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

// färger
export function hsl(h: number, sat: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12, a = sat * Math.min(l, 1 - l);
  const f = (n: number) => l - a * clamp(Math.min(k(n) - 3, 9 - k(n)), -1, 1);
  return (Math.round(f(0) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(4) * 255);
}
// personens egen färg som css
export const hex = (p: Person) => '#' + hsl(p.hue, 0.5, 0.58).toString(16).padStart(6, '0');

// staplar
export function bar(v: number, cls = '', tr = '') { return `<span class="bar ${cls}"><span style="width:${Math.round(clamp(v, 0, 1) * 100)}%"></span></span>${tr}`; }
export const condBar = (c: number) => bar(c, c < 0.5 ? 'low' : '');
// pil vid en stapel som ändras märkbart just nu: jämför med värdet för en stund sedan (speltid)
const trendHist = new Map<string, { v: number; t: number; d: number }>();
export function trend(p: Person, key: string, v: number) {
  const id = p.id + ':' + key, h = trendHist.get(id), now = s.now;
  if (!h || now < h.t) { trendHist.set(id, { v, t: now, d: 0 }); return ''; }
  if (now - h.t >= 10 * 60 * 1000) { h.d = (v - h.v) / ((now - h.t) / HOUR); h.v = v; h.t = now; }
  return h.d > 0.08 ? '<span class="trend up" title="Stiger">▲</span>' : h.d < -0.08 ? '<span class="trend down" title="Sjunker">▼</span>' : '';
}

// personer
export function pLink(p?: Person) { return p ? `<button class="plink" data-id="${p.id}" type="button">${esc(p.name)}</button>` : '–'; }
export function moodWord(m: number) { return m > 0.75 ? 'Lycklig' : m > 0.55 ? 'Nöjd' : m > 0.4 ? 'Okej' : m > 0.25 ? 'Nedstämd' : 'Olycklig'; }
export function relWord(p: Person, q: Person, op: number) {
  if (p.partner === q.id) return 'Partner';
  if (isParent(p, q)) return 'Barn';
  if (isParent(q, p)) return 'Förälder';
  if (p.mother !== undefined && (p.mother === q.mother || p.father === q.father)) return 'Syskon';
  return op > 60 ? 'Nära vän' : op > 25 ? 'Vän' : op > -10 ? 'Bekant' : op > -45 ? 'Ogillar' : 'Ovän';
}
export const sickNow = (p: Person) => isSick(p, s.now);
// vad en person bär och hur mycket hen orkar
// en stack i en lista: symbolen och namnet. Ett påbörjat redskap har det det ska bli med timglaset bredvid
export const pileTxt = (p: { k: string; n: number; max: number; gor?: string }) => p.gor ? `${iconImg(p.gor)}${iconImg('paborjat', 10)}${sakNamn(p.gor)} (inte klar)` : `${iconImg(p.k)}${sakNamn(p.k)}${p.max === 1 ? '' : ` ${fmtN(p.n)} st`}`;
export function carryTxt(p: Person) {
  const t = p.task, cap = capacity(s, p), parts: string[] = [];
  if (t && t.carry > 0.05) parts.push(`${fmtN(t.carry)} ${sakNamn(carryKind(t.act)).toLowerCase()}`);
  for (const k in t?.items ?? {}) if (t!.items![k] >= 0.5 && !sak(k)?.dold) parts.push(`${fmtN(t!.items![k])} ${sakNamn(k).toLowerCase()}`);
  const orkar = `orkar bära ${Math.round(cap * 100)} % av en full stack`;
  return parts.length ? `Bär ${parts.join(' och ')} (${Math.round(load(t!) / cap * 100)} % av vad hen orkar)` : `Bär inget just nu, ${orkar}`;
}
// en rad i loggen där namnen går att trycka på
export function linkify(l: LogEntry) {
  let t = esc(l.text);
  for (const id of l.ids) { const p = byId(s, id); if (p) t = t.replace(esc(p.name), pLink(p)); }
  return t;
}
