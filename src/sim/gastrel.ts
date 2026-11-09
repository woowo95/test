// Gästernas relationer (steg 4.5.7.11, "Handlaren och relationen" i designdokumentet): handlaren har en relation till varje
// bybo hen handlat med, sparad hos hen i grannklanen (KlanPerson.rel), så att den finns kvar när hen kommer igen. Hur gärna
// hen går med på ett bud räknas med samma delar som vänskapen i ett samtal (samtal.ts): kemin mellan dem, hur lika de är,
// värmen hos båda och hur charmig och vacker bybon är, och dessutom det de varit med om: bytena gör relationen lite bättre, och
// den som märkt att den andra lurat hen minns det. Ett bud som är alldeles för dåligt irriterar handlaren mot bybon, så att
// nästa bud blir svårare. Irritationen varar besöket, och en liten del finns kvar när samma handlare kommer igen. Kemin och
// handlarens egenskaper räknas ur byns frö och gästens nyckel (som livet i gastliv.ts), så att ingen slump dras.
// Bybons relationsflik visar handlarna under "Utanför byn", och handlarens sida visar byborna (ui/flikar/person.ts)
import { hp } from './gast';
import type { Person, Stat, State } from './typer';
import { balans } from './balans';
import { count, stat } from './folk';
import { SAMTAL } from './samtal';
import { clamp, hash3 } from './slump';
import { gastNyckel } from './gastliv';
import { KlanPerson, klanById } from './klaner';
import type { Handlare } from './handel';

export const GASTREL = balans('gastrel', {
  ut: 0.5, // hur mycket samtalsdelarna (kemi, likhet, värme, charm; ungefär −1 till 1,5) väger i hur mycket handlaren gillar bybon ...
  krav: 0.1, // ... och handlaren kräver upp till så här stor del mindre (eller mer) för det hen ger, när hen gillar bybon helt (eller inte alls)
  illa: 0.7, // ett bud som är värt mindre än så här stor del av det handlaren kräver är alldeles för dåligt (det första budet är
  // HANDEL.forstaBud av det hen ger, så det irriterar bara den som inte gillar bybon och kräver mer) ...
  irr: 0.2, // ... och irriterar hen så här mycket (irritationen dras av från hur mycket hen gillar bybon, högst 1)
  kvar: 0.25, // så stor del av irritationen finns kvar när handlaren går hem
  byteOp: 2, // ett byte gör relationen så här mycket bättre (−100 till 100, som mellan två bybor)
  luradOp: 25, // den som märkt att den andra lurat hen tycker så här mycket sämre om hen
});

// en relation mellan en gäst och en bybo: chem = kemin (−1 till 1), op = vad de tycker om varandra (−100 till 100), irr =
// handlarens irritation mot bybon (0 till 1), n = så många affärer de gjort, lurad = gånger bybon märkt att handlaren lurat hen,
// lurat = gånger handlaren märkt att bybon lurat hen
export interface GastRel { chem: number; op: number; irr: number; n: number; lurad?: number; lurat?: number }

const tal = (s: State, nyckel: number, n: number) => hash3(s.seed, nyckel, n, 0x6c8e9cf5, 23);
// handlarens egenskaper (1–20) som relationen frågar efter, ur fröet och nyckeln: samma person har samma egenskaper varje gång
export const gastStat = (s: State, nyckel: number, k: Stat) => 4 + Math.floor(tal(s, nyckel, k.length * 31 + k.charCodeAt(0)) * 13);
const LIKHET: Stat[] = ['nyfikenhet', 'flit', 'empati', 'mod'];

// personen i grannklanen som är handlaren (där relationerna sparas)
export const handlarPerson = (s: State, h: Handlare): KlanPerson | undefined => klanById(s, hp(s, h).gast!.klan)?.personer.find(q => q.roll === 'handlare' && q.namn === hp(s, h).name);
export const handlarNyckel = (s: State, h: Handlare) => gastNyckel(hp(s, h).gast!.klan, hp(s, h).name);

// relationen mellan handlaren och bybon p (skapas första gången, med kemin ur fröet)
export function gastRel(s: State, h: Handlare, p: Person): GastRel | undefined {
  const kp = handlarPerson(s, h);
  if (!kp) return undefined;
  const r = (kp.rel ??= {})[p.id];
  if (r) return r;
  const nyckel = handlarNyckel(s, h), g = (tal(s, nyckel, 1000 + p.id) + tal(s, nyckel, 2000 + p.id) + tal(s, nyckel, 3000 + p.id) - 1.5) * 1.2;
  return kp.rel[p.id] = { chem: clamp(g, -1, 1), op: 0, irr: 0, n: 0 };
}
// hur mycket handlaren gillar bybon, −1 till 1: samtalsdelarna (som vänskapen i ett samtal), relationen och irritationen
export function gillar(s: State, h: Handlare, p: Person) {
  const r = gastRel(s, h, p);
  if (!r) return 0;
  const nyckel = handlarNyckel(s, h), now = s.now;
  let d = 0;
  for (const k of LIKHET) d += Math.abs(gastStat(s, nyckel, k) - p.pot[k]);
  const likhet = 1 - d / 40, charm = (stat(p, 'karisma', now) + stat(p, 'skonhet', now)) / 2;
  const ut = r.chem * SAMTAL.utKemi + likhet * SAMTAL.utLikhet + (gastStat(s, nyckel, 'empati') + stat(p, 'empati', now)) / SAMTAL.utEmpati - SAMTAL.utAvdrag + (charm - 8) / SAMTAL.charmDiv;
  return clamp(ut * GASTREL.ut + r.op / 100 - r.irr, -1, 1);
}
// det handlaren kräver gånger det här: mindre för den hen gillar, mer för den hen inte gillar
export const kravRel = (s: State, h: Handlare, p: Person | undefined) => p ? 1 - GASTREL.krav * gillar(s, h, p) : 1;
// det mesta handlaren kräver (av den hen inte gillar alls), och så långt höjer kunden sitt bud
export const kravMax = () => 1 + GASTREL.krav;
// handlaren sa nej: var budet alldeles för dåligt (del = budets värde delat med det hen kräver) blir hen irriterad på bybon
export function nejTill(s: State, h: Handlare, p: Person, del: number) {
  const r = gastRel(s, h, p);
  if (!r || del >= GASTREL.illa) return;
  r.irr = Math.min(1, r.irr + GASTREL.irr);
  count(s, 'handlarIrriterad');
}
// de gjorde en affär
export function affarMed(s: State, h: Handlare, p: Person) {
  const r = gastRel(s, h, p);
  if (!r) return;
  r.n++; r.op = clamp(r.op + GASTREL.byteOp, -100, 100);
}
// den ena märkte att den andra lurat hen (handlaren = handlaren märkte det)
export function luradMed(s: State, h: Handlare, p: Person, handlaren: boolean) {
  const r = gastRel(s, h, p);
  if (!r) return;
  if (handlaren) r.lurat = (r.lurat ?? 0) + 1; else r.lurad = (r.lurad ?? 0) + 1;
  r.op = clamp(r.op - GASTREL.luradOp, -100, 100);
}
// handlaren går hem: det mesta av irritationen går över
export function glomIrritation(s: State, h: Handlare) {
  const rel = handlarPerson(s, h)?.rel;
  if (rel) for (const r of Object.values(rel)) r.irr = r.irr * GASTREL.kvar < 0.01 ? 0 : r.irr * GASTREL.kvar;
}
// alla gästrelationer en bybo har (bybons relationsflik): personen i grannklanen, klanens namn och relationen
export function gastRelationer(s: State, p: Person) {
  return (s.klaner ?? []).flatMap(k => k.personer.flatMap(q => q.rel?.[p.id] ? [{ q, klan: k.namn, r: q.rel[p.id] }] : []));
}
