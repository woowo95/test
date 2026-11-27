// ---------- kundernas val och konkurrensen (steg 14.1.9, Ekonomi och handel: Företagen, i fliken Människan) ----------
// Kunden väljer det företag som är bäst för just hen (kundVal i kassa.ts): nyttan och kvaliteten mot priset, vägen, kön och rummets
// finhet mot det hen väntar sig (forvantan.ts). Företag som liknar varandra delar därför kunderna. En gång per dygn ändrar ägaren
// priset efter dem som köpt och dem som ville men avstod, och den vars kunder väntat sig ett finare rum gör det finare (mattan)
import type { Person, State } from './typer';
import { balans } from './balans';
import { clamp } from './slump';
import { tycker, fragat } from './kassa';
import { dygnet, type Foretag, foretagare, foretagOf, foretagRum, VERKSAMHETER } from './foretag';
import { finhetAv } from './rum';
import { foretagBord } from './stationer';
import { FORVANTAN } from './forvantan';

export const KONKURRENS = balans('konkurrens', {
  finhet: 8, // en hel finhet över det kunden väntar sig är värd så många silver när hen äter eller dricker där
  over: 0.25, // det som är finare än man väntar sig är värt så mycket av det som är enklare
  hylla: 0.3, // i affären är man bara så länge: finheten väger så mycket mindre
  steg: 0.15, // så mycket ändras priset på ett dygn (ett år i spelet) när alla köper eller ingen gör det
  min: 0.4, max: 4, // priset hålls inom detta gånger det vanliga
  gatt: 1, // den som gick ur kön vägs som så många köp: fler ville än som hanns med
  lust: 2, // ett rum en hel finhet enklare än kunderna väntat sig ger ägaren så mycket lust att göra det finare
  minst: 0.05, // en skillnad mindre än så här märks inte
});
export const foretagFinhet = (s: State, f: Foretag, v: string): number | undefined => {
  let b: number | undefined;
  for (const r of foretagRum(s, f)) { const x = finhetAv(s, r); if (x !== undefined && (b === undefined || x > b)) b = x; }
  return b === undefined || !VERKSAMHETER[v] ? undefined : b;
};
export const overForvantan = (s: State, p: Person, f: Foretag, v: string) => { const x = foretagFinhet(s, f, v); return x === undefined ? 0 : x - (p.finForv ?? FORVANTAN.grund); };
tycker.push((s, p, f, v) => (d => d > 0 ? d * KONKURRENS.over : d)(overForvantan(s, p, f, v)) * KONKURRENS.finhet * (VERKSAMHETER[v].hylla ? KONKURRENS.hylla : 1));
// dagens kunder: den som avstod, och hur fint hen väntat sig att det var
fragat.push((s, p, f, v, valde) => {
  const d = (f.dag ??= {})[v] ??= {}, i = d.nej?.indexOf(p.id) ?? -1;
  if (valde) { if (i >= 0) d.nej!.splice(i, 1); } else if (i < 0) (d.nej ??= []).push(p.id);
  const g = f.gap ??= { n: 0, v: 0, vem: [] };
  if (!g.vem.includes(p.id)) { g.vem.push(p.id); g.n++; g.v += Math.max(0, -overForvantan(s, p, f, v)); }
});
// en gång per dygn: priset och det ägaren vill göra finare
dygnet.push(s => {
  for (const f of foretagOf(s)) {
    for (const v in f.dag) {
      const d = f.dag[v], ja = (d.salt ?? 0) + (d.gatt ?? 0) * KONKURRENS.gatt, nej = d.nej?.length ?? 0;
      if (ja + nej > 0) (f.pris ??= {})[v] = clamp((f.pris[v] ?? 1) * (1 + KONKURRENS.steg * (ja - nej) / (ja + nej)), KONKURRENS.min, KONKURRENS.max);
    }
    f.dag = undefined;
    f.enkelt = f.gap ? f.gap.v / Math.max(1, f.gap.n) : undefined; // ingen som avstod för att rummet var för enkelt: ingen brist
    f.gap = undefined;
  }
});
// ägaren gör rummet finare när kunderna väntat sig det (mattan i stationer.ts)
foretagBord.finare = (s, p) => {
  if (!s.foretag?.length) return undefined;
  const f = s.foretag.find(q => (q.enkelt ?? 0) >= KONKURRENS.minst && foretagare(s, q.ag) === p), r = f && foretagRum(s, f)[0];
  return r && { r, lust: Math.min(1, f!.enkelt! * KONKURRENS.lust) };
};
