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

})();
