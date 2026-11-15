// fas 10, system 10.3: trons hus och buden, tre versioner var: altaret och gudabilden i trons hus (steg 10.3.19), symbolen för ett
// heligt ting (10.3.20), köttet från de nya arterna (10.3.14: rådjur, får, get, fågel och björn) och skinnen av får och get.
// Stationerna ritas snett ovanifrån som kartans andra möbler (ytan ovanifrån och en mörkare framsida) och står bredvid en kolonist.
(() => {
  const { KORT, former, ell, linje, tri, och, utan, punkt, rakt, poly, lagg, bredd } = window.F7;
  const S = 'Steg ';
  // sten (skiffer), trä (jord), guld (senap), kött (rost), ben och ull (ben)
  const L = { a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3', k: 'skiffer0', K: 'skiffer1', l: 'skiffer2', m: 'skiffer3', y: 'senap1', Y: 'senap2', g: 'senap3', r: 'rost0', R: 'rost1', q: 'rost2', Q: 'rost3', f: 'ben1', s: 'ben2', n: 'ben3', o: 'kol0', p: 'kol1' };
  const PA = (text, rader, legend = L, m = 4) => ({ text, w: bredd(rader) + 2 * m, h: rader.length + 2 * m, rita: B => lagg(B, rader, legend, m, m) });
  // flera små saker i en rad (köttet och skinnen), var och en med sin legend
  const RAD = (text, delar, m = 4, mellan = 4) => {
    const w = delar.reduce((s, [r]) => s + bredd(r), 0) + mellan * (delar.length - 1) + 2 * m, h = Math.max(...delar.map(([r]) => r.length)) + 2 * m;
    return { text, w, h, rita: B => { let x = m; delar.forEach(([r, lg]) => { lagg(B, r, { ...L, ...lg }, x, h - m - r.length); x += bredd(r) + mellan; }); } };
  };
  const yta = (x0, y0, x1, y1, ljus, mork, mon) => [rakt(x0, y0, x1, y1), (x, y) => y >= y1 - 3 ? mork : mon ? mon(x, y) : ljus];

  // ---------- altaret (2 × 1 rutor): där det heliga står och den ledda bönen hålls ----------
  const altare = [
    // 1: ett långt stenblock ovanifrån med en skål av guld mitt på och två stenar som ben
    former(32, 14, [yta(1, 1, 31, 12, 'm', 'K', (x, y) => (Math.floor(x * 0.7 + y) % 7 === 0 ? 'l' : 'm')), [ell(16, 5, 3.5, 2), (x, y) => (y < 5 ? 'g' : 'Y')], [och(rakt(4, 12, 9, 14), rakt(23, 12, 28, 14)), 'k']]),
    // 2: ett bord av grova plankor med ett vitt kläde över mitten och tre ljus
    former(32, 16, [yta(1, 3, 31, 13, 'd', 'b', (x, y) => (Math.floor(x) % 6 === 0 ? 'c' : 'd')), [rakt(10, 3, 22, 13), (x, y) => (y >= 10 ? 's' : 'n')], [och(rakt(5, 0, 7, 4), rakt(15, 0, 17, 4), rakt(25, 0, 27, 4)), (x, y) => (y < 1 ? 'Y' : 'n')], [och(rakt(3, 13, 5, 16), rakt(27, 13, 29, 16)), 'a']]),
    // 3: en rund hög av staplade stenar, platt överst, med en flat häll där offret läggs
    former(30, 14, [[ell(15, 7, 14.5, 6.5), (x, y) => (y > 9 ? (Math.floor(x / 3 + y) % 2 ? 'k' : 'K') : Math.floor(x / 4 + y / 2) % 2 ? 'l' : 'K')], [ell(15, 5, 8, 3), (x, y) => (y < 4 ? 'm' : 'l')], [ell(15, 5, 3, 1.2), 'q']]),
  ];

  // ---------- gudabilden (1 × 1 ruta): den snidade bilden av trons gud ----------
  const gudabild = [
    // 1: en hög stolpe med ett ansikte överst och armar längs sidorna, på en fot av sten (symmetrisk)
    former(12, 22, [[rakt(3, 0, 9, 18), (x, y) => (x < 5 ? 'b' : x > 7 ? 'a' : 'c')], [och(punkt(4.5, 3), punkt(7.5, 3)), 'o'], [rakt(4, 6, 8, 7), 'a'], [och(rakt(3, 10, 4, 15), rakt(8, 10, 9, 15)), 'a'], [rakt(1, 18, 11, 22), (x, y) => (y < 19 ? 'l' : 'K')]]),
    // 2: en bred sittande gestalt med guldögon och händerna på knäna
    former(16, 18, [[ell(8, 4, 3.5, 3.5), 'c'], [och(punkt(6.8, 4), punkt(9.2, 4)), 'Y'], [poly([[3, 8], [13, 8], [15, 17], [1, 17]]), (x, y) => (x < 5 ? 'b' : x > 11 ? 'a' : 'c')], [och(ell(4.5, 13, 1.6, 1.4), ell(11.5, 13, 1.6, 1.4)), 'd'], [rakt(0, 17, 16, 18), 'a']]),
    // 3: en smal tvåhövdad bild med horn, rest ur en stubbe
    former(14, 22, [[och(ell(4.5, 4, 2.5, 3), ell(9.5, 4, 2.5, 3)), 'c'], [och(linje([[3, 1.5], [1, 0]], 0.6), linje([[11, 1.5], [13, 0]], 0.6)), 'g'], [och(punkt(4.5, 4), punkt(9.5, 4)), 'o'], [rakt(4, 7, 10, 17), (x, y) => (Math.floor(y) % 4 === 0 ? 'a' : 'b')], [ell(7, 19, 6.5, 3), (x, y) => (y < 18 ? 'd' : 'a')]]),
  ];

  // ---------- symbolen heligt (16 punkter): bredvid ett heligt tings namn ----------
  const heligt = [
    // 1: en ring av guld med fyra strålar (symmetrisk)
    former(16, 16, [[utan(ell(8, 8, 4.5, 4.5), ell(8, 8, 2.5, 2.5)), (x, y) => (x + y < 15 ? 'g' : 'Y')], [och(rakt(7, 0, 9, 3), rakt(7, 13, 9, 16), rakt(0, 7, 3, 9), rakt(13, 7, 16, 9)), 'y']]),
    // 2: en liten låga över en skål
    former(16, 16, [[poly([[8, 0], [12, 7], [10, 10], [6, 10], [4, 7]]), (x, y) => (y < 4 ? 'g' : 'Y')], [ell(8, 8, 1.5, 2), 'n'], [poly([[2, 10], [14, 10], [12, 15], [4, 15]]), (x, y) => (y < 11 ? 'c' : 'b')]]),
    // 3: en trefot (tre ringar som griper i varandra) i guld
    former(16, 16, [[och(utan(ell(8, 5, 4, 4), ell(8, 5, 2.4, 2.4)), utan(ell(4.5, 11, 4, 4), ell(4.5, 11, 2.4, 2.4)), utan(ell(11.5, 11, 4, 4), ell(11.5, 11, 2.4, 2.4))), (x, y) => (y < 8 ? 'g' : 'Y')]]),
  ];

  // ---------- köttet (10.3.14): fem arter, var och en i sin ton ----------
  // r/R/q/Q i varje arts legend: rådjur mörkrött, får ljusrosa, get rödbrunt, fågel ljust med skinn, björn nästan svart
  const ART = {
    radjur: { r: 'rost0', R: 'rost1', q: 'rost2', Q: 'rost3' },
    far: { r: 'rost1', R: 'rost2', q: 'rost3', Q: 'ben3' },
    get: { r: 'jord0', R: 'rost0', q: 'rost1', Q: 'rost2' },
    fagel: { r: 'senap0', R: 'ben1', q: 'ben2', Q: 'ben3' },
    bjorn: { r: 'kol0', R: 'kol1', q: 'rost0', Q: 'rost1' },
  };
  const ARTER = ['radjur', 'far', 'get', 'fagel', 'bjorn'];
  const kott = [
    // 1: en klump med ett ben som sticker ut åt höger
    former(14, 11, [[ell(6, 5.5, 5.5, 4.5), (x, y) => (y < 3 ? 'Q' : x > 8 ? 'R' : y > 7 ? 'r' : 'q')], [linje([[10, 5], [13, 4]], 0.9), 'n'], [ell(13, 3.6, 1, 1), 'n']]),
    // 2: en tjock skiva sedd snett ovanifrån, med fettkant och ett märgben i mitten
    former(13, 10, [[ell(6.5, 4.5, 6, 4), (x, y) => (y > 6 ? 'r' : 'q')], [utan(ell(6.5, 4, 6, 3.5), ell(6.5, 4, 5, 2.6)), 'n'], [ell(5, 4, 1.2, 1), 's']]),
    // 3: en stek på en snöre, hängande (smal upptill, bred nertill)
    former(10, 14, [[linje([[5, 0], [5, 3]], 0.5), 'f'], [poly([[3, 3], [7, 3], [9.5, 11], [7, 14], [3, 14], [0.5, 11]]), (x, y) => (x < 3 ? 'Q' : x > 7 ? 'r' : 'q')], [ell(5, 10, 1.5, 1), 'R']]),
  ];

  // ---------- skinnen av får och get ----------
  const SK = { far: { a: 'ben1', b: 'ben2', c: 'ben3', d: 'ben3' }, get: { a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3' } };
  const skinn = [
    // 1: utspänt platt, med fyra spetsar för benen och ullen i lockar (symmetriskt)
    former(16, 14, [[och(ell(8, 7, 5.5, 6), poly([[1, 1], [4, 3], [3, 5]]), poly([[15, 1], [12, 3], [13, 5]]), poly([[1, 13], [4, 11], [3, 9]]), poly([[15, 13], [12, 11], [13, 9]])), (x, y) => (Math.floor(x * 1.3 + y * 0.9) % 3 === 0 ? 'b' : x < 8 ? 'c' : 'd')]]),
    // 2: hoprullat och knutet med ett band, ullen utåt
    former(16, 9, [[ell(8, 4.5, 7.5, 4), (x, y) => (Math.floor(x + y) % 3 === 0 ? 'b' : y < 4 ? 'd' : 'c')], [och(ell(1.5, 4.5, 1.3, 3.5)), 'a'], [och(rakt(5, 0, 6, 9), rakt(10, 0, 11, 9)), 'p']]),
    // 3: vikt på mitten, den släta läderytan upp och en rand ull i kanten
    former(15, 11, [[poly([[0, 3], [13, 0], [15, 8], [2, 11]]), (x, y) => (y > 8 - x * 0.2 || x < 2 ? (Math.floor(x + y) % 2 ? 'c' : 'd') : 'R')], [linje([[1, 3.5], [13.5, 0.5]], 0.6), 'a']]),
  ];
  const LADER = { R: 'jord2' };

  VAL.push(
    KORT('f10_altare', 'Altaret', S + '10.3.19: altaret i trons hus. Där står de heliga tingen och där hålls den ledda bönen; huset är klart när altaret står. Två rutor långt, snett ovanifrån som de andra stationerna', [
      PA('Ett långt stenblock på två stenar, med en skål av guld', altare[0]),
      PA('Ett plankbord med ett vitt kläde och tre ljus', altare[1]),
      PA('En rund hög av staplade stenar med en flat häll för offret', altare[2]),
    ]),
    KORT('f10_gudabild', 'Gudabilden', S + '10.3.19: gudabilden i trons hus, den snidade bilden av trons gud. En ruta stor', [
      PA('En hög stolpe med ansikte och armar, på en fot av sten', gudabild[0]),
      PA('En bred sittande gestalt med guldögon', gudabild[1]),
      PA('En tvåhövdad bild med horn ur en stubbe', gudabild[2]),
    ]),
    KORT('f10_heligt', 'Symbolen Heligt', S + '10.3.20: symbolen bredvid namnet på ett heligt ting, som står på altaret och gör bönen starkare. 16 punkter', [
      PA('En guldring med fyra strålar', heligt[0]),
      PA('En låga över en skål', heligt[1]),
      PA('Tre ringar som griper i varandra', heligt[2]),
    ]),
    KORT('f10_kott', 'Köttet från fem arter', S + '10.3.14: rådjuret, fåret, geten, fågeln och björnen ger var sitt kött. Här alla fem i rad, i samma form och var sin ton (rådjur, får, get, fågel, björn)', [
      RAD('En klump med ett ben som sticker ut', ARTER.map(a => [kott[0], ART[a]])),
      RAD('En tjock skiva med fettkant och märgben', ARTER.map(a => [kott[1], ART[a]])),
      RAD('En stek som hänger i ett snöre', ARTER.map(a => [kott[2], ART[a]])),
    ]),
    KORT('f10_skinn', 'Skinnen av får och get', S + '10.3.14: fåret och geten ger eget skinn. Fårets ljust och lockigt, getens brunt (får till vänster, get till höger)', [
      RAD('Utspänt platt med fyra spetsar för benen', [[skinn[0], SK.far], [skinn[0], SK.get]]),
      RAD('Hoprullat och knutet med två band', [[skinn[1], SK.far], [skinn[1], SK.get]]),
      RAD('Vikt på mitten, läderytan upp och ullen i kanten', [[skinn[2], { ...SK.far, ...LADER }], [skinn[2], { ...SK.get, ...LADER }]]),
    ]),
  );
})();
