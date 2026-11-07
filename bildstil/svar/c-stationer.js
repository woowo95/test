// Björns svar på sex kort i valdelen (efter 7.8.1), och stationerna ritade om snett ovanifrån (regeln Stationerna ovanifrån): fångstbänken bredvid slaktbänken, stenhuggarplatsen på en bit av
// kartan, örtköket större men med lika liten eld som förut, tre nya härdar, klyvplatsen utan klubban och tre nya snaror
// ritade utan förlaga. Varje kort byter ut kortet med samma id i VAL.
(() => {
  const { KORT, former, ell, linje, och, rakt, poly, lagg, bildfil, gras, hash } = window.F7;
  const byt = kort => { const i = VAL.findIndex(s => s.id === kort.id); if (i >= 0) VAL[i] = kort; else VAL.push(kort); };

  const L = { o: 'kol0', a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3', e: 'senap0', f: 'senap1', g: 'senap2', h: 'senap3', r: 'rost0', s: 'rost1', t: 'rost2', u: 'rost3', v: 'ben0', w: 'ben1', x: 'ben2', y: 'ben3', K: 'kol1', l: 'kol2', m: 'kol3', Q: 'skiffer0', R: 'skiffer1', S: 'skiffer2', T: 'skiffer3', i: 'oliv0', j: 'oliv1', n: 'oliv2', p: 'oliv3', A: 'barr0', C: 'barr1', D: 'barr2', E: 'barr3' };
  const SK = 'QRST', TR = 'abcd';
  const fx = Math.floor;
  const sp = (B, r, x, y, sk = true) => lagg(B, r, L, x, y, sk);
  // en bild flyttad (dx, dy): det som ritas i B2 hamnar förskjutet i B, så att en färdig station kan ställas i en större scen
  const flytt = (B, dx, dy) => ({ w: B.w, h: B.h, P: B.P, satt: (x, y, i, l) => B.satt(x + dx, y + dy, i, l), get: (x, y) => B.get(x + dx, y + dy), morka: (x, y) => B.morka(x + dx, y + dy) });
  const skugga = (B, x, y, w, h = 3) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((i + j) % 2 === 0) B.morka(x + i, y + j); };
  // en liten handritad sak med kontur
  const MED = rader => { const w = Math.max(...rader.map(r => r.length)); return former(w + 2, rader.length + 2, [[(x, y) => (rader[fx(y) - 1] || '')[fx(x) - 1] > '.', (x, y) => rader[fx(y) - 1][fx(x) - 1]]]); };

  // ---------- delarna (som i 7.8-nya.js) ----------
  const rund = (w, h, R = SK, s = 0) => former(w + 2, h + 2, [[ell(1 + w / 2, 1 + h / 2, w / 2, h / 2), (x, y) => { const u = (x - 1) / w * 0.7 + (y - 1) / h; if (hash(fx(x), fx(y), s) < 0.06) return R[1]; return u < 0.5 ? R[3] : u < 1 ? R[2] : u < 1.35 ? R[1] : R[0]; }]]);
  const block = (w, h, R = SK, tp = 2) => former(w + 2, h + 2, [[rakt(1, 1, w + 1, h + 1), (x, y) => { const yy = fx(y) - 1, xx = fx(x) - 1; return yy < tp ? R[3] : xx >= w - 1 ? R[0] : yy >= h - 1 ? R[1] : R[2]; }]]);
  const stock = (w, h) => former(w + 2, h + 2, [[rakt(1, 1, w, h + 1), (x, y) => { const yy = (fx(y) - 1) / h; return yy < 0.25 ? 'd' : yy < 0.6 ? ((fx(x) * 3 + fx(y)) % 9 === 0 ? 'b' : 'c') : yy < 0.85 ? 'b' : 'a'; }], [ell(w, 1 + h / 2, 1.6, h / 2), (x, y) => Math.hypot(x - w, y - 1 - h / 2) < 0.8 ? 'x' : 'y']]);
  const flisor = (B, x0, y0, w, h, s) => { for (let i = 0; i < 12; i++) B.satt(x0 + fx(hash(i, s, 1) * w), y0 + fx(hash(i, s, 2) * h), B.P.i('skiffer', hash(i, s, 3) < 0.5 ? 3 : 2)); };
  const kryss = former(10, 13, [[linje([[1, 1], [9, 12]], 1), 'b'], [linje([[9, 1], [1, 12]], 1), 'a']]);
  const kil = former(5, 7, [[poly([[0.5, 1], [4.5, 1], [2.5, 6.5]]), (x) => x < 2.5 ? 'y' : 'w']]);

  // ---------- snett ovanifrån (regeln Stationerna ovanifrån i guiden) ----------
  // Som slaktbänken och borden: ytan ovanifrån och största delen av höjden, en mörkare framkant på 2–3 punkter,
  // bara de främre benen som korta stumpar och skuggan nedåt till höger.
  // skuggan under en station: ett helt fält som gör marken ett steg mörkare, förskjutet åt höger
  const skuggaUnder = (B, x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) B.morka(x + 2 + i, y + j); };
  // en bänk: skivan (d rader plankor på längden), framkanten (3 rader) och de två främre benen (ben rader)
  const bankOvan = (w, d, ben = 5, s = 0, plank = 4) => former(w + 2, d + ben + 5, [
    [rakt(1, 1, w + 1, d + 1), (x, y) => {
      const i = fx(x) - 1, j = fx(y) - 1, p = fx(j / plank);
      if (j % plank === plank - 1 || (i + p * 13 + s * 5) % 23 === 0) return 'b'; // fogarna
      if (j === 0) return 'd';
      const r = hash(fx(x / 3), j, s); return r < 0.1 ? 'b' : r < (i < w * 0.3 ? 0.5 : 0.28) ? 'd' : 'c';
    }],
    [rakt(1, d + 1, w + 1, d + 4), (x, y) => fx(y) === d + 1 ? 'b' : 'a'],
    [och(rakt(3, d + 4, 6, d + 4 + ben), rakt(w - 4, d + 4, w - 1, d + 4 + ben)), x => fx(x) === 3 || fx(x) === w - 4 ? 'b' : 'a'],
  ]);
  const bankHojd = (d, ben = 5) => d + ben + 5;
  // en bänk med skugga i (x, y)
  const stallBank = (B, x, y, w, d, ben = 5, s = 0) => { skuggaUnder(B, x, y + d + 4, w, ben + 1); sp(B, bankOvan(w, d, ben, s), x, y, false); };
  // en sten (eller stubbe) ovanifrån: ovansidan som en ellips och sidan f punkter under den
  const rundOvan = (w, h, f = 2, R = SK, s = 0) => { const cx = 1 + w / 2, cy = 1 + h / 2, rx = w / 2, ry = h / 2; return former(w + 2, h + f + 2, [
    [och(ell(cx, cy, rx, ry), ell(cx, cy + f, rx, ry), rakt(1, cy, w + 1, cy + f)), (x, y) => {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) { const u = (x - 1) / w * 0.6 + (y - 1) / h; if (hash(fx(x), fx(y), s) < 0.07) return R[1]; return u < 0.55 ? R[3] : R[2]; }
      return x > cx + rx * 0.35 ? R[0] : R[1];
    }],
  ]); };
  // en stubbe ovanifrån: årsringarna på snittet, barken runt och sidan under
  const stubbeOvan = (w, h, f = 3) => { const cx = 1 + w / 2, cy = 1 + h / 2, rx = w / 2, ry = h / 2; return former(w + 2, h + f + 2, [
    [och(ell(cx, cy + f, rx, ry), rakt(1, cy, w + 1, cy + f)), x => x > cx + rx * 0.3 ? 'a' : 'b'],
    [ell(cx, cy, rx, ry), (x, y) => { const d = Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2); return d > 0.82 ? 'b' : fx(d * 5) % 2 ? 'x' : 'y'; }],
  ]); };
  // ett block ovanifrån: ovansidan d rader och framsidan f rader
  const blockOvan = (w, d, f = 3, R = SK) => former(w + 2, d + f + 2, [[rakt(1, 1, w + 1, d + f + 1), (x, y) => { const i = fx(x) - 1, j = fx(y) - 1; if (j < d) return j === 0 || i === 0 ? R[3] : (i * 3 + j * 5) % 11 === 0 ? R[3] : R[2]; return i >= w - 2 ? R[0] : j === d ? R[1] : R[0 + (i % 5 !== 0)]; }]]);
  // en häll ovanifrån: ovansidan som en månghörning och en låg kant (f rader) under den
  const hallOvan = (w, h, pts, f = 2) => former(w, h, [[och(poly(pts), poly(pts.map(([x, y]) => [x, y + f]))), (x, y) => {
    if (!poly(pts)(x, y)) return x > w * 0.7 ? 'Q' : 'R';
    const r = hash(fx(x), fx(y), 9); return r < 0.08 ? 'R' : r < (x + y < w * 0.5 ? 0.6 : 0.25) ? 'T' : 'S';
  }]]);
  // en stock som ligger: barken ovanifrån (ljus överst), snittet i högra änden
  const stockOvan = (w, d) => former(w + 2, d + 2, [
    [rakt(1, 1, w, d + 1), (x, y) => { const j = (fx(y) - 1) / d; if (j < 0.12) return 'c'; if (j < 0.3) return hash(fx(x / 2), fx(y), 3) < 0.2 ? 'c' : 'd'; if (j < 0.75) return (fx(x) * 3 + fx(y)) % 11 === 0 ? 'b' : 'c'; return j < 0.9 ? 'b' : 'a'; }],
    [ell(w - 0.5, 1 + d / 2, 2.2, d / 2), (x, y) => { const e = Math.hypot((x - w + 0.5) / 2.2, (y - 1 - d / 2) / (d / 2)); return e > 0.8 ? 'w' : fx(e * 4) % 2 ? 'x' : 'y'; }],
  ]);
  // en skål ovanifrån: kanten runt och innehållet i två toner
  const skalOvan = (w, h, inne, ton2) => { const cx = 1 + w / 2, cy = 1 + h / 2; return former(w + 2, h + 3, [
    [och(ell(cx, cy, w / 2, h / 2), ell(cx, cy + 1, w / 2, h / 2)), (x, y) => ((x - cx) / (w / 2)) ** 2 + ((y - cy) / (h / 2)) ** 2 <= 1 ? 'd' : 'b'],
    [ell(cx, cy, w / 2 - 1.2, h / 2 - 1), (x, y) => hash(fx(x), fx(y), 4) < 0.35 ? ton2 : inne],
  ]); };
  // morteln ovanifrån: en stenskål med mörk grop och mortelstöten som ligger i den
  const MORTEL_OVAN = former(12, 11, [
    [och(ell(6, 5, 5, 3.6), ell(6, 6.5, 5, 3.6)), (x, y) => ((x - 6) / 5) ** 2 + ((y - 5) / 3.6) ** 2 <= 1 ? (x + y < 9 ? 'T' : 'S') : x > 8 ? 'Q' : 'R'],
    [ell(6, 5, 3, 2), (x, y) => y < 4.5 ? 'K' : 'l'],
    [linje([[5, 5], [10.5, 1.5]], 0.7), (x, y) => y < 3 ? 'y' : 'w'],
  ]);

  // ---------- 1. fångstbänken bredvid slaktbänken ----------
  // tre gånger två rutor, snett ovanifrån; slaktbänken är den godkända bilden ur bildstil/bilder
  const halvMjarde = former(26, 11, [[poly([[1, 1], [12, 2], [12, 9], [1, 10]]), (x, y) => (fx(x) + fx(y)) % 3 === 0 ? 'e' : (fx(x) + fx(y)) % 3 === 1 ? 'g' : 'f'], [linje([[12, 2], [24, 5.5]], 0.5), 'f'], [linje([[12, 5.5], [24, 5.5]], 0.5), 'g'], [linje([[12, 9], [24, 5.5]], 0.5), 'f']]);
  const snaran = (w) => former(w, 11, [[linje([[w / 2, 0], [w / 2, 4]], 0.5), 'w'], [(x, y) => { const d = Math.hypot(x - w / 2, y - 7); return d <= 3.4 && d >= 2.2; }, 'x']]);
  const vidjor = (B, x0, y0, n, len) => { for (let k = 0; k < n; k++) for (let i = 0; i < len; i++) B.satt(x0 + i + (k % 2), y0 + k, B.P.i('senap', k % 3 === 0 ? 3 : 2)); for (let k = -1; k <= n; k++) B.satt(x0 + 5, y0 + k, B.P.i('jord', 1)); };
  const KNIV = former(14, 4, [[rakt(1, 1, 8, 3), (x, y) => y < 2 ? 'T' : 'S'], [rakt(8, 1, 13, 3), 'b']]);
  const BX = 4, BY = 8, BW = 46, BD = 14; // bänken i fångstbänkens ruta (benen på samma rad som slaktbänkens)
  const BANK = [
    B => { stallBank(B, BX, BY, BW, BD, 5, 1); sp(B, halvMjarde, BX + 4, BY + 3); vidjor(B, BX + 30, BY + 5, 5, 13); },
    B => { // en ställning vid bakkanten där färdiga snaror hänger; stolparna står bakom bänken
      sp(B, former(48, 15, [[rakt(4, 1, 6, 15), 'b'], [rakt(42, 1, 44, 15), 'a'], [rakt(2, 1, 46, 3), (x, y) => y < 2 ? 'd' : 'c']]), BX, BY - 11, false);
      stallBank(B, BX, BY, BW, BD, 5, 2);
      [12, 20, 28, 36].forEach(x => sp(B, snaran(9), BX + x - 4, BY - 9, false));
      sp(B, former(10, 7, [[(x, y) => { const d = Math.hypot((x - 5) / 1.4, y - 3.5); return d <= 3.3 && d >= 1.6; }, (x, y) => y < 3 ? 'y' : 'x']]), BX + 8, BY + 6);
      sp(B, KNIV, BX + 26, BY + 9);
    },
    B => { // en kluven stock med den flata sidan upp på två kryss; buren som byggs och kniven ligger på den
      const w = 46, d = 13, x0 = BX, y0 = BY + 1;
      skuggaUnder(B, x0, y0 + d - 1, w, 7);
      const kryss = x => [linje([[x, d], [x - 3.5, d + 6]], 0.9), linje([[x, d], [x + 3.5, d + 6]], 0.9), linje([[x, 4], [x - 3.5, 0.5]], 0.9), linje([[x, 4], [x + 3.5, 0.5]], 0.9)];
      sp(B, former(w + 2, d + 9, [[och(...kryss(7), ...kryss(w - 6)), x => fx(x) % 2 ? 'a' : 'b']]), x0, y0 - 3, false);
      sp(B, former(w + 2, d + 2, [
        [rakt(1, 1, w, d + 1), (x, y) => { const j = fx(y) - 1; if (j < d - 4) return j === 0 ? 'x' : hash(fx(x / 4), j, 6) < 0.16 ? 'c' : (fx(x) + j * 7) % 19 === 0 ? 'c' : hash(fx(x), j, 7) < 0.3 ? 'x' : 'd'; return j === d - 4 ? 'c' : j < d - 1 ? ((fx(x) * 3 + j) % 10 === 0 ? 'a' : 'b') : 'a'; }], // snittet ovanifrån och barken fram
        [ell(w - 0.5, 1 + (d - 4) / 2, 1.8, (d - 4) / 2), 'w'],
      ]), x0, y0, false);
      const bur = former(22, 10, [[rakt(1, 1, 21, 2), 'b'], [rakt(1, 8, 21, 9), 'a'], ...[1, 4, 7, 10, 13, 16, 20].map(x => [rakt(x, 1, x + 1, 9), x === 1 ? 'b' : 'a'])]);
      sp(B, bur.map(r => r.replace(/o/g, '.')), x0 + 6, y0 + 1, false); sp(B, KNIV, x0 + 31, y0 + 3, false);
    },
  ];
  // slaktbänken till vänster och fångstbänken till höger, med benen på samma rad
  const VID_SLAKT = (text, f) => ({ text, w: 106, h: 42, rita: B => { gras(B); bildfil(B, 'slaktbank', 0, 14); f(flytt(B, 50, 4)); } });

  // ---------- 2. stenhuggarplatsen på en bit av kartan ----------
  const HUGG = [
    B => { // ett stort runt huggblock ovanifrån med ett block på, en stubbe att sitta på och råa stenar
      sp(B, stubbeOvan(13, 8, 4), 1, 26);
      skuggaUnder(B, 16, 34, 30, 3); sp(B, rundOvan(32, 18, 6, SK, 1), 15, 14);
      sp(B, blockOvan(14, 7, 3), 23, 15);
      [[50, 32, 10, 6, 2], [48, 10, 8, 5, 3], [4, 12, 7, 4, 4]].forEach(([x, y, w, h, i]) => sp(B, rundOvan(w, h, 2, SK, i), x, y));
      flisor(B, 10, 40, 46, 7, 1);
    },
    B => { // en lång sten på en kraftig träbock; råa stenar till vänster och färdiga block staplade till höger
      skuggaUnder(B, 12, 33, 38, 6);
      sp(B, former(42, 19, [[och(linje([[5, 9], [2, 18]], 1.2), linje([[9, 9], [12, 18]], 1.1), linje([[33, 9], [30, 18]], 1.2), linje([[37, 9], [40, 18]], 1.1)), x => fx(x) % 3 ? 'a' : 'b'], [rakt(2, 1, 40, 11), (x, y) => fx(y) < 3 ? 'd' : fx(y) < 9 ? ((fx(x) * 3 + fx(y)) % 11 === 0 ? 'b' : 'c') : 'a']]), 10, 16);
      sp(B, blockOvan(28, 9, 4), 15, 10);
      [[0, 30, 9, 6, 1], [2, 20, 8, 5, 2], [5, 38, 7, 4, 3]].forEach(([x, y, w, h, i]) => sp(B, rundOvan(w, h, 2, SK, i), x, y));
      sp(B, blockOvan(7, 5, 3), 52, 34); sp(B, blockOvan(7, 5, 3), 55, 24); sp(B, blockOvan(7, 5, 3), 54, 18);
      flisor(B, 14, 38, 36, 8, 2);
    },
    B => { // en stor flat häll ovanifrån med ett block, en mejsel och en slagsten på; en stock och stenar bakom
      sp(B, stockOvan(30, 8), 4, 2); sp(B, rundOvan(7, 5, 2, SK, 1), 40, 3); sp(B, rundOvan(6, 4, 2, SK, 2), 49, 6);
      skuggaUnder(B, 4, 40, 54, 3);
      sp(B, hallOvan(60, 34, [[3, 16], [18, 13], [44, 12], [57, 17], [55, 29], [30, 31], [4, 29]], 3), 0, 9);
      sp(B, blockOvan(15, 9, 3), 18, 18);
      sp(B, former(13, 4, [[rakt(1, 1, 9, 3), (x, y) => y < 2 ? 'T' : 'S'], [rakt(9, 1, 12, 3), (x, y) => y < 2 ? 'R' : 'Q']]), 38, 22);
      sp(B, rundOvan(6, 4, 2, SK, 5), 40, 28);
      flisor(B, 8, 30, 48, 6, 3);
    },
  ];
  // en trampad stig av jord längs en linje genom punkterna, r punkter bred åt varje håll
  const stig = (B, pts, r, s = 0) => {
    const inne = (k) => linje(pts, k);
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) {
      if (!inne(r)(x + 0.5, y + 0.5)) continue;
      const kant = !inne(r - 1)(x + 0.5, y + 0.5);
      if (kant && hash(x, y, 60 + s) < 0.45) continue; // kanten är ojämn: gräset växer in
      B.satt(x, y, kant ? B.P.i('jord', 1) : hash(x, y, 61 + s) < 0.12 ? B.P.i('jord', 1) : hash(x, y, 62 + s) < 0.06 ? B.P.i('oliv', 1) : B.P.i('jord', 2));
    }
  };
  // kartbiten: åtta gånger sex rutor gräs, en stig som svänger förbi, granar runt om och en bybo vid platsen för storleken
  const KW = 128, KH = 96, SX = 34, SY = 26;
  const kartbit = (B, f) => {
    gras(B);
    const M = window.MARK, stigen = [[-2, 88], [30, 84], [62, 87], [96, 82], [130, 76]];
    stig(B, stigen, 3.6); stig(B, [[64, 86], [62, 76]], 2.6, 1); // en stickstig upp till platsen
    if (M.tuvor) M.tuvor(B, 0, (x, y) => !(x > SX - 2 && x < SX + 66 && y > SY && y < SY + 50) && !linje(stigen, 6)(x, y));
    const G = M.granVariant;
    if (G) { G(B, 12, 30, 34, 0, 3); G(B, 30, 18, 26, 0, 8); G(B, 104, 16, 26, 0, 5); G(B, 120, 34, 36, 0, 11); }
    f(flytt(B, SX, SY));
    if (M.fram) M.fram(B, 104, 70);
    if (G) { G(B, 10, 100, 30, 0, 2); G(B, 122, 100, 26, 0, 7); }
  };
  const PA_KARTAN = (text, f) => ({ text, w: KW, h: KH, rita: B => kartbit(B, f) });

  // ---------- 3. örtköket: större station, lika liten eld som förut ----------
  // elden, krukan och grytan är samma storlek som i 7.6-ortkoket.js från början; bänken, ställningen och sakerna är större
  const laga = (B, x, y, hojd = 5) => { // en liten låga med foten i (x, y), som i 7.6
    for (let i = 0; i < hojd; i++) {
      const [ramp, ton] = i === 0 ? ['ben', 3] : i < hojd - 2 ? ['senap', 3 - (i > 2)] : ['rost', 2];
      B.satt(x, y - i, B.P.i(ramp, ton), true);
      if (i > 0 && i < hojd - 2) B.satt(x + (i % 2 ? -1 : 1), y - i, B.P.i('senap', 2), true);
    }
  };
  const anga = (B, x, y, s) => { for (let i = 0; i < 6; i++) if (hash(i, s, 5) > 0.3) B.satt(x + Math.round(Math.sin(i / 1.6 + s)), y - i, B.P.i('ben', i < 3 ? 2 : 1)); };
  const rasten = (w, h, s = 0) => rund(w, h, SK, s);
  const KRUKA = MED(['.uuuu.', '.rrrr.', '.tsss.', 'ttssss', 'ttsssr', 'tssssr', '.ssrr.']);
  const LITEN_KRUKA = MED(['.uuu.', '.rrr.', 'tsssr', 'tsssr', '.ssr.']);
  const GRYTA = MED(['w......w', '.w....w.', '..wwww..', 'TSSSSSSR', 'SKKlKKKR', 'SSSSSSRR', '.SSSSRR.', '..RRRR..']);
  // en stor förrådskruka på marken
  const STORKRUKA = former(15, 16, [[ell(7.5, 9.5, 6.3, 5.8), (x, y) => x + y < 13 ? 'u' : x + y < 18 ? 't' : 's'], [rakt(3.5, 2, 11.5, 5), (x, y) => fx(y) === 2 ? 'K' : 't'], [rakt(4.5, 2, 10.5, 3), 'r']]);
  const skal = (inne, ton2 = inne) => MED(['.dddddd.', 'd' + inne + inne + ton2 + inne + inne + ton2 + 'c', 'cddddddb', '.cccccb.', '..bbbb..']);
  const STORSKAL = (inne, ton2) => MED(['..dddddddd..', '.d' + (inne + inne + ton2).repeat(3) + 'c.', 'd' + (inne + ton2 + inne + inne).repeat(2) + inne + ton2 + 'c', 'cddddddddddb', '.cccccccccb.', '..bbbbbbbb..']);
  const KNIPPE_H = MED(['.jj.', '.ww.', 'jnnj', 'npnn', 'nnpj', 'jnnj', '.jn.']);
  const STORT_KNIPPE_H = MED(['..jj..', '..ww..', '.jnnj.', 'jnpnnj', 'npnnpn', 'nnpjnn', 'jnnpnj', '.jnnj.', '..jn..']);
  const KNIPPE_L = MED(['......npn.', 'jjjwwnnpnp', 'jjjwwnpnjn', '......jnj.']);
  const MORTEL = MED(['.......d', '......d.', '.....d..', 'TTTTTcTT', 'SllllcRR', 'SSSSSSRR', '.SSSSRR.', '..SRRR..']);
  // en bänk: en tjock planka på två ben
  const bank = (len, hojd = 4, s = 0) => former(len + 2, hojd + 7, [
    [rakt(1, 1, len + 1, 4), (x, y) => fx(y) === 1 ? 'd' : hash(fx(x / 3), fx(y), s) < 0.25 ? 'b' : 'c'],
    [rakt(1, 4, len + 1, 5), 'a'],
    [och(rakt(3, 5, 6, 6 + hojd), rakt(len - 4, 5, len - 1, 6 + hojd)), (x) => fx(x) % 3 === 2 ? 'a' : 'b'],
  ]);
  // en torkställning: två stolpar och en tvärslå
  const ram = (w, h) => former(w + 2, h + 2, [[och(rakt(2, 2, 4, h + 1), rakt(w - 2, 2, w, h + 1)), (x) => fx(x) % 2 ? 'b' : 'c'], [rakt(1, 2, w + 1, 4), (x, y) => y < 3 ? 'd' : 'c']]);
  const vedtrave = (B, x, y) => { for (const [dx, dy] of [[0, 8], [8, 8], [4, 4]]) sp(B, stock(9, 3), x + dx, y + dy, dy === 8); };
  // en stor förrådskruka snett ovanifrån: buken och mynningen som en mörk ellips
  const STORKRUKA_OVAN = former(15, 16, [[ell(7.5, 9.5, 6.3, 5.8), (x, y) => x + y < 13 ? 'u' : x + y < 18 ? 't' : 's'], [ell(7.5, 4.2, 4.6, 2.4), 'u'], [ell(7.5, 4.2, 3.2, 1.4), (x, y) => y < 4.2 ? 'K' : 'l']]);
  const knippen = (B, xs, y) => xs.forEach((x, i) => sp(B, STORT_KNIPPE_H, x, y + (i % 2), false));
  const ORT = [
    B => { // den lilla elden med krukan och en lång arbetsbänk under en torkställning där fem knippen hänger
      sp(B, ram(46, 20), 30, 0); knippen(B, [34, 42, 50, 58, 66], 4);
      stallBank(B, 30, 17, 46, 14, 5, 2);
      sp(B, MORTEL_OVAN, 33, 19); sp(B, KNIPPE_L, 45, 21); sp(B, skalOvan(11, 6, 'p', 'n'), 56, 19); sp(B, skalOvan(8, 5, 'g', 'f'), 67, 23);
      bildfil(B, 'lagereld_lite', 6, 13); sp(B, LITEN_KRUKA, 16, 19, false); anga(B, 19, 18, 1);
      sp(B, STORKRUKA_OVAN, 2, 30); vedtrave(B, 16, 35); sp(B, skalOvan(12, 6, 'l', 'K'), 64, 39);
    },
    B => { // den låga härden av stenar ovanifrån med krukan ovanpå, en torkställning till vänster och en bänk till höger
      sp(B, ram(24, 22), 1, 2); knippen(B, [3, 9, 15, 21].map(x => x - 1), 6);
      const hx = 30, hy = 16; // härden, lika stor som från början: stenar i ett U runt elden, öppningen fram
      glod(B, ell(hx + 9.5, hy + 9, 4.5, 2.6), hx + 4, hy + 6, 12, 6, 6);
      for (const [x, y, i] of [[1, 0, 1], [7, -1, 2], [13, 0, 3], [-1, 5, 4], [15, 5, 5]]) sp(B, rundOvan(5, 3, 2, SK, i), hx + x, hy + y);
      laga(B, hx + 8, hy + 10, 4); laga(B, hx + 11, hy + 10, 3); B.satt(hx + 9, hy + 10, B.P.i('senap', 3), true);
      sp(B, KRUKA, hx + 6, hy - 6, false); anga(B, hx + 9, hy - 7, 2);
      stallBank(B, 53, 15, 26, 12, 5, 4);
      sp(B, MORTEL_OVAN, 55, 17); sp(B, skalOvan(10, 5, 'p', 'n'), 67, 18);
      sp(B, STORKRUKA_OVAN, 4, 30); sp(B, skalOvan(12, 6, 'g', 'f'), 32, 36); sp(B, KNIPPE_L, 54, 38);
    },
    B => { // grytan i en låg trefot över elden mellan fyra stenar, och ett långt bord under ett torkställ
      sp(B, ram(36, 16), 42, 0); knippen(B, [46, 54, 62, 70], 4);
      stallBank(B, 42, 15, 36, 14, 5, 5);
      sp(B, MORTEL_OVAN, 45, 17); sp(B, KNIPPE_L, 57, 19); sp(B, skalOvan(10, 5, 'p', 'n'), 66, 22);
      const cx = 18, fot = 34; // elden och trefoten, lika stora som från början
      glod(B, ell(cx, fot - 1.5, 5, 2.6), cx - 5, fot - 4, 11, 6, 4);
      for (const [x, y, i] of [[-12, -4, 1], [6, -4, 2], [-8, 2, 3], [2, 2, 5]]) sp(B, rundOvan(5, 3, 2, SK, i), cx + x, fot + y);
      laga(B, cx - 2, fot - 1, 4); laga(B, cx + 2, fot - 1, 4); laga(B, cx, fot - 1, 5);
      sp(B, former(24, 20, [[linje([[2, 18], [11.5, 2]], 0.6), 'b'], [linje([[21, 18], [11.5, 2]], 0.6), 'c'], [linje([[12.5, 13], [11.5, 2]], 0.5), 'b'], [rakt(11, 1, 13, 3), 'w']]), cx - 12, fot - 19, false);
      for (let y = fot - 16; y < fot - 12; y++) B.satt(cx, y, B.P.i('ben', 1));
      sp(B, GRYTA, cx - 5, fot - 13, false);
      vedtrave(B, 26, 34); sp(B, STORKRUKA_OVAN, 64, 31); sp(B, skalOvan(12, 6, 'g', 'f'), 0, 39);
    },
  ];
  const ORTKOK = (text, f) => ({ text, w: 80, h: 48, rita: B => { gras(B); f(B); } });

  // ---------- 4. härden: tre nya former ----------
  // husets hörn uppe till vänster (timmerväggen och golvet), härden på golvet och röken som stiger mot rökhålet
  const rok = (B, x, y, s) => { for (let i = 0; i < 18; i++) { if (hash(i, s, 41) < 0.12 + i * 0.03) continue; const xx = x + Math.round(Math.sin(i / 3.2 + s) * 2); B.satt(xx, y - i, B.P.i('ben', i < 7 ? 2 : 1)); } };
  // aska och glöd i en form: grå aska, röda och gula punkter som lyser
  const glod = (B, inne, x0, y0, w, h, s) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { if (!inne(x + 0.5, y + 0.5)) continue; const r = hash(x, y, s); B.satt(x, y, r < 0.35 ? B.P.i('kol', 2) : r < 0.5 ? B.P.i('kol', 3) : r < 0.75 ? B.P.i('rost', 1) : r < 0.92 ? B.P.i('rost', 2) : B.P.i('senap', 3), r >= 0.5); } };
  const vedtra = (B, x0, y0, x1, y1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) { const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(y0 + (y1 - y0) * k / n); B.satt(x, y, B.P.i('jord', 1)); B.satt(x, y + 1, B.P.i('kol', 1)); } };
  const HARD = [
    B => { // en rund härd av kullerstenar i golvet, aska och glöd innanför och vedträn i kryss
      bildfil(B, 'timmervagg', 0, 0);
      const cx = 24, cy = 32, rx = 12, ry = 7, n = 13;
      const sten = (a, fram) => { const v = a / n * Math.PI * 2, y = Math.sin(v); if ((y > 0.1) !== fram) return; sp(B, rund(5, 4, SK, a), cx + Math.round(Math.cos(v) * rx) - 3, cy + Math.round(y * ry) - 3, fram); };
      for (let a = 0; a < n; a++) sten(a, false);
      glod(B, ell(cx, cy, rx - 3, ry - 2.5), cx - rx, cy - ry, rx * 2, ry * 2, 3);
      vedtra(B, cx - 6, cy - 2, cx + 5, cy + 2); vedtra(B, cx - 5, cy + 2, cx + 6, cy - 2);
      laga(B, cx, cy, 6); laga(B, cx - 3, cy + 1, 4); laga(B, cx + 3, cy + 1, 4);
      for (let a = 0; a < n; a++) sten(a, true);
      rok(B, cx, cy - 7, 1);
    },
    B => { // en stor flat sten står upp vid bakkanten och kastar värmen tillbaka in i rummet; flata hällar i golvet runt elden
      bildfil(B, 'timmervagg', 0, 0);
      const x0 = 10, y0 = 18;
      sp(B, former(32, 20, [[rakt(1, 1, 31, 19), (x, y) => { const i = fx(x) - 1, j = fx(y) - 1; const fog = j === 8 || ((i === 10 || i === 21) && j < 8) || ((i === 5 || i === 16 || i === 26) && j > 8); return fog ? 'Q' : hash(i, j, 12) < 0.25 ? 'T' : 'S'; }]], false), x0 - 2, y0 + 8); // golvhällarna, i jämnhöjd med golvet
      glod(B, ell(x0 + 13, y0 + 16, 8, 4), x0 + 4, y0 + 11, 18, 10, 5);
      vedtra(B, x0 + 8, y0 + 17, x0 + 18, y0 + 15); vedtra(B, x0 + 9, y0 + 14, x0 + 19, y0 + 17);
      laga(B, x0 + 13, y0 + 16, 6); laga(B, x0 + 10, y0 + 17, 4); laga(B, x0 + 16, y0 + 17, 4);
      sp(B, former(28, 13, [[poly([[2, 3], [9, 1], [18, 1], [26, 3], [26, 12], [1, 12]]), (x, y) => { if (y < 4.5) return x < 14 ? 'T' : 'S'; return x > 23 ? 'R' : (fx(x) * 3 + fx(y) * 5) % 17 === 0 ? 'R' : y > 10.5 ? 'R' : 'S'; }]]), x0 - 1, y0 - 2, false); // bakstenen: ovankanten och den förkortade framsidan
      for (let k = 0; k < 6; k++) for (let x = x0 + 4; x < x0 + 22; x++) if (hash(x, k, 8) < 0.3 - k * 0.04) B.satt(x, y0 + 8 - k, B.P.i('kol', 1)); // sotet på bakstenen
      sp(B, stock(9, 3), 38, 30); sp(B, stock(9, 3), 38, 35); sp(B, stock(9, 3), 36, 40);
      rok(B, x0 + 13, y0 + 4, 2);
    },
    B => { // en långhärd ovanifrån: en ränna i golvet kantad av kantställda hällar, glöd längs hela och två små eldar
      bildfil(B, 'timmervagg', 0, 0);
      const x0 = 5, y0 = 22, w = 38, h = 18;
      sp(B, former(w, h, [[rakt(1, 1, w - 1, h - 1), (x, y) => {
        const i = fx(x) - 1, j = fx(y) - 1, W = w - 2, H = h - 2;
        if (j === 0 || (j === H - 3 && i > 1 && i < W - 2)) return 'T'; // ovankanterna på hällarna bak och fram
        if (i < 2) return i === 0 ? 'T' : 'S'; if (i >= W - 2) return i === W - 1 ? 'R' : 'S'; // gavlarna
        if (j < 4) return (i % 9 === 4) ? 'Q' : j === 1 ? 'R' : 'Q'; // bakre hällarnas insida, i skugga
        if (j >= H - 3) return j === H - 1 ? 'Q' : (i % 8 === 3 ? 'Q' : 'R'); // främre hällarnas framsida
        return 'K';
      }]]), x0, y0);
      glod(B, (x, y) => true, x0 + 3, y0 + 5, w - 6, h - 9, 7);
      vedtra(B, x0 + 7, y0 + 7, x0 + 15, y0 + 9); vedtra(B, x0 + 21, y0 + 9, x0 + 30, y0 + 7);
      laga(B, x0 + 11, y0 + 9, 5); laga(B, x0 + 13, y0 + 10, 3); laga(B, x0 + 26, y0 + 9, 5); laga(B, x0 + 24, y0 + 10, 3);
      rok(B, x0 + 12, y0 + 3, 3); rok(B, x0 + 26, y0 + 3, 4);
    },
  ];
  const HARDEN = (text, f) => ({ text, w: 48, h: 48, rita: B => f(B) });

  // ---------- 5. klyvplatsen: version 1 utan klubban ----------
  const KLYV = B => { // stocken snett ovanifrån: barken ovanpå, sprickan längs mitten med två kilar, snittet i högra änden och kryssen under
    gras(B);
    const x0 = 3, y0 = 9, w = 40, d = 12;
    skuggaUnder(B, x0, y0 + d, w, 7);
    const kryss = x => [linje([[x, d], [x - 3.5, d + 7]], 0.9), linje([[x, d], [x + 3.5, d + 7]], 0.9), linje([[x, 4], [x - 3.5, 0.5]], 0.9), linje([[x, 4], [x + 3.5, 0.5]], 0.9)];
    sp(B, former(w + 4, d + 10, [[och(...kryss(7), ...kryss(w - 6)), x => fx(x) % 2 ? 'a' : 'b']]), x0, y0 - 3, false);
    sp(B, stockOvan(w, d), x0, y0, false);
    for (let x = x0 + 5; x < x0 + w - 3; x++) { const y = y0 + 5 + (hash(fx(x / 3), 0, 14) < 0.3 ? 1 : 0); B.satt(x, y, B.P.i('jord', 0)); if (x < x0 + 30) B.satt(x, y + 1, B.P.i('kol', 1)); } // sprickan
    for (const x of [x0 + 12, x0 + 24]) sp(B, former(6, 8, [[rakt(1, 1, 5, 4), (xx, y) => y < 2 ? 'y' : xx < 3 ? 'x' : 'w'], [rakt(1.5, 4, 4.5, 7), 'w']]), x - 2, y0 + 1, false); // kilarna, drivna ned i sprickan
  };

  // ---------- 6. snaran, ritad utan förlaga ----------
  // En snara är en ögla av sena eller tvinnad tråd som hänger över en djurstig i harens huvudhöjd: haren springer in i öglan,
  // den dras åt och håller fast. Stigen går här rakt mot betraktaren, så att öglan som hänger tvärs över den syns hel.
  // Haren är den godkända haren ur djur.js (version 2).
  const HARE = { o: 'jord0', d: 'jord1', m: 'jord2', l: 'jord3', c: 'ben2', b: 'ben3', k: 'kol0', r: 'rost2' };
  const hare = (B, rikt, x, y) => { const K = window.DJURBILD && window.DJURBILD.KANIN[1]; if (K) lagg(B, K[rikt], HARE, x, y); };
  const SW = 64, SH = 48;
  const harstig = (B, s) => {
    gras(B);
    const mitt = y => 32 + Math.sin(y / 9 + s) * 3 - (y - 24) * 0.12;
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
      const d = Math.abs(x + 0.5 - mitt(y)), r = 1.6 + y / SH * 2.2; // stigen blir bredare närmare betraktaren
      if (d > r) continue;
      if (d > r - 1 && hash(x, y, 70 + s) < 0.5) continue;
      B.satt(x, y, hash(x, y, 71 + s) < 0.15 ? B.P.i('oliv', 1) : B.P.i('jord', d > r - 1 ? 1 : 2));
    }
    if (window.MARK.tuvor) window.MARK.tuvor(B, 0, (x, y) => Math.abs(x - mitt(y)) > 9);
    return mitt;
  };
  // öglan: en ring av ljus sena, en punkt tjock, med en kort tråd upp till det den hänger i
  const ogla = (cx, cy, rx = 3.2, ry = 3.8) => (x, y) => { const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; return d <= 1 && d >= 0.42; };
  const SNAR = [
    B => { // två klykor på var sin sida om stigen och en tvärslå mellan dem; öglan hänger från slåns mitt
      const mitt = harstig(B, 0), cx = Math.round(mitt(30));
      hare(B, 'fram', Math.round(mitt(6)) - 4, 2);
      const fot = 33, top = 17;
      sp(B, former(26, 20, [
        [linje([[3, fot - top + 1], [3, 3]], 0.7), 'b'], [linje([[3, 4], [1.5, 1]], 0.5), 'b'], [linje([[3, 4], [5, 1.2]], 0.5), 'c'], // vänstra klykan
        [linje([[22, fot - top + 1], [22, 3]], 0.7), 'a'], [linje([[22, 4], [20.5, 1]], 0.5), 'b'], [linje([[22, 4], [24, 1.2]], 0.5), 'a'], // högra klykan
        [linje([[1, 3], [24, 3]], 0.6), (x, y) => y < 3 ? 'd' : 'c'], // tvärslån
        [linje([[12.5, 3], [12.5, 6]], 0.4), 'x'], // tråden
        [ogla(12.5, 10.2), 'x'], [punkt2(12, 6), 'y'],
      ]), cx - 12, top - 1, false);
      for (const x of [cx - 10, cx + 9]) { B.morka(x, fot + 1); B.morka(x + 1, fot + 1); }
    },
    B => { // ett lågt gärde av ris tvärs över stigen med en öppning där haren går; öglan hänger i öppningen
      const mitt = harstig(B, 2), cx = Math.round(mitt(30));
      hare(B, 'sida', 6, 34);
      const fot = 34, lista = [];
      for (let x = 3; x < SW - 2; x += 4) {
        if (Math.abs(x - cx) < 6) continue; // öppningen
        const hh = 8 + fx(hash(x, 1, 80) * 6), lut = (hash(x, 2, 80) - 0.5) * 3;
        lista.push([linje([[x + 0.5, fot + 0.5], [x + 0.5 + lut, fot - hh]], 0.45), hash(x, 3, 80) < 0.5 ? 'c' : 'b']);
        if (hash(x, 4, 80) < 0.3) lista.push([linje([[x + 0.5 + lut * 0.5, fot - hh * 0.6], [x + 0.5 + lut + 2, fot - hh * 0.8]], 0.4), 'c']);
      }
      lista.push([linje([[cx - 6.5, fot + 0.5], [cx - 6.5, fot - 16]], 0.7), 'b'], [linje([[cx + 6.5, fot + 0.5], [cx + 6.5, fot - 16]], 0.7), 'a']); // två högre käppar vid öppningen
      lista.push([linje([[cx - 8, fot - 15], [cx + 8, fot - 15]], 0.55), 'c']); // pinnen över öppningen
      lista.push([linje([[cx + 0.5, fot - 15], [cx + 0.5, fot - 12]], 0.4), 'x'], [ogla(cx + 0.5, fot - 7.8), 'x']);
      sp(B, former(SW, SH, lista), 0, 0, false);
      for (let x = 2; x < SW - 2; x++) if (Math.abs(x - cx) > 5 || Math.abs(x - cx) === 6) B.morka(x, fot + 2);
    },
    B => { // en rak käpp nedstucken vid stigkanten och lutad in över stigen; öglan hänger från toppen, och ris på båda sidor leder haren in i den
      const mitt = harstig(B, 4), cx = Math.round(mitt(30));
      hare(B, 'fram', Math.round(mitt(8)) - 4, 3);
      const fot = 35;
      const ris = (x0, s) => { const l = []; for (let k = 0; k < 4; k++) { const a = -0.7 + hash(k, s, 1) * 1.4, n = 6 + hash(k, s, 2) * 4; l.push([linje([[x0 + k * 2.5, fot + 0.5], [x0 + k * 2.5 + Math.sin(a) * n, fot - Math.cos(a) * n]], 0.45), k % 2 ? 'c' : 'b']); } return l; };
      sp(B, former(SW, SH, [
        ...ris(cx - 20, 1), ...ris(cx + 7, 2),
        [linje([[cx - 9.5, fot + 0.5], [cx + 2, fot - 18]], 0.7), (x, y) => y > fot - 2 ? 'a' : 'c'], // käppen
        [linje([[cx + 1.5, fot - 17.5], [cx + 1.5, fot - 13]], 0.4), 'x'], [ogla(cx + 1.5, fot - 8.8), 'x'],
        [ell(cx - 9.5, fot + 0.6, 2.4, 1.1), 'b'], // jorden som packats runt foten
      ]), 0, 0, false);
      B.morka(cx - 11, fot + 2); B.morka(cx - 9, fot + 2); B.morka(cx - 7, fot + 2);
    },
  ];
  function punkt2(px, py) { return (x, y) => fx(x) === px && fx(y) === py; }
  const SNARA = (text, f) => ({ text, w: SW, h: SH, rita: B => f(B) });

  byt(KORT('f7_fangstbank', 'Fångstbänken', 'Steg 7.4.1: arbetsbänken där byn gör fällor och mjärdar, tre rutor bred och två djup. Var och en står bredvid slaktbänken (till vänster) på marken, så att du ser dem tillsammans. Nu ritad om snett ovanifrån, som slaktbänken och borden: ytan ovanifrån, en mörk framkant och korta ben. Din kommentar förra gången: "Sätt den bredvid slaktbänken så jag kan se den i ett sammanhang"', [
    VID_SLAKT('En låg bänk på fyra grenar, med en halvflätad mjärde och en bunt vidjor.', BANK[0]),
    VID_SLAKT('En bänk med en ställning bak där färdiga snaror hänger.', BANK[1]),
    VID_SLAKT('En kluven stock på två kryss, den flata sidan upp, med en bur som byggs och en kniv.', BANK[2]),
  ]));
  byt(KORT('f7_stenhuggarplats', 'Stenhuggarplatsen', 'Steg 7.5.1: platsen där man hugger sten, fyra gånger tre rutor. Den står på en bit av kartan, åtta gånger sex rutor: gräs, en stig förbi, granar runt om och en bybo till höger, så att du ser hur stor den är. Nu ritad om snett ovanifrån, som slaktbänken och borden: stenarna och bocken ovanifrån med en mörkare sida fram. Din kommentar förra gången: "Sätt den i ett sammanhang på kartan"', [
    PA_KARTAN('Ett stort runt huggblock med ett block på, en stubbe att sitta på och råa stenar.', HUGG[0]),
    PA_KARTAN('En lång sten på en kraftig träbock; råa stenar till vänster och färdiga block staplade till höger.', HUGG[1]),
    PA_KARTAN('En stor flat häll ovanifrån med ett block, en mejsel och en slagsten; en stock och stenar bakom.', HUGG[2]),
  ]));
  byt(KORT('f7_ortkok', 'Örtköket', 'Steg 7.6.1: stationen där örter kokas. Stationen är nu fem gånger tre rutor, med längre bänkar, större torkställningar och större krukor och skålar, men elden, krukan på elden och grytan är lika små som i de första versionerna. Nu ritad om snett ovanifrån, som slaktbänken och borden: ytan ovanifrån, en mörk framkant och korta ben. Krukorna och skålarna syns ovanifrån, och torkställningarna står vid bakkanten. Din kommentar förra gången: "Elden ska inte vara större. Stationen ska vara större"', [
    ORTKOK('Den lilla elden med en kruka i, och en lång arbetsbänk med mortel, örter och skålar under en torkställning där fem knippen hänger.', ORT[0]),
    ORTKOK('Den låga härden: stenar i ett U runt elden med krukan på de bakre, en torkställning till vänster och en bänk till höger.', ORT[1]),
    ORTKOK('Grytan i en låg trefot över elden mellan fyra stenar, och ett långt bord med mortel och örter under ett torkställ.', ORT[2]),
  ]));
  byt(KORT('f7_harden', 'Härden', 'Steg 7.5.3: eldstaden inne i huset, med rökhålet i taket ovanför (röken visar var det är). Bilden visar husets hörn uppe till vänster. Tre nya former, inte upphöjda med block som förra gången. Nu ritade snett ovanifrån: hällarna ligger i jämnhöjd med golvet, och bara den stående bakstenen i version 2 reser sig. Du sa nej till alla tre förra gången, utan kommentar.', [
    HARDEN('En rund härd av kullerstenar i golvet, med aska, glöd och vedträn i kryss innanför.', HARD[0]),
    HARDEN('En stor flat sten som står upp bakom elden och kastar värmen tillbaka in i rummet, flata hällar i golvet runt elden och ved bredvid.', HARD[1]),
    HARDEN('En långhärd: en smal ränna i golvet kantad av kantställda hällar, med glöd längs hela och två små eldar.', HARD[2]),
  ]));
  byt({ id: 'f7_klyvplats', namn: 'Klyvplatsen', typ: 'janej', vad: 'Steg 7.5.1: platsen där en stock klyvs till plankor, tre gånger två rutor. Du valde version 1 utan klubban och sa ja. Nu ritad om snett ovanifrån, som slaktbänken och borden: stocken ovanifrån med sprickan och kilarna längs mitten, och kryssen sticker fram bak och under.', versioner: [
    { text: 'En lång stock på två kryss, sedd snett ovanifrån, med en spricka längs ovansidan och två kilar.', w: 48, h: 32, rita: KLYV },
  ] });
  byt(KORT('f7_snara', 'Snaran', 'Steg 7.5.10: snaran på en harstig: en ögla av sena som hänger tvärs över stigen i harens huvudhöjd. Tre helt nya ritningar utan förlaga. Stigen går rakt mot dig, så att öglan syns hel, och en hare visar storleken. Din kommentar förra gången: "Ingen ser bra ut gör om alla utan förlaga"', [
    SNARA('Två klykor på var sin sida om stigen med en tvärslå mellan dem, och öglan som hänger från slåns mitt. En hare kommer längre upp på stigen.', SNAR[0]),
    SNARA('Ett lågt gärde av nedstuckna kvistar tvärs över stigen, med en öppning där haren går; öglan hänger i öppningen från en pinne mellan två högre käppar.', SNAR[1]),
    SNARA('En rak käpp nedstucken vid stigkanten och lutad in över stigen, med öglan hängande från toppen och ris på båda sidor som leder haren in i den.', SNAR[2]),
  ]));
})();
