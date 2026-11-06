// 7.7 kläder av skinn och läder (7.7.1–7.7.7): byxorna, mössan, snöskorna, barnkläderna, halsbandet och vargtanden,
// garvningsställningen, lädret och läderrustningen. Plaggen ritas som sak och på kartfiguren framifrån: figuren ur
// skaparen (window.BYBO, window.SMABARN) med plagget målat ovanpå och en ny kontur runt allt.
(() => {
  const { hash, KORT, ell, linje, tri, poly, och, utan, punkt, rakt, former, bredd, lagg } = window.F7;

  // ---------- färgerna: en bokstav per ramp och ton ----------
  const L = {
    a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3', e: 'skiffer0', f: 'skiffer1', g: 'skiffer2', h: 'skiffer3',
    i: 'ben0', j: 'ben1', k: 'ben2', l: 'ben3', m: 'senap0', n: 'senap1', p: 'senap2', q: 'senap3',
    r: 'rost0', s: 'rost1', t: 'rost2', u: 'rost3', x: 'kol1', y: 'kol2', z: 'kol3',
  };
  const RAMP = { kanin: 'abcd', varg: 'efgh', ben: 'ijkl', senap: 'mnpq', rost: 'rstu', lader: 'abcd' };
  const T = (mat, t) => RAMP[mat][Math.max(0, Math.min(3, t))];
  const I = (P, ch) => { const v = L[ch]; return P.i(v.slice(0, -1), +v.slice(-1)); };
  // ljuset uppe till vänster: ljus kant till vänster, skugga till höger
  const sida = (x, x0, x1) => { const u = (x - x0) / Math.max(1, x1 - x0); return u < 0.22 ? 3 : u > 0.78 ? 1 : 2; };
  // päls: tonen efter sidan, med strån i tonen över och under
  const pals = (mat, x0, x1, s = 1) => (x, y) => { const t = sida(x, x0, x1), r = hash(Math.floor(x), Math.floor(y), s); return T(mat, r < 0.16 ? t + 1 : r > 0.86 ? t - 1 : t); };
  // läder: slätt, bara ljus och skugga
  const slat = (mat, x0, x1) => (x) => T(mat, sida(x, x0, x1));
  const rep = (x, y) => (Math.floor(x) + Math.floor(y)) % 2 ? 'k' : 'j'; // tvinnat rep, som repet i förrådet

  // ---------- kartfiguren med ett plagg ----------
  // F: figuren ur skaparen ({ w, h, px }), mal(satt, las, P): målar plagget i figurens punkter (x 0–13, y 0–19, och
  // utanför). Ytterkonturen tas bort först och läggs sedan runt allt igen; under fötterna bara om plagget når dit.
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
  // fröna: män med ljus hud utan rock (1), med rött hår (5), med grå rock (4) och med mörk hud (4242), och ett barn med
  // ljus hud (6). Mallen man: huvudet rad 1–6, bålen 7–12, benen 13–18, fötterna 19; mallen barn: huvudet 6–11, bålen 12–15
  const MAN = 1, BARN = 6;
  const figur = (barn, mal, P, fro) => {
    const F = barn ? (window.SMABARN && window.SMABARN(fro || BARN, 'fram', 'sta', 'hanga', false)) : (window.BYBO && window.BYBO(fro || MAN, 'fram', 'sta', 'hanga', null));
    return F ? kladd(F, mal, P) : null;
  };
  // snön: vit med blå skuggor, som marken i istiden
  const sno = (B) => { for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) { const r = hash(x, y, 77); B.satt(x, y, B.P.i(r < 0.03 ? 'skiffer' : 'ben', r < 0.03 ? 3 : r < 0.14 ? 2 : 3)); } };
  // kortet: saken till vänster och figurerna till höger, med fötterna på samma rad
  const SCEN = (text, rader, figurer = [], opt = {}) => {
    const m = 4, mellan = 7, fw = 14 + 2 * M, sw = rader ? bredd(rader) : 0;
    const fot = Math.max(rader ? rader.length : 0, figurer.length ? 20 + M : 0) + m - 1, w = m + sw + (rader && figurer.length ? mellan : 0) + figurer.length * (fw + 1) + m, h = fot + m + 1;
    return { text, w, h, rita: (B) => {
      if (opt.sno) sno(B);
      if (rader) lagg(B, rader, L, m, fot - rader.length + 1);
      figurer.forEach(([barn, mal, fro], n) => {
        const G = figur(barn, mal, B.P, fro); if (!G) return;
        const x0 = m + sw + (rader ? mellan : 0) + n * (fw + 1), y0 = fot - G.fot;
        for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) { const c = G.px[y * G.w + x]; if (c >= 0) B.satt(x0 + x, y0 + y, c); }
        let sista = -1; for (let y = G.h - 1; y >= 0 && sista < 0; y--) for (let x = 0; x < G.w; x++) if (G.px[y * G.w + x] >= 0) { sista = y; break; }
        for (let x = 0; x < G.w; x++) if (G.px[sista * G.w + x] >= 0) B.morka(x0 + x, y0 + sista + 1);
      });
    } };
  };
  // att måla en zon i figuren: f(x, y) ger bokstaven
  const zon = (satt, C, xs, ys, f) => { for (const y of ys) for (const x of xs) { const ch = f(x, y); if (ch) satt(x, y, C(ch)); } };
  const fran = (a, b) => [...Array(b - a + 1)].map((_, i) => a + i);

  // ---------- 7.7.1 byxorna: 2 skinn och 1 rep, med pälsen kvar ----------
  // 0: långa byxor av kaninskinn, pälsen vänd ut och ljusa fransar nertill, repet dras åt i midjan
  // 1: knälånga byxor av vargskinn, repet lindat runt knäna och knutet i sidan
  // 2: läder utåt och pälsen inåt, som syns i linningen och nertill, och en snörning av rep längs sidorna
  const BYXOR = [
    { mat: 'kanin', lang: true },
    { mat: 'varg', lang: false },
    { mat: 'lader', lang: true, vand: true },
  ];
  const byxSak = (v) => {
    const o = BYXOR[v], ned = o.lang ? 11 : 8, ben = o.vand ? slat : pals;
    const form = poly([[1.5, 1], [9.5, 1], [10.2, ned + 0.5], [6.3, ned + 0.5], [5.5, 4.5], [4.7, ned + 0.5], [0.8, ned + 0.5]]);
    const lista = [[form, (x, y) => (o.vand ? slat('lader', 1, 10)(x) : pals(o.mat, 1, 10, 3)(x, y))]];
    if (v === 0) lista.push([och(rakt(0.8, ned - 1, 4.8, ned + 0.5), rakt(6.2, ned - 1, 10.3, ned + 0.5)), (x, y) => hash(Math.floor(x), Math.floor(y), 4) < 0.5 ? 'l' : 'k'], [och(punkt(1, ned + 1), punkt(4, ned + 1), punkt(7, ned + 1), punkt(10, ned + 1)), 'k']);
    if (v === 1) lista.push([och(rakt(0.8, ned - 2, 4.8, ned - 1), rakt(6.2, ned - 2, 10.3, ned - 1)), rep]);
    if (v === 2) lista.push([och(rakt(0.8, ned - 1, 4.8, ned + 0.5), rakt(6.2, ned - 1, 10.3, ned + 0.5)), (x, y) => hash(Math.floor(x), 1, 9) < 0.5 ? 'k' : 'j'],
      [och(...[4, 6, 8].flatMap(y => [punkt(1, y), punkt(9, y)])), 'k'], [och(...[5, 7, 9].flatMap(y => [punkt(2, y), punkt(8, y)])), 'j']);
    lista.push([rakt(1.5, 1, 9.5, 2.5), v === 2 ? (x, y) => (hash(Math.floor(x), 2, 5) < 0.5 ? 'l' : 'k') : (x, y) => T(o.mat, y < 1.8 ? 3 : 1)]);
    lista.push([v === 1 ? rakt(1.5, 2.5, 9.5, 3.4) : rakt(1.5, 1, 9.5, 2), rep]);
    if (v === 0) lista.push([och(punkt(5, 3), punkt(6, 3), punkt(5, 4), punkt(7, 4)), 'k']);
    if (v === 1) lista.push([och(punkt(0, 3), punkt(0, 4), punkt(1, 4)), 'k']);
    return former(12, ned + 2, lista);
  };
  const byxFig = (v) => (satt, las, P, C) => {
    const o = BYXOR[v], ned = o.lang ? 18 : 16;
    const ben = (x, y) => o.vand ? T('lader', x === 4 || x === 8 ? 3 : x === 5 || x === 9 ? 2 : 2) : (() => { const t = x === 4 ? 3 : x === 9 ? 1 : 2, r = hash(x, y, 21); return T(o.mat, r < 0.2 ? t + 1 : r > 0.85 ? t - 1 : t); })();
    zon(satt, C, [4, 5, 8, 9], fran(12, ned), ben);
    zon(satt, C, [6, 7], fran(12, 14), ben);
    zon(satt, C, fran(4, 9), [12], rep);
    if (v === 0) { zon(satt, C, [3, 4, 5, 8, 9, 10], [18], (x) => (x % 2 ? 'l' : 'k')); }
    if (v === 1) { zon(satt, C, [4, 5, 8, 9], [16], rep); zon(satt, C, [3], [12, 13], () => 'k'); for (const x of [4, 5, 8, 9]) for (const y of [17, 18]) if (las(x, y) < 0 || las(x, y) === 0) satt(x, y, C('c')); }
    if (v === 2) { zon(satt, C, [4, 5, 8, 9], [18], (x) => (x % 2 ? 'l' : 'k')); zon(satt, C, [4, 9], [14, 16], () => 'k'); }
  };

  // ---------- 7.7.2 mössan: 1 skinn ----------
  // 0: rund kaninskinnsmössa med öronlappar som knyts under hakan
  // 1: hög, spetsig mössa av vargskinn med spetsen som faller åt sidan
  // 2: kulle av läder med en bred, uppvikt pälskant runt om
  const mossSak = (v) => {
    if (v === 0) return former(11, 9, [
      [och(ell(5.5, 3.6, 4.4, 3.4), rakt(1.1, 3.6, 9.9, 5.6), rakt(1.1, 5, 3, 7.6), rakt(8, 5, 9.9, 7.6)), pals('kanin', 1, 10, 6)],
      [rakt(1.1, 4.6, 9.9, 5.6), (x, y) => (Math.floor(x) % 3 ? 'd' : 'c')],
      [och(punkt(1, 8), punkt(9, 8)), 'k']]);
    if (v === 1) return former(12, 12, [
      [poly([[1.5, 10.5], [2.5, 5], [4.5, 2], [7, 0.8], [9.2, 1.4], [8, 2.6], [9.5, 10.5]]), pals('varg', 1.5, 9.5, 8)],
      [ell(9.6, 2.6, 1.3, 1.3), (x, y) => (y < 2.6 ? 'h' : 'g')],
      [rakt(1.2, 8.2, 9.8, 10.5), (x, y) => (hash(Math.floor(x), Math.floor(y), 12) < 0.5 ? 'h' : 'g')]]);
    return former(12, 8, [
      [ell(6, 3.6, 3.6, 3.2), slat('lader', 2.5, 9.5)],
      [och(rakt(0.8, 4.5, 11.2, 7.2), ell(6, 4.6, 5.3, 1.5)), pals('varg', 1, 11, 11)],
      [rakt(0.8, 4.5, 11.2, 5.4), (x, y) => (hash(Math.floor(x), 7, 2) < 0.5 ? 'h' : 'g')],
      [och(punkt(6, 0), punkt(5, 1)), 'b']]);
  };
  const mossFig = (v) => (satt, las, P, C) => {
    if (v === 0) {
      zon(satt, C, fran(5, 8), [-1], (x) => T('kanin', sida(x, 5, 8)));
      zon(satt, C, fran(4, 9), [0, 1], (x, y) => { const r = hash(x, y, 31); const t = sida(x, 4, 9); return T('kanin', r < 0.2 ? t + 1 : t); });
      zon(satt, C, fran(3, 10), [2], (x) => (x % 3 ? 'd' : 'c'));
      zon(satt, C, [3, 10], [3, 4], (x) => T('kanin', x === 3 ? 3 : 1));
      zon(satt, C, [3, 10], [5], () => 'k');
    } else if (v === 1) {
      const pr = [[7, -4], [8, -4], [6, -3], [7, -3], [9, -3], [5, -2], [6, -2], [7, -2], [8, -2], [10, -2]];
      for (const [x, y] of pr) satt(x, y, C(T('varg', x === 10 ? 2 : sida(x, 5, 9))));
      satt(10, -3, C('h')); satt(11, -2, C('g')); satt(11, -1, C('f'));
      zon(satt, C, fran(4, 9), [-1, 0, 1], (x, y) => { const r = hash(x, y, 41); const t = sida(x, 4, 9); return T('varg', r < 0.2 ? t + 1 : r > 0.85 ? t - 1 : t); });
      zon(satt, C, fran(3, 10), [2], (x) => T('varg', x < 5 ? 2 : 1));
    } else {
      zon(satt, C, fran(5, 8), [-2], (x) => T('lader', sida(x, 5, 8)));
      zon(satt, C, fran(4, 9), [-1, 0], (x) => T('lader', sida(x, 4, 9)));
      zon(satt, C, fran(3, 10), [1], (x) => (x % 2 ? 'h' : 'g'));
      zon(satt, C, fran(3, 10), [2], (x) => T('varg', sida(x, 3, 10)));
    }
  };

  // ---------- 7.7.3 snöskorna: flätade grenar, rep och skinn ----------
  // 0: en oval ram av en böjd gren, rep flätat i kors och en rem av skinn över tårna
  // 1: lång som en racket, grenarna knutna ihop i en svans bak, två tvärslåar och glesare fläta
  // 2: kort och rund som en björntass, med en hel sko av skinn med pälskant bunden ovanpå
  // ritade punkt för punkt: c och b är grenen (ljus till vänster, mörk till höger), k och j repet, '.' hål där snön syns
  const SNOSKO = [
    ['..cbb..', '.ck.kb.', 'c.k.k.b', 'ck.k.kb', 'cddccbb', 'ccbbbab', 'ck.k.kb', 'c.k.k.b', 'ck.k.kb', 'c.k.k.b', '.ck.kb.', '..cbb..'],
    ['..cbb..', '.ck.kb.', 'c.k.k.b', 'cdddcbb', 'ck.k.kb', 'chggfbb', 'ck.k.kb', 'cdddcbb', '.ck.kb.', '.c.k.b.', '..ckb..', '..jkj..', '..cb...', '...b...'],
    ['..ccbb..', '.ck.k.b.', 'c.lllk.b', 'ckdccbkb', 'c.dccb.b', 'ckdccbkb', 'c.cbba.b', '.ck.k.b.', '..cbbb..'],
  ];
  // bara ytterkonturen: hålen i flätan får ingen kontur, så att snön syns igenom
  const ytter = (rader) => {
    const w = bredd(rader) + 2, h = rader.length + 2, g = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (rader[y - 1] || '')[x - 1] || '.'));
    const ute = Array.from({ length: h }, () => Array(w).fill(false)), st = [[0, 0]];
    while (st.length) { const [x, y] = st.pop(); if (x < 0 || y < 0 || x >= w || y >= h || ute[y][x] || g[y][x] !== '.') continue; ute[y][x] = true; st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
    return g.map((r, y) => r.map((c, x) => (ute[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx] && g[y + dy][x + dx] !== '.') ? 'o' : c)).join(''));
  };
  const snoSak = (v) => { const s = SNOSKO[v], w = bredd(s); return ytter(s.map(r => r.padEnd(w, '.') + '.' + r.padEnd(w, '.'))); };
  // på figuren: snöskon ligger platt i snön, sedd snett ovanifrån som en bred, låg oval under varje fot
  const SNOFOT = [
    ['.cbbbb.', 'ckjkjkb', 'cjkjkjb', '.abbba.'],
    ['..cb..', '.ckjb.', 'cddddb', 'ckjkjb', '.abba.'],
    ['.cbbb.', 'ckjkjb', '.abba.'],
  ];
  const snoFig = (v) => (satt, las, P, C) => {
    const s = SNOFOT[v], w = bredd(s), y0 = 22 - s.length;
    for (const cx of [4, 10]) s.forEach((r, dy) => [...r].forEach((ch, dx) => { const x = cx - (w >> 1) + dx, y = y0 + dy; if (ch !== '.' && (y > 19 || las(x, y) <= 0)) satt(x, y, C(ch)); }));
    const sko = v === 1 ? 'varg' : 'kanin';
    zon(satt, C, [3, 4, 5, 8, 9, 10], [19], (x) => T(sko, x === 3 || x === 8 ? 3 : x === 5 || x === 10 ? 1 : 2));
    if (v === 2) zon(satt, C, [4, 5, 8, 9], [18], (x) => (x % 2 ? 'l' : 'k'));
  };

  // ---------- 7.7.4 barnkläderna: 2 skinn och 1 rep ----------
  // 0: en kolt av kaninskinn till knäna med repet som bälte
  // 1: en kort tröja av vargskinn med huva, och korta byxor av samma skinn
  // 2: en säck av skinn med hål för huvudet och armarna, ljus pälskant runt halsen och nertill, repet knutet över axeln
  const BARNSAK = [
    () => former(9, 9, [[poly([[2.5, 1], [6.5, 1], [8.6, 3.4], [7.2, 4.2], [7.5, 8.5], [1.5, 8.5], [1.8, 4.2], [0.4, 3.4]]), pals('kanin', 1, 8, 12)], [ell(4.5, 1, 1.3, 0.8), null], [rakt(1.8, 5, 7.3, 6), rep], [och(punkt(5, 6), punkt(5, 7)), 'k']]),
    () => former(11, 10, [[och(poly([[3, 2], [8, 2], [10.6, 4.4], [9.2, 5.2], [8.6, 6.5], [2.4, 6.5], [1.8, 5.2], [0.4, 4.4]]), ell(5.5, 2, 2.6, 2)), pals('varg', 1, 10, 13)], [ell(5.5, 2.2, 1.4, 1.2), 'e'],
      [och(rakt(2.5, 6.5, 5.3, 9.5), rakt(5.7, 6.5, 8.5, 9.5)), pals('varg', 2, 8, 15)], [rakt(2.4, 6, 8.6, 7), rep]]),
    () => former(9, 9, [[poly([[1.5, 1], [7.5, 1], [8.2, 8.5], [0.8, 8.5]]), slat('lader', 1, 8)], [ell(4.5, 0.9, 1.6, 1), (x, y) => 'k'], [ell(4.5, 0.6, 1, 0.7), null], [rakt(0.8, 7.4, 8.3, 8.5), (x, y) => (Math.floor(x) % 2 ? 'l' : 'k')], [och(punkt(2, 1), punkt(2, 2), punkt(3, 3), punkt(3, 4)), rep]]),
  ];
  const barnFig = (v) => (satt, las, P, C) => {
    const mat = v === 1 ? 'varg' : v === 2 ? 'lader' : 'kanin';
    const fyll = (x, y) => { if (v === 2) return T(mat, x <= 5 ? 3 : x >= 8 ? 1 : 2); const t = x <= 5 ? 3 : x >= 8 ? 1 : 2, r = hash(x, y, 51); return T(mat, r < 0.2 ? t + 1 : r > 0.85 ? t - 1 : t); };
    zon(satt, C, fran(5, 8), fran(12, 15), fyll);
    zon(satt, C, [4, 9], fran(12, v === 1 ? 15 : 14), fyll);
    if (v === 0) { zon(satt, C, fran(5, 8), [16, 17], fyll); zon(satt, C, [4, 9], [17], fyll); zon(satt, C, fran(5, 8), [14], rep); }
    if (v === 1) { zon(satt, C, fran(5, 8), [5], fyll); zon(satt, C, fran(4, 9), [6], fyll); zon(satt, C, [3, 10], fran(7, 11), fyll); zon(satt, C, [5, 6, 7, 8], [16, 17], fyll); zon(satt, C, fran(5, 8), [15], rep); }
    if (v === 2) { zon(satt, C, fran(5, 8), [16], fyll); zon(satt, C, fran(4, 9), [17], (x) => (x % 2 ? 'l' : 'k')); zon(satt, C, fran(6, 7), [12], () => 'k'); zon(satt, C, [5], [12, 13], () => 'j'); }
  };

  // ---------- 7.7.5 halsbandet och vargtanden ----------
  const tand = (lang = false) => (lang ? ['l.', 'lk', 'kj', 'j.'] : ['l', 'k', 'j']);
  const knota = ['l', 'k', 'l'];
  // halsbandet: repet i en båge och tre saker som hänger längst ner
  const HALS = [
    { text: 'Tre små ben på ett tvinnat rep.', delar: ['ben', 'ben', 'ben'] },
    { text: 'Tre vargtänder, den mittersta störst, med repet knutet runt roten.', delar: ['tand', 'tandL', 'tand'] },
    { text: 'En stor vargtand i mitten mellan två ben, med knutar på repet mellan dem.', delar: ['ben', 'tandL', 'ben'], knut: true },
  ];
  const halsSak = (v) => {
    const o = HALS[v], lista = [];
    lista.push([och(utan(ell(6.5, 0.5, 5.6, 6.2), ell(6.5, -0.4, 4.6, 6.2)), punkt(1, 0), punkt(11, 0)), rep]);
    const fasten = [[3.5, 5.6], [6.5, 6.8], [9.5, 5.6]];
    o.delar.forEach((d, n) => {
      const [fx, fy] = fasten[n], x0 = Math.floor(fx), y0 = Math.floor(fy);
      // benet: en pinne med en knöl i varje ände; tanden: bred rot upptill och en spets som böjer sig nedåt
      if (d === 'ben') lista.push([och(rakt(x0 - 1, y0, x0 + 1, y0 + 1), punkt(x0, y0 + 1), punkt(x0, y0 + 2), rakt(x0 - 1, y0 + 3, x0 + 1, y0 + 4)), (x, y) => (x < x0 ? 'l' : y < y0 + 3 ? 'k' : 'j')]);
      if (d === 'tand') lista.push([och(rakt(x0 - 1, y0, x0 + 1, y0 + 2), punkt(x0, y0 + 2), punkt(x0, y0 + 3)), (x, y) => (y < y0 + 1 ? 'q' : x < x0 ? 'l' : y > y0 + 2 ? 'j' : 'k')]);
      if (d === 'tandL') lista.push([och(rakt(x0 - 1, y0, x0 + 1, y0 + 3), punkt(x0, y0 + 3), punkt(x0, y0 + 4), punkt(x0 + 1, y0 + 5)), (x, y) => (y < y0 + 1 ? 'q' : x < x0 ? 'l' : y > y0 + 3 ? 'j' : 'k')]);
    });
    if (o.knut) lista.push([och(punkt(5, 6), punkt(8, 6), punkt(1, 3), punkt(11, 3)), 'b']);
    return former(14, 14, lista);
  };
  // vargtanden: liten, böjd och spetsig, roten mörkare
  const VARGTAND = [
    () => former(6, 8, [[poly([[0.6, 0.6], [4.4, 0.6], [4.4, 3], [3.6, 5.4], [2, 7.4], [2.2, 4.8], [1, 3]]), (x, y) => (y < 2 ? (x < 2.5 ? 'd' : 'c') : x < 2.4 ? 'l' : x > 3.5 ? 'j' : 'k')]]),
    () => former(10, 6, [[poly([[0.5, 0.8], [3, 0.6], [6, 1.6], [8.6, 3.6], [9.4, 5], [6.6, 4.2], [3, 4], [0.5, 3.6]]), (x, y) => (x < 3 ? (y < 2 ? 'd' : 'c') : y < 2.2 ? 'l' : y > 3.6 ? 'j' : 'k')], [punkt(1, 2), 'a']]),
    () => former(7, 8, [[och(linje([[1.5, 1.5], [3.6, 2.8], [5, 4.8], [4.8, 6.8]], 1.3, 0.4), ell(1.6, 1.6, 1.3, 1.1)), (x, y) => (x < 2.4 && y < 2.8 ? (y < 1.6 ? 'q' : 'k') : y < 3.5 ? 'l' : x > 4.4 ? 'j' : 'k')], [punkt(3, 3), 'j']]),
  ];
  const halsFig = (v) => (satt, las, P, C) => {
    const t = HALS[v];
    zon(satt, C, fran(5, 8), [8], (x) => (x === 5 || x === 8 ? null : null));
    satt(5, 8, C('j')); satt(8, 8, C('j')); satt(6, 9, C('k')); satt(7, 9, C('k'));
    const mitt = t.delar[1], sidor = t.delar[0];
    satt(6, 10, C(mitt === 'ben' ? 'l' : 'l')); satt(6, 11, C(mitt === 'tandL' ? 'k' : 'k'));
    if (mitt === 'tandL') satt(7, 10, C('l'));
    if (sidor === 'ben') { satt(5, 9, C('l')); satt(8, 9, C('l')); } else { satt(5, 9, C('k')); satt(8, 9, C('k')); }
  };

  // ---------- 7.7.6 garvningsställningen och lädret ----------
  // en ram av fyra grenar med repet runt hörnen, i stationernas storlek (som torkställningen, 32 × 26), och skinnet
  // uppspänt med rep i ramen. 0: en upprätt fyrkant med ett skinn med pälsen kvar; 1: en ram som lutar bakåt mot ett
  // stöd, skinnet skrapat ljust och skrapan av ben vid foten; 2: ramen i ett A, ett färdigt läder spänt i den
  const GW = 32, GH = 32;
  function garvning(B, v) {
    const P = B.P, c = ch => I(P, ch), s = (x, y, ch) => B.satt(x, y, c(ch));
    // en gren: ljus ovan/vänster, mörk under/höger, med knaggar
    const stang = (x0, y0, x1, y1, ljus = 'c', mork = 'a') => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) {
        const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
        if (Math.abs(x1 - x0) >= Math.abs(y1 - y0)) { s(x, y, hash(x, y, 3) < 0.12 ? 'b' : ljus === 'c' ? 'd' : ljus); s(x, y + 1, mork === 'a' ? 'b' : mork); }
        else { s(x, y, hash(x, y, 3) < 0.12 ? 'b' : ljus); s(x + 1, y, mork); }
      }
    };
    const knyt = (x, y) => { s(x, y, 'k'); s(x + 1, y, 'l'); s(x, y + 1, 'j'); s(x + 1, y + 1, 'k'); };
    const fot = GH - 2;
    let skinn; // ramens inre (x0, y0, x1, y1)
    if (v === 0) {
      stang(6, 3, 6, fot); stang(24, 3, 24, fot); stang(3, 5, 28, 5); stang(3, 23, 28, 23);
      for (const [x, y] of [[6, 5], [24, 5], [6, 23], [24, 23]]) knyt(x, y);
      skinn = [9, 8, 22, 21];
    } else if (v === 1) {
      // ramen lutar: överkanten längre in, och ett stöd bakom som syns till höger
      stang(26, 2, 29, fot, 'b', 'a');
      stang(8, 4, 5, fot); stang(24, 4, 27, fot); stang(4, 6, 28, 6); stang(3, 22, 29, 22);
      for (const [x, y] of [[7, 6], [24, 6], [5, 22], [26, 22]]) knyt(x, y);
      skinn = [10, 9, 22, 20];
    } else {
      // två grenar i ett A, knutna i toppen, en slå nertill och en upptill
      stang(15, 1, 4, fot); stang(16, 1, 27, fot); stang(5, 23, 27, 23); stang(10, 9, 22, 9);
      knyt(15, 1); knyt(6, 23); knyt(25, 23); knyt(10, 9); knyt(21, 9);
      skinn = [10, 12, 22, 21];
    }
    // skinnet
    const [x0, y0, x1, y1] = skinn, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const form = v === 2 ? poly([[x0 + 2, y0], [x1 - 2, y0], [x1, y0 + 3], [x1 - 1, y1 - 2], [x1 - 3, y1], [x0 + 3, y1], [x0 + 1, y1 - 2], [x0, y0 + 3]])
      : och(ell(cx, cy, (x1 - x0) / 2 - 1.2, (y1 - y0) / 2), ell(x0 + 1, y0 + 1, 1.4, 1.4), ell(x1 - 1, y0 + 1, 1.4, 1.4), ell(x0 + 1, y1 - 1, 1.4, 1.4), ell(x1 - 1, y1 - 1, 1.4, 1.4));
    const hud = (x, y) => {
      if (v === 0) return pals('kanin', x0, x1, 61)(x, y);
      if (v === 1) { const r = hash(Math.floor(x), Math.floor(y / 3), 62); return Math.floor(y) % 3 === 0 && r < 0.5 ? 'j' : sida(x, x0, x1) === 3 ? 'l' : sida(x, x0, x1) === 1 ? 'j' : 'k'; }
      return slat('lader', x0, x1)(x);
    };
    const r = former(x1 - x0 + 3, y1 - y0 + 3, [[(x, y) => form(x + x0 - 1, y + y0 - 1), (x, y) => hud(x + x0 - 1, y + y0 - 1)]]);
    // repen från skinnets kant ut till ramen
    const repLinje = (ax, ay, bx, by) => { const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)); for (let i = 0; i <= n; i++) s(Math.round(ax + (bx - ax) * i / n), Math.round(ay + (by - ay) * i / n), i % 2 ? 'k' : 'j'); };
    const ramX0 = v === 1 ? 8 : v === 2 ? 9 : 7, ramX1 = v === 1 ? 24 : v === 2 ? 22 : 23, ramY0 = v === 1 ? 7 : v === 2 ? 10 : 6, ramY1 = v === 1 ? 21 : 22;
    for (const t of [0.25, 0.5, 0.75]) {
      const yy = Math.round(y0 + (y1 - y0) * t), xx = Math.round(x0 + (x1 - x0) * t);
      repLinje(x0 - 1, yy, v === 2 ? Math.round(15 - (yy - 1) * 11 / (fot - 1)) + 1 : ramX0, yy);
      repLinje(x1 + 1, yy, v === 2 ? Math.round(16 + (yy - 1) * 11 / (fot - 1)) : ramX1, yy);
      repLinje(xx, y0 - 1, xx, ramY0); repLinje(xx, y1 + 1, xx, ramY1);
    }
    lagg(B, r, { ...L, o: 'jord0' }, x0 - 1, y0 - 1, false);
    if (v === 1) { // skrapan av ben vid foten
      s(12, fot, 'l'); s(13, fot, 'l'); s(14, fot, 'k'); s(15, fot, 'k'); s(16, fot - 1, 'j'); s(11, fot, 'j');
      for (let x = 11; x <= 16; x++) B.morka(x, fot + 1);
    }
    if (v === 2) for (let x = 13; x <= 18; x++) { s(x, fot, x % 2 ? 'b' : 'c'); B.morka(x, fot + 1); } // spån av skinnet
    for (const x of v === 2 ? [4, 5, 27, 28] : v === 1 ? [5, 6, 27, 28, 29, 30] : [6, 7, 24, 25]) B.morka(x, fot + 1);
  }
  const GARV = (text, v) => ({ text, w: GW, h: GH, rita: (B) => garvning(B, v) });

  // lädret: en garvad hud utan päls, slät och brun
  const LADER = [
    () => former(13, 10, [[och(ell(6.5, 5, 4.3, 3.4), linje([[3.4, 3.2], [1.2, 1.2]], 0.8), linje([[9.6, 3.2], [11.8, 1.2]], 0.8), linje([[3.4, 6.8], [1.2, 8.8]], 0.8), linje([[9.6, 6.8], [11.8, 8.8]], 0.8), ell(6.5, 1.4, 1.3, 1)), (x, y) => (x + y < 7 ? 'd' : x + y > 15 ? 'b' : 'c')], [och(punkt(5, 4), punkt(8, 6)), 'b']]),
    () => former(12, 7, [[rakt(1.5, 1, 10.5, 6), (x, y) => (y < 2 ? 'd' : y > 5 ? 'b' : 'c')], [ell(1.5, 3.5, 1.4, 2.5), (x, y) => ((x - 1.5) ** 2 + (y - 3.5) ** 2 < 1.4 ? 'a' : 'b')], [och(rakt(4, 1, 5, 6), rakt(8, 1, 9, 6)), rep]]),
    () => former(12, 9, [[poly([[1, 4], [10, 3], [11, 7.6], [1.4, 8]]), (x, y) => (y < 5.4 ? 'c' : 'b')], [poly([[1.5, 1], [9.6, 0.8], [10.4, 4.6], [2, 5]]), (x, y) => (y < 2 ? 'd' : x > 9 ? 'b' : 'c')], [och(punkt(3, 2), punkt(5, 2), punkt(7, 2)), 'b']]),
  ];

  // ---------- 7.7.7 läderrustningen: 4 läder och 2 rep ----------
  // 0: ett tjockt harnesk med axelskydd i två lager och snörning av rep framtill
  // 1: små plattor av härdat läder i rader som ligger omlott, korta axelflikar och repet runt midjan
  // 2: ett helt bröstharnesk med höga axelskydd, och två armskydd som snörs runt underarmen
  const RUST = [
    () => former(14, 12, [[rakt(3, 2, 11, 11), slat('lader', 3, 11)], [ell(5.5, 1.6, 1.5, 0.9), null], [ell(8.5, 1.6, 1.5, 0.9), null], [rakt(5.5, 1, 8.5, 3), null],
      [och(ell(2.6, 3, 2.4, 1.6), ell(11.4, 3, 2.4, 1.6)), (x, y) => (y < 2.6 ? 'd' : 'b')], [och(ell(2.4, 5, 1.8, 1.2), ell(11.6, 5, 1.8, 1.2)), (x, y) => (y < 4.8 ? 'c' : 'a')],
      [och(punkt(6, 4), punkt(7, 5), punkt(6, 6), punkt(7, 7), punkt(6, 8), punkt(7, 9)), 'k'], [rakt(3, 10, 11, 11), 'b']]),
    () => former(14, 12, [[rakt(3, 2, 11, 11), (x, y) => { const rad = Math.floor((y - 2) / 2), sk = (Math.floor(x) + rad) % 3 === 0; return (y - 2) % 2 < 1 ? (sk ? 'b' : 'd') : sk ? 'a' : 'c'; }], [rakt(5.5, 1.6, 8.5, 3), null],
      [och(rakt(1, 2.5, 3, 5), rakt(11, 2.5, 13, 5)), (x, y) => (y < 3.5 ? 'd' : 'b')], [rakt(3, 9, 11, 10), rep]]),
    () => former(18, 12, [[poly([[3, 2.4], [5.5, 1.6], [8.5, 1.6], [11, 2.4], [11, 10.5], [7, 11.4], [3, 10.5]]), slat('lader', 3, 11)], [ell(7, 1.6, 1.6, 1.2), null],
      [och(ell(2.4, 3.2, 2, 2.2), ell(11.6, 3.2, 2, 2.2)), (x, y) => (x < 2.4 || (x > 11 && x < 11.8) ? 'd' : 'b')], [linje([[7, 3.6], [7, 10]], 0.5), 'b'],
      [och(rakt(13.6, 3, 16.4, 7), rakt(13.6, 8, 16.4, 12)), (x, y) => (x < 14.6 ? 'd' : 'c')], [och(punkt(15, 4), punkt(15, 6), punkt(15, 9), punkt(15, 11)), 'k']]),
  ];
  const rustFig = (v) => (satt, las, P, C) => {
    const f = (x) => T('lader', x <= 4 ? 3 : x >= 9 ? 1 : 2);
    zon(satt, C, fran(4, 9), fran(7, 12), (x, y) => (v === 1 ? ((y + (x % 3 === 0 ? 1 : 0)) % 2 ? 'c' : 'd') : f(x)));
    zon(satt, C, [3, 10], [7, 8], f);
    if (v === 0) { zon(satt, C, fran(1, 4), [6], (x) => (x < 3 ? 'd' : 'c')); zon(satt, C, fran(9, 12), [6], (x) => (x < 11 ? 'c' : 'b')); zon(satt, C, [1, 2, 3, 10, 11, 12], [7], (x) => (x < 5 ? 'c' : 'b')); zon(satt, C, [6, 7], [8, 10], (x) => (x === 6 ? 'k' : null)); zon(satt, C, [6, 7], [9, 11], (x) => (x === 7 ? 'k' : null)); }
    if (v === 1) { zon(satt, C, [2, 3, 10, 11], [6, 7], (x, y) => (y === 6 ? 'd' : 'b')); zon(satt, C, fran(4, 9), [11], rep); }
    if (v === 2) { zon(satt, C, fran(1, 4), [5, 6, 7], (x, y) => (y === 5 ? (x === 1 ? null : 'd') : x < 3 ? 'c' : 'b')); zon(satt, C, fran(9, 12), [5, 6, 7], (x, y) => (y === 5 ? (x === 12 ? null : 'c') : x < 11 ? 'c' : 'b')); zon(satt, C, [2, 11], [10, 11, 12], (x, y) => (y === 11 ? 'k' : x === 2 ? 'd' : 'b')); zon(satt, C, [6, 7], fran(8, 11), (x) => (x === 6 ? 'b' : null)); }
  };

  // ---------- korten ----------
  VAL.push(
    KORT('f7_byxor', 'Byxorna', 'Steg 7.7.1: byxor som sys av 2 skinn och 1 rep, med pälsen kvar, som håller benen varma i kylan. Bilden visar byxorna som sak och på en bybo.', [
      SCEN('Långa byxor av kaninskinn med pälsen utåt, ljusa fransar nertill och repet draget i midjan.', byxSak(0), [[false, byxFig(0)]]),
      SCEN('Knälånga byxor av vargskinn, repet lindat runt knäna och knutet i sidan.', byxSak(1), [[false, byxFig(1)]]),
      SCEN('Lädret utåt och pälsen inåt, som syns i linningen och nertill, och en snörning av rep längs sidorna.', byxSak(2), [[false, byxFig(2)]])]),
    KORT('f7_mossa', 'Mössan', 'Steg 7.7.2: en mössa av 1 skinn som håller huvudet varmt. Bilden visar mössan som sak och på en bybo.', [
      SCEN('Rund mössa av kaninskinn med öronlappar som knyts under hakan.', mossSak(0), [[false, mossFig(0), 5]]),
      SCEN('Hög, spetsig mössa av vargskinn med toppen som faller åt sidan.', mossSak(1), [[false, mossFig(1), 5]]),
      SCEN('En kulle av läder med en bred, uppvikt kant av vargpäls runt om.', mossSak(2), [[false, mossFig(2), 5]])]),
    KORT('f7_snoskor', 'Snöskorna', 'Steg 7.7.3: snöskor av flätade grenar, rep och skinn, så att man inte sjunker ner i djup snö. Bilden visar paret som sak och en bybo som står på dem i snön.', [
      SCEN('En oval ram av en böjd gren, rep flätat i kors och en rem av skinn över tårna.', snoSak(0), [[false, snoFig(0), 4]], { sno: true }),
      SCEN('Långa som en racket med grenarna knutna i en svans bak, två tvärslåar och en glesare fläta.', snoSak(1), [[false, snoFig(1), 4]], { sno: true }),
      SCEN('Korta och runda som en björntass, med en hel sko av skinn med pälskant bunden ovanpå.', snoSak(2), [[false, snoFig(2), 4]], { sno: true })]),
    KORT('f7_barnklader', 'Barnkläderna', 'Steg 7.7.4: kläder i barnstorlek av 2 skinn och 1 rep. Bilden visar kläderna som sak och på ett barn.', [
      SCEN('En kolt av kaninskinn till knäna, med repet som bälte.', BARNSAK[0](), [[true, barnFig(0)]]),
      SCEN('En kort tröja av vargskinn med huva, och korta byxor av samma skinn.', BARNSAK[1](), [[true, barnFig(1)]]),
      SCEN('En säck av läder med hål för huvudet och armarna, pälskant nertill och repet knutet över axeln.', BARNSAK[2](), [[true, barnFig(2)]])]),
    KORT('f7_halsband', 'Halsbandet', 'Steg 7.7.5: ett halsband av rep med tre ben eller tre vargtänder, en prydnad. Bilden visar halsbandet som sak och på en bybo.', [
      SCEN(HALS[0].text, halsSak(0), [[false, halsFig(0), 4242]]),
      SCEN(HALS[1].text, halsSak(1), [[false, halsFig(1), 4242]]),
      SCEN(HALS[2].text, halsSak(2), [[false, halsFig(2), 4242]])]),
    KORT('f7_vargtand', 'Vargtanden', 'Steg 7.7.5: vargtanden, en ny sak som slakten av en varg ger, till halsband. En liten, böjd och spetsig tand med en mörkare rot.', [
      SCEN('Upprätt, kort och kraftig, med roten upptill.', VARGTAND[0]()),
      SCEN('Liggande och lång, med ett hål borrat i roten.', VARGTAND[1]()),
      SCEN('Smal och krokig som en klo, gulnad vid roten.', VARGTAND[2]())]),
    KORT('f7_garvning', 'Garvningsställningen', 'Steg 7.7.6: en station av 4 grenar och 2 rep där ett skinn spänns upp, skrapas och garvas till läder. Bilden visar ställningen i stationernas storlek med ett skinn i ramen.', [
      GARV('En upprätt fyrkant av grenar, rep runt hörnen och ett skinn med pälsen kvar spänt med rep.', 0),
      GARV('En ram som lutar bakåt mot ett stöd, skinnet skrapat ljust och skrapan av ben vid foten.', 1),
      GARV('Två grenar i ett A med två slåar, ett färdigt läder spänt mellan dem och spån på marken.', 2)]),
    KORT('f7_lader', 'Läder', 'Steg 7.7.6: läder, ett nytt material som garvningsställningen gör av skinn: en garvad hud utan päls, slät och brun.', [
      SCEN('Utbrett, med formen kvar av djuret.', LADER[0]()),
      SCEN('Hoprullat och bundet med rep.', LADER[1]()),
      SCEN('Två bitar hopvikta på varandra.', LADER[2]())]),
    KORT('f7_laderrustning', 'Läderrustningen', 'Steg 7.7.7: en rustning av 4 läder och 2 rep som skyddar kroppen och armarna i strid. Bilden visar rustningen som sak och på en bybo.', [
      SCEN('Ett tjockt harnesk med axelskydd i två lager och snörning av rep framtill.', RUST[0](), [[false, rustFig(0)]]),
      SCEN('Små plattor av härdat läder i rader som ligger omlott, korta axelflikar och repet runt midjan.', RUST[1](), [[false, rustFig(1)]]),
      SCEN('Ett helt bröstharnesk med höga axelskydd, och två armskydd som snörs runt underarmen.', RUST[2](), [[false, rustFig(2)]])]),
  );
})();
