// Scenarier för fas 15, grupp 5 av 15.1.
import * as SIM from '../../sim';
import { SCENARIER, klockan, kor, testBy } from './hjalp';

// barnen som har sin egen natt: över det lilla barnets ålder och under den som hjälper till
const nattBarn = (s: SIM.State) => SIM.living(s).filter(p => { const a = SIM.ageOf(p, s.now); return a >= SIM.ALDER.smabarn && a < SIM.ALDER.hjalper; });

SCENARIER.barnnatt = {
  text: 'Steg 15.1.46: barnets natt kommer ur kroppen som de vuxnas: ett utvilat barn med fyllt umgänge går inte fram och tillbaka mellan sängen och elden, ett trött barn sover, och barnets samtal har en längd som de vuxnas',
  kor: () => {
    const s = SIM.cloneState(testBy(10, b => nattBarn(b).length > 0)); klockan(s, 23);
    const barn = nattBarn(s);
    for (const p of barn) { Object.assign(p, { hunger: 0.95, rest: 1, social: 1, toa: 0.95, torst: 0.95, warm: 1, health: 1 }); p.task = undefined; }
    // hur ofta barnet byter mellan sängen (sova, vila) och elden (samtal) under fyra timmar
    const plats = (p: SIM.Person) => { const a = p.task?.act; return a === 'samtal' ? 'elden' : a === 'sova' || a === 'vila' ? 'sangen' : undefined; };
    const forra = new Map<number, string>(), byten = new Map<number, number>();
    kor(s, 4, b => {
      for (const p of nattBarn(b)) {
        const pl = plats(p); if (!pl) continue;
        const f = forra.get(p.id);
        if (f && f !== pl) byten.set(p.id, (byten.get(p.id) ?? 0) + 1);
        forra.set(p.id, pl);
      }
    });
    const mest = Math.max(0, ...byten.values());
    // ett trött barn väljer att sova, ett ensamt barn sitter med de vuxna en stund som de vuxna
    const t = SIM.cloneState(s); klockan(t, 23);
    const p = nattBarn(t)[0]!, valj = (x: Partial<SIM.Person>) => { Object.assign(p, x); p.task = undefined; SIM.chooseTask(t, p); return p.task as SIM.Task | undefined; };
    let sover = 0, prat = 0, pratLangd = true;
    for (let i = 0; i < 40; i++) {
      if (valj({ rest: 0.2, social: 1 })?.act === 'sova') sover++;
      const k = valj({ rest: 1, social: 0.1 });
      if (k?.act === 'samtal') { prat++; const d = (k.until - t.now) / SIM.MIN; if (d > SIM.VAL.nattPrat + SIM.VAL.nattPratSpann + 5) pratLangd = false; }
    }
    return [
      [`det finns barn med en egen natt (${barn.length})`, barn.length > 0],
      [`ett utvilat barn går inte fram och tillbaka mellan sängen och elden (högst ${mest} byten på fyra timmar)`, mest <= 2],
      [`ett trött barn sover (${sover} av 40)`, sover >= 30],
      [`ett barn som saknar umgänge sitter med de vuxna (${prat} av 40)`, prat >= 20],
      ['barnets samtal har de vuxnas längd (VAL.nattPrat och nattPratSpann)', pratLangd],
    ];
  },
};
