// Scenarier för fas 15, grupp 19 av 15.1 (steg 15.1.174–186: räkningar som görs en gång, och död kod).
import * as SIM from '../../sim';
import { SCENARIER, testBy } from './hjalp';

SCENARIER.larmnan = {
  text: 'Steg 15.1.179: rollen vid rövarlarmet räknas utan NaN. Den som är för ung eller inte kan slåss får -Infinity i rövarnas rad och gömmer sig, och ingens tal är NaN',
  kor: () => {
    const s = SIM.cloneState(testBy(10)), r = SIM.LARMHOT.rovare;
    const folk = SIM.living(s), plus = folk.map(p => r.plus(s, p)), nan = folk.filter((_, i) => Number.isNaN(plus[i]));
    const kan = (p: SIM.Person) => SIM.ageOf(p, s.now) >= SIM.ALDER.vaktFran && SIM.vuxenKan(s, p);
    const unga = folk.filter(p => !kan(p)), ungaOk = unga.every(p => r.plus(s, p) === -Infinity);
    const roll = unga.map(p => { p.larmRoll = undefined; return SIM.rollVid(s, p, 'rovare'); });
    return [
      [`ingens tal i rövarnas rad är NaN (${nan.length} av ${folk.length})`, nan.length === 0],
      [`de ${unga.length} som inte kan slåss får -Infinity`, unga.length > 0 && ungaOk],
      ['de gömmer sig', roll.every(x => x === 'gomd')],
    ];
  },
};

SCENARIER.bildstental = {
  text: 'Steg 15.1.186: bildstenens chanser är balanstal och syns i npm run talen',
  kor: () => {
    const t = SIM.balansTal().bildsten;
    return [
      ['bildsten.extra och bildsten.gud finns bland balanstalen', !!t && t.extra === SIM.BILDSTEN.extra && t.gud === SIM.BILDSTEN.gud],
    ];
  },
};
