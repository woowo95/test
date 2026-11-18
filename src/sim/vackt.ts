// ---------- den väckta byn (fas 11.13, Flera samhällen: Den väckta byn i tal) ----------
// En by i världen som huvudbyns sällskap besöker väcks: byn byggs direkt ur radens tal av registret BYGGARE, där varje rad lägger
// en del av byn på plats, i registrets ordning. Allt dras ur byns frö och radens tal som de är när väckningen börjar, så att
// samma rad alltid ger samma by. Den väckta byn går sedan i samma slag som huvudbyn (s.vackta, steg 11.13.1)
import { balans } from './balans';
import { ageOf, newPerson, startSkills } from './folk';
import { byPlats } from './landmarken';
import { radNr, VarldRad } from './radtal';
import { startSmak } from './rykten';
import { newSeder, sederTarget } from './seder';
import { rnd } from './slump';
import { stepDelning } from './delning';
import { DAY, Person, State, useMap } from './typer';
import { pair, tomBy } from './varld';
import { varldMark } from './varlden';
import { MARK_IDS } from './varldmark';
import { KARTA } from './kartflytt';

export const VACKT = balans('vackt', {
  inkorning: 6, // timmar i verkligheten som byn går i simuleringen före ankomsten (ett kvarts år i spelet), steg 11.13.8
  parFran: 19, parTill: 52, // de vuxnas åldrar i ett hushåll (år i spelet)
  barnMax: 4, // så många barn som mest i ett hushåll
  modersAlder: 17, // modern är minst så mycket äldre än barnet
  ensam: 0.15, // chansen att ett hushåll är en ensam äldre
  aldreFran: 50, aldreTill: 72, // den ensammas ålder
});

// en byggare lägger en del av byn på plats: b = den väckta byn, s = huvudbyn, r = raden
export interface Byggare { namn: string; bygg: (b: State, s: State, r: VarldRad) => void }
export const BYGGARE: Byggare[] = [
  { namn: 'folket', bygg: (b, _s, r) => byggFolk(b, r) }, // radens antal, med åldrar, kön och släkt
];

// byns frö: ur huvudbyns frö och radens nummer, så att samma rad alltid får samma karta
export const vacktFro = (s: State, nr: number) => ((s.seed * 7919 + nr * 104729) % 2147483646) + 1;

// den tomma byn: marken ur byns frö och världsrutans marksort
export function vacktGrund(s: State, r: VarldRad): State {
  const vl = s.varld, v = varldMark(s), p = vl && byPlats(vl, r.nr);
  const mark = v && p ? MARK_IDS[v.mark[p.y * v.w + p.x]] : undefined;
  const b = tomBy(vacktFro(s, r.nr), r.grundad, s.now, { W: KARTA.bredd, H: KARTA.hojd }, { varld: vl, vackt: r.nr, ...(mark && mark !== 'hav' && mark !== 'sjo' ? { varldmark: mark } : {}) });
  b.seder = newSeder();
  return b;
}
// väck raden nr: byn byggs med alla rader i BYGGARE
export function vackBy(s: State, nr: number): State | undefined {
  const r = s.varld && radNr(s.varld, nr);
  if (!r) return undefined;
  const b = vacktGrund(s, r);
  for (const g of BYGGARE) { useMap(b); g.bygg(b, s, r); }
  useMap(b);
  b.seder.v = sederTarget(b);
  stepDelning(b);
  useMap(s);
  return b;
}

const mellan = (b: State, fran: number, till: number) => fran + rnd(b, 'vackt') * (till - fran);
const fodd = (b: State, alder: number) => b.now - alder * DAY;
// folket: hushåll efter hushåll tills raden är full. Ett hushåll är ett par med barn, eller ibland en ensam äldre
export function byggFolk(b: State, r: VarldRad) {
  const n = Math.max(1, Math.round(r.tal.folk));
  const ny = (sex: 'm' | 'k', alder: number, mor?: Person, far?: Person) => { const p = newPerson(b, sex, fodd(b, alder), mor, far); b.people.push(p); return p; };
  while (b.people.length < n) {
    const kvar = n - b.people.length;
    if (kvar === 1 || rnd(b, 'vackt') < VACKT.ensam) { ny(rnd(b, 'vackt') < 0.5 ? 'm' : 'k', mellan(b, VACKT.aldreFran, VACKT.aldreTill)); continue; }
    const ka = mellan(b, VACKT.parFran, VACKT.parTill), ma = Math.max(VACKT.parFran, ka + mellan(b, -3, 6));
    const k = ny('k', ka), m = ny('m', ma);
    pair(b, k, m, true);
    const barn = Math.min(n - b.people.length, Math.floor(rnd(b, 'vackt') * (VACKT.barnMax + 1)), Math.max(0, Math.floor(ka - VACKT.modersAlder)));
    for (let i = 0; i < barn; i++) ny(rnd(b, 'vackt') < 0.5 ? 'm' : 'k', mellan(b, 0, ka - VACKT.modersAlder), k, m);
  }
  for (const p of b.people) { startSkills(b, p, ageOf(p, b.now)); startSmak(b, p); }
}
