import { BYN, HOUR, kortTal, Pile, SAKER, Slitage, Ting, byId, condOf, halvKlar, sakNamn, slitageNu, stationById, stationDef, temperature, tingOf } from '../../sim';
import { iconImg } from '../../ikoner';
import { condBar, durTxt, esc, pLink } from '../hjalp';
import { piles, s, ui } from '../lage';
import type { Flik } from '../panel';

// en sak eller en hög (steg 2.3.5): öppnas genom att trycka på den i lagret, en hög, personens utrustning eller en
// stations redskapsplats. Symbolen och namnet, skicket, vad som sliter på den just nu och hur länge den håller i den
// takten, vem som gjorde den och när. Kvaliteten (steg 2.2.2) kommer när den finns.
// Det som går att trycka på har data-sak: "t:<tingets id>" för ett redskap eller plagg, "s:<x>,<y>,<slag>" för en stack
export const sakKey = (a: { id?: number; x?: number; y?: number; k: string }) => a.id !== undefined ? `t:${a.id}` : `s:${a.x},${a.y},${a.k}`;
export const sakAttr = (a: { id?: number; x?: number; y?: number; k: string }) => `data-sak="${sakKey(a)}"`;

const ORSAK: Record<Slitage['orsak'], string> = {
  ruttnar: 'Ruttnar', vadret: 'Ligger ute i vädret', lagret: 'Slits med tiden', tak: 'Ligger under tak',
  kista: 'Ligger i en kista', pasig: 'Slits av att bäras på kroppen',
  anvands: 'Slits när den används', inget: 'Slits inte',
};
function hitta(): { t?: Ting; p?: Pile } {
  const [slag, rest] = ui.sak.split(':');
  if (slag === 't') { const t = tingOf(s).find(x => x.id === Number(rest)); return { t, p: t && piles().find(p => p.id === t.id) }; }
  const [x, y, k] = rest?.split(',') ?? [];
  return { p: piles().find(p => p.id === undefined && p.x === Number(x) && p.y === Number(y) && p.k === k) };
}
function var_(t: Ting, p?: Pile) {
  if (t.bar !== undefined) return `${pLink(byId(s, t.bar))} har den på sig`;
  if (t.hos !== undefined) return `${pLink(byId(s, t.hos))} har den i handen`;
  if (t.lass !== undefined) return `${pLink(byId(s, t.lass))} bär den`;
  if (t.vid !== undefined) { const st = stationById(s, t.vid); return st ? `Vid ${esc(stationDef(st.k)?.namn.toLowerCase() ?? 'stationen')}` : 'Vid en station'; }
  return p ? (p.stored ? 'I förrådet' : 'På marken') : 'I förrådet';
}
export const sak: Flik = {
  namn: 'Saken',
  knapp: 'person',
  html() {
    const { t, p } = hitta(), a = t ?? p;
    if (!a) return '<p class="muted">Den finns inte längre.</p>';
    const k = t?.halv?.gor ?? p?.gor ?? a.k, c = t ? t.c : condOf(p!), sl = slitageNu(s, { k: a.k, x: t ? t.x ?? p?.x : p!.x, y: t ? t.y ?? p?.y : p!.y }, t);
    const halv = t?.halv ? ` (inte klar, ${Math.round(halvKlar(t.halv) * 100)} %)` : '';
    const mangd = !t && p && p.max > 1 ? `<dt>Mängd</dt><dd>${Math.round(p.n)} st</dd>` : '';
    const vem = t?.av !== undefined ? byId(s, t.av) : undefined;
    const gjord = t?.gjord !== undefined ? `<dt>Gjord</dt><dd>${vem ? `av ${pLink(vem)}, ` : ''}för ${durTxt(s.now - t.gjord)} sedan</dd>` : '';
    const agare = t ? (t.agare === BYN ? 'Byns' : pLink(byId(s, t.agare))) : '';
    const orsak = sl.orsak === 'ruttnar' ? `Ruttnar, ${Math.round(temperature(s))} grader` : ORSAK[sl.orsak];
    const haller = sl.gang ? `<dt>Räcker till</dt><dd>${Math.max(0, Math.floor(c / sl.gang + 1e-9))} ${esc(sl.enhet!)} till</dd>` // per gång (steg 2.3.12)
      : sl.per > 0 ? `<dt>Håller</dt><dd>${durTxt(c / sl.per * HOUR)} till i den takten</dd>` : '';
    const klad = SAKER[a.k]?.klad?.varme ? `<dt>Värme</dt><dd>Skyddar ${Math.round(SAKER[a.k]!.klad!.varme * 100)} % mot kylan</dd>` : '';
    return `
    <div class="phead">${iconImg(k, 32)}<div><h2>${esc(sakNamn(k))}${halv}</h2></div></div>
    <dl class="kv">
      <dt>Skick</dt><dd>${condBar(c)}<span>${Math.round(c * 100)} %</span></dd>
      <dt>Slitage</dt><dd>${esc(orsak)}${sl.per > 0 ? ` (${sl.per * 2400 < 0.1 ? 'under 0,1' : kortTal(sl.per * 2400)} % per dygn)` : ''}</dd>
      ${haller}${mangd}${klad}
      ${t ? `<dt>Var</dt><dd>${var_(t, p)}</dd><dt>Ägare</dt><dd>${agare}</dd>` : ''}
      ${gjord}
    </dl>`;
  },
  klick(el) {
    const b = el.closest<HTMLElement>('[data-sak]');
    if (!b) return false;
    ui.sak = b.dataset.sak!; ui.tab = 'sak';
    return true;
  },
};
