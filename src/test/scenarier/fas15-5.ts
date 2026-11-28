// Scenarier för fas 15, grupp 5 av 15.1.
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, byggKlart, byggare, klockan, kor, setMat, tandEld, tandOchFlinta, testBy } from './hjalp';

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

SCENARIER.byggbehov = {
  text: 'Steg 15.1.47: spärren för att försöka planera igen gäller varje byggbehov och ägare för sig. En by som saknar en sovplats planerar sovsalen strax efter att ett annat bygge blivit klart, fast ett annat behov just fick vänta, och skälet "Alla har inte en sovplats" sägs bara vid ett hus som ger en sovplats',
  kor: () => {
    const s = SIM.createState(8, START); klockan(s); byggare(s); tandEld(s); tandOchFlinta(s); SIM.setAmount(s, 'ved', 200); for (const k of ['torrgras', 'grenar', 'flinta', 'sten'] as const) SIM.setAmount(s, k, 60); SIM.setAmount(s, 'yxa', 6); SIM.setAmount(s, 'virke', 300); setMat(s, { torrkott: 400 }); for (const p of SIM.living(s)) SIM.put(s, 'torrkott', 60, { [p.id]: 60 }); SIM.stepBehov(s);
    for (const k in s.byggBehov ?? {}) s.byggBehov![k] -= 24 * SIM.HOUR;
    const saknar = SIM.homeless(s);
    // ett annat bygge pågår för byn: ett förrådshus som inte är klart
    SIM.planBuild(s);
    const forst = SIM.housesOf(s).find(h => !h.klar);
    if (!forst) return [['byn planerar ett första hus', false]];
    // tomten är röjd, så att byggarna bygger och inte fäller träd först
    const rojd = (h: SIM.Hus) => { const g = SIM.groundOf(s); for (let y = h.y - 1; y <= h.y + h.h; y++) for (let x = h.x - 1; x <= h.x + h.w; x++) g.trees[y * SIM.W + x] = 0; s.stubbar = s.stubbar?.filter(k => !(k.x >= h.x - 1 && k.y >= h.y - 1 && k.x <= h.x + h.w && k.y <= h.y + h.h)); SIM.touch(s); };
    rojd(forst); forst.fn = 'forrad';
    // en familj fick inte plats med sitt hus: just det behovet väntar
    const sok = SIM.byggSok(s), annat = 'familjehus:' + SIM.living(s)[0]!.id; sok[annat] = s.now + SIM.BYGG.omforsok * SIM.HOUR;
    // skälet medan förrådshuset byggs: ingen sovplats i det
    const skal = (h: SIM.Hus, tim = 3) => {
      for (const q of SIM.housesOf(s)) if (!q.klar) rojd(q);
      const ut: string[] = [];
      kor(s, tim, b => { for (const p of SIM.living(b)) { const tk = p.task; if (tk?.act === 'bygga' && tk.why?.includes(SIM.husIText(h))) ut.push(tk.why);  } });
      return ut;
    };
    SIM.planBuild(s);
    const underTiden = SIM.housesOf(s).filter(h => !h.klar && h.ag === undefined).length;
    const vidForrad = skal(forst, 8);
    const vantar = (SIM.byggSok(s)[annat] ?? 0) > s.now;
    byggKlart(s, forst); SIM.planBuild(s); // nästa planering, strax efter att förrådshuset blivit klart
    const ny = SIM.housesOf(s).find(h => !h.klar && h.fn === 'sovsal');
    const t0 = s.now; klockan(s, 9); if (s.now < t0) s.now += SIM.DAY; // nästa morgon
    const vidSovsal = ny ? skal(ny) : [];
    return [
      [`byn saknar sovplatser (${saknar})`, saknar > 0],
      [`medan förrådshuset byggs planeras inget annat hus för byn (${underTiden})`, underTiden === 1],
      [`det andra behovet väntar för sig (${annat})`, vantar],
      [`strax efter att förrådshuset blivit klart planeras sovsalen (${ny?.namn ?? 'inget'}, ${ny?.fn})`, !!ny && SIM.arHem(ny)],
      [`vid förrådshuset sägs inte att alla inte har en sovplats (${vidForrad.length} skäl: ${vidForrad[0] ?? '-'})`, vidForrad.length > 0 && !vidForrad.some(w => w.includes('sovplats'))],
      [`vid huset med sovplatser sägs det (${vidSovsal[0] ?? '-'})`, vidSovsal.some(w => w.includes('Alla har inte en sovplats'))],
    ];
  },
};
