// Notiserna om hälsan (steg 9.5.31, Hälsosystemet i detalj: Notiserna om hälsan). Registret HALSOTECKEN har en rad per tecken: ett
// värde som läses ur kroppen varje timme och jämförs med det förra. När ett tecken blir sämre ett steg (blodet sjunker ett
// steg, ett sår börjar blöda igen, någon svimmar, en infektion börjar, ett ben bryts eller läker snett, en del huggs av) blir
// det en notis med vem, vad och vad som behövs. Bättre blir det en notis bara när faran är över (blödningen stoppad,
// infektionen borta) och när benet satts. Feber och kallbrand (infektion), att tiden kvar är kort (blodning) och sjukdomarna
// (sjuk) har sina notiser där de händer. Värdena sparas i p.hn varje timme, så levande läge och snabbläget ger samma notiser.
import { State, Person } from './typer';
import { KROPPSDELAR, VARD, VARD_LIST, blodSteg, blodning, tidKvar, HALSA } from './halsa';
import { living } from './folk';
import { notis } from './notiser';
import { gen } from './ord';

type Del = keyof typeof KROPPSDELAR;
interface TeckenDef {
  notis: string; // raden i NOTISER (notiser.ts)
  varde(s: State, p: Person): number;
  // texten när värdet gått från fran till till, eller undefined när det inte blir någon notis (behov = vad som behövs)
  text(p: Person, fran: number, till: number, behov: string): string | undefined;
}
// blöder så att det märks: hen förblöder inom HALSA.blodsTim timmar
const blods = (p: Person) => blodning(p) > 0 && tidKvar(p) < HALSA.blodsTim;
const delNamn = (d: Del) => KROPPSDELAR[d].namn.toLowerCase();
const BLOD_TEXT = ['', 'är blek och yr', 'orkar inte slåss', 'kan bara krypa']; // som BLODSTEG i halsa.ts
const behovText = (b: string) => b ? ` Behöver: ${b}.` : '';

export const HALSOTECKEN: Record<string, TeckenDef> = {
  blodsteg: { notis: 'blodsteg', varde: (_s, p) => blodSteg(p),
    text: (p, f, t, b) => t > f && t < 4 ? `${p.name} ${BLOD_TEXT[t]} av blodförlusten.${behovText(b)}` : undefined },
  blods: { notis: 'blodigen', varde: (_s, p) => blods(p) ? 1 : 0,
    text: (p, f, t, b) => t > f && (p.hnBlodat ?? 0) > 0 ? `${gen(p.name)} sår blöder igen.${behovText(b)}` : undefined },
  stoppad: { notis: 'blodstopp', varde: (_s, p) => blods(p) ? 1 : 0,
    text: (p, f, t) => t < f ? `Blödningen hos ${p.name} har stoppats.` : undefined },
  svimmat: { notis: 'svimmat', varde: (_s, p) => p.svimmat ? 1 : 0,
    text: (p, f, t, b) => t > f ? `${p.name} har svimmat och ligger medvetslös.${behovText(b)}` : undefined },
  infektion: { notis: 'infborjar', varde: (_s, p) => (p.skador ?? []).filter(w => w.inf !== undefined).length,
    text: (p, f, t, b) => t > f ? `${gen(p.name)} sår har blivit rött och varmt: en infektion har börjat.${behovText(b)}` : undefined },
  infborta: { notis: 'infborta', varde: (_s, p) => (p.skador ?? []).filter(w => w.inf !== undefined).length,
    text: (p, f, t) => t < f && t === 0 ? `Infektionen hos ${p.name} är borta.` : undefined },
  benbrott: { notis: 'benbrott', varde: (_s, p) => (p.skador ?? []).filter(w => w.k === 'benbrott').length,
    text: (p, f, t, b) => { const w = t > f ? [...(p.skador ?? [])].reverse().find(x => x.k === 'benbrott') : undefined; return w ? `${p.name} har brutit ${delNamn(w.d)}.${behovText(b)}` : undefined; } },
  satt: { notis: 'bensatt', varde: (_s, p) => (p.skador ?? []).filter(w => w.k === 'benbrott' && w.satt).length,
    text: (p, f, t) => t > f ? `Benbrottet hos ${p.name} är satt.` : undefined },
  snett: { notis: 'snett', varde: (_s, p) => (p.skador ?? []).filter(w => w.k === 'benbrott' && w.snett).length,
    text: (p, f, t) => t > f ? `Benbrottet hos ${p.name} sattes inte i tid och läker snett.` : undefined },
  avhuggen: { notis: 'avhuggen', varde: (_s, p) => p.saknas?.length ?? 0,
    text: (p, f, t) => t > f && p.saknas ? `${p.name} har förlorat ${delNamn(p.saknas[p.saknas.length - 1] as Del)}.` : undefined },
};
export const HALSOTECKEN_LIST = Object.keys(HALSOTECKEN);

// det q behöver nu, som behandlingarnas namn (VARD i halsa.ts): utan att fråga vem som kan göra det
export function behovNu(s: State, q: Person) {
  const ut: string[] = [];
  for (const k of VARD_LIST) if ((q.skador ?? []).some(w => VARD[k].krav(s, q, w, q)) && !ut.includes(VARD[k].namn.toLowerCase())) ut.push(VARD[k].namn.toLowerCase());
  return ut.slice(0, 3).join(', ');
}

// varje timme (steg.ts): tecknen jämförs med förra timmen, och en notis skickas för det som ändrats
export function halsoNotiser(s: State) {
  for (const p of living(s)) {
    const fore = p.hn, nu: Record<string, number> = {};
    for (const k of HALSOTECKEN_LIST) nu[k] = HALSOTECKEN[k].varde(s, p);
    let behov: string | undefined;
    for (const k of HALSOTECKEN_LIST) {
      if ((fore?.[k] ?? 0) === nu[k]) continue;
      const t = HALSOTECKEN[k].text(p, fore?.[k] ?? 0, nu[k], behov ??= behovNu(s, p));
      if (t) notis(s, HALSOTECKEN[k].notis, t, [p.id], { x: Math.floor(p.x), y: Math.floor(p.y) });
    }
    if (nu.blods) p.hnBlodat = 1; else if (!p.skador?.length) p.hnBlodat = undefined;
    p.hn = HALSOTECKEN_LIST.every(k => !nu[k]) ? undefined : nu; // inget sparas för den som är frisk
  }
}
