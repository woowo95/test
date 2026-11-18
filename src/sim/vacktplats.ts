// ---------- den lilla kartan utan by (steg 11.13.25, Flera samhällen: Världen i tal: bykartan och kartreceptet) ----------
// När ett sällskap kommer fram till en plats utan by som har en liten karta (karta i registret LANDMARKEN: ruinen, den heliga
// platsen, gravhögen, runstenen, fyndplatsen, karavanresten, gömman och rastplatsen) skapas kartan efter receptet plats i
// KARTRECEPT: en liten karta utan byplats, ur platsens eget frö och med trösklar efter världsrutans marksort. Den går i slagen
// med huvudbyn som en väckt by, utan folk, och sällskapet kliver in som besökare (vacktgast.ts). Spelaren kan gå in och se den
// medan de egna är där. Kartan somnar som en väckt by när sällskapet vänt hem, eller efter VACKT.vakenMax dygn
import { count } from './folk';
import { KARTRECEPT } from './kartrecept';
import { LANDMARKEN, type LandmarkDef } from './landmarken';
import { inFas, kalender } from './tid';
import { State, useMap } from './typer';
import { tomBy } from './varld';
import { varldMark } from './varlden';
import { byggRester } from './vacktrester';
import { MARK_IDS } from './varldmark';

// platsens frö: ur huvudbyns frö och platsens nummer, så att samma plats alltid får samma karta
export const platsFro = (s: State, nr: number) => ((s.seed * 7919 + nr * 15485863) % 2147483646) + 1;

// platsen nr i världen får sin lilla karta, om den har en (och har den redan en, är det den)
export function vackPlats(s: State, nr: number): State | undefined {
  const vl = s.varld, p = vl?.platser?.find(q => q.nr === nr);
  if (!vl || !p || !(LANDMARKEN[p.k] as LandmarkDef).karta) return undefined;
  const fore = s.vackta?.find(b => b.vacktPlats === nr);
  if (fore) return fore;
  const v = varldMark(s), mark = v ? MARK_IDS[v.mark[p.y * v.w + p.x]] : undefined, r = KARTRECEPT.plats;
  const b = tomBy(platsFro(s, nr), s.now, s.now, { W: r.bredd, H: r.hojd }, { varld: vl, vacktPlats: nr, recept: 'plats', kal: { ...(s.kal ?? inFas(s)) }, lastAgeIdx: kalender(s, s.now).ai, ...(mark && mark !== 'hav' && mark !== 'sjo' ? { varldmark: mark } : {}) });
  b.vackFran = b.now;
  byggRester(b, p); // ruinens hus och det som är kvar i dem, karavanens vagnar (steg 11.13.26)
  (s.vackta ??= []).push(b);
  useMap(s);
  count(s, 'plats_karta');
  return b;
}
