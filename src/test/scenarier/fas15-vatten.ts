// Scenarier för vattnet på resorna och resten av resorna i världen (fas 15, system 15.1: steg 15.1.86, 15.1.87, 15.1.91,
// 15.1.93–15.1.95).
import * as SIM from '../../sim';
import { SCENARIER, testBy } from './hjalp';
import { paVagen, utanHandelser } from './fas15-11';

// en färd från en by i världen (inte huvudbyns rad) till en granne, som packat och gett sig av; byn har mat nog och kan sy
// vattensäckar och tält. g: varugruppen färden bär
export function radFard(s0: SIM.State, opt: { min?: number; pack?: Record<string, number>; syn?: true /* en by med förbindelse till huvudbyn och inom räckhåll för en flytt dit */ } = {}) {
  const s = SIM.cloneState(s0), vl = s.varld!;
  // grannarna längst bort först (en resa på några dygn), utom huvudbyn
  const par = (vl.rader ?? []).filter(r => r.nr !== vl.huvud && r.tal.folk >= 4 && (!opt.syn || !!r.syn && !!SIM.byPlats(vl, r.nr)?.grannar?.some(g => SIM.varldPlatsNr(vl, g.nr)?.by === vl.huvud && g.dygn <= SIM.FLYTT.dygn))).flatMap(r => (SIM.byPlats(vl, r.nr)?.grannar ?? [])
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

SCENARIER.fardhandelser = {
  text: 'Steg 15.1.87: vägens händelser för alla resor. En färd från en by i världen går genom samma VAGHANDELSER som huvudbyns sällskap: oväder och att gå vilse kostar tid, sjukdom och olyckor räknas i hela personer, och rövare från ett läger nära vägen stoppar färden, som betalar, flyr eller slåss med byns utrustning. De som dör dras ur byns folk och färdens namn. Det som händer skrivs i färdens dagbok, och döden och rånet i världens krönika',
  kor: () => {
    const x = radFard(testBy(3))!, { s, vl, f } = x, sl = SIM.fardSom(f);
    // vägens händelser under tio dygn i spelet, var tionde minut
    const st0 = { ...s.stat ?? {} };
    for (let m = 0; m < 10 * 24 * 6; m++) SIM.vagHandelser(s, sl, s.now + m * 10 * SIM.MIN, 10 * SIM.MIN);
    const hande = Object.keys(s.stat ?? {}).filter(k => k.startsWith('resor by:') && k.includes(' h ') && (s.stat![k]! - (st0[k] ?? 0)) > 0);
    const dagbok = (f.dagbok ?? []).length;
    // ett rövarläger vid vägen: rövarna stoppar färden tills den har slagits, och de som dör är hela personer ur byn
    const r = vl.rader!.find(q => SIM.lever(vl, q) && q.sort === 'by' && q.nr !== f.fran && SIM.byPlats(vl, q.nr)?.grannar?.length)!;
    const L = SIM.nyttLager(s, vl, r, 30, s.now)!, lp = SIM.byPlats(vl, L.nr)!, w = SIM.varldMark(s)!.w;
    f.vg!.ruta = lp.y * w + lp.x; f.pack = {}; const som = SIM.fardSom(f); // inget att betala med: de flyr eller slåss
    const folk0 = x.r.tal.folk, namn0 = f.folk!.length, kr0 = vl.nastaHandelse ?? 0, st1 = { ...s.stat ?? {} };
    let i = 0;
    for (; i < 10; i++) SIM.VAGHANDELSER.ran!.gor(s, som, s.now); // inget att betala med: de betalar inget och får gå
    // en strid mot rövarna, som när färden inte kan betala: färdfolket slåss med byns utrustning
    let strider = 0, vann = 0;
    for (let j = 0; j < 20 && vl.farder!.includes(f) && f.folk!.length === namn0; j++) { const u = SIM.vagStrid(s, som, Array.from({ length: 6 }, () => SIM.rovarKampe(L)), 'rovare', s.now); strider++; if (u.vann) vann++; }
    if (f.folk!.length === namn0) SIM.FARDVAG.dor!(s, som, 2, 'drap', s.now); // föll ingen i striderna: två dör av såren
    const doda = namn0 - (f.folk?.length ?? 0), kron = (vl.kronika ?? []).filter(h => h.nr > kr0).map(h => h.k), val = ['betala', 'fly', 'slass'].map(k => `${k} ${(s.stat?.[`resa rån ${k}`] ?? 0) - (st1[`resa rån ${k}`] ?? 0)}`).join(', ');
    const ranText = (f.dagbok ?? []).some(([, , k]) => k === 'ran' || k === 'strid');
    return [
      [`färden råkade ut för vägens händelser på tio dygn (${hande.map(k => k.split(' h ')[1]).join(', ') || 'inga'}) och de står i dess dagbok (${dagbok})`, hande.length > 0 && dagbok > 0],
      [`rövarna stoppade färden (${i} gånger: ${val}) och det står i dagboken`, ranText],
      [`${strider} strider mot sex rövare (färden vann ${vann}); ${doda} av färdfolket dog, i hela personer ur byns folk (${folk0} → ${x.r.tal.folk}) och färdens namn`, doda > 0 && folk0 - x.r.tal.folk === doda && Number.isInteger(x.r.tal.folk)],
      [`världens krönika minns rånet och döden (${[...new Set(kron)].join(', ')})`, kron.includes('fardRan') && kron.includes('fardDod')],
    ];
  },
};

SCENARIER.flyttmote = {
  text: 'Steg 15.1.91 (mötet): ett sällskap från huvudbyn möter några som flyttar från en by i nöd. De som inte har mat nog för vägen ber om mat, och ledaren väger varje portion med samma poäng som när maten tar slut: hungern hos dem som flyttar mot vad portionen är värd för det egna sällskapet. Det som ges är en gåva mellan byarna, och väger huvudbyn tyngre än målet följer de som flyttar med hem som nybyggare',
  kor: () => {
    const x = radFard(testBy(3), { pack: { torrkott: 1 }, min: 0 })!;
    x.f.flytt = 4; delete x.f.folk; delete x.f.besked;
    const vuxna = SIM.living(x.s).filter(q => SIM.ageOf(q, x.s.now) >= 20 && SIM.ageOf(q, x.s.now) < 50 && SIM.personFart(x.s, q) === 1);
    const mal = SIM.byPlats(x.vl, x.vl.huvud!)!.grannar![0]!.nr;
    const fore = (rik: boolean, trangt: boolean) => {
      const y = paVagen(x.s, [vuxna[0]!.id, vuxna[1]!.id], mal), vl = y.s.varld!, f = vl.farder!.find(q => q.id === x.f.id)!, r = SIM.radNr(vl, f.fran)!;
      y.sl.pack = rik ? { bar: 60 } : {}; // bär, som är värda mindre än hungern de stillar
      if (trangt) SIM.radNr(vl, f.till)!.tal.folk = 100000; // målet är fullt: huvudbyn väger tyngre
      const rel0 = SIM.relation(vl, r.nr, vl.huvud!) ?? 0, mat0 = SIM.FOOD.reduce((a, k) => a + Math.floor(f.pack![k] ?? 0), 0);
      SIM.flyttMote(y.s, vl, y.sl, f, y.folk, y.s.now);
      const mat = SIM.FOOD.reduce((a, k) => a + Math.floor(f.pack![k] ?? 0), 0);
      return { gav: mat - mat0, rel: (SIM.relation(vl, r.nr, vl.huvud!) ?? 0) - rel0, till: f.till, huvud: vl.huvud!, bad: (y.s.stat?.['resa bön om mat'] ?? 0) > 0, dagbok: y.sl.dagbok.map(d => d[1]).join(' ') };
    };
    const rik = fore(true, false), fattig = fore(false, false), hem = fore(true, true);
    return [
      [`de som flyttar bad om mat och fick ${rik.gav} portioner av ett sällskap med mycket mat; relationen steg med ${rik.rel}`, rik.bad && rik.gav > 0 && rik.rel > 0],
      [`ett sällskap utan mat att avvara gav inget (${fattig.gav}: ${fattig.dagbok})`, fattig.bad && fattig.gav === 0],
      [`de flyttar dit de skulle när målet väger tyngre (${rik.till === rik.huvud ? 'till huvudbyn' : 'till målet'})`, rik.till !== rik.huvud],
      [`och följer med hem som nybyggare när huvudbyn väger tyngre (${hem.till === hem.huvud ? 'till huvudbyn' : 'till målet'}: ${hem.dagbok})`, hem.till === hem.huvud],
    ];
  },
};
