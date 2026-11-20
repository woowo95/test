import { han } from './ord';
// ---------- tatueringarna (steg 10.7.5, Porträttens byggsätt: Tatueringar) ----------
// En vuxen som varit med om något stort kan få ett mönster i pannan, på kinden eller på halsen. Motiven är rader i registret
// TATUERINGAR: händelsen, platsen och seden som drar. När händelsen fastnat hos en vuxen vill hen ha märket, starkast de första
// dygnen, och lusten är TATU.bas + TATU.sed gånger byns värde i motivets sed. En annan vuxen gör det med en bennål (fynd 502), och
// väljer arbetet som andra arbeten, där färdigheten hantverk väger. Tatueringen ger inget annat än att den syns i porträttet och
// står i personens berättelse
import { ALDER, ageOf, alive, count, forstaGang, gjort, living, log, ovning } from './folk';
import { balans } from './balans';
import { DAY, MIN, Person, State } from './typer';
import type { Sed } from './seder';
import { getable } from './behov';
import { personHand } from './personlogg';
import { rnd } from './slump';
import { tatKrok } from './uppvaxt';

export type TatPlats = 'panna' | 'kind' | 'hals';
export interface TatDef { namn: string; plats: TatPlats; sed: Sed; text: string }
// platsens ord: i pannan (bestämd form) och i hens panna (obestämd form)
export const TAT_PLATSORD: Record<TatPlats, { best: string; obest: string }> = { panna: { best: 'pannan', obest: 'panna' }, kind: { best: 'kinden', obest: 'kind' }, hals: { best: 'halsen', obest: 'hals' } };
export const TATUERINGAR = {
  vuxen: { namn: 'Vuxenblivandet', plats: 'kind', sed: 'andlig', text: 'blev vuxen' },
  jakt: { namn: 'Jakten', plats: 'panna', sed: 'natur', text: 'fällde ett stort djur' },
  strid: { namn: 'Striden', plats: 'panna', sed: 'krig', text: 'dödade någon' },
  sorg: { namn: 'Sorgen', plats: 'hals', sed: 'gemenskap', text: 'miste någon nära' },
} satisfies Record<string, TatDef>;
export type TatMotiv = keyof typeof TATUERINGAR;
const DEF: Record<TatMotiv, TatDef> = TATUERINGAR;
// stilarna: fyra formfamiljer. Byn får sin ur byns frö och en klan sin ur klanens nummer
export const TAT_STILAR = ['linjer', 'prickar', 'flator', 'djur'] as const;
export type TatStil = typeof TAT_STILAR[number];
export const TAT_STILNAMN: Record<TatStil, string> = { linjer: 'linjer', prickar: 'prickar', flator: 'flätor', djur: 'djurtecken' };
export const byStil = (s: State): TatStil => TAT_STILAR[Math.abs(s.seed) % TAT_STILAR.length];

export const TATU = balans('tatuering', {
  bas: 0.3, sed: 0.7, // lusten att märka en händelse: bas + sed × byns värde i motivets sed
  dygn: 3, // lusten är starkast så här många dygn (år i spelet) efter händelsen ...
  sen: 0.3, // ... och sedan så här stor
  chans: 0.15, // chansen att den som kan välja arbetet gör det, gånger lusten och hantverket
  hantverk: 0.5, // så mycket väger färdigheten: 1 - hantverk + hantverk × hantverk / 10
  min: 4, // arbetstiden i minuter (Arbetstider: en liten sak)
  radie: 8, // så långt bort går den som tatuerar
  ovning: 0.02,
});

// en händelse som kan märkas (upplevelsen fastnade hos en vuxen, eller hen gick igenom vuxenblivandet)
export const UPP_MOTIV: Partial<Record<string, TatMotiv>> = { fallde: 'jakt', dodade: 'strid', foralder: 'sorg', syskon: 'sorg', barnDod: 'sorg' };
export function tatHandelse(s: State, p: Person, m: TatMotiv) {
  if (ageOf(p, s.now) < ALDER.vuxen || lust(s, m) <= 0) return;
  if (p.tat?.some(t => t.p === DEF[m].plats) || p.tatV?.some(v => DEF[v.m].plats === DEF[m].plats)) return; // en plats rymmer en; den som kommer först tar den
  (p.tatV ??= []).push({ m, t: s.now });
}
tatKrok.upplev = (s, p, k) => { const m = UPP_MOTIV[k]; if (m) tatHandelse(s, p, m); };
tatKrok.vuxen = (s, p) => tatHandelse(s, p, 'vuxen');
const lust = (s: State, m: TatMotiv) => TATU.bas + TATU.sed * (s.seder.v[DEF[m].sed] ?? 0);
// hur gärna p vill ha märket för händelsen v nu
export function tatLust(s: State, v: { m: TatMotiv; t: number }) {
  const l = lust(s, v.m);
  return l <= 0 ? 0 : l * (s.now - v.t < TATU.dygn * DAY ? 1 : TATU.sen);
}
// den som g kan tatuera: en vuxen i byn nära g som vill ha ett märke och som ingen annan redan tatuerar. Den som vill mest först
export function tatVal(s: State, g: Person) {
  if (ageOf(g, s.now) < ALDER.vuxen || getable(s, g, 'nal') < 1) return undefined;
  let bast: { q: Person; v: { m: TatMotiv; t: number }; l: number } | undefined;
  for (const q of living(s)) {
    if (q === g || !q.tatV?.length || q.gast || Math.hypot(q.x - g.x, q.y - g.y) > TATU.radie) continue;
    if (living(s).some(o => o !== g && o.task?.act === 'tatuera' && o.task.ref === q.id)) continue;
    for (const v of q.tatV) { const l = tatLust(s, v); if (l > (bast?.l ?? 0)) bast = { q, v, l }; }
  }
  if (!bast) return undefined;
  const h = 1 - TATU.hantverk + TATU.hantverk * g.skill.hantverk / 10;
  if (rnd(s, 'val', g) >= TATU.chans * bast.l * h) return undefined;
  return { q: bast.q, m: bast.v.m, dur: TATU.min * MIN };
}
// när arbetet är klart: den som tatueras får märket, om hen är kvar intill
export function tatKlar(s: State, g: Person, ref?: number) {
  const q = living(s).find(o => o.id === ref);
  if (!q || !alive(q) || Math.hypot(q.x - g.x, q.y - g.y) > 1.5) { count(s, 'tatueringMiste'); return; }
  const i = (q.tatV ?? []).reduce((b, v, j, a) => tatLust(s, v) > tatLust(s, a[b]) ? j : b, 0), v = q.tatV?.[i];
  if (!v) return;
  q.tatV!.splice(i, 1); if (!q.tatV!.length) delete q.tatV;
  const d = DEF[v.m], stil = byStil(s);
  (q.tat ??= []).push({ m: v.m, p: d.plats, stil, t: s.now, av: g.id });
  ovning(g, 'hantverk', TATU.ovning); gjort(s, g, 'tatuerat'); count(s, 'tatuering'); count(s, 'tatuering_' + v.m);
  personHand(s, q, 'markt', `Fick ett märke i ${TAT_PLATSORD[d.plats].best} av ${g.name}, ${TAT_STILNAMN[stil]}, efter att ${han(q)} ${d.text}.`);
  if (forstaGang(s, 'forstaTatuering')) log(s, `${g.name} gjorde byns första tatuering: ${TAT_STILNAMN[stil]} i ${gen(q.name)} ${TAT_PLATSORD[d.plats].obest}, för att ${han(q)} ${d.text}.`, 'world', [g.id, q.id]);
}
const gen = (n: string) => /s$/.test(n) ? n : n + 's';
// tatueringarnas delar i porträttet (PORTRATT: tat-<stil>-<plats>)
export const tatDel = (p: Person, plats: TatPlats) => { const t = p.tat?.find(x => x.p === plats); return t ? `tat-${t.stil}-${plats}` : null; };
