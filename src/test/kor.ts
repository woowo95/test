// Kör en by utan grafik och samlar nyckeltal. Vakterna larmar om något blir omöjligt (NaN, negativa förråd, folk i vattnet).
import { createState, step, living, DAY, ageIndex, moodOf, serialize, getMap, fuelStock, ACT_NAMES, T, W, H, State, isWall } from '../sim';

export const START = Date.parse('2026-10-20T08:00:00+02:00');

export interface Nyckeltal {
  pop: number; atergrundad: number; // gånger alla dog eller flyttade och en vandrare grundade byn på nytt
  invandrade: number; utvandrade: number; fodda: number; doda: number; svalt: number; kyla: number;
  hunger: number; // timmar då någon i byn var mycket hungrig
  humor: number; // snitthumör, mätt varje timme
  vintermat: number; vinterved: number; // lägsta förråd när en istid tar slut
  eld: number; // procent av tiden elden brann
  ms: number; kb: number;
}

export interface Resultat { seed: number; dagar: number; n: Nyckeltal; vakter: string[]; s: State }

export function korBy(seed: number, dagar: number, varjeSteg?: (s: State) => void): Resultat {
  const s = createState(seed, START);
  const t0 = performance.now();
  const tiles = getMap(seed).tiles;
  const fel = new Map<string, { n: number; forsta: string }>();
  const larm = (typ: string, text: string) => { const f = fel.get(typ); if (f) f.n++; else fel.set(typ, { n: 1, forsta: text }); };
  let hunger = 0, humor = 0, humorN = 0, lit = 0, steg = 0, vintermat = Infinity, vinterved = Infinity, forraAlder = ageIndex(s);
  const ok01 = (v: number) => Number.isFinite(v) && v >= -1e-6 && v <= 1 + 1e-6;
  for (let i = 0; i < dagar * 288; i++) {
    step(s, 300, false);
    varjeSteg?.(s);
    steg++; if (s.fire.lit) lit++;
    const dag = ((s.now - START) / DAY).toFixed(1);
    if (!(s.food >= 0) || !(s.wood >= 0)) larm('förråd', `dag ${dag}: mat ${s.food}, ved ${s.wood}`);
    for (const k in s.items) if (!(s.items[k] >= 0)) larm('föremål', `dag ${dag}: ${k} = ${s.items[k]}`);
    for (const k of s.stockar ?? []) if (!(k.ved >= 0) || !(k.grenar >= 0)) larm('stam', `dag ${dag}: stam ${k.id} ved ${k.ved}, grenar ${k.grenar}`);
    const folk = living(s);
    for (const p of folk) {
      for (const k of ['hunger', 'rest', 'social', 'health', 'warm', 'toa'] as const) if (!ok01(p[k])) larm('behov ' + k, `dag ${dag}: ${p.name} ${k} = ${p[k]}`);
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.y < 0 || p.x >= W || p.y >= H) larm('position', `dag ${dag}: ${p.name} på ${p.x},${p.y}`);
      else if (tiles[Math.floor(p.y) * W + Math.floor(p.x)] === T.Vatten) larm('i vattnet', `dag ${dag}: ${p.name} står i vattnet (${p.task?.act})`);
      else if (isWall(s, p.x, p.y)) larm('i en vägg', `dag ${dag}: ${p.name} står i en vägg (${p.task?.act})`);
      if (p.task && !(p.task.act in ACT_NAMES)) larm('jobb', `dag ${dag}: ${p.name} har okänt jobb ${p.task.act}`);
    }
    if (i % 12 === 0) { // en gång i timmen
      if (folk.some(p => p.hunger < 0.15)) hunger++;
      for (const p of folk) { humor += moodOf(p, s.now); humorN++; }
    }
    const ai = ageIndex(s);
    if (forraAlder === 0 && ai === 1) { vintermat = Math.min(vintermat, s.food); vinterved = Math.min(vinterved, fuelStock(s)); }
    forraAlder = ai;
  }
  const dod = s.people.filter(p => p.died !== undefined);
  const n: Nyckeltal = {
    pop: living(s).length,
    atergrundad: s.stat?.atergrundad ?? 0,
    invandrade: s.stat?.invandrade ?? 0,
    utvandrade: s.stat?.utvandrade ?? 0,
    fodda: s.log.filter(l => l.kind === 'birth').length,
    doda: dod.length,
    svalt: dod.filter(p => p.cause === 'av svält').length,
    kyla: dod.filter(p => p.cause === 'av kyla').length,
    hunger,
    humor: humorN ? +(humor / humorN).toFixed(3) : 0,
    vintermat: Number.isFinite(vintermat) ? Math.round(vintermat) : -1,
    vinterved: Number.isFinite(vinterved) ? Math.round(vinterved) : -1,
    eld: Math.round(lit / steg * 100),
    ms: Math.round(performance.now() - t0),
    kb: Math.round(serialize(s).length / 1024),
  };
  const vakter = [...fel].map(([typ, f]) => `${typ} (${f.n} ggr), första: ${f.forsta}`);
  return { seed, dagar, n, vakter, s };
}

export function rad(r: Resultat) {
  const n = r.n;
  return `by ${String(r.seed).padEnd(5)} pop ${n.pop}${n.atergrundad ? ` ÅTERGRUNDAD ${n.atergrundad} GGR` : ''}, in ${n.invandrade}, ut ${n.utvandrade}, födda ${n.fodda}, döda ${n.doda} (svält ${n.svalt}, kyla ${n.kyla}), hunger ${n.hunger} h, humör ${n.humor.toFixed(2)}, vintermat ${n.vintermat}, vinterved ${n.vinterved}, eld ${n.eld} % | ${(n.ms / 1000).toFixed(1)} s, ${n.kb} KB`;
}
