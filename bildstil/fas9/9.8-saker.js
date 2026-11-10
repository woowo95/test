// fas 9, system 9.8: sakerna (steg 9.8.5, 9.8.9–9.8.15), tre versioner var: skäran, ullen, ulltråden, ylletyget, djurhornet, fiskrensen, lövkärven och mjölken. Små föremål (omkring 16 × 16), ritade med former och konturen 'o'.
(() => {
  const { KORT, former, ell, linje, tri, och, utan, punkt, rakt, MED_KONTUR, lagg, bildfil, bredd } = window.F7;
  const L = { ...window.F98.L };
  const S = 'Steg ';
  const med = x => ({ ...L, ...x });
  const PA = (text, rader, legend = L, m = 4) => { const w = bredd(rader) + 2 * m, h = rader.length + 2 * m; return { text, w, h, rita: B => lagg(B, rader, legend, m, m) }; };
  const RAD = (text, delar, m = 4, mellan = 5) => {
    const matt = delar.map(d => d.fil ? [d.w, d.h] : [bredd(d[0]), d[0].length]);
    const w = matt.reduce((s, [a]) => s + a, 0) + mellan * (delar.length - 1) + m * 2, h = Math.max(...matt.map(([, b]) => b)) + m * 2 + 1;
    return { text, w, h, rita: B => { let x = m; delar.forEach((d, i) => { const [dw, dh] = matt[i], y = h - m - 1 - dh; if (d.fil) bildfil(B, d.fil, x, y); else lagg(B, d[0], d[1], x, y); x += dw + mellan; }); } };
  };
  const FIL = (fil, w, h) => ({ fil, w, h });

  // ---------- skäran: en krökt flintegg på ett träskaft ----------
  const skaft = (pts, r) => [linje(pts, r), (x, y) => (x + y) % 5 === 0 ? 'b' : 'c'];
  const skara = [
    // 1: rakt skaft och en krökt egg av flinta längst upp, tandad
    former(15, 15, [skaft([[2.5, 13], [6, 8]], 1), [linje([[6, 8.5], [8, 5], [11, 3.5], [13.5, 4.5]], 1.1, 0.7), (x, y) => (Math.floor(x) + Math.floor(y)) % 2 ? 'Q' : 'P'], [och(punkt(8, 6), punkt(10, 5), punkt(12, 5)), 'S']]),
    // 2: ett halvmåneformat trä där flintbitar är fästa i en rad längs insidan
    former(15, 15, [skaft([[2, 13.5], [4.5, 10.5]], 1), [linje([[5, 11], [4.5, 7], [6.5, 3.5], [10.5, 2.5], [13.5, 4]], 1.2), 'c'], [och(punkt(6, 8), punkt(7, 6), punkt(8, 5), punkt(10, 4), punkt(12, 4)), 'S'], [och(punkt(7, 8), punkt(8, 7), punkt(9, 6), punkt(11, 5)), 'R']]),
    // 3: kort skaft och ett bredare, svagt krökt blad av ljus flinta
    former(15, 15, [skaft([[2, 13], [5.5, 9]], 1.2), [tri([5, 9.5], [12.5, 4], [7, 4]), (x, y) => y < 5.6 ? 'S' : 'R'], [linje([[5.5, 9], [8, 5.6], [12.5, 4.2]], 0.7), 'Q'], [och(punkt(8, 4), punkt(10, 4), punkt(12, 4)), 'P']]),
  ];
  // ---------- ullen ----------
  const ULL = { m: 'ben3', l: 'ben2', k: 'ben1', j: 'jord3', h: 'senap3', b: 'jord2', d: 'skiffer3', e: 'skiffer2', f: 'skiffer1' };
  const tova = (cx, cy, rx, ry, ton) => [ell(cx, cy, rx, ry), (x, y) => (y < cy - ry * 0.3 && x < cx + 1 ? ton[0] : y > cy + ry * 0.4 ? ton[2] : ton[1])];
  const ull = [
    former(14, 11, [tova(4.5, 6.5, 3.2, 3, 'mlk'), tova(8.5, 5.5, 3.6, 3.3, 'mlk'), tova(6.5, 4, 3, 2.6, 'mlk'), tova(10, 7.8, 2.8, 2.4, 'mlk'), [och(punkt(5, 8), punkt(9, 9), punkt(7, 3)), 'h']]),
    former(15, 8, [[ell(7.5, 4.5, 6.6, 3), (x, y) => (Math.floor(x) * 3 + Math.floor(y)) % 5 === 0 ? 'k' : y < 3 ? 'm' : y > 5.5 ? 'k' : 'l'], [och(linje([[2, 2.2], [5, 3]], 0.4), linje([[9, 1.2], [12, 2.8]], 0.4), linje([[6, 6.6], [10, 7]], 0.4)), 'h'], [och(punkt(4, 5), punkt(9, 5), punkt(12, 4)), 'b']]),
    former(14, 11, [tova(4.5, 6.5, 3.2, 3, 'efd'), tova(8.5, 5.5, 3.6, 3.3, 'efd'), tova(6.5, 4, 3, 2.6, 'efd'), tova(10, 7.8, 2.8, 2.4, 'efd'), [och(punkt(5, 8), punkt(9, 9)), 'k']]),
  ];
  // ---------- ulltråden ----------
  const ulltrad = [
    // 1: sländan med ulltråden lindad på pinnen och trissan under (som linsländan i 7.7.9)
    former(9, 17, [[linje([[4, 0], [4, 16]], 0.6), 'c'], [rakt(2, 4, 7, 11), (x, y) => Math.floor(x) === 2 ? 'm' : Math.floor(x) > 5 ? 'k' : (Math.floor(y) % 2 ? 'l' : 'm')], [ell(4.5, 14, 3, 1.1), (x, y) => x < 4 ? 'S' : 'R'], [punkt(4, 1), 'h']]),
    // 2: en härva, ullgarn i en vriden ögla
    MED_KONTUR(['..mmmm....', '.mllllm...', 'mlkkkklm..', 'mlk..mklm.', 'mlk..mklm.', '.mllllkl..', '..kllkl...', '..mllkm...', '...mkkm...', '....kk....']),
    // 3: ett nystan av grått ullgarn med en lös ände
    former(12, 11, [[ell(5.5, 5.5, 4.8, 4.6), (x, y) => (Math.floor(x + y * 0.5) + Math.floor(y)) % 3 === 0 ? 'f' : (x - y) > 1 ? 'e' : 'd'], [linje([[9, 8], [11, 9.5], [10, 10.5]], 0.4), 'e']]),
  ];
  // ---------- ylletyget: hopvikt, tjockare och fluffigare än linet ----------
  const UL = { W: 'jord3', w: 'jord2', v: 'jord1', V: 'jord0', r: 'rost2', q: 'rost1', c: 'ben3' };
  const lintyg0 = MED_KONTUR(['.WWWWWWWw.', 'wwwwwwwwwv', 'WWWWWWWWwv', 'vvvvvvvvvV', 'WWwwwwwwvV', 'vvvvvvvvVV']);
  const LINL = { W: 'ben3', w: 'ben2', v: 'ben1', V: 'ben0', r: 'rost2', q: 'rost1' };
  const ylle = [
    MED_KONTUR(['.WcWcWcWWw.', 'wwwwcwwwwwv', 'WcWWWWcWwwv', 'wwvvwvvwvvV', 'WcwwwcwwwvV', 'vvvwvvvvvVV', 'wvwvvVvvVVV']),
    MED_KONTUR(['.WWWWWWWWw.', 'wwwwwwwwwwv', 'WWWWWWWWWwv', 'qrqrqrqrqrq', 'WcWcWcWcWwv', 'wwwwwwwwwwv', 'vvvvvvvvvvV', 'wvwvwvwvwVV']),
    former(14, 8, [[rakt(5, 1, 13, 7), (x, y) => y < 2 ? 'W' : y >= 6 ? 'v' : (Math.floor(x + y) % 3 === 0 ? 'c' : 'w')], [ell(3.8, 4, 3.2, 3.2), (x, y) => { const r = Math.hypot(x - 3.8, y - 4); return r < 1 ? 'v' : r < 2.1 ? 'W' : r < 2.8 ? 'w' : 'v'; }]]),
  ];
  // ---------- djurhornet ----------
  const HO = { m: 'ben3', l: 'ben2', k: 'ben1', j: 'jord3', i: 'jord2', h: 'jord1', g: 'jord0' };
  const djurhorn = [
    // 1: fårhorn, tjockt och kraftigt snirklat, med ringar
    former(14, 14, [[linje([[3, 11], [1.5, 7], [4, 3.5], [8, 3], [10.5, 5.5], [9.5, 8.5], [7, 8]], 2.2, 0.8), (x, y) => y < 6 && x < 9 ? ((Math.floor(x) + Math.floor(y)) % 3 === 0 ? 'k' : 'm') : (x + y) % 4 < 1 ? 'k' : 'l'], [ell(3.2, 11.6, 2, 1.3), 'g']]),
    // 2: gethorn, smalt och bakåtböjt med ringar tvärs över
    former(15, 14, [[linje([[2.5, 12.5], [3.5, 8], [6, 4.5], [10.5, 2.5], [14, 3]], 1.7, 0.6), (x, y) => Math.floor(x + y * 1.4) % 3 === 0 ? 'h' : y < 6 ? 'j' : 'i'], [ell(2.8, 12.6, 1.8, 1.1), 'g']]),
    // 3: hornet urholkat och avsågat i spetsen, redo att bli ett dryckeshorn, öppningen synlig
    former(15, 13, [[linje([[3, 10.5], [3, 6], [6.5, 3.5], [12, 2.8]], 2.1, 0.9), (x, y) => y < 5 ? 'm' : (x + y) % 5 === 0 ? 'k' : 'l'], [ell(2.9, 10.6, 2.1, 1.2), (x, y) => Math.hypot(x - 2.9, (y - 10.6) * 1.6) < 1.2 ? 'g' : 'k'], [punkt(12, 2), 'g']]),
  ];
  // ---------- fiskrensen ----------
  const RE = { r: 'rost1', s: 'rost2', t: 'rost3', q: 'rost0', m: 'ben3', l: 'ben2', k: 'ben1', d: 'skiffer1', e: 'skiffer2', f: 'skiffer3', y: 'senap2' };
  const fiskrens = [
    // 1: huvud, ryggrad och en hög röda inälvor
    former(15, 10, [[ell(11.5, 6.5, 3, 2.7), (x, y) => y < 6 ? 'e' : 'f'], [tri([8.5, 6.5], [4, 4], [4, 9]), 'e'], [och(punkt(10, 5), punkt(13, 5)), 'q'], [och(ell(3.5, 6.2, 3, 2.2), ell(6.5, 7.5, 2.4, 1.8)), (x, y) => (Math.floor(x) + Math.floor(y)) % 3 === 0 ? 's' : y < 6 ? 't' : 'r'], [och(punkt(10, 5), punkt(10, 4)), 'm']]),
    // 2: en fiskskelett: ryggrad med revben och ett huvud
    former(16, 8, [[linje([[4, 4], [15, 4]], 0.5), 'm'], [och(...Array.from({ length: 5 }, (_, i) => linje([[5.5 + i * 2, 1], [5.5 + i * 2, 7]], 0.35))), 'l'], [ell(2.6, 4, 2.4, 2.5), (x, y) => y < 3.5 ? 'k' : 'l'], [punkt(2, 3), 'q'], [tri([15, 1.5], [16, 4], [15, 6.5]), 'k']]),
    // 3: ett knippe tarmar och en sim, gulrosa och blanka
    former(14, 9, [[och(linje([[1.5, 5.5], [5, 2], [9, 5], [12, 2.5]], 1.4), linje([[2, 7], [6, 6.5], [10, 7.5], [13, 6]], 1.3)), (x, y) => y < 4.4 ? 't' : (Math.floor(x) + Math.floor(y)) % 3 ? 's' : 'r'], [och(punkt(5, 4), punkt(9, 4), punkt(7, 7)), 'y']]),
  ];
  // ---------- lövkärven ----------
  const LV = { g: 'oliv2', h: 'oliv1', w: 'oliv3', y: 'oliv0', j: 'ben2', k: 'ben1', c: 'jord2', b: 'jord1', r: 'rost2' };
  const lovkarve = [
    // 1: ett knippe björkris med blad uppåt, bundet nere med ett rep
    former(14, 16, [[och(...[2.5, 5, 7, 9, 11].map((x, i) => linje([[6 + (x - 6) * 0.25, 15], [x, 4 - (i % 2)]], 0.6))), (x, y) => y > 8 ? 'j' : 'c'], [och(ell(3.5, 4.5, 2.6, 3.3), ell(7, 3, 2.7, 3), ell(10.6, 4.4, 2.7, 3.2), ell(5.6, 7, 2, 2), ell(9, 7, 2, 2)), (x, y) => (Math.floor(x) + Math.floor(y)) % 3 === 0 ? 'w' : y < 4 ? 'w' : y > 7 ? 'y' : 'g'], [rakt(5, 11, 9, 12.5), 'r']]),
    // 2: en tjock kärve liggande, bunden på mitten, med bladen i bägge ändar
    former(16, 10, [[rakt(4, 3.5, 12, 7), (x, y) => y < 4.5 ? 'k' : y > 6 ? 'c' : 'j'], [och(ell(3, 5, 3, 3), ell(2, 3, 2, 2), ell(13, 5, 3, 3), ell(14, 3.5, 2, 2)), (x, y) => (Math.floor(x) + Math.floor(y)) % 3 === 0 ? 'w' : y < 4 ? 'g' : 'h'], [rakt(7.5, 3, 9, 7.5), 'r']]),
    // 3: ett färskt knippe med grönare, större blad och tre band
    former(13, 16, [[och(...[3, 6, 9].map(x => linje([[6, 15], [x, 6]], 0.7))), 'c'], [och(ell(3.5, 5, 3.3, 3.4), ell(7, 3.5, 3.6, 3.4), ell(10.2, 5, 3.3, 3.4), ell(6.5, 8, 3.2, 2.4)), (x, y) => (Math.floor(x * 2) + Math.floor(y)) % 3 === 0 ? 'w' : x < 5 ? 'g' : 'h'], [rakt(5, 11.5, 8, 12.5), 'r'], [rakt(5, 13.5, 8, 14.5), 'r']]),
  ];
  // ---------- mjölken: i en lerkruka ----------
  const MJ = { m: 'ben3', l: 'ben2', c: 'jord2', b: 'jord1', a: 'jord0', d: 'jord3', r: 'rost2', q: 'rost1' };
  const kruka = (v) => {
    if (v === 0) return former(12, 13, [[ell(6, 7.5, 5, 5.4), (x, y) => x < 3.4 ? 'd' : x > 8.4 ? 'a' : 'c'], [ell(6, 3.4, 4.4, 2), 'd'], [ell(6, 3.4, 3.6, 1.5), (x, y) => y < 3.1 ? 'm' : 'l']]);
    if (v === 1) return former(12, 14, [[ell(6, 8, 4.8, 5), (x, y) => x < 3.4 ? 'd' : x > 8.4 ? 'a' : 'c'], [rakt(3.5, 2, 8.5, 4), (x, y) => 'c'], [ell(6, 2.5, 3.2, 1.3), 'm'], [och(punkt(5, 1), punkt(7, 1)), 'l'], [rakt(1, 5, 3, 6), 'b'], [rakt(9, 5, 11, 6), 'b']]);
    return former(11, 15, [[ell(5.5, 10, 4.5, 4.2), (x, y) => x < 3 ? 'd' : x > 7.5 ? 'a' : 'c'], [rakt(4, 3, 7, 7), (x, y) => x < 5 ? 'd' : 'c'], [rakt(3, 2, 8, 3.5), 'b'], [ell(5.5, 2.6, 2.5, 0.9), 'm'], [och(punkt(8, 3), punkt(8, 4), punkt(8, 5)), 'l'], [och(punkt(7, 7), punkt(7, 8)), 'a']]);
  };
  const mjolk = [kruka(0), kruka(1), kruka(2)];

  VAL.push(
    KORT('f9_skara', 'Skäran', S + '9.8.9: skäran, ett nytt redskap att slå gräs och korn med: ett träskaft med en krökt egg av flinta. Den används på slåtterängen.', [
      PA('Rakt skaft och en tandad, krökt flintegg uppe i vinkeln.', skara[0], med({})),
      PA('Ett krökt trä med en rad flintbitar infällda längs eggen.', skara[1], med({})),
      PA('Kort skaft och ett bredare, svagt krökt blad av ljus flinta.', skara[2], med({}))]),
    KORT('f9_ull', 'Ull', S + '9.8.5: ull, ett nytt material som klipps av fåren. Av ullen spinns tråd (9.8.14). Bilden visar den bredvid repet, som jämförelse.', [
      RAD('En fluffig vit tova, med lite halm i.', [[ull[0], med(ULL)], FIL('rep', 11, 6)]),
      RAD('Ett platt, hoptrampat tjockt fårskinn med ullen kvar.', [[ull[1], med(ULL)], FIL('rep', 11, 6)]),
      RAD('Grå ull, från ett mörkare får.', [[ull[2], med(ULL)], FIL('rep', 11, 6)])]),
    KORT('f9_ulltrad', 'Ulltråd', S + '9.8.14: ulltråden, ett nytt material som spinns av ullen med sländan, och som vävs till ylle (9.8.12). Bilden visar den bredvid repet, som jämförelse.', [
      RAD('Sländan med ulltråden lindad på pinnen.', [[ulltrad[0], med(ULL)], FIL('rep', 11, 6)]),
      RAD('En härva ulltråd, en vriden ögla.', [[ulltrad[1], med(ULL)], FIL('rep', 11, 6)]),
      RAD('Ett nystan grå ulltråd med en lös ände.', [[ulltrad[2], med(ULL)], FIL('rep', 11, 6)])]),
    KORT('f9_ylle', 'Ylle', S + '9.8.14: ylle, ett nytt tygmaterial som vävs av ulltråd på vävstolen. Tjockare och grövre än lintyget, men varmare. Bilden visar ylletyget bredvid lintyget, som jämförelse.', [
      RAD('Ett hopvikt tjockt tyg i grått och brunt, med fluffig yta.', [[ylle[0], med(UL)], [lintyg0, med(LINL)]]),
      RAD('Ett hopvikt tyg med en röd rand och fransar nertill.', [[ylle[1], med(UL)], [lintyg0, med(LINL)]]),
      RAD('En rulle ylle, där varven syns i änden.', [[ylle[2], med(UL)], [lintyg0, med(LINL)]])]),
    KORT('f9_djurhorn', 'Djurhorn', S + '9.8.7: djurhornet, ett nytt material från får och getter. Av det blir t.ex. dryckeshorn och redskap.', [
      PA('Ett fårhorn, kraftigt och snirklat, med ringar i ytan.', djurhorn[0], med(HO)),
      PA('Ett gethorn, smalt och bakåtböjt, med ringar tvärs över.', djurhorn[1], med(HO)),
      PA('Ett urholkat horn, avsågat i spetsen, med öppningen synlig.', djurhorn[2], med(HO))]),
    KORT('f9_fiskrens', 'Fiskrens', S + '9.8.7: fiskrensen är tarmar, huvuden och ben som blir över när fisken rensats; den kan ges åt hunden eller hönsen.', [
      PA('Ett fiskhuvud, ryggrad och en hög röda inälvor.', fiskrens[0], med(RE)),
      PA('Ett avgnagt fiskskelett med huvudet kvar.', fiskrens[1], med(RE)),
      PA('Ett knippe blanka tarmar och en sim.', fiskrens[2], med(RE))]),
    KORT('f9_lovkarve', 'Lövkärve', S + '9.8.16: lövkärven är björkskott med löven kvar, bundna ihop. Fåren och getterna äter den som hö, och den räknas i höet inför vintern.', [
      PA('Ett upprätt knippe björkris med blad, bundet med ett rep nertill.', lovkarve[0], med(LV)),
      PA('En liggande kärve bunden på mitten, med blad i bägge ändar.', lovkarve[1], med(LV)),
      PA('Ett färskt knippe med större, grönare blad och två band.', lovkarve[2], med(LV))]),
    KORT('f9_mjolk', 'Mjölk', S + '9.8.8: mjölk, en ny mat från getter och får, i en lerkruka. Vit, och syns i krukans mynning.', [
      PA('En rund kruka med mjölk uppe i mynningen.', mjolk[0], med(MJ)),
      PA('En kruka med smalare hals, två öron och mjölken i halsen.', mjolk[1], med(MJ)),
      PA('En hög kruka med smal hals och en rinnande droppe på sidan.', mjolk[2], med(MJ))]),
  );
})();
