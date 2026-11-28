// Scenarier för fas 15, grupp 16 (steg 15.1.151–15.1.160).
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER } from './hjalp';

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
