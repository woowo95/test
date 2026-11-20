// Scenarier för system 12.4: möblerna och sakerna i hemmet (drejskivan, oljelampan, sängen, stolen, vaggan, tunnan, osten,
// brunnen, utedasset, sjukstugan, fyrfatet, tvålen, yllet och fjäderpennan).
import * as SIM from '../../sim';
import { SCENARIER, klockan, medBank } from './hjalp';
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
