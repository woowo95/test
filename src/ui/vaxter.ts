import { Djur, FLYGTID, FYND, H, HOUR, SEC, W, ageIndex, brinnande, djurOf, radjurOf, fyndAt, getMap, groundOf, living, plockOf, tornadoAndel, tornadoPos, vargarOf } from '../sim';
import { farg, fargTal } from '../palett';
import { s, ui, vidNyBy } from './lage';
import { Ikoner, TS, djurFx, djurMarkLayer, figurLayer, plantG, rokBakLayer } from './scen';
import { brandBild, brandRok, tornadoBild, tornadoFot } from './animation';
import { jagade, samlaJakt } from './jakt';
import { posOf } from './manniskor';
import { OMRITA_MS } from './terrang';
import { type DjurHall, djurBild, iconCanvas, kartbild } from '../ikoner';

// det som växer just nu, diskret i vanliga vyn: små bärbuskar och svampar där det finns något att hämta.
// Var det kan växa syns inte, inte heller rötterna under jorden. Ritas om varje timme och när någon tagit något. Kaninerna ritas varje
// bildruta vid tiden som visas (ui.nu), som folket, eftersom de skuttar omkring (djur.ts).
let ritad = '', ritadNar = -Infinity;
// en fast plats i rutan för varje sak, så att buskarna inte hoppar runt när kartan ritas om
const plats = (i: number, j: number) => { const h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return h - Math.floor(h); };
export function drawPlants(force = false) {
  const key = `${s.seed},${Math.floor(s.now / HOUR)},${ageIndex(s)},${plockOf(s)}`;
  const nu = performance.now();
  if (!force && (key === ritad || nu - ritadNar < OMRITA_MS)) return; // högst en gång i sekunden, som marken
  ritad = key; ritadNar = nu;
  plantG.clear();
  const sh = getMap(s.seed).shade, g = groundOf(s);
  const bar = FYND.bar, kant = FYND.kantarell, spin = FYND.spindling;
  for (let i = 0; i < W * H; i++) {
    const x = (i % W) * TS, y = Math.floor(i / W) * TS;
    // bären syns på bärbuskarna (steg 6.5.4, terrang.ts). Där ett träd står på rutan syns inte busken, och där ritas en mörkgrön
    // tuva med några prickar i bärens färg under trädet, två där det finns mycket
    const b = g.trees[i] > 0 ? fyndAt(s, 'bar', i) / bar.topp : 0;
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

const djurIkoner = new Ikoner(figurLayer, true), larmIkoner = new Ikoner(djurMarkLayer), brandRokIkoner = new Ikoner(rokBakLayer);
// Kaninerna flyr synligt (Björn efter v159): i simuleringen hoppar en kanin undan på en gång när någon kommer nära. Här
// springer den dit, och den som flyr har ett utropstecken och damm efter sig. Den hoppar undan från där folket syns
// (posOf). Varje kanin som syns minns var den ritades senast
const FLYR = 5, ATER = 1.5, LANGT = 1.8, LARM = 2 * SEC; // rutor i sekunden när den flyr och när den går tillbaka; ett skutt längre än LANGT är en flykt
const visad = new Map<number, { x: number; y: number; t: number; larm: number }>();
vidNyBy.push(() => visad.clear());
let synliga: Djur[] = [];
// djuren ritas från det håll de rör sig åt (steg 5.1.11): från sidan österut och västerut (speglad), framifrån söderut och
// bakifrån norrut. Ett djur som står still behåller sitt håll; ett nytt djur syns från sidan
const hallar = new Map<number, { x: number; y: number; h: DjurHall }>();
vidNyBy.push(() => hallar.clear());
function ritaDjur(art: 'varg' | 'kanin' | 'radjur', id: number, x: number, y: number, sedd: Set<number>) {
  const e = hallar.get(id), dx = e ? x - e.x : 0, dy = e ? y - e.y : 0;
  let h: DjurHall = e?.h ?? 'sida';
  if (Math.hypot(dx, dy) > 0.01) h = Math.abs(dx) >= Math.abs(dy) * 0.8 ? (dx > 0 ? 'sida' : 'vast') : dy > 0 ? 'fram' : 'bak';
  hallar.set(id, { x, y, h }); sedd.add(id);
  const k = djurBild(art, id, h), c = iconCanvas(k); // foten nära rutans punkt, mitt under djuret
  djurIkoner.add(k, Math.round(x * TS - c.width / 2), Math.round(y * TS + (art === 'kanin' ? 2 : art === 'varg' ? 4 : 3) - c.height), 1);
}
// djuren där de syns just nu (det man trycker på, interaktion.ts, och djurfliken)
export const djurSynliga = () => synliga;
export function drawAnimals() {
  samlaJakt();
  djurIkoner.start(); larmIkoner.start(); brandRokIkoner.start(); djurFx.clear();
  const folk = living(s).map(posOf), jagas = jagade(), sedda = new Set<number>(), ut: Djur[] = [];
  const jagadId = new Set(jagas.kaniner.map(k => k.id)), riktade = new Set<number>();
  for (const k of jagas.kaniner) { // den som jagas just nu ritas som jakten går (jakt.ts)
    const e = { x: k.x, y: k.y, t: ui.nu, larm: k.larm ? ui.nu + LARM : visad.get(k.id)?.larm ?? 0 };
    visad.set(k.id, e); sedda.add(k.id);
    const art = k.radjur ? 'radjur' : 'kanin', fallt = k.radjur ? kartbild('radjur') : undefined; // det fällda rådjuret (steg 6.6.2)
    if (k.ligger && fallt) { const c = iconCanvas(fallt); djurIkoner.add(fallt, Math.round(k.x * TS - c.width / 2), Math.round(k.y * TS + 2 - c.height), 1); }
    else if (k.ligger) djurIkoner.add('kanin_dod', k.x * TS - 4, k.y * TS - 6, 1); else ritaDjur(art, k.id, k.x, k.y, riktade);
    if (!k.ligger) ut.push({ id: k.id, art, x: k.x, y: k.y, grupp: -1 });
    if (e.larm > ui.nu) larm(k.x, k.y);
  }
  for (const d of [...djurOf(s, ui.nu, folk), ...radjurOf(s, ui.nu, folk)]) { // harar och rådjur (steg 6.6.2), som flyr likadant
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
    ritaDjur(d.art, d.id, x, y, riktade);
    if (l > ui.nu) larm(x, y);
    ut.push({ ...d, x, y });
  }
  for (const id of visad.keys()) if (!sedda.has(id)) visad.delete(id);
  for (const d of vargarOf(s)) { ritaDjur('varg', d.id, d.x, d.y, riktade); ut.push(d); } // vargarna i verklig storlek (Björns val i bildstilen, steg 5.2.4.6)
  for (const id of hallar.keys()) if (!riktade.has(id)) hallar.delete(id);
  // tornadon där den är (steg 3.8.4), foten mitt på banan, och lågorna där det brinner (steg 3.8.5): bildstilens animationer
  // (steg 5.1.9.1), tornadon som virvlar i åtta bilder och branden som slår ut i sex, med röken bakom alla lågorna
  if (s.tornado) { const p = tornadoPos(s.tornado, tornadoAndel(s.tornado, ui.nu)), st = s.tornado.storlek ?? 'medel', f = tornadoFot(st); djurIkoner.add(tornadoBild(undefined, st), Math.round(p.x * TS - f.cx), Math.round(p.y * TS - f.fot), 1); } // i sin storlek (steg 6.4.15)
  ritaTornadoSpar();
  for (const [i] of brinnande(s)) {
    const x = (i % W) * TS, y = Math.floor(i / W) * TS;
    djurIkoner.add(brandBild(i), x, y, 1); brandRokIkoner.add(brandRok(i), x, y - 26, 1);
  }
  for (const k of jagas.kast) { // spjutet eller stenen i luften, i en låg båge
    const x = (k.fran.x + (k.till.x - k.fran.x) * k.k) * TS, y = (k.fran.y + (k.till.y - k.fran.y) * k.k) * TS - Math.sin(k.k * Math.PI) * 6;
    if (k.sten) djurFx.beginFill(0x8a8f94).drawCircle(x, y, 1.2).endFill();
    else {
      const vx = k.till.x - k.fran.x, vy = k.till.y - k.fran.y, v = Math.hypot(vx, vy) || 1;
      djurFx.lineStyle(1, 0x8a6a40, 1).moveTo(x - vx / v * 4, y - vy / v * 4).lineTo(x, y).lineStyle(0);
    }
  }
  // det markerade djuret (steg 3.10.4): en vit kant runt symbolen, som allt annat som är markerat
  const vald = ui.tab === 'djur' ? ut.find(d => d.id === ui.djurId) : undefined;
  if (vald) { const b = vald.art === 'varg' ? { w: 28, h: 19, fot: 5 } : vald.art === 'radjur' ? { w: 28, h: 31, fot: 4 } : { w: 14, h: 13, fot: 3 }; // runt djurets bild
    djurFx.lineStyle(1, 0xffffff, 0.9).drawRoundedRect(vald.x * TS - b.w / 2, vald.y * TS + b.fot - b.h, b.w, b.h, 3).lineStyle(0); }
  djurIkoner.end(); larmIkoner.end(); brandRokIkoner.end();
  synliga = ut;
}
// tornadons spår (steg 6.4.13), platshållare i paletten: jordstigen där gräset slets upp (mörka fåror i jordens ton, tills
// gräset vuxit tillbaka) och det som flyger iväg, i en båge från där det låg till där det landar: saker som en liten
// klump, människor som en liten figur och glöden som en gnista
const FARA = fargTal(farg('jord', 0)), SAK = fargTal(farg('jord', 2)), FOLK = fargTal(farg('rost', 3)), FOLKK = fargTal(farg('kol', 0)), GLOD = fargTal(farg('senap', 3));
function ritaTornadoSpar() {
  const g = groundOf(s);
  for (const i of s.tornadoStig ?? []) {
    if (g.cover[i] >= 0.3) continue;
    const x = (i % W) * TS, y = Math.floor(i / W) * TS, a = 0.6 * (1 - g.cover[i] / 0.3);
    djurFx.beginFill(FARA, a).drawRect(x + 2, y + 4, 10, 1).drawRect(x + 5, y + 9, 9, 1).drawRect(x + 1, y + 13, 7, 1).endFill();
  }
  for (const f of s.tornado?.flyg ?? []) {
    const k = (ui.nu - f.t) / FLYGTID;
    if (k < 0 || k > 1) continue;
    const d = Math.hypot(f.tx - f.fx, f.ty - f.fy), x = Math.round((f.fx + (f.tx - f.fx) * k) * TS), y = Math.round((f.fy + (f.ty - f.fy) * k) * TS - Math.sin(k * Math.PI) * d * 4);
    if (f.k === 'folk') djurFx.beginFill(FOLKK).drawRect(x - 2, y - 5, 4, 7).endFill().beginFill(FOLK).drawRect(x - 1, y - 4, 2, 5).endFill();
    else if (f.k === 'glod') djurFx.beginFill(GLOD).drawRect(x - 1, y - 1, 2, 2).endFill();
    else djurFx.beginFill(FOLKK).drawRect(x - 2, y - 2, 4, 4).endFill().beginFill(SAK).drawRect(x - 1, y - 1, 2, 2).endFill();
  }
}
// utropstecknet över kaninen som ser någon och flyr
const larm = (x: number, y: number) => larmIkoner.add('kanin_larm', x * TS - 3, y * TS - 15, 1);
// dammet efter en kanin som springer
function damm(x: number, y: number, vx: number, vy: number) {
  for (let k = 1; k <= 3; k++) djurFx.beginFill(0xd8c8a0, 0.5 - k * 0.12).drawCircle((x - vx * k * 0.35) * TS, (y - vy * k * 0.35) * TS + 1, 1.6 - k * 0.3).endFill();
}
