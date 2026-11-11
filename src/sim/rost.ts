// Omröstningarna och maktens delar (system 8.3). Allt byn avgör är en fråga i registret FRAGOR: vem som får lägga fram den, vilka som
// röstar (kretsen) och vad ett ja gör. Frågan avgörs genom handuppräckning vid elden klockan 20 (rostKvall, från stepStyre). Alla vuxna
// röstar efter egna åsikter och eget intresse, och summan av vikterna avgör (`vikter`, samma tal som i sederna). Här finns också
// ministrarna (registret MINISTRAR), missnöjet och fraktionen. Vad frågan handlar om är en rad i FRAGOR; lagarna (8.4) och kyrkans
// frågor (8.6) lägger till sina rader.
import { DAY, Person, State } from './typer';
import { balans } from './balans';
import { clamp, rnd } from './slump';
import { ALDER, ageOf, alive, byId, count, isKin, living, log, relKey, think } from './folk';
import { SED_LIST, drar, influence } from './seder';
import type { Sed } from './seder';
import { PABUD, Pabud, ledareOf, ledarVikt, legitimitet, slutarStyre, styreAv, utvisa } from './styre';
import { notis } from './notiser';
import { kartStridBorja, stridPagar } from './kartstrid';
import { EFTER } from './efterstrid';
import { rikedom } from './varde';
import { rivScenen } from './stationer';
import { overstePrast } from './kyrka';
import { lagGaller, utanRost } from './lagar';
import { Tro, skalaV, troOf, troende } from './religion';

export const ROST = balans('rost', {
  sparas: 14, // så många omröstningar sparas
  kvall: 1, // så många frågor tas upp varje kväll
  gillar: 0.25, // så mycket det betyder att man gillar den som lägger fram frågan
  skillnad: 0.2, // en åsikt om ett påbud ska skilja så här mycket från det som gäller för att det ska läggas fram
  miss: 0.06, // den som röstade emot och förlorade blir så här missnöjd ...
  missEnvalde: 0.12, // ... och så här mycket till när ledaren vägde tungt
});
export const VIKT = balans('vikt', {
  envalde: 0.95, // så stor del av hela byns vikt har ledaren vid fullt Envälde
  harkomst: 0.5, // ... släkternas äldste vid full Härkomst
  fejd: 0.5, // ... krigarna vid full Fejd
  minister: 0.9, // ... ministrarna vid full Sammanhållning
  prast: 0.7, // ... prästerna vid full Andlig
  krigare: 8, // den som har minst så här i närstrid räknas som krigare
});
export const MISS = balans('missnoje', {
  svalt: 0.012, kyla: 0.008, // så mycket missnöjet växer i timmen den som svälter och fryser
  seder: 0.002, // ... långsamt när sederna ligger långt från ens egna åsikter (mer än sederAvst)
  sederAvst: 0.6,
  orattvist: 0.2, // ... när man själv straffas orättvist (familjen hälften)
  bleknarDygn: 5, // missnöjet bleknar med den här tidskonstanten ...
  vintern: 0.3, // ... och sjunker så här mycket efter en klarad vinter eller en vunnen strid
  grans: 0.45, // över den här gränsen vill man byta ledare (fraktionen)
  sprid: 0.25, // chansen i ett samtal att hemligheten sprids till den man litar på ...
  litar: 25, // ... den man tycker så här bra om
  ta: 0.2, // ... som tar emot den om hen är minst så här missnöjd
  lojal: 40, // den som gillar ledaren så här mycket är lojal, och ...
  avslojar: 0.15, // ... avslöjar den med den här chansen om hen får höra
  lugnDygn: 2, // efter ett skifte bildas ingen ny fraktion på så här många dygn (år i spelet)
  uppror: 0.5, // är fraktionen minst den här delen av de vuxna blir det ett uppror vid Fejd
  fejd: 0.2, // vid mer än så här Fejd blir det strid i stället för en fredlig avsättning
  hard: 1.4, // så hård ska ledaren vara för att straffa fraktionens ledare när den avslöjas
});

// ---------- vikten (steg 8.3.2) ----------
const aldste = (s: State) => {
  const m = new Map<string, Person>();
  for (const p of living(s)) { if (ageOf(p, s.now) < ALDER.vuxen) continue; const k = String(rot(s, p)), q = m.get(k); if (!q || p.born < q.born) m.set(k, p); }
  return [...m.values()];
};
function rot(s: State, p: Person): number { let q = p; for (let i = 0; i < 6; i++) { const f = byId(s, q.mother ?? q.father); if (!f || !alive(f)) break; q = f; } return q.id; }
const krigare = (s: State) => living(s).filter(p => ageOf(p, s.now) >= ALDER.vuxen && p.skill.narstrid >= VIKT.krigare);
export const ministrarNu = (s: State) => Object.values(s.styre?.ministrar ?? {}).map(id => byId(s, id)).filter((p): p is Person => !!p && alive(p));
// varje persons vikt, och andelen av hela byns vikt. Grunden är inflytandet. Sederna flyttar sedan vikt till grupper: Allmogen – Envälde till
// ledaren, Härkomst till släkternas äldste, Fejd till krigarna och Sammanhållning till ministrarna. En rad i GRUPPER per sed som flyttar vikt
const GRUPPER: { andel: (s: State) => number; vem: (s: State) => Person[] }[] = [
  { andel: s => { const l = ledarVikt(s); if (!l) return 0; const a = Math.max(l.w / (1 + l.w), VIKT.envalde * Math.max(0, s.seder.v.rang ?? 0) ** 2); return lagGaller(s, 'ledarBunden') ? Math.min(a, 0.5) : a; }, vem: s => { const l = ledareOf(s); return l ? [l] : []; } },
  { andel: s => VIKT.harkomst * Math.max(0, s.seder.v.fortjanst ?? 0), vem: aldste },
  { andel: s => VIKT.fejd * Math.max(0, s.seder.v.fejd ?? 0), vem: krigare },
  { andel: s => VIKT.minister * Math.max(0, s.seder.v.gemenskap ?? 0), vem: ministrarNu },
  { andel: s => VIKT.prast * Math.max(0, s.seder.v.andlig ?? 0), vem: s => (s.tron ?? []).flatMap(t => { const p = byId(s, t.prast); return p && alive(p) ? [p] : []; }) }, // Andlig flyttar vikt till prästerna (steg 8.6.1)
];
// en gång per timme och läge: frågas av sederna, lagarna och rösterna (regel 4)
const vikterCache = new WeakMap<State, { key: string; v: Viktad[] }>();
type Viktad = { p: Person; w: number; andel: number };
export function vikter(s: State): Viktad[] {
  const sv = s.seder.v, st = s.styre, key = `${Math.floor(s.now / 3600000)}:${st?.ledare}:${st?.oppna.length}:${Object.keys(st?.ministrar ?? {}).length}:${sv.rang}:${sv.fortjanst}:${sv.fejd}:${sv.gemenskap}:${sv.andlig}:${s.people.length}:${st?.lagar?.length}:${s.tron?.length}`; // de döda och de som flyttat sållas bort nedan
  const c = vikterCache.get(s);
  if (c?.key === key && c.v.every(x => alive(x.p))) return c.v;
  const v = raknaVikter(s);
  vikterCache.set(s, { key, v });
  return v;
}
function raknaVikter(s: State): Viktad[] {
  const ppl = living(s).map(p => ({ p, w: influence(s, p), andel: 0 })).filter(x => x.w);
  const tw = ppl.reduce((a, x) => a + x.w, 0);
  if (!tw) return ppl;
  const grupper = GRUPPER.map(g => ({ a: g.andel(s), v: g.vem(s) })).filter(g => g.a > 0 && g.v.length);
  const sum = grupper.reduce((a, g) => a + g.a, 0), f = sum > 0.98 ? 0.98 / sum : 1;
  for (const x of ppl) x.andel = x.w / tw * (1 - sum * f);
  for (const g of grupper) {
    const m = ppl.filter(x => g.v.includes(x.p)), mw = m.reduce((a, x) => a + x.w, 0);
    for (const x of m) x.andel += g.a * f * x.w / mw;
  }
  return ppl;
}

function kretsVikter(s: State, tr: Tro) {
  const folk = troende(s, tr).filter(p => vuxenRost(s, p)), pr = byId(s, tr.prast), a = (skalaV(tr, 'prast') ?? 0) / 100;
  return folk.map(p => ({ p, w: 1, andel: (1 - (pr && folk.includes(pr) ? a : 0)) / folk.length + (p === pr ? a : 0) }));
}
// ---------- registret ----------
export interface Rost { id: number; namn: string; w: number; ja: boolean; why: string; }
export interface Omrostning { t: number; f: string; namn: string; fram: number; framNamn: string; roster: Rost[]; ja: number; nej: number; gick: boolean; varfor?: string }
export interface Fraga { f: string; d: FragaData; fram: number; prio?: number }
export type FragaData = Record<string, string | number | undefined>;
export interface FragaDef {
  namn(s: State, d: FragaData): string;
  krets: 'byn' | 'tro'; // vilka som röstar: byn, eller en tros troende (8.6.7)
  rost(s: State, p: Person, d: FragaData): { v: number; why: string }; // −1 till 1: åsikten och intresset
  gor(s: State, d: FragaData, fram: Person | undefined): void; // vad ett ja gör
  nej?(s: State, d: FragaData): void;
}
export const FRAGOR: Record<string, FragaDef> = {
  // påbuden som finns blir de första frågorna (steg 8.3.1)
  pabud: {
    namn: (_s, d) => `${PABUD[d.k as Pabud].namn}: ändra påbudet`, krets: 'byn',
    rost: (s, p, d) => {
      const k = d.k as Pabud, egen = PABUD[k].asikt(s, p), nytt = d.v as number, gamla = s.styre?.pabud?.[k] ?? 0;
      const v = Math.abs(egen - gamla) - Math.abs(egen - nytt);
      return { v, why: v > 0 ? `Vill ha det så (${PABUD[k].namn.toLowerCase()})` : 'Tycker att det är bra som det är' };
    },
    gor: (s, d, fram) => { const st = styreAv(s); st.pabud = { ...st.pabud, [d.k as Pabud]: d.v as number }; if (fram) log(s, `Byn gick på ${fram.name}s förslag om ${PABUD[d.k as Pabud].namn.toLowerCase()}.`, 'world', [fram.id]); },
  },
  minister: {
    namn: (_s, d) => `${MINISTRAR[d.post as string].namn}: ${d.namn}`, krets: 'byn',
    rost: (s, p, d) => { const q = byId(s, d.id as number), op = q ? (s.rels[relKey(p.id, q.id)]?.op ?? 0) / 100 : 0; return { v: op + 0.1, why: op < 0 ? `Tycker inte om ${d.namn}` : `Litar på ${d.namn}` }; },
    gor: (s, d) => { (styreAv(s).ministrar ??= {})[d.post as string] = d.id as number; log(s, `${d.namn} blev byns ${MINISTRAR[d.post as string].namn.toLowerCase()}.`, 'world', [d.id as number]); },
  },
  // förbudet mot hån (steg 8.3.13)
  hanforbud: {
    namn: () => 'Förbud mot framträdanden som hånar styret', krets: 'byn',
    rost: (s, p, d) => { const l = byId(s, d.led as number), op = l ? (s.rels[relKey(p.id, l.id)]?.op ?? 0) / 100 : 0; return { v: op - (s.seder.v.nyfikenhet ?? 0) * 0.3 - 0.05, why: op > 0 ? 'Håller på ledaren' : 'Vill kunna skratta åt ledaren' }; },
    gor: (s, d) => { styreAv(s).hanForbud = true; hanForbudet(s, d); },
  },
};
export const hanForbudet = (s: State, d: FragaData) => { const l = byId(s, d.led as number); log(s, `Byn förbjöd framträdanden som hånar ${l?.name ?? 'ledaren'}.`, 'world'); rivScenen(s, 'Scenen revs efter förbudet mot hån.'); };

// ---------- att lägga fram och rösta (steg 8.3.1) ----------
export function laggFram(s: State, f: string, d: FragaData, fram: Person, prio = 0) {
  const st = styreAv(s), q = (st.fragor ??= []);
  if (q.some(x => x.f === f && JSON.stringify(x.d) === JSON.stringify(d))) return;
  q.push({ f, d, fram: fram.id, prio });
}
const vuxenRost = (s: State, p: Person) => ageOf(p, s.now) >= ALDER.vuxen;
export function rostaOm(s: State, fr: Fraga) {
  const def = FRAGOR[fr.f], fram = byId(s, fr.fram), st = styreAv(s);
  // kretsen: byn, eller en tros troende (steg 8.6.7). De troende väger lika, och Var och en – Präster flyttar vikten till prästerna
  const tr = def.krets === 'tro' ? troOf(s, fr.d.tro as number) : undefined;
  const v = tr ? kretsVikter(s, tr) : vikter(s).filter(x => vuxenRost(s, x.p) && !utanRost(s, x.p));
  const roster: Rost[] = v.map(({ p, andel }) => {
    const r = def.rost(s, p, fr.d), gillar = fram && fram !== p ? (s.rels[relKey(p.id, fram.id)]?.op ?? 0) / 100 * ROST.gillar : fram === p ? 1 : 0;
    return { id: p.id, namn: p.name, w: andel, ja: r.v + gillar > 0, why: fram === p ? 'La fram frågan' : r.why };
  });
  const ja = roster.reduce((a, r) => a + (r.ja ? r.w : 0), 0), nej = roster.reduce((a, r) => a + (r.ja ? 0 : r.w), 0), gick = ja > nej;
  (st.roster ??= []).push({ t: s.now, f: fr.f, namn: def.namn(s, fr.d), fram: fr.fram, framNamn: fram?.name ?? '', roster, ja, nej, gick });
  if (st.roster.length > ROST.sparas) st.roster.splice(0, st.roster.length - ROST.sparas);
  count(s, 'omrostning'); count(s, gick ? 'omrostning_ja' : 'omrostning_nej');
  const envalde = Math.max(0, s.seder.v.rang ?? 0);
  // missnöjet med styret: bara byns frågor, inte trons eller skulden på tinget
  if (def.krets === 'byn' && fr.f !== 'skuld') for (const r of roster) if (r.ja !== gick) { const p = byId(s, r.id); if (p) p.missnoje = clamp((p.missnoje ?? 0) + ROST.miss + ROST.missEnvalde * envalde, 0, 1); }
  if (gick) def.gor(s, fr.d, fram); else def.nej?.(s, fr.d);
  return gick;
}
// klockan 20: de viktigaste frågorna tas upp, en per kväll (ROST.kvall)
export function rostKvall(s: State) {
  const q = s.styre?.fragor;
  if (!q?.length) return;
  q.sort((a, b) => (b.prio ?? 0) - (a.prio ?? 0));
  for (let i = 0; i < ROST.kvall && q.length; i++) {
    const fr = q.shift()!, fram = byId(s, fr.fram);
    if (fram && alive(fram)) rostaOm(s, fr);
  }
}
// ---------- ministrarna (steg 8.3.8) ----------
export interface MinisterDef { namn: string; nar(s: State): boolean; vem(s: State): Person | undefined; pabud?: Pabud[]; sektion(s: State): number }
const basta = (s: State, f: (p: Person) => number) => { let b: Person | undefined, bv = -Infinity; for (const p of living(s)) if (vuxenRost(s, p) && f(p) > bv) { bv = f(p); b = p; } return b; };
export const MINISTRAR: Record<string, MinisterDef> = {
  overstePrast: { namn: 'Överstepräst', nar: s => !!overstePrast(s), vem: s => overstePrast(s), sektion: s => living(s).filter(p => p.tro !== undefined).length / 3 }, // steg 8.6.16
  krigshovding: { namn: 'Krigshövding', nar: s => (s.stat?.vargjakt ?? 0) + (s.stat?.vargstrid ?? 0) + (s.stat?.rovarstrid ?? 0) >= 6 && krigare(s).length >= 3, vem: s => basta(s, p => p.skill.narstrid + p.pot.mod / 4), sektion: s => krigare(s).length },
  domare: { namn: 'Domare', nar: s => (s.styre?.lagar?.length ?? 0) >= 2, vem: s => basta(s, p => p.pot.intelligens + p.pot.empati / 2), sektion: () => 1 }, // steg 8.4.16
  forvaltare: { namn: 'Förvaltare', nar: s => rikedom(s) >= 800, vem: s => basta(s, p => p.pot.intelligens + p.skill.handel / 2), pabud: ['matlager', 'vedlager', 'torkat'], sektion: s => living(s).length / 4 },
};
export const framFor = (s: State, k: Pabud) => { for (const [id, m] of Object.entries(MINISTRAR)) if (m.pabud?.includes(k)) { const p = byId(s, s.styre?.ministrar?.[id]); if (p && alive(p)) return p; } return undefined; };
// posterna ses över varje årstid, som titeln. Vid Envälde utser ledaren, annars väljer byn
export function seOverMinistrar(s: State) {
  const l = ledareOf(s), st = styreAv(s);
  if (!l) return;
  for (const [id, m] of Object.entries(MINISTRAR)) {
    const nu = byId(s, st.ministrar?.[id]);
    if (nu && alive(nu)) continue;
    if (st.ministrar) delete st.ministrar[id];
    if (!m.nar(s)) continue;
    const q = m.vem(s);
    if (!q) continue;
    if ((s.seder.v.rang ?? 0) > 0.5) { (st.ministrar ??= {})[id] = q.id; log(s, `${l.name} gjorde ${q.name} till ${m.namn.toLowerCase()}.`, 'world', [l.id, q.id]); count(s, 'minister'); oppnaHarkomst(s); }
    else { laggFram(s, 'minister', { post: id, id: q.id, namn: q.name }, l); oppnaHarkomst(s); }
  }
}
const oppnaHarkomst = (s: State) => oppnaSed(s, 'fortjanst');
// en vågskål låses upp (Skalor som låses upp): den börjar där byn redan lutar, inte på noll
export function oppnaSed(s: State, k: Sed) {
  const st = styreAv(s);
  if (st.oppna.includes(k)) return;
  st.oppna.push(k);
  const ppl = vikter(s); let v = 0;
  for (const x of ppl) v += drar(s, x.p)[k] * x.andel;
  s.seder.v[k] = clamp(v, -1, 1);
  log(s, `Byn börjar fundera på ${SED_NAMN[k] ?? k}.`, 'world');
}
const SED_NAMN: Partial<Record<Sed, string>> = { fortjanst: 'om det är dugligheten eller släkten som ska räknas', fejd: 'om konflikter ska lösas med ord eller med styrka' };

// ---------- missnöjet (steg 8.3.10) ----------
export function missnojeTimme(s: State) {
  const st = s.styre;
  if (!st?.historia.length) return;
  const f = Math.exp(-1 / 24 / MISS.bleknarDygn);
  const sv = s.seder.v;
  for (const p of living(s)) {
    if (!vuxenRost(s, p)) continue;
    let m = (p.missnoje ?? 0) * f;
    if (p.hunger < 0.1) m += MISS.svalt;
    if (p.warm < 0.3) m += MISS.kyla;
    const d = drar(s, p); let av = 0, n = 0;
    for (const k of SED_LIST) if (sv[k]) { av += Math.abs(clamp(d[k], -1, 1) - sv[k]); n++; }
    if (n && av / n > MISS.sederAvst) m += MISS.seder;
    p.missnoje = m < 0.001 ? undefined : clamp(m, 0, 1);
  }
  fraktionTimme(s);
}
export const missnojeStrafft = (_s: State, q: Person, familj: Person[]) => { q.missnoje = clamp((q.missnoje ?? 0) + MISS.orattvist, 0, 1); for (const f of familj) if (f !== q) f.missnoje = clamp((f.missnoje ?? 0) + MISS.orattvist / 2, 0, 1); };
export const missnojeLatt = (s: State) => { for (const p of living(s)) if (p.missnoje) p.missnoje *= 1 - MISS.vintern; };
export const missnojeNoll = (s: State) => { for (const p of living(s)) p.missnoje = undefined; const st = styreAv(s); st.frak = undefined; st.lugn = s.now + MISS.lugnDygn * DAY; };

// ---------- fraktionen (steg 8.3.11) ----------
export interface Fraktion { led: number; med: number[]; }
function fraktionTimme(s: State) {
  const st = styreAv(s), l = ledareOf(s);
  if (!l || (st.lugn ?? 0) > s.now) return;
  const f = st.frak;
  if (f) { f.med = f.med.filter((id: number) => { const p = byId(s, id); return p && alive(p) && p !== l; }); if (!f.med.length) { st.frak = undefined; return; } }
  // den som är missnöjd nog vill byta ledare; finns ingen fraktion blir hen den första
  if (!f) { const p = living(s).find(q => q !== l && vuxenRost(s, q) && (q.missnoje ?? 0) >= MISS.grans); if (p) { st.frak = { led: p.id, med: [p.id] }; count(s, 'fraktion'); } }
  if (!st.frak) return;
  const g = st.frak;
  let bk = -1;
  for (const id of g.med) { const p = byId(s, id)!; if (p.pot.karisma > bk) { bk = p.pot.karisma; g.led = id; } } // den mest karismatiska leder den
  const v = vikter(s), vikt = v.reduce((a, x) => a + (g.med.includes(x.p.id) ? x.andel : 0), 0);
  if (vikt > legitimitet(s).v) stortas(s, l, g);
}
// hemligheten sprids i samtal till den man litar på, och de lojala kan avslöja den (från converse i samtal.ts)
export function fraktionSamtal(s: State, a: Person, b: Person) {
  const f = s.styre?.frak;
  if (!f || !f.med.includes(a.id) || f.med.includes(b.id) || !vuxenRost(s, b) || b.id === s.styre?.ledare) return;
  if ((s.rels[relKey(a.id, b.id)]?.op ?? 0) < MISS.litar || rnd(s, 'samtal', a) >= MISS.sprid) return;
  const l = ledareOf(s);
  if ((b.missnoje ?? 0) >= MISS.ta) { f.med.push(b.id); count(s, 'fraktion_med'); return; }
  if (l && (s.rels[relKey(b.id, l.id)]?.op ?? 0) >= MISS.lojal && rnd(s, 'samtal', b) < MISS.avslojar) avslojad(s, l, f, b);
}
function avslojad(s: State, l: Person, f: Fraktion, ang: Person) {
  const q = byId(s, f.led), st = styreAv(s);
  st.frak = undefined; count(s, 'fraktion_avslojad');
  if (!q) return;
  log(s, `${ang.name} berättade för ${l.name} att ${q.name} och några till vill byta ledare.`, 'rel', [l.id, ang.id, q.id]);
  think(ang, 'Angav en sammansvärjning', 0.02, s.now, 86400000);
  const hard = 1 + (s.seder.v.rang ?? 0) + (s.seder.v.fejd ?? 0) * 0.5;
  if (hard >= MISS.hard) { utvisa(s, q, l, 'för att ha velat störta ledaren'); for (const id of f.med) { const m = byId(s, id); if (m && m !== q) m.missnoje = clamp((m.missnoje ?? 0) + 0.1, 0, 1); } }
  else { for (const id of f.med) { const m = byId(s, id); if (m) m.missnoje = (m.missnoje ?? 0) * 0.5; } log(s, `${l.name} gav efter för missnöjet och lyssnade på ${q.name}.`, 'rel', [l.id, q.id]); }
}
// avsättning, kupp och uppror (steg 8.3.12)
function stortas(s: State, l: Person, f: Fraktion) {
  if (stridPagar(s, 'ledarstrid')) return; // striden om det pågår redan (steg 10.1.7)
  const st = styreAv(s), led = byId(s, f.led), fejd = s.seder.v.fejd ?? 0;
  const vuxna = living(s).filter(p => vuxenRost(s, p));
  if (!led) return;
  if (fejd <= MISS.fejd) {
    count(s, 'avsatt'); st.frakVald = led.id; st.satt = 0.7;
    const t = `Byn sade ifrån vid elden, och ${l.name} fick lämna ledarskapet.`;
    log(s, t, 'world', [l.id, led.id]); notis(s, 'ledare', t, [l.id, led.id]);
    slutarStyre(s, 'avsattes'); missnojeNoll(s);
    return;
  }
  const stor = f.med.length >= vuxna.length * MISS.uppror;
  const med = f.med.map(id => byId(s, id)!).filter(Boolean);
  const narmaste = (p: Person, n: number, utom: Person[]) => vuxna.filter(q => q !== p && !utom.includes(q) && (isKin(p, q) || (s.rels[relKey(p.id, q.id)]?.op ?? 0) > 30)).slice(0, n);
  // vid en ledarstrid: utmanaren och en nära ur fraktionen mot ledaren och en nära som inte är med i den
  const a = stor ? med : [led, ...narmaste(led, vuxna.length, [l]).filter(q => med.includes(q)).slice(0, 1)], b = stor ? vuxna.filter(q => !med.includes(q)) : [l, ...narmaste(l, 1, med)];
  if (!b.includes(l)) b.push(l);
  count(s, stor ? 'uppror' : 'ledarstrid');
  const text = stor ? `Upproret bröt ut: ${led.name} och de missnöjda gick mot ${l.name}.` : `${led.name} utmanade ${l.name} om ledarskapet.`;
  log(s, text, 'world', [l.id, led.id]); notis(s, 'strid', text, [l.id, led.id]);
  // striden sker på kartan och tar tid (steg 10.1.7): utgången avgörs när den är slut (EFTER.ledarstrid)
  kartStridBorja(s, 'skada', [a, b], stor ? 'uppror' : 'en ledarstrid', { typ: 'ledarstrid', led: led.id, l: l.id });
}
EFTER.ledarstrid = (s, e, vinnare) => {
  const st = styreAv(s), led = byId(s, e.led as number), l = byId(s, e.l as number);
  if (!led || !l) return;
  if (vinnare === 0) {
    st.frakVald = alive(led) ? led.id : undefined; st.satt = 0.5;
    if (alive(l)) { if (rnd(s, 'strid') < 0.4) utvisa(s, l, led, 'efter att ha störtats'); else slutarStyre(s, 'störtades'); }
    if (s.styre?.ledare !== undefined) slutarStyre(s, 'störtades');
    missnojeNoll(s);
  } else {
    if (alive(led)) utvisa(s, led, l, 'för att ha försökt ta makten');
    st.frak = undefined; st.lugn = s.now + MISS.lugnDygn * DAY;
  }
};
