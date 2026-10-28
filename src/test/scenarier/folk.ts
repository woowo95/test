// Scenarier. Folket: befolkning, faror, seder, samtal, liv och utflyttning.
import { Person, createState, tidyTools, addTool, getRel, step, living, temperature, coldOf, emigrationRate, birthWish, immigrationRate, ageStart, amountOf, isLight, ageOf, DAY, HOUR, State, findL, areaOf, stat, hoped, gain, ownedSum, setAmount, setStock, BEAT, tingOf, planBuild, regulate, ACTS } from '../../sim';
import * as SIM from '../../sim';
import { START, STEG_DYGN } from '../kor';
import { setFood, kor, klockan, tandEld, byggare, SCENARIER, pct, grenarUte, barGrenar, nyInvanare, valjer, MATARBETE, TRAARBETE, REDSKAPSARBETE, FORBATTRING, MATMEDREDSKAP, rikBy } from './hjalp';

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
      [`en vandrare grundar byn på nytt (${s.stat?.atergrundad ?? 0} gång)`, ny >= 1 && (s.stat?.atergrundad ?? 0) >= 1],
      [`fler nybyggare kommer till den lilla byn (${inv} på tio dygn i tre byar)`, inv >= 6],
      ['en trång by vill ha färre barn, en liten fler', birthWish(40) < 0.6 && birthWish(4) > 1 && birthWish(22) === 1],
      ['trängsel får folk att flytta, mer om de är missnöjda', emigrationRate(10, 0.6) === 0 && emigrationRate(40, 0.65) > 0.2 && emigrationRate(40, 0.4) > emigrationRate(40, 0.65) * 3],
      ['humöret betyder mindre i en liten by', emigrationRate(8, 0.4) < emigrationRate(36, 0.4) / 5],
      ['att hålla nere är starkare än att höja', 1 - birthWish(46) > birthWish(0) - 1 && immigrationRate(12) === 0],
    ];
  },
};

SCENARIER.faror = {
  text: 'Faror går före förbättringar: när maten tryter väljer de vuxna mat i stället för bygge, hantverk och fritid, och när kylan är en fara (istiden, elden släckt) går tiden till trä i stället för till nya redskap och bygge. När byn svälter letas ingen flinta, och bara maten bärs in (steg 2.12.3)',
  kor: () => {
    // en by som kan bygga och göra korgar, spjut, metspön och knivar, med en planerad stuga. ai = tidsåldern (0 = istiden)
    const by = (ai?: number) => {
      const s = createState(6, START);
      if (ai !== undefined) s.now = ageStart(s, ai) + 30 * HOUR;
      klockan(s, 11); byggare(s); tandEld(s);
      for (const p of living(s)) Object.assign((p.tek ??= {}), { korg: 1, fiskespjut: 1, metspo: 1, kniv: 1 });
      setStock(s, { ved: 200, grenar: 20, torrgras: 40, flinta: 3, ben: 2, rep: 2 }); setAmount(s, 'yxa', 1); setFood(s, 200);
      planBuild(s);
      return s;
    };
    const rik = valjer(by());
    const sv = by(); setFood(sv, 0.3);
    const svFd = SIM.foodDays(sv), svalt = valjer(sv);
    // istiden: elden släckt utan glöd och nästan inget trä. Den hungriga byn har trä men elden är ändå släckt (kylan är
    // en fara), så några samlar mat, och då är det korgen som inte får göras. Samma hungriga by med elden tänd är kontrollen: där får man göra redskap
    const kall = (lit: boolean, hungrig = false, ved = 1) => {
      const s = by(0);
      if (!lit) Object.assign(s.fire, { lit: false, fuel: 0, emberUntil: undefined });
      setAmount(s, 'ved', ved);
      if (hungrig) { setFood(s, 0.3); (s.stat ??= {}).fiskeForsok = 1; } // har byn fiskat vill den ha spjut (spearsWanted i redskap.ts)
      return s;
    };
    const k0 = kall(false), kyla = { ljust: isLight(k0.now), kallt: coldOf(temperature(k0)) > 0, ...valjer(k0) };
    const kylaSvalt = valjer(kall(false, true, 200)), varmt = valjer(kall(true, true, 200));
    // korgen, spjutet, metspöet och yxan (axeTask i skog.ts) görs i withTools (val.ts) och kniven i craft: alla frågar dangers(s)
    const SKYDDADE = REDSKAPSARBETE;
    const tillv = (v: typeof rik, ks = SKYDDADE) => ks.filter(k => v.n[k]).map(k => `${k} ${v.n[k]}`).join(', ') || 'inga';
    const tillvAndel = (v: typeof rik) => v.andel(SKYDDADE);
    // den svältande byn utan flinta letar ändå inte vid stenarna, och när den svälter bärs bara maten in (steg 2.12.3)
    const utanFlinta = by(); setFood(utanFlinta, 0.3); setAmount(utanFlinta, 'flinta', 0); const svaltFlinta = valjer(utanFlinta);
    const ute = by(); setFood(ute, 0.3); const c = SIM.campCenter(ute);
    (ute.stackar ??= []).push({ k: 'grenar', n: 5, c: 1, x: Math.floor(c.x) + 9, y: Math.floor(c.y) });
    const barGren = SIM.haulJob(ute, undefined, true), barGrenRik = SIM.haulJob(ute);
    ute.stackar.push({ k: 'bar', n: 3, c: 1, x: Math.floor(c.x) - 9, y: Math.floor(c.y) });
    const barBar = SIM.haulJob(ute, undefined, true);
    return [
      [`rik by: bygge, hantverk och fritid ${pct(rik.andel(FORBATTRING))} av valen (${rik.topp})`, rik.andel(FORBATTRING) > 0.3],
      [`svältande by (mat för ${SIM.dygn(svFd)}): bygge, hantverk och fritid ${pct(svalt.andel(FORBATTRING))}, klart lägre än i den rika byn (${svalt.topp})`, svFd < 1 && svalt.andel(FORBATTRING) < rik.andel(FORBATTRING) / 3],
      [`svältande by: matarbete och redskap till maten ${pct(svalt.andel(MATMEDREDSKAP))} av valen (i den rika byn ${pct(rik.andel(MATMEDREDSKAP))})`, svalt.andel(MATMEDREDSKAP) > 0.5 && svalt.andel(MATMEDREDSKAP) > 2 * rik.andel(MATMEDREDSKAP)],
      [`istiden med elden släckt (${kyla.ljust ? 'ljust' : 'mörkt'}, ${kyla.kallt ? 'kallt' : 'inte kallt'}): trä ${pct(kyla.andel(TRAARBETE))}, bygge ${pct(kyla.andel(['bygga']))} (${kyla.topp})`, kyla.ljust && kyla.kallt && kyla.andel(TRAARBETE) > 0.4 && kyla.andel(TRAARBETE) > kyla.andel(['bygga'])],
      [`istiden med elden släckt: inga korgar, spjut, metspön, yxor eller knivar görs, inte heller när maten tryter (${tillv(kyla)}; hungrig ${tillv(kylaSvalt)}, där ${pct(kylaSvalt.andel(MATARBETE))} matarbete)`, tillvAndel(kyla) === 0 && tillvAndel(kylaSvalt) === 0 && kylaSvalt.andel(MATARBETE) > 0],
      [`kontroll: samma hungriga by med elden tänd gör redskap (${tillv(varmt)}), så provet ser dem när de väljs`, tillvAndel(varmt) > 0],
      [`när kylan är en fara byggs inget (${kyla.n.bygga ?? 0} av ${kyla.tot} val)`, !kyla.n.bygga],
      [`den svältande byn letar inte flinta vid stenarna, inte heller när den saknar flinta till elden (${svalt.sok + svaltFlinta.sok} av ${svalt.tot + svaltFlinta.tot} val)`, svalt.sok + svaltFlinta.sok === 0],
      ['när byn svälter bärs maten på marken in, men inte grenarna', !barGren && !!barGrenRik && !!barBar && barBar.x < c.x],
    ];
  },
};

SCENARIER.seder = {
  text: 'Sederna håller sig mellan -1 och 1 och rör sig mot det invånarna drar åt: en flitig by drar Arbete uppåt och får högre pliktkänsla än en lat. Yrket kommer av vanan',
  kor: () => {
    const s = createState(4, START);
    kor(s, 3 * 24);
    const inom = (q: State) => [...Object.values(q.seder.v), ...Object.values(q.seder.ev)].every(v => v >= -1 && v <= 1);
    const vuxna = (q: State) => living(q).filter(p => ageOf(p, q.now) >= SIM.ALDER.vuxen);
    // två kopior av byn där alla är flitiga (flit 20) eller lata (1). Sederna rör sig i två dygn (två år i spelet)
    const med = (flit: number) => { const q = SIM.cloneState(s); for (const p of living(q)) p.pot.flit = flit; return q; };
    const fl = med(20), la = med(1), mal = (q: State) => SIM.sederTarget(q).arbete;
    const fore = [fl, la].map(q => ({ v: q.seder.v.arbete, mal: mal(q) }));
    for (const q of [fl, la]) { SIM.stepSeder(q); q.now += 2 * DAY; SIM.stepSeder(q); }
    const narmare = [fl, la].every((q, i) => Math.abs(mal(q) - q.seder.v.arbete) < Math.abs(fore[i].mal - fore[i].v) - 0.05);
    const lang = SIM.cloneState(fl); lang.now += 40 * DAY; SIM.stepSeder(lang); // länge i ett svep: aldrig över 1
    // pliktkänslan: samma person i båda byarna, och samma by med seden Arbete på 1 och -1
    const p = vuxna(fl)[0]!, q = vuxna(la).find(x => x.id === p.id)!, pf = SIM.duty(fl, p), pl = SIM.duty(la, q);
    const sed = (v: number) => { const t = SIM.cloneState(s); t.seder.v.arbete = v; return SIM.duty(t, vuxna(t)[0]!); };
    // yrket kommer av vanan: 20 timmars jakt ger Jägare, och att fälla och hugga ger Trähuggare
    const t = SIM.cloneState(s), [j, h, ...ovriga] = vuxna(t);
    for (const x of vuxna(t)) { x.tag = undefined; x.kallad = undefined; x.habit = { samla: 6, ved: 4, vila: 2 }; }
    j.habit = { jakt: 20, samla: 2 }; h.habit = { hugga: 12, falla: 8, samla: 2 };
    SIM.updateTags(t);
    const okanda = [...SIM.TAGS.flatMap(g => g.acts).filter(a => !(a in ACTS)), ...SIM.TAGS.filter(g => !g.acts.length).map(g => g.tag)];
    return [
      [`sederna ligger mellan -1 och 1 efter tre dygn (tre år i spelet) och efter 40 dygn i ett svep`, inom(s) && inom(fl) && inom(la) && inom(lang)],
      [`en flitig by drar Arbete mot ${fore[0].mal.toFixed(2)} och en lat mot ${fore[1].mal.toFixed(2)}`, fore[0].mal > 0.5 && fore[1].mal < -0.5],
      [`efter två dygn har Arbete rört sig mot målet: flitig ${fore[0].v.toFixed(2)} → ${fl.seder.v.arbete.toFixed(2)}, lat ${fore[1].v.toFixed(2)} → ${la.seder.v.arbete.toFixed(2)}`, narmare && fl.seder.v.arbete > la.seder.v.arbete + 0.5],
      [`pliktkänslan är högre i den flitiga byn (${pf.toFixed(2)} mot ${pl.toFixed(2)}) och högre med seden Arbete (${sed(1).toFixed(2)} mot ${sed(-1).toFixed(2)}), alltid mellan ${SIM.SED.pliktMin} och ${SIM.SED.pliktMax}`,
        pf > pl && sed(1) > sed(-1) && [pf, pl, sed(1), sed(-1)].every(v => v >= SIM.SED.pliktMin && v <= SIM.SED.pliktMax)],
      [`vanan ger yrket: ${j.name} (jakt 20 timmar) kallas ${j.tag ?? 'inget'}, ${h.name} (fälla och hugga) ${h.tag ?? 'inget'}${ovriga.length ? `, de andra ${ovriga.map(x => x.tag ?? 'inget').join(', ')}` : ''}`,
        j.tag === 'Jägare' && !!j.kallad?.includes('Jägare') && h.tag === 'Trähuggare' && !ovriga.some(x => x.tag === 'Jägare' || x.tag === 'Trähuggare')],
      [`yrkena räknar bara handlingar som finns${okanda.length ? ` (okända: ${okanda.join(', ')})` : ''}`, !okanda.length],
    ];
  },
};

SCENARIER.samtal = {
  text: 'Samtalen ändrar relationerna: varje samtal räknas och fyller på umgänget, osams grälar, ett par som blivit ovänner går isär, två förälskade blir ett par, och en lärdom sprids utan att platsen räknas som nyss sedd',
  kor: () => {
    const s = createState(3, START); klockan(s, 12);
    const ny = (sex: 'm' | 'k', alder: number) => nyInvanare(s, sex, alder);
    const prata = (a: Person, b: Person, n: number) => { const ev: SIM.TalkEvent[] = []; for (let i = 0; i < n; i++) SIM.converse(s, a, [b], ev); return ev; };
    // två bekanta män pratar tio gånger
    const [a, b] = [ny('m', 25), ny('m', 30)], r1 = getRel(s, a, b);
    r1.op = 10; a.social = b.social = 0.3;
    const ev1 = prata(a, b, 10);
    // två som är osams grälar ibland (sällan sedan steg 2.12.6, så att det inte blir en spiral), och ett gräl gör dem mer osams
    const [c, d] = [ny('k', 27), ny('k', 33)], r2 = getRel(s, c, d);
    let gral = 0, gralSanker = true;
    for (let n = 0; n < 200; n++) { r2.op = -60; const ev = prata(c, d, 1); if (ev[0].kind === 'gräl') { gral++; if (r2.op >= -60) gralSanker = false; } }
    // ett par som blivit ovänner går isär
    const [e, f] = [ny('m', 28), ny('k', 26)], r3 = getRel(s, e, f);
    e.partner = f.id; f.partner = e.id; r3.op = -60;
    prata(e, f, 1);
    // två förälskade goda vänner utan partner blir ett par
    const [g, h] = [ny('m', 24), ny('k', 23)], r4 = getRel(s, g, h);
    r4.op = 80; r4.rom = 99;
    prata(g, h, 1);
    // en lärdom om en plockad plats (sedd för tio timmar sedan, hoppas växa tillbaka) berättas tills den andra kan den
    const [i, j] = [ny('k', 40), ny('m', 35)], area = areaOf(i.x, i.y), t0 = s.now - 10 * HOUR;
    i.lardomar = [{ k: 'samla', a: area, v: 0.2, g: 3, c: 1, t: t0, led: 0 }]; j.lardomar = [];
    getRel(s, i, j).op = 50;
    const l = i.lardomar[0]!, hopp0 = hoped(s, l);
    let samtal = 0;
    while (!findL(j, 'samla', area) && samtal < 300) { prata(i, j, 1); samtal++; }
    const fick = findL(j, 'samla', area);
    if (fick && (l.t !== t0 || fick.t !== t0)) console.log(`VARNING: samtal: att berätta om platsen gjorde den nyss sedd: berättarens tid flyttades ${((l.t - t0) / HOUR).toFixed(0)} timmar och hoppet om återväxt föll från ${hopp0.toFixed(2)} till ${hoped(s, l).toFixed(2)}, och den som lyssnade fick ${fick.t === t0 ? 'samma tid' : 'tiden nu'}. tell i minne.ts sätter l.t = now (samhalle-49)`);
    return [
      [`tio samtal räknas (${r1.talks}), umgänget fylls på (${a.social.toFixed(2)}) och vänskapen ändras (10 → ${r1.op.toFixed(1)}, ${ev1.filter(x => x.good).length} av 10 gick bra)`, r1.talks === 10 && ev1.length === 10 && a.social > 0.8 && b.social > 0.8 && r1.op !== 10],
      [`två som är osams grälar ibland (${gral} av 200 samtal)${gralSanker ? '' : ', men ett gräl gjorde dem inte mer osams'}`, gral >= 3 && gral <= 60 && gralSanker],
      [`ett par som blivit ovänner går isär${e.partner === undefined && f.partner === undefined ? '' : ' (de är kvar som par)'}`, e.partner === undefined && f.partner === undefined && r3.rom === SIM.SAMTAL.skiltRom],
      [`två förälskade goda vänner blir ett par${g.partner === h.id && h.partner === g.id ? '' : ' (de blev det inte)'}`, g.partner === h.id && h.partner === g.id],
      [`en lärdom sprids i ett samtal: ${j.name} kan platsen efter ${samtal} samtal${fick ? ` (${fick.led} led från källan)` : ''}`, !!fick && fick.src === i.id],
    ];
  },
};

SCENARIER.liv = {
  text: 'Födsel och åldrande: ett par får ett barn med rätt mor och far, barnets far är den hon blev gravid med, en mor som dör i barnsäng gör inget mer, och styrkan växer upp i åren och avtar på äldre dagar (att trängsel leder till flytt prövas i utflyttning)',
  // varje mor dör i barnsäng (annars 2,5 %), och paret blir gravida inom någon timme i stället för inom ett par dygn
  env: { BALANS: 'liv.barnsang=1,steg.chans=30' },
  kor: () => {
    const s = createState(9, START);
    for (const p of living(s)) p.partner = undefined; // inga andra par
    const m = nyInvanare(s, 'm', 26), w = nyInvanare(s, 'k', 24);
    m.partner = w.id; w.partner = m.id;
    let gravidMed: number | undefined, efter: string | undefined, steg = 0;
    for (; steg < 3 * STEG_DYGN && w.died === undefined; steg++) {
      step(s, BEAT);
      if (gravidMed === undefined && w.pregnantSince !== undefined) gravidMed = w.pregnantBy;
      if (w.died !== undefined) efter = w.task ? `${w.task.act} (${w.task.why ?? ''})` : '';
    }
    const barn = s.people.find(c => c.mother === w.id);
    if (efter) console.log(`VARNING: liv: ${w.name} dog i barnsäng men fick en ny uppgift i samma steg: ${efter}. Personslingan i steg.ts går vidare till taskStep efter pregnancy() utan att fråga alive (motor-2)`);
    // hon blev gravid med en, och har en annan partner när barnet föds
    const w2 = nyInvanare(s, 'k', 25), m1 = nyInvanare(s, 'm', 27), m2 = nyInvanare(s, 'm', 29);
    w2.partner = m2.id; m2.partner = w2.id; w2.pregnantSince = s.now - DAY; w2.pregnantBy = m1.id;
    SIM.birth(s, w2);
    const barn2 = s.people.find(c => c.mother === w2.id);
    if (barn2 && barn2.father !== m1.id) console.log(`VARNING: liv: barnets far blev ${barn2.father === m2.id ? 'moderns partner när barnet föddes' : `nr ${barn2.father}`} och inte den hon blev gravid med. birth i liv.ts tar partnern före pregnantBy (samhalle-54)`);
    // styrkan efter åldern: ett barn, en vuxen och en gammal (samma person)
    const st = (alder: number) => stat(m, 'styrka', m.born + alder * DAY);
    return [
      [`${w.name} blev gravid med sin partner ${m.name}`, gravidMed === m.id],
      [`ett barn föddes efter ${(steg / STEG_DYGN).toFixed(1)} dygn (år i spelet)${barn ? `: ${barn.name}, med rätt mor och far` : ''}, och byn räknade det (${s.stat?.fodda ?? 0})`, !!barn && barn.father === m.id && (s.stat?.fodda ?? 0) >= 1],
      [`modern dog i barnsäng (${w.cause ?? 'lever'}) och är inte längre bland de levande`, w.cause === 'i barnsäng' && !living(s).includes(w)],
      [`ett barn som föds medan modern har en ny partner får en mor${barn2 ? ` (${barn2.father === m1.id ? 'och den far hon blev gravid med' : 'men fel far, se VARNING'})` : ''}`, !!barn2 && barn2.mother === w2.id],
      [`styrkan växer upp i åren och avtar på äldre dagar: ${st(5).toFixed(1)} vid 5 år, ${st(30).toFixed(1)} vid 30 och ${st(75).toFixed(1)} vid 75`, st(5) < st(30) && st(75) < st(30)],
      [`åldern följer tiden: ${m.name} är ${ageOf(m, s.now).toFixed(1)} år efter ${(steg / STEG_DYGN).toFixed(1)} dygn`, Math.abs(ageOf(m, s.now) - (26 + steg / STEG_DYGN)) < 1e-6],
    ];
  },
};

SCENARIER.utflyttning = {
  text: 'Utflyttning: ur en trång och missnöjd by flyttar ett ungt par med sina barn under 14 år. De tar med sig det de orkar bära av sitt, resten blir byns, och det de bar på läggs ner. Finns inget ungt par ger sig en ensam ung vuxen av, och tar med sina barn under 14 år',
  kor: () => {
    // kolonisterna och 22 till är 50–56 år och för gamla för att flytta, ett par på 45 och 46 också. Det unga paret a och b har
    // barnen litet (5 år), mellan (8,5) och stor (15,5, vuxen). Alla tänker att det är trångt, och maten räcker länge
    const ny = () => {
      const s = createState(6, START); rikBy(s); setFood(s, 300); s.ting = [];
      for (const q of living(s)) { q.mother = q.father = q.partner = undefined; q.born = s.now - 52 * DAY; }
      for (let i = 0; i < 22; i++) nyInvanare(s, i % 2 ? 'm' : 'k', 50 + (i % 7));
      const c = nyInvanare(s, 'm', 46), d = nyInvanare(s, 'k', 45); c.partner = d.id; d.partner = c.id;
      const a = nyInvanare(s, 'm', 26), b = nyInvanare(s, 'k', 25); a.partner = b.id; b.partner = a.id;
      const barnet = (alder: number) => { const x = nyInvanare(s, alder > 10 ? 'm' : 'k', alder); x.mother = b.id; x.father = a.id; return x; };
      const litet = barnet(5), mellan = barnet(8.5), stor = barnet(15.5);
      for (const q of living(s)) SIM.think(q, 'Trångt', -0.6, s.now, 30 * DAY);
      gain(s, a, 'kott', 20); gain(s, b, 'kott', 20); gain(s, litet, 'bar', 10); addTool(s, 'kniv', a);
      barGrenar(s, a);
      return { s, a, b, c, d, litet, mellan, stor };
    };
    // regulate (befolkning.ts) som en gång i timmen i step, och tidyTools som i slutet av varje steg: det gör ett redskap som en utflyttad ägde till byns
    const flytta = (s: State) => { for (let i = 0; i < 500 && !s.stat?.utvandrade; i++) { regulate(s, 3600); tidyTools(s); s.now += HOUR; } };
    const { s, a, b, c, d, litet, mellan, stor } = ny();
    const kott0 = amountOf(s, 'kott'), grenar0 = grenarUte(s), pop0 = living(s).length;
    flytta(s);
    const grupp = [a, b, litet, mellan], kvar = living(s);
    const tog = kott0 - amountOf(s, 'kott');
    const agt = grupp.filter(q => Object.values(SIM.ownedAll(s, q.id)).some(v => v > 1e-9) || tingOf(s).some(t => t.agare === q.id)).map(q => q.name);
    if (Math.abs(grenarUte(s) - grenar0 - 2) > 1e-6) console.log(`VARNING: utflyttning: ${a.name} bar två grenar när familjen flyttade, och de försvann (${(grenarUte(s) - grenar0).toFixed(2)} grenar till på marken och i förrådet). leave i liv.ts sätter p.task = undefined utan att lägga ner bördan (samhalle-48, fynd 37)`);
    // inget ungt par: en ensam ung vuxen ger sig av
    const e = ny();
    e.a.partner = e.b.partner = undefined;
    flytta(e.s);
    const gick = e.s.people.filter(q => q.left !== undefined);
    const vuxna = gick.filter(q => ageOf(q, q.left!) >= SIM.ALDER.vuxen);
    return [
      [`byn är trång (${pop0} invånare) och missnöjd, och efter ${((s.now - START) / HOUR).toFixed(0)} timmar flyttade ${s.stat?.utvandrade ?? 0}`, (s.stat?.utvandrade ?? 0) > 0],
      [`det unga paret flyttade med sina två barn under 14 år (${grupp.filter(q => q.left !== undefined).length} av 4), och barnet på 15,5 år och det äldre paret blev kvar`, grupp.every(q => q.left !== undefined && !kvar.includes(q)) && s.stat?.utvandrade === 4 && kvar.includes(stor) && kvar.includes(c) && kvar.includes(d) && kvar.length === pop0 - 4],
      [`de som flyttade har ingen uppgift kvar`, grupp.every(q => q.task === undefined)],
      [`de tog med sig ${tog.toFixed(1)} av sitt eget kött (de ägde 40), resten blev byns${agt.length ? ` (äger fortfarande: ${agt.join(', ')})` : ''}`, tog > 0 && tog <= 40 + 1e-6 && !agt.length && ownedSum(s, 'kott') < 1e-9 && ownedSum(s, 'bar') < 1e-9],
      [`utan ungt par gav sig en ensam ung vuxen av, med sina barn under 14 år (${gick.map(q => `${q.name}, ${ageOf(q, q.left!).toFixed(1)} år`).join('; ') || 'ingen'})`, vuxna.length === 1 && vuxna[0]!.partner === undefined && ageOf(vuxna[0]!, vuxna[0]!.left!) >= 16 && ageOf(vuxna[0]!, vuxna[0]!.left!) < 40 && gick.every(q => q === vuxna[0] || SIM.isParent(vuxna[0]!, q) && ageOf(q, q.left!) < SIM.ALDER.vuxen) && e.s.stat?.utvandrade === gick.length && !living(e.s).some(q => SIM.isParent(vuxna[0]!, q) && ageOf(q, e.s.now) < SIM.ALDER.vuxen)],
    ];
  },
};

SCENARIER.personlighet = {
  text: 'Utpräglade personligheter: de flesta egenskaper är tydligt låga eller höga, balanserade personer är ovanliga, och barnen ärver egenskaperna utan att de drar mot mitten (steg 2.3.11)',
  kor: () => {
    const s = createState(1, START);
    const ps = Array.from({ length: 400 }, () => SIM.newPerson(s, 'm', s.now));
    const alla = ps.flatMap(p => SIM.STATS.map(k => p.pot[k]));
    const langtUt = (v: number) => Math.abs(v - 10) > 5;
    const utprag = alla.filter(langtUt).length / alla.length;
    const balans = ps.filter(p => SIM.STATS.every(k => Math.abs(p.pot[k] - 10) <= 4)).length / ps.length;
    // barn i tre släktled: varje par får två barn, och barnen paras med grannparets (inte med sitt syskon)
    let led = ps.slice(0, 200);
    for (let g = 0; g < 3; g++) {
      const nya: Person[] = [];
      for (let i = 0; i + 1 < led.length; i += 2) for (let b = 0; b < 2; b++) nya.push(SIM.newPerson(s, b ? 'k' : 'm', s.now, led[i], led[(i + 3) % led.length]));
      led = nya;
    }
    const barn = led.flatMap(p => SIM.STATS.map(k => p.pot[k]));
    const barnUtprag = barn.filter(langtUt).length / barn.length;
    return [
      [`${pct(utprag)} av egenskaperna är mer än 5 från mitten (förr ungefär 4 %)`, utprag > 0.45],
      [`${pct(balans)} är balanserade, med alla egenskaper inom 4 från mitten (förr ungefär en tredjedel)`, balans > 0.02 && balans < 0.15],
      [`efter tre släktled är ${pct(barnUtprag)} av barnens egenskaper mer än 5 från mitten`, barnUtprag > 0.4],
    ];
  },
};

SCENARIER.relationer = {
  text: 'Relationstyperna (steg 3.1.1): ett par som varit tillsammans i 14 dygn och är goda vänner gifter sig, ett gift par håller mer, två som tycker mycket om varandra blir bästa vänner och delar som släkt, den man hatar mest blir ärkefiende som man aldrig ger något, två med samma yrke som inte är vänner blir rivaler och arbetar lite hårdare, och en vuxen som lärt en ung mycket blir hens mentor. Allt skrivs i loggen och räknas',
  kor: () => {
    const s = createState(9, START);
    for (const p of living(s)) p.partner = undefined;
    const ny = (sex: 'm' | 'k', a: number) => { const p = nyInvanare(s, sex, a); for (const q of living(s)) if (q !== p) getRel(s, p, q).op = 0; return p; };
    const m = ny('m', 30), k = ny('k', 28), m2 = ny('m', 32), k2 = ny('k', 29);
    SIM.pair(s, m, k); SIM.pair(s, m2, k2);
    const r = getRel(s, m, k), r2 = getRel(s, m2, k2);
    r.op = 50; r.par = s.now - 15 * DAY; // tillsammans i 15 dygn och goda vänner
    r2.op = 10; r2.par = s.now - 15 * DAY; // ... men inte längre goda vänner
    const a = ny('m', 35), b = ny('m', 33), c = ny('k', 40), d = ny('k', 38);
    getRel(s, a, b).op = 85; // bästa vänner
    getRel(s, c, d).op = -90; // ärkefiender
    const j1 = ny('m', 25), j2 = ny('m', 27);
    j1.tag = 'Jägare'; j2.tag = 'Jägare'; getRel(s, j1, j2).op = 0; // samma yrke, inte vänner
    const lar = ny('k', 40), ung = ny('m', 12);
    lar.skill.hantverk = 12; ung.skill.hantverk = 2; const rl = getRel(s, lar, ung); rl.op = 45; rl.lart = 10;
    const fore = { ...s.stat };
    const rateFore = SIM.workRate(s, j1, 'jakt');
    SIM.stepRelationer(s);
    const st = (n: string) => (s.stat?.[n] ?? 0) - (fore[n] ?? 0), loggat = (t: string) => s.log.some(l => l.text.includes(t));
    const typ = (p: Person, q: Person) => SIM.relTyper(s, p, q).map(t => t.namn);
    // ett gift par skiljer sig först under RELT.skiljGift, ett ogift redan under REL.gral
    const haller = SIM.skiljGrans(r) < SIM.skiljGrans(r2);
    // den bästa vännen räknas som familjen när man delar: man ger allt utom en portion och kan väcka hen (behov.ts)
    const somFamilj = SIM.isFamily(a, b) && !SIM.isFamily(j1, j2);
    return [
      [`paret som varit tillsammans i 15 dygn och är goda vänner gifter sig (${typ(m, k).join(', ')})`, r.gift !== undefined && st('gift') === 1 && loggat(`${m.name} och ${k.name} har gift sig`)],
      ['paret som inte längre är goda vänner gifter sig inte', r2.gift === undefined],
      ['ett gift par håller mer än ett ogift', haller],
      [`två som tycker mycket om varandra blir bästa vänner (${typ(a, b).join(', ')})`, a.bast === b.id && b.bast === a.id && st('bastaVan') === 1 && loggat('bästa vänner')],
      ['den bästa vännen delar som släkt', somFamilj],
      [`den man hatar mest blir ärkefiende, och man ger hen aldrig något (${typ(c, d).join(', ')})`, c.arke === d.id && d.arke === c.id && st('arkefiende') === 2 && SIM.willing(s, c, d) === 0],
      [`två jägare som inte är vänner blir rivaler och jagar lite hårdare (${typ(j1, j2).join(', ')})`, !!j1.rivaler?.includes(j2.id) && j1.rivalom === 'Jägare' && SIM.workRate(s, j1, 'jakt') > rateFore && loggat('rivaler')],
      [`den vuxna som lärt den unga mycket blir mentor (${typ(lar, ung).join(', ')} / ${typ(ung, lar).join(', ')})`, ung.mentor === lar.id && ung.mentorSk === 'hantverk' && st('mentor') === 1],
    ];
  },
};

SCENARIER.uppvaxt = {
  text: 'Uppväxten (steg 3.1.2): ett barn som mister sina föräldrar minns det och blir föräldralöst, en vuxen formas inte, samma slag fastnar bara en gång, högst UPPV.max upplevelser och högst UPPV.tak åt varje håll, nära svält blir ett minne, egenskaperna är anlagen plus upplevelserna, och barnen ärver anlagen, inte det föräldrarna varit med om',
  kor: () => {
    const s = createState(9, START);
    const chans = Object.fromEntries(Object.entries(SIM.UPPLEVELSER).map(([k, d]) => [k, d.chans]));
    for (const d of Object.values(SIM.UPPLEVELSER)) d.chans = 1; // allt fastnar, så att provet inte beror på slumpen
    try {
      const mor = nyInvanare(s, 'k', 35), far = nyInvanare(s, 'm', 37), barn = nyInvanare(s, 'm', 8), vuxen = nyInvanare(s, 'k', 20);
      barn.mother = mor.id; barn.father = far.id; vuxen.mother = mor.id; vuxen.father = far.id;
      const fore = { ...barn.pot };
      SIM.die(s, mor, 'olycka'); SIM.die(s, far, 'olycka');
      const har = (p: Person, k: string) => !!p.upp?.some(u => u.k === k);
      const foralder = barn.upp?.find(u => u.k === 'foralder');
      const flyttad = !!foralder && (Object.entries(foralder.e) as [SIM.Stat, number][]).every(([k, v]) => Math.abs(barn.pot[k] - SIM.clamp(fore[k] + SIM.uppEffekt(barn, k), 1, 20)) < 1e-9 && v !== 0);
      // samma slag en gång: två svåra skador ger ett minne
      SIM.skada(s, barn, 'benV', 'benbrott', 0.9, 'olycka', 'när ett träd föll'); SIM.skada(s, barn, 'benH', 'benbrott', 0.9, 'olycka', 'när ett träd föll');
      const skador = barn.upp?.filter(u => u.k === 'skadad').length ?? 0;
      // nära svält en timme
      const hungrig = nyInvanare(s, 'k', 9); hungrig.hunger = 0; hungrig.health = 0.4;
      SIM.stepUppvaxt(s);
      // många slag: högst UPPV.max, och högst UPPV.tak åt varje håll
      const manga = nyInvanare(s, 'm', 10);
      for (const k of Object.keys(SIM.UPPLEVELSER) as SIM.UpplevelseTyp[]) SIM.upplev(s, manga, k, 'någon');
      const tak = SIM.STATS.every(k => Math.abs(SIM.uppEffekt(manga, k)) <= SIM.UPPV.tak);
      // barnen ärver anlagen: föräldrar med anlagen 10 som upplevelserna flyttat till 20
      const fa = nyInvanare(s, 'm', 30), mo = nyInvanare(s, 'k', 30);
      for (const p of [fa, mo]) { p.anlag = {} as Record<SIM.Stat, number>; for (const k of SIM.STATS) { p.anlag[k] = 10; p.pot[k] = 20; } }
      let summa = 0, n = 0;
      for (let i = 0; i < 20; i++) { const c = SIM.newPerson(s, 'k', s.now, mo, fa); for (const k of SIM.STATS) { summa += c.pot[k]; n++; } }
      const medel = summa / n;
      return [
        [`barnet (8 år) som miste sina föräldrar minns det och blev föräldralöst (${(barn.upp ?? []).map(SIM.upplevelseText).join('; ')})`, har(barn, 'foralder') && har(barn, 'foraldralos') && s.log.some(l => l.text.includes('Blev föräldralös'))],
        [`egenskaperna är anlagen plus upplevelserna, och anlagen sparas (${!!barn.anlag})`, flyttad && !!barn.anlag],
        [`den vuxna (20 år) formas inte (${vuxen.upp?.length ?? 0} upplevelser)`, !vuxen.upp],
        [`två svåra skador ger ett minne (${skador}): ${SIM.upplevelseText(barn.upp!.find(u => u.k === 'skadad')!)}`, skador === 1],
        [`ett barn nära svält minns det (${(hungrig.upp ?? []).map(u => u.k).join(', ')})`, har(hungrig, 'svalt')],
        [`högst ${SIM.UPPV.max} upplevelser (${manga.upp?.length}) och högst ${SIM.UPPV.tak} åt varje håll`, manga.upp?.length === SIM.UPPV.max && tak],
        [`barnen ärver anlagen (10), inte det upplevelserna gjort (20): medel ${medel.toFixed(1)}`, medel < 13],
      ];
    } finally {
      for (const [k, d] of Object.entries(SIM.UPPLEVELSER)) d.chans = chans[k];
    }
  },
};

SCENARIER.humor = {
  text: 'Förväntningarna (steg 3.2.1): den som blir rik blir gladare, vänjer sig efter några dygn och kräver sedan mer, den som blir fattig blir ledsnare och vänjer sig, och ett barn räknar med föräldrarnas rikedom',
  kor: () => {
    const s = createState(9, START);
    const rik = nyInvanare(s, 'm', 30), fattig = nyInvanare(s, 'k', 30), barn = nyInvanare(s, 'k', 6);
    barn.mother = rik.id;
    const verktyg: SIM.Ting[] = [];
    for (let i = 0; i < 10; i++) verktyg.push(SIM.newTing(s, 'yxa', 1, fattig.id));
    const timmar = (n: number) => { for (let i = 0; i < n; i++) SIM.stepHumor(s); };
    const delar = (p: Person) => { const u: { namn: string; v: number }[] = []; SIM.moodOf(p, s.now, u); return u; };
    const har = (p: Person, namn: string) => delar(p).find(u => u.namn === namn)?.v ?? 0;
    timmar(1); // alla vänjer sig vid det de har
    const fore = SIM.moodOf(rik, s.now);
    for (let i = 0; i < 100; i++) SIM.newTing(s, 'yxa', 1, rik.id); // rik blir rik på en gång ...
    for (const t of verktyg) t.agare = SIM.BYN; // ... och fattig förlorar sina redskap
    timmar(1);
    const glad = har(rik, 'Rikare än förut'), ledsen = har(fattig, 'Fattigare än förut'), barnGlad = har(barn, 'Rikare än förut'), efter = SIM.moodOf(rik, s.now);
    timmar(30 * 24); // 30 dygn (30 år i spelet)
    const vant = har(rik, 'Rikare än förut'), mer = har(rik, 'Van vid mer'), vantF = har(fattig, 'Fattigare än förut');
    return [
      [`den som blir rik blir gladare (Rikare än förut ${glad.toFixed(2)}, humöret ${fore.toFixed(2)} → ${efter.toFixed(2)})`, glad > 0.05 && efter > fore],
      [`den som förlorar sitt blir ledsnare (Fattigare än förut ${ledsen.toFixed(2)})`, ledsen < -0.03],
      [`barnet räknar med förälderns rikedom (${barnGlad.toFixed(2)})`, barnGlad > 0.05],
      [`efter 30 dygn har den rika vant sig (${vant.toFixed(3)}) och kräver mer (Van vid mer ${mer.toFixed(2)})`, Math.abs(vant) < 0.01 && mer < -0.02],
      [`den fattiga har vant sig (${vantF.toFixed(3)})`, Math.abs(vantF) < 0.01],
    ];
  },
};

SCENARIER.utbrott = {
  text: 'Utbrotten (steg 3.2.2): den som mår mycket dåligt brister ut, behoven går före, den som är elak sänker den andras humör, en sak slås sönder och efteråt mår man lite bättre',
  kor: () => {
    // en by där alla mår mycket dåligt i åtta dygn (åtta år i spelet)
    const s = createState(9, START);
    for (const p of living(s)) SIM.think(p, 'Sorg', -0.5, s.now, 8 * DAY);
    kor(s, 8 * 24);
    const utb = (s.stat?.utbrott as number) ?? 0, slag = Object.keys(s.stat ?? {}).filter(k => k.startsWith('utb_') && !k.startsWith('utb_sonder')).map(k => k.slice(4));
    // ett utbrott som väntar: först behoven, sedan utbrottet
    const t = createState(9, START);
    klockan(t, 11);
    const p = nyInvanare(t, 'm', 30), q = nyInvanare(t, 'k', 30);
    p.x += 12; q.x = p.x + 1; q.y = p.y; // långt från de andra
    p.ubr = { k: 'grata', t: t.now }; p.hunger = 0.05;
    SIM.chooseTask(t, p);
    const hungerForst = p.task?.act !== 'grata' && !!p.ubr;
    p.hunger = 0.9; p.ubr = { k: 'elak', t: t.now };
    const op0 = getRel(t, p, q).op, h0 = SIM.moodOf(q, t.now);
    SIM.chooseTask(t, p);
    const elak = p.task?.act === 'elak', op1 = getRel(t, p, q).op, h1 = SIM.moodOf(q, t.now);
    const yxa = SIM.newTing(t, 'yxa', 1, p.id);
    for (const x of tingOf(t)) if (x !== yxa && x.agare === p.id) x.agare = SIM.BYN;
    p.ubr = { k: 'krossa', t: t.now };
    SIM.chooseTask(t, p);
    const krossa = p.task?.act === 'krossa' && p.task.ref === yxa.id;
    const m0 = SIM.moodOf(p, t.now);
    SIM.utbrottKlar(t, p, p.task!);
    const borta = !tingOf(t).includes(yxa), m1 = SIM.moodOf(p, t.now);
    p.ubr = { k: 'fly', t: t.now - 7 * HOUR }; // har väntat för länge
    SIM.chooseTask(t, p);
    return [
      [`i en by där alla mår mycket dåligt i åtta dygn blir det utbrott (${utb}: ${slag.join(', ')})`, utb >= 3 && slag.length >= 2],
      ['den som är hungrig äter först, och utbrottet väntar', hungerForst],
      [`den som är elak sänker den andras humör (${h0.toFixed(2)} → ${h1.toFixed(2)}) och relationen (${op0.toFixed(0)} → ${op1.toFixed(0)})`, elak && h1 < h0 && op1 < op0],
      ['den som slår sönder något tar sin egen sak, och den är borta efteråt', krossa && borta],
      [`efter utbrottet mår man lite bättre (${m0.toFixed(2)} → ${m1.toFixed(2)})`, m1 > m0],
      ['ett utbrott som väntat för länge blir inget', p.task?.act !== 'fly' && !p.ubr],
    ];
  },
};
