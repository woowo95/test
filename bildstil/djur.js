// ---------- djuren på kartan och pälsens färger (steg 5.2.4.6, till 5.1.11) ----------
// Djuren ritas från tre håll, som kartfiguren: framifrån (söderut), bakifrån (norrut) och från sidan (österut); västerut
// är sidan speglad. Bokstäverna i ritningen är pälsens toner, inte färger: o kontur, d mörk, m mellan, l ljus, c gräddvit,
// b vit, k svart (nos, ögon, klor), r rosa. Pälsen är en tabell från bokstav till färg, så en ny färgvariant är en ny rad
// i PALS och ingen ny ritning (5.1.11: små skillnader mellan djuren av samma art, räknade ur djurets id).
(() => {
  const SCEN = (w, h, rita) => ({ w, h, stor: true, rita });
  // pälsarna: [ramp, ton] per bokstav
  const PALS = {
    varg: [
      ['Grå', { o: ['skiffer', 0], d: ['skiffer', 1], m: ['skiffer', 2], l: ['skiffer', 3], c: ['ben', 2], b: ['ben', 3] }],
      ['Ljusare', { o: ['skiffer', 0], d: ['skiffer', 2], m: ['skiffer', 3], l: ['ben', 1], c: ['ben', 2], b: ['ben', 3] }],
      ['Mörkare', { o: ['kol', 0], d: ['skiffer', 0], m: ['skiffer', 1], l: ['skiffer', 2], c: ['ben', 1], b: ['ben', 2] }],
      ['Brunare', { o: ['jord', 0], d: ['jord', 1], m: ['ben', 0], l: ['ben', 1], c: ['ben', 2], b: ['ben', 3] }],
    ],
    kanin: [
      ['Brun', { o: ['jord', 0], d: ['jord', 1], m: ['jord', 2], l: ['jord', 3], c: ['ben', 2], b: ['ben', 3] }],
      ['Ljusare', { o: ['jord', 0], d: ['jord', 2], m: ['jord', 3], l: ['ben', 1], c: ['ben', 2], b: ['ben', 3] }],
      ['Mörkare', { o: ['kol', 0], d: ['jord', 0], m: ['jord', 1], l: ['jord', 2], c: ['ben', 1], b: ['ben', 2] }],
      ['Gråare', { o: ['jord', 0], d: ['kol', 2], m: ['ben', 0], l: ['ben', 1], c: ['ben', 2], b: ['ben', 3] }],
    ],
  };
  const FAST = { k: ['kol', 0], r: ['rost', 2] };

  // ---------- vargen (ritad på nytt utan förlaga efter Björns svar på bildstil v121) ----------
  // Vargen byggs av former i stället för att ritas punkt för punkt: ellipser för bröst, höft, hals och huvud, kilar för
  // nos och öron, tjocka linjer för ben och svans. Varje form fyller sina punkter med en ton (bokstaven), och konturen
  // läggs runt hela kroppen efteråt. Samma former ger alla tre hållen, så att vargen är samma djur framifrån och bakifrån.
  function former(w, h, lista) {
    const g = Array.from({ length: h }, () => Array(w).fill('.'));
    for (const [inne, ton] of lista) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!inne(x + 0.5, y + 0.5)) continue;
      const c = typeof ton === 'function' ? ton(x + 0.5, y + 0.5) : ton; if (c) g[y][x] = c;
    }
    // konturen utanför kroppen (inte under fötterna, där skuggan ligger)
    const ut = g.map(r => r.slice());
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[y][x] === '.') {
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx] && g[y + dy][x + dx] !== '.');
      if (n) ut[y][x] = 'o';
    }
    const rader = ut.map(r => r.join('')), forst = rader.findIndex(r => /[^.]/.test(r));
    return rader.slice(forst); // tomma rader överst bort
  }
  const ell = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const linje = (pts, r0, r1 = r0) => (x, y) => { // en tjock linje genom punkterna, tunnare mot slutet
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)), r = r0 + (r1 - r0) * (i + t) / (pts.length - 1);
      if ((x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2 <= r * r) return true;
    }
    return false;
  };
  const tri = (a, b, c) => (x, y) => { const s = (p, q) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]); const d1 = s(a, b), d2 = s(b, c), d3 = s(c, a); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
  const och = (...f) => (x, y) => f.some(g => g(x, y));
  const punkt = (px, py) => (x, y) => Math.floor(x) === px && Math.floor(y) === py;

  // de tre vargarna: mått i punkter, foten på raden h - 1
  const VARGTYP = [
    { namn: 'smal', ben: 7.5, kropp: 3.1, ruff: 3.2, huvud: 2.8, nos: 4.4, svans: 1.8, sank: 0, mask: false },
    { namn: 'tung', ben: 6, kropp: 3.8, ruff: 4.4, huvud: 3.1, nos: 3.6, svans: 2.6, sank: 0, mask: false },
    { namn: 'lag', ben: 7, kropp: 3.2, ruff: 3.4, huvud: 2.7, nos: 4.9, svans: 2, sank: 3, mask: true },
  ];
  function vargSida(t) {
    const W = 34, H = 26, fot = H - 1, ben = t.ben, bot = fot - ben, mitt = bot - t.kropp; // mitt: kroppens mittlinje
    const rygg = mitt - t.kropp;
    const hx = 26.5, hy = rygg - 1.2 + t.sank, nx = hx + t.nos; // huvudets mitt och nosens spets
    const brost = ell(19, mitt + 0.4, 5.2, t.kropp + 0.4), hoft = ell(8, mitt - 0.2, 4.6, t.kropp - 0.2);
    const midja = (x, y) => x > 8 && x < 19 && y > rygg + 0.3 + (x - 8) * -0.03 && y < bot - 0.6 - Math.sin((x - 8) / 11 * Math.PI) * 1.6;
    const kropp = och(brost, hoft, midja);
    const hals = linje([[20, mitt], [hx - 1, hy + 0.8]], t.ruff, t.huvud);
    const huvud = ell(hx, hy, t.huvud + 0.4, t.huvud);
    const nos = och(tri([hx, hy - 0.9], [nx, hy + 0.9], [hx, hy + t.huvud * 0.9]), ell(nx - 0.6, hy + 1.2, 0.9, 0.7));
    const ora = (x0) => tri([x0 - 1.5, hy - t.huvud + 1], [x0 + 1.5, hy - t.huvud + 1], [x0 - 0.4, hy - t.huvud - 3.2]);
    const framBen = (x) => linje([[x, bot - 1], [x + 0.2, fot - 1.2], [x + 0.8, fot - 0.4]], 0.8, 0.65);
    const bakBen = (x) => linje([[x + 1.2, bot - 1.8], [x - 1.2, bot + ben * 0.55], [x - 0.6, fot - 1], [x + 0.2, fot - 0.4]], 1.5, 0.65);
    const svansSpets = [1.4, fot - ben * 0.3];
    const svans = linje([[4.5, rygg + 1], [2.2, rygg + 3.2], [1.4, rygg + 6], svansSpets], t.svans * 0.6, t.svans * 1.1);
    const ton = (x, y) => { // pälsen: mörk rygg, mellan på sidorna, ljus undersida
      const u = (y - rygg) / (bot - rygg);
      return u < 0.3 ? 'd' : u < 0.72 ? 'm' : 'l';
    };
    return former(W, H, [
      [och(framBen(16.5), bakBen(6.2)), 'd'], // benen på andra sidan, i skugga
      [svans, (x, y) => y > svansSpets[1] - 0.6 ? 'k' : x < 2.6 && y > rygg + 4 ? 'm' : 'd'],
      [kropp, ton],
      [hals, (x, y) => (y > mitt - 0.5 || x > hx - 2.5 && y > hy + 1) ? 'c' : y < rygg + 1 + t.sank * 0.5 ? 'd' : 'm'],
      [och(framBen(19.5), bakBen(9)), (x, y) => y > fot - 1.6 ? 'l' : 'm'],
      [ora(hx - 1.6), 'd'], [ora(hx + 0.8), (x, y) => x > hx + 0.2 && x < hx + 1.2 && y > hy - t.huvud - 1.6 ? 'k' : 'm'],
      [huvud, (x, y) => y < hy - 0.6 ? 'm' : t.mask && y > hy - 0.4 ? 'c' : 'l'],
      [nos, (x, y) => x > nx - 1.4 && y < hy + 1.7 ? 'k' : y > hy + 0.8 ? 'c' : t.mask ? 'c' : 'l'],
      [punkt(Math.floor(hx + 0.6), Math.floor(hy - 0.3)), 'k'],
    ]);
  }
  function vargFram(t) {
    const W = 15, H = 26, fot = H - 1, c = 7.5, bot = fot - t.ben, hy = bot - t.kropp * 2 - 1.2 + t.sank, r = t.huvud + 0.5;
    const ora = (s) => tri([c + s * 1.2, hy - r + 0.9], [c + s * 3.6, hy - r + 1.4], [c + s * 2.8, hy - r - 2.6]);
    return former(W, H, [
      [ell(c, bot - t.kropp, t.kropp + 1, t.kropp + 0.4), 'd'], // kroppen bakom bröstet
      [och(linje([[c - 3, bot - 1], [c - 3.1, fot - 0.4]], 0.7), linje([[c + 3, bot - 1], [c + 3.1, fot - 0.4]], 0.7)), 'd'], // bakbenen
      [ell(c, bot - t.kropp + 0.6, t.ruff * 0.72, t.kropp + 0.9), (x, y) => Math.abs(x - c) < 1.3 ? 'c' : 'm'], // bröstet och ruffen
      [ell(c, hy + r + 0.2, r - 0.2, 1), 'd'], // skuggan under hakan
      [och(linje([[c - 1.3, bot - 1], [c - 1.4, fot - 0.4]], 0.75), linje([[c + 1.3, bot - 1], [c + 1.4, fot - 0.4]], 0.75)), (x, y) => y > fot - 1.6 ? 'l' : 'm'],
      [och(ora(-1), ora(1)), (x, y) => Math.abs(x - c) > 2.2 && Math.abs(x - c) < 3.4 && y > hy - r - 0.5 ? 'k' : 'm'],
      [ell(c, hy, r + 0.9, r), (x, y) => y < hy - 0.8 ? 'm' : Math.abs(x - c) > r - 0.6 ? 'l' : t.mask ? 'c' : 'l'],
      [ell(c, hy + r * 0.65, 1.7, 1.4), 'c'], // nosen
      [och(punkt(Math.floor(c) - 2, Math.floor(hy)), punkt(Math.floor(c) + 2, Math.floor(hy)), punkt(Math.floor(c), Math.floor(hy + r * 0.45))), 'k'],
    ]);
  }
  function vargBak(t) {
    const W = 15, H = 26, fot = H - 1, c = 7.5, bot = fot - t.ben, hy = bot - t.kropp * 2 - 1.2 + t.sank, r = t.huvud + 0.5;
    const ora = (s) => tri([c + s * 1.2, hy - r + 0.9], [c + s * 3.6, hy - r + 1.4], [c + s * 2.8, hy - r - 2.6]);
    return former(W, H, [
      [och(ora(-1), ora(1)), 'd'],
      [ell(c, hy, r + 0.6, r), 'm'],
      [ell(c, bot - t.kropp - 0.6, t.ruff * 0.75, t.kropp + 0.6), (x, y) => Math.abs(x - c) < 1.5 && y < bot - t.kropp ? 'd' : 'm'], // nacken och ryggen
      [och(linje([[c - 2.2, bot - 2], [c - 2.6, bot + 1.5], [c - 2.3, fot - 0.4]], 1.2, 0.7), linje([[c + 2.2, bot - 2], [c + 2.6, bot + 1.5], [c + 2.3, fot - 0.4]], 1.2, 0.7)), (x, y) => y > fot - 1.6 ? 'l' : 'm'], // bakbenen
      [ell(c, bot - t.kropp * 0.6, t.kropp + 0.4, t.kropp * 0.9), 'm'], // höften
      [linje([[c, bot - t.kropp * 0.8], [c, bot + t.ben * 0.4]], t.svans * 0.7, t.svans), (x, y) => y > bot + t.ben * 0.4 + t.svans - 1 ? 'k' : 'd'], // svansen
    ]);
  }
  const VARG = VARGTYP.map(t => ({ sida: vargSida(t), fram: vargFram(t), bak: vargBak(t) }));

  // ---------- haren (spelets kanin) ----------
  const KANIN = [
    { // version 1: sitter med öronen rakt upp
      sida: [
        '........o.o.',
        '.......olol.',
        '.......olol.',
        '......ommmo.',
        '..ooooomlkmo',
        '.ommlllmmmmo',
        'obmlllllmmo.',
        'obmmmmmmmdo.',
        '.oddmmmmddo.',
        '..oko.ooko..'],
      fram: [
        '.o....o.',
        'olo..olo',
        'olo..olo',
        '.omoomo.',
        'omlllmmo',
        'okmllmko',
        '.omcrmo.',
        'omcbbcmo',
        'odcbbcdo',
        '.okooko.'],
      bak: [
        '.o....o.',
        'olo..olo',
        'olo..olo',
        '.omoomo.',
        'omllllmo',
        'omllllmo',
        'odlllmdo',
        'odmbbmdo',
        'oddbbddo',
        '.oko.ko.'] },
    { // version 2: längre öron med svarta spetsar, som en skogshare, och höga bakben
      sida: [
        '.........k.k',
        '........olol',
        '........olol',
        '.......olol.',
        '.......ommmo',
        '..oooooomlkm',
        '.ommllllmmmo',
        'obmllllllmo.',
        'obmmmmmmmdo.',
        '.oddmmmmddo.',
        '.odko.ooko..'],
      fram: [
        '.k....k.',
        'olo..olo',
        'olo..olo',
        'olo..olo',
        '.omoomo.',
        'omlllmmo',
        'okmllmko',
        '.omcrmo.',
        'omcbbcmo',
        'odcbbcdo',
        '.okooko.'],
      bak: [
        '.k....k.',
        'olo..olo',
        'olo..olo',
        'olo..olo',
        '.omoomo.',
        'omllllmo',
        'omllllmo',
        'odlllmdo',
        'odmbbmdo',
        'oddbbddo',
        '.oko.ko.'] },
    { // version 3: hukar lågt med öronen bakåt längs ryggen, rund och kompakt
      sida: [
        '..oooooo....',
        '.ollllmlo...',
        'oooooooomoo.',
        '.ommllllmmko',
        'obmllllllmmo',
        'obmmmmmmmmo.',
        '.oddddmmddo.',
        '..ok..oko...'],
      fram: [
        'oo....oo',
        'olo..olo',
        '.omoomo.',
        'omlllmmo',
        'okmllmko',
        '.omcrmo.',
        'odcbbcdo',
        '.okooko.'],
      bak: [
        'oo....oo',
        'olo..olo',
        '.omoomo.',
        'omllllmo',
        'odlllmdo',
        'odmbbmdo',
        'oddbbddo',
        '.oko.ko.'] },
  ];

  // ritar en ritning med foten (nedersta raden) på fot och mitten på x, i en päls; spegel = västerut
  function djur(B, rader, x, fot, pals, spegel = false) {
    const P = B.P, w = rader[0].length, h = rader.length, x0 = Math.round(x) - (w >> 1);
    for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
      const ch = rader[y][spegel ? w - 1 - i : i], f = pals[ch] || FAST[ch];
      if (f) B.satt(x0 + i, fot - h + 1 + y, P.i(f[0], f[1]));
    }
    for (let i = 1; i < w - 1; i++) B.morka(x0 + i + 1, fot + 1); // skuggan under djuret
  }
  // marken: referensgräset (mark.js)
  function gras(B) {
    const M = window.MARK;
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, M.grasPunkt(x + 40, y + 900, B.P, 1));
    M.tuvor(B, 1, () => true, 0.5);
  }
  // kortets scen: överst människan och djuret från fyra håll, nederst djuret från sidan i alla pälsar
  function scen(art, v) {
    const R = (art === 'varg' ? VARG : KANIN)[v], pals = PALS[art], sw = R.sida[0].length, fw = R.fram[0].length;
    const steg = Math.max(sw, 18) + 6, w = Math.max(16 + fw + 8 + fw + 8 + sw + 8 + sw + 10, pals.length * steg + 10), h = art === 'varg' ? 76 : 60;
    return SCEN(w, h, B => {
      gras(B);
      const p0 = pals[0][1], fot = art === 'varg' ? 30 : 26;
      let x = 9;
      window.MARK.fram(B, x, fot); x += 8 + (fw >> 1) + 2;
      djur(B, R.fram, x, fot, p0); x += fw + 6;
      djur(B, R.bak, x, fot, p0); x += (fw >> 1) + 6 + (sw >> 1);
      djur(B, R.sida, x, fot, p0); x += sw + 6;
      djur(B, R.sida, x, fot, p0, true);
      const fot2 = h - 6;
      pals.forEach(([, pal], i) => djur(B, R.sida, 6 + (sw >> 1) + i * steg, fot2, pal, i % 2 === 1));
    });
  }
  const T = 'Steg 5.2.4.6, till 5.1.11: ';
  const OM = ' Överst: en vuxen människa framifrån för storleken, sedan djuret framifrån (söderut), bakifrån (norrut), från sidan (österut) och speglat (västerut). Nederst fyra pälsar, små skillnader i färgen som räknas ur djurets id: ';
  VAL.push(
    { id: 'djur_varg', stor: true, namn: 'Vargen', typ: 'tre', vad: T + 'vargen ritad helt på nytt, utan förlaga (de förra ritningarna är borta). Den byggs av former: ellipser för bröst, höft, hals och huvud, kilar för nos och öron och tjocka linjer för ben och svans, så att den blir samma djur från alla håll. Mörk rygg, ljus undersida, gräddvitt bröst och svart nos, öronkant och svansspets. Din kommentar förra gången: \u201dJag gillar inte hur den ser ut. Gör ett helt nytt utseende utan förlaga\u201d.' + OM + PALS.varg.map(p => p[0].toLowerCase()).join(', ') + '.',
      versioner: [
        { text: 'Version 1: smal och högbent, som en skogsvarg om sommaren.', ...scen('varg', 0) },
        { text: 'Version 2: tung vinterpäls, kortare ben, stor ruff och tjock svans.', ...scen('varg', 1) },
        { text: 'Version 3: bär huvudet lågt i ryggens linje med lång nos och ljus mask, som en varg som går och vädrar.', ...scen('varg', 2) }] },
    { id: 'djur_kanin', stor: true, namn: 'Haren (kaninen)', typ: 'tre', vad: T + 'haren som springer på kartan (spelets kanin), i samma bruna toner som det fällda viltet du valt. I spelet nu 8 × 8 punkter, bara från sidan.' + OM + PALS.kanin.map(p => p[0].toLowerCase()).join(', ') + '.',
      versioner: [
        { text: 'Version 1: sitter med öronen rakt upp.', ...scen('kanin', 0) },
        { text: 'Version 2: längre öron med svarta spetsar, som en skogshare.', ...scen('kanin', 1) },
        { text: 'Version 3: hukar lågt med öronen bakåt längs ryggen.', ...scen('kanin', 2) }] },
  );
})();
