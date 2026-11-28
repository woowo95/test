// Scenarier för fas 15, grupp 17 (steg 15.1.161–15.1.170).
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, klockan } from './hjalp';

SCENARIER.hundvarg = {
  text: 'Steg 15.1.168: vakthunden skrämmer vargarna. En lojal hund nära djuret räknas som en vaken vakt för flocken, på dubbla avståndet (VAKTHUND.skrammer × VARG.vaken), så en hungrig flock tar inte ett får med en lojal hund bredvid men tar ett utan',
  kor: () => {
    const varg = (hund: number | undefined) => {
      const s = SIM.createState(3, START); klockan(s, 2); s.kal = SIM.nyKalender(s.now, SIM.ISTID);
      const folk = SIM.living(s);
      for (const q of folk) q.task = { act: 'sova', phase: 'do', tx: q.x, ty: q.y, until: s.now + 20 * SIM.HOUR, carry: 0 };
      const c = SIM.bynsMitt(s), d = SIM.nyttTamdjur(s, 'far', c.x + 12, c.y);
      if (hund !== undefined) { const h = SIM.nyttTamdjur(s, 'hund', d.x + 1, d.y + 1, folk[0]!.id); h.lojal = hund; }
      const f: SIM.Vargflock = { id: s.vargNr = 1, vargar: [10_000_008, 10_000_009], x: d.x + 10, y: d.y, mx: d.x + 10, my: d.y, gar: s.now + 48 * SIM.HOUR, hunger: 0.9, gor: 'stryker', sedd: s.now };
      (s.vargar ??= []).push(f);
      let i = 0;
      for (; i < 1500 && SIM.tamdjurOf(s).includes(d); i++) { s.now += 10 * SIM.SEC; SIM.vargSteg(s, 10); }
      return { tagen: !SIM.tamdjurOf(s).includes(d), min: Math.round(i / 6) };
    };
    const utan = varg(undefined), med = varg(0.9), olojal = varg(0.3);
    return [
      [`flocken tar fåret utan hund (efter ${utan.min} minuter)`, utan.tagen],
      ['flocken tar inte fåret med en lojal hund bredvid på fyra timmar', !med.tagen],
      [`en hund som inte är lojal skyddar inte fåret (${olojal.tagen ? 'taget' : 'kvar'})`, olojal.tagen],
    ];
  },
};
