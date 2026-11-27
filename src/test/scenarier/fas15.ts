// Scenarier för fas 15.
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, klockan, kor, setMat, tandEld, tandOchFlinta, testBy } from './hjalp';
import { bynNu, RIM } from '../rimligt';

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
