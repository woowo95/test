// Scenarier för fas 15, grupp 20 av 15.1 (steg 15.1.178–188).
import * as SIM from '../../sim';
import { SCENARIER, kor, testBy } from './hjalp';

SCENARIER.toafrys = {
  text: 'Steg 15.1.181: toan är ett av de farliga behoven. Den som fryser farligt med full toa i ett hus i istiden byter inte uppgift i varje slag, och går på toa när hen blivit varm',
  kor: () => {
    // en vuxen i ett hus mitt i istiden, kall och med full toa; med eller utan en eld som brinner
    const fall = (eld: boolean) => {
      const s = SIM.cloneState(testBy(10));
      s.now = SIM.ageStart(s, 0) + 2 * 24 * SIM.HOUR + 2 * SIM.HOUR;
      if (eld) { SIM.setAmount(s, 'ved', 100); for (const f of SIM.eldarOf(s)) Object.assign(f, { lit: true, fuel: 4 }); }
      const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen && SIM.roomAt(s, q.x, q.y))!;
      Object.assign(p, { warm: SIM.KROPP.farligt - 0.15, toa: SIM.KROPP.toaAvbryt - 0.03, hunger: 0.9, torst: 0.9, rest: 0.6, health: 1 });
      p.task = undefined; SIM.chooseTask(s, p);
      const t0 = s.now; let tio = 0, timme = 0, forra: SIM.Task | undefined = p.task, varm: number | undefined, toa: number | undefined;
      const akt = [p.task!.act as string];
      kor(s, 2, b => {
        if (p.task !== forra) { forra = p.task; if (b.now - t0 <= 10 * SIM.MIN) tio++; if (b.now - t0 <= SIM.HOUR) timme++; akt.push(`${p.task?.act} ${Math.round((b.now - t0) / SIM.MIN)} min`); }
        if (varm === undefined && p.warm >= SIM.KROPP.farligt) varm = b.now;
        if (toa === undefined && p.task?.act === 'toa') toa = b.now;
      });
      return { tio, timme, varm: varm === undefined ? undefined : (varm - t0) / SIM.MIN, toa: toa === undefined ? undefined : (toa - t0) / SIM.MIN, akt: akt.slice(0, 6).join(', ') };
    };
    const a = fall(true), b = fall(false);
    return [
      [`med elden: högst två byten på 10 minuter (${a.tio}; ${a.akt})`, a.tio <= 2],
      [`med elden: varm efter ${a.varm} min, på toa efter ${a.toa} min, inom en timme efter att hen blivit varm`, a.varm !== undefined && a.toa !== undefined && a.toa <= a.varm + 60],
      [`utan eld: högst två byten på 10 minuter (${b.tio}; ${b.akt})`, b.tio <= 2],
      [`utan eld: nöden avbryter inte i varje slag (${b.timme} byten på en timme)`, b.timme <= 4],
    ];
  },
};
