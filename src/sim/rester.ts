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
import type { Station } from './stationer';
import { STATION } from './stationer';
import { getMap } from './karta';

export const RESTER = ['slaktrens', 'vaxtrest'] as const;
export const REST = balans('rester', {
  min: 3, // byn bär bort resterna när det ligger minst så här många i byn ...
  full: 15, // ... och säkert när det ligger så här många
  bar: 10, // så många bär den som går till sophögen
  tur: 2, // minuter för en tur till sophögen
  rutt: 3, // dygn tills resterna på sophögen ruttnat bort
  ruttMin: 0.01, // och så många rester ruttnar bort i timmen, så att den sista resten också försvinner
  // komposten (steg 9.7.6)
  upptack: 20, // när så här mycket ligger på sophögen kan den som odlar märka att det växer bättre där ...
  upptackTim: 0.02, // ... med den här chansen i timmen
  kompostRest: 10, // så många rester blir en färdig kompost ...
  kompostDygn: 3, // ... på så många dygn i värme (långsamt i kyla)
  latrin: 5, // en tömd latrin ger komposten så här många rester
  tomMin: 15, // minuter att tömma latrinen i komposten (handlingen tomma_latrin)
  varm: 5, // över så många grader mognar komposten i full takt ...
  kylaTakt: 0.3, // ... annars i så här stor del av takten
  godsla: 0.3, // en färdig kompost höjer bördigheten på en ruta så här mycket
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
  const ko = komposten(s);
  const h = ko ? { n: 0 } : sophog(s);
  let kvar = REST.bar;
  for (const k of RESTER) { const n = Math.min(kvar, Math.floor(amountOf(s, k))); if (n <= 0) continue; use(s, p, k, n, true); if (ko) ko.kompost = { rest: (ko.kompost?.rest ?? 0) + n, mogna: ko.kompost?.mogna ?? 0 }; else h.n += n; kvar -= n; } // till komposten när byn har en (steg 9.7.6)
  if (kvar < REST.bar) { count(s, 'soporBurna', REST.bar - kvar); if (forstaGang(s, 'sophog')) log(s, `${p.name} bar resterna från slakten och skörden till en sophög i utkanten av byn.`, 'world', [p.id]); }
}
// en gång i timmen (steg.ts): resterna på sophögen ruttnar bort
export function stepSophog(s: State) {
  if (!s.sophog?.n) return;
  s.sophog.n = Math.max(0, s.sophog.n - s.sophog.n * HOUR / (REST.rutt * DAY) - REST.ruttMin);
}

// ---------- komposten (steg 9.7.6) ----------
export const komposten = (s: State) => stationerOf(s).find(t => t.k === 'kompost' && isKlar(t));
// latrinen som ska tömmas: den fullaste färdiga som är nästan full, när byn har en kompost (handlingen tomma_latrin i val.ts)
export function latrinAttTomma(s: State) {
  if (!komposten(s)) return undefined;
  let best: Station | undefined;
  for (const l of stationerOf(s)) if (stationDef(l.k)?.gor.includes('toa') && isKlar(l) && (l.fyllt ?? 0) >= STATION.latrinNy && (!best || (l.fyllt ?? 0) > (best.fyllt ?? 0))) best = l;
  return best;
}
// den som tömmer latrinen är klar (KLAR i steg.ts): gropen är tom igen och innehållet ligger i komposten
export function latrinTomKlar(s: State, p: Person) {
  const ko = komposten(s), l = stationerOf(s).find(q => q.id === p.task?.ref);
  if (!ko || !l || !isKlar(l) || !(l.fyllt ?? 0)) return;
  const n = Math.max(1, Math.round(REST.latrin * Math.min(1, l.fyllt ?? 0)));
  l.fyllt = 0; ko.kompost = { rest: (ko.kompost?.rest ?? 0) + n, mogna: ko.kompost?.mogna ?? 0 };
  count(s, 'latrinTomd');
  if (forstaGang(s, 'latrinTomd')) log(s, `${p.name} tömde latrinen i komposten, så att ingen ny grop behöver grävas.`, 'world', [p.id]);
}
// en gång i timmen: den som odlar kan märka att det växer bättre där resterna legat (tekniken Gödsel) och komposten mognar
export function stepKompost(s: State) {
  const h = s.sophog;
  if (h && h.n >= REST.upptack && !living(s).some(p => knows(p, 'kompost')) && hash(s.seed ^ 0x7c0, Math.floor(s.now / HOUR), 7) < REST.upptackTim) {
    const nya = living(s).filter(p => knows(p, 'odling'));
    for (const p of nya) learn(s, p, TEK.kompost);
    if (nya.length && forstaGang(s, 'godsel')) log(s, `${nya[0].name} märker att det växer bättre där resterna på sophögen har legat.`, 'world', [nya[0].id]);
  }
  const ko = komposten(s);
  if (!ko) return;
  if (h?.n) { ko.kompost = { rest: (ko.kompost?.rest ?? 0) + Math.floor(h.n), mogna: ko.kompost?.mogna ?? 0 }; h.n = 0; } // sophögen blir komposten
  const c = ko.kompost;
  if (!c || c.rest < REST.kompostRest) return;
  c.mogna += (temperature(s) > REST.varm ? 1 : REST.kylaTakt) / (REST.kompostDygn * 24);
  if (c.mogna < 1) return;
  c.mogna = 0; c.rest -= REST.kompostRest;
  put(s, 'kompost', 1); count(s, 'kompostKlar');
  if (forstaGang(s, 'kompostKlar')) log(s, 'Den första komposten är färdig. Den gör fälten bördigare.', 'world');
}
import { isKlar } from './stationer';
import { living } from './folk';
import { TEK, knows, learn } from './teknik';
import { hash } from './karta';
import { temperature } from './vader';
import { put } from './lager';
