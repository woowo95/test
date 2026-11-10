// fas 9, system 9.8: kläderna av ylle (steg 9.8.13–9.8.15 i Färdplanen: kappan, sjalen, manteln, tunikan och skjortan av ylle), tre versioner var. Ritade på bybon som i 7.7b-lin.js; bredvid står samma plagg av lin (eller tunikan av lin, där lin saknar plagget) som jämförelse. En av versionerna är linets plagg i yllets färger.
(() => {
  const { KORT, MED_KONTUR, lagg, bredd, hash } = window.F7;
  const L0 = window.F98.L;
  const S = 'Steg ';
  const farg = (B, t) => B.P.i(t.slice(0, -1), +t.slice(-1));
  // linet (som 7.7b): ljust grått; ylle: varm grågrå brun (obleckt) eller ljus, ostrukturerad off-white
  const LIN = { ...L0, W: 'ben3', w: 'ben2', v: 'ben1', j: 'jord2', k: 'jord1', r: 'rost2', q: 'rost1' };
  const YB = { ...L0, W: 'jord3', w: 'jord2', v: 'jord1', V: 'jord0', c: 'ben3', j: 'jord1', k: 'jord0', y: 'senap2', r: 'rost2', q: 'rost1' };
  const YV = { ...L0, W: 'ben3', w: 'ben2', v: 'ben1', V: 'jord2', c: 'senap3', j: 'jord1', k: 'jord0', y: 'senap2', r: 'rost2', q: 'rost1' };
  const YG = { ...L0, W: 'skiffer3', w: 'skiffer2', v: 'skiffer1', V: 'skiffer0', c: 'ben3', j: 'jord1', k: 'kol1', y: 'senap2', r: 'rost2', q: 'rost1' };

  const RAD = (text, delar, m = 4, mellan = 6) => {
    const matt = delar.map(d => [bredd(d.r), d.r.length]);
    const w = matt.reduce((s, [a]) => s + a, 0) + mellan * (delar.length - 1) + m * 2, h = Math.max(...matt.map(([, b]) => b)) + m * 2 + 1;
    return { text, w, h, rita: B => { let x = m; delar.forEach((d, i) => { const [dw, dh] = matt[i], y = h - m - 1 - dh; if (d.figur) d.figur(B, x, y, d.lg); else lagg(B, d.r, d.lg, x, y); x += dw + mellan; }); } };
  };
  const FIGUR = (over) => ({ r: Array(20).fill('.'.repeat(14)), figur: (B, x0, y0, Lg) => {
    if (!window.BYBO) return;
    const F = window.BYBO(17, 'fram', 'sta', 'hanga', null);
    for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) { const c = F.px[y * F.w + x]; if (c >= 0) B.satt(x0 + x, y0 + y, c); }
    over.forEach((r, i) => [...r].forEach((ch, x) => { if (ch === '.') return; const t = ch === 'o' ? 'kol0' : Lg[ch]; if (t) B.satt(x0 + x, y0 + 7 + i, farg(B, t)); }));
    for (let x = 3; x < 11; x++) B.morka(x0 + x, y0 + 20);
  }, lg: null });
  // texturen: ylle har en grövre, ojämn yta; ströpunkter av en ljusare ton i kroppens fält
  const grov = (rader, ton = 'c', tat = 0.1, seed = 1) => rader.map((r, y) => [...r].map((ch, x) => (ch === 'W' || ch === 'w') && hash(x, y, seed) < tat ? ton : ch).join(''));
  const SAK = (r, lg) => ({ r, lg });
  const PL = (text, sak, over, lg, linSak, linOver) => RAD(text, [SAK(sak, lg), { ...FIGUR(over), lg }, SAK(linSak, LIN), { ...FIGUR(linOver), lg: LIN }]);

  // ---- linets tunika och skjorta (kopierade från 7.7b för jämförelsen) ----
  const linTunika = [MED_KONTUR(['WWW...wwv', 'WWWW.wwwv', 'WWWWwwwvv', '.WWWwwwv.', '.kjjjjjk.', '.WWWwwwv.', '.WWwwwvv.', 'WWWwwwwvv', 'WWwwwwvvv']),
    ['..WWWW..wwwv..', '..WWWWW.wwwv..', '..W.WWWwwv.v..', '....WWWwwv....', '....kjjjjk....', '....WWwwwv....', '....WWwwwv....', '...WWWwwwvv...', '..oWWWwwwvvo..', '..oWwwwwvvvo..', '..oooooooooo..']];
  const linSkjorta = [MED_KONTUR(['WWW..wwwv', 'WWWWkwwvv', '.WWWkwwv.', '.WWWwwwv.', '.WWWwwwv.', '.WWwwwvv.']),
    ['..WWWWk.wwwv..', '..WWWWWkwwwv..', '..W.WWWwwv.v..', '....WWWwwv....', '..............', '....WWwwwv....', '....WWwwwv....', '....Wwwwvv....']];

  // ---- kappan: ett långt yttre plagg ner till vaderna, med knäppe vid halsen ----
  const kappa = [
    [MED_KONTUR(['.WWWWWwwv.', 'WWWWWWwwvv', 'WWWWyWwwvv', 'WWWWWWwwvv', 'WWWWWWwwvv', 'WWWWWWwwvv', 'WWWWWWwwvv', 'WWWWWWwwvv', 'WWWWWWwwvv', 'vvvvvvvvvv']),
      ['..WWWWwwwv....', '.WWWWWwwwvv...', 'WWWWyWwwwvvv..', 'WWWWWWwwwvvv..', 'WWWWWWwwwvvv..', 'WWWWWWwwwvvv..', 'WWWWWWwwwvvv..', 'WWWWWWwwwvvv..', 'WWWWWWwwwvvv..', 'WWWWWWwwwvvv..', 'WWWWWWwwwvvv..', 'oVVVVVVVVVVVo.'].map(r => r.padEnd(14, '.')), YB],
    [MED_KONTUR(['..WWWw..', '.WWWWwww', 'WWWWWwwv', 'WWWWWwwv', 'WWWWWwwv', 'WWWWWwwv', 'WWWWWwwv', 'WWWWWwwv', 'WWWWWwwv', 'rrrrrrrr']),
      ['..WWWWwwwv....', '.WWWWWwwwv....', '.WWWW.wwwv....', '.WWWW.wwwv....', '.WWWWkwwwv....', '.WWWWkwwwv....', '.WWWWkwwwv....', '.WWWWkwwwv....', '.WWWWkwwwv....', '.WWWWkwwwv....', '.WWWW.wwwv....', '.rrrrrqqqqq...'].map(r => r.padEnd(14, '.')), YV],
    [MED_KONTUR(['.WWWwwv.', 'WWWWwwwv', 'WWWWwwvv', 'WWWWwwvv', 'WWWWwwvv', 'WWWWwwvv', 'WWWWwwvv', 'WWWWwwvv', 'vvvvvvvv']),
      ['...WWWwwv....', '..WWWWwwwv...', '.WWWWWwwwvv..', '.WWWWWwwwvv..', '.WWWWWwwwvv..', '.WWWWWwwwvv..', '.WWWWWwwwvv..', '.WWWWWwwwvv..', '.WWWWWwwwvv..', '.WWWWWwwwvv..', '.WWWWWwwwvv..', 'oVVVVVVVVVVVo.'].map(r => r.padEnd(14, '.')), YG],
  ];
  // ---- sjalen: över axlarna, hänger framför bröstet ----
  const sjal = [
    [MED_KONTUR(['WWwwwwWW', 'WWwwwwvv', 'WWWwwvvv', '.WWwvvv.', '..Wwvv..', '...wv...']),
      ['.WWWWWwwwwWW.', 'WWWWWWwwwwvvv.', '.WWWWWwwwvvv..', '..WWWWwwvvv...', '...WWWwwvv....', '....WWwvv.....'].map(r => r.padEnd(14, '.')), YB],
    [MED_KONTUR(['rrrrrrrr', 'WWwwwwvv', 'WWwwwwvv', '.WWwwvv.', '..Wwvv..', 'qqqqqqqq']),
      ['..rrrrrrrrrr..', '.WWWWwwwwvvv..', '.WWWWwwwwvvv..', '..WWWwwwvvv...', '...WWwwwvv....', '...qqqqqqq....'].map(r => r.padEnd(14, '.')), YV],
    [MED_KONTUR(['.WWWWwww.', 'WWWWwwwvv', '.WWWwwvv.', '..WWwvv..', '...Wvv...', '....v....']),
      ['...WWWwwww...', '.WWWWWwwwwvv..', '.WWWWwwwwvvv..', '..WWWwwwvvv...', '....WWwvv.....', '.....WvV......'].map(r => r.padEnd(14, '.')), YG],
  ];
  // ---- manteln: ledarens mantel, tung och lång, med en bård och spänne på ena axeln ----
  const mantel = [
    [MED_KONTUR(['..WWWwwvv.', '.WWWWwwwvv', 'WWWWWwwwvv', 'WWWWWwwwvv', 'WWWWWwwwvv', 'WWWWWwwwvv', 'WWWWWwwwvv', 'rqrqrqrqrq']),
      ['..yWWWwwwv....', '.WWWWWwwwvv...', '.WWWWWwwwvvv..', 'WWWWWWwwwvvv..', 'WWWWWWwwwvvv..', 'WWWWWWwwwvvv..', 'WWWWWWwwwvvv..', 'WWWWWWwwwvvv..', 'WWWWWWwwwvvv..', 'WWWWWWwwwvvv..', 'WWWWWWwwwvvv..', 'rqrqrqrqrqrqr.'].map(r => r.padEnd(14, '.')), YB],
    [MED_KONTUR(['.WWWWWWWv.', 'WWWWWWwwvv', 'WWWWWwwwvv', 'WWWWWwwwvv', 'WWWWWwwwvv', 'WWWWWwwwvv', 'WWWWWwwwvv', 'WWWWWwwwvv', 'rrrrrrrrrr']),
      ['..yWWWWWWv....', '.WWWWWWwwwv...', 'WWWWWWWwwwvv..', 'WWWWWWWwwwvv..', 'WWWWWWWwwwvv..', 'WWWWWWWwwwvv..', 'WWWWWWWwwwvv..', 'WWWWWWWwwwvv..', 'WWWWWWWwwwvv..', 'WWWWWWWwwwvv..', 'WWWWWWWwwwvv..', 'rrrrrrrrrrrrr.'].map(r => r.padEnd(14, '.')), YV],
    [MED_KONTUR(['kkkkkkkkk', 'WWWWwwwvv', 'WWWWwwwvv', 'WWWWwwwvv', 'WWWWwwwvv', 'WWWWwwwvv', 'vvvvvvvvv']),
      ['..kkkkkkkkk...', '.WWWWWwwwwvv..', '.WWWWWwwwwvv..', '.WWWWWwwwwvv..', '.WWWWWwwwwvv..', '.WWWWWwwwwvv..', '.WWWWWwwwwvv..', '.WWWWWwwwwvv..', '.WWWWWwwwwvv..', '.WWWWWwwwwvv..', '.WWWWWwwwwvv..', 'oVVVVVVVVVVVo.'].map(r => r.padEnd(14, '.')), YG],
  ];
  // ---- tunikan av ylle: första versionen är linets tunika i yllets färger ----
  const tunika = [
    [linTunika[0], linTunika[1], YB],
    [MED_KONTUR(['..WWW.wwv..', '.WWWWWwwwv.', 'WWWWWWwwwvv', 'WW.WWWwwv.v', 'W..WWwwwv.v', 'W..WWwwwv.v', '...WWwwvv..', '..WWwwwvvv.', '..VVVVVVVV.']),
      ['..WWWW..wwwv..', '..WWWWWwwwvv..', '..W.WWWwwv.v..', '..W.WWWwwv.v..', '..W.WWwwwv.v..', '..W.WWwwwv.v..', '....WWwwwv....', '...WWWwwwvv...', '..oWWWwwwvvo..', '..oVVVVVVVVo..', '..oooooooooo..'], YB],
    [MED_KONTUR(['.WWW.wwv.', '.WWWwwwv.', '.WWWwwwv.', '.WWWwwwv.', '.WWWwvwv.', '.WWwwvwv.', '.WWwwwvv.', 'WWWwwwvvv', 'WWWwwwvvv', 'WW.wwwv.v']),
      ['...WWW..wwv...', '...WWWWwwwv...', '....WWWwwv....', '....WWWwwv....', '....WWwvwv....', '....WWwvwv....', '....WWwvwv....', '...WWWwvwvv...', '..oWWWwwwvvo..', '..oWWwwwvvvo..', '..ooWwwwvvoo..', '..oooooooooo..'], YV],
  ];
  // ---- skjortan av ylle ----
  const skjorta = [
    [linSkjorta[0], linSkjorta[1], YB],
    [MED_KONTUR(['.WW..wv.', '.WWkkwv.', '.WWWkwv.', '.WWkwwv.', '.WWWkwv.', '.WWwwwv.', '.WWwwvv.']),
      ['...WWk.wwv....', '...WWWkwwwv...', '....WWkwv.....', '....WWkwv.....', '....WWwwv.....', '....WWwwv.....', '....WWwwv.....', '....WWwvv.....'], YV],
    [MED_KONTUR(['rrrrrrrrrrr', 'WWWWWwwwwvv', 'WWWWWwwwwvv', 'WW.WWwwv.vv', '...WWwwv...', '...WWwwv...', '...WWwvv...']),
      ['..rrrr..rrrr..', '..WWWWWwwwwv..', '.WWW.WWwv.vvv.', '.WW..WWwv..vv.', '.....WWwv.....', '.....WWwv.....', '.....WWwv.....', '.....WWvv.....'], YG],
  ];
  const G = (rows, cols = 14) => rows.map(r => r.padEnd(cols, '.'));
  const mk = (d, lin) => PL('', d[0], G(d[1]), d[2], lin[0], G(lin[1]));
  // jämförelsen för plagg som lin saknar: linets tunika
  const jam = linTunika;
  const t = (text, d, lin) => { const k = RAD(text, [SAK(d[0], d[2]), { ...FIGUR(G(d[1])), lg: d[2] }, SAK(lin[0], LIN), { ...FIGUR(G(lin[1])), lg: LIN }]); return k; };

  VAL.push(
    KORT('f9_kappa', 'Kappa av ylle', S + '9.8.15: kappan, sydd av ylle: ett långt yttre lager över kroppen, den varmaste klädnaden. Bilden visar den som sak och på en människa på kartan framifrån, och till höger linets tunika som jämförelse.', [
      t('Brungrå, rak, med en knäppe av senap vid halsen.', kappa[0], jam),
      t('Ljus, med en tvärgående söm och en röd bård nertill.', kappa[1], jam),
      t('Grå, smalare, med en mörk fåll.', kappa[2], jam)]),
    KORT('f9_sjal', 'Sjal av ylle', S + '9.8.15: sjalen, sydd av ylle: en ny plats (axlarna), ett tyg som läggs över axlarna och hänger ner framför bröstet. Bilden visar den som sak och på en människa på kartan, och linets tunika som jämförelse.', [
      t('Brun, spetsig nertill, över bägge axlarna.', sjal[0], jam),
      t('Ljus, med röd bård upptill och nertill.', sjal[1], jam),
      t('Grå, mjukt rundad.', sjal[2], jam)]),
    KORT('f9_mantel', 'Mantel av ylle', S + '9.8.15: ledarens mantel av ylle (förut bara skinn): tung och lång, med en bård och ett spänne vid axeln. Bilden visar den som sak och på en människa på kartan, och linets tunika som jämförelse.', [
      t('Brungrå, med röd-och-rost bård nertill och ett spänne på ena axeln.', mantel[0], jam),
      t('Ljus, bredare och med ett helrött band nertill.', mantel[1], jam),
      t('Grå, med en mörk kant upptill och nertill.', mantel[2], jam)]),
    KORT('f9_tunika_ylle', 'Tunika av ylle', S + '9.8.14: tunikan sydd av ylle i stället för lin; varmare men grövre. Bilden visar yllet som sak och på en människa framifrån, och samma tunika av lin bredvid. Första versionen är linets tunika i yllets färger.', [
      t('Linets tunika, men av brungrått ylle.', tunika[0], linTunika),
      t('Långa ärmar och en mörk fåll nertill, av brungrått ylle.', tunika[1], linTunika),
      t('Utan ärmar, längre, av ljust ylle.', tunika[2], linTunika)]),
    KORT('f9_skjorta_ylle', 'Skjorta av ylle', S + '9.8.14: skjortan sydd av ylle i stället för lin. Bilden visar yllet som sak och på en människa framifrån, och samma skjorta av lin bredvid. Första versionen är linets skjorta i yllets färger.', [
      t('Linets skjorta, men av brungrått ylle.', skjorta[0], linSkjorta),
      t('Ljus, utan ärmar, med en snörning i bröstet.', skjorta[1], linSkjorta),
      t('Grå, med breda ärmar och en röd rand över axlarna.', skjorta[2], linSkjorta)]),
  );
})();
