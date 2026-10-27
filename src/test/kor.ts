// Kör en by utan grafik och samlar nyckeltalen (registret NYCKELTAL i nyckeltal.ts säger vad de heter och betyder).
// Vakterna larmar om något blir omöjligt (NaN, negativa förråd, folk i vattnet).
import { BEAT, createState, step, living, DAY, groundOf, isSoil, markslag, Markslag, ageIndex, moodOf, serialize, serializeParts, getMap, fuelStock, ACT_NAMES, T, State, inMap, isWall, tileOf, foodOf, amountOf, sumOf, okandaBalans, alive, isCarrying, BYN, isStored, housesOf, bitsOf, Person, HOUR, W, KROPP, forvarAt, isTool } from '../sim';
import { NYCKELTAL, Nyckeltal, tal } from './nyckeltal';

// testbyarna grundas 08:00 svensk tid. Testerna körs i datorns tidszon (här UTC), så där är klockan 06:00 när byn grundas
export const START = Date.parse('2026-10-20T08:00:00+02:00');
// steg per timme och per dygn: simuleringen går alltid i steg om BEAT sekunder (300 s, fem minuter)
export const STEG_TIM = 3600 / BEAT, STEG_DYGN = 86400 / BEAT;
// ett dokument i artefaktens databas rymmer högst så här många KB (sparfilens delar, DELAR i steg.ts)
export const DOK_KB = 256;

export interface Resultat { seed: number; n: Nyckeltal; vakter: string[]; s: State }

// fran: kör vidare en by som redan finns (t.ex. en inläst sparfil, scenariot sparning) i stället för en ny by med seed
export function korBy(seed: number, dagar: number, varjeSteg?: (s: State) => void, fran?: State): Resultat {
  const okanda = okandaBalans();
  if (okanda.length) throw new Error(`BALANS: inget balanstal heter ${okanda.join(', ')} (se npm run talen)`);
  const s = fran ?? createState(seed, START);
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
      for (const k of ['hunger', 'rest', 'social', 'health', 'toa'] as const) if (!ok01(p[k])) larm('behov ' + k, () => `${p.name} ${k} = ${p[k]}`);
      if (!ok01(p.warm / KROPP.maxVarm)) larm('behov warm', () => `${p.name} warm = ${p.warm}`); // värmen går till maxVarm (steg 2.3.4)
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !inMap(p.x, p.y)) larm('position', () => `${p.name} på ${p.x},${p.y}`);
      else if (tiles[tileOf(p.x, p.y)] === T.Vatten) larm('i vattnet', () => `${p.name} står i vattnet (${p.task?.act})`);
      else if (isWall(s, p.x, p.y)) larm('i en vägg', () => `${p.name} står i en vägg (${p.task?.act})`);
      // den som bär material till ett bygge bär inte mer än det som togs ur förrådet
      if (p.task?.act === 'bygga' && p.task.items) for (const k in p.task.items) if (p.task.items[k] > sumOf(p.task.ag?.[k]) + 1e-6) larm('bygge utan material', () => `${p.name} bär ${p.task!.items![k]} ${k} till bygget men tog ${sumOf(p.task!.ag?.[k])}`);
      const st = p.task?.site; // byggplatsen den som hämtar material går till sedan
      if (st && isWall(s, st.x, st.y)) larm('byggplats i en vägg', () => `${p.name} ska bygga från ${Math.floor(st.x)},${Math.floor(st.y)}, som är en vägg`);
      if (p.task && !(p.task.act in ACT_NAMES)) larm('jobb', () => `${p.name} har okänt jobb ${p.task?.act}`);
    }
    vakta(s, larm, i % STEG_TIM === 0);
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

// fler vakter efter varje steg: det som bara får finnas hos levande och sådant som håller ihop byn. De tunga körs en gång
// i timmen (timme), och texten görs bara när ett larm går
type Larm = (typ: string, text: () => string) => void;
const fin = (v: number | undefined) => v === undefined || Number.isFinite(v);
function vakta(s: State, larm: Larm, timme: boolean) {
  const lever = new Set<number>(), finns = new Map<number, Person>();
  for (const p of s.people) { finns.set(p.id, p); if (alive(p)) lever.add(p.id); }
  for (const p of s.people) {
    if (!alive(p)) {
      if (p.task) larm('död med uppgift', () => `${p.name} (${p.died !== undefined ? 'död' : 'flyttad'}) har uppgiften ${p.task!.act}${isCarrying(p.task!) ? ' och bär något' : ''}`);
      continue;
    }
    // ett par pekar på varandra, och den andra lever (den som blir kvar släpper den döda eller utflyttade)
    if (p.partner !== undefined && !(lever.has(p.partner) && finns.get(p.partner)!.partner === p.id)) larm('halvt par', () => { const q = finns.get(p.partner!); return `${p.name} har partnern ${q ? `${q.name} (${alive(q) ? `partner ${q.partner}` : 'borta'})` : `${p.partner} som inte finns`}`; });
  }
  const f = s.fire;
  if (!Number.isFinite(f.fuel) || f.fuel < 0) larm('eldens bränsle', () => `fuel ${f.fuel}`);
  if (s.delning && !Number.isFinite(s.delning.andel)) larm('delning', () => JSON.stringify(s.delning));
  if (!timme) return;
  // en gång i timmen: ägare, redskap, stackar och hus
  const ids = new Set<number>();
  for (const t of s.ting ?? []) {
    if (ids.has(t.id)) larm('ting-id två gånger', () => `${t.k} ${t.id}`); ids.add(t.id);
    if (t.agare !== BYN && !lever.has(t.agare)) larm('redskap utan ägare', () => `${t.k} ${t.id} ägs av ${t.agare}`);
    for (const [vad, id] of [['hos', t.hos], ['lass', t.lass]] as const) if (id !== undefined && !lever.has(id)) larm(`redskap ${vad} ingen`, () => `${t.k} ${t.id} ${vad} ${id}`);
  }
  const tiles = getMap(s.seed).tiles, upptagen = new Map<number, string[]>();
  const plats = (k: string, x: number, y: number) => {
    if (tiles[y * W + x] === T.Vatten) larm('sak i vattnet', () => `${k} på ${x},${y}`);
    else if (isWall(s, x + 0.5, y + 0.5)) larm('sak i en vägg', () => `${k} på ${x},${y}`);
    if (!isStored(s, x, y)) return;
    // i ett redskapsställ står flera redskap, så många som det rymmer (steg 2.3.6)
    const forr = upptagen.get(y * W + x) ?? [], f = forvarAt(s, x, y);
    const ryms = f?.redskap ? isTool(k) && forr.every(isTool) && forr.length < f.rymmer : !forr.length;
    if (!ryms) larm('två saker på en ruta i lagret', () => `${forr.join(', ')} och ${k} på ${x},${y}`);
    upptagen.set(y * W + x, [...forr, k]);
  };
  for (const a of s.stackar ?? []) {
    plats(a.k, a.x, a.y);
    for (const id in a.ag ?? {}) if (!lever.has(+id)) larm('andel hos ingen', () => `${a.k} på ${a.x},${a.y}: ${id} äger ${a.ag![id]}`);
  }
  for (const t of s.ting ?? []) if (t.x !== undefined && t.hos === undefined && t.lass === undefined) plats(t.k, t.x, t.y!);
  const hus = new Set<number>();
  for (const h of housesOf(s)) {
    hus.add(h.id);
    // ägaren släpps i timblocket, så den som just dött eller flyttat får vara kvar en timme
    const o = h.ag === undefined ? undefined : finns.get(h.ag);
    if (h.ag !== undefined && !(o && (alive(o) || s.now - (o.died ?? o.left ?? 0) <= HOUR))) larm('hus utan ägare', () => `${h.namn} ägs av ${h.ag}`);
    if (Object.values(h.kom ?? {}).some(n => !Number.isFinite(n))) larm('hus', () => `${h.namn} kom ${JSON.stringify(h.kom)}`);
  }
  for (const b of bitsOf(s)) {
    if (![b.b, b.mat, b.c].every(v => Number.isFinite(v)) || !fin(b.lp) || !fin(b.lm) || b.c < -1e-9 || b.c > 1 + 1e-9 || b.mat < -1e-9) larm('husdel', () => JSON.stringify(b));
    if (b.hus !== undefined && !hus.has(b.hus)) larm('husdel utan hus', () => `${b.m} ${b.id} på ${b.x},${b.y} hör till hus ${b.hus}`);
  }
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
