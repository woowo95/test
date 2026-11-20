// Samlandet, en gång för alla (steg 9.2.53–9.2.57): sakerna på rutan och samlarens mål
import { readFileSync } from 'node:fs';
import { vidArbetet } from '../../ui/stalle';
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

// samlare i klunga (steg 12.1.33): fem samlare som börjar på samma ruta vid en strand med bärbuskar, följda sekund för sekund.
// Orsaken till klungan: inom synvidden valde var och en sin sträcka (strackaFran) bara efter avståndet, utan att se vart de andra
// gick, så alla fem gick samma väg och stod på samma ruta, buske för buske; bara nästa mål längre bort (nastaMal) räknade de andra
SCENARIER.samlarklunga = {
  text: 'Samlare i klunga (steg 12.1.33, strackaFran i steg.ts och bilden i ui/manniskor.ts): fem samlare som börjar på samma ruta vid en strand med bärbuskar sprider sig, i stället för att stå på samma ruta, och ingen står kvar på en tom ruta; den som står på samma ruta som en annan ritas bredvid',
  kor: () => {
    let samSek = 0, delad = 0, tomStill = 0, langstTom = 0, fall = 0;
    for (const seed of [42, 7, 3]) {
      const s = createState(seed, START), tiles = getMap(s.seed).tiles, m = bynsMitt(s);
      for (let k = 0; k < 24 * 60 && Math.floor(SIM.hourOf(s.now)) !== 9; k++) step(s, 60); // på förmiddagen
      // stranden närmast byn med flest bär och rötter inom tre rutor (det samlaren ser och plockar)
      const prov: SIM.Task = { act: 'samla', phase: 'do', tx: 0, ty: 0, until: 0, carry: 0 };
      let bast = -1, bv = 0;
      for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
        const i = y * W + x;
        if (tiles[i] === T.Vatten || Math.hypot(x - m.x, y - m.y) > 40 || ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => tiles[(y + dy) * W + x + dx] === T.Vatten)) continue;
        let n = 0;
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) n += SIM.sakerPaRutan(s, prov, x + dx, y + dy).reduce((a, q) => a + q.n, 0);
        if (n > bv) { bv = n; bast = i; }
      }
      if (bast < 0) continue;
      fall++;
      if (process.env.KLUNGA) console.log('strand', seed, bast % W, Math.floor(bast / W), bv, SIM.hourOf(s.now));
      const x0 = bast % W, y0 = Math.floor(bast / W), fem = living(s).filter(q => SIM.ageOf(q, s.now) >= 14).slice(0, 5);
      const forsta = new Map<number, SIM.Task>(); // varje samlare följs så länge hen har kvar sin första uppgift
      for (const p of fem) { Object.assign(p, { x: x0 + 0.5, y: y0 + 0.5 }); p.task = { act: 'samla', phase: 'do', tx: x0 + 0.5, ty: y0 + 0.5, until: s.now + SIM.HOUR, carry: 0, dark: false, why: 'prov' }; forsta.set(p.id, p.task); }
      const still = new Map<number, number>(), lamnat = new Set<number>();
      for (let k = 0; k < 1800; k++) {
        step(s, 1);
        for (const p of fem) if (Math.floor(p.x) !== x0 || Math.floor(p.y) !== y0) lamnat.add(p.id);
        // startrutan delas av alla fem från början; det som räknas är var de står sedan
        const pa = new Map<number, number>(), st = fem.filter(p => p.task && p.task === forsta.get(p.id) && p.task.phase === 'do' && !p.task.hopp && lamnat.has(p.id));
        for (const p of st) { const i = Math.floor(p.y) * W + Math.floor(p.x); pa.set(i, (pa.get(i) ?? 0) + 1); }
        if (process.env.KLUNGA && k % 30 === 0 && k < 600) console.log(seed, k, fem.map(p => `${p.task === forsta.get(p.id) ? '*' : ''}${p.task?.act}/${p.task?.phase}${p.task?.hopp ? 'h' : ''}@${Math.floor(p.x)},${Math.floor(p.y)}`).join(' '));
        for (const p of st) {
          const i = Math.floor(p.y) * W + Math.floor(p.x), tom = SIM.sakerPaRutan(s, p.task!, Math.floor(p.x), Math.floor(p.y)).reduce((a, q) => a + q.n, 0) <= 0 && !p.task!.plock;
          samSek++; if (pa.get(i)! > 1) delad++;
          const n = tom ? (still.get(p.id) ?? 0) + 1 : 0; still.set(p.id, n);
          if (n > 3) tomStill++; langstTom = Math.max(langstTom, n);
        }
      }
    }
    // två som fäller samma träd ritas på var sin sida om det (vidArbetet med samRuta, ui/stalle.ts), och bilden skickar med samRuta
    const kod = readFileSync(new URL('../../ui/manniskor.ts', import.meta.url), 'utf8');
    const s2 = createState(42, START), m2 = bynsMitt(s2), samRuta = new Set<number>(), fri = (x: number, y: number) => !SIM.blocked(s2, x + 0.5, y + 0.5);
    let tx = Math.floor(m2.x) + 6, ty = Math.floor(m2.y);
    for (let k = 0; k < 40 && ![[0, 1], [-1, 0], [1, 0]].every(([dx, dy]) => fri(tx + dx, ty + dy)); k++) tx++;
    const a = vidArbetet(s2, 'falla', tx + 0.5, ty + 0.5, samRuta), b = vidArbetet(s2, 'falla', tx + 0.5, ty + 0.5, samRuta);
    return [
      [`samlarna står var för sig (${(delad / Math.max(1, samSek) * 100).toFixed(0)} % av ${samSek} sekunder med en annan samlare på samma ruta, ${fall} stränder)`, fall >= 2 && samSek > 60 && delad < samSek * 0.25],
      [`ingen står kvar på en tom ruta (${tomStill} sekunder längre än 3 s, som längst ${langstTom} s)`, tomStill < samSek * 0.01],
      ['den som står på samma ruta som en annan ritas bredvid', !!a && !!b && (a.x !== b.x || a.y !== b.y) && /vidArbetet\([^)]*samRuta\)/.test(kod)],
    ];
  },
};
