// Vattenhon (steg 10.10.30, Djuren i detalj: Djurens törst och vattenhon): en ho som huggs ur en stock med yxan, som
// bryggkaret men utan lock, och ställs i en hage som inte når vattnet. Den har sitt vatten i sig (t.vatten, hela vatten),
// rymmer HO.rymmer och syns med vattnet i. Den fylls ur lerkrukor och vattensäcken (hoFyll: vattnet hälls i, och den tomma
// behållaren blir kvar hos den som bar den), och regnet fyller den per tid (hoRegn, en rad i TAKTER): arbetet mot nästa hela
// vatten är t.regn. Hon har ingen egen teknik: den som kan sätta staket kan hugga ur den
import { balans } from './balans';
import { Ting } from './agande';
import { getMap } from './karta';
import { Station, isKlar, ledig, stationerOf } from './stationer';
import { Hage, hagarOf } from './hage';
import { tamdjurOf } from './tamdjur';
import { vaderNu } from './vader';
import { blocked } from './byggnad';
import { bynsMitt } from './omrade';
import { count, forstaGang, log } from './folk';
import { H, HOUR_S, Person, State, T, W } from './typer';

export const HO = balans('vattenho', {
  rymmer: 20, // så mycket vatten hon rymmer
  regnTim: 2, // så många vatten i timmen fyller regnet hon med, när det regnar som mest
});
// når hagen vattnet: står någon ruta i den intill sjön eller ån?
export function hageVidVatten(s: State, h: Hage) {
  const t = getMap(s.seed).tiles;
  for (let y = h.y - 1; y <= h.y + h.h; y++) for (let x = h.x - 1; x <= h.x + h.w; x++) if (x >= 0 && y >= 0 && x < W && y < H && t[y * W + x] === T.Vatten) return true;
  return false;
}
const iHagen = (h: Hage, x: number, y: number) => x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h;
export const hoarOf = (s: State) => stationerOf(s).filter(t => t.k === 'vattenho');
// hon i hagen, om det står en (färdig eller påbörjad)
export const hoI = (s: State, h: Hage) => hoarOf(s).find(t => iHagen(h, t.x, t.y));
// hagarna med djur som inte når vattnet och saknar en ho
const utanHo = (s: State) => hagarOf(s).filter(h => tamdjurOf(s).some(d => d.hage === h.id) && !hageVidVatten(s, h) && !hoI(s, h));
// en ho i varje hage med djur som inte når vattnet (stationBrist i forradsmal.ts)
export function hoBrist(s: State) {
  const behov = hagarOf(s).filter(h => tamdjurOf(s).some(d => d.hage === h.id) && !hageVidVatten(s, h));
  return behov.length ? utanHo(s).length / behov.length : 0;
}
// platsen för hon: en ledig ruta i en hage som saknar en, så nära byns mitt som möjligt (kort väg för den som fyller den)
export function siteHo(s: State) {
  const m = bynsMitt(s);
  let best: { x: number; y: number; rot?: 1 } | undefined, bd = Infinity;
  for (const h of utanHo(s)) for (let y = h.y; y < h.y + h.h; y++) for (let x = h.x; x < h.x + h.w; x++) {
    const d = Math.hypot(x + 0.5 - m.x, y + 0.5 - m.y);
    if (d < bd && ledig(s, x, y) && !blocked(s, x + 0.5, y + 0.5)) { bd = d; best = { x, y }; }
  }
  return best;
}
// vattnet ur behållaren k hälls i hon: så mycket som får plats, i hela vatten. Behållaren blir kvar, tom om allt fick plats
export function hoFyll(s: State, ho: Station, k: Ting, p?: Person) {
  if (k.inne?.v !== 'vatten' || !isKlar(ho)) return 0;
  const n = Math.min(k.inne.n, HO.rymmer - (ho.vatten ?? 0));
  if (n <= 0) return 0;
  ho.vatten = (ho.vatten ?? 0) + n; k.inne.n -= n;
  if (k.inne.n <= 0) k.inne = undefined;
  count(s, 'hoFylld', n);
  if (p && forstaGang(s, 'hoFylld')) log(s, `${p.name} hällde vatten i vattenhon åt djuren.`, 'world', [p.id]);
  return n;
}
// regnet fyller hon per tid (TAKTER): HO.regnTim gånger hur mycket det regnar; snön fyller den inte
export function hoRegn(s: State, dt: number) {
  const hoar = hoarOf(s).filter(isKlar);
  if (!hoar.length) return;
  const v = vaderNu(s);
  if (v.nb <= 0 || v.sno) return;
  for (const t of hoar) {
    if ((t.vatten ?? 0) >= HO.rymmer) { t.regn = undefined; continue; }
    t.regn = (t.regn ?? 0) + HO.regnTim * v.nb * dt / HOUR_S;
    const n = Math.min(Math.floor(t.regn), HO.rymmer - (t.vatten ?? 0));
    if (n > 0) { t.vatten = (t.vatten ?? 0) + n; t.regn -= n; count(s, 'hoRegn', n); }
    if ((t.vatten ?? 0) >= HO.rymmer) t.regn = undefined;
  }
}
