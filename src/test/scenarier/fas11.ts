// Scenarier för fas 11: världen.
import * as SIM from '../../sim';
import { SCENARIER, kor, testBy } from './hjalp';

SCENARIER.bortafalt = {
  text: 'Borta från byn, fältet (steg 11.2.3): den som är borta är fortfarande bybo och äger sitt, men finns inte på bykartan, ritas inte och väljs inte till något, och kommer tillbaka med allt sitt',
  kor: () => {
    const s = SIM.cloneState(testBy(10)), vuxna = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= 18);
    const p = vuxna.sort((a, b) => b.id - a.id)[0], x = p.x, y = p.y;
    const ager = () => SIM.tingOf(s).filter(g => g.agare === p.id).map(g => g.id).sort().join(',');
    // det hen har på sig, inte bördan i händerna
    const bar = () => SIM.tingOf(s).filter(g => g.hos === p.id && !p.task?.ting?.includes(g.id)).map(g => g.id).sort().join(',');
    const agerFore = ager(), barFore = bar();
    SIM.gaBort(s, p);
    const borta = !SIM.living(s).includes(p) && SIM.alive(p) && SIM.ute(p);
    // sex timmar utan hen: ingen väljer hen till något (samtal, hjälp, strid), och hen gör inget själv
    let valdes = 0, gjorde = 0;
    kor(s, 6, () => {
      if (p.task) gjorde++;
      for (const q of SIM.living(s)) if (q.task && [q.task.med, q.task.fran, q.task.bar].includes(p.id)) valdes++; // fälten som pekar på en annan person
    });
    const stod = p.x === x && p.y === y;
    const agerUnder = ager();
    SIM.kommHem(p, x + 1, y);
    const barHem = bar(), hemma = SIM.living(s).includes(p) && !SIM.ute(p) && p.x === x + 1 && p.y === y;
    kor(s, 1);
    return [
      ['den som är borta är bybo men inte i byn', borta],
      [`hen gör inget i byn medan hen är borta (${gjorde} gånger)`, gjorde === 0 && stod],
      [`ingen i byn väljer hen till något (${valdes} gånger)`, valdes === 0],
      ['hen äger sitt medan hen är borta', agerUnder === agerFore],
      [`hen kommer hem till rutan, är i byn igen och har med sig det hen har på sig (${barFore.split(',').filter(Boolean).length} saker)`, hemma && barHem === barFore],
      ['hen är i byn och lever vidare efter en timme', SIM.living(s).includes(p) && !!p.task],
    ];
  },
};

SCENARIER.borta = {
  text: 'Borta från byn, genomgången (steg 11.2.4): den som är borta äter, dricker, röstar, smittas och väljs inte i byn, ingen finns på två ställen, och byn grundas inte om när alla är borta',
  kor: () => {
    const s = SIM.cloneState(testBy(10)), folk = SIM.living(s).sort((a, b) => a.id - b.id);
    const borta = folk.filter((_, i) => i % 2 === 1);
    for (const p of borta) SIM.gaBort(s, p);
    const fore = borta.map(p => ({ p, hunger: p.hunger, torst: p.torst, sjuk: JSON.stringify(p.sjuk ?? null), x: p.x, y: p.y }));
    const roster = () => SIM.vikter(s).map(v => v.p);
    let pekas = 0, tva = 0, roster0 = 0;
    const ids = new Set(borta.map(p => p.id));
    kor(s, 12, () => {
      for (const q of SIM.living(s)) {
        if (ids.has(q.id)) tva++;
        const t = q.task;
        if (t && [t.med, t.fran, t.bar, t.ref].some(id => ids.has(id as number))) pekas++;
      }
      if (roster().some(p => ids.has(p.id))) roster0++;
    });
    const orort = fore.every(f => f.p.hunger === f.hunger && f.p.torst === f.torst && JSON.stringify(f.p.sjuk ?? null) === f.sjuk && f.p.x === f.x && f.p.y === f.y);
    const lever = borta.every(p => SIM.alive(p) && SIM.ute(p) && s.people.includes(p));
    // alla går bort: byn är inte tom, för byborna lever
    const alla = SIM.living(s).concat(borta), nr = s.people.length; // också de som fötts medan hälften var borta
    for (const p of alla) SIM.gaBort(s, p);
    kor(s, 2);
    const inteOmgrundad = s.people.length === nr && alla.every(p => SIM.alive(p)) && SIM.living(s).length === 0;
    for (const p of alla) SIM.kommHem(p, p.x, p.y);
    kor(s, 1);
    return [
      ['de som är borta lever och är bybor', lever],
      [`den som är borta finns inte bland dem i byn (${tva} gånger)`, tva === 0],
      [`ingen i byn har ett arbete som pekar på den som är borta (${pekas} gånger)`, pekas === 0],
      [`den som är borta röstar inte i byn (${roster0} gånger)`, roster0 === 0],
      ['den som är borta äter, dricker, smittas och flyttar sig inte i byn', orort],
      ['när alla är borta grundas byn inte om och ingen ny kommer', inteOmgrundad],
      ['alla kommer hem och är i byn igen', SIM.living(s).length === alla.length],
    ];
  },
};
