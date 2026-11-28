// Scenarier för fas 15, grupp 2 av rättningarna från spelgranskningen (system 15.1).
import * as SIM from '../../sim';
import { SCENARIER } from './hjalp';
import { foretagBy } from './fas14';

SCENARIER.handelsfart = {
  text: 'Steg 15.1.23: att betjäna, ställa fram varor och städa går fortare för den skickliga, som allt annat arbete',
  kor: () => {
    const { s, p, f, vux } = foretagBy(), m = 60000;
    SIM.oppna(s, f);
    const k = vux.find(q => SIM.kundVal(s, q, 'servering'))!, x = SIM.kundVal(s, k, 'servering')!, o = SIM.stallIKo(s, k, x);
    k.x = o.spot.x; k.y = o.spot.y; k.task = { act: 'koaDisk', phase: 'do', tx: o.spot.x, ty: o.spot.y, until: s.now + o.dur, carry: 0, why: o.why, ref: o.ref };
    const med = (sk: number, fn: () => number) => { const h = p.skill.handel, hv = p.skill.hantverk; p.skill.handel = sk; p.skill.hantverk = sk; try { return fn(); } finally { p.skill.handel = h; p.skill.hantverk = hv; } };
    const betj = (sk: number) => med(sk, () => (SIM.betjanVal(s, p)?.dur ?? 0) / m);
    const stall = (sk: number) => med(sk, () => SIM.stallaTid(s, p) / m), stad = (sk: number) => med(sk, () => SIM.stadaMin(s, p));
    const [b0, b1, s0, s1, d0, d1] = [betj(0.05), betj(0.95), stall(0.05), stall(0.95), stad(0.05), stad(0.95)];
    const f2 = (n: number) => n.toFixed(2);
    return [
      [`den skickliga betjänar fortare (${f2(b1)} min mot ${f2(b0)})`, b1 > 0 && b1 < b0],
      [`och ställer fram varor fortare (${f2(s1)} min mot ${f2(s0)})`, s1 < s0],
      [`och städar en ruta fortare (${f2(d1)} min mot ${f2(d0)})`, d1 < d0],
      [`betjäna och ställa fram övar handeln, städa hantverket (${SIM.kunnaSkill('betjana')}, ${SIM.kunnaSkill('stallaFram')}, ${SIM.kunnaSkill('stada')})`, SIM.kunnaSkill('betjana') === 'handel' && SIM.kunnaSkill('stallaFram') === 'handel' && SIM.kunnaSkill('stada') === 'hantverk'],
    ];
  },
};

SCENARIER.skicklighetvakt = {
  text: 'Steg 15.1.53: vakten för skickligheten prövar varje handling som tar tid och gör något, också arbetet på en plats som inte är ett hantverk (städa, betjäna, ställa fram)',
  kor: () => {
    const A = SIM.ACTS as Record<string, SIM.ActDef>;
    const nu = SIM.utanFardighet();
    const utan = (a: string) => SIM.utanFardighet({ ...A, [a]: { ...A[a], kunna: undefined } as SIM.ActDef });
    const stada = utan('stada'), betj = utan('betjana'), stall = utan('stallaFram');
    const ny = SIM.utanFardighet({ ...A, provarbete: { namn: 'Prövar', slag: 'hantverk', verb: 'prövar' } as SIM.ActDef });
    const vila = SIM.utanFardighet({ ...A, provvila: { namn: 'Vilar', vila: true } as SIM.ActDef });
    const aldre = [...SIM.FORE_KUNNA].filter(a => !A[a] || A[a].kunna !== undefined);
    return [
      [`i dag larmar vakten inte (${nu.join('; ') || 'inget'})`, nu.length === 0],
      [`utan sin nivå larmar städa, betjäna och ställa fram (${[...stada, ...betj, ...stall].length})`, stada.some(t => t.startsWith('stada:')) && betj.some(t => t.startsWith('betjana:')) && stall.some(t => t.startsWith('stallaFram:'))],
      [`ett nytt arbete på en plats utan färdighet larmar (${ny.join('; ')})`, ny.some(t => t.startsWith('provarbete:'))],
      [`en handling som inte gör något larmar inte`, !vila.some(t => t.startsWith('provvila:'))],
      [`de äldre arbetena utan skickligheten i sin tid finns och saknar nivå (${aldre.join(', ') || 'alla'})`, aldre.length === 0],
    ];
  },
};
