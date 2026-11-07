// Björns svar på sex kort i valdelen (efter 7.8.1): fångstbänken bredvid slaktbänken, stenhuggarplatsen på en bit av
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

  // ---------- 1. fångstbänken bredvid slaktbänken ----------
  // de tre versionerna är som förut (tre gånger två rutor); slaktbänken är den godkända bilden ur bildstil/bilder
  const skiva = former(46, 8, [[rakt(1, 1, 45, 5), (x, y) => fx(y) === 1 ? 'd' : (fx(x) * 3) % 13 === 0 ? 'b' : 'c'], [rakt(1, 5, 45, 7), 'a']]);
  const grenben = former(46, 10, [[linje([[5, 0], [4, 9]], 0.9), 'b'], [linje([[41, 0], [42, 9]], 0.9), 'a'], [linje([[12, 0], [12, 7]], 0.8), 'a'], [linje([[34, 0], [34, 7]], 0.8), 'a']]);
  const halvMjarde = former(26, 11, [[poly([[1, 1], [12, 2], [12, 9], [1, 10]]), (x, y) => (fx(x) + fx(y)) % 3 === 0 ? 'e' : (fx(x) + fx(y)) % 3 === 1 ? 'g' : 'f'], [linje([[12, 2], [24, 5.5]], 0.5), 'f'], [linje([[12, 5.5], [24, 5.5]], 0.5), 'g'], [linje([[12, 9], [24, 5.5]], 0.5), 'f']]);
  const snaran = (w) => former(w, 11, [[linje([[w / 2, 0], [w / 2, 4]], 0.5), 'w'], [(x, y) => { const d = Math.hypot(x - w / 2, y - 7); return d <= 3.4 && d >= 2.2; }, 'x']]);
  const BANK = [
    B => { skugga(B, 6, 32, 44); sp(B, grenben, 5, 22, false); sp(B, skiva, 5, 15); sp(B, halvMjarde, 8, 6); for (let k = 0; k < 3; k++) for (let x = 36; x < 49; x++) B.satt(x, 13 - k, B.P.i('senap', k === 1 ? 3 : 2)); },
    B => { skugga(B, 6, 32, 44); sp(B, former(46, 18, [[rakt(4, 1, 6, 18), 'b'], [rakt(40, 1, 42, 18), 'a'], [rakt(3, 1, 43, 3), 'c']]), 5, 0, false); [12, 20, 28, 36].forEach(x => sp(B, snaran(9), x, 3, false)); sp(B, grenben, 5, 24, false); sp(B, skiva, 5, 17); sp(B, former(14, 4, [[rakt(1, 1, 13, 3), 'x']]), 20, 13); },
    B => { skugga(B, 4, 32, 48); sp(B, kryss, 4, 20); sp(B, kryss, 42, 20); sp(B, stock(46, 6), 4, 15); const bur = former(22, 13, [[rakt(1, 1, 21, 2), 'c'], [rakt(1, 11, 21, 12), 'b'], ...[1, 5, 9, 13].map(x => [rakt(x, 1, x + 1, 12), 'c'])]); sp(B, bur, 12, 3); sp(B, former(12, 4, [[rakt(1, 1, 7, 3), 'S'], [rakt(7, 1, 11, 3), 'b']]), 38, 11); },
  ];
  // slaktbänken till vänster och fångstbänken till höger, med benen på samma rad
  const VID_SLAKT = (text, f) => ({ text, w: 106, h: 42, rita: B => { gras(B); bildfil(B, 'slaktbank', 0, 14); f(flytt(B, 50, 4)); } });

  // ---------- 2. stenhuggarplatsen på en bit av kartan ----------
  const HUGG = [
    B => { sp(B, rund(14, 10, TR), 2, 26); skugga(B, 16, 34, 34); sp(B, rund(30, 20), 16, 18); sp(B, block(14, 8), 24, 12); [[50, 30, 9, 8], [46, 8, 8, 6]].forEach(([x, y, w, h], i) => sp(B, rund(w, h, SK, i), x, y)); flisor(B, 8, 38, 48, 8, 1); },
    B => { const bock = former(40, 14, [[linje([[5, 1], [2, 13]], 1.2), 'b'], [linje([[9, 1], [12, 13]], 1.2), 'a'], [linje([[31, 1], [28, 13]], 1.2), 'b'], [linje([[35, 1], [38, 13]], 1.2), 'a']]); sp(B, bock, 12, 28); sp(B, stock(40, 6), 11, 22); sp(B, block(20, 10), 21, 12); [[1, 32], [3, 22]].forEach(([x, y], i) => sp(B, rund(8, 7, SK, i), x, y)); for (const [x, y] of [[54, 36], [54, 28], [56, 20]]) sp(B, block(7, 6), x, y); flisor(B, 16, 40, 36, 6, 2); },
    B => { sp(B, stock(30, 7), 4, 6); skugga(B, 7, 38, 50); sp(B, former(52, 14, [[poly([[2, 3], [49, 1], [51, 11], [1, 13]]), (x, y) => y < 5 ? 'T' : (fx(x) * 5 + fx(y)) % 13 === 0 ? 'R' : y < 11 ? 'S' : 'Q']]), 6, 26); sp(B, block(16, 9), 22, 18); sp(B, former(10, 4, [[rakt(1, 1, 7, 3), 'S'], [rakt(7, 1, 9, 3), 'b']]), 42, 26); sp(B, rund(6, 5), 48, 20); for (let i = 0; i < 4; i++) sp(B, rund(7, 6, SK, i), 40 + (i % 2) * 2, 4 + i * 0 + (i * 4) % 12 - 2 + i); },
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
  const ORT = [
    B => { // den lilla elden med krukan, som version 1 från början, och en lång arbetsbänk under en torkställning
      sp(B, ram(46, 22), 30, 0);
      [34, 42, 50, 58, 66].forEach((x, i) => sp(B, STORT_KNIPPE_H, x, 4 + (i % 2), false));
      bildfil(B, 'lagereld_lite', 6, 13);
      sp(B, LITEN_KRUKA, 16, 19, false); anga(B, 19, 18, 1);
      sp(B, bank(44, 6, 2), 31, 24);
      sp(B, MORTEL, 34, 16, false); sp(B, KNIPPE_L, 44, 19, false); sp(B, STORSKAL('p', 'n'), 56, 18, false); sp(B, skal('g', 'f'), 66, 19, false);
      sp(B, STORKRUKA, 2, 31); vedtrave(B, 16, 35); sp(B, STORSKAL('l', 'K'), 64, 37);
    },
    B => { // den låga härden av stenar med krukan ovanpå, som version 2 från början, en stor torkställning och en bänk
      sp(B, ram(26, 26), 0, 2);
      [3, 9, 15, 21].forEach((x, i) => sp(B, STORT_KNIPPE_H, x - 1, 6 + (i % 2), false));
      const hx = 30, hy = 18; // härden, lika stor som från början
      sp(B, rasten(6, 6, 2), hx, hy + 3); sp(B, rasten(6, 6, 3), hx + 12, hy + 3);
      for (let y = hy + 5; y < hy + 10; y++) for (let x = hx + 7; x < hx + 13; x++) B.satt(x, y, B.P.i('kol', 1));
      laga(B, hx + 9, hy + 9, 4); laga(B, hx + 11, hy + 9, 3); B.satt(hx + 8, hy + 9, B.P.i('rost', 2), true); B.satt(hx + 10, hy + 9, B.P.i('senap', 3), true);
      sp(B, former(20, 6, [[rakt(1, 1, 19, 5), (x, y) => y < 2.6 ? 'T' : x > 17 ? 'R' : 'S']]), hx, hy, false);
      sp(B, KRUKA, hx + 6, hy - 8, false); anga(B, hx + 9, hy - 9, 2);
      sp(B, bank(26, 6, 4), 53, 18);
      sp(B, MORTEL, 56, 10, false); sp(B, STORSKAL('p', 'n'), 66, 12, false);
      sp(B, STORKRUKA, 4, 31); sp(B, STORSKAL('g', 'f'), 34, 34); sp(B, KNIPPE_L, 54, 36);
    },
    B => { // grytan i trefoten över elden mellan fyra stenar, som version 3 från början, ett långt bord och ett torkställ
      sp(B, ram(36, 18), 42, 0);
      [46, 54, 62, 70].forEach((x, i) => sp(B, STORT_KNIPPE_H, x, 4 + (i % 2), false));
      sp(B, bank(36, 7, 5), 42, 20);
      sp(B, MORTEL, 45, 12, false); sp(B, KNIPPE_L, 55, 15, false); sp(B, STORSKAL('p', 'n'), 67, 14, false);
      const cx = 18, fot = 34; // elden och trefoten, lika stora som från början
      for (let y = fot - 3; y <= fot; y++) for (let x = cx - 4; x <= cx + 4; x++) B.satt(x, y, B.P.i('kol', hash(x, y, 4) < 0.3 ? 2 : 1));
      laga(B, cx - 2, fot - 1, 4); laga(B, cx + 2, fot - 1, 4); laga(B, cx, fot - 1, 5);
      sp(B, former(24, 24, [[linje([[2, 22], [11.5, 2]], 0.6), 'b'], [linje([[21, 22], [11.5, 2]], 0.6), 'c'], [linje([[13.5, 21], [11.5, 2]], 0.5), 'b'], [rakt(11, 1, 13, 3), 'w']]), cx - 12, fot - 22, false);
      for (let y = fot - 19; y < fot - 13; y++) B.satt(cx, y, B.P.i('ben', 1));
      sp(B, GRYTA, cx - 5, fot - 15, false);
      sp(B, rasten(5, 4, 1), cx - 9, fot - 4); sp(B, rasten(5, 4, 2), cx + 3, fot - 4);
      sp(B, rasten(5, 4, 3), cx - 5, fot - 1); sp(B, rasten(5, 4, 5), cx - 1, fot);
      vedtrave(B, 26, 32); sp(B, STORKRUKA, 64, 32); sp(B, STORSKAL('g', 'f'), 0, 38);
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
    B => { // en stor flat sten står upp bakom elden och kastar värmen tillbaka in i rummet; hällar i golvet runt elden
      bildfil(B, 'timmervagg', 0, 0);
      const x0 = 12, y0 = 20;
      sp(B, former(26, 15, [[poly([[2, 3], [9, 1], [18, 1], [24, 4], [24, 14], [1, 14]]), (x, y) => y < 4 ? 'T' : x > 21 ? 'R' : (fx(x) * 3 + fx(y) * 5) % 17 === 0 ? 'R' : y > 12 ? 'R' : 'S']]), x0, y0, false); // bakstenen
      sp(B, former(28, 12, [[rakt(1, 1, 27, 11), (x, y) => { const i = fx(x) - 1, j = fx(y) - 1; const fog = (j === 4 && (i < 6 || i > 19)) || ((i === 6 || i === 19) && j > 0); return fog ? 'Q' : j === 0 || i === 0 ? 'T' : 'S'; }]]), x0 - 1, y0 + 13); // golvhällarna
      glod(B, rakt(x0 + 7, y0 + 14, x0 + 20, y0 + 22), x0 + 7, y0 + 14, 13, 8, 5);
      vedtra(B, x0 + 8, y0 + 18, x0 + 18, y0 + 16); vedtra(B, x0 + 9, y0 + 16, x0 + 19, y0 + 19);
      laga(B, x0 + 13, y0 + 18, 6); laga(B, x0 + 10, y0 + 19, 4); laga(B, x0 + 16, y0 + 19, 4);
      for (let k = 0; k < 9; k++) for (let x = x0 + 4; x < x0 + 21; x++) if (hash(x, k, 8) < 0.25 - k * 0.025) B.satt(x, y0 + 12 - k, B.P.i('kol', 1)); // sotet på bakstenen
      sp(B, stock(9, 3), 38, 30); sp(B, stock(9, 3), 38, 35); sp(B, stock(9, 3), 36, 40);
      rok(B, x0 + 12, y0 - 1, 2);
    },
    B => { // en långhärd: en smal ränna i golvet kantad av kantställda hällar, glöd längs hela och två små eldar
      bildfil(B, 'timmervagg', 0, 0);
      const x0 = 5, y0 = 26, w = 38, h = 12;
      sp(B, former(w, h, [
        [rakt(1, 1, w - 1, 4), (x, y) => fx(y) === 1 ? 'T' : (fx(x) % 7 === 0 ? 'Q' : 'S')], // hällarna bak: ovankanten syns
        [och(rakt(1, 1, 4, h - 1), rakt(w - 4, 1, w - 1, h - 1)), (x, y) => fx(x) === 1 || fx(x) === w - 4 ? 'T' : 'R'], // gavlarna
        [rakt(1, h - 4, w - 1, h - 1), (x, y) => fx(y) === h - 4 ? 'T' : (fx(x) % 8 === 3 ? 'Q' : fx(y) === h - 2 ? 'R' : 'S')], // hällarna fram: framsidan syns
      ]), x0, y0);
      glod(B, (x, y) => true, x0 + 4, y0 + 4, w - 8, h - 8, 7);
      vedtra(B, x0 + 7, y0 + 5, x0 + 15, y0 + 6); vedtra(B, x0 + 21, y0 + 6, x0 + 30, y0 + 5);
      laga(B, x0 + 11, y0 + 6, 5); laga(B, x0 + 13, y0 + 7, 3); laga(B, x0 + 26, y0 + 6, 5); laga(B, x0 + 24, y0 + 7, 3);
      rok(B, x0 + 12, y0 - 1, 3); rok(B, x0 + 26, y0 - 1, 4);
    },
  ];
  const HARDEN = (text, f) => ({ text, w: 48, h: 48, rita: B => f(B) });

  // ---------- 5. klyvplatsen: version 1 utan klubban ----------
  const KLYV = B => { gras(B); sp(B, kryss, 4, 14); sp(B, kryss, 32, 14); sp(B, stock(38, 7), 3, 10); for (let x = 8; x < 34; x++) B.satt(x, 13, B.P.i('jord', 0)); sp(B, kil, 14, 7); sp(B, kil, 26, 7); };

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

  byt(KORT('f7_fangstbank', 'Fångstbänken', 'Steg 7.4.1: arbetsbänken där byn gör fällor och mjärdar, tre rutor bred och två djup. Samma tre versioner som förra gången, men nu står var och en bredvid slaktbänken (till vänster) på marken, så att du ser dem tillsammans. Din kommentar förra gången: "Sätt den bredvid slaktbänken så jag kan se den i ett sammanhang"', [
    VID_SLAKT('En låg bänk på fyra grenar, med en halvflätad mjärde och en bunt vidjor.', BANK[0]),
    VID_SLAKT('En bänk med en ställning bak där färdiga snaror hänger.', BANK[1]),
    VID_SLAKT('En kluven stock på två kryss, med en bur som byggs och en kniv.', BANK[2]),
  ]));
  byt(KORT('f7_stenhuggarplats', 'Stenhuggarplatsen', 'Steg 7.5.1: platsen där man hugger sten, fyra gånger tre rutor. Samma tre versioner som förra gången, men nu på en bit av kartan, åtta gånger sex rutor: gräs, en stig förbi, granar runt om och en bybo till höger, så att du ser hur stor den är. Din kommentar förra gången: "Sätt den i ett sammanhang på kartan"', [
    PA_KARTAN('Ett stort runt huggblock med ett block på, en stubbe att sitta på och råa stenar.', HUGG[0]),
    PA_KARTAN('En lång sten på en kraftig träbock; råa stenar till vänster och färdiga block staplade till höger.', HUGG[1]),
    PA_KARTAN('En stor flat häll med ett block, en mejsel och en slagsten; en stock och stenar bakom.', HUGG[2]),
  ]));
  byt(KORT('f7_ortkok', 'Örtköket', 'Steg 7.6.1: stationen där örter kokas. Stationen är nu fem gånger tre rutor, med längre bänkar, större torkställningar och större krukor och skålar, men elden, krukan på elden och grytan är lika små som i de första versionerna. Din kommentar förra gången: "Elden ska inte vara större. Stationen ska vara större"', [
    ORTKOK('Den lilla elden med en kruka i, och en lång arbetsbänk med mortel, örter och skålar under en torkställning där fem knippen hänger.', ORT[0]),
    ORTKOK('Den låga härden av stenar med krukan ovanpå och elden i öppningen, en stor torkställning till vänster och en bänk till höger.', ORT[1]),
    ORTKOK('Grytan i en trefot över elden mellan fyra stenar, och ett långt bord med mortel och örter under ett torkställ.', ORT[2]),
  ]));
  byt(KORT('f7_harden', 'Härden', 'Steg 7.5.3: eldstaden inne i huset, med rökhålet i taket ovanför (röken visar var det är). Bilden visar husets hörn uppe till vänster. Tre nya former, inte upphöjda med block som förra gången. Du sa nej till alla tre förra gången, utan kommentar.', [
    HARDEN('En rund härd av kullerstenar i golvet, med aska, glöd och vedträn i kryss innanför.', HARD[0]),
    HARDEN('En stor flat sten som står upp bakom elden och kastar värmen tillbaka in i rummet, hällar i golvet runt elden och ved bredvid.', HARD[1]),
    HARDEN('En långhärd: en smal ränna i golvet kantad av kantställda hällar, med glöd längs hela och två små eldar.', HARD[2]),
  ]));
  byt({ id: 'f7_klyvplats', namn: 'Klyvplatsen', typ: 'janej', vad: 'Steg 7.5.1: platsen där en stock klyvs till plankor, tre gånger två rutor. Du valde version 1; här är den utan klubban på marken. Din kommentar förra gången: "Ta bort klubban"', versioner: [
    { text: 'En lång stock på två kryss med en spricka längs ovansidan och två kilar, utan klubban.', w: 48, h: 32, rita: KLYV },
  ] });
  byt(KORT('f7_snara', 'Snaran', 'Steg 7.5.10: snaran på en harstig: en ögla av sena som hänger tvärs över stigen i harens huvudhöjd. Tre helt nya ritningar utan förlaga. Stigen går rakt mot dig, så att öglan syns hel, och en hare visar storleken. Din kommentar förra gången: "Ingen ser bra ut gör om alla utan förlaga"', [
    SNARA('Två klykor på var sin sida om stigen med en tvärslå mellan dem, och öglan som hänger från slåns mitt. En hare kommer längre upp på stigen.', SNAR[0]),
    SNARA('Ett lågt gärde av nedstuckna kvistar tvärs över stigen, med en öppning där haren går; öglan hänger i öppningen från en pinne mellan två högre käppar.', SNAR[1]),
    SNARA('En rak käpp nedstucken vid stigkanten och lutad in över stigen, med öglan hängande från toppen och ris på båda sidor som leder haren in i den.', SNAR[2]),
  ]));
})();
