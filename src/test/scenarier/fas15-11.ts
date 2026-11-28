// Scenarier för fas 15, grupp 11 (resorna, steg 15.1.84–15.1.95).
import * as SIM from '../../sim';
import { SCENARIER, testBy } from './hjalp';

// en färds post i kön, eller (sedan steg 15.1.85, när färderna går) en post för den färd som är på väg dit eller hem
export function fardPost(vl: SIM.Varlden, f: SIM.RadFard, typ: 'fardFram' | 'fardHem'): SIM.KoPost | undefined {
  const k = vl.ko?.find(q => q.typ === typ && q.sak === f.id);
  if (k) return k;
  return (typ === 'fardFram' ? f.gar === 'ut' : f.gar === 'hem') ? { t: typ === 'fardFram' ? f.t1 : f.t2 ?? f.t1, nr: 0, typ, sak: f.id } : undefined;
}
// flytten: köposterna och (sedan steg 15.1.85) färderna med de som flyttar, som poster med samma fält (sak: dit, data: fran och n)
const flyttMinne = new WeakMap<SIM.RadFard, SIM.KoPost>();
export function flyttPoster(vl: SIM.Varlden): SIM.KoPost[] {
  const ko = (vl.ko ?? []).filter(p => p.typ === 'flytt');
  const f = (vl.farder ?? []).filter(x => x.flytt).map(x => { let p = flyttMinne.get(x); if (!p) { p = { t: x.t1, nr: 0, typ: 'flytt', sak: x.till, data: { fran: x.fran, n: x.flytt! } }; flyttMinne.set(x, p); } return p; });
  return [...ko, ...f];
}
// alla som flyttar kommer fram nu
export function flyttFramNu(s: SIM.State, vl: SIM.Varlden) {
  for (const p of (vl.ko ?? []).filter(q => q.typ === 'flytt')) { vl.ko = vl.ko!.filter(q => q !== p); SIM.KOHANDELSER.flytt!(s, vl, p); }
  for (const f of (vl.farder ?? []).filter(x => x.flytt)) SIM.fardFramme(s, vl, f, s.now);
}
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
      [`den längsta sträckan utan vatten (${torr.toFixed(2)} dygn dit) ger ${pb!.vatten} vattensäckar med ${pb!.vatten * SIM.klunkarPerSack()} klunkar, mer än tre per resenär och dygn och högst ${SIM.RESA.sackar} säckar var`, pb!.vatten * SIM.klunkarPerSack() >= 2 * 3 * torr && pb!.vatten <= 2 * SIM.RESA.sackar],
      [`resan kom hem (${x!.sl.skede})`, x!.sl.skede === 'hemma'],
      [`maten räckte: ingen tom mättnad (lägst ${minMatt.toFixed(2)}, ${st('resa utan mat')} gånger utan mat)`, minMatt > 0 && st('resa utan mat') === 0],
      [`packningen ryms (${pb!.vikt} av ${pb!.bar})`, pb!.ryms],
      [`vattnet räckte: de drack ur säckarna (${st('resa dricker ur säcken')} gånger) och var aldrig utan vatten (lägst vätska ${minVatska.toFixed(2)}, ${st('resa utan vatten')} gånger)`, minVatska > 0 && st('resa utan vatten') === 0 && (pb!.vatten === 0 || st('resa dricker ur säcken') >= 1)],
      [`och det mesta gick åt (${(x!.sl.pack.brod ?? 0)} av ${pb!.mat} portioner kvar)`, (x!.sl.pack.brod ?? 0) <= pb!.mat * 0.4 + 2],
    ];
  },
};

// en ruta i världen utan vatten på eller bredvid (ingen flod, sjö eller myr)
export function torrRuta(s: SIM.State) {
  const v = SIM.varldMark(s)!, vat = (i: number) => !!v.flod[i] || !!SIM.VARLDMARK[SIM.MARK_IDS[v.mark[i]]].vatten;
  for (let i = 0; i < v.w * v.h; i++) {
    const x = i % v.w, y = Math.floor(i / v.w);
    if (x < 1 || y < 1 || x >= v.w - 1 || y >= v.h - 1 || vat(i) || SIM.MARK_IDS[v.mark[i]] === 'hav') continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => vat((y + dy!) * v.w + x + dx!))) continue;
    if (SIM.varldPlatserPa(s.varld!, x, y).some(p => p.k === 'by')) continue;
    return i;
  }
  return undefined;
}

SCENARIER.kroppresa = {
  text: 'Steg 15.1.89: kroppen bär resan. Utan vatten sjunker orken på samma sätt som utan mat, och den som länge är utan mat eller vatten får samma följder som i byn, till sist döden. När resenärerna kommer hem tar var och en med sig sällskapets mättnad, vätska och ork',
  kor: () => {
    const s0 = SIM.cloneState(testBy(3)), vl0 = s0.varld!, hb = SIM.byPlats(vl0, vl0.huvud!)!, mal = hb.grannar![0]!.nr, torr = torrRuta(s0)!;
    const vuxna = SIM.living(s0).filter(q => SIM.ageOf(q, s0.now) >= 20 && SIM.ageOf(q, s0.now) < 50);
    // sällskapet står framme på en torr ruta på dagen (ingen gång), med behoven b och tom packning, i tim timmar
    const sta = (b: Partial<SIM.ResBehov>, tim: number) => {
      const x = paVagen(s0, [vuxna[0]!.id, vuxna[1]!.id], mal);
      x.sl.skede = 'framme'; x.sl.framme = x.s.now; x.sl.ruta = torr; x.sl.pack = {};
      x.sl.behov = { matt: 1, vatska: 1, ork: 1, fulla: 0, foder: 0, ...b };
      for (let m = 0; m < tim * 6 && x.sl.skede === 'framme'; m++) { x.s.now += 10 * SIM.MIN; SIM.resaBehov(x.s, 10 * SIM.MIN); }
      return x;
    };
    // orken: med vatten och mat, utan vatten och utan mat, två timmar (vätskan och mättnaden hålls på noll)
    const ork = (b: Partial<SIM.ResBehov>) => { const x = sta({ ork: 0.8, ...b }, 2); return x.sl.behov!.ork; };
    const med = ork({ vatska: 1, matt: 1 }), utanVatten = ork({ vatska: 0 }), utanMat = ork({ matt: 0 });
    const torst = sta({ vatska: 0 }, 9), svalt = sta({ matt: 0, vatska: 0 }, 9), dod = (x: ReturnType<typeof sta>) => x.folk.map(p => p.dodVag?.orsak ?? '-').join(', ');
    const halv = sta({ vatska: 0 }, 2), halsa = halv.folk[0]!.health;
    // hemkomsten: var och en tar med sig sällskapets tal
    const hem = paVagen(s0, [vuxna[0]!.id, vuxna[1]!.id], mal);
    hem.sl.behov = { matt: 0.6, vatska: 0.7, ork: 0.3, fulla: 0, foder: 0 }; hem.sl.skede = 'hemat';
    SIM.hemkomst(hem.s, hem.sl, hem.s.now);
    const p = hem.folk[0]!;
    return [
      [`hittade en torr ruta (${torr})`, torr !== undefined],
      [`utan vatten sjunker orken som utan mat (${utanVatten.toFixed(3)} och ${utanMat.toFixed(3)} mot ${med.toFixed(3)} med båda)`, Math.abs(utanVatten - utanMat) < 1e-9 && utanVatten < med - 0.02],
      [`två timmar utan vatten tär på hälsan som i byn (${halsa.toFixed(2)}, i byn ${(1 - 2 / SIM.TORST.tomTim).toFixed(2)})`, Math.abs(halsa - (1 - 2 / SIM.TORST.tomTim)) < 0.02],
      [`länge utan vatten dör de av törst (${dod(torst)})`, torst.folk.every(q => q.dodVag?.orsak === 'torst')],
      [`länge utan mat dör de av svält (${dod(svalt)})`, svalt.folk.every(q => q.dodVag?.orsak === 'svalt')],
      [`hemma har ${p.name} sällskapets mättnad, vätska och ork (${p.hunger}, ${p.torst}, ${p.rest})`, (hem.sl.skede as string) === 'hemma' && p.hunger === 0.6 && p.torst === 0.7 && p.rest === 0.3],
    ];
  },
};

SCENARIER.letaresa = {
  text: 'Steg 15.1.90: sällskapet letar mat längs vägen. Ledaren väger med en poäng hur stor del av dagen det letar, letandet sänker farten och fyndet följer marken, årstiden, kylan och den bästa samlaren, i hela portioner. Ett sällskap som letar kommer fram senare och med mer mat kvar än ett som inte letar, och ett sällskap utan mat i packningen kan inte leva på letandet',
  kor: () => {
    const s0 = SIM.cloneState(testBy(3)), vl0 = s0.varld!, v = SIM.varldMark(s0)!, hb = SIM.byPlats(vl0, vl0.huvud!)!;
    const vuxna = SIM.living(s0).filter(q => SIM.ageOf(q, s0.now) >= 20 && SIM.ageOf(q, s0.now) < 50 && SIM.personFart(s0, q) === 1);
    // den längsta vägen till en plats ett och ett halvt till sex dygn bort med vatten längs vägen och mark som ger mat (i snitt
    // minst som slätten), så att letandet hinner ge något; sällskapet går på hösten
    const mal = (vl0.platser ?? []).map(q => ({ q, vd: q.nr === hb.nr ? undefined : SIM.vagDygn(s0, hb.y * v.w + hb.x, q.y * v.w + q.x) }))
      .filter(({ vd }) => !!vd && vd.dygn >= 1.5 && vd.dygn <= 6 && vd.torr <= 1 && vd.rutor.reduce((a, i) => a + SIM.VARLDMARK[SIM.MARK_IDS[v.mark[i]]].leta, 0) / vd.rutor.length >= 0.5)
      .sort((a, b) => b.vd!.dygn - a.vd!.dygn)[0]!.q;
    const sommar = (x: { s: SIM.State }) => { for (let d = 0; d < 1600 && (SIM.ageIndex(x.s, x.s.now) !== 3 || SIM.temperature(x.s, x.s.now) < SIM.RESA.fyndVarm + 3); d++) x.s.now += SIM.DAY / 4; };
    const resa = (ids: number[], pack: Record<string, number>, leta: boolean | 'hela') => {
      const x = paVagen(s0, ids, mal.nr, 'se'); sommar(x);
      const w = SIM.varldMark(x.s)!; for (const i of SIM.vagenRutor(x.s, x.sl)) w.mark[i] = SIM.MARK_IDS.indexOf('skog'); // skog längs hela vägen, där letandet ger mest (och inget vatten: säckarna räcker)
      for (const p of x.folk) { p.pot = { ...p.pot, flit: 10, mod: 10 }; p.skill.samla = 20; } // skickliga samlare
      x.sl.pack = { ...pack, vattensack: Math.ceil(24 / SIM.klunkarPerSack()) * ids.length, ved: Math.ceil(16 * ids.length / SIM.viktOf('ved')) }; // vatten nog för sju dygn, 24 klunkar var (här prövas maten), och en last som tynger, så att resan tar några dygn
      const t0 = x.s.now;
      let framme = 0, matFramme = 0; // maten just innan de kom fram (framme blir de gäster på platsens karta och lämnar maten där)
      if (!leta) x.sl.letaNasta = Infinity; // ledaren väger aldrig att leta
      if (leta === 'hela') { x.sl.letaNasta = Infinity; x.sl.letaHel = Infinity; } // sällskapet letar hela dagen
      utanHandelser(() => gaHem(x, 30, () => { if (x.sl.skede === 'ute') matFramme = SIM.FOOD.reduce((a, k) => a + Math.floor(x.sl.pack[k] ?? 0), 0); else if (!framme && x.sl.skede === 'framme') framme = (x.s.now - t0) / SIM.DAY; }));
      return { x, framme, matFramme, hittat: x.s.stat?.['resa letade fram'] ?? 0, utanMat: x.s.stat?.['resa utan mat'] ?? 0, dygn: (x.s.now - t0) / SIM.DAY };
    };
    const ids = [vuxna[0]!.id]; // en ensam: för den drygar letandet ut packningen
    const behov = (() => { const x = paVagen(s0, ids, mal.nr, 'se'); return SIM.packbehov(x.s, x.sl)!.mat; })();
    const lite = { torrkott: Math.ceil(behov * 0.4) }; // för lite mat för hela resan
    const med = resa(ids, lite, true), utan = resa(ids, lite, false);
    // fyra utan mat som letar hela dagen: letandet ger mindre än de äter
    const fyra = resa(vuxna.slice(0, 4).map(p => p.id), {}, 'hela');
    // utan vattensäckar letar ledaren mindre: den torra sträckan tar längre tid
    const torr = (() => { const x = paVagen(s0, ids, mal.nr, 'se'); sommar(x); x.folk[0]!.skill.samla = 20; x.sl.pack = { ...lite }; return x; })(), vat = SIM.cloneState(torr.s);
    const vsl = vat.varld!.sallskap!.find(q => q.id === torr.sl.id)!; vsl.pack.vattensack = 8;
    const aUtan = SIM.letaVal(torr.s, torr.sl)[0]!.a, aMed = SIM.letaVal(vat, vsl)[0]!.a;
    const perDygn = fyra.hittat / Math.max(1e-9, fyra.dygn), ater = 4 * SIM.matPerResenar();
    // den bästa tänkbara dagen för en ensam (skogsmark på hösten, full färdighet) är mindre än hen äter
    const bast = SIM.RESA.dagTim * SIM.RESA.letaPerTim * SIM.VARLDMARK.skog.leta * Math.max(...SIM.RESA.letaTid) * (1 + SIM.RESA.fardSank);
    const hela = Object.values(med.x.sl.pack).every(n => Number.isInteger(n));
    return [
      [`ledaren lät sällskapet leta (${med.hittat} portioner hittade); det som inte letar hittar inget (${utan.hittat})`, med.hittat > 0 && utan.hittat === 0],
      [`den som letar kommer fram senare (${med.framme.toFixed(2)} mot ${utan.framme.toFixed(2)} dygn)`, med.framme > utan.framme + 0.05 && utan.framme > 0],
      [`och med mer mat kvar (${med.matFramme} mot ${utan.matFramme} portioner framme)`, med.matFramme > utan.matFramme],
      [`utan vattensäckar letar sällskapet mindre (${aUtan} av dagen mot ${aMed} med)`, aUtan < aMed && SIM.torrKvar(torr.s, torr.sl) > 0],
      [`det som hittas är hela portioner (${JSON.stringify(med.x.sl.pack)})`, hela],
      [`fyra utan mat hittar ${perDygn.toFixed(1)} portioner per dygn men äter ${ater.toFixed(1)}, och hungrar (${fyra.utanMat} gånger utan mat)`, fyra.hittat > 0 && perDygn < ater && fyra.utanMat > 0],
      [`den bästa dagen för en ensam ger ${bast.toFixed(2)} portioner, mindre än hen äter (${SIM.matPerResenar().toFixed(2)})`, bast < SIM.matPerResenar()],
    ];
  },
};

SCENARIER.gralflod = {
  text: 'Steg 15.1.92: grälet och översvämningen i VAGHANDELSER. Grälet sänker relationen mellan två resenärer och händer oftare när sällskapet är hungrigt, törstigt och trött och mellan dem som tycker illa om varandra. Översvämningen händer när en flod på vägen stiger efter regn och snösmältning, och ledaren väger att vänta tills vattnet sjunkit eller ta en omväg',
  kor: () => {
    const s0 = SIM.cloneState(testBy(3)), vl0 = s0.varld!, hb = SIM.byPlats(vl0, vl0.huvud!)!, mal = hb.grannar![0]!.nr;
    const vuxna = SIM.living(s0).filter(q => SIM.ageOf(q, s0.now) >= 20 && SIM.ageOf(q, s0.now) < 50);
    const ids = vuxna.slice(0, 3).map(p => p.id);
    // grälet: risken med och utan nöd, och med två som tycker illa om varandra
    const x = paVagen(s0, ids, mal), [a, b, c] = x.folk;
    const satt = (op: [number, number, number]) => { SIM.getRel(x.s, a!, b!).op = op[0]; SIM.getRel(x.s, a!, c!).op = op[1]; SIM.getRel(x.s, b!, c!).op = op[2]; };
    satt([0, 0, 0]);
    x.sl.behov = { matt: 1, vatska: 1, ork: 1, fulla: 0, foder: 0 }; const mett = SIM.vagRisk(x.s, x.sl, 'gral');
    x.sl.behov = { matt: 0.1, vatska: 0.1, ork: 0.1, fulla: 0, foder: 0 }; const nod = SIM.vagRisk(x.s, x.sl, 'gral');
    x.sl.behov = { matt: 1, vatska: 1, ork: 1, fulla: 0, foder: 0 }; satt([-90, 0, 0]); const osams = SIM.vagRisk(x.s, x.sl, 'gral');
    // vem som grälar: de som tycker illa om varandra oftast
    let ab = 0, fall = 0, sjonk = true;
    for (let i = 0; i < 300; i++) { satt([-90, 0, 0]); SIM.VAGHANDELSER.gral!.gor(x.s, x.sl, x.s.now); const o = [SIM.getRel(x.s, a!, b!).op, SIM.getRel(x.s, a!, c!).op, SIM.getRel(x.s, b!, c!).op]; if (o[0] < -90) ab++; if (!(o[0] < -90 || o[1] < 0 || o[2] < 0)) sjonk = false; fall++; }
    const ensam = paVagen(s0, [ids[0]!], mal), ensamRisk = SIM.vagRisk(ensam.s, ensam.sl, 'gral');
    // översvämningen: en flod på nästa ruta längs vägen
    const f = paVagen(s0, ids, mal), w = SIM.varldMark(f.s)!, r = SIM.vagenRutor(f.s, f.sl);
    f.sl.pos = 1; f.sl.ruta = r[1]; const j = 2; w.flod[r[j]!] = 1;
    // en tid med regn och utan snö, och en torr tid utan snö
    const tider = [...Array(24 * 200).keys()].map(h => f.s.now + h * SIM.HOUR);
    const risk = (t: number) => { const n0 = f.s.now; f.s.now = t; const v = SIM.vagRisk(f.s, f.sl, 'oversvamning'); f.s.now = n0; return v; };
    if (f.s.vader) f.s.vader.sno = 0; // ingen snö som smälter
    const regn = tider.find(t => SIM.vaderNu(f.s, t).nb > 0.5), torrt = tider.find(t => SIM.vaderNu(f.s, t).nb === 0);
    const smalt = (() => { const t = tider.find(u => SIM.vaderNu(f.s, u).nb === 0 && SIM.temperature(f.s, u) > 2); if (!t || !f.s.vader) return 0; f.s.vader.sno = 0.5; const v = risk(t); f.s.vader.sno = 0; return v; })();
    const val = SIM.flodVal(f.s, f.sl), f0 = f.sl.forlorat ?? 0;
    SIM.VAGHANDELSER.oversvamning!.gor(f.s, f.sl, f.s.now);
    const valt = val[0]!, lagt = (f.sl.forlorat ?? 0) - f0;
    // utan en grannruta att gå runt genom (floden går över hela bredden) väntar sällskapet
    const g = paVagen(s0, ids, mal), wg = SIM.varldMark(g.s)!, rg = SIM.vagenRutor(g.s, g.sl);
    g.sl.pos = 1; g.sl.ruta = rg[1];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const i = rg[2]! + dy * wg.w + dx; if (i !== rg[1] && i !== rg[3]) wg.flod[i] = 1; }
    const valG = SIM.flodVal(g.s, g.sl);
    return [
      [`ett hungrigt, törstigt och trött sällskap grälar oftare (${nod.toFixed(3)} mot ${mett.toFixed(3)} per dygn)`, nod > mett * 2],
      [`två som tycker illa om varandra grälar oftare (${osams.toFixed(3)} mot ${mett.toFixed(3)})`, osams > mett * 1.5],
      [`den som reser ensam grälar inte (${ensamRisk})`, ensamRisk === 0],
      [`grälet sänker relationen, oftast mellan de osams (${ab} av ${fall})`, sjonk && ab > fall / 2],
      [`grälet står i dagboken (${x.sl.dagbok.filter(d => d[2] === 'gral').length})`, x.sl.dagbok.some(d => d[2] === 'gral')],
      [`floden på vägen stiger i regn (${regn ? risk(regn).toFixed(2) : '–'} per dygn) men inte en torr dag utan snö (${torrt ? risk(torrt) : '–'})`, !!regn && risk(regn) > 0 && !!torrt && risk(torrt) === 0],
      [`och när snön smälter (${smalt.toFixed(2)} per dygn)`, smalt > 0],
      [`ledaren väger att vänta eller gå runt (${val.map(v => `${v.id} ${v.tim.toFixed(1)} tim`).join(', ')}) och väljer det kortaste: ${valt.id}, ${lagt.toFixed(1)} timmar`, val.length === 2 && valt.tim <= val[1]!.tim && Math.abs(lagt - valt.tim) < 1e-9],
      [`översvämningen står i dagboken`, f.sl.dagbok.some(d => d[2] === 'flod')],
      [`när floden går över hela bredden finns ingen omväg, och sällskapet väntar (${valG.map(v => v.id).join(', ')})`, valG.length === 1 && valG[0]!.id === 'vanta' && valG[0]!.tim === SIM.RESA.flodTim],
    ];
  },
};
