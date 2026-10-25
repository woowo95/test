// Scenariotester: ställ en by i ett visst läge, kör den en stund och kontrollera att det som ska hända händer.
// npm run scenario            kör alla
// npm run scenario -- glanta  kör bara ett
import { isDeepStrictEqual } from 'node:util';
import { Person, Act, createState, clean, canClean, ownedBy, tidyTools, addTool, toolsOf, heldBy, take, usesTool, wearTool, freeSpear, getRel, isTool, BYN, twineRope, makeRod, wearUsed, isSpear, step, living, temperature, coldOf, emigrationRate, birthWish, immigrationRate, sees, ageIndex, serializeParts, joinParts, serialize, ageStart, nyKalender, kalender, yearNo, AGES, sightOf, pilesOf, zoneOf, amountOf, STACK, capacity, load, wearStore, dropLoad, isLight, T, condOf, FOOD, isStored, zonesOf, allows, ageOf, makeSpear, spears, SPJUT_FORSOK, groundOf, getMap, fuelStock, DAY, HOUR, W, State, takenOf, Kind, kn, fearPlace, findL, areaOf, describe, migrate, forget, stat, campDist, campCenter, TEKNIK, knows, thinkWhileWorking, die, heatAt, bitsOf, housesOf, gridOf, touch, roomAt, insulation, beds, isWall, Bit, wearBuild, FYND, FYND_IDS, GRUPPER, angOf, fyndAt, takeFrom, packFynd, growFynd, H, vaxerAt, richness, LAGER_R, observe, hoped, Lager, skyggOf, SKYGG_R, SKYGG_IN, grupperOf, GRUPPER_MAX, STORLEK, share, treeOn, djurOf, KANIN, SLAKT, DJUR, JAKT_F, canSlaughter, makeKnife, slaughter, askForTool, askForGift, gain, takeFood, takeFuel, ownsAmount, ownedStock, ownedSum, sumOf, addTo, setAmount, setStock, foodOf, isFood, STACK_ORDER, needLadder, MAT, ownFor, takeMaterial, getable, fuelFor, STOLD_LINDRIG, STOLD_OP, rnd, STROMMAR, Strom, BEAT, spar, isWork, SPARVERSION, stepDelning, rikedom, rikedomDelar, grundvarde, nivaOf, DELA_RIK, packUp, releaseOwner, willing, tingOf, komOf, BYGGNADER, FN, mostUrgent, fnOf, planBuild, workOn, wearMult, INDOOR_WEAR, homeless, sleepBeds, inZone } from '../sim';
// förrådet i proven: stackarna är det enda som sparas (steg 1.1.2), så proven ställer in förrådet genom lagret
const setItems = (s: State, m: Record<string, number>) => {
  for (const k of STACK_ORDER) if (!isFood(k) && k !== 'ved' && !isTool(k)) setAmount(s, k, m[k] ?? 0);
  for (const k of STACK_ORDER) if (isTool(k)) setAmount(s, k, m[k] ?? 0);
};
const setMat = (s: State, m: Record<string, number>) => { for (const k of FOOD) setAmount(s, k, m[k] ?? 0); };
// all mat blir n, i samma förhållande mellan slagen som förut (bär om det inte fanns någon)
const setFood = (s: State, n: number) => { const f = foodOf(s); if (f > 0) { const m: Record<string, number> = {}; for (const k of FOOD) m[k] = amountOf(s, k) * n / f; setStock(s, m); } else setAmount(s, 'bar', n); };
import { findPath } from '../sim/vag';
import { FOREST, HIGH, isSoil } from '../sim/vag';
import { START } from './kor';
import { Utfall, korSkript, pool } from './pool';

type Koll = [string, boolean];
const kor = (s: State, timmar: number, varje?: (s: State) => void) => { for (let i = 0; i < timmar * 12; i++) { step(s, 300); varje?.(s); } };
// letar efter en text i loggen. Loggen rymmer bara de senaste 400 raderna: har den nått taket kan det som söks ha fallit bort, och då varnar testet
const logg = (s: State, t: string) => {
  if (s.log.length >= 400) console.log(`VARNING: scenariot läser en logg som nått taket (400 rader) och söker "${t}". Räkna i byns statistik i stället.`);
  return s.log.some(l => l.text.includes(t));
};
// andel jordrutor med skog, inom eller utanför ett avstånd från elden. Ängarna räknas inte (äng = 1 räknar bara dem)
function skogsandel(s: State, min: number, max: number, ang = 0) {
  const g = groundOf(s), a = angOf(s.seed);
  let n = 0, sk = 0;
  for (let i = 0; i < g.tiles.length; i++) {
    const f = getMap(s.seed).fire, d = Math.hypot(i % W - f.x, Math.floor(i / W) - f.y); // från elden: lagret finns från början (steg 1.1.2)
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

// lang: tar 13 s eller mer (datorns tid). Den snabba kollen (npm run snabbkoll) hoppar över dem om de inte nämns
const SCENARIER: Record<string, { text: string; lang?: boolean; kor: () => Koll[] }> = {
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
        ['ingen ved, bara grenar i förrådet', amountOf(s, 'ved') === 0 && (amountOf(s, 'grenar')) > 0],
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
    lang: true,
    text: 'Byn har bara en flinta, som behövs till elden: ingen yxa görs, inga träd fälls och elden hålls vid liv med grenar',
    kor: () => {
      const s = createState(13, START); // by 12 dör ut tidigt av svält sedan kaninerna håller sig längre från byn (1.5.5), och saknar sedan torrt gräs att tända med
      setAmount(s, 'flinta', 1);
      kor(s, 30 * 24, s => { if (amountOf(s, 'flinta') > 1) setAmount(s, 'flinta', 1); });
      return [
        ['ingen yxa', !(amountOf(s, 'yxa'))],
        ['inga träd fällda', !(s.fallda ?? 0)],
        ['ingen ved, bara grenar', amountOf(s, 'ved') === 0 && (amountOf(s, 'grenar')) > 0],
        ['ingen dog av kyla', !s.people.some(p => p.cause === 'av kyla')],
        ['byn lever', living(s).length > 0]];
    },
  },
  yxa: {
    text: 'Byn har en yxa: träd fälls, stammarna huggs till ved och det växer högt gräs där träden stod',
    kor: () => {
      const s = createState(13, START);
      setAmount(s, 'yxa', 1);
      Object.assign(s.fire, { lit: true, fuel: 4, ring: true }); // elden brinner: annars hänger provet på när flintan råkar lyckas (ungefär vart femtionde försök)
      s.byggSok = Infinity; // inget hus: träden på en husplats fälls för bygget, inte för ved
      const fallda = new Set<number>();
      let ved = 0;
      kor(s, 10 * 24, s => { ved = Math.max(ved, amountOf(s, 'ved')); for (const k of s.stockar ?? []) fallda.add(Math.floor(k.y) * W + Math.floor(k.x)); });
      const g = groundOf(s);
      // inne i lägret trampas marken där träden stod till jord, så räkna bara utanför
      const ute = [...fallda].filter(i => campDist(s, i % W, Math.floor(i / W)) >= 1);
      let gras = 0; for (const i of ute) if (g.trees[i] < FOREST && g.cover[i] >= 0.7) gras++;
      return [
        ['träd har fällts', (s.fallda ?? 0) >= 3],
        ['ved har huggits', ved > 0],
        [`gräs där träden stod utanför lägret, minst hälften (${gras} av ${ute.length})`, ute.length >= 3 && gras >= ute.length / 2],
        ['stammarna huggs upp (högst 2 liggande)', (s.stockar ?? []).length <= 2]];
    },
  },
  'vinter-slocknad': {
    lang: true,
    text: 'Istiden börjar med slocknad eld, kolhög och lite grenar: byn tänder igen på kolhögen',
    kor: () => {
      // flintan lyckas bara ibland (några procent per försök), så provet körs i fem byar och minst två ska få fyr
      const byar = [16, 17, 18, 19, 20].map(seed => {
        const s = createState(seed, START);
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
        ['tänd på den gamla kolhögen', byar.some(b => logg(b.s, 'på den gamla kolhögen'))],
        // att någon fryser ihjäl en vinter utan eld är rimligt, så det kontrolleras inte
        ['bränsle kvar eller insamlat', byar.every(b => fuelStock(b.s) >= 0)]];
    },
  },
  knapphet: {
    text: 'Bär, rötter och vilt tar slut nära byn för en tid, så invånarna går längre bort; fiske med händerna ger få fiskar per försök',
    kor: () => {
      const s = createState(15, START);
      // mät varje dygn: buskarna växer tillbaka, så ett enda mått i slutet beror på slumpen
      let nara = 0, langt = 0;
      for (let d = 0; d < 12; d++) { kor(s, 24); const n = uttag(s, 'samla', 0, 8); if (n > nara) { nara = n; langt = uttag(s, 'samla', 16, 30); } }
      const st = s.stat ?? {};
      return [
        [`mer plockat nära byn än långt bort (${nara.toFixed(3)} mot ${langt.toFixed(3)})`, nara > 0.005 && nara > langt * 3],
        [`vilt jagat (${uttag(s, 'jakt', 0, 12).toFixed(2)})`, uttag(s, 'jakt', 0, 12) > 0],
        // fiske väljs inte i alla byar; fisket testas utförligt i fiskespjut-scenariot
        [`fiske: ${st.fiskeForsok ?? 0} försök, ${st.fiskeNapp ?? 0} napp, ${st.fisk ?? 0} fiskar`, !st.fiskeForsok || ((st.fiskeForsok ?? 0) > (st.fiskeNapp ?? 0) && (st.fiskeNapp ?? 0) >= (st.fisk ?? 0))],
        ['ingen svalt ihjäl', !s.people.some(p => p.cause === 'av svält')]];
    },
  },
  svamp: {
    lang: true,
    text: 'På hösten plockas kantareller, men ibland följer en giftig orange spindling med; den som förgiftas lär sig skilja dem åt och lär andra',
    kor: () => {
      const s = createState(16, START), s2 = createState(17, START);
      kor(s, 21 * 24); kor(s2, 21 * 24); // vår, sommar och höst. Kantarellerna räknas i två byar: i en by är det mycket slump
      const st = s.stat ?? {}, bast = Math.max(0, ...living(s).map(p => kn(p, 'svamp'))), svamp = (st.svamp ?? 0) + (s2.stat?.svamp ?? 0);
      return [
        [`kantareller plockade i två byar (${svamp})`, svamp > 20],
        [`giftsvamp med i korgen (${st.giftsvamp ?? 0}) eller känd och lämnad (${st.giftsvampKand ?? 0})`, (st.giftsvamp ?? 0) + (st.giftsvampKand ?? 0) > 0],
        [`förgiftningar (${st.forgiftad ?? 0}) ger kunskap (bäst ${bast.toFixed(2)})`, !(st.forgiftad ?? 0) || bast > 0],
        ['byn lever', living(s).length > 0]];
    },
  },
  flinta: {
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
  },
};

SCENARIER.kunskap = {
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

SCENARIER.kalender = {
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
    return [
      [`första vårtiden är ${k0.av} dagar (7–13)`, k0.ai === 1 && k0.dag === 1 && k0.av >= 7 && k0.av <= 13],
      ['varje tidsålder börjar en måndag kl. 00', starter.every(mandag) && vs.every(mandag)],
      [`efter vårtiden kommer sommar, dag 1 av 7 (${AGES[k1.ai]}, dag ${k1.dag} av ${k1.av})`, k1.ai === 2 && k1.dag === 1 && k1.av === 7],
      [`ett år går vid midnatt (år ${yearNo(s, k0.slut - HOUR)} → ${yearNo(s, k0.slut + HOUR)})`, yearNo(s, k0.slut + HOUR) === yearNo(s, k0.slut - HOUR) + 1],
      [`en gammal by kommer i fas: slutar närmaste måndag som inte varit (flyttas högst ${(maxFlytt / DAY).toFixed(1)} dygn)`, allaMandag && ingenBakat && narmast && maxFlytt < 7 * DAY],
    ];
  },
};

SCENARIER.historik = {
  lang: true,
  text: 'Byns historik: nyckeltalen varje timme den senaste veckan, sedan ett värde per dygn, och viktiga händelser i krönikan. Den sparas i en del per vecka och ändrar inget i byn',
  kor: () => {
    const s = createState(3, START), t = createState(3, START);
    for (let i = 0; i < 12 * 24 * 10; i++) { step(s, BEAT); step(t, BEAT); t.hist = undefined; } // t: utan historik
    const h = s.hist!, i = (id: string) => h.tal.indexOf(id) + 1;
    const timOk = h.tim.length >= 7 * 24 && h.tim.length <= 8 * 24 && h.tim[0][0] >= s.now - 8 * DAY;
    const dagar = h.dygn.map(r => Math.floor(r[0] / DAY)), ettPerDygn = dagar.every((d, k) => k === 0 || d === dagar[k - 1] + 1);
    const fortsatt = h.dygn.length > 0 && Math.floor(h.tim[0][0] / DAY) === dagar[dagar.length - 1] + 1;
    const folkOk = [...h.tim, ...h.dygn].every(r => r[i('folk')] >= 0 && r[i('folk')] <= 40 && r[i('humor')] >= 0 && r[i('humor')] <= 1 && r[i('skog')] > 0 && r[i('skog')] < 1);
    const sist = h.tim[h.tim.length - 1], fodda = h.kronika.filter(k => k[1].endsWith('föddes.')).length;
    const delar = serializeParts(s), hd = Object.keys(delar).filter(d => d.startsWith('historik-'));
    const storst = Math.max(...hd.map(d => delar[d].length));
    const ater = JSON.parse(joinParts(Object.values(delar))).hist;
    const utan = JSON.parse(serialize(s)); delete utan.hist;
    return [
      [`en rad i timmen den senaste veckan (${h.tim.length} timmar)`, timOk],
      [`äldre timmar är ett värde per dygn, utan luckor och fram till timmarna (${h.dygn.length} dygn)`, h.dygn.length >= 2 && ettPerDygn && fortsatt],
      ['nyckeltalen är rimliga (invånare, humör 0–1, skog som andel)', folkOk],
      [`födda och döda räknas upp som i byns statistik (${sist[i('fodda')]} födda, ${sist[i('doda')]} döda)`, sist[i('fodda')] === (s.stat?.fodda ?? 0) && sist[i('doda')] === (s.stat?.doda ?? 0)],
      [`krönikan har byns födslar och första eld (${h.kronika.length} rader)`, fodda === (s.stat?.fodda ?? 0) && h.kronika.some(k => k[1].includes('första eld')) === s.fire.lightings > 0],
      [`historiken sparas i en del per vecka (${hd.join(', ')}; största ${Math.round(storst / 1024)} KB av högst 256)`, hd.length === 2 && storst < 256 * 1024 && !delar.byn.includes('"hist"')],
      ['delarna blir samma historik igen', isDeepStrictEqual(ater, JSON.parse(serialize(s)).hist)],
      ['historiken ändrar inget i byn', JSON.stringify(utan) === serialize(t)],
    ];
  },
};

SCENARIER.sparning = {
  text: 'Byn sparas i delar som var och en ryms i ett dokument i molnet, och delarna blir samma by igen',
  kor: () => {
    const s = createState(7, START);
    kor(s, 3 * 24);
    const delar = serializeParts(s), hel = serialize(s);
    const ater = JSON.parse(joinParts(Object.values(delar))), ny = migrate(JSON.parse(joinParts(Object.values(delar))));
    const kb = Object.fromEntries(Object.entries(delar).map(([d, t]) => [d, Math.round(t.length / 1024)]));
    // en by från före v40 (sparversion 1) med gamla fält från gången i levande läget uppgraderas en gång, i nummerordning
    const gammal = JSON.parse(hel), gp = gammal.people.find((p: Person) => p.task);
    gammal.v = 1; Object.assign(gp.task, { fynd: 2, wx: 1, wy: 1, hold: 5, stint: 3 }); (gp.rngs ??= {}).levande = 7;
    migrate(gammal);
    const uppgr = gammal.v === SPARVERSION && !['fynd', 'wx', 'wy', 'hold', 'stint'].some(k => k in gp.task) && !('levande' in gp.rngs);
    const igen = JSON.stringify(gammal); migrate(gammal);
    return [
      [`byn delas i ${Object.keys(delar).join(', ')} (${Object.entries(kb).map(([d, n]) => `${d} ${n} KB`).join(', ')})`, ['byn', 'folket', 'kartor', 'loggen'].every(d => d in delar) && delar.folket.includes('"people"') && !delar.byn.includes('"people"')],
      ['delarna blir samma by igen', isDeepStrictEqual(ater, JSON.parse(hel)) && ny.people.length === s.people.length && ny.now === s.now],
      [`en gammal by uppgraderas till sparversion ${SPARVERSION} och gamla fält försvinner`, uppgr],
      ['en uppgraderad by ändras inte av att uppgraderas igen', JSON.stringify(gammal) === igen],
      [`en ny by har den senaste sparversionen (${s.v})`, s.v === SPARVERSION],
    ];
  },
};

SCENARIER.slump = {
  text: 'Varje system och varje person har en egen slumpföljd, och det som bara syns i spelet rör aldrig byns följder',
  kor: () => {
    const serie = (s: State, k: Strom, p?: Person) => Array.from({ length: 5 }, () => rnd(s, k, p));
    const a = createState(5, START), b = createState(5, START), pa = living(a)[0], pb = living(b)[0];
    for (let i = 0; i < 100; i++) rnd(b, 'eld'); // ett system drar fler tal i den ena byn
    const lika = isDeepStrictEqual(serie(a, 'val'), serie(b, 'val')) && isDeepStrictEqual(serie(a, 'arbete', pa), serie(b, 'arbete', pb));
    const c = createState(5, START), olika = new Set([...Object.keys(STROMMAR).map(k => serie(c, k as Strom)[0]), ...living(c).map(p => serie(c, 'val', p)[0])]);
    // spelet spelar in vägen folk går för att rita den (spar), och det får inte ändra något i byn
    const d = createState(9, START), e = createState(9, START);
    spar.pa = true; spar.v = new WeakMap();
    for (let i = 0; i < 12 * 24; i++) step(d, BEAT);
    spar.pa = false;
    for (let i = 0; i < 12 * 24; i++) step(e, BEAT);
    const inspelning = serialize(d) === serialize(e);
    return [
      ['fler slumptal i ett system ändrar inte slumpen i de andra', lika],
      [`varje system och varje person får egna tal (${olika.size} olika av ${Object.keys(STROMMAR).length + living(c).length})`, olika.size === Object.keys(STROMMAR).length + living(c).length],
      ['spelets inspelning av gångvägarna ändrar inget i byn (ett dygn)', inspelning],
    ];
  },
};

SCENARIER.befolkning = {
  lang: true,
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
    const tand = s.fire.lightings > 0, ring = !!s.fire.ring, kvar = amountOf(s, 'sten');
    Object.assign(s.fire, { lit: false, fuel: 0, emberUntil: undefined }); // elden slocknar
    kor(s, 2);
    // en äldre sparfil med gniststen: den blir flinta, och byn som haft eld har sin ring
    const g = createState(2, START);
    g.items = { gniststen: 1 }; g.stackar = [{ k: 'gniststen', n: 1, x: 1, y: 1, c: 1 }]; g.fire.lightings = 3;
    delete (g.fire as { ring?: boolean }).ring;
    g.v = 1; migrate(g); // som en sparfil från före v40
    return [
      [`stenar samlas och elden tänds (efter ${h} timmar)`, tand && logg(s, 'ring av stenar')],
      [`stenarna blir en ring runt elden (${kvar.toFixed(1)} stenar kvar i förrådet)`, ring && kvar < 1],
      ['elden tänds med flinta, gniststen finns inte', s.fire.log.some(e => e.k === 'tänd') && !(s.stackar ?? []).some(a => a.k === 'gniststen') && !logg(s, 'gniststen')],
      ['ringen ligger kvar när elden slocknat', !!s.fire.ring],
      ['äldre sparfil: gniststenen blir flinta och ringen finns', amountOf(g, 'flinta') === 1 && !('items' in g) && g.stackar!.every(a => a.k !== 'gniststen') && !!g.fire.ring],
    ];
  },
};

SCENARIER.fiskespjut = {
  text: 'Ett fiskespjut täljs av en pinne med flinta eller yxa, ger mer fisk än händerna och slits fort',
  kor: () => {
    const s = createState(4, START);
    setItems(s, { grenar: 10, flinta: 1 });
    Object.assign(s.fire, { lit: true, fuel: 4, ring: true }); // elden brinner, så att ingen behöver leta stenar och flinta
    for (const q of s.people) q.tek = { fiskespjut: 1 }; // alla kan tälja spjut från början
    const p = living(s).find(q => q.task === undefined || true)!;
    makeSpear(s, p);
    const gjort = spears(s) === 1 && amountOf(s, 'flinta') === 1; // flintan finns kvar
    s.stat = { ...(s.stat ?? {}), fiskeForsok: 1 };
    setFood(s, 3); // byn behöver mat
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
    setItems(s, { grenar: 20, flinta: 3, torrgras: 40, ben: 2 });
    Object.assign(s.fire, { lit: true, fuel: 4, ring: true });
    for (const q of s.people) q.tek = { fiskespjut: 1, rep: 1, flintspjut: 1, metspo: 1 };
    const p = living(s).find(q => ageOf(q, s.now) >= 18)!;
    twineRope(s, p, 1); // två rep i timmen sedan steg 1.5.13
    const rep = amountOf(s, 'rep') === 2 && amountOf(s, 'torrgras') === 36;
    makeSpear(s, p);
    const flint = amountOf(s, 'flintspjut') === 1 && amountOf(s, 'flinta') === 2 && amountOf(s, 'rep') === 1 && !amountOf(s, 'fiskespjut');
    p.task = { act: 'fiske', phase: 'do', tx: p.x, ty: p.y, until: s.now + HOUR, carry: 0, tool: 'flintspjut' };
    for (let i = 0; i < 60; i++) wearUsed(s, p, 1);
    const haller = spears(s) === 1 && Math.abs(amountOf(s, 'flintspjut') - 0.75) < 1e-9; // 60 försök tar en fjärdedel
    makeRod(s, p);
    const spo = amountOf(s, 'metspo') === 1 && amountOf(s, 'ben') === 1 && amountOf(s, 'rep') === 0;
    // jakt med flintspjutet: fångar kaniner, och spjutet slits
    const c = campCenter(s), m = getMap(s.seed);
    let bx = c.x, by = c.y, bast = 0;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const v = richness(s, 'jakt', x + 0.5, y + 0.5); if (v > bast && m.tiles[y * W + x] !== T.Vatten && Math.hypot(x - c.x, y - c.y) < 30) { bast = v; bx = x + 0.5; by = y + 0.5; } }
    const vilt0 = amountOf(s, 'vilt'), sp0 = amountOf(s, 'flintspjut');
    let medSpjut = 0;
    for (let i = 0; i < 12 * 3; i++) {
      p.task = { act: 'jakt', phase: 'do', tx: bx, ty: by, until: s.now + HOUR, carry: 0, tool: 'flintspjut', why: 'prov', dark: !isLight(s.now) };
      p.x = bx; p.y = by; step(s, 300);
      if (p.task?.act === 'jakt' && isSpear(p.task.tool)) medSpjut++;
    }
    const jakt = (amountOf(s, 'vilt')) > vilt0 && amountOf(s, 'flintspjut') < sp0;
    // byn fiskar själv några dygn: metspö, spjut och händer
    setFood(s, 3);
    kor(s, 4 * 24, q => { if ((amountOf(q, 'ben')) < 1) setAmount(q, 'ben', 1); if ((amountOf(q, 'flinta')) < 3) setAmount(q, 'flinta', 3); });
    const st = s.stat!, takt = (f: number, n: number) => n ? f / n : 0;
    const met = takt(st.metFisk ?? 0, st.metForsok ?? 0), spjut = takt(st.spjutFisk ?? 0, st.spjutForsok ?? 0);
    return [
      [`rep tvinnas av hö (2 rep av 4 hö på en timme)`, rep],
      ['ett flintspjut görs av gren, flinta och rep, och en flinta sparas till elden', flint],
      ['flintspjutet håller fyra gånger så länge som ett träspjut', haller],
      ['ett metspö görs av gren, rep och ben', spo],
      [`jakt med spjut fångar kaniner, och spjutet slits (${medSpjut} av 36 steg med spjut)`, jakt && medSpjut > 30],
      [`metspöet används och ger mest fisk per försök (${met.toFixed(2)} mot spjutets ${spjut.toFixed(2)}, ${st.metForsok ?? 0} försök med metspö, ${st.spjutForsok ?? 0} med spjut)`, (st.metForsok ?? 0) > 20 && (met > spjut || (st.spjutForsok ?? 0) < 100)],
    ];
  },
};

SCENARIER.agande = {
  text: 'Varje redskap är ett ting med ägare och skick. Den som gör det äger det, det gamla och det en död lämnar är byns. Man har redskapet man arbetar med i handen, tar sitt eget först, behåller det egna i handen och lägger tillbaka byns. Man lånar av släkt och vänner, inte av ovänner',
  kor: () => {
    const s = createState(4, START);
    setItems(s, { grenar: 20, flinta: 2, yxa: 1 });
    Object.assign(s.fire, { lit: true, fuel: 4, ring: true });
    for (const q of s.people) q.tek = { fiskespjut: 1 };
    const [a, b, c] = living(s);
    tidyTools(s);
    const yxaByns = toolsOf(s, 'yxa')[0]?.agare === BYN;
    setAmount(s, 'fiskespjut', 1); tidyTools(s); // ett spjut som är byns
    makeSpear(s, a);
    const gjorda = ownedBy(s, a).length === 1 && spears(s) === 2;
    const task = (p: Person, act: Act, tool?: string) => { p.task = { act, phase: 'do', tx: p.x, ty: p.y, until: s.now + 3600, carry: 0, tool }; if (usesTool(p.task)) take(s, p, tool!); };
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
    makeSpear(s, a); task(a, 'fiske', 'fiskespjut');
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
      [`folk bär sina egna redskap mellan arbetena (${ihand} av ${3 * 24 * 12} steg)`, ihand > 0],
      ['redskapen finns bara som ting, och varje ting på ett ställe (i handen, i en börda eller på en ruta)', summa],
      [`en ruta i förrådet för varje redskap där (${stackar} rutor, ${iforradet} redskap)`, stackar === iforradet],
    ];
  },
};
SCENARIER.gava = {
  lang: true,
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
    let byte: string | undefined; forsok = 0; while (!byte && forsok++ < 200) byte = askForTool(s, b, c);
    const bytt = byte === 'byte' && har(b, 'yxa') === 1 && har(c, 'kniv') === 1;
    // en vanlig by
    let gavor = 0, byten = 0;
    for (let i = 0; i < 4; i++) {
      const v = createState(40 + i, START);
      for (let h = 0; h < 20 * 24 * 12; h++) step(v, 300);
      gavor += v.stat?.gavor ?? 0; byten += v.stat?.byten ?? 0;
    }
    return [
      [`en förälder ger sitt barn det hen har över (${barn} av 20)`, barn >= 17],
      ['en ovän ger inget', ovan === 0],
      [`en vän ger det hen har över (efter ${forsok} samtal)`, van],
      [`två som har något över som den andra saknar byter (${byte})`, bytt],
      [`i vanliga byar ges och byts redskap (${gavor} gåvor och ${byten} byten i 4 byar på 20 dygn)`, gavor + byten > 0],
    ];
  },
};

SCENARIER.byte = {
  text: 'Byten i behovsstegen, mellan sitt eget och byns förråd: den som saknar något byter till sig det mot något hen har över, när båda tjänar på det (grundvärdet gånger var och ens behov). Ojämna byten går när skillnaden är liten, när den ena håller på att dö eller när de står varandra nära. Mat, material och redskap kan bytas. I samtal, mest på kvällar och nätter, byter folk också utan akut behov när båda tjänar på det (steg 1.4.3).',
  kor: () => {
    const ny = () => {
      const s = createState(6, START);
      rikBy(s); setMat(s, {}); setStock(s, { ved: 0, grenar: 0, flinta: 0, torrgras: 0 }); s.ting = [];
      const [a, b, c] = living(s);
      for (const q of [a, b, c]) { q.mother = q.father = q.partner = undefined; q.x = 30; q.y = 30; q.task = undefined; q.hunger = 1; q.health = 1; q.warm = 1; q.pot.empati = 10; q.habit = {}; }
      for (const q of [a, b, c]) for (const r of [a, b, c]) if (q !== r) getRel(s, q, r).op = 0; // inga vänner
      s.people = [a, b, c]; c.x = 90;
      return { s, a, b, c };
    };
    const byns = (s: State, k: string) => amountOf(s, k) - living(s).reduce((n, q) => n + ownsAmount(s, q, k), 0);
    const nara = (x: number, y: number) => Math.abs(x - y) < 1e-6;
    // a är hungrig och har trä över, b har mat över: a byter till sig mat före byns. b värderar sin mat över till hälften
    // (1,52 × 0,5) och trä hen inte har fullt (0,66), så en portion kostar 1,15 trä
    let { s, a, b } = ny();
    a.hunger = 0.3; addTo(s, 'bar', 5); gain(s, b, 'bar', 6); gain(s, a, 'ved', 6);
    needLadder(s, a, 1);
    const fore = a.hunger > 0.3 && nara(byns(s, 'bar'), 5) && nara(ownsAmount(s, b, 'bar'), 5), pris = ownsAmount(s, b, 'ved');
    // a har nästan inget över (0,2 trä utöver det hen behöver): ingen byter med hen en portion, utom en nära vän
    ({ s, a, b } = ny());
    a.hunger = 0.3; addTo(s, 'bar', 5); gain(s, b, 'bar', 6); gain(s, a, 'ved', 3.2);
    needLadder(s, a, 1); const okand = nara(ownsAmount(s, b, 'bar'), 6) && a.hunger > 0.3;
    ({ s, a, b } = ny());
    a.hunger = 0.3; addTo(s, 'bar', 5); gain(s, b, 'bar', 6); gain(s, a, 'ved', 3.2); getRel(s, b, a).op = 70; getRel(s, a, b).op = 70; b.pot.empati = 20;
    needLadder(s, a, 1); const van = nara(ownsAmount(s, b, 'bar'), 5) && ownsAmount(s, b, 'ved') < 0.3;
    // ... eller när hen håller på att dö av svält
    ({ s, a, b } = ny());
    a.hunger = 0; a.health = 0.5; addTo(s, 'bar', 5); gain(s, b, 'bar', 6); gain(s, a, 'ved', 3.2);
    needLadder(s, a, 1); const dor = nara(ownsAmount(s, b, 'bar'), 5);
    // en ovän byter inte
    ({ s, a, b } = ny());
    a.hunger = 0.3; addTo(s, 'bar', 5); gain(s, b, 'bar', 6); gain(s, a, 'ved', 6); getRel(s, b, a).op = -40;
    needLadder(s, a, 1); const ovan = nara(ownsAmount(s, b, 'bar'), 6) && nara(byns(s, 'bar'), 4);
    // material till ett eget arbete: a saknar flinta och betalar med mat hen har över; byns flinta tas inte
    ({ s, a, b } = ny());
    addTo(s, 'flinta', 3); gain(s, b, 'flinta', 2); gain(s, a, 'bar', 20);
    takeMaterial(s, a, 'flinta', 1);
    const material = nara(byns(s, 'flinta'), 3) && nara(ownsAmount(s, b, 'flinta'), 1) && ownsAmount(s, b, 'bar') > 3;
    // ett redskap mot mat: a samlar och saknar korg, b har två
    ({ s, a, b } = ny());
    a.habit = { samla: 10 }; addTool(s, 'korg', b); addTool(s, 'korg', b); gain(s, a, 'bar', 20);
    const korg = askForTool(s, a, b) === 'byte' && ownedBy(s, a).some(t => t.k === 'korg') && ownsAmount(s, b, 'bar') > 0;
    // kvällens byten (1.4.3): a har mat men mindre än hen vill ha kvar (1,6) och trä över, b tvärtom. Ingen saknar något
    ({ s, a, b } = ny());
    gain(s, a, 'bar', 0.5); gain(s, a, 'ved', 6); gain(s, b, 'bar', 6); gain(s, b, 'ved', 1);
    askForGift(s, a, b);
    const kvall = nara(ownsAmount(s, a, 'bar'), 1.6) && ownsAmount(s, a, 'ved') >= 3 - 1e-9 && ownsAmount(s, b, 'ved') > 1 + 0.84 / 0.66 && s.stat?.kvallsbyten === 1;
    // har båda det de vill ha kvar byter de inte, och inte heller med en ovän
    ({ s, a, b } = ny());
    gain(s, a, 'bar', 1.6); gain(s, a, 'ved', 6); gain(s, b, 'bar', 6); gain(s, b, 'ved', 3);
    askForGift(s, a, b); const nog = !s.stat?.byten && nara(ownsAmount(s, a, 'ved'), 6);
    ({ s, a, b } = ny());
    gain(s, a, 'bar', 0.5); gain(s, a, 'ved', 6); gain(s, b, 'bar', 6); gain(s, b, 'ved', 1); getRel(s, b, a).op = -40;
    askForGift(s, a, b); const kvallOvan = !s.stat?.byten;
    // vanliga byar
    let byten = 0, mat = 0, mtrl = 0, natt = 0, dag = 0;
    for (const seed of [1, 42]) {
      const v = createState(seed, START);
      for (let i = 0; i < 8 * 288; i++) {
        const f = v.stat?.kvallsbyten ?? 0, ljust = isLight(v.now);
        step(v, 300);
        if (ljust) dag += (v.stat?.kvallsbyten ?? 0) - f; else natt += (v.stat?.kvallsbyten ?? 0) - f;
      }
      byten += v.stat?.byten ?? 0; mat += v.stat?.byte_mat ?? 0; mtrl += v.stat?.byte_material ?? 0;
    }
    return [
      [`den hungrige byter till sig mat mot trä hen har över, före byns mat (en portion för ${pris.toFixed(2)} trä)`, fore && Math.abs(pris - 1.52 * 0.5 / 0.66) < 0.01],
      ['den som har för lite att ge får inget byte av någon hen inte står nära', okand],
      ['en nära vän går med på ett ojämnt byte', van],
      ['den som håller på att dö får ett ojämnt byte', dor],
      ['en ovän byter inte', ovan],
      ['material till ett eget arbete byts till sig före byns', material],
      ['ett redskap byts mot mat', korg],
      ['i samtal byter den som har mindre mat än hen vill ha kvar till sig mat mot trä, och båda tjänar på det', kvall],
      ['har båda det de vill ha kvar blir det inget byte', nog],
      ['en ovän byter inte i samtal heller', kvallOvan],
      [`i vanliga byar byter folk (${byten} byten på 8 dygn i 2 byar: ${mat.toFixed(1)} portioner mat, ${mtrl.toFixed(1)} material)`, byten > 0],
      [`kvällens byten blir mest av på kvällar och nätter (${natt} i mörker, ${dag} i dagsljus)`, natt > 2 * dag && natt > 0],
    ];
  },
};

// en by så rik att folk behåller allt de skaffar (delning.ts), så att ägandet kan provas
const rikBy = (s: State) => { s.delning = { rik: DELA_RIK, andel: 0 }; };

SCENARIER.egendom = {
  text: 'Det någon samlar, hugger, jagar och gör är hens, också i byns förråd. Det som redan var byns förblir byns. Till sig själv tar man sitt eget först, till elden byns. Det som ruttnar minskar allas delar, slaktat kött är dens som ägde viltet, och den som dör lämnar sin del till byn.',
  kor: () => {
    const s = createState(6, START);
    const fore = STACK_ORDER.reduce((n, k) => n + ownedSum(s, k), 0);
    rikBy(s); setItems(s, { grenar: 20 }); setAmount(s, 'ved', 2); setMat(s, { bar: 20 });
    const [a, b, c] = living(s);
    for (const q of [a, b, c]) q.mother = q.father = q.partner = undefined;
    gain(s, a, 'bar', 5);
    const fick = ownsAmount(s, a, 'bar');
    takeFood(s, 2, a); const atEget = ownsAmount(s, a, 'bar');
    takeFood(s, 2, b); const annanAt = ownsAmount(s, a, 'bar');
    gain(s, a, 'ved', 4); takeFuel(s, 3, a); const elden = ownsAmount(s, a, 'ved');
    addTo(s, 'bar', -foodOf(s) / 2); const rutten = ownsAmount(s, a, 'bar');
    // slakt: a äger två kaniner, c slaktar dem med en kniv
    gain(s, a, 'vilt', KANIN * 2); setAmount(s, 'kniv', 1); tidyTools(s); c.tek = { ...(c.tek ?? {}), kniv: 1 };
    slaughter(s, c, 1);
    const kott = ownsAmount(s, a, 'kott'), slaktarens = ownsAmount(s, c, 'kott');
    die(s, a, 'test'); const arv = Object.keys(ownedStock(s, a)).length;
    // vanliga byar: delarna går aldrig över det som finns i förrådet
    let fel = 0, agt = 0;
    for (const [seed, h, live] of [[41, 10 * 24, false], [3, 6, true]] as const) {
      const v = createState(seed, START);
      for (let i = 0; i < h * 3600 / (live ? 0.5 : 300); i++) { step(v, live ? 0.5 : 300); if (i % 200 === 0) for (const a of v.stackar ?? []) if (sumOf(a.ag) > a.n + 1e-6) fel++; }
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
      [`det som ruttnar minskar allas delar (${rutten.toFixed(2)})`, Math.abs(rutten - 1.5) < 0.01],
      [`slaktat kött är dens som ägde viltet (${kott.toFixed(1)}), inte slaktarens`, kott > 0 && slaktarens === 0],
      ['den som dör lämnar sin del till byn', arv === 0],
      [`i vanliga byar äger folk det de skaffat (${agt} personer), och delarna går aldrig över förrådet`, agt > 0 && fel === 0],
    ];
  },
};

SCENARIER.behov = {
  text: 'Behovsstegen: den som behöver något tar sitt eget, sedan byns, ber sedan någon i närheten om det, och stjäl först när hen håller på att dö. Hög empati stjäl aldrig, man stjäl helst av den man inte tycker om, och den bestulne märker det.',
  kor: () => {
    const ny = () => {
      const s = createState(6, START);
      rikBy(s); setMat(s, {});
      const [a, b, c] = living(s);
      for (const q of [a, b, c]) { q.mother = q.father = q.partner = undefined; q.x = 30; q.y = 30; q.task = undefined; q.hunger = 0.3; q.health = 1; }
      s.people = [a, b, c];
      return { s, a, b, c };
    };
    // a är hungrig, b har mat men är ingen släkt och ovän: a tar inte b:s mat förrän nöden är stor
    let { s, a, b, c } = ny();
    getRel(s, a, b).op = -30; getRel(s, a, c).op = -30; c.x = 90;
    gain(s, b, 'bar', 5);
    needLadder(s, a, 1e6); const tarInte = ownFor(s, b, MAT) === 5 && a.hunger === 0.3;
    // byns mat går före gåvor och stöld
    addTo(s, 'bar', 2);
    needLadder(s, a, 1); const byns = a.hunger > 0.3 && ownFor(s, b, MAT) === 5;
    // ett barn ber sin förälder, som delar också det sista
    ({ s, a, b, c } = ny());
    a.mother = b.id; gain(s, b, 'bar', 1); b.task = { act: 'sova' } as any;
    needLadder(s, a, 1e6); const foralder = a.hunger > 0.3 && ownFor(s, b, MAT) < 0.5;
    // en vän ger det hen har över
    ({ s, a, b, c } = ny());
    getRel(s, a, b).op = 70; b.pot.empati = 20; gain(s, b, 'bar', 6);
    let van = false; for (let i = 0; i < 20 && !van; i++) { a.hunger = 0.3; needLadder(s, a, 1e6); van = a.hunger > 0.3; }
    // stöld i yttersta nöd: mycket hög empati stjäl aldrig, låg empati stjäl när den svälter
    ({ s, a, b, c } = ny());
    getRel(s, a, b).op = -30; gain(s, b, 'bar', 5);
    a.pot.empati = 20; a.hunger = 0; a.health = 0.02;
    needLadder(s, a, 1); const aldrig = ownFor(s, b, MAT) === 5;
    a.pot.empati = 1; a.health = 0.9;
    needLadder(s, a, 1); const stal = ownFor(s, b, MAT) < 5 && a.hunger > 0;
    // den bestulne märker det när hen äter av sitt eget
    const fore = getRel(s, a, b).op; b.hunger = 0.3; needLadder(s, b, 1);
    const marker = getRel(s, a, b).op < fore && !b.stulet;
    // man stjäl helst av den man inte tycker om
    let ovan = 0;
    for (let i = 0; i < 40; i++) {
      ({ s, a, b, c } = ny());
      gain(s, b, 'bar', 5); gain(s, c, 'bar', 5);
      getRel(s, a, b).op = -60; getRel(s, a, c).op = 60; a.pot.empati = 1; a.hunger = 0; a.health = 0.5;
      s.rngs = { dela: i * 7919 + 1 }; a.rngs = { dela: i * 7919 + 1 };
      needLadder(s, a, 1); if (ownFor(s, b, MAT) < 5) ovan++;
    }
    // vanliga byar är fattiga de första dygnen, så det mesta av maten är byns och delas utan gåvor (delning.ts)
    let egen = 0, allt = 0;
    for (const seed of [1, 42]) { const v = createState(seed, START); for (let i = 0; i < 2 * 288; i++) step(v, 300); for (const k of FOOD) { egen += ownedSum(v, k); allt += amountOf(v, k); } }
    return [
      ['den hungrige tar inte en oväns mat innan nöden är stor', tarInte],
      ['byns mat går före andras', byns],
      ['ett barn får mat av sin förälder, som delar också det sista (och kan väckas)', foralder],
      ['en vän ger av det hen har över', van],
      ['den med mycket hög empati stjäl aldrig, inte ens döende', aldrig],
      ['den med låg empati stjäl när den svälter', stal],
      ['den bestulne märker det och relationen blir sämre', marker],
      [`man stjäl helst av den man inte tycker om (${ovan} av 40)`, ovan >= 28],
      [`i nya byar är det mesta av maten byns efter 2 dygn (2 år i spelet): ${(100 * egen / Math.max(1, allt)).toFixed(0)} % är någons eget`, allt > 0 && egen < allt / 2],
    ];
  },
};

SCENARIER.ved = {
  lang: true,
  text: 'Ved, material och redskap i behovsstegen: elden ägs av byn men man eldar bara med byns ved och sin egen. Den som fryser ber om ved, och stjäl den först när kylan håller på att döda. Material till ett arbete tas av sitt eget och byns, som gåva, och sist av andras (en lindrig stöld). Redskap lånas, ges och byts i samma steg.',
  kor: () => {
    const ny = () => {
      const s = createState(6, START);
      rikBy(s); setMat(s, {}); setStock(s, { ved: 0, grenar: 0, flinta: 0, torrgras: 0 });
      const [a, b, c] = living(s);
      for (const q of [a, b, c]) { q.mother = q.father = q.partner = undefined; q.x = 30; q.y = 30; q.task = undefined; q.hunger = 1; q.health = 1; q.warm = 1; q.pot.empati = 10; }
      s.people = [a, b, c];
      Object.assign(s.fire, { lit: true, fuel: 0.5, want: 5 });
      return { s, a, b, c };
    };
    // elden: byns ved och sin egen, inte andras
    let { s, a, b, c } = ny();
    getRel(s, a, b).op = 0; gain(s, b, 'ved', 4); gain(s, a, 'grenar', 5); addTo(s, 'ved', 1);
    const fv = fuelFor(s, a), far = Math.abs(fv - 3) < 1e-9; // 1 ved av byns + 5 grenar à 0,4
    takeFuel(s, 3, a);
    const intedras = ownsAmount(s, b, 'ved') === 4 && ownsAmount(s, a, 'grenar') < 1e-9;
    // den som fryser och inte har någon ved får den av en vän
    ({ s, a, b, c } = ny());
    getRel(s, b, a).op = 70; b.pot.empati = 20; gain(s, b, 'ved', 8);
    let fick = false; for (let i = 0; i < 20 && !fick; i++) { a.warm = 0.2; needLadder(s, a, 1e6); fick = ownsAmount(s, a, 'ved') > 0; }
    // i yttersta nöd hämtar den frysande någon annans ved till elden; hög empati gör det aldrig
    ({ s, a, b, c } = ny());
    getRel(s, a, b).op = -30; getRel(s, b, a).op = -30; gain(s, b, 'ved', 4);
    a.warm = 0.05; a.health = 0.02; a.pot.empati = 20; needLadder(s, a, 1);
    const aldrig = a.task?.act !== 'elda';
    a.pot.empati = 1; a.health = 0.5; needLadder(s, a, 1);
    const stjal = a.task?.act === 'elda' && a.task.fran === b.id;
    // material: sitt eget och byns först, sedan andras som en lindrig stöld som märks
    ({ s, a, b, c } = ny());
    getRel(s, a, b).op = -30; getRel(s, b, a).op = -30; c.x = 90;
    gain(s, a, 'flinta', 1); addTo(s, 'flinta', 1); gain(s, b, 'flinta', 3);
    takeMaterial(s, a, 'flinta', 2);
    const egetForst = ownsAmount(s, b, 'flinta') === 3 && ownsAmount(s, a, 'flinta') < 1e-9;
    takeMaterial(s, a, 'flinta', 1);
    const lindrig = ownsAmount(s, b, 'flinta') === 2 && !!b.stulet?.some(x => x.k === 'flinta' && x.l);
    const fore = getRel(s, b, a).op; takeMaterial(s, b, 'flinta', 1);
    const marker = Math.abs(getRel(s, b, a).op - (fore - STOLD_LINDRIG)) < 1e-9 && !b.stulet;
    a.pot.empati = 20;
    const hogEmp = getable(s, a, 'flinta') === 0;
    // vanliga byar: elden brinner och ingen fryser ihjäl
    let kyla = 0, eld = 0;
    for (const seed of [1, 42]) { const v = createState(seed, START); for (let i = 0; i < 10 * 288; i++) step(v, 300); kyla += v.people.filter(q => q.cause === 'av kyla').length; eld += v.fire.lit ? 1 : 0; }
    return [
      [`man eldar med byns ved och sin egen (${fv.toFixed(1)} ved, inte grannens 4)`, far],
      ['elden tar inte någon annans ved', intedras],
      ['den som fryser och inte har ved får den av en vän', fick],
      ['den med mycket hög empati tar aldrig någon annans ved, inte ens döende', aldrig],
      ['den som håller på att frysa ihjäl hämtar någon annans ved till elden', stjal],
      ['material tas av sitt eget och byns före andras', egetForst],
      ['andras material tas sist, som en lindrig stöld', lindrig],
      [`den bestulne märker det, och relationen blir ${STOLD_LINDRIG} sämre (inte ${STOLD_OP})`, marker],
      ['den med mycket hög empati tar inte andras material', hogEmp],
      [`ingen fryser ihjäl i två vanliga byar på 10 dygn (10 år i spelet) (${kyla})`, kyla === 0],
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
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const v = richness(s, 'jakt', x + 0.5, y + 0.5); if (v > bast && m.tiles[y * W + x] !== T.Vatten && Math.hypot(x - c.x, y - c.y) < 30) { bast = v; bx = x + 0.5; by = y + 0.5; } }
    let hela = true;
    for (let i = 0; i < 24 * 12; i++) {
      p.task = { act: 'jakt', phase: 'do', tx: bx, ty: by, until: s.now + HOUR, carry: 0, why: 'prov', dark: !isLight(s.now) };
      p.x = bx; p.y = by;
      const v0 = amountOf(s, 'vilt');
      step(s, 300);
      const d = (amountOf(s, 'vilt')) - v0;
      if (d > 0.05 && Math.abs(d - KANIN) > 0.05) hela = false; // det som kommer in är hela kaniner (lite kan ätas samtidigt)
    }
    const kaniner = s.stat?.kaniner ?? 0;
    // den som fångat en kanin bär hem den hel (små steg, så att vägen hem syns)
    const q = createState(6, START); q.now = new Date(q.now).setHours(9, 0, 0, 0);
    const j = living(q).find(r => ageOf(r, q.now) >= 18)!;
    let hem = 0, annat = 0;
    for (let i = 0; i < 6 * 3600 * 2 && !hem; i++) {
      if (j.task?.act !== 'jakt') j.task = { act: 'jakt', phase: 'go', tx: bx, ty: by, until: q.now + 3 * HOUR, carry: 0, why: 'prov', dark: false };
      step(q, 0.5);
      if (j.task?.act === 'jakt' && j.task.phase === 'back') { if (Math.abs(j.task.carry - KANIN) < 1e-9 && !j.task.items) hem++; else if (j.task.carry > 0) annat++; }
    }
    // utan kniv ingen slakt; med kniv blir en kanin kött, ben, skinn och senor
    setAmount(s, 'flinta', 2); setAmount(s, 'grenar', 2);
    const utan = !canSlaughter(s, p);
    for (const r of s.people) r.tek = { ...r.tek, kniv: 1, rep: 1 };
    makeKnife(s, p);
    const kniv = amountOf(s, 'kniv') === 1 && amountOf(s, 'flinta') === 1;
    setMat(s, { vilt: 3 * KANIN }); setAmount(s, 'ben', 0); setAmount(s, 'skinn', 0); setAmount(s, 'rep', 0);
    const kan = canSlaughter(s, p);
    slaughter(s, p, 1);
    const slakt = Math.abs(amountOf(s, 'kott') - 3 * SLAKT.kott) < 1e-9 && amountOf(s, 'vilt') < 1e-9 && Math.abs(amountOf(s, 'ben') - 3) < 1e-9 && Math.abs(amountOf(s, 'skinn') - 3) < 1e-9;
    // senorna blir ibland ett rep, men bara för den som kan tekniken Rep
    const repAv = (kan: boolean) => { let r = 0; for (let i = 0; i < 200; i++) { setMat(s, { vilt: KANIN }); setAmount(s, 'rep', 0); p.tek = { ...p.tek, rep: kan ? 1 : 0 }; slaughter(s, p, 1); r += amountOf(s, 'rep'); } return r; };
    const medRep = repAv(true), utanRep = repAv(false);
    return [
      [`kaniner syns där det finns vilt (${dj.length} st), inga i lägret (${iLagret})`, dj.length > 10 && iLagret === 0],
      [`fler kaniner där det finns mycket vilt (${(tat(rik, nr) * 100).toFixed(1)} % av de rika rutorna, ${(tat(fattig, nf) * 100).toFixed(1)} % av de fattiga)`, tat(rik, nr) > tat(fattig, nf) * 2],
      [`kaninerna skuttar omkring (${flyttat} av ${dj.length} flyttade sig på en minut)`, flyttat > dj.length * 0.3],
      [`en kanin hoppar undan den som kommer nära (${avst.toFixed(1)} rutor bort)`, avst > 2],
      [`jakt utan redskap fångar hela kaniner (${kaniner} på ett dygn)`, kaniner >= 1 && hela],
      [`kaninen bärs hem hel, en i taget (${hem} gång, ${annat} med annat)`, hem >= 1 && annat === 0],
      ['utan kniv slaktas inget; kniven görs av en flinta och en gren och en flinta sparas till elden', utan && kniv && kan],
      ['en slaktad kanin ger mer kött än den uppätna, och ett ben och ett skinn', slakt && SLAKT.kott > KANIN],
      [`senorna blir ibland ett rep för den som kan Rep (${medRep} rep av 200 kaniner), aldrig annars (${utanRep})`, medRep >= 200 * DJUR.kanin.rep * 0.5 && medRep <= 200 * DJUR.kanin.rep * 1.5 && utanRep === 0],
    ];
  },
};

SCENARIER.abborre = {
  text: 'Det som fångas är en hel abborre. Den rensas med händerna vid elden till fiskkött, som är det man äter; köttet är dens som ägde fisken',
  kor: () => {
    const s = createState(1, START);
    s.now = new Date(s.now).setHours(10, 0, 0, 0);
    const [a, c] = living(s);
    setMat(s, {}); gain(s, a, 'abborre', 6);
    const egen = ownsAmount(s, a, 'abborre'); // det som inte delats med byn
    const kan = canClean(s, c);
    clean(s, c, 0.1); // tre abborrar på sex minuter
    const halv = Math.abs(amountOf(s, 'abborre') - 3) < 1e-9 && Math.abs(amountOf(s, 'fisk') - 3) < 1e-9;
    clean(s, c, 1);
    const klar = amountOf(s, 'abborre') < 1e-9 && Math.abs(amountOf(s, 'fisk') - 6) < 1e-9;
    const agare = egen > 0 && Math.abs(ownsAmount(s, a, 'fisk') - egen) < 1e-9 && ownsAmount(s, c, 'fisk') === 0;
    // en vanlig by: fisket ger abborrar, och de rensas till fiskkött vid elden
    // (alla byar börjar inte fiska de första dygnen; den första av några byar som fiskar räknas)
    let rensar = 0, abborreSedd = 0, fangat = 0, rensat = 0;
    for (const seed of [3, 1, 2, 4, 5]) {
      const v = createState(seed, START);
      rensar = 0; abborreSedd = 0;
      for (let i = 0; i < 6 * 288; i++) {
        step(v, 300);
        if (living(v).some(p => p.task?.act === 'rensa')) rensar++;
        abborreSedd = Math.max(abborreSedd, amountOf(v, 'abborre'));
      }
      fangat = v.stat?.fisk ?? 0; rensat = v.stat?.rensat ?? 0;
      if (fangat > 0) break;
    }
    return [
      ['abborren rensas med händerna, utan kniv', kan],
      ['en abborre blir lika mycket fiskkött, några på en kvart', halv && klar],
      ['fiskköttet är dens som ägde abborren, inte dens som rensade', agare],
      [`i en by kommer abborrar hem (högst ${abborreSedd.toFixed(0)} på en gång) och rensas vid elden (${rensat.toFixed(0)} av ${fangat} fångade på sex dygn, sex år i spelet)`, fangat > 0 && abborreSedd > 0 && rensat >= fangat * 0.5 && rensar > 0],
    ];
  },
};

SCENARIER.byggnader = {
  text: 'Varje sorts byggnad är en rad i ett register med behov, vikt och ägare. Byn bygger för det mest akuta behovet, faror först: den som saknar tak över huvudet får en sovsal',
  kor: () => {
    const rader = FN.every(fn => { const r = BYGGNADER[fn]; return !!(r.namn && r.ikon && r.behov && r.agare); });
    const ny = createState(6, START), u = mostUrgent(ny);
    // en by där alla vuxna kan göra timmerväggar och har yxor bygger ett hus
    const q = createState(6, START);
    for (const p of living(q)) if (ageOf(p, q.now) >= 14) Object.assign((p.tek ??= {}), { yxa: 1, timmervagg: 1 });
    setAmount(q, 'yxa', 2);
    kor(q, 6);
    const h = housesOf(q)[0];
    return [
      ['varje rad har namn, symbol, behov och ägare', rader],
      [`utan sovplatser är sovsalen det mest akuta, en fara (${u?.fn ?? 'inget'})`, u?.fn === 'sovsal' && BYGGNADER.sovsal.fara],
      [`byns första hus blir en sovsal (${h ? fnOf(h).namn : 'inget hus'})`, h?.fn === 'sovsal' && fnOf(h).namn === 'Sovsal'],
    ];
  },
};

// bygger färdigt det hus som är planerat: alla delar utom den sista klara, den sista byggs som vanligt (workOn)
function byggKlart(s: State) {
  const h = housesOf(s).find(q => !q.klar);
  if (!h) return undefined;
  const bs = bitsOf(s).filter(b => b.hus === h.id), p = living(s)[0];
  for (const b of bs) { b.mat = MATERIAL_N(b.m); b.b = b === bs[bs.length - 1] ? 0.999 : 1; }
  touch(s);
  workOn(s, p, bs[bs.length - 1], 3600);
  return h;
}
const MATERIAL_N = (m: string) => ({ timmer: 2, tra: 0.5 } as Record<string, number>)[m] ?? 0;
const byggare = (s: State) => { for (const p of living(s)) if (ageOf(p, s.now) >= 14) Object.assign((p.tek ??= {}), { yxa: 1, timmervagg: 1 }); };

SCENARIER.forradshus = {
  text: 'Ruttnar maten eller är förrådet fullt bygger byn ett förrådshus. Golvet blir en lagerplats under tak, där det som ligger ruttnar och slits mindre, och maten bärs in dit',
  kor: () => {
    const s = createState(6, START);
    s.now = new Date(s.now).setHours(10, 0, 0, 0);
    byggare(s);
    planBuild(s); const sov = byggKlart(s);
    const tak = homeless(s) === 0;
    const forr = mostUrgent(s);
    s.ruttet = 50; // mycket mat har ruttnat på sistone
    const nu = mostUrgent(s);
    planBuild(s); const h = byggKlart(s);
    const z = zonesOf(s).find(q => q.hus === h?.id);
    const inne = !!z && wearMult(s, z.x, z.y) === INDOOR_WEAR && (z.prio ?? 0) > Math.max(...zonesOf(s).filter(q => q !== z).map(q => q.prio ?? 0));
    const sover = !!h && !sleepBeds(s).some(i => i % W >= h.x && i % W < h.x + h.w && Math.floor(i / W) >= h.y && Math.floor(i / W) < h.y + h.h);
    // en vanlig by: förrådshuset byggs när maten börjat ruttna, och maten flyttas in
    const v = createState(1, START);
    let byggt = 0, iHuset = 0;
    kor(v, 26 * 24, v => {
      const f = housesOf(v).find(q => q.fn === 'forrad' && q.klar);
      if (f && !byggt) byggt = v.now;
      const fz = zonesOf(v).find(q => q.hus !== undefined);
      if (fz) iHuset = Math.max(iHuset, pilesOf(v).filter(a => isFood(a.k) && inZone(fz, a.x, a.y)).length);
    });
    return [
      [`med alla under tak är inget hus akut (${forr?.fn ?? 'inget'})`, !!sov && tak && !forr],
      [`när maten ruttnar är förrådshuset det mest akuta (${nu?.fn ?? 'inget'})`, nu?.fn === 'forrad'],
      ['förrådshusets golv blir byns viktigaste lagerplats, under tak', h?.fn === 'forrad' && inne],
      ['ingen sover i förrådshuset', sover],
      [`i en vanlig by byggs ett förrådshus (dygn ${byggt ? ((byggt - START) / DAY).toFixed(0) : '–'}, lika många år i spelet) och maten bärs in (${iHuset} stackar)`, byggt > 0 && iHuset > 0],
    ];
  },
  lang: true,
};

SCENARIER.kaniner = {
  text: 'Kaninerna finns i några få små grupper som håller ihop, där kartan är hög och långt från byn. En jagad grupp krymper och kommer tillbaka på en ny plats, och jakten ger bara något nära en grupp',
  kor: () => {
    const s = createState(6, START);
    s.now = new Date(s.now).setHours(10, 0, 0, 0);
    // några dygn, en gång i timmen: hur många grupper, hur stora, hur nära byn och hur nära varandra i gruppen
    let flest = 0, minst = 99, storst = 0, naraByn = 0, spridda = 0, kaniner = 0, battre = 0, samre = 0;
    const forst = new Map<number, number>(), fore = s.now;
    for (let h = 0; h < 72; h++) {
      const gs = grupperOf(s), dj = djurOf(s);
      flest = Math.max(flest, gs.length);
      for (const g of gs) {
        minst = Math.min(minst, g.n); storst = Math.max(storst, g.n);
        const v = vaxerAt(s, 'jakt', Math.floor(g.y) * W + Math.floor(g.x));
        if (!forst.has(g.id)) forst.set(g.id, v); else if (v >= forst.get(g.id)! - 1e-9) battre++; else samre++;
      }
      for (const d of dj) {
        kaniner++;
        if (campDist(s, Math.floor(d.x), Math.floor(d.y)) < SKYGG_IN) naraByn++;
        if (Math.min(...gs.map(g => Math.hypot(g.x - d.x, g.y - d.y))) > 3) spridda++;
      }
      s.now += HOUR;
    }
    s.now = fore;
    // jakten ger bara något nära en grupp: en rik plats på kartan långt från grupperna ger inget
    const gs = grupperOf(s);
    let tom = -1;
    for (let i = 0; i < W * H; i++) { const x = i % W + 0.5, y = Math.floor(i / W) + 0.5; if (vaxerAt(s, 'jakt', i) > FYND.jakt.topp * 0.5 && gs.every(g => Math.hypot(g.x - x, g.y - y) > 8)) { tom = i; break; } }
    const g0 = gs[0], vidGrupp = richness(s, 'jakt', g0.x, g0.y), langtBort = tom < 0 ? 0 : richness(s, 'jakt', tom % W + 0.5, Math.floor(tom / W) + 0.5);
    // en grupp som jagas krymper och tar slut, och kommer tillbaka på en ny plats när dess tid är slut
    const k = g0.id % GRUPPER_MAX, n0 = g0.n;
    for (let i = 0; i < 200 && grupperOf(s).find(g => g.id === g0.id)!.n > 0; i++) takeFrom(s, 'jakt', g0.x + (i % 5) - 2, g0.y + Math.floor(i / 5) % 5 - 2, 0.5); // jägare runt om gruppen
    const efter = grupperOf(s).find(g => g.id === g0.id)!.n;
    let ny: { id: number; x: number; y: number; n: number } | undefined;
    for (let h = 0; h < 24 && !ny; h++) { s.now += HOUR; ny = grupperOf(s).find(g => g.id % GRUPPER_MAX === k && g.id !== g0.id); }
    const flyttad = ny ? Math.hypot(ny.x - g0.x, ny.y - g0.y) : 0;
    return [
      [`högst ${GRUPPER_MAX} grupper (som mest ${flest}), med ${STORLEK[0]}–${STORLEK[1]} kaniner i varje (${minst}–${storst})`, flest <= GRUPPER_MAX && flest >= 3 && minst >= STORLEK[0] && storst <= STORLEK[1]],
      [`ingen kanin närmare byn än ${SKYGG_IN} rutor (${naraByn} av ${kaniner})`, kaniner > 0 && naraByn === 0],
      [`kaninerna håller ihop i sin grupp (${spridda} av ${kaniner} mer än 3 rutor från gruppen)`, spridda <= kaniner * 0.02],
      [`grupperna rör sig mot bättre platser på kartan (${battre} timmar lika bra eller bättre, ${samre} sämre)`, battre > samre * 3],
      [`jakten ger mycket mer nära en grupp (${vidGrupp.toFixed(2)}) än på en rik plats långt från grupperna (${langtBort.toFixed(2)})`, tom >= 0 && vidGrupp > langtBort * 3],
      [`en jagad grupp krymper (${n0} → ${efter} kaniner)`, efter === 0 && n0 > 0],
      [`och kommer tillbaka på en ny plats (${flyttad.toFixed(0)} rutor bort, ${ny?.n ?? 0} kaniner)`, !!ny && flyttad > 5 && ny.n >= STORLEK[0]],
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
    for (const seed of [5, 6, 7, 8]) { // fyra byar, så att slumpen inte avgör
    const s = createState(seed, START), gang = new Map<number, number>(), sett = new WeakSet<object>();
    s.kal = nyKalender(s.now, 2); // sommar
    setFood(s, 40); setAmount(s, 'ved', 40); // gott ställt, tid över
    kor(s, 4 * 24, s => {
      for (const p of living(s)) {
        const t = p.task;
        if (t?.phase !== 'do') continue;
        const c = campCenter(s), ny = !sett.has(t); sett.add(t); // varje promenad, bad och stund vid stranden räknas en gång
        if (t.act === 'promenad') { if (ny) prom++; gang.set(p.id, Math.max(gang.get(p.id) ?? 0, Math.hypot(t.tx - c.x - 0.5, t.ty - c.y - 0.5))); }
        if (t.act === 'bada') { if (ny) bad++; if (temperature(s) < 14) badVarmt = false; }
        if (t.act === 'strand') { if (ny) strand++; if (getMap(s.seed).tiles[Math.floor(p.y) * W + Math.floor(p.x)] === T.Vatten) strandLand = false; }
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
      [`folk tar promenader (${prom} promenader, upp till ${n} personer i en by)`, prom > 5 && n >= 3],
      [`nyfikna och modiga går längre (${hog.toFixed(1)} mot ${lag.toFixed(1)} rutor)`, hog > lag],
      [`folk badar på sommaren (${bad} bad)`, bad >= 2],
      ['man badar bara när det är varmt', badVarmt],
      [`folk sitter vid stranden (${strand} gånger)`, strand >= 2],
      ['den som sitter vid stranden sitter på land', strandLand],
    ];
  },
};

SCENARIER.rotter = {
  text: 'Bär och rötter är olika slag i egna stackar; på sommaren samlar man mest bär, i istiden mest rötter',
  kor: () => {
    const andel = (vecka: number) => {
      const s = createState(7, START);
      s.kal = nyKalender(s.now, (vecka + 1) % 4);
      setMat(s, { kott: 300 }); // kött äts före bär och rötter, så det man samlar blir kvar
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
    setFood(s, 230); setAmount(s, 'ved', 90); setAmount(s, 'grenar', 70); setAmount(s, 'flinta', 3); // mycket på en gång
    kor(s, 18);
    const z = zoneOf(s), ps = pilesOf(s), stor = z.w * z.h;
    const summaOk = Object.keys(STACK).every(k => Math.abs(ps.filter(p => p.k === k).reduce((a, p) => a + p.n, 0) - amountOf(s, k)) < 1e-6);
    // bära: kör en stund med gående invånare och se hur mycket de bär hem
    const b = createState(8, START);
    b.now = new Date(b.now).setHours(7, 0, 0, 0); setFood(b, 2); // morgon, och byn behöver mat
    Object.assign(b.fire, { lit: true, fuel: 4 }); // elden brinner, annars avbryts allt för att tända den
    let hem = 0, maxKvot = 0, fullt = 0;
    for (let i = 0; i < 8 * 3600 / 2; i++) {
      step(b, 2);
      // en kanin bärs hem hel, en i taget, hur stark man än är
      for (const p of living(b)) if (p.task?.phase === 'back' && p.task.act !== 'elda') {
        const kv = p.task.act === 'jakt' ? load(p.task) / KANIN : load(p.task) / capacity(b, p); hem++; maxKvot = Math.max(maxKvot, kv); if (kv >= 0.95) fullt++;
      }
    }
    // den som har fullt går hem med en gång, även om uppgiften inte är klar
    const v = living(b).find(p => ageOf(p, b.now) >= 18)!;
    v.task = { act: 'samla', phase: 'do', tx: v.x, ty: v.y, until: b.now + 3 * HOUR, carry: capacity(b, v) * STACK.bar, why: 'test', dark: false };
    const mat0 = foodOf(b);
    step(b, 2); step(b, 2);
    const gickHem = v.task?.phase === 'back' || foodOf(b) > mat0 + 10;
    const stark = living(b).slice().sort((x, y) => stat(y, 'styrka', b.now) - stat(x, 'styrka', b.now));
    // tomt lager krymper
    setFood(s, 5); setAmount(s, 'ved', 0); setItems(s, { flinta: 1 });
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
    const setup = (b: State) => { setMat(b, { fisk: 20, bar: 20 }); setAmount(b, 'ved', 25); setItems(b, { grenar: 50, yxa: 1 }); };
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
    setFood(m, 200); pilesOf(m); for (const st of m.stackar!) st.c = 0.08;
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
    for (let i = 0; i < 3 * 3600 / 2 && !isLight(n.now); i++) step(n, 2);
    const kvarNara = ute().some(g => g.x === nara!.x && g.y === nara!.y), kvarLangt = ute().some(g => g.x === langt!.x && g.y === langt!.y);
    n.now = new Date(n.now).setHours(9, 0, 0, 0);
    for (let i = 0; i < 6 * 3600 / 2 && ute().length; i++) step(n, 2);
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
    setFood(s, 600); setAmount(s, 'ved', 200); setAmount(s, 'grenar', 400); setAmount(s, 'flinta', 1); s.fire.ring = true; // byn kan tända sin eld och har tid att sortera
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
  text: 'Man bär hem efter en stunds arbete och går tillbaka till samma plats, bär aldrig för tungt, håller sig nära platsen och går aldrig i vattnet. Bärplockning ger lika mycket som förut',
  kor: () => {
    const s = createState(5, START);
    s.now = new Date(s.now).setHours(10, 0, 0, 0); // mitt på dagen, så att ingen går hem för att det blir mörkt
    setAmount(s, 'ved', 20); Object.assign(s.fire, { lit: true, fuel: 0.5, ring: true }); // tänd eld och ved i förrådet, så att någon matar elden
    const m = getMap(s.seed);
    const rad: Record<string, number> = { samla: 2, jakt: 3, promenad: 4 };
    let utanfor = 0, vatten = 0, tungt = 0, eldMax = 0, arbete = 0;
    let prov: Person[] = [];
    spar.pa = true; spar.v = new WeakMap(); // vägen folk går spelas in som i spelet, så att hela vägen kan kontrolleras
    const vatt = (x: number, y: number) => m.tiles[Math.floor(y) * W + Math.floor(x)] === T.Vatten;
    for (let i = 0; i < 10 * 3600 / BEAT; i++) {
      step(s, BEAT);
      // en jägare, en som promenerar och en bärplockare, så att alla syns i provet. Den som avbryts (t.ex. för ett samtal) får uppgiften igen
      if (i === 12) prov = living(s).filter(p => ageOf(p, s.now) >= 16).slice(0, 3);
      if (i >= 12 && i < 12 * 7) {
        const c = campCenter(s), akt = ['jakt', 'promenad', 'samla'] as const;
        prov.forEach((p, j) => {
          if (p.task?.act === akt[j] || p.died !== undefined) return;
          let x = 0, y = 0;
          for (let r = 7; r < 30; r++) { x = c.x + 0.5 + (j === 1 ? -r : r); y = c.y + 0.5 + (j === 2 ? -r : r) * 0.3; if (!vatt(x, y)) break; }
          if (j === 0) { // jägaren går dit det finns mest vilt
            let bast = 0;
            for (let yy = 1; yy < H - 1; yy++) for (let xx = 1; xx < W - 1; xx++) { const v = richness(s, 'jakt', xx + 0.5, yy + 0.5); if (v > bast && m.tiles[yy * W + xx] !== T.Vatten && Math.hypot(xx - c.x, yy - c.y) < 20) { bast = v; x = xx + 0.5; y = yy + 0.5; } }
          }
          p.task = { act: akt[j], phase: 'go', tx: x, ty: y, until: s.now + 3 * HOUR, carry: 0, why: 'prov', dark: !isLight(s.now) };
        });
      }
      for (const e of s.fire.log) if (e.k === 'fyll' && e.t > s.now - BEAT * 1000) eldMax = Math.max(eldMax, e.n ?? 0); // varje påfyllning i takten
      for (const p of living(s)) {
        const t = p.task, v = spar.v.get(p) ?? [];
        for (let k = 0; k < v.length; k += 3) if (vatt(v[k + 1], v[k + 2])) vatten++;
        if (t?.phase === 'back' && t.act !== 'bara' && !(t.act === 'jakt' && load(t) <= KANIN + 0.01) && load(t) > capacity(s, p) / 3 + 0.05) tungt++; // bärandet av högar och en hel kanin får ta en full famn
        if (t?.phase === 'do' && rad[t.act] && Math.hypot(p.x - t.tx, p.y - t.ty) > rad[t.act] + 0.6) utanfor++;
        if (t?.phase === 'do' && isWork(t.act)) arbete += BEAT / 3600;
      }
    }
    spar.pa = false;
    const turer = (s.stat?.turer as number) ?? 0;
    // bärplockning: vad en timme ger med gångtiden till platsen och hem
    const q = createState(5, START); let tim = 0;
    for (let i = 0; i < 24 * 3600 / BEAT; i++) { step(q, BEAT); for (const p of living(q)) if (p.task?.act === 'samla') tim += BEAT / 3600; }
    const pl = ((q.stat?.prod_samla as number) ?? 0) / Math.max(1, tim);
    return [
      [`man bär hem efter en stunds arbete och går tillbaka (${turer} turer på ${Math.round(arbete)} arbetstimmar)`, turer > 20],
      [`ingen bär mer än en tredjedel av vad hen orkar från arbetet (${tungt} för tunga)`, tungt === 0],
      [`man håller sig nära platsen (${utanfor} gånger utanför)`, utanfor === 0],
      [`ingen går ut i vattnet, längs hela vägen (${vatten} punkter i vattnet)`, vatten === 0],
      [`elden matas med en famn i taget (högst ${eldMax.toFixed(1)})`, eldMax > 0 && eldMax <= 1 + 1e-9],
      // med bärsnåren (v24) ger en timmes bärplockning med gångtiden runt 0,3
      [`bärplockning ger ungefär lika mycket per timme som förut (${pl.toFixed(2)})`, pl > 0.15 && pl < 0.45],
    ];
  },
};

SCENARIER.teknik = {
  lang: true,
  text: 'Ingen kan göra yxa, spjut eller korg från början: den som arbetar kommer på det (nyfikna och intelligenta fortare), lär ut det i samtal, och kunskapen dör med den sista som kan den',
  kor: () => {
    const s = createState(3, START);
    const forst: Record<string, number> = {};
    let yxaInnan = false, korgInnan = false;
    const kanFran = TEKNIK.every(t => !s.people.some(p => knows(p, t.id)));
    kor(s, 20 * 24, s => {
      for (const t of TEKNIK) if (forst[t.id] === undefined && living(s).some(p => knows(p, t.id))) forst[t.id] = (s.now - s.founded) / DAY;
      if ((amountOf(s, 'yxa')) > 0 && forst.yxa === undefined) yxaInnan = true;
      if ((amountOf(s, 'korg')) > 0 && forst.korg === undefined) korgInnan = true;
    });
    const kan = (id: string) => living(s).filter(p => knows(p, id)).length;
    // nyfikna och intelligenta kommer på det fortare
    const q = createState(4, START), [a, b] = living(q).filter(p => ageOf(p, q.now) >= 20);
    a.pot.nyfikenhet = a.pot.intelligens = 16; b.pot.nyfikenhet = b.pot.intelligens = 6; a.tek = {}; b.tek = {};
    setAmount(q, 'torrgras', 10);
    thinkWhileWorking(q, a, 'samla', 3600); thinkWhileWorking(q, b, 'samla', 3600);
    const snabb = (a.tek.korg ?? 0) > (b.tek.korg ?? 0) * 3;
    // utan material kommer man inte på något
    const c = living(q).filter(p => ageOf(p, q.now) >= 20)[2]; c.tek = {}; setAmount(q, 'flinta', 0); setAmount(q, 'yxa', 0);
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
    const kan = (s: State) => { for (const p of living(s)) if (ageOf(p, s.now) >= 14) Object.assign((p.tek ??= {}), { yxa: 1, timmervagg: 1 }); setAmount(s, 'yxa', 2); };
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
    const k = structuredClone(q); k.now = ageStart(k, 0) + 3 * HOUR; k.fire.lit = false; k.fire.fuel = 0;
    let varmInne = 0, varmUte = 0, ni = 0, nu = 0;
    const b2 = beds(k);
    living(k).forEach((p, i) => { p.warm = 0.8; if (i < 3 && b2[i] !== undefined) { p.x = b2[i] % W + 0.5; p.y = Math.floor(b2[i] / W) + 0.5; } });
    const fore = new Map(living(k).map(p => [p.id, { inne: !!roomAt(k, p.x, p.y), ute: heatAt(k, p.x, p.y) < 0.05 }]));
    step(k, 120);
    for (const p of living(k)) { const f = fore.get(p.id); if (!f) continue; if (f.inne) { varmInne += p.warm; ni++; } else if (f.ute) { varmUte += p.warm; nu++; } }
    const h = housesOf(q)[0], folk = living(q).length, b = beds(q).length;
    const iVagg = living(q).filter(p => isWall(q, p.x, p.y)).length;
    // huset minns var materialet kom ifrån (steg 1.3.3): lika mycket som det byggdes med
    const lagt = bitsOf(q).filter(b => b.hus === h?.id).reduce((n, b) => n + b.mat, 0), kom = h ? komOf(h) : [];
    const minns = kom.reduce((n, x) => n + x.n, 0), satt = [...new Set(kom.map(x => x.hur))].join(', ');
    // nötning: väggarna slits och lagas
    for (const b of bitsOf(q)) if (b.k === 'vagg') b.c = 0.3;
    addTo(q, 'ved', 100);
    addTo(q, 'rotter', 150); // mat i förrådet, så att de fyra vuxna inte måste skaffa mat först
    kor(q, 24);
    const lagat = (q.stat?.lagat ?? 0) > 0;
    return [
      ['ett slutet rum med väggar räknas som under tak', !!rum && rum.tiles.length === 4],
      [`vägen går runt väggarna (${path.length} steg)`, path.length > 0 && !genomVagg],
      [`rummet håller värmen men öppningen läcker (${iso.toFixed(2)})`, iso > 0.2 && iso < 0.55],
      ['en helt sliten vägg rasar och rummet är inte längre under tak', rasat],
      [`byn bygger ${h?.namn ?? 'inget hus'} (${h ? `${h.w}×${h.h}` : '-'}, ${b} sovplatser för ${folk})`, !!h?.klar && b > 0],
      [`folk sover inne när huset är klart (${inne} av ${sov})`, sov > 0 && inne > sov * 0.5],
      [`en kall natt utan eld är de som är inne varmare (${(varmInne / (ni || 1)).toFixed(2)} mot ${(varmUte / (nu || 1)).toFixed(2)})`, ni > 0 && nu > 0 && varmInne / ni > varmUte / nu],
      [`ingen står i en vägg (${iVagg})`, iVagg === 0],
      [`träden där huset ska stå fälls innan väggarna byggs där (${trad} träd på platsen, ${iTrad} väggar byggda på ett träd)`, trad >= 0 && iTrad === 0 && !!h && bitsOf(q).every(b => b.hus !== h.id || !treeOn(q, b))],
      [`huset står en bit från elden (${avst.toFixed(1)} rutor)`, avst >= 4],
      ['slitna väggar lagas', lagat],
      [`huset minns var materialet kom ifrån (${Math.round(minns)} av ${Math.round(lagt)}: ${satt})`, lagt > 0 && Math.abs(minns - lagt) < 0.01 * lagt + 0.01],
    ];
  },
};

SCENARIER.varmekarta = {
  text: 'Värmekartorna: bär i små snår som står kvar, svamp i skogen, rötter glest överallt även på vintern, kaniner helst i gräs och borta från folk, fisk i vattnet och flinta vid stenarna. Inget växer i lägret, mönstren kryper med tiden, uttag tömmer platsen som växer tillbaka, och den som ser en plockad plats vet att den växer tillbaka',
  kor: () => {
    const s = createState(21, START), g = groundOf(s), m = getMap(s.seed);
    const vid = (ai: number) => { s.now = ageStart(s, ai) + HOUR; };
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
    for (let i = 0; i < W * H; i++) if (land(i)) { const d = campDist(s, i % W, Math.floor(i / W)); if (d >= LAGER_R && d < SKYGG_IN) { nara += sk0[i]; naraN++; } else if (d > SKYGG_IN + SKYGG_R) { langt += sk0[i]; langtN++; } }
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
      const nu = s.now, t0 = ageStart(s, 2) + 3 * DAY, fore: boolean[] = []; // mitt i sommaren, så att 28 dygn senare är sommar igen
      s.now = t0;
      for (let i = 0; i < W * H; i++) fore.push(vaxerAt(s, k, i) > grans);
      s.now = t0 + dygn * DAY;
      let same = 0, n = 0;
      for (let i = 0; i < W * H; i++) if (fore[i]) { n++; if (vaxerAt(s, k, i) > grans) same++; }
      s.now = nu;
      return n ? same / n : 0;
    };
    const barKvar = kvar('bar', 28, 1), kaninKvar = kvar('jakt', 28, 0.6 * JAKT_F), barSenare = kvar('bar', 280, 1);
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

SCENARIER.delning = {
  text: 'Delning: ju fattigare byn är, desto mer av det folk skaffar ger de till byn. Byns rikedom avgör ensamt hur mycket',
  kor: () => {
    const s = createState(5, START), p = living(s)[0];
    const egetAv = (n: number) => { const f = ownsAmount(s, p, 'bar'); gain(s, p, 'bar', n); return ownsAmount(s, p, 'bar') - f; };
    const ny = s.delning!, nyEgen = egetAv(10);
    // halvrik: hälften av gränsen
    setAmount(s, 'ved', 0); setAmount(s, 'ved', (DELA_RIK / 2 - rikedom(s)) / grundvarde('ved')); stepDelning(s);
    const halv = s.delning!, halvEgen = egetAv(10);
    // rik
    setAmount(s, 'ved', amountOf(s, 'ved') + DELA_RIK / grundvarde('ved')); stepDelning(s);
    const rik = s.delning!, rikEgen = egetAv(10);
    // fattig igen
    setAmount(s, 'ved', 0); setFood(s, 0); stepDelning(s);
    const igen = s.delning!;
    return [
      [`en ny by är fattig (rikedom ${ny.rik.toFixed(0)}) och ger det mesta till byn (${nyEgen.toFixed(1)} av 10 eget)`, ny.andel > 0.75 && Math.abs(nyEgen - 10 * (1 - ny.andel)) < 0.01],
      [`halvvägs till gränsen ${DELA_RIK} ges hälften (andel ${halv.andel.toFixed(2)}, ${halvEgen.toFixed(1)} av 10 eget)`, Math.abs(halv.andel - 0.5) < 0.02 && Math.abs(halvEgen - 5) < 0.3],
      [`en rik by (rikedom ${rik.rik.toFixed(0)}) ger inget (${rikEgen.toFixed(1)} av 10 eget)`, rik.andel === 0 && Math.abs(rikEgen - 10) < 0.01],
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
      setMat(s, {}); setStock(s, { ved: 0, grenar: 0, flinta: 0, torrgras: 0 }); s.ting = [];
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
    die(s, d, 'test');
    const partner = Math.abs(varde(s, a) - dVarde) < 1e-6 && varde(s, b) === 0 && yxor(s, a) === 1;
    const syns = s.log.some(l => l.text.startsWith(`${a.name} ärvde`) && l.text.includes('flintyxa') && l.text.includes(d.name));
    // inget partner: barnen delar jämnt efter värde (yxan till den ena, maten och träet till den andra)
    ({ s, d, a, b, c, e } = ny());
    a.mother = d.id; b.father = d.id;
    die(s, d, 'test');
    const va = varde(s, a), vb = varde(s, b), barnen = Math.abs(va - vb) < 1e-6 && yxor(s, a) + yxor(s, b) === 1 && varde(s, c) === 0;
    // föräldrarna, sedan syskonen, sedan byn
    ({ s, d, a, b, c, e } = ny());
    d.mother = a.id; b.mother = a.id; die(s, d, 'test');
    const foraldrar = varde(s, a) > 0 && varde(s, b) === 0;
    ({ s, d, a, b, c, e } = ny());
    d.mother = 999; b.mother = 999; die(s, d, 'test');
    const syskon = Math.abs(varde(s, b) - dVarde) < 1e-6;
    ({ s, d, a, b, c, e } = ny());
    die(s, d, 'test');
    tidyTools(s); // som i varje steg: den dödas redskap blir byns
    const byn = [a, b, c, e].every(q => varde(s, q) === 0) && tingOf(s).filter(t => t.k === 'yxa' && t.agare === BYN).length === 1 && amountOf(s, 'ved') > 29;
    // den som flyttar tar med sig det hen orkar bära, det mest värda för vikten först; resten blir byns
    ({ s, d, a, b, c, e } = ny());
    const bar = capacity(s, d), fore = amountOf(s, 'ved') + amountOf(s, 'bar');
    d.left = s.now; packUp(s, d); releaseOwner(s, d.id);
    const tog = fore - amountOf(s, 'ved') - amountOf(s, 'bar') + (tingOf(s).some(t => t.k === 'yxa') ? 0 : 1);
    const flytt = tog > 0 && tog <= bar * 25 + 1 && amountOf(s, 'ved') + amountOf(s, 'bar') > 0 && ownedSum(s, 'ved') === 0;
    // viljan att ge
    ({ s, d, a, b, c, e } = ny());
    getRel(s, a, b).op = 60; d.mother = a.id; a.partner = c.id; c.partner = a.id;
    s.delning = { rik: 0, andel: 1 };
    const lite = willing(s, a, b, 1), mycket = willing(s, a, b, 3);
    s.seder.v.gemenskap = 1; const gem = willing(s, a, b, 1); s.seder.v.gemenskap = -1; const egen = willing(s, a, b, 1); s.seder.v.gemenskap = 0;
    s.delning = { rik: DELA_RIK, andel: 0 }; const rikVan = willing(s, a, b, 1), rikBarn = willing(s, a, d, 1), rikPartner = willing(s, a, c, 1);
    s.delning = { rik: 0, andel: 1 }; const fattigBarn = willing(s, a, d, 1), fattigPartner = willing(s, a, c, 1);
    return [
      ['partnern ärver allt', partner],
      ['det syns i loggen vem som ärvde vad', syns],
      [`utan partner delar barnen jämnt efter värde (${va.toFixed(0)} och ${vb.toFixed(0)})`, barnen],
      ['utan partner och barn ärver föräldrarna', foraldrar],
      ['sedan syskonen', syskon],
      ['utan släkt blir allt byns', byn],
      [`den som flyttar tar med sig det hen orkar bära (${tog.toFixed(1)}), resten blir byns`, flytt],
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
    setMat(s, {}); setStock(s, { ved: 0, grenar: 0, flinta: 0, torrgras: 0 }); s.ting = [];
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
      [`allt som går att skaffa har ett värde, och det som inte syns har inget`, ['bar', 'rotter', 'kott', 'fisk', 'svamp', 'ved', 'grenar', 'torrgras', 'kol', 'flinta', 'yxa', 'sten', 'vilt', 'kniv', 'skinn', 'ben', 'rep', 'metspo', 'korg'].every(k => v(k) > 0 && isFinite(v(k))) && v('giftsvamp') === 0],
      [`tio trä i förrådet gör byn ${tra.toFixed(1)} rikare`, Math.abs(tra - 10 * v('ved')) < 1e-6],
      [`en yxa räknas efter sitt skick (${yxa.toFixed(0)} ny, ${halv.toFixed(0)} halvsliten)`, Math.abs(yxa - v('yxa')) < 1e-6 && Math.abs(halv - v('yxa') / 2) < 1e-6],
      [`en timmervägg räknas efter material och arbete (${hus.toFixed(1)})`, Math.abs(hus - (2 * v('ved') + 0.8)) < 1e-6],
    ];
  },
};

// Utan namn körs alla scenarier samtidigt, vart och ett i en egen process. Med ett namn körs bara det, här.
// Med --snabb körs bara de som inte är långa, och dessutom de som nämns efter: --snabb delning arv
const arg = process.argv.slice(2), snabb = arg[0] === '--snabb', val = snabb ? undefined : arg[0];
if (val) {
  const sc = SCENARIER[val];
  if (!sc) { console.log(`Okänt scenario: ${val}. Finns: ${Object.keys(SCENARIER).join(', ')}`); process.exit(1); }
  const t0 = Date.now(), k = sc.kor(), ok = k.every(([, b]) => b);
  console.log(`${ok ? 'OK  ' : 'FEL '} ${val} (${((Date.now() - t0) / 1000).toFixed(0)} s): ${sc.text}`);
  for (const [t, b] of k) if (!ok || !b || process.env.ALLA) console.log(`     ${b ? '✓' : '✗'} ${t}`);
  if (!ok) process.exitCode = 1;
} else {
  const okanda = arg.slice(1).filter(n => !SCENARIER[n]);
  if (okanda.length) { console.log(`Okänt scenario: ${okanda.join(', ')}. Finns: ${Object.keys(SCENARIER).join(', ')}`); process.exit(1); }
  const namn = Object.keys(SCENARIER).filter(n => !snabb || !SCENARIER[n]!.lang || arg.includes(n));
  // de långa startas först, så att alla blir klara ungefär samtidigt; utskriften kommer ändå i vanlig ordning
  const ordning = [...namn.filter(n => SCENARIER[n]!.lang), ...namn.filter(n => !SCENARIER[n]!.lang)];
  const svar: Record<string, Utfall> = {};
  await pool(ordning.map(n => async () => { svar[n] = await korSkript('scenario.ts', [n]); }));
  let fel = 0;
  for (const n of namn) {
    const u = svar[n];
    if (u.code) fel++;
    process.stdout.write(u.out || `FEL  ${n}: kraschade\n${u.err.slice(-1500)}\n`);
  }
  const hoppade = Object.keys(SCENARIER).filter(n => !namn.includes(n));
  if (hoppade.length) console.log(`(hoppade över de långa: ${hoppade.join(', ')})`);
  if (fel) { console.log(`${fel} scenario misslyckades.`); process.exitCode = 1; }
}
