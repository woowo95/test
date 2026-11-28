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
      [`hjälparen står minst ${A} rutor från fienderna (närmare än ${(A - 0.75).toFixed(2)} i ${nara} av ${tick} steg, längst ${langst} s i sträck${ex.length ? ': ' + ex.join(', ') : ''})`, tick > 100 && nara <= tick * 0.05 && langst <= 3],
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

SCENARIER.blodtorst = {
  text: 'Steg 15.1.67: den blodtörstiga hugger den som ligger. En rövare med blodtörst minst STRID.ruser slår en bybo som fallit också när avsikten bara är att skada; en som inte är blodtörstig låter hen ligga',
  kor: () => {
    const prov = (torst: number) => {
      let slag = 0, dog = 0;
      for (let i = 0; i < 20; i++) {
        const st = SIM.nyStrid({ avsikt: 'skada', w: 16, h: 8, kampar: [kampe(1, 0, 'yxa', 7, 4), kampe(2, 1, 'kniv', 9.5, 4, {}, { torst, mod: 16 })] }, i * 7919 + 5);
        const b = st.kampar[0]; b.lage = 'nere'; b.fallT = 0; // bybon har redan fallit
        stega(st);
        slag += st.logg.filter(r => r.a === 2 && r.b === 1 && r.sl && (r.h === 'traff' || r.h === 'tog' || r.h === 'miss')).length;
        if ((b.lage as string) === 'dod') dog++;
      }
      return { slag, dog };
    };
    const arg = prov(Math.max(1, SIM.STRID.ruser + 0.3)), snall = prov(0);
    return [
      [`den blodtörstiga rövaren slår den som ligger (${arg.slag} slag i 20 strider, ${arg.dog} dog)`, arg.slag >= 20],
      [`den som inte är blodtörstig låter hen ligga (${snall.slag} slag)`, snall.slag === 0],
    ];
  },
};

SCENARIER.knuffbak = {
  text: 'Steg 15.1.68: knuffen och det tunga slaget trycker tillbaka. En knuff som inte fäller flyttar den knuffade bakåt, ett slag med tyngden minst STRID.vackla får den som står att backa, och en vägg stoppar flyttningen',
  kor: () => {
    const T = SIM.STRID;
    // knuffarna i slagsmål med händerna: den knuffade står längre bort från den som knuffade efter steget
    let knuffar = 0, bak = 0, summa = 0;
    for (let i = 0; i < 40; i++) {
      const st = SIM.nyStrid({ avsikt: 'slagsmal', w: 30, h: 12, kampar: [kampe(1, 0, 'hand', 14, 6, {}, { mod: 18 }), kampe(2, 1, 'hand', 15.5, 6, {}, { mod: 18 })] }, i * 7919 + 9);
      while (!st.slut) {
        const fore = st.kampar.map(k => ({ x: k.x, y: k.y })), n = st.logg.length;
        SIM.stridSteg(st);
        for (const r of st.logg.slice(n)) if (r.h === 'knuff') {
          const a = st.kampar.find(k => k.id === r.a)!, b = st.kampar.find(k => k.id === r.b)!, ia = st.kampar.indexOf(a), ib = st.kampar.indexOf(b);
          const d0 = Math.hypot(fore[ib].x - fore[ia].x, fore[ib].y - fore[ia].y), d1 = Math.hypot(b.x - fore[ia].x, b.y - fore[ia].y);
          knuffar++; summa += d1 - d0; if (d1 - d0 >= 0.6 * T.knuffBak) bak++;
        }
      }
    }
    // det tunga slaget: samma träff med tyngden 1 och 0,3 mot en som står, på fri mark och framför en vägg
    const slag = (ty: number, vagg: boolean) => {
      const st = SIM.nyStrid({ avsikt: 'skada', w: 20, h: 10, hinder: vagg ? [{ x: 10.9, y: 0, b: 1, h: 10 }] : [], kampar: [kampe(1, 0, 'yxa', 9, 5), kampe(2, 1, 'yxa', 10, 5, {}, { mod: 20 })] }, 3);
      const b = st.kampar[1], x0 = b.x; SIM.traffa(st, st.kampar[0], b, 0.05, 'slag', undefined, ty);
      return { flytt: b.x - x0, x: b.x, star: b.lage === 'strid' };
    };
    const tungt = slag(1, false), latt = slag(0.3, false), vid = slag(1, true);
    return [
      [`en knuff som inte fäller trycker den knuffade bakåt (${bak} av ${knuffar} knuffar minst ${(0.6 * T.knuffBak).toFixed(1)} rutor, i snitt ${(summa / Math.max(1, knuffar)).toFixed(2)})`, knuffar > 20 && bak >= knuffar * 0.6],
      [`det tunga slaget får den som står att backa ${tungt.flytt.toFixed(2)} rutor (vacklaBak × tyngden = ${T.vacklaBak})`, tungt.star && Math.abs(tungt.flytt - T.vacklaBak) < 0.05],
      [`ett lätt slag flyttar ingen (${latt.flytt.toFixed(2)})`, latt.flytt === 0],
      [`väggen stoppar flyttningen (${vid.flytt.toFixed(2)} rutor, står vid ${vid.x.toFixed(2)} framför väggen vid 10,9)`, vid.flytt < tungt.flytt - 0.1 && vid.x <= 10.9 - 0.3 + 1e-6],
    ];
  },
};
