// 7.7 kläderna, andra delen: linet (steg 7.7.8–7.7.11). Linfröna från handlaren, linet på fältet och skörden, sländan och
// tråden, vävstolen och lintyget, och tunikan och skjortan som sak och på en människa på kartan. Tre versioner av varje.
(() => {
  const { KORT, former, ell, linje, och, rakt, bredd, MED_KONTUR, lagg, bildfil, hash } = window.F7;
  const S = 'Steg ';
  // färgerna: bokstav till ramp och ton (0 mörkast, 3 ljusast); 'o' är konturen
  const L = {
    W: 'ben3', w: 'ben2', v: 'ben1', V: 'ben0', J: 'jord3', j: 'jord2', k: 'jord1', K: 'jord0',
    Y: 'senap3', y: 'senap2', t: 'senap1', T: 'senap0', G: 'oliv3', g: 'oliv2', h: 'oliv1', H: 'oliv0',
    A: 'skiffer3', a: 'skiffer2', b: 'skiffer1', B: 'skiffer0', R: 'rost3', r: 'rost2', q: 'rost1', Q: 'rost0',
    C: 'kol3', c: 'kol2', d: 'kol1',
  };
  const med = (extra) => ({ ...L, ...extra });
  const farg = (B, t) => B.P.i(t.slice(0, -1), +t.slice(-1));

  // ett rutnät att rita i: först det fasta (som får konturen), sedan det tunna (trådar, strån) utan kontur
  function natet(w, h) {
    let g = Array.from({ length: h }, () => Array(w).fill('.'));
    const N = {
      satt(x, y, c, barsTomt = false) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= w || y >= h) return; if (barsTomt && g[y][x] !== '.') return; g[y][x] = c; },
      fyll(x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) N.satt(x, y, typeof c === 'function' ? c(x, y) : c); },
      streck(ax, ay, bx, by, c, barsTomt = false) { const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) || 1; for (let i = 0; i <= n; i++) N.satt(ax + (bx - ax) * i / n, ay + (by - ay) * i / n, typeof c === 'function' ? c(i, n) : c, barsTomt); },
      kontur() { const ut = g.map(r => r.slice()); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx] && g[y + dy][x + dx] !== '.')) ut[y][x] = 'o'; g = ut; },
      rader() { return g.map(r => r.join('')); },
    };
    return N;
  }

  // flera bilder bredvid varandra med fötterna på samma rad: [rader, legend], { fil, w, h } (en godkänd bild) eller
  // { w, h, rita(B, x, y) }
  const RAD = (text, delar, m = 4, mellan = 5) => {
    const matt = delar.map(d => Array.isArray(d) ? [bredd(d[0]), d[0].length] : [d.w, d.h]);
    const w = matt.reduce((s, [a]) => s + a, 0) + mellan * (delar.length - 1) + m * 2, h = Math.max(...matt.map(([, b]) => b)) + m * 2 + 1;
    return { text, w, h, rita: B => { let x = m; delar.forEach((d, i) => { const [dw, dh] = matt[i], y = h - m - 1 - dh; if (Array.isArray(d)) lagg(B, d[0], d[1], x, y); else if (d.fil) bildfil(B, d.fil, x, y); else d.rita(B, x, y); x += dw + mellan; }); } };
  };
  const FIL = (fil, w, h) => ({ fil, w, h });

  // ---------- 7.7.8 linfröna ----------
  const FRO = { r: 'rost1', R: 'rost2', z: 'jord1', Z: 'jord0' };
  const linfron = [
    MED_KONTUR(['..rR..', '.rRzrR', 'rRzrRz', 'zzrRzZ']),
    MED_KONTUR(['..rRrR..', '.rRzrRz.', '.wvwvwv.', 'jJjjjjkk', 'jJjjjjjk', 'jjjjjjkk', '.kkkkkK.']),
    MED_KONTUR(['..rRzrR..', 'JjrRzrRjk', 'JjjjjjjkK', '.jjjjjkK.', '..KkkkK..']),
  ];

  // ---------- 7.7.8 linet på fältet ----------
  // en sådd jordruta som grodden i 5.5.5 (fårorna var fjärde rad), med linet i tre stadier: ungt, blommande och moget
  const RUTA = 16;
  function jordruta(B, x0, y0) { const jord = farg(B, 'jord1'), fara = farg(B, 'jord0'); for (let y = 0; y < RUTA; y++) for (let x = 0; x < RUTA; x++) B.satt(x0 + x, y0 + y, (y + 1) % 4 === 0 && x > 0 && x < 15 ? fara : jord); }
  // stadium 0 ungt, 1 blommar, 2 moget; v är versionen (hur plantorna ser ut)
  function linplantor(B, x0, y0, stadium, v) {
    const p = (x, y, t) => { if (x >= 0 && x < RUTA) B.satt(x0 + x, y0 + y, farg(B, t)); };
    const stam = stadium === 2 ? ['senap1', 'senap2'] : ['oliv1', 'oliv2'];
    for (const bas of [2, 6, 10, 14]) {
      if (v === 0) { // raka strån i rader, ett varannan punkt
        for (let x = 1; x < RUTA; x += 2) {
          const hj = stadium === 0 ? 2 + (hash(x, bas, 1) < 0.5 ? 0 : 1) : 5 + Math.floor(hash(x, bas, 2) * 2);
          for (let i = 0; i < hj; i++) p(x, bas - i, i === 0 ? stam[0] : stam[1]);
          if (stadium === 0) p(x + (hash(x, bas, 3) < 0.5 ? -1 : 1), bas - 1, 'oliv3');
          if (stadium > 0) p(x + ((x >> 1) % 2 ? 1 : -1), bas - 2, stadium === 2 ? 'senap2' : 'oliv3');
          if (stadium === 1) { if ((x + bas) % 4 === 1) { p(x, bas - hj, 'skiffer3'); p(x - 1, bas - hj, 'skiffer2'); p(x + 1, bas - hj, 'skiffer2'); p(x, bas - hj - 1, 'skiffer3'); } else p(x, bas - hj, 'oliv3'); }
          if (stadium === 2) { p(x, bas - hj, 'jord2'); p(x, bas - hj - 1, 'senap3'); }
        }
      } else if (v === 1) { // tuvor: tre strån som spretar ut från samma punkt
        for (const cx of [2, 7, 12].map(c => c + (bas % 8 === 2 ? 0 : 2))) {
          const hj = stadium === 0 ? 2 : 5;
          for (let i = 0; i < hj; i++) { p(cx, bas - i, i === 0 ? stam[0] : stam[1]); if (i > 0) { p(cx - 1 - (i > hj / 2 ? 1 : 0), bas - i + 1, stam[1]); p(cx + 1 + (i > hj / 2 ? 1 : 0), bas - i + 1, stam[0]); } }
          if (stadium === 0) { p(cx - 1, bas - 2, 'oliv3'); p(cx + 1, bas - 2, 'oliv2'); }
          if (stadium === 1) { for (const [dx, dy] of [[0, -hj], [-2, -hj + 1], [2, -hj + 1]]) { p(cx + dx, bas + dy, 'skiffer3'); p(cx + dx + 1, bas + dy, 'skiffer2'); } }
          if (stadium === 2) { for (const [dx, dy] of [[0, -hj], [-2, -hj + 1], [2, -hj + 1], [1, -hj - 1]]) { p(cx + dx, bas + dy, 'jord2'); } p(cx, bas - hj - 1, 'senap3'); }
        }
      } else { // tätt och vajande: varje punkt ett strå, olika höga och lutande åt samma håll
        for (let x = 0; x < RUTA; x++) {
          if (hash(x, bas, 7) < 0.25) continue;
          const hj = stadium === 0 ? 1 + Math.floor(hash(x, bas, 8) * 3) : 5 + Math.floor(hash(x, bas, 9) * 3), lut = stadium === 0 ? 0 : 1;
          for (let i = 0; i < hj; i++) p(x + (i >= hj - 2 ? lut : 0), bas - i, (x + i) % 3 === 0 ? stam[0] : stam[1]);
          const tx = x + lut, ty = bas - hj;
          if (stadium === 0 && hj > 1) p(x, bas - hj + 1, 'oliv3');
          if (stadium === 1 && hash(x, bas, 10) < 0.55) { p(tx, ty, 'skiffer3'); p(tx + 1, ty + 1, 'skiffer2'); }
          if (stadium === 2) { p(tx, ty, hash(x, bas, 11) < 0.5 ? 'jord2' : 'senap3'); if (hash(x, bas, 12) < 0.4) p(tx + 1, ty + 1, 'jord1'); }
        }
      }
    }
  }
  const LINFALT = (text, v) => ({ text, w: 3 * RUTA + 2 * 6 + 8, h: RUTA + 14, rita: B => {
    for (let s = 0; s < 3; s++) { const x0 = 4 + s * (RUTA + 6), y0 = 10; jordruta(B, x0, y0); linplantor(B, x0, y0, s, v); }
  } });

  // ---------- 7.7.8 linet, skörden: en kärve linstrån bunden med ett band ----------
  const KARVE_L = med({});
  const ROTAT = med({ Y: 'ben2', y: 'ben1', t: 'kol3', T: 'kol2' });
  const lin = [
    MED_KONTUR(['.....kj.......t.T.', 'yYyYyjkyYy..yYt.T.', 'YyYyYjkYyYyYyYyTtT', 'tytytjktytytyYyt.T', '.....kj.....ty.Tt.', '.............T....']),
    MED_KONTUR(['.t.Y.t.Y.', 'tYtYyYtYt', '.YyYtYyY.', '..yYyYy..', '..kjjjk..', '..yYyty..', '.yYyYtyt.', 'yYtYyYtyt', 'tTtTtTtTt']),
    MED_KONTUR(['...kj......kj.....', 'yYyjkYyYyYyjkYy.y.', 'YyYjkyYyYyYjkyYyYy', 'tytjktytytyjktyty.', '...kj......kj..t..']),
  ];

  // ---------- 7.7.9 sländan: en pinne med en tyngd (sländtrissan) och tråd lindad på ----------
  const slanda = [];
  { // 1: upprätt, trissan av sten under tråden
    const N = natet(7, 15);
    N.streck(3, 0, 3, 14, (i) => i === 0 ? 'k' : 'j'); N.satt(4, 1, 'k');
    N.fyll(2, 4, 4, 8, (x, y) => x === 2 ? 'W' : x === 3 ? (y % 2 ? 'w' : 'W') : 'v'); N.fyll(1, 5, 5, 7, (x, y) => x <= 2 ? 'W' : x === 5 ? 'v' : (y % 2 ? 'w' : 'W'));
    N.fyll(1, 10, 5, 10, (x) => x < 3 ? 'A' : 'a'); N.fyll(2, 11, 4, 11, 'b');
    N.kontur(); slanda.push(N.rader());
  }
  { // 2: liggande på snedden, trissan av ben och tråden som en tjock spole
    const N = natet(16, 9);
    N.streck(1, 7, 14, 1, 'j');
    for (let i = 0; i < 6; i++) { const cx = 5 + i, cy = 5 - i * 0.46; N.fyll(cx - 1, Math.round(cy) - 1, cx, Math.round(cy) + 1, (x, y) => y < cy - 0.4 ? 'W' : y > cy + 0.6 ? 'v' : (x + y) % 2 ? 'w' : 'W'); }
    N.fyll(2, 4, 3, 8, (x, y) => y === 4 ? 'W' : x === 2 ? 'W' : y === 8 ? 'V' : 'v'); N.satt(1, 5, 'W'); N.satt(1, 6, 'W'); N.satt(1, 7, 'w');
    N.kontur(); N.streck(14, 1, 15, 0, 'k'); slanda.push(N.rader());
  }
  { // 3: hängande i tråden, trissan av sten upptill och den spunna tråden under
    const N = natet(9, 17);
    N.streck(4, 4, 4, 16, (i) => i === 12 ? 'k' : 'j');
    N.fyll(2, 5, 6, 5, (x) => x < 4 ? 'C' : 'c'); N.fyll(3, 6, 5, 6, 'd');
    N.fyll(3, 8, 5, 12, (x, y) => x === 3 ? 'W' : x === 4 ? (y % 2 ? 'w' : 'W') : 'v'); N.fyll(2, 9, 6, 11, (x, y) => x <= 3 ? 'W' : x === 6 ? 'v' : (y % 2 ? 'W' : 'w'));
    N.kontur(); N.streck(4, 0, 4, 3, 'w'); N.satt(5, 0, 'w');
    slanda.push(N.rader());
  }

  // ---------- 7.7.9 tråden ----------
  const trad = [];
  { // 1: ett nystan med varven som syns
    trad.push(MED_KONTUR(['.WWwv.', 'WvWWwv', 'WWvwWv', 'wWwvwv', '.vwwv.']));
  }
  { // 2: en härva, en lång ögla som är vriden på mitten
    // vriden som ett rep, med en ögla i varje ände
    trad.push(MED_KONTUR(['.WW..........ww.', 'W..WWvWWvWWvWw.v', 'w..vWWvWWvWWvv.v', '.wv..........vv.']));
  }
  { // 3: tråden lindad på en platt pinne
    const N = natet(14, 6);
    N.fyll(1, 2, 12, 3, (x, y) => y === 2 ? 'J' : 'k'); N.satt(0, 2, 'j'); N.satt(13, 3, 'k');
    N.fyll(3, 1, 10, 4, (x, y) => y === 1 ? 'W' : y === 4 ? 'v' : x % 2 ? 'w' : 'W');
    N.kontur(); trad.push(N.rader());
  }

  // ---------- 7.7.10 vävstolen: 2 virke, 4 stenar som vävtyngder och 1 rep ----------
  // en stående varpvävstol: två stolpar och en bom överst; varptrådarna hänger från bommen ner till tyngderna, och
  // tyget vävs uppifrån och ner
  function vavstol(v) {
    const W0 = 32, H0 = 36, N = natet(W0, H0);
    const stolpe = (x, y0, y1) => N.fyll(x, y0, x + 1, y1, (xx, y) => xx === x ? 'j' : 'k');
    const tyg = (x0, y0, x1, y1, rand) => N.fyll(x0, y0, x1, y1, (x, y) => rand && (y === y0 + 2 || y === y0 + 3) ? (x % 2 ? 'q' : 'r') : y === y1 ? 'v' : y % 2 ? 'w' : (x % 4 === 1 ? 'w' : 'W'));
    const sten = (cx, cy) => { N.fyll(cx - 1, cy + 1, cx + 1, cy + 2, (x, y) => x === cx - 1 ? 'C' : x === cx + 1 || y === cy + 2 ? 'd' : 'c'); N.satt(cx, cy, 'C'); };
    let tygBot, tradBot, stenar, stavY;
    if (v === 0) { // rak ram, bommen vilar ovanpå stolparna, tyget en tredjedel ner
      stolpe(3, 2, 33); stolpe(27, 2, 33);
      N.fyll(1, 2, 30, 3, (x, y) => y === 2 ? 'J' : 'k');
      tygBot = 11; tyg(6, 4, 25, tygBot, false);
      stavY = 19; N.fyll(3, stavY, 28, stavY, 'j');
      stenar = [7, 12, 18, 23].map(x => [x, 28]); tradBot = 27;
    } else if (v === 1) { // stolparna med klykor upptill som bommen ligger i, och stolparna lutar
      stolpe(4, 3, 33); stolpe(26, 3, 33);
      N.satt(3, 0, 'j'); N.satt(6, 0, 'k'); N.satt(3, 1, 'j'); N.satt(6, 1, 'k'); N.satt(25, 0, 'j'); N.satt(28, 0, 'k'); N.satt(25, 1, 'j'); N.satt(28, 1, 'k');
      N.fyll(2, 2, 29, 3, (x, y) => y === 2 ? 'J' : 'k');
      tygBot = 16; tyg(7, 4, 24, tygBot, true);
      stavY = 22; N.fyll(1, stavY, 30, stavY, 'j'); N.satt(0, stavY, 'k');
      stenar = [8, 13, 18, 23].map((x, i) => [x, 28 + (i % 2)]); tradBot = 27;
    } else { // en bred, låg ram med en tvärslå nere, tyget randigt
      stolpe(2, 4, 33); stolpe(28, 4, 33);
      N.fyll(0, 4, 31, 5, (x, y) => y === 4 ? 'J' : 'k');
      N.fyll(2, 30, 29, 30, 'k');
      tygBot = 13; tyg(5, 6, 26, tygBot, false);
      for (let x = 5; x <= 26; x++) { N.satt(x, 9, x % 2 ? 'k' : 'j'); }
      stavY = 18; N.fyll(4, stavY, 27, stavY, 'j');
      stenar = [7, 12, 18, 23].map(x => [x, 25]); tradBot = 24;
    }
    for (const [cx, cy] of stenar) sten(cx, cy);
    N.kontur();
    // repet: surrningen där bommen möter stolparna
    const surr = v === 0 ? [[3, 4], [4, 4], [27, 4], [28, 4]] : v === 1 ? [[4, 4], [5, 4], [26, 4], [27, 4]] : [[2, 6], [3, 6], [28, 6], [29, 6]];
    for (const [x, y] of surr) N.satt(x, y, 'J');
    // varptrådarna: från tyget ner till sin sten, bakom staven
    const x0 = v === 0 ? 6 : v === 1 ? 7 : 5, x1 = v === 0 ? 25 : v === 1 ? 24 : 26;
    for (let x = x0; x <= x1; x += 2) {
      const [sx] = stenar.reduce((a, b) => Math.abs(b[0] - x) < Math.abs(a[0] - x) ? b : a);
      const sy = stenar.find(s => s[0] === sx)[1];
      N.streck(x, tygBot + 1, x, tradBot - 3, 'w', true);
      N.streck(x, tradBot - 2, sx + 0.5, sy - 1, 'v', true);
    }
    return N.rader();
  }
  const VAVSTOL = (text, v) => { const r = vavstol(v); return { text, w: bredd(r) + 8, h: r.length + 6, rita: B => { lagg(B, r, L, 4, 3, false); for (let x = 2; x < bredd(r) - 2; x++) if (x % 2 === 0) B.morka(4 + x, 3 + r.length - 1); } }; };

  // ---------- 7.7.10 lintyget ----------
  const lintyg = [
    MED_KONTUR(['.WWWWWWWw.', 'wwwwwwwwwv', 'WWWWWWWWwv', 'vvvvvvvvvV', 'WWwwwwwwvV', 'vvvvvvvvVV']),
    former(13, 7, [[rakt(4, 1, 12, 6), (x, y) => y < 2 ? 'W' : y >= 5 ? 'v' : (Math.floor(x) % 3 === 0 ? 'v' : 'w')], [ell(3.5, 3.5, 2.6, 2.6), (x, y) => { const r = Math.hypot(x - 3.5, y - 3.5); return r < 0.9 ? 'v' : r < 1.8 ? 'W' : 'w'; }]]),
    MED_KONTUR(['WWWWWWWW..', 'wwwwwwwvV.', 'WWWWWWvvVV', 'rqrqrqrqrq', 'WWWWWWWWWw', 'wwwwwwwwwv', 'vvvvvvvvvV']),
  ];

  // ---------- 7.7.11 tunikan och skjortan, som sak och på en människa på kartan ----------
  // figuren är en vuxen bybo framifrån (fröet 17, utan rock); plagget målas ovanpå, rad 7 och nedåt (axlarna)
  const FIGUR = (over, Lg) => ({ w: 14, h: 20, rita: (B, x0, y0) => {
    if (!window.BYBO) return;
    const F = window.BYBO(17, 'fram', 'sta', 'hanga', null);
    for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) { const c = F.px[y * F.w + x]; if (c >= 0) B.satt(x0 + x, y0 + y, c); }
    over.forEach((r, i) => [...r].forEach((ch, x) => { if (ch === '.') return; const t = ch === 'o' ? 'kol0' : Lg[ch]; if (t) B.satt(x0 + x, y0 + 7 + i, farg(B, t)); }));
    for (let x = 3; x < 11; x++) B.morka(x0 + x, y0 + 20);
  } });
  const GRA = med({ W: 'ben2', w: 'ben1', v: 'ben0' });
  const tunika = [
    [MED_KONTUR(['WWW...wwv', 'WWWW.wwwv', 'WWWWwwwvv', '.WWWwwwv.', '.kjjjjjk.', '.WWWwwwv.', '.WWwwwvv.', 'WWWwwwwvv', 'WWwwwwvvv']),
      ['..WWWW..wwwv..', '..WWWWW.wwwv..', '..W.WWWwwv.v..', '....WWWwwv....', '....kjjjjk....', '....WWwwwv....', '....WWwwwv....', '...WWWwwwvv...', '..oWWWwwwvvo..', '..oWwwwwvvvo..', '..oooooooooo..'], L],
    [MED_KONTUR(['..WWW.wwv..', '.WWWWWwwwv.', 'WWWWWWwwwvv', 'WW.WWWwwv.v', 'W..WWwwwv.v', 'W..WWwwwv.v', '...WWwwvv..', '..WWwwwvvv.', '..rrrrrqqq.']),
      ['..WWWW..wwwv..', '..WWWWWwwwvv..', '..W.WWWwwv.v..', '..W.WWWwwv.v..', '..W.WWwwwv.v..', '..W.WWwwwv.v..', '....WWwwwv....', '...WWWwwwvv...', '..oWWWwwwvvo..', '..orrrrrqqqo..', '..oooooooooo..'], L],
    [MED_KONTUR(['.WWW.wwv.', '.WWWwwwv.', '.WWWwwwv.', '.WWWwwwv.', '.WWWwvwv.', '.WWwwvwv.', '.WWwwwvv.', 'WWWwwwvvv', 'WWWwwwvvv', 'WW.wwwv.v']),
      ['...WWW..wwv...', '...WWWWwwwv...', '....WWWwwv....', '....WWWwwv....', '....WWwvwv....', '....WWwvwv....', '....WWwvwv....', '...WWWwvwvv...', '..oWWWwwwvvo..', '..oWWwwwvvvo..', '..ooWwwwvvoo..', '..oooooooooo..'], GRA],
  ];
  const skjorta = [
    [MED_KONTUR(['WWW..wwwv', 'WWWWkwwvv', '.WWWkwwv.', '.WWWwwwv.', '.WWWwwwv.', '.WWwwwvv.']),
      ['..WWWWk.wwwv..', '..WWWWWkwwwv..', '..W.WWWwwv.v..', '....WWWwwv....', '..............', '....WWwwwv....', '....WWwwwv....', '....Wwwwvv....'], L],
    [MED_KONTUR(['.WWW..wwv..', 'WWWWWwwwwvv', 'WW.WWwwwv.v', 'WW.WWwwwv.v', 'W..WWwwwv.v', '...WWwwvv..', '...vvvvvv..']),
      ['..WWWW..wwwv..', '..WWWWWwwwvv..', '..W.WWWwwv.v..', '..W.WWWwwv.v..', '..W.WWwwwv.v..', '..W.WWwwwv.v..', '....WWwwwv....', '....vvvvvv....'], L],
    [MED_KONTUR(['.WW.jj.wv.', 'WWWW..wwvv', 'WW.WjWwv.v', 'WW.WjWwv.v', 'W..WWwwv.v', '..WWwwwvv.', '..WWwwwvv.']),
      ['..WWWj.jwwv...', '..WWWWjwwwvv..', '..W.WWjwwv.v..', '..W.WWwwwv.v..', '..W.WWwwwv.v..', '..W.WWwwwv.v..', '...WWWwwwvv...', '...WWWwwvvv...'], GRA],
  ];
  const PLAGG = (text, [sak, over, Lg]) => RAD(text, [[sak, Lg], FIGUR(over, Lg)], 4, 6);

  VAL.push(
    KORT('f7_linfron', 'Linfrön', S + '7.7.8: linfröna, som byn köper av handlaren och sår på fältet som ärterna. Små, platta, bruna frön, mindre än ärtfröna. Bilden visar linfröna bredvid ärtfröna, som jämförelse.', [
      RAD('En liten hög av bruna frön.', [[linfron[0], med(FRO)], FIL('artfron', 5, 4)]),
      RAD('Fröna i en liten skinnpung med ett snöre runt öppningen.', [[linfron[1], med(FRO)], FIL('artfron', 5, 4)]),
      RAD('Fröna i en liten träskål.', [[linfron[2], med(FRO)], FIL('artfron', 5, 4)])]),
    KORT('f7_linfalt', 'Linet på fältet', S + '7.7.8: linet som byn sår på fältet som ärterna. Bilden visar en sådd jordruta i tre stadier: ungt och grönt, blommande med små blå blommor och moget och gulbrunt med frökapslar i topparna.', [
      LINFALT('Raka strån i rader, ett strå varannan punkt.', 0),
      LINFALT('Tuvor av tre strån som spretar ut från samma punkt.', 1),
      LINFALT('Tätt och vajande: strån som är olika höga och lutar åt samma håll.', 2)]),
    KORT('f7_lin', 'Lin', S + '7.7.8: linet som byn skördar på fältet, en kärve linstrån bunden med ett band. Av linet blir tråd (7.7.9). Bilden visar kärven bredvid torrgräset, som jämförelse.', [
      RAD('En liggande kärve med frökapslarna kvar i ena änden och ett band på mitten.', [[lin[0], KARVE_L], FIL('torrgras', 9, 5)]),
      RAD('En stående kärve, bunden på mitten och utbredd upptill och nertill.', [[lin[1], KARVE_L], FIL('torrgras', 9, 5)]),
      RAD('Rötat lin: grått och utan frökapslar, bundet på två ställen.', [[lin[2], ROTAT], FIL('torrgras', 9, 5)])]),
    KORT('f7_slanda', 'Sländan', S + '7.7.9: sländan, ett nytt redskap att spinna tråd av linet med: en pinne med en tyngd (sländtrissan) av sten eller ben, och den spunna tråden lindad på pinnen.', [
      PA_SAK('Upprätt, med trissan av sten under tråden.', slanda[0]),
      PA_SAK('Liggande på snedden, med trissan av ben och tråden som en tjock spole.', slanda[1]),
      PA_SAK('Hängande i tråden, med trissan av mörk sten upptill.', slanda[2])]),
    KORT('f7_trad', 'Tråd', S + '7.7.9: tråden, ett nytt material som spinns av linet med sländan och som vävstolen väver lintyg av. Bilden visar tråden bredvid repet, som jämförelse.', [
      RAD('Ett nystan, där varven syns.', [[trad[0], L], FIL('rep', 11, 6)]),
      RAD('En härva, en lång ögla som är vriden på mitten.', [[trad[1], L], FIL('rep', 11, 6)]),
      RAD('Tråden lindad på en platt pinne.', [[trad[2], L], FIL('rep', 11, 6)])]),
    KORT('f7_vavstol', 'Vävstolen', S + '7.7.10: vävstolen, en station av 2 virke, 4 stenar och 1 rep: två stolpar och en bom överst, surrade med repet. Varptrådarna hänger från bommen ner till stenarna, som håller dem sträckta, och tyget vävs uppifrån och ner. Staven på mitten skiljer trådarna åt.', [
      VAVSTOL('Rak ram där bommen vilar ovanpå stolparna, och tyget en tredjedel ner.', 0),
      VAVSTOL('Stolpar med klykor som bommen ligger i, och mer tyg med en rostbrun rand.', 1),
      VAVSTOL('En bred, låg ram med en tvärslå nere vid marken, och tyget med en mörk rand.', 2)]),
    KORT('f7_lintyg', 'Lintyg', S + '7.7.10: lintyget, ett nytt material som vävs på vävstolen av tråd. Av lintyg sys tunikan och skjortan (7.7.11). Bilden visar tyget bredvid repet, som jämförelse.', [
      RAD('Ett hopvikt tyg där vävens rader syns överst och lagren i kanten.', [[lintyg[0], L], FIL('rep', 11, 6)]),
      RAD('En rulle tyg, med varven i änden.', [[lintyg[1], L], FIL('rep', 11, 6)]),
      RAD('Ett hopvikt tyg med en rostbrun rand och ett hörn som vikts upp.', [[lintyg[2], L], FIL('rep', 11, 6)])]),
    KORT('f7_tunika', 'Tunikan', S + '7.7.11: tunikan, sydd av 3 lintyg: ett långt, ljust plagg för kroppen, på platsen yttre (där rocken sitter). Bilden visar den som sak och på en människa på kartan framifrån.', [
      PLAGG('Korta ärmar, en spetsig hals och ett band om livet; den når till knäna.', tunika[0]),
      PLAGG('Långa ärmar, en rund hals och en rostbrun bård nertill.', tunika[1]),
      PLAGG('Utan ärmar och längre, ner till vaderna, med sprund i sidorna, av grått, oblekt lin.', tunika[2])]),
    KORT('f7_skjorta', 'Skjortan', S + '7.7.11: skjortan, sydd av 2 lintyg: ett kortare och tunnare plagg än tunikan, på platsen inre (under rocken). Bilden visar den som sak och på en människa på kartan framifrån.', [
      PLAGG('Korta ärmar och en snörning i halsen; den når till höfterna.', skjorta[0]),
      PLAGG('Långa ärmar, en rund hals och en fåll som syns nertill.', skjorta[1]),
      PLAGG('Långa ärmar och en dragsko i halsen, av grått, oblekt lin.', skjorta[2])]),
  );
  function PA_SAK(text, rader) { return RAD(text, [[rader, L]]); }
})();
