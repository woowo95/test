import { FYND, fyndAt, setNarvaro, vaxerAt, viltStart } from './fynd';
import { hash } from './karta';
import { clamp } from './slump';
import { living } from './folk';
import { H, HOUR, SEC, State, W, egen, inMap, mapKey, tvaDelar, visning } from './typer';
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
export interface Djur { id: number; art: 'kanin'; x: number; y: number; grupp: number }
export interface Kaningrupp { id: number; x: number; y: number; n: number; n0: number } // n: så många kaniner gruppen har just nu, n0: när den inte jagats
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
  const vax = viltStart(s, t0);
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
// när det jagats slut
export function grupperOf(s: State, t = s.now): Kaningrupp[] {
  const ut: Kaningrupp[] = [];
  for (let k = 0; k < KANINER.grupper; k++) {
    const c = mitt(s, k, t);
    if (!c) continue;
    let har = 0, kan = 0;
    const cx = Math.floor(c.x), cy = Math.floor(c.y);
    for (let dy = -KANINER.kollR; dy <= KANINER.kollR; dy++) for (let dx = -KANINER.kollR; dx <= KANINER.kollR; dx++) {
      const x = cx + dx, y = cy + dy;
      if (!inMap(x, y)) continue;
      const i = y * W + x; har += fyndAt(s, 'jakt', i); kan += vaxerAt(s, 'jakt', i);
    }
    const n = kan > 0 ? Math.round(c.st.n0 * Math.min(1, har / kan)) : 0;
    ut.push({ id: c.e * KANINER.grupper + k, x: c.x, y: c.y, n, n0: c.st.n0 });
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
// från folk som kommer nära
export function djurOf(s: State, t = s.now): Djur[] {
  const ppl = living(s), out: Djur[] = [];
  const doda = new Set(s.djurDoda?.map(d => d.id));
  for (const g of grupperOf(s, t)) for (let j = 0, kvar = g.n; j < 8 && kvar > 0; j++) {
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
    out.push({ id, art: 'kanin', x: clamp(x, 0.2, W - 0.2), y: clamp(y, 0.2, H - 0.2), grupp: g.id });
  }
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
  return { alder, styrka: d.styrka * v(2), snabbhet: d.fart * v(3) * (1 - INDIVID.gammalFart * aldr), skygghet: hash(id, 4, 21) };
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
