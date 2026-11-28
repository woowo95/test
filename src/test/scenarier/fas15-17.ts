// Scenarier för fas 15, grupp 17 (steg 15.1.161–15.1.170).
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, klockan, kor, nyInvanare, testBy } from './hjalp';

SCENARIER.bjorngris = {
  text: 'Steg 15.1.166: björnen tar grisar. En gris som går lös nära björnen, utan någon vaken bredvid, tas med en chans per tid (samma prov som vargen, vaktat i tamdjur.ts); en gris i fähuset tas inte, och inte en med en vaken bredvid',
  kor: () => {
    const prova = (hur: 'ute' | 'fahus' | 'vaken') => {
      const s = SIM.createState(6, START);
      let t0: number | undefined;
      for (let t = s.now; t < s.now + 60 * SIM.DAY && t0 === undefined; t += 20 * SIM.MIN) if (SIM.bjornarOf(s, t).some(d => d.art === 'bjorn')) t0 = t;
      if (t0 === undefined) return undefined;
      s.now = t0;
      const folk = SIM.living(s), vakt = folk[0]!;
      for (const q of folk) q.task = { act: 'sova', phase: 'do', tx: q.x, ty: q.y, until: s.now + 30 * SIM.HOUR, carry: 0 };
      const b0 = SIM.bjornarOf(s).find(d => d.art === 'bjorn')!, g = SIM.nyttTamdjur(s, 'gris', b0.x + 1.5, b0.y);
      let min = 0, bjornNara = 0;
      for (; min < 24 * 60 && SIM.tamdjurOf(s).includes(g); min++) {
        s.now += SIM.MIN;
        const b = SIM.bjornarOf(s).find(d => d.art === 'bjorn');
        if (!b) continue;
        bjornNara++;
        g.x = b.x + 1.5; g.y = b.y; if (hur === 'fahus') g.fahus = 1;
        if (hur === 'vaken') { vakt.task = undefined; vakt.x = g.x + 1; vakt.y = g.y + 1; const ar = SIM.yearNo(s, s.now); if (s.bjornMott?.ar !== ar) s.bjornMott = { ar, ids: [] }; if (!s.bjornMott.ids.includes(vakt.id)) s.bjornMott.ids.push(vakt.id); }
        SIM.bjornSteg(s, 60);
      }
      return { tagen: !SIM.tamdjurOf(s).includes(g), min, bjornNara, stat: s.stat?.bjornTogGris ?? 0 };
    };
    const ute = prova('ute'), inne = prova('fahus'), vaken = prova('vaken');
    if (!ute || !inne || !vaken) return [['ett ögonblick med björnen', false]];
    return [
      [`björnen tar grisen som går lös nära den inom ett dygn (efter ${ute.min} minuter, björnen nära i ${ute.bjornNara})`, ute.tagen && ute.stat === 1],
      [`grisen i fähuset tas inte (björnen nära i ${inne.bjornNara} minuter)`, !inne.tagen && inne.bjornNara > 60],
      [`grisen med en vaken bredvid tas inte (björnen nära i ${vaken.bjornNara} minuter)`, !vaken.tagen && vaken.bjornNara > 60],
    ];
  },
};

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
