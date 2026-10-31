// Scenarier. Djur och natur: djur, abborre, sjön, kaniner, rötter, värmekartor och naturen.
import { FANGST, createState, bearbeta, canProcess, makeTool, step, living, cloneState, ageStart, nyKalender, pilesOf, amountOf, STACK, isLight, T, ageOf, groundOf, getMap, DAY, HOUR, W, State, tileOf, findL, areaOf, describe, campDist, campCenter, FYND, FYND_IDS, GRUPPER, fyndAt, takeFrom, packFynd, growFynd, H, vaxerAt, richness, observe, hoped, Lager, skyggOf, grupperOf, KANINER, share, djurOf, KANIN, SLAKT, DJUR, DJURARTER, gain, ownsAmount, setAmount, BEAT, matGott, barnMat, hungerFlytt, regulate, EKONOMI, kroppensMat, foodDays, SAMTALSSLAG, SAKER, materialOf, balansTal, load, capacity, bordPlats, PLATS, tinderShort } from '../../sim';
import * as SIM from '../../sim';
import { FOREST, isSoil } from '../../sim/vag';
import { START, STEG_DYGN, STEG_TIM } from '../kor';
import { setMat, kor, klockan, bastaJaktruta, SCENARIER, flyttLitenBy, tandEld, medBank, medHus, nyInvanare } from './hjalp';

SCENARIER.djur = {
  lang: true,
  text: 'Kaniner syns där det finns vilt, skuttar omkring och hoppar undan folk. Jakt fångar hela kaniner som bärs hem hela och äts som de är; med flintkniv slaktas de till mer kött, ben, skinn och senor',
  kor: () => {
    const s = createState(6, START);
    klockan(s);
    const dj = djurOf(s), c = campCenter(s);
    const iLagret = dj.filter(d => campDist(s, Math.floor(d.x), Math.floor(d.y)) < FANGST.lagerR).length;
    // fler kaniner där det finns mycket vilt
    let rik = 0, fattig = 0, nr = 0, nf = 0;
    for (let i = 0; i < W * H; i++) { const v = fyndAt(s, 'jakt', i) / FYND.jakt.topp; if (v > 0.6) nr++; else if (v > 0.05 && v < 0.25) nf++; }
    for (const d of dj) { const v = fyndAt(s, 'jakt', tileOf(d.x, d.y)) / FYND.jakt.topp; if (v > 0.6) rik++; else if (v > 0.05 && v < 0.25) fattig++; }
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
    const { x: bx, y: by } = bastaJaktruta(s, 30, c) ?? c;
    let hela = true;
    for (let i = 0; i < 24 * STEG_TIM; i++) {
      // samma uppgift hela tiden (jakten är försök som tar en stund, steg 3.7.3); den som fångat börjar om på platsen
      if (p.task?.act !== 'jakt' || p.task.carry > 0 || p.task.phase !== 'do') { p.task = { act: 'jakt', phase: 'do', tx: bx, ty: by, until: s.now + 24 * HOUR, carry: 0, why: 'prov', dark: !isLight(s.now) }; p.x = bx; p.y = by; }
      for (const r of living(s)) r.hunger = 1; // ingen äter av viltet under provet (då syns inte om det kom in helt)
      const v0 = amountOf(s, 'vilt');
      step(s, BEAT);
      const d = (amountOf(s, 'vilt')) - v0;
      if (d > 0.05 && Math.abs(d - KANIN) > 0.05) hela = false; // det som kommer in är hela kaniner
    }
    const kaniner = s.stat?.kaniner ?? 0;
    // den som fångat en kanin bär hem den hel (små steg, så att vägen hem syns)
    const q = createState(6, START); klockan(q, 9);
    const j = living(q).find(r => ageOf(r, q.now) >= 18)!;
    let hem = 0, annat = 0;
    for (let i = 0; i < 6 * 3600 * 2 && !hem; i++) {
      if (j.task?.act !== 'jakt') j.task = { act: 'jakt', phase: 'go', tx: bx, ty: by, until: q.now + 3 * HOUR, carry: 0, why: 'prov', dark: false };
      step(q, 0.5);
      if (j.task?.act === 'jakt' && j.task.phase === 'back') { if (Math.abs(j.task.carry - KANIN) < 1e-9 && !j.task.items) hem++; else if (j.task.carry > 0) annat++; }
    }
    // utan kniv ingen slakt; med kniv blir en kanin kött, ben, skinn och senor (vid slaktbänken)
    setAmount(s, 'flinta', 2); setAmount(s, 'grenar', 2); medBank(s);
    const utan = !canProcess(s, p, DJUR.kanin);
    for (const r of s.people) r.tek = { ...r.tek, kniv: 1, rep: 1 };
    makeTool(s, p, 'kniv');
    const kniv = amountOf(s, 'kniv') === 1 && Math.abs(amountOf(s, 'flinta') - 1) < 1e-9;
    // allt vilt är byns: med jägarens kaniner bland byns delas det upp på flera ägare, och var och en får bara hela saker (steg 2.10.7)
    setMat(s, {}); setMat(s, { vilt: 3 * KANIN }); setAmount(s, 'ben', 0); setAmount(s, 'skinn', 0); setAmount(s, 'rep', 0);
    const kan = canProcess(s, p, DJUR.kanin);
    bearbeta(s, p, DJUR.kanin, 1);
    const slakt = amountOf(s, 'kott') === 3 * SIM.kottAv(p, SLAKT.kott) && amountOf(s, 'vilt') < 1e-9 && Math.abs(amountOf(s, 'ben') - 3) < 1e-9 && Math.abs(amountOf(s, 'skinn') - 3) < 1e-9; // köttet i hela saker (steg 2.10.7)
    // senorna blir ibland ett rep, men bara för den som kan tekniken Rep
    const repAv = (kan: boolean) => { let r = 0; for (let i = 0; i < 200; i++) { setMat(s, { vilt: KANIN }); setAmount(s, 'rep', 0); p.tek = { ...p.tek, rep: kan ? 1 : 0 }; bearbeta(s, p, DJUR.kanin, 1); r += amountOf(s, 'rep'); } return r; };
    const medRep = repAv(true), utanRep = repAv(false);
    // receptet i saker.ts (för värdet) och DJUR (det som händer) säger samma sak: inom 10 %. Det som får sitt värde ur
    // djuret (varde i DJUR, steg 3.6.13) räknas som sin del av djuret
    const fran = (art: (typeof DJURARTER)[number]) => { const tot = Object.entries(art.slakt).reduce((y, [j, n]) => y + n * (art.varde?.[j] ?? 0), 0); return Object.entries(art.slakt).reduce((x, [k, n]) => x + (art.varde?.[k] ? art.varde[k] / tot * art.mat : SAKER[k]?.skaffa?.av?.[art.sak] ?? NaN) * n, 0) / art.mat; };
    const recept = DJURARTER.map(art => `${art.sak} ${fran(art).toFixed(2)}`).join(', ');
    const receptOk = DJURARTER.every(art => Math.abs(fran(art) - 1) <= 0.1);
    return [
      [`kaniner syns där det finns vilt (${dj.length} st), inga i lägret (${iLagret})`, dj.length > 10 && iLagret === 0],
      [`fler kaniner där det finns mycket vilt (${(tat(rik, nr) * 100).toFixed(1)} % av de rika rutorna, ${(tat(fattig, nf) * 100).toFixed(1)} % av de fattiga)`, tat(rik, nr) > tat(fattig, nf) * 2],
      [`kaninerna skuttar omkring (${flyttat} av ${dj.length} flyttade sig på en minut)`, flyttat > dj.length * 0.3],
      [`en kanin hoppar undan den som kommer nära (${avst.toFixed(1)} rutor bort)`, avst > 2],
      [`jakt utan redskap fångar hela kaniner (${kaniner} på ett dygn)`, kaniner >= 1 && hela],
      [`kaninen bärs hem hel, en i taget (${hem} gång, ${annat} med annat)`, hem >= 1 && annat === 0],
      ['utan kniv slaktas inget; kniven görs av en flinta och en gren och en flinta sparas till elden', utan && kniv && kan],
      ['en slaktad kanin ger mer kött än den uppätna, och ett ben och ett skinn', slakt && SLAKT.kott > KANIN],
      [`det ett djur ger har ett recept av djuret i saker.ts, som ungefär stämmer med DJUR (${recept})`, receptOk],
      [`senorna blir ibland ett rep för den som kan Rep (${medRep} rep av 200 kaniner), aldrig annars (${utanRep})`, medRep >= 200 * DJUR.kanin.rep * 0.5 && medRep <= 200 * DJUR.kanin.rep * 1.5 && utanRep === 0],
    ];
  },
};

SCENARIER.abborre = {
  text: 'Det som fångas är en hel abborre. Den rensas med händerna vid slaktbänken till fiskkött, som är det man äter; köttet är dens som ägde fisken. Innan byn har en bänk äts abborren som den är',
  lang: true,
  kor: () => {
    const s = createState(1, START);
    klockan(s);
    const [a, c] = living(s);
    s.delning = { andel: 0 }; // byn tar ingen andel: annars blir a:s del av sex abborrar mindre än en hel (steg 2.10.7)
    setMat(s, {}); gain(s, a, 'abborre', 6); medBank(s);
    const egen = ownsAmount(s, a, 'abborre'); // det som inte delats med byn
    const kan = canProcess(s, c, DJUR.abborre);
    bearbeta(s, c, DJUR.abborre, 0.1); // tre abborrar på sex minuter
    const halv = Math.abs(amountOf(s, 'abborre') - 3) < 1e-9 && Math.abs(amountOf(s, 'fisk') - 3) < 1e-9;
    bearbeta(s, c, DJUR.abborre, 1);
    const klar = amountOf(s, 'abborre') < 1e-9 && Math.abs(amountOf(s, 'fisk') - 6) < 1e-9;
    const agare = egen > 0 && Math.abs(ownsAmount(s, a, 'fisk') - egen) < 1e-9 && ownsAmount(s, c, 'fisk') === 0;
    // en vanlig by: fisket ger abborrar, och de rensas till fiskkött
    // (alla byar börjar inte fiska de första dygnen; den första av några byar som fiskar räknas)
    // (rensat räknas i bearbeta(); en abborre rensas på ett par minuter och syns sällan som uppgift var femte minut)
    let abborreSedd = 0, fangat = 0, rensat = 0;
    for (const seed of [3, 1, 2, 4, 5]) {
      const v = createState(seed, START); medBank(v);
      abborreSedd = 0;
      for (let i = 0; i < 6 * STEG_DYGN; i++) {
        step(v, BEAT);
        abborreSedd = Math.max(abborreSedd, amountOf(v, 'abborre'));
      }
      fangat = v.stat?.fisk ?? 0; rensat = v.stat?.rensat ?? 0;
      if (fangat >= 3) break; // en enstaka fisk säger inget om rensningen
    }
    return [
      ['abborren rensas med händerna, utan kniv', kan],
      ['en abborre blir lika mycket fiskkött, några på en kvart', halv && klar],
      ['fiskköttet är dens som ägde abborren, inte dens som rensade', agare],
      [`i en by kommer abborrar hem (högst ${abborreSedd.toFixed(0)} på en gång) och rensas (${rensat.toFixed(0)} av ${fangat} fångade på sex dygn, sex år i spelet)`, fangat > 0 && abborreSedd > 0 && rensat > 0 && rensat >= fangat * 0.5],
    ];
  },
};

SCENARIER.sjo = { // by 4: by 3 fiskade knappt efter steg 2.3.11
  text: 'Varje sammanhängande vatten är en sjö. Fiskeförsök, napp, fångade fiskar och bad räknas per sjö när de händer (sjöfliken)',
  kor: () => {
    const s = createState(4, START), sj = SIM.sjoarna(s.seed), tiles = getMap(s.seed).tiles;
    let vatten = true; for (let i = 0; i < W * H; i++) if ((tiles[i] === T.Vatten) !== (sj.id[i] >= 0)) vatten = false;
    const storst = sj.rutor.every((r, n) => n === 0 || r.length <= sj.rutor[n - 1].length);
    kor(s, 6 * 24);
    const st = Object.values(s.sjoar ?? {}), sum = (k: 'forsok' | 'napp' | 'fisk' | 'bad') => st.reduce((a, x) => a + x[k], 0);
    const fangst = s.people.reduce((a, p) => a + (p.fiske?.k ?? 0), 0);
    const perPers = st.every(x => Object.values(x.fiskare).reduce((a, n) => a + n, 0) === x.fisk && Object.values(x.badare).reduce((a, n) => a + n, 0) === x.bad);
    // ett bad vid stranden räknas vid sjön intill
    const b = createState(3, START), bp = living(b)[0], strand = SIM.shoreOf(b.seed).indexOf(1), bx = strand % W, by = Math.floor(strand / W);
    bp.x = bx + 0.5; bp.y = by + 0.5;
    bp.task = { act: 'bada', phase: 'do', tx: bx, ty: by, until: b.now, carry: 0, why: 'prov', dark: !isLight(b.now) };
    step(b, BEAT);
    const badSjo = b.sjoar?.[SIM.sjoVid(b, bx, by)];
    // stranden är utfiskad: fiskaren går till en annan plats vid vattnet (steg 2.12.4)
    const f = createState(4, START), fp = living(f).find(q => ageOf(q, f.now) >= 18)!, fs = SIM.shoreOf(f.seed);
    let fi = -1, fr = 0; for (let i = 0; i < W * H; i++) if (fs[i]) { const r = SIM.richness(f, 'fiske', i % W + 0.5, Math.floor(i / W) + 0.5); if (r > fr) { fr = r; fi = i; } }
    const fx = fi % W + 0.5, fy = Math.floor(fi / W) + 0.5;
    for (let n = 0; n < 200 && SIM.richness(f, 'fiske', fx, fy) >= SIM.PLATS.tomtGrans; n++) SIM.takeFrom(f, 'fiske', fx, fy, 1);
    fp.x = fx; fp.y = fy; fp.task = { act: 'fiske', phase: 'do', tx: fx, ty: fy, until: f.now + 2 * HOUR, carry: 0, why: 'prov', dark: !isLight(f.now) };
    step(f, BEAT);
    const flyttat = !!fp.task && fp.task.act === 'fiske' && Math.hypot(fp.task.tx - fx, fp.task.ty - fy) > 1.5;
    return [
      [`fiskaren går till en annan plats när stranden är utfiskad (${f.stat?.fiskeByter ?? 0} byten)`, flyttat && (f.stat?.fiskeByter ?? 0) === 1],
      [`ett bad räknas vid sjön intill stranden (${SIM.sjoNamn(b, SIM.sjoVid(b, bx, by))}) och hos den som badade`, badSjo?.bad === 1 && badSjo.badare[bp.id] === 1 && badSjo.log[0]?.k === 'bad'],
      [`${sj.rutor.length} sjöar, varje ruta vatten hör till en, den största först (${SIM.sjoNamn(s, 0)})`, vatten && storst && SIM.sjoNamn(s, 0) === 'Sjön'],
      [`alla fiskeförsök räknas vid en sjö (${sum('forsok')} av ${s.stat?.fiskeForsok ?? 0} på sex dygn, sex år i spelet)`, sum('forsok') > 0 && sum('forsok') === (s.stat?.fiskeForsok ?? 0)],
      [`napp och fångade fiskar stämmer med byns och personernas räkning (${sum('napp')} napp, ${sum('fisk')} fiskar)`, sum('napp') === (s.stat?.fiskeNapp ?? 0) && sum('fisk') === fangst && fangst > 0],
      [`fångsterna och baden per person summerar till sjöns (${sum('bad')} bad)`, perPers],
      ['historiken är högst SJO_LOGG händelser per sjö', st.every(x => x.log.length <= SIM.SJO_LOGG)],
    ];
  },
};

SCENARIER.kaniner = {
  text: 'Kaninerna finns i några få små grupper som håller ihop, där kartan är hög och långt från byn. En jagad grupp krymper och kommer tillbaka på en ny plats, och jakten ger bara något nära en grupp',
  kor: () => {
    const s = createState(6, START);
    klockan(s);
    // några dygn, en gång i timmen: hur många grupper, hur stora, hur nära byn och hur nära varandra i gruppen
    let flest = 0, minst = 99, storst = 0, naraByn = 0, spridda = 0, kaniner = 0, battre = 0, samre = 0, hopp = 0, prov = 0;
    const forst = new Map<number, number>(), fore = s.now;
    for (let h = 0; h < 72; h++) {
      const gs = grupperOf(s), dj = djurOf(s);
      // efter inläsning (en kopia utan cache) är grupperna på samma ställe (natur-29, natur-41)
      if (h % 6 === 5) { prov++; const k = grupperOf(cloneState(s)); if (k.length !== gs.length || gs.some((g, j) => Math.hypot(g.x - k[j].x, g.y - k[j].y) > 1e-6)) hopp++; }
      flest = Math.max(flest, gs.length);
      for (const g of gs) {
        minst = Math.min(minst, g.n); storst = Math.max(storst, g.n);
        const v = vaxerAt(s, 'jakt', tileOf(g.x, g.y));
        if (!forst.has(g.id)) forst.set(g.id, v); else if (v >= forst.get(g.id)! - 1e-9) battre++; else samre++;
      }
      for (const d of dj) {
        kaniner++;
        if (campDist(s, Math.floor(d.x), Math.floor(d.y)) < FANGST.skyggIn) naraByn++;
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
    const k = g0.id % KANINER.grupper, n0 = g0.n;
    for (let i = 0; i < 200 && grupperOf(s).find(g => g.id === g0.id)!.n > 0; i++) takeFrom(s, 'jakt', g0.x + (i % 5) - 2, g0.y + Math.floor(i / 5) % 5 - 2, 0.5); // jägare runt om gruppen
    const efter = grupperOf(s).find(g => g.id === g0.id)!.n;
    let ny: { id: number; x: number; y: number; n: number } | undefined;
    for (let h = 0; h < 24 && !ny; h++) { s.now += HOUR; ny = grupperOf(s).find(g => g.id % KANINER.grupper === k && g.id !== g0.id); }
    const flyttad = ny ? Math.hypot(ny.x - g0.x, ny.y - g0.y) : 0;
    return [
      [`högst ${KANINER.grupper} grupper (som mest ${flest}), med ${KANINER.storlek[0]}–${KANINER.storlek[1]} kaniner i varje (${minst}–${storst})`, flest <= KANINER.grupper && flest >= 3 && minst >= KANINER.storlek[0] && storst <= KANINER.storlek[1]],
      [`ingen kanin närmare byn än ${FANGST.skyggIn} rutor (${naraByn} av ${kaniner})`, kaniner > 0 && naraByn === 0],
      [`grupperna står still när spelet läses in (${hopp} av ${prov} gånger flyttade)`, prov > 0 && hopp === 0],
      [`kaninerna håller ihop i sin grupp (${spridda} av ${kaniner} mer än 3 rutor från gruppen)`, spridda <= kaniner * 0.02],
      [`grupperna rör sig mot bättre platser på kartan (${battre} timmar lika bra eller bättre, ${samre} sämre)`, battre > samre * 3],
      [`jakten ger mycket mer nära en grupp (${vidGrupp.toFixed(2)}) än på en rik plats långt från grupperna (${langtBort.toFixed(2)})`, tom >= 0 && vidGrupp > langtBort * 3],
      [`en jagad grupp krymper (${n0} → ${efter} kaniner)`, efter === 0 && n0 > 0],
      [`och kommer tillbaka på en ny plats (${flyttad.toFixed(0)} rutor bort, ${ny?.n ?? 0} kaniner)`, !!ny && flyttad > 5 && ny.n >= KANINER.storlek[0]],
    ];
  },
};

SCENARIER.rotter = {
  text: 'Bär och rötter är olika slag i egna stackar; på sommaren samlar man mycket bär, i istiden bara rötter',
  kor: () => {
    // det som samlats av varje slag (byns statistik), i fyra byar: det som bärs hem äts snart upp, så förrådet säger lite (steg 2.12.9)
    const andel = (vecka: number) => [7, 8, 9, 10].map(n => enBy(n, vecka)).reduce((a, x) => ({ b: a.b + x.b, r: a.r + x.r, skild: a.skild && x.skild }));
    const enBy = (seed: number, vecka: number) => {
      const s = createState(seed, START);
      s.kal = nyKalender(s.now, (vecka + 1) % 4);
      setMat(s, { grillkott: 300 }); // grillat kött äts före bär och rötter, så det man samlar blir kvar (och ingen blir sjuk av rått)
      kor(s, 48);
      const b = s.stat?.samlat_bar ?? 0, r = s.stat?.samlat_rotter ?? 0;
      return { b, r, skild: !pilesOf(s).some(p => p.k === 'bar' && p.n > p.max + 1e-6) }; // i en förvaring ryms flera stackar på rutan
    };
    const sommar = andel(1), istid = andel(3);
    return [
      [`både bär och rötter samlas (sommar ${sommar.b.toFixed(1)} bär, ${sommar.r.toFixed(1)} rötter)`, sommar.b > 0 && sommar.r > 0],
      [`i istiden mest rötter (${istid.r.toFixed(0)} rötter mot ${istid.b.toFixed(0)} bär)`, istid.r > istid.b],
      // rötternas andel räknas på platsen före uttaget (motor-9): annars blir en del av rötterna bär
      [`i istiden växer inga bär, så allt som samlas är rötter (${istid.b.toFixed(4)} bär)`, istid.r > 0 && istid.b < 1e-9],
      // en buske töms helt sedan steg 2.12.4, så bär och rötter tas i den mängd de växer: ungefär hälften var på sommaren
      [`på sommaren är en stor del bär (${(sommar.b / (sommar.b + sommar.r) * 100).toFixed(0)} %)`, sommar.b > 0.35 * (sommar.b + sommar.r)],
      [`bär och rötter i egna stackar, och ingen bärstack rymmer mer än ${STACK.bar} (mer i en förvaring)`, sommar.skild && istid.skild],
    ];
  },
};

SCENARIER.samlartur = {
  text: 'En samlare fyller en full börda på 10–20 minuter, gången inräknad, och går vidare till nästa buske när den man står vid är tom (steg 2.12.4)',
  kor: () => {
    // turerna följs i steg om 10 sekunder (ett slag är fem minuter, kortare än en tur), i tre byar under två dygn (två år i spelet).
    // Byarna har ingen mat men gott om trä, så att de samlar mat: sedan det vilda blev sällsyntare (steg 3.10.23.7) samlade de annars
    // nästan bara tändmaterial de första dygnen
    const borda = balansTal().steg.borda as number, turer: { min: number; lass: number; flytt: number }[] = [];
    let tomt = 0, arbete = 0;
    for (const seed of [42, 7, 3]) {
      const s = createState(seed, START), pagar = new Map<number, { t0: number; last: string; lass: number; flytt: number; tom?: string }>();
      setMat(s, {}); setAmount(s, 'ved', 300);
      for (let i = 0; i < 48 * 360; i++) {
        step(s, 10);
        for (const p of living(s)) {
          const t = p.task, u = pagar.get(p.id), samla = t?.act === 'samla' && !t.sok;
          if (u && (!samla || (u.last === 'back' && t!.phase !== 'back'))) { if (u.last === 'back') turer.push({ min: (s.now - u.t0) / 60000, lass: u.lass, flytt: u.flytt }); pagar.delete(p.id); }
          if (!samla) continue;
          const v = u && pagar.has(p.id) ? u : { t0: s.now, last: t.phase, lass: 0, flytt: 0 };
          pagar.set(p.id, v);
          if (t.phase === 'go' && v.last === 'do') v.flytt++;
          // tom här: två som samlar vid samma buske märker det först i nästa steg när den andra tog det sista, så det räknas när man står kvar längre
          const tomNu = t.phase === 'do' && richness(s, 'samla', t.tx, t.ty) < PLATS.tomtGrans && !(t.tandmat && tinderShort(s, t)), plats = `${t.tx},${t.ty}`;
          if (t.phase === 'do') { arbete++; if (tomNu && v.tom === plats) tomt++; }
          v.tom = tomNu ? plats : undefined;
          if (t.phase === 'back') v.lass = load(t, s) / Math.min(capacity(s, p) * borda, bordPlats(s, p));
          v.last = t.phase;
        }
      }
    }
    const med = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1] ?? NaN;
    const min = med(turer.map(t => t.min)), lass = med(turer.map(t => t.lass)), vidare = turer.filter(t => t.flytt > 0).length;
    return [
      [`en tur tar 10–20 minuter, gången inräknad (median ${min.toFixed(1)} minuter av ${turer.length} turer)`, turer.length >= 20 && min >= 10 && min <= 20],
      [`man bär hem en full börda (median ${(lass * 100).toFixed(0)} %)`, lass >= 0.9],
      [`man går vidare till nästa buske när den är tom (${vidare} av ${turer.length} turer)`, vidare >= turer.length / 2],
      [`ingen står kvar vid en tom buske längre än ett steg (10 sekunder), utom den som samlar tändmaterial till elden (${tomt} av ${arbete} gånger)`, arbete > 0 && tomt === 0],
    ];
  },
};

SCENARIER.varmekarta = {
  text: 'Värmekartorna: bär i små snår som står kvar, svamp i skogen, rötter glest på ungefär hälften av marken även på vintern, kaniner helst i gräs och borta från folk, fisk i vattnet och flinta vid stenarna. Inget växer i lägret, mönstren kryper med tiden, uttag tömmer platsen som växer tillbaka, och den som ser en plockad plats vet att den växer tillbaka',
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
    for (let i = 0; i < W * H; i++) if (land(i) && campDist(s, i % W, Math.floor(i / W)) >= FANGST.lagerR) { if (vaxerAt(s, 'rotter', i) > 0) rotLand++; if (vaxerAt(s, 'rotter', i) > rotTopp * 0.5) rotRik++; }
    vid(0); const rotVinter = summa('rotter'), barVinter = summa('bar'); vid(3);
    // kaninerna håller sig borta från lägret och från platser där folk trampat
    const sk0 = skyggOf(s);
    let nara = 0, naraN = 0, langt = 0, langtN = 0;
    for (let i = 0; i < W * H; i++) if (land(i)) { const d = campDist(s, i % W, Math.floor(i / W)); if (d >= FANGST.lagerR && d < FANGST.skyggIn) { nara += sk0[i]; naraN++; } else if (d > FANGST.skyggIn + FANGST.skyggR) { langt += sk0[i]; langtN++; } }
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
    for (let i = 0; i < W * H; i++) if (campDist(s, i % W, Math.floor(i / W)) < FANGST.lagerR) for (const k of FYND_IDS) if (k !== 'fiske' && fyndAt(s, k, i) > 0) iLagret++;
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
    const barKvar = kvar('bar', 28, 1), kaninKvar = kvar('jakt', 28, 0.6 * FANGST.jaktFaktor), barSenare = kvar('bar', 280, 1);
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
    for (let n = 0; n < 200 && findL(r2, 'samla', aa)!.v > 2; n++) share(s, q, r2, { op: 60 } as never, SAMTALSSLAG['berättelse']);
    const spridd = findL(r2, 'samla', aa)!.v;
    // att berätta om en plats ändrar inte när den sågs, och den som hör det får samma tid (återväxten räknas därifrån). Den som
    // redan trodde något om platsen väger ihop tiderna som värdet, efter hur säkra de är (steg 2.12.5)
    const [t1, t2, t3] = living(s).slice(2, 5), sedd = s.now - 5 * DAY;
    t1.lardomar = [{ k: 'samla', a: aa, v: 0.2, g: 3, c: 0.9, t: sedd, led: 0 }]; t2.lardomar = [];
    t3.lardomar = [{ k: 'samla', a: aa, v: 1, g: 3, c: 0.05, t: s.now - DAY, src: p.id, led: 2 }];
    for (let n = 0; n < 200 && !findL(t2, 'samla', aa); n++) share(s, t1, t2, { op: 60 } as never, SAMTALSSLAG['berättelse']);
    for (let n = 0; n < 200 && findL(t3, 'samla', aa)!.led !== 1; n++) share(s, t1, t3, { op: 60 } as never, SAMTALSSLAG['berättelse']);
    const tidKvar = t1.lardomar[0].t === sedd && findL(t2, 'samla', aa)?.t === sedd, t3t = findL(t3, 'samla', aa)!.t;
    const vagd = t3t > sedd && t3t < s.now - 3 * DAY, t3d = (s.now - t3t) / DAY; // mellan de två tiderna, närmast den säkrare
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
      // sedan steg 3.10.23.7 på ungefär hälften så många rutor som förut, då nästan överallt
      [`rötter glest på ungefär hälften av marken (${Math.round(rotLand / jord * 100)} %, ${Math.round(rotRik / jord * 100)} % rik), kvar på vintern (${rotVinter.toFixed(0)}) när bären är borta (${barVinter.toFixed(0)})`, rotLand / jord > 0.35 && rotLand / jord < 0.75 && rotRik / jord < 0.3 && rotVinter > 20 && barVinter < 1],
      [`kaninerna skyr lägret (${(nara / naraN).toFixed(2)} nära mot ${(langt / langtN).toFixed(2)} långt bort)`, nara / naraN < 0.4 && langt / langtN > 0.7],
      [`den som kommer till en tömd plats rättar sig ("${qText}") och berättar det (${spridd.toFixed(2)} hos den som hörde det)`, rattad && qText.includes('sämre än man trott') && spridd < 2],
      ['att berätta om en plats ändrar inte när den sågs, och den som hör det får samma tid', tidKvar],
      [`den som redan trodde något väger ihop tiderna efter hur säkra de är (${t3d.toFixed(1)} dygn sedan, av 5 och 1)`, vagd],
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

SCENARIER.natur = {
  text: 'Maten sätter taket (steg 1.7.2): byn minns hur gott om mat den haft det senaste året. Är maten knapp föds färre barn, fler flyttar och färre nybyggare stannar, men en liten by flyttar inte för maten',
  kor: () => {
    const s = createState(5, START), n0 = s.people.length, mat = () => setMat(s, { torrkott: living(s).reduce((t, p) => t + kroppensMat(p, s.now), 0) * 12 }); // torkat kött, som hinner ätas innan det ruttnar (steg 3.10.9)
    mat(); s.matSnitt = 0.9; // tolv dygns mat i förrådet, men ett knappt år bakom sig
    const fore = barnMat(s, 12), flytt = flyttLitenBy(s);
    for (let t = 0; t < 3 * STEG_DYGN; t++) { regulate(s, BEAT); if (s.people.length !== n0) { s.people.length = n0; mat(); } } // (nybyggare skickas vidare)
    const efter = s.matSnitt!;
    // foodDays: aldrig mindre än kroppen behöver, och mer när byn äter mer (atTakt, ekonomi.ts)
    mat(); const kropp = living(s).reduce((t, p) => t + kroppensMat(p, s.now), 0) / living(s).length, dagar = { kropp: foodDays(s), mer: 0, mindre: 0 };
    s.atTakt = kropp * 2; dagar.mer = foodDays(s); s.atTakt = kropp / 2; dagar.mindre = foodDays(s); s.atTakt = undefined;
    return [
      [`ett knappt år: färre barn (${fore.toFixed(2)} av det vanliga) och fler flyttar (${hungerFlytt({ ...s, matSnitt: 0.9 } as State, 12).toFixed(2)} per dygn) i en by på 12`, fore < 0.5 && hungerFlytt({ ...s, matSnitt: 0.9 } as State, 12) > 0.5],
      [`en by på sex flyttar inte för maten och får lika många barn (${flytt})`, flytt === 'ingen'],
      [`efter tre dygn (tre år i spelet) med tolv dygns mat har snittet nått dit (${efter.toFixed(1)})`, efter > 11 && efter < 12.1],
      [`gott om mat: inga färre barn, ingen flytt för maten (${matGott(s).toFixed(2)})`, matGott(s) === 1 && barnMat(s, 12) === 1 && hungerFlytt(s, 12) === 0],
      [`maten räknas i dygn av det byn äter (steg 2.12.4): ${dagar.kropp.toFixed(1)} dygn efter kroppen, ${dagar.mer.toFixed(1)} när byn äter dubbelt så mycket, ${dagar.mindre.toFixed(1)} när den äter hälften`, Math.abs(dagar.kropp - 12) < 0.1 && Math.abs(dagar.mer - dagar.kropp / 2) < 1e-9 && dagar.mindre === dagar.kropp],
    ];
  },
};

SCENARIER.slaktbank = {
  text: 'Slaktbänken (steg 2.2.3) byggs av trä av den som kommit på den (steg 2.2.11). Vid den slaktas viltet och rensas fisken, och en kniv hör till bänken och ligger kvar där. Viltet slaktas bara vid bänken; innan den finns äts det som det är. Också fisken rensas bara vid bänken (steg 2.2.8). Jaktfärdigheten avgör hur mycket kött en kanin ger. Vargen ger eget kött och skinn men samma ben (steg 3.7.14)',
  kor: () => {
    const { STATION, STATIONER, stationerOf, stationFor, isKlar, vidStation, tommaKnivplatser, stepStationer, kottFaktor, addTool, take, tidyTools, placeTools, usable, spotFor, tingOf, BYN, REDSKAP } = SIM;
    // en by där alla kan göra en kniv och slaktbänken, med gott om mat och trä: bänken byggs
    const s = createState(1, START); klockan(s); tandEld(s);
    for (const r of s.people) r.tek = { ...r.tek, kniv: 1, slaktbank: 1 };
    setMat(s, { bar: 200 }); setAmount(s, 'ved', 60); setAmount(s, 'flinta', 3); setAmount(s, 'grenar', 10);
    const ved0 = amountOf(s, 'ved');
    let h = 0, byggare = '';
    while (!stationerOf(s).some(isKlar) && h < 48) { kor(s, 1, v => { for (const r of living(v)) if (r.task?.act === 'station') byggare = r.task.why ?? ''; }); h++; }
    const st = stationerOf(s)[0], klar = !!st && isKlar(st);
    const logg = s.log.some(l => l.text.includes('första slaktbänk'));
    const sz = st ? SIM.storlekAv(st) : { w: 0, h: 0 }, rutor = Array.from({ length: sz.w * sz.h }, (_, i) => ({ x: st!.x + i % sz.w, y: st!.y + Math.floor(i / sz.w) }));
    const avElden = st ? Math.min(...rutor.map(r => SIM.byAvstand(s, r.x, r.y))) : 0; // till lägret och husen (steg 2.10.16)
    const bredd = STATIONER.slaktbank.w, ingenAnnan = !!st && rutor.every(r => !usable(s, r.x, r.y) && SIM.stationAt(s, r.x, r.y) === st) && !SIM.stationAt(s, st.x + sz.w, st.y);
    const enda = stationerOf(s).length === 1;
    // en kniv blir bänkens: den är byns och ligger vid bänken
    const p = living(s).find(r => ageOf(r, s.now) >= 18)!;
    const tomma = tommaKnivplatser(s);
    if (klar && tomma) { const k = addTool(s, 'kniv', p); k.agare = BYN; stepStationer(s); }
    const bankKniv = tingOf(s).find(k => k.k === 'kniv' && k.vid === st?.id);
    const ligger = !!bankKniv && bankKniv.x === st.x && bankKniv.y === st.y && bankKniv.agare === BYN && tommaKnivplatser(s) === 0;
    // den som slaktar tar bänkens kniv om hen inte har en egen, och kniven läggs tillbaka vid bänken
    for (const k of tingOf(s)) if (k.k === 'kniv' && k !== bankKniv) k.agare = BYN, k.vid = undefined, k.c = 0; // (bara bänkens kniv är hel)
    s.ting = tingOf(s).filter(k => k.k !== 'kniv' || k === bankKniv);
    p.task = { act: 'slakta', phase: 'do', tx: 0, ty: 0, until: s.now + HOUR, carry: 0, why: 'prov', dark: false, tool: 'kniv' };
    const tog = take(s, p, 'kniv') === bankKniv;
    p.task = undefined; tidyTools(s); placeTools(s);
    const tillbaka = !!bankKniv && bankKniv.hos === undefined && bankKniv.x === st?.x && bankKniv.y === st?.y;
    // slakten och rensningen görs vid bänken. Utan bänk slaktas och rensas inget (viltet och abborren ligger kvar och äts som de är)
    const vid = st ? vidStation(st) : { x: 0, y: 0 };
    const vidBank = (['slakta', 'rensa'] as const).every(a => { const o = spotFor(s, a, p); return stationFor(s, a) === st && Math.abs(o.y - vid.y) < 1e-9 && Math.abs(o.x - vid.x) <= 0.3 * bredd + 1e-9; }); // längs bänkens bredd
    const u = createState(1, START), uq = living(u).find(r => ageOf(r, u.now) >= 18)!;
    for (const r of u.people) r.tek = { ...r.tek, kniv: 1 };
    setAmount(u, 'kniv', 1); tidyTools(u); setMat(u, { vilt: 3 * KANIN, abborre: 3 });
    const ingenSlakt = !canProcess(u, uq, DJUR.kanin) && !canProcess(u, uq, DJUR.abborre);
    bearbeta(u, uq, DJUR.kanin, 1);
    bearbeta(u, uq, DJUR.abborre, 1);
    const kvar = Math.abs(amountOf(u, 'vilt') - 3 * KANIN) < 1e-9 && amountOf(u, 'kott') < 1e-9 && Math.abs(amountOf(u, 'abborre') - 3) < 1e-9 && amountOf(u, 'fisk') < 1e-9;
    // jaktfärdigheten: mer kött för den som jagat mycket
    const kott = (jakt: number) => { p.skill.jakt = jakt; setMat(s, { vilt: 3 * KANIN }); bearbeta(s, p, DJUR.kanin, 1); return amountOf(s, 'kott'); };
    const ny = kott(0), van = kott(REDSKAP.kottFull);
    // vargen (steg 3.7.14): eget kött och skinn, samma ben
    setMat(s, { vilt: 0 }); const k0 = amountOf(s, 'kott'), b0 = amountOf(s, 'ben'), vk0 = amountOf(s, 'vargkott');
    setAmount(s, 'varg', 1); bearbeta(s, p, DJUR.varg, 1);
    const varg = { kott: amountOf(s, 'vargkott') - vk0, skinn: amountOf(s, 'vargskinn'), ben: amountOf(s, 'ben') - b0 };
    const vargOk = amountOf(s, 'varg') === 0 && varg.kott >= DJUR.varg.slakt.vargkott * REDSKAP.kottMin - 1 && varg.skinn === 1 && varg.ben === DJUR.varg.slakt.ben && amountOf(s, 'kott') === k0;
    const kottOk = ny === 3 * Math.max(1, Math.round(SLAKT.kott * REDSKAP.kottMin)) && van === 3 * Math.max(1, Math.round(SLAKT.kott * REDSKAP.kottMax)) && van > ny && Math.abs(kottFaktor(p) - REDSKAP.kottMax) < 1e-9; // i hela saker (steg 2.10.7)
    return [
      [`slaktbänken byggs av ${STATION.slaktbankTra} trä på ${h} timmar av den som kan göra en kniv (${byggare})`, klar && enda && ved0 - amountOf(s, 'ved') >= STATION.slaktbankTra - 1e-9 && byggare.includes(STATIONER.slaktbank.bygger)],
      ['den första slaktbänken står i loggen', logg],
      [`bänken står i byns utkant (${avElden.toFixed(1)} rutor från lägret och husen) och tar ${bredd} rutor, där inget annat får ligga`, avElden >= SIM.STATION.utkantMin && avElden <= SIM.STATION.slaktTill && ingenAnnan],
      [`en kniv hör till bänken, är byns och ligger kvar där (${tomma ? 'en ny kniv lades där' : 'en kniv ur förrådet flyttades dit när bänken blev klar'})`, ligger],
      ['den som slaktar utan egen kniv tar bänkens, och den läggs tillbaka vid bänken', tog && tillbaka],
      ['viltet slaktas och fisken rensas vid bänken', vidBank],
      ['utan bänk slaktas och rensas inget: viltet och abborren ligger kvar att ätas som de är', ingenSlakt && kvar],
      [`en fälld varg slaktas till ${varg.kott} vargkött, ${varg.skinn} vargskinn och ${varg.ben} ben (benen är samma sak som kaninens; steg 3.7.14)`, vargOk],
      [`jaktfärdigheten avgör köttet: ${ny.toFixed(2)} kött av tre kaniner för den ovane, ${van.toFixed(2)} för den vane`, kottOk && van > ny],
    ];
  },
};

SCENARIER.flatarbank = {
  text: 'Slöjdbänken (steg 2.2.4) byggs av trä och grenar av den som kommit på den (steg 2.2.11). Vid den tvinnas rep fortare än för hand vid elden, de enkla redskapen görs där lite fortare (Björn, efter v90), och korgen flätas bara där. Handarbetet är alltid något bestämt som tar material och ger en sak',
  kor: () => {
    const { STATION, STATIONER, stationerOf, stationFor, isKlar, vidStation, spotFor, twineRope, wantsTool, thinkWhileWorking, startWork, MIN } = SIM;
    // en by där alla kan tvinna rep och slöjdbänken men ingen kan göra en kniv, med gott om mat, trä, grenar och hö: slöjdbänken byggs
    const s = createState(1, START); klockan(s); tandEld(s); medHus(s); // slöjdbänken står inne (steg 2.2.5)
    for (const r of s.people) r.tek = { rep: 1, flatarbank: 1 };
    setMat(s, { bar: 200 }); setAmount(s, 'ved', 60); setAmount(s, 'grenar', 30); setAmount(s, 'torrgras', 40); setAmount(s, 'flinta', 3);
    const ved0 = amountOf(s, 'ved');
    let h = 0, byggare = '', hantverk = 0, tvinnar = 0;
    while (!stationerOf(s).some(isKlar) && h < 72) { kor(s, 1, v => { for (const r of living(v)) if (r.task?.act === 'station') byggare = r.task.why ?? ''; }); h++; }
    const st = stationerOf(s).find(isKlar), klar = !!st && st.k === 'flatarbank';
    const logg = s.log.some(l => l.text.includes('första slöjdbänk'));
    const tog = ved0 - amountOf(s, 'ved') >= STATION.flatarbankTra - 1e-9; // (grenarna plockas samtidigt, så de räknas inte här)
    // korgen: utan bänk vill ingen fläta en, med bänken görs den där
    const u = createState(1, START), uq = living(u).find(r => ageOf(r, u.now) >= 18)!;
    for (const r of u.people) r.tek = { korg: 1 };
    setAmount(u, 'torrgras', 40);
    const utanBank = !wantsTool(u, uq, 'korg');
    medBank(u, 'flatarbank');
    const bank = stationFor(u, 'korg')!, vid = vidStation(bank), o = spotFor(u, 'korg', uq);
    const medBank_ = wantsTool(u, uq, 'korg') && Math.hypot(o.x - vid.x, o.y - vid.y) < 0.5;
    // rep: dubbelt så fort vid bänken som för hand vid elden
    const rep = (vidBanken: boolean) => {
      const w = createState(1, START), q = living(w).find(r => ageOf(r, w.now) >= 18)!;
      q.tek = { rep: 1 }; setAmount(w, 'torrgras', 40); setAmount(w, 'rep', 0);
      medBank(w, 'flatarbank');
      const p0 = vidBanken ? vidStation(w.stationer![0]) : getMap(w.seed).fire;
      q.x = p0.x; q.y = p0.y + (vidBanken ? 0 : 1);
      twineRope(w, q, 0.1); // sex minuter: ett och ett halvt rep för hand sedan steg 2.3.8
      return amountOf(w, 'rep') + (q.delar?.rep ?? 0); // och arbetet mot nästa hela rep (steg 2.10.7)
    };
    const hand = rep(false), vidB = rep(true);
    // de enkla redskapen (Björn, efter v90): kniven görs vid bänken om byn har en, och lite fortare där
    const kniv = (bank: boolean) => {
      const w = createState(1, START), q = living(w).find(r => ageOf(r, w.now) >= 18)!;
      q.tek = { kniv: 1 }; setAmount(w, 'flinta', 10); setAmount(w, 'grenar', 10);
      if (bank) medBank(w, 'flatarbank');
      const o = spotFor(w, 'kniv', q), vid = bank ? vidStation(w.stationer![0]) : undefined;
      q.x = o.x; q.y = o.y;
      const tk = { act: 'kniv' as SIM.Act, phase: 'do' as const, tx: o.x, ty: o.y, until: 0, carry: 0 };
      startWork(w, q, tk);
      return { tid: (tk.until - w.now) / MIN, vid: !vid || Math.hypot(o.x - vid.x, o.y - vid.y) < 0.5 };
    };
    const kElden = kniv(false), kBank = kniv(true);
    // en vanlig by tills någon tvinnar rep, högst tio dygn (tio år i spelet): inget handarbete utan sak, och rep tvinnas som en egen handling
    const v = createState(3, START); // en by som kommer på repet tidigt (by 2 kom inte på det inom tio dygn i v75, by 3 inte i v156, by 5 inte i v159)
    let dygn = 0;
    for (; dygn < 10 && !tvinnar; dygn++) kor(v, 24, w => { for (const r of living(w)) { if (r.task?.act === 'hantverk') hantverk++; if (r.task?.act === 'tvinna') tvinnar++; } });
    // att tvinna rep är hantverk: den som gör det kommer på det som hör till hantverket (kniven)
    const t = createState(1, START), tq = living(t).find(r => ageOf(r, t.now) >= 18)!;
    tq.tek = { rep: 1 }; setAmount(t, 'flinta', 3);
    thinkWhileWorking(t, tq, 'tvinna', 3600);
    const tankt = (tq.tek.kniv ?? 0) > 0;
    return [
      [`slöjdbänken byggs av ${STATION.flatarbankTra} trä och ${STATION.flatarbankGrenar} grenar på ${h} timmar av den som kommit på den (${byggare})`, klar && tog && byggare.includes(STATIONER.flatarbank.bygger)],
      ['den första slöjdbänken står i loggen', logg],
      ['utan slöjdbänk flätas ingen korg; med den flätas korgen vid bänken', utanBank && medBank_],
      [`rep tvinnas fortare vid bänken (${vidB.toFixed(2)} på sex minuter) än för hand vid elden (${hand.toFixed(2)})`, Math.abs(vidB - hand * STATION.repFart) < 1e-9 && hand > 0],
      [`en kniv görs vid bänken om byn har en, på ${kBank.tid.toFixed(1)} minuter i stället för ${kElden.tid.toFixed(1)} vid elden`, kBank.vid && kElden.tid > 0 && Math.abs(kBank.tid * STATION.redskapFart - kElden.tid) < 1e-6],
      [`inget handarbete utan sak på ${dygn} dygn (${hantverk} gånger), och rep tvinnas (${tvinnar} gånger)`, hantverk === 0 && tvinnar > 0],
      ['att tvinna rep ger tankar om det som hör till hantverket', tankt],
    ];
  },
};

SCENARIER.stationsteknik = {
  text: 'Varje station är en teknik i teknikträdet som byn måste komma på innan den kan byggas (steg 2.2.11): slaktbänken efter kniven, slöjdbänken efter repet och korgen efter slöjdbänken. En station som redan står i en sparad by kan byggas av dem som kunde det som räckte förut',
  kor: () => {
    const { STATIONER, STATION_LIST, TEK, kanBygga, thinkWhileWorking, knows, migrate, SPARVERSION } = SIM;
    // en storlek av en annan station (de större borden, steg 2.2.15) har den stationens teknik
    const register = STATION_LIST.every(k => { if ((STATIONER[k] as SIM.StationDef).brasa) return !STATIONER[k].tek.length; const tk = STATIONER[k].tek[0]; return STATIONER[k].tek.length === 1 && !!TEK[tk] && (tk === k || (STATIONER as Record<string, SIM.StationDef>)[tk]?.tek[0] === tk); });
    const ordning = TEK.slaktbank.krav.includes('kniv') && TEK.flatarbank.krav.includes('rep') && TEK.korg.krav.includes('flatarbank');
    // den som kan kniven men inte slaktbänken bygger ingen; när hen kommit på den kan hen
    const s = createState(1, START); klockan(s); tandEld(s); medHus(s);
    const p = living(s).find(r => ageOf(r, s.now) >= 18)!;
    setMat(s, { bar: 200 }); setAmount(s, 'ved', 60); setAmount(s, 'grenar', 30); setAmount(s, 'flinta', 3);
    p.tek = { kniv: 1, rep: 1 };
    const utan = !kanBygga(s, p, 'slaktbank') && !kanBygga(s, p, 'flatarbank');
    p.tek = { kniv: 1, rep: 1, slaktbank: 1, flatarbank: 1 };
    const med = kanBygga(s, p, 'slaktbank') && kanBygga(s, p, 'flatarbank');
    // jägaren med kniv kommer på slaktbänken när det finns en kniv och trä i byn; den som tvinnar rep kommer på slöjdbänken
    const q = createState(1, START), j = living(q).find(r => ageOf(r, q.now) >= 18)!;
    j.pot.nyfikenhet = j.pot.intelligens = 16; j.tek = { kniv: 1, rep: 1 };
    setAmount(q, 'ved', 20); setAmount(q, 'grenar', 20); setAmount(q, 'kniv', 1); SIM.tidyTools(q);
    for (let i = 0; i < 400 && !(knows(j, 'slaktbank') && knows(j, 'flatarbank')); i++) { thinkWhileWorking(q, j, 'jakt', 600); thinkWhileWorking(q, j, 'tvinna', 600); }
    const kommer = knows(j, 'slaktbank') && knows(j, 'flatarbank');
    // korgen kommer man inte på utan slöjdbänken
    const k = createState(1, START), kq = living(k).find(r => ageOf(r, k.now) >= 18)!;
    kq.pot.nyfikenhet = kq.pot.intelligens = 16; kq.tek = { rep: 1 }; setAmount(k, 'torrgras', 40);
    for (let i = 0; i < 400; i++) thinkWhileWorking(k, kq, 'samla', 600);
    const ingenKorg = (kq.tek.korg ?? 0) === 0;
    // en sparad by från före steget med en slaktbänk: de som kan kniven kan bygga den
    const g = createState(1, START), gp = living(g).find(r => ageOf(r, g.now) >= 18)!, gn = living(g).find(r => r !== gp)!;
    gp.tek = { kniv: 1 }; gn.tek = {};
    const at = SIM.stationSite(g, 'slaktbank')!;
    (g.stationer ??= []).push({ id: 1, k: 'slaktbank', x: at.x, y: at.y, kvar: 0 });
    g.v = 4; migrate(g);
    const sparad = knows(gp, 'slaktbank') && !knows(gn, 'slaktbank') && g.v === SPARVERSION;
    return [
      ['varje station är en teknik med samma namn, och tekniken är det som krävs för att bygga den (brasan kräver ingen)', register],
      ['slaktbänken kommer efter kniven, slöjdbänken efter repet och korgen efter slöjdbänken', ordning],
      ['den som kan kniven och repet men inte stationerna bygger ingen; med teknikerna kan hen', utan && med],
      ['den som jagar med kniv och tvinnar rep kommer på slaktbänken och slöjdbänken', kommer],
      ['korgen kommer man inte på utan slöjdbänken', ingenKorg],
      ['i en sparad by med en slaktbänk kan de som kan kniven bygga den', sparad],
      ['varje teknik har en nivå (steg 2.12.9): 1 utan krav, annars ett mer än det högsta den kräver, och det finns ett mål i dygn för varje nivå', SIM.TEKNIK.every(t => t.niva === (t.krav.length ? 1 + Math.max(...t.krav.map(k => TEK[k].niva)) : 1) && t.niva <= SIM.TEKTAL.nivaDygn.length && t.tid > 0)],
      ['trädet på bredden (steg 2.12.7): grillen efter slaktbänken, torkställningen efter grillen, hyllorna efter bordet, metspöet efter träspjutet, skinndörren och skinnfällen efter skinnkläderna', ([['grill', 'slaktbank'], ['tork', 'grill'], ['hylla', 'bord'], ['metspo', 'fiskespjut'], ['skinndorr', 'skinnklader'], ['skinnfall', 'skinnklader']] as const).every(([t, k]) => TEK[t].krav.includes(k))],
    ];
  },
};

SCENARIER.mobler = {
  text: 'Möblerna (steg 2.2.5): halmbädden bäddas av hö och grenar inne i ett hus där man sover, och den som sover i den vilar upp sig fortare. Slöjdbänken står inne, slaktbänken ute, och en station kan stå vriden. Det som står inne tar golvrutor men aldrig en sovplats som någon behöver, och försvinner om huset rivs; en slöjdbänk som byggdes ute förut står kvar tills ett hus har plats för den',
  kor: () => {
    const { STATION, STATIONER, KROPP, stationerOf, stationSite, stationAt, stationRutor, storlek, isKlar, bedTile, homeless, sovplatser, viloTak, stepStationer, roomAt, PROJEKT } = SIM;
    // en by med en sovsal där alla kan bädda en halmbädd och har hö och grenar: bädden byggs inne i huset
    const s = createState(1, START); klockan(s); tandEld(s);
    const hus = medHus(s)!;
    const rum = () => SIM.gridOf(s).rooms.filter(r => r.hus === hus.id);
    const platser0 = rum().reduce((n, r) => n + sovplatser(s, r), 0), hemlos0 = homeless(s);
    const utanBank = !stationSite(createState(1, START), 'flatarbank'); // utan hus finns ingen plats för slöjdbänken
    for (const r of s.people) r.tek = { ...r.tek, halmbadd: 1 };
    setMat(s, { bar: 200 }); setAmount(s, 'torrgras', 40); setAmount(s, 'grenar', 30); setAmount(s, 'ved', 30);
    const brist0 = PROJEKT.halmbadd!.brist(s);
    let h = 0;
    while (!stationerOf(s).some(t => t.k === 'halmbadd' && isKlar(t)) && h < 72) { kor(s, 1); h++; }
    const b = stationerOf(s).find(t => t.k === 'halmbadd' && isKlar(t));
    const { w, h: bh } = b ? SIM.storlekAv(b) : { w: 0, h: 0 };
    let inne = !!b && b.inne === 1;
    for (let j = 0; b && j < bh; j++) for (let i = 0; i < w; i++) inne &&= roomAt(s, b.x + i, b.y + j)?.hus === hus.id;
    const tog = amountOf(s, 'torrgras') <= 40 - STATION.halmbaddHo + 1e-9;
    // en sovplats per bädd: rutorna den tar är inga andra sovplatser, och den första som sover i huset får bädden
    const platser1 = rum().reduce((n, r) => n + sovplatser(s, r), 0);
    const tar = stationerOf(s).reduce((n, t) => { const z = SIM.storlekAv(t); return n + z.w * z.h - (isKlar(t) ? 1 : 0); }, 0); // en halvbäddad är ingen sovplats än
    const W_ = SIM.W, head = b ? b.y * W_ + b.x : -1;
    const sover = living(s).find(q => bedTile(s, q) === head);
    let vilan: string | undefined;
    if (sover) {
      const q = SIM.cloneState(s), p = living(q).find(r => r.id === sover.id)!;
      p.x = b!.x + 0.5; p.y = b!.y + 0.5; p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: q.now + HOUR, carry: 0 } as SIM.Task;
      vilan = viloTak(q, p, roomAt(q, p.x, p.y));
    }
    // fler bäddar så länge det finns plats: ingen förlorar sin sovplats
    for (let i = 0; i < 20 && stationSite(s, 'halmbadd'); i++) medBank(s, 'halmbadd');
    const baddar = stationerOf(s).filter(t => t.k === 'halmbadd').length, hemlos1 = homeless(s);
    // slöjdbänken: bara inne, med golv framför sig, och inte där en bädd står
    const bank = stationSite(s, 'flatarbank');
    const bankInne = !bank || ('inne' in bank && !!roomAt(s, bank.x, bank.y));
    // vriden: bredd och djup byter plats, och rutorna följer med
    const v = createState(1, START);
    const rot = storlek('slaktbank', 1);
    (v.stationer ??= []).push({ id: 1, k: 'slaktbank', x: 10, y: 10, kvar: 0, rot: 1 }); SIM.touch(v);
    const vriden = rot.w === STATIONER.slaktbank.h && rot.h === STATIONER.slaktbank.w && stationAt(v, 10, 12)?.id === 1 && !stationAt(v, 11, 10);
    // rivs huset försvinner det som stod inne; en slöjdbänk ute från förut står kvar när inget hus har plats
    const r = SIM.cloneState(s);
    const ute = stationSite(createState(1, START), 'slaktbank')!;
    (r.stationer ??= []).push({ id: 99, k: 'flatarbank', x: ute.x, y: ute.y, kvar: 0 });
    r.byggen = SIM.bitsOf(r).filter(q => q.hus !== hus.id); r.hus = SIM.housesOf(r).filter(q => q.id !== hus.id); SIM.touch(r);
    stepStationer(r);
    const rivet = !stationerOf(r).some(t => t.inne) && stationerOf(r).some(t => t.id === 99) && stationRutor(r).sov.size === 0;
    return [
      [`halmbädden bäddas av hö och grenar inne i sovsalen på ${h} timmar`, !!b && inne && tog],
      [`bädden tar ${w * bh} golvrutor men är en sovplats (${platser0} sovplatser före, ${platser1} efter med ${stationerOf(s).length} bäddar, klara och påbörjade)`, !!b && platser1 === platser0 - tar],
      [`den som sover i bädden vilar fortare (${vilan ?? 'ingen sover där'}: ${KROPP.restBadd} mot ${KROPP.restGolv} på golvet)`, vilan === 'restBadd' && KROPP.restBadd > KROPP.restGolv],
      [`byn vill ha bäddar när man sover utan (brist ${brist0.toFixed(2)})`, brist0 > 0],
      [`bäddarna tar aldrig en sovplats som någon behöver (${baddar} bäddar; ${hemlos0} utan sovplats före, ${hemlos1} efter)`, hemlos1 <= hemlos0 && baddar >= 1],
      ['slöjdbänken står bara inne: utan hus finns ingen plats för den', utanBank && bankInne],
      ['en station kan stå vriden, och rutorna följer med', vriden],
      ['rivs huset försvinner det som stod inne, men slöjdbänken ute står kvar när inget hus har plats', rivet],
    ];
  },
};

SCENARIER.ivagen = {
  text: 'Möbler på rätt plats (steg 3.10.1): en möbel (här ett bord) som står framför en arbetsstation, där man står och arbetar, flyttas, och likaså en halmbädd i ett hus ingång (rutan innanför öppningen); nya bäddar läggs aldrig där. I testläget går det att flytta en station och ta bort den',
  kor: () => {
    const { stationerOf, framfor, framFri, stationAt, stepStationer, stationSite, bitAt, roomAt, storlek, storlekAv, taBortStation, flyttaStation } = SIM;
    const s = createState(1, START); klockan(s); tandEld(s);
    const hus = medHus(s)!, bank = medBank(s, 'slaktbank'), fram = framfor(bank);
    const nytt = (t: Omit<SIM.Station, 'id'>) => { const b = { id: s.nextStation = (s.nextStation ?? 0) + 1, ...t }; s.stationer!.push(b); SIM.touch(s); return b; };
    const rutor = (t: { k: string; x: number; y: number; rot?: unknown }) => { const { w, h } = storlek(t.k, t.rot); return Array.from({ length: w * h }, (_, i) => ({ x: t.x + i % w, y: t.y + Math.floor(i / w) })); };
    const iIngang = (t: SIM.Station) => rutor(t).some(q => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => bitAt(s, q.x + dx, q.y + dy)?.k === 'oppning'));
    const framAlla = () => new Set(stationerOf(s).flatMap(t => framfor(t).map(q => q.y * SIM.W + q.x)));
    const iVag = (t: SIM.Station) => rutor(t).some(q => framAlla().has(q.y * SIM.W + q.x));
    // nya bäddar så länge det finns plats (i en kopia): ingen i ingången eller framför en station
    const s0 = cloneState(s);
    for (let i = 0; i < 20 && stationSite(s0, 'halmbadd'); i++) medBank(s0, 'halmbadd');
    const baddar = stationerOf(s0).filter(t => t.k === 'halmbadd');
    // ett bord framför slaktbänken, som i en by som sparades före v144: bänken går inte att använda
    const b1 = nytt({ k: 'bord', x: fram[0].x, y: fram[0].y, kvar: 0 });
    const blockerad = !framFri(s, bank);
    // en halmbädd i ingången: på rutan innanför husets öppning
    const opp = SIM.bitsOf(s).find(q => q.hus === hus.id && q.k === 'oppning')!;
    const inn = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: opp.x + dx, y: opp.y + dy })).find(q => roomAt(s, q.x, q.y)?.hus === hus.id)!;
    const kand: { x: number; y: number; rot?: 1 }[] = [{ x: inn.x, y: inn.y }, { x: inn.x - 1, y: inn.y }, { x: inn.x, y: inn.y, rot: 1 }, { x: inn.x, y: inn.y - 1, rot: 1 }];
    const at2 = kand.find(q => rutor({ k: 'halmbadd', ...q }).every(r => roomAt(s, r.x, r.y)?.hus === hus.id && !stationAt(s, r.x, r.y)))!;
    const b2 = nytt({ k: 'halmbadd', x: at2.x, y: at2.y, kvar: 0, inne: 1, ...at2.rot ? { rot: 1 as const } : {} });
    const iIngang0 = iIngang(b2);
    for (const p of living(s)) { p.x = 1.5; p.y = 1.5; } // ingen står på bäddarna
    for (let i = 0; i < 3; i++) stepStationer(s);
    const kvar1 = stationerOf(s).find(t => t.id === b1.id), kvar2 = stationerOf(s).find(t => t.id === b2.id);
    const loggat = s.log.filter(r => /flyttades eftersom|togs isär eftersom den stod/.test(r.text)).length;
    // testläget: flytta slaktbänken till en ledig plats, inte ut i vattnet, och ta bort den
    const q = cloneState(s), bq = q.stationer!.find(t => t.id === bank.id)!, m = getMap(q.seed), f = SIM.eldPlats(q);
    const vatten = Array.from({ length: W * H }, (_, i) => i).find(i => m.tiles[i] === T.Vatten)!;
    const iVattnet = !flyttaStation(q, bq, vatten % W, Math.floor(vatten / W));
    let flyttad: { x: number; y: number } | undefined;
    for (let r = 6; r < 20 && !flyttad; r++) for (let dx = -r; dx <= r && !flyttad; dx++) {
      const x = f.x + dx, y = f.y + r;
      if (flyttaStation(q, bq, x, y)) flyttad = { x, y };
    }
    const dar = !!flyttad && stationAt(q, flyttad.x, flyttad.y)?.id === bank.id && bq.x === flyttad.x && bq.y === flyttad.y;
    taBortStation(q, bq);
    const borta = !stationerOf(q).some(t => t.id === bank.id) && !stationAt(q, bq.x, bq.y);
    const { w: bw } = storlekAv(bank);
    return [
      [`ett bord framför slaktbänken gör att bänken inte går att använda`, blockerad],
      [`bordet framför bänken flyttas (${kvar1 ? `till ${kvar1.x}, ${kvar1.y}${kvar1.inne ? ', inne' : ''}` : 'togs isär'}), och bänken går att använda`, (!kvar1 || !iVag(kvar1)) && framFri(s, bank)],
      [`bädden i ingången flyttas (${iIngang0 ? 'stod i ingången' : 'stod inte där'}; ${kvar2 ? `nu ${kvar2.x}, ${kvar2.y}` : 'togs isär'})`, iIngang0 && (!kvar2 || !iIngang(kvar2))],
      [`händelseloggen säger varför (${loggat} rader, statistiken ${s.stat?.['station i vägen'] ?? 0})`, loggat >= 2 && (s.stat?.['station i vägen'] ?? 0) >= 2],
      [`nya bäddar läggs aldrig i ingången eller framför en station (${baddar.length} bäddar)`, baddar.length >= 2 && baddar.every(t => !iIngang(t) && rutor(t).every(r => !framfor(bank).some(q => q.x === r.x && q.y === r.y)))],
      [`testläget: slaktbänken (${bw} rutor bred) går inte att flytta ut i vattnet men till en ledig plats${flyttad ? ` (${flyttad.x}, ${flyttad.y})` : ''}`, iVattnet && dar],
      ['testläget: slaktbänken går att ta bort', borta],
    ];
  },
};

SCENARIER.skinnfall = {
  text: 'Skinnfällen (steg 2.2.14): ett tillbehör till halmbädden, en egen teknik som byn kommer på efter halmbädden när den har skinn. Den görs av skinn när byn har bäddar utan fäll, och den som sover under den kyls hälften så mycket',
  kor: () => {
    const { STATION, TILLBEHOR, TEK, PROJEKT, varmeDelar, roomAt } = SIM;
    // en by med ett hus och en halmbädd, där alla kan göra en skinnfäll och har skinn
    const s = createState(1, START); klockan(s); tandEld(s);
    const b = medBank(s, 'halmbadd');
    for (const r of s.people) r.tek = { ...r.tek, halmbadd: 1, skinnfall: 1 };
    setMat(s, { bar: 200 }); setAmount(s, 'skinn', 10); setAmount(s, 'ved', 30);
    const brist0 = PROJEKT.skinnfall!.brist(s);
    let h = 0;
    while (!b.med?.includes('skinnfall') && h < 72) { kor(s, 1); h++; }
    // ibland hinner byn bygga en bädd till och göra en fäll i den också: varje fäll tar sitt skinn och räknas en gång
    const fallar = SIM.stationerOf(s).filter(t => t.med?.includes('skinnfall')).length;
    const tog = Math.abs(amountOf(s, 'skinn') - (10 - STATION.fallSkinn * fallar)) < 0.5; // (skinnet slits lite under tiden)
    const brist1 = PROJEKT.skinnfall!.brist(s);
    // kylan för den som sover i bädden, med och utan fällen
    const kyla = (med: boolean) => {
      const q = cloneState(s), t = q.stationer!.find(r => r.id === b.id)!, p = living(q)[0];
      t.med = med ? ['skinnfall'] : undefined;
      p.x = t.x + 0.5; p.y = t.y + 0.5; p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: q.now + HOUR, carry: 0 } as SIM.Task;
      return varmeDelar(q, p, 1, new Map([[roomAt(q, p.x, p.y)!.id, 1]])).kyla;
    };
    const med = kyla(true), utan = kyla(false);
    // den som är vaken i bädden får ingen hjälp av fällen
    const q = cloneState(s), p = living(q)[0];
    p.x = b.x + 0.5; p.y = b.y + 0.5; p.task = { act: 'samtal', phase: 'do', tx: p.x, ty: p.y, until: q.now + HOUR, carry: 0 } as SIM.Task;
    const vaken = SIM.tillbehorVarme(q, p, roomAt(q, p.x, p.y));
    const tek = TEK.skinnfall;
    return [
      [`byn vill ha en skinnfäll när bädden saknar en (brist ${brist0.toFixed(2)}, ${brist1.toFixed(2)} efter)`, brist0 === 1 && brist1 < brist0],
      [`skinnfällen görs av ${STATION.fallSkinn} skinn och läggs i bädden på ${h} timmar`, !!b.med?.includes('skinnfall') && tog],
      [`byns statistik räknar varje fäll en gång (${s.stat?.tillbehor_skinnfall ?? 0} för ${fallar})`, s.stat?.tillbehor_skinnfall === fallar],
      [`den som sover under fällen kyls mindre (${med.toFixed(3)} mot ${utan.toFixed(3)} i timmen)`, utan > 0 && Math.abs(med - utan * (1 - TILLBEHOR.skinnfall.varme)) < 1e-9],
      ['den som är vaken i bädden får ingen värme av fällen', vaken === 0],
      ['skinnfällen är en egen teknik efter halmbädden, och byn måste ha skinn', !!tek && tek.krav.includes('halmbadd') && materialOf(tek).some(g => g.includes('skinn'))],
    ];
  },
};

SCENARIER.bord = {
  text: 'Bord och stubbar (steg 2.2.15): en egen teknik med tre storlekar (4, 8 och 10 platser). Byn bygger den storlek som räcker åt dem som saknar en plats, och vid bordet äter man tillsammans, blir glad av det och samtalar',
  kor: () => {
    const { STATION, TEK, PROJEKT, bordStorlek, bordPlatser, platserAv, stationerOf, isKlar, usable } = SIM;
    // en by där alla kan bygga bord och det finns gott om trä och mat
    const s = createState(1, START); klockan(s); tandEld(s);
    for (const r of s.people) r.tek = { ...r.tek, bord: 1 };
    setMat(s, { bar: 300 }); setAmount(s, 'ved', 40);
    const n = living(s).length, k0 = bordStorlek(s)!, brist0 = PROJEKT[k0]!.brist(s), andra = ['bord', 'bord2', 'bord3'].filter(k => k !== k0).every(k => PROJEKT[k]!.brist(s) === 0);
    let h = 0;
    const bordet = () => stationerOf(s).find(t => isKlar(t) && platserAv(t.k) > 0);
    while (!bordet() && h < 96) { kor(s, 1); h++; }
    const b = bordet();
    const pl = b ? bordPlatser(b) : [], tomma = pl.every(q => !usable(s, q.x, q.y));
    const brist1 = PROJEKT[k0]!.brist(s);
    // ett dygn med bordet: måltider och samtal vid det, och aldrig två på samma plats
    const plats = new Set(pl.map(q => q.y * W + q.x));
    let samtal = 0, krock = 0;
    const mal0 = s.stat?.bordMal ?? 0;
    for (let i = 0; i < 48; i++) {
      kor(s, 0.5);
      const vid = living(s).filter(p => p.task && plats.has(Math.floor(p.task.ty) * W + Math.floor(p.task.tx)) && ['maltid', 'samtal', 'beratta'].includes(p.task.act));
      samtal += vid.filter(p => p.task!.act !== 'maltid' && p.task!.phase === 'do').length;
      if (new Set(vid.map(p => Math.floor(p.task!.ty) * W + Math.floor(p.task!.tx))).size < vid.length) krock++;
    }
    const mal = (s.stat?.bordMal ?? 0) - mal0, glada = living(s).filter(p => p.thoughts.some(t => t.text === 'Åt vid bordet')).length;
    const tek = TEK.bord;
    return [
      [`byn vill ha ${SIM.stationDef(k0)?.namn.toLowerCase()} (${platserAv(k0)} platser åt ${n}, brist ${brist0.toFixed(2)}), inte de andra storlekarna`, brist0 === 1 && andra && platserAv(k0) >= Math.min(n, 10)],
      [`bordet byggs på ${h} timmar, med ${pl.length} stubbar runt där inget annat får stå`, !!b && b.k === k0 && pl.length === platserAv(k0) && tomma],
      [`byns statistik räknar bordet en gång (${s.stat?.['station_' + k0] ?? 0}), och sedan har alla en plats (brist ${brist1.toFixed(2)})`, s.stat?.['station_' + k0] === 1 && brist1 === 0],
      [`man äter vid bordet (${mal} måltider på ett dygn) och blir glad av det (${glada} av ${living(s).length})`, mal >= 3 && glada >= 1],
      [`man samtalar vid bordet (${samtal} gånger någon satt där och pratade)`, samtal > 0],
      [`aldrig två på samma plats (${krock} gånger)`, krock === 0],
      [`stubbarna kostar trä (${STATION.stubbeTra} var), och bordet är en egen teknik efter timmerhuset`, !!tek && tek.krav.includes('timmervagg') && (SIM.stationDef('bord')?.av.ved ?? 0) > STATION.bordTra * 2],
    ];
  },
};

SCENARIER.dorr = {
  text: 'Skinndörren (steg 2.2.16): en hud som hängs i dörröppningen till ett hus där man bor eller umgås. Den är en egen teknik efter timmerhuset, görs av skinn och släpper ut mindre värme än en öppen dörr',
  kor: () => {
    const { BYGGNAD, DORRAR, TEK, PROJEKT, dorrOppningar, insulation, roomAt, bitsOf, gridOf } = SIM;
    // en by med ett färdigt hus där alla kan hänga en skinndörr och har skinn
    const s = createState(1, START); klockan(s); tandEld(s);
    const hus = medHus(s)!;
    for (const r of s.people) r.tek = { ...r.tek, skinndorr: 1 };
    setMat(s, { bar: 200 }); setAmount(s, 'skinn', 10); setAmount(s, 'ved', 30);
    const brist0 = PROJEKT.skinndorr!.brist(s), oppning = bitsOf(s).find(b => b.hus === hus.id && b.k === 'oppning')!;
    let h = 0;
    while (!oppning.dorr && h < 72) { kor(s, 1); h++; }
    const tog = Math.abs(amountOf(s, 'skinn') - (10 - DORRAR.skinndorr.av.skinn)) < 0.5; // (skinnet slits lite under tiden)
    const brist1 = PROJEKT.skinndorr!.brist(s);
    // huset håller värmen bättre med dörren
    const rum = gridOf(s).rooms.find(r => r.hus === hus.id && r.tiles.length)!, med = insulation(s, rum);
    const q = cloneState(s); bitsOf(q).find(b => b.id === oppning.id)!.dorr = undefined; SIM.touch(q);
    const utan = insulation(q, roomAt(q, rum.tiles[0] % W, Math.floor(rum.tiles[0] / W))!);
    // ett förrådshus behöver ingen dörr
    const f = cloneState(s); SIM.housesOf(f).find(r => r.id === hus.id)!.fn = 'forrad';
    const tek = TEK.skinndorr;
    return [
      [`byn vill ha en skinndörr när huset har en öppen dörröppning (brist ${brist0.toFixed(2)}, ${brist1.toFixed(2)} efter)`, brist0 === 1 && brist1 < brist0],
      [`skinndörren görs av ${DORRAR.skinndorr.av.skinn} skinn och hängs i öppningen på ${h} timmar`, oppning.dorr === 'skinndorr' && tog],
      [`byns statistik räknar dörren en gång (${s.stat?.dorr_skinndorr ?? 0})`, s.stat?.dorr_skinndorr === 1],
      [`huset håller värmen bättre med dörren (${Math.round(med * 100)} % mot ${Math.round(utan * 100)} %)`, Math.abs(med - utan - BYGGNAD.oppningLacker * DORRAR.skinndorr.tat) < 1e-3], // (kopian avrundar väggarnas skick)
      ['ett förrådshus får ingen dörr', dorrOppningar(f).length === 0],
      ['skinndörren är en egen teknik efter timmerhuset, och byn måste ha skinn', !!tek && tek.krav.includes('timmervagg') && materialOf(tek).some(g => g.includes('skinn'))],
    ];
  },
};

SCENARIER.blod = {
  text: 'Blodet (blod.ts, Björn efter v93): registren BLODFORM (pöl, stänk, droppar, släpspår) och BLOD (slakt, skada, blödning, förblödning, jakt). Slaktbänken blir blodig, nytt blod läggs i fläckarna nära och rinner över när det blir mycket, och fläckarna bleknar bort på ett par dygn. Bara utseende: blodet rör inte slumpen',
  kor: () => {
    const { MIN, BLODFORM, BLODET, blodOf, blodNu, blodas, blodDroppar, blodVid, smutsa, STATIONER, tidyTools, storlekAv } = SIM;
    const s = createState(1, START); klockan(s); tandEld(s);
    for (const r of s.people) r.tek = { ...r.tek, kniv: 1, slaktbank: 1, rep: 0 };
    const t = medBank(s), p = living(s).find(r => ageOf(r, s.now) >= 18)!;
    setAmount(s, 'kniv', 1); tidyTools(s);
    const { w, h } = storlekAv(t);
    const nara = (b: SIM.Blodflack) => b.x >= t.x - 1.5 && b.x <= t.x + w + 1.5 && b.y >= t.y - 0.5 && b.y <= t.y + h + 1.5;
    // fisken rensas vid samma bänk men blöder inte
    setMat(s, { abborre: 3 }); bearbeta(s, p, DJUR.abborre, 1);
    const rensaRent = blodOf(s).length === 0 && amountOf(s, 'fisk') > 0;
    // slakten gör en pöl och stänk vid bänken
    setMat(s, { vilt: 3 * KANIN }); bearbeta(s, p, DJUR.kanin, 1);
    const fl = blodOf(s), slakt = fl.some(b => b.f === 'pol') && fl.some(b => b.f === 'stank') && fl.every(nara);
    const vid = blodVid(s, t, w, h);
    // fläckarna bleknar jämnt och är borta efter bleknar timmar
    const f0 = fl[0]!, b = BLODFORM[f0.f].bleknar * HOUR;
    const bleknar = Math.abs(blodNu(f0, f0.t + b / 2) - 0.5) < 1e-9 && blodNu(f0, f0.t + b + 1) === 0;
    // mycket blod på samma ställe: fläckarna växer, och pölar som blir för stora rinner över till nya bredvid
    const rng0 = JSON.stringify(s.rngs), st0 = JSON.stringify(s.stat), x0 = t.x + 1.5, y0 = t.y + 1.5;
    const u = createState(2, START); u.now = s.now;
    const orort0 = (b: SIM.State) => JSON.stringify([b.rngs, b.stat]), u0 = orort0(u);
    blodas(u, x0, y0, 'slakt', 1); const en = blodOf(u).length;
    for (let k = 0; k < 12; k++) { u.now += 10 * MIN; blodas(u, x0, y0, 'slakt', 1); }
    const pol = blodOf(u).filter(q => q.f === 'pol'), yta = Math.max(...pol.map(q => Math.hypot(q.x - x0, q.y - y0)));
    const over = pol.length > 1 && pol.every(q => q.m <= BLODFORM.pol.max + 1e-9) && yta > 0.5 && blodOf(u).length < 13 * en;
    // nytt blod på en gammal fläck gör den färskare
    const g = createState(3, START); g.now = s.now;
    blodas(g, 5, 5, 'forblodning', 1); g.now += 24 * HOUR; const gam = blodNu(blodOf(g)[0]!, g.now);
    blodas(g, 5, 5, 'forblodning', 1); const farsk = blodNu(blodOf(g)[0]!, g.now) > gam;
    // skadan, blödningen, förblödningen och jakten lägger blod där personen står
    const q = createState(4, START); q.now = s.now; const v = living(q)[0]!;
    v.skador = []; SIM.skada(q, v, 'handH', 'skarsar', 0.4, 'olycka', 'vid testet');
    const skada = blodOf(q).some(r => r.f === 'stank' && Math.hypot(r.x - v.x, r.y - v.y) < 1);
    const q0 = orort0(q), n0 = blodOf(q).length; q.now += 30 * MIN; blodDroppar(q, v, 0.3, 30 * 60);
    const droppar = blodOf(q).some(r => r.f === 'droppar') && blodOf(q).length > n0;
    blodas(q, v.x, v.y, 'jakt', 1, 0); const jakt = blodOf(q).some(r => r.f === 'spar' && r.a === 0);
    // de bortbleknade tas bort när nya kommer, aldrig fler än max, och slumpen och statistiken rörs inte
    s.now += 3 * 24 * HOUR; smutsa(s, 'slakta', 1);
    const rensat = blodOf(s).every(r => blodNu(r, s.now) > 0) && blodOf(s).length <= 3;
    for (let k = 0; k < BLODET.max + 50; k++) { q.now += MIN; blodas(q, (k * 7) % 60, (k * 3) % 40, 'blodning', 1); }
    const tak = blodOf(q).length <= BLODET.max;
    const orort = JSON.stringify(s.rngs) === rng0 && JSON.stringify(s.stat) === st0 && orort0(u) === u0 && orort0(q) === q0;
    // bara slaktbänken smutsar ner med blod, och blodet följer med när byn sparas
    const andra = (Object.keys(STATIONER) as (keyof typeof STATIONER)[]).filter(k => k !== 'slaktbank' && (STATIONER[k] as SIM.StationDef).smutsar).length === 0;
    const sparad = JSON.stringify(cloneState(u).blod) === JSON.stringify(u.blod);
    // i en by som lever: bänken blir blodig av sig själv när det finns vilt att slakta
    const l = createState(1, START); klockan(l); tandEld(l);
    for (const r of l.people) r.tek = { ...r.tek, kniv: 1, slaktbank: 1 };
    medBank(l); setAmount(l, 'kniv', 2); tidyTools(l); setMat(l, { vilt: 6 * KANIN, bar: 100 }); setAmount(l, 'ved', 40);
    let h2 = 0; while (!blodOf(l).length && h2 < 24) { kor(l, 1); h2++; }
    return [
      ['rensningen av fisken gör inget blod', rensaRent],
      [`slakten gör en pöl och stänk vid bänken (${fl.length} fläckar)`, slakt],
      [`stationsfliken ser blodet: ${Math.round(vid * 100)} %`, vid > 0],
      ['fläckarna bleknar jämnt och är borta efter sin tid i BLODFORM', bleknar],
      [`mycket blod rinner över till nya pölar bredvid (${pol.length} pölar, ${yta.toFixed(1)} rutor ut) men samma ställe ger inte en ny fläck varje gång`, over],
      ['nytt blod på en gammal fläck gör den färskare', farsk],
      ['en skada blöder där man står, och den som blöder tappar droppar', skada && droppar],
      ['jakten lägger ett släpspår åt det håll som sägs', jakt],
      [`de bortbleknade tas bort, och aldrig fler än ${BLODET.max} fläckar`, rensat && tak],
      ['blodet rör varken slumpen eller statistiken', orort],
      ['bara slaktbänken smutsar ner', andra],
      ['blodet följer med när byn sparas', sparad],
      [`i en by där det slaktas blir bänken blodig av sig själv (efter ${h2} timmar)`, blodOf(l).length > 0],
    ];
  },
};

SCENARIER.utkant = {
  text: 'Byns utkant (steg 2.10.16 och 2.10.21): slaktbänken står en bit från byn eftersom den är smutsig, och latringropen alltid ganska långt bort. Avståndet räknas till lägret (elden och lagerplatserna) och till husen, så att det som står i utkanten flyttar ut när byn växer',
  kor: () => {
    const { stationSite, byAvstand, STATION } = SIM;
    const rader: [string, boolean][] = [];
    let slakt = true, latrin = true, langre = true, hus = true;
    for (const seed of [1, 3, 42]) {
      const s = createState(seed, START);
      const b = stationSite(s, 'slaktbank'), l = stationSite(s, 'latrin');
      const db = b ? byAvstand(s, b.x, b.y) : -1, dl = l ? byAvstand(s, l.x, l.y) : -1;
      slakt &&= db >= STATION.slaktAvst - 1 && db <= STATION.slaktTill;
      latrin &&= dl >= STATION.latrinAvst - 1 && dl <= STATION.latrinTill;
      langre &&= dl > 5; // förr låg gropen 3–5 rutor från lägret
      // ett hus där latrinen skulle ha legat: den flyttar så att den står lika långt från huset
      if (l) {
        (s.hus ??= []).push({ id: 99, namn: 'Hus', x: l.x - 1, y: l.y - 1, w: 3, h: 3 });
        const l2 = stationSite(s, 'latrin');
        hus &&= !!l2 && byAvstand(s, l2.x, l2.y) >= STATION.latrinAvst - 1 && Math.max(Math.abs(l2.x - l.x), Math.abs(l2.y - l.y)) > 2;
      }
    }
    rader.push([`slaktbänken står ${STATION.slaktAvst - 1}–${STATION.slaktTill} rutor från byn`, slakt]);
    rader.push([`latringropen står ${STATION.latrinAvst - 1}–${STATION.latrinTill} rutor från byn, längre bort än förr`, latrin && langre]);
    rader.push(['avståndet räknas också till husen: ett hus där gropen skulle ligga flyttar ut den', hus]);
    return rader;
  },
};

SCENARIER.latrin = {
  text: 'Toa-smuts och latriner (steg 2.7.2): den som går på toa utanför en latrin lämnar en fläck som bleknar på två dygn. Den äcklar den som går förbi, man plockar inte där, och nära vattnet smutsar den vattnet. Latrinen är en grop i byns utkant som grävs med benspaden: man går dit, får vara ifred och lämnar ingen fläck, gropen fylls och fylls igen, och byn gräver en ny. Får någon ont i magen av toa-smutsat vatten lär sig byn att lägga latrinen långt från vattnet. Benspaden görs av tre ben, ett rep och en gren och gräver fram rötter fortare',
  kor: () => {
    const { flackarOf, toaBesok, akel, toaNara, toaVatten, vattenSmuts, smutsOf, forSmutsigt, magont, latrinFor, latrinBrist, stationSite, byAvstand, STATION, shoreOf, tidyTools, stationerOf, isKlar } = SIM;
    const s = createState(1, START); klockan(s); tandEld(s);
    const [p, q] = living(s).filter(r => ageOf(r, s.now) >= 18) as [SIM.Person, SIM.Person];
    // utan latrin: en fläck där p står, som äcklar den som går förbi
    const rng0 = JSON.stringify(s.rngs);
    toaBesok(s, p);
    const i = tileOf(p.x, p.y), fl = flackarOf(s), flack = fl.length === 1 && fl[0]!.k === 'toa' && fl[0]!.i === i && s.stat?.['toafläckar'] === 1;
    Object.assign(q, { x: p.x + 1, y: p.y, task: undefined }); q.thoughts = [];
    akel(s, q);
    const akelQ = q.thoughts.some(t => t.text === 'Äcklad av smuts');
    p.thoughts = []; p.task = { act: 'toa' } as SIM.Person['task']; akel(s, p); const sjalv = !p.thoughts.length; p.task = undefined;
    const plock = forSmutsigt(s, Math.floor(p.x), Math.floor(p.y)) && !forSmutsigt(s, Math.floor(p.x) + 4, Math.floor(p.y));
    const rngOrord = JSON.stringify(s.rngs) === rng0;
    // toa-högen är en sak som går att trycka på (steg 2.10.5): den vet vem som lämnade den, hur länge den ligger kvar och vad den gör
    const th = SIM.toaAt(s, Math.floor(p.x), Math.floor(p.y)), ti = th && SIM.toaInfo(s, th);
    const hog = SAKER.toa?.mark === true && th?.av === p.id && !!ti && ti.n === 1 && ti.kvar === 48 && ti.akel && ti.plock;
    // fläcken bleknar bort på två dygn
    const t0 = s.now; s.now += 49 * HOUR; const bleknat = toaNara(s, i) === 0; s.now = t0;
    // nära vattnet blir vattnet smutsigare, och den som får ont i magen av det lär byn något om hygien
    const sh = shoreOf(s.seed); let strand = -1; for (let j = 0; j < W * H; j++) if (sh[j]) { strand = j; break; }
    const v0 = vattenSmuts(s, strand);
    Object.assign(p, { x: strand % W + 0.5, y: Math.floor(strand / W) + 0.5 }); toaBesok(s, p);
    const v1 = vattenSmuts(s, strand), vatten = v1 > v0 && toaVatten(s, strand) > 0 && v0 === smutsOf(s.seed)[strand];
    magont(s, strand);
    const hygien = (s.hygien ?? 0) > 0 && s.stat?.['magont av toa-smuts'] === 1;
    // när byn kan hygien läggs latrinen längre från vattnet
    const tillVatten = (b: SIM.State, at?: { x: number; y: number }) => { if (!at) return -1; const m = getMap(b.seed); let d = 99; for (let j = 0; j < W * H; j++) if (m.tiles[j] === T.Vatten) d = Math.min(d, Math.hypot(j % W - at.x, Math.floor(j / W) - at.y)); return d; };
    const u0 = createState(3, START), u1 = cloneState(u0); u1.hygien = 1;
    const d0 = tillVatten(u0, stationSite(u0, 'latrin')), d1 = tillVatten(u1, stationSite(u1, 'latrin'));
    const at = stationSite(u0, 'latrin'), utkant = !!at && byAvstand(u0, at.x, at.y) >= STATION.utkantMin && byAvstand(u0, at.x, at.y) <= STATION.latrinTill;
    // latrinen: man går dit, lämnar ingen fläck, gropen fylls och fylls igen
    const l = createState(1, START); klockan(l); tandEld(l);
    const lat = medBank(l, 'latrin'), lp = living(l).find(r => ageOf(r, l.now) >= 18)!;
    const gar = latrinFor(l, lp)?.id === lat.id && latrinBrist(l) === 0;
    Object.assign(lp, { x: lat.x + 0.5, y: lat.y + 1.5 }); lp.thoughts = [];
    toaBesok(l, lp, lat.id);
    const ifred = !flackarOf(l).length && (lat.fyllt ?? 0) > 0 && lp.thoughts.some(t => t.text === 'Fick vara ifred') && l.stat?.latrinbesok === 1;
    lat.fyllt = STATION.latrinNy; const brist = latrinBrist(l) === 1;
    lat.fyllt = 1 - 0.5 / STATION.latrinRymmer; toaBesok(l, lp, lat.id);
    const igen = !stationerOf(l).some(t => t.id === lat.id) && l.stat?.['latriner fyllda'] === 1 && groundOf(l).cover[lat.y * W + lat.x] === 0 && latrinFor(l, lp) === undefined;
    const sparad = (() => { const k = createState(1, START), t = medBank(k, 'latrin'); t.fyllt = 0.3; toaBesok(k, k.people[0]!); const c = cloneState(k); return c.stationer?.find(x => x.id === t.id)?.fyllt === 0.3 && JSON.stringify(c.flackar) === JSON.stringify(k.flackar); })();
    // benspaden: en teknik efter slaktbänken och repet, görs av tre ben, ett rep och en gren, och gräver fram rötter fortare
    const tb = SIM.TEKNIK.find(t => t.id === 'benspade'), tl = SIM.TEKNIK.find(t => t.id === 'latrin');
    const tek = !!tb && tb.krav.includes('slaktbank') && tb.krav.includes('rep') && !!tl && tl.krav.includes('benspade');
    const av = SAKER.benspade?.skaffa?.av, recept = av?.ben === 3 && av?.rep === 1 && av?.grenar === 1;
    const rotter = (SIM.ACTS.samla.redskap as Record<string, { rotter?: number }>).benspade?.rotter ?? 1;
    // i en by som lever: med benspaden och tekniken gräver byn en latrin och går dit, och spaden slits
    const b = createState(1, START); klockan(b); tandEld(b);
    for (const r of b.people) r.tek = { ...r.tek, benspade: 1, latrin: 1 };
    setAmount(b, 'benspade', 1); tidyTools(b); setMat(b, { bar: 100 }); setAmount(b, 'ved', 40);
    let h = 0; while (!stationerOf(b).some(t => t.k === 'latrin' && isKlar(t)) && h < 48) { kor(b, 1); h++; }
    const byggd = stationerOf(b).some(t => t.k === 'latrin' && isKlar(t));
    kor(b, 24);
    const besok = b.stat?.latrinbesok as number ?? 0;
    return [
      [`toabesöket utanför en latrin lämnar en fläck där man står`, flack],
      ['den som står bredvid blir äcklad, men inte den som själv är på toa', akelQ && sjalv],
      ['man plockar inte på eller bredvid fläcken', plock],
      ['fläckarna rör inte byns slumpföljder', rngOrord],
      ['toa-högen är en sak som vet vem som lämnade den, hur länge den ligger kvar och vad den gör', hog],
      ['fläcken bleknar bort på två dygn (två år i spelet, två dagar i verkligheten)', bleknat],
      [`en fläck på stranden gör vattnet smutsigare (${v0.toFixed(2)} → ${v1.toFixed(2)})`, vatten],
      [`ont i magen av toa-smutsat vatten lär byn hygien (${(s.hygien ?? 0).toFixed(2)})`, hygien],
      [`latrinen ligger i byns utkant, och längre från vattnet när byn kan hygien (${d0.toFixed(1)} → ${d1.toFixed(1)} rutor)`, utkant && d1 > d0],
      ['den som går på toa går till latrinen', gar],
      ['i latrinen blir det ingen fläck, gropen fylls och man får vara ifred', ifred],
      ['byn vill ha en ny latrin när den är nästan full', brist],
      ['en full latrin fylls igen och blir bar jord', igen],
      ['latrinen och fläckarna följer med när byn sparas', sparad],
      ['benspaden är en teknik efter slaktbänken och repet, och latrinen en teknik efter benspaden', tek],
      ['benspaden görs av tre ben, ett rep och en gren', recept],
      [`med benspaden gräver man fram ${rotter} gånger så mycket rötter`, rotter > 1],
      [`i en by med benspaden grävs en latrin (efter ${h} timmar), och den används (${besok} besök på ett dygn)`, byggd && besok > 0],
    ];
  },
};
SCENARIER.grill = {
  text: 'Grillställningen och matlagningen (steg 2.8.1): grillen sätts upp över elden av grenar och rep och används bara när elden brinner. Där grillas fiskkött, abborre och kött till grillad fisk och grillat kött, som håller längre och äts först. En ovan kock bränner en del, en skicklig ingenting, och färdigheten Matlagning växer vid grillen. Rått kött och rå fisk gör en lite sur och kan ge matförgiftning; rå växtmat gör inget',
  kor: () => {
    const { MATLAG, kanGrilla, grilla, grillVara, ratt, brannDel, stationSite, stationRutor, FOOD } = SIM;
    const s = createState(1, START); klockan(s); tandEld(s);
    const f = getMap(s.seed).fire, at = stationSite(s, 'grill');
    const over = !!at && at.x === f.x - 1 && at.y === f.y;
    const [p, q] = living(s).filter(r => ageOf(r, s.now) >= 18) as [SIM.Person, SIM.Person];
    setMat(s, { fisk: 20 });
    const utan = !kanGrilla(s, p);
    const g = medBank(s, 'grill'), iMitten = stationRutor(s).at.get(f.y * W + f.x)?.id === g.id;
    const kan = kanGrilla(s, p) && grillVara(s)?.ra === 'fisk';
    s.fire.lit = false; const slackt = !kanGrilla(s, p); s.fire.lit = true;
    // en ovan kock bränner en del, en skicklig ingenting
    p.skill.matlagning = 0; q.skill.matlagning = MATLAG.brannFull;
    const f0 = amountOf(s, 'fisk'), m0 = p.skill.matlagning;
    grilla(s, p, 1);
    const ovan = amountOf(s, 'grillfisk'), anv = f0 - amountOf(s, 'fisk');
    grilla(s, q, 1);
    const skicklig = amountOf(s, 'grillfisk') - ovan;
    const brant = Math.abs(anv - MATLAG.timme) < 1e-6 && Math.abs(ovan - anv * (1 - MATLAG.brann)) < 1 && ovan < anv && Math.abs(skicklig - MATLAG.timme) < 1; // i hela saker (steg 2.10.7)
    const ovar = p.skill.matlagning > m0 && brannDel(q) === 0;
    s.fire.lit = false; const fore = amountOf(s, 'fisk'); grilla(s, p, 1); const ingenEld = amountOf(s, 'fisk') === fore; s.fire.lit = true;
    const forst = FOOD.indexOf('grillfisk') < FOOD.indexOf('fisk') && FOOD.indexOf('grillkott') < FOOD.indexOf('kott') && SAKER.grillkott!.haller! > SAKER.kott!.haller! && SAKER.grillfisk!.haller! > SAKER.fisk!.haller!;
    // rått kött och rå fisk: en sur tanke, och ibland matförgiftning. Rå växtmat gör inget
    const r = createState(2, START), folk = living(r);
    let sura = 0;
    for (let i = 0; i < 600; i++) { const x = folk[i % folk.length]!; x.thoughts = []; ratt(r, x, { kott: 1 }, 1); if (x.thoughts.some(t => t.text === 'Åt rått')) sura++; }
    const sjuka = (r.stat?.matforgiftad as number) ?? 0;
    const v0 = JSON.stringify(r.rngs); folk[0]!.thoughts = []; ratt(r, folk[0]!, { bar: 1, rotter: 0.5 }, 1);
    const vaxt = !folk[0]!.thoughts.length && JSON.stringify(r.rngs) === v0;
    // tekniken: grillen kommer efter repet och görs av grenar och rep
    const tek = SIM.TEKNIK.find(t => t.id === 'grill'), tekOk = !!tek && tek.krav.includes('rep');
    // i en by som lever: med tekniken sätts grillen upp och fisken grillas
    const b = createState(1, START); klockan(b); tandEld(b);
    for (const x of b.people) x.tek = { ...x.tek, grill: 1 };
    setMat(b, { bar: 60, fisk: 30 }); setAmount(b, 'ved', 40); setAmount(b, 'grenar', 10); setAmount(b, 'rep', 3);
    let h = 0; while (!SIM.stationerOf(b).some(t => t.k === 'grill' && SIM.isKlar(t)) && h < 48) { kor(b, 1); b.fire.lit = true; h++; }
    const byggd = SIM.stationerOf(b).some(t => t.k === 'grill' && SIM.isKlar(t));
    for (let i = 0; i < 24; i++) { kor(b, 1); b.fire.lit = true; }
    const grillat = (b.stat?.grillat as number) ?? 0;
    return [
      [`grillställningen står över elden, med elden i mitten`, over && iMitten],
      ['utan grill grillar ingen', utan],
      ['med grillen och fisk i lagret går det att grilla fisken', kan],
      ['när elden är släckt grillar ingen, och grillandet slutar', slackt && ingenEld],
      [`en ovan kock bränner ${(MATLAG.brann * 100).toFixed(0)} % av maten, en skicklig ingenting (${ovan.toFixed(1)} och ${skicklig.toFixed(1)} grillad fisk av ${MATLAG.timme})`, brant],
      ['färdigheten Matlagning växer vid grillen', ovar],
      ['den grillade maten håller längre och äts före den råa', forst],
      [`rått kött gör en sur (${sura} av 600) och ger ibland matförgiftning (${sjuka} av 600)`, sura === 600 && sjuka > 0 && sjuka < 40],
      ['rå växtmat gör inget och rör inte slumpen', vaxt],
      ['grillen är en teknik efter repet', tekOk],
      [`i en by med tekniken sätts grillen upp (efter ${h} timmar) och maten grillas (${grillat.toFixed(0)} på ett dygn)`, byggd && grillat > 0],
    ];
  },
};
SCENARIER.tork = {
  text: 'Torkställningen och torkningen (steg 2.8.2): ställningen görs av grenar och rep och står ute. Det kött och den fisk som byn inte hinner äta hängs upp och torkar på fem dygn. En ställning rymmer fyra bitar; får det inte plats bygger byn fler (steg 2.10.22), och det ruttnar inte medan det hänger. Det torkade tas ner till lagret, håller så länge något får hålla där och äts sist. I frost ruttnar maten nästan inte',
  kor: () => {
    const { TORK, kanTorka, torka, torken, torkarna, torkBrist, ruttTemp, LAGER, FOOD } = SIM;
    const s = createState(1, START); klockan(s); tandEld(s);
    const folk = living(s), p = folk.find(r => ageOf(r, s.now) >= 18)!, spara = TORK.spara * folk.length * EKONOMI.matPerDygn;
    setMat(s, { fisk: 40 });
    const utan = !kanTorka(s, p);
    const t = medBank(s, 'tork'), ute = !t.inne;
    const kan = kanTorka(s, p);
    const f0 = amountOf(s, 'fisk');
    torka(s, p, 1);
    const hangt = (t.tork ?? []).reduce((a, q) => a + q.n, 0), upp = Math.abs(hangt - Math.min(TORK.timme, TORK.rymd)) < 1e-6 && Math.abs(f0 - amountOf(s, 'fisk') - hangt) < 1e-6;
    // ställningen är full och det finns mer över: byn vill ha en till, och med två hängs det upp på båda (steg 2.10.22)
    const full = hangt === TORK.rymd && !kanTorka(s, p), villFler = torkBrist(s) > 0;
    const t2 = medBank(s, 'tork'); setMat(s, { fisk: 40 }); torka(s, p, 1);
    const pa2 = (t2.tork ?? []).reduce((a, q) => a + q.n, 0), tva = torkarna(s).length === 2 && Math.abs(pa2 - TORK.rymd) < 1e-6;
    s.stationer = s.stationer!.filter(x => x !== t2); SIM.touch(s);
    // det som hänger ruttnar inte, och det tas inte ner förrän det har torkat
    s.now += (TORK.dygn - 1) * DAY; SIM.touch(s);
    setMat(s, { fisk: 0 });
    torka(s, p, 1);
    const kvar = (t.tork ?? []).reduce((a, q) => a + q.n, 0), intefardigt = Math.abs(kvar - hangt) < 1e-6 && amountOf(s, 'torrfisk') === 0;
    s.now += DAY; SIM.touch(s);
    const klart = kanTorka(s, p);
    torka(s, p, 1);
    const torrt = amountOf(s, 'torrfisk'), ner = Math.abs(torrt - hangt) < 1e-6 && !(t.tork ?? []).length;
    // byn behåller det rått som den äter innan det ruttnar
    setMat(s, { fisk: spara * 0.9 });
    const sparar = !kanTorka(s, p);
    // det torkade håller så länge något får hålla i lagret och äts sist
    const haller = SAKER.torrfisk!.haller === LAGER.maxDygn && SAKER.torrkott!.haller === LAGER.maxDygn && FOOD.slice(-2).sort().join() === 'torrfisk,torrkott';
    // under istiden fryser maten och ruttnar nästan inte
    const frost = ruttTemp(-5) === LAGER.frost && ruttTemp(-5) < ruttTemp(20) / 10;
    const tek = SIM.TEKNIK.find(x => x.id === 'tork'), tekOk = !!tek && tek.krav.includes('rep');
    // i en by som lever: med tekniken sätts ställningen upp och fisken hängs upp
    const b = createState(1, START); klockan(b); tandEld(b);
    for (const x of b.people) x.tek = { ...x.tek, tork: 1 };
    setMat(b, { bar: 60, fisk: 40 }); setAmount(b, 'ved', 40); setAmount(b, 'grenar', 10); setAmount(b, 'rep', 3);
    let h = 0; while (!torken(b) && h < 48) { kor(b, 1); h++; }
    const byggd = !!torken(b);
    for (let i = 0; i < 24; i++) { setMat(b, { bar: 60, fisk: Math.max(amountOf(b, 'fisk'), 30) }); kor(b, 1); }
    const upphangt = (b.stat?.upphangt as number) ?? 0;
    return [
      ['utan torkställning torkar ingen', utan],
      ['torkställningen står ute, och med fisk över går det att torka', ute && kan],
      [`en ställning rymmer ${TORK.rymd} bitar, och de hängs upp från lagret på en timme (${hangt.toFixed(1)})`, upp],
      ['när ställningen är full och det finns mer över vill byn bygga en till', full && villFler],
      [`med två ställningar hängs det upp på båda (${pa2.toFixed(1)} på den andra)`, tva],
      [`det som hänger ruttnar inte och tas inte ner förrän efter ${TORK.dygn} dygn`, intefardigt],
      [`efter ${TORK.dygn} dygn tas det ner som torkad fisk (${torrt.toFixed(1)})`, klart && ner],
      [`byn behåller ${spara.toFixed(1)} rått, det den äter innan det ruttnar`, sparar],
      ['det torkade håller så länge något får hålla i lagret och äts sist', haller],
      ['i frost ruttnar maten nästan inte', frost],
      ['torkställningen är en teknik efter repet', tekOk],
      [`i en by med tekniken sätts ställningen upp (efter ${h} timmar) och fisken hängs upp (${upphangt.toFixed(0)} på ett dygn)`, byggd && upphangt > 0],
    ];
  },
};
SCENARIER.brasa = {
  text: 'Flera brasor (steg 2.9.1): när två eller fler sover långt från elden och det är kallt vill byn ha en brasa nära dem. Fattas stenarna letar en i taget efter dem vid stenarna; sedan byggs brasan av sex stenar. Den tänds med en brand från lägerelden och värmer dem som sover nära. En släckt brasa som ingen sover nära tas isär, och stenarna läggs i en hög som används igen',
  env: { BALANS: 'brasa.langt=0,brasa.kyla=-99' }, // alla sovplatser räknas som långt från elden, och det är alltid kallt nog
  kor: () => {
    const { STATION, BRASA, stepBrasor, brasaSten, brasorOf, brasaHeat, heatAt, PROJEKT, dangers, isKlar, stationerOf } = SIM;
    const b = createState(1, START); klockan(b); tandEld(b);
    setMat(b, { bar: 80, fisk: 30 }); setAmount(b, 'ved', 200); setAmount(b, 'sten', 0);
    // utan hus sover man vid elden: byn vill inte ha någon brasa
    stepBrasor(b); const ingen = !b.brasa;
    medHus(b);
    stepBrasor(b);
    const vill = (b.brasa?.vill ?? 0) > 0;
    const vuxen = living(b).find(r => ageOf(r, b.now) >= 18)!, f = dangers(b);
    const u0 = PROJEKT.brasa.uppgift(b, vuxen);
    const leta = brasaSten(b) && PROJEKT.brasa.kan(b, vuxen, f) && u0?.act === 'samla' && !!u0.sok;
    setAmount(b, 'sten', STATION.brasaSten);
    const bygga = !brasaSten(b) && PROJEKT.brasa.uppgift(b, vuxen)?.act === 'station';
    // i byn: brasan byggs och tänds
    let h = 0, t = brasorOf(b)[0];
    while (!(t && t.eld?.lit) && h < 96) { kor(b, 1); b.fire.lit = true; b.fire.fuel = Math.max(b.fire.fuel, 3); setAmount(b, 'ved', Math.max(amountOf(b, 'ved'), 150)); h++; t = brasorOf(b)[0]; }
    const fire = getMap(b.seed).fire;
    const byggd = !!t && isKlar(t), tand = !!t?.eld?.lit && ((b.stat?.brasaTand as number) ?? 0) > 0;
    const flyttad = !!t && Math.hypot(t.x - fire.x, t.y - fire.y) >= STATION.brasaFran;
    // värmen: vid brasan är det varmare än lägerelden ensam ger
    let varm = false;
    if (t?.eld?.lit) { const med = heatAt(b, t.x + 0.5, t.y + 1.5); t.eld.lit = undefined; const utan = heatAt(b, t.x + 0.5, t.y + 1.5); t.eld.lit = 1; varm = brasaHeat(t) > 0 && med > utan; }
    // isär: en släckt brasa som ingen sover nära tas isär, och stenarna blir en hög
    let isar = false, hog = false, ateranv = false;
    if (t) {
      t.eld!.lit = undefined; t.eld!.fuel = 0; t.eld!.ut = b.now - (BRASA.tomDygn * DAY + HOUR);
      t.x = 1; t.y = 1; // ingen sover närmast den här
      setAmount(b, 'sten', 0);
      stepBrasor(b);
      isar = !stationerOf(b).includes(t) && ((b.stat?.brasaIsar as number) ?? 0) > 0;
      hog = (b.stackar ?? []).some(a => a.k === 'sten' && a.x === 1 && a.y === 1 && a.n >= STATION.brasaSten);
      ateranv = !!b.brasa && !brasaSten(b); // stenarna i högen räcker till nästa brasa: ingen behöver leta
    }
    return [
      ['utan hus sover man vid elden, och byn vill inte ha någon brasa', ingen],
      ['de sover långt bort och det är kallt: byn vill ha en brasa', vill],
      ['utan stenar letar en vuxen efter dem vid stenarna', leta],
      ['med sex stenar byggs brasan i stället', bygga],
      [`brasan byggs (efter ${h} timmar) en bit från lägerelden och tänds med en brand från den`, byggd && flyttad && tand],
      ['vid den brinnande brasan är det varmare än lägerelden ensam ger', varm],
      ['en släckt brasa som ingen sover nära tas isär, och stenarna läggs i en hög', isar && hog],
      ['stenarna i högen används till nästa brasa', ateranv],
    ];
  },
};

SCENARIER.odling = {
  text: 'Steg 2.10.2 och 3.10.23.8: vilda grödor växer på kartan, vild rova på ängarna och vilda ärter i skogsbrynet, men inte i istiden, nära byn eller där folk nött marken (steg 2.10.12). Den som samlar där plockar frön, som inte går att äta, rovfrön av rovan och ärtfrön av ärterna, och tar med sig dem tills byn har nog, och får lite mat (små rötter och ärtor). Tekniken Odling kommer man bara på när man plockar vilda frön (steg 2.10.11), fortare ju fler byn plockat, och plockandet räknas också när byn har nog',
  kor: () => {
    const s = createState(7, START);
    s.kal = nyKalender(s.now, 3); klockan(s);
    const g = groundOf(s), host = SIM.ageIndex(s);
    // var de växer: rovan bara i högt gräs och ärterna bara i ungskogen
    let rova = 0, arter = 0, fel = 0, rovI = -1, artI = -1;
    for (let i = 0; i < W * H; i++) {
      const k = vaxerAt(s, 'vildrova', i), a = vaxerAt(s, 'arter', i);
      if (k > 0) { rova++; if (SIM.markslag(g, i) !== 'hog') fel++; if (rovI < 0 || k > vaxerAt(s, 'vildrova', rovI)) rovI = i; }
      const sk = (j: number) => j >= 0 && j < W * H && g.trees[j] >= FOREST;
      if (a > 0) { arter++; if (SIM.markslag(g, i) === 'skog' || !(sk(i - 1) || sk(i + 1) || sk(i - W) || sk(i + W))) fel++; if (artI < 0 || a > vaxerAt(s, 'arter', artI)) artI = i; }
    }
    // inte nära byn (steg 2.10.12): inget närmare lägret än FANGST.vildIn, och nött mark runt omkring tar bort det mesta
    let naraByn = 0;
    for (let i = 0; i < W * H; i++) if (campDist(s, i % W, Math.floor(i / W)) < FANGST.vildIn) naraByn += vaxerAt(s, 'vildrova', i) + vaxerAt(s, 'arter', i);
    const trampad = createState(7, START); trampad.kal = nyKalender(trampad.now, 3); klockan(trampad);
    const tg = groundOf(trampad), kx = rovI % W, ky = Math.floor(rovI / W);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if ((dx || dy) && SIM.inMap(kx + dx, ky + dy)) { const j = (ky + dy) * W + kx + dx; tg.cover[j] = 0; tg.trees[j] = 0; }
    const orord = vaxerAt(s, 'vildrova', rovI), nott = vaxerAt(trampad, 'vildrova', rovI);
    const vinter = createState(7, START); vinter.kal = nyKalender(vinter.now, 0);
    let iIstid = 0;
    for (let i = 0; i < W * H; i++) iIstid += vaxerAt(vinter, 'vildrova', i) + vaxerAt(vinter, 'arter', i);
    // den som samlar på den rikaste rovrutan tar med sig rovfrön och små rötter, och platsen töms lite. På ärterna blir det
    // ärtfrön och ärtor
    const p = living(s).find(q => ageOf(q, s.now) >= 18)!, plats = (i: number) => ({ act: 'samla', tx: i % W + 0.5, ty: Math.floor(i / W) + 0.5 } as unknown as SIM.Task);
    const tk = plats(rovI), summa = (ut: Record<string, number>, ks: string[]) => ks.reduce((a, k) => a + (ut[k] ?? 0), 0);
    const fore = fyndAt(s, 'vildrova', rovI), ut: Record<string, number> = {};
    for (let i = 0; i < 60; i++) for (const [k, n] of Object.entries(SIM.froFynd(s, p, tk, 60))) ut[k] = (ut[k] ?? 0) + n;
    const efter = fyndAt(s, 'vildrova', rovI), vild = s.stat?.vildgrodor ?? 0, fron = summa(ut, ['rovfron', 'artfron']), rot = ut.rotter ?? 0;
    const art = artI >= 0 ? SIM.froFynd(s, p, plats(artI), 3600) : {};
    // byn vill ha frön till ett minsta fält för varje familj som kan odla och saknar fält (steg 3.10.23.3; innan någon kan odla
    // alla familjer). När byn har nog tar man inga fler, men plockandet räknas och man tänker på odling
    const fam = SIM.fronFamiljer(s), vill = SIM.ODLING.froPerRuta * SIM.ODLING.faltMin * fam;
    setAmount(s, 'rovfron', vill - 1);
    const fattas = summa(SIM.froFynd(s, p, tk, 600), ['rovfron', 'artfron']) > 0;
    setAmount(s, 'rovfron', vill);
    p.tek = {};
    const vild0 = s.stat?.vildgrodor ?? 0, nog = Object.keys(SIM.froFynd(s, p, tk, 3600)).length, raknat = (s.stat?.vildgrodor ?? 0) > vild0, tankt = (p.tek?.odling ?? 0) > 0;
    // tekniken: vanligt samlande ger ingen tanke på odling, bara plockandet, och ju fler frön byn plockat, desto fortare
    const tek = SIM.TEK.odling, tank = (stat: number, plocka: boolean) => {
      const t = createState(7, START), q = living(t).find(r => ageOf(r, t.now) >= 18)!;
      q.tek = {}; setAmount(t, 'rovfron', 5); (t.stat ??= {}).vildgrodor = stat;
      for (let i = 0; i < 60; i++) plocka ? SIM.tankePa(t, q, 'odling', 1) : SIM.thinkWhileWorking(t, q, 'samla', 1);
      return q.tek.odling ?? 0;
    };
    const samlar = tank(400, false), lite = tank(0, true), mycket = tank(400, true);
    return [
      [`på hösten växer vild rova (${rova} rutor) och vilda ärter (${arter} rutor) (tidsålder ${host})`, host === 3 && rova > 0 && arter > 0],
      [`rovan bara i högt gräs och ärterna bara i skogsbrynet (${fel} fel)`, fel === 0],
      [`inga vilda grödor närmare lägret än ${FANGST.vildIn} rutor (${naraByn.toFixed(3)})`, naraByn === 0],
      [`där marken runt omkring är nött av folk växer de knappt (${orord.toFixed(2)} → ${nott.toFixed(2)})`, orord > 0 && nott < orord * 0.3],
      [`i istiden växer inga vilda grödor (${iIstid.toFixed(3)})`, iIstid === 0],
      [`en timmes samlande på en rik rovruta ger rovfrön (${(ut.rovfron ?? 0).toFixed(1)}) och tömmer platsen lite (${fore.toFixed(2)} → ${efter.toFixed(2)})`, (ut.rovfron ?? 0) > 0.5 && efter < fore],
      [`och lite mat: små rötter (${rot.toFixed(2)}), ${SIM.ODLING.vildMat} per frö`, rot > 0 && Math.abs(rot - (ut.rovfron ?? 0) * SIM.ODLING.vildMat) < 1e-9],
      [`på de vilda ärterna blir det ärtfrön (${(art.artfron ?? 0).toFixed(1)}) och ärtor (${(art.arter ?? 0).toFixed(2)})`, (art.artfron ?? 0) > (art.rovfron ?? 0) && (art.arter ?? 0) > 0],
      [`byn räknar det som samlats av de vilda grödorna (${vild.toFixed(1)})`, Math.abs(vild - fron) < 1e-9],
      [`byn plockar frön till ett minsta fält för var och en av familjerna (${fam}): med ${vill - 1} frön tar man fler, med ${vill} inga (${nog}), men plockandet räknas och ger tankar på odling`, fam > 0 && fattas && nog === 0 && raknat && tankt],
      ['fröna kan inte ätas', !SIM.isFood('rovfron') && !SIM.isFood('artfron')],
      [`Odling kommer man bara på när man ${tek?.nar}`, !!tek?.nar],
      [`vanligt samlande ger ingen tanke på odling (${samlar})`, samlar === 0],
      [`plockandet ger tankar redan från början, och fortare ju fler frön byn plockat (${lite.toFixed(4)} mot ${mycket.toFixed(4)})`, mycket > lite * 2 && lite > 0],
      [`några timmars plockande räcker för en medelmåttig (${SIM.TEK.odling.tid} h)`, SIM.TEK.odling.tid <= 6],
    ];
  },
};

SCENARIER.falt = {
  text: 'Steg 2.10.3, 2.10.13 och 3.10.14: den som kan odla och har frön röjer ett fält på jorden utanför byn, så stort som familjen behöver och fröna räcker till, och gräver upp det och sår ruta för ruta. Grödan växer när det är varmt, skördas när den är mogen och ger mat och nya frön. Frosten dödar den, den mogna ruttnar om ingen skördar, och ett fält som ingen sköter blir gräs igen',
  kor: () => {
    const s = createState(6, START); // by 6: röjer fält med och utan hela saker (by 7 gjorde det inte efter steg 2.10.7, slumpen)
    s.kal = nyKalender(s.now, 1); klockan(s, 7); tandEld(s);
    for (const q of living(s)) q.tek = { ...q.tek, odling: 1 };
    setAmount(s, 'rovfron', 30);
    const m = getMap(s.seed), g = groundOf(s);
    kor(s, 48);
    const fs = SIM.faltOf(s), f = fs[0];
    // fälten ligger på jord, utan stora träd, inte på varandra och inte på lagret
    let fel = 0;
    for (const q of fs) for (const i of SIM.faltRutor(q)) {
      const t = m.tiles[i];
      if (t !== T.Gras && t !== T.Skog || g.trees[i] >= FOREST || fs.some(r => r !== q && SIM.faltRutor(r).includes(i)) || pilesOf(s).some(pl => pl.y * W + pl.x === i)) fel++;
    }
    const sadd = s.stat?.sadd ?? 0, fronSadda = s.stat?.fronSadda ?? 0; // samlarna hittar nya frön under tiden, så förrådet säger lite (steg 2.12.4)
    // ett tryck på en ruta hittar rätt ruta i fältet (steg 2.10.14)
    const index = fs.every(q => SIM.faltRutor(q).every((i, k) => SIM.faltIndex(q, i % W, Math.floor(i / W)) === k));
    // storleken (steg 2.10.13): rutorPerMun rutor per person i familjen, och inte fler än det finns frön till
    const p = living(s).find(q => q.id === f?.agare) ?? living(s).find(q => ageOf(q, s.now) >= 18)!;
    const storlekOk = fs.every(q => q.n >= SIM.ODLING.faltMin && q.n <= SIM.ODLING.faltMax && q.n <= SIM.faltBehov(s, s.people.find(r => r.id === q.agare) ?? p));
    const enPerFamilj = fs.every(q => !fs.some(r => r !== q && SIM.familjOf(s, q.agare).some(m => m.id === r.agare)));
    // formen (steg 3.10.23.2): sidorna sidaMin–sidaMax rutor, och bredden slås fram per fält så att fälten blir olika
    const { sidaMin, sidaMax } = SIM.ODLING;
    const formOk = fs.every(q => q.w >= sidaMin && q.w <= sidaMax && Math.ceil(q.n / q.w) <= sidaMax);
    const former = new Set(Array.from({ length: 12 }, (_, i) => SIM.bredder(s, i + 1, 25)[0]));
    // fröna tillbaka (steg 3.10.23.3): rovorna 1 eller 2 per ruta, ungefär hälften av vardera, och ärterna 2
    const rovFron = f ? Array.from({ length: 60 }, (_, k) => SIM.froTillbaka(s, { ...f, mogen: s.now }, k, SIM.GRODOR.rovor)) : [];
    const rovSnitt = rovFron.reduce((a, b) => a + b, 0) / (rovFron.length || 1);
    const artFron = f ? Array.from({ length: 20 }, (_, k) => SIM.froTillbaka(s, { ...f, mogen: s.now }, k, SIM.GRODOR.arter)) : [];
    const perRuta = SIM.ODLING.rojaMin + SIM.ODLING.beredaMin + SIM.ODLING.saMin + SIM.ODLING.skordaMin;
    // skörden ruta för ruta: två rutors arbete ger två rutors gröda, och steget är inte klart förrän hela fältet är skördat.
    // Sedan växer fältet om ägaren behöver fler rutor och har frön, och annars grävs jorden upp igen
    let skord = false, delvis = false, tva = 0, arter = 0, fronSkord = 0;
    if (f) {
      setAmount(s, 'rovfron', 200);
      Object.assign(f, { steg: 'mogen', groda: 'arter', mogen: s.now, klara: 0, kvar: SIM.ODLING.skordaMin * 60000, sadda: f.n });
      const tk = { act: 'odla', tool: 'mogen', ref: f.id, until: s.now + HOUR } as unknown as SIM.Task;
      const k0 = amountOf(s, 'arter'), r0 = amountOf(s, 'artfron'), n0 = f.n;
      SIM.workOdla(s, p, tk, SIM.ODLING.skordaMin * 60 * 2);
      tva = f.klara;
      SIM.finishOdla(s, p, tk);
      delvis = f.steg === 'mogen' && tva === 2;
      SIM.workOdla(s, p, tk, SIM.ODLING.skordaMin * 60 * f.n);
      SIM.finishOdla(s, p, tk);
      arter = amountOf(s, 'arter') - k0; fronSkord = amountOf(s, 'artfron') - r0;
      const vaxte = f.n > n0 ? f.steg === 'roja' && f.klara === n0 : f.steg === 'bereda';
      skord = vaxte && arter > 0 && fronSkord > 0 && tk.until === s.now;
    }
    // rötan: den mogna grödan som ingen skördar
    let rutten = false;
    if (f) {
      Object.assign(f, { steg: 'mogen', groda: 'rovor', mogen: s.now - (SIM.ODLING.overDygn + SIM.ODLING.ruttDygn + 0.1) * DAY, rord: s.now });
      SIM.stepOdling(s);
      rutten = f.steg === 'sa' && (s.stat?.ruttnat ?? 0) === 1;
    }
    // frosten: i istiden dör grödan, och ingen sår något nytt
    let frost = false, ingenSadd = false;
    if (f) {
      Object.assign(f, { steg: 'vaxer', groda: 'rovor', vuxit: 0.5, rord: s.now });
      s.kal = nyKalender(s.now, 0);
      SIM.stepOdling(s);
      frost = f.steg === 'sa' && (s.stat?.frostdod ?? 0) >= 1;
      ingenSadd = SIM.grodaNu(s) === undefined && living(s).every(q => SIM.faltUppgift(s, q)?.tool !== 'sa');
    }
    // ett fält som ingen skött på länge blir gräs igen
    let gras = false;
    if (f) {
      f.rord = s.now - (SIM.ODLING.grasDygn + 0.1) * DAY;
      const n = SIM.faltOf(s).length;
      SIM.stepOdling(s);
      gras = SIM.faltOf(s).length === n - 1 && (s.stat?.faltIgen ?? 0) === 1;
    }
    // fälten utanför byn (steg 3.10.14): ett nytt fält ligger utanför byns yttersta hus, station och lagerplats, med
    // faltStig rutor fritt emellan, och så nära byn som det går. Byn har ett hus så att gränsen ligger en bit ut
    const gs = createState(6, START); gs.kal = nyKalender(gs.now, 1); klockan(gs, 7); tandEld(gs);
    medHus(gs);
    const site = SIM.faltSite(gs, 3, 9), gr = SIM.byGrans(gs), stig = SIM.ODLING.faltStig;
    const delar = [...SIM.housesOf(gs), ...SIM.zonesOf(gs), ...SIM.stationerOf(gs).filter(t => !SIM.stationDef(t.k)?.utkant).map(t => ({ x: t.x, y: t.y, ...SIM.storlekAv(t) }))];
    let inpa = 0, innanfor = 0;
    if (site) for (const i of SIM.faltRutor({ x: site.x, y: site.y, w: 3, n: 9, dir: SIM.faltRiktning(gs, site.y) } as SIM.Falt)) {
      const x = i % W, y = Math.floor(i / W);
      if (delar.some(d => x >= d.x - stig && x < d.x + d.w + stig && y >= d.y - stig && y < d.y + d.h + stig)) inpa++;
      const e = SIM.eldPlats(gs);
      if (delar.some(d => Math.hypot(d.x - e.x, d.y - e.y) > Math.hypot(x - e.x, y - e.y) + 1.5 && Math.abs(Math.atan2(d.y - e.y, d.x - e.x) - Math.atan2(y - e.y, x - e.x)) < 0.2)) innanfor++;
    }
    const narmast = site ? SIM.byAvstand(gs, site.x + 1.5, site.y + 0.5) : Infinity;
    // en sparad by från före steg 2.10.13: fältet blir 2 × 2 rutor när byn laddas
    const gm = cloneState(s);
    gm.falt = [{ id: 1, x: 10, y: 10, agare: 0, steg: 'vaxer', groda: 'rovor', vuxit: 0.5, rord: gm.now } as unknown as SIM.Falt];
    gm.v = 8; SIM.migrate(gm);
    const gf = gm.falt[0], gammalt = gf.w === 2 && gf.n === 4 && gf.sadda === 4 && SIM.faltRutor(gf).length === 4;
    // en sparad by från före steg 3.10.23.8: kornet blir ärter, också på fältet, och fröna delas lika på rovfrön och ärtfrön
    // (det udda till rovfröna), också vems de är och det som bärs
    const gk = cloneState(s), gp = living(gk)[0], gc = campCenter(gk);
    gk.stackar = (gk.stackar ?? []).filter(a => !['rovfron', 'artfron', 'arter'].includes(a.k));
    gk.stackar.push({ k: 'fron', n: 9, c: 0.8, x: Math.floor(gc.x) + 1, y: Math.floor(gc.y), ag: { [gp.id]: 5 } }, { k: 'korn', n: 4, c: 1, x: Math.floor(gc.x) + 1, y: Math.floor(gc.y) + 1 });
    gp.task = { act: 'samla', items: { fron: 7, korn: 2 }, ag: { fron: { [gp.id]: 3 } } } as unknown as SIM.Task;
    gk.falt = [{ ...gk.falt?.[0] ?? gf, groda: 'korn' as SIM.GrodaSlag }];
    gk.v = 15; SIM.migrate(gk);
    const gs1 = (k: string) => (gk.stackar ?? []).filter(a => a.k === k).reduce((a, b) => a + b.n, 0), gt = gp.task!;
    const kornFron = gs1('rovfron') === 5 && gs1('artfron') === 4 && gs1('arter') === 4 && !gs1('fron') && !gs1('korn') && amountOf(gk, 'artfron') === 4 &&
      gt.items?.rovfron === 4 && gt.items?.artfron === 3 && gt.items?.arter === 2 && gt.ag?.artfron?.[gp.id] === 1 && gt.ag?.rovfron?.[gp.id] === 2 && gk.falt?.[0]?.groda === 'arter';
    return [
      [`byn röjer ett fält när den kan odla och har frön (${fs.length} fält, ${f ? SIM.FALT_STEG[f.steg].namn.toLowerCase() : '-'})`, fs.length > 0],
      [`fälten ligger på jord utan stora träd, inte på varandra och inte på lagret (${fel} fel)`, fel === 0],
      [`fältet grävs upp och sås inom två dygn (två år i spelet), och fröna tas ur förrådet (${sadd} sådda, ${fronSadda} frön)`, sadd > 0 && fronSadda > 0],
      [`fältet har ${SIM.ODLING.rutorPerMun} rutor per person i familjen, mellan ${SIM.ODLING.faltMin} och ${SIM.ODLING.faltMax}, och inte fler än det finns frön till (${fs.map(q => q.n).join(', ')} rutor)`, storlekOk && fs.length > 0],
      ['en familj har ett fält', enPerFamilj],
      [`fältets sidor är ${sidaMin}–${sidaMax} rutor (${fs.map(q => `${q.w} × ${Math.ceil(q.n / q.w)}`).join(', ')}), och bredden skiljer sig mellan fälten (${[...former].join(', ')} för 25 rutor)`, formOk && fs.length > 0 && former.size >= 3],
      [`rovorna ger 1 eller 2 frön per ruta, i snitt ${rovSnitt.toFixed(2)}, och ärterna ${artFron[0]}`, rovFron.every(n => n === 1 || n === 2) && rovSnitt > 1.3 && rovSnitt < 1.7 && artFron.every(n => n === 2)],
      ['varje ruta på kartan hittar sin plats i fältet, så att ett tryck på den markerar rätt gröda', index && fs.length > 0],
      [`arbetet går ruta för ruta, och steget blir inte klart förrän hela fältet är gjort (${tva} rutor skördade efter två rutors arbete)`, delvis],
      [`en ruta tar kort tid: ${perRuta} minuter att röja, gräva, så och skörda`, perRuta <= 20],
      [`den mogna grödan skördas: ärter (${arter.toFixed(1)}) och nya ärtfrön (${fronSkord.toFixed(1)}); sedan växer fältet eller grävs upp igen`, skord],
      ['den mogna grödan som ingen skördar ruttnar, och fältet ska sås igen', rutten],
      ['frosten i istiden dödar grödan, och ingen sår något nytt förrän det hinner mogna', frost && ingenSadd],
      ['ett fält som ingen skött på länge blir gräs igen', gras],
      ['ett fält i en sparad by från före steget blir 2 × 2 rutor när byn laddas', gammalt],
      ['i en sparad by från före steg 3.10.23.8 blir kornet ärter, också på fältet, och fröna delas lika på rovfrön och ärtfrön, också det som bärs och vems de är', kornFron],
      [`ett nytt fält ligger utanför byns hus, stationer och lagerplatser med minst ${stig} rutor fritt emellan (${inpa} rutor för nära, ${innanfor} innanför något, ${narmast.toFixed(1)} rutor från byn)`, !!site && inpa === 0 && innanfor === 0 && narmast <= stig + 1 + SIM.ODLING.faltUtom && gr.ut.some(u => u > 0)],
    ];
  },
};

SCENARIER.smutsibyn = {
  text: 'Steg 3.6.10: blod och toa-högar inne i byn ger en tanke som sänker humöret hos dem som ser dem, och mat som ligger i en blodfläck eller på eller bredvid en toa-hög ruttnar fortare',
  kor: () => {
    const { blodas, akel, toaBesok, slitageNu, smutsIByn, SMUTS, zoneOf, byAvstand } = SIM;
    const s = createState(1, START); klockan(s); tandEld(s);
    const [p, q] = living(s).filter(r => ageOf(r, s.now) >= 18) as [SIM.Person, SIM.Person];
    const z = zoneOf(s), bx = z.x + 0.5, by = z.y + 0.5;
    const tankar = (r: SIM.Person) => { r.thoughts = []; akel(s, r); return r.thoughts.some(t => t.text === 'Blod och smuts i byn'); };
    const fore = (Object.assign(p, { x: bx + 1, y: by, task: undefined }), tankar(p));
    blodas(s, bx, by, 'slakt', 1);
    Object.assign(q, { x: bx + SMUTS.ser + 6, y: by + SMUTS.ser + 6, task: undefined });
    const ser = tankar(p), langtBort = tankar(q), sover = (p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: s.now + HOUR, carry: 0, why: 'test', dark: false }, tankar(p));
    // maten: samma sak på blodet, bredvid en toa-hög och på en ren ruta
    const ren = { k: 'bar', x: z.x + z.w - 1, y: z.y + z.h - 1 };
    const pa = slitageNu(s, { k: 'bar', x: z.x, y: z.y }).per, rent = slitageNu(s, ren).per;
    Object.assign(q, { x: z.x + 0.5, y: z.y + z.h - 1 + 0.5, task: undefined }); toaBesok(s, q); // i lagrets andra hörn
    const toa = slitageNu(s, { k: 'bar', x: z.x + 1, y: z.y + z.h - 1 }).per;
    const ibyn = smutsIByn(s).punkter.length, inne = byAvstand(s, z.x, z.y) <= SMUTS.byn;
    return [
      ['ingen tanke utan blod', !fore],
      [`den som ser blodet inne i byn får tanken (${ibyn} fläckar och högar syns, lagret inne i byn: ${inne})`, ser && inne],
      ['inte den som är långt bort eller sover', !langtBort && !sover],
      [`maten i blodet ruttnar fortare (${(pa / rent).toFixed(1)} gånger)`, Math.abs(pa / rent - SMUTS.rutt) < 1e-9],
      [`... och bredvid en toa-hög (${(toa / rent).toFixed(1)} gånger)`, Math.abs(toa / rent - SMUTS.rutt) < 1e-9],
    ];
  },
};

SCENARIER.individer = {
  text: 'Djuren som individer (steg 3.7.13): varje kanin har en egen ålder, styrka, snabbhet och skygghet som är densamma varje gång, en skadad kanin läker med tiden och glöms när den läkt, och en dödad kanin är borta medan resten av gruppen syns',
  kor: () => {
    const s = createState(6, START);
    klockan(s);
    const dj = djurOf(s), art = SIM.DJUR.kanin.strid;
    const drag = dj.map(d => SIM.dragOf(d.art, d.id));
    const samma = dj.every((d, i) => JSON.stringify(SIM.dragOf(d.art, d.id)) === JSON.stringify(drag[i]));
    const iSpann = drag.every(g => g.alder >= 1 && g.alder <= art.alder && g.styrka > 0 && g.snabbhet > 0 && g.skygghet! >= 0 && g.skygghet! <= 1);
    const olika = new Set(drag.map(g => g.styrka.toFixed(2))).size > 1;
    // en skadad kanin läker med tiden
    const a = dj[0], b = dj[1], fore = s.now;
    SIM.satDjurHalsa(s, a.id, 0.4, 2);
    const skadad = SIM.halsaOf(s, a.id);
    s.now += 6 * HOUR; const sen = SIM.halsaOf(s, a.id);
    s.now += 48 * HOUR; const lakt = SIM.halsaOf(s, a.id);
    SIM.satDjurHalsa(s, b.id, 0.9, 0); // den läkta glöms när en annan sparas
    const glomd = !s.djurHalsa!.some(h => h.id === a.id);
    s.now = fore; s.djurHalsa = undefined;
    // en dödad kanin är borta, men gruppen syns fortfarande lika stor (tills lagret tömts)
    const n0 = djurOf(s).filter(d => d.grupp === b.grupp).length;
    SIM.dodaDjur(s, b.id);
    const efter = djurOf(s).filter(d => d.grupp === b.grupp);
    const kopia = djurOf(cloneState(s)).map(d => d.id).join() === djurOf(s).map(d => d.id).join();
    return [
      [`${dj.length} kaniner har egna egenskaper som är desamma varje gång och efter inläsning`, dj.length > 0 && samma && kopia],
      [`åldern är 1–${art.alder} år, styrkan och snabbheten finns och skillnader mellan kaninerna`, iSpann && olika],
      [`en skadad kanin (blod ${Math.round(skadad.blod * 100)} %) läker med tiden (${Math.round(sen.blod * 100)} % efter 6 timmar, ${Math.round(lakt.blod * 100)} % efter två dygn) och glöms när den läkt`, skadad.blod < sen.blod && sen.blod < 1 && lakt.blod === 1 && lakt.sar === 0 && glomd],
      [`en dödad kanin syns inte längre (${n0} före, ${efter.length} efter, men inte den dödade)`, !efter.some(d => d.id === b.id) && efter.length === n0 && SIM.halsaOf(s, b.id).dod],
    ];
  },
};

SCENARIER.kaninjakt = {
  text: 'Kaninjakten som strid (steg 3.7.3): jägaren smyger sig fram till en kanin och sticker eller kastar. Stenen fångar sämre än spjutet och tappas oftast bort, det kastade spjutet slits och försvinner ibland (oftare i vattnet), gruppen skräms, en skadad kanin springer och bara den som griper en kanin med händerna kan bli biten. I byn ger jakten kaniner',
  kor: () => {
    const s0 = createState(6, START);
    klockan(s0);
    const p0 = living(s0).find(q => ageOf(q, s0.now) >= 16)!;
    const k0 = djurOf(s0)[0];
    // många försök från samma läge, med spjut och med stenar: varje försök med en ny slump ur jägarens följd
    const prova = (verktyg: string | undefined, n: number) => {
      const ut = { fangst: 0, skadad: 0, borta: 0, skramd: 0, sar: 0, sett: 0, ratt: 0 };
      const s = cloneState(s0), p = SIM.byId(s, p0.id)!;
      for (let i = 0; i < n; i++) {
        Object.assign(s, { djurDoda: undefined, djurHalsa: undefined, djurSkramd: undefined }); s.ting = (s.ting ?? []).filter(t => t.k !== 'flintspjut');
        if (verktyg) { const t = SIM.addTool(s, verktyg, p); t.hos = p.id; }
        const k = djurOf(s).find(d => d.id === k0.id) ?? djurOf(s)[0];
        const tk = { act: 'jakt', phase: 'do', tx: k.x, ty: k.y, until: s.now + HOUR, carry: 0, tool: verktyg } as SIM.Task;
        const sar = (p.skador ?? []).length;
        SIM.jaktForsok(s, p, tk);
        const f = tk.jf!; // försöket planeras när det börjar (Björn efter v159), och inget händer förrän det är slut
        if (f.sett) ut.sett++;
        if (tk.carry === 0 && !s.djurHalsa && (f.kast > 0 ? f.stopp === f.kast : f.stopp <= f.kast * -10) && f.id === k.id) ut.ratt++;
        SIM.jaktKlar(s, p, tk);
        if (tk.carry > 0) ut.fangst++;
        if (s.djurHalsa?.length) ut.skadad++;
        if (verktyg && !SIM.toolsOf(s, verktyg).length) ut.borta++;
        if (s.djurSkramd?.length) ut.skramd++;
        if ((p.skador ?? []).length > sar) ut.sar++;
        p.skador?.splice(0); p.health = 1;
      }
      return ut;
    };
    const N = 400, spjut = prova('flintspjut', N), sten = prova(undefined, N);
    // det kastade försvinner oftare i vattnet än på kort gräs
    const m = getMap(s0.seed), g = groundOf(s0);
    const vi = m.tiles.findIndex(t => t === T.Vatten), li = m.tiles.findIndex((t, i) => t !== T.Vatten && SIM.markslag(g, i) === 'kort');
    const borta = (i: number) => {
      const s = cloneState(s0), p = SIM.byId(s, p0.id)!; let n = 0, r = 7;
      const slump = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
      for (let j = 0; j < N; j++) { s.ting = (s.ting ?? []).filter(t => t.k !== 'flintspjut'); SIM.addTool(s, 'flintspjut', p).hos = p.id; if (SIM.kastat(s, p, 'flintspjut', 3, i % W + 0.5, Math.floor(i / W) + 0.5, slump) === 'borta') n++; }
      return n;
    };
    const iVatten = borta(vi), paLand = borta(li);
    // byn jagar: kaniner bärs hem
    const s = createState(1, START);
    kor(s, 240);
    const st = s.stat ?? {};
    return [
      [`med spjut fångas ${spjut.fangst} av ${N}, med stenar ${sten.fangst}: stenen fångar sämre`, spjut.fangst > sten.fangst && sten.fangst > 0],
      [`försöket planeras när det börjar: kaninen, var jägaren stannar och om hen blev sedd sparas (${spjut.ratt + sten.ratt} av ${2 * N} rätt; sedd ${spjut.sett + sten.sett} gånger), och kaninen fångas först när försöket är slut`, spjut.ratt + sten.ratt === 2 * N && spjut.sett + sten.sett > 0 && spjut.sett + sten.sett < 2 * N],
      [`gruppen skräms av varje försök (${spjut.skramd} av ${N})`, spjut.skramd === N],
      [`en kanin som bara skadas springer (${spjut.skadad + sten.skadad} gånger i provet, ${st.jaktSkadad ?? 0} i byn)`, spjut.skadad + sten.skadad + (st.jaktSkadad ?? 0) > 0],
      [`det kastade spjutet försvinner ibland (${spjut.borta} av ${N} försök), oftare i vattnet (${iVatten} av ${N} kast) än på kort gräs (${paLand})`, spjut.borta > 0 && iVatten > paLand * 2],
      [`kaninen slår aldrig tillbaka: bara den som griper med händerna blir biten (${spjut.sar} med spjut, ${sten.sar} med händer och stenar)`, spjut.sar === 0],
      [`i byn: ${st.jaktForsok ?? 0} försök, ${st.jaktSmyg ?? 0} smög ända fram, ${st.jaktKast ?? 0} kast, ${st.jaktSedd ?? 0} gånger sedd först, ${st.jaktFangst ?? 0} kaniner`, (st.jaktFangst ?? 0) > 0 && (st.jaktKast ?? 0) > 0 && (st.jaktSedd ?? 0) > 0],
    ];
  },
};

SCENARIER.varg = {
  text: 'Vargen och vakten (steg 3.7.1): vargar kommer under istiden, oftast i flock och ibland ensamma, och drar vidare efter en tid. Vakten ser dem och väcker byn, en flock anfaller den som är ensam, på natten stjäl de mat ur förrådet när ingen är vaken nära, och byn kan jaga dem i grupp. Svårigheten: en varg slår oftast en obeväpnad, med spjut klarar man sig oftast, och tre med spjut slår oftast fyra vargar men någon skadas',
  kor: () => {
    // svårigheten i testarenan
    const m = (id: number, vapen: SIM.Vapen, y: number) => ({ id, namn: `K${id}`, sida: 0 as const, st: { styrka: 10, uthallighet: 10, mod: 10, smidighet: 10, skicklighet: 10 }, vapen, klader: [] as string[], fart: 1, x: 3, y });
    const v = (id: number, y: number, led = false) => { const k = SIM.djurKampe('varg', id, 1, 13, y); if (led) k.ledare = 'fram'; return k; };
    const N = 200, prov = (folk: ReturnType<typeof m>[], vargar: ReturnType<typeof v>[]) => SIM.korManga({ avsikt: 'doda', w: 16, h: 8, kampar: [...folk, ...vargar] }, 3, N);
    const hand = prov([m(1, 'hand', 4)], [v(2, 4)]), spjut = prov([m(1, 'flintspjut', 4)], [v(2, 4)]);
    const tre = prov([m(1, 'flintspjut', 3), m(2, 'flintspjut', 4), m(3, 'flintspjut', 5)], [v(4, 2.5, true), v(5, 3.5), v(6, 4.5), v(7, 5.5)]);
    const treSkadade = tre.per.slice(0, 3).reduce((a, p) => a + p.nere + p.dog, 0);
    // en by i istiden med en flock nära
    const by = (h: number, seed = 1) => { const s = createState(seed, START); s.kal = nyKalender(s.now, 0); klockan(s, h); tandEld(s); return s; };
    const flock = (s: State, n: number, dx: number, hunger: number) => {
      const c = campCenter(s), id = s.vargNr = (s.vargNr ?? 0) + 1;
      const f: SIM.Vargflock = { id, vargar: Array.from({ length: n }, (_, j) => 10_000_000 + id * 8 + j), x: c.x + dx, y: c.y, mx: c.x + dx, my: c.y, kom: s.now, gar: s.now + 48 * HOUR, hunger, gor: 'stryker' };
      (s.vargar ??= []).push(f); return f;
    };
    // vakten ser flocken på natten och väcker byn
    const nv = by(2); kor(nv, 0.5);
    for (const q of living(nv)) if (q.task?.act !== 'vakt') q.task = { act: 'sova', phase: 'do', tx: q.x, ty: q.y, until: nv.now + 4 * HOUR, carry: 0 } as SIM.Task;
    const harVakt = living(nv).some(q => q.task?.act === 'vakt');
    flock(nv, 4, 12, 0.3); kor(nv, 1);
    const vakt = nv.stat?.vargVackt ?? 0, sedd = nv.stat?.vargSedd ?? 0;
    const vaken = living(nv).filter(q => q.larm?.vad === 'varg' && q.task && q.task.act !== 'sova').length;
    // en hungrig flock anfaller den som är ensam långt från byn
    const an = by(12), e = SIM.eldPlats(an), tl = SIM.getMap(an.seed).tiles, ensam = living(an).find(q => ageOf(q, an.now) >= 18)!;
    const land = (a: number, r: number) => { const x = Math.round(e.x + Math.cos(a) * r), y = Math.round(e.y + Math.sin(a) * r); return SIM.inMap(x, y) && tl[y * W + x] !== SIM.T.Vatten ? { x: x + 0.5, y: y + 0.5 } : undefined; };
    let ri = 0; while (ri < 6.3 && !(land(ri, 26) && land(ri, 36))) ri += 0.2;
    const ut = land(ri, 26)!, fl = land(ri, 36)!;
    const fa = flock(an, 4, 0, 1); fa.x = fa.mx = fl.x; fa.y = fa.my = fl.y;
    // den ensamma står kvar och samlar tills flocken är framme
    kor(an, 3, s => { if (!s.stat?.vargstrid) { ensam.x = ut.x; ensam.y = ut.y; ensam.task = { act: 'samla', phase: 'do', tx: ut.x, ty: ut.y, until: s.now + HOUR, carry: 0 } as SIM.Task; } });
    const anfall = an.stat?.vargAnfall ?? 0, stridAn = an.stat?.vargstrid ?? 0;
    // på natten, när elden slocknat och alla sover, stjäl de mat ur förrådet
    let stal = 0;
    for (const seed of [1, 2, 3]) {
      const st = by(1, seed); st.fire.lit = false; setMat(st, { vilt: 6, bar: 10 });
      for (const q of living(st)) { q.guardDay = undefined; q.task = { act: 'sova', phase: 'do', tx: q.x, ty: q.y, until: st.now + 5 * HOUR, carry: 0 } as SIM.Task; }
      st.lastGuardDay = 1e9;
      flock(st, 3, 15, 0.9); kor(st, 4); stal += st.stat?.vargStal ?? 0;
    }
    // byn jagar en ensam varg i dagsljus när alla har spjut
    let jakt = 0, dodad = 0, hemma = 0, dodare = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const j = by(9, seed);
      for (const q of living(j)) if (ageOf(q, j.now) >= 16) { const t = SIM.addTool(j, 'flintspjut', q); t.hos = q.id; }
      const f = flock(j, 1, 14, 0.5); f.sedd = j.now;
      kor(j, 8);
      jakt += j.stat?.vargjakt ?? 0; dodad += j.stat?.vargDodad ?? 0; hemma += amountOf(j, 'varg') + (j.stat?.slaktatVarg ?? 0);
      dodare += j.stat?.rykte_vargdodare ?? 0;
    }
    // under istiden kommer flockar av sig själva och drar vidare
    let kom = 0, borta = 0;
    for (const seed of [4, 5, 6]) { const s = by(10, seed); kor(s, 120); kom += s.stat?.vargflockar ?? 0; borta += s.stat?.vargflockBorta ?? 0; }
    const pc = (n: number) => Math.round(100 * n / N);
    return [
      [`en varg mot en obeväpnad: vargen vinner ${pc(hand.vann[1])} %`, hand.vann[1] > N * 0.6],
      [`en varg mot en med spjut: människan vinner ${pc(spjut.vann[0])} %, mycket oftare än med händerna`, spjut.vann[0] > hand.vann[0] * 2 && spjut.vann[0] < N * 0.9],
      [`tre med spjut mot fyra vargar: människorna vinner ${pc(tre.vann[0])} %, och någon skadas eller faller (${treSkadade} gånger på ${N} strider)`, tre.vann[0] > N * 0.5 && treSkadade > 0],
      [`vakten ser flocken på natten (${sedd} gånger) och väcker byn (${vakt} väckta, ${vaken} håller sig vakna vid elden)`, harVakt && sedd > 0 && vakt > 0 && vaken > 0],
      [`en hungrig flock anfaller den som är ensam (${anfall} anfall, ${stridAn} strider)`, anfall > 0 && stridAn > 0],
      [`på natten när alla sover och elden slocknat stjäl vargarna mat (${stal} saker i tre byar)`, stal > 0],
      [`byn jagar en ensam varg med spjut (${jakt} jakter, ${dodad} dödade vargar, ${hemma} hemburna, ${dodare} vargdödare)`, jakt > 0 && dodad > 0 && hemma > 0 && dodare > 0],
      [`under istiden kommer flockar (${kom} i tre byar på 120 timmar) och drar vidare (${borta})`, kom > 0 && borta > 0],
    ];
  },
};

SCENARIER.kallar = {
  text: 'Vem som kallar till vargjakt (steg 3.10.20): den som såg flocken först kallar om hen vågar, annars någon annan som vågar, och hur många som följer beror också på den som kallar: anseendet, karisman, om hen är vargdödare och om hen leder byn',
  kor: () => {
    // en by i istiden med en flock på två vargar som någon just sett; alla vuxna har spjut och mat finns
    const by = () => {
      const s = createState(1, START); s.kal = nyKalender(s.now, 0); klockan(s, 10); tandEld(s);
      for (const [x, a] of [['m', 30], ['k', 28], ['m', 35], ['k', 24], ['m', 40]] as const) nyInvanare(s, x, a);
      setMat(s, { vilt: 60, bar: 60 });
      const vuxna = living(s).filter(q => ageOf(q, s.now) >= 18 && ageOf(q, s.now) < 55);
      for (const q of vuxna) { const t = SIM.addTool(s, 'flintspjut', q); t.hos = q.id; q.pot.mod = 10; q.pot.karisma = 10; }
      const c = campCenter(s), id = s.vargNr = 1;
      const f: SIM.Vargflock = { id, vargar: [10_000_008, 10_000_009], x: c.x + 14, y: c.y, mx: c.x + 14, my: c.y, kom: s.now, gar: s.now + 48 * HOUR, hunger: 0.5, gor: 'stryker', sedd: s.now };
      (s.vargar ??= []).push(f);
      return { s, f, vuxna };
    };
    // försöker tills jakten blir av (högst 40 gånger); svarar med den som kallade och hur många som gick
    const forsok = (s: State, f: SIM.Vargflock) => {
      for (let i = 0; i < 40; i++) {
        SIM.jaktBeslut(s, f, living(s));
        if (f.jagare) { const jag = f.jagare.map(id => SIM.byId(s, id)!), k = jag.find(q => q.task?.why === 'Kallar till vargjakt'); for (const q of jag) q.task = undefined; f.jagare = undefined; return { k, n: jag.length }; }
      }
      return { k: undefined, n: 0 };
    };
    // den som såg flocken kallar, fast hen inte leder byn
    const a = by(), sag = a.vuxna[3]; sag.pot.mod = 16; a.f.sag = sag.id;
    const r1 = forsok(a.s, a.f);
    // den som såg den men inte vågar (modet mot flockens storlek) kallar inte; någon som vågar gör det (de andra är modiga, så att jakten blir av)
    const b = by(), rad = b.vuxna[3]; for (const q of b.vuxna) q.pot.mod = 16; rad.pot.mod = 0; b.vuxna[0].pot.mod = 18; b.f.sag = rad.id;
    const kan = living(b.s).filter(q => ageOf(q, b.s.now) >= SIM.ALDER.vaktFran && ageOf(q, b.s.now) < SIM.ALDER.vaktTill).length;
    while (b.f.vargar.length < Math.ceil(SIM.VARG.fler * kan / SIM.VARG.vagar)) b.f.vargar.push(10_000_008 + b.f.vargar.length); // så många att modet avgör
    const r2 = forsok(b.s, b.f);
    // gehöret: samma by, en känd vargdödare med hög karisma mot en okänd med låg; antalet som följer i 20 jakter vardera
    let hog = 0, lag = 0, hogJ = 0, lagJ = 0;
    for (let i = 0; i < 20; i++) {
      const h = by(), kh = h.vuxna[2]; kh.pot.karisma = 20; kh.pot.mod = 16; (kh.liv ??= {}).vargar = 2; h.f.sag = kh.id;
      const x = forsok(h.s, h.f); if (x.k === kh) { hog += x.n - 1; hogJ++; }
      const l = by(), kl = l.vuxna[2]; kl.pot.karisma = 0; kl.pot.mod = 16; l.f.sag = kl.id; for (let j = 0; j <= i; j++) SIM.rnd(l.s, 'varg');
      const y = forsok(l.s, l.f); if (y.k === kl) { lag += y.n - 1; lagJ++; }
    }
    return [
      [`den som såg flocken kallar till vargjakt fast hen inte leder byn (${r1.k?.name ?? 'ingen'}, ${r1.n} gick)`, r1.k === sag],
      [`den som såg den men inte vågar kallar inte; ${r2.k?.name ?? 'ingen'} kallade i stället`, !!r2.k && r2.k !== rad],
      [`en känd vargdödare med hög karisma får fler med sig än en okänd med låg (${hog} följde i ${hogJ} jakter mot ${lag} i ${lagJ})`, hogJ > 0 && hog / Math.max(1, hogJ) > lag / Math.max(1, lagJ)],
    ];
  },
};

SCENARIER.patrull = {
  text: 'Vakten patrullerar (steg 3.7.4): nattens vakt går runt byn hela tiden, stannar kort vid elden ibland och har sitt eget eller byns bästa vapen i handen, aldrig någon annans',
  kor: () => {
    const s = createState(2, START); s.kal = nyKalender(s.now, 0); klockan(s, 22); tandEld(s);
    kor(s, 1);
    const vakten = living(s).find(q => q.task?.act === 'vakt'), annan = living(s).find(q => q !== vakten && ageOf(q, s.now) >= 18)!;
    // ett spjut som byn äger och ett bättre som någon annan äger; vakten väljer vapen på nytt
    for (const t of SIM.tingOf(s)) if (t.hos === vakten?.id) t.hos = undefined;
    SIM.newTing(s, 'fiskespjut', 1, SIM.BYN);
    const annans = SIM.addTool(s, 'flintspjut', annan);
    if (vakten) vakten.task!.runda = undefined;
    const e = SIM.eldPlats(s), stopp = new Set<string>();
    let vaktId: number | undefined, langt = 0, vidEld = 0, maxR = 0, haller = 0, tog = 0, slag = '', kv = '';
    kor(s, 4, s => {
      const v = living(s).find(q => q.task?.act === 'vakt'); if (!v) return;
      vaktId ??= v.id; if (v.id !== vaktId) return;
      const r = Math.hypot(v.x - e.x - 0.5, v.y - e.y - 0.5); maxR = Math.max(maxR, r);
      if (r > 6) { langt++; stopp.add(`${v.task!.runda}`); } else if (r < 4 && v.task!.phase === 'do') vidEld++;
      const h = SIM.tingOf(s).find(t => t.hos === v.id); if (h) { haller++; slag = h.k; }
      if (annans.hos === v.id) tog++;
      if (h) kv = SIM.personKampe(s, v, 1, 0, v.x, v.y).vapen;
    });
    return [
      [`någon håller vakt på natten`, vaktId !== undefined],
      [`vakten går runt byn: ${stopp.size} olika stopp långt från elden (${langt} stunder), som längst ${maxR.toFixed(1)} rutor bort`, stopp.size >= 4 && maxR > 8],
      [`vakten stannar vid elden ibland (${vidEld} stunder)`, vidEld > 0],
      [`vakten har byns spjut i handen (${haller} stunder, ${slag}) och striden räknar med det (${kv})`, haller > 0 && slag === 'fiskespjut' && kv === 'fiskespjut'],
      [`vakten tar aldrig någon annans vapen (${tog} gånger)`, tog === 0],
    ];
  },
};

SCENARIER.vargskydd = {
  text: 'Skydd när vargen kommer (steg 3.7.15): när ropet hörs eller vakten väcker byn går barnen, de gamla, de sjuka och de svårt skadade in i närmaste hus (utan hus till elden), en förälder stannar hos sina små barn, och de modiga vuxna tar ett vapen och väntar vid elden. Efter en stund läggs vapnen tillbaka',
  kor: () => {
    const prov = (hus: boolean, seed: number) => {
      const s = createState(seed, START); s.kal = nyKalender(s.now, 0); klockan(s, 20); tandEld(s);
      if (hus) medHus(s);
      for (let i = 0; i < 4; i++) SIM.newTing(s, 'fiskespjut', 1, SIM.BYN);
      kor(s, 0.2);
      const c = campCenter(s), id = s.vargNr = (s.vargNr ?? 0) + 1;
      (s.vargar ??= []).push({ id, vargar: [10_000_000 + id * 8, 10_000_001 + id * 8], x: c.x + 9, y: c.y, mx: c.x + 9, my: c.y, kom: s.now, gar: s.now + 48 * HOUR, hunger: 0.1, gor: 'stryker' });
      let gom = 0, svaga = 0, iHus = 0, vidEld = 0, forsvar = 0, medVapen = 0, foralder = 0;
      kor(s, 0.4);
      s.vargar = undefined; // flocken drar vidare
      const e = SIM.eldPlats(s);
      for (const q of living(s)) {
        if (q.larm?.vad !== 'varg') continue;
        const a = ageOf(q, s.now), svag = a < SIM.ALDER.vaktFran || a >= SIM.ALDER.gammal;
        const at = q.task?.phase === 'go' ? { x: q.task.tx, y: q.task.ty } : q;
        if (svag) { svaga++; if (q.task?.act === 'gomma' || q.task?.act === 'sova' && SIM.roomAt(s, Math.floor(q.x), Math.floor(q.y))) { gom++; if (SIM.roomAt(s, Math.floor(at.x), Math.floor(at.y))) iHus++; else if (Math.hypot(at.x - e.x - 0.5, at.y - e.y - 0.5) < 5) vidEld++; } }
        if (!svag && q.task?.act === 'gomma' && /barnen/.test(q.task.why ?? '')) foralder++;
        if (q.task?.act === 'forsvar') { forsvar++; if (SIM.tingOf(s).some(t => t.hos === q.id)) medVapen++; }
      }
      kor(s, 2);
      const kvar = living(s).filter(q => q.task?.act === 'gomma' || q.task?.act === 'forsvar').length;
      const iHanden = SIM.tingOf(s).filter(t => t.k === 'fiskespjut' && t.hos !== undefined && byIdTask(s, t.hos) !== 'vakt').length;
      return { gom, svaga, iHus, vidEld, forsvar, medVapen, foralder, kvar, iHanden, skydd: s.stat?.vargSkydd ?? 0 };
    };
    const byIdTask = (s: State, id: number) => living(s).find(q => q.id === id)?.task?.act;
    const ute = [1, 2, 3].map(sd => prov(false, sd)), inne = [1, 2, 3].map(sd => prov(true, sd));
    const sum = (r: ReturnType<typeof prov>[], k: keyof ReturnType<typeof prov>) => r.reduce((a, x) => a + x[k], 0);
    return [
      [`ropet får folk att söka skydd (${sum(ute, 'skydd') + sum(inne, 'skydd')} avbrutna uppgifter)`, sum(ute, 'skydd') + sum(inne, 'skydd') > 0],
      [`utan hus håller sig barnen och de gamla vid elden (${sum(ute, 'vidEld')} av ${sum(ute, 'svaga')} som hört ropet)`, sum(ute, 'vidEld') > 0 && sum(ute, 'iHus') === 0],
      [`med hus gömmer de sig i huset (${sum(inne, 'iHus')} av ${sum(inne, 'svaga')})`, sum(inne, 'iHus') > sum(inne, 'svaga') / 2],
      [`de modiga vuxna väntar vid elden (${sum(ute, 'forsvar') + sum(inne, 'forsvar')}), med vapen i handen (${sum(ute, 'medVapen') + sum(inne, 'medVapen')})`, sum(ute, 'forsvar') + sum(inne, 'forsvar') > 0 && sum(ute, 'medVapen') + sum(inne, 'medVapen') > 0],
      [`en förälder stannar hos sina små barn (${sum(ute, 'foralder') + sum(inne, 'foralder')} gånger)`, sum(ute, 'foralder') + sum(inne, 'foralder') > 0],
      [`efter en stund går man tillbaka till det vanliga (${sum(ute, 'kvar') + sum(inne, 'kvar')} gömmer sig eller väntar kvar) och vapnen läggs tillbaka (${sum(ute, 'iHanden') + sum(inne, 'iHanden')} spjut i handen utom hos vakten)`, sum(ute, 'kvar') + sum(inne, 'kvar') === 0 && sum(ute, 'iHanden') + sum(inne, 'iHanden') === 0],
    ];
  },
};

SCENARIER.tradorr = {
  text: 'Trädörren och vargen (steg 3.7.21): en dörr av trä efter timmerhuset, i hela saker, som ersätter skinndörren. När någon gömmer sig i huset stängs den, och vargarna kommer aldrig in. En hungrig flock kan vänta utanför och stänga in dem som är där, de som vågar går ut och slåss, och efter ett tag tröttnar flocken, eller jagar hellre någon som är ensam. En skinndörr stoppar ingen',
  kor: () => {
    const { DORRAR, TEK, utanDorr, bitsOf, gridOf, roomAt, bitAt, stangt } = SIM;
    const av = DORRAR.tradorr.av as Record<string, number>, tek = TEK.tradorr;
    // ett hus där byn hänger trädörren
    const s = createState(1, START); klockan(s); tandEld(s);
    const hus = medHus(s)!;
    for (const r of s.people) r.tek = { ...r.tek, tradorr: 1 };
    setMat(s, { bar: 200 }); setAmount(s, 'ved', 40); setAmount(s, 'rep', 6);
    const opp = bitsOf(s).filter(b => b.hus === hus.id && b.k === 'oppning');
    let h = 0;
    while (!opp.every(b => b.dorr === 'tradorr') && h < 72) { kor(s, 1); h++; }
    const rum = gridOf(s).rooms.find(r => r.hus === hus.id && r.tiles.length)!, inneX = rum.tiles[0] % W + 0.5, inneY = Math.floor(rum.tiles[0] / W) + 0.5;
    // en vuxen gömmer sig i huset, de andra är långt borta och elden har slocknat; en hungrig flock kommer nära
    const prov = (dorr: string, mod: number, ensam = false) => {
      const q = cloneState(s);
      for (const b of bitsOf(q)) if (b.hus === hus.id && b.k === 'oppning') b.dorr = dorr;
      SIM.touch(q); q.fire.lit = false; q.fire.fuel = 0;
      const folk = living(q).filter(x => ageOf(x, q.now) >= SIM.ALDER.vuxen), p = folk[0], ute = folk[1];
      // (de andra är borta, utom en som är långt bort och kan komma ut ensam)
      for (const x of living(q)) if (x !== p && x !== ute) { x.left = q.now; x.task = undefined; }
      const fx = Math.min(W - 2, ute.x + 45); ute.x = fx; ute.task = { act: 'vila', phase: 'do', tx: fx, ty: ute.y, until: q.now + 20 * HOUR, carry: 0, why: 'långt borta', dark: !isLight(q.now) };
      for (const x of [p, ute]) { x.toa = x.hunger = x.torst = x.rest = 1; x.health = 1; x.skador = []; x.blod = 1; }
      p.pot.mod = mod; p.x = inneX; p.y = inneY;
      p.task = { act: 'gomma', phase: 'do', tx: inneX, ty: inneY, until: q.now + 20 * HOUR, carry: 0, why: 'Vargar är nära, gömmer sig i huset', dark: !isLight(q.now) };
      const id = q.vargNr = (q.vargNr ?? 0) + 1;
      (q.vargar ??= []).push({ id, vargar: [0, 1, 2].map(j => 10_000_000 + id * 8 + j), x: inneX + 8, y: inneY, mx: inneX + 8, my: inneY, kom: q.now, gar: q.now + 48 * HOUR, hunger: 1, gor: 'stryker' });
      let inne = 0, vantade = 0, gomde = 0, anfoll = false, stangd = false;
      const seen = new Set<string>();
      kor(q, 4, q => {
        const f = q.vargar?.[0]; if (!f) return;
        seen.add(f.gor);
        const nu = stangt(q, roomAt(q, inneX, inneY)!); // (vargen får gå in när dörren öppnats)
        if (nu) stangd = true;
        if (nu && (roomAt(q, f.x, f.y) === roomAt(q, inneX, inneY) || bitAt(q, f.x, f.y))) inne++;
        if (f.gor === 'vantar') { vantade++; if (p.task?.act === 'gomma') gomde++; if (ensam && ute && !anfoll) { ute.x = f.x + 6; ute.y = f.y + 4; ute.task = { act: 'vila', phase: 'do', tx: ute.x, ty: ute.y, until: q.now + 5 * HOUR, carry: 0, why: 'ensam ute' }; anfoll = true; } }
      });
      const strider = (q.strider ?? []).map(x => x.orsak);
      return { inne, vantade, gomde, seen, strider, st: q.stat ?? {}, stangd, byte: q.vargar?.[0]?.byte, ute: ute.id };
    };
    const tra = prov('tradorr', 0), modig = prov('tradorr', 20), annan = prov('tradorr', 0, true), skinn = prov('skinndorr', 0);
    const ordn = cloneState(s); for (const b of bitsOf(ordn)) if (b.k === 'oppning') b.dorr = 'tradorr';
    return [
      [`trädörren görs av ${Object.entries(av).map(([k, n]) => `${n} ${k}`).join(' och ')} (hela saker) och är en teknik efter timmerhuset`, Object.values(av).every(n => Number.isInteger(n) && n >= 1) && !!tek && tek.krav.includes('timmervagg')],
      [`byn hänger trädörren i husets ${opp.length} öppning${opp.length > 1 ? 'ar' : ''} på ${h} timmar, och en skinndörr ersätter den aldrig (${utanDorr(ordn, 'skinndorr').length} öppningar vill ha en skinndörr)`, opp.every(b => b.dorr === 'tradorr') && utanDorr(ordn, 'skinndorr').length === 0],
      [`dörren stängs när någon gömmer sig i huset`, tra.stangd],
      [`flocken väntar utanför den stängda dörren (${tra.vantade} slag) och den som gömmer sig stannar inne (${tra.gomde} slag)`, tra.vantade > 0 && tra.gomde === tra.vantade],
      [`vargarna kommer aldrig in i det stängda huset (${tra.inne + modig.inne + annan.inne} slag)`, tra.inne + modig.inne + annan.inne === 0],
      [`efter ett tag tröttnar flocken (${tra.st.vargTrottnade ?? 0}) och ingen strid blir av (${tra.strider.length})`, (tra.st.vargTrottnade ?? 0) > 0 && tra.strider.length === 0],
      [`den som vågar går ut och slåss (${modig.strider.join(', ') || 'ingen strid'})`, modig.strider.includes('vargar utanför dörren')],
      [`ser flocken någon ensam ute jagar den hellre den (${[...annan.seen].join(', ')}; ${annan.strider.join(', ') || 'ingen strid'})`, annan.seen.has('anfaller') && annan.strider.includes('vargar när vargarna anföll')],
      [`en skinndörr stoppar ingen: dörren stängs inte (${skinn.stangd ? 'stängd' : 'öppen'}), och vargarna går in och anfaller den som är ensam där (${skinn.strider.join(', ') || 'ingen strid'})`, !skinn.stangd && skinn.vantade === 0 && skinn.strider.includes('vargar när vargarna anföll')],
      [`varje rum har en dörr eller öppning (${gridOf(s).rooms.filter(r => r.tiles.length).length} rum; vakten i testerna larmar annars)`, gridOf(s).rooms.every(r => !r.tiles.length || r.open > 0)],
    ];
  },
};

SCENARIER.stridkronika = {
  text: 'Striderna i krönikan (steg 3.7.16): den som dör eller skadas svårt i ett slagsmål skrivs i krönikan, liksom varje vargjakt, den som skadas svårt när vargar anfaller och byns första fällda varg. Vanliga slagsmål och lekar skrivs inte',
  kor: () => {
    const krn = (s: State) => (s.hist?.kronika ?? []).map(([, t]) => t), slag = (s: State) => (s.hist?.kronika ?? []).map(k => k[2] ?? '');
    // slagsmål i byn: med vapen och avsikten skada blir någon svårt skadad eller dör, med händerna oftast inte
    const s = createState(11, START), [p, q] = living(s).filter(x => ageOf(x, s.now) >= SIM.ALDER.vuxen);
    SIM.addTool(s, 'flintspjut', p);
    const fore = krn(s).length;
    let svara = 0, vanliga = 0, lekar = 0;
    for (let i = 0; i < 40; i++) {
      const n0 = krn(s).length, st = SIM.stridIByn(s, i % 2 ? 'skada' : 'slagsmal', [[p], [q]], 'för att pröva');
      const svart = st.kampar.some(k => SIM.svartSkadad(k) || k.lage === 'dod');
      if (svart) svara++; else if (krn(s).length > n0) vanliga++;
      for (const x of [p, q]) { x.skador = []; x.health = 1; x.blod = 1; x.task = undefined; x.died = undefined; }
    }
    const slagRader = krn(s).length - fore;
    const barn = living(s).filter(x => ageOf(x, s.now) >= SIM.ALDER.smabarn && ageOf(x, s.now) < SIM.ALDER.vuxen);
    if (barn.length >= 2) for (let i = 0; i < 20; i++) {
      const n0 = krn(s).length, st = SIM.stridIByn(s, 'lek', [[barn[0]], [barn[1]]], 'på lek');
      if (krn(s).length > n0 && !st.kampar.some(k => SIM.svartSkadad(k))) lekar++;
      for (const x of barn) { x.skador = []; x.health = 1; x.blod = 1; x.task = undefined; }
    }
    // vargjakt: en rad efter varje jakt, och byns första fällda varg
    const v = createState(12, START), jag = living(v).filter(x => ageOf(x, v.now) >= SIM.ALDER.vuxen).slice(0, 3);
    for (const x of jag) SIM.addTool(v, 'flintspjut', x);
    let jakter = 0, forsta = 0;
    for (let i = 0; i < 6; i++) {
      const id = v.vargNr = (v.vargNr ?? 0) + 1, c = campCenter(v);
      const f: SIM.Vargflock = { id, vargar: [10_000_000 + id * 8], x: c.x + 5, y: c.y, mx: c.x + 5, my: c.y, kom: v.now, gar: v.now + 48 * HOUR, hunger: 0.5, gor: 'stryker' };
      (v.vargar ??= []).push(f);
      const n0 = krn(v).length;
      SIM.vargStrid(v, f, jag.filter(x => x.health > 0), 'doda', 'på vargjakt');
      const nya = slag(v).slice(n0);
      if (nya.some(t => t === 'k_vargjakt' || t === 'k_vargSprang')) jakter++;
      forsta += slag(v).includes('k_forstaVarg') ? 1 : 0;
      v.vargar = undefined;
      for (const x of jag) { x.skador = []; x.blod = 1; x.task = undefined; }
    }
    const forstaRader = slag(v).filter(t => t === 'k_forstaVarg').length;
    const exempel = [...krn(s).slice(fore), ...krn(v)].slice(0, 3).join(' | ');
    return [
      [`ett slagsmål där någon skadas svårt eller dör skrivs i krönikan (${svara} av 40 strider, ${slagRader} rader; t.ex. ${exempel})`, svara > 0 && slagRader >= svara],
      [`vanliga slagsmål skrivs inte (${vanliga} rader utan svår skada)`, vanliga === 0],
      [`lekar skrivs inte (${lekar} rader)`, barn.length < 2 || lekar === 0],
      [`varje vargjakt skrivs (${jakter} av 6)`, jakter === 6],
      [`byns första fällda varg skrivs en gång (${forstaRader})`, forstaRader === (forsta > 0 ? 1 : 0) && forsta > 0],
    ];
  },
};

SCENARIER.ran = {
  text: 'Stölder med våld (steg 3.7.17): den som är desperat nog att stjäla och aggressiv tar hellre med våld av någon i närheten än ur förrådet. Det blir ett slagsmål, vinnaren får saken, och de som såg det tycker att hen är våldsam och en tjuv. Den som får ett utbrott går helst på den nära hen är arg på',
  kor: () => {
    // a svälter (hälsan sjunker), har ingen mat och ingen av byns; b har mat och står nära, d ser på
    const ny = (fro: number, agg: number) => {
      const s = createState(fro, START), vuxna = living(s).filter(x => ageOf(x, s.now) >= SIM.ALDER.vuxen), a = vuxna[0];
      const [b, d] = vuxna.filter(x => x !== a && !SIM.isFamily(a, x));
      for (const q of living(s)) q.habit = {}; // ingen sed om att dela
      if (s.delning) s.delning.andel = 0; // det man samlar är ens eget
      for (const k of SIM.FOOD) setAmount(s, k, 0);
      gain(s, b, 'bar', 6);
      a.pot.aggression = agg; a.pot.empati = 1; a.hunger = 0; a.health = 0.7; a.task = undefined; b.task = undefined; d.task = undefined;
      b.x = a.x + 2; b.y = a.y; d.x = a.x - 2; d.y = a.y;
      for (const q of living(s)) if (q !== a && q !== b && q !== d) { q.x = a.x + 60; q.y = a.y + 60; }
      for (const q of [b, d]) { SIM.getRel(s, a, q).op = 0; q.partner = undefined; }
      return { s, a, b, d };
    };
    let ran = 0, vann = 0, vald = 0, tjuv = 0, fick = 0, stolAgg = 0;
    for (let i = 0; i < 12; i++) {
      const { s, a, b, d } = ny(20 + i, 20);
      if (!d) continue;
      for (let h = 0; h < 6 && !s.stat?.ran; h++) SIM.needLadder(s, a, 3600);
      if (!s.stat?.ran) continue;
      ran++; stolAgg += s.stat?.stold_mat ?? 0;
      if (s.stat?.ranVann) { vann++; if (ownsAmount(s, b, 'bar') < 6) fick++; }
      if (SIM.intryckOm(d, a.id, 'valdsam')) vald++;
      if (SIM.intryckOm(d, a.id, 'tjuv')) tjuv++;
    }
    // den som inte är aggressiv stjäl som förut, utan våld
    let fredlig = 0, stal = 0;
    for (let i = 0; i < 6; i++) {
      const { s, a } = ny(40 + i, 3);
      for (let h = 0; h < 6; h++) SIM.needLadder(s, a, 3600);
      fredlig += s.stat?.ran ?? 0; stal += s.stat?.stold_mat ?? 0;
    }
    // hämnd: utbrottet går helst ut över den nära man är arg på, inte bara den närmaste
    const { s, a, b, d } = ny(60, 10);
    d.x = a.x - 8; SIM.getRel(s, a, d).op = -50; SIM.getRel(s, a, b).op = 0;
    const arg = SIM.utbMal(s, a, true) === d, nast = SIM.utbMal(s, a) === b;
    SIM.getRel(s, a, d).op = -10;
    const inteArg = SIM.utbMal(s, a, true) === b;
    return [
      [`den aggressiva svältande rånar någon nära (${ran} av 12 byar), i stället för att stjäla (${stolAgg} stölder)`, ran >= 8 && stolAgg === 0],
      [`vinnaren tar saken (vann ${vann}, fick maten ${fick})`, vann > 0 && fick === vann],
      [`de som såg det tycker att hen är våldsam (${vald} av ${ran}) och en tjuv (${tjuv} av ${ran})`, vald === ran && tjuv === ran],
      [`den som inte är aggressiv rånar inte (${fredlig}) men stjäl (${stal})`, fredlig === 0 && stal > 0],
      [`utbrottet går ut över den man är arg på (${arg}), annars den närmaste (${nast}, ${inteArg})`, arg && nast && inteArg],
    ];
  },
};

SCENARIER.arbete = {
  text: 'Arbetet som syns (steg 3.10.3): jägaren som ser en grupp kaniner går dit, och den som inte ser någon letar dit viltkartan säger att de brukar vara. Jobben har en undertext och bänkarna ett verb, ingen går avsides på toa vid ett bord eller en bänk, fiskrensaren står vid slaktbänken och den som äter vid bordet har maten framför sig',
  kor: () => {
    const { JAKT, jaktForsok, underText, taskText, verbOf, viltStart, spotFor, vidStation, needLadder, bordVid, STATIONER, ACTS, FOOD } = SIM;
    const s0 = createState(6, START); klockan(s0); tandEld(s0);
    const p0 = living(s0).find(q => ageOf(q, s0.now) >= 16)!;
    const jakt = (s: State, x: number, y: number) => ({ act: 'jakt', phase: 'do', tx: x, ty: y, until: s.now + 2 * HOUR, carry: 0, dark: !SIM.isLight(s.now) }) as SIM.Task;
    // nära en kanin smyger jägaren; ser hen en grupp längre bort går hen dit
    const s1 = cloneState(s0), p1 = SIM.byId(s1, p0.id)!, k = djurOf(s1)[0];
    const nara = jakt(s1, k.x, k.y), r1 = jaktForsok(s1, p1, nara);
    // en plats där ingen kanin är nära men någon syns
    const md = SIM.KANINER.narvR + SIM.KANINER.hopp * SIM.KANINER.hoppMax, tiles = getMap(s1.seed).tiles;
    let gx = -1, gy = -1;
    for (let r = Math.ceil(md) + 1; r < JAKT.letaR - 1 && gx < 0; r++) for (let v = 0; v < 32 && gx < 0; v++) {
      const x = k.x + r * Math.cos(v * Math.PI / 16), y = k.y + r * Math.sin(v * Math.PI / 16);
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || tiles[Math.floor(y) * W + Math.floor(x)] === T.Vatten) continue;
      if (djurOf(s1).every(d => Math.hypot(d.x - x, d.y - y) > md)) { gx = x; gy = y; }
    }
    const bort = jakt(s1, gx, gy); Object.assign(p1, { x: gx, y: gy });
    const r2 = gx >= 0 ? jaktForsok(s1, p1, bort) : 0;
    // inga kaniner alls: hen letar dit viltkartan är hög, i vanlig fart, tills en grupp syns eller jakten är slut
    const s = cloneState(s0), p = SIM.byId(s, p0.id)!;
    for (let i = 0; i < 9 && djurOf(s).length; i++) s.djurDoda = [...(s.djurDoda ?? []), ...djurOf(s).map(d => ({ id: d.id, t: s.now }))];
    const c = campCenter(s), tk = jakt(s, c.x + 0.5, c.y + 0.5); Object.assign(p, { x: tk.tx, y: tk.ty });
    const r3 = jaktForsok(s, p, tk), d3 = Math.hypot(tk.tx - p.x, tk.ty - p.y);
    const v = viltStart(s, s.now), vi = Math.floor(tk.ty) * W + Math.floor(tk.tx);
    let hogre = 0, alla = 0;
    for (let dy = -JAKT.letaMax; dy <= JAKT.letaMax; dy++) for (let dx = -JAKT.letaMax; dx <= JAKT.letaMax; dx++) {
      const x = Math.floor(p.x) + dx, y = Math.floor(p.y) + dy, d = Math.hypot(dx, dy);
      if (d < JAKT.letaMin || d > JAKT.letaMax || x < 0 || y < 0 || x >= W || y >= H || getMap(s.seed).tiles[y * W + x] === T.Vatten) continue;
      alla++; if (v[y * W + x] > v[vi]) hogre++;
    }
    const under3 = underText(tk);
    p.task = tk; p.hunger = 1; p.torst = 1; p.rest = 1; const x0 = p.x, y0 = p.y;
    kor(s, 1.5);
    const soker = s.stat?.jaktSoker ?? 0, gick = Math.hypot(p.x - x0, p.y - y0);
    // toa: aldrig bredvid ett bord eller en bänk, och fiskrensaren står vid slaktbänken
    const b = cloneState(s0), bp = SIM.byId(b, p0.id)!, bord = medBank(b, 'bord'), bank = medBank(b, 'slaktbank');
    let vidBank = 0;
    for (let i = 0; i < 300; i++) { const sp = spotFor(b, 'toa', bp); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (SIM.stationAt(b, sp.x + dx, sp.y + dy) || SIM.sittAt(b, sp.x + dx, sp.y + dy)) vidBank++; }
    const at = vidStation(bank);
    let langt = 0;
    for (let i = 0; i < 50; i++) { const sp = spotFor(b, 'rensa', bp); if (Math.hypot(sp.x - at.x, sp.y - at.y) > 2) langt++; }
    // måltiden: maten på bordet och i händerna
    setMat(b, { bar: 100 });
    const plats = SIM.ledigPlats(b, bp)!;
    Object.assign(bp, { x: plats.x, y: plats.y, hunger: 0.1 });
    bp.task = { act: 'maltid', phase: 'do', tx: plats.x, ty: plats.y, until: b.now + HOUR, carry: 0 } as SIM.Task;
    needLadder(b, bp, 60);
    const mal = bp.task?.mal;
    // verben vid bänkarna och undertexterna
    const verb = verbOf('rensa') === 'rensar' && verbOf('slakta') === 'slaktar' && verbOf('yxa') === 'gör' && verbOf('grilla') === 'grillar';
    const gor = Object.values(STATIONER).flatMap(d => d.gor).every(a => verbOf(a).length > 0);
    const text = taskText(nara) === 'Jagar: smyger på byte' && taskText({ act: 'elda', phase: 'back', tx: 0, ty: 0, until: 0, carry: 1 }) === 'Lägger trä på elden: bär trä till elden';
    return [
      [`nära en kanin smyger jägaren (${r1}, ${underText(nara)})`, r1 === 0 && !!nara.jf && nara.leta === undefined && underText(nara) === 'smyger på byte'],
      [`ser hen en grupp längre bort går hen dit (${r2}, ${underText(bort)})`, gx >= 0 && r2 === -2 && bort.leta === 'grupp' && bort.phase === 'go' && underText(bort) === 'går mot kaninerna'],
      [`ser hen ingen letar hen ${d3.toFixed(1)} rutor bort (${under3}), dit viltkartan är högre än på ${alla - hogre} av ${alla} rutor`, r3 === -2 && tk.leta === 'karta' && under3 === 'letar efter byte' && d3 >= JAKT.letaMin - 1 && d3 <= JAKT.letaMax + 1 && hogre < alla * 0.15],
      [`... och fortsätter leta (${soker} gånger på 1,5 timmar, gick ${gick.toFixed(1)} rutor)`, soker >= 2 && gick >= JAKT.letaMin],
      [`ingen går avsides på toa bredvid ett bord eller en bänk (${vidBank} av 300)`, !!bord && vidBank === 0],
      [`fiskrensaren står vid slaktbänken (${langt} av 50 längre bort)`, langt === 0],
      [`den som äter vid bordet har maten framför sig (${mal ?? 'ingen'})`, !!mal && FOOD.includes(mal) && !!bordVid(b, bp)],
      ['bänkarna har ett verb ("Arkiv rensar") och toa en egen symbol', verb && gor && ACTS.toa.ikon === 'a_toa'],
      ['jobben har en undertext ("Jagar: smyger på byte")', text],
    ];
  },
};
