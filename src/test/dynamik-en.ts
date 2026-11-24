// Kör en by och mäter hur den förändras (steg 13.9.1): sederna, styret och tron dygn för dygn, händelserna i varje område, och
// arbetsdelningen ur timmarna var och en lagt på varje sorts arbete. Skriver måtten som JSON (används av dynamik.ts).
import './utc';
import { STEG_TIM, korBy } from './kor';
import { ACTS, ALDER, DAY, SED_LIST, SKALOR, TEKNIK, VAGSKALAR, ageOf, knows, living, skalaV, troOf, type SkalaId, type State } from '../sim';

const [seed, dagar] = process.argv.slice(2).map(Number);
type Omr = 'seder' | 'styre' | 'tro';
const STYRE = new Set(VAGSKALAR.map(v => v.sed).filter(Boolean) as string[]);
const SEDER = SED_LIST.filter(k => !STYRE.has(k));
const SKAL = Object.keys(SKALOR) as SkalaId[];
const MAT = new Set(['odla', 'jaga', 'fiska', 'samla']); // arbetets slag som skaffar mat (ACTS)
const INTE_ARBETE = new Set(['vila', 'prata', 'leka', 'bara']); // slagen som inte är arbete räknas inte i arbetsdelningen
const SEDFLYTT = 0.1, SKALFLYTT = 5; // en sed som flyttat så här mycket (−1 till 1), och en av trons skalor (0 till 100), är en händelse
const tid = { seder: [] as number[], styre: [] as number[], tro: [] as number[] }; // timmarna (från grundandet) då något hänt
const handelser: Record<string, number> = {};
const hande = (s: State, o: Omr, vad: string) => { tid[o].push((s.now - s.founded) / DAY); handelser[`${o}: ${vad}`] = (handelser[`${o}: ${vad}`] ?? 0) + 1; };
// byns huvudtro: den flest tror på
const huvudtro = (s: State) => { const n = new Map<number, number>(); for (const p of living(s)) if (p.tro !== undefined) n.set(p.tro, (n.get(p.tro) ?? 0) + 1); const b = [...n].sort((a, b) => b[1] - a[1])[0]; return b ? troOf(s, b[0]) : undefined; };
// lägen per område: sederna och vågskålarna från −1 till 1, trons skalor omräknade till −1 till 1
function lage(s: State) {
  const tr = huvudtro(s);
  return {
    seder: SEDER.map(k => s.seder.v[k] ?? 0),
    styre: [...STYRE].map(k => s.seder.v[k as keyof typeof s.seder.v] ?? 0),
    tro: SKAL.map(k => { const v = tr ? skalaV(tr, k) : undefined; return v === undefined ? 0 : v / 50 - 1; }),
  };
}
let steg = 0, ref: Record<string, number> | undefined, forra: { led?: number; lagar: string; pabud: string; min: string; tro: Map<number, number | undefined>; bud: string; tron: number; skal: Record<string, number>; uppror: number; profet: number } | undefined;
const dygn: { d: number; folk: number; tek: number; lage: ReturnType<typeof lage> }[] = [];
// arbetsdelningen: timmar per vuxen och slag, och matens timmar per dygn
const timmar = new Map<number, Record<string, number>>();
const matPerDygn: number[] = [];
let matTim = 0;
const r = korBy(seed, dagar, s => {
  if (++steg % STEG_TIM) return;
  const st = s.stat ?? {};
  // timmarna i arbetet: den vuxna som gör något av ett slag
  for (const p of living(s)) {
    if (ageOf(p, s.now) < ALDER.vuxen || !p.task) continue;
    const sl = ACTS[p.task.act]?.slag; if (!sl || INTE_ARBETE.has(sl)) continue;
    const t = timmar.get(p.id) ?? {}; t[sl] = (t[sl] ?? 0) + 1; timmar.set(p.id, t);
    if (MAT.has(sl)) matTim++;
  }
  // sederna: en sed som flyttat minst SEDFLYTT sedan förra gången den räknades
  ref ??= { ...s.seder.v };
  for (const k of SED_LIST) if (Math.abs((s.seder.v[k] ?? 0) - (ref[k] ?? 0)) >= SEDFLYTT) { hande(s, STYRE.has(k) ? 'styre' : 'seder', STYRE.has(k) ? 'en vågskål flyttade' : 'en sed flyttade'); ref[k] = s.seder.v[k] ?? 0; }
  const sy = s.styre, tr = new Map(living(s).map(p => [p.id, p.tro]));
  const nu = { led: sy?.ledare, lagar: JSON.stringify((sy?.lagar ?? []).map(l => l.id).sort()), pabud: JSON.stringify(sy?.pabud ?? {}), min: JSON.stringify(sy?.ministrar ?? {}), tro: tr,
    bud: JSON.stringify((s.tron ?? []).map(t => (t.bud ?? []).map(b => (b as { id?: string }).id ?? '').sort())), tron: (s.tron ?? []).length,
    skal: Object.fromEntries((s.tron ?? []).flatMap(t => SKAL.map(k => [`${t.id}:${k}`, skalaV(t, k) ?? -1]))), uppror: (st.uppror ?? 0) + (st.ledarstrid ?? 0), profet: st.profet ?? 0 };
  if (forra) {
    if (nu.led !== forra.led) hande(s, 'styre', 'ny ledare');
    if (nu.lagar !== forra.lagar) hande(s, 'styre', 'en lag stiftad eller borttagen');
    if (nu.pabud !== forra.pabud) hande(s, 'styre', 'ett påbud ändrat');
    if (nu.min !== forra.min) hande(s, 'styre', 'en minister tillsatt eller avsatt');
    if (nu.uppror > forra.uppror) hande(s, 'styre', 'ett uppror');
    if (nu.bud !== forra.bud) hande(s, 'tro', 'ett bud antaget eller borttaget');
    if (nu.tron > forra.tron) hande(s, 'tro', 'en ny tro');
    if (nu.profet > forra.profet) hande(s, 'tro', 'en profets syn');
    for (const [k, v] of Object.entries(nu.skal)) { const f = forra.skal[k]; if (f !== undefined && f >= 0 && v >= 0 && Math.abs(v - f) >= SKALFLYTT) { hande(s, 'tro', 'en skala flyttade'); break; } }
    let bytt = 0; for (const [id, t] of tr) if (forra.tro.has(id) && forra.tro.get(id) !== t) bytt++;
    if (bytt >= 2) hande(s, 'tro', 'flera bytte tro');
  }
  // trons skalor räknas från värdet förra gången de flyttat
  if (forra) for (const [k, v] of Object.entries(nu.skal)) { const f = forra.skal[k]; if (f !== undefined && Math.abs(v - f) < SKALFLYTT) nu.skal[k] = f; }
  forra = nu;
  // en gång per dygn: läget, folket, teknikerna och matens timmar
  if (steg % (STEG_TIM * 24) === 0) {
    const folk = living(s);
    dygn.push({ d: Math.round((s.now - s.founded) / DAY), folk: folk.length, tek: TEKNIK.filter(t => folk.some(p => knows(p, t.id))).length, lage: lage(s) });
    matPerDygn.push(matTim / Math.max(1, folk.length)); matTim = 0;
  }
});
const s = r.s, st = s.stat ?? {}, n = (k: string) => Math.round(st[k] ?? 0);
// den längsta tiden utan något i ett område (dygn), räknat från grundandet till slutet
const langst = (o: Omr) => { let m = 0, f = 0; for (const t of [...tid[o], dagar]) { m = Math.max(m, t - f); f = t; } return m; };
// arbetsdelningen per slag: den del av slagets timmar som den flitigaste femtedelen av de vuxna står för
const slag = [...new Set([...timmar.values()].flatMap(t => Object.keys(t)))];
const vuxna = [...timmar.values()];
const flitig: Record<string, number> = {};
for (const k of slag) {
  const t = vuxna.map(v => v[k] ?? 0).sort((a, b) => b - a), sum = t.reduce((a, b) => a + b, 0);
  if (sum > 0) flitig[k] = t.slice(0, Math.max(1, Math.round(t.length / 5))).reduce((a, b) => a + b, 0) / sum;
}
const utanMat = vuxna.filter(v => { const all = Object.values(v).reduce((a, b) => a + b, 0), mat = [...MAT].reduce((a, k) => a + (v[k] ?? 0), 0); return all > 0 && mat / all < 0.1; }).length;
const byteAndra = Object.entries(st).filter(([k]) => k.startsWith('byte_') && k !== 'byte_handel' && k !== 'byte_hus').reduce((a, [, v]) => a + v, 0);
console.log(JSON.stringify({ seed, pop: r.n.pop, dygn, handelser, langst: { seder: langst('seder'), styre: langst('styre'), tro: langst('tro') }, antal: { seder: tid.seder.length, styre: tid.styre.length, tro: tid.tro.length },
  arbete: { flitig, vuxna: vuxna.length, utanMat, matPerDygn, kopMat: n('byte_mat'), gavMat: n('gava_mat'), handlare: n('byte_handel'), varandra: Math.round(byteAndra),
    bygga: vuxna.reduce((a, v) => a + (v.bygga ?? 0), 0), hantverk: vuxna.reduce((a, v) => a + (v.hantverk ?? 0), 0) },
  vakter: r.vakter.length, larm: r.vakter }));
