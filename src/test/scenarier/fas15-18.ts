// Scenarier för fas 15, grupp 18 (steg 15.1.164–175).
import * as SIM from '../../sim';
import { SCENARIER, rikBy, tandEld, testBy } from './hjalp';
import { BEAT, START } from '../kor';
import { harOver } from '../../sim/marknad';
import { foretagBy } from './fas14';

SCENARIER.forstagang = {
  text: 'Steg 15.1.171: statistiken räknas en gång. Den första kunden vid disken ger raden i loggen en gång, och foretagSalt är lika med antalet köp',
  kor: () => {
    const { s, p, f, vux } = foretagBy();
    for (const q of vux) { q.hunger = 0.25; q.task = undefined; }
    p.task = undefined; p.hunger = 1;
    const salt = () => Object.values(f.salt ?? {}).reduce((a, b) => a + b, 0);
    for (let j = 0; j < 3600 && salt() < 3; j++) { s.now += 2000; SIM.step(s, 2); }
    const rader = s.log.filter(e => /blev den första kunden/.test(e.text)).length, st = s.stat?.foretagSalt ?? 0, per = s.stat?.foretagSalt_servering ?? 0;
    return [
      [`flera köp vid disken (${salt()})`, salt() >= 2],
      [`foretagSalt är lika med antalet köp (${st} mot ${salt()}, ${per} för serveringen)`, st === salt() && per === salt()],
      [`raden om den första kunden står en gång i loggen (${rader})`, rader === 1],
    ];
  },
};

SCENARIER.gastutan = {
  text: 'Steg 15.1.172: en gäst som inget lockade är inte illa bemött. Hen sänker relationen till hembyn hälften så mycket som en gäst som fått dåliga varor, med samma tal som ryktet (FRYKTE.utan)',
  kor: () => {
    const { s, f } = foretagBy(), k = SIM.klanerOf(s).find(q => q.rad !== undefined)!;
    if (!k.personer.some(q => /hövding/i.test(q.roll))) k.personer.push({ namn: 'Alvhild', sex: 'k', roll: 'hövding' }); // hövdingen väger mest, så att skillnaden syns i heltalen
    const besok = (dalig: boolean) => {
      k.inst = 0; const g = SIM.nyForetagsgast(s, f, k, 'hovding')!;
      if (dalig) g.gast!.bemott = { v: -1, n: 1 }; else for (const o of SIM.omdome) o(s, g, f); // de sämsta varorna ger omdömet −1
      const v = g.gast!.bemott?.v ?? 0, omd = g.omd?.[f.id]?.v; SIM.gastHemIgen(s, g); return { v, omd, inst: k.inst };
    };
    const utan = besok(false), dalig = besok(true), ryktet = utan.omd;
    return [
      [`gästen utan köp får omdömet FRYKTE.utan (${utan.v}), som i ryktet (${ryktet})`, utan.v === SIM.FRYKTE.utan && ryktet === SIM.FRYKTE.utan],
      [`relationen sjunker hälften så mycket utan köp (${utan.inst} mot ${dalig.inst})`, utan.inst < 0 && dalig.inst < utan.inst && Math.abs(utan.inst * 2 - dalig.inst) <= 1],
    ];
  },
};

SCENARIER.marknadover = {
  text: 'Steg 15.1.173: marknaden frågar samma sak som bytet. Den som räknas som att ha mat över på marknaden (harOver med overOf) kan också byta bort den där, och den som inte räknas så kan det inte',
  kor: () => {
    const prov = (extra: number) => {
      const s = SIM.cloneState(testBy(25)); s.marknad = undefined; s.foretag = [];
      const folk = SIM.living(s).filter(q => !q.gast && SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen && SIM.kanGa(q));
      const p = folk[0], g = folk.find(q => q !== p && !SIM.familjOf(s, p.id).includes(q) && !SIM.osams(s, q, p) && !SIM.osams(s, p, q))!, b = SIM.brukAv('mat').behov!();
      for (const k of b.slag) SIM.setAmount(s, k, 0); // ingen mat i byn: p saknar, och bara grannen har
      p.hunger = 0.2; SIM.laggIn(s, 'silver', 40, p.id);
      const n = Math.max(1, Math.ceil(b.kvar(s, g) + b.minst + extra)); SIM.put(s, 'torrkott', n, { [g.id]: n });
      p.bruk = g.bruk = undefined; g.x = p.x + 1; g.y = p.y;
      const saknar = SIM.saknarNu(s, p).includes('mat'), har = harOver(s, g, p, 'mat');
      const fore = SIM.ownFor(s, p, b); SIM.bytenMellan(s, p, g); const fick = SIM.ownFor(s, p, b) > fore + 1e-9;
      return { saknar, har, fick, n, over: SIM.overOf(s, g, b, p) };
    };
    const ja = prov(1), nej = prov(-2);
    return [
      [`den som saknar mat saknar den (${ja.saknar}, ${nej.saknar})`, ja.saknar && nej.saknar],
      [`med ${ja.n} torrkött har grannen mat över på marknaden, och bytet blir av (${ja.har}, ${ja.fick})`, ja.har && ja.fick],
      [`med ${nej.n} torrkött har grannen inget över, och inget byte blir av (${nej.har}, ${nej.fick})`, !nej.har && !nej.fick],
    ];
  },
};

SCENARIER.egetdjur = {
  text: 'Steg 15.1.164: djuren ägs som sakerna. En bybo som behöver ull och har silver saknar ett får (BRUK_DJUR) och köper det av handlaren, fåret blir hens och ullen hens; den som inte behöver ull köper inget, och hens eget får äter hens hö först',
  kor: () => {
    const s = SIM.createState(6, START);
    rikBy(s); tandEld(s); SIM.setAmount(s, 'ved', 40); SIM.setAmount(s, 'grenar', 30); SIM.setAmount(s, 'torrgras', 30);
    SIM.handlarFram(s, (SIM.handlarKlan(s) ?? SIM.handlarKlan(s, true))!.klan.rad!);
    for (let i = 0; i < 40 && s.handlare?.fas !== 'handlar'; i++) { SIM.step(s, BEAT); if (s.handlare?.fas === 'vantar') s.handlare.kvall = s.now + (BEAT - 2) * SIM.SEC; }
    const h = s.handlare!; h.utr = 'vagn'; h.bynKlar = true; delete h.affar;
    for (const p of SIM.living(s)) if (p.task?.act === 'handla') p.task = undefined;
    const vuxna = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), [a, b] = vuxna;
    h.varor = [{ k: 'levfar', n: 1 }]; h.silver = 20;
    const hk = SIM.klanById(s, SIM.hp(s, h).gast!.klan); if (hk) SIM.sattKlanPris(s, hk, { levfar: 1 }); // (klanens pris som grundvärdet)
    SIM.setAmount(s, 'ull', 0); for (const p of [a, b]) SIM.put(s, 'silver', 60, { [p.id]: 60 });
    // a väver ylle (ett recept som behöver ull), b gör inget med ull
    const recept0 = SIM.brukKrok.recept; SIM.brukKrok.recept = (s2, q) => q === a ? [{ ull: 2 }, ...recept0(s2, q)] : recept0(s2, q);
    a.bruk = b.bruk = undefined;
    const saknarA = SIM.saknarNu(s, a).includes('levfar'), saknarB = SIM.saknarNu(s, b).includes('levfar'), vA = SIM.behovAv(s, a, 'levfar'), vB = SIM.behovAv(s, b, 'levfar');
    const aff = () => s.handlare?.affar, valB = SIM.handlaVal(s, b), koarB = !!valB && !aff();
    let steg = 0;
    for (let i = 0; i < 60 && (i === 0 || aff()?.vem === a.id); i++) {
      const v = SIM.handlaVal(s, a); if (!v) break;
      a.x = v.spot.x; a.y = v.spot.y; a.task = { act: 'handla', phase: 'do', tx: v.spot.x, ty: v.spot.y, until: s.now + v.dur, carry: 0, ref: v.ref, dark: false, why: v.why } as SIM.Task;
      SIM.handlaKlar(s, a, a.task); steg++;
    }
    a.task = undefined; SIM.brukKrok.recept = recept0;
    const kopt = SIM.ownsAmount(s, a, 'levfar'); SIM.stepBoskap(s);
    const far = SIM.tamdjurOf(s).find(d => d.art === 'far' && d.agare === a.id);
    a.bruk = undefined; const sedan = SIM.behovAv(s, a, 'levfar');
    // ullen är ägarens, också när b klipper
    let ull = false; if (far) { far.ull = 1; far.born = s.now - 2 * SIM.DAY; const u0 = SIM.ownsAmount(s, a, 'ull'); SIM.klippKlar(s, b, far.id); ull = SIM.ownsAmount(s, a, 'ull') === u0 + SIM.tamArt('far').ull!; }
    // fåret äter ägarens hö före byns
    let ho = false; if (far) { SIM.put(s, 'torrgras', 3, { [a.id]: 3 }); far.hunger = 1; const e0 = SIM.ownsAmount(s, a, 'torrgras'), b0 = SIM.amountOf(s, 'torrgras') - SIM.living(s).reduce((x, q) => x + SIM.ownsAmount(s, q, 'torrgras'), 0); SIM.mataKlar(s, a, far.id); ho = SIM.ownsAmount(s, a, 'torrgras') === e0 - 1 && SIM.amountOf(s, 'torrgras') - SIM.living(s).reduce((x, q) => x + SIM.ownsAmount(s, q, 'torrgras'), 0) === b0; }
    return [
      [`den som behöver ull saknar ett får (${saknarA}, värt ${vA}), den andra inte (${saknarB}, ${vB})`, saknarA && !saknarB && vA === SIM.DELA.saknar && vB < 1],
      [`den som inte behöver ull står inte i kö för fåret (${valB?.why ?? 'inget'})`, !valB || !koarB],
      [`a köper fåret av handlaren (${kopt} efter ${steg} steg) och det blir hens (${far?.id})`, kopt === 1 && !!far],
      [`med ett eget får saknar hen inget (${sedan})`, sedan < SIM.DELA.saknar],
      ['ullen blir ägarens, också när någon annan klipper', ull],
      ['det egna fåret äter ägarens hö, inte byns', ho],
    ];
  },
};
