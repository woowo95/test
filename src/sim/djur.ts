import { FYND, setNarvaro, takenOf, vaxerAt, viltStart } from './fynd';
import { getMap, hash, perKarta } from './karta';
import { startGround } from './mark';
import { FOREST, isSoil } from './vag';
import { clamp } from './slump';
import { living } from './folk';
import { motgangNu } from './motgang';
import { H, HOUR, SEC, State, T, W, egen, inMap, mapKey, tvaDelar, visning } from './typer';
import { vattenNu } from './sjo';
import { balans } from './balans';
import { DJUR } from './redskap';

// ---------- djur: kaniner i grupper ----------
// Viltlagret (fynd.ts) är kartan över var förhållandena är bra för kaniner. Själva kaninerna finns i några få små grupper
// som dyker upp där kartan är hög, håller ihop och rör sig mot en bättre plats i närheten. En grupp lever en tid (LIV) och
// dyker sedan upp på en ny plats. Den krymper när den jagas (där lagret är tömt), och en grupp som jagats slut kommer
// tillbaka först när dess tid är slut, på en ny plats. Allt räknas fram ur kartan och klockan, så att kaninerna är
// desamma i spelet och vid ikappräkning och inget behöver sparas.
// Fångsten beror på hur nära en grupp jaktplatsen är (narvaro, som fynd.ts väger in i richness).
// En kanin sitter still en stund och skuttar sedan en bit. Den som kommer nära får den att hoppa undan en bit och sitta
// still där. De enskilda kaninerna ritas bara; jakten ger mest nära en grupp (`narvaroAt`, via richness). Fler arter
// (rådjur, fågel) blir egna lager och grupper senare.
export interface Djur { id: number; art: 'kanin' | 'varg' | 'radjur' | 'fagel'; x: number; y: number; grupp: number; u?: number } // u: fågelns utseende (steg 6.6.3) // grupp = kaningruppen eller vargflocken
export interface Kaningrupp { id: number; x: number; y: number; n: number } // n: så många kaniner gruppen har just nu
// Balanstal (regel 8): kaninernas grupper (antal, storlek, hur länge de stannar och hur långt de rör sig), hur de flyr
// från folk och hur mycket jakten ger nära dem. Jaktens ursprungliga värde finns i viltlagret (FYND.jakt i fynd.ts)
export const KANINER = balans('djur', {
  grupper: 4, // högst så många grupper på kartan samtidigt
  storlek: [2, 6], // kaniner i en grupp som inte jagats (minst, högst)
  livTim: 12, // så många timmar håller en grupp till i samma trakt innan den dyker upp någon annanstans
  vandra: 5, // så långt (rutor) gruppen kan röra sig mot en bättre plats under sin tid ...
  glid: 1.5, // ... och den är framme efter 1 / glid av sin tid
  startMin: 0.3, // en grupp dyker bara upp där viltkartan är över så här stor del av toppen ...
  startAvst: 8, // ... och minst så här många rutor från en annan grupp
  malBas: 0.8, // platsen den rör sig mot väljs efter kartan gånger malBas + malSpann * slump
  malSpann: 0.4,
  kollR: 2, // gruppen krymper efter hur mycket som finns kvar av vad kartan ger inom så här många rutor
  spridd: 1.4, // så långt (rutor) från gruppens mitt kaninerna sitter
  skuttSek: 9, // så ofta (sekunder) skuttar en kanin, ungefär
  radd: 2.2, // så nära (rutor) en människa kommer innan kaninen hoppar undan ...
  hopp: 3, // ... så långt (rutor) hoppar den ...
  hoppMax: 2, // ... och högst så här många hopp i rad
  narvR: 5, // så långt (rutor) från gruppen jakten ger något
  narvBas: 0.4, // fångsten långt från grupperna (en och annan kanin för sig själv), mot kartan ensam
  narvK: 1.6, // så mycket mer det ger mitt i en full grupp
});
const LIVSTID = KANINER.livTim * HOUR; // så länge en grupp håller till i samma trakt
const SKUTT = KANINER.skuttSek * SEC; // så ofta en kanin skuttar, ungefär

interface Start { x0: number; y0: number; x1: number; y1: number; n0: number }
const starter = tvaDelar<Map<string, Start | null>>(); // gränssnittet räknar i en egen del (typer.ts)
const tidAv = (k: number) => (k * LIVSTID) / KANINER.grupper; // grupperna byter plats en i taget
const epokOf = (k: number, t: number) => Math.floor((t - tidAv(k)) / LIVSTID);
// var grupp k dyker upp under sin tid e: en ruta där kartan är hög (slumpad med vikt efter kartan), en bit från de andra
// grupperna (där de är när tiden börjar), och den bästa platsen i närheten som den rör sig mot. Bara ur kartan och tiden
// (viltStart i fynd.ts), så att platsen blir densamma när cachen töms och efter inläsning
function start(s: State, k: number, e: number): Start | null {
  const key = `${mapKey(s.seed)},${k},${e}`, f = starter.sim.get(s);
  if (f?.has(key)) return f.get(key)!;
  const d = egen(starter);
  let m = d.get(s);
  if (!m) d.set(s, m = new Map());
  if (m.has(key)) return m.get(key)!;
  const topp = FYND.jakt.topp, salt = s.seed * 31 + k * 977 + e * 7919, t0 = tidAv(k) + e * LIVSTID;
  const andra: { x: number; y: number }[] = [];
  for (let j = 0; j < k; j++) { const g = mitt(s, j, t0); if (g) andra.push(g); }
  let bi = -1, bs = -Infinity;
  const vax = viltStart(s, t0, motgangNu(s, t0)?.id === 'torka');
  for (let i = 0; i < W * H; i++) {
    const v = vax[i] / topp;
    if (v < KANINER.startMin) continue;
    const x = (i % W) + 0.5, y = Math.floor(i / W) + 0.5;
    if (andra.some(a => Math.hypot(a.x - x, a.y - y) < KANINER.startAvst)) continue;
    const sc = Math.log(hash(salt, i, 7) || 1e-9) / (v * v); // större v: större chans
    if (sc > bs) { bs = sc; bi = i; }
  }
  let st: Start | null = null;
  if (bi >= 0) {
    const x0 = bi % W, y0 = Math.floor(bi / W);
    let gi = bi, gs = -1;
    for (let dy = -KANINER.vandra; dy <= KANINER.vandra; dy++) for (let dx = -KANINER.vandra; dx <= KANINER.vandra; dx++) {
      const x = x0 + dx, y = y0 + dy;
      if (!inMap(x, y) || Math.hypot(dx, dy) > KANINER.vandra) continue;
      const j = y * W + x, v = vax[j] * (KANINER.malBas + KANINER.malSpann * hash(salt, j, 9));
      if (v > gs) { gs = v; gi = j; }
    }
    st = { x0: x0 + 0.5, y0: y0 + 0.5, x1: (gi % W) + 0.5, y1: Math.floor(gi / W) + 0.5, n0: KANINER.storlek[0] + Math.floor(hash(salt, 1, 3) * (KANINER.storlek[1] - KANINER.storlek[0] + 1)) };
  }
  if (m.size > 64) m.clear();
  m.set(key, st);
  return st;
}
// gruppens mitt vid tiden t: den glider mot den bättre platsen under första delen av sin tid
function mitt(s: State, k: number, t = s.now) {
  const e = epokOf(k, t), st = start(s, k, e);
  if (!st) return undefined;
  const f = Math.min(1, ((t - tidAv(k)) / LIVSTID - e) * KANINER.glid), g = f * f * (3 - 2 * f);
  return { x: st.x0 + (st.x1 - st.x0) * g, y: st.y0 + (st.y1 - st.y0) * g, e, st };
}
// varje steg: en grupp som får en ny tid väljer sin plats direkt, så att platsen blir densamma i båda lägena
export function djurSteg(s: State) { for (let k = 0; k < KANINER.grupper; k++) mitt(s, k); }
// grupperna vid tiden t (just nu om inget annat sägs). En grupp krymper där lagret är tömt (där man jagat), och är tom
// när det jagats slut. Med bara (en fråga om gruppens mitt) räknas bara de grupper som den godtar
// så långt gruppen flytt från jägare fram till tiden t (steg 4.5.4.1): hela gruppen följer med den som flyr
function flyttAv(s: State, g: number, t: number) {
  let dx = 0, dy = 0, har = false;
  for (const f of s.djurFlykt ?? []) if (f.g === g && f.t <= t) { dx += f.dx; dy += f.dy; har = true; }
  return har ? { dx, dy } : undefined;
}
// gruppen g flyr från tiden t så här långt; det som är äldre än en grupps tid i trakten glöms
// Gruppen flyr aldrig ut i vattnet: vägen kortas tills den slutar på land med land omkring, annars flyr den inte
export function gruppFlyr(s: State, g: number, t: number, dx: number, dy: number) {
  const c = (arRadjurGrupp(g) ? radjurGrupper(s, t) : grupperOf(s, t)).find(q => q.id === g), vt = vattenNu(s);
  const land = (x: number, y: number) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const a = Math.floor(x) + i, b = Math.floor(y) + j; if (!inMap(a, b) || vt[b * W + a] === T.Vatten) return false; } return true; };
  const f = c ? [1, 0.75, 0.5, 0.25].find(k => land(clamp(c.x + dx * k, 1, W - 1), clamp(c.y + dy * k, 1, H - 1))) : undefined;
  if (f === undefined) return;
  s.djurFlykt = [...(s.djurFlykt ?? []).filter(q => s.now - q.t < LIVSTID), { g, t, dx: dx * f, dy: dy * f }];
}
export function grupperOf(s: State, t = s.now, bara?: (x: number, y: number) => boolean): Kaningrupp[] {
  const ut: Kaningrupp[] = [], tj = takenOf(s).jakt;
  for (let k = 0; k < KANINER.grupper; k++) {
    const c = mitt(s, k, t);
    if (!c) continue;
    const id = c.e * KANINER.grupper + k, f = flyttAv(s, id, t), gx = f ? clamp(c.x + f.dx, 1, W - 1) : c.x, gy = f ? clamp(c.y + f.dy, 1, H - 1) : c.y;
    if (bara && !bara(gx, gy)) continue;
    let har = 0, kan = 0;
    const cx = Math.floor(c.x), cy = Math.floor(c.y);
    for (let dy = -KANINER.kollR; dy <= KANINER.kollR; dy++) for (let dx = -KANINER.kollR; dx <= KANINER.kollR; dx++) {
      const x = cx + dx, y = cy + dy;
      if (!inMap(x, y)) continue;
      const i = y * W + x, v = vaxerAt(s, 'jakt', i); // det som finns kvar är det som växer gånger det som inte tagits (som fyndAt)
      har += v * (tj ? 1 - tj[i] : 1); kan += v;
    }
    const n = kan > 0 ? Math.round(c.st.n0 * Math.min(1, har / kan)) : 0;
    ut.push({ id, x: gx, y: gy, n });
  }
  return ut;
}
// hur mycket jakten ger på rutan, mot kartan: narvBas långt från alla grupper, narvBas + narvK mitt i en full grupp.
// Räknas om varje timme (av gränssnittet i en egen del, typer.ts)
const narv = tvaDelar<{ key: string; v: Float32Array }>();
function narvaroAt(s: State, i: number) {
  const key = `${mapKey(s.seed)},${Math.floor(s.now / HOUR)}`;
  let c = narv.sim.get(s);
  if (visning.pa && c?.key !== key) c = narv.bild.get(s);
  if (!c || c.key !== key) {
    const v = new Float32Array(W * H).fill(KANINER.narvBas);
    for (const g of grupperOf(s)) {
      if (g.n <= 0) continue;
      const w = KANINER.narvK * g.n / KANINER.storlek[1];
      for (let y = Math.max(0, Math.floor(g.y - KANINER.narvR)); y <= Math.min(H - 1, Math.ceil(g.y + KANINER.narvR)); y++)
        for (let x = Math.max(0, Math.floor(g.x - KANINER.narvR)); x <= Math.min(W - 1, Math.ceil(g.x + KANINER.narvR)); x++) {
          const d = Math.hypot(x + 0.5 - g.x, y + 0.5 - g.y);
          if (d < KANINER.narvR) v[y * W + x] += w * (1 - d / KANINER.narvR);
        }
    }
    egen(narv).set(s, c = { key, v });
  }
  return c.v[i];
}
setNarvaro('jakt', narvaroAt);
// var kaninerna är vid tiden t (gränssnittet ger tiden som visas): nära gruppens mitt, ett skutt i taget, och undan
// från folk som kommer nära. Gränssnittet ger var folket syns (folk), eftersom simuleringen ligger före bilden
// så långt (rutor) en kanin kan sitta från gruppens mitt: spridningen, skuttet, hoppen undan och vägen till land (landNara)
export const KANIN_UT = KANINER.spridd + 0.6 * Math.SQRT2 + KANINER.hopp * KANINER.hoppMax + 5.5 * Math.SQRT2 + 1;
export function djurOf(s: State, t = s.now, folk?: readonly { x: number; y: number }[], bara?: (x: number, y: number) => boolean): Djur[] {
  const ppl = folk ?? living(s), out: Djur[] = [], vt = vattenNu(s), torr = (q: { x: number; y: number }) => vt[Math.floor(q.y) * W + Math.floor(q.x)] !== T.Vatten;
  const doda = new Set(s.djurDoda?.map(d => d.id));
  for (const g of grupperOf(s, t, bara)) for (let j = 0, kvar = g.n; j < 8 && kvar > 0; j++) {
    const id = g.id * 8 + j;
    if (doda.has(id)) continue; // en dödad kanin är borta, och nästa i gruppen syns i stället (steg 3.7.13)
    kvar--;
    const ang = hash(id, 4, 11) * Math.PI * 2, r = KANINER.spridd * Math.sqrt(hash(id, 5, 13));
    const hx = g.x + Math.cos(ang) * r, hy = g.y + Math.sin(ang) * r;
    const u = t / SKUTT + hash(id, 3, 5) * 10, k = Math.floor(u), f = u - k;
    const at = (n: number) => ({ x: hx + (hash(id, n, 1) - 0.5) * 1.2, y: hy + (hash(id, n, 2) - 0.5) * 1.2 });
    const a = at(k), b = at(k + 1), hop = f > 0.85 ? (f - 0.85) / 0.15 : 0; // sitter still, sedan ett snabbt skutt
    let x = a.x + (b.x - a.x) * hop, y = a.y + (b.y - a.y) * hop;
    // den som kommer nära får kaninen att hoppa undan en bit, rakt bort i en av åtta riktningar, och sitta still där
    for (let n = 0; n < KANINER.hoppMax; n++) {
      let near: { x: number; y: number } | undefined, nd = KANINER.radd;
      for (const p of ppl) { const d = Math.hypot(x - p.x, y - p.y); if (d < nd) { nd = d; near = p; } }
      if (!near) break;
      const v = Math.round(Math.atan2(y - near.y, x - near.x) / (Math.PI / 4)) * (Math.PI / 4);
      x += Math.cos(v) * KANINER.hopp; y += Math.sin(v) * KANINER.hopp;
    }
    // kaninen står aldrig i vattnet (kodgenomgången 3.10.25): den sitter kvar, går till sin plats i gruppen, till gruppens
    // mitt eller till närmaste land
    let q = { x: clamp(x, 0.2, W - 0.2), y: clamp(y, 0.2, H - 0.2) };
    if (!torr(q)) q = [a, { x: hx, y: hy }, g].map(c => ({ x: clamp(c.x, 0.2, W - 0.2), y: clamp(c.y, 0.2, H - 0.2) })).find(torr) ?? landNara(vt, q);
    out.push({ id, art: 'kanin', x: q.x, y: q.y, grupp: g.id });
  }
  return out;
}

// närmaste land i ringar kring punkten (som freeNear i byggnad.ts), annars punkten själv
function landNara(vt: Uint8Array | number[], q: { x: number; y: number }) {
  const x0 = Math.floor(q.x), y0 = Math.floor(q.y);
  for (let r = 1; r < 40; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { // långt ut: en grupp som flytt ut på torr sjöbotten kan stå mitt i sjön när vattnet kommer tillbaka
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = x0 + dx, y = y0 + dy;
    if (inMap(x, y) && vt[y * W + x] !== T.Vatten) return { x: x + 0.5, y: y + 0.5 };
  }
  return q;
}

// ---------- rådjuren (steg 6.6.2) ----------
// Rådjuren lever i några få små grupper (2–5) i skogskanten: en ruta utan skog med skog inom RADJUR.kant rutor, så som
// marken var när byn grundades (startGround), en bit från byplatsen. En grupp håller till på samma plats en tid (livTim)
// och dyker sedan upp på en ny. Varje rådjur betar en stund på en plats och går sedan sakta till en ny en bit bort. De är
// skygga: den som kommer inom RADJUR.radd rutor får dem att springa långt undan. En grupp som skräms av en jägare flyr
// ännu längre (flyJakt, gruppFlyr). Ett fällt rådjur är borta ur gruppen tills gruppen dykt upp på en ny plats. Allt räknas
// ur kartan och klockan (som kaninerna), så att rådjuren är desamma i båda lägena; bara de fällda sparas (s.djurDoda).
// Rådjurens id ligger över RAD_ID, så att de aldrig blandas ihop med kaninernas och vargarnas
export const RADJUR = balans('radjur', {
  grupper: 2, // så många grupper på kartan samtidigt
  storlek: [2, 5], // rådjur i en grupp (minst, högst)
  livTim: 24, // så många timmar håller en grupp till på samma plats
  kant: 2, // skogskanten: en öppen ruta med skog inom så här många rutor
  hemAvst: 18, // och minst så här långt från byplatsen
  startAvst: 15, // en grupp dyker upp minst så här långt från en annan
  spridd: 2, // så långt (rutor) från gruppens mitt rådjuren betar
  betaSek: 40, // så länge ett rådjur betar på en plats innan det går till nästa (ungefär)
  radd: 5.5, // så nära (rutor) en människa kommer innan rådjuret springer undan ...
  fly: 6, // ... så långt (rutor) springer det ...
  flyMax: 2, // ... och högst så här många gånger i rad
  flyJakt: 12, // så långt flyr gruppen när en jägare skrämt den (kaninerna: JAKT.fly)
  upptack: 1.8, // rådjuret ser jägaren så här mycket längre bort än en kanin med samma skygghet (jakt.ts)
  dod: 0.45, // ett rådjur dör av träffar av den här graden sammanlagt (kaninen: JAKT.dod)
  jaktR: 14, // en jägare med spjut går hellre mot ett rådjur än en kanin om det finns ett inom så här många rutor
});
const RAD_LIV = RADJUR.livTim * HOUR, RAD_G = 25_000_000; // gruppernas id börjar här, rådjurens vid RAD_G * 8
export const arRadjur = (id: number) => id >= RAD_G * 8 && id < FAG_G * 8; // fåglarnas id ligger över (steg 6.6.3)
const arRadjurGrupp = (g: number) => g >= RAD_G && g < FAG_G;
// skogskanten: rutorna där rådjur kan dyka upp, så som marken var när byn grundades
const radjurPlatser = perKarta((seed): number[] => {
  const g = startGround(seed), m = getMap(seed), ut: number[] = [], k = RADJUR.kant;
  for (let y = k; y < H - k; y++) for (let x = k; x < W - k; x++) {
    const i = y * W + x;
    if (!isSoil(m.tiles[i]) || g.trees[i] >= FOREST || Math.hypot(x - m.fire.x, y - m.fire.y) < RADJUR.hemAvst) continue;
    let skog = false;
    for (let dy = -k; dy <= k && !skog; dy++) for (let dx = -k; dx <= k; dx++) if (g.trees[i + dy * W + dx] >= FOREST) { skog = true; break; }
    if (skog) ut.push(i);
  }
  return ut;
});
const radTid = (k: number) => (k * RAD_LIV) / RADJUR.grupper;
// var grupp k håller till under sin tid e, och hur många den har: en slumpad ruta i skogskanten, en bit från de andra
function radStart(s: State, k: number, e: number): { x: number; y: number; n: number } | undefined {
  const pl = radjurPlatser(s.seed);
  if (!pl.length) return undefined;
  const salt = s.seed * 53 + k * 1013 + e * 7907, andra: { x: number; y: number }[] = [];
  for (let j = 0; j < k; j++) { const a = radStart(s, j, Math.floor((radTid(k) + e * RAD_LIV - radTid(j)) / RAD_LIV)); if (a) andra.push(a); }
  for (let f = 0; f < 12; f++) {
    const i = pl[Math.floor(hash(salt, f, 3) * pl.length)], x = (i % W) + 0.5, y = Math.floor(i / W) + 0.5;
    if (f < 11 && andra.some(a => Math.hypot(a.x - x, a.y - y) < RADJUR.startAvst)) continue;
    return { x, y, n: RADJUR.storlek[0] + Math.floor(hash(salt, 1, 5) * (RADJUR.storlek[1] - RADJUR.storlek[0] + 1)) };
  }
  return undefined;
}
// rådjursgrupperna vid tiden t: platsen och hur långt de flytt från jägare (som kaninernas, gruppFlyr)
export function radjurGrupper(s: State, t = s.now, bara?: (x: number, y: number) => boolean): Kaningrupp[] {
  const ut: Kaningrupp[] = [];
  for (let k = 0; k < RADJUR.grupper; k++) {
    const e = Math.floor((t - radTid(k)) / RAD_LIV), st = radStart(s, k, e);
    if (!st) continue;
    const id = RAD_G + e * RADJUR.grupper + k, f = flyttAv(s, id, t), x = f ? clamp(st.x + f.dx, 1, W - 1) : st.x, y = f ? clamp(st.y + f.dy, 1, H - 1) : st.y;
    if (bara && !bara(x, y)) continue;
    ut.push({ id, x, y, n: st.n });
  }
  return ut;
}
// så långt (rutor) ett rådjur kan stå från gruppens mitt: betet, flykten och vägen till land
export const RADJUR_UT = RADJUR.spridd + 1 + RADJUR.fly * RADJUR.flyMax + 5.5 * Math.SQRT2 + 1;
// rådjuren vid tiden t: var och en betar kring gruppens mitt och springer undan från folk som kommer nära (folk: var folket
// syns, från gränssnittet). Ett fällt rådjur är borta
export function radjurOf(s: State, t = s.now, folk?: readonly { x: number; y: number }[], bara?: (x: number, y: number) => boolean): Djur[] {
  const ppl = folk ?? living(s), out: Djur[] = [], vt = vattenNu(s), torr = (q: { x: number; y: number }) => vt[Math.floor(q.y) * W + Math.floor(q.x)] !== T.Vatten;
  const doda = new Set(s.djurDoda?.map(d => d.id)), BETA = RADJUR.betaSek * SEC;
  for (const g of radjurGrupper(s, t, bara)) for (let j = 0; j < g.n; j++) {
    const id = g.id * 8 + j;
    if (doda.has(id)) continue;
    // betet: en plats en stund, sedan några sekunders gång till nästa
    const u = t / BETA + hash(id, 3, 5) * 10, k = Math.floor(u), f = u - k;
    const at = (n: number) => { const a = hash(id, n, 1) * Math.PI * 2, r = RADJUR.spridd * Math.sqrt(hash(id, n, 2)); return { x: g.x + Math.cos(a) * r, y: g.y + Math.sin(a) * r }; };
    const a = at(k), b = at(k + 1), ga = f > 0.8 ? (f - 0.8) / 0.2 : 0;
    let x = a.x + (b.x - a.x) * ga, y = a.y + (b.y - a.y) * ga;
    for (let n = 0; n < RADJUR.flyMax; n++) {
      let near: { x: number; y: number } | undefined, nd = RADJUR.radd;
      for (const p of ppl) { const d = Math.hypot(x - p.x, y - p.y); if (d < nd) { nd = d; near = p; } }
      if (!near) break;
      const d = Math.max(0.01, nd);
      x += (x - near.x) / d * RADJUR.fly; y += (y - near.y) / d * RADJUR.fly;
    }
    let q = { x: clamp(x, 0.2, W - 0.2), y: clamp(y, 0.2, H - 0.2) };
    if (!torr(q)) q = [a, g].map(c => ({ x: clamp(c.x, 0.2, W - 0.2), y: clamp(c.y, 0.2, H - 0.2) })).find(torr) ?? landNara(vt, q);
    out.push({ id, art: 'radjur', x: q.x, y: q.y, grupp: g.id });
  }
  return out;
}

// ---------- fåglarna (steg 6.6.3) ----------
// En enda fågel i registret med tre utseenden efter platsen: skogsduvan inne i skogen, ripan på öppen mark och orren i
// skogskanten däremellan. De är samma djur och ger samma saker. Fåglarna sitter i små flockar (1–3) på marken, i skogen och
// på öppen mark, och en flock håller till på samma plats en tid (livTim) innan den dyker upp på en ny. Den som kommer inom
// FAGEL.radd rutor får fågeln att flyga upp och landa en bit bort (fly). Missar en jägare, eller fäller en, flyger alla
// fåglar inom FAGEL.bort rutor bort från kartan, och nya kommer tillbaka efter aterTim timmar (s.faglarBorta). Spjutet
// träffar en fågel sällan (traff); snaran kommer senare (steg 7.5.10). Allt räknas ur kartan och klockan, som rådjuren;
// bara de fällda och platserna där fåglarna flugit bort sparas. Fåglarnas id ligger över FAG_G * 8
export const FAGEL = balans('fagel', {
  grupper: 5, // så många flockar på kartan samtidigt
  storlek: [1, 3], // fåglar i en flock (minst, högst)
  livTim: 12, // så många timmar håller en flock till på samma plats
  hemAvst: 8, // och minst så här långt från byplatsen
  startAvst: 10, // en flock dyker upp minst så här långt från en annan
  spridd: 1.2, // så långt (rutor) från flockens mitt fåglarna pickar
  pickSek: 25, // så länge en fågel pickar på en plats innan den tar några steg till nästa (ungefär)
  radd: 3, // så nära (rutor) en människa kommer innan fågeln flyger upp ...
  fly: 4, // ... och landar så här långt bort
  bort: 6, // en miss eller en fälld fågel: alla fåglar inom så här många rutor flyger bort från kartan ...
  aterTim: 6, // ... och nya kommer tillbaka efter så här många timmar
  traff: 0.25, // spjutet (eller stenen) träffar en fågel så här mycket sämre än en kanin
  upptack: 1.2, // fågeln ser jägaren så här mycket längre bort än en kanin med samma skygghet (jakt.ts)
  dod: 0.05, // en fågel dör av träffar av den här graden sammanlagt
  kant: 2, // orren: en öppen ruta med skog inom så här många rutor
  agg: 0.01, // ägg per timme samlande på våren, räknat i samlandets fart (ACTS.samla.fart): ett ägg ibland, några om dygnet i byn (steg 6.6.3, steg.ts)
});
export const FAGEL_UTSEENDE = ['orre', 'ripa', 'duva'] as const; // orren i skogskanten, ripan på öppen mark, skogsduvan i skogen
const FAG_LIV = FAGEL.livTim * HOUR, FAG_G = 30_000_000; // flockarnas id börjar här, fåglarnas vid FAG_G * 8
export const arFagel = (id: number) => id >= FAG_G * 8;
// platserna där fåglar kan dyka upp: jord i skogen och på öppen mark, så som marken var när byn grundades, med utseendet
// efter platsen (0 orre, 1 ripa, 2 skogsduva)
const fagelPlatser = perKarta((seed): { i: number; u: number }[] => {
  const g = startGround(seed), m = getMap(seed), ut: { i: number; u: number }[] = [], k = FAGEL.kant;
  for (let y = k; y < H - k; y++) for (let x = k; x < W - k; x++) {
    const i = y * W + x;
    if (!isSoil(m.tiles[i]) || Math.hypot(x - m.fire.x, y - m.fire.y) < FAGEL.hemAvst) continue;
    if (g.trees[i] >= FOREST) { ut.push({ i, u: 2 }); continue; }
    let skog = false;
    for (let dy = -k; dy <= k && !skog; dy++) for (let dx = -k; dx <= k; dx++) if (g.trees[i + dy * W + dx] >= FOREST) { skog = true; break; }
    ut.push({ i, u: skog ? 0 : 1 });
  }
  return ut;
});
const fagTid = (k: number) => (k * FAG_LIV) / FAGEL.grupper;
export interface Fagelflock extends Kaningrupp { u: number } // u: utseendet (FAGEL_UTSEENDE)
function fagStart(s: State, k: number, e: number): { x: number; y: number; n: number; u: number } | undefined {
  const pl = fagelPlatser(s.seed);
  if (!pl.length) return undefined;
  const salt = s.seed * 59 + k * 1031 + e * 7919, andra: { x: number; y: number }[] = [];
  for (let j = 0; j < k; j++) { const a = fagStart(s, j, Math.floor((fagTid(k) + e * FAG_LIV - fagTid(j)) / FAG_LIV)); if (a) andra.push(a); }
  for (let f = 0; f < 12; f++) {
    const p = pl[Math.floor(hash(salt, f, 3) * pl.length)], x = (p.i % W) + 0.5, y = Math.floor(p.i / W) + 0.5;
    if (f < 11 && andra.some(a => Math.hypot(a.x - x, a.y - y) < FAGEL.startAvst)) continue;
    return { x, y, u: p.u, n: FAGEL.storlek[0] + Math.floor(hash(salt, 1, 5) * (FAGEL.storlek[1] - FAGEL.storlek[0] + 1)) };
  }
  return undefined;
}
// har fåglarna vid (x, y) flugit bort från kartan vid tiden t
const borta = (s: State, x: number, y: number, t: number) => !!s.faglarBorta?.some(b => t >= b.t && t < b.t + FAGEL.aterTim * HOUR && Math.hypot(b.x - x, b.y - y) < FAGEL.bort);
// fåglarna inom FAGEL.bort rutor från (x, y) flyger bort från kartan vid tiden t; det som är äldre än återkomsten glöms
export function faglarFlygerBort(s: State, x: number, y: number, t: number) {
  s.faglarBorta = [...(s.faglarBorta ?? []).filter(b => s.now - b.t < FAGEL.aterTim * HOUR), { x, y, t }];
}
// flockarna vid tiden t (de som inte flugit bort)
export function fagelFlockar(s: State, t = s.now, bara?: (x: number, y: number) => boolean): Fagelflock[] {
  const ut: Fagelflock[] = [];
  for (let k = 0; k < FAGEL.grupper; k++) {
    const e = Math.floor((t - fagTid(k)) / FAG_LIV), st = fagStart(s, k, e);
    if (!st || (bara && !bara(st.x, st.y)) || borta(s, st.x, st.y, t)) continue;
    ut.push({ id: FAG_G + e * FAGEL.grupper + k, x: st.x, y: st.y, n: st.n, u: st.u });
  }
  return ut;
}
export const FAGEL_UT = FAGEL.spridd + 1 + FAGEL.fly + 1; // så långt (rutor) en fågel kan sitta från flockens mitt
// fåglarna vid tiden t: var och en pickar kring flockens mitt och flyger upp och landar en bit bort när någon kommer nära
// (folk: var folket syns, från gränssnittet). En fälld fågel är borta
export function faglarOf(s: State, t = s.now, folk?: readonly { x: number; y: number }[], bara?: (x: number, y: number) => boolean): Djur[] {
  const ppl = folk ?? living(s), out: Djur[] = [], vt = vattenNu(s), torr = (q: { x: number; y: number }) => vt[Math.floor(q.y) * W + Math.floor(q.x)] !== T.Vatten;
  const doda = new Set(s.djurDoda?.map(d => d.id)), PICK = FAGEL.pickSek * SEC;
  for (const g of fagelFlockar(s, t, bara)) for (let j = 0; j < g.n; j++) {
    const id = g.id * 8 + j;
    if (doda.has(id)) continue;
    const u = t / PICK + hash(id, 3, 5) * 10, k = Math.floor(u), f = u - k;
    const at = (n: number) => { const a = hash(id, n, 1) * Math.PI * 2, r = FAGEL.spridd * Math.sqrt(hash(id, n, 2)); return { x: g.x + Math.cos(a) * r, y: g.y + Math.sin(a) * r }; };
    const a = at(k), b = at(k + 1), ga = f > 0.85 ? (f - 0.85) / 0.15 : 0;
    let x = a.x + (b.x - a.x) * ga, y = a.y + (b.y - a.y) * ga, near: { x: number; y: number } | undefined, nd = FAGEL.radd;
    for (const p of ppl) { const d = Math.hypot(x - p.x, y - p.y); if (d < nd) { nd = d; near = p; } }
    if (near) { const d = Math.max(0.01, nd); x += (x - near.x) / d * FAGEL.fly; y += (y - near.y) / d * FAGEL.fly; }
    let q = { x: clamp(x, 0.2, W - 0.2), y: clamp(y, 0.2, H - 0.2) };
    if (!torr(q)) q = [a, g].map(c => ({ x: clamp(c.x, 0.2, W - 0.2), y: clamp(c.y, 0.2, H - 0.2) })).find(torr) ?? landNara(vt, q);
    out.push({ id, art: 'fagel', x: q.x, y: q.y, grupp: g.id, u: g.u });
  }
  return out;
}
// fågelns utseende ur dess id (flockens plats bestämmer det; fågeln är borta när flocken bytt plats)
export const fagelUtseende = (s: State, id: number, t = s.now) => fagelFlockar(s, t).find(g => g.id === Math.floor(id / 8))?.u ?? 1;

// vargarna (steg 3.7.1, varg.ts): flockarna är sparade i byn, och vargarna går tätt kring flockens mitt, ledaren först.
// En varg står aldrig i vattnet (kodgenomgången 3.10.25): den går vid flockens mitt eller på närmaste land
export function vargarOf(s: State): Djur[] {
  const out: Djur[] = [], vt = vattenNu(s), torr = (q: { x: number; y: number }) => vt[Math.floor(q.y) * W + Math.floor(q.x)] !== T.Vatten;
  for (const f of s.vargar ?? []) f.vargar.forEach((id, j) => {
    const ang = hash(id, 4, 11) * Math.PI * 2 + s.now / (60 * SEC) * (hash(id, 7, 11) - 0.5), r = j ? 0.7 + 0.9 * hash(id, 5, 13) : 0;
    let q = { x: clamp(f.x + Math.cos(ang) * r, 0.2, W - 0.2), y: clamp(f.y + Math.sin(ang) * r, 0.2, H - 0.2) };
    if (!torr(q)) q = torr(f) ? { x: f.x, y: f.y } : landNara(vt, q);
    out.push({ id, art: 'varg', x: q.x, y: q.y, grupp: f.id });
  });
  return out;
}

// ---------- djuren som individer (steg 3.7.13) ----------
// Varje djur är en individ med ålder, styrka, snabbhet och skygghet (kaninen) eller mod (vargen, steg 3.7.1). Egenskaperna
// räknas ur djurets id kring artens värden i djurregistret (DJUR[art].strid i redskap.ts), så att inget behöver sparas.
// Hälsan är förenklad: blod och sår som i striden, inga kroppsdelar, sjukdomar eller behov. Bara skadade och dödade djur
// sparas i byn (s.djurHalsa och s.djurDoda); blodet och såren läker med tiden, räknat ur klockan, och ett djur som läkt
// eller dött för länge sedan glöms. Allt är därför detsamma i båda lägena
export const INDIVID = balans('individ', {
  spann: 0.25, // styrka och snabbhet varierar så här mycket åt båda håll kring artens värde
  gammal: 0.7, // ett djur som levt mer än så här stor del av sin längsta ålder blir långsammare ...
  gammalFart: 0.4, // ... med upp till så här stor del av farten
  blodTim: 0.05, // så mycket blod kommer tillbaka per timme
  sarTim: 0.04, // så mycket sår (summan av skadornas grad) läker per timme
  glomTim: 24, // ett dödat djur glöms efter så här många timmar (gruppen det hörde till har bytt plats då)
});
export interface DjurDrag { alder: number; styrka: number; snabbhet: number; skygghet?: number; mod?: number }
export interface DjurHalsa { id: number; blod: number; sar: number; t: number } // blod 0–1 och sår, sparat vid tiden t
// djurets egenskaper: ur id:t, kring artens värden. Ålder i år (ett dygn i verkligheten), styrka och snabbhet i artens
// mått (snabbhet gånger stridens fart), skygghet och mod 0–1
export function dragOf(art: Djur['art'], id: number): DjurDrag {
  const d = DJUR[art].strid, v = (n: number) => 1 + (hash(id, n, 21) * 2 - 1) * INDIVID.spann;
  const alder = Math.floor(hash(id, 1, 21) * d.alder) + 1, aldr = Math.max(0, alder / d.alder - INDIVID.gammal) / (1 - INDIVID.gammal);
  return { alder, styrka: d.styrka * v(2), snabbhet: d.fart * v(3) * (1 - INDIVID.gammalFart * aldr), ...(art === 'varg' ? { mod: hash(id, 5, 21) } : { skygghet: hash(id, 4, 21) }) }; // rådjuret är skyggt som kaninen
}
// djurets hälsa just nu: det sparade, läkt med tiden sedan dess
export function halsaOf(s: State, id: number): { blod: number; sar: number; dod: boolean } {
  if (s.djurDoda?.some(d => d.id === id)) return { blod: 0, sar: 0, dod: true };
  const h = s.djurHalsa?.find(x => x.id === id);
  if (!h) return { blod: 1, sar: 0, dod: false };
  const tim = (s.now - h.t) / HOUR;
  return { blod: Math.min(1, h.blod + INDIVID.blodTim * tim), sar: Math.max(0, h.sar - INDIVID.sarTim * tim), dod: false };
}
// efter en strid: djurets blod och sår just nu, eller att det dog. Läkta och glömda djur tas bort samtidigt
export function satDjurHalsa(s: State, id: number, blod: number, sar: number) {
  if (blod <= 0) { dodaDjur(s, id); return; }
  const h = (s.djurHalsa ?? []).filter(x => x.id !== id && halsaOf(s, x.id).blod < 1);
  if (blod < 1 || sar > 0) h.push({ id, blod, sar, t: s.now });
  s.djurHalsa = h.length ? h : undefined;
}
export function dodaDjur(s: State, id: number) {
  s.djurHalsa = s.djurHalsa?.filter(x => x.id !== id);
  if (!s.djurHalsa?.length) s.djurHalsa = undefined;
  s.djurDoda = [...(s.djurDoda ?? []).filter(d => s.now - d.t < INDIVID.glomTim * HOUR), { id, t: s.now }];
}
