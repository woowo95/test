import { kladSkydd, BYN, HOUR, W, kortTal, Pile, SAKER, Slitage, Ting, byId, condOf, halvKlar, sakNamn, slitageNu, stationById, stationDef, temperature, tingOf, toaAt, toaInfo } from '../../sim';
import { iconImg } from '../../ikoner';
import { condBar, durTxt, esc, kvMark, kvText, pLink } from '../hjalp';
import { piles, s, ui } from '../lage';
import type { Flik } from '../panel';

// en sak eller en hög (steg 2.3.5): öppnas genom att trycka på den i lagret, en hög, personens utrustning eller en
// stations redskapsplats. Symbolen och namnet, skicket, vad som sliter på den just nu och hur länge den håller i den
// takten, vem som gjorde den och när, och kvaliteten (steg 2.2.2).
// Det som går att trycka på har data-sak: "t:<tingets id>" för ett redskap eller plagg, "s:<x>,<y>,<slag>" för en stack.
// En toa-hög på kartan (steg 2.10.5) öppnas som "f:<rutan>" och har en egen inforuta (toaHog)
export const sakKey = (a: { id?: number; x?: number; y?: number; k: string }) => a.id !== undefined ? `t:${a.id}` : `s:${a.x},${a.y},${a.k}`;
export const sakAttr = (a: { id?: number; x?: number; y?: number; k: string }) => `data-sak="${sakKey(a)}"`;
// maten fryser i frost och ruttnar då nästan inte (LAGER.frost, steg 2.8.2): i lagret får symbolen en vit kant av rimfrost
// (Björn valde rimfrosten efter v89, .fryst i template.html), och texten syns när man håller musen över
export const fryst = () => temperature(s) <= 0;
export const frystAttr = (k: string) => SAKER[k]?.haller !== undefined && fryst() ? ' fryst" title="Fryst: ruttnar nästan inte' : '';

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
  if (t.vid !== undefined) { const st = stationById(s, t.vid); return st?.ag !== undefined ? 'I kistan i sovrummet' : st ? `Vid ${esc(stationDef(st.k)?.namn.toLowerCase() ?? 'stationen')}` : 'Vid en station'; }
  return p ? (p.stored ? 'I förrådet' : 'På marken') : 'I förrådet';
}
// toa-högen (steg 2.10.5): hur färsk den är, vem som lämnade den och när, hur länge den ligger kvar och vad den gör
function toaHog(i: number) {
  const f = toaAt(s, i % W, Math.floor(i / W));
  if (!f) return '<p class="muted">Den har bleknat bort.</p>';
  const inf = toaInfo(s, f), vem = f.av !== undefined ? byId(s, f.av) : undefined;
  const gor = [inf.akel && 'Äcklar dem som går förbi', inf.plock && 'Ingen plockar här eller bredvid', inf.vatten && 'Smutsar vattnet i närheten'].filter(Boolean);
  return `
    <div class="phead">${iconImg('toa', 32)}<div><h2>${esc(sakNamn('toa'))}</h2></div></div>
    <dl class="kv">
      <dt>Färsk</dt><dd>${condBar(inf.n)}<span>${Math.round(inf.n * 100)} %</span></dd>
      <dt>Lämnad</dt><dd>${vem ? `av ${pLink(vem)}, ` : ''}för ${durTxt(s.now - f.t)} sedan</dd>
      <dt>Ligger kvar</dt><dd>${durTxt(inf.kvar * HOUR)} till</dd>
      <dt>Gör</dt><dd>${gor.length ? gor.join('<br>') : 'Inget längre, den har nästan bleknat bort'}</dd>
    </dl>`;
}
export const sak: Flik = {
  namn: 'Saken',
  knapp: 'person',
  html() {
    if (ui.sak.startsWith('f:')) return toaHog(Number(ui.sak.slice(2)));
    const { t, p } = hitta(), a = t ?? p;
    if (!a) return '<p class="muted">Den finns inte längre.</p>';
    const k = t?.halv?.gor ?? p?.gor ?? a.k, c = t ? t.c : condOf(p!), sl = slitageNu(s, { k: a.k, x: t ? t.x ?? p?.x : p!.x, y: t ? t.y ?? p?.y : p!.y }, t);
    const halv = t?.halv ? ` (inte klar, ${Math.round(halvKlar(t.halv) * 100)} %)` : '';
    const mangd = !t && p && p.max > 1 ? `<dt>Mängd</dt><dd>${Math.round(p.n)} st</dd>` : '';
    const vem = t?.av !== undefined ? byId(s, t.av) : undefined;
    const gjord = t?.gjord !== undefined ? `<dt>Gjord</dt><dd>${vem ? `av ${pLink(vem)}, ` : ''}för ${durTxt(s.now - t.gjord)} sedan</dd>` : '';
    const agare = t ? (t.agare === BYN ? 'Byns' : pLink(byId(s, t.agare))) : '';
    const orsak = sl.orsak === 'ruttnar' ? fryst() ? `❄ Fryst, ${Math.round(temperature(s))} grader: ruttnar nästan inte` : `Ruttnar, ${Math.round(temperature(s))} grader` : ORSAK[sl.orsak];
    const haller = sl.gang ? `<dt>Räcker till</dt><dd>${Math.max(0, Math.floor(c / sl.gang + 1e-9))} ${esc(sl.enhet!)} till</dd>` // per gång (steg 2.3.12)
      : sl.per > 0 ? `<dt>Håller</dt><dd>${durTxt(c / sl.per * HOUR)} till i den takten</dd>` : '';
    const klad = SAKER[a.k]?.klad?.varme ? `<dt>Värme</dt><dd>Skyddar ${Math.round(kladSkydd(a.k, t) * 100)} % mot kylan</dd>` : '';
    const kv = t && !t.halv && t.q !== undefined ? `<dt>Kvalitet</dt><dd>${kvMark(t, 12)} ${esc(kvText(t))}</dd>` : ''; // (steg 2.2.2)
    return `
    <div class="phead">${iconImg(k, 32)}<div><h2>${esc(sakNamn(k))}${halv}</h2></div></div>
    <dl class="kv">
      <dt>Skick</dt><dd>${condBar(c)}<span>${Math.round(c * 100)} %</span></dd>
      ${kv}
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
