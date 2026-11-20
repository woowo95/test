// Scenarier för fas 12: myren och järnet.
import * as SIM from '../../sim';
import { SCENARIER, klockan, kor, medBank, medHus, nyInvanare, setItems, setMat, tandEld } from './hjalp';
import { START } from '../kor';

// en by med myr: det första fröet från start vars karta har myr (kartan räknas utan att byn skapas)
export function myrFro(start = 1, med = true) {
  for (let f = start; f < start + 400; f++) {
    SIM.useMap({ W: SIM.KARTA.bredd, H: SIM.KARTA.hojd });
    if (!!SIM.myrOf(f) === med) return f;
  }
  throw new Error('ingen karta med myr');
}
export const myrBy = (start = 1) => SIM.createState(myrFro(start), Date.UTC(2026, 3, 1));
// rutorna på myren
export const myrRutorI = (s: SIM.State) => { const a = SIM.myrOf(s.seed), r: number[] = []; if (a) for (let i = 0; i < a.length; i++) if (a[i]) r.push(i); return r; };

SCENARIER.myr = {
  text: 'Myren (steg 12.1.1, myr.ts): blöt mark där inget byggs, långsam att gå på och under vatten efter regn; inga träd växer där, och myrarna ligger glest så att många byar inte har någon',
  kor: () => {
    // hur många kartor som har myr
    let med = 0, nara = 0;
    const N = 60;
    for (let f = 1; f <= N; f++) {
      SIM.useMap({ W: SIM.KARTA.bredd, H: SIM.KARTA.hojd });
      const a = SIM.myrOf(f);
      if (!a) continue;
      med++;
      const e = SIM.getMap(f).fire;
      for (let i = 0; i < a.length; i++) if (a[i] && Math.hypot(i % SIM.W - e.x, Math.floor(i / SIM.W) - e.y) < 6) nara++;
    }
    const s = myrBy(), r = myrRutorI(s), g = SIM.groundOf(s), i = r[Math.floor(r.length / 2)], x = i % SIM.W, y = Math.floor(i / SIM.W);
    const tradFore = r.filter(j => g.trees[j] > 0).length;
    // ett halvt år av växande: inga plantor på myren
    for (let k = 0; k < 40; k++) SIM.growGround(s, 24, 2);
    const tradEfter = r.filter(j => g.trees[j] > 0).length;
    // gången: torr myr, sedan blöt mark efter regn
    s.vader = { ...(s.vader ?? { sno: 0 }), fukt: 0.1 }; SIM.myrSteg(s, g);
    const torr = SIM.markFart(g, i), torrUnder = g.myrVatten;
    s.vader.fukt = 0.9; SIM.myrSteg(s, g);
    const blot = SIM.markFart(g, i), under = g.myrVatten;
    const utan = SIM.createState(myrFro(1, false), Date.UTC(2026, 3, 1));
    return [
      [`myrarna ligger glest: ${med} av ${N} kartor har myr`, med >= N * 0.25 && med <= N * 0.75],
      ['ingen myr inpå byplatsen', nara === 0],
      [`byn har myr (${r.length} rutor)`, r.length >= 20],
      [`inget byggs på myren (${x}, ${y})`, SIM.underMinnet(s, i) && !SIM.ledig(s, x, y)],
      [`inga träd på myren (före ${tradFore}, efter ett halvt år ${tradEfter})`, tradFore === 0 && tradEfter === 0],
      [`torr myr går man långsamt på (${torr})`, !torrUnder && torr === SIM.MYR.fartTorr && torr < 1],
      [`efter regn står myren under vatten och är långsammast (${blot})`, !!under && blot === SIM.MYR.fartVatten && blot < torr],
      ['en by utan myr har ingen', !SIM.harMyr(utan) && !SIM.groundOf(utan).myr],
    ];
  },
};

SCENARIER.myrmalm = {
  text: 'Myrmalmen (steg 12.1.2, malm.ts): malm i fläckar på myren, 4 i en full ruta, som grävs med spaden på en tur som ger 4 malm, och en tömd ruta är full igen efter ungefär 30 dygn; i istiden växer inget till och den frusna myren går inte att gräva',
  kor: () => {
    const s = myrBy(), r = myrRutorI(s);
    const malm = r.filter(i => SIM.fyndAt(s, 'malm', i) > 0), full = malm.every(i => SIM.fyndAt(s, 'malm', i) === 4), utanfor = SIM.fyndAt(s, 'malm', SIM.tileOf(SIM.eldPlats(s).x, SIM.eldPlats(s).y));
    const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    const f = { kyla: false, gras: 0 };
    s.ting = SIM.tingOf(s).filter(t => t.k !== 'benspade');
    const utanSpade = SIM.projektNu(s, p, 'malm', f);
    SIM.addTool(s, 'benspade', p);
    const u = SIM.projektNu(s, p, 'malm', f), at = SIM.malmPlats(s);
    const egen = SIM.projektVarde(s, 'malm');
    // turen: 4 malm i en hög där den grävdes, och rutan är tom
    const t: SIM.Task = { act: 'malm', phase: 'do', tx: at!.x, ty: at!.y, until: s.now, carry: 0, why: '', arbTid: SIM.MALM.min * 60000, tool: 'benspade' } as SIM.Task;
    p.x = at!.x; p.y = at!.y;
    SIM.malmGravd(s, p, t);
    const hog = SIM.stacksOf(s).filter(a => a.k === 'malm').reduce((n, a) => n + a.n, 0), i = SIM.tileOf(at!.x, at!.y), tom = SIM.fyndAt(s, 'malm', i);
    // återväxten: inget i istiden, nästan full efter 30 dygn på sommaren
    SIM.growFynd(s, 30 * 24, 0, 1, 0); const istid = SIM.fyndAt(s, 'malm', i);
    SIM.growFynd(s, 30 * 24, 2, 1, 0); const efter = SIM.fyndAt(s, 'malm', i);
    // den frusna myren
    s.is = { ...(s.is ?? {}), cm: 10 } as typeof s.is;
    const frusen = SIM.malmPlats(s);
    return [
      [`malm i fläckar på myren: ${malm.length} av ${r.length} rutor, 4 i varje, ingen utanför myren`, malm.length >= r.length * 0.08 && malm.length <= r.length * 0.4 && full && utanfor === 0],
      [`byn har inget eget mål för malmen (värdet ${egen})`, egen === 0],
      ['utan spade gräver ingen malm', !utanSpade],
      [`med spaden gräver en vuxen malm i myren (${u?.act}, ${u?.min} minuter)`, u?.act === 'malm' && u.min === 6 && u.tool === 'benspade' && SIM.paMyr(s, SIM.tileOf(u.spot!.x, u.spot!.y))],
      [`turen ger 4 malm i en hög där den grävdes, och rutan är tom (${hog}, kvar ${tom})`, hog === 4 && tom === 0 && SIM.SAKER.malm!.vikt === 4],
      [`i istiden växer malmen inte till (${istid}), efter 30 dygn på sommaren är rutan nästan full (${efter.toFixed(2)})`, istid === 0 && efter > 3.5],
      ['den frusna myren går inte att gräva', !frusen],
    ];
  },
};

SCENARIER.torv = {
  text: 'Torven (steg 12.1.3, torv.ts): grävs blöt i myren med spaden och tar aldrig slut, 8 torv på en tur av 8 minuter; en torv värmer som en halv ved och räknas i byns bränsle; den blöta torkar tre gånger långsammare än blöt ved; en by med skog nära hugger ved, och en by som huggit ner sin skog gräver torv',
  kor: () => {
    const s = myrBy(), r = myrRutorI(s), vuxna = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen);
    const p = vuxna[0];
    const overallt = r.every(i => SIM.fyndAt(s, 'torv', i) === 1), utanfor = SIM.fyndAt(s, 'torv', SIM.tileOf(SIM.eldPlats(s).x, SIM.eldPlats(s).y));
    // bränslet: torven räknas, en torv som en halv ved, och den blöta tas sist
    const q = SIM.cloneState(s);
    SIM.setStock(q, { ved: 0, grenar: 0, torv: 6, blottorv: 4 });
    const bransle = SIM.fuelStock(q), qp = SIM.living(q)[0];
    qp.task = { act: 'elda', phase: 'go', tx: qp.x, ty: qp.y, until: q.now, carry: 0, why: '' } as SIM.Task;
    const tog = SIM.takeFuel(q, 4, qp), torrKvar = SIM.amountOf(q, 'torv'), blotKvar = SIM.amountOf(q, 'blottorv'), blot1 = qp.task.blotVed ?? 0;
    SIM.takeFuel(q, 2, qp); const blot2 = qp.task.blotVed ?? 0;
    // torkningen: en blöt vedhög och en blöt torvhög bredvid varandra i en timme utan regn, timme för timme
    const t = SIM.cloneState(s);
    while (SIM.nederbord(t) || SIM.temperature(t) < 8) t.now += SIM.HOUR;
    const z = SIM.zonesOf(t)[0];
    t.stackar = (t.stackar ?? []).filter(a => !(a.x === z.x && a.y === z.y) && !(a.x === z.x + 1 && a.y === z.y));
    t.stackar.push({ k: 'ved', n: 5, c: 1, x: z.x, y: z.y, blot: 1 } as typeof t.stackar[number], { k: 'blottorv', n: 8, c: 1, x: z.x + 1, y: z.y });
    SIM.changed(t);
    const ved = () => t.stackar!.find(a => a.k === 'ved' && a.x === z.x && a.y === z.y)!;
    let vedTim = 0, torvTim = 0;
    for (let h = 1; h <= 400 && !torvTim; h++) {
      SIM.stepBlotVed(t, 3600); SIM.torvTorkar(t, 3600);
      if (!vedTim && !(ved() as { blot?: 1 }).blot) vedTim = h;
      if (t.stackar!.some(a => a.k === 'torv' && a.x === z.x + 1 && a.y === z.y && a.n === 8)) torvTim = h;
    }
    // valet: med skog nära hugger man ved, utan skog gräver den med spade torv
    s.ting = SIM.tingOf(s).filter(k => k.k !== 'benspade');
    for (const v of vuxna) SIM.addTool(s, 'benspade', v);
    const medSkog = SIM.torvHellre(s, p, true), utanSkog = SIM.torvHellre(s, p, false), takt = SIM.torvTakt(s);
    const g = SIM.groundOf(s), e = SIM.eldPlats(s);
    for (let i = 0; i < g.trees.length; i++) if (Math.hypot(i % SIM.W - e.x, Math.floor(i / SIM.W) - e.y) <= SIM.SKOG.sokR + 3) g.trees[i] = 0;
    s.stockar = [];
    SIM.setStock(s, { ved: 0, grenar: 0 });
    let gravt = 0;
    kor(s, 18, () => { for (const q2 of SIM.living(s)) if (q2.task?.act === 'torv') gravt = Math.max(gravt, 1); });
    const torvIn = SIM.amountOf(s, 'torv') + SIM.amountOf(s, 'blottorv') + SIM.paMarken(s, 'blottorv') + SIM.paMarken(s, 'torv'), stat = s.stat?.torvGravd ?? 0;
    return [
      [`torven finns på hela myren (${r.length} rutor) och inte utanför`, overallt && utanfor === 0 && !SIM.FYND.torv.uttag],
      [`en torv värmer som en halv ved (6 torv och 4 blöta ger ${bransle})`, bransle === 5],
      [`elden tar den torra torven först och den blöta sist (4 i ved tog ${tog}: torr kvar ${torrKvar}, blöt kvar ${blotKvar}, blött ${blot1}), och sedan bara blöt (blött ${blot2.toFixed(2)})`, tog === 4 && torrKvar === 0 && blotKvar === 2 && Math.abs(blot1 - 0.25) < 1e-9 && blot2 > 0.99],
      [`den blöta torven torkar tre gånger långsammare än veden (ved ${vedTim} timmar, torv ${torvTim})`, vedTim > 0 && Math.abs(torvTim / vedTim - 3) < 0.2],
      [`med skog nära hugger man ved, utan skog gräver den med spade torv (${takt.toFixed(2)} ved per minut)`, !medSkog && !!utanSkog && utanSkog.tool === 'benspade'],
      [`en by utan skog nära gräver torv (${stat} grävda, ${torvIn} i byn)`, gravt > 0 && stat >= 8 && torvIn > 0],
    ];
  },
};

SCENARIER.kolmila = {
  text: 'Kolmilan (steg 12.2.1, brann.ts): en kolbotten som grävs med spaden på 10 minuter utan material, där 20 torr ved blir 10 kol på 4 timmar efter klockan; tekniken Kolning, raden kolmila i ARBETEN tömmer den klara milan, och projektet kol ärver sin brist och vill då ha ved till milan (BRANNINGAR)',
  kor: () => {
    const s = SIM.createState(1, START), vuxna = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen), p = vuxna[0];
    const d = SIM.stationDef('kolmila')!, tek = SIM.TEKNIK.find(t => t.id === 'kolmila');
    for (const q of vuxna) (q.tek ??= {}).kolmila = 1;
    SIM.addTool(s, 'benspade', p);
    const bygga = SIM.PROJEKT.kolmila?.kan(s, p, { kyla: false, gras: 0 }) ?? false;
    const t = medBank(s, 'kolmila');
    SIM.setStock(s, { ved: 30 });
    const egen = SIM.projektVarde(s, 'kol'), u = SIM.PROJEKT.kol!.uppgift(s, p);
    // ladda och tända
    const tk = { act: 'kola', phase: 'do', tx: t.x, ty: t.y, until: s.now, carry: 0, why: '', ref: t.id } as SIM.Task;
    SIM.branningKlar(s, p, tk);
    const b = SIM.branningI(s, t), vedKvar = SIM.amountOf(s, 'ved');
    const tidigt = SIM.attTomma(s), upptagen = SIM.laddbar(s, p, 'kolmila');
    // efter fyra timmar är den klar; den som har tid river den och tar ut kolet (raden kolmila i ARBETEN)
    b!.sedd = 7; s.now = b!.slut - SIM.HOUR / 2; // tillsynen (steg 12.2.2) räknas som gjord
    const kol0 = SIM.amountOf(s, 'kol') + SIM.paMarken(s, 'kol');
    kor(s, 6);
    const kol = SIM.amountOf(s, 'kol') + SIM.paMarken(s, 'kol') - kol0, tom = !SIM.branningI(s, t);
    // receptet: projektet kol vill ha ved till milan, och blöt ved går inte att kola
    const q = SIM.cloneState(s), qp = SIM.living(q).find(r => r.id === p.id)!;
    SIM.setStock(q, { ved: 5 });
    const recept = SIM.PROJEKT.kol!.recept?.(q, qp, { kyla: false, gras: 0 });
    SIM.setStock(q, { ved: 30 });
    for (const a of SIM.stacksOf(q)) if (a.k === 'ved') (a as { blot?: 1 }).blot = 1;
    const blot = SIM.laddbar(q, qp, 'kolmila');
    return [
      [`kolbottnen grävs med spaden på ${d.min} minuter utan material, med tekniken ${tek?.namn} (krav ${tek?.krav})`, d.min === 10 && Object.keys(d.av).length === 0 && d.verktyg === 'benspade' && d.w === 2 && d.h === 2 && !!tek && tek.krav.includes('ortkok') && bygga],
      [`ingen kolar för kolets egen skull (värdet ${egen}), men den som behöver kol laddar milan (${u?.text}, ${u?.min} minuter)`, egen === 0 && u?.act === 'kola' && u.min === 7],
      [`milan tar 20 ved (kvar ${vedKvar}) och brinner 4 timmar efter klockan`, !!b && vedKvar === 10 && b.slut - b.t0 === 4 * SIM.HOUR],
      ['en mila som brinner går inte att tömma eller ladda', !tidigt && !upptagen],
      [`den klara milan töms av sig själv och ger 10 kol (${kol})`, kol === 10 && tom && (s.stat?.brant_kol ?? 0) === 10],
      [`projektet kol vill ha ved till milan (${JSON.stringify(recept?.av)})`, recept?.av.ved === 20],
      ['blöt ved går inte att kola', !blot],
      [`kolet väger 1 (${SIM.SAKER.kol!.vikt})`, SIM.SAKER.kol!.vikt === 1],
    ];
  },
};

SCENARIER.tillsyn = {
  text: 'Tillsynen (steg 12.2.2, brann.ts): en bränning ses till vid tre kända tider och varje missad tillsyn ger mindre ut; raden passa i ARBETEN tar den som är hemma, en mila utan tillsyn ger 4 kol, och milan tänds hellre när tillsynen faller på dagen',
  kor: () => {
    const kolning = (medTillsyn: boolean) => {
      const s = SIM.createState(1, START), vuxna = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen), p = vuxna[0];
      klockan(s, 9);
      for (const q of vuxna) (q.tek ??= {}).kolmila = 1;
      const t = medBank(s, 'kolmila');
      setMat(s, { bar: 400 }); SIM.setStock(s, { ved: 40 }); // mat nog, så att milan prövas och inte hungern
      SIM.branningKlar(s, p, { act: 'kola', phase: 'do', tx: t.x, ty: t.y, until: s.now, carry: 0, why: '', ref: t.id } as SIM.Task);
      if (!medTillsyn) for (const q of vuxna) q.tek!.kolmila = 0; // ingen kan se till milan
      const kol0 = SIM.amountOf(s, 'kol') + SIM.paMarken(s, 'kol');
      kor(s, 6);
      return { kol: SIM.amountOf(s, 'kol') + SIM.paMarken(s, 'kol') - kol0, sedda: s.stat?.tillsyn_kolmila ?? 0, missade: s.stat?.tillsynMissad_kolmila ?? 0, kvar: !!SIM.branningarOf(s).length };
    };
    const med = kolning(true), utan = kolning(false);
    const d = SIM.BRANNINGAR.kolmila, s = SIM.createState(1, START);
    klockan(s, 10); const dag = SIM.vantatUtfall(d, s.now);
    klockan(s, 18); const kvall = SIM.vantatUtfall(d, s.now);
    return [
      [`tre kända tider (${d.tillsyn.join(', ')} timmar efter tändningen), och en missad tillsyn ger ${d.miss.kol} kol mindre`, d.tillsyn.join() === '1,2,3' && d.miss.kol === 2],
      [`en by med folk hemma på dagen missar ingen tillsyn (${med.sedda} gjorda, ${med.missade} missade) och får 10 kol (${med.kol})`, med.sedda === 3 && med.missade === 0 && med.kol === 10 && !med.kvar],
      [`en mila utan tillsyn ger 4 kol (${utan.missade} missade, ${utan.kol} kol)`, utan.missade === 3 && utan.kol === 4 && !utan.kvar],
      [`milan tänds hellre när tillsynen faller på dagen (väntat utfall kl 10 ${dag}, kl 18 ${kvall})`, dag === 1 && kvall < dag],
    ];
  },
};

// ett prov på något byn vill ha som kräver järn (tills smedjan finns, steg 12.2.4): ett projekt med full brist som inte kan
// göras förrän järnet finns. Tas bort efter scenariot
export function medJarnBehov<T>(f: () => T, n = 6): T {
  SIM.laggTillProjekt({ provjarn: { namn: 'Prov på järn', vikt: 5, brist: () => 1, kostnad: () => 1, kan: () => false, recept: () => ({ av: { jarn: n } }), uppgift: () => undefined } });
  try { return f(); } finally { delete SIM.PROJEKT.provjarn; SIM.PROJEKT_LIST.splice(SIM.PROJEKT_LIST.indexOf('provjarn'), 1); }
}
SCENARIER.myroffer = {
  text: 'Offret i myren (steg 12.1.5, kult.ts): ett bud som en tro i en by med myr kan rösta in, och en ritual en gång om dygnet vid myrens kant närmast byn, där det mest värda vapnet, smycket eller maten som kyrkan äger sänks och är borta för gott; ju mer saken är värd, desto mer tro',
  kor: () => {
    const s = myrBy(), utan = SIM.createState(myrFro(1, false), Date.UTC(2026, 3, 1));
    const v = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), kid = SIM.kyrkaId(1);
    const tr: SIM.Tro = { id: 1, grundare: v[0].id, gnamn: v[0].name, t: s.now - SIM.TYNGD.alderDygn * SIM.DAY, ar: 1, k: 'drom', bakom: 'Rösten', vill: 'att man lyssnar', svek: 'det blir tyst', natur: 60, manga: 40, bekr: s.now, x: Math.floor(v[0].x), y: Math.floor(v[0].y), namn: 'Rösternas väg' };
    s.tron = [tr]; tr.bud = [{ id: 'myrOffer', t: s.now }];
    for (const p of v) { p.tro = 1; p.troStyrka = 20; }
    const finns = [SIM.BUD.myrOffer.finns(s), SIM.BUD.myrOffer.finns(utan)];
    // kyrkan äger ett järnspjut, ett halsband och tre kött
    const spjut = SIM.newTing(s, 'jarnspjut', 1, kid), hals = SIM.newTing(s, 'halsband', 1, kid);
    setMat(s, { kott: 3 }); for (const a of s.stackar ?? []) if (a.k === 'kott') a.ag = { [kid]: a.n };
    const vardet = (t: SIM.Ting) => SIM.tingVarde(t), mest = [spjut, hals].sort((a, b) => vardet(b) - vardet(a))[0];
    const val = SIM.myrOffret(s, tr), kant = SIM.myrKant(s)!, ki = Math.floor(kant.y) * SIM.W + Math.floor(kant.x);
    const vidMyr = [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => SIM.paMyr(s, ki + dy * SIM.W + dx)) && !SIM.paMyr(s, ki);
    // ritualen läggs i kön och hålls
    klockan(s, 10); SIM.kultTimme(s);
    const r = s.ritual;
    const med = r ? SIM.RITUALER.myrOffer.vem(s, r) : [];
    for (const p of med) p.task = { act: 'ritual', phase: 'do', tx: r!.x, ty: r!.y, until: r!.slut, carry: 0, why: '' } as SIM.Task;
    const tro0 = med[0]?.troStyrka ?? 0;
    s.now = r?.slut ?? s.now; SIM.ritualTimme(s);
    const tro1 = med[0]?.troStyrka ?? 0, faktor = Math.min(SIM.KULT.myrTak, 1 + (val?.v ?? 0) / SIM.KULT.myrVarde);
    const borta = !SIM.tingOf(s).includes(mest), kvar = SIM.tingOf(s).filter(t => t.agare === kid).length;
    // samma dygn hålls inget nytt offer; nästa dygn sänks nästa sak
    s.now += 2 * SIM.HOUR; SIM.kultTimme(s); const igen = !!s.ritual || !!s.ritualKo?.some(q => q.k === 'myrOffer');
    // en kyrka som inte äger något: ritualen hålls inte
    s.ting = SIM.tingOf(s).filter(t => t.agare !== kid); SIM.ownMove(s, 'kott', 3, kid, SIM.BYN);
    s.ritual = undefined; s.now += SIM.DAY; const inte0 = s.stat?.ritual_inte_myrOffer ?? 0; SIM.kultTimme(s); SIM.ritualTimme(s);
    const inte = (s.stat?.ritual_inte_myrOffer ?? 0) > inte0 && !s.ritual;
    return [
      [`budet kan föreslås i en by med myr men inte utan (${finns})`, finns[0] && !finns[1]],
      [`kyrkan sänker det mest värda: ${val?.k} (${val?.v.toFixed(2)}), av spjutet ${vardet(spjut).toFixed(2)}, halsbandet ${vardet(hals).toFixed(2)} och köttet ${SIM.grundvarde('kott').toFixed(2)}`, !!val && val.ting === mest && val.v >= SIM.grundvarde('kott')],
      [`platsen är fast mark intill myren (${kant.x}, ${kant.y})`, vidMyr],
      [`ritualen samlar de troende vid myrens kant (${med.length} av ${v.length}, vid ${r?.x}, ${r?.y})`, !!r && r.k === 'myrOffer' && med.length === v.length && r.x === kant.x && r.y === kant.y],
      [`saken är borta för gott (${borta}, kyrkan har ${kvar} ting kvar) och offret räknas (${s.stat?.myroffer})`, borta && kvar === 1 && s.stat?.myroffer === 1],
      [`tron växer med sakens värde: ${tro0} → ${tro1}, gånger ${faktor.toFixed(2)}`, Math.abs(tro1 - tro0 - SIM.RITUALER.myrOffer.tro * faktor) < 1e-6 && faktor > 1],
      [`samma dygn hålls inget nytt offer (${igen})`, !igen],
      [`äger kyrkan inget hålls inget offer (${inte})`, inte],
    ];
  },
};

SCENARIER.resursteknik = {
  text: 'Teknikträdet växer med de nya resurserna (steg 12.1.4, teknik.ts): en teknik med haft är stängd tills byn har haft sakerna, varifrån de än kom. Malmen öppnar Blästerugn och järnet Smide; byn har haft en sak från första gången den finns i förrådet, också när den är slut igen',
  kor: () => {
    const s = SIM.createState(1, START), tek = (id: string) => SIM.TEKNIK.find(t => t.id === id)!;
    const blaster = tek('blasterugn'), smide = tek('smedja');
    const fore = [SIM.oppen(s, blaster), SIM.oppen(s, smide)];
    SIM.setStock(s, { malm: 2 }); SIM.haftSteg(s);
    const malm = [SIM.oppen(s, blaster), SIM.oppen(s, smide)];
    SIM.setStock(s, { malm: 0, jarn: 1 }); SIM.haftSteg(s); // järnet köpt, malmen slut
    const jarn = [SIM.oppen(s, blaster), SIM.oppen(s, smide)], ggr = [s.stat?.malmHaft, s.stat?.jarnHaft];
    SIM.haftSteg(s);
    return [
      [`Blästerugn öppnas av malm (${blaster.haft}) och Smide av järn (${smide.haft})`, blaster.haft?.join() === 'malm' && smide.haft?.join() === 'jarn'],
      [`i en ny by är båda stängda (${fore})`, !fore[0] && !fore[1]],
      [`när byn har haft malm öppnas Blästerugn men inte Smide (${malm})`, malm[0] && !malm[1]],
      [`när järnet kommit, köpt utan malm i förrådet, är båda öppna (${jarn})`, jarn[0] && jarn[1]],
      [`att byn haft en sak räknas en gång (${ggr}, sedan ${s.stat?.malmHaft}, ${s.stat?.jarnHaft})`, ggr[0] === 1 && ggr[1] === 1 && s.stat?.malmHaft === 1 && s.stat?.jarnHaft === 1],
    ];
  },
};

SCENARIER.blaster = {
  text: 'Blästerugnen (steg 12.2.3, brann.ts): 8 malm och 10 kol blir 6 järn på 4 timmar efter klockan, färre om bälgen inte trampas; stationen av lera, sten, skinn och virke, tekniken Blästerugn, raden Blåser järn; en by med myr som vill ha järn gräver, kolar och blåser av sig själv',
  kor: () => {
    const d = SIM.BRANNINGAR.blasterugn, st = SIM.stationDef('blasterugn')!, tek = SIM.TEKNIK.find(t => t.id === 'blasterugn');
    const s = myrBy(), vuxna = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen);
    klockan(s, 7); tandEld(s);
    for (const q of vuxna) { Object.assign((q.tek ??= {}), { kolmila: 1, blasterugn: 1 }); SIM.addTool(s, 'benspade', q); }
    medBank(s, 'kolmila'); medBank(s, 'blasterugn');
    setMat(s, { bar: 400 }); SIM.setStock(s, { ved: 80, grenar: 30 });
    let timmar = 0;
    medJarnBehov(() => { for (; timmar < 60 && !(s.stat?.brant_jarn); timmar++) kor(s, 1); });
    const malm = s.stat?.malmGravd ?? 0, kol = s.stat?.brant_kol ?? 0, jarn = s.stat?.brant_jarn ?? 0;
    return [
      [`en blåsning tar ${d.in.malm} malm och ${d.in.kol} kol och ger ${d.ut.jarn} järn på ${d.tim} timmar, ett mindre för varje missat pass`, d.in.malm === 8 && d.in.kol === 10 && d.ut.jarn === 6 && d.tim === 4 && d.miss.jarn === 1],
      [`ugnen byggs av ${JSON.stringify(st.av)} på ${st.min} minuter, med tekniken ${tek?.namn} (krav ${tek?.krav})`, st.av.lera === 6 && st.av.sten === 4 && st.av.skinn === 2 && st.av.virke === 1 && st.min === 20 && !!tek && tek.krav.includes('kolmila') && tek.krav.includes('kruka')],
      [`järnet har ett värde och kan handlas (${SIM.grundvarde('jarn').toFixed(2)}, malm ${SIM.grundvarde('malm').toFixed(2)}, kol ${SIM.grundvarde('kol').toFixed(2)})`, SIM.grundvarde('jarn') > SIM.grundvarde('kol') && SIM.grundvarde('malm') > 0 && SIM.grundvarde('kol') > 0],
      [`byn som vill ha järn gräver malm (${malm}), kolar (${kol} kol) och blåser järn (${jarn}) av sig själv på ${timmar} timmar`, malm >= 8 && kol >= 10 && jarn >= 3],
    ];
  },
};

SCENARIER.smedja = {
  text: 'Smedjan (steg 12.2.4, smedja.ts): en station inne med ässja och städ av huggen sten, lera, skinn, virke och järn, där allt smide görs och bara där; ässjan brinner på kol (2 i timmen, rymmer 4) och smidet går bara när den brinner, en ässja som brinner höjer poängen för att smida, tekniken Smide öppnas när byn har haft järn, och rummet får taggen Smedja',
  kor: () => {
    const d = SIM.stationDef('smedja')!, tek = SIM.TEKNIK.find(t => t.id === 'smedja'), e = SIM.ELDSTATIONER.smedja;
    const s = SIM.createState(1, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    klockan(s, 10);
    const fore = !!s.stat?.jarnHaft;
    SIM.setStock(s, { jarn: 1 }); SIM.haftSteg(s);
    const haft = !!s.stat?.jarnHaft;
    const t = medBank(s, 'smedja'), r = SIM.roomAt(s, t.x, t.y), tagg = !!r && SIM.rumTaggar(s, r).has('smedja' as SIM.RumTagg);
    const vid = SIM.vidStation(t); p.x = vid.x; p.y = vid.y;
    const tk = { act: 'smida', phase: 'do', tx: vid.x, ty: vid.y, until: s.now + 4 * SIM.MIN, carry: 0, why: '' } as SIM.Task;
    SIM.setStock(s, { kol: 0 });
    const utanKol = SIM.eldaForst(s, p, tk), faktor0 = SIM.smidaFaktor(s, 'smida');
    SIM.setStock(s, { kol: 6 });
    const medKol = SIM.eldaForst(s, p, tk), brinner = SIM.stationBrinner(t), kolKvar = SIM.amountOf(s, 'kol'), iAssjan = t.eld?.ved ?? 0, faktor = SIM.smidaFaktor(s, 'smida');
    SIM.stepStationsEld(s, 3600); const efterTimme = t.eld?.ved ?? 0;
    return [
      [`smedjan står inne, 3 × 2 med ässjan och städet, av ${JSON.stringify(d.av)} på ${d.min} minuter, och allt smide görs bara där`, !!d.inne && d.w === 3 && d.h === 2 && d.delar?.map(q => q.namn).join() === 'Ässjan,Städet' && d.av.huggen_sten === 6 && d.av.lera === 2 && d.av.skinn === 2 && d.av.virke === 1 && d.av.jarn === 1 && d.min === 20 && !!d.bara?.includes('smida')],
      [`tekniken ${tek?.namn} kräver ${tek?.krav} och öppnas när byn har haft järn (före ${fore}, efter ${haft})`, !!tek && tek.krav.includes('kolmila') && tek.krav.includes('stenhuggarplats') && tek.haft?.[0] === 'jarn' && !fore && haft],
      [`ässjan brinner på kol, ${e.burn} i timmen och rymmer ${e.max}`, e.bransle === 'kol' && e.burn === 2 && e.max === 4 && e.kravs],
      [`utan kol går smidet inte (${utanKol})`, utanKol === false && faktor0 === 1],
      [`med kol tänds ässjan (${medKol} minuter, ${iAssjan} kol i den, ${kolKvar} kvar i förrådet) och smidet är mer värt (${faktor})`, typeof medKol === 'number' && brinner && iAssjan >= 1 && iAssjan <= 4 && kolKvar === 6 - iAssjan && faktor > 1],
      [`ässjan bränner 2 kol i timmen (${iAssjan} → ${efterTimme})`, Math.abs(iAssjan - efterTimme - Math.min(2, iAssjan)) < 1e-9],
      [`rummet med smedjan får taggen Smedja`, tagg],
    ];
  },
};

SCENARIER.jarnredskap = {
  text: 'Järnredskapen (steg 12.2.6, jarnsaker.ts): järnyxan, järnkniven och lien smids i smedjan och ligger i redskapens grupper; de arbetar tre gånger så fort som stenredskapen, håller fyra till fem gånger så länge, och järnsaken tas före stensaken',
  kor: () => {
    const R = SIM.RECEPT, A = SIM.ACTS;
    const s = SIM.createState(1, START), vuxna = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen), p = vuxna[0];
    klockan(s, 10);
    for (const q of vuxna) Object.assign((q.tek ??= {}), { smedja: 1, yxa: 1, kniv: 1 });
    const t = medBank(s, 'smedja');
    SIM.setStock(s, { jarn: 6, grenar: 6, kol: 4 });
    const brist = SIM.jarnBrist(s, 'jarnyxa'), u = SIM.PROJEKT.jarnyxa!.uppgift(s, p), kan = SIM.PROJEKT.jarnyxa!.kan(s, p, { kyla: false, gras: 0 });
    // smidet: materialet tas och yxan blir hens
    const tk = { act: 'smida', phase: 'do', tx: t.x, ty: t.y, until: s.now, carry: 0, why: '', tool: 'jarnyxa', ref: t.id } as SIM.Task;
    p.task = tk; SIM.smidaKlar(s, p, tk); p.task = undefined;
    const yxa = SIM.tingOf(s).find(q => q.k === 'jarnyxa'), jarnKvar = SIM.amountOf(s, 'jarn');
    // järnsaken tas före stensaken: en flintyxa och en järnyxa, och p tar järnyxan
    SIM.addTool(s, 'yxa', p);
    const tagen = SIM.take(s, p, 'yxa');
    // fällningen: tre gånger så fort med järnyxan
    const i = SIM.tileOf(p.x, p.y), fall = (k: string) => { const q: SIM.Task = { act: 'falla', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '', tool: k } as SIM.Task; SIM.startWork(s, p, q); return q.until - s.now; };
    const sten = fall('yxa'), jarn = fall('jarnyxa');
    void i;
    // det som täljs med kniven blir oftare bra med järnkniven
    const utanKniv = SIM.knivKv(s, p, 'slagtra');
    SIM.addTool(s, 'jarnkniv', p);
    const medKniv = SIM.knivKv(s, p, 'slagtra'), ejKniv = SIM.knivKv(s, p, 'korg');
    return [
      [`recepten: järnyxa ${JSON.stringify(R.jarnyxa.av)} ${R.jarnyxa.min} min, järnkniv ${JSON.stringify(R.jarnkniv.av)} ${R.jarnkniv.min} min, lie ${JSON.stringify(R.lie.av)} ${R.lie.min} min`, R.jarnyxa.av.jarn === 2 && R.jarnyxa.av.grenar === 1 && R.jarnyxa.min === 5 && R.jarnkniv.av.jarn === 1 && R.jarnkniv.min === 4 && R.lie.av.jarn === 2 && R.lie.min === 5],
      [`de ligger i grupperna yxa, kniv och skära med högre rang än stensaken`, SIM.gruppOf('jarnyxa') === 'yxa' && SIM.gruppOf('jarnkniv') === 'kniv' && SIM.gruppOf('lie') === 'skara' && (SIM.SAKER.jarnyxa!.rang ?? 0) > (SIM.SAKER.yxa!.rang ?? 0)],
      [`byn som vill ha en yxa saknar en av järn (${brist}), och den smids vid städet (${u?.act}, ${kan})`, brist > 0 && u?.act === 'smida' && u.tool === 'jarnyxa' && u.ref === t.id && kan],
      [`smidet tar 2 järn (kvar ${jarnKvar}) och yxan blir smedens`, !!yxa && yxa.agare === p.id && jarnKvar === 4],
      [`järnyxan tas före flintyxan (${tagen?.k})`, tagen?.k === 'jarnyxa'],
      [`järnyxan fäller ett träd på en tredjedel av tiden (${Math.round(sten / 1000)} s mot ${Math.round(jarn / 1000)} s)`, Math.abs(sten / jarn - 3) < 1e-6],
      [`hugga och klyva ger tre gånger så mycket med järnyxan, slakten går tre gånger så fort med järnkniven`, A.hugga.redskap!.jarnyxa.ger === 3 && A.klyva.redskap!.jarnyxa.ger === 3 && A.slakta.redskap!.jarnkniv.fart === 3 && A.falla.redskap!.jarnyxa.fart === 3],
      [`det som täljs med kniven får oftare bra kvalitet med järnkniven (+${medKniv.toFixed(2)}, utan ${utanKniv}, korgen ${ejKniv})`, medKniv > 0 && utanKniv === 0 && ejKniv === 0],
      [`järnsakerna håller fyra till fem gånger så länge (yxan ${A.falla.redskap!.jarnyxa.haller} träd mot ${A.falla.redskap!.yxa.haller}, kniven ${A.slakta.redskap!.jarnkniv.haller} mot ${A.slakta.redskap!.kniv.haller})`, A.falla.redskap!.jarnyxa.haller! / A.falla.redskap!.yxa.haller! >= 4 && A.slakta.redskap!.jarnkniv.haller! / A.slakta.redskap!.kniv.haller! >= 4],
    ];
  },
};

SCENARIER.jarnskrot = {
  text: 'Järnskrotet (steg 12.2.7, jarnsaker.ts): en järnsak som går sönder lämnar 1 järnskrot för varje järn i receptet, och 2 järnskrot smids om till 1 järn i smedjan på 3 minuter, när byn vill ha järn',
  kor: () => {
    const s = SIM.createState(1, START), vuxna = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen), p = vuxna[0];
    klockan(s, 10);
    for (const q of vuxna) Object.assign((q.tek ??= {}), { smedja: 1 });
    SIM.setStock(s, { kol: 4 });
    const t = medBank(s, 'smedja');
    // en järnyxa slits sönder: 2 järnskrot
    const y = SIM.addTool(s, 'jarnyxa', p);
    SIM.wearTool(s, p, 'jarnyxa', 10);
    const borta = !SIM.tingOf(s).includes(y), skrot = SIM.amountOf(s, 'jarnskrot');
    // en flintyxa lämnar inget
    SIM.addTool(s, 'yxa', p); SIM.wearTool(s, p, 'yxa', 10);
    const skrot2 = SIM.amountOf(s, 'jarnskrot');
    // den som vill ha järn smider om skrotet
    const u = SIM.PROJEKT.jarn!.uppgift(s, p);
    const tk = { act: 'smida', phase: 'do', tx: t.x, ty: t.y, until: s.now, carry: 0, why: '', tool: 'jarn', ref: t.id } as SIM.Task;
    p.task = tk; SIM.smidaKlar(s, p, tk); p.task = undefined;
    const jarn = SIM.amountOf(s, 'jarn'), kvar = SIM.amountOf(s, 'jarnskrot');
    return [
      [`en sönderslipad järnyxa lämnar 2 järnskrot (${skrot})`, borta && skrot === 2],
      [`en flintyxa lämnar inget (${skrot2})`, skrot2 === 2],
      [`den som vill ha järn smider om skrotet (${u?.text}, ${u?.min} minuter)`, u?.act === 'smida' && u.tool === 'jarn' && u.min === 3],
      [`2 järnskrot blir 1 järn (${jarn} järn, ${kvar} skrot kvar)`, jarn === 1 && kvar === 0],
    ];
  },
};

SCENARIER.jarnvapen = {
  text: 'Järnvapnen (steg 12.2.8): järnspjutet smids i smedjan och tas före stenspjuten, och järnskölden görs vid snickarbänken och tar 5 av 10 slag och 8 av 10 pilar',
  kor: () => {
    const R = SIM.RECEPT, V = SIM.VAPEN as Record<string, { skada: number; skarpa: number; kast?: { skada: number } }>;
    const s = SIM.createState(1, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    SIM.addTool(s, 'flintspjut', p); SIM.addTool(s, 'jarnspjut', p);
    const jakt = SIM.toolGroups('jakt').spjut;
    const kamp = (k: string) => { s.ting = SIM.tingOf(s).filter(t => !['skold', 'jarnskold', 'flintspjut', 'jarnspjut'].includes(t.k)); if (k) SIM.addTool(s, k, p); SIM.addTool(s, 'kniv', p); return SIM.personKampe(s, p, 1, 0, 0, 0); };
    const tra = kamp('skold'), jarn = kamp('jarnskold');
    const gors = SIM.GORS.skold;
    return [
      [`järnspjutet: ${JSON.stringify(R.jarnspjut.av)} i smedjan på ${R.jarnspjut.min} minuter, skada ${V.jarnspjut.skada}, skärpa ${V.jarnspjut.skarpa}, kast ${V.jarnspjut.kast?.skada}`, R.jarnspjut.av.jarn === 1 && R.jarnspjut.av.rep === 1 && R.jarnspjut.tek === 'smedja' && V.jarnspjut.skada === 0.55 && V.jarnspjut.skarpa === 0.8 && V.jarnspjut.kast?.skada === 0.5],
      [`järnspjutet tas före stenspjuten i jakten och fisket (${jakt.join(', ')})`, jakt[0] === 'jarnspjut' && Object.keys(SIM.ACTS.fiske.redskap!).indexOf('jarnspjut') < Object.keys(SIM.ACTS.fiske.redskap!).indexOf('flintspjut')],
      [`järnskölden: ${JSON.stringify(R.jarnskold.av)} vid snickarbänken på ${R.jarnskold.min} minuter, och görs hellre än träskölden (${gors.join(', ')})`, R.jarnskold.av.jarn === 1 && R.jarnskold.av.lader === 1 && R.jarnskold.av.ved === 3 && R.jarnskold.bank === 'snickarbank' && gors[0] === 'jarnskold'],
      [`den som har järnskölden håller en järnsköld i striden (${!!jarn.skoldJarn}), träskölden en vanlig (${!!tra.skold}, ${!!tra.skoldJarn})`, !!jarn.skold && !!jarn.skoldJarn && !!tra.skold && !tra.skoldJarn],
      [`järnskölden tar ${SIM.STRID.jarnSkoldSlag * 10} av 10 slag och ${SIM.STRID.jarnSkoldPil * 10} av 10 pilar (träskölden ${SIM.STRID.skoldSlag * 10} och ${SIM.STRID.skoldPil * 10})`, SIM.STRID.jarnSkoldSlag === 0.5 && SIM.STRID.jarnSkoldPil === 0.8],
      ...(() => { const q = SIM.createState(1, START), qp = SIM.living(q).find(r => SIM.ageOf(r, q.now) >= SIM.ALDER.vuxen)!; q.ting = SIM.tingOf(q).filter(t => !SIM.MANNISKOVAPEN.includes(t.k as never)); const t = SIM.addTool(q, 'jarnkniv', qp); t.q = 4; const fin = SIM.personKampe(q, qp, 1, 0, 0, 0); t.q = 0; const usel = SIM.personKampe(q, qp, 1, 0, 0, 0); t.q = undefined; const normal = SIM.personKampe(q, qp, 1, 0, 0, 0);
        return [[`ett vapen av hög kvalitet skadar mycket mer i striden (${fin.vapen}: fin ${fin.kv?.jarnkniv}, usel ${usel.kv?.jarnkniv}, normal ${normal.kv?.jarnkniv ?? 1})`, fin.vapen === 'jarnkniv' && fin.kv?.jarnkniv === SIM.STRID.kvSkada[4] && usel.kv?.jarnkniv === SIM.STRID.kvSkada[0] && !normal.kv && SIM.STRID.kvSkada[4] >= 1.4] as [string, boolean]]; })(),
      [`järnyxan och järnkniven är vapen med skärpa över stenens (${V.jarnyxa.skarpa}, ${V.jarnkniv.skarpa})`, V.jarnyxa.skarpa > 1 && V.jarnkniv.skarpa > V.kniv.skarpa && SIM.MANNISKOVAPEN.includes('jarnspjut' as never)],
    ];
  },
};

SCENARIER.vapensmide = {
  text: 'Vapensmidet (steg 12.2.9): tekniken Vapensmide ger svärdet, järnhjälmen och ringbrynjan, och plaggens register säger att hjälmen och brynjan smids i smedjan',
  kor: () => {
    const R = SIM.RECEPT, tek = SIM.TEKNIK.find(t => t.id === 'vapensmide'), V = SIM.VAPEN as Record<string, { skada: number; skarpa: number }>;
    const d = SIM.stationDef('smedja')!, fl = SIM.stationDef('flatarbank')!;
    const s = SIM.createState(1, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    klockan(s, 10);
    Object.assign((p.tek ??= {}), { smedja: 1, rustning: 1, vapensmide: 1 });
    SIM.setStock(s, { jarn: 12, lader: 3, kol: 4 });
    s.vargar = undefined;
    const utan = SIM.kanGoras(s, 'jarnhjalm' as SIM.Act, p);
    medBank(s, 'smedja');
    const med = SIM.kanGoras(s, 'jarnhjalm' as SIM.Act, p);
    const brynja = SIM.kladSkyddStrid('ringbrynja_jarn'), hjalm = SIM.kladSkyddStrid('jarnhjalm_jarn');
    return [
      [`tekniken ${tek?.namn} kräver ${tek?.krav}`, !!tek && tek.krav.includes('smedja') && tek.krav.includes('rustning')],
      [`svärdet: ${JSON.stringify(R.svard.av)} på ${R.svard.min} minuter, skada ${V.svard.skada}, skärpa ${V.svard.skarpa}`, R.svard.av.jarn === 3 && R.svard.av.lader === 1 && V.svard.skada === 0.7 && V.svard.skarpa === 1.3 && SIM.MANNISKOVAPEN.includes('svard' as never)],
      [`hjälmen (${SIM.receptAv('jarnhjalm', 'jarn') ? JSON.stringify(SIM.receptAv('jarnhjalm', 'jarn')) : ''}) och brynjan (${JSON.stringify(SIM.receptAv('ringbrynja', 'jarn'))}) är plagg av järn`, SIM.receptAv('jarnhjalm', 'jarn').jarn === 2 && SIM.receptAv('ringbrynja', 'jarn').jarn === 8 && SIM.receptAv('ringbrynja', 'jarn').lader === 1],
      [`de smids i smedjan och bara där (${d.gor.join(', ')}), inte vid slöjdbänken`, d.gor.includes('jarnhjalm' as SIM.Act) && d.gor.includes('ringbrynja' as SIM.Act) && !!d.bara?.includes('ringbrynja' as SIM.Act) && !fl.gor.includes('jarnhjalm' as SIM.Act) && !utan && med],
      [`skyddet: brynjan hugg ${brynja?.tar.hugg}, hjälmen hugg ${hjalm?.tar.hugg}`, brynja?.tar.hugg === 0.85 && hjalm?.tar.hugg === 0.7],
    ];
  },
};

SCENARIER.jarnsmycke = {
  text: 'Smycken (steg 12.2.10): ett spänne av järn smids i smedjan av 1 järn på 3 minuter och bärs som pynt, som halsbandet',
  kor: () => {
    const d = SIM.stationDef('smedja')!, P = SIM.PLAGG.spanne, k = 'spanne_jarn';
    const s = SIM.createState(1, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    Object.assign((p.tek ??= {}), { smedja: 1 });
    SIM.setStock(s, { jarn: 2, kol: 2 });
    medBank(s, 'smedja');
    return [
      [`spännet: ${JSON.stringify(SIM.receptAv('spanne', 'jarn'))} på ${P.min} minuter, ett smycke`, SIM.receptAv('spanne', 'jarn').jarn === 1 && Object.keys(SIM.receptAv('spanne', 'jarn')).length === 1 && P.min === 3 && P.plats === 'smycke' && !!SIM.SAKER[k]],
      ['det smids i smedjan och bara där', d.gor.includes('spanne' as SIM.Act) && !!d.bara?.includes('spanne' as SIM.Act) && SIM.kanGoras(s, 'spanne' as SIM.Act, p)],
      [`byn vill ha några (${SIM.villAv(s, 'spanne')})`, SIM.villAv(s, 'spanne') >= 1],
    ];
  },
};

SCENARIER.isborr = {
  text: 'Isborren (steg 12.2.11): smids av 1 järn och 1 grenar på 4 minuter i smedjan och borrar genom den tjockaste isen tre gånger så fort som yxan; yxan, spjutet och spaden tar sig bara genom is upp till 30 cm',
  kor: () => {
    const R = SIM.RECEPT.isborr;
    const halet = (borr: boolean) => {
      const s = SIM.createState(1, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
      s.is = { vatten: 0, cm: 40 } as typeof s.is;
      SIM.addTool(s, 'yxa', p); SIM.addTool(s, 'flintspjut', p);
      if (borr) SIM.addTool(s, 'isborr', p);
      const h = SIM.halVal(s, p);
      return { h: h?.id, min: h ? SIM.halMin(s, p) : undefined };
    };
    const med = halet(true), utan = halet(false);
    // borren slits: den håller 200 hål
    const s = SIM.createState(1, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    s.is = { vatten: 0, cm: 40 } as typeof s.is;
    SIM.addTool(s, 'isborr', p);
    let hal = 0;
    while (SIM.nTools(s, 'isborr') > 0 && hal < 1000) { SIM.halGjort(s, p); hal++; }
    return [
      [`isborren: ${JSON.stringify(R.av)} på ${R.min} minuter i smedjan`, R.av.jarn === 1 && R.av.grenar === 1 && R.min === 4 && R.tek === 'smedja' && !!SIM.JARNSAKER.isborr],
      [`genom 40 cm is får byn med borr upp hålet på 4 minuter (${med.h}, ${med.min} minuter)`, med.h === 'isborr' && Math.abs((med.min ?? 0) - 4) < 1e-9],
      [`byn utan borr får inte upp något (${utan.h ?? 'inget'})`, !utan.h],
      [`isborren håller ${SIM.IS.borrHal} hål (${hal})`, hal === SIM.IS.borrHal],
      ...(() => { const q = SIM.createState(1, START), qp = SIM.living(q)[0], t = SIM.addTool(q, 'isborr', qp), y = SIM.addTool(q, 'yxa', qp); SIM.wearStore(q, 24 * 3600); return [[`isborren slits i förvaringen som allt annat (skick ${t.c.toFixed(3)} efter ett dygn, flintyxan ${y.c.toFixed(3)})`, t.c < 1 && t.c > 0 && Math.abs((1 - t.c) - (1 - y.c)) < 0.5 * (1 - y.c) + 1e-9] as [string, boolean]]; })(),
    ];
  },
};

SCENARIER.eldstal = {
  text: 'Eldstålet (steg 12.2.12): smids av 1 järn på 3 minuter, slås mot en flinta och tänder oftast på ett till tre försök; en by med eldstål, flinta och bågborr tänder med stålet, utan flinta med borren, och smeden gör ett nytt när stålet är slitet',
  kor: () => {
    const R = SIM.RECEPT.eldstal, ig = SIM.IGNITERS.find(i => i.id === 'eldstal')!;
    const s = SIM.createState(1, START), vuxna = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen), p = vuxna[0];
    for (const q of vuxna) Object.assign((q.tek ??= {}), { smedja: 1, bagborr: 1 });
    SIM.addTool(s, 'bagborr', p); const stal = SIM.addTool(s, 'eldstal', p);
    SIM.setStock(s, { flinta: 2 });
    const medFlinta = SIM.igniterOf(s, p)?.id;
    SIM.setStock(s, { flinta: 0 });
    const utanFlinta = SIM.igniterOf(s, p)?.id;
    // stålet slits ut: smeden vill göra ett nytt
    SIM.setStock(s, { flinta: 2, kol: 2, jarn: 1 });
    s.ting = SIM.tingOf(s).filter(t => t !== stal);
    medBank(s, 'smedja');
    const brist = SIM.jarnBrist(s, 'eldstal'), u = SIM.PROJEKT.eldstal?.uppgift(s, p);
    return [
      [`eldstålet: ${JSON.stringify(R.av)} på ${R.min} minuter i smedjan, håller ${ig.slits} försök`, R.av.jarn === 1 && R.min === 3 && R.tek === 'smedja' && ig.slits === 400 && ig.grass === 1 && ig.sticks === 1],
      [`tänder oftast på ett till tre försök (chansen ${ig.chance})`, ig.chance >= 0.33 && ig.chance <= 0.6],
      [`med eldstål, flinta och bågborr tänds elden med stålet (${medFlinta}), utan flinta med borren (${utanFlinta})`, medFlinta === 'eldstal' && utanFlinta === 'bagborr'],
      [`när stålet är slitet gör smeden ett nytt (brist ${brist}, ${u?.text})`, brist === 1 && u?.act === 'smida' && u.tool === 'eldstal'],
    ];
  },
};

SCENARIER.jarngruva = {
  text: 'Järngruvan (steg 12.2.13, gruva.ts): två platser i bergen på världskartan som fungerar som silvergruvan; ett sällskap bryter 2 malm per person och timme och bär hem den, och malmen är samma sak som den ur myren',
  kor: () => {
    const s = SIM.createState(6, START), vl = s.varld!, v = SIM.varldMark(s)!;
    const gruvor = (vl.platser ?? []).filter(p => p.k === 'jarngruva'), berg = gruvor.every(p => SIM.MARK_IDS[v.mark[p.y * v.w + p.x]] === 'berg');
    const plan = SIM.silverPlan(3, 120, 2, 1, 'jarngruva'), silver = SIM.silverPlan(3, 120, 2, 1);
    // en värld som sparats före järngruvorna får dem
    vl.platser = (vl.platser ?? []).filter(p => p.k !== 'jarngruva'); delete vl.jarnLagd;
    SIM.jarngruvorSteg(s);
    const igen = (vl.platser ?? []).filter(p => p.k === 'jarngruva').length;
    return [
      [`världen har ${gruvor.length} järngruvor i bergen`, gruvor.length === SIM.JARNGRUVA.gruvor && gruvor.length === 2 && berg],
      [`sällskapet reser dit för att hämta (${SIM.RESMAL.hamta.mal.join(', ')}), och malmen är samma sak som myrens (${SIM.GRUVSAK.jarngruva.sak})`, SIM.RESMAL.hamta.mal.includes('jarngruva' as never) && SIM.GRUVSAK.jarngruva.sak === 'malm'],
      [`tre personer bryter 2 malm per person och timme och bär fullt på några timmar (${plan?.silver} malm på ${Math.round((plan?.nere ?? 0) * 24)} timmar; silvret ${silver?.silver} på ${Math.round((silver?.nere ?? 0) * 24)} timmar)`, !!plan && plan.silver > 0 && plan.nere * 24 <= 12 && SIM.GRUVSAK.jarngruva.mellan(0, 1) === 2],
      [`en värld som sparats före järngruvorna får dem (${igen})`, igen === 2],
    ];
  },
};

SCENARIER.nyvarld = {
  text: 'En ny värld i testläget (steg 12.3.1, nyvarld.ts): knappen laddar en ny värld men behåller hela byn, så att samma by kan testas i olika miljöer',
  kor: () => {
    const s = SIM.createState(1, START);
    kor(s, 2);
    const fro0 = s.varld!.fro, folk0 = SIM.living(s).map(p => p.id).join(), ved0 = SIM.amountOf(s, 'ved'), karta0 = s.seed, grannar0 = SIM.klanerOf(s).map(k => k.namn).join();
    const r = SIM.nyVarld(s);
    const fro1 = s.varld!.fro, grannar1 = SIM.klanerOf(s).map(k => k.namn).join(), huvud = s.varld!.huvud !== undefined;
    kor(s, 2);
    const levande = SIM.living(s).length > 0;
    const r2 = SIM.nyVarld(s), fro2 = s.varld!.fro;
    const p = SIM.living(s)[0]; p.ute = 1 as never;
    const hinder = SIM.nyVarldHinder(s);
    return [
      [`världen är ny (${fro0} → ${fro1}), med en huvudby och nya grannbyar (${grannar1.slice(0, 60)})`, r.ok && fro1 !== fro0 && huvud && grannar1.length > 0 && grannar1 !== grannar0],
      ['byn är densamma: kartan, folket och förrådet', s.seed === karta0 && folk0.split(',').every(id => s.people.some(q => String(q.id) === id)) && SIM.amountOf(s, 'ved') <= ved0 + 50],
      [`byn lever vidare i den nya världen, och nästa tryck ger en ny igen (${fro2})`, levande && r2.ok && fro2 !== fro1],
      [`det går inte medan någon är ute i världen (${hinder})`, !!hinder],
    ];
  },
};

SCENARIER.myrmossa = {
  text: 'Mossan (steg 12.1.6, mossa.ts): mossan växer bara i myren, 4 i en full ruta, och plockas där på en tur som ger upp till 10; mossa under en remsa är det bästa förbandet och håller dubbelt så länge; byn vill ha mossa bara när kartan har en myr',
  kor: () => {
    const s = myrBy(), r = myrRutorI(s), utan = SIM.createState(myrFro(1, false), Date.UTC(2026, 3, 1));
    const mossa = r.filter(i => SIM.fyndAt(s, 'mossa', i) === 4).length, e = SIM.eldPlats(s), utanfor = SIM.fyndAt(s, 'mossa', SIM.tileOf(e.x, e.y));
    const mal = SIM.MATERIALMAL.mossa!.min!(s), malUtan = SIM.MATERIALMAL.mossa!.min!(utan), folk = SIM.living(s).length;
    const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    const f = { kyla: false, gras: 0 };
    const u = SIM.projektNu(s, p, 'mossplock', f), at = SIM.mossaPlats(s), pu = SIM.living(utan).find(q => SIM.ageOf(q, utan.now) >= SIM.ALDER.vuxen)!;
    const uUtan = SIM.projektNu(utan, pu, 'mossplock', f);
    // turen: högst 10 mossa i en hög där den plockades
    const t = { act: 'plockaMossa', phase: 'do', tx: at!.x, ty: at!.y, until: s.now, carry: 0, why: '', arbTid: SIM.MOSSA.min * 60000 } as SIM.Task;
    p.x = at!.x; p.y = at!.y;
    SIM.mossaPlockad(s, p, t);
    const hog = SIM.stacksOf(s).filter(a => a.k === 'mossa').reduce((n, a) => n + a.n, 0), i = SIM.tileOf(at!.x, at!.y), tom = SIM.fyndAt(s, 'mossa', i);
    // förbanden: mossa under en remsa, remsa ensam och mossa ensam
    const forband = (pack: Record<string, number>) => {
      p.skador = undefined; SIM.skada(s, p, 'benV', 'skarsar', 0.5, 'olycka', ''); const w = p.skador![0]!; w.b = 0;
      SIM.vardKalla.pack = pack; SIM.VARD.forband!.gor(s, p, p, w); SIM.vardKalla.pack = undefined;
      const ny = SIM.forbandGammalt(s, w); s.now += 13 * SIM.HOUR; const tretton = SIM.forbandGammalt(s, w); s.now += 12 * SIM.HOUR; const tjugofem = SIM.forbandGammalt(s, w); s.now -= 25 * SIM.HOUR;
      return { f: w.f, ny, tretton, tjugofem };
    };
    const bada = forband({ remsa: 1, mossa: 1 }), remsa = forband({ remsa: 1 }), bara = forband({ mossa: 1 });
    return [
      [`mossan växer bara i myren: ${mossa} av ${r.length} rutor har 4, ingen vid elden`, mossa === r.length && utanfor === 0],
      [`byn vill ha en mossa per invånare med myr (${mal} för ${folk}) och ingen utan (${malUtan})`, mal === folk && malUtan === 0],
      [`en vuxen plockar mossa i myren (${u?.act}, ${u?.min} minuter), i en by utan myr ingen`, u?.act === 'plockaMossa' && u.min === 5 && SIM.paMyr(s, SIM.tileOf(u.spot!.x, u.spot!.y)) && !uUtan],
      [`turen ger 10 mossa i en hög och tömmer rutan (${hog}, kvar ${tom})`, hog === 10 && tom === 0],
      [`mossa under en remsa är det bästa förbandet och håller 24 timmar (f ${bada.f}, gammalt efter 13 h ${bada.tretton}, efter 25 h ${bada.tjugofem})`, bada.f === 3 && !bada.ny && !bada.tretton && bada.tjugofem && SIM.HALSA.mossaRemsa < SIM.HALSA.remsa],
      [`remsa ensam (f ${remsa.f}) och mossa ensam (f ${bara.f}) håller 12 timmar som förut`, remsa.f === 2 && bara.f === 1 && remsa.tretton && bara.tretton && !remsa.ny],
    ];
  },
};

SCENARIER.myrvag = {
  text: 'Stockvägen över myren (steg 12.1.7, byggplan.ts och vag.ts): stockvägen får läggas på myren där folk trampat upp en stig, en ruta bred, men inte stenvägen; på en färdig stockväg går man som på vanlig mark',
  kor: () => {
    const behov = { fn: 'forbattra', a: { v: 1, plats: 0 }, sc: 0 } as SIM.ByggBehov;
    const s = myrBy(), r = myrRutorI(s), g = SIM.groundOf(s), e = SIM.eldPlats(s);
    for (const p of SIM.living(s)) Object.assign((p.tek ??= {}), { stockvag: 1, byggsten: 1 });
    SIM.setAmount(s, 'virke', 6);
    // en stig av fem rutor genom myren, de närmaste elden; resten av myren är orörd
    const nara = [...r].sort((a, c) => Math.hypot(a % SIM.W - e.x, Math.floor(a / SIM.W) - e.y) - Math.hypot(c % SIM.W - e.x, Math.floor(c / SIM.W) - e.y));
    const stig = new Set(nara.slice(0, 5));
    for (const i of r) g.cover[i] = stig.has(i) ? 0 : 0.8;
    s.vader = { ...(s.vader ?? { sno: 0 }), fukt: 0.1 }; SIM.myrSteg(s, g);
    const f = SIM.BYGGATGARDER.stockvagA.foresla(s, behov, () => true);
    const stock = f.flatMap(q => q.ritning).filter(a => a.m === 'stockvag'), sten = f.flatMap(q => q.ritning).filter(a => a.m === 'stenvag');
    const paMyr = (a: { x: number; y: number }) => SIM.paMyr(s, a.y * SIM.W + a.x);
    const stockMyr = stock.filter(paMyr), utanforStig = stockMyr.filter(a => !stig.has(a.y * SIM.W + a.x));
    // farten på stigen: myrens broms, en påbörjad väg ändrar inget, en färdig tar bort bromsen, också under vatten
    const i = nara[0]!, x = i % SIM.W, y = Math.floor(i / SIM.W);
    const fore = SIM.markFart(g, i);
    const bit = { id: s.nextBit!++, x, y, k: 'golv', m: 'stockvag', b: 0.5, mat: 0, c: 1 } as SIM.Bit;
    SIM.bitsOf(s).push(bit); SIM.touch(s); SIM.gridOf(s);
    const paborjad = SIM.markFart(g, i);
    bit.b = 1; bit.mat = 1; SIM.touch(s); SIM.gridOf(s);
    const fardig = SIM.markFart(g, i), granne = SIM.markFart(g, nara[1]!);
    s.vader.fukt = 0.9; SIM.myrSteg(s, g);
    const blot = SIM.markFart(g, i);
    return [
      [`stockvägen föreslås på myrens stig (${stockMyr.length} av ${stig.size} rutor), inte på den orörda myren (${utanforStig.length})`, stockMyr.length >= 1 && utanforStig.length === 0],
      [`stenvägen läggs aldrig på myren (${sten.filter(paMyr).length} av ${sten.length})`, sten.every(a => !paMyr(a))],
      [`på myren går man långsamt (${fore}), också över en påbörjad väg (${paborjad})`, fore === SIM.MYR.fartTorr && paborjad === fore],
      [`på den färdiga stockvägen som på vanlig mark (${fardig}), bredvid den som förut (${granne})`, fardig === 1 && granne === SIM.MYR.fartTorr],
      [`också när myren står under vatten (${blot})`, !!g.myrVatten && blot === 1],
    ];
  },
};

SCENARIER.svalaplagg = {
  text: 'Svala plagg (steg 12.1.34, klader.ts och utrustning.ts): som varma plagg värmer kyler svala plagg, med samma tal under noll. Skjortan av lin kyler lite, och hatten av halm (flätas av hö vid slöjdbänken) kyler mest. Ett svalt plagg tas på när det är varmt och av när kylan är en fara',
  env: { BALANS: 'kropp.varmGrader=15,kropp.svalnatGrader=12' },
  kor: () => {
    const { SAKER, KROPP, temperature } = SIM;
    const v = (k: string) => SAKER[k]!.klad!.varme;
    const s = SIM.createState(5, START), p = SIM.living(s)[0]!;
    const tid = (ok: (t: number) => boolean) => { for (let h = 0; h < 24 * 400; h++) { const t = s.now + h * SIM.HOUR; if (ok(t)) return t; } return -1; };
    const het = tid(t => temperature(s, t) >= Math.max(KROPP.varmGrader, KROPP.kladFran) + 1);
    for (const t of SIM.tingOf(s)) if (t.bar === p.id) t.bar = undefined;
    const pa = (k: string) => { const t = SIM.addTool(s, k, p); t.bar = p.id; t.x = t.y = undefined; return t; };
    // hettan: med hatten svalare än utan
    s.now = het;
    const hettaUtan = SIM.varmeDelar(s, p, 0, new Map()).hetta;
    const hatt = pa('hatt_halm');
    const kv = SIM.kladVarme(s, p), hettaMed = SIM.varmeDelar(s, p, 0, new Map()).hetta;
    // riktigt varmt: mössan tas av och hatten på
    hatt.bar = undefined; const mossa = pa('mossa_kaninskinn');
    p.warm = 1.6; SIM.stepKlader(s);
    const byter1 = mossa.bar === undefined; p.warm = 1.6; SIM.stepKlader(s);
    const hattPa = hatt.bar === p.id && mossa.bar === undefined;
    // kylan som fara: hatten av och mössan på
    const kall = tid(t => { s.now = t; return SIM.farorNu(s).kyla; });
    s.now = kall; p.warm = 0.5; SIM.stepKlader(s);
    const hattAv = hatt.bar === undefined;
    p.warm = 0.5; SIM.stepKlader(s);
    const mossaPa = mossa.bar === p.id;
    const projekt = SIM.PROJEKT.hatt, rock = SIM.PROJEKT.rock;
    return [
      [`skjortan av lin kyler lite (${v('skjorta_lintyg')}), skjortan av ylle värmer (${v('skjorta_ylle')})`, v('skjorta_lintyg') < 0 && v('skjorta_ylle') > 0],
      [`hatten av halm kyler mest (${v('hatt_halm')}, tunikan av lin ${v('tunika_lintyg')})`, (KLAD_MIN() as string) === 'hatt_halm' && v('hatt_halm') < v('tunika_lintyg')],
      [`hatten flätas av två hö vid slöjdbänken på 3 minuter`, SAKER.hatt_halm!.skaffa!.av!.torrgras === 2 && SAKER.hatt_halm!.skaffa!.min === 3 && SIM.STATIONER.flatarbank!.gor!.includes('hatt')],
      [`med hatten kyler kläderna (${kv.toFixed(3)}) och hettan är mindre (${hettaMed.toFixed(3)} mot ${hettaUtan.toFixed(3)})`, kv < 0 && hettaMed < hettaUtan],
      [`riktigt varmt: mössan av (${byter1}) och hatten på (${hattPa})`, het > 0 && byter1 && hattPa],
      [`när kylan är en fara tas hatten av (${hattAv}) och mössan på igen (${mossaPa})`, kall > 0 && hattAv && mossaPa],
      [`hatten skyddar inte mot kylan i projekten (${!!projekt?.motKyla}), rocken gör det (${!!rock?.motKyla})`, !!projekt && !projekt.motKyla && !!rock?.motKyla],
    ];
  },
};
const KLAD_MIN = () => SIM.KLAD_SLAG.reduce((a, k) => SIM.SAKER[k]!.klad!.varme < SIM.SAKER[a]!.klad!.varme ? k : a);

SCENARIER.frittgolv = {
  text: 'Fritt golv i husen (steg 12.1.36, golvNas i stationer.ts): ingen möbel eller station ställs på rutan innanför en dörr, och allt fritt golv och varje sak i huset nås från dörren. Det som redan står fel i en sparad by flyttas, en sak i timmen, och tas isär om det inte får plats',
  kor: () => {
    const { stationerOf, stationSite, bitAt, storlekAv, golvNas, gridOf, stepStationer } = SIM;
    const s = SIM.createState(1, START); klockan(s); tandEld(s);
    const hus = medHus(s)!, W = SIM.W; // W läses efter att kartan skapats
    const rum = () => gridOf(s).rooms.find(r => r.hus === hus.id && r.tiles.length)!;
    const iIngang = (t: SIM.Station) => { const { w, h } = storlekAv(t); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => bitAt(s, t.x + i + dx, t.y + j + dy)?.k === 'oppning')) return true; return false; };
    // bäddar så länge det finns plats: ingen i ingången, och golvet nås hela tiden från dörren
    let n = 0, allaNas = true;
    for (; n < 30 && stationSite(s, 'halmbadd'); n++) { medBank(s, 'halmbadd'); allaNas &&= golvNas(s, rum()); }
    const baddar = stationerOf(s).filter(t => t.k === 'halmbadd');
    const ingen = !baddar.some(iIngang);
    // en sparad by med en bädd som stänger in golvet: den sista bädden tas bort och läggs där den stänger in en ruta
    const sist = baddar.at(-1)!; s.stationer = stationerOf(s).filter(t => t !== sist); SIM.touch(s);
    const r0 = rum(), fel = r0.tiles.find(i => !golvNas(s, r0, [i]) && !SIM.stationAt(s, i % W, Math.floor(i / W)) && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => bitAt(s, i % W + dx, Math.floor(i / W) + dy)?.k === 'oppning'));
    let flyttad = false, stod = '';
    if (fel !== undefined) {
      const t: SIM.Station = { id: s.nextStation = (s.nextStation ?? 0) + 1, k: 'halmbadd', x: fel % W, y: Math.floor(fel / W), kvar: 0, inne: 1 };
      s.stationer!.push(t); SIM.touch(s);
      stod = `${t.x}, ${t.y}`;
      for (const p of SIM.living(s)) { p.x = 1.5; p.y = 1.5; p.task = undefined; } // ingen ligger i bädden
      stepStationer(s);
      const efter = stationerOf(s).find(q => q.id === t.id);
      flyttad = (!efter || `${efter.x}, ${efter.y}` !== stod) && golvNas(s, rum()); // flytta ändrar samma objekt
      stod += efter ? ` → ${efter.x}, ${efter.y}` : ' → isär';
    }
    const loggat = s.log.some(r => /inte kom fram i huset/.test(r.text));
    return [
      [`${n} bäddar fick plats i huset, ingen i ingången`, n >= 1 && ingen],
      [`golvet nåddes från dörren efter varje ny bädd`, allaNas],
      [`en ruta där en bädd stänger in golvet finns (${fel !== undefined})`, fel !== undefined],
      [`bädden som stängde in golvet flyttades eller togs isär (${stod}) och golvet nås igen`, flyttad && loggat],
    ];
  },
};

SCENARIER.tandmaterial = {
  lang: true,
  text: 'Tändmaterialet som ett vanligt material (steg 12.1.39): behovet räknas ur det elden behöver, inte ur höet till korgar och rep, och flintan och stenarna är egna behov. En by på 30 med fulla förråd av hö och kvistar men utan flinta skickar ingen efter tändmaterial, en by med fulla förråd av allt skickar ingen alls, och den som hämtar tändmaterial gör handlingen Samlar tändmaterial, säger det och bär bara hem hö och kvistar',
  kor: () => {
    const { living, setAmount, amountOf, taskName } = SIM;
    const by = (seed: number, saker: Record<string, number>) => {
      const s = SIM.createState(seed, START);
      s.now = new Date(s.now).setHours(9, 0, 0, 0);
      const kon = ['m', 'k'] as const;
      for (let i = 0; living(s).length < 30; i++) nyInvanare(s, kon[i % 2], 8 + (i * 7) % 40);
      setItems(s, saker); setMat(s, { bar: 900, rotter: 900 }); setAmount(s, 'ved', 400);
      return s;
    };
    // följer byn i fyra timmar, var femte minut: vilka som hämtar tändmaterial, vad de heter, säger och bär, och vilka som letar flinta
    const folj = (s: SIM.State) => {
      const r = { tand: 0, tandSkal: 0, namn: new Set<string>(), bar: new Set<string>(), leta: new Set<string>(), flest: 0 };
      for (let i = 0; i < 4 * 12; i++) {
        kor(s, 1 / 12);
        let n = 0;
        for (const p of living(s)) {
          const t = p.task;
          if (!t) continue;
          if (/tändmaterial/.test(t.why ?? '')) r.tandSkal++;
          if (t.sok) r.leta.add(taskName(t));
          if (!t.tandmat) continue;
          r.tand++; n++; r.namn.add(taskName(t));
          for (const k in t.items ?? {}) if ((t.items![k] ?? 0) > 0) r.bar.add(k);
        }
        r.flest = Math.max(r.flest, n);
      }
      return r;
    };
    const fullt = { torrgras: 150, grenar: 150, sten: 20, rep: 6, korg: 3 };
    const utanFlinta = folj(by(3, fullt));
    const alltFullt = folj(by(3, { ...fullt, flinta: 6 }));
    const s3 = by(7, { flinta: 6, sten: 20 }); s3.fire.lit = false; s3.fire.fuel = 0; s3.fire.emberUntil = undefined; s3.fire.ring = true;
    const fore = amountOf(s3, 'torrgras') + amountOf(s3, 'grenar');
    const tom = folj(s3), efter = amountOf(s3, 'torrgras') + amountOf(s3, 'grenar');
    return [
      [`en by på 30 med fulla förråd av hö och kvistar men utan flinta skickar ingen efter tändmaterial (${utanFlinta.tand * 5} minuter med tändmaterial, ${utanFlinta.tandSkal} med det skälet; letar: ${[...utanFlinta.leta].join(', ') || 'ingen'})`, utanFlinta.tand === 0 && utanFlinta.tandSkal === 0],
      [`den som letar flinta gör en handling som heter så (${[...utanFlinta.leta].join(', ') || 'ingen'})`, [...utanFlinta.leta].every(x => /^Letar efter (flinta|stenar)/.test(x))],
      [`en by med fulla förråd av allt (också det som gör korgar och rep) skickar ingen efter tändmaterial (${alltFullt.tand * 5} minuter, ${alltFullt.tandSkal} med skälet)`, alltFullt.tand === 0 && alltFullt.tandSkal === 0],
      [`utan hö och kvistar hämtar någon tändmaterial och gör handlingen Samlar tändmaterial (${tom.tand * 5} minuter, högst ${tom.flest} samtidigt, namn: ${[...tom.namn].join(', ')})`, tom.tand > 0 && [...tom.namn].every(x => x === 'Samlar tändmaterial')],
      [`hen säger att byn behöver tändmaterial och bär bara hö och kvistar (bär: ${[...tom.bar].join(', ') || 'inget'})`, tom.tandSkal > 0 && [...tom.bar].every(k => k === 'torrgras' || k === 'grenar')],
      [`det kommer hem (hö och kvistar i förrådet ${fore} före, ${efter} efter fyra timmar)`, efter > fore],
    ];
  },
};

SCENARIER.blotbord = {
  text: 'Blöt ved som bärs är blöt (steg 12.1.55): veden som plockas ur en blöt hög är blöt i bördan och gör högen den läggs på blöt, och den som eldar får det blöta hen själv tog, inte byns torra ved i genomsnitt',
  kor: () => {
    const s = SIM.createState(3, START), z = SIM.zonesOf(s)[0], p = SIM.living(s)[0], q = SIM.living(s)[1];
    SIM.setStock(s, { ved: 0 });
    const tom = (x: number, y: number) => !(s.stackar ?? []).some(a => a.x === x && a.y === y && a.n > 0);
    // en blöt hög utanför lagret: den som bär in den lägger blöt ved i förrådet
    let ute = { x: z.x + z.w + 2, y: z.y }; for (let d = 2; d < 12 && SIM.isStored(s, ute.x, ute.y); d++) ute = { x: z.x + z.w + d, y: z.y };
    s.stackar = (s.stackar ?? []).filter(a => !(a.x === ute.x && a.y === ute.y));
    s.stackar.push({ k: 'ved', n: 4, c: 1, x: ute.x, y: ute.y, blot: 1 } as typeof s.stackar[number]);
    SIM.changed(s);
    const t = { act: 'bara', phase: 'do', tx: ute.x, ty: ute.y, until: s.now, carry: 0, why: '' } as SIM.Task;
    SIM.pickUp(s, p, t, () => true);
    const iBordan = t.blotVed ?? 0, buret = t.items?.ved ?? 0;
    SIM.storeLoad(s, t);
    const inne = SIM.stacksOf(s).filter(a => a.k === 'ved' && SIM.isStored(s, a.x, a.y)), blotaInne = inne.every(a => (a as { blot?: 1 }).blot === 1);
    // torr ved som bara grannen äger: den som eldar med byns blöta ved får blöt ved
    let sp = { x: z.x, y: z.y }; for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) if (tom(x, y)) sp = { x, y };
    s.stackar!.push({ k: 'ved', n: 6, c: 1, x: sp.x, y: sp.y, ag: { [q.id]: 6 } } as typeof s.stackar[number]);
    SIM.changed(s);
    p.task = { act: 'elda', phase: 'go', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '' } as SIM.Task;
    const tog = SIM.takeFuel(s, 2, p), blotEld = p.task.blotVed ?? 0;
    return [
      [`veden ur den blöta högen är blöt i bördan (${buret} ved, ${iBordan} av den blöt)`, buret > 0 && iBordan === 1],
      [`högen i förrådet är blöt (${inne.length} högar)`, inne.length > 0 && blotaInne],
      [`den som eldar med byns blöta ved får blöt ved fast grannen har torr (${tog} tog, ${blotEld} blöt)`, tog > 0 && blotEld === 1],
    ];
  },
};

SCENARIER.branningljus = {
  text: 'Kolmilan och blästerugnen lyser lite och gnistrar som en lägereld medan de brinner (steg 12.2.1 och 12.2.3): ljuset i LJUSKALLOR och gnistorna i brand.ts',
  env: { BALANS: 'karta.bredd=120,karta.hojd=120,start.klader=0,forhist.ar=0,brand.gnista=0.05' }, // fler gnistor, så att det syns på kort tid
  kor: () => {
    const s = SIM.createState(1, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    klockan(s, 23);
    (p.tek ??= {}).kolmila = 1;
    const t = medBank(s, 'kolmila');
    SIM.setStock(s, { ved: 30 });
    const mitt = { x: t.x + 1, y: t.y + 1 }, langt = { x: t.x + 1 + SIM.MORKER.branningR + 2, y: t.y + 1 };
    const fore = SIM.ljusAt(s, mitt.x, mitt.y);
    SIM.branningKlar(s, p, { act: 'kola', phase: 'do', tx: t.x, ty: t.y, until: s.now, carry: 0, why: '', ref: t.id } as SIM.Task);
    const ljus = SIM.ljusAt(s, mitt.x, mitt.y), bort = SIM.ljusAt(s, langt.x, langt.y);
    // gnistorna: elden i byn är släckt och marken torr; milan tänder till sist något runt sig
    s.fire.lit = false;
    let brand: SIM.Brand | undefined;
    for (let i = 0; i < 3000 && !brand; i++) { s.now += 300000; if (s.now >= SIM.branningarOf(s)[0].slut - 600000) s.now -= 3 * 3600000; SIM.torkaTest(s); SIM.brandSteg(s, 300); brand = s.brand?.kalla === 'gnista' ? s.brand : undefined; }
    // utan milan: samma tid med släckt eld ger ingen gnista
    const u = SIM.createState(1, START); klockan(u, 23); u.fire.lit = false;
    for (let i = 0; i < 3000 && !u.brand; i++) { u.now += 300000; SIM.torkaTest(u); SIM.brandSteg(u, 300); }
    const utan = u.brand?.kalla === 'gnista';
    const nara = !utan && !!brand && Math.hypot(brand.x - mitt.x, brand.y - mitt.y) <= SIM.BRAND.gnistaR + SIM.BRAND.gnistVind + 2;
    return [
      [`milan lyser lite medan den brinner (före ${fore}, mitt i ${ljus.toFixed(2)}, ${SIM.MORKER.branningR + 2} rutor bort ${bort}), mindre än elden (${SIM.MORKER.branningR} mot ${SIM.MORKER.eldR} rutor)`, fore === 0 && ljus > 0 && bort === 0 && SIM.MORKER.branningR < SIM.MORKER.eldR],
      [`milan gnistrar och kan tända en brand intill (${brand ? `vid ${brand.x}, ${brand.y}` : 'ingen'})`, nara],
    ];
  },
};

SCENARIER.eldruta = {
  text: 'Inget ligger i elden (steg 12.1.153): en ruta med en eld, brasa eller härd tar inte emot högar, varken i en lagerplats eller när någon släpper sin börda, och det som redan ligger där flyttas till närmaste fria ruta',
  kor: () => {
    const s = SIM.createState(9, START), z = SIM.zonesOf(s)[0], at = { x: z.x, y: z.y }, i = at.y * SIM.W + at.x;
    const pa = (x: number, y: number) => SIM.stacksOf(s).filter(a => a.x === x && a.y === y && a.n > 0);
    // en hög ligger i lagret, och en brasa blir klar på rutan: högen flyttas
    SIM.setAmount(s, 'sten', 1); const sten = SIM.stacksOf(s).find(a => a.k === 'sten')!; sten.x = at.x; sten.y = at.y;
    const t = { id: 991, k: 'brasa', x: at.x, y: at.y, kvar: 0 } as SIM.Station; (s.stationer ??= []).push(t);
    SIM.nyEld(s, t);
    const flyttad = !pa(at.x, at.y).length && SIM.amountOf(s, 'sten') === 1;
    // lagret fylls: inget läggs på brasans ruta
    SIM.setAmount(s, 'ved', 40); SIM.setAmount(s, 'grenar', 40); SIM.setAmount(s, 'flinta', 20);
    const iLagret = !pa(at.x, at.y).length;
    // någon släpper sin börda mitt i brasan: den läggs bredvid
    const p = nyInvanare(s, 'm', 30);
    const tk = { act: 'samla', phase: 'do', carry: 0, items: { sten: 3 } } as unknown as SIM.Task;
    SIM.dropLoad(s, tk, at.x + 0.5, at.y + 0.5, p.id);
    const borda = !pa(at.x, at.y).length;
    // utanför lagret, på den första elden
    const f = SIM.eldPlats(s), tk2 = { act: 'samla', phase: 'do', carry: 0, items: { sten: 2 } } as unknown as SIM.Task;
    SIM.dropLoad(s, tk2, f.x + 0.5, f.y + 0.5, p.id);
    const forsta = !pa(f.x, f.y).length;
    // örtkökets härd är en eldruta, inte bänken bredvid
    const ort: SIM.Station = { id: 992, k: 'ortkok', x: at.x + 8, y: at.y + 8, kvar: 0, delar: SIM.delarIRad('ortkok', at.x + 8, at.y + 8) };
    s.stationer!.push(ort);
    const eld = SIM.eldRutor(s), hard = SIM.delarAv(ort).filter(q => q.del?.eld), ovr = SIM.delarAv(ort).filter(q => !q.del?.eld);
    const iHard = hard.length > 0 && hard.every(q => eld.has(q.y * SIM.W + q.x)) && ovr.every(q => !eld.has(q.y * SIM.W + q.x));
    return [
      ['det som låg där brasan lades flyttas', flyttad],
      ['brasans ruta hör till eldrutorna', eld.has(i)],
      ['lagret lägger inget på brasan', iLagret],
      ['den som släpper sin börda i brasan lägger den bredvid', borda],
      ['inget läggs i den första elden', forsta],
      ['örtkökets härd är en eldruta, men inte resten av köket', iHard],
    ];
  },
};
