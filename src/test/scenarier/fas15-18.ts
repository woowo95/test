// Scenarier för fas 15, grupp 18 (steg 15.1.164–175).
import * as SIM from '../../sim';
import { SCENARIER, testBy } from './hjalp';
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
