// ---------- nattlogi, stall och djurhandel (steg 14.1.12, Ekonomi och handel: Företagen, i fliken Människan) ----------
// Tre verksamheter som alla säljs vid disken (kassa.ts) men inte är saker i förrådet: raderna i VERKSAMHETER med en egen vara
// (egen). Nattlogit säljer en ledig bädd i företagets rum åt gästen som är trött av vägen. Stallet tar emot gästens riddjur vid
// krubban, och djuret får ett av ägarens foder. Djurhandeln säljer ägarens djur, så att ett par alltid är kvar: en bybos djur
// byter ägare, och gästen leder hem sitt. Ett företag lägger till en verksamhet som man startar ett nytt (bastaUtok i foretag.ts)
import { balans } from './balans';
import type { Person, State } from './typer';

import { count, living } from './folk';
import { BYN } from './egendom';
import { knows } from './teknik';
import { foretagOf, foretagRum, gastFlode, VERKSAMHETER, type Foretag } from './foretag';
import { foretagBord, isKlar, stationDef, stationerOf, stationRum, type Station } from './stationer';
import { grundvarde } from './varde';
import { iHelaForradet, ownsId, use } from './lager';
import { TAM_LIST, TAMDJUR, arHona, tamAlder, tamArt, tamdjurOf, type TamArtId, type Tamdjur } from './tamdjur';
import { radPaslag } from './priser';
import { gastRad } from './klaner';
import { skick } from './foretag';
import { FGAST } from './foretagsgast';

export const VERK = balans('verksamheter', {
  natt: 6, // en natt i en bädd är värd så många silver för den som är helt utmattad
  trott: 0.5, // så stor del av gästerna räknar man med är trötta
  stall: 5, // så många silver är det värt för gästen att djuret får foder och vila
  baddar: 4, // så många bäddar har ett nattlogi högst
  par: 2, // så många av en djurart behåller ägaren
  djurlust: 0.4, // det första djuret av sin sort är så mycket mer värt för den som inget har, gånger djurskötseln (full skicklighet)
  djurDygn: 0.05, // så ofta per dygn (år i spelet) köper man ett djur
});
// vad ett verksamhetens rum har: stationerna av sorten
const iRum = (s: State, f: Foretag, ok: (t: Station) => boolean, halv = false): Station[] => { const rum = foretagRum(s, f); return rum.length ? stationerOf(s).filter(t => ok(t) && (halv || isKlar(t)) && rum.includes(stationRum(s, t)!)) : []; };
const arBadd = (t: Station) => !!stationDef(t.k)?.sover, arKrubba = (t: Station) => !!stationDef(t.k)?.fahus;
// ---------- nattlogiet ----------
const mitt = (t: Station) => ({ x: t.x + 0.5, y: t.y + 0.5 });
const ligger = (p: Person, t: Station) => p.gast?.gor === 'sover' && Math.floor(p.gast.vx ?? -1) === t.x && Math.floor(p.gast.vy ?? -1) === t.y;
export const ledigaBaddar = (s: State, f: Foretag): Station[] => iRum(s, f, arBadd).filter(t => !s.people.some(p => ligger(p, t)));
const login = (s: State, v: string) => foretagOf(s).filter(f => f.verk.includes(v) && foretagRum(s, f).length);
const villBadd = (s: State, f: Foretag) => { const n = iRum(s, f, arBadd, true).length; return !n || n < VERK.baddar && n === iRum(s, f, arBadd).length && !ledigaBaddar(s, f).length; };
foretagBord.baddRum = s => { const f = login(s, 'nattlogi').find(q => villBadd(s, q)); return f && foretagRum(s, f)[0]; };
foretagBord.baddBrist = s => { const a = login(s, 'nattlogi'); return a.length ? a.filter(f => villBadd(s, f)).length / a.length : 0; };
// ---------- stallet och djurhandeln ----------
const utanKrubba = (s: State) => [...new Set([...login(s, 'stall'), ...login(s, 'djurhandel')])].filter(f => !iRum(s, f, arKrubba, true).length);
foretagBord.krubbaRum = s => utanKrubba(s).flatMap(f => foretagRum(s, f)); // stallföretagens rum utan krubba, i tur och ordning (steg 15.1.141)
foretagBord.krubbaBrist = s => { const a = login(s, 'stall').length + login(s, 'djurhandel').length; return a ? Math.min(1, utanKrubba(s).length / a) : 0; };
const FODER = TAMDJUR.hast.foder;
export const foderAv = (s: State, ag: number) => FODER.find(k => ownsId(s, ag, k) >= 1);
// djuren ägaren säljer av arten: vuxna, och ett par behålls
const agda = (s: State, ag: number, art: TamArtId): Tamdjur[] => tamdjurOf(s).filter(d => d.art === art && (d.agare ?? BYN) === ag);
export function tillSalu(s: State, ag: number, art: TamArtId): Tamdjur | undefined {
  const d = agda(s, ag, art), honor = d.filter(arHona).length;
  if (d.length <= VERK.par) return undefined;
  // ett par behålls: en hona säljs bara när det finns fler än en hona, och en hane bara när det finns fler än en hane
  return d.filter(q => tamAlder(s, q) >= tamArt(art).vuxen && (arHona(q) ? honor > 1 : d.length - honor > 1)).sort((a, b) => a.born - b.born || a.id - b.id)[0];
}
const arter = (s: State) => TAM_LIST.filter(a => tamdjurOf(s).some(d => d.art === a && tillSalu(s, d.agare ?? BYN, a) !== undefined));
// ---------- raderna ----------
VERKSAMHETER.nattlogi = {
  namn: 'Nattlogi', sym: '🛏️', rum: ['sovrum', 'sovsal'], sak: 'halmbadd',
  varor: s => living(s).some(p => knows(p, 'halmbadd')) ? ['natt'] : [],
  noje: (_s, p) => p.gast ? VERK.natt * (1 - p.rest) : 0, // byborna sover hemma
  snitt: () => VERK.natt * 0.5, grund: () => 0,
  perDygn: () => 0, gaster: (s, pris) => gastFlode.reduce((a, g) => a + g(s, pris), 0) * VERK.trott,
  kunnande: p => skick(p.skill.handel),
  egen: {
    har: (s, f) => ledigaBaddar(s, f).length ? ['natt'] : [],
    ge: (s, f, p) => {
      const t = ledigaBaddar(s, f)[0], g = p.gast;
      if (!t || !g) return;
      const m = mitt(t); g.gor = 'sover'; g.vx = m.x; g.vy = m.y; g.path = undefined; g.pk = undefined;
    },
  },
};
VERKSAMHETER.stall = {
  namn: 'Stall', sym: 'krubba', rum: 'fahus', sak: 'krubba',
  varor: s => living(s).some(p => knows(p, 'snickarbank')) && FODER.some(k => living(s).length && s.stackar?.some(a => a.k === k)) ? ['djurvard'] : [],
  noje: (_s, p) => p.gast?.riddjur ? VERK.stall : 0,
  snitt: () => VERK.stall, grund: () => grundvarde(FODER[0]),
  perDygn: () => 0, gaster: (s, pris) => gastFlode.reduce((a, g) => a + g(s, pris), 0) * FGAST.ridande, // samma andel som gästerna kommer med (steg 15.1.170)
  kunnande: p => skick((p.skill.skotsel + p.skill.handel) / 2),
  egen: {
    har: (s, f) => iHelaForradet(() => foderAv(s, f.ag)) ? ['djurvard'] : [],
    ge: (s, f, p) => { const k = foderAv(s, f.ag); if (k) use(s, undefined, k, 1, true, f.ag); if (p.gast) { p.gast.riddjur = undefined; p.gast.rodd = 1; } count(s, 'djurvard'); },
  },
};
VERKSAMHETER.djurhandel = {
  namn: 'Djurhandel', sym: 'radjur', rum: 'fahus', sak: 'krubba',
  varor: arter,
  noje: (s, p, k) => {
    const a = tamArt(k as TamArtId);
    if (p.gast) { const r = gastRad(s, p); return r && a.lev ? a.varde * Math.max(0, radPaslag(s, r, a.lev) - 1) : 0; } // det hembyn betalar mer
    return tamdjurOf(s).some(d => d.art === k && d.agare === p.id) ? 0 : a.varde * VERK.djurlust * p.skill.skotsel / 20;
  },
  snitt: k => tamArt(k as TamArtId).varde * VERK.djurlust * 0.25, grund: k => tamArt(k as TamArtId).varde,
  perDygn: (_s, p) => p.gast ? 0 : VERK.djurDygn,
  kunnande: p => skick((p.skill.skotsel + p.skill.handel) / 2),
  egen: {
    har: (s, f) => TAM_LIST.filter(a => tillSalu(s, f.ag, a)),
    ge: (s, f, p, k) => {
      const d = tillSalu(s, f.ag, k as TamArtId);
      if (!d) return;
      count(s, 'djurSalt');
      if (!p.gast) { d.agare = p.id; d.lojal = undefined; d.matad = undefined; return; }
      const lev = tamArt(d.art).lev; // gästen leder hem det
      s.tamdjur = (s.tamdjur ?? []).filter(q => q !== d);
      if (lev) (p.gast.kop ??= {})[lev] = (p.gast.kop[lev] ?? 0) + 1;
    },
  },
};
