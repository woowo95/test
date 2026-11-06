// fas 7, fångsten (7.4): fångstbänken (7.4.1), mjärden (7.4.2), gäddan och mörten med sitt kött (7.4.3). Tre versioner av varje.
(() => {
  const { hash, KORT, ell, linje, tri, poly, och, utan, punkt, rakt, former, bredd, MED_KONTUR, lagg, PA_RAD, R } = window.F7;

  // legenden för trä, vidjor, rep, ben och fisk
  const L = { E: 'jord0', F: 'jord1', G: 'jord2', H: 'jord3', I: 'senap0', J: 'senap1', K: 'senap2', M: 'senap3', p: 'ben1', q: 'ben2', w: 'ben3', v: 'ben0', k: 'kol1', s: 'rost1', t: 'rost2', u: 'rost3', r: 'rost0', a: 'skiffer1', b: 'skiffer2', c: 'skiffer3', d: 'skiffer0', g: 'oliv1', h: 'oliv2', i: 'oliv3', e: 'oliv0', n: 'barr1', m: 'barr2', N: 'barr0' };
  const ring = (cx, cy, r0, r1, sy = 1) => (x, y) => { const d = Math.hypot(x - cx, (y - cy) / sy); return d <= r1 && d >= r0; };
  // en skugga i rutmönster under en station (som under slöjdbänken)
  const skuggaUnder = (B, x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if ((x + y) % 2 === 0) B.morka(x, y); };
  const STATION = (text, rader, sk) => { // sk: [x, y, w, h] för skuggan under bänken, i bildens punkter
    const m = 4, w = bredd(rader) + m * 2, h = rader.length + m * 2;
    return { text, w, h, rita: (B) => { if (sk) skuggaUnder(B, m + sk[0], m + sk[1], sk[2], sk[3]); lagg(B, rader, L, m, m, false); for (let x = 0; x < bredd(rader); x++) if (rader[rader.length - 1][x] !== '.') B.morka(m + x, m + rader.length); } };
  };

  // ---------- 7.4.1 fångstbänken ----------
  // en arbetsbänk av två virke (skivan) och två grenar (benen) där fällor och burar görs, framifrån och lite ovanifrån som
  // slöjdbänken; på den något som är halvfärdigt
  const skiva = (x0, x1, y0) => [ // två plankor ovanifrån och kanten framifrån
    [rakt(x0, y0, x1, y0 + 6), (x, y) => { const yy = Math.floor(y) - y0; return yy === 0 ? 'M' === 'x' ? 'H' : 'H' : yy === 3 ? 'E' : (Math.floor(x) * 7 + yy * 3) % 13 === 0 ? 'F' : yy < 3 ? 'H' : 'G'; }],
    [rakt(x0, y0 + 6, x1, y0 + 10), (x, y) => { const yy = Math.floor(y) - y0 - 6; return yy === 0 ? 'G' : yy === 3 ? 'E' : x < x0 + 1 || x > x1 - 1 ? 'J' : 'F'; }],
  ];
  // ett ben av en gren: lite krokigt, med en kvist
  const gren = (x, y0, y1, bo = 0) => [[linje([[x, y0], [x + bo, (y0 + y1) / 2], [x, y1]], 0.9), (xx) => xx < x + bo ? 'G' : 'F'], [linje([[x + bo, (y0 + y1) / 2 - 1], [x + bo + 2, (y0 + y1) / 2 - 3]], 0.4), 'F']];
  const BANKAR = [
    // 0: en låg bänk på fyra grenar med en halvflätad mjärde och en bunt vidjor
    former(34, 26, [
      ...gren(5, 18, 24.5, -0.6), ...gren(28, 18, 24.5, 0.6), [linje([[8, 16], [8, 21.5]], 0.7), 'E'], [linje([[25, 16], [25, 21.5]], 0.7), 'E'],
      ...skiva(2, 32, 9),
      // mjärden: den flätade halvan till vänster, de bara spröten till höger som ska flätas
      [poly([[6, 4], [14, 5.5], [14, 13.5], [6, 15]]), (x, y) => { const xx = Math.floor(x), yy = Math.floor(y); return xx % 3 === 0 ? 'I' : (xx + yy) % 2 ? 'K' : 'M'; }],
      [ell(6.5, 9.5, 1.8, 5), 'J'], [ell(6.8, 9.5, 0.9, 3), 'k'], // öppningen med strupen
      ...[5.8, 8, 10.2, 12.4].map(y => [linje([[14, y + (y - 9.3) * 0.1], [22.5, 9.4 + (y - 9.3) * 0.25]], 0.45), 'K']),
      [ell(14.3, 9.5, 0.9, 4.2), 'I'], // den sista ringen
      [linje([[22.5, 9.4], [24, 9.4]], 0.7), 'p'], // spröten bundna i spetsen
      // vidjorna i en bunt
      ...[0, 1, 2].map(k => [linje([[19, 14.5 - k], [31, 13 - k * 0.6]], 0.45), k === 1 ? 'M' : 'K']),
      [linje([[25, 12], [25, 15.5]], 0.6), 'p'],
    ]),
    // 1: en bänk med en ställning av två grenar bak, där färdiga snaror hänger; på skivan en snara som görs
    former(34, 32, [
      [linje([[5.5, 1.5], [5.5, 16]], 0.9), (x) => x < 5.5 ? 'G' : 'F'], [linje([[28.5, 1.5], [28.5, 16]], 0.9), (x) => x < 28.5 ? 'G' : 'F'],
      [linje([[3.5, 3.5], [30.5, 3.5]], 0.9), (x, y) => y < 3.5 ? 'H' : 'G'], [ell(3.6, 3.5, 0.9, 1), 'J'], [ell(30.4, 3.5, 0.9, 1), 'J'],
      ...[10.5, 15.5, 20.5, 24.5].map((x, k) => [och(linje([[x, 4], [x, 6.5 + k % 2]], 0.5), ring(x, 8.6 + k % 2, 0.9, 1.9, 1.3)), k % 2 ? 'q' : 'p']), // snarorna som hänger
      ...gren(5, 24, 30.5, -0.6), ...gren(28, 24, 30.5, 0.6), [linje([[8, 22], [8, 27.5]], 0.7), 'E'], [linje([[25, 22], [25, 27.5]], 0.7), 'E'],
      ...skiva(2, 32, 15),
      [linje([[6, 19], [9, 16.5], [14, 15.5], [18, 17]], 0.7), 'E'], // ett böjt spö
      [ring(22, 18.4, 1.4, 2.6, 0.7), 'q'], [linje([[18, 17], [22, 17]], 0.4), 'p'], // repet med öglan
      [rakt(26, 17, 30, 18), 'w'], [punkt(26, 17), 'q'], // benspärren
    ]),
    // 2: en bock av kluven stock på två kryss av grenar; på den en fångstbur som byggs och en kniv
    former(36, 28, [
      [linje([[3, 15], [9, 26]], 0.8), 'G'], [linje([[9, 15], [3, 26]], 0.8), 'F'], [linje([[27, 15], [33, 26]], 0.8), 'G'], [linje([[33, 15], [27, 26]], 0.8), 'F'],
      [rakt(1, 12, 35, 15), (x, y) => Math.floor(y) === 12 ? 'H' : (Math.floor(x) * 5) % 11 === 0 ? 'F' : 'G'], // den kluvna sidan uppåt
      [rakt(1, 15, 35, 19), (x, y) => { const yy = Math.floor(y); return yy === 18 ? 'E' : (Math.floor(x) + yy) % 5 === 0 ? 'E' : 'F'; }], // barken framåt
      [ell(1.5, 15.5, 1, 3.3), 'K'], [ell(34.5, 15.5, 1, 3.3), 'J'], // stockens ändar
      // buren: en ram med spjälor, de till höger saknas än
      [och(linje([[8, 3], [22, 3]], 0.55), linje([[8, 12.4], [22, 12.4]], 0.55), linje([[8, 3], [8, 12.4]], 0.55), linje([[22, 3], [22, 12.4]], 0.55)), (x, y) => y < 3.5 || x < 8.5 ? 'H' : 'G'],
      ...[10.5, 12.5, 14.5, 16.5].map(x => [linje([[x, 3], [x, 12.4]], 0.5), 'G']),
      ...[[8, 3], [22, 3], [8, 12], [22, 12]].map(([x, y]) => [ell(x, y, 0.9, 0.9), 'p']), // snörningen i hörnen
      ...[0, 1].map(k => [linje([[24, 11.5 - k], [33, 11 - k]], 0.4), 'H']), // lösa spjälor
      [linje([[25, 14], [28.5, 13.5]], 0.6), 'c'], [linje([[28.5, 13.5], [32, 13.2]], 0.7), 'F'], // kniven
    ]),
  ];
  const BANK_TEXT = ['En låg bänk på fyra grenar, med en mjärde som är halvt flätad och en bunt vidjor.', 'En bänk med en ställning av två grenar bak där färdiga snaror hänger, och en snara som görs på skivan.', 'En bock av en kluven stock på två kryss av grenar, med en fångstbur som byggs och en kniv.'];
  const BANK_SKUGGA = [[3, 19, 28, 6], [3, 25, 28, 6], [2, 19, 32, 8]];

  // ---------- 7.4.2 mjärden ----------
  // en flätad fälla av vidjor som fisken simmar in i genom en strut men inte hittar ut ur; som sak och utsatt i vattnet
  const MJARDAR = [
    // 0: en strut som smalnar mot den bundna änden, öppningen till vänster
    former(16, 10, [
      [poly([[1.5, 1.2], [12, 3], [12, 7], [1.5, 8.8]]), (x, y) => { const xx = Math.floor(x), yy = Math.floor(y); return xx % 3 === 1 ? 'I' : (xx + yy) % 2 ? 'K' : yy < 4 ? 'M' : 'J'; }],
      [linje([[12, 5], [14.5, 5]], 0.9), 'p'], [punkt(14, 4), 'q'],
      [ell(2, 5, 1.2, 3.6), 'J'], [ell(2.2, 5, 0.6, 2.2), 'k'],
    ]),
    // 1: en rak tunna med tre ringar och en strut i varje ände
    former(16, 10, [
      [rakt(2, 1.5, 14, 8.5), (x, y) => { const xx = Math.floor(x), yy = Math.floor(y); return xx === 5 || xx === 10 ? 'I' : yy % 2 ? 'K' : yy < 4 ? 'M' : 'J'; }],
      [ell(2, 5, 1.3, 3.5), 'J'], [ell(2.2, 5, 0.6, 2), 'k'], [ell(14, 5, 1.3, 3.5), 'I'], [ell(14, 5, 0.6, 2), 'E'],
    ]),
    // 2: en rund flaska med en smal hals som strut och locket snört i den andra änden
    former(16, 10, [
      [ell(8.5, 5, 5.5, 4), (x, y) => { const xx = Math.floor(x), yy = Math.floor(y); return (xx + yy * 2) % 4 === 0 ? 'I' : (xx + yy) % 2 ? 'K' : x < 7 && y < 4 ? 'M' : 'J'; }],
      [rakt(1.2, 3, 4, 7), (x, y) => Math.floor(y) % 2 ? 'K' : 'J'], [ell(1.6, 5, 0.9, 2.2), 'k'], // halsen
      [ell(14, 5, 1, 2.2), 'G'], [linje([[13.5, 2.5], [13.5, 7.5]], 0.4), 'p'], // locket och snöret
    ]),
  ];
  const MJARDE_TEXT = ['En strut som smalnar mot den bundna änden.', 'En rak tunna med ringar och en strut i varje ände.', 'En rund flaska med en smal hals och ett snört lock.'];
  // scenen: mjärden på stranden, och en till utsatt i vattnet där bara toppen syns, med ett rep till en påle på land
  const MJARDE = (text, v) => ({ text, w: 6 * R, h: 3.5 * R, rita: (B) => {
    const P = B.P, M = window.MARK, sd = (x, y) => M.spelSd(x, y, y / R - 1.6);
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) { const c = M.spelVatten(x, y, sd(x, y), P); B.satt(x, y, c !== null ? c : M.grasPunkt(x, y, P, 0)); }
    const r = MJARDAR[v];
    lagg(B, r, L, 4, 6);
    // i vattnet: de två översta raderna av vidjor syns, resten är mörkare under ytan
    const x0 = 50, y0 = 31;
    r.forEach((rad, y) => [...rad].forEach((ch, x) => {
      if (ch === '.') return;
      if (y < 3) B.satt(x0 + x, y0 + y, P.i(...(ch === 'o' ? ['kol', 0] : [L[ch].slice(0, -1), +L[ch].slice(-1)])));
      else B.morka(x0 + x, y0 + y);
    }));
    for (let x = x0 + 1; x < x0 + bredd(r) - 1; x++) if (r[2][x - x0] !== '.' && x % 2) B.satt(x, y0 + 3, P.i('skiffer', 3)); // krusningen kring toppen
    // pålen på land och repet ner till mjärden
    const px = 78, py = 14;
    for (let y = py; y < py + 9; y++) { B.satt(px - 1, y, P.i('kol', 0)); B.satt(px, y, P.i(y === py ? 'senap' : 'jord', y === py ? 2 : 2)); B.satt(px + 1, y, P.i(y === py ? 'senap' : 'jord', 1)); B.satt(px + 2, y, P.i('kol', 0)); }
    for (let x = px - 1; x <= px + 2; x++) B.satt(x, py - 1, P.i('kol', 0));
    for (let k = 0; k <= 1; k++) B.morka(px + 3, py + 8 - k);
    const ax = px, ay = py + 3, bx = x0 + bredd(r) - 2, by = y0 + 1;
    for (let t = 0; t <= 1; t += 0.02) { const x = Math.round(ax + (bx - ax) * t), y = Math.round(ay + (by - ay) * t + Math.sin(t * Math.PI) * 3); B.satt(x, y, P.i('ben', t < 0.5 ? 2 : 1)); }
  } });

  // ---------- 7.4.3 gäddan och mörten ----------
  // fisken från sidan med huvudet åt vänster, som abborren (10 × 5); gäddan större och längre, mörten mindre
  // gäddan: platt nos som en näbb, lång kropp, rygg- och analfenan långt bak och en kluven stjärt. Mallen: B rygg, F sida,
  // S fläck, W och Q buk, T fena, K öga; varje version byter bokstäverna mot sina färger
  const GADDMALL = [
    '............TT.....T',
    '...BBBBBBBBBBBB...TT',
    '.BFKSFFSFFFSFFBB.TT.',
    'BQFFSFFFSFFFSFFBBT..',
    '.WWWQWWWWQWWWWQB.TT.',
    '...TT.......TT....TT',
    '...................T',
  ];
  const GADDSMAL = [
    '...........TT......T',
    '..BBBBBBBBBBBBB...TT',
    'BBKSFFSFFSFFSFFBBTT.',
    '.WWWQWWWWQWWWWQBBTT.',
    '...T........TT....TT',
    '...................T',
  ];
  const fyll = (mall, f) => MED_KONTUR(mall.map(r => r.replace(/[A-Z]/g, c => f[c])));
  const GADDOR = [
    fyll(GADDMALL, { B: 'n', F: 'h', S: 'i', W: 'w', Q: 'q', T: 't', K: 'k' }), // mörkgrön rygg, ljusa fläckar, rödbruna fenor
    fyll(GADDMALL, { B: 'g', F: 'h', S: 'M', W: 'w', Q: 'q', T: 'g', K: 'k' }), // ljusare, gula fläckar, gröna fenor
    fyll(GADDSMAL, { B: 'N', F: 'g', S: 'K', W: 'q', Q: 'p', T: 'n', K: 'M' }), // smal och mörk, gult öga
  ];
  // gäddköttet: vitt och fast, med den gröna huden i kanten
  const GADDKOTT = [
    former(12, 6, [[ell(6, 3, 5, 1.8), (x, y) => y < 2 ? 'g' : x < 5 && y < 3.5 ? 'w' : 'q'], [punkt(3, 3), 'w'], [linje([[3, 4], [9, 4]], 0.3), (x) => Math.floor(x) % 2 ? 'p' : 'q']]),
    former(14, 6, [...[3.5, 9.5].map(cx => [ell(cx, 3, 2.6, 2.1), (x, y) => { const d = Math.hypot(x - cx, (y - 3) * 1.25); return d > 2.2 ? 'g' : d < 0.8 ? 'v' : x < cx && y < 3 ? 'w' : 'q'; }])]), // två skivor med ryggbenet i mitten
    former(12, 6, [[ell(6, 3, 5, 1.9), (x, y) => y > 3 ? 'q' : (Math.floor(x) + Math.floor(y)) % 3 === 0 ? 'i' : 'h'], [linje([[1.5, 3.4], [10.5, 3.4]], 0.4), 'w']]), // med skinnet uppåt, vitt i kanten
  ];
  const GADDA_TEXT = ['Mörkgrön rygg, ljusa fläckar och rödbruna fenor, spetsig nos som en näbb. Köttet en vit filé med huden i kanten.', 'Ljusare olivgrön med gula fläckar i rader och gröna fenor. Köttet i två skivor med ryggbenet i mitten.', 'Smal och mörk, med gulgröna fläckar och gult öga. Köttet en filé med det fläckiga skinnet uppåt.'];

  const MORTAR = [
    // 0: hög kropp, silvrig med blågrå rygg och röda fenor och öga
    MED_KONTUR([
      '....tt....',
      '..bbbbbb.t',
      '.bcwcccbtt',
      'utwwwcwwbt',
      '.qwwwwwqbt',
      '...tt.t..t',
    ]),
    // 1: smalare, med mörkare olivgrå rygg och ljusare röda fenor
    MED_KONTUR([
      '....uu.....',
      '.hhhhhhh..u',
      'ucwwwcwwhuu',
      '.qwwwwwqquu',
      '...uu.u...u',
    ]),
    // 2: silvrig med stora klarröda fenor och stjärt
    MED_KONTUR([
      '...ttt.....u',
      '..aaaaaa..uu',
      '.acwcccatuu.',
      'utwwwwcwwtu.',
      '.qwwwwwqatuu',
      '..ttu.tt...u',
    ]),
  ];
  const MORTKOTT = [
    former(13, 5, [[ell(3, 2.5, 2.2, 1.3), (x, y) => y < 2 ? 'w' : 'q'], [ell(9, 2.5, 2.2, 1.3), (x, y) => y < 2 ? 'w' : 'q'], [punkt(9, 2), 'u']]),
    former(9, 5, [[ell(4.5, 2.5, 3.6, 1.4), (x, y) => y < 2 ? 'b' : x < 4 ? 'w' : 'q'], [linje([[1.5, 3], [7.5, 3]], 0.3), 'u']]), // filén med det silvriga skinnet i kanten
    former(12, 6, [[ell(3, 3.4, 2.2, 1.6), (x, y) => y < 3 ? 'w' : 'q'], [ell(8.6, 2.6, 2.3, 1.4), (x, y) => y < 2 ? 'u' : 'w'], [punkt(2, 3), 'u']]),
  ];
  const MORT_TEXT = ['Hög kropp, silvrig med blågrå rygg och röda fenor och öga. Köttet i två små bitar.', 'Smalare, med olivgrå rygg och ljusare röda fenor. Köttet en liten filé med skinnet kvar i kanten.', 'Silvrig med stora klarröda fenor och stjärt. Köttet i två bitar, en med det rosa inåt.'];

  VAL.push(
    KORT('f7_fangstbank', 'Fångstbänken', 'Steg 7.4.1: fångstbänken, en arbetsbänk av två virke och två grenar där byn gör fällor, mjärdar och burar. Bilden visar den framifrån som slöjdbänken, med något halvfärdigt på.', BANKAR.map((r, i) => STATION(BANK_TEXT[i], r, BANK_SKUGGA[i]))),
    KORT('f7_mjarde', 'Mjärden', 'Steg 7.4.2: mjärden, en flätad fälla av vidjor som fisken simmar in i genom en strut men inte hittar ut ur. Bilden visar den på stranden, och utsatt i vattnet där bara toppen syns och ett rep går till en påle på land.', MJARDAR.map((_, i) => MJARDE(MJARDE_TEXT[i], i))),
    KORT('f7_gadda', 'Gäddan', 'Steg 7.4.3: gäddan, en ny fisk som fås med mjärden och spöet: större och längre än abborren, grönspräcklig och med spetsig nos. Bilden visar fisken och gäddköttet bredvid.', GADDOR.map((r, i) => PA_RAD(GADDA_TEXT[i], [[r, L], [GADDKOTT[i], L]]))),
    KORT('f7_mort', 'Mörten', 'Steg 7.4.3: mörten, en liten silvrig fisk med röda fenor och rött öga. Bilden visar fisken och mörtköttet bredvid.', MORTAR.map((r, i) => PA_RAD(MORT_TEXT[i], [[r, L], [MORTKOTT[i], L]]))),
  );
})();
