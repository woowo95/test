import { Act, DJUR, DJURARTER, GORS, HOUR, STATION, Station, clamp, grillVara, halvKlar, living, materialSak, stationDef, tingOf, vidStation } from '../sim';
import { s } from './lage';

// det som görs vid en station syns på den (steg 2.2.12): sakens egen symbol medan någon arbetar där. Viltet och fisken ur
// djurregistret (DJUR), redskapen ur GORS, repet när någon tvinnar och materialet när någon syr ett plagg (steg 2.3.2,
// materialSak i klader.ts). Bara utseende:
// spelet räknar likadant
const PA_BANKEN: Partial<Record<Act, string>> = { ...Object.fromEntries(Object.values(DJUR).map(d => [d.act, d.sak])), ...Object.fromEntries(Object.keys(GORS).map(g => [g, GORS[g][0]])), tvinna: 'rep' };
// det som används vid stationen just nu (steg 3.6.6): den som arbetar där, sakerna på bänken och hur långt arbetet kommit.
// Ett påbörjat redskap (paborjat.ts) visar sitt material och sin framsteg; viltet visar hur långt slakten kommit av
// den längsta tiden (maxTim). Annars saken ur PA_BANKEN och ingen stapel. Bara utseende
export function iBruk(st: Station) {
  const d = stationDef(st.k), at = vidStation(st);
  const p = d && living(s).find(q => q.task && d.gor.includes(q.task.act) && Math.hypot(q.x - at.x, q.y - at.y) < STATION.vidBank);
  const tk = p?.task;
  if (!p || !tk) return undefined;
  const h = tk.ref !== undefined ? tingOf(s).find(t => t.id === tk.ref && t.halv)?.halv : undefined;
  if (h) return { p, saker: Object.keys(h.av).filter(k => h.av[k] > 0), gor: h.gor, klar: halvKlar(h) };
  const art = DJURARTER.find(a => a.act === tk.act), sak = tk.act === 'grilla' ? grillVara(s)?.ra : (tk.tool && materialSak(tk.tool)) || PA_BANKEN[tk.act]; // på spettet: det som grillas
  return { p, saker: sak ? [sak] : [], gor: undefined, klar: art && tk.phase === 'do' ? clamp(1 - (tk.until - s.now) / (art.maxTim * HOUR), 0, 1) : undefined };
}
