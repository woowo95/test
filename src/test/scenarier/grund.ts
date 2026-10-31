// Scenarier. Grunden: gläntan, yxan, vintern, knapphet, svamp och flinta, kunskap, temperatur och kalender.
import { createState, growGround, step, living, temperature, coldOf, ageIndex, ageStart, kalender, yearNo, AGES, amountOf, groundOf, getMap, DAY, HOUR, W, tileOf, kn, fearPlace, findL, areaOf, describe, migrate, forget, stat, campDist, angOf, setAmount, BEAT, tingOf, eatPoison, HOST, vaderNu, VADER, VADERLAGE, VaderId, blotSteg, varmeDelar, stepVader, vaxtFaktor, stepFire, hearthOf, cloneState, wearMult, vaderSlit, NEW_W, NEW_H, allaTider, tiderUtanfor, skaRojas } from '../../sim';
import { BAR, FOREST, HIGH, isSoil } from '../../sim/vag';
import { T } from '../../sim/typer';
import * as SIM from '../../sim';
import type { Person, State } from '../../sim';
import { nyKalender } from '../../sim';
import { START } from '../kor';
import { setMat, Koll, kor, tandEld, logg, skogsandel, uttag, STOCKHOLM, SCENARIER, nyInvanare, klockan, medHus } from './hjalp';

SCENARIER.glanta = {
  text: 'Ny by: fem personer utan eld i en liten glänta på en större karta, skog och ängar med högt gräs står runt omkring och marken nöts till stigar',
  kor: () => {
    const s = createState(11, START), a = angOf(s.seed), g0 = groundOf(s);
    let jord = 0, angar = 0; for (let i = 0; i < a.length; i++) if (isSoil(g0.tiles[i])) { jord++; angar += a[i]; }
    const ang = angar / jord;
    const forst: Koll[] = [
      [`en liten koloni: ${s.people.length} personer, ingen eld`, s.people.length === 5 && !s.fire.lit],
      [`större karta (${s.W}×${s.H})`, s.W === NEW_W && s.H === NEW_H],
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
    kor(s, 30 * 24, s => { if (amountOf(s, 'flinta') > 1) setAmount(s, 'flinta', 1); if (tingOf(s).some(t => t.halv?.gor === 'yxa')) s.ting = tingOf(s).filter(t => t.halv?.gor !== 'yxa'); });
    return [
      ['ingen yxa', !(amountOf(s, 'yxa'))],
      ['inga träd fällda', !(s.fallda ?? 0)],
      ['ingen ved, bara grenar', amountOf(s, 'ved') === 0 && (amountOf(s, 'grenar')) > 0],
      ['ingen dog av kyla', !s.people.some(p => p.cause === 'av kyla')],
      ['byn lever', living(s).length > 0]];
  },
};

SCENARIER.yxa = {
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
    // inne i lägret trampas marken där träden stod till jord, så räkna bara utanför
    const ute = [...fallda].filter(i => campDist(s, i % W, Math.floor(i / W)) >= 1);
    // gräs, inte bar jord: de som går förbi med trä trampar ner det högsta gräset (stigar, vag.ts)
    let gras = 0; for (const i of ute) if (g.trees[i] < FOREST && g.cover[i] >= BAR) gras++;
    return [
      ['träd har fällts', (s.fallda ?? 0) >= 3],
      ['ved har huggits', ved > 0],
      [`gräs där träden stod utanför lägret, minst hälften (${gras} av ${ute.length})`, ute.length >= 3 && gras >= ute.length / 2],
      [`stammarna huggs upp (högst 2 liggande utanför lagret i skogen: ${liggande})`, liggande <= 2]];
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
  text: 'Bär, rötter och vilt tar slut nära byn för en tid, så invånarna går längre bort; fiske med händerna ger få fiskar per försök',
  kor: () => {
    const s = createState(23, START); // by 15 svälter ut sedan toa-smutsen kom (steg 2.7.2), by 16 och 17 sedan kartan blev 120 × 120 (2.10.9), by 18 sedan stigarna ligger kvar längre (2.10.15) och by 22 och 26 sedan tiderna följer riktlinjen (2.12.8); det balanseras i 2.12
    // mät varje dygn: buskarna växer tillbaka, så ett enda mått i slutet beror på slumpen
    let nara = 0, langt = 0;
    for (let d = 0; d < 12; d++) { kor(s, 24); const n = uttag(s, 'samla', 0, 8); if (n > nara) { nara = n; langt = uttag(s, 'samla', 16, 30); } }
    const st = s.stat ?? {};
    return [
      // sedan samlandet går fortare (steg 2.12.4, v132) töms buskarna nära byn snabbt och man plockar mer långt bort än förut
      [`mer plockat nära byn än långt bort (${nara.toFixed(3)} mot ${langt.toFixed(3)})`, nara > 0.005 && nara > langt],
      // kaninerna håller sig undan folk, så inom 12 rutor jagas nästan inget (ca 0,001). Inom 30 rutor ca 0,02–0,03 (v47), och
      // ca 0,01 sedan fälten blev större (steg 3.10.23, by 23–28)
      [`vilt jagat inom 30 rutor från byn (${uttag(s, 'jakt', 0, 30).toFixed(3)}, ${st.kaniner ?? 0} kaniner)`, uttag(s, 'jakt', 0, 30) > 0.005],
      // fiske väljs inte i alla byar; fisket testas utförligt i fiskespjut-scenariot
      [`fiske: ${st.fiskeForsok ?? 0} försök, ${st.fiskeNapp ?? 0} napp, ${st.fisk ?? 0} fiskar`, !st.fiskeForsok || ((st.fiskeForsok ?? 0) > (st.fiskeNapp ?? 0) && (st.fiskeNapp ?? 0) >= (st.fisk ?? 0))],
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
    const vuxna = living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), c = SIM.campCenter(s), g = getMap(s.seed).tiles;
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
    const vattnat = s.stat?.vattnat ?? 0, vissnat = s.stat?.vissnat ?? 0;
    // ingen står i vattnet, och den torra sjöbotten går att gå på
    const iVattnet = living(s).filter(p => SIM.iVattnetNu(s, Math.floor(p.y) * W + Math.floor(p.x))).length;
    const gar = SIM.GANG.fartMark[T.Lera] > 0;
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
      [`alla hittar vatten att dricka (${utanVatten} utan) och ingen dör av törst (${torstDoda})`, utanVatten === 0 && torstDoda === 0],
      [`ägaren med säck vattnar sitt fält (${vattnat} säckar), grödan på det andra vissnar (${vissnat})`, vattnat > 0 && vissnat === 1],
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
    const { land } = SIM.djupOf(s.seed), g = getMap(s.seed).tiles, c = SIM.campCenter(s);
    const strand: { x: number; y: number }[] = [];
    for (let i = 0; i < W * W; i++) if (land[i] === 1 && g[i] !== T.Sten) strand.push({ x: i % W, y: Math.floor(i / W) });
    strand.sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y));
    const [pb, pg, ps] = [strand[0], strand.find(p => Math.hypot(p.x - strand[0].x, p.y - strand[0].y) >= 3)!, strand.find(p => Math.hypot(p.x - strand[0].x, p.y - strand[0].y) >= 6)!];
    s.stackar!.push({ k: 'rotter', n: 30, c: 1, x: pb.x, y: pb.y }, { k: 'grenar', n: 8, c: 1, x: pg.x, y: pg.y }, { k: 'sten', n: 3, c: 1, x: ps.x, y: ps.y });
    SIM.tidy(s);
    const pf = strand.find(p => Math.hypot(p.x - strand[0].x, p.y - strand[0].y) >= 9)!;
    s.falt = [{ id: 1, x: pf.x, y: pf.y, w: 1, dir: 1, n: 1, agare: -1, steg: 'vaxer', klara: 0, kvar: 0, sadda: 1, groda: 'arter', vuxit: 0, rord: s.now } as SIM.Falt];
    s.nextFalt = 1; s.byggV = (s.byggV ?? 0) + 1;
    const hog = (k: string, p: { x: number; y: number }) => (s.stackar ?? []).find(a => a.k === k && a.x === p.x && a.y === p.y);
    const slit0 = wearMult(s, ps.x, ps.y);
    // tills vattnet står som högst
    let hogst = 0, iVattnet = 0, slit1 = 0;
    for (let h = 0; h < 4 * 24 && !(hogst && (s.flod?.niva ?? 0) < hogst); h++) {
      kor(s, 1);
      if ((s.flod?.niva ?? 0) > hogst) { hogst = s.flod!.niva; slit1 = wearMult(s, ps.x, ps.y); }
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
    return [
      [`det regnar mer innan och medan vattnet stiger (${regn} timmar mot ${regnUtan} utan översvämningen, av 48)`, regn > regnUtan],
      [`sjön svämmar över ${hogst} rutor upp på land (${vatten0} → ${vatten1} rutor vatten)`, hogst >= 2 && vatten1 > vatten0],
      [`maten på stranden förstördes (${s.stat?.['flod mat'] ?? 0} rötter; resten bars in innan, ${barKvar} kvar av 30)`, barKvar === 0 && (s.stat?.['flod mat'] ?? 0) > 0],
      [`grenarna flöt bort (${grenKvar} kvar av 8)`, grenKvar === 0],
      [`stenen ligger kvar (${stenKvar} av 3) och slits fortare i vattnet (${slit0.toFixed(2)} → ${slit1.toFixed(2)})`, stenKvar === 3 && slit1 > slit0 * 2],
      [`ärterna på fältet under vatten dog${frost ? ` (frosten tog ${frost})` : ''}`, faltDog],
      [`ingen står i vattnet (högst ${iVattnet})`, iVattnet === 0],
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
    const { land } = SIM.djupOf(s.seed), g = getMap(s.seed).tiles, c = SIM.campCenter(s);
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
    (s.stationer ??= []).push({ id: (s.nextStation ??= 1), k: 'brasa', x: pb.x, y: pb.y, kvar: 0, eld: { fuel: 6, lit: 1 } } as SIM.Station);
    const brasa = s.stationer[s.stationer.length - 1]; s.nextStation = (s.nextStation ?? 1) + 1;
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
      if (niva && !brasa.eld?.lit) brasaUt = true;
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

SCENARIER.tornado = {
  lang: true,
  text: 'Steg 3.8.4: tornadon kommer ibland på sommaren och hösten. Den går på några timmar längs en rak bana från kartans kant till kartans kant nära byn, fäller träd till liggande stammar, river en risvägg men inte en ny timmervägg, lyfter saker som ligger ute (en del går sönder, resten hamnar några rutor från banan) och det blåser hårt. Folk ser den, ropar och går undan, ingen står i en vägg eller i vattnet, och efteråt bärs det som spridits in i lagret',
  kor: () => {
    // en by vars sommar just börjat och som får en tornado tidigt i den
    const fore = (x: State) => { x.founded -= 20 * DAY; x.kal = nyKalender(x.now - HOUR, 2); };
    let v: State | undefined;
    for (let seed = 1; seed < 2000 && !v; seed++) {
      const b = createState(seed, START); fore(b);
      const k = kalender(b);
      if (SIM.motgangVid(b, k.start, k.ai) !== 'tornado' || SIM.tornadoTid(b, k.start).fran - k.start > 30 * HOUR) continue;
      v = b;
    }
    if (!v) return [['en by med en tornado tidigt på sommaren', false]];
    const s = v, k0 = kalender(s), tid = SIM.tornadoTid(s, k0.start);
    tandEld(s); setMat(s, { bar: 40, torkat: 40 });
    kor(s, (tid.fran - s.now) / HOUR);
    const t = s.tornado;
    if (!t) return [['tornadon kom', false]];
    const kant = (x: number, y: number) => Math.min(x, y, W - x, W - y) < 0.01;
    const vind = vaderNu(s).vind;
    // punkten på banan närmast elden: där läggs en hög grenar, en risvägg och en ny timmervägg i vägen
    const e = SIM.eldPlats(s), dx = t.x1 - t.x0, dy = t.y1 - t.y0, L = Math.hypot(dx, dy);
    const ledig = (x: number, y: number) => !SIM.blocked(s, x, y) && !SIM.stationAt(s, x, y) && !(s.stackar ?? []).some(a => a.x === x && a.y === y) && !SIM.bitAt(s, x, y) && !SIM.isStored(s, x, y) && Math.hypot(x - e.x, y - e.y) > 3;
    const pa = (f: number) => { for (let d = 0; d < 30; d++) for (const sg of [1, -1]) { const u = f + sg * d / L, x = Math.floor(t.x0 + dx * u), y = Math.floor(t.y0 + dy * u); if (u > 0.05 && u < 0.95 && ledig(x, y)) return { x, y, u }; } return undefined; };
    const fe = ((e.x + 0.5 - t.x0) * dx + (e.y + 0.5 - t.y0) * dy) / (L * L);
    const ph = pa(fe), pr = ph && pa(ph.u + 4 / L), pt = pr && pa(pr.u + 4 / L);
    if (!ph || !pr || !pt) return [['platser i vägen för tornadon', false]];
    // vänta tills tornadon nästan är framme, så att ingen hinner bära in högen innan
    let vantat = 0;
    while (t.u < ph.u - 5 / L && vantat++ < 12 * 10) kor(s, 1 / 12);
    s.stackar!.push({ k: 'grenar', n: 10, c: 1, x: ph.x, y: ph.y }); SIM.tidy(s);
    const bits = SIM.bitsOf(s), id = Math.max(0, ...bits.map(b => b.id)) + 1;
    bits.push({ id, x: pr.x, y: pr.y, k: 'vagg', m: 'ris', b: 1, mat: 5, c: 1 }, { id: id + 1, x: pt.x, y: pt.y, k: 'vagg', m: 'timmer', b: 1, mat: 5, c: 1 });
    SIM.touch(s);
    const stock0 = (s.stockar ?? []).length;
    // medan tornadon drar fram: ingen i en vägg eller i vattnet, och vem som går undan
    const ris = bits.find(b => b.id === id)!, timmer = bits.find(b => b.id === id + 1)!, gs = s.stackar!.find(a => a.k === 'grenar' && a.x === ph.x && a.y === ph.y)!;
    // medan tornadon drar fram: ingen i en vägg eller i vattnet, och vem som går undan. Väggarna och högen läses när den just passerat
    let iVagg = 0, iVattnet = 0, undan = 0, risRasad = false, timmerC = 1, efter: { x: number; y: number; n: number } | undefined;
    const skadade0 = s.stat?.skador ?? 0, undanSedd = new Set<number>();
    for (let h = 0; h < 12 * 8 && s.tornado; h++) {
      kor(s, 1 / 12);
      if (ris.b < 1) risRasad = true; // byggarna börjar genast bygga upp den igen
      timmerC = Math.min(timmerC, timmer.c);
      if (!efter && t.u > ph.u + 3 / L) efter = { x: gs.x, y: gs.y, n: gs.n };
      for (const p of living(s)) {
        if (SIM.isWall(s, p.x, p.y)) iVagg++;
        if (SIM.vattenNu(s)[Math.floor(p.y) * W + Math.floor(p.x)] === T.Vatten) iVattnet++;
        if (p.task?.act === 'undan' && !undanSedd.has(p.id)) { undanSedd.add(p.id); undan++; }
      }
    }
    const avst = efter ? Math.abs(((efter.x + 0.5 - t.x0) * -dy + (efter.y + 0.5 - t.y0) * dx) / L) : -1;
    const st = s.stat ?? {};
    const skadade = (st.skador ?? 0) - skadade0;
    // efteråt bärs grenarna in
    kor(s, 24);
    const inburet = gs.n < 1e-6 || SIM.isStored(s, gs.x, gs.y);
    return [
      [`tornadon kom på sommaren (${st.motgang_tornado ?? 0}) och dess bana går från kant till kant (${t.x0.toFixed(0)},${t.y0.toFixed(0)} → ${t.x1.toFixed(0)},${t.y1.toFixed(0)})`, (st.motgang_tornado ?? 0) === 1 && kant(t.x0, t.y0) && kant(t.x1, t.y1)],
      [`det stormar medan den drar fram (blåsten ${vind.toFixed(2)})`, vind === 1],
      [`den fällde träd till liggande stammar (${st['tornado trad'] ?? 0} träd, ${stock0} → ${(s.stockar ?? []).length} stammar)`, (st['tornado trad'] ?? 0) > 0],
      [`risväggen rasade (${risRasad ? 'rasad' : 'stod kvar'}; ${st['tornado vagg'] ?? 0} väggar rivna), den nya timmerväggen stod kvar men skadades (lägst skick ${timmerC.toFixed(2)})`, risRasad && timmerC < 1 && timmerC > 0],
      [`grenarna lyftes: ${efter ? `${10 - efter.n} av 10 gick sönder och resten hamnade ${avst.toFixed(1)} rutor från banan` : 'högen låg kvar'} (${st['tornado sonder'] ?? 0} saker gick sönder i allt)`, !!efter && efter.n >= 5 && efter.n < 10 && avst >= 2.5 && avst <= 9],
      [`folk såg den och ropade (${st['tornado sedd'] ?? 0}, ${st.larm ?? 0} larm) och ${undan} gick undan`, (st['tornado sedd'] ?? 0) >= 1 && undan >= 1],
      [`nästan ingen skadades (${skadade} skador, ${st['tornado skadad'] ?? 0} av tornadon)`, (st['tornado skadad'] ?? 0) <= 1],
      [`ingen stod i en vägg (${iVagg}) eller i vattnet (${iVattnet})`, iVagg === 0 && iVattnet === 0],
      [`tornadon är borta (${s.tornado ? 'kvar' : 'borta'}) och grenarna bars in i lagret efteråt`, !s.tornado && inburet],
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
      const vat = cloneState(s), by = cloneState(s);
      const skog0 = new Set<number>(); for (let i = 0; i < W * W; i++) if (g.trees[i] >= FOREST) skog0.add(i);
      SIM.tand(s, mitt, 'blixt', 0);
      kor(s, 18, torr);
      const rutor = s.stat?.['brand ruta'] ?? 0, trad = s.stat?.['brand trad'] ?? 0;
      const brunnen = [...new Set((s.aska ?? []).map(a => a[0]))].filter(i => skog0.has(i));
      const planta = (t: number) => Math.abs(t - SIM.MARK.nyPlanta) < 1e-6, plantor = brunnen.filter(i => planta(groundOf(s).trees[i])).length;
      const askan = brunnen.length ? Math.max(...brunnen.map(i => groundOf(s).cover[i])) : 1;
      // samma ruta när marken är blöt: elden tar sig inte vidare
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
      for (; tim < 12 * 12 && by.brand; tim++) {
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
        [`gnistor från lägerelden tände marken efter ${gnistTim} timmar med torr mark`, (gn.stat?.['brand gnista'] ?? 0) >= 1],
        [`skogsbranden spred sig i torr skog (${rutor} rutor på 18 timmar, ${trad} träd dog)`, rutor >= 8 && trad >= 5],
        [`när marken är blöt tar den sig inte vidare (${vatRutor} ruta)`, vatRutor <= 2],
        [`där skogen brann står plantor (${plantor} av ${brunnen.length}) i aska (gräset högst ${askan.toFixed(2)})`, brunnen.length > 0 && plantor === brunnen.length && askan < HIGH],
        [`plantorna växer när gräset kommit tillbaka (${vuxna} av ${brunnen.length} efter ${vaxtTim} timmar sommar)`, vuxna >= brunnen.length / 2],
        [`elden nära byn sågs (${st['brand sedd'] ?? 0}) och hotade byn (${st['brand hot'] ?? 0})`, (st['brand sedd'] ?? 0) >= 1 && (st['brand hot'] ?? 0) >= 1],
        [`de vuxna släckte: ${sack} med vattensäcken (${st['brand sack'] ?? 0} säckar), ${hand} med händerna, ${st['brand slackt'] ?? 0} rutor släckta, ${st['brand skadad'] ?? 0} brännskador`, sack >= 1 && hand >= 1 && (st['brand slackt'] ?? 0) >= 1],
        [`risväggen brann (skick ${risC.toFixed(2)}${ris.b < 1 ? ', rasade' : ''})`, risC < 1],
        [`ingen stod i en vägg (${iVagg}) eller i vattnet (${iVattnet})`, iVagg === 0 && iVattnet === 0],
        [`elden slocknade efter ${(tim / 12).toFixed(1)} timmar`, !by.brand && slocknat],
        [`marken var svart (${svart0} rutor) och det svarta är borta efter ${SIM.BRAND.svart} dygn`, svart0 > 0 && !sv.aska],
      ];
    }
  },
};
