import { State, Person } from './typer';
import { balans } from './balans';
import { clamp } from './slump';
import { ALDER, ageOf, count, living, log } from './folk';
import { kronika } from './historik';
import { type SkalaId, Tro, andlighet, skalaV, troNamn, troOf, rymsBud } from './religion';
import { FRAGOR, type FragaData } from './rost';
import { MATERIAL, bitsOf, gridOf, housesOf, type Hus } from './byggnad';
import { needOf } from './bygg';
import { STATIONER, type StationDef } from './stationer';
import { kyrkaId } from './egendom';
import { ownsId } from './lager';
import { knows } from './teknik';
import { isKlar, stationerOf, vidStation, type Station } from './stationer';

// ---------- trons hus: planen (steg 10.3.18, "Trons hus" i fliken Samhället) ----------
// Det finns en sorts religiös byggnad, trons hus. Hur det ska se ut bestäms del för del i trons krets: varje rad i
// TROSHUS_DELAR är en fråga, och frågorna tas upp i radernas ordning. Den som talar för tron lägger fram det val hen själv
// röstar mest för, och rösten är andligheten och hur väl valet passar trons skalor (passar, −1 till 1). Ett nej vilar som
// andra förslag i trons krets (KYRKA.nedrostat), så nästa kväll läggs ett annat val fram. Planen sparas på tron (Tro.plan),
// och när alla frågor är besvarade är den klar. Husets namn är den första raden i TROSHUSNAMN som passar, som ledarens titel.
export const TROSHUS = balans('troshus', {
  minRutor: 8, maxRutor: 72, // husets golvrutor efter storleken: minst och högst
  bankPer: 6, // en bänk per så många golvrutor
  altarTing: 3, // så många heliga ting rymmer altaret (steg 10.3.20)
  storlek: 2, // trons tyngd som behövs innan planen tas upp (som ett bud av den storleken)
  bas: 0.15, // rösten för en del av planen utan skalorna, vid andligheten 50
  skala: 0.3, // hur mycket skalorna väger i rösten
});
export type TrosDel = 'storlek' | 'form' | 'vagg' | 'altare' | 'gudabild' | 'bank';
export type TrosPlan = Partial<Record<TrosDel, string>>;
// skalans värde åt sidan 0 (Natur, Många, Var och en, Fest …): 1 vid 0, −1 vid 100, 0 när skalan inte finns än
const sida0 = (tr: Tro, k: SkalaId) => { const v = skalaV(tr, k); return v === undefined ? 0 : (50 - v) / 50; };
// möblerna: ja eller nej, där ja passar trons skalor med f
const mobel = (namn: string, f: (tr: Tro) => number) => ({
  namn, val: () => ['ja', 'nej'], text: (v: string) => v === 'ja' ? `med ${namn.toLowerCase()}` : `utan ${namn.toLowerCase()}`,
  passar: (_s: State, tr: Tro, v: string) => (v === 'ja' ? 1 : -1) * f(tr),
});
// de slags väggar ett nytt hus kan få (de gamla, som risväggen, lagas bara): de som byns folk kan bygga
export const vaggSorter = (s: State) => Object.keys(MATERIAL).filter(k => { const m = MATERIAL[k]; return m.k === 'vagg' && !m.gammal && (!m.tek || living(s).some(p => knows(p, m.tek!))); });
export interface TrosDelDef {
  namn: string;
  val(s: State, tr: Tro): string[]; // valen, i den ordning de läggs fram vid lika röst
  text(v: string): string; // hur valet låter i frågan och planen
  passar(s: State, tr: Tro, v: string): number; // −1 till 1: hur väl valet passar trons skalor
  fragas?(s: State, tr: Tro): boolean; // frågan ställs bara när den är en fråga (annars sjalv)
  sjalv?(s: State, tr: Tro): string | undefined; // valet när frågan inte ställs
}
export const STORLEKAR: Record<string, { namn: string; per: number }> = {
  trangt: { namn: 'trångt', per: 0.5 }, // golvrutor per vuxen troende
  lagom: { namn: 'lagom', per: 1 },
  rymligt: { namn: 'rymligt', per: 2 },
};
export const TROSHUS_DELAR: Record<TrosDel, TrosDelDef> = {
  // Fest vill ha rymligt, Försakelse trångt
  storlek: { namn: 'Storleken', val: () => Object.keys(STORLEKAR), text: v => STORLEKAR[v]?.namn ?? v, passar: (_s, tr, v) => { const mal = 1 + sida0(tr, 'fest'), i = Object.keys(STORLEKAR).indexOf(v); return 1 - Math.abs(i - mal); } },
  // prästerna vill ha ett avlångt hus med altaret längst in, var och en ett kvadratiskt där alla står runt
  form: { namn: 'Formen', val: () => ['kvadrat', 'avlang'], text: v => v === 'avlang' ? 'avlångt' : 'kvadratiskt', passar: (_s, tr, v) => (v === 'kvadrat' ? 1 : -1) * sida0(tr, 'prast') },
  // väggarna: Människa vill ha det som håller längst, Natur det som slits fortast tillbaka
  vagg: {
    namn: 'Väggarna', val: s => vaggSorter(s), text: v => MATERIAL[v]?.namn.toLowerCase() ?? v,
    passar: (s, tr, v) => { const ks = vaggSorter(s).sort((a, b) => MATERIAL[a].slit - MATERIAL[b].slit), i = ks.indexOf(v); return ks.length > 1 ? -sida0(tr, 'natur') * (1 - 2 * i / (ks.length - 1)) : 0; },
    fragas: s => vaggSorter(s).length > 1, sjalv: s => vaggSorter(s)[0] ?? 'timmer',
  },
  // altaret är det huset står kring: det läggs bara fram som ja
  altare: { ...mobel('Altare', () => 1), val: () => ['ja'] },
  gudabild: mobel('Gudabild', tr => sida0(tr, 'manga')), // många gudar vill ha bilder av dem
  bank: mobel('Bänk', tr => -sida0(tr, 'prast')), // prästerna talar och de troende sitter
};
const DELAR = Object.keys(TROSHUS_DELAR) as TrosDel[];
// den del som frågas härnäst, och om planen är klar
export const nastaDel = (s: State, tr: Tro) => DELAR.find(d => tr.plan?.[d] === undefined && (TROSHUS_DELAR[d].fragas?.(s, tr) ?? true));
export const planKlar = (s: State, tr: Tro) => !!tr.plan && !nastaDel(s, tr);
// delens val i planen, också det som inte frågades
export const planDel = (s: State, tr: Tro, d: TrosDel) => tr.plan?.[d] ?? TROSHUS_DELAR[d].sjalv?.(s, tr);
// husets namn (som ledarens titel, TITLAR i styre.ts): den första raden som passar
export const TROSHUSNAMN: { namn: string; bestamd: string; passar(s: State, tr: Tro): boolean }[] = [
  { namn: 'Tempel', bestamd: 'Templet', passar: (s, tr) => planDel(s, tr, 'vagg') === 'sten' }, // stenväggarna kommer i 10.10.7
  { namn: 'Kyrka', bestamd: 'Kyrkan', passar: (_s, tr) => sida0(tr, 'manga') < 0 && sida0(tr, 'prast') < 0 }, // en enda gud och präster
  { namn: 'Helgedom', bestamd: 'Helgedomen', passar: (_s, tr) => sida0(tr, 'natur') >= 0.4 }, // andarna i naturen
  { namn: 'Vé', bestamd: 'Vét', passar: (s, tr) => planDel(s, tr, 'storlek') === 'trangt' }, // en liten helig inhägnad
  { namn: 'Hörg', bestamd: 'Hörgen', passar: (_s, tr) => tr.plan?.gudabild === 'nej' && tr.plan?.bank === 'nej' }, // ett altare och inget mer
  { namn: 'Hov', bestamd: 'Hovet', passar: () => true },
];
export const troshusNamn = (s: State, tr: Tro) => TROSHUSNAMN.find(r => r.passar(s, tr))!.namn;
export const troshusBestamd = (s: State, tr: Tro) => TROSHUSNAMN.find(r => r.passar(s, tr))!.bestamd;
export const planText = (s: State, tr: Tro) => DELAR.filter(d => planDel(s, tr, d) !== undefined).map(d => TROSHUS_DELAR[d].text(planDel(s, tr, d)!)).join(', ');

// det den som talar för tron kan lägga fram: valen för nästa del, när tron har tyngden för det
export function troshusForslag(s: State, tr: Tro): FragaData[] {
  if (!rymsBud(s, tr, TROSHUS.storlek)) return [];
  const d = nastaDel(s, tr);
  if (d) return TROSHUS_DELAR[d].val(s, tr).map(v => ({ tro: tr.id, del: d, v }));
  return igenDelar(s, tr).flatMap(i => TROSHUS_DELAR[i].val(s, tr).filter(v => i === 'storlek' || v !== tr.plan?.[i]).map(v => ({ tro: tr.id, del: i, v })));
}
// trons hus växer (steg 10.3.21): när planen är klar och huset står kan frågorna tas upp igen. Storleken när de vuxna troende blivit
// fler än husets golvrutor (och fler än när storleken avgjordes), en möbel som fått nej när skalan bakom den bytt sida eller huset blivit större
const ja = (s: State, tr: Tro, d: TrosDel) => Math.sign(TROSHUS_DELAR[d].passar(s, tr, 'ja'));
export function igenDelar(s: State, tr: Tro): TrosDel[] {
  if (!planKlar(s, tr) || !troshusAv(s, tr).some(h => h.klar)) return [];
  const golv = troshusGolv(s, tr), n = vuxnaTroende(s, tr).length, ut: TrosDel[] = [];
  if (n > golv && n > (tr.planVuxna ?? 0) && (tr.planRutor ?? 0) <= golv) ut.push('storlek');
  for (const d of ['gudabild', 'bank'] as TrosDel[]) { const nej = tr.planNej?.[d]; if (tr.plan?.[d] === 'nej' && nej && (ja(s, tr, d) !== nej.pa || golv > nej.golv)) ut.push(d); }
  return ut;
}
// frågan i trons krets läggs i FRAGOR när registren byggs (kyrkaRegister), så att importerna hunnit bli klara
export function troshusRegister() { FRAGOR.troshus = {
  namn: (s, d) => { const tr = troOf(s, d.tro as number)!, del = TROSHUS_DELAR[d.del as TrosDel]; return `${troNamn(tr)}: trons hus ${del.text(d.v as string)}`; },
  om: (_s, d) => `${TROSHUS_DELAR[d.del as TrosDel].namn} i planen för trons hus`,
  krets: 'tro',
  rost: (s: State, p: Person, d: FragaData) => {
    const tr = troOf(s, d.tro as number);
    if (!tr) return { v: 0, why: '' };
    const pa = clamp(TROSHUS_DELAR[d.del as TrosDel].passar(s, tr, d.v as string), -1, 1);
    return { v: TROSHUS.bas + (andlighet(s, p) - 50) / 100 + TROSHUS.skala * pa, why: pa > 0.2 ? 'Passar tron' : pa < -0.2 ? 'Passar inte tron' : 'Tycker att det är rätt för tron' };
  },
  gor: (s, d) => {
    const tr = troOf(s, d.tro as number)!, del = d.del as TrosDel, forut = planKlar(s, tr);
    (tr.plan ??= {})[del] = d.v as string;
    if (del === 'storlek') { tr.planRutor = planRutor(s, tr, d.v as string); tr.planVuxna = vuxnaTroende(s, tr).length; } // golvrutorna efter de troende när frågan avgörs
    if (d.v === 'nej') (tr.planNej ??= {})[del] = { pa: ja(s, tr, del), golv: troshusGolv(s, tr) }; else if (tr.planNej) delete tr.planNej[del];
    count(s, 'troshus_plan');
    if (forut) { const t = `${troNamn(tr)} ändrade planen för ${troshusBestamd(s, tr).toLowerCase()}: ${TROSHUS_DELAR[del].text(d.v as string)}${del === 'storlek' ? `, ${tr.planRutor} golvrutor` : ''}.`; log(s, t, 'rel', []); kronika(s, t, 'tro'); count(s, 'troshus_igen'); return; }
    if (!planKlar(s, tr)) return;
    const t = `${troNamn(tr)} har bestämt hur trons hus ska se ut. Det blir ett hus som kallas ${troshusNamn(s, tr).toLowerCase()}: ${planText(s, tr)}.`;
    log(s, t, 'rel', []); kronika(s, t, 'tro'); count(s, 'troshus_klar');
  },
}; }

// golvrutorna som planen vill ha: en halv, en eller två per vuxen troende, minst minRutor och högst maxRutor
export const vuxnaTroende = (s: State, tr: Tro) => living(s).filter(p => p.tro === tr.id && ageOf(p, s.now) >= ALDER.vuxen);
export const planRutor = (s: State, tr: Tro, storlek: string) => clamp(Math.ceil(vuxnaTroende(s, tr).length * (STORLEKAR[storlek]?.per ?? 1)), TROSHUS.minRutor, TROSHUS.maxRutor);

// ---------- trons hus byggs (steg 10.3.19) ----------
// Huset är ett hus i byggsystemet med Hus.tro. Bara de troende bygger det, och allt material tas ur kyrkans egendom (bygg.ts).
// Möblerna är stationer med flaggan tro (stationer.ts: altare, gudabild, trosbank) som står i husets rum, och huset är klart
// när väggarna och altaret står. Då hålls högtiden och den ledda bönen vid altaret (kult.ts).
export const troshusAv = (s: State, tr: Tro): Hus[] => housesOf(s).filter(h => h.tro === tr.id);
export const golvAv = (h: Hus) => Math.max(0, h.w - 2) * Math.max(0, h.h - 2);
export const troshusGolv = (s: State, tr: Tro) => troshusAv(s, tr).reduce((n, h) => n + golvAv(h), 0);
// rummet i trons första färdiga hus
export const troshusRum = (s: State, tr: Tro) => { const h = troshusAv(s, tr).find(q => q.klar); return h && gridOf(s).rooms.find(r => r.hus === h.id); };
export const trosMobler = (s: State, tr: Tro, k: string): Station[] => stationerOf(s).filter(t => t.tro === tr.id && t.k === k);
// så många av möbeln k som planen vill ha
export function trosVill(s: State, tr: Tro, k: string) {
  if (!planKlar(s, tr)) return 0;
  if (k === 'altare') return tr.plan?.altare === 'ja' ? 1 : 0;
  if (k === 'gudabild') return tr.plan?.gudabild === 'ja' ? 1 : 0;
  if (k === 'trosbank') return tr.plan?.bank === 'ja' ? Math.max(1, Math.floor(troshusGolv(s, tr) / TROSHUS.bankPer)) : 0;
  return 0;
}
// hur stor del av möblerna av sorten k trons färdiga hus saknar (0 när väggarna inte står)
export function trosMobelBrist(s: State, tr: Tro, k: string) {
  if (tr.slut !== undefined || !troshusRum(s, tr)) return 0;
  const vill = trosVill(s, tr, k);
  return vill > 0 ? Math.max(0, vill - trosMobler(s, tr, k).length) / vill : 0;
}
export const altaret = (s: State, tr: Tro) => trosMobler(s, tr, 'altare').find(isKlar);
export const troshusKlart = (s: State, tr: Tro) => !!troshusRum(s, tr) && !!altaret(s, tr);
// där man står vid högtiden och den ledda bönen: framför altaret när huset är klart
export const troshusPlats = (s: State, tr: Tro) => { const t = troshusKlart(s, tr) ? altaret(s, tr) : undefined; return t && vidStation(t); };
// det trons hus saknar, utöver det kyrkan redan äger: materialet till väggarna och golven som inte är byggda och till möblerna
// planen vill ha. Gåvorna till tron går helst dit (offerTimme i kyrka.ts)
export function troshusSaknar(s: State, tr: Tro): Record<string, number> {
  const vill: Record<string, number> = {}, hus = new Set(troshusAv(s, tr).map(h => h.id));
  for (const b of bitsOf(s)) { const it = MATERIAL[b.m]?.item; if (it && b.hus !== undefined && hus.has(b.hus) && b.b < 1) vill[it] = (vill[it] ?? 0) + needOf(b); }
  for (const k of ['altare', 'gudabild', 'trosbank']) {
    const d: StationDef = (STATIONER as Record<string, StationDef>)[k], n = Math.max(0, trosVill(s, tr, k) - trosMobler(s, tr, k).length);
    if (n > 0 && troshusAv(s, tr).length) for (const [m, v] of Object.entries(d.av)) vill[m] = (vill[m] ?? 0) + v * n;
  }
  for (const k in vill) { vill[k] -= ownsId(s, kyrkaId(tr.id), k); if (vill[k] < 1) delete vill[k]; }
  return vill;
}
