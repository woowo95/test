// 7.1 Bära: bältet med krokarna, axelremmen och ryggsäcken, som saker och på bybon (på kartan och i porträttet).
// Bybon är samma man i alla bilder (fröet FRO), med rock av skinn. Det som bärs läggs som punkter ovanpå kartfiguren:
// bakom (syns bara utanför figuren), over (ovanpå) och pa (bara på figuren, t.ex. en rem över bröstet).
(() => {
  const { KORT, ell, linje, rakt, och, utan, former, bredd, lagg } = window.F7;
  const FRO = 1, MED_ROCK = 22; // en man utan rock (remmarna syns på huden) och en med rock (bältet)
  const fg = (B, s) => B.P.i(s.slice(0, -1), +s.slice(-1));
  // en rak linje av punkter från (x0, y0) till (x1, y1); farg är en ton eller farg(i, n)
  const streck = (x0, y0, x1, y1, farg) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)), ut = []; for (let i = 0; i <= n; i++) { const t = n ? i / n : 0; ut.push([Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), typeof farg === 'function' ? farg(i, n) : farg]); } return ut; };
  // en liten bild (rader och legend, 'o' = kontur) som punkter med övre vänstra hörnet i (dx, dy)
  const spr = (rader, legend, dx, dy) => { const L = { o: 'kol0', ...legend }, ut = []; rader.forEach((r, y) => [...r].forEach((ch, x) => { if (L[ch]) ut.push([dx + x, dy + y, L[ch]]); })); return ut; };
  const spegla = L => L.map(([x, y, c]) => [13 - x, y, c]);
  const bybo = (rikt, ben = 'sta', arm = 'hanga', fro = FRO) => window.BYBO ? window.BYBO(fro, rikt, ben, arm, null) : null;

  // kartfiguren med det som bärs; konturen läggs runt det som bärs där det sticker ut utanför figuren
  function figur(B, F, x0, y0, { bakom = [], over = [], pa = [] } = {}) {
    if (!F) return;
    const M = 8, W = F.w + 2 * M, H = F.h + 2 * M, g = new Array(W * H).fill(-1), fig = new Array(W * H).fill(false), egen = new Array(W * H).fill(false);
    const i = (x, y) => (y + M) * W + x + M, inne = (x, y) => x >= -M && y >= -M && x < F.w + M && y < F.h + M;
    for (const [x, y, c] of bakom) if (inne(x, y)) { g[i(x, y)] = fg(B, c); egen[i(x, y)] = true; }
    for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) { const c = F.px[y * F.w + x]; if (c >= 0) { g[i(x, y)] = c; fig[i(x, y)] = true; egen[i(x, y)] = false; } }
    for (const [x, y, c] of over) if (inne(x, y)) { g[i(x, y)] = fg(B, c); if (!fig[i(x, y)]) egen[i(x, y)] = true; }
    for (const [x, y, c] of pa) if (inne(x, y) && fig[i(x, y)] && F.px[y * F.w + x] !== fg(B, 'kol0')) g[i(x, y)] = fg(B, c);
    const ut = g.slice(), kol = fg(B, 'kol0');
    for (let y = -M; y < F.h + M; y++) for (let x = -M; x < F.w + M; x++) if (g[i(x, y)] < 0 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inne(x + dx, y + dy) && egen[i(x + dx, y + dy)])) ut[i(x, y)] = kol;
    for (let y = -M; y < F.h + M; y++) for (let x = -M; x < F.w + M; x++) { const c = ut[i(x, y)]; if (c >= 0) B.satt(x0 + x, y0 + y, c); }
    for (let x = 3; x < F.w - 3; x++) B.morka(x0 + x, y0 + F.h); // skuggan under fötterna
  }
  // porträttet (64 × 64) med ändringar: andra(x, y, c) ger en ny ton eller null
  function portratt(B, x0, y0, opt, andra = () => null) {
    const PR = window.PORTRATTEN; if (!PR) return;
    const m = PR.neutral('man'); m.alder = 'vuxen'; m.klader = { rock: 'harskinn', skor: true, balte: false }; Object.assign(m.del, opt);
    const Q = PR.portratt(m);
    for (let y = 0; y < Q.h; y++) for (let x = 0; x < Q.w; x++) { const c = Q.px[y * Q.w + x]; if (c < 0) continue; const n = andra(x, y, c); B.satt(x0 + x, y0 + y, n ? fg(B, n) : c); }
  }
  // ett band från (ax, ay) till (bx, by), b punkter brett: farg(s, t) med s tvärs över (0 … b-1) och t längs (0 … 1)
  const band = (ax, ay, bx, by, b, farg) => (x, y) => {
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy), t = ((x + 0.5 - ax) * dx + (y + 0.5 - ay) * dy) / (L * L), s = ((x + 0.5 - ax) * -dy + (y + 0.5 - ay) * dx) / L + b / 2;
    return t >= 0 && t <= 1 && s >= 0 && s < b ? farg(Math.floor(s), t, x, y) : null;
  };
  // bara på rocken (inte bakgrunden, ramen eller ansiktet): porträttets kropp börjar runt rad 49
  const paRock = (f, y0 = 49) => (x, y, c) => y >= y0 && y < 62 && x >= 2 && x < 62 && c >= 4 ? f(x, y) : null;
  const iBakgrund = (f) => (x, y, c) => y < 62 && x >= 2 && x < 62 && c < 4 ? f(x, y) : null;
  const forst = (...f) => (x, y, c) => { for (const g of f) { const v = g(x, y, c); if (v) return v; } return null; };

  // kortet: saken på marken till vänster, sedan bybon på kartan och sist porträttet
  const KANT = 4, TOPP = 8;
  function kort(text, sak, figurer, port) {
    const sw = sak ? bredd(sak[0]) : 0, fw = figurer.length * 18, w = KANT + sw + (sak ? 6 : 0) + fw + (port ? 66 : 0) + KANT, h = Math.max(TOPP + 20 + 6, port ? 72 : 0);
    return { text, w, h, rita: (B) => {
      const fot = port ? 50 : h - 6;
      if (sak) lagg(B, sak[0], sak[1], KANT, fot - sak[0].length);
      figurer.forEach(([F, lager], n) => figur(B, F(), KANT + sw + (sak ? 6 : 0) + n * 18 + 2, fot - 19, lager));
      if (port) portratt(B, w - KANT - 64, 4, port[0], port[1]);
    } };
  }

  // ---------- 7.1.1 bältet med krokarna ----------
  // framifrån hänger kniven vid höften till vänster och yxan till höger; från sidan syns kniven fram och yxan bak, och
  // västerut är österut speglad. Bältet som sak ligger i en ring med krokarna på framsidan
  const ring = (w, h, ton, krokar, extra = []) => former(w, h, [[utan(ell(w / 2, h / 2, w / 2 - 0.6, h / 2 - 0.6), ell(w / 2, h / 2 - 0.4, w / 2 - 3, h / 2 - 2.6)), ton], ...krokar, ...extra]);
  const krok = (x, y, ton) => [linje([[x, y], [x, y - 2.2], [x + 1, y - 2.8], [x + 1.8, y - 2.2]], 0.5), ton]; // en krok som står upp från ringens framkant
  const balteLager = (balte, kniv, yxa) => {
    // balte: tonen för bältet i (x) och rad; kniv och yxa: punkterna framifrån [x, y, ton, over?]
    const rad = (xs, y) => xs.flatMap(x => balte(x, y) ? [[x, y, balte(x, y)]] : []);
    const fram = { pa: [...rad([4, 5, 6, 7, 8, 9], 11), ...rad([4, 5, 6, 7, 8, 9], 12)], over: [] };
    for (const [x, y, t, o] of [...kniv, ...yxa]) (o ? fram.over : fram.pa).push([x, y, t]);
    // från sidan: kniven vid främre höften (x 8) och yxan vid den bakre (x 5); bakifrån byter de sida
    const sida = { pa: [...rad([5, 6, 7, 8], 11), ...rad([5, 6, 7, 8], 12)], over: [...kniv.map(([x, y, t]) => [8, y, t]), ...yxa.map(([x, y, t]) => [14 - x, y, t])] };
    const bak = { pa: fram.pa.filter(([, y]) => y <= 12).map(([x, y, t]) => [x, y, t]), over: [...kniv.map(([x, y, t]) => [13 - x, y, t]), ...yxa.map(([x, y, t]) => [13 - x, y, t])] };
    return { fram, sida, bak };
  };
  const BALTE = [
    { // 1: repet med två krokar av böjda grenar; kniven och yxan hänger rakt ner
      sak: () => [ring(18, 9, (x, y) => (Math.floor(x) + Math.floor(y)) % 2 ? 'R' : 'r', [krok(5.5, 7, 'k'), krok(11.5, 7, 'k')]), { R: 'ben2', r: 'ben1', k: 'jord1' }],
      lager: balteLager(() => null, // bältet som i spelet (kartfiguren ritar det)
        [[3, 12, 'jord0', 1], [3, 13, 'jord1', 1], [3, 14, 'skiffer3', 1], [3, 15, 'skiffer2', 1]],
        [[10, 12, 'jord0', 1], [9, 13, 'skiffer2', 1], [10, 13, 'skiffer1', 1], [10, 14, 'jord1', 1], [10, 15, 'jord1', 1], [10, 16, 'jord1', 1]]),
    },
    { // 2: ett brett bälte av mörkt skinn med ett spänne av ben; kniven i en slida och yxan genom en ögla
      sak: () => [ring(18, 9, (x, y) => y < 2.5 ? 'L' : y > 6.5 ? 'm' : 'l', [[och(rakt(4.5, 4, 6.5, 8.5), rakt(11.5, 4, 13.5, 8.5)), (x, y) => y < 5 ? 'm' : x < 5.5 || (x > 11.5 && x < 12.5) ? 'L' : 'l']], [[rakt(7.5, 6, 10.5, 9), (x, y) => y < 7 || x < 8.5 ? 'B' : 'b']]), { L: 'jord1', l: 'jord0', m: 'kol1', B: 'ben3', b: 'ben1' }],
      lager: balteLager(() => null, // bältet som i spelet (kartfiguren ritar det)
        [[3, 10, 'ben2', 1], [3, 11, 'ben1', 1], [3, 13, 'jord0', 1], [3, 14, 'jord0', 1], [3, 15, 'kol1', 1]],
        [[9, 10, 'skiffer2', 1], [10, 10, 'skiffer1', 1], [10, 13, 'jord1', 1], [10, 14, 'jord1', 1], [10, 15, 'jord1', 1]]),
    },
    { // 3: flätat rep med krokar av horn; kniven i en slida av skinn och yxan instucken snett
      sak: () => [ring(18, 9, (x, y) => (Math.floor(x) + (y < 4.5 ? 0 : 1)) % 2 ? 'R' : 'r', [krok(5.5, 7, 'H'), krok(11.5, 7, 'H')]), { R: 'senap2', r: 'senap1', H: 'ben3' }],
      lager: balteLager(() => null, // bältet som i spelet (kartfiguren ritar det)
        [[3, 12, 'ben3', 1], [3, 13, 'jord1', 1], [3, 14, 'jord0', 1], [3, 15, 'jord0', 1], [3, 16, 'kol1', 1]],
        [[7, 9, 'skiffer2'], [8, 9, 'skiffer1'], [7, 10, 'skiffer2'], [8, 10, 'jord1'], [9, 12, 'jord1'], [10, 13, 'jord1', 1], [10, 14, 'jord1', 1], [11, 15, 'jord1', 1]]),
    },
  ];
  const balteKort = (v, text) => { const V = BALTE[v], L = V.lager;
    const b = r => window.BYBO ? window.BYBO(MED_ROCK, r === 'vast' ? 'vast' : r, 'sta', 'hanga', null, { balte: true, krokar: 0 }) : null;
    return kort(text, null, [[() => b('fram'), L.fram], [() => b('sida'), L.sida], [() => b('bak'), L.bak], [() => b('vast'), { pa: spegla(L.sida.pa), over: spegla(L.sida.over) }]]); };

  // ---------- 7.1.2 axelremmen, med ett spjut på ryggen ----------
  // remmen går från höger axel snett ner till vänster höft; spjutet ligger snett över ryggen med spetsen upp vid vänster axel
  const spjut = (x0, y0, x1, y1) => streck(x0, y0, x1, y1, i => i === 0 ? 'skiffer3' : i === 1 ? 'skiffer2' : 'jord2');
  const AXEL = [
    { // 1: en smal rem av skinn
      sak: () => [former(14, 9, [[utan(ell(7, 4.5, 6.5, 4), ell(7, 4.5, 4, 1.8)), (x, y) => y < 3 ? 'L' : y > 6 ? 'm' : 'l'], [rakt(9, 6, 12, 9), 'r']]), { L: 'jord1', l: 'jord0', m: 'kol1', r: 'ben2' }],
      rem: (a, b, c, d) => streck(a, b, c, d, 'jord0'),
      port: forst(paRock(band(46, 48, 35, 64, 4, s => ['ben1', 'jord1', 'jord0', 'kol0'][s]))),
    },
    { // 2: ett tvinnat rep med en dyna av skinn på axeln
      sak: () => [former(14, 10, [[utan(ell(7, 4.5, 6.5, 4), ell(7, 4.5, 4.5, 2.2)), (x, y) => (Math.floor(x) + Math.floor(y)) % 2 ? 'R' : 'r'], [rakt(2, 6, 7, 10), (x, y) => y < 7 ? 'L' : 'l']]), { R: 'ben2', r: 'ben1', L: 'jord2', l: 'jord1' }],
      rem: (a, b, c, d) => streck(a, b, c, d, i => i % 2 ? 'jord2' : 'senap2'),
      port: forst(paRock(band(46, 48, 35, 64, 2, (s, t, x, y) => (x + y + s) % 3 === 0 ? 'ben1' : 'ben2')), paRock(band(47, 46, 44, 54, 5, s => s === 0 ? 'jord2' : s === 4 ? 'kol1' : 'jord1'), 46)),
    },
    { // 3: en bred rem av skinn med öglor av rep som håller spjutet
      sak: () => [former(15, 10, [[utan(ell(7.5, 5, 7, 4.5), ell(7.5, 5, 3.8, 1.6)), (x, y) => y < 3 ? 'L' : y > 7 ? 'm' : 'l'], [och(rakt(3, 1, 4, 4), rakt(11, 1, 12, 4)), 'r']]), { L: 'jord2', l: 'jord1', m: 'jord0', r: 'ben3' }],
      rem: (a, b, c, d) => [...streck(a, b, c, d, 'jord0'), ...streck(a + 1, b, c, d - 1, 'jord1')],
      ogla: true,
      port: forst(paRock(band(46, 47, 35, 64, 5, (s, t) => s === 0 ? 'ben2' : s === 4 ? 'kol0' : s === 2 && Math.floor(t * 16) % 2 === 0 ? 'ben3' : 'jord0'))),
    },
  ];
  const axelKort = (v, text) => {
    const V = AXEL[v], olja = V.ogla ? (pts) => pts : () => [];
    const fram = { bakom: spjut(12, -4, 0, 17), pa: V.rem(7, 7, 8, 12) };
    const sida = { over: [...spjut(2, -4, 5, 16), ...olja([[3, 8, 'ben3'], [4, 13, 'ben3']])], pa: V.rem(5, 7, 8, 11) };
    const bak = { over: spjut(1, -4, 12, 16), pa: [...V.rem(6, 7, 5, 12), ...olja([[3, 3, 'ben3'], [10, 13, 'ben3']])] };
    return kort(text, V.sak(), [[() => bybo('fram'), fram], [() => bybo('sida'), sida], [() => bybo('bak'), bak], [() => bybo('sida', 'gang1', 'gang1'), sida]], [{ redskap: 'redskap-flintspjut' }, V.port]);
  };

  // ---------- 7.1.3 ryggsäcken ----------
  // bakifrån syns säcken, framifrån remmarna över axlarna och från sidan säcken bakom ryggen
  // i porträttet: en form bakom axlarna (bara där bakgrunden syns), med en mörk kant mot bakgrunden
  const bakom = (inne, ton) => iBakgrund((x, y) => {
    if (!inne(x + 0.5, y + 0.5)) return null;
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !inne(x + dx + 0.5, y + dy + 0.5)) ? 'kol0' : ton(x + 0.5, y + 0.5);
  });
  const remmar = toner => [paRock(band(19, 49, 17, 64, toner.length, s => toner[s])), paRock(band(45, 49, 47, 64, toner.length, s => toner[s]))];
  const SACK = [
    // 1: en mjuk säck av skinn, ihopdragen upptill med ett rep. L är tonerna (S ljus, T mellan, s mörk, r repet, m remmarna),
    // och de tre varianterna nedan utgår från den
    ...[
      { S: 'ben2', T: 'ben1', s: 'ben0', r: 'jord1', m: 'jord0' },
      { S: 'senap3', T: 'senap2', s: 'senap1', r: 'jord1', m: 'jord0' }, // gulare: gult skinn
      { S: 'jord2', T: 'jord1', s: 'jord0', r: 'ben2', m: 'kol1' }, // mörkt skinn med ljust rep
      { S: 'senap2', T: 'ben2', s: 'ben1', r: 'rost1', m: 'jord0', ficka: true }, // ljust och gult skinn, rött rep och en ficka
    ].map(L => ({
      sak: () => [former(16, 14, [[och(linje([[4.5, 4.5], [1, 8], [3.5, 12.5]], 0.55), linje([[11.5, 4.5], [15, 8], [12.5, 12.5]], 0.55)), 'm'], [ell(8, 8.5, 5.2, 5), (x, y) => L.ficka && x > 6 && x < 10.5 && y > 8 && y < 11.5 ? (y < 9 ? 'r' : 'S') : x < 6 && y < 8 ? 'S' : x > 10 || y > 11 ? 's' : 'T'], [rakt(5, 2, 11, 4.5), (x, y) => y < 3 ? 'S' : 'T'], [rakt(4.5, 4, 11.5, 5), 'r'], [linje([[6, 2], [7, 0.6], [9, 0.6], [10, 2]], 0.5), 'r']]), L],
      bak: () => spr(['.oooooo.', 'oSSTTTTo', 'orrrrrro', 'oSTTTTso', L.ficka ? 'oSTrrrso' : 'oSTTTTso', L.ficka ? 'oSTSSTso' : 'oSTTTTso', 'oTTTTsso', '.osssso.', '..oooo..'], L, 3, 6),
      sidan: () => spr(['.oo.', 'oSTo', 'orro', 'oSTo', 'oTTo', 'oTso', 'oTso', '.oo.'], L, 1, 7),
      rem: L.m, fram: [],
      port: remmar(L.m === 'kol1' ? ['jord2', 'jord1', 'kol1', 'kol0'] : ['jord3', 'jord1', 'jord0', 'kol0']),
    })),
    { // 2: en fyrkantig packning med ett lock som viks ner och två remmar av rep
      sak: () => [former(12, 13, [[rakt(1, 2, 11, 13), (x, y) => x < 2 ? 'L' : x > 9 ? 'm' : 'l'], [rakt(0.5, 1, 11.5, 6), (x, y) => y < 2 ? 'S' : y > 5 ? 's' : 'T'], [och(rakt(3, 6, 4, 11), rakt(8, 6, 9, 11)), 'r'], [rakt(5, 5, 7, 7), 'b']]), { L: 'jord2', l: 'jord1', m: 'jord0', S: 'senap2', T: 'senap1', s: 'senap0', r: 'ben2', b: 'ben3' }],
      bak: () => spr(['oooooooo', 'oSSTTTTo', 'osTTTTso', 'oLrbbrmo', 'oLrllrmo', 'oLrllrmo', 'oLlllmmo', 'oooooooo'], { S: 'senap2', T: 'senap1', s: 'senap0', L: 'jord2', l: 'jord1', m: 'jord0', r: 'ben2', b: 'ben3' }, 3, 6),
      sidan: () => spr(['oooo', 'oSTo', 'osTo', 'oLlo', 'oLlo', 'oLlo', 'oLmo', 'oooo'], { S: 'senap2', T: 'senap1', s: 'senap0', L: 'jord2', l: 'jord1', m: 'jord0' }, 1, 6),
      rem: 'ben2', fram: [[3, 6, 'senap2'], [10, 6, 'senap1']],
      // locket sticker upp bakom båda axlarna, med rundade hörn: ljust överst och mörkt till höger
      port: [bakom(och(rakt(6, 41, 58, 56), rakt(7, 40, 57, 41)), (x, y) => y < 42.5 ? 'senap2' : y > 50 ? 'senap0' : x > 54 ? 'senap0' : (Math.floor(x) + Math.floor(y)) % 7 === 0 ? 'senap0' : 'senap1'), ...remmar(['ben3', 'ben2', 'ben0'])],
    },
    { // 3: en bärställning av två käppar med en packning av skinn fastsurrad med rep (en meis)
      sak: () => [former(14, 15, [[och(linje([[3, 0.8], [3, 13.8]], 0.7), linje([[11, 0.8], [11, 13.8]], 0.7)), (x, y) => x < 3 || (x > 10 && x < 11) ? 'K' : 'k'], [rakt(1.5, 3, 12.5, 13), (x, y) => y < 5 ? 'S' : y > 11 ? 's' : x > 10 ? 's' : 'T'], [och(rakt(1, 5.5, 13, 6.5), rakt(1, 9.5, 13, 10.5)), 'r']]), { K: 'jord3', k: 'jord2', S: 'ben2', T: 'ben1', s: 'ben0', r: 'jord0' }],
      bak: () => spr(['k......k', 'K......K', 'KooooooK', 'KSSSTTSK', 'rrrrrrrr', 'KTTTTTsK', 'KTTTTssK', 'rrrrrrrr', 'KoooooKK', 'K......K'], { K: 'jord3', k: 'jord2', S: 'ben2', T: 'ben1', s: 'ben0', r: 'jord0' }, 3, 3),
      sidan: () => spr(['K..', 'K..', 'Koo', 'KSo', 'rro', 'KTo', 'KTo', 'rro', 'Koo', 'K..', 'K..'], { K: 'jord3', S: 'ben2', T: 'ben1', r: 'jord0' }, 1, 3),
      rem: 'jord0', fram: [[3, 3, 'jord3'], [3, 4, 'jord3'], [3, 5, 'jord3'], [10, 3, 'jord3'], [10, 4, 'jord3'], [10, 5, 'jord3']],
      // käpparna sticker upp bakom axlarna, med ett rep surrat runt
      port: [bakom(och(rakt(8, 24, 12, 56), rakt(52, 24, 56, 56)), (x, y) => Math.floor(y) === 34 || Math.floor(y) === 35 ? 'ben2' : x < 9.5 || (x > 52 && x < 53.5) ? 'jord3' : x > 10.5 && x < 12 || x > 54.5 ? 'jord1' : 'jord2'), ...remmar(['jord3', 'jord1', 'jord0', 'kol0'])],
    },
  ];
  const sackKort = (v, text) => {
    const V = SACK[v], remmar = [...streck(5, 7, 5, 10, V.rem), ...streck(8, 7, 8, 10, V.rem)];
    const fram = { bakom: V.fram, pa: remmar };
    const sida = { bakom: V.sidan(), pa: streck(6, 7, 7, 10, V.rem) };
    const bak = { over: V.bak() };
    return kort(text, V.sak(), [[() => bybo('fram'), fram], [() => bybo('sida'), sida], [() => bybo('bak'), bak], [() => bybo('vast'), { bakom: spegla(sida.bakom), pa: spegla(sida.pa) }]], [{}, forst(...V.port)]);
  };

  VAL.push(
    KORT('f7_balte', 'Två redskap i bältet', 'Steg 7.1.4: bältet är ritat och finns i spelet; det som är nytt är de två redskap som hänger i dess krokar, så att händerna är fria. Bybon har bältet som i spelet, och kniven och yxan hänger i det: på kartan framifrån, från sidan, bakifrån och åt väster. Din kommentar förra gången: ”Bältet är väl redan ritat och inlagt i spelet?”', [
      balteKort(0, 'Kniven och yxan hänger rakt ner från var sin höft.'),
      balteKort(1, 'Kniven i en slida av skinn med ett ljust skaft, och yxan genom en ögla.'),
      balteKort(2, 'Kniven i en slida och yxan instucken snett med bladet upp vid midjan.'),
    ]),
    KORT('f7_axelrem', 'Axelremmen', 'Steg 7.1.2: axelremmen av skinn och rep bär ett långt redskap på ryggen. Remmen går nu brantare, nästan rakt ner från axeln. Till vänster remmen som sak, sedan bybon med ett spjut på ryggen framifrån, från sidan, bakifrån och i ett gångsteg, och sist i porträttet. Din kommentar förra gången: ”Sen måste gå i en mer lodrät vinkel”.', [
      axelKort(0, 'En smal, mörk rem av skinn.'),
      axelKort(1, 'Ett tvinnat rep med en dyna av skinn där det ligger på axeln.'),
      axelKort(2, 'En bred skinnrem med ljusa öglor av rep som håller spjutet.'),
    ]),
    KORT('f7_ryggsack', 'Ryggsäcken', 'Steg 7.1.3: ryggsäcken av skinn med remmar av rep. Du valde version 1; den står kvar som den var, och de tre nya utgår från den. Till vänster säcken som sak, sedan bybon på kartan framifrån (remmarna över axlarna), från sidan, bakifrån och åt väster, och sist i porträttet med remmarna över axlarna. Din kommentar förra gången: ”Gör tre nya versioner av version 1. Behåll originalet. Gör bland annat en gulare version”.', [
      sackKort(0, 'Version 1 som förut: en mjuk säck av ljust skinn, ihopdragen upptill med ett rep.'),
      sackKort(1, 'Gulare: samma säck av gult skinn.'),
      sackKort(2, 'Samma säck av mörkt skinn med ett ljust rep.'),
      sackKort(3, 'Samma säck av ljust, gulaktigt skinn med ett rött rep och en ficka.'),
    ]),
  );
})();
