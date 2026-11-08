// fas 9, system 9.2: samtalens ämnen i 8 punkter (steg 9.2.10), en version per symbol som Björn säger ja eller nej till.
(() => {
  const L = { k: 'kol0', r: 'rost2', R: 'rost3', y: 'senap1', Y: 'senap2', j: 'jord2', s: 'skiffer2', b: 'skiffer1' };
  // den lilla pratbubblan: ljus botten (ben 3) med mörk kant, 12 × 11 punkter och spetsen nere till vänster, med symbolen mitt i
  const bubbla = (B, rader) => {
    const P = B.P;
    for (let y = 0; y < 18; y++) for (let x = 0; x < 20; x++) B.satt(x, y, P.i('oliv', 2));
    for (let y = 2; y < 13; y++) for (let x = 4; x < 16; x++) { const hörn = (x === 4 || x === 15) && (y === 2 || y === 12); if (!hörn) B.satt(x, y, (x === 4 || x === 15 || y === 2 || y === 12) ? P.i('kol', 2) : P.i('ben', 3)); }
    B.satt(7, 13, P.i('ben', 3)); B.satt(6, 13, P.i('kol', 2)); B.satt(8, 13, P.i('kol', 2)); B.satt(7, 14, P.i('kol', 2));
    ritaSprite(B, rader, L, 6, 4);
  };
  VAL.push(
    { id: 'f9_amne_gral', namn: 'Samtalets ämne: Gräl', typ: 'janej', vad: 'Steg 9.2.10: pratbubblorna har en enda storlek, den lilla, och varje ämne får en symbol i 8 punkter i stället för en större bild i halv skala. Ja eller nej?', versioner: [{ text: 'Ämnet gräl: två arga streck, i den lilla pratbubblan.', w: 20, h: 18, rita: B => bubbla(B, ['........', '.r...r..', 'rrr.rrr.', '.r...r..', '........', '.r...r..', '........', '........']) }] },
    { id: 'f9_amne_varsel', namn: 'Samtalets ämne: En motgång som kommer', typ: 'janej', vad: 'Steg 9.2.10: pratbubblorna har en enda storlek, den lilla, och varje ämne får en symbol i 8 punkter i stället för en större bild i halv skala. Ja eller nej?', versioner: [{ text: 'Ämnet en motgång som kommer: en mörk triangel med ett öga, i den lilla pratbubblan.', w: 20, h: 18, rita: B => bubbla(B, ['...k....', '..kyk...', '.kyyyk..', '.kykyk..', 'kyyyyyk.', 'kykkkyk.', 'kkkkkkk.', '........']) }] },
    { id: 'f9_amne_fara', namn: 'Samtalets ämne: En farlig plats', typ: 'janej', vad: 'Steg 9.2.10: pratbubblorna har en enda storlek, den lilla, och varje ämne får en symbol i 8 punkter i stället för en större bild i halv skala. Ja eller nej?', versioner: [{ text: 'Ämnet en farlig plats: en röd varningstriangel, i den lilla pratbubblan.', w: 20, h: 18, rita: B => bubbla(B, ['...r....', '..rkr...', '..rkr...', '.rrkrr..', '.rrrrr..', 'rrrkrrr.', 'rrrrrrr.', '........']) }] },
    { id: 'f9_amne_rykte', namn: 'Samtalets ämne: Ett rykte', typ: 'janej', vad: 'Steg 9.2.10: pratbubblorna har en enda storlek, den lilla, och varje ämne får en symbol i 8 punkter i stället för en större bild i halv skala. Ja eller nej?', versioner: [{ text: 'Ämnet ett rykte: ett öra, i den lilla pratbubblan.', w: 20, h: 18, rita: B => bubbla(B, ['..kkk...', '.k...k..', '.k.k.k..', '...k.k..', '..k..k..', '..k.k...', '...k....', '........']) }] },
    { id: 'f9_amne_teknik', namn: 'Samtalets ämne: En teknik', typ: 'janej', vad: 'Steg 9.2.10: pratbubblorna har en enda storlek, den lilla, och varje ämne får en symbol i 8 punkter i stället för en större bild i halv skala. Ja eller nej?', versioner: [{ text: 'Ämnet en teknik: en gnista, i den lilla pratbubblan.', w: 20, h: 18, rita: B => bubbla(B, ['...y....', '.y.y.y..', '..yyy...', 'yyyYyyy.', '..yyy...', '.y.y.y..', '...y....', '........']) }] },
    { id: 'f9_amne_kunskap', namn: 'Samtalets ämne: Något man kan', typ: 'janej', vad: 'Steg 9.2.10: pratbubblorna har en enda storlek, den lilla, och varje ämne får en symbol i 8 punkter i stället för en större bild i halv skala. Ja eller nej?', versioner: [{ text: 'Ämnet något man kan: en bok, i den lilla pratbubblan.', w: 20, h: 18, rita: B => bubbla(B, ['.jjjjj..', '.jYYYj..', '.jYkYj..', '.jYYYj..', '.jYkYj..', '.jYYYj..', '.jjjjj..', '........']) }] },
    { id: 'f9_amne_plats', namn: 'Samtalets ämne: En plats', typ: 'janej', vad: 'Steg 9.2.10: pratbubblorna har en enda storlek, den lilla, och varje ämne får en symbol i 8 punkter i stället för en större bild i halv skala. Ja eller nej?', versioner: [{ text: 'Ämnet en plats: en röd nål, i den lilla pratbubblan.', w: 20, h: 18, rita: B => bubbla(B, ['..rrr...', '.rrrrr..', '.rrYrr..', '.rrrrr..', '..rrr...', '..rrr...', '...r....', '........']) }] },
    { id: 'f9_amne_langtan', namn: 'Samtalets ämne: Det man längtar efter', typ: 'janej', vad: 'Steg 9.2.10: pratbubblorna har en enda storlek, den lilla, och varje ämne får en symbol i 8 punkter i stället för en större bild i halv skala. Ja eller nej?', versioner: [{ text: 'Ämnet det man längtar efter: en skål som ångar, i den lilla pratbubblan.', w: 20, h: 18, rita: B => bubbla(B, ['..s.s...', '...s.s..', '........', 'jjjjjjj.', '.jYYYj..', '.jjjjj..', '..jjj...', '........']) }] },
    { id: 'f9_amne_karlek', namn: 'Samtalets ämne: Kärlek', typ: 'janej', vad: 'Steg 9.2.10: pratbubblorna har en enda storlek, den lilla, och varje ämne får en symbol i 8 punkter i stället för en större bild i halv skala. Ja eller nej?', versioner: [{ text: 'Ämnet kärlek: ett hjärta, i den lilla pratbubblan.', w: 20, h: 18, rita: B => bubbla(B, ['........', '.rr.rr..', 'rRrrrrr.', 'rrrrrrr.', '.rrrrr..', '..rrr...', '...r....', '........']) }] },
    { id: 'f9_amne_trost', namn: 'Samtalets ämne: Tröst', typ: 'janej', vad: 'Steg 9.2.10: pratbubblorna har en enda storlek, den lilla, och varje ämne får en symbol i 8 punkter i stället för en större bild i halv skala. Ja eller nej?', versioner: [{ text: 'Ämnet tröst: en tår, i den lilla pratbubblan.', w: 20, h: 18, rita: B => bubbla(B, ['........', '...b....', '...b....', '..bbb...', '.bbbbb..', '.bbsbb..', '..bbb...', '........']) }] },
    { id: 'f9_amne_dod', namn: 'Samtalets ämne: En död', typ: 'janej', vad: 'Steg 9.2.10: pratbubblorna har en enda storlek, den lilla, och varje ämne får en symbol i 8 punkter i stället för en större bild i halv skala. Ja eller nej?', versioner: [{ text: 'Ämnet en död: ett kors på en grav, i den lilla pratbubblan.', w: 20, h: 18, rita: B => bubbla(B, ['...k....', '...k....', '.kkkkk..', '...k....', '...k....', '...k....', '.jjjjj..', '........']) }] },
    { id: 'f9_amne_vader_regn', namn: 'Samtalets ämne: Vädret: regnet', typ: 'janej', vad: 'Steg 9.2.10: pratbubblorna har en enda storlek, den lilla, och varje ämne får en symbol i 8 punkter i stället för en större bild i halv skala. Ja eller nej?', versioner: [{ text: 'Ämnet vädret: regnet: ett moln med droppar, i den lilla pratbubblan.', w: 20, h: 18, rita: B => bubbla(B, ['.sssss..', 'sssssss.', '.sssss..', '........', '.b..b...', '..b..b..', '.b..b...', '........']) }] },
    { id: 'f9_amne_vader_sno', namn: 'Samtalets ämne: Vädret: snön och kylan', typ: 'janej', vad: 'Steg 9.2.10: pratbubblorna har en enda storlek, den lilla, och varje ämne får en symbol i 8 punkter i stället för en större bild i halv skala. Ja eller nej?', versioner: [{ text: 'Ämnet vädret: snön och kylan: en snöflinga, i den lilla pratbubblan.', w: 20, h: 18, rita: B => bubbla(B, ['...b....', '.b.b.b..', '..bbb...', 'bbbbbbb.', '..bbb...', '.b.b.b..', '...b....', '........']) }] },
    { id: 'f9_amne_vader_blast', namn: 'Samtalets ämne: Vädret: blåsten', typ: 'janej', vad: 'Steg 9.2.10: pratbubblorna har en enda storlek, den lilla, och varje ämne får en symbol i 8 punkter i stället för en större bild i halv skala. Ja eller nej?', versioner: [{ text: 'Ämnet vädret: blåsten: vindstreck, i den lilla pratbubblan.', w: 20, h: 18, rita: B => bubbla(B, ['.sssss..', '......s.', 'sssss...', '........', '.ssssss.', '.......s', '..sss...', '........']) }] },
    { id: 'f9_amne_vader_aska', namn: 'Samtalets ämne: Vädret: åskan', typ: 'janej', vad: 'Steg 9.2.10: pratbubblorna har en enda storlek, den lilla, och varje ämne får en symbol i 8 punkter i stället för en större bild i halv skala. Ja eller nej?', versioner: [{ text: 'Ämnet vädret: åskan: ett moln med en blixt, i den lilla pratbubblan.', w: 20, h: 18, rita: B => bubbla(B, ['.sssss..', 'sssssss.', '.sssss..', '...y....', '..yy....', '...yy...', '....y...', '........']) }] },
    { id: 'f9_amne_vader_dimma', namn: 'Samtalets ämne: Vädret: dimman', typ: 'janej', vad: 'Steg 9.2.10: pratbubblorna har en enda storlek, den lilla, och varje ämne får en symbol i 8 punkter i stället för en större bild i halv skala. Ja eller nej?', versioner: [{ text: 'Ämnet vädret: dimman: vågräta dimstrimmor, i den lilla pratbubblan.', w: 20, h: 18, rita: B => bubbla(B, ['........', '.ssssss.', '........', 'ssssss..', '........', '.ssssss.', '........', '........']) }] },
    { id: 'f9_amne_vader_klart', namn: 'Samtalets ämne: Vädret: värmen', typ: 'janej', vad: 'Steg 9.2.10: pratbubblorna har en enda storlek, den lilla, och varje ämne får en symbol i 8 punkter i stället för en större bild i halv skala. Ja eller nej?', versioner: [{ text: 'Ämnet vädret: värmen: en sol, i den lilla pratbubblan.', w: 20, h: 18, rita: B => bubbla(B, ['...y....', '.y...y..', '...y....', 'y.yyy.y.', '...y....', '.y...y..', '...y....', '........']) }] },
    { id: 'f9_amne_mat', namn: 'Samtalets ämne: Maten', typ: 'janej', vad: 'Steg 9.2.10: pratbubblorna har en enda storlek, den lilla, och varje ämne får en symbol i 8 punkter i stället för en större bild i halv skala. Ja eller nej?', versioner: [{ text: 'Ämnet maten: ett lårben, i den lilla pratbubblan.', w: 20, h: 18, rita: B => bubbla(B, ['........', '.....kk.', '....kYk.', '..jjk...', '.jjjj...', '.jjjj...', '..jj....', '........']) }] },
    { id: 'f9_amne_arbete', namn: 'Samtalets ämne: Arbetet', typ: 'janej', vad: 'Steg 9.2.10: pratbubblorna har en enda storlek, den lilla, och varje ämne får en symbol i 8 punkter i stället för en större bild i halv skala. Ja eller nej?', versioner: [{ text: 'Ämnet arbetet: en hammare, i den lilla pratbubblan.', w: 20, h: 18, rita: B => bubbla(B, ['.kkkk...', '.kkkk...', '...j....', '...j....', '...j....', '...j....', '...j....', '........']) }] },
    { id: 'f9_amne_barn', namn: 'Samtalets ämne: Barnen', typ: 'janej', vad: 'Steg 9.2.10: pratbubblorna har en enda storlek, den lilla, och varje ämne får en symbol i 8 punkter i stället för en större bild i halv skala. Ja eller nej?', versioner: [{ text: 'Ämnet barnen: ett litet barn, i den lilla pratbubblan.', w: 20, h: 18, rita: B => bubbla(B, ['...j....', '..jjj...', '...j....', '..kkk...', '.k.k.k..', '..k.k...', '..k.k...', '........']) }] },
    { id: 'f9_amne_vardag', namn: 'Samtalets ämne: Lite av varje', typ: 'janej', vad: 'Steg 9.2.10: pratbubblorna har en enda storlek, den lilla, och varje ämne får en symbol i 8 punkter i stället för en större bild i halv skala. Ja eller nej?', versioner: [{ text: 'Ämnet lite av varje: tre prickar, i den lilla pratbubblan.', w: 20, h: 18, rita: B => bubbla(B, ['........', '........', '........', '.k.k.k..', '........', '........', '........', '........']) }] },
  );
  // steg 9.2.11: facklan på väggen, tre versioner, var och en släckt och tänd framför en bit timmervägg
  const FL = { k: 'kol0', K: 'kol3', j: 'jord1', J: 'jord2', y: 'senap1', Y: 'senap2', r: 'rost2', o: 'rost3', g: 'senap3', w: 'ben3', v: 'jord0', V: 'jord1' };
  const vagg = (B) => { for (let y = 0; y < 22; y++) for (let x = 0; x < 34; x++) B.satt(x, y, B.P.i('jord', (y % 5 === 4) ? 0 : (y % 5 === 0 ? 2 : 1))); };
  const FACKLOR = [
    ['En järnring i väggen som skaftet står i, snett uppåt.', ['........', '........', '........', '........', '...yY...', '...YY...', '...Jj...', '...jJ...', '..KjJK..', '..kKKk..', '...jJ...', '...Jj...'], ['...w....', '..gwg...', '..ogo...', '.rgogr..', '..ryY...', '...YY...', '...Jj...', '...jJ...', '..KjJK..', '..kKKk..', '...jJ...', '...Jj...']],
    ['En träkloss spikad i väggen med facklan bunden i ett rep.', ['........', '........', '........', '...YY...', '..yYYy..', '...YY...', '...jJ...', '..YjJY..', '...jJ...', '.VVVVVV.', '.VJJJJV.', '.VVVVVV.'], ['...w....', '..gwg...', '.ogwgo..', '.rgggr..', '..yYYy..', '...YY...', '...jJ...', '..YjJY..', '...jJ...', '.VVVVVV.', '.VJJJJV.', '.VVVVVV.']],
    ['En böjd järnarm från väggen som håller facklan rakt upp.', ['........', '........', '........', '....yY..', '....YY..', '....Jj..', '....jJ..', '...KjJ..', '..K.jJ..', '.K..KK..', 'KKKKK...', 'K.......'], ['....w...', '...gwg..', '...ogo..', '..rgogr.', '...ryY..', '....YY..', '....Jj..', '...KjJ..', '..K.jJ..', '.K..KK..', 'KKKKK...', 'K.......']],
  ];
  VAL.push({ id: 'f9_uppsatt_vagg', namn: 'Facklan på väggen', typ: 'tre', vad: 'Steg 9.2.11: facklor sätts upp på väggar inne och ute, så att byn får ljus över hela byn. Varje version släckt till vänster och tänd till höger, framför en timmervägg.', versioner: FACKLOR.map(([text, slackt, tand]) => ({ text, w: 34, h: 22, rita: B => { vagg(B); ritaSprite(B, slackt, FL, 6, 6); ritaSprite(B, tand, FL, 20, 6); } })) });
  // steg 9.2.21: blixtens nedslag, tre versioner: blixten från himlen ner till rutan och skenet runt nedslaget, på natten över gräs
  const NATT = (B) => { for (let y = 0; y < 72; y++) for (let x = 0; x < 48; x++) B.satt(x, y, B.P.i(y > 56 ? 'barr' : 'kol', y > 56 ? ((x * 3 + y) % 7 ? 1 : 2) : ((x + y * 5) % 11 ? 0 : 1))); };
  const SKEN = (B, cx, cy, r) => { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) { const d = Math.hypot((x - cx) * 0.8, y - cy) / r; if (d < 1 && ((x + y * 3) % 4 === 0 || d < 0.35)) B.satt(x, y, B.P.i('senap', d < 0.35 ? 3 : 2)); } };
  const BLIXT = (B, pts, bred) => { for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)); for (let k = 0; k <= n; k++) { const x = Math.round(ax + (bx - ax) * k / n), y = Math.round(ay + (by - ay) * k / n); for (let d = -1; d <= bred; d++) B.satt(x + d, y, B.P.i(d < 0 || d === bred ? 'skiffer' : 'ben', d < 0 || d === bred ? 3 : 3)); } } };
  const BLIXTAR = [
    ['En tunn sicksack rakt ner, med ett runt sken i gult där den slår ner.', [[22, 0], [26, 12], [20, 22], [27, 34], [21, 46], [24, 58]], 1, 8],
    ['En bredare blixt med en gren åt sidan halvvägs, och ett stort sken.', [[18, 0], [24, 14], [16, 26], [26, 40], [22, 58]], 2, 11],
    ['En blixt i trappsteg, kantig som pixlarna, och ett litet hårt sken.', [[28, 0], [28, 10], [20, 10], [20, 24], [27, 24], [27, 40], [22, 40], [22, 58]], 1, 6],
  ];
  VAL.push({ id: 'f9_nedslag', namn: 'Blixtens nedslag', typ: 'tre', vad: 'Steg 9.2.21: blixten syns där den slår ner, ett kort ögonblick, från himlen ner till rutan och med ett starkare sken runt nedslaget. Både när åskan slår ner av sig själv och i testläget.', versioner: BLIXTAR.map(([text, pts, bred, r]) => ({ text, w: 48, h: 72, rita: B => { NATT(B); SKEN(B, pts[pts.length - 1][0], pts[pts.length - 1][1], r); BLIXT(B, pts, bred); if (bred > 1) BLIXT(B, [[21, 26], [12, 34], [9, 42]], 1); } })) });
  // steg 9.2.26: brandens spår, tre versioner: den kolnade stammen (ett stort träd som brunnit) och den svarta stubben (ett litet), på svart mark
  const KL = { k: 'kol0', K: 'kol1', g: 'kol3', b: 'ben1', r: 'rost2', a: 'jord0' };
  const SVART = (B) => { for (let y = 0; y < 44; y++) for (let x = 0; x < 52; x++) B.satt(x, y, B.P.i(y < 30 ? 'oliv' : 'kol', y < 30 ? 2 : ((x * 7 + y * 3) % 5 ? 0 : 2))); };
  const KOLVER = [
    ['Stammen rak och svart med två avbrutna grenar och glöd kvar i en spricka; stubben låg och kantig.',
      ['....kg....', '....kk....', '..k.kk....', '...kkk....', '....kk.k..', '....kkk...', '....kk....', '....kkr...', '....kk....', '...kKkk...', '...kkKk...', '..kkkkkk..'],
      ['.kgkk.', 'kkkkKk', 'kKkkkk', 'kkkkkk']],
    ['Stammen kluven i toppen, med ljusa sprickor av aska; stubben rund med en ljus ring.',
      ['...k..k...', '...kk.k...', '....kkk...', '....kk....', '...bkk....', '....kkb...', '....kk....', '...bkk....', '....kk....', '...kkkk...', '..kkKKkk..', '.kkkkkkkk.'],
      ['.kkkk.', 'kgbbgk', 'kbkkbk', 'kkkkkk']],
    ['Stammen kortare och tjockare, avbruten snett, med rötterna synliga; stubben med en brand som pyr.',
      ['..........', '..........', '....k.....', '....kk....', '...kkk....', '...kkkk...', '...kKkk...', '...kkkk...', '...kkKk...', '..kkkkkk..', '.kkk..kkk.', 'kk......kk'],
      ['..r...', '.kkkk.', 'kkrkkk', 'kkkkkk']],
  ];
  VAL.push({ id: 'f9_kolstam', namn: 'Den kolnade stammen och den svarta stubben', typ: 'tre', vad: 'Steg 9.2.26: ett träd som brinner blir en kolnad stam (ett stort träd) som står kvar som torrakan tills den faller eller huggs, eller en svart stubbe (ett litet träd). Marken runt är svart.', versioner: KOLVER.map(([text, stam, stubbe]) => ({ text, w: 52, h: 44, rita: B => { SVART(B); ritaSprite(B, stam, KL, 8, 20); ritaSprite(B, stubbe, KL, 34, 30); } })) });
  // steg 9.2.31: anfallsbilderna, tre versioner var: björnen reser sig och slår med ramen, vargen hugger med käftarna
  const DJ = { o: 'kol0', b: 'jord0', B: 'jord1', c: 'jord2', w: 'ben3', r: 'rost2', g: 'kol3', v: 'ben1', V: 'ben2', k: 'kol1' };
  const GRAS = (B, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) B.satt(x, y, B.P.i('oliv', (x * 5 + y * 3) % 9 ? 2 : 1)); };
  const BJORNAR = [
    ['Björnen reser sig på bakbenen med ena ramen högt och klorna ute.', ['.....w.w.......', '....owowo......', '....oBBBo......', '...oBBBBo.oo...', '..oBBBBBBoBBo..', '..oBBwBwBBBo...', '..oBBBBBBBo....', '...oBBrrBBo....', '...oBBBBBBo....', '..oBBBBBBBBo...', '..oBBBcBBBBo...', '..oBBccBBBBo...', '..oBBBBBBBBo...', '...oBBBBBBo....', '...oBBo.oBBo...', '...oBo...oBo...', '..ooo....ooo...']],
    ['Björnen på bakbenen slår snett nedåt med ramen, munnen öppen.', ['...............', '..oo...........', '.oBBo.oooo.....', '.ow.BoBBBBo....', '..o.oBwBwBo....', '....oBBBBBo....', '....oBrrrBo....', '...oBBBBBBBo...', '..oBBBcBBBBBo..', '..oBBccBBBBBo..', '..oBBBBBBBBo...', '...oBBBBBBo....', '...oBBo.oBBo...', '...oBo...oBo...', '..ooo....ooo...']],
    ['Björnen reser sig med båda ramarna lyfta, stor och mörk.', ['.w.w.......w.w.', 'owowo.....owowo', 'oBBBo.ooo.oBBBo', '.oBBBoBBBoBBBo.', '..oBBBwBwBBBo..', '...oBBBBBBBo...', '...oBBrrrBBo...', '..oBBBBBBBBBo..', '..oBBBcccBBBo..', '..oBBBBcBBBBo..', '...oBBBBBBBo...', '...oBBo.oBBo...', '..oooo...oooo..']],
  ];
  const VARGAR = [
    ['Vargen sträcker fram huvudet och hugger med öppna käftar, tänderna vita.', ['..........ooo...', '.........oVVVo...', '.oooooooovVgVVo..', 'oVVVVVVVVVVVVwwo.', 'oVVVVVVVVVVVo....', '.oVVVVVVVVVVwwo..', '.oVo.oVo..oVo....', '.oo..oo....oo....']],
    ['Vargen kastar sig framåt med frambenen i luften och gapet öppet.', ['...........oooo.', '..........oVVVVo', '...ooooooovVgVVw', '..oVVVVVVVVVVVo.', '.oVVVVVVVVVVVww.', 'oVo.oVVVVVVo....', 'oo...oVo.oVo....', '......oo..oo....']],
    ['Vargen sänker huvudet och biter, med ryggen krökt och svansen rak.', ['................', '.oooooooo.......', 'oVVVVVVVVoo.....', '.oVVVVVVVVVoo...', '..oVVVVVVVVVVoo.', '..oVo.oVo.oVgVVo', '..oo..oo..oVVwwo', '...........owwo.']],
  ];
  VAL.push(
    { id: 'f9_bjorn_anfall', namn: 'Björnens anfall', typ: 'tre', vad: 'Steg 9.2.31: i striden på kartan reser sig björnen och slår med ramen, en bild per slag i animationernas klocka, som människornas slag.', versioner: BJORNAR.map(([text, r]) => ({ text, w: 23, h: 23, rita: B => { GRAS(B, 23, 23); ritaSprite(B, r, DJ, 4, 3); } })) },
    { id: 'f9_varg_anfall', namn: 'Vargens anfall', typ: 'tre', vad: 'Steg 9.2.31: i striden på kartan hugger vargen med käftarna, en bild per slag i animationernas klocka.', versioner: VARGAR.map(([text, r]) => ({ text, w: 24, h: 14, rita: B => { GRAS(B, 24, 14); ritaSprite(B, r, DJ, 4, 3); } })) },
  );
  // steg 9.2.34: bältets bild i lagret, mindre (12 × 6 punkter i stället för 18 × 9), i samma skala som de andra sakerna
  const BL = { a: 'kol0', b: 'senap2', c: 'senap1', d: 'jord1' };
  const BALTE_NU = ['....aaaaaaaaaa....', '..aabcbcbcbcbcaa..', '.acbcbaaaaaacbcba.', 'acbaaaaa...aaaacba', 'abcaaddda.adddabca', 'acbcbdaaaaadacbcba', '.acbcdcbcbcdcbcba.', '..aabdbcbcbdbcaa..', '....aaaaaaaaaa....'];
  const BALTE_NY = ['..aaaaaaaa..', '.abcbcbcbca.', 'abaaaddaaaba', 'acaadaadaaca', '.acbcbcbcba.', '..aaaaaaaa..'];
  const LAGER = (B, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) B.satt(x, y, B.P.i('jord', (x + y) % 7 ? 2 : 1)); };
  VAL.push({ id: 'f9_balte_mindre', namn: 'Bältet i lagret, mindre', typ: 'janej', vad: 'Steg 9.2.34: bältets bild i lagret är större än de andra sakerna. Till vänster som i dag (18 × 9 punkter), till höger mindre (12 × 6), bredvid en kniv i samma skala. Ja eller nej?', versioner: [{ text: 'Bältet i dag till vänster och det mindre till höger, på lagrets jord.', w: 44, h: 15, rita: B => { LAGER(B, 44, 15); ritaSprite(B, BALTE_NU, BL, 2, 3); ritaSprite(B, BALTE_NY, BL, 26, 5); } }] });
  // steg 9.2.38: lagerplatsernas bakgrund, en version: i dag en ljus ton (oliv 3) och en hel mörk ram; förslaget är marken
  // nedtrampad till jord (jord 3 med prickar av jord 2) och bara hörnen markerade, så att platsen ser ut som en plats och inte en ruta
  const LAGERMARK = (B, x0, y0, w, h, ny) => {
    const P = B.P;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) B.satt(x0 + x, y0 + y, ny ? P.i('jord', (x * 7 + y * 5) % 9 ? 3 : 2) : P.i('oliv', 3));
    if (ny) { for (const [cx, cy, dx, dy] of [[0, 0, 1, 1], [w - 1, 0, -1, 1], [0, h - 1, 1, -1], [w - 1, h - 1, -1, -1]]) for (let k = 0; k < 4; k++) { B.satt(x0 + cx + dx * k, y0 + cy, P.i('jord', 1)); B.satt(x0 + cx, y0 + cy + dy * k, P.i('jord', 1)); } }
    else for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (x === 0 || y === 0 || x === w - 1 || y === h - 1) B.satt(x0 + x, y0 + y, P.i('jord', 1));
  };
  VAL.push({ id: 'f9_lagermark', namn: 'Marken under lagerplatserna', typ: 'janej', vad: 'Steg 9.2.38: lagerplatsens bakgrund ritas om. Till vänster som i dag: en ljus ton och en hel ram. Till höger: marken nedtrampad till jord, utan raster, och bara hörnen markerade. Ja eller nej?', versioner: [{ text: 'En lagerplats på 3 × 2 rutor med gräs runt om, i dag till vänster och förslaget till höger.', w: 112, h: 44, rita: B => {
    for (let y = 0; y < 44; y++) for (let x = 0; x < 112; x++) B.satt(x, y, B.P.i('oliv', (x * 7 + y * 3) % 11 === 0 ? 1 : 2));
    LAGERMARK(B, 4, 6, 48, 32, false); LAGERMARK(B, 60, 6, 48, 32, true);
  } }] });
  // steg 9.2.39: vedhögen i lagret, en version: i dag fyra vedträn om varandra med ljusa ändar; förslaget är en enda lugn hög,
  // mindre (12 × 7 punkter), med ändarna i en ton och bara kanten mörkare
  const VEDL = { E: 'jord0', q: 'ben2', p: 'ben1', H: 'jord3', G: 'jord2', F: 'jord1' };
  const VED_NU = ['.EEEEEEEE.', 'EqpqHGHGGE', 'EpHpGFGFGE', 'EqppFFEFFE', '.EEEEEEEE.'];
  const VED_NY = ['...EEEEEE...', '..EpGpGpGE..', '.EGpGpGpGpE.', 'EpGpGpGpGpGE', 'EGpGpGpGpGpE', 'EpGpGpGpGpGE', '.EEEEEEEEEE.'];
  VAL.push({ id: 'f9_vedhog', namn: 'Vedhögen i lagret', typ: 'janej', vad: 'Steg 9.2.39: vedhögen i lagret är för stor och orolig. Till vänster en full vedstack som i dag (fyra vedträn om varandra), till höger förslaget: en enda lugn hög, mindre, med ändarna i en ton. Ja eller nej?', versioner: [{ text: 'En lagerruta med full vedstack, i dag till vänster och förslaget till höger.', w: 44, h: 20, rita: B => {
    for (let y = 0; y < 20; y++) for (let x = 0; x < 44; x++) B.satt(x, y, B.P.i('oliv', 3));
    for (const [dx, dy] of [[0, -1], [5, 0], [-1, 2], [4, 3]].sort((a, c) => a[1] - c[1])) ritaSprite(B, VED_NU, VEDL, 3 + dx, 6 + dy);
    ritaSprite(B, VED_NY, VEDL, 28, 7);
  } }] });
  // steg 9.2.40: stackarna när de är många. Varje sak får tre bilder (en, några, många); här tre sätt att rita dem, för fyra saker
  // ur bildstilen. Björn väljer sättet, och sedan ritas varje sak så
  const SAKER40 = {"fisk":{"r":["..uuuut..",".uqwqqput","uqpqwqpts",".tuuttts."],"pal":{"p":"#a0947d","q":"#bdb39b","s":"#742a01","t":"#a14808","u":"#bd753e","w":"#dad0bb"}},"ved":{"r":[".EEEEEEEE.","EqpqHGHGGE","EpHpGFGFGE","EqppFFEFFE",".EEEEEEEE."],"pal":{"E":"#3f2415","q":"#bdb39b","p":"#a0947d","H":"#987e62","G":"#7d5b40","F":"#5e3c24"}},"ben":{"r":["qo...qo","wqqwqpo","qpqppoo","po...oo"],"pal":{"o":"#7e7362","p":"#a0947d","q":"#bdb39b","w":"#dad0bb"}},"abborre":{"r":["..MUMUM...",".MPPUPUMtu","MkPOUOUMtt",".MqwqqpMts","...s.s...."],"pal":{"M":"#353204","O":"#647025","P":"#898b4c","U":"#21290d","k":"#24201d","p":"#a0947d","q":"#bdb39b","s":"#742a01","t":"#a14808","u":"#bd753e","w":"#dad0bb"}}};
  const HEX = (B, h) => B.P.fran(h);
  const LAGG = (B, s, x0, y0) => s.r.forEach((rad, y) => [...rad].forEach((c, x) => { if (c !== '.' && s.pal[c]) B.satt(x0 + x, y0 + y, HEX(B, s.pal[c])); }));
  const SATT40 = [
    ['En tät hög: några är tre om varandra i en triangel, många är sex i en pyramid.', (B, s, x0, y0, n) => { const w = s.r[0].length, h = s.r.length, pos = n === 1 ? [[0, 0]] : n === 3 ? [[0, 0], [w * 0.6, 0], [w * 0.3, -h * 0.5]] : [[0, 0], [w * 0.6, 0], [w * 1.2, 0], [w * 0.3, -h * 0.5], [w * 0.9, -h * 0.5], [w * 0.6, -h]]; pos.forEach(([dx, dy]) => LAGG(B, s, x0 + Math.round(dx), y0 + Math.round(dy))); }],
    ['I rader: några ligger två bredvid varandra, många i två rader om tre.', (B, s, x0, y0, n) => { const w = s.r[0].length, h = s.r.length; const pos = n === 1 ? [[0, 0]] : n === 3 ? [[0, 0], [w + 1, 0]] : [[0, 0], [w + 1, 0], [2 * w + 2, 0], [0, -h + 1], [w + 1, -h + 1], [2 * w + 2, -h + 1]]; pos.forEach(([dx, dy]) => LAGG(B, s, x0 + dx, y0 + dy)); }],
    ['En lös hög: några är tre huller om buller, många är en stor hög med en sak överst.', (B, s, x0, y0, n) => { const w = s.r[0].length, h = s.r.length; const pos = n === 1 ? [[0, 0]] : n === 3 ? [[0, 0], [w * 0.7, 1], [w * 0.35, -h * 0.4]] : [[0, 1], [w * 0.5, 0], [w, 1], [w * 0.25, -h * 0.35], [w * 0.75, -h * 0.35], [w * 0.5, -h * 0.7]]; pos.forEach(([dx, dy]) => LAGG(B, s, x0 + Math.round(dx), y0 + Math.round(dy))); }],
  ];
  VAL.push({ id: 'f9_stackar', namn: 'Stackarna: en, några och många', typ: 'tre', vad: 'Steg 9.2.40: i dag ser vissa stackar ut som en sak fast de är många, och andra blir röriga när samma bild ritas tiotals gånger. Varje sak får tre bilder: en, några och många. Här tre sätt att rita dem, med fyra saker ur bildstilen: varje rad är en sak, från vänster en, några och många.', versioner: SATT40.map(([text, rita]) => ({ text, w: 120, h: 4 + Object.keys(SAKER40).length * 22, rita: B => {
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, B.P.i('oliv', 3));
    Object.values(SAKER40).forEach((s, i) => [1, 3, 6].forEach((n, j) => rita(B, s, 6 + j * 38, 14 + i * 22, n)));
  } })) });
  // steg 9.2.42: bären under träden, tre versioner av tuvan med bär (16 punkter per ruta), under en gran på skogens mark
  const TL = { g: 'oliv1', G: 'oliv2', l: 'oliv3', r: 'rost2', R: 'rost3', b: 'skiffer1', B: 'skiffer2', k: 'kol1' };
  const TUVOR = [
    ['En låg tuva av lingonris med tre röda bär.', ['...gGg...', '..gGlGg..', '.gGrGlRg.', 'gGlGgRrG.', '.rRgGlGg.', '..gGgGg..']],
    ['Blåbärsris med blåa bär som hänger under bladen.', ['..g.G.g..', '.gGlGgGg.', 'gGbGlGBgG', '.gBbgGbG.', '..gGgBg..', '...g.g...']],
    ['En tät tuva med några få stora bär överst, och en mörk skugga under.', ['...rR....', '..gRrGg..', '.gGlGlGg.', 'gGgGlGgGg', '.gGgGgGg.', '..kkkkk..']],
  ];
  VAL.push({ id: 'f9_bartuva', namn: 'Bären under träden', typ: 'tre', vad: 'Steg 9.2.42: bären under träden ritas i dag av koden som cirklar och prickar. I stället en tuva med bär som en bild i 16 punkter per ruta, på skogens mark.', versioner: TUVOR.map(([text, r]) => ({ text, w: 32, h: 24, rita: B => { for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) B.satt(x, y, B.P.i('barr', (x * 3 + y * 5) % 7 ? 2 : 1)); ritaSprite(B, r, TL, 4, 10); ritaSprite(B, r, TL, 18, 6); } })) });
  // steg 9.2.53: sakerna på rutan, en bild per antal (1, 2, 3) för bären, svampen, rötterna och grenarna, i 16 punkter per ruta.
  // Det som ritas är det som går att plocka, och en ruta utan saker ritas inte. Tre sätt; varje rad är en sak, från vänster en, två och tre
  const RL = { g: 'oliv1', G: 'oliv2', l: 'oliv3', r: 'rost2', R: 'rost3', s: 'rost1', h: 'senap2', H: 'senap1', y: 'senap3', f: 'ben2', F: 'ben1', j: 'jord1', J: 'jord2', k: 'kol1' };
  const RUTSAKER = [
    ['Små bilder utspridda på rutan, som i spelet nu: en tuva med ett till tre bär, och en svamp, en rot eller en gren per sak.', {
      bar: n => [['..gG..', '.gG' + (n > 1 ? 'r' : 'g') + 'g.', 'gGrG' + (n > 2 ? 'r' : 'g') + 'G', '.ggGg.', '..gg..']],
      svamp: () => ['.hh.', 'hHHh', '.ff.'], rot: () => ['.l.', 'jJj', '.j.'], gren: () => ['....j', '...J.', '.jJ..', 'j....'],
    }, 'sprid'],
    ['Samlat i en klunga mitt på rutan, tätare ju fler det är, med en mörk skugga under.', {
      bar: n => [['...gG...', '..gGlg..', '.g' + 'r'.repeat(n).padEnd(4, 'G') + 'g.', 'gGgGlGgG', '.kkkkkk.']],
      svamp: () => ['.yhh.', 'hHHHh', '..f..', '.kfk.'], rot: () => ['.l.l.', '.jJj.', 'jJJJj', '.kjk.'], gren: () => ['.....J', '..jJJ.', 'jJj...', 'kk....'],
    }, 'klunga'],
    ['Större bilder, en per sak, som syns tydligt också när kartan är utzoomad.', {
      bar: n => [['..gGGg..', '.gGlGlGg', 'gG' + (n > 0 ? 'Rr' : 'Gg') + 'G' + (n > 1 ? 'Rr' : 'gG').slice(0, 1) + 'G', '.gG' + (n > 2 ? 'rR' : 'lG') + 'Gg', '..gGGg..']],
      svamp: () => ['.yhhy.', 'hHHHHh', '..ff..', '..Ff..'], rot: () => ['.l..l.', '..ll..', '.jJJj.', 'jJJJJj', '.jJJj.'], gren: () => ['......J.', '....JJ.J', '..jJj...', 'jJj.....', 'j.......'],
    }, 'stor'],
  ];
  const RUTA = (B, x0, y0) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) B.satt(x0 + x, y0 + y, B.P.i('oliv', (x * 5 + y * 3) % 9 ? 3 : 2)); };
  const PLATSER = { sprid: [[1, 2], [8, 8], [9, 1]], klunga: [[4, 5], [7, 6], [5, 8]], stor: [[0, 1], [7, 8], [8, 0]] };
  VAL.push({ id: 'f9_rutsaker', namn: 'Sakerna på rutan', typ: 'tre', vad: 'Steg 9.2.53: allt som samlas är nu hela saker på rutan, och bilden visar antalet: bären som ett, två eller tre bär i tuvan, och svampen, rötterna och grenarna med en bild per sak. En ruta utan saker ritas inte. Varje rad är en sak (bär, svamp, rötter, grenar), från vänster en, två och tre.', versioner: RUTSAKER.map(([text, b, satt]) => ({ text, w: 3 * 18 + 2, h: 4 * 18 + 2, rita: B => {
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, B.P.i('oliv', 1));
    ['bar', 'svamp', 'rot', 'gren'].forEach((k, rad) => [1, 2, 3].forEach((n, kol) => {
      const x0 = 2 + kol * 18, y0 = 2 + rad * 18;
      RUTA(B, x0, y0);
      if (k === 'bar') { ritaSprite(B, b.bar(n)[0], RL, x0 + 4, y0 + 5); return; }
      for (let j = 0; j < n; j++) { const [dx, dy] = PLATSER[satt][j]; ritaSprite(B, b[k](), RL, x0 + dx, y0 + dy); }
    }));
  } })) });
  // steg 9.3.2: stenen Byns tal, med graferna. Tre förslag till sten (stängd och öppen) och band, ritade med runstenarnas och
  // bandens egna funktioner (gui.js, window.GUIRITA), i flikens två färger
  const TAL_MASK = (w, h, rita) => { const g = Array.from({ length: h }, () => Array(w).fill('.')); rita((x, y) => { if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = '#'; }); return g.map(r => r.join('')); };
  const TAL_EMB = {
    staplar: TAL_MASK(11, 10, s => { [[1, 6], [4, 3], [7, 5], [10, 1]].forEach(([x, y0]) => { for (let y = y0; y < 9; y++) { s(x - 1, y); s(x, y); } }); for (let x = 0; x < 11; x++) s(x, 9); }),
    linje: TAL_MASK(11, 10, s => { const p = [[0, 8], [3, 5], [5, 6], [8, 2], [10, 3]]; for (let k = 0; k + 1 < p.length; k++) { const [a, b] = p[k], [c, d] = p[k + 1]; for (let i = 0; i <= 12; i++) s(Math.round(a + (c - a) * i / 12), Math.round(b + (d - b) * i / 12)); } for (let y = 0; y < 10; y++) s(0, y); for (let x = 0; x < 11; x++) s(x, 9); }),
    rakna: TAL_MASK(11, 10, s => { for (const x of [1, 3, 5, 7]) for (let y = 1; y < 9; y++) s(x, y); for (let i = 0; i < 9; i++) s(i, 8 - i); }),
  };
  const TAL_FORSLAG = [
    ['Skiffer och senap, staplar i medaljongen och stenar längs bandet.', 'skiffer', 'senap', 'stenar', 'staplar'],
    ['Senap och kol, en kurva som stiger, och solar längs bandet.', 'senap', 'kol', 'sol', 'linje'],
    ['Oliv och rost, fyra streck och ett snedstreck som man räknar med, och pärlor längs bandet.', 'oliv', 'rost', 'parlor', 'rakna'],
  ];
  VAL.push({ id: 'f9_tal', namn: 'Stenen Byns tal', typ: 'tre', vad: 'Steg 9.3.2: graferna flyttar ur Krönikan till en egen runsten, Byns tal. Här tre förslag: stenen stängd och öppen och bandet överst i fliken.', versioner: TAL_FORSLAG.map(([text, hu, an, monster, emb]) => ({ text, w: 2 * (window.GUIRITA.SW + 4) + 160 + 8, h: 46, stor: true, rita: B => {
    const R = window.GUIRITA, f = ['tal', '', hu, an, TAL_EMB[emb]];
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, B.P.i('ben', 2));
    R.runsten(B, 5, 9, f, 'stangd'); R.runsten(B, 5 + R.SW + 4, 9, f, 'oppen'); R.nyttBand(B, 2 * (R.SW + 4) + 8, 5, hu, an, monster, f[4]);
  } })) });
})();
