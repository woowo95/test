// Tunnan (steg 12.4.6, Arbetsstationer och möbler: Tunnan). Tunnan är ett laggat kärl av plankor och rep som görs bara vid
// snickarbänken (SAKER, gruppen tunna), och en behållare (vatskor.ts) som rymmer TUNNA.rymmer delar vin, mjöd, öl, svagdricka eller
// vatten. Den bärs inte full: det som hälls i den hälls i där den står.
// Mognaden: vinet och mjödet blir bättre med tiden i sin behållare. Registret MOGNAD har en rad per dryck och behållare, med
// dygnen (år i spelet) till varje kvalitet; en dryck börjar på MOGNAD_START. Vinet i krukan blir bäst efter 15 dygn, i tunnan ett
// steg till efter 25, och mjödet mognar bara i tunnan. Kvaliteten (t.inne.q) räknas en gång i timmen (raden mognaden i TAKTER),
// och en mognare dryck ger en bättre tanke av att dricka (rus.ts) och ett högre värde (vardeKrok i varde.ts, satt i steg.ts).
// Regnet: en tunna som står ute och är tom eller har vatten fylls av regnet som vattenhon (tunnaRegn, raden tunnorna i TAKTER)
import { balans } from './balans';
import { tingOf, ingenHar, type Ting } from './agande';
import { roofed } from './byggnad';
import { count } from './folk';
import { vaderNu } from './vader';
import { DAY, HOUR_S, State } from './typer';

export const TUNNA = balans('tunna', {
  rymmer: 20, // så många delar ryms i tunnan
  regnTim: 2, // så många vatten i timmen fyller regnet en tunna ute med, när det regnar som mest (som vattenhon)
  mognGlad: 0.5, // tanken av att dricka är så här mycket bättre för varje steg drycken mognat
  mognVarde: 0.3, // och värdet av en del så här mycket mer per steg
});
export const MOGNAD_START = 2; // kvaliteten på en dryck som just hällts upp
// dygnen till varje kvalitet efter MOGNAD_START, per dryck och behållare
export const MOGNAD: Record<string, Record<string, number[]>> = {
  vin: { lerkruka_stor: [5, 15], tunna: [5, 15, 25] },
  mjod: { tunna: [5, 15] },
};
// hur många steg vätskan v mognar i behållaren k (0 = inte alls)
export const mognarI = (v: string, k: string) => MOGNAD[v]?.[k]?.length ?? 0;
// kvaliteten på drycken i t just nu
export function mognadKv(s: State, t: Ting) {
  const r = t.inne && MOGNAD[t.inne.v]?.[t.k];
  if (!r || t.inne!.t === undefined) return t.inne?.q ?? MOGNAD_START;
  const dygn = (s.now - t.inne!.t) / DAY;
  return MOGNAD_START + r.filter(d => dygn >= d).length;
}
// en gång i timmen: kvaliteten på det som mognar
export function mognadSteg(s: State) {
  for (const t of tingOf(s)) if (t.inne && MOGNAD[t.inne.v]?.[t.k]) t.inne.q = mognadKv(s, t);
}
// det en mognad dryck är värd utöver det vanliga: TUNNA.mognVarde per del och steg
export const mognadVarde = (t: Ting) => t.inne && MOGNAD[t.inne.v] ? Math.max(0, (t.inne.q ?? MOGNAD_START) - MOGNAD_START) * TUNNA.mognVarde * t.inne.n : 0;
// regnet fyller tunnorna som står ute, tomma eller med vatten, per tid; snön fyller dem inte
export function tunnaRegn(s: State, dt: number) {
  const v = vaderNu(s);
  if (v.nb <= 0 || v.sno) return;
  for (const t of tingOf(s)) {
    if (t.k !== 'tunna' || t.x === undefined || t.y === undefined || !ingenHar(t) || t.inne && t.inne.v !== 'vatten' || roofed(s, t.x, t.y)) continue;
    const har = t.inne?.n ?? 0;
    if (har >= TUNNA.rymmer) { t.regn = undefined; continue; }
    t.regn = (t.regn ?? 0) + TUNNA.regnTim * v.nb * dt / HOUR_S;
    const n = Math.min(Math.floor(t.regn), TUNNA.rymmer - har);
    if (n > 0) { t.inne = { v: 'vatten', n: har + n, t: s.now }; t.regn -= n; count(s, 'tunnaRegn', n); }
  }
}
