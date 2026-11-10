// Björns svar på tre kort (efter c-stationer.js och f-halsa-tro.js): tre nya klyvplatser, örtkökets delar med örter som
// hänger i torkställningen, en enda härd och utan krukan, och tre nya gravstenar ritade utan förlaga.
// Varje kort byter ut kortet med samma id i VAL.
(() => {
  const { KORT, former, ell, linje, och, rakt, poly, lagg, gras, hash } = window.F7;
  const byt = kort => { const i = VAL.findIndex(s => s.id === kort.id); if (i >= 0) VAL[i] = kort; else VAL.push(kort); };

  const L = { o: 'kol0', a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3', e: 'senap0', f: 'senap1', g: 'senap2', h: 'senap3', r: 'rost0', s: 'rost1', t: 'rost2', u: 'rost3', v: 'ben0', w: 'ben1', x: 'ben2', y: 'ben3', K: 'kol1', l: 'kol2', m: 'kol3', Q: 'skiffer0', R: 'skiffer1', S: 'skiffer2', T: 'skiffer3', i: 'oliv0', j: 'oliv1', n: 'oliv2', p: 'oliv3', A: 'barr0', C: 'barr1', D: 'barr2', E: 'barr3' };
  const SK = 'QRST';
  const fx = Math.floor;
  const sp = (B, r, x, y, sk = true) => lagg(B, r, L, x, y, sk);
  const pt = (B, x, y, ch, lys) => { const v = L[ch]; B.satt(x, y, B.P.i(v.slice(0, -1), +v.slice(-1)), lys); };
  const flytt = (B, dx, dy) => ({ w: B.w, h: B.h, P: B.P, satt: (x, y, i, l) => B.satt(x + dx, y + dy, i, l), get: (x, y) => B.get(x + dx, y + dy), morka: (x, y) => B.morka(x + dx, y + dy) });
  const MED = rader => { const w = Math.max(...rader.map(r => r.length)); return former(w + 2, rader.length + 2, [[(x, y) => (rader[fx(y) - 1] || '')[fx(x) - 1] > '.', (x, y) => rader[fx(y) - 1][fx(x) - 1]]]); };
  // skuggan under en station: ett fält som gör marken ett steg mörkare, förskjutet åt höger
  const skuggaUnder = (B, x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) B.morka(x + 2 + i, y + j); };

  // ---------- delar som i c-stationer.js ----------
  const bankOvan = (w, d, ben = 5, s = 0, plank = 4) => former(w + 2, d + ben + 5, [
    [rakt(1, 1, w + 1, d + 1), (x, y) => {
      const i = fx(x) - 1, j = fx(y) - 1, p = fx(j / plank);
      if (j % plank === plank - 1 || (i + p * 13 + s * 5) % 23 === 0) return 'b';
      if (j === 0) return 'd';
      const r = hash(fx(x / 3), j, s); return r < 0.1 ? 'b' : r < (i < w * 0.3 ? 0.5 : 0.28) ? 'd' : 'c';
    }],
    [rakt(1, d + 1, w + 1, d + 4), (x, y) => fx(y) === d + 1 ? 'b' : 'a'],
    [och(rakt(3, d + 4, 6, d + 4 + ben), rakt(w - 4, d + 4, w - 1, d + 4 + ben)), x => fx(x) === 3 || fx(x) === w - 4 ? 'b' : 'a'],
  ]);
  const stallBank = (B, x, y, w, d, ben = 5, s = 0) => { skuggaUnder(B, x, y + d + 4, w, ben + 1); sp(B, bankOvan(w, d, ben, s), x, y, false); };
  const bankTvars = (w, d, ben = 5, s = 0, plank = 4) => former(w + 2, d + ben + 5, [
    [rakt(1, 1, w + 1, d + 1), (x, y) => {
      const i = fx(x) - 1, j = fx(y) - 1, p = fx(i / plank);
      if (i % plank === plank - 1 || (j + p * 11 + s * 5) % 19 === 0) return 'b';
      if (i === 0) return 'd';
      const r = hash(i, fx(y / 3), s); return r < 0.1 ? 'b' : r < (j < d * 0.3 ? 0.5 : 0.28) ? 'd' : 'c';
    }],
    [rakt(1, d + 1, w + 1, d + 4), (x, y) => fx(y) === d + 1 ? 'b' : 'a'],
    [och(rakt(2, d + 4, 4, d + 4 + ben), rakt(w - 2, d + 4, w, d + 4 + ben)), x => fx(x) === 2 || fx(x) === w - 2 ? 'b' : 'a'],
  ]);
  const stallTvars = (B, x, y, w, d, ben = 5, s = 0) => { skuggaUnder(B, x, y + 3, w, d + ben + 3); sp(B, bankTvars(w, d, ben, s), x, y, false); };
  const rundOvan = (w, h, f = 2, R = SK, s = 0) => { const cx = 1 + w / 2, cy = 1 + h / 2, rx = w / 2, ry = h / 2; return former(w + 2, h + f + 2, [
    [och(ell(cx, cy, rx, ry), ell(cx, cy + f, rx, ry), rakt(1, cy, w + 1, cy + f)), (x, y) => {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) { const u = (x - 1) / w * 0.6 + (y - 1) / h; if (hash(fx(x), fx(y), s) < 0.07) return R[1]; return u < 0.55 ? R[3] : R[2]; }
      return x > cx + rx * 0.35 ? R[0] : R[1];
    }],
  ]); };
  const stockOvan = (w, d) => former(w + 2, d + 2, [
    [rakt(1, 1, w, d + 1), (x, y) => { const j = (fx(y) - 1) / d; if (j < 0.12) return 'c'; if (j < 0.3) return hash(fx(x / 2), fx(y), 3) < 0.2 ? 'c' : 'd'; if (j < 0.75) return (fx(x) * 3 + fx(y)) % 11 === 0 ? 'b' : 'c'; return j < 0.9 ? 'b' : 'a'; }],
    [ell(w - 0.5, 1 + d / 2, 2.2, d / 2), (x, y) => { const e = Math.hypot((x - w + 0.5) / 2.2, (y - 1 - d / 2) / (d / 2)); return e > 0.8 ? 'w' : fx(e * 4) % 2 ? 'x' : 'y'; }],
  ]);
  const skalOvan = (w, h, inne, ton2) => { const cx = 1 + w / 2, cy = 1 + h / 2; return former(w + 2, h + 3, [
    [och(ell(cx, cy, w / 2, h / 2), ell(cx, cy + 1, w / 2, h / 2)), (x, y) => ((x - cx) / (w / 2)) ** 2 + ((y - cy) / (h / 2)) ** 2 <= 1 ? 'd' : 'b'],
    [ell(cx, cy, w / 2 - 1.2, h / 2 - 1), (x, y) => hash(fx(x), fx(y), 4) < 0.35 ? ton2 : inne],
  ]); };
  const MORTEL_OVAN = former(12, 11, [
    [och(ell(6, 5, 5, 3.6), ell(6, 6.5, 5, 3.6)), (x, y) => ((x - 6) / 5) ** 2 + ((y - 5) / 3.6) ** 2 <= 1 ? (x + y < 9 ? 'T' : 'S') : x > 8 ? 'Q' : 'R'],
    [ell(6, 5, 3, 2), (x, y) => y < 4.5 ? 'K' : 'l'],
    [linje([[5, 5], [10.5, 1.5]], 0.7), (x, y) => y < 3 ? 'y' : 'w'],
  ]);
  const laga = (B, x, y, hojd = 5) => {
    for (let i = 0; i < hojd; i++) {
      const [ramp, ton] = i === 0 ? ['ben', 3] : i < hojd - 2 ? ['senap', 3 - (i > 2)] : ['rost', 2];
      B.satt(x, y - i, B.P.i(ramp, ton), true);
      if (i > 0 && i < hojd - 2) B.satt(x + (i % 2 ? -1 : 1), y - i, B.P.i('senap', 2), true);
    }
  };
  const anga = (B, x, y, s) => { for (let i = 0; i < 6; i++) if (hash(i, s, 5) > 0.3) B.satt(x + Math.round(Math.sin(i / 1.6 + s)), y - i, B.P.i('ben', i < 3 ? 2 : 1)); };
  const glod = (B, inne, x0, y0, w, h, s) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { if (!inne(x + 0.5, y + 0.5)) continue; const r = hash(x, y, s); B.satt(x, y, r < 0.35 ? B.P.i('kol', 2) : r < 0.5 ? B.P.i('kol', 3) : r < 0.75 ? B.P.i('rost', 1) : r < 0.92 ? B.P.i('rost', 2) : B.P.i('senap', 3), r >= 0.5); } };
  const KRUKA = MED(['.uuuu.', '.rrrr.', '.tsss.', 'ttssss', 'ttsssr', 'tssssr', '.ssrr.']);
  const ram = (w, h) => former(w + 2, h + 2, [[och(rakt(2, 2, 4, h + 1), rakt(w - 2, 2, w, h + 1)), (x) => fx(x) % 2 ? 'b' : 'c'], [rakt(1, 2, w + 1, 4), (x, y) => y < 3 ? 'd' : 'c']]);
  const KIL = former(6, 8, [[rakt(1, 1, 5, 4), (x, y) => y < 2 ? 'y' : x < 3 ? 'x' : 'w'], [rakt(1.5, 4, 4.5, 7), 'w']]);
  const KIL_LIGG = former(9, 5, [[poly([[1, 1], [6, 1.5], [8.5, 2.5], [6, 3.5], [1, 4]]), (x, y) => y < 2.5 ? 'y' : 'w']]);
  const spanen = (B, x0, y0, w, h, s, n = 14) => { for (let i = 0; i < n; i++) { const x = x0 + fx(hash(i, s, 1) * w), y = y0 + fx(hash(i, s, 2) * h); pt(B, x, y, hash(i, s, 3) < 0.5 ? 'y' : 'x'); if (hash(i, s, 4) < 0.5) pt(B, x + 1, y, 'w'); } };
  const planka = (w, d) => former(w + 2, d + 4, [[rakt(1, 1, w + 1, d + 3), (x, y) => { const j = fx(y) - 1; if (j >= d) return j === d ? 'c' : 'a'; return j === 0 ? 'y' : (fx(x) * 5 + j) % 13 === 0 ? 'w' : 'x'; }]]);
  const halva = (w, d, s) => former(w + 2, d + 4, [
    [rakt(1, 1, w, d + 3), (x, y) => { const j = fx(y) - 1; if (j === 0) return 'b'; if (j >= d) return j === d ? 'b' : 'a'; return (j + fx(x / 9) + s) % 4 === 0 ? 'w' : hash(fx(x / 3), j, s) < 0.2 ? 'x' : 'y'; }],
    [ell(w - 0.4, 1 + d / 2, 1.6, d / 2 + 0.5), (x, y) => Math.abs(y - 1 - d / 2) < 1 ? 'x' : 'w'],
  ]);

  // ---------- 1. klyvplatsen: tre nya ----------
  // Platsen är tre gånger två rutor (48 × 32 punkter). Den står på en trampad fläck av jord med flis, i gräset runt om.
  // trampad jord: en rundad fläck med ojämn kant där gräset växer in, och lite flis och bark
  const tramp = (B, x0, y0, w, h, s) => {
    const cx = x0 + w / 2, cy = y0 + h / 2;
    for (let y = y0 - 2; y < y0 + h + 2; y++) for (let x = x0 - 2; x < x0 + w + 2; x++) {
      const d = ((x + 0.5 - cx) / (w / 2)) ** 4 + ((y + 0.5 - cy) / (h / 2)) ** 4;
      if (d > 1.1 || hash(x, y, 70 + s) > 0.9 - d * 0.6) continue; // tätare jord i mitten, gräset växer in mot kanten
      const r = hash(x, y, 71 + s);
      B.satt(x, y, B.P.i('jord', r < 0.25 ? 1 : 2));
    }
  };
  const flis = (B, x0, y0, w, h, s, n = 20) => { for (let i = 0; i < n; i++) { const x = x0 + fx(hash(i, s, 11) * w), y = y0 + fx(hash(i, s, 12) * h), r = hash(i, s, 13); pt(B, x, y, r < 0.4 ? 'y' : r < 0.75 ? 'x' : 'b'); if (r < 0.3) pt(B, x + 1, y, 'w'); if (r > 0.85) pt(B, x, y + 1, 'a'); } };
  // en påle snett ovanifrån: det sågade toppsnittet ljust och stolpen nedåt
  const pale = (h) => former(5, h + 2, [[rakt(1, 1, 4, h + 1), (x, y) => fx(y) <= 2 ? (fx(y) === 1 ? 'd' : 'c') : fx(x) === 1 ? 'c' : fx(x) === 3 ? 'a' : 'b']]);
  // en bock: två störar i kryss sedda framifrån och lite ovanifrån; stocken vilar i klykan
  const bock = (B, x, y0, y1) => {
    const ben = (a, b, ljus) => former(14, y1 - y0 + 3, [[linje([a, b], 1.3), (x2, y) => fx(x2 + y) % 5 === 0 ? 'a' : ljus]]);
    sp(B, ben([3, 1.5], [11, y1 - y0 + 1], 'b'), x - 7, y0, false);
    sp(B, ben([11, 1.5], [3, y1 - y0 + 1], 'c'), x - 7, y0, false);
    for (const dx of [-4, 4]) { pt(B, x + dx, y0 + 1, 'd'); B.morka(x + dx + 1, y1 + 2); B.morka(x + dx + 2, y1 + 2); }
  };
  // sprickan längs ovansidan av en stock: mörk med en ljus kant av rått trä
  const spricka = (B, x0, x1, y, s, bred = () => 1) => { for (let x = x0; x < x1; x++) { const yy = y + (hash(fx(x / 4), 0, s) < 0.3 ? 1 : 0), b = bred(x); pt(B, x, yy - 1, 'y'); for (let k = 0; k < b; k++) pt(B, x, yy + k, k === b - 1 ? 'K' : 'a'); } };
  // en stock som är halvkluven: vänstra delen hel, den högra kluven i två halvor som gapar isär runt en kil
  // (x0, y0): övre vänstra hörnet; w hela längden, d stockens tjocklek ovanifrån, k där klyvningen börjar, g hur mycket den gapar
  const halvkluven = (w, d, k, g) => {
    const mitt = 1 + d / 2;
    const t = x => Math.max(0, (x - 1 - k) / (w - k)); // 0 vid kilen, 1 vid änden
    const bakOvre = x => 1 - t(x) * g, bakNedre = x => mitt - t(x) * g; // bakre halvan
    const framOvre = x => mitt + t(x) * g, framNedre = x => 1 + d + t(x) * g; // främre halvan
    const W = w + 4, H = d + 2 * g + 4, oy = g + 1;
    return former(W, H, [
      // gapet mellan halvorna: den bakre halvans klyvyta syns, ljus, och skuggan längst ner
      [(x, y) => x > 1 + k && x < w + 1 && y - oy > bakNedre(x) - 0.5 && y - oy < framOvre(x) + 0.5, (x, y) => { const u = (y - oy - bakNedre(x)) / (framOvre(x) - bakNedre(x) + 0.01); const yy = y - oy - bakNedre(x); return yy < 1.5 ? (hash(fx(x / 3), 1, 5) < 0.3 ? 'x' : 'y') : u < 0.7 ? 'a' : 'K'; }],
      // den hela delen och de två halvorna, barken med ljus ovansida och mörk underkant
      [(x, y) => x >= 1 && x < w + 1 && ((x <= 1 + k && y - oy >= 1 && y - oy < 1 + d) || (y - oy >= bakOvre(x) && y - oy < bakNedre(x)) || (y - oy >= framOvre(x) && y - oy < framNedre(x))), (x, y) => {
        let top, bot;
        if (x <= 1 + k) { top = 1; bot = 1 + d; } else if (y - oy < bakNedre(x) + 0.01) { top = bakOvre(x); bot = bakNedre(x); } else { top = framOvre(x); bot = framNedre(x); }
        const j = (y - oy - top) / (bot - top), hel = x <= 1 + k;
        if (hel) { if (j < 0.12) return 'c'; if (j < 0.3) return hash(fx(x / 2), fx(y), 3) < 0.2 ? 'c' : 'd'; if (j < 0.75) return (fx(x) * 3 + fx(y)) % 11 === 0 ? 'b' : 'c'; return j < 0.9 ? 'b' : 'a'; }
        if (top < mitt - t(x) * g - 0.01 + 0.02 && y - oy < bakNedre(x)) return j < 0.25 ? 'c' : j < 0.6 ? 'd' : 'c'; // bakre halvan: barken ovanifrån
        return j < 0.15 ? 'w' : j < 0.4 ? 'd' : j < 0.75 ? 'c' : j < 0.9 ? 'b' : 'a'; // främre halvan: klyvkanten överst
      }],
      // ändarna: halvmånar av ändträ
      [(x, y) => x > w - 0.6 && x < w + 1 && ((y - oy >= bakOvre(x) && y - oy < bakNedre(x)) || (y - oy >= framOvre(x) && y - oy < framNedre(x))), (x, y) => (fx(x) + fx(y)) % 3 === 0 ? 'w' : 'x'],
    ]);
  };
  const KLYV3 = [
    B => { // stocken på två bockar i kryss, med en spricka längs ovansidan och tre kilar i den; flis och en planka på marken
      tramp(B, 0, 2, 48, 30, 1);
      const x0 = 2, y0 = 9, w = 42, d = 9;
      skuggaUnder(B, 4, 24, 40, 3);
      for (const bx of [11, 35]) bock(B, bx, 3, 26);
      sp(B, stockOvan(w, d), x0, y0, false);
      spricka(B, x0 + 6, x0 + w - 1, y0 + 4, 21, x => x > x0 + 24 ? 2 : 1);
      for (const x of [x0 + 12, x0 + 22, x0 + 32]) sp(B, KIL, x - 2, y0, false);
      sp(B, planka(26, 2), 2, 26, false); skuggaUnder(B, 2, 32, 26, 1);
      sp(B, KIL_LIGG, 34, 27, false);
      flis(B, 4, 20, 40, 10, 2);
    },
    B => { // stocken fastkilad mellan pålar i vänstra änden; den högra änden är halvkluven och gapar runt en stor kil; två plankor bredvid
      tramp(B, 0, 1, 48, 31, 2);
      const x0 = 1, y0 = 6, w = 42, d = 9, k = 18, g = 3;
      for (const x of [x0 + 3, x0 + 12]) sp(B, pale(9), x, y0 - 6, false); // pålarna bakom stocken
      skuggaUnder(B, x0 + 2, y0 + d + g + 2, w, 3);
      sp(B, halvkluven(w, d, k, g), x0, y0 - g - 1, false);
      sp(B, KIL, x0 + k + 1, y0 + 1, false); // den stora kilen i klykan
      sp(B, MED(['xy.', 'xyy', 'wxy', '.ww']), x0 + 7, y0 + 2, false); // en kil som håller stocken mot pålarna
      for (const x of [x0 + 3, x0 + 12]) { sp(B, pale(8), x, y0 + d - 3, false); B.morka(x + 4, y0 + d + 6); } // pålarna framför
      sp(B, planka(24, 2), 22, 22, false); sp(B, planka(24, 2), 20, 25, false); skuggaUnder(B, 20, 31, 24, 1);
      flis(B, 2, 22, 18, 9, 4, 14); flis(B, 26, 18, 20, 4, 5, 8);
    },
    B => { // en låg klyvbänk där en kluven halva hålls mellan pinnar; en kort stock med kilar som väntar, och plankor på strö
      tramp(B, 0, 1, 48, 31, 3);
      stallBank(B, 1, 3, 30, 9, 4, 6);
      for (const x of [3, 28]) { pt(B, x, 5, 'b'); pt(B, x, 6, 'a'); pt(B, x, 9, 'b'); pt(B, x, 10, 'a'); } // pinnarna i bänken
      sp(B, halva(22, 4, 2), 4, 5, false);
      skuggaUnder(B, 32, 12, 14, 2);
      sp(B, stockOvan(12, 8), 33, 4, false);
      spricka(B, 35, 45, 8, 9);
      sp(B, KIL, 38, 3, false);
      // plankstapeln: två strö tvärs och tre plankor på
      for (const x of [8, 34]) sp(B, former(4, 4, [[rakt(1, 1, 3, 3), 'b']]), x, 28, false);
      skuggaUnder(B, 4, 31, 38, 1);
      sp(B, planka(36, 2), 4, 25, false); sp(B, planka(35, 2), 6, 22, false); sp(B, planka(33, 2), 5, 19, false);
      flis(B, 32, 14, 14, 10, 6, 14);
    },
  ];
  const KLYVN = (text, f) => ({ text, w: 64, h: 44, rita: B => { gras(B); f(flytt(B, 8, 6)); } });
  byt(KORT('f7_klyvplats', 'Klyvplatsen', 'Steg 7.5.1: platsen där en stock klyvs till plankor, tre gånger två rutor, snett ovanifrån och utan klubban. Tre helt nya versioner, var och en på en trampad fläck med flis i gräset, så att du ser hur stor platsen är och hur det ser ut runt den. Du sa nej förra gången.', [
    KLYVN('Stocken vilar på två bockar i kryss. En spricka går längs ovansidan med tre kilar i, och en färdig planka och en kil ligger på marken.', KLYV3[0]),
    KLYVN('Stocken är fastkilad mellan pålar i ena änden. Den andra änden är halvkluven och gapar runt en stor kil, och två färdiga plankor ligger bredvid.', KLYV3[1]),
    KLYVN('En låg klyvbänk där en kluven halva hålls fast mellan pinnar, en kort stock med kilar som väntar, och en stapel plankor på strö.', KLYV3[2]),
  ]));

  // ---------- 2. örtkökets delar ----------
  // torkställningen med örtknippen som hänger i tvärslån (toppen ned), härden bara som den tredje i förra kortet, bänken som förut och ingen kruka
  // ett hängande knippe: stjälkarna knutna överst och bladen som hänger ned; tre sorter (gröna, gulnade, mörka)
  const KNIPPEN = [
    ['..b..', '.fbf.', '.gfg.', 'fghgf', 'ghggf', 'fgghg', 'ghgfg', '.fgf.', '.gfg.', '..f..'], // torkade, gula
    ['..b..', '.jbj.', '.jnj.', 'jnjnj', 'njnjn', 'yjtjy', 'tyyty', 'yttyy', '.yty.', '..y..'], // blommor, vita och röda
    ['..b..', '.CbC.', '.DCD.', 'CDEDC', 'DEDCD', 'CDDED', 'DEDCD', '.DED.', '.CDC.', '..D..'], // blågröna blad
].map(MED);
  // hängande knippen längs en slå: snöret och knippet under (x, y) = där snöret sitter
  const hang = (B, x, y, sort, snore) => { for (let k = 0; k < snore; k++) pt(B, x + 3, y + k, 'w'); sp(B, KNIPPEN[sort % 3], x, y + snore - 1, false); };
  const torkDel = (B, x, y, rikt) => { // (x, y): det övre vänstra hörnet av en ruta 36 bred
    const fram = rikt !== 2;
    const rad = () => [[x + 10, 1, 0], [x + 15, 3, 1], [x + 20, 1, 2]].forEach(([xx, s, so]) => hang(B, xx, y + 6, so + (rikt === 2 ? 1 : 0), s));
    if (rikt % 2 === 0) {
      if (!fram) rad();
      sp(B, ram(24, 22), x + 5, y + 2);
      if (fram) rad();
      return;
    }
    // ett kvarts varv: slån går mot dig, ovanifrån; knippena hänger längs den, de främre över de bakre
    const cx = x + 17, D = 16, H = 20, stolpe = former(4, H + 2, [[rakt(1, 1, 3, H + 1), x2 => fx(x2) === 1 ? 'c' : 'b']]);
    sp(B, stolpe, cx - 2, y, false); B.morka(cx + 1, y + H); B.morka(cx + 2, y + H);
    sp(B, former(5, D + 4, [[rakt(1, 1, 4, D + 3), x2 => fx(x2) === 1 ? 'd' : fx(x2) === 3 ? 'b' : 'c']]), cx - 2, y - 1, false); // slån ovanifrån
    for (let k = 0; k < 3; k++) hang(B, cx - 4 + (rikt === 1 ? 1 : -1) * (k % 2), y + 2 + k * 5, k + rikt, 2);
    sp(B, stolpe, cx - 2, y + D, true);
  };
  const hardDel = (B, x, y, rikt) => { // (x, y): eldens mitt på marken; som i förra kortet
    const [dx, dy] = [[0, 1], [-1, 0], [0, -1], [1, 0]][rikt];
    const lista = [];
    for (let k = 0; k < 8; k++) {
      const v = k / 8 * Math.PI * 2, gx = Math.cos(v), gy = Math.sin(v);
      if (gx * dx + gy * dy > 0.5) continue;
      lista.push({ y: y + gy * 4.5, f: () => sp(B, rundOvan(5, 3, 2, SK, k + 1), Math.round(x + gx * 8) - 3, Math.round(y + gy * 4.5) - 3) });
    }
    const eld = () => { glod(B, ell(x + 0.5, y + 0.5, 4.5, 2.6), x - 5, y - 3, 11, 7, 6 + rikt); laga(B, x - 1, y + 1, 4); laga(B, x + 2, y + 1, 3); pt(B, x, y + 1, 'h', true); };
    lista.push({ y: y + 0.1, f: eld });
    lista.sort((a, b) => a.y - b.y).forEach(o => o.f());
    const px = Math.round(x - dx * 4) - 4, py = Math.round(y - dy * 2.5) - 8;
    sp(B, KRUKA, px, py, false); anga(B, px + 3, py - 1, rikt + 2);
  };
  const bankDel = (B, x, y, rikt) => { // som i förra kortet (godkänd)
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
    for (let r = 0; r < 4; r++) torkDel(B, 4 + r * 38, 2, r);
    hardDel(B, 78, 52, 2);
    for (let r = 0; r < 4; r++) bankDel(B, 4 + r * 38, 64, r);
  };
  byt({ id: 'f7_ortkok', namn: 'Örtkökets delar', typ: 'janej', vad: 'Steg 7.6.1: örtköket i tre delar som ställs var för sig. Överst torkställningen åt fyra håll, nu med örtknippen som hänger i tvärslån. I mitten härden, bara en, den som stod tredje från vänster (den vrids inte). Underst bänken åt fyra håll, som förut. Krukan är borta. Din kommentar förra gången: ”översta torställningne ska ha örter som hänger i ställningen istället. elden kan inte roteras. använd den tredje från vänster. bordet är godkänt. ta bort krukan längst ner.”', versioner: [
    { text: 'Torkställningen åt fyra håll med hängande örter, härden och bänken åt fyra håll.', w: 156, h: 96, rita: ORTDELAR },
  ] });

  // ---------- 3. graven: tre nya gravstenar, ritade utan förlaga ----------
  // En sten som står i gräset på en ruta, snett ovanifrån: framsidan, ovankanten ljus där ljuset faller, högra sidan i skugga,
  // mörk kolkontur, skugga nedåt till höger och några grässtrån som växer upp vid foten.
  const tova = (B, x, y, s) => { for (let k = 0; k < 4; k++) { const xx = x + k * 2 - 3 + fx(hash(k, s, 1) * 2), h = 1 + fx(hash(k, s, 2) * 3); for (let j = 0; j < h; j++) pt(B, xx, y - j, j === h - 1 ? 'p' : 'n'); } };
  const skuggaSten = (B, x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w - j; i++) B.morka(x + i + j + 1, y + j); };
  const GRAVSTENAR = [
    { // en rest sten, avlång och rundad i toppen, lite lavfläckar
      text: 'En hög, rundad sten som står rest, slät och lite smalare upptill, med gula lavfläckar.',
      rita: B => {
        const sten = former(13, 18, [[och(ell(6.5, 6, 5, 5), poly([[1.5, 6], [11.5, 6], [12, 17], [1, 17]])), (x, y) => {
          const r = hash(fx(x), fx(y), 31);
          if (r < 0.05) return 'g';
          if (x > 9.6) return 'R'; // högra sidan i skugga
          if (y < 3.6 || (x < 3.2 && y < 14)) return 'T'; // ljuset uppe och till vänster
          return y > 15 ? 'R' : r < 0.12 ? 'T' : 'S';
        }]]);
        skuggaSten(B, 10, 26, 12, 3);
        tova(B, 8, 28, 1); tova(B, 23, 28, 2);
        sp(B, sten, 9, 10, false);
      },
    },
    { // en kantig, flat häll som står på högkant, med en ristad slinga längs kanten
      text: 'En kantig häll på högkant med sned topp, som en runsten, och en ristad slinga som följer kanten.',
      rita: B => {
        const kant = [[1.5, 17], [1, 6], [4, 2], [9, 1], [13, 3.5], [13.5, 17]];
        // slingan: ett band mellan två ristade linjer som går upp längs ena sidan, runt toppen och ned längs den andra
        const reg = k => och(ell(7.3, 8.5, 4.8 - k, 5.5 - k), rakt(2.5 + k, 8.5, 12.1 - k, 16.2));
        const linjer = (x, y) => (reg(0)(x, y) && !reg(0.9)(x, y)) || (reg(2.6)(x, y) && !reg(3.5)(x, y));
        const tecken = (x, y) => reg(0.9)(x, y) && !reg(2.6)(x, y) && (fx(x) * 7 + fx(y) * 3) % 5 === 0;
        const sten = former(15, 19, [
          [poly(kant), (x, y) => { if (x > 11.8) return 'R'; if ((y < 4.5 && x < 9) || x < 2.6) return 'T'; return y > 15.5 ? 'R' : 'S'; }],
          [linjer, 'Q'],
          [tecken, 'Q'],
        ]);
        skuggaSten(B, 10, 26, 13, 3);
        tova(B, 7, 28, 3); tova(B, 24, 28, 4);
        sp(B, sten, 8, 9, false);
      },
    },
    { // en låg, bred sten med ett ristat tecken: en ring med ett kors i
      text: 'En låg, bred sten med platt ovansida och ett ristat tecken på framsidan: en ring med ett kors i.',
      rita: B => {
        const sten = former(18, 13, [
          [och(ell(9, 4, 8, 3), poly([[1, 4], [17, 4], [17, 12], [1, 12]])), (x, y) => {
            if (((x - 9) / 8) ** 2 + ((y - 4) / 3) ** 2 <= 1 && y < 5.5) return x > 13 ? 'S' : 'T'; // ovansidan
            if (x > 15) return 'R'; return y > 10.6 ? 'R' : hash(fx(x), fx(y), 33) < 0.1 ? 'T' : 'S';
          }],
          [(x, y) => { const d = Math.hypot(x - 8.5, (y - 8.5) * 1.15); return (d > 1.9 && d < 3) || (d < 3 && (Math.abs(x - 8.5) < 0.5 || Math.abs(y - 8.5) < 0.5)); }, 'Q'],
        ]);
        skuggaSten(B, 9, 24, 17, 3);
        tova(B, 6, 26, 5); tova(B, 25, 26, 6);
        sp(B, sten, 7, 13, false);
      },
    },
  ];
  byt(KORT('f8_grav', 'Graven', 'Steg 8.5.1: graven är en ruta på gravplatsen, som 10.1.3 bygger vidare på. Tre helt nya gravstenar, ritade utan förlaga: var och en står i gräset på en ruta och är ungefär en ruta stor, snett ovanifrån i stenens grå toner. Din kommentar förra gången: ”gör tre helt nya versioner utan förlaga. Tre nya gravstenar helt enkelt”', GRAVSTENAR.map(V => ({ text: V.text, w: 32, h: 32, rita: B => { gras(B); V.rita(B); } }))));
})();
