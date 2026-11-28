// Scenarier för fas 15, grupp 18 (steg 15.1.164–175).
import * as SIM from '../../sim';
import { SCENARIER } from './hjalp';
import { foretagBy } from './fas14';

SCENARIER.forstagang = {
  text: 'Steg 15.1.171: statistiken räknas en gång. Den första kunden vid disken ger raden i loggen en gång, och foretagSalt är lika med antalet köp',
  kor: () => {
    const { s, p, f, vux } = foretagBy();
    for (const q of vux) { q.hunger = 0.25; q.task = undefined; }
    p.task = undefined; p.hunger = 1;
    const salt = () => Object.values(f.salt ?? {}).reduce((a, b) => a + b, 0);
    for (let j = 0; j < 3600 && salt() < 3; j++) { s.now += 2000; SIM.step(s, 2); }
    const rader = s.log.filter(e => /blev den första kunden/.test(e.text)).length, st = s.stat?.foretagSalt ?? 0, per = s.stat?.foretagSalt_servering ?? 0;
    return [
      [`flera köp vid disken (${salt()})`, salt() >= 2],
      [`foretagSalt är lika med antalet köp (${st} mot ${salt()}, ${per} för serveringen)`, st === salt() && per === salt()],
      [`raden om den första kunden står en gång i loggen (${rader})`, rader === 1],
    ];
  },
};
