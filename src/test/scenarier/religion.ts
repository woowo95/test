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
