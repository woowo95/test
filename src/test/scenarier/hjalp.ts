// Scenariernas register (SCENARIER) och det som flera grupper av scenarier använder. Varje grupp har en egen fil här,
// och ../scenario.ts kör dem.
import { Person, Act, ownedBy, tidyTools, heldBy, isTool, step, living, temperature, ageIndex, kalender, yearNo, pilesOf, amountOf, capacity, load, isLight, T, condOf, FOOD, zonesOf, ageOf, groundOf, getMap, DAY, HOUR, W, State, skogAndel, takenOf, Kind, describe, stat, utanforByn, bynsMitt, TEKNIK, knows, bitsOf, housesOf, gridOf, roomAt, insulation, FYND_IDS, angOf, fyndAt, H, vaxerAt, richness, djurOf, ownedStock, ownedSum, setAmount, setStock, foodOf, isFood, STACK_ORDER, rikedomDelar, grundvarde, tingOf, komOf, fnOf, Task, barnMat, hungerFlytt, FOLDERS, STATS, ACTS, coverOf, lightLevel, timeLabel, hearthOf, igniterOf, fireWant, fireHeat, heatRadius, emberOn, zoneAt, bitAt, husById, isSick, isSocial, moodOf, duty, habitTotal, habitShare, childrenOf, homeKind, taskName, carryKind, influence, hasMaterial, wornOf, relKey, sakNamn, tingNamn, visning } from '../../sim';
import * as SIM from '../../sim';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BEAT, START, STEG_TIM, korBy } from '../kor';
import { lasBy } from '../delby';

// förrådet i proven: stackarna är det enda som sparas (steg 1.1.2), så proven ställer in förrådet genom lagret
// styrets och kyrkans timme som i TAKTER (steg 12.1.97, fynd 130): kvällen och kyrkans dygn är egna rader, i samma ordning som förut
export const styreTimme = (s: State) => { SIM.kvallForeStyret(s); SIM.stepStyre(s); SIM.styretsKvall(s); };
export const kyrkansTimme = (s: State) => { SIM.kyrkaTimme(s); SIM.kyrkaDygn(s); SIM.andligTimme(s); };
export const setItems = (s: State, m: Record<string, number>) => {
  for (const k of STACK_ORDER) if (!isFood(k) && k !== 'ved' && !isTool(k)) setAmount(s, k, m[k] ?? 0);
  for (const k of STACK_ORDER) if (isTool(k)) setAmount(s, k, m[k] ?? 0);
};
// p står vid den största stacken av k: det hen tar ur förrådet ligger inom räckhåll (steg 11.1.74)
// slakten i ett scenario: slaktaren står vid stacken med djuret, som i spelet (inget svävar, steg 11.1.74)
export const bearbetaVid = (s: State, p: Person, art: SIM.Djurart, h: number) => { vidStack(s, p, art.sak); SIM.bearbeta(s, p, art, h); };
// den som ska göra act har hämtat av ur förrådet och bär det (HAMTAS i hamtning.ts), som när hen kommit fram i spelet
export function harHamtat(s: State, p: Person, act: Act, av: Record<string, number>, common = true) {
  const tk: Task = p.task?.act === act ? p.task : { act, phase: 'do', tx: p.x, ty: p.y, until: s.now + HOUR, carry: 0 };
  for (const [k, n] of Object.entries(av)) { const d = SIM.use(s, p, k, n, common), g = Object.values(d).reduce((a, b) => a + b, 0); if (g <= 0) continue; (tk.items ??= {})[k] = (tk.items[k] ?? 0) + g; (tk.ag ??= {})[k] = d; }
  tk.hamtad = 1; p.task = tk;
}
// det arbetet hämtar (HAMTAS i hamtning.ts, steg 11.1.77), taget som i spelet och lagt i bördan, för ett scenario som ställer
// folk på platsen utan att låta dem gå dit
export function hamtatSomISpelet(s: State, p: Person, tk: Task = p.task!) {
  const h = SIM.HAMTAS[tk.act], av = h?.av(s, p, tk);
  if (!h || !av) return;
  const fran = h.fran?.(s, p, tk); p.task = tk;
  for (const [k, n] of Object.entries(av)) {
    const [fk, nf] = typeof fran === 'object' ? fran[k] ?? [undefined, 0] : [fran, fran === undefined ? 0 : n], d1 = fk !== undefined && nf > 0 ? SIM.use(s, p, k, Math.min(n, nf), true, fk) : {}, n1 = Object.values(d1).reduce((a, b) => a + b, 0);
    const d2 = n - n1 > 1e-9 && (typeof fran === 'object' || fk === undefined) ? SIM.takeMaterial(s, p, k, n - n1, h.byns ?? false) : {}, d: Record<number, number> = { ...d1 }; for (const [o, v] of Object.entries(d2)) d[+o] = (d[+o] ?? 0) + v;
    const g = Object.values(d).reduce((a, b) => a + b, 0);
    if (g <= 0) continue; (tk.items ??= {})[k] = (tk.items[k] ?? 0) + g; const ag = ((tk.ag ??= {})[k] ??= {}); for (const [o, v] of Object.entries(d)) ag[+o] = (ag[+o] ?? 0) + v;
  }
  tk.hamtad = 1;
}
// packskedet i ett scenario (resa.ts borjaPacka, steg 12.1.8): ledaren bestämmer packningen, och den hämtas ur förrådet och
// läggs i packningen som när resenärerna burit den till samlingsplatsen
export function packatSomISpelet(s: State, sl: SIM.Sallskap) {
  const ok = SIM.borjaPacka(s, sl), led = s.people.find(q => q.id === sl.ledare);
  for (const [k, n] of Object.entries(sl.att ?? {})) {
    const ag = SIM.use(s, led, k, n - (sl.pack[k] ?? 0));
    for (const o in ag) { const m = Math.floor(ag[o]! + 1e-9); if (m > 0) SIM.satsa(sl, +o === SIM.BYN ? 'by' : +o, k, m); }
  }
  sl.att = undefined;
  return ok;
}
// en ritual i ett scenario: de som är med har tagit med maten till måltiden och offret (HAMTAS.ritual), som i spelet
export function ritualMed(s: State, r: SIM.Ritual, med: Person[]) {
  const f = s.ritual; s.ritual = r;
  for (const p of med) { p.task = { act: 'ritual', phase: 'do', tx: r.x, ty: r.y, until: r.slut, carry: 0, why: '' } as Task; hamtatSomISpelet(s, p); }
  s.ritual = f;
  return med;
}
// graven i ett scenario: den som begraver har hämtat veden till bålet (HAMTAS.grava), som i spelet
export function gravKlarMed(s: State, p: Person, t: Task) { const av = SIM.HAMTAS.grava!.av(s, p, t); const f = p.task; if (av) { p.task = t; harHamtat(s, p, t.act, av); } SIM.gravKlar(s, p, t); if (av) p.task = f === t ? t : f; }
// alla står mitt i byns första lagerplats, där maten läggs (inget svävar, steg 11.1.77)
export const vidForradet = (s: State, ...folk: Person[]) => { const z = zonesOf(s)[0]; if (z) for (const p of folk) { p.x = z.x + z.w / 2; p.y = z.y + z.h / 2; } };
export const vidStack = (s: State, p: Person, k: string) => { const a = (s.stackar ?? []).filter(q => q.k === k).sort((x, y) => y.n - x.n)[0]; if (a) { p.x = a.x + 0.5; p.y = a.y + 0.5; } };
export const setMat = (s: State, m: Record<string, number>) => { for (const k of FOOD) setAmount(s, k, m[k] ?? 0); };
// all mat blir n, i samma förhållande mellan slagen som förut (bär om det inte fanns någon)
export const setFood = (s: State, n: number) => { const f = foodOf(s); if (f > 0) { const m: Record<string, number> = {}; for (const k of FOOD) m[k] = amountOf(s, k) * n / f; setStock(s, m); } else setAmount(s, 'bar', n); };

export type Koll = [string, boolean];
// en by från npm test (steg 10.2.106): den yngsta av testbyarna som facit sparat (test/facit-byar/) och som är minst minDygn
// gammal, så att ett scenario som bara iakttar en by inte kör en egen. Behöver scenariot något som inte alla byar har (ett stråk
// utanför byn) tar det den yngsta som har det (villkor), så att det inte beror på hur just den yngsta byn råkade bli. Finns
// ingen sparad by (före första facit) körs by 1 dit
const TESTBY_VUXNA = 3;
// en by där minst tre vuxna är friska: testbyarna kan ha sparats mitt i en farsot, och en resa räknar med friska resenärer
export const friskaVuxna = (b: State) => SIM.living(b).filter(p => SIM.ageOf(p, b.now) >= SIM.ALDER.vuxen && !SIM.isSick(p, b.now)).length >= TESTBY_VUXNA;
export const testBy = (minDygn: number, villkor?: (s: State) => boolean): State => {
  const dir = fileURLToPath(new URL('../../../test/facit-byar/', import.meta.url));
  const filer = readdirSync(dir).map(f => /^(\d+)-(\d+)\.json\.gz$/.exec(f)).filter(m => m && +m[2] >= minDygn).sort((a, b) => +a![2] - +b![2] || +a![1] - +b![1]);
  // scenarierna räknar med en by med folk i: en sparad by där bara ett par vuxna lever kvar hoppas över
  const folk = (b: State) => SIM.living(b).filter(p => SIM.ageOf(p, b.now) >= SIM.ALDER.vuxen).length >= TESTBY_VUXNA;
  for (const f of filer) { const b = lasBy(dir + f![0]); if (folk(b) && (!villkor || villkor(b))) return b; }
  return korBy(1, minDygn).s;
};
// testbyn efter minDygn med världen dygn fram i tiden: räknas en gång per process och delas av scenarierna (en kopia var)
const VARLDAR = new Map<string, State>();
export const varldEfter = (minDygn: number, dygn: number): State => {
  const k = `${minDygn}:${dygn}`;
  if (!VARLDAR.has(k)) { const w = SIM.cloneState(testBy(minDygn)); w.now += dygn * DAY; SIM.varldSteg(w); VARLDAR.set(k, w); }
  return SIM.cloneState(VARLDAR.get(k)!);
};
export const kor = (s: State, timmar: number, varje?: (s: State) => void) => { for (let i = 0; i < timmar * STEG_TIM; i++) { step(s, BEAT); varje?.(s); } };
// klockan h samma dag, i testernas tidszon (UTC, se utc.ts; ett scenario med env: STOCKHOLM får svensk tid)
export const klockan = (s: State, h = 10) => { s.now = new Date(s.now).setHours(h, 0, 0, 0); };
// elden brinner (med en stenring), så att ingen behöver leta stenar och flinta för att tända den
export const tandEld = (s: State, fuel = 4, ring = true) => { Object.assign(s.fire, ring ? { lit: true, fuel, ring: true } : { lit: true, fuel }); };
// en färdig station av sorten k, slaktbänken om inget annat sägs (stationer.ts); en som står inne (slöjdbänken, halmbädden)
// får ett hus om det inte finns något där den får stå
export const medBank = (s: State, k = 'slaktbank') => {
  let at = SIM.stationSite(s, k);
  if (!at && SIM.stationDef(k)?.inne) { medHus(s); at = SIM.stationSite(s, k) ?? fritGolv(s, k); }
  const t: SIM.Station = { id: s.nextStation = (s.nextStation ?? 0) + 1, k, x: at!.x, y: at!.y, kvar: 0 };
  if (at!.rot) t.rot = 1;
  if ('inne' in at!) t.inne = 1;
  (s.stationer ??= []).push(t); SIM.touch(s);
  return t;
};
// ett jaktförsök från början: djuren som förut (inga döda, skadade, skrämda eller flyende, och det i extra), inget annat
// flintspjut än verktyget i jägarens hand, och uppgiften mot målet (som söks när djuren nollställts)
export const jaktFran = (s: State, p: Person, verktyg: string | undefined, mal: { x: number; y: number } | (() => { x: number; y: number }), extra: Partial<State> = {}) => {
  Object.assign(s, { djurDoda: undefined, djurHalsa: undefined, djurSkramd: undefined, djurFlykt: undefined, ...extra }); s.ting = (s.ting ?? []).filter(t => t.k !== 'flintspjut');
  if (verktyg) { const t = SIM.addTool(s, verktyg, p); t.hos = p.id; }
  const m = typeof mal === 'function' ? mal() : mal;
  return { act: 'jakt', phase: 'do', tx: m.x, ty: m.y, until: s.now + HOUR, carry: 0, tool: verktyg } as Task;
};
// den första platsen i ring runt mitten, varv för varv från radien rMin upp till rMax med n punkter per varv, där duger ger något
export const iRing = <T>(mitt: { x: number; y: number }, rMin: number, rMax: number, n: number, duger: (x: number, y: number) => T | undefined | false): T | undefined => {
  for (let r = rMin; r < rMax; r++) for (let k = 0; k < n; k++) { const v = duger(Math.round(mitt.x + Math.cos(k / n * 6.283) * r), Math.round(mitt.y + Math.sin(k / n * 6.283) * r)); if (v) return v; }
  return undefined;
};
// den första byn (fröna 1 upp till hogst) som är tjugo dygn gammal, med tidsåldern ai som började sedan ms före nu, där duger stämmer
export const hittaBy = (hogst: number, sedan: number, ai: number, duger: (b: State, seed: number) => boolean) => {
  for (let seed = 1; seed < hogst; seed++) { const b = SIM.createState(seed, START); b.founded -= 20 * DAY; b.kal = SIM.nyKalender(b.now - sedan, ai); if (duger(b, seed)) return b; }
  return undefined;
};
// en behållare k (som ingen håller i) som p äger, med n av vätskan v
export const medVatska = (s: State, p: Person, k: string, v: string, n: number) => { const t = SIM.addTool(s, k, p); t.hos = undefined; SIM.fyllVatska(s, v as SIM.VatskaId, n, t); return t; };
// g vårdar q och vården blir klar, med g bredvid q om flytta är satt
export const vardPa = (s: State, g: Person, q: Person, flytta = true) => {
  if (flytta) { g.x = q.x; g.y = q.y; }
  SIM.vardKlar(s, g, { act: 'varda', phase: 'do', tx: q.x, ty: q.y, until: s.now, carry: 0, why: '', ref: q.id });
};
// ett tomt styre utan ledare, med lagarna
export const medLagar = (s: State, lagar: { id: string; t: number; straff: number; av: number; om: string }[]) => {
  s.styre = { historia: [], oppna: [], sedan: s.now, titel: '', satt: 0, pabud: {} as never, lagar } as unknown as State['styre'];
};
// familjen: invånarna efter id, det första barnet c, dess förälder a med lägst id och a:s partner b
export const familjen = (s: State) => {
  const ppl = living(s).sort((x, y) => x.id - y.id), c = ppl.find(q => q.mother !== undefined)!, a = ppl.find(q => q.id === Math.min(c.mother!, c.father!))!;
  return { ppl, a, b: ppl.find(q => q.id === a.partner)!, c };
};
// slakten: en slaktbänk, kniven som teknik hos alla och den enda kniven i p:s hand
export const slakteri = (s: State, p: Person) => {
  medBank(s);
  for (const r of s.people) r.tek = { ...r.tek, kniv: 1 };
  s.ting = (s.ting ?? []).filter(t => t.k !== 'kniv'); SIM.newTing(s, 'kniv', 1, p.id);
};
// bygger färdigt det hus som är planerat: alla delar utom den sista klara, den sista byggs som vanligt (workOn)
export function byggKlart(s: State, h0?: SIM.Hus) {
  const h = h0 ?? housesOf(s).find(q => !q.klar);
  if (!h) return undefined;
  const bs = bitsOf(s).filter(b => b.hus === h.id), p = living(s)[0];
  for (const i of SIM.kronaOver(s, h)) groundOf(s).trees[i] = 0; // träden vars krona når över huset fälls först (steg 9.2.49)
  for (const b of bs) { b.mat = SIM.MATERIAL[b.m]?.n ?? 0; b.b = b === bs[bs.length - 1] ? 0.999 : 1; }
  SIM.touch(s);
  SIM.workOn(s, p, bs[bs.length - 1], 3600);
  // låg en lagerplats i vägen (steg 8.1.15) är sakerna redan burna till den nya
  const inne = (s.stackar ?? []).filter(a => a.x >= h.x && a.y >= h.y && a.x < h.x + h.w && a.y < h.y + h.h);
  s.stackar = (s.stackar ?? []).filter(a => !inne.includes(a));
  for (const a of inne) SIM.put(s, a.k, a.n, a.ag, a.c);
  SIM.changed(s); h.barUt = undefined;
  // träden på platsen är fällda och stubbarna bortgrävda (steg 8.1.14: husen tar ingen hänsyn till träden)
  const g = SIM.groundOf(s);
  for (let y = h.y; y < h.y + h.h; y++) for (let x = h.x; x < h.x + h.w; x++) g.trees[y * SIM.W + x] = 0;
  s.stubbar = s.stubbar?.filter(k => !(k.x >= h.x && k.y >= h.y && k.x < h.x + h.w && k.y < h.y + h.h)); SIM.touch(s);
  return h;
}
// ett färdigt hus för det mest akuta behovet (oftast en sovsal), utan att någon lär sig bygga
export function medHus(s: State) {
  const tek = s.people.map(p => p.tek && { ...p.tek });
  byggare(s); s.byggSok = undefined; SIM.planBuild(s);
  s.people.forEach((p, i) => { p.tek = tek[i]; });
  return byggKlart(s);
}
// en by utan kläderna från början (steg 10.2.73), för de scenarier som prövar något kläderna ändrar (värmen, rikedomen)
export const utanStartKlader = (s: State) => { s.ting = SIM.tingOf(s).filter(t => !SIM.kladAv(t.k)); };
// tomt förråd: ingen mat, inget trä, inga grenar, ingen flinta och inget hö
export const tomtForrad = (s: State) => { setMat(s, {}); setStock(s, { ved: 0, grenar: 0, flinta: 0, torrgras: 0 }); };
// byns tre första blir tre vuxna utan släkt på samma ruta, friska, utan uppgift och med hungern hunger (byte, behov och ved).
// Resten (s.people, vänskap) ställer varje scenario in själv, i sin ordning
export const treVuxna = (s: State, hunger: number, mer?: (q: Person) => void) => {
  const [a, b, c] = living(s);
  for (const q of [a, b, c]) { q.mother = q.father = q.partner = undefined; q.x = 30; q.y = 30; q.task = undefined; q.hunger = hunger; q.health = 1; mer?.(q); }
  return [a, b, c] as const;
};
// alla vuxna (från ålder år) kan göra timmerväggar och yxor
export const byggare = (s: State, alder = 14) => { for (const p of living(s)) if (ageOf(p, s.now) >= alder) Object.assign((p.tek ??= {}), { yxa: 1, timmervagg: 1, klyvplats: 1 }); }; // trägolvet kräver klyvplatsen (steg 10.2.90)
// mitten av rutan med mest vilt inom radie rutor från lägret, utom vatten (undefined om det inte finns vilt där)
export function bastaJaktruta(s: State, radie: number, c = bynsMitt(s)) {
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
  for (let i = 0; i < t.length; i++) { const d = utanforByn(s, i % W, Math.floor(i / W)); if (d >= min && d < max) { n++; v += t[i]; } }
  return n ? v / n : 0;
}

// det gränssnittet läser ur byn (ui/ och main.ts), med de argument det ger: kartan, förrådet, varje person och varje flik.
// t är tiden som visas (ui.nu), lite före byns tid. Det som bara går med en skärm (pixi, sidan) är inte med. Som i
// webbläsaren läser gränssnittet i visningsläget (visning i typer.ts)
export function uiLas(s: State, t: number) {
  visning.pa = true;
  try { uiLasNu(s, t); } finally { visning.pa = false; }
}
function uiLasNu(s: State, t: number) {
  kalender(s, t); yearNo(s, t); temperature(s, t); isLight(t); lightLevel(t); timeLabel(s, t); ageIndex(s); rikedomDelar(s);
  // kartan: filtret, växterna, djuren, marken och elden
  for (const k of FYND_IDS) for (let i = 0; i < W * H; i++) { vaxerAt(s, k, i); fyndAt(s, k, i); }
  for (const f of SIM.flackarOf(s)) SIM.flackNu(f, t); for (const st of SIM.stationerOf(s)) SIM.smutsVid(s, st); // fläckarna (smuts.ts)
  djurOf(s, t);
  groundOf(s); coverOf(s); bynsMitt(s); getMap(s.seed);
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
  { const ku = living(s).map((p, i) => SIM.personKampe(s, p, i + 1, 0, 0, 0)); SIM.foljet(s, ku); } // testarenan med byns folk (ui/arena.ts): ledaren och följet
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
    // fliken Hälsa (steg 2.5.3)
    SIM.skadeLista(p, s.now); for (const d of Object.keys(SIM.KROPPSDELAR) as SIM.Kroppsdel[]) SIM.delSkada(p, d); for (const f of Object.values(SIM.FORMAGOR)) { f.varde(p); f.delar(p); }
    SIM.naringNu(p); for (const k of SIM.NARINGAR) { SIM.sjunker(k, SIM.KROPP.hungerTim); SIM.bristGrad(p, k); } // näringen och bristen (steg 2.6.1–2.6.2)
    SIM.bristerNu(p); SIM.frysFaktor(p); SIM.skorbjugg(p); SIM.vilaTim(p);
    for (const q of s.people) void s.rels[relKey(p.id, q.id)];
  }
}


// lang: tar LANG_S sekunder eller mer (processorns tid, som scenariot skriver ut). Den snabba kollen (npm run snabbkoll) hoppar
// över dem om de inte nämns, och ett scenario utan lang som tar längre skriver en VARNING.
// env: scenariot körs i en egen process med den miljön, t.ex. Björns tidszon för det som beror på klockslag
// (testerna i övrigt körs i datorns tidszon, här UTC, där byn startar 06:00)
export const LANG_S = 13;
export const STOCKHOLM = { TIDSZON: 'Europe/Stockholm' };
type Scenario = { text: string; lang?: boolean; env?: Record<string, string>; kor: () => Koll[] | Promise<Koll[]> };
// ett namn som sätts två gånger skriver över det första scenariot, som då aldrig körs: det larmar direkt
export const SCENARIER: Record<string, Scenario> = new Proxy({} as Record<string, Scenario>, {
  set(m, n, v) {
    if (n in m) throw new Error(`Scenariot ${String(n)} finns två gånger`);
    m[n as string] = v;
    return true;
  },
});

// sätter fältet f i varje rad i registret (en tom rad hoppas över) till v, eller v(det gamla), kör provet och ställer alltid tillbaka
// de gamla talen. Ett register med bara några rader: { hardVinter: SIM.MOTGANGAR.hardVinter }
export function medTal<T>(reg: Record<string, object | undefined>, f: string, v: number | ((gammalt: number) => number), prov: () => T): T {
  const rader = Object.values(reg).filter(r => r !== undefined) as Record<string, number>[], gamla = rader.map(r => r[f]!);
  rader.forEach((r, i) => { r[f] = typeof v === 'number' ? v : v(gamla[i]!); });
  try { return prov(); } finally { rader.forEach((r, i) => { r[f] = gamla[i]!; }); }
}
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
    for (const p of vuxna) { Object.assign(p, { hunger: 0.9, rest: 0.9, social: 0.9, toa: 0.9, torst: 0.9, warm: 0.9, health: 1 }); p.task = undefined; }
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
export const FORBATTRING = ['bygga', 'hantverk', 'kniv', 'promenad', 'bada', 'strand', 'samtal', 'vila', 'beratta', 'sport', 'boll', 'slagtra', 'mal', 'upptrada', 'lyssna', 'trumma', 'benflojt', 'lyra'];
export const MATMEDREDSKAP = [...MATARBETE, 'korg', 'spjut', 'metspo'];
// en by så rik att folk behåller allt de skaffar (delning.ts), så att ägandet kan provas
export const rikBy = (s: State) => { s.delning = { andel: 0 }; };

// symbolerna i flikarna ritas på en canvas; utan webbläsare räcker en låtsad som ger en tom bild
export function utanWebblasare() {
  const g = globalThis as { document?: unknown };
  g.document ??= { createElement: () => ({ getContext: () => ({ fillRect() {}, createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {} }), toDataURL: () => 'data:,' }) };
}

// striderna mot djur spelas upp på kartan (steg 9.2.29): kör dem till slutet, fem sekunder i taget
export function slutStrider(s: SIM.State) { for (let n = 0; s.kartStrider?.some(g => g.djur) && n < 3000; n++) { s.now += 1000; SIM.kartStridSteg(s, 1); } } // striderna mot djur körs till slutet (bara striden, inte byn)

// ett golv inne där stationen k får plats (rutorna i ett rum utan station), också när sovrummet inte har rutor över: huset byggs
// med tre rutor per person (steg 9.2.36), så i scenarierna ställs bänken där ändå
function fritGolv(s: State, k: string): { x: number; y: number; inne: 1 } | undefined {
  const { w, h } = SIM.storlek(k, 0), upptagen = SIM.stationRutor(s).at;
  for (const r of SIM.gridOf(s).rooms) {
    const rum = new Set(r.tiles);
    for (const i0 of r.tiles) {
      const x = i0 % W, y = Math.floor(i0 / W);
      let fri = true;
      for (let j = 0; j <= h && fri; j++) for (let i = 0; i < w && fri; i++) fri = rum.has((y + j) * W + x + i) && !upptagen.has((y + j) * W + x + i);
      if (fri) return { x, y, inne: 1 };
    }
  }
  return undefined;
}

// en strid mellan bybor, tills den är slut (steg 10.1.7): striden börjar på kartan där de står (kartstrid.ts), och byn går i
// korta steg tills den är över. Svarar striden, som den gamla stridIByn gjorde
export function stridIByn(s: SIM.State, avsikt: SIM.Avsikt, sidor: [SIM.Person[], SIM.Person[]], orsak: string, efter?: SIM.Efter): SIM.Strid {
  const g = SIM.kartStridBorja(s, avsikt, sidor, orsak, efter);
  for (const tSlut = s.now + (SIM.STRID.maxTid + 60) * SIM.SEC; !g.st.slut && s.now < tSlut;) SIM.step(s, SIM.nastaSteg(s)); // striden tar sin tid (steg B.7)
  return g.st;
}

// ett rövargäng för scenarierna (system 10.1): n rövare som kommit in från kanten. vid = de ställs upp där och har det som
// rastplats; anfaller = väntan är över och de går till anfall nu
export function rovarGang(s: SIM.State, n: number, vid?: { x: number; y: number }, opt: { anfaller?: boolean; klan?: number } = {}): SIM.Rovarflock {
  const forra = new Set([s.rovare, ...(s.rovareFler ?? [])]);
  SIM.rovarnaKommer(s, n, true, opt.klan);
  const f = [s.rovare, ...(s.rovareFler ?? [])].find(q => q && !forra.has(q))!;
  if (vid) { SIM.stallUpp(s, f, vid.x, vid.y); f.rast = { x: vid.x, y: vid.y }; }
  if (opt.anfaller) { f.vantat = true; f.anfaller = true; }
  return f;
}
// byn går i de steg spelet tar (korta medan faran är nära, annars fem minuter) tills klart() är sant eller maxSek sekunder gått.
// Svarar hur många sekunder det tog
export function korTills(s: SIM.State, klart: () => boolean, maxSek = 3600, varje?: () => void): number {
  const t0 = s.now;
  while (!klart() && s.now - t0 < maxSek * 1000) { SIM.step(s, Math.min(SIM.nastaSteg(s), maxSek - (s.now - t0) / 1000 + 1)); varje?.(); }
  return (s.now - t0) / 1000;
}
// tändmaterial och flinta så att byn inte behöver hämta det (eldens reserv och flintan till redskapen är förrådsmål, steg 10.2.7 och 10.2.12): för prov som gäller annat arbete
export function tandOchFlinta(s: State) { SIM.setAmount(s, 'torrgras', 30); SIM.setAmount(s, 'grenar', 60); SIM.setAmount(s, 'flinta', 10); }
// kyrkans förråd blir m: det tron ägde tas bort, och m läggs i lagret med tron som ägare (steg 10.3.17)
export function satKyrka(s: SIM.State, tr: SIM.Tro, m: Record<string, number>) {
  for (const [k, n] of Object.entries(SIM.kyrkansForrad(s, tr))) { const v = Math.floor(n + 1e-9); if (v >= 1) SIM.kyrkanTar(s, tr, k, v); }
  for (const [k, n] of Object.entries(m)) SIM.put(s, k, n, { [SIM.kyrkaId(tr.id)]: n });
}
// trons hus (steg 10.3.19): planen blir klar (det som inte redan bestämts), byggplanen ritar huset, och huset byggs klart. Med
// altare ställs ett färdigt altare i huset, så att huset är klart. Ger huset
export function medTroshus(s: State, tr: SIM.Tro, altare = true) {
  tr.plan = { storlek: 'lagom', form: 'kvadrat', altare: 'ja', gudabild: 'ja', bank: 'nej', ...tr.plan };
  if (SIM.TROSHUS_DELAR.vagg.fragas?.(s, tr)) tr.plan.vagg ??= SIM.vaggSorter(s)[0];
  tr.planRutor ??= SIM.TROSHUS.minRutor;
  const tek = s.people.map(p => p.tek && { ...p.tek });
  byggare(s); s.byggSok = undefined; SIM.stepBehov(s);
  for (const k in s.byggBehov ?? {}) s.byggBehov![k] -= 24 * SIM.HOUR;
  SIM.planBuild(s);
  s.people.forEach((p, i) => { p.tek = tek[i]; });
  const h = housesOf(s).find(q => q.tro === tr.id && !q.klar);
  if (!h) return undefined;
  byggKlart(s, h);
  const q = living(s).find(p => p.tro === tr.id), at = q && SIM.stationSite(s, 'altare', q);
  if (altare && at) { (s.stationer ??= []).push({ id: s.nextStation = (s.nextStation ?? 0) + 1, k: 'altare', x: at.x, y: at.y, kvar: 0, klar: s.now, tro: tr.id, inne: 1, ...(at.rot ? { rot: 1 as const } : {}) }); SIM.touch(s); }
  return h;
}
