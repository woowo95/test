import * as PIXI from 'pixi.js';
import { BAR, FALT_STEG, FOREST, GRODOR, byId, faltAt, faltKlar, HIGH, MATERIAL, MIN, Person, T, W, bitAt, campCenter, condOf, dorrDef, emberOn, getMap, groundOf, husById, inMap, insulation, isKlar, living, stationAt, stationDef, tingOf, toaAt, roomAt, rumsFunktioner, sakNamn, sjoarna, sovplatser, taskName, zoneAt, zonesOf, Pile } from '../sim';
import { iconImg, tecknet } from '../ikoner';
import { $, esc, fmtN, prickar } from './hjalp';
import { outPilesAt, piles, s, ui } from './lage';
import { posOf } from './manniskor';
import { renderPanel, selectPerson, visa, ärPersonflik } from './panel';
import { renderPorts, stopFollow } from './portratt';
import { TS, app, cam, layout, tileAt, toWorld, view, world, zoomAt } from './scen';

// mus och tryck på kartan: välja, dra, zooma, och rutan i hörnet som visar vad som finns under musen
function personAt(gx: number, gy: number) {
  const p = toWorld(gx, gy);
  let best: Person | undefined, bd = 12;
  for (const q of living(s)) { const o = posOf(q), d = Math.hypot(o.x * TS - p.x, o.y * TS - p.y); if (d < bd) { bd = d; best = q; } }
  return best;
}
function fireAt(gx: number, gy: number) {
  const p = toWorld(gx, gy), f = getMap(s.seed).fire;
  return Math.hypot(f.x * TS + TS / 2 - p.x, f.y * TS + TS / 2 - p.y) < 12;
}
function storeAt(gx: number, gy: number) { const c = tileAt(gx, gy); return zoneAt(s, c.x, c.y) + 1; } // 0 = ingen lagerplats

app.stage.eventMode = 'static';
app.stage.hitArea = new PIXI.Rectangle(0, 0, 10000, 10000);
let drag: { x: number; y: number; cx: number; cy: number; moved: number } | null = null;
app.stage.on('pointerdown', e => { drag = { x: e.global.x, y: e.global.y, cx: cam.x, cy: cam.y, moved: 0 }; });
app.stage.on('pointerup', () => { setTimeout(() => { drag = null; }, 0); });
app.stage.on('pointerupoutside', () => { drag = null; });
// ett tryck väljer det som ligger överst: en person, elden, en lagerplats, en station, en hög på marken, en toa-hög, ett hus eller en sjö. Tom mark avmarkerar
app.stage.on('pointertap', e => {
  if (drag && drag.moved > 6) return;
  const gx = e.global.x, gy = e.global.y, p = personAt(gx, gy), zi = storeAt(gx, gy), c = tileAt(gx, gy);
  if (p) selectPerson(p.id);
  else if (fireAt(gx, gy)) visa('eld');
  else if (zi) { ui.lagerNr = zi - 1; visa('lager'); }
  else if (stationAt(s, c.x, c.y)) { ui.stationId = stationAt(s, c.x, c.y)!.id; visa('station'); }
  else if (outPilesAt(c.x, c.y).length) { ui.hogAt = c; visa('hog'); }
  else if (toaAt(s, c.x, c.y)) { ui.sak = `f:${c.y * W + c.x}`; visa('sak'); }
  else if (husAt(c.x, c.y) !== undefined) { ui.husId = husAt(c.x, c.y)!; visa('hus'); }
  else if (sjoAt(c.x, c.y) >= 0) { ui.sjoNr = sjoAt(c.x, c.y); visa('sjo'); }
  else if (ui.selected !== undefined || ärPersonflik(ui.tab)) {
    ui.selected = undefined; stopFollow();
    if (ärPersonflik(ui.tab)) ui.tab = 'folk';
    renderPanel(true); renderPorts();
  }
});
app.stage.on('pointermove', e => {
  const gx = e.global.x, gy = e.global.y;
  if (drag && (e.buttons & 1 || e.pointerType === 'touch')) {
    const dx = gx - drag.x, dy = gy - drag.y;
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    if (drag.moved > 6) { stopFollow(); cam.x = drag.cx - dx / world.scale.x; cam.y = drag.cy - dy / world.scale.y; layout(); }
    return;
  }
  showHover(gx, gy);
  ui.hovered = personAt(gx, gy)?.id;
  const c = tileAt(gx, gy);
  view.style.cursor = ui.hovered || fireAt(gx, gy) || storeAt(gx, gy) || outPilesAt(c.x, c.y).length || toaAt(s, c.x, c.y) || husAt(c.x, c.y) !== undefined || stationAt(s, c.x, c.y) ? 'pointer' : 'grab';
});
view.addEventListener('wheel', e => { e.preventDefault(); const r = view.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.06 : 1 / 1.06, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
view.addEventListener('pointerleave', () => { $('hoverBox').hidden = true; ui.hovered = undefined; });
$('zIn').addEventListener('click', () => zoomAt(1.4));
$('zOut').addEventListener('click', () => zoomAt(1 / 1.4));
$('zHome').addEventListener('click', () => { stopFollow(); cam.zoom = 2.4; const f = campCenter(s); cam.x = f.x * TS; cam.y = f.y * TS; layout(); });

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
  const ground = t === T.Vatten ? 'Vatten' : t === T.Sand ? 'Sand' : t === T.Sten ? 'Sten' : tr >= FOREST ? 'Skogsmark' : c >= HIGH ? 'Högt gräs' : c >= BAR ? 'Kort gräs' : 'Bar jord, stig';
  const rows: string[] = [`<b>${ground}</b>${soil && tr > 0 ? ` · ${tr >= FOREST ? 'skog' : tr >= 0.25 ? 'ungskog' : 'plantor'}` : ''}`];
  if (x === m.fire.x && y === m.fire.y) rows.push(`Elden (${s.fire.lit ? 'brinner' : emberOn(s) ? 'glöder' : 'släckt'})`);
  const zi = zoneAt(s, x, y);
  if (zi >= 0) {
    const pl = piles().find(q => q.x === x && q.y === y);
    rows.push(`<b>${esc(zonesOf(s)[zi].namn ?? 'Lagret')}</b> · ${pl ? stackTxt(pl) : 'tom ruta'}`);
  }
  const ute = outPilesAt(x, y);
  if (ute.length) rows.push(`<b>${ute.some(q => !q.stored) ? 'På marken' : 'Bredvid lagret'}</b> · ${ute.map(stackTxt).join(', ')}`);
  const log = (s.stockar ?? []).find(k => Math.floor(k.x) === x && Math.floor(k.y) === y);
  if (log) rows.push(`Fällt träd, ca ${Math.ceil(log.ved)} trä kvar`);
  if ((s.stubbar ?? []).some(k => k.x === x && k.y === y)) rows.push('Stubbe efter ett fällt träd');
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
    const om = isKlar(st) ? vid : `byggs, ${Math.round(100 - st.kvar / (sd.min * MIN) * 100)} %`;
    rows.push(`${iconImg(sd.ikon, 12)} <b>${esc(sd.namn)}</b>${om ? ' · ' + om : ''}`);
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
  if (here.length) rows.push(here.map(p => `${esc(p.name)}${prickar(p, true)} (${p.task ? taskName(p.task).toLowerCase() : 'vilar'})`).join(', '));
  box.innerHTML = rows.map(r => `<p>${r}</p>`).join('');
  box.hidden = false;
}
