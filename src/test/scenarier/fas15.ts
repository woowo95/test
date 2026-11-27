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
    const c = pass(); c.p.torst = SIM.TORST.farligt - 0.03; c.p.task!.nodVald = true; let byten = 0, forra = c.p.task;
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
