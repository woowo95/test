import { State, Person } from './typer';
import { isFood, isTool } from './saker';
import { alive, byId, isKin } from './folk';

// ---------- ägande av det man samlar och gör ----------
// Det någon samlar, fiskar, jagar, hugger och tillverkar är hens, också när det ligger i byns förråd. Det som redan var
// byns förblir byns. Förrådet är fortfarande ett och samma: s.egna[k][id] är hur mycket av slaget k varje person äger,
// och resten av förrådet är byns. Redskapen har sina ägare på tingen (agande.ts).
// När något tas ur förrådet räknas det av från ägarna. Till sig själv (äta, tillverka) tar man sitt eget först, sedan
// familjens, byns och sist andras. Till byns eld och hus tas byns först, sedan sitt eget, familjens och andras.
// Det som försvinner av sig självt (ruttnar, multnar, slits) minskar allas delar lika mycket. Det som kommer till utan
// att någon skaffat det är byns. När någon dör eller flyttar blir delen byns.
// Det som bärs har ägarna med sig (task.ag), också när bördan läggs ner på marken (stackens ag).
// Bokföringen ändrar inget i vad folk gör; den visar bara vems det är.
export const BYN = 0;
export type Del = Record<string, number>; // ägare (id, 0 = byn) → mängd
const totalOf = (s: State, k: string) => isFood(k) ? s.mat?.[k] ?? 0 : k === 'ved' ? s.wood : s.items[k] ?? 0;
const sumOf = (d: Del) => { let n = 0; for (const o in d) n += d[o]; return n; };
export const ownsAmount = (s: State, p: Person, k: string) => s.egna?.[k]?.[p.id] ?? 0;
// hur mycket av slaget k invånarna äger tillsammans (resten är byns)
export const ownedSum = (s: State, k: string) => sumOf(s.egna?.[k] ?? {});
// allt p äger i förrådet, per slag
export function ownedStock(s: State, p: Person) {
  const out: Record<string, number> = {};
  for (const k in s.egna ?? {}) { const v = s.egna![k][p.id]; if (v > 0) out[k] = v; }
  return out;
}
export function addDel(a: Del, b: Del, f = 1) { for (const o in b) a[o] = (a[o] ?? 0) + b[o] * f; return a; }

// owner skaffade n av slaget k, som redan lagts i förrådet
export function ownAdd(s: State, owner: number, k: string, n: number) {
  if (owner === BYN || n <= 1e-12 || isTool(k)) return;
  const e = (s.egna ??= {}), T = (s.egnaT ??= {}), d = (e[k] ??= {});
  T[k] = (T[k] ?? totalOf(s, k) - n) + n;
  d[owner] = (d[owner] ?? 0) + n;
}
// n av slaget k har tagits ur förrådet av p. common = till byns eld eller hus. Ger vems det var
export function ownTake(s: State, p: Person | undefined, k: string, n: number, common = false): Del {
  const d = s.egna?.[k], got: Del = {};
  if (n <= 1e-12) return got;
  if (!d) { got[BYN] = n; return got; }
  const T = (s.egnaT ??= {}), had = totalOf(s, k) + n;
  T[k] = (T[k] ?? had) - n;
  const shares: Del = { ...d, [BYN]: Math.max(0, had - sumOf(d)) };
  const rank = (o: number) => {
    const q = o === BYN ? undefined : byId(s, o);
    const kin = !!p && !!q && (q.partner === p.id || isKin(q, p));
    const r = o === BYN ? 0 : p && o === p.id ? 1 : kin ? 2 : 3;
    return common || r === 3 ? r : r === 0 ? 2.5 : r - 1; // till sig själv: eget, familjens, byns, andras
  };
  const order = Object.keys(shares).map(Number).sort((a, b) => rank(a) - rank(b) || a - b);
  for (const o of order) {
    if (n <= 1e-12) break;
    const v = Math.min(n, shares[o]);
    if (v <= 0) continue;
    got[o] = v; n -= v;
    if (o !== BYN) d[o] -= v;
  }
  if (n > 1e-12) got[BYN] = (got[BYN] ?? 0) + n;
  return got;
}
// n av slaget k flyttas ur förrådet (bärs till ett annat lager): allas delar lika mycket
export function ownTakeProp(s: State, k: string, n: number): Del {
  const d = s.egna?.[k], got: Del = {};
  if (n <= 1e-12) return got;
  if (!d) { got[BYN] = n; return got; }
  const T = (s.egnaT ??= {}), had = Math.max(n, totalOf(s, k) + n), f = n / had;
  T[k] = (T[k] ?? had) - n;
  let rest = n;
  for (const o in d) { const v = d[o] * f; d[o] -= v; got[o] = v; rest -= v; }
  if (rest > 1e-12) got[BYN] = rest;
  return got;
}
// lägg det som bars in i förrådet: ägarna i ag (jämkat om bördan minskat), resten är den som skaffade det
export function ownStore(s: State, owner: number, k: string, n: number, ag?: Del) {
  const sum = ag ? sumOf(ag) : 0, f = sum > n ? n / sum : 1;
  if (ag) for (const o in ag) ownAdd(s, +o, k, ag[o] * f);
  ownAdd(s, owner, k, n - sum * f);
}
// håll delarna i takt med förrådet: det som försvunnit av sig självt minskar allas delar, döda och utflyttade är borta
export function syncEgna(s: State) {
  const e = s.egna;
  if (!e) return;
  const T = (s.egnaT ??= {});
  for (const k in e) {
    const d = e[k], tot = Math.max(0, totalOf(s, k)), was = T[k] ?? tot;
    if (tot < was - 1e-9) { const f = was > 0 ? tot / was : 0; for (const o in d) d[o] *= f; }
    let sum = 0;
    for (const o in d) {
      const q = byId(s, +o);
      if (!q || !alive(q) || !(d[o] > 1e-6)) { delete d[o]; continue; }
      sum += d[o];
    }
    if (sum > tot) { const f = tot > 0 ? tot / sum : 0; for (const o in d) d[o] *= f; }
    T[k] = tot;
    if (!Object.keys(d).length) { delete e[k]; delete T[k]; }
  }
}
