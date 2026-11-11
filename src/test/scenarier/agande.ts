import { existsSync } from 'node:fs';
// Scenarier. Ägande och ekonomi: ägande, gåvor, byte, egendom, delning, arv och värde.
import { isDeepStrictEqual } from 'node:util';
import { Person, Act, Task, createState, bearbeta, ownedBy, tidyTools, addTool, toolsOf, heldBy, take, usesTool, wearTool, freeSpear, getRel, isTool, BYN, makeTool, step, living, pilesOf, amountOf, capacity, handOrkar, ryms, VIKT_STACK, isLight, isStored, spears, HOUR, State, migrate, die, bitsOf, KANIN, DJUR, askForTool, askForGift, gain, takeFood, takeFuel, ownsAmount, ownedStock, ownedSum, sumOf, addTo, setAmount, foodOf, STACK_ORDER, needLadder, takeMaterial, BEAT, stepDelning, rikedom, rikedomDelar, grundvarde, nivaOf, DELNING, packUp, releaseOwner, willing, tingOf, placeTools, EKONOMI, SAK_LIST, ownedAll, leave, chooseTask, stackOf, birth, SAKER, viktOf, handerFor, bordPlats, utrustning, bordaIHander, PLATS_LIST, cloneState, pickUp, load, byId } from '../../sim';
import * as SIM from '../../sim';
import { START, STEG_DYGN, STEG_TIM } from '../kor';
import { lasBy } from '../delby';
import { rovarGang, korTills, setItems, setMat, setFood, kor, klockan, tandEld, tomtForrad, treVuxna, SCENARIER, rikBy, medBank, utanWebblasare, nyInvanare } from './hjalp';
import { setByn, ui } from '../../ui/lage';
import { notisHtml, notisKlick, notisKnapp, notisVal } from '../../ui/notiser';
import { bortaBerattelse, bortaHtml, ikappHtml } from '../../ui/borta';
import { person } from '../../ui/flikar/person';
import { gaster } from '../../ui/gaster';
import { filt as filtFlik } from '../../ui/flikar/filt';
import { hjalpKlick, linkify } from '../../ui/hjalp';
import { taBortITest, testBortaIByn } from '../../ui/testborta';
import { station as stationFlik } from '../../ui/flikar/station';
import { lager as lagerFlik } from '../../ui/flikar/lager';
import { kronika as kronikaFlik, val as kronikaVal } from '../../ui/flikar/kronika';
import { tal as talFlik, talVal } from '../../ui/flikar/tal';
import { rikVal } from '../../ui/graf';
// handlaren väntar på kvällen innan filten läggs ut (steg 4.5.4.11): testerna som handlar på dagen hoppar över väntan
const utanVantan = (s: State) => { if (s.handlare?.fas === 'vantar') s.handlare.kvall = s.now; };
// p gör hela sin affär med handlaren (steg 4.5.7.4): hen får uppgiften handlaVal ger, står på platsen och gör klart den, steg för
// steg tills affären är över. forByn = hen handlar för byn, vem som än skulle ha gjort det. Ger den första uppgiften och alla
// tills = stanna (med uppgiften kvar) när affären kommit till den fasen och p står på sin plats.
const helAffar = (s: State, p: Person, forByn = false, tills?: SIM.Affar['fas']) => {
  const h = s.handlare, steg: string[] = [];
  if (!h) return { steg };
  if (forByn) h.affar = { vem: p.id, namn: p.name, byn: true, fas: 'fraga', kop: [], bud: [], hamta: [], framme: [], nej: 0, f: SIM.HANDEL.forstaBud, t: s.now };
  let forsta: ReturnType<typeof SIM.handlaVal>;
  for (let i = 0; i < 40; i++) {
    const v = SIM.handlaVal(s, p);
    if (!v) break;
    forsta ??= v; steg.push(v.why);
    p.x = v.spot.x; p.y = v.spot.y;
    p.task = { act: 'handla', phase: 'do', tx: v.spot.x, ty: v.spot.y, until: s.now + v.dur, carry: 0, ref: v.ref, dark: false, why: v.why } as Task;
    if (v.why.startsWith('Står i kö')) break;
    if (tills && h.affar?.vem === p.id && h.affar.fas === tills) { SIM.visaFiltar(s, h); return { forsta, steg }; }
    SIM.handlaKlar(s, p, p.task);
    if (h.affar?.vem !== p.id) break;
  }
  p.task = undefined;
  return { forsta, steg };
};

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
    makeTool(v, living(v)[1], 'spjut'); // ett eget spjut från början, så att provet inte hänger på vem som gör det (den som blir nattvakt lägger ner det hen bär)
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
    // grenar räknas i styck, inte i vedens behovsenheter: a köper 60 grenar av b och inga fler av c (motor-4). Sedan steg 6.1.5
    // är grenar så billiga att tre grenar är värda mindre än den minsta hela sak man kan betala med, så a köper 60
    let c: Person; ({ s, a, b, c } = ny()); c.x = a.x; c.y = a.y;
    gain(s, b, 'grenar', 60); gain(s, c, 'grenar', 60); gain(s, a, 'bar', 20);
    takeMaterial(s, a, 'grenar', 60);
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
      [`den som saknar 60 grenar köper 60 i ett byte (grannarna har ${grenar.toFixed(2)} av 120 kvar, ${grenOver.toFixed(2)} över, ${grenByten} byten)`, nara(grenar, 60) && nara(grenOver, 0) && grenByten === 1],
      ['ett redskap byts mot mat', korg],
      ['i samtal byter den som har mindre mat än hen vill ha kvar till sig mat mot trä, och båda tjänar på det', kvall],
      ['har båda det de vill ha kvar blir det inget byte', nog],
      ['en ovän byter inte i samtal heller', kvallOvan],
      [`i vanliga byar byter folk (${byten} byten på 8 dygn i 2 byar: ${mat.toFixed(1)} portioner mat, ${mtrl.toFixed(1)} material)`, byten > 0],
      // per timme, eftersom hur många timmar som är mörka beror på årstiden. Kvällens byten är minst en och en halv gång så
      // vanliga i mörkret (2,6 gånger före steg 3.10.25, 1,9 sedan fler samlar nära lägret på dagen, fynd 28, och omkring 1,5
      // sedan steg 6.2, när fritiden kommer när förråden är fulla, också på dagen). Minst 1,2 gånger, för bytena är få
      [`kvällens byten blir mest av på kvällar och nätter (${natt} i mörker, ${dag} i dagsljus; ${(natt / Math.max(1, morka) * STEG_DYGN / 24).toFixed(2)} och ${(dag / Math.max(1, ljusa) * STEG_DYGN / 24).toFixed(2)} i timmen)`, natt > 0 && natt / Math.max(1, morka) > 0.6 * dag / Math.max(1, ljusa)],
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
    setAmount(s, 'flinta', 0); setAmount(s, 'flinta', (DELNING.rik / 2 - rikedom(s)) / grundvarde('flinta')); stepDelning(s); // flinta: ved är för lite värd sedan steg 6.1.6 och ryms inte i förrådet
    const halv = s.delning!, halvEgen = egetAv(10);
    // rik
    setAmount(s, 'flinta', amountOf(s, 'flinta') + DELNING.rik / grundvarde('flinta')); stepDelning(s);
    const rik = s.delning!, rikRik = rikedom(s), rikEgen = egetAv(10);
    // fattig igen
    setAmount(s, 'flinta', 0); setFood(s, 0); stepDelning(s);
    const igen = s.delning!;
    // bufferten per jag (steg 6.2.20): i en rik by har byn ingen buffert för maten, utan familjen sin för det den äger. Den
    // fattiga familjen (äger ingen mat) samlar åt sig, den rika (äger mat för många dygn) gör det inte, fast byns förråd är fullt
    const j = createState(5, START); klockan(j); tandEld(j); setFood(j, 300); setItems(j, { flinta: 10, grenar: 30, torrgras: 10 }); setAmount(j, 'ved', 80); rikBy(j);
    // den fattiga är den som bryr sig mest om sig själv och familjen (egenintresset, projekt.ts)
    const vx = living(j).filter(q => SIM.ageOf(q, j.now) >= 18).sort((a, b) => SIM.egenintresse(j, b) - SIM.egenintresse(j, a)), fattig = vx[0], rikP = vx.find(q => !SIM.familjOf(j, fattig.id).includes(q))!;
    for (const q of SIM.familjOf(j, rikP.id)) gain(j, q, 'bar', 120);
    const egenMat = (q: Person) => { let n = 0; for (let i = 0; i < 40; i++) { q.task = undefined; chooseTask(j, q); if ((q.task as Task | undefined)?.why?.startsWith('Behöver egen mat')) n++; } return n; };
    const fDygn = SIM.familjMatDygn(j, SIM.familjOf(j, fattig.id)), rDygn = SIM.familjMatDygn(j, SIM.familjOf(j, rikP.id));
    const fattigSamlar = egenMat(fattig), rikSamlar = rikP ? egenMat(rikP) : -1;
    return [
      [`en ny by är fattig (rikedom ${nyRik.toFixed(0)}) och ger det mesta till byn (${nyEgen.toFixed(1)} av 10 eget)`, ny.andel > 0.75 && Math.abs(nyEgen - 10 * (1 - ny.andel)) < 1], // i hela saker (steg 2.10.7)
      [`halvvägs till gränsen ${DELNING.rik} ges hälften (andel ${halv.andel.toFixed(2)}, ${halvEgen.toFixed(1)} av 10 eget)`, Math.abs(halv.andel - 0.5) < 0.02 && Math.abs(halvEgen - 5) < 0.3],
      [`en rik by (rikedom ${rikRik.toFixed(0)}) ger inget (${rikEgen.toFixed(1)} av 10 eget)`, rik.andel === 0 && Math.abs(rikEgen - 10) < 0.01],
      [`blir byn fattig igen ger folk igen (andel ${igen.andel.toFixed(2)})`, igen.andel > 0.8],
      [`i en rik by samlar den fattiga familjen mat åt sig (${fattigSamlar} av 40, äger för ${fDygn.toFixed(1)} dygn) men inte den rika (${rikSamlar} av 40, äger för ${rDygn.toFixed(1)} dygn)`, fattigSamlar >= 5 && rikSamlar === 0],
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
    // krönikan (steg 9.2.127): det värdefullaste och resten som ett värde; loggen hela listan
    const kr = (s.hist?.kronika ?? []).filter(r => r[2] === 'arv').map(r => r[1]).find(x => x.startsWith(`${a.name} ärvde`)) ?? '', helaRaden = s.log.find(l => l.text.startsWith(`${a.name} ärvde`))?.text ?? '';
    const kort = / och saker värda \d+ silver efter /.test(kr) && (helaRaden.match(/,/g) ?? []).length >= 1 && !kr.includes(',');
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
      [`krönikan nämner det värdefullaste och resten som ett värde ("${kr}"), loggen hela listan ("${helaRaden}")`, kort],
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
  text: 'Steg 2.3.1: var och en har platser för utrustning (två händer, kroppen i två lager, huvud, ben och fötter). Varje sak väger något, och hur många händer den tar räknas fram ur vikten och styrkan. Bördan bärs i de fria händerna: den som håller yxan bär mindre, och korgen tar en hand men rymmer så mycket att en vuxen med korg bär minst lika mycket som utan redskap',
  kor: () => {
    const s = createState(4, START);
    setItems(s, { grenar: 20, flinta: 2, sten: 30 });
    const p = living(s).sort((a, b) => capacity(s, b) - capacity(s, a))[0]!; // den starkaste
    // vikten: varje redskap har en egen, och en stack av vad som helst är en full famn
    const redskap = SAK_LIST.filter(k => SAKER[k]?.redskap);
    const vikt = redskap.every(k => SAKER[k]!.vikt! > 0) && STACK_ORDER.every(k => SAKER[k]?.redskap || SAKER[k]?.vikt !== undefined || Math.abs(stackOf(k) * viktOf(k) - VIKT_STACK) < 1e-9); // en stack väger VIKT_STACK, om inte vikten står i registret (steg 6.1.8)
    const kniv1 = handerFor(s, p, 'kniv') === 1, vilt2 = handerFor(s, p, 'varg') === (viktOf('varg') <= handOrkar(s, p) ? 1 : 2);
    // händerna och bördan
    const fri = bordPlats(s, p);
    const yxa = addTool(s, 'yxa', p); take(s, p, 'yxa');
    const medYxa = bordPlats(s, p);
    const u = utrustning(s, p, true);
    const platser = u.hoger.ting === yxa && u.vanster.borda === true && !u.inre.ting && (['hoger', 'vanster', 'inre', 'yttre', 'huvud', 'ben', 'fotter'] as const).every(k => PLATS_LIST.includes(k));
    const korg = addTool(s, 'korg', p); take(s, p, 'korg');
    const medKorg = bordPlats(s, p);
    // att plocka upp grenar med och utan yxan i handen (stenarna i stacken ryms i en hand sedan steg 6.1.8)
    const g = (s.stackar ?? []).find(x => x.k === 'grenar')!;
    const plocka = (hall?: string) => {
      const c = cloneState(s), q = c.people.find(x => x.id === p.id)!;
      for (const t of tingOf(c)) if (t.hos === q.id) t.hos = undefined;
      if (hall) take(c, q, hall);
      const t: Task = { act: 'bara', phase: 'go', tx: g.x + 0.5, ty: g.y + 0.5, until: c.now + HOUR, carry: 0, why: 'test', dark: false };
      pickUp(c, q, t, ryms(c, q));
      return t.items?.grenar ?? 0;
    };
    const utan = plocka(), med = plocka('yxa');
    // ett redskap i en börda väger det det väger, inte en hel famn som förut
    const lass: Task = { act: 'bara', phase: 'back', tx: 0, ty: 0, until: s.now, carry: 0, ting: [korg.id] };
    const korgVikt = Math.abs(load(lass, s) - viktOf('korg')) < 1e-9;
    // varje hand visar sitt eget (steg 6.1.2): två slag i var sin hand, lite av ett slag i en hand, mycket i båda, och med
    // yxan i en hand allt i den andra
    const tom = cloneState(s), q = tom.people.find(x => x.id === p.id)!;
    for (const t of tingOf(tom)) if (t.hos === q.id) t.hos = undefined;
    const ut = utrustning(tom, q, true), ih = (items: Record<string, number>) => bordaIHander(tom, q, { act: 'bara', phase: 'back', tx: 0, ty: 0, until: tom.now, carry: 0, items }, ut);
    const tva = ih({ sten: 2, flinta: 1 }), lite = ih({ flinta: 1 }), mycket = ih({ grenar: Math.floor(capacity(tom, q) / viktOf('grenar')) });
    const iYxa = (() => { take(tom, q, 'yxa'); return bordaIHander(tom, q, { act: 'bara', phase: 'back', tx: 0, ty: 0, until: tom.now, carry: 0, items: { sten: 2, flinta: 1 } }, utrustning(tom, q, true)); })();
    const hander = tva.hoger?.k === 'sten' && tva.vanster?.k === 'flinta' && lite.hoger?.k === 'flinta' && !lite.vanster
      && mycket.hoger?.k === 'grenar' && mycket.vanster?.k === 'grenar' && !iYxa.hoger && iYxa.vanster?.k === 'sten';
    return [
      ['varje redskap har en vikt, och en stack av något annat väger lika mycket (steg 6.1.8)', vikt],
      ['kniven tar en hand, och en fälld varg tar båda händerna om den väger mer än en hand orkar', kniv1 && vilt2],
      [`med yxan i handen ryms mindre i händerna (${medYxa.toFixed(1)} mot ${fri.toFixed(1)} vikt)`, medYxa < fri - 1e-6],
      [`med korgen bär man minst lika mycket som med fria händer (${medKorg.toFixed(1)} vikt)`, medKorg >= fri - 1e-6],
      ['yxan sitter i höger hand och bördan i den vänstra; kroppens platser är tomma', platser],
      [`den som håller yxan plockar upp färre grenar (${med.toFixed(1)} mot ${utan.toFixed(1)})`, med > 0 && med < utan - 1e-6],
      ['en korg i bördan väger som en korg', korgVikt],
      ['varje hand visar sitt eget: två slag i var sin hand, lite i en hand, mycket i båda, och bredvid yxan i den andra (steg 6.1.2)', hander],
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
    // värmen: kylan tar mindre av den som har kläder på sig, och kläderna väger (på kroppen, inte i händerna, steg 6.1.8)
    const kyla = (q: Person) => SIM.varmeDelar(s, q, 1, new Map()).kyla;
    let varmare = false, tyngre = false;
    if (p) {
      const med = kyla(p), vikt0 = SIM.paSigVikt(s, p), mina = SIM.paSig(s, p);
      for (const t of mina) t.bar = undefined;
      varmare = kyla(p) > med + 1e-9; tyngre = vikt0 > SIM.paSigVikt(s, p) + 1e-9;
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
      ['kläderna väger: den som har dem på sig bär mer på kroppen', tyngre],
      ['ett utslitet plagg försvinner och räknas', slitet],
      ['den dödes plagg tar någon annan på sig', arv],
    ];
  },
};

SCENARIER.axelrem = {
  text: 'Steg 7.1.2: axelremmen sys av ett skinn och ett rep vid slöjdbänken av den som kan tekniken, och den som saknar en tar på sig en. När man bär hem hänger spjutet, metspöt eller vattensäcken på axeln och tar inga händer, så den som kommer hem med spjutet bär lika mycket som med tomma händer. Yxan och kniven hänger inte på axeln utan i bältet, och den som har både bälte och axelrem bär spjutet på axeln, yxan i bältet och bördan i båda händerna',
  kor: () => {
    const s = createState(2, START); tandEld(s);
    medBank(s, 'flatarbank');
    for (const r of s.people) r.tek = { ...r.tek, kniv: 1, flatarbank: 1, rep: 1, bensyl: 1, skinnklader: 1, axelrem: 1 };
    setMat(s, { bar: 300 }); setAmount(s, 'ved', 60); setAmount(s, 'skinn', 30); setAmount(s, 'rep', 12);
    (s.stat ??= {}).fiskeForsok = 1; // byn fiskar, så den vill ha spjut och axelremmar
    const tek = SIM.TEKNIK.find(t => t.id === 'axelrem');
    const regTek = !!tek && tek.krav.includes('skinnklader') && tek.krav.includes('balte') && !!tek.forsok;
    const rem = () => tingOf(s).find(t => t.k.startsWith('axelrem_') && t.bar !== undefined);
    let h = 0;
    while (!rem() && h < 120) { kor(s, 1); h++; }
    const r = rem(), p = r && byId(s, r.bar!);
    const sytt = Object.keys(s.stat ?? {}).some(k => k.startsWith('axelrem_') && (s.stat![k] ?? 0) > 0);
    const recept = !!SAKER.axelrem_kaninskinn && SAKER.axelrem_kaninskinn.skaffa?.av?.skinn === 1 && SAKER.axelrem_kaninskinn.skaffa?.av?.rep === 1;
    let lika = false, paAxeln = false, mindreUtan = false, metspo = false, vattensack = false, yxaEj = false, bada = false;
    if (p) {
      for (const t of tingOf(s)) { if (t.hos === p.id) t.hos = undefined; if (t.bar === p.id && SAKER[t.k]?.klad?.krok) t.bar = undefined; }
      const fri = bordPlats(s, p);
      const spjut = addTool(s, 'flintspjut', p); take(s, p, 'flintspjut');
      lika = Math.abs(bordPlats(s, p) - fri) < 1e-9;
      const u = utrustning(s, p, true);
      paAxeln = u.axel.ting === spjut && u.axelrem.ting === r && u.hoger.borda === true && u.vanster.borda === true && !u.hoger.ting;
      r.bar = undefined; mindreUtan = bordPlats(s, p) < fri - 1e-6; r.bar = p.id;
      const ms = addTool(s, 'metspo', p); take(s, p, 'metspo');
      metspo = utrustning(s, p, true).axel.ting === ms && Math.abs(bordPlats(s, p) - fri) < 1e-9;
      const vs = addTool(s, 'vattensack', p); take(s, p, 'vattensack');
      vattensack = utrustning(s, p, true).axel.ting === vs;
      // yxan hänger inte på axeln: utan bälte bär man mindre med den
      const yxa = addTool(s, 'yxa', p); take(s, p, 'yxa');
      yxaEj = !utrustning(s, p, true).axel.ting && bordPlats(s, p) < fri - 1e-6;
      // med både bälte och axelrem: spjutet på axeln och yxan i bältet
      const b = addTool(s, 'balte_rep', p); b.bar = p.id;
      take(s, p, 'flintspjut');
      const ub = utrustning(s, p, true);
      bada = ub.axel.ting === spjut && ub.krok.ting === yxa && ub.hoger.borda === true && ub.vanster.borda === true && Math.abs(bordPlats(s, p) - fri) < 1e-9;
    }
    return [
      ['tekniken kräver skinnkläderna och bältet och prövas vid slöjdbänken', regTek],
      ['axelremmen görs av ett skinn och ett rep', recept],
      [`en axelrem sys och tas på (efter ${h} timmar)`, !!r && sytt],
      ['med spjutet på axeln bär man lika mycket som med tomma händer', lika],
      ['spjutet hänger på axeln och bördan är i båda händerna', paAxeln],
      ['utan axelremmen bär man mindre med spjutet i handen', mindreUtan],
      ['metspöt hänger också på axeln', metspo],
      ['vattensäcken hänger också på axeln', vattensack],
      ['yxan hänger inte på axeln', yxaEj],
      ['med bälte och axelrem: spjutet på axeln, yxan i bältet och bördan i båda händerna', bada],
    ];
  },
};

SCENARIER.ryggsack = {
  lang: true,
  text: 'Steg 7.1.3: ryggsäcken sys av tre skinn och ett rep vid slöjdbänken med bensylen av den som kan tekniken, och den som saknar en tar på sig en. Den sitter på ryggen, lämnar båda händerna fria och rymmer 20 i vikt, lika för alla, så en vuxen bär ungefär dubbelt så mycket. Den som samlar med ryggsäcken tar ingen korg utan plockar rakt ner i den, och säcken slits av det som samlas. Den går att ha på sig tillsammans med axelremmen',
  kor: () => {
    const s = createState(2, START); tandEld(s);
    const st = medBank(s, 'flatarbank');
    SIM.newTing(s, 'bensyl', 1, BYN).vid = st.id; // bensylen ligger vid bänken
    for (const r of s.people) r.tek = { ...r.tek, kniv: 1, flatarbank: 1, rep: 1, bensyl: 1, korg: 1, skinnklader: 1, ryggsack: 1 };
    for (const r of s.people) for (const k of ['rock_kaninskinn', 'skor_kaninskinn']) addTool(s, k, r).bar = r.id; // de andra plaggen har alla redan
    setMat(s, { bar: 300 }); setAmount(s, 'ved', 60); setAmount(s, 'skinn', 30); setAmount(s, 'rep', 12); setAmount(s, 'ben', 3); setAmount(s, 'sten', 6);
    const tek = SIM.TEKNIK.find(t => t.id === 'ryggsack');
    const regTek = !!tek && tek.krav.includes('korg') && tek.krav.includes('skinnklader') && !!tek.forsok;
    const sack = () => tingOf(s).find(t => t.k.startsWith('ryggsack_') && t.bar !== undefined);
    let h = 0;
    while (!sack() && h < 120) { kor(s, 1); h++; }
    const r = sack(), p = r && byId(s, r.bar!);
    const sytt = Object.keys(s.stat ?? {}).some(k => k.startsWith('ryggsack_') && (s.stat![k] ?? 0) > 0);
    const recept = !!SAKER.ryggsack_kaninskinn && SAKER.ryggsack_kaninskinn.skaffa?.av?.skinn === 3 && SAKER.ryggsack_kaninskinn.skaffa?.av?.rep === 1 && SIM.STATIONER.flatarbank.kraver?.ryggsack === 'bensyl';
    let dubbelt = false, lika = false, ryms20 = false, paRyggen = false, medRem = false, ingenKorg = false, slits = false, samlade = 0;
    if (p) {
      for (const t of tingOf(s)) { if (t.hos === p.id) t.hos = undefined; if (t.bar === p.id && t !== r) t.bar = undefined; }
      const med = bordPlats(s, p); r.bar = undefined; const utan = bordPlats(s, p); r.bar = p.id;
      dubbelt = Math.abs(med - utan - 20) < 1e-9 && med / utan > 1.7 && med / utan < 2.6;
      // lika för alla: säcken på någon annan rymmer också 20
      const q = living(s).find(x => x !== p);
      if (q) { for (const t of tingOf(s)) if (t.bar === q.id || t.hos === q.id) { t.bar = undefined; t.hos = undefined; } const u0 = bordPlats(s, q); r.bar = q.id; lika = Math.abs(bordPlats(s, q) - u0 - 20) < 1e-9; r.bar = p.id; }
      // bördan: en full säck och fulla händer ryms, mer gör det inte; bär ligger i säcken först
      const ok = ryms(s, p), H = handOrkar(s, p);
      ryms20 = ok({ bar: 20 + 2 * H - 0.5 }) && !ok({ bar: 20 + 2 * H + 3 }) && ok({ bar: 20, ved: H });
      const u = utrustning(s, p, true);
      paRyggen = u.rygg.ting === r && u.rygg.borda === true && u.hoger.borda === true && u.vanster.borda === true;
      // med axelremmen och spjutet på axeln
      const rem = addTool(s, 'axelrem_kaninskinn', p); rem.bar = p.id;
      addTool(s, 'flintspjut', p); take(s, p, 'flintspjut');
      medRem = Math.abs(bordPlats(s, p) - med) < 1e-9 && utrustning(s, p, true).rygg.ting === r && !!utrustning(s, p, true).axel.ting;
      for (const t of tingOf(s)) if (t.hos === p.id) t.hos = undefined;
      // samlandet: det finns korgar i förrådet, men den med ryggsäcken tar ingen
      SIM.newTing(s, 'korg', 1, BYN); SIM.newTing(s, 'korg', 1, BYN);
      const c0 = r.c; let korg = false;
      setMat(s, { bar: 0 }); // maten är slut, så byn samlar
      for (let i = 0; i < 480 && samlade < 3; i++) {
        setMat(s, { bar: 0 }); // maten är fortfarande slut
        kor(s, 1);
        for (const q of living(s)) {
          if (!SIM.ryggsack(s, q)) continue;
          if (q.task?.act === 'samla') samlade++;
          if (q.task?.tool === 'korg') korg = true;
        }
      }
      ingenKorg = samlade > 0 && !korg;
      slits = r.c < c0 - 1e-9 || !tingOf(s).includes(r);
    }
    return [
      ['tekniken kräver korgen och skinnkläderna och prövas vid slöjdbänken', regTek],
      ['ryggsäcken görs av tre skinn och ett rep, med bensylen', recept],
      [`en ryggsäck sys och tas på (efter ${h} timmar)`, !!r && sytt],
      ['med ryggsäcken bär en vuxen 20 mer, ungefär dubbelt så mycket', dubbelt],
      ['säcken rymmer 20 för alla', lika],
      ['en full säck och fulla händer ryms, mer gör det inte', ryms20],
      ['säcken sitter på ryggen och bördan är i säcken och båda händerna', paRyggen],
      ['ryggsäcken och axelremmen går att ha samtidigt', medRem],
      [`den som samlar med ryggsäcken tar ingen korg (samlade ${samlade} timmar)`, ingenKorg],
      ['ryggsäcken slits av det som samlas', slits],
    ];
  },
};

SCENARIER.balte = {
  text: 'Steg 2.3.3: bältet flätas av rep vid elden av den som kan tekniken, och den som saknar ett tar på sig ett. När man bär hem hänger redskapet i bältet: det tar inga händer, så den som har yxan i bältet bär lika mycket som med tomma händer. En korg hänger inte i bältet. Steg 7.1.1: bältet har två krokar, så ett eget redskap (kniven, yxan, spaden) hänger där medan man arbetar med ett annat och tas fram när det behövs. Spjutet hänger på axeln, inte i bältet',
  kor: () => {
    const s = createState(2, START); tandEld(s);
    for (const r of s.people) r.tek = { ...r.tek, rep: 1, balte: 1 };
    setMat(s, { bar: 300 }); setAmount(s, 'ved', 60); setAmount(s, 'rep', 12);
    const balte = () => tingOf(s).find(t => t.k === 'balte_rep' && t.bar !== undefined);
    let h = 0;
    while (!balte() && h < 120) { kor(s, 1); h++; }
    const b = balte(), p = b && byId(s, b.bar!);
    const flatat = (s.stat?.balte_rep ?? 0) > 0;
    let lika = false, mindreUtan = false, iKroken = false, korgEj = false, knivYxa = false, tillbaka = false, baraBada = false, kvar = false, spjutEj = false, spjutHangerEj = false, byns = false, utan = false, hela = true;
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
      // två krokar (steg 7.1.1): den som tar kniven hänger sin yxa i bältet, och tar fram den igen när hen behöver den
      korg.hos = undefined; take(s, p, 'yxa');
      const kniv = addTool(s, 'kniv', p); take(s, p, 'kniv');
      knivYxa = kniv.hos === p.id && yxa.krok === p.id && yxa.hos === undefined && utrustning(s, p, false).krok.ting === yxa;
      take(s, p, 'yxa');
      tillbaka = yxa.hos === p.id && yxa.krok === undefined && kniv.krok === p.id;
      const ub = utrustning(s, p, true);
      baraBada = ub.krok.ting === yxa && ub.krok2.ting === kniv && ub.hoger.borda === true && ub.vanster.borda === true;
      tidyTools(s); placeTools(s);
      kvar = kniv.krok === p.id && kniv.x === undefined;
      // spjutet hänger på axeln, inte i bältet: med spjutet i handen bär man mindre
      const spjut = addTool(s, 'flintspjut', p); take(s, p, 'flintspjut');
      spjutEj = SAKER.flintspjut?.hanger === 'axel' && !utrustning(s, p, true).krok.ting?.k.includes('spjut') && bordPlats(s, p) < fri - 1e-6;
      // spjutet hänger inte heller på kroken; yxan tar den lediga kroken och kniven (som redan hängde där) får stanna
      take(s, p, 'yxa');
      spjutHangerEj = spjut.krok === undefined && spjut.hos === undefined;
      // byns kniv hänger inte i bältet: den läggs tillbaka när man tar ett annat redskap
      kniv.agare = BYN; tidyTools(s);
      byns = kniv.krok === undefined;
      // utan bälte: ingen krok
      take(s, p, 'kniv'); b.bar = undefined; kniv.agare = p.id; take(s, p, 'yxa');
      utan = kniv.krok === undefined; b.bar = p.id;
      // några timmar i byn: det som hänger i ett bälte ligger aldrig samtidigt i förrådet, hänger hos sin ägare och är ett bältesredskap
      for (let i = 0; i < 48 && hela; i++) {
        kor(s, 1);
        for (const x of tingOf(s)) if (x.krok !== undefined && (x.x !== undefined || x.hos !== undefined || x.agare !== x.krok || SAKER[x.k]?.hanger !== 'balte')) hela = false;
      }
    }
    return [
      [`ett bälte flätas och tas på (efter ${h} timmar)`, !!b && flatat],
      ['med yxan i bältet bär man lika mycket som med tomma händer', lika],
      ['utan bältet bär man mindre med yxan i handen', mindreUtan],
      ['yxan hänger i bältet och bördan är i båda händerna', iKroken],
      ['korgen hänger inte i bältet', korgEj],
      ['steg 7.1.1: den som tar kniven hänger sin yxa på den andra kroken', knivYxa],
      ['... och tar fram yxan igen, och kniven hängs i bältet', tillbaka],
      ['... och bär med båda i bältet och bördan i båda händerna', baraBada],
      ['... och kniven läggs inte i förrådet medan den hänger i bältet', kvar],
      ['spjutet hänger på axeln, inte i bältet: med spjutet i handen bär man mindre', spjutEj],
      ['... och hängs inte på kroken när man tar yxan', spjutHangerEj],
      ['byns kniv hänger inte i bältet', byns],
      ['utan bälte hänger inget på kroken', utan],
      ['i två dygn hänger det i bältena bara egna bältesredskap, som inte ligger i förrådet', hela],
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
    (strid.stridRapporter ??= []).push({ t: strid.now - HOUR, orsak: 'test', vinnare: 0, n: 2 });
    const hot = val(strid) === 'rock_vargskinn';
    setAmount(behovs, 'skinn', 3); setAmount(behovs, 'vargskinn', 60); // tre kaninskinn: en rock, men skorna och rockarna som alla saknar behöver dem, och vargskinnet räcker till allt
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
    // krönikans rader av ett slag ('byte', 'gava') och loggens rader ur en mall (steg 6.7.7: texten varierar)
    const kron = (s: State, slag: string) => (s.hist?.kronika ?? []).filter(k => k[2] === slag).length;
    const logg = (s: State, mall: string) => s.log.filter(l => l.m === mall).length;
    // ett redskap mot mat: ett stort byte på en filt, i loggen och i krönikan
    let { s, a, b } = ny();
    a.habit = { samla: 10 }; addTool(s, 'korg', b); addTool(s, 'korg', b); gain(s, a, 'bar', 20);
    const korg = askForTool(s, a, b) === 'byte';
    const fb = s.filtar?.find(f => f.vem === b.id), fa = s.filtar?.find(f => f.vem === a.id);
    const filt = s.filtar?.length === 2 && !!fa && !!fb && fa.par === fb.par && fb.varor.some(v => v.k === 'korg' && v.fran === b.id) && fa.varor.length > 0 && fa.varor.every(v => v.fran === a.id);
    const stort = korg && logg(s, 'l_byte') === 1 && kron(s, 'byte') === 1 && (s.stat?.storaByten ?? 0) === 1;
    // filten plockas ihop efter en stund
    s.now += 2 * HOUR; SIM.stadaByten(s);
    const ihop = !s.filtar?.length;
    // ett litet byte (mat mot trä): en överlämning, i loggen men inte i krönikan
    ({ s, a, b } = ny());
    a.hunger = 0.3; addTo(s, 'bar', 5); gain(s, b, 'bar', 6); gain(s, a, 'ved', 6);
    needLadder(s, a, 1);
    const litet = (s.stat?.byten ?? 0) === 1 && logg(s, 'l_byte') === 1 && kron(s, 'byte') === 0 && !s.filtar?.length
      && (s.overl ?? []).some(o => o.a === b.id && o.b === a.id && o.k === 'bar') && (s.overl ?? []).some(o => o.a === a.id && o.b === b.id && o.k === 'ved');
    // en förälder ger ett redskap till sitt barn: i krönikan
    ({ s, a, b } = ny());
    addTool(s, 'fiskespjut', a); addTool(s, 'fiskespjut', a); b.habit = { fiske: 10 }; b.mother = a.id; b.born = s.now - (SIM.ALDER.vuxen - 4) * SIM.DAY; // b är ett barn
    let gav = false; for (let i = 0; i < 30 && !gav; i++) gav = askForTool(s, a, b) === 'gåva';
    const barnGava = gav && kron(s, 'gava') === 1;
    // mat till den som håller på att dö: i krönikan
    ({ s, a, b } = ny());
    a.hunger = 0; a.health = 0.5; gain(s, b, 'bar', 6); getRel(s, b, a).op = 80; getRel(s, a, b).op = 80; b.pot.empati = 20;
    let dor = 0; for (let i = 0; i < 20 && !dor; i++) { askForGift(s, a, b); dor = (s.hist?.kronika ?? []).filter(k => k[2] === 'gava' && k[1].includes('höll på att dö')).length; }
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

SCENARIER.handelsvaror = {
  text: 'Varor till handlaren (steg 6.2.11): byn minns vad handlarna köpt av den, och på nivån Förbättra gör man det när inget annat finns att göra, högst så många som handlaren köpte och orkar bära',
  kor: () => {
    // handlaren köper två rep av en bybo; när hen gått hem minns byn det
    const s = createState(6, START); rikBy(s); s.nastaHandlare = s.now;
    for (let i = 0; i < 60 && !s.handlare; i++) step(s, BEAT);
    const h = s.handlare, p = living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    if (h) { SIM.put(s, 'rep', 2, { [p.id]: 2 }); SIM.byteKlart(s, SIM.handlarPart(s, h), SIM.personPart(s, p, true), [{ k: 'rep', n: 2 }], [{ k: 'silver', n: 4 }]); }
    const kopt = h?.kopt?.rep ?? 0;
    for (let i = 0; i < 48 * 3600 / BEAT && s.handlare; i++) step(s, BEAT);
    const minns = s.handlarKopt?.rep ?? 0;
    // en by som vet att handlarna brukar köpa rep och yxor
    const t = createState(4, START), q = living(t).find(x => SIM.ageOf(x, t.now) >= SIM.ALDER.vuxen)!;
    q.tek = { ...q.tek, rep: 1, yxa: 1 }; setItems(t, { flinta: 6, torrgras: 30, grenar: 30, rep: 0 });
    const val = () => { const v: SIM.Val = { act: 'vila', why: '', dur: 0 }; return SIM.handlarVara(t, q, v) ? v : undefined; };
    const utan = val();
    t.handlarKopt = { rep: 3, yxa: 9 };
    const yxMal = SIM.handlarMal(t, 'yxa'), yxBar = Math.floor(SIM.HANDLAR_UTR.ryggsack.vikt * (1 - SIM.HANDEL.fylla) / viktOf('yxa'));
    const rep = val();
    SIM.twineRope(t, q, 20, SIM.villHaAv(t, 'rep') + SIM.handlarMal(t, 'rep'));
    const repN = amountOf(t, 'rep'), yxa = val();
    return [
      [`handlaren minns vad hen köpt på besöket (${kopt} rep), och byn minns det när hen gått hem (${minns} rep)`, kopt === 2 && minns >= 2],
      [`utan något handlarna köpt görs inga varor till dem (${utan?.act ?? 'inget'})`, !utan],
      [`yxorna görs högst så många som ryggsäcken rymmer (${yxMal} av 9, plats för ${yxBar})`, yxMal === Math.min(9, yxBar) && yxMal < 9],
      [`den som kan tvinna rep gör det åt handlaren (${rep?.act}, ${rep?.why})`, rep?.act === 'tvinna' && !!rep.handel],
      [`repet tvinnas inte över det byn vill ha plus det handlaren köper (${repN.toFixed(0)} av ${SIM.villHaAv(t, 'rep')} + 3)`, Math.round(repN) === SIM.villHaAv(t, 'rep') + 3],
      [`när repen räcker gör man en yxa att byta med (${yxa?.act}, ${yxa?.tool})`, yxa?.act === 'yxa' && yxa.tool === 'yxa' && !!yxa.handel],
    ];
  },
};
SCENARIER.handlare = {
  text: 'Handlare som kommer när byns rikedom passerat en gräns (steg 4.4.1.2, handel.ts): en fattig by får ingen handlare; när rikedomen passerat HANDEL.rik bestäms när den första kommer. Handlaren kommer gående från kartans kant, väntar på kvällen (steg 4.5.4.11), breder ut en filt med sina varor nära elden på kvällen och går hem på morgonen, och nästa besök bestäms. Byborna handlar på kvällen. Varorna ryms i ryggsäcken, den första handlaren står i krönikan, och under istiden kommer ingen.',
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
    for (let i = 0; i < 30 && s.handlare?.fas !== 'handlar' && s.handlare?.fas !== 'vantar'; i++) step(s, BEAT);
    // kvällsmarknaden (steg 4.5.4.11): på dagen väntar hen vid filtens plats till kvällen och går på morgonen
    const v0 = s.handlare, med = v0 && { varor: structuredClone(v0.varor), silver: v0.silver }, dagNu = SIM.hourOf(s.now), vantar = !!v0 && v0.fas === 'vantar' && !(s.filtar ?? []).some(f => f.handlare === v0.id) && SIM.hourOf(v0.kvall!) === SIM.HANDEL.kvall && SIM.handlarFas(v0) === 'Väntar på kvällen';
    for (let i = 0; i < 30 && s.handlare?.fas !== 'handlar'; i++) { step(s, BEAT); utanVantan(s); }
    const h = s.handlare, hNamn = h ? SIM.hp(s, h).name : '', morgon = !!h && Math.abs(SIM.hourOf(h.gar) - SIM.HANDEL.morgon) < 0.05;
    const kom = !!h && !!med && h.id < 0 && med.varor.length > 0 && SIM.kgOf(med.varor) <= SIM.rymmer(h) && med.silver >= SIM.HANDEL.silver[0] // det hen kom med (byn kan redan ha handlat)
      && (h.ut.x < 1 || h.ut.y < 1 || h.ut.x > SIM.W - 1 || h.ut.y > SIM.H - 1);
    const filt = !!h && h.fas === 'handlar' && SIM.utanforByn(s, SIM.hp(s, h).x, SIM.hp(s, h).y) <= SIM.HANDEL.avstand + SIM.HANDEL.letaLangre + 1
      && (s.filtar ?? []).some(f => f.handlare === h.id && f.varor.length === 0); // varorna ligger i packningen (steg 4.5.7.4)
    const kron = (s.hist?.kronika ?? []).filter(k => k[1].includes('första handlaren')).length === 1;
    // på kvällen väljer den som handlar för byn att gå till filten (night i val.ts)
    const kv = SIM.cloneState(s); if (kv.handlare && med) Object.assign(kv.handlare, structuredClone(med), { handlat: [] }); // med det hen kom med
    kv.now = new Date(kv.now).setHours(20, 0, 0, 0); kv.lastGuardDay = SIM.yearNo(kv, kv.now - 7 * HOUR);
    for (const q of living(kv)) Object.assign(q, { hunger: 1, rest: 1, warm: 1, toa: 1, torst: 1, health: 1, sickUntil: undefined, guardDay: undefined, task: undefined });
    const kvVal = living(kv).filter(q => SIM.ageOf(q, kv.now) >= SIM.ALDER.vuxen).map(q => { SIM.chooseTask(kv, q); return q.task?.act; });
    // hen går hem efter några timmar, filten plockas ihop och nästa besök bestäms
    timmar(s, (h ? (h.gar - s.now) / HOUR : 0) + 1);
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
      [`handlaren kommer från kanten med varor som ryms i ryggsäcken (${h && med ? `${hNamn}, ${SIM.kgOf(med.varor).toFixed(1)} kg av ${SIM.rymmer(h)}` : 'ingen'})`, kom],
      [`handlaren som kommer klockan ${dagNu.toFixed(1)} väntar vid filtens plats till kvällen (${v0?.kvall ? SIM.hourOf(v0.kvall).toFixed(1) : '–'})`, vantar],
      ['handlaren breder ut en filt strax utanför byns område, med varorna kvar i packningen, och går på morgonen', filt && morgon],
      ['den första handlaren står i krönikan', kron],
      [`på kvällen går en vuxen till filten för att handla för byn (${kvVal.join(', ')})`, kvVal.includes('handla')],
      ['handlaren går hem efter några timmar och nästa besök bestäms', gick],
      ['under istiden kommer ingen handlare', istid],
    ];
  },
};

SCENARIER.silver = {
  text: 'Handeln med silver (steg 4.4.1.3, handel.ts): byn handlar med handlaren genom ledaren eller den äldsta vuxna, som går till filten. Byn säljer det den har gott om och köper det den saknar, i samma byte som alla andra (bytaMed), och silvret jämnar ut skillnaden. Handlaren går aldrig med på ett byte till sin nackdel och köper aldrig mer än hen kan bära: är ryggsäcken full blir det vara mot vara eller silver.',
  kor: () => {
    const fram = (s: State) => { rikBy(s); s.nastaHandlare = s.now; for (let i = 0; i < 40 && s.handlare?.fas !== 'handlar'; i++) { step(s, BEAT); utanVantan(s); } return s.handlare!; };
    const varde = (h: SIM.Handlare) => h.varor.reduce((a, w) => a + w.n * grundvarde(w.k), 0) + h.silver * grundvarde('silver');
    const vuxen = (s: State) => living(s).find(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen)!;
    const handla = (s: State, _h: SIM.Handlare) => { helAffar(s, vuxen(s), true); };
    // byn har gott om torkad fisk och saknar rep; handlaren har rep
    let s = createState(6, START);
    const h = fram(s);
    setAmount(s, 'torrfisk', 120); setAmount(s, 'rep', 0); setAmount(s, 'flinta', 0); setAmount(s, 'silver', 0);
    h.varor = [{ k: 'rep', n: 6 }, { k: 'flinta', n: 2 }]; h.silver = 30;
    const fore = varde(h);
    handla(s, h);
    const salde = h.varor.some(w => w.k !== 'rep' && w.k !== 'flinta'); // något av det byn har gott om (fisken, bären eller höet: lättare saker sedan steg 4.5.5.1)
    const kopte = amountOf(s, 'rep') >= 1 || amountOf(s, 'flinta') >= 1; // byn saknar både rep och flinta och köper det den har råd med
    // har handlaren inget byn vill ha, betalar hen med silver
    const s2 = createState(6, START), h2 = fram(s2);
    setAmount(s2, 'torrfisk', 120); setAmount(s2, 'silver', 0);
    h2.varor = []; h2.silver = 30;
    handla(s2, h2);
    const silver = amountOf(s2, 'silver') >= 1 && h2.silver === 30 - Math.round(amountOf(s2, 'silver')) && h2.varor.length > 0; // fisken, bären eller höet
    const vinst = varde(h) >= fore - 1e-9;
    const bara = SIM.kgOf(h.varor) <= SIM.rymmer(h) + 1e-9;
    const filt = (s.filtar ?? []).some(f => f.handlare === h.id && f.varor.length === 0) && (s.filtar ?? []).length === 1;
    // ryggsäcken är full: handlaren köper inget som väger, men byn kan ändå köpa (vara mot vara eller silver)
    const t = createState(6, START), g = fram(t);
    setAmount(t, 'torrfisk', 120); setAmount(t, 'rep', 0);
    g.varor = [{ k: 'rep', n: 4 }, { k: 'sten', n: Math.floor((SIM.rymmer(g) - 4 * viktOf('rep')) / viktOf('sten')) }]; g.silver = 5;
    const kg0 = SIM.kgOf(g.varor);
    handla(t, g);
    const full = SIM.kgOf(g.varor) <= Math.max(kg0, SIM.rymmer(g)) + 1e-9 && !g.varor.some(w => w.k === 'torrfisk');
    // ledaren (eller den äldsta vuxna) går till filten på dagen och handlar
    const u = createState(6, START), k = fram(u);
    setAmount(u, 'torrfisk', 120); // något att betala med, som ovan (byns egna förråd när handlaren kommer beror på vad den hunnit samla)
    let gick = false;
    for (let i = 0; i < 12 * 3600 / BEAT && !k.bynKlar && u.handlare; i++) { step(u, BEAT); if (u.log.some(l => SIM.radByte(u, l)?.an.endsWith('för byn'))) gick = true; } // affären tar bara någon minut (steg 4.5.7.4)
    return [
      [`byn säljer det den har gott om (handlaren har nu ${h.varor.map(w => `${w.n} ${SIM.sakNamn(w.k).toLowerCase()}`).join(', ')})`, salde],
      [`byn köper det den saknar (rep ${Math.round(amountOf(s, 'rep'))}, flinta ${Math.round(amountOf(s, 'flinta'))})`, kopte],
      [`har handlaren inget byn vill ha betalar hen med silver (byns silver ${Math.round(amountOf(s2, 'silver'))}, handlarens ${h2.silver})`, silver],
      [`handlaren förlorar inget på handeln (grundvärde ${fore.toFixed(1)} → ${varde(h).toFixed(1)})`, vinst],
      [`handlaren bär inte mer än ryggsäcken rymmer (${SIM.kgOf(h.varor).toFixed(1)} av ${SIM.rymmer(h)} kg)`, bara],
      ['efter affären är handlarens filt tom igen och byns filt hopplockad', filt],
      [`med full ryggsäck köper handlaren inget som väger (${SIM.kgOf(g.varor).toFixed(1)} kg)`, full],
      ['någon går till filten och handlar för byn', gick && !!k.bynKlar],
    ];
  },
};

SCENARIER.handelsfardighet = {
  text: 'Färdigheten Handel (steg 4.4.1.4, behov.ts): den skickligare i ett byte får en större del av vinsten, den som är mycket skickligare kan lura en ovan, och den lurade märker det ibland och minns det (en sur tanke). Båda övar Handel i varje byte. Byn handlar genom ledaren, och utan ledare genom den som är skickligast i Handel. En nykomling har lite handel från början, av berättandet och hantverket.',
  kor: () => {
    const fram = (s: State) => { rikBy(s); s.nastaHandlare = s.now; for (let i = 0; i < 40 && s.handlare?.fas !== 'handlar'; i++) { step(s, BEAT); utanVantan(s); } return s.handlare!; };
    const vuxna = (s: State) => living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
    const bas = createState(6, START), h0 = fram(bas);
    setAmount(bas, 'torrfisk', 120); setAmount(bas, 'silver', 0); h0.varor = []; h0.silver = 400; SIM.hp(bas, h0).skill.handel = 10;
    if (bas.styre) bas.styre.ledare = undefined;
    // byn säljer fisk för silver med en ovan och en skicklig i Handel
    const salj = (skill: number, i = 0) => {
      const s = cloneState(bas), p = vuxna(s)[0];
      s.stat = { ...s.stat }; const l0 = s.stat.lurat ?? 0;
      s.seed = bas.seed; for (let j = 0; j < i; j++) SIM.rnd(s, 'handel');
      p.skill.handel = skill;
      const fore = p.skill.handel;
      helAffar(s, p, true);
      return { silver: amountOf(s, 'silver'), ovat: p.skill.handel > fore, lurad: p.thoughts?.some(t => t.text.startsWith('Blev lurad')) ?? false, lurat: (s.stat?.lurat ?? 0) > l0 };
    };
    // packningen rymmer mycket här, så att det är silvret som tar slut i bytet och den som lurar har plats för det hen tar extra
    const utr = SIM.HANDLAR_UTR[h0.utr], vikt0 = utr.vikt; utr.vikt = vikt0 * 10;
    let ovan, skicklig, lurat = 0, markt = 0;
    try {
      ovan = salj(0); skicklig = salj(20);
      for (let i = 0; i < 60; i++) { const r = salj(0, i); if (r.lurat) lurat++; if (r.lurad) markt++; }
    } finally { utr.vikt = vikt0; }
    // utan ledare handlar den skickligaste
    const t = cloneState(bas), v = vuxna(t);
    for (const p of t.people) if (p.task?.act === 'handla') p.task = undefined;
    t.handlare!.affar = undefined;
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
    for (let i = 0; i < 40 && s.handlare?.fas !== 'handlar'; i++) { step(s, BEAT); utanVantan(s); }
    const h = s.handlare!, [a, b] = living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
    const fore = SIM.handlaVal(s, a); // byn har inte handlat: den som handlar för byn går först
    h.bynKlar = true; delete h.affar;
    for (const p of living(s)) if (p.task?.act === 'handla') p.task = undefined;
    // torkat kött som båda har nytta av, och något över att betala med
    const k = 'torrkott';
    h.varor = [{ k, n: 2 }]; h.silver = 20;
    for (const [p, n] of [[a, 6], [b, 2]] as const) { SIM.put(s, 'skinn', n, { [p.id]: n }); SIM.put(s, 'silver', 20, { [p.id]: 20 }); } // b har för lite skinn för att sälja dem (steg 4.5.4.14)
    const uppgift = (p: Person, v: NonNullable<ReturnType<typeof SIM.handlaVal>>) => { p.task = { act: 'handla', phase: 'do', tx: v.spot.x, ty: v.spot.y, until: s.now + v.dur, carry: 0, ref: v.ref, dark: false, why: v.why } as Task; };
    const va = SIM.handlaVal(s, a)!; uppgift(a, va);
    const vb = SIM.handlaVal(s, b)!; uppgift(b, vb);
    const affar = () => s.handlare?.affar;
    const ko = affar()?.vem === a.id && h.ko?.[0] === b.id && va.why.startsWith('Frågar vad') && vb.why.startsWith('Står i kö');
    const bubbla = !!SIM.handlarNu(s, a) && !SIM.handlarNu(s, b);
    SIM.handlaKlar(s, b, b.task!); // b väntade bara: inget händer
    const vantade = !h.handlat?.includes(b.id) && h.varor.length === 1 && affar()?.vem === a.id;
    const gang = helAffar(s, a).steg;
    const kopte = ownsAmount(s, a, k) >= 2 && !h.varor.some(w => w.k === k);
    const minns = (h.bytt ?? []).some(x => x.vem === a.name);
    const vb2 = helAffar(s, b).forsta;
    const fram = !!vb2 && vb2.why.startsWith('Frågar vad');
    const tom = b.thoughts.some(t => t.text.startsWith('Gick tomhänt'));
    return [
      ['innan byn handlat går bara den som handlar för byn (eller ingen annan)', !fore || fore.why.includes('för byn')],
      ['två som vill ha samma sak ställer sig i kö, först till kvarn', ko],
      ['bara den som handlar har pratbubblor med varorna', bubbla],
      ['den som står i kö väntar på sin tur', vantade],
      [`den första köper (${k}) med sina egna saker: ${gang.join(', ')}`, kopte && gang[0].startsWith('Frågar') && gang.some(x => x.startsWith('Förhandlar')) && gang.includes('Hämtar det köpta')],
      ['handlaren minns bytet (inforutan)', minns],
      ['den andra flyttar fram i kön', fram],
      ['det den första köpte är borta: den andra går tomhänt och blir lite sämre till mods', tom],
      ['den som handlat ställer sig inte i kö igen', !SIM.handlaVal(s, a)],
    ];
  },
};

SCENARIER.tillfalle = {
  text: 'Nivån Tillfälle (steg 6.1.14, "Arbetsordningen" i designdokumentet): det som går förlorat om ingen tar det nu. Den som ska följa med på vargjakten går före vanlig trötthet men efter nöden (måste på toa genast). Handeln brådskar mer ju närmare handlaren är att gå: när besöket börjar går ungefär hälften av de trötta och handlar först, när det slutar alla; den som inte är trött handlar ändå',
  kor: () => {
    // vargjakten: en by i istiden med en flock som någon just sett och modiga vuxna med spjut
    const s = createState(1, START); s.kal = SIM.nyKalender(s.now, 0); tandEld(s);
    while (!isLight(s.now)) s.now += HOUR;
    for (const [x, a] of [['m', 30], ['k', 28], ['m', 35], ['k', 24], ['m', 40]] as const) nyInvanare(s, x, a);
    setMat(s, { vilt: 60, bar: 60 });
    const vuxna = living(s).filter(q => SIM.ageOf(q, s.now) >= 18 && SIM.ageOf(q, s.now) < 55);
    for (const q of vuxna) { const t = addTool(s, 'flintspjut', q); t.hos = q.id; q.pot.mod = 18; q.pot.karisma = 14; }
    const c = SIM.bynsMitt(s);
    const f: SIM.Vargflock = { id: s.vargNr = 1, vargar: [10_000_008], x: c.x + 14, y: c.y, mx: c.x + 14, my: c.y, gar: s.now + 48 * HOUR, hunger: 0.5, gor: 'stryker', sedd: s.now, sag: vuxna[0].id };
    (s.vargar ??= []).push(f);
    for (let i = 0; i < 60 && !f.jagare; i++) SIM.jaktBeslut(s, f, living(s));
    const foljer = (f.jagare ?? []).map(id => byId(s, id)!).filter(q => q.id !== f.kallare);
    const kallarGar = byId(s, f.kallare ?? -1)?.task?.act === 'vargjakt', vantar = foljer.length >= 2 && foljer.every(q => !q.task);
    const [n, tr] = foljer;
    if (n) n.toa = 0; // måste på toa genast (Nöd)
    if (tr) tr.rest = 0.05; // trött (Grundbehov)
    if (n) chooseTask(s, n);
    if (tr) chooseTask(s, tr);
    const nod = n?.task?.act === 'toa', fore = tr?.task?.act === 'vargjakt';
    // när tiden att komma iväg är ute är tillfället borta
    const sen = foljer[2] ?? n;
    s.now += (SIM.VARG.kallMin + 1) * SIM.MIN;
    const borta = !!sen && !SIM.vargjaktVal(s, sen);
    // handeln: en rik by där handlaren just kommit (eller snart går) och byn redan handlat; a är trött
    const hs = createState(6, START);
    rikBy(hs); hs.nastaHandlare = hs.now;
    for (let i = 0; i < 40 && hs.handlare?.fas !== 'handlar'; i++) { step(hs, BEAT); utanVantan(hs); }
    const h = hs.handlare!, a = living(hs).filter(p => SIM.ageOf(p, hs.now) >= SIM.ALDER.vuxen)[0];
    h.bynKlar = true; h.varor = [{ k: 'torrkott', n: 4 }];
    SIM.put(hs, 'silver', 40, { [a.id]: 40 });
    const prova = (fran: number, trott: boolean) => {
      let ja = 0;
      for (let i = 0; i < 200; i++) {
        h.kom = hs.now - fran * HOUR; h.gar = h.kom + 10 * HOUR; h.ko = []; delete h.affar; h.handlat = [];
        a.task = undefined; a.rest = trott ? 0.05 : 1; a.toa = 1; a.hunger = 1; a.torst = 1;
        chooseTask(hs, a);
        const act: string | undefined = (a.task as Task | undefined)?.act; if (act === 'handla' || act === 'koa') ja++;
      }
      return ja / 200;
    };
    const borjan = prova(0, true), slut = prova(9.99, true), pigg = prova(0, false);
    return [
      [`den som kallar går genast, de ${foljer.length} som följer med väljer igen (${kallarGar ? 'går' : 'går inte'}, ${vantar ? 'väljer' : 'väljer inte'})`, kallarGar && vantar],
      [`den som måste på toa genast går dit först (${n?.task?.act})`, nod],
      [`den trötta följer med på vargjakten före vilan (${tr?.task?.act})`, fore],
      ['när tiden att komma iväg är ute är tillfället borta', borta],
      [`när handlaren just kommit handlar ${Math.round(borjan * 100)} % av de trötta först (ungefär hälften)`, borjan > 0.35 && borjan < 0.65],
      [`när handlaren snart går handlar ${Math.round(slut * 100)} % av de trötta först`, slut > 0.95],
      [`den som inte är trött handlar (${Math.round(pigg * 100)} %)`, pigg > 0.95],
    ];
  },
};

SCENARIER.radda = {
  text: 'Nivån Rädda (steg 6.1.15, "Arbetsordningen" i designdokumentet): det som ska räddas väljs efter hur snart det blir dåligt i stället för med fasta chanser. Fisk som ruttnar inom ett dygn rensas varje gång den som kan väljer, färsk fisk som håller längre mer sällan, men aldrig mer sällan än golvet (VAL.raddaMin), så att det som inte ruttnar ändå tas om hand',
  kor: () => {
    // en by med slaktbänk och abborrar i förrådet; a är en vuxen utan behov
    const s = createState(1, START); s.kal = SIM.nyKalender(s.now, 1); tandEld(s);
    while (!isLight(s.now)) s.now += HOUR;
    medBank(s); setMat(s, { bar: 200 }); setAmount(s, 'abborre', 10);
    const a = living(s).find(p => SIM.ageOf(p, s.now) >= 18)!;
    const fisk = () => SIM.stacksOf(s).filter(x => x.k === 'abborre');
    const prova = (c: number) => {
      for (const x of fisk()) x.c = c;
      let ja = 0;
      for (let i = 0; i < 200; i++) {
        a.task = undefined; a.rest = 1; a.toa = 1; a.hunger = 1; a.torst = 1;
        chooseTask(s, a);
        if ((a.task as Task | undefined)?.act === 'rensa') ja++;
      }
      return { tim: SIM.timKvar(s, x => x.k === 'abborre'), andel: ja / 200 };
    };
    const farsk = prova(1), snart = prova(0.03);
    // det som inte slits alls (stenen) har ingen tid kvar att räkna: Infinity, och raden faller till golvet
    const sten = SIM.timKvar(s, x => x.k === 'sten');
    return [
      [`fisk som ruttnar om ${Math.round(snart.tim)} timmar rensas ${Math.round(snart.andel * 100)} % av gångerna`, snart.tim < SIM.VAL.raddaTim && snart.andel > 0.9],
      [`färsk fisk (${Math.round(farsk.tim)} timmar kvar) rensas mer sällan (${Math.round(farsk.andel * 100)} %)`, farsk.tim > SIM.VAL.raddaTim && farsk.andel < snart.andel - 0.1 && farsk.andel > 0],
      ['det som inte slits har ingen tid att räkna (Infinity)', sten === Infinity],
    ];
  },
};

SCENARIER.gastsida = {
  text: 'Alla personer har samma sida (steg 4.5.4.12, ui/gaster.ts): handlaren och rövarna är gäster i registret GASTER. De ritas som byborna och väljs som en bybo, och personsidan visar dem med samma flikrad: presentationen med det som är särskilt för sorten (handlarens klan, silver och packning, rövarens flock), egenskaperna och färdigheterna man vet och det hen bär. Fliken Handlaren finns inte längre.',
  kor: () => {
    utanWebblasare();
    const s = createState(6, START);
    rikBy(s); setByn(s);
    SIM.skickaHandlare(s); SIM.skickaRovare(s, 2);
    const g = gaster(s.now), h = g.find(x => x.id === s.handlare?.id), r = g.filter(x => x.sort === 'Rövare');
    ui.selected = h?.id; ui.personDel = 'pres';
    const pres = person.html();
    ui.personDel = 'egen'; const egen = person.html();
    ui.personDel = 'utr'; const utr = person.html();
    ui.selected = r[0]?.id; ui.personDel = 'pres'; const rp = person.html();
    ui.personDel = 'egen'; const re = person.html();
    const knappar = (x: string) => [...x.matchAll(/data-pdel="(\w+)"/g)].map(m => m[1]).join(',');
    const by = living(s)[0]!; ui.selected = by.id; const bybo = person.html();
    s.handlare = undefined; ui.selected = h?.id; const borta = person.html();
    return [
      [`handlaren och ${r.length} rövare är gäster med var sitt negativa id`, !!h && r.length === 2 && g.every(x => x.id < 0) && new Set(g.map(x => x.id)).size === g.length],
      [`handlarens sida har namnet, vad hen gör och flikarna ${knappar(pres)}`, !!h && pres.includes(h.namn) && pres.includes(h.gor)],
      ['samma flikknappar som för en bybo, alla sex flikar (steg 4.5.7.6, 5.3.4.1, 6.9.10)', knappar(pres) === knappar(bybo) && knappar(pres).split(',').length === 6],
      ['presentationen har handlarens klan, silver och packning som rader', /från .+ vid /.test(pres) && pres.includes('Silver') && pres.includes('Packning') && pres.includes('Handlare')],
      ['egenskaperna visar färdigheten Handel (gästen är en person med alla flikar, steg 9.2.114)', egen.includes('Handel')],
      ['presentationen visar varorna i packningen med priset i silver, och utrustningen är hens egen', pres.includes('Varor') && /silver styck/.test(pres) && utr.includes('Utrustning')],
      ['en rövare har flocken som rad och sina egenskaper', rp.includes('Rövare') && rp.includes('Flocken') && re.includes('Styrka') && re.includes('Närstrid')],
      ['när handlaren gått står det att hen lämnat byn', borta.includes('lämnat byn')],
      ['fliken Handlaren finns inte längre', !existsSync('src/ui/flikar/handlare.ts')],
    ];
  },
};
SCENARIER.gastliv = {
  text: 'Gästerna har ett liv (steg 4.5.7.6, 4.5.7.7, gastliv.ts): handlaren och rövarna får alla flikar som en bybo, och ingen flik är tom. När en gäst skapas har hen ett liv bakåt i tiden i sin hemklan: föräldrar, partner, syskon och barn med namn, och händelser ur registret LIVSHANDELSER som passar åldern och stämmer med varandra (inget barn före giftermålet, den döda dör en gång). Livet räknas ur byns frö och gästens namn och klan, inte ur spelets slump: samma gäst får samma liv, och spelet utvecklas likadant. En handlare som kommer igen är samma person och har levt vidare.',
  kor: () => {
    utanWebblasare();
    const s = createState(6, START);
    rikBy(s); setByn(s);
    const fore = SIM.cloneState(s);
    SIM.skickaHandlare(s); SIM.skickaRovare(s, 3);
    const g = gaster(s.now), h = g.find(x => x.id === s.handlare?.id)!, r = g.filter(x => x.sort === 'Rövare');
    const delar = ['pres', 'behov', 'halsa', 'egen', 'tid', 'utr', 'kun', 'rel', 'ryk'];
    const sidor = (x: typeof h) => delar.map(d => { ui.selected = x.id; ui.personDel = d; return person.html(); });
    const hs = sidor(h), rs = sidor(r[0]);
    const tomma = [...hs, ...rs].filter(x => !/<(li|dd|p)[ >]/.test(x)).length;
    // livet stämmer med sig självt, för många gäster
    const liv = Array.from({ length: 300 }, (_, i) => SIM.gastLiv(s.seed + i, i * 7919, 'Test', i % 2 ? 'k' : 'm', i % 3 === 0 ? 'rovare' : 'handlare', 'Klanen', 'sjön', s.now - (18 + i % 40) * SIM.DAY, s.now));
    const stammer = liv.every(l => {
      const gift = l.liv.find(x => x.k === 'gift'), barn = l.liv.filter(x => x.k === 'barn');
      const dog = l.familj.filter(f => f.dog !== undefined), dodsfall = l.liv.filter(x => x.k === 'foralder' || x.k === 'partnerDog' || x.k === 'barnDog');
      return l.liv[0].k === 'fodd' && (!barn.length || (!!gift && barn.every(b => b.ar >= gift.ar))) && dog.length === dodsfall.length
        && l.liv.every((x, i) => i === 0 || x.ar >= l.liv[i - 1].ar) && l.liv.filter(x => x.k === 'gift').length <= 1 && l.liv.every(x => x.ar <= l.alder)
        && new Set([...l.familj.map(f => f.namn), 'Test']).size === l.familj.length + 1;
    });
    const sorter = new Set(liv.flatMap(l => l.liv.map(x => x.k))), allaSorter = Object.keys(SIM.LIVSHANDELSER).every(k => sorter.has(k));
    const familj = liv.filter(l => l.familj.some(f => f.roll === 'barn')).length > 50 && liv.every(l => l.familj.some(f => f.roll === 'mor') && l.familj.some(f => f.roll === 'far'));
    // samma liv varje gång, utan spelets slump
    const igen = gaster(s.now).find(x => x.id === h.id)!;
    const samma = JSON.stringify(igen.liv) === JSON.stringify(h.liv);
    const utanSlump = (() => { const x = SIM.cloneState(fore); SIM.gastLiv(x.seed, 1, 'A', 'm', 'handlare', 'K', 'h', x.now - 30 * SIM.DAY, x.now); return JSON.stringify(x.rngs) === JSON.stringify(fore.rngs) && !!x.rngs; })();
    // handlaren kommer igen: samma person, äldre och med fler år bakom sig
    const kp = SIM.klanById(s, SIM.hp(s, s.handlare!).gast!.klan)!.personer.find(p => p.namn === h.namn)!;
    const fodd = kp.fodd, alder0 = h.liv.alder, n0 = h.liv.liv.length;
    s.handlare = undefined; s.now += 6 * SIM.DAY;
    const kl = SIM.klanerOf(s).find(k => k.personer.includes(kp))!;
    const vidare = SIM.gastLiv(s.seed, SIM.gastNyckel(kl.id, h.namn), h.namn, h.sex, 'handlare', kl.namn, kl.hem, fodd!, s.now);
    const levt = vidare.alder === alder0 + 6 && vidare.liv.length >= n0 && JSON.stringify(vidare.liv.slice(0, n0).map(x => x.text)) === JSON.stringify(h.liv.liv.slice(0, n0).map(x => x.text));
    return [
      [`handlaren och rövaren har alla ${delar.length} flikar, och ingen är tom (${tomma} tomma)`, tomma === 0 && hs.every(x => x.includes(h.namn))],
      [`presentationen beskriver hen: ${h.liv.beskrivning.slice(0, 60)}…`, hs[0].includes(h.liv.beskrivning.split('.')[0]) && hs[0].includes('Föräldrar')],
      ['Tiden visar livet år för år och Relationer familjen i hemklanen', hs[4].includes('Föddes i') && h.liv.familj.every(f => hs[7].includes(f.namn))],
      ['handlaren kan handla; Kunskap säger det', h.liv.kan.includes('handla') && hs[6].includes('Handla och värdera')],
      ['livet stämmer med sig självt i 300 gäster: inget barn före giftermålet, ingen dör två gånger, inga dubbla namn', stammer],
      [`alla ${Object.keys(SIM.LIVSHANDELSER).length} slag i LIVSHANDELSER händer någon gång`, allaSorter],
      ['alla har mor och far, och många har barn', familj],
      ['samma gäst får samma liv varje gång', samma],
      ['livet drar ingen slump ur spelet', utanSlump],
      [`handlaren som kommer igen är samma person och har levt vidare (${alder0} → ${vidare.alder} år)`, fodd !== undefined && levt],
    ];
  },
};
SCENARIER.forhandling = {
  text: 'Handeln som förhandling (steg 4.5.7.4, handel.ts): handlarens varor ligger i packningen och filten är tom. Kunden frågar vad handlaren har (handlaren svarar med varornas symboler), väljer, och handlaren lägger det på sin filt. Kunden hämtar det hen bjuder från sina egna högar och förhandlar en kort stund; första budet är en bra affär för kunden. Handlaren svarar bara ja eller nej; vid nej bjuder kunden mer, och efter tre nej ger hen upp. Vid ja blir det handslag, var och en plockar upp det den fått och kunden bär hem det köpta. En kund i taget, också medan hen hämtar, och byn handlar genom den som handlar för byn. Buden sparas med bytet, och en affär som inte blev av får en egen rad (redogörelsen, steg 5.4.6.1), med en kort berättelse om argumenten och hur det gick (steg 5.4.6.2).',
  kor: () => {
    const s = createState(6, START);
    rikBy(s); s.nastaHandlare = s.now;
    for (let i = 0; i < 40 && s.handlare?.fas !== 'handlar'; i++) { step(s, BEAT); utanVantan(s); }
    const h = s.handlare!, vuxna = living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
    const hf = () => s.filtar?.find(f => f.handlare === h.id);
    const tom = !!hf() && hf()!.varor.length === 0 && h.varor.length > 0;
    // byn handlar först, genom den som handlar för byn
    const forByn = vuxna.find(p => !!SIM.handlaVal(s, p)), andra = vuxna.filter(p => p !== forByn);
    const byn = !!forByn && !!h.affar?.byn && andra.every(p => !SIM.handlaVal(s, p));
    h.bynKlar = true; delete h.affar;
    for (const p of living(s)) if (p.task?.act === 'handla') p.task = undefined;
    // a och b vill ha torkat kött; de betalar med det de har i sina högar
    const [a, b] = andra, k = 'torrkott';
    h.varor = [{ k, n: 2 }, { k: 'rep', n: 3 }]; h.silver = 20;
    for (const p of [a, b]) { SIM.put(s, 'skinn', 6, { [p.id]: 6 }); SIM.put(s, 'silver', 20, { [p.id]: 20 }); }
    const aff = () => s.handlare?.affar;
    const uppgift = (p: Person, v: NonNullable<ReturnType<typeof SIM.handlaVal>>) => { p.x = v.spot.x; p.y = v.spot.y; p.task = { act: 'handla', phase: 'do', tx: v.spot.x, ty: v.spot.y, until: s.now + v.dur, carry: 0, ref: v.ref, dark: false, why: v.why } as Task; return v; };
    const v1 = uppgift(a, SIM.handlaVal(s, a)!);
    const hn = SIM.handlarNu(s, a);
    const fraga = v1.why.startsWith('Frågar vad') && !!hn && hn.bybo[0] === 'a_prata' && hn.handlare.join() === h.varor.map(w => w.k).join();
    SIM.handlaKlar(s, a, a.task!); SIM.visaFiltar(s, h);
    const kop = !!aff() && aff()!.kop.some(w => w.k === k) && hf()!.varor.some(w => w.k === k);
    const v2 = uppgift(a, SIM.handlaVal(s, a)!);
    const hamtar = aff()?.fas === 'hamta' && v2.why === 'Hämtar varor att sälja' && Math.hypot(v2.spot.x - v1.spot.x, v2.spot.y - v1.spot.y) > 0.5;
    // en kund i taget, också medan hen hämtar
    const vb = SIM.handlaVal(s, b), ko = !!vb && vb.why.startsWith('Står i kö');
    let v3 = v2;
    for (let i = 0; i < 10 && aff()?.fas === 'hamta'; i++) { SIM.handlaKlar(s, a, a.task!); v3 = uppgift(a, SIM.handlaVal(s, a)!); }
    const bud = aff()?.fas === 'bud' && v3.why.startsWith('Förhandlar med') && v3.dur >= SIM.HANDEL.budSek[0] * SIM.SEC && v3.dur <= SIM.HANDEL.budSek[1] * SIM.SEC;
    const bubbla = SIM.handlarNu(s, a), visar = !!bubbla && bubbla.bybo.length > 0 && bubbla.handlare.includes(k);
    const f0 = aff()?.f ?? 0, forsta = Math.abs(f0 - SIM.HANDEL.forstaBud) < 1e-9 && f0 < 1;
    // nej, och då bjuder hen mer; köpet blir av till slut
    const steg: string[] = [];
    let nej = false, hojde = false;
    for (let i = 0; i < 30 && aff()?.vem === a.id; i++) {
      const n0 = aff()!.nej, ff = aff()!.f;
      SIM.handlaKlar(s, a, a.task!);
      if (aff() && aff()!.nej > n0) { nej = true; if (aff()!.f > ff) hojde = true; }
      if (aff()?.vem !== a.id) break;
      const v = uppgift(a, SIM.handlaVal(s, a)!); steg.push(v.why);
    }
    a.task = undefined;
    const kopte = ownsAmount(s, a, k) >= 1 && steg.includes('Hämtar det köpta') && steg.includes('Bär hem det köpta');
    const handslag = (SIM.radByte(s, s.log.slice().reverse().find(l => SIM.radByte(s, l))!)?.a) === a.id;
    // b ger upp efter tre nej (vi håller budet nere)
    const v4 = uppgift(b, SIM.handlaVal(s, b)!);
    let gav = !!v4 && v4.why.startsWith('Frågar vad'), antal = 0;
    for (let i = 0; i < 40 && aff()?.vem === b.id; i++) {
      if (aff()!.fas === 'bud') { aff()!.f = SIM.HANDEL.forstaBud / 2; antal++; }
      SIM.handlaKlar(s, b, b.task!);
      if (aff()?.vem !== b.id) break;
      uppgift(b, SIM.handlaVal(s, b)!);
    }
    gav = gav && antal === SIM.HANDEL.nejMax && b.thoughts.some(x => x.text.startsWith('Gick tomhänt')) && ownsAmount(s, b, k) === 0;
    // redogörelsen (steg 5.4.6.1): buden sparas med bytet, och den som gav upp får en rad och ett minne med buden
    const ma = a.byten?.[a.byten.length - 1], fa = ma?.forsok ?? [];
    const redogor = fa.length >= 2 && !!fa[fa.length - 1].ja && fa.slice(0, -1).every(f => !f.ja) && fa.every(f => f.vill.length > 0 && f.bud.length > 0 && f.krav >= 1 && f.bjod >= 1 && Number.isInteger(f.krav) && Number.isInteger(f.bjod))
      && fa[fa.length - 1].bjod >= fa[0].bjod && !!ma?.rel && ma.rel[1] > ma.rel[0];
    const mb = b.byten?.[b.byten.length - 1], rad = s.log.slice().reverse().find(l => SIM.radByte(s, l)?.avbruten);
    const avbr = !!mb?.avbruten && mb.forsok?.length === SIM.HANDEL.nejMax && mb.forsok.every(f => !f.ja) && !!rad && SIM.radByte(s, rad) === mb && rad.byte === undefined && rad.text.includes('blev inte överens') && !!mb.rel;
    // berättelsen (steg 5.4.6.2): argumenten ur det som fanns i affären, samma text varje gång, och slutet stämmer
    const berA = ma ? SIM.handelBerattelse(s, ma) : '', berB = mb ? SIM.handelBerattelse(s, mb) : '';
    const ber = !!ma?.arg?.includes('langt') && berA.includes(a.name) && berA === SIM.handelBerattelse(s, ma!) && !/\{|\}|  /.test(berA + berB)
      && berB.includes(b.name) && /gav .* upp|aldrig överens|ingen affär|utan något/.test(berB) && !/tog de i hand|var de överens|blev en affär|blev av/.test(berB);
    // många argument: högst tre i berättelsen, och irritationen kommer alltid med
    const manga = ma ? SIM.handelBerattelse(s, { ...ma, arg: ['byn', 'kemiGod', 'vanner', 'smicker', 'skicklig', 'irriterad', 'langt'] }) : '';
    const irr = /irriterad|lura mig|blev sur/.test(manga) && manga.split('. ').length <= 1 + 3 + 3;
    return [
      ['handlarens filt är tom när hen lagt ut den; varorna ligger i packningen', tom],
      ['byn handlar först, genom den som handlar för byn; ingen annan går', byn],
      ['kunden frågar vad handlaren har, och handlaren svarar med varornas symboler', fraga],
      ['kunden väljer och handlaren lägger det på sin filt', kop],
      ['kunden går och hämtar det hen bjuder från sina egna högar', hamtar],
      ['en kund i taget: nästa står i kö också medan den första hämtar', ko],
      [`kunden förhandlar en kort stund (${((v3.dur ?? 0) / SIM.SEC).toFixed(0)} s), med pratbubblor med budet och varan`, bud && visar],
      ['första budet är en bra affär för kunden', forsta],
      ['handlaren säger nej, och kunden bjuder mer', nej && hojde],
      [`vid ja blir det handslag, var och en plockar upp sitt och kunden bär hem det köpta: ${steg.join(', ')}`, kopte && handslag],
      ['efter tre nej ger kunden upp och går tomhänt', gav],
      [`redogörelsen: bytet minns buden (${fa.map(f => `${f.bjod}/${f.krav} ${f.ja ? 'ja' : 'nej'}`).join(', ')}) och relationen före och efter (${ma?.rel?.join(' → ')})`, redogor],
      ['den som gav upp får en rad i loggen och ett minne med alla bud, så att affären kan visas', avbr],
      [`berättelsen om affären: "${berA}" / "${berB}"`, ber],
      [`med många argument tar berättelsen högst tre, och irritationen kommer med: "${manga}"`, irr],
    ];
  },
};

SCENARIER.handlarrel = {
  text: 'Handlaren och relationen (steg 4.5.7.11, gastrel.ts): handlaren har en relation till varje bybo hen handlar med, sparad hos hen i grannklanen. Hur gärna hen går med på ett bud räknas som vänskapen i ett samtal: kemin (ur fröet, ingen slump dras), likheten, värmen och bybons charm, och dessutom det de varit med om. Ett alldeles för dåligt bud irriterar handlaren så att nästa bud blir svårare; irritationen varar besöket och en liten del finns kvar när hen kommer igen. Den som märkt att den andra lurat hen minns det. Relationen syns i bybons relationsflik (handlaren i listan, märkt gäst, och alla under Utanför byn) och på handlarens sida.',
  kor: () => {
    utanWebblasare();
    const s = createState(6, START);
    rikBy(s); setByn(s);
    SIM.skickaHandlare(s);
    const h = s.handlare!, [a, b] = living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
    // kemin ur fröet: samma i en kopia, och ingen slump dras
    const rng0 = JSON.stringify(s.rngs), c = cloneState(s);
    const r = SIM.gastRel(s, h, a)!, rc = SIM.gastRel(c, c.handlare!, byId(c, a.id)!)!;
    const fro = !!r && r.chem === rc.chem && JSON.stringify(s.rngs) === rng0 && Math.abs(r.chem) <= 1;
    const kp = SIM.handlarPerson(s, h), sparad = kp?.rel?.[a.id] === r;
    // samtalsdelarna: charmigare bybo gillas mer
    const g0 = SIM.gillar(s, h, a), k0 = a.pot.karisma, s0 = a.pot.skonhet;
    a.pot.karisma = 20; a.pot.skonhet = 20; const gCharm = SIM.gillar(s, h, a);
    a.pot.karisma = 1; a.pot.skonhet = 1; const gFul = SIM.gillar(s, h, a);
    a.pot.karisma = k0; a.pot.skonhet = s0;
    const charm = gCharm > g0 && g0 > gFul && SIM.kravRel(s, h, a) === 1 - SIM.GASTREL.krav * g0;
    // ett alldeles för dåligt bud irriterar, ett nästan bra gör det inte
    SIM.nejTill(s, h, a, 0.95); const lugn = r.irr === 0;
    SIM.nejTill(s, h, a, 0.5); const irr = r.irr === SIM.GASTREL.irr && SIM.gillar(s, h, a) < g0 && SIM.kravRel(s, h, a) > SIM.kravRel(s, h, b);
    // en affär gör relationen bättre; den som märkt att hen blivit lurad minns det
    SIM.affarMed(s, h, a); const affar = r.n === 1 && r.op === SIM.GASTREL.byteOp;
    SIM.luradMed(s, h, a, false); const lurad = r.lurad === 1 && r.op === SIM.GASTREL.byteOp - SIM.GASTREL.luradOp;
    // genom förhandlingen: ett dåligt bud från en bybo handlaren inte gillar ger nej och irritation
    const d = cloneState(s), dh = d.handlare!, da = byId(d, a.id)!;
    for (let i = 0; i < 40 && dh.fas !== 'handlar'; i++) { step(d, BEAT); utanVantan(d); }
    let viaSvar = false;
    if (dh.fas === 'handlar') {
      dh.bynKlar = true; delete dh.affar;
      for (const p of living(d)) if (p.task?.act === 'handla') p.task = undefined;
      dh.varor = [{ k: 'torrkott', n: 2 }]; SIM.put(d, 'skinn', 6, { [da.id]: 6 });
      const dr = SIM.gastRel(d, dh, da)!; dr.irr = 0; dr.op = -100;
      const upp = (v: NonNullable<ReturnType<typeof SIM.handlaVal>>) => { da.x = v.spot.x; da.y = v.spot.y; da.task = { act: 'handla', phase: 'do', tx: v.spot.x, ty: v.spot.y, until: d.now + v.dur, carry: 0, ref: v.ref, dark: false, why: v.why } as Task; };
      const n0 = d.stat?.handlarIrriterad ?? 0, aff = () => d.handlare?.affar;
      for (let i = 0; i < 40; i++) {
        const v = SIM.handlaVal(d, da); if (!v || aff()?.vem !== da.id) break; upp(v);
        if (aff()!.fas === 'bud') aff()!.f = 0.3;
        SIM.handlaKlar(d, da, da.task!);
      }
      viaSvar = dr.irr > 0 && (d.stat?.handlarIrriterad ?? 0) > n0;
    }
    // irritationen när hen går hem: en liten del finns kvar
    const fore = r.irr; SIM.glomIrritation(s, h); const kvar = Math.abs(r.irr - fore * SIM.GASTREL.kvar) < 1e-9 && r.irr > 0;
    // sparas med byn
    const sp = JSON.parse(JSON.stringify(s)) as State, sparas = SIM.klanById(sp, SIM.hp(s, h).gast!.klan)?.personer.find(q => q.namn === SIM.hp(s, h).name)?.rel?.[a.id]?.lurad === 1;
    // flikarna
    ui.selected = a.id; ui.personDel = 'rel'; const stangd = person.html();
    hjalpKlick({ closest: () => ({ dataset: { hjalp: `utanfor-${a.id}` } }) } as unknown as HTMLElement);
    const oppen = person.html();
    ui.selected = h.id; const hos = person.html();
    return [
      [`kemin (${r?.chem.toFixed(2)}) räknas ur fröet, likadant i en kopia, och ingen slump dras`, fro],
      ['relationen sparas hos handlaren i grannklanen', sparad],
      [`charmigare bybo gillas mer (${gFul.toFixed(2)} < ${g0.toFixed(2)} < ${gCharm.toFixed(2)}), och den som gillas får lägre krav`, charm],
      ['ett nästan bra bud irriterar inte', lugn],
      ['ett alldeles för dåligt bud irriterar handlaren, så att nästa bud blir svårare', irr],
      ['en affär gör relationen lite bättre', affar],
      ['den som märkt att hen blivit lurad minns det, och relationen blir sämre', lurad],
      ['i förhandlingen ger dåliga bud från en bybo hen inte gillar nej och irritation', viaSvar],
      [`när handlaren går hem finns ${Math.round(SIM.GASTREL.kvar * 100)} % av irritationen kvar`, kvar],
      ['relationen sparas med byn', sparas],
      ['bybons relationsflik: handlaren i listan märkt gäst, och Utanför byn hopfällt', stangd.includes(SIM.hp(s, h).name) && stangd.includes('gäst') && stangd.includes('Utanför byn') && !/affär.*affär/.test(stangd.replace(/\n/g, ''))],
      ['Utanför byn visar handlaren med klanen när man trycker', oppen.split(SIM.hp(s, h).name).length > stangd.split(SIM.hp(s, h).name).length && oppen.includes(SIM.klanById(s, SIM.hp(s, h).gast!.klan)!.namn)],
      ['handlarens relationsflik visar bybon under Affärerna i byn', hos.includes('Affärerna i byn') && hos.includes(a.name) && hos.includes('lurade bybon 1 gång')],
    ];
  },
};

SCENARIER.filtar = {
  text: 'Filtarna mitt emot varandra (steg 4.5.4.13, byte.ts och handel.ts): den som byter, också en bybo som handlar med handlaren, lägger ut sin egen filt mitt emot den andras, och plockar ihop den när bytet är klart eller hen gått. Trycker man på en filt visas en enkel lista med vad som ligger på den och vems den är; två filtar mitt emot varandra visas alltid som en ruta, vilken av dem man än trycker på: vad var och en erbjuder och priserna i silver.',
  kor: () => {
    utanWebblasare();
    const s = createState(6, START);
    rikBy(s); setByn(s); s.nastaHandlare = s.now;
    for (let i = 0; i < 40 && s.handlare?.fas !== 'handlar'; i++) { step(s, BEAT); utanVantan(s); }
    const h = s.handlare!, hf = s.filtar?.find(f => f.handlare === h.id);
    // byn handlar först: den som handlar för byn lägger ut byns saker mitt emot handlaren när de förhandlar
    const forByn = living(s).find(p => !!SIM.handlaVal(s, p));
    if (forByn) helAffar(s, forByn, false, 'bud');
    const mot = hf && SIM.filtMot(s, hf);
    const motBy = !!forByn && !!mot && mot.vem === forByn.id && !!mot.byn && mot.par === hf!.par && mot.varor.length > 0 && Math.abs(mot.y - hf!.y - SIM.FILT_MOT) < 1e-9;
    // rutan: samma byte vilken filt man än trycker på
    ui.nu = s.now;
    ui.filtAt = { x: hf?.x ?? 0, y: hf?.y ?? 0 }; const r1 = filtFlik.html();
    ui.filtAt = { x: mot?.x ?? 0, y: mot?.y ?? 0 }; const r2 = filtFlik.html();
    const ruta = r1 === r2 && r1.includes('Bytet') && r1.includes('filtpar') && r1.includes(SIM.hp(s, h).name) && !!forByn && r1.includes(forByn.name) && r1.includes('för byn') && /silver/.test(r1) && r1.includes('Värt');
    // när bytet är klart plockas bybons filt ihop
    if (forByn) helAffar(s, forByn);
    for (let i = 0; i < 3; i++) step(s, BEAT);
    const ihop = !!hf && !(s.filtar ?? []).some(f => f.par === hf.par && f.handlare === undefined && f.vem === forByn?.id && f.byn);
    // ett byte mellan två bybor: två filtar med samma par, och en filt ensam (den andra hopplockad) visar en enkel lista
    const t = createState(6, START);
    rikBy(t); tomtForrad(t); t.ting = []; setByn(t);
    const [a, b] = treVuxna(t, 1, q => { q.warm = 1; q.pot.empati = 10; q.habit = {}; });
    a.habit = { samla: 10 }; addTool(t, 'korg', b); addTool(t, 'korg', b); gain(t, a, 'bar', 20);
    const bytte = askForTool(t, a, b) === 'byte';
    const [f1, f2] = t.filtar ?? [];
    const par = bytte && t.filtar?.length === 2 && f1.par === f2.par && f1.vem !== f2.vem && Math.abs(Math.abs(f1.y - f2.y) - SIM.FILT_MOT) < 1e-9;
    ui.nu = t.now; ui.filtAt = { x: f1.x, y: f1.y };
    const parRuta = filtFlik.html();
    t.filtar = [f1]; f1.par = undefined;
    const ensam = filtFlik.html();
    const lista = !parRuta.includes('Filten<') && parRuta.includes('Bytet') && parRuta.includes(a.name) && parRuta.includes(b.name)
      && ensam.includes('<h2>Filten</h2>') && !ensam.includes('Värt') && ensam.includes(byId(t, f1.vem!)!.name);
    return [
      ['handlaren har sin filt ute', !!hf && hf.vem === h.id && hf.par !== undefined],
      [`den som handlar för byn (${forByn?.name ?? 'ingen'}) lägger ut byns saker på en filt mitt emot handlarens`, motBy],
      ['trycker man på någon av de två filtarna visas samma ruta: båda sidorna och priserna i silver', ruta],
      ['bybons filt plockas ihop när bytet är klart', ihop],
      ['ett stort byte mellan två bybor: var sin filt mitt emot varandra', par],
      ['två filtar visas som ett byte med båda namnen; en filt ensam som en enkel lista med vems den är', lista],
    ];
  },
};

SCENARIER.filtplats = {
  text: 'Platsen för handeln (steg 4.5.7.1 och 4.5.7.3, handel.ts och byte.ts): filtarna ligger med ungefär en ruta fritt mellan sig, och var och en står bakom sin egen filt, på den sida som är längst från den andra. Filtarna och platserna där de står ligger på fri mark: ingen byggnad, station, möbel, lagerplats, hög eller fält.',
  kor: () => {
    utanWebblasare();
    const s = createState(6, START);
    rikBy(s); setByn(s); s.nastaHandlare = s.now;
    for (let i = 0; i < 40 && s.handlare?.fas !== 'handlar'; i++) { step(s, BEAT); utanVantan(s); }
    const h = s.handlare!, hf = s.filtar?.find(f => f.handlare === h.id);
    const forByn = living(s).find(p => !!SIM.handlaVal(s, p));
    if (forByn) helAffar(s, forByn, false, 'bud');
    const mot = hf && SIM.filtMot(s, hf);
    const isar = !!hf && !!mot && mot.y - hf.y >= 2.3;
    const bakom = !!hf && !!mot && !!forByn && SIM.hp(s, h).y < hf.y && forByn.task!.ty > mot.y && Math.abs(forByn.task!.ty - SIM.bakomFilt(s, mot).y) < 1e-9;
    const fri = !!hf && !!mot && [hf, mot].every(f => [-1, 0, 1].every(dx => SIM.ledig(s, Math.floor(f.x) + dx, Math.floor(f.y))));
    const z = SIM.zonesOf(s)[0], inteLager = !!z && !SIM.handelFri(s, z.x + 1, z.y - 1);
    return [
      [`filtarna ligger ${mot && hf ? (mot.y - hf.y).toFixed(1) : '?'} rutor isär, mitt till mitt (ungefär en ruta fritt mellan dem)`, isar],
      [`handlaren står bakom sin filt och ${forByn?.name ?? 'ingen'} bakom byns filt, på var sin sida`, bakom],
      ['filtarna ligger på fri mark', fri],
      ['en plats där en lagerplats ligger är inte fri för handeln', inteLager],
    ];
  },
};

SCENARIER.overflod = {
  text: 'Byborna säljer sitt överflöd för silver (steg 4.5.4.14, handel.ts): den som har mycket mer av något än hen behöver går till handlaren för att sälja det mot silver, när handlaren vill ha det, också om hen inte vill köpa något. Silvret sparas till nästa handlare eller byte. Den som bara har lite över går inte.',
  kor: () => {
    const s = createState(6, START);
    rikBy(s); s.nastaHandlare = s.now;
    for (let i = 0; i < 40 && s.handlare?.fas !== 'handlar'; i++) { step(s, BEAT); utanVantan(s); }
    const h = s.handlare!, [a, b] = living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
    h.bynKlar = true; h.varor = []; h.silver = 100;
    for (const p of living(s)) if (p.task?.act === 'handla') p.task = undefined;
    const k = 'skinn';
    SIM.put(s, k, 12, { [a.id]: 12 }); // a har mycket mer än hen behöver
    const fore = ownsAmount(s, a, k), silver0 = ownsAmount(s, a, 'silver'), vill = SIM.handlarVarde(s, h, k) > 0;
    const va = SIM.handlaVal(s, a);
    const vb = SIM.handlaVal(s, b);
    if (va) helAffar(s, a);
    const silver = ownsAmount(s, a, 'silver') - silver0, salt = fore - ownsAmount(s, a, k);
    const hanFick = h.varor.some(w => w.k === k);
    // handlaren vill inte ha det (ryggsäcken full): ingen går dit för att sälja
    const t = createState(6, START);
    rikBy(t); t.nastaHandlare = t.now;
    for (let i = 0; i < 40 && t.handlare?.fas !== 'handlar'; i++) { step(t, BEAT); utanVantan(t); }
    const h2 = t.handlare!, [c] = living(t).filter(p => SIM.ageOf(p, t.now) >= SIM.ALDER.vuxen);
    h2.bynKlar = true; h2.varor = [{ k: 'sten', n: 999 }];
    SIM.put(t, k, 12, { [c.id]: 12 });
    const full = SIM.handlarVarde(t, h2, k) === 0 && !SIM.handlaVal(t, c);
    return [
      [`handlaren vill ha ${k}`, vill],
      [`den som har mycket över (${fore} ${k}) går till handlaren för att sälja, utan att vilja köpa något`, !!va && va.why.startsWith('Frågar vad')],
      [`hen säljer (${salt}) och får silver (${silver}), som hen äger efteråt`, salt >= 1 && silver >= 1 && hanFick && (s.stat?.saltOver ?? 0) >= 1],
      ['den som inte har något över går inte', !vb],
      ['när handlaren inte kan bära mer går ingen dit för att sälja', full],
    ];
  },
};

SCENARIER.handlarprat = {
  text: 'Småprat med handlaren (steg 4.5.4.15, handel.ts): medan handlaren är i byn småpratar byborna som är nära med hen, som med en bybo (samtalen, symbolen och pratbubblan), också de som inte handlar. Ingen kunskap byts och relationerna ändras inte: samtalet påverkar bara humöret.',
  kor: () => {
    const s = createState(6, START);
    rikBy(s); s.nastaHandlare = s.now;
    for (let i = 0; i < 40 && s.handlare?.fas !== 'handlar'; i++) { step(s, BEAT); utanVantan(s); }
    const h = s.handlare!, [a, b] = living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
    const social = (p: Person, x: number, y: number) => { p.x = x; p.y = y; p.task = { act: 'samtal', phase: 'do', tx: x, ty: y, until: s.now + HOUR, carry: 0, dark: false, why: '' } as Task; };
    social(a, SIM.hp(s, h).x + 1, SIM.hp(s, h).y + 1); social(b, SIM.hp(s, h).x + 30, SIM.hp(s, h).y); // a är nära handlaren, b långt borta
    const rels = JSON.stringify(s.rels), kan = JSON.stringify(a.tek ?? null), skill = JSON.stringify(a.skill);
    const ev: SIM.TalkEvent[] = [];
    SIM.pratMedHandlare(s, SIM.HANDEL.pratSek * 2, ev); // så lång tid att hen säkert pratar
    const tanke = a.thoughts.some(x => x.text.includes(SIM.hp(s, h).name) && x.text.startsWith('Småprat')), ingenB = !b.thoughts.some(x => x.text.includes(SIM.hp(s, h).name));
    const handelse = ev.some(e => e.a === a.id && e.b === h.id && e.kind === 'småprat') && !ev.some(e => e.a === b.id);
    const bara = JSON.stringify(s.rels) === rels && JSON.stringify(a.tek ?? null) === kan && JSON.stringify(a.skill) === skill;
    // medan någon handlar pratar varken hen eller handlaren med någon annan; den som står i kö får prata (steg 4.5.7.5)
    const c = living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen)[2];
    h.affar = { vem: b.id, namn: b.name, fas: 'bud', kop: [], bud: [], hamta: [], framme: [], nej: 0, f: SIM.HANDEL.forstaBud, t: s.now };
    b.x = SIM.hp(s, h).x + 1; b.y = SIM.hp(s, h).y + 2; b.task = { act: 'handla', phase: 'do', tx: b.x, ty: b.y, until: s.now + HOUR, carry: 0, ref: h.id, dark: false, why: '' } as Task;
    c.x = SIM.hp(s, h).x + 1; c.y = SIM.hp(s, h).y + 3; c.task = { act: 'koa', phase: 'do', tx: c.x, ty: c.y, until: s.now + HOUR, carry: 0, ref: h.id, dark: false, why: '' } as Task;
    const ev2: SIM.TalkEvent[] = [];
    SIM.pratMedHandlare(s, SIM.HANDEL.pratSek * 2, ev2);
    const tyst = !ev2.length && !SIM.isSocial(b) && SIM.isSocial(c);
    delete h.affar; b.task = undefined; c.task = undefined;
    // i spelet: medan handlaren är kvar pratar någon med hen
    // det är slumpen om någon står nära just när hen är ledig: några byar
    let t = createState(6, START);
    for (const seed of [6, 7, 8, 9]) {
      t = createState(seed, START);
      rikBy(t); t.nastaHandlare = t.now;
      for (let i = 0; i < 24 * 12 && !(t.stat?.handlarPrat); i++) { step(t, BEAT); utanVantan(t); }
      if (t.stat?.handlarPrat) break;
    }
    return [
      ['den som sitter vid elden nära handlaren småpratar med hen och får en tanke om det', tanke],
      ['samtalet blir ett småprat med handlaren (bubblan), den som är långt borta pratar inte', handelse && ingenB],
      ['ingen kunskap, färdighet eller relation ändras', bara],
      ['medan någon handlar pratar varken hen eller handlaren med någon annan, men den som står i kö får prata', tyst],
      [`i spelet småpratar byborna med handlaren medan hen är i byn (${t.stat?.handlarPrat ?? 0} gånger)`, (t.stat?.handlarPrat ?? 0) > 0],
    ];
  },
};

SCENARIER.kopta = {
  text: 'Köpta redskap (steg 4.5.4.16, handel.ts, behov.ts, redskap.ts): finns inget redskap av ett slag i byn som ett arbete inte går utan (yxan för att fälla träd), vill byborna köpa ett av handlaren, också om de inte arbetar med det. Den som köpt det kan använda det men inte göra ett förrän byn kan tekniken, och kommer en fast bit närmare tekniken, en gång. Handlarens sort följer byns rikedom, inte byns tekniker, och hen har bara varor som sorten kan ha.',
  kor: () => {
    const s = createState(6, START);
    rikBy(s); s.nastaHandlare = s.now;
    for (let i = 0; i < 40 && s.handlare?.fas !== 'handlar'; i++) { step(s, BEAT); utanVantan(s); }
    const h = s.handlare!, [a, b] = living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
    const sort = h.sort === 'vandrande' && h.varor.every(w => SIM.HANDLARVAROR.some(v => v.k === w.k && v.sort.includes('vandrande')));
    h.bynKlar = true; h.silver = 0;
    s.ting = tingOf(s).filter(q => q.k !== 'yxa' && q.k !== 'kniv'); // byn har ingen yxa eller kniv och kan inte göra dem
    for (const p of living(s)) { if (p.task?.act === 'handla') p.task = undefined; p.tek = { ...p.tek, yxa: 0, kniv: 0 }; delete p.hopp; }
    const saknar = SIM.behovAv(s, a, 'yxa') === SIM.DELA.saknar;
    h.varor = [{ k: 'yxa', n: 1, q: 1 }, { k: 'kniv', n: 1, q: 1 }];
    SIM.put(s, 'silver', 300, { [a.id]: 300 });
    const va = helAffar(s, a).forsta;
    const har = (p: Person, k: string) => tingOf(s).some(q => q.agare === p.id && q.k === k);
    const kopte = har(a, 'yxa'), kniv = har(a, 'kniv');
    const hopp = (a.tek?.yxa ?? 0), kan = SIM.knows(a, 'yxa'), gora = SIM.canMake(s, a, 'yxa');
    // det köpta används: den som äger kniven kan slakta (utan att kunna göra en kniv), den andra inte
    const art = SIM.DJURARTER.find(d => d.kniv)!;
    SIM.put(s, art.sak, art.mat * 3, { [a.id]: art.mat * 3 });
    const slakt = !kniv || SIM.canProcess(s, a, art) || !SIM.kanGoras(s, art.act, a), inteB = !SIM.canProcess(s, b, art);
    // en till yxa ger ingen ny knuff mot tekniken
    h.varor = [{ k: 'yxa', n: 1, q: 1 }]; SIM.put(s, 'silver', 60, { [b.id]: 60 });
    const bytt = (s.stat?.redskapHopp ?? 0), vb = helAffar(s, b).forsta;
    const ingenNy = !vb && (s.stat?.redskapHopp ?? 0) === bytt;
    return [
      [`handlaren är en vandrande handlare med varor som den sorten kan ha`, sort],
      ['finns ingen yxa i byn saknar man en, också den som inte fäller träd', saknar],
      [`den som saknar en yxa går till handlaren och köper den (${va?.why ?? 'gick inte'})`, kopte],
      [`hen kommer en fast bit närmare tekniken (${hopp.toFixed(2)}), men kan inte göra en yxa`, Math.abs(hopp - SIM.HANDEL.redskapHopp) < 1e-9 && !kan && !gora && (a.hopp ?? []).includes('yxa')],
      [`den som köpt en kniv kan slakta med den, den som inte äger någon kan inte`, kniv && slakt && inteB],
      ['när byn redan har en yxa vill ingen köpa en till för att den saknas, och ingen ny knuff ges', ingenNy],
    ];
  },
};

SCENARIER.handslag = {
  text: 'Bytet syns och minns (steg 4.5.4.17, byte.ts, ui/handel.ts, ui/flikar/filt.ts): när ett byte är godkänt syns ett handslag över båda i några sekunder, sakerna går från den ena filten till den andra och filtarna plockas ihop strax efter. Bytet minns med raden i loggen, hos byborna som var med och hos handlaren: vem, vad var och en gav och priserna i silver. Ett tryck på handslaget vid raden eller bland en persons byten visar hela bytet som rutan på filten.',
  kor: () => {
    utanWebblasare();
    // ett stort byte mellan två bybor
    const t = createState(6, START);
    rikBy(t); tomtForrad(t); t.ting = []; setByn(t);
    const [a, b] = treVuxna(t, 1, q => { q.warm = 1; q.pot.empati = 10; q.habit = {}; });
    a.habit = { samla: 10 }; addTool(t, 'korg', b); addTool(t, 'korg', b); gain(t, a, 'bar', 20);
    const bytte = askForTool(t, a, b) === 'byte';
    const e = t.log.slice().reverse().find(l => SIM.radByte(t, l)), m = e && SIM.radByte(t, e);
    const hel = (v: SIM.ByteVara[]) => v.length > 0 && v.every(w => Number.isInteger(w.n) && w.n >= 1 && Number.isInteger(w.p) && w.p >= 1);
    const minns = !!m && [m.a, m.b].sort().join() === [a.id, b.id].sort().join() && hel(m.ag) && hel(m.bg) && !!m.fa && !!m.fb
      && !!a.byten?.some(x => x.nr === m.nr) && !!b.byten?.some(x => x.nr === m.nr);
    const [f1] = t.filtar ?? [];
    const kort = !!f1 && f1.byt === t.now && f1.slut - t.now === (SIM.BYTE.handslagSek + SIM.BYTE.flyttSek) * SIM.SEC + SIM.BYTE.packaMin * SIM.MIN;
    // gränssnittet: handslaget vid raden i loggen och bland personens byten, och rutan med hela bytet
    ui.nu = t.now; ui.selected = a.id;
    const rad = !!e && linkify(e).includes(`data-byte="${m?.nr}"`), sida = person.html(), visas = sida.includes('<h3>Byten</h3>') && sida.includes(`data-byte="${m?.nr}"`);
    const klickat = filtFlik.klick!({ closest: () => ({ dataset: { byte: String(m?.nr) } }) } as unknown as HTMLElement) && ui.byteNr === m?.nr && ui.tab === 'filt';
    const ruta = filtFlik.html(), helRuta = ruta.includes('<h2>Bytet</h2>') && ruta.includes(a.name) && ruta.includes(b.name) && ruta.includes('Värt') && /silver/.test(ruta);
    ui.byteNr = -1;
    // filtarna plockas ihop strax efter
    for (let i = 0; i < 40 && (t.filtar?.length ?? 0) > 0; i++) { t.now += SIM.MIN; SIM.stadaByten(t); }
    const ihop = !(t.filtar?.length) && t.now - (e?.t ?? 0) <= (SIM.BYTE.packaMin + 1) * SIM.MIN + (SIM.BYTE.handslagSek + SIM.BYTE.flyttSek) * SIM.SEC;
    // ett byte med handlaren: sakerna går mellan hens filt och den som handlar, och hen minns bytet
    const s = createState(6, START);
    rikBy(s); s.nastaHandlare = s.now;
    for (let i = 0; i < 40 && s.handlare?.fas !== 'handlar'; i++) { step(s, BEAT); utanVantan(s); }
    const h = s.handlare!, [c] = living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
    h.bynKlar = true; h.varor = []; h.silver = 100;
    for (const p of living(s)) if (p.task?.act === 'handla') p.task = undefined;
    SIM.put(s, 'skinn', 12, { [c.id]: 12 });
    helAffar(s, c);
    const hm = s.log.slice().reverse().map(l => SIM.radByte(s, l)).find(Boolean), hf = s.filtar?.find(f => f.handlare === h.id);
    const hand = !!hm && hm.a === c.id && hm.b === h.id && !!hf && hm.fb?.x === hf.x && hm.fb?.y === hf.y && h.bytt?.at(-1)?.m?.nr === hm.nr
      && hm.bg.every(w => w.k === 'silver' && w.p === 1) && hel(hm.ag) && !!c.byten?.some(x => x.nr === hm.nr);
    return [
      [`ett stort byte mellan två bybor blir av`, bytte],
      ['bytet minns med raden i loggen och hos båda: vem, vad var och en gav och priserna i hela silver', minns],
      ['filtarna ligger bara medan handslaget syns, sakerna går över och strax efter', kort],
      ['raden i loggen och personens byten har handslaget, som öppnar bytet', rad && visas && klickat],
      ['rutan visar hela bytet: båda namnen, vad var och en gav, priserna i silver och vad det är värt', helRuta],
      ['filtarna plockas ihop strax efter bytet', ihop],
      ['ett byte med handlaren går mellan hens filt och den som handlar, med hens priser, och hen och bybon minns det', hand],
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
    for (let i = 0; i < 40 && s.handlare?.fas !== 'handlar'; i++) { step(s, BEAT); utanVantan(s); }
    const h = s.handlare, fran = !!h && SIM.hp(s, h).gast!.klan === k[0].id && SIM.hp(s, h).gast!.hem! === k[0].hem && k[0].personer.some(p => p.roll === 'handlare' && p.namn === SIM.hp(s, h).name);
    // ett byte gör klanen vänligare, en upptäckt lurendrejeri mindre vänlig
    const [a] = living(s), pa = { id: a.id, namn: a.name, x: a.x, y: a.y, varde: () => 0, over: () => [] } as SIM.Part;
    const ph = { ...pa, id: h?.id ?? -1, namn: h ? SIM.hp(s, h).name : '' } as SIM.Part;
    const i0 = k[0].inst;
    for (const fn of SIM.vidByte) fn(s, pa, ph, [], [], { nr: 0, t: s.now, a: pa.id, an: pa.namn, b: ph.id, bn: ph.namn, ag: [], bg: [] });
    const vanligare = k[0].inst === i0 + SIM.KLAN.handel;
    if (h) SIM.hp(s, h).skill.handel = 1000; // märker det säkert
    const i1 = k[0].inst;
    for (const fn of SIM.vidLura) fn(s, pa, ph, false);
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
  text: 'Rövarflocken (steg 4.4.5, 10.1.9, rovare.ts): en rik by lockar rövare, mindre ju bättre försvar den har. Flocken kommer från en grannklan som inte tycker om byn och går in från kartans kant. Den som ser dem ropar, och byn skyddar sig: den som vet varnar först och väljer sedan sin roll. Ett tyst anfall (alla sover) plundrar förrådet osett; står de vuxna emot blir det en strid; står många fler emot flyr eller faller rövarna utan att ha tagit något, och de som flyr lämnar kartan. Testknappen skickar ett gäng som går som vanligt men väntar kortare.',
  kor: () => {
    const s = createState(6, START); klockan(s);
    const fattig = SIM.lockar(s) === 0;
    const r = cloneState(s); setAmount(r, 'skinn', 400);
    const utan = Math.min(1, Math.max(0, (rikedom(r) - SIM.ROVARE.rikFran) / SIM.ROVARE.rikSpann));
    const rik = SIM.lockar(r) > 0, forsvar = SIM.forsvaret(r) > 0 && SIM.lockar(r) < utan;
    // flocken kommer från den fientliga klanen
    const k0 = SIM.klanerOf(s)[0]; for (const c of SIM.klanerOf(s)) c.inst = 10; k0.inst = -60;
    const bas = cloneState(s);
    // testläget (steg 4.5.4.4, 10.1.16): knapparna skickar en liten, mellanstor eller stor flock, och en handlare, också när ingen klan tycker om byn.
    // Flocken kommer in från kanten som vilket gäng som helst, och bara väntan på rastplatsen är kortare. En rad i Händelser säger varifrån,
    // och den andra knapptryckningen ger ett skäl
    let tlRad = '', tlSkal = '';
    const tl = (['liten', 'mellan', 'stor'] as const).map(k => {
      const q = cloneState(bas); for (const p of living(q)) p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: q.now + 8 * HOUR, carry: 0 };
      const r = SIM.skickaRovare(q, SIM.ROVARFLOCK[k]), r2 = SIM.skickaRovare(q, 2);
      const rad = q.log.find(e => e.text.startsWith('Testläget:'))?.text ?? ''; tlRad = rad; tlSkal = r2.text;
      const f = q.rovare!, kant = f.x < 1 || f.y < 1 || f.x > SIM.W - 1 || f.y > SIM.H - 1;
      const ok = r.ok && f.test === true && kant && f.folk.length === SIM.ROVARFLOCK[k] && f.gor === 'kommer' && /kommer in från kartans kant \d+ rutor .+ om elden, rastar en minut utanför byn/.test(rad) && !r2.ok && !!r2.text && !!SIM.rovarHinder(q);
      // den når byn inom en timme: väntan är en minut på rastplatsen, sedan går de till förrådet
      const sek = korTills(q, () => !!f.anfaller, 3600);
      return ok && f.anfaller && sek < 1200 ? SIM.ROVARFLOCK[k] : 0;
    });
    const th = cloneState(bas); for (const c of SIM.klanerOf(th)) c.inst = -60;
    const th1 = SIM.skickaHandlare(th), th2 = SIM.skickaHandlare(th);
    const testHandlare = th1.ok && !!th.handlare && th.handlare.fas === 'kommer' && th.log.some(e => e.text.startsWith('Testläget: handlaren')) && !th2.ok && th2.text === SIM.handlarHinder(th);
    const k = cloneState(bas);
    SIM.rovarnaKommer(k, 4);
    const f = k.rovare!;
    const kommer = !!f && f.folk.length === 4 && f.klan === k0.id && f.gor === 'kommer' && !f.test && SIM.rovarna(k, f).every(x => x.name && SIM.gastTingOf(k, x).length > 0) && (f.x < 1 || f.y < 1 || f.x > SIM.W - 1 || f.y > SIM.H - 1);
    // vakten ser den, gissar och ropar; den som hör det varnar först och skyddar sig sedan
    const [a, b] = living(k).filter(p => SIM.ageOf(p, k.now) >= SIM.ALDER.vaktFran);
    a.x = f.x + (f.x < 1 ? 6 : f.x > SIM.W - 1 ? -6 : 0); a.y = f.y + (f.y < 1 ? 6 : f.y > SIM.H - 1 ? -6 : 0);
    b.x = a.x + 1; b.y = a.y;
    a.task = { act: 'vakt', phase: 'do', tx: a.x, ty: a.y, until: k.now + HOUR, carry: 0 };
    b.task = { act: 'samtal', phase: 'do', tx: b.x, ty: b.y, until: k.now + HOUR, carry: 0 };
    SIM.rovarSteg(k, BEAT / SIM.SEC);
    const sedd = f.sedd !== undefined && (f.gissning ?? 0) >= 1 && a.larm?.vad === 'rovare' && b.larm?.vad === 'rovare';
    const varnar = SIM.vargSkydd(k, b)?.act === 'varna';
    b.larm!.varnat = 1;
    const skydd = /Rövare/.test(SIM.vargSkydd(k, b)?.why ?? '');
    // ett tyst anfall: alla sover, gänget går fram till förrådet och tar det mest värda
    const forrad = (x: State) => SIM.SAK_LIST.filter(k => !SAKER[k]!.redskap).reduce((n, k) => n + amountOf(x, k), 0);
    const malet = (x: State) => { const z = SIM.zoneOf(x)!; return { x: z.x + z.w / 2, y: z.y + z.h / 2 }; };
    const t = cloneState(bas); setAmount(t, 'skinn', 20);
    for (const p of living(t)) p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: t.now + 8 * HOUR, carry: 0 };
    const t0 = forrad(t), ft = rovarGang(t, 3, { x: malet(t).x + 12, y: malet(t).y }, { anfaller: true });
    korTills(t, () => !!ft.klar || !t.rovare, 3600);
    const tyst = (t.stat?.rovarTyst ?? 0) === 1 && forrad(t) < t0 && (t.stat?.rovat ?? 0) >= 1 && (t.hist?.kronika ?? []).some(x => x[2] === 'rovare');
    // de vuxna står emot: en strid
    const c = cloneState(bas), fc = rovarGang(c, 3, { x: malet(c).x + 12, y: malet(c).y }, { anfaller: true });
    const vuxna = living(c).filter(p => SIM.ageOf(p, c.now) >= SIM.ALDER.vaktFran && SIM.ageOf(p, c.now) < SIM.ALDER.vaktTill).slice(0, 2);
    for (const p of living(c)) p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: c.now + 8 * HOUR, carry: 0 };
    const m = malet(c);
    for (const p of vuxna) { Object.assign(p, SIM.freeNear(c, m.x, m.y)); p.task = { act: 'forsvarRovare', phase: 'do', tx: p.x, ty: p.y, until: c.now + HOUR, carry: 0 }; }
    korTills(c, () => !!SIM.flockStrid(c, fc), 1800);
    const gc = SIM.flockStrid(c, fc);
    const strid = (c.stat?.rovarStrid ?? 0) === 1 && !!gc && /rövare/.test(gc.orsak) && vuxna.every(p => p.task?.act === 'strid');
    // byn väntar med många fler: rövarna står inte emot, och tar ingenting. De flyr eller faller, och de som flyr lämnar kartan
    const d = cloneState(bas); rovarGang(d, 2, { x: malet(d).x + 12, y: malet(d).y }, { anfaller: true });
    for (const p of living(d)) p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: d.now + 8 * HOUR, carry: 0 };
    const md = malet(d);
    for (const p of living(d).filter(p => SIM.ageOf(p, d.now) >= SIM.ALDER.vaktFran).slice(0, 5)) { Object.assign(p, SIM.freeNear(d, md.x, md.y)); p.task = { act: 'forsvarRovare', phase: 'do', tx: p.x, ty: p.y, until: d.now + 3 * HOUR, carry: 0 }; }
    korTills(d, () => !d.rovare, 3600);
    const vande = !d.rovare && (d.stat?.rovat ?? 0) === 0;
    const borta = !d.rovare && !d.people.some(p => p.gast?.sort === 'rovare' && SIM.gastLever(p)) && (d.stat?.rovarBorta ?? 0) + (d.stat?.rovarDoda ?? 0) >= 1;
    // direkt efter ett anfall är chansen liten, och den växer med tiden
    const vila = SIM.efterAnfall(k) < 0.1; // skyddet efter ett anfall avtar med tiden (steg 8.7.14)
    return [
      [`testläget skickar en liten, mellanstor och stor flock (${tl.join(', ')} rövare) från kanten, och den når byn inom en timme (steg 4.5.7.10, 10.1.16), och en handlare, med en rad i Händelser (${tlRad}) och ett skäl när det inte går (${tlSkal})`, tl[0] > 0 && tl[0] < tl[1] && tl[1] < tl[2] && testHandlare],
      ['en ny och fattig by lockar inga rövare', fattig],
      ['en rik by lockar rövare', rik],
      ['försvaret räknas emot rikedomen', forsvar],
      ['flocken kommer från den fientliga klanen och går in från kartans kant', kommer],
      ['vakten ser flocken, gissar hur många och ropar', sedd],
      ['den som får larmet varnar först ...', varnar],
      ['... och skyddar sig sedan som mot vargar', skydd],
      ['ett tyst anfall plundrar förrådet osett och skrivs i krönikan', tyst],
      ['de vuxna som står emot slåss med rövarna', strid],
      ['står många fler emot flyr eller faller rövarna utan att ha tagit något', vande],
      ['de som flyr lämnar kartan', borta],
      ['direkt efter ett anfall är chansen liten, och den växer med tiden', vila],
    ];
  },
};

SCENARIER.rovargang = {
  text: 'Rövarna är människor (steg 6.6.9, 10.1.9, rovare.ts): varje rövare står och går för sig i en bybos fart med samma vägsökning. Gänget går till rastplatsen utanför byns område, där var och en rastar, går omkring och pratar i en lös klunga, och efter väntan går de till förrådet och plundrar. De som är nöjda eller flyr bär hem och springer var för sig mot kanten. Bilden följer vägen (rovarPlats), och en sparad by från före v450 får rövarna på plats.',
  kor: () => {
    const s = createState(6, START), dt = BEAT;
    for (const c of SIM.klanerOf(s)) c.inst = -60;
    for (const p of living(s)) p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: s.now + 20 * HOUR, carry: 0 };
    rovarGang(s, 5);
    const z = SIM.zoneOf(s)!, m = { x: z.x + z.w / 2, y: z.y + z.h / 2 };
    const iVatten = (r: { x?: number; y?: number }) => SIM.vattenNu(s)[Math.floor(r.y!) * SIM.W + Math.floor(r.x!)] === SIM.T.Vatten;
    let fortast = 0, klunga = true, torrt = true, olika = false, vantade = false, lurAvst = 0, rastUt = -1, tag = false;
    const valde = new Set<string>();
    const fart = (r: Person) => { const sp = r.gast?.spar ?? []; for (let i = 3; i < sp.length; i += 3) { const dtt = (sp[i] - sp[i - 3]) / SIM.SEC; if (dtt > 0.05) fortast = Math.max(fortast, Math.hypot(sp[i + 1] - sp[i - 2], sp[i + 2] - sp[i - 1]) / dtt); } };
    korTills(s, () => !s.rovare || !!s.rovare.klar, 7200, () => {
      const g = s.rovare; if (!g) return;
      const fo = SIM.rovarna(s, g);
      fo.forEach(fart);
      if (fo.some(iVatten)) torrt = false;
      for (const r of fo) if (r.gast?.gor) valde.add(r.gast.gor);
      if (g.vantat && !g.anfaller && g.rast) {
        if (!vantade) { vantade = true; lurAvst = Math.hypot(g.rast.x - m.x, g.rast.y - m.y); rastUt = SIM.utanforByn(s, g.rast.x, g.rast.y); olika = new Set(fo.map(r => `${r.x.toFixed(1)},${r.y.toFixed(1)}`)).size === fo.length; }
        if (fo.some(r => Math.hypot(r.x - g.rast!.x, r.y - g.rast!.y) > SIM.ROVARE.rastR * 1.5 + 1)) klunga = false;
      }
      if (g.anfaller && !tag && (s.stat?.rovat ?? 0) > 0) tag = true;
    });
    const framme = (s.stat?.rovarPlundring ?? 0) > 0 && tag;
    // de som är nöjda bär hem och springer var för sig mot kanten
    let isar = false;
    for (let i = 0; i < 40 && s.rovare; i++) { SIM.step(s, SIM.nastaSteg(s)); if (s.rovare && s.rovare.folk.length > 1) { const fo = SIM.rovarna(s, s.rovare); isar ||= fo.some(r => r.x !== fo[0].x || r.y !== fo[0].y); } }
    korTills(s, () => !s.rovare, 3600);
    const ut = !s.rovare;
    // bilden: mitt emellan två punkter i spar
    const r0 = { name: 'A', sex: 'm', x: 1, y: 1, gast: { sort: 'rovare', vapen: 'kniv', spar: [0, 1, 1, 10 * SIM.SEC, 3, 1] } } as unknown as Person;
    const mitt = SIM.rovarPlats(r0, 5 * SIM.SEC), mittOk = Math.abs(mitt.x - 2) < 1e-6 && mitt.y === 1;
    // en sparad by från före v518 (före v450 utan plats): rövarna blir personer på flockens plats (steg 9.2.112)
    const g = createState(6, START); SIM.rovarnaKommer(g, 1); g.people = g.people.filter(p => !p.gast); (g.rovare as unknown as { folk: unknown[] }).folk = [{ namn: 'A', sex: 'm', st: { styrka: 10, uthallighet: 10, mod: 10, smidighet: 10, skicklighet: 10 }, vapen: 'kniv', blod: 0.8 }]; g.v = 27;
    migrate(g); g.now += dt * SIM.SEC; SIM.rovarSteg(g, dt);
    const gammal = !!g.rovare && SIM.rovarna(g, g.rovare).length === 1 && SIM.rovarna(g, g.rovare).every(r => Number.isFinite(r.x) && Number.isFinite(r.y) && r.name === 'A' && SIM.gastVapen(g, r) === 'kniv');
    return [
      [`ingen rövare går fortare än en bybo (${fortast.toFixed(2)} rutor i sekunden, en bybo ${SIM.GANG.fart})`, fortast > 0.5 && fortast <= SIM.GANG.fart * 1.02],
      ['rövarna står var för sig vid rastplatsen, inte på exakt samma punkt', olika],
      ['och håller sig i en lös klunga kring den medan de rastar', klunga],
      ['ingen går ut i vattnet', torrt],
      [`gänget rastar en bit från förrådet (${lurAvst.toFixed(1)} rutor, ROVARE.lur ${SIM.ROVARE.lur}), utanför byns område (${rastUt.toFixed(1)} rutor, minst ${SIM.ROVARE.lurUt})`, vantade && Math.abs(lurAvst - SIM.ROVARE.lur) < 6 && rastUt >= SIM.ROVARE.lurUt - 1],
      [`var och en väljer själv: ${[...valde].join(', ')}`, valde.has('rasta') && valde.has('motMalet') && valde.has('ta')],
      ['sedan går de till förrådet och plundrar', framme],
      ['de som är nöjda bär hem och kommer ut ur kartan', ut],
      ['... och springer var för sig, inte på exakt samma punkt', isar],
      ['bilden följer vägen mellan punkterna', mittOk],
      ['en sparad by från före v450 får rövarna på plats', gammal],
    ];
  },
};

SCENARIER.barnrop = {
  text: 'Barnen ropar (steg 9.2.118): ett barn som har hört att rövare är nära och springer för att gömma sig ropar på vägen, så att den vuxna som barnet springer förbi och inte vet något hör larmet',
  kor: () => {
    const s = createState(6, START); klockan(s);
    for (const c of SIM.klanerOf(s)) c.inst = -60;
    const z = SIM.zoneOf(s)!, m = { x: z.x + z.w / 2, y: z.y + z.h / 2 };
    const folk = living(s), vuxen = folk.find(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen && SIM.horsel(p) >= SIM.LARM.dov);
    const barn = folk.find(p => p !== vuxen && SIM.kanGa(p));
    if (barn) barn.born = s.now - 10 * SIM.DAY; // ett barn på tio år
    if (!barn || !vuxen) return [['ett barn och en vuxen i byn', false]];
    // flocken har setts långt bort; alla utom den vuxna, som står en bit från barnets väg, och barnet är bortflyttade ur hörhåll
    const f = rovarGang(s, 2, { x: m.x + 40, y: m.y + 40 }, { anfaller: true }); f.sedd = s.now; f.gissning = 2; // gänget går mot byn, så ingen springer som bud (steg 9.2.117), men det är långt borta
    for (const p of folk) { p.larm = { t: s.now, vad: 'rovare', storlek: 2, led: 0, varnat: 1 }; p.task = undefined; } // alla vet och har redan varnat: de väljer sin roll (steg 10.1.12)
    vuxen.larm = undefined;
    // barnet väljer själv att gömma sig och springer mot sitt gömställe; den vuxna står nära gömstället, utom hörhåll från barnets start
    const hor = SIM.LARM.hor * (SIM.isLight(s.now) ? 1 : SIM.LARM.natt), spot = SIM.husPlats(s, barn) ?? SIM.skyddVidElden(s);
    const start = SIM.freeNear(s, spot.x - hor - 10, spot.y), vid = SIM.freeNear(s, spot.x - 2, spot.y + 3);
    Object.assign(barn, { x: start.x, y: start.y }); barn.task = undefined as Person['task'];
    for (const p of folk) if (p !== barn && p !== vuxen) Object.assign(p, SIM.freeNear(s, start.x, start.y)); // de andra står där barnet började, utom hörhåll från den vuxna
    Object.assign(vuxen, { x: vid.x, y: vid.y }); vuxen.task = { act: 'samla', phase: 'do', tx: vuxen.x, ty: vuxen.y, until: s.now + 4 * HOUR, carry: 0 };
    const fore = Math.hypot(barn.x - vuxen.x, barn.y - vuxen.y);
    let hort = false, gomde = false;
    for (let i = 0; i < 400 && !hort; i++) { step(s, 2); if (barn.task?.act === 'gomma') gomde = true; hort = (vuxen.larm as { vad?: string } | undefined)?.vad === 'rovare'; }
    return [
      [`${vuxen.name} står ${fore.toFixed(0)} rutor från barnet och har inte hört ropet från början`, fore > hor],
      [`${barn.name} springer för att gömma sig`, gomde],
      [`${vuxen.name} hör ${barn.name} ropa när barnet springer förbi (${s.stat?.rovarBarnRop ?? 0} rop)`, hort && (s.stat?.rovarBarnRop ?? 0) > 0],
    ];
  },
};

SCENARIER.rovarbud = {
  text: 'Budbäraren (steg 9.2.117): när en rövarflock väntar utanför byn och en vuxen som kan slåss är långt borta och inte hört ropet, springer den närmaste som har larmet och hämtar hen, och ropet sprids från budbäraren på vägen, så att den som är långt bort får larmet före anfallet',
  kor: () => {
    const s = createState(6, START); klockan(s);
    for (const c of SIM.klanerOf(s)) c.inst = -60;
    const z = SIM.zoneOf(s)!, m = { x: z.x + z.w / 2, y: z.y + z.h / 2 }, vt = SIM.vattenNu(s);
    const vuxna = living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vaktFran && SIM.ageOf(p, s.now) < SIM.ALDER.gammal && !SIM.isSick(p, s.now));
    const borta = vuxna[vuxna.length - 1];
    // hen arbetar långt bort, på land, utom hörhåll
    let plats: { x: number; y: number } | undefined;
    for (let r = 34; r < 50 && !plats; r += 2) for (let i = 0; i < 64 && !plats; i++) { const v = i * Math.PI / 32, x = Math.floor(m.x + Math.cos(v) * r), y = Math.floor(m.y + Math.sin(v) * r); if (x > 1 && y > 1 && x < SIM.W - 2 && y < SIM.H - 2 && vt[y * SIM.W + x] !== SIM.T.Vatten && !SIM.bitAt(s, x, y) && SIM.findPath(SIM.groundOf(s), m.x, m.y, x + 0.5, y + 0.5)) plats = { x: x + 0.5, y: y + 0.5 }; }
    if (!plats) return [['en plats långt bort på land', false]];
    Object.assign(borta, plats); borta.task = { act: 'samla', phase: 'do', tx: borta.x, ty: borta.y, until: s.now + 4 * HOUR, carry: 0 };
    const avstand = Math.hypot(borta.x - m.x, borta.y - m.y);
    // flocken väntar utanför byn och har setts; alla utom hen har larmet
    const f = rovarGang(s, 2, SIM.freeNear(s, m.x - (borta.x - m.x) / avstand * 22, m.y - (borta.y - m.y) / avstand * 22)); f.vantat = true; f.till = s.now + 20 * SIM.MIN; f.sedd = s.now; f.gissning = 2; // gänget rastar utanför byn och har setts
    for (const p of living(s)) if (p !== borta) { p.larm = { t: s.now, vad: 'rovare', storlek: 2, led: 0, varnat: 1 }; p.task = undefined; }
    const fore = !!borta.larm;
    let bud: string | undefined, iTid = false, budAct = false;
    korTills(s, () => !s.rovare || !!s.rovare.anfaller, 1800, () => {
      if (s.rovare?.bud && !bud) bud = byId(s, s.rovare.bud.av)?.name;
      if (living(s).some(p => p.task?.act === 'budRovare')) budAct = true;
      if (borta.larm?.vad === 'rovare' && !iTid) iTid = !!s.rovare && !s.rovare.anfaller;
    });
    return [
      [`den som arbetar ${avstand.toFixed(0)} rutor bort har inte hört ropet från början`, !fore],
      [`en budbärare springer (${bud ?? 'ingen'}) med handlingen "${SIM.ACTS.budRovare.namn}"`, !!bud && budAct],
      [`${borta.name} får larmet innan flocken anfaller (${s.stat?.rovarBudRop ?? 0} rop på vägen)`, iTid && (s.stat?.rovarBudRop ?? 0) > 0],
    ];
  },
};

SCENARIER.rovarstarkvar = {
  text: 'Steg 9.2.119, 10.1.14–10.1.15: rövarna tar ingenting medan någon står emot vid förrådet (de väljer att slåss i stället för att ta). En försvarare som står vid förrådet när gänget kommer gör att det blir strid först; när alla gömmer sig plundrar de utan strid',
  kor: () => {
    const prov = (gommer: boolean) => {
      const s = createState(6, START); klockan(s);
      for (const c of SIM.klanerOf(s)) c.inst = -60;
      const z = SIM.zoneOf(s)!, m = { x: z.x + z.w / 2, y: z.y + z.h / 2 };
      const folk = living(s), h = folk.find(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vaktFran && SIM.ageOf(p, s.now) < SIM.ALDER.gammal && !SIM.isSick(p, s.now))!;
      // alla sover långt bort i huset utom hen, som står vid förrådet och väntar med vapen (eller har gömt sig)
      for (const p of folk) { p.larm = { t: s.now, vad: 'rovare', storlek: 2, led: 0, varnat: 1 }; if (p !== h) { Object.assign(p, SIM.freeNear(s, m.x + 30, m.y + 30)); p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: s.now + 20 * HOUR, carry: 0 }; } }
      Object.assign(h, SIM.freeNear(s, m.x + 1, m.y));
      h.task = { act: gommer ? 'gomma' : 'forsvarRovare', phase: 'do', tx: h.x, ty: h.y, until: s.now + HOUR, carry: 0 };
      if (gommer) h.gavSig = s.now; // hen har nyss flytt och gömmer sig (rovarSkydd), så hen väljer inte att stå emot på nytt
      const f = rovarGang(s, 2, { x: m.x + 12, y: m.y }, { anfaller: true }); f.sedd = s.now;
      let slass = false, rovatFore = 0;
      korTills(s, () => !s.rovare || !!s.rovare.klar, 3600, () => { if (!slass && SIM.flockStrid(s, f)) { slass = true; rovatFore = s.stat?.rovat ?? 0; } });
      return { slass, rovatFore, rovat: s.stat?.rovat ?? 0, namn: h.name };
    };
    const h = prov(false), g = prov(true);
    return [
      [`${h.namn} väntar med vapen vid förrådet när flocken kommer: det blir strid`, h.slass],
      [`och inget togs innan striden började (${h.rovatFore})`, h.rovatFore === 0],
      [`gömmer sig alla plundrar rövarna utan strid (${g.rovat} saker)`, !g.slass && g.rovat > 0],
    ];
  },
};

SCENARIER.rovarrotar = {
  text: 'Steg 9.2.120, 10.1.15: plundringen går sak för sak. Rövarna går till lagerplatsen med något i och tar en sak var tolfte sekund (ROVARE.taSek), det dyraste per vikt först, tills de bär så mycket de orkar. Ingen fast tid för att rota: tiden följer bytet, så att byn hinner reagera medan de tar',
  kor: () => {
    const s = createState(6, START);
    for (const c of SIM.klanerOf(s)) c.inst = -60;
    const z = SIM.zoneOf(s)!, m = { x: z.x + z.w / 2, y: z.y + z.h / 2 };
    // en andra lagerplats utan något i, och silver (dyrt och lätt) i förrådet
    SIM.zonesOf(s).push({ ...z, x: z.x + 8, y: z.y, w: 2, h: 2, namn: 'Lagret bortom' }); SIM.touch(s);
    setAmount(s, 'silver', 30);
    for (const p of living(s)) { Object.assign(p, SIM.freeNear(s, m.x + 30, m.y + 30)); p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: s.now + 20 * HOUR, carry: 0 }; }
    const f = rovarGang(s, 2, { x: m.x + 3, y: m.y }, { anfaller: true });
    let framme = -1, forsta = -1, vid = true;
    const antalTagna = () => Object.values(f.tagit ?? {}).reduce((a, b) => a + b, 0);
    korTills(s, () => !s.rovare || !!f.klar, 3600, () => {
      const ta = SIM.rovarna(s, f).filter(r => r.gast?.gor === 'ta');
      if (ta.length && framme < 0) framme = s.now;
      for (const r of ta) if (Math.hypot(r.x - m.x, r.y - m.y) > SIM.ROVARE.nara + 0.6) vid = false;
      if (antalTagna() > 0 && forsta < 0) forsta = s.now;
    });
    const sek = (forsta - framme) / SIM.SEC, tagna = f.tagit ?? {};
    const tot = Object.values(tagna).reduce((a, b) => a + b, 0), klarSek = (s.now - framme) / SIM.SEC;
    return [
      ['rövarna står vid lagerplatsen med något i när de tar', framme > 0 && vid],
      [`den första saken tas ${sek.toFixed(1)} sekunder efter att de börjat (en sak tar ${SIM.ROVARE.taSek} sekunder)`, framme > 0 && forsta > 0 && sek >= SIM.ROVARE.taSek - 1],
      [`plundringen av ${tot} saker tar ${klarSek.toFixed(0)} sekunder: tiden följer bytet (högst en sak var ${SIM.ROVARE.taSek}:e sekund och rövare)`, tot > 2 && klarSek >= (tot / 2) * SIM.ROVARE.taSek - 1],
      [`de tar det dyraste först: silvret (${30 - amountOf(s, 'silver')} av 30)`, (tagna.silver ?? 0) > 0 && amountOf(s, 'silver') < 30],
    ];
  },
};

SCENARIER.rovarkommer = {
  text: 'Fasens balans (9.9): striden med rövarna hörs. Den som hör den och vill slåss springer dit och går in i striden när hen är framme, vakten lämnar vakten och kommer, var och en tar det bästa lediga vapnet, ingen förälder stannar hos barnen, och striden tar slut när ena sidan inte har någon kvar som slåss (högst STRID.efterTid sekunder senare)',
  kor: () => {
    const s = createState(6, START);
    for (const c of SIM.klanerOf(s)) c.inst = -60;
    const z = SIM.zoneOf(s)!, m = { x: z.x + z.w / 2, y: z.y + z.h / 2 };
    const vuxna = living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vaktFran && SIM.ageOf(p, s.now) < SIM.ALDER.gammal);
    for (const p of vuxna) p.pot.mod = 14; // alla vill slåss
    const [forst, langt, vakt] = vuxna;
    for (const p of living(s)) if (!vuxna.slice(0, 3).includes(p)) { Object.assign(p, SIM.freeNear(s, m.x + 45, m.y + 45)); p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: s.now + 20 * HOUR, carry: 0 }; }
    Object.assign(forst, SIM.freeNear(s, m.x + 1, m.y)); forst.task = { act: 'forsvarRovare', phase: 'do', tx: forst.x, ty: forst.y, until: s.now + HOUR, carry: 0 };
    Object.assign(langt, SIM.freeNear(s, m.x - 9, m.y)); langt.task = { act: 'samla', phase: 'do', tx: langt.x, ty: langt.y, until: s.now + HOUR, carry: 0 };
    Object.assign(vakt, SIM.freeNear(s, m.x, m.y - 12)); vakt.task = { act: 'vakt', phase: 'do', tx: vakt.x, ty: vakt.y, until: s.now + 8 * HOUR, carry: 0 };
    for (let i = 0; i < 3; i++) SIM.newTing(s, 'fiskespjut', 1, SIM.BYN); // vapen så att alla tre kan få ett (var och en tar det bästa lediga)
    const f = rovarGang(s, 3, { x: m.x + 8, y: m.y }, { anfaller: true }); f.sedd = s.now;
    // gänget går mot förrådet; striden börjar där de möter den som väntar, och hörs
    korTills(s, () => !!SIM.flockStrid(s, f), 600);
    const g = SIM.flockStrid(s, f), st = g?.st;
    // den som hör striden och vill slåss springer dit och går in i den när hen är framme, vakten lämnar vakten
    const kom = new Set<number>(), vapen: string[] = [];
    const titta = () => { for (const k of g?.st.kampar ?? []) if (k.sida === 0 && k.pid !== undefined && !kom.has(k.pid)) { kom.add(k.pid); vapen.push(k.vapen); } };
    titta();
    korTills(s, () => !g || g.st.slut !== undefined || (kom.has(langt.id) && kom.has(vakt.id)), 600, titta);
    korTills(s, () => !g || !!g.st.slut, 900, titta);
    const sista = st ? Math.max(0, ...st.logg.filter(r => r.h !== 'slut' && r.h !== 'borta' && r.h !== 'dod').map(r => r.t)) : 0;
    return [
      [`${langt.name}, som samlade 9 rutor bort, hörde striden och kom till`, kom.has(langt.id)],
      [`vakten ${vakt.name} lämnade vakten och kom till`, kom.has(vakt.id)],
      [`ingen bybo slåss med bara händerna (${vapen.join(', ')})`, vapen.length > 0 && !vapen.includes('hand')],
      [`striden tog slut ${st?.slut ? Math.round(st.slut.t - sista) : '–'} s efter det sista som hände (högst ${SIM.STRID.efterTid} s)`, !!st?.slut && st.slut.t - sista <= SIM.STRID.efterTid + 1 && st.slut.t < SIM.STRID.maxTid],
    ];
  },
};

SCENARIER.rovarforsvar = {
  text: 'Steg 9.2.74–9.2.80 och 9.2.116: försvaret mot rövarna. Ålder, mod och hälsa delar folket i kämpar, hjälpare (en bit bakom) och gömda. De som försvarar väntar vid förrådet ("Väntar på rövarna med vapen"), också när förrådet ligger tolv rutor från elden, och valet väger modet, rövarna mot dem som står emot, hälsan och barnen, så att de flesta friska och modiga vuxna står emot en liten flock. I striden står var och en där hen var, den som flyr springer mot sitt hus eller elden och är fri medan striden pågår, ingen står i en annan, rövarnas ledare "leder rövarna" (testknappen prövas i scenariot rovartest)',
  kor: () => {
    const s = createState(6, START);
    for (const c of SIM.klanerOf(s)) c.inst = -60;
    const z = SIM.zoneOf(s)!, m = { x: z.x + z.w / 2, y: z.y + z.h / 2 }, vt = SIM.vattenNu(s);
    // elden flyttas tolv rutor från förrådet, på land
    for (let i = 0; i < 64; i++) { const v = i * Math.PI / 32, x = Math.floor(m.x + Math.cos(v) * 12), y = Math.floor(m.y + Math.sin(v) * 12); if (x > 1 && y > 1 && x < SIM.W - 2 && y < SIM.H - 2 && vt[y * SIM.W + x] !== SIM.T.Vatten && !SIM.bitAt(s, x, y)) { s.fire.at = { x, y }; break; } }
    const eldAvst = Math.hypot(SIM.eldPlats(s).x + 0.5 - m.x, SIM.eldPlats(s).y + 0.5 - m.y);
    // ropet: rövare är nära (två). Var och en väljer i tur och ordning
    const folk = living(s);
    for (const p of folk) { p.task = undefined; p.larm = { t: s.now, vad: 'rovare', storlek: 2, led: 0, varnat: 1 }; } // alla vet och har varnat: de väljer sin roll (steg 10.1.12–10.1.13)
    for (const p of folk) { const v = SIM.vargSkydd(s, p); if (v) p.task = { act: v.act, phase: 'do', tx: v.spot?.x ?? p.x, ty: v.spot?.y ?? p.y, until: s.now + HOUR, carry: 0, why: v.why }; }
    const friska = folk.filter(p => { const a = SIM.ageOf(p, s.now); return a >= SIM.ALDER.vaktFran && a < SIM.ALDER.gammal && !SIM.isSick(p, s.now) && SIM.halsa(p) > 0.9 && SIM.stat(p, 'mod', s.now) >= 10; });
    const star = friska.filter(p => p.task?.act === 'forsvarRovare').length;
    const forsv = folk.filter(p => p.task?.act === 'forsvarRovare');
    const vidForradet = forsv.length > 0 && forsv.every(p => Math.hypot(p.task!.tx - m.x, p.task!.ty - m.y) < 4);
    const barnGommer = folk.filter(p => SIM.ageOf(p, s.now) < SIM.ALDER.vaktFran).every(p => p.task?.act === 'gomma' || (p.task?.act === 'sova' && SIM.iHus(s, p)));
    // steg 9.2.116: en lite skadad med lågt mod stannar borta, en frisk med samma mod hjälper, hjälparna står bakom kämparna
    const u = createState(6, START), uv = living(u).filter(p => SIM.ageOf(p, u.now) >= SIM.ALDER.vaktFran && SIM.ageOf(p, u.now) < SIM.ALDER.gammal && !SIM.isSick(p, u.now));
    const [lag, frisk] = uv;
    u.people = u.people.filter(p => !(p.mother === lag.id || p.father === lag.id || p.mother === frisk.id || p.father === frisk.id) || SIM.ageOf(p, u.now) >= 12); // inga små barn att stanna hos
    for (const p of living(u)) { p.task = undefined; p.larm = { t: u.now, vad: 'rovare', storlek: 2, led: 0, varnat: 1 }; }
    const modSom = (p: SIM.Person, m: number) => { p.pot.mod *= m / SIM.stat(p, 'mod', u.now); };
    modSom(lag, 1.4); modSom(frisk, 1.4); lag.health = 0.8; // modet 1,4 (0,07 i viljan, 0,12 med någon att försvara): en hjälpare när hen är frisk (ROVARE.hjalpFran och kampeFran), gömd när hen är lite skadad
    const vl = SIM.vargSkydd(u, lag), vf = SIM.vargSkydd(u, frisk);
    const kampar = folk.filter(p => p.task?.act === 'forsvarRovare'), hjalp = folk.filter(p => p.task?.act === 'hjalpaRovare');
    const medel = (q: SIM.Person[]) => q.reduce((a, p) => a + Math.hypot(p.task!.tx - m.x, p.task!.ty - m.y), 0) / Math.max(1, q.length);
    const mh = medel(hjalp), mk = medel(kampar), bakom = hjalp.length === 0 || mh > mk + 1;
    const vakenBort = folk.every(p => !/vaken vid elden/.test(p.task?.why ?? ''));
    // försvararna står på sina platser, och gänget (två) kommer till förrådet
    for (const p of forsv) { p.x = p.task!.tx; p.y = p.task!.ty; }
    for (const p of folk) if (!forsv.includes(p)) p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: s.now + 20 * HOUR, carry: 0 };
    const f = rovarGang(s, 2, { x: m.x + 12, y: m.y }, { anfaller: true }); f.sedd = s.now;
    korTills(s, () => !!SIM.flockStrid(s, f), 600);
    const g = SIM.flockStrid(s, f), emot = !!g;
    // striden börjar där sidorna möts: en bybo och en rövare är närmare varandra än ROVARE.moter när den börjar
    const sidor = (q: SIM.KartStrid) => [q.st.kampar.filter(k => k.sida === 0), q.st.kampar.filter(k => k.sida === 1)];
    const paPlats = !!g && sidor(g)[0].some(a => sidor(g)[1].some(b => Math.hypot(a.x - b.x, a.y - b.y) < SIM.ROVARE.moter + 1));
    // ingen flyttas mer än ett steg mellan två bilder (en sekund), och inga två rövare står på samma punkt
    let hopp = 0, ihop = false;
    const forra = new Map<number, { x: number; y: number }>();
    korTills(s, () => !g || !!g.st.slut, 400, () => {
      for (const k of g!.st.kampar) { if (k.lage === 'borta' || k.lage === 'dod') continue; const fr = forra.get(k.id); if (fr) hopp = Math.max(hopp, Math.hypot(k.x - fr.x, k.y - fr.y)); forra.set(k.id, { x: k.x, y: k.y }); }
      const rov = g!.st.kampar.filter(k => k.sida === 1 && (k.lage === 'strid' || k.lage === 'flykt'));
      for (let a = 0; a < rov.length; a++) for (let b = a + 1; b < rov.length; b++) if (Math.hypot(rov[a].x - rov[b].x, rov[a].y - rov[b].y) < 0.05) ihop = true;
    });
    // den som flyr är fri medan striden pågår: en feg försvarare mot fem rövare
    const t = createState(6, START); klockan(t);
    for (const c of SIM.klanerOf(t)) c.inst = -60;
    const tz = SIM.zoneOf(t)!, tm = { x: tz.x + tz.w / 2, y: tz.y + tz.h / 2 };
    const tv = living(t).filter(p => SIM.ageOf(p, t.now) >= SIM.ALDER.vaktFran && SIM.ageOf(p, t.now) < SIM.ALDER.gammal);
    for (const p of living(t)) p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: t.now + 20 * HOUR, carry: 0 };
    const [modig, feg] = tv;
    for (const [p, dx] of [[modig, 0.6], [feg, -0.6]] as const) { p.x = tm.x + dx; p.y = tm.y; p.larm = { t: t.now, vad: 'rovare', storlek: 5, led: 0, varnat: 1 }; p.task = { act: 'forsvarRovare', phase: 'do', tx: p.x, ty: p.y, until: t.now + HOUR, carry: 0 }; }
    const tf = rovarGang(t, 5, { x: tm.x + 8, y: tm.y }, { anfaller: true }); tf.sedd = t.now;
    korTills(t, () => !!SIM.flockStrid(t, tf), 600);
    const tg = SIM.flockStrid(t, tf);
    if (tg) for (const k of tg.st.kampar) { if (k.pid === feg.id) { k.st.mod = 0; k.modNu = -1; } if (k.pid === modig.id) { k.st.mod = 20; k.modNu = 3; } } /* modet just nu räknades när striden började */
    let fri = false, gick = false, ledText = '';
    const f0 = { x: feg.x, y: feg.y };
    korTills(t, () => !tg || (fri && gick) || !!tg.st.slut, 600, () => {
      if (tg?.fri?.includes(feg.id) && !tg.st.slut) { fri = !feg.task || feg.task.act !== 'strid' || feg.task.until <= t.now; gick = Math.hypot(feg.x - f0.x, feg.y - f0.y) > 1; } // hen står där hen sprang, och striden pågår
    });
    if (tg) { const st = tg.st, r = st.logg.find(q => q.h === 'leder' && st.kampar.find(k => k.id === q.a)?.sida === 1); ledText = r ? SIM.stridText(st, r) : ''; }
    return [
      [`handlingen heter "${SIM.ACTS.forsvarRovare.namn}"`, SIM.ACTS.forsvarRovare.namn === 'Väntar på rövarna med vapen'],
      [`elden ligger ${eldAvst.toFixed(1)} rutor från förrådet`, eldAvst > 10],
      [`de som försvarar (${forsv.length}) väntar vid förrådet, inte vid elden`, vidForradet],
      [`de flesta friska och modiga vuxna står emot en liten flock (${star} av ${friska.length})`, friska.length > 0 && star * 2 > friska.length],
      ['barnen gömmer sig', barnGommer],
      [`de friska vuxna strider (${star} av ${friska.length}), ingen håller sig vaken vid elden`, friska.length > 0 && star === friska.length && vakenBort],
      [`en lite skadad med lågt mod stannar borta (${vl?.act}, ${vl?.why}) men en frisk med samma mod hjälper (${vf?.act})`, vl?.act === 'gomma' && vf?.act === 'hjalpaRovare'],
      [`hjälparna (${hjalp.length}) står längre från förrådet (${mh.toFixed(1)} rutor) än kämparna (${mk.toFixed(1)})`, bakom],
      ['byn står emot vid förrådet: striden börjar', emot],
      ['striden börjar där sidorna möts', paPlats],
      [`ingen flyttas mer än ett steg mellan två bilder (längst ${hopp.toFixed(2)} rutor på en sekund)`, hopp <= SIM.GANG.fart * 2 + 0.5],
      ['inga två rövare står på samma punkt', !ihop],
      ['den som flytt är fri och går vidare medan striden pågår', fri && gick],
      [`rövarnas ledare "leder rövarna": "${ledText}"`, /leder rövarna/.test(ledText)],
    ];
  },
};

SCENARIER.rovartest = {
  text: 'Steg 10.1.9–10.1.16: testknappen skickar ett gäng som går som ett vanligt gäng ur kartans kant till rastplatsen utanför byns område, och bara väntan där är kortare (en minut i stället för kvarten eller halvtimmen). Rastplatsen ligger utanför byns område också för en vanlig flock. En flock som kommit in i byns område ses av dem som har den inom synhåll och larmet sprids därifrån, och de som vågar går mot flocken så att striden börjar där de möts. Den som kommer nära en flock som rastar utanför byn ser den och får larmet. Prövas i en stor by (by 42 efter 50 dygn)',
  kor: () => {
    const { ROVARE, MIN, SEC, HOUR, utanforByn } = SIM;
    // en stor by
    // by 42 efter 50 dygn, sparad för det här scenariot (facit byter sina byar när testerna ändras)
    const stor = () => { const s = lasBy('test/rovarby.json.gz'); klockan(s); for (const c of SIM.klanerOf(s)) c.inst = -60; for (const p of living(s)) p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: s.now + 8 * HOUR, carry: 0 }; return s; };
    const ut = (x: State, f: { x: number; y: number }) => utanforByn(x, f.x, f.y);
    // ett gäng från kanten till rastplatsen och anfallet: hur långt ute rastplatsen ligger, hur länge de väntar och när de går till anfall
    const forlopp = (x: State, f: SIM.Rovarflock) => {
      const t0 = x.now, kant = f.x < 1 || f.y < 1 || f.x > SIM.W - 1 || f.y > SIM.H - 1;
      let rastUt = -1, vantMin = -1, anfall = -1;
      korTills(x, () => !x.rovare || !!f.anfaller, 7200, () => { if (f.vantat && vantMin < 0) { rastUt = f.rast ? ut(x, f.rast) : -1; vantMin = (f.till - x.now) / MIN; } });
      if (f.anfaller) anfall = (x.now - t0) / SEC;
      return { kant, rastUt, vantMin, anfall };
    };
    // testknappen
    const u = stor(), svar = SIM.skickaRovare(u, 3), uf = u.rovare!, tf = forlopp(u, uf);
    // en vanlig flock i samma by: samma väg, men den väntar längre
    const v = stor();
    SIM.rovarnaKommer(v, 3); const vf = v.rovare!, vv = forlopp(v, vf);
    // anfallsläget: en flock som kommit in i byns område, 8–14 rutor från förrådet
    const a = stor(), am = SIM.malet(a), avt = SIM.vattenNu(a);
    let ap: { x: number; y: number } | undefined;
    for (let r = 8; r <= 14 && !ap; r++) for (let i = 0; i < 32 && !ap; i++) { const w = i * Math.PI / 16, x = Math.floor(am.x + Math.cos(w) * r), y = Math.floor(am.y + Math.sin(w) * r); if (x > 1 && y > 1 && x < SIM.W - 2 && y < SIM.H - 2 && avt[y * SIM.W + x] !== SIM.T.Vatten && !SIM.bitAt(a, x, y) && !SIM.isWall(a, x, y) && utanforByn(a, x + 0.5, y + 0.5) <= 0) ap = { x: x + 0.5, y: y + 0.5 }; }
    const alla = living(a), nara = alla.filter(p => SIM.ageOf(p, a.now) >= SIM.ALDER.vaktFran).sort((p, q) => Math.hypot(p.x - ap!.x, p.y - ap!.y) - Math.hypot(q.x - ap!.x, q.y - ap!.y));
    // den närmaste vuxna är vaken och står vid förrådet med vapen; de andra sover
    const [vaken] = nara;
    Object.assign(vaken, SIM.freeNear(a, ap!.x - 5, ap!.y)); vaken.task = { act: 'forsvarRovare', phase: 'do', tx: vaken.x, ty: vaken.y, until: a.now + HOUR, carry: 0 };
    const af = rovarGang(a, 2, ap!, { anfaller: true });
    const fplats = { x: af.x, y: af.y }, fran = Math.hypot(fplats.x - am.x, fplats.y - am.y);
    SIM.step(a, SIM.nastaSteg(a));
    const iByn = !!af.anfall;
    const sag = vaken.larm?.vad === 'rovare' && af.sedd !== undefined;
    // larmet sprids från den som ser: efter en stund har fler fått det, och de som sover och kan slåss väcks av den som varnar
    korTills(a, () => !!SIM.flockStrid(a, af) || !a.rovare, 600);
    const larm = alla.filter(p => p.larm?.vad === 'rovare').length;
    const g = SIM.flockStrid(a, af);
    const striden = !!g && g.st.kampar.some(k => k.pid === vaken.id) && g.st.kampar.some(k => k.sida === 1);
    const motFlocken = !!g && g.st.kampar.filter(k => k.sida === 1).every(k => Math.hypot(k.x - am.x, k.y - am.y) > ROVARE.nara + 0.5); // de har inte hunnit till förrådet: striden börjar på vägen dit
    // den som kommer nära en flock som rastar utanför byn (steg 10.1.11): en vuxen går förbi och ser den
    const b = createState(6, START), bm = SIM.malet(b), bvt = SIM.vattenNu(b); klockan(b);
    for (const p of living(b)) p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: b.now + 20 * HOUR, carry: 0 };
    const gar = living(b).find(p => SIM.ageOf(p, b.now) >= 18 && SIM.ageOf(p, b.now) < SIM.ALDER.gammal)!;
    const land = (x: number, y: number) => x > 1 && y > 1 && x < SIM.W - 2 && y < SIM.H - 2 && bvt[Math.floor(y) * SIM.W + Math.floor(x)] !== SIM.T.Vatten && !SIM.bitAt(b, Math.floor(x), Math.floor(y)) && !SIM.isWall(b, Math.floor(x), Math.floor(y));
    let bv = 0, bp: { x: number; y: number } | undefined;
    for (let i = 0; i < 32 && !bp; i++) { bv = i * Math.PI / 16; for (let r = 6; r < 40 && !bp; r++) { const x = Math.floor(bm.x + Math.cos(bv) * r) + 0.5, y = Math.floor(bm.y + Math.sin(bv) * r) + 0.5; if (utanforByn(b, x, y) >= 8 && land(x, y) && land(x - Math.cos(bv) * 10, y - Math.sin(bv) * 10) && land(x + Math.cos(bv) * 8, y + Math.sin(bv) * 8)) bp = { x, y }; } }
    const bf = rovarGang(b, 3, bp!); bf.vantat = true; bf.till = b.now + 60 * MIN;
    gar.x = bp!.x - Math.cos(bv) * 10; gar.y = bp!.y - Math.sin(bv) * 10; delete gar.larm;
    gar.task = { act: 'bara', phase: 'go', tx: bp!.x + Math.cos(bv) * 8, ty: bp!.y + Math.sin(bv) * 8, until: b.now + HOUR, carry: 0, why: 'går förbi' };
    let fickLarm = -1;
    for (let i = 0; i < 90 && b.rovare; i++) {
      SIM.step(b, 1);
      if (fickLarm < 0 && (gar as Person).larm?.vad === 'rovare') fickLarm = Math.min(...(b.rovare ? SIM.rovarna(b, b.rovare) : []).map(r => Math.hypot(r.x - gar.x, r.y - gar.y)));
    }
    return [
      [`byn är stor (${SIM.omrade(u).n} rutor i området)`, SIM.omrade(u).n > 200],
      [`testknappen: "${svar.text}"`, svar.ok && uf.test === true],
      [`gänget från testknappen kommer in från kartans kant, som ett vanligt gäng`, tf.kant && uf.test === true],
      [`rastplatsen ligger ${tf.rastUt.toFixed(1)} rutor utanför byns område (minst ${ROVARE.lurUt}), och de väntar där ${tf.vantMin.toFixed(1)} minuter (ROVARE.testVanta ${ROVARE.testVanta})`, tf.rastUt >= ROVARE.lurUt - 1 && Math.abs(tf.vantMin - ROVARE.testVanta) < 0.01],
      [`de går till anfall ${tf.anfall.toFixed(0)} sekunder efter att de kom in (vägen från kanten och en minuts väntan, i femminuterssteg: högst tjugo minuter)`, tf.anfall > 0 && tf.anfall <= 1200],
      [`en vanlig flock går samma väg: in från kanten (${vv.kant ? 'ja' : 'nej'}), rastplatsen ${vv.rastUt.toFixed(1)} rutor utanför byns område`, vv.kant && vv.rastUt >= ROVARE.lurUt - 1],
      [`... men väntar ${vv.vantMin.toFixed(1)} minuter (ROVARE.lurMin ${ROVARE.lurMin[0]}–${ROVARE.lurMin[1]}), inte en`, vv.vantMin >= ROVARE.lurMin[0] - 0.01 && vv.vantMin <= ROVARE.lurMin[1] + 0.01],
      [`anfallsläget: flocken står ${fran.toFixed(1)} rutor från förrådet, inne i byns område`, !!ap && fran >= 6 && iByn],
      [`... den som står vid förrådet ser den och får larmet (${sag ? 'ja' : 'nej'})`, sag],
      [`... larmet sprids: ${larm} av ${alla.length} har det när striden börjar`, larm > 1],
      [`... striden börjar mellan den som står emot och flocken, innan flocken hunnit till förrådet`, striden && motFlocken],
      [`den som går förbi flocken får larmet ${fickLarm.toFixed(1)} rutor från den, och gör något annat: "${gar.task?.why ?? 'inget'}"`, fickLarm > 0 && fickLarm <= ROVARE.folkSer + 1 && gar.task?.why !== 'går förbi'],
    ];
  },
};

SCENARIER.rovarfackla = {
  text: 'Facklan på natten (steg 10.1.10, rovare.ts, ljus.ts): på natten håller minst en rövare i gänget en tänd fackla, ett ting hen äger, som lyser som andra facklor, och därför syns gänget på längre håll än i mörker utan fackla (ROVARE.fackelSer mot ROVARE.nattSer). På dagen är facklan släckt, och när det blir dag släcks den. Ett gäng går aldrig ut utan en fackla.',
  kor: () => {
    const { ROVARE, HOUR } = SIM;
    const sov = (s: State) => { for (const c of SIM.klanerOf(s)) c.inst = -60; for (const p of living(s)) p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: s.now + 20 * HOUR, carry: 0 }; };
    const fackla = (s: State, f: SIM.Rovarflock) => (s.gastTing ?? []).filter(t => t.k === 'fackla' && f.folk.includes(t.agare));
    // en natt: gänget kommer in från kanten
    const n = createState(6, START); klockan(n, 2); sov(n);
    const nattMork = SIM.lightLevel(n.now) <= 0;
    const nf = rovarGang(n, 4);
    SIM.rovarSteg(n, 1);
    const tand = fackla(n, nf).filter(t => t.tand !== undefined);
    const minstEn = tand.length >= 1 && SIM.facklaTand(n, nf) && tand.every(t => t.tand === t.agare);
    const raknare = (n.stat?.rovarFackla ?? 0) >= 1;
    const bar = SIM.rovarna(n, nf).find(r => r.id === tand[0]?.agare);
    const lyser = !!bar && SIM.ljusAt(n, bar.x, bar.y) > 0;
    // med facklan syns gänget längre än utan, i samma mörker (förhållandet är fackelSer mot nattSer)
    const q = living(n)[0];
    const medFackla = SIM.synhall(n, nf, q);
    for (const t of tand) t.tand = undefined;
    const utanFackla = SIM.synhall(n, nf, q);
    for (const t of tand) t.tand = t.agare;
    const langre = medFackla > utanFackla && Math.abs(medFackla / utanFackla - ROVARE.fackelSer / ROVARE.nattSer) < 1e-9;
    // den som står mellan de två avstånden ser gänget med facklan men skulle inte sett det utan den
    const d = (medFackla + utanFackla) / 2;
    const s = cloneState(n), f = s.rovare!, fo = SIM.rovarna(s, f), x0 = fo[0].x, y0 = fo[0].y;
    for (const r of fo) { r.x = x0; r.y = y0; }
    const p = living(s)[0]; delete p.larm; p.x = x0 + d; p.y = y0; p.task = { act: 'samla', phase: 'do', tx: p.x, ty: p.y, until: s.now + HOUR, carry: 0 };
    SIM.rovarSteg(s, 1);
    const ser = (p as Person).larm?.vad === 'rovare' && d > utanFackla && d < medFackla;
    // på dagen är facklan släckt, och när det blir dag släcks den (tinget finns kvar: ett gäng går aldrig ut utan en fackla)
    const dag = createState(6, START); klockan(dag, 12); sov(dag);
    const df = rovarGang(dag, 4); SIM.rovarSteg(dag, 1);
    const dagSlackt = !SIM.facklaTand(dag, df);
    n.now = new Date(n.now).setHours(10, 0, 0, 0);
    SIM.rovarSteg(n, 1);
    const slacks = !SIM.facklaTand(n, nf) && fackla(n, nf).length >= 1 && fackla(n, nf).every(t => t.tand === undefined);
    return [
      ['det är natt (inget dagsljus)', nattMork],
      [`på natten håller minst en rövare en tänd fackla (${tand.length} av ${nf.folk.length}) som hen själv äger`, minstEn],
      ['räknaren rovarFackla går upp när facklan tänds', raknare],
      ['facklan lyser som andra facklor (ljusAt vid bäraren)', lyser],
      [`gänget syns längre med facklan (${medFackla.toFixed(1)} rutor) än utan (${utanFackla.toFixed(1)}), i förhållandet fackelSer mot nattSer`, langre],
      [`den som står ${d.toFixed(1)} rutor från gänget på natten ser det tack vare facklan`, ser],
      ['på dagen är facklan släckt', dagSlackt],
      ['när det blir dag släcks den, men tinget finns kvar', slacks],
    ];
  },
};

SCENARIER.rovarsyn = {
  text: 'Att se faran (steg 10.1.11, rovare.ts): var och en som är vaken och har ett rövare inom synhåll ser gänget och får larmet: vanligt folk på ROVARE.folkSer rutor, den som håller vakt på ROVARE.vaktSer, kortare i dimma och i mörker, men som på dagen när gänget har en tänd fackla. Den som sover ser inget. Den som ser dem och är utanför byn varnar och springer sedan hem. Den som är långt borta vet ingenting förrän hen själv ser dem eller hör larmet, som sprids led för led från den som varnar.',
  kor: () => {
    const { ROVARE, HOUR } = SIM;
    const ny = (timme = 12) => { const s = createState(6, START); klockan(s, timme); for (const c of SIM.klanerOf(s)) c.inst = -60; for (const p of living(s)) p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: s.now + 20 * HOUR, carry: 0 }; return s; };
    const x0 = 10.5, y0 = 20.5;
    // en person på avstånd fas × synhållet från gänget (eller så långt som fas anger), vaken och gör något annat. Svarar om hen ser det.
    // Gänget står på en punkt, och facklan (på natten) tänds i ett första steg innan avståndet räknas
    const prov = (s: State, fas: number | ((syn: number) => number), akt: 'samla' | 'vakt' | 'sova' = 'samla') => {
      const f = rovarGang(s, 3, { x: x0, y: y0 }), p = living(s)[0];
      SIM.rovarSteg(s, 1);
      for (const r of SIM.rovarna(s, f)) { r.x = x0; r.y = y0; }
      p.x = x0 + 5; p.y = y0; p.task = { act: akt, phase: 'do', tx: p.x, ty: p.y, until: s.now + 20 * HOUR, carry: 0 }; delete p.larm;
      const syn = SIM.synhall(s, f, p), d = typeof fas === 'number' ? syn * fas : fas(syn);
      p.x = x0 + d; p.task.tx = p.x;
      SIM.rovarSteg(s, 1);
      return { ser: (p as Person).larm?.vad === 'rovare', syn, d, f, p };
    };
    // dag: folk ser på folkSer rutor, vakten längre, den som sover ser inget
    const d0 = prov(ny(12), 0.7), d1 = prov(ny(12), 1.4), dv = prov(ny(12), 0.95, 'vakt'), dn = prov(ny(12), 0.2, 'sova');
    const vaktLangre = dv.syn > d0.syn;
    const dagSyn = d0.ser && !d1.ser && dv.ser && vaktLangre && !dn.ser;
    // natt: gänget har en tänd fackla och syns därför som på dagen
    const natt = ny(2), nn = prov(natt, 0.7), nl = prov(ny(2), 1.4);
    const nattSyn = SIM.lightLevel(natt.now) <= 0 && nn.ser && !nl.ser && nn.syn > ROVARE.folkSer * ROVARE.nattSer * 1.5;
    // dimma: samma avstånd ses i klart väder men inte i dimman
    const hitta = (ok: (s: State) => boolean) => { const s = ny(7); for (let i = 0; i < 24 * 60 && !(ok(s) && SIM.lightLevel(s.now) > 0); i++) s.now += HOUR; return ok(s) && SIM.lightLevel(s.now) > 0 ? s : undefined; };
    const dimS = hitta(s => SIM.vaderNu(s).dimma > 0.3), klarS = hitta(s => SIM.vaderNu(s).dimma === 0);
    let dimmaOk = false, dimDim = 0;
    if (dimS && klarS) {
      for (const p of living(dimS)) p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: dimS.now + 20 * HOUR, carry: 0 };
      for (const p of living(klarS)) p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: klarS.now + 20 * HOUR, carry: 0 };
      dimDim = SIM.vaderNu(dimS).dimma;
      const dd = prov(dimS, syn => (syn + ROVARE.folkSer) / 2), kk = prov(klarS, () => dd.d);
      dimmaOk = dd.syn < kk.syn && !dd.ser && kk.ser;
    }
    // den som är utanför byn och ser dem varnar och springer sedan hem (en som inte vågar möta dem)
    const u = ny(12), uf = rovarGang(u, 3, { x: x0, y: y0 }), up = living(u)[0];
    up.x = x0 + 8; up.y = y0; up.health = 0.7; up.pot.mod = 1; up.task = { act: 'samla', phase: 'do', tx: up.x, ty: up.y, until: u.now + 20 * HOUR, carry: 0 };
    for (const q of living(u)) if (q !== up) q.larm = { t: u.now, vad: 'rovare', storlek: 3, led: 1, varnat: 1 }; // alla andra vet redan: ingen springer som bud
    const hem = SIM.husPlats(u, up) ?? SIM.skyddVidElden(u), avByn = SIM.utanforByn(u, up.x, up.y), fore = Math.hypot(up.x - hem.x, up.y - hem.y);
    SIM.rovarSteg(u, 1);
    const sag = up.larm?.vad === 'rovare';
    let varnade = false;
    korTills(u, () => up.task?.act === 'gomma', 60, () => { if (up.task?.act === 'varna') varnade = true; });
    const gomde = up.task?.act === 'gomma' && Math.hypot(up.task.tx - hem.x, up.task.ty - hem.y) < 3;
    korTills(u, () => Math.hypot(up.x - hem.x, up.y - hem.y) < 3, 900);
    const hemat = Math.hypot(up.x - hem.x, up.y - hem.y) < 3 && uf.folk.length === 3;
    // den som är långt borta vet ingenting förrän hen själv ser dem eller hör larmet: en rad med 25 rutor emellan, som larmet sprids längs
    const r = ny(12); rovarGang(r, 3, { x: x0, y: y0 });
    const vux = (s: State) => living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vaktFran && SIM.ageOf(p, s.now) < SIM.ALDER.gammal && !SIM.isSick(p, s.now)); /* vuxna som kan slåss väcks av larmet */
    const rad = vux(r).slice(0, 4);
    const luckor = [9, 34, 59, 84];
    rad.forEach((p, i) => { p.x = x0 + luckor[i]; p.y = y0; p.task = { act: 'samla', phase: 'do', tx: p.x, ty: p.y, until: r.now + 20 * HOUR, carry: 0 }; delete p.larm; });
    for (const p of living(r)) if (!rad.includes(p)) { p.x = x0 + 150; p.y = y0; } // de sover långt bort
    const ingenInnan = rad.slice(1).every(p => !p.larm);
    SIM.rovarSteg(r, 1);
    const baraForsta = !!rad[0].larm && rad.slice(1).every(p => !p.larm);
    // larmet sprids: de andra i raden sover och väcks av den som varnar, och varnar själva vidare (hörhåll 30 rutor, 25 emellan)
    const k = ny(12); rovarGang(k, 3, { x: x0, y: y0 });
    const kad = vux(k).slice(0, 4);
    kad.forEach((p, i) => { p.x = x0 + luckor[i]; p.y = y0; p.task = { act: i ? 'sova' : 'samla', phase: 'do', tx: p.x, ty: p.y, until: k.now + 20 * HOUR, carry: 0 }; delete p.larm; });
    for (const p of living(k)) if (!kad.includes(p)) { p.x = x0 + 150; p.y = y0; }
    korTills(k, () => kad.every(p => p.larm?.vad === 'rovare'), 1800); /* ett led per steg, och stegen är fem minuter när faran inte är nära */
    const led = kad.map(p => p.larm?.led ?? -1);
    const ledvis = kad.every(p => p.larm?.vad === 'rovare') && led.every((l, i) => l === i);
    return [
      [`dag: den som är vaken ser gänget inom ${d0.syn.toFixed(0)} rutor (ser på ${d0.d.toFixed(1)}, inte på ${d1.d.toFixed(1)}), vakten längre (${dv.syn.toFixed(0)} rutor), och den som sover ser inget`, dagSyn],
      [`natt: gänget har en tänd fackla och syns på ${nn.syn.toFixed(0)} rutor, ses på ${nn.d.toFixed(1)} men inte på ${nl.d.toFixed(1)}`, nattSyn],
      [`dimma (${dimDim.toFixed(2)}): ett avstånd som ses i klart väder ses inte i dimman`, dimmaOk],
      [`den som är ${avByn.toFixed(0)} rutor utanför byns område ser dem på 8 rutor och får larmet`, sag],
      ['... varnar först (4 sekunder) ...', varnade],
      [`... gömmer sig sedan hemma, ${fore.toFixed(0)} rutor bort ("${up.task?.why ?? ''}")`, gomde],
      ['... och springer hem, bort från gänget', hemat],
      ['den som är långt borta vet ingenting innan någon ser gänget', ingenInnan],
      ['... bara den som ser dem har larmet först', baraForsta],
      [`... sedan sprids larmet led för led längs raden (led ${led.join(', ')})`, ledvis],
    ];
  },
};

SCENARIER.rovarmote = {
  text: 'Anfallet och mötet (steg 10.1.14, rovare.ts, kartstrid.ts): striden börjar där sidorna möts, när en rövare och en som står emot kommer närmare varandra än ROVARE.moter rutor; den som står emot och ser rövare inom ROVARE.ser går mot dem. Den som kommer till ger sig in i samma strid. Om en rövare flyr avgörs av poängen för att fly (ROVARHANDLINGAR.fly): blodet hen förlorat, övermakten hen ser och hur stor del av gänget som är borta, mot poängen för att slåss, och inte av någon fast gräns. Den som flyr lämnar striden och går mot kanten.',
  kor: () => {
    const { ROVARE, HOUR } = SIM;
    const ny = () => { const s = createState(6, START); klockan(s); for (const c of SIM.klanerOf(s)) c.inst = -60; for (const p of living(s)) p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: s.now + 20 * HOUR, carry: 0 }; return s; };
    const vuxna = (s: State) => living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vaktFran && SIM.ageOf(p, s.now) < SIM.ALDER.vaktTill);
    const stall = (s: State, p: Person, x: number, y: number, act: Act = 'forsvarRovare') => { Object.assign(p, SIM.freeNear(s, x, y)); p.pot.mod = 14; p.larm = { t: s.now, vad: 'rovare', storlek: 3, led: 0, varnat: 1 }; p.task = { act, phase: 'do', tx: p.x, ty: p.y, until: s.now + 4 * HOUR, carry: 0 }; };
    // mötet: en försvarare står vid förrådet, tolv rutor från gänget som kommer; en till står en bit bakom
    const s = ny(), z = SIM.zoneOf(s)!, m = { x: z.x + z.w / 2, y: z.y + z.h / 2 };
    const [a, b] = vuxna(s);
    stall(s, a, m.x, m.y); stall(s, b, m.x - 6, m.y);
    for (let i = 0; i < 3; i++) SIM.newTing(s, 'fiskespjut', 1, SIM.BYN);
    const f = rovarGang(s, 3, { x: m.x + 12, y: m.y }, { anfaller: true }); f.sedd = s.now;
    const a0 = { x: a.x, y: a.y };
    const forstridMot = Math.min(...SIM.rovarna(s, f).map(r => Math.hypot(r.x - a.x, r.y - a.y)));
    korTills(s, () => !!SIM.flockStrid(s, f), 600);
    const g = SIM.flockStrid(s, f)!;
    const bybo = g.st.kampar.filter(k => k.sida === 0), rov = g.st.kampar.filter(k => k.sida === 1);
    const narmast = Math.min(...bybo.flatMap(x => rov.map(y => Math.hypot(x.x - y.x, x.y - y.y))));
    const motet = !!g && narmast < ROVARE.moter + 1 && forstridMot > ROVARE.moter + 1;
    const gick = Math.hypot(a.x - a0.x, a.y - a0.y) > 2; // den som stod emot gick mot dem, och striden började inte vid förrådet
    // den som kommer till ger sig in i samma strid
    let kom = false;
    korTills(s, () => !!g.st.slut || kom, 300, () => { if (g.st.kampar.some(k => k.pid === b.id)) kom = true; });
    const medStat = (s.stat?.kartStridMed ?? 0) >= 1;
    // om rövarna vänder avgörs av poängen: blodet och övermakten, och modet, mot poängen för att slåss
    const ctx = (blod: number, hot: number, mod: number, kvar = 3, flytt = false) => {
      const r = { blod, pot: { mod }, thoughts: [], skill: {}, born: 0, gast: { sort: 'rovare', flytt } } as unknown as Person;
      return { s, f, r, folk: [], dt: 1, mal: m, fiende: a, ivagen: undefined, hot, last: 0, kvar } as unknown as Parameters<typeof SIM.ROVARHANDLINGAR.fly.poang>[0];
    };
    const fly = (blod: number, hot: number, mod = 10, kvar = 3) => SIM.ROVARHANDLINGAR.fly.poang(ctx(blod, hot, mod, kvar));
    const sla = (blod: number, hot: number, mod = 10) => SIM.ROVARHANDLINGAR.sla.poang(ctx(blod, hot, mod));
    const blodet = fly(0.4, 1) > fly(1, 1), hotet = fly(1, 3) > fly(1, 1), modet = fly(1, 3, 6) > fly(1, 3, 16), flocken = fly(1, 1, 10, 1) > fly(1, 1, 10, 3);
    const frisk = fly(1, 1.2) < sla(1, 1.2), slagen = fly(0.3, 3.5, 8, 1) > sla(0.3, 3.5, 8);
    // ... och i spelet: friska rövare med en försvarare framför sig går in i striden, skadade rövare med fyra framför sig vänder innan de möts
    const prov = (blod: number, forsvarare: number) => {
      const q = ny(), qz = SIM.zoneOf(q)!, qm = { x: qz.x + qz.w / 2, y: qz.y + qz.h / 2 }, qv = vuxna(q).slice(0, forsvarare);
      for (let i = 0; i < forsvarare + 3; i++) SIM.newTing(q, 'fiskespjut', 1, SIM.BYN);
      qv.forEach((p, i) => stall(q, p, qm.x + (i % 3) * 0.6, qm.y + Math.floor(i / 3) * 0.6));
      const qf = rovarGang(q, 3, { x: qm.x + 10, y: qm.y }, { anfaller: true }); qf.sedd = q.now;
      for (const r of SIM.rovarna(q, qf)) r.blod = blod;
      korTills(q, () => !!SIM.flockStrid(q, qf) || SIM.rovarna(q, qf).every(r => r.gast?.flytt), 600);
      const strid = !!SIM.flockStrid(q, qf), flyr = SIM.rovarna(q, qf).filter(r => r.gast?.flytt).length;
      return { strid, flyr };
    };
    const modiga = prov(1, 1), skadade = prov(0.45, 4);
    return [
      [`striden börjar där sidorna möts: närmast ${narmast.toFixed(1)} rutor mellan en bybo och en rövare, och gänget var ${forstridMot.toFixed(1)} rutor bort när det började`, motet],
      [`den som stod emot gick mot dem (${Math.hypot(a.x - a0.x, a.y - a0.y).toFixed(1)} rutor från förrådet)`, gick],
      [`${b.name}, som stod en bit bakom, ger sig in i striden när hen kommer fram`, kom && medStat],
      [`att fly väger blodet som är förlorat (${fly(0.4, 1).toFixed(2)} mot ${fly(1, 1).toFixed(2)})`, blodet],
      [`... övermakten (${fly(1, 3).toFixed(2)} mot ${fly(1, 1).toFixed(2)})`, hotet],
      [`... modet (${fly(1, 3, 6).toFixed(2)} för den räddare mot ${fly(1, 3, 16).toFixed(2)})`, modet],
      [`... och hur många i gänget som är kvar (${fly(1, 1, 10, 1).toFixed(2)} mot ${fly(1, 1, 10, 3).toFixed(2)})`, flocken],
      [`en frisk rövare med få emot väljer att slåss (${sla(1, 1.2).toFixed(2)} mot ${fly(1, 1.2).toFixed(2)})`, frisk],
      [`en skadad rövare med många emot vänder (${fly(0.3, 3.5, 8, 1).toFixed(2)} mot ${sla(0.3, 3.5, 8).toFixed(2)})`, slagen],
      [`i spelet: friska rövare mot en försvarare slåss (strid ${modiga.strid ? 'ja' : 'nej'}, ${modiga.flyr} flyr), skadade mot fyra vänder innan de möts (strid ${skadade.strid ? 'ja' : 'nej'}, ${skadade.flyr} av 3 flyr)`, modiga.strid && modiga.flyr === 0 && !skadade.strid && skadade.flyr === 3],
    ];
  },
};

SCENARIER.rovarstrid = {
  text: 'Striden med rövarna på kartan (steg 6.6.10, 10.1.14, rovare.ts, kartstrid.ts): striden börjar där sidorna möts, nära förrådet, och går i spelets tid, steg för steg. Den som kommer fram under striden ger sig in i den, rövarna står där striden har dem, och när den är slut skrivs rapporten i byn. Byn går i korta steg medan faran är nära, så att ett långt steg och många korta ger samma utfall.',
  kor: () => {
    const s = createState(6, START); klockan(s);
    for (const c of SIM.klanerOf(s)) c.inst = -60;
    const z = SIM.zoneOf(s)!, m = { x: z.x + z.w / 2, y: z.y + z.h / 2 };
    const vuxna = living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vaktFran && SIM.ageOf(p, s.now) < SIM.ALDER.vaktTill);
    for (const p of living(s)) p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: s.now + 20 * HOUR, carry: 0 };
    const [a, b, c] = vuxna;
    for (const p of [a, b]) { Object.assign(p, SIM.freeNear(s, m.x + 0.5, m.y)); p.larm = { t: s.now, vad: 'rovare', storlek: 3, led: 0, varnat: 1 }; p.task = { act: 'forsvarRovare', phase: 'do', tx: p.x, ty: p.y, until: s.now + HOUR, carry: 0 }; }
    // en till står en bit bort och kommer fram under striden
    Object.assign(c, SIM.freeNear(s, m.x - 5, m.y)); c.larm = { t: s.now, vad: 'rovare', storlek: 3, led: 0, varnat: 1 }; c.task = { act: 'forsvarRovare', phase: 'do', tx: c.x, ty: c.y, until: s.now + HOUR, carry: 0 };
    for (const p of vuxna.slice(0, 3)) p.pot.mod = 14;
    const f = rovarGang(s, 3, { x: m.x + 9, y: m.y }, { anfaller: true }); f.sedd = s.now;
    korTills(s, () => !!SIM.flockStrid(s, f), 600);
    const g = SIM.flockStrid(s, f), st = g?.st;
    const borjar = !!g && a.task?.act === 'strid' && b.task?.act === 'strid' && (s.stat?.rovarStrid ?? 0) === 1 && g.st.kampar.some(k => k.sida === 1);
    // samma strid med ett långt steg (300 s) och med korta (1 s): byn delar upp steget själv medan faran är nära
    const lang = cloneState(s), kort = cloneState(s);
    let mitt = false, nara = true, slag = false, kom = false;
    korTills(s, () => !g || !!g.st.slut, 900, () => {
      if (!g!.st.slut) mitt = true;
      for (const r of SIM.rovarna(s, f)) if (Math.hypot(r.x - m.x, r.y - m.y) > SIM.ROVARE.motR + 4) nara = false;
      if (g!.st.kampar.some(k => k.pid === c.id)) kom = true;
      if (g!.st.logg.some(r => (r.h === 'traff' || r.h === 'miss' || r.h === 'tog') && r.a !== undefined && r.b !== undefined && g!.st.kampar.find(k => k.id === r.a)!.sida !== g!.st.kampar.find(k => k.id === r.b)!.sida)) slag = true;
    });
    const rapport = s.stridRapporter?.[s.stridRapporter.length - 1];
    const slut = !!st?.slut && !SIM.kartStrider(s).includes(g!) && !!rapport && /rövare/.test(rapport.orsak) && rapport.vinnare === st.slut.vinnare && !SIM.kartStridAv(s, c);
    const gl = SIM.flockStrid(lang, lang.rovare!)!, gk = SIM.flockStrid(kort, kort.rovare!)!;
    for (let i = 0; i < 4; i++) SIM.step(lang, 300);
    for (let i = 0; i < 1200; i++) SIM.step(kort, 1);
    /* striden själv, när den tog slut: vem som vann, när, och hur var och en mådde (det som händer efteråt räknas inte) */
    const utfall = (q: SIM.KartStrid) => JSON.stringify([q.st.slut, q.st.kampar.map(k => [k.lage, Math.round(k.blod * 1000)])]);
    const lika = !!gl.st.slut && !!gk.st.slut && utfall(gl) === utfall(gk);
    return [
      ['rövarna och försvararna börjar slåss där de möts, och de står kvar i striden', borjar],
      ['striden går steg för steg i spelets tid, och rövarna står där striden har dem, nära förrådet', mitt && nara],
      ['någon slår någon på den andra sidan', slag],
      ['den som kommer fram under striden ger sig in i den', kom],
      ['striden tar slut och rapporten sparas i byn', slut],
      [`samma strid med ett steg på 300 s och med 1200 steg på 1 s slutar likadant (${utfall(gl).slice(0, 60)}…)`, lika],
    ];
  },
};

SCENARIER.rovarbyte = {
  text: 'Plundringen och flykten på kartan (steg 6.6.11, rovare.ts): när ingen står emot tar varje rövare som når förrådet så mycket de kan bära, det med högst pris per vikt först, och bär dem. Sedan bär de hem mot kanten. Den som faller (här i en tornado) tappar det hen bär där hen ligger, och det är byns igen.',
  kor: () => {
    const s = createState(6, START);
    const z = SIM.zoneOf(s)!, m = { x: z.x + z.w / 2, y: z.y + z.h / 2 };
    for (const p of living(s)) { Object.assign(p, SIM.freeNear(s, m.x + 40, m.y + 40)); p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: s.now + 20 * HOUR, carry: 0 }; } // alla sover långt bort: ingen står emot
    addTo(s, 'skinn', 30); addTo(s, 'rep', 30);
    const fore = SAK_LIST.reduce((n, k) => n + (SAKER[k]!.redskap ? 0 : amountOf(s, k)), 0);
    const f = rovarGang(s, 3, { x: m.x + 3, y: m.y }, { anfaller: true });
    korTills(s, () => !s.rovare || !!f.klar, 1800);
    const efter = SAK_LIST.reduce((n, k) => n + (SAKER[k]!.redskap ? 0 : amountOf(s, k)), 0);
    const folk = s.rovare ? SIM.rovarna(s, s.rovare) : [], bars = folk.map(r => Object.values(r.gast?.bar ?? {}).reduce((a, b) => a + b, 0));
    const tog = !!f.klar && folk.length === 3 && bars.every(n => n > 0) && Math.round(fore - efter) === bars.reduce((a, b) => a + b, 0);
    const vardast = folk.every(r => Object.keys(r.gast?.bar ?? {}).every(k => SIM.grundvarde(k) >= Math.min(SIM.grundvarde('skinn'), SIM.grundvarde('rep'))));
    // de bär hem var för sig: avståndet från förrådet växer för alla
    const fran0 = folk.map(r => Math.hypot(r.x - m.x, r.y - m.y));
    for (let i = 0; i < 2; i++) SIM.step(s, 5);
    const folk2 = s.rovare ? SIM.rovarna(s, s.rovare) : []; if (!s.rovare) return [[`rövarna finns kvar efter plundringen (${bars.join(",")}, ${fore - efter}, ${s.stat?.rovarBorta})`, false]];
    const bort = folk2.length === 3 && folk2.every((r, j) => Math.hypot(r.x! - m.x, r.y! - m.y) > fran0[j] + 1);
    // tornadon dödar dem: bytet ligger där de föll
    const platser = folk2.map(r => ({ x: Math.floor(r.x!), y: Math.floor(r.y!) }));
    const hogar = () => SIM.pilesOf(s).filter(a => platser.some(q => q.x === a.x && q.y === a.y) && !SAKER[a.k]!.redskap).reduce((n, a) => n + a.n, 0);
    const h0 = hogar();
    SIM.rovarTornado(s, s.rovare!, 0, 1, 0, [0, 0], () => 0);
    const tappat = !s.rovare && Math.round(hogar() - h0) === (s.stat?.rovarTappat ?? 0) && (s.stat?.rovarTappat ?? 0) > 0;
    return [
      [`varje rövare tar så mycket hen kan bära ur förrådet, sak för sak (${bars.join(', ')})`, tog],
      ['de tar det mest värda först', vardast],
      ['de bär hem bort från förrådet', bort],
      ['den som faller tappar det hen bär där hen ligger', tappat],
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
    // en bänk till bredvid, där det är fritt framför den
    const st2: SIM.Station = { ...st, id: s.nextStation = (s.nextStation ?? 0) + 1, x: st.x + 3 };
    s.stationer!.push(st2);
    for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3], [4, 2], [-4, 2]]) { Object.assign(st2, { x: st.x + dx, y: st.y + dy }); SIM.touch(s); if (SIM.framFri(s, st2)) break; }
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

SCENARIER.testborta = {
  text: 'Ta bort i testläget (steg 4.5.7.8): möbler, stationer och lagerplatser kan tas bort i testläget, och det som togs bort tas bort ur den riktiga byn också när testläget slutar (ui/testborta.ts). Det som låg i en kista eller på en lagerplats blir liggande där på marken. Allt annat i testläget är en kopia, och byns sista lagerplats kan inte tas bort.',
  kor: () => {
    utanWebblasare();
    const s = createState(6, START);
    rikBy(s);
    const z0 = SIM.zonesOf(s)[0], kista: SIM.Station = { id: s.nextStation = (s.nextStation ?? 0) + 1, k: 'kista', x: z0.x + z0.w + 1, y: z0.y, kvar: 0 };
    (s.stationer ??= []).push(kista);
    const yxa = SIM.newTing(s, 'yxa', 1, BYN);
    yxa.vid = kista.id; yxa.x = kista.x; yxa.y = kista.y;
    const z2 = { x: z0.x, y: z0.y + z0.h + 2, w: 2, h: 2, namn: 'Andra lagret' };
    s.lagren = [...SIM.zonesOf(s), z2];
    (s.stackar ??= []).push({ k: 'sten', n: 3, c: 1, x: z2.x, y: z2.y });
    SIM.touch(s);
    const antal = SIM.stationerOf(s).length, folk = s.people.length;
    // testläget: en kopia av byn
    const real = s, kopia = SIM.cloneState(s);
    setByn(kopia); ui.testMode = true; ui.testBorta = { st: [], lager: [] };
    const el = (test: string) => ({ closest: () => ({ dataset: { test } }) }) as unknown as HTMLElement;
    taBortITest(kopia, SIM.stationById(kopia, kista.id)!); const st = true;
    const kz = SIM.zonesOf(kopia), i2 = kz.findIndex(q => q.x === z2.x && q.y === z2.y);
    ui.lagerNr = i2;
    const lz = lagerFlik.klick!(el('lagerbort'));
    kopia.people.pop(); // något annat som händer i testläget följer inte med
    ui.testMode = false; testBortaIByn(real); setByn(real);
    const ry = SIM.tingOf(real).find(k => k.id === yxa.id), sten = SIM.pilesOf(real).find(a => a.k === 'sten' && a.x === z2.x && a.y === z2.y);
    const ensam = createState(6, START), enda = SIM.zonesOf(ensam)[0];
    return [
      ['i kopian togs kistan och lagerplatsen bort med knapparna', st && lz && !SIM.stationById(kopia, kista.id) && SIM.zonesOf(kopia).length === kz.length - 1],
      ['den riktiga byn är utan kistan och den andra lagerplatsen', !SIM.stationById(real, kista.id) && SIM.stationerOf(real).length === antal - 1 && !SIM.zonesOf(real).some(q => q.x === z2.x && q.y === z2.y)],
      ['yxan som låg i kistan ligger kvar på rutan', !!ry && ry.vid === undefined && ry.x === kista.x && ry.y === kista.y],
      ['stenarna på lagerplatsen ligger kvar på marken', !!sten && sten.n === 3 && !sten.stored],
      ['allt annat i testläget var en kopia', real.people.length === folk],
      ['byns sista lagerplats kan inte tas bort', !!SIM.lagerHinder(ensam) && !SIM.taBortLager(ensam, enda) && SIM.zonesOf(ensam).length === 1],
      ['listan över det borttagna töms', ui.testBorta.st.length === 0 && ui.testBorta.lager.length === 0],
    ];
  },
};

SCENARIER.forvarlista = {
  text: 'Det som förvaras i en kista eller på en hylla visas som i ett lager (steg 4.5.7.9): ett tryck på kistan eller hyllan visar innehållet i samma lista som lagret, med symbol, namn, antal, kvalitet och skick. Bara panelen.',
  kor: () => {
    utanWebblasare();
    const s = createState(6, START);
    rikBy(s); setByn(s);
    const z0 = SIM.zonesOf(s)[0], ny = (k: string, x: number, y: number) => { const t: SIM.Station = { id: s.nextStation = (s.nextStation ?? 0) + 1, k, x, y, kvar: 0 }; (s.stationer ??= []).push(t); return t; };
    const kista = ny('kista', z0.x + z0.w + 1, z0.y), hylla = ny('hylla', z0.x, z0.y);
    kista.ag = living(s)[0].id;
    const yxa = SIM.newTing(s, 'yxa', 1, kista.ag); yxa.vid = kista.id; yxa.x = kista.x; yxa.y = kista.y; yxa.c = 0.5;
    (s.stackar ??= []).push({ k: 'sten', n: 3, c: 1, x: hylla.x, y: hylla.y });
    SIM.touch(s);
    ui.stationId = kista.id; const k = stationFlik.html();
    ui.stationId = hylla.id; const h = stationFlik.html();
    const tom = ny('kista', z0.x + z0.w + 2, z0.y); ui.stationId = tom.id; const t = stationFlik.html();
    return [
      ['kistan visar yxan i lagrets lista med skicket', /<dl class="kv stk">/.test(k) && k.includes(SIM.sakNamn('yxa')) && k.includes(`data-sak="t:${yxa.id}"`) && k.includes('50 %')],
      ['hyllan visar stenarna med antalet, som i lagret', /<dl class="kv stk">/.test(h) && /Sten 3 st/.test(h) && h.includes('100 %')],
      ['en tom kista säger att den är tom', t.includes('tom') && !/<dl class="kv stk">/.test(t)],
    ];
  },
};

SCENARIER.kronikakat = {
  text: 'Steg 9.2.73: krönikans kategorier. Varje krönikerad har ett slag, och registret KRONIKA_KAT säger vilken kategori slaget hör till: en födsel under Liv. En rad med kategoriernas symboler överst filtrerar, och en rad utan slag ur en gammal sparfil står bara när ingen kategori är vald',
  kor: () => {
    utanWebblasare();
    const s = createState(6, START);
    for (let i = 0; i < 3 * STEG_DYGN; i++) step(s, BEAT);
    const K = s.hist!.kronika, okanda = [...new Set(K.filter(r => r[2] !== undefined && !SIM.kronikaKat(r[2])).map(r => r[2]))];
    const a = living(s)[0];
    SIM.kronikaBer(s, 'k_fodd', a.id, { ...SIM.personFalt(a), mor: a.name, far: a.name });
    const fodd = K[K.length - 1];
    K.push([s.now, 'En rad ur en gammal sparfil.']);
    setByn(s);
    Object.assign(kronikaVal, { viktigt: true, nyast: true, ar: undefined, person: undefined, kat: undefined });
    const alla = kronikaFlik.html();
    kronikaVal.kat = 'liv';
    const liv = kronikaFlik.html();
    kronikaVal.kat = 'strid';
    const strid = kronikaFlik.html();
    kronikaVal.kat = undefined;
    const symboler = (alla.match(/data-kkat=/g) ?? []).length;
    return [
      [`alla slag i krönikan har en kategori${okanda.length ? ` (saknas: ${okanda.join(', ')})` : ''}`, okanda.length === 0],
      [`en födsel hamnar under Liv (${fodd[2]} → ${SIM.kronikaKat(fodd[2])})`, SIM.kronikaKat(fodd[2]) === 'liv'],
      [`raden med kategoriernas symboler (${symboler})`, symboler === SIM.KRONIKA_KAT.length],
      ['Liv visar födseln, Strid inte', liv.includes(fodd[1].slice(0, 10)) && !strid.includes(fodd[1].slice(0, 10))],
      ['raden utan slag står bara när ingen kategori är vald', alla.includes('En rad ur en gammal sparfil') && !liv.includes('En rad ur en gammal sparfil')],
    ];
  },
};

SCENARIER.kronikalista = {
  text: 'Krönikan och händelserna i en lista (steg 5.4.2, ui/flikar/kronika.ts): Stort visar krönikan, Allt händelseloggen, senast först under en rubrik per år, och stenen Byns tal alla byns grafer (steg 9.3.2). Man bläddrar år för år och kan välja en person: bara raderna där hen står med. Bara panelen.',
  kor: () => {
    utanWebblasare();
    const s = createState(6, START);
    for (let i = 0; i < 2 * STEG_DYGN; i++) step(s, BEAT);
    setByn(s);
    const [a, b] = living(s), K = s.hist!.kronika, D = SIM.DAY;
    K.push([s.now - D, `${a.name} hittade en sten.`], [s.now, `${b.name} och ${a.name} byggde ett hus.`]);
    const rader = (h: string) => (h.match(/<li/g) ?? []).length;
    Object.assign(kronikaVal, { viktigt: true, nyast: true, ar: undefined, person: undefined });
    const alla = kronikaFlik.html();
    kronikaVal.person = a.id; const medA = kronikaFlik.html();
    kronikaVal.person = b.id; const medB = kronikaFlik.html();
    kronikaVal.person = undefined; kronikaVal.ar = SIM.kalender(s, s.now).ar; const iAr = kronikaFlik.html();
    kronikaVal.ar = undefined; kronikaVal.viktigt = false; const allt = kronikaFlik.html();
    kronikaVal.viktigt = true; kronikaVal.nyast = false; const aldst = kronikaFlik.html(); kronikaVal.nyast = true;
    talVal.vy = 'kartan'; const kartan = talFlik.html(); talVal.vy = 'grafer';
    const grafer = talFlik.html(); // graferna i stenen Byns tal (steg 9.3.2)
    Object.assign(rikVal, { vy: 'person', person: a.id }); const rikP = talFlik.html();
    Object.assign(rikVal, { vy: 'sak', sak: 'ved', person: undefined }); const rikS = talFlik.html();
    Object.assign(rikVal, { vy: 'byn', sak: undefined });
    Object.assign(kronikaVal, { viktigt: true, nyast: true, ar: undefined, person: undefined });
    const forst = alla.indexOf(`${b.name}</button> och`), sen = alla.indexOf(`${a.name}</button> hittade`);
    return [
      [`Stort visar hela krönikan (${rader(alla)} rader av ${K.length})`, rader(alla) === K.length],
      ['senast först, med en rubrik per år', forst >= 0 && sen > forst && /<h4 class="kar">År \d+<\/h4>/.test(alla)],
      [`personen: bara raderna där hen står med (${a.name} ${rader(medA)}, ${b.name} ${rader(medB)})`, rader(medA) === K.filter(r => r[1].includes(a.name)).length && rader(medB) === K.filter(r => r[1].includes(b.name)).length && medB.includes(`${b.name}</button> och`) && !medB.includes('hittade en sten')],
      ['ett år visar bara det årets rader', rader(iAr) === K.filter(r => SIM.kalender(s, r[0]).ar === SIM.kalender(s, s.now).ar).length && rader(iAr) < rader(alla)],
      [`Allt visar krönikan och händelseloggen i en lista (${rader(allt)} rader, ${s.log.length} i loggen; steg 9.2.125)`, rader(allt) >= s.log.length && allt.includes('hittade en sten') && s.log.length > K.length],
      ['äldst först vänder ordningen', aldst.indexOf(`${a.name}</button> hittade`) >= 0 && aldst.indexOf(`${a.name}</button> hittade`) < aldst.indexOf(`${b.name}</button> och`)],
      ['symbolerna överst: det viktiga eller allt, ordningen och kategorierna, och ingen Karta i Krönikan', /data-kvis="viktigt"/.test(alla) && /data-kordning="aldst"/.test(alla) && /data-kkat=/.test(alla) && !/kmReglage|Kartan/.test(alla)],
      ['Kartan är en flik i Byns tal bredvid graferna (steg 9.2.126)', kartan.includes('kmReglage') && /data-tvy="grafer"/.test(kartan) && /data-tvy="kartan"/.test(grafer)],
      [`Byns tal visar alla byns grafer under varandra (${(grafer.match(/data-graf=/g) ?? []).length} st, steg 9.3.2)`, ['folk', 'humor', 'eld', 'forrad', 'rik'].every(g => grafer.includes(`data-graf="${g}"`)) && !grafer.includes(`class="logg"`)],
      ['rikedomens graf har en väljare överst: byn, en person eller en sak (steg 6.9.14)', grafer.includes('data-rikvy') && !grafer.includes('data-rikval') && living(s).every(p => rikP.includes(`<option value="${p.id}"`)) && rikP.includes('data-rikvy="person"') && rikS.includes('data-rikvy="sak"') && rikS.includes('data-rikval')],
    ];
  },
};

SCENARIER.notislista = {
  text: 'Genomgången av notiserna (steg 5.4.3.2, ui/notiser.ts): brevet i raden överst visar antalet olästa, rutan visar en notis i taget (den viktigaste först) med namnen som knappar, nästa och föregående, ta bort och ta bort alla (efter ett ja), och den som visats är läst. Bara gränssnittet.',
  kor: () => {
    utanWebblasare();
    const s = createState(6, START);
    for (let i = 0; i < STEG_DYGN / 4; i++) step(s, BEAT);
    setByn(s); s.notiser = undefined; // bara scenariots notiser
    const [a, b] = living(s);
    SIM.notis(s, 'byte', 'Ett byte med handlaren.');
    SIM.notis(s, 'fodd', `${a.name} fick ett barn.`, [a.id]);
    SIM.notis(s, 'dod', `${b.name} dog.`, [b.id], { x: 5, y: 5 });
    const knapp = notisKnapp();
    Object.assign(notisVal, { oppen: false, nr: undefined, fraga: false });
    notisKlick('oppna');
    const forsta = notisHtml(), olastaEfter = SIM.olasta(s);
    notisKlick('nasta'); const andra = notisHtml();
    notisKlick('forra'); const igen = notisHtml();
    notisKlick('nasta'); notisKlick('nasta'); const sista = notisHtml();
    notisKlick('bort'); const efterBort = s.notiser!.lista.length, efter = notisHtml();
    notisKlick('alla'); const fraga = notisHtml(), kvar = s.notiser!.lista.length;
    notisKlick('allaJa');
    return [
      [`brevet visar tre olästa (${knapp.replace(/<[^>]*>/g, '').trim()})`, / 3$/.test(knapp)],
      ['rutan visar den viktigaste först, döden, med namnet som knapp och platsen', forsta.includes('Död i byn') && forsta.includes(`data-id="${b.id}"`) && forsta.includes('data-notis="plats"') && forsta.includes('1 / 3')],
      [`den som visats är läst (${olastaEfter} olästa kvar)`, olastaEfter === 2],
      ['nästa och föregående bläddrar', andra.includes('2 / 3') && andra.includes(a.name) && igen.includes('1 / 3') && sista.includes('3 / 3') && sista.includes('Byte med handlaren')],
      ['ta bort tar bort den som visas och visar en annan', efterBort === 2 && efter.includes('2 / 2')],
      ['ta bort alla frågar först, och sedan är alla borta och rutan stängd', fraga.includes('data-notis="allaJa"') && kvar === 2 && s.notiser!.lista.length === 0 && !notisVal.oppen],
    ];
  },
};

SCENARIER.sammanfattning = {
  text: 'Sammanfattningen efter ikappräkningen (steg 5.4.3.4 och 5.4.4, ui/borta.ts): berättelsen om tiden borta (det viktigaste ur krönikan, längre ju längre man varit borta), tiden, talen och hur många notiser som är nya, med en knapp som öppnar notiserna; ingen lista med händelser. Bara gränssnittet.',
  kor: () => {
    utanWebblasare();
    const s = createState(6, START);
    for (let i = 0; i < STEG_DYGN / 4; i++) step(s, BEAT);
    setByn(s); s.notiser = undefined;
    const b: SIM.Borta = { fran: s.now - 2 * SIM.DAY, fodda: (s.stat?.fodda ?? 0) - 1, doda: s.stat?.doda ?? 0 };
    const tom = bortaHtml(b);
    const [p] = living(s);
    SIM.notis(s, 'fodd', `${p.name} fick ett barn.`, [p.id]); SIM.notis(s, 'dod', `${p.name} dog.`, [p.id]);
    const html = bortaHtml(b);
    Object.assign(notisVal, { oppen: false, nr: undefined, fraga: false });
    notisKlick('visa');
    const ren = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return [
      [`tiden i verkligheten och i spelet (${ren(html).slice(0, 60)}…)`, /gick 2(,0)? dygn \(2(,0)? år i spelet\)/.test(html)],
      ['talen: födda, döda och invånare', /1 födda · 0 döda · \d+ lever nu i byn/.test(html)],
      [`antalet nya notiser och en knapp till dem (${ren(html).match(/\d+ nya notiser/)?.[0]})`, /2 nya notiser/.test(html) && html.includes('data-notis="visa"')],
      ['utan nya notiser ingen knapp till dem', /Inga nya notiser/.test(tom) && !tom.includes('data-notis')],
      ['ingen lista med händelser', !/<ol|<ul|<li/.test(html)],
      ['knappen öppnar notiserna med den viktigaste först', notisVal.oppen && notisVal.nr === undefined && /Död i byn/.test(notisHtml())],
      ...berattelseKoll(s),
      ['medan byn räknas ikapp: förloppet och en knapp som visar byn som snabbspolning (steg 5.4.5.1)', ikappHtml(false).includes('id="progBar"') && /id="ovSpola"[^>]*aria-pressed="false"[^>]*>\{sym_oga\} Se byn/.test(ikappHtml(false)) && /aria-pressed="true"[^>]*>\{sym_oga\} Dölj byn/.test(ikappHtml(true)) && !ikappHtml(false, false).includes('ovSpola')],
    ];
  },
};

// berättelsen om tiden borta (steg 5.4.4): krönikans rader väljs efter vikt och binds ihop av mallarna, längre ju längre bort
function berattelseKoll(s: SIM.State): [string, boolean][] {
  const H = SIM.HOUR, D = SIM.DAY, nu0 = s.now, hist = (s.hist ??= { tal: [], tim: [], dygn: [], kronika: [] });
  const k0 = hist.kronika; hist.kronika = [];
  const rad = (t: number, text: string, slag?: string) => hist.kronika.push(slag ? [Math.round(t), text, slag] : [Math.round(t), text]);
  const b = (fran: number): SIM.Borta => ({ fran, fodda: s.stat?.fodda ?? 0, doda: s.stat?.doda ?? 0, folk: living(s).length });
  const ut: [string, boolean][] = [];
  try {
    const tom = bortaBerattelse(s, b(s.now - 3 * H));
    ut.push([`några timmar utan något i krönikan: en mening om att det var lugnt ("${tom[0]}")`, tom.length === 1 && (SIM.BERATTELSER.b_lugnt as SIM.Variant[]).some(v => (typeof v === 'string' ? v : v.t) === tom[0])]);
    rad(s.now - 170 * SIM.MIN, 'Ugge bytte en skål.', 'byte'); rad(s.now - 160 * SIM.MIN, 'Mira föddes.', 'k_fodd'); rad(s.now - 150 * SIM.MIN, 'Något smått.');
    rad(s.now - 140 * SIM.MIN, 'Den första handlaren kom.', 'handel'); rad(s.now - 130 * SIM.MIN, 'Arvid dog.', 'k_dog');
    const kort = bortaBerattelse(s, b(s.now - 3 * H)), k = kort.join(' ').replace(/\n/g, ' ');
    ut.push([`några timmar: ett stycke med de tre viktigaste i tidsordning och resten som småsaker (${k})`,
      kort.length === 1 && /^Mira föddes\. Den första handlaren kom\. Arvid dog\. /.test(k) && !k.includes('skål') && !k.includes('smått')]);
    // några dygn: en inledning och ett stycke per år (ett lugnt år får sin mening); en vecka: per tidsålder och sist byn nu
    s.now = nu0 + 3 * D; hist.kronika = []; rad(nu0 + 2.5 * D, 'Arvid dog.', 'k_dog');
    const fa = bortaBerattelse(s, b(nu0)), ar = SIM.kalender(s, nu0).ar;
    ut.push([`tre dygn: inledning och ett stycke per år (${fa.length} stycken: ${fa.map(x => x.slice(0, 30)).join(' | ')})`,
      fa.length === 5 && fa.slice(1).every((x, i) => x.includes(`år ${ar + i}`) || x.includes(`År ${ar + i}`)) && fa.some(x => x.includes('Arvid dog.'))]);
    s.now = nu0 + 9 * D;
    const lang = bortaBerattelse(s, b(nu0));
    ut.push([`nio dygn: per tidsålder och sist hur byn har det nu ("${lang[lang.length - 1]}")`, lang.length >= 3 && /invånare|bor .* i byn/.test(lang[lang.length - 1])]);
    s.now = nu0;
    ut.push(['berättelsen står i rutan, före talen', /ovBerattelse[^]*Arvid dog[^]*födda ·/.test(bortaHtml(b(s.now - 3 * H)))]);
  } finally { s.now = nu0; hist.kronika = k0; }
  return ut;
}

SCENARIER.filtplats = {
  text: 'Steg 9.2.44: filten läggs aldrig på en lagerplats, en station, i en dörröppning eller på en byggruta',
  kor: () => {
    const s = createState(3, START);
    const z = SIM.zonesOf(s)[0];
    // mitt på lagerplatsen: filtarna hamnar bredvid den
    const n = SIM.filtNara(s, z.x + 0.5, z.y + 0.5, SIM.FILT_MOT);
    const fri = SIM.filtFri(s, n.x, n.y - SIM.FILT_MOT / 2) && SIM.filtFri(s, n.x, n.y + SIM.FILT_MOT / 2);
    const lager = !SIM.filtFri(s, z.x + 0.5, z.y + 0.5);
    return [
      ['en ruta i lagret är inte fri för en filt', lager],
      [`två filtar mitt på lagerplatsen flyttas bredvid den (${(n.x - z.x - 0.5).toFixed(0)}, ${(n.y - z.y - 0.5).toFixed(0)})`, fri],
    ];
  },
};

SCENARIER.gastperson = {
  text: 'Gästen är en person (steg 9.2.111, gast.ts): handlaren ligger bland folket med en gästrad (sort, klan, hem) och samma negativa id som i bytena, och handlarens egen data har bara det som gäller handeln. Byns tal räknar bara byborna, gästens kropp och egenskaper drar ingen slump ur byns följder, hen tas ur folket när hen lämnar kartan, och en sparad by med den gamla handlaren görs om när den laddas',
  kor: () => {
    const s = createState(6, START); rikBy(s);
    const folk0 = living(s).length;
    const sk = SIM.skickaHandlare(s), h = s.handlare!, p = s.people.find(q => q.id === h?.id);
    const rad = !!p && p.gast?.sort === 'handlare' && p.gast.klan !== undefined && !!p.gast.hem && p.id < 0;
    const bara = !!h && !('namn' in h) && !('hem' in h) && !('x' in h) && !('handel' in h) && Array.isArray(h.varor) && typeof h.silver === 'number' && !!h.fas;
    const kropp = !!p && p.skill.handel > 0 && SIM.STATS.every(k => p.pot[k] >= 1 && p.pot[k] <= 20) && p.health === 1 && p.blod === 1;
    const utanByn = living(s).length === folk0 && !living(s).includes(p!) && !SIM.alive(p!) && SIM.gastLever(p!);
    // samma person ur samma frö och nyckel, utan att byns slumpföljder rör sig
    const rng0 = JSON.stringify(s.rngs), igen = SIM.nyGast(s, { id: -99, namn: p!.name, sex: p!.sex, fodd: p!.born, rad: p!.gast!, x: 0, y: 0, nyckel: SIM.gastNyckel(p!.gast!.klan, p!.name) });
    const samma = JSON.stringify(igen.pot) === JSON.stringify(p!.pot) && igen.hue === p!.hue, ingenSlump = JSON.stringify(s.rngs) === rng0;
    // handlaren går: hen tas ur folket
    const g = SIM.cloneState(s); g.handlare!.fas = 'gar'; g.handlare!.framme = g.now; g.handlare!.fran = { x: 0.5, y: 0.5, t: g.now }; g.handlare!.mx = 0.5; g.handlare!.my = 0.5;
    step(g, 5);
    const borta = !g.handlare && !g.people.some(q => q.id === h.id);
    // en sparad by från före v518: handlarens namn, hem och plats stod i handlarens data
    const gl = JSON.parse(SIM.serialize(s));
    const gp = gl.people.find((q: Person) => q.id === h.id);
    Object.assign(gl.handlare, { namn: gp.name, hem: gp.gast.hem, klan: gp.gast.klan, sex: gp.sex, x: gp.x, y: gp.y, handel: gp.skill.handel, fodd: gp.born });
    gl.people = gl.people.filter((q: Person) => q.id !== h.id); gl.v = 26;
    const m = SIM.migrate(gl), mp = m.people.find(q => q.id === h.id);
    const gjordOm = !!mp && mp.name === p!.name && mp.gast?.sort === 'handlare' && mp.skill.handel === p!.skill.handel && !('namn' in m.handlare!) && living(m).length === folk0;
    return [
      [`handlaren kommer (${sk.text})`, sk.ok],
      [`handlaren är en person bland folket med en gästrad och samma negativa id (${p ? `${p.name} från ${p.gast?.hem}, id ${p.id}` : 'ingen'})`, rad],
      ['handlarens egen data har bara det som gäller handeln (varor, silver, fas, affären)', bara],
      [`gästen har en kropp, egenskaper och färdigheten Handel (${p?.skill.handel ?? 0})`, kropp],
      [`byns invånare räknar bara byborna (${living(s).length} av ${folk0})`, utanByn],
      ['gästen drar ingen slump ur byns följder, och samma frö och nyckel ger samma person', ingenSlump && samma],
      ['när handlaren lämnat kartan finns hen inte kvar bland folket', borta],
      ['en sparad by med den gamla handlaren görs om när den laddas', gjordOm],
    ];
  },
};

SCENARIER.rovarperson = {
  text: 'Rövarna är personer (steg 9.2.112, rovare.ts): flockens rövare ligger bland folket som gäster med kropp, blod, egenskaper, färdigheter och vapnet i gästraden, och flocken minns bara deras id. I striden räknas de som bybor (egenskaperna med åldern, skickligheten ur Närstrid), den som faller tas ur folket och lämnar det hen bar, och de som flyr ut ur kartan är borta ur folket',
  kor: () => {
    const s = createState(6, START); rikBy(s);
    const folk0 = living(s).length;
    SIM.rovarnaKommer(s, 4); const f = s.rovare!, rov = SIM.rovarna(s, f);
    const personer = rov.length === 4 && f.folk.every(id => typeof id === 'number' && id < -1e8) && rov.every(r => r.gast?.sort === 'rovare' && SIM.gastTingOf(s, r).length > 0 && r.blod === 1 && r.skill.narstrid >= 0 && SIM.STATS.every(k => r.pot[k] >= 1 && r.pot[k] <= 20));
    const utanByn = living(s).length === folk0 && rov.every(r => !SIM.alive(r) && SIM.gastLever(r));
    const unika = new Set(f.folk).size === 4 && !s.people.some(p => p.id === f.folk[0] && !p.gast);
    // striden: rövarnas kämpar har personens egenskaper (de är personer, så striden på kartan gör ingen skillnad på dem och byborna)
    const z = SIM.zoneOf(s)!, m = { x: z.x + z.w / 2, y: z.y + z.h / 2 }; SIM.stallUpp(s, f, m.x + 2, m.y);
    const mot = living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen).slice(0, 4);
    for (const p of mot) { Object.assign(p, SIM.freeNear(s, m.x - 1, m.y)); p.task = undefined; }
    rov[0].blod = 0.12; // en är redan svårt skadad och faller i striden
    const strid = SIM.kartStridBorja(s, 'skada', [mot, rov], 'rövare vid byn', { typ: 'rovare', egen: true, flock: f.id });
    const kampar = strid.st.kampar.filter(k => k.sida === 1), r0 = rov[0];
    const somBybo = kampar.length === 4 && Math.abs(kampar[0].st.styrka - SIM.stat(r0, 'styrka', s.now)) < 1e-9 && kampar[0].st.skicklighet === 5 + r0.skill.narstrid / 2 && kampar[0].vapen === (SIM.gastVapen(s, r0) ?? 'hand');
    korTills(s, () => !!strid.st.slut, 900);
    const doda = s.stat?.rovarDoda ?? 0, kvar = SIM.rovarna(s, f).length;
    const fallna = doda >= 1 && kvar + doda === 4 && f.folk.length === kvar && s.people.filter(p => p.gast?.sort === 'rovare').length === kvar;
    // flykten: de som når kanten är borta ur folket
    for (const r of SIM.rovarna(s, f)) r.gast!.flytt = true;
    for (let i = 0; i < 400 && s.rovare === f && f.folk.length; i++) SIM.step(s, SIM.nastaSteg(s));
    const borta = !s.people.some(p => p.gast?.sort === 'rovare');
    return [
      [`flockens rövare är personer bland folket med gästrad och vapen (${rov.map(r => `${r.name}: ${SIM.gastVapen(s, r) ?? 'inget'}`).join(', ')})`, personer],
      [`byns invånare räknar bara byborna (${living(s).length} av ${folk0})`, utanByn],
      ['flocken minns bara rövarnas id, och ingen bybo har samma id', unika],
      [`i striden räknas rövaren som en bybo (styrka ${kampar[0]?.st.styrka.toFixed(1)}, skicklighet ${kampar[0]?.st.skicklighet})`, somBybo],
      [`den som faller tas ur folket (${doda} döda, ${kvar} kvar)`, fallna],
      ['de som flyr ut ur kartan är borta ur folket', borta],
    ];
  },
};

SCENARIER.gastvardag = {
  text: 'Gästernas vardag (steg 9.2.113, gastvardag.ts): handlaren blir hungrig och äter ur sin egen packning, somnar när hen väntar och ingen handlar och vaknar utvilad, vårdas av en bybo när hen har ett sår som blöder, och gör gästernas egna handlingar ur registret (sorten är kravet, och byborna gör dem aldrig)',
  kor: () => {
    const s = createState(6, START); rikBy(s);
    const sk = SIM.skickaHandlare(s), h = s.handlare!, p = s.people.find(q => q.id === h?.id)!;
    // hungrig: äter en portion ur packningen, och byns förråd rörs inte
    const mat0 = SIM.foodOf(s);
    p.hunger = 0.2; p.naring = undefined;
    step(s, 5);
    const at = p.hunger > 0.3 && (p.gast!.mat ?? 0) === SIM.GASTVARD.matsack - 1 && SIM.foodOf(s) === mat0;
    // trött medan hen väntar på kvällen: somnar, och vaknar när vilan är full
    h.fas = 'vantar'; h.kvall = s.now + 30 * HOUR; p.rest = 0.2;
    step(s, 5);
    const somnar = p.gast!.sover === 1 && p.task?.act === 'sova';
    for (let i = 0; i < 9 * 60 && p.gast!.sover; i++) step(s, 60);
    const vaknar = !p.gast!.sover && p.rest >= SIM.GASTVARD.vaken - 0.01 && p.task?.act === 'gastVantar';
    // ett sår som blöder: en bybo går för att vårda hen
    p.skador = [{ d: 'armV', k: 'skarsar', g: 0.5, b: 1 }];
    const by = living(s)[0]; p.x = by.x + 2; p.y = by.y; // handlaren står mitt i byn
    const v = living(s).map(q => SIM.vardVal(s, q, false)).find(x => x?.ref === p.id);
    const vardas = !!v;
    // handlingarna: handlarens är hens, rövarens är inte hens, och ingen bybo får göra dem
    const egna = SIM.kanGora(p, 'gastHandla') && !SIM.kanGora(p, 'plundra') && !living(s).some(q => SIM.kanGora(q, 'gaHem'));
    return [
      [`handlaren kommer (${sk.text})`, sk.ok],
      [`hen äter ur sin packning när hen är hungrig (mättnaden ${p.hunger.toFixed(2)}, ${p.gast!.mat} portioner kvar), och byns mat rörs inte`, at],
      ['hen somnar när hen väntar och är trött', somnar],
      [`och vaknar utvilad (vilan ${p.rest.toFixed(2)})`, vaknar],
      [`en bybo går för att vårda handlarens sår (${v?.why ?? 'ingen'})`, vardas],
      ['gästernas handlingar kräver sorten, och byborna gör dem aldrig', egna],
    ];
  },
};

SCENARIER.handlarenIgen = {
  text: 'Borta och tillbaka (steg 9.2.114, gast.ts): handlaren som går hem sparas hos sin klan som hela personen, och när samma handlare kommer igen är det samma person med minnena, det hen lärt sig, tankarna och relationerna. Hemma har hen åldrats och levt förenklat: skadorna har läkt och behoven är fyllda. En rövare som flyr hem sparas också',
  kor: () => {
    const s = createState(6, START); rikBy(s);
    SIM.skickaHandlare(s);
    const h = s.handlare!, p = s.people.find(q => q.id === h.id)!, namn = p.name, klan = p.gast!.klan;
    // det hen varit med om i byn
    p.skill.handel += 3; p.kunskap = { ...p.kunskap, minne: { v: 0.7, t: s.now } };
    p.thoughts.push({ text: 'Minns byn', v: 0.2, until: s.now + 400 * SIM.DAY }, { text: 'Bleknar', v: 0.1, until: s.now + SIM.HOUR });
    p.health = 0.6; p.hunger = 0.2; p.skador = [{ d: 'armV', k: Object.keys(SIM.SKADOR)[0] as SIM.SkadaTyp, g: 0.3, b: 0 }];
    const handel = p.skill.handel, fodd = p.born;
    const gar = (g: State) => { const x = g.handlare!; x.fas = 'gar'; x.framme = g.now; x.fran = { x: 0.5, y: 0.5, t: g.now }; x.mx = 0.5; x.my = 0.5; step(g, 5); };
    gar(s);
    const kp = SIM.klanById(s, klan)?.personer.find(q => q.namn === namn);
    const sparad = !!kp?.kropp && kp.borta !== undefined && !s.people.some(q => q.name === namn && q.gast);
    // dagar senare kommer handlare tills det är samma igen
    s.now += 3 * SIM.DAY;
    let igen: Person | undefined;
    for (let i = 0; i < 40 && !igen; i++) {
      s.handlare = undefined; SIM.skickaHandlare(s);
      const q = s.people.find(x => x.id === s.handlare?.id);
      if (q?.name === namn && q.gast?.klan === klan) igen = q; else gar(s);
    }
    const samma = !!igen && igen.skill.handel === handel && igen.kunskap?.minne?.v === 0.7 && igen.born === fodd && igen.id === s.handlare!.id;
    const tankar = !!igen && igen.thoughts.some(t => t.text === 'Minns byn') && !igen.thoughts.some(t => t.text === 'Bleknar');
    const levt = !!igen && igen.health === 1 && !igen.skador?.length && igen.hunger >= 0.8 && SIM.ageOf(igen, s.now) > SIM.ageOf(p, s.now - 3 * SIM.DAY);
    const slapp = !kp?.kropp;
    // en rövare som flyr hem sparas hos klanen
    const r = createState(7, START);
    const k = SIM.klanerOf(r)[0]; k.inst = -80;
    SIM.rovarnaKommer(r, 2, true, k.id);
    const f = r.rovare!, rv = r.people.find(q => q.id === f.folk[0])!;
    rv.gast!.flytt = true; rv.x = 0.6; rv.y = 0.6; // hen flyr och står redan vid kanten
    step(r, 5);
    const rovHem = !!k.personer.find(q => q.namn === rv.name && q.roll === 'rovare')?.kropp;
    return [
      [`handlaren ${namn} sparas hos klanen när hen går hem`, sparad],
      [`samma handlare kommer igen som samma person (Handel ${igen?.skill.handel ?? '–'} av ${handel}, minnet kvar)`, samma],
      ['tankarna som räcker finns kvar, de som bleknat är borta', tankar],
      [`hemma har hen åldrats och läkt (hälsa ${igen ? Math.round(igen.health * 100) : '–'} %, skador ${igen?.skador?.length ?? 0})`, levt],
      ['klanen håller inte kvar en kopia medan hen är här', slapp],
      [`en rövare som flyr hem sparas hos klanen (${rv.name})`, rovHem],
    ];
  },
};
