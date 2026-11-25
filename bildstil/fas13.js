// fas 13: färgerna på kläderna (steg 13.3.2). Sju färger: fem ur ramperna som finns (gult = senap, rött = rost, brunt = jord,
// svart = kol, grönt = oliv) och två nya dämpade ramper, blått och lila, med samma ljushet i varje ton som de andra. Kortet
// visar en kolonist i varje färg på gräset på dagen, i skymningen och på natten, med spelets mörker (src/palett.ts, MORKARE).
(() => {
  const NY = { bla: ['#1c2e49', '#2e4a71', '#4d6b98', '#728db8'], lila: ['#382540', '#593c64', '#7b5b89', '#9b7fab'] };
  const MORK = {"natt": {"#24201d": "#24201d", "#2f261d": "#24201d", "#372f25": "#24201d", "#474138": "#24201d", "#3f2415": "#24201d", "#5e3c24": "#24201d", "#7d5b40": "#233035", "#987e62": "#233035", "#694902": "#24201d", "#906f0f": "#233035", "#b2921b": "#474138", "#d8b25f": "#3e5156", "#521100": "#24201d", "#742a01": "#24201d", "#a14808": "#233035", "#bd753e": "#233035", "#353204": "#24201d", "#4b4f00": "#24201d", "#647025": "#233035", "#898b4c": "#233035", "#21290d": "#24201d", "#21310e": "#24201d", "#324726": "#24201d", "#505e3e": "#24201d", "#233035": "#24201d", "#3e5156": "#24201d", "#61767a": "#233035", "#8a9c9e": "#474138", "#7e7362": "#233035", "#a0947d": "#474138", "#bdb39b": "#3e5156", "#dad0bb": "#3e5156", "#1c2e49": "#24201d", "#2e4a71": "#24201d", "#4d6b98": "#233035", "#728db8": "#233035", "#382540": "#24201d", "#593c64": "#24201d", "#7b5b89": "#233035", "#9b7fab": "#233035"}, "skymn": {"#24201d": "#24201d", "#2f261d": "#24201d", "#372f25": "#24201d", "#474138": "#24201d", "#3f2415": "#24201d", "#5e3c24": "#2f261d", "#7d5b40": "#372f25", "#987e62": "#474138", "#694902": "#2f261d", "#906f0f": "#324726", "#b2921b": "#505e3e", "#d8b25f": "#7d5b40", "#521100": "#24201d", "#742a01": "#3f2415", "#a14808": "#5e3c24", "#bd753e": "#5e3c24", "#353204": "#24201d", "#4b4f00": "#21290d", "#647025": "#324726", "#898b4c": "#4b4f00", "#21290d": "#24201d", "#21310e": "#24201d", "#324726": "#21290d", "#505e3e": "#372f25", "#233035": "#24201d", "#3e5156": "#233035", "#61767a": "#474138", "#8a9c9e": "#3e5156", "#7e7362": "#474138", "#a0947d": "#505e3e", "#bdb39b": "#61767a", "#dad0bb": "#7e7362", "#1c2e49": "#24201d", "#2e4a71": "#1c2e49", "#4d6b98": "#1c2e49", "#728db8": "#3e5156", "#382540": "#24201d", "#593c64": "#382540", "#7b5b89": "#382540", "#9b7fab": "#3e5156"}};
  const RAMP = { senap: ['#694902', '#906f0f', '#b2921b', '#d8b25f'], rost: ['#521100', '#742a01', '#a14808', '#bd753e'], jord: ['#3f2415', '#5e3c24', '#7d5b40', '#987e62'], kol: ['#24201d', '#2f261d', '#372f25', '#474138'], oliv: ['#353204', '#4b4f00', '#647025', '#898b4c'], ...NY };
  const FARGER = [['gult', 'senap'], ['rött', 'rost'], ['brunt', 'jord'], ['svart', 'kol'], ['grönt', 'oliv'], ['blått', 'bla'], ['lila', 'lila']];
  // en kolonist i en tunika av färgen: huvudet, håret, tunikan i rampens toner (ljus åt vänster), benen och fötterna
  const FIG = ['....hhhh....', '...hhhhhh...', '...hsssss...', '...ssssss...', '....ssss....', '..TTttttTT..', '.TTtttttttT.', '.sTtttttttTs', '.sTtttttttTs', '..TttMtttT..', '..TtttttttT..', '..TtttttttT.', '...TttttT...', '...jj..jj...', '...jj..jj...', '...kk..kk...'];
  const HEX = { h: '#5e3c24', s: '#bd753e', j: '#3f2415', k: '#24201d' };
  VAL.push({ id: 'f13_farger', namn: 'Kläderna i sju färger', typ: 'janej', vad: 'Steg 13.3.2: kläderna kan färgas i sju färger. Fem har en ramp som redan finns (gult, rött, brunt, svart och grönt), och blått och lila får två nya dämpade ramper med samma ljushet i varje ton som de andra, så att paletten får 40 färger. Här står en kolonist i varje färg på gräset: överst på dagen, i mitten i skymningen och nederst på natten, med spelets mörker. Ser lila fult ut stryks den. Säg ja om färgerna får vara kvar, eller nej med en kommentar om vad som ska ändras.', versioner: [
    { text: 'Från vänster: gult, rött, brunt, svart, grönt, blått och lila. Dagen, skymningen och natten.', w: 7 * 16 + 8, h: 3 * 20 + 8, rita: (B, P) => {
      const cols = P.cols, idx = new Map(cols.map((c, i) => [c.hex, i]));
      const ix = hex => { if (!idx.has(hex)) { const rgb = hex2rgb(hex); cols.push({ hex, rgb, lab: rgb2lab(rgb) }); idx.set(hex, cols.length - 1); } return idx.get(hex); };
      const gras = '#647025';
      for (let rad = 0; rad < 3; rad++) {
        const m = h => rad === 0 ? h : rad === 1 ? MORK.skymn[h] ?? h : MORK.natt[h] ?? h;
        for (let y = 0; y < 20; y++) for (let x = 0; x < B.w; x++) B.satt(x, 4 + rad * 20 + y, ix(m(gras)));
        FARGER.forEach(([, r], n) => {
          const t = RAMP[r], pal = { ...HEX, t: r === 'kol' ? t[2] : t[2], T: r === 'kol' ? t[0] : t[1], M: t[3] };
          FIG.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.' && pal[ch]) B.satt(6 + n * 16 + x, 6 + rad * 20 + y, ix(m(pal[ch]))); }));
        });
      }
    } },
  ] });
})();

// fas 13: grafernas symbol (steg 13.10.15). Delen Graferna i stenen Byns tal lånade pilen för ökning. Visad som en knapp i panelen
(() => {
  const L = { k: 'ben1', r: 'rost1', R: 'rost2', j: 'jord1', J: 'jord2', d: 'kol0' };
  VAL.push({ id: 'f13_graf', namn: 'Grafernas symbol', typ: 'tre', slag: ['symbol'], vad: 'Steg 13.10.15: delen Graferna i stenen Byns tal visade pilen som betyder ökning. Den får en egen symbol. Bilden visar den som en knapp i panelen.', versioner: [
    symbolKnapp('En linje som stiger, faller och stiger igen, mellan två axlar.', [
      '................',
      '.k..............',
      '.k...........kk.',
      '.k..........krrk',
      '.k.........krrk.',
      '.k..kk....krrk..',
      '.k.krrk..krrk...',
      '.k.krrrkkrrk....',
      '.kkrrkrrrrk.....',
      '.krrk.krrk......',
      '.krk...kk.......',
      '.kk.............',
      '.k..............',
      '.kkkkkkkkkkkkkk.',
      '................',
      '................',
    ], L),
    symbolKnapp('En kurva på ett utrullat pergament.', [
      '................',
      '.ddddddddddddd..',
      'dJjjjjjjjjjjjjd.',
      'djddddddddddddd.',
      '.dJJJJJJJJJJJJd.',
      '.dJJJJJJJJJJRJd.',
      '.dJJJJJJJJJRRJd.',
      '.dJJJJJJJJJRJJd.',
      '.dJJJRRJJJRRJJd.',
      '.dJJRRRRJRRJJJd.',
      '.dJRRJJRRRJJJJd.',
      '.dJRJJJJJJJJJJd.',
      '.dddddddddddddjd',
      '.djjjjjjjjjjjjJd',
      '..ddddddddddddd.',
      '................',
    ], { ...L, j: 'jord2', J: 'jord3', R: 'rost1' }),
    symbolKnapp('En käpp med fyra skåror som växer åt höger, som man räknade med förr.', [
      '................',
      '................',
      '................',
      '................',
      '.dd.dd.dd.dd.dd.',
      'dJJdJJdJJ.JJ.JJd',
      'dJJJJJdJJdJJdJJd',
      'djjjjjjjjdjjdjjd',
      'djjjjjjjjdjjdjjd',
      'djjjjjjjjjjjdjjd',
      'djjjjjjjjjjjdjjd',
      '.dddddddddddddd.',
      '................',
      '................',
      '................',
      '................',
    ], { ...L, j: 'jord2', J: 'jord3' }),
  ] });
})();

// fas 13: hornet, järnpilarna, det syrade och torkade och plogen (steg 13.4.1, 13.4.2, 13.6.1, 13.6.2 och 13.7.2). Varje bild
// är former i ordning (den senare ovanpå), och det som ritats får en mörk kant.
(() => {
  // former: en lista av [(x, y) => sant inne, ton eller (x, y) => ton]
  const linje = (x0, y0, x1, y1, r) => (x, y) => { const dx = x1 - x0, dy = y1 - y0, t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(x - x0 - t * dx, y - y0 - t * dy) <= r; };
  const oval = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const ring = (cx, cy, rx, ry, b) => (x, y) => oval(cx, cy, rx, ry)(x, y) && !oval(cx, cy, rx - b, ry - b)(x, y);
  // en båge av punkter med en radie som går från r0 till r1
  const bage = (pkt, r0, r1) => (x, y) => { const n = 40; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t, [a, b, c] = pkt; const px = u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], py = u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]; if (Math.hypot(x - px, y - py) <= r0 + (r1 - r0) * t) return true; } return false; };
  const bild = (text, w, h, former, kant = 'kol0') => ({ text, w: w + 4, h: h + 4, rita: (B, P) => {
    const i = t => P.i(t.slice(0, -1), +t.slice(-1)), g = new Map(), nyckel = (x, y) => x + ',' + y;
    for (const [f, ton] of former) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (f(x, y)) { const c = typeof ton === 'function' ? ton(x, y) : ton; if (c) g.set(nyckel(x, y), c); else g.delete(nyckel(x, y)); }
    for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
      const c = g.get(nyckel(x, y));
      if (c) B.satt(x + 2, y + 2, i(c));
      else if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => g.has(nyckel(x + a, y + b)))) B.satt(x + 2, y + 2, i(kant));
    }
  } });
  const KORT = (id, namn, vad, versioner, slag = []) => VAL.push({ id, namn, typ: 'tre', slag, vad, versioner });
  // tonen efter var punkten ligger: ljuset uppe till vänster
  const lj = (a, b, c, k, m1, m2) => (x, y) => { const v = x * k + y; return v < m1 ? a : v < m2 ? b : c; };

  KORT('f13_dryckeshorn', 'Dryckeshornet', 'Steg 13.4.1: ett dryckeshorn skrapat ur ett djurhorn. Den som dricker öl, mjöd, cider eller vin dricker ur det. Ligger snett, med mynningen uppåt.', [
    bild('Ett böjt horn som det är, ljust vid mynningen och mörkt i spetsen.', 16, 16, [
      [bage([[12, 3], [12, 13], [2, 13]], 3, 0.7), (x, y) => x < 5 ? 'jord0' : x < 8 ? 'ben0' : x + y < 20 && y < 8 ? 'ben3' : x > 11 && y > 5 ? 'ben1' : 'ben2'],
      [oval(12, 3, 3, 1.4), 'jord0'], [oval(12, 2.6, 2, 0.6), 'kol1']]),
    bild('Ett nästan rakt horn med en bred kant av järn, ett järnband på mitten och en knopp i spetsen.', 18, 18, [
      [bage([[13, 4], [9, 9], [4, 14]], 3.2, 1.2), (x, y) => x - y > 1 && x + y < 19 ? 'jord3' : y - x > 2 ? 'jord1' : 'jord2'],
      [linje(11, 2, 16, 7, 1.3), 'skiffer2'], [linje(12, 1.6, 15.6, 5.2, 0.6), 'skiffer3'],
      [linje(6.5, 9.5, 9.5, 12.5, 0.7), 'skiffer1'], [oval(3, 15, 1.8, 1.8), 'skiffer2'], [oval(2.6, 14.6, 0.6, 0.6), 'skiffer3']]),
    bild('Ett kort, starkt böjt horn i en bärrem av läder, med skum i mynningen.', 18, 16, [
      [ring(9, 6, 7, 5.4, 1.1), 'jord1'],
      [bage([[14, 8], [10, 17], [3, 8]], 2.7, 0.8), (x, y) => x < 5 ? 'kol3' : x > 11 ? 'ben3' : y > 11 ? 'ben1' : 'ben2'],
      [oval(14, 7, 3, 1.5), 'ben3'], [oval(13, 6.4, 1.2, 0.8), 'ben2'], [linje(5, 8.6, 6.6, 12, 0.6), 'jord0'], [linje(11, 10, 12, 13, 0.6), 'jord0']]),
  ]);

  const PIL = (x0, y0, x1, y1, spets, lang = 4) => { const d = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / d, uy = (y1 - y0) / d; return [
    [linje(x0, y0, x1, y1, 0.55), 'jord2'],
    [linje(x0, y0, x0 + ux * 3.2, y0 + uy * 3.2, 1.3), spets === 'smal' ? 'ben2' : 'rost2'], [linje(x0, y0, x0 + ux * 3.2, y0 + uy * 3.2, 0.5), 'jord1'],
    [linje(x1 - ux * lang, y1 - uy * lang, x1 - ux * lang * 0.6, y1 - uy * lang * 0.6, spets === 'bred' ? 1.9 : 0.9), 'skiffer1'],
    [linje(x1 - ux * lang, y1 - uy * lang, x1, y1, spets === 'bred' ? 1 : 0.8), 'skiffer2'], [linje(x1 - ux * 2, y1 - uy * 2, x1, y1, 0.5), 'skiffer3']]; };
  KORT('f13_jarnpilar', 'Järnpilarna', 'Steg 13.4.2: pilar med spetsar av järn, som skadar mer än pilarna med flinta. Ligger snett, som det som hålls i handen.', [
    bild('En knippa av tre i solfjäder, med breda blad av ljust järn.', 22, 23, [...PIL(1, 15, 5, 1, 'bred'), ...PIL(6, 20, 21, 15, 'bred'), ...PIL(3, 18, 16, 5, 'bred')]),
    bild('En enda lång pil med en smal nål till spets, som går genom en brynja.', 18, 18, PIL(2, 16, 16, 2, 'smal', 6)),
    bild('Ett tätt knippe, ombundet med snöre, med spetsarna åt samma håll.', 18, 18, [
      ...PIL(1, 13, 11, 1, 'smal'), ...PIL(5, 17, 17, 6, 'smal'), ...PIL(3, 15, 15, 3, 'smal'), [linje(6.5, 8, 10.5, 12, 1), 'ben1'], [linje(6.5, 7.6, 10, 11.1, 0.5), 'ben3']]),
  ]);

  const STR = [[2, 8, 8, 5], [5, 10, 12, 8], [7, 5, 14, 8], [3, 10, 9, 8], [9, 10, 15, 10], [6, 7, 11, 5], [4, 6, 10, 10]];
  KORT('f13_surkal', 'Surkålen', 'Steg 13.6.2: strimlad kål som syrats i en stor lerkruka. Ett blekt gulgrönt, som skiljer den från den färska kålen.', [
    bild('En hög av strimlor, som de ligger på marken.', 18, 13, [
      [oval(8.5, 8.5, 7.5, 3.6), 'oliv2'], ...STR.map(([a, b, c, d], n) => [linje(a, b, c, d, 0.6), n % 3 === 0 ? 'ben3' : n % 2 ? 'senap3' : 'oliv3'])]),
    bild('En träskål med surkål upp över kanten.', 17, 14, [
      [oval(8, 8.5, 7.5, 4.8), (x, y) => y < 7 ? 'jord3' : y < 10 ? 'jord2' : 'jord1'],
      [oval(8, 6, 6.2, 2.6), 'jord0'], [oval(8, 5, 5.4, 2.8), 'oliv3'],
      [linje(4, 4.6, 12, 4.6, 0.5), 'senap3'], [linje(5, 6, 11, 6, 0.5), 'ben3'], [linje(6, 3, 10, 3, 0.5), 'ben3']]),
    bild('En öppen lerkruka, sedd snett uppifrån, med kålen under en tyngd av sten.', 15, 19, [
      [oval(7, 11, 6.6, 7), (x, y) => x < 4 ? 'rost3' : x > 10 ? 'rost1' : 'rost2'], [oval(7, 4, 5.2, 2.8), 'rost0'],
      [oval(7, 4.2, 4.2, 1.9), 'oliv3'], [oval(7, 3.6, 2.2, 1.4), 'skiffer2'], [linje(6, 3, 8, 3, 0.5), 'skiffer3']]),
  ]);

  KORT('f13_surfisk', 'Surfisken', 'Steg 13.6.2: fisk som syrats i en stor lerkruka. Blek och mjuk, till skillnad från den torkade fisken.', [
    bild('Två bleka fiskar bredvid varandra med huvudet kvar, skavfötters.', 20, 13, [
      [oval(8, 3.5, 6.5, 2.4), (x, y) => y < 3 ? 'ben3' : 'ben2'], [linje(14, 3.5, 17.5, 1.5, 0.9), 'ben1'], [linje(14, 3.5, 17.5, 5.5, 0.9), 'ben1'], [oval(3.2, 3, 0.6, 0.6), 'kol0'], [linje(5, 2, 5, 5, 0.5), 'ben0'],
      [oval(11, 9, 6.5, 2.4), (x, y) => y < 8.5 ? 'ben3' : 'ben2'], [linje(5, 9, 1.5, 7, 0.9), 'ben1'], [linje(5, 9, 1.5, 11, 0.9), 'ben1'], [oval(15.8, 8.5, 0.6, 0.6), 'kol0'], [linje(14, 7.5, 14, 10.5, 0.5), 'ben0']]),
    bild('Filéer i tre rullar, staplade, med rött i mitten.', 15, 14, [
      ...[[4, 10], [10.5, 10], [7.2, 4.4]].flatMap(([a, b]) => [[oval(a, b, 3.3, 3), (x, y) => x + y < a + b ? 'ben3' : 'ben2'], [oval(a, b, 2, 1.7), 'skiffer2'], [oval(a, b, 1.3, 1), 'rost3']])]),
    bild('En kluven fisk utbredd, med ryggraden synlig och saltet på.', 20, 14, [
      [oval(8, 3.6, 6.8, 2.8), 'ben3'], [oval(8, 9.4, 6.8, 2.8), 'ben2'], [oval(1.4, 6.5, 2.4, 1.8), 'ben1'], [oval(1.2, 6, 0.6, 0.5), 'kol0'], [linje(14, 6.5, 18, 2.8, 1), 'skiffer2'], [linje(14, 6.5, 18, 10.2, 1), 'skiffer2'], [linje(4, 6.5, 16, 6.5, 0.6), 'rost3'],
      ...[4, 7, 10, 13].flatMap(x => [[linje(x, 4.5, x + 1, 3, 0.4), 'ben0'], [linje(x, 8.5, x + 1, 10, 0.4), 'ben0']])]),
  ]);

  KORT('f13_torrsvamp', 'Den torkade svampen', 'Steg 13.6.1: svamp som torkat på torkställningen. Mörkare och skrynkligare än den färska.', [
    bild('Skivor trädda på ett snöre.', 20, 12, [
      [bage([[1, 2], [10, 13], [19, 2]], 0.5, 0.5), 'ben1'],
      ...[[4, 4.6], [8, 7.2], [12, 7.2], [16, 4.6]].flatMap(([a, b]) => [[oval(a, b, 1.8, 2.8), 'jord1'], [oval(a - 0.4, b - 0.6, 1, 1.8), 'ben1']])]),
    bild('En liten hög av hopkrympta hattar.', 16, 12, [
      ...[[4, 8.5], [11.5, 8.5], [7.8, 4.6]].flatMap(([a, b]) => [[oval(a, b, 3.7, 2.6), 'jord1'], [linje(a - 2, b - 0.6, a + 1, b - 1.4, 0.6), 'jord2'], [linje(a - 0.5, b + 1.2, a + 2, b + 0.6, 0.5), 'jord0']])]),
    bild('Två skivor rakt igenom, med hattens och fotens form kvar.', 20, 13, [
      ...[[5, 1], [14, 2]].flatMap(([a, b]) => [[oval(a, 4 + b, 4.4, 3.2), (x, y) => y > 5 + b ? null : 'jord1'], [linje(a, 5 + b, a, 10, 1.4), 'ben1'], [linje(a - 3, 4.6 + b, a + 3, 4.6 + b, 0.6), 'ben0'], [linje(a - 0.5, 6 + b, a - 0.5, 9, 0.5), 'ben2']])]),
  ]);

  KORT('f13_torrappel', 'De torkade äpplena', 'Steg 13.6.1: äpplen som skurits och torkat på torkställningen.', [
    bild('Ringar med hål, trädda på ett snöre.', 22, 13, [
      [bage([[1, 2], [11, 14], [21, 2]], 0.5, 0.5), 'ben1'],
      ...[[5, 5.6], [11, 8], [17, 5.6]].flatMap(([a, b]) => [[oval(a, b, 2.9, 3.3), 'rost1'], [oval(a, b, 2.1, 2.5), 'senap3'], [oval(a, b, 0.9, 1), 'jord1']])]),
    bild('En hög av klyftor med det röda skalet kvar.', 18, 13, [
      ...[[4.5, 9], [12.5, 9.4], [8.5, 4.6]].flatMap(([a, b], n) => [[oval(a, b, 4, 2.7), (x, y) => y > b + 0.8 ? 'rost1' : y < b - 1 ? 'senap3' : 'senap2'], [oval(a - 0.5, b - 0.6, 0.6, 0.5), 'jord1']])]),
    bild('Ringar staplade på en pinne, snett.', 18, 18, [
      [linje(1, 16, 16, 1, 0.7), 'jord2'],
      ...[4.5, 7.5, 10.5, 13].flatMap(t => [[linje(t - 2.4, 17 - t - 2.4, t + 2.4, 17 - t + 2.4, 0.9), 'senap2'], [linje(t - 2.4, 17 - t - 2.4, t - 1.2, 17 - t - 1.2, 0.9), 'senap3'], [oval(t + 2.4, 17 - t + 2.4, 0.8, 0.8), 'rost1']])]),
  ]);

  KORT('f13_torrrolleka', 'Den torkade röllekan', 'Steg 13.6.1: rölleka som torkat på torkställningen. Används som den färska till te, förband och salva.', [
    bild('En bukett upp och ner, hopbunden upptill som den hängt.', 14, 19, [
      [linje(7, 0, 7, 4, 0.9), 'oliv1'], [linje(7, 4, 2.5, 13, 0.9), 'oliv2'], [linje(7, 4, 11.5, 13, 0.9), 'oliv1'], [linje(7, 4, 7, 14, 0.9), 'oliv2'], [linje(5.5, 4.4, 8.5, 4.4, 0.9), 'ben2'],
      [oval(2.6, 14, 2.4, 1.9), 'ben1'], [oval(11.4, 14, 2.4, 1.9), 'ben0'], [oval(7, 16, 2.6, 2), 'ben1'], [linje(1.6, 13.4, 3, 13.4, 0.5), 'ben2'], [linje(6, 15.4, 8, 15.4, 0.5), 'ben2']]),
    bild('En smulad hög av blad och blomkorgar.', 18, 11, [
      [oval(8.5, 7.5, 8, 3), 'oliv1'], [oval(8, 5.5, 5, 3), 'oliv2'],
      ...[[3, 7], [7, 4], [11, 5.4], [14, 8], [9, 8], [5.6, 6]].map(([a, b], n) => [oval(a, b, 0.9, 0.8), n % 2 ? 'ben2' : 'ben1']), ...[[2, 9, 5, 8], [10, 9, 13, 8.4], [6, 8, 8, 6]].map(([a, b, c, d]) => [linje(a, b, c, d, 0.5), 'jord1'])]),
    bild('En lång kvist som ligger snett, med torkade blad och små blomkorgar i toppen.', 20, 18, [
      [linje(2, 16, 13, 6, 0.9), 'jord2'], ...[[5, 13, 1, 11], [5, 13, 8, 16], [9, 10, 5, 7], [9, 10, 12, 13]].map(([a, b, c, d]) => [linje(a, b, c, d, 1), 'oliv2']),
      [linje(13, 6, 11, 3, 0.6), 'jord2'], [linje(13, 6, 17, 8, 0.6), 'jord2'],
      ...[[10.5, 2.6], [14, 1.8], [17, 4], [17.5, 8], [13.8, 5]].flatMap(([a, b], n) => [[oval(a, b, 1.8, 1.5), n % 2 ? 'ben2' : 'ben1'], [oval(a - 0.4, b - 0.4, 0.7, 0.6), 'ben3']])]),
  ]);

  // plogen från sidan, dragen åt höger: oxen eller hästen går framför. Åt andra håll vrids den i spelet
  KORT('f13_plog', 'Plogen', 'Steg 13.7.2: plogen dras av oxen eller hästen och gräver upp fältet fortare än spaden. Bilden visar den när den dras åt höger, där djuret går; vänster hålls av den som plöjer.', [
    bild('En krokig årder av en enda böjd stock, med ett handtag bak och en spets av järn i jorden.', 42, 22, [
      [bage([[10, 15], [16, 4], [40, 8]], 1.6, 1.1), (x, y) => y < 9 ? 'jord3' : 'jord2'], [linje(3, 1, 11, 16, 1.2), 'jord2'], [linje(1, 2, 5, 1, 1), 'jord3'], [linje(9, 15, 20, 19, 1.9), 'jord1'], [linje(16, 17.6, 23, 20, 1.2), 'skiffer2'], [linje(17, 17, 22, 19, 0.5), 'skiffer3']]),
    bild('En tung plog med hjul fram, en rak ås och ett brett skär som vänder jorden.', 42, 24, [
      [linje(8, 10, 41, 10, 1.4), 'jord2'], [linje(8, 9, 41, 9, 0.5), 'jord3'], [linje(1, 2, 12, 15, 1.2), 'jord2'], [linje(5, 1, 14, 12, 1), 'jord3'],
      [(x, y) => y >= 12 && y <= 20 && x >= 11 && x <= 24 - (y - 12) * 0.2 && x >= 11 + (20 - y) * 0.3, (x, y) => y < 14 ? 'jord2' : 'jord1'], [linje(14, 20, 25, 20, 1.2), 'skiffer2'], [linje(23, 11, 25, 18, 0.9), 'skiffer1'],
      [oval(33, 15, 5.8, 5.8), 'jord1'], [oval(33, 15, 4, 4), null], [linje(33, 10, 33, 20, 0.7), 'jord2'], [linje(28, 15, 38, 15, 0.7), 'jord2'], [oval(33, 15, 1.3, 1.3), 'kol1'], [linje(32, 7, 36, 10, 0.8), 'jord2']]),
    bild('En lätt plog sedd snett uppifrån: två skaklar som djuret går mellan, en krok på tvären och två handtag.', 42, 22, [
      [linje(18, 5, 41, 3, 0.9), 'jord3'], [linje(18, 16, 41, 18, 0.9), 'jord2'], [linje(18, 4, 18, 17, 1.4), 'jord1'], [linje(18, 10.5, 8, 10.5, 1.5), 'jord2'],
      [linje(1, 5, 9, 9, 1), 'jord3'], [linje(1, 16, 9, 12, 1), 'jord2'], [(x, y) => x >= 10 && x <= 17 && Math.abs(y - 10.5) <= (x - 9) * 0.5, 'skiffer1'], [linje(11, 10, 17, 10, 0.5), 'skiffer3'], [linje(17, 8, 17, 13, 0.5), 'skiffer2']]),
  ]);
  // ciderns färg (steg 13.4.1): den färdiga cidern i den godkända krukan med öl, med vätskans yta i cidernas färg
  const CIDER = (ton, ljus, text) => bild(text, 14, 15, [
    [oval(7, 8, 6.6, 6.8), (x, y) => x < 4 ? 'rost3' : x > 10 ? 'rost1' : 'rost2'], [oval(7, 3, 5, 2.6), 'rost0'], [oval(7, 3.4, 4, 1.7), ton], [linje(5, 3, 8, 3, 0.5), ljus]]);
  VAL.push({ id: 'f13_cider', namn: 'Ciderns färg', typ: 'janej', slag: [], vad: 'Steg 13.4.1: cidern är gulgrön, ljusare och grönare än ölet, så att de skiljs åt i krukor och horn.', versioner: [CIDER('oliv3', 'senap3', 'Den stora lerkrukan snett uppifrån med cidern, i den gröna ton som spelet redan använder.')] });

  // spjälan (steg B.36): benet stort till vänster och kolonisten i kartans storlek till höger, med spjälan på samma ben
  const FIGUR = [[oval(34, 7, 3.2, 3.4), 'rost3'], [oval(34, 5.2, 3.4, 2.4), 'jord1'], [(x, y) => x >= 30 && x <= 38 && y >= 11 && y <= 18, (x, y) => x < 32 ? 'ben0' : 'ben1'], [linje(29.4, 12, 29.4, 18, 0.7), 'rost3'], [linje(38.6, 12, 38.6, 18, 0.7), 'rost3'], [linje(32, 19, 32, 25, 0.9), 'jord0'], [linje(36, 19, 36, 25, 0.9), 'jord0']];
  const BEN = [[linje(9, 1, 9, 24, 3.6), 'rost3'], [linje(7, 1, 7, 24, 0.8), 'rost2'], [oval(11, 26, 5, 2.2), 'jord0']];
  KORT('f13_spjala', 'Spjälan', 'Steg B.36: spjälan på ett brutet ben eller en bruten arm, av två grenar och en remsa. Den ritas på delen på kartan så länge den sitter på.', [
    bild('Två raka pinnar, en på var sida, och tre lindor av remsan.', 44, 30, [...BEN, ...FIGUR,
      [linje(4.5, 4, 4.5, 23, 1), 'jord2'], [linje(13.5, 4, 13.5, 23, 1), 'jord2'], ...[7, 13, 20].flatMap(y => [[linje(4, y, 14, y, 1), 'ben3'], [linje(5, y + 1.4, 13, y + 1.4, 0.4), 'ben1']]),
      [linje(38, 19, 38, 25, 0.5), 'jord3'], [linje(34.6, 19, 34.6, 25, 0.5), 'jord3'], [linje(34.6, 22, 38, 22, 0.5), 'ben3']]),
    bild('Grenarna tätt lindade med remsan ända från foten till knäet; bara ändarna sticker ut.', 44, 30, [...BEN, ...FIGUR,
      [linje(4.5, 2, 4.5, 25, 0.9), 'jord2'], [linje(13.5, 2, 13.5, 25, 0.9), 'jord2'], [(x, y) => x >= 4 && x <= 14 && y >= 6 && y <= 21, (x, y) => (x + y * 2) % 5 < 1 ? 'ben0' : (x + y * 2) % 5 < 3 ? 'ben2' : 'ben3'],
      [(x, y) => x >= 35 && x <= 37 && y >= 20 && y <= 24, (_x, y) => y % 2 ? 'ben3' : 'ben2'], [linje(36, 18.6, 36, 19, 0.4), 'jord3']]),
    bild('Ett galler av kluvna grenar runt hela benet, knutet i kors mitt på.', 44, 30, [...BEN, ...FIGUR,
      ...[4.5, 7.5, 10.5, 13.5].map((x, i) => [linje(x, 4, x, 22, 0.9), i % 2 ? 'jord3' : 'jord2']), [linje(4, 9, 14, 17, 0.8), 'ben3'], [linje(14, 9, 4, 17, 0.8), 'ben3'], [oval(9, 13, 1.6, 1.6), 'ben2'],
      [linje(35, 19, 35, 25, 0.4), 'jord3'], [linje(37, 19, 37, 25, 0.4), 'jord2'], [linje(35, 21, 37, 23, 0.4), 'ben3'], [linje(37, 21, 35, 23, 0.4), 'ben3']]),
  ]);
})();
