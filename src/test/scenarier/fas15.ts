// Scenarier för fas 15.
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, klockan, kor, naraGranne, setMat, tandEld, tandOchFlinta, testBy } from './hjalp';
import { bynNu, RIM } from '../rimligt';
import { forLangtArbete, tidSlagAv } from '../../sim/tider';
import { foretagBy } from './fas14';

SCENARIER.matskal = {
  text: 'Steg 15.1.1: skälet för maten säger byns egen del av maten, det tal som avgjorde valet, och vakten för skälet mäter samma tal. När familjerna äger mat säger skälet att resten är deras',
  kor: () => {
    const s = SIM.createState(6, START); klockan(s, 11); tandEld(s); SIM.setAmount(s, 'ved', 100); tandOchFlinta(s);
    setMat(s, { torrkott: 6 }); // byns egen mat räcker kort
    const vuxna = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), agare = vuxna[0]!;
    SIM.put(s, 'torrkott', 300, { [agare.id]: 300 }); // en familj äger mycket mat
    const skal: string[] = [];
    for (let i = 0; i < 30 && !skal.length; i++) {
      for (const p of vuxna) { Object.assign(p, { hunger: 0.9, rest: 0.9, social: 0.9, toa: 0.9, torst: 0.9, warm: 0.9, health: 1 }); p.task = undefined; }
      SIM.tidyTools(s);
      for (const p of vuxna) { SIM.chooseTask(s, p); if (/^Byn behöver mat/.test(p.task?.why ?? '')) skal.push(p.task!.why!); }
    }
    const fd = SIM.foodDays(s), { fdBy } = SIM.matTal(s, fd), text = skal[0] ?? '(inget)';
    return [
      [`någon samlar för att byn behöver mat (${text})`, skal.length > 0],
      [`skälet säger byns egen mat, ${SIM.dygn(fdBy)}, och inte hela förrådets ${SIM.dygn(fd)}`, text.includes(`byns mat räcker ${SIM.dygn(fdBy)}`) && fdBy < fd - 0.5],
      ['skälet säger att resten är familjernas', text.includes('resten är familjernas')],
      [`vakten för skälet mäter samma tal (byns mat ${SIM.kortTal(bynNu(s).mat)} av målet)`, bynNu(s).mat < RIM.marg],
    ];
  },
};

SCENARIER.stentur = {
  text: 'Steg 15.1.2: turen efter sten och flinta får sitt mål ur det som saknas. En by som saknar stenar men har flinta skickar ingen efter flinta, och turerna till stenarna är få och hela: de lämnas inte efter en eller två minuter',
  kor: () => {
    // en testby som saknar några stenar men har flinta över (som i spelgranskningen: lite byggsten fattas)
    const s = SIM.cloneState(testBy(10)); klockan(s, 9);
    s.fire.ring = undefined; SIM.setAmount(s, 'sten', 0); SIM.setAmount(s, 'flinta', SIM.materialBuffert(s, 'flinta') + 5); // eldringen saknas: byn behöver stenar till den
    const mest = SIM.letaMest(s), skalNu = mest && `Byn behöver ${mest.k === 'sten' ? 'stenar' : 'flinta'}`;
    const starter: { vem: number; k: string; fel: boolean; t0: number; t1: number }[] = [], pagar = new Map<number, { t: SIM.Task; r: typeof starter[number] }>();
    kor(s, 12, b => {
      for (const p of SIM.living(b)) {
        const t = p.task, g = pagar.get(p.id);
        if (g && g.t !== t) { g.r.t1 = b.now; pagar.delete(p.id); }
        if (t?.act === 'samla' && t.sok && t.sok !== true && !pagar.has(p.id)) {
          const r = { vem: p.id, k: t.sok, fel: SIM.letaFattas(b, t.sok) <= 0, t0: b.now, t1: b.now };
          starter.push(r); pagar.set(p.id, { t, r });
        }
      }
    });
    for (const g of pagar.values()) g.r.t1 = s.now;
    const efter = (k: string) => starter.filter(r => r.k === k), korta = starter.filter(r => r.t1 - r.t0 < 2 * SIM.MIN);
    const perPerson = Math.max(0, ...[...new Set(starter.map(r => r.vem))].map(id => starter.filter(r => r.vem === id).length));
    return [
      [`det som saknas är stenar, och raden leta gäller dem (${mest?.k}: ${skalNu})`, mest?.k === 'sten'],
      [`inga turer efter flinta (${efter('flinta').length})`, efter('flinta').length === 0],
      [`ingen skickas efter flinta när flintan räcker (${starter.filter(r => r.fel).length} fel av ${starter.length})`, !starter.some(r => r.fel)],
      [`turerna är hela: ${korta.length} av ${starter.length} kortare än två minuter`, korta.length <= starter.length / 4],
      [`få turer per person på 12 timmar (högst ${perPerson})`, perPerson <= 6],
      [`stenarna kom hem (${SIM.amountOf(s, 'sten')} av ${SIM.materialBuffert(s, 'sten')})`, SIM.letaFattas(s, 'sten') === 0],
    ];
  },
};

SCENARIER.avbrott = {
  text: 'Steg 15.1.4: farlig törst, hunger och kyla avbryter ett långt arbete eller ett vaktpass, som behovet att gå på toa redan gör, och den som avbryter väljer om med behovet i poängen. Den som valde sin uppgift när behovet redan var farligt avbryts inte igen',
  kor: () => {
    const drick = new Set(['dricka', 'dryck', 'smalta', 'ata_sno']);
    const pass = () => {
      const s = SIM.createState(5, START); klockan(s, 23); tandEld(s); setMat(s, { torrkott: 100 });
      const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!, e = SIM.eldPlats(s);
      Object.assign(p, { x: e.x + 1.5, y: e.y + 0.5, hunger: 0.9, rest: 0.9, social: 0.9, toa: 0.9, warm: 0.9, health: 1, torst: 0.9 });
      p.task = { act: 'vakt', phase: 'do', tx: p.x, ty: p.y, until: s.now + 6 * SIM.HOUR, carry: 0, dark: true, why: 'Håller vakt i natt' };
      return { s, p };
    };
    // vakten med god törst står kvar, med farlig törst går hen och dricker
    const a = pass(); kor(a.s, 0.25); const kvar = a.p.task?.act;
    const b = pass(); b.p.torst = SIM.TORST.farligt - 0.03; let drack = false;
    const gjorde: string[] = [];
    kor(b.s, 1, () => { const k = b.p.task?.act ?? ''; if (gjorde.at(-1) !== k) gjorde.push(k); if (drick.has(k) || b.p.torst > 0.5) drack = true; }); // ett slag är längre än det tar att dricka
    // den som valde med törsten redan farlig och fick samma uppgift igen avbryts inte i varje slag
    const c = pass(); c.p.torst = SIM.TORST.farligt - 0.03; c.p.task!.nod = 1; let byten = 0, forra = c.p.task;
    kor(c.s, 0.1, () => { if (c.p.task !== forra) { byten++; forra = c.p.task; } });
    return [
      [`vakten står kvar när törsten inte är farlig (${kvar})`, kvar === 'vakt'],
      [`vakten avbryter och dricker när törsten är farlig (${gjorde.join(", ")}, törst ${Math.round(b.p.torst * 100)} %)`, drack && gjorde[0] !== 'vakt'],
      [`den som valde med behovet i poängen avbryts inte igen (${byten} byten)`, byten === 0],
    ];
  },
};

SCENARIER.eldtext = {
  text: 'Steg 15.1.5: texten säger "vid elden" bara när en eld brinner nära, annars "i mörkret" eller "i huset". Slocknar elden medan man sitter kvar byter texten',
  kor: () => {
    const s = SIM.createState(5, START); klockan(s, 21); tandEld(s, 6); setMat(s, { torrkott: 100 });
    const folk = SIM.living(s), vid = () => folk.find(p => (p.task?.why ?? '').includes(' vid elden'));
    for (let i = 0; i < 20 && !vid(); i++) for (const p of folk) { Object.assign(p, { hunger: 0.9, rest: 0.6, social: 0.3, toa: 0.9, torst: 0.9, warm: 0.9, health: 1 }); p.task = undefined; SIM.chooseTask(s, p); }
    const p = vid(), fore = p?.task?.why ?? '(ingen)';
    for (const f of SIM.eldarOf(s)) Object.assign(f, { lit: false, fuel: 0 }); // elden brinner ut
    kor(s, 0.05);
    const efter = p?.task?.why ?? '';
    // utan eld från början säger texten aldrig "vid elden"
    const m = SIM.createState(5, START); klockan(m, 21); setMat(m, { torrkott: 100 }); for (const f of SIM.eldarOf(m)) Object.assign(f, { lit: false, fuel: 0 });
    const texter: string[] = [];
    for (const q of SIM.living(m)) { Object.assign(q, { hunger: 0.9, rest: 0.6, social: 0.3, toa: 0.9, torst: 0.9, warm: 0.9, health: 1 }); q.task = undefined; SIM.chooseTask(m, q); texter.push((q.task as SIM.Task | undefined)?.why ?? ''); }
    return [
      [`någon säger att hen är vid elden när den brinner (${fore})`, !!p],
      [`när elden brunnit ut säger texten var hen är (${efter})`, !!p && !efter.includes(' vid elden') && /i mörkret|i huset|ute/.test(efter)],
      [`utan eld säger ingen "vid elden" (${texter.filter(w => w.includes(' vid elden')).length} av ${texter.length})`, !texter.some(w => w.includes(' vid elden'))],
    ];
  },
};

SCENARIER.forsoktid = {
  text: 'Steg 15.1.6: ett försök med en teknik tar 10–20 riktiga minuter (två och en halv till fem dagar i spelet), som arbetet vid en station, och vakten för arbetstiderna (steg 9.2.63) känner igen försöken. Chansen per arbetad timme står kvar',
  kor: () => {
    const s = SIM.createState(5, START), min = SIM.TEKTAL.forsokMin;
    const uppg = (m: number) => ({ act: 'forsok' as const, until: s.now + m * SIM.MIN });
    return [
      [`ett försök tar ${min} minuter, mellan 10 och 20`, min >= 10 && min <= 20],
      [`vakten räknar försöket som arbete vid en station (${tidSlagAv('forsok')})`, tidSlagAv('forsok') === 'station'],
      ['vakten godtar ett försök av den längden', forLangtArbete(uppg(min), s.now) === undefined],
      [`och larmar för ett på 90 minuter (${forLangtArbete(uppg(90), s.now) ?? 'inget larm'})`, forLangtArbete(uppg(90), s.now) !== undefined],
    ];
  },
};

SCENARIER.gruvslut = {
  text: 'Steg 15.1.10: silvergruvan tar slut. Varje gruva har SILVER.innehall silver, det som bryts tas ur den och det sista bryts bara så långt det räcker. Sällskapet vänder hem när gruvan är tom, platsen tas bort ur världen och en ny gruva läggs på ett annat berg som huvudbyn inte känner till',
  kor: () => {
    const s = SIM.cloneState(testBy(3, naraGranne)), vl = s.varld!, v = SIM.varldMark(s)!, hem = SIM.byPlats(vl, vl.huvud!)!;
    const gruvor = () => (vl.platser ?? []).filter(q => q.k === 'silvergruva');
    const g = gruvor().sort((a, b) => Math.hypot(a.x - hem.x, a.y - hem.y) - Math.hypot(b.x - hem.x, b.y - hem.y)).find(q => SIM.vagDygn(s, hem.y * v.w + hem.x, q.y * v.w + q.x))!;
    const fran = gruvor().length, fore = new Set(gruvor().map(q => q.nr));
    (g.inne ??= {}).silver = 3; // en gruva med lite silver kvar
    const [a, b] = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= 18 && SIM.ageOf(q, s.now) < 50 && SIM.kanGa(q));
    const sl = SIM.nyttSallskap(s, a!, g.nr, 'hamta')!; SIM.foljMed(vl, sl, b!);
    sl.nere = 2; sl.pack = { brod: 10 }; sl.skede = 'framme'; sl.framme = s.now; sl.behov = { matt: 1, vatska: 1, ork: 1, fulla: 0, foder: 0 };
    for (let h = 0; h < 48 && sl.skede === 'framme'; h++) { s.now += SIM.HOUR; SIM.resaBehov(s, SIM.HOUR); }
    const ny = gruvor().find(q => !fore.has(q.nr));
    return [
      [`sällskapet bröt det som fanns, 3 silver (${sl.pack.silver ?? 0})`, (sl.pack.silver ?? 0) === 3],
      [`och vände hem när gruvan var tom (${sl.skede})`, sl.skede !== 'framme'],
      ['den tomma gruvan är borta ur världen', !gruvor().includes(g) && !!s.stat?.gruvaTom],
      [`världen har lika många gruvor som förut (${gruvor().length} av ${fran})`, gruvor().length === fran],
      [`den nya gruvan ligger på ett annat berg (${ny ? `${ny.x},${ny.y}` : 'ingen'} mot ${g.x},${g.y})`, !!ny && (ny.x !== g.x || ny.y !== g.y) && SIM.MARK_IDS[v.mark[ny.y * v.w + ny.x]] === 'berg'],
      ['huvudbyns folk känner inte till den nya gruvan', !!ny && !SIM.living(s).some(p => SIM.findL(p, 'ort', ny.nr))],
    ];
  },
};

SCENARIER.gastbetalar = {
  text: 'Steg 15.1.11: företagets gäst tar med sig silver och varor ur hembyns överskott, packade som handlarens last, och betalar med det hen har. Det hen betalar med lämnar raden, och det hen inte betalade med går hem igen',
  kor: () => {
    const { s, p, f, disk, fin } = foretagBy(), k = SIM.klanerOf(s).find(q => q.rad !== undefined)!, rad = s.varld!.rader!.find(q => q.nr === k.rad)!;
    for (const q of SIM.living(s)) q.task = undefined;
    k.inst = 20; rad.tal.silver = 0; // grannbyn har inget silver, men mat över
    SIM.radTar(rad, 'torrkott', 80); const mat0 = SIM.radOverskott(rad, 'mat');
    // gästerna packar olika varor; en levande get är för mycket att betala en måltid med i hela saker, så den första gästen som har
    // något lagom köper
    const o = SIM.koPlats(s, disk), andra: SIM.Person[] = [];
    let g = SIM.nyForetagsgast(s, f, k, 'vanlig')!;
    for (let i = 0; i < 12; i++) { g.x = o.x; g.y = o.y; g.hunger = 0.4; if (SIM.erbjudandet(s, g, 'servering', f)) break; andra.push(g); g = SIM.nyForetagsgast(s, f, k, 'vanlig')!; }
    const med = { ...g.gast!.varor ?? {} };
    for (const q of andra) SIM.gastHemIgen(s, q);
    for (let i = 0; i < 5 && g.gast!.gor !== 'ko'; i++) SIM.foretagsgastSteg(s, 1);
    const ro = f.ko?.find(q => q.p === g.id), varor0 = SIM.ownsId(s, p.id, fin);
    if (ro) { p.task = { act: 'betjana', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '', ref: f.id }; const v = SIM.vidStation(disk); p.x = v.x; p.y = v.y; SIM.use(s, undefined, ro.k, 1, true, p.id); p.task.items = { [ro.k]: 1 }; p.task.ag = { [ro.k]: { [p.id]: 1 } }; SIM.betjanaKlar(s, p, p.task); p.task = undefined; }
    const kvar = g.gast!.varor ?? {}, gav = Object.keys(med).reduce((n, q) => n + (med[q]! - (kvar[q] ?? 0)), 0);
    const fore = Object.values(kvar).reduce((a, n) => a + n, 0), radFore = SIM.VARUGRUPP_IDS.map(q => SIM.radHar(rad, q));
    SIM.gastHemIgen(s, g);
    const radEfter = SIM.VARUGRUPP_IDS.map(q => SIM.radHar(rad, q)), vaxte = radEfter.some((x, i) => x > radFore[i]! + 1e-9) && radEfter.every((x, i) => x >= radFore[i]! - 1e-9);
    return [
      [`gästen kommer utan silver (${g.gast!.silver ?? 0}) men med varor ur hembyns överskott (${JSON.stringify(med)}, matöverskott ${mat0})`, (g.gast!.silver ?? 0) === 0 && Object.keys(med).length > 0],
      [`gästen köpte en måltid och betalade med varor (${gav} saker)`, !!ro && gav >= 1 && SIM.ownsId(s, p.id, fin) === varor0 - 1],
      [`det som blev över (${fore} saker) går hem till raden`, fore === 0 || vaxte],
    ];
  },
};

SCENARIER.efterfragan = {
  text: 'Steg 15.1.12: efterfrågan på en affär räknar bara bybor som kan köpa och bara varor ägaren har över eller kan göra själv (steg 15.1.96). Ägarens familj räknas inte, maten räknas som en vara, och den som saknar flera saker räknas som en kund för var och en',
  kor: () => {
    const s = SIM.cloneState(testBy(25));
    const vux = SIM.living(s).filter(q => !q.gast && SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen);
    const ag = vux[0]!, fam = SIM.familjOf(s, ag.id).filter(q => q !== ag), andra = vux.filter(q => q !== ag && !fam.includes(q));
    // alla utom ägaren äger inget, och maten i byn är ägarens: den som är hungrig saknar mat
    for (const q of SIM.living(s)) if (q !== ag) { s.ting = (s.ting ?? []).filter(x => x.agare !== q.id); for (const a of s.stackar ?? []) if (a.ag?.[q.id]) delete a.ag[q.id]; }
    for (const k of SIM.FOOD) SIM.setAmount(s, k, 0);
    for (const q of SIM.living(s)) { q.bruk = undefined; q.hunger = 0.9; if (q !== ag) SIM.laggIn(s, 'silver', 200, q.id); } // kunderna har råd
    const kunder = (vem: SIM.Person[]) => { for (const q of SIM.living(s)) if (q !== ag) q.bruk = { t: Math.floor(s.now / SIM.HOUR), k: vem.includes(q) ? SIM.saknarNu((q.bruk = undefined, s), q).map(k => [0, k] as [number, string]) : [] }; return SIM.efterfragan(s, 'affar', ag.id).kunder; };
    const p = andra[0]!, A = SIM.VERKSAMHETER.affar, utan = kunder([p]);
    // utan något över räknas bara det ägaren kan göra själv (steg 15.1.96)
    const utanVaror = Object.keys(SIM.efterfragan(s, 'affar', ag.id).perVara).filter(k => (SIM.efterfragan(s, 'affar', ag.id).perVara[k] ?? 0) > 0), kanGora = SIM.kanSkaffaVaror(s, ag, utanVaror);
    // per vara: den som saknar just den
    p.bruk = undefined; const lar = SIM.saknarNu(s, p).filter(k => k !== 'mat'), inte = ['korg', 'yxa', 'spjut'].find(k => !lar.includes(k))!;
    const perVara = lar.every(k => A.perDygn(s, p, k) > 0) && A.perDygn(s, p, inte) === 0;
    const familj = fam.length ? kunder(fam) : 0;
    // maten: den hungriga räknas för maten ägaren har över, en gång hur många sorter ägaren än har
    p.hunger = 0.2; SIM.laggIn(s, 'torrkott', 200, ag.id); p.bruk = undefined; const matNu = SIM.saknarNu(s, p).includes('mat'), mat1 = kunder([p]);
    SIM.laggIn(s, 'bar', 200, ag.id); SIM.laggIn(s, 'rotter', 200, ag.id); const mat3 = kunder([p]);
    return [
      [`ägaren utan varor över ger bara efterfrågan på det hen kan göra själv (${utan.toFixed(2)}: ${utanVaror.join(', ') || 'inget'}; kan göra ${kanGora.join(', ') || 'inget'})`, utanVaror.every(k => kanGora.includes(k))],
      [`affären räknar per vara: den som saknar ${lar.join(', ')} räknas för var och en, men inte för ${inte}`, lar.length >= 2 && perVara],
      [`familjen räknas inte (${familj.toFixed(2)}, ${fam.length} i familjen)`, familj === 0],
      [`den som saknar mat räknas för maten ägaren har över (${matNu ? 'saknar mat' : 'saknar inte mat'}, ${mat1.toFixed(2)})`, matNu && mat1 > 0],
      [`maten är en vara: tre sorter ger inte fler kunder (${mat3.toFixed(2)} mot ${mat1.toFixed(2)})`, Math.abs(mat3 - mat1) < mat1 * 0.5],
    ];
  },
};

SCENARIER.gastefterfragan = {
  text: 'Steg 15.1.13: gästerna räknas i efterfrågan bara om de kan betala, ett öppet företag drar av det det sålt (och inget om det inget sålt), och en affär drar bara av från samma vara',
  kor: () => {
    const { s, p, f } = foretagBy(), N = SIM.VERKSAMHETER.nattlogi;
    // gästerna: med hembyns silver kan de betala, utan silver och utan något över kan de inte
    for (const r of s.varld?.rader ?? []) r.tal.silver = 500;
    const rika = N.gaster!(s, 6);
    s.now += SIM.HOUR; // gästens pung räknas en gång i timmen
    for (const r of s.varld?.rader ?? []) { r.tal.silver = 0; r.tal.mat = 0; r.varor = {}; }
    const fattiga = N.gaster!(s, 6);
    // servering: ett öppet företag som inget sålt tar ingen efterfrågan, ett som sålt drar av det
    const ag2 = SIM.living(s).find(q => !q.gast && q !== p && !SIM.familjOf(s, p.id).includes(q) && SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    const ef = (v: string) => SIM.efterfragan(s, v, ag2.id);
    f.salt = undefined; const inget = ef('servering').kunder;
    s.foretag = []; const utan = ef('servering').kunder; s.foretag = [f];
    f.salt = { servering: 0.5 }; const salt = ef('servering').kunder;
    // affären: krukorna som säljs tar inget från skinnet
    const fk = SIM.starta(s, p.id, ['affar']); fk.hus = f.hus; f.verk = []; // samma hus, med disken
    const c = SIM.living(s).find(q => !q.gast && q !== ag2 && q !== p && !SIM.familjOf(s, ag2.id).includes(q) && SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    // en hungrig kund utan egen mat, och maten i byn är ägarens
    for (const q of SIM.FOOD) SIM.setAmount(s, q, 0);
    for (const a of s.stackar ?? []) if (a.ag?.[c.id]) delete a.ag[c.id];
    c.hunger = 0.2; c.bruk = undefined; SIM.laggIn(s, 'silver', 200, c.id); SIM.laggIn(s, 'torrkott', 100, ag2.id);
    const v0 = ef('affar').perVara, k = Object.keys(v0).find(x => v0[x]! > 0 && x !== 'lerkruka_mellan');
    fk.saltVara = { lerkruka_mellan: 50 }; const kruka = k ? ef('affar').perVara[k] ?? 0 : 0;
    if (k) fk.saltVara = { [k]: 50 }; const samma = k ? ef('affar').perVara[k] ?? 0 : 0;
    return [
      [`gäster som kan betala räknas (${rika.toFixed(2)}), gäster utan något att betala med inte (${fattiga.toFixed(2)})`, rika > 0 && fattiga === 0],
      [`ett öppet företag som inget sålt tar ingen efterfrågan (${inget.toFixed(2)} mot ${utan.toFixed(2)} utan det)`, Math.abs(inget - utan) < 1e-9 && utan > 0],
      [`ett som sålt drar av det (${salt.toFixed(2)})`, salt < utan - 0.1],
      [`krukorna som säljs tar inget från ${k ?? '(ingen vara)'} (${kruka.toFixed(2)} mot ${(k ? v0[k]! : 0).toFixed(2)})`, !!k && Math.abs(kruka - v0[k]!) < 1e-9],
      [`men samma vara gör det (${samma.toFixed(2)})`, !!k && samma < v0[k]! - 1e-9],
    ];
  },
};

SCENARIER.stallafram = {
  text: 'Steg 15.1.14: ägaren fastnar inte vid varubordet. Det ägaren har över räknas på hela förrådet när hen är framme vid högen, som när arbetet valdes, så att varan flyttas och hen sedan gör annat. I en affär utan disk är det inget värt att ställa fram',
  kor: () => {
    const { s, p, f, vux, fin } = foretagBy(['affar']);
    for (const q of s.people) q.task = undefined;
    for (const m of SIM.FOOD) if (m !== fin) SIM.setAmount(s, m, 0); // bara ägaren har mat, och de andra är hungriga
    const v1 = SIM.stationSite(s, 'varubord')!;
    s.stationer!.push({ id: s.nextStation = (s.nextStation ?? 0) + 1, k: 'varubord', x: v1.x, y: v1.y, rot: v1.rot, kvar: 0, inne: 1 } as unknown as SIM.Station); SIM.touch(s);
    for (const q of vux) { SIM.laggIn(s, 'silver', 60, q.id); q.hunger = 0.3; q.bruk = undefined; }
    const val = SIM.stallaVal(s, p);
    let starter = 0, forra: SIM.Task | undefined;
    const lyckat0 = s.stat?.stalltFram ?? 0;
    for (let i = 0; i < 2 * 360; i++) { SIM.step(s, 10); const t = p.task; if (t && t !== forra && t.act === 'stallaFram') starter++; forra = t; } // korta slag, så att varje gång syns
    const lyckat = (s.stat?.stalltFram ?? 0) - lyckat0;
    const framme = SIM.hyllan(s, f).length;
    // utan disk ställs inget fram
    s.stationer = s.stationer!.filter(t => t.k !== 'disk'); SIM.touch(s); p.task = undefined;
    const utanDisk = SIM.stallaVal(s, p);
    return [
      [`ägaren vill ställa fram något (${val?.h.k ?? 'inget'})`, !!val],
      [`varan kom upp på varubordet (${framme} framme)`, framme > 0],
      [`ägaren ställer fram några gånger och gör sedan annat (${starter} gånger på två timmar, ${lyckat} lyckade)`, starter >= 1 && starter <= lyckat + 1],
      [`i en affär utan disk ställs inget fram (${utanDisk?.h.k ?? 'inget'})`, !utanDisk],
    ];
  },
};
