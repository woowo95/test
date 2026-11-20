// Rädslan för en handling (steg 8.4.10, fynd 512). En död eller en svår skada medan någon gjorde något gör de som såg det och
// de närmaste rädda för handlingen. Rädslan berättas vidare bland vännerna och blir svagare med tiden, och den som är rädd nog
// (efter modet) låter bli handlingen, utom i nöd (svält och kyla går före, val.ts). Raderna i RADD_AKT är handlingar som kan ta
// livet av någon och som man klarar sig utan. Byns dygn räknas i raden rädslan i TAKTER (steg.ts), också i en by utan ledare.
import { Act, Person, State } from './typer';
import { clamp, rnd } from './slump';
import { ALDER, REL, ageOf, living, relKey, satAktRadd, stat } from './folk';
import { balans } from './balans';

export const RADSLA = balans('radsla', {
  sett: 0.8, hort: 0.5, // rädslan för en handling hos den som såg olyckan och hos de närmaste
  radd: 0.3, // över det här räknas man som rädd för handlingen och berättar om den
  syn: 12, // så nära (rutor) ser man olyckan
  modMax: 1.5, modMin: 0.5, // den rädde låter bli handlingen efter rädslan gånger detta (modMax − mod/20, aldrig under modMin)
  sprid: 0.15, // chansen per dygn och god vän att en rädd berättar för hen, som blir så här mycket rädd ...
  spridV: 0.7, // ... gånger berättarens rädsla
  glom: 0.97, // rädslan för en handling blir så här mycket svagare per dygn (år i spelet)
  undvik: 0.35, // den som är så här rädd (efter modet) låter bli handlingen
});

export interface RaddAktDef { namn: string; acts: Act[] }
export const RADD_AKT: Record<string, RaddAktDef> = {
  bjornjakt: { namn: 'jaga björn', acts: ['bjornjakt'] },
  vargjakt: { namn: 'jaga varg', acts: ['vargjakt'] },
  bada: { namn: 'bada i sjön', acts: ['bada'] },
  sport: { namn: 'spela', acts: ['sport'] },
};
const aktRad = (act: Act | undefined) => Object.keys(RADD_AKT).find(k => !!act && RADD_AKT[k].acts.includes(act));
// offret dog eller skadades svårt medan hen gjorde act
export function raddForAkt(s: State, offer: Person, act: Act | undefined, om: string) {
  const k = aktRad(act);
  if (!k) return;
  for (const q of living(s)) {
    if (q === offer) continue;
    const sag = Math.hypot(q.x - offer.x, q.y - offer.y) < RADSLA.syn, nara = offer.partner === q.id || offer.mother === q.id || offer.father === q.id || q.mother === offer.id || q.father === offer.id;
    if (!sag && !nara) continue;
    const r = (q.raddAkt ??= {});
    r[k] = Math.max(r[k] ?? 0, sag ? RADSLA.sett : RADSLA.hort);
    (s.aktOm ??= {})[k] = om;
  }
}
// den som är rädd nog för handlingen (rädslan gånger hur lite mod hen har) låter bli den
export function raddFor(s: State, p: Person, act: Act): string | undefined {
  if (!p.raddAkt) return undefined;
  for (const k in RADD_AKT) {
    if (!RADD_AKT[k].acts.includes(act)) continue;
    const v = p.raddAkt[k] ?? 0;
    if (v * clamp(RADSLA.modMax - stat(p, 'mod', s.now) / 20, RADSLA.modMin, RADSLA.modMax) > RADSLA.undvik) return RADD_AKT[k].namn;
  }
  return undefined;
}
// en gång per dygn (raden rädslan i TAKTER): de vuxnas rädsla berättas för goda vänner och blir svagare med tiden (steg 10.2.41:
// tabun, där en rädsla som många delade blev en regel för hela byn, är borta; var och ens rädslor finns kvar)
export function raddDygn(s: State) {
  const vuxna = living(s).filter(p => ageOf(p, s.now) >= ALDER.vuxen);
  for (const p of vuxna) {
    if (!p.raddAkt) continue;
    for (const k in p.raddAkt) {
      const v = p.raddAkt[k];
      p.raddAkt[k] = v * RADSLA.glom;
      if (v < RADSLA.radd) continue;
      for (const q of vuxna) if (q !== p && (s.rels[relKey(p.id, q.id)]?.op ?? 0) > REL.van && rnd(s, 'minne', p) < RADSLA.sprid) { const r = (q.raddAkt ??= {}); r[k] = Math.max(r[k] ?? 0, v * RADSLA.spridV); }
    }
    for (const k in p.raddAkt) if (p.raddAkt[k] < 0.05 || !RADD_AKT[k]) delete p.raddAkt[k];
    if (!Object.keys(p.raddAkt).length) p.raddAkt = undefined;
  }
}
// olyckorna anmäls genom folk.ts (satAktRadd), som inte kan importera den här filen
export function raddRegister() { satAktRadd((s, p, act, om) => raddForAkt(s, p, act, om)); }
