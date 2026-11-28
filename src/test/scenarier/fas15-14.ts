// Scenarier för fas 15, grupp 14 (steg 15.1.129–15.1.140).
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, klockan } from './hjalp';

// en jägare fångar haren d (som jaktKlar gör när försöket slutar med en fångst)
function fanga(s: SIM.State, p: SIM.Person, d: { id: number; x: number; y: number }) {
  const tk: SIM.Task = { act: 'jakt', phase: 'do', tx: d.x, ty: d.y, until: s.now + SIM.HOUR, carry: 0, why: 'test' };
  tk.jf = { t: s.now, id: d.id, x: d.x, y: d.y, sx: p.x, sy: p.y, v: 'sten', stopp: 1, kast: -1, sett: false, ut: 'fangad', extra: 0, g: 0, blod: 1 };
  p.task = tk; SIM.jaktKlar(s, p, tk);
}

SCENARIER.harutjakt = {
  text: 'Steg 15.1.129: hararna jagas ut. En grupp som jagats fem gånger har färre harar än en orörd grupp på samma plats, en dödad hare räknas en gång, och gruppen har fler igen efter återväxten',
  kor: () => {
    const s = SIM.createState(6, START); klockan(s, 10);
    const g0 = SIM.grupperOf(s).sort((a, b) => b.n - a.n)[0]!, orord = SIM.cloneState(s), p = SIM.living(s)[0]!;
    const syns = (b: SIM.State) => SIM.djurOf(b, b.now, []).filter(d => d.grupp === g0.id).length;
    const fore = syns(s);
    let fangade = 0;
    for (let i = 0; i < 5; i++) {
      const d = SIM.djurOf(s, s.now, []).find(q => q.grupp === g0.id);
      if (!d) break;
      fanga(s, p, d); fangade++;
    }
    const grupp = (b: SIM.State, t = b.now) => SIM.grupperOf(b, t).find(g => g.id === g0.id);
    const n = grupp(s)!.n, nOrord = grupp(orord)!.n, synsNu = syns(s);
    // återväxten: lagret växer tillbaka (FYND.jakt.uttag.regrow), och gruppen räknas som den var på platsen
    const t0 = s.now;
    SIM.growFynd(s, 600, 2);
    const nAter = grupp(s, t0)!.n;
    return [
      [`gruppen hade ${g0.n} harar (${fore} syns), och ${fangade} fångades`, fangade >= Math.min(5, g0.n) && fore === g0.n],
      [`den jagade gruppen har färre harar (${n}) än den orörda (${nOrord})`, n < nOrord],
      [`en dödad hare räknas en gång: ${synsNu} syns, och lagret säger ${n}`, synsNu === Math.min(n, g0.n0 - fangade) && synsNu <= g0.n - Math.min(fangade, g0.n) + 1],
      [`gruppen har fler igen efter återväxten (${n} → ${nAter})`, nAter > n],
    ];
  },
};
