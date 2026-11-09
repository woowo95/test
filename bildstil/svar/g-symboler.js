// Björns svar på symbolerna i 9.2: samtalens ämnen i 8 punkter (9.2.10), krönikans kategorier (9.2.73), sakerna på
// rutan (9.2.53) och vedhögen i lagret (9.2.39). Varje kort byts ut i VAL med samma id.
(() => {
  const byt = kort => { const i = VAL.findIndex(s => s.id === kort.id); if (i >= 0) VAL[i] = kort; else VAL.push(kort); };
  const hash = (a, b, c = 0) => { let n = (a * 374761393 + b * 668265263 + c * 1274126177) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  // en bokstav per ramp och ton; 'o' är konturen (kol 0)
  const L = {
    o: 'kol0', k: 'kol1', K: 'kol2', x: 'kol3',
    E: 'jord0', j: 'jord1', J: 'jord2', b: 'jord3',
    Z: 'senap0', z: 'senap1', y: 'senap2', Y: 'senap3',
    D: 'rost0', d: 'rost1', r: 'rost2', R: 'rost3',
    H: 'oliv0', h: 'oliv1', g: 'oliv2', G: 'oliv3',
    Q: 'skiffer0', q: 'skiffer1', s: 'skiffer2', S: 'skiffer3',
    V: 'ben0', v: 'ben1', W: 'ben2', w: 'ben3',
  };

  // ---------- 9.2.10 samtalens ämnen i 8 punkter ----------
  // den lilla pratbubblan som i dag (9.2-rattelser.js), med symbolen i 8 × 8 punkter mitt i
  const bubbla = (B, rader, legend = L) => {
    const P = B.P;
    for (let y = 0; y < 18; y++) for (let x = 0; x < 20; x++) B.satt(x, y, P.i('oliv', 2));
    for (let y = 2; y < 13; y++) for (let x = 4; x < 16; x++) { const hörn = (x === 4 || x === 15) && (y === 2 || y === 12); if (!hörn) B.satt(x, y, (x === 4 || x === 15 || y === 2 || y === 12) ? P.i('kol', 2) : P.i('ben', 3)); }
    B.satt(7, 13, P.i('ben', 3)); B.satt(6, 13, P.i('kol', 2)); B.satt(8, 13, P.i('kol', 2)); B.satt(7, 14, P.i('kol', 2));
    ritaSprite(B, rader, legend, 6, 4);
  };
  // de förra symbolerna, med legenden de hade
  const GL = { k: 'kol0', r: 'rost2', R: 'rost3', y: 'senap1', Y: 'senap2', j: 'jord2', s: 'skiffer2', b: 'skiffer1' };
  const AMNEN = [
    ['barn', 'Barnen', 'ett litet barn', ['...j....', '..jjj...', '...j....', '..kkk...', '.k.k.k..', '..k.k...', '..k.k...', '........'],
      'en vuxen och ett litet barn bredvid varandra, som på en skylt: den vuxna i brunt, barnet i rött och hälften så stort.',
      ['.RR.....', '.RR.....', 'jjjj....', 'jjjj.RR.', 'jjjj.RR.', '.jj.rrrr', '.jj..rr.', '.j.j.r.r']],
    ['gral', 'Gräl', 'två arga streck', ['........', '.r...r..', 'rrr.rrr.', '.r...r..', '........', '.r...r..', '........', '........'],
      'ett rött, argt ansikte: ögonbrynen sneda nedåt mot mitten och munnen nedåt.',
      ['..rrrr..', '.rkRRkr.', 'rRRkkRRr', 'rRkRRkRr', 'rRRRRRRr', 'rRRkkRRr', '.rkRRkr.', '..rrrr..']],
    ['kunskap', 'Något man kan', 'en bok', ['.jjjjj..', '.jYYYj..', '.jYkYj..', '.jYYYj..', '.jYkYj..', '.jYYYj..', '.jjjjj..', '........'],
      'en uppsträckt hand och en gul stjärna ovanför: något man är duktig på.',
      ['.....y..', '....yYy.', '.....y..', 'R.R.R...', 'R.R.R.R.', 'RRRRRRR.', '.RRRRR..', '..rrr...']],
    ['mat', 'Maten', 'ett lårben', ['........', '.....kk.', '....kYk.', '..jjk...', '.jjjj...', '.jjjj...', '..jj....', '........'],
      'en stor köttbit på ett ben, som ett lårben: köttet rött och benet med en knopp i änden.',
      ['.drrd...', 'drRRrd..', 'rRRrrrd.', 'rRrrrrd.', 'drrrrd..', '.ddddv..', '......vV', '......V.']],
    ['teknik', 'En teknik', 'en gnista', ['...y....', '.y.y.y..', '..yyy...', 'yyyYyyy.', '..yyy...', '.y.y.y..', '...y....', '........'],
      'en ny stenyxa och en gnista bredvid: ett nytt sätt att göra något.',
      ['y.y..ss.', '.Y..sSsq', 'y.y.sSqq', '....Jqq.', '...J....', '..J.....', '.J......', 'J.......']],
    ['varsel', 'En motgång som kommer', 'en mörk triangel med ett öga', ['...k....', '..kyk...', '.kyyyk..', '.kykyk..', 'kyyyyyk.', 'kykkkyk.', 'kkkkkkk.', '........'],
      'en svart korp med gult öga, fågeln som varslar om olycka.',
      ['........', '.ooo....', 'ooYo....', '..oooo..', '..oooooo', '..ooooo.', '...ooo.o', '...o.o..']],
  ];
  for (const [k, namn, forraText, forra, text, ny] of AMNEN) {
    byt({ id: 'f9_amne_' + k, namn: 'Samtalets ämne: ' + namn, typ: 'janej',
      vad: `Steg 9.2.10: varje ämne har en symbol i 8 punkter i den lilla pratbubblan. Ämnet ${namn.toLowerCase()} har fått en ny, tydligare symbol: till vänster den förra (${forraText}), till höger den nya. Du sa nej förra gången.`,
      idag: { w: 20, h: 18, rita: B => bubbla(B, forra, GL) }, idagText: `Den förra symbolen: ${forraText}.`,
      versioner: [{ text: `Ämnet ${namn.toLowerCase()}: ${text}`, w: 20, h: 18, rita: B => bubbla(B, ny) }] });
  }
  // ---------- ett litet rutnät att rita symbolerna i ----------
  // fyll(inne, ton) fyller punkterna där inne(x, y) är sant (mitten av punkten) med en bokstav eller en funktion som ger
  // bokstaven; kontur() lägger 'o' runt allt som ritats hittills
  const Grid = (w, h) => {
    const g = Array.from({ length: h }, () => Array(w).fill('.'));
    const o = {
      g, satt: (x, y, c) => { if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c; },
      fyll: (inne, ton) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inne(x + 0.5, y + 0.5)) { const c = typeof ton === 'function' ? ton(x + 0.5, y + 0.5) : ton; if (c) g[y][x] = c; } return o; },
      kontur: (c = 'o') => { const f = g.map(r => r.slice()); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (f[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => f[y + dy] && f[y + dy][x + dx] && f[y + dy][x + dx] !== '.')) g[y][x] = c; return o; },
      lagg: (rader, x0 = 0, y0 = 0) => { rader.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.') o.satt(x0 + x, y0 + y, c); })); return o; },
      rader: () => g.map(r => r.join('')),
    };
    return o;
  };
  const ell = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const linje = (pts, r0, r1 = r0) => (x, y) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), r = r0 + (r1 - r0) * (i + t) / (pts.length - 1);
      if ((x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2 <= r * r) return true;
    }
    return false;
  };
  const poly = pts => (x, y) => { let inne = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inne = !inne; } return inne; };
  const och = (...f) => (x, y) => f.some(g => g(x, y));
  const utan = (f, g) => (x, y) => f(x, y) && !g(x, y);
  // ljus uppe till vänster: a på den ljusa sidan, b i mitten, c på den mörka (nere till höger) runt (cx, cy)
  const tre = (cx, cy, a, b, c, k1 = -1.5, k2 = 1.5) => (x, y) => { const v = (x - cx) + (y - cy); return v < k1 ? a : v > k2 ? c : b; };

  // ---------- 9.2.73 krönikans kategorier ----------
  // symbolen på panelens ljusa botten, med två punkter runt om (som i 9.2-symboler.js)
  const ruta = (B, rader, legend = L) => { for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) B.satt(x, y, B.P.i('ben', 2)); ritaSprite(B, rader, legend, 2, 2); };
  const KL = { o: 'kol0', k: 'kol2', r: 'rost2', R: 'rost3', d: 'rost1', y: 'senap2', Y: 'senap3', z: 'senap1', j: 'jord1', J: 'jord2', b: 'jord3', w: 'ben3', W: 'ben2', g: 'oliv2', G: 'oliv3', s: 'skiffer2', S: 'skiffer3' };
  const KK_VAD = 'Steg 9.2.73: krönikans kategorier har var sin symbol i en rad överst i Krönikan; ett tryck på en symbol visar bara den kategorins rader. Symbolen i 16 punkter på panelens botten.';
  const kk = (id, namn, vad, versioner, extra = {}) => byt({ id: 'f9_kk_' + id, namn: 'Krönikans kategori ' + namn, typ: 'tre', vad: KK_VAD + ' ' + vad, ...extra,
    versioner: versioner.map(([text, rader, legend]) => ({ text, w: 20, h: 20, rita: B => ruta(B, typeof rader === 'function' ? rader() : rader, legend) })) });
  // spelets platshållare i dag (src/ikoner.ts), med sina egna färger
  const spelet = (rader, pal) => ({ w: 20, h: 20, rita: B => { for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) B.satt(x, y, B.P.i('ben', 2)); rader.forEach((r, y) => [...r].forEach((c, x) => { if (pal[c]) B.satt(2 + x, 2 + y, B.P.near(rgb2lab(hex2rgb(pal[c])))); })); } });

  // Bygge och uppfinningar: spelets hus (kk_bygge), med tak, timmerväggar och dörr
  const HUS = [
    '......o..o......',
    '.......oo.......',
    '......oJjo......',
    '.....oJbJjo.....',
    '....oJbJJjjo....',
    '...oJbJJjjjjo...',
    '..oJbJJjjjjjjo..',
    '.oJbJJjjjjjjjjo.',
    'oooooooooooooooo',
    '.obbbbbbbbbbbbo.',
    '.ojjjjjoooojjjo.',
    '.obbbbbokkobbbo.',
    '.ojjjjjokkojjjo.',
    '.obbbbbokkobbbo.',
    '.ojjjjjokkojjjo.',
    '.oooooooooooooo.',
  ];
  const husMed = (...lager) => () => { const g = Grid(16, 16).lagg(HUS); lager.forEach(f => f(g)); return g.rader(); };
  // en gnista: fyra uddar och en ljus mitt
  const gnista = (cx, cy) => g => { g.satt(cx, cy - 2, 'z'); g.satt(cx, cy + 2, 'z'); g.satt(cx - 2, cy, 'z'); g.satt(cx + 2, cy, 'z'); g.satt(cx - 1, cy, 'Y'); g.satt(cx + 1, cy, 'Y'); g.satt(cx, cy - 1, 'Y'); g.satt(cx, cy + 1, 'Y'); g.satt(cx, cy, 'w'); g.satt(cx - 1, cy - 1, 'y'); g.satt(cx + 1, cy + 1, 'y'); };
  kk('bygge', 'Bygge och uppfinningar', 'Tre versioner som utgår från huset som spelet visar i dag. Din kommentar förra gången: ”utgå från symbolen som redan finns”',
    [['Huset som i dag, tydligare: taket ljust på vänster sida och mörkt på höger, timmerväggar i två toner och korsade gavelstockar överst.', HUS, L],
      ['Samma hus med en gnista uppe till höger: något nytt har kommit till, ett bygge eller en uppfinning.', husMed(gnista(13, 2)), L],
      ['Samma hus medan det byggs: på den högra halvan av taket ligger bara ribborna, och torvan är inte lagd än.', husMed(g => {
        for (let y = 3; y <= 7; y++) for (let x = 9; x < 15; x++) if (g.g[y][x] === 'j') g.satt(x, y, y % 2 ? 'J' : '.');
        for (let y = 3; y <= 7; y++) if (g.g[y][9] === '.') g.satt(9, y, 'j');
      }), L]],
    { idag: spelet(['................', '.......oo.......', '......ojjo......', '.....ojjjjo.....', '....ojjjjjjo....', '...ojjjjjjjjo...', '..ojjjjjjjjjjo..', '.oooooooooooooo.', '..obbbbbbbbbbo..', '..obbbbbbbbbbo..', '..obbboooobbbo..', '..obbbokkobbbo..', '..obbbokkobbbo..', '..obbbokkobbbo..', '..oooooooooooo..', '................'], { o: '#24201d', j: '#7d5b40', b: '#987e62', k: '#2f261d' }) });

  // Tro: spelets sol (kk_tro)
  const strålar = g => {
    for (const [x, y] of [[7, 0], [8, 0], [7, 1], [8, 1], [7, 14], [8, 14], [7, 15], [8, 15], [0, 7], [0, 8], [1, 7], [1, 8], [14, 7], [14, 8], [15, 7], [15, 8]]) g.satt(x, y, 'y');
    for (const [x, y] of [[2, 2], [3, 3], [13, 2], [12, 3], [2, 13], [3, 12], [13, 13], [12, 12]]) g.satt(x, y, 'z');
  };
  const skiva = (cx, cy, r) => g => g.fyll(ell(cx, cy, r, r), tre(cx, cy, 'Y', 'y', 'z', -2.5, 2.5));
  const sol = (...extra) => () => { const g = Grid(16, 16); skiva(8, 8, 4.6)(g); extra.forEach(f => f(g)); g.kontur(); strålar(g); return g.rader(); };
  kk('tro', 'Tro', 'Tre versioner som utgår från solen som spelet visar i dag. Din kommentar förra gången: ”utgå från symbolen som redan finns”',
    [['Solen som i dag, tydligare: en rund skiva, ljus uppe till vänster, och tjockare strålar runt om.', sol(), L],
      ['Solhjulet: samma sol med ett rött kors i, som på hällristningarna.', sol(g => { g.fyll(utan(ell(8, 8, 4.6, 4.6), ell(8, 8, 3.7, 3.7)), 'd'); for (let i = 4; i <= 11; i++) { g.satt(i, 7, 'd'); g.satt(i, 8, 'd'); g.satt(7, i, 'd'); g.satt(8, i, 'd'); } }), L],
      ['Solen som går upp bakom en rest sten: stenen står framför skivan, med strålarna runt om.', () => {
        const g = Grid(16, 16); skiva(8, 7, 4.6)(g); g.kontur(); strålar(g);
        for (let y = 13; y < 16; y++) for (let x = 0; x < 16; x++) g.satt(x, y, '.');
        g.fyll(och(poly([[6, 15.5], [6.2, 8.5], [7, 6.5], [8.6, 6], [9.8, 7.4], [10.2, 10], [10.4, 15.5]])), tre(8, 10, 'S', 's', 'q', -1.5, 1.5));
        g.satt(8, 9, 'q'); g.satt(8, 11, 'q');
        g.fyll((x, y) => y > 14 && y < 16 && x > 1 && x < 15 && !(g.g[Math.floor(y)][Math.floor(x)] !== '.' && g.g[Math.floor(y)][Math.floor(x)] !== 'o'), 'g');
        const f = g.g.map(r => r.slice());
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (f[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => f[y + dy] && 'Ssqg'.includes(f[y + dy][x + dx] || '.'))) g.satt(x, y, 'o');
        for (let x = 5; x <= 10; x++) if ('Ssq'.includes(g.g[4][x]) || 'Ssq'.includes(g.g[5][x])) { /* stenens topp har redan kontur */ }
        return g.rader();
      }, L]],
    { idag: spelet(['................', '.......y........', '..y....y....y...', '...y.......y....', '.....ooooo......', '....oyyyyyo.....', '...oyyYYyyyo....', 'yy.oyYYYYyyo.yy.', '...oyyYYyyyo....', '....oyyyyyo.....', '.....ooooo......', '...y.......y....', '..y....y....y...', '.......y........', '................', '................'], { o: '#24201d', y: '#b2921b', Y: '#d8b25f' }) });

  // Strid: tre nya
  kk('strid', 'Strid', 'Tre nya versioner. Du sa nej förra gången.',
    [['En rund sköld av trä med en järnknopp, framför två korsade spjut med flintspetsar.', () => {
      const g = Grid(16, 16);
      g.fyll(och(linje([[2, 14.5], [11, 5.5]], 0.55), linje([[14, 14.5], [5, 5.5]], 0.55)), 'J');
      // spjutspetsarna: smala och spetsiga, i spjutets riktning
      g.fyll(och(poly([[15.2, 0.8], [10.4, 3.6], [12.4, 5.6]]), poly([[0.8, 0.8], [5.6, 3.6], [3.6, 5.6]])), (x, y) => (x < 8 ? x - y : y - x) > 0.3 ? 'q' : 'S');
      g.fyll(ell(8, 10.5, 4.2, 4.2), tre(8, 10.5, 'b', 'J', 'j', -2.5, 2.5));
      g.fyll((x, y) => ell(8, 10.5, 4.2, 4.2)(x, y) && !ell(8, 10.5, 3.3, 3.3)(x, y), 'j');
      g.fyll(ell(8, 10.5, 1.5, 1.5), tre(8, 10.5, 'S', 's', 'q', -0.6, 0.6));
      return g.kontur().rader();
    }, L],
      ['En stenyxa och ett spjut i kors, med blod som droppar.', () => {
        const g = Grid(16, 16);
        g.fyll(linje([[2.5, 14.5], [12, 4]], 0.7), 'J');
        g.fyll(linje([[13.5, 14.5], [4.5, 4.5]], 0.6), 'J');
        g.fyll(poly([[1.5, 0.8], [5.6, 2.2], [3.6, 3.6], [2.2, 5.6]]), tre(3, 3, 'S', 's', 'q', -2, 1.2));
        g.fyll(poly([[9.4, 1.2], [13.8, 2.6], [15.2, 6.5], [11, 5.6]]), tre(12, 4, 'S', 's', 'q', -1.5, 1.5));
        g.kontur();
        for (const [x, y, c] of [[4, 6, 'r'], [4, 7, 'r'], [3, 8, 'd'], [4, 8, 'd'], [7, 12, 'r'], [7, 13, 'd'], [12, 8, 'r']]) g.satt(x, y, c);
        return g.rader();
      }, L],
      ['Tre röda klösmärken, som efter ett djur som anfallit.', () => {
        const g = Grid(16, 16);
        const klo = (x0) => linje([[x0 + 5, 1.5], [x0 + 3.2, 7], [x0 + 0.5, 14.5]], 0.3, 0.85);
        for (const x0 of [0.5, 4.8, 9.1]) g.fyll(klo(x0), (x, y) => y < 5 ? 'R' : 'r');
        for (const x0 of [0.5, 4.8, 9.1]) g.fyll(klo(x0 + 0.8), (x, y) => (g.g[Math.floor(y)][Math.floor(x)] === '.' ? 'D' : null));
        return g.kontur().rader();
      }, L]]);

  // Fritid: version 2 (trumman) först, och två nya trummor och instrument
  kk('fritid', 'Fritid', 'Version 1 är den du valde (trumman), och version 2 och 3 är två nya instrument. Din kommentar förra gången: ”gör fler versioner av trummor och instrument”',
    [['Den du valde: en trumma med skinn och en pinne.', ['............oo..', '...........owo..', '..........owo...', '.........owo....', '..oooooooowooo..', '.owwwwwwwwwwwwo.', '.oWwwwwwwwwwwWo.', '.oowwwwwwwwwwoo.', '.orjrjrjrjrjrjo.', '.ojrjrjrjrjrjro.', '.orjrjrjrjrjrjo.', '.ojrjrjrjrjrjro.', '..orrrrrrrrrro..', '...oooooooooo...', '................', '................'], KL],
      ['En ramtrumma: ett tunt skinn i en träram, med en röd målad sol, och en klubba med en knopp.', () => {
        const g = Grid(16, 16);
        // ramen syns som ett band av trä under skinnet, eftersom trumman lutar
        g.fyll(ell(7, 9.8, 6.4, 5), tre(7, 9.8, 'J', 'j', 'E', -3, 3));
        g.fyll(ell(7, 7.8, 6, 4.6), (x, y) => (x - 7) + (y - 7.8) < -3.5 ? 'w' : 'W');
        // en röd målad sol på skinnet: en ring med fyra strålar
        g.fyll(utan(ell(7, 7.8, 2.2, 1.8), ell(7, 7.8, 1.1, 0.8)), 'r');
        for (const [x, y] of [[7, 4], [7, 11], [2, 8], [3, 8], [11, 8], [10, 8]]) g.satt(x, y, 'r');
        g.kontur();
        g.fyll(linje([[10.5, 9], [14.5, 2.5]], 0.6), 'J');
        g.fyll(ell(14.5, 2, 1.5, 1.5), (x, y) => x + y < 16 ? 'w' : 'W');
        const f = g.g.map(r => r.slice());
        for (let y = 0; y < 16; y++) for (let x = 12; x < 16; x++) if (f[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => f[y + dy] && 'wW'.includes(f[y + dy][x + dx] || '.'))) g.satt(x, y, 'o');
        return g.rader();
      }, L],
      ['En lyra av trä med två horn, ett tvärträ och strängar av sena.', () => {
        const g = Grid(16, 16);
        g.fyll(och(linje([[3.5, 1], [2.6, 4.5], [3.6, 9], [5.8, 12.5]], 0.75), linje([[12.5, 1], [13.4, 4.5], [12.4, 9], [10.2, 12.5]], 0.75)), tre(8, 8, 'b', 'J', 'j', -6, 4));
        g.fyll(ell(8, 13, 3.6, 2), tre(8, 13, 'b', 'J', 'j', -2, 2));
        g.fyll(linje([[2.6, 3.5], [13.4, 3.5]], 0.6), 'J');
        g.kontur();
        // strängarna från tvärträet ner till lådan
        for (const x of [6, 8, 10]) for (let y = 4; y <= 11; y++) if (g.g[y][x] === '.' || g.g[y][x] === 'o') g.satt(x, y, 'Y');
        for (const x of [6, 8, 10]) g.satt(x, 12, 'z');
        return g.rader();
      }, L]]);

  // Handel och grannar: version 2 (två hus) först, och två varianter av den
  const GRANNAR2 = ['................', '................', '...oo.......oo..', '..oJJo.....oJJo.', '.oJjjJo...oJjjJo', 'oooooooo.ooooooo', '.objjbo...objjbo', '.okoobo...obooko', '.okookoo..okooko', '.oooooo...oooooo', '................', '................', 'oggggggggggggggo', '................', '................', '................'];
  const TVA_HUS = ['................', '...oo.......oo..', '..oJJo.....oJJo.', '.oJjjJo...oJjjJo', 'oooooooo.ooooooo', '.objjbo...objjbo', '.okoobo...obooko', '.okoobo...obooko', '.oooooo...oooooo'];
  kk('grannar', 'Handel och grannar', 'Version 1 är den du valde (två hus), och version 2 och 3 är två varianter av den. Din kommentar förra gången: ”gör fler versioner av version 2”',
    [['Den du valde: två hus bredvid varandra.', GRANNAR2, KL],
      ['De två husen med en stig mellan dörrarna, över gräset: grannarna går till varandra.', () => {
        const g = Grid(16, 16);
        for (let y = 9; y < 14; y++) for (let x = 0; x < 16; x++) g.satt(x, y, hash(x, y, 4) < 0.18 ? 'G' : 'g');
        g.fyll(linje([[2.5, 9], [3, 11.2], [6, 12.2], [10, 12.2], [13, 11.2], [13.5, 9]], 0.75), (x, y) => hash(Math.floor(x), Math.floor(y), 7) < 0.25 ? 'J' : 'b');
        g.lagg(TVA_HUS, 0, 1);
        for (let x = 0; x < 16; x++) g.satt(x, 14, 'o');
        g.satt(0, 9, '.'); g.satt(0, 10, 'o'); g.satt(15, 9, 'o');
        return g.rader().map((r, y) => y >= 9 && y < 14 ? 'o' + r.slice(1, 15) + 'o' : r);
      }, KL],
      ['De två husen, grannens med rött tak, och en säck mellan dem på marken: något byts.', () => {
        const g = Grid(16, 16).lagg(TVA_HUS, 0, 1);
        // grannens tak i rött
        for (let y = 1; y <= 4; y++) for (let x = 9; x < 16; x++) { const c = g.g[y][x]; if (c === 'J') g.satt(x, y, 'R'); else if (c === 'j') g.satt(x, y, 'r'); }
        // säcken på marken mellan husen
        g.lagg(['.oo.', 'oJJo', 'objo', 'ojjo', '.oo.'], 6, 8);
        for (let x = 0; x < 16; x++) { g.satt(x, 13, x % 5 === 2 ? 'G' : 'g'); g.satt(x, 14, 'o'); g.satt(x, 12, 'o'); }
        g.satt(0, 13, 'o'); g.satt(15, 13, 'o');
        return g.rader();
      }, KL]]);
})();
