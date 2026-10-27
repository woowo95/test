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
    const arv = toolsOf(s, 'fiskespjut').every(t => t.agare === BYN && t.hos === undefined);
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
    const tankar = barn > 0 && tanke(b, 'Fick en ') && tanke(a, 'Gav en ');
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
    let byten = 0, mat = 0, mtrl = 0, natt = 0, dag = 0;
    for (const seed of [1, 42]) {
      const v = createState(seed, START);
      for (let i = 0; i < 8 * STEG_DYGN; i++) {
        const f = v.stat?.kvallsbyten ?? 0, ljust = isLight(v.now);
        step(v, BEAT);
        if (ljust) dag += (v.stat?.kvallsbyten ?? 0) - f; else natt += (v.stat?.kvallsbyten ?? 0) - f;
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
      [`kvällens byten blir mest av på kvällar och nätter (${natt} i mörker, ${dag} i dagsljus)`, natt > 2 * dag && natt > 0],
    ];
  },
};


SCENARIER.egendom = {
  lang: true,
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
    bordan(s, d, 'sten', 30); leave(s, d, s.now);
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
      [`Gemenskap gör folk givmildare (${egen.toFixed(2)} → ${gem.toFixed(2)})`, gem > lite && lite > egen],
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
    const utanVarde = SAK_LIST.filter(k => SAKER[k]!.skaffa && !(v(k) > 0 && isFinite(v(k)))), medVarde = SAK_LIST.filter(k => !SAKER[k]!.skaffa && v(k) !== 0);
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
      [`en timmervägg räknas efter material och arbete (${hus.toFixed(1)})`, Math.abs(hus - (2 * v('ved') + 0.8)) < 1e-6],
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
  text: 'Steg 2.3.2: bensylen slipas av ett ben mot en sten och läggs vid slöjdbänken. Med den sys skinnrockar och skinnskor av skinn och rep vid bänken, och bensylen slits för varje plagg. Utan bensylen sys inga kläder. Den som saknar ett plagg tar på sig ett, kläderna skyddar mot kylan, väger något och slits ut, och den dödes kläder kan någon annan ta på sig',
  kor: () => {
    const s = createState(2, START); tandEld(s);
    const st = medBank(s, 'flatarbank');
    for (const r of s.people) r.tek = { ...r.tek, kniv: 1, flatarbank: 1, bensyl: 1, skinnklader: 1 };
    setMat(s, { bar: 300 }); setAmount(s, 'ved', 60); setAmount(s, 'ben', 3); setAmount(s, 'sten', 6); setAmount(s, 'skinn', 30); setAmount(s, 'rep', 12);
    // utan bensylen vid bänken sys inga kläder
    const utan = !SIM.kanGoras(s, 'skinnrock') && !SIM.kanGoras(s, 'skinnskor');
    let h = 0;
    const bensyl = () => tingOf(s).find(t => t.k === 'bensyl' && t.vid === st.id);
    while (!bensyl() && h < 72) { kor(s, 1); h++; }
    const slipad = !!bensyl(), timBensyl = h;
    const kan = SIM.kanGoras(s, 'skinnrock');
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
    return [
      ['utan bensylen vid slöjdbänken sys inga kläder', utan],
      [`en bensyl slipas och läggs vid slöjdbänken (efter ${timBensyl} timmar)`, slipad && kan],
      [`kläder sys vid bänken och tas på (${sydda} plagg efter ${h} timmar)`, sydda > 0 && !!buren],
      ['bensylen slits när kläderna sys', slits],
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
    const balte = () => tingOf(s).find(t => t.k === 'balte' && t.bar !== undefined);
    let h = 0;
    while (!balte() && h < 120) { kor(s, 1); h++; }
    const b = balte(), p = b && byId(s, b.bar!);
    const flatat = (s.stat?.balten ?? 0) > 0;
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
