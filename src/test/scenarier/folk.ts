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

SCENARIER.vald = {
  text: 'De allvarliga utbrotten (steg 3.2.3): ligga kvar i bädden, göra slut, slå (ett barn minns det alltid), misshandel, flytta ut och dråp, och de som ser det ogillar den som slår (steg 3.3.1)',
  kor: () => {
    // en vuxen långt från de andra, med en till bredvid sig
    const by = () => {
      const t = createState(9, START);
      klockan(t, 11);
      const p = nyInvanare(t, 'm', 30), q = nyInvanare(t, 'k', 30), r = living(t).find(o => o !== p && o !== q)!, w = nyInvanare(t, 'k', 40);
      p.x += 12; q.x = p.x + 1; q.y = p.y; w.x = p.x + 4; w.y = p.y; // w ser det, r är för långt bort
      return { t, p, q, r, w };
    };
    const utbrott = (t: State, p: Person, k: string) => { p.ubr = { k, t: t.now }; SIM.chooseTask(t, p); return p.task?.act; };
    // bädden
    const b = by(), badd = utbrott(b.t, b.p, 'badd') === 'badd';
    // att slå: ett blåmärke, relationen och byn
    const s1 = by(), op0 = getRel(s1.t, s1.p, s1.q).op, by0 = getRel(s1.t, s1.w, s1.p).op, langt0 = getRel(s1.t, s1.r, s1.p).op;
    const sla = utbrott(s1.t, s1.p, 'sla') === 'sla';
    const blamarke = !!s1.q.skador?.some(w => w.k === 'blamarke'), op1 = getRel(s1.t, s1.p, s1.q).op, by1 = getRel(s1.t, s1.w, s1.p).op, langt1 = getRel(s1.t, s1.r, s1.p).op;
    // en förälder slår sitt barn, två gånger
    const s2 = by(), c = nyInvanare(s2.t, 'k', 8);
    c.father = s2.p.id; c.x = s2.p.x + 0.5; c.y = s2.p.y;
    utbrott(s2.t, s2.p, 'sla');
    const forst = c.upp?.some(u => u.k === 'slagen') ?? false;
    utbrott(s2.t, s2.p, 'sla');
    const igen = c.upp?.some(u => u.k === 'slagenIgen') ?? false;
    const flytt = SIM.STATS.reduce((a, k) => a + Math.abs(c.pot[k] - (c.anlag?.[k] ?? c.pot[k])), 0);
    // göra slut: med partnern, och med bästa vännen
    const s3 = by();
    s3.p.partner = s3.q.id; s3.q.partner = s3.p.id;
    utbrott(s3.t, s3.p, 'slut');
    const skilda = s3.p.partner === undefined && s3.q.partner === undefined;
    const s4 = by();
    s4.p.bast = s4.q.id; getRel(s4.t, s4.p, s4.q).op = 85;
    utbrott(s4.t, s4.p, 'slut');
    const bruten = getRel(s4.t, s4.p, s4.q).op;
    // dråp: bara mot ärkefienden, för den med låg empati och flera utbrott nyss; annars misshandel
    const s5 = by();
    s5.p.arke = s5.q.id; s5.p.pot.empati = 2; s5.p.anlag = { ...s5.p.pot }; s5.p.utb = 3;
    const by5 = getRel(s5.t, s5.w, s5.p).op;
    utbrott(s5.t, s5.p, 'drap');
    const drap = s5.q.died !== undefined && s5.q.cause === SIM.DODSORSAKER.drap.text, by6 = getRel(s5.t, s5.w, s5.p).op;
    const s6 = by();
    s6.p.arke = s6.q.id; s6.p.pot.empati = 15; s6.p.anlag = { ...s6.p.pot }; s6.p.utb = 3;
    utbrott(s6.t, s6.p, 'drap');
    const miss = s6.q.died === undefined && (s6.q.skador?.length ?? 0) >= 1;
    // flytta ut: med barnet, men inte från sin partner
    const s7 = by(), c7 = nyInvanare(s7.t, 'm', 6);
    c7.father = s7.p.id;
    const ut = SIM.flyttaUt(s7.t, s7.p) && s7.p.left !== undefined && c7.left !== undefined;
    const s8 = by();
    s8.p.partner = s8.q.id; s8.q.partner = s8.p.id;
    const stannar = !SIM.flyttaUt(s8.t, s8.p) && s8.p.left === undefined;
    return [
      ['den som mår mycket dåligt kan ligga kvar i bädden', badd],
      [`den som slår ger ett blåmärke, relationen sjunker (${op0.toFixed(0)} → ${op1.toFixed(0)}), den som såg det ogillar hen (${by0.toFixed(0)} → ${by1.toFixed(0)}) men inte den som var långt bort (${langt0.toFixed(0)} → ${langt1.toFixed(0)})`, sla && blamarke && op1 < op0 && by1 < by0 && langt1 === langt0],
      [`ett barn som blir slaget av sin förälder minns det alltid, och mer när det händer igen (egenskaperna flyttade ${flytt})`, forst && igen && flytt >= 6],
      ['den som gör slut med sin partner skiljer sig', skilda],
      [`den som bryter med sin bästa vän: relationen 85 → ${bruten.toFixed(0)}`, bruten <= 40],
      [`den med låg empati och många utbrott kan dräpa sin ärkefiende, och den som såg det ogillar hen mycket (${by5.toFixed(0)} → ${by6.toFixed(0)})`, drap && by6 <= by5 - 30],
      ['med mer empati blir det misshandel i stället', miss],
      ['den som flyttar ut tar med sitt barn', ut],
      ['den som har en partner i byn flyttar inte ut', stannar],
    ];
  },
};

SCENARIER.barnutbrott = {
  text: 'Barnens utbrott (steg 3.2.4): barn som mår mycket dåligt skriker, trotsar, puttas med ett syskon eller springer iväg, mer sällan med en förälder nära och efter lek',
  kor: () => {
    // fem ledsna barn i en by där de vuxna mår bra, i tolv dygn (tolv år i spelet)
    const s = createState(9, START);
    const barn = [nyInvanare(s, 'm', 4), nyInvanare(s, 'k', 5), nyInvanare(s, 'm', 6), nyInvanare(s, 'k', 7), nyInvanare(s, 'm', 8)];
    for (const c of barn) SIM.think(c, 'Sorg', -0.5, s.now, 12 * DAY);
    tandEld(s); // elden brinner från början: scenariot gäller barnen, inte om flintan tar fyr i tid (2,5 % per försök)
    kor(s, 12 * 24);
    const BARNENS = ['skrika', 'trotsa', 'puttas', 'rymma'], VUXNAS = Object.keys(SIM.UTBROTT).filter(k => !BARNENS.includes(k));
    const slag = Object.keys(s.stat ?? {}).filter(k => k.startsWith('utb_') && !k.startsWith('utb_sonder') && k !== 'utb_barn').map(k => k.slice(4));
    const barnSlag = slag.filter(k => BARNENS.includes(k)), vuxnaSlag = slag.filter(k => VUXNAS.includes(k));
    // risken: ensam, med en förälder nära och efter lek
    const t = createState(9, START);
    klockan(t, 11);
    const c = nyInvanare(t, 'k', 8), f = nyInvanare(t, 'm', 30);
    c.x += 12; f.x = c.x + 30; f.y = c.y;
    SIM.think(c, 'Sorg', -0.5, t.now, DAY);
    const ensam = SIM.utbrottChans(t, c);
    c.father = f.id; f.x = c.x + 1;
    const nara = SIM.utbrottChans(t, c);
    c.lekt = t.now - HOUR;
    const lekt = SIM.utbrottChans(t, c);
    // att puttas med ett syskon, och att trotsa
    const sy = nyInvanare(t, 'm', 6);
    sy.father = f.id; sy.x = c.x + 0.5; sy.y = c.y;
    const h0 = SIM.moodOf(sy, t.now);
    c.ubr = { k: 'puttas', t: t.now };
    SIM.chooseTask(t, c);
    const puttas = c.task?.act === 'elak' && SIM.moodOf(sy, t.now) < h0;
    SIM.newTing(t, 'yxa', 1, SIM.BYN);
    c.ubr = { k: 'trotsa', t: t.now };
    SIM.chooseTask(t, c);
    const trotsa = c.task?.act === 'krossa';
    return [
      [`ledsna barn brister ut, bara i barnens slag (${barnSlag.join(', ') || 'inga'}; de vuxnas: ${vuxnaSlag.join(', ') || 'inga'})`, barnSlag.length >= 1 && (s.stat?.utbrott as number ?? 0) >= 2],
      [`med en förälder nära är risken mindre (${ensam.toFixed(4)} → ${nara.toFixed(4)}), och efter lek ännu mindre (${lekt.toFixed(4)})`, ensam > 0 && nara < ensam && lekt < nara],
      ['ett barn kan puttas med sitt syskon, som blir ledsnare', puttas],
      ['ett barn kan trotsa och slå sönder något', trotsa],
    ];
  },
};

SCENARIER.rykten = {
  text: 'Rykten (steg 3.3–3.4): det man ser blir intryck med bevis, de sprids svagare i samtal, man tiger om sina vänner, lögnaren ertappas, flitig och lat, avund, tycke och smak, och minnet av en död lever kvar',
  kor: () => {
    const by = () => {
      const t = createState(9, START);
      klockan(t, 11);
      const p = nyInvanare(t, 'm', 30), q = nyInvanare(t, 'k', 30), w = nyInvanare(t, 'k', 40), r = nyInvanare(t, 'm', 35);
      p.x += 12; q.x = p.x + 1; q.y = p.y; w.x = p.x + 4; w.y = p.y; r.x = p.x + 30; r.y = p.y; // w ser, r är långt bort
      return { t, p, q, w, r };
    };
    // att slå: vittnet får intrycket våldsam med beviset, den som var långt bort inget
    const a = by();
    SIM.handelse(a.t, a.p, 'sla', a.q);
    const e = SIM.intryckOm(a.w, a.p.id, 'valdsam'), bort = SIM.intryckOm(a.r, a.p.id);
    const bevis = e?.bev?.[0] ? SIM.bevisText(e.bev[0], a.p.name) : '';
    // vittnet berättar för den som var borta: svagare och mindre säker, ett led
    SIM.beratta(a.t, a.w, a.r, e!, getRel(a.t, a.w, a.r));
    const hort = SIM.intryckOm(a.r, a.p.id, 'valdsam');
    // hemligheter: partnern berättar inte om det dåliga
    const b = by();
    b.w.partner = b.p.id; b.p.partner = b.w.id;
    SIM.handelse(b.t, b.p, 'sla', b.q);
    let tiger = true;
    for (let i = 0; i < 200; i++) SIM.skvaller(b.t, b.w, b.r, getRel(b.t, b.w, b.r), true);
    if (SIM.intryckOm(b.r, b.p.id)) tiger = false;
    // skitsnack: ett påhittat rykte, och den det sägs ha hänt märker att det är påhittat
    const c = by();
    getRel(c.t, c.p, c.q).op = -60;
    SIM.skitsnack(c.t, c.p, c.w);
    const falsk = SIM.intryckOm(c.w, c.q.id);
    const mot = falsk?.bev?.[0]?.mot !== undefined ? living(c.t).find(o => o.id === falsk.bev![0].mot) : undefined;
    let ertappad = false;
    if (falsk && mot && mot !== c.w) { SIM.beratta(c.t, c.w, mot, falsk, getRel(c.t, c.w, mot)); ertappad = !!SIM.intryckOm(mot, c.w.id, 'logn') && SIM.lognFaktor(mot, c.w) < 1; }
    // stöld: den bestulne vet
    const d = by();
    SIM.stole(d.t, d.p, d.q, 'mat', 2);
    SIM.noticeTheft(d.t, d.q, 'mat');
    const tjuv = SIM.intryckOm(d.q, d.p.id, 'tjuv');
    // mästerverk: imponerad, men rivalen blir avundsjuk
    const m = by();
    m.r.x = m.p.x + 3; m.r.rivaler = [m.p.id];
    const imp0 = getRel(m.t, m.w, m.p).op, riv0 = getRel(m.t, m.r, m.p).op;
    SIM.handelse(m.t, m.p, 'masterverk', undefined, 'en yxa');
    const imp1 = getRel(m.t, m.w, m.p).op, riv1 = getRel(m.t, m.r, m.p).op;
    // flitig: den som arbetar mycket mer än de andra
    const f = by();
    for (const o of living(f.t)) o.habit = { samla: 5 };
    f.p.habit = { samla: 40 };
    for (let i = 0; i < 30; i++) SIM.stepRykten(f.t, SIM.moodOf);
    const flitig = SIM.intryckOm(f.q, f.p.id, 'flitig');
    // döden: intrycket lever kvar med de viktigaste bevisen, och bleknar långsammare än om en levande
    const g = by();
    for (const h of ['sla', 'elak', 'misshandel', 'sla'] as const) { g.t.now += 60_000; SIM.handelse(g.t, g.p, h, g.q); }
    const o = by();
    SIM.handelse(o.t, o.p, 'misshandel', o.q);
    SIM.die(g.t, g.p, 'drap');
    const dod = SIM.intryckOm(g.w, g.p.id, 'valdsam');
    const bev = dod?.bev?.length ?? 0;
    SIM.glomRykten(g.t, 5 * 24); SIM.glomRykten(o.t, 5 * 24);
    const cDod = SIM.intryckOm(g.w, g.p.id, 'valdsam')?.c ?? 0, cLev = SIM.intryckOm(o.w, o.p.id, 'valdsam')?.c ?? 0;
    // tycke och smak
    const k = by();
    k.p.smak = { 'a:fiske': 0.8 };
    const drag = SIM.smakDrag(k.p, ['fiske']);
    SIM.smakGift(k.q);
    return [
      [`den som såg slaget tycker att hen är våldsam (${bevis}), den som var långt bort vet inget`, !!e && e.c === 1 && bevis.includes(a.q.name) && !bort],
      [`ryktet sprids svagare och mindre säkert (säkerhet ${e?.c.toFixed(2)} → ${hort?.c.toFixed(2)}, led ${hort?.led})`, !!hort && hort.c < e!.c && hort.led === 1 && hort.src === a.w.id],
      ['partnern tiger om det dåliga', tiger],
      [`skitsnack ger ett påhittat rykte, och den det sägs ha hänt ertappar lögnaren`, !!falsk?.bev?.[0]?.falsk && ertappad],
      ['den bestulne vet att tjuven är tjuv', !!tjuv && tjuv.bev?.[0]?.h === 'stold'],
      [`ett mästerverk gör folk imponerade (${imp0.toFixed(0)} → ${imp1.toFixed(0)}) men rivalen avundsjuk (${riv0.toFixed(0)} → ${riv1.toFixed(0)})`, imp1 > imp0 && riv1 < riv0],
      [`den som arbetar mycket mer än de andra ses som flitig (${flitig?.v.toFixed(2) ?? 'nej'})`, !!flitig && flitig.v > 0.1],
      [`efter döden lever intrycket kvar med de ${bev} viktigaste händelserna, och bleknar långsammare (${cDod.toFixed(2)} mot ${cLev.toFixed(2)})`, !!dod && bev <= SIM.RYKTE.dodBev && bev >= 1 && cDod > cLev],
      [`smaken drar i valet (${drag.toFixed(2)}) och svampen som förgiftar ger avsmak`, drag > 1 && SIM.smakAv(k.q, 'm:svamp') < 0],
    ];
  },
};

SCENARIER.ledare = {
  text: 'Ledarskapet (steg 3.5): bara den som kan tekniken Ledarskap blir ledare, när byn har sex vuxna väljs den mest omtyckta, den första ledaren låser upp seden Rangordning, påbuden sätts och drar förråden, och ledaren straffar en tjuv på kvällen: den som skäms håller sig undan elden',
  kor: () => {
    const by = () => {
      const t = createState(11, START);
      klockan(t, 11);
      for (const [x, a] of [['m', 33], ['k', 29], ['m', 26]] as const) nyInvanare(t, x, a);
      const vuxna = living(t).filter(p => ageOf(p, t.now) >= SIM.ALDER.vuxen);
      return { t, vuxna };
    };
    // utan tekniken blir ingen ledare
    const a = by();
    for (let i = 0; i < 5; i++) SIM.stepStyre(a.t);
    const ingen = !a.t.styre?.ledare;
    // den som kan tekniken och är omtyckt väljs, och den första ledaren låser upp Rangordning
    const b = by(), [l, tjuv, offer] = b.vuxna;
    (l.tek ??= {}).ledarskap = 1;
    for (const q of b.vuxna) if (q !== l) getRel(b.t, l, q).op = 40;
    const rang0 = SIM.sedOppen(b.t, 'rang');
    SIM.stepStyre(b.t);
    const vald = SIM.ledareOf(b.t) === l, titel = b.t.styre?.titel, rang1 = SIM.sedOppen(b.t, 'rang');
    const leg = SIM.legitimitet(b.t);
    const harPabud = !!b.t.styre?.pabud && SIM.PABUD_LIST.every(k => b.t.styre!.pabud![k] !== undefined);
    // påbudet blandas med byns egen sed
    b.t.styre!.pabud!.matlager = 1; b.t.seder.v.forsiktighet = 0;
    const drar = SIM.pabud(b.t, 'matlager');
    // ledaren ser en stöld och straffar på kvällen
    for (const q of b.vuxna) { q.x = l.x + 1; q.y = l.y; }
    SIM.handelse(b.t, tjuv, 'stold', offer, 'mat');
    klockan(b.t, SIM.STR.timme);
    SIM.stepStyre(b.t);
    const straff = b.t.stat?.straff ?? 0;
    // den som skäms väljer inte samtal vid elden
    tjuv.skam = b.t.now + DAY;
    klockan(b.t, 22);
    let social = 0;
    for (let i = 0; i < 40; i++) { tjuv.task = undefined; Object.assign(tjuv, { hunger: 0.9, rest: 0.9, toa: 0.9, torst: 0.9, warm: 0.9 }); SIM.chooseTask(b.t, tjuv); if (ACTS[tjuv.task!.act].social && tjuv.task!.act !== 'maltid') social++; }
    // ledaren dör: ingen annan kan tekniken, och påbuden upphör
    SIM.die(b.t, l, 'alderdom');
    SIM.stepStyre(b.t);
    const slut = !SIM.ledareOf(b.t) && SIM.pabud(b.t, 'matlager') === b.t.seder.v.forsiktighet && b.t.styre!.historia[0].till !== undefined;
    return [
      ['utan tekniken Ledarskap blir ingen ledare', ingen],
      [`den som kan ledarskap och är omtyckt blir ledare (${titel})`, vald],
      ['den första ledaren låser upp seden Rangordning', !rang0 && rang1],
      [`legitimiteten räknas ur stödet, tiden och vintrarna (${leg.v.toFixed(2)}, stöd ${leg.stod.toFixed(2)})`, leg.v > 0 && leg.v <= 1 && leg.stod > 0.5],
      ['ledaren sätter påbuden', harPabud],
      [`påbudet drar byns förråd åt ledarens håll (${drar.toFixed(2)})`, drar > 0 && drar < 1],
      [`ledaren straffar tjuven på kvällen (${straff} straff)`, straff >= 1],
      [`den som skäms håller sig undan elden (${social} av 40 val sociala)`, social === 0],
      ['när ledaren dör och ingen annan kan ledarskap upphör påbuden', slut],
    ];
  },
};

SCENARIER.strid = {
  text: 'Striden i testarenan (steg 3.7.5): samma uppställning och frö ger samma strid, avsikten avgör hur den slutar (lek vid första smärtan, slagsmål med händerna, döda slår den som ligger), vapen och kläder spelar roll, kaninen flyr, och en person ur byn tar med sitt vapen',
  kor: () => {
    const m = (id: number, sida: 0 | 1, vapen: SIM.Vapen, klader: string[] = [], styrka = 10) => ({ id, namn: `K${id}`, sida, st: { styrka, uthallighet: 10, mod: 10, smidighet: 10, skicklighet: 10 }, vapen, klader, fart: 1, x: sida ? 12 : 8, y: 7 });
    const u = (avsikt: SIM.Avsikt, a: ReturnType<typeof m>, b: ReturnType<typeof m>): SIM.Uppstallning => ({ avsikt, w: 20, h: 14, kampar: [a, b] });
    const en = SIM.stridTillSlut(SIM.nyStrid(u('skada', m(1, 0, 'yxa'), m(2, 1, 'kniv')), 7)), tva = SIM.stridTillSlut(SIM.nyStrid(u('skada', m(1, 0, 'yxa'), m(2, 1, 'kniv')), 7));
    const samma = JSON.stringify(en.logg) === JSON.stringify(tva.logg);
    const lek = SIM.korManga(u('lek', m(1, 0, 'yxa'), m(2, 1, 'yxa')), 1, 50);
    const lekMedHand = SIM.nyStrid(u('lek', m(1, 0, 'yxa'), m(2, 1, 'yxa')), 1).kampar.every(k => k.vapen === 'hand');
    const doda = SIM.korManga(u('doda', m(1, 0, 'yxa'), m(2, 1, 'yxa')), 1, 100), skada = SIM.korManga(u('skada', m(1, 0, 'yxa'), m(2, 1, 'yxa')), 1, 100);
    const yxa = SIM.korManga(u('skada', m(1, 0, 'yxa'), m(2, 1, 'hand')), 1, 100);
    const rock = SIM.korManga(u('skada', m(1, 0, 'kniv', ['skinnrock', 'skinnskor']), m(2, 1, 'kniv')), 1, 200);
    const stark = SIM.korManga(u('slagsmal', m(1, 0, 'hand', [], 16), m(2, 1, 'hand', [], 6)), 1, 100);
    const kanin = SIM.korManga({ avsikt: 'doda', w: 20, h: 14, kampar: [m(1, 0, 'kniv'), SIM.djurKampe('kanin', 2, 1, 12, 7)] }, 1, 50);
    const t = createState(11, START), p = living(t)[0];
    SIM.addTool(t, 'yxa', p);
    const fran = SIM.personKampe(t, p, 1, 0, 5, 5);
    const allaText = en.logg.every(r => SIM.stridText(en, r).length > 5), rap = SIM.stridRapport(en);
    return [
      ['samma uppställning och frö ger exakt samma strid', samma],
      [`lek slutar med att någon ger upp, aldrig död (${lek.slut.ger}/50 gav upp)`, lek.slut.ger === 50 && lek.slut.dod === 0],
      ['i lek och slagsmål slåss man med händerna', lekMedHand],
      [`med avsikten döda dör fler än med skada (${doda.slut.dod} mot ${skada.slut.dod} av 100)`, doda.slut.dod > skada.slut.dod],
      [`yxan vinner mot knytnävarna (${yxa.vann[0]} av 100)`, yxa.vann[0] >= 80],
      [`skinnrock och skor hjälper (${rock.vann[0]} mot ${rock.vann[1]} av 200)`, rock.vann[0] > rock.vann[1]],
      [`den starke vinner slagsmålet (${stark.vann[0]} av 100)`, stark.vann[0] >= 70],
      [`kaninen flyr eller dör, vinner aldrig (${kanin.vann[1]} vann)`, kanin.vann[1] === 0],
      [`personen ur byn tar med sin yxa (${fran.vapen}) och sitt namn`, fran.vapen === 'yxa' && fran.namn === p.name && fran.pid === p.id],
      ['varje rad i loggen blir en mening, och rapporten säger vem som vann', allaText && rap.vinnare === en.slut!.vinnare],
    ];
  },
};
