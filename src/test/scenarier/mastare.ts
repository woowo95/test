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
      [`kortet säger vad den som prövar sig fram försöker komma på (steg 9.2.106): "${SIM.taskName({ act: 'forsok', phase: 'do', tx: 0, ty: 0, until: 0, carry: 0, tool: 'snara' })}"`, SIM.taskName({ act: 'forsok', phase: 'do', tx: 0, ty: 0, until: 0, carry: 0, tool: 'snara' }) === 'Försöker komma på hur man binder en snara' && alla.every(t => t.forsok?.vad.startsWith('hur'))],
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
  text: 'Hur ofta experten prövar sig fram (steg 4.2.1.2): seden Förnyelse – Tradition och personens nyfikenhet, och mer ju större överskott byn har av mat och ved',
  kor: () => {
    const { s, p } = experten();
    const c = () => SIM.forsokChans(s, p, SIM.TROSKEL.forsokMat + 1, SIM.TROSKEL.forsokVed + 1);
    s.seder.v.nyfikenhet = 0; p.pot.nyfikenhet = 10; const mitt = c();
    p.pot.nyfikenhet = 18; const nyfiken = c();
    p.pot.nyfikenhet = 10; s.seder.v.nyfikenhet = 1; const fornyelse = c();
    s.seder.v.nyfikenhet = -1; const tradition = c();
    s.seder.v.nyfikenhet = 0;
    // överskottet är en faktor (steg 10.2.43): utan mat eller ved prövar ingen, med lite prövar man mindre än med ett fullt överskott
    const full = SIM.forsokChans(s, p, SIM.TROSKEL.forsokMat + 1, SIM.TROSKEL.forsokVed + 1), utanMat = SIM.forsokChans(s, p, 0, SIM.TROSKEL.forsokVed + 1), utanVed = SIM.forsokChans(s, p, SIM.TROSKEL.forsokMat + 1, 0), halvt = SIM.forsokChans(s, p, SIM.TROSKEL.forsokMat / 2, SIM.TROSKEL.forsokVed + 1);
    const f = (x: number) => x.toFixed(2);
    return [
      [`den nyfikne prövar oftare (${f(nyfiken)} mot ${f(mitt)})`, nyfiken > mitt * 1.5],
      [`i en by med Förnyelse oftare, med Tradition mer sällan (${f(fornyelse)}, ${f(mitt)}, ${f(tradition)})`, fornyelse > mitt && tradition < mitt],
      [`ingen prövar utan mat eller ved, och med halva överskottet prövar man mindre (${halvt.toFixed(4)} mot ${full.toFixed(4)})`, utanMat === 0 && utanVed === 0 && halvt > 0 && halvt < full],
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

// två vuxna som gör handarbete på samma plats (eller långt ifrån varandra); a kan det som b lär sig
const hantverk = (s: State, p: Person, x: number, y: number) => { p.x = x; p.y = y; p.task = { act: 'hantverk', phase: 'do', tx: x, ty: y, until: s.now + 8 * SIM.HOUR, carry: 0 }; return p.task; };
const vuxna = (s: State) => SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= 20);

SCENARIER.nivaprat = {
  text: 'Spridningen efter nivå (steg 4.2.3.1): i samtal lärs bara nivå 1–2 ut, som förut; det svårare lär man sig inte i prat',
  kor: () => {
    const { s, p } = experten(); const [a, b] = [p, vuxna(s).find(q => q !== p)!];
    a.tek = { rep: 1, kniv: 1, flatarbank: 1, bensyl: 1, skinnklader: 1, metspo: 1, fiskespjut: 1 };
    b.tek = { rep: 1, kniv: 1, flatarbank: 1, fiskespjut: 1 };
    for (let i = 0; i < 300; i++) SIM.teach(s, a, b, SIM.SAMTALSSLAG['berättelse'], 3);
    const n = (id: string) => SIM.TEK[id].niva;
    return [
      [`nivå 2 (metspö, nivå ${n('metspo')}) lärs ut i samtal`, SIM.knows(b, 'metspo')],
      [`nivå 3 (bensyl) och nivå 4 (skinnkläder) lärs inte ut i samtal`, n('bensyl') === 3 && (b.tek!.bensyl ?? 0) === 0 && (b.tek!.skinnklader ?? 0) === 0],
    ];
  },
};

SCENARIER.bredvid = {
  text: 'Att arbeta bredvid (steg 4.2.3.2): nivå 3 lär man sig av den som kan och gör samma slags arbete nära en, inte långt bort',
  kor: () => {
    const { s, p } = experten(); const [a, b, c] = [p, ...vuxna(s).filter(q => q !== p)];
    for (const q of [b, c]) { q.tek = { rep: 1, kniv: 1, flatarbank: 1 }; q.pot.intelligens = 10; }
    hantverk(s, a, 50, 50); const tb = hantverk(s, b, 51, 50), tc = hantverk(s, c, 80, 80);
    let tim = 0;
    while (!SIM.knows(b, 'bensyl') && tim < 100) { SIM.arbetaBredvid(s, b, tb, 3600); SIM.arbetaBredvid(s, c, tc, 3600); tim++; }
    // den som inte arbetar lär inte ut
    const { s: s2, p: a2 } = experten(); const b2 = vuxna(s2).find(q => q !== a2)!; b2.tek = { rep: 1, kniv: 1, flatarbank: 1 };
    hantverk(s2, a2, 50, 50); a2.task = undefined; const tb2 = hantverk(s2, b2, 51, 50);
    for (let i = 0; i < 50; i++) SIM.arbetaBredvid(s2, b2, tb2, 3600);
    return [
      [`efter ${tim} timmar bredvid den som kan bensyl kan hen det`, SIM.knows(b, 'bensyl') && tim > 2],
      ['den som arbetar långt bort lär sig inget', (c.tek!.bensyl ?? 0) === 0],
      ['bredvid den som inte arbetar lär man sig inget', (b2.tek!.bensyl ?? 0) === 0],
    ];
  },
};

SCENARIER.larling = {
  text: 'Lärlingen (steg 4.2.3.3): nivå 4–5 lärs bara som lärling; den som kom på tekniken är den första mästaren, och en mästare har en lärling i taget',
  kor: () => {
    const { s, p } = experten(); const m = p; m.tek!.skinnklader = 1;
    const andra = vuxna(s).filter(q => q !== m); for (const q of andra) q.tek = { rep: 1, kniv: 1, flatarbank: 1, bensyl: 1 };
    // utan att vara lärling lär man sig inte nivå 4 bredvid mästaren
    const [x] = andra; hantverk(s, m, 50, 50); const tx = hantverk(s, x, 51, 50);
    for (let i = 0; i < 40; i++) SIM.arbetaBredvid(s, x, tx, 3600);
    const utan = (x.tek!.skinnklader ?? 0) === 0;
    SIM.stepLarlingar(s); SIM.stepLarlingar(s);
    const larl = SIM.living(s).filter(q => q.lar?.av === m.id), l = larl[0];
    let tim = 0;
    if (l) { const tl = hantverk(s, l, 51, 50); while (!SIM.knows(l, 'skinnklader') && tim < 300) { SIM.arbetaBredvid(s, l, tl, 3600); tim++; } }
    const klar = !!l && SIM.knows(l, 'skinnklader') && !l.lar;
    SIM.stepLarlingar(s);
    const nya = SIM.living(s).filter(q => q.lar?.tek === 'skinnklader');
    return [
      ['den som inte är lärling lär sig inte skinnkläderna bredvid mästaren', utan],
      [`mästaren ${m.name} tar en lärling, och bara en (${larl.map(q => q.name).join(', ')})`, larl.length === 1],
      [`efter ${tim} timmars arbete kan lärlingen det, och är inte lärling längre`, klar && tim >= SIM.TEKTAL.larlingTim * 0.5],
      ['nu har både mästaren och den förra lärlingen var sin ny lärling', nya.length === 2 && new Set(nya.map(q => q.lar!.av)).size === 2],
    ];
  },
};

SCENARIER.forlust = {
  text: 'Förlusten (steg 4.2.3.4): dör mästaren innan lärlingen lärt sig klart blir det ett halvminne; krönikan skriver att konsten dog, och teknikträdet varnar när bara en kan något',
  kor: () => {
    utanWebblasare();
    const { s, p } = experten(); const m = p; m.tek!.skinnklader = 1;
    for (const q of vuxna(s).filter(q => q !== m)) q.tek = { rep: 1, kniv: 1, flatarbank: 1, bensyl: 1 };
    setByn(s);
    const varning = tekInfo(SIM.living(s), 'skinnklader').includes('Bara ' + m.name) && teknik.html().includes('antal ensam');
    SIM.stepLarlingar(s);
    const l = SIM.living(s).find(q => q.lar?.av === m.id)!; l.tek!.skinnklader = 0.4;
    SIM.die(s, m, 'alderdom');
    const rad = (s.hist?.kronika ?? []).filter(r => r[2] === 'forlust').map(r => r[1])[0] ?? '';
    const halv = !l.lar && l.halvminne?.includes('skinnklader') && l.tek!.skinnklader === 0.4;
    const info = tekInfo(SIM.living(s), 'skinnklader');
    return [
      ['teknikträdet varnar när bara mästaren kan det', varning],
      [`lärlingen ${l.name} har det hen lärt sig kvar som ett halvminne`, !!halv && info.includes('halvminne')],
      [`krönikan: "${rad}"`, rad.includes(m.name) && /dog konsten/.test(rad) && rad.includes(l.name)],
    ];
  },
};
