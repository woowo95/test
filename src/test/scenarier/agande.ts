// Scenarier. Ägande och ekonomi: ägande, gåvor, byte, egendom, delning, arv och värde.
import { isDeepStrictEqual } from 'node:util';
import { Person, Act, Task, createState, bearbeta, ownedBy, tidyTools, addTool, toolsOf, heldBy, take, usesTool, wearTool, freeSpear, getRel, isTool, BYN, makeTool, step, living, pilesOf, amountOf, capacity, isLight, isStored, spears, HOUR, State, migrate, die, bitsOf, KANIN, DJUR, askForTool, askForGift, gain, takeFood, takeFuel, ownsAmount, ownedStock, ownedSum, sumOf, addTo, setAmount, foodOf, STACK_ORDER, needLadder, takeMaterial, BEAT, stepDelning, rikedom, rikedomDelar, grundvarde, nivaOf, DELNING, packUp, releaseOwner, willing, tingOf, EKONOMI, SAK_LIST, ownedAll, leave, chooseTask, stackOf, birth, SAKER, viktOf, bordOf, BORDA_KG, handerFor, bordPlats, utrustning, PLATS_LIST, cloneState, pickUp, load, byId } from '../../sim';
import * as SIM from '../../sim';
import { START, STEG_DYGN, STEG_TIM } from '../kor';
import { setItems, setMat, setFood, kor, tandEld, tomtForrad, treVuxna, SCENARIER, rikBy, medBank } from './hjalp';

SCENARIER.agande = {
  text: 'Varje redskap är ett ting med ägare och skick. Den som gör det äger det, det gamla och det en död lämnar är byns. Man har redskapet man arbetar med i handen, tar sitt eget först, behåller det egna i handen och lägger tillbaka byns. Man lånar av släkt och vänner, inte av ovänner',
  kor: () => {
    const s = createState(4, START);
    setItems(s, { grenar: 20, flinta: 2, yxa: 1 });
    tandEld(s);
    for (const q of s.people) q.tek = { fiskespjut: 1 };
    const [a, b, c] = living(s);
    tidyTools(s);
    const yxaByns = toolsOf(s, 'yxa')[0]?.agare === BYN;
    setAmount(s, 'fiskespjut', 1); tidyTools(s); // ett spjut som är byns
    makeTool(s, a, 'spjut');
    const gjorda = ownedBy(s, a).length === 1 && spears(s) === 2;
    const task = (p: Person, act: Act, tool?: string) => { p.task = { act, phase: 'do', tx: p.x, ty: p.y, until: s.now + HOUR, carry: 0, tool }; if (usesTool(p.task)) take(s, p, tool!); };
    task(a, 'fiske', freeSpear(s, a));
    const egetForst = heldBy(s, a)?.agare === a.id;
    task(c, 'fiske', freeSpear(s, c));
    const bynsTill = heldBy(s, c)?.agare === BYN;
    a.task = undefined; c.task = undefined; tidyTools(s);
    const behaller = heldBy(s, a)?.agare === a.id && !heldBy(s, c);
    setAmount(s, 'fiskespjut', 1); tidyTools(s); // byns spjut går förlorat; bara a:s finns kvar, i a:s hand
    getRel(s, a, b).op = 10;
    const lanar = freeSpear(s, b) === 'fiskespjut';
    task(b, 'fiske', 'fiskespjut');
    const lant = heldBy(s, b)?.agare === a.id && !heldBy(s, a);
    b.task = undefined; tidyTools(s);
    const tillbaka = !heldBy(s, b);
    getRel(s, a, c).op = -40; for (const q of [a, c]) { q.mother = q.father = undefined; } a.partner = c.partner = undefined;
    const ovan = !freeSpear(s, c);
    task(b, 'fiske', 'fiskespjut');
    const sonder = wearTool(s, b, 'fiskespjut', 2) && spears(s) === 0 && !heldBy(s, b);
    makeTool(s, a, 'spjut'); task(a, 'fiske', 'fiskespjut');
    a.died = s.now; a.cause = 'av ålder'; tidyTools(s);
    const arv = toolsOf(s, 'fiskespjut').length === 1 && toolsOf(s, 'fiskespjut').every(t => t.agare === BYN && t.hos === undefined);
    const v = createState(5, START);
    for (const q of v.people) q.tek = { fiskespjut: 1, korg: 1 };
    setItems(v, { grenar: 20, flinta: 2, torrgras: 30 }); v.stat = { ...(v.stat ?? {}), fiskeForsok: 1 };
    let ihand = 0;
    kor(v, 3 * 24, q => { if (living(q).some(p => heldBy(q, p) && !usesTool(p.task))) ihand++; });
    const ts = v.ting ?? [], egna = ts.filter(t => t.agare !== BYN).length;
    const summa = (v.ting ?? []).every(t => [t.hos, t.lass, t.x].filter(q => q !== undefined).length <= 1) && !('items' in v) && !(v.stackar ?? []).some(a => isTool(a.k));
    const stackar = pilesOf(v).filter(p => isTool(p.k) && p.stored).length, iforradet = ts.filter(t => t.hos === undefined && t.lass === undefined && (t.x === undefined || isStored(v, t.x, t.y!))).length;
    return [
      ['yxan som fanns före ägandet är byns', yxaByns],
      ['den som gör spjutet äger det', gjorda],
      ['man tar sitt eget redskap först', egetForst],
      ['den som inte har något eget tar byns', bynsTill],
      ['det egna behålls i handen, byns läggs tillbaka', behaller],
      ['man lånar av en vän som inte använder sitt', lanar && lant],
      ['det lånade läggs i förrådet efteråt', tillbaka],
      ['en ovän lånar inte ut', ovan],
      ['det som går sönder är det man har i handen', sonder],
      ['en dödsfalls redskap blir byns och läggs i förrådet', arv],
      [`i en vanlig by äger folk det de gjort (${egna} av ${ts.length} redskap har en ägare)`, egna > 0],
      [`folk bär sina egna redskap mellan arbetena (${ihand} av ${3 * 24 * STEG_TIM} steg)`, ihand > 0],
      ['redskapen finns bara som ting, och varje ting på ett ställe (i handen, i en börda eller på en ruta)', summa],
      [`en ruta i förrådet för varje redskap där (${stackar} rutor, ${iforradet} redskap)`, stackar === iforradet],
    ];
  },
};

SCENARIER.gava = {
  text: 'Den som saknar ett redskap hen arbetar med frågar efter det i samtal. Den som har ett över ger det: en förälder nästan alltid till sitt barn, släkt och vänner ofta, ovänner inte. Har den som frågar något över som är värt nog blir det ett byte.',
  kor: () => {
    const s = createState(6, START);
    setItems(s, { grenar: 20 });
    const [a, b, c, d] = living(s);
    for (const q of [a, b, c, d]) { q.mother = q.father = q.partner = undefined; q.habit = { fiske: 10, samla: 10 }; }
    tidyTools(s);
    const ge = (g: Person, k: string, n: number) => { for (let i = 0; i < n; i++) { addTool(s, k, g); } };
    const har = (p: Person, k: string) => ownedBy(s, p).filter(t => t.k === k).length;
    // förälder och barn: a har två spjut, b (barnet) inget
    ge(a, 'fiskespjut', 2); b.mother = a.id;
    let barn = 0;
    for (let i = 0; i < 20; i++) { if (askForTool(s, a, b) === 'gåva') barn++; if (har(b, 'fiskespjut')) ownedBy(s, b).forEach(t => { if (t.k === 'fiskespjut') t.agare = a.id; }); }
    // tankarna efter gåvan finns kvar efter en timme (12 och 6 timmar)
    const tanke = (p: Person, t: string) => p.thoughts.some(q => q.text.startsWith(t) && q.until > s.now + HOUR);
    const tankar = barn > 0 && tanke(b, 'Fick ett träspjut') && tanke(a, 'Gav ett träspjut');
    // ovän: c och a är osams
    b.mother = undefined; getRel(s, a, c).op = -40;
    let ovan = 0; for (let i = 0; i < 20; i++) if (askForTool(s, a, c)) ovan++;
    // en vän ger
    getRel(s, a, d).op = 40;
    let forsok = 0; while (!har(d, 'fiskespjut') && forsok++ < 200) askForTool(s, a, d);
    const van = har(d, 'fiskespjut') === 1 && har(a, 'fiskespjut') === 1;
    // byte: c har två yxor och saknar kniv, b har två knivar och saknar yxa (ungefär lika mycket värda)
    getRel(s, b, c).op = 30;
    ge(c, 'yxa', 2); ge(b, 'kniv', 2); b.habit = { hugga: 10 }; c.habit = { slakta: 10 };
    let byte: string | undefined, bytesForsok = 0; while (!byte && bytesForsok++ < 200) byte = askForTool(s, b, c);
    const bytt = byte === 'byte' && har(b, 'yxa') === 1 && har(c, 'kniv') === 1;
    // vanliga byar: en by i taget, tills den första gåvan eller det första bytet (högst 20 dygn i var och en av fyra byar)
    let vanlig = '';
    for (let i = 0; i < 4 && !vanlig; i++) {
      const v = createState(40 + i, START);
      for (let k = 0; k < 20 * STEG_DYGN && !vanlig; k++) {
        step(v, BEAT);
        const g = v.stat?.gavor ?? 0, n = v.stat?.byten ?? 0;
        if (g + n) vanlig = `${g ? 'en gåva' : 'ett byte'} i by ${40 + i} efter ${((k + 1) / STEG_DYGN).toFixed(1)} dygn`;
      }
    }
    return [
      [`en förälder ger sitt barn det hen har över (${barn} av 20)`, barn >= 17],
      ['den som fick och den som gav tänker på gåvan i mer än en timme', tankar],
      ['en ovän ger inget', ovan === 0],
      [`en vän ger det hen har över (efter ${forsok} samtal)`, van],
      [`två som har något över som den andra saknar byter (${byte} efter ${bytesForsok} samtal)`, bytt],
      [`i vanliga byar ges och byts redskap (${vanlig || 'inget i 4 byar på 20 dygn'})`, vanlig !== ''],
    ];
  },
};

SCENARIER.byte = {
  text: 'Byten i behovsstegen, mellan sitt eget och byns förråd: den som saknar något byter till sig det mot något hen har över, när båda tjänar på det (grundvärdet gånger var och ens behov). Ojämna byten går när skillnaden är liten, när den ena håller på att dö eller när de står varandra nära. Mat, material och redskap kan bytas. I samtal, mest på kvällar och nätter, byter folk också utan akut behov när båda tjänar på det (steg 1.4.3).',
  lang: true,
  kor: () => {
    const ny = () => {
      const s = createState(6, START);
      rikBy(s); tomtForrad(s); s.ting = [];
      const [a, b, c] = treVuxna(s, 1, q => { q.warm = 1; q.pot.empati = 10; q.habit = {}; });
      for (const q of [a, b, c]) for (const r of [a, b, c]) if (q !== r) getRel(s, q, r).op = 0; // inga vänner
      s.people = [a, b, c]; c.x = 90;
      return { s, a, b, c };
    };
    const byns = (s: State, k: string) => amountOf(s, k) - living(s).reduce((n, q) => n + ownsAmount(s, q, k), 0);
    const nara = (x: number, y: number) => Math.abs(x - y) < 1e-6;
    // a är hungrig och har trä över, b har mat över: a byter till sig mat före byns. b värderar sin mat över till hälften
    // och trä hen inte har fullt lika högt, så en portion kostar hälften av matens grundvärde räknat i trä
    let { s, a, b } = ny();
    a.hunger = 0.3; addTo(s, 'bar', 5); gain(s, b, 'bar', 6); gain(s, a, 'ved', 6);
    needLadder(s, a, 1);
    const fore = a.hunger > 0.3 && nara(byns(s, 'bar'), 5) && nara(ownsAmount(s, b, 'bar'), 5), pris = ownsAmount(s, b, 'ved');
    // a har nästan inget över (ett trä utöver det hen behöver): ingen byter med hen en portion, utom en nära vän
    ({ s, a, b } = ny());
    a.hunger = 0.3; addTo(s, 'bar', 5); gain(s, b, 'bar', 6); gain(s, a, 'ved', 4);
    needLadder(s, a, 1); const okand = nara(ownsAmount(s, b, 'bar'), 6) && a.hunger > 0.3;
    ({ s, a, b } = ny());
    a.hunger = 0.3; addTo(s, 'bar', 5); gain(s, b, 'bar', 6); gain(s, a, 'ved', 4); getRel(s, b, a).op = 70; getRel(s, a, b).op = 70; b.pot.empati = 20;
    needLadder(s, a, 1); const van = nara(ownsAmount(s, b, 'bar'), 5) && ownsAmount(s, b, 'ved') <= 1 + 1e-9;
    // ... eller när hen håller på att dö av svält
    ({ s, a, b } = ny());
    a.hunger = 0; a.health = 0.5; addTo(s, 'bar', 5); gain(s, b, 'bar', 6); gain(s, a, 'ved', 4);
    needLadder(s, a, 1); const dor = nara(ownsAmount(s, b, 'bar'), 5);
    // en ovän byter inte
    ({ s, a, b } = ny());
    a.hunger = 0.3; addTo(s, 'bar', 5); gain(s, b, 'bar', 6); gain(s, a, 'ved', 6); getRel(s, b, a).op = -40;
    needLadder(s, a, 1); const ovan = nara(ownsAmount(s, b, 'bar'), 6) && nara(byns(s, 'bar'), 4);
    // material till ett eget arbete: a saknar flinta och betalar med mat hen har över; byns flinta tas inte
    ({ s, a, b } = ny());
    addTo(s, 'flinta', 3); gain(s, b, 'flinta', 2); gain(s, a, 'bar', 20);
    takeMaterial(s, a, 'flinta', 1);
    const material = nara(byns(s, 'flinta'), 3) && nara(ownsAmount(s, b, 'flinta'), 1) && ownsAmount(s, b, 'bar') > 1;
    // grenar räknas i styck, inte i vedens behovsenheter: a köper tre grenar av b och inga fler av c (motor-4)
    let c: Person; ({ s, a, b, c } = ny()); c.x = a.x; c.y = a.y;
    gain(s, b, 'grenar', 3); gain(s, c, 'grenar', 3); gain(s, a, 'bar', 20);
    takeMaterial(s, a, 'grenar', 3);
    const grenar = ownsAmount(s, b, 'grenar') + ownsAmount(s, c, 'grenar'), grenOver = ownsAmount(s, a, 'grenar'), grenByten = s.stat?.byten;
    // ett redskap mot mat: a samlar och saknar korg, b har två
    ({ s, a, b } = ny());
    a.habit = { samla: 10 }; addTool(s, 'korg', b); addTool(s, 'korg', b); gain(s, a, 'bar', 20);
    const korg = askForTool(s, a, b) === 'byte' && ownedBy(s, a).some(t => t.k === 'korg') && ownsAmount(s, b, 'bar') > 0;
    // kvällens byten (1.4.3): a har mat men mindre än hen vill ha kvar (matPerDygn) och trä över, b tvärtom. Ingen saknar något
    ({ s, a, b } = ny());
    gain(s, a, 'bar', 0.5); gain(s, a, 'ved', 6); gain(s, b, 'bar', 6); gain(s, b, 'ved', 1);
    askForGift(s, a, b);
    // i hela saker (steg 2.10.7): a har tre trä över och får en hel portion för två av dem
    const kvall = ownsAmount(s, a, 'bar') >= 1 - 1e-9 && ownsAmount(s, a, 'bar') <= EKONOMI.matPerDygn
      && ownsAmount(s, a, 'ved') >= 3 - 1e-9 && ownsAmount(s, b, 'ved') > 1 + 1e-9 && s.stat?.kvallsbyten === 1;
    // har båda det de vill ha kvar byter de inte, och inte heller med en ovän
    ({ s, a, b } = ny());
    gain(s, a, 'bar', Math.ceil(EKONOMI.matPerDygn)); gain(s, a, 'ved', 6); gain(s, b, 'bar', 6); gain(s, b, 'ved', 3);
    askForGift(s, a, b); const nog = !s.stat?.byten && nara(ownsAmount(s, a, 'ved'), 6);
    ({ s, a, b } = ny());
    gain(s, a, 'bar', 0.5); gain(s, a, 'ved', 6); gain(s, b, 'bar', 6); gain(s, b, 'ved', 1); getRel(s, b, a).op = -40;
    askForGift(s, a, b); const kvallOvan = !s.stat?.byten;
    // vanliga byar
    let byten = 0, mat = 0, mtrl = 0, natt = 0, dag = 0, ljusa = 0, morka = 0; // ljusa, morka: steg i dagsljus och i mörker
    for (const seed of [1, 42]) {
      const v = createState(seed, START);
      for (let i = 0; i < 8 * STEG_DYGN; i++) {
        const f = v.stat?.kvallsbyten ?? 0, ljust = isLight(v.now);
        step(v, BEAT);
        if (ljust) { dag += (v.stat?.kvallsbyten ?? 0) - f; ljusa++; } else { natt += (v.stat?.kvallsbyten ?? 0) - f; morka++; }
      }
      byten += v.stat?.byten ?? 0; mat += v.stat?.byte_mat ?? 0; mtrl += v.stat?.byte_material ?? 0;
    }
    return [
      [`den hungrige byter till sig mat mot trä hen har över, före byns mat (en portion för ${pris.toFixed(2)} trä)`, fore && pris === Math.ceil(grundvarde('bar') * 0.5 / grundvarde('ved'))], // i hela trä, avrundat uppåt (steg 2.10.7)
      ['den som har för lite att ge får inget byte av någon hen inte står nära', okand],
      ['en nära vän går med på ett ojämnt byte', van],
      ['den som håller på att dö får ett ojämnt byte', dor],
      ['en ovän byter inte', ovan],
      ['material till ett eget arbete byts till sig före byns', material],
      [`den som saknar tre grenar köper tre i ett byte (grannarna har ${grenar.toFixed(2)} av 6 kvar, ${grenOver.toFixed(2)} över, ${grenByten} byten)`, nara(grenar, 3) && nara(grenOver, 0) && grenByten === 1],
      ['ett redskap byts mot mat', korg],
      ['i samtal byter den som har mindre mat än hen vill ha kvar till sig mat mot trä, och båda tjänar på det', kvall],
      ['har båda det de vill ha kvar blir det inget byte', nog],
      ['en ovän byter inte i samtal heller', kvallOvan],
      [`i vanliga byar byter folk (${byten} byten på 8 dygn i 2 byar: ${mat.toFixed(1)} portioner mat, ${mtrl.toFixed(1)} material)`, byten > 0],
      // per timme, eftersom hur många timmar som är mörka beror på årstiden. Kvällens byten är minst en och en halv gång så
      // vanliga i mörkret (2,6 gånger före steg 3.10.25, 1,9 sedan fler samlar nära lägret på dagen, fynd 28)
      [`kvällens byten blir mest av på kvällar och nätter (${natt} i mörker, ${dag} i dagsljus; ${(natt / Math.max(1, morka) * STEG_DYGN / 24).toFixed(2)} och ${(dag / Math.max(1, ljusa) * STEG_DYGN / 24).toFixed(2)} i timmen)`, natt > 0 && natt / Math.max(1, morka) > 1.5 * dag / Math.max(1, ljusa)],
    ];
  },
};


SCENARIER.egendom = {
  text: 'Det någon samlar, hugger, jagar och gör är hens, också i byns förråd. Det som redan var byns förblir byns. Till sig själv tar man sitt eget först, till elden byns. Det som ruttnar minskar allas delar, slaktat kött är dens som ägde viltet, och den som dör lämnar sin del till byn.',
  kor: () => {
    const s = createState(6, START);
    const fore = STACK_ORDER.reduce((n, k) => n + ownedSum(s, k), 0);
    rikBy(s); setItems(s, { grenar: 20 }); setAmount(s, 'ved', 2); setMat(s, { bar: 20 });
    const [a, b, c] = living(s);
    for (const q of s.people) q.mother = q.father = q.partner = undefined; // ingen i byn är släkt, så att a:s del går till byn (som i arv)
    gain(s, a, 'bar', 5);
    const fick = ownsAmount(s, a, 'bar');
    takeFood(s, 2, a); const atEget = ownsAmount(s, a, 'bar');
    takeFood(s, 2, b); const annanAt = ownsAmount(s, a, 'bar');
    gain(s, a, 'ved', 4); takeFuel(s, 3, a); const elden = ownsAmount(s, a, 'ved');
    addTo(s, 'bar', -foodOf(s) / 2); const rutten = ownsAmount(s, a, 'bar');
    // slakt: a äger två kaniner, c slaktar dem med en kniv
    gain(s, a, 'vilt', KANIN * 2); setAmount(s, 'kniv', 1); tidyTools(s); medBank(s); c.tek = { ...(c.tek ?? {}), kniv: 1 };
    bearbeta(s, c, DJUR.kanin, 1);
    const kott = ownsAmount(s, a, 'kott'), slaktarens = ownsAmount(s, c, 'kott');
    const andra = living(s).filter(q => q !== a), deras = andra.map(q => ownedStock(s, q));
    die(s, a, 'sjukdom'); const arv = !Object.keys(ownedStock(s, a)).length && andra.every((q, i) => isDeepStrictEqual(ownedStock(s, q), deras[i]));
    // vanliga byar: delarna går aldrig över det som finns i förrådet
    let fel = 0, agt = 0;
    for (const [seed, h, live] of [[41, 10 * 24, false], [3, 6, true]] as const) {
      const v = createState(seed, START);
      // live: steg på 0,5 s, som spelet inte tar (ARKITEKTUR.md regel 2), så att delarna prövas också mitt i fasbytena
      for (let i = 0; i < h * 3600 / (live ? 0.5 : BEAT); i++) { step(v, live ? 0.5 : BEAT); if (i % 200 === 0) for (const a of v.stackar ?? []) if (sumOf(a.ag) > a.n + 1e-6) fel++; }
      agt += living(v).filter(p => Object.keys(ownedStock(v, p)).length).length;
    }
    // äldre sparfil (före v40): summorna och delarna sparades bredvid stackarna och blir nu stackar
    const g = createState(6, START), ga = living(g)[0];
    g.stackar = []; Object.assign(g, { food: 50, mat: { bar: 30, fisk: 20 }, wood: 5, egna: { bar: { [ga.id]: 10 } } }); g.items = { grenar: 7 };
    g.v = 1; migrate(g); // som en sparfil från före v40
    const gammal = Math.abs(foodOf(g) - 50) < 1e-9 && Math.abs(amountOf(g, 'fisk') - 20) < 1e-9 && Math.abs(amountOf(g, 'ved') - 5) < 1e-9 && Math.abs(amountOf(g, 'grenar') - 7) < 1e-9 && Math.abs(ownsAmount(g, ga, 'bar') - 10) < 1e-9 && !('food' in g) && !('egna' in g) && !('items' in g);
    return [
      ['äldre sparfil: summorna och ägarnas delar blir stackar', gammal],
      ['det som fanns från början är byns', fore === 0],
      [`det man samlar är ens eget (${fick})`, Math.abs(fick - 5) < 1e-9],
      [`man äter sitt eget först (${atEget} kvar av 5 efter 2)`, Math.abs(atEget - 3) < 1e-9],
      ['en annan äter byns mat före ens egen', Math.abs(annanAt - 3) < 1e-9],
      [`till elden tas byns ved först (${elden} av 4 kvar)`, Math.abs(elden - 3) < 1e-9],
      [`det som ruttnar minskar allas delar (${rutten} av 3 kvar)`, Math.abs(rutten - 1.5) <= 0.5 + 1e-9], // hälften i hela saker: en eller två (steg 2.10.7)
      [`slaktat kött är dens som ägde viltet (${kott.toFixed(1)}), inte slaktarens`, kott > 0 && slaktarens === 0],
      ['den som dör utan släkt lämnar sin del till byn, inte till någon annan', arv],
      [`i vanliga byar äger folk det de skaffat (${agt} personer), och delarna går aldrig över förrådet`, agt > 0 && fel === 0],
    ];
  },
};

SCENARIER.delning = {
  text: 'Delning: ju fattigare byn är, desto mer av det folk skaffar ger de till byn. Byns rikedom avgör ensamt hur mycket',
  kor: () => {
    const s = createState(5, START), p = living(s)[0];
    const egetAv = (n: number) => { const f = ownsAmount(s, p, 'bar'); gain(s, p, 'bar', n); return ownsAmount(s, p, 'bar') - f; };
    const ny = s.delning!, nyRik = rikedom(s), nyEgen = egetAv(10);
    // halvrik: hälften av gränsen
    setAmount(s, 'ved', 0); setAmount(s, 'ved', (DELNING.rik / 2 - rikedom(s)) / grundvarde('ved')); stepDelning(s);
    const halv = s.delning!, halvEgen = egetAv(10);
    // rik
    setAmount(s, 'ved', amountOf(s, 'ved') + DELNING.rik / grundvarde('ved')); stepDelning(s);
    const rik = s.delning!, rikRik = rikedom(s), rikEgen = egetAv(10);
    // fattig igen
    setAmount(s, 'ved', 0); setFood(s, 0); stepDelning(s);
    const igen = s.delning!;
    return [
      [`en ny by är fattig (rikedom ${nyRik.toFixed(0)}) och ger det mesta till byn (${nyEgen.toFixed(1)} av 10 eget)`, ny.andel > 0.75 && Math.abs(nyEgen - 10 * (1 - ny.andel)) < 1], // i hela saker (steg 2.10.7)
      [`halvvägs till gränsen ${DELNING.rik} ges hälften (andel ${halv.andel.toFixed(2)}, ${halvEgen.toFixed(1)} av 10 eget)`, Math.abs(halv.andel - 0.5) < 0.02 && Math.abs(halvEgen - 5) < 0.3],
      [`en rik by (rikedom ${rikRik.toFixed(0)}) ger inget (${rikEgen.toFixed(1)} av 10 eget)`, rik.andel === 0 && Math.abs(rikEgen - 10) < 0.01],
      [`blir byn fattig igen ger folk igen (andel ${igen.andel.toFixed(2)})`, igen.andel > 0.8],
    ];
  },
};

SCENARIER.arv = {
  text: 'Arv och flytt: den dödas saker går till partnern, annars jämnt efter värde på barnen, annars föräldrarna, annars syskonen, annars byn, och det syns vem som ärvde vad. Den som flyttar tar med sig det hen orkar bära. Den som har mycket över ger lättare, Gemenskap gör folk givmildare, och i en rik by ger man mindre, utom till barn och partner.',
  kor: () => {
    // fem vuxna utan släkt; d äger en yxa, 30 trä och 10 bär
    const ny = () => {
      const s = createState(6, START);
      tomtForrad(s); s.ting = [];
      const [d, a, b, c, e] = living(s);
      for (const q of s.people) q.mother = q.father = q.partner = undefined;
      rikBy(s); // d får behålla allt hen skaffar
      addTool(s, 'yxa', d); gain(s, d, 'ved', 30); gain(s, d, 'bar', 10);
      return { s, d, a, b, c, e };
    };
    const yxor = (s: State, q: Person) => tingOf(s).filter(t => t.k === 'yxa' && t.agare === q.id).length;
    const varde = (s: State, q: Person) => yxor(s, q) * grundvarde('yxa') + ownsAmount(s, q, 'ved') * grundvarde('ved') + ownsAmount(s, q, 'bar') * grundvarde('bar');
    // partnern får allt, också i en fattig by
    let { s, d, a, b, c, e } = ny();
    const dVarde = varde(s, d);
    d.partner = a.id; a.partner = d.id; b.mother = d.id;
    die(s, d, 'sjukdom');
    const partner = Math.abs(varde(s, a) - dVarde) < 1e-6 && varde(s, b) === 0 && yxor(s, a) === 1;
    const syns = s.log.some(l => l.text.startsWith(`${a.name} ärvde`) && l.text.includes('flintyxa') && l.text.includes(d.name));
    const arv1 = s.stat?.arv ?? 0;
    // den som inte äger något lämnar inget arv, också när hen har en partner (samhalle-123)
    ({ s, d, a, b, c, e } = ny());
    c.partner = e.id; e.partner = c.id;
    const cTom = !Object.keys(ownedAll(s, c.id)).length && !tingOf(s).some(t => t.agare === c.id);
    die(s, c, 'sjukdom');
    const arv0 = s.stat?.arv ?? 0;
    // inget partner: barnen delar jämnt efter värde (yxan till den ena, maten och träet till den andra)
    ({ s, d, a, b, c, e } = ny());
    a.mother = d.id; b.father = d.id;
    die(s, d, 'sjukdom');
    const va = varde(s, a), vb = varde(s, b), barnen = Math.abs(va - vb) <= grundvarde('bar') + 1e-6 && // i hela saker (steg 2.10.7): högst en saks värde skiljer
       yxor(s, a) + yxor(s, b) === 1 && varde(s, c) === 0;
    // husen delas ut först, det mest värda först, även till en arvinge som redan har ett hus (steg 2.12.5)
    ({ s, d, a, b, c, e } = ny());
    a.mother = d.id; b.father = d.id;
    const nyttHus = (q: Person, x: number) => {
      const id = (s.nextBit ??= 1), h: SIM.Hus = { id, namn: SIM.husNamn(q.name), x, y: 2, w: 3, h: 3, fn: 'familjehus', ag: q.id, klar: s.now };
      s.nextBit++; SIM.housesOf(s).push(h);
      bitsOf(s).push({ id: s.nextBit++, x, y: 2, k: SIM.MATERIAL.timmer.k, m: 'timmer', b: 1, mat: SIM.MATERIAL.timmer.n, c: 1, hus: id });
      return h;
    };
    nyttHus(a, 2); const dHus = nyttHus(d, 8), husV = SIM.husVarde(s, dHus);
    die(s, d, 'sjukdom');
    const husForst = husV > 0 && dHus.ag === a.id && dHus.namn === SIM.husNamn(a.name) && yxor(s, b) === 1;
    // föräldrarna, sedan syskonen, sedan byn
    ({ s, d, a, b, c, e } = ny());
    d.mother = a.id; b.mother = a.id; die(s, d, 'sjukdom');
    const foraldrar = varde(s, a) > 0 && varde(s, b) === 0;
    ({ s, d, a, b, c, e } = ny());
    d.mother = 999; b.mother = 999; die(s, d, 'sjukdom');
    const syskon = Math.abs(varde(s, b) - dVarde) < 1e-6;
    ({ s, d, a, b, c, e } = ny());
    die(s, d, 'sjukdom');
    tidyTools(s); // som i varje steg: den dödas redskap blir byns
    const byn = [a, b, c, e].every(q => varde(s, q) === 0) && tingOf(s).filter(t => t.k === 'yxa' && t.agare === BYN).length === 1 && amountOf(s, 'ved') > 29;
    // den som flyttar tar med sig det hen orkar bära, det mest värda för vikten först; resten blir byns
    ({ s, d, a, b, c, e } = ny());
    const bar = capacity(s, d), fore = amountOf(s, 'ved') + amountOf(s, 'bar');
    d.left = s.now; packUp(s, d); releaseOwner(s, d.id);
    const tog = fore - amountOf(s, 'ved') - amountOf(s, 'bar') + (tingOf(s).some(t => t.k === 'yxa') ? 0 : 1);
    const flytt = tog > 0 && tog <= bar * 25 + 1 && amountOf(s, 'ved') + amountOf(s, 'bar') > 0 && ownedSum(s, 'ved') === 0;
    // ordningen när två saker är lika mycket värda beror inte på webbläsarens språk (samhalle-141): två lika yxor
    ({ s, d, a, b, c, e } = ny()); addTool(s, 'yxa', d);
    const lc = String.prototype.localeCompare; let sprak = 0;
    String.prototype.localeCompare = function (this: string, ...x: Parameters<typeof lc>) { sprak++; return lc.apply(this, x); };
    try { packUp(s, d); } finally { String.prototype.localeCompare = lc; }
    // den som dör, flyttar eller blir nattens vakt lägger ner det hen bär där hen står: det finns kvar i byn (och ärvs)
    const allt = (s: State, k: string) => (s.stackar ?? []).reduce((n, x) => n + (x.k === k ? x.n : 0), 0);
    const bordan = (s: State, q: Person, k: string, n: number) => { q.task = { act: 'samla', phase: 'do', tx: q.x, ty: q.y, until: s.now + HOUR, carry: 0, items: { [k]: n } }; };
    ({ s, d, a, b, c, e } = ny()); setAmount(s, 'skinn', 0);
    d.partner = a.id; a.partner = d.id; bordan(s, d, 'skinn', 4); die(s, d, 'sjukdom');
    const dogBar = Math.abs(allt(s, 'skinn') - 4) < 1e-6 && Math.abs((ownedAll(s, a.id).skinn ?? 0) - 4) < 1e-6;
    ({ s, d, a, b, c, e } = ny()); setAmount(s, 'sten', 0);
    const orkar = capacity(s, d) * stackOf('sten');
    bordan(s, d, 'sten', 30); leave(s, d);
    const flyttBar = allt(s, 'sten') > 0 && allt(s, 'sten') >= 30 - orkar - 1e-6 && !ownedAll(s, d.id).sten;
    ({ s, d, a, b, c, e } = ny()); setAmount(s, 'skinn', 0);
    s.now = new Date(s.now).setHours(23, 0, 0, 0); s.lastGuardDay = -5; Object.assign(s.fire, { lit: true, fuel: 5 });
    for (const q of living(s)) Object.assign(q, { hunger: 1, rest: 1, warm: 1, toa: 1, torst: 1, health: 1, sickUntil: undefined });
    d.pot.mod = 100; bordan(s, d, 'skinn', 4); a.task = undefined;
    chooseTask(s, a);
    const vaktBar = d.guardDay !== undefined && !d.task && Math.abs(allt(s, 'skinn') - 4) < 1e-6;
    // barnets far är den hon blev gravid med, också om hon fått en ny partner sedan
    ({ s, d, a, b, c, e } = ny());
    c.pregnantSince = s.now; c.pregnantBy = d.id; c.partner = b.id; b.partner = c.id;
    birth(s, c);
    const far = s.people[s.people.length - 1].father === d.id;
    // viljan att ge
    ({ s, d, a, b, c, e } = ny());
    getRel(s, a, b).op = 60; d.mother = a.id; a.partner = c.id; c.partner = a.id;
    s.delning = { andel: 1 };
    const lite = willing(s, a, b, 1), mycket = willing(s, a, b, 3);
    s.seder.v.gemenskap = 1; const gem = willing(s, a, b, 1); s.seder.v.gemenskap = -1; const egen = willing(s, a, b, 1); s.seder.v.gemenskap = 0;
    s.delning = { andel: 0 }; const rikVan = willing(s, a, b, 1), rikBarn = willing(s, a, d, 1), rikPartner = willing(s, a, c, 1);
    s.delning = { andel: 1 }; const fattigBarn = willing(s, a, d, 1), fattigPartner = willing(s, a, c, 1);
    return [
      ['partnern ärver allt', partner],
      ['det syns i loggen vem som ärvde vad', syns],
      [`ett arv räknas när något ärvs (${arv1}), inte när den döda inte ägde något (${arv0})`, arv1 === 1 && cTom && arv0 === 0],
      [`utan partner delar barnen jämnt efter värde (${va.toFixed(0)} och ${vb.toFixed(0)})`, barnen],
      [`huset delas ut först (värt ${husV.toFixed(1)}), även till ett barn som redan har ett hus, och får hens namn; yxan går till det andra barnet`, husForst],
      ['utan partner och barn ärver föräldrarna', foraldrar],
      ['sedan syskonen', syskon],
      ['utan släkt blir allt byns', byn],
      [`den som flyttar tar med sig det hen orkar bära (${tog.toFixed(1)}), resten blir byns`, flytt],
      [`packningen jämför inte namnen efter språket (${sprak} gånger)`, sprak === 0],
      ['den som dör lägger ner det hen bär, och arvingen får det', dogBar],
      ['den som flyttar packar ur bördan det hen orkar bära, resten blir kvar i byn', flyttBar],
      ['den som blir nattens vakt lägger ner det hen bär', vaktBar],
      ['barnets far är den hon blev gravid med, inte en ny partner', far],
      [`den som har mycket över ger lättare (${lite.toFixed(2)} mot ${mycket.toFixed(2)})`, mycket > lite],
      [`Sammanhållning gör folk givmildare (${egen.toFixed(2)} → ${gem.toFixed(2)})`, gem > lite && lite > egen],
      [`i en rik by ger man mindre till vänner (${rikVan.toFixed(2)}) men lika till barn och partner`, rikVan < lite && rikBarn === fattigBarn && rikPartner === fattigPartner],
    ];
  },
};

SCENARIER.varde = {
  text: 'Värde: varje sak har ett grundvärde ur registren. Det man gör är värt mer än det det görs av, en senare teknik mer än de enkla råvarorna av samma slag, och byns rikedom är förrådet, redskapen och husen gånger skicket',
  kor: () => {
    const v = grundvarde, s = createState(5, START);
    tomtForrad(s); s.ting = [];
    // registret: det som har ett sätt att skaffas (skaffa i saker.ts) har ett värde, det andra (giftsvamp, paborjat) inget
    const utanVarde = SAK_LIST.filter(k => SAKER[k]!.skaffa && !(v(k) > 0 && isFinite(v(k)))), medVarde = SAK_LIST.filter(k => !SAKER[k]!.skaffa && SAKER[k]!.varde === undefined && v(k) !== 0);
    const tom = rikedom(s);
    setAmount(s, 'ved', 10); const tra = rikedom(s) - tom;
    addTool(s, 'yxa', living(s)[0]!); const yxa = rikedomDelar(s).redskap;
    tingOf(s)[0]!.c = 0.5; const halv = rikedomDelar(s).redskap;
    const fore = rikedomDelar(s).hus;
    bitsOf(s).push({ id: 9999, x: 1, y: 1, k: 'vagg', m: 'timmer', b: 1, mat: 2, c: 1, hus: 1 });
    const hus = rikedomDelar(s).hus - fore;
    return [
      [`kött (${v('kott').toFixed(1)}) är värt mer än bär (${v('bar').toFixed(1)}), fast det går fortare att jaga`, v('kott') > v('bar') && nivaOf('kott') > nivaOf('bar')],
      [`det man gör är värt mer än det det görs av: yxa ${v('yxa').toFixed(0)} > flinta ${v('flinta').toFixed(0)} + grenar ${v('grenar').toFixed(1)}, flintspjut ${v('flintspjut').toFixed(0)} > träspjut ${v('fiskespjut').toFixed(1)}`, v('yxa') > v('flinta') + v('grenar') && v('flintspjut') > v('fiskespjut') && v('rep') > 2 * v('torrgras')],
      [`flintan är sällsynt och värd mer än sten (${v('flinta').toFixed(0)} mot ${v('sten').toFixed(1)})`, v('flinta') > 5 * v('sten')],
      [`allt som går att skaffa har ett värde, och det andra har inget${utanVarde.length ? ` (utan värde: ${utanVarde.join(', ')})` : ''}${medVarde.length ? ` (med värde: ${medVarde.join(', ')})` : ''}`, !utanVarde.length && !medVarde.length],
      [`tio trä i förrådet gör byn ${tra.toFixed(1)} rikare`, Math.abs(tra - 10 * v('ved')) < 1e-6],
      [`en yxa räknas efter sitt skick (${yxa.toFixed(0)} ny, ${halv.toFixed(0)} halvsliten)`, Math.abs(yxa - v('yxa')) < 1e-6 && Math.abs(halv - v('yxa') / 2) < 1e-6],
      [`en timmervägg räknas efter material och arbete (${hus.toFixed(1)})`, Math.abs(hus - (2 * v('ved') + SIM.MATERIAL.timmer.tim)) < 1e-6],
    ];
  },
};

SCENARIER.utrustning = {
  text: 'Steg 2.3.1: var och en har platser för utrustning (två händer, kroppen i två lager, huvud, ben och fötter). Varje sak väger något, och hur många händer den tar räknas fram ur vikten och styrkan. Bördan bärs i de fria händerna: den som håller yxan bär mindre, och korgen tar en hand men rymmer så mycket att en vuxen med korg bär lika mycket som utan redskap',
  kor: () => {
    const s = createState(4, START);
    setItems(s, { grenar: 20, flinta: 2, sten: 30 });
    const p = living(s).sort((a, b) => capacity(s, b) - capacity(s, a))[0]!; // den starkaste
    // vikten: varje redskap har en egen, och en stack av vad som helst är en full famn
    const redskap = SAK_LIST.filter(k => SAKER[k]?.redskap);
    const vikt = redskap.every(k => SAKER[k]!.vikt! > 0) && STACK_ORDER.every(k => SAKER[k]?.redskap || Math.abs(stackOf(k) * viktOf(k) - BORDA_KG) < 1e-9);
    const kniv1 = handerFor(s, p, 'kniv') === 1, vilt2 = handerFor(s, p, 'vilt') === 2;
    // händerna och bördan
    const fri = bordPlats(s, p);
    const yxa = addTool(s, 'yxa', p); take(s, p, 'yxa');
    const medYxa = bordPlats(s, p);
    const u = utrustning(s, p, true);
    const platser = u.hoger.ting === yxa && u.vanster.borda === true && !u.inre.ting && (['hoger', 'vanster', 'inre', 'yttre', 'huvud', 'ben', 'fotter'] as const).every(k => PLATS_LIST.includes(k));
    const korg = addTool(s, 'korg', p); take(s, p, 'korg');
    const medKorg = bordPlats(s, p);
    // att plocka upp stenar med och utan yxan i handen
    const g = (s.stackar ?? []).find(x => x.k === 'sten')!;
    const plocka = (hall?: string) => {
      const c = cloneState(s), q = c.people.find(x => x.id === p.id)!;
      for (const t of tingOf(c)) if (t.hos === q.id) t.hos = undefined;
      if (hall) take(c, q, hall);
      const t: Task = { act: 'bara', phase: 'go', tx: g.x + 0.5, ty: g.y + 0.5, until: c.now + HOUR, carry: 0, why: 'test', dark: false };
      pickUp(c, q, t, bordPlats(c, q));
      return t.items?.sten ?? 0;
    };
    const utan = plocka(), med = plocka('yxa');
    // ett redskap i en börda väger det det väger, inte en hel famn som förut
    const lass: Task = { act: 'bara', phase: 'back', tx: 0, ty: 0, until: s.now, carry: 0, ting: [korg.id] };
    const korgVikt = Math.abs(load(lass, s) - bordOf('korg')) < 1e-9;
    return [
      ['varje redskap har en vikt, och en stack av något annat är en full famn', vikt],
      ['kniven tar en hand och ett fällt vilt båda händerna hos en stark vuxen', kniv1 && vilt2],
      [`med yxan i handen ryms mindre i händerna (${(medYxa * BORDA_KG).toFixed(1)} kg mot ${(fri * BORDA_KG).toFixed(1)} kg)`, medYxa < fri - 1e-6],
      [`med korgen bär man lika mycket som med fria händer (${(medKorg * BORDA_KG).toFixed(1)} kg)`, Math.abs(medKorg - fri) < 1e-6],
      ['yxan sitter i höger hand och bördan i den vänstra; kroppens platser är tomma', platser],
      [`den som håller yxan plockar upp färre stenar (${med.toFixed(1)} mot ${utan.toFixed(1)})`, med > 0 && med < utan - 1e-6],
      ['en korg i bördan väger som en korg', korgVikt],
    ];
  },
};

SCENARIER.klader = {
  text: 'Steg 2.3.2: bensylen slipas av ett ben mot en sten och läggs vid slöjdbänken. Med den sys rockar och skor av skinn och rep vid bänken (steg 3.10.12: plagg av ett material), och bensylen slits för varje plagg. Utan bensylen sys inga kläder. Den som saknar ett plagg tar på sig ett, kläderna skyddar mot kylan, väger något och slits ut, och den dödes kläder kan någon annan ta på sig',
  kor: () => {
    const s = createState(2, START); tandEld(s);
    const st = medBank(s, 'flatarbank');
    for (const r of s.people) r.tek = { ...r.tek, kniv: 1, flatarbank: 1, bensyl: 1, skinnklader: 1 };
    setMat(s, { bar: 300 }); setAmount(s, 'ved', 60); setAmount(s, 'ben', 3); setAmount(s, 'sten', 6); setAmount(s, 'skinn', 30); setAmount(s, 'rep', 12);
    // utan bensylen vid bänken sys inga kläder
    const utan = !SIM.kanGoras(s, 'rock') && !SIM.kanGoras(s, 'skor');
    let h = 0;
    const bensyl = () => tingOf(s).find(t => t.k === 'bensyl' && t.vid === st.id);
    while (!bensyl() && h < 72) { kor(s, 1); h++; }
    const slipad = !!bensyl(), timBensyl = h;
    const kan = SIM.kanGoras(s, 'rock');
    // kläderna sys och tas på
    const paSig = () => tingOf(s).filter(t => SAKER[t.k]?.klad && t.bar !== undefined);
    while (paSig().length < 2 && h < 240) { kor(s, 1); h++; }
    const sydda = tingOf(s).filter(t => SAKER[t.k]?.klad).length, buren = paSig()[0];
    const slits = (bensyl()?.c ?? 1) < 1 - 1e-9 || (s.stat?.bensylTrasiga ?? 0) > 0;
    const p = buren && byId(s, buren.bar!);
    const ejLiggande = !!buren && buren.x === undefined && buren.hos === undefined;
    // värmen: kylan tar mindre av den som har kläder på sig, och kläderna väger
    const kyla = (q: Person) => SIM.varmeDelar(s, q, 1, new Map()).kyla;
    let varmare = false, tyngre = false;
    if (p) {
      const med = kyla(p), plats = bordPlats(s, p), mina = SIM.paSig(s, p);
      for (const t of mina) t.bar = undefined;
      varmare = kyla(p) > med + 1e-9; tyngre = bordPlats(s, p) > plats + 1e-9;
      for (const t of mina) t.bar = p.id;
    }
    // ett utslitet plagg försvinner och räknas
    const slitna0 = s.stat?.kladerSlitna ?? 0;
    if (buren) { buren.c = 1e-5; SIM.wearStore(s, 3600); }
    const slitet = !!buren && !tingOf(s).includes(buren) && (s.stat?.kladerSlitna ?? 0) > slitna0;
    // den dödes kläder kan någon annan ta på sig
    const nasta = paSig()[0], dod = nasta && byId(s, nasta.bar!);
    let arv = false;
    if (nasta && dod) {
      for (const t of tingOf(s)) if (SAKER[t.k]?.klad && t !== nasta) s.ting = tingOf(s).filter(x => x !== t);
      die(s, dod, 'olycka'); tidyTools(s); SIM.stepKlader(s);
      arv = nasta.bar !== undefined && nasta.bar !== dod.id;
    }
    // varje plagg och vattensäck som sys sliter bänkens bensyl (REDSKAP.bensylSlits), inte bara tiden i förrådet (kodgenomgången 3.10.25)
    let syrSlits = 'ingen bensyl', syrOk = false;
    const bs = bensyl(), sy = living(s)[0];
    if (bs && sy) {
      bs.c = 1; SIM.toolDone(s, sy, 'rock_kaninskinn'); const c1 = bs.c; SIM.toolDone(s, sy, 'vattensack'); const c2 = bs.c;
      syrSlits = `1 → ${c1.toFixed(2)} → ${c2.toFixed(2)}`; syrOk = c1 < 1 - 0.01 && c2 < c1 - 0.01;
    }
    return [
      ['utan bensylen vid slöjdbänken sys inga kläder', utan],
      [`en bensyl slipas och läggs vid slöjdbänken (efter ${timBensyl} timmar)`, slipad && kan],
      [`kläder sys vid bänken och tas på (${sydda} plagg efter ${h} timmar)`, sydda > 0 && !!buren],
      ['bensylen slits när kläderna sys', slits],
      [`bensylen slits av en sydd rock och en vattensäck (${syrSlits})`, syrOk],
      ['ett plagg som någon har på sig ligger inte i förrådet', ejLiggande],
      ['den som har kläder på sig fryser mindre', varmare],
      ['kläderna väger: den som har dem på sig bär mindre', tyngre],
      ['ett utslitet plagg försvinner och räknas', slitet],
      ['den dödes plagg tar någon annan på sig', arv],
    ];
  },
};

SCENARIER.balte = {
  text: 'Steg 2.3.3: bältet flätas av rep vid elden av den som kan tekniken, och den som saknar ett tar på sig ett. När man bär hem hänger redskapet i bältet: det tar inga händer, så den som har yxan i bältet bär lika mycket som med tomma händer. En korg hänger inte i bältet',
  kor: () => {
    const s = createState(2, START); tandEld(s);
    for (const r of s.people) r.tek = { ...r.tek, rep: 1, balte: 1 };
    setMat(s, { bar: 300 }); setAmount(s, 'ved', 60); setAmount(s, 'rep', 12);
    const balte = () => tingOf(s).find(t => t.k === 'balte_rep' && t.bar !== undefined);
    let h = 0;
    while (!balte() && h < 120) { kor(s, 1); h++; }
    const b = balte(), p = b && byId(s, b.bar!);
    const flatat = (s.stat?.balte_rep ?? 0) > 0;
    let lika = false, mindreUtan = false, iKroken = false, korgEj = false;
    if (p) {
      for (const t of tingOf(s)) if (t.hos === p.id) t.hos = undefined;
      const fri = bordPlats(s, p);
      const yxa = addTool(s, 'yxa', p); take(s, p, 'yxa');
      lika = Math.abs(bordPlats(s, p) - fri) < 1e-9;
      const u = utrustning(s, p, true);
      iKroken = u.krok.ting === yxa && u.hoger.borda === true && u.vanster.borda === true && u.balte.ting === b;
      b.bar = undefined; mindreUtan = bordPlats(s, p) < fri - 1e-6; b.bar = p.id;
      const korg = addTool(s, 'korg', p); yxa.hos = undefined; take(s, p, 'korg');
      korgEj = utrustning(s, p, true).hoger.ting === korg && !utrustning(s, p, true).krok.ting;
    }
    return [
      [`ett bälte flätas och tas på (efter ${h} timmar)`, !!b && flatat],
      ['med yxan i bältet bär man lika mycket som med tomma händer', lika],
      ['utan bältet bär man mindre med yxan i handen', mindreUtan],
      ['yxan hänger i bältet och bördan är i båda händerna', iKroken],
      ['korgen hänger inte i bältet', korgEj],
    ];
  },
};

SCENARIER.plagg = {
  text: 'Steg 3.10.12: kläderna är plagg av ett material. Varje plagg och material som går ihop är en sak (en rock och skor av kaninskinn eller vargskinn, ett bälte av rep), med värmen, vikten, hållbarheten och skyddet räknade ur båda. Den som syr väljer materialet: det varma inför och under istiden, det som skyddar mest efter en strid, inte det som behövs till annat, och sist det enklare (den ansedda det finare). Sparade byar läses in med de nya namnen',
  kor: () => {
    const K = SIM.SAKER;
    // registret: varje par är en sak i plaggets grupp, och vargskinnet värmer och skyddar mer
    const alla = SIM.KLADER_AV.every(({ k, plagg }) => !!K[k]?.klad && K[k]!.grupp === plagg && SIM.GORS[plagg].includes(k));
    const varmare = K.rock_vargskinn!.klad!.varme > K.rock_kaninskinn!.klad!.varme && K.skor_vargskinn!.klad!.varme > K.skor_kaninskinn!.klad!.varme;
    const skyddar = (SIM.SKYDD.rock_vargskinn?.tar.bett ?? 0) > (SIM.SKYDD.rock_kaninskinn?.tar.bett ?? 0);
    const namn = K.rock_vargskinn!.namn === 'Rock av vargskinn' && K.rock_vargskinn!.gors!.text === 'Syr en rock av vargskinn.' && SIM.bestamd(K.skor_kaninskinn!.namn)[0] === 'skorna av harskinn';
    const recept = SIM.receptAv('rock', 'vargskinn').vargskinn === 2 && SIM.receptAv('rock', 'kaninskinn').skinn === 3 && SIM.receptAv('skor', 'vargskinn').vargskinn === 1;
    // valet av material i en by som har båda skinnen
    const by = (ai: number) => {
      const s = createState(2, START); tandEld(s);
      s.now = SIM.ageStart(s, ai) + 30 * HOUR;
      for (const r of s.people) { r.tek = { ...r.tek, kniv: 1, flatarbank: 1, bensyl: 1, skinnklader: 1 }; r.warm = 1; }
      setAmount(s, 'skinn', 30); setAmount(s, 'vargskinn', 6); setAmount(s, 'rep', 12);
      return s;
    };
    const val = (s: State) => SIM.kindFor(s, living(s)[0], 'rock');
    const sommar = by(2), host = by(3), istid = by(0), strid = by(2), behovs = by(2);
    const kallt = val(host) === 'rock_vargskinn' && val(istid) === 'rock_vargskinn';
    const varmt = val(sommar) === 'rock_kaninskinn';
    (strid.strider ??= []).push({ t: strid.now - HOUR, orsak: 'test', u: { avsikt: 'skada', w: 10, h: 10, kampar: [] }, fro: 1, vinnare: 0 } as SIM.StridMinne);
    const hot = val(strid) === 'rock_vargskinn';
    setAmount(behovs, 'skinn', 3); setAmount(behovs, 'vargskinn', 20); // tre kaninskinn: en rock, men skorna och rockarna som alla saknar behöver dem, och vargskinnet räcker till allt
    const sparas = val(behovs) === 'rock_vargskinn';
    setAmount(sommar, 'skinn', 0);
    const barafinns = val(sommar) === 'rock_vargskinn';
    // smak och anseende (punkt 6): när inget annat skiljer tar den ansedda det finare materialet (vargskinnet) och andra det
    // enklare (kodgenomgången 3.10.25: förut avgjorde plaggets värde, och vargrocken räknas billigare än harrocken)
    const lage = (k: string, mat: SIM.KladMaterial) => ({ k, varme: K[k]!.klad!.varme, skydd: SIM.KLADMATERIAL[mat].skydd, kvar: 20, behovs: 0, till: 1, finhet: SIM.KLADMATERIAL[mat].finhet, varde: SIM.grundvarde(k) });
    const tva = [lage('rock_kaninskinn', 'kaninskinn'), lage('rock_vargskinn', 'vargskinn')];
    const finare = SIM.valMaterial(tva, { kyla: false, hot: false, fin: true }) === 'rock_vargskinn' && SIM.valMaterial(tva, { kyla: false, hot: false, fin: false }) === 'rock_kaninskinn';
    // en gammal sparfil: skinnrocken, vargpälsen, skinnskorna och bältet får de nya namnen, och det som räknats följer med
    const g = by(2), [a, b] = living(g);
    const gammal = (k: string, p: Person) => { const t = addTool(g, 'yxa', p); t.k = k; t.bar = p.id; return t; };
    const tr = gammal('skinnrock', a), tv = gammal('vargpals', b), ts = gammal('skinnskor', a), tb = gammal('balte', b);
    const th = addTool(g, 'yxa', a); th.k = 'bensyl'; th.halv = { gor: 'skinnskor', ag: a.id, kvar: 60000 } as typeof th.halv;
    a.task = { act: 'skinnrock' as Act, phase: 'do', tx: a.x, ty: a.y, until: g.now + HOUR, carry: 0, tool: 'skinnrock' };
    a.habit = { ...a.habit, skinnrock: 5, skinnskor: 2, balte: 1 }; a.smak = { 'a:skinnskor': 0.5 };
    (b.stulet ??= []).push({ av: a.id, k: 'vargpals', n: 1 });
    g.stat = { ...g.stat, skinnrockar: 2, vargpalsar: 1, skinnskor: 3, balten: 4, stold_vargpals: 1, prod_skinnrock: 1, tek_balte: 1, tekTim_balte: 7 };
    g.v = 14; SIM.migrate(g);
    const sakerNya = tr.k === 'rock_kaninskinn' && tv.k === 'rock_vargskinn' && ts.k === 'skor_kaninskinn' && tb.k === 'balte_rep' && th.halv?.gor === 'skor_kaninskinn';
    const arbetet = a.task?.act === 'rock' && a.task.tool === 'rock_kaninskinn' && a.habit.rock === 5 && a.habit.skor === 2 && a.habit.balte === 1 && a.smak?.['a:skor'] === 0.5 && b.stulet![0].k === 'rock_vargskinn';
    const st = g.stat!;
    const rakna = st.rock_kaninskinn === 2 && st.rock_vargskinn === 1 && st.skor_kaninskinn === 3 && st.balte_rep === 4 && st.stold_rock_vargskinn === 1 && st.prod_rock === 1 && st.tek_balte === 1 && st.tekTim_balte === 7
      && st.skinnrockar === undefined && st.vargpalsar === undefined;
    const pa = SIM.paSig(g, a).map(t => K[t.k]?.namn).join(', ');
    return [
      ['varje plagg av ett material är en sak i plaggets grupp', alla],
      ['rock och skor av vargskinn värmer mer än av kaninskinn', varmare],
      ['rocken av vargskinn skyddar mer mot bett', skyddar],
      [`namnen: ${K.rock_vargskinn!.namn}, "${K.rock_vargskinn!.gors!.text}", ${SIM.bestamd(K.skor_kaninskinn!.namn)[0]}`, namn],
      ['receptet: en rock tar tre kaninskinn eller två vargskinn, skorna ett vargskinn', recept],
      ['inför och under istiden sys rocken av vargskinn, som värmer nog', kallt],
      ['på sommaren sys den av kaninskinn, som finns gott om och är enklare', varmt],
      ['efter en strid i byn sys den av vargskinn, som skyddar mer', hot],
      ['på sommaren sparas kaninskinnet när det behövs till skorna som alla saknar', sparas],
      ['finns bara vargskinn sys rocken av det', barafinns],
      ['när inget annat skiljer tar den ansedda vargskinnet, som är finare, och andra kaninskinnet', finare],
      ['en gammal sparfil: skinnrocken, vargpälsen, skinnskorna, bältet och det påbörjade får de nya namnen', sakerNya],
      ['... och arbetet, vanorna, smaken och det stulna', arbetet],
      [`... och räknarna; tekniken Bälte heter som förut (${pa})`, rakna],
    ];
  },
};

SCENARIER.bytessystem = {
  text: 'Ett bytessystem för alla byten (steg 4.4.1.1): ett byte mellan bybor går genom samma kod som handeln med handlaren sedan gör (parter i byte.ts). Ett stort byte (ett redskap) görs på en filt där sakerna ligger en stund och skrivs i krönikan; ett litet vardagsbyte är en överlämning från hand till hand och skrivs bara i loggen. En gåva av ett redskap till ett barn och mat till den som höll på att dö skrivs i krönikan.',
  kor: () => {
    const ny = () => {
      const s = createState(6, START);
      rikBy(s); tomtForrad(s); s.ting = [];
      const [a, b, c] = treVuxna(s, 1, q => { q.warm = 1; q.pot.empati = 10; q.habit = {}; });
      for (const q of [a, b, c]) for (const r of [a, b, c]) if (q !== r) getRel(s, q, r).op = 0;
      s.people = [a, b, c]; c.x = 90;
      return { s, a, b, c };
    };
    const kron = (s: State, t: string) => (s.hist?.kronika ?? []).filter(k => k[1].includes(t)).length;
    const logg = (s: State, t: string) => s.log.filter(l => l.text.includes(t)).length;
    // ett redskap mot mat: ett stort byte på en filt, i loggen och i krönikan
    let { s, a, b } = ny();
    a.habit = { samla: 10 }; addTool(s, 'korg', b); addTool(s, 'korg', b); gain(s, a, 'bar', 20);
    const korg = askForTool(s, a, b) === 'byte';
    const filt = s.filtar?.length === 1 && s.filtar[0].varor.some(v => v.k === 'korg' && v.fran === b.id) && s.filtar[0].varor.some(v => v.fran === a.id);
    const stort = korg && logg(s, 'bytte:') === 1 && kron(s, 'bytte:') === 1 && (s.stat?.storaByten ?? 0) === 1;
    // filten plockas ihop efter en stund
    s.now += 2 * HOUR; SIM.stadaByten(s);
    const ihop = !s.filtar?.length;
    // ett litet byte (mat mot trä): en överlämning, i loggen men inte i krönikan
    ({ s, a, b } = ny());
    a.hunger = 0.3; addTo(s, 'bar', 5); gain(s, b, 'bar', 6); gain(s, a, 'ved', 6);
    needLadder(s, a, 1);
    const litet = (s.stat?.byten ?? 0) === 1 && logg(s, 'bytte:') === 1 && kron(s, 'bytte:') === 0 && !s.filtar?.length
      && (s.overl ?? []).some(o => o.a === b.id && o.b === a.id && o.k === 'bar') && (s.overl ?? []).some(o => o.a === a.id && o.b === b.id && o.k === 'ved');
    // en förälder ger ett redskap till sitt barn: i krönikan
    ({ s, a, b } = ny());
    addTool(s, 'fiskespjut', a); addTool(s, 'fiskespjut', a); b.habit = { fiske: 10 }; b.mother = a.id; b.born = s.now - (SIM.ALDER.vuxen - 4) * SIM.DAY; // b är ett barn
    let gav = false; for (let i = 0; i < 30 && !gav; i++) gav = askForTool(s, a, b) === 'gåva';
    const barnGava = gav && kron(s, ' gav en ') === 1;
    // mat till den som håller på att dö: i krönikan
    ({ s, a, b } = ny());
    a.hunger = 0; a.health = 0.5; gain(s, b, 'bar', 6); getRel(s, b, a).op = 80; getRel(s, a, b).op = 80; b.pot.empati = 20;
    let dor = 0; for (let i = 0; i < 20 && !dor; i++) { askForGift(s, a, b); dor = kron(s, 'som höll på att dö'); }
    return [
      [`ett redskap byts på en filt med sakerna från båda (${korg ? 'bytte' : 'inget byte'})`, korg && filt],
      ['det stora bytet står i loggen och i krönikan', stort],
      ['filten plockas ihop efter en stund', ihop],
      ['ett litet byte är en överlämning från hand till hand, i loggen men inte i krönikan', litet],
      ['ett redskap som ges till ett barn står i krönikan', barnGava],
      [`mat till den som håller på att dö står i krönikan (${dor})`, dor > 0],
    ];
  },
};

SCENARIER.handlare = {
  text: 'Handlare som kommer när byns rikedom passerat en gräns (steg 4.4.1.2, handel.ts): en fattig by får ingen handlare; när rikedomen passerat HANDEL.rik bestäms när den första kommer. Handlaren kommer gående från kartans kant, breder ut en filt med sina varor nära elden, stannar några timmar och går hem igen, och nästa besök bestäms. Varorna ryms i ryggsäcken, den första handlaren står i krönikan, och under istiden kommer ingen.',
  kor: () => {
    const timmar = (s: State, n: number) => { for (let i = 0; i < n * 3600 / BEAT; i++) step(s, BEAT); };
    // en fattig by: ingen handlare bestäms
    let s = createState(6, START);
    timmar(s, 3);
    const fattig = s.nastaHandlare === undefined && !s.handlare && rikedom(s) < SIM.HANDEL.rik;
    // en rik by: den första handlaren bestäms
    rikBy(s); for (let i = 0; i < 40; i++) addTo(s, 'flinta', 10);
    timmar(s, 2);
    const bestamd = rikedom(s) >= SIM.HANDEL.rik && s.nastaHandlare !== undefined && s.nastaHandlare <= s.now + SIM.HANDEL.forsta[1] * SIM.DAY;
    // handlaren kommer: från kanten, med varor som ryms i ryggsäcken
    s.nastaHandlare = s.now;
    for (let i = 0; i < 30 && s.handlare?.fas !== 'handlar'; i++) step(s, BEAT);
    const h = s.handlare, e = SIM.eldPlats(s);
    const kom = !!h && h.id < 0 && h.varor.length > 0 && SIM.kgOf(h.varor) <= SIM.rymmer(h) && h.silver >= SIM.HANDEL.silver[0]
      && (h.ut.x < 1 || h.ut.y < 1 || h.ut.x > SIM.W - 1 || h.ut.y > SIM.H - 1);
    const filt = !!h && h.fas === 'handlar' && Math.hypot(h.x - e.x - 0.5, h.y - e.y - 0.5) <= SIM.HANDEL.avstand + 1
      && (s.filtar ?? []).some(f => f.handlare === h.id && f.varor.length === h.varor.length);
    const kron = (s.hist?.kronika ?? []).filter(k => k[1].includes('första handlaren')).length === 1;
    // hen går hem efter några timmar, filten plockas ihop och nästa besök bestäms
    timmar(s, SIM.HANDEL.stannarTim[1] + 1);
    const gick = !s.handlare && !(s.filtar ?? []).some(f => f.handlare !== undefined) && (s.nastaHandlare ?? 0) > s.now + SIM.HANDEL.dygnMin * 0.7 * SIM.DAY - 2 * HOUR
      && s.log.some(l => l.text.includes('gick hemåt'));
    // under istiden kommer ingen
    const t = createState(6, START); rikBy(t);
    t.kal = SIM.nyKalender(t.now, SIM.ISTID); t.nastaHandlare = t.now;
    timmar(t, 3);
    const istid = SIM.iIstiden(SIM.ageIndex(t)) && !t.handlare;
    return [
      [`en fattig by får ingen handlare (rikedom ${Math.round(rikedom(createState(6, START)))})`, fattig],
      [`när byn är rik nog bestäms den första handlaren (rikedom ${Math.round(rikedom(s))})`, bestamd],
      [`handlaren kommer från kanten med varor som ryms i ryggsäcken (${h ? `${h.namn}, ${SIM.kgOf(h.varor).toFixed(1)} kg av ${SIM.rymmer(h)}` : 'ingen'})`, kom],
      ['handlaren breder ut en filt med varorna nära elden', filt],
      ['den första handlaren står i krönikan', kron],
      ['handlaren går hem efter några timmar och nästa besök bestäms', gick],
      ['under istiden kommer ingen handlare', istid],
    ];
  },
};

SCENARIER.silver = {
  text: 'Handeln med silver (steg 4.4.1.3, handel.ts): byn handlar med handlaren genom ledaren eller den äldsta vuxna, som går till filten. Byn säljer det den har gott om och köper det den saknar, i samma byte som alla andra (bytaMed), och silvret jämnar ut skillnaden. Handlaren går aldrig med på ett byte till sin nackdel och köper aldrig mer än hen kan bära: är ryggsäcken full blir det vara mot vara eller silver.',
  kor: () => {
    const fram = (s: State) => { rikBy(s); s.nastaHandlare = s.now; for (let i = 0; i < 40 && s.handlare?.fas !== 'handlar'; i++) step(s, BEAT); return s.handlare!; };
    const varde = (h: SIM.Handlare) => h.varor.reduce((a, w) => a + w.n * grundvarde(w.k), 0) + h.silver * grundvarde('silver');
    const vuxen = (s: State) => living(s).find(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen)!;
    const handla = (s: State, h: SIM.Handlare) => { const p = vuxen(s); p.x = h.x - 1; p.y = h.y; SIM.handlaKlar(s, p, { act: 'handla', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, ref: h.id, dark: false, why: '' } as Task); };
    // byn har gott om torkad fisk och saknar rep; handlaren har rep
    let s = createState(6, START);
    const h = fram(s);
    setAmount(s, 'torrfisk', 120); setAmount(s, 'rep', 0); setAmount(s, 'silver', 0);
    h.varor = [{ k: 'rep', n: 6 }, { k: 'flinta', n: 2 }]; h.silver = 30;
    const fore = varde(h), fisk0 = amountOf(s, 'torrfisk');
    handla(s, h);
    const salde = amountOf(s, 'torrfisk') < fisk0 && h.varor.some(w => w.k === 'torrfisk');
    const kopte = amountOf(s, 'rep') >= 1;
    // har handlaren inget byn vill ha, betalar hen med silver
    const s2 = createState(6, START), h2 = fram(s2);
    setAmount(s2, 'torrfisk', 120); setAmount(s2, 'silver', 0);
    h2.varor = []; h2.silver = 30;
    handla(s2, h2);
    const silver = amountOf(s2, 'silver') >= 1 && h2.silver === 30 - Math.round(amountOf(s2, 'silver')) && h2.varor.some(w => w.k === 'torrfisk');
    const vinst = varde(h) >= fore - 1e-9;
    const bara = SIM.kgOf(h.varor) <= SIM.rymmer(h) + 1e-9;
    const filt = (s.filtar ?? []).some(f => f.handlare === h.id && f.varor.length === h.varor.length);
    // ryggsäcken är full: handlaren köper inget som väger, men byn kan ändå köpa (vara mot vara eller silver)
    const t = createState(6, START), g = fram(t);
    setAmount(t, 'torrfisk', 120); setAmount(t, 'rep', 0);
    g.varor = [{ k: 'rep', n: 4 }, { k: 'sten', n: Math.floor((SIM.rymmer(g) - 4 * viktOf('rep')) / viktOf('sten')) }]; g.silver = 5;
    const kg0 = SIM.kgOf(g.varor);
    handla(t, g);
    const full = SIM.kgOf(g.varor) <= Math.max(kg0, SIM.rymmer(g)) + 1e-9 && !g.varor.some(w => w.k === 'torrfisk');
    // ledaren (eller den äldsta vuxna) går till filten på dagen och handlar
    const u = createState(6, START), k = fram(u);
    let gick = false;
    for (let i = 0; i < 12 * 3600 / BEAT && !k.bynKlar && u.handlare; i++) { step(u, BEAT); if (u.people.some(p => p.task?.act === 'handla')) gick = true; }
    return [
      [`byn säljer det den har gott om (torkad fisk ${fisk0} → ${Math.round(amountOf(s, 'torrfisk'))})`, salde],
      [`byn köper det den saknar (rep ${Math.round(amountOf(s, 'rep'))})`, kopte],
      [`har handlaren inget byn vill ha betalar hen med silver (byns silver ${Math.round(amountOf(s2, 'silver'))}, handlarens ${h2.silver})`, silver],
      [`handlaren förlorar inget på handeln (grundvärde ${fore.toFixed(1)} → ${varde(h).toFixed(1)})`, vinst],
      [`handlaren bär inte mer än ryggsäcken rymmer (${SIM.kgOf(h.varor).toFixed(1)} av ${SIM.rymmer(h)} kg)`, bara],
      ['filten visar handlarens varor efter handeln', filt],
      [`med full ryggsäck köper handlaren inget som väger (${SIM.kgOf(g.varor).toFixed(1)} kg)`, full],
      ['någon går till filten och handlar för byn', gick && !!k.bynKlar],
    ];
  },
};

SCENARIER.handelsfardighet = {
  text: 'Färdigheten Handel (steg 4.4.1.4, behov.ts): den skickligare i ett byte får en större del av vinsten, den som är mycket skickligare kan lura en ovan, och den lurade märker det ibland och minns det (en sur tanke). Båda övar Handel i varje byte. Byn handlar genom ledaren, och utan ledare genom den som är skickligast i Handel. En nykomling har lite handel från början, av berättandet och hantverket.',
  kor: () => {
    const fram = (s: State) => { rikBy(s); s.nastaHandlare = s.now; for (let i = 0; i < 40 && s.handlare?.fas !== 'handlar'; i++) step(s, BEAT); return s.handlare!; };
    const vuxna = (s: State) => living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
    const bas = createState(6, START), h0 = fram(bas);
    setAmount(bas, 'torrfisk', 120); setAmount(bas, 'silver', 0); h0.varor = []; h0.silver = 60; h0.handel = 10;
    if (bas.styre) bas.styre.ledare = undefined;
    // byn säljer fisk för silver med en ovan och en skicklig i Handel
    const salj = (skill: number, i = 0) => {
      const s = cloneState(bas), h = s.handlare!, p = vuxna(s)[0];
      s.stat = { ...s.stat }; const l0 = s.stat.lurat ?? 0;
      s.seed = bas.seed; for (let j = 0; j < i; j++) SIM.rnd(s, 'handel');
      p.skill.handel = skill; p.x = h.x - 1; p.y = h.y;
      const fore = p.skill.handel;
      SIM.handlaKlar(s, p, { act: 'handla', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, ref: h.id, dark: false, why: '' } as Task);
      return { silver: amountOf(s, 'silver'), ovat: p.skill.handel > fore, lurad: p.thoughts?.some(t => t.text.startsWith('Blev lurad')) ?? false, lurat: (s.stat?.lurat ?? 0) > l0 };
    };
    const ovan = salj(0), skicklig = salj(20);
    let lurat = 0, markt = 0;
    for (let i = 0; i < 60; i++) { const r = salj(0, i); if (r.lurat) lurat++; if (r.lurad) markt++; }
    // utan ledare handlar den skickligaste
    const t = cloneState(bas), v = vuxna(t);
    for (const p of t.people) if (p.task?.act === 'handla') p.task = undefined;
    for (const p of v) p.skill.handel = 2;
    v[v.length - 1].skill.handel = 15;
    const bast = !!SIM.handlaVal(t, v[v.length - 1]) && !SIM.handlaVal(t, v[0]);
    const ny = vuxna(createState(9, START))[0];
    return [
      [`den skickliga får mer betalt än den ovana (silver ${Math.round(skicklig.silver)} mot ${Math.round(ovan.silver)})`, skicklig.silver > ovan.silver],
      [`en skicklig handlare lurar ibland en ovan (${lurat} av 60 gånger), och den lurade märker det ibland (${markt})`, lurat > 0 && markt > 0 && markt <= lurat],
      ['den som handlar övar Handel', ovan.ovat],
      ['utan ledare handlar den som är skickligast i Handel', bast],
      [`en nykomling har lite Handel från början (${ny.skill.handel.toFixed(1)})`, Math.abs(ny.skill.handel - SIM.handelStart(ny)) < 1e-9 && ny.skill.handel > 0],
    ];
  },
};

SCENARIER.handelsko = {
  text: 'Hur handeln syns (steg 4.4.1.5, handel.ts): byn handlar först, sedan ställer sig de bybor som har nytta av något handlaren har i kö vid filten, först till kvarn. Den första handlar med sina egna saker, den andra väntar. Det den första köpte är borta för nästa, som går tomhänt och blir lite sämre till mods. Handlaren minns bytena under besöket, och bilden visar pratbubblor bara för den som handlar.',
  kor: () => {
    const s = createState(6, START);
    rikBy(s); s.nastaHandlare = s.now;
    for (let i = 0; i < 40 && s.handlare?.fas !== 'handlar'; i++) step(s, BEAT);
    const h = s.handlare!, [a, b] = living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
    const fore = SIM.handlaVal(s, a); // byn har inte handlat: den som handlar för byn går först
    h.bynKlar = true;
    for (const p of living(s)) if (p.task?.act === 'handla') p.task = undefined;
    // torkat kött som båda har nytta av, och något över att betala med
    const k = 'torrkott';
    h.varor = [{ k, n: 2 }]; h.silver = 20;
    for (const p of [a, b]) { SIM.put(s, 'skinn', 6, { [p.id]: 6 }); SIM.put(s, 'silver', 20, { [p.id]: 20 }); }
    const uppgift = (p: Person, v: NonNullable<ReturnType<typeof SIM.handlaVal>>) => { p.task = { act: 'handla', phase: 'do', tx: v.spot.x, ty: v.spot.y, until: s.now + v.dur, carry: 0, ref: v.ref, dark: false, why: v.why } as Task; };
    const va = SIM.handlaVal(s, a)!; uppgift(a, va);
    const vb = SIM.handlaVal(s, b)!; uppgift(b, vb);
    const ko = h.ko?.[0] === a.id && h.ko?.[1] === b.id && va.why.startsWith('Handlar') && vb.why.startsWith('Står i kö');
    const bubbla = SIM.handlarNu(s, a) && !SIM.handlarNu(s, b);
    SIM.handlaKlar(s, b, b.task!); // b väntade bara: inget händer
    const vantade = !h.handlat?.includes(b.id) && h.varor.length === 1;
    SIM.handlaKlar(s, a, a.task!);
    const kopte = ownsAmount(s, a, k) >= 2 && !h.varor.some(w => w.k === k);
    const minns = (h.bytt ?? []).some(x => x.vem === a.name);
    const vb2 = SIM.handlaVal(s, b);
    const fram = !!vb2 && vb2.why.startsWith('Handlar');
    if (vb2) uppgift(b, vb2);
    SIM.handlaKlar(s, b, b.task!);
    const tom = b.thoughts.some(t => t.text.startsWith('Gick tomhänt'));
    return [
      ['innan byn handlat går bara den som handlar för byn (eller ingen annan)', !fore || fore.why.includes('för byn')],
      ['två som vill ha samma sak ställer sig i kö, först till kvarn', ko],
      ['bara den som handlar har pratbubblor med varorna', bubbla],
      ['den som står i kö väntar på sin tur', vantade],
      [`den första köper (${k}) med sina egna saker`, kopte],
      ['handlaren minns bytet (inforutan)', minns],
      ['den andra flyttar fram i kön', fram],
      ['det den första köpte är borta: den andra går tomhänt och blir lite sämre till mods', tom],
      ['den som handlat ställer sig inte i kö igen', !SIM.handlaVal(s, a)],
    ];
  },
};

SCENARIER.grannklaner = {
  text: 'Grannklanerna (steg 4.4.3, klaner.ts): en ny by har några grannklaner med namn, folk, styrka, resurser, inställning till byn och namngivna personer, och en sparad by från före v242 får dem. Klanerna växer och krymper en gång om dygnet (ett år i spelet), och inställningen glöms mot det neutrala. Handlaren kommer från en klan som inte tycker illa om byn; en fientlig klan skickar ingen. Ett byte med handlaren gör klanen vänligare, och märker hen att byn lurat hen blir den mindre vänlig.',
  kor: () => {
    const s = createState(6, START), k = SIM.klanerOf(s);
    const finns = k.length === SIM.KLAN.antal && k.every(c => c.folk > 0 && c.styrka > 0 && c.personer.some(p => p.roll === 'hovding'));
    const unika = new Set(k.map(c => c.namn)).size === k.length;
    const g = cloneState(s); delete g.klaner; g.v = 19; SIM.migrate(g);
    const migr = SIM.klanerOf(g).length === SIM.KLAN.antal;
    // alla tycker illa om byn: ingen handlare
    const f = cloneState(s); rikBy(f);
    for (const c of SIM.klanerOf(f)) c.inst = -80;
    f.nastaHandlare = f.now;
    for (let i = 0; i < 40; i++) step(f, BEAT);
    const ingen = !f.handlare && f.nastaHandlare > f.now;
    // en klan är vänlig: handlaren kommer därifrån
    rikBy(s); k[0].inst = 40; for (const c of k.slice(1)) c.inst = -80;
    s.nastaHandlare = s.now;
    for (let i = 0; i < 40 && s.handlare?.fas !== 'handlar'; i++) step(s, BEAT);
    const h = s.handlare, fran = !!h && h.klan === k[0].id && h.hem === k[0].hem && k[0].personer.some(p => p.roll === 'handlare' && p.namn === h.namn);
    // ett byte gör klanen vänligare, en upptäckt lurendrejeri mindre vänlig
    const [a] = living(s), pa = { id: a.id, namn: a.name, x: a.x, y: a.y, varde: () => 0, over: () => [] } as SIM.Part;
    const ph = { ...pa, id: h?.id ?? -1, namn: h?.namn ?? '' } as SIM.Part;
    const i0 = k[0].inst;
    for (const fn of SIM.vidByte) fn(s, pa, ph, [], []);
    const vanligare = k[0].inst === i0 + SIM.KLAN.handel;
    if (h) h.handel = 1000; // märker det säkert
    const i1 = k[0].inst;
    for (const fn of SIM.vidLura) fn(s, pa, ph);
    const lurad = k[0].inst === i1 - SIM.KLAN.lurad;
    // dygnen går: folket ändras, inställningen glöms
    const folk0 = k.map(c => c.folk).join(), inst0 = k[0].inst;
    for (let d = 0; d < 3; d++) { s.now += SIM.DAY; SIM.klanSteg(s, SIM.DAY / SIM.SEC); }
    const andras = k.map(c => c.folk).join() !== folk0;
    const glomt = Math.abs(k[0].inst) < Math.abs(inst0);
    const ui = SIM.instText(60) === 'vänner' && SIM.instText(-80) === 'fientliga';
    return [
      [`en ny by har ${SIM.KLAN.antal} grannklaner med folk, styrka och en hövding`, finns],
      ['klanerna har olika namn', unika],
      ['en sparad by från före v242 får grannklaner', migr],
      ['en klan som tycker illa om byn skickar ingen handlare', ingen],
      ['handlaren kommer från en vänlig klan och är en av dess namngivna personer', fran],
      ['ett byte med handlaren gör klanen vänligare', vanligare],
      ['märker handlaren att byn lurat hen blir klanen mindre vänlig', lurad],
      ['klanerna växer eller krymper med dygnen', andras],
      ['inställningen glöms mot det neutrala', glomt],
      ['inställningen har ord (vänner … fientliga)', ui],
    ];
  },
};

SCENARIER.rovare = {
  text: 'Rövarflocken (steg 4.4.5, rovare.ts): en rik by lockar rövare, mindre ju bättre försvar den har. Flocken kommer från en grannklan som inte tycker om byn och samlas i kartans kant. Vakten ser den, gissar hur många de är och ropar, och byn skyddar sig som mot vargar. Ett tyst anfall (alla sover) plundrar förrådet osett; står de vuxna emot blir det en strid; väntar byn med många fler än rövarna vänder de om. Sedan flyr flocken ut ur kartan.',
  kor: () => {
    const s = createState(6, START), dt = BEAT / SIM.SEC;
    const fattig = SIM.lockar(s) === 0;
    const r = cloneState(s); setAmount(r, 'skinn', 400);
    const utan = Math.min(1, Math.max(0, (rikedom(r) - SIM.ROVARE.rikFran) / SIM.ROVARE.rikSpann));
    const rik = SIM.lockar(r) > 0, forsvar = SIM.forsvaret(r) > 0 && SIM.lockar(r) < utan;
    // flocken kommer från den fientliga klanen och samlas i kanten
    const k0 = SIM.klanerOf(s)[0]; for (const c of SIM.klanerOf(s)) c.inst = 10; k0.inst = -60;
    const bas = cloneState(s);
    // testläget (steg 4.5.4.4): knapparna skickar en liten, mellanstor eller stor flock, och en handlare, också när ingen klan tycker om byn
    const tl = (['liten', 'mellan', 'stor'] as const).map(k => { const q = cloneState(bas); const ok = SIM.skickaRovare(q, SIM.ROVARFLOCK[k]); return ok && q.rovare?.folk.length === SIM.ROVARFLOCK[k] && !SIM.skickaRovare(q, 2) ? SIM.ROVARFLOCK[k] : 0; });
    const th = cloneState(bas); for (const c of SIM.klanerOf(th)) c.inst = -60;
    const testHandlare = SIM.skickaHandlare(th) && !!th.handlare && th.handlare.fas === 'kommer' && !SIM.skickaHandlare(th);
    SIM.rovarnaKommer(s, 4);
    const f = s.rovare!;
    const kommer = !!f && f.folk.length === 4 && f.klan === k0.id && f.gor === 'samlas' && f.folk.every(x => x.namn && x.vapen) && (f.x < 1 || f.y < 1 || f.x > SIM.W - 1 || f.y > SIM.H - 1);
    // vakten ser den, gissar och ropar; den som hör det skyddar sig
    const [a, b] = living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vaktFran);
    a.x = f.x + (f.x < 1 ? 6 : f.x > SIM.W - 1 ? -6 : 0); a.y = f.y + (f.y < 1 ? 6 : f.y > SIM.H - 1 ? -6 : 0);
    b.x = a.x + 1; b.y = a.y;
    a.task = { act: 'vakt', phase: 'do', tx: a.x, ty: a.y, until: s.now + HOUR, carry: 0 };
    b.task = { act: 'samtal', phase: 'do', tx: b.x, ty: b.y, until: s.now + HOUR, carry: 0 };
    SIM.rovarSteg(s, dt);
    const sedd = f.sedd !== undefined && (f.gissning ?? 0) >= 1 && a.larm?.vad === 'rovare' && b.larm?.vad === 'rovare';
    const skydd = /Rövare/.test(SIM.vargSkydd(s, b)?.why ?? '');
    // ett tyst anfall: alla sover, flocken går fram till förrådet och tar det mest värda
    const forrad = (x: State) => SIM.SAK_LIST.filter(k => !SAKER[k]!.redskap).reduce((n, k) => n + amountOf(x, k), 0);
    const malet = (x: State) => { const z = SIM.zoneOf(x)!; return { x: z.x + z.w / 2, y: z.y + z.h / 2 }; };
    const flock = (x: State, n: number, d: number) => { SIM.rovarnaKommer(x, n); const m = malet(x); Object.assign(x.rovare!, { gor: 'kommer', x: m.x + d, y: m.y }); return x.rovare!; };
    const t = cloneState(bas); setAmount(t, 'skinn', 20);
    for (const p of living(t)) p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: t.now + 8 * HOUR, carry: 0 };
    const t0 = forrad(t); flock(t, 3, 3);
    for (let i = 0; i < 400 && t.rovare?.gor !== 'flyr'; i++) SIM.rovarSteg(t, dt);
    const tyst = (t.stat?.rovarTyst ?? 0) === 1 && forrad(t) < t0 && (t.stat?.rovat ?? 0) >= 1 && (t.hist?.kronika ?? []).some(x => x[2] === 'rovare');
    // de vuxna står emot: en strid
    const c = cloneState(bas), fc = flock(c, 3, 3); fc.sedd = c.now;
    const vuxna = living(c).filter(p => SIM.ageOf(p, c.now) >= SIM.ALDER.vaktFran && SIM.ageOf(p, c.now) < SIM.ALDER.vaktTill).slice(0, 2);
    for (const p of living(c)) p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: c.now + 8 * HOUR, carry: 0 };
    const m = malet(c);
    for (const p of vuxna) { p.x = m.x; p.y = m.y; p.task = { act: 'forsvar', phase: 'do', tx: p.x, ty: p.y, until: c.now + HOUR, carry: 0 }; }
    for (let i = 0; i < 400 && c.rovare?.gor !== 'flyr'; i++) SIM.rovarSteg(c, dt);
    const strid = (c.stat?.rovarStrid ?? 0) === 1 && !!c.strider?.some(x => /rövare/.test(x.orsak));
    // byn väntar med många fler: rövarna vänder om, och flyr sedan ut ur kartan
    const d = cloneState(bas), fd = flock(d, 2, 8); fd.sedd = d.now;
    const md = malet(d);
    for (const p of living(d)) p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: d.now + 8 * HOUR, carry: 0 };
    for (const p of living(d).filter(p => SIM.ageOf(p, d.now) >= SIM.ALDER.vaktFran).slice(0, 4)) { p.x = md.x; p.y = md.y; p.task = { act: 'forsvar', phase: 'do', tx: p.x, ty: p.y, until: d.now + HOUR, carry: 0 }; }
    SIM.rovarSteg(d, dt);
    const vande = d.rovare?.gor === 'flyr' && (d.stat?.rovarVande ?? 0) === 1;
    for (let i = 0; i < 3000 && d.rovare; i++) SIM.rovarSteg(d, dt);
    const borta = !d.rovare && (d.stat?.rovarBorta ?? 0) === 1;
    // en ny flock kommer inte förrän vilan är slut
    const vila = (d.rovarVila ?? 0) > d.now;
    return [
      [`testläget skickar en liten, mellanstor och stor flock (${tl.join(', ')} rövare) och en handlare`, tl[0] > 0 && tl[0] < tl[1] && tl[1] < tl[2] && testHandlare],
      ['en ny och fattig by lockar inga rövare', fattig],
      ['en rik by lockar rövare', rik],
      ['försvaret räknas emot rikedomen', forsvar],
      ['flocken kommer från den fientliga klanen och samlas i kartans kant', kommer],
      ['vakten ser flocken, gissar hur många och ropar', sedd],
      ['den som hört ropet skyddar sig som mot vargar', skydd],
      ['ett tyst anfall plundrar förrådet osett och skrivs i krönikan', tyst],
      ['de vuxna som står emot slåss med rövarna', strid],
      ['väntar byn med många fler vänder rövarna om', vande],
      ['flocken flyr ut ur kartan', borta],
      ['en ny flock kommer inte förrän vilan är slut', vila],
    ];
  },
};

SCENARIER.entitag = {
  text: 'Steg 4.5.3.6: vid en arbetsbänk arbetar en i taget (STATIONER `samtidigt`, annars 1). Står någon redan vid bänken väljer en annan en annan bänk av samma sort eller ett annat arbete, och i en by som arbetar står aldrig två vid samma bänk',
  kor: () => {
    const s = createState(2, START); tandEld(s);
    const st = medBank(s, 'flatarbank');
    for (const r of s.people) r.tek = { ...r.tek, kniv: 1, flatarbank: 1, korg: 1 };
    const [a, b] = living(s);
    const at = SIM.vidStation(st);
    a.task = { act: 'korg', phase: 'do', tx: at.x, ty: at.y, until: s.now + HOUR, carry: 0 } as Task;
    const ledigForA = SIM.stationFor(s, 'korg', a) === st && SIM.kanGoras(s, 'korg', a);
    const fullForB = SIM.upptagen(s, st, b) && !SIM.stationFor(s, 'korg', b) && !SIM.kanGoras(s, 'korg', b) && SIM.kanGoras(s, 'korg');
    const st2: SIM.Station = { ...st, id: s.nextStation = (s.nextStation ?? 0) + 1, x: st.x + 3 }; // en bänk till bredvid
    s.stationer!.push(st2); SIM.touch(s);
    const andra = SIM.stationFor(s, 'korg', b) === st2;
    a.task = undefined;
    // i en by med två vuxna som arbetar: aldrig två vid samma bänk
    setMat(s, { bar: 300 }); setAmount(s, 'ved', 60); setAmount(s, 'grenar', 60); setAmount(s, 'rep', 20);
    let dubbel = 0, vid = 0;
    for (let h = 0; h < 72 * 6; h++) {
      kor(s, 1 / 6);
      for (const t of [st, st2]) {
        const n = living(s).filter(q => q.task?.phase === 'do' && SIM.stationDef(t.k)!.gor.includes(q.task.act) && (p => Math.abs(q.task!.ty - p.y) < 0.3 && Math.abs(q.task!.tx - p.x) < 1)(SIM.vidStation(t))).length;
        if (n > 1) dubbel++; if (n) vid++;
      }
    }
    return [
      ['den som redan står vid bänken kan arbeta vidare där', ledigForA],
      ['en annan får inte plats vid den upptagna bänken', fullForB],
      ['hen väljer den andra bänken av samma sort', andra],
      [`aldrig två vid samma bänk (${dubbel} gånger av ${vid} med någon vid en bänk)`, dubbel === 0],
    ];
  },
};
