// Kör en by och räknar husen: hur ofta de planeras, byggs ut, byter funktion och rivs, och varför förrådshuset byggs eller inte
// (steg 9.9.4). Skriver måtten som JSON (används av hus.ts).
import './utc';
import { STEG_TIM, korBy } from './kor';
import { BYGGNADER, Byggnad, FN, HUS, housesOf, storeFull, DAY } from '../sim';
import { byggbehov } from '../sim/byggplan';

const [seed, dagar] = process.argv.slice(2).map(Number);
let steg = 0, rottMax = 0;
// timmar då ... (en gång i timmen)
const tim = { rutt: 0, full: 0, behov: 0, tomma: 0, forst: 0, harForrad: 0 };
const fore: Record<string, number> = {}; // det som gick före förrådshuset när det behövdes
let forradDag = -1;
const r = korBy(seed, dagar, s => {
  if (++steg % STEG_TIM) return;
  const hs = housesOf(s), rot = s.ruttet ?? 0;
  rottMax = Math.max(rottMax, rot);
  if (forradDag < 0 && hs.some(h => h.fn === 'forrad' && h.klar)) forradDag = (s.now - s.founded) / DAY;
  if (hs.some(h => h.fn === 'forrad')) { tim.harForrad++; return; }
  if (rot >= HUS.ruttMin) tim.rutt++;
  if (storeFull(s)) tim.full++;
  const tomma = hs.some(h => (h.fn ?? 'sovsal') === 'sovsal' && h.ag === undefined && h.klar && h.tom !== undefined);
  if ((rot >= HUS.ruttMin || storeFull(s)) && tomma) tim.tomma++;
  const b = byggbehov(s), i = b.findIndex(q => q.fn === 'forrad');
  if (i < 0) return;
  tim.behov++;
  if (i === 0) tim.forst++; else fore[b[0].fn] = (fore[b[0].fn] ?? 0) + 1;
});
const s = r.s, st = s.stat ?? {}, n = (k: string) => Math.round(st[k] ?? 0);
const planerat: Record<string, number> = {}, bytt: Record<string, number> = {};
for (const fn of FN) { if (n('planerat_' + fn)) planerat[fn] = n('planerat_' + fn); if (n('bytt_' + fn)) bytt[fn] = n('bytt_' + fn); }
const nu: Record<string, number> = {};
for (const h of housesOf(s)) if (h.klar) { const k = (BYGGNADER as Record<string, Byggnad>)[h.fn ?? 'sovsal'] ? h.fn ?? 'sovsal' : 'sovsal'; nu[k] = (nu[k] ?? 0) + 1; }
console.log(JSON.stringify({ seed, pop: r.n.pop, planerat, ut: n('planerat_ut'), utbyggt: n('utbyggt'), rivet: n('rivet'), rasat: n('rasat'), brand: n('brand'), brandVagg: n('brand vagg'), bytt, nu, husKopt: n('husKopt'),
  ruttnat: n('ruttnat'), rottMax, tim, fore, forradDag, vakter: r.vakter.length, larm: r.vakter }));
