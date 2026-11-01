// Scenarier. Religionen (fas 4.1): andligheten, upplevelserna hela livet, tron, nivåerna och gudarna.
import { createState, Person } from '../../sim';
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, nyInvanare } from './hjalp';

SCENARIER.andlighet = {
  text: 'Andligheten (steg 4.1.1.1): alla har en mellan 0 och 100, grundarna spridda över hela skalan, barnen delvis som föräldrarna, och den syns först när den första tron finns',
  kor: () => {
    const s = createState(9, START);
    const alla = SIM.living(s), inom = alla.every(p => p.andlig !== undefined && p.andlig >= 0 && p.andlig <= 100);
    // många grundare: spridda över skalan
    const ny = Array.from({ length: 200 }, () => { const p = nyInvanare(s, 'k', 20); return p.andlig!; });
    const lag = ny.filter(v => v < 25).length, hog = ny.filter(v => v > 75).length;
    // barnen till två mycket andliga och två världsliga
    const barnAv = (v: number) => {
      const mo = nyInvanare(s, 'k', 30), fa = nyInvanare(s, 'm', 30); mo.andlig = fa.andlig = v;
      let sum = 0; for (let i = 0; i < 40; i++) sum += SIM.newPerson(s, 'k', s.now, mo, fa).andlig!;
      return sum / 40;
    };
    const hogt = barnAv(95), lagt = barnAv(5);
    const syns = SIM.andligSyns(s);
    s.tron = [{ id: 1 } as SIM.Tro];
    return [
      [`alla i byn har en andlighet mellan 0 och 100 (${alla.map((p: Person) => p.andlig).join(', ')})`, inom],
      [`nykomlingarna är spridda över skalan (${lag} under 25 och ${hog} över 75 av 200)`, lag > 30 && hog > 30],
      [`barnen ärver delvis: snittet ${Math.round(hogt)} hos barnen till två med 95, ${Math.round(lagt)} till två med 5`, hogt > 65 && lagt < 35 && hogt < 95],
      ['andligheten syns först när den första tron finns', !syns && SIM.andligSyns(s)],
    ];
  },
};

SCENARIER.vuxenliv = {
  text: 'Upplevelser hela livet (steg 4.1.1.2): en förälder som mister sitt barn minns det, likaså den som mister sin partner, den som blir lämnad och den gamla som ser alla jämnåriga dö; upplevelserna från vuxenlivet står för sig i Livet',
  kor: () => {
    const s = createState(9, START);
    const chans = Object.fromEntries(Object.entries(SIM.UPPLEVELSER).map(([k, d]) => [k, d.chans]));
    for (const d of Object.values(SIM.UPPLEVELSER)) d.chans = 3; // allt fastnar, så att provet inte beror på slumpen
    try {
      const har = (p: Person, k: string) => !!p.upp?.some(u => u.k === k && u.v === 1);
      const mor = nyInvanare(s, 'k', 30), far = nyInvanare(s, 'm', 32), barn = nyInvanare(s, 'm', 2);
      barn.mother = mor.id; barn.father = far.id; SIM.pair(s, mor, far, true);
      SIM.die(s, barn, 'olycka');
      const a = nyInvanare(s, 'k', 40), b = nyInvanare(s, 'm', 41); SIM.pair(s, a, b, true);
      SIM.die(s, a, 'olycka');
      const c = nyInvanare(s, 'k', 30), d = nyInvanare(s, 'm', 30); SIM.pair(s, c, d, true);
      SIM.skiljas(s, c, d, SIM.getRel(s, c, d));
      const g1 = nyInvanare(s, 'k', 70), g2 = nyInvanare(s, 'm', 71);
      for (const q of SIM.living(s)) if (q !== g1 && q !== g2 && Math.abs(q.born - g1.born) <= SIM.UPPV.jamnarig * SIM.DAY) SIM.die(s, q, 'olycka');
      SIM.die(s, g2, 'olycka');
      return [
        [`föräldrarna minns att de miste sitt barn (${(mor.upp ?? []).map(SIM.upplevelseText).join('; ')})`, har(mor, 'barnDod') && har(far, 'barnDod')],
        [`den som miste sin partner minns det (${(b.upp ?? []).map(SIM.upplevelseText).join('; ')})`, !!b.upp?.some(u => u.v === 1 && SIM.upplevelseText(u).includes('sin partner'))],
        [`den som blev lämnad minns det (${(d.upp ?? []).map(SIM.upplevelseText).join('; ')}), inte den som lämnade`, har(d, 'lamnad') && !har(c, 'lamnad')],
        [`den gamla som såg alla jämnåriga dö (${(g1.upp ?? []).map(SIM.upplevelseText).join('; ')})`, har(g1, 'gammal')],
        ['de vuxnas upplevelser har en tid och räknas', mor.upp!.every(u => u.t !== undefined) && (s.stat?.upp_vuxen ?? 0) >= 4],
      ];
    } finally {
      for (const [k, d] of Object.entries(SIM.UPPLEVELSER)) d.chans = chans[k];
    }
  },
};

SCENARIER.andeupplevelse = {
  text: 'Upplevelser som flyttar andligheten (steg 4.1.1.3): åt ett håll som lottas, oftare uppåt ju andligare hen redan är, mer hos ett barn än hos en vuxen, och andligheten är den medfödda plus upplevelserna inom 0–100',
  kor: () => {
    const s = createState(9, START);
    const chans = Object.fromEntries(Object.entries(SIM.UPPLEVELSER).map(([k, d]) => [k, d.chans]));
    for (const d of Object.values(SIM.UPPLEVELSER)) d.chans = 3;
    try {
      const andel = (v: number) => {
        let upp = 0;
        for (let i = 0; i < 100; i++) { const p = nyInvanare(s, 'k', 30); p.andlig = v; SIM.upplev(s, p, 'hardVinter'); if ((p.upp?.[0]?.n ?? 0) > 0) upp++; }
        return upp;
      };
      const hog = andel(90), lag = andel(10);
      const v = nyInvanare(s, 'm', 30), b = nyInvanare(s, 'm', 8);
      SIM.upplev(s, v, 'skadad', 'x'); SIM.upplev(s, b, 'skadad', 'x');
      const vn = Math.abs(v.upp?.[0]?.n ?? 0), bn = Math.abs(b.upp?.[0]?.n ?? 0);
      const t = nyInvanare(s, 'k', 30); t.andlig = 98; SIM.upplev(s, t, 'svalt'); SIM.upplev(s, t, 'frys');
      const ingen = nyInvanare(s, 'k', 30); SIM.upplev(s, ingen, 'flyttade');
      return [
        [`den andliga (90) ser oftare ett tecken: uppåt ${hog} av 100, den världsliga (10) ${lag} av 100`, hog > 60 && lag < 40],
        [`ett barn flyttas mer än en vuxen (${bn} mot ${vn})`, vn > 0 && bn > vn],
        [`andligheten är den medfödda plus upplevelserna, inom 0–100 (${SIM.andlighet(s, t)})`, SIM.andlighet(s, t) >= 0 && SIM.andlighet(s, t) <= 100 && SIM.andlighet(s, t) === Math.max(0, Math.min(100, 98 + t.upp!.reduce((a, u) => a + (u.n ?? 0), 0)))],
        ['en rad utan ande flyttar inte andligheten', !!ingen.upp?.length && ingen.upp.every(u => u.n === undefined)],
      ];
    } finally {
      for (const [k, d] of Object.entries(SIM.UPPLEVELSER)) d.chans = chans[k];
    }
  },
};
