// Träden skymmer inte (steg 5.1.4.6): samlar det som ska synas genom kronorna, folk, djur, saker på marken, stationer,
// husen och det man valt, och låter trad.ts tona kronorna framför dem
import { H, W, alive, housesOf, living, stationerOf } from '../sim';
import { piles, s, ui } from './lage';
import { posOf } from './manniskor';
import { djurSynliga } from './vaxter';
import { tonaTrad } from './trad';

export function drawTona() {
  const pt: { x: number; y: number }[] = [], nara: { x: number; y: number }[] = [];
  for (const p of living(s)) if (alive(p)) { const q = posOf(p); pt.push(q); nara.push(q); } // en ring runt folket (steg 6.8.14)
  for (const d of djurSynliga()) pt.push({ x: d.x, y: d.y });
  for (const p of piles()) if (!p.stored) pt.push({ x: p.x, y: p.y });
  for (const st of stationerOf(s)) pt.push({ x: st.x, y: st.y });
  for (const h of housesOf(s)) for (let y = h.y; y < h.y + h.h; y++) for (let x = h.x; x < h.x + h.w; x++) pt.push({ x, y });
  if (ui.sak.startsWith('r:')) { const i = Number(ui.sak.slice(2)); pt.push({ x: i % W, y: Math.floor(i / W) }); nara.push({ x: i % W, y: Math.floor(i / W) }); }
  tonaTrad(pt, nara, W, H);
}
