// Scenarier. Fas 9: kartan växer (9.1) och fördjupningarna.
import { createState } from '../../sim';
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, kor } from './hjalp';

SCENARIER.andrade = {
  text: 'Steg 9.1.1: platserna växer bara tillbaka där något tagits. Varje ruta där ett lager har tagits ur står i lagrets lista, så att ingen ruta glöms när resten av kartan inte räknas',
  kor: () => {
    const s = createState(3, START);
    kor(s, 72);
    const d = SIM.takenOf(s) as Record<string, Float32Array | undefined>;
    let tagna = 0, utan = 0;
    for (const k of SIM.UTTAG_IDS) {
      const a = d[k], med = new Set(SIM.aktivaRutor(s, k));
      if (a) for (let i = 0; i < a.length; i++) if (a[i] > 0) { tagna++; if (!med.has(i)) utan++; }
    }
    return [
      [`byn har tagit ur kartan (${tagna} rutor)`, tagna > 0],
      [`varje sådan ruta står i listan (${utan} saknas)`, utan === 0],
    ];
  },
};
