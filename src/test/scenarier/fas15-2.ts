// Scenarier för fas 15, grupp 2 av rättningarna från spelgranskningen (system 15.1).
import * as SIM from '../../sim';
import { SCENARIER, rikBy, tandEld } from './hjalp';
import { BEAT, START } from '../kor';
import { helAffar, utanVantan, vanligBy } from './agande';
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

SCENARIER.diskvarde = {
  text: 'Steg 15.1.24: diskens värde som projekt är det företaget tjänar på ett år med den, delat med vad disken kostar: ett företag med många väntade kunder bygger sin disk före ett med få',
  kor: () => {
    const varde = (kvar: number) => {
      const { s, p, f } = foretagBy(['servering']);
      for (const q of SIM.living(s).filter(q => q !== p && !SIM.familjOf(s, p.id).includes(q)).slice(kvar)) q.left = s.now; // få som kan köpa
      s.stationer = s.stationer!.filter(t => t.k !== 'disk'); SIM.touch(s);
      const fam = SIM.familjOf(s, p.id), e = SIM.foretagBord.diskEgen(s, fam), kunder = SIM.startPoang(s, f.ag, f.verk, 0, f).kunder;
      return { e, kunder, v: SIM.personVarde(s, 'disk', fam, 0, p) };
    };
    const manga = varde(99), fa = varde(3);
    const t = (n: number) => n.toFixed(2);
    return [
      [`företaget med många väntade kunder (${t(manga.kunder)} om dygnet) ser ett värde i disken (${t(manga.e)})`, manga.e > 0],
      [`det med få (${t(fa.kunder)}) ser mindre (${t(fa.e)})`, fa.kunder < manga.kunder && fa.e < manga.e],
      [`och disken är värd mer som projekt för det första (${t(manga.v * 100)} mot ${t(fa.v * 100)} hundradelar)`, manga.v > fa.v],
    ];
  },
};

SCENARIER.handlarbyte = {
  text: 'Steg 15.1.25: när en bybo säljer till handlaren bjuder handlaren först silver och sedan sina varor, med samma betalaAv som när kunden köper: en handlare utan silver köper en sak av en bybo och betalar med en vara',
  kor: () => {
    const s = SIM.createState(6, START);
    rikBy(s); tandEld(s); SIM.setAmount(s, 'ved', 40); SIM.setAmount(s, 'grenar', 30); SIM.setAmount(s, 'torrgras', 30);
    SIM.handlarFram(s, vanligBy(s, (SIM.handlarKlan(s) ?? SIM.handlarKlan(s, true))!.klan.rad!));
    for (let i = 0; i < 40 && s.handlare?.fas !== 'handlar'; i++) { SIM.step(s, BEAT); utanVantan(s); }
    const h = s.handlare!, [a] = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
    h.bynKlar = true; h.silver = 0; h.varor = [{ k: 'ved', n: 6 }]; // handlaren har inget silver, bara ved
    for (const p of SIM.living(s)) if (p.task?.act === 'handla') p.task = undefined;
    const k = 'skinn';
    SIM.put(s, k, 12, { [a.id]: 12 }); // a har mycket mer än hen behöver
    const fore = SIM.ownsAmount(s, a, k), silver0 = SIM.ownsAmount(s, a, 'silver'), rep0 = SIM.ownsAmount(s, a, 'ved');
    const va = SIM.handlaVal(s, a);
    const st = va ? helAffar(s, a).steg : [];
    const salt = fore - SIM.ownsAmount(s, a, k), kruk = SIM.ownsAmount(s, a, 'ved') - rep0, silver = SIM.ownsAmount(s, a, 'silver') - silver0;
    return [
      [`den som har skinn över går till handlaren utan silver (${va?.why ?? 'går inte'})`, !!va],
      [`handlaren köper (${salt} skinn) och betalar med ved (${kruk}), inte med silver (${silver}) (${st.join(' → ')})`, salt >= 1 && kruk >= 1 && silver === 0 && h.varor.some(w => w.k === k) && (s.stat?.saltOver ?? 0) >= 1],
    ];
  },
};
