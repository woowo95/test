import { GravStil, HELIGA_PLATSER, gravAt, heligAt, troNamn, troOf, kvarById, KVARLEVOR, DAY, amountOf, busksort, fallTid, living, tileOf, isTool, FOREST, stamAv, MARK, STADIER, VAG, groundOf, stadium, tradAlder, tradArt, STUBBE_LIV, grundvarde, tingVarde, klenod, sakBerattelse, kladSkydd, BYN, HOUR, W, kortTal, Pile, SAKER, Slitage, Ting, byId, condOf, halvKlar, sakNamn, slitageNu, stationById, stationDef, temperature, tingOf, toaAt, toaInfo, viktOf } from '../../sim';
import { iconImg } from '../../ikoner';
import { condBar, durTxt, esc, kvMark, kvText, pLink } from '../hjalp';
import { piles, s, ui } from '../lage';
import type { Flik } from '../panel';
import { tradBild, tradBildUrl } from '../trad';
import { buskBild } from '../buske';
import { skaffasRader } from '../skaffas';

// en sak eller en hög (steg 2.3.5): öppnas genom att trycka på den i lagret, en hög, personens utrustning eller en
// stations redskapsplats. Symbolen och namnet, skicket, vad som sliter på den just nu och hur länge den håller i den
// takten, vem som gjorde den och när, och kvaliteten (steg 2.2.2).
// Det som går att trycka på har data-sak: "t:<tingets id>" för ett redskap eller plagg, "s:<x>,<y>,<slag>" för en stack.
// En toa-hög på kartan (steg 2.10.5) öppnas som "f:<rutan>" och har en egen inforuta (toaHog)
// Ett slag i förrådet (listan till vänster, steg 5.3.5.2) öppnas som "k:<slaget>" (slagIForradet)
// En stubbe (steg 3.10.6) öppnas som "u:<rutan>" (stubbe), ett träd (steg 5.1.4.3) som "r:<rutan>" (trad) och en buske (steg 6.5.3) som "b:<rutan>"
export const sakKey = (a: { id?: number; x?: number; y?: number; k: string }) => a.id !== undefined ? `t:${a.id}` : `s:${a.x},${a.y},${a.k}`;
export const sakAttr = (a: { id?: number; x?: number; y?: number; k: string }) => `data-sak="${sakKey(a)}"`;
// maten fryser i frost och ruttnar då nästan inte (LAGER.frost, steg 2.8.2): i lagret får symbolen en vit kant av rimfrost
// (Björn valde rimfrosten efter v89, .fryst i template.html), och texten syns när man håller musen över
export const fryst = () => temperature(s) <= 0;
export const frystAttr = (k: string) => SAKER[k]?.haller !== undefined && fryst() ? ' fryst" title="Fryst: ruttnar nästan inte' : '';

const ORSAK: Record<Slitage['orsak'], string> = {
  ruttnar: 'Ruttnar', vadret: 'Ligger ute i vädret', lagret: 'Slits med tiden', tak: 'Ligger under tak',
  kista: 'Ligger i en kista', pasig: 'Slits av att bäras på kroppen',
  anvands: 'Slits när den används', handen: 'Slits med tiden i handen', bars: 'Slits med tiden i en börda', inget: 'Slits inte',
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
const GRAVSTIL: Record<GravStil, string> = { jord: 'Begravd i jorden', hog: 'En gravhög med gåvor', bal: 'En minnessten efter bålet', vatten: 'Lämnad åt vattnet' };
function grav(i: number) {
  const g = gravAt(s, i % W, Math.floor(i / W));
  if (!g) return '<p class="muted">Graven finns inte längre.</p>';
  return `<div class="phead">${iconImg('grav', 32)}<div><h2>${esc(g.namn)}s grav</h2></div></div><p>${esc(GRAVSTIL[g.stil])}${g.ovardig ? ', utan heder' : ''}. Begravd för ${durTxt(s.now - g.t)} sedan.</p>`;
}
function heligPlats(i: number) {
  const h = heligAt(s, i % W, Math.floor(i / W));
  if (!h) return '<p class="muted">Platsen är inte helig längre.</p>';
  const d = HELIGA_PLATSER[h.k], tr = troOf(s, h.tro);
  return `<div class="phead">${iconImg(d.ikon, 32)}<div><h2>${esc(d.namn)}</h2></div></div><p>Platsen ${esc(h.om)}${tr ? `, helig för ${esc(troNamn(tr).toLowerCase())}` : ''}.${h.skandad ? ' Den har vanhelgats.' : ''}</p>`;
}
// det som blivit kvar av en människa (steg 8.2.3, kvarlevor.ts)
function kvarleva(id: number) {
  const q = kvarById(s, id);
  if (!q) return '<p class="muted">Det finns inte kvar längre.</p>';
  const d = KVARLEVOR[q.k];
  return `<div class="phead">${iconImg(d.ikon, 32)}<div><h2>${esc(q.text)}</h2></div></div>
    <p>${esc(d.namn)}. Ruttnar bort om ${durTxt(q.t + d.haller * DAY - s.now)}.</p>`;
}
// stubben efter ett fällt träd (steg 3.10.6): när trädet fälldes och hur länge det dröjer innan den ruttnat bort (STUBBE_LIV, skog.ts)
function stubbe(i: number) {
  const u = s.stubbar?.find(q => q.x === i % W && q.y === Math.floor(i / W));
  if (!u) return '<p class="muted">Stubben har ruttnat bort.</p>';
  return `
    <div class="phead">${iconImg('sittplats', 32)}<div><h2>Stubbe</h2></div></div>
    <dl class="kv">
      <dt>Fälldes</dt><dd>för ${durTxt(s.now - u.t)} sedan</dd>
      <dt>Ruttnar bort</dt><dd>om ${durTxt(Math.max(0, STUBBE_LIV - (s.now - u.t)))}</dd>
    </dl>`;
}
// trädet på kartan (steg 5.1.4.3): bilden, arten, stadiet och åldern (sim/trad.ts)
function trad(i: number) {
  const g = groundOf(s), st = stadium(g, i);
  if (!st) return '<p class="muted">Här står inget träd längre.</p>';
  const x = i % W, y = Math.floor(i / W), b = tradBild(st, g.trees[i], x, y, VAG.ungskog, tradArt(g, i).id === 'bjork');
  const namn = STADIER.find(d => d.id === st)!.namn, art = tradArt(g, i).namn;
  const ar = Math.floor(tradAlder(g, i, MARK.tradDygn));
  const alder = ar < 1 ? 'Under ett år' : `${ar} år`, stam = stamAv(g, i); // trä och grenar när det fälls (steg 5.1.4.4)
  return `
    <div class="phead"><img class="ikon" src="${tradBildUrl(b)}" width="${b.typ === 'torr' ? 32 : 28}" style="height:auto;image-rendering:pixelated" alt=""><div><h2>${esc(art)}</h2><span class="muted">${esc(namn)}</span></div></div>
    <dl class="kv">
      <dt>Ålder</dt><dd>${alder}</dd>
      ${g.trees[i] >= FOREST ? `<dt>Fälls</dt><dd>${iconImg('ved', 14)} ${stam.ved} ${iconImg('grenar', 14)} ${stam.grenar}</dd>` : ''}
      ${fallning(i)}
    </dl>`;
}
// om någon börjat fälla trädet (steg 6.5.6): vem som fäller det nu och hur mycket arbete som är kvar
function fallning(i: number) {
  const gjort = s.halvfallt?.[i] ?? 0, vem = living(s).find(p => p.task?.act === 'falla' && p.task.phase === 'do' && tileOf(p.task.tx, p.task.ty) === i);
  if (!gjort && !vem) return '';
  const tid = fallTid(s, i), kvar = Math.max(0, tid - gjort), del = Math.min(1, gjort / tid);
  return `<dt title="Fällningen">${iconImg('yxa', 14)}</dt><dd>${vem ? `${pLink(vem)} fäller det` : 'Påbörjat'} · ${Math.round(del * 100)} % · ${durTxt(kvar)} kvar</dd>`;
}
// en buske (steg 6.5.3): bilden, namnet och vad den gör
function buske(i: number) {
  const g = groundOf(s), bu = busksort(g, i);
  if (!bu) return '<p class="muted">Busken finns inte kvar.</p>';
  return `
    <div class="phead"><img class="ikon" src="${tradBildUrl(buskBild(i % W, Math.floor(i / W)))}" width="32" style="height:auto;image-rendering:pixelated" alt=""><div><h2>${esc(bu.namn)}</h2></div></div>
    <p>${esc(bu.text)}</p>`;
}
// den uppsatta facklan (ljus.ts, steg 6.3.7): om den brinner och hur mycket som är kvar
function fackla(i: number) {
  const f = s.uppsatta?.find(q => q.x === i % W && q.y === Math.floor(i / W));
  if (!f) return '<p class="muted">Facklan är borta.</p>';
  return `
    <div class="phead">${iconImg('fackla', 32)}<div><h2>Uppsatt fackla</h2></div></div>
    <dl class="kv"><dt>${f.tand ? 'Brinner' : 'Släckt'}</dt><dd>${condBar(f.c)}<span>${Math.round(f.c * 100)} % kvar</span></dd></dl>`;
}
// stocken (skog.ts, skogsvard.ts): ett fällt träd eller ett vindfall som väntar på att huggas, och vad det ger
function stock(id: number) {
  const k = s.stockar?.find(q => q.id === id);
  if (!k) return '<p class="muted">Stocken är huggen.</p>';
  return `
    <div class="phead">${iconImg('ved', 32)}<div><h2>Stock</h2></div></div>
    <p>Ett fällt träd som väntar på att huggas.</p>
    <dl class="kv"><dt>${iconImg('ved')}</dt><dd>${Math.floor(k.ved)} ved</dd><dt>${iconImg('grenar')}</dt><dd>${Math.floor(k.grenar)} grenar</dd></dl>`;
}
// vem som äger en stack eller ett slag i förrådet (steg 5.3.5.3): byns del och varje ägares, flest först
function agarRader(ag: Record<string, number> | undefined, n: number) {
  const eg = Object.entries(ag ?? {}).map(([id, m]) => ({ q: byId(s, Number(id)), m: Math.round(m) })).filter(r => r.m >= 1).sort((a, b) => b.m - a.m);
  const byns = n - eg.reduce((a, r) => a + r.m, 0);
  return [...byns >= 1 ? [`<div>Byns ${byns}</div>`] : [], ...eg.map(r => `<div>${r.q ? pLink(r.q) : 'Någon som inte finns kvar'} ${r.m}</div>`)].join('') || '<div>Byns</div>';
}
// ett slag i förrådet: ägarna summeras över stackarna i förrådet, och för redskap och plagg över tingen
function agareAvSlag(k: string) {
  if (isTool(k)) {
    const ag: Record<string, number> = {}; let n = 0;
    for (const t of tingOf(s)) if (t.k === k && !t.halv) { n++; if (t.agare !== BYN) ag[t.agare] = (ag[t.agare] ?? 0) + 1; }
    return { ag, n };
  }
  const ag: Record<string, number> = {}; let n = 0;
  for (const p of piles()) if (p.k === k && p.stored) { n += p.n; for (const [id, m] of Object.entries(p.ag ?? {})) ag[id] = (ag[id] ?? 0) + m; }
  return { ag, n: Math.round(n) };
}
// var slaget ligger och hur fort det slits där (steg 5.3.5.4): stackarna i förrådet och, för redskap, tingen var de än är,
// samlade efter vad som sliter på dem, med antalet, medelskicket och slitaget per dygn
const PLATS: Partial<Record<Slitage['orsak'], string>> = { tak: 'Under tak', kista: 'I en kista', lagret: 'I lagret', vadret: 'Ute i vädret', handen: 'I handen', bars: 'I en börda', pasig: 'På kroppen', anvands: 'Används' };
const perDygn = (per: number) => per * 2400 < 0.1 ? 'under 0,1' : kortTal(per * 2400);
function slitageAvSlag(k: string) {
  const g = new Map<string, { n: number; c: number; per: number }>();
  const lagg = (namn: string, n: number, c: number, per: number) => { const r = g.get(namn) ?? { n: 0, c: 0, per: 0 }; r.n += n; r.c += c * n; r.per += per * n; g.set(namn, r); };
  const platsAv = (sl: Slitage) => sl.orsak === 'ruttnar' ? (fryst() ? '❄ Fryst' : sl.smuts ? 'Ruttnar fortare i smuts' : 'Ruttnar') : PLATS[sl.orsak] ?? ORSAK[sl.orsak];
  if (isTool(k)) for (const t of tingOf(s)) { if (t.k !== k || t.halv) continue; const sl = slitageNu(s, t, t); lagg(platsAv(sl), 1, t.c, sl.per); }
  else for (const p of piles()) if (p.k === k && p.stored && p.n > 0) { const sl = slitageNu(s, p); lagg(platsAv(sl), p.n, p.c, sl.per); }
  return [...g].sort((a, b) => b[1].n - a[1].n).map(([namn, r]) => `<div>${esc(namn)}: ${Math.round(r.n)} st, ${Math.round(r.c / r.n * 100)} %${r.per > 0 ? `, ${perDygn(r.per / r.n)} % per dygn` : ''}</div>`).join('');
}
// ett slag i förrådet (steg 5.3.5.2): hur mycket byn har, vad det är värt och väger, vad det används till och hur man skaffar det
function slagIForradet(k: string) {
  const n = amountOf(s, k), v = grundvarde(k), ag = agareAvSlag(k), sl = slitageAvSlag(k);
  return `
    <div class="phead">${iconImg(k, 32)}<div><h2>${esc(sakNamn(k))}</h2></div></div>
    <dl class="kv">
      <dt>I förrådet</dt><dd>${isTool(k) ? Math.ceil(n - 1e-9) : Math.round(n)} st</dd>
      ${v ? `<dt title="Ungefär i arbetstimmar: det det tar att skaffa eller göra den">Värde</dt><dd>${kortTal(v)} styck</dd>` : ''}
      <dt>Vikt</dt><dd>${kortTal(viktOf(k))} kg styck</dd>
      <dt>Ägare</dt><dd class="rader">${agarRader(ag.ag, ag.n)}</dd>
      ${sl ? `<dt title="Var de ligger: antalet, skicket och hur fort de slits där">Skick</dt><dd class="rader">${sl}</dd>` : ''}
      ${skaffasRader(k)}
    </dl>`;
}
export const sak: Flik = {
  namn: 'Saken',
  knapp: 'person',
  html() {
    if (ui.sak.startsWith('f:')) return toaHog(Number(ui.sak.slice(2)));
    if (ui.sak.startsWith('u:')) return stubbe(Number(ui.sak.slice(2)));
    if (ui.sak.startsWith('k:')) return kvarleva(Number(ui.sak.slice(2)));
    if (ui.sak.startsWith('g:')) return grav(Number(ui.sak.slice(2)));
    if (ui.sak.startsWith('h:')) return heligPlats(Number(ui.sak.slice(2)));
    if (ui.sak.startsWith('r:')) return trad(Number(ui.sak.slice(2)));
    if (ui.sak.startsWith('b:')) return buske(Number(ui.sak.slice(2)));
    if (ui.sak.startsWith('a:')) return fackla(Number(ui.sak.slice(2)));
    if (ui.sak.startsWith('v:')) return stock(Number(ui.sak.slice(2)));
    if (ui.sak.startsWith('k:')) return slagIForradet(ui.sak.slice(2));
    const { t, p } = hitta(), a = t ?? p;
    if (!a) return '<p class="muted">Den finns inte längre.</p>';
    const k = t?.halv?.gor ?? p?.gor ?? a.k, c = t ? t.c : condOf(p!), sl = slitageNu(s, { k: a.k, x: t ? t.x ?? p?.x : p!.x, y: t ? t.y ?? p?.y : p!.y }, t);
    const halv = t?.halv ? ` (inte klar, ${Math.round(halvKlar(t.halv) * 100)} %)` : '';
    const mangd = !t && p && p.max > 1 ? `<dt>Mängd</dt><dd>${Math.round(p.n)} st</dd>` : '';
    const vem = t?.av !== undefined ? byId(s, t.av) : undefined;
    const gjord = t?.gjord !== undefined ? `<dt>Gjord</dt><dd>${vem ? `av ${pLink(vem)}, ` : ''}för ${durTxt(s.now - t.gjord)} sedan</dd>`
      : t?.kopt !== undefined ? `<dt>Köpt</dt><dd>av en handlare, för ${durTxt(s.now - t.kopt)} sedan</dd>` : ''; // (steg 5.3.5.3)
    const kl = t && klenod(s, t), klen = kl ? `<dt>Klenod</dt><dd>★ Byn minns ${pLink(kl)} genom den</dd>` : ''; // (steg 3.4.3)
    const agare = t ? (t.agare === BYN ? 'Byns' : pLink(byId(s, t.agare))) : '';
    const orsak = sl.orsak === 'ruttnar' ? fryst() ? `❄ Fryst, ${Math.round(temperature(s))} grader: ruttnar nästan inte` : `Ruttnar${sl.smuts ? ' fortare i blod och smuts' : ''}, ${Math.round(temperature(s))} grader` : ORSAK[sl.orsak];
    const haller = sl.gang ? `<dt>Räcker till</dt><dd>${Math.max(0, Math.floor(c / sl.gang + 1e-9))} ${esc(sl.enhet!)} till</dd>` // per gång (steg 2.3.12)
      : sl.per > 0 ? `<dt>Håller</dt><dd>${durTxt(c / sl.per * HOUR)} till i den takten</dd>` : '';
    // vad den är värd (steg 3.10.6, varde.ts): ungefär så många timmars arbete det tar att skaffa eller göra den, efter skick och kvalitet
    const v1 = t ? tingVarde(t) : grundvarde(a.k) * c, varde = `<dt title="Ungefär i arbetstimmar: det det tar att skaffa eller göra den">Värde</dt><dd>${kortTal(v1)}${!t && p && p.n >= 2 ? `, ${kortTal(v1 * Math.round(p.n))} alla` : ''}</dd>`;
    const klad = SAKER[a.k]?.klad?.varme ? `<dt>Värme</dt><dd>Skyddar ${Math.round(kladSkydd(a.k, t) * 100)} % mot kylan</dd>` : '';
    const kv = t && !t.halv && t.q !== undefined ? `<dt>Kvalitet</dt><dd>${kvMark(t, 12)} ${esc(kvText(t))}</dd>` : ''; // (steg 2.2.2)
    const ber = t && !t.halv ? sakBerattelse(s, t, sakNamn(k)) : ''; // mästerverken och de usla sakerna (steg 3.9.4)
    return `
    <div class="phead">${iconImg(k, 32)}<div><h2>${t?.ber?.namn ? `★ ${esc(t.ber.namn)}: ` : ''}${esc(sakNamn(k))}${halv}</h2></div></div>
    ${ber ? `<p class="besk">${esc(ber)}</p>` : ''}
    <dl class="kv">
      <dt>Skick</dt><dd>${condBar(c)}<span>${Math.round(c * 100)} %</span></dd>
      ${kv}
      <dt>Slitage</dt><dd>${esc(orsak)}${sl.per > 0 ? ` (${perDygn(sl.per)} % per dygn)` : ''}</dd>
      ${haller}${mangd}${varde}<dt>Vikt</dt><dd>${kortTal(viktOf(k))} kg${!t && p && p.n >= 2 ? `, ${kortTal(viktOf(k) * Math.round(p.n))} kg alla` : ''}</dd>${klad}
      ${t ? `<dt>Var</dt><dd>${var_(t, p)}</dd><dt>Ägare</dt><dd>${agare}</dd>` : p ? `<dt>Ägare</dt><dd class="rader">${agarRader(p.ag, Math.round(p.n))}</dd>` : ''}
      ${gjord}${klen}
      ${t?.halv ? '' : skaffasRader(k)}
    </dl>`;
  },
  klick(el) {
    const b = el.closest<HTMLElement>('[data-sak]');
    if (!b) return false;
    ui.sak = b.dataset.sak!; ui.tab = 'sak';
    return true;
  },
};
