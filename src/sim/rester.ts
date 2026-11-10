// Resterna och sophögen (steg 9.7.5, Odlingen i detalj: Resterna och sophögen). All slakt ger slaktrens och all skörd ger
// växtrester, två saker i SAKER som ruttnar bort med tiden. Så länge de ligger i byn ger de smuts (smutsIByn i smuts.ts), och
// poängen för att bära dem till sophögen i utkanten, nära latrinen, kommer ur smutsen (raden sopor i ARBETEN, val.ts): de bärs
// bort när de stör och får ligga när annat är viktigare. Sophögen är en plats och ingen station (s.sophog); resterna ruttnar bort där.
import { balans } from './balans';
import { count, forstaGang, log } from './folk';
import { amountOf, use } from './lager';
import { bynsMitt, utanforByn } from './omrade';
import { stationDef, stationerOf } from './stationer';
import { DAY, H, HOUR, Person, State, T, W, inMap } from './typer';
import { getMap } from './karta';

export const RESTER = ['slaktrens', 'vaxtrest'] as const;
export const REST = balans('rester', {
  min: 3, // byn bär bort resterna när det ligger minst så här många i byn ...
  full: 15, // ... och säkert när det ligger så här många
  bar: 10, // så många bär den som går till sophögen
  tur: 2, // minuter för en tur till sophögen
  rutt: 3, // dygn tills resterna på sophögen ruttnat bort
});
export const resterIByn = (s: State) => RESTER.reduce((n, k) => n + amountOf(s, k), 0);
// sophögen: nära latrinen om byn har en, annars i utkanten av byns område, på land
export function sophog(s: State) {
  if (s.sophog) return s.sophog;
  const t = getMap(s.seed).tiles, l = stationerOf(s).find(q => stationDef(q.k)?.gor.includes('toa')), c = l ? { x: l.x, y: l.y } : bynsMitt(s);
  for (let r = l ? 2 : 4; r < 30; r++) for (let a = 0; a < 16; a++) {
    const x = Math.round(c.x + r * Math.cos(a * Math.PI / 8)), y = Math.round(c.y + r * Math.sin(a * Math.PI / 8));
    if (!inMap(x, y) || t[y * W + x] === T.Vatten || (!l && utanforByn(s, x, y) < 1)) continue;
    return (s.sophog = { x, y, n: 0 });
  }
  return (s.sophog = { x: Math.floor(c.x), y: Math.min(H - 1, Math.floor(c.y) + 4), n: 0 });
}
// den som bär resterna till sophögen är framme (KLAR i steg.ts): resterna ur byns förråd läggs på högen
export function soporKlar(s: State, p: Person) {
  const h = sophog(s);
  let kvar = REST.bar;
  for (const k of RESTER) { const n = Math.min(kvar, Math.floor(amountOf(s, k))); if (n <= 0) continue; use(s, p, k, n, true); h.n += n; kvar -= n; }
  if (kvar < REST.bar) { count(s, 'soporBurna', REST.bar - kvar); if (forstaGang(s, 'sophog')) log(s, `${p.name} bar resterna från slakten och skörden till en sophög i utkanten av byn.`, 'world', [p.id]); }
}
// en gång i timmen (steg.ts): resterna på sophögen ruttnar bort
export function stepSophog(s: State) {
  if (!s.sophog?.n) return;
  s.sophog.n = Math.max(0, s.sophog.n - s.sophog.n * HOUR / (REST.rutt * DAY) - 0.01);
}
