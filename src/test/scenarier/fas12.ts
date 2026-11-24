// Scenarier för fas 12: myren och järnet.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as SIM from '../../sim';
import { SCENARIER, klockan, kor, testBy, styreTimme, medBank, medHus, nyInvanare, setFood, setItems, setMat, tandEld, tandOchFlinta } from './hjalp';
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
    SIM.tidyTools(s); const barare = r?.barare !== undefined ? SIM.byId(s, r.barare) : undefined, iHanden = mest.hos === barare?.id && r?.offer?.ting === mest.id;
    for (const p of med) { p.task = { act: 'ritual', phase: 'do', tx: r!.x, ty: r!.y, until: r!.slut, carry: 0, why: '' } as SIM.Task; p.x = r!.x; p.y = r!.y; } // vid myrkanten
    const tro0 = med[0]?.troStyrka ?? 0;
    s.now = r?.slut ?? s.now; SIM.ritualTimme(s);
    const tro1 = med[0]?.troStyrka ?? 0, faktor = Math.min(SIM.KULT.myrTak, 1 + (val?.v ?? 0) / SIM.KULT.myrVarde);
    const borta = !SIM.tingOf(s).includes(mest), kvar = SIM.tingOf(s).filter(t => t.agare === kid).length;
    // samma dygn hålls inget nytt offer; nästa dygn sänks nästa sak
    s.now += 2 * SIM.HOUR; SIM.kultTimme(s); const igen = !!s.ritual || !!s.ritualKo?.some(q => q.k === 'myrOffer');
    // nästa dygn sänks nästa sak, men bäraren går inte till myren (steg 12.1.240): inget sänks, och kyrkan har kvar saken
    s.ritual = undefined; s.ritualKo = []; s.now += SIM.DAY; klockan(s, 10); const kott0 = SIM.ownsId(s, kid, 'kott'); SIM.kultTimme(s);
    const kottUnder = SIM.ownsId(s, kid, 'kott');
    const r2 = s.ritual as SIM.Ritual | undefined, t2 = r2?.offer?.ting !== undefined ? SIM.tingOf(s).find(t => t.id === r2.offer!.ting) : undefined;
    const ute = SIM.living(s).filter(p => p.id !== r2?.barare);
    for (const p of ute) { p.task = { act: 'ritual', phase: 'do', tx: r2!.x, ty: r2!.y, until: r2!.slut, carry: 0, why: '' } as SIM.Task; p.x = r2!.x; p.y = r2!.y; }
    const b2 = r2?.barare !== undefined ? SIM.byId(s, r2.barare) : undefined; if (b2) b2.task = undefined;
    const sankt0 = s.stat?.myroffer ?? 0; if (r2) s.now = r2.slut; SIM.ritualTimme(s);
    const kvarHos = (t2 ? SIM.tingOf(s).includes(t2) && t2.agare === kid && t2.hos === undefined : r2?.offer?.k === 'kott' && kottUnder === kott0 - 1 && SIM.ownsId(s, kid, 'kott') === kott0) && (s.stat?.myroffer ?? 0) === sankt0;
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
      [`en troende (${barare?.name}) bär offret i handen till myren (${iHanden})`, iHanden],
      [`är bäraren inte vid myrkanten sänks inget, och kyrkan har kvar saken (${r2?.offer?.k}: ${kott0} → ${kottUnder} → ${SIM.ownsId(s, kid, 'kott')})`, kvarHos],
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
    // en järnnål (två nålar av ett järn) lämnar inget skrot, och skrotet räknas per sak för alla recept (steg 12.1.238)
    SIM.addTool(s, 'jarnnal', p); SIM.wearTool(s, p, 'jarnnal', 10);
    const skrot3 = SIM.amountOf(s, 'jarnskrot'), nalGer = SIM.SAKER.jarnnal?.skaffa?.ger;
    const fel = Object.keys(SIM.SAKER).filter(k => (SIM.SAKER[k]?.skaffa?.av?.jarn ?? 0) > 0 && SIM.skrotAv(k) * (SIM.SAKER[k]?.skaffa?.ger ?? 1) > (SIM.SAKER[k]?.skaffa?.av?.jarn ?? 0));
    // den som vill ha järn smider om skrotet
    const u = SIM.PROJEKT.jarn!.uppgift(s, p);
    const tk = { act: 'smida', phase: 'do', tx: t.x, ty: t.y, until: s.now, carry: 0, why: '', tool: 'jarn', ref: t.id } as SIM.Task;
    p.task = tk; SIM.smidaKlar(s, p, tk); p.task = undefined;
    const jarn = SIM.amountOf(s, 'jarn'), kvar = SIM.amountOf(s, 'jarnskrot');
    return [
      [`en sönderslipad järnyxa lämnar 2 järnskrot (${skrot})`, borta && skrot === 2],
      [`en flintyxa lämnar inget (${skrot2})`, skrot2 === 2],
      [`en järnnål (${nalGer} av ett järn) lämnar inget skrot (${skrot3})`, nalGer === 2 && skrot3 === 2],
      [`ingen sak lämnar mer skrot än järnet den gjordes av${fel.length ? ` (${fel.join(', ')})` : ''}`, fel.length === 0],
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
      return { h: h?.id, min: h ? SIM.halMin(s, p, p.x, p.y) : undefined };
    };
    const med = halet(true), utan = halet(false);
    // borren slits: den håller 200 hål
    const s = SIM.createState(1, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    s.is = { vatten: 0, cm: 40 } as typeof s.is;
    SIM.addTool(s, 'isborr', p);
    let hal = 0;
    while (SIM.nTools(s, 'isborr') > 0 && hal < 1000) { SIM.halGjort(s, p, p.x + hal * 2, p.y); hal++; } // varje hål på ett nytt ställe: där en vak redan är öppen behövs inget nytt (steg 13.1.15)
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
  kor: () => {
    const { SAKER, KROPP, temperature } = SIM;
    const v = (k: string) => SAKER[k]!.klad!.varme;
    const s = SIM.createState(5, START), p = SIM.living(s)[0]!;
    const tid = (ok: (t: number) => boolean) => { for (let h = 0; h < 24 * 400; h++) { const t = s.now + h * SIM.HOUR; if (ok(t)) return t; } return -1; };
    const het = tid(t => temperature(s, t) >= Math.max(25, KROPP.kladFran + 1)); // riktigt varmt: klädseln väljs efter värmen (steg 12.1.149)
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
      [`rutorna skriver ett svalt plagg som svalkande (${SIM.varmeText(v('hatt_halm'))}) och ett varmt som värmande (${SIM.varmeText(v('skjorta_ylle'))}; steg 12.1.260)`, SIM.varmeText(v('hatt_halm')) === `Svalkar ${Math.round(-v('hatt_halm') * 100)} %` && SIM.varmeText(v('skjorta_ylle')).startsWith('Värmer ')],
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
    const kopia = SIM.cloneState(s);
    const tog = SIM.takeFuel(s, 2, p), blotEld = p.task.blotVed ?? 0;
    // uttaget svarar själv hur mycket som var blött (steg 12.1.241): samma uttag ur samma by ger samma svar, vad som än hänt förut
    const ut = { blot: 0 }, kp = SIM.byId(kopia, p.id)!, ag = SIM.use(kopia, kp, 'ved', 1, true, undefined, ut);
    const ut2 = { blot: 0 }, kopia2 = SIM.cloneState(kopia); SIM.use(kopia2, SIM.byId(kopia2, p.id)!, 'ved', 1, true, undefined, ut2);
    return [
      [`veden ur den blöta högen är blöt i bördan (${buret} ved, ${iBordan} av den blöt)`, buret > 0 && iBordan === 1],
      [`högen i förrådet är blöt (${inne.length} högar)`, inne.length > 0 && blotaInne],
      [`den som eldar med byns blöta ved får blöt ved fast grannen har torr (${tog} tog, ${blotEld} blöt)`, tog > 0 && blotEld === 1],
      [`uttaget ger tillbaka den blöta veden det tog (${ut.blot} av ${SIM.sumOf(ag)}), och igen ur samma by (${ut2.blot})`, ut.blot === 1 && SIM.sumOf(ag) === 1 && ut2.blot === 1],
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

SCENARIER.sag = {
  text: 'Sågen (steg 12.5.1): en handsåg från smedjan (1 järn och 1 grenar, 4 minuter) som ligger vid klyvplatsen, gör en planka på en tredjedel av tiden och ger det minsta såret vid en amputation',
  kor: () => {
    const R = SIM.RECEPT.sag;
    const s = SIM.createState(1, START), vuxna = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen), [p, q, r] = vuxna;
    klockan(s, 10);
    for (const v of vuxna) Object.assign((v.tek ??= {}), { smedja: 1, klyvplats: 1, kniv: 1 });
    const smedja = medBank(s, 'smedja'), klyv = medBank(s, 'klyvplats');
    SIM.setStock(s, { jarn: 4, grenar: 4, kol: 4, virke: 4 });
    // amputationen: med sågen blir stumpen mindre än med kniven
    const stump = (g: SIM.Person, k?: string) => {
      if (k) SIM.addTool(s, k, g);
      const w = { d: 'handV', k: 'skarsar', g: 0.3, b: 0, inf: 0.9 } as SIM.Skada; q.skador = [w];
      const v = SIM.VARD.amputera, kan = SIM.vardKan(s, g, v, q);
      v.gor(s, g, q, w);
      const st = q.skador?.[q.skador.length - 1]; q.skador = []; q.saknas = []; return kan ? st?.g : undefined;
    };
    const medKniv = stump(r, 'kniv');
    const utan = SIM.PROJEKT.klyva_plank!.uppgift(s, p)?.min ?? 0, brist = SIM.jarnBrist(s, 'sag'), u = SIM.PROJEKT.sag!.uppgift(s, p);
    // smidet: sågen läggs vid klyvplatsen och blir byns
    const tk = { act: 'smida', phase: 'do', tx: smedja.x, ty: smedja.y, until: s.now, carry: 0, why: '', tool: 'sag', ref: smedja.id } as SIM.Task;
    p.task = tk; SIM.smidaKlar(s, p, tk); p.task = undefined;
    const sag = SIM.tingOf(s).find(t => t.k === 'sag'), med = SIM.PROJEKT.klyva_plank!.uppgift(s, p)?.min ?? 0, bristEfter = SIM.jarnBrist(s, 'sag');
    // den slits för varje planka
    const c0 = sag?.c ?? 0; SIM.slitRedskapVid(s, 'klyva_plank', 2); const c1 = sag?.c ?? 0;
    const medSag = stump(r); // sågen vid klyvplatsen är byns
    return [
      [`sågen: ${JSON.stringify(R.av)} på ${R.min} minuter i smedjan`, R.av.jarn === 1 && R.av.grenar === 1 && R.min === 4 && R.tek === 'smedja' && !!SIM.JARNSAKER.sag],
      [`byn med en klyvplats utan såg saknar en (${brist}), och den smids vid städet (${u?.act}, ${u?.tool})`, brist > 0 && u?.act === 'smida' && u.tool === 'sag'],
      [`sågen ligger vid klyvplatsen och är byns (vid ${sag?.vid}, ägare ${sag?.agare}), och byn saknar ingen längre (${bristEfter})`, sag?.vid === klyv.id && sag.agare === SIM.BYN && bristEfter === 0],
      [`en planka blir klar på en tredjedel av tiden (${utan} min utan, ${med.toFixed(2)} med)`, Math.abs(utan / med - 3) < 1e-9],
      [`sågen slits för varje planka (${c0.toFixed(4)} till ${c1.toFixed(4)}) och håller ${SIM.ACTS.klyva_plank.redskap!.sag.haller} plankor`, c1 < c0 && SIM.ACTS.klyva_plank.redskap!.sag.haller === 300],
      [`amputationen med sågen ger det minsta såret (${medSag} mot ${medKniv} med kniven)`, medSag === SIM.HALSA.ampSag && medKniv === SIM.HALSA.ampKniv && medSag! < medKniv!],
    ];
  },
};

SCENARIER.ullsax = {
  text: 'Ullsaxen (steg 12.5.2): en sax från smedjan (1 järn, 3 minuter) som klipper ett får på en tredjedel av tiden mot kniven; en by utan sax klipper med kniven som förut',
  kor: () => {
    const R = SIM.RECEPT.ullsax, rad = SIM.FORBATTRA.find(a => a.id === 'klippa')!; // en rad med poäng på Förbättra (steg 13.8.7)
    // ett får vars ull vuxit ut, och vad den vuxne väljer med kniven och med saxen
    const val = (sax: boolean) => {
      const s = SIM.createState(2, START); klockan(s, 10);
      const p = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)[0];
      SIM.put(s, 'levfar', 1, { [p.id]: 1 }); SIM.stepBoskap(s);
      const d = SIM.tamdjurOf(s).find(q => q.art === 'far')!; d.ull = 1;
      if (sax) SIM.addTool(s, 'ullsax', p); else SIM.setAmount(s, 'kniv', 1);
      const v = { act: 'vila', why: '', dur: 0 } as SIM.Val;
      const k = rad.kand({ s, p, v, a: SIM.ageOf(p, s.now) } as never, undefined as never); k?.gor(); const ok = !!k;
      return { ok, tool: v.tool, min: v.dur / SIM.MIN, s, p };
    };
    const kniv = val(false), sax = val(true);
    // saxen slits för varje får
    const t = SIM.tingOf(sax.s).find(q => q.k === 'ullsax')!, c0 = t.c;
    sax.p.task = { act: 'klippa', phase: 'do', tx: sax.p.x, ty: sax.p.y, until: sax.s.now, carry: 0, why: '', tool: 'ullsax' } as SIM.Task;
    SIM.wearUsed(sax.s, sax.p, 1); sax.p.task = undefined;
    return [
      [`ullsaxen: ${JSON.stringify(R.av)} på ${R.min} minuter i smedjan`, R.av.jarn === 1 && Object.keys(R.av).length === 1 && R.min === 3 && R.tek === 'smedja' && !!SIM.JARNSAKER.ullsax],
      [`utan sax klipps fåret med kniven som förut (${kniv.tool}, ${kniv.min} min)`, !!kniv.ok && kniv.tool === 'kniv'],
      [`med saxen går det på en tredjedel av tiden (${sax.tool}, ${sax.min.toFixed(2)} min)`, !!sax.ok && sax.tool === 'ullsax' && Math.abs(kniv.min / sax.min - 3) < 1e-9],
      [`saxen slits för varje får (${c0.toFixed(4)} till ${t.c.toFixed(4)}) och håller ${SIM.ACTS.klippa.redskap!.ullsax.haller} klippningar`, t.c < c0 && SIM.ACTS.klippa.redskap!.ullsax.haller === 400],
    ];
  },
};

SCENARIER.jarnnal = {
  text: 'Järnnålen (steg 12.5.3): en bättre bennål från smedjan (1 järn ger 2 nålar, 3 minuter); kläder sys tre gånger så fort och får oftare bra kvalitet, och nålen håller fyra gånger så länge',
  kor: () => {
    const R = SIM.RECEPT.jarnnal, S = SIM.SAKER;
    const s = SIM.createState(1, START), vuxna = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen), [p, q] = vuxna;
    klockan(s, 10);
    for (const v of vuxna) Object.assign((v.tek ??= {}), { smedja: 1, bensyl: 1 });
    const smedja = medBank(s, 'smedja'); medBank(s, 'flatarbank');
    SIM.setStock(s, { jarn: 2, kol: 4 });
    const fart0 = SIM.nalFart(s, q, 'rock'), kv0 = SIM.nalKv(s, q, 'rock_kaninskinn'), brist = SIM.jarnBrist(s, 'jarnnal');
    const tk = { act: 'smida', phase: 'do', tx: smedja.x, ty: smedja.y, until: s.now, carry: 0, why: '', tool: 'jarnnal', ref: smedja.id } as SIM.Task;
    p.task = tk; SIM.smidaKlar(s, p, tk); p.task = undefined;
    const nalar = SIM.tingOf(s).filter(t => t.k === 'jarnnal').length, jarnKvar = SIM.amountOf(s, 'jarn');
    for (const t of SIM.tingOf(s)) if (t.k === 'jarnnal') t.agare = SIM.BYN;
    const fart = SIM.nalFart(s, q, 'rock'), kv = SIM.nalKv(s, q, 'rock_kaninskinn'), smitt = SIM.nalFart(s, q, 'jarnhjalm');
    // nålen i sömnaden (steg 12.1.239): en rad i ACTS.redskap, den som syr tar nålen, den slits per plagg, och sluttiden följer farten
    const rad = SIM.ACTS.rock.redskap?.jarnnal;
    SIM.taNal(s, q, 'rock'); const nal = SIM.tingOf(s).find(t => t.k === 'jarnnal' && t.hos === q.id), c0 = nal?.c ?? 0;
    SIM.slitNal(s, q, 'rock'); const slits = c0 - (nal?.c ?? 0);
    const halv = SIM.newTing(s, 'paborjat', 1, q.id); halv.halv = { gor: 'rock_kaninskinn', av: {}, kvar: 10 * SIM.MIN, ag: q.id };
    const sk = { act: 'rock', phase: 'do', tx: q.x, ty: q.y, until: s.now + SIM.HOUR, carry: 0, why: '', ref: halv.id } as SIM.Task;
    SIM.workHalf(s, q, sk, 60); const fartNu = SIM.fartVid(s, q, 'rock') * SIM.nalFart(s, q, 'rock'), slutNal = sk.until - s.now, vantat = halv.halv.kvar / fartNu;
    s.ting = SIM.tingOf(s).filter(t => t !== halv);
    // ett sår sys med järnnålen som med bennålen
    const sy = SIM.VARD.sy, w = { d: 'armV', k: 'skarsar', g: 0.8, b: 0.5 } as SIM.Skada; q.skador = [w];
    SIM.setAmount(s, 'rep', 2); p.skill.lakekonst = Math.max(p.skill.lakekonst, sy.fardighet ?? 0);
    const syr = sy.krav(s, q, w, p) && SIM.vardKan(s, p, sy, q);
    return [
      [`järnnålen: ${JSON.stringify(R.av)} ger ${R.ger} nålar på ${R.min} minuter i smedjan`, R.av.jarn === 1 && R.ger === 2 && R.min === 3 && R.tek === 'smedja' && !!SIM.JARNSAKER.jarnnal],
      [`byn som syr vid slöjdbänken och kan smida saknar en (${brist})`, brist > 0],
      [`smidet tar 1 järn (kvar ${jarnKvar}) och ger ${nalar} nålar`, nalar === 2 && jarnKvar === 1],
      [`med järnnålen sys en rock tre gånger så fort (${fart0} → ${fart}), men det som smids går inte fortare (${smitt})`, fart0 === 1 && fart === 3 && smitt === 1],
      [`och den blir oftare bra (+${kv.toFixed(2)}, utan ${kv0})`, kv > 0 && kv0 === 0],
      [`sömnaden har en rad för nålen (håller ${rad?.haller} plagg), och den som syr tar nålen i handen (${!!nal})`, rad?.haller === SIM.REDSKAP.nalPlagg && !!nal],
      [`nålen slits per plagg (${slits.toFixed(4)}, en fyrtiondel efter kvaliteten)`, Math.abs(slits - 1 / SIM.REDSKAP.nalPlagg / SIM.kvHaller(nal)) < 1e-9],
      [`sluttiden räknas ur farten just nu (${(slutNal / SIM.MIN).toFixed(2)} min kvar, väntat ${(vantat / SIM.MIN).toFixed(2)})`, Math.abs(slutNal - vantat) < 1 && fartNu >= 3],
      [`järnnålen ligger i bennålens grupp och syr ett sår som den (${syr})`, SIM.gruppOf('jarnnal') === 'nal' && (S.jarnnal!.rang ?? 0) > (S.nal!.rang ?? 0) && syr],
      [`den håller fyra gånger så länge som bennålen (slits ${S.jarnnal!.slits} mot ${S.nal!.slits})`, Math.abs(S.nal!.slits! / S.jarnnal!.slits! - 4) < 1e-9],
    ];
  },
};

SCENARIER.hacka = {
  text: 'Järnhackan (steg 12.5.4): ett redskap från smedjan (2 järn och 1 grenar, 5 minuter) som bryter byggsten tre gånger så fort; utan hacka bryts stenen som förut',
  kor: () => {
    const R = SIM.RECEPT.jarnhacka;
    const uppgift = (hacka: boolean) => {
      const s = SIM.createState(3, START); klockan(s, 8);
      const p = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)[0];
      p.tek = { ...p.tek, byggsten: 1, smedja: 1 };
      if (hacka) SIM.addTool(s, 'jarnhacka', p);
      return { s, p, u: SIM.PROJEKT.byggsten!.uppgift(s, p) };
    };
    const utan = uppgift(false), med = uppgift(true);
    SIM.STENBEHOV.scenario = () => 2;
    let vill = 0;
    try { vill = SIM.villAv(med.s, 'jarnhacka'); } finally { delete SIM.STENBEHOV.scenario; }
    // hackan slits för varje sten
    const t = SIM.tingOf(med.s).find(q => q.k === 'jarnhacka')!, c0 = t.c;
    med.p.task = { act: 'bryta', phase: 'do', tx: med.p.x, ty: med.p.y, until: med.s.now, carry: 0, why: '', tool: 'jarnhacka' } as SIM.Task;
    SIM.KLAR_FOR.bryta!(med.s, med.p, med.p.task, 0); med.p.task = undefined;
    return [
      [`järnhackan: ${JSON.stringify(R.av)} på ${R.min} minuter i smedjan, och den kräver Byggsten`, R.av.jarn === 2 && R.av.grenar === 1 && R.min === 5 && R.tek === 'smedja' && SIM.JARNSAKER.jarnhacka?.tek === 'byggsten'],
      [`utan hacka bryts stenen som förut (${utan.u?.min} min, ${utan.u?.tool ?? 'inget redskap'})`, utan.u?.act === 'bryta' && utan.u.min === SIM.BYGGSTEN.min && !utan.u.tool],
      [`med hackan tre gånger så fort (${med.u?.min?.toFixed(2)} min, ${med.u?.tool})`, med.u?.tool === 'jarnhacka' && Math.abs(SIM.BYGGSTEN.min / med.u.min! - 3) < 1e-9],
      [`byn vill ha en hacka när den planerat något av sten och kan smida (${vill})`, vill === 1],
      [`hackan slits för varje sten (${c0.toFixed(4)} till ${t.c.toFixed(4)}) och håller ${SIM.ACTS.bryta.redskap!.jarnhacka.haller} stenar`, t.c < c0 && SIM.ACTS.bryta.redskap!.jarnhacka.haller === 150],
    ];
  },
};

SCENARIER.gryta = {
  text: 'Järngrytan (steg 12.5.5): ett kokkärl från smedjan (3 järn, 5 minuter) som tar dubbel sats, så att en kokning ger 8 portioner i stället för 4, och som inte spricker i elden',
  kor: () => {
    const R = SIM.RECEPT.jarngryta;
    // en kokning i kärlet k med råvaror till n satser
    const koka = (k: string, n: number) => {
      const s = SIM.createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
      setMat(s, {});
      const ro = n + SIM.utsade(s, 'rolleka');
      SIM.setAmount(s, 'fisk', 2 * n); SIM.setAmount(s, 'rotter', 2 * n); SIM.setAmount(s, 'rolleka', ro);
      p.tek = { ...(p.tek ?? {}), kruka: 1 }; s.fire.lit = true; p.skill.matlagning = SIM.MATLAG.brannFull;
      const kr = SIM.addTool(s, k, p); kr.hos = undefined;
      const r = SIM.kokRecept(s, p);
      SIM.kokaKlar(s, p);
      const fisk = SIM.amountOf(s, 'fisk');
      SIM.stepKok(s, SIM.KATEGORIER.gryta.passiv * 60);
      return { satser: r?.satser, fisk, portioner: SIM.amountOf(s, SIM.rattId('fisk', 'gryta', 'fin')) };
    };
    const kruka = koka('lerkruka_mellan', 2), gryta = koka('jarngryta', 2), lite = koka('jarngryta', 1);
    // grytan tas före krukan
    const s = SIM.createState(1, START), p = SIM.living(s)[0];
    const a = SIM.addTool(s, 'lerkruka_mellan', p), b = SIM.addTool(s, 'jarngryta', p); a.hos = undefined; b.hos = undefined;
    const forst = SIM.ledigKruka(s)?.k, S = SIM.SAKER;
    return [
      [`järngrytan: ${JSON.stringify(R.av)} på ${R.min} minuter i smedjan, och den kräver Lerkruka`, R.av.jarn === 3 && Object.keys(R.av).length === 1 && R.min === 5 && R.tek === 'smedja' && SIM.JARNSAKER.jarngryta?.tek === 'kruka'],
      [`i lerkrukan blir en kokning ${kruka.portioner} portioner av en sats (fisken kvar ${kruka.fisk})`, kruka.satser === 1 && kruka.portioner === 4 && kruka.fisk === 2],
      [`i järngrytan blir den ${gryta.portioner} portioner av dubbla råvaror (fisken kvar ${gryta.fisk})`, gryta.satser === 2 && gryta.portioner === 8 && gryta.fisk === 0],
      [`räcker råvarorna bara till en sats blir det en (${lite.portioner} portioner)`, lite.satser === 1 && lite.portioner === 4],
      [`grytan tas före lerkrukan (${forst})`, forst === 'jarngryta'],
      [`den spricker inte: den slits mycket långsammare än lerkrukan (${S.jarngryta!.slits} mot ${S.lerkruka_mellan!.slits}) och väger ${S.jarngryta!.vikt}`, S.jarngryta!.slits! * 4 <= S.lerkruka_mellan!.slits! && S.jarngryta!.vikt === 4],
    ];
  },
};

SCENARIER.las = {
  env: { BALANS: 'fangelse.bryt=-99,fangelse.vakt=0' }, // fången vill alltid ut och ingen vaktar: här prövas tiden det tar
  text: 'Låset och den låsta dörren (steg 12.5.6): låset smids i smedjan (1 järn, 4 minuter, tekniken Lås), och en dörr med lås (2 plankor och 1 lås, 20 minuter) är nästa rad i DORRAR efter trädörren. Den är bommad också när huset är tomt, och en fånge behöver dubbelt så lång tid för att bryta sig ut',
  kor: () => {
    const R = SIM.RECEPT, T = SIM.TEK.las, D = SIM.DORRAR as Record<string, SIM.DorrDef>;
    const by = (dorr: string) => {
      const s = SIM.createState(6, START); klockan(s, 10); medHus(s);
      const h = SIM.housesOf(s)[0]!, b = SIM.fangelseDorr(s, h)!; b.dorr = dorr; SIM.touch(s);
      return { s, h, b };
    };
    // låset smids för dörren: dörrprojektet saknar låset och ärver till smidet
    const { s, h, b } = by('tradorr');
    const vuxna = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen), p = vuxna[0];
    for (const v of vuxna) Object.assign((v.tek ??= {}), { smedja: 1, tradorr: 1, las: 1 });
    const smedja = medBank(s, 'smedja');
    SIM.setStock(s, { jarn: 2, kol: 4, plankor: 4 });
    const fara = { kyla: false, gras: 0 } as never;
    const kanUtan = SIM.PROJEKT.lasdorr!.kan(s, p, fara), a = SIM.arv(s, p, 'las', fara);
    const tk = { act: 'smida', phase: 'do', tx: smedja.x, ty: smedja.y, until: s.now, carry: 0, why: '', tool: 'las', ref: smedja.id } as SIM.Task;
    p.task = tk; SIM.smidaKlar(s, p, tk); p.task = undefined;
    const las = SIM.amountOf(s, 'las'), ting = SIM.tingOf(s).some(t => t.k === 'las'), kanMed = SIM.PROJEKT.lasdorr!.kan(s, p, fara);
    SIM.finishDorr(s, p, { act: 'dorr', tool: 'lasdorr' } as SIM.Task);
    const hangd = b.dorr, lasKvar = SIM.amountOf(s, 'las');
    // tom: den låsta dörren är bommad, trädörren inte
    for (const q of SIM.living(s)) if (SIM.roomAt(s, q.x, q.y)?.hus === h.id) { q.x = 1.5; q.y = 1.5; }
    const lastBom = SIM.bommad(s, b), tra = by('tradorr'), traBom = SIM.bommad(tra.s, tra.b);
    // fången: 20 minuter bakom trädörren, 40 bakom den låsta
    const ut = (dorr: string) => {
      const x = by(dorr), f = SIM.living(x.s).find(q => SIM.ageOf(q, x.s.now) >= SIM.ALDER.vuxen)!;
      SIM.satt(x.s, f, x.h, 'Dömd', x.s.now + 3 * SIM.DAY);
      SIM.fangeVal(x.s, f);
      return f.task?.act === 'rymma' ? (f.task.until - x.s.now) / SIM.MIN : -1;
    };
    const minTra = ut('tradorr'), minLas = ut('lasdorr');
    return [
      [`låset: ${JSON.stringify(R.las.av)} på ${R.las.min} minuter i smedjan, och tekniken Lås kräver ${T?.krav?.join(' och ')} och prövas fram i smedjan`, R.las.av.jarn === 1 && R.las.min === 4 && R.las.tek === 'smedja' && !!T && T.krav.includes('smedja') && T.krav.includes('tradorr') && !!T.forsok?.vid.includes('smedja')],
      [`den låsta dörren: ${JSON.stringify(R.lasdorr.av)} på ${R.lasdorr.min} minuter, nästa rad efter trädörren och lika tät`, R.lasdorr.av.plankor === 2 && R.lasdorr.av.las === 1 && R.lasdorr.min === 20 && SIM.dorrRang('lasdorr') === SIM.dorrRang('tradorr') + 1 && D.lasdorr.tat === D.tradorr.tat],
      [`utan lås kan dörren inte hängas (${kanUtan}), och låset smids för den (${a?.u?.act}, ${a?.u?.tool})`, !kanUtan && a?.u?.act === 'smida' && a.u.tool === 'las'],
      [`låset läggs i förrådet (${las}, inget redskap: ${!ting}) och sedan kan dörren hängas (${kanMed})`, las === 1 && !ting && kanMed],
      [`dörren ersätter trädörren (${hangd}) och tar låset (${lasKvar} kvar)`, hangd === 'lasdorr' && lasKvar === 0],
      [`när huset är tomt är den låsta dörren bommad (${lastBom}), trädörren inte (${traBom})`, lastBom && !traBom],
      [`en fånge bryter sig ut på ${minTra} minuter genom trädörren och ${minLas} genom den låsta`, minTra === 20 && minLas === 40],
    ];
  },
};

// steg 12.1.45: barnets hjälp väljs med samma poäng som de vuxnas rader, och fattas inget leker barnet
SCENARIER.barnhjalp = {
  text: 'Barnens hjälp följer behovet (steg 12.1.45): när veden och maten räcker länge hjälper barnen inte till med dem, och när veden är slut hjälper de till med veden och säger det',
  kor: () => {
    const prov = (ved: number) => {
      const s = SIM.createState(1, START); klockan(s, 10); tandEld(s); tandOchFlinta(s);
      setFood(s, 3000); SIM.setAmount(s, 'ved', ved);
      const barn = nyInvanare(s, 'k', SIM.ALDER.vuxen - 2);
      const varv: string[] = [];
      for (let i = 0; i < 200; i++) {
        Object.assign(barn, { hunger: 0.9, rest: 0.9, social: 0.9, toa: 0.9, torst: 0.9, warm: 0.9, task: undefined });
        SIM.chooseTask(s, barn);
        varv.push(`${barn.task?.act}|${barn.task?.why ?? ''}`);
        s.now += 7 * 60000;
        if (new Date(s.now).getUTCHours() >= 16) klockan(s, 10);
      }
      return varv;
    };
    const full = prov(3000), tom = prov(0);
    const vedFull = full.filter(r => r.includes('Hjälper till') && r.includes('ved')), vedTom = tom.filter(r => r.includes('Hjälper till. Byn behöver ved'));
    const lekFull = full.filter(r => r.startsWith('leka|')).length, hjalpFull = full.filter(r => r.includes('Hjälper till'));
    return [
      [`veden räcker länge: inget barn hjälper till med veden (${vedFull.length} av ${full.length}${vedFull[0] ? `, t.ex. ${vedFull[0]}` : ''})`, vedFull.length === 0],
      [`förråden räcker: barnet hjälper inte till (${hjalpFull.length} av ${full.length}${hjalpFull[0] ? `, t.ex. ${hjalpFull[0]}` : ''}) utan leker (${lekFull})`, hjalpFull.length === 0 && lekFull > full.length / 2],
      [`veden är slut: barnet hjälper till med veden och säger det (${vedTom.length} av ${tom.length})`, vedTom.length > 0],
    ];
  },
};

// steg 12.1.46: skadan och sjukdomen är en faktor i lusten till sport, lek och förbättringar, och orden stämmer med kroppen
SCENARIER.sjukvila = {
  text: 'Den som är sjuk eller skadad vilar (steg 12.1.46): skadan och sjukdomen sänker lusten till sport, lek och det som inte brådskar efter hur svår den är, den som vilar för sjukdomen står som sjuk, och "svårt sjuk" skrivs först när sjukdomen är så svår att hen lägger sig',
  kor: () => {
    const s = SIM.createState(1, START); klockan(s, 10); tandEld(s); tandOchFlinta(s); setFood(s, 3000); SIM.setAmount(s, 'ved', 3000);
    const vuxna = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen);
    const [frisk, latt, svar, sjuk] = vuxna;
    const kl = (p: SIM.Person) => SIM.kroppLust(p, s.now);
    const sv = (p: SIM.Person) => SIM.sportVikt(s, p, 1);
    // den sjuke med tydliga tecken vilar, och står som sjuk
    SIM.insjukna(s, sjuk, 'magsjuka'); sjuk.sjuk!.tecken = s.now; sjuk.sjuk!.st = 0; sjuk.sjuk!.grad = SIM.SJUK.vilaFran + 0.05;
    Object.assign(sjuk, { hunger: 0.9, rest: 0.9, social: 0.9, toa: 0.9, torst: 0.9, warm: 0.9, task: undefined });
    SIM.chooseTask(s, sjuk);
    const varfor = sjuk.task?.why ?? '';
    // såren efter den sjukes val, så att ingen vård går före vilan
    SIM.skada(s, latt, 'armV', 'skarsar', 0.15, 'olycka', 'i skogen');
    SIM.skada(s, svar, 'bal', 'skarsar', 0.9, 'olycka', 'i skogen'); SIM.skada(s, svar, 'benV', 'skarsar', 0.9, 'olycka', 'i skogen');
    const halvt = SIM.svartSjukNu(sjuk, s.now);
    sjuk.sjuk!.grad = SIM.SJUK.ligga; const helt = SIM.svartSjukNu(sjuk, s.now);
    // "ligger med feber" bara för en sjukdom med feber
    const feberUtan = SIM.valjVariant(s, 'l_svartSjuk', 1, { namn: 'X', feber: false });
    let feberText = 0; for (let n = 0; n < 200; n++) if (String(SIM.valjVariant(s, 'l_svartSjuk', n, { namn: 'X', feber: false })).includes('feber')) feberText++;
    // barnet (steg 12.1.216): lusten är en faktor på både leken och hjälpen, så det skadade barnet hjälper till mer sällan
    const barnVal = (skadat: boolean) => {
      const b0 = SIM.createState(1, START); klockan(b0, 10); tandEld(b0); tandOchFlinta(b0); setFood(b0, 3000); SIM.setAmount(b0, 'ved', 0);
      const barn = nyInvanare(b0, 'k', SIM.ALDER.vuxen - 2);
      if (skadat) SIM.skada(b0, barn, 'armV', 'blamarke', 0.4, 'olycka', 'i skogen');
      const n = { hjalp: 0, vila: 0, leka: 0, annat: new Set<string>() }, lust = SIM.kroppLust(barn, b0.now);
      for (let i = 0; i < 300; i++) {
        Object.assign(barn, { hunger: 0.9, rest: 0.9, social: 0.9, toa: 0.9, torst: 0.9, warm: 0.9, task: undefined });
        SIM.chooseTask(b0, barn);
        if (barn.task?.why?.startsWith('Hjälper till')) n.hjalp++; else if (barn.task?.act === 'vila') n.vila++; else if (barn.task?.act === 'leka') n.leka++; else n.annat.add(`${barn.task?.act}|${barn.task?.why}`);
        b0.now += 7 * 60000; if (new Date(b0.now).getUTCHours() >= 16) klockan(b0, 10);
      }
      return { ...n, lust };
    };
    const bf = barnVal(false), bs = barnVal(true);
    // menen (steg 12.1.219): kronisk smärta dämpar lusten mildare och aldrig till noll, och den som vilar för dem har värk
    const menad = nyInvanare(s, 'm', 30), menBarn = nyInvanare(s, 'k', 8);
    menad.men = [{ d: 'benH', fel: 0, ont: SIM.HALSA.menOnt }]; const kl1 = kl(menad);
    menad.men = [0, 1, 2, 3].map(() => ({ d: 'benH' as const, fel: 0, ont: SIM.HALSA.menOnt })); const kl4 = kl(menad);
    menBarn.men = [{ d: 'armV', fel: 0, ont: SIM.HALSA.menOnt }];
    const menSkal = SIM.vilaSkal(menBarn, s.now);
    return [
      [`menen dämpar lusten mildare (ett men ${kl1.toFixed(2)}, fyra ${kl4.toFixed(2)}) och aldrig till noll`, kl1 > 0.85 && kl1 < 1 && kl4 > 0.5 && kl4 < kl1],
      [`barnet med ett men vilar för värken, inte som sjukt: "${menSkal}"`, menSkal === 'Har värk och vilar' && !SIM.vilaHellre(menBarn)],
      [`det skadade barnet hjälper till mer sällan och vilar (friskt: hjälper ${bf.hjalp}, leker ${bf.leka}, vilar ${bf.vila}; skadat med lusten ${bs.lust.toFixed(2)}: hjälper ${bs.hjalp}, leker ${bs.leka}, vilar ${bs.vila}${bs.annat.size ? `, annat: ${[...bs.annat].slice(0, 3).join('; ')}` : ''})`, bs.lust > 0 && bs.lust < 1 && bs.vila > 0 && bs.hjalp < bf.hjalp * (bs.lust + 1) / 2],
      [`den friska vill fullt ut (${kl(frisk).toFixed(2)})`, kl(frisk) === 1],
      [`den lätt skadade vill mindre (${kl(latt).toFixed(2)}), och sporten lockar mindre (${sv(latt).toFixed(3)} mot ${sv(frisk).toFixed(3)})`, kl(latt) > 0 && kl(latt) < 1 && sv(latt) <= sv(frisk)],
      [`den svårt skadade vill inte alls (${kl(svar).toFixed(2)}) och spelar inte (${sv(svar)})`, kl(svar) === 0 && sv(svar) === 0],
      [`den sjuke vilar och står som sjuk: "${varfor}"`, sjuk.task?.act === 'vila' && varfor === 'Är sjuk och vilar'],
      [`"svårt sjuk" först när den sjuke lägger sig (grad ${SIM.SJUK.vilaFran + 0.05}: ${halvt}, grad ${SIM.SJUK.ligga}: ${helt})`, !halvt && helt],
      [`utan feber står det inget om feber (${feberText} av 200, t.ex. ${JSON.stringify(feberUtan)})`, feberText === 0],
    ];
  },
};

// steg 12.1.47: åldern och storleken vägs in i viljan att slåss
SCENARIER.barnslagsmal = {
  text: 'Åldern i slagsmålen (steg 12.1.47): ett gräl mellan två vuxna blir oftare ett slagsmål än ett mellan en vuxen och ett barn på åtta år, och ett barn på fyra år slåss inte utan gråter',
  kor: () => {
    const s = SIM.createState(1, START); klockan(s, 10);
    const vuxen = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen);
    const [a, b] = vuxen, atta = nyInvanare(s, 'k', 8), fyra = nyInvanare(s, 'm', 4);
    const t0 = s.now;
    const prov = (x: SIM.Person, y: SIM.Person) => {
      let n = 0;
      s.now = t0; // åldrarna står still: 4000 försök på en minut var
      for (let i = 0; i < 4000; i++) {
        s.kartStrider = []; for (const q of [x, y]) q.task = undefined;
        SIM.gralBlirSlagsmal(s, x, y);
        if (SIM.kartStridAv(s, x)) n++;
        s.now += 1000;
      }
      s.kartStrider = [];
      return n;
    };
    const grat0 = s.stat?.gralGrat ?? 0;
    const vv = prov(a, b), vb = prov(a, atta), bv = prov(atta, a), v4 = prov(a, fyra);
    const grat = (s.stat?.gralGrat ?? 0) - grat0;
    return [
      [`två vuxna slåss ibland efter ett gräl (${vv} av 4000)`, vv > 20],
      [`en vuxen och ett barn på åtta år mycket mer sällan (${vb} och ${bv} av 4000)`, vb + bv < (vv * 2) / 5],
      [`ett barn på fyra år slåss inte (${v4} av 4000)${grat ? `, och har gråtit ${grat} gånger` : ''}`, v4 === 0],
    ];
  },
};

// steg 12.1.48: byn köper så många som den tar emot innan det blir över, och handelns ord stämmer
SCENARIER.handelretur = {
  text: 'Handeln köper det byn vill ha (steg 12.1.48): byn köper av en sak den saknar bara så många som den tar emot innan det blir över, så att det just köpta inte säljs tillbaka, och handelns text har rätt artikel och flertal och måltidens nivå som ett ord',
  kor: () => {
    const s = SIM.createState(1, START); klockan(s, 10);
    const M = SIM.bynPart(s, SIM.eldPlats(s).x, SIM.eldPlats(s).y);
    const slag = ['rovfron', 'artfron', 'appelplanta', 'jordgubbsplanta', 'rep', 'salt', 'bar', 'rotter', 'ved'].filter(k => SIM.SAKER[k]);
    const fel: string[] = [], kop: string[] = [];
    // det som bjuds ut efter köpet är värt minst lika mycket för byn som det den köpte för (steg 12.1.188: den sista saken
    // säljs inte längre aldrig, men den är värd mest, så det köpta säljs inte tillbaka till samma pris)
    for (const k of slag) {
      SIM.setAmount(s, k, 0);
      const pris = M.varde(k), n = Math.min(20, SIM.bynKopAntal(s, k)); // handlaren har 20
      SIM.setAmount(s, k, n);
      const over = M.over(['silver']).find(w => w.k === k)?.n ?? 0, salj = over > 0 ? M.kvar!(k, over) : Infinity;
      kop.push(`${k} ${n}`);
      if (n < 1 || salj < pris - 1e-9) fel.push(`${k}: köper ${n} för ${pris}, sedan ${over} över för ${salj}`);
    }
    // två matslag i samma köp (steg 12.1.217): det första slaget dras från bristen innan det andra får sitt antal
    for (const k of ['bar', 'rotter']) SIM.setAmount(s, k, 0);
    const valt = new Map<SIM.Behov, number>(), bar = SIM.bynKopAntal(s, 'bar', valt); SIM.kopValt(valt, 'bar', bar);
    const rotEnsam = SIM.bynKopAntal(s, 'rotter'), rotEfter = SIM.bynKopAntal(s, 'rotter', valt);
    const ratt = Object.keys(SIM.SAKER).find(k => SIM.SAKER[k]?.namn.endsWith(' · Fin'))!;
    const ord = SIM.varorText([{ k: 'jordgubbsplanta', n: 1 }, { k: 'appelplanta', n: 1 }, { k: 'remsa', n: 4 }, { k: 'rokelse', n: 2 }, { k: ratt, n: 7 }]);
    return [
      [`det köpta säljs inte tillbaka billigare än det köptes (${kop.join(', ')})${fel.length ? `: ${fel.join('; ')}` : ''}`, !fel.length],
      [`två matslag köps till bufferten en gång (bär ${bar}, sedan rötter ${rotEfter} i stället för ${rotEnsam})`, bar >= 1 && rotEnsam >= 1 && rotEfter < rotEnsam],
      [`orden: "${ord}"`, ord.includes('en jordgubbsplanta') && ord.includes('en äppelplanta') && ord.includes('fyra remsor') && ord.includes('två bitar rökelse') && /sju portioner fin \S+/.test(ord) && !ord.includes('·')],
    ];
  },
};

// steg 12.1.188: den sista av en sak är värd mest, och värdet avgör om den säljs
SCENARIER.sistasak = {
  text: 'Den sista av en sak är värd mer (steg 12.1.188): byns värde av det den ger bort stiger ju färre den har kvar, och den sista är värd mest. Byn säljer inte det den nyss köpt till samma pris, och den sista saken säljs först när handlaren betalar riktigt bra; av det byn har gott om säljs till vanligt pris. Av flera redskap i en grupp värderas vart och ett efter sitt ordningstal (steg 12.1.201), i byns affär med handlaren',
  kor: () => {
    const s = SIM.createState(1, START); klockan(s, 10);
    const x = SIM.eldPlats(s).x, y = SIM.eldPlats(s).y, M = SIM.bynPart(s, x, y);
    // ett material utan buffert (rep, salt …): med en enda i förrådet bjuder byn ut den
    const k = ['flinta', 'salt', 'rep', 'korg'].find(q => { if (!SIM.SAKER[q]) return false; SIM.setAmount(s, q, 1); const ok = (M.over(['silver']).find(w => w.k === q)?.n ?? 0) === 1; SIM.setAmount(s, q, 0); return ok; });
    if (!k) return [['ett material utan buffert finns att pröva', false]];
    // en handlare som betalar pris gånger grundvärdet och har silver
    const handlare = (pris: number): SIM.Part => ({ id: -99, namn: 'Handlaren', x, y, varde: q => q === 'silver' ? 1 : pris, over: () => [{ k: 'silver', n: 200 }], lamna: w => w, ta: () => {} });
    const salj = (pris: number) => SIM.bytaMed(s, handlare(pris), M, [{ k, n: 1 }], { behov: pris, minst: 1, fara: 0, typ: 'byn', utom: [k] }); // handlaren köper: värt pris gånger grundvärdet för hen
    // byn saknar saken: den är värd DELA.saknar, och byn köper en för 1,5 gånger grundvärdet
    SIM.setAmount(s, k, 0);
    const kopVarde = M.varde(k);
    SIM.setAmount(s, k, 1); // köpt
    const sista = M.kvar!(k, 1);
    const samma = salj(1.5), hade1 = SIM.amountOf(s, k);
    const hogt = salj(SIM.DELA.saknar * 1.5), hade2 = SIM.amountOf(s, k);
    // av det byn har gott om säljs en till vanligt pris
    SIM.setAmount(s, k, 30);
    const over = M.kvar!(k, 1), vanligt = salj(1);
    // redskapen (steg 12.1.201) går den väg spelet går: en handlare på plats och byns affär (saljaAv). Två redskap ur en grupp
    // vars mål är noll: det första säljs till vanligt pris, det sista är värt DELA.saknar och blir kvar
    SIM.skickaHandlare(s);
    const h = s.handlare, tro = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    const r = SIM.SAK_LIST.find(q => SIM.isTool(q) && SIM.grundvarde(q) >= 2 && (SIM.REDSKAPMAL[SIM.gruppOf(q)]?.(s) ?? 0) === 0 && SIM.viktOf(q) <= 1 && !SIM.tingOf(s).some(t => SIM.gruppOf(t.k) === SIM.gruppOf(q)));
    let rSalda = -1, rNr = '', rSista = 0;
    if (h && r) {
      for (let i = 0; i < 2; i++) SIM.newTing(s, r, 1, SIM.BYN);
      const M2 = SIM.bynPart(s, x, y, tro), bjuds = M2.over(['silver']).filter(w => w.k === r);
      rNr = bjuds.map(w => w.nr).join(','); rSista = bjuds.length === 2 ? SIM.gerVarde(bjuds[1], M2, 1) / SIM.grundvarde(r) : 0;
      rSalda = SIM.saljaAv(s, h, M2, tro).filter(w => w.k === r).length;
    }
    return [
      [`den sista är värd mest (${sista} mot ${over} när byn har gott om)`, sista === SIM.DELA.saknar && over < sista],
      [`det byn nyss köpt för att den saknade det (värt ${kopVarde}) säljs inte tillbaka till samma pris (${samma} sålda)`, samma === 0 && hade1 === 1],
      [`den sista säljs när handlaren betalar riktigt bra (${hogt} såld, ${hade2} kvar)`, hogt === 1 && hade2 === 0],
      [`av det byn har gott om säljs en till vanligt pris (${vanligt})`, vanligt === 1],
      [`en handlare kom och ett redskap utan mål finns att pröva (${r})`, !!h && !!r],
      [`byns två redskap bjuds ut med sina ordningstal (${rNr}), och det sista är värt det byn saknar (${rSista})`, rNr === '1,2' && rSista === SIM.DELA.saknar],
      [`byn säljer det första till vanligt pris och behåller det sista (${rSalda} sålt)`, rSalda === 1],
    ];
  },
};

// steg 12.1.49: det som flyttas till en bättre lagerplats läggs bara där, och redskapet som tagits upp bärs till förrådet
SCENARIER.barretur = {
  text: 'Det som bärs i onödan (steg 12.1.49): ved som flyttas ur en lagerplats bärs till en bättre lagerplats bara om den har plats, räknat som när flytten valdes, annars läggs den tillbaka där den låg; den som tagit upp ett redskap bär det till förrådet',
  kor: () => {
    const s = SIM.createState(1, START); klockan(s, 10);
    const z0 = SIM.zonesOf(s)[0];
    s.lagren = [{ x: z0.x, y: z0.y, w: 2, h: 1, namn: 'Nära', prio: 1 }, { x: z0.x, y: z0.y + 1, w: 2, h: 1, namn: 'Längre bort', prio: 0 }];
    s.stackar = [];
    const t = { act: 'bara', phase: 'do', tx: z0.x + 0.5, ty: z0.y + 1.5, until: s.now, carry: 0, why: '', items: { ved: 5 } } as unknown as SIM.Task;
    const tom = SIM.backSpot(s, t);
    // den bättre lagerplatsen fylls med något annat: veden läggs tillbaka där den låg
    for (let x = z0.x; x < z0.x + 2; x++) SIM.stacksOf(s).push({ k: 'sten', n: SIM.rymd(s, x, z0.y, 'sten'), c: 1, x, y: z0.y });
    const full = SIM.backSpot(s, t);
    // redskapet: den som bara bär en yxa hem går ändå tillbaka, och lägger den i förrådet
    const p = SIM.living(s)[0], yxa = SIM.newTing(s, 'yxa', 1, 0);
    yxa.x = yxa.y = undefined; yxa.lass = p.id;
    const r = { act: 'bara', phase: 'do', tx: z0.x + 8.5, ty: z0.y + 8.5, until: s.now, carry: 0, why: '', ting: [yxa.id] } as unknown as SIM.Task;
    return [
      [`med plats i den bättre lagerplatsen bärs veden dit (${tom.x}, ${tom.y})`, Math.floor(tom.y) === z0.y],
      [`när den är full läggs veden tillbaka där den låg (${full.x}, ${full.y})`, full.x === z0.x + 0.5 && full.y === z0.y + 1.5],
      ['den som bär ett redskap går tillbaka med det', SIM.barHem(r) && !SIM.isCarrying(r)],
    ];
  },
};

// steg 12.1.52: grenarna växer inte över taket
SCENARIER.grenartak = {
  text: 'Grenarna över taket (steg 12.1.52): grenarna som inte behövs till tändningen eldas före veden, bränsle som inte fick plats på elden går tillbaka som ved och inte som grenar, och grenarna från en stam lämnas allt mer på marken ju mer byn har över taket (steg 13.8.4)',
  kor: () => {
    const s = SIM.createState(1, START); klockan(s, 10); tandEld(s);
    const tak = SIM.materialTak(s, 'grenar'), buf = SIM.tandBuffert(s, 'grenar');
    SIM.setAmount(s, 'ved', 200); SIM.setAmount(s, 'grenar', Math.ceil(tak * 5));
    const g0 = SIM.amountOf(s, 'grenar'), v0 = SIM.amountOf(s, 'ved');
    const fick = SIM.takeFuel(s, 4);
    const g1 = SIM.amountOf(s, 'grenar'), v1 = SIM.amountOf(s, 'ved');
    // när grenarna är nere vid bufferten tas veden
    SIM.setAmount(s, 'grenar', Math.ceil(buf)); SIM.takeFuel(s, 4); const g2 = SIM.amountOf(s, 'grenar'), v2 = SIM.amountOf(s, 'ved');
    // tillbaka: 2,5 ved blir två vedträn och en gren
    SIM.setAmount(s, 'ved', 10); SIM.setAmount(s, 'grenar', 0); SIM.giveBack(s, 2.5);
    const tillbaka = `${SIM.amountOf(s, 'ved') - 10} ved och ${SIM.amountOf(s, 'grenar')} grenar`;
    // stammen
    const t = { act: 'hugga', phase: 'do', tx: 0, ty: 0, until: s.now, carry: 0, why: '' } as unknown as SIM.Task;
    SIM.setAmount(s, 'ved', 300); SIM.setAmount(s, 'grenar', Math.ceil(tak * 2)); const lamnas = SIM.grenarMed(s, t);
    SIM.setAmount(s, 'grenar', 0); const tas = SIM.grenarMed(s, t);
    SIM.setAmount(s, 'ved', 0); SIM.setAmount(s, 'grenar', Math.ceil(tak * 2)); const vedDygn = SIM.woodDays(s), vedBrist = vedDygn < SIM.buffert(s, 'ved') ? SIM.grenarMed(s, t) : 1;
    // steg 12.1.218: grenarna som lämnas dras inte från stammen, och de som är kvar när veden är slut blir en hög på rutan
    const st = { id: 9901, x: SIM.eldPlats(s).x + 4.5, y: SIM.eldPlats(s).y + 4.5, ved: 6, grenar: 9 };
    (s.stockar ??= []).push(st as SIM.Stock);
    const forst = SIM.chopStock(s, 9901, 3, 0)!, grenKvar = st.grenar, mark0 = SIM.paMarken(s, 'grenar');
    const sist = SIM.chopStock(s, 9901, 3, 0)!; SIM.laggPaRutan(s, 'grenar', sist.kvar, sist.x, sist.y);
    const hog = SIM.paMarken(s, 'grenar') - mark0;
    return [
      [`grenarna över bufferten eldas först (grenar ${g0} → ${g1}, ved ${v0} → ${v1}, fick ${fick.toFixed(1)})`, g1 < g0 && v1 === v0 && Math.abs(fick - 4) < 0.5],
      [`vid bufferten tas veden (grenar ${g2}, ved ${v2})`, g2 === Math.ceil(buf) && v2 < 200],
      [`grenarna som lämnas stannar på stammen (${forst.grenar} tagna, ${grenKvar} kvar) och blir en hög på rutan när veden är slut (${sist.kvar} kvar, ${hog} på marken)`, forst.grenar === 0 && grenKvar === 9 && sist.done && sist.kvar === 9 && hog === 9],
      [`det som inte fick plats går tillbaka som ${tillbaka}`, tillbaka === '2 ved och 1 grenar'],
      [`grenarna från stammen (steg 13.8.4): en mindre del följer med vid dubbla taket (${lamnas.toFixed(2)}), alla när de fattas (${tas}) och när veden fattas (${vedBrist}; grenarna räcker själva ${vedDygn.toFixed(1)} dygn)`, lamnas > 0 && lamnas < 0.5 && tas === 1 && vedBrist === 1],
    ];
  },
};

// steg 12.1.53: det de andra redan klyver räknas med i virkets värde
SCENARIER.virkeklyv = {
  text: 'Många klyver virke samtidigt (steg 12.1.53): virkets värde för den som väljer räknar med det de andra redan klyver, så att antalet som klyver följer hur mycket som fattas och hur mycket var och en bär hem',
  kor: () => {
    const s = SIM.createState(1, START); klockan(s, 10);
    SIM.setAmount(s, 'virke', 0);
    const folk = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen), p = folk[0], andra = folk.slice(1);
    (s as { arbBehov?: unknown }).arbBehov = { mal: { virke: { b: andra.length, t: 20 } } }; // byn vill ha lika många virke som de andra vuxna, och ingen har börjat
    const fam = SIM.familjOf(s, p.id), om = SIM.omtanke(s, p);
    const varde = () => SIM.personVarde(s, 'virke', fam, om, p);
    const klyver = (n: number) => andra.forEach((q, i) => { q.task = i < n ? { act: 'klyva', phase: 'do', tx: q.x, ty: q.y, until: s.now + 3600000, carry: 0, why: '' } as SIM.Task : undefined; });
    klyver(0); const v0 = varde();
    klyver(2); const v2 = varde();
    klyver(andra.length); const v4 = varde();
    return [
      [`ingen klyver: virket är värt något (${v0.toFixed(3)})`, v0 > 0],
      [`två klyver: mindre värt (${v2.toFixed(3)})`, v2 < v0],
      [`alla ${andra.length} andra klyver, så mycket som fattas: inget värt för en till (${v4.toFixed(3)})`, andra.length >= 3 && v4 === 0],
    ];
  },
};

SCENARIER.eldruta = {
  text: 'Inget ligger i elden (steg 12.1.153, 12.1.194, 12.1.207): en ruta med en eld, brasa eller härd (husets härd på två gånger två rutor) tar inte emot högar, stenarna från en lägereld som tas isär läggs bredvid andra eldar, varken i en lagerplats eller när någon släpper sin börda, och det som redan ligger där flyttas till närmaste fria ruta',
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
    // husets härd tar två gånger två rutor (steg 12.1.207)
    const hx = at.x + 3, hy = at.y + 12, husHard = { ...SIM.newFire(), hearth: 'hard', at: { x: hx, y: hy } } as SIM.Fire; s.eldar!.push(husHard);
    const e2 = SIM.eldRutor(s), fyra = [[0, 0], [1, 0], [0, 1], [1, 1]].every(([dx, dy]) => e2.has((hy + dy) * SIM.W + hx + dx)) && !e2.has((hy + 2) * SIM.W + hx);
    // en lägereld som står i härdens hörn tas isär: stenarna läggs inte i härden (steg 12.1.194)
    const brasa = { ...SIM.newFire(), at: { x: hx + 1, y: hy + 1 } } as SIM.Fire; s.eldar!.push(brasa);
    const stenAlla = () => SIM.stacksOf(s).filter(a => a.k === 'sten' && a.n > 0), stenFore = stenAlla().reduce((t, a) => t + a.n, 0);
    SIM.taIsar(s, brasa);
    const e3 = SIM.eldRutor(s), stenNu = stenAlla();
    const isar = stenNu.reduce((t, a) => t + a.n, 0) > stenFore && stenNu.every(a => !e3.has(a.y * SIM.W + a.x)) && !(s.eldar ?? []).includes(brasa);
    return [
      ['det som låg där brasan lades flyttas', flyttad],
      ['brasans ruta hör till eldrutorna', eld.has(i)],
      ['lagret lägger inget på brasan', iLagret],
      ['den som släpper sin börda i brasan lägger den bredvid', borda],
      ['inget läggs i den första elden', forsta],
      ['örtkökets härd är en eldruta, men inte resten av köket', iHard],
      ['husets härd är fyra eldrutor', fyra],
      ['stenarna från en lägereld som tas isär läggs inte i en annan eld', isar],
    ];
  },
};

SCENARIER.klantatuering = {
  text: 'Gäster och inflyttade bär sin klans tatueringar (steg 12.1.165): en vuxen från en annan klan har ibland märken, alltid i den klanens stil (ur klanens nummer), och barn har inga',
  kor: () => {
    const s = SIM.createState(6, START);
    for (const c of SIM.klanerOf(s)) c.inst = 50;
    const fr: SIM.Person[] = [];
    for (let i = 0; i < 40; i++) { const g = SIM.framling(s); if (g) fr.push(g); }
    const medTat = fr.filter(g => g.tat?.length), stilRatt = fr.every(g => (g.tat ?? []).every(t => t.stil === SIM.klanStil(g.gast!.klan!)));
    const enPerPlats = fr.every(g => new Set((g.tat ?? []).map(t => t.p)).size === (g.tat ?? []).length);
    const k = SIM.klanerOf(s)[0]!, gaster: SIM.Person[] = [];
    for (let i = 0; i < 40; i++) gaster.push(SIM.nyGast(s, { id: -1000 - i, namn: 'Gäst', sex: 'm', fodd: s.now - 30 * SIM.DAY, rad: { sort: 'handlare', klan: k.id }, x: 1, y: 1, nyckel: 900 + i }));
    const barn = SIM.nyGast(s, { id: -2000, namn: 'Barn', sex: 'k', fodd: s.now - 6 * SIM.DAY, rad: { sort: 'handlare', klan: k.id }, x: 1, y: 1, nyckel: 999 });
    const gMed = gaster.filter(g => g.tat?.length), gStil = gaster.every(g => (g.tat ?? []).every(t => t.stil === SIM.klanStil(k.id)));
    const stilar = new Set(SIM.klanerOf(s).map(c => SIM.klanStil(c.id)));
    return [
      [`en del främlingar bär märken (${medTat.length} av ${fr.length}), alla i sin klans stil`, medTat.length > 0 && medTat.length < fr.length && stilRatt],
      ['en plats rymmer ett märke', enPerPlats],
      [`gästerna från en klan bär klanens stil (${gMed.length} av ${gaster.length} med märken, ${SIM.TAT_STILNAMN[SIM.klanStil(k.id)]})`, gMed.length > 0 && gStil],
      ['ett barn som följer med har inga märken', !barn.tat?.length],
      [`klanerna har olika stilar (${stilar.size} stilar bland ${SIM.klanerOf(s).length} klaner)`, SIM.klanerOf(s).length < 2 || stilar.size > 1],
      ['porträttet visar märket i klanens stil', !medTat[0] || SIM.tatDel(medTat[0], medTat[0].tat![0].p) === `tat-${SIM.klanStil(medTat[0].gast!.klan!)}-${medTat[0].tat![0].p}`],
    ];
  },
};

SCENARIER.bladkand = {
  text: 'Bladet väger in hur känd den döda är (steg 12.1.166): den som sörjer två döda lika mycket skriver bladet och ristar stenen om den som byn minns, med samma vägning för båda',
  kor: () => {
    const s = SIM.createState(6, START), v = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
    const p = v[0]!, a = nyInvanare(s, 'm', 50), b = nyInvanare(s, 'k', 50);
    a.died = s.now; b.died = s.now;
    p.sorg = [{ namn: a.name, vem: a.id, ord: 'vän', v: -1, dygn: 5, t0: s.now }, { namn: b.name, vem: b.id, ord: 'vän', v: -1, dygn: 5, t0: s.now }];
    SIM.setAmount(s, 'pergament', 2); SIM.setAmount(s, 'black', 2); p.skill.berattande = 10; (p.tek ??= {}).stenhuggarplats = 1;
    const om = (kand: SIM.Person) => {
      for (const q of v) q.intryck = q === p ? [] : [{ om: kand.id, namn: kand.name, k: 'hjalpsam', v: 1, c: 1, t: s.now }];
      SIM.kandaRakna(s);
      const bl = SIM.skrivLust(s, p), st = SIM.runstenLust(s, p);
      return { blad: bl?.slag === 'minne' ? bl.om?.id : undefined, sten: st?.slag === 'minne' ? st.om.id : undefined };
    };
    const kA = om(a), kB = om(b);
    return [
      [`bladet skrivs om den som byn minns (${kA.blad === a.id ? a.name : '–'}, sedan ${kB.blad === b.id ? b.name : '–'})`, kA.blad === a.id && kB.blad === b.id],
      [`stenen ristas om samma (${kA.sten === a.id ? a.name : '–'}, sedan ${kB.sten === b.id ? b.name : '–'})`, kA.sten === a.id && kB.sten === b.id],
    ];
  },
};

// arbetaren som räknar ikapp (steg 12.1.178): samma by räknad i bitar med ögonblicksbilder, som arbetaren räknar den, och i ett
// svep, som sidan räknar den, var och en i en egen process (modulerna nyss inlästa, som i en Web Worker)
SCENARIER.ikapparbetare = {
  text: 'Ikappräkningen i en arbetare (steg 12.1.178): byn lämnas över till arbetaren med talen oavrundade och kommer tillbaka exakt som sidan själv hade räknat fram den, också när arbetaren räknar i bitar och skickar ögonblicksbilder under tiden',
  kor: () => {
    // byn räknas i sidan till mitt i en timme, så att minnena med timmen som nyckel finns (steg 12.1.248)
    const s = SIM.cloneState(testBy(10)), mitt = Math.floor(s.now / SIM.HOUR) * SIM.HOUR + 1.5 * SIM.HOUR;
    while (s.now < mitt) SIM.step(s, SIM.nastaSteg(s));
    const delar = SIM.overlamna(s), t0 = s.now, mal = s.now + 3 * SIM.HOUR;
    const igen = SIM.overlamna(SIM.franOverlamning(delar));
    const dir = mkdtempSync(join(tmpdir(), 'ikapp-')), in_ = join(dir, 'in.json');
    writeFileSync(in_, JSON.stringify({ delar, mal }));
    const prov = fileURLToPath(new URL('../arbetarprov.ts', import.meta.url));
    const korProv = (ut: string, ...satt: string[]) => { execFileSync(process.execPath, ['--import', 'tsx', prov, in_, join(dir, ut), ...satt]); return JSON.parse(readFileSync(join(dir, ut), 'utf8')) as { delar: Record<string, string>; bitar: number; bilder: number }; };
    const hel = korProv('hel.json', 'hel'), bit = korProv('bit.json');
    rmSync(dir, { recursive: true, force: true });
    const lika = (a: Record<string, string>, b: Record<string, string>) => { const k = Object.keys(a).sort(); return k.join() === Object.keys(b).sort().join() && k.every(d => a[d] === b[d]); };
    const olika = Object.keys(hel.delar).filter(d => hel.delar[d] !== bit.delar[d]);
    const fram = SIM.franOverlamning(bit.delar);
    // sidan räknar vidare själv, med sina minnen: det blir samma by som arbetarens
    while (s.now < mal && !SIM.storStridNu(s)) SIM.step(s, SIM.nastaSteg(s));
    const sida = SIM.overlamna(s), sidaOlika = Object.keys(sida).filter(d => sida[d] !== hel.delar[d]);
    // fälten i byn kan stå i en annan ordning när sidan själv lagt till dem: innehållet jämförs (steg 12.1.248)
    const kanon = (v: unknown): unknown => Array.isArray(v) ? v.map(kanon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, kanon((v as Record<string, unknown>)[k])])) : v;
    const sammaInnehall = sidaOlika.every(d => !!hel.delar[d] && JSON.stringify(kanon(JSON.parse(sida[d]!))) === JSON.stringify(kanon(JSON.parse(hel.delar[d]!))));
    return [
      ['byn som läses ur överlämningen lämnas över likadant igen', lika(delar, igen)],
      [`arbetaren räknade i ${bit.bitar} bitar och skickade ${bit.bilder} ögonblicksbilder`, bit.bitar >= 2 && bit.bilder >= 1],
      [`byn från arbetaren är exakt den som räknats i ett svep${olika.length ? ' (skiljer: ' + olika.join(', ') + ')' : ''}`, lika(hel.delar, bit.delar)],
      [`byn som sidan räknat vidare själv från mitt i timmen (${((t0 % SIM.HOUR) / SIM.MIN).toFixed(0)} min) är exakt arbetarens${sidaOlika.length ? ' (i en annan ordning: ' + sidaOlika.join(', ') + ')' : ''}`, Object.keys(sida).sort().join() === Object.keys(hel.delar).sort().join() && sammaInnehall],
      [`arbetaren räknade ikapp (${((fram.now - t0) / SIM.HOUR).toFixed(2)} timmar)`, fram.now >= mal || SIM.storStridNu(fram)],
    ];
  },
};

SCENARIER.forradminne = {
  text: 'Förrådets minne räknas om innan det frågas (steg 12.1.202): när mer läggs i förrådet än det rymmer läggs nya högar och resten på den minsta, och minnet av stackarna per slag stämmer med stackarna efteråt',
  kor: () => {
    const s = SIM.createState(3, START);
    SIM.amountOf(s, 'sten'); // minnet är räknat innan något läggs
    SIM.setAmount(s, 'sten', 4000); // mer än förrådet rymmer
    const fel = SIM.lagerVakt(s), alla = SIM.stacksOf(s).filter(a => a.k === 'sten').reduce((t, a) => t + a.n, 0);
    return [
      [`allt som lades finns i högarna (${alla} av 4000)`, Math.round(alla) === 4000],
      [`minnet stämmer med stackarna${fel.length ? ` (${fel.slice(0, 3).join('; ')})` : ''}`, fel.length === 0],
    ];
  },
};

SCENARIER.radslatur = {
  text: 'Rädslan i samlarens val (steg 12.1.203): en fruktad plats utan fynd får sämre poäng än en tom plats lika nära: rädslan dras från turen som en kostnad och slumpen läggs till',
  kor: () => {
    const s = SIM.createState(3, START); klockan(s);
    const p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= 18)!, vat = SIM.vattenNu(s);
    // två tomma rutor lika långt från samlaren, i olika områden
    const tomma: { x: number; y: number; d: number }[] = [];
    for (let r = 6; r < 40 && tomma.length < 2; r++) for (let a = 0; a < 64 && tomma.length < 2; a++) {
      const x = Math.floor(p.x + r * Math.cos(a / 64 * 2 * Math.PI)), y = Math.floor(p.y + r * Math.sin(a / 64 * 2 * Math.PI));
      if (x < 0 || y < 0 || x >= SIM.W || y >= SIM.H || vat[y * SIM.W + x] === SIM.T.Vatten || SIM.bitAt(s, x, y) || SIM.richness(s, 'samla', x + 0.5, y + 0.5) > 0) continue;
      if (tomma.some(t => SIM.areaOf(t.x, t.y) === SIM.areaOf(x, y))) continue;
      if (tomma.length && Math.abs(Math.hypot(tomma[0].x - p.x, tomma[0].y - p.y) - Math.hypot(x - p.x, y - p.y)) > 1.5) continue;
      tomma.push({ x, y, d: SIM.utanforByn(s, x, y) });
    }
    if (tomma.length < 2) return [['två tomma rutor lika långt bort hittades', false]];
    const [rädd, lugn] = tomma;
    (p.lardomar ??= []).push({ k: 'fara', a: SIM.areaOf(rädd.x, rädd.y), v: 0.8, c: 1, t: s.now, led: 0 });
    let valtRädd = 0;
    const tur = { borda: 10, fart: 1 };
    for (let i = 0; i < 40; i++) {
      const r = SIM.pickSpot(s, p, 'samla', [{ ...rädd }, { ...lugn }], tur);
      if (r && SIM.areaOf(r.x, r.y) === SIM.areaOf(rädd.x, rädd.y)) valtRädd++;
      s.now += SIM.MIN;
    }
    return [
      [`den fruktade tomma platsen väljs inte framför den tomma utan rädsla (${valtRädd} av 40)`, valtRädd === 0],
    ];
  },
};

SCENARIER.hogflytt = {
  text: 'En hög som flyttas ur elden behåller sitt tillstånd (steg 12.1.208): blöt ved är blöt, vätan följer med, och den giftiga svampen gömd i svamphögen hamnar i högen bredvid och inte i förrådet',
  kor: () => {
    const s = SIM.createState(9, START), m = SIM.bynsMitt(s), vat = SIM.vattenNu(s);
    // tre rutor bredvid varandra utanför förrådet, på land
    let hx = -1, hy = -1;
    for (let r = 12; r < 40 && hx < 0; r++) for (let dx = -r; dx <= r && hx < 0; dx++) {
      const x = Math.floor(m.x + dx), y = Math.floor(m.y + r);
      if ([0, 1].every(ox => [0, 1].every(oy => SIM.inMap(x + ox, y + oy) && vat[(y + oy) * SIM.W + x + ox] !== SIM.T.Vatten && !SIM.isStored(s, x + ox, y + oy) && SIM.usable(s, x + ox, y + oy)))) { hx = x; hy = y; }
    }
    if (hx < 0) return [['en plats för härden hittades', false]];
    const st = SIM.stacksOf(s);
    st.push({ k: 'ved', n: 4, c: 1, x: hx, y: hy, blot: 1, tork: 0.4 } as never, { k: 'grenar', n: 3, c: 1, x: hx + 1, y: hy, vat: 0.5 } as never, { k: 'svamp', n: 5, c: 1, x: hx, y: hy + 1, dold: 2 } as never);
    SIM.changed(s);
    const hard = { ...SIM.newFire(), hearth: 'hard', at: { x: hx, y: hy } } as SIM.Fire; (s.eldar ??= []).push(hard);
    SIM.ingetIElden(s);
    const e = SIM.eldRutor(s), ute = SIM.stacksOf(s).filter(a => !e.has(a.y * SIM.W + a.x) && Math.hypot(a.x - hx, a.y - hy) < 6);
    const ved = ute.filter(a => a.k === 'ved'), gren = ute.filter(a => a.k === 'grenar'), svamp = ute.filter(a => a.k === 'svamp');
    const iForradet = SIM.stacksOf(s).filter(a => a.k === 'svamp' && SIM.isStored(s, a.x, a.y)).reduce((t, a) => t + (a.dold ?? 0), 0);
    return [
      [`veden flyttades och är blöt, med torkningen kvar (${ved.map(a => `${a.n} ${a.blot ? 'blöt' : 'torr'} ${a.tork ?? '-'}`).join(', ')})`, ved.reduce((t, a) => t + a.n, 0) === 4 && ved.every(a => a.blot && a.tork === 0.4)],
      [`grenarna flyttades med vätan kvar (${gren.map(a => a.vat ?? '-').join(', ')})`, gren.reduce((t, a) => t + a.n, 0) === 3 && gren.every(a => a.vat === 0.5)],
      [`den gömda svampen ligger i svamphögen bredvid (${svamp.reduce((t, a) => t + (a.dold ?? 0), 0)}), inte i förrådet (${iForradet})`, svamp.reduce((t, a) => t + (a.dold ?? 0), 0) === 2 && iForradet === 0],
    ];
  },
};

SCENARIER.pais = {
  text: 'Man går på isen (steg 12.1.209): när isen ligger går vägen över sjön, och den kostar mer ju tunnare isen är. Fiskaren pimplar också ute på isen, där hen fiskar genom hålet hen står på. Ute på tunn is kan isen brista, men inte på is som bär. Det man bär läggs ner på stranden, och när isen går upp tar sig den som står ute på sjön i land',
  kor: () => {
    const s = SIM.createState(5, START), g = SIM.groundOf(s), m = SIM.getMap(s.seed).tiles;
    // den största sjön: en väg från ena stranden till den andra, rakt över
    const sjo = SIM.sjoarna(s.seed).rutor.slice().sort((a, b) => b.length - a.length)[0];
    let fran = -1, till = -1, bast = 0;
    const strand = SIM.strandNu(s);
    const kanter = [] as number[];
    for (const i of sjo) { const x = i % SIM.W, y = Math.floor(i / SIM.W); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (y + dy) * SIM.W + x + dx; if (SIM.inMap(x + dx, y + dy) && m[j] !== SIM.T.Vatten && strand[j] && !kanter.includes(j)) kanter.push(j); } }
    for (let a = 0; a < kanter.length; a += 3) for (let b = a + 1; b < kanter.length; b += 3) { const d = Math.hypot(kanter[a] % SIM.W - kanter[b] % SIM.W, Math.floor(kanter[a] / SIM.W) - Math.floor(kanter[b] / SIM.W)); if (d > bast) { bast = d; fran = kanter[a]; till = kanter[b]; } }
    const xy = (i: number) => [i % SIM.W + 0.5, Math.floor(i / SIM.W) + 0.5] as const;
    const [x0, y0] = xy(fran), [x1, y1] = xy(till);
    const langd = (v: number[] | null) => v ? v.length : Infinity, overVatten = (v: number[] | null) => (v ?? []).filter(i => m[i] === SIM.T.Vatten).length;
    const utan = SIM.findPath(g, x0, y0, x1, y1);
    s.is = { vatten: 0, cm: 30 }; const tjock = SIM.findPath(g, x0, y0, x1, y1, false, SIM.isKost(s));
    s.is = { vatten: 0, cm: 2 }; const tunn = SIM.findPath(g, x0, y0, x1, y1, false, SIM.isKost(s));
    // fisket ute på isen: platsen på sjön ger fisk när isen ligger, och inget utan is
    const ute = sjo.find(i => { const x = i % SIM.W, y = Math.floor(i / SIM.W); return [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => m[(y + dy) * SIM.W + x + dx] === SIM.T.Vatten); })!;
    const [ux, uy] = xy(ute);
    s.is = { vatten: 0, cm: 30 }; const fiskIs = SIM.richness(s, 'fiske', ux, uy);
    s.is = undefined; const fiskUtan = SIM.richness(s, 'fiske', ux, uy);
    // olyckan: ute på tunn is kan den brista, på is som bär inte
    const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= 18)!;
    p.x = ux; p.y = uy;
    s.is = { vatten: 0, cm: 3 }; const risk = SIM.OLYCKOR_LAGE.genomIsen.lage!(s, p);
    s.is = { vatten: 0, cm: 30 }; const bar = SIM.OLYCKOR_LAGE.genomIsen.lage!(s, p);
    // bördan läggs på stranden
    const tk = { act: 'samla', phase: 'do', carry: 0, items: { sten: 2 } } as unknown as SIM.Task;
    SIM.dropLoad(s, tk, ux, uy, p.id);
    const paIsen = SIM.stacksOf(s).filter(a => m[a.y * SIM.W + a.x] === SIM.T.Vatten).length, stenen = SIM.stacksOf(s).filter(a => a.k === 'sten' && a.n > 0 && m[a.y * SIM.W + a.x] !== SIM.T.Vatten).length > 0;
    // isen går upp (sommarvärme): hen tar sig i land
    s.is = { vatten: 0, cm: 0.01 };
    for (let h = 0; h < 3 && SIM.isCm(s) > 0; h++) SIM.stepIs(s);
    const iLand = m[SIM.tileOf(p.x, p.y)] !== SIM.T.Vatten;
    return [
      [`utan is går vägen runt sjön (${langd(utan)} rutor, ${overVatten(utan)} över vattnet)`, overVatten(utan) === 0],
      [`på is som bär går vägen över sjön (${langd(tjock)} rutor, ${overVatten(tjock)} över isen)`, overVatten(tjock) > 0 && langd(tjock) < langd(utan)],
      [`på tunn is går vägen mindre över isen (${overVatten(tunn)} rutor) än på tjock is`, overVatten(tunn) < overVatten(tjock)],
      [`ute på isen ger platsen fisk (${fiskIs.toFixed(2)}), utan is inget (${fiskUtan})`, fiskIs > 0 && fiskUtan === 0],
      [`tunn is kan brista under den som står på den (${risk.toFixed(2)}), is som bär inte (${bar})`, risk > 0 && bar === 0],
      ['det hen bar ute på isen läggs på stranden', paIsen === 0 && stenen],
      [`när isen går upp tar sig den som står på sjön i land (${SIM.isCm(s).toFixed(2)} cm kvar)`, SIM.isCm(s) === 0 && iLand],
    ];
  },
};

SCENARIER.larmsort = {
  text: 'Ett larm per sort (steg 12.1.211): ett rop om björnen skriver inte över det man vet om rövarna; en person minns det senaste larmet av varje sort, varje system frågar efter sitt, och en äldre sparning får sitt larm under rätt sort',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), folk = SIM.living(s), p = folk[0];
    for (const q of folk) { q.larm = undefined; q.task = undefined; }
    SIM.larma(s, 'rovare', 3, [p]);
    s.now += 10 * SIM.MIN;
    SIM.larma(s, 'bjorn', 1, [p]);
    const rov = SIM.larmNu(s, p, 'rovare'), bj = SIM.larmNu(s, p, 'bjorn');
    // en äldre sparning: larmet låg i ett fält utan sort
    const g = SIM.cloneState(s), gp = SIM.living(g)[0];
    (gp as { larm?: unknown }).larm = { t: g.now, vad: 'varg', storlek: 2, led: 0 };
    g.v = 62;
    const u = SIM.cloneState(g), up = SIM.living(u)[0];
    return [
      [`björnropet kom efter rövarlarmet och båda finns kvar (rövare ${rov?.storlek ?? 'inget'}, björn ${bj?.storlek ?? 'inget'})`, rov?.storlek === 3 && bj?.storlek === 1],
      ['rövarlarmet är detsamma som förut: hen har inte varnat än och larmet är hens eget (led 0)', !!rov && !rov.varnat && rov.led === 0],
      ['en äldre sparning får sitt larm under rätt sort', up.larm?.varg?.storlek === 2 && SIM.larmNu(u, up, 'varg') !== undefined],
    ];
  },
};

SCENARIER.flodbort = {
  text: 'Maten bärs undan från vattnet (steg 12.1.214): den som bär mat från en lagerplats som vattnet kan nå lägger den tillbaka på rutan bara när rutan fortfarande tar emot maten; annars går hen till en säker ruta',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), { land } = SIM.djupOf(s.seed);
    // en ruta i en lagerplats som tar emot bär, och vattnet som kan nå den
    let t: { x: number; y: number } | undefined;
    for (const z of SIM.zonesOf(s)) for (let y = z.y; y < z.y + z.h && !t; y++) for (let x = z.x; x < z.x + z.w && !t; x++) if (SIM.allows(z, 'bar') && land[y * SIM.W + x] >= 1 && SIM.zoneAt(s, x, y) >= 0) t = { x, y };
    if (!t) return [['testbyn har en lagerplats', false]];
    const task = { act: 'bara', phase: 'do', tx: t.x + 0.5, ty: t.y + 0.5, until: s.now, carry: 0, items: { bar: 2 } } as unknown as SIM.Task;
    const fore = SIM.backSpot(s, task);
    s.flodHot = land[t.y * SIM.W + t.x];
    const efter = SIM.backSpot(s, task), ei = Math.floor(efter.y) * SIM.W + Math.floor(efter.x);
    return [
      [`utan vatten: tillbaka i samma lagerplats (${Math.floor(fore.x)},${Math.floor(fore.y)}, rutan ${t.x},${t.y}; där bären hör hemma i lagret, zoneSpot)`, SIM.zoneAt(s, Math.floor(fore.x), Math.floor(fore.y)) === SIM.zoneAt(s, t.x, t.y)],
      [`när vattnet kan nå rutan bärs maten till en säker ruta (${Math.floor(efter.x)},${Math.floor(efter.y)}, ${land[ei]} rutor upp på land, vattnet når ${s.flodHot})`, !(Math.floor(efter.x) === t.x && Math.floor(efter.y) === t.y) && !SIM.flodHotad(s, ei)],
    ];
  },
};

// steg 12.1.215: bränslet som blir över är samma bränsle
SCENARIER.bransleover = {
  text: 'Bränslet som blir över (steg 12.1.215): den som bär bränsle till elden och får över lägger tillbaka samma hela saker som togs, grenar som grenar och torv som torv, och det är fortfarande dens som ägde det.',
  kor: () => {
    const s = SIM.createState(1, START); klockan(s, 10); tandEld(s);
    const a = s.people.find(p => SIM.alive(p) && SIM.ageOf(p, s.now) >= 16)!;
    a.task = { act: 'elda', phase: 'go', tx: a.x, ty: a.y, until: s.now, carry: 0, why: '' } as unknown as SIM.Task;
    // bara grenar, alla a:s
    SIM.setAmount(s, 'ved', 0); SIM.setAmount(s, 'torv', 0); SIM.setAmount(s, 'blottorv', 0); SIM.setAmount(s, 'grenar', 0);
    SIM.put(s, 'grenar', 20, { [a.id]: 20 }); const agd0 = SIM.ownsAmount(s, a, 'grenar');
    const tog: SIM.Tog = {}, fick = SIM.takeFuel(s, 3, a, {}, undefined, tog);
    const g1 = SIM.amountOf(s, 'grenar'), agd1 = SIM.ownsAmount(s, a, 'grenar');
    SIM.giveBack(s, 2 * SIM.GREN, tog);
    const g2 = SIM.amountOf(s, 'grenar'), agd2 = SIM.ownsAmount(s, a, 'grenar'), ved = SIM.amountOf(s, 'ved');
    // bara torv, byns
    SIM.setAmount(s, 'grenar', 0); SIM.setAmount(s, 'torv', 10);
    const tog2: SIM.Tog = {}, fick2 = SIM.takeFuel(s, 2 * SIM.TORV.varde, a, {}, undefined, tog2), t1 = SIM.amountOf(s, 'torv');
    SIM.giveBack(s, SIM.TORV.varde, tog2);
    const t2 = SIM.amountOf(s, 'torv'), ved2 = SIM.amountOf(s, 'ved');
    return [
      [`a:s grenar togs (fick ${fick.toFixed(2)} ved, grenar ${g1} kvar, a:s ${agd0} → ${agd1.toFixed(1)})`, fick > 0 && g1 < 20 && agd0 === 20 && agd1 < 20],
      [`två grenar över blir två grenar igen, inte ved (grenar ${g1} → ${g2}, ved ${ved})`, g2 === g1 + 2 && ved === 0],
      [`grenarna som kom tillbaka är fortfarande a:s (${agd1.toFixed(1)} → ${agd2.toFixed(1)})`, Math.abs(agd2 - agd1 - 2) < 1e-6],
      [`torven över blir torv igen (fick ${fick2.toFixed(2)}, torv ${t1} → ${t2}, ved ${ved2})`, t2 === t1 + 1 && ved2 === 0],
    ];
  },
};

// steg 12.1.221: det som läggs ner inne hamnar inne
SCENARIER.golvlagg = {
  text: 'Det som läggs ner inne hamnar inne (steg 12.1.221): den som lägger ner en börda vid en station inne i ett hus lägger den på ett färdigt golv bredvid sig i samma rum, inom räckhåll, och inte på andra sidan väggen.',
  kor: () => {
    const s = SIM.createState(1, START); klockan(s, 10);
    const bank = medBank(s, 'flatarbank');
    if (!bank.inne) return [['slöjdbänken står inne i ett hus', false]];
    const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!, vid = SIM.vidStation(bank);
    p.x = vid.x; p.y = vid.y;
    const rum = SIM.roomAt(s, Math.floor(p.x), Math.floor(p.y));
    const fore = new Set((s.stackar ?? []).map(a => a));
    const tk = { act: 'samla', phase: 'back', tx: p.x, ty: p.y, until: s.now, carry: 0, why: 'prov', items: { grenar: 3 } } as unknown as SIM.Task;
    p.task = tk; SIM.dropLoad(s, tk, p.x, p.y); p.task = undefined;
    const nya = (s.stackar ?? []).filter(a => !fore.has(a) && a.k === 'grenar');
    const inne = nya.filter(a => rum && SIM.roomAt(s, a.x, a.y)?.id === rum.id), nara = nya.filter(a => SIM.iRackvidd(p, a));
    return [
      [`hen står vid bänken inne i ett rum (${Math.floor(p.x)},${Math.floor(p.y)})`, !!rum],
      [`grenarna läggs i samma rum (${inne.length} av ${nya.length} högar: ${nya.map(a => `${a.x},${a.y}`).join(' ')})`, nya.length > 0 && inne.length === nya.length],
      [`och inom räckhåll (${nara.length} av ${nya.length})`, nya.length > 0 && nara.length === nya.length],
    ];
  },
};

// steg 12.1.222: träden vid huset räknas en gång i röjningen
SCENARIER.rojhus = {
  text: 'Träden vid huset räknas en gång (steg 12.1.222): ett träd på raden under huset står både i ramen runt huset och under kronorna, och räknas ändå en gång i röjningens brist.',
  kor: () => {
    const s = SIM.createState(1, START); klockan(s, 10); medHus(s);
    const h = SIM.housesOf(s)[0];
    if (!h) return [['byn har ett hus', false]];
    const g = SIM.groundOf(s);
    // inga andra platser att röja, och inga träd runt huset utom ett vuxet på raden under det
    s.lagren = []; s.stationer = []; s.falt = [];
    for (let y = h.y - 1; y <= h.y + h.h + 3; y++) for (let x = h.x - 1; x <= h.x + h.w; x++) if (SIM.inMap(x, y)) g.trees[y * SIM.W + x] = 0;
    const i = (h.y + h.h) * SIM.W + h.x; g.trees[i] = 1; if (g.alder) g.alder[i] = 0;
    const krona = SIM.kronaOver(s, h), ram = (h.w + 2) * (h.h + 2), unika = new Set([...krona]).size + ram - krona.filter(k => Math.floor(k / SIM.W) <= h.y + h.h).length;
    const b = SIM.rojBrist(s), vag = SIM.straken(s).vagar.length;
    return [
      [`trädet under huset står under kronorna (${krona.includes(i)})`, krona.includes(i)],
      [`röjningens brist räknar trädet en gång (${b.toFixed(4)}, en av ${unika} rutor = ${(1 / unika).toFixed(4)}; stråk ${vag})`, Math.abs(b - 1 / unika) < 1e-9],
    ];
  },
};

// steg 12.1.231: en handling som tagits bort ur ACTS ligger kvar som uppgift i en sparad by; uppgraderingen tömmer den hos alla
SCENARIER.gammaluppgift = {
  text: 'Steg 12.1.231: en uppgift vars handling inte längre finns (flyttLager) töms när en sparad by läses, hos byborna och gästerna, och byn går vidare utan att krascha',
  kor: () => {
    const s = SIM.cloneState(testBy(1)), [p] = SIM.living(s);
    const g = { ...SIM.cloneState(s).people[0], id: 99999, gast: { sort: 'handlare' } } as unknown as SIM.Person;
    s.people.push(g);
    const gammal = { act: 'flyttLager', phase: 'do', tx: p.x, ty: p.y, until: s.now + SIM.HOUR, carry: 0, why: '' } as unknown as SIM.Task;
    p.task = { ...gammal }; g.task = { ...gammal };
    s.v = 63;
    const b = SIM.migrate(JSON.parse(JSON.stringify(s)) as SIM.State);
    const bp = SIM.byId(b, p.id)!, bg = b.people.find(q => q.id === 99999)!;
    b.people = b.people.filter(q => q.id !== 99999);
    let gick = true;
    try { for (let i = 0; i < 60; i++) SIM.step(b, SIM.BEAT); } catch { gick = false; }
    return [
      [`bybons gamla uppgift är tömd (${bp.task?.act ?? 'ingen'})`, (bp.task?.act as string | undefined) !== 'flyttLager'],
      [`gästens gamla uppgift är tömd (${bg.task?.act ?? 'ingen'})`, bg.task === undefined],
      ['byn går vidare utan att krascha', gick],
      [`den sparade byn har den nya versionen (${b.v})`, b.v === SIM.SPARVERSION],
    ];
  },
};

SCENARIER.vavstol = {
  text: 'Bara det redskap som används slits (steg 12.1.252, KLAR för TILLVERKA i steg.ts): den som spinner med sländan i handen sliter den, och sländan som ligger i vävstolen slits bara när tråden spinns där med den, en tråd i taget',
  kor: () => {
    const s = SIM.createState(5, START), p = SIM.living(s)[0]!;
    klockan(s);
    p.tek = { ...p.tek, slanda: 1 } as typeof p.tek;
    SIM.put(s, 'lin', 12, { [p.id]: 12 });
    const v = { id: s.nextStation = (s.nextStation ?? 0) + 1, k: 'vavstol', x: 34, y: 34, kvar: 0 } as SIM.Station;
    (s.stationer ??= []).push(v); SIM.touch(s);
    const iStol = SIM.newTing(s, 'slanda', 1, p.id); SIM.nyttVid(s, iStol);
    const iHand = SIM.newTing(s, 'slanda', 1, p.id);
    const c0 = { stol: iStol.c, hand: iHand.c };
    p.task = { act: 'spinna', tool: 'slanda' } as SIM.Task; SIM.KLAR_FOR.spinna!(s, p, p.task, 0);
    const c1 = { stol: iStol.c, hand: iHand.c };
    p.task = { act: 'spinna' } as SIM.Task; SIM.KLAR_FOR.spinna!(s, p, p.task, 0);
    const c2 = { stol: iStol.c, hand: iHand.c }, per = 1 / (SIM.ACTS.spinna.redskap!.slanda!.haller! * SIM.kvHaller(iStol));
    const f = (x: number) => x.toFixed(4);
    return [
      [`med sländan i handen slits den, inte sländan i vävstolen (handen ${f(c0.hand)} → ${f(c1.hand)}, vävstolen ${f(c0.stol)} → ${f(c1.stol)})`, c1.hand < c0.hand && c1.stol === c0.stol],
      [`utan slända i handen slits sländan i vävstolen med en tråd (${f(c1.stol)} → ${f(c2.stol)}, en tråd ${f(per)}), och den i handen inte (${f(c2.hand)})`, Math.abs(c1.stol - c2.stol - per) < 1e-9 && c2.hand === c1.hand],
    ];
  },
};

SCENARIER.utvisning = {
  text: 'Utvisningen ger en notis och en rad i krönikan (steg 12.1.253, egenRad i STRAFF_REG, styre.ts): straffen med en egen rad (utvisningen och döden) får ingen rad och notis för domen, de andra får den',
  kor: () => {
    const t = SIM.createState(11, START);
    klockan(t, 11);
    for (const [x, a] of [['m', 33], ['k', 29], ['m', 26], ['k', 31]] as const) nyInvanare(t, x, a);
    const vuxna = SIM.living(t).filter(p => SIM.ageOf(p, t.now) >= SIM.ALDER.vuxen), [l, tjuv, offer] = vuxna;
    (l!.tek ??= {}).ledarskap = 1;
    for (const q of vuxna) if (q !== l) SIM.getRel(t, l!, q).op = 40;
    styreTimme(t);
    let forsok = 0;
    for (; forsok < 20 && SIM.alive(tjuv!) && tjuv!.left === undefined; forsok++) {
      t.now += SIM.DAY; klockan(t, 11);
      t.styre!.lagar = [{ id: 'stoldforbud', t: t.now - SIM.DAY, straff: 3, av: l!.id, om: '' } as never]; // stölden ger utvisning (ledaren kan föreslå ett annat straff)
      for (const q of vuxna) { q.x = l!.x + 1; q.y = l!.y; }
      SIM.handelse(t, tjuv!, 'stold', offer!, 'mat');
      SIM.allmant(t, tjuv!, { h: 'stold', t: t.now, mot: offer!.id, motNamn: offer!.name, sak: 'mat' }, 0.5, []);
      klockan(t, SIM.STR.timme); styreTimme(t);
    }
    const rader = (t.notiser?.lista ?? []).flatMap(n => n.rader.map(r => [n.id, r] as const)).filter(([, r]) => r.includes(tjuv!.name));
    const utv = rader.filter(([, r]) => /utvis|driver ut/.test(r));
    return [
      ['utvisningen och döden har en egen rad, slag och böter inte', SIM.straffEgenRad(3) && SIM.straffEgenRad(6) && !SIM.straffEgenRad(2) && !SIM.straffEgenRad(4)],
      [`tjuven drevs ut (${forsok} försök, ${t.stat?.utvisad ?? 0} utvisade, ${t.stat?.straff ?? 0} straff, ${t.stat?.lag_ej_efterlevd ?? 0} ej efterlevd, ${Object.entries(t.stat ?? {}).filter(([k]) => /straff_|holm|fri/.test(k)).map(([k, n]) => `${k} ${n}`).join(", ")})`, (t.stat?.utvisad ?? 0) === 1],
      [`en notis om utvisningen (${utv.map(([id, r]) => `${id}: ${r}`).join(' | ')})`, utv.length === 1],
    ];
  },
};

SCENARIER.forstatamdjur = {
  text: 'Steg 12.1.254: en sparad by som redan har tamdjur får ingen notis om sitt första tamdjur när nästa djur föds; uppgraderingen sätter räknaren forstaTamdjur, och en by utan djur får notisen',
  kor: () => {
    const s = SIM.cloneState(testBy(1)), [p] = SIM.living(s);
    const notiser = (b: SIM.State) => (b.notiser?.lista ?? []).filter(n => n.id === 'tamdjur').reduce((a, n) => a + n.n, 0);
    const med = SIM.cloneState(s); SIM.nyttTamdjur(med, 'get', p!.x, p!.y, p!.id); if (med.stat) delete med.stat.forstaTamdjur; med.notiser = undefined; med.v = 65;
    const b = SIM.migrate(JSON.parse(JSON.stringify(med)) as SIM.State);
    SIM.nyttTamdjur(b, 'get', p!.x, p!.y, p!.id);
    const utan = SIM.cloneState(s); utan.tamdjur = []; for (const k of Object.keys(utan.stat ?? {})) if (k.startsWith('tam_') || k === 'forstaTamdjur') delete utan.stat![k]; utan.notiser = undefined; utan.v = 65;
    const c = SIM.migrate(JSON.parse(JSON.stringify(utan)) as SIM.State);
    SIM.nyttTamdjur(c, 'get', p!.x, p!.y, p!.id);
    return [
      [`byn med tamdjur får ingen notis om det första (${notiser(b)} notiser, räknaren ${b.stat?.forstaTamdjur})`, notiser(b) === 0],
      [`byn utan tamdjur får notisen (${notiser(c)})`, notiser(c) === 1],
    ];
  },
};
