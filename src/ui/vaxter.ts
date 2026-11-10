import { richness } from '../sim';
import { BJORNJAKT, Djur, FLYGTID, H, sakerPaMarken, tandPaRutan, HOUR, SEC, VARG, W, ageIndex, bjornarOf, brinnande, djurOf, faglarOf, radjurOf, groundOf, living, plockOf, tornadoAndel, tornadoPos, vargarOf, tamdjurOf, TAMDJUR, honsOf } from '../sim';
import { farg, fargTal } from '../palett';
import { s, ui, vidNyBy } from './lage';
import { Ikoner, TS, app, djurFx, djurMarkLayer, figurLayer, plantG, rokBakLayer, world } from './scen';
import { brandBild, brandRok, tornadoBild, tornadoFot } from './animation';
import { djuretNu } from './stridkarta';
import { jagade, samlaJakt } from './jakt';
import { posOf } from './manniskor';
import { OMRITA_MS } from './terrang';
import { type DjurHall, djurBild, fagelBild, iconCanvas, kartbild } from '../ikoner';

// sakerna på rutan (steg 9.2.53, platshållare tills Björn valt i bildstilen), i 16 punkter per ruta och bara i palettens färger.
// Det som ritas är det som går att plocka (sakerPaMarken): bärtuvan under träden med ett, två eller tre bär, och en bild per sak
// för svampen, rötterna och grenarna. En ruta utan saker ritas inte
const BILD_FARG: Record<string, number> = { y: 0xdad0bb, x: 0xbdb39b, v: 0x7e7362, C: 0x21310e, D: 0x324726, E: 0x505e3e, g: 0x4b4f00, G: 0x647025, r: 0xa14808, h: 0xb2921b, H: 0x906f0f, s: 0x742a01, S: 0xa14808, f: 0xbdb39b, j: 0x5e3c24, J: 0x7d5b40, l: 0x647025 };
// bärtuvan (steg 9.2.42) med så många bär som finns på rutan (1–3)
const TUVA = [
  ['..gG..', '.gGgg.', 'gGrGgG', '.ggGg.', '..gg..'],
  ['..gG..', '.gGrg.', 'gGgGgG', '.rgGg.', '..gg..'],
  ['..gG..', '.gGrg.', 'gGgGrG', '.rgGg.', '..gg..'],
];
const BILDER: Record<string, string[]> = {
  kantarell: ['.hh.', 'hHHh', '.ff.'],
  spindling: ['.SS.', 'SssS', '.ff.'],
  rotter: ['.l.', 'jJj', '.j.'],
  grenar: ['....j', '...J.', '.jJ..', 'j....'],
};
// höet på rutan (steg 9.3.4, platshållare tills Björn valt i bildstilen): en, två eller tre tuvor efter hur mycket som ligger där
// (en tuva per fyra hö), så att den tomplockade rutan syns
const HO = ['h.H.h', '.hHh.', '..H..'];
// den vilda röllekan (steg 9.7.15): Björns val i bildstilen, f7_rolleka version 1 och 2, i två varianter efter rutan
const ROLLEKA_VILD = [
  ['.yxy...yy.', 'yxxxv.yxxv', '.vCv...vC.', '..C....C..', '..C...C...', '.D.C.CD.D.', 'DED.CC.DE.', '.DEDCDEDD.'],
  ['yxy..yy..yx.', 'xxv.yxxv.xxv', '.C...vC..vC.', '.C....C..C..', '..C...C.C...', 'D.DC.DCC.D..', 'EDD.CCC.DED.', '.DEDDCDEDD..'],
];
const ritaBild = (rad: string[], x: number, y: number) => rad.forEach((r, dy) => { for (let dx = 0; dx < r.length; dx++) { const c = BILD_FARG[r[dx]]; if (c !== undefined) plantG.beginFill(c).drawRect(x + dx, y + dy, 1, 1).endFill(); } });
// det som växer just nu, diskret i vanliga vyn: små bärbuskar och svampar där det finns något att hämta.
// Var det kan växa syns inte. Ritas om varje timme och när någon tagit något. Kaninerna ritas varje
// bildruta vid tiden som visas (ui.nu), som folket, eftersom de skuttar omkring (djur.ts).
let ritad = '', ritadNar = -Infinity;
// en fast plats i rutan för varje sak, så att buskarna inte hoppar runt när kartan ritas om
const plats = (i: number, j: number) => { const h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return h - Math.floor(h); };
// rutorna som syns och en halv skärm runt om, avrundat till hela block om 8 rutor (steg 9.1.3): det utanför ritas inte
const SYNS_BLOCK = 8;
function synligaRutor() {
  const a = world.toLocal({ x: 0, y: 0 }), b = world.toLocal({ x: app.screen.width, y: app.screen.height });
  const mx = (b.x - a.x) / TS / 2, my = (b.y - a.y) / TS / 2, B = SYNS_BLOCK;
  const x0 = Math.max(0, Math.floor((a.x / TS - mx) / B) * B), y0 = Math.max(0, Math.floor((a.y / TS - my) / B) * B);
  const x1 = Math.min(W - 1, Math.ceil((b.x / TS + mx) / B) * B), y1 = Math.min(H - 1, Math.ceil((b.y / TS + my) / B) * B);
  return { x0, y0, x1, y1 };
}
export function drawPlants(force = false) {
  const v = synligaRutor();
  const key = `${s.seed},${Math.floor(s.now / HOUR)},${ageIndex(s)},${plockOf(s)},${Object.keys(s.plockat ?? {}).length},${v.x0},${v.y0},${v.x1},${v.y1}`;
  const nu = performance.now();
  if (!force && (key === ritad || nu - ritadNar < OMRITA_MS)) return; // högst en gång i sekunden, som marken
  ritad = key; ritadNar = nu;
  plantG.clear();
  const g = groundOf(s);
  for (let ry = v.y0; ry <= v.y1; ry++) for (let rx = v.x0; rx <= v.x1; rx++) {
    const i = ry * W + rx, x = rx * TS, y = ry * TS;
    let j = 0; // varje sak får en fast plats i rutan, så att bilden inte hoppar runt när kartan ritas om
    for (const q of sakerPaMarken(s, 'samla', rx, ry)) {
      const n = Math.min(3, q.n);
      if (n <= 0) continue;
      // bären syns på bärbuskarna (steg 6.5.4, terrang.ts); där ett träd står syns inte busken, och där ritas tuvan under trädet
      if (q.k === 'bar') { if (g.trees[i] > 0) ritaBild(TUVA[n - 1], Math.round(x + 2 + plats(i, 0) * 8), Math.round(y + 3 + plats(i, 5) * 8)); continue; }
      for (let k = 0; k < n; k++, j++) ritaBild(BILDER[q.k], Math.round(x + 1 + plats(i, 10 + j) * 11), Math.round(y + 1 + plats(i, 20 + j) * 12));
    }
    if (ageIndex(s) !== 0 && richness(s, 'rolleka', rx, ry) > 0.25) ritaBild(ROLLEKA_VILD[plats(i, 50) < 0.5 ? 0 : 1], Math.round(x + 1 + plats(i, 51) * 3), Math.round(y + 2 + plats(i, 52) * 5)); // röllekan växer vild (steg 9.7.15)
    const ho = Math.min(3, Math.floor(tandPaRutan(s, 'torrgras', rx, ry) / 4));
    for (let k = 0; k < ho; k++, j++) ritaBild(HO, Math.round(x + 1 + plats(i, 30 + j) * 10), Math.round(y + 2 + plats(i, 40 + j) * 11));
    const gr = Math.min(3, sakerPaMarken(s, 'grenar', rx, ry)[0]?.n ?? 0);
    for (let k = 0; k < gr; k++, j++) ritaBild(BILDER.grenar, Math.round(x + 1 + plats(i, 10 + j) * 10), Math.round(y + 1 + plats(i, 20 + j) * 11));
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
const FALLD = ['fagel_orre', 'fagel', 'fagel_duva']; // den fällda fågeln i varje utseende (orre, ripa, skogsduva)
const hallar = new Map<number, { x: number; y: number; h: DjurHall }>();
vidNyBy.push(() => hallar.clear());
// anfallet i en strid på kartan (steg 9.2.31, platshållare tills Björn valt i bildstilen): djuret gör ett utfall mot den det slår,
// och slaget syns där det träffar: björnens klor (an_klo) och vargens bett (an_bett)
function anfall(k: ReturnType<typeof djuretNu>, d: { x: number; y: number }, ikon: string) {
  if (!k) return { x: d.x, y: d.y };
  if (!k.slar) return { x: k.x, y: k.y };
  const dx = k.slar.x - k.x, dy = k.slar.y - k.y, l = Math.hypot(dx, dy) || 1;
  djurIkoner.add(ikon, Math.round(k.slar.x * TS - 4), Math.round(k.slar.y * TS - 10), 1);
  return { x: k.x + dx / l * 0.3, y: k.y + dy / l * 0.3 };
}
function ritaDjur(art: Djur['art'], id: number, x: number, y: number, sedd: Set<number>, u = 1) {
  const e = hallar.get(id), dx = e ? x - e.x : 0, dy = e ? y - e.y : 0;
  let h: DjurHall = e?.h ?? 'sida';
  if (Math.hypot(dx, dy) > 0.01) h = Math.abs(dx) >= Math.abs(dy) * 0.8 ? (dx > 0 ? 'sida' : 'vast') : dy > 0 ? 'fram' : 'bak';
  hallar.set(id, { x, y, h }); sedd.add(id);
  const k = art === 'fagel' ? fagelBild(u, h) : djurBild(art, id, h), c = iconCanvas(k); // fågeln i platsens utseende (steg 6.6.3) // foten nära rutans punkt, mitt under djuret
  djurIkoner.add(k, Math.round(x * TS - c.width / 2), Math.round(y * TS + (art === 'kanin' ? 2 : art === 'varg' || art === 'bjorn' || art === 'bjornunge' ? 4 : 3) - c.height), 1);
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
    const art = k.art, fallt = art === 'radjur' ? kartbild('radjur') : art === 'fagel' ? kartbild(FALLD[k.u ?? 1]) : undefined; // det fällda rådjuret (steg 6.6.2) och fågeln (steg 6.6.3)
    if (k.ligger && fallt) { const c = iconCanvas(fallt); djurIkoner.add(fallt, Math.round(k.x * TS - c.width / 2), Math.round(k.y * TS + 2 - c.height), 1); }
    else if (k.ligger) djurIkoner.add('kanin_dod', k.x * TS - 4, k.y * TS - 6, 1); else ritaDjur(art, k.id, k.x, k.y, riktade, k.u);
    if (!k.ligger) ut.push({ id: k.id, art, x: k.x, y: k.y, grupp: -1, u: k.u });
    if (e.larm > ui.nu) larm(k.x, k.y);
  }
  for (const d of [...djurOf(s, ui.nu, folk), ...radjurOf(s, ui.nu, folk), ...faglarOf(s, ui.nu, folk)]) { // harar, rådjur (steg 6.6.2) och fåglar (steg 6.6.3), som flyr likadant
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
    ritaDjur(d.art, d.id, x, y, riktade, d.u);
    if (l > ui.nu) larm(x, y);
    ut.push({ ...d, x, y });
  }
  for (const id of visad.keys()) if (!sedda.has(id)) visad.delete(id);
  // i en strid på kartan (steg 9.2.29) står vargen och björnen där striden har dem, vid tiden som visas
  for (const d of vargarOf(s)) { const k = djuretNu('varg', d.id, ui.nu), { x, y } = anfall(k, d, 'an_bett'); ritaDjur('varg', d.id, x, y, riktade); ut.push({ ...d, x, y }); }
  for (const d of bjornarOf(s, ui.nu)) { const k = d.art === 'bjorn' ? djuretNu('bjorn', d.id, ui.nu) : undefined, { x, y } = anfall(k, d, 'an_klo'); ritaDjur(d.art, d.id, x, y, riktade); ut.push({ ...d, x, y }); } // björnen (steg 6.6.4) och ungarna (steg 6.6.5), i Björns ritningar // vargarna i verklig storlek (Björns val i bildstilen, steg 5.2.4.6)
  for (const d of tamdjurOf(s)) { ritaDjur(TAMDJUR[d.art].ikon, d.id, d.x, d.y, riktade); }
  const hons = honsOf(s); // hönsflocken (steg 9.8.10): hönorna runt flockens plats, platshållare tills Björn valt i bildstilen
  if (hons) for (let i = 0; i < hons.n; i++) { const v = i * 2.4, r = 0.4 + (i % 4) * 0.35; ritaDjur('fagel', 950_000_000 + i, hons.x + Math.cos(v) * r, hons.y + Math.sin(v) * r, riktade); } // de tama djuren (steg 9.8.1): platshållare tills Björn valt i bildstilen
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
  if (vald) { const b = vald.art === 'varg' ? { w: 28, h: 19, fot: 5 } : vald.art === 'bjorn' ? { w: 50, h: 35, fot: 4 } : vald.art === 'bjornunge' ? { w: 25, h: 18, fot: 4 } : vald.art === 'radjur' ? { w: 28, h: 31, fot: 4 } : vald.art === 'fagel' ? { w: 24, h: 17, fot: 4 } : { w: 14, h: 13, fot: 3 }; // runt djurets bild
    djurFx.lineStyle(1, 0xffffff, 0.9).drawRoundedRect(vald.x * TS - b.w / 2, vald.y * TS + b.fot - b.h, b.w, b.h, 3).lineStyle(0); }
  hotMarken();
  djurIkoner.end(); larmIkoner.end(); brandRokIkoner.end();
  synliga = ut;
}
// tornadons spår (steg 6.4.13): jordstigen där gräset slets upp (mörka fåror i jordens ton, tills gräset vuxit tillbaka)
// och det som flyger iväg, i en båge från där det låg till där det landar: saker som en liten klump, människor som en
// liten figur och glöden som en gnista, med ljusa fartstreck bakom (bildstilens val f6_tornado_flyger, version 3)
const FART = fargTal(farg('ben', 3)), FARA = fargTal(farg('jord', 0)), SAK = fargTal(farg('jord', 2)), FOLK = fargTal(farg('rost', 3)), FOLKK = fargTal(farg('kol', 0)), GLOD = fargTal(farg('senap', 3));
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
    const d = Math.hypot(f.tx - f.fx, f.ty - f.fy), pos = (q: number) => [Math.round((f.fx + (f.tx - f.fx) * q) * TS), Math.round((f.fy + (f.ty - f.fy) * q) * TS - Math.sin(q * Math.PI) * d * 4)], [x, y] = pos(k);
    djurFx.beginFill(FART); for (let q = Math.max(0, k - 0.18); q < k - 0.01; q += 0.03) { const [sx, sy] = pos(q); djurFx.drawRect(sx + 1, sy + 2, 1, 1); } djurFx.endFill(); // fartstrecken bakom
    if (f.k === 'folk') djurFx.beginFill(FOLKK).drawRect(x - 2, y - 5, 4, 7).endFill().beginFill(FOLK).drawRect(x - 1, y - 4, 2, 5).endFill();
    else if (f.k === 'glod') djurFx.beginFill(GLOD).drawRect(x - 1, y - 1, 2, 2).endFill();
    else djurFx.beginFill(FOLKK).drawRect(x - 2, y - 2, 4, 4).endFill().beginFill(SAK).drawRect(x - 1, y - 1, 2, 2).endFill();
  }
}
// märket där ett hot senast sågs (steg 9.2.122), så länge larmet gäller: vargflocken (VARG.seddTim), rövarna tills de flyr och björnen
// (BJORNJAKT.vet). Bara i bilden. Platshållare: varningssymbolen ur bildstilen, tills ett märke valts i bildstilens valdel
function hotMarken() {
  const mark = (x: number, y: number) => larmIkoner.add('kb_sym_varning', Math.round(x * TS - 8), Math.round(y * TS - 16), 1);
  for (const f of s.vargar ?? []) if (f.sx !== undefined && f.sy !== undefined && f.gor !== 'flyr' && f.vargar.length && f.sedd !== undefined && ui.nu - f.sedd < VARG.seddTim * HOUR) mark(f.sx, f.sy);
  for (const f of [s.rovare, ...(s.rovareFler ?? [])]) if (f?.sx !== undefined && f.sy !== undefined && f.sedd !== undefined && f.gor !== 'flyr') mark(f.sx, f.sy);
  const b = s.bjornJakt;
  if (b?.x !== undefined && b.y !== undefined && ui.nu - b.sedd < BJORNJAKT.vet * HOUR) mark(b.x, b.y);
}
// utropstecknet över kaninen som ser någon och flyr
const larm = (x: number, y: number) => larmIkoner.add('kanin_larm', x * TS - 3, y * TS - 15, 1);
// dammet efter en kanin som springer
function damm(x: number, y: number, vx: number, vy: number) {
  for (let k = 1; k <= 3; k++) djurFx.beginFill(0xd8c8a0, 0.5 - k * 0.12).drawCircle((x - vx * k * 0.35) * TS, (y - vy * k * 0.35) * TS + 1, 1.6 - k * 0.3).endFill();
}
