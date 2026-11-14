import { State, Person } from './typer';
import { balans } from './balans';
import { clamp } from './slump';
import { count, living, log } from './folk';
import { kronika } from './historik';
import { type SkalaId, Tro, andlighet, skalaV, troNamn, troOf, rymsBud } from './religion';
import { FRAGOR, type FragaData } from './rost';
import { MATERIAL } from './byggnad';
import { knows } from './teknik';

// ---------- trons hus: planen (steg 10.3.18, "Trons hus" i fliken Samhället) ----------
// Det finns en sorts religiös byggnad, trons hus. Hur det ska se ut bestäms del för del i trons krets: varje rad i
// TROSHUS_DELAR är en fråga, och frågorna tas upp i radernas ordning. Den som talar för tron lägger fram det val hen själv
// röstar mest för, och rösten är andligheten och hur väl valet passar trons skalor (passar, −1 till 1). Ett nej vilar som
// andra förslag i trons krets (KYRKA.nedrostat), så nästa kväll läggs ett annat val fram. Planen sparas på tron (Tro.plan),
// och när alla frågor är besvarade är den klar. Husets namn är den första raden i TROSHUSNAMN som passar, som ledarens titel.
export const TROSHUS = balans('troshus', {
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
export const TROSHUSNAMN: { namn: string; passar(s: State, tr: Tro): boolean }[] = [
  { namn: 'Tempel', passar: (s, tr) => planDel(s, tr, 'vagg') === 'sten' }, // stenväggarna kommer i 10.10.7
  { namn: 'Kyrka', passar: (_s, tr) => sida0(tr, 'manga') < 0 && sida0(tr, 'prast') < 0 }, // en enda gud och präster
  { namn: 'Helgedom', passar: (_s, tr) => sida0(tr, 'natur') >= 0.4 }, // andarna i naturen
  { namn: 'Vé', passar: (s, tr) => planDel(s, tr, 'storlek') === 'trangt' }, // en liten helig inhägnad
  { namn: 'Hörg', passar: (_s, tr) => tr.plan?.gudabild === 'nej' && tr.plan?.bank === 'nej' }, // ett altare och inget mer
  { namn: 'Hov', passar: () => true },
];
export const troshusNamn = (s: State, tr: Tro) => TROSHUSNAMN.find(r => r.passar(s, tr))!.namn;
export const planText = (s: State, tr: Tro) => DELAR.filter(d => planDel(s, tr, d) !== undefined).map(d => TROSHUS_DELAR[d].text(planDel(s, tr, d)!)).join(', ');

// det den som talar för tron kan lägga fram: valen för nästa del, när tron har tyngden för det
export function troshusForslag(s: State, tr: Tro): FragaData[] {
  if (!rymsBud(s, tr, TROSHUS.storlek)) return [];
  const d = nastaDel(s, tr);
  return d ? TROSHUS_DELAR[d].val(s, tr).map(v => ({ tro: tr.id, del: d, v })) : [];
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
    const tr = troOf(s, d.tro as number)!;
    (tr.plan ??= {})[d.del as TrosDel] = d.v as string;
    count(s, 'troshus_plan');
    if (!planKlar(s, tr)) return;
    const t = `${troNamn(tr)} har bestämt hur trons hus ska se ut. Det blir ett hus som kallas ${troshusNamn(s, tr).toLowerCase()}: ${planText(s, tr)}.`;
    log(s, t, 'rel', []); kronika(s, t, 'tro'); count(s, 'troshus_klar');
  },
}; }
