// sjöarna: varje sammanhängande vatten på kartan är en sjö. Byn räknar fiskeförsök, fångster och bad per sjö
// när de händer, och personrutan visar dem när man trycker på vattnet (ui/flikar/sjo.ts)
import { getMap, perKarta, vnoise } from './karta';
import { H, OX, OY, Person, State, T, W, inMap } from './typer';
import { clamp } from './slump';
import { balans } from './balans';

export interface SjoLogg { t: number; id: number; k: 'fisk' | 'bad' }
export interface SjoStat {
  forsok: number; napp: number; fisk: number; bad: number;
  fiskare: Record<number, number>; badare: Record<number, number>; // fångade fiskar och bad per person
  log: SjoLogg[]; // de senaste fångsterna och baden
}
export const SJO_LOGG = 60; // så många händelser per sjö sparas

// sjöns nummer för varje ruta vatten (0 = den största), -1 på land. storlek = rutor per sjö, mitt = sjöns mittpunkt
export const sjoarna = perKarta(seed => {
  const t = getMap(seed).tiles, id = new Int16Array(W * H).fill(-1), delar: number[][] = [];
  for (let i = 0; i < W * H; i++) if (t[i] === T.Vatten && id[i] < 0) {
    const del: number[] = [i], st = [i]; id[i] = 0;
    while (st.length) {
      const j = st.pop()!, x = j % W, y = (j - x) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy, k = yy * W + xx;
        if (inMap(xx, yy) && t[k] === T.Vatten && id[k] < 0) { id[k] = 0; del.push(k); st.push(k); }
      }
    }
    delar.push(del);
  }
  delar.sort((a, b) => b.length - a.length || a[0] - b[0]);
  delar.forEach((d, n) => { for (const j of d) id[j] = n; });
  const mitt = delar.map(d => { let x = 0, y = 0; for (const j of d) { x += j % W; y += Math.floor(j / W); } return { x: x / d.length, y: y / d.length }; });
  return { id, rutor: delar, mitt };
});

// hur smutsigt vattnet är vid varje ruta på land intill vattnet (steg 2.4.1): 0 = rent, 1 = mycket smutsigt, och 0 på
// rutor som inte ligger vid vattnet. Ett mjukt mönster över kartan, så att smutsen följer stränder och vikar (törsten i torst.ts)
export const VATTEN = balans('vatten', {
  skala: 7, // mönstrets storlek i rutor
  fran: 0.35, spann: 0.5, // smutsen börjar där bruset (0–1) är fran och är full vid fran + spann
});
export const smutsOf = perKarta(seed => {
  const t = getMap(seed).tiles, v = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (t[y * W + x] === T.Vatten) continue;
    let vid = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (inMap(xx, yy) && t[yy * W + xx] === T.Vatten) vid = true; }
    if (vid) v[y * W + x] = clamp((vnoise(seed ^ 0x5a17, (x - OX) / VATTEN.skala, (y - OY) / VATTEN.skala) - VATTEN.fran) / VATTEN.spann, 0, 1);
  }
  return v;
});

// sjön som rutan ligger i, eller närmast den som står på stranden (två rutor ut), -1 om inget vatten är nära
export function sjoVid(s: State, x: number, y: number) {
  const { id } = sjoarna(s.seed), cx = Math.floor(x), cy = Math.floor(y);
  let bast = -1, bd = 99;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const xx = cx + dx, yy = cy + dy, d = dx * dx + dy * dy;
    if (inMap(xx, yy) && id[yy * W + xx] >= 0 && d < bd) { bd = d; bast = id[yy * W + xx]; }
  }
  return bast;
}

// sjöns namn: den största heter Sjön, de andra efter väderstrecket från elden
export function sjoNamn(s: State, n: number) {
  if (n === 0) return 'Sjön';
  const m = sjoarna(s.seed).mitt[n], f = getMap(s.seed).fire, dx = m.x - f.x, dy = m.y - f.y;
  return `Tjärnen i ${Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'öster' : 'väster') : dy > 0 ? 'söder' : 'norr'}`;
}

// räkna det som hände vid sjön där personen står (x, y): ett fiskeförsök, ett napp, en fångad fisk eller ett bad
export function sjoRakna(s: State, x: number, y: number, k: 'forsok' | 'napp' | 'fisk' | 'bad', p: Person) {
  const n = sjoVid(s, x, y);
  if (n < 0) return;
  const st = ((s.sjoar ??= {})[n] ??= { forsok: 0, napp: 0, fisk: 0, bad: 0, fiskare: {}, badare: {}, log: [] });
  st[k]++;
  if (k === 'fisk' || k === 'bad') {
    const vem = k === 'fisk' ? st.fiskare : st.badare;
    vem[p.id] = (vem[p.id] ?? 0) + 1;
    st.log.push({ t: s.now, id: p.id, k });
    if (st.log.length > SJO_LOGG) st.log.splice(0, st.log.length - SJO_LOGG);
  }
}
