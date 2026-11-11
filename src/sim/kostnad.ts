// Datortiden per del av slaget och per aktivitet (npm run kortsteg, steg 10.2.13). Mäter bara när KOSTNAD.pa är satt;
// simuleringen läser det aldrig, och utan mätningen kostar det bara en jämförelse per del
export const KOSTNAD = { pa: false, ms: new Map<string, number>(), n: new Map<string, number>() };
export const kostStart = () => KOSTNAD.pa ? performance.now() : 0;
// lägg tiden sedan t0 på delen namn och ge en ny starttid
export function kost(namn: string, t0: number) {
  if (!KOSTNAD.pa) return 0;
  const t = performance.now();
  KOSTNAD.ms.set(namn, (KOSTNAD.ms.get(namn) ?? 0) + t - t0); KOSTNAD.n.set(namn, (KOSTNAD.n.get(namn) ?? 0) + 1);
  return t;
}
export function kostNoll() { KOSTNAD.ms.clear(); KOSTNAD.n.clear(); }
