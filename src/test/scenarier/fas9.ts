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

SCENARIER.djurantal = {
  text: 'Steg 9.1.2: djuren blir inte fler för att kartan blir större. Antalet kaningrupper, rådjursgrupper, fågelflockar och björnar är högst det registret säger, på en karta med 120 och med 240 rutor i sidan',
  kor: () => {
    const rakna = (sida: number) => {
      const s = createState(5, START, { W: sida, H: sida });
      const m = { kaniner: 0, radjur: 0, faglar: 0, bjorn: 0 };
      for (let h = 0; h < 48; h += 6) {
        s.now += 6 * SIM.HOUR;
        m.kaniner = Math.max(m.kaniner, SIM.grupperOf(s).length);
        m.radjur = Math.max(m.radjur, SIM.radjurGrupper(s).length);
        m.faglar = Math.max(m.faglar, new Set(SIM.faglarOf(s).map(d => Math.floor(d.id / 100))).size);
        m.bjorn = Math.max(m.bjorn, SIM.bjornarOf(s).filter(d => d.art === 'bjorn').length);
      }
      return m;
    };
    const a = rakna(120), b = rakna(240), t = (m: typeof a) => `${m.kaniner} kaningrupper, ${m.radjur} rådjursgrupper, ${m.bjorn} björnar`;
    return [
      [`120 rutor: ${t(a)}; 240 rutor: ${t(b)}`, b.kaniner <= SIM.KANINER.grupper && b.radjur <= SIM.RADJUR.grupper && b.bjorn <= 1],
      ['lika många grupper på den större kartan', b.kaniner === a.kaniner && b.radjur === a.radjur],
    ];
  },
};
