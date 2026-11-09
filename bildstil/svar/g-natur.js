// svar på fyra kort i 9.2: björnens och vargens anfall ritade ur djurens egna bilder (björnen ur Björns ritning i bjorn.json,
// vargen ur formerna i djur.js), den kolnade stammen och den svarta stubben ur spelets träd och stubbar (src/ui/trad.ts,
// stubbilder.ts) på spelets mark, och bärbusken vid trädets fot i stället för den egna tuvan.
(() => {
  const byt = kort => { const i = VAL.findIndex(s => s.id === kort.id); if (i >= 0) VAL[i] = kort; else VAL.push(kort); };
  const RUTOR = 4, TAKT = 230; // som människornas slag (anim.js, RORELSER)
  // gräset under djuren, som rörelsernas kort (anim.js)
  const gras = (B, x0 = 0, y0 = 0, w = B.w, h = B.h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) B.satt(x, y, MARK.grasPunkt(x, y, B.P, 1)); };
  const fotskugga = (B, cx, fot, rx) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -rx; dx <= rx; dx++) if ((dx / rx) ** 2 + dy * dy / 2 <= 1) B.morka(cx + dx, fot + dy); };

  // ---------- att flytta och vrida delar av en ritning ----------
  // en avbildning [a, b, c, d, e, f]: x' = a x + c y + e, y' = b x + d y + f
  const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const ap = (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
  const inv = m => { const det = m[0] * m[3] - m[1] * m[2], a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det; return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])]; };
  const T = (x, y) => [1, 0, 0, 1, x, y];
  const R = g => { const r = g * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [c, s, -s, c, 0, 0]; };
  const SK = (sx, sy) => [sx, 0, 0, sy, 0, 0];
  // vrid g grader kring punkten p (positivt medsols på skärmen) och lägg p på q
  const kring = (p, g, q = p) => mul(T(q[0], q[1]), mul(R(g), T(-p[0], -p[1])));
  // pixelkonstens förstoring (scale2x), så att en vriden del får jämna kanter i stället för trappsteg
  const skala2 = G => {
    const h = G.length, w = G[0].length, O = Array.from({ length: h * 2 }, () => Array(w * 2).fill('.'));
    const g = (x, y) => (y < 0 || y >= h || x < 0 || x >= w) ? '.' : G[y][x];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const P = G[y][x], A = g(x, y - 1), Bh = g(x + 1, y), C = g(x - 1, y), D = g(x, y + 1);
      let e0 = P, e1 = P, e2 = P, e3 = P;
      if (C !== Bh && A !== D) { if (C === A) e0 = A; if (A === Bh) e1 = Bh; if (C === D) e2 = C; if (D === Bh) e3 = D; }
      O[2 * y][2 * x] = e0; O[2 * y][2 * x + 1] = e1; O[2 * y + 1][2 * x] = e2; O[2 * y + 1][2 * x + 1] = e3;
    }
    return O;
  };
  const ATTA = G => skala2(skala2(skala2(G)));
  // ritningen utan sin yttre kontur (konturen läggs runt igen när delarna lagts ut)
  const utanKontur = (rader, k) => {
    const G = rader.map(r => [...r]), h = G.length, w = G[0].length, ut = G.map(r => r.slice());
    const tom = (x, y) => y < 0 || y >= h || x < 0 || x >= w || G[y][x] === '.';
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (G[y][x] === k) {
      let kant = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && tom(x + dx, y + dy)) kant = true;
      if (kant) ut[y][x] = '.';
    }
    return ut;
  };
  // en del av ritningen: punkterna där mask(x, y) gäller, förstorade
  const del = (G, mask) => ATTA(G.map((r, y) => r.map((c, x) => mask(x, y, c) ? c : '.')));
  // lägger ut delarna (bakifrån och fram) med var sin avbildning m, och sätter konturen k runt allt och där en del ligger
  // framför en annan (utom kring leden: led är leden i bilden, fog hur nära leden konturen inte ritas)
  function lagg(delar, W, H, k) {
    const C = Array.from({ length: H }, () => Array(W).fill('.')), Z = Array.from({ length: H }, () => Array(W).fill(-1));
    delar.forEach((d, z) => {
      const mi = inv(d.m), h8 = d.G.length, w8 = d.G[0].length;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const [sx, sy] = ap(mi, [x + 0.5, y + 0.5]), X = Math.floor(sx * 8), Y = Math.floor(sy * 8);
        if (X < 0 || Y < 0 || X >= w8 || Y >= h8) continue;
        const c = d.G[Y][X]; if (c === '.') continue;
        C[y][x] = c; Z[y][x] = z;
      }
    });
    const K = C.map(r => r.slice()), N = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const z = Z[y][x];
      if (z < 0) { if (N.some(([dx, dy]) => C[y + dy] && C[y + dy][x + dx] && C[y + dy][x + dx] !== '.')) K[y][x] = k; continue; }
      for (const [dx, dy] of N) {
        const zn = Z[y + dy] ? Z[y + dy][x + dx] : undefined; if (zn === undefined || zn <= z) continue;
        const d = delar[zn]; if (d.kant === false) continue;
        if (d.led && Math.hypot(x + 0.5 - d.led[0], y + 0.5 - d.led[1]) < (d.fog || 0)) continue;
        K[y][x] = k; break;
      }
    }
    return K;
  }
  const ritaRutnat = (B, K, L, x0, y0) => K.forEach((r, y) => r.forEach((c, x) => { if (c !== '.' && L[c]) B.satt(x0 + x, y0 + y, B.P.i(L[c][0], L[c][1])); }));

  const BJ = {
    sida: [
      '.......................k.k.k.k.................',
      '......................ksksksksk................',
      '..........kkkkkkkkkkkkkksssssk.................',
      '........kksssssssssssssssssssskk...............',
      '......kksssssssssssssssssssssssskkk............',
      '.....kssssssssssssssssssssssssssssskk..........',
      '....ksssssssssssssssssssssssssssssssskkk.k.....',
      '...kssssssssssssssssssssssssssssssssssssksk....',
      '...ksssssssssssssssssssssssssssssssssllssslk...',
      '..kssssssssssssssssssssssssssssssssssllsssmk...',
      '..ksssssssssssssssssssssssssssssssssssmssssk...',
      '.kssssssssrssssssssssssssssssssssssssssmmmtk...',
      '.kssssssssmrsssssssssssssssssssssrrssssskkttk..',
      'ksssssssssmrssssssssssmssssssssssrrssssssttttk.',
      'ksssssssssrmrssssssssmsssssssssssmrsssssstttllk',
      '.kssssssssrmrssssssssmssssssssssmmmssssssstttk.',
      '.kssssssssrmrrrsssssrssssssssssmmmmsssssssssk..',
      '.kssssssssrmrrrrrrrrrssssssssssmmmmmmmssrrrk...',
      '.kssssssssrmrrrrrrrrrssssssssrmmllllkkmsssk....',
      '.kssssssssrmmrrrrrrrmssssssssrlllllk..kkkk.....',
      '.kssssssssrmmmmmmmmmmsssssssrllllllk...........',
      '.kssssssssmmmmmmmmmmmssssssrrllllllk...........',
      '.ksssssssrmmmmmmmmmkmssssssrlllllllk...........',
      '.kssssssrrllllllkkk.kssssssrlllllllk...........',
      '.kssssssrlllllllk...kssssssrllllllk............',
      '.ksssssrrlllllllk...ksssssskllllllk............',
      '.ksssssrrlllllllk...ksssssskllllllk............',
      '.ksssssrkllllllk.....kssssskklllllk............',
      '..kssssskklllllk.....kssssskklllllk............',
      '..ksssssskllllllkk...ksssssssllllllkkk.........',
      '...ksrrrVrVllllVlVk...ksrtrVrVlllllVlVk........',
      '....kkkkkkkkkkkkkk.....kkkkkkkkkkkkkkk.........'],
    fram: [
      '........................',
      '........................',
      '........k.k.k.k.k.......',
      '....kkkkskskskskskkk....',
      '...kkkrkssssssssmrkkk...',
      '...kksrrkssssssmrrrkk...',
      '..ksmsrrkmssssmmrrrkrk..',
      '.ksssmkksssssssskkksrrk.',
      '.kssssksssssssssskssrrk.',
      'kssssmssmmssssmmssmsrrkk',
      'kssssmsskmmssmmkssmsrrrk',
      'kssssmssssmssmssrrmsrrrk',
      'kssssssssmssssmsrrssrrrk',
      'kssssssssmkkkkmsrrssrrrk',
      'ksssssmmrmtkktmsrkssrrrk',
      'kssssssmrrttttrrksssrrrk',
      'ksssssssmrtmrtrkssssrrrk',
      'kssssssssmrrrrmsssssrrlk',
      'kssssssssrssssssssssrrlk',
      'krsssssssrssssssssssrrlk',
      'klrssssssrssssssssssrrlk',
      'klrssssssrssssssssssrrlk',
      'klrssssssrssssssssssrrlk',
      'klrssssssrkkkkssssssrrlk',
      'klrssssssk....krssssrrlk',
      'klrssssssk....krssssrrlk',
      'klrssssssk....krssssrrlk',
      'kllrsssssk....krssssrllk',
      'kllrsssssk....krssssklk.',
      '.kkssssssk....krsssskk..',
      '...sVsVskk.....ksVsVl...',
      '..VsVsVsk......ksVsVkV..'],
  };
  // ---------- björnens anfall (steg 9.2.31) ----------
  // Björnen är Björns egen ritning (bjorn.json, samma som i spelet) och delas i kroppen, huvudet, käken, bakbenen och de två
  // frambenen. Delarna vrids kring sina leder: kroppen kring höften (bakbenen står kvar), huvudet kring nacken, käken kring
  // mungipan och frambenen kring axlarna. Konturen läggs runt allt efteråt, som i ritningen.
  const BJL = { k: ['kol', 0], s: ['jord', 1], l: ['kol', 1], m: ['kol', 2], r: ['jord', 0], t: ['jord', 2], V: ['ben', 1], M: ['rost', 0], T: ['ben', 3] };
  const BS = utanKontur(BJ.sida, 'k'), BF = utanKontur(BJ.fram, 'k');
  const SIDA = {
    fjarr: del(BS, (x, y) => y >= 18 && x >= 28 && x <= 37), // frambenet på andra sidan
    kropp: del(BS, (x, y) => !(y >= 23 && x <= 18) && !(y >= 22 && x >= 19) && x <= 38),
    bak: del(BS, (x, y, c) => y >= 23 && x <= 18 && !(x >= 9 && (c === 'l' || x >= 11))), // bakbenet närmast
    bakFjarr: del(BS, (x, y, c) => y >= 23 && x >= 9 && x <= 18 && (c === 'l' || x >= 11)), // bakbenet på andra sidan
    hala: ATTA(BS.map((r, y) => r.map((c, x) => x >= 39 && y >= 15 && y <= 19 && c !== '.' ? (y === 15 && (x === 42 || x === 44) ? 'T' : 'M') : '.'))), // munnen: där käken är när den är stängd
    huvud: del(BS, (x, y) => x >= 34 && y <= 19 && !(x >= 39 && y >= 15)),
    kake: del(BS, (x, y) => x >= 39 && y >= 15 && y <= 19),
    nar: del(BS, (x, y) => y >= 18 && x >= 19 && x <= 27), // frambenet närmast
  };
  const HOFT = [9, 22], NACKE = [35, 12], KAKLED = [39, 15], AXEL = [23, 19], AXEL2 = [32, 19];
  // p: kroppen (grader, minus = framdelen upp), fram (punkter framåt), huvud, kaken (öppen), nar och fjarr (frambenens
  // vinkel på skärmen: 0 rakt ned, -90 rakt fram, -180 rakt upp, plus bakåt)
  function bjornSida(p, W, H, ox, oy) {
    const O = T(ox + (p.fram || 0), oy), Mt = mul(O, kring(HOFT, p.kropp));
    const Mh = kring(NACKE, p.huvud, ap(Mt, NACKE)), Mk = mul(Mh, kring(KAKLED, p.kaken || 0));
    const ben = (axel, v) => kring(axel, v, ap(Mt, axel));
    const upp = Math.min(1, -p.kropp / 60); // bakbenen går ihop under kroppen när björnen reser sig
    return lagg([
      { G: SIDA.bakFjarr, m: T(ox - Math.round(upp * 3), oy), kant: false },
      { G: SIDA.fjarr, m: ben(AXEL2, p.fjarr), led: ap(Mt, AXEL2), fog: 4 },
      { G: SIDA.kropp, m: Mt },
      { G: SIDA.bak, m: T(ox, oy), led: ap(T(ox, oy), HOFT), fog: 8 },
      { G: SIDA.hala, m: Mh, kant: false },
      { G: SIDA.huvud, m: Mh, led: ap(Mt, NACKE), fog: 9 },
      { G: SIDA.kake, m: Mk, led: ap(Mh, KAKLED), fog: 2 },
      { G: SIDA.nar, m: ben(AXEL, p.nar), led: ap(Mt, AXEL), fog: 5 },
    ], W, H, 'k');
  }
  // framifrån: kroppen sträcks uppåt när björnen reser sig (bakbenen står kvar), huvudet följer med, och frambenen blir armar
  // som lyfts och slår (benen i ritningen, vridna kring axlarna)
  const FRAM = {
    benV: del(BF, (x, y) => y >= 24 && x <= 10), benH: del(BF, (x, y) => y >= 24 && x >= 13),
    kropp: del(BF, (x, y) => y <= 25),
    huvud: del(BF, (x, y) => y <= 17 && x >= 3 && x <= 20),
    hala: ATTA(BF.map((r, y) => r.map((c, x) => ((x - 11.5) / 3) ** 2 + ((y - 16.5) / 2) ** 2 <= 1 ? (y === 15 && (x === 10 || x === 13) ? 'T' : 'M') : '.'))),
    armV: del(BF, (x, y) => y >= 19 && x <= 9), armH: del(BF, (x, y) => y >= 19 && x >= 14),
  };
  // p: sträck (1 = som ritningen), huvud (punkter åt sidan), ned (huvudet ned), gap (munnen öppen), v och h (armarnas
  // vinkel: 0 rakt ned, plus utåt till vänster i bilden, minus åt höger), stor (hela björnen större när den kastar sig fram)
  function bjornFram(p, W, H, ox, oy) {
    const O = mul(T(ox + 12, oy + 31), mul(SK(p.stor || 1, p.stor || 1), T(-12, -31)));
    const Mb = mul(O, mul(T(12, 25), mul(SK(1, p.strack), T(-12, -25))));
    const hp = ap(Mb, [12, 17]), Mh = kring([12, 17], p.lut || 0, [hp[0] + (p.huvud || 0), hp[1] + (p.ned || 0)]);
    const delar = [
      { G: FRAM.benV, m: O, kant: false }, { G: FRAM.benH, m: O, kant: false },
      { G: FRAM.kropp, m: Mb, kant: false },
      { G: FRAM.huvud, m: Mh, kant: false },
    ];
    if (p.gap) delar.push({ G: FRAM.hala, m: mul(Mh, mul(T(11.5, 15), mul(SK(1, p.gap), T(-11.5, -15)))) });
    const arm = (G, led, axel, v, f) => ({ G, m: kring(led, v, ap(Mb, axel)), led: ap(Mb, axel), fog: f });
    delar.push(arm(FRAM.armH, [18.5, 19.5], [18.5, 15], p.h, 4), arm(FRAM.armV, [4.5, 19.5], [4.5, 15], p.v, 4));
    return lagg(delar, W, H, 'k');
  }
  // de tre rörelserna, fyra bilder var (som människornas slag): från sidan och framifrån
  const BJORN_ANFALL = [
    ['Björnen reser sig rakt upp på bakbenen, vrålar med öppen mun och slår ned med den närmaste ramen.',
      [{ kropp: -22, huvud: -8, kaken: 0, nar: -45, fjarr: -30 }, { kropp: -62, huvud: -22, kaken: 28, nar: -150, fjarr: -45 }, { kropp: -58, huvud: -6, kaken: 18, nar: -40, fjarr: -40, fram: 1 }, { kropp: -42, huvud: -4, kaken: 4, nar: -12, fjarr: -40 }],
      [{ strack: 1.12, gap: 0, v: 18, h: -18 }, { strack: 1.45, gap: 1.2, v: 160, h: -35, ned: -1 }, { strack: 1.4, gap: 0.8, v: -50, h: -30 }, { strack: 1.25, gap: 0, v: -20, h: -15 }]],
    ['Björnen kastar sig framåt: den reser sig bara lite, lyfter ramen och slår den rakt ned framför sig med hela tyngden.',
      [{ kropp: -14, huvud: 0, kaken: 8, nar: -40, fjarr: -25, fram: -1 }, { kropp: -38, huvud: -12, kaken: 24, nar: -160, fjarr: -70, fram: -1 }, { kropp: -6, huvud: 8, kaken: 14, nar: -55, fjarr: -45, fram: 5 }, { kropp: -4, huvud: 4, kaken: 0, nar: -10, fjarr: -5, fram: 3 }],
      [{ strack: 1.08, gap: 0.6, v: 25, h: -25 }, { strack: 1.3, gap: 1.2, v: 150, h: -150, ned: -1 }, { strack: 1, gap: 0.8, v: 30, h: -30, ned: 2, stor: 1.12 }, { strack: 1, gap: 0, v: 8, h: -8, ned: 1, stor: 1.06 }]],
    ['Björnen står upprest och slår från sidan: ramen dras bakåt och sveper sedan vågrätt framför den.',
      [{ kropp: -50, huvud: -10, kaken: 6, nar: 30, fjarr: -30 }, { kropp: -55, huvud: -14, kaken: 22, nar: 105, fjarr: -40 }, { kropp: -58, huvud: 0, kaken: 18, nar: -92, fjarr: -45, fram: 1 }, { kropp: -52, huvud: -4, kaken: 6, nar: -55, fjarr: -35 }],
      [{ strack: 1.35, gap: 0, v: 45, h: -25, huvud: 0 }, { strack: 1.4, gap: 1, v: 95, h: -30, huvud: -1, lut: -6 }, { strack: 1.4, gap: 1, v: -95, h: -35, huvud: 1, lut: 6 }, { strack: 1.35, gap: 0.4, v: -55, h: -25, huvud: 1 }]],
  ];
  const BW = 66, BH = 58, FW = 40;
  byt({ id: 'f9_bjorn_anfall', namn: 'Björnens anfall', typ: 'tre',
    vad: 'Steg 9.2.31: i striden på kartan reser sig björnen och slår med ramen, en bild per slag (fyra bilder, i samma takt som människornas slag). Nu är det spelets egen björn, Björns ritning, med samma päls, huvud och kroppsform: delarna vrids kring lederna så att samma björn reser sig på bakbenen och slår med ena framtassen. Tre sätt att röra sig, var och ett från sidan (till vänster) och framifrån (till höger). Din kommentar förra gången: ”dethär ser inte ut som den befintliga björnen över huvud taget”',
    versioner: BJORN_ANFALL.map(([text, sida, fram]) => ({ text, w: BW + FW + 6, h: BH, rutor: RUTOR, takt: TAKT, rita: (B, P, ruta = 0) => {
      gras(B);
      fotskugga(B, 16, BH - 3, 14); fotskugga(B, BW + 3 + FW / 2, BH - 3, 11);
      ritaRutnat(B, bjornSida(sida[ruta], BW, BH, 8, BH - 34), BJL, 0, 0);
      ritaRutnat(B, bjornFram(fram[ruta], FW, BH, 8, BH - 34), BJL, BW + 2, 0);
    } })) });

  // ---------- vargens anfall (steg 9.2.31) ----------
  // Vargen är spelets varg (djur.js, VARGTYP version 1, den smala och arga, i den grå pälsen) och byggs av samma former:
  // ellipser för bröst, höft, hals och huvud, kilar för nos och öron och tjocka linjer för ben och svans. Här får formerna
  // ett läge: framdelen kan lyftas, kroppen huka, huvudet sträckas fram, vridas och skakas, öronen läggas bakåt och käken
  // öppnas (underkäken vrids kring mungipan, och gapet är rött med vita tänder).
  const VL = { o: ['skiffer', 0], d: ['skiffer', 1], m: ['skiffer', 2], l: ['skiffer', 3], c: ['ben', 2], b: ['ben', 3], k: ['kol', 0], r: ['rost', 2], R: ['rost', 1], a: ['senap', 3] };
  function former(w, h, lista) { // som i djur.js, men utan att ta bort tomma rader överst (så att foten står still mellan bilderna)
    const g = Array.from({ length: h }, () => Array(w).fill('.'));
    for (const [inne, ton] of lista) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!inne(x + 0.5, y + 0.5)) continue;
      const c = typeof ton === 'function' ? ton(x + 0.5, y + 0.5) : ton; if (c) g[y][x] = c;
    }
    const ut = g.map(r => r.slice());
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[y][x] === '.') {
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx] && g[y + dy][x + dx] !== '.')) ut[y][x] = 'o';
    }
    return ut;
  }
  const ell = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const linje = (pts, r0, r1 = r0) => (x, y) => {
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
  const vridIn = (cx, cy, g) => { const r = -g * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return (x, y) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]; };
  const VT = { ben: 7.5, kropp: 3.1, ruff: 3.2, huvud: 2.8, nos: 4.4, svans: 1.8, sank: 0.6 }; // spelets varg (VARGTYP[0])
  // p: fram (hela vargen framåt), huka (benen kortare), lyft (framdelen upp, punkter vid bröstet), hx och hy (huvudet fram
  // och ned), vrid (huvudet, minus = nosen upp), gap (underkäken öppen, grader), oron (bakåt), framBen ('lyft' eller 'strack'),
  // bak (bakfötterna bakåt)
  function vargSida(p) {
    const t = VT, W = 48, H = 34, fot = H - 1, ben = t.ben - (p.huka || 0), bot = fot - ben, mitt = bot - t.kropp, rygg = mitt - t.kropp;
    const X = 3 + (p.fram || 0), lyft = p.lyft || 0;
    const hx = 26.5 + (p.hx || 0), hy = rygg - 1.2 + t.sank + (p.hy || 0), nx = hx + t.nos;
    const brost = ell(19, mitt + 0.4, 5.2, t.kropp + 0.4), hoft = ell(8, mitt - 0.2, 4.6, t.kropp - 0.2);
    const midja = (x, y) => x > 8 && x < 19 && y > rygg + 0.3 + (x - 8) * -0.03 && y < bot - 0.6 - Math.sin((x - 8) / 11 * Math.PI) * 1.6;
    const kropp = och(brost, hoft, midja);
    const hals = linje([[20, mitt], [hx - 1, hy + 0.8]], t.ruff, t.huvud);
    // huvudet: vrids kring sin mitt; underkäken vrids dessutom kring mungipan
    const V = vridIn(hx, hy, p.vrid || 0), hv = f => (x, y) => f(...V(x, y));
    const mun = [hx + 0.2, hy + 1.8], K = vridIn(mun[0], mun[1], p.gap || 0), kv = f => (x, y) => { const [a, b] = V(x, y); return f(...K(a, b)); };
    const huvud = ell(hx, hy, t.huvud + 0.4, t.huvud);
    const nosen = och(tri([hx, hy - 0.9], [nx, hy + 0.9], [hx, hy + t.huvud * 0.9]), ell(nx - 0.6, hy + 1.2, 0.9, 0.7));
    const ovre = (x, y) => nosen(x, y) && y < mun[1], undre = (x, y) => nosen(x, y) && y >= mun[1];
    const gapet = (x, y) => { if (!p.gap) return false; const a = Math.atan2(y - mun[1], x - mun[0]) * 180 / Math.PI, d = Math.hypot(x - mun[0], y - mun[1]); return a >= -2 && a <= p.gap + 2 && d < t.nos + 0.2; };
    const ora = (x0) => p.oron ? tri([x0 - 1.6, hy - t.huvud + 1.2], [x0 + 1.4, hy - t.huvud + 0.8], [x0 - 3.6, hy - t.huvud - 1]) : tri([x0 - 1.5, hy - t.huvud + 1], [x0 + 1.5, hy - t.huvud + 1], [x0 - 0.4, hy - t.huvud - 3.2]);
    const framBen = (x) => p.framBen === 'lyft' ? linje([[x, bot - 1], [x + 2, bot + ben * 0.35], [x + 3.6, bot + ben * 0.5]], 0.8, 0.65)
      : p.framBen === 'strack' ? linje([[x, bot - 1], [x + 2.6, bot + ben * 0.45], [x + 4.4, fot - 0.8]], 0.8, 0.65)
        : linje([[x, bot - 1], [x + 0.2, fot - 1.2], [x + 0.8, fot - 0.4]], 0.8, 0.65);
    const bk = p.bak || 0, bakBen = (x) => linje([[x + 1.2, bot - 1.8], [x - 1.2 - bk * 0.5, bot + ben * 0.55], [x - 0.6 - bk, fot - 1], [x + 0.2 - bk, fot - 0.4]], 1.5, 0.65);
    const svansSpets = [-1.6, fot - ben * 0.4 - (p.svans || 0)];
    const svans = och(linje([[4.2, rygg + 0.8], [1, rygg + 3.4 - (p.svans || 0) * 0.5]], 0.9, 1.7), linje([[1, rygg + 3.4 - (p.svans || 0) * 0.5], svansSpets], 1.7, 0.8));
    const ex = Math.floor(hx + 0.6), ey = Math.floor(hy - 0.3);
    const ton = (x, y) => { const u = (y - rygg) / (bot - rygg); return u < 0.3 ? 'd' : u < 0.72 ? 'm' : 'l'; };
    // framdelen lyfts: en punkt framför höften hämtas så mycket längre ned i formen
    const upp = x => lyft * Math.max(0, Math.min(1.25, (x - 8) / 11));
    const L = f => (x, y) => f(x, y + upp(x));
    const lista = [
      [och(L(framBen(16.5)), bakBen(6.2)), 'd'],
      [svans, (x, y) => y > svansSpets[1] - 1.2 ? 'k' : x > 2.6 - (y - rygg) * 0.4 ? 'd' : 'l'],
      [L(kropp), (x, y) => ton(x, y + upp(x))],
      [L(hals), (x, y) => { y += upp(x); return (y > mitt - 0.5 || x > hx - 2.5 && y > hy + 1) ? 'c' : y < rygg + 1 + t.sank * 0.5 ? 'd' : 'm'; }],
      [och(L(framBen(19.5)), bakBen(9)), (x, y) => y > fot - 1.6 ? 'l' : 'm'],
      [L(hv(gapet)), (x, y) => { const [a, b] = V(x, y + upp(x)); return Math.hypot(a - mun[0], b - mun[1]) < 1.6 ? 'R' : 'r'; }],
      [L(hv(ora(hx - 1.6))), 'd'], [L(hv(ora(hx + 0.8))), (x, y) => { const [a, b] = V(x, y + upp(x)); return a > hx + 0.2 && a < hx + 1.2 && b > hy - t.huvud - 1.6 && !p.oron ? 'k' : 'm'; }],
      [L(hv(huvud)), (x, y) => V(x, y + upp(x))[1] < hy - 0.6 ? 'm' : 'l'],
      [L(kv(undre)), (x, y) => { const [a, b] = V(x, y + upp(x)), [u, v] = K(a, b); return p.gap && v < mun[1] + 0.9 && (Math.round(u) === Math.round(nx - 1.4) || Math.round(u) === Math.round(nx - 3)) ? 'b' : 'c'; }],
      [L(hv(ovre)), (x, y) => { const [a, b] = V(x, y + upp(x)); return a > nx - 1.4 && b < hy + 1.7 ? 'k' : b > hy + 0.8 ? (p.gap && b > mun[1] - 0.9 && (Math.round(a) === Math.round(nx - 1.6) || Math.round(a) === Math.round(nx - 3.2)) ? 'b' : 'c') : 'l'; }],
      [L(och(punkt(18, Math.floor(rygg) - 1), punkt(20, Math.floor(rygg) - 1), punkt(22, Math.floor(rygg) - 1), punkt(21, Math.floor(rygg) - 2))), 'd'], // rest nackhår
      [L(hv(punkt(ex, ey))), 'a'], [L(hv(punkt(ex + 1, ey))), 'k'],
      ...(p.gap ? [] : [[L(hv((x, y) => Math.floor(y) === Math.floor(hy + 1.8) && x > hx + 0.4 && x < nx - 0.8)), 'k'], [L(hv(punkt(Math.floor(nx - 1.6), Math.floor(hy + 2.8)))), 'b']]),
    ];
    return former(W + 3, H, lista.map(([f, ton]) => [(x, y) => f(x - X, y), typeof ton === 'function' ? (x, y) => ton(x - X, y) : ton]));
  }
  // framifrån: huvudet kommer ned och fram (lite större), skakas åt sidan och vrids, munnen öppnas; när vargen hoppar
  // lyfts framdelen och frambenen viks upp
  function vargFram(p) {
    const t = VT, W = 21, H = 34, fot = H - 1, c = 10.5, ben = t.ben - (p.huka || 0), bot = fot - ben, lyft = p.lyft || 0;
    const r = t.huvud + 0.5 + (p.stor || 0), hx = c + (p.hx || 0), hy = bot - t.kropp * 2 - 1.2 + t.sank + (p.hy || 0) - lyft;
    const V = vridIn(hx, hy, p.vrid || 0), hv = f => (x, y) => f(...V(x, y));
    const ora = (s) => p.oron ? tri([hx + s * 1.6, hy - r + 0.9], [hx + s * 4.2, hy - r + 2.2], [hx + s * 4.4, hy - r - 0.6]) : tri([hx + s * 1.2, hy - r + 0.9], [hx + s * 3.6, hy - r + 1.4], [hx + s * 2.8, hy - r - 2.6]);
    const ny = hy + r * 0.65, g = p.gap || 0; // nosen och hur öppen munnen är (0–1)
    const framBen = s => lyft ? linje([[c + s * 1.3, bot - 1 - lyft], [c + s * 2.4, bot + ben * 0.3 - lyft], [c + s * 1.6, bot + ben * 0.5 - lyft]], 0.75) : linje([[c + s * 1.3, bot - 1], [c + s * (1.4 + (p.isar || 0)), fot - 0.4]], 0.75);
    return former(W, H, [
      [ell(c, bot - t.kropp - lyft * 0.5, t.kropp + 1, t.kropp + 0.4 + lyft * 0.5), 'd'],
      [och(linje([[c - 3, bot - 1], [c - 3.1 - (p.isar || 0) * 0.5, fot - 0.4]], 0.7), linje([[c + 3, bot - 1], [c + 3.1 + (p.isar || 0) * 0.5, fot - 0.4]], 0.7)), 'd'],
      [ell(c, bot - t.kropp + 0.6 - lyft, t.ruff * 0.72, t.kropp + 0.9), (x, y) => Math.abs(x - c) < 1.3 ? 'c' : 'm'],
      [hv(ell(hx, hy + r + 0.2, r - 0.2, 1)), 'd'],
      [och(framBen(-1), framBen(1)), (x, y) => y > fot - 1.6 - (lyft ? 99 : 0) && !lyft ? 'l' : y > bot + ben * 0.4 - lyft ? 'l' : 'm'],
      [hv(och(ora(-1), ora(1))), (x, y) => { const [a, b] = V(x, y); return !p.oron && Math.abs(a - hx) > 2.2 && Math.abs(a - hx) < 3.4 && b > hy - r - 0.5 ? 'k' : 'm'; }],
      [hv(ell(hx, hy, r + 0.9, r)), (x, y) => { const [a, b] = V(x, y); return b < hy - 0.8 ? 'm' : 'l'; }],
      [hv(ell(hx, ny + g * 1.6, 1.7 + g * 0.3, 1.4 + g * 1.2)), 'c'], // nosen och underkäken
      ...(g ? [
        [hv(ell(hx, ny + 1.3 + g * 1.2, 1.3 + g * 0.4, 0.5 + g * 0.9)), (x, y) => { const [a, b] = V(x, y); return Math.abs(b - (ny + 1.3 + g * 1.2)) < 0.5 + g * 0.2 && Math.abs(a - hx) < 0.9 ? 'R' : 'r'; }], // gapet
        [hv(och(punkt(Math.floor(hx) - 1, Math.floor(ny + 1)), punkt(Math.floor(hx) + 1, Math.floor(ny + 1)), punkt(Math.floor(hx) - 1, Math.floor(ny + 1.8 + g * 2.2)), punkt(Math.floor(hx) + 1, Math.floor(ny + 1.8 + g * 2.2)))), 'b'], // tänderna
      ] : [
        [hv((x, y) => Math.floor(y) === Math.floor(ny + 1.2) && Math.abs(x - hx) < 1.8), 'k'],
        [hv(och(punkt(Math.floor(hx) - 1, Math.floor(ny + 2.2)), punkt(Math.floor(hx) + 1, Math.floor(ny + 2.2)))), 'b'],
      ]),
      [hv(och(punkt(Math.floor(hx) - 2, Math.floor(hy)), punkt(Math.floor(hx) + 2, Math.floor(hy)), punkt(Math.floor(hx), Math.floor(hy + r * 0.45)))), (x, y) => Math.abs(V(x, y)[0] - hx) > 1 ? 'a' : 'k'],
      [hv(och(punkt(Math.floor(hx) - 1, Math.floor(hy)), punkt(Math.floor(hx) + 1, Math.floor(hy)))), 'k'],
    ]);
  }
  const VARG_ANFALL = [
    ['Vargen hukar, kastar fram huvudet med gapet uppspärrat och hugger rakt fram, och drar sig sedan tillbaka.',
      [{ huka: 1, hx: -1.5, hy: 1.5, gap: 0 }, { fram: 2, hx: 2, hy: 0.5, gap: 32, oron: true, framBen: 'strack', bak: 2 }, { fram: 3, hx: 3, hy: 0.5, gap: 4, framBen: 'strack', bak: 2 }, { fram: 1, hx: 0.5, hy: 0.5, gap: 12 }],
      [{ huka: 1, hy: 1.5 }, { hy: 1, stor: 0.6, gap: 1, isar: 1 }, { hy: 2, stor: 1, gap: 0.2, isar: 1 }, { hy: 1, stor: 0.3, gap: 0.5 }]],
    ['Vargen hoppar upp mot strupen: framdelen lyfts, frambenen viks upp och käftarna slår ihop högt upp.',
      [{ huka: 1.5, hx: -1, hy: 1, gap: 8 }, { lyft: 5, fram: 1, vrid: -20, gap: 34, framBen: 'lyft', bak: 1, svans: 1 }, { lyft: 7, fram: 3, vrid: -12, hx: 1, gap: 3, framBen: 'lyft', bak: 2, svans: 1 }, { lyft: 2, fram: 2, vrid: -4, gap: 10, framBen: 'strack' }],
      [{ huka: 1.5, hy: 1, gap: 0.3 }, { lyft: 5, gap: 1 }, { lyft: 7, gap: 0.1, stor: 0.5 }, { lyft: 2, gap: 0.5 }]],
    ['Vargen biter lågt och sliter: huvudet nere vid marken, käftarna slår ihop och huvudet skakas åt sidorna.',
      [{ huka: 0.5, hx: 1, hy: 4, vrid: 18, gap: 30 }, { huka: 0.5, hx: 1.5, hy: 4.5, vrid: 22, gap: 2, oron: true, bak: 1 }, { huka: 0.5, hx: 1, hy: 3.5, vrid: 8, gap: 2, bak: 2 }, { huka: 0.5, hx: 1.5, hy: 4.5, vrid: 28, gap: 2, oron: true, bak: 1 }],
      [{ hy: 3, gap: 1, isar: 1 }, { hy: 3.5, hx: -2, vrid: -18, gap: 0.2, isar: 1 }, { hy: 3.5, hx: 2, vrid: 18, gap: 0.2, isar: 1 }, { hy: 3, hx: -1, vrid: -8, gap: 0.3, isar: 1 }]],
  ];
  byt({ id: 'f9_varg_anfall', namn: 'Vargens anfall', typ: 'tre',
    vad: 'Steg 9.2.31: i striden på kartan hugger vargen med käftarna, en bild per slag (fyra bilder, i samma takt som människornas slag). Nu är det spelets egen varg, byggd av samma former som i djur.js med samma päls, huvud, öron och svans: formerna får ett läge, så att samma varg hukar, sträcker fram huvudet, lägger öronen bakåt och öppnar käftarna. Tre sätt att röra sig, var och ett från sidan (till vänster) och framifrån (till höger). Din kommentar förra gången: ”dethär ser inte ut som vargen över huvud taget”',
    versioner: VARG_ANFALL.map(([text, sida, fram]) => ({ text, w: 82, h: 38, rutor: RUTOR, takt: TAKT, rita: (B, P, ruta = 0) => {
      gras(B);
      fotskugga(B, 24, 35, 12); fotskugga(B, 68, 35, 6);
      ritaRutnat(B, vargSida(sida[ruta]), VL, 2, 2);
      ritaRutnat(B, vargFram(fram[ruta]), VL, 58, 2);
    } })) });

})();
