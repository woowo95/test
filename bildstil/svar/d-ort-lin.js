// Björns svar på benlimmet, salvan och tjäran (7.6.4–7.6.6) och linet och lintyget (7.7.8 och 7.7.10): nya versioner
// som byter ut korten med samma id i VAL. I paletten, 16 punkter per ruta, kolkontur som de andra bilderna.
(() => {
  const { KORT, former, ell, linje, rakt, poly, lagg, PA_MARK, gras, bredd, hash } = window.F7;
  const fx = Math.floor;
  // en bokstav per ramp och ton (0 mörkast, 3 ljusast), som i 7.6-ortkoket.js; 'o' är konturen
  const L = {
    a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3', e: 'senap0', f: 'senap1', g: 'senap2', h: 'senap3',
    r: 'rost0', s: 'rost1', t: 'rost2', u: 'rost3', v: 'ben0', w: 'ben1', x: 'ben2', y: 'ben3',
    K: 'kol1', l: 'kol2', m: 'kol3', Q: 'skiffer0', R: 'skiffer1', S: 'skiffer2', T: 'skiffer3',
    i: 'oliv0', j: 'oliv1', n: 'oliv2', p: 'oliv3', A: 'barr0', C: 'barr1', D: 'barr2', E: 'barr3',
  };
  function MED(rader) { // en liten handritad sak med kontur (som i 7.6-ortkoket.js)
    const w = Math.max(...rader.map(r => r.length));
    return former(w + 2, rader.length + 2, [[(x, y) => (rader[fx(y) - 1] || '')[fx(x) - 1] > '.', (x, y) => rader[fx(y) - 1][fx(x) - 1]]]);
  }
  // en ellips som lutar (vinkel i radianer)
  const rell = (cx, cy, rx, ry, v) => (x, y) => { const c = Math.cos(v), s = Math.sin(v), dx = x - cx, dy = y - cy; return ((dx * c + dy * s) / rx) ** 2 + ((-dx * s + dy * c) / ry) ** 2 <= 1; };
  // en sak på gräset, som linet och lintyget i 7.8-nya.js
  function PA(rader, text) { const m = 4, w = bredd(rader) + m * 2, h = rader.length + m * 2; return { text, w, h, rita: B => { gras(B); lagg(B, rader, L, m, m); } }; }
  const SET = (id, kort) => { const i = VAL.findIndex(s => s.id === id); if (i >= 0) VAL[i] = kort; else VAL.push(kort); };

  // ---------- benlim: version 1 (träskålen) med större öppning ----------
  // skålen sedd snett ovanifrån: kanten är en ellips, buken under, och öppningen fylld med limmet
  function limskal(w, ry, djup, o = {}) {
    const W = w + 2, cx = 1 + w / 2, cy = 1 + ry, rx = w / 2, H = fx(cy + ry + djup) + 3;
    const iry = ry - 0.8, irx = rx - 1.3, icy = cy + 0.2;
    return former(W, H, [
      [rakt(cx - 3, cy + ry + djup - 1, cx + 3, cy + ry + djup + 1), 'a'], // foten
      [(x, y) => y >= cy && ((x - cx) / rx) ** 2 + ((y - cy) / (ry + djup)) ** 2 <= 1, (x, y) => { const u = (x - cx) / rx; return y > cy + ry + djup - 1.6 ? 'b' : u < -0.55 ? 'd' : u < 0.45 ? 'c' : 'b'; }],
      [ell(cx, cy, rx, ry), (x, y) => (x - cx) / rx + (y - cy) / ry * 0.4 < 0.3 ? 'd' : 'c'], // kanten
      [ell(cx, icy, irx, iry), (x, y) => { // öppningen: innerväggen längst bak, sedan limmet med glans
        if (y - (icy - iry) < 1) return 'b';
        if (((x - cx + irx * 0.4) / 1.8) ** 2 + ((y - icy + 0.2) / 0.8) ** 2 <= 1) return o.glans || 'h';
        return (x - cx) / irx + (y - icy) / iry * 0.6 > 0.45 ? o.mork || 'e' : o.mitt || 'f';
      }],
      ...(o.droppe ? [[linje([[cx + o.droppe, cy + ry - 0.5], [cx + o.droppe, cy + ry + 2.2]], 0.55), 'e'], [ell(cx + o.droppe, cy + ry + 2.4, 0.9, 1.1), 'e']] : []),
      ...(o.pinne ? [[linje([[cx + 1, icy], [cx + rx + 2, 1]], 0.55), 'c'], [rakt(cx + rx + 1, 1, cx + rx + 2, 2), 'd']] : []),
    ]);
  }
  SET('f7_benlim', KORT('f7_benlim', 'Benlim', 'Steg 7.6.6: benlimmet i träskålen, version 1 som du valde. Två versioner med en mycket större öppning, så att limmet syns. Din kommentar förra gången: "Gör två versioner av version 1. Gör öppningen i skålen större".', [
    PA_MARK('En större träskål med en vid öppning full av segt brunt lim, med en glans.', limskal(13, 3.5, 4, {}), L),
    PA_MARK('En bredare och lägre skål med limmet ända upp till kanten och en droppe som runnit över.', limskal(16, 4, 3, { mitt: 'f', mork: 'e', glans: 'g', droppe: 4 }), L),
  ]));

  // ---------- salva: tre helt nya ----------
  // 1: en rund trädosa med salvan, och locket lutat mot dosan
  const dosa = former(20, 15, [
    [rell(15.2, 8.6, 2.4, 5.4, 0.28), (x, y) => { const d = Math.hypot((x - 15.2) / 2.4, (y - 8.6) / 5.4); return d > 0.72 ? 'b' : x < 15 ? 'd' : 'c'; }], // locket bakom
    [(x, y) => y >= 5 && y < 12 && Math.abs(x - 7.5) <= 6.5, (x, y) => x < 3 ? 'd' : x > 12 ? 'b' : fx(x) % 4 === 1 ? 'b' : 'c'], // sidan, med fibrer
    [ell(7.5, 12, 6.5, 2), (x, y) => y < 12 ? 'c' : 'b'], // bottnens rundning
    [ell(7.5, 5, 6.5, 2.6), 'd'], // kanten
    [ell(7.5, 5.2, 5.2, 1.8), (x, y) => y < 4.1 ? 'b' : ((x - 5.5) / 1.6) ** 2 + ((y - 4.9) / 0.7) ** 2 <= 1 ? 'y' : x > 10 ? 'n' : 'p'], // salvan
  ]);
  // 2: salvan inlindad i ett stort blad, knutet med ett strå
  const blad = former(19, 15, [
    [linje([[2, 13], [4.5, 10.5]], 0.6), 'A'], // skaftet
    [(x, y) => ((x - 9.5) / 7) ** 2 + ((y - 8) / 5.2) ** 2 <= 1, (x, y) => { // paketet
      if (Math.abs((y - 8) - (x - 9.5) * 0.15) < 0.5) return 'A'; // mittnerven
      if (Math.abs((y - 8) + Math.abs(x - 9.5) * 0.7 - (fx(x / 3) % 2 ? 2.4 : -2.4)) < 0.45) return 'C'; // sidonerverna
      return (x - 9.5) / 7 + (y - 8) / 5.2 > 0.5 ? 'C' : (x - 9.5) / 7 + (y - 8) / 5.2 < -0.6 ? 'E' : 'D';
    }],
    [poly([[11, 4], [17.5, 1], [15, 6]]), (x, y) => y < 3.5 ? 'E' : 'D'], // bladspetsen
    [ell(12.4, 4.3, 2.6, 1.2), (x, y) => x < 12 ? 'y' : 'p'], // salvan syns i öppningen
    [linje([[8.4, 2.8], [7.6, 13.4]], 0.55), 'g'], [linje([[7.8, 13], [5.8, 14]], 0.5), 'h'], // strået som knyter
  ]);
  // 3: en flat sten med en grop där salvan ligger, och en röllekablomma bredvid
  const sten = former(25, 12, [
    [ell(11, 6.5, 9.8, 4.6), (x, y) => { const u = (x - 11) / 9.8 * 0.6 + (y - 6.5) / 4.6; if (hash(fx(x), fx(y), 3) < 0.07) return 'R'; return u < -0.5 ? 'T' : u < 0.45 ? 'S' : u < 0.85 ? 'R' : 'Q'; }],
    [ell(10.5, 5.6, 5.4, 2.3), (x, y) => y < 4.2 ? 'R' : ((x - 8.6) / 1.8) ** 2 + ((y - 5.2) / 0.7) ** 2 <= 1 ? 'y' : x > 13.5 || y > 7 ? 'n' : 'p'], // gropen med salvan
    [linje([[18, 9.5], [23, 4]], 0.5), 'C'], [linje([[20.5, 7], [21.8, 8.4]], 0.5), 'D'], // stjälken och ett blad
    [ell(22.6, 3, 1.9, 1.3), (x, y) => x > 23.4 ? 'x' : 'y'], // blomkorgen
  ]);
  SET('f7_salva', KORT('f7_salva', 'Salva', 'Steg 7.6.4: salva av rölleka och talg, som läker sår. Tre helt nya versioner, med salvan blekgrön och ljus av talgen. Din kommentar förra gången: "Gör tre helt nya versioner".', [
    PA_MARK('En rund trädosa full av salva, med locket lutat mot sidan.', dosa, L),
    PA_MARK('Salvan inlindad i ett stort blad som knutits med ett strå; lite salva syns i öppningen.', blad, L),
    PA_MARK('En flat sten med en grop där salvan ligger, och en röllekablomma bredvid.', sten, L),
  ]));

  // ---------- tjära: version 1 som den är och två helt nya ----------
  const TJARA_1 = MED([ // version 1 ur 7.6-ortkoket.js, oförändrad: en lerkruka full av tjära som runnit över kanten
    '.lKKKl.',
    'uKKKKKt',
    'tsKssst',
    'ttsKsss',
    'tssKssr',
    '.ssssr.',
  ]);
  // en liten kagge av stavar och band, utan lock, med tjära som runnit nerför sidan
  const kagge = former(16, 18, [
    [(x, y) => { const t = (y - 10) / 7; return y > 3 && y < 17 && Math.abs(x - 8) <= 6.2 * (1 - 0.13 * t * t); }, (x, y) => {
      const u = (x - 8) / 6.2;
      if ([6, 7, 13, 14].includes(fx(y))) return fx(y) % 2 === 0 ? 'c' : 'a'; // banden av vidjor
      if (fx(x) % 3 === 0) return 'b'; // springan mellan stavarna
      return u < -0.6 ? 'd' : u < 0.35 ? 'c' : 'b';
    }],
    [ell(8, 3.6, 6.2, 2.6), (x, y) => x < 8 ? 'd' : 'c'], // kanten
    [ell(8, 3.8, 4.9, 1.8), (x, y) => fx(x) === 5 && fx(y) === 3 ? 'm' : fx(x) === 6 && fx(y) === 3 ? 'l' : 'K'], // tjäran, med en glans
    [linje([[11.5, 4.5], [11.5, 10.5]], 0.6), 'K'], [ell(11.5, 10.6, 0.9, 1), 'K'], // det som runnit
    [linje([[4.5, 5], [4.5, 7.5]], 0.5), 'K'],
  ]);
  // en lerflaska med smal hals och en träpropp, tjäran runnen nerför sidan och en pöl bredvid
  const flaska = former(19, 19, [
    [ell(14, 16.4, 3.6, 1.4), (x, y) => fx(x) === 13 && fx(y) === 16 ? 'l' : 'K'], // pölen
    [ell(7, 12, 5.6, 5.4), (x, y) => (x - 7) + (y - 12) * 0.6 < -3 ? 'u' : (x - 7) + (y - 12) * 0.6 < 2 ? 't' : 's'], // buken
    [rakt(5, 3, 9, 8), (x) => x < 6 ? 'u' : x > 8 ? 's' : 't'], // halsen
    [rakt(4, 3, 10, 4), 't'], // kanten på halsen
    [rakt(5.5, 1, 8.5, 3), (x, y) => fx(y) === 1 ? 'd' : 'c'], // proppen
    [linje([[8.3, 4], [8.6, 9], [10.2, 12.5]], 0.6), 'K'], [ell(10.4, 13, 0.9, 1), 'K'], // tjäran som runnit
    [linje([[5.6, 4.5], [5.6, 6.5]], 0.5), 'K'],
  ]);
  SET('f7_tjara', KORT('f7_tjara', 'Tjära', 'Steg 7.6.5: tjära, svart och seg. Version 1 som förut och två helt nya. Din kommentar förra gången: "Behåll version 1 och gör två helt nya".', [
    PA_MARK('Version 1 som förut: en lerkruka full av svart tjära som runnit över kanten.', TJARA_1, L),
    PA_MARK('En liten kagge av stavar med band av vidjor, full av tjära som runnit nerför sidan.', kagge, L),
    PA_MARK('En lerflaska med smal hals och en träpropp; tjäran har runnit nerför den och bildat en pöl bredvid.', flaska, L),
  ]));

  // ---------- lin: tre versioner av version 1, den liggande kärven ----------
  // kärven: strån från vänster (x0, ojämna ändar) till blommorna till höger, bunden med ett band.
  // o: n strån, rot: rötter i vänstra änden, band: x för banden, bandTon, blommor: [x, y] för de blå blommorna, kaps: frökapslar
  const blomma = (x, y) => [[ell(x, y, 1.5, 1.5), (X, Y) => fx(X) === fx(x) && fx(Y) === fx(y) ? 'h' : X + Y > x + y + 0.6 ? 'S' : 'T']];
  function karve(W, H, o) {
    const lista = [], strån = [];
    const n = o.n, y0 = o.y0, y1 = o.y1, t0 = o.t0, t1 = o.t1; // stråna börjar i y0..y1 till vänster och slutar i t0..t1 till höger
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1), a = [o.x0 + fx(hash(i, 1, o.s) * 3), y0 + (y1 - y0) * k], b = [o.x1 - fx(hash(i, 2, o.s) * 3), t0 + (t1 - t0) * k];
      strån.push(linje([a, b], 0.62));
      lista.push([strån[i], i % 3 === 0 ? 'h' : i % 3 === 1 ? 'g' : 'f']);
      if (o.rot) lista.push([linje([[a[0], a[1]], [a[0] - 2 - hash(i, 3, o.s) * 2, a[1] + (hash(i, 4, o.s) - 0.5) * 3]], 0.45), i % 2 ? 'b' : 'c']);
    }
    for (const bx of o.band) lista.push([(x, y) => x >= bx && x < bx + 3 && y >= 1 && y < H - 1 && strån.some(f => f(x, y) || f(x, y - 1.2) || f(x, y + 1.2)), (x) => fx(x) === bx + 1 ? o.bandTon[0] : o.bandTon[1]]);
    for (const [x, y] of o.kaps || []) lista.push([ell(x, y, 0.9, 0.9), 'n']);
    for (const [x, y] of o.blommor) lista.push(...blomma(x, y));
    return former(W, H, lista);
  }
  const LIN = [
    PA(karve(32, 14, { n: 7, s: 1, x0: 1, x1: 27, y0: 2, y1: 11, t0: 4, t1: 9, band: [10], bandTon: ['t', 's'], blommor: [[28, 4.5], [29, 8.5], [26.5, 11.5]], kaps: [[27, 7], [25, 2.5]] }), 'Som version 1, men tätare och med fler blå blommor och gröna frökapslar i toppen.'),
    PA(karve(36, 15, { n: 7, s: 2, x0: 5, x1: 30, y0: 3, y1: 12, t0: 5, t1: 10, rot: true, band: [13], bandTon: ['x', 'w'], blommor: [[31, 5], [32, 9], [29.5, 12.5], [29, 2.5]], kaps: [[30, 7.2]] }), 'Linet ryckt upp med rötterna kvar i vänstra änden, bundet med ett rep av lin.'),
    PA(karve(40, 15, { n: 8, s: 3, x0: 1, x1: 32, y0: 3, y1: 11, t0: 2, t1: 12.5, band: [9, 20], bandTon: ['t', 's'], blommor: [[33, 2.5], [34.5, 6], [33.5, 9.5], [32, 12.8], [36.5, 9]], kaps: [[35.6, 3.2], [31, 7.5], [36, 12.5]] }), 'En längre kärve bunden på två ställen, med toppen utbredd som en solfjäder full av blommor.'),
  ];
  SET('f7_lin', KORT('f7_lin', 'Lin', 'Steg 7.7.8: linet som byn skördar. Tre versioner av version 1 som du valde, den liggande kärven med de blå blommorna i toppen. Din kommentar förra gången: "Gör tre versioner utgå från version 1".', LIN));

  // ---------- lintyg: en vikt hög med tyg ----------
  // lagren nerifrån och upp: [x0, x1, tjocklek]; det översta visar ovansidan med väven och en vikning.
  // Lagren är tyg som vikts: framkanten rundad (ljus överst, mörk underst) och en mörk linje mellan lagren.
  function hog(lager, o = {}) {
    const W = Math.max(...lager.map(l => l[1])) + 3, topp = o.topp || 5;
    const H = lager.reduce((s, l) => s + l[2], 0) + topp + 2 + (o.flik ? 1 : 0);
    const lista = [];
    let y = H - 1 - (o.flik ? 1 : 0);
    const ton = o.ton || ['y', 'x', 'w', 'v'];
    lager.forEach(([x0, x1, t], k) => {
      const yb = y; y -= t; const yt = y, T = (o.lagerTon && o.lagerTon[k]) || ton;
      lista.push([rakt(x0, yt, x1, yb), (x, yy) => { const r = fx(yy) - yt; if (r === t - 1) return T[3]; if (fx(x) === x0 || fx(x) === x1 - 1) return T[2]; return r === 0 ? T[0] : r < t - 2 ? T[1] : T[2]; }]);
    });
    // ovansidan på det översta lagret, sedd lite ovanifrån: väven i rutor och en vikning på mitten
    const [x0, x1] = lager[lager.length - 1], yt = y - topp, ys = y, mitt = fx((x0 + x1) / 2);
    lista.push([poly([[x0 + 1, yt], [x1 - 1, yt], [x1, ys], [x0, ys]]), (x, yy) => {
      if (fx(x) === mitt) return ton[2];
      if (fx(x) === mitt + 1) return ton[0];
      return (fx(x) + fx(yy)) % 2 ? ton[1] : ton[0];
    }]);
    if (o.band) lista.push([(x, yy) => fx(x) >= o.band && fx(x) < o.band + 2 && yy >= yt && yy < H - 1 - (o.flik ? 1 : 0), (x) => fx(x) === o.band ? 't' : 's']);
    if (o.flik) { // det översta tyget hänger ner över framkanten, med fransar
      const [fa, fb] = o.flik;
      lista.push([rakt(fa, ys - 1, fb, H - 2), (x, yy) => fx(x) === fa || fx(x) === fb - 1 ? ton[2] : (fx(x) + fx(yy)) % 2 ? ton[1] : ton[0]]);
      lista.push([(x, yy) => fx(yy) === H - 2 && fx(x) >= fa && fx(x) < fb && fx(x) % 2 === 0, ton[2]]);
    }
    return former(W, H, lista);
  }
  const LINTYG = [
    PA(hog([[1, 24, 4], [1, 24, 4], [1, 24, 4]], { topp: 5 }), 'Tre tyger vikta lika stora och staplade rakt på varandra, med väven och vikningen synliga på det översta.'),
    PA(hog([[1, 23, 3], [2, 25, 3], [1, 24, 4], [3, 24, 3], [2, 23, 3]], { topp: 4, band: 11, lagerTon: [null, ['h', 'g', 'f', 'e'], null, ['h', 'g', 'f', 'e'], null] }), 'En högre hög av fem tyger, lite ojämnt staplade, några oblekta och gula, med ett rep om.'),
    PA(hog([[1, 25, 4], [2, 24, 4], [1, 24, 4]], { topp: 5, flik: [13, 21] }), 'Tre vikta tyger där det översta har vikts upp och hänger ner över kanten med fransar.'),
  ];
  SET('f7_lintyg', KORT('f7_lintyg', 'Lintyg', 'Steg 7.7.10: lintyget, nu som en hög med vikt tyg. Tre versioner. Din kommentar förra gången: "Gör en vikt hög med tyg".', LINTYG));
})();
