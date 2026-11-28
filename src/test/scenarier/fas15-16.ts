// Scenarier för fas 15, grupp 16 (steg 15.1.151–15.1.160).
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, testBy } from './hjalp';
import { foretagBy } from './fas14';

// en vuxen i en ny by, utan något på sig (det som bärs läggs till i scenariot)
function vuxenUtanSaker(s: SIM.State) {
  const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
  for (const t of SIM.allaTing(s)) if (t.agare === p.id || t.bar === p.id || t.hos === p.id) { t.agare = -1; t.bar = undefined; t.hos = undefined; }
  return p;
}

SCENARIER.stridsvarde = {
  text: 'Steg 15.1.151: stridsvärdet ur kroppen och det man bär. En bybo med svärd och brynja har högre värde än samma bybo med kniv, och en stark högre än en svag med samma vapen',
  kor: () => {
    const s = SIM.createState(6, START), p = vuxenUtanSaker(s);
    const hand = SIM.stridsvarde(s, p);
    const kniv = SIM.newTing(s, 'kniv', 1, p.id);
    const medKniv = SIM.stridsvarde(s, p);
    kniv.agare = -1;
    SIM.newTing(s, 'svard', 1, p.id); const br = SIM.newTing(s, 'ringbrynja_jarn', 1, p.id); br.bar = p.id;
    const rustad = SIM.stridsvarde(s, p);
    const st0 = p.pot.styrka;
    p.pot.styrka = 16; const stark = SIM.stridsvarde(s, p);
    p.pot.styrka = 5; const svag = SIM.stridsvarde(s, p);
    p.pot.styrka = st0;
    const mitt = SIM.stridsvardeAv({ st: SIM.MITTKROPP, vapen: 'hand', klader: [] });
    return [
      [`kniven ger mer än händerna (${SIM.kortTal(medKniv)} mot ${SIM.kortTal(hand)})`, medKniv > hand],
      [`svärd och brynja ger mer än kniven (${SIM.kortTal(rustad)} mot ${SIM.kortTal(medKniv)})`, rustad > medKniv * 1.5],
      [`en stark har högre värde än en svag med samma svärd och brynja (${SIM.kortTal(stark)} mot ${SIM.kortTal(svag)})`, stark > svag * 1.5],
      [`en vuxen med mittersta kropp och händerna har ett värde kring 6 (${SIM.kortTal(mitt)})`, mitt > 4 && mitt < 8],
    ];
  },
};

SCENARIER.radstyrka = {
  text: 'Steg 15.1.152: världen räknar i stridsvärde. Mot samma mål skickar en by med järnvapen färre anfallare än en by med stenredskap, med samma vinstchans, och huvudbyns rad har de vuxnas stridsvärden',
  kor: () => {
    const s = SIM.cloneState(testBy(10)), vl = s.varld!;
    const r = vl.rader!.find(x => SIM.lever(vl, x) && x.sort === 'by' && SIM.radGrannar(vl, x).some(g => g.nr !== vl.huvud))!;
    const mot = SIM.radGrannar(vl, r).find(g => g.nr !== vl.huvud)!;
    mot.tal.folk = 40; mot.tal.styrka = 30; mot.tal.kraft = 0; mot.tal.mat = 0;
    const varor = SIM.radVaror(mot) as Record<string, number>; for (const g in varor) varor[g] = 0; // inget att bära hem: storleken är styrkan som behövs
    const rik = (tek: string[]): SIM.VarldRad => ({ ...r, tek, tal: { ...r.tal, folk: 400, styrka: 300, kraft: 0, rikedom: 400 * 600 } });
    const jarn = rik(SIM.TEKNIK.map(t => t.id)), sten = rik(['kniv', 'yxa', 'fiskespjut']);
    const nJ = SIM.flockStorlek(jarn, 0, mot), nS = SIM.flockStorlek(sten, 0, mot), pJ = SIM.vinstChans(jarn, mot, nJ), pS = SIM.vinstChans(sten, mot, nS);
    const uJ = SIM.radUtrustning(jarn), uS = SIM.radUtrustning(sten);
    SIM.skrivHuvudRad(s);
    const h = SIM.radNr(vl, vl.huvud)!, summa = Math.round(SIM.living(s).filter(p => SIM.vuxenKan(s, p)).reduce((a, p) => a + SIM.stridsvarde(s, p), 0));
    const proc = (p: number) => `${Math.round(100 * p)} %`;
    return [
      [`järnbyn bär ${uJ.vapen} och ${uJ.klader.join(', ') || 'inget skydd'}${uJ.skold ? ' och sköld' : ''}; stenbyn ${uS.vapen} och ${uS.klader.join(', ') || 'inget skydd'}`, ['svard', 'jarnyxa', 'jarnspjut'].includes(uJ.vapen) && !['svard', 'jarnyxa', 'jarnspjut'].includes(uS.vapen)],
      [`värdet per person är högre i järnbyn (${SIM.kortTal(SIM.radVarde(jarn))} mot ${SIM.kortTal(SIM.radVarde(sten))})`, SIM.radVarde(jarn) > SIM.radVarde(sten) * 1.5],
      [`järnbyn skickar färre än stenbyn mot samma mål (${nJ} mot ${nS})`, nJ < nS && nJ >= SIM.BYANFALL.minst],
      [`med samma vinstchans (${proc(pJ)} mot ${proc(pS)})`, Math.abs(pJ - pS) < 0.08],
      [`huvudbyns rad har de vuxnas stridsvärden (${h.tal.kraft}, summan ${summa}) och styrkan är antalet (${h.tal.styrka})`, h.tal.kraft === summa && h.tal.kraft > h.tal.styrka],
    ];
  },
};

SCENARIER.radvapen = {
  text: 'Steg 15.1.153: anfallarna rustas efter hembyn. Ett gäng från en by med vapensmide bär svärd och järnskydd och är få; ett gäng från en by utan järn bär sten- och träredskap och är fler. Krönikan säger hur gänget var rustat',
  kor: () => {
    const prova = (tek: string[]) => {
      const s = SIM.cloneState(testBy(10)), vl = s.varld!;
      const r = vl.rader!.find(x => SIM.lever(vl, x) && x.sort === 'by')!;
      Object.assign(r, { tek }); Object.assign(r.tal, { folk: 200, styrka: 150, kraft: 0, rikedom: 200 * 600 });
      SIM.skrivHuvudRad(s);
      const h = SIM.radNr(vl, vl.huvud)!;
      const hv = SIM.radVaror(h) as Record<string, number>; for (const g in hv) hv[g] = 0; h.tal.mat = 0; // inget att bära hem: storleken är styrkan som behövs
      const n = SIM.flockStorlek(r, 0, h);
      const f = SIM.radKommer(s, r.syn, n, undefined, undefined, r), folk = SIM.rovarna(s, f);
      const bar = folk.map(p => SIM.gastTingOf(s, p).map(t => t.k));
      return { n, folk: folk.length, bar, sv: folk.reduce((a, p) => a + SIM.stridsvarde(s, p), 0) / Math.max(1, folk.length), varld: SIM.radVarde(r), s, f };
    };
    const jarn = prova(SIM.TEKNIK.map(t => t.id)), sten = prova(['kniv', 'yxa', 'fiskespjut']);
    const har = (b: string[][], k: string) => b.filter(x => x.includes(k)).length;
    const JARN = ['svard', 'jarnyxa', 'jarnspjut', 'jarnkniv', 'ringbrynja_jarn', 'jarnhjalm_jarn', 'jarnskold'];
    // krönikan: en strid med järngänget
    const text = SIM.rustatText(SIM.rovarna(jarn.s, jarn.f).map(p => SIM.personKampe(jarn.s, p, 0, 1, 0, 0)));
    return [
      [`järngänget (${jarn.n}) bär svärd (${har(jarn.bar, 'svard')}) och järnskydd (${jarn.bar.filter(b => b.some(k => k === 'ringbrynja_jarn' || k === 'jarnhjalm_jarn')).length})`, har(jarn.bar, 'svard') >= jarn.n / 2 && jarn.bar.filter(b => b.some(k => k === 'ringbrynja_jarn' || k === 'jarnhjalm_jarn')).length >= jarn.n / 2],
      [`några i järngänget skjuter med båge eller slunga (${har(jarn.bar, 'bage') + har(jarn.bar, 'slunga')})`, har(jarn.bar, 'bage') + har(jarn.bar, 'slunga') > 0],
      [`stengänget (${sten.n}) bär inget järn (${sten.bar.flat().filter(k => JARN.includes(k)).length}) och har yxor eller spjut (${sten.bar.filter(b => b.some(k => k === 'yxa' || k === 'fiskespjut' || k === 'flintspjut')).length})`, !sten.bar.flat().some(k => JARN.includes(k)) && sten.bar.filter(b => b.some(k => k === 'yxa' || k === 'fiskespjut' || k === 'flintspjut')).length >= sten.n / 2],
      [`järngänget är färre (${jarn.n} mot ${sten.n})`, jarn.n < sten.n],
      [`gängets stridsvärde följer det världen räknade med (järn ${SIM.kortTal(jarn.sv)} mot ${SIM.kortTal(jarn.varld)}, sten ${SIM.kortTal(sten.sv)} mot ${SIM.kortTal(sten.varld)})`, jarn.sv > sten.sv * 1.5 && [jarn, sten].every(g => g.sv / g.varld > 0.7 && g.sv / g.varld < 1.7)], // rövarnas kropp (ROVARE) och kläderna mot kylan gör dem lite starkare än mittersta kroppen
      [`krönikan säger hur gänget var rustat: ${text}`, /svärd/.test(text) && /järnhjälm|ringbrynja/.test(text)],
    ];
  },
};

SCENARIER.tvadiskar = {
  text: 'Steg 15.1.154: en vid varje disk. En affär med lång kö får brist på en disk till, och med två diskar betjänar två samtidigt; ett stort smutsigt rum städas av två, men den sista rutan bara av en',
  kor: () => {
    const { s, p, f, vux, disk, r } = foretagBy(['affar']);
    for (const q of s.people) q.task = undefined;
    const brist0 = SIM.foretagBord.diskBrist(s);
    // fyra kunder står framme i kön
    const kunder = vux.slice(0, 4);
    f.ko = [];
    kunder.forEach((q, i) => { const sp = SIM.koPlats(s, disk, kunder.slice(0, i).map(k => ({ x: k.x, y: k.y }))); q.x = sp.x; q.y = sp.y; q.task = { act: 'koaDisk', phase: 'do', tx: sp.x, ty: sp.y, until: s.now + 8 * SIM.MIN, carry: 0, why: '', ref: f.id }; f.ko!.push({ p: q.id, v: 'affar', k: 'virke', n: 1, t: s.now }); });
    const brist = SIM.foretagBord.diskBrist(s), rum = SIM.foretagBord.diskRum(s);
    // en disk till i rummet
    const W = SIM.W, upp = new Set([disk.y * W + disk.x, disk.y * W + disk.x + 1, ...kunder.map(q => Math.floor(q.y) * W + Math.floor(q.x)), ...SIM.stationerOf(s).flatMap(t => [t.y * W + t.x, t.y * W + t.x + 1])]);
    const i = new Set(r.tiles), d1 = r.tiles.find(t => [0, 1].every(d => i.has(t + d) && !upp.has(t + d)) && i.has(t + W) && i.has(t + W + 1) && !upp.has(t + W) && !upp.has(t + W + 1) && Math.abs(Math.floor(t / W) - disk.y) >= 2)!;
    const disk2 = { id: s.nextStation = (s.nextStation ?? 0) + 1, k: 'disk', x: d1 % W, y: Math.floor(d1 / W), kvar: 0, inne: 1 } as unknown as SIM.Station;
    s.stationer!.push(disk2); SIM.touch(s);
    const anst = vux[5]; anst.anst = { av: p.id, arb: 'foretag', mal: f.id, w: 1 };
    const b1 = SIM.betjanVal(s, p)!;
    p.task = { act: 'betjana', phase: 'do', tx: b1.spot.x, ty: b1.spot.y, until: s.now + SIM.MIN, carry: 0, why: '', ref: f.id };
    const b2 = SIM.betjanVal(s, anst);
    anst.task = b2 && { act: 'betjana', phase: 'do', tx: b2.spot.x, ty: b2.spot.y, until: s.now + SIM.MIN, carry: 0, why: '', ref: f.id };
    const b3 = SIM.betjanVal(s, vux[6]); // en tredje (ägarens familj eller ingen): ingen disk är ledig
    const tva = !!b2 && (Math.floor(b1.spot.x) !== Math.floor(b2.spot.x) || Math.floor(b1.spot.y) !== Math.floor(b2.spot.y));
    // städningen: ett stort smutsigt rum och ett med en fläck
    const t = SIM.cloneState(testBy(25));
    const rummen = SIM.gridOf(t).rooms.filter(x => x.tiles.length >= 10 && SIM.sovplatser(t, x) > 0);
    const bor = (x: SIM.Rum) => SIM.living(t).filter(q => SIM.ageOf(q, t.now) >= SIM.ALDER.vuxen && !q.gast && SIM.husById(t, x.hus)?.ag !== undefined && (SIM.husById(t, x.hus)!.ag === q.id || SIM.familjOf(t, SIM.husById(t, x.hus)!.ag!).includes(q)));
    const stort = rummen.find(x => bor(x).length >= 2)!, [a, b] = bor(stort);
    t.flackar = []; t.blod = [];
    t.flackar = stort.tiles.slice(0, 10).map(j => ({ k: 'toa', i: j, n: 1, t: t.now }));
    const va = SIM.stadaVal(t, a)!;
    const ua = SIM.stadaUppgift(va); a.task = { act: 'stada', phase: 'do', tx: ua.spot.x, ty: ua.spot.y, until: t.now + SIM.MIN, carry: 0, why: '', ref: ua.ref };
    const vb = SIM.stadaVal(t, b);
    // samma rum med bara en smutsig ruta, som a redan torkar
    t.flackar = [{ k: 'toa', i: ua.ref, n: 1, t: t.now }];
    const vb1 = SIM.stadaVal(t, b);
    return [
      [`utan kö saknas ingen disk (${brist0}); med fyra framme i kön vid en disk saknas en till (${brist})`, brist0 === 0 && brist > 0 && rum?.hus === f.hus],
      [`ägaren och den anställda betjänar vid var sin disk (${b1.spot.x.toFixed(1)},${b1.spot.y.toFixed(1)} och ${b2 ? `${b2.spot.x.toFixed(1)},${b2.spot.y.toFixed(1)}` : 'ingen'})`, tva],
      [`ingen tredje får en disk (${b3 ? 'fick' : 'ingen'})`, !b3],
      [`i det stora smutsiga rummet hjälper en andra till med en annan ruta (${vb ? `${vb.sc.toFixed(2)} mot ${va.sc.toFixed(2)}` : 'ingen'})`, !!vb && vb.rum === stort && vb.i !== ua.ref && vb.sc >= va.sc * 0.5],
      [`den sista rutan torkar bara en (${vb1 && vb1.rum === stort ? 'två' : 'en'})`, !vb1 || vb1.rum !== stort],
    ];
  },
};

SCENARIER.affartak = {
  text: 'Steg 15.1.155: inga tak i företagen. En affär med många varor i ett stort rum vill ha fler än tre varubord, och en rik gäst köper fler än fyra gånger när det lockar',
  kor: () => {
    const { s, p, f, r, disk } = foretagBy(['affar']), W = SIM.W;
    for (const q of s.people) q.task = undefined;
    for (const m of SIM.FOOD) SIM.setAmount(s, m, 0);
    // fyra varubord i rummet, där det får plats
    const fritt = (j: number) => r.tiles.includes(j) && !SIM.stationerOf(s).some(t => { const { w, h } = SIM.storlekAv(t); return j % W >= t.x && j % W < t.x + w && Math.floor(j / W) >= t.y && Math.floor(j / W) < t.y + h; }) && Math.hypot(j % W - disk.x, Math.floor(j / W) - disk.y) > 2;
    const bord: SIM.Station[] = [];
    for (const j of r.tiles) { if (bord.length >= 4) break; if (fritt(j) && fritt(j + 1) && Math.floor((j + 1) / W) === Math.floor(j / W)) { const t = { id: s.nextStation = (s.nextStation ?? 0) + 1, k: 'varubord', x: j % W, y: Math.floor(j / W), kvar: 0, inne: 1 } as unknown as SIM.Station; s.stationer!.push(t); bord.push(t); } }
    SIM.touch(s);
    // ägaren har många sorters saker: en hög av varje på varje ruta, och mer i förrådet
    const sorter = ['rep', 'lader', 'skinn', 'ben', 'ull', 'lin', 'benlim', 'virke'].filter(k => SIM.SAKER[k]);
    let i = 0;
    for (const t of bord) for (const d of [0, 1]) { const k = sorter[i++ % sorter.length]; SIM.stacksOf(s).push({ k, n: 2, c: 1, x: t.x + d, y: t.y, ag: { [p.id]: 2 } } as never); }
    for (const k of sorter) SIM.laggIn(s, k, 30, p.id);
    SIM.changed(s);
    for (const q of SIM.living(s)) { q.bruk = undefined; SIM.saknarNu(s, q); }
    const n = SIM.stationerOf(s).filter(t => t.k === 'varubord').length, brist = SIM.foretagBord.varuBrist(s), vill = SIM.foretagBord.varuRum(s);
    // en rik gäst från grannbyn
    const k = SIM.klanerOf(s).find(q => q.rad !== undefined)!, rad = s.varld!.rader!.find(q => q.nr === k.rad)!;
    k.inst = 20; rad.tal.silver = 2000; rad.egen = { ...rad.egen, ...Object.fromEntries(sorter.map(q => [q, 3])) }; // hemma är sakerna värda mycket: de lockar
    const g = SIM.nyForetagsgast(s, f, k, 'rik')!; g.gast!.silver = 400; g.gast!.varor = {}; // med silver och utan last, så att hen orkar bära det hen köper
    const o = SIM.koPlats(s, disk); g.x = o.x; g.y = o.y;
    f.pris = { affar: 0.5 }; // (ett lågt pris, så att köpet inte hänger på vad gästen råkar ha att betala med)
    let kop = 0;
    for (let v = 0; v < 12; v++) {
      for (let j = 0; j < 5 && g.gast!.gor !== 'ko' && g.gast!.fas === 'pratar'; j++) SIM.foretagsgastSteg(s, 1);
      if (g.gast!.gor !== 'ko') { for (let j = 0; j < 5 && g.gast!.fas === 'kommer'; j++) SIM.foretagsgastSteg(s, 1); if (g.gast!.gor !== 'ko') { SIM.foretagsgastSteg(s, 1); if (g.gast!.gor !== 'ko') break; } }
      const ro = f.ko?.find(q => q.p === g.id);
      if (!ro) break;
      p.task = { act: 'betjana', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '', ref: f.id };
      SIM.betjanaKlar(s, p, p.task); p.task = undefined; kop = g.gast!.gjort ?? 0;
    }
    return [
      [`affären har ${n} varubord och vill ha fler när ägaren har mer att sälja (brist ${brist}, rummet ${vill ? 'finns' : 'saknas'})`, n === 4 && brist > 0 && vill?.hus === f.hus],
      [`den rika gästen köpte fler än fyra gånger (${kop}, köpt ${JSON.stringify(g.gast!.kop ?? {})})`, kop > 4],
    ];
  },
};

SCENARIER.marknadvinst = {
  text: 'Steg 15.1.156: marknaden följer vinsten. En by med två vuxna och mycket att byta håller marknad; en stor by utan något att byta gör det inte, och lusten att gå dit har inget tak',
  kor: () => {
    // två vuxna: den ena har benspadar över, och den andra saknar en
    const s = SIM.cloneState(testBy(25)), folk = SIM.living(s).filter(q => !q.gast && SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen && SIM.kanGa(q));
    const a = folk[0], b = folk.find(q => q !== a && !SIM.familjOf(s, a.id).includes(q))!;
    s.people = s.people.filter(q => q === a || q === b); s.marknad = undefined; s.foretag = [];
    b.habit = { samla: 1000 } as never; a.habit = { vakt: 1000 } as never;
    for (const q of [a, b]) { q.task = undefined; q.bruk = undefined; }
    s.ting = s.ting!.filter(t => t.k !== 'benspade');
    for (let i = 0; i < 40; i++) SIM.addTool(s, 'benspade', a);
    const vuxna = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen).length;
    const lust = [...SIM.handelslust(s).values()].reduce((x, y) => x + y, 0);
    SIM.marknadDygn(s); const m = s.marknad as SIM.Marknad | undefined, liten = !!m;
    if (m) { s.now = m.t + SIM.HOUR; m.lust[b.id] = 30; } // en stor vinst för den som saknar
    const vikt = SIM.marknadVikt(s, b);
    // en stor by där ingen saknar något
    const t = SIM.cloneState(testBy(25)); t.marknad = undefined; t.foretag = [];
    const stora = SIM.living(t).filter(q => !q.gast && SIM.ageOf(q, t.now) >= SIM.ALDER.vuxen).length;
    for (const q of SIM.living(t)) q.bruk = { t: Math.floor(t.now / SIM.HOUR), k: [] };
    SIM.marknadDygn(t); const stor = !!t.marknad;
    return [
      [`byn med ${vuxna} vuxna och mycket att byta (lust ${lust.toFixed(0)}) håller marknad`, vuxna === 2 && liten],
      [`lusten att gå dit följer vinsten utan tak (${vikt.toFixed(2)} för en vinst på 30 silver)`, Math.abs(vikt - 30 * SIM.MARKNAD.vikt) < 1e-9 && vikt > 2],
      [`den stora byn (${stora} vuxna) utan något att byta håller ingen`, stora >= 5 && !stor],
    ];
  },
};

SCENARIER.lonrest = {
  text: 'Steg 15.1.157: lönen avrundas uppåt. En lön som är värd två och en halv sak betalas med tre hela saker och räknas som betald',
  kor: () => {
    const s = SIM.createState(6, START), [q, p] = SIM.living(s).filter(x => SIM.ageOf(x, s.now) >= SIM.ALDER.vuxen);
    SIM.setAmount(s, 'silver', 0);
    // q har inget silver, bara en sorts sak över: en hel lön är två och en halv av dem
    const k = ['skinn', 'rep', 'ben', 'virke'].find(x => SIM.grundvarde(x) > 0.5)!, v = SIM.grundvarde(k), lon = Math.round(2.5 * v);
    for (const t of SIM.tingOf(s)) if (t.agare === q.id) t.agare = -1;
    SIM.laggIn(s, k, 40, q.id);
    s.anst = [{ av: q.id, arb: 'vard', p: p.id, lon, tim: 2, verk: 2, t: s.now }];
    const fore = SIM.ownsId(s, p.id, k), qFore = SIM.ownsId(s, q.id, k);
    SIM.lonDygn(s);
    const fick = SIM.ownsId(s, p.id, k) - fore, gav = qFore - SIM.ownsId(s, q.id, k);
    return [
      [`lönen ${lon} silver är ${(lon / v).toFixed(2)} ${k} (${v.toFixed(2)} var)`, lon / v > 2 && lon / v < 3],
      [`den anställda fick ${fick} hela, och den som betalade gav ${gav}`, fick === Math.ceil(lon / v - 1e-9) && Number.isInteger(fick) && gav === fick],
      [`lönen räknas som betald (${p.lonObetald ?? 'betald'})`, p.lonObetald === undefined && (s.stat?.lonBetald ?? 0) >= 1 && !p.thoughts.some(t => t.k === 'lonObetald')],
    ];
  },
};
