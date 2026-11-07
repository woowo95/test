// steg 7.8.1: det Björn svarat på i valdelen. Det inbyggda och det som inte ska vara en bild tas bort ur VAL, och det han vill
// ha ändrat ritas på nytt här. Hans förra kommentar står i kortets text.
(() => {
  const { KORT, former, ell, linje, och, rakt, poly, lagg, bildfil, gras, hash, bredd } = window.F7;
  const BORT = ['f7_gadda', 'f7_mort', 'f7_huggen_sten', 'f7_plankor', 'f7_lader', 'f7_vargtand', 'f7_trad', 'f7_tunika', 'f7_vavstol', 'f7_mjarde', 'f7_linfalt', 'f7_blot_ved', 'f7_bro', 'f7_brygga', 'f7_stockvag', 'f7_karra', 'f6_i_bjorndodare', 'f6_prickar',
    'f7_samlingssal', 'f7_torkhus', 'f7_vedbod', 'f7_torg', // ska inte vara bilder: de syns som hus, väggar och väg
    'f7_stenhuggarplats', 'f7_klyvplats', 'f7_ortkok', 'f7_fangstbank', 'f7_harden', 'f7_snara', 'f7_linfron', 'f7_lin', 'f7_lintyg'];
  for (let i = VAL.length - 1; i >= 0; i--) if (BORT.includes(VAL[i].id)) VAL.splice(i, 1);

  const L = { o: 'kol0', a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3', e: 'senap0', f: 'senap1', g: 'senap2', h: 'senap3', r: 'rost0', s: 'rost1', t: 'rost2', u: 'rost3', v: 'ben0', w: 'ben1', x: 'ben2', y: 'ben3', K: 'kol1', l: 'kol2', m: 'kol3', Q: 'skiffer0', R: 'skiffer1', S: 'skiffer2', T: 'skiffer3', i: 'oliv0', j: 'oliv1', n: 'oliv2', p: 'oliv3' };
  const SK = 'QRST', TR = 'abcd', LJ = 'vwxy';
  const fx = Math.floor;
  // en rund sten eller stock: ljus uppe till vänster
  const rund = (w, h, R = SK, s = 0) => former(w + 2, h + 2, [[ell(1 + w / 2, 1 + h / 2, w / 2, h / 2), (x, y) => { const u = (x - 1) / w * 0.7 + (y - 1) / h; if (hash(fx(x), fx(y), s) < 0.06) return R[1]; return u < 0.5 ? R[3] : u < 1 ? R[2] : u < 1.35 ? R[1] : R[0]; }]]);
  // ett huggit block: ljus ovansida, framsida och mörk högerkant
  const block = (w, h, R = SK, tp = 2) => former(w + 2, h + 2, [[rakt(1, 1, w + 1, h + 1), (x, y) => { const yy = fx(y) - 1, xx = fx(x) - 1; return yy < tp ? R[3] : xx >= w - 1 ? R[0] : yy >= h - 1 ? R[1] : R[2]; }]]);
  // en liggande stock med ändträ till höger
  const stock = (w, h) => former(w + 2, h + 2, [[rakt(1, 1, w, h + 1), (x, y) => { const yy = (fx(y) - 1) / h; return yy < 0.25 ? 'd' : yy < 0.6 ? ((fx(x) * 3 + fx(y)) % 9 === 0 ? 'b' : 'c') : yy < 0.85 ? 'b' : 'a'; }], [ell(w, 1 + h / 2, 1.6, h / 2), (x, y) => Math.hypot(x - w, y - 1 - h / 2) < 0.8 ? 'x' : 'y']]);
  const planka = (w, ton = 'c') => former(w + 2, 4, [[rakt(1, 1, w + 1, 3), (x, y) => fx(y) === 1 ? 'd' : (fx(x) % 7 === 0 ? 'b' : ton)]]);
  const sp = (B, r, x, y, sk = true) => lagg(B, r, L, x, y, sk);
  const flisor = (B, x0, y0, w, h, s) => { for (let i = 0; i < 12; i++) B.satt(x0 + fx(hash(i, s, 1) * w), y0 + fx(hash(i, s, 2) * h), B.P.i('skiffer', hash(i, s, 3) < 0.5 ? 3 : 2)); };
  const laga = (B, x, y, h) => { for (let i = 0; i < h; i++) { const w = Math.max(0, fx((h - i) / 3)); for (let dx = -w; dx <= w; dx++) B.satt(x + dx, y - i, B.P.i(i > h * 0.6 ? 'senap' : 'rost', i > h * 0.6 ? 3 : Math.abs(dx) === w ? 2 : 3), true); } };
  const kruka = former(13, 13, [[ell(6.5, 7.5, 5.2, 4.8), (x, y) => x + y < 11 ? 'u' : x + y < 15 ? 't' : 's'], [rakt(2.5, 2, 10.5, 4), (x, y) => fx(y) === 2 ? 'K' : 't'], [rakt(3.5, 2, 9.5, 3), 'p']]);
  const ortknippe = former(9, 12, [[linje([[4.5, 11], [2, 3]], 0.5), 'i'], [linje([[4.5, 11], [7, 3]], 0.5), 'i'], [linje([[4.5, 11], [4.5, 2]], 0.5), 'j'], [ell(2, 2.5, 1.6, 1.3), 'x'], [ell(7, 2.5, 1.6, 1.3), 'y'], [ell(4.5, 1.8, 1.6, 1.3), 'y'], [rakt(3.5, 8, 5.5, 9), 's']]);
  const ST = (text, w, h, f) => ({ text, w, h, rita: B => { gras(B); f(B); } });
  const skugga = (B, x, y, w, h = 3) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((i + j) % 2 === 0) B.morka(x + i, y + j); };

  // ---------- stenhuggarplatsen, större: fyra gånger tre rutor ----------
  const HUGG = [
    B => { sp(B, rund(14, 10, TR), 2, 26); skugga(B, 16, 34, 34); sp(B, rund(30, 20), 16, 18); sp(B, block(14, 8), 24, 12); [[50, 30, 9, 8], [46, 8, 8, 6]].forEach(([x, y, w, h], i) => sp(B, rund(w, h, SK, i), x, y)); flisor(B, 8, 38, 48, 8, 1); },
    B => { const bock = former(40, 14, [[linje([[5, 1], [2, 13]], 1.2), 'b'], [linje([[9, 1], [12, 13]], 1.2), 'a'], [linje([[31, 1], [28, 13]], 1.2), 'b'], [linje([[35, 1], [38, 13]], 1.2), 'a']]); sp(B, bock, 12, 28); sp(B, stock(40, 6), 11, 22); sp(B, block(20, 10), 21, 12); [[1, 32], [3, 22]].forEach(([x, y], i) => sp(B, rund(8, 7, SK, i), x, y)); for (const [x, y] of [[54, 36], [54, 28], [56, 20]]) sp(B, block(7, 6), x, y); flisor(B, 16, 40, 36, 6, 2); },
    B => { sp(B, stock(30, 7), 4, 6); skugga(B, 7, 38, 50); sp(B, former(52, 14, [[poly([[2, 3], [49, 1], [51, 11], [1, 13]]), (x, y) => y < 5 ? 'T' : (fx(x) * 5 + fx(y)) % 13 === 0 ? 'R' : y < 11 ? 'S' : 'Q']]), 6, 26); sp(B, block(16, 9), 22, 18); sp(B, former(10, 4, [[rakt(1, 1, 7, 3), 'S'], [rakt(7, 1, 9, 3), 'b']]), 42, 26); sp(B, rund(6, 5), 48, 20); for (let i = 0; i < 4; i++) sp(B, rund(7, 6, SK, i), 40 + (i % 2) * 2, 4 + i * 0 + (i * 4) % 12 - 2 + i); },
  ];
  // ---------- klyvplatsen: tre gånger två rutor, helt nya ----------
  const kryss = former(10, 13, [[linje([[1, 1], [9, 12]], 1), 'b'], [linje([[9, 1], [1, 12]], 1), 'a']]);
  const kil = former(5, 7, [[poly([[0.5, 1], [4.5, 1], [2.5, 6.5]]), (x) => x < 2.5 ? 'y' : 'w']]);
  const KLYV = [
    B => { sp(B, kryss, 4, 14); sp(B, kryss, 32, 14); sp(B, stock(38, 7), 3, 10); for (let x = 8; x < 34; x++) B.satt(x, 13, B.P.i('jord', 0)); sp(B, kil, 14, 7); sp(B, kil, 26, 7); sp(B, former(16, 6, [[rakt(1, 2, 11, 4), 'c'], [rakt(10, 1, 15, 5), 'b']]), 28, 25); },
    B => { sp(B, former(26, 18, [[poly([[1, 3], [12, 1], [12, 16], [1, 16]]), (x, y) => x < 3 ? 'b' : y < 5 ? 'd' : 'c'], [poly([[14, 1], [25, 3], [25, 16], [14, 16]]), (x, y) => x > 22 ? 'a' : y < 5 ? 'x' : 'y']]), 3, 9); sp(B, kil, 15, 5); for (let k = 0; k < 3; k++) sp(B, planka(14, k === 1 ? 'y' : 'x'), 30, 26 - k * 5); },
    B => { sp(B, stock(28, 6), 3, 22); for (let k = 0; k < 4; k++) sp(B, planka(30, k % 2 ? 'x' : 'y'), 12 + (k % 2), 16 - k * 3); for (let i = 0; i < 3; i++) sp(B, kil, 34 + i * 5, 23); },
  ];
  // ---------- örtköket, större: fyra gånger tre rutor ----------
  const stenring = (B, cx, cy, rx, ry) => { for (let a = 0; a < 10; a++) { const v = a / 10 * Math.PI * 2; sp(B, rund(6, 5, SK, a), cx + Math.round(Math.cos(v) * rx) - 4, cy + Math.round(Math.sin(v) * ry) - 3, false); } };
  const bank = former(30, 12, [[rakt(1, 1, 29, 5), (x, y) => fx(y) === 1 ? 'd' : 'c'], [rakt(3, 5, 6, 11), 'b'], [rakt(24, 5, 27, 11), 'a']]);
  const ORT = [
    B => { stenring(B, 20, 32, 13, 8); laga(B, 20, 36, 8); sp(B, kruka, 14, 18); sp(B, bank, 32, 14); sp(B, ortknippe, 36, 4); sp(B, ortknippe, 48, 5); sp(B, kruka, 44, 30); },
    B => { sp(B, block(30, 14), 4, 24); for (let x = 12; x < 28; x++) for (let y = 32; y < 39; y++) B.satt(x, y, B.P.i('kol', 0)); laga(B, 20, 38, 6); sp(B, kruka, 13, 11); sp(B, bank, 32, 26); sp(B, ortknippe, 38, 15); sp(B, ortknippe, 50, 14); },
    B => { stenring(B, 22, 36, 14, 7); laga(B, 22, 38, 9); const tre = former(32, 36, [[linje([[16, 1], [2, 34]], 0.9), 'b'], [linje([[16, 1], [30, 34]], 0.9), 'a'], [linje([[16, 1], [16, 14]], 0.4), 'w']]); sp(B, tre, 6, 3, false); sp(B, kruka, 15, 17); const stall = former(18, 22, [[rakt(2, 2, 4, 21), 'b'], [rakt(14, 2, 16, 21), 'a'], [rakt(1, 3, 17, 5), 'c']]); sp(B, stall, 44, 20); sp(B, ortknippe, 47, 6, false); },
  ];
  // ---------- fångstbänken, tre gånger två rutor ----------
  const skiva = former(46, 8, [[rakt(1, 1, 45, 5), (x, y) => fx(y) === 1 ? 'd' : (fx(x) * 3) % 13 === 0 ? 'b' : 'c'], [rakt(1, 5, 45, 7), 'a']]);
  const grenben = former(46, 10, [[linje([[5, 0], [4, 9]], 0.9), 'b'], [linje([[41, 0], [42, 9]], 0.9), 'a'], [linje([[12, 0], [12, 7]], 0.8), 'a'], [linje([[34, 0], [34, 7]], 0.8), 'a']]);
  const halvMjarde = former(26, 11, [[poly([[1, 1], [12, 2], [12, 9], [1, 10]]), (x, y) => (fx(x) + fx(y)) % 3 === 0 ? 'e' : (fx(x) + fx(y)) % 3 === 1 ? 'g' : 'f'], [linje([[12, 2], [24, 5.5]], 0.5), 'f'], [linje([[12, 5.5], [24, 5.5]], 0.5), 'g'], [linje([[12, 9], [24, 5.5]], 0.5), 'f']]);
  const snaran = (w) => former(w, 11, [[linje([[w / 2, 0], [w / 2, 4]], 0.5), 'w'], [(x, y) => { const d = Math.hypot(x - w / 2, y - 7); return d <= 3.4 && d >= 2.2; }, 'x']]);
  const BANK = [
    B => { skugga(B, 6, 32, 44); sp(B, grenben, 5, 22, false); sp(B, skiva, 5, 15); sp(B, halvMjarde, 8, 6); for (let k = 0; k < 3; k++) for (let x = 36; x < 49; x++) B.satt(x, 13 - k, B.P.i('senap', k === 1 ? 3 : 2)); },
    B => { skugga(B, 6, 32, 44); sp(B, former(46, 18, [[rakt(4, 1, 6, 18), 'b'], [rakt(40, 1, 42, 18), 'a'], [rakt(3, 1, 43, 3), 'c']]), 5, 0, false); [12, 20, 28, 36].forEach(x => sp(B, snaran(9), x, 3, false)); sp(B, grenben, 5, 24, false); sp(B, skiva, 5, 17); sp(B, former(14, 4, [[rakt(1, 1, 13, 3), 'x']]), 20, 13); },
    B => { skugga(B, 4, 32, 48); sp(B, kryss, 4, 20); sp(B, kryss, 42, 20); sp(B, stock(46, 6), 4, 15); const bur = former(22, 13, [[rakt(1, 1, 21, 2), 'c'], [rakt(1, 11, 21, 12), 'b'], ...[1, 5, 9, 13].map(x => [rakt(x, 1, x + 1, 12), 'c'])]); sp(B, bur, 12, 3); sp(B, former(12, 4, [[rakt(1, 1, 7, 3), 'S'], [rakt(7, 1, 11, 3), 'b']]), 38, 11); },
  ];
  // ---------- härden: formen på version 2, två varv block, i tre utföranden ----------
  const golv = B => { for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, B.P.i('jord', (x * 7 + y * 11) % 17 === 0 ? 0 : 1)); };
  const rok = (B, x, y, s) => { for (let i = 0; i < 16; i++) if (hash(i, s, 4) > i * 0.04) B.satt(x + Math.round(Math.sin(i / 3 + s) * 2), y - i, B.P.i('ben', i < 6 ? 2 : 1)); };
  const varv = (B, x, y, n, bw, bh, R = SK) => { for (let i = 0; i < n; i++) sp(B, block(bw, bh, R), x + i * bw, y, false); };
  const HARD = [
    B => { golv(B); varv(B, 10, 34, 4, 7, 4); varv(B, 13, 29, 3, 7, 4); for (let x = 16; x < 32; x++) B.satt(x, 30, B.P.i('kol', 0)); laga(B, 20, 30, 9); laga(B, 26, 30, 7); rok(B, 23, 19, 1); },
    B => { golv(B); varv(B, 8, 32, 5, 6, 5); varv(B, 11, 27, 3, 8, 4); for (let x = 14; x < 34; x++) B.satt(x, 28, B.P.i('kol', 1)); laga(B, 23, 28, 12); sp(B, block(22, 3), 13, 41); rok(B, 23, 14, 2); },
    B => { golv(B); varv(B, 8, 31, 4, 8, 5, 'QRST'); varv(B, 12, 26, 3, 8, 4, 'QRST'); for (let x = 15; x < 33; x++) { B.satt(x, 27, B.P.i('ben', (x % 3) ? 1 : 2)); } laga(B, 24, 27, 6); for (const [x, y] of [[18, 26], [29, 26]]) B.satt(x, y, B.P.i('rost', 3), true); rok(B, 24, 19, 3); },
  ];
  // ---------- snaran utan den böjda grenen ----------
  const stig = B => { for (let y = 18; y < 30; y++) for (let x = 0; x < B.w; x++) if (Math.abs(y - 24 - Math.sin(x / 9) * 2) < 4) B.satt(x, y, B.P.i('jord', hash(x, y, 7) < 0.15 ? 1 : 2)); };
  const loop = (x, y, r = 4) => (X, Y) => { const d = Math.hypot(X - x, Y - y); return d <= r && d >= r - 1; };
  const SNAR = [
    B => { stig(B); sp(B, former(16, 22, [[linje([[3, 1], [3, 21]], 1), 'b'], [linje([[3, 5], [9, 7]], 0.5), 'x'], [loop(11, 12), 'x']]), 24, 10, false); },
    B => { stig(B); sp(B, former(26, 24, [[linje([[3, 22], [3, 3]], 1), 'b'], [linje([[23, 22], [23, 3]], 1), 'a'], [linje([[1, 4], [25, 4]], 0.8), 'c'], [linje([[13, 4], [13, 9]], 0.5), 'x'], [loop(13, 14), 'x']]), 20, 8, false); },
    B => { stig(B); sp(B, former(30, 22, [[linje([[3, 19], [3, 8]], 0.9), 'b'], [linje([[3, 9], [13, 12]], 0.45), 'x'], [loop(18, 14), 'x'], [linje([[3, 8], [8, 5]], 0.45), 'w']]), 20, 10, false); sp(B, rund(7, 5), 28, 5); },
  ];
  // ---------- linfröna, små: en punkt var ----------
  const fronHog = (n, s) => { const c = new Set(); for (let i = 0; i < n; i++) c.add(fx(hash(i, s, 1) * 7) + fx(hash(i, s, 2) * 3) * 8); return ['.......', '.......', '.......'].map((_, y) => Array.from({ length: 7 }, (_, x) => c.has(x + y * 8) ? (x % 2 ? 's' : 'a') : '.').join('')); };
  const FRO = [
    B => { gras(B); sp(B, fronHog(10, 1), 8, 10, false); bildfil(B, 'artfron', 24, 8); },
    B => { gras(B); sp(B, former(9, 9, [[ell(4.5, 5, 3.6, 3.5), (x, y) => x + y < 8 ? 'c' : 'b'], [rakt(3, 1, 6, 2.5), 'c']]), 6, 6); bildfil(B, 'artfron', 24, 8); },
    B => { gras(B); sp(B, former(10, 6, [[poly([[1, 1], [9, 1], [7, 5], [3, 5]]), (x, y) => y < 2 ? 's' : 'c']]), 5, 9); bildfil(B, 'artfron', 24, 8); },
  ];
  // ---------- linet och lintyget: helt nya ----------
  const strå = (x0, y0, x1, y1, t) => [linje([[x0, y0], [x1, y1]], 0.5), t];
  const LIN = [
    PA(former(30, 12, [...[2, 4, 6, 8, 10].map((y, i) => strå(1, y, 26, 3 + i * 1.4, i % 2 ? 'g' : 'h')), [rakt(10, 1, 13, 11), 's'], [ell(27.5, 4, 1.6, 1.6), 'T'], [ell(28, 7.5, 1.6, 1.6), 'S']]), 'En liggande kärve med de blå blommorna kvar i toppen.'),
    PA(former(24, 24, [...[3, 6, 9, 12, 15, 18, 21].map((x, i) => strå(12, 21, x, 2, i % 2 ? 'g' : 'h')), [rakt(9, 13, 15, 15), 's'], [rakt(6, 21, 18, 23), 'f']]), 'Tre knippen lutade mot varandra till en liten skyl, som på fältet.'),
    PA(former(24, 16, [[(x, y) => { const m = 8 + Math.sin(x / 2.5) * 2; return Math.abs(y - m) < 3.5 && x > 2 && x < 22; }, (x, y) => (fx(y) + fx(x / 3)) % 3 === 0 ? 'y' : (fx(y) % 2 ? 'x' : 'h')], [rakt(11, 3, 13, 13), 's']]), 'Den färdigberedda fibern: en ljus, mjuk tott, vriden och bunden på mitten.'),
  ];
  const LINTYG = [
    PA(former(24, 13, [[rakt(1, 2, 23, 5), (x, y) => fx(y) === 2 ? 'y' : 'x'], [rakt(1, 5, 23, 8), (x, y) => fx(y) === 5 ? 'x' : 'w'], [rakt(1, 8, 23, 12), (x, y) => fx(y) === 8 ? 'y' : (fx(x) + fx(y)) % 2 ? 'x' : 'w']]), 'Tre tunna lager tyg i en platt trave, med väven synlig på det översta.'),
    PA(former(13, 24, [[rakt(1, 1, 12, 23), (x, y) => x < 3 ? 'y' : x > 10 ? 'v' : (fx(y) % 2 ? 'x' : 'w')], [rakt(1, 10, 12, 12), 's'], [ell(6.5, 2, 5.5, 1.5), 'y'], [ell(6.5, 2, 2.5, 0.8), 'w']]), 'En rulle som står på högkant, bunden med ett rep på mitten.'),
    PA(former(26, 22, [[rakt(1, 2, 25, 4), 'c'], [poly([[4, 4], [22, 4], [22, 19], [18, 21], [13, 18], [8, 21], [4, 19]]), (x, y) => (fx(x / 2) + fx(y / 2)) % 2 ? 'x' : 'y']]), 'Ett tyg som hänger över en stång, med fransad nederkant.'),
  ];
  function PA(rader, text) { const m = 4, w = bredd(rader) + m * 2, h = rader.length + m * 2; return { text, w, h, rita: B => { gras(B); sp(B, rader, m, m); } }; }
  const texter = (t, f, w, h) => t.map((x, i) => ST(x, w, h, f[i]));
  VAL.push(
    KORT('f7_stenhuggarplats', 'Stenhuggarplatsen', 'Steg 7.5.1: platsen där man hugger sten. Nu fyra gånger tre rutor i stället för tre gånger två. Din kommentar förra gången: "Gör den större".', texter(['Ett stort runt huggblock med ett block på, en stubbe att sitta på och råa stenar.', 'En lång sten på en kraftig träbock; råa stenar till vänster och färdiga block staplade till höger.', 'En stor flat häll med ett block, en mejsel och en slagsten; en stock och stenar bakom.'], HUGG, 64, 48)),
    KORT('f7_klyvplats', 'Klyvplatsen', 'Steg 7.5.1: platsen där en stock klyvs till plankor. Tre helt nya versioner, tre gånger två rutor. Du sa nej till alla tre förra gången, utan kommentar.', texter(['En lång stock på två kryss med en spricka längs ovansidan och två kilar; klubban på marken.', 'En tjock stock kluven i två halvor med en kil kvar, och plankorna staplade bredvid.', 'En hög med kluvna plankor bakom en hel stock, och tre kilar på rad.'], KLYV, 48, 32)),
    KORT('f7_ortkok', 'Örtköket', 'Steg 7.6.1: stationen där örter kokas. Nu fyra gånger tre rutor. Din kommentar förra gången: "Gör stationen större".', texter(['Elden i en stenring med en lerkruka, och en bänk med knippen av örter och en kruka till.', 'En bred stenhärd med elden i öppningen och krukan ovanpå, och en bänk med örter.', 'En trefot över elden med krukan hängande, och ett torkställ med örter.'], ORT, 64, 48)),
    KORT('f7_fangstbank', 'Fångstbänken', 'Steg 7.4.1: arbetsbänken där byn gör fällor och mjärdar. Din kommentar förra gången: "Gör den 3x2 rutor". Nu tre rutor bred och två djup.', texter(['En låg bänk på fyra grenar, med en halvflätad mjärde och en bunt vidjor.', 'En bänk med en ställning bak där färdiga snaror hänger.', 'En kluven stock på två kryss, med en bur som byggs och en kniv.'], BANK, 56, 40)),
    KORT('f7_harden', 'Härden', 'Steg 7.5.3: eldstaden inne i huset. Din kommentar förra gången: "Jag gillar formen på 2 men gör fler versioner". Alla tre är upphöjda med två varv block, som version 2.', texter(['Två varv små block och elden på toppen, med röken som slingrar sig upp.', 'Bredare med en stor låga och en flat tröskelsten framför.', 'Mörkare sten och aska på toppen, med en liten eld och glöd.'], HARD, 48, 48)),
    KORT('f7_snara', 'Snaran', 'Steg 7.5.10: snaran på en kaninstig. Din kommentar förra gången: "Gör så den inte sitter ihop med en böjd gren".', texter(['En ögla av rep bunden i en rak påle bredvid stigen.', 'En ögla som hänger från en slå mellan två pinnar, över stigen.', 'En ögla med repet bundet i en påle, och en sten som tyngd bredvid.'], SNAR, 64, 40)),
    KORT('f7_linfron', 'Linfrön', 'Steg 7.7.8: linfröna bredvid ärtfröna. Din kommentar förra gången: "Just nu ser den ut att vara större än ärtfröna". Nu ett frö per punkt.', texter(['Ett litet strö av fröna, en punkt var.', 'En liten skinnpung, inte större än ärtfröna.', 'En liten träskål.'], FRO, 40, 22)),
    KORT('f7_lin', 'Lin', 'Steg 7.7.8: linet som byn skördar. Din kommentar förra gången: "Gör tre helt nya versioner".', LIN),
    KORT('f7_lintyg', 'Lintyg', 'Steg 7.7.10: lintyget. Din kommentar förra gången: "Gör tre helt nya versioner".', LINTYG),
  );
})();
