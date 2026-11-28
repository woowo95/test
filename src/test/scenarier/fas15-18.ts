// Scenarier för fas 15, grupp 18 (steg 15.1.164–175).
import * as SIM from '../../sim';
import { SCENARIER } from './hjalp';
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
