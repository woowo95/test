import { State, Person } from './typer';
import { SAKER, isTool, item } from './saker';
import { alive, byId } from './folk';

// ---------- ägande, steg 1 ----------
// Den som gör ett redskap äger det. Förrådet, maten och husen är byns. Det som samlas, fiskas och jagas tillhör den som
// skaffade det, men byn är generös och allt läggs genast i byns förråd, så det blir byns. Steg 1 ändrar inget annat: alla
// använder fortfarande vilket ledigt redskap som helst. Gåvor, lån, arv och stöld kommer i steg 2.
// s.agare[k] har ett id per helt redskap av slaget k (0 = byn). Redskap från före ägandet, och redskap vars ägare dött
// eller lämnat byn, är byns.
export const BYN = 0;
const whole = (s: State, k: string) => Math.ceil(item(s, k) - 1e-9);
const listOf = (s: State, k: string) => ((s.agare ??= {})[k] ??= []);

// p gjorde ett redskap av slaget k (anropas efter att det lagts i förrådet)
export function made(s: State, k: string, p: Person) {
  syncOwners(s);
  const l = listOf(s, k), i = l.lastIndexOf(BYN); // det nya räknades in som byns i syncOwners
  if (i >= 0) l[i] = p.id; else l.push(p.id);
}
// ett redskap av slaget k gick sönder i händerna på p: hens eget går sönder först, sedan byns
export function broke(s: State, k: string, p: Person) {
  const l = listOf(s, k);
  let i = l.indexOf(p.id);
  if (i < 0) i = l.lastIndexOf(BYN);
  if (i < 0) i = l.length - 1;
  if (i >= 0 && l.length > whole(s, k)) l.splice(i, 1);
  syncOwners(s);
}
// håll ägarlistorna i takt med förrådet: nya redskap utan känd ägare är byns, de som slitits ut tas bort (byns först)
export function syncOwners(s: State) {
  const ag = s.agare ??= {};
  for (const k in SAKER) {
    if (!isTool(k)) continue;
    const n = whole(s, k), l = ag[k] ??= [];
    for (let i = 0; i < l.length; i++) if (l[i] !== BYN) { const q = byId(s, l[i]); if (!q || !alive(q)) l[i] = BYN; }
    while (l.length < n) l.push(BYN);
    while (l.length > n) { const i = l.lastIndexOf(BYN); l.splice(i >= 0 ? i : l.length - 1, 1); }
    if (!l.length) delete ag[k];
  }
}
// vad p äger: slag och antal
export function ownedBy(s: State, p: Person) {
  const out: Record<string, number> = {};
  for (const k in s.agare ?? {}) for (const id of s.agare![k]) if (id === p.id) out[k] = (out[k] ?? 0) + 1;
  return out;
}
// hur många av slaget k byn äger gemensamt
export const villageOwns = (s: State, k: string) => (s.agare?.[k] ?? []).filter(id => id === BYN).length;
