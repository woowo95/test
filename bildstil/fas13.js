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
    symbolKnapp('Tre staplar på en linje, låg, högre och högst.', [
      '................',
      '............kkkk',
      '............kRrk',
      '............kRrk',
      '.......kkkk.kRrk',
      '.......kRrk.kRrk',
      '.......kRrk.kRrk',
      '..kkkk.kRrk.kRrk',
      '..kRrk.kRrk.kRrk',
      '..kRrk.kRrk.kRrk',
      '..kRrk.kRrk.kRrk',
      '.kkkkkkkkkkkkkkk',
      '................',
      '',
      '',
      '',
    ], L),
    symbolKnapp('En karvstock: en trästav med skåror av olika djup, som man räknade med förr.', [
      '',
      '',
      '',
      '.ddddddddddddddd',
      'dJJJdJJdddJddddd',
      'dJJJdJJJdJJJddJd',
      'dJJJdJJJdJJJddJd',
      'dJJJdJJJdJJJddJd',
      'djjjjjjjjjjjddjd',
      'djjjjjjjjjjjjjjd',
      'djjjjjjjjjjjjjjd',
      '.dddddddddddddd.',
      '',
      '',
      '',
      '',
    ], { ...L, j: 'jord2', J: 'jord3' }),
  ] });
})();
