// Samlandet, en gång för alla (steg 9.2.53–9.2.57): sakerna på rutan och samlarens mål
import { createState, step, living, W, H, inMap, takenOf, bynsMitt, getMap, T, areaOf, type State, type Person } from '../../sim';
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER } from './hjalp';

// det samlaren bär i hela saker (bördan är alltid hela saker, helaIBordan)
const bars = (p: Person) => (p.task?.carry ?? 0) + Object.values(p.task?.items ?? {}).reduce((a, n) => a + Math.floor(n + 1e-9), 0);

SCENARIER.rutsaker = {
  text: 'Steg 9.2.53: varje ruta har ett helt antal saker, bilden visar det antalet (sakerPaMarken), och den som plockar tar en sak från en ruta som har saker, så att rutan får en mindre',
  kor: () => {
    let hela = true, rutor = 0, medSaker = 0, plock = 0, franTom = 0, enMindre = 0;
    for (const seed of [42, 7]) {
      const s = createState(seed, START);
      for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) for (const slag of ['samla', 'grenar'] as const) {
        const n = SIM.sakerPaMarken(s, slag, x, y).reduce((a, q) => { if (!Number.isInteger(q.n) || q.n < 0) hela = false; return a + q.n; }, 0);
        rutor++; if (n > 0) medSaker++;
      }
      // samlarna följs i steg om två sekunder i sex timmar: varje gång bördan växer var rutan hen stod på inte tom, och den fick en mindre
      for (let i = 0; i < 6 * 1800; i++) {
        const fore = new Map<number, { x: number; y: number; slag: 'samla' | 'grenar'; c: number; b: number }>();
        for (const p of living(s)) {
          const t = p.task;
          if (!t || t.phase !== 'do' || t.hopp || t.sok || t.tandmat || (t.act !== 'samla' && t.act !== 'ved')) continue;
          const x = Math.floor(t.tx), y = Math.floor(t.ty), slag = t.act === 'samla' ? 'samla' : 'grenar';
          fore.set(p.id, { x, y, slag, c: SIM.sakerPaMarken(s, slag, x, y).reduce((a, q) => a + q.n, 0), b: bars(p) });
        }
        const dag = Math.floor(s.now / SIM.DAY);
        step(s, 2);
        for (const p of living(s)) {
          const f = fore.get(p.id);
          if (!f || !p.task || bars(p) <= f.b) continue;
          plock++;
          if (f.c <= 0) franTom++;
          if (Math.floor(s.now / SIM.DAY) === dag && SIM.sakerPaMarken(s, f.slag, f.x, f.y).reduce((a, q) => a + q.n, 0) < f.c) enMindre++;
        }
      }
    }
    return [
      [`varje ruta har ett helt antal saker (${medSaker} av ${rutor} rutor har saker)`, hela && medSaker > 0 && medSaker < rutor],
      [`ingen plockar från en ruta som ritas tom (${franTom} av ${plock} plock)`, plock > 50 && franTom <= plock * 0.02],
      [`rutan har en sak mindre efter plocket (${enMindre} av ${plock} plock)`, enMindre >= plock * 0.95],
    ];
  },
};

// en ruta i ett område utan saker runt omkring, och ett område längre bort åt ett håll
function tomPlats(s: State) {
  const c = bynsMitt(s), m = getMap(s.seed);
  for (let d = 6; d < 30; d++) for (let k = 0; k < 16; k++) {
    const x = Math.floor(c.x + Math.cos(k / 16 * 6.283) * d), y = Math.floor(c.y + Math.sin(k / 16 * 6.283) * d);
    if (inMap(x - 16, y - 16) && inMap(x + 16, y + 16) && m.tiles[y * W + x] !== T.Vatten) return { x, y };
  }
  return undefined;
}
SCENARIER.samlarmal = {
  text: 'Steg 9.2.54: samlaren som inte ser något mer att plocka väljer en plats hen hört om före okänd mark',
  kor: () => {
    // samma läge utan och med en hörsaga om ett område åt ett av fyra håll, där hen tror mer än på målet utan hörsagan:
    // med hörsagan blir målet i det området
    let hort = 0, forsok = 0;
    for (const seed of [42, 7, 3, 1]) for (let v = 0; v < 4; v++) {
      const s = createState(seed, START), at = tomPlats(s);
      if (!at) continue;
      for (const k of [...SIM.lagren('samla'), 'kantarell', 'spindling'] as const) for (let dy = -16; dy <= 16; dy++) for (let dx = -16; dx <= 16; dx++) if (inMap(at.x + dx, at.y + dy)) takenOf(s)[k]![SIM.tileOf(at.x + dx, at.y + dy)] = 1; // också svampen: allt samlaren plockar
      const p = living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!, ang = v * Math.PI / 2, hx = Math.floor(at.x + Math.cos(ang) * 10), hy = Math.floor(at.y + Math.sin(ang) * 10);
      Object.assign(p, { x: at.x + 0.5, y: at.y + 0.5, lardomar: [] });
      p.task = { act: 'samla', phase: 'do', tx: at.x + 0.5, ty: at.y + 0.5, until: s.now + 2 * SIM.HOUR, carry: 0, why: 'prov' };
      const m0 = SIM.nastaMal(s, p, p.task, at.x, at.y, () => 0);
      if (!m0 || areaOf(m0.x, m0.y) === areaOf(hx, hy)) continue;
      const fore = SIM.trorOm(s, p, 'samla')(m0.x, m0.y);
      p.lardomar = [{ k: 'samla', a: areaOf(hx, hy), v: 3, c: 1, t: s.now, led: 0, src: living(s).find(q => q !== p)!.id }];
      const tror = SIM.trorOm(s, p, 'samla');
      let bast = -Infinity;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (areaOf(hx + dx, hy + dy) === areaOf(hx, hy)) bast = Math.max(bast, tror(hx + dx, hy + dy));
      if (!(bast > fore * 2)) continue; // marken där är inte bättre än målet utan hörsagan (vatten eller kal mark)
      const m = SIM.nastaMal(s, p, p.task, at.x, at.y, () => 0);
      forsok++;
      if (m && areaOf(m.x, m.y) === areaOf(hx, hy)) hort++;
    }
    return [[`målet blir platsen hen hört om (${hort} av ${forsok} gånger)`, forsok >= 4 && hort >= forsok * 0.75]];
  },
};
