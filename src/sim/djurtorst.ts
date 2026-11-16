// Djurens törst (steg 10.10.31, Djuren i detalj: Djurens törst och vattenhon). Törsten växer per tid: på TAM.torstTim timmar
// vill djuret dricka igen, och det dricker en hel mängd vatten efter artens tal (dricker på raden i TAMDJUR). Var vattnet
// finns är rader i registret DJURVATTEN, prövade i ordning: snön när den ligger, stranden när hagen når vattnet (eller för
// djuret som går löst), och vattenhon i hagen. Ett djur som inte får vatten ger ingen mjölk (boskap.ts) och dör efter
// TAM.torstDod timmar gånger sin tålighet. Att fylla hon är ett arbete bredvid fodringen (hoVal, raden fyllaHo i val.ts)
import { TAM, Tamdjur, tamArt, tamDor, tamEg, tamdjurOf } from './tamdjur';
import { Hage, hageById } from './hage';
import { HO, hageVidVatten, hoFyll, hoI, hoarOf } from './vattenho';
import { snoPaMarken } from './vader';
import { TORST, drickPlats, hoKrok, vattenKarl } from './torst';
import { naVattnet } from './is';
import { kanGa } from './halsa';
import { ALDER, ageOf, byId, count, living } from './folk';
import { Station, isKlar, stationById, vidStation } from './stationer';
import { wearUsed } from './redskap';
import { toolsOf } from './agande';
import { karRymmer } from './vatskor';
import { notis } from './notiser';
import { Ting } from './agande';
import { HOUR_S, Person, State } from './typer';

const dricker = (d: Tamdjur) => tamArt(d.art).dricker ?? 1;
// var djuret dricker: namnet och om det fick vatten (dricka tar det ur hon)
export const DJURVATTEN: { namn: string; dricka: (s: State, d: Tamdjur, h: Hage | undefined) => boolean }[] = [
  { namn: 'sno', dricka: s => snoPaMarken(s) > 0 }, // när snön ligger äter djuren snö
  { namn: 'stranden', dricka: (s, d, h) => h ? hageVidVatten(s, h) : d.fahus === undefined }, // hagen når vattnet, eller djuret går löst och dricker vid sjön
  { namn: 'vattenhon', dricka: (s, d, h) => { const t = h && hoI(s, h); if (!t || !isKlar(t) || (t.vatten ?? 0) < dricker(d)) return false; t.vatten! -= dricker(d); return true; } },
];
export function djurTorstSteg(s: State, dt: number) {
  for (const d of tamdjurOf(s)) {
    d.torst = Math.min(1, (d.torst ?? 0) + dt / HOUR_S / TAM.torstTim);
    if (d.torst < 1) continue;
    const h = hageById(s, d.hage), rad = DJURVATTEN.find(r => r.dricka(s, d, h));
    if (rad) { d.torst = 0; d.torstTim = undefined; count(s, 'djurDrack_' + rad.namn); continue; }
    d.torstTim = (d.torstTim ?? 0) + dt / HOUR_S;
    if (d.torstTim >= TAM.torstDod * tamEg(d).talighet) {
      const q = d.agare !== undefined ? byId(s, d.agare) : undefined;
      tamDor(s, d, 'av törst');
      notis(s, 'djurtorst', `${q ? `${q.name}s` : 'Byns'} ${tamArt(d.art).ord[1]} dog av törst.`, q ? [q.id] : [], { x: d.x, y: d.y });
    }
  }
}
// hur många djur som dricker ur hon: djuren i hagen
const drickerUr = (s: State, t: Station) => tamdjurOf(s).filter(d => { const h = hageById(s, d.hage); return h && hoI(s, h) === t; }).length;
// vattenhon som p fyller (raden fyllaHo i val.ts): den med störst poäng, TORST.hamtaDjur gånger hur tom hon är och hur många
// djur som dricker ur den, där det kärl p bär får plats och ingen annan redan bär vatten dit. Och vattnet att fylla kärlet vid
export function hoVal(s: State, p: Person): { spot: { x: number; y: number }; ref: number; karl: string } | undefined {
  if (ageOf(p, s.now) < ALDER.vuxen || !kanGa(p)) return undefined;
  const karl = vattenKarl(s, p);
  if (!karl) return undefined;
  const ryms = karRymmer({ k: karl } as Ting);
  let best: Station | undefined, bs = 0;
  for (const t of hoarOf(s)) {
    if (!isKlar(t) || HO.rymmer - (t.vatten ?? 0) < ryms || living(s).some(o => o.task?.act === 'vatten' && o.task.ho && o.task.ref === t.id)) continue;
    const sc = TORST.hamtaDjur * (1 - (t.vatten ?? 0) / HO.rymmer) * drickerUr(s, t);
    if (sc > bs) { bs = sc; best = t; }
  }
  const spot = best && naVattnet(s, p) && drickPlats(s, p);
  return best && spot ? { spot, ref: best.id, karl } : undefined;
}
// framme vid vattnet: krukan eller säcken fylls och bärs till hon; framme vid hon hälls vattnet i, och kärlet blir kvar hos
// den som bar det (torst.ts anropar)
const karlHos = (s: State, p: Person, t: import('./typer').Task) => t.tool ? toolsOf(s, t.tool).find(q => q.hos === p.id) : undefined;
hoKrok.fylld = (s, p, t) => {
  const ho = stationById(s, t.ref), k = karlHos(s, p, t);
  if (!ho || !k) { p.task = undefined; return; }
  k.inne = { v: 'vatten', n: karRymmer(k) };
  const at = vidStation(ho); t.phase = 'back'; t.tx = at.x; t.ty = at.y; t.why = 'Bär vatten till vattenhon';
};
hoKrok.fram = (s, p, t) => { const ho = stationById(s, t.ref), k = karlHos(s, p, t); if (ho && k && hoFyll(s, ho, k, p) > 0) wearUsed(s, p, 1); };
