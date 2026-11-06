// 7.6: örtköket (7.6.1), röllekan (7.6.3) och det som görs i örtköket: salva (7.6.4), tjära (7.6.5), benlim och tvål
// (7.6.6). Tre versioner av varje, i paletten och 16 punkter per ruta. Örtköket ritas som de godkända stationerna:
// framifrån och lite ovanifrån, på gräset, med skugga under.
(() => {
  const { hash, KORT, former, ell, linje, och, utan, punkt, rakt, lagg, PA_MARK, bildfil, gras } = window.F7;
  // en bokstav per ramp och ton (0 mörkast, 3 ljusast); 'o' är konturen
  const L = {
    a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3', e: 'senap0', f: 'senap1', g: 'senap2', h: 'senap3',
    r: 'rost0', s: 'rost1', t: 'rost2', u: 'rost3', v: 'ben0', w: 'ben1', x: 'ben2', y: 'ben3',
    K: 'kol1', l: 'kol2', m: 'kol3', Q: 'skiffer0', R: 'skiffer1', S: 'skiffer2', T: 'skiffer3',
    i: 'oliv0', j: 'oliv1', n: 'oliv2', p: 'oliv3', A: 'barr0', C: 'barr1', D: 'barr2', E: 'barr3',
  };
  const sp = (B, rader, x, y, skugga = true) => lagg(B, rader, L, x, y, skugga);
  const fx = Math.floor;
  const S = 'Steg ';
  function MED(rader) { // en liten handritad sak med kontur
    const w = Math.max(...rader.map(r => r.length));
    return former(w + 2, rader.length + 2, [[(x, y) => (rader[fx(y) - 1] || '')[fx(x) - 1] > '.', (x, y) => rader[fx(y) - 1][fx(x) - 1]]]);
  }
  // en liten låga med foten i (x, y), som i fas6.js
  function laga(B, x, y, hojd = 5) {
    for (let i = 0; i < hojd; i++) {
      const [ramp, ton] = i === 0 ? ['ben', 3] : i < hojd - 2 ? ['senap', 3 - (i > 2)] : ['rost', 2];
      B.satt(x, y - i, B.P.i(ramp, ton), true);
      if (i > 0 && i < hojd - 2) B.satt(x + (i % 2 ? -1 : 1), y - i, B.P.i('senap', 2), true);
    }
  }
  const anga = (B, x, y, s) => { for (let i = 0; i < 6; i++) if (hash(i, s, 5) > 0.3) B.satt(x + Math.round(Math.sin(i / 1.6 + s)), y - i, B.P.i('ben', i < 3 ? 2 : 1)); };

  // ---------- delarna ----------
  const rasten = (w, h, s = 0) => former(w + 2, h + 2, [[ell(1 + w / 2, 1 + h / 2, w / 2, h / 2), (x, y) => {
    const u = (x - 1) / w * 0.7 + (y - 1) / h; if (hash(fx(x), fx(y), s) < 0.07) return 'R';
    return u < 0.5 ? 'T' : u < 1.0 ? 'S' : u < 1.35 ? 'R' : 'Q';
  }]]);
  // en lerkruka: rund buk, smal hals och en mörk öppning
  const KRUKA = MED([
    '.uuuu.',
    '.rrrr.',
    '.tsss.',
    'ttssss',
    'ttsssr',
    'tssssr',
    '.ssrr.',
  ]);
  // en gryta av täljsten med ett handtag av rep
  const GRYTA = MED([
    'w......w',
    '.w....w.',
    '..wwww..',
    'TSSSSSSR',
    'SKKlKKKR',
    'SSSSSSRR',
    '.SSSSRR.',
    '..RRRR..',
  ]);
  // en träskål sedd snett ovanifrån, med innehåll i färgen inne
  const skal = (inne, ton2 = inne) => MED([
    '.dddddd.',
    'd' + inne + inne + ton2 + inne + inne + ton2 + 'c',
    'cddddddb',
    '.cccccb.',
    '..bbbb..',
  ]);
  // ett knippe örter som hänger med stjälkarna uppåt, bundet med rep
  const KNIPPE_H = MED([
    '.jj.',
    '.ww.',
    'jnnj',
    'npnn',
    'nnpj',
    'jnnj',
    '.jn.',
  ]);
  // ett knippe örter som ligger
  const KNIPPE_L = MED([
    '....npn.',
    'jjwwnnpn',
    'jjwwnpnj',
    '....jnj.',
  ]);
  // en mortel av sten med en stöt
  const MORTEL = MED([
    '.....d',
    '....d.',
    'TTTcTT',
    'SllcRR',
    'SSSSRR',
    '.SSRR.',
  ]);
  // en bänk: en planka på två ben, som slöjdbänken
  const bank = (len, hojd = 4, s = 0) => former(len + 2, hojd + 6, [
    [rakt(1, 1, len + 1, 3), (x, y) => hash(fx(x / 3), fx(y), s) < 0.25 ? 'c' : 'd'],
    [rakt(1, 3, len + 1, 4), 'b'],
    [och(rakt(2, 4, 4, 5 + hojd), rakt(len - 2, 4, len, 5 + hojd)), (x) => fx(x) % 2 ? 'a' : 'b'],
  ]);

  // ---------- 7.6.1 örtköket ----------
  function ortkok(B, v) {
    gras(B);
    if (v === 0) { // den lilla elden i stenringen med en lerkruka i, och en bänk med örter och skålar
      bildfil(B, 'lagereld_lite', 0, 8);
      sp(B, MED(['.uuu.', '.rrr.', 'tsssr', 'tsssr', '.ssr.']), 10, 14, false); anga(B, 13, 13, 1);
      sp(B, bank(20, 4, 2), 24, 14);
      sp(B, KNIPPE_L, 25, 11, false); sp(B, skal('p', 'n'), 34, 11, false); sp(B, skal('g', 'f'), 34, 7, false);
      sp(B, MED(['jnj', 'npn', '.j.']), 41, 12, false);
    } else if (v === 1) { // en låg härd av fyra stenar med krukan ovanpå och elden i öppningen; en ställning med örter som torkar
      const ram = former(18, 20, [ // två stolpar och en tvärslå
        [och(rakt(2, 2, 4, 19), rakt(14, 2, 16, 19)), (x) => fx(x) % 2 ? 'b' : 'c'],
        [rakt(1, 2, 17, 4), (x, y) => y < 3 ? 'd' : 'c'],
      ]);
      sp(B, ram, 1, 6);
      for (const [x, s] of [[5, 0], [9, 1], [12, 2]]) sp(B, KNIPPE_H, x - 1, 10 + s % 2, false);
      sp(B, rasten(6, 6, 2), 24, 16); sp(B, rasten(6, 6, 3), 36, 16); // sidostenarna
      for (let y = 18; y < 23; y++) for (let x = 31; x < 37; x++) B.satt(x, y, B.P.i('kol', 1));
      laga(B, 33, 22, 4); laga(B, 35, 22, 3); B.satt(32, 22, B.P.i('rost', 2), true); B.satt(34, 22, B.P.i('senap', 3), true);
      sp(B, former(20, 6, [[rakt(1, 1, 19, 5), (x, y) => y < 2.6 ? 'T' : x > 17 ? 'R' : 'S']]), 24, 13, false); // hällen ovanpå
      sp(B, KRUKA, 30, 5, false); anga(B, 33, 4, 2);
      sp(B, skal('p'), 18, 25); sp(B, skal('l', 'K'), 38, 26);
    } else { // fyra stora stenar kring elden, en gryta som hänger i en trefot av störar, och ett bord med mortel och örter
      sp(B, bank(22, 3, 5), 24, 8);
      sp(B, MORTEL, 27, 4, false); sp(B, KNIPPE_L, 35, 5, false); sp(B, skal('p', 'n'), 43, 5, false);
      const cx = 13, fot = 26;
      for (let y = fot - 3; y <= fot; y++) for (let x = cx - 4; x <= cx + 4; x++) B.satt(x, y, B.P.i('kol', hash(x, y, 4) < 0.3 ? 2 : 1));
      laga(B, cx - 2, fot - 1, 4); laga(B, cx + 2, fot - 1, 4); laga(B, cx, fot - 1, 5);
      sp(B, former(24, 24, [ // trefoten: tre störar som möts över elden
        [linje([[2, 22], [11.5, 2]], 0.6), 'b'], [linje([[21, 22], [11.5, 2]], 0.6), 'c'], [linje([[13.5, 21], [11.5, 2]], 0.5), 'b'],
        [rakt(11, 1, 13, 3), 'w'],
      ]), cx - 12, fot - 22, false);
      for (let y = fot - 19; y < fot - 13; y++) B.satt(cx, y, B.P.i('ben', 1));
      sp(B, GRYTA, cx - 5, fot - 15, false);
      sp(B, rasten(5, 4, 1), cx - 9, fot - 4); sp(B, rasten(5, 4, 2), cx + 3, fot - 4);
      sp(B, rasten(5, 4, 3), cx - 5, fot - 1); sp(B, rasten(5, 4, 5), cx - 1, fot);
    }
  }
  const ORTKOK = (text, v) => ({ text, w: 48, h: 32, rita: (B) => ortkok(B, v) });

  // ---------- 7.6.3 röllekan ----------
  // som sak: ett knippe; vild: plantor i skogsbrynet, granarna överst
  const ROLL_SAK = [
    MED([ // ett knippe som står, med platta vita blomkorgar överst, bundet med rep
      '.yxy.yy..',
      'yxxvyxxv.',
      '.vC.vCyy.',
      '..CDCxxv.',
      '.DCDCvC..',
      'DECCDCD..',
      '..wwww...',
      '..CCCC...',
      '..CC.C...',
    ]),
    MED([ // ett knippe som ligger, blommorna åt höger
      '.........yxy',
      '.....D..yxxv',
      'CCwwCCDCCvv.',
      'CCwwCDCCCyxy',
      'CCwwCCDCyxxv',
      '......D..vv.',
    ]),
    MED([ // en enda stjälk med en stor blomkorg och fjäderlika blad
      '.yyxyx.',
      'yxxxxxv',
      '.vxvxv.',
      '...C...',
      '.DECED.',
      '..DCD..',
      '.DECED.',
      '...C...',
      '...C...',
    ]),
  ];
  // en planta som växer, utan kontur som gräset: stjälkar med blomkorgar och fjäderlika blad vid marken
  const ROLL_VILD = [
    [
      '.yxy...yy.',
      'yxxxv.yxxv',
      '.vCv...vC.',
      '..C....C..',
      '..C...C...',
      '.D.C.CD.D.',
      'DED.CC.DE.',
      '.DEDCDEDD.',
    ],
    [
      'yxy..yy..yx.',
      'xxv.yxxv.xxv',
      '.C...vC..vC.',
      '.C....C..C..',
      '..C...C.C...',
      'D.DC.DCC.D..',
      'EDD.CCC.DED.',
      '.DEDDCDEDD..',
    ],
    [
      '.yyxy.',
      'yxxxxv',
      '.vxvv.',
      '..C...',
      '..C...',
      '.DCD..',
      'DE.CED',
      '.DECD.',
    ],
  ];
  function rolleka(B, v) {
    gras(B);
    const G = window.MARK && window.MARK.granVariant;
    if (G) { G(B, 6, 12, 26, 0, 3); G(B, 22, 7, 22, 0, 8); G(B, 44, 9, 24, 0, 5); G(B, 60, 13, 28, 0, 11); }
    const vild = ROLL_VILD[v];
    for (const [x, y] of [[30, 20], [44, 26], [52, 18], [36, 30]]) lagg(B, vild, L, x, y, false);
    sp(B, ROLL_SAK[v], 6, 24);
  }
  const ROLLEKA = (text, v) => ({ text, w: 64, h: 40, rita: (B) => rolleka(B, v) });

  // ---------- 7.6.4–7.6.6 det som görs i örtköket ----------
  const SALVA = [
    MED([ // en lerskål med en blekgrön salva
      '..ppy..',
      '.pppnp.',
      'uppnnpt',
      'tusssst',
      '.tssss.',
      '..rrr..',
    ]),
    MED([ // en näverask med locket på glänt
      '.wxxxxw.',
      'xppnppnw',
      'yyyxxxxw',
      'yxxwwxxw',
      'yyyxxxxw',
      'ywwxxxxw',
      '.wwwwww.',
    ]),
    MED([ // ett musselskal med salva
      '...xx...',
      '.xypyx..',
      'xyppnpw.',
      'xppnnpw.',
      '.wxxwwv.',
      '..vvv...',
    ]),
  ];
  const SALVA_TEXT = ['En lerskål med blekgrön salva av rölleka och talg.', 'En liten öppen ask av näver med salvan i.', 'Salvan i ett stort musselskal.'];
  const TJARA = [
    MED([ // en lerkruka full av tjära som runnit över kanten
      '.lKKKl.',
      'uKKKKKt',
      'tsKssst',
      'ttsKsss',
      'tssKssr',
      '.ssssr.',
    ]),
    MED([ // en näverask med tjära och en pinne i
      '......d.',
      '.....c..',
      '.wxxcxw.',
      'xKKKcKKw',
      'yyyxxxxw',
      'yxxwwxxw',
      'yyyxxxxw',
      'ywwxxxxw',
      '.wwwwww.',
    ]),
    MED([ // en liten träbytta med tjära och en pensel av gräs
      '....g...',
      '...gfc..',
      '.lKKKdK.',
      'dcdcdcdb',
      'wwwwwwwx',
      'dcdcdcdb',
      '.cdcdcb.',
    ]),
  ];
  const TJARA_TEXT = ['En lerkruka full av svart tjära som runnit över kanten.', 'En ask av näver med tjära och en pinne att stryka med.', 'En liten bytta av trä med ett rep om och en pensel av gräs i tjäran.'];
  const BENLIM = [
    MED([ // en träskål med brunt lim
      '.dddddd.',
      'dfgffefc',
      'cddddddb',
      '.cccccb.',
      '..bbbb..',
    ]),
    MED([ // en pinne med en klump lim
      '.gff....',
      'gffee...',
      'feee....',
      '.ee.c...',
      '.....c..',
      '......c.',
      '.......b',
    ]),
    MED([ // en liten lerkruka där limmet rinner, och ett ben bredvid
      '.gffe.......',
      'ufffft......',
      'tsfsst......',
      'tssfsr.yyxx.',
      '.ssfr.yxwwxw',
      '...e...v..vv',
    ]),
  ];
  const BENLIM_TEXT = ['En träskål med segt brunt lim.', 'En klump lim på en pinne, som man stryker med.', 'En liten lerkruka där limmet rinner över kanten, och ett ben bredvid som det kokats av.'];
  const TVAL = [
    MED([ // ett grått block
      'xxxxxx',
      'yyyyyw',
      'xxxxxw',
      'xwxxxw',
      'wwwwwv',
    ]),
    MED([ // en gulbrun rundad kaka
      '.hhhg.',
      'hhhggf',
      'gggfff',
      '.fffe.',
    ]),
    MED([ // en grov klump som formats för hand, med fingrarnas gropar
      '.xxyx..',
      'xyyxwx.',
      'xwxxxwx',
      'xxwxwxw',
      '.wwvwww',
      '..vvv..',
    ]),
  ];
  const TVAL_TEXT = ['Ett grått, rakt skuret block.', 'En gulbrun rundad kaka.', 'En grå klump som formats för hand, med fingrarnas gropar.'];

  VAL.push(
    KORT('f7_ortkok', 'Örtköket', S + '7.6.1: stationen där örter kokas till salva och tjära, av 2 virke och 4 sten. En liten egen eld i en stenring eller härd med en kruka eller gryta, och en bänk eller ställning med örter och skålar.', [
      ORTKOK('Den lilla elden i stenringen med en lerkruka i, och en bänk med örter och två skålar.', 0),
      ORTKOK('En låg härd av stenar med krukan ovanpå och elden i öppningen; en ställning där örtknippen hänger och torkar.', 1),
      ORTKOK('En gryta som hänger i en trefot över elden mellan fyra stenar, och ett bord med en mortel, örter och en skål.', 2),
    ]),
    KORT('f7_rolleka', 'Rölleka', S + '7.6.3: den första örten, med platta vita blomkorgar och fjäderlika blad. Bilden visar den som sak (nere till vänster) och växande vild i ett skogsbryn.', [
      ROLLEKA('Ett knippe som står, bundet med rep; vilda plantor med två stjälkar.', 0),
      ROLLEKA('Ett knippe som ligger med blommorna åt höger; vilda plantor med tre stjälkar.', 1),
      ROLLEKA('En enda stjälk med en stor blomkorg; vilda plantor med en stjälk.', 2),
    ]),
    KORT('f7_salva', 'Salva', S + '7.6.4: salva av rölleka och talg, som läker sår, i en liten skål eller ask.', SALVA.map((r, i) => PA_MARK(SALVA_TEXT[i], r, L))),
    KORT('f7_tjara', 'Tjära', S + '7.6.5: tjära, svart och seg, i en kruka eller näverask.', TJARA.map((r, i) => PA_MARK(TJARA_TEXT[i], r, L))),
    KORT('f7_benlim', 'Benlim', S + '7.6.6: lim som kokats av ben, brunt och segt, i en liten skål eller på en pinne.', BENLIM.map((r, i) => PA_MARK(BENLIM_TEXT[i], r, L))),
    KORT('f7_tval', 'Tvål', S + '7.6.6: tvål, ett grått eller gulbrunt block.', TVAL.map((r, i) => PA_MARK(TVAL_TEXT[i], r, L))),
  );
})();
