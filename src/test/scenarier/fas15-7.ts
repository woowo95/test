// Scenarier för fas 15, grupp 7 av system 15.1 (striden: hjälparna, slagen, knuffen, stenarna och rövarnas skyttar).
import * as SIM from '../../sim';
import { SCENARIER } from './hjalp';

type K = SIM.Uppstallning['kampar'][number];
// en kämpe i arenan
const kampe = (id: number, sida: 0 | 1, vapen: SIM.Vapen, x: number, y: number, o: Partial<K> = {}, st: Partial<K['st']> = {}): K => ({ id, namn: `K${id}`, sida, st: { styrka: 10, uthallighet: 10, mod: 10, smidighet: 10, skicklighet: 10, ...st }, vapen, klader: [], fart: 1, x, y, ...o });
// stegar striden till slutet och anropar varje efter varje steg
const stega = (st: SIM.Strid, varje?: (st: SIM.Strid) => void) => { while (!st.slut) { SIM.stridSteg(st); varje?.(st); } return st; };

SCENARIER.hjalpavstand = {
  text: 'Steg 15.1.59: hjälparna står utanför striden. Hjälparen går inte fram i striden utan står STRID.hjalpAvst från fienderna och står kvar där utan att pendla',
  kor: () => {
    const A = SIM.STRID.hjalpAvst;
    let tick = 0, nara = 0, langst = 0, varv = 0, pend = 0; const ex: string[] = [];
    for (let i = 0; i < 20; i++) {
      // två kämpar och en hjälpare mot tre rövare; hjälparen står strax bakom vännerna när striden börjar
      const st = SIM.nyStrid({ avsikt: 'skada', w: 40, h: 30, kampar: [
        kampe(1, 0, 'yxa', 18, 14, {}, { mod: 16 }), kampe(2, 0, 'yxa', 18, 16.5, {}, { mod: 16 }), kampe(3, 0, 'hand', 16.5, 15.3, { hjalp: true }),
        kampe(4, 1, 'kniv', 20.6, 14.8, {}, { mod: 16 }), kampe(5, 1, 'kniv', 21, 16.5, {}, { mod: 16 }), kampe(6, 1, 'kniv', 22, 13.5, {}, { mod: 16 }),
      ] }, i * 7919 + 3);
      const h = st.kampar.find(k => k.hjalp)!; let i0 = 0, sv: { x: number; y: number }[] = [];
      stega(st, s => {
        const fi = s.kampar.filter(o => o.sida === 1 && o.lage === 'strid');
        if (h.lage !== 'strid' || !fi.length || h.raddar !== undefined || h.bar !== undefined || s.t < 4) { i0 = 0; sv = []; return; }
        tick++; const d = Math.min(...fi.map(o => Math.hypot(o.x - h.x, o.y - h.y)));
        if (d < A - 0.75) { nara++; i0++; langst = Math.max(langst, i0 * SIM.STRID.tick); if (ex.length < 3) ex.push(`${d.toFixed(1)} vid ${s.t}`); } else i0 = 0;
        if (Math.round(s.t * 4) % 4 === 0) { sv.push({ x: h.x, y: h.y }); if (sv.length > 9) sv.shift(); // en gång i sekunden, de senaste åtta sekunderna
          if (sv.length === 9) { varv++; let vag = 0; for (let j = 1; j < 9; j++) vag += Math.hypot(sv[j].x - sv[j - 1].x, sv[j].y - sv[j - 1].y); const netto = Math.hypot(sv[8].x - sv[0].x, sv[8].y - sv[0].y); if (vag - netto > 5) pend++; } }
      });
    }
    return [
      [`hjälparen står minst ${A} rutor från fienderna (närmare än ${(A - 0.75).toFixed(2)} i ${nara} av ${tick} steg, längst ${langst} s i sträck${ex.length ? ': ' + ex.join(', ') : ''})`, tick > 100 && nara <= tick * 0.05 && langst <= 2],
      [`ingen pendlar: fram och tillbaka mer än fem rutor på åtta sekunder ${pend} gånger av ${varv}`, varv > 20 && pend <= varv * 0.02],
    ];
  },
};

SCENARIER.rustning = {
  text: 'Steg 15.1.66: slagen tar rent oftare, och skyddet avgör. Samma slag mot bålen på en utan skydd och en i ringbrynja: den utan får ett sår på minst 0,2 tydligt oftare',
  kor: () => {
    const rena = (klader: string[]) => {
      let tunga = 0, alla = 0;
      SIM.TRAFFDEL_PROV.del = 'bal';
      try {
        for (let i = 0; i < 80; i++) {
          const st = SIM.stridTillSlut(SIM.nyStrid({ avsikt: 'skada', w: 16, h: 8, kampar: [kampe(1, 0, 'yxa', 7, 4, {}, { mod: 18 }), kampe(2, 1, 'yxa', 9, 4, { klader }, { mod: 18 })] }, i * 7919 + 11));
          for (const r of st.logg) if (r.b === 2 && r.sl && !r.kast && (r.h === 'traff' || r.h === 'tog')) { alla++; if (r.h === 'traff' && (r.g ?? 0) >= 0.2) tunga++; }
        }
      } finally { SIM.TRAFFDEL_PROV.del = undefined; }
      return { tunga, alla, andel: tunga / Math.max(1, alla) };
    };
    const utan = rena([]), ring = rena(['ringbrynja_jarn']), pc = (x: { tunga: number; alla: number; andel: number }) => `${(100 * x.andel).toFixed(1)} % (${x.tunga} av ${x.alla})`;
    return [
      ['ringbrynjan skyddar bålen i striden', !!SIM.SKYDD.ringbrynja_jarn?.delar.includes('bal')],
      [`utan skydd tar slaget rent ibland: ${pc(utan)} av träffarna blir ett sår på minst 0,2`, utan.alla > 100 && utan.andel >= 0.05],
      [`i ringbrynja sällan: ${pc(ring)}`, ring.alla > 100 && ring.andel <= utan.andel / 3],
    ];
  },
};
