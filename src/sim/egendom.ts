import { State, Person } from './typer';
import { byId, isKin } from './folk';

// ---------- ägande av det man samlar och gör ----------
// Det någon samlar, fiskar, jagar, hugger och tillverkar är hens, också när det ligger i byns förråd. Det som redan var
// byns förblir byns. Vems något är står på stacken (lager.ts): stack.ag är hur mycket av stacken varje person äger, och
// resten av stacken är byns. Hur mycket var och en äger i förrådet räknas fram ur stackarna. Redskapen har sina ägare på
// tingen (agande.ts).
// När något tas ur förrådet räknas det av från ägarna. Till sig själv (äta, tillverka) tar man sitt eget först, sedan
// byns. Familjen har inget gemensamt förråd. Maten tar man bara av sitt eget och byns (andras mat får man som gåva eller
// stjäl, behov.ts). Till byns eld och hus tas byns först, sedan sitt eget, familjens och andras.
// Det som försvinner av sig självt (ruttnar, multnar, slits) minskar allas delar lika mycket, eftersom det försvinner ur
// stacken. Det som kommer till utan att någon skaffat det är byns. När någon dör eller flyttar blir delen byns.
// Det som bärs har ägarna med sig (task.ag), också när bördan läggs ner på marken.
// Utom för maten ändrar ägandet ännu inget i vad folk gör; det visar bara vems det är.
export const BYN = 0;
export type Del = Record<string, number>; // ägare (id) → mängd. Byn står aldrig med: det som inte är någons är byns
export function sumOf(d?: Del) { let n = 0; if (d) for (const o in d) n += d[o]; return n; }
export function addDel(a: Del, b: Del | undefined, f = 1) { if (b) for (const o in b) a[o] = (a[o] ?? 0) + b[o] * f; return a; }

// n av ett slag ska tas av p ur andelarna shares (byns del under BYN). common = till byns eld eller hus.
// fran = det tas av den personens (stöld). Ger hur mycket som tas av varje ägare, i den ordning man tar
export function takeOrder(s: State, p: Person | undefined, shares: Del, n: number, common = false, fran?: number): [number, number][] {
  const rank = (o: number) => {
    if (o === fran) return -1;
    const q = o === BYN ? undefined : byId(s, o);
    const kin = !!p && !!q && (q.partner === p.id || isKin(q, p));
    const r = o === BYN ? 0 : p && o === p.id ? 1 : kin ? 2 : 3;
    return common || r >= 2 ? r : 1 - r; // till sig själv: eget, byns, familjens, andras
  };
  const out: [number, number][] = [];
  for (const o of Object.keys(shares).map(Number).sort((a, b) => rank(a) - rank(b) || a - b)) {
    if (n <= 1e-12) break;
    const v = Math.min(n, shares[o]);
    if (v > 1e-12) { out.push([o, v]); n -= v; }
  }
  return out;
}
