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

  // ---------- Björns svar på fyra stationer (efter bildstil v208) ----------
  // ett ställe att sätta en punkt med en bokstav ur L
  const pt = (B, x, y, ch, lys) => { const v = L[ch]; B.satt(x, y, B.P.i(v.slice(0, -1), +v.slice(-1)), lys); };
  // en bänk på längden tvärs, alltså nord–syd: skivan smal och djup med plankorna på längden, framkanten och två ben bara fram
  const bankTvars = (w, d, ben = 5, s = 0, plank = 4) => former(w + 2, d + ben + 5, [
    [rakt(1, 1, w + 1, d + 1), (x, y) => {
      const i = fx(x) - 1, j = fx(y) - 1, p = fx(i / plank);
      if (i % plank === plank - 1 || (j + p * 11 + s * 5) % 19 === 0) return 'b'; // fogarna
      if (i === 0) return 'd';
      const r = hash(i, fx(y / 3), s); return r < 0.1 ? 'b' : r < (j < d * 0.3 ? 0.5 : 0.28) ? 'd' : 'c';
    }],
    [rakt(1, d + 1, w + 1, d + 4), (x, y) => fx(y) === d + 1 ? 'b' : 'a'],
    [och(rakt(2, d + 4, 4, d + 4 + ben), rakt(w - 2, d + 4, w, d + 4 + ben)), x => fx(x) === 2 || fx(x) === w - 2 ? 'b' : 'a'],
  ]);
  const stallTvars = (B, x, y, w, d, ben = 5, s = 0) => { skuggaUnder(B, x, y + 3, w, d + ben + 3); sp(B, bankTvars(w, d, ben, s), x, y, false); };
  // en kort stock som ligger tvärs (nord–syd) ovanifrån: barken på sidorna och snittet fram
  const tvarStock = (w, h) => former(w + 2, h + 2, [
    [rakt(1, 1, w + 1, h), x => { const i = fx(x) - 1; return i === 0 ? 'd' : i >= w - 1 ? 'a' : i < w / 2 ? 'c' : 'b'; }],
    [ell(1 + w / 2, h - 0.6, w / 2, 1.7), (x, y) => Math.hypot((x - 1 - w / 2) / (w / 2), (y - h + 0.6) / 1.7) > 0.6 ? 'b' : 'd'],
  ]);
  // en korg ovanifrån: den flätade kanten, sidan under och det som ligger i den
  const korgOvan = (w, h, inne) => { const cx = 1 + w / 2, cy = 1 + h / 2, ovan = (x, y) => ((x - cx) / (w / 2)) ** 2 + ((y - cy) / (h / 2)) ** 2 <= 1; return former(w + 2, h + 5, [
    [och(ovan, ell(cx, cy + 3, w / 2, h / 2), rakt(1, cy, w + 1, cy + 3)), (x, y) => ovan(x, y) ? ((fx(x) + fx(y)) % 2 ? 'g' : 'h') : (fx(x) + fx(y)) % 2 ? (x > cx + w / 4 ? 'e' : 'f') : 'g'],
    [ell(cx, cy, w / 2 - 1.3, h / 2 - 1.1), inne],
  ]); };
  // ett kar av stavar ovanifrån: kanten, stavarna och ett band på sidan, och vätskan i två toner
  const karOvan = (w, h, inne, ton2) => { const cx = 1 + w / 2, cy = 1 + h / 2, ovan = (x, y) => ((x - cx) / (w / 2)) ** 2 + ((y - cy) / (h / 2)) ** 2 <= 1; return former(w + 2, h + 6, [
    [och(ovan, ell(cx, cy + 4, w / 2, h / 2), rakt(1, cy, w + 1, cy + 4)), (x, y) => { if (ovan(x, y)) return 'd'; if (fx(y) === fx(cy) + 2) return 'K'; return fx(x) % 3 === 0 ? 'a' : x > cx + w * 0.25 ? 'b' : 'c'; }],
    [ell(cx, cy, w / 2 - 1.2, h / 2 - 1), (x, y) => hash(fx(x), fx(y), 7) < 0.25 ? ton2 : inne],
  ]); };
  // ett knippe vidjor på marken, bundet på mitten
  const vidjeknippe = (len, n) => former(len + 2, n + 2, [
    ...Array.from({ length: n }, (_, k) => [rakt(1 + (k % 2) * 2, 1 + k, len + 1 - ((k + 1) % 2) * 2, 2 + k), (x) => (fx(x) + k * 5) % 9 === 0 ? 'f' : k % 2 ? 'g' : 'h']),
    [rakt(1 + fx(len * 0.45), 1, 3 + fx(len * 0.45), n + 1), 'b'],
  ]);
  // en kil ovanifrån: nacken ljus där den slagits, spetsen nere i sprickan
  const KIL = former(6, 8, [[rakt(1, 1, 5, 4), (x, y) => y < 2 ? 'y' : x < 3 ? 'x' : 'w'], [rakt(1.5, 4, 4.5, 7), 'w']]);
  const KIL_LIGG = former(9, 5, [[poly([[1, 1], [6, 1.5], [8.5, 2.5], [6, 3.5], [1, 4]]), (x, y) => y < 2.5 ? 'y' : 'w']]);
  const spanen = (B, x0, y0, w, h, s) => { for (let i = 0; i < 14; i++) { const x = x0 + fx(hash(i, s, 1) * w), y = y0 + fx(hash(i, s, 2) * h); pt(B, x, y, hash(i, s, 3) < 0.5 ? 'y' : 'x'); if (hash(i, s, 4) < 0.5) pt(B, x + 1, y, 'w'); } };

  // ---------- 1. fångstbänken som flera delar ----------
  // varje del står för sig med gräs emellan, så att delarna kan ställas olika i varje by; till höger om slaktbänken som förut
  const snaraHang = (w) => former(w, 11, [[linje([[w / 2, 0], [w / 2, 4]], 0.5), 'w'], [(x, y) => { const d = Math.hypot(x - w / 2, y - 7); return d <= 3.4 && d >= 2.2; }, 'x']]);
  const ringla = former(10, 7, [[(x, y) => { const d = Math.hypot((x - 5) / 1.4, y - 3.5); return d <= 3.3 && d >= 1.6; }, (x, y) => y < 3 ? 'y' : 'x']]);
  const LADFALLA = former(16, 12, [ // en halvbyggd bur ovanifrån: två ramar av käppar, bara några av spjälorna på plats, och lösa spjälor bredvid
    [och(rakt(1, 1, 15, 2), rakt(1, 1, 2, 9), rakt(14, 1, 15, 9)), (x, y) => fx(y) === 1 ? 'd' : 'c'],
    [och(...[4, 7].map(x => rakt(x, 1, x + 1, 9))), 'b'],
    [rakt(1, 8, 15, 10), (x, y) => fx(y) === 8 ? 'c' : 'a'],
    [linje([[9, 4.5], [14.5, 3.5]], 0.45), 'y'], [linje([[9, 6.5], [14.5, 6]], 0.45), 'x'],
  ]);
  const FANG = [
    B => { // en kort bänk med en kniv och en ringlad sena, en stubbe att sitta på, en korg med vidjor och en halvflätad mjärde på marken
      stallBank(B, 1, 10, 28, 10, 4, 1);
      sp(B, KNIV, 4, 13); sp(B, ringla, 17, 12);
      sp(B, stubbeOvan(9, 6, 3), 33, 14);
      sp(B, korgOvan(14, 8, (x, y) => ['h', 'g', 'K', 'g'][(fx(x) + fx(y) * 3) % 4]), 44, 3);
      sp(B, halvMjarde, 32, 26);
    },
    B => { // en ställning där färdiga snaror hänger, en kort bänk, en stubbe och ett knippe vidjor på marken
      sp(B, former(26, 15, [[rakt(3, 1, 5, 15), 'b'], [rakt(21, 1, 23, 15), 'a'], [rakt(1, 1, 25, 3), (x, y) => y < 2 ? 'd' : 'c']]), 30, 0, false);
      [7, 13, 19].forEach(x => sp(B, snaraHang(9), 30 + x - 4, 2, false));
      for (const x of [33, 34, 51, 52]) B.morka(x, 15);
      stallBank(B, 1, 12, 26, 10, 4, 2);
      sp(B, KNIV, 13, 15); sp(B, ringla, 3, 14);
      sp(B, stubbeOvan(8, 5, 3), 4, 0);
      sp(B, vidjeknippe(20, 4), 32, 28);
    },
    B => { // en kluven stock på två korta stockar, ett kar där vidjorna blöts och en halvbyggd lådfälla
      const x0 = 1, y0 = 12, w = 32, d = 11;
      for (const x of [x0 + 4, x0 + w - 9]) { skuggaUnder(B, x, y0 + d + 2, 6, 3); sp(B, tvarStock(5, d + 7), x, y0 - 3, false); }
      skuggaUnder(B, x0, y0 + d - 1, w, 4);
      sp(B, former(w + 2, d + 2, [
        [rakt(1, 1, w, d + 1), (x, y) => { const j = fx(y) - 1; if (j < d - 4) return j === 0 ? 'x' : hash(fx(x / 4), j, 6) < 0.16 ? 'c' : hash(fx(x), j, 7) < 0.3 ? 'x' : 'd'; return j === d - 4 ? 'c' : j < d - 1 ? ((fx(x) * 3 + j) % 10 === 0 ? 'a' : 'b') : 'a'; }],
        [ell(w - 0.5, 1 + (d - 4) / 2, 1.8, (d - 4) / 2), 'w'],
      ]), x0, y0, false);
      sp(B, KNIV, x0 + 4, y0 + 2, false); sp(B, ringla, x0 + 18, y0 + 1, false);
      sp(B, karOvan(12, 7, 'R', 'Q'), 41, 2);
      for (const [x, y, l] of [[44, 2, 7], [47, 1, 8], [50, 3, 6]]) for (let k = 0; k < l; k++) pt(B, x + fx(k / 3), y - k + 4, k % 3 ? 'g' : 'h'); // vidjorna som sticker upp ur karet
      sp(B, LADFALLA, 38, 23);
    },
  ];

  // ---------- 2. garvningsställningen snett ovanifrån ----------
  // en hud ovanifrån: kroppen, fyra benflikar, nacken och svansen
  const hudForm = (x0, y0, w, h) => { const cx = x0 + w / 2, cy = y0 + h / 2, ax = w / 2 - 3, ay = h / 2 - 2; return och(ell(cx, cy, ax, ay), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => linje([[cx + sx * ax * 0.6, cy + sy * ay * 0.6], [cx + sx * (w / 2 - 1.2), cy + sy * (h / 2 - 1.2)]], 1.5, 1)), ell(cx, y0 + 2.2, 2.2, 2.2), linje([[cx, cy + ay - 1], [cx, y0 + h - 0.6]], 0.8)); };
  const pals = s => (x, y) => { const r = hash(fx(x), fx(y), s); return r < 0.2 ? 'b' : r < 0.55 ? 'c' : r < 0.85 ? 'd' : 'c'; };
  const skrapad = s => (x, y) => { const r = hash(fx(x), fx(y / 2), s); return fx(y) % 3 === 0 && r < 0.5 ? 'w' : r < 0.12 ? 'y' : 'x'; };
  const repDrag = (B, ax, ay, bx, by) => { const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)); for (let i = 0; i <= n; i++) pt(B, Math.round(ax + (bx - ax) * i / n), Math.round(ay + (by - ay) * i / n), i % 2 ? 'x' : 'w'); };
  const pinne = (B, x, y) => { pt(B, x, y, 'c'); pt(B, x, y + 1, 'a'); pt(B, x - 1, y, 'o'); pt(B, x + 1, y, 'o'); B.morka(x + 1, y + 1); };
  const SKRAPA = former(9, 5, [[poly([[1, 2], [5, 1], [8, 2], [8, 3.5], [1, 4]]), (x, y) => y < 2.5 ? 'y' : x > 5 ? 'w' : 'x']]);
  const GARV_N = [
    B => { // en låg ram av fyra stänger på korta ben, med huden snörad i ramen; ett garvkar med barklag bredvid
      const x0 = 1, y0 = 4, w = 24, d = 17;
      skuggaUnder(B, x0, y0 + 3, w, d + 3);
      sp(B, former(w + 2, d + 9, [
        [och(rakt(2, d + 2, 4, d + 8), rakt(w - 2, d + 2, w, d + 8)), x => fx(x) % 2 ? 'b' : 'a'], // de främre benen
        [och(rakt(1, 1, 4, d + 3), rakt(w - 2, 1, w + 1, d + 3)), x => fx(x) === 1 || fx(x) === w - 2 ? 'd' : 'c'], // sidostängerna
        [rakt(1, 1, w + 1, 3), (x, y) => fx(y) === 1 ? 'd' : 'c'], // den bakre stången
        [rakt(1, d + 1, w + 1, d + 4), (x, y) => fx(y) === d + 1 ? 'd' : fx(y) === d + 2 ? 'c' : 'a'], // den främre, med en mörk framkant
        ...[[2, 2], [w - 1, 2], [2, d + 2], [w - 1, d + 2]].map(([x, y]) => [rakt(x - 1, y - 1, x + 1, y + 1), (xx, yy) => (fx(xx) + fx(yy)) % 2 ? 'x' : 'w']), // repet runt hörnen
      ]), x0, y0, false);
      const hx = x0 + 6, hy = y0 + 4, hw = w - 10, hh = d - 5;
      for (const t of [0.2, 0.5, 0.8]) { const yy = Math.round(hy + hh * t), xx = Math.round(hx + hw * t); repDrag(B, x0 + 4, yy, hx, yy); repDrag(B, hx + hw, yy, x0 + w - 1, yy); repDrag(B, xx, y0 + 3, xx, hy); repDrag(B, xx, hy + hh, xx, y0 + d + 1); }
      sp(B, former(hw + 2, hh + 2, [[hudForm(1, 1, hw, hh), pals(61)]]), hx - 1, hy - 1, false);
      sp(B, karOvan(7, 4, 'r', 'a'), 28, 24);
      for (const [x, y] of [[30, 22], [32, 21]]) { pt(B, x, y, 's'); pt(B, x + 1, y, 'r'); } // barkbitar på kanten
    },
    B => { // huden fäst med pinnar på marken, köttsidan upp och halvskrapad; skrapan av ben och en skål med fett bredvid
      for (let y = 3; y < 33; y++) for (let x = 0; x < 36; x++) { const d = ((x - 17) / 17) ** 2 + ((y - 16) / 13) ** 2; if (d < 1 && hash(x, y, 90) < 1.1 - d) B.satt(x, y, B.P.i('jord', hash(x, y, 91) < 0.15 ? 1 : 2)); } // den trampade marken
      const hx = 4, hy = 4, hw = 26, hh = 22;
      sp(B, former(hw + 2, hh + 2, [[hudForm(1, 1, hw, hh), (x, y) => x < hw * 0.55 ? skrapad(62)(x, y) : hash(fx(x), fx(y), 65) < 0.3 ? 'r' : 's']]), hx - 1, hy - 1);
      for (const [x, y] of [[4, 4], [hx + hw / 2, 2], [hx + hw, 4], [6, 15], [hx + hw - 2, 15], [4, hy + hh], [hx + hw / 2 + 2, hy + hh], [hx + hw, hy + hh]]) pinne(B, Math.round(x), Math.round(y));
      sp(B, SKRAPA, 2, 28);
      sp(B, skalOvan(7, 4, 'y', 'x'), 28, 26);
    },
    B => { // en ram som lutar bakåt mot två stöd, sedd snett ovanifrån: huden skrapas där den hänger; stödens fötter syns bakom
      skuggaUnder(B, 4, 26, 26, 5);
      sp(B, former(34, 12, [[och(linje([[5, 1], [2, 10]], 0.6), linje([[29, 1], [32, 10]], 0.6)), 'a']]), 0, 3, false); // stöden bakåt
      sp(B, former(34, 32, [
        [och(linje([[7, 3], [5, 27]], 0.9), linje([[27, 3], [29, 27]], 0.9)), x => fx(x) < 17 ? 'c' : 'b'], // sidostängerna, toppen längre bak
        [linje([[4, 4], [30, 4]], 0.9), (x, y) => y < 4 ? 'd' : 'c'],
        [rakt(2, 24, 32, 27), (x, y) => fx(y) === 24 ? 'd' : fx(y) === 25 ? 'c' : 'a'], // den nedre stången med framkanten
        [och(rakt(4, 27, 6, 30), rakt(28, 27, 30, 30)), 'a'], // fötterna
        ...[[6, 4], [28, 4], [5, 25], [29, 25]].map(([x, y]) => [rakt(x - 1, y - 1, x + 1, y + 1), (xx, yy) => (fx(xx) + fx(yy)) % 2 ? 'x' : 'w']),
      ]), 0, 0, false);
      const hx = 10, hy = 7, hw = 15, hh = 14;
      for (const t of [0.25, 0.5, 0.75]) { const yy = Math.round(hy + hh * t), xx = Math.round(hx + hw * t); repDrag(B, 7, yy, hx, yy); repDrag(B, hx + hw, yy, 27, yy); repDrag(B, xx, 5, xx, hy); repDrag(B, xx, hy + hh, xx, 23); }
      sp(B, former(hw + 2, hh + 2, [[hudForm(1, 1, hw, hh), (x, y) => y < hh * 0.45 ? pals(63)(x, y) : skrapad(64)(x, y)]]), hx - 1, hy - 1, false);
      sp(B, SKRAPA, 31, 28);
    },
  ];
  const VID_SLAKT2 = (text, f) => ({ text, w: 118, h: 44, rita: B => { gras(B); bildfil(B, 'slaktbank', 0, 16); f(flytt(B, 52, 4)); } });
  const GARVN = (text, f) => ({ text, w: 40, h: 40, rita: B => { gras(B); f(flytt(B, 2, 4)); } });

  // ---------- 3. klyvplatsen: tre nya ----------
  const spricka = (B, x0, x1, y, s) => { for (let x = x0; x < x1; x++) { const yy = y + (hash(fx(x / 3), 0, s) < 0.3 ? 1 : 0); pt(B, x, yy, 'a'); pt(B, x, yy + 1, 'K'); } };
  const halva = (w, d, s) => former(w + 2, d + 4, [ // en kluven halva ovanifrån: den flata klyvytan upp, barken i kanterna och sidan fram
    [rakt(1, 1, w, d + 3), (x, y) => { const j = fx(y) - 1; if (j === 0) return 'b'; if (j >= d) return j === d ? 'b' : 'a'; return (j + fx(x / 9) + s) % 4 === 0 ? 'w' : hash(fx(x / 3), j, s) < 0.2 ? 'x' : 'y'; }],
    [ell(w - 0.4, 1 + d / 2, 1.6, d / 2 + 0.5), (x, y) => Math.abs(y - 1 - d / 2) < 1 ? 'x' : 'w'],
  ]);
  const planka = (w, d) => former(w + 2, d + 4, [[rakt(1, 1, w + 1, d + 3), (x, y) => { const j = fx(y) - 1; if (j >= d) return j === d ? 'c' : 'a'; return j === 0 ? 'y' : (fx(x) * 5 + j) % 13 === 0 ? 'w' : 'x'; }]]);
  const KLY = [
    B => { // en stock på två korta stockar, med en spricka längs ovansidan, tre kilar och spån på marken
      const x0 = 3, y0 = 9, w = 38, d = 11;
      for (const x of [x0 + 5, x0 + w - 11]) { skuggaUnder(B, x, y0 + d + 2, 6, 3); sp(B, tvarStock(5, d + 8), x, y0 - 3, false); }
      skuggaUnder(B, x0, y0 + d, w, 4);
      sp(B, stockOvan(w, d), x0, y0, false);
      spricka(B, x0 + 4, x0 + w - 2, y0 + 5, 14);
      for (const x of [x0 + 9, x0 + 19, x0 + 29]) sp(B, KIL, x - 2, y0 + 1, false);
      spanen(B, 6, 26, 36, 5, 1);
    },
    B => { // stocken kluven i två halvor som ligger bredvid varandra med klyvytan upp, och en färdig planka framför
      sp(B, halva(36, 6, 1), 4, 2); sp(B, halva(36, 6, 3), 7, 12);
      sp(B, planka(30, 2), 3, 23);
      sp(B, KIL_LIGG, 37, 23); sp(B, KIL_LIGG, 2, 24);
      spanen(B, 30, 22, 14, 7, 2);
    },
    B => { // stocken ligger på marken mellan par av störar som håller den; kilarna i rad längs sprickan, som har öppnat sig
      const x0 = 3, y0 = 10, w = 38, d = 11;
      const stor = (x, y) => sp(B, former(4, 9, [[rakt(1, 1, 3, 8), x => fx(x) === 1 ? 'c' : 'a'], [rakt(1, 1, 3, 2), 'd']]), x, y, false);
      for (const x of [x0 + 7, x0 + w - 11]) { stor(x, y0 - 6); stor(x + 3, y0 - 5); }
      skuggaUnder(B, x0, y0 + d - 2, w, 4);
      sp(B, stockOvan(w, d), x0, y0, false);
      for (let x = x0 + 2; x < x0 + w - 1; x++) { const o = x < x0 + 24 ? 2 : 1; for (let k = 0; k < o; k++) pt(B, x, y0 + 5 + k, k ? 'K' : 'a'); pt(B, x, y0 + 5 + o, 'y'); } // sprickan, bredast vid kilarna
      for (const x of [x0 + 6, x0 + 14, x0 + 22]) sp(B, KIL, x - 2, y0 + 1, false);
      for (const x of [x0 + 7, x0 + w - 11]) { stor(x, y0 + d - 3); stor(x + 3, y0 + d - 2); }
      spanen(B, 4, 25, 40, 5, 3);
    },
  ];
  const KLYVN = (text, f) => ({ text, w: 48, h: 32, rita: B => { gras(B); f(B); } });

  // ---------- 4. örtköket i fyra delar, vridna ----------
  // rikt: 0 som i version 2 (öppningen och framsidan mot dig), 1 ett kvarts varv medsols, 2 ett halvt varv, 3 ett kvarts varv motsols
  const torkDel = (B, x, y, rikt) => { // (x, y): det övre vänstra hörnet av en ruta 36 bred
    if (rikt % 2 === 0) {
      const bak = rikt === 2;
      if (bak) knippen(B, [x + 6, x + 12, x + 18, x + 24], y + 5);
      sp(B, ram(24, 22), x + 5, y + 2);
      if (!bak) knippen(B, [x + 6, x + 12, x + 18, x + 24], y + 6);
      return;
    }
    const cx = x + 17, D = 16, H = 20, stolpe = former(4, H + 2, [[rakt(1, 1, 3, H + 1), x => fx(x) === 1 ? 'c' : 'b']]);
    sp(B, stolpe, cx - 2, y, false); B.morka(cx + 1, y + H); B.morka(cx + 2, y + H);
    sp(B, former(5, D + 4, [[rakt(1, 1, 4, D + 3), x => fx(x) === 1 ? 'd' : fx(x) === 3 ? 'b' : 'c']]), cx - 2, y - 1, false); // slån ovanifrån
    for (let k = 0; k < 4; k++) sp(B, STORT_KNIPPE_H, cx - 4 + (rikt === 1 ? -1 : 1) * (k % 2), y + 1 + k * 4, false);
    sp(B, stolpe, cx - 2, y + D, true);
  };
  const hardDel = (B, x, y, rikt) => { // (x, y): eldens mitt på marken
    const [dx, dy] = [[0, 1], [-1, 0], [0, -1], [1, 0]][rikt]; // åt vilket håll öppningen vetter
    const lista = [];
    for (let k = 0; k < 8; k++) {
      const v = k / 8 * Math.PI * 2, gx = Math.cos(v), gy = Math.sin(v);
      if (gx * dx + gy * dy > 0.5) continue; // öppningen och stenarna bredvid den
      lista.push({ y: y + gy * 4.5, f: () => sp(B, rundOvan(5, 3, 2, SK, k + 1), Math.round(x + gx * 8) - 3, Math.round(y + gy * 4.5) - 3) });
    }
    const eld = () => { glod(B, ell(x + 0.5, y + 0.5, 4.5, 2.6), x - 5, y - 3, 11, 7, 6 + rikt); laga(B, x - 1, y + 1, 4); laga(B, x + 2, y + 1, 3); pt(B, x, y + 1, 'h', true); };
    lista.push({ y: y + 0.1, f: eld });
    lista.sort((a, b) => a.y - b.y).forEach(o => o.f());
    const px = Math.round(x - dx * 4) - 4, py = Math.round(y - dy * 2.5) - 8; // krukan står på stenarna mitt emot öppningen
    sp(B, KRUKA, px, py, false); anga(B, px + 3, py - 1, rikt + 2);
  };
  const bankDel = (B, x, y, rikt) => { // (x, y): det övre vänstra hörnet av en ruta 36 bred
    if (rikt % 2 === 0) {
      stallBank(B, x + 4, y + 4, 26, 12, 5, 4);
      const [m, s] = rikt === 0 ? [x + 6, x + 18] : [x + 17, x + 6];
      sp(B, MORTEL_OVAN, m, y + 6); sp(B, skalOvan(10, 5, 'p', 'n'), s, y + 7);
      return;
    }
    stallTvars(B, x + 10, y, 14, 20, 5, 4);
    const [m, s] = rikt === 1 ? [y + 1, y + 13] : [y + 11, y + 1];
    sp(B, MORTEL_OVAN, x + 11, m); sp(B, skalOvan(10, 5, 'p', 'n'), x + 11, s);
  };
  const ORTDELAR = B => {
    gras(B);
    for (let r = 0; r < 4; r++) {
      const cx = 4 + r * 38;
      torkDel(B, cx, 2, r);
      hardDel(B, cx + 18, 58, r);
      bankDel(B, cx, 68, r);
    }
    sp(B, STORKRUKA_OVAN, 14, 102);
  };

  byt(KORT('f7_fangstbank', 'Fångstbänken', 'Steg 7.4.1: arbetsbänken där byn gör fällor och mjärdar, tre rutor bred och två djup. Tre nya försök där stationen är flera delar som står var för sig med gräs emellan, så att delarna kan ställas olika från by till by: en bänk, en stubbe, en korg, en ställning, ett kar och det som byggs. Var och en står bredvid slaktbänken (till vänster), snett ovanifrån. Din kommentar förra gången: ”gör fler versioner. Experimentera med hur det kan se ut om stationer är en kombination av flera separata element.”', [
    VID_SLAKT2('En kort bänk med kniven och en ringlad sena, en stubbe att sitta på, en korg med vidjor och en halvflätad mjärde på marken: fyra delar.', FANG[0]),
    VID_SLAKT2('En ställning där färdiga snaror hänger, en kort bänk, en stubbe och ett knippe vidjor på marken: fyra delar.', FANG[1]),
    VID_SLAKT2('En kluven stock på två korta stockar, ett kar där vidjorna ligger i blöt och en halvbyggd lådfälla: tre delar.', FANG[2]),
  ]));
  byt(KORT('f7_garvning', 'Garvningsställningen', 'Steg 7.7.6: en station av 4 grenar och 2 rep där ett skinn spänns upp, skrapas och garvas till läder. Nu ritad snett ovanifrån som de andra stationerna: det som ligger ned syns ovanifrån, med en mörkare framkant, korta ben fram och skuggan nedåt till höger. Två rutor stor, på gräs. Din kommentar förra gången: ”rita den något ovanifrån som dem andra stationerna”', [
    GARVN('En låg ram av fyra stänger på korta ben, med huden snörad i ramen, och ett garvkar med barklag bredvid.', GARV_N[0]),
    GARVN('Huden fäst med pinnar på den trampade marken, köttsidan upp och halvskrapad, med skrapan av ben och en skål med fett.', GARV_N[1]),
    GARVN('En ram som lutar bakåt mot två stöd: huden skrapas där den hänger, och stödens fötter syns bakom.', GARV_N[2]),
  ]));
  byt(KORT('f7_klyvplats', 'Klyvplatsen', 'Steg 7.5.1: platsen där en stock klyvs till plankor, tre gånger två rutor. Tre nya versioner, snett ovanifrån och utan klubban. Din kommentar förra gången: ”gör tre nya versioner”', [
    KLYVN('En stock på två korta stockar, med en spricka längs ovansidan, tre kilar och spån på marken.', KLY[0]),
    KLYVN('Stocken kluven i två halvor som ligger bredvid varandra med klyvytan upp, en färdig planka framför och kilarna på marken.', KLY[1]),
    KLYVN('Stocken på marken mellan par av störar som håller den, med kilarna i rad längs sprickan som öppnat sig.', KLY[2]),
  ]));
  byt({ id: 'f7_ortkok', namn: 'Örtkökets delar', typ: 'janej', vad: 'Steg 7.6.1: örtköket. Du valde version 2. Nu är torkställningen, härden (med den lilla krukan på stenarna), bänken och förrådskrukan fyra delar som kan ställas var för sig och vridas, och verktygen på marken är borta. Raderna uppifrån: torkställningen, härden, bänken och krukan. Kolumnerna: som i version 2, ett kvarts varv medsols, ett halvt varv och ett kvarts varv motsols. Krukan är rund och ser likadan ut åt alla håll. Din kommentar förra gången: ”härden, torkställningen, bänken, och krukan blir separata element som kan placeras separat och roteras. Gör roterade versioner av alla elementen. Ta bort verktygen på marken.”', versioner: [
    { text: 'De fyra delarna, var och en åt fyra håll: torkställningen, härden, bänken och krukan.', w: 156, h: 120, rita: ORTDELAR },
  ] });
  byt(KORT('f7_stenhuggarplats', 'Stenhuggarplatsen', 'Steg 7.5.1: platsen där man hugger sten, fyra gånger tre rutor. Den står på en bit av kartan, åtta gånger sex rutor: gräs, en stig förbi, granar runt om och en bybo till höger, så att du ser hur stor den är. Nu ritad om snett ovanifrån, som slaktbänken och borden: stenarna och bocken ovanifrån med en mörkare sida fram. Din kommentar förra gången: "Sätt den i ett sammanhang på kartan"', [
    PA_KARTAN('Ett stort runt huggblock med ett block på, en stubbe att sitta på och råa stenar.', HUGG[0]),
    PA_KARTAN('En lång sten på en kraftig träbock; råa stenar till vänster och färdiga block staplade till höger.', HUGG[1]),
    PA_KARTAN('En stor flat häll ovanifrån med ett block, en mejsel och en slagsten; en stock och stenar bakom.', HUGG[2]),
  ]));
  byt(KORT('f7_harden', 'Härden', 'Steg 7.5.3: eldstaden inne i huset, med rökhålet i taket ovanför (röken visar var det är). Bilden visar husets hörn uppe till vänster. Tre nya former, inte upphöjda med block som förra gången. Nu ritade snett ovanifrån: hällarna ligger i jämnhöjd med golvet, och bara den stående bakstenen i version 2 reser sig. Du sa nej till alla tre förra gången, utan kommentar.', [
    HARDEN('En rund härd av kullerstenar i golvet, med aska, glöd och vedträn i kryss innanför.', HARD[0]),
    HARDEN('En stor flat sten som står upp bakom elden och kastar värmen tillbaka in i rummet, flata hällar i golvet runt elden och ved bredvid.', HARD[1]),
    HARDEN('En långhärd: en smal ränna i golvet kantad av kantställda hällar, med glöd längs hela och två små eldar.', HARD[2]),
  ]));
  byt(KORT('f7_snara', 'Snaran', 'Steg 7.5.10: snaran på en harstig: en ögla av sena som hänger tvärs över stigen i harens huvudhöjd. Tre helt nya ritningar utan förlaga. Stigen går rakt mot dig, så att öglan syns hel, och en hare visar storleken. Din kommentar förra gången: "Ingen ser bra ut gör om alla utan förlaga"', [
    SNARA('Två klykor på var sin sida om stigen med en tvärslå mellan dem, och öglan som hänger från slåns mitt. En hare kommer längre upp på stigen.', SNAR[0]),
    SNARA('Ett lågt gärde av nedstuckna kvistar tvärs över stigen, med en öppning där haren går; öglan hänger i öppningen från en pinne mellan två högre käppar.', SNAR[1]),
    SNARA('En rak käpp nedstucken vid stigkanten och lutad in över stigen, med öglan hängande från toppen och ris på båda sidor som leder haren in i den.', SNAR[2]),
  ]));

  // ---------- 7.7.6 garvningsställningen i ett sammanhang ----------
  // Björn: "Rita stationen i ett sammanhang". Ställningen är densamma som i de tre versionerna förut (ritfunktionen i
  // fas7/7.7a-skinn-och-lader.js, lånad ur kortet), nu i byns utkant: vid en husvägg med skinn som väntar och färdigt läder,
  // vid lägerelden med en hög ved, och mellan torkställningen och en skinnhög
  {
    const gammal = VAL.find(v => v.id === 'f7_garvning');
    if (gammal) {
      const rita = gammal.versioner.map(v => v.rita);
      const GARV_SAM = (text, v, runt) => ({ text, w: 96, h: 48, rita: B => { gras(B); runt(B); rita[v](flytt(B, 34, 10)); } });
      byt(KORT('f7_garvning', 'Garvningsställningen', 'Steg 7.7.6: en station av 4 grenar och 2 rep där ett skinn spänns upp, skrapas och garvas till läder. Samma tre ställningar som förut, nu i ett sammanhang i byns utkant med det som hör till: skinnen som väntar, lädret som är klart, en husvägg, lägerelden och torkställningen. Din kommentar förra gången: ”Rita stationen i ett sammanhang”', [
        GARV_SAM('Den upprätta fyrkanten vid en husvägg, med en hög skinn som väntar och färdigt läder bredvid.', 0, B => { bildfil(B, 'timmervagg', 0, 0); bildfil(B, 'skinn', 70, 32); bildfil(B, 'vargskinn', 74, 26); bildfil(B, 'lader', 8, 36); }),
        GARV_SAM('Ramen som lutar, nära lägerelden, med vedhögen och lädret som hänger på tork.', 1, B => { bildfil(B, 'lagereld_lite', 4, 20); bildfil(B, 'ved', 6, 38); bildfil(B, 'lader', 72, 34); bildfil(B, 'kniv', 74, 28); }),
        GARV_SAM('A-ramen mellan torkställningen och en hög skinn, med en bensyl och ett skinn i taget.', 2, B => { bildfil(B, 'tork', 0, 8); bildfil(B, 'bjornskinn', 70, 30); bildfil(B, 'radjursskinn', 74, 22); bildfil(B, 'bensyl', 66, 40); }),
      ]));
    }
  }
})();
