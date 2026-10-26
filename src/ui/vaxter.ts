import { FYND, H, HOUR, W, ageIndex, djurOf, fyndAt, getMap } from '../sim';
import { s, ui } from './lage';
import { Ikoner, TS, djurLayer, plantG } from './scen';

// det som växer just nu, diskret i vanliga vyn: små bärbuskar och svampar där det finns något att hämta.
// Var det kan växa syns inte, inte heller rötterna under jorden. Ritas om en gång i timmen. Kaninerna ritas varje
// bildruta vid tiden som visas (ui.nu), som folket, eftersom de skuttar omkring (djur.ts).
let ritad = '';
// en fast plats i rutan för varje sak, så att buskarna inte hoppar runt när kartan ritas om
const plats = (i: number, j: number) => { const h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return h - Math.floor(h); };
export function drawPlants(force = false) {
  const key = `${s.seed},${Math.floor(s.now / HOUR)},${ageIndex(s)}`;
  if (!force && key === ritad) return;
  ritad = key;
  plantG.clear();
  const sh = getMap(s.seed).shade;
  const bar = FYND.bar, kant = FYND.kantarell, spin = FYND.spindling;
  for (let i = 0; i < W * H; i++) {
    const x = (i % W) * TS, y = Math.floor(i / W) * TS;
    // bärbuske: en mörkgrön tuva med några prickar i bärens färg, två buskar där det finns mycket
    const b = fyndAt(s, 'bar', i) / bar.topp;
    if (b >= 0.25) {
      const n = b >= 0.6 ? 2 : 1;
      for (let j = 0; j < n; j++) {
        const bx = x + 3 + plats(i, j) * 10, by = y + 4 + plats(i, j + 5) * 9, r = 1.8 + Math.min(1, b) * 0.8;
        plantG.beginFill(0x3f6a34, 0.85).drawCircle(bx, by, r).endFill();
        plantG.beginFill(bar.farg, 0.85);
        for (let k = 0; k < 3; k++) plantG.drawCircle(bx + (plats(i, j * 7 + k) - 0.5) * r * 1.4, by + (plats(i, j * 7 + k + 3) - 0.5) * r * 1.4, 0.7);
        plantG.endFill();
      }
    }
    // svamp: en liten fot och hatt i svampens färg, dämpad mot marken. På våren växer det lite, då syns färre och mindre
    for (const [k, f, j0] of [['kantarell', kant, 10], ['spindling', spin, 20]] as const) {
      const v = fyndAt(s, k, i) / f.topp;
      if (v < 0.1) continue;
      const mx = x + 3 + plats(i, j0) * 10, my = y + 4 + plats(i, j0 + 1) * 9, sz = 0.7 + Math.min(1, v) * 0.5 + sh[i] * 0.2;
      plantG.beginFill(0xe8dcc0, 0.7).drawRect(mx - 0.4 * sz, my, 0.8 * sz, 1.6 * sz).endFill();
      plantG.beginFill(f.farg, 0.65).drawEllipse(mx, my, 1.4 * sz, 0.8 * sz).endFill();
    }
  }
}

const djurIkoner = new Ikoner(djurLayer);
export function drawAnimals() {
  djurIkoner.start();
  for (const d of djurOf(s, ui.nu)) djurIkoner.add(d.art, d.x * TS - 4, d.y * TS - 6, 1);
  djurIkoner.end();
}
