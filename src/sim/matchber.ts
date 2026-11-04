// Berättelsen om en match (steg 5.4.8.2, Sporten i designdokumentet): några meningar högst upp i matchens sammanställning
// (ui/flikar/match.ts). Allt läses ur minnet som sparades när matchen avgjordes (MatchMinne i sport.ts), så att texten stämmer
// med sammanställningen: sporten och spelarna, hur jämnt det var (resultaten, färdigheten plus slumpen), om den svagare vann
// (färdigheten) och glädjen efteråt. Spelets mallar m_* i BERATTELSER skriver texten; varianten väljs ur matchens nummer,
// så att samma match alltid berättas likadant och ingen slump dras. Lagen och publiken kommer med 10.3.6
import type { State } from './typer';
import type { MatchMinne } from './sport';
import { SPORT_AV } from './sport';
import { MIN } from './typer';
import { balans } from './balans';
import { fyll, och, talOrd, valjVariant } from './berattelser';

export const MATCHBER = balans('matchber', {
  jamnt: 1.5, // skilde resultaten (färdigheten plus slumpen, 0 till ungefär 30) mellan de två bästa högst så här mycket var det jämnt ...
  overlagset: 6, // ... och minst så här mycket var det överlägset
  skrall: 3, // vann någon som hade minst så här mycket lägre färdighet (0–20) än den skickligaste var det oväntat
  lang: 70, kort: 35, // minuter: en lång och en kort match
});

export function matchBerattelse(s: State, m: MatchMinne): string {
  const d = SPORT_AV[m.k], sp = m.spelare;
  const bast = sp.reduce<typeof sp[number] | undefined>((a, x) => !a || x.f > a.f ? x : a, undefined);
  const res = sp.map(x => x.v).sort((a, b) => b - a), gap = res.length > 1 ? res[0]! - res[1]! : 0;
  const vinn = sp.find(x => x.id === m.vinnare), min = (m.slut - m.t) / MIN;
  const f = {
    sport: m.k, sportnamn: (d?.namn ?? 'match').toLowerCase(), spelare: och(sp.map(x => x.namn)), n: talOrd(sp.length), nTal: sp.length,
    vinnare: m.vnamn ?? '', bast: bast?.namn ?? '',
    jamnt: res.length > 1 && gap <= MATCHBER.jamnt, overlagset: gap >= MATCHBER.overlagset,
    skrall: !!vinn && !!bast && bast.f - vinn.f >= MATCHBER.skrall, favorit: !!vinn && vinn.id === bast?.id,
    lang: min >= MATCHBER.lang, kort: min < MATCHBER.kort, glad: m.glad > 0,
  };
  const mening = (mall: 'm_start' | 'm_lopp' | 'm_vinst' | 'm_slut' | 'm_installd', i: number) => fyll(valjVariant(s, mall, m.nr * 16 + i, f, 0), f);
  if (m.installd) return mening('m_installd', 0);
  return [mening('m_start', 0), mening('m_lopp', 1), mening('m_vinst', 2), mening('m_slut', 3)].join(' ');
}
