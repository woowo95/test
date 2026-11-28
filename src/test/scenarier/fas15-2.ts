// Scenarier för fas 15, grupp 2 av rättningarna från spelgranskningen (system 15.1).
import * as SIM from '../../sim';
import { SCENARIER, korTills, rikBy, rovarGang, tandEld, testBy } from './hjalp';
import { BEAT, START } from '../kor';
import { helAffar, utanVantan, vanligBy } from './agande';
import { foretagBy } from './fas14';
import { antal } from '../../sim/ord';

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

SCENARIER.losen = {
  text: 'Steg 15.1.26: lösen är det hembyn har: först silvret och sedan varor ur dess förråd i hela saker. En hemby utan silver betalar med varor, och byn får varorna men inget silver, så att inget silver skapas ur ingenting',
  kor: () => {
    const bas = testBy(3, x => SIM.housesOf(x).some(q => q.klar && SIM.fangelseDorr(x, q))), vl0 = bas.varld!;
    const klan = SIM.klanerOf(bas).find(k => k.rad !== undefined && vl0.rader?.some(r => r.nr === k.rad && SIM.lever(vl0, r) && r.sort === 'by'))!;
    const s = SIM.cloneState(bas); s.seder.v.fejd = 0; s.styre = undefined;
    const hus = SIM.housesOf(s).find(q => q.klar && SIM.fangelseDorr(s, q))!; hus.fn = 'fangelse'; SIM.fangelseDorr(s, hus)!.dorr = 'tradorr'; SIM.touch(s);
    for (const q of SIM.living(s)) q.task = undefined;
    const z = SIM.zoneOf(s)!, f = rovarGang(s, 1, { x: z.x + z.w / 2 + 6, y: z.y + z.h / 2 }, { klan: klan.id });
    const r = SIM.gastAv(s, f.folk[0])!; SIM.geUpp(s, r);
    SIM.satt(s, r, SIM.fangelseLedigt(s)!, 'Tagen i scenariot'); r.gast!.tagen = s.now - SIM.DAY - 1;
    const rad = s.varld!.rader!.find(x => x.nr === klan.rad)!; rad.tal.silver = 0; // hembyn har inget silver
    const varor0 = { ...SIM.radVaror(rad) }, silver0 = SIM.amountOf(s, 'silver');
    SIM.fangeOde(s); if (r.gast!.losen) r.gast!.losen.t = s.now;
    let bud: SIM.Person | undefined, bar: { k: string; n: number }[] = [];
    korTills(s, () => !r.fange, 8 * 3600, () => { if (!bud) { bud = s.people.find(q => q.gast?.losenFor === r.id); bar = (bud?.gast?.gava ?? []).map(w => ({ ...w })); } });
    const varde = bar.reduce((a, w) => a + w.n * SIM.grundvarde(w.k), 0), varor1 = SIM.radVaror(rad);
    const drogs = SIM.VARUGRUPP_IDS.reduce((a, g) => a + ((varor0[g] ?? 0) - (varor1[g] ?? 0)), 0);
    const fick = bar.every(w => SIM.amountOf(s, w.k) >= w.n);
    const text = s.log.find(l => l.text.includes('i lösen för'))?.text ?? '';
    return [
      [`ledaren valde lösen (${s.stat?.fange_val_losen ?? 0}) och ett sändebud kom`, (s.stat?.fange_val_losen ?? 0) > 0 && !!bud],
      [`sändebudet bar varor värda minst lösen (${bar.map(w => `${w.n} ${w.k}`).join(', ')}: ${varde.toFixed(0)} av ${SIM.FANGEVAL.losen}) och inget silver`, varde >= SIM.FANGEVAL.losen - 1e-9 && !bar.some(w => w.k === 'silver')],
      [`varorna drogs ur hembyn (${drogs.toFixed(0)} i grundvärde)`, drogs >= varde - 1],
      [`byn fick varorna (${fick}) men inget silver (${(SIM.amountOf(s, 'silver') - silver0).toFixed(0)}), och fången följde med hem`, fick && Math.abs(SIM.amountOf(s, 'silver') - silver0) < 1e-9 && !r.fange],
      [`texten säger vad som betalades (${text})`, bar.length > 0 && text.includes(antal(bar[0].n, bar[0].k))],
    ];
  },
};

SCENARIER.radgruva = {
  text: 'Steg 15.1.28: alla byar bryter silver. Gruvfärden är en rad i BYHANDLINGAR: en grannby med en silvergruva i närområdet skickar bärare dit när det väntade silvret är värt mer än resan, tar silvret ur gruvan och bär hem det, och en by som inte känner någon gruva skickar ingen',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!;
    const byar = vl.rader!.filter(x => SIM.lever(vl, x) && x.nr !== vl.huvud && SIM.BYSORTER[x.sort].ledare && x.tal.folk >= 4);
    const gruvor = (vl.platser ?? []).filter(q => q.k === 'silvergruva');
    const r = byar[0], h = SIM.byPlats(vl, r.nr)!, q = gruvor[0];
    if (!r || !q) return [[`en by (${r?.namn}) och en gruva (${q?.namn})`, false]];
    // gruvan ligger några rutor från byn, i dess närområde
    let p = -1, c = { ...SIM.byCtx(s, vl, r, r, s.now), gruva: q };
    for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, -2], [2, -2], [-2, 2]]) { q.x = h.x + dx; q.y = h.y + dy; (q.inne ??= {}).silver = 40; p = SIM.BYHANDLINGAR.gruva.poang(c); if (p > 0) break; }
    const kann = SIM.radKanner(vl, r, q.nr), silver0 = r.tal.silver, kvar0 = SIM.silverKvar(q);
    const n0 = vl.nastaFard ?? 0;
    SIM.BYHANDLINGAR.gruva.gor(c);
    const f = (vl.farder ?? []).find(x => x.id > n0 && x.fran === r.nr && x.gruva);
    if (f) SIM.KOHANDELSER.fardFram(s, vl, { sak: f.id } as never);
    const kvar1 = SIM.silverKvar(q), bar = f?.silver ?? 0;
    if (f) SIM.KOHANDELSER.fardHem(s, vl, { sak: f.id } as never);
    const silver1 = r.tal.silver;
    // en by som inte känner någon gruva
    const r2 = byar.find(x => x !== r && !gruvor.some(g => SIM.radKanner(vl, x, g.nr) !== undefined));
    const v2 = r2 ? SIM.byVal(s, vl, r2, 0) : undefined;
    return [
      [`${r.namn} känner gruvan i närområdet (${kann})`, kann !== undefined],
      [`gruvfärden är värd mer än resan (poängen ${p.toFixed(2)})`, p > 0],
      [`bärarna ger sig av (${f ? `färd ${f.id}, väntar ${f.vant} silver` : 'ingen'})`, !!f && (f.vant ?? 0) >= 1],
      [`framme tas silvret ur gruvan (${kvar0} → ${kvar1}) och bärs (${bar})`, bar >= 1 && kvar1 === kvar0 - bar],
      [`hemma har byn silvret (${silver0} → ${silver1})`, silver1 === silver0 + bar],
      [`en by som inte känner någon gruva (${r2?.namn ?? 'ingen'}) skickar ingen (valet ${v2?.id ?? 'inget'})`, !!r2 && v2?.id !== 'gruva'],
    ];
  },
};
