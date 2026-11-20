import { handlarDjur, hasselVaxer, karavanLagret, richness } from '../sim';
import { rovarFlockar } from '../sim/rovare';
import { BJORNJAKT, DAY, Djur, FLYGTID, H, sakerPaMarken, HOUR, SEC, VARG, W, ageIndex, bjornarOf, brinnande, djurOf, faglarOf, flockdjurOf, groundOf, living, plockOf, tornadoAndel, tornadoPos, vargarOf, TAMDJUR, TAM_ID0, honsOf, iIstiden, vildboSyns, samhallen } from '../sim';
import { farg, fargTal } from '../palett';
import { s, ui, vidNyBy } from './lage';
import { Ikoner, TS, app, djurFx, djurMarkLayer, figurLayer, plantG, rokBakLayer, world } from './scen';
import { brandBild, brandRok, tornadoBild, tornadoFot } from './animation';
import { djuretNu } from './stridkarta';
import { jagade, samlaJakt } from './jakt';
import { posOf } from './manniskor';
import { OMRITA_MS } from './terrang';
import { type DjurHall, djurBild, fagelBild, hasIcon, iconCanvas, kartbild } from '../ikoner';
import { KARTBILDER } from '../kartbilder';
import { sinHash } from './pixel';

// sakerna på rutan (steg 9.2.53, Björns val i steg 9.9.1: i rad), i 16 punkter per ruta och bara i palettens färger. Det som ritas är
// det som går att plocka (sakerPaMarken): spelets egna bilder av bären, svampen, rötterna och grenarna i sin naturliga storlek, en, två
// eller tre i en sned rad över rutan från uppe till vänster till nere till höger. En ruta utan saker ritas inte
const BILD_FARG: Record<string, number> = { y: 0xdad0bb, x: 0xbdb39b, v: 0x7e7362, C: 0x21310e, D: 0x324726, E: 0x505e3e }; // röllekans färger
const KBILD_AV: Record<string, string> = { bar: 'bar', kantarell: 'svamp', spindling: 'svamp', rotter: 'rotter', grenar: 'grenar' };
const RAD_T = [[0.5], [0.15, 0.85], [0, 0.5, 1]];
function ritaRad(k: string, n: number, x: number, y: number) {
  const b = KARTBILDER[KBILD_AV[k] ?? k];
  if (!b) return;
  const a = [1, 2], c = [15 - b.w, 14 - b.h];
  RAD_T[n - 1].map(t => [Math.round(a[0] + (c[0] - a[0]) * t), Math.round(a[1] + (c[1] - a[1]) * t)]).sort((p, q) => p[1] - q[1]).forEach(([dx, dy]) => {
    b.rader.forEach((r, ry) => { for (let rx = 0; rx < r.length; rx++) { const h = b.pal[r[rx]]; if (r[rx] !== '.' && h) plantG.beginFill(parseInt(h.slice(1), 16)).drawRect(x + dx + rx, y + dy + ry, 1, 1).endFill(); } });
  });
}
// den vilda röllekan (steg 9.7.15): Björns val i bildstilen, f7_rolleka version 1 och 2, i två varianter efter rutan
const ROLLEKA_VILD = [
  ['.yxy...yy.', 'yxxxv.yxxv', '.vCv...vC.', '..C....C..', '..C...C...', '.D.C.CD.D.', 'DED.CC.DE.', '.DEDCDEDD.'],
  ['yxy..yy..yx.', 'xxv.yxxv.xxv', '.C...vC..vC.', '.C....C..C..', '..C...C.C...', 'D.DC.DCC.D..', 'EDD.CCC.DED.', '.DEDDCDEDD..'],
];
// Björns val (steg 11.14.1): hålet i stammen och bina ur bildstilens vildbo, utan stammen i bilden (trädet har sin egen)
const VILDBO_HAL = (() => { const b = KARTBILDER.vildbo; if (!b) return undefined; return { w: b.w, h: b.h, pal: b.pal, rader: b.rader.map(r => [...r].map((c, x) => c === 'g' || c === 'p' || c === 'H' || (c === 'o' && (x < 5 || x > 14)) ? c : '.').join('')) }; })();
let bon: number[] = []; // rutorna med ett bo som syns, för bina som surrar runt stammen (drawAnimals)
const ritaBild = (rad: string[], x: number, y: number) => rad.forEach((r, dy) => { for (let dx = 0; dx < r.length; dx++) { const c = BILD_FARG[r[dx]]; if (c !== undefined) plantG.beginFill(c).drawRect(x + dx, y + dy, 1, 1).endFill(); } });
const ritaKb = (b: { rader: string[]; pal: Record<string, string> }, x: number, y: number) => b.rader.forEach((r, dy) => { for (let dx = 0; dx < r.length; dx++) { const h = b.pal[r[dx]]; if (r[dx] !== '.' && h) plantG.beginFill(parseInt(h.slice(1), 16)).drawRect(x + dx, y + dy, 1, 1).endFill(); } });
// det som växer just nu, diskret i vanliga vyn: små bärbuskar och svampar där det finns något att hämta.
// Var det kan växa syns inte. Ritas om varje timme och när någon tagit något. Kaninerna ritas varje
// bildruta vid tiden som visas (ui.nu), som folket, eftersom de skuttar omkring (djur.ts).
let ritad = '', ritadNar = -Infinity;
// en fast plats i rutan för varje sak, så att buskarna inte hoppar runt när kartan ritas om
const plats = sinHash;
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
  plantG.clear(); bon = [];
  for (let ry = v.y0; ry <= v.y1; ry++) for (let rx = v.x0; rx <= v.x1; rx++) {
    const i = ry * W + rx, x = rx * TS, y = ry * TS;
    for (const q of sakerPaMarken(s, 'samla', rx, ry)) {
      const n = Math.min(3, q.n);
      if (n <= 0) continue;
      if (q.k === 'honung') { if (vildboSyns(s, i)) { bon.push(i); if (VILDBO_HAL) ritaKb(VILDBO_HAL, x + 1, y - 8); } continue; } // honungen syns som boet på trädet, inte som kakor på marken
      if (q.k === 'bar') continue; // bären syns på bärbuskarna (steg 6.5.4, terrang.ts), och under träd växer inga (steg 10.10.8)
      ritaRad(q.k, n, x, y);
    }
    if (ageIndex(s) !== 0 && richness(s, 'rolleka', rx, ry) > 0.25) ritaBild(ROLLEKA_VILD[plats(i, 50) < 0.5 ? 0 : 1], Math.round(x + 1 + plats(i, 51) * 3), Math.round(y + 2 + plats(i, 52) * 5)); // röllekan växer vild (steg 9.7.15)
    if (rx % 2 === 0 && ry % 2 === 0 && hasselVaxer(s, i) > 0.3) { const b = KARTBILDER.hassel; if (b) ritaKb(b, x + 8 - (b.w >> 1), y + TS - b.h + 2); } // den vilda hasseln (steg 9.7.14) som en buske på varannan ruta där den växer (Björns val, steg 10.11.1)
    const gr = Math.min(3, sakerPaMarken(s, 'grenar', rx, ry)[0]?.n ?? 0);
    if (gr > 0) ritaRad('grenar', gr, x, y);
  }
}

const djurIkoner = new Ikoner(figurLayer, true, true), larmIkoner = new Ikoner(djurMarkLayer), brandRokIkoner = new Ikoner(rokBakLayer);
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
// anfallet i en strid på kartan (steg 9.2.31; Björn, steg 11.14.1): djuret i sin vanliga bild knuffas fram mot den det slår och
// tillbaka, om och om igen medan det slår, och slaget syns där det träffar: björnens klor (an_klo) och vargens bett (an_bett)
const KNUFF = { langd: 0.35, takt: 360 }; // hur långt fram (rutor) och hur lång en knuff är (ms)
function anfall(k: ReturnType<typeof djuretNu>, d: { x: number; y: number }, ikon: string) {
  if (!k) return { x: d.x, y: d.y };
  if (!k.slar) return { x: k.x, y: k.y };
  const dx = k.slar.x - k.x, dy = k.slar.y - k.y, l = Math.hypot(dx, dy) || 1, f = KNUFF.langd * Math.abs(Math.sin(performance.now() / KNUFF.takt * Math.PI));
  djurIkoner.add(ikon, Math.round(k.slar.x * TS - 4), Math.round(k.slar.y * TS - 10), 1);
  return { x: k.x + dx / l * f, y: k.y + dy / l * f };
}
function ritaDjur(art: Djur['art'], id: number, x: number, y: number, sedd: Set<number>, u = 1, bild?: (h: DjurHall) => string | undefined) {
  const e = hallar.get(id), dx = e ? x - e.x : 0, dy = e ? y - e.y : 0;
  let h: DjurHall = e?.h ?? 'sida';
  if (Math.hypot(dx, dy) > 0.01) h = Math.abs(dx) >= Math.abs(dy) * 0.8 ? (dx > 0 ? 'sida' : 'vast') : dy > 0 ? 'fram' : 'bak';
  hallar.set(id, { x, y, h }); sedd.add(id);
  const k = bild?.(h) ?? (art === 'fagel' ? fagelBild(u, h) : djurBild(art, id, h, art === 'kanin' && iIstiden(ageIndex(s, ui.nu)))), c = iconCanvas(k); // fågeln i platsens utseende (steg 6.6.3) // foten nära rutans punkt, mitt under djuret
  const fot = art === 'kanin' ? 2 : art === 'varg' || art === 'bjorn' || art === 'bjornunge' || art === 'vildsvin' ? 4 : 3;
  djurIkoner.add(k, Math.round(x * TS - c.width / 2), Math.round(y * TS + fot - c.height), 1);
  lador.set(id, { w: c.width, h: c.height, fot }); // bildens mått, för den vita kanten när djuret är markerat
}
const lador = new Map<number, { w: number; h: number; fot: number }>();
// de tama djurens bilder (Björns val, steg 11.14.1): hunden (valpen tills den är vuxen), fåret och geten i tre utseenden efter id:t;
// de andra har en platshållare (TAMDJUR.ikon)
const TAMBILD: Record<string, string> = { hund: 'hund', far: 'far', get: 'get' };
function tamBild(d: { id: number; art: string; born: number }): ((h: DjurHall) => string | undefined) | undefined {
  const a = TAMBILD[d.art];
  if (!a) return undefined;
  const ung = a === 'hund' && (ui.nu - d.born) / DAY < TAMDJUR.hund.vuxen, art = ung ? 'valp' : a, v = 1 + Math.abs(d.id) % 3;
  return h => { const k = `kb_tam_${art}_${v}_${h}`; return hasIcon(k) ? k : undefined; };
}
// djuren där de syns just nu (det man trycker på, interaktion.ts, och djurfliken)
export const djurSynliga = () => synliga;
// ett tamt djur eller en höna i listan över det som syns (steg 9.8.1, 9.8.10): art = bilden som ritas (för kanten), tam = vad det är
export interface SynligtDjur { id: number; art: Djur['art']; x: number; y: number; grupp: number; u?: number; tam?: string }
export const HANDLARDJUR_ID = 949_999_999; // handlarens packdjur på kartan (steg 11.11.5)
export const HONS_ID0 = 950_000_000; // hönornas id på kartan (ritas runt flockens plats); varje höna är flocken
export const arHona = (id: number) => id >= HONS_ID0;
export const arTamt = (id: number) => id >= TAM_ID0 && id < HONS_ID0;
// hönorna ritas med samma kant, och en höna är hela flocken
const honsIdn = (n: number) => Array.from({ length: n }, (_, i) => HONS_ID0 + i);
export function drawAnimals() {
  samlaJakt();
  djurIkoner.start(); larmIkoner.start(); brandRokIkoner.start(); djurFx.clear();
  // bina surrar runt stammen där ett bo syns (steg 10.10.15): tre små prickar som går runt boet, var och en i sin egen takt
  for (const i of bon) { const bx = (i % W) * TS + 11, by = Math.floor(i / W) * TS + 6; for (let k = 0; k < 3; k++) { const v = performance.now() / (700 + k * 230) + k * 2.1 + i; djurFx.beginFill(0x24201d).drawRect(Math.round(bx + Math.cos(v) * (4 + k)), Math.round(by + Math.sin(v * 1.3) * (3 + k)), 1, 1).endFill(); } }
  // bina vid flustret (steg 10.10.17): i en kupa med ett samhälle flyger de ut och in på våren och sommaren, var och ett åt sitt håll
  { const ai = ageIndex(s, ui.nu); if (ai === 1 || ai === 2) for (const t of samhallen(s)) { const fx = t.x * TS + 8, fy = t.y * TS + 12; for (let k = 0; k < 4; k++) { const v = performance.now() / (900 + k * 170) + k * 1.7 + t.id, ut = Math.abs(Math.sin(v)) * (3 + k * 2), r = k * 1.9 + t.id; djurFx.beginFill(0x24201d).drawRect(Math.round(fx + Math.cos(r) * ut), Math.round(fy + Math.sin(r) * ut * 0.6 - ut * 0.4), 1, 1).endFill(); } } }
  const folk = living(s).map(posOf), jagas = jagade(), sedda = new Set<number>(), ut: SynligtDjur[] = [];
  const jagadId = new Set(jagas.kaniner.map(k => k.id)), riktade = new Set<number>();
  for (const k of jagas.kaniner) { // den som jagas just nu ritas som jakten går (jakt.ts)
    const e = { x: k.x, y: k.y, t: ui.nu, larm: k.larm ? ui.nu + LARM : visad.get(k.id)?.larm ?? 0 };
    visad.set(k.id, e); sedda.add(k.id);
    const art = k.art, fallt = art === 'radjur' ? kartbild('radjur') : art === 'vildsvin' ? 'vildsvin' : art === 'fagel' ? kartbild(FALLD[k.u ?? 1]) : undefined; // det fällda rådjuret (steg 6.6.2) och fågeln (steg 6.6.3)
    if (k.ligger && fallt) { const c = iconCanvas(fallt); djurIkoner.add(fallt, Math.round(k.x * TS - c.width / 2), Math.round(k.y * TS + 2 - c.height), 1); }
    else if (k.ligger) djurIkoner.add('kanin_dod', Math.round(k.x * TS - iconCanvas('kanin_dod').width / 2), Math.round(k.y * TS + 2 - iconCanvas('kanin_dod').height), 1); else ritaDjur(art, k.id, k.x, k.y, riktade, k.u);
    if (!k.ligger) ut.push({ id: k.id, art, x: k.x, y: k.y, grupp: -1, u: k.u });
    if (e.larm > ui.nu) larm(k.x, k.y);
  }
  for (const d of [...djurOf(s, ui.nu, folk), ...flockdjurOf(s, ui.nu, folk), ...faglarOf(s, ui.nu, folk)]) { // harar, rådjur (steg 6.6.2), vildsvin (steg 10.10.4) och fåglar (steg 6.6.3), som flyr likadant
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
  for (const d of vargarOf(s)) { const k = djuretNu('varg', d.id), { x, y } = anfall(k, d, 'an_bett'); ritaDjur('varg', d.id, x, y, riktade); ut.push({ ...d, x, y }); }
  for (const d of bjornarOf(s, ui.nu)) { const k = d.art === 'bjorn' ? djuretNu('bjorn', d.id) : undefined, { x, y } = anfall(k, d, 'an_klo'); ritaDjur(d.art, d.id, x, y, riktade); ut.push({ ...d, x, y }); } // björnen (steg 6.6.4) och ungarna (steg 6.6.5), i Björns ritningar // vargarna i verklig storlek (Björns val i bildstilen, steg 5.2.4.6)
  for (const d of s.tamdjur ?? []) { // läser listan utan att skriva (tamdjurOf gör s.tamdjur ??= []); de döda står inte kvar i den
    if (d.dog !== undefined) continue;
    const ikon = TAMDJUR[d.art].ikon as Djur['art']; ritaDjur(ikon, d.id, d.x, d.y, riktade, 1, tamBild(d)); ut.push({ id: d.id, art: ikon, x: d.x, y: d.y, grupp: -1, tam: d.art });
  }
  // handlarens packdjur (steg 11.11.5): en ruta från filten eller bakom hen på vägen, med full eller lätt last (platshållare: väskorna på ryggen)
  const hd = s.handlare && handlarDjur(s, s.handlare, ui.nu);
  if (hd) {
    const ikon = TAMDJUR[hd.art].ikon as Djur['art']; ritaDjur(ikon, HANDLARDJUR_ID, hd.x, hd.y, riktade); ut.push({ id: HANDLARDJUR_ID, art: ikon, x: hd.x, y: hd.y, grupp: -1, tam: hd.art });
    const bx = Math.round(hd.x * TS), by = Math.round(hd.y * TS) - 9;
    djurFx.beginFill(0x7d5b40).drawRect(bx - 5, by, 3, hd.full ? 5 : 3).drawRect(bx + 2, by, 3, hd.full ? 5 : 3).endFill();
    if (hd.full) djurFx.beginFill(0xbd753e).drawRect(bx - 2, by - 3, 4, 3).endFill();
  }
  // karavanens läger (steg 11.11.6, platshållare): tälten, vagnarna med lasten och dragdjuren framför
  const kh = s.handlare, kl = kh && (kh.fas === 'vantar' || kh.fas === 'handlar') ? karavanLagret(kh) : undefined;
  if (kl) {
    for (const t of kl.talt) { const tx = Math.round(t.x * TS), ty = Math.round(t.y * TS); djurFx.beginFill(fargTal(farg('ben', 3))).moveTo(tx - 7, ty + 4).lineTo(tx, ty - 7).lineTo(tx + 7, ty + 4).closePath().endFill().beginFill(fargTal(farg('kol', 0))).drawRect(tx - 1, ty - 1, 2, 5).endFill(); }
    kl.vagnar.forEach((v, i) => {
      const vx = Math.round(v.x * TS), vy = Math.round(v.y * TS);
      djurFx.beginFill(fargTal(farg('jord', 2))).drawRect(vx - 6, vy - 5, 12, 5).endFill().beginFill(fargTal(farg('kol', 0))).drawCircle(vx - 4, vy + 1, 2).drawCircle(vx + 4, vy + 1, 2).endFill().beginFill(fargTal(farg('rost', 2))).drawRect(vx - 5, vy - 8, 10, 3).endFill();
      if (v.art) { const ikon = TAMDJUR[v.art].ikon as Djur['art'], dx = v.x + 0.9; ritaDjur(ikon, HANDLARDJUR_ID - 1 - i, dx, v.y, riktade); ut.push({ id: HANDLARDJUR_ID - 1 - i, art: ikon, x: dx, y: v.y, grupp: -1, tam: v.art }); }
    });
  }
  const hons = honsOf(s); // hönsflocken (steg 9.8.10): hönorna runt flockens plats, två höns i varje bild (Björns val, steg 11.14.1)
  if (hons) for (let i = 0; i < hons.n; i++) { const v = i * 2.4, r = 0.4 + (i % 4) * 0.35; const hx = hons.x + Math.cos(v) * r, hy = hons.y + Math.sin(v) * r; if (i % 2 === 0) ritaDjur('fagel', HONS_ID0 + i, hx, hy, riktade, 1, h => h === 'vast' || h === 'bak' ? 'kb_hons_vast' : 'kb_hons'); ut.push({ id: HONS_ID0 + i, art: 'fagel', x: hx, y: hy, grupp: -1, tam: 'hons' }); } // de tama djuren (steg 9.8.1): platshållare tills Björn valt i bildstilen
  for (const id of hallar.keys()) if (!riktade.has(id)) hallar.delete(id);
  for (const id of lador.keys()) if (!riktade.has(id)) lador.delete(id);
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
  // (de tama djuren och hönsflocken markeras på samma sätt, och när musen är över dem; en höna är hela flocken)
  const kant = (d: SynligtDjur) => { const b = lador.get(d.id); if (!b) return; // runt djurets bild som den ritas just nu
    djurFx.lineStyle(1, 0xffffff, 0.9).drawRoundedRect(Math.round(d.x * TS - b.w / 2) - 1, Math.round(d.y * TS + b.fot - b.h) - 1, b.w + 2, b.h + 2, 3).lineStyle(0); };
  const markerade = new Set<number>();
  for (const id of [ui.tab === 'djur' ? ui.djurId : -1, ui.djurHover]) { if (arHona(id)) honsIdn(hons?.n ?? 0).forEach(q => markerade.add(q)); else markerade.add(id); }
  for (const d of ut) if (markerade.has(d.id)) kant(d);
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
// (BJORNJAKT.vet). Bara i bilden: märket Björn valde i bildstilen (steg 10.11.1)
function hotMarken() {
  const mark = (x: number, y: number) => larmIkoner.add('kb_sym_hotmarke', Math.round(x * TS - 8), Math.round(y * TS - 16), 1);
  for (const f of s.vargar ?? []) if (f.sx !== undefined && f.sy !== undefined && f.gor !== 'flyr' && f.vargar.length && f.sedd !== undefined && ui.nu - f.sedd < VARG.seddTim * HOUR) mark(f.sx, f.sy);
  for (const f of rovarFlockar(s)) if (f?.sx !== undefined && f.sy !== undefined && f.sedd !== undefined && f.gor !== 'flyr') mark(f.sx, f.sy);
  const b = s.bjornJakt;
  if (b?.x !== undefined && b.y !== undefined && ui.nu - b.sedd < BJORNJAKT.vet * HOUR) mark(b.x, b.y);
}
// utropstecknet över kaninen som ser någon och flyr
const larm = (x: number, y: number) => larmIkoner.add('kanin_larm', x * TS - 3, y * TS - 15, 1);
// dammet efter en kanin som springer
function damm(x: number, y: number, vx: number, vy: number) {
  for (let k = 1; k <= 3; k++) djurFx.beginFill(0xd8c8a0, 0.5 - k * 0.12).drawCircle((x - vx * k * 0.35) * TS, (y - vy * k * 0.35) * TS + 1, 1.6 - k * 0.3).endFill();
}
