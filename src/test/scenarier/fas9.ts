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

SCENARIER.bynsavstand = {
  text: 'Steg 9.1.5: avståndet till byn räknas för en ruta i taget när någon frågar, med samma svar som när hela kartan räknades, och den snabba undre gränsen är aldrig större än avståndet',
  kor: () => {
    const s = createState(1, START);
    kor(s, 48);
    const a = SIM.bynsAvstand(s), o = SIM.omrade(s), f = new Float32Array(1);
    let fel = 0, over = 0;
    for (let i = 0; i < SIM.W * SIM.H; i++) {
      const x = i % SIM.W, y = (i - x) / SIM.W;
      f[0] = o.inne[i] ? 0 : Math.max(0, SIM.tillHoljet(s, x, y) - SIM.OMRADE.kant);
      if (a.at(i) !== f[0]) fel++;
      if (a.minst(i) > a.at(i) + 1e-4) over++; // Float32 i fältet
    }
    return [
      [`samma avstånd som över hela kartan (${fel} rutor skiljer)`, fel === 0],
      [`den undre gränsen håller (${over} rutor över)`, over === 0],
    ];
  },
};

SCENARIER.sparmark = {
  text: 'Steg 9.1.4: gräset och skogen sparas som det som skiljer sig från startkartan. En sparad och inläst by får exakt samma mark som med det gamla formatet (en byte per ruta), och sparningen blir mindre',
  kor: () => {
    const s = createState(3, START);
    kor(s, 48);
    const g = SIM.groundOf(s), kopia = SIM.groundOf(SIM.cloneState(s));
    const gammalC = SIM.decodeCover(SIM.encodeCover(g.cover)), gammalT = SIM.decodeCover(SIM.encodeCover(g.trees), 0);
    let fel = 0;
    for (let i = 0; i < g.cover.length; i++) if (kopia.cover[i] !== gammalC[i] || kopia.trees[i] !== gammalT[i]) fel++;
    SIM.packGround(s);
    const ny = (s.mark?.length ?? 0) + (s.skog?.length ?? 0), gammal = SIM.encodeCover(g.cover).length + SIM.encodeCover(g.trees).length;
    return [
      [`samma mark efter inläsning som med det gamla formatet (${fel} rutor skiljer)`, fel === 0],
      [`sparningen är mindre (${Math.round(ny / 1024)} KB mot ${Math.round(gammal / 1024)} KB)`, ny < gammal],
    ];
  },
};
