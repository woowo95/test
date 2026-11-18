// ---------- liven bakåt i den väckta byn (steg 11.13.16, Flera samhällen: Den väckta byn i tal) ----------
// Varje invånare i en väckt by får ett liv bakom sig, som gästerna (gastliv.ts), med registret LIVSHANDELSER i rollen bybo. Skillnaden
// är att släkten finns på riktigt: föräldrarna, syskonen, partnern och barnen som bor i byn är de som står i livet, när de föddes
// och när paret gifte sig. Den vars föräldrar inte finns i byn har förlorat dem: de har ett namn, dog vid en ålder ur fröet, och
// dog de efter att byn grundades ligger de begravda på byns gravplats. Byns historik i världens krönika (grundandet, svälten,
// farsoten, krigen, de nya ledarna) står i livet hos dem som levde då. Allt räknas ur byns frö och personens id med hash3, utan
// spelets slump, så att samma rad ger samma liv
import { ageOf, byId, childrenOf, relKey } from './folk';
import { gastLiv, type LivRad, type Slakting } from './gastliv';
import { gravarOf, gravPlats } from './grav';
import { hash3 } from './slump';
import { DAY, Person, State } from './typer';
import type { VarldRad } from './radtal';
import { varldHandelseText, VARLDSHANDELSER, type VarldHandelse } from './varldkronika';

// livet före besöket: släktingarna som inte finns i byn (de döda föräldrarna) och händelserna, äldst först
export interface ForrLiv { familj: Slakting[]; liv: LivRad[] }
export const VACKTLIV = {
  minns: 6, // från den åldern står byns händelser i livet (år)
  gift: 18, // tidigast då gifte man sig (år)
};
const tal = (b: State, id: number, n: number) => hash3(b.seed, id, n, 0x2c1b3c6d, 13);
const ar = (p: Person, t: number) => Math.max(0, Math.floor((t - p.born) / DAY));
const radNamn = (b: State, nr?: number) => b.varld?.rader?.find(r => r.nr === nr)?.namn ?? 'en by';

// när paret gifte sig: före det första barnet, och tidigast när båda var vuxna
export function giftNar(b: State, p: Person, q: Person): number {
  const barn = [...childrenOf(b, p), ...childrenOf(b, q)].map(c => c.born), forst = barn.length ? Math.min(...barn) : undefined;
  const hi = forst !== undefined ? forst - DAY : b.now, lo = Math.min(Math.max(p.born, q.born) + VACKTLIV.gift * DAY, hi);
  return Math.floor(lo + tal(b, Math.min(p.id, q.id), 1) * (hi - lo));
}
// byns händelser i världens krönika, som de står i livet hos den som levde då
function byHandelse(vl: NonNullable<State['varld']>, r: VarldRad, h: VarldHandelse, fodd: boolean): string | undefined {
  if (h.by !== r.nr && h.mot !== r.nr) return undefined;
  const by = r.namn;
  switch (h.k) {
    case 'grundad': return fodd ? undefined : `Var med och grundade ${by}`;
    case 'delad': return h.mot === r.nr ? (fodd ? undefined : `Lämnade ${radNamnV(vl, h.by)} och var med och grundade ${by}`) : `Såg en grupp lämna ${by} och grunda ${radNamnV(vl, h.mot)}`;
    case 'svalt': return `Klarade svälten i ${by}`;
    case 'farsot': return `Överlevde farsoten som gick genom ${by}`;
    case 'krig': case 'fred': case 'forbund': case 'nyLedare': case 'gattUnder': return varldHandelseText(vl, h);
    default: return VARLDSHANDELSER[h.k].stor ? varldHandelseText(vl, h) : undefined;
  }
}
const radNamnV = (vl: NonNullable<State['varld']>, nr?: number) => vl.rader?.find(r => r.nr === nr)?.namn ?? 'en by';

// ett liv för personen p i den väckta byn b ur raden r
export function bybosLiv(b: State, r: VarldRad, p: Person): ForrLiv {
  const A = Math.floor(ageOf(p, b.now)), by = r.namn, vl = b.varld;
  const gl = gastLiv(b.seed, p.id * 7919 + r.nr, p.name, p.sex, 'bybo', by, by, p.born, b.now);
  const liv: LivRad[] = gl.liv.filter(l => l.k !== 'fodd').map(l => ({ ...l }));
  const familj: Slakting[] = [];
  const fodd = p.born >= r.grundad;
  liv.push({ ar: 0, k: 'fodd', text: fodd ? `Föddes i ${by}` : r.fran !== undefined ? `Föddes i ${radNamn(b, r.fran)}` : 'Föddes långt härifrån' });
  if (!fodd && !vl?.kronika?.some(h => h.k === 'grundad' && h.by === r.nr || h.k === 'delad' && h.mot === r.nr)) liv.push({ ar: ar(p, r.grundad), k: 'kom', text: `Kom till ${by}` });
  // föräldrarna: den som finns i byn lever; de andra har dött, med namnen ur livet
  for (const [roll, id] of [['mor', p.mother], ['far', p.father]] as const) {
    if (byId(b, id)) continue;
    const f = gl.familj.find(x => x.roll === roll)!, dog = A <= 0 ? 0 : Math.max(1, Math.floor(A * (0.25 + 0.75 * tal(b, p.id, roll === 'mor' ? 2 : 3))));
    familj.push({ ...f, dog });
    liv.push({ ar: dog, k: 'foralder', text: `Förlorade ${roll === 'mor' ? 'sin mor' : 'sin far'}, ${f.namn}` });
    const t = p.born + dog * DAY;
    if (t >= r.grundad && t <= b.now && !gravarOf(b).some(g => g.namn === f.namn)) { const g = gravPlats(b, undefined); gravarOf(b).push({ x: g.x, y: g.y, t, vem: 0, namn: f.namn, stil: 'jord' }); } // (vem 0 är ingen person)
  }
  // syskonen, partnern och barnen som bor i byn
  const mor = byId(b, p.mother);
  if (mor) for (const q of childrenOf(b, mor)) if (q.id !== p.id && q.born > p.born) liv.push({ ar: ar(p, q.born), k: 'syskon', text: `Fick ${q.sex === 'k' ? 'en lillasyster' : 'en lillebror'}, ${q.name}` });
  const pa = byId(b, p.partner);
  const rp = pa && b.rels[relKey(p.id, pa.id)];
  if (pa && rp?.gift === undefined && rp?.par !== undefined) liv.push({ ar: ar(p, rp.par), k: 'par', text: `Blev tillsammans med ${pa.name}` }); // ett par som inte gift sig än (vacktrel.ts)
  else if (pa) liv.push({ ar: ar(p, giftNar(b, p, pa)), k: 'gift', text: `Gifte sig med ${pa.name}` });
  for (const c of childrenOf(b, p)) liv.push({ ar: ar(p, c.born), k: 'barn', text: `Fick ${c.sex === 'k' ? 'en dotter' : 'en son'}, ${c.name}` });
  // byns historik
  for (const h of vl?.kronika ?? []) {
    if (h.t < p.born || h.t > b.now || ar(p, h.t) < VACKTLIV.minns && h.k !== 'grundad' && h.k !== 'delad') continue;
    const text = byHandelse(vl!, r, h, fodd);
    if (text) liv.push({ ar: ar(p, h.t), k: h.k, text });
  }
  liv.sort((a, c) => a.ar - c.ar || +(c.k === 'fodd') - +(a.k === 'fodd'));
  return { familj, liv: liv.filter(l => l.ar <= A) };
}
// byggaren: alla som inte redan har ett liv (de fasta som sparats med hela personen har sitt)
export function byggLiven(b: State, r: VarldRad) {
  for (const p of b.people) if (!p.forr && ageOf(p, b.now) >= 0) p.forr = bybosLiv(b, r, p);
}
