// Kör en by utan grafik och samlar nyckeltalen (registret NYCKELTAL i nyckeltal.ts säger vad de heter och betyder).
// Vakterna larmar om något blir omöjligt (NaN, negativa förråd, folk i vattnet).
import { BEAT, createState, step, living, DAY, groundOf, isSoil, markslag, Markslag, ageIndex, moodOf, serialize, serializeParts, getMap, fuelStock, ACT_NAMES, T, State, inMap, isWall, tileOf, foodOf, amountOf, sumOf, okandaBalans } from '../sim';
import { NYCKELTAL, Nyckeltal, tal } from './nyckeltal';

// testbyarna grundas 08:00 svensk tid. Testerna körs i datorns tidszon (här UTC), så där är klockan 06:00 när byn grundas
export const START = Date.parse('2026-10-20T08:00:00+02:00');
// steg per timme och per dygn: simuleringen går alltid i steg om BEAT sekunder (300 s, fem minuter)
export const STEG_TIM = 3600 / BEAT, STEG_DYGN = 86400 / BEAT;
// ett dokument i artefaktens databas rymmer högst så här många KB (sparfilens delar, DELAR i steg.ts)
export const DOK_KB = 256;

export interface Resultat { seed: number; n: Nyckeltal; vakter: string[]; s: State }

export function korBy(seed: number, dagar: number, varjeSteg?: (s: State) => void): Resultat {
  const okanda = okandaBalans();
  if (okanda.length) throw new Error(`BALANS: inget balanstal heter ${okanda.join(', ')} (se npm run talen)`);
  const s = createState(seed, START);
  const t0 = performance.now();
  const tiles = getMap(seed).tiles;
  const fel = new Map<string, { n: number; forsta: string }>();
  // texten görs bara första gången ett larm går, så att vakterna inte tar tid när allt är rätt
  const larm = (typ: string, text: () => string) => { const f = fel.get(typ); if (f) f.n++; else fel.set(typ, { n: 1, forsta: `dag ${dag()}: ${text()}` }); };
  let hunger = 0, humor = 0, humorN = 0, lit = 0, steg = 0, vintermat = Infinity, vinterved = Infinity, forraAlder = ageIndex(s);
  const ok01 = (v: number) => Number.isFinite(v) && v >= -1e-6 && v <= 1 + 1e-6;
  const dag = () => ((s.now - START) / DAY).toFixed(1);
  for (let i = 0; i < dagar * STEG_DYGN; i++) {
    step(s, BEAT);
    varjeSteg?.(s);
    steg++; if (s.fire.lit) lit++;
    if (!(foodOf(s) >= 0) || !(amountOf(s, 'ved') >= 0)) larm('förråd', () => `mat ${foodOf(s)}, ved ${amountOf(s, 'ved')}`);
    for (const t of s.ting ?? []) if (!(t.c > 0 && t.c <= 1 + 1e-9) || [t.hos, t.lass, t.x].filter(v => v !== undefined).length > 1) larm('redskap', () => JSON.stringify(t));
    for (const a of s.stackar ?? []) if (!(a.n >= 0) || !(sumOf(a.ag) <= a.n + 1e-6) || Object.values(a.ag ?? {}).some(v => !(v >= 0))) larm('stack', () => `${a.k} ${a.n} ägs ${JSON.stringify(a.ag)}`);
    for (const k of s.stockar ?? []) if (!(k.ved >= 0) || !(k.grenar >= 0)) larm('stam', () => `stam ${k.id} ved ${k.ved}, grenar ${k.grenar}`);
    const folk = living(s);
    for (const p of folk) {
      for (const k of ['hunger', 'rest', 'social', 'health', 'warm', 'toa'] as const) if (!ok01(p[k])) larm('behov ' + k, () => `${p.name} ${k} = ${p[k]}`);
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !inMap(p.x, p.y)) larm('position', () => `${p.name} på ${p.x},${p.y}`);
      else if (tiles[tileOf(p.x, p.y)] === T.Vatten) larm('i vattnet', () => `${p.name} står i vattnet (${p.task?.act})`);
      else if (isWall(s, p.x, p.y)) larm('i en vägg', () => `${p.name} står i en vägg (${p.task?.act})`);
      if (p.task && !(p.task.act in ACT_NAMES)) larm('jobb', () => `${p.name} har okänt jobb ${p.task?.act}`);
    }
    if (i % STEG_TIM === 0) { // en gång i timmen
      if (folk.some(p => p.hunger < 0.15)) hunger++;
      for (const p of folk) { humor += moodOf(p, s.now); humorN++; }
    }
    const ai = ageIndex(s);
    if (forraAlder === 0 && ai === 1) { vintermat = Math.min(vintermat, foodOf(s)); vinterved = Math.min(vinterved, fuelStock(s)); }
    forraAlder = ai;
  }
  const st = s.stat ?? {};
  const n: Nyckeltal = {
    pop: living(s).length,
    atergrundad: s.stat?.atergrundad ?? 0,
    invandrade: s.stat?.invandrade ?? 0,
    utvandrade: s.stat?.utvandrade ?? 0,
    fodda: st.fodda ?? 0,
    doda: st.doda ?? 0,
    svalt: st['dog av svält'] ?? 0,
    kyla: st['dog av kyla'] ?? 0,
    hunger,
    humor: humorN ? +(humor / humorN).toFixed(3) : 0,
    vintermat: Number.isFinite(vintermat) ? Math.round(vintermat) : -1,
    vinterved: Number.isFinite(vinterved) ? Math.round(vinterved) : -1,
    eld: Math.round(lit / steg * 100),
    ms: Math.round(performance.now() - t0),
    kb: Math.round(serialize(s).length / 1024),
    delKb: Math.round(Math.max(...Object.values(serializeParts(s)).map(d => new TextEncoder().encode(d).length)) / 1024),
  };
  const vakter = [...fel].map(([typ, f]) => `${typ} (${f.n} ggr), första: ${f.forsta}`);
  return { seed, n, vakter, s };
}

// en rad per by (npm test): hur byn mår, och efter | datorns mått
export function rad(r: Pick<Resultat, 'seed' | 'n'>) {
  const del = (dator: boolean) => NYCKELTAL.filter(m => !!m.dator === dator).map(m => `${m.kort} ${tal(m, r.n[m.k])}`).join(', ');
  return `by ${String(r.seed).padEnd(5)} ${del(false)} | ${del(true)}`;
}

// jordrutorna per markslag, delade som simuleringen delar dem (markslag i mark.ts): skog, ungskog, högt gräs, kort gräs och
// bar jord. Bar jord är nött marktäcke utan ungskog, alltså stigarna
export function markStat(s: State): Record<Markslag, number> {
  const g = groundOf(s), n: Record<Markslag, number> = { skog: 0, ung: 0, hog: 0, kort: 0, bar: 0 };
  for (let i = 0; i < g.tiles.length; i++) if (isSoil(g.tiles[i])) n[markslag(g, i)]++;
  return n;
}
