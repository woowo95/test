import * as PIXI from 'pixi.js';
import { BAR, busksort, FALT_STEG, FOREST, GRODOR, isSoil, stadium, Falt, byId, faltAt, faltIndex, faltKlar, HIGH, MATERIAL, Person, T, W, bitAt, bynsMitt, condOf, dorrDef, emberOn, eldXY, eldarOf, getMap, groundOf, husById, inMap, insulation, isKlar, living, stationAt, stationDef, stationKlar, stationerOf, framfor, bordPlatser, tingOf, toaAt, tandTest, blixtTest, roomAt, rumsFunktioner, sakNamn, sjoarna, sovplatser, verbOf, zoneAt, zonesOf, Pile } from '../sim';
import { gorText } from './jakt';
import { iconImg, tecknet } from '../ikoner';
import { $, esc, fmtN, prickar } from './hjalp';
import { outPilesAt, piles, s, ui, uppgiftVid } from './lage';
import { posOf } from './manniskor';
import { iBruk } from './ibruk';
import { djurSynliga } from './vaxter';
import { gaster } from './gaster';
import { valdFilt } from './flikar/filt';
import { sakKey } from './flikar/sak';
import { flyttaHit } from './flikar/station';
import { renderPanel, selectPerson, stangRuta, visa, ärPersonflik, ärRuta } from './panel';
import { renderPorts, stopFollow } from './portratt';
import { satVisaPlats } from './notiser';
import { TS, app, cam, layout, tileAt, toWorld, view, world, zoomAt } from './scen';

// mus och tryck på kartan: välja, dra, zooma, och rutan i hörnet som visar vad som finns under musen
function personAt(gx: number, gy: number) {
  const p = toWorld(gx, gy);
  let best: Person | undefined, bd = 12;
  for (const q of living(s)) { const o = posOf(q), d = Math.hypot(o.x * TS - p.x, o.y * TS - p.y); if (d < bd) { bd = d; best = q; } }
  return best;
}
// ett djur under trycket (steg 3.7.13): de ritas där de är vid tiden som visas
function djurAt(gx: number, gy: number) {
  const p = toWorld(gx, gy);
  let best: number | undefined, bd = 8;
  for (const d of djurSynliga()) { const dd = Math.hypot(d.x * TS - p.x, d.y * TS - 2 - p.y); if (dd < bd) { bd = dd; best = d.id; } }
  return best;
}
// en gäst under trycket (handlaren, en rövare, gaster.ts, steg 4.5.4.12): där hen ritas vid tiden som visas
function gastAt(gx: number, gy: number) {
  const p = toWorld(gx, gy);
  let best: number | undefined, bd = 9;
  for (const g of gaster()) { const d = Math.hypot(g.x * TS - p.x, g.y * TS - p.y); if (d < bd) { bd = d; best = g.id; } }
  return best;
}
// en filt under trycket (steg 4.5.4.13): filten är två rutor bred och ritas lite ovanför sin plats (ui/handel.ts)
function filtAt(gx: number, gy: number) {
  const p = toWorld(gx, gy), x = p.x / TS, y = p.y / TS + 0.5;
  return (s.filtar ?? []).some(f => (f.handlare !== undefined || f.slut > ui.nu) && Math.abs(f.x - x) < 1 && Math.abs(f.y - y) < 0.6) ? { x, y } : undefined;
}
// lägerelden under musen: den första eller en till (steg 4.5.6.8). Ger eldens id (0 = den första) eller undefined
function fireAt(gx: number, gy: number) {
  const p = toWorld(gx, gy);
  for (const f of eldarOf(s)) { const e = eldXY(s, f); if (Math.hypot(e.x * TS + TS / 2 - p.x, e.y * TS + TS / 2 - p.y) < 12) return f === s.fire ? 0 : f.id! + 1; }
  return undefined;
}
function storeAt(gx: number, gy: number) { const c = tileAt(gx, gy); return zoneAt(s, c.x, c.y) + 1; } // 0 = ingen lagerplats

app.stage.eventMode = 'static';
app.stage.hitArea = new PIXI.Rectangle(0, 0, 10000, 10000);
let drag: { x: number; y: number; cx: number; cy: number; moved: number } | null = null;
app.stage.on('pointerdown', e => { drag = { x: e.global.x, y: e.global.y, cx: cam.x, cy: cam.y, moved: 0 }; });
app.stage.on('pointerup', () => { setTimeout(() => { drag = null; }, 0); });
app.stage.on('pointerupoutside', () => { drag = null; });
// ett tryck väljer det som ligger överst: en person, ett djur, elden, en lagerplats, en station, en hög på marken, en toa-hög, ett fält, en stubbe, ett hus eller en sjö. Tom mark avmarkerar
const stubbeAt = (x: number, y: number) => (s.stubbar ?? []).some(k => k.x === x && k.y === y);
// ett träd på rutan (steg 5.1.4.3): en planta, ett ungträd, ett vuxet eller gammalt träd eller en torraka (sim/trad.ts)
const buskeAt = (x: number, y: number) => { const g = groundOf(s), i = y * W + x; return isSoil(g.tiles[i]) && !!busksort(g, i); };
const tradAt = (x: number, y: number) => { const g = groundOf(s), i = y * W + x; return isSoil(g.tiles[i]) && stadium(g, i) !== null; };
// mobil och surfplatta (steg 5.3.7): två fingrar zoomar (nyper) runt punkten mellan dem, och ett tryck visar rutan i hörnet
// som musen annars visar. Medan två fingrar ligger på kartan flyttas den inte, och när de lyfts väljer trycket inget
const fingrar = new Map<number, { x: number; y: number }>();
let nyp: number | undefined, nypt = false;
const avstand = () => { const [a, b] = [...fingrar.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
view.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch') return;
  const r = view.getBoundingClientRect();
  fingrar.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
  if (fingrar.size === 2) { nyp = avstand(); nypt = true; drag = null; }
});
view.addEventListener('pointermove', e => {
  if (!fingrar.has(e.pointerId)) return;
  const r = view.getBoundingClientRect();
  fingrar.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
  if (fingrar.size !== 2 || !nyp) return;
  const d = avstand(), [a, b] = [...fingrar.values()];
  if (d > 0) { stopFollow(); zoomAt(d / nyp, (a.x + b.x) / 2, (a.y + b.y) / 2); nyp = d; }
});
const lyft = (e: PointerEvent) => { fingrar.delete(e.pointerId); if (fingrar.size < 2) nyp = undefined; if (!fingrar.size) setTimeout(() => { nypt = false; }, 0); };
view.addEventListener('pointerup', lyft);
view.addEventListener('pointercancel', lyft);
app.stage.on('pointertap', e => {
  if (drag && drag.moved > 6 || nypt) return;
  const gx = e.global.x, gy = e.global.y, p = personAt(gx, gy), zi = storeAt(gx, gy), c = tileAt(gx, gy);
  if (e.pointerType === 'touch') showHover(gx, gy);
  if (ui.testMode && ui.flytta >= 0) { flyttaHit(c.x, c.y); renderPanel(true); return; } // stationen som flyttas i testläget (steg 3.10.1)
  if (ui.testMode && ui.brandTest) { // branden börjar där man trycker (steg 4.5.6.6); trycket väljer ingen person eller sak
    const r = tandTest(s, c.x, c.y);
    testSvara(r.text);
    if (r.ok) { ui.brandTest = false; brandKnapp(); renderPanel(true); } // brinner inget där är knappen kvar aktiv
    return;
  }
  if (ui.testMode && ui.blixtTest) { testSvara(blixtTest(s, c.x, c.y).text); renderPanel(true); return; } // blixten slår ner där (steg 6.4.7), flera i rad
  const g = p ? undefined : gastAt(gx, gy), dj = p || g !== undefined ? undefined : djurAt(gx, gy);
  if (p) selectPerson(p.id);
  else if (g !== undefined) selectPerson(g); // handlaren och rövarna får samma sida som en bybo (steg 4.5.4.12)
  else if (dj !== undefined) { ui.djurId = dj; visa('djur'); }
  else if (!inMap(c.x, c.y)) avmarkera(); // utanför kartan finns inget att visa
  else if (filtAt(gx, gy)) { ui.filtAt = filtAt(gx, gy)!; ui.byteNr = -1; if (valdFilt()) visa('filt'); }
  else if (fireAt(gx, gy) !== undefined) { const id = fireAt(gx, gy)!; ui.eld = id ? id - 1 : undefined; visa('eld'); }
  else if (zi) valjLager(zi - 1, c);
  else if (stationAt(s, c.x, c.y)) { ui.stationId = stationAt(s, c.x, c.y)!.id; visa('station'); }
  else if (stolAt(c.x, c.y)) { ui.stationId = stolAt(c.x, c.y)!.id; visa('station'); } // stolen vid bänken eller bordet (steg 6.8.10)
  else if (outPilesAt(c.x, c.y).length) { ui.hogAt = c; visa('hog'); }
  else if (toaAt(s, c.x, c.y)) { ui.sak = `f:${c.y * W + c.x}`; visa('sak'); }
  else if (faltAt(s, c.x, c.y)) valjFalt(faltAt(s, c.x, c.y)!, c.x, c.y);
  else if (s.uppsatta?.some(q => q.x === c.x && q.y === c.y)) { ui.sak = `a:${c.y * W + c.x}`; visa('sak'); } // den uppsatta facklan (steg 6.3.7)
  else if (s.stockar?.some(q => Math.floor(q.x) === c.x && Math.floor(q.y) === c.y)) { ui.sak = `v:${s.stockar.find(q => Math.floor(q.x) === c.x && Math.floor(q.y) === c.y)!.id}`; visa('sak'); } // stocken
  else if (stubbeAt(c.x, c.y)) { ui.sak = `u:${c.y * W + c.x}`; visa('sak'); } // stubben (steg 3.10.6)
  else if (husAt(c.x, c.y) !== undefined) { ui.husId = husAt(c.x, c.y)!; visa('hus'); }
  else if (tradAt(c.x, c.y)) { ui.sak = `r:${c.y * W + c.x}`; visa('sak'); } // trädet (steg 5.1.4.3)
  else if (buskeAt(c.x, c.y)) { ui.sak = `b:${c.y * W + c.x}`; visa('sak'); } // busken (steg 6.5.3)
  else if (sjoAt(c.x, c.y) >= 0) { ui.sjoNr = sjoAt(c.x, c.y); visa('sjo'); }
  else avmarkera();
});
// raden under testknapparna (steg 4.5.6.4): vad som hände, utan ordet Testläget, med stor bokstav först
export function testSvara(text: string) {
  const el = document.getElementById('testSvar');
  if (!el) return;
  const t = text.replace(/^Testläget: /, '');
  el.textContent = t.charAt(0).toUpperCase() + t.slice(1);
}
// brandknappen lyser medan den är aktiv
export function brandKnapp() {
  document.querySelector('#testSkicka button[data-brand]')?.classList.toggle('aktiv', ui.testMode && ui.brandTest);
  document.querySelector('#testSkicka button[data-blixt]')?.classList.toggle('aktiv', ui.testMode && ui.blixtTest);
}
// ett tryck där inget finns: personen släpps och personrutan stängs
function avmarkera() {
  if (ärRuta(ui.tab)) { stangRuta(); renderPanel(true); return; } // först stängs rutan (steg 5.3.5.1)
  if (ui.selected === undefined && !ärPersonflik(ui.tab)) return;
  ui.selected = undefined; stopFollow();
  if (ärPersonflik(ui.tab)) ui.tab = undefined;
  renderPanel(true); renderPorts();
}
// stolen på rutan (steg 6.8.10): sittplatsen framför en bänk med stol eller en plats vid ett bord; den markeras som sin möbel
function stolAt(x: number, y: number) {
  if (!s.stationer?.length || !inMap(x, y)) return undefined;
  return stationerOf(s).find(t => (stationDef(t.k)?.sitt && framfor(t).some(q => q.x === x && q.y === y)) || bordPlatser(t).some(q => q.x === x && q.y === y));
}
// lagret (steg 2.10.17): första trycket visar lagerplatsen, och varje nytt tryck på samma ruta visar nästa sak på rutan, en
// i taget (stackarna och redskapen, sedan förvaringen som står där), och efter den sista lagerplatsen igen
let lagerVal: { x: number; y: number; i: number } | undefined;
function valjLager(zi: number, c: { x: number; y: number }) {
  const st = stationAt(s, c.x, c.y);
  const val: (() => void)[] = [
    ...piles().filter(q => q.x === c.x && q.y === c.y).map(q => () => { ui.sak = sakKey(q); visa('sak'); }),
    ...st ? [() => { ui.stationId = st.id; visa('station'); }] : [],
  ];
  const v = lagerVal, visas = v && v.x === c.x && v.y === c.y && (v.i < 0 ? ui.tab === 'lager' && ui.lagerNr === zi : ui.tab === 'sak' || ui.tab === 'station');
  const i = visas && v.i + 1 < val.length ? v.i + 1 : -1;
  lagerVal = { x: c.x, y: c.y, i };
  if (i < 0) { ui.lagerNr = zi; visa('lager'); } else val[i]();
}
// fältet (steg 2.10.14): ett tryck markerar fältet, och ett tryck till på en ruta i det markerade fältet markerar rutan, med
// grödan om det växer något där och marken (steg 3.10.6)
function valjFalt(f: Falt, x: number, y: number) {
  const k = faltIndex(f, x, y);
  ui.faltRuta = ui.tab === 'falt' && ui.faltId === f.id && ui.faltRuta !== k ? k : -1;
  ui.faltId = f.id; visa('falt');
}
app.stage.on('pointermove', e => {
  const gx = e.global.x, gy = e.global.y;
  if (fingrar.size >= 2) return;
  if (drag && (e.buttons & 1 || e.pointerType === 'touch')) {
    const dx = gx - drag.x, dy = gy - drag.y;
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    if (drag.moved > 6) { stopFollow(); cam.x = drag.cx - dx / world.scale.x; cam.y = drag.cy - dy / world.scale.y; layout(); }
    return;
  }
  showHover(gx, gy);
  ui.hovered = personAt(gx, gy)?.id;
  const c = tileAt(gx, gy);
  view.style.cursor = ui.hovered || djurAt(gx, gy) !== undefined || gastAt(gx, gy) !== undefined || !!filtAt(gx, gy) || inMap(c.x, c.y) && (fireAt(gx, gy) !== undefined || storeAt(gx, gy) || outPilesAt(c.x, c.y).length || toaAt(s, c.x, c.y) || faltAt(s, c.x, c.y) || stubbeAt(c.x, c.y) || husAt(c.x, c.y) !== undefined || stationAt(s, c.x, c.y) || stolAt(c.x, c.y) || tradAt(c.x, c.y) || buskeAt(c.x, c.y) || !!s.uppsatta?.some(q => q.x === c.x && q.y === c.y) || !!s.stockar?.some(q => Math.floor(q.x) === c.x && Math.floor(q.y) === c.y)) ? 'pointer' : 'grab';
});
view.addEventListener('wheel', e => { e.preventDefault(); const r = view.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.06 : 1 / 1.06, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
view.addEventListener('pointerleave', () => { $('hoverBox').hidden = true; ui.hovered = undefined; });
$('zIn').addEventListener('click', () => zoomAt(1.4));
$('zOut').addEventListener('click', () => zoomAt(1 / 1.4));
// en notis visar sin plats på kartan (steg 5.4.3.2)
satVisaPlats((x, y) => { stopFollow(); cam.zoom = Math.max(cam.zoom, 2.4); cam.x = (x + 0.5) * TS; cam.y = (y + 0.5) * TS; layout(); });
$('zHome').addEventListener('click', () => { stopFollow(); cam.zoom = 2.4; const f = bynsMitt(s); cam.x = f.x * TS; cam.y = f.y * TS; layout(); });

// ---------- rutan i hörnet: vad som finns under musen ----------
// bara underlaget och det som står där; vad som växer och lever på platsen finns i värmekartorna
const stackTxt = (p: Pile) => `${sakNamn(p.k)} ${p.max === 1 ? '' : `${fmtN(p.n)} st, `}skick ${Math.round(condOf(p) * 100)} %`;
// huset på rutan: en vägg eller ett golv i det, eller rummet under dess tak
const sjoAt = (x: number, y: number) => inMap(x, y) ? sjoarna(s.seed).id[y * W + x] : -1;
const husAt = (x: number, y: number) => bitAt(s, x, y)?.hus ?? roomAt(s, x, y)?.hus;
function showHover(gx: number, gy: number) {
  const box = $('hoverBox'), { x, y } = tileAt(gx, gy);
  if (!inMap(x, y)) { box.hidden = true; return; }
  const m = getMap(s.seed), g = groundOf(s), i = y * W + x, t = m.tiles[i], tr = g.trees[i], c = g.cover[i];
  const soil = t === T.Gras || t === T.Skog;
  const ground = g.tiles[i] === T.Lera ? 'Torr sjöbotten' : t === T.Vatten ? 'Vatten' : t === T.Sand ? 'Sand' : t === T.Sten ? 'Sten' : tr >= FOREST ? 'Skogsmark' : busksort(g, i) ? busksort(g, i)!.namn : c >= HIGH ? 'Högt gräs' : c >= BAR ? 'Kort gräs' : 'Bar jord, stig';
  const rows: string[] = [`<b>${ground}</b>${soil && tr > 0 ? ` · ${tr >= FOREST ? 'skog' : tr >= 0.25 ? 'ungskog' : 'plantor'}` : ''}`];
  const bu = soil ? busksort(g, i) : undefined; if (bu) rows.push(bu.text); // busken (steg 6.5.3)
  for (const f of eldarOf(s)) { const e = eldXY(s, f); if (x === e.x && y === e.y) rows.push(`${f === s.fire ? 'Elden' : 'En lägereld'} (${f.lit ? 'brinner' : emberOn(s, f) ? 'glöder' : 'släckt'})`); }
  const zi = zoneAt(s, x, y);
  if (zi >= 0) {
    const pl = piles().find(q => q.x === x && q.y === y);
    rows.push(`<b>${esc(zonesOf(s)[zi].namn ?? 'Lagret')}</b> · ${pl ? stackTxt(pl) : 'tom ruta'}`);
  }
  const ute = outPilesAt(x, y);
  if (ute.length) rows.push(`<b>${ute.some(q => !q.stored) ? 'På marken' : 'Bredvid lagret'}</b> · ${ute.map(stackTxt).join(', ')}`);
  const log = (s.stockar ?? []).find(k => Math.floor(k.x) === x && Math.floor(k.y) === y);
  if (log) rows.push(`Fällt träd, ca ${Math.ceil(log.ved)} ved kvar`);
  if ((s.stubbar ?? []).some(k => k.x === x && k.y === y)) rows.push('Stubbe efter ett fällt träd');
  const fa = s.uppsatta?.find(q => q.x === x && q.y === y); // den uppsatta facklan (steg 6.3.7)
  if (fa) rows.push(`Uppsatt fackla, ${fa.tand ? 'brinner' : 'släckt'}, ${Math.round(fa.c * 100)} % kvar`);
  const falt = faltAt(s, x, y); // fältet (steg 2.10.3): ägaren, grödan och hur långt det kommit
  if (falt) {
    const ag = byId(s, falt.agare), groda = falt.groda && (falt.steg === 'vaxer' || falt.steg === 'mogen') ? GRODOR[falt.groda] : undefined;
    rows.push(`${iconImg(groda?.sak ?? 'odling', 12)} <b>Fält</b>${ag ? ` (${esc(ag.name)})` : ''} · ${groda ? groda.namn.toLowerCase() + ', ' : ''}${FALT_STEG[falt.steg].namn.toLowerCase()}${falt.steg === 'mogen' ? '' : `, ${Math.round(faltKlar(falt) * 100)} %`}`);
  }
  const st = stationAt(s, x, y), sd = st && stationDef(st.k);
  if (st && sd) {
    const vid = Object.entries(sd.vid ?? {}).map(([slag, n]) => {
      const har = tingOf(s).filter(k => k.vid === st.id && k.k === slag), ligger = har.filter(k => k.hos === undefined && k.lass === undefined).length;
      return `${iconImg(slag, 12)} ${ligger} av ${n} ligger här${har.length > ligger ? ', en används' : ''}`;
    }).join(' · ');
    const om = isKlar(st) ? vid : `byggs, ${Math.round(stationKlar(st) * 100)} %`, ib = isKlar(st) ? iBruk(st) : undefined;
    const bruk = ib ? `${esc(ib.p.name)} ${esc(verbOf(ib.p.task!.act))} ${ib.saker.map(k => iconImg(k, 12)).join('')}` : ''; // den som arbetar där och med vad (steg 3.10.3)
    rows.push(`${iconImg(sd.ikon, 12)} <b>${esc(sd.namn)}</b>${om ? ' · ' + om : ''}${bruk ? ' · ' + bruk : ''}`);
  }
  const bit = bitAt(s, x, y);
  if (bit) {
    const M = MATERIAL[bit.m], hus = husById(s, bit.hus);
    const st = bit.b < 1 ? `byggs, ${Math.round(bit.b * 100)} %${M.n ? `, material ${Math.round(bit.mat)} av ${M.n} ${sakNamn(M.item!).toLowerCase()}` : ''}` : M.slit ? `skick ${Math.round(bit.c * 100)} %` : '';
    const d = dorrDef(bit.dorr); // en dörr i öppningen (byggnad.ts)
    rows.push(`${iconImg(d?.ikon ?? M.ikon ?? '', 12)} <b>${esc(d?.namn ?? M.namn)}</b>${hus ? ` i ${esc(hus.namn.toLowerCase())}` : ''}${st ? ' · ' + st : ''}${d ? ` · släpper ut ${Math.round(d.tat * 100)} % mindre värme än en öppning` : ''}`);
  }
  const rum = roomAt(s, x, y);
  if (rum) {
    const hus = husById(s, rum.hus), n = sovplatser(s, rum), fns = hus ? rumsFunktioner(s, hus).map(f => tecknet(f.ikon, f.ikon, 12)).join('') : '';
    rows.push(`Under tak${hus ? ` (${esc(hus.namn)})` : ''}${fns ? ' ' + fns : ''} · ${n ? `${n} sovplatser · ` : ''}håller värmen ${Math.round(insulation(s, rum) * 100)} %`);
  }
  const here = living(s).filter(p => { const o = posOf(p); return Math.floor(o.x) === x && Math.floor(o.y) === y; });
  if (here.length) rows.push(here.map(p => `${esc(p.name)}${prickar(p, true)} (${(t => t ? gorText(p, t).toLowerCase() : 'vilar')(uppgiftVid(p))})`).join(', '));
  box.innerHTML = rows.map(r => `<p>${r}</p>`).join('');
  box.hidden = false;
}

// tangentbordet (steg 5.5.7): det man trycker på som inte är en knapp eller länk (rubrikerna som fälls ut, raderna med
// data-hjalp, symbolerna med tabindex) nås med Tab, och Enter eller mellanslag gör samma sak som ett tryck
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target as HTMLElement | null;
  if (!el || el.matches('button, a, input, select, textarea, summary') || !(el.matches('[role="button"], .klick') || el.tabIndex >= 0 && el.hasAttribute('tabindex'))) return;
  e.preventDefault();
  el.click();
});
