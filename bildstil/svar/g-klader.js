// Björns svar på mössan (7.7.2), läderhjälmen (8.7.2), skölden (8.7.3), bågen (8.7.6) och bältet i lagret (9.2.34).
// Varje kort byter ut kortet med samma id i VAL. Ritfunktionerna är kopierade ur svar/b-klader.js (plaggen på
// kartfiguren och porträttet, efter fas7/7.7a-skinn-och-lader.js) och svar/e-strid.js (det man har på kartfiguren och i
// porträttet, efter fas8/8.7-strid.js), och ändrade där Björn bett om det.
(() => {
  const { hash, ell: ellF, utan, och, punkt, rakt, former, bredd, lagg } = window.F7;
  const byt = (kort) => { const i = VAL.findIndex(s => s.id === kort.id); if (i >= 0) VAL[i] = kort; else VAL.push(kort); };
  const JANEJ = (id, namn, vad, version) => ({ id, namn, typ: 'janej', vad, versioner: [version] });

  // ---------- färgerna: en bokstav per ramp och ton ('o' är konturen) ----------
  const L = {
    a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3', e: 'skiffer0', f: 'skiffer1', g: 'skiffer2', h: 'skiffer3',
    i: 'ben0', j: 'ben1', k: 'ben2', l: 'ben3', m: 'senap0', n: 'senap1', p: 'senap2', q: 'senap3',
    r: 'rost0', s: 'rost1', t: 'rost2', u: 'rost3', v: 'oliv1', w: 'oliv2', x: 'kol1', y: 'kol2', z: 'kol3', o: 'kol0',
  };
  const I = (P, ch) => typeof ch === 'number' ? ch : P.i(L[ch].slice(0, -1), +L[ch].slice(-1));
  const fg = (B, s) => B.P.i(s.slice(0, -1), +s.slice(-1));
  const RAMP = { varg: 'efgh', lader: 'abcd' };
  const T = (mat, t) => RAMP[mat][Math.max(0, Math.min(3, t))];
  const sida = (x, x0, x1) => { const u = (x - x0) / Math.max(1, x1 - x0); return u < 0.22 ? 3 : u > 0.78 ? 1 : 2; };
  const slat = (mat, x0, x1) => (x) => T(mat, sida(x, x0, x1));

  // =====================================================================================================================
  // ur b-klader.js: plaggen på kartfiguren (kladd), porträttet (PORT) och kortet (SCEN)
  // =====================================================================================================================
  const M = 3;
  function kladd(F, mal, P) {
    const W = F.w + 2 * M, H = F.h + 2 * M, g = new Array(W * H).fill(-1);
    for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) g[(y + M) * W + x + M] = F.px[y * F.w + x];
    const ute = new Uint8Array(W * H), st = [];
    for (let x = 0; x < W; x++) st.push(x, (H - 1) * W + x);
    for (let y = 0; y < H; y++) st.push(y * W, y * W + W - 1);
    while (st.length) { const i = st.pop(); if (ute[i] || g[i] > 0) continue; ute[i] = 1; const x = i % W, y = (i / W) | 0; if (x > 0) st.push(i - 1); if (x < W - 1) st.push(i + 1); if (y > 0) st.push(i - W); if (y < H - 1) st.push(i + W); }
    for (let i = 0; i < g.length; i++) if (ute[i]) g[i] = -1;
    let under = false;
    const satt = (x, y, c) => { const X = x + M, Y = y + M; if (X < 0 || Y < 0 || X >= W || Y >= H) return; g[Y * W + X] = c; if (y >= F.h && c >= 0) under = true; };
    const las = (x, y) => { const X = x + M, Y = y + M; return X < 0 || Y < 0 || X >= W || Y >= H ? -1 : g[Y * W + X]; };
    mal(satt, las, P, ch => I(P, ch));
    const ut = g.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (g[y * W + x] >= 0 || (!under && y >= F.h + M)) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < W && Y < H && g[Y * W + X] >= 0; })) ut[y * W + x] = 0;
    }
    return { w: W, h: H, px: ut, fot: F.h - 1 + M };
  }
  const figurPlagg = (mal, P, fro, rikt = 'fram') => { const F = window.BYBO && window.BYBO(fro || 1, rikt, 'sta', 'hanga', null); return F ? kladd(F, mal, P) : null; };
  // porträttet (64 × 64): andra(x, y, c) ger en ny ton eller null, person ändrar personen (hud, hår)
  function portrattB(B, x0, y0, andra = () => null, person = {}) {
    const PR = window.PORTRATTEN; if (!PR) return;
    const m = PR.neutral('man'); m.alder = 'vuxen'; m.klader = { rock: 'harskinn', skor: true, balte: false }; Object.assign(m, person);
    const Q = PR.portratt(m);
    for (let y = 0; y < Q.h; y++) for (let x = 0; x < Q.w; x++) { const c = Q.px[y * Q.w + x]; if (c < 0) continue; const n = andra(x, y, c); B.satt(x0 + x, y0 + y, n ? fg(B, n) : c); }
  }
  const PORT = (lista, tunt = [], person = {}) => (B, x0, y0) => {
    const ram = (f) => (x, y) => x >= 2 && x < 62 && y >= 2 && y < 62 && f(x, y);
    const g = former(64, 64, lista.map(([f, t]) => [ram(f), t])), h = tunt.length ? former(64, 64, tunt.map(([f, t]) => [ram(f), t]), false) : null;
    portrattB(B, x0, y0, (x, y) => {
      if (x < 2 || x >= 62 || y < 2 || y >= 62) return null;
      const t = h && h[y][x] !== '.' ? h[y][x] : g[y][x];
      return t === '.' ? null : L[t];
    }, person);
  };
  // kortet: saken till vänster, figurerna med fötterna på samma rad och sist porträttet (om det finns)
  const SCEN = (text, rader, figurer = [], opt = {}) => {
    const m = 4, mellan = 7, fw = 14 + 2 * M, sw = rader ? bredd(rader) : 0, pw = opt.port ? 64 + mellan : 0;
    const h = Math.max(Math.max(rader ? rader.length : 0, figurer.length ? 20 + M : 0) + 2 * m, opt.port ? 72 : 0), fot = h - m - 1;
    const w = m + sw + (rader && figurer.length ? mellan : 0) + figurer.length * (fw + 1) + pw + m;
    return { text, w, h, rita: (B) => {
      if (rader) lagg(B, rader, L, m, (opt.sakY !== undefined ? opt.sakY(h) : fot - rader.length + 1));
      figurer.forEach(([mal, fro, rikt], n) => {
        const G = figurPlagg(mal, B.P, fro, rikt); if (!G) return;
        const x0 = m + sw + (rader ? mellan : 0) + n * (fw + 1), y0 = fot - G.fot;
        for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) { const c = G.px[y * G.w + x]; if (c >= 0) B.satt(x0 + x, y0 + y, c); }
        let sista = -1; for (let y = G.h - 1; y >= 0 && sista < 0; y--) for (let x = 0; x < G.w; x++) if (G.px[y * G.w + x] >= 0) { sista = y; break; }
        for (let x = 0; x < G.w; x++) if (G.px[sista * G.w + x] >= 0) B.morka(x0 + x, y0 + sista + 1);
      });
      if (opt.port) opt.port(B, w - m - 64, Math.floor((h - 64) / 2));
    } };
  };

  // =====================================================================================================================
  // 7.7.2 mössan: version 2, kullen av läder med en kant av vargpäls
  // =====================================================================================================================
  // Porträttet är detsamma som förut (version 3 i det första kortet, smalare). Björn: "den ser bra ut i porträttet men
  // konstigt på den lilla gubben och som föremål i lagret", och sedan "fortfarande samma fel". På kartan var kullen tre
  // rader hög och lika smal som huvudet, med pälskanten i en tunn grå rad, och ögonen (en grå punkt var) under den: det
  // såg ut som ett band eller glasögon på ett avlångt huvud. Nu sitter mössan som hjälmen: kullen två rader ovanför
  // huvudet, rundad överst, och pälskanten en punkt bredare än huvudet på varje sida, med ändarna ner över tinningarna
  // som de rundade ändarna i porträttet. Pannan mitt fram är fri, så att ögonen inte hänger under pälsen.
  const pmossa = () => {
    const a0 = 12, a1 = 52;
    return PORT([ // en kulle av läder med en bred, uppvikt pälskant
      [utan(ellF(32, 15, 17.5, 12.5), (x, y) => y > 16), (x) => slat('lader', 15, 49)(x)],
      [och(rakt(a0, 13, a1, 22), ellF(32, 13.5, 20, 3), ellF(a0 + 0.5, 17.5, 1.5, 4.5), ellF(a1 - 0.5, 17.5, 1.5, 4.5)), (x, y) => { const r = hash(Math.floor(x), Math.floor(y), 11); const t = sida(x, a0 - 1, a1 + 1); return T('varg', r < 0.18 ? t + 1 : r > 0.84 ? t - 1 : t); }],
      [rakt(a0 + 1, 12, a1 - 1, 14), (x, y) => (hash(Math.floor(x), 7, 2) < 0.5 ? 'h' : 'g')],
      [rakt(a0 + 1, 21, a1 - 1, 22), (x) => (x > 46 ? 'e' : 'f')],
    ], [[och(punkt(32, 4), punkt(31, 5), punkt(32, 6), punkt(31, 7), punkt(32, 8)), 'a'], [och(punkt(24, 7), punkt(40, 7)), 'b']], { har: 5 });
  };
  // på kartfiguren: huvudet är raderna 1–6 (x 4–9 framifrån och bakifrån, 5–10 från sidan), håret ligger i rad 1 och
  // ögonen i rad 3. Kullen i rad -1 och 0 (ovanför huvudet), pälskanten i rad 1 och ändarna i rad 2
  const mossKarta = (rikt) => (satt, las, P, C) => {
    const s = rikt === 'sida' ? 1 : 0, xa = 4 + s, xb = 9 + s; // huvudets bredd
    const lader = (x, x0, x1) => T('lader', sida(x, x0, x1));
    // kullen av läder (rad -1 smal, rad 0 lika bred som huvudet): ljus till vänster, mörk till höger
    for (let x = xa + 1; x <= xb - 1; x++) satt(x, -1, C(lader(x, xa + 1, xb - 1)));
    for (let x = xa; x <= xb; x++) satt(x, 0, C(lader(x, xa, xb)));
    // pälskanten: rad 1, en punkt bredare än huvudet på varje sida, ljus och ojämn som päls och mörkare åt höger; ändarna
    // går ner över tinningarna i rad 2 (från sidan över nacken), som de rundade ändarna i porträttet. Pannan mellan dem är
    // fri, så att ögonen inte ligger direkt under den grå pälsen (det var det som såg ut som glasögon)
    const k0 = xa - 1, k1 = xb + 1, u = x => (x - k0) / (k1 - k0);
    for (let x = k0; x <= k1; x++) satt(x, 1, C(u(x) > 0.85 ? 'f' : x % 3 === 1 ? 'g' : 'h'));
    for (const x of s ? [xa - 1, xa, xa + 1] : [xa - 1, xa, xb, xb + 1]) satt(x, 2, C(u(x) > 0.8 ? 'e' : u(x) < 0.15 ? 'g' : 'f'));
  };
  // som sak i lagret: en symbol på 16 × 16 punkter som de andra sakerna. Kullen av brunt läder snett framifrån, ljus till
  // vänster, med en söm och en knut i toppen, och den tjocka, grå kanten av vargpäls nertill, bredare än kullen
  const MOSSA_SYM = [
    '................',
    '................',
    '.......oo.......',
    '......obao......',
    '....odccbbbo....',
    '...oddcbcbbbo...',
    '..oddccccbbbao..',
    '..odcccbccbbao..',
    '.oddccccbbbbaao.',
    'ohhghhghhgghgfgo',
    'ohghhgghgggfgffo',
    'ogghgggfgffefefo',
    '.offgffffefeeeo.',
    '..oooooooooooo..',
    '................',
    '................',
  ];
  // lagrets mark: nedtrampad jord, som lagerplatserna
  const LAGERMARK = (B, x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) B.satt(x, y, B.P.i('jord', hash(x, y, 5) < 0.12 ? 2 : 3)); };
  {
    const scen = SCEN('Mössan som symbol i lagret, på bybon på kartan framifrån, från sidan och bakifrån, och i porträttet.', null,
      [[mossKarta('fram'), 22, 'fram'], [mossKarta('sida'), 22, 'sida'], [mossKarta('bak'), 22, 'bak']], { port: pmossa() });
    // symbolen till vänster, på lagrets jord i en ruta av 16 × 16
    const sw = 16 + 4, rita0 = scen.rita;
    const kort = { text: scen.text, w: scen.w + sw + 3, h: scen.h, rita: (B) => {
      LAGERMARK(B, 4, scen.h - 4 - 16 - 3, 16, 16);
      lagg(B, MOSSA_SYM.filter(r => /[^.]/.test(r)), L, 4, scen.h - 4 - 16 - 3 + 2, false);
      const dx = sw + 3; // resten av kortet förskjutet åt höger
      rita0({ ...B, satt: (x, y, c, l) => B.satt(x + dx, y, c, l), morka: (x, y) => B.morka(x + dx, y), get: (x, y) => B.get(x + dx, y) });
    } };
    byt(JANEJ('f7_mossa', 'Mössan', 'Steg 7.7.2: en mössa av 1 skinn som håller huvudet varmt. Du valde version 2, kullen av läder med en kant av vargpäls. Porträttet är detsamma. Nytt: på bybon på kartan sitter mössan nu på huvudet som hjälmen: en rundad kulle av läder och pälskanten lite bredare än huvudet, med ändarna ner över tinningarna som i porträttet, och pannan fri över ögonen, så att den inte längre ser ut som ett band eller glasögon. Som föremål i lagret är mössan en symbol på 16 × 16 punkter som de andra sakerna: läderkullen med söm och knut och den tjocka pälskanten. Från vänster: symbolen i lagret, bybon framifrån, från sidan och bakifrån, och porträttet. Din kommentar förra gången: ”fortfarande samma fel” (och innan dess: ”den ser bra ut i porträttet men konstigt på den lilla gubben och som föremål i lagret.”)', kort));
  }

  // =====================================================================================================================
  // ur e-strid.js: det man har på kartfiguren och i porträttet
  // =====================================================================================================================
  const ell = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const ror = (pts, r0, r1 = r0) => (x, y) => {
    let bast = null;
    for (let n = 0; n < pts.length - 1; n++) {
      const [ax, ay] = pts[n], [bx, by] = pts[n + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
      const u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), t = (n + u) / (pts.length - 1), r = r0 + (r1 - r0) * t;
      const px = ax + u * dx, py = ay + u * dy, d = Math.hypot(x - px, y - py);
      if (d <= r && (!bast || d / r < bast.q)) bast = { t, q: d / r, ljus: d ? ((px - x) + (py - y)) / (d * Math.SQRT2) * (d / r) : 0 };
    }
    return bast;
  };
  const kurva = (a, b, bula, n = 16, extra = () => [0, 0]) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), nx = dy / len, ny = -dx / len;
    return [...Array(n + 1)].map((_, i) => { const t = i / n, s = bula * Math.sin(Math.PI * t), [ex, ey] = extra(t); return [a[0] + dx * t + nx * s + ex, a[1] + dy * t + ny * s + ey]; });
  };
  const ton3 = (l, ljus, mellan, mork, g = 0.3) => l > g ? ljus : l < -g ? mork : mellan;
  const fyll = (satt, x0, y0, x1, y1, f) => { for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) { const c = f(x + 0.5, y + 0.5); if (c) satt(x, y, c); } };
  const sp = (satt, rader, dx, dy) => rader.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.') satt(dx + x, dy + y, c); }));
  const streck = (x0, y0, x1, y1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)), ut = []; for (let i = 0; i <= n; i++) { const t = n ? i / n : 0; ut.push([Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), t]); } return ut; };
  const kurvPkt = (a, b, bula) => { const pts = kurva(a, b, bula, 40), set = new Map(); pts.forEach(([x, y], i) => { const k = Math.round(x) + ',' + Math.round(y); if (!set.has(k)) set.set(k, [Math.round(x), Math.round(y), i / 40]); }); return [...set.values()]; };
  const GAMMAL = { y: 'p', w: 'k', W: 'l', r: 't', s: 'f', S: 'g', T: 'h' };
  const gammal = rader => rader.map(r => [...r].map(c => GAMMAL[c] || c).join(''));

  // kartfiguren: mal(f) ritar med f.o (ovanpå), f.b (bakom: bara där figuren inte finns) och f.p (bara på figuren), och
  // läser figurens färg med f.las. Ytterkonturen tas bort först och läggs sedan runt allt igen.
  const FRO = 22, MF = 6;
  function figurE(F, mal, P) {
    const W = F.w + 2 * MF, H = F.h + 2 * MF, g = new Array(W * H).fill(-1);
    for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) g[(y + MF) * W + x + MF] = F.px[y * F.w + x];
    const forr = g.slice(), ute = new Uint8Array(W * H), st = [];
    for (let x = 0; x < W; x++) st.push(x, (H - 1) * W + x);
    for (let y = 0; y < H; y++) st.push(y * W, y * W + W - 1);
    while (st.length) { const i = st.pop(); if (ute[i] || g[i] > 0) continue; ute[i] = 1; const x = i % W, y = (i / W) | 0; if (x > 0) st.push(i - 1); if (x < W - 1) st.push(i + 1); if (y > 0) st.push(i - W); if (y < H - 1) st.push(i + W); }
    for (let i = 0; i < g.length; i++) if (ute[i]) g[i] = -1;
    const g0 = g.slice();
    let under = false;
    const put = sorts => (x, y, ch) => {
      const X = x + MF, Y = y + MF; if (X < 0 || Y < 0 || X >= W || Y >= H) return; const i = Y * W + X;
      if (sorts === 'b' && forr[i] >= 0) return;
      if (sorts === 'p' && g0[i] <= 0) return;
      g[i] = I(P, ch); if (y >= F.h) under = true;
    };
    mal({ o: put('o'), b: put('b'), p: put('p'), las: (x, y) => { const X = x + MF, Y = y + MF; return X < 0 || Y < 0 || X >= W || Y >= H ? -1 : g0[Y * W + X]; } });
    const ut = g.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (g[y * W + x] >= 0 || (!under && y >= F.h + MF)) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < W && Y < H && g[Y * W + X] >= 0; })) ut[y * W + x] = 0;
    }
    return { w: W, h: H, px: ut };
  }
  // porträttet: f.b bakom (bara där bakgrunden syns), f.f framför (över allt) och f.r på rocken
  function portrattE(B, x0, y0, mal) {
    const PR = window.PORTRATTEN; if (!PR) return;
    const m = PR.neutral('man'); m.alder = 'vuxen'; m.klader = { rock: 'harskinn', skor: true, balte: false };
    const Q = PR.portratt(m), W = Q.w, g = Q.px.slice(), typ = new Uint8Array(W * Q.h);
    const inne = (x, y) => x >= 2 && y >= 2 && x < W - 2 && y < Q.h - 2;
    const put = sorts => (x, y, ch) => {
      if (!inne(x, y)) return; const i = y * W + x, c0 = Q.px[i];
      if (sorts === 1 && (c0 >= 4 || c0 === 0)) return;
      if (sorts === 3 && (y < 48 || c0 < 4)) return;
      g[i] = I(B.P, ch); if (sorts !== 3) typ[i] = sorts;
    };
    mal({ b: put(1), f: put(2), r: put(3) });
    const ut = g.slice();
    for (let y = 2; y < Q.h - 2; y++) for (let x = 2; x < W - 2; x++) {
      const i = y * W + x; if (typ[i]) continue;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => typ[(y + dy) * W + x + dx]);
      if (n.includes(2) || (n.includes(1) && Q.px[i] < 4 && g[i] === Q.px[i])) ut[i] = 0;
    }
    for (let y = 0; y < Q.h; y++) for (let x = 0; x < W; x++) { const c = ut[y * W + x]; if (c >= 0) B.satt(x0 + x, y0 + y, c); }
  }
  // kortet: saken på marken, bybon på kartan ([riktning, armläge, mal]) och porträttet
  const KANT = 4, FOT = 64, PLATS = 22;
  function kortE(text, sak, figurer, port) {
    const sw = sak ? bredd(sak) : 0, w = KANT + sw + 4 + figurer.length * PLATS + 2 + 64 + KANT, h = 72;
    return { text, w, h, rita: (B) => {
      if (sak) lagg(B, sak, L, KANT, FOT - sak.length);
      figurer.forEach(([rikt, arm, mal], n) => {
        const F = window.BYBO ? window.BYBO(FRO, rikt, 'sta', arm, null) : null; if (!F) return;
        const x0 = KANT + sw + 4 + n * PLATS + 4, y0 = FOT - 20;
        for (let x = 3; x < F.w - 3; x++) B.morka(x0 + x, y0 + F.h);
        const G = figurE(F, mal, B.P);
        for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) { const c = G.px[y * G.w + x]; if (c >= 0) B.satt(x0 - MF + x, y0 - MF + y, c); }
      });
      if (port) portrattE(B, w - KANT - 64, 4, port);
    } };
  }

  // =====================================================================================================================
  // 8.7.2 läderhjälmen, version 1: ett mellanting
  // =====================================================================================================================
  // Först stack den ut en punkt på varje sida av huvudet (och kanten i porträttet långt utanför skallen), sedan låg den
  // tätt som en kalott målad på huvudet. Mellantinget: på kartan är kullen rundare och en rad högre, och hjälmen går ner
  // över tinningarna (där håret annars syns), så att den omsluter huvudet utan att bli bredare än det; bara kanten sticker
  // ut, och bara som en mörk punkt i konturen. I porträttet är kullen lite större än skallen (men mindre än den första),
  // och kanten slutar en bit utanför huvudet med rundade ändar.
  const HJALM_SAK = gammal(['.....oooooo.....', '....obbbbbbo....', '...obcccccbbo...', '...obcccccbbo...', '...oooooooooo...', '...o........o...']);
  {
    // framifrån och bakifrån: rad -2 till 2 (huvudet börjar i rad 1); 'x' är kanten som går ihop med konturen
    const FRAM = ['...dcb...', '..dccbb..', '.ddccbba.', '.cbaaaab.', '.b....a..'];
    const SIDA = ['...dccb..', '..dcccbb.', '.ddccbbba', '.cbaaaaab', '.b.......'];
    const ny = kortE('Version 1, kalotten med kanten, ett mellanting: rundare och lite större än huvudet, ner över tinningarna, men kanten sticker inte ut på sidorna.', HJALM_SAK, [
      ['fram', 'hanga', f => sp(f.o, FRAM, 2, -2)],
      ['sida', 'hanga', f => sp(f.o, SIDA, 3, -2)],
      ['bak', 'hanga', f => sp(f.o, FRAM, 2, -2)],
    ], p => {
      // kalotten över skallen: lite större än skallen (rx 18,3 i stället för 17,6 och 19), och kanten med rundade ändar
      // som slutar en bit utanför huvudet (x 12,5–50,5 i stället för 13,9–49,1 och 11–52)
      const kal = ell(31.5, 21.8, 18.3, 16.8);
      fyll(p.f, 2, 2, 61, 26, (x, y) => {
        if (y > 23.6) return null;
        const kant = y > 20 && (ell(31.5, 22.3, 19, 2.6)(x, y) || (x > 14 && x < 49));
        if (!kal(x, y) && !kant) return null;
        if (y > 20) return y > 22.6 ? 'a' : x < 18 ? 'c' : 'b'; // kanten
        const u = (x - 13.2) / 36.6, som = [-0.55, 0, 0.55].some(k => Math.abs((x - 31.5) - k * 18.3 * Math.sqrt(Math.max(0, 1 - ((21.8 - y) / 16.8) ** 2))) < 0.6);
        if (som && y > 7) return 'b';
        if (ell(24, 12, 5, 3.5)(x, y)) return 'd';
        return u < 0.16 ? 'd' : u > 0.8 ? 'b' : 'c';
      });
    });
    byt(JANEJ('f8_hjalm', 'Läderhjälmen', 'Steg 8.7.2: av 2 läder och 1 rep. Tar bort en del av slagen mot huvudet. Version 1, ritad som ett mellanting mellan de två förra: den sticker inte ut på sidorna som den första, men ligger inte heller tätt som den andra. På kartan är kullen rundare och en rad högre och går ner över tinningarna; i porträttet är kullen lite större än skallen och kanten slutar strax utanför huvudet, med rundade ändar. Din kommentar förra gången: ”hitta ett mellanting nu ser den för tight ut”', ny));
  }

  // =====================================================================================================================
  // 8.7.3 skölden, version 1: framför kroppen på kartan
  // =====================================================================================================================
  // Björn valde version 1 och tyckte att porträttet är bra. Framifrån på kartan låg skölden bredvid bybon med en mörk kant
  // mot kroppen, så att den såg ut att vara bakom honom. Nu hålls den i handen framför kroppen: den täcker armen och en
  // del av bålen, och en mörk kontur skiljer den från kroppen, så att den syns framför. Från sidan och bakifrån som förut.
  const SKOLDAR = [{ rund: false, yta: ['d', 'c', 'b'], as: ['d', 'd', 'a'], kant: null, fog: false }];
  const hasha = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const skoldYta = (v, w, h, ligg, m) => (x, y) => {
    const o = SKOLDAR[v], [A, Lg, AW, LW] = ligg ? [y, x, h, w] : [x, y, w, h];
    const inne = (a, l) => { const u = Math.abs(a - AW / 2) / (AW / 2), t = Math.abs(l - LW / 2) / (LW / 2); return o.rund ? u ** 2.4 + t ** 2.4 <= 1 : u ** (m.exp || 6) + t ** (m.exp || 6) <= 1; };
    if (!inne(A, Lg)) return null;
    const da = A - AW / 2, dl = Lg - LW / 2, r = m.r;
    if (o.kant && [[r, 0], [-r, 0], [0, r], [0, -r]].some(([p, q]) => !inne(A + p, Lg + q))) return o.kant;
    const bred = d => m.bw * Math.max(0, 1 - (d / m.bl) ** 2), buckla = (a, d) => Math.abs(d) < m.bl && Math.abs(a) <= Math.max(bred(d), m.sw);
    if (buckla(da, dl)) {
      const bb = Math.max(bred(dl), 0.5), s = da / bb + dl / m.bl * 0.7;
      return s > 0.6 ? o.as[2] : s < -0.2 ? o.as[0] : o.as[1];
    }
    if (Math.abs(da) <= m.sw) return m.sw < 1 ? o.as[0] : da > m.sw / 3 ? o.as[2] : o.as[0];
    if (buckla(da - 1, dl - 1)) return o.yta[2];
    if (o.fog && [-1, 1].some(k => Math.abs(da - k * AW * 0.3) < 0.5)) return o.yta[2];
    if (m.korn && hasha(Math.floor(da), Math.floor(dl / 9)) < 0.05) return o.yta[2];
    if (!m.korn) return o.yta[1];
    return da > AW * 0.36 ? o.yta[2] : da < -AW * 0.36 ? o.yta[0] : o.yta[1];
  };
  const SMA = { sw: 0.5, bw: 1.5, bl: 2.6, r: 0.8 };
  {
    const SAK = (() => { const t = skoldYta(0, 14, 5, true, SMA); return former(16, 7, [[(x, y) => !!t(x - 1, y - 1), (x, y) => t(x - 1, y - 1)]]); })();
    const tunn = (w, h) => { const t = skoldYta(0, w, h, false, SMA); return former(w, h, [[(x, y) => !!t(x, y), (x, y) => t(x, y)]], false); };
    const FIG = tunn(5, 9), FIG_BAK = tunn(5, 9).map(r => (r[0] === '.' ? '.' : 'a') + r.slice(1));
    const SIDA = ['c.', 'cc', 'cc', 'cc', 'ccc', 'ccc', 'cca', 'cc', 'cc', 'cc', 'c.'];
    // framför kroppen: skölden ritas ovanpå, och där den gränsar till figuren får den en mörk kontur
    const framfor = (f, rader, dx, dy) => {
      const S = new Set();
      rader.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.') S.add((dx + x) + ',' + (dy + y)); }));
      for (const k of S) for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const [x, y] = k.split(',').map(Number), X = x + ax, Y = y + ay;
        if (!S.has(X + ',' + Y) && f.las(X, Y) > 0) f.o(X, Y, 'o');
      }
      sp(f.o, rader, dx, dy);
    };
    const ny = kortE('Version 1, en bräda ljust trä med åsen och bucklan. Framifrån på kartan hålls den i handen framför kroppen, över armen och en del av bålen, med en mörk kontur mot kroppen; porträttet som förut.', SAK, [
      ['fram', 'hanga', f => framfor(f, FIG, 0, 9)],
      ['sida', 'framfor', f => { sp(f.o, SIDA, 10, 5); f.o(10, 10, f.las(9, 10)); }],
      ['bak', 'hanga', f => sp(f.o, FIG_BAK, 11, 7)],
    ], p => {
      const x0 = -2, y0 = 40, t = skoldYta(0, 27, 54, false, { sw: 1.4, bw: 5, bl: 10, r: 2, korn: true, exp: 3 });
      fyll(p.f, 0, 36, 34, 61, (x, y) => t(x - x0, y - y0));
    });
    byt(JANEJ('f8_skold', 'Skölden', 'Steg 8.7.3: av 3 ved och 1 rep, hålls i en hand och slits som ett redskap. Du valde version 1, den avlånga skölden av en enda bräda ljust trä, som Hjortspringsköldarna. Porträttet är detsamma. Nytt: framifrån på kartan hålls skölden nu i handen framför kroppen, över armen och en del av bålen, med en mörk kontur mot kroppen, så att den syns framför bybon i stället för bakom. Från sidan och bakifrån som förut. Din kommentar förra gången: ”skölden ser ut att gå bakom karaktären i det lilla porträttet när den står mot kameran. Porträttet är bra”', ny));
  }

  // =====================================================================================================================
  // 8.7.6 bågen: på ryggen från alla håll, som bakifrån
  // =====================================================================================================================
  // Björn: bakifrån är bågen rätt (snett över ryggen från höger axel ner till vänster höft, med strängen). Framifrån och
  // från sidan hängde den i handen; nu hänger den på ryggen likadant, och bara de delar som syns runt kroppen ritas:
  // framifrån övre ändan över hans högra axel (till vänster i bilden) och nedre ändan vid andra höften, från sidan bågen
  // längs ryggen. I porträttet syns den övre ändan tydligt över axeln, med strängen, ritad som i den lilla bakvända bilden.
  // fem bågar, ritade av Claude, som själv bedömer vilken som är bäst (BAGE_BAST): ljust virke, gult virke med lindat grepp,
  // mörkt virke med svart spets, ljust virke med lindat grepp och mellanbrunt virke med mörka ändar
  const BAGEVAR = [
    { tra: ['d', 'c', 'b'], grepp: 'b', spets: 'b', rep: 'k', bula: 4 },
    { tra: ['q', 'p', 'n'], grepp: 'a', spets: 'a', rep: 'l', bula: 3.6 },
    { tra: ['c', 'b', 'a'], grepp: 'p', spets: 'k', rep: 'k', bula: 2.8 },
    { tra: ['d', 'c', 'b'], grepp: 'p', spets: 'p', rep: 'k', bula: 3.2 },
    { tra: ['q', 'p', 'n'], grepp: 'a', spets: 'k', rep: 'l', bula: 3.4 },
  ];
  const BAGE_BAST = 1; // den gula bågen med lindat grepp: den syns tydligast mot gräset och mot porträttets mörka botten
  let BAGE = BAGEVAR[BAGE_BAST];
  const BH = 22;
  const bageSak = () => {
    const o = BAGE, pts = kurva([7.5, 0.8], [7.5, BH - 0.8], o.bula, 20), stav = ror(pts, 0.9, 0.9);
    const topp = pts[0], botten = pts[pts.length - 1];
    return former(10, BH, [
      [ror([[topp[0] + 0.2, topp[1] + 0.6], [botten[0] + 0.2, botten[1] - 0.6]], 0.45), o.rep],
      [(x, y) => !!stav(x, y), (x, y) => { const r = stav(x, y); if (r.t < 0.07 || r.t > 0.93) return o.spets; if (Math.abs(r.t - 0.5) < 0.07) return o.grepp; return ton3(r.ljus, ...o.tra, 0.2); }],
    ]);
  };
  const bageFig = (f, a, b, bula, satt = f.o, rep = f.b) => {
    const o = BAGE;
    for (const [x, y] of streck(a[0], a[1], b[0], b[1])) rep(x, y, o.rep);
    for (const [x, y, t] of kurvPkt(a, b, bula)) satt(x, y, t < 0.08 || t > 0.92 ? o.spets : Math.abs(t - 0.5) < 0.08 ? o.grepp : t < 0.5 ? o.tra[1] : o.tra[2]);
  };
  {
    const ny = kortE('Den bästa av fem bågar, en gul båge med lindat grepp och mörka ändar, på ryggen. På kartan hänger den likadant från alla håll: bakifrån snett över ryggen, framifrån övre ändan över axeln, strängen snett över bröstet och nedre ändan vid höften, och från sidan längs ryggen. I porträttet syns bågen bakom huvudet från övre ändan över axeln, och strängen går snett över bröstet.', bageSak(), [
      // framifrån: bakifrån speglad, bakom kroppen
      ['fram', 'hanga', f => bageFig(f, [1, 1], [12, 16], -2, f.b, (x, y, c) => (y >= 7 ? f.o : f.b)(x, y, c))],
      // från sidan: bågen ligger platt mot ryggen och syns nästan från kanten, från över axeln ner bakom benen
      ['sida', 'hanga', f => bageFig(f, [5, -1], [2, 16], -1, f.b, f.b)],
      ['bak', 'hanga', f => bageFig(f, [12, 1], [1, 16], 2, f.o, f.o)],
    ], p => {
      // som bakifrån, sedd framifrån: övre ändan över hans högra axel (till vänster i bilden), staven böjd utåt och
      // strängen rak in mot nacken; resten är dold bakom kroppen
      const a = [5, 3], b = [68, 112], pts = kurva(a, b, 14, 48), stav = ror(pts, 2.1, 2.1), rep = ror([a, b], 0.62);
      const skugga = ror([[a[0], a[1] + 1.2], [b[0], b[1] + 1.2]], 0.62);
      fyll(p.b, 2, 2, 61, 61, (x, y) => rep(x, y) ? BAGE.rep : null);
      // på bröstet går strängen snett över rocken som i den bakvända bilden, med en mörk skuggrad under
      fyll(p.r, 2, 2, 61, 61, (x, y) => rep(x, y) ? BAGE.rep : skugga(x, y) ? 'a' : null);
      fyll(p.b, 2, 2, 61, 61, (x, y) => { const r = stav(x, y); if (!r) return null; if (r.t < 0.03) return BAGE.spets; return ton3(r.ljus, ...BAGE.tra); });
    });
    byt(JANEJ('f8_bage', 'Bågen', 'Steg 8.7.6: bågen av 2 virke och 1 rep, den enkla bågen av ljust virke. Bakifrån som förut, snett över ryggen. Nytt: framifrån och från sidan hänger bågen nu på ryggen likadant i stället för i handen. Framifrån syns övre ändan över axeln, strängen snett över bröstet och nedre ändan vid höften; från sidan bågen längs ryggen. I porträttet är bågen ritad som i den lilla bakvända bilden och syns mycket mer: den stora böjda staven bakom huvudet från övre ändan över axeln, och strängen snett över bröstet. Du bad mig rita fem versioner och själv lägga upp den bästa av dem: det här är den bästa av fem, en gul båge med lindat grepp och mörka ändar (de andra fyra var den ljusa bågen som förut, en mörk båge med svart spets, en ljus båge med lindat grepp och en mellanbrun med mörka ändar). Jag valde den gula för att den syns tydligast mot gräset på kartan och mot porträttets mörka botten. Din kommentar förra gången: ”gör 5 versioner som du själv bedömer och lägg upp den bästa av dem 5”', ny));
  }

  // =====================================================================================================================
  // 9.2.34 bältet: på bybon och som symbol i lagret
  // =====================================================================================================================
  // Bältet är Björns val f7_balte, version 1: ett tvinnat rep i två toner (senap) med två krokar av böjda grenar. På
  // kartfiguren ritar skaparen det som spelet (en rad över midjan, krokarna vid höfterna). I lagret ligger det mindre
  // bältet (12 × 6 i stället för 18 × 9) på jorden bredvid en kniv och en yxa i samma skala, och i inventoryt är symbolen
  // bilden mitt i rutan på 16 × 16 punkter, bredvid kniven och yxan som de ser ut i dag.
  {
    const BL = { a: 'kol0', b: 'senap2', c: 'senap1', d: 'jord1' };
    const BALTE_NY = ['..aaaaaaaa..', '.abcbcbcbca.', 'abaaaddaaaba', 'acaadaadaaca', '.acbcbcbcba.', '..aaaaaaaa..'];
    const ikon = (B, k, x0, y0, s = 1) => { const r = IKONER.PIX[k], pal = IKONER.PAL[k] || {}; if (!r) return; r.forEach((row, y) => [...row].forEach((ch, x) => { const c = pal[ch]; if (ch === '.' || !c) return; for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) { if (c.startsWith('rgba')) B.morka(x0 + x * s + i, y0 + y * s + j); else B.satt(x0 + x * s + i, y0 + y * s + j, B.P.fran(c)); } })); };
    const bild = (B, id, x0, y0) => { const o = BILDFILER[id]; if (!o) return; o.rader.forEach((r, y) => [...r].forEach((ch, x) => { const c = o.pal[ch]; if (ch === '.' || !c) return; if (c.startsWith('rgba')) B.morka(x0 + x, y0 + y); else B.satt(x0 + x, y0 + y, B.P.fran(c)); })); };
    const skugga = (B, rader, x0, y0) => { const s = rader.length - 1; [...rader[s]].forEach((c, x) => { if (c !== '.') B.morka(x0 + x, y0 + s + 1); }); };
    const figurer = ['fram', 'sida', 'bak'];
    const W = 4 + 12 + 4 + 7 + 4 + 8 + 6 + figurer.length * 17 + 4 + 3 * 18 + 4, H = 34;
    const rita = (B) => {
      const P = B.P;
      // marken: gräs till vänster (bybon), lagrets jord i mitten, gränssnittets mörka botten till höger (inventoryt)
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) B.satt(x, y, P.i('oliv', hash(x, y, 3) < 0.08 ? 1 : 2));
      // bybon med bältet framifrån, från sidan och bakifrån
      let x = 4;
      figurer.forEach((r) => {
        const F = window.BYBO ? window.BYBO(FRO, r, 'sta', 'hanga', null, { balte: true, krokar: 2 }) : null; if (!F) return;
        const y0 = H - 4 - F.h;
        for (let yy = 0; yy < F.h; yy++) for (let xx = 0; xx < F.w; xx++) { const c = F.px[yy * F.w + xx]; if (c >= 0) B.satt(x + xx, y0 + yy, c); }
        for (let xx = 3; xx < F.w - 3; xx++) B.morka(x + xx, y0 + F.h);
        x += 17;
      });
      // lagret: det mindre bältet bredvid kniven och yxan, i samma skala som på kartan
      x += 2; const lx = x, lw = 4 + 12 + 4 + 7 + 4 + 8 + 4;
      for (let y = 6; y < H; y++) for (let xx = lx; xx < lx + lw; xx++) B.satt(xx, y, P.i('jord', hash(xx, y, 5) < 0.12 ? 2 : 3));
      ritaSprite(B, BALTE_NY, BL, lx + 4, H - 4 - 6); skugga(B, BALTE_NY, lx + 4, H - 4 - 6);
      const kn = BILDFILER.kniv; if (kn) { bild(B, 'kniv', lx + 20, H - 4 - kn.h); skugga(B, kn.rader, lx + 20, H - 4 - kn.h); }
      const yx = BILDFILER.yxa; if (yx) bild(B, 'yxa', lx + 31, H - 4 - yx.h);
      // inventoryt: tre rutor på 16 × 16 punkter: bältets symbol (det mindre bältet mitt i rutan), kniven och yxan
      x = lx + lw + 2;
      for (let y = 0; y < H; y++) for (let xx = x; xx < W; xx++) B.satt(xx, y, P.i('kol', 1));
      const ry = H - 4 - 18;
      for (let n = 0; n < 3; n++) { const rx = x + 2 + n * 18; for (let y = ry; y < ry + 18; y++) for (let xx = rx; xx < rx + 18; xx++) B.satt(xx, y, P.i('kol', (xx === rx || y === ry || xx === rx + 17 || y === ry + 17) ? 0 : 2)); }
      ritaSprite(B, BALTE_NY, BL, x + 2 + 1 + 2, ry + 1 + 5);
      ikon(B, 'kniv', x + 2 + 18 + 1, ry + 1, 2);
      ikon(B, 'yxa', x + 2 + 36 + 1, ry + 1, 2);
    };
    byt(JANEJ('f9_balte_mindre', 'Bältet i lagret, mindre', 'Steg 9.2.34: bältets bild i lagret är större än de andra sakerna, så den görs mindre (12 × 6 punkter i stället för 18 × 9). Nytt: kortet visar nu bältet på en bybo på kartan (framifrån, från sidan och bakifrån: det tvinnade repet runt midjan och krokarna vid höfterna), det mindre bältet i lagret på jorden bredvid en kniv och en yxa i samma skala, och symbolen i inventoryt (bilden mitt i en ruta på 16 × 16 punkter) bredvid kniven och yxan som de ser ut där i dag. Din kommentar förra gången: ”visa bältet hur det ser ut på en person och symbolen i inventoryt”',
      { text: 'Från vänster: bybon med bältet framifrån, från sidan och bakifrån; bältet i lagret bredvid en kniv och en yxa; och i inventoryt bältets symbol, kniven och yxan.', w: W, h: H, rita }));
  }
})();
