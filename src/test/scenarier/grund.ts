// Scenarier. Grunden: gläntan, yxan, vintern, knapphet, svamp och flinta, kunskap, temperatur och kalender.
import { createState, growGround, step, living, temperature, coldOf, ageIndex, ageStart, kalender, yearNo, AGES, amountOf, groundOf, getMap, DAY, HOUR, W, tileOf, kn, fearPlace, findL, areaOf, describe, migrate, forget, stat, angOf, setAmount, BEAT, tingOf, eatPoison, HOST, vaderNu, VADER, VADERLAGE, VaderId, blotSteg, varmeDelar, stepVader, vaxtFaktor, stepFire, hearthOf, cloneState, wearMult, vaderSlit, NEW_W, NEW_H, allaTider, tiderUtanfor, skaRojas, straken } from '../../sim';
import { BAR, FOREST, HIGH, isSoil } from '../../sim/vag';
import { T } from '../../sim/typer';
import * as SIM from '../../sim';
import type { Person, State } from '../../sim';
import { nyKalender } from '../../sim';
import { START, STEG_TIM } from '../kor';
import { setMat, Koll, kor, tandEld, logg, skogsandel, uttag, STOCKHOLM, SCENARIER, nyInvanare, klockan, medHus, medBank } from './hjalp';

SCENARIER.glanta = {
  lang: true,
  text: 'Ny by: fem personer utan eld i en liten glänta på en större karta, skog och ängar med högt gräs står runt omkring och marken nöts till stigar',
  kor: () => {
    const s = createState(11, START), a = angOf(s.seed), g0 = groundOf(s);
    let jord = 0, angar = 0; for (let i = 0; i < a.length; i++) if (isSoil(g0.tiles[i])) { jord++; angar += a[i]; }
    const ang = angar / jord, skog0 = skogsandel(s, 9, 99);
    const forst: Koll[] = [
      [`en liten koloni: ${s.people.length} personer, ingen eld`, s.people.length === 5 && !s.fire.lit],
      [`större karta (${s.W}×${s.H})`, s.W === NEW_W && s.H === NEW_H],
      ['gläntan är tom på träd', skogsandel(s, 0, 3) === 0],
      ['gläntan är liten: skog sex rutor från elden', skogsandel(s, 6, 9) > 0.8],
      [`skog på det mesta av jorden utanför gläntan och ängarna, i dungar med gläntor emellan (steg 5.1.4.1): ${(skog0 * 100).toFixed(0)} %`, skog0 > 0.65 && skog0 < 0.95],
      [`ängar med högt gräs på ${(ang * 100).toFixed(0)} % av jorden`, ang > 0.2 && ang < 0.55 && skogsandel(s, 9, 99, 1) === 0],
      ['ingen ved, bara grenar i förrådet', amountOf(s, 'ved') === 0 && (amountOf(s, 'grenar')) > 0],
    ];
    kor(s, 10 * 24);
    const g = groundOf(s);
    let trampat = 0; for (let i = 0; i < g.cover.length; i++) if (isSoil(g.tiles[i]) && g.cover[i] < HIGH) trampat++;
    return [...forst,
      ['gräset har trampats ner till kort gräs eller stigar', trampat > 20],
      [`skogen står kvar runt byn efter 10 dygn (${(skogsandel(s, 9, 99) * 100).toFixed(0)} %, från början ${(skog0 * 100).toFixed(0)} %; torrakor faller, steg 5.1.4.2)`, skogsandel(s, 9, 99) > 0.85 * skog0],
      ['ängarna är mest gräs efter 10 dygn', skogsandel(s, 9, 99, 1) < 0.1],
      ['elden har tänts', s.fire.lightings > 0],
      ...stigLigger()];
  },
};

// en stig långt från byn som ingen går på ligger kvar i flera dygn (steg 2.10.15): bara gräsets återväxt räknas här
function stigLigger(): Koll[] {
  const s = createState(11, START), g = groundOf(s), m = getMap(s.seed);
  let rad = -1;
  for (let y = 2; y < NEW_H - 2 && rad < 0; y++) for (let x = 2; x < NEW_W - 8; x++) {
    if (Math.hypot(x - m.fire.x, y - m.fire.y) < 20) continue;
    let ok = true; for (let dy = -1; dy <= 1; dy++) for (let dx = 0; dx < 6; dx++) if (!isSoil(g.tiles[(y + dy) * W + x + dx])) ok = false;
    if (ok) { rad = y * W + x; break; }
  }
  for (let dx = 0; dx < 6; dx++) { g.cover[rad + dx] = 0; g.trees[rad + dx] = 0; }
  for (let h = 0; h < 5 * 24; h++) growGround(s, 1, 1); // fem dygn (fem år i spelet) i tidsåldern med mest växt
  let bar = 0; for (let dx = 0; dx < 6; dx++) if (g.cover[rad + dx] < BAR) bar++;
  return [[`en stig som ingen går på är bar jord efter fem dygn (${bar} av 6 rutor)`, rad >= 0 && bar === 6]];
}

SCENARIER['ingen-yxa'] = {
  lang: true,
  text: 'Byn har bara en flinta, som behövs till elden: ingen yxa görs, inga träd fälls och elden hålls vid liv med grenar',
  kor: () => {
    const s = createState(13, START); // by 12 dör ut tidigt av svält sedan kaninerna håller sig längre från byn (1.5.5), och saknar sedan torrt gräs att tända med
    setAmount(s, 'flinta', 1);
    // flintan i en påbörjad yxa räknas inte i förrådet (materialet tas när arbetet börjar, 1.5.14), så den tas bort också
    // handlaren säljer ingen yxa här: sedan steg 4.5.4.16 köper byn ett redskap den saknar
    kor(s, 30 * 24, s => { if (amountOf(s, 'flinta') > 1) setAmount(s, 'flinta', 1); if (tingOf(s).some(t => t.halv?.gor === 'yxa')) s.ting = tingOf(s).filter(t => t.halv?.gor !== 'yxa'); if (s.handlare) s.handlare.varor = s.handlare.varor.filter(w => w.k !== 'yxa'); });
    return [
      ['ingen yxa', !(amountOf(s, 'yxa'))],
      ['inga träd fällda', !(s.fallda ?? 0)],
      ['ingen ved, bara grenar', amountOf(s, 'ved') === 0 && (amountOf(s, 'grenar')) > 0],
      ['ingen dog av kyla', !s.people.some(p => p.cause === 'av kyla')],
      ['byn lever', living(s).length > 0]];
  },
};

SCENARIER.yxa = {
  lang: true,
  text: 'Byn har en yxa: träd fälls, stammarna huggs till ved och det växer gräs där träden stod',
  kor: () => {
    const s = createState(14, START); // by 14 sedan v146: i by 13 gick stigarna rakt över fällplatserna, så mest bar jord
    setAmount(s, 'yxa', 1);
    tandEld(s); // elden brinner: annars hänger provet på när flintan råkar lyckas (ungefär vart femtionde försök)
    s.byggSok = Infinity; // inget hus: träden på en husplats fälls för bygget, inte för ved
    const fallda = new Set<number>();
    let ved = 0;
    const rojs = new Set<number>(); // träd i ett lager i skogen (steg 3.6.9): de fälls i förväg och huggs upp när byn behöver ved
    kor(s, 10 * 24, s => { ved = Math.max(ved, amountOf(s, 'ved')); for (const i of skaRojas(s)) rojs.add(i); for (const k of s.stockar ?? []) fallda.add(tileOf(k.x, k.y)); });
    const liggande = (s.stockar ?? []).filter(k => !rojs.has(tileOf(k.x, k.y))).length;
    const g = groundOf(s);
    // på gångstråken trampas marken där träden stod till jord, så räkna bara utanför dem (byns område täcker sedan steg 6.2.1
    // också skogen där byn fäller, så området går inte att räkna bort)
    const sk = straken(s).ruta, ute = [...fallda].filter(i => !sk[i]);
    // gräs, inte bar jord: de som går förbi med trä trampar ner det högsta gräset (stigar, vag.ts)
    let gras = 0; for (const i of ute) if (g.trees[i] < FOREST && g.cover[i] >= BAR) gras++;
    return [
      ['träd har fällts', (s.fallda ?? 0) >= 3],
      ['ved har huggits', ved > 0],
      [`gräs där träden stod utanför stråken, minst hälften (${gras} av ${ute.length})`, ute.length >= 3 && gras >= ute.length / 2],
      [`stammarna huggs upp (högst 2 liggande utanför lagret i skogen: ${liggande})`, liggande <= 2]];
  },
};

SCENARIER.egnaeldar = {
  text: 'Steg 6.3.1: varje eld får ved efter vad de som använder just den vill ha. Den trivsamma elden räknas bara från den som sitter vid elden eller är på väg dit, så en varm natt då ingen är vid elden vill ingen ha mer ved; alla eldar fylls på lika, den första är inte särskild',
  kor: () => {
    const s = createState(3, START);
    // en varm natt: timme för timme framåt tills det är mörkt och inte kallt
    for (let i = 0; i < 24 * 30 && (SIM.isLight(s.now) || coldOf(temperature(s)) > 0); i++) s.now += HOUR;
    const varmNatt = !SIM.isLight(s.now) && coldOf(temperature(s)) === 0;
    const ppl = living(s), e = SIM.eldPlats(s);
    const vuxna = ppl.filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.ansvar);
    for (const p of ppl) { p.warm = 1; p.task = undefined; p.x = e.x + 0.5 + 30; p.y = e.y + 0.5; }
    setAmount(s, 'ved', 40);
    Object.assign(s.fire, { lit: true, fuel: 0.2, lightings: 1 });
    stepFire(s, 1, ppl);
    const langtBort = s.fire.want ?? 0, ingenHamtar = !ppl.some(p => p.task?.act === 'elda');
    // en sätter sig vid elden: den trivsamma elden räknas från henom
    const a = vuxna[0];
    a.x = e.x + 0.5; a.y = e.y + 2;
    stepFire(s, 1, ppl);
    const vid = s.fire.want ?? 0, why = s.fire.wantWhy ?? '';
    // en lägereld till, långt bort, där en annan sitter: båda eldarna fylls på samtidigt
    const b = vuxna[1], at = { x: e.x + 30, y: e.y };
    const br = Object.assign(SIM.newFire(), { id: (s.nextStation ??= 1), at, ring: true, lit: true, fuel: 0.2, lightings: 1, folk: [b.id] });
    s.nextStation = (s.nextStation ?? 1) + 1; (s.eldar ??= []).push(br);
    for (const p of ppl) p.task = undefined;
    b.x = at.x + 0.5; b.y = at.y + 2;
    stepFire(s, 1, ppl);
    const eldare = ppl.filter(p => p.task?.act === 'elda'), tillForsta = eldare.filter(p => p.task!.ref === undefined).length, tillBrasan = eldare.filter(p => p.task!.ref === br.id).length;
    return [
      ['en varm natt hittades', varmNatt],
      [`ingen vid elden: ingen trivsam önskan (${langtBort.toFixed(2)} ved) och ingen hämtar ved`, langtBort < 1 && ingenHamtar],
      [`${a.name} vid elden vill ha en trivsam eld (${vid.toFixed(2)} ved: ${why.toLowerCase()})`, vid > langtBort && /trivsam/.test(why)],
      [`brasan får sin önskan från ${b.name} som sitter där (${(br.want ?? 0).toFixed(2)} ved)`, (br.want ?? 0) > 1],
      [`båda eldarna fylls på samtidigt (till den första ${tillForsta}, till brasan ${tillBrasan})`, tillForsta === 1 && tillBrasan === 1],
    ];
  },
};

SCENARIER.glod = {
  text: 'Steg 6.3.2: när elden slocknar ligger glöden kvar i tolv timmar. Den som lägger på ved under tiden blåser liv i elden utan flinta och fnöske, och kylan räknas inte som en fara så länge någon eld eller glöd finns. Elden slocknar bara när veden tar slut, inte av slumpen',
  kor: () => {
    const s = createState(3, START);
    const p = living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.ansvar)!;
    Object.assign(s.fire, { lit: true, fuel: 0.001, lightings: 1 });
    stepFire(s, 60, []);
    const slocknade = !s.fire.lit, glod = SIM.emberOn(s, s.fire), kvar = ((s.fire.emberUntil ?? 0) - s.now) / HOUR;
    const glodFinns = SIM.nagonGlod(s);
    s.now += 11 * HOUR; // nästan tolv timmar senare: glöden lever än
    const levande = SIM.emberOn(s, s.fire);
    SIM.addFuel(s, p, 3);
    const tandes = s.fire.lit;
    // samma sak efter mer än tolv timmar: glöden är borta och veden går tillbaka
    const t = createState(3, START), q = living(t).find(x => SIM.ageOf(x, t.now) >= SIM.ALDER.ansvar)!;
    Object.assign(t.fire, { lit: true, fuel: 0.001, lightings: 1 });
    stepFire(t, 60, []);
    t.now += 13 * HOUR; stepFire(t, 60, []);
    const borta = !SIM.emberOn(t, t.fire) && !SIM.nagonGlod(t);
    SIM.addFuel(t, q, 3);
    // en eld med gott om ved brinner ett dygn utan att slockna av sig själv
    const u = createState(3, START);
    Object.assign(u.fire, { lit: true, fuel: 1e6, lightings: 1 });
    let slocknadeAvSlump = false;
    for (let i = 0; i < 24 * 60; i++) { stepFire(u, 60, []); if (!u.fire.lit) slocknadeAvSlump = true; }
    return [
      [`elden slocknade när veden tog slut och glöden ligger kvar (${kvar.toFixed(1)} h)`, slocknade && glod && Math.abs(kvar - SIM.ELD.glodTim) < 0.1],
      ['glöden räknas som en eld (ingen fara av kylan, inget fnöske behövs)', glodFinns],
      [`elva timmar senare lever glöden och ${p.name} blåser liv i den med ved`, levande && tandes],
      ['efter tretton timmar är glöden borta och veden tänder inget', borta && !t.fire.lit],
      ['en eld med ved slocknar inte av sig själv på ett dygn', !slocknadeAvSlump],
    ];
  },
};

SCENARIER.naver = {
  text: 'Steg 6.3.3: näver täljs ur en ved med kniv eller yxa när elden ska tändas, fyra av en ved. En näver ersätter höet vid tändningen och gör chansen större, och med ett blad och ved behöver byn inte samla hö för att kunna tända',
  kor: () => {
    const s = createState(3, START);
    const p = living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.ansvar)!;
    const utanBlad = !SIM.kanTalja(s);
    s.ting = (s.ting ?? []).filter(t => t.k !== 'kniv' && t.k !== 'yxa');
    SIM.newTing(s, 'kniv', 1, p.id);
    setAmount(s, 'torrgras', 0); setAmount(s, 'naver', 0); setAmount(s, 'ved', 10); setAmount(s, 'grenar', 20); setAmount(s, 'flinta', 2); setAmount(s, 'sten', 10);
    Object.assign(s.fire, { lit: false, emberUntil: undefined, fuel: 0 });
    const kan = SIM.canLight(s), behoverInte = !SIM.needTinder(s);
    const ved0 = amountOf(s, 'ved');
    SIM.tryLight(s, p);
    const naverKvar = amountOf(s, 'naver'), vedKvar = amountOf(s, 'ved'), hoKvar = amountOf(s, 'torrgras');
    const v = SIM.grundvarde('naver'), vv = SIM.grundvarde('ved');
    return [
      ['i början finns inget blad att tälja med', utanBlad],
      [`med en kniv och ved kan elden tändas utan hö (${kan ? 'ja' : 'nej'}), och inget hö behöver samlas`, kan && behoverInte],
      [`en ved blev fyra näver och en gick åt: ${ved0 - vedKvar} ved, ${naverKvar} näver kvar`, ved0 - vedKvar === 1 && naverKvar === 3 && hoKvar === 0],
      [`nävern är inte värd mer än veden (${v.toFixed(2)} mot ${vv.toFixed(2)})`, v <= vv && v > 0],
      ['chansen är större med näver', SIM.ELD.naverChans > 1],
    ];
  },
};

SCENARIER.morker = {
  text: 'Steg 6.3.4: den som är vaken i totalmörker (natt och inget ljus från en eld) går och arbetar långsammare och får lite sämre humör. Nära en brinnande eld och på dagen märks inget, och den som sover bryr sig inte',
  kor: () => {
    const s = createState(3, START);
    const p = living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.ansvar)!;
    const e = SIM.eldXY(s, s.fire);
    tandEld(s, 4);
    klockan(s, 23);
    p.x = e.x + 0.5; p.y = e.y + 1.5;
    const vidElden = SIM.morkFart(s, p), ljus = SIM.ljusAt(s, p.x, p.y);
    p.x = e.x + 0.5 + 20;
    const langtBort = SIM.morkFart(s, p);
    SIM.morkHumor(s, p);
    const delar: { namn: string; v: number }[] = []; SIM.moodOf(p, s.now, delar);
    const mork = delar.some(d => d.namn === 'Mörkt');
    klockan(s, 12);
    const dag = SIM.morkFart(s, p);
    klockan(s, 23);
    const q = living(s).find(x => x !== p)!;
    q.x = p.x; q.y = p.y; q.morkT = undefined; q.task = { act: 'sova' } as SIM.Task;
    SIM.morkHumor(s, q);
    Object.assign(s.fire, { lit: false, fuel: 0 });
    p.x = e.x + 0.5; p.y = e.y + 1.5;
    const slocknad = SIM.morkFart(s, p);
    return [
      [`nära den brinnande elden på natten är det ljust (${ljus.toFixed(2)}) och farten som vanligt`, ljus > 0 && vidElden === 1],
      [`tjugo rutor bort i mörkret går man ${langtBort} gånger så fort`, langtBort === SIM.MORKER.fart],
      ['den som är vaken i mörkret får lite sämre humör (Mörkt)', mork],
      ['på dagen märks inget', dag === 1],
      ['den som sover bryr sig inte', q.morkT === undefined],
      ['vid en slocknad eld är det mörkt', slocknad === SIM.MORKER.fart],
    ];
  },
};

SCENARIER.talg = {
  text: 'Steg 6.3.5: slakten ger talg, djurfett i hela stycken: en kanin 1 och en varg 3',
  kor: () => {
    const s = createState(3, START);
    const p = living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.ansvar)!;
    medBank(s);
    for (const r of s.people) r.tek = { ...r.tek, kniv: 1 };
    s.ting = (s.ting ?? []).filter(t => t.k !== 'kniv'); SIM.newTing(s, 'kniv', 1, p.id);
    setMat(s, {}); setMat(s, { vilt: 3 * SIM.KANIN }); setAmount(s, 'talg', 0);
    SIM.bearbeta(s, p, SIM.DJUR.kanin, 1);
    const kanin = amountOf(s, 'talg');
    setAmount(s, 'talg', 0); setAmount(s, 'varg', 1);
    SIM.bearbeta(s, p, SIM.DJUR.varg, 1);
    const varg = amountOf(s, 'talg');
    return [
      [`tre kaniner gav ${kanin} talg`, kanin === 3],
      [`en varg gav ${varg} talg`, varg === 3],
      ['talgen är en sak med namn och bild', !!SIM.SAKER.talg && SIM.SAKER.talg.namn === 'Talg'],
    ];
  },
};

SCENARIER.fackla = {
  text: 'Steg 6.3.6: den som går ut i mörkret tänder en fackla vid elden. Den lyser där hen går, brinner ner, släcks när ljuset inte behövs och är borta när den brunnit ut',
  kor: () => {
    const s = createState(3, START);
    const p = living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.ansvar)!;
    const e = SIM.eldXY(s, s.fire);
    tandEld(s, 4);
    klockan(s, 23);
    s.ting = (s.ting ?? []).filter(t => t.k !== 'fackla');
    const f = SIM.newTing(s, 'fackla', 1, SIM.BYN);
    p.x = e.x + 0.5; p.y = e.y + 1.5;
    p.task = { act: 'samla', tx: e.x + 25.5, ty: e.y + 0.5 } as SIM.Task;
    SIM.facklaVal(s, p);
    const tand = f.tand === p.id;
    p.x = e.x + 15.5;
    const ljus = SIM.ljusAt(s, p.x, p.y), fart = SIM.morkFart(s, p);
    s.now += SIM.HOUR; SIM.facklorTimme(s);
    const brann = f.c < 1 && f.c > 0;
    klockan(s, 12); f.tandT = s.now; // natten har gått timme för timme; här räknas bara gryningen
    SIM.facklorTimme(s);
    const slackt = f.tand === undefined && SIM.tingOf(s).includes(f);
    klockan(s, 23);
    SIM.facklaVal(s, p);
    const igen = f.tand === p.id;
    s.now += Math.ceil(SIM.FACKLA.brinnTim) * SIM.HOUR; SIM.facklorTimme(s);
    const borta = !SIM.tingOf(s).includes(f);
    return [
      ['den som går ut i mörkret tänder facklan vid elden', tand],
      [`facklan lyser där hen går (${ljus.toFixed(2)}) och farten är som vanligt`, ljus > 0 && fart === 1],
      [`facklan brinner ner (${f.c.toFixed(2)} kvar efter en timme)`, brann],
      ['på dagen släcks den och finns kvar', slackt],
      ['nästa natt tänds den igen', igen],
      [`efter ${SIM.FACKLA.brinnTim} timmar har den brunnit ut`, borta],
      ['facklan kräver slaktbänken (talgen)', SIM.TEK.fackla.krav.includes('slaktbank')],
    ];
  },
};

SCENARIER.uppsatt = {
  text: 'Steg 6.3.7: där folk ofta är vakna i mörker blir det ett projekt att sätta upp en fackla. Den tänds när någon vaken är nära och släcks när ingen är kvar eller dagen kommer',
  kor: () => {
    const s = createState(3, START);
    const [p, q] = living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.ansvar);
    const e = SIM.eldXY(s, s.fire);
    Object.assign(s.fire, { lit: false, fuel: 0 });
    klockan(s, 23);
    const x = e.x + 12, y = e.y + 3;
    p.x = x + 0.5; p.y = y + 0.5; p.task = { act: 'samla', tx: x + 0.5, ty: y + 0.5 } as SIM.Task;
    for (let h = 0; h < 4; h++) SIM.morkHumor(s, p);
    const stalle = SIM.morkStalle(s);
    s.ting = (s.ting ?? []).filter(t => t.k !== 'fackla');
    const utan = SIM.PROJEKT.uppsatt.kan(s, p, { kyla: false, gras: 0 });
    SIM.newTing(s, 'fackla', 1, SIM.BYN);
    const med = SIM.PROJEKT.uppsatt.kan(s, p, { kyla: false, gras: 0 });
    const u = SIM.PROJEKT.uppsatt.uppgift(s, p)!;
    SIM.finishUppsatt(s, p, { tx: u.spot!.x, ty: u.spot!.y });
    const upp = s.uppsatta?.[0], tingBorta = !SIM.tingOf(s).some(t => t.k === 'fackla');
    const igen = !!SIM.morkStalle(s);
    SIM.facklorTimme(s);
    const tand = !!upp?.tand, ljus = SIM.ljusAt(s, p.x, p.y);
    p.x = x + 30; p.task = { act: 'sova', tx: x + 30, ty: y } as SIM.Task; q.x = x + 30; q.task = { act: 'sova', tx: x + 30, ty: y } as SIM.Task;
    for (const r of living(s)) if (r !== p && r !== q) { r.x = x + 30; r.task = { act: 'sova', tx: x + 30, ty: y } as SIM.Task; }
    s.now += SIM.HOUR; SIM.facklorTimme(s);
    const slackt = !!upp && !upp.tand && upp.c < 1;
    q.x = x - 0.5; q.task = { act: 'samla', tx: x + 0.5, ty: y + 0.5 } as SIM.Task;
    SIM.facklaVal(s, q);
    const vidVal = !!upp?.tand;
    klockan(s, 12); if (upp) upp.tandT = s.now; SIM.facklorTimme(s);
    const dag = !!upp && !upp.tand;
    return [
      [`där någon varit vaken i mörker fyra timmar behövs en fackla (${stalle ? `${stalle.x - e.x}, ${stalle.y - e.y} från elden` : 'ingen'})`, !!stalle && stalle.x === x && stalle.y === y],
      ['utan en fackla i byn kan ingen sätta upp en', !utan && med],
      ['facklan sätts upp på platsen och tas ur byns saker', !!upp && upp.x === x && upp.y === y && tingBorta],
      ['där den står behövs ingen till', !igen],
      [`den tänds när någon vaken är nära och lyser (${ljus.toFixed(2)})`, tand && ljus > 0],
      ['den släcks när alla sover långt bort, och har brunnit lite', slackt],
      ['den tänds när någon väljer att gå dit', vidVal],
      ['på dagen släcks den', dag],
    ];
  },
};

SCENARIER.talgljus = {
  text: 'Steg 6.3.8: talgljuset görs av två talg och ett torrgräs. Det ställs på ett bord inne där folk är vakna i mörker, lyser upp rummet när någon vaken är där och släcks när ingen är kvar eller dagen kommer',
  kor: () => {
    const s = createState(1, START);
    const hus = medHus(s)!;
    const [p, q] = living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.ansvar);
    const bitar = SIM.bitsOf(s).filter(b => b.hus === hus.id);
    let inne: { x: number; y: number } | undefined;
    for (const b of bitar) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = b.x + dx, y = b.y + dy; if (!inne && SIM.roomAt(s, x, y)?.hus === hus.id && !SIM.stationAt(s, x, y) && SIM.roomAt(s, x + 1, y)?.hus === hus.id && !SIM.stationAt(s, x + 1, y)) inne = { x, y }; }
    const bord = { id: s.nextStation = (s.nextStation ?? 0) + 1, k: 'bord', x: inne!.x, y: inne!.y, kvar: 0 } as SIM.Station;
    (s.stationer ??= []).push(bord); SIM.touch(s);
    Object.assign(s.fire, { lit: false, fuel: 0 });
    klockan(s, 23);
    const sover = (r: SIM.Person) => { r.x = inne!.x + 40; r.task = { act: 'sova', tx: r.x, ty: inne!.y } as SIM.Task; };
    for (const r of living(s)) if (r !== p) sover(r);
    p.x = inne!.x + 0.5; p.y = inne!.y + 0.5; p.task = { act: 'samla', tx: p.x, ty: p.y } as SIM.Task;
    for (let h = 0; h < 4; h++) SIM.morkHumor(s, p);
    const plats = SIM.ljusPlatser(s).some(st => st.id === bord.id);
    s.ting = (s.ting ?? []).filter(t => t.k !== 'talgljus');
    const utan = SIM.PROJEKT.ljus.kan(s, p, { kyla: false, gras: 0 });
    SIM.newTing(s, 'talgljus', 1, SIM.BYN);
    const med = SIM.PROJEKT.ljus.kan(s, p, { kyla: false, gras: 0 }), u = SIM.PROJEKT.ljus.uppgift(s, p)!;
    SIM.finishLjus(s, p, { tx: u.spot!.x, ty: u.spot!.y, ref: u.ref } as SIM.Task);
    const l = s.ljus?.[0], fram = !!l && l.st === bord.id && !SIM.tingOf(s).some(t => t.k === 'talgljus') && !SIM.ljusPlatser(s).length;
    SIM.facklorTimme(s);
    const tand = !!l?.tand, ljus = SIM.ljusAt(s, inne!.x + 0.5, inne!.y + 0.5), fart = SIM.morkFart(s, p);
    sover(p); s.now += SIM.HOUR; SIM.facklorTimme(s);
    const slackt = !!l && !l.tand && l.c < 1 && l.c > 1 - 2 / SIM.LJUS.brinnTim;
    q.x = inne!.x + 10; q.task = { act: 'samla', tx: inne!.x + 0.5, ty: inne!.y + 0.5 } as SIM.Task; SIM.facklaVal(s, q);
    const vidVal = !!l?.tand;
    klockan(s, 12); if (l) l.tandT = s.now; SIM.facklorTimme(s);
    const dag = !!l && !l.tand;
    const r = SIM.SAKER.talgljus?.skaffa?.av;
    return [
      ['talgljuset görs av två talg och ett torrgräs', r?.talg === 2 && r?.torrgras === 1],
      ['där någon varit vaken i mörker vid bordet inne vill byn ha ett ljus på det', plats],
      ['utan ett talgljus kan ingen ställa fram ett', !utan && med],
      ['ljuset ställs på bordet och tas ur byns saker', fram],
      [`det tänds när någon vaken är i rummet och lyser upp det (${ljus.toFixed(2)}), och där går arbetet som vanligt`, tand && ljus === 1 && fart === 1],
      ['det släcks när alla sover, och har brunnit en timme', slackt],
      ['det tänds när någon går dit', vidVal],
      ['på dagen släcks det', dag],
    ];
  },
};

SCENARIER['vinter-slocknad'] = {
  text: 'Istiden börjar med slocknad eld, kolhög och lite grenar: byn tänder igen på kolhögen',
  lang: true,
  kor: () => {
    // flintan lyckas bara ibland (några procent per försök), så provet körs i fem byar och minst två ska få fyr.
    // Kolonin grundas på hösten två dygn (två år i spelet) före istiden. Att i stället låta en ny koloni leva fram
    // till sin första istid (tre veckor, 21 år i spelet) gjorde provet till ett lotteri: de flesta byarna hann dö ut
    // och grundas på nytt, och minsta ändring någon annanstans avgjorde vilka som hade folk kvar när istiden kom
    const byar = [16, 17, 18, 19, 20].map(seed => {
      const s = createState(seed, START), d = new Date(s.now);
      s.kal = { t0: s.now, a0: HOST, b0: Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY) + 2 };
      kor(s, Math.round((ageStart(s, 0) - s.now) / HOUR) - 1); // till istidens början
      Object.assign(s.fire, { lit: false, fuel: 0, emberUntil: undefined, ash: 3, ashUntil: s.now + 3 * DAY });
      setAmount(s, 'ved', 0); setAmount(s, 'grenar', 30); setAmount(s, 'kol', 2); setAmount(s, 'torrgras', 150); // ett känt förråd, så att provet inte beror på vad byn råkade ha
      const t0 = s.now;
      let tand = -1;
      kor(s, 4 * 24, s => { if (tand < 0 && s.fire.lit) tand = (s.now - t0) / HOUR; });
      return { s, tand };
    });
    return [
      ['istid', byar.every(b => b.s.lastAgeIdx === 0)],
      [`elden tändes igen (efter ${byar.map(b => b.tand < 0 ? '–' : b.tand.toFixed(1) + ' h').join(', ')})`, byar.filter(b => b.tand >= 0).length >= 2],
      // att någon fryser ihjäl en vinter utan eld är rimligt, så det kontrolleras inte
      ['tänd på den gamla kolhögen', byar.some(b => logg(b.s, 'på den gamla kolhögen'))]];
  },
};

SCENARIER.knapphet = {
  lang: true,
  text: 'Bär, rötter och vilt tar slut nära byn för en tid, så invånarna går längre bort; fiske med händerna ger få fiskar per försök',
  kor: () => {
    const s = createState(25, START); // by 23 plockar mer långt bort sedan projekten på nivån Förbättra (steg 6.1.17), i kor men inte med minutsteg: brus i en enda by. By 15 svälter ut sedan toa-smutsen kom (steg 2.7.2), by 16 och 17 sedan kartan blev 120 × 120 (2.10.9), by 18 sedan stigarna ligger kvar längre (2.10.15) och by 22 och 26 sedan tiderna följer riktlinjen (2.12.8); det balanseras i 2.12
    // mät varje dygn: buskarna växer tillbaka, så ett enda mått i slutet beror på slumpen
    let nara = 0, langt = 0;
    for (let d = 0; d < 12; d++) { kor(s, 24); const n = uttag(s, 'samla', 0, 8); if (n > nara) { nara = n; langt = uttag(s, 'samla', 16, 30); } }
    const st = s.stat ?? {};
    return [
      // sedan samlandet går fortare (steg 2.12.4, v132) töms buskarna nära byn snabbt och man plockar mer långt bort än förut
      [`mer plockat nära byn än långt bort (${nara.toFixed(3)} mot ${langt.toFixed(3)})`, nara > 0.005 && nara > langt],
      // kaninerna håller sig undan folk, så inom 12 rutor jagas nästan inget (ca 0,001). Inom 30 rutor ca 0,02–0,03 (v47), och
      // ca 0,01 sedan fälten blev större (steg 3.10.23, by 23–28), och ca 0,005 sedan de som pratar går till varandra (steg 4.5.6.7):
      // det som prövas är att viltet jagas alls, inte hur mycket. Sedan jakten är en strid (steg 3.7.3) tar en fångad hare inte
      // ur viltlagret (den är ett djur som dör), så uttaget visas bara; det som räknas är hararna som fångats
      [`vilt jagat (${st.jaktFangst ?? 0} harar fångade; uttaget ur viltlagret inom 30 rutor ${uttag(s, 'jakt', 0, 30).toFixed(3)})`, (st.jaktFangst ?? 0) > 0],
      // fiske väljs inte i alla byar; fisket testas utförligt i fiskespjut-scenariot
      [`fiske: ${st.fiskeForsok ?? 0} försök, ${st.fiskeNapp ?? 0} napp, ${st.fisk ?? 0} fiskar`, !st.fiskeForsok || ((st.fiskeForsok ?? 0) > (st.fiskeNapp ?? 0) && (st.fiskeNapp ?? 0) >= (st.fisk ?? 0))],
      // det fisket gett räknas som de andra arbetena (prod_fiske), så att npm run takt visar fisket (steg 6.1.4)
      [`fångsten räknas som fiskets arbete (${st.prod_fiske ?? 0} av ${st.fisk ?? 0} fiskar)`, (st.prod_fiske ?? 0) === (st.fisk ?? 0)],
      ['ingen svalt ihjäl', !s.people.some(p => p.cause === 'av svält')]];
  },
};

SCENARIER.svamp = {
  lang: true,
  text: 'På hösten plockas kantareller, men ibland följer en giftig orange spindling med; den som förgiftas lär sig skilja dem åt och lär andra',
  kor: () => {
    // vår, sommar och höst. Kantarellerna räknas i fyra byar: i en by är det mycket slump, och sedan steg 2.3.9 är svampen ovanligare
    const byar = [16, 17, 21, 22].map(f => { const b = createState(f, START); kor(b, 21 * 24); return b; });
    const sum = (k: string) => byar.reduce((a, b) => a + ((b.stat as Record<string, number> | undefined)?.[k] ?? 0), 0);
    const st = { giftsvamp: sum('giftsvamp'), giftsvampKand: sum('giftsvampKand') }, svamp = sum('svamp');
    // förgiftning prövas direkt: i de två byarna blir sällan någon förgiftad. Mycket gift i lite mat, så att det händer snart
    const g = createState(18, START), p = living(g)[0]!, kn0 = kn(p, 'svamp');
    setMat(g, { bar: 2 }); setAmount(g, 'giftsvamp', 10);
    for (let i = 0; i < 50 && !g.stat?.forgiftad; i++) eatPoison(g, p);
    const kn1 = kn(p, 'svamp'), gift = amountOf(g, 'giftsvamp');
    // en ensam giftsvamp som förfallit ett slag kan också förgifta (natur-26)
    const e = createState(19, START), q = living(e)[0]!;
    setMat(e, { svamp: 1 }); setAmount(e, 'giftsvamp', 0.9997);
    for (let i = 0; i < 200 && !e.stat?.forgiftad; i++) eatPoison(e, q);
    // giften som sorteras bort är inte heller svamp att äta (natur-46)
    const f = createState(20, START), r = living(f)[0]!;
    setMat(f, { svamp: 12 }); setAmount(f, 'giftsvamp', 10);
    for (let i = 0; i < 50 && !f.stat?.forgiftad; i++) eatPoison(f, r);
    const fGift = amountOf(f, 'giftsvamp'), fSvamp = amountOf(f, 'svamp');
    return [
      [`en ensam giftsvamp (0,9997) kan förgifta (${e.stat?.forgiftad ?? 0} förgiftad)`, (e.stat?.forgiftad ?? 0) === 1],
      [`bortsorterad giftsvamp försvinner ur svampen (svamp 12 till ${fSvamp.toFixed(2)}, gift 9 till ${fGift.toFixed(2)})`, (f.stat?.forgiftad ?? 0) === 1 && fGift < 9 && Math.abs((12 - fSvamp) - (9 - fGift)) < 1e-6],
      [`kantareller plockade i fyra byar (${svamp}, minst 10: hur många beror mycket på slumpen)`, svamp >= 10],
      [`giftsvamp med i korgen (${st.giftsvamp ?? 0}) eller känd och lämnad (${st.giftsvampKand ?? 0})`, (st.giftsvamp ?? 0) + (st.giftsvampKand ?? 0) > 0],
      [`den förgiftade lär sig om svampen (${kn0.toFixed(2)} till ${kn1.toFixed(2)}) och sorterar bort giften (${gift.toFixed(1)} av 9 kvar; ${sum('forgiftad')} förgiftade i byarna)`, (g.stat?.forgiftad ?? 0) === 1 && kn1 > kn0 && gift < 9],
      ['byarna lever', byar.every(b => living(b).length > 0)]];
  },
};

SCENARIER.flinta = {
  lang: true,
  text: 'Flinta hittas mest vid stenarna',
  kor: () => {
    let sten = 0, annan = 0;
    for (const seed of [21, 22, 23, 24]) {
      const s = createState(seed, START);
      kor(s, 10 * 24, s => { if (amountOf(s, 'flinta')) setAmount(s, 'flinta', 0); }); // byn letar hela tiden
      sten += s.stat?.flintaSten ?? 0; annan += s.stat?.flintaAnnan ?? 0;
    }
    return [[`flinta vid stenarna ${sten}, på annat håll ${annan}`, sten > annan && sten > 0]];
  },
};

SCENARIER.kunskap = {
  lang: true,
  text: 'Var och en minns var det finns mat och flinta, berättar det för andra (ibland överdrivet), glömmer med tiden och blir rädd för platser där någon dött',
  kor: () => {
    const s = createState(32, START); // by 31 svälter ihjäl under den långa första vårtiden sedan kalendern kom (1.5.2)
    const ute = living(s).filter(p => (p.lardomar?.length ?? 0) > 0).length;
    // en olycka långt från byn: de som såg den och de närmaste blir rädda
    const f = getMap(s.seed).fire, offer = living(s)[0], vittne = living(s)[2];
    offer.x = vittne.x = Math.min(W - 2, f.x + 14); offer.y = vittne.y = f.y;
    offer.died = s.now;
    fearPlace(s, offer, 'under en jakt');
    const a = areaOf(offer.x, offer.y), radd0 = living(s).filter(p => findL(p, 'fara', a)).length;
    // ingen förgiftning: svampkunskapen sprids genom samtal från en som kan
    const larare = living(s)[3]; larare.kunskap = { svamp: { v: 1, t: s.now } };
    let led2 = 0, hort = 0, radd = 0; // hörda lärdomar och rädsla räknas under hela tiden eftersom de också glöms
    kor(s, 8 * 24, s => {
      const l = living(s).flatMap(p => p.lardomar ?? []);
      led2 = Math.max(led2, l.filter(l => (l.led ?? 0) >= 2).length); hort = Math.max(hort, l.filter(l => l.src !== undefined).length);
      radd = Math.max(radd, living(s).filter(p => findL(p, 'fara', a)).length);
    });
    const L = living(s);
    const kan = L.filter(p => p !== larare && kn(p, 'svamp') > 0.1).length;
    const fel = L.flatMap(p => (p.lardomar ?? []).map(l => describe(s, l).wrong)).filter(Boolean).length;
    // minnet: den med bra minne glömmer långsammare
    const [m1, m2] = L.slice().sort((x, y) => stat(y, 'minne', s.now) - stat(x, 'minne', s.now)).filter((_, i, A) => i === 0 || i === A.length - 1);
    for (const p of [m1, m2]) p.lardomar = [{ k: 'samla', a: 0, v: 0.5, c: 1, t: s.now, led: 0 }];
    forget(s, 72);
    const c1 = m1.lardomar?.[0]?.c ?? 0, c2 = m2.lardomar?.[0]?.c ?? 0;
    // gammal sparfil: byns svampkunskap flyttas till var och en, och alla får egenskapen Minne
    const g = createState(32, START); g.kunskap = { svamp: 0.8 }; for (const p of g.people) delete (p.pot as Record<string, number>).minne;
    g.v = 1; migrate(g); // som en sparfil från före v40
    return [
      [`ingen minns några platser från början (${ute} personer gör det)`, ute === 0],
      [`lärdomar sprids i samtal (upp till ${hort} hörda, ${led2} i andra hand eller längre)`, hort > 10 && led2 > 0],
      [`glömska (${s.stat?.glomt ?? 0} lärdomar glömda)`, (s.stat?.glomt ?? 0) > 0],
      [`bra minne glömmer långsammare (säkerhet efter tre dygn ${c1.toFixed(2)} mot ${c2.toFixed(2)})`, c1 > c2 && c2 < 0.9],
      [`rädsla efter olyckan: ${radd0} genast, upp till ${radd} under åtta dygn`, radd0 >= 1 && radd > radd0],
      [`svampkunskap sprids utan förgiftning (${kan} har lärt sig)`, kan >= 2],
      [`spelaren ser lärdomar som inte stämmer (${fel})`, fel > 0],
      ['gammal sparfil flyttas', g.kunskap === undefined && g.people.every(p => p.pot.minne > 0 && kn(p, 'svamp') === 0.8)],
    ];
  },
};

SCENARIER.temperatur = {
  text: 'Temperaturen följer årstiden och solen med lite slump, och kylan beror på den',
  kor: () => {
    const s = createState(5, START);
    const snitt = (fran: number, timmar: number[]) => { let v = 0, n = 0; for (let d = 0; d < 7; d++) for (const h of timmar) { v += temperature(s, fran + d * DAY + h * HOUR); n++; } return v / n; };
    const var_ = new Date(s.founded).setHours(0, 0, 0, 0) + DAY; // midnatt efter grundandet
    const istid = ageStart(s, 0), sommar = ageStart(s, 2);
    const dag = snitt(sommar, [13, 14, 15, 16]), natt = snitt(sommar, [2, 3, 4, 5]);
    const ist = snitt(istid, [0, 6, 12, 18]), som = snitt(sommar, [0, 6, 12, 18]), vr = snitt(var_, [0, 6, 12, 18]);
    // slumpen: samma klockslag olika dagar ger olika temperatur
    const kl12 = Array.from({ length: 7 }, (_, d) => temperature(s, sommar + d * DAY + 12 * HOUR));
    return [
      [`istiden är kallast och sommaren varmast (istid ${ist.toFixed(0)}°, vår ${vr.toFixed(0)}°, sommar ${som.toFixed(0)}°)`, ist < 0 && ist < vr && vr < som && ageIndex(s, istid) === 0],
      [`dagen är varmare än natten (${dag.toFixed(0)}° mot ${natt.toFixed(0)}°)`, dag > natt + 4],
      [`vädret varierar (${Math.min(...kl12).toFixed(0)}° till ${Math.max(...kl12).toFixed(0)}° kl. 12)`, Math.max(...kl12) - Math.min(...kl12) > 2],
      ['kylan växer när det blir kallare och försvinner när det är varmt', coldOf(-15) > coldOf(0) && coldOf(0) > 0 && coldOf(15) === 0],
    ];
  },
};

SCENARIER.vader = {
  text: 'Vädret (steg 2.11.1–2.11.2): klart, mulet, regn, snö, blåst och åska efter årstiden. Regnet blöter den som är ute, så att den fryser fortare, och vattnar marken så att växterna växer fortare; en eld ute brinner fortare, och väggarna och det som ligger ute slits mer, i regnet',
  kor: () => {
    const s = createState(5, START), t0 = s.now, p = living(s)[0];
    // ett år i spelet (fyra veckor) i sex byar, timme för timme: hur ofta varje väder är, per tidsålder
    const per = [0, 1, 2, 3].map(() => ({} as Partial<Record<VaderId, number>>)), timmar = [0, 0, 0, 0];
    let snoVarmt = 0, regnKallt = 0;
    for (const seed of [5, 1, 2, 3, 4, 6]) {
      const b = seed === 5 ? s : createState(seed, START);
      for (let h = 0; h < 28 * 24; h++) {
        const t = t0 + h * HOUR, ai = ageIndex(b, t), v = vaderNu(b, t), c = temperature(b, t);
        per[ai][v.lage] = (per[ai][v.lage] ?? 0) + 1; timmar[ai]++;
        if (v.sno && c >= VADER.snoGrad) snoVarmt++;
        if (v.nb > 0 && !v.sno && c < VADER.snoGrad) regnKallt++;
      }
    }
    const andel = (ai: number, ...l: VaderId[]) => l.reduce((a, k) => a + (per[ai][k] ?? 0), 0) / timmar[ai];
    const alla = (Object.keys(VADERLAGE) as VaderId[]).filter(k => per.some(x => x[k]));
    // samma by ger samma väder (det räknas ur tiden och fröet)
    const s2 = createState(5, START), lika = [3, 50, 400].every(h => vaderNu(s2, t0 + h * HOUR).lage === vaderNu(s, t0 + h * HOUR).lage);
    // ett regn: den som är ute blir blöt och fryser fortare, och torkar inne
    let tr = t0; while (vaderNu(s, tr).lage !== 'regn' || vaderNu(s, tr).nb < 0.25) tr += HOUR;
    s.now = tr; p.blot = undefined;
    for (let i = 0; i < 4; i++) blotSteg(s, p, true, false, false, 0.25);
    const blot = p.blot ?? 0, underTrad = (() => { const q = { ...p, blot: undefined }; for (let i = 0; i < 4; i++) blotSteg(s, q, true, true, false, 0.25); return q.blot ?? 0; })();
    // regnet sliter mer på väggarna och det som ligger ute (steg 2.11.2)
    const ute = wearMult(s, 1.5, 1.5), slitRegn = vaderSlit(s);
    let tk = t0; while (vaderNu(s, tk).nb > 0) tk += HOUR;
    const nu0 = s.now; s.now = tk; const uteKlart = wearMult(s, 1.5, 1.5), slitKlart = vaderSlit(s); s.now = nu0;
    const kyla = (b: number, temp: number) => { p.blot = b || undefined; return varmeDelar(s, p, coldOf(temp), new Map(), temp).kyla; };
    const torrKyla = kyla(0, 0), blotKyla = kyla(1, 0);
    p.blot = 1; for (let i = 0; i < 4; i++) blotSteg(s, p, false, false, false, 0.5);
    const torkat = p.blot === undefined;
    // regnet vattnar marken, så att växterna växer fortare
    s.vader = { fukt: 0.3, sno: 0 }; const fore = vaxtFaktor(s); stepVader(s); stepVader(s);
    const blotare = s.vader.fukt > 0.3 && vaxtFaktor(s) > fore;
    // en eld ute brinner fortare i regnet
    const e = cloneState(s); e.fire.lit = true; e.fire.fuel = 100;
    stepFire(e, 3600, []); const brann = 100 - e.fire.fuel, vanligt = hearthOf(e.fire).burn;
    // en regngräns över 1 (ett annat balanstal för torkan eller sommaren) ger nästan inget regn, aldrig ständigt regn (kodgenomgången 3.10.25)
    const nbHog = [0.3, 0.6, 0.9, 0.98].map(m => SIM.regnMangd(m, 1.1));
    return [
      [`med regngränsen 1,1 regnar det inte vid vanlig fukt (${nbHog.join(', ')})`, nbHog.every(x => x === 0)],
      [`alla väder förekommer under ett år (${alla.join(', ')})`, ['klart', 'moln', 'regn', 'sno', 'blast'].every(k => alla.includes(k as VaderId))],
      [`det regnar oftare på våren och hösten än på sommaren (${(andel(1, 'regn', 'aska', 'sno') * 100).toFixed(0)} %, ${(andel(3, 'regn', 'aska', 'sno') * 100).toFixed(0)} % mot ${(andel(2, 'regn', 'aska', 'sno') * 100).toFixed(0)} %)`, andel(1, 'regn', 'aska', 'sno') > andel(2, 'regn', 'aska', 'sno') && andel(3, 'regn', 'aska', 'sno') > andel(2, 'regn', 'aska', 'sno')],
      ['det snöar bara när det är kallt, och regnar bara när det inte är det', snoVarmt === 0 && regnKallt === 0],
      ['samma by får samma väder', lika],
      [`den som är ute i regnet blir blöt (${(blot * 100).toFixed(0)} % på en timme, under ett träd ${(underTrad * 100).toFixed(0)} %)`, blot > 0.3 && underTrad < blot],
      [`den som är blöt fryser fortare (${torrKyla.toFixed(3)} mot ${blotKyla.toFixed(3)} i timmen vid 0°)`, blotKyla > torrKyla * 1.5],
      ['den blöta torkar inne', torkat],
      ['regnet vattnar marken och växterna växer fortare', blotare],
      [`regnet sliter mer på väggarna och det som ligger ute (${slitRegn.toFixed(2)} och ${(ute / uteKlart).toFixed(2)} gånger så mycket som när det är uppehåll)`, slitRegn > 1.2 && slitKlart === 1 && ute > uteKlart],
      [`en eld ute brinner fortare i regnet (${brann.toFixed(2)} mot ${vanligt.toFixed(2)} i timmen)`, brann > vanligt * 1.05],
    ];
  },
};

SCENARIER.kalender = {
  lang: true,
  env: STOCKHOLM, // sommartiden finns bara i en tidszon som har den
  text: 'Tidsåldrarna följer kalendern: de börjar en måndag kl. 00, en ny by får en längre första vårtid och en gammal by kommer i fas',
  kor: () => {
    const s = createState(5, START), k0 = kalender(s);
    const mandag = (t: number) => { const d = new Date(t); return d.getDay() === 1 && d.getHours() === 0 && d.getMinutes() === 0; };
    const starter = [k0.slut, ...[2, 3, 0].map(ai => ageStart(s, ai))];
    // en vecka framåt: dag och år följer midnatt
    const k1 = kalender(s, k0.slut + 12 * HOUR);
    // vintertid: 25 oktober 2026 ställs klockan om, men åldern börjar ändå en måndag kl. 00
    const v = createState(5, new Date('2026-10-14T10:00:00+02:00').getTime()), vs = [2, 3, 0].map(ai => ageStart(v, ai));
    // gammal by (grundad 10–17 dygn sedan, före kalendern): tidsåldern slutar den måndag närmast det vanliga slutet som inte varit
    let maxFlytt = 0, allaMandag = true, ingenBakat = true, narmast = true;
    for (let h = 0; h < 7 * 24; h += 7) {
      const g = createState(5, START); g.founded = g.now - 10 * DAY - h * HOUR; delete g.kal;
      const v0 = Math.floor((g.now - g.founded) / (7 * DAY)), gammalSlut = g.founded + (v0 + 1) * 7 * DAY, k = kalender(g);
      maxFlytt = Math.max(maxFlytt, Math.abs(k.slut - gammalSlut));
      allaMandag &&= mandag(k.slut); if (Math.abs(k.slut - gammalSlut) > 3.6 * DAY) narmast &&= k.slut - 7 * DAY <= g.now; // närmare måndag hade redan varit
      ingenBakat &&= k.slut > g.now && k.ai === (1 + v0) % 4;
    }
    // nattens vakt byts kl. 7 enligt kalendern, också i en by som grundats på kvällen: en ny vakt väljs på kvällen, aldrig
    // två samtidigt, och den första natten har en vakt
    const n = createState(5, new Date(2026, 9, 20, 21).getTime()), byten: number[] = [];
    let vakter = 0, forsta = false, forraVakt = n.lastGuardDay;
    for (let i = 0; i < 3 * 24 * 12; i++) {
      step(n, BEAT);
      if (n.lastGuardDay !== forraVakt) { byten.push(new Date(n.now).getHours()); forraVakt = n.lastGuardDay; }
      const nu = living(n).filter(q => q.task?.act === 'vakt').length;
      vakter = Math.max(vakter, nu); if (nu && n.now < n.founded + 10 * HOUR) forsta = true;
    }
    return [
      [`nattens vakt byts på kvällen efter kl. 7 (byten kl. ${byten.join(', ')}), aldrig två samtidigt (högst ${vakter}), och första natten har en vakt`, byten.length >= 3 && byten.every(h => h >= 12) && vakter === 1 && forsta],
      [`första vårtiden är ${k0.av} dagar (7–13)`, k0.ai === 1 && k0.dag === 1 && k0.av >= 7 && k0.av <= 13],
      ['varje tidsålder börjar en måndag kl. 00', starter.every(mandag) && vs.every(mandag)],
      [`efter vårtiden kommer sommar, dag 1 av 7 (${AGES[k1.ai]}, dag ${k1.dag} av ${k1.av})`, k1.ai === 2 && k1.dag === 1 && k1.av === 7],
      [`ett år går vid midnatt (år ${yearNo(s, k0.slut - HOUR)} → ${yearNo(s, k0.slut + HOUR)})`, yearNo(s, k0.slut + HOUR) === yearNo(s, k0.slut - HOUR) + 1],
      [`en gammal by kommer i fas: slutar närmaste måndag som inte varit (flyttas högst ${(maxFlytt / DAY).toFixed(1)} dygn)`, allaMandag && ingenBakat && narmast && maxFlytt < 7 * DAY],
    ];
  },
};

SCENARIER.tider = {
  text: 'Arbetstiderna följer riktlinjen (steg 2.12.8): varje tid i registren har ett slag i TIDSLAG (tider.ts) och ligger inom slagets minuter, t.ex. en liten sak 2–4 minuter, en station 10–20 och en vägg 20 minuter per ruta (en minut är ungefär sex timmar i spelet)',
  kor: () => {
    const alla = allaTider(), utanfor = tiderUtanfor();
    const har = (n: string) => alla.some(t => t.namn === n);
    return [
      ['registren har tider för saker, stationer, väggar, golv och fältet', ['Flintyxa', 'Slaktbänk', 'Timmervägg', 'Jordgolv', 'Fältruta: röja'].every(har)],
      [`alla tider ligger inom sitt slag${utanfor.length ? ` (utanför: ${utanfor.map(t => `${t.namn} ${t.min} min`).join(', ')})` : ''}`, !utanfor.length],
    ];
  },
};

SCENARIER.hardvinter = {
  text: 'Steg 3.8.1: motgångarna (registret MOTGANGAR) räknas ur byns frö och tiden. En hård vinter kommer ungefär var femte istid, aldrig under byns första tio dygn: istiden är 5–8 grader kallare, det snöar mer, elden äter mer ved och vargarna kommer oftare. Den äldsta i byn anar den ett par dygn innan och berättar om det i samtal, och den som vet samlar mer. Den hårda vintern hamnar i byns krönika och barnen minns den',
  kor: () => {
    // 300 byar i 16 istider var (bara fröet behövs): hur ofta vintern blir hård, och aldrig under de första tio dygnen eller i en annan tidsålder
    let istider = 0, harda = 0, tidiga = 0, andra = 0;
    const b = createState(1, START);
    for (let seed = 1; seed <= 300; seed++) {
      b.seed = seed;
      for (let w = 0; w < 64; w++) {
        const t = b.now + w * 7 * DAY + DAY, k = kalender(b, t), m = SIM.motgangNu(b, t);
        if (k.ai !== 0) { if (m?.id === 'hardVinter') andra++; continue; }
        if (k.start < b.founded + SIM.MOTGANG.forstaDygn * DAY) { if (m) tidiga++; continue; }
        istider++; if (m?.id === 'hardVinter') harda++;
      }
    }
    // en by vars nästa istid är hård: den grundades för länge sedan och hösten slutar om knappt tre dygn, så att den äldsta hinner ana den
    const t1 = START + 3 * DAY, fore = (x: State) => { x.founded -= 20 * DAY; x.kal = nyKalender(x.now - 7 * DAY, 3); };
    const hitta = createState(1, t1); fore(hitta);
    let seed = 1; while (seed < 400) { hitta.seed = seed; if (SIM.motgangNasta(hitta)?.id === 'hardVinter') break; seed++; }
    const v: State | undefined = seed < 400 ? createState(seed, t1) : undefined;
    if (v) fore(v);
    const start = v ? SIM.motgangNasta(v)!.start : 0;
    if (!v) return [['en by med en hård vinter strax framför sig', false]];
    // samma tid utan den hårda vintern: kallare, mer snö, mer ved
    const mitt = start + 3 * DAY, utan = <T>(f: () => T) => { const c = SIM.MOTGANGAR.hardVinter.chans; SIM.MOTGANGAR.hardVinter.chans = 0; try { return f(); } finally { SIM.MOTGANGAR.hardVinter.chans = c; } };
    const kallare = utan(() => temperature(v!, mitt)) - temperature(v, mitt);
    let sno = 0, snoUtan = 0;
    const vu = cloneState(v); // en egen by, så att vädret inte hämtas ur det sparade svaret för samma timme
    for (let h = 0; h < 10 * 24; h++) { const t = start + h * HOUR; if (vaderNu(v, t).nb > 0) sno++; if (utan(() => vaderNu(vu, t).nb > 0)) snoUtan++; }
    const e = cloneState(v); e.now = mitt; e.fire.lit = true; e.fire.fuel = 100; stepFire(e, 3600, []);
    const e2 = cloneState(v); e2.now = mitt; e2.fire.lit = true; e2.fire.fuel = 100; utan(() => stepFire(e2, 3600, []));
    const ved = 100 - e.fire.fuel, vedUtan = 100 - e2.fire.fuel;
    // byn går in i den hårda vintern: en gammal, ett barn och de vanliga
    const gammal = nyInvanare(v, 'k', 55), barn = nyInvanare(v, 'm', 8);
    tandEld(v); setMat(v, { bar: 20, torkat: 20 });
    const ch = SIM.UPPLEVELSER.hardVinter.chans; SIM.UPPLEVELSER.hardVinter.chans = 1; // så att barnet säkert minns den
    let anadeFore = false, visste = 0;
    kor(v, (start - v.now) / HOUR + 30, b => { if (b.now < start && gammal.varsel?.t === start) anadeFore = true; if (b.now < start) visste = Math.max(visste, living(b).filter(p => p.varsel?.t === start).length); });
    SIM.UPPLEVELSER.hardVinter.chans = ch;
    const kron = v.hist?.kronika.some(([, t]) => /hård vinter/.test(t)) ?? false;
    const minns = barn.upp?.some(u => u.k === 'hardVinter');
    const fs = (q: Person) => { const c = q.varsel; return c ? SIM.varselSamla(v!, { ...q, varsel: { ...c, t: v!.now + DAY } }) : 0; };
    const merForsiktig = (() => { const q = gammal, s0 = v.seder.v.forsiktighet; v.seder.v.forsiktighet = 1; const hog = fs(q); v.seder.v.forsiktighet = -1; const lag = fs(q); v.seder.v.forsiktighet = s0; return hog > lag; })();
    return [
      [`ungefär var femte istid blir hård (${harda} av ${istider})`, harda > istider * 0.13 && harda < istider * 0.27],
      [`ingen motgång under byns första tio dygn och ingen hård vinter i en annan tidsålder än istiden (${tidiga}, ${andra})`, tidiga === 0 && andra === 0],
      [`den hårda vintern är 5–8 grader kallare (${kallare.toFixed(1)})`, kallare >= 5 && kallare <= 8],
      [`det snöar oftare (${sno} mot ${snoUtan} timmar på tio dygn)`, sno > snoUtan],
      [`elden äter mer ved (${ved.toFixed(2)} mot ${vedUtan.toFixed(2)} i timmen)`, ved > vedUtan * 1.2],
      ['den äldsta anar den hårda vintern innan den kommer', anadeFore],
      [`varslet sprids i samtal (${visste} visste innan, ${(v.stat?.varselBerattat ?? 0)} gånger berättat)`, visste >= 2],
      ['en förutseende by vill samla mer när den vet', merForsiktig],
      [`den hårda vintern kom (${(v.stat?.motgang_hardVinter ?? 0)}) och står i byns krönika`, (v.stat?.motgang_hardVinter ?? 0) === 1 && kron],
      [`barnet minns den (${barn.upp?.map(u => u.k).join(', ') || 'inget'})`, !!minns],
    ];
  },
};

SCENARIER.kloka = {
  text: 'Steg 3.8.6: den klokaste i byn anar en hård vinter eller en torka tidigare än den äldsta, ju klokare desto tidigare (upp till tre dygn före, mot ett till två för den äldsta) och säkrare. Varslet sprids i samtal som förut, och i en by där ingen är klok nog anar bara den äldsta',
  kor: () => {
    // en by vars nästa tidsålder har en hård vinter, som börjar om tre till sex dygn
    const fore = (x: State) => { x.founded -= 20 * DAY; x.kal = nyKalender(x.now - 3 * DAY, 3); };
    let v: State | undefined;
    for (let seed = 1; seed < 600 && !v; seed++) {
      const b = createState(seed, START); fore(b);
      const m = SIM.motgangNasta(b);
      if (m?.id === 'hardVinter' && m.start - b.now > 3.2 * DAY && m.start - b.now < 6 * DAY) v = b;
    }
    if (!v) return [['en by med en hård vinter några dygn framför sig', false]];
    const start = SIM.motgangNasta(v)!.start;
    // en klok, en gammal och de andra mindre kloka än klokFran
    const klok = nyInvanare(v, 'k', 30), gammal = nyInvanare(v, 'm', 58);
    for (const p of living(v)) p.pot.intelligens = 8;
    klok.pot.intelligens = 20;
    // timme för timme fram till vintern, bara motgångarna (inga samtal): när och hur säkert de anar den
    const anar = (b: State, ids: number[]) => {
      const nar: Record<number, { t: number; c: number }> = {};
      for (let t = b.now; t < start; t += HOUR) { b.now = t; SIM.stepMotgang(b); for (const id of ids) { const p = b.people.find(q => q.id === id)!; if (!nar[id] && p.varsel?.t === start) nar[id] = { t: (start - t) / DAY, c: p.varsel.c }; } }
      return nar;
    };
    const a = anar(cloneState(v), [klok.id, gammal.id]);
    const halv = cloneState(v); halv.people.find(q => q.id === klok.id)!.pot.intelligens = 15;
    const b = anar(halv, [klok.id]);
    const trog = cloneState(v); trog.people.find(q => q.id === klok.id)!.pot.intelligens = 8;
    const c = anar(trog, [klok.id, gammal.id]);
    // i byn: varslet sprids i samtal innan den äldsta anar det
    tandEld(v); setMat(v, { bar: 20, torkat: 20 });
    kor(v, (start - 2.1 * DAY - v.now) / HOUR);
    const hort = living(v).filter(p => p.varsel?.t === start && p.varsel.src !== undefined).length;
    const f = (x?: { t: number; c: number }) => x ? `${x.t.toFixed(1)} dygn innan, säker ${x.c.toFixed(2)}` : 'inte alls';
    // en motgång som tar slut när nästa börjar direkt efter: slutet räknas ändå, och de som klarade den minns den (kodgenomgången 3.10.25)
    let gr: State | undefined, gm: ReturnType<typeof SIM.motgangNu>;
    for (let seed = 1; seed < 400 && !gr; seed++) { const b = createState(seed, START); b.founded -= 20 * DAY; for (let w = 0; w < 64 && !gr; w++) { const m = SIM.motgangNu(b, b.now + w * 7 * DAY + DAY); if (m) { gr = b; gm = m; } } }
    let foreSlut = false, foreKvar = '', foreMinns = 0;
    if (gr && gm) {
      gr.now = gm.start; (gr.motgang ??= {}).pagar = { k: 'torka', t: gm.start - 7 * DAY, dog: 0 };
      const lev = living(gr)[0];
      SIM.stepMotgang(gr);
      foreSlut = gr.log.some(r => r.text.startsWith(SIM.MOTGANGAR.torka.slutar)); foreKvar = gr.motgang.pagar?.k ?? ''; foreMinns = lev.liv?.['mg:torka'] ?? 0;
    }
    return [
      [`torkan tar slut när ${gm?.id ?? 'nästa motgång'} börjar direkt efter (${foreSlut ? 'slutet loggades' : 'inget slut'}, de som klarade den minns den ${foreMinns} gång), och den nya pågår (${foreKvar})`, foreSlut && foreMinns === 1 && foreKvar === gm?.id],
      [`den klokaste (intelligens 20) anar den tre dygn innan och säkrare (${f(a[klok.id])})`, !!a[klok.id] && a[klok.id].t > 2.9 && a[klok.id].t <= 3.05 && a[klok.id].c > 0.9],
      [`den äldsta anar den ett till två dygn innan (${f(a[gammal.id])})`, !!a[gammal.id] && a[gammal.id].t >= 0.95 && a[gammal.id].t <= 2.05 && Math.abs(a[gammal.id].c - SIM.MOTGANG.varselSaker) < 1e-9],
      [`en mindre klok (intelligens 15) anar den senare och mindre säkert (${f(b[klok.id])})`, !!b[klok.id] && b[klok.id].t < a[klok.id]?.t && b[klok.id].t > 1.5 && b[klok.id].c < a[klok.id].c],
      [`när ingen är klok nog anar bara den äldsta (den klokaste: ${f(c[klok.id])}, den äldsta: ${f(c[gammal.id])})`, !c[klok.id] && !!c[gammal.id] && (trog.stat?.varselKlok ?? 0) === 0],
      [`varslet sprids i samtal innan den äldsta anar det (${hort} har hört det)`, hort >= 1],
    ];
  },
};

SCENARIER.torka = {
  lang: true,
  text: 'Steg 3.8.2: torkan kommer ibland på sommaren. Nästan inget regn, marken torkar, sjöarna drar sig tillbaka till torr sjöbotten som går att gå på och små tjärnar torkar ut. Folk kan ändå dricka, grödor som inte vattnas vissnar och ägaren vattnar sitt fält med vattensäcken. När torkan är över och det har regnat kommer vattnet tillbaka',
  kor: () => {
    // en by med en tjärn, mitt i en torka som just börjat (sommaren slutar om sju dygn)
    const fore = (x: State) => { x.founded -= 20 * DAY; x.kal = nyKalender(x.now - DAY / 2, 2); };
    let v: State | undefined;
    for (let seed = 1; seed < 600 && !v; seed++) {
      const b = createState(seed, START); fore(b);
      const m = SIM.motgangNu(b);
      if (m?.id === 'torka' && SIM.sjoarna(seed).rutor.some((r, n) => n > 0 && r.length <= SIM.TORKA.liten)) v = b;
    }
    if (!v) return [['en by med en tjärn mitt i en torka', false]];
    const s = v, m = SIM.motgangNu(s)!;
    tandEld(s); setMat(s, { bar: 40, torkat: 40 });
    const vatten0 = SIM.vattenNu(s).filter(t => t === T.Vatten).length;
    // två fält med växande ärter: det ena hos en med vattensäck, det andra utan ägare som vattnar
    const vuxna = living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), c = SIM.bynsMitt(s), g = getMap(s.seed).tiles;
    const ledigt = (x0: number, y0: number) => { for (let k = 0; k < 6; k++) { const x = x0 + k % 3, y = y0 + Math.floor(k / 3); if (g[y * W + x] !== T.Gras) return false; } return true; };
    const platser: { x: number; y: number }[] = [];
    for (let r = 4; r < 20 && platser.length < 2; r++) for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]]) { const x = Math.floor(c.x) + dx, y = Math.floor(c.y) + dy; if (platser.length < 2 && ledigt(x, y) && !platser.some(q => Math.abs(q.x - x) < 5 && Math.abs(q.y - y) < 5)) platser.push({ x, y }); }
    s.falt = platser.map((at, i) => ({ id: i + 1, x: at.x, y: at.y, w: 3, dir: 1, n: 6, agare: i ? -1 : vuxna[0].id, steg: 'vaxer', klara: 0, kvar: 0, sadda: 6, groda: 'arter', vuxit: 0, rord: s.now } as SIM.Falt));
    s.nextFalt = 2; s.byggV = (s.byggV ?? 0) + 1;
    SIM.addTool(s, 'vattensack', vuxna[0]);
    // torkan: fyra och ett halvt dygn (år i spelet)
    kor(s, (m.start + 4.5 * DAY - s.now) / HOUR);
    const utanVatten = living(s).filter(p => !SIM.drickPlats(s, p)).length, torstDoda = s.people.filter(p => /törst/.test(p.cause ?? '')).length;
    const lera = SIM.torrRutor(s), tomma = s.sjoTorr?.tomma ?? [], vatten1 = SIM.vattenNu(s).filter(t => t === T.Vatten).length;
    const tjarnTorr = tomma.length > 0 && tomma.every(n => SIM.sjoarna(s.seed).rutor[n].every(i => SIM.vattenNu(s)[i] === T.Lera));
    const torrMark = (s.vader?.fukt ?? 1);
    const vattnat = s.stat?.vattnat ?? 0, vissnat = s.stat?.vissnat ?? 0, kvar = !!s.falt?.[0]?.groda; // det andra fältet kan tas och sås om av någon annan, och vissna igen
    // ingen står i vattnet, och den torra sjöbotten går att gå på
    const iVattnet = living(s).filter(p => SIM.iVattnetNu(s, Math.floor(p.y) * W + Math.floor(p.x))).length;
    const gar = SIM.GANG.fartMark[T.Lera] > 0;
    // den som fiskar från stranden tar fisken ur vattnet som finns kvar, inte ur den torra sjöbotten (takeFrom i fynd.ts, kodgenomgången 3.10.25)
    let iTorr = 0, iVatten = 0;
    {
      const q = cloneState(s), vn = SIM.vattenNu(q), cq = SIM.bynsMitt(q);
      let ruta: { x: number; y: number } | undefined, bd = Infinity;
      for (let y = 3; y < SIM.H - 3; y++) for (let x = 3; x < W - 3; x++) {
        if (vn[y * W + x] === T.Vatten || vn[y * W + x] === T.Lera) continue;
        let v = false, l = false; // både vatten och torr sjöbotten framför
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const j = (y + dy) * W + x + dx; if (vn[j] === T.Vatten) v = true; else if (vn[j] === T.Lera) l = true; }
        const d = Math.hypot(x - cq.x, y - cq.y);
        if (v && l && d < bd) { bd = d; ruta = { x, y }; }
      }
      if (ruta) {
        const tagna = () => { const tk = SIM.takenOf(q); let a = 0, b = 0; for (const f of Object.values(tk)) if (f) for (let i = 0; i < W * SIM.H; i++) if (vn[i] === T.Lera) a += f[i]; else if (vn[i] === T.Vatten) b += f[i]; return [a, b]; };
        const [a0, b0] = tagna();
        for (let n = 0; n < 10; n++) SIM.takeFrom(q, 'fiske', ruta.x + 0.5, ruta.y + 0.5, 1);
        const [a1, b1] = tagna(); iTorr = a1 - a0; iVatten = b1 - b0;
      }
    }
    // efter torkan: vattnet kommer tillbaka när det har regnat (högst sex dygn)
    kor(s, (m.slut - s.now) / HOUR + 1);
    const efter = s.sjoTorr ? 1 : 0;
    let tillbaka = 0;
    for (let h = 0; h < 6 * 24 && s.sjoTorr; h++) { kor(s, 1); tillbaka = h + 1; }
    const vatten2 = SIM.vattenNu(s).filter(t => t === T.Vatten).length;
    return [
      [`sjöarna har dragit sig tillbaka (${lera} rutor torr sjöbotten, ${vatten0} → ${vatten1} rutor vatten)`, lera > 0 && vatten1 < vatten0],
      [`små tjärnar har torkat ut (${tomma.length})`, tjarnTorr],
      [`marken är torr (fukt ${torrMark.toFixed(2)})`, torrMark < 0.2],
      ['den torra sjöbotten går att gå på', gar],
      [`ingen står i vattnet (${iVattnet})`, iVattnet === 0],
      [`fisket från stranden tar ur vattnet som finns kvar (${iVatten.toFixed(3)}) och inget ur den torra sjöbotten (${iTorr.toFixed(3)})`, iVatten > 0 && iTorr === 0],
      [`alla hittar vatten att dricka (${utanVatten} utan) och ingen dör av törst (${torstDoda})`, utanVatten === 0 && torstDoda === 0],
      [`ägaren med säck vattnar sitt fält (${vattnat} säckar, grödan ${kvar ? 'står kvar' : 'vissnade'}), grödan på det andra vissnar (${vissnat})`, vattnat > 0 && kvar && vissnat >= 1],
      [`vattnet kommer tillbaka efter torkan (${efter ? `tillbaka ${tillbaka} timmar efter torkan` : 'redan när torkan slutade'}, ${vatten2} rutor vatten)`, !s.sjoTorr && vatten2 === vatten0],
      [`torkan kom (${s.stat?.motgang_torka ?? 0})`, (s.stat?.motgang_torka ?? 0) === 1],
    ];
  },
};

SCENARIER.avskuren = {
  text: 'Den som vattnet har skurit av från lägret (en udde på torr sjöbotten som blev en ö när sjön kom tillbaka) vadar i land när vattnet ändras: hen hamnar på den närmaste rutan som når lägret och går inte rakt över vattnet (vaktlarmet i by 777, v206)',
  kor: () => {
    // en by med en ö i sjön: land som inte når lägret
    let s: State | undefined, o = -1;
    for (let seed = 777; seed < 900 && !s; seed++) {
      const b = createState(seed, START), g = groundOf(b), f = SIM.eldPlats(b), n = SIM.nasbara(g, f.x + 0.5, f.y + 0.5);
      for (let i = 0; i < g.tiles.length && o < 0; i++) if (g.tiles[i] !== T.Vatten && !g.solid?.[i] && !g.hinder?.[i] && !n[i]) o = i;
      if (o >= 0) s = b;
    }
    if (!s) return [['en by med en ö i sjön', false]];
    const p = living(s)[0], ox = o % W + 0.5, oy = Math.floor(o / W) + 0.5;
    p.x = ox; p.y = oy; p.task = undefined;
    SIM.vattnetAndrat(s, SIM.vattenNu(s).slice());
    const f = SIM.eldPlats(s), lagret = SIM.nasbara(groundOf(s), f.x + 0.5, f.y + 0.5), flytt = Math.hypot(p.x - ox, p.y - oy);
    const iLand = lagret[tileOf(p.x, p.y)] === 1;
    // sedan går hen som vanligt, och ingen står i vattnet
    let iVattnet = 0;
    for (let h = 0; h < 12; h++) { kor(s, 1); iVattnet += living(s).filter(q => SIM.iVattnetNu(s!, tileOf(q.x, q.y))).length; }
    return [
      [`hen hamnar på en ruta som når lägret (${flytt.toFixed(1)} rutor från ön)`, iLand && flytt < 20],
      [`ingen står i vattnet de följande tolv timmarna (${iVattnet})`, iVattnet === 0],
    ];
  },
};

SCENARIER.oversvamning = {
  lang: true,
  text: 'Steg 3.8.3: översvämningen kommer ibland på våren och hösten. Efter ett långt regn stiger sjön en ruta i taget en till tre rutor upp på land, står kvar ett par dygn och sjunker. Maten under vatten förstörs, lätta saker (grenar) flyter bort ute, tunga saker (sten) ligger kvar och slits fortare, fält under vatten dör och ingen står i vattnet. Efteråt är stranden som förut',
  kor: () => {
    // en by vars vårtid just börjat och har en översvämning som når minst två rutor upp på land
    const fore = (x: State) => { x.founded -= 20 * DAY; x.kal = nyKalender(x.now - HOUR, 1); };
    let v: State | undefined;
    for (let seed = 1; seed < 800 && !v; seed++) {
      const b = createState(seed, START); fore(b);
      const m = SIM.motgangNu(b);
      if (m?.id !== 'oversvamning') continue;
      let topp = 0;
      for (let t = m.start; t < m.slut; t += HOUR) topp = Math.max(topp, SIM.flodNiva(b, t));
      if (topp >= 2) v = b;
    }
    if (!v) return [['en by med en översvämning på våren', false]];
    const s = v, m = SIM.motgangNu(s)!;
    tandEld(s); setMat(s, { bar: 40, torkat: 40 });
    const vatten0 = SIM.vattenNu(s).filter(t => t === T.Vatten).length;
    // regnet innan och medan vattnet stiger
    let regn = 0, regnUtan = 0;
    const vu = cloneState(s), c0 = SIM.MOTGANGAR.oversvamning.chans;
    for (let h = 0; h < 2 * 24; h++) { const t = m.start + h * HOUR; if (vaderNu(s, t).nb > 0) regn++; SIM.MOTGANGAR.oversvamning.chans = 0; try { if (vaderNu(vu, t).nb > 0) regnUtan++; } finally { SIM.MOTGANGAR.oversvamning.chans = c0; } }
    // fram till timmen innan vattnet börjar stiga
    let b0 = m.start; while (!SIM.flodNiva(s, b0 + HOUR)) b0 += HOUR;
    kor(s, (b0 - s.now) / HOUR);
    // på stranden närmast byn (en ruta från vattnet): en hög bär, en hög grenar och en hög sten, och ett fält med ärter
    const { land } = SIM.djupOf(s.seed), g = getMap(s.seed).tiles, c = SIM.bynsMitt(s);
    const strand: { x: number; y: number }[] = [];
    for (let i = 0; i < W * W; i++) if (land[i] === 1 && g[i] !== T.Sten) strand.push({ x: i % W, y: Math.floor(i / W) });
    strand.sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y));
    const [pb, pg, ps] = [strand[0], strand.find(p => Math.hypot(p.x - strand[0].x, p.y - strand[0].y) >= 3)!, strand.find(p => Math.hypot(p.x - strand[0].x, p.y - strand[0].y) >= 6)!];
    s.stackar!.push({ k: 'rotter', n: 200, c: 1, x: pb.x, y: pb.y }, { k: 'grenar', n: 8, c: 1, x: pg.x, y: pg.y }, { k: 'sten', n: 3, c: 1, x: ps.x, y: ps.y });
    SIM.tidy(s);
    const pf = strand.find(p => Math.hypot(p.x - strand[0].x, p.y - strand[0].y) >= 9)!;
    s.falt = [{ id: 1, x: pf.x, y: pf.y, w: 1, dir: 1, n: 1, agare: -1, steg: 'vaxer', klara: 0, kvar: 0, sadda: 1, groda: 'arter', vuxit: 0, rord: s.now } as SIM.Falt];
    s.nextFalt = 1; s.byggV = (s.byggV ?? 0) + 1;
    const hog = (k: string, p: { x: number; y: number }) => (s.stackar ?? []).find(a => a.k === k && a.x === p.x && a.y === p.y);
    const slit0 = wearMult(s, ps.x, ps.y);
    // tills vattnet står som högst
    let hogst = 0, iVattnet = 0, slit1 = 0, q2: State | undefined;
    let malIVatten = 0; // någon går för att bära något som ligger i vattnet (bara mot en ruta under vatten)
    for (let h = 0; h < 4 * 24 && !(hogst && (s.flod?.niva ?? 0) < hogst); h++) {
      kor(s, 1, s => { if (s.flod) for (const p of living(s)) if (p.task?.act === 'bara' && SIM.iVattnetNu(s, Math.floor(p.task.ty) * W + Math.floor(p.task.tx))) malIVatten++; });
      if ((s.flod?.niva ?? 0) > hogst) { hogst = s.flod!.niva; slit1 = wearMult(s, ps.x, ps.y); }
      if (!q2 && hogst >= 2) q2 = cloneState(s);
      iVattnet = Math.max(iVattnet, living(s).filter(p => SIM.iVattnetNu(s, Math.floor(p.y) * W + Math.floor(p.x))).length);
    }
    const vatten1 = SIM.vattenNu(s).filter(t => t === T.Vatten).length;
    const barKvar = hog('rotter', pb)?.n ?? 0, grenKvar = hog('grenar', pg)?.n ?? 0, stenKvar = hog('sten', ps)?.n ?? 0;
    const faltDog = (s.stat?.['drankt falt'] ?? 0) >= 1, frost = s.stat?.frostdod ?? 0;
    // efter tidsåldern: vattnet är tillbaka vid stranden och stenen ligger kvar
    kor(s, (m.slut - s.now) / HOUR + 1);
    const vatten2 = SIM.vattenNu(s).filter(t => t === T.Vatten).length;
    // en hylla i förrådshuset tas inte isär för att vattnet en tid står runt huset: det sjunker undan (kodgenomgången 3.10.25)
    let hyllor = 0, hyllorKvar = 0;
    for (const seed of [4, 5, 6]) {
      const h = createState(seed, START); klockan(h); tandEld(h); medHus(h); h.ruttet = 50;
      const hh = medHus(h), z = SIM.zonesOf(h).find(q => q.hus === hh?.id);
      if (!hh || !z) continue;
      hh.slag = 'material'; z.slag = 'material'; h.ruttet = 0; SIM.touch(h);
      (h.stationer ??= []).push({ id: h.nextStation = (h.nextStation ?? 0) + 1, k: 'hylla', x: z.x + (z.w > 1 ? 1 : 0), y: z.y, kvar: 0, inne: 1 } as SIM.Station); SIM.touch(h);
      SIM.stepStationer(h);
      if (!SIM.stationerOf(h).some(q => q.k === 'hylla')) continue;
      hyllor++;
      h.flod = { niva: 3, hogst: 3 }; SIM.nyttVatten(h); h.byggV = (h.byggV ?? 0) + 1;
      SIM.stepStationer(h);
      if (SIM.stationerOf(h).some(q => q.k === 'hylla')) hyllorKvar++;
    }
    // mat som vattnet hotar men som ingen når (här en ö som vattnet och timmer stänger in) får de vuxna inte att stå utan något att göra (kodgenomgången 3.10.25)
    // det som ligger i vattnet hämtar ingen medan vattnet står där (haulJob i lager.ts, kodgenomgången 3.10.25)
    let hjVatten = false;
    if (q2) {
      const q = cloneState(q2), cq = SIM.bynsMitt(q);
      let ruta: { x: number; y: number } | undefined, bd = Infinity;
      for (let i = 0; i < W * SIM.H; i++) {
        const x = i % W, y = Math.floor(i / W), d = Math.hypot(x - cq.x, y - cq.y);
        if (SIM.iVattnetNu(q, i) && SIM.djupOf(q.seed).land[i] && d < bd) { bd = d; ruta = { x, y }; } // en landruta under vattnet
      }
      if (ruta) {
        q.stackar!.push({ k: 'sten', n: 2, c: 1, x: ruta.x, y: ruta.y }); SIM.tidy(q);
        const hj = SIM.haulJob(cloneState(q)); // haulJob ordnar också redskapen: på en kopia
        hjVatten = !!hj && SIM.iVattnetNu(q, Math.floor(hj.y) * W + Math.floor(hj.x));
      }
    }
    let utan = 0, steg = 0, dodaQ = 0, inmurad = false;
    if (q2) {
      const q = q2, cq = SIM.bynsMitt(q), gq = getMap(q.seed).tiles;
      let ruta: { x: number; y: number } | undefined, bd = Infinity;
      for (let y = 2; y < SIM.H - 2; y++) for (let x = 2; x < W - 2; x++) {
        const i = y * W + x, d = Math.hypot(x - cq.x, y - cq.y);
        if (SIM.iVattnetNu(q, i) || !SIM.flodHotad(q, i) || gq[i] === T.Vatten || gq[i] === T.Sten || !SIM.ledig(q, x, y) || d <= 4) continue;
        let fritt = true;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && !SIM.iVattnetNu(q, (y + dy) * W + x + dx) && !SIM.ledig(q, x + dx, y + dy)) fritt = false;
        if (fritt && d < bd) { bd = d; ruta = { x, y }; }
      }
      if (ruta) {
        inmurad = true;
        q.stackar!.push({ k: 'rotter', n: 6, c: 1, x: ruta.x, y: ruta.y }); SIM.tidy(q);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && !SIM.iVattnetNu(q, (ruta.y + dy) * W + ruta.x + dx))
          SIM.bitsOf(q).push({ id: q.nextBit = (q.nextBit ?? 0) + 1, x: ruta.x + dx, y: ruta.y + dy, k: SIM.MATERIAL.timmer.k, m: 'timmer', b: 1, mat: SIM.MATERIAL.timmer.n, c: 1 } as SIM.Bit);
        SIM.touch(q);
        const vuxna = living(q).filter(p => SIM.ageOf(p, q.now) >= SIM.ALDER.vuxen);
        for (let k = 0; k < 6 * STEG_TIM; k++) {
          step(q, BEAT);
          for (const p of vuxna) if (SIM.alive(p)) { steg++; if (!p.task) utan++; }
        }
        dodaQ = vuxna.filter(p => !SIM.alive(p)).length;
      }
    }
    return [
      [`mat som vattnet hotar men ingen når får inte de vuxna att stå utan något att göra (${utan} av ${steg} steg på 6 timmar, ${dodaQ} döda)`, inmurad && utan < steg / 4 && dodaQ === 0],
      [`det regnar mer innan och medan vattnet stiger (${regn} timmar mot ${regnUtan} utan översvämningen, av 48)`, regn > regnUtan],
      [`sjön svämmar över ${hogst} rutor upp på land (${vatten0} → ${vatten1} rutor vatten)`, hogst >= 2 && vatten1 > vatten0],
      [`maten på stranden förstördes (${s.stat?.['flod mat'] ?? 0} rötter; resten bars in innan, ${barKvar} kvar av 200)`, barKvar === 0 && (s.stat?.['flod mat'] ?? 0) > 0],
      [`grenarna flöt bort (${grenKvar} kvar av 8)`, grenKvar === 0],
      [`stenen ligger kvar (${stenKvar} av 3) och slits fortare i vattnet (${slit0.toFixed(2)} → ${slit1.toFixed(2)})`, stenKvar === 3 && slit1 > slit0 * 2],
      [`ärterna på fältet under vatten dog${frost ? ` (frosten tog ${frost})` : ''}`, faltDog],
      [`ingen står i vattnet (högst ${iVattnet}) eller går ut i det för att bära något (${malIVatten} steg)`, iVattnet === 0 && malIVatten === 0],
      [`stenen som ligger i vattnet väljs inte för att bäras in medan vattnet står där${hjVatten ? ' (väljs)' : ''}`, !hjVatten],
      [`vattnet är tillbaka vid stranden efteråt (${vatten2} rutor, ${s.flod ? 'nivå ' + s.flod.niva : 'ingen översvämning'})`, !s.flod && vatten2 === vatten0],
      [`översvämningen kom (${s.stat?.motgang_oversvamning ?? 0})`, (s.stat?.motgang_oversvamning ?? 0) === 1],
      [`hyllan i förrådshuset står kvar medan vattnet står runt huset (${hyllorKvar} av ${hyllor})`, hyllor > 0 && hyllorKvar === hyllor],
    ];
  },
};

SCENARIER.flodrest = {
  text: 'Steg 3.8.7: medan vattnet stiger bär de vuxna undan maten från lagerplatserna som vattnet kan nå; när vattnet sjunker minns byn hur högt det nådde (en lärdom) och bygger inte där; ett jordgolv under vatten blir lera och torkar till jordgolv igen; en vägg i vattnet slits fortare; ingen sover på en blöt ruta; en brasa i vattnet slocknar',
  kor: () => {
    // en by vars vårtid just börjat och har en översvämning som når minst två rutor upp på land
    const fore = (x: State) => { x.founded -= 20 * DAY; x.kal = nyKalender(x.now - HOUR, 1); };
    let v: State | undefined;
    for (let seed = 1; seed < 800 && !v; seed++) {
      const b = createState(seed, START); fore(b);
      const m = SIM.motgangNu(b);
      if (m?.id !== 'oversvamning') continue;
      let topp = 0;
      for (let t = m.start; t < m.slut; t += HOUR) topp = Math.max(topp, SIM.flodNiva(b, t));
      if (topp >= 2) v = b;
    }
    if (!v) return [['en by med en översvämning på våren', false]];
    const s = v, m = SIM.motgangNu(s)!;
    tandEld(s); setMat(s, { bar: 40, torkat: 40 });
    let b0 = m.start; while (!SIM.flodNiva(s, b0 + HOUR)) b0 += HOUR;
    kor(s, (b0 - s.now) / HOUR);
    const { land } = SIM.djupOf(s.seed), g = getMap(s.seed).tiles, c = SIM.bynsMitt(s);
    const fritt = (x: number, y: number) => x > 0 && y > 0 && x < W - 1 && y < W - 1 && g[y * W + x] !== T.Sten && g[y * W + x] !== T.Vatten && SIM.ledig(s, x, y) && !SIM.bitAt(s, x, y);
    const nara = (f: (i: number) => boolean, ej: { x: number; y: number }[] = []) => {
      let b: { x: number; y: number } | undefined, bd = Infinity;
      for (let i = 0; i < W * W; i++) {
        const x = i % W, y = Math.floor(i / W), d = Math.hypot(x - c.x, y - c.y);
        if (d < bd && f(i) && fritt(x, y) && ej.every(q => Math.hypot(q.x - x, q.y - y) >= 4)) { bd = d; b = { x, y }; }
      }
      return b!;
    };
    // ett hus (4 × 3, timmerväggar, öppning i söder, trägolv) där en golvruta ligger högst två rutor upp på land
    let hus: { x: number; y: number } | undefined, hd = Infinity;
    for (let y = 1; y < W - 4; y++) for (let x = 1; x < W - 5; x++) {
      const d = Math.hypot(x - c.x, y - c.y);
      if (d >= hd || Math.min(land[(y + 1) * W + x + 1], land[(y + 1) * W + x + 2]) > 2) continue;
      let ok = true;
      for (let yy = y; yy < y + 3 && ok; yy++) for (let xx = x; xx < x + 4 && ok; xx++) ok = fritt(xx, yy);
      if (ok) { hd = d; hus = { x, y }; }
    }
    if (!hus) return [['en plats för ett hus vid stranden', false]];
    const h: SIM.Hus = { id: (s.nextBit ??= 1), namn: 'Hydda', x: hus.x, y: hus.y, w: 4, h: 3, fn: 'sovsal', klar: s.now };
    s.nextBit++;
    for (let yy = hus.y; yy < hus.y + 3; yy++) for (let xx = hus.x; xx < hus.x + 4; xx++) {
      const edge = xx === hus.x || yy === hus.y || xx === hus.x + 3 || yy === hus.y + 2, open = xx === hus.x + 2 && yy === hus.y + 2;
      const mt = open ? 'oppning' : edge ? 'timmer' : 'tra';
      SIM.bitsOf(s).push({ id: s.nextBit++, x: xx, y: yy, k: SIM.MATERIAL[mt].k, m: mt, b: 1, mat: SIM.MATERIAL[mt].n, c: 1, hus: h.id });
    }
    SIM.housesOf(s).push(h); SIM.touch(s);
    const golv = [(hus.y + 1) * W + hus.x + 1, (hus.y + 1) * W + hus.x + 2], rekt = [{ x: hus.x + 1, y: hus.y + 1 }];
    // på stranden: ett jordgolv och en vägg en ruta från vattnet, en vägg långt därifrån, en tänd brasa en ruta från vattnet,
    // och när vattnet stigit en ruta en hög rötter två rutor från vattnet
    const pj = nara(i => land[i] === 1, rekt), pv = nara(i => land[i] === 1, [...rekt, pj]), pw = nara(i => land[i] >= 10, rekt);
    const pb = nara(i => land[i] === 1, [...rekt, pj, pv]), pm = nara(i => land[i] === 2, [...rekt, pj, pv, pb]);
    const lagt = [pj, pv, pw].map((p, n) => { const mt = n ? 'timmer' : 'jord', b: SIM.Bit = { id: s.nextBit!++, x: p.x, y: p.y, k: SIM.MATERIAL[mt].k, m: mt, b: 1, mat: SIM.MATERIAL[mt].n, c: 1 }; SIM.bitsOf(s).push(b); return b; });
    SIM.touch(s);
    const [jord, vNara, vLangt] = lagt;
    const brasa = Object.assign(SIM.newFire(), { id: (s.nextStation ??= 1), at: { x: pb.x, y: pb.y }, ring: true, lit: true, fuel: 6, folk: [] as number[] }); // en lägereld till (steg 4.5.6.8)
    (s.eldar ??= []).push(brasa); s.nextStation = (s.nextStation ?? 1) + 1;
    const sang0 = new Map(living(s).map(p => [p.id, SIM.bedTile(s, p)])), sangar0 = [...sang0.values()].filter(t => t !== undefined && golv.includes(t)).length;
    const minnesRuta = nara(i => land[i] === 1, [...rekt, pj, pv, pb, pm]);
    // tills vattnet sjunkit undan, och två dygn till
    const c0 = [vNara.c, vLangt.c];
    let lera = false, brasaUt = false, hogst = 0, rotterKvarVid1 = -1, blotSang = 0, flyttad = 0, cSlut: number[] = [];
    const rotter = () => (s.stackar ?? []).filter(a => a.k === 'rotter' && a.x === pm.x && a.y === pm.y).reduce((n, a) => n + a.n, 0);
    for (let h2 = 0; h2 < 8 * 24; h2++) {
      kor(s, 1);
      const niva = s.flod?.niva ?? 0;
      hogst = Math.max(hogst, niva);
      if (niva === 1 && hogst === 1) { if (rotterKvarVid1 < 0) { s.stackar!.push({ k: 'rotter', n: 12, c: 1, x: pm.x, y: pm.y }); SIM.tidy(s); } rotterKvarVid1 = rotter(); }
      if (jord.m === 'lera') lera = true;
      if (niva && !brasa.lit) brasaUt = true;
      for (const p of living(s)) {
        const t = SIM.bedTile(s, p);
        if (t !== undefined && SIM.flodBlot(s, t)) blotSang++;
        const t0 = sang0.get(p.id);
        if (t0 !== undefined && SIM.flodBlot(s, t0) && t !== t0) flyttad++;
      }
      if (hogst && !niva && !cSlut.length) cSlut = [vNara.c, vLangt.c];
      if (cSlut.length && !s.flodBlot && jord.m === 'jord' && lera) break;
    }
    const dNara = c0[0] - (cSlut[0] ?? c0[0]), dLangt = c0[1] - (cSlut[1] ?? c0[1]);
    // de som levde när vattnet steg (ett barn som föds efteråt minns inget)
    const dar = living(s).filter(p => sang0.has(p.id));
    const minns = dar.filter(p => p.lardomar?.some(l => l.k === 'flod' && l.v === hogst)).length, utan = dar.filter(p => !p.lardomar?.some(l => l.k === 'flod')).map(p => `${p.name} ${SIM.ageOf(p, s.now).toFixed(0)} år, ${p.lardomar?.length ?? 0} lärdomar`);
    const ledigNu = SIM.ledig(s, minnesRuta.x, minnesRuta.y);
    // vattenkartan som sparas mellan anropen blandar inte ihop torkan och en högre översvämning (kodgenomgången 3.10.25)
    const vk = createState(1, START), vattenRutor = () => SIM.vattenNu(vk).filter(t => t === T.Vatten).length;
    vk.sjoTorr = { niva: 0, tomma: [], v: 1, t: vk.now }; const utanFlod = vattenRutor();
    vk.sjoTorr = { niva: 0, tomma: [], v: 0, t: vk.now }; vk.flod = { niva: 4 }; const medFlod = vattenRutor();
    return [
      [`vattenkartan följer översvämningen också när den når fyra rutor upp (${utanFlod} rutor vatten utan, ${medFlod} med)`, medFlod > utanFlod],
      [`vattnet nådde ${hogst} rutor upp på land`, hogst >= 2],
      [`de vuxna bar undan maten innan vattnet kom (${s.stat?.['flod undan'] ?? 0} gånger; ${rotterKvarVid1} av 12 rötter kvar två rutor från vattnet medan det stod en ruta upp)`, (s.stat?.['flod undan'] ?? 0) >= 1 && rotterKvarVid1 === 0],
      [`alla i byn som var där minns hur högt vattnet nådde (${minns} av ${dar.length}, byn minns ${s.flodMinne ?? 0} rutor${utan.length ? `; inte ${utan.join(', ')}` : ''})`, minns === dar.length && dar.length > 0 && s.flodMinne === hogst],
      [`där bygger man inte (en ruta från vattnet är ${ledigNu ? 'ledig' : 'inte ledig'} efteråt)`, !ledigNu],
      [`jordgolvet blev lera och torkade till jordgolv igen (${lera ? 'lera' : 'aldrig lera'}, nu ${SIM.MATERIAL[jord.m].namn.toLowerCase()})`, lera && jord.m === 'jord'],
      [`väggen i vattnet slets fortare än väggen långt därifrån (${(dNara * 1000).toFixed(2)} mot ${(dLangt * 1000).toFixed(2)} tusendelar)`, dLangt > 0 && dNara > dLangt * 2],
      [`ingen sover på en blöt ruta (${blotSang} gånger; ${sangar0} sov vid stranden innan, ${flyttad} gånger någon annanstans medan det var blött)`, blotSang === 0 && sangar0 > 0 && flyttad > 0],
      [`brasan i vattnet slocknade (${s.stat?.['flod brasa'] ?? 0})`, brasaUt && (s.stat?.['flod brasa'] ?? 0) >= 1],
    ];
  },
};

SCENARIER.tornadobana = {
  text: 'Steg 6.4.8: tornadons bana. Den börjar vid kartans kant och går in mot kartan, svänger då och då och dras inte mot byn. Den är på kartan i 20–60 minuter och går en ruta på 5 sekunder, eller går ut ur kartan om den når kanten först',
  kor: () => {
    const s = createState(3, START), kant = (x: number, y: number) => Math.min(x, y, W - x, SIM.H - y) < 0.01;
    let ok = 0, svanger = 0, ut = 0, hela = 0, fel = '';
    const min: number[] = [];
    for (let k = 0; k < 40; k++) {
      const start = s.now + k * 7 * DAY, b = SIM.tornadoBana(s, start), tid = SIM.tornadoTid(s, start);
      let L = 0; for (let q = 2; q < b.length; q += 2) L += Math.hypot(b[q] - b[q - 2], b[q + 1] - b[q - 1]);
      const m = (tid.till - tid.fran) / SIM.MIN, slutKant = kant(b[b.length - 2], b[b.length - 1]);
      min.push(m);
      if (b.length > 4) svanger++;
      if (slutKant) ut++;
      // varar den hela tiden ska den vara 20–60 minuter; annars har den gått ut ur kartan
      const fart = (tid.till - tid.fran) / SIM.SEC / L;
      if (!kant(b[0], b[1])) fel ||= `bana ${k} börjar inne på kartan`;
      else if (Math.abs(fart - SIM.TORNADO.fart) > 0.05) fel ||= `bana ${k} går en ruta på ${fart.toFixed(2)} s`;
      else if (m > 60.01 || !slutKant && m < 19.99) fel ||= `bana ${k} är på kartan i ${m.toFixed(1)} minuter`;
      else ok++;
      if (!slutKant) hela++;
    }
    const med = min.slice().sort((a, b) => a - b)[20];
    return [
      [`40 banor börjar vid kanten och går en ruta på 5 sekunder${fel ? ` (${fel})` : ''}`, ok === 40],
      [`de flesta svänger (${svanger} av 40)`, svanger >= 30],
      [`de som löses upp gör det efter 20–60 minuter (${hela}), de andra går ut ur kartan (${ut}); mitten är ${med.toFixed(0)} minuter`, ut + hela === 40 && med <= 60],
    ];
  },
};

SCENARIER.tornado = {
  lang: true,
  text: 'Steg 3.8.4 och 6.4.8: tornadon kommer ibland på sommaren och hösten och går på en bana som svänger, fäller träd till liggande stammar, river en risvägg men inte en ny timmervägg, lyfter saker som ligger ute (en del går sönder, resten hamnar några rutor från banan) och det blåser hårt. Folk ser den, ropar och går undan, ingen står i en vägg eller i vattnet, och efteråt bärs det som spridits in i lagret',
  kor: () => {
    // en by vars sommar just börjat och som får en tornado tidigt i den, med en bana som går nära elden
    const fore = (x: State) => { x.founded -= 20 * DAY; x.kal = nyKalender(x.now - HOUR, 2); };
    const naraElden = (x: State, b: number[]) => { const e = SIM.eldPlats(x); for (let q = 2; q < b.length; q += 2) for (let f = 0; f <= 1; f += 0.02) if (Math.hypot(b[q - 2] + (b[q] - b[q - 2]) * f - e.x, b[q - 1] + (b[q + 1] - b[q - 1]) * f - e.y) < 12) return true; return false; };
    let v: State | undefined;
    for (let seed = 1; seed < 4000 && !v; seed++) {
      const b = createState(seed, START); fore(b);
      const k = kalender(b);
      if (SIM.motgangVid(b, k.start, k.ai) !== 'tornado' || SIM.tornadoTid(b, k.start).fran - k.start > 30 * HOUR || !naraElden(b, SIM.tornadoBana(b, k.start))) continue;
      v = b;
    }
    if (!v) return [['en by med en tornado tidigt på sommaren som går nära elden', false]];
    const s = v, k0 = kalender(s), tid = SIM.tornadoTid(s, k0.start);
    tandEld(s); setMat(s, { bar: 40, torkat: 40 });
    kor(s, (tid.fran - s.now) / HOUR - 0.5);
    const fem = () => step(s, 5); // fem sekunder: en ruta för tornadon
    for (let k = 0; k < 800 && !s.tornado; k++) fem();
    const t = s.tornado;
    if (!t) return [['tornadon kom', false]];
    const vind = vaderNu(s).vind, L = t.L;
    // punkten på banan närmast elden: där läggs en hög grenar, en risvägg och en ny timmervägg i vägen
    const e = SIM.eldPlats(s), pos = (u: number) => SIM.tornadoPos(t, u);
    const ledig = (x: number, y: number) => !SIM.blocked(s, x, y) && !SIM.stationAt(s, x, y) && !(s.stackar ?? []).some(a => a.x === x && a.y === y) && !SIM.bitAt(s, x, y) && !SIM.isStored(s, x, y) && Math.hypot(x - e.x, y - e.y) > 3;
    // två hela rutor från banan: utanför kärnan, där tornadon skadar och lyfter (en ruta för varje sak)
    const anv: { x: number; y: number }[] = [];
    const fran = (x: number, y: number) => { let m = Infinity; for (let u = 0; u <= 1; u += 0.1 / L) m = Math.min(m, Math.hypot(pos(u).x - x - 0.5, pos(u).y - y - 0.5)); return m; };
    const pa = (f: number) => {
      for (let d = 0; d < 60; d++) {
        const u = f + d / L, p = pos(u), q = pos(u + 1 / L), l = Math.hypot(q.x - p.x, q.y - p.y) || 1;
        for (const sd of [2.4, -2.4]) {
          const x = Math.floor(p.x - (q.y - p.y) / l * sd), y = Math.floor(p.y + (q.x - p.x) / l * sd), m = fran(x, y);
          if (u > 0.05 && u < 0.95 && m >= 2 && m < 3 && ledig(x, y) && !anv.some(r => Math.abs(r.x - x) + Math.abs(r.y - y) < 3)) { anv.push({ x, y }); return { x, y, u }; }
        }
      }
      return undefined;
    };
    let fe = 0;
    for (let u = 0; u <= 1; u += 0.5 / L) if (Math.hypot(pos(u).x - e.x, pos(u).y - e.y) < Math.hypot(pos(fe).x - e.x, pos(fe).y - e.y)) fe = u;
    const ph = pa(fe), pr = ph && pa(ph.u + 4 / L), pt = pr && pa(pr.u + 4 / L);
    if (!ph || !pr || !pt) return [['platser i vägen för tornadon', false]];
    // vänta tills tornadon nästan är framme (en minut i taget, sedan tio sekunder i taget), så att ingen hinner bära in högen innan
    let vantat = 0;
    while (t.u < ph.u - 1.5 / L && vantat++ < 900) fem();
    s.stackar!.push({ k: 'grenar', n: 10, c: 1, x: ph.x, y: ph.y }); SIM.tidy(s);
    const bits = SIM.bitsOf(s), id = Math.max(0, ...bits.map(b => b.id)) + 1;
    bits.push({ id, x: pr.x, y: pr.y, k: 'vagg', m: 'ris', b: 1, mat: 5, c: 1 }, { id: id + 1, x: pt.x, y: pt.y, k: 'vagg', m: 'timmer', b: 1, mat: 5, c: 1 });
    SIM.touch(s);
    const stock0 = (s.stockar ?? []).length;
    const ris = bits.find(b => b.id === id)!, timmer = bits.find(b => b.id === id + 1)!, gs = s.stackar!.find(a => a.k === 'grenar' && a.x === ph.x && a.y === ph.y)!;
    // medan tornadon drar fram: ingen i en vägg eller i vattnet, och vem som går undan. Väggarna och högen läses när den just passerat
    let iVagg = 0, iVattnet = 0, undan = 0, risRasad = false, timmerC = 1, efter: { x: number; y: number; n: number } | undefined;
    const skadade0 = s.stat?.skador ?? 0, undanSedd = new Set<number>();
    for (let h = 0; h < 900 && s.tornado; h++) {
      fem();
      if (ris.b < 1) risRasad = true; // byggarna börjar genast bygga upp den igen
      timmerC = Math.min(timmerC, timmer.c);
      if (!efter && t.u > ph.u + 3 / L) efter = { x: gs.x, y: gs.y, n: gs.n };
      for (const p of living(s)) {
        if (SIM.isWall(s, p.x, p.y)) iVagg++;
        if (SIM.vattenNu(s)[Math.floor(p.y) * W + Math.floor(p.x)] === T.Vatten) iVattnet++;
        if (p.task?.act === 'undan' && !undanSedd.has(p.id)) { undanSedd.add(p.id); undan++; }
      }
    }
    let avst = -1;
    if (efter) { avst = Infinity; for (let u = 0; u <= 1; u += 0.25 / L) avst = Math.min(avst, Math.hypot(pos(u).x - efter.x - 0.5, pos(u).y - efter.y - 0.5)); }
    const st = s.stat ?? {};
    const skadade = (st.skador ?? 0) - skadade0;
    // efteråt bärs grenarna in
    kor(s, 24);
    const inburet = gs.n < 1e-6 || SIM.isStored(s, gs.x, gs.y);
    return [
      [`tornadon kom på sommaren (${st.motgang_tornado ?? 0}) och var på kartan i ${((tid.till - tid.fran) / SIM.MIN).toFixed(0)} minuter`, (st.motgang_tornado ?? 0) === 1],
      [`det stormar medan den drar fram (blåsten ${vind.toFixed(2)}) och vuxna träd långt från banan faller (${st['tornado storm'] ?? 0} av stormen)`, vind === 1 && (st['tornado storm'] ?? 0) > 0],
      [`den fällde träd till liggande stammar (${st['tornado trad'] ?? 0} träd, ${stock0} → ${(s.stockar ?? []).length} stammar)`, (st['tornado trad'] ?? 0) > 0],
      [`risväggen rasade (${risRasad ? 'rasad' : 'stod kvar'}; ${st['tornado vagg'] ?? 0} väggar rivna), den nya timmerväggen stod kvar men skadades (lägst skick ${timmerC.toFixed(2)})`, risRasad && timmerC < 1 && timmerC > 0],
      [`grenarna lyftes: ${efter ? `${10 - efter.n} av 10 gick sönder och resten hamnade ${avst.toFixed(1)} rutor från banan` : 'högen låg kvar'} (${st['tornado sonder'] ?? 0} saker gick sönder i allt)`, !!efter && efter.n >= 5 && efter.n < 10 && avst >= 2 && avst <= 11],
      [`folk såg den och ropade (${st['tornado sedd'] ?? 0}, ${st.larm ?? 0} larm) och ${undan} gick undan`, (st['tornado sedd'] ?? 0) >= 1 && undan >= 1],
      [`nästan ingen skadades (${skadade} skador, ${st['tornado skadad'] ?? 0} av tornadon)`, (st['tornado skadad'] ?? 0) <= 1],
      [`ingen stod i en vägg (${iVagg}) eller i vattnet (${iVattnet})`, iVagg === 0 && iVattnet === 0],
      [`tornadon är borta (${s.tornado ? 'kvar' : 'borta'}) och grenarna bars in i lagret efteråt`, !s.tornado && inburet],
    ];
  },
};

SCENARIER.tornadokarna = {
  text: 'Steg 6.4.9: tornadons kärna förstör allt: en timmervägg rasar, en station försvinner med det som ligger i den, saker och liggande stammar går sönder, ett vuxet träd välts till en stam och en människa där dör (dödsorsaken tornado)',
  kor: () => {
    const s = createState(5, START);
    tandEld(s);
    SIM.skickaTornado(s, 'medel');
    const t = s.tornado!, L = t.L, e = SIM.eldPlats(s);
    const ledig = (x: number, y: number) => SIM.vattenNu(s)[y * W + x] !== T.Vatten && !SIM.blocked(s, x, y) && !SIM.stationAt(s, x, y) && !SIM.bitAt(s, x, y) && Math.hypot(x - e.x, y - e.y) > 8;
    // fyra rutor mitt på banan (en ruta isär), långt från byn
    const pl: { x: number; y: number }[] = [];
    for (let u = 0.3; u < 0.9 && pl.length < 5; u += 1.5 / L) {
      const p = SIM.tornadoPos(t, u), x = Math.floor(p.x), y = Math.floor(p.y);
      if (ledig(x, y) && !pl.some(q => Math.abs(q.x - x) < 2 && Math.abs(q.y - y) < 2)) pl.push({ x, y });
    }
    if (pl.length < 5) return [['fem lediga rutor mitt på banan', false]];
    const [pv, ps, pk, pt, pp] = pl, g = groundOf(s);
    const bits = SIM.bitsOf(s), id = Math.max(0, ...bits.map(b => b.id)) + 1;
    bits.push({ id, x: pv.x, y: pv.y, k: 'vagg', m: 'timmer', b: 1, mat: 5, c: 1 });
    const sid = Math.max(0, ...(s.stationer ?? []).map(q => q.id)) + 1;
    (s.stationer ??= []).push({ id: sid, k: 'slaktbank', x: ps.x, y: ps.y, kvar: 0 });
    SIM.touch(s);
    s.stackar!.push({ k: 'sten', n: 6, c: 1, x: pk.x, y: pk.y });
    (s.stockar ??= []).push({ id: (s.nextStock = (s.nextStock ?? 0) + 1), x: pk.x + 0.5, y: pk.y + 0.5, ...SIM.stamAv(g, pk.y * W + pk.x) });
    g.trees[pt.y * W + pt.x] = 1; g.trees[pk.y * W + pk.x] = 0;
    const offer = living(s)[0], stam0 = (s.stockar ?? []).length;
    let iVagen = true;
    for (let k = 0; k < 900 && s.tornado; k++) {
      // offret står kvar på sin ruta tills tornadon kommit förbi
      if (living(s).includes(offer)) { offer.x = pp.x + 0.5; offer.y = pp.y + 0.5; offer.task = undefined; } else iVagen = false;
      step(s, 5);
    }
    const st = s.stat ?? {}, vagg = SIM.bitAt(s, pv.x, pv.y);
    const stenKvar = (s.stackar ?? []).filter(a => a.k === 'sten' && a.x === pk.x && a.y === pk.y).reduce((n, a) => n + a.n, 0);
    const stamKvar = (s.stockar ?? []).some(k => Math.floor(k.x) === pk.x && Math.floor(k.y) === pk.y);
    const stamTrad = (s.stockar ?? []).some(k => Math.floor(k.x) === pt.x && Math.floor(k.y) === pt.y);
    return [
      [`timmerväggen rasade (${vagg && vagg.b >= 1 ? 'står kvar' : 'rasad'})`, !vagg || vagg.b < 1],
      [`stationen försvann (${(s.stationer ?? []).some(q => q.id === sid) ? 'kvar' : 'borta'})`, !(s.stationer ?? []).some(q => q.id === sid)],
      [`stenarna och stammen gick sönder (${stenKvar} stenar kvar, stammen ${stamKvar ? 'kvar' : 'borta'})`, stenKvar === 0 && !stamKvar],
      [`trädet välttes till en liggande stam (${g.trees[pt.y * W + pt.x] >= FOREST ? 'står' : 'vält'}, ${stamTrad ? 'stam' : 'ingen stam'})`, g.trees[pt.y * W + pt.x] < FOREST && stamTrad],
      [`människan dog i tornadon (${living(s).includes(offer) ? 'lever' : 'död'}; ${st['tornado dod'] ?? 0} döda)`, !living(s).includes(offer) && !iVagen && (st['tornado dod'] ?? 0) >= 1],
      [`händelserna säger vad den gjorde (${st['tornado forstort'] ?? 0} saker förstörda, ${stam0} stammar före)`, (st['tornado forstort'] ?? 0) >= 2],
    ];
  },
};

SCENARIER.tornadonara = {
  text: 'Steg 6.4.10: nära tornadon (två och tre hela rutor från mitten för en medelstor) flyger en människa långt och skadas eller dör, gräset blir en jordstig, ungskogen slits upp, en eld släcks, och lösa saker flyger långt',
  kor: () => {
    const s = createState(5, START);
    tandEld(s);
    SIM.skickaTornado(s, 'medel');
    const t = s.tornado!, L = t.L, e = SIM.eldPlats(s), g = groundOf(s), pos = (u: number) => SIM.tornadoPos(t, u);
    const fran = (x: number, y: number) => { let m = Infinity; for (let u = 0; u <= 1; u += 0.1 / L) m = Math.min(m, Math.hypot(pos(u).x - x - 0.5, pos(u).y - y - 0.5)); return m; };
    const anv: { x: number; y: number }[] = [];
    const ledig = (x: number, y: number) => SIM.vattenNu(s)[y * W + x] !== T.Vatten && !SIM.blocked(s, x, y) && !SIM.stationAt(s, x, y) && !SIM.bitAt(s, x, y) && Math.hypot(x - e.x, y - e.y) > 8 && !anv.some(r => Math.abs(r.x - x) + Math.abs(r.y - y) < 3);
    const pa = (u0: number) => {
      for (let d = 0; d < 80; d++) {
        const u = u0 + d / L, p = pos(u), q = pos(u + 1 / L), l = Math.hypot(q.x - p.x, q.y - p.y) || 1;
        for (const sd of [2.5, -2.5]) {
          const x = Math.floor(p.x - (q.y - p.y) / l * sd), y = Math.floor(p.y + (q.x - p.x) / l * sd), m = fran(x, y);
          if (SIM.inMap(x, y) && m >= 2 && m < 3.5 && ledig(x, y)) { anv.push({ x, y }); return { x, y }; }
        }
      }
      return undefined;
    };
    const pp = pa(0.3), pg = pp && pa(0.4), pu = pg && pa(0.5), pe = pu && pa(0.6), pk = pe && pa(0.7);
    if (!pp || !pg || !pu || !pe || !pk) return [['fem lediga rutor nära banan', false]];
    g.trees[pg.y * W + pg.x] = 0; g.cover[pg.y * W + pg.x] = 0.8;
    g.trees[pu.y * W + pu.x] = 0.3;
    g.trees[pk.y * W + pk.x] = 0;
    s.eldar = [{ ...structuredClone(s.fire), at: { x: pe.x, y: pe.y }, lit: true, fuel: 4 } as typeof s.fire];
    s.stackar!.push({ k: 'sten', n: 6, c: 1, x: pk.x, y: pk.y }); SIM.tidy(s);
    const offer = living(s)[0];
    let flog = -1;
    for (let k = 0; k < 900 && s.tornado; k++) {
      if (flog < 0) {
        if ((s.stat?.['tornado flog'] ?? 0) > 0 || !living(s).includes(offer)) flog = Math.hypot(offer.x - pp.x - 0.5, offer.y - pp.y - 0.5);
        else { offer.x = pp.x + 0.5; offer.y = pp.y + 0.5; offer.task = undefined; }
      }
      step(s, 5);
    }
    const st = s.stat ?? {}, sten = (s.stackar ?? []).find(a => a.k === 'sten' && a.n >= 1 && (a.x !== pk.x || a.y !== pk.y));
    const skadad = (st['tornado skadad'] ?? 0) + (st['tornado dod'] ?? 0);
    return [
      [`människan flög ${flog.toFixed(1)} rutor och ${living(s).includes(offer) ? 'skadades' : 'dog'} (${st['tornado flog'] ?? 0} flög, ${skadad} skadade eller döda)`, flog >= 4 && skadad >= 1],
      [`gräset blev en jordstig (${g.cover[pg.y * W + pg.x].toFixed(2)}) och ungskogen slets upp (${g.trees[pu.y * W + pu.x].toFixed(2)})`, g.cover[pg.y * W + pg.x] < 0.3 && g.trees[pu.y * W + pu.x] === 0],
      [`elden släcktes (${s.eldar?.[0]?.lit ? 'brinner' : 'släckt'}; ${st['tornado eld'] ?? 0})`, !s.eldar?.[0]?.lit && (st['tornado eld'] ?? 0) >= 1],
      [`stenarna flög långt (${sten ? Math.hypot(sten.x - pk.x, sten.y - pk.y).toFixed(1) : 'inga kvar'} rutor)`, !!sten && Math.hypot(sten.x - pk.x, sten.y - pk.y) >= 4],
    ];
  },
};

SCENARIER.tornadoutkant = {
  text: 'Steg 6.4.11: i tornadons utkant (fyra till sex hela rutor från mitten för en medelstor) faller några vuxna träd, lösa saker flyger kortare än nära, och de vilda växterna och grödan på ett fält försvinner',
  kor: () => {
    const s = createState(5, START);
    tandEld(s);
    SIM.skickaTornado(s, 'medel');
    const t = s.tornado!, L = t.L, e = SIM.eldPlats(s), g = groundOf(s), pos = (u: number) => SIM.tornadoPos(t, u);
    const fran = (x: number, y: number) => { let m = Infinity; for (let u = 0; u <= 1; u += 0.1 / L) m = Math.min(m, Math.hypot(pos(u).x - x - 0.5, pos(u).y - y - 0.5)); return m; };
    const anv: { x: number; y: number }[] = [];
    const ledig = (x: number, y: number) => SIM.vattenNu(s)[y * W + x] !== T.Vatten && isSoil(g.tiles[y * W + x]) && !g.built?.[y * W + x] && !SIM.blocked(s, x, y) && !SIM.stationAt(s, x, y) && !SIM.bitAt(s, x, y) && Math.hypot(x - e.x, y - e.y) > 8 && !anv.some(r => Math.abs(r.x - x) + Math.abs(r.y - y) < 2);
    // en ruta fem rutor vid sidan om banan, från andelen u0 och framåt
    const pa = (u0: number) => {
      for (let d = 0; d < 80; d++) {
        const u = u0 + d / L, p = pos(u), q = pos(u + 1 / L), l = Math.hypot(q.x - p.x, q.y - p.y) || 1;
        for (const sd of [5, -5]) {
          const x = Math.floor(p.x - (q.y - p.y) / l * sd), y = Math.floor(p.y + (q.x - p.x) / l * sd), m = fran(x, y);
          if (SIM.inMap(x, y) && m >= 4.2 && m < 6.3 && ledig(x, y)) { anv.push({ x, y }); return { x, y }; }
        }
      }
      return undefined;
    };
    const pb = pa(0.3), pf = pb && pa(0.4), pk = pf && pa(0.5);
    if (!pb || !pf || !pk) return [['tre lediga rutor i utkanten', false]];
    // skog på 40 rutor i utkanten
    const skog: number[] = [];
    for (let u = 0.2; u < 0.95 && skog.length < 40; u += 1 / L) { const r = pa(u); if (r) { skog.push(r.y * W + r.x); g.trees[r.y * W + r.x] = FOREST + 0.5; } }
    for (const r of [pb, pf, pk]) g.trees[r.y * W + r.x] = 0;
    const bar = SIM.takenOf(s).bar!, ib = pb.y * W + pb.x;
    bar[ib] = 0;
    s.falt = [{ id: 1, x: pf.x, y: pf.y, w: 1, dir: 1, n: 1, agare: -1, steg: 'vaxer', klara: 0, kvar: 0, sadda: 1, groda: 'arter', vuxit: 0, rord: s.now } as SIM.Falt];
    s.nextFalt = 1; s.byggV = (s.byggV ?? 0) + 1;
    s.stackar!.push({ k: 'sten', n: 20, c: 1, x: pk.x, y: pk.y }); SIM.tidy(s);
    for (let k = 0; k < 900 && s.tornado; k++) step(s, 5);
    const st = s.stat ?? {}, fallna = skog.filter(i => g.trees[i] < FOREST).length;
    const sten = (s.stackar ?? []).filter(a => a.k === 'sten' && a.n >= 1 && (a.x !== pk.x || a.y !== pk.y)).map(a => Math.hypot(a.x - pk.x, a.y - pk.y));
    const langst = Math.max(0, ...sten);
    return [
      [`några av träden i utkanten föll (${fallna} av ${skog.length})`, skog.length >= 30 && fallna >= 1 && fallna <= skog.length / 3],
      [`bären på rutan försvann (uttaget ${bar[ib].toFixed(2)})`, bar[ib] === 1],
      [`grödan på fältet förstördes (${s.falt?.[0]?.groda ?? 'ingen gröda'}; ${st['tornado falt'] ?? 0})`, !s.falt?.[0]?.groda && (st['tornado falt'] ?? 0) >= 1],
      [`stenarna flög kort (${sten.length ? langst.toFixed(1) : 'inga'} rutor som längst)`, sten.length >= 1 && langst <= 7],
    ];
  },
};

SCENARIER.tornadostorlek = {
  text: 'Steg 6.4.15: tornadon får en av tre storlekar, ungefär 5 av 10 små, 4 av 10 medel och 1 av 10 stora. En stor varar längre och fäller fler träd i stormen, och Händelser säger "En stor tornado kommer"',
  kor: () => {
    const s = createState(5, START);
    const n: Record<string, number> = { liten: 0, medel: 0, stor: 0 };
    let langre = 0, stora = 0, storStart = -1;
    for (let k = 0; k < 400; k++) {
      const start = START + k * 7 * DAY, st = SIM.tornadoStorlek(s, start);
      n[st]++;
      if (st === 'stor') {
        stora++; if (storStart < 0) storStart = start;
        const L = (b: number[]) => { let l = 0; for (let q = 2; q < b.length; q += 2) l += Math.hypot(b[q] - b[q - 2], b[q + 1] - b[q - 1]); return l; };
        if (L(SIM.tornadoBana(s, start, 'stor')) >= L(SIM.tornadoBana(s, start, 'medel'))) langre++;
      }
    }
    const text = storStart >= 0 ? SIM.MOTGANGAR.tornado.borjarNu(s, storStart) : '';
    // stormen: samma tornado som stor och som medel, på samma karta
    const fallda = (st: 'medel' | 'stor') => { const x = createState(5, START); SIM.skickaTornado(x, st); for (let i = 0; i < 400 && x.tornado; i++) step(x, 5); return x.stat?.['tornado storm'] ?? 0; };
    const fm = fallda('medel'), fs = fallda('stor');
    return [
      [`storlekarna av 400 tornador: ${n.liten} små, ${n.medel} medel och ${n.stor} stora`, n.liten > 160 && n.liten < 240 && n.medel > 120 && n.medel < 200 && n.stor > 20 && n.stor < 70],
      [`en stor tornado går minst lika långt som en medelstor (${langre} av ${stora})`, stora > 0 && langre === stora],
      [`en stor tornado fäller fler träd i stormen (${fs} mot ${fm})`, fs > fm],
      [`Händelser: "${text}"`, text.startsWith('En stor tornado kommer')],
    ];
  },
};

SCENARIER.tornadogast = {
  text: 'Steg 6.4.12: rövarna och handlaren drabbas som byborna. En rövarflock mitt i tornadons väg dör, och en handlare i utkanten flyger en bit, tappar kanske något ur packningen och går hem',
  kor: () => {
    const s = createState(5, START);
    tandEld(s);
    SIM.skickaTornado(s, 'medel');
    const r = SIM.skickaRovare(s, 3), hh = SIM.skickaHandlare(s);
    if (!r.ok || !hh.ok || !s.rovare || !s.handlare) return [[`rövarna och handlaren kom (${r.text}; ${hh.text})`, false]];
    const t = s.tornado!, L = t.L, pos = (u: number) => SIM.tornadoPos(t, u);
    const fran = (x: number, y: number) => { let m = Infinity; for (let u = 0; u <= 1; u += 0.1 / L) m = Math.min(m, Math.hypot(pos(u).x - x, pos(u).y - y)); return m; };
    // rövarna mitt på banan, handlaren fem rutor vid sidan om
    const f = s.rovare, h = s.handlare, pr = pos(0.4);
    f.x = pr.x; f.y = pr.y; f.mx = pr.x; f.my = pr.y; f.gor = 'samlas'; f.till = s.now + 10 * HOUR;
    let ph: { x: number; y: number } | undefined;
    for (let d = 0; d < 80 && !ph; d++) {
      const p = pos(0.6 + d / L), q = pos(0.6 + (d + 1) / L), l = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      for (const sd of [5, -5]) { const x = p.x - (q.y - p.y) / l * sd, y = p.y + (q.x - p.x) / l * sd, m = fran(x, y); if (!ph && SIM.inMap(Math.floor(x), Math.floor(y)) && m >= 4.6 && m < 6.2 && SIM.vattenNu(s)[Math.floor(y) * W + Math.floor(x)] !== T.Vatten) ph = { x, y }; }
    }
    if (!ph) return [['en plats för handlaren i utkanten', false]];
    h.fas = 'vantar'; h.kvall = s.now + 10 * HOUR; h.x = h.mx = ph.x; h.y = h.my = ph.y;
    const varor0 = h.varor.reduce((n, w) => n + w.n, 0), namn = h.namn;
    let hFlog = -1;
    for (let k = 0; k < 900 && s.tornado; k++) {
      if (s.rovare === f && f.gor === 'samlas') { f.x = pr.x; f.y = pr.y; }
      step(s, 5);
      if (hFlog < 0 && (h.fas as string) === 'gar') hFlog = Math.hypot(h.fran.x - ph.x, h.fran.y - ph.y);
    }
    const st = s.stat ?? {}, varor1 = h.varor.reduce((n, w) => n + w.n, 0), dog = s.log.some(l => l.text.includes(`${namn} från ${h.hem} dog`));
    return [
      [`rövarflocken dog i tornadon (${s.rovare === f ? `${f.folk.length} kvar` : 'borta'}; ${st.rovarDoda ?? 0} döda)`, s.rovare !== f && (st.rovarDoda ?? 0) >= 3],
      [`handlaren ${namn} flög ${hFlog.toFixed(1)} rutor och gick hem (${h.fas}${dog ? ', dog' : ''}; varorna ${varor0} → ${varor1})`, (h.fas as string) === 'gar' && !dog && hFlog >= 1 && varor1 <= varor0 && varor1 > 0],
    ];
  },
};

// en by på sommaren med en torr dag framför sig, och en plats 30 till 50 rutor från elden där en cirkel med radien 12 är jord
// utan byggen och fält (scenarierna brandfart och slackning)
function torrAng(): { s: State; mitt: number } | string {
    const torrDag = (x: State) => { for (let h = 0; h < 2; h++) if (vaderNu(x, x.now + h * HOUR).nb > 0) return false; return true; };
    let s: State | undefined;
    for (let seed = 1; seed < 200 && !s; seed++) {
      const b = createState(seed, START); b.founded -= 20 * DAY; b.kal = nyKalender(b.now - HOUR, 2);
      for (let h = 0; h < 48 && !torrDag(b); h++) step(b, 3600);
      if (torrDag(b) && SIM.isLight(b.now)) s = b;
    }
    if (!s) return 'en by på sommaren med torrt väder';
    const e = SIM.eldPlats(s);
    // en plats 30 till 50 rutor från elden där en cirkel med radien 12 är jord utan byggen och fält
    const fri = (x: State, i: number) => { const g = groundOf(x); return isSoil(g.tiles[i]) && !g.built?.[i] && !SIM.bitAt(x, i % W, Math.floor(i / W)) && !SIM.faltAt(x, i % W, Math.floor(i / W)); };
    let mitt = -1;
    for (let i = 0; i < W * W && mitt < 0; i++) {
      const cx = i % W, cy = Math.floor(i / W), d = Math.hypot(cx - e.x, cy - e.y);
      if (d < 30 || d > 50) continue;
      let ok = true;
      for (let dy = -12; dy <= 12 && ok; dy++) for (let dx = -12; dx <= 12 && ok; dx++) if (Math.hypot(dx, dy) <= 12 && (!SIM.inMap(cx + dx, cy + dy) || !fri(s, (cy + dy) * W + cx + dx))) ok = false;
      if (ok) mitt = i;
    }
    if (mitt < 0) return 'en plats för ängen';
    return { s, mitt };
}
// sätter markslaget i cirkeln kring mitt (radien 12) i byn x
function angSlag(x: State, mitt: number, slag: 'hog' | 'kort' | 'skog') {
  const g = groundOf(x), cx = mitt % W, cy = Math.floor(mitt / W);
  for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++) {
    if (Math.hypot(dx, dy) > 12) continue;
    const i = (cy + dy) * W + cx + dx;
    if (slag === 'skog') { g.trees[i] = FOREST + 0.5; g.cover[i] = 0.6; } else { g.trees[i] = 0; g.cover[i] = slag === 'hog' ? 1 : (SIM.HIGH + SIM.BAR) / 2; }
  }
}

SCENARIER.testknappar = {
  text: 'Steg 6.4.7: testknapparna för tornado och blixt. Tornadon kommer direkt från kartans kant och raden säger varifrån; en till går inte medan den pågår, och den går över kartan och tar slut. Blixten slår ner där man trycker, flera gånger i rad, och raden säger om den tände och varför',
  kor: () => {
    const a = torrAng();
    if (typeof a === 'string') return [[a, false]];
    const { s, mitt } = a, x = cloneState(s);
    const r = SIM.skickaTornado(x), t = x.tornado, kant = !!t && Math.min(t.bana[0], t.bana[1], W - t.bana[0], SIM.H - t.bana[1]) < 0.01;
    const igen = SIM.skickaTornado(x);
    step(x, 60);
    const blast = vaderNu(x).vind, gar = !!x.tornado && x.tornado.u > 0;
    for (let h = 0; h < 8 && x.tornado; h++) step(x, 3600);
    const y = cloneState(s);
    angSlag(y, mitt, 'hog');
    if (y.vader) { y.vader.torr = 240; y.vader.fukt = 0; }
    const g = groundOf(y);
    let vatten = -1;
    for (let i = 0; i < g.tiles.length && vatten < 0; i++) if (g.tiles[i] === T.Vatten) vatten = i;
    const n0 = y.brand?.n ?? 0;
    const iVatten = vatten >= 0 ? SIM.blixtTest(y, vatten % W, Math.floor(vatten / W)) : { ok: false, text: 'inget vatten' };
    const torrVatten = (y.brand?.n ?? 0) === n0, svar: string[] = [];
    for (let k = 0; k < 6 && (y.brand?.n ?? 0) === n0; k++) svar.push(SIM.blixtTest(y, mitt % W, Math.floor(mitt / W)).text);
    return [
      [`tornadon kommer: "${r.text}"`, r.ok && !!t?.test && /från (norr|söder|öster|väster|nordost|nordväst|sydost|sydväst)/.test(r.text)],
      ['den börjar vid kartans kant', kant],
      [`en till går inte medan den pågår ("${igen.text}")`, !igen.ok],
      [`den drar fram och det stormar (vinden ${blast.toFixed(2)})`, gar && blast >= 0.99],
      ['den har gått över kartan och tagit slut', !x.tornado],
      [`blixten i vattnet: "${iVatten.text}"`, iVatten.ok && /inget tog eld/.test(iVatten.text) && torrVatten],
      [`blixten på den torra ängen, ${svar.length} i rad: "${svar[svar.length - 1]}"`, (y.brand?.n ?? 0) > n0 && /tände marken/.test(svar[svar.length - 1] ?? '')],
    ];
  },
};

SCENARIER.brandkant = {
  text: 'Steg 6.4.5: bara brandens kant räknas. När en stor brand brinner på en torr äng hoppas rutorna mitt i branden över, och bara kanten prövar grannrutorna',
  kor: () => {
    const a = torrAng();
    if (typeof a === 'string') return [[a, false]];
    const { s, mitt } = a, x = cloneState(s);
    angSlag(x, mitt, 'hog');
    if (x.vader) { x.vader.torr = 240; x.vader.fukt = 0; }
    SIM.tand(x, mitt, 'blixt', 0);
    for (let k = 0; k < 6; k++) step(x, 10);
    const alla = SIM.brinnande(x).length, kant = SIM.brandKant(x);
    return [[`en stor brand på ängen efter en minut (${alla} rutor brinner)`, alla >= 100], [`bara kanten räknas (${kant} av ${alla} rutor)`, kant > 0 && kant < alla * 0.7]];
  },
};

SCENARIER.brandfart = {
  text: 'Steg 6.4.1: branden räknas i steg om 5 sekunder och sprids efter markslaget. I torrt högt gräs tar sig elden till en grannruta ungefär var femte sekund, så att en brand på en äng är stor efter en minut; i skog går det långsammare, och i blöt mark tar den sig inte vidare',
  kor: () => {
    const a = torrAng();
    if (typeof a === 'string') return [[a, false]];
    const { s, mitt } = a;
    const prov = (slag: 'hog' | 'skog', torr: number) => {
      const x = cloneState(s), cx = mitt % W, cy = Math.floor(mitt / W);
      angSlag(x, mitt, slag);
      if (x.vader) { x.vader.torr = torr; x.vader.fukt = 0; }
      SIM.tand(x, mitt, 'blixt', 0);
      const fore = SIM.brinnande(x).length;
      step(x, 60); // en minut: tolv delsteg
      const inne = (i: number) => Math.hypot(i % W - cx, Math.floor(i / W) - cy) <= 12;
      return { fore, n: SIM.brinnande(x).filter(r => inne(r[0])).length + (x.brand?.ut ?? []).filter(inne).length };
    };
    const hog = prov('hog', 240), skog = prov('skog', 240), blot = prov('hog', 0);
    return [
      [`i torrt högt gräs brinner ${hog.n} rutor efter en minut (en ruta tändes)`, hog.fore === 1 && hog.n >= 100],
      [`i torr skog går det långsammare: ${skog.n} rutor`, skog.n >= 2 && skog.n < hog.n / 2],
      [`i blött högt gräs tar den sig inte vidare: ${blot.n} ruta`, blot.n <= 1],
    ];
  },
};

SCENARIER.slackning = {
  text: 'Steg 6.4.2: en brand som vuxit blir svårare att släcka. Varje markslag har ett tal för hur lätt det släcks, som händerna och vattensäcken använder: kort gräs väldigt lätt, högt gräs lätt, skog väldigt svårt',
  kor: () => {
    const a = torrAng();
    if (typeof a === 'string') return [[a, false]];
    const { s, mitt } = a;
    // en ruta tänds; en vuxen står bredvid och häller en säck vatten, eller släcker tio minuter med händerna
    const prov = (slag: 'hog' | 'kort' | 'skog') => {
      const ut = (sack: boolean) => {
        const x = cloneState(s); angSlag(x, mitt, slag);
        SIM.tand(x, mitt, 'blixt', 0);
        const p = living(x).find(q => SIM.ageOf(q, x.now) >= 18)!;
        p.x = mitt % W + 1.5; p.y = Math.floor(mitt / W) + 0.5;
        const t = { act: 'slacka', ref: mitt, until: x.now + HOUR } as unknown as SIM.Task;
        if (sack) SIM.slackaFram(x, p, t); else SIM.slackaSteg(x, p, t, 600);
        const r = SIM.brinnande(x).find(q => q[0] === mitt);
        return r ? r[3] : 1;
      };
      return { sack: ut(true), hand: ut(false) };
    };
    const kort = prov('kort'), hog = prov('hog'), skog = prov('skog');
    const f = (n: number) => n.toFixed(2).replace('.', ',');
    return [
      [`en säck vatten släcker kort gräs (${f(kort.sack)}) och högt gräs (${f(hog.sack)}) helt, men bara en del av en ruta skog (${f(skog.sack)})`, kort.sack >= 1 && hog.sack >= 1 && skog.sack < 0.5],
      [`med händerna i tio minuter: kort gräs ${f(kort.hand)}, högt gräs ${f(hog.hand)}, skog ${f(skog.hand)} (1 = släckt)`, kort.hand > hog.hand && hog.hand > skog.hand * 4],
    ];
  },
};

SCENARIER.brinnerupp = {
  text: 'Steg 6.4.3: allt av trä och allt i lagren kan brinna: golv, dörrar, stationer och möbler med det som ligger i dem, och sakerna i högarna och på marken. Sten och flinta blir kvar, ett trägolv blir jordgolv, och det som brunnit skrivs i branden',
  kor: () => {
    const a = torrAng();
    if (typeof a === 'string') return [[a, false]];
    const x = cloneState(a.s), mitt = a.mitt, cx = mitt % W, cy = Math.floor(mitt / W);
    angSlag(x, mitt, 'hog');
    // ett trägolv och en öppning med en skinndörr, en hylla med en kniv i, en yxa på marken och högar med skinn och flinta
    const golv = { id: 9101, x: cx + 3, y: cy, k: 'golv', m: 'tra', b: 1, mat: 0, c: 1 } as SIM.Bit, dorr = { id: 9102, x: cx - 3, y: cy, k: 'oppning', m: 'oppning', b: 1, mat: 0, c: 1, dorr: 'skinndorr' } as SIM.Bit;
    (x.byggen ??= []).push(golv, dorr);
    const hylla: SIM.Station = { id: x.nextStation = (x.nextStation ?? 0) + 1, k: 'hylla', x: cx, y: cy + 3, kvar: 0 };
    (x.stationer ??= []).push(hylla);
    const kniv = SIM.newTing(x, 'kniv', 1, 0); kniv.vid = hylla.id; kniv.x = hylla.x; kniv.y = hylla.y;
    const yxa = SIM.newTing(x, 'yxa', 1, 0); yxa.x = cx; yxa.y = cy - 3;
    (x.stackar ??= []).push({ k: 'skinn', n: 5, c: 1, x: cx + 2, y: cy + 2 }, { k: 'flinta', n: 4, c: 1, x: cx - 2, y: cy + 2 });
    SIM.touch(x);
    if (x.vader) { x.vader.torr = 240; x.vader.fukt = 0; }
    SIM.tand(x, mitt, 'blixt', 0);
    const flintor = () => (x.stackar ?? []).filter(q => q.k === 'flinta').reduce((n, q) => n + q.n, 0) + (living(x).reduce((n, p) => n + (p.task?.items?.flinta ?? 0), 0));
    const b = x.brand!, flinta0 = flintor();
    step(x, 4 * 3600);
    const har = (k: string, xx: number, yy: number) => (x.stackar ?? []).some(q => q.k === k && q.x === xx && q.y === yy && q.n >= 1);
    const brann = b.brann ?? {};
    return [
      [`trägolvet blev jordgolv (${golv.m})`, golv.m === 'jord'],
      [`skinndörren brann upp (${dorr.dorr ?? 'borta'})`, !dorr.dorr],
      [`hyllan och kniven i den brann upp`, !SIM.stationerOf(x).includes(hylla) && !SIM.tingOf(x).includes(kniv)],
      [`yxan på marken brann upp`, !SIM.tingOf(x).includes(yxa)],
      [`de fem skinnen brann upp (${b.saker} saker brann), men flintan blev kvar (${flintor()} av ${flinta0})`, b.saker >= 5 && !har('skinn', cx + 2, cy + 2) && flintor() >= flinta0],
      [`det som brunnit står i branden (${Object.entries(brann).map(([k, n]) => `${k} ${n}`).join(', ')})`, ['Trägolv', 'Skinndörr', 'Hylla', 'Flintkniv', 'Flintyxa'].every(k => brann[k] >= 1)],
    ];
  },
};

SCENARIER.vind = {
  text: 'Steg 6.4.4: vinden har en riktning som ändras långsamt. Hård vind sprider elden mycket fortare med vinden och långsammare mot den, och pilen vid vädret pekar åt det håll vinden blåser',
  kor: () => {
    const a = torrAng();
    if (typeof a === 'string') return [[a, false]];
    const { s, mitt } = a;
    // en timme med hård vind utan regn, i samma tidsålder
    let t = -1;
    for (let h = 0; h < 24 * 6 && t < 0; h++) { const v = vaderNu(s, s.now + h * HOUR); if (v.vind >= 0.6 && v.nb === 0 && kalender(s, s.now + h * HOUR).ai === kalender(s).ai) t = s.now + h * HOUR; }
    if (t < 0) return [['en timme med hård vind', false]];
    // riktningen ändras långsamt: högst en åttondel av ett varv på en timme
    let vrid = 0;
    for (let h = 0; h < 48; h++) { const d = Math.abs(vaderNu(s, s.now + (h + 1) * HOUR).rikt - vaderNu(s, s.now + h * HOUR).rikt); vrid = Math.max(vrid, Math.min(d, 2 * Math.PI - d)); }
    const x = cloneState(s); x.now = t; angSlag(x, mitt, 'hog');
    if (x.vader) { x.vader.torr = 240; x.vader.fukt = 0; }
    const v = vaderNu(x), vx = Math.cos(v.rikt), vy = Math.sin(v.rikt), cx = mitt % W, cy = Math.floor(mitt / W);
    SIM.tand(x, mitt, 'blixt', 0);
    step(x, 30);
    let med = 0, mot = 0;
    for (const i of [...SIM.brinnande(x).map(r => r[0]), ...(x.brand?.ut ?? [])]) { const d = (i % W - cx) * vx + (Math.floor(i / W) - cy) * vy; if (d >= 2) med++; else if (d <= -2) mot++; }
    const f = (n: number) => n.toFixed(2).replace('.', ',');
    return [
      [`vinden vrider sig långsamt (högst ${f(vrid)} radianer på en timme)`, vrid < Math.PI / 4],
      [`i hård vind (${f(v.vind)}, från ${SIM.vindFran(v.rikt)}) tar sig elden fler rutor med vinden (${med}) än mot den (${mot}) på en halv minut`, med > 3 * Math.max(1, mot)],
    ];
  },
};

SCENARIER.brand = {
  text: 'Steg 3.8.5: eldsvådor och skogsbrand. När marken är torr på sommaren tar elden sig från ruta till ruta i skogen och träden dör; när marken är blöt tar den sig inte vidare. Gnistor från lägerelden tänder ibland marken. Elden nära byn: folk ser den och ropar, de vuxna släcker med vattensäcken och med händerna, en risvägg brinner, ingen står i en vägg eller i vattnet, och elden slocknar. Där skogen brann kommer plantor, som växer upp när gräset kommit tillbaka, och det svarta försvinner efter några dygn',
  kor: () => {
    // en by på sommaren, vid en sjö, med en torr dag utan regn framför sig
    const fore = (x: State) => { x.founded -= 20 * DAY; x.kal = nyKalender(x.now - HOUR, 2); };
    const torrDag = (x: State, h0: number) => { for (let h = 0; h < 30; h++) if (vaderNu(x, x.now + (h0 + h) * HOUR).nb > 0) return false; return true; };
    let v: State | undefined, h0 = 0;
    for (let seed = 1; seed < 400 && !v; seed++) {
      const b = createState(seed, START); fore(b);
      for (h0 = 0; h0 < 48 && !torrDag(b, h0); h0++);
      if (h0 < 48 && living(b).some(p => SIM.naVattnet(b, p))) v = b;
    }
    if (!v) return [['en by på sommaren med en torr dag', false]];
    const s = v;
    tandEld(s); setMat(s, { bar: 40, torkat: 40 });
    const torr = (x: State) => { if (x.vader) { x.vader.torr = 240; x.vader.fukt = 0; } };
    {
      kor(s, h0, torr);
      while (!SIM.isLight(s.now)) kor(s, 1, torr);
      // gnistorna: i en by med torr mark tänder lägerelden förr eller senare marken
      const gn = cloneState(s);
      let gnistTim = 0;
      while (!(gn.stat?.['brand gnista']) && gnistTim < 48) { kor(gn, 1, torr); gnistTim++; }
      // skogsbranden: en ruta mitt i tät skog 25 till 35 rutor från elden (gnistor från lägerelden blir en del av samma brand)
      const e = SIM.eldPlats(s), g = groundOf(s);
      const tat = (i: number) => { let n = 0; const x = i % W, y = Math.floor(i / W); for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (SIM.inMap(x + dx, y + dy) && g.trees[(y + dy) * W + x + dx] >= FOREST) n++; return n; };
      let mitt = -1;
      for (let i = 0; i < W * W && mitt < 0; i++) { const d = Math.hypot(i % W - e.x, Math.floor(i / W) - e.y); if (d >= 25 && d <= 35 && g.trees[i] >= FOREST && tat(i) >= 24) mitt = i; }
      if (mitt < 0) return [['tät skog 25 till 35 rutor från elden', false]];
      const vat = cloneState(s), by = cloneState(s), tb = cloneState(s);
      // testläget (steg 4.5.6.6): branden tänds där man trycker; på vatten tänds inget, och en andra brand långt från den första sprids också
      const vattenRuta = [...g.tiles.keys()].find(i => g.tiles[i] === T.Vatten) ?? 0;
      const tv = SIM.tandTest(tb, vattenRuta % W, Math.floor(vattenRuta / W));
      const t1 = SIM.tandTest(tb, mitt % W, Math.floor(mitt / W)), tIgen = SIM.tandTest(tb, mitt % W, Math.floor(mitt / W));
      let andra = -1;
      for (let i = 0; i < W * W && andra < 0; i++) { const d = Math.hypot(i % W - e.x, Math.floor(i / W) - e.y); if (d >= 20 && d <= 60 && Math.hypot(i % W - mitt % W, Math.floor(i / W) - Math.floor(mitt / W)) > SIM.BRAND.maxR + 5 && g.trees[i] >= FOREST && tat(i) >= 24) andra = i; }
      const t2 = andra >= 0 ? SIM.tandTest(tb, andra % W, Math.floor(andra / W)) : { ok: false, text: 'ingen andra skog' };
      kor(tb, 6, torr);
      const vidAndra = andra < 0 ? 0 : (tb.brand?.r ?? []).filter(r => Math.hypot(r[0] % W - andra % W, Math.floor(r[0] / W) - Math.floor(andra / W)) <= 6).length + (tb.aska ?? []).filter(a => Math.hypot(a[0] % W - andra % W, Math.floor(a[0] / W) - Math.floor(andra / W)) <= 6).length;
      const testRad = tb.log.filter(l => l.text.startsWith('Testläget: en brand tändes')).length;
      const skog0 = new Set<number>(); for (let i = 0; i < W * W; i++) if (g.trees[i] >= FOREST) skog0.add(i);
      SIM.tand(s, mitt, 'blixt', 0);
      kor(s, 18, torr);
      const rutor = s.stat?.['brand ruta'] ?? 0, trad = s.stat?.['brand trad'] ?? 0;
      const brunnen = [...new Set((s.aska ?? []).map(a => a[0]))].filter(i => skog0.has(i));
      const planta = (t: number) => t > 0 && t <= SIM.MARK.nyPlanta + 1e-6, plantor = brunnen.filter(i => planta(groundOf(s).trees[i])).length;
      const askan = brunnen.length ? Math.max(...brunnen.map(i => groundOf(s).cover[i])) : 1;
      // samma ruta när marken är blöt: elden tar sig inte vidare
      if (vat.vader) { vat.vader.torr = 0; vat.vader.fukt = 1; } // blött redan när den tänds: elden sprids fort (steg 6.4.1)
      SIM.tand(vat, mitt, 'blixt', 0);
      kor(vat, 18, x => { if (x.vader) x.vader.torr = 0; });
      const vatRutor = vat.stat?.['brand ruta'] ?? 0;
      // återväxten: gräset kommer tillbaka och plantorna växer (bara marken, en sommar i taget)
      const gr = cloneState(s), gg = groundOf(gr);
      let vaxtTim = 0;
      while (vaxtTim < 30 * 24 && brunnen.filter(i => gg.trees[i] > SIM.MARK.nyPlanta + 1e-6).length < brunnen.length / 2) { growGround(gr, 6, 2); vaxtTim += 6; }
      const vuxna = brunnen.filter(i => gg.trees[i] > SIM.MARK.nyPlanta + 1e-6).length;
      // elden nära byn: en risvägg fem rutor från elden tar eld, och en vuxen har en vattensäck
      const ledig = (x: number, y: number) => !SIM.blocked(by, x, y) && !SIM.stationAt(by, x, y) && !(by.stackar ?? []).some(a => a.x === x && a.y === y) && !SIM.bitAt(by, x, y) && !SIM.isStored(by, x, y) && isSoil(groundOf(by).tiles[y * W + x]);
      let pv: { x: number; y: number } | undefined;
      for (let r = 5; r < 9 && !pv; r++) for (let a = 0; a < 16 && !pv; a++) { const x = Math.round(e.x + r * Math.cos(a * Math.PI / 8)), y = Math.round(e.y + r * Math.sin(a * Math.PI / 8)); if (ledig(x, y)) pv = { x, y }; }
      if (!pv) return [['en plats för risväggen', false]];
      const bits = SIM.bitsOf(by), id = Math.max(0, ...bits.map(q => q.id)) + 1;
      bits.push({ id, x: pv.x, y: pv.y, k: 'vagg', m: 'ris', b: 1, mat: 5, c: 1 }); SIM.touch(by);
      const ris = bits.find(q => q.id === id)!;
      const vuxen = living(by).find(p => SIM.ageOf(p, by.now) >= SIM.ALDER.vuxen)!;
      SIM.addTool(by, 'vattensack', vuxen);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) SIM.tand(by, (pv.y + dy) * W + pv.x + dx, 'gnista', 0);
      const t0 = by.now;
      let iVagg = 0, iVattnet = 0, sack = 0, hand = 0, risC = 1, tim = 0;
      const sedda = new Set<number>();
      // elden nära byn är släckt: inget brinner längre inom BRAND.hot rutor från byns eld (den som nått en dunge längre bort får brinna)
      const naraByn = () => { const e2 = SIM.eldPlats(by); return SIM.brinnande(by).some(q => Math.hypot(q[0] % W - e2.x, Math.floor(q[0] / W) - e2.y) <= SIM.BRAND.hot); };
      for (; tim < 12 * 12 && by.brand && naraByn(); tim++) {
        kor(by, 1 / 12, torr);
        risC = Math.min(risC, ris.b < 1 ? 0 : ris.c);
        for (const p of living(by)) {
          if (SIM.isWall(by, p.x, p.y)) iVagg++;
          if (SIM.vattenNu(by)[Math.floor(p.y) * W + Math.floor(p.x)] === T.Vatten) iVattnet++;
          if (p.task?.act === 'slacka' && !sedda.has(p.id * 2 + (p.task.tool ? 1 : 0))) { sedda.add(p.id * 2 + (p.task.tool ? 1 : 0)); if (p.task.tool) sack++; else hand++; }
        }
      }
      const st = by.stat ?? {}, slocknat = by.log.some(l => l.t >= t0 && l.text.startsWith('Elden har slocknat'));
      // det svarta försvinner efter några dygn
      const svart0 = (by.aska ?? []).length, sv = cloneState(by);
      sv.now += (SIM.BRAND.svart * DAY) + HOUR; SIM.askaSteg(sv);
      return [
        [`testläget: på vatten tänds inget (${tv.text}), i skogen tänds en brand (${t1.text}), där det brinner tänds inget igen (${tIgen.text})`, !tv.ok && t1.ok && !tIgen.ok && /vatten/.test(tv.text)],
        [`testläget: en andra brand långt från den första sprids också (${t2.text}, ${vidAndra} rutor brann där efter 6 timmar), och Händelser säger var (${testRad} rader)`, t2.ok && vidAndra >= 3 && testRad === 2],
        [`gnistor från lägerelden tände marken efter ${gnistTim} timmar med torr mark`, (gn.stat?.['brand gnista'] ?? 0) >= 1],
        [`skogsbranden spred sig i torr skog (${rutor} rutor på 18 timmar, ${trad} träd dog)`, rutor >= 8 && trad >= 5],
        [`när marken är blöt tar den sig inte vidare (${vatRutor} ruta)`, vatRutor <= 2],
        [`där skogen brann står plantor (${plantor} av ${brunnen.length}; en torraka kan ha fallit av ålder, och en planta kan vara nedtrampad) i aska (gräset högst ${askan.toFixed(2)})`, brunnen.length > 0 && plantor >= brunnen.length * 0.95 && askan < HIGH],
        [`plantorna växer när gräset kommit tillbaka (${vuxna} av ${brunnen.length} efter ${vaxtTim} timmar sommar)`, vuxna >= brunnen.length / 2],
        [`elden nära byn sågs (${st['brand sedd'] ?? 0}) och hotade byn (${st['brand hot'] ?? 0})`, (st['brand sedd'] ?? 0) >= 1 && (st['brand hot'] ?? 0) >= 1],
        [`de vuxna släckte: ${sack} med vattensäcken (${st['brand sack'] ?? 0} säckar), ${hand} med händerna, ${st['brand slackt'] ?? 0} rutor släckta, ${st['brand skadad'] ?? 0} brännskador`, sack >= 1 && hand >= 1 && (st['brand slackt'] ?? 0) >= 1],
        [`risväggen brann (skick ${risC.toFixed(2)}${ris.b < 1 ? ', rasade' : ''})`, risC < 1],
        [`ingen stod i en vägg (${iVagg}) eller i vattnet (${iVattnet})`, iVagg === 0 && iVattnet === 0],
        [`elden nära byn slocknade efter ${(tim / 12).toFixed(1)} timmar${by.brand ? ` (${by.brand.r.length} rutor brinner längre bort)` : ''}`, by.brand ? !naraByn() : slocknat],
        [`marken var svart (${svart0} rutor) och det svarta är borta efter ${SIM.BRAND.svart} dygn`, svart0 > 0 && !sv.aska],
      ];
    }
  },
};

SCENARIER.brinner = {
  text: 'Steg 6.4.16: en människa kan börja brinna och får brännskador tills elden är släckt. Hen släcker sig själv först (rullar, går i vattnet eller sliter av sig plagget), och de som står nära springer dit och hjälper till; båda går före allt annat',
  kor: () => {
    const a = torrAng();
    if (typeof a === 'string') return [[a, false]];
    const { s } = a;
    const vuxna = (x: State) => living(x).filter(q => SIM.ageOf(q, x.now) >= 18 && SIM.kanGa(q));
    // 1: en vuxen börjar brinna och släcker sig själv
    const x = cloneState(s), p = vuxna(x)[0];
    SIM.antand(x, p, 'i testet');
    const brann = p.brinner !== undefined;
    let valde = '', sek = 0;
    for (; sek < 15 * 60 && p.brinner !== undefined; sek += 5) { step(x, 5); if (p.task && !valde) valde = p.task.act; }
    const slackt = p.brinner === undefined && SIM.alive(p);
    // 2: en vuxen står bredvid den som brinner och springer dit
    const y = cloneState(s), [b, q] = vuxna(y);
    q.x = b.x + 2; q.y = b.y; q.task = undefined;
    SIM.antand(y, b, 'i testet');
    step(y, 5);
    const qt = uppg(q), hjalper = qt?.act === 'hjalpaBrinnande' && qt.ref === b.id;
    // 3: den som brinner utan att släckas får brännskador, och plaggen kan brinna upp
    const z = cloneState(s), r = vuxna(z)[0];
    r.brinner = z.now;
    for (let i = 0; i < 12; i++) { z.now += 60 * SIM.SEC; SIM.brinnerSteg(z, 60); }
    const st = z.stat ?? {}, sx = x.stat ?? {};
    return [
      [`${p.name} börjar brinna (${brann ? 'ja' : 'nej'}) och väljer först att släcka sig själv (${ACTS_NAMN(valde)})`, brann && valde === 'slackaSig'],
      [`elden på ${p.name} är släckt efter ${(sek / 60).toFixed(1)} minuter (${Object.keys(sx).filter(k => k.startsWith('brinner slackt ')).join(', ')})`, slackt && sek <= 10 * 60],
      [`den som står bredvid springer dit och släcker (${ACTS_NAMN(qt?.act ?? '')})`, hjalper],
      [`den som brinner i tolv minuter får brännskador (${st['brinner skadad'] ?? 0})`, (st['brinner skadad'] ?? 0) > 0],
    ];
  },
};
const uppg = (o: Person) => o.task;
const ACTS_NAMN = (a: string) => (SIM.ACTS as Record<string, { namn: string }>)[a]?.namn ?? (a || 'inget');

SCENARIER.trangsel = {
  text: 'Steg 6.5.1: trängseln. Ett frö gror bara där träden runt om (ett vuxet träd 1, ett gammalt 2) är högst 3, och en planta där det är trängre står skuggad och växer inte. Det ger gläntor och tät skog',
  kor: () => {
    const s = createState(3, START), g = groundOf(s), f = SIM.eldPlats(s);
    // en ruta med högt gräs långt från byn, och ringen runt den: tom, med två vuxna träd eller med åtta
    let mitt = -1;
    for (let i = 0; i < W * W && mitt < 0; i++) {
      const x = i % W, y = Math.floor(i / W);
      if (x < 2 || y < 2 || x > W - 3 || y > W - 3 || Math.hypot(x - f.x, y - f.y) < 30) continue;
      let ok = true;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!isSoil(g.tiles[i + dy * W + dx])) ok = false;
      if (ok) mitt = i;
    }
    if (mitt < 0) return [['en ruta med jord runt om', false]];
    const ring = [-W - 1, -W, -W + 1, -1, 1, W - 1, W, W + 1].map(d => mitt + d);
    const prov = (antal: number, planta: boolean) => {
      const x = cloneState(s), gx = groundOf(x);
      for (const j of [mitt, ...ring]) { gx.cover[j] = 1; gx.trees[j] = 0; }
      ring.slice(0, antal).forEach(j => { gx.trees[j] = 1; gx.alder![j] = 0; });
      if (planta) gx.trees[mitt] = 0.2;
      // 400 timmar på sommaren (plantor i ringen tas bort, så att bara de vuxna träden räknas)
      for (let h = 0; h < 400; h++) { x.now += HOUR; SIM.growGround(x, 1, 2); for (const j of ring) if (gx.trees[j] > 0 && gx.trees[j] < 1) gx.trees[j] = 0; }
      return gx.trees[mitt];
    };
    const tva = prov(2, false), atta = prov(8, false), pTva = prov(2, true), pAtta = prov(8, true);
    return [
      [`med två vuxna träd runt om gror ett frö (${tva.toFixed(2)})`, tva > 0],
      [`med åtta vuxna träd runt om gror inget (${atta.toFixed(2)})`, atta === 0],
      [`en planta med två träd runt om växer (0,20 → ${pTva.toFixed(2)})`, pTva > 0.2],
      [`en planta med åtta träd runt om står skuggad (0,20 → ${pAtta.toFixed(2)})`, Math.abs(pAtta - 0.2) < 1e-6],
    ];
  },
};
SCENARIER.skogsvard = {
  text: 'Steg 6.5.2: skogsvården. Den som fäller träd långt från byn kommer på Skogsvård. När de närmaste träden att fälla står långt bort gräver byn upp en skuggad planta och sätter den nära byn, bredvid en stubbe, där inget ska byggas',
  kor: () => {
    const s = createState(3, START), g = groundOf(s), f = SIM.bynsMitt(s);
    const iRutan = (i: number) => Math.abs(i % W - f.x) <= SIM.SKOG.sokX && Math.abs(Math.floor(i / W) - f.y) <= SIM.SKOG.sokY;
    const vuxna = living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.ansvar), p = vuxna[0];
    // tekniken: att fälla ett träd långt bort för tanken framåt, nära byn inte
    const langt = (() => { for (let i = 0; i < W * W; i++) if (g.trees[i] >= 1 && SIM.utanforByn(s, i % W, Math.floor(i / W)) >= SIM.SKOGSVARD.langt + 2) return i; return -1; })();
    const nara = (() => { for (let i = 0; i < W * W; i++) if (g.trees[i] >= 1 && SIM.utanforByn(s, i % W, Math.floor(i / W)) < 3) return i; return -1; })();
    p.tek = { ...(p.tek ?? {}), yxa: 1 };
    if (nara >= 0) SIM.fallTanke(s, p, nara);
    const fore = p.tek.skogsvard ?? 0;
    for (let k = 0; k < 2000 && !SIM.knows(p, 'skogsvard'); k++) SIM.fallTanke(s, p, langt);
    const kom = SIM.knows(p, 'skogsvard');
    // skogen nära byn fälls: inget träd att fälla närmare än 2 × SKOGSVARD.langt (byns område växer under körningen), och stubbar där träden stod
    s.stubbar = [];
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, d = SIM.utanforByn(s, x, y);
      if (d < 2 * SIM.SKOGSVARD.langt && g.trees[i] > 0) { if (g.trees[i] >= 1 && d <= SIM.SKOGSVARD.maxAvst) s.stubbar.push({ x, y, t: s.now }); g.trees[i] = 0; g.cover[i] = 1; }
    }
    // en planta i den täta skogen längre bort: skuggad
    let kalla = -1;
    for (let i = W + 1; i < W * W - W - 1 && kalla < 0; i++) if (iRutan(i) && g.trees[i] >= 1 && SIM.utanforByn(s, i % W, Math.floor(i / W)) >= 2 * SIM.SKOGSVARD.langt && SIM.trangsel(g, i) >= 6) kalla = i;
    if (kalla >= 0) g.trees[kalla] = 0.2;
    const fall = SIM.narmasteFall(s), skugg = kalla >= 0 && SIM.skuggad(g, kalla);
    const utan = SIM.PROJEKT.plantera.kan(s, vuxna[1], { kyla: false, gras: 0 });
    const brist = SIM.PROJEKT.plantera.brist(s), kan = SIM.PROJEKT.plantera.kan(s, p, { kyla: false, gras: 0 });
    const u = SIM.PROJEKT.plantera.uppgift(s, p);
    const t = { act: 'plantera', phase: 'do', tx: u?.spot?.x ?? 0, ty: u?.spot?.y ?? 0, until: s.now, carry: 0, ref: u?.ref } as SIM.Task;
    p.task = t;
    SIM.plantaUppgravd(s, p, t);
    const uppe = kalla >= 0 && g.trees[kalla] === 0 && t.phase === 'back', mal = Math.floor(t.ty) * W + Math.floor(t.tx), md = SIM.utanforByn(s, mal % W, Math.floor(mal / W));
    const vidStubbe = s.stubbar.some(k => Math.abs(k.x - mal % W) <= 1 && Math.abs(k.y - Math.floor(mal / W)) <= 1);
    SIM.plantaSatt(s, p, t);
    const satt = Math.abs(g.trees[mal] - 0.2) < 1e-6;
    // i byn: alla vuxna kan skogsvård, och byn flyttar plantor av sig själv
    for (const q of vuxna) q.tek = { ...(q.tek ?? {}), skogsvard: 1 };
    setMat(s, { bar: 300, torkat: 100 });
    for (let i = W + 1; i < W * W - W - 1; i++) if (g.trees[i] >= 1 && SIM.utanforByn(s, i % W, Math.floor(i / W)) >= 2 * SIM.SKOGSVARD.langt && SIM.trangsel(g, i) >= 7 && iRutan(i) && (i % 3 === 0)) g.trees[i] = 0.3;
    kor(s, 48);
    const flyttade = s.stat?.plantorFlyttade ?? 0;
    return [
      [`ett träd nära byn ger ingen tanke på skogsvård (${fore})`, fore === 0],
      ['den som fäller träd långt bort kommer på Skogsvård', kom],
      [`de närmaste träden att fälla står långt bort (${fall} rutor)`, fall >= SIM.SKOGSVARD.langt],
      ['plantan i den täta skogen står skuggad', skugg],
      ['den som inte kan skogsvård flyttar inga plantor', !utan],
      ['byn vill flytta plantor, och den som kan gör det', brist > 0 && kan && !!u && u.ref === kalla],
      ['plantan grävs upp och bärs', uppe],
      [`den sätts nära byn (${md} rutor utanför), bredvid en stubbe`, md >= SIM.SKOGSVARD.minAvst && md <= SIM.SKOGSVARD.maxAvst && vidStubbe],
      ['den står i jorden med samma storlek', satt],
      [`byn flyttar plantor av sig själv (${flyttade} på 48 timmar)`, flyttade > 1],
    ];
  },
};

SCENARIER.buskar = {
  text: 'Steg 6.5.3: buskarna. Högt gräs som ingen gått på på tio dygn kan bli en buske, oftast där få stora träd står runt. En buske är tung att gå igenom, ger grenar, brinner lätt, försvinner där något byggs och sparas med byn',
  kor: () => {
    const s = createState(3, START), g = groundOf(s);
    // den öppna marken utanför byn: helt uppvuxet gräs, och ingen går där (bara marken växer, ingen tar steg)
    const oppen: number[] = [];
    for (let i = 0; i < W * W; i++) if (isSoil(g.tiles[i]) && g.trees[i] === 0 && SIM.utanforByn(s, i % W, Math.floor(i / W)) >= 6) { g.cover[i] = 1; oppen.push(i); }
    const trampad = oppen.filter((_, k) => k % 7 === 0), tramp = new Set(trampad);
    const fore = SIM.antalBuskar(g, SIM.VANLIG); // bärbuskarna finns från början (steg 6.5.4)
    let forsta = Infinity;
    for (let h = 0; h < 40 * 24; h++) {
      s.now += HOUR;
      for (const i of trampad) g.cover[i] = 0.97; // någon går här varje timme
      growGround(s, 1, 2);
      if (forsta === Infinity && SIM.antalBuskar(g, SIM.VANLIG) > 0) forsta = h;
    }
    const buskar = oppen.filter(i => g.buske![i] === SIM.BUSKE + SIM.VANLIG), iTramp = buskar.filter(i => tramp.has(i)).length;
    const glest = oppen.filter(i => !tramp.has(i) && SIM.trangsel(g, i) === 0), trangt = oppen.filter(i => !tramp.has(i) && SIM.trangsel(g, i) >= 3);
    const andel = (l: number[]) => l.length ? l.filter(i => SIM.arBuske(g, i)).length / l.length : 0;
    const b = buskar[0] ?? -1;
    const slag = b >= 0 ? SIM.markslag(g, b) : '', fart = b >= 0 ? SIM.markFart(g, b) : 0;
    const gren = b >= 0 ? SIM.grenFaktor(g, b) : 0, grenUtan = SIM.grenFaktor(g, glest.find(i => !SIM.arBuske(g, i) && SIM.grenFaktor(g, i) === 1) ?? 0);
    // sparas med byn
    const c = cloneState(s), lika = SIM.antalBuskar(groundOf(c)) === SIM.antalBuskar(g) && SIM.arBuske(groundOf(c), b);
    // där något byggs försvinner busken
    const fore2 = g.built; g.built = new Uint8Array(W * W); if (b >= 0) g.built[b] = 1;
    growGround(s, 1, 2);
    const bort = b >= 0 && !SIM.arBuske(g, b); g.built = fore2;
    const pc = (v: number) => `${Math.round(v * 100)} %`;
    return [
      [`inga vanliga buskar när byn grundas (${fore})`, fore === 0],
      [`den första busken kommer efter tio dygn utan steg (efter ${Math.floor(forsta / 24)} dygn)`, forsta >= SIM.ORORD && forsta < 40 * 24],
      [`buskar på den öppna marken (${buskar.length} av ${oppen.length})`, buskar.length > oppen.length * 0.05],
      [`ingen buske där någon går (${iTramp})`, iTramp === 0],
      [`fler buskar där få stora träd står runt (${pc(andel(glest))} mot ${pc(andel(trangt))} bland ${trangt.length} trånga rutor)`, trangt.length < 10 || andel(glest) > andel(trangt)],
      [`en buske är ett eget slags mark (${slag}) och lika tung att gå igenom som ungskog`, slag === 'buske' && Math.abs(fart - SIM.GANG.fartUng) < 1e-9],
      [`den som samlar vid en buske hittar fler grenar (${gren} mot ${grenUtan})`, gren > 1 && grenUtan === 1],
      ['en buske brinner lätt', SIM.BRAND.buske[0] >= SIM.BRAND.hog[0]],
      ['buskarna sparas med byn', lika],
      ['där något byggs försvinner busken', bort],
    ];
  },
};

SCENARIER.barbuskar = {
  text: 'Steg 6.5.4: bärbuskarna. De sås ut där bären växer när byn grundas, en buske som växer upp där bären växer blir en bärbuske, och bären i fyndkartan finns bara på bärbuskarna. De ger bär efter årstiden men inga grenar, och står kvar när skogen växer upp',
  kor: () => {
    const s = createState(3, START), g = groundOf(s), N = W * W;
    const bar = (i: number) => g.buske![i] === SIM.BUSKE + SIM.BARBUSKE;
    const fran = SIM.antalBuskar(g, SIM.BARBUSKE);
    // bären finns bara på bärbuskarna
    let utan = 0, med = 0;
    for (let i = 0; i < N; i++) { const v = SIM.vaxerAt(s, 'bar', i); if (v > 0 && !bar(i)) utan++; if (v > 0 && bar(i)) med++; }
    const b = Array.from({ length: N }, (_, i) => i).find(i => bar(i) && g.trees[i] === 0 && SIM.vaxerAt(s, 'bar', i) > 0) ?? -1;
    const sort = b >= 0 ? SIM.busksort(g, b) : undefined;
    // en buske som växer upp där bären växer blir en bärbuske: all mark utanför byn står orörd i 40 dygn
    for (let i = 0; i < N; i++) if (isSoil(g.tiles[i]) && SIM.utanforByn(s, i % W, Math.floor(i / W)) >= 6 && !SIM.arBuske(g, i)) g.cover[i] = 1;
    for (let h = 0; h < 40 * 24; h++) { s.now += HOUR; growGround(s, 1, 2); }
    const sedan = SIM.antalBuskar(g, SIM.BARBUSKE), vanliga = SIM.antalBuskar(g, SIM.VANLIG);
    // bärbusken står kvar när skogen växer upp, och utan busken finns inga bär
    let iSkog = false, borta = false;
    if (b >= 0 && bar(b)) {
      const t0 = g.trees[b]; g.trees[b] = SIM.FOREST; growGround(s, 1, 2); iSkog = bar(b); g.trees[b] = t0;
      SIM.tabortBuske(g, b); borta = SIM.vaxerAt(s, 'bar', b) === 0;
    }
    // en sparfil från före steg 6.5.4 får bärbuskarna utsådda
    const c = cloneState(s); delete c.buskar; delete c.barbuskar;
    const gamla = SIM.antalBuskar(groundOf(c), SIM.BARBUSKE);
    const c2 = cloneState(s), sparad = SIM.antalBuskar(groundOf(c2), SIM.BARBUSKE) === SIM.antalBuskar(g, SIM.BARBUSKE);
    return [
      [`bärbuskar när byn grundas (${fran})`, fran > 20],
      [`bär bara på bärbuskarna (${med} med, ${utan} utan)`, med > 0 && utan === 0],
      [`bärbusken heter ${sort?.namn} och ger bär men inga grenar`, !!sort?.bar && !sort.grenar],
      [`nya bärbuskar där bären växer (${fran} blev ${sedan}, och ${vanliga} vanliga)`, sedan > fran && vanliga > sedan - fran],
      ['inga bär i istiden', SIM.FYND.bar.arstid![0] === 0],
      ['bärbusken står kvar när skogen växer upp', iSkog],
      ['där busken tas bort finns inga bär', borta],
      [`en äldre sparfil får bärbuskar (${gamla})`, gamla > 20],
      ['bärbuskarna sparas med byn', sparad],
    ];
  },
};

SCENARIER.vindfall = {
  text: 'Steg 6.5.5: vindfällen. När det blåser väldigt hårt utan en tornado kan vuxna träd falla och bli liggande stammar med en stubbe där de stod; i svagare vind faller inga',
  kor: () => {
    const s = createState(1, START), g = groundOf(s), t0 = s.now;
    const vuxna = () => { let n = 0; for (let i = 0; i < W * W; i++) if (g.trees[i] >= SIM.FOREST) n++; return n; };
    let hard = 0, lugn = 0, fallnaHard = 0, fallnaLugn = 0;
    for (let t = t0; t < t0 + 35 * DAY; t += HOUR) {
      s.now = t;
      const v = SIM.vaderNu(s).vind, fore = vuxna();
      SIM.vindfallen(s);
      const f = fore - vuxna();
      if (v > SIM.VINDFALL.fran) { hard++; fallnaHard += f; } else { lugn++; fallnaLugn += f; }
    }
    const stammar = SIM.stocks(s).length, stubbar = (s.stubbar ?? []).length;
    return [
      [`träd faller i den hårda vinden (${fallnaHard} under ${hard} timmar)`, hard > 0 && fallnaHard > 0],
      [`inga i svagare vind (${fallnaLugn} under ${lugn} timmar)`, fallnaLugn === 0],
      [`de blir liggande stammar (${stammar}) med en stubbe (${stubbar})`, stammar >= fallnaHard && stubbar >= fallnaHard],
      [`inte för många på 35 dygn (${fallnaHard})`, fallnaHard < 200],
    ];
  },
};

SCENARIER.stubbar = {
  lang: true,
  text: 'Steg 6.5.7: stubbarna. Stubben blir alltid kvar när ett träd fälls, också där ett hus ska stå. Där något ska byggas grävs den bort först, fortare med benspaden, och ger 1–2 trä men inga grenar. Inget byggs eller läggs på en stubbe',
  kor: () => {
    const s = createState(1, START), g = groundOf(s), p = living(s)[0];
    // ett vuxet träd där ett hus ska stå fälls: stubben blir kvar
    const i = Array.from({ length: W * W }, (_, j) => j).find(j => g.trees[j] >= SIM.FOREST && SIM.utanforByn(s, j % W, Math.floor(j / W)) < 12)!;
    const x = i % W, y = Math.floor(i / W), stor = SIM.stamAv(g, i).ved;
    const fore = g.built; g.built = new Uint8Array(W * W); g.built[i] = 1;
    SIM.fellTree(s, p, x + 0.5, y + 0.5);
    const kvar = SIM.stubbeOn(s, x, y), ska = SIM.skaGravas(s).some(k => k.x === x && k.y === y);
    const u = SIM.stubbeUppgift(s, p);
    // stubben grävs bort: lite trä och inga grenar
    const stammar = SIM.stocks(s).length;
    SIM.stubbeGravd(s, p, { act: 'stubbe', ref: u?.ref } as SIM.Task);
    const ny = SIM.stocks(s).length > stammar ? SIM.stocks(s)[SIM.stocks(s).length - 1] : undefined, borta = !SIM.stubbeOn(s, x, y);
    g.built = fore;
    // i en hel by: stubbarna där husen ska stå grävs bort, och inget hus byggs på en stubbe
    const b = createState(3, START); let pa = 0;
    kor(b, 10 * 24, q => { for (const bit of SIM.bitsOf(q)) if (bit.b > 0 && bit.b < 1 && SIM.stubbeOn(q, bit.x, bit.y)) pa++; });
    const gravda = b.stat?.stubbarGravda ?? 0;
    return [
      ['stubben blir kvar där ett hus ska stå', kvar],
      ['den ska grävas bort', ska],
      [`att gräva tar ${u?.min} minuter för hand, kortare med benspaden`, u?.min === SIM.SKOG.stubbeMin && SIM.SKOG.stubbeSpade < 1],
      ['stubben är borta när den grävts bort', borta],
      [`den ger ${ny?.ved} trä (trädet gav ${stor}) och inga grenar`, !!ny && ny.ved === (stor >= SIM.SKOG.stamVed * SIM.SKOG.stubbeStor ? 2 : 1) && ny.grenar === 0],
      [`byn gräver bort stubbar på 10 dygn (${gravda})`, gravda > 0],
      [`inget byggs på en stubbe (${pa})`, pa === 0],
    ];
  },
};

SCENARIER.kartkant = {
  text: 'Steg 6.5.8: kartkanten räknas som skog när fröna sprids, så att ny skog kan växa in från kanten även om all skog på kartan huggits ner',
  kor: () => {
    const s = createState(2, START), g = groundOf(s), N = W * W;
    for (let i = 0; i < N; i++) { g.trees[i] = 0; if (isSoil(g.tiles[i])) g.cover[i] = 1; }
    for (let h = 0; h < 20 * 24; h++) { s.now += HOUR; growGround(s, 1, 2); }
    let kant = 0, kantN = 0, inne = 0, inneN = 0;
    for (let i = 0; i < N; i++) {
      if (!isSoil(g.tiles[i])) continue;
      const x = i % W, y = Math.floor(i / W), vid = x === 0 || y === 0 || x === W - 1 || y === W - 1;
      if (vid) { kantN++; if (g.trees[i] > 0) kant++; } else if (x > 5 && y > 5 && x < W - 6 && y < W - 6) { inneN++; if (g.trees[i] > 0) inne++; }
    }
    const pc = (a: number, b: number) => b ? Math.round(a / b * 1000) / 10 : 0;
    return [
      [`jord vid kartkanten (${kantN} rutor)`, kantN > 20],
      [`plantor vid kanten efter 20 dygn utan skog (${kant}, ${pc(kant, kantN)} %)`, kant > 0],
      [`fler vid kanten än inne på kartan (${pc(kant, kantN)} % mot ${pc(inne, inneN)} %)`, pc(kant, kantN) > pc(inne, inneN) * 3],
    ];
  },
};

SCENARIER.styckning = {
  text: 'Steg 6.6.1: ett fällt djur som väger mer än bäraren orkar styckas där det ligger. Bäraren tar så många delar som ryms, resten och skinnet ligger kvar som en hög, och delarna slaktas vid slaktbänken',
  kor: () => {
    const s = createState(3, START);
    const vuxna = living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.ansvar);
    medBank(s);
    for (const r of s.people) r.tek = { ...r.tek, kniv: 1 };
    s.ting = (s.ting ?? []).filter(t => t.k !== 'kniv'); SIM.newTing(s, 'kniv', 1, vuxna[0].id);
    const svag = vuxna[0], stark = vuxna[1];
    svag.pot = { ...svag.pot, styrka: 1 }; stark.pot = { ...stark.pot, styrka: 20 };
    const x = 5, y = 5;
    const bar = (p: Person) => { p.x = x + 0.5; p.y = y + 0.5; p.task = { act: 'vargjakt', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 1, prog: 1, why: 'Bär hem en fälld varg' }; return p.task; };
    const hogar = () => SIM.stacksOf(s).filter(g => g.x === x && g.y === y && g.n > 0).map(g => `${g.k} ${g.n}`).sort().join(', ');
    const tStark = bar(stark), kvarStark = SIM.styckaFallt(s, stark, tStark, 'varg');
    const tSvag = bar(svag), kvarSvag = SIM.styckaFallt(s, svag, tSvag, 'varg');
    const hog = hogar();
    // delarna slaktas vid bänken
    setMat(s, {}); setAmount(s, 'vargkott', 0); setAmount(s, 'vargdel', 2);
    SIM.bearbeta(s, svag, SIM.DJUR.vargdel, 2);
    const kott = amountOf(s, 'vargkott');
    return [
      [`den starka (orkar ${SIM.bordPlats(s, stark).toFixed(0)}) bär vargen hel`, kvarStark === 0 && tStark.carry === 1 && !tStark.items],
      [`den svaga (orkar ${SIM.bordPlats(s, svag).toFixed(0)}) styckar den i två delar och bär ${tSvag.items?.vargdel ?? 0}`, tSvag.carry === 0 && (tSvag.items?.vargdel ?? 0) >= 1 && (tSvag.items?.vargdel ?? 0) + kvarSvag === 2],
      [`styckningen tar tid (${((tSvag.until - s.now) / SIM.MIN).toFixed(0)} min)`, tSvag.until > s.now],
      [`högen på platsen: ${hog}`, hog.includes('vargskinn 1') && (kvarSvag === 0 || hog.includes(`vargdel ${kvarSvag}`))],
      [`två delar slaktade gav ${kott} vargkött`, kott >= 10],
      ['styckdelen är en sak med namn och bild', SIM.SAKER.vargdel?.namn === 'Vargstycke'],
    ];
  },
};

SCENARIER.radjur = {
  text: 'Steg 6.6.2: rådjur betar i små grupper i skogskanten, långt från byn, och flyr längre än hararna. Bara spjutet fäller ett rådjur; det bärs hem helt eller styckas där det föll, och slaktas till kött, ben, skinn och talg',
  kor: () => {
    const s0 = createState(6, START);
    klockan(s0);
    const g = SIM.radjurGrupper(s0), m = getMap(s0.seed), h = m.fire;
    const kant = g.filter(q => isSoil(m.tiles[tileOf(q.x, q.y)])).length;
    const langt = g.every(q => Math.hypot(q.x - h.x, q.y - h.y) >= SIM.RADJUR.hemAvst - 3);
    const r0 = SIM.radjurOf(s0)[0];
    // flykten: en människa nära rådjuret
    const nara = { x: r0.x + 1, y: r0.y }, efter = SIM.radjurOf(s0, s0.now, [nara]).find(d => d.id === r0.id);
    const flydde = !efter || Math.hypot(efter.x - nara.x, efter.y - nara.y) > Math.hypot(r0.x - nara.x, r0.y - nara.y) + 2;
    // jakten: många försök från samma läge, med spjut och med stenar
    const p0 = living(s0).find(q => SIM.ageOf(q, s0.now) >= 16)!;
    const prova = (verktyg: string | undefined, n: number, styrka?: number) => {
      const ut = { fallt: 0, radmal: 0, del: 0, hel: 0 };
      const s = cloneState(s0), p = SIM.byId(s, p0.id)!;
      if (styrka !== undefined) p.pot = { ...p.pot, styrka };
      p.tek = { ...p.tek, kniv: 1 }; SIM.newTing(s, 'kniv', 1, p.id);
      for (let i = 0; i < n; i++) {
        Object.assign(s, { djurDoda: undefined, djurHalsa: undefined, djurSkramd: undefined, djurFlykt: undefined, stackar: [] }); s.ting = (s.ting ?? []).filter(t => t.k !== 'flintspjut');
        if (verktyg) { const t = SIM.addTool(s, verktyg, p); t.hos = p.id; }
        p.x = r0.x - 8; p.y = r0.y;
        const tk = { act: 'jakt', phase: 'do', tx: r0.x, ty: r0.y, until: s.now + HOUR, carry: 0, tool: verktyg } as SIM.Task;
        SIM.jaktForsok(s, p, tk);
        if (!tk.jf) continue;
        if (SIM.arRadjur(tk.jf.id)) ut.radmal++;
        SIM.jaktKlar(s, p, tk);
        if (tk.items?.radjur) { ut.fallt++; ut.hel++; }
        if (tk.items?.radjurdel) { ut.fallt++; ut.del++; }
        p.skador?.splice(0); p.health = 1;
      }
      return ut;
    };
    const spjut = prova('flintspjut', 150), sten = prova(undefined, 60), stark = prova('flintspjut', 150, 20);
    // slakten
    const s = createState(3, START);
    medBank(s);
    const q = living(s).find(x => SIM.ageOf(x, s.now) >= 16)!;
    for (const r of s.people) r.tek = { ...r.tek, kniv: 1 };
    s.ting = (s.ting ?? []).filter(t => t.k !== 'kniv'); SIM.newTing(s, 'kniv', 1, q.id);
    setMat(s, {}); for (const k of ['kott', 'ben', 'radjursskinn', 'talg']) setAmount(s, k, 0); setAmount(s, 'radjur', 1);
    SIM.bearbeta(s, q, SIM.DJUR.radjur, 1);
    const fick = ['kott', 'ben', 'radjursskinn', 'talg'].map(k => `${k} ${amountOf(s, k)}`).join(', ');
    return [
      [`rådjursgrupper på kartan (${g.length}, ${g.reduce((a, x) => a + x.n, 0)} djur)`, g.length >= 1 && g.every(x => x.n >= SIM.RADJUR.storlek[0])],
      [`grupperna står på mark, inte i vattnet (${kant} av ${g.length})`, kant === g.length],
      ['grupperna betar långt från byns eld', langt],
      ['rådjuret flyr från den som kommer nära', flydde],
      [`med spjut går jägaren mot rådjuret (${spjut.radmal} av 150)`, spjut.radmal > 100],
      [`med spjut fälls rådjur (${spjut.fallt} av 150)`, spjut.fallt > 0],
      [`med stenar jagas inga rådjur (${sten.radmal})`, sten.radmal === 0],
      [`den som inte orkar bära det helt styckar det (${spjut.del} styckade, ${spjut.hel} hela)`, spjut.del > 0],
      [`den starka bär hem rådjuret helt (${stark.hel} hela, ${stark.del} styckade)`, stark.hel > 0],
      [`slakten gav ${fick}`, amountOf(s, 'kott') >= 4 && amountOf(s, 'ben') === 2 && amountOf(s, 'radjursskinn') === 1 && amountOf(s, 'talg') === 2],
    ];
  },
};

SCENARIER.faglar = {
  text: 'Steg 6.6.3: fåglar i små flockar på marken, i tre utseenden efter platsen. De flyger upp när någon kommer nära, och efter ett försök att fälla en flyger alla nära iväg för en stund. Spjutet eller stenen fäller dem sällan; en fågel slaktas till kött och fjädrar, och samlarna hittar ägg på våren',
  kor: () => {
    const s0 = createState(6, START);
    klockan(s0);
    const g = SIM.fagelFlockar(s0, s0.now), m = getMap(s0.seed);
    const mark = g.filter(q => isSoil(m.tiles[tileOf(q.x, q.y)])).length, utseenden = new Set(g.map(q => q.u)).size;
    const f0 = SIM.faglarOf(s0, s0.now)[0];
    const nara = { x: f0.x + 1, y: f0.y }, efter = SIM.faglarOf(s0, s0.now, [nara]).find(d => d.id === f0.id);
    const flog = !efter || Math.hypot(efter.x - nara.x, efter.y - nara.y) > Math.hypot(f0.x - nara.x, f0.y - nara.y) + 2;
    const sb = cloneState(s0); SIM.faglarFlygerBort(sb, f0.x, f0.y, sb.now);
    const borta = !SIM.faglarOf(sb, sb.now).some(d => Math.hypot(d.x - f0.x, d.y - f0.y) < SIM.FAGEL.bort - 1);
    const tillbaka = SIM.faglarOf(sb, sb.now + (SIM.FAGEL.aterTim + 1) * HOUR).length > 0;
    // jakten: många försök mot fåglarna där ingen hare eller inget rådjur är nära
    const p0 = living(s0).find(q => SIM.ageOf(q, s0.now) >= 16)!;
    const mal = SIM.faglarOf(s0, s0.now).find(d => !SIM.djurOf(s0, s0.now).some(k => Math.hypot(k.x - d.x, k.y - d.y) < 12) && !SIM.radjurOf(s0, s0.now).some(k => Math.hypot(k.x - d.x, k.y - d.y) < 30));
    const ut = { forsok: 0, fagel: 0, fallt: 0 };
    if (mal) {
      const s = cloneState(s0), p = SIM.byId(s, p0.id)!;
      for (let i = 0; i < 200; i++) {
        Object.assign(s, { djurDoda: undefined, djurHalsa: undefined, djurSkramd: undefined, djurFlykt: undefined, faglarBorta: undefined, stackar: [] }); s.ting = (s.ting ?? []).filter(t => t.k !== 'flintspjut');
        const t = SIM.addTool(s, 'flintspjut', p); t.hos = p.id;
        p.x = mal.x - 6; p.y = mal.y;
        const tk = { act: 'jakt', phase: 'do', tx: mal.x, ty: mal.y, until: s.now + HOUR, carry: 0, tool: 'flintspjut' } as SIM.Task;
        SIM.jaktForsok(s, p, tk);
        if (!tk.jf) continue;
        ut.forsok++;
        if (SIM.arFagel(tk.jf.id)) ut.fagel++;
        SIM.jaktKlar(s, p, tk);
        if (tk.items?.fagel) ut.fallt++;
        p.skador?.splice(0); p.health = 1;
      }
    }
    // slakten
    const s = createState(3, START);
    medBank(s);
    const q = living(s).find(x => SIM.ageOf(x, s.now) >= 16)!;
    for (const r of s.people) r.tek = { ...r.tek, kniv: 1 };
    s.ting = (s.ting ?? []).filter(t => t.k !== 'kniv'); SIM.newTing(s, 'kniv', 1, q.id);
    setMat(s, {}); for (const k of ['kott', 'fjadrar']) setAmount(s, k, 0); setAmount(s, 'fagel', 1);
    SIM.bearbeta(s, q, SIM.DJUR.fagel, 1);
    // äggen: en by på våren några dygn
    const sv = createState(4, START);
    const varen = ageIndex(sv) === 1;
    let agg = 0;
    kor(sv, 72, x => { agg = Math.max(agg, amountOf(x, 'agg') + x.people.reduce((a, r) => a + (r.task?.items?.agg ?? 0), 0)); });
    return [
      [`fågelflockar på kartan (${g.length}, ${g.reduce((a, x) => a + x.n, 0)} fåglar, ${utseenden} utseenden)`, g.length >= 1 && utseenden >= 1],
      [`flockarna är på marken, inte i vattnet (${mark} av ${g.length})`, mark === g.length],
      ['fågeln flyger upp när någon kommer nära', flog],
      ['efter ett försök flyger fåglarna nära iväg', borta],
      ['och kommer tillbaka efter en stund', tillbaka],
      [`jägaren går mot fåglarna när inget annat vilt är nära (${ut.fagel} av ${ut.forsok})`, !!mal && ut.fagel > 0],
      [`fåglar fälls, men sällan (${ut.fallt} av ${ut.forsok})`, ut.fallt > 0 && ut.fallt < ut.forsok / 2],
      [`slakten gav kött ${amountOf(s, 'kott')} och fjädrar ${amountOf(s, 'fjadrar')}`, amountOf(s, 'kott') === 1 && amountOf(s, 'fjadrar') === 1],
      [`samlarna hittar ägg på våren (${agg}${varen ? '' : ', byn startade inte på våren'})`, agg > 0],
    ];
  },
};

SCENARIER.bjorn = {
  text: 'Steg 6.6.4: björnen är sällsynt, högst en på kartan och inte varje år. Den vandrar från våren till hösten och är borta under istiden, går långsamt mellan bärbuskarna när bären är mogna och stranden där den fiskar, och håller sig en bit från byplatsen',
  kor: () => {
    const s = createState(6, START), m = getMap(s.seed), h = m.fire, vt = SIM.vattenNu(s), STEG = 10 * 60_000;
    const ar = new Map<number, { istid: boolean; bjorn: boolean }>();
    let flest = 0, iIstid = 0, nara = Infinity, iVatten = 0, hopp = 0, barOmogna = 0, barN = 0, fiskN = 0, fore: { id: number; x: number; y: number } | undefined;
    for (let t = s.now; t < s.now + 35 * DAY; t += STEG) {
      const b = SIM.bjornarOf(s, t).filter(d => d.art === 'bjorn'), ai = ageIndex(s, t), y = yearNo(s, t); // ungarna (steg 6.6.5) räknas inte
      const e = ar.get(y) ?? { istid: ai === SIM.ISTID, bjorn: false };
      e.bjorn ||= b.length > 0; ar.set(y, e);
      flest = Math.max(flest, b.length);
      if (ai === SIM.ISTID && b.length) iIstid++;
      for (const d of b) {
        if (d.ater) nara = Math.min(nara, Math.hypot(d.x - h.x, d.y - h.y));
        if (vt[tileOf(d.x, d.y)] === T.Vatten) iVatten++;
        if (d.ater === 'bar') { barN++; if ((SIM.FYND.bar.arstid?.[ai] ?? 0) < 1) barOmogna++; }
        if (d.ater === 'fisk') fiskN++;
        if (fore?.id === d.id && Math.hypot(d.x - fore.x, d.y - fore.y) > SIM.BJORN.fart * STEG / HOUR + 1.5) hopp++;
        fore = { id: d.id, x: d.x, y: d.y };
      }
      if (!b.length) fore = undefined;
    }
    const utanfor = [...ar.values()].filter(e => !e.istid), med = utanfor.filter(e => e.bjorn).length;
    return [
      [`högst en björn på kartan (${flest})`, flest === 1],
      [`björnen kommer vissa år men inte alla (${med} av ${utanfor.length} år utanför istiden)`, med > 0 && med < utanfor.length],
      [`ingen björn under istiden (${iIstid} gånger)`, iIstid === 0],
      [`den äter en bit från byplatsen (närmast ${nara.toFixed(1)} rutor, gränsen ${SIM.BJORN.hemAvst})`, nara >= SIM.BJORN.hemAvst - 1],
      [`den äter bär (${barN}) och fiskar (${fiskN})`, barN > 0 && fiskN > 0],
      [`bär bara när de är mogna (${barOmogna} gånger utan)`, barOmogna === 0],
      [`den går, den hoppar inte (${hopp} hopp)`, hopp === 0],
      [`den står aldrig i vattnet (${iVatten} gånger)`, iVatten === 0],
    ];
  },
};

SCENARIER.bjornmote = {
  text: 'Steg 6.6.5: björnen möter folk. Ibland har den en eller två ungar med sig, som går tätt kring den och aldrig i vattnet. Den som är vaken, ute och kommer nära björnen möter den en gång per år: oftast blir hen rädd och drar sig undan, men björnen anfaller ibland, oftare när den har ungar, och då blir det en strid där den slår hårt',
  kor: () => {
    const s = createState(6, START), STEG = 20 * 60_000, vt = SIM.vattenNu(s);
    // ett ögonblick med björnen ute utan ungar och ett med ungar, ur de första 60 dygnen
    let utan: number | undefined, med: number | undefined, ungeLangt = 0, ungeVatten = 0, ungar = new Set<number>();
    for (let t = s.now; t < s.now + 60 * DAY; t += STEG) {
      const b = SIM.bjornarOf(s, t), mor = b.find(d => d.art === 'bjorn'), u = b.filter(d => d.art === 'bjornunge');
      if (!mor) continue;
      for (const d of u) { ungar.add(d.id); if (Math.hypot(d.x - mor.x, d.y - mor.y) > SIM.BJORN.ungeAvst + 0.01) ungeLangt++; if (vt[tileOf(d.x, d.y)] === T.Vatten) ungeVatten++; }
      if (u.length) med ??= t; else utan ??= t;
    }
    if (utan === undefined || med === undefined) return [[`björnen med och utan ungar (${utan}, ${med})`, false]];
    // många möten: en person ställs bredvid björnen, en gång i taget i en kopia av byn
    const json = JSON.stringify(s);
    const prova = (t: number, sover = false) => {
      const k = migrate(JSON.parse(json)); k.now = t;
      for (let r = 0; r < (t / 60_000) % 1000; r++) SIM.rnd(k, 'bjorn'); // en annan slump i varje försök
      const mor = SIM.bjornarOf(k, t).find(d => d.art === 'bjorn')!, p = living(k)[0];
      for (const q of living(k)) if (q !== p) { q.x = 2; q.y = 2; }
      p.x = mor.x + 1; p.y = mor.y; p.task = sover ? { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: t + HOUR, carry: 0 } as SIM.Task : undefined;
      SIM.bjornSteg(k);
      const igen = (k.stat?.bjornmote ?? 0);
      SIM.bjornSteg(k); // samma person samma år: inget nytt möte
      return { mote: k.stat?.bjornmote ?? 0, igen: (k.stat?.bjornmote ?? 0) - igen, strid: k.stat?.bjornstrid ?? 0, skador: p.skador?.length ?? 0, rädd: (p.thoughts ?? []).some((x: { text: string }) => /björn/.test(x.text)) };
    };
    const N = 120;
    let stridUtan = 0, stridMed = 0, mote = 0, igen = 0, skadad = 0, rädd = 0;
    for (let i = 0; i < N; i++) {
      // varje försök ett eget ögonblick, så att slumpen blir en annan
      const a = prova(utan + i * 60_000), b = prova(med + i * 60_000);
      stridUtan += a.strid; stridMed += b.strid; mote += a.mote + b.mote; igen += a.igen + b.igen;
      if (a.strid) skadad += a.skador > 0 ? 1 : 0; if (b.strid) skadad += b.skador > 0 ? 1 : 0;
      if (!a.strid && a.rädd) rädd++;
    }
    const sov = prova(utan, true);
    return [
      [`björnen har ungar vissa år (${ungar.size} ungar på 60 dygn)`, ungar.size > 0],
      [`ungarna går tätt kring björnen (${ungeLangt} gånger längre bort)`, ungeLangt === 0],
      [`ungarna står aldrig i vattnet (${ungeVatten} gånger)`, ungeVatten === 0],
      [`den som kommer nära möter björnen (${mote} möten av ${2 * N})`, mote === 2 * N],
      [`samma person möter den bara en gång per år (${igen} gånger till)`, igen === 0],
      [`oftast drar man sig undan rädd (${rädd} av ${N - stridUtan} utan strid)`, rädd === N - stridUtan],
      [`björnen anfaller sällan (${stridUtan} av ${N} utan ungar)`, stridUtan > 0 && stridUtan < N * 0.25],
      [`oftare när den har ungar (${stridMed} av ${N})`, stridMed > stridUtan],
      [`anfallet skadar (${skadad} av ${stridUtan + stridMed} strider)`, skadad > (stridUtan + stridMed) / 2],
      [`den som sover möter den inte (${sov.mote})`, sov.mote === 0],
    ];
  },
};

SCENARIER.bjornjakt = {
  lang: true,
  text: 'Steg 6.6.6: björnjakten. När någon sett björnen kan byn gå på björnjakt, men bara en stor grupp med spjut: med för få spjut blir det ingen jakt. Jägarna följer björnen och anfaller den tillsammans. En fälld björn kommer inte tillbaka det året; den styckas där den föll, bärs hem i delar och ger björnskinnet, och den som fällde den blir björndödare',
  kor: () => {
    const s0 = createState(6, START);
    // ett ögonblick i dagsljus med björnen ute utan ungar
    let t0: number | undefined;
    for (let t = s0.now; t < s0.now + 60 * DAY && t0 === undefined; t += 20 * 60_000) {
      const b = SIM.bjornarOf(s0, t);
      if (b.length === 1 && SIM.isLight(t) && SIM.isLight(t + 4 * HOUR)) t0 = t;
    }
    if (t0 === undefined) return [['ett ögonblick med björnen', false]];
    const json = JSON.stringify(s0);
    const by = (spjut: number, forsok: number) => {
      const s = migrate(JSON.parse(json)); s.now = t0! + forsok * 7 * 60_000;
      for (let r = 0; r < forsok * 13; r++) SIM.rnd(s, 'bjorn');
      for (const [x, a] of [['m', 30], ['k', 28], ['m', 35], ['k', 24], ['m', 40], ['k', 33]] as const) nyInvanare(s, x, a);
      setMat(s, { vilt: 30, bar: 30 });
      const vuxna = living(s).filter(q => SIM.ageOf(q, s.now) >= 18 && SIM.ageOf(q, s.now) < 50);
      vuxna.forEach((q, i) => { if (i < spjut) { const k = SIM.addTool(s, 'flintspjut', q); k.hos = q.id; } SIM.addTool(s, 'kniv', q).hos = q.id; q.pot.mod = 18; q.pot.styrka = 16; });
      for (const q of living(s)) (q.tek ??= {}).kniv = 1;
      const b = SIM.bjornarOf(s).find(d => d.art === 'bjorn')!;
      s.bjornJakt = { ar: SIM.yearNo(s, s.now), sedd: s.now, sag: vuxna[0].id };
      for (let i = 0; i < 30 && !s.bjornJakt?.jagare; i++) { s.bjornJakt!.timme = undefined; SIM.bjornSteg(s); }
      const jagare = s.bjornJakt?.jagare?.length ?? 0;
      if (!jagare) return { s, jagare, b };
      for (let i = 0; i < 12 * 5 * 60 / 5 && (s.stat?.bjornstrid ?? 0) + (s.stat?.bjornjaktGick ?? 0) === 0; i++) step(s, BEAT);
      for (let i = 0; i < 60; i++) step(s, BEAT); // styckningen och bärandet börjar
      return { s, jagare, b };
    };
    const fa = by(3, 0);
    let jakter = 0, strider = 0, falld = 0, borta = 0, dodare = 0, delar = 0, skinn = 0, gick = 0, nadd = 0, maxJ = 0;
    for (let f = 0; f < 10; f++) {
      const { s, jagare } = by(6, f);
      if (!jagare) continue;
      jakter++; maxJ = Math.max(maxJ, jagare);
      strider += s.stat?.bjornstrid ? 1 : 0; gick += s.stat?.bjornjaktGick ? 1 : 0; nadd += s.stat?.bjornstrid || s.stat?.bjornjaktGick ? 1 : 0;
      if (s.bjornFalld !== undefined) {
        falld++;
        if (!SIM.bjornarOf(s).length && !SIM.bjornarOf(s, s.now + 30 * HOUR * 0 + 2 * HOUR).length) borta++;
        if (living(s).some(q => SIM.ryktbarhet(s, q.id) && (q.liv?.bjornar ?? 0) > 0)) dodare++;
        const ute = SIM.pilesOf(s).reduce((a, h) => a + (h.k === 'bjorndel' ? h.n : 0), 0) + living(s).reduce((a, q) => a + (q.task?.items?.bjorndel ?? 0), 0) + amountOf(s, 'bjorndel');
        if (ute > 0) delar++;
        if (SIM.pilesOf(s).some(h => h.k === 'bjornskinn') || amountOf(s, 'bjornskinn') > 0) skinn++;
      }
    }
    return [
      [`med för få spjut går ingen på björnjakt (${fa.jagare} jägare)`, fa.jagare === 0],
      [`med sex spjut kallar byn till björnjakt (${jakter} av 10)`, jakter >= 8],
      [`en stor grupp följer med (högst ${maxJ})`, maxJ >= SIM.BJORNJAKT.spjut],
      [`jägarna når björnen och slåss, eller den går undan (${strider} strider, ${gick} gick undan, en björn kan först slåss och sedan gå undan)`, nadd === jakter && strider > 0],
      [`björnen fälls ibland (${falld} av ${strider})`, falld > 0],
      [`en fälld björn är borta resten av året (${borta} av ${falld})`, borta === falld],
      [`den som fällde den är björndödare (${dodare} av ${falld})`, dodare === falld],
      [`björnen styckas och bärs hem i delar (${delar} av ${falld})`, delar === falld],
      [`skinnet ligger i högen eller i förrådet (${skinn} av ${falld})`, skinn === falld],
    ];
  },
};
