// Scenarier för fas 12: resorna, handeln och platserna i världen (grenen par-resor).
import * as SIM from '../../sim';
import { SCENARIER, testBy, klockan, rikBy, tandEld } from './hjalp';
import { BEAT } from '../kor';

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

SCENARIER.handlarfackla = {
  text: 'Handlarens fackla (steg 12.1.152, handel.ts och GASTUTRUSTNING i gast.ts): handlaren har en fackla i sin utrustning och sätter upp den vid lägret när det är mörkt, så att handeln sker i ljus; på dagen är den släckt. I totalmörker tar handeln längre tid, som annat arbete',
  kor: () => {
    const s = SIM.cloneState(testBy(10));
    rikBy(s); tandEld(s);
    const kl = SIM.handlarKlan(s) ?? SIM.handlarKlan(s, true);
    SIM.handlarFram(s, kl!.klan.rad!);
    for (let i = 0; i < 2000 && s.handlare?.fas !== 'handlar'; i++) { SIM.step(s, BEAT); if (s.handlare?.fas === 'vantar') s.handlare.kvall = s.now + (BEAT - 2) * SIM.SEC; }
    const h = s.handlare!, hp = SIM.hp(s, h), t = (s.gastTing ?? []).find(x => x.k === 'fackla' && x.agare === hp.id);
    // på dagen släckt, på natten uppe vid lägret och lyser där
    h.gar = s.now + 30 * SIM.DAY; // (hen stannar medan klockan ställs)
    klockan(s, 12); SIM.handelSteg(s, 1); const dag = !h.fackla;
    klockan(s, 23); s.fire.lit = false; SIM.handelSteg(s, 1);
    const f = h.fackla, natt = !!f, ljus = f ? SIM.ljusAt(s, f.x + 0.5, f.y + 0.5) : 0;
    // en affär i ljuset och i mörkret: den tar längre tid i mörkret
    const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen && !q.gast)!;
    const dur = (morkt = false) => { h.affar = { vem: p.id, namn: p.name, byn: true, fas: 'fraga', kop: [], bud: [], hamta: [], framme: [], nej: 0, f: SIM.HANDEL.forstaBud, t: s.now }; const v = SIM.handlaVal(s, p); h.affar = undefined; return v && (!morkt || SIM.iMorker(s, v.spot.x, v.spot.y)) ? v.dur : 0; };
    const iLjus = dur();
    delete h.fackla; const iMorker = dur(true);
    return [
      [`handlaren har en fackla i utrustningen (${t ? 'ja' : 'nej'})`, !!t],
      [`på dagen är den släckt, på natten uppsatt mellan filtarna och lyser där (ljuset ${ljus.toFixed(2)})`, dag && natt && ljus > 0],
      [`handeln tar längre tid i totalmörker (${(iLjus / 1000).toFixed(0)} s i ljuset, ${(iMorker / 1000).toFixed(0)} s i mörkret)`, iLjus > 0 && iMorker > iLjus],
    ];
  },
};
