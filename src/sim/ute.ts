// ---------- borta från byn (steg 11.2.3, Sällskapet i designdokumentet) ----------
// En bybo kan vara borta: på en resa, en turné eller hos släkt i en annan by (de senare stegen säger varför). Hen är
// fortfarande bybo och äger sitt (alive i folk.ts), men finns inte på bykartan: living() räknar bara dem som är i byn (paKartan),
// så den som är borta går inte i slaget, ritas inte och väljs inte till något. Det hen har på sig (kläder, redskap, det i
// bältet) följer med och kommer hem igen; en börda i händerna läggs ner med sina ägare där hen står (avbryt i lager.ts).
// Ingen person finns på två ställen: den som är borta står ingenstans på kartan, och kommer in där hen kommer hem.
import { alive } from './folk';
import { avbryt } from './lager';
import { Person, State } from './typer';
import { raknaBynVet } from './ort';

export const ute = (p: Person) => p.ute !== undefined;
// bybon lämnar byn: arbetet släpps som när någon avbryter det (det som var reserverat för hen räknas inte längre, eftersom
// bara de i byn räknas)
export function gaBort(s: State, p: Person) {
  if (!alive(p) || ute(p)) return;
  avbryt(s, p);
  p.ute = s.now;
  raknaBynVet(s); // det byn vet utan hen (steg 11.4.6)
}
// bybon kommer hem till rutan x, y (kanten hen kommer in från) med det hen har på sig, och väljer ett nytt arbete
export function kommHem(s: State, p: Person, x: number, y: number) {
  if (!ute(p)) return;
  delete p.ute;
  p.x = x; p.y = y;
  p.task = undefined;
  raknaBynVet(s); // det byn vet med det hen vet (steg 11.4.6)
}
