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
      ['Samma hus med en stenyxa lutad mot väggen: här byggs det.', husMed(g => {
        g.fyll(linje([[9.5, 15.5], [13.2, 9.5]], 0.55), 'J');
        g.fyll(poly([[11, 8.2], [14.6, 6.8], [15.6, 9.4], [12.4, 11]]), tre(13, 9, 'S', 's', 'q', -1.2, 1.2));
        const f = g.g.map(r => r.slice());
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (!'Ssq'.includes(f[y][x]) && !(f[y][x] === 'J' && x >= 9 && y >= 9) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => f[y + dy] && ('Ssq'.includes(f[y + dy][x + dx] || '.') || (f[y + dy][x + dx] === 'J' && x + dx >= 9 && y + dy >= 9 && f[y][x] !== 'o' && !'Ssq'.includes(f[y][x])) ))) {
          if (f[y][x] === '.' || 'bjk'.includes(f[y][x])) g.satt(x, y, 'o');
        }
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
      g.fyll(och(poly([[15.2, 0.8], [11.4, 3.2], [12.8, 4.6]]), poly([[0.8, 0.8], [4.6, 3.2], [3.2, 4.6]])), (x, y) => (x < 8 ? x - y : y - x) > 0.3 ? 'q' : 'S');
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
        return g.rader();
      }, L]]);

  // Fritid: version 2 (trumman) först, och två nya trummor och instrument
  kk('fritid', 'Fritid', 'Version 1 är den du valde (trumman), och version 2 och 3 är två nya instrument. Din kommentar förra gången: ”gör fler versioner av trummor och instrument”',
    [['Den du valde: en trumma med skinn och en pinne.', ['............oo..', '...........owo..', '..........owo...', '.........owo....', '..oooooooowooo..', '.owwwwwwwwwwwwo.', '.oWwwwwwwwwwwWo.', '.oowwwwwwwwwwoo.', '.orjrjrjrjrjrjo.', '.ojrjrjrjrjrjro.', '.orjrjrjrjrjrjo.', '.ojrjrjrjrjrjro.', '..orrrrrrrrrro..', '...oooooooooo...', '................', '................'], KL],
      ['En ramtrumma som lutar: ett tunt skinn i en träram med en röd målad ring, och en klubba med en knopp.', () => {
        const g = Grid(16, 16);
        // ramen syns som ett band av trä under skinnet, eftersom trumman lutar
        g.fyll(ell(7, 10, 6.4, 4), tre(7, 10, 'J', 'j', 'E', -3, 3));
        g.fyll(ell(7, 7.8, 6, 3.8), (x, y) => (x - 7) + (y - 7.8) < -3.5 ? 'w' : 'W');
        // en röd målad sol på skinnet: en ring med fyra strålar
        g.fyll(utan(ell(7, 7.8, 3, 1.9), ell(7, 7.8, 1.9, 0.9)), 'r');
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
        const g = Grid(16, 16).lagg(TVA_HUS, 0, 0);
        // grannens tak i rött
        for (let y = 0; y <= 4; y++) for (let x = 9; x < 16; x++) { const c = g.g[y][x]; if (c === 'J') g.satt(x, y, 'R'); else if (c === 'j') g.satt(x, y, 'r'); }
        for (let x = 0; x < 16; x++) { g.satt(x, 12, 'o'); g.satt(x, 13, x % 5 === 2 ? 'G' : 'g'); g.satt(x, 14, 'o'); }
        g.satt(0, 13, 'o'); g.satt(15, 13, 'o');
        // säcken på marken mellan husen
        g.lagg(['..oo..', '.oJJo.', 'oJbbjo', 'objjjo', 'ojjjjo', '.oooo.'], 5, 7);
        return g.rader();
      }, KL]]);
  // ---------- 9.2.53 sakerna på rutan ----------
  // spelets kartbilder (bilder/*.json, src/kartbilder.ts) av bären, svampen, rötterna och grenarna, en, två och tre på en ruta
  const SAKER = [['bar', 'bären'], ['svamp', 'svampen'], ['rotter', 'rötterna'], ['grenar', 'grenarna']];
  const farg = (B, hex) => B.P.near(rgb2lab(hex2rgb(hex)));
  // en bild ur BILDFILER med en mörkare skugga under varje kolumn
  const bild = (B, id, x0, y0, rx, ry, rw, rh) => {
    const o = BILDFILER[id], inne = (x, y) => x >= rx && y >= ry && x < rx + rw && y < ry + rh;
    o.rader.forEach((r, y) => [...r].forEach((c, x) => { if (c === '.' || !o.pal[c]) return; if (inne(x0 + x, y0 + y)) B.satt(x0 + x, y0 + y, farg(B, o.pal[c])); }));
    for (let x = 0; x < o.w; x++) { let ned = -1; o.rader.forEach((r, y) => { if (r[x] && r[x] !== '.') ned = y; }); if (ned >= 0 && inne(x0 + x, y0 + ned + 1) && !(o.rader[ned + 1] && o.rader[ned + 1][x] !== '.')) B.morka(x0 + x, y0 + ned + 1); }
  };
  // var på rutan (16 × 16) sakerna ligger, för en bild som är w × h
  const PLATS = {
    rad: (n, w, h) => { const A = [1, 2], C = [15 - w, 14 - h], t = [[0.5], [0.15, 0.85], [0, 0.5, 1]][n - 1]; return t.map(s => [A[0] + (C[0] - A[0]) * s, A[1] + (C[1] - A[1]) * s]); },
    klunga: (n, w, h) => { const cx = 8 - w / 2, cy = 8.5 - h / 2, d = [[[0, 0]], [[-0.3, -0.25], [0.3, 0.3]], [[0, -0.45], [-0.35, 0.3], [0.38, 0.35]]][n - 1]; return d.map(([a, b]) => [cx + a * w, cy + b * h]); },
    sprid: (n, w, h) => [[[8 - w / 2, 8 - h / 2]], [[1, 1.5], [15 - w, 14.5 - h]], [[1, 1], [15 - w, 3.5], [Math.min(15 - w, 5), 14.5 - h]]][n - 1],
  };
  const RUTOR = (B, rita) => {
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, B.P.i('kol', 1));
    SAKER.forEach(([id], rad) => [1, 2, 3].forEach((n, kol) => { const x0 = 2 + kol * 18, y0 = 2 + rad * 18; window.F7.gras(B, x0, y0, 16, 16); rita(id, n, x0, y0, rad * 3 + kol); }));
  };
  // spelet i dag (src/ui/vaxter.ts): små platshållare, tuvan för bären och en bild per svamp, rot och gren
  const BF = { g: '#4b4f00', G: '#647025', r: '#a14808', h: '#b2921b', H: '#906f0f', f: '#bdb39b', j: '#5e3c24', J: '#7d5b40', l: '#647025' };
  const TUVA = [['..gG..', '.gGgg.', 'gGrGgG', '.ggGg.', '..gg..'], ['..gG..', '.gGrg.', 'gGgGgG', '.rgGg.', '..gg..'], ['..gG..', '.gGrg.', 'gGgGrG', '.rgGg.', '..gg..']];
  const SMA = { svamp: ['.hh.', 'hHHh', '.ff.'], rotter: ['.l.', 'jJj', '.j.'], grenar: ['....j', '...J.', '.jJ..', 'j....'] };
  const plats = (i, j) => { const h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return h - Math.floor(h); };
  const smaBild = (B, r, x0, y0) => r.forEach((rad, y) => [...rad].forEach((c, x) => { if (BF[c]) B.satt(x0 + x, y0 + y, farg(B, BF[c])); }));
  const SATT = [
    ['rad', 'I rad: en, två eller tre av spelets bild i en sned rad över rutan, från uppe till vänster till nere till höger.'],
    ['klunga', 'I en klunga: sakerna ligger tätt ihop mitt på rutan och skymmer varandra lite, som en liten hög.'],
    ['sprid', 'Spridda: sakerna ligger var för sig, i olika hörn av rutan, som om de fallit eller vuxit där.'],
  ];
  byt({ id: 'f9_rutsaker', namn: 'Sakerna på rutan', typ: 'tre',
    vad: 'Steg 9.2.53: allt som samlas är hela saker på rutan, och bilden visar antalet. Nu används spelets egna bilder av sakerna, de som syns när någon bär dem eller när de ligger i lagret, i stället för de små platshållarna. Varje rad är en sak (bär, svamp, rötter, grenar), från vänster en, två och tre på rutan. Till vänster hur spelet ritar det i dag. Din kommentar förra gången: ”börja med att utgå från hur symbolerna ser ut idag.”',
    idag: { w: 56, h: 74, rita: B => RUTOR(B, (id, n, x0, y0, i) => {
      if (id === 'bar') { smaBild(B, TUVA[n - 1], Math.round(x0 + 2 + plats(i, 0) * 8), Math.round(y0 + 3 + plats(i, 5) * 8)); return; }
      for (let k = 0; k < n; k++) smaBild(B, SMA[id], Math.round(x0 + 1 + plats(i, 10 + k) * (id === 'grenar' ? 10 : 11)), Math.round(y0 + 1 + plats(i, 20 + k) * (id === 'grenar' ? 11 : 12)));
    }) }, idagText: 'Så ritar spelet sakerna på rutan i dag: små platshållare (bären som en tuva med ett till tre bär).',
    versioner: SATT.map(([satt, text]) => ({ text, w: 56, h: 74, rita: B => RUTOR(B, (id, n, x0, y0) => {
      const o = BILDFILER[id], pos = PLATS[satt](n, o.w, o.h).map(([x, y]) => [Math.round(x), Math.round(y)]).sort((a, b) => a[1] - b[1]);
      for (const [x, y] of pos) bild(B, id, x0 + x, y0 + y, x0, y0, 16, 16);
    }) })) });

  // ---------- 9.2.39 vedträt och vedhögen ----------
  // Ett kluvet vedträ ritas som ett tvärsnitt (en polygon, varje kant bark 'k' eller kluven yta 's') som dras ut åt
  // riktningen d: änden närmast är ändträet med årsringar, längs kroppen syns barken och de kluvna sidorna. Den
  // kluvna sidan som vetter uppåt till vänster är ljus, den andra mörkare; barken mörk med fåror på längden.
  const inPoly = (pts, x, y) => poly(pts)(x, y);
  function vedtra(spec, skala = 1) {
    const sec = spec.sec.map(([u, v]) => [u * skala, v * skala]), d = [spec.d[0] * skala, spec.d[1] * skala], pith = [spec.pith[0] * skala, spec.pith[1] * skala];
    const F = { ande: 'Y', ring: 'z', karna: 'J', kant: 'y', ljus: 'w', ljus2: 'W', mitt: 'v', mitt2: 'b', bark: 'E', bark2: 'k', ...spec.f };
    const xs = sec.flatMap(([u]) => [u, u + d[0]]), ys = sec.flatMap(([, v]) => [v, v + d[1]]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.ceil(Math.max(...xs) - x0) + 2, h = Math.ceil(Math.max(...ys) - y0) + 2;
    const cx = sec.reduce((s, p) => s + p[0], 0) / sec.length, cy = sec.reduce((s, p) => s + p[1], 0) / sec.length;
    const kanter = sec.map((a, i) => { const b = sec[(i + 1) % sec.length]; let nx = b[1] - a[1], ny = -(b[0] - a[0]); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; if (nx * ((a[0] + b[0]) / 2 - cx) + ny * ((a[1] + b[1]) / 2 - cy) < 0) { nx = -nx; ny = -ny; } return { a, b, n: [nx, ny], typ: spec.kant[i] }; });
    let s0 = 0; kanter.forEach(k => { k.s0 = s0; s0 += Math.hypot(k.b[0] - k.a[0], k.b[1] - k.a[1]); });
    const narmast = (qx, qy) => { let bast = null; for (const k of kanter) { const dx = k.b[0] - k.a[0], dy = k.b[1] - k.a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((qx - k.a[0]) * dx + (qy - k.a[1]) * dy) / L2)), dd = Math.hypot(qx - k.a[0] - t * dx, qy - k.a[1] - t * dy); if (!bast || dd < bast.dd) bast = { k, dd, s: k.s0 + t * Math.sqrt(L2) }; } return bast; };
    const g = Grid(w, h);
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const X = px + 0.5 + x0 - 1, Y = py + 0.5 + y0 - 1;
      let hit = null;
      for (let t = 0; t <= 1.0001; t += 0.02) { const qx = X - t * d[0], qy = Y - t * d[1]; if (inPoly(sec, qx, qy)) { hit = { t, qx, qy }; break; } }
      if (!hit) continue;
      const n = narmast(hit.qx, hit.qy);
      let c;
      if (hit.t === 0) { // ändträet
        const r = Math.hypot(hit.qx - pith[0], hit.qy - pith[1]);
        if (n.k.typ === 'k' && n.dd < 0.85) c = F.bark;
        else if (n.k.typ === 's' && n.dd < 0.75) c = F.kant;
        else if (r < 0.8 * skala) c = F.karna;
        else c = (r / skala) % 2 < 0.65 ? F.ring : F.ande;
      } else if (n.k.typ === 'k') {
        if (spec.bjork) c = hash(Math.floor(n.s / skala * 0.7), Math.floor(hit.t * 7), spec.fro) < 0.3 ? 'o' : (hash(Math.floor(n.s * 2), 3) < 0.3 ? F.bark2 : F.bark);
        else c = hash(Math.floor(n.s * 1.4), spec.fro || 1) < 0.38 ? F.bark2 : F.bark;
      } else {
        const ljus = -0.6 * n.k.n[0] - 0.8 * n.k.n[1] > 0.15, strimma = hash(Math.floor(n.s * 2.2), 7) < 0.22;
        c = ljus ? (strimma ? F.ljus2 : F.ljus) : (strimma ? F.mitt2 : F.mitt);
      }
      g.satt(px, py, c);
    }
    return g.kontur().rader().filter(r => /[^.]/.test(r));
  }
  const bage = (cx, cy, r, a0, a1, steg = 15) => { const p = []; for (let a = a0; a0 < a1 ? a <= a1 + 0.01 : a >= a1 - 0.01; a += a0 < a1 ? steg : -steg) p.push([cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)]); return p; };
  const kanter = (n, typ) => Array(n).fill(typ);
  const VED = [
    { text: 'En fjärdedel av en stock, kluven två gånger: kärnan i spetsen uppåt, de två kluvna sidorna ljusa, rödbrun tallbark undertill och ändträet med årsringar närmast.',
      sec: [[0, -3.6], ...bage(0, -3.6, 7.4, 48, 132, 12)], kant: ['s', ...kanter(7, 'k'), 's'], pith: [0, -3.6], d: [5.4, -3.2], f: { bark: 'j', bark2: 'E' }, fro: 3 },
    { text: 'En halv björkstock, kluven på längden: den platta kluvna sidan ljus uppåt, vit björkbark med svarta streck undertill och halva årsringarna i änden.',
      sec: bage(0, 0, 5, -20, 160, 15), kant: [...kanter(12, 'k'), 's'], pith: [0, 0], d: [5.6, -3], f: { bark: 'w', bark2: 'W', ande: 'y', ljus: 'Y', ljus2: 'y', kant: 'z' }, fro: 5, bjork: true },
    { text: 'Ett grovt vedträ som ligger ner: den kluvna ovansidan ljus, mörk granbark runt ytterkanten och ett stort ändträ med kärnan uppe i hörnet.',
      sec: [[-3.4, -2.6], [3.6, -2.6], ...bage(-3.4, -2.6, 7, 0, 90).slice(1)], kant: ['s', ...kanter(6, 'k'), 's'], pith: [-3.4, -2.6], d: [5.2, -2.6], f: { bark: 'E', bark2: 'k', ljus: 'w', ljus2: 'W' }, fro: 9 },
  ];
  // stackarna som Björn valde (f9_stackar version 1): en, några (tre i en triangel) och många (sex i en pyramid)
  const STACK = (n, w, h) => n === 1 ? [[0, 0]] : n === 3 ? [[0, 0], [w * 0.6, 0], [w * 0.3, -h * 0.5]] : [[0, 0], [w * 0.6, 0], [w * 1.2, 0], [w * 0.3, -h * 0.5], [w * 0.9, -h * 0.5], [w * 0.6, -h]];
  byt({ id: 'f9_vedhog', namn: 'Vedhögen i lagret', typ: 'tre',
    vad: 'Steg 9.2.39: vedsymbolen görs om helt. Tre nya vedträn, kluvna, med en ljus kluven sida, mörk bark och ändträet synligt. Till vänster symbolen i lagret (16 × 16 punkter), till höger samma ved på marken som en, några och många i stacken, ritade som stackarna du valde (version 1: några är tre i en triangel, många sex i en pyramid). Din kommentar förra gången: ”vi gör om hela vedsymbolen tycker jag”',
    versioner: VED.map(v => ({ text: v.text, w: 124, h: 26, rita: B => {
      for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, B.P.i('kol', 1));
      for (let y = 3; y < 23; y++) for (let x = 2; x < 22; x++) B.satt(x, y, B.P.i('ben', 2));
      let sk = 1.4, sym = vedtra(v, sk); while (sym[0].length > 16 || sym.length > 16) sym = vedtra(v, sk -= 0.05); const sw = sym[0].length, sh = sym.length;
      ritaSprite(B, sym, L, 2 + 2 + Math.floor((16 - sw) / 2), 3 + 2 + Math.floor((16 - sh) / 2));
      window.F7.gras(B, 25, 0, 99, 26);
      const liten = vedtra(v, 0.58), w = liten[0].length, h = liten.length;
      [1, 3, 6].forEach((n, j) => STACK(n, w, h).forEach(([dx, dy]) => {
        const x0 = 29 + j * 31 + Math.round(dx), y0 = 21 - h + Math.round(dy);
        ritaSprite(B, liten, L, x0, y0);
        if (dy === 0) for (let x = 1; x < w - 1; x++) B.morka(x0 + x, y0 + h);
      }));
    } })) });
})();
