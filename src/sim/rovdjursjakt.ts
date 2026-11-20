// ---------- jakten på rovdjuren (steg 3.10.20, 9.9.3 och 10.1.17, fynd 179 i kodgenomgången) ----------
// Det som är lika i vargjakten (varg.ts) och björnjakten (bjorn.ts): platsen där jägarna möter djuret, vem som kallar, vem som
// följer med och samlingen vid djuret. Hur stark gruppen måste vara, chansen att djuret går undan och texterna står hos djuret.
import { blocked, freeNear } from './byggnad';
import { byId, getRel, stat } from './folk';
import { avst, rnd, type Strom } from './slump';
import { ledareOf } from './styre';
import { HOUR, Person, State } from './typer';

// platsen på land närmast djuret, där jägarna möter det, eller ingen när det står för långt ut på isen (människor går inte på vattnet)
export function jaktPlatsVid(s: State, x: number, y: number) { const sp = freeNear(s, x, y); return blocked(s, sp.x, sp.y) ? undefined : sp; }

// den som kallar till jakten: den som såg djuret om hen vågar, annars ledaren eller den modigaste som vågar
export function jaktKallare(s: State, kan: Person[], sag: Person | undefined, vagar: (q?: Person) => boolean) {
  const led = ledareOf(s), modiga = kan.filter(q => vagar(q));
  const kallar = vagar(sag) ? sag! : vagar(led) ? led! : modiga.length ? modiga.reduce((a, q) => stat(q, 'mod', s.now) > stat(a, 'mod', s.now) ? q : a) : undefined;
  return { kallar, led };
}

export interface FoljTal { foljMod: number; foljTycke: number; foljNod: number; foljSlump: number; folj: number }
// de som följer med, den som vill mest först: modet, tycket för den som kallar, seden (sed, redan vägd), byns hunger (nod), gehöret
// för den som kallar och slump, tillsammans över t.folj. Den som kallar följer alltid med
export function jaktFoljer(s: State, kan: Person[], kallar: Person, t: FoljTal, sed: number, nod: number, gehor: number, strom: Strom) {
  return kan.map(q => ({ q, v: q === kallar ? Infinity : t.foljMod * (stat(q, 'mod', s.now) - 10) / 10 + t.foljTycke * getRel(s, q, kallar).op / 100 + sed + t.foljNod * nod + gehor + t.foljSlump * (rnd(s, strom, q) - 0.5) }))
    .filter(x => x.v > t.folj).sort((a, b) => b.v - a.v).map(x => x.q);
}

// samlingen vid djuret: de som kallats räknas tills kallelsen löpt ut, också de som inte hunnit ge sig av än (steg 9.9.3 och
// 12.1.59); de som är framme är de på jakten inom samlas rutor från p. vanta: de andra är inte framme och p har inte väntat
// samlasTim timmar (j.samlas: när väntan började)
export function jaktSamlas(s: State, p: Person, j: { jagare?: number[]; kallTill?: number; samlas?: number }, act: string, samlas: number, samlasTim: number) {
  const alla = j.jagare!.map(id => byId(s, id)).filter((q): q is Person => !!q && q.health > 0 && (q.task?.act === act || s.now < (j.kallTill ?? 0)));
  const med = alla.filter(q => q.task?.act === act && avst(q, p) <= samlas);
  return { alla, med, vanta: med.length < alla.length && s.now - (j.samlas ??= s.now) < samlasTim * HOUR };
}
