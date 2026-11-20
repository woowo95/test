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
