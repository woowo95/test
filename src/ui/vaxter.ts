import { Djur, FYND, H, HOUR, SEC, W, ageIndex, djurOf, fyndAt, getMap, living, plockOf, tornadoAndel, tornadoPos, vargarOf } from '../sim';
import { s, ui, vidNyBy } from './lage';
import { Ikoner, TS, djurFx, djurLayer, djurMarkLayer, plantG } from './scen';
import { jagade, samlaJakt } from './jakt';
import { posOf } from './manniskor';

// det som växer just nu, diskret i vanliga vyn: små bärbuskar och svampar där det finns något att hämta.
// Var det kan växa syns inte, inte heller rötterna under jorden. Ritas om varje timme och när någon tagit något. Kaninerna ritas varje
// bildruta vid tiden som visas (ui.nu), som folket, eftersom de skuttar omkring (djur.ts).
let ritad = '';
// en fast plats i rutan för varje sak, så att buskarna inte hoppar runt när kartan ritas om
const plats = (i: number, j: number) => { const h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return h - Math.floor(h); };
export function drawPlants(force = false) {
  const key = `${s.seed},${Math.floor(s.now / HOUR)},${ageIndex(s)},${plockOf(s)}`;
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

const djurIkoner = new Ikoner(djurLayer), larmIkoner = new Ikoner(djurMarkLayer);
// Kaninerna flyr synligt (Björn efter v159): i simuleringen hoppar en kanin undan på en gång när någon kommer nära. Här
// springer den dit, och den som flyr har ett utropstecken och damm efter sig. Den hoppar undan från där folket syns
// (posOf). Varje kanin som syns minns var den ritades senast
const FLYR = 5, ATER = 1.5, LANGT = 1.8, LARM = 2 * SEC; // rutor i sekunden när den flyr och när den går tillbaka; ett skutt längre än LANGT är en flykt
const visad = new Map<number, { x: number; y: number; t: number; larm: number }>();
vidNyBy.push(() => visad.clear());
let synliga: Djur[] = [];
// djuren där de syns just nu (det man trycker på, interaktion.ts, och djurfliken)
export const djurSynliga = () => synliga;
export function drawAnimals() {
  samlaJakt();
  djurIkoner.start(); larmIkoner.start(); djurFx.clear();
  const folk = living(s).map(posOf), jagas = jagade(), sedda = new Set<number>(), ut: Djur[] = [];
  const jagadId = new Set(jagas.kaniner.map(k => k.id));
  for (const k of jagas.kaniner) { // den som jagas just nu ritas som jakten går (jakt.ts)
    const e = { x: k.x, y: k.y, t: ui.nu, larm: k.larm ? ui.nu + LARM : visad.get(k.id)?.larm ?? 0 };
    visad.set(k.id, e); sedda.add(k.id);
    djurIkoner.add(k.ligger ? 'kanin_dod' : 'kanin', k.x * TS - 4, k.y * TS - 6, 1);
    if (!k.ligger) ut.push({ id: k.id, art: 'kanin', x: k.x, y: k.y, grupp: -1 });
    if (e.larm > ui.nu) larm(k.x, k.y);
  }
  for (const d of djurOf(s, ui.nu, folk)) {
    if (jagadId.has(d.id)) continue;
    const e = visad.get(d.id), dt = e ? (ui.nu - e.t) / SEC : Infinity;
    let x = d.x, y = d.y, l = e?.larm ?? 0;
    if (e && dt >= 0 && dt < 30) {
      const dd = Math.hypot(d.x - e.x, d.y - e.y);
      if (dd > LANGT * 0.5) { // längre än ett skutt: den springer dit, fort om den flyr från någon
        const nara = folk.reduce((m, p) => Math.min(m, Math.hypot(p.x - e.x, p.y - e.y)), Infinity), flyr = nara < 4 && folk.every(p => Math.hypot(p.x - d.x, p.y - d.y) >= nara);
        const steg = Math.min(dd, (flyr ? FLYR : ATER) * dt);
        x = e.x + (d.x - e.x) / dd * steg; y = e.y + (d.y - e.y) / dd * steg;
        if (flyr) { l = ui.nu + LARM; damm(x, y, (d.x - e.x) / dd, (d.y - e.y) / dd); }
      }
    }
    visad.set(d.id, { x, y, t: ui.nu, larm: l }); sedda.add(d.id);
    djurIkoner.add('kanin', x * TS - 4, y * TS - 6, 1);
    if (l > ui.nu) larm(x, y);
    ut.push({ ...d, x, y });
  }
  for (const id of visad.keys()) if (!sedda.has(id)) visad.delete(id);
  for (const d of vargarOf(s)) { djurIkoner.add(d.art, d.x * TS - 4, d.y * TS - 6, 1); ut.push(d); } // vargarna med den fällda vargens symbol tills vidare (steg 3.7.1)
  if (s.tornado) { const p = tornadoPos(s.tornado, tornadoAndel(s.tornado, ui.nu)); djurIkoner.add('tornado', p.x * TS - 16, p.y * TS - 44, 1); } // tornadon där den är (steg 3.8.4), foten mitt på banan
  for (const k of jagas.kast) { // spjutet eller stenen i luften, i en låg båge
    const x = (k.fran.x + (k.till.x - k.fran.x) * k.k) * TS, y = (k.fran.y + (k.till.y - k.fran.y) * k.k) * TS - Math.sin(k.k * Math.PI) * 6;
    if (k.sten) djurFx.beginFill(0x8a8f94).drawCircle(x, y, 1.2).endFill();
    else {
      const vx = k.till.x - k.fran.x, vy = k.till.y - k.fran.y, v = Math.hypot(vx, vy) || 1;
      djurFx.lineStyle(1, 0x8a6a40, 1).moveTo(x - vx / v * 4, y - vy / v * 4).lineTo(x, y).lineStyle(0);
    }
  }
  djurIkoner.end(); larmIkoner.end();
  synliga = ut;
}
// utropstecknet över kaninen som ser någon och flyr
const larm = (x: number, y: number) => larmIkoner.add('kanin_larm', x * TS - 2, y * TS - 13, 0.75);
// dammet efter en kanin som springer
function damm(x: number, y: number, vx: number, vy: number) {
  for (let k = 1; k <= 3; k++) djurFx.beginFill(0xd8c8a0, 0.5 - k * 0.12).drawCircle((x - vx * k * 0.35) * TS, (y - vy * k * 0.35) * TS + 1, 1.6 - k * 0.3).endFill();
}
