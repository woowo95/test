// ---------- företagens rykte (steg 14.1.10, Ekonomi och handel: Gästerna och ryktet, i fliken Människan) ----------
// Varje besök ger ett omdöme (OMDOME: en rad per del). Det är kundens eget, och hen går hellre dit hen var nöjd (kundVal i
// kassa.ts). I samtalen berättar man om det man varit mest nöjd eller missnöjd med, och den som reser eller går hem till sin by
// berättar där. Företagets rykte i byn är medlet av allas omdömen, och i en grannby det som kommit dit
import type { Person, State } from './typer';
import { balans } from './balans';
import { clamp } from './slump';
import { count, getRel, living } from './folk';
import { KASSA, omdome, tycker } from './kassa';
import { dygnet, type Foretag, foretagOf } from './foretag';
import { overForvantan } from './konkurrens';
import { motkrok } from './resa';
import { hemkrok } from './gast';
import { klanById } from './klaner';
import { tillit } from './minne';
import { samtalskrok } from './samtal';

export const FRYKTE = balans('foretagsrykte', {
  kvalitet: 1, pris: 1, finhet: 1, vantan: 0.6, // så mycket väger delarna i omdömet
  prisVantat: 0.4, // kunden väntar sig att så stor del av det hen får är vinst
  finSkala: 2, // en halv finhet över eller under förväntan är ett helt omdöme
  utan: -0.5, // den som gick utan att få något
  nytt: 0.5, // så mycket väger ett nytt besök mot det man tyckt förut
  drar: 0.5, // ett helt gott omdöme är värt så många silver när man väljer (en måltid ger kunden ungefär så mycket)
  samtal: 0.25, // i ett samtal kommer den som lyssnar så mycket närmare det hen hör, gånger tilliten ...
  egna: 1, // ... mindre för den som varit där själv: varje eget besök väger så mycket mot det hen hör
  minst: 0.1, // ett svagare omdöme än så berättas inte
  by: 0.3, // i grannbyn kommer ryktet så mycket närmare det de hör, för varje person som berättar
  glom: 0.04, // omdömena bleknar så mycket på ett dygn (ett år i spelet)
});
// delarna i ett omdöme, var och en från −1 till 1
export interface Besok { s: State; p: Person; f: Foretag; v: string; far: number; net: number; kv: number; vantat: number }
export const OMDOME: Record<'kvalitet' | 'pris' | 'finhet' | 'vantan', { namn: string; del: (b: Besok) => number }> = {
  kvalitet: { namn: 'kvaliteten', del: b => clamp((b.kv - 1) * 2, -1, 1) },
  pris: { namn: 'priset mot det man väntat sig', del: b => b.far > 0 ? clamp((b.net / b.far - FRYKTE.prisVantat) * 2, -1, 1) : 0 },
  finhet: { namn: 'finheten mot det man väntat sig', del: b => clamp(overForvantan(b.s, b.p, b.f, b.v) * FRYKTE.finSkala, -1, 1) },
  vantan: { namn: 'hur länge man väntade', del: b => clamp(1 - 2 * b.vantat / KASSA.tal, -1, 1) },
};
export const omdomeAv = (b: Besok) => {
  let v = 0, w = 0;
  for (const k of Object.keys(OMDOME) as (keyof typeof OMDOME)[]) { v += OMDOME[k].del(b) * FRYKTE[k]; w += FRYKTE[k]; }
  return w ? v / w : 0;
};
// v = omdömet (−1 till 1), n = egna besök (0: bara hört)
const satt = (p: Person, f: Foretag, v: number, del: number, eget: number) => {
  const o = p.omd?.[f.id];
  (p.omd ??= {})[f.id] = { v: o ? o.v + (v - o.v) * del : v * (eget ? 1 : del), n: (o?.n ?? 0) + eget };
};
omdome.push((s, p, f, b) => {
  const v = b ? omdomeAv({ s, p, f, ...b }) : FRYKTE.utan;
  satt(p, f, v, FRYKTE.nytt, 1);
  count(s, v >= 0 ? 'omdomeGott' : 'omdomeDaligt');
});
tycker.push((_s, p, f) => (p.omd?.[f.id]?.v ?? 0) * FRYKTE.drar);
// i ett samtal berättar a om det företag hen är mest nöjd eller missnöjd med; den som varit där själv ändrar sig mindre
export function berattaForetag(s: State, a: Person, b: Person) {
  if (!a.omd || !s.foretag?.length) return;
  let bast: Foretag | undefined, bv = FRYKTE.minst;
  for (const f of s.foretag) { const v = Math.abs(a.omd[f.id]?.v ?? 0); if (v > bv && f.ag !== b.id) { bv = v; bast = f; } }
  if (!bast) return;
  const del = FRYKTE.samtal * tillit(a, b, getRel(s, a, b)) / (1 + (b.omd?.[bast.id]?.n ?? 0) * FRYKTE.egna);
  satt(b, bast, a.omd[bast.id].v, del, 0);
  count(s, 'omdomeBerattat');
}
samtalskrok.push(berattaForetag);
// grannbyn (radens nr) hör vad den som varit i företagen tycker
export function byHor(s: State, nr: number, p: Person) {
  for (const f of foretagOf(s)) {
    const o = p.omd?.[f.id];
    if (!o || Math.abs(o.v) < FRYKTE.minst) continue;
    const r = (f.byar ??= {})[nr] ??= { v: 0 };
    r.v += (o.v - r.v) * FRYKTE.by;
    count(s, 'omdomeGrannby');
  }
}
motkrok.push((s, nr, folk) => { for (const p of folk) byHor(s, nr, p); });
hemkrok.push((s, g) => { const nr = klanById(s, g.gast?.klan)?.rad; if (nr !== undefined) byHor(s, nr, g); });
// företagets rykte i byn: medlet av omdömena, där den som varit där själv väger mer; undefined = ingen har sagt något
export function ryktet(s: State, f: Foretag): number | undefined {
  let v = 0, w = 0;
  for (const p of living(s)) { const o = p.omd?.[f.id]; if (o) { const g = 1 + Math.min(4, o.n); v += o.v * g; w += g; } }
  return w ? v / w : undefined;
}
// ryktet i grannbyn med numret nr (för gästerna därifrån)
export const ryktetI = (f: Foretag, nr: number) => f.byar?.[nr]?.v ?? 0;
// omdömena bleknar, och det om företag som stängt glöms
dygnet.push(s => {
  if (!s.foretag) return;
  const finns = new Set(s.foretag.map(f => f.id));
  for (const p of living(s)) for (const k in p.omd) { if (!finns.has(+k)) delete p.omd[+k]; else p.omd[+k].v *= 1 - FRYKTE.glom; }
  for (const f of s.foretag) for (const nr in f.byar) f.byar[+nr].v *= 1 - FRYKTE.glom;
});
// det som syns i husets ruta
export const ryktesOrd = (v: number | undefined) => v === undefined ? 'okänt' : v > 0.4 ? 'mycket gott' : v > 0.1 ? 'gott' : v > -0.1 ? 'varken gott eller dåligt' : v > -0.4 ? 'dåligt' : 'mycket dåligt';
