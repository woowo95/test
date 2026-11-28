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
