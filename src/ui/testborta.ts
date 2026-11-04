import { stationById, taBortLager, taBortStation, zonesOf, type State, type Station, type Zone } from '../sim';
import { ui } from './lage';

// testläget (steg 4.5.7.8): det som tas bort i kopian (stationer, möbler och lagerplatser) minns, och tas bort ur den riktiga
// byn r också när testläget slutar, med samma funktioner. En station känns igen på sitt id, en lagerplats på var den låg.
// Det som låg i en kista, en hylla eller på lagerplatsen blir liggande som högar där. Allt annat i testläget var en kopia
export function taBortITest(s: State, st: Station) { taBortStation(s, st); ui.testBorta.st.push(st.id); }
export function taBortLagerITest(s: State, z: Zone) {
  if (!taBortLager(s, z)) return false;
  ui.testBorta.lager.push({ x: z.x, y: z.y, w: z.w, h: z.h });
  return true;
}
export function testBortaIByn(r: State) {
  for (const id of ui.testBorta.st) { const st = stationById(r, id); if (st) taBortStation(r, st); }
  for (const z of ui.testBorta.lager) { const q = zonesOf(r).find(q => q.x === z.x && q.y === z.y && q.w === z.w && q.h === z.h); if (q) taBortLager(r, q); }
  ui.testBorta = { st: [], lager: [] };
}
