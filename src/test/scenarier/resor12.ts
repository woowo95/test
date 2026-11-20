// Scenarier för fas 12: resorna, handeln och platserna i världen (grenen par-resor).
import * as SIM from '../../sim';
import { SCENARIER, testBy } from './hjalp';

// en by i världen med grannar och ett stort överskott, som slår upp ett handelsläger
function medLager() {
  const s = SIM.cloneState(testBy(10)), vl = s.varld!;
  const r = vl.rader!.find(x => SIM.lever(vl, x) && x.sort === 'by' && x.nr !== vl.huvud && SIM.byPlats(vl, x.nr)?.grannar?.length)!;
  r.tal.folk = 40; r.tal.mat = 4000;
  const rv = SIM.radVaror(r); rv.redskap = (rv.redskap ?? 0) + 400; r.tal.rikedom = SIM.radRikedomUr(r);
  const h = SIM.nyttHandelslager(s, vl, r, s.now)!, p = SIM.byPlats(vl, h.nr)!;
  return { s, vl, r, h, p };
}
const slutFor = (vl: SIM.Varlden, nr: number) => (vl.ko ?? []).find(k => k.typ === 'handelslagerSlut' && k.sak === nr);

SCENARIER.lagerslut = {
  text: 'Handelslägrets sluttid (steg 12.1.146, utpost.ts och ort.ts): vid sin tid bryts lägret upp, och dess rad och plats tas bort ur världen, så att sparningen inte växer; krönikan behåller namnet. Byn tror att lägret finns kvar så länge någon minns det: platsen ligger kvar som minnesplats, den som reser dit ser att den är borta, och när sällskapet kommer hem vet byn det',
  kor: () => {
    // ingen i byn vet om lägret: raden och platsen är borta och inget minns den
    const a = medLager(), na = a.h.nr, pa = a.p.nr;
    SIM.KOHANDELSER.handelslagerSlut(a.s, a.vl, slutFor(a.vl, na)!);
    const radBorta = !SIM.radNr(a.vl, na) && !SIM.varldPlatsNr(a.vl, pa) && !(a.vl.minnesplatser ?? []).some(q => q.nr === pa);
    const relBorta = [a.vl.rel, a.vl.lage, a.vl.slakt].every(m => !Object.keys(m ?? {}).some(k => k.split(/[>-]/).map(Number).includes(na)));
    const kron = (a.vl.kronika ?? []).filter(h => h.by === na || h.mot === na).map(h => SIM.varldHandelseText(a.vl, h));
    const namnKvar = kron.length >= 2 && kron.every(t => t.includes(a.h.namn));
    // två i huvudbyn vet om lägret: det blir en minnesplats som byn tror finns
    const b = medLager(), nb = b.p.nr, [x, y] = SIM.living(b.s).filter(q => SIM.ageOf(q, b.s.now) >= 20 && SIM.ageOf(q, b.s.now) < 50);
    for (const q of [x!, y!]) SIM.larOrt(b.s, q, nb, SIM.O_KANT, 1);
    SIM.raknaBynVet(b.s);
    SIM.KOHANDELSER.handelslagerSlut(b.s, b.vl, slutFor(b.vl, b.h.nr)!);
    SIM.raknaBynVet(b.s);
    const minne = (b.vl.minnesplatser ?? []).find(q => q.nr === nb), tror = SIM.bynKanner(b.s, nb)?.v === SIM.O_KANT && SIM.platsText(b.s, nb) === b.p.namn;
    const ute = !SIM.varldPlatsNr(b.vl, nb) && !SIM.radNr(b.vl, b.h.nr);
    // x reser dit: framme är platsen tom, x glömmer den, och hemma får byn veta
    const sl = SIM.nyttSallskap(b.s, x!, nb, 'se')!;
    sl.skede = 'ute'; SIM.radBesok(b.s, sl, b.s.now);
    const sag = !SIM.findL(x!, 'ort', nb) && !!SIM.findL(y!, 'ort', nb) && sl.dagbok.some(d => d[1].includes('fanns ingen längre'));
    SIM.hemkomst(b.s, sl, b.s.now); SIM.raknaBynVet(b.s);
    const glomd = !SIM.findL(y!, 'ort', nb) && SIM.bynKanner(b.s, nb) === undefined && !(b.vl.minnesplatser ?? []).some(q => q.nr === nb);
    return [
      [`vid sluttiden tas lägret ${a.h.namn}s rad och plats bort ur världen, och ingen minns det`, radBorta],
      [`byarnas relationer och lägen med lägret glöms`, relBorta],
      [`krönikan behåller lägrets namn (${kron.join(' / ')})`, namnKvar],
      [`två som vet om lägret: platsen ligger kvar som minnesplats, och byn tror att den finns (${minne?.namn ?? 'ingen'})`, !!minne && tror && ute],
      [`den som reser dit ser att lägret är borta och glömmer det, den andra tror det ännu`, sag],
      [`hemma berättar sällskapet det, och minnesplatsen tas bort när ingen längre minns den`, glomd],
    ];
  },
};
