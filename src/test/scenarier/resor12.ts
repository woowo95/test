// Scenarier för fas 12: resorna, handeln och platserna i världen (grenen par-resor).
import * as SIM from '../../sim';
import { SCENARIER, testBy, klockan, rikBy, tandEld } from './hjalp';
import { BEAT } from '../kor';

// en by i världen med grannar och ett stort överskott, som slår upp ett handelsläger
// (den första byn där ett läger får plats: nära en by på en kust eller i en trång dal finns ibland ingen ledig ruta)
function medLager() {
  const t = testBy(10), nr = t.varld!.rader!.filter(x => SIM.lever(t.varld!, x) && x.sort === 'by' && x.nr !== t.varld!.huvud && SIM.byPlats(t.varld!, x.nr)?.grannar?.length).map(x => x.nr);
  for (const n of nr) {
    const s = SIM.cloneState(t), vl = s.varld!, r = SIM.radNr(vl, n)!;
    r.tal.folk = 40; r.tal.mat = 4000;
    const rv = SIM.radVaror(r); rv.redskap = (rv.redskap ?? 0) + 400; r.tal.rikedom = SIM.radRikedomUr(r);
    const h = SIM.nyttHandelslager(s, vl, r, s.now);
    if (h) return { s, vl, r, h, p: SIM.byPlats(vl, h.nr)! };
  }
  throw new Error('inget handelsläger fick plats');
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
    // en väckt by som inget minns räknar sin kunskap: huvudbyns minnesplats ligger kvar (steg 12.1.245)
    SIM.raknaBynVet({ ...b.s, people: [], ting: [], vackt: 999 } as SIM.State);
    const vacktRor = (b.vl.minnesplatser ?? []).some(q => q.nr === nb);
    // x reser dit: framme är platsen tom, x glömmer den, och hemma får byn veta
    const sl = SIM.nyttSallskap(b.s, x!, nb, 'se')!;
    sl.skede = 'ute'; SIM.radBesok(b.s, sl, b.s.now);
    const sag = !SIM.findL(x!, 'ort', nb) && !!SIM.findL(y!, 'ort', nb) && sl.dagbok.some(d => d[1].includes('fanns ingen längre'));
    // minnesplatsen raderas medan sällskapet är framme: vägen hem räknas från rutan där det står (steg 12.1.246)
    const mp = b.vl.minnesplatser?.find(q => q.nr === nb), vm = SIM.varldMark(b.s)!, sparat = b.vl.minnesplatser;
    sl.skede = 'framme'; sl.framme = b.s.now - 30 * SIM.DAY; sl.ruta = mp ? mp.y * vm.w + mp.x : undefined; sl.vag = undefined;
    b.vl.minnesplatser = undefined;
    SIM.resaBehov(b.s, 60 * SIM.SEC);
    const vagHem = (sl.skede as string) === 'hemat' && !!sl.vag && SIM.vagenRutor(b.s, sl).length > 1;
    b.vl.minnesplatser = sparat;
    SIM.hemkomst(b.s, sl, b.s.now); SIM.raknaBynVet(b.s);
    const glomd = !SIM.findL(y!, 'ort', nb) && SIM.bynKanner(b.s, nb) === undefined && !(b.vl.minnesplatser ?? []).some(q => q.nr === nb);
    // att lägret är borta är en uppgift med sin tid: en karta med äldre uppgifter lär inte ut det igen, en nyare gör det (steg 12.1.245)
    const bortaT = y!.ortBorta?.[nb];
    SIM.larOrt(b.s, y!, nb, SIM.O_KANT, 1, { t: b.s.now - SIM.HOUR, src: x!.id });
    const aldreInte = !SIM.findL(y!, 'ort', nb);
    SIM.larOrt(b.s, y!, nb, SIM.O_KANT, 1, { t: b.s.now + 1, src: x!.id });
    const nyareJa = !!SIM.findL(y!, 'ort', nb) && y!.ortBorta?.[nb] === undefined;
    return [
      [`vid sluttiden tas lägret ${a.h.namn}s rad och plats bort ur världen, och ingen minns det`, radBorta],
      [`byarnas relationer och lägen med lägret glöms`, relBorta],
      [`krönikan behåller lägrets namn (${kron.join(' / ')})`, namnKvar],
      [`två som vet om lägret: platsen ligger kvar som minnesplats, och byn tror att den finns (${minne?.namn ?? 'ingen'})`, !!minne && tror && ute],
      [`den som reser dit ser att lägret är borta och glömmer det, den andra tror det ännu`, sag],
      [`en väckt by rensar inte huvudbyns minnesplatser`, vacktRor],
      [`sällskapet får en väg hem från där det står, fast minnesplatsen raderats medan det var framme`, !!mp && vagHem],
      [`hemma berättar sällskapet det, och minnesplatsen tas bort när ingen längre minns den`, glomd],
      [`att lägret är borta är en uppgift med sin tid (${bortaT !== undefined}): en äldre karta lär inte ut det, en nyare gör det`, bortaT !== undefined && aldreInte && nyareJa],
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
    // i det svaga skenet (steg 12.1.236): facklan står så långt bort att platsen är mörk men i skenet, och affären går som arbetet där
    let iSken = 0;
    if (f) {
      h.affar = { vem: p.id, namn: p.name, byn: true, fas: 'fraga', kop: [], bud: [], hamta: [], framme: [], nej: 0, f: SIM.HANDEL.forstaBud, t: s.now };
      const v = SIM.handlaVal(s, p); h.affar = undefined;
      if (v) for (let dx = 0.5; dx < 20 && !iSken; dx += 0.25) {
        h.fackla = { ...f, x: Math.floor(v.spot.x + dx), y: Math.floor(v.spot.y) };
        if (SIM.iMorker(s, v.spot.x, v.spot.y) && SIM.iSkenet(s, v.spot.x, v.spot.y)) iSken = dur(true);
      }
    }
    delete h.fackla; const iMorker = dur(true);
    return [
      [`handlaren har en fackla i utrustningen (${t ? 'ja' : 'nej'})`, !!t],
      [`på dagen är den släckt, på natten uppsatt mellan filtarna och lyser där (ljuset ${ljus.toFixed(2)})`, dag && natt && ljus > 0],
      [`handeln tar längre tid i totalmörker (${(iLjus / 1000).toFixed(0)} s i ljuset, ${(iMorker / 1000).toFixed(0)} s i mörkret)`, iLjus > 0 && iMorker > iLjus],
      [`i det svaga skenet går handeln som arbetet där (${(iSken / 1000).toFixed(0)} s, ${(iLjus / SIM.MORKER.skenFart / 1000).toFixed(0)} s väntat)`, iSken > iLjus && iSken < iMorker && Math.abs(iSken - iLjus / SIM.MORKER.skenFart) < 1000],
    ];
  },
};

SCENARIER.gomslut = {
  text: 'Gömmorna försvinner när tiden gått ut (steg 12.1.164, laggPlats i landmarken.ts och ort.ts): en plats i världen med sluttid får en post i världens kö vid sin tid och tas bort då; de som minns gömman tror att den finns (en minnesplats) tills någon sett att den är borta. Ett handelslägers plats tas bort av lägrets egen regel',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!, hb = SIM.byPlats(vl, vl.huvud!)!, v = SIM.varldMark(s)!;
    const folk = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= 20 && SIM.ageOf(q, s.now) < 50).slice(0, 2);
    const mal = hb.grannar!.map(g => SIM.varldPlatsNr(vl, g.nr)!).find(p => p && SIM.vagMellan(vl, v, hb.y * v.w + hb.x, p.y * v.w + p.x, 'fots', s.now))!;
    const sl = SIM.nyttSallskap(s, folk[0]!, mal.nr, 'handel')!; SIM.foljMed(vl, sl, folk[1]!);
    for (const x of folk) SIM.gaBort(s, x);
    const vag = SIM.vagMellan(vl, v, hb.y * v.w + hb.x, mal.y * v.w + mal.x, 'fots', s.now)!;
    sl.skede = 'ute'; sl.vag = { fran: vag.fran, till: vag.till, steg: vag.steg };
    const r = SIM.vagenRutor(s, sl); sl.pos = Math.floor((r.length - 1) * 0.3); sl.ruta = r[sl.pos]; sl.gang = 0;
    const g = SIM.laggGomma(s, sl, { yxa: 2 }, s.now)!;
    const post = (vl.ko ?? []).find(k => k.typ === 'platsUpphor' && k.sak === g.nr);
    // innan tiden: ingenting händer; vid tiden: gömman är borta ur världen, men de som minns den har en minnesplats
    SIM.KOHANDELSER.platsUpphor!(s, vl, post!);
    const borta = !SIM.varldPlatsNr(vl, g.nr), minne = (vl.minnesplatser ?? []).some(q => q.nr === g.nr);
    // ett handelsläger med sluttid: platsens egen post tar inte bort lägret, det gör lägrets regel
    // en rik by med en ledig ruta för lägret nära sig (en by inträngd mellan vatten och berg får inget läger)
    let h: SIM.VarldRad | undefined;
    for (const rad of vl.rader!.filter(x => SIM.lever(vl, x) && x.sort === 'by' && x.nr !== vl.huvud && SIM.byPlats(vl, x.nr)?.grannar?.length)) {
      rad.tal.folk = 40; rad.tal.mat = 4000; const rv = SIM.radVaror(rad); rv.redskap = (rv.redskap ?? 0) + 400; rad.tal.rikedom = SIM.radRikedomUr(rad);
      h = SIM.nyttHandelslager(s, vl, rad, s.now);
      if (h) break;
    }
    const hp = SIM.byPlats(vl, h!.nr)!;
    const hpost = (vl.ko ?? []).find(k => k.typ === 'platsUpphor' && k.sak === hp.nr);
    if (hpost) SIM.KOHANDELSER.platsUpphor!(s, vl, hpost);
    const lagerKvar = !!SIM.varldPlatsNr(vl, hp.nr) && h!.tal.folk > 0;
    return [
      [`gömman har en post i världens kö vid sin sluttid (${post ? ((post.t - s.now) / SIM.DAY).toFixed(0) + ' dygn' : 'ingen'})`, !!post && post.t === g.till && g.till === s.now + SIM.RESA.gommaDygn * SIM.DAY],
      [`vid tiden är gömman borta ur världen, och de som gömde den minns den som en minnesplats`, borta && minne],
      [`handelslägrets plats tas inte bort av platsens post utan av lägrets egen regel`, !!hpost && lagerKvar],
    ];
  },
};

SCENARIER.vagglomska = {
  text: 'Vägarna i världen snabbare (steg 12.1.11): en sparad väg som ingen gått på sedan VAGVAL.glomDygn glöms och räknas igen när någon går den, och resans poäng för varje plats räknas en gång per RESA.poangTim timmar och person',
  kor: () => {
    const s = SIM.cloneState(testBy(30)), vl = s.varld!, v = SIM.varldMark(s)!, hem = SIM.byPlats(vl, vl.huvud!)!, a0 = hem.y * v.w + hem.x;
    vl.vagar = [];
    const by = vl.platser!.find(q => q.k === 'by' && q !== hem && SIM.vagMellan(vl, v, a0, q.y * v.w + q.x, 'fots', s.now))!, b0 = by.y * v.w + by.x;
    const vag = SIM.sparadVag(vl, 'fots', a0, b0)!, G = SIM.VAGVAL.glomDygn * SIM.DAY;
    SIM.glomVagar(vl, s.now + G - SIM.DAY);
    const kvarFore = SIM.sparadVag(vl, 'fots', a0, b0) === vag;
    SIM.vagMellan(vl, v, a0, b0, 'fots', s.now + 5 * SIM.DAY); // någon går vägen
    SIM.glomVagar(vl, s.now + G + 4 * SIM.DAY);
    const kvarGangen = SIM.sparadVag(vl, 'fots', a0, b0) === vag && vag.b === s.now + 5 * SIM.DAY;
    SIM.glomVagar(vl, s.now + G + 6 * SIM.DAY);
    const glomd = !SIM.sparadVag(vl, 'fots', a0, b0) && !vl.vagar.length;
    const igen = SIM.vagMellan(vl, v, a0, b0, 'fots', s.now + G + 7 * SIM.DAY);
    const raknadIgen = !!igen && igen !== vag && igen.steg === vag.steg && SIM.sparadVag(vl, 'fots', a0, b0) === igen;
    // poängen: en nyfiken och modig bybo som hört rykten om en plats; modet sjunker, men poängen är densamma tills timmen gått
    vl.bud = undefined;
    const a = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= 18 && SIM.ageOf(q, s.now) < 50 && SIM.kanGa(q) && !SIM.isSick(q, s.now))!;
    for (const p of SIM.living(s)) p.lardomar = (p.lardomar ?? []).filter(l => l.k !== 'ort' || l.v !== SIM.O_RYKTE);
    const mal = vl.platser!.filter(q => q.nr !== hem.nr && q.k !== 'by' && (SIM.RESMAL.se.mal as readonly string[]).includes(q.k) && SIM.kannerOrt(s, a, q.nr) === undefined)
      .sort((x, y) => Math.hypot(x.x - hem.x, x.y - hem.y) - Math.hypot(y.x - hem.x, y.y - hem.y))[0]!;
    SIM.larOrt(s, a, mal.nr, SIM.O_RYKTE, 1);
    a.pot.nyfikenhet = 18; a.pot.mod = 18;
    s.now = Math.floor(s.now / (SIM.RESA.poangTim * SIM.HOUR)) * SIM.RESA.poangTim * SIM.HOUR; // timmens början
    const p1 = SIM.resaPlan(s, a, 99, 99);
    a.pot.mod = 3;
    const p2 = SIM.resaPlan(s, a, 99, 99), nod = SIM.resaPlan(s, a, (p1?.dygn ?? 1) * 0.1, 99);
    s.now += SIM.RESA.poangTim * SIM.HOUR;
    const p3 = SIM.resaPlan(s, a, 99, 99);
    return [
      ['en väg som någon gått på inom VAGVAL.glomDygn finns kvar', kvarFore && kvarGangen],
      ['en väg som ingen gått på sedan VAGVAL.glomDygn glöms', glomd],
      ['den glömda vägen räknas igen när någon går den, och blir densamma', raknadIgen],
      [`poängen är densamma inom timmen fast modet sjunkit (${p1?.sc.toFixed(3)} och ${p2?.sc.toFixed(3)})`, !!p1 && p2?.sc === p1.sc],
      [`byns förråd räknas varje gång (i nöd ${nod?.sc.toFixed(3) ?? 'ingen resa'})`, !!p1 && (nod?.sc ?? 0) < p1.sc],
      [`efter timmen räknas poängen om med det lägre modet (${p3?.sc.toFixed(3) ?? 'ingen resa'})`, !!p1 && (p3?.sc ?? 0) < p1.sc],
    ];
  },
};
