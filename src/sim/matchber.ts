// Berättelsen om en match (steg 5.4.8.2, Sporten i designdokumentet): några meningar högst upp i matchens sammanställning
// (ui/flikar/match.ts). Allt läses ur minnet som sparades när matchen avgjordes (MatchMinne i sport.ts), så att texten stämmer
// med sammanställningen: sporten och spelarna, hur jämnt det var (resultaten, färdigheten plus slumpen), om den svagare vann
// (färdigheten) och glädjen efteråt. Spelets mallar m_* i BERATTELSER skriver texten; varianten väljs ur matchens nummer,
// så att samma match alltid berättas likadant och ingen slump dras. Lagen (steg 10.7.14) och publiken (steg 10.7.16, en mening när någon tittade) står med
import type { State } from './typer';
import type { MatchMinne } from './sport';
import { SPORT, SPORT_AV } from './sport';
import { bestamd, gen, sinOrd } from './ord';
import { SAKER } from './saker';
import { isLight, kalender } from './tid';
const ARSTID_SNO = (s: State, t: number) => kalender(s, t).ai === 0;
import { MIN } from './typer';
import { balans } from './balans';
import { fyll, och, talOrd, valjVariant } from './berattelser';

export const MATCHBER = balans('matchber', {
  jamnt: 1.5, // skilde resultaten (färdigheten plus slumpen, 0 till ungefär 30) mellan de två bästa högst så här mycket var det jämnt ...
  overlagset: 6, // ... och minst så här mycket var det överlägset
  skrall: 3, // vann någon som hade minst så här mycket lägre färdighet (0–20) än den skickligaste var det oväntat
  lang: 17, kort: 12, // minuter: en lång och en kort match
});

export function matchBerattelse(s: State, m: MatchMinne): string {
  const d = SPORT_AV[m.k], sp = m.spelare;
  const bast = sp.reduce<typeof sp[number] | undefined>((a, x) => !a || x.f > a.f ? x : a, undefined);
  const res = sp.map(x => x.v).sort((a, b) => b - a), gap = res.length > 1 ? res[0]! - res[1]! : 0;
  const vinn = sp.find(x => x.id === m.vinnare), min = (m.slut - m.t) / MIN;
  // i en lagsport (steg 10.7.14) jämförs lagen: summan av färdigheten och av resultaten, och vinnaren är hela laget
  const lag = m.vinnLag !== undefined ? ([0, 1] as const).map(l => sp.filter(x => x.l === l)) : undefined;
  const sum = (l: typeof sp, k: 'f' | 'v') => l.reduce((a, x) => a + x[k], 0), laget = (l: typeof sp) => `laget med ${och(l.map(x => x.namn))}`;
  const vl = lag?.[m.vinnLag!], fl = lag?.[1 - m.vinnLag!];
  const fore = (s.matcher ?? []).filter(x => x.nr < m.nr && !x.installd); // matcherna före den här (steg 15.1.116)
  const f = {
    sport: m.k, sportnamn: (d?.namn ?? 'match').toLowerCase(), spelare: och(sp.map(x => x.namn)), n: talOrd(sp.length),
    ...(vl && fl ? {
      vinnare: laget(vl), bast: laget(fl), jamnt: Math.abs(sum(vl, 'v') - sum(fl, 'v')) <= MATCHBER.jamnt, overlagset: sum(vl, 'v') - sum(fl, 'v') >= MATCHBER.overlagset,
      skrall: sum(fl, 'f') - sum(vl, 'f') >= MATCHBER.skrall, favorit: sum(vl, 'f') >= sum(fl, 'f'),
    } : {
      vinnare: m.vnamn ?? '', bast: bast?.namn ?? '',
      jamnt: res.length > 1 && gap <= MATCHBER.jamnt, overlagset: gap >= MATCHBER.overlagset,
      skrall: !!vinn && !!bast && bast.f - vinn.f >= MATCHBER.skrall, favorit: !!vinn && vinn.id === bast?.id,
    }),
    publik: och((m.publik ?? []).map(x => x.namn)), nPub: m.publik?.length ?? 0,
    pris: m.pris?.sak ?? '', givare: m.pris?.avNamn ?? '', fick: m.pris?.fickNamn ?? '', prisKvar: m.pris?.fick !== undefined, sjalv: m.pris?.fick === m.pris?.av,
    lang: min >= MATCHBER.lang, kort: min < MATCHBER.kort, glad: m.glad > 0,
    // steg 15.1.116: lagen, genitivet och sakens genus i priset, tvåan, mörkret och om det hänt förut
    lag: !!vl, slagen: vl ? 'slaget' : 'slagen', givares: gen(m.pris?.avNamn ?? ''), ficks: gen(m.pris?.fickNamn ?? ''),
    sin: sinOrd({ ett: !!(m.pris && SAKER[m.pris.k as keyof typeof SAKER]?.ett) }), den: m.pris ? bestamd(m.pris.sak, SAKER[m.pris.k as keyof typeof SAKER]?.ett)[1] : 'den',
    tvaan: vl ? undefined : sp.filter(x => x.id !== m.vinnare).sort((a, b) => b.v - a.v)[0]?.namn, morkt: isLight(m.t) && !isLight(m.slut),
    igen: !vl && !!fore.length && fore[fore.length - 1].k === m.k && fore[fore.length - 1].vinnare === m.vinnare && m.vinnare !== undefined,
    forstaVinst: !vl && m.vinnare !== undefined && (s.matcher?.length ?? 0) < SPORT.sparas && !fore.some(x => x.vinnare === m.vinnare),
    forsta: (s.matcher?.length ?? 0) < SPORT.sparas && !fore.some(x => x.k === m.k),
    sno: ARSTID_SNO(s, m.t), // snön på marken när matchen spelades: istiden (steg 15.1.118)
  };
  const mening = (mall: 'm_start' | 'm_lopp' | 'm_vinst' | 'm_slut' | 'm_installd' | 'm_publik' | 'm_pris', i: number) => fyll(valjVariant(s, mall, m.nr * 16 + i, f, 0), f);
  if (m.installd) return mening('m_installd', 0);
  return [mening('m_start', 0), mening('m_lopp', 1), ...(m.publik?.length ? [mening('m_publik', 4)] : []), mening('m_vinst', 2), ...(m.pris ? [mening('m_pris', 5)] : []), mening('m_slut', 3)].join(' ');
}
