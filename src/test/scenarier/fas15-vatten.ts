// Scenarier för vattnet på resorna och resten av resorna i världen (fas 15, system 15.1: steg 15.1.86, 15.1.87, 15.1.91,
// 15.1.93–15.1.95).
import * as SIM from '../../sim';
import { SCENARIER, testBy } from './hjalp';
import { utanHandelser } from './fas15-11';

// en färd från en by i världen (inte huvudbyns rad) till en granne, som packat och gett sig av; byn har mat nog och kan sy
// vattensäckar och tält. g: varugruppen färden bär
export function radFard(s0: SIM.State, opt: { min?: number; pack?: Record<string, number> } = {}) {
  const s = SIM.cloneState(s0), vl = s.varld!;
  // grannarna längst bort först (en resa på några dygn), utom huvudbyn
  const par = (vl.rader ?? []).filter(r => r.nr !== vl.huvud && r.tal.folk >= 4).flatMap(r => (SIM.byPlats(vl, r.nr)?.grannar ?? [])
    .map(g => ({ r, q: SIM.varldPlatsNr(vl, g.nr)?.by, dygn: g.dygn })).filter(x => x.q !== undefined && x.q !== vl.huvud && !!SIM.radNr(vl, x.q)))
    .filter(x => x.dygn >= (opt.min ?? 1.5)).sort((a, b) => a.dygn - b.dygn);
  for (const { r, q } of par) {
    r.tal.mat = Math.max(r.tal.mat, 200);
    for (const k of ['vattensack', 'talt', 'ryggsack']) if (!r.tek.includes(k)) r.tek.push(k);
    const f: SIM.RadFard = { id: 99990, fran: r.nr, till: q!, g: 'mat', n: 0, t0: s.now, t1: s.now + SIM.DAY, besked: 'besked', folk: ['A', 'B', 'C'] };
    (vl.farder ??= []).push(f);
    const fore = r.tal.mat;
    SIM.packaFard(s, vl, f, SIM.fardFart(s));
    if (opt.pack) { f.pack = { ...opt.pack }; f.behov = { matt: 1, vatska: 1, ork: 1, fulla: SIM.fullaKlunkar(f.pack), foder: 0 }; }
    if (!SIM.gaUt(s, vl, f, f.fran, f.till, 'ut')) { vl.farder = vl.farder.filter(x => x !== f); continue; }
    return { s, vl, r, f, fore };
  }
  return undefined;
}
// färden går tills den är hemma (eller dygnen tagit slut); svarar med dygnen den tog
// (dygnen den tog, maten den bar strax innan den kom hem, hur mycket byns mat steg när den kom hem och den lägsta mättnaden)
function fardHem(x: NonNullable<ReturnType<typeof radFard>>, dygn = 20) {
  const t0 = x.s.now;
  let kvar = 0, steg = 0, minMatt = 1;
  utanHandelser(() => {
    for (let m = 0; m < dygn * 24 * 6 && x.vl.farder!.includes(x.f); m++) {
      kvar = SIM.FOOD.reduce((a, k) => a + Math.floor(x.f.pack?.[k] ?? 0), 0); const fore = x.r.tal.mat;
      x.s.now += 10 * SIM.MIN; SIM.varldTill(x.s, x.s.now);
      minMatt = Math.min(minMatt, x.f.behov?.matt ?? 1);
      if (!x.vl.farder!.includes(x.f)) steg = x.r.tal.mat - fore;
    }
  });
  return { dygn: (x.s.now - t0) / SIM.DAY, kvar, steg, minMatt };
}

SCENARIER.fardpack = {
  text: 'Steg 15.1.86: packningen och behoven för alla resor. En färd från en by i världen packar mat, vatten och tält ur byns förråd med samma packbehov som huvudbyns sällskap, i hela saker (vattensäckarna med åtta klunkar var, högst två per resenär), och äter, dricker och rastar på vägen som sällskapet. Det som inte går åt kommer hem till byns förråd. En färd som packat för lite får slut på maten och väljer som huvudbyns sällskap',
  kor: () => {
    const s0 = testBy(3), x = radFard(s0)!, st0 = { ...x.s.stat ?? {} };
    const pack = { ...x.f.pack }, mat = SIM.FOOD.reduce((a, k) => a + (pack[k] ?? 0), 0), tog = x.fore - x.r.tal.mat;
    const hela = Object.values(pack).every(n => Number.isInteger(n));
    const h = fardHem(x), st = (k: string) => (x.s.stat?.[k] ?? 0) - (st0[k] ?? 0);
    // en färd med en portion: maten tar slut, och ledaren väger MATSLUT som huvudbyns ledare
    const lite = radFard(s0, { pack: { torrkott: 1 } })!, l0 = { ...lite.s.stat ?? {} };
    fardHem(lite);
    const matslut = Object.keys(lite.s.stat ?? {}).filter(k => k.startsWith('fard matslut ') && (lite.s.stat![k]! - (l0[k] ?? 0)) > 0);
    return [
      [`färden packade ${mat} portioner, ${pack.vattensack ?? 0} vattensäckar och ${pack.talt ?? 0} tält, i hela saker (${JSON.stringify(pack)})`, mat > 0 && hela && (pack.vattensack ?? 0) <= 3 * SIM.RESA.sackar],
      [`maten togs ur byns förråd (${tog} portioner)`, Math.abs(tog - mat) < 1e-6],
      [`färden åt på vägen (lägsta mättnaden ${h.minMatt.toFixed(2)}, ${mat - h.kvar} portioner uppätna) och kom hem efter ${h.dygn.toFixed(2)} dygn`, h.minMatt > 0 && h.kvar < mat && !x.vl.farder!.includes(x.f)],
      [`ingen törstade eller svalt ihjäl (${st('fard törstade ihjäl')}, ${st('fard svalt ihjäl')})`, !st('fard törstade ihjäl') && !st('fard svalt ihjäl')],
      [`det som inte gick åt kom hem till byns förråd (${h.kvar} portioner kvar, byns mat steg med ${h.steg.toFixed(1)})`, h.kvar > 0 && h.steg >= h.kvar - 1],
      [`en färd med en portion fick slut på maten och ledaren valde (${matslut.join(', ') || 'inget'})`, matslut.length > 0],
    ];
  },
};
