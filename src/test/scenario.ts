// Scenariotester: ställ en by i ett visst läge, kör den en stund och kontrollera att det som ska hända händer.
// npm run scenario            kör alla
// npm run scenario -- glanta  kör bara ett
import { createState, step, living, temperature, coldOf, emigrationRate, birthWish, immigrationRate, sees, ageIndex, WEEK, sightOf, pilesOf, zoneOf, amountOf, STACK, capacity, load, inZone, wearStore, dropLoad, isLight, T, condOf, FOOD, isStored, zonesOf, allows, ageOf, makeSpear, spears, SPJUT_FORSOK, groundOf, getMap, fuelStock, DAY, HOUR, W, State, takenOf, Kind, kn, fearPlace, findL, areaOf, describe, migrate, forget, stat, campDist, campCenter } from '../sim';
import { FOREST, HIGH, isSoil } from '../sim/vag';
import { START } from './kor';

type Koll = [string, boolean];
const kor = (s: State, timmar: number, varje?: (s: State) => void) => { for (let i = 0; i < timmar * 12; i++) { step(s, 300, false); varje?.(s); } };
const logg = (s: State, t: string) => s.log.some(l => l.text.includes(t));
// andel jordrutor med skog, inom eller utanför ett avstånd från elden
function skogsandel(s: State, min: number, max: number) {
  const g = groundOf(s), f = getMap(s.seed).fire;
  let n = 0, sk = 0;
  for (let i = 0; i < g.tiles.length; i++) {
    const d = campDist(s, i % W, Math.floor(i / W));
    if (!isSoil(g.tiles[i]) || d < min || d >= max) continue;
    n++; if (g.trees[i] >= FOREST) sk++;
  }
  return n ? sk / n : 0;
}

// genomsnittligt uttag (0 = orört, 1 = tomt) på rutor inom ett avstånd från elden
function uttag(s: State, k: Kind, min: number, max: number) {
  const t = takenOf(s)[k];
  let n = 0, v = 0;
  for (let i = 0; i < t.length; i++) { const d = campDist(s, i % W, Math.floor(i / W)); if (d >= min && d < max) { n++; v += t[i]; } }
  return n ? v / n : 0;
}

const SCENARIER: Record<string, { text: string; kor: () => Koll[] }> = {
  glanta: {
    text: 'Ny by: gläntan finns, skogen står runt omkring och marken nöts till stigar',
    kor: () => {
      const s = createState(11, START);
      const forst: Koll[] = [
        ['gläntan är tom på träd', skogsandel(s, 0, 4) === 0],
        ['skog på nästan all jord utanför gläntan', skogsandel(s, 9, 99) > 0.95],
        ['ingen ved, bara grenar i förrådet', s.wood === 0 && (s.items.grenar ?? 0) > 0],
      ];
      kor(s, 10 * 24);
      const g = groundOf(s);
      let trampat = 0; for (let i = 0; i < g.cover.length; i++) if (isSoil(g.tiles[i]) && g.cover[i] < HIGH) trampat++;
      return [...forst,
        ['gräset har trampats ner till kort gräs eller stigar', trampat > 20],
        ['skogen står kvar runt byn efter 10 dygn', skogsandel(s, 9, 99) > 0.85],
        ['elden har tänts', s.fire.lightings > 0]];
    },
  },
  'ingen-yxa': {
    text: 'Byn hittar ingen flinta: inga träd fälls, elden hålls vid liv med grenar',
    kor: () => {
      const s = createState(12, START);
      kor(s, 30 * 24, s => { if (s.items.flinta) s.items.flinta = 0; });
      return [
        ['ingen yxa', !(s.items.yxa ?? 0)],
        ['inga träd fällda', !(s.fallda ?? 0)],
        ['ingen ved, bara grenar', s.wood === 0 && (s.items.grenar ?? 0) > 0],
        ['ingen dog av kyla', !s.people.some(p => p.cause === 'av kyla')],
        ['byn lever', living(s).length > 0]];
    },
  },
  yxa: {
    text: 'Byn har en yxa: träd fälls, stammarna huggs till ved och det växer högt gräs där träden stod',
    kor: () => {
      const s = createState(13, START);
      s.items.yxa = 1;
      const fallda = new Set<number>();
      let ved = 0;
      kor(s, 10 * 24, s => { ved = Math.max(ved, s.wood); for (const k of s.stockar ?? []) fallda.add(Math.floor(k.y) * W + Math.floor(k.x)); });
      const g = groundOf(s);
      let gras = 0; for (const i of fallda) if (g.trees[i] < FOREST && g.cover[i] >= 0.7) gras++;
      return [
        ['träd har fällts', (s.fallda ?? 0) >= 3],
        ['ved har huggits', ved > 0],
        [`gräs där träden stod (${gras} av ${fallda.size})`, gras > fallda.size / 2],
        ['stammarna huggs upp (högst 2 liggande)', (s.stockar ?? []).length <= 2]];
    },
  },
  'vinter-slocknad': {
    text: 'Istiden börjar med slocknad eld, kolhög och lite grenar: byn tänder igen på kolhögen',
    kor: () => {
      const s = createState(16, START);
      kor(s, 20 * 24 + 23); // till istidens början
      Object.assign(s.fire, { lit: false, fuel: 0, emberUntil: undefined, ash: 3, ashUntil: s.now + 3 * DAY });
      s.wood = 0; s.items.grenar = 30; s.items.kol = 2;
      const kyla = s.people.filter(p => p.cause === 'av kyla').length, t0 = s.now;
      let tand = -1;
      kor(s, 4 * 24, s => { if (tand < 0 && s.fire.lit) tand = (s.now - t0) / HOUR; });
      return [
        ['istid', s.lastAgeIdx === 0],
        [`elden tändes igen (efter ${tand.toFixed(1)} h)`, tand >= 0],
        ['tänd på den gamla kolhögen', logg(s, 'på den gamla kolhögen')],
        // att någon fryser ihjäl en vinter utan eld är rimligt, så det kontrolleras inte
        ['bränsle kvar eller insamlat', fuelStock(s) >= 0]];
    },
  },
  knapphet: {
    text: 'Bär, rötter och vilt tar slut nära byn för en tid, så invånarna går längre bort; fiske med händerna ger få fiskar per försök',
    kor: () => {
      const s = createState(15, START);
      kor(s, 12 * 24);
      const nara = uttag(s, 'samla', 0, 8), langt = uttag(s, 'samla', 16, 30), st = s.stat ?? {};
      return [
        [`mer plockat nära byn än långt bort (${nara.toFixed(2)} mot ${langt.toFixed(2)})`, nara > 0.02 && nara > langt * 3],
        [`vilt jagat (${uttag(s, 'jakt', 0, 12).toFixed(2)})`, uttag(s, 'jakt', 0, 12) > 0],
        // fiske väljs inte i alla byar; fisket testas utförligt i fiskespjut-scenariot
        [`fiske: ${st.fiskeForsok ?? 0} försök, ${st.fiskeNapp ?? 0} napp, ${st.fisk ?? 0} fiskar`, !st.fiskeForsok || ((st.fiskeForsok ?? 0) > (st.fiskeNapp ?? 0) && (st.fiskeNapp ?? 0) >= (st.fisk ?? 0))],
        ['ingen svalt ihjäl', !s.people.some(p => p.cause === 'av svält')]];
    },
  },
  svamp: {
    text: 'På hösten plockas kantareller, men ibland följer en giftig orange spindling med; den som förgiftas lär sig skilja dem åt och lär andra',
    kor: () => {
      const s = createState(16, START);
      kor(s, 21 * 24); // vår, sommar och höst
      const st = s.stat ?? {}, bast = Math.max(0, ...living(s).map(p => kn(p, 'svamp')));
      return [
        [`kantareller plockade (${st.svamp ?? 0})`, (st.svamp ?? 0) > 10],
        [`giftsvamp med i korgen (${st.giftsvamp ?? 0}) eller känd och lämnad (${st.giftsvampKand ?? 0})`, (st.giftsvamp ?? 0) + (st.giftsvampKand ?? 0) > 0],
        [`förgiftningar (${st.forgiftad ?? 0}) ger kunskap (bäst ${bast.toFixed(2)})`, !(st.forgiftad ?? 0) || bast > 0],
        ['byn lever', living(s).length > 0]];
    },
  },
  flinta: {
    text: 'Flinta hittas mest vid stenarna',
    kor: () => {
      let sten = 0, annan = 0;
      for (const seed of [21, 22, 23, 24]) {
        const s = createState(seed, START);
        kor(s, 10 * 24, s => { if (s.items.flinta) s.items.flinta = 0; }); // byn letar hela tiden
        sten += s.stat?.flintaSten ?? 0; annan += s.stat?.flintaAnnan ?? 0;
      }
      return [[`flinta vid stenarna ${sten}, på annat håll ${annan}`, sten > annan && sten > 0]];
    },
  },
};

SCENARIER.kunskap = {
  text: 'Var och en minns var det finns mat och flinta, berättar det för andra (ibland överdrivet), glömmer med tiden och blir rädd för platser där någon dött',
  kor: () => {
    const s = createState(31, START);
    const ute = living(s).filter(p => (p.lardomar?.length ?? 0) > 0).length;
    // en olycka långt från byn: de som såg den och de närmaste blir rädda
    const f = getMap(s.seed).fire, offer = living(s)[0], vittne = living(s)[2];
    offer.x = vittne.x = Math.min(W - 2, f.x + 14); offer.y = vittne.y = f.y;
    offer.died = s.now;
    fearPlace(s, offer, 'under en jakt');
    const a = areaOf(offer.x, offer.y), radd0 = living(s).filter(p => findL(p, 'fara', a)).length;
    // ingen förgiftning: svampkunskapen sprids genom samtal från en som kan
    const larare = living(s)[3]; larare.kunskap = { svamp: { v: 1, t: s.now } };
    let led2 = 0; // lärdomar i andra hand eller längre, räknat under hela tiden eftersom de också glöms
    kor(s, 8 * 24, s => { led2 = Math.max(led2, living(s).flatMap(p => p.lardomar ?? []).filter(l => (l.led ?? 0) >= 2).length); });
    const L = living(s), alla = L.flatMap(p => p.lardomar ?? []);
    const hort = alla.filter(l => l.src !== undefined);
    const radd = L.filter(p => findL(p, 'fara', a)).length, kan = L.filter(p => p !== larare && kn(p, 'svamp') > 0.1).length;
    const fel = L.flatMap(p => (p.lardomar ?? []).map(l => describe(s, p, l).wrong)).filter(Boolean).length;
    // minnet: den med bra minne glömmer långsammare
    const [m1, m2] = L.slice().sort((x, y) => stat(y, 'minne', s.now) - stat(x, 'minne', s.now)).filter((_, i, A) => i === 0 || i === A.length - 1);
    for (const p of [m1, m2]) p.lardomar = [{ k: 'samla', a: 0, v: 0.5, c: 1, t: s.now, led: 0 }];
    forget(s, 72);
    const c1 = m1.lardomar?.[0]?.c ?? 0, c2 = m2.lardomar?.[0]?.c ?? 0;
    // gammal sparfil: byns svampkunskap flyttas till var och en, och alla får egenskapen Minne
    const g = createState(32, START); g.kunskap = { svamp: 0.8 }; for (const p of g.people) delete (p.pot as Record<string, number>).minne;
    migrate(g);
    return [
      [`ingen minns några platser från början (${ute} personer gör det)`, ute === 0],
      [`lärdomar sprids i samtal (${hort.length} hörda, ${led2} i andra hand eller längre)`, hort.length > 10 && led2 > 0],
      [`glömska (${s.stat?.glomt ?? 0} lärdomar glömda)`, (s.stat?.glomt ?? 0) > 0],
      [`bra minne glömmer långsammare (säkerhet efter tre dygn ${c1.toFixed(2)} mot ${c2.toFixed(2)})`, c1 > c2 && c2 < 0.9],
      [`rädsla efter olyckan: ${radd0} genast, ${radd} efter åtta dygn`, radd0 >= 1 && radd > radd0],
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
    const t0 = new Date(s.founded).setHours(0, 0, 0, 0) + DAY; // midnatt efter grundandet
    const var_ = t0, istid = t0 + 3 * WEEK, sommar = t0 + WEEK;
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

SCENARIER.befolkning = {
  text: 'En stor by blir trång och folk flyttar, en liten by får nybyggare, och en tom by grundas på nytt',
  kor: () => {
    const s = createState(9, START);
    for (const p of s.people) p.died = s.now; // alla dör på en gång
    kor(s, 1);
    const ny = living(s).length;
    kor(s, 10 * 24);
    // nybyggare kommer slumpvis: räkna i tre små byar så att slumpen inte avgör
    let inv = s.stat?.invandrade ?? 0;
    for (const seed of [10, 11]) { const b = createState(seed, START); for (const p of b.people) p.died = b.now; kor(b, 10 * 24 + 1); inv += b.stat?.invandrade ?? 0; }
    return [
      [`en vandrare grundar byn på nytt (${s.stat?.atergrundad ?? 0} gång)`, ny >= 1 && s.stat?.atergrundad === 1 && logg(s, 'grundade byn på nytt')],
      [`fler nybyggare kommer till den lilla byn (${inv} på tio dygn i tre byar)`, inv >= 6],
      ['en trång by vill ha färre barn, en liten fler', birthWish(30) < 0.6 && birthWish(4) > 1 && birthWish(12) === 1],
      ['trängsel får folk att flytta, mer om de är missnöjda', emigrationRate(10, 0.6) === 0 && emigrationRate(30, 0.65) > 0.2 && emigrationRate(30, 0.4) > emigrationRate(30, 0.65) * 3],
      ['humöret betyder mindre i en liten by', emigrationRate(8, 0.4) < emigrationRate(26, 0.4) / 5],
      ['att hålla nere är starkare än att höja', 1 - birthWish(36) > birthWish(0) - 1 && immigrationRate(12) === 0],
    ];
  },
};

SCENARIER.fiskespjut = {
  text: 'Ett fiskespjut täljs av en pinne med flinta eller yxa, ger mer fisk än händerna och slits fort',
  kor: () => {
    const s = createState(4, START);
    s.items = { grenar: 10, flinta: 1 };
    const p = living(s).find(q => q.task === undefined || true)!;
    makeSpear(s, p);
    const gjort = spears(s) === 1 && s.items.flinta === 1; // flintan finns kvar
    s.stat = { ...(s.stat ?? {}), fiskeForsok: 1 };
    s.food = 3; // byn behöver mat
    kor(s, 4 * 24);
    const st = s.stat!, hand = (st.fiskeForsok ?? 0) - (st.spjutForsok ?? 0);
    const takt = (f: number, n: number) => n ? f / n : 0;
    return [
      ['spjutet täljs och det vassa verktyget finns kvar', gjort],
      [`spjutet används (${st.spjutForsok ?? 0} försök med spjut, ${hand} med händerna)`, (st.spjutForsok ?? 0) > 20],
      [`spjut ger mer fisk per försök (${takt(st.spjutFisk ?? 0, st.spjutForsok ?? 0).toFixed(2)} mot ${takt((st.fisk ?? 0) - (st.spjutFisk ?? 0), hand).toFixed(2)})`, hand < 20 || takt(st.spjutFisk ?? 0, st.spjutForsok ?? 0) > takt((st.fisk ?? 0) - (st.spjutFisk ?? 0), hand)],
      [`spjuten går sönder efter ${SPJUT_FORSOK} försök (${st.spjutTrasiga ?? 0} trasiga, ${st.spjutGjorda ?? 0} täljda)`, (st.spjutTrasiga ?? 0) >= 1 && (st.spjutGjorda ?? 0) >= 2],
    ];
  },
};

SCENARIER.bostad = {
  text: 'En ny by har ingen bostad: man sover på marken nära elden, och synvidden följer personen',
  kor: () => {
    const s = createState(12, START);
    const f = getMap(s.seed).fire;
    let sov = 0, nara = 0;
    kor(s, 24, s => { for (const p of living(s)) if (p.task?.act === 'sova' && p.task.phase === 'do') { sov++; if (Math.hypot(p.x - f.x - 0.5, p.y - f.y - 0.5) < 3.5) nara++; } });
    const p = living(s)[0]; p.x = f.x + 20; p.y = f.y; // ute i skogen
    const glanta = living(s)[1]; glanta.x = f.x + 1.5; glanta.y = f.y + 0.5;
    const natt = sightOf(s, glanta); s.now = new Date(s.now).setHours(12, 0, 0, 0); // mitt på dagen
    const dag = sightOf(s, glanta);
    return [
      ['ingen hydda finns på kartan', !('huts' in getMap(s.seed))],
      [`de som sover ligger nära elden (${nara} av ${sov})`, sov > 0 && nara === sov],
      ['man ser runt sig där man står, inte vid elden', sees(s, p, f.x + 20, f.y + 3) && !sees(s, p, f.x, f.y)],
      [`man ser kortare i mörker (${natt.toFixed(1)} mot ${dag.toFixed(1)} rutor i gläntan)`, natt <= dag],
      [`man ser kortare i skogen än i gläntan (${sightOf(s, p).toFixed(1)} mot ${sightOf(s, glanta).toFixed(1)} rutor)`, sightOf(s, p) < sightOf(s, glanta)],
    ];
  },
};

SCENARIER.fritid = {
  text: 'På fritiden tar folk promenader (de nyfikna och modiga längre bort), badar när det är varmt och sitter vid stranden',
  kor: () => {
    const folk: { d: number; v: number }[] = [];
    let prom = 0, bad = 0, badVarmt = true, n = 0, strand = 0, strandLand = true;
    for (const seed of [5, 6]) { // två byar, så att slumpen inte avgör
    const s = createState(seed, START), gang = new Map<number, number>();
    s.founded = s.now - WEEK; // sommar
    s.food = 40; s.wood = 40; // gott ställt, tid över
    const f = getMap(s.seed).fire;
    kor(s, 4 * 24, s => {
      for (const p of living(s)) {
        const t = p.task;
        if (t?.phase !== 'do') continue;
        const c = campCenter(s);
        if (t.act === 'promenad') { prom++; gang.set(p.id, Math.max(gang.get(p.id) ?? 0, Math.hypot(t.tx - c.x - 0.5, t.ty - c.y - 0.5))); }
        if (t.act === 'bada') { bad++; if (temperature(s) < 14) badVarmt = false; }
        if (t.act === 'strand') { strand++; if (getMap(s.seed).tiles[Math.floor(p.y) * W + Math.floor(p.x)] === T.Vatten) strandLand = false; }
      }
    });
    // längst bort: de mest nyfikna och modiga mot de minst
    folk.push(...s.people.filter(p => gang.has(p.id)).map(p => ({ d: gang.get(p.id)!, v: stat(p, 'nyfikenhet', s.now) + stat(p, 'mod', s.now) })));
    n = Math.max(n, gang.size);
    }
    folk.sort((a, b) => a.v - b.v);
    const h = Math.floor(folk.length / 2), snitt = (l: { d: number }[]) => l.length ? l.reduce((x, y) => x + y.d, 0) / l.length : 0;
    const lag = snitt(folk.slice(0, h)), hog = snitt(folk.slice(folk.length - h));
    return [
      [`folk tar promenader (${prom} femminuters-steg, upp till ${n} personer i en by)`, prom > 20 && n >= 3],
      [`nyfikna och modiga går längre (${hog.toFixed(1)} mot ${lag.toFixed(1)} rutor)`, hog > lag],
      [`folk badar på sommaren (${bad} femminuters-steg)`, bad > 10],
      ['man badar bara när det är varmt', badVarmt],
      [`folk sitter vid stranden (${strand} femminuters-steg)`, strand > 5],
      ['den som sitter vid stranden sitter på land', strandLand],
    ];
  },
};

SCENARIER.rotter = {
  text: 'Bär och rötter är olika slag i egna stackar; på sommaren samlar man mest bär, i istiden mest rötter',
  kor: () => {
    const andel = (vecka: number) => {
      const s = createState(7, START);
      s.founded = s.now - vecka * WEEK;
      s.mat = { kott: 300 }; s.food = 300; // kött äts före bär och rötter, så det man samlar blir kvar
      kor(s, 48);
      const b = amountOf(s, 'bar'), r = amountOf(s, 'rotter');
      return { b, r, skild: !pilesOf(s).some(p => p.k === 'bar' && p.n > STACK.bar + 1e-6) };
    };
    const sommar = andel(1), istid = andel(3);
    return [
      [`både bär och rötter samlas (sommar ${sommar.b.toFixed(0)} bär, ${sommar.r.toFixed(0)} rötter)`, sommar.b > 0 && sommar.r > 0],
      [`i istiden mest rötter (${istid.r.toFixed(0)} rötter mot ${istid.b.toFixed(0)} bär)`, istid.r > istid.b],
      [`på sommaren mest bär`, sommar.b > sommar.r],
    ];
  },
};

SCENARIER.lager = {
  text: 'Saker ligger i stackar på en lagerplats som byn gör större och mindre, och var och en bär efter sin styrka',
  kor: () => {
    const s = createState(3, START);
    const start = zoneOf(s).w * zoneOf(s).h;
    s.food = 230; s.wood = 90; s.items.grenar = 70; s.items.flinta = 3; // mycket på en gång
    kor(s, 18);
    const z = zoneOf(s), ps = pilesOf(s), stor = z.w * z.h;
    const summaOk = Object.keys(STACK).every(k => Math.abs(ps.filter(p => p.k === k).reduce((a, p) => a + p.n, 0) - (amountOf(s, k) >= (STACK[k] === 1 ? 1e-6 : 0.5) ? amountOf(s, k) : 0)) < 1e-6);
    // bära: kör en stund med gående invånare och se hur mycket de bär hem
    const b = createState(8, START);
    b.now = new Date(b.now).setHours(7, 0, 0, 0); b.food = 2; // morgon, och byn behöver mat
    let hem = 0, maxKvot = 0, fullt = 0;
    for (let i = 0; i < 8 * 3600 / 2; i++) {
      step(b, 2, true);
      for (const p of living(b)) if (p.task?.phase === 'back' && p.task.act !== 'elda') {
        const kv = load(p.task) / capacity(b, p); hem++; maxKvot = Math.max(maxKvot, kv); if (kv >= 0.95) fullt++;
      }
    }
    // den som har fullt går hem med en gång, även om uppgiften inte är klar
    const v = living(b).find(p => ageOf(p, b.now) >= 18)!;
    v.task = { act: 'samla', phase: 'do', tx: v.x, ty: v.y, until: b.now + 3 * HOUR, carry: capacity(b, v) * STACK.bar, why: 'test', dark: false };
    const mat0 = b.food;
    step(b, 2, true); step(b, 2, true);
    const gickHem = v.task?.phase === 'back' || b.food > mat0 + 10;
    const stark = living(b).slice().sort((x, y) => stat(y, 'styrka', b.now) - stat(x, 'styrka', b.now));
    // tomt lager krymper
    s.food = 5; s.wood = 0; s.items = { flinta: 1 };
    kor(s, 12);
    return [
      [`lagerplatsen växer när den blir full (${start} → ${stor} rutor, ${zonesOf(s).length} lagerplatser, ${ps.filter(p => p.out).length} av ${ps.length} stackar utanför)`, stor > start && ps.every(p => !p.out)],
      ['ingen stack är större än sin storlek, och stackarna innehåller allt i förrådet', ps.every(p => p.n <= p.max + 1e-9) && summaOk],
      [`folk bär hem saker, aldrig mer än de orkar (${hem} steg på väg hem, ${fullt} med full börda, högst ${(maxKvot * 100).toFixed(0)} % av förmågan)`, hem > 50 && maxKvot <= 1.15],
      ['den som bär så mycket hen orkar går hem med bördan', gickHem],
      ['den starke orkar bära mer än den svage', capacity(b, stark[0]) > capacity(b, stark[stark.length - 1])],
      [`lagerplatsen krymper när den står tom (${zoneOf(s).w * zoneOf(s).h} rutor)`, zoneOf(s).w * zoneOf(s).h < stor],
    ];
  },
};

SCENARIER.slitage = {
  text: 'Varje stack har ett skick: fisk ruttnar fortast, utanför lagret slits allt fortare, redskap slits i lagret, skämd mat gör folk sjuka och högar på marken bärs in (på natten bara nära lägret)',
  kor: () => {
    const setup = (b: State) => { b.mat = { fisk: 20, bar: 20 }; b.food = 40; b.wood = 25; b.items = { grenar: 50, yxa: 1 }; };
    const a = createState(4, START); setup(a);
    const b = createState(4, START); setup(b);
    b.lagren = [{ ...zoneOf(b), w: 1, h: 1 }]; // för litet: det mesta ligger bredvid
    wearStore(a, 24 * 3600, 2); wearStore(b, 24 * 3600, 2);
    const skick = (s: State, k: string) => { const p = pilesOf(s).filter(q => q.k === k); return p.reduce((x, q) => x + condOf(q) * q.n, 0) / Math.max(1e-9, p.reduce((x, q) => x + q.n, 0)); };
    const fisk = skick(a, 'fisk'), bar = skick(a, 'bar'), grenIn = 1 - skick(a, 'grenar'), grenUt = 1 - skick(b, 'grenar');
    const yxa = amountOf(a, 'yxa');
    // ved som slits ut blir grenar
    const v = pilesOf(a).find(q => q.k === 'ved')!; a.stackar!.find(q => q.x === v.x && q.y === v.y)!.c = 0.0001;
    wearStore(a, 3600, 2);
    // skämd mat: allt i förrådet är nästan förstört
    const m = createState(6, START);
    m.food = 200; pilesOf(m); for (const st of m.stackar!) st.c = 0.08;
    kor(m, 24, s => { for (const st of s.stackar!) if (FOOD.includes(st.k)) st.c = Math.min(st.c, 0.08); });
    const sjuka = m.stat?.skamdMat ?? 0, tagg = living(m).some(p => p.sickWhy === 'Magsjuk av skämd mat');
    // högar på marken: en nära elden och en långt bort, mitt i natten
    const mp = getMap(5), f = mp.fire, land = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < 40 && mp.tiles[y * W + x] !== T.Vatten && mp.tiles[y * W + x] !== T.Sten;
    const n = createState(5, START);
    n.now = new Date(n.now).setHours(23, 0, 0, 0);
    let nara: { x: number; y: number } | undefined, langt: { x: number; y: number } | undefined;
    for (let y = 0; y < 40; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - f.x, y - f.y);
      if (!nara && d >= 2.5 && d < 3.5 && land(x, y) && !isStored(n, x, y)) nara = { x, y };
      if (!langt && d >= 13 && d < 16 && land(x, y)) langt = { x, y };
    }
    const t0 = { act: 'samla' as const, phase: 'do' as const, tx: 0, ty: 0, until: 0, carry: 8, why: '', dark: true };
    dropLoad(n, { ...t0 }, nara!.x + 0.5, nara!.y + 0.5); dropLoad(n, { ...t0, act: 'ved' as const }, langt!.x + 0.5, langt!.y + 0.5);
    const ute = () => pilesOf(n).filter(p => !p.stored);
    const lagd = ute().length;
    for (let i = 0; i < 3 * 3600 / 2 && !isLight(n.now); i++) step(n, 2, true);
    const kvarNara = ute().some(g => g.x === nara!.x && g.y === nara!.y), kvarLangt = ute().some(g => g.x === langt!.x && g.y === langt!.y);
    n.now = new Date(n.now).setHours(9, 0, 0, 0);
    for (let i = 0; i < 6 * 3600 / 2 && ute().length; i++) step(n, 2, true);
    return [
      [`fisk ruttnar fortare än bär (skick efter ett dygn: fisk ${(fisk * 100).toFixed(0)} %, bär ${(bar * 100).toFixed(0)} %)`, fisk < bar && fisk < 1],
      [`grenar utanför lagret slits fortare (slitage på ett dygn: i lagret ${(grenIn * 100).toFixed(1)} %, bredvid ${(grenUt * 100).toFixed(1)} %)`, grenUt > 2 * grenIn && grenIn > 0],
      [`en yxa i lagret slits också (${yxa.toFixed(3)} kvar)`, yxa < 1 && yxa > 0.9],
      ['ved som slits ut blir grenar', pilesOf(a).some(q => q.k === 'grenar' && q.x === v.x && q.y === v.y)],
      [`skämd mat gör folk magsjuka (${sjuka} gånger på ett dygn)`, sjuka > 0 && tagg],
      [`den som kallas bort lägger bördan på marken (${lagd} högar)`, lagd === 2],
      ['på natten bärs högen nära lägret in men inte den långt bort', !kvarNara && kvarLangt],
      ['på dagen bärs även det som ligger långt bort in', !ute().length],
    ];
  },
};

SCENARIER.lagerplatser = {
  text: 'När lagret inte räcker gör byn en ny lagerplats och sorterar: maten närmast elden, material för sig',
  kor: () => {
    const s = createState(9, START);
    s.food = 600; s.wood = 200; s.items.grenar = 400;
    kor(s, 24);
    const zs = zonesOf(s), ps = pilesOf(s);
    const fel = ps.filter(p => p.zone >= 0 && !allows(zs[p.zone], p.k)).length;
    const summaOk = Object.keys(STACK).every(k => Math.abs(ps.filter(p => p.k === k && p.stored).reduce((a, p) => a + p.n, 0) - amountOf(s, k)) < 1e-3);
    return [
      [`en ny lagerplats görs när den första inte kan växa mer (${zs.length} lagerplatser)`, zs.length >= 2],
      [`maten får den första och material den nya (${zs.map(z => z.namn).join(', ')})`, zs[0].slag === 'mat' && zs[1]?.slag === 'material'],
      [`sakerna sorteras till rätt lagerplats (${fel} stackar ligger fel efter ett dygn)`, fel <= 2],
      ['stackarna innehåller allt i förrådet', summaOk && ps.every(p => p.n <= p.max + 1e-9)],
    ];
  },
};

const val = process.argv[2];
let fel = 0;
for (const [namn, sc] of Object.entries(SCENARIER)) {
  if (val && val !== namn) continue;
  const k = sc.kor(), ok = k.every(([, b]) => b);
  if (!ok) fel++;
  console.log(`${ok ? 'OK  ' : 'FEL '} ${namn}: ${sc.text}`);
  for (const [t, b] of k) if (!ok || !b) console.log(`     ${b ? '✓' : '✗'} ${t}`);
}
if (fel) { console.log(`${fel} scenario misslyckades.`); process.exitCode = 1; }
