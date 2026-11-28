// Scenarier för fas 15, grupp 11 (resorna, steg 15.1.84–15.1.95).
import * as SIM from '../../sim';
import { SCENARIER, testBy } from './hjalp';

// ett sällskap ute på vägen från huvudbyn till platsen mal, med personerna ids (den första leder), i dagsljuset dagen efter
export function paVagen(s0: SIM.State, ids: number[], mal: number, skal: SIM.ResmalId = 'handel') {
  const s = SIM.cloneState(s0); s.now = Math.floor(s0.now / SIM.DAY) * SIM.DAY + SIM.DAY + 7 * SIM.HOUR;
  const folk = ids.map(id => s.people.find(q => q.id === id)!);
  const sl = SIM.nyttSallskap(s, folk[0]!, mal, skal)!; for (const p of folk.slice(1)) SIM.foljMed(s.varld!, sl, p);
  sl.ut = { samla: { x: 1, y: 1 }, kant: { x: 1, y: 1 } };
  for (const p of folk) SIM.gaBort(s, p);
  const hem = SIM.byPlats(s.varld!, sl.by)!, v = SIM.varldMark(s)!, q = s.varld!.platser!.find(p => p.nr === mal)!;
  sl.skede = 'ute'; sl.ruta = hem.y * v.w + hem.x;
  const vag = SIM.vagMellan(s.varld!, v, sl.ruta, q.y * v.w + q.x, 'fots', s.now)!;
  sl.vag = { fran: vag.fran, till: vag.till, steg: vag.steg }; sl.pos = 0; sl.gang = 0;
  return { s, sl, folk };
}
// sällskapet går var tionde minut (som TAKTER räknar det) tills det är hemma eller tiden gått; f körs efter varje bit
export function gaHem(x: { s: SIM.State; sl: SIM.Sallskap }, maxDygn: number, f?: () => void) {
  for (let m = 0; m < maxDygn * 24 * 6 && x!.sl.skede !== 'hemma' && x!.sl.skede !== 'forsvunnet'; m++) { x!.s.now += 10 * SIM.MIN; SIM.resaBehov(x!.s, 10 * SIM.MIN); f?.(); }
}
// vägens händelser stängs av medan f körs (en resa utan händelser)
export function utanHandelser<T>(f: () => T): T {
  const ids = SIM.vagHandelseIds(), d0 = ids.map(id => SIM.VAGHANDELSER[id]!.dygn);
  for (const id of ids) SIM.VAGHANDELSER[id]!.dygn = 0;
  try { return f(); } finally { ids.forEach((id, i) => { SIM.VAGHANDELSER[id]!.dygn = d0[i]!; }); }
}

SCENARIER.packresa = {
  text: 'Steg 15.1.88: packningen räknas ur kroppen. Maten är det resenärerna äter per dygn enligt kroppen, samma tal som i byn (ungefär två portioner för en vuxen), och vattnet så många vattensäckar som de dricker på den längsta sträckan utan vatten. En ledare i mitten packar så att maten och vattnet räcker en resa utan händelser',
  kor: () => {
    const s0 = SIM.cloneState(testBy(3)), vl0 = s0.varld!, v = SIM.varldMark(s0)!, hb = SIM.byPlats(vl0, vl0.huvud!)!;
    const vuxna = SIM.living(s0).filter(q => SIM.ageOf(q, s0.now) >= 20 && SIM.ageOf(q, s0.now) < 50 && SIM.personFart(s0, q) === 1);
    const [a, b] = vuxna;
    a!.pot = { ...a!.pot, flit: 10, mod: 10 }; // en ledare i mitten: marginalen 1,25
    // målet: den plats inom tre dygn med den längsta sträckan utan vatten där packningen ryms (så att vattnet prövas)
    let x: ReturnType<typeof paVagen> | undefined, pb: SIM.Packbehov | undefined, torr = 0;
    for (const q of vl0.platser ?? []) {
      const vd = q.nr === hb.nr ? undefined : SIM.vagDygn(s0, hb.y * v.w + hb.x, q.y * v.w + q.x);
      if (!vd || vd.dygn > 3 || vd.torr <= torr) continue;
      const y = paVagen(s0, [a!.id, b!.id], q.nr, 'se'), p = SIM.packbehov(y.s, y.sl);
      if (p?.ryms && p.vatten > 0) { x = y; pb = p; torr = vd.torr; }
    }
    const kropp = SIM.kroppensMat(a!, s0.now);
    x!.sl.pack = { brod: pb!.mat, vattensack: pb!.vatten };
    let minMatt = 1, minVatska = 1;
    utanHandelser(() => gaHem(x!, 20, () => { minMatt = Math.min(minMatt, x!.sl.behov?.matt ?? 1); minVatska = Math.min(minVatska, x!.sl.behov?.vatska ?? 1); }));
    const st = (k: string) => x!.s.stat?.[k] ?? 0, mat = (d: number) => Math.ceil(2 * SIM.matPerResenar() * d * 1.25 - 1e-9);
    return [
      [`en vuxen äter ${SIM.matPerResenar().toFixed(2)} portioner per dygn på vägen, som kroppen i byn (${kropp.toFixed(2)})`, Math.abs(SIM.matPerResenar() - kropp) < 1e-9 && SIM.matPerResenar() > 1.8 && SIM.matPerResenar() < 2.2],
      [`två resenärer i ${pb!.dygn} dygn med marginalen 1,25 tar ${pb!.mat} portioner`, pb!.mat >= mat(pb!.dygn - 0.01) && pb!.mat <= mat(pb!.dygn + 0.01)],
      [`den längsta sträckan utan vatten (${torr.toFixed(2)} dygn dit) ger ${pb!.vatten} vattensäckar, mer än tre per resenär och dygn`, pb!.vatten >= 2 * 3 * torr],
      [`resan kom hem (${x!.sl.skede})`, x!.sl.skede === 'hemma'],
      [`maten räckte: ingen tom mättnad (lägst ${minMatt.toFixed(2)}, ${st('resa utan mat')} gånger utan mat)`, minMatt > 0 && st('resa utan mat') === 0],
      [`packningen ryms (${pb!.vikt} av ${pb!.bar})`, pb!.ryms],
      [`vattnet räckte: de drack ur säckarna (${st('resa dricker ur säcken')} gånger) och var aldrig utan vatten (lägst vätska ${minVatska.toFixed(2)}, ${st('resa utan vatten')} gånger)`, minVatska > 0 && st('resa utan vatten') === 0 && (pb!.vatten === 0 || st('resa dricker ur säcken') >= 1)],
      [`och det mesta gick åt (${(x!.sl.pack.brod ?? 0)} av ${pb!.mat} portioner kvar)`, (x!.sl.pack.brod ?? 0) <= pb!.mat * 0.4 + 2],
    ];
  },
};

