// Scenariernas register (SCENARIER) och det som flera grupper av scenarier använder. Varje grupp har en egen fil här,
// och ../scenario.ts kör dem.
import { Person, Act, ownedBy, tidyTools, heldBy, isTool, step, living, temperature, ageIndex, kalender, yearNo, pilesOf, amountOf, capacity, load, isLight, T, condOf, FOOD, zonesOf, ageOf, groundOf, getMap, DAY, HOUR, W, State, skogAndel, takenOf, Kind, describe, stat, campDist, campCenter, TEKNIK, knows, bitsOf, housesOf, gridOf, roomAt, insulation, FYND_IDS, angOf, fyndAt, H, vaxerAt, richness, djurOf, ownedStock, ownedSum, setAmount, setStock, foodOf, isFood, STACK_ORDER, BEAT, rikedomDelar, grundvarde, tingOf, komOf, fnOf, Task, barnMat, hungerFlytt, FOLDERS, STATS, ACTS, coverOf, lightLevel, timeLabel, hearthOf, igniterOf, fireWant, fireHeat, heatRadius, emberOn, zoneAt, bitAt, husById, isSick, isSocial, moodOf, duty, habitTotal, habitShare, childrenOf, homeKind, taskName, carryKind, influence, hasMaterial, wornOf, relKey, sakNamn, tingNamn, visning } from '../../sim';
import * as SIM from '../../sim';
import { STEG_TIM } from '../kor';

// förrådet i proven: stackarna är det enda som sparas (steg 1.1.2), så proven ställer in förrådet genom lagret
export const setItems = (s: State, m: Record<string, number>) => {
  for (const k of STACK_ORDER) if (!isFood(k) && k !== 'ved' && !isTool(k)) setAmount(s, k, m[k] ?? 0);
  for (const k of STACK_ORDER) if (isTool(k)) setAmount(s, k, m[k] ?? 0);
};
export const setMat = (s: State, m: Record<string, number>) => { for (const k of FOOD) setAmount(s, k, m[k] ?? 0); };
// all mat blir n, i samma förhållande mellan slagen som förut (bär om det inte fanns någon)
export const setFood = (s: State, n: number) => { const f = foodOf(s); if (f > 0) { const m: Record<string, number> = {}; for (const k of FOOD) m[k] = amountOf(s, k) * n / f; setStock(s, m); } else setAmount(s, 'bar', n); };

export type Koll = [string, boolean];
export const kor = (s: State, timmar: number, varje?: (s: State) => void) => { for (let i = 0; i < timmar * STEG_TIM; i++) { step(s, BEAT); varje?.(s); } };
// klockan h samma dag, i datorns tidszon (här UTC; ett scenario med env: STOCKHOLM får svensk tid)
export const klockan = (s: State, h = 10) => { s.now = new Date(s.now).setHours(h, 0, 0, 0); };
// elden brinner (med en stenring), så att ingen behöver leta stenar och flinta för att tända den
export const tandEld = (s: State, fuel = 4, ring = true) => { Object.assign(s.fire, ring ? { lit: true, fuel, ring: true } : { lit: true, fuel }); };
// tomt förråd: ingen mat, inget trä, inga grenar, ingen flinta och inget hö
// en färdig station vid elden (stationer.ts), slaktbänken om inget annat sägs: viltet slaktas och fisken rensas bara där,
// korgen flätas bara vid slöjdbänken
// en färdig station av sorten k; en som står inne (slöjdbänken, halmbädden) får ett hus om det inte finns något där den får stå
export const medBank = (s: State, k = 'slaktbank') => {
  let at = SIM.stationSite(s, k);
  if (!at && SIM.stationDef(k)?.inne) { medHus(s); at = SIM.stationSite(s, k); }
  const t: SIM.Station = { id: s.nextStation = (s.nextStation ?? 0) + 1, k, x: at!.x, y: at!.y, kvar: 0 };
  if (at!.rot) t.rot = 1;
  if ('inne' in at!) t.inne = 1;
  (s.stationer ??= []).push(t); SIM.touch(s);
  return t;
};
// bygger färdigt det hus som är planerat: alla delar utom den sista klara, den sista byggs som vanligt (workOn)
export function byggKlart(s: State) {
  const h = housesOf(s).find(q => !q.klar);
  if (!h) return undefined;
  const bs = bitsOf(s).filter(b => b.hus === h.id), p = living(s)[0];
  for (const b of bs) { b.mat = SIM.MATERIAL[b.m]?.n ?? 0; b.b = b === bs[bs.length - 1] ? 0.999 : 1; }
  SIM.touch(s);
  SIM.workOn(s, p, bs[bs.length - 1], 3600);
  return h;
}
// ett färdigt hus för det mest akuta behovet (oftast en sovsal), utan att någon lär sig bygga
export function medHus(s: State) {
  const tek = s.people.map(p => p.tek && { ...p.tek });
  byggare(s); s.byggSok = undefined; SIM.planBuild(s);
  s.people.forEach((p, i) => { p.tek = tek[i]; });
  return byggKlart(s);
}
export const tomtForrad = (s: State) => { setMat(s, {}); setStock(s, { ved: 0, grenar: 0, flinta: 0, torrgras: 0 }); };
// byns tre första blir tre vuxna utan släkt på samma ruta, friska, utan uppgift och med hungern hunger (byte, behov och ved).
// Resten (s.people, vänskap) ställer varje scenario in själv, i sin ordning
export const treVuxna = (s: State, hunger: number, mer?: (q: Person) => void) => {
  const [a, b, c] = living(s);
  for (const q of [a, b, c]) { q.mother = q.father = q.partner = undefined; q.x = 30; q.y = 30; q.task = undefined; q.hunger = hunger; q.health = 1; mer?.(q); }
  return [a, b, c] as const;
};
// alla vuxna (från ålder år) kan göra timmerväggar och yxor
export const byggare = (s: State, alder = 14) => { for (const p of living(s)) if (ageOf(p, s.now) >= alder) Object.assign((p.tek ??= {}), { yxa: 1, timmervagg: 1 }); };
// mitten av rutan med mest vilt inom radie rutor från lägret, utom vatten (undefined om det inte finns vilt där)
export function bastaJaktruta(s: State, radie: number, c = campCenter(s)) {
  const m = getMap(s.seed);
  let bast = 0, b: { x: number; y: number } | undefined;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const v = richness(s, 'jakt', x + 0.5, y + 0.5); if (v > bast && m.tiles[y * W + x] !== T.Vatten && Math.hypot(x - c.x, y - c.y) < radie) { bast = v; b = { x: x + 0.5, y: y + 0.5 }; } }
  return b;
}
// letar efter en text i loggen. Loggen rymmer bara de senaste 400 raderna: har den nått taket kan det som söks ha fallit bort, och då varnar testet
export const logg = (s: State, t: string) => {
  if (s.log.length >= 400) console.log(`VARNING: scenariot läser en logg som nått taket (400 rader) och söker "${t}". Räkna i byns statistik i stället.`);
  return s.log.some(l => l.text.includes(t));
};
// andel jordrutor med skog, inom eller utanför ett avstånd från elden. Ängarna räknas inte (äng = 1 räknar bara dem)
export function skogsandel(s: State, min: number, max: number, ang = 0) {
  const a = angOf(s.seed), f = getMap(s.seed).fire;
  return skogAndel(s, i => {
    const d = Math.hypot(i % W - f.x, Math.floor(i / W) - f.y); // från elden: lagret finns från början (steg 1.1.2)
    return d >= min && d < max && a[i] === ang;
  });
}

// genomsnittligt uttag (0 = orört, 1 = tomt) på rutor inom ett avstånd från elden
export function uttag(s: State, k: Kind, min: number, max: number) {
  const t = takenOf(s)[k === 'samla' ? 'bar' : k]!;
  let n = 0, v = 0;
  for (let i = 0; i < t.length; i++) { const d = campDist(s, i % W, Math.floor(i / W)); if (d >= min && d < max) { n++; v += t[i]; } }
  return n ? v / n : 0;
}

// det gränssnittet läser ur byn (ui/ och main.ts), med de argument det ger: kartan, förrådet, varje person och varje flik.
// t är tiden som visas (ui.nu), lite före byns tid. Det som bara går med en skärm (pixi, sidan) är inte med. Som i
// webbläsaren läser gränssnittet i visningsläget (visning i typer.ts)
export function uiLas(s: State, t: number) {
  visning.pa = true;
  try { uiLasNu(s, t); } finally { visning.pa = false; }
}
export function uiLasNu(s: State, t: number) {
  kalender(s, t); yearNo(s, t); temperature(s, t); isLight(t); lightLevel(t); timeLabel(s, t); ageIndex(s); rikedomDelar(s);
  // kartan: filtret, växterna, djuren, marken och elden
  for (const k of FYND_IDS) for (let i = 0; i < W * H; i++) { vaxerAt(s, k, i); fyndAt(s, k, i); }
  djurOf(s, t);
  groundOf(s); coverOf(s); campCenter(s); getMap(s.seed);
  { const sj = SIM.sjoarna(s.seed); sj.rutor.forEach((_, n) => { SIM.sjoNamn(s, n); void s.sjoar?.[n]; }); }
  hearthOf(s.fire); igniterOf(s); fireWant(s); fireHeat(s); heatRadius(s); emberOn(s);
  // förrådet, lagerplatserna och högarna
  for (const pl of pilesOf(s)) { condOf(pl); sakNamn(pl.k); }
  for (const f of FOLDERS) for (const k of f.k) { amountOf(s, k); ownedSum(s, k); grundvarde(k); wornOf(s, k); }
  for (const tg of tingOf(s)) tingNamn(tg);
  // rutorna under musen: lagerplats, hus och rum
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { zoneAt(s, x, y); const b = bitAt(s, x, y); if (b) husById(s, b.hus); const r = roomAt(s, x, y); if (r) { insulation(s, r); husById(s, r.hus); } }
  for (const z of zonesOf(s)) void z.namn;
  // husfliken
  for (const h of housesOf(s)) { husById(s, h.id); komOf(h); fnOf(h); for (const r of gridOf(s).rooms) if (r.hus === h.id) insulation(s, r); }
  for (const b of bitsOf(s)) void b.hus;
  // teknik och seder
  for (const tk of TEKNIK) { hasMaterial(s, tk); for (const p of living(s)) knows(p, tk.id); }
  for (const p of living(s)) influence(s, p);
  // varje person: porträtten, invånarlistan, personfliken och figuren på kartan
  const slag = Object.keys(ACTS) as Act[];
  for (const p of s.people) {
    ageOf(p, s.now); isSick(p, s.now); isSocial(p); moodOf(p, s.now); moodOf(p, s.now, []); duty(s, p); SIM.drar(s, p); childrenOf(s, p);
    for (const k of STATS) { stat(p, k, s.now); stat(p, k, s.now + DAY); }
    // behoven och vad som påverkar dem (personrutan)
    const inRum = new Map<number, number>(); for (const q of living(s)) { const r = roomAt(s, q.x, q.y); if (r) inRum.set(r.id, (inRum.get(r.id) ?? 0) + 1); }
    const vd = SIM.varmeDelar(s, p, SIM.coldOf(temperature(s)), inRum); SIM.viloSlag(p); SIM.viloTak(s, p, vd.rum); SIM.halsaLage(p, s.now);
    if (p.task) SIM.sjoVid(s, p.task.tx, p.task.ty);
    const tot = habitTotal(p); for (const a of slag) habitShare(p, [a], tot);
    heldBy(s, p); ownedBy(s, p); ownedStock(s, p); capacity(s, p);
    if (p.task) { load(p.task, s); homeKind(p.task); taskName(p.task); carryKind(p.task.act); }
    for (const l of p.lardomar ?? []) describe(s, l);
    for (const q of s.people) void s.rels[relKey(p.id, q.id)];
  }
}


// lang: tar LANG_S sekunder eller mer (processorns tid, som scenariot skriver ut). Den snabba kollen (npm run snabbkoll) hoppar
// över dem om de inte nämns, och ett scenario utan lang som tar längre skriver en VARNING.
// env: scenariot körs i en egen process med den miljön, t.ex. Björns tidszon för det som beror på klockslag
// (testerna i övrigt körs i datorns tidszon, här UTC, där byn startar 06:00)
export const LANG_S = 13;
export const STOCKHOLM = { TZ: 'Europe/Stockholm' };
export const SCENARIER: Record<string, { text: string; lang?: boolean; env?: Record<string, string>; kor: () => Koll[] }> = {};

export const flyttLitenBy = (s: State) => hungerFlytt(s, 6) === 0 && barnMat(s, 6) === 1 ? 'ingen' : `flytt ${hungerFlytt(s, 6)}, barn ${barnMat(s, 6)}`;

// ---------- system som saknade prov: faror, seder, samtal, liv, utflyttning, vakt och det i registren som aldrig händer ----------

export const pct = (v: number) => `${Math.round(100 * v)} %`;
export const grenarUte = (s: State) => (s.stackar ?? []).reduce((a, g) => a + (g.k === 'grenar' ? g.n : 0), 0); // på marken och i förrådet
// en börda att bära in: två grenar i famnen, på väg till förrådet
export const barGrenar = (s: State, p: Person) => { p.task = { act: 'bara', phase: 'go', tx: p.x, ty: p.y, until: s.now + HOUR, carry: 0, items: { grenar: 2 } } as Task; };
// en ny invånare utan släkt, alder år gammal, vid den förstas plats och med behoven fyllda
export function nyInvanare(s: State, sex: 'm' | 'k', alder: number) {
  const p = SIM.newPerson(s, sex, s.now - alder * DAY), f = living(s)[0]!;
  s.people.push(p);
  Object.assign(p, { x: f.x, y: f.y, hunger: 0.9, rest: 0.9, social: 0.9, toa: 0.9, torst: 0.9, warm: 0.9, health: 1, task: undefined });
  return p;
}

// Hur ofta de vuxna väljer varje handling i byns läge: alla väljer om, varv efter varv, med de egna behoven fyllda (mätta,
// utvilade, varma), så att det är byns läge (maten, veden, elden, kylan) som avgör. Tiden står still
export function valjer(s: State, varv = 40) {
  const n: Record<string, number> = {}, vuxna = living(s).filter(p => ageOf(p, s.now) >= SIM.ALDER.vuxen);
  let tot = 0, sok = 0;
  for (let i = 0; i < varv; i++) {
    for (const p of vuxna) { Object.assign(p, { hunger: 0.9, rest: 0.9, social: 0.9, toa: 0.9, torst: 0.9, warm: 0.9, health: 1, sickUntil: undefined }); p.task = undefined; }
    tidyTools(s); // redskapen som togs i handen förra varvet blir lediga igen
    for (const p of vuxna) { SIM.chooseTask(s, p); const t = p.task!; n[t.act] = (n[t.act] ?? 0) + 1; tot++; if (t.sok) sok++; }
  }
  const andel = (acts: readonly string[]) => acts.reduce((a, k) => a + (n[k] ?? 0), 0) / (tot || 1);
  const topp = Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${pct(v / tot)}`).join(', ');
  return { n, tot, sok, andel, topp };
}
// faror och förbättringar, som handlingar (fritid: det man gör när man inte arbetar)
export const MATARBETE = ['samla', 'jakt', 'fiske', 'slakta', 'rensa'], TRAARBETE = ['ved', 'falla', 'hugga'];
export const REDSKAPSARBETE = ['korg', 'spjut', 'metspo', 'yxa', 'kniv'];
// bygge, hantverk och fritid (kniven görs i handarbetet på fritiden, craft i val.ts). Korgen, spjutet och metspöet görs i
// stället för maten när de saknas (withTools), så de räknas till matarbetet
export const FORBATTRING = ['bygga', 'hantverk', 'kniv', 'promenad', 'bada', 'strand', 'samtal', 'vila', 'beratta'];
export const MATMEDREDSKAP = [...MATARBETE, 'korg', 'spjut', 'metspo'];
// en by så rik att folk behåller allt de skaffar (delning.ts), så att ägandet kan provas
export const rikBy = (s: State) => { s.delning = { andel: 0 }; };
