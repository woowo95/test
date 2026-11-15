// Omtanken (steg 10.5.2, "Jaget och familjen" i designdokumentet): hur mycket en person bryr sig om dem ett arbete är till för.
// Det egna och familjens väger alltid 1; byns arbete väger byns brist gånger omtanken om byn (projekt.ts, valet av mat och ved i
// val.ts, bygget i bygg.ts). Omtanken om byn räknas en gång i timmen (TAKTER) och sparas på personen.
import { Person, State } from './typer';
import { balans } from './balans';
import { clamp } from './slump';
import { familjOf, relKey, stat } from './folk';
import { SED } from './seder';

// omtanke för en vanlig människa i en by utan sed; stiger med empati per steg empati över det vanliga, med sed när seden är
// Sammanhållning (sjunker med Självförsörjning) och med rel när relationerna är goda (sjunker med osämja; relationen delad
// med relSpann, från −1 till 1), och ligger mellan 0 och max
export const OMTANKE = balans('omtanke', { bas: 1, empati: 0.3, sed: 0.5, rel: 0.3, max: 2, relSpann: 50 });

// omtanken hos p när relationen till dem arbetet är till för är rel (−100 till 100)
export const omtankeMed = (s: State, p: Person, rel: number) => clamp(OMTANKE.bas + OMTANKE.empati * (stat(p, 'empati', s.now) - SED.mitt) / SED.spann + OMTANKE.sed * (s.seder?.v.gemenskap ?? 0) + OMTANKE.rel * clamp(rel / OMTANKE.relSpann, -1, 1), 0, OMTANKE.max);
// omtanken om byn: snittet av relationerna till de andra i byn (gästerna räknas inte)
function omtankeBer(s: State, p: Person) {
  let n = 0, sum = 0;
  for (const q of s.people) if (q !== p && q.died === undefined && !q.gast) { n++; sum += s.rels[relKey(p.id, q.id)]?.op ?? 0; }
  return omtankeMed(s, p, n ? sum / n : 0);
}
// en gång i timmen (TAKTER)
export function omtankeTimme(s: State) { for (const p of s.people) if (p.died === undefined && !p.gast) p.omt = omtankeBer(s, p); }
export const omtanke = (s: State, p: Person) => p.omt ?? omtankeBer(s, p);
// omtanken om en bestämd person: hen själv och familjen 1, andra efter relationen till just hen; ingen person: omtanken om byn
export function omtankeOm(s: State, p: Person, id: number | undefined) {
  if (id === undefined) return omtanke(s, p);
  if (id === p.id || familjOf(s, p.id).some(q => q.id === id)) return 1;
  return omtankeMed(s, p, s.rels[relKey(p.id, id)]?.op ?? 0);
}
