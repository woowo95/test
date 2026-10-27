// Scenarier. Grunden: gläntan, yxan, vintern, knapphet, svamp och flinta, kunskap, temperatur och kalender.
import { createState, step, living, temperature, coldOf, ageIndex, ageStart, kalender, yearNo, AGES, amountOf, groundOf, getMap, DAY, HOUR, W, tileOf, kn, fearPlace, findL, areaOf, describe, migrate, forget, stat, campDist, angOf, setAmount, BEAT, tingOf, eatPoison, HOST } from '../../sim';
import { BAR, FOREST, HIGH, isSoil } from '../../sim/vag';
import { START } from '../kor';
import { setMat, Koll, kor, tandEld, logg, skogsandel, uttag, STOCKHOLM, SCENARIER } from './hjalp';

SCENARIER.glanta = {
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
};

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
    const s = createState(13, START);
    setAmount(s, 'yxa', 1);
    tandEld(s); // elden brinner: annars hänger provet på när flintan råkar lyckas (ungefär vart femtionde försök)
    s.byggSok = Infinity; // inget hus: träden på en husplats fälls för bygget, inte för ved
    const fallda = new Set<number>();
    let ved = 0;
    kor(s, 10 * 24, s => { ved = Math.max(ved, amountOf(s, 'ved')); for (const k of s.stockar ?? []) fallda.add(tileOf(k.x, k.y)); });
    const g = groundOf(s);
    // inne i lägret trampas marken där träden stod till jord, så räkna bara utanför
    const ute = [...fallda].filter(i => campDist(s, i % W, Math.floor(i / W)) >= 1);
    // gräs, inte bar jord: de som går förbi med trä trampar ner det högsta gräset (stigar, vag.ts)
    let gras = 0; for (const i of ute) if (g.trees[i] < FOREST && g.cover[i] >= BAR) gras++;
    return [
      ['träd har fällts', (s.fallda ?? 0) >= 3],
      ['ved har huggits', ved > 0],
      [`gräs där träden stod utanför lägret, minst hälften (${gras} av ${ute.length})`, ute.length >= 3 && gras >= ute.length / 2],
      ['stammarna huggs upp (högst 2 liggande)', (s.stockar ?? []).length <= 2]];
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
    const s = createState(16, START); // by 15 svälter ut sedan toa-smutsen kom (steg 2.7.2); det balanseras i 2.12
    // mät varje dygn: buskarna växer tillbaka, så ett enda mått i slutet beror på slumpen
    let nara = 0, langt = 0;
    for (let d = 0; d < 12; d++) { kor(s, 24); const n = uttag(s, 'samla', 0, 8); if (n > nara) { nara = n; langt = uttag(s, 'samla', 16, 30); } }
    const st = s.stat ?? {};
    return [
      [`mer plockat nära byn än långt bort (${nara.toFixed(3)} mot ${langt.toFixed(3)})`, nara > 0.005 && nara > langt * 3],
      // kaninerna håller sig undan folk, så inom 12 rutor jagas nästan inget (ca 0,001). Inom 30 rutor ca 0,02–0,03 (v47)
      [`vilt jagat inom 30 rutor från byn (${uttag(s, 'jakt', 0, 30).toFixed(3)}, ${st.kaniner ?? 0} kaniner)`, uttag(s, 'jakt', 0, 30) > 0.01],
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
