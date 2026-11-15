// ---------- styrets budget (steg 10.5.7) ----------
// Med skattelagen bestämmer styret vad det byn äger går till. Budgeten är delar med en vikt var (0 till 1 i steg om en fjärdedel);
// varje del är en rad i registret BUDGET med vad delens arbeten saknar. En gång per dygn (ett år i spelet) delas varje material
// för sig, i hela saker, mellan de delar som saknar det, efter vikterna bland dem och aldrig mer än delen saknar: en del som är ensam
// om att sakna sten får den sten den saknar fast vikten är låg. Det en del fått äger delen (en egen ägare i förrådet, som kyrkan), och
// bara delens arbeten tar av det; allt annat tar av det ingen del fått, som förut. Inget sparas: när nästa år delas blir det som är
// kvar byns igen. Kyrkans del lämnas över till kyrkan och blir kyrkans (steg 10.3.17), och gåvorna ges direkt till dem som stöder
// ledaren. När skattelagen införs finns inga delar; en del föreslås när det den gäller finns i byn, och varje vikt är en egen fråga.
import { DAY, Person, State } from './typer';
import type { Bit } from './byggnad';
import { balans } from './balans';
import { clamp } from './slump';
import { ageOf, ALDER, count, getRel, isParent, living, log, relKey, think } from './folk';
import { kronika } from './historik';
import { MATERIAL, bitsOf, husById } from './byggnad';
import { needOf } from './bygg';
import { troshusAv, troshusSaknar } from './troshus';
import { kyrkaId } from './egendom';
import { budgetMatKrok, fromByn, ownsId, releaseOwner } from './lager';
import { FOOD } from './saker';
import { kroppensMat } from './ekonomi';
import { ligger } from './sjukdom';
import { lagGaller } from './lagar';
import { ledareOf } from './styre';
import { drar } from './seder';
import { FRAGOR, vikter } from './rost';
import { TAS_UPP, budgetBortKrok } from './lagar';
import { knows } from './teknik';
import { forsorjAlder } from './skatt';
import { sakNamn } from './saker';
import type { Tro } from './religion';

export const BUDG = balans('budget', {
  gava: 5, // så mycket silver var och en som stöder ledaren får i gåva per år, när delen har en full vikt mot de andra
  stod: 30, // den som tycker så här bra om ledaren (relationen, −100 till 100) stöder hen
  gavaOp: 2, // gåvan gör mottagaren så här mycket vänligare mot ledaren, per silver
  prio: 0.6, // hur väl en ny del väcks som fråga, gånger det förslaget vill ha
  gamla: 60, // från den här åldern får man mat ur delen för barn, gamla och sjuka (steg 10.5.8)
  fest: 2, // gästabudet hålls när delen fått så här många portioner per invånare
  festMiss: 0.3, // gästabudet sänker missnöjet så här mycket
  festGlad: 0.15, // och ger en glad tanke så här stor
});

export interface BudgetDel { id: string; vikt: number }
export interface Budget { delar: BudgetDel[]; fick?: Record<string, Record<string, number>>; fest?: boolean } // fick: det varje del fick senast; fest: gästabudet hålls i år
export interface BudgetDef {
  namn: string; sym: string; text: string;
  finns(s: State): boolean; // det delen gäller finns i byn
  saknar(s: State): Record<string, number>; // det delens arbeten saknar, per material
  bit?(s: State, b: Bit): boolean; // byggena som hör till delen (de tar av det delen fått)
  ge?(s: State, k: string, n: number): void; // delen lämnar det den fått vidare med en gång (kyrkan, gåvorna)
  vill(s: State, p: Person): number; // vikten p vill ge delen (0 till 1)
  mat?: { vem(s: State, p: Person): boolean; behov(s: State): number }; // en matdel (steg 10.5.8): vem som äter ur den, och hur mycket den högst får
}
const fjardedel = (x: number) => clamp(Math.round(x * 4) / 4, 0, 1);
const lutning = (s: State, p: Person) => clamp(drar(s, p).gemenskap ?? 0, -1, 1);
const lagg = (m: Record<string, number>, k: string, n: number) => { if (n > 0) m[k] = (m[k] ?? 0) + n; };
const fran = (s: State, m: Record<string, number>, bitar: (b: Bit) => boolean) => { for (const b of bitsOf(s)) { const it = MATERIAL[b.m]?.item; if (it && bitar(b)) lagg(m, it, needOf(b)); } return m; };
// byns hus: inte en familjs och inte trons
const bynsHus = (s: State, b: Bit) => { if (b.hus === undefined) return false; const h = husById(s, b.hus); return !!h && h.ag === undefined && h.tro === undefined; };
const vag = (_s: State, b: Bit) => b.hus === undefined && !!MATERIAL[b.m]?.vag;
const tronMedHus = (s: State): Tro[] => (s.tron ?? []).filter(tr => tr.slut === undefined && troshusAv(s, tr).length > 0);
const stodjer = (s: State) => { const l = ledareOf(s); return l ? living(s).filter(p => p !== l && !p.gast && ageOf(p, s.now) >= ALDER.vuxen && (s.rels[relKey(p.id, l.id)]?.op ?? 0) > BUDG.stod) : []; };

// matdelarna (steg 10.5.8): så mycket delens folk äter på ett dygn (ett år i spelet)
const svag = (s: State, p: Person) => (ageOf(p, s.now) < forsorjAlder(s) && !p.partner) || ageOf(p, s.now) >= BUDG.gamla || ligger(p, s.now);
const ater = (s: State, f: (p: Person) => boolean) => living(s).filter(p => !p.gast && f(p)).reduce((a, p) => a + kroppensMat(p, s.now), 0);
const narSvag = (s: State, p: Person) => svag(s, p) || living(s).some(q => svag(s, q) && (isParent(p, q) || isParent(q, p) || q.id === p.partner));
export const BUDGET: Record<string, BudgetDef> = {
  svaga: {
    namn: 'Mat till barn, gamla och sjuka', sym: '🍼', text: 'Mat ur byns förråd till barnen, de gamla och de sjuka som ligger',
    finns: s => living(s).some(p => !p.gast && svag(s, p)), saknar: () => ({}),
    mat: { vem: svag, behov: s => ater(s, p => svag(s, p)) },
    vill: (s, p) => narSvag(s, p) ? 1 : fjardedel(0.25 + 0.5 * Math.max(0, lutning(s, p))),
  },
  alla: {
    namn: 'Mat till alla', sym: '🍲', text: 'Mat ur byns förråd till alla i byn',
    finns: () => true, saknar: () => ({}),
    mat: { vem: () => true, behov: s => ater(s, () => true) },
    vill: (s, p) => fjardedel(0.5 + 0.5 * lutning(s, p)),
  },
  gastabud: {
    namn: 'Gästabud', sym: '🍖', text: 'Ett gästabud där alla äter ur byns förråd, det år delen fått nog med mat',
    finns: () => true, saknar: () => ({}),
    mat: { vem: s => !!s.budget?.fest, behov: s => Math.ceil(BUDG.fest * living(s).filter(p => !p.gast).length) },
    vill: (s, p) => fjardedel(0.25 + 0.25 * lutning(s, p) + (p === ledareOf(s) ? 0.25 : 0)),
  },
  byggen: {
    namn: 'Byns byggen', sym: '🏠', text: 'Material till byns hus: det de saknar för att bli klara och för att lagas',
    finns: s => bitsOf(s).some(b => bynsHus(s, b)), saknar: s => fran(s, {}, b => bynsHus(s, b)), bit: bynsHus,
    vill: (s, p) => fjardedel(0.5 + 0.5 * lutning(s, p)),
  },
  vagar: {
    namn: 'Vägar och bryggor', sym: '🛤️', text: 'Virke till byns vägar och bryggor',
    finns: s => bitsOf(s).some(b => vag(s, b)), saknar: s => fran(s, {}, b => vag(s, b)), bit: vag,
    vill: (s, p) => fjardedel(0.25 + 0.25 * lutning(s, p)),
  },
  kyrkan: {
    namn: 'Kyrkan', sym: '⛪', text: 'Det trons hus saknar, som lämnas över till kyrkan och blir kyrkans',
    finns: s => tronMedHus(s).length > 0,
    saknar: s => { const m: Record<string, number> = {}; for (const tr of tronMedHus(s)) for (const [k, n] of Object.entries(troshusSaknar(s, tr))) lagg(m, k, Math.floor(n)); return m; },
    // till den tro som saknar mest av materialet först
    ge: (s, k, n) => { let kvar = n; for (const tr of tronMedHus(s).sort((a, b) => (troshusSaknar(s, b)[k] ?? 0) - (troshusSaknar(s, a)[k] ?? 0) || a.id - b.id)) { const m = Math.min(kvar, Math.floor(troshusSaknar(s, tr)[k] ?? 0)); if (m >= 1) { kvar -= fromByn(s, k, m, kyrkaId(tr.id)); count(s, 'budgetKyrkan', m); } if (kvar < 1) break; } },
    vill: (s, p) => { const tr = (s.tron ?? []).find(t => t.id === p.tro); return tr && tronMedHus(s).includes(tr) ? fjardedel(0.5 + 0.5 * Math.max(0, s.seder.v.andlig ?? 0)) : 0; },
  },
  gavor: {
    namn: 'Gåvor till ledarens folk', sym: '🎁', text: 'Silver i gåva till dem som stöder ledaren',
    finns: s => !!ledareOf(s), saknar: s => { const n = stodjer(s).length * BUDG.gava; const m: Record<string, number> = {}; if (n > 0) m.silver = n; return m; },
    ge: (s, k, n) => {
      const l = ledareOf(s), ss = stodjer(s);
      if (!l || !ss.length) return;
      const per = Math.floor(n / ss.length);
      if (per < 1) return;
      for (const p of ss) { const m = fromByn(s, k, per, p.id); if (m >= 1) { const r = getRel(s, p, l); r.op = clamp(r.op + BUDG.gavaOp * m, -100, 100); count(s, 'budgetGava', m); } }
      log(s, `${l.name} gav ${ss.length === 1 ? ss[0].name : `${ss.length} av sitt folk`} ${per} ${sakNamn(k).toLowerCase()} var ur byns förråd.`, 'world', [l.id]);
    },
    vill: (s, p) => { const l = ledareOf(s); if (!l) return 0; return p === l ? 1 : stodjer(s).includes(p) ? 0.75 : 0; },
  },
};
export const BUDGET_LIST = Object.keys(BUDGET);
// lönen en del är skyldig, i hela silver (lon.ts sätter den)
export const budgetLonKrok: { f: (s: State, del: string) => number } = { f: () => 0 };
// varje del äger det den fått som en egen ägare i förrådet, långt under kyrkornas (kyrkaId)
export const budgetId = (id: string) => -1000000 - BUDGET_LIST.indexOf(id);
export const budgetNu = (s: State): BudgetDel[] => (lagGaller(s, 'skatt') && s.budget?.delar) || [];
export const delAv = (s: State, id: string) => budgetNu(s).find(d => d.id === id);
// procenten: viktens del av summan
export const budgetAndel = (s: State, id: string) => { const d = budgetNu(s), sum = d.reduce((a, x) => a + x.vikt, 0); return sum > 0 ? (delAv(s, id)?.vikt ?? 0) / sum : 0; };
// delen ett bygge hör till, om den finns i budgeten
export const budgetFor = (s: State, b?: Bit) => b && budgetNu(s).find(d => BUDGET[d.id].bit?.(s, b))?.id;
// det av slaget k som delen bygget hör till fått (lägg till det man får ta)
export const budgetAv = (s: State, b: Bit | undefined, k: string) => { const d = budgetFor(s, b); return d ? Math.floor(ownsId(s, budgetId(d), k) + 1e-9) : 0; };
// det ingen längre ska ha: delarna släpper det de fått, och det blir byns
const KVAR = -1000000 - 999; // maten ingen matdel fått ligger kvar till nästa år
export const budgetSlapp = (s: State) => { for (const id of BUDGET_LIST) releaseOwner(s, budgetId(id)); releaseOwner(s, KVAR); };
// matdelarna p får äta ur (budgetMatKrok i lager.ts)
const matFor = (s: State, p: Person) => budgetNu(s).filter(d => BUDGET[d.id].mat?.vem(s, p)).map(d => budgetId(d.id));

// fördelningen av n hela saker mellan delar med vikt w och tak (det de saknar): en i taget till den som har fått minst efter sin vikt
export function delaBudget(n: number, w: number[], tak: number[]) {
  const fick = w.map(() => 0);
  for (let kvar = Math.floor(n + 1e-9); kvar > 0; kvar--) {
    let b = -1, bv = Infinity;
    w.forEach((v, i) => { if (v > 0 && fick[i] < tak[i]) { const x = (fick[i] + 1) / v; if (x < bv - 1e-12) { bv = x; b = i; } } });
    if (b < 0) break;
    fick[b]++;
  }
  return fick;
}
// en gång per dygn (TAKTER, efter skatten): det förra året släpps, och varje material delas mellan delarna som saknar det
export function budgetDygn(s: State) {
  budgetSlapp(s);
  const delar = budgetNu(s).filter(d => d.vikt > 0 && !BUDGET[d.id].mat);
  // lönen delen är skyldig för årets timmar (steg 10.5.9, lon.ts) är silver den saknar
  const saknar = delar.map(d => { const m = BUDGET[d.id].saknar(s), l = budgetLonKrok.f(s, d.id); if (l >= 1) m.silver = (m.silver ?? 0) + l; return m; }), fick: Record<string, Record<string, number>> = {};
  const slag = [...new Set(saknar.flatMap(m => Object.keys(m)))].sort();
  for (const k of slag) {
    const byn = Math.floor(bynsAv(s, k) + 1e-9);
    if (byn < 1) continue;
    const f = delaBudget(byn, delar.map(d => d.vikt), saknar.map(m => Math.floor((m[k] ?? 0) + 1e-9)));
    delar.forEach((d, i) => {
      if (f[i] < 1) return;
      const def = BUDGET[d.id];
      if (def.ge) def.ge(s, k, f[i]); else fromByn(s, k, f[i], budgetId(d.id));
      (fick[d.id] ??= {})[k] = f[i];
      count(s, 'budgetVarde', f[i]);
    });
  }
  matDygn(s, fick);
  s.budget!.fick = fick;
}
// finns en matdel delas all mat i byns förråd mellan matdelarna efter vikterna, högst det delens folk äter på ett år; det ingen fått
// ligger kvar. Gästabudet hålls det år delen fått nog med mat
function matDygn(s: State, fick: Record<string, Record<string, number>>) {
  const b = s.budget!;
  b.fest = false;
  const delar = budgetNu(s).filter(d => BUDGET[d.id].mat);
  if (!delar.length) return;
  const kvar = delar.map(d => Math.ceil(BUDGET[d.id].mat!.behov(s) - 1e-9)), fore = [...kvar]; // i hela saker, så att det räcker
  for (const k of FOOD) {
    let byn = Math.floor(bynsAv(s, k) + 1e-9);
    if (byn < 1) continue;
    const f = delaBudget(byn, delar.map(d => d.vikt), kvar);
    delar.forEach((d, i) => { if (f[i] >= 1) { fromByn(s, k, f[i], budgetId(d.id)); (fick[d.id] ??= {})[k] = f[i]; kvar[i] -= f[i]; byn -= f[i]; } });
    if (byn >= 1) fromByn(s, k, byn, KVAR);
  }
  const g = delar.findIndex(d => d.id === 'gastabud');
  if (g >= 0 && fore[g] > 0 && kvar[g] <= 0) {
    b.fest = true; count(s, 'gastabud');
    for (const p of living(s)) if (!p.gast) { p.missnoje = clamp((p.missnoje ?? 0) - BUDG.festMiss, 0, 1); think(p, 'Åt på gästabudet', BUDG.festGlad, s.now, DAY / 4); }
    const t = 'Byn höll gästabud.'; log(s, t, 'world'); kronika(s, t, 'ledare');
  }
}
export const bynsAv = (s: State, k: string) => { let n = 0; for (const a of s.stackar ?? []) if (a.k === k) { let o = 0; for (const id in a.ag ?? {}) o += a.ag![id]; n += Math.max(0, a.n - o); } return n; };

// ---------- frågorna ----------
// den som får lägga fram föreslår en ny del när det den gäller finns i byn, eller en annan vikt, efter det hen själv vill
function budgetForslag(s: State, p: Person) {
  if (!lagGaller(s, 'skatt') || !knows(p, 'lag')) return [];
  return BUDGET_LIST.flatMap(id => {
    const def = BUDGET[id], d = delAv(s, id), vill = def.vill(s, p);
    if (!d) return def.finns(s) && vill > 0 ? [{ fr: { f: 'budget', d: { id, v: vill }, fram: p.id }, prio: vill * BUDG.prio, varfor: `${p.name} vill att budgeten ger till ${def.namn.toLowerCase()}` }] : [];
    const steg = Math.abs(vill - d.vikt) * 4;
    return steg >= 1 ? [{ fr: { f: 'budget', d: { id, v: vill }, fram: p.id }, prio: clamp(steg / 3, 0, 1), varfor: `${p.name} vill ändra budgetens del för ${def.namn.toLowerCase()}` }] : [];
  });
}
const procent = (s: State, id: string) => `${Math.round(budgetAndel(s, id) * 100)} %`;
// raderna i FRAGOR och TAS_UPP läggs till när allt är laddat (steg.ts)
export function budgetRegister() {
  TAS_UPP.push({ id: 'budget', lista: budgetForslag });
  budgetBortKrok.f = budgetBort;
  budgetMatKrok.f = (s, p) => s.budget ? matFor(s, p) : [];
  FRAGOR.budget = {
    namn: (s, d) => `Budgeten: ${BUDGET[d.id as string].namn} ${delAv(s, d.id as string) ? `vikten ${d.v}` : 'blir en del'}`, om: (_s, d) => BUDGET[d.id as string].text, krets: 'byn',
    // var och en röstar efter om den nya vikten ligger närmare det hen vill än den gamla
    rost: (s, p, d) => {
      const vill = BUDGET[d.id as string].vill(s, p), fore = delAv(s, d.id as string)?.vikt ?? 0, ny = d.v as number;
      const v = Math.abs(vill - fore) > Math.abs(vill - ny) + 1e-9 ? 0.5 : Math.abs(vill - fore) + 1e-9 < Math.abs(vill - ny) ? -0.5 : -0.05;
      return { v, why: v > 0 ? `Vill ge ${BUDGET[d.id as string].namn.toLowerCase()} vikten ${vill}` : 'Tycker att det är bra som det är' };
    },
    gor: (s, d, fram) => {
      const id = d.id as string, b = (s.budget ??= { delar: [] }), x = b.delar.find(q => q.id === id), ny = !x;
      if (x) x.vikt = d.v as number; else b.delar.push({ id, vikt: d.v as number });
      count(s, 'budget');
      const led = ledareOf(s), ensam = !!led && (vikter(s).find(v => v.p === led)?.andel ?? 0) > 0.5;
      const t = ny ? `${ensam ? `${led!.name} påbjöd` : 'Byn bestämde'} att budgeten ska ge till ${BUDGET[id].namn.toLowerCase()} (${procent(s, id)}).`
        : `${ensam ? `${led!.name} påbjöd en ändring av` : 'Byn ändrade'} budgetens del för ${BUDGET[id].namn.toLowerCase()} till ${procent(s, id)}.`;
      log(s, t, 'world', fram ? [fram.id] : []); kronika(s, t, 'ledare');
    },
  };
}
// skattelagen tas bort: budgeten försvinner med den
export function budgetBort(s: State) { budgetSlapp(s); delete s.budget; }
