// Scenarier för fas 12: myren och järnet.
import * as SIM from '../../sim';
import { SCENARIER, klockan, kor, medBank, setMat, tandEld } from './hjalp';
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
      SIM.setStock(s, { ved: 40 });
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
      [`tekniken ${tek?.namn} kräver ${tek?.krav} och öppnas när byn har haft järn (före ${fore}, efter ${haft})`, !!tek && tek.krav.includes('kolmila') && tek.krav.includes('stenhuggarplats') && tek.tidigast?.[0].stat === 'jarnHaft' && !fore && haft],
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
    return [
      [`recepten: järnyxa ${JSON.stringify(R.jarnyxa.av)} ${R.jarnyxa.min} min, järnkniv ${JSON.stringify(R.jarnkniv.av)} ${R.jarnkniv.min} min, lie ${JSON.stringify(R.lie.av)} ${R.lie.min} min`, R.jarnyxa.av.jarn === 2 && R.jarnyxa.av.grenar === 1 && R.jarnyxa.min === 5 && R.jarnkniv.av.jarn === 1 && R.jarnkniv.min === 4 && R.lie.av.jarn === 2 && R.lie.min === 5],
      [`de ligger i grupperna yxa, kniv och skära med högre rang än stensaken`, SIM.gruppOf('jarnyxa') === 'yxa' && SIM.gruppOf('jarnkniv') === 'kniv' && SIM.gruppOf('lie') === 'skara' && (SIM.SAKER.jarnyxa!.rang ?? 0) > (SIM.SAKER.yxa!.rang ?? 0)],
      [`byn som vill ha en yxa saknar en av järn (${brist}), och den smids vid städet (${u?.act}, ${kan})`, brist > 0 && u?.act === 'smida' && u.tool === 'jarnyxa' && u.ref === t.id && kan],
      [`smidet tar 2 järn (kvar ${jarnKvar}) och yxan blir smedens`, !!yxa && yxa.agare === p.id && jarnKvar === 4],
      [`järnyxan tas före flintyxan (${tagen?.k})`, tagen?.k === 'jarnyxa'],
      [`järnyxan fäller ett träd på en tredjedel av tiden (${Math.round(sten / 1000)} s mot ${Math.round(jarn / 1000)} s)`, Math.abs(sten / jarn - 3) < 1e-6],
      [`hugga och klyva ger tre gånger så mycket med järnyxan, slakten går tre gånger så fort med järnkniven`, A.hugga.redskap!.jarnyxa.ger === 3 && A.klyva.redskap!.jarnyxa.ger === 3 && A.slakta.redskap!.jarnkniv.fart === 3 && A.falla.redskap!.jarnyxa.fart === 3],
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
    const hal = (borr: boolean) => {
      const s = SIM.createState(1, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
      s.is = { vatten: 0, cm: 40 } as typeof s.is;
      SIM.addTool(s, 'yxa', p); SIM.addTool(s, 'flintspjut', p);
      if (borr) SIM.addTool(s, 'isborr', p);
      const h = SIM.halVal(s, p);
      return { h: h?.id, min: h ? SIM.halMin(s, p) : undefined };
    };
    const med = hal(true), utan = hal(false);
    return [
      [`isborren: ${JSON.stringify(R.av)} på ${R.min} minuter i smedjan`, R.av.jarn === 1 && R.av.grenar === 1 && R.min === 4 && R.tek === 'smedja' && !!SIM.JARNSAKER.isborr],
      [`genom 40 cm is får byn med borr upp hålet på 4 minuter (${med.h}, ${med.min} minuter)`, med.h === 'isborr' && Math.abs((med.min ?? 0) - 4) < 1e-9],
      [`byn utan borr får inte upp något (${utan.h ?? 'inget'})`, !utan.h],
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
