// Scenarier. Experten och mästarkunskapen (fas 4.2): experimenten vid försöksplatsen, mästarna och hur kunskapen sprids efter nivå.
import { createState, Person, State, Task } from '../../sim';
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, medBank, utanWebblasare } from './hjalp';
import { setByn } from '../../ui/lage';
import { tekInfo, teknik } from '../../ui/flikar/teknik';

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

SCENARIER.episk = {
  text: 'Det episka ögonblicket (steg 4.2.1.3): när den första i byn kommer på en teknik på nivå 4–5 skrivs teknikens egen rad i krönikan, med uppfinnarens namn',
  kor: () => {
    const alla = SIM.TEKNIK.filter(t => t.niva >= 4).every(t => t.episk && t.episk.toLowerCase().includes('{namn}'));
    const { s, p } = experten(), tk = forsokTask(s, 'skinnklader', 90);
    for (let n = 0; n < 200 && !SIM.knows(p, 'skinnklader'); n++) { SIM.forsokSteg(s, p, tk, 3600); SIM.forsokKlar(s, p, tk); }
    const rader = (s.hist?.kronika ?? []).filter(r => r[2] === 'episk'), rad = rader[0]?.[1] ?? '';
    // den andra som kommer på det får ingen ny rad
    const q = SIM.living(s).find(x => x !== p && SIM.ageOf(x, s.now) >= 20)!; q.tek = { ...p.tek, skinnklader: 0 }; q.skill.hantverk = 6; q.pot.nyfikenhet = q.pot.intelligens = 12;
    for (let n = 0; n < 200 && !SIM.knows(q, 'skinnklader'); n++) { SIM.forsokSteg(s, q, tk, 3600); SIM.forsokKlar(s, q, tk); }
    const enRad = (s.hist?.kronika ?? []).filter(r => r[2] === 'episk').length === 1;
    return [
      ['varje teknik på nivå 4–5 har en egen rad med uppfinnarens namn', alla],
      [`krönikan: "${rad}"`, rader.length === 1 && rad.includes(p.name) && !rad.includes('{')],
      ['den som kommer på det sedan får ingen ny rad', SIM.knows(q, 'skinnklader') && enRad],
    ];
  },
};

SCENARIER.doltrad = {
  text: 'Teknikträdet (steg 4.2.2.2): det som ligger längre fram syns först när någon i byn kan något av det som krävs; resten räknas som okända',
  kor: () => {
    utanWebblasare();
    const s = createState(3, START); for (const q of SIM.living(s)) q.tek = {};
    setByn(s);
    const fore = teknik.html(), syns = (h: string, id: string) => h.includes(`data-tek="${id}"`);
    const p = SIM.living(s)[0]; p.tek = { rep: 1, kniv: 1, flatarbank: 1, bensyl: 1 };
    const efter = teknik.html();
    return [
      ['i en ny by syns grunden (yxan, repet) men inte skinnkläderna eller bensylen', syns(fore, 'yxa') && syns(fore, 'rep') && !syns(fore, 'skinnklader') && !syns(fore, 'bensyl') && /\+\d+ okända/.test(fore)],
      ['när någon kan bensylen syns skinnkläderna, men inte vattensäcken som kräver dem', syns(efter, 'skinnklader') && !syns(efter, 'vattensack')],
    ];
  },
};

SCENARIER.mastartitel = {
  text: 'Mästaren (steg 4.2.2.3–4.2.2.4): den som prövar sig fram mycket kallas mästare; yrket växer fram ur vanorna som de andra',
  kor: () => {
    const { s, p } = experten();
    for (const q of SIM.living(s)) { q.habit = { samla: 30, hantverk: 10 }; q.tag = undefined; }
    p.habit = { hantverk: 30, forsok: 6 };
    SIM.updateTags(s);
    const ingen = SIM.living(s).filter(q => q !== p).every(q => q.tag !== 'Mästare');
    return [
      [`den som prövat sig fram mycket kallas ${p.tag?.toLowerCase() ?? 'ingenting'}`, p.tag === 'Mästare'],
      ['de andra kallas inte mästare', ingen],
    ];
  },
};
