// Scenarier för system 12.4: möblerna och sakerna i hemmet (drejskivan, oljelampan, sängen, stolen, vaggan, tunnan, osten,
// brunnen, utedasset, sjukstugan, fyrfatet, tvålen, yllet och fjäderpennan).
import * as SIM from '../../sim';
import { SCENARIER, klockan, medBank, medHus, nyInvanare } from './hjalp';
import { START } from '../kor';

const vuxen = (s: SIM.State) => SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;

SCENARIER.drejskiva = {
  text: 'Drejskivan (steg 12.4.1): en station inne av 2 virke och 1 huggen sten på 15 minuter, tekniken Drejskiva; lerkrukorna formas dubbelt så fort där och oftare bra, och går fortfarande att göra för hand',
  kor: () => {
    const d = SIM.stationDef('drejskiva')!, tek = SIM.TEKNIK.find(t => t.id === 'drejskiva'), R = SIM.RECEPT;
    const s = SIM.createState(1, START), p = vuxen(s);
    klockan(s, 10);
    const handFart = SIM.fartVid(s, p, 'lerkruka'), handKv = SIM.kvVid(s, p, 'lerkruka');
    const t = medBank(s, 'drejskiva'), vid = SIM.vidStation(t);
    const spot = SIM.spotFor(s, 'lerkruka', p), tillDrej = Math.hypot(spot.x - vid.x, spot.y - vid.y) < 1;
    p.x = vid.x; p.y = vid.y;
    const fart = SIM.fartVid(s, p, 'lerkruka'), kv = SIM.kvVid(s, p, 'lerkruka');
    const krukor = ['lerkruka_liten', 'lerkruka_mellan', 'lerkruka_stor'] as const;
    return [
      [`drejskivan står inne, ${d.w} × ${d.h}, av ${JSON.stringify(d.av)} på ${d.min} minuter`, !!d.inne && d.av.virke === 2 && d.av.huggen_sten === 1 && d.min === 15 && !d.bara?.length],
      [`tekniken ${tek?.namn} kräver ${tek?.krav} och prövas fram vid ${tek?.forsok?.vid}`, !!tek && tek.krav.includes('kruka') && tek.krav.includes('stenhuggarplats') && !!tek.forsok?.vid.includes('flatarbank')],
      [`krukorna i tre storlekar görs fortare och bättre vid drejskivan (receptens bank)`, krukor.every(k => (R[k] as SIM.ReceptRad).bank === 'drejskiva' && !(R[k] as SIM.ReceptRad).bara)],
      [`för hand: fart ${handFart} och kvalitet +${handKv}`, handFart === 1 && handKv === 0],
      [`vid drejskivan: fart ${fart} och kvalitet +${kv}`, fart === 2 && kv === SIM.STATION.kvMer],
      [`den som formar en kruka går till drejskivan`, tillDrej],
    ];
  },
};

SCENARIER.oljelampa = {
  text: 'Oljelampan av lera (steg 12.4.2): en liten lampa (1 lera, 3 minuter, tekniken Oljelampa) som torkar och bränns som krukan, är en behållare för brännoljan, står på bord och hyllor som talgljuset, brinner 12 timmar på 1 brännolja och blir kvar när oljan är slut; att fylla på den tar 1 minut',
  kor: () => {
    const R = SIM.RECEPT.oljelampa as SIM.ReceptRad, tek = SIM.TEKNIK.find(t => t.id === 'oljelampa'), V = SIM.VATSKOR.brannolja;
    const s = SIM.createState(1, START), p = vuxen(s);
    klockan(s, 10);
    // formas av lera: torkar och bränns som krukan
    SIM.setStock(s, { lera: 2 }); (p.tek ??= {}).oljelampa = 1;
    SIM.makeTool(s, p, 'oljelampa');
    const lampa = SIM.tingOf(s).find(t => t.k === 'oljelampa'), ra = lampa?.ler !== undefined;
    const ingenLjus = !SIM.friLjus(s);
    if (lampa) lampa.ler = undefined;
    // brännoljan kokas i en ledig behållare: lampan först
    const tom = SIM.friLjus(s) === undefined, kar = SIM.ledigFor(s, 'brannolja');
    SIM.fyllVatska(s, 'brannolja', 1, kar);
    const fylld = lampa?.inne?.v === 'brannolja' && SIM.friLjus(s) === lampa;
    // ställs på ett bord inne och lyser
    const bord = medBank(s, 'bord');
    const tk = { act: 'ljus', phase: 'do', tx: bord.x + 0.5, ty: bord.y + 0.5, until: s.now, carry: 0, why: '', ref: bord.id } as SIM.Task;
    SIM.finishLjus(s, p, tk);
    const l = s.ljus?.find(q => q.st === bord.id), paBordet = l?.k === 'oljelampa' && l.c === 1 && !SIM.tingOf(s).includes(lampa!);
    l!.tand = true; l!.tandT = s.now;
    s.now += 11 * SIM.HOUR; SIM.facklorTimme(s);
    const efter11 = s.ljus?.find(q => q.st === bord.id)?.c ?? -1;
    l!.tand = true; l!.tandT = s.now; s.now += 2 * SIM.HOUR; SIM.facklorTimme(s);
    const kvar = s.ljus?.find(q => q.st === bord.id), tomKvar = !!kvar && kvar.c === 0 && !kvar.tand;
    // påfyllningen med en brännolja ur en liten kruka
    const kruka = SIM.addTool(s, 'lerkruka_liten', p); SIM.fyllVatska(s, 'brannolja', 2, kruka);
    SIM.fyllLampa(s, p, { ...tk, act: 'fyll_lampa' } as SIM.Task);
    const paFylld = kvar?.c === 1 && kruka.inne?.n === 1;
    return [
      [`oljelampan görs av ${JSON.stringify(R.av)} på ${R.min} minuter med tekniken ${tek?.namn} (kräver ${tek?.krav}), fortare på drejskivan`, R.av?.lera === 1 && R.min === 3 && R.bank === 'drejskiva' && !!tek && tek.krav.includes('kruka') && tek.krav.includes('ortkok') && SIM.stationDef('drejskiva')!.gor.includes('oljelampa' as SIM.Act)],
      [`den nyformade lampan torkar och bränns först, och en tom lampa ställs inte fram`, ra && ingenLjus && tom],
      [`brännoljan är en vätska i lampan eller en liten kruka, och hälls i lampan först (${kar?.k})`, V.i.includes('oljelampa') && V.i.includes('lerkruka_liten') && kar === lampa && fylld],
      [`lampan ställs på bordet med sin olja`, paBordet],
      [`den brinner 12 timmar på en brännolja (kvar efter 11: ${efter11.toFixed(2)})`, efter11 > 0.05 && efter11 < 0.1 && SIM.LJUSSORTER.oljelampa.brinnTim === 12],
      [`när oljan är slut blir lampan kvar, tom och släckt`, tomKvar],
      [`att fylla på den tar ${SIM.LJUS.fyllMin} minut och en brännolja`, paFylld && SIM.LJUS.fyllMin === 1],
    ];
  },
};

SCENARIER.sang = {
  text: 'Sängen (steg 12.4.3, mobler.ts): en säng av 3 plankor och 2 ull (18 minuter, tekniken Säng) som vilar 0,13 per timme mot halmbäddens 0,105 och ger tanken Sov gott i sängen; skinnfällen passar i den, en familj med något över byter halmbädden mot den (Hemmen blir finare), och ett par vars sängar står intill varandra får tanken Sov bredvid sin käresta',
  kor: () => {
    const d = SIM.stationDef('sang')!, tek = SIM.TEKNIK.find(t => t.id === 'sang');
    const s = SIM.createState(1, START), [p, q] = SIM.living(s).filter(x => SIM.ageOf(x, s.now) >= SIM.ALDER.vuxen);
    klockan(s, 23);
    // två halmbäddar intill varandra, och en skinnfäll i den ena
    const a = medBank(s, 'halmbadd'), b0 = medBank(s, 'halmbadd'); b0.x = a.x; b0.y = a.y + 1; b0.rot = a.rot; SIM.touch(s);
    a.ag = p.id; b0.ag = q.id; a.med = ['skinnfall'] as typeof a.med;
    // ingen har något över: ingen säng
    const utanOver = SIM.finareBrist(s, 'sang');
    // p blir rik: en hög silver som är hens
    for (const x of SIM.living(s)) SIM.put(s, 'silver', 10, { [x.id]: 10 });
    SIM.put(s, 'silver', 200, { [p.id]: 200 });
    const medOver = SIM.finareBrist(s, 'sang'), site = SIM.stationSite(s, 'sang', p), paBadden = !!site && site.x === a.x && site.y === a.y;
    // bygget börjar: halmbädden tas isär och sängen får dess ägare och skinnfäll
    const ny: SIM.Station = { id: (s.nextStation = (s.nextStation ?? 0) + 1), k: 'sang', x: a.x, y: a.y, kvar: 0, inne: 1 };
    SIM.ersatt(s, a, ny); (s.stationer ??= []).push(ny); SIM.touch(s);
    const bytt = !SIM.stationerOf(s).includes(a) && ny.ag === p.id && (ny.med as string[] | undefined)?.includes('skinnfall') && SIM.tillbehorStationer(s, 'skinnfall').includes(ny);
    // vilan i sängen och i halmbädden
    p.x = ny.x + 0.5; p.y = ny.y + 0.5; q.x = b0.x + 0.5; q.y = b0.y + 0.5;
    const vSang = SIM.baddVila(s, p), vHalm = SIM.baddVila(s, q);
    // käresta i sängen intill
    p.partner = q.id; q.partner = p.id;
    p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: s.now + SIM.HOUR, carry: 0, why: '' } as SIM.Task;
    q.task = { ...p.task, tx: q.x, ty: q.y };
    SIM.bredvidKaresta(s, p); const halmBredvid = p.thoughts.some(t => t.text === 'Sov bredvid sin käresta');
    const b: SIM.Station = { ...b0, k: 'sang' }; s.stationer = SIM.stationerOf(s).map(t => t === b0 ? b : t); SIM.touch(s);
    SIM.bredvidKaresta(s, p); const sangBredvid = p.thoughts.find(t => t.text === 'Sov bredvid sin käresta');
    return [
      [`sängen står inne, ${d.w} × ${d.h}, av ${JSON.stringify(d.av)} på ${d.min} minuter med tekniken ${tek?.namn} (kräver ${tek?.krav})`, !!d.inne && !!d.sover && d.av.plankor === 3 && d.av.ull === 2 && d.min === 18 && !!tek && tek.krav.includes('halmbadd') && tek.krav.includes('snickarbank')],
      [`sängen vilar ${vSang?.tim} per timme med tanken ${vSang?.tanke} (${vSang?.glad}); halmbädden har egna tal i KROPP (${vHalm === undefined})`, vSang?.tim === 0.13 && vSang.glad === 0.11 && vHalm === undefined && SIM.KROPP.restBadd === 0.105],
      [`utan något över byts ingen halmbädd (${utanOver}), med något över byts p:s egen (${medOver.toFixed(2)})`, utanOver === 0 && medOver > 0 && paBadden],
      [`när bygget börjar tas halmbädden isär, och sängen får ägaren och skinnfällen`, !!bytt],
      [`ett par i en säng och en halmbädd intill får ingen tanke, i två sängar intill varandra tanken Sov bredvid sin käresta (${sangBredvid?.v})`, !halmBredvid && sangBredvid?.v === 0.03 && sangBredvid.until === s.now + 8 * SIM.HOUR],
    ];
  },
};

SCENARIER.stol = {
  text: 'Pallen och stolen (steg 12.4.4, mobler.ts): sittplatserna vid bordet har tre nivåer, stubben, pallen (1 planka, 5 minuter) och stolen (2 plankor, 1 skinn och 1 ull, 12 minuter, tekniken Stol), båda bara vid snickarbänken; en familj med något över ställer dem vid borden hemma, och den som sitter bättre vilar mer, får en bättre tanke av måltiden och väljer den bästa lediga platsen',
  kor: () => {
    const R = SIM.RECEPT, tek = SIM.TEKNIK.find(t => t.id === 'stol'), sn = SIM.stationDef('snickarbank')!;
    const s = SIM.createState(1, START), [p, q] = SIM.living(s).filter(x => SIM.ageOf(x, s.now) >= SIM.ALDER.vuxen);
    klockan(s, 12);
    const hus = medHus(s), bord = medBank(s, 'bord');
    if (hus) { bord.x = hus.x + 2; bord.y = hus.y + 2; bord.inne = 1; bord.rot = undefined; SIM.touch(s); }
    const r = SIM.roomAt(s, bord.x, bord.y), h = r && SIM.husById(s, r.hus);
    if (!h) return [['ett bord inne i ett hus', false]];
    h.ag = p.id;
    for (const x of SIM.living(s)) SIM.put(s, 'silver', 10, { [x.id]: 10 });
    const fattig = SIM.sateMal(s);
    SIM.put(s, 'silver', 200, { [p.id]: 200 });
    (p.tek ??= {}).snickarbank = 1;
    const pallMal = SIM.sateMal(s);
    p.tek.stol = 1;
    const stolMal = SIM.sateMal(s), platser = SIM.bordPlatser(bord).length;
    // en ledig stol ställs vid bordet
    const stol = SIM.addTool(s, 'stol', p), v = SIM.sattaPlats(s);
    const tk = { act: 'satta', phase: 'do', tx: (v?.x ?? 0) + 0.5, ty: (v?.y ?? 0) + 0.5, until: s.now, carry: 0, why: '', ref: v?.t.id } as SIM.Task;
    SIM.sattaKlar(s, p, tk);
    const stalld = !!v && bord.sate?.[v.i] === 'stol' && !SIM.tingOf(s).includes(stol) && SIM.sateMal(s) === stolMal - 1;
    // den som sitter på stolen och äter
    p.x = tk.tx; p.y = tk.ty; p.task = { ...tk, act: 'maltid' };
    const glad = SIM.sittGlad(s, p), vila = SIM.sittVila(s, p);
    const pl = SIM.bordPlatser(bord), stubbe = pl.findIndex((_, i) => i !== v?.i);
    p.x = pl[stubbe].x + 0.5; p.y = pl[stubbe].y + 0.5; const pa = SIM.sittGlad(s, p);
    // den som ska sätta sig väljer stolen fast en stubbe ligger närmare
    q.x = pl[stubbe].x + 0.5; q.y = pl[stubbe].y + 0.5; p.task = undefined;
    const val = SIM.ledigPlats(s, q), valdeStol = !!val && Math.floor(val.x) === v?.x && Math.floor(val.y) === v?.y;
    return [
      [`pallen av ${JSON.stringify(R.pall.av)} på ${R.pall.min} minuter och stolen av ${JSON.stringify(R.stol.av)} på ${R.stol.min} minuter görs bara vid snickarbänken`, R.pall.av.plankor === 1 && R.pall.min === 5 && R.stol.av.plankor === 2 && R.stol.av.skinn === 1 && R.stol.av.ull === 1 && R.stol.min === 12 && sn.gor.includes('sate' as SIM.Act) && !!sn.bara?.includes('sate' as SIM.Act)],
      [`tekniken ${tek?.namn} kräver ${tek?.krav}`, !!tek && tek.krav.join() === 'snickarbank'],
      [`utan något över vill familjen inga (${fattig}); med något över pallar till platserna (${pallMal} av ${platser}) och stolar när någon kan Stol (${stolMal})`, fattig === 0 && pallMal === platser && stolMal === platser],
      [`stolen ställs på en plats vid bordet`, stalld],
      [`på stolen är måltiden bättre (${glad.toFixed(2)} mot ${pa.toFixed(2)} på stubben) och vilan större (${vila.toFixed(3)} per timme)`, glad > pa && pa === 1 && vila > 0],
      [`den som ska sätta sig väljer stolen fast stubben är närmare`, valdeStol],
    ];
  },
};

SCENARIER.vagga = {
  text: 'Vaggan (steg 12.4.5, mobler.ts): en vagga av 2 plankor och 1 ull (10 minuter, med tekniken Säng) där spädbarnet sover i stället för hos föräldern och sover bättre; ett hem med ett spädbarn vill ha en vagga i rummet där det sover',
  kor: () => {
    const d = SIM.stationDef('vagga')!;
    const s = SIM.createState(1, START), mor = SIM.living(s).find(x => x.sex === 'k' && SIM.ageOf(x, s.now) >= SIM.ALDER.vuxen)!;
    klockan(s, 22);
    const hus = medHus(s);
    if (!hus) return [['ett hus', false]];
    const barn = nyInvanare(s, 'm', 1); barn.mother = mor.id;
    SIM.touch(s);
    const morPlats = SIM.sovPlats(s, mor), hosMor = SIM.sovPlats(s, barn) === morPlats && morPlats !== undefined;
    const brist = SIM.stationBrist(s, 'vagga'), rum = SIM.vaggaRum(s), site = SIM.stationSite(s, 'vagga', mor);
    const iRummet = !!site && !!rum && SIM.roomAt(s, site.x, site.y) === rum && rum === SIM.roomAt(s, morPlats! % SIM.W, Math.floor(morPlats! / SIM.W));
    if (!site) return [['en plats för vaggan', false]];
    const v: SIM.Station = { id: (s.nextStation = (s.nextStation ?? 0) + 1), k: 'vagga', x: site.x, y: site.y, kvar: 0, inne: 1 };
    (s.stationer ??= []).push(v); SIM.touch(s);
    const iVaggan = SIM.sovPlats(s, barn) === v.y * SIM.W + v.x, bristEfter = SIM.stationBrist(s, 'vagga');
    barn.x = v.x + 0.5; barn.y = v.y + 0.5;
    const vila = SIM.baddVila(s, barn), vuxenPlats = SIM.sovPlats(s, mor) !== v.y * SIM.W + v.x;
    return [
      [`vaggan står inne, av ${JSON.stringify(d.av)} på ${d.min} minuter, med tekniken ${d.tek}`, !!d.inne && d.av.plankor === 2 && d.av.ull === 1 && d.min === 10 && d.tek.join() === 'sang' && !d.sover],
      [`utan vagga sover spädbarnet hos modern, och hemmet vill ha en vagga (${brist}) i rummet där de sover`, hosMor && brist === 1 && iRummet],
      [`med en vagga sover spädbarnet i den, och ingen vuxen sover där`, iVaggan && vuxenPlats && bristEfter === 0],
      [`i vaggan sover barnet bättre (${vila?.tim} per timme, tanken ${vila?.tanke})`, vila?.tim === SIM.STATION.vaggaVila && vila.tim > SIM.KROPP.restBadd],
    ];
  },
};

SCENARIER.tunna = {
  text: 'Tunnan (steg 12.4.6, tunna.ts): ett laggat kärl från snickarbänken (3 plankor och 1 rep, 5 minuter, tekniken Laggkärl) som rymmer 20 delar vin, mjöd, öl, svagdricka eller vatten; vinet når den högsta kvaliteten i tunnan efter 25 dygn och stannar ett steg under i krukan, mjödet mognar bara i tunnan, en mognare dryck ger en bättre tanke och ett högre värde, och en tunna ute fylls av regnet',
  kor: () => {
    const R = SIM.RECEPT.tunna as SIM.ReceptRad, tek = SIM.TEKNIK.find(t => t.id === 'laggkar');
    const s = SIM.createState(1, START), p = vuxen(s);
    klockan(s, 12);
    const tunna = SIM.addTool(s, 'tunna', p), kruka = SIM.addTool(s, 'lerkruka_stor', p); tunna.hos = kruka.hos = undefined;
    const forst = SIM.ledigFor(s, 'vin') === tunna;
    SIM.fyllVatska(s, 'vin', 25, tunna); SIM.fyllVatska(s, 'vin', 25, kruka);
    const rymmer = tunna.inne?.n === 20 && kruka.inne?.n === 10;
    const v0 = SIM.tingVarde(tunna);
    s.now += 16 * SIM.DAY; SIM.mognadSteg(s);
    const t16 = tunna.inne?.q, k16 = kruka.inne?.q;
    s.now += 10 * SIM.DAY; SIM.mognadSteg(s);
    const t26 = tunna.inne?.q, k26 = kruka.inne?.q, v26 = SIM.tingVarde(tunna);
    // mjödet mognar bara i tunnan
    const t2 = SIM.addTool(s, 'tunna', p), k2 = SIM.addTool(s, 'lerkruka_stor', p);
    SIM.fyllVatska(s, 'mjod', 5, t2); SIM.fyllVatska(s, 'mjod', 5, k2);
    s.now += 16 * SIM.DAY; SIM.mognadSteg(s);
    const mjodT = t2.inne?.q, mjodK = k2.inne?.q ?? 2;
    // tanken av att dricka ett mognat vin mot ett ungt
    const ung = SIM.cloneState(s), pu = SIM.living(ung).find(q => q.id === p.id)!;
    for (const t of SIM.tingOf(ung)) if (t.inne?.v === 'vin') t.inne.q = 2;
    SIM.drickAlkohol(s, p, 'vin'); SIM.drickAlkohol(ung, pu, 'vin');
    const glad = p.thoughts.find(t => t.text === 'Drack vin')?.v ?? 0, gladUng = pu.thoughts.find(t => t.text === 'Drack vin')?.v ?? 0;
    // regnet fyller en tom tunna som står ute
    const t3 = SIM.addTool(s, 'tunna', p), c = SIM.bynsMitt(s); t3.hos = undefined; t3.x = c.x + 6; t3.y = c.y + 6;
    for (let i = 0; i < 24 * 60 && !(SIM.vaderNu(s).nb > 0.3 && !SIM.vaderNu(s).sno); i++) s.now += SIM.HOUR; // en tid då det regnar
    const ute = !SIM.roofed(s, t3.x, t3.y);
    for (let i = 0; i < 6; i++) SIM.tunnaRegn(s, 600);
    const regn = t3.inne?.v === 'vatten' ? t3.inne.n : 0;
    return [
      [`tunnan görs av ${JSON.stringify(R.av)} på ${R.min} minuter bara vid snickarbänken, med tekniken ${tek?.namn} (kräver ${tek?.krav})`, R.av?.plankor === 3 && R.av?.rep === 1 && R.min === 5 && R.bank === 'snickarbank' && !!R.bara && !!tek && tek.krav.includes('snickarbank') && tek.krav.includes('bryggkar')],
      [`vinet hälls i tunnan först, och den rymmer 20 delar`, forst && rymmer && ['vin', 'mjod', 'ol', 'svagdricka', 'vatten'].every(v => (SIM.VATSKOR[v as SIM.VatskaId].i as string[]).includes('tunna'))],
      [`vinet efter 16 dygn: ${t16} i tunnan och ${k16} i krukan; efter 26: ${t26} och ${k26}`, t16 === 4 && k16 === 4 && t26 === 5 && k26 === 4],
      [`mjödet efter 16 dygn: ${mjodT} i tunnan och ${mjodK} i krukan`, mjodT === 4 && mjodK === 2],
      [`ett mognat vin ger en bättre tanke (${glad.toFixed(3)} mot ${gladUng.toFixed(3)}) och ett högre värde (${v0.toFixed(1)} → ${v26.toFixed(1)})`, glad > gladUng && v26 > v0],
      [`regnet fyller en tom tunna ute (${regn} vatten på en timme)`, ute && regn >= 1],
    ];
  },
};

SCENARIER.ost = {
  text: 'Osten (steg 12.4.7): 4 mjölk ystas i en mellanstor lerkruka vid elden till 1 ost (4 minuters arbete och 15 minuter på elden, tekniken Ost, som öppnas när byn har haft mjölk); osten håller så länge något får hålla i lagret (20 dygn), mättar som torkat kött och fyller protein och fett, och byn ystar den mjölk som annars skulle surna',
  kor: () => {
    const d = SIM.TILLVERKA.ysta, ost = SIM.SAKER.ost!, tek = SIM.TEKNIK.find(t => t.id === 'ost')!;
    const s = SIM.createState(1, START), p = vuxen(s);
    klockan(s, 12);
    const stangd = !SIM.oppen(s, tek);
    const kruka = SIM.addTool(s, 'lerkruka_mellan', p); kruka.hos = undefined;
    SIM.fyllVatska(s, 'mjolk', 4, kruka);
    const farsk = SIM.tillverkVill(s, d);
    s.now += 14 * SIM.HOUR;
    const gammal = SIM.tillverkVill(s, d);
    (s.stat ??= {}).mjolkHaft = 1; const oppen = SIM.oppen(s, tek);
    (p.tek ??= {}).ost = 1; (p.tek ??= {}).kruka = 1;
    s.fire.lit = true; s.fire.fuel = 4;
    const kan = SIM.PROJEKT.ysta.kan(s, p, { kyla: false } as unknown as SIM.ProjektFara);
    p.task = { act: 'ysta', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '' } as SIM.Task;
    SIM.KLAR_FOR.ysta!(s, p, p.task, 0);
    const sjuder = kruka.kok?.r === 'ost' && !kruka.inne && SIM.vatskaAv(s, 'mjolk') === 0;
    const fore = SIM.amountOf(s, 'ost');
    SIM.stepKok(s, 16 * 60);
    const efter = SIM.amountOf(s, 'ost'), tom = !kruka.kok && !kruka.inne;
    return [
      [`4 mjölk i en mellanstor lerkruka vid elden, ${d.min} minuters arbete och ${d.sjud} minuter på elden`, d.vatska?.v === 'mjolk' && d.vatska.n === 4 && d.kruka === 'lerkruka_mellan' && d.min === 4 && d.sjud === 15 && !!d.eld],
      [`osten håller ${ost.haller} dygn, mättar ${ost.mat} som torkat kött (${SIM.SAKER.torrkott!.mat}) och fyller protein och fett`, ost.haller === SIM.LAGER.maxDygn && ost.mat === SIM.SAKER.torrkott!.mat && (ost.naring?.protein ?? 0) >= 2 && (ost.naring?.fett ?? 0) >= 2 && SIM.INGREDIENSER.ost.grupper.join() === 'protein,fett'],
      [`tekniken ${tek.namn} kräver ${tek.krav} och är stängd tills byn haft mjölk (${stangd} → ${oppen})`, tek.krav.join() === 'kruka' && stangd && oppen],
      [`byn vill ysta den mjölk som annars skulle surna (färsk ${farsk}, efter 14 timmar ${gammal})`, farsk === 0 && gammal === 1 && kan],
      [`mjölken sjuder i krukan och blir en ost i förrådet, och krukan blir ledig`, sjuder && efter === fore + 1 && tom],
    ];
  },
};

SCENARIER.brunn = {
  text: 'Den stensatta brunnen (steg 12.4.8, torst.ts): en brunn i byn (6 huggen sten, 1 virke och 1 rep, spaden krävs, 20 minuter, tekniken Brunn) där man dricker och hämtar vatten; vattnet är rent, fryser inte och sinar inte i torkan, men en latrin för nära smutsar det',
  kor: () => {
    const d = SIM.stationDef('brunn')!, tek = SIM.TEKNIK.find(t => t.id === 'brunn');
    const s = SIM.createState(1, START), p = vuxen(s);
    klockan(s, 12);
    const fore = SIM.drickPlats(s, p);
    const t = medBank(s, 'brunn'), at = SIM.vidStation(t);
    p.x = at.x + 0.3; p.y = at.y; p.task = undefined;
    const plats = SIM.drickPlats(s, p), dricker = !!plats && SIM.vidBrunn(s, plats.x, plats.y);
    const i = Math.floor(at.y) * SIM.W + Math.floor(at.x), ren = SIM.vattenSmuts(s, i);
    // isen ligger: utan något att hugga hål med dricker man vid brunnen, utan hål och utan att smälta snö
    s.is = { ...(s.is ?? {}), cm: 40 } as typeof s.is;
    const naIs = SIM.naVattnet(s, p), val = SIM.drickVal(s, p);
    p.task = { act: 'dricka', phase: 'do', tx: at.x, ty: at.y, until: s.now, carry: 0, why: '' } as SIM.Task;
    const min = SIM.drickMin(s, p, 'dricka');
    s.is = { ...(s.is ?? {}), cm: 0 } as typeof s.is; p.task = undefined;
    // en latrin intill smutsar brunnen
    const l: SIM.Station = { id: (s.nextStation = (s.nextStation ?? 0) + 1), k: 'latrin', x: t.x + 1, y: t.y, kvar: 0, fyllt: 0.8 };
    (s.stationer ??= []).push(l); SIM.touch(s);
    const smutsig = SIM.vattenSmuts(s, i);
    return [
      [`brunnen tar 1 ruta, av ${JSON.stringify(d.av)} på ${d.min} minuter med ${d.verktyg}, tekniken ${tek?.namn} (kräver ${tek?.krav})`, d.w === 1 && d.h === 1 && d.av.huggen_sten === 6 && d.av.virke === 1 && d.av.rep === 1 && d.min === 20 && d.verktyg === 'benspade' && !!tek && tek.krav.includes('benspade') && tek.krav.includes('stenhuggarplats')],
      [`den som står vid brunnen dricker där (förut vid stranden: ${!!fore})`, dricker],
      [`vattnet i brunnen är rent från början (${ren.toFixed(2)})`, ren === 0],
      [`under isen når man vattnet vid brunnen, utan hål i isen (${min} minuter) och utan att smälta snö (${val?.act})`, naIs && val?.act === 'dricka' && !!val.spot && SIM.vidBrunn(s, val.spot.x, val.spot.y) && min === SIM.TORST.drickMin],
      [`en latrin intill smutsar brunnens vatten (${smutsig.toFixed(2)})`, smutsig > 0],
    ];
  },
};

SCENARIER.utedass = {
  text: 'Utedasset (steg 12.4.9, mobler.ts): en bättre latrin med väggar (4 plankor, spaden krävs, 15 minuter, tekniken Utedass); en latrin som grävts upp till kompost går inte att använda igen, men utedasset töms och står kvar, det smutsar mindre och står närmare husen, den som går dit håller sig torr, och byn bygger det i stället för latrinen när den har något över',
  kor: () => {
    const d = SIM.stationDef('utedass')!, l0 = SIM.stationDef('latrin')!, tek = SIM.TEKNIK.find(t => t.id === 'utedass');
    const s = SIM.createState(1, START), p = vuxen(s);
    klockan(s, 12);
    const ko = medBank(s, 'kompost'), lat = medBank(s, 'latrin'), dass = medBank(s, 'utedass');
    // vattnet bredvid: latrinen smutsar det mer än utedasset
    const runt = (t: SIM.Station) => SIM.toaVatten(s, (t.y + 1) * SIM.W + t.x);
    const smLat = runt(lat), smDass = runt(dass);
    // båda töms i komposten: latrinen försvinner, utedasset står kvar
    lat.fyllt = 1; dass.fyllt = 0.9;
    p.task = { act: 'tomma_latrin', phase: 'do', tx: 0, ty: 0, until: s.now, carry: 0, why: '', ref: lat.id } as SIM.Task; SIM.latrinTomKlar(s, p);
    p.task = { ...p.task, ref: dass.id }; SIM.latrinTomKlar(s, p);
    const latBorta = !SIM.stationerOf(s).includes(lat), dassKvar = SIM.stationerOf(s).includes(dass) && dass.fyllt === 0 && !!ko.kompost;
    // den som sitter i dasset
    p.x = dass.x + 0.5; p.y = dass.y + 0.5; p.task = { act: 'toa', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '' } as SIM.Task;
    const torr = SIM.iDass(s, p);
    // byn bygger utedasset när den har något över och har en latrin kvar
    const lat2 = medBank(s, 'latrin'); void lat2;
    const fattig = SIM.stationBrist(s, 'utedass');
    const hus = medHus(s); if (hus) hus.ag = p.id;
    for (const x of SIM.living(s)) SIM.put(s, 'silver', 10, { [x.id]: 10 });
    SIM.put(s, 'silver', 200, { [p.id]: 200 });
    const rik = SIM.stationBrist(s, 'utedass');
    return [
      [`utedasset tar 1 ruta, av ${JSON.stringify(d.av)} på ${d.min} minuter med ${d.verktyg}, tekniken ${tek?.namn} (kräver ${tek?.krav})`, d.av.plankor === 4 && d.min === 15 && d.verktyg === 'benspade' && !!tek && tek.krav.includes('latrin') && tek.krav.includes('klyvplats')],
      [`det står närmare byn än latrinen (högst ${d.utkant?.till} mot ${l0.utkant?.till} rutor)`, (d.utkant?.till ?? 99) < (l0.utkant?.till ?? 0) && (d.utkant?.avst ?? 99) < (l0.utkant?.avst ?? 0)],
      [`utedasset smutsar vattnet bredvid mindre (${smDass.toFixed(3)} mot ${smLat.toFixed(3)})`, smDass < smLat],
      [`en latrin som tömts i komposten är borta, utedasset töms och står kvar`, latBorta && dassKvar],
      [`den som går på toa i utedasset håller sig torr`, torr],
      [`byn bygger utedasset när den har något över (fattig ${fattig}, rik ${rik.toFixed(2)})`, fattig === 0 && rik > 0],
    ];
  },
};

SCENARIER.sjukstuga = {
  text: 'Sjukbädden och sjukstugan (steg 12.4.10, mobler.ts): en bädd inne (4 hö, 2 grenar och 1 skinn, 12 minuter, tekniken Sjukstuga) där den som är sjuk eller skadad hellre lägger sig och läker lite fortare; ett rum med en sjukbädd är en Sjukstuga, och en sjukbädd där andra sover är en krock i rummens taggar',
  kor: () => {
    const d = SIM.stationDef('sjukbadd')!, tek = SIM.TEKNIK.find(t => t.id === 'sjukstuga');
    const s = SIM.createState(1, START), [p, q] = SIM.living(s).filter(x => SIM.ageOf(x, s.now) >= SIM.ALDER.vuxen);
    klockan(s, 22);
    const utan = SIM.stationBrist(s, 'sjukbadd');
    const hus = medHus(s); if (!hus) return [['ett hus', false]];
    const t = medBank(s, 'sjukbadd'), i = t.y * SIM.W + t.x;
    const frisk = SIM.sovPlats(s, p) !== i;
    // p bryter benet
    (p.skador ??= []).push({ d: 'vanster_ben', k: 'benbrott', g: 0.5, b: 0 } as unknown as SIM.Skada); SIM.touch(s);
    const sjukLigger = SIM.sovPlats(s, p) === i, andra = SIM.sovPlats(s, q) !== i;
    // en liten skada ligger hemma, och den med störst behov av att läka får bädden (steg 12.1.235)
    (q.skador ??= []).push({ d: 'vanster_arm', k: 'skarsar', g: 0.2, b: 0 } as unknown as SIM.Skada); SIM.touch(s);
    const litenHemma = SIM.sovPlats(s, q) !== i && SIM.sovPlats(s, p) === i, bLiten = SIM.sjukBehov(s, q);
    q.skador!.push({ d: 'hoger_ben', k: 'benbrott', g: 1, b: 0 } as unknown as SIM.Skada); SIM.touch(s);
    const storstForst = SIM.sovPlats(s, q) === i && SIM.sovPlats(s, p) !== i, bStor = SIM.sjukBehov(s, q), bP = SIM.sjukBehov(s, p);
    q.skador = []; SIM.touch(s);
    p.x = t.x + 0.5; p.y = t.y + 0.5; p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: s.now + SIM.HOUR, carry: 0, why: '' } as SIM.Task;
    const lak = SIM.lakKrok.badd(s, p);
    const r = SIM.roomAt(s, t.x, t.y), taggar = r ? [...SIM.rumTaggar(s, r)] : [];
    const krock = r ? SIM.rumMinus(s, r).some(m => m.namn === 'Sjuka där man sover') === (taggar.includes('sovrum') || taggar.includes('sovsal')) : false;
    return [
      [`sjukbädden står inne, ${d.w} × ${d.h}, av ${JSON.stringify(d.av)} på ${d.min} minuter, tekniken ${tek?.namn} (kräver ${tek?.krav})`, !!d.inne && d.w === 2 && d.av.torrgras === 4 && d.av.grenar === 2 && d.av.skinn === 1 && d.min === 12 && !!tek && tek.krav.includes('halmbadd') && tek.krav.includes('orte') && !d.sover],
      [`byn vill ha en sjukbädd (${utan})`, utan === 1],
      [`den friska sover inte där (${frisk}), den med ett benbrott lägger sig där (${sjukLigger}), och ingen annan (${andra})`, frisk && sjukLigger && andra],
      [`i sjukbädden läker man ${lak} gånger fortare`, lak === 1.2],
      [`ett litet skärsår ligger hemma (behovet ${bLiten.toFixed(1)} timmar, gränsen ${SIM.STATION.sjukVinst})`, litenHemma && bLiten <= SIM.STATION.sjukVinst],
      [`den med störst behov av att läka får bädden först (${bStor.toFixed(1)} mot ${bP.toFixed(1)} timmar)`, storstForst && bStor > bP],
      [`rummet är en Sjukstuga (${taggar.join(', ')}), och där andra sover är det en krock`, taggar.includes('sjukstuga') && krock],
    ];
  },
};

SCENARIER.fyrfat = {
  text: 'Fyrfatet (steg 12.4.11, mobler.ts): ett fat av 3 lera (10 minuter, tekniken Fyrfat) med glödande kol, som värmer ett litet rum utan härd; elden är en rad i ELDSTATIONER med bränslet kol, rymmer 3 kol och 1 kol räcker 8 timmar, och den gnistrar en tiondel så mycket som lägerelden',
  kor: () => {
    const d = SIM.stationDef('fyrfat')!, e = SIM.ELDSTATIONER.fyrfat, tek = SIM.TEKNIK.find(t => t.id === 'fyrfat');
    const s = SIM.createState(1, START), p = vuxen(s);
    klockan(s, 22);
    const hus = medHus(s); if (!hus) return [['ett hus', false]];
    SIM.touch(s);
    const rum = SIM.fyrfatRum(s), brist = SIM.stationBrist(s, 'fyrfat');
    const t = medBank(s, "fyrfat"), iRummet = !!rum && SIM.roomAt(s, t.x, t.y)?.id === rum.id;
    const efter = SIM.fyrfatRum(s);
    // kallt: fyrfatet behöver kol, och den som kommer fram fyller det
    const kallt = SIM.coldOf(SIM.temperature(s)) > 0;
    const behov = SIM.fyrfatKol(s) === t;
    SIM.setStock(s, { kol: 5 });
    const at = SIM.vidStation(t); p.x = at.x; p.y = at.y;
    const tk = { act: 'fyrfat', phase: 'do', tx: at.x, ty: at.y, until: s.now + SIM.MIN, carry: 0, why: '' } as SIM.Task;
    SIM.eldaForst(s, p, tk);
    const iFatet = t.eld?.ved ?? 0, brinner = SIM.stationBrinner(t), kvar = SIM.amountOf(s, 'kol');
    const varmt = SIM.stationsVarme(s, t.x + 0.5, t.y + 1), varmtLangt = SIM.stationsVarme(s, t.x + 4.5, t.y + 0.5);
    SIM.stepStationsEld(s, 8 * 3600); const efter8 = t.eld?.ved ?? 0;
    return [
      [`fyrfatet står inne, av ${JSON.stringify(d.av)} på ${d.min} minuter, tekniken ${tek?.namn} (kräver ${tek?.krav}), och går inte att laga mat på`, !!d.inne && d.av.lera === 3 && d.min === 10 && !!tek && tek.krav.join() === 'kruka' && d.gor.join() === 'fyrfat'],
      [`elden brinner på kol, rymmer ${e.max} och ett räcker ${1 / e.burn} timmar, och gnistrar ${e.gnistor} så mycket som lägerelden`, e.bransle === 'kol' && e.max === 3 && Math.abs(1 / e.burn - 8) < 1e-9 && e.gnistor === 0.1 && e.radie === 2.5],
      [`byn vill ha ett fyrfat i rummet där folk sover utan härd (${brist}), och det ställs där (${iRummet}, ${!efter})`, brist === 1 && iRummet && !efter],
      [`när det är kallt (${kallt}) behöver fyrfatet kol (${behov}), och den som kommer fram lägger i ${iFatet} (${kvar} kvar)`, (!kallt || behov) && iFatet === 3 && brinner && kvar === 2],
      [`det värmer nära (${varmt.toFixed(2)}) men inte längre bort (${varmtLangt.toFixed(2)}), och ett kol räcker 8 timmar (${iFatet} → ${efter8})`, varmt > 0 && varmtLangt === 0 && Math.abs(efter8 - 2) < 1e-9],
    ];
  },
};

SCENARIER.tval = {
  text: 'Tvålen i vården (steg 12.4.12): den som vårdar ett sår och kan Rena händer tvättar händerna med 1 tvål om byn har någon, och såret blir då mer sällan infekterat (0,3 gånger risken mot 0,5 med bara rena händer); byns mål för tvål räknas ur förbrukningen',
  kor: () => {
    const s = SIM.createState(1, START), [g, q] = SIM.living(s).filter(x => SIM.ageOf(x, s.now) >= SIM.ALDER.vuxen);
    klockan(s, 12);
    SIM.learnK(g, 'renahander', 1, s.now);
    const sar = () => ({ d: 'vanster_arm', k: 'skarsar', g: 0.5, b: 0 } as unknown as SIM.Skada);
    const w1 = sar(), w2 = sar();
    q.skador = [w1, w2];
    SIM.setStock(s, { remsa: 4, tval: 1 });
    SIM.VARD.forband.gor(s, g, q, w1);
    const medTval = w1.rh === 2 && SIM.amountOf(s, 'tval') === 0;
    SIM.VARD.forband.gor(s, g, q, w2);
    const utan = w2.rh === 1;
    const mal = SIM.MATERIALMAL.tval;
    return [
      [`med tvål tvättar hen händerna och tvålen går åt (${w1.rh})`, medTval],
      [`utan tvål bara rena händer (${w2.rh})`, utan],
      [`risken är ${SIM.HALSA.tval} gånger med tvål mot ${SIM.HALSA.renaHander} med bara rena händer`, SIM.HALSA.tval === 0.3 && SIM.HALSA.renaHander === 0.5],
      [`byns mål för tvål följer förbrukningen (förrådsmålen, minst ${mal.min()})`, SIM.arMaterial('tval')],
    ];
  },
};

SCENARIER.ullregn = {
  text: 'Ylle värmer också blött (steg 12.4.13, mobler.ts): den som bär ett ytterplagg av ylle fryser hälften så mycket av att vara blöt, och det syns i personrutan',
  kor: () => {
    const s = SIM.createState(1, START), p = vuxen(s);
    klockan(s, 12);
    s.ting = SIM.tingOf(s).filter(t => t.bar !== p.id);
    p.blot = 1;
    const naken = SIM.vaderGrader(s, p, false);
    const mantel = SIM.addTool(s, 'mantel_vargskinn', p); mantel.hos = undefined; mantel.bar = p.id;
    const skinn = SIM.vaderGrader(s, p, false);
    s.ting = SIM.tingOf(s).filter(t => t !== mantel);
    const kappa = SIM.addTool(s, 'kappa_ylle', p); kappa.hos = undefined; kappa.bar = p.id;
    const ylle = SIM.vaderGrader(s, p, false), syns = SIM.ylleYtter(s, p);
    p.blot = undefined; const torr = SIM.vaderGrader(s, p, false);
    return [
      [`blöt utan ylle känns ${naken} grader kallare, med en mantel av skinn lika (${skinn})`, naken === SIM.VADER.blotGrader && skinn === naken],
      [`med en kappa av ylle hälften (${ylle})`, ylle === naken * SIM.VADER.ullBlot && SIM.VADER.ullBlot === 0.5 && syns],
      [`torr spelar yllet ingen roll (${torr})`, torr === 0],
    ];
  },
};

SCENARIER.penna = {
  text: 'Fjäderpennan (steg 12.4.14, skrift.ts): en penna som skärs av 1 fjädrar med kniven på 2 minuter och ligger vid skrivpulpeten, där byn vill ha en per pulpet; det som skrivs med den får oftare bra kvalitet (0,1 högre chans, också vid elden), och den håller 20 blad',
  kor: () => {
    const R = SIM.RECEPT.penna as SIM.ReceptRad, pulpet = SIM.stationDef('skrivpulpet')!;
    const s = SIM.createState(1, START), p = vuxen(s);
    while (SIM.lightLevel(s.now) < 1) s.now += SIM.HOUR;
    const utan = SIM.villAv(s, 'penna');
    medBank(s, 'skrivpulpet');
    const med = SIM.villAv(s, 'penna');
    // ett blad skrivs vid elden med pennan: den slits ett blad
    const kr = SIM.addTool(s, 'lerkruka_liten', p); kr.hos = undefined;
    const penna = SIM.addTool(s, 'penna', p); penna.hos = undefined;
    p.lardomar = [{ k: 'fara', a: 3, v: 1, c: 0.9, t: s.now, om: 'Ulv dog där' } as NonNullable<SIM.Person['lardomar']>[number]];
    SIM.setAmount(s, 'pergament', 1); SIM.fyllVatska(s, 'black', 2, kr);
    p.task = { act: 'skriva', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '' } as SIM.Task;
    SIM.skrivKlar(s, p);
    const skrevs = (s.stat?.skrivetMedPenna ?? 0) === 1, slits = Math.abs(penna.c - (1 - 1 / 20)) < 0.02;
    return [
      [`pennan skärs av ${JSON.stringify(R.av)} med ${Object.keys(R.verktyg ?? {})} på ${R.min} minuter, för hand, med tekniken ${R.tek}`, R.av?.fjadrar === 1 && !!R.verktyg?.kniv && R.min === 2 && !R.bank && R.tek === 'pergament'],
      [`den ligger vid skrivpulpeten, och byn vill ha en per pulpet (${utan} utan pulpet, ${med} med en)`, pulpet.vid?.penna === 1 && utan === 0 && med >= 1],
      [`det som skrivs med den får ${SIM.SKRIFT.pennaKv} högre chans till bra kvalitet, och den håller ${SIM.SKRIFT.pennaBlad} blad (${penna.c.toFixed(3)} kvar)`, SIM.SKRIFT.pennaKv === 0.1 && SIM.SKRIFT.pennaBlad === 20 && skrevs && slits],
    ];
  },
};
