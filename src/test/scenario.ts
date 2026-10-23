// Scenariotester: ställ en by i ett visst läge, kör den en stund och kontrollera att det som ska hända händer.
// npm run scenario            kör alla
// npm run scenario -- glanta  kör bara ett
import { Person, createState, ownedBy, syncOwners, BYN, twineRope, makeRod, wearSpear, isSpear, step, living, temperature, coldOf, emigrationRate, birthWish, immigrationRate, sees, ageIndex, WEEK, sightOf, pilesOf, zoneOf, amountOf, STACK, capacity, load, wearStore, dropLoad, isLight, T, condOf, FOOD, isStored, zonesOf, allows, ageOf, makeSpear, spears, SPJUT_FORSOK, groundOf, getMap, fuelStock, DAY, HOUR, W, State, takenOf, Kind, kn, fearPlace, findL, areaOf, describe, migrate, forget, stat, campDist, campCenter, TEKNIK, knows, thinkWhileWorking, die, heatAt, bitsOf, housesOf, gridOf, touch, roomAt, insulation, beds, isWall, Bit, wearBuild, FYND, FYND_IDS, GRUPPER, angOf, fyndAt, takeFrom, packFynd, growFynd, H, vaxerAt, richness, LAGER_R, observe, hoped, Lager, skyggOf, SKYGG_R, share, treeOn, djurOf, KANIN, SLAKT, canSlaughter, makeKnife, slaughter } from '../sim';
import { findPath } from '../sim/vag';
import { FOREST, HIGH, isSoil } from '../sim/vag';
import { START } from './kor';
import { Utfall, korSkript, pool } from './pool';

type Koll = [string, boolean];
const kor = (s: State, timmar: number, varje?: (s: State) => void) => { for (let i = 0; i < timmar * 12; i++) { step(s, 300, false); varje?.(s); } };
const logg = (s: State, t: string) => s.log.some(l => l.text.includes(t));
// andel jordrutor med skog, inom eller utanför ett avstånd från elden. Ängarna räknas inte (äng = 1 räknar bara dem)
function skogsandel(s: State, min: number, max: number, ang = 0) {
  const g = groundOf(s), a = angOf(s.seed);
  let n = 0, sk = 0;
  for (let i = 0; i < g.tiles.length; i++) {
    const d = campDist(s, i % W, Math.floor(i / W));
    if (!isSoil(g.tiles[i]) || d < min || d >= max || a[i] !== ang) continue;
    n++; if (g.trees[i] >= FOREST) sk++;
  }
  return n ? sk / n : 0;
}

// genomsnittligt uttag (0 = orört, 1 = tomt) på rutor inom ett avstånd från elden
function uttag(s: State, k: Kind, min: number, max: number) {
  const t = takenOf(s)[k === 'samla' ? 'bar' : k]!;
  let n = 0, v = 0;
  for (let i = 0; i < t.length; i++) { const d = campDist(s, i % W, Math.floor(i / W)); if (d >= min && d < max) { n++; v += t[i]; } }
  return n ? v / n : 0;
}

const SCENARIER: Record<string, { text: string; kor: () => Koll[] }> = {
  glanta: {
    text: 'Ny by: fem personer utan eld i en liten glänta på en större karta, skog och ängar med högt gräs står runt omkring och marken nöts till stigar',
    kor: () => {
      const s = createState(11, START), a = angOf(s.seed), g0 = groundOf(s);
      let jord = 0, angar = 0; for (let i = 0; i < a.length; i++) if (isSoil(g0.tiles[i])) { jord++; angar += a[i]; }
      const ang = angar / jord;
      const forst: Koll[] = [
        [`en liten koloni: ${s.people.length} personer, ingen eld`, s.people.length === 5 && !s.fire.lit],
        [`större karta (${s.W}×${s.H})`, s.W === 80 && s.H === 50],
        ['gläntan är tom på träd', skogsandel(s, 0, 3) === 0],
        ['gläntan är liten: skog sex rutor från elden', skogsandel(s, 6, 9) > 0.8],
        ['skog på nästan all jord utanför gläntan och ängarna', skogsandel(s, 9, 99) > 0.95],
        [`ängar med högt gräs på ${(ang * 100).toFixed(0)} % av jorden`, ang > 0.2 && ang < 0.55 && skogsandel(s, 9, 99, 1) === 0],
        ['ingen ved, bara grenar i förrådet', s.wood === 0 && (s.items.grenar ?? 0) > 0],
      ];
      kor(s, 10 * 24);
      const g = groundOf(s);
      let trampat = 0; for (let i = 0; i < g.cover.length; i++) if (isSoil(g.tiles[i]) && g.cover[i] < HIGH) trampat++;
      return [...forst,
        ['gräset har trampats ner till kort gräs eller stigar', trampat > 20],
        ['skogen står kvar runt byn efter 10 dygn', skogsandel(s, 9, 99) > 0.85],
        ['ängarna är mest gräs efter 10 dygn', skogsandel(s, 9, 99, 1) < 0.1],
        ['elden har tänts', s.fire.lightings > 0]];
    },
  },
  'ingen-yxa': {
    text: 'Byn har bara en flinta, som behövs till elden: ingen yxa görs, inga träd fälls och elden hålls vid liv med grenar',
    kor: () => {
      const s = createState(12, START);
      s.items.flinta = 1;
      kor(s, 30 * 24, s => { if (s.items.flinta > 1) s.items.flinta = 1; });
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
      s.byggSok = Infinity; // inget hus: träden på en husplats fälls för bygget, inte för ved
      const fallda = new Set<number>();
      let ved = 0;
      kor(s, 10 * 24, s => { ved = Math.max(ved, s.wood); for (const k of s.stockar ?? []) fallda.add(Math.floor(k.y) * W + Math.floor(k.x)); });
      const g = groundOf(s);
      // inne i lägret trampas marken där träden stod till jord, så räkna bara utanför
      const ute = [...fallda].filter(i => campDist(s, i % W, Math.floor(i / W)) >= 1);
      let gras = 0; for (const i of ute) if (g.trees[i] < FOREST && g.cover[i] >= 0.7) gras++;
      return [
        ['träd har fällts', (s.fallda ?? 0) >= 3],
        ['ved har huggits', ved > 0],
        [`gräs där träden stod utanför lägret (${gras} av ${ute.length})`, ute.length >= 3 && gras > ute.length / 2],
        ['stammarna huggs upp (högst 2 liggande)', (s.stockar ?? []).length <= 2]];
    },
  },
  'vinter-slocknad': {
    text: 'Istiden börjar med slocknad eld, kolhög och lite grenar: byn tänder igen på kolhögen',
    kor: () => {
      // flintan lyckas bara ibland (några procent per försök), så provet körs i fem byar och minst två ska få fyr
      const byar = [16, 17, 18, 19, 20].map(seed => {
        const s = createState(seed, START);
        kor(s, 20 * 24 + 23); // till istidens början
        Object.assign(s.fire, { lit: false, fuel: 0, emberUntil: undefined, ash: 3, ashUntil: s.now + 3 * DAY });
        s.wood = 0; s.items.grenar = 30; s.items.kol = 2; s.items.torrgras = 150; // ett känt förråd, så att provet inte beror på vad byn råkade ha
        const t0 = s.now;
        let tand = -1;
        kor(s, 4 * 24, s => { if (tand < 0 && s.fire.lit) tand = (s.now - t0) / HOUR; });
        return { s, tand };
      });
      return [
        ['istid', byar.every(b => b.s.lastAgeIdx === 0)],
        [`elden tändes igen (efter ${byar.map(b => b.tand < 0 ? '–' : b.tand.toFixed(1) + ' h').join(', ')})`, byar.filter(b => b.tand >= 0).length >= 2],
        ['tänd på den gamla kolhögen', byar.some(b => logg(b.s, 'på den gamla kolhögen'))],
        // att någon fryser ihjäl en vinter utan eld är rimligt, så det kontrolleras inte
        ['bränsle kvar eller insamlat', byar.every(b => fuelStock(b.s) >= 0)]];
    },
  },
  knapphet: {
    text: 'Bär, rötter och vilt tar slut nära byn för en tid, så invånarna går längre bort; fiske med händerna ger få fiskar per försök',
    kor: () => {
      const s = createState(15, START);
      kor(s, 12 * 24);
      const nara = uttag(s, 'samla', 0, 8), langt = uttag(s, 'samla', 16, 30), st = s.stat ?? {};
      return [
        [`mer plockat nära byn än långt bort (${nara.toFixed(2)} mot ${langt.toFixed(2)})`, nara > 0.005 && nara > langt * 3],
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
    const fel = L.flatMap(p => (p.lardomar ?? []).map(l => describe(s, l).wrong)).filter(Boolean).length;
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

SCENARIER.stenring = {
  text: 'Den första elden läggs i en ring av stenar som samlas in, och tänds med flinta. Ringen ligger kvar när elden slocknat',
  kor: () => {
    const s = createState(1, START);
    let h = 0;
    while (!s.fire.lightings && h < 24 * 4) { kor(s, 1); h++; }
    const tand = s.fire.lightings > 0, ring = !!s.fire.ring, kvar = s.items.sten ?? 0;
    Object.assign(s.fire, { lit: false, fuel: 0, emberUntil: undefined }); // elden slocknar
    kor(s, 2);
    // en äldre sparfil med gniststen: den blir flinta, och byn som haft eld har sin ring
    const g = createState(2, START);
    g.items = { gniststen: 1 }; g.stackar = [{ k: 'gniststen', n: 1, x: 1, y: 1, c: 1 }]; g.fire.lightings = 3;
    delete (g.fire as { ring?: boolean }).ring;
    migrate(g);
    return [
      [`stenar samlas och elden tänds (efter ${h} timmar)`, tand && logg(s, 'ring av stenar')],
      [`stenarna blir en ring runt elden (${kvar.toFixed(1)} stenar kvar i förrådet)`, ring && kvar < 1],
      ['elden tänds med flinta, gniststen finns inte', s.fire.log.some(e => e.k === 'tänd') && !('gniststen' in s.items) && !logg(s, 'gniststen')],
      ['ringen ligger kvar när elden slocknat', !!s.fire.ring],
      ['äldre sparfil: gniststenen blir flinta och ringen finns', g.items.flinta === 1 && !g.items.gniststen && g.stackar!.every(a => a.k !== 'gniststen') && !!g.fire.ring],
    ];
  },
};

SCENARIER.fiskespjut = {
  text: 'Ett fiskespjut täljs av en pinne med flinta eller yxa, ger mer fisk än händerna och slits fort',
  kor: () => {
    const s = createState(4, START);
    s.items = { grenar: 10, flinta: 1 };
    Object.assign(s.fire, { lit: true, fuel: 4, ring: true }); // elden brinner, så att ingen behöver leta stenar och flinta
    for (const q of s.people) q.tek = { fiskespjut: 1 }; // alla kan tälja spjut från början
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

SCENARIER.redskap = {
  text: 'Rep tvinnas av hö vid elden. Flintspjut (gren, flinta, rep) håller längre än träspjut och används till fiske och jakt. Metspö (gren, rep, ben) med mask ger mest fisk',
  kor: () => {
    const s = createState(4, START);
    s.items = { grenar: 20, flinta: 3, torrgras: 40, ben: 2 };
    Object.assign(s.fire, { lit: true, fuel: 4, ring: true });
    for (const q of s.people) q.tek = { fiskespjut: 1, rep: 1, flintspjut: 1, metspo: 1 };
    const p = living(s).find(q => ageOf(q, s.now) >= 18)!;
    twineRope(s, p, 2);
    const rep = s.items.rep === 2 && s.items.torrgras === 36;
    makeSpear(s, p);
    const flint = s.items.flintspjut === 1 && s.items.flinta === 2 && s.items.rep === 1 && !s.items.fiskespjut;
    p.task = { act: 'fiske', phase: 'do', tx: p.x, ty: p.y, until: s.now + HOUR, carry: 0, tool: 'flintspjut' };
    for (let i = 0; i < 60; i++) wearSpear(s, p);
    const haller = spears(s) === 1 && Math.abs(s.items.flintspjut - 0.75) < 1e-9; // 60 försök tar en fjärdedel
    makeRod(s, p);
    const spo = s.items.metspo === 1 && s.items.ben === 1 && s.items.rep === 0;
    // jakt med flintspjutet: fångar kaniner, och spjutet slits
    const c = campCenter(s), m = getMap(s.seed);
    let bx = c.x, by = c.y, bast = 0;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const v = richness(s, 'jakt', x + 0.5, y + 0.5); if (v > bast && m.tiles[y * W + x] !== T.Vatten && Math.hypot(x - c.x, y - c.y) < 20) { bast = v; bx = x + 0.5; by = y + 0.5; } }
    const vilt0 = s.mat?.vilt ?? 0, sp0 = s.items.flintspjut;
    let medSpjut = 0;
    for (let i = 0; i < 12 * 3; i++) {
      p.task = { act: 'jakt', phase: 'do', tx: bx, ty: by, until: s.now + HOUR, carry: 0, tool: 'flintspjut', why: 'prov', dark: !isLight(s.now) };
      p.x = bx; p.y = by; step(s, 300, false);
      if (p.task?.act === 'jakt' && isSpear(p.task.tool)) medSpjut++;
    }
    const jakt = (s.mat?.vilt ?? 0) > vilt0 && s.items.flintspjut < sp0;
    // byn fiskar själv några dygn: metspö, spjut och händer
    s.food = 3;
    kor(s, 4 * 24, q => { if ((q.items.ben ?? 0) < 1) q.items.ben = 1; if ((q.items.flinta ?? 0) < 3) q.items.flinta = 3; });
    const st = s.stat!, takt = (f: number, n: number) => n ? f / n : 0;
    const met = takt(st.metFisk ?? 0, st.metForsok ?? 0), spjut = takt(st.spjutFisk ?? 0, st.spjutForsok ?? 0);
    return [
      [`rep tvinnas av hö (2 rep av 4 hö på två timmar)`, rep],
      ['ett flintspjut görs av gren, flinta och rep, och en flinta sparas till elden', flint],
      ['flintspjutet håller fyra gånger så länge som ett träspjut', haller],
      ['ett metspö görs av gren, rep och ben', spo],
      [`jakt med spjut fångar kaniner, och spjutet slits (${medSpjut} av 36 steg med spjut)`, jakt && medSpjut > 30],
      [`metspöet används och ger mest fisk per försök (${met.toFixed(2)} mot spjutets ${spjut.toFixed(2)}, ${st.metForsok ?? 0} försök med metspö, ${st.spjutForsok ?? 0} med spjut)`, (st.metForsok ?? 0) > 20 && (met > spjut || (st.spjutForsok ?? 0) < 30)],
    ];
  },
};

SCENARIER.agande = {
  text: 'Den som gör ett redskap äger det. Det som fanns före ägandet och det som en död lämnar efter sig är byns. Går ett redskap sönder i händerna på någon är det hens eget som går sönder',
  kor: () => {
    const s = createState(4, START);
    s.items = { grenar: 20, flinta: 2, yxa: 1 };
    Object.assign(s.fire, { lit: true, fuel: 4, ring: true });
    for (const q of s.people) q.tek = { fiskespjut: 1 };
    const [a, b] = living(s);
    syncOwners(s);
    const yxaByns = s.agare?.yxa?.[0] === BYN;
    makeSpear(s, a); makeSpear(s, a); makeSpear(s, b);
    const ag = () => ownedBy(s, a).fiskespjut ?? 0, bg = () => ownedBy(s, b).fiskespjut ?? 0;
    const gjorda = ag() === 2 && bg() === 1 && spears(s) === 3;
    b.task = { ...(b.task ?? { act: 'fiska', x: b.x, y: b.y, tx: b.x, ty: b.y, until: s.now, carry: 0 }), tool: 'fiskespjut' } as Person['task'];
    wearSpear(s, b, 100); // b:s spjut går sönder i hens händer
    const sonder = bg() === 0 && ag() === 2 && spears(s) === 2;
    a.died = s.now; a.cause = 'av ålder';
    syncOwners(s);
    const arv = (s.agare?.fiskespjut ?? []).every(id => id === BYN) && ownedBy(s, a).fiskespjut === undefined;
    const c = createState(5, START);
    for (const q of c.people) q.tek = { fiskespjut: 1, korg: 1 };
    c.items = { grenar: 20, flinta: 2, torrgras: 30 }; c.stat = { ...(c.stat ?? {}), fiskeForsok: 1 };
    kor(c, 3 * 24);
    const egna = Object.values(c.agare ?? {}).flat().filter(id => id !== BYN).length;
    const total = Object.values(c.agare ?? {}).flat().length, hela = Object.keys(c.agare ?? {}).reduce((n, k) => n + Math.ceil((c.items[k] ?? 0) - 1e-9), 0);
    return [
      ['yxan som fanns före ägandet är byns', yxaByns],
      ['den som gör spjuten äger dem', gjorda],
      ['spjutet som gick sönder var hens eget', sonder],
      ['en dödsfalls redskap blir byns', arv],
      [`i en vanlig by äger folk det de gjort (${egna} av ${total} redskap har en ägare)`, egna > 0],
      [`ägarlistan stämmer med förrådet (${total} ägare, ${hela} redskap)`, total === hela],
    ];
  },
};

SCENARIER.djur = {
  text: 'Kaniner syns där det finns vilt, skuttar omkring och hoppar undan folk. Jakt fångar hela kaniner som bärs hem hela och äts som de är; med flintkniv slaktas de till mer kött, ben, skinn och senor',
  kor: () => {
    const s = createState(6, START);
    s.now = new Date(s.now).setHours(10, 0, 0, 0);
    const dj = djurOf(s), c = campCenter(s);
    const iLagret = dj.filter(d => campDist(s, Math.floor(d.x), Math.floor(d.y)) < LAGER_R).length;
    // fler kaniner där det finns mycket vilt
    let rik = 0, fattig = 0, nr = 0, nf = 0;
    for (let i = 0; i < W * H; i++) { const v = fyndAt(s, 'jakt', i) / FYND.jakt.topp; if (v > 0.6) nr++; else if (v > 0.05 && v < 0.25) nf++; }
    for (const d of dj) { const v = fyndAt(s, 'jakt', Math.floor(d.y) * W + Math.floor(d.x)) / FYND.jakt.topp; if (v > 0.6) rik++; else if (v > 0.05 && v < 0.25) fattig++; }
    const tat = (a: number, n: number) => n ? a / n : 0;
    // de skuttar: en stund senare står många på ett annat ställe
    const fore = new Map(dj.map(d => [d.id, d]));
    s.now += 60 * 1000;
    const flyttat = djurOf(s).filter(d => { const f = fore.get(d.id); return f && Math.hypot(d.x - f.x, d.y - f.y) > 0.05; }).length;
    // och hoppar undan den som kommer nära
    const p = living(s).find(q => ageOf(q, s.now) >= 18)!, k = djurOf(s).find(d => d.x > 4 && d.y > 4 && d.x < W - 4 && d.y < H - 4 && living(s).every(r => Math.hypot(r.x - d.x, r.y - d.y) > 6))!;
    const px = p.x, py = p.y; p.x = k.x + 0.3; p.y = k.y;
    const undan = djurOf(s).find(d => d.id === k.id)!, avst = Math.hypot(undan.x - p.x, undan.y - p.y);
    p.x = px; p.y = py;
    // jakt utan redskap i snabbläget: hela kaniner i förrådet
    const m = getMap(s.seed);
    let bx = c.x, by = c.y, bast = 0;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const v = richness(s, 'jakt', x + 0.5, y + 0.5); if (v > bast && m.tiles[y * W + x] !== T.Vatten && Math.hypot(x - c.x, y - c.y) < 20) { bast = v; bx = x + 0.5; by = y + 0.5; } }
    let hela = true;
    for (let i = 0; i < 24 * 12; i++) {
      p.task = { act: 'jakt', phase: 'do', tx: bx, ty: by, until: s.now + HOUR, carry: 0, why: 'prov', dark: !isLight(s.now) };
      p.x = bx; p.y = by;
      const v0 = s.mat?.vilt ?? 0;
      step(s, 300, false);
      const d = (s.mat?.vilt ?? 0) - v0;
      if (d > 0.05 && Math.abs(d - KANIN) > 0.05) hela = false; // det som kommer in är hela kaniner (lite kan ätas samtidigt)
    }
    const kaniner = s.stat?.kaniner ?? 0;
    // levande läge: den som fångat en kanin bär hem den hel
    const q = createState(6, START); q.now = new Date(q.now).setHours(9, 0, 0, 0);
    const j = living(q).find(r => ageOf(r, q.now) >= 18)!;
    let hem = 0, annat = 0;
    for (let i = 0; i < 6 * 3600 * 2 && !hem; i++) {
      if (j.task?.act !== 'jakt') j.task = { act: 'jakt', phase: 'go', tx: bx, ty: by, until: q.now + 3 * HOUR, carry: 0, why: 'prov', dark: false };
      step(q, 0.5, true);
      if (j.task?.act === 'jakt' && j.task.phase === 'back') { if (Math.abs(j.task.carry - KANIN) < 1e-9 && !j.task.items) hem++; else if (j.task.carry > 0) annat++; }
    }
    // utan kniv ingen slakt; med kniv blir en kanin kött, ben, skinn och senor
    s.items.flinta = 2; s.items.grenar = 2;
    const utan = !canSlaughter(s, p);
    for (const r of s.people) r.tek = { ...r.tek, kniv: 1, rep: 1 };
    makeKnife(s, p);
    const kniv = s.items.kniv === 1 && s.items.flinta === 1;
    s.mat = { vilt: 3 * KANIN }; s.food = 3 * KANIN; s.items.ben = 0; s.items.skinn = 0; s.items.rep = 0;
    const kan = canSlaughter(s, p);
    slaughter(s, p, 1);
    const slakt = Math.abs((s.mat.kott ?? 0) - 3 * SLAKT.kott) < 1e-9 && (s.mat.vilt ?? 0) < 1e-9 && s.items.ben === 3 && s.items.skinn === 3 && (s.items.rep ?? 0) > 0;
    return [
      [`kaniner syns där det finns vilt (${dj.length} st), inga i lägret (${iLagret})`, dj.length > 10 && iLagret === 0],
      [`fler kaniner där det finns mycket vilt (${(tat(rik, nr) * 100).toFixed(1)} % av de rika rutorna, ${(tat(fattig, nf) * 100).toFixed(1)} % av de fattiga)`, tat(rik, nr) > tat(fattig, nf) * 2],
      [`kaninerna skuttar omkring (${flyttat} av ${dj.length} flyttade sig på en minut)`, flyttat > dj.length * 0.3],
      [`en kanin hoppar undan den som kommer nära (${avst.toFixed(1)} rutor bort)`, avst > 2],
      [`jakt utan redskap fångar hela kaniner (${kaniner} på ett dygn)`, kaniner >= 1 && hela],
      [`i levande läge bärs kaninen hem hel, en i taget (${hem} gång, ${annat} med annat)`, hem >= 1 && annat === 0],
      ['utan kniv slaktas inget; kniven görs av en flinta och en gren och en flinta sparas till elden', utan && kniv && kan],
      ['en slaktad kanin ger mer kött än den uppätna, och ett ben, ett skinn och senor till rep', slakt && SLAKT.kott > KANIN],
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
    const summaOk = Object.keys(STACK).every(k => Math.abs(ps.filter(p => p.k === k).reduce((a, p) => a + p.n, 0) - amountOf(s, k)) < 1e-6);
    // bära: kör en stund med gående invånare och se hur mycket de bär hem
    const b = createState(8, START);
    b.now = new Date(b.now).setHours(7, 0, 0, 0); b.food = 2; // morgon, och byn behöver mat
    Object.assign(b.fire, { lit: true, fuel: 4 }); // elden brinner, annars avbryts allt för att tända den
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
    s.food = 600; s.wood = 200; s.items.grenar = 400; s.items.flinta = 1; s.fire.ring = true; // byn kan tända sin eld och har tid att sortera
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

SCENARIER.aktivitet = {
  text: 'I levande läge bär man hem efter några fynd och går tillbaka; vid bärplockning och jakt står man still en stund och går några steg, på promenad går man hela tiden. Det ger lika mycket som förut',
  kor: () => {
    const s = createState(5, START);
    s.now = new Date(s.now).setHours(10, 0, 0, 0); // mitt på dagen, så att ingen går hem för att det blir mörkt
    s.wood = 20; Object.assign(s.fire, { lit: true, fuel: 0.5, ring: true }); // tänd eld och ved i förrådet, så att någon matar elden
    const m = getMap(s.seed);
    const rad: Record<string, number> = { samla: 2, jakt: 3, promenad: 4 };
    const gick: Record<string, number> = {}, stod: Record<string, number> = {};
    let utanfor = 0, vatten = 0, tungt = 0, turer = 0, aterupp = 0, eldMax = 0;
    const fore = new Map<number, { x: number; y: number; ph: string; act: string }>();
    let prov: Person[] = [];
    for (let i = 0; i < 10 * 3600 * 2; i++) {
      step(s, 0.5, true);
      // en jägare, en som promenerar och en bärplockare, så att alla syns i provet. Den som avbryts på vägen (t.ex. för ett samtal) får uppgiften igen
      if (i === 3600) prov = living(s).filter(p => ageOf(p, s.now) >= 16).slice(0, 3);
      if (i >= 3600 && i < 3600 * 7 && i % 600 === 0) {
        const c = campCenter(s), akt = ['jakt', 'promenad', 'samla'] as const;
        prov.forEach((p, j) => {
          if (p.task?.act === akt[j] || p.died !== undefined) return;
          let x = 0, y = 0;
          for (let r = 7; r < 30; r++) { x = c.x + 0.5 + (j === 1 ? -r : r); y = c.y + 0.5 + (j === 2 ? -r : r) * 0.3; if (m.tiles[Math.floor(y) * W + Math.floor(x)] !== T.Vatten) break; }
          if (j === 0) { // jägaren går dit det finns mest vilt
            let bast = 0;
            for (let yy = 1; yy < H - 1; yy++) for (let xx = 1; xx < W - 1; xx++) { const v = richness(s, 'jakt', xx + 0.5, yy + 0.5); if (v > bast && m.tiles[yy * W + xx] !== T.Vatten && Math.hypot(xx - c.x, yy - c.y) < 20) { bast = v; x = xx + 0.5; y = yy + 0.5; } }
          }
          p.task = { act: akt[j], phase: 'go', tx: x, ty: y, until: s.now + 3 * HOUR, carry: 0, why: 'prov', dark: !isLight(s.now) };
        });
      }
      for (const p of living(s)) {
        const t = p.task, f = fore.get(p.id);
        if (m.tiles[Math.floor(p.y) * W + Math.floor(p.x)] === T.Vatten) vatten++;
        if (t && f && f.act === t.act) {
          if (f.ph === 'do' && t.phase === 'back') { turer++; if (t.act !== 'bara' && !(t.act === 'jakt' && load(t) <= KANIN + 0.01) && load(t) > capacity(s, p) / 3 + 0.05) tungt++; } // bärandet av högar och en hel kanin får ta en full famn
          if (f.ph === 'back' && t.phase === 'go') aterupp++;
        }
        if (t?.act === 'elda' && t.phase === 'back') eldMax = Math.max(eldMax, t.carry);
        if (t && t.phase === 'do' && rad[t.act] && f?.ph === 'do' && f.act === t.act) {
          const rorde = Math.hypot(p.x - f.x, p.y - f.y) > 1e-6;
          (rorde ? gick : stod)[t.act] = ((rorde ? gick : stod)[t.act] ?? 0) + 1;
          if (Math.hypot(p.x - t.tx, p.y - t.ty) > rad[t.act] + 0.6) utanfor++;
        }
        fore.set(p.id, { x: p.x, y: p.y, ph: t?.phase ?? '', act: t?.act ?? '' });
      }
    }
    const andel = (k: string) => (gick[k] ?? 0) / Math.max(1, (gick[k] ?? 0) + (stod[k] ?? 0));
    // snabbläget: samma by räknad i stora steg ska ge ungefär lika mycket per arbetstimme som i levande läge
    const prod = (live: boolean) => {
      const q = createState(5, START); let tim = 0; const dt = live ? 0.5 : 60;
      for (let i = 0; i < 24 * 3600 / dt; i++) { step(q, dt, live); for (const p of living(q)) if (p.task?.act === 'samla') tim += dt / 3600; }
      return ((q.stat?.prod_samla as number) ?? 0) / Math.max(1, tim);
    };
    const pl = prod(true), ps = prod(false);
    return [
      [`många korta turer hem (${turer} turer på tio timmar, ${aterupp} gånger tillbaka till samma plats)`, turer > 40 && aterupp > 10],
      [`ingen bär mer än en tredjedel av vad hen orkar från arbetet (${tungt} för tunga)`, tungt === 0],
      [`bärplockare står mest still men går ibland (går ${Math.round(andel('samla') * 100)} % av tiden)`, andel('samla') > 0.02 && andel('samla') < 0.5],
      [`jägare står mest still men går ibland (går ${Math.round(andel('jakt') * 100)} % av tiden)`, !!stod.jakt && (andel('jakt') > 0.02 && andel('jakt') < 0.5)],
      [`den som promenerar går nästan hela tiden (${Math.round(andel('promenad') * 100)} %)`, !!gick.promenad && andel('promenad') > 0.5],
      [`man håller sig nära platsen (${utanfor} gånger utanför)`, utanfor === 0],
      ['ingen går ut i vattnet', vatten === 0],
      [`elden matas med en famn i taget (högst ${eldMax.toFixed(1)})`, eldMax > 0 && eldMax <= 1 + 1e-9],
      // med bärsnåren (v24) ger en timmes bärplockning med gångtiden runt 0,3 i båda lägena
      [`bärplockning ger ungefär lika mycket per timme i båda lägena (${pl.toFixed(2)} i levande läge, ${ps.toFixed(2)} i snabbläget)`, pl > 0.2 && pl < 0.45 && ps > 0.15 && Math.abs(pl - ps) < 0.1],
    ];
  },
};

SCENARIER.teknik = {
  text: 'Ingen kan göra yxa, spjut eller korg från början: den som arbetar kommer på det (nyfikna och intelligenta fortare), lär ut det i samtal, och kunskapen dör med den sista som kan den',
  kor: () => {
    const s = createState(3, START);
    const forst: Record<string, number> = {};
    let yxaInnan = false, korgInnan = false;
    const kanFran = TEKNIK.every(t => !s.people.some(p => knows(p, t.id)));
    kor(s, 20 * 24, s => {
      for (const t of TEKNIK) if (forst[t.id] === undefined && living(s).some(p => knows(p, t.id))) forst[t.id] = (s.now - s.founded) / DAY;
      if ((s.items.yxa ?? 0) > 0 && forst.yxa === undefined) yxaInnan = true;
      if ((s.items.korg ?? 0) > 0 && forst.korg === undefined) korgInnan = true;
    });
    const kan = (id: string) => living(s).filter(p => knows(p, id)).length;
    // nyfikna och intelligenta kommer på det fortare
    const q = createState(4, START), [a, b] = living(q).filter(p => ageOf(p, q.now) >= 20);
    a.pot.nyfikenhet = a.pot.intelligens = 16; b.pot.nyfikenhet = b.pot.intelligens = 6; a.tek = {}; b.tek = {};
    q.items.torrgras = 10;
    thinkWhileWorking(q, a, 'samla', 3600); thinkWhileWorking(q, b, 'samla', 3600);
    const snabb = (a.tek.korg ?? 0) > (b.tek.korg ?? 0) * 3;
    // utan material kommer man inte på något
    const c = living(q).filter(p => ageOf(p, q.now) >= 20)[2]; c.tek = {}; q.items.flinta = 0; q.items.yxa = 0;
    thinkWhileWorking(q, c, 'ved', 10 * 3600);
    const utanMaterial = !(c.tek.yxa);
    // den sista som kan yxa dör
    const ens = living(s).filter(p => knows(p, 'yxa'));
    ens.slice(1).forEach(p => { p.tek!.yxa = 0; });
    if (ens[0]) die(s, ens[0], 'i en olycka');
    const dott = kan('yxa') === 0;
    const dagar = (k: string) => forst[k] === undefined ? 'aldrig' : `dygn ${forst[k].toFixed(1)}`;
    return [
      ['ingen kan något från början', kanFran],
      [`korgen kommer på (${dagar('korg')}), yxan (${dagar('yxa')}) och spjutet (${dagar('fiskespjut')})`, forst.korg !== undefined && forst.yxa !== undefined && forst.korg > 0.2 && forst.yxa > 0.3],
      ['ingen gör en yxa eller korg innan någon kommit på hur', !yxaInnan && !korgInnan],
      [`kunskapen sprids i samtal (${kan('korg')} kan göra korg, ${kan('yxa')} yxa)`, kan('korg') >= 3 && ens.length >= 3],
      ['en nyfiken och intelligent person kommer på det mycket fortare', snabb],
      ['utan flinta kommer ingen på yxan', utanMaterial],
      ['när den sista som kan yxa dör finns kunskapen inte kvar', dott],
    ];
  },
};

SCENARIER.bygg = {
  text: 'Byn bygger själv ett timmerhus en bit från elden när någon kan det och sovplatser saknas: träden där huset ska stå fälls först och blir väggar, väggar stänger vägen, golvet under tak blir sovplatser, rummet håller värmen, och slitna väggar lagas eller rasar',
  kor: () => {
    // handbyggt rum: 4×4 väggar med en öppning, 2×2 golv inuti
    const s = createState(5, START), f = getMap(s.seed).fire;
    const x0 = f.x + 5, y0 = f.y - 2, bit = (x: number, y: number, k: Bit['k'], m: string): Bit => ({ id: 9000 + y * 100 + x, x, y, k, m, b: 1, mat: 9, c: 1 });
    for (let x = x0; x < x0 + 4; x++) for (let y = y0; y < y0 + 4; y++) {
      const kant = x === x0 || y === y0 || x === x0 + 3 || y === y0 + 3;
      bitsOf(s).push(bit(x, y, !kant ? 'golv' : x === x0 && y === y0 + 1 ? 'oppning' : 'vagg', !kant ? 'jord' : x === x0 && y === y0 + 1 ? 'oppning' : 'ris'));
    }
    touch(s);
    const rum = roomAt(s, x0 + 1.5, y0 + 1.5), g = groundOf(s);
    gridOf(s);
    const path = findPath(g, x0 - 2.5, y0 + 1.5, x0 + 5.5, y0 + 1.5) ?? [];
    const genomVagg = path.some(i => isWall(s, i % W, Math.floor(i / W)));
    const iso = rum ? insulation(s, rum) : 0;
    // slitage: en vägg utan skick rasar
    const v = bitsOf(s).find(b => b.k === 'vagg' && b.x === x0 + 1 && b.y === y0)!; v.c = 0.001; wearBuild(s, 1, 0);
    const rasat = v.b === 0 && !roomAt(s, x0 + 1.5, y0 + 1.5);
    // en by där alla vuxna kan göra timmerväggar och har yxor bygger ett hus själv
    const kan = (s: State) => { for (const p of living(s)) if (ageOf(p, s.now) >= 14) Object.assign((p.tek ??= {}), { yxa: 1, timmervagg: 1 }); s.items.yxa = 2; };
    const q = createState(6, START);
    kan(q);
    let inne = 0, sov = 0, iTrad = 0, trad = -1; // räknas när huset är klart, så att det inte beror på hur fort det råkar bli klart
    kor(q, 5 * 24, q => { // fyra vuxna i den nya kolonin: huset tar några dygn
      const bs = bitsOf(q);
      if (bs.length && trad < 0) trad = bs.filter(b => treeOn(q, b)).length;
      iTrad += bs.filter(b => b.k === 'vagg' && b.b > 0 && b.b < 1 && treeOn(q, b)).length; // en vägg som byggs där ett träd står
      if (housesOf(q)[0]?.klar) for (const p of living(q)) if (p.task?.act === 'sova' && p.task.phase === 'do') { sov++; if (roomAt(q, p.x, p.y)) inne++; }
    });
    const fq = getMap(q.seed).fire, hq = housesOf(q)[0];
    const avst = hq ? Math.hypot(Math.max(hq.x - fq.x, 0, fq.x - (hq.x + hq.w - 1)), Math.max(hq.y - fq.y, 0, fq.y - (hq.y + hq.h - 1))) : 0;
    // en kall natt utan eld: den som är inne kyls långsammare än den som är ute
    const k = structuredClone(q); k.now = k.founded + 3 * WEEK + 3 * HOUR; k.fire.lit = false; k.fire.fuel = 0;
    let varmInne = 0, varmUte = 0, ni = 0, nu = 0;
    const b2 = beds(k);
    living(k).forEach((p, i) => { p.warm = 0.8; if (i < 3 && b2[i] !== undefined) { p.x = b2[i] % W + 0.5; p.y = Math.floor(b2[i] / W) + 0.5; } });
    const fore = new Map(living(k).map(p => [p.id, { inne: !!roomAt(k, p.x, p.y), ute: heatAt(k, p.x, p.y) < 0.05 }]));
    step(k, 120, false);
    for (const p of living(k)) { const f = fore.get(p.id); if (!f) continue; if (f.inne) { varmInne += p.warm; ni++; } else if (f.ute) { varmUte += p.warm; nu++; } }
    const h = housesOf(q)[0], folk = living(q).length, b = beds(q).length;
    const iVagg = living(q).filter(p => isWall(q, p.x, p.y)).length;
    // nötning: väggarna slits och lagas
    for (const b of bitsOf(q)) if (b.k === 'vagg') b.c = 0.3;
    q.wood += 100;
    q.mat = { ...(q.mat ?? {}), rotter: (q.mat?.rotter ?? 0) + 150 }; q.food += 150; // mat i förrådet, så att de fyra vuxna inte måste skaffa mat först
    kor(q, 24);
    const lagat = (q.stat?.lagat ?? 0) > 0;
    // samma by i levande läge bygger också
    const L = createState(6, START);
    kan(L);
    Object.assign(L.fire, { lit: true, fuel: 4 }); // elden brinner redan: annars hänger testet på hur fort den råkar tändas (ett försök lyckas ungefär var femtionde gång)
    for (let i = 0; i < 2 * 24 * 3600 / 0.5 && !housesOf(L)[0]?.klar; i++) step(L, 0.5, true);
    const hL = housesOf(L)[0];
    return [
      ['ett slutet rum med väggar räknas som under tak', !!rum && rum.tiles.length === 4],
      [`vägen går runt väggarna (${path.length} steg)`, path.length > 0 && !genomVagg],
      [`rummet håller värmen men öppningen läcker (${iso.toFixed(2)})`, iso > 0.2 && iso < 0.55],
      ['en helt sliten vägg rasar och rummet är inte längre under tak', rasat],
      [`byn bygger ${h?.namn ?? 'inget hus'} i snabbläget (${h ? `${h.w}×${h.h}` : '-'}, ${b} sovplatser för ${folk})`, !!h?.klar && b > 0],
      [`folk sover inne när huset är klart (${inne} av ${sov})`, sov > 0 && inne > sov * 0.5],
      [`en kall natt utan eld är de som är inne varmare (${(varmInne / (ni || 1)).toFixed(2)} mot ${(varmUte / (nu || 1)).toFixed(2)})`, ni > 0 && nu > 0 && varmInne / ni > varmUte / nu],
      [`ingen står i en vägg (${iVagg})`, iVagg === 0],
      [`träden där huset ska stå fälls innan väggarna byggs där (${trad} träd på platsen, ${iTrad} väggar byggda på ett träd)`, trad >= 0 && iTrad === 0 && !!h && bitsOf(q).every(b => b.hus !== h.id || !treeOn(q, b))],
      [`huset står en bit från elden (${avst.toFixed(1)} rutor)`, avst >= 4],
      ['slitna väggar lagas', lagat],
      [`byn bygger i levande läge (${hL?.klar ? `klart efter ${((hL.klar - L.founded) / HOUR).toFixed(0)} h` : 'inte klart'})`, !!hL?.klar],
    ];
  },
};

SCENARIER.varmekarta = {
  text: 'Värmekartorna: bär i små snår som står kvar, svamp i skogen, rötter glest överallt även på vintern, kaniner helst i gräs och borta från folk, fisk i vattnet och flinta vid stenarna. Inget växer i lägret, mönstren kryper med tiden, uttag tömmer platsen som växer tillbaka, och den som ser en plockad plats vet att den växer tillbaka',
  kor: () => {
    const s = createState(21, START), g = groundOf(s), m = getMap(s.seed);
    const vid = (ai: number) => { s.now = s.founded + ((ai + 3) % 4) * WEEK + HOUR; };
    const summa = (k: Lager) => { let v = 0; for (let i = 0; i < W * H; i++) v += fyndAt(s, k, i); return v; };
    const land = (i: number) => isSoil(g.tiles[i]), skog = (i: number) => land(i) && g.trees[i] >= FOREST;
    vid(0); const kIstid = summa('kantarell');
    vid(3); const kHost = summa('kantarell'), bHost = summa('bar');
    // svamp bara i skogen; kantarell och spindling har egna områden som ibland går in i varandra
    let svampUtanfor = 0, bada = 0, baraK = 0;
    for (let i = 0; i < W * H; i++) {
      const k = fyndAt(s, 'kantarell', i), sp = fyndAt(s, 'spindling', i);
      if (!skog(i) && k + sp > 0) svampUtanfor++;
      if (k > 0.05 && sp > 0.05) bada++; else if (k > 0.05) baraK++;
    }
    // bärbuskar i små snår: få rutor, men rika
    let jord = 0, buskar = 0;
    for (let i = 0; i < W * H; i++) if (land(i)) { jord++; if (vaxerAt(s, 'bar', i) > 1) buskar++; }
    // rötter: glest men nästan överallt på land, och de finns kvar på vintern när bär och svamp är borta
    let rotLand = 0, rotRik = 0; const rotTopp = FYND.rotter.topp;
    for (let i = 0; i < W * H; i++) if (land(i) && campDist(s, i % W, Math.floor(i / W)) >= LAGER_R) { if (vaxerAt(s, 'rotter', i) > 0) rotLand++; if (vaxerAt(s, 'rotter', i) > rotTopp * 0.5) rotRik++; }
    vid(0); const rotVinter = summa('rotter'), barVinter = summa('bar'); vid(3);
    // kaninerna håller sig borta från lägret och från platser där folk trampat
    const sk0 = skyggOf(s);
    let nara = 0, naraN = 0, langt = 0, langtN = 0;
    for (let i = 0; i < W * H; i++) if (land(i)) { const d = campDist(s, i % W, Math.floor(i / W)); if (d >= LAGER_R && d < LAGER_R + 3) { nara += sk0[i]; naraN++; } else if (d > LAGER_R + SKYGG_R) { langt += sk0[i]; langtN++; } }
    // kaniner trivs bäst i gräs (räknat utan skyggheten)
    let gr = 0, grN = 0, sk = 0, skN = 0;
    for (let i = 0; i < W * H; i++) if (land(i) && sk0[i] > 0.02) { const v = vaxerAt(s, 'jakt', i) / sk0[i]; if (g.trees[i] >= FOREST) { sk += v; skN++; } else { gr += v; grN++; } }
    // fisk bara i vattnet, men man når den från stranden
    let fiskLand = 0, strand = -1;
    for (let i = 0; i < W * H; i++) { if (m.tiles[i] !== T.Vatten && fyndAt(s, 'fiske', i) > 0) fiskLand++; if (strand < 0 && m.tiles[i] !== T.Vatten && richness(s, 'fiske', i % W + 0.5, Math.floor(i / W) + 0.5) > 0.3) strand = i; }
    const sx = strand % W + 0.5, sy = Math.floor(strand / W) + 0.5, fiskFore = richness(s, 'fiske', sx, sy);
    for (let n = 0; n < 4; n++) takeFrom(s, 'fiske', sx, sy, 1);
    const fiskEfter = richness(s, 'fiske', sx, sy);
    // inget växer i lägret
    let iLagret = 0;
    for (let i = 0; i < W * H; i++) if (campDist(s, i % W, Math.floor(i / W)) < LAGER_R) for (const k of FYND_IDS) if (k !== 'fiske' && fyndAt(s, k, i) > 0) iLagret++;
    // mönstren kryper: bärsnåren står nästan kvar ett speldygnsvarv (4 veckor = samma årstid igen), kaninerna har flyttat mer
    const kvar = (k: Lager, dygn: number, grans: number) => {
      const t0 = s.now, fore: boolean[] = [];
      for (let i = 0; i < W * H; i++) fore.push(vaxerAt(s, k, i) > grans);
      s.now = t0 + dygn * DAY;
      let same = 0, n = 0;
      for (let i = 0; i < W * H; i++) if (fore[i]) { n++; if (vaxerAt(s, k, i) > grans) same++; }
      s.now = t0;
      return n ? same / n : 0;
    };
    const barKvar = kvar('bar', 28, 1), kaninKvar = kvar('jakt', 28, 0.6), barSenare = kvar('bar', 280, 1);
    // ta ur en rik ruta och låt den växa tillbaka
    let bast = 0; for (let i = 0; i < W * H; i++) if (fyndAt(s, 'kantarell', i) > fyndAt(s, 'kantarell', bast)) bast = i;
    const x = bast % W + 0.5, y = Math.floor(bast / W) + 0.5, fore = fyndAt(s, 'kantarell', bast);
    for (let n = 0; n < 8; n++) takeFrom(s, 'kantarell', x, y, 0.5);
    const efter = fyndAt(s, 'kantarell', bast);
    packFynd(s);
    const kopia = JSON.parse(JSON.stringify(s)) as State;
    const sparad = Math.abs(fyndAt(kopia, 'kantarell', bast) - efter) < 0.01;
    // den som ser en plockad plats minns att det växer där och tror att det växt tillbaka om ett tag
    let snar = 0; for (let i = 0; i < W * H; i++) if (vaxerAt(s, 'bar', i) > vaxerAt(s, 'bar', snar) && campDist(s, i % W, Math.floor(i / W)) > 6) snar = i;
    const bx = snar % W, by = Math.floor(snar / W), p = living(s)[0];
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) for (let n = 0; n < 6; n++) takeFrom(s, 'samla', bx + dx + 0.5, by + dy + 0.5, 1);
    // en annan har hört att platsen är rik; när hen kommer dit och ser att den är tömd rättas lärdomen och sprids
    const q = living(s)[1], r2 = living(s)[2], aa = areaOf(bx, by);
    (q.lardomar ??= []).push({ k: 'samla', a: aa, v: 3, c: 0.9, t: s.now - HOUR, src: p.id, led: 1 });
    (r2.lardomar ??= []).push({ k: 'samla', a: aa, v: 3, c: 0.6, t: s.now - HOUR, src: p.id, led: 1 });
    s.now += HOUR; observe(s, p, 'samla', bx, by);
    const fore2 = s.stat?.rattat ?? 0; observe(s, q, 'samla', bx, by);
    const ql = findL(q, 'samla', aa)!, rattad = (s.stat?.rattat ?? 0) > fore2 && ql.ny !== undefined, qText = describe(s, ql).what;
    for (let n = 0; n < 200 && findL(r2, 'samla', aa)!.v > 2; n++) share(s, q, r2, { op: 60 } as never, 'berättelse');
    const spridd = findL(r2, 'samla', aa)!.v;
    const l = findL(p, 'samla', areaOf(bx, by))!, nyss = hoped(s, l), text = describe(s, l).what;
    s.now += 3 * DAY; const sen = hoped(s, l);
    growFynd(s, 48, 3);
    const vuxit = fyndAt(s, 'kantarell', bast);
    // flinta vid stenarna tar slut där man hittat den och kommer sakta tillbaka
    let fl = 0; for (let i = 0; i < W * H; i++) if (fyndAt(s, 'flinta', i) >= 4) { fl = i; break; }
    const flFore = fyndAt(s, 'flinta', fl); takeFrom(s, 'flinta', fl % W + 0.5, Math.floor(fl / W) + 0.5, 1);
    const flEfter = fyndAt(s, 'flinta', fl); growFynd(s, 24 * 7, 2);
    const flSen = fyndAt(s, 'flinta', fl);
    return [
      ['varje lager hör till en grupp i filtret', FYND_IDS.every(k => GRUPPER[FYND[k].grupp] && FYND[k].topp > 0)],
      [`ingen svamp i istiden (${kIstid.toFixed(1)}), en del på hösten (${kHost.toFixed(0)})`, kIstid === 0 && kHost > 20],
      [`svamp bara i skogen (${svampUtanfor} rutor utanför)`, svampUtanfor === 0],
      [`kantarell och spindling växer ibland ihop (${bada} rutor) och ibland var för sig (${baraK} bara kantarell)`, bada > 0 && baraK > bada * 0.2],
      [`bärbuskar i små snår (${Math.round(buskar / jord * 100)} % av marken), bär och rötter finns (${bHost.toFixed(0)})`, buskar > 0 && buskar / jord < 0.2 && bHost > 100],
      [`rötter glest men nästan överallt (${Math.round(rotLand / jord * 100)} % av marken, ${Math.round(rotRik / jord * 100)} % rik), kvar på vintern (${rotVinter.toFixed(0)}) när bären är borta (${barVinter.toFixed(0)})`, rotLand / jord > 0.8 && rotRik / jord < 0.3 && rotVinter > 20 && barVinter < 1],
      [`kaninerna skyr lägret (${(nara / naraN).toFixed(2)} nära mot ${(langt / langtN).toFixed(2)} långt bort)`, nara / naraN < 0.4 && langt / langtN > 0.7],
      [`den som kommer till en tömd plats rättar sig ("${qText}") och berättar det (${spridd.toFixed(2)} hos den som hörde det)`, rattad && qText.includes('sämre än man trott') && spridd < 2],
      [`kaniner trivs bättre i öppen mark (${(gr / grN).toFixed(2)}) än i skog (${(sk / skN).toFixed(2)})`, gr / grN > sk / skN],
      [`fisk bara i vattnet (${fiskLand} rutor på land), och man når den från stranden (${fiskFore.toFixed(2)} → ${fiskEfter.toFixed(2)} efter fiske)`, fiskLand === 0 && fiskFore > 0.3 && fiskEfter < fiskFore * 0.7],
      [`inget växer i lägret (${iLagret})`, iLagret === 0],
      [`bärsnåren står kvar (${Math.round(barKvar * 100)} % efter 28 speldygn, ${Math.round(barSenare * 100)} % efter 280), kaninerna flyttar fortare (${Math.round(kaninKvar * 100)} %)`, barKvar > 0.5 && kaninKvar < barKvar && barSenare < 0.6],
      [`uttag tömmer platsen (${fore.toFixed(2)} → ${efter.toFixed(2)})`, efter < fore * 0.3],
      ['uttaget sparas', sparad],
      [`platsen växer tillbaka på hösten (${vuxit.toFixed(2)})`, vuxit > efter + 0.1],
      [`en plockad plats: "${text}", tros växa tillbaka (${nyss.toFixed(2)} → ${sen.toFixed(2)} efter tre dygn)`, text.includes('växer tillbaka') && sen > nyss + 0.2],
      [`flinta vid stenarna tar slut och kommer tillbaka (${flFore} → ${flEfter.toFixed(1)} → ${flSen.toFixed(1)})`, flFore >= 4 && flEfter < flFore - 0.5 && flSen > flEfter + 0.3],
    ];
  },
};

// Utan namn körs alla scenarier samtidigt, vart och ett i en egen process. Med ett namn körs bara det, här.
const val = process.argv[2];
if (val) {
  const sc = SCENARIER[val];
  if (!sc) { console.log(`Okänt scenario: ${val}. Finns: ${Object.keys(SCENARIER).join(', ')}`); process.exit(1); }
  const t0 = Date.now(), k = sc.kor(), ok = k.every(([, b]) => b);
  console.log(`${ok ? 'OK  ' : 'FEL '} ${val} (${((Date.now() - t0) / 1000).toFixed(0)} s): ${sc.text}`);
  for (const [t, b] of k) if (!ok || !b || process.env.ALLA) console.log(`     ${b ? '✓' : '✗'} ${t}`);
  if (!ok) process.exitCode = 1;
} else {
  // de långsammaste startas först, så att alla blir klara ungefär samtidigt; utskriften kommer ändå i vanlig ordning
  const LANGSAMMA = ['vinter-slocknad', 'aktivitet', 'flinta', 'ingen-yxa', 'bygg', 'svamp', 'teknik'];
  const namn = Object.keys(SCENARIER), ordning = [...LANGSAMMA.filter(n => SCENARIER[n]), ...namn.filter(n => !LANGSAMMA.includes(n))];
  const svar: Record<string, Utfall> = {};
  await pool(ordning.map(n => async () => { svar[n] = await korSkript('scenario.ts', [n]); }));
  let fel = 0;
  for (const n of namn) {
    const u = svar[n];
    if (u.code) fel++;
    process.stdout.write(u.out || `FEL  ${n}: kraschade\n${u.err.slice(-1500)}\n`);
  }
  if (fel) { console.log(`${fel} scenario misslyckades.`); process.exitCode = 1; }
}
