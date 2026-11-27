// Scenarier för fas 15.
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, klockan, setMat, tandEld, tandOchFlinta } from './hjalp';
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
