// Scenarier. Experten och mästarkunskapen (fas 4.2): experimenten vid försöksplatsen, mästarna och hur kunskapen sprids efter nivå.
import { createState, Person, State, Task } from '../../sim';
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, medBank, utanWebblasare } from './hjalp';
import { setByn } from '../../ui/lage';
import { tekInfo } from '../../ui/flikar/teknik';

// en vuxen som kan kraven till skinnkläderna (bensylen och det före), med skickligheten i hantverk h, och en slöjdbänk med skinn och rep i lagret
export function experten(seed = 3, h = 6): { s: State; p: Person } {
  const s = createState(seed, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= 20)!;
  for (const q of SIM.living(s)) q.tek = {};
  p.tek = { rep: 1, kniv: 1, flatarbank: 1, bensyl: 1 };
  p.skill.hantverk = h; p.pot.nyfikenhet = p.pot.intelligens = 12;
  medBank(s, 'flatarbank');
  SIM.setAmount(s, 'skinn', 20); SIM.setAmount(s, 'rep', 10);
  return { s, p };
}
const forsokTask = (s: State, id: string, min: number): Task => ({ act: 'forsok', phase: 'do', tx: 0, ty: 0, until: s.now + min * SIM.MIN, carry: 0, tool: id });

SCENARIER.forsok = {
  text: 'Försöksplatsen (steg 4.2.1.1): nivå 4–5 kommer man inte på i det vanliga arbetet, bara när en skicklig person som kan kraven prövar sig fram vid en station tidigare i kedjan. Försöket tar en hel sak av materialet och ger ingenting',
  kor: () => {
    const alla = SIM.TEKNIK.filter(t => t.niva >= 4), medPlats = alla.every(t => t.forsok);
    const lagre = SIM.TEKNIK.filter(t => t.niva < 4).every(t => !t.forsok);
    // vanligt hantverk i tio timmar för inte närmare skinnkläderna
    const { s, p } = experten();
    SIM.thinkWhileWorking(s, p, 'hantverk', 10 * 3600);
    const vanligt = (p.tek!.skinnklader ?? 0) === 0;
    // den skicklige prövar sig fram vid slöjdbänken
    const v = SIM.forsokVal(s, p), bank = SIM.stationerOf(s).find(t => t.k === 'flatarbank')!, at = SIM.vidStation(bank);
    const vidBank = !!v?.spot && Math.hypot(v.spot.x - at.x, v.spot.y - at.y) < 0.5;
    const fore = SIM.amountOf(s, 'skinn') + SIM.amountOf(s, 'rep');
    const tk = forsokTask(s, 'skinnklader', v?.min ?? 90);
    let n = 0;
    while (!SIM.knows(p, 'skinnklader') && n < 200) { SIM.forsokSteg(s, p, tk, 3600); SIM.forsokKlar(s, p, tk); n++; }
    const efter = SIM.amountOf(s, 'skinn') + SIM.amountOf(s, 'rep');
    const hela = Number.isInteger(efter) && fore - efter === Math.min(n, fore);
    // den som inte är skicklig nog prövar inte; inte heller utan bänken eller utan material
    const ovan = experten(3, SIM.TEKTAL.forsokSkill - 1), utanSkill = !SIM.forsokVal(ovan.s, ovan.p);
    const tom = experten(); SIM.setAmount(tom.s, 'skinn', 0); const utanMat = !SIM.forsokVal(tom.s, tom.p);
    const ingen = experten(); ingen.s.stationer = []; SIM.touch(ingen.s); const utanBank = !SIM.forsokVal(ingen.s, ingen.p);
    utanWebblasare(); setByn(s);
    const info = tekInfo(SIM.living(s), 'skinnklader'), vanlig = tekInfo(SIM.living(s), 'yxa');
    return [
      ['teknikträdet säger att man prövar sig fram vid slöjdbänken, och för yxan som förut', info.includes('pröva sig fram till det vid slöjdbänk') && !vanlig.includes('pröva sig fram')],
      [`alla ${alla.length} tekniker på nivå 4–5 har en försöksplats, och inga lägre`, medPlats && lagre],
      ['vanligt hantverk för inte närmare skinnkläderna', vanligt],
      [`den skicklige prövar sig fram till ${v ? SIM.TEK[v.id].namn.toLowerCase() : 'ingenting'} vid slöjdbänken`, v?.id === 'skinnklader' && vidBank],
      [`efter ${n} försök kan hen göra skinnkläder`, SIM.knows(p, 'skinnklader')],
      [`varje försök tog en hel sak av materialet (${fore} → ${efter})`, hela],
      ['den som inte är skicklig nog prövar inte', utanSkill],
      ['utan skinn prövar ingen', utanMat],
      ['utan slöjdbänken prövar ingen', utanBank],
    ];
  },
};

SCENARIER.forsoklust = {
  text: 'Hur ofta experten prövar sig fram (steg 4.2.1.2): seden Förnyelse – Tradition och personens nyfikenhet, och bara när byn har ett överskott av mat och ved',
  kor: () => {
    const { s, p } = experten(), T = SIM.TEKTAL;
    const c = () => SIM.forsokChans(s, p, T.forsokMat + 1, T.forsokVed + 1);
    s.seder.v.nyfikenhet = 0; p.pot.nyfikenhet = 10; const mitt = c();
    p.pot.nyfikenhet = 18; const nyfiken = c();
    p.pot.nyfikenhet = 10; s.seder.v.nyfikenhet = 1; const fornyelse = c();
    s.seder.v.nyfikenhet = -1; const tradition = c();
    s.seder.v.nyfikenhet = 0;
    const utanMat = SIM.forsokChans(s, p, T.forsokMat - 0.1, T.forsokVed + 1), utanVed = SIM.forsokChans(s, p, T.forsokMat + 1, T.forsokVed - 0.1);
    const f = (x: number) => x.toFixed(2);
    return [
      [`den nyfikne prövar oftare (${f(nyfiken)} mot ${f(mitt)})`, nyfiken > mitt * 1.5],
      [`i en by med Förnyelse oftare, med Tradition mer sällan (${f(fornyelse)}, ${f(mitt)}, ${f(tradition)})`, fornyelse > mitt && tradition < mitt],
      ['ingen prövar när maten eller veden inte räcker till ett överskott', utanMat === 0 && utanVed === 0],
    ];
  },
};
