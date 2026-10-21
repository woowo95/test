import * as PIXI from 'pixi.js';
import { BAR, FOREST, FYND, FYND_IDS, H, HIGH, MATERIAL, Person, T, W, bitAt, campCenter, condOf, emberOn, fyndAt, getMap, groundOf, housesOf, vaxerAt, insulation, living, roomAt, sakNamn, taskName, zoneAt, zonesOf, Pile } from '../sim';
import { iconImg } from '../ikoner';
import { $, esc, fmtN } from './hjalp';
import { outPilesAt, piles, s, ui } from './lage';
import { selectPerson, visa } from './panel';
import { stopFollow } from './portratt';
import { TS, app, cam, layout, tileAt, toWorld, view, world, zoomAt } from './scen';

// mus och tryck på kartan: välja, dra, zooma, och rutan i hörnet som visar vad som finns under musen
function personAt(gx: number, gy: number) {
  const p = toWorld(gx, gy);
  let best: Person | undefined, bd = 12;
  for (const q of living(s)) { const d = Math.hypot(q.x * TS - p.x, q.y * TS - p.y); if (d < bd) { bd = d; best = q; } }
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
// ett tryck väljer det som ligger överst: en person, elden, en lagerplats eller en hög på marken
app.stage.on('pointertap', e => {
  if (drag && drag.moved > 6) return;
  const gx = e.global.x, gy = e.global.y, p = personAt(gx, gy), zi = storeAt(gx, gy), c = tileAt(gx, gy);
  if (p) selectPerson(p.id);
  else if (fireAt(gx, gy)) visa('eld');
  else if (zi) { ui.lagerNr = zi - 1; visa('lager'); }
  else if (outPilesAt(c.x, c.y).length) { ui.hogAt = c; visa('hog'); }
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
  view.style.cursor = ui.hovered || fireAt(gx, gy) || storeAt(gx, gy) || outPilesAt(c.x, c.y).length ? 'pointer' : 'grab';
});
view.addEventListener('wheel', e => { e.preventDefault(); const r = view.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
view.addEventListener('pointerleave', () => { $('hoverBox').hidden = true; });
$('zIn').addEventListener('click', () => zoomAt(1.4));
$('zOut').addEventListener('click', () => zoomAt(1 / 1.4));
$('zHome').addEventListener('click', () => { stopFollow(); cam.zoom = 2.4; const f = campCenter(s); cam.x = f.x * TS; cam.y = f.y * TS; layout(); });

// ---------- rutan i hörnet: vad som finns under musen ----------
const RICH_WORD = (v: number) => v >= 0.6 ? 'gott om' : v >= 0.3 ? 'en del' : v >= 0.08 ? 'lite' : 'nästan inget';
const pileTxt = (p: Pile) => `${sakNamn(p.k)} ${p.max === 1 ? '' : `${fmtN(p.n)} st, `}skick ${Math.round(condOf(p) * 100)} %`;
function showHover(gx: number, gy: number) {
  const box = $('hoverBox'), { x, y } = tileAt(gx, gy);
  if (x < 0 || y < 0 || x >= W || y >= H) { box.hidden = true; return; }
  const m = getMap(s.seed), g = groundOf(s), i = y * W + x, t = m.tiles[i], tr = g.trees[i], c = g.cover[i];
  const soil = t === T.Gras || t === T.Skog;
  const ground = t === T.Vatten ? 'Vatten' : t === T.Sand ? 'Sand' : t === T.Sten ? 'Sten' : tr >= FOREST ? 'Skogsmark' : c >= HIGH ? 'Högt gräs' : c >= BAR ? 'Kort gräs' : 'Bar jord, stig';
  const rows: string[] = [`<b>${ground}</b>${soil && tr > 0 ? ` · ${tr >= FOREST ? 'skog' : tr >= 0.25 ? 'ungskog' : 'plantor'}` : ''}`];
  // vad lagren har på rutan (värmekartorna): bär och rötter, svamp, vilt, fisk och flinta
  const finds: string[] = [];
  if (!bitAt(s, x, y)) for (const k of FYND_IDS) {
    const v = fyndAt(s, k, i) / FYND[k].topp, g = vaxerAt(s, k, i) / FYND[k].topp; // finns nu, växer här
    if (g >= (k === 'flinta' ? 0.3 : 0.04)) finds.push(`${iconImg(FYND[k].ikon, 12)} ${esc(FYND[k].namn)}: ${RICH_WORD(v)}${g > v + 0.25 ? ' (plockat, växer tillbaka)' : ''}`);
  }
  if (finds.length) rows.push(finds.join('<br>'));
  if (x === m.fire.x && y === m.fire.y) rows.push(`Elden (${s.fire.lit ? 'brinner' : emberOn(s) ? 'glöder' : 'släckt'})`);
  const zi = zoneAt(s, x, y);
  if (zi >= 0) {
    const pl = piles().find(q => q.x === x && q.y === y);
    rows.push(`<b>${esc(zonesOf(s)[zi].namn ?? 'Lagret')}</b> · ${pl ? pileTxt(pl) : 'tom ruta'}`);
  }
  const ute = outPilesAt(x, y);
  if (ute.length) rows.push(`<b>${ute.some(q => !q.stored) ? 'På marken' : 'Bredvid lagret'}</b> · ${ute.map(pileTxt).join(', ')}`);
  const log = (s.stockar ?? []).find(k => Math.floor(k.x) === x && Math.floor(k.y) === y);
  if (log) rows.push(`Fällt träd, ca ${Math.ceil(log.ved)} ved kvar`);
  if ((s.stubbar ?? []).some(k => k.x === x && k.y === y)) rows.push('Stubbe efter ett fällt träd');
  const bit = bitAt(s, x, y);
  if (bit) {
    const M = MATERIAL[bit.m], hus = housesOf(s).find(h => h.id === bit.hus);
    const st = bit.b < 1 ? `byggs, ${Math.round(bit.b * 100)} %${M.n ? `, material ${Math.round(bit.mat)} av ${M.n} ${sakNamn(M.item!).toLowerCase()}` : ''}` : M.slit ? `skick ${Math.round(bit.c * 100)} %` : '';
    rows.push(`${iconImg(bit.k === 'vagg' ? 'risvagg' : bit.m === 'ho' ? 'hogolv' : '', 12)} <b>${esc(M.namn)}</b>${hus ? ` i ${esc(hus.namn.toLowerCase())}` : ''}${st ? ' · ' + st : ''}`);
  }
  const rum = roomAt(s, x, y);
  if (rum) { const hus = housesOf(s).find(h => h.id === rum.hus); rows.push(`Under tak${hus ? ` (${esc(hus.namn)})` : ''} · ${rum.tiles.length} sovplatser · håller värmen ${Math.round(insulation(s, rum) * 100)} %`); }
  const here = living(s).filter(p => Math.floor(p.x) === x && Math.floor(p.y) === y);
  if (here.length) rows.push(here.map(p => `${esc(p.name)} (${p.task ? taskName(p.task).toLowerCase() : 'vilar'})`).join(', '));
  box.innerHTML = rows.map(r => `<p>${r}</p>`).join('');
  box.hidden = false;
}
