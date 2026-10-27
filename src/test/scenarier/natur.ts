// Scenarier. Djur och natur: djur, abborre, sjön, kaniner, rötter, värmekartor och naturen.
import { FANGST, createState, bearbeta, canProcess, makeTool, step, living, cloneState, ageStart, nyKalender, pilesOf, amountOf, STACK, isLight, T, ageOf, groundOf, getMap, DAY, HOUR, W, State, tileOf, findL, areaOf, describe, campDist, campCenter, FYND, FYND_IDS, GRUPPER, fyndAt, takeFrom, packFynd, growFynd, H, vaxerAt, richness, observe, hoped, Lager, skyggOf, grupperOf, KANINER, share, djurOf, KANIN, SLAKT, DJUR, DJURARTER, gain, ownsAmount, setAmount, BEAT, matGott, barnMat, hungerFlytt, regulate, EKONOMI, SAMTALSSLAG, SAKER } from '../../sim';
import * as SIM from '../../sim';
import { FOREST, isSoil } from '../../sim/vag';
import { START, STEG_DYGN, STEG_TIM } from '../kor';
import { setMat, kor, klockan, bastaJaktruta, SCENARIER, flyttLitenBy, tandEld, medBank, medHus } from './hjalp';

SCENARIER.djur = {
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
      p.task = { act: 'jakt', phase: 'do', tx: bx, ty: by, until: s.now + HOUR, carry: 0, why: 'prov', dark: !isLight(s.now) };
      p.x = bx; p.y = by;
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
    setMat(s, { vilt: 3 * KANIN }); setAmount(s, 'ben', 0); setAmount(s, 'skinn', 0); setAmount(s, 'rep', 0);
    const kan = canProcess(s, p, DJUR.kanin);
    bearbeta(s, p, DJUR.kanin, 1);
    const slakt = Math.abs(amountOf(s, 'kott') - 3 * SLAKT.kott * SIM.kottFaktor(p)) < 1e-9 && amountOf(s, 'vilt') < 1e-9 && Math.abs(amountOf(s, 'ben') - 3) < 1e-9 && Math.abs(amountOf(s, 'skinn') - 3) < 1e-9;
    // senorna blir ibland ett rep, men bara för den som kan tekniken Rep
    const repAv = (kan: boolean) => { let r = 0; for (let i = 0; i < 200; i++) { setMat(s, { vilt: KANIN }); setAmount(s, 'rep', 0); p.tek = { ...p.tek, rep: kan ? 1 : 0 }; bearbeta(s, p, DJUR.kanin, 1); r += amountOf(s, 'rep'); } return r; };
    const medRep = repAv(true), utanRep = repAv(false);
    // receptet i saker.ts (för värdet) och DJUR (det som händer) säger samma sak: inom 10 %
    const fran = (art: (typeof DJURARTER)[number]) => Object.entries(art.slakt).reduce((x, [k, n]) => x + (SAKER[k]?.skaffa?.av?.[art.sak] ?? NaN) * n, 0) / art.mat;
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
  kor: () => {
    const s = createState(1, START);
    klockan(s);
    const [a, c] = living(s);
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
      if (fangat > 0) break;
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
    return [
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
      // rötternas andel räknas på platsen före uttaget (motor-9): annars blir en del av rötterna bär
      [`i istiden växer inga bär, så allt som samlas är rötter (${istid.b.toFixed(4)} bär)`, istid.r > 0 && istid.b < 1e-9],
      [`på sommaren mest bär`, sommar.b > sommar.r],
      [`bär och rötter i egna stackar, och ingen bärstack rymmer mer än ${STACK.bar}`, sommar.skild && istid.skild],
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
    // att berätta om en plats ändrar inte när den sågs, och den som hör det får samma tid (återväxten räknas därifrån)
    const [t1, t2, t3] = living(s).slice(2, 5), sedd = s.now - 5 * DAY;
    t1.lardomar = [{ k: 'samla', a: aa, v: 0.2, g: 3, c: 0.9, t: sedd, led: 0 }]; t2.lardomar = [];
    t3.lardomar = [{ k: 'samla', a: aa, v: 1, g: 3, c: 0.05, t: s.now - DAY, src: p.id, led: 2 }];
    for (let n = 0; n < 200 && !findL(t2, 'samla', aa); n++) share(s, t1, t2, { op: 60 } as never, SAMTALSSLAG['berättelse']);
    for (let n = 0; n < 200 && findL(t3, 'samla', aa)!.led !== 1; n++) share(s, t1, t3, { op: 60 } as never, SAMTALSSLAG['berättelse']);
    const tidKvar = t1.lardomar[0].t === sedd && findL(t2, 'samla', aa)?.t === sedd && findL(t3, 'samla', aa)!.t === sedd;
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
      ['att berätta om en plats ändrar inte när den sågs, och den som hör det får samma tid', tidKvar],
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
    const s = createState(5, START), n = living(s).length, n0 = s.people.length, mat = () => setMat(s, { bar: EKONOMI.matPerDygn * n * 12 });
    mat(); s.matSnitt = 2; // tolv dygns mat i förrådet, men ett knappt år bakom sig
    const fore = barnMat(s, 12), flytt = flyttLitenBy(s);
    for (let t = 0; t < 3 * STEG_DYGN; t++) { regulate(s, BEAT); if (s.people.length !== n0) { s.people.length = n0; mat(); } } // (nybyggare skickas vidare)
    const efter = s.matSnitt!;
    return [
      [`ett knappt år: färre barn (${fore.toFixed(2)} av det vanliga) och fler flyttar (${hungerFlytt({ ...s, matSnitt: 2 } as State, 12).toFixed(2)} per dygn) i en by på 12`, fore < 0.5 && hungerFlytt({ ...s, matSnitt: 2 } as State, 12) > 0.5],
      [`en by på sex flyttar inte för maten och får lika många barn (${flytt})`, flytt === 'ingen'],
      [`efter tre dygn (tre år i spelet) med tolv dygns mat har snittet nått dit (${efter.toFixed(1)})`, efter > 11 && efter < 12.1],
      [`gott om mat: inga färre barn, ingen flytt för maten (${matGott(s).toFixed(2)})`, matGott(s) === 1 && barnMat(s, 12) === 1 && hungerFlytt(s, 12) === 0],
    ];
  },
};

SCENARIER.slaktbank = {
  text: 'Slaktbänken (steg 2.2.3) byggs av trä av den som kommit på den (steg 2.2.11). Vid den slaktas viltet och rensas fisken, och en kniv hör till bänken och ligger kvar där. Viltet slaktas bara vid bänken; innan den finns äts det som det är. Också fisken rensas bara vid bänken (steg 2.2.8). Jaktfärdigheten avgör hur mycket kött en kanin ger',
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
    const avElden = st ? Math.hypot(st.x - getMap(s.seed).fire.x, st.y - getMap(s.seed).fire.y) : 0;
    const bredd = STATIONER.slaktbank.w, ingenAnnan = !!st && Array.from({ length: bredd }, (_, i) => !usable(s, st.x + i, st.y) && SIM.stationAt(s, st.x + i, st.y) === st).every(Boolean) && !SIM.stationAt(s, st.x + bredd, st.y);
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
    const kottOk = Math.abs(ny - 3 * SLAKT.kott * REDSKAP.kottMin) < 1e-6 && Math.abs(van - 3 * SLAKT.kott * REDSKAP.kottMax) < 1e-6 && Math.abs(kottFaktor(p) - REDSKAP.kottMax) < 1e-9;
    return [
      [`slaktbänken byggs av ${STATION.slaktbankTra} trä på ${h} timmar av den som kan göra en kniv (${byggare})`, klar && enda && ved0 - amountOf(s, 'ved') >= STATION.slaktbankTra - 1e-9 && byggare.includes(STATIONER.slaktbank.bygger)],
      ['den första slaktbänken står i loggen', logg],
      [`bänken står nära elden (${avElden.toFixed(1)} rutor) och tar ${bredd} rutor, där inget annat får ligga`, avElden >= 1.5 && avElden <= 5 && ingenAnnan],
      [`en kniv hör till bänken, är byns och ligger kvar där (${tomma ? 'en ny kniv lades där' : 'en kniv ur förrådet flyttades dit när bänken blev klar'})`, ligger],
      ['den som slaktar utan egen kniv tar bänkens, och den läggs tillbaka vid bänken', tog && tillbaka],
      ['viltet slaktas och fisken rensas vid bänken', vidBank],
      ['utan bänk slaktas och rensas inget: viltet och abborren ligger kvar att ätas som de är', ingenSlakt && kvar],
      [`jaktfärdigheten avgör köttet: ${ny.toFixed(2)} kött av tre kaniner för den ovane, ${van.toFixed(2)} för den vane`, kottOk && van > ny],
    ];
  },
};

SCENARIER.flatarbank = {
  text: 'Slöjdbänken (steg 2.2.4) byggs av trä och grenar av den som kommit på den (steg 2.2.11). Vid den tvinnas rep fortare än för hand vid elden, och korgen flätas bara där. Handarbetet är alltid något bestämt som tar material och ger en sak',
  kor: () => {
    const { STATION, STATIONER, stationerOf, stationFor, isKlar, vidStation, spotFor, twineRope, wantsTool, thinkWhileWorking } = SIM;
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
      return amountOf(w, 'rep');
    };
    const hand = rep(false), vidB = rep(true);
    // en vanlig by tills någon tvinnar rep, högst tio dygn (tio år i spelet): inget handarbete utan sak, och rep tvinnas som en egen handling
    const v = createState(3, START); // en by som kommer på repet tidigt (by 2 kom inte på det inom tio dygn i v75)
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
    const register = STATION_LIST.every(k => { const tk = STATIONER[k].tek[0]; return STATIONER[k].tek.length === 1 && !!TEK[tk] && (tk === k || (STATIONER as Record<string, SIM.StationDef>)[tk]?.tek[0] === tk); });
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
      ['varje station är en teknik med samma namn, och tekniken är det som krävs för att bygga den', register],
      ['slaktbänken kommer efter kniven, slöjdbänken efter repet och korgen efter slöjdbänken', ordning],
      ['den som kan kniven och repet men inte stationerna bygger ingen; med teknikerna kan hen', utan && med],
      ['den som jagar med kniv och tvinnar rep kommer på slaktbänken och slöjdbänken', kommer],
      ['korgen kommer man inte på utan slöjdbänken', ingenKorg],
      ['i en sparad by med en slaktbänk kan de som kan kniven bygga den', sparad],
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
      ['skinnfällen är en egen teknik efter halmbädden, och byn måste ha skinn', !!tek && tek.krav.includes('halmbadd') && tek.material.some(g => g.includes('skinn'))],
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
      ['skinndörren är en egen teknik efter timmerhuset, och byn måste ha skinn', !!tek && tek.krav.includes('timmervagg') && tek.material.some(g => g.includes('skinn'))],
    ];
  },
};

SCENARIER.blod = {
  text: 'Slaktbänken blir blodig (steg 2.7.1): stationsregistret säger vilka handlingar som smutsar ner en station och med vad, och fläckarna (registret FLACKAR) bleknar bort på ett par dygn. Bara utseende: fläckarna rör inte slumpen',
  kor: () => {
    const { FLACKAR, flackarOf, flackNu, smutsa, smutsVid, STATIONER, tidyTools, storlekAv } = SIM;
    const s = createState(1, START); klockan(s); tandEld(s);
    for (const r of s.people) r.tek = { ...r.tek, kniv: 1, slaktbank: 1, rep: 0 };
    const t = medBank(s), p = living(s).find(r => ageOf(r, s.now) >= 18)!;
    setAmount(s, 'kniv', 1); tidyTools(s);
    const { w, h } = storlekAv(t);
    const nara = (i: number) => { const x = i % W, y = Math.floor(i / W); return x >= t.x - 1 && x <= t.x + w && y >= t.y && y <= t.y + h; };
    // fisken rensas vid samma bänk men blöder inte
    setMat(s, { abborre: 3 }); bearbeta(s, p, DJUR.abborre, 1);
    const rensaRent = flackarOf(s).length === 0 && amountOf(s, 'fisk') > 0;
    // slakten gör fläckar på bänken och raden framför
    setMat(s, { vilt: 3 * KANIN }); bearbeta(s, p, DJUR.kanin, 1);
    const fl = flackarOf(s), blod = fl.length > 0 && fl.every(f => f.k === 'blod' && nara(f.i) && f.n > 0 && f.n <= 1);
    const vid = smutsVid(s, t).blod ?? 0;
    // fläckarna bleknar jämnt och är borta efter bleknar timmar
    const f0 = fl[0]!, b = FLACKAR.blod.bleknar * HOUR;
    const halv = flackNu(f0, f0.t + b * f0.n / 2), borta = flackNu(f0, f0.t + b * f0.n + 1);
    const bleknar = Math.abs(halv - f0.n / 2) < 1e-9 && borta === 0;
    // de bortbleknade tas bort när nya kommer, och slumpen rörs inte
    s.now += b + HOUR;
    const rng0 = JSON.stringify(s.rngs), st0 = JSON.stringify(s.stat);
    smutsa(s, 'slakta', 1);
    const rensat = flackarOf(s).length === 1 && JSON.stringify(s.rngs) === rng0 && JSON.stringify(s.stat) === st0;
    // en station utan smutsar gör inga fläckar, och fläckarna följer med när byn sparas
    const andra = (Object.keys(STATIONER) as (keyof typeof STATIONER)[]).filter(k => k !== 'slaktbank' && (STATIONER[k] as SIM.StationDef).smutsar).length === 0;
    const sparad = JSON.stringify(cloneState(s).flackar) === JSON.stringify(s.flackar);
    // i en by som lever: bänken blir blodig av sig själv när det finns vilt att slakta
    const u = createState(1, START); klockan(u); tandEld(u);
    for (const r of u.people) r.tek = { ...r.tek, kniv: 1, slaktbank: 1 };
    medBank(u); setAmount(u, 'kniv', 2); tidyTools(u); setMat(u, { vilt: 6 * KANIN, bar: 100 }); setAmount(u, 'ved', 40);
    let h2 = 0; while (!flackarOf(u).length && h2 < 24) { kor(u, 1); h2++; }
    return [
      ['rensningen av fisken gör inga fläckar', rensaRent],
      [`slakten gör blodfläckar på bänken och raden framför (${fl.length} st)`, blod],
      [`stationsfliken ser blodet: ${Math.round(vid * 100)} %`, vid > 0],
      [`fläckarna bleknar jämnt och är borta efter ${FLACKAR.blod.bleknar} timmar i full styrka`, bleknar],
      ['de bortbleknade tas bort när en ny fläck kommer, och fläckarna rör varken slumpen eller statistiken', rensat],
      ['bara slaktbänken smutsar ner', andra],
      ['fläckarna följer med när byn sparas', sparad],
      [`i en by där det slaktas blir bänken blodig av sig själv (efter ${h2} timmar)`, flackarOf(u).length > 0],
    ];
  },
};

SCENARIER.latrin = {
  text: 'Toa-smuts och latriner (steg 2.7.2): den som går på toa utanför en latrin lämnar en fläck som bleknar på två dygn. Den äcklar den som går förbi, man plockar inte där, och nära vattnet smutsar den vattnet. Latrinen är en grop i byns utkant som grävs med benspaden: man går dit, får vara ifred och lämnar ingen fläck, gropen fylls och fylls igen, och byn gräver en ny. Får någon ont i magen av toa-smutsat vatten lär sig byn att lägga latrinen långt från vattnet. Benspaden görs av tre ben, ett rep och en gren och gräver fram rötter fortare',
  kor: () => {
    const { flackarOf, toaBesok, akel, toaNara, toaVatten, vattenSmuts, smutsOf, forSmutsigt, magont, latrinFor, latrinBrist, stationSite, STATION, shoreOf, tidyTools, stationerOf, isKlar } = SIM;
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
    const tillVatten = (at?: { x: number; y: number }) => { if (!at) return -1; const m = getMap(s.seed); let d = 99; for (let j = 0; j < W * H; j++) if (m.tiles[j] === T.Vatten) d = Math.min(d, Math.hypot(j % W - at.x, Math.floor(j / W) - at.y)); return d; };
    const u0 = createState(3, START), u1 = cloneState(u0); u1.hygien = 1;
    const d0 = tillVatten(stationSite(u0, 'latrin')), d1 = tillVatten(stationSite(u1, 'latrin'));
    const at = stationSite(u0, 'latrin'), utkant = !!at && campDist(u0, at.x, at.y) >= STATION.latrinFran && campDist(u0, at.x, at.y) <= STATION.latrinTill;
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
      ['fläcken bleknar bort på två dygn (två år i spelet, två dagar i verkligheten)', bleknat],
      [`en fläck på stranden gör vattnet smutsigare (${v0.toFixed(2)} → ${v1.toFixed(2)})`, vatten],
      [`ont i magen av toa-smutsat vatten lär byn hygien (${(s.hygien ?? 0).toFixed(2)})`, hygien],
      [`latrinen ligger i byns utkant, och längre från vattnet när byn kan hygien (${d0.toFixed(1)} → ${d1.toFixed(1)} rutor)`, utkant && d1 >= d0],
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
