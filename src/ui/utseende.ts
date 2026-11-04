// Porträtten (steg 5.2.3, "Porträttens byggsätt" under Gränssnitt i designdokumentet): varje person får sina delar och
// färger ur registret PORTRATT i bildstilen (src/portrattkarna.ts, genererad ur karaktärsskaparen). Delarna ges vid
// födseln: ett barn ärver dem från mamman och pappan (barnAv), och de första i byn, nykomlingarna och personerna i byar
// som sparats före porträtten får dem slumpade ur byns frö och personens nummer. Allt räknas ur numret och föräldrarna,
// så att samma person alltid ser likadan ut och simuleringen inte märker något. Bara utseende.
import { ALDER, ageOf, byId } from '../sim';
import type { Person, State } from '../sim';
import { KARNA } from '../portrattkarna';

// en person i karaktärsskaparens form (skapare.js): kön, ålder, en del per sort, färgerna, humöret och det man bär
export interface Skapad {
  kon: 'kvinna' | 'man'; alder: 'barn' | 'ung' | 'vuxen' | 'gammal'; del: Record<string, string | null>; hud: number; har: number; ogon: number;
  humor: string; skonhet: number; forband: string[]; ogonlapp: boolean; sjuk: boolean; kyla: boolean; blod: boolean;
  klader: { rock: string | null; skor: boolean; balte: boolean }; lagen: Record<string, string>; lager: string[] | null; rynkor: number | null;
  anlag?: { skagg: string | null; frisyr: string | null };
}
// åldern i skaparen: barn tills man är vuxen i byn, ung till 30, vuxen till 55 och sedan gammal (registret aldrar)
export const PORTRATTALDER = { ung: 30, gammal: 55 };
export function alderAv(a: number): 'barn' | 'ung' | 'vuxen' | 'gammal' {
  return a < ALDER.vuxen ? 'barn' : a < PORTRATTALDER.ung ? 'ung' : a < PORTRATTALDER.gammal ? 'vuxen' : 'gammal';
}
const fro = (s: State, id: number) => (Math.imul(s.seed | 0, 0x9e3779b1) ^ Math.imul(id + 1, 0x85ebca6b)) | 0;
const ARV = new Map<string, Skapad>();
// glöm det som räknats (scenariot portratt prövar att samma person blir likadan igen)
export const glomArv = () => ARV.clear();
// arvet: personens delar och färger (det som inte ändras under livet). Ett barn får dem från föräldrarna; den som saknar
// föräldrar i byn får dem slumpade
export function drag(s: State, p: Person, djup = 0): Skapad {
  const k = s.seed + ':' + p.id;
  let d = ARV.get(k);
  if (!d) {
    let n: Skapad;
    const kon = p.sex === 'k' ? 'kvinna' : 'man', r = KARNA.slumpFran(fro(s, p.id));
    const mor = p.mother !== undefined ? byId(s, p.mother) : undefined, far = p.father !== undefined ? byId(s, p.father) : undefined;
    if (mor && far && djup < 40) { n = KARNA.barnAv(drag(s, mor, djup + 1), drag(s, far, djup + 1), r); n.kon = kon; }
    else n = KARNA.slumpPerson(r, { kon, alder: 'vuxen' });
    ARV.set(k, d = n);
  }
  return d;
}
// personen som skaparen ritar hen nu: arvet i rätt ålder (barnet får den vuxna frisyren och skägget när hen växer upp)
export function skapad(s: State, p: Person): Skapad {
  const d = drag(s, p), alder = alderAv(ageOf(p, s.now));
  const u: Skapad = alder !== 'barn' && d.anlag ? KARNA.somUng(d) : { ...d, del: { ...d.del } };
  u.alder = alder;
  return u;
}
