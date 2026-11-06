// fas 6:s nya saker, djur och ljus (Björn 2026-11-04: "rita bilderna till fas 6"): tre versioner av varje i valdelen.
// Allt byggs av former som vargen i djur.js (ellipser, kilar och tjocka linjer, konturen läggs runt om efteråt), i
// paletten och 16 punkter per ruta. Styckdelen är en generell bild med bokstäver för pälsens toner, som får olika
// färger efter djuret (Björn 2026-11-04); fåglarna är en form med tre utseenden (steg 6.5.1.3).
(() => {
  // ---------- formerna ----------
  const ell = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const linje = (pts, r0, r1 = r0) => (x, y) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)), r = r0 + (r1 - r0) * (i + t) / (pts.length - 1);
      if ((x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2 <= r * r) return true;
    }
    return false;
  };
  const tri = (a, b, c) => (x, y) => { const s = (p, q) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]); const d1 = s(a, b), d2 = s(b, c), d3 = s(c, a); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
  const poly = pts => (x, y) => { let inne = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inne = !inne; } return inne; };
  const och = (...f) => (x, y) => f.some(g => g(x, y));
  const utan = (f, g) => (x, y) => f(x, y) && !g(x, y);
  const punkt = (px, py) => (x, y) => Math.floor(x) === px && Math.floor(y) === py;
  const rakt = (x0, y0, x1, y1) => (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
  // formerna i ordning (de senare ovanpå), med en ton eller en funktion som ger tonen; konturen 'o' runt allt
  function former(w, h, lista, kontur = true) {
    const g = Array.from({ length: h }, () => Array(w).fill('.'));
    for (const [inne, ton] of lista) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!inne(x + 0.5, y + 0.5)) continue;
      const c = typeof ton === 'function' ? ton(x + 0.5, y + 0.5) : ton; if (c) g[y][x] = c;
    }
    if (!kontur) return g.map(r => r.join(''));
    const ut = g.map(r => r.slice());
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx] && g[y + dy][x + dx] !== '.')) ut[y][x] = 'o';
    return ut.map(r => r.join(''));
  }
  const bredd = r => r.reduce((m, s) => Math.max(m, s.length), 0);

  // ---------- att rita på kortet ----------
  // en bild på marken: bilden mitt i, med en skugga under den nedersta raden
  // en färdig rad-bild får samma mörka kontur som allt som ritas med former
  const MED_KONTUR = rader => former(rader[0].length + 2, rader.length + 2, [[(x, y) => (rader[Math.floor(y) - 1] || '')[Math.floor(x) - 1] > '.', (x, y) => rader[Math.floor(y) - 1][Math.floor(x) - 1]]]).filter(r => /[^.]/.test(r));
  function lagg(B, rader, legend, x0, y0, skugga = true) {
    ritaSprite(B, rader, { o: 'kol0', ...legend }, x0, y0);
    if (!skugga) return;
    const sista = rader.length - 1;
    [...rader[sista]].forEach((c, x) => { if (c !== '.') { B.morka(x0 + x, y0 + sista + 1); } });
  }
  // en sak eller ett djur på marken, i ett kort som är bilden plus marginal
  const PA_MARK = (text, rader, legend, m = 4) => {
    const w = bredd(rader) + m * 2, h = rader.length + m * 2;
    return { text, w, h, rita: (B) => lagg(B, rader, legend, m, m) };
  };
  // samma bild flera gånger bredvid varandra med olika färger (fåglarna, styckdelen): legenderna i en lista
  const I_FARGER = (text, rader, legender, m = 4) => {
    const bw = bredd(rader), w = bw * legender.length + m * (legender.length + 1), h = rader.length + m * 2;
    return { text, w, h, rita: (B) => legender.forEach((l, i) => lagg(B, rader, l, m + i * (bw + m), m)) };
  };
  const KORT = (id, namn, vad, versioner, extra = {}) => ({ id, namn, typ: 'tre', vad, versioner, ...extra });
  const morkt = (B, cx, cy, r) => { // natten runt ljuset: allt utanför r mörkare, i två steg
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) { const d = Math.hypot(x - cx, y - cy) / r, n = Math.floor(d * 2 + ((x + y) % 2) * 0.5 + ((x * 3 + y) % 4) * 0.12) - 1; for (let i = 0; i < Math.min(4, n); i++) B.morka(x, y); }
  };
  function laga(B, x, y, hojd = 5) { // en liten låga med foten i (x, y): ljus kärna, gul mitt och röd spets
    for (let i = 0; i < hojd; i++) {
      const [ramp, ton] = i === 0 ? ['ben', 3] : i < hojd - 2 ? ['senap', 3 - (i > 2)] : ['rost', 2];
      B.satt(x, y - i, B.P.i(ramp, ton), true);
      if (i > 0 && i < hojd - 2) B.satt(x + (i % 2 ? -1 : 1), y - i, B.P.i('senap', 2), true);
    }
  }

  // ---------- 6.2.5 gångstråken i testläget ----------
  // en stuga uppe till vänster och elden nere till höger; stråket går från dörren ner och bort till elden (16 punkter per ruta)
  const STRAK_RUTOR = (() => { const r = []; for (let y = 1; y <= 5; y++) r.push([1, y]); for (let x = 2; x <= 5; x++) r.push([x, 5]); return r; })();
  function strak(B, v) {
    const P = B.P, T = 16, m = (i) => i * T + 8;
    ritaSprite(B, ['..oooo..', '.oSSSSo.', 'oSSSSSSo', 'oJjjjjJo', 'oJjkkjJo', 'oJjkkjJo', 'oooooooo'], { o: 'kol0', S: 'senap1', J: 'jord1', j: 'jord2', k: 'kol0' }, m(1) - 4, m(1) - 15);
    laga(B, m(6), m(5) + 3, 5);
    STRAK_RUTOR.forEach(([x, y], i) => {
      const nasta = STRAK_RUTOR[i + 1];
      if (!nasta) return;
      const [nx, ny] = nasta, x0 = m(x), y0 = m(y), dx = Math.sign(nx - x), dy = Math.sign(ny - y);
      for (let k = 0; k <= T; k++) {
        const px = x0 + dx * k, py = y0 + dy * k;
        if (v === 0) B.satt(px, py, P.i('senap', 2)); // tunn gul linje
        if (v === 1 && k % 3 < 2) B.satt(px, py, P.i('rost', 3)); // röda streck
        if (v === 2) { B.satt(px + dy, py + dx, P.i('ben', 2)); B.satt(px - dy, py - dx, P.i('ben', 2)); } // två ljusa kanter, som en väg
      }
    });
    // rutan framför dörren
    const [dx0, dy0] = STRAK_RUTOR[0];
    for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) {
      const kant = Math.abs(x) === 2 || Math.abs(y) === 2;
      if (v === 0 || v === 2 && kant) B.satt(m(dx0) + x, m(dy0) + y, P.i(v === 0 ? 'senap' : 'ben', v === 0 ? 2 : 3));
      if (v === 1 && kant && (x + y) % 2 === 0) B.satt(m(dx0) + x, m(dy0) + y, P.i('rost', 3));
    }
  }
  const STRAK = (text, v) => ({ text, w: 7 * 16, h: 7 * 16, rita: (B) => strak(B, v) });

  // ---------- 6.3.1.3 näver ----------
  const NAV_L = { W: 'ben3', w: 'ben2', k: 'kol1', s: 'senap2', S: 'senap1', r: 'rost2' };
  const NAVER = [
    former(11, 5, [[rakt(0, 0, 10, 5), (x, y) => (Math.floor(x) * 3 + Math.floor(y)) % 7 === 0 ? 'k' : y < 2 ? 'W' : 'w'], [ell(9.5, 2.5, 1.6, 2.5), 'S'], [ell(9.5, 2.5, 0.8, 1.2), 's']]).map(r => r),
    former(12, 5, [[linje([[1, 3.5], [5, 2], [9, 2.5], [11, 1]], 1.1, 0.8), (x, y) => (Math.floor(x) * 5) % 9 === 0 ? 'k' : y < 2.6 ? 'W' : 'w'], [linje([[9.5, 2.2], [11, 1]], 0.7), 's']]),
    former(11, 7, [[linje([[0.8, 5.4], [9.8, 5.4]], 1.1), (x, y) => Math.floor(x) % 4 === 1 ? 'k' : 'w'], [linje([[1.5, 3.4], [9.5, 3.2]], 1.0), (x, y) => Math.floor(x) % 5 === 2 ? 'k' : 'W'], [linje([[2.5, 1.4], [8.5, 1.6]], 0.9), (x, y) => x > 7.5 ? 's' : 'W']]),
  ];

  // ---------- 6.3.2.2 talg ----------
  const TALG_L = { W: 'ben3', w: 'ben2', v: 'ben1', y: 'senap3', r: 'rost3', j: 'jord1' };
  const TALG = [
    former(7, 5, [[ell(3.5, 2.8, 3.3, 2.3), (x, y) => x < 3 && y < 2.5 ? 'W' : x > 5 || y > 4 ? 'v' : 'w'], [punkt(2, 1), 'W']]),
    former(8, 5, [[rakt(0.5, 0.6, 7.5, 4.6), (x, y) => y < 1.6 ? 'W' : x > 6 ? 'v' : 'w'], [punkt(5, 2), 'y'], [punkt(2, 3), 'y']]),
    former(9, 6, [[ell(4.5, 3.6, 4.3, 2.2), 'j'], [ell(4.5, 3, 3.4, 1.7), (x, y) => x < 4 ? 'W' : 'w'], [punkt(6, 3), 'y']]),
  ];
  const TALG_TEXT = ['En rund klump stelnat fett, ljus på ovansidan och gulvit i skuggan.', 'Ett kantigt block talg med gula stänk, som skurits ur en större bit.', 'Talg som stelnat i en näverskål.'];

  // ---------- 6.3.2.3 facklan som sak ----------
  const FACK_L = { s: 'jord0', j: 'jord1', J: 'jord2', g: 'senap1', G: 'senap2', y: 'senap3', w: 'ben2', W: 'ben3', r: 'jord3', n: 'ben3', k: 'kol1' };
  // som den uppsatta facklan du valde (Björn 2026-11-04: "kolla på den uppsatta facklan och gör en liknande"): lång som
  // ett spjut, käppen kluven i toppen och tjärstickor i klykan, snörd under klykan. Som sak är den släckt
  const SKAFT = [(x, y) => Math.floor(x) + Math.floor(y) === 15 && Math.floor(x) <= 10, (x) => Math.floor(x) % 2 ? 'j' : 'J'];
  const KLYKA = (s, langd) => { // klykans två grenar och stickorna som sprider sig uppåt höger; s: hur mycket de sprider sig
    const lista = [[och(linje([[10.5, 4.5], [11.2, 2.4]], 0.45), linje([[10.5, 4.5], [12.6, 3.8]], 0.45)), 'J']];
    for (let i = -1; i <= 1; i++) lista.push([linje([[10.8, 4.2], [10.8 + langd + i * s * 0.6, 4.2 - langd + i * s]], 0.4), i === 0 ? 'k' : 's']);
    lista.push([punkt(10, 5), 'g']); return lista;
  };
  const FACKLA = [
    former(16, 16, [SKAFT, ...KLYKA(1.2, 3.6)]),
    former(16, 16, [SKAFT, ...KLYKA(2.0, 3.2)]),
    former(16, 16, [SKAFT, ...KLYKA(0.7, 4.2), [och(punkt(11, 3), punkt(12, 3)), 'g']]),
  ];
  const FACKLA_TEXT = ['Stickorna i en solfjäder, som på den uppsatta facklan.', 'Stickorna mer utspridda och kortare.', 'Stickorna tätt ihop och längre, snörda två gånger.'];

  // ---------- 6.3.2.4 uppsatta facklor, tända i mörkret ----------
  // tre nya utseenden på facklan (Björn 2026-11-04: "prova fler utseenden på facklor"), alla långa som ett spjut och
  // stuckna i marken: en kluven käpp med tjärstickor, en näverstrut och en tjock halmbunt med tre band
  function uppsatt(B, v) {
    const P = B.P, x = 24, fot = 40, topp = fot - 24, s = (xx, y, r, t, lys) => B.satt(xx, y, P.i(r, t), lys);
    for (let y = topp; y <= fot; y++) { s(x, y, 'jord', 1); s(x + 1, y, 'jord', 2); } // skaftet
    for (let dx = -2; dx <= 3; dx++) B.morka(x + dx, fot + 1);
    let lagaY;
    if (v === 0) { // käppen kluven i toppen, med en solfjäder av tjärstickor i klykan
      for (let i = 0; i < 4; i++) { s(x - 1 - (i >> 1), topp - i, 'jord', 1); s(x + 2 + (i >> 1), topp - i, 'jord', 2); }
      for (const dx of [-2, -1, 0, 1, 2, 3]) for (let i = 1; i < 5; i++) s(Math.round(x + 0.5 + (dx - 0.5) * (0.5 + i * 0.2)), topp - i, i > 2 ? 'rost' : 'jord', i > 2 ? 1 : 0); // stickorna sprider sig uppåt
      s(x, topp + 1, 'senap', 1); s(x + 1, topp + 1, 'senap', 1); // snörningen under klykan
      lagaY = topp - 5;
    } else if (v === 1) { // en strut av näver, vid upptill, med elden i
      for (let i = 0; i < 7; i++) { const b = 1 + (i >> 1); for (let dx = -b + 1; dx <= b; dx++) s(x + dx, topp - i + 2, 'ben', (dx + i) % 4 === 0 ? 1 : dx < 1 ? 3 : 2); }
      for (const dx of [-3, 4]) s(x + dx, topp - 4, 'kol', 1);
      lagaY = topp - 5;
      for (const [sx, sy] of [[-3, 0], [3, 0], [-2, -1], [2, -1], [4, 0], [-1, 0]]) { s(x + sx, fot + sy, 'skiffer', 2); s(x + sx + 1, fot + sy, 'skiffer', 1); } // stenar runt foten
    } else { // en tjock halmbunt, bunden med tre band
      for (let y = topp - 8; y <= topp + 1; y++) for (let dx = -2; dx <= 3; dx++) s(x + dx, y, 'senap', (y - topp + 8) % 3 === 2 ? 0 : dx < 1 ? 2 : 1);
      for (const y of [topp - 6, topp - 3, topp]) for (let dx = -2; dx <= 3; dx++) s(x + dx, y, 'jord', 2);
      lagaY = topp - 9;
    }
    laga(B, x - 1, lagaY + 1, 4); laga(B, x, lagaY, 7); laga(B, x + 1, lagaY, 6); laga(B, x + 2, lagaY + 1, 3);
    morkt(B, x, lagaY - 2, 15);
  }
  const UPPSATT = (text, v) => ({ text, w: 48, h: 44, rita: (B) => uppsatt(B, v) });

  // ---------- 6.3.2.5 talgljuset på ett bord ----------
  function ljus(B, v) {
    const P = B.P, x = 20, bord = 26;
    for (let y = bord; y < B.h; y++) for (let xx = 0; xx < B.w; xx++) B.satt(xx, y, P.i('jord', y === bord ? 3 : (xx % 13 === 0 ? 0 : 2)));
    for (let y = 0; y < bord; y++) for (let xx = 0; xx < B.w; xx++) B.satt(xx, y, P.i('jord', (y % 6 === 0) ? 0 : 1));
    const rad = (y, x0, x1, ramp, ton) => { for (let xx = x0; xx <= x1; xx++) B.satt(xx, y, P.i(ramp, typeof ton === 'function' ? ton(xx) : ton)); };
    if (v === 0) { // ett kort tjockt ljus på en flat sten
      rad(bord, x - 4, x + 4, 'skiffer', 1); rad(bord - 1, x - 3, x + 3, 'skiffer', 2);
      for (let y = bord - 7; y <= bord - 2; y++) rad(y, x - 2, x + 2, 'ben', xx => xx < x ? 3 : xx === x + 2 ? 1 : 2);
      B.satt(x - 2, bord - 6, P.i('ben', 3)); B.satt(x + 1, bord - 4, P.i('ben', 3)); // rinnande talg
      B.satt(x, bord - 8, P.i('kol', 0)); laga(B, x, bord - 9, 4);
    } else if (v === 1) { // ett smalt ljus i en lerskål
      rad(bord, x - 4, x + 4, 'rost', 0); rad(bord - 1, x - 5, x + 5, 'rost', 1); rad(bord - 2, x - 5, x + 5, 'rost', xx => xx < x ? 2 : 1);
      for (let y = bord - 10; y <= bord - 3; y++) rad(y, x - 1, x + 1, 'ben', xx => xx < x ? 3 : xx > x ? 1 : 2);
      B.satt(x, bord - 11, P.i('kol', 0)); laga(B, x, bord - 12, 5);
    } else { // en talglampa: en skål med smält talg och en veke på kanten
      rad(bord, x - 3, x + 3, 'skiffer', 0); rad(bord - 1, x - 5, x + 5, 'skiffer', 1); rad(bord - 2, x - 6, x + 6, 'skiffer', 2);
      rad(bord - 3, x - 5, x + 5, 'ben', xx => xx < x ? 3 : 2);
      B.satt(x + 5, bord - 4, P.i('kol', 0)); laga(B, x + 5, bord - 5, 4);
    }
    morkt(B, x, bord - 10, 12);
  }
  const LJUS = (text, v) => ({ text, w: 40, h: 32, rita: (B) => ljus(B, v) });

  // ---------- 6.4.1.3 och 6.4.1.4 buskarna ----------
  const BUSK_L = { d: 'barr1', m: 'oliv1', l: 'oliv2', L: 'oliv3', g: 'jord1', r: 'rost3', R: 'rost2', b: 'skiffer1', B: 'skiffer2' };
  function busk(v, bar, s = 1) {
    const w = Math.round(16 * s), h = Math.round(13 * s), c = w / 2;
    const ton = (x, y) => { const u = (y - 1) / (h - 2), sida = (x - c) / c; return u > 0.75 ? 'd' : u + sida * 0.35 > 0.55 ? 'm' : u + sida * 0.35 < 0.1 ? 'L' : 'l'; };
    let kropp;
    if (v === 0) kropp = och(ell(c, h * 0.58, c - 0.8, h * 0.42), ell(c - 3 * s, h * 0.45, 3.6 * s, 3.4 * s), ell(c + 3 * s, h * 0.4, 3.8 * s, 3.6 * s)); // rund och tät
    if (v === 1) kropp = och(ell(c - 3.5 * s, h * 0.5, 3.2 * s, 3.4 * s), ell(c + 2.5 * s, h * 0.35, 3.4 * s, 3 * s), ell(c + 4 * s, h * 0.7, 2.8 * s, 2.4 * s), ell(c - 1 * s, h * 0.78, 3.4 * s, 2 * s)); // gles med luckor
    if (v === 2) kropp = och(ell(c - 3.5 * s, h * 0.68, 4 * s, h * 0.3), ell(c + 3.5 * s, h * 0.7, 3.8 * s, h * 0.28), ell(c, h * 0.55, 3.2 * s, h * 0.32)); // låg och bred
    const lista = [];
    if (v === 1) lista.push([och(linje([[c, h - 0.5], [c - 3.5 * s, h * 0.45]], 0.5), linje([[c, h - 0.5], [c + 3 * s, h * 0.3]], 0.5), linje([[c, h - 0.5], [c + 4.2 * s, h * 0.72]], 0.45)), 'g']);
    lista.push([kropp, ton]);
    if (v === 1) lista.push([och(linje([[c, h - 0.5], [c - 2 * s, h * 0.62]], 0.45), linje([[c, h - 0.5], [c + 1.6 * s, h * 0.5]], 0.45)), 'g']);
    if (bar) { // bären i klungor om två eller tre, på ljussidan och i kanten
      const plats = [[0.3, 0.42], [0.62, 0.3], [0.75, 0.62], [0.42, 0.7], [0.2, 0.62], [0.55, 0.5]];
      plats.forEach(([fx, fy], i) => {
        const x = Math.floor(fx * w), y = Math.floor(fy * h), [m, l] = bar === 'lingon' || (bar === 'bada' && i % 2) ? ['R', 'r'] : ['b', 'B'];
        if (bar === 'bla0') { lista.push([punkt(x, y), 'T'], [punkt(x + 1, y), 'S'], [punkt(x, y + 1), 'R'], [punkt(x + 1, y + 1), 'Q']); return; } // ett stort bär: ljust uppe till vänster, mörkt nere till höger
        if (bar === 'bla1') { lista.push([punkt(x - 1, y), 'T'], [punkt(x, y), 'R'], [punkt(x + 1, y), 'T'], [punkt(x + 2, y), 'R'], [punkt(x, y + 1), 'T'], [punkt(x + 1, y + 1), 'Q']); return; } // en klase om tre, som saken
        if (bar === 'bla2') { lista.push([punkt(x, y), 'S'], [punkt(x + 2, y + 1), 'R'], [punkt(x - 1, y + 2), 'S'], [punkt(x + 1, y + 2), 'T']); return; } // många små bär, glest
        lista.push([och(punkt(x, y), punkt(x + 1, y + 1)), (xx) => xx < x + 0.9 ? l : m], [punkt(x - 1, y + 1), m]);
      });
    }
    return former(w, h, lista);
  }
  // bären i samma färger som saken bär (Björn 2026-11-04: "gör dem samma färg som bären är som item just nu"): blåbär
  // i skiffertoner, ljusa uppe till vänster och mörka nere till höger. Versionerna är hur bären sitter
  const BLA_L = { Q: 'skiffer0', R: 'skiffer1', S: 'skiffer2', T: 'skiffer3' };
  const BARSCEN = (text, i) => ({ text, w: 64, h: 32, rita: (B) => { const L = { ...BUSK_L, ...BLA_L }, b = 'bla' + i; lagg(B, busk(0, b, 1.25), L, 4, 6); lagg(B, busk(1, b, 0.85), L, 30, 12); lagg(B, busk(2, b, 1), L, 44, 4); } });
  const BUSKSCEN = (text, v, bar) => ({ text, w: 64, h: 32, rita: (B) => { lagg(B, busk(v, bar, 1.25), BUSK_L, 4, 6); lagg(B, busk(v, bar, 0.85), BUSK_L, 30, 12); lagg(B, busk(v, bar, 1), BUSK_L, 44, 4); } });

  // ---------- 6.5.1.1 styckdelen: en generell bild som får djurets färger ----------
  // d, m och l är pälsens mörka, mellersta och ljusa ton; köttet, fettet och benet är lika för alla djur
  const STYCK_FAST = { r: 'rost1', R: 'rost2', f: 'ben2', b: 'ben3', k: 'kol0', s: 'senap2' };
  const PALS6 = {
    radjur: { namn: 'rådjur', d: 'jord1', m: 'jord2', l: 'jord3' },
    varg: { namn: 'varg', d: 'skiffer1', m: 'skiffer2', l: 'skiffer3' },
    bjorn: { namn: 'björn', d: 'jord0', m: 'jord1', l: 'jord2' },
  };
  const styckL = k => ({ ...STYCK_FAST, ...PALS6[k] });
  const STYCK = [
    // ett lår: päls utanpå, kött och en benknota i den avskurna änden, och benet ner till klöven eller tassen
    former(14, 9, [[linje([[3, 6.5], [9, 6.8], [12.5, 7.6]], 1.0, 0.8), (x) => x > 12 ? 'k' : 'm'], [ell(5, 4.2, 4.6, 3.8), (x, y) => y < 2.4 ? 'd' : y > 6 ? 'l' : 'm'], [ell(1.6, 4.3, 1.3, 3.2), (x, y) => y < 3 ? 'R' : 'r'], [punkt(1, 4), 'b']]),
    // en hög: ett lår och en bit revben med skinnet kvar
    former(15, 9, [[ell(10.5, 6.2, 4.2, 2.6), (x, y) => y < 5 ? 'd' : 'm'], [och(linje([[8, 5.5], [8, 8]], 0.4), linje([[10, 5], [10, 8.2]], 0.4), linje([[12, 5], [12, 8]], 0.4)), 'f'], [ell(4.6, 4.6, 4.2, 3.6), (x, y) => y < 2.8 ? 'd' : y > 6.6 ? 'l' : 'm'], [ell(1.2, 4.6, 1.0, 2.6), 'r'], [punkt(1, 4), 'b']]),
    // ett bylte: köttet inlindat i en bit av skinnet och knutet med rep
    former(13, 9, [[ell(6.5, 4.8, 6, 4), (x, y) => y < 2.6 ? 'd' : y > 7 ? 'd' : x < 4 ? 'l' : 'm'], [ell(10.6, 3.2, 1.6, 1.4), 'r'], [linje([[6.5, 0.8], [6.5, 8.6]], 0.55), 's'], [punkt(6, 0), 's']]),
  ];
  const STYCK_TEXT = ['Ett lår med pälsen utanpå och köttet och benknotan i den avskurna änden.', 'En liten hög: ett lår och en bit revben med skinnet kvar.', 'Ett bylte: köttet inlindat i en bit av skinnet och knutet med rep.'];

  // ---------- 6.5.1.2 rådjuret ----------
  const RAD_L = { d: 'jord1', m: 'jord2', l: 'jord3', c: 'ben3', k: 'kol0', h: 'ben1' };
  // v är läget (0 står, 1 betar, 2 bock med horn); tjock gör kroppen kraftigare och ben längre benen
  // tre utseenden av rådjuret (Björn 2026-11-04: "olika versioner av djuret, inte olika animationsframes"): alla står
  // med huvudet högt. Sommarpälsen är rödbrun, vinterpälsen gråbrun och tjockare, och bocken har horn och längre ben
  // rådjuret efter Björns förebild (2026-11-04, en bild av två hjortar i pixelstil): formen ur förebilden, nerskalad
  // till vår täthet och i vår palett. Bocken är spegelvänd så att båda går åt höger. m: pälsen, s: skuggan, d: den djupa
  // skuggan, b: de bortre benen, c: halsen och buken, v: den vita svansen och hornen, p och P: örat, k: ögat, nosen och klövarna
  const RAD_KO = [
    '..............mm........',
    '...............ps.dd....',
    '...............vPsmm....',
    '................mssmmm..',
    '................msskssmk',
    '................msssssss',
    '................msssddd.',
    '................sssc....',
    '...............msssc....',
    '...mmmmmmmmmmmmmsssc....',
    '.mmmmmmmmmmmmmmmmssd....',
    'msmmmmmmmmmmmmmmmssd....',
    'scmmmmmssmmmmmmmmssd....',
    'scsmmmmsssmmmsmmmss.....',
    'svssmmmsdssssmmmsss.....',
    'sv.smmssddssdmssssd.....',
    '..mmmssdcccddmsssd......',
    '.mmsssdbb...mmsbb.......',
    '.msssdbb.....ssbb.......',
    '.msdbb.......ssbb.......',
    '.ms.b........ssbb.......',
    '.ms.b........ms.b.......',
    '.ms.b........ms.b.......',
    '.ms.b........ms.b.......',
    '.ms.b........ms.b.......',
    '.ms.b........ms.b.......',
    '..k.k.........k.k.......',
  ];
  // bocken: hinden med korta rådjurshorn mellan öronen, två stänger med en tagg framåt och en bakåt
  const RAD_BOCK = ['................v..v....', '...............vv.vv....', '................v..v....', '................v.v.....', ...RAD_KO];
  // färgerna från version 3, gråbrun päls (Björn 2026-11-04: "använd modellen på 1 och 2 men paletten från 3")
  const RAD_FARG = { m: 'jord2', s: 'jord1', d: 'jord0', b: 'kol1', c: 'ben1', v: 'ben3', p: 'rost3', P: 'rost2', k: 'kol0', r: 'senap2' };
  const RAD_UTSEENDE = [
    { text: 'Hinden.', r: MED_KONTUR(RAD_KO), L: RAD_FARG },
    { text: 'Bocken, med korta rådjurshorn.', r: MED_KONTUR(RAD_BOCK), L: { ...RAD_FARG, v: 'ben1' } },
  ];
  // det fällda rådjuret, ritat ur hinden (Björn 2026-11-04: "rita sen om det fällda rådjuret efter de valda modellerna"):
  // samma kropp och huvud, liggande med huvudet framåt och ögat slutet
  const RAD_FALLT = [["....mmmmmmmmmmmmmsss..........", "..mmmmmmmmmmmmmmmmps..........", ".msmmmmmmmmmmmmmmmspmmm.......", ".scmmmmmssmmmmmmmmssssmssmmm..", ".scsmmmmsssmmmsmmmssssmssdssmk", ".svssmmmsdssssmmmsssssmsssssss", ".sv.smmssddssdmssssdccmsssddd.", "...mmmmsbcccddmmbbd...........", "....mmsbb......smmbbb.........", "...mssbb........ssmmbbbb......", ".mms.bb...........ssmmbbbk....", "kss.bb..............ssk.bb....", "s..kb.................s......."],
    ["...mmmmmmmmmmmmmsss..........", ".mmmmmmmmmmmmmmmmps..........", "msmmmmmmmmmmmmmmmspmmm.......", "scmmmmmssmmmmmmmmssssmssmmm..", "scsmmmmsssmmmsmmmssssmssdssmk", "svssmmmsdssssmmmsssssmsssssss", "sv.smmssddssdmssssdccmsssddd.", "..mmmmsbcccddmmbsd...........", "....msbb......mbb............", "....m.bbb....ms.bbb..........", "...mmmbbbbk..mmmbbbbk........", "...sssmmkbb..sssmmkbb........", "......sss.......sss.........."],
    ["...mmmmmmmmmmmmmsss..........", ".mmmmmmmmmmmmmmmmps..........", "msmmmmmmmmmmmmmmmspmmm.......", "scmmmmmssmmmmmmmmssssmssmmm..", "scsmmmmsssmmmsmmmssssmssdssmk", "svssmmmsdssssmmmsssssmsssssss", "sv.smmssddssdmssssdccmsssddd.", "..mmmmsbcccddmmbsd...........", ".....smbb....mbb.............", "......smb...msb..............", ".......srrrrrrb..............", "........skkkkb...............", ".........sbsb................"]];

  const RADSKINN = [
    former(13, 10, [[och(ell(6.5, 5, 4, 3.8), linje([[3, 2], [1, 0.6]], 0.7), linje([[10, 2], [12, 0.6]], 0.7), linje([[3, 8], [1, 9.4]], 0.7), linje([[10, 8], [12, 9.4]], 0.7)), (x, y) => y > 8 && x > 5 && x < 8 ? 'c' : Math.abs(x - 6.5) < 1 ? 'd' : 'm'], [ell(6.5, 9, 1.2, 0.9), 'c']]),
    former(12, 7, [[ell(6, 3.5, 5.6, 3), (x, y) => y < 2 ? 'd' : 'm'], [ell(1.6, 3.5, 1.2, 2.4), (x, y) => y < 3.6 ? 'c' : 'l'], [och(linje([[4.5, 0.6], [4.5, 6.4]], 0.5), linje([[8.5, 0.6], [8.5, 6.4]], 0.5)), 'r']]),
    former(14, 8, [[rakt(0.5, 2, 13.5, 7.5), (x, y) => y < 3.5 ? 'd' : (Math.floor(x) + Math.floor(y)) % 6 === 0 ? 'l' : 'm'], [rakt(1, 0.5, 13, 2), 'm'], [linje([[0.6, 7], [13.4, 7]], 0.5), 'c']]),
  ];
  const RADSKINN_L = { ...RAD_L, r: 'senap2' };

  // ---------- 6.5.1.3 fåglarna: en form, tre utseenden ----------
  // d mörk, m mellan, l ljus, n näbb och ben, a ögonbrynet (orrens röda, ripans röda kam)
  const FAGEL_UTSEENDE = [
    { namn: 'orre', d: 'kol0', m: 'kol2', l: 'ben3', n: 'kol1', a: 'rost2' },
    { namn: 'ripa', d: 'jord2', m: 'ben2', l: 'ben3', n: 'kol1', a: 'rost2' },
    { namn: 'skogsduva', d: 'skiffer1', m: 'skiffer2', l: 'oliv2', n: 'rost3', a: 'skiffer2' },
  ];
  function fagel(v) {
    const W = 12, H = 10, fot = H - 0.5;
    const kropp = v === 0 ? ell(5.6, 5.4, 3.6, 2.6) : v === 1 ? ell(5.8, 6, 3.4, 2.8) : ell(5.6, 5, 3.4, 2.2);
    const hx = v === 2 ? 9 : 8.6, hy = v === 2 ? 1.8 : v === 1 ? 4 : 2.8;
    const lista = [
      [v === 2 ? tri([2.6, 4.4], [0, 7.4], [1.2, 3.4]) : tri([2.6, 4.6], [0, 6.2], [0.8, 3.6]), 'd'], // stjärten
      [kropp, (x, y) => y < 4.4 ? 'd' : y > 6.6 ? 'l' : 'm'],
      [linje([[3.6, 4.8], [7, 5.6]], 0.9), (x) => x > 6 ? 'l' : 'd'], // vingen
      [linje([[7.4, 4.6], [hx, hy + 0.8]], 1.1), 'd'], [ell(hx, hy, 1.3, 1.2), 'd'],
      [tri([hx + 1, hy - 0.4], [hx + 2.6, hy + 0.4], [hx + 1, hy + 0.8]), 'n'],
      [punkt(Math.floor(hx), Math.floor(hy - 0.8)), 'a'],
      [och(linje([[5.4, 7.6], [5.2, fot - 0.3]], 0.35), linje([[7, 7.6], [7.4, fot - 0.3]], 0.35)), 'n'],
    ];
    if (v === 1) lista.splice(6, 1); // utan ben: den trycker på marken
    return former(W, H, lista).filter(r => /[^.]/.test(r));
  }
  function fagelFalld(v) {
    const W = 13, H = 7;
    const lista = v === 0 ? [ // på sidan med vingen ute
      [tri([4, 1.6], [11, 0.2], [9, 3.2]), (x) => x > 9 ? 'l' : 'm'], [ell(5.4, 4.2, 3.6, 2.2), (x, y) => y < 3.6 ? 'd' : 'l'], [tri([2, 3.6], [0, 5.6], [1, 2.6]), 'd'],
      [ell(9.8, 4.8, 1.2, 1.1), 'd'], [tri([10.6, 4.8], [12.4, 5.6], [10.6, 5.8]), 'n'], [och(linje([[5, 6.2], [6.6, 6.8]], 0.3)), 'n'],
    ] : v === 1 ? [ // på rygg med fötterna upp
      [ell(6, 4.4, 4, 2.2), (x, y) => y < 3.6 ? 'l' : 'd'], [tri([2, 4], [0, 6], [0.6, 3]), 'd'], [ell(10.6, 4.8, 1.2, 1.1), 'd'], [tri([11.4, 4.8], [12.8, 5.4], [11.4, 5.8]), 'n'],
      [och(linje([[5.4, 2.4], [5, 0.4]], 0.35), linje([[7, 2.4], [7.6, 0.4]], 0.35)), 'n'],
    ] : [ // hängande i fötterna, huvudet ner
      [ell(6.5, 3.6, 2.2, 3.2), (x) => x < 6 ? 'd' : 'm'], [tri([5.4, 0.8], [7.6, 0.8], [6.5, -0.4]), 'n'], [ell(6.6, 6.2, 1.1, 1.0), 'd'], [punkt(6, 7), 'n'],
      [rakt(4, 0, 9, 0.7), 'r'],
    ];
    return former(W, v === 2 ? 8 : H, lista).filter(r => /[^.]/.test(r));
  }
  // tre olika fåglar (Björn 2026-11-04: "gör så de är mer olika varandra i storlek och form"): orren stor och svart med
  // lyrformad stjärt, ripan rund och vit med fjäderklädda fötter och svart stjärt, skogsduvan liten och smal med kort
  // stjärt och liten huvud. Varje version är ett läge: står, pickar eller lyfter
  const ARTER = {
    orre: { W: 21, H: 14, bx: 10.4, by: 7.6, rx: 5.2, ry: 3.4, hr: 1.6, hals: 3.2, ben: 2.2, L: { d: 'kol0', m: 'kol1', l: 'ben3', n: 'kol1', a: 'rost2', f: 'kol1', s: 'ben3' } },
    ripa: { W: 14, H: 11, bx: 6.4, by: 6.4, rx: 4.3, ry: 3.4, hr: 1.5, hals: 1.6, ben: 1.4, L: { d: 'jord2', m: 'ben2', l: 'ben3', n: 'kol1', a: 'rost2', f: 'ben3', s: 'kol0' } },
    duva: { W: 12, H: 9, bx: 5.4, by: 5.2, rx: 3.3, ry: 2.1, hr: 1.1, hals: 1.8, ben: 1.4, L: { d: 'skiffer1', m: 'skiffer2', l: 'skiffer3', n: 'rost3', a: 'oliv2', f: 'rost3', s: 'skiffer1' } },
  };
  // två nya utseenden (Björn 2026-11-04: "olika versioner av djuren, inte olika positioner; behåll version 1"): samma
  // tre arter, stående, med andra drag. Utseende 1 är tydligare tecken (orrens vita vingband och stora röda kam, ripan i
  // sommardräkt, duvan med vit halsfläck och rosa bröst); utseende 2 är honorna och andra former (orrhönan brun och
  // bandad med kortare stjärt, ripan vit med svart ögonstreck och längre hals, en större ringduva med lång stjärt)
  const FAGEL_VAR = [{}, {
    orre: { kam: 2, vingband: true, L: { ...ARTER.orre.L } },
    ripa: { rx: 4.6, ry: 3.2, L: { d: 'jord1', m: 'jord2', l: 'ben3', n: 'kol1', a: 'rost2', f: 'ben3', s: 'kol0' } },
    duva: { halsflack: true, L: { ...ARTER.duva.L, l: 'rost3' } },
  }, {
    orre: { W: 18, H: 13, bx: 9, kortstjart: true, band: true, rx: 4.6, ry: 3.1, L: { d: 'jord0', m: 'jord1', l: 'jord2', n: 'kol1', a: 'jord1', f: 'kol1', s: 'ben2' } },
    ripa: { hals: 2.6, H: 12, ogonstreck: true, L: { d: 'ben2', m: 'ben3', l: 'ben3', n: 'kol0', a: 'kol0', f: 'ben3', s: 'kol0' } },
    duva: { W: 15, H: 10, bx: 7.6, rx: 3.9, ry: 2.4, hr: 1.2, langstjart: true, halsflack: true, L: { ...ARTER.duva.L } },
  }];
  function fagelArt(art, lage, u = 0) {
    const A = { ...ARTER[art], ...(FAGEL_VAR[u][art] || {}) }, T = lage === 2 ? 4 : 0, W = A.W + (lage === 2 ? 2 : 0), H = A.H + T, fot = H - 0.5, bx = A.bx, by = (lage === 2 ? A.by - 1.4 : A.by) + T; // T: plats över för vingarna
    const fram = bx + A.rx * 0.8, hx = lage === 1 ? bx + A.rx + 1.2 : fram + A.hals * 0.5, hy = lage === 1 ? fot - A.hr - 0.6 : by - A.ry - A.hals * 0.6 + 0.6;
    const bak = bx - A.rx, lista = [];
    // stjärten: orren lyra (två böjda fjädrar ut åt sidorna), ripan kort och svart, duvan smal och rak
    if (art === 'orre' && A.kortstjart) lista.push([tri([bak + 1.2, by - 0.8], [bak - 2.6, by - 1.2], [bak + 1, by + 1.2]), (x, y) => Math.floor(x) % 2 ? 'd' : 'm']);
    else if (art === 'orre') lista.push([och(linje([[bak + 1, by - 0.6], [bak - 3, by - 2.4], [bak - 4.6, by - 4.2], [bak - 5, by - 2.8]], 0.9, 0.5), linje([[bak + 1, by + 0.2], [bak - 3.4, by - 0.4], [bak - 5.4, by - 1], [bak - 5.8, by + 0.4]], 0.9, 0.5)), 'd'], [ell(bak + 0.4, by + 1.8, 1.6, 1.1), 's']); // lyran: två fjädrar som böjer sig ut, och den vita undersidan
    if (art === 'ripa') lista.push([tri([bak + 1.4, by - 0.6], [bak - 1.6, by + 0.8], [bak + 1.2, by + 1.6]), 's']);
    if (art === 'duva') lista.push([linje([[bak + 1, by - 0.2], [bak - (A.langstjart ? 4.2 : 2.4), by + 0.6]], 1.1, 0.8), (x) => x < bak - 1.4 ? 'd' : 'm']);
    if (lage !== 2) lista.push([och(linje([[bx - 0.6, by + A.ry - 0.6], [bx - 0.8, fot - 0.3]], 0.4), linje([[bx + 1.2, by + A.ry - 0.6], [bx + 1.4, fot - 0.3]], 0.4)), art === 'ripa' ? 'f' : 'n']);
    lista.push([ell(bx, by, A.rx, A.ry), (x, y) => art === 'ripa' ? (y < by - A.ry * 0.4 && x > bx - 1 ? 'd' : y > by + A.ry * 0.4 ? 'l' : 'm') : art === 'duva' ? (y < by - 0.8 ? 'd' : y > by + 1 ? 'l' : 'm') : A.band ? ((Math.floor(x) + Math.floor(y) * 2) % 4 === 0 ? 'd' : y > by + 1 ? 'l' : 'm') : (y > by + A.ry * 0.5 && x > bx ? 'm' : 'd')]);
    if (lage === 2) lista.push([och(linje([[bx - 0.4, by - 0.6], [bx - 2.6, by - A.ry - 3.2]], 1.3, 0.7), linje([[bx + 0.8, by - 0.6], [bx + 1.8, by - A.ry - 3.4]], 1.2, 0.6)), (x, y) => art === 'ripa' ? 'l' : art === 'orre' ? (y > by - A.ry - 1.2 ? 'l' : 'm') : (y < by - A.ry - 1.5 ? 'd' : 'l')]); // vingarna uppe, orren med det vita vingbandet
    else lista.push([linje([[bx - A.rx * 0.6, by - 0.2], [bx + A.rx * 0.5, by + 0.4]], A.ry * 0.38), art === 'orre' ? (x) => x > bx + A.rx * 0.2 ? 'l' : 'm' : art === 'ripa' ? 'l' : 'd']); // vingen
    lista.push([linje([[fram - 0.4, by - A.ry * 0.3], [hx, hy]], A.hr * 0.85), art === 'duva' ? 'a' : 'd'], [ell(hx, hy, A.hr, A.hr * 0.9), art === 'duva' ? 'm' : 'd']);
    const nx = lage === 1 ? hx + 0.6 : hx + A.hr * 0.7, ny = lage === 1 ? hy + A.hr * 0.7 : hy;
    lista.push([tri([nx, ny - 0.5], [nx + 1.6, ny + 0.3], [nx, ny + 0.8]), 'n'], [punkt(Math.floor(hx), Math.floor(hy - A.hr * 0.5)), art === 'duva' ? 'k' : 'a']);
    if (A.kam === 2) lista.push([och(punkt(Math.floor(hx) - 1, Math.floor(hy - A.hr * 0.5)), punkt(Math.floor(hx), Math.floor(hy - A.hr * 0.5) - 1)), 'a']); // en större röd kam
    if (A.vingband && lage !== 2) lista.push([linje([[bx - 1.4, by + 0.6], [bx + 1.6, by + 0.9]], 0.4), 'l']); // det vita vingbandet
    if (A.halsflack) lista.push([punkt(Math.floor(hx - A.hr * 0.9), Math.floor(hy + A.hr)), 'w']); // vit fläck på halsen
    if (A.ogonstreck) lista.push([linje([[hx - 0.8, hy - 0.2], [hx + 0.8, hy - 0.2]], 0.4), 'k']); // svart streck genom ögat
    return former(W, H, lista.map(([f, t]) => [(x, y) => f(x - (lage === 2 ? 1 : 0), y), typeof t === 'function' ? (x, y) => t(x - (lage === 2 ? 1 : 0), y) : t])).filter(r => /[^.]/.test(r));
  }
  // flera bilder bredvid varandra på samma mark, med fötterna på samma rad
  const BREDVID = (text, bilder, m = 4) => {
    const w = bilder.reduce((a, [r]) => a + bredd(r) + m, m), h = Math.max(...bilder.map(([r]) => r.length)) + m * 2;
    return { text, w, h, rita: (B) => { let x = m; for (const [r, L] of bilder) { lagg(B, r, L, x, h - m - r.length); x += bredd(r) + m; } } };
  };
  const FAGEL_TEXT = ['Står. Orre, ripa och skogsduva.', 'Tydligare tecken: orren med vitt vingband och stor röd kam, ripan i brun sommardräkt med vita vingar, duvan med vit fläck på halsen och rosa bröst.', 'Honan och andra former: orrhönan brun och bandad med kort stjärt, ripan vit med svart streck genom ögat och längre hals, och en större ringduva med lång stjärt.'];
  const FAGEL_UT = u => BREDVID(FAGEL_TEXT[u], ['orre', 'ripa', 'duva'].map(a => [fagelArt(a, 0, u), { k: 'kol0', w: 'ben3', ...ARTER[a].L, ...((FAGEL_VAR[u][a] || {}).L || {}) }]));
  const FAGLAR = lage => BREDVID(['Står.', 'Pickar i marken.', 'Lyfter, med vingarna uppe.'][lage] + ' Orre, ripa och skogsduva.', ['orre', 'ripa', 'duva'].map(a => [fagelArt(a, lage), { k: 'kol0', ...ARTER[a].L }]));
  const FAGEL_L = FAGEL_UTSEENDE.map(u => ({ ...u, r: 'senap2' }));

  // ---------- fjädrar och ägg (6.5.1.3) ----------
  const FJ_L = { d: 'kol1', m: 'skiffer2', l: 'ben3', w: 'ben2', s: 'senap2', b: 'jord2' };
  // EN tydlig fjäder (Björn 2026-11-04: "inget ser ut som fjädrar, gör EN tydlig fjäder"): den klassiska formen, en spetsig
  // fan på båda sidor om en ljus penna som böjer sig lite, med en bar spole nertill och ett par skåror i kanten där fanen
  // gått isär. Versionerna är tre fåglars fjädrar: duvans grå, ripans vita med svart spets och orrhönans bandade
  function fjader1(v) {
    const W = 9, H = 17, cx = y => 4.5 + (15 - y) * 0.1, topp = 1, slut = 12;
    const halv = (y, sida) => y < topp || y > slut ? 0 : (sida > 0 ? 2.7 : 2.0) * Math.sin(Math.PI * (y - topp + 0.4) / (slut - topp + 0.8)) ** 0.7;
    const fan = (x, y) => { const d = x - cx(y), sida = d >= 0 ? 1 : -1; if (Math.abs(d) > halv(y, sida)) return false; if (Math.abs(d) > halv(y, sida) - 1 && ((sida > 0 && Math.floor(y) === 5) || (sida < 0 && Math.floor(y) === 8))) return false; return true; };
    const ton = (x, y) => { const d = Math.abs(x - cx(y)); if (v === 0) return y < 3.4 ? 'l' : d > 1.6 ? 'd' : 'm'; if (v === 1) return y < 3.6 ? 'd' : d > 1.8 ? 'w' : 'm'; return Math.floor(y) % 3 === 0 ? 'd' : d > 1.6 ? 'b' : 'm'; };
    return former(W, H, [[fan, ton], [(x, y) => Math.abs(x - cx(y)) < 0.5 && y > topp + 0.6 && y < H - 0.6, (x, y) => y > slut ? 's' : 'p']]);
  }
  const FJ1_L = [{ d: 'skiffer1', m: 'skiffer2', l: 'skiffer3', p: 'ben2', s: 'ben1' }, { d: 'kol0', m: 'ben3', w: 'ben2', p: 'ben1', s: 'ben1' }, { d: 'jord0', m: 'jord2', b: 'jord1', p: 'ben2', s: 'ben1' }];
  const FJADRAR = [fjader1(0), fjader1(1), fjader1(2)];
  const AGG_L = { e: 'ben3', E: 'ben2', p: 'jord2', g: 'senap1', G: 'senap2' };
  const AGG = [
    former(11, 6, [[ell(5.5, 4.4, 5.2, 1.6), (x) => (Math.floor(x) % 2 ? 'g' : 'G')], [ell(3.6, 3, 1.6, 2), (x, y) => x < 3.4 && y < 2.6 ? 'e' : 'E'], [ell(7.2, 3.2, 1.6, 2), (x, y) => x < 7 && y < 2.8 ? 'e' : 'E']]),
    former(13, 5, [[ell(2.2, 2.6, 1.7, 2.2), (x, y) => (Math.floor(x) * 3 + Math.floor(y)) % 5 === 0 ? 'p' : x < 2 ? 'e' : 'E'], [ell(6.5, 2.6, 1.7, 2.2), (x, y) => (Math.floor(x) * 3 + Math.floor(y)) % 5 === 1 ? 'p' : x < 6.1 ? 'e' : 'E'], [ell(10.8, 2.6, 1.7, 2.2), (x, y) => (Math.floor(x) * 3 + Math.floor(y)) % 5 === 2 ? 'p' : x < 10.4 ? 'e' : 'E']]),
    former(5, 6, [[ell(2.5, 3.2, 2.1, 2.7), (x, y) => x < 2.2 && y < 2.6 ? 'e' : 'E']]),
  ];

  // ---------- 6.5.3 björnen, idet och fällen ----------
  const BJ_L = { d: 'jord0', m: 'jord1', l: 'jord2', n: 'jord3', k: 'kol0', b: 'ben2' };
  // björnen ritad om helt, utan förlaga (Björn 2026-11-04: "ändra formen på björnen, gör tre nya utan förlaga som inte ser
  // för snälla ut"): kantiga former i stället för runda. Kroppen är en kil som är högst över den stora puckeln vid axlarna
  // och sluttar ner mot en låg bak, huvudet hänger lågt framför bröstet med en lång nos, frambenen är tjocka pelare med
  // långa ljusa klor, och ögat är en liten mörk punkt under ett snett ögonbryn.
  // 1: brun, med morrande öppen mun och tänder; 2: mörk och lurvig, med tovor längs ryggen och buken; 3: mager och
  // långbent med lång nos, grå spetsar på puckeln och en hörntand
  // björnen efter Björns förebild (2026-11-04, en bild av en björn i pixelstil): formen ur förebilden, nerskalad till
  // vår täthet (16 punkter per ruta) och i vår palett. Tung kropp med puckel, huvudet framåt, de bortre benen mörka och
  // ljusa klor. m: pälsen, d: skuggan, D: den djupa skuggan, b: de bortre benen, k: klorna
  // björnen är Björns egen ritning (Björn 2026-11-04, ritad i Ritaren på version 1: "min version. som standard. öppen mun
  // när den attackerar som i din version"); konturen är ritad, så MED_KONTUR behövs inte
  const BJ_FARG = { k: 'kol0', s: 'jord1', r: 'jord0', m: 'kol2', l: 'kol1', t: 'jord2', V: 'ben1', T: 'ben3', g: 'rost0' };
  const BJ_STA = ["........................k.k.k.k...................",
    ".......................ksksksksk..................",
    "...........kkkkkkkkkkkkkksssssk...................",
    ".........kksssssssssssssssssssskk.................",
    ".......kksssssssssssssssssssssssskkk..............",
    "......kssssssssssssssssssssssssssssskk............",
    ".....ksssssssssssssssssssssssssssssssskkk.k.......",
    "....kssssssssssssssssssssssssssssssssssssksk......",
    "....ksssssssssssssssssssssssssssssssssllssslk.....",
    "...kssssssssssssssssssssssssssssssssssllsssmk.....",
    "...ksssssssssssssssssssssssssssssssssssmssssk.....",
    "..kssssssssrssssssssssssssssssssssssssssmmttk.....",
    "..kssssssssmrsssssssssssssssssssssrrssssslmttk....",
    ".ksssssssssmrssssssssssmssssssssssrrssssssttttk...",
    ".ksssssssssrmrssssssssmsssssssssssmrsssssstttllk..",
    "..kssssssssrmrssssssssmssssssssssmmmssssssstttk...",
    "..kssssssssrmrrrsssssrssssssssssmmmmsssssssssk....",
    "..kssssssssrmrrrrrrrrrssssssssssmmmmmmmssrrrk.....",
    "..kssssssssrmrrrrrrrrrssssssssrmmllllkkmsssk......",
    "..kssssssssrmmrrrrrrrmssssssssrlllllk..kkkk.......",
    "..kssssssssrmmmmmmmmmmsssssssrllllllk.............",
    "..kssssssssmmmmmmmmmmmssssssrrllllllk.............",
    "..ksssssssrmmmmmmmmmkmssssssrlllllllk.............",
    "..kssssssrrllllllkkk.kssssssrlllllllk.............",
    "..kssssssrlllllllk...kssssssrllllllk..............",
    "..ksssssrrlllllllk...ksssssskllllllk..............",
    "..ksssssrrlllllllk...ksssssskllllllk..............",
    "..ksssssrkllllllk.....kssssskklllllk..............",
    "...kssssskklllllk.....kssssskklllllk..............",
    "...ksssssskllllllkk...ksssssssllllllkkk...........",
    "....ksrrrVVVllVVVVVk...ksrrrrVVlllVVVVVk..........",
    ".....kkkkkkkkkkkkkk.....kkkkkkkkkkkkkkk..........."];
  const BJ_ANFALL = ["........................k.k.k.k...................",
    ".......................ksksksksk..................",
    "...........kkkkkkkkkkkkkksssssk...................",
    ".........kksssssssssssssssssssskk.................",
    ".......kksssssssssssssssssssssssskkk..............",
    "......kssssssssssssssssssssssssssssskk............",
    ".....ksssssssssssssssssssssssssssssssskkk.k.......",
    "....kssssssssssssssssssssssssssssssssssssksk......",
    "....ksssssssssssssssssssssssssssssssssllssslk.....",
    "...kssssssssssssssssssssssssssssssssssllsssmk.....",
    "...ksssssssssssssssssssssssssssssssssssmssssk.....",
    "..kssssssssrssssssssssssssssssssssssssssmmttk.....",
    "..kssssssssmrsssssssssssssssssssssrrssssslmttk....",
    ".ksssssssssmrssssssssssmssssssssssrrssssssttttk...",
    ".ksssssssssrmrssssssssmsssssssssssmrsssssstttllk..",
    "..kssssssssrmrssssssssmssssssssssmmmsssssssTgTgk..",
    "..kssssssssrmrrrsssssrssssssssssmmmmssssssggggk...",
    "..kssssssssrmrrrrrrrrrssssssssssmmmmmmmsstTgTk....",
    "..kssssssssrmrrrrrrrrrssssssssrmmllllkkmssssk.....",
    "..kssssssssrmmrrrrrrrmssssssssrlllllk..kkkkk......",
    "..kssssssssrmmmmmmmmmmsssssssrllllllk.............",
    "..kssssssssmmmmmmmmmmmssssssrrllllllk.............",
    "..ksssssssrmmmmmmmmmkmssssssrlllllllk.............",
    "..kssssssrrllllllkkk.kssssssrlllllllk.............",
    "..kssssssrlllllllk...kssssssrllllllk..............",
    "..ksssssrrlllllllk...ksssssskllllllk..............",
    "..ksssssrrlllllllk...ksssssskllllllk..............",
    "..ksssssrkllllllk.....kssssskklllllk..............",
    "...kssssskklllllk.....kssssskklllllk..............",
    "...ksssssskllllllkk...ksssssssllllllkkk...........",
    "....ksrrrVVVllVVVVVk...ksrrrrVVlllVVVVVk..........",
    ".....kkkkkkkkkkkkkk.....kkkkkkkkkkkkkkk..........."];
  const BJ_UT = [{ r: BJ_STA, L: BJ_FARG }, { r: BJ_ANFALL, L: BJ_FARG }];
  function bjorn(v) { return BJ_UT[v].r; }
  // björnen bredvid en människa och en varg (Björn 2026-11-04: "jag vill se björnen i relation till en människa och en
  // varg"): den vanliga kartfiguren och vargen från djur.js, med fötterna på samma rad
  const VARG_L = (() => { const D = window.DJURBILD; if (!D) return null; const L = {}; for (const [k, [r, t]] of Object.entries({ ...D.PALS.varg[0][1], ...D.FAST })) L[k] = r + t; return L; })();
  const BJORNSCEN = (text, v) => {
    const bj = bjorn(v), varg = window.DJURBILD ? window.DJURBILD.VARG[0].sida.filter(r => /[^.]/.test(r)) : [];
    const w = 4 + 14 + 4 + bredd(varg) + 4 + bredd(bj) + 4, h = Math.max(bj.length, varg.length, 20) + 8, fot = h - 4;
    return { text, w, h, rita: (B) => {
      if (window.BYBO) { const F = window.BYBO(4242, 'sida', 'sta', 'hanga'); for (let y = 0; y < F.h; y++) for (let dx = 0; dx < F.w; dx++) { const c = F.px[y * F.w + dx]; if (c >= 0) B.satt(4 + dx, fot - F.h + y, c); } for (let dx = 0; dx < F.w; dx++) B.morka(4 + dx, fot); }
      if (VARG_L) lagg(B, varg, VARG_L, 22, fot - varg.length);
      lagg(B, bj, BJ_UT[v].L, 22 + bredd(varg) + 4, fot - bj.length);
    } };
  };
  // björnungarna (steg 6.5.3.2, Björn 2026-11-04: "vi ritar björnungarna nu"): i samma färger och med samma ritade kontur
  // som Björns björn, ungefär hälften så stora, med större huvud, runda öron, kort nos och korta ben.
  // 0: rund och står; 1: sitter på bakbenen; 2: går, med den ljusa kragen som många björnungar har
  const UNGE = [
    ["..............kkk.kkk...",
     ".............ksssksssk..",
     "........kkkk.ksmsssmsk..",
     ".....kkkssssssssssssssk.",
     "....ksssssssssssssssssk.",
     "...kssssssssssssssskssk.",
     "..kssssssssssssssssstttk",
     "..ksssssssssssssssssttkk",
     "..ksssssssssssssssssstk.",
     "..kssssssssssssssssskk..",
     ".ksssssssssssssssskk....",
     ".ksssrrrrrrrssssrlk.....",
     ".ksssllkkkkkksssllk.....",
     ".ksssllk....ksssllk.....",
     ".kVVVllk....kVVVllk.....",
     ".kkkkkkk....kkkkkkk....."],
    ["........kk...kk.....",
     ".......kmsk.kmsk....",
     ".......ksssksssk....",
     "......kssssssssk....",
     "......ksssssskssk...",
     "......ksssssssstttk.",
     "......kssssssssttkk.",
     ".....kkssssssssskk..",
     "....kssssssssssk....",
     "...ksssssssssssk....",
     "..ksssrrsssssllsk...",
     "..kssrssssssslssk...",
     "..ksrsssssssslssk...",
     "..ksrsssssssslssk...",
     "..ksrssssrrrslssk...",
     "..kssrrrrssskVssk...",
     "...kssssssVVkVVVk...",
     "....kkkkkkkkkkkk...."],
    ["................kkk.kkk...",
     "...............ksmsksmsk..",
     "........kkkkkk.kssssssk...",
     ".....kkksssssssVVssssssk..",
     "....kssssssssssVVsssssssk.",
     "...kssssssssssVVssssskssk.",
     "..ksssssssssssVVssssstttkk",
     "..ksssssssssssVVsssssstttk",
     "..ksssssssssssVVsssssskkk.",
     ".ksssssssssssVVssskkkk....",
     ".ksssrrrrrrrrsssrlk.......",
     ".ksssllkkkkkksssllk.......",
     "..ksssllk...ksssllk.......",
     "..kVVVllk...kVVVllk.......",
     "..kkkkkkk...kkkkkkk......."]];
  const UNGESCEN = (text, v) => {
    const bj = bjorn(0), u = UNGE[v];
    const w = 4 + 14 + 4 + bredd(bj) + 4 + bredd(u) + 4, h = Math.max(bj.length, 20) + 8, fot = h - 4;
    return { text, w, h, rita: (B) => {
      if (window.BYBO) { const F = window.BYBO(4242, 'sida', 'sta', 'hanga'); for (let y = 0; y < F.h; y++) for (let dx = 0; dx < F.w; dx++) { const c = F.px[y * F.w + dx]; if (c >= 0) B.satt(4 + dx, fot - F.h + y, c); } for (let dx = 0; dx < F.w; dx++) B.morka(4 + dx, fot); }
      lagg(B, bj, BJ_FARG, 22, fot - bj.length);
      lagg(B, u, BJ_FARG, 22 + bredd(bj) + 4, fot - u.length);
    } };
  };
  // idet ritas inte: det är ingen sak som ska finnas (Björn 2026-11-04)
  const FALL = [
    former(18, 14, [[och(ell(9, 7.6, 5.6, 4.6), linje([[5, 4.6], [1.4, 2]], 1.2, 0.9), linje([[13, 4.6], [16.6, 2]], 1.2, 0.9), linje([[5, 10.6], [1.4, 13]], 1.2, 0.9), linje([[13, 10.6], [16.6, 13]], 1.2, 0.9)), (x, y) => Math.abs(x - 9) < 1.2 ? 'd' : (x < 2.2 || x > 15.8) && (y < 2.8 || y > 12.2) ? 'b' : 'm'], [ell(9, 2.4, 2.6, 2.2), (x, y) => y > 3.4 ? 'n' : 'l'], [och(ell(7, 0.6, 0.9, 0.8), ell(11, 0.6, 0.9, 0.8)), 'd'], [och(punkt(8, 2), punkt(10, 2)), 'k']]),
    former(17, 12, [[och(ell(8.5, 6, 6, 4.8), linje([[4, 2.8], [1.2, 0.8]], 1.1), linje([[13, 2.8], [15.8, 0.8]], 1.1), linje([[4, 9.2], [1.2, 11.2]], 1.1), linje([[13, 9.2], [15.8, 11.2]], 1.1)), (x, y) => Math.abs(x - 8.5) < 1.2 ? 'd' : (Math.floor(x) * 3 + Math.floor(y)) % 7 === 0 ? 'l' : 'm']]),
    former(16, 9, [[rakt(0.5, 2.6, 15.5, 8.5), (x, y) => y < 4 ? 'l' : (Math.floor(x) + Math.floor(y) * 2) % 7 === 0 ? 'd' : 'm'], [rakt(1.5, 0.6, 14.5, 2.6), 'm'], [linje([[1.5, 1.6], [14.5, 1.6]], 0.4), 'l']]),
  ];

  // ---------- korten ----------
  const S = 'Steg ';
  VAL.push(
    KORT('f6_strak', 'Gångstråken i testläget', S + '6.2.5: i testläget syns gångstråken, vägarna från dörrarna till elden, lagren, latrinen och vattnet där inget får byggas, som en tunn linje genom rutornas mitt, och rutan framför dörren som en liten ruta. Stugan och elden är bara för att visa platsen.', [
      STRAK('En tunn gul linje och en fylld gul ruta framför dörren.', 0), STRAK('Korta röda streck och en prickig ruta framför dörren.', 1), STRAK('Två ljusa kanter, som en väg, och en ljus ram framför dörren.', 2)]),
    KORT('f6_buske', 'Busken', S + '6.4.1.3: den nya sortens mark mellan högt gräs och ungskog. Tre buskar i olika storlek.', [
      BUSKSCEN('Rund och tät.', 0, null), BUSKSCEN('Gles, med grenarna synliga mellan bladen.', 1, null), BUSKSCEN('Låg och bred.', 2, null)]),
    KORT('f6_barbuske', 'Bärbusken', S + '6.4.1.4: samma slags buske som ger bär, på alla tre buskarna. Bären har samma färger som saken bär: blåbär i skiffertoner, ljusa uppe till vänster och mörka nere till höger. Versionerna är hur bären sitter. Din kommentar förra gången: ”Gör dem samma färg som bären är som item just nu”.', [
      BARSCEN('Stora bär, ett och ett.', 0), BARSCEN('Klasar om tre, som saken bär.', 1), BARSCEN('Många små bär, glest.', 2)]),
    KORT('f6_styckdel', 'Styckdelen', S + '6.5.1.1: en bit av ett styckat djur. En enda bild för alla djur som får djurets färger (du, 2026-11-04): pälsens tre toner byts, köttet och benet är lika. Varje version visas som rådjur, varg och björn.',
      STYCK.map((r, i) => I_FARGER(STYCK_TEXT[i], r, ['radjur', 'varg', 'bjorn'].map(styckL)))),
    KORT('f6_radjur', 'Rådjuret', S + '6.5.1.2 (ditt beslut väntar, steget är ett förslag): rådjuret på kartan, sett från sidan, med den vita spegeln bak. Ritat efter din förebild: formen ur din bild, nerskalad till vår täthet (16 punkter per ruta) och i vår palett, med den mörka konturen. Din kommentar förra gången: ”jag kan inte se några horn är djuret avklippt?”, och sedan din förebild.', RAD_UTSEENDE.map(u => PA_MARK(u.text, u.r, u.L))),
    KORT('f6_radjur_fallt', 'Fällt rådjur', S + '6.5.1.2: det fällda rådjuret som bärs hem eller styckas. Omritat helt ur den levande hinden: samma kropp och samma huvud, oförändrade, men djuret ligger ner med huvudet på marken, en kort hals, öronen bakåt och ögat slutet. Din kommentar förra gången: ”halsen sen väldigt konstig ut gör om hela med det levande djuret som förlaga”.', [
      PA_MARK('På sidan med benen utsträckta.', MED_KONTUR(RAD_FALLT[0]), RAD_FARG), PA_MARK('På sidan med benen hopvikta.', MED_KONTUR(RAD_FALLT[1]), RAD_FARG), PA_MARK('Med benen bundna ihop med rep, klart att bäras.', MED_KONTUR(RAD_FALLT[2]), RAD_FARG)]),
    KORT('f6_radjursskinn', 'Rådjursskinn', S + '6.5.1.2: skinnet från slakten.', [
      PA_MARK('Utbrett, med en ljus fläck där spegeln satt.', RADSKINN[0], RADSKINN_L), PA_MARK('Hoprullat och knutet.', RADSKINN[1], RADSKINN_L), PA_MARK('Hopvikt.', RADSKINN[2], RADSKINN_L)]),
    KORT('f6_fagel', 'Fåglarna', S + '6.5.1.3: tre fåglar som skiljer sig i storlek och form: orren stor och svart med lyrformad stjärt, ripan rund och vit med fjäderklädda fötter, skogsduvan liten och smal. Version 1 är den du ville behålla; 2 och 3 är andra utseenden av samma tre. Din kommentar förra gången: ”Jag vill se olika versioner av djuren inte olika positioner. Behåll version 1 och gör två nya”.', [
      FAGEL_UT(0), FAGEL_UT(1), FAGEL_UT(2)]),
    KORT('f6_fagel_falld', 'Fälld fågel', S + '6.5.1.3: den fällda fågeln, i samma tre färger.', [
      I_FARGER('På sidan med vingen ute.', fagelFalld(0), FAGEL_L), I_FARGER('På rygg med fötterna upp.', fagelFalld(1), FAGEL_L), I_FARGER('Hängande i fötterna i en snodd.', fagelFalld(2), FAGEL_L)]),
    KORT('f6_fjadrar', 'Fjädern', S + '6.5.1.3: en ny sak från fåglarna, till pilar och prydnader senare. En enda tydlig fjäder: en spetsig fan på båda sidor om pennan, en bar spole nertill och två skåror i kanten. Din kommentar förra gången: ”Inget ser ut som fjädrar. Gör EN tydlig fjäder”.', [
      PA_MARK('Duvans grå fjäder, ljus i spetsen.', FJADRAR[0], FJ1_L[0]), PA_MARK('Ripans vita fjäder med svart spets.', FJADRAR[1], FJ1_L[1]), PA_MARK('Orrhönans bruna fjäder med mörka band.', FJADRAR[2], FJ1_L[2])]),
    KORT('f6_agg', 'Ägg', S + '6.5.1.3: ägg som hittas på våren när man samlar, en ny mat.', [
      PA_MARK('Två ägg i ett litet bo av gräs.', AGG[0], AGG_L), PA_MARK('Tre prickiga ägg på rad.', AGG[1], AGG_L), PA_MARK('Ett enda ägg.', AGG[2], AGG_L)]),
    KORT('f6_bjorn', 'Björnen', S + '6.5.3: björnen på kartan, sedd från sidan, bredvid en människa och en varg. Din egen ritning är björnen som den står och går, och när den anfaller öppnar den munnen med tänderna från min förra version. Din kommentar: ”min version. som standard. öppen mun när den attackerar som i din version”.', [
      BJORNSCEN('Din björn, som den står och går.', 0), BJORNSCEN('Din björn när den anfaller, med öppen mun.', 1)]),
    KORT('f6_bjornunge', 'Björnungen', S + '6.5.3.2: björnungen som följer med björnhonan, bredvid en människa och din björn. Den är ritad i samma färger och med samma kontur som din björn, ungefär hälften så stor, med större huvud, runda öron, kort nos och korta ben.', [
      UNGESCEN('Liten och rund, står på alla fyra.', 0), UNGESCEN('Sitter på bakbenen.', 1), UNGESCEN('Går, med en ljus krage runt halsen som många björnungar har.', 2)]),
    KORT('f6_bjornskinn', 'Björnfällen', S + '6.5.3.3: björnskinnet som slakten ger.', [
      PA_MARK('Utbredd med huvudet och klorna kvar.', FALL[0], BJ_L), PA_MARK('Utbredd utan huvud.', FALL[1], BJ_L), PA_MARK('Hopvikt.', FALL[2], BJ_L)]),
  );

  // ---------- Björns lista efter bildstil v161: djuren från tre håll, den fällda björnen, rövaren och tornadons storlekar ----------
  // Djuren på kartan ritas från tre håll som vargen och haren (djur.js): framifrån (söderut), bakifrån (norrut) och från
  // sidan. Framifrån och bakifrån är lika höga som sidobilden och ritade i samma bokstäver och färger, så att det är samma djur.
  // en rad bilder på marken bredvid varandra, fötterna på samma rad: [rader, legend] per bild
  const PA_RAD = (text, bilder, m = 4, mellan = 4) => {
    const w = bilder.reduce((s, [r]) => s + bredd(r), 0) + mellan * (bilder.length - 1) + m * 2, h = Math.max(...bilder.map(([r]) => r.length)) + m * 2;
    return { text, w, h, rita: (B) => { let x = m; for (const [r, L] of bilder) { lagg(B, r, L, x, h - m - r.length); x += bredd(r) + mellan; } } };
  };
  // 6.5.1.2 rådjuret framifrån och bakifrån: hinden och bocken, i den gråbruna pälsen. Framifrån stora öron med rosa
  // insida, ögonen på sidorna, ljus nos, mörk nostipp och den ljusa strupen; bakifrån örats baksida och den vita spegeln
  // ritat om från början (Björn 2026-11-04: "rita tre helt nya versioner som bara är baserade på den från sidan"):
  // A rakt framifrån med öronen snett upp, B ett smalare huvud med stora öron som ett V, C öronen nästan vågräta och en bredare bringa.
  // Varje version ritades först tre gånger och den bästa valdes. Per version: hinden framifrån, bakifrån, bocken framifrån, bakifrån
  const RAD_VER = {
    A: [
      ["..mm.......mm..", "..mppm...mPPs..", "...mPpmmmPPs...", ".....mmmmms....", ".....mkmks.....", ".....mmmms.....", "......mkk......", "......ccc......", ".....mcms......", "....mmcmms.....", "..mmmmmmmmmss..", "..mmmmmmmmmss..", "..mmmmmmmmmss..", "..mmmmmmmmsss..", "..msmmmmmmsss..", "...ssmmmmsss...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...kkk...kkk..."],
      ["..mm.......mm..", "..mmsm...mssd..", "...mmsmmmssd...", ".....mmmmms....", ".....mmmmms....", ".....mmmms.....", "......mms......", "......mms......", ".....mmms......", "....mmmmss.....", "..mmmmmmmmmss..", "..mmmvvvvvmss..", "..mmvvvvvvvss..", "..mmvvvvvvvss..", "..msvvvvvvvss..", "...ssvvvvvss...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...kkk...kkk..."],
      ["....v.....v....", "....vv...vv....", ".....v...v.....", ".....v...v.....", "..mm.......mm..", "..mppm...mPPs..", "...mPpmmmPPs...", ".....mmmmms....", ".....mkmks.....", ".....mmmms.....", "......mkk......", "......ccc......", ".....mcms......", "....mmcmms.....", "..mmmmmmmmmss..", "..mmmmmmmmmss..", "..mmmmmmmmmss..", "..mmmmmmmmsss..", "..msmmmmmmsss..", "...ssmmmmsss...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...kkk...kkk..."],
      ["....V.....V....", "...VV.....VV...", "....V.....V....", ".....V...V.....", "..mm.......mm..", "..mmsm...mssd..", "...mmsmmmssd...", ".....mmmmms....", ".....mmmmms....", ".....mmmms.....", "......mms......", "......mms......", ".....mmms......", "....mmmmss.....", "..mmmmmmmmmss..", "..mmmvvvvvmss..", "..mmvvvvvvvss..", "..mmvvvvvvvss..", "..msvvvvvvvss..", "...ssvvvvvss...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...kkk...kkk..."],
    ],
    B: [
      [".mm.........mm.", ".mppm.....mPPs.", "..mppm...mPPs..", "...mPmmmmmPs...", ".....mmmmms....", ".....kmmmk.....", "......mmms.....", "......mkk......", ".......c.......", ".....mcms......", "....mmcmms.....", "..mmmmmmmmmss..", "..mmmmmmmmmss..", "..mmmmmmmmmss..", "..mmmmmmmmsss..", "..msmmmmmmsss..", "...ssmmmmsss...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...kkk...kkk..."],
      [".mm.........mm.", ".mmsm.....mssd.", "..mmsm...mssd..", "...mmmmmmmsd...", ".....mmmmms....", ".....mmmmms....", "......mmms.....", "......mms......", ".......m.......", ".....mmms......", "....mmmmss.....", "..mmmmmmmmmss..", "..mmmvvvvvmss..", "..mmvvvvvvvss..", "..mmvvvvvvvss..", "..msvvvvvvvss..", "...ssvvvvvss...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...kkk...kkk..."],
      ["...v.......v...", "...vv.....vv...", "....v.....v....", "....v.....v....", ".mm.........mm.", ".mppm.....mPPs.", "..mppm...mPPs..", "...mPmmmmmPs...", ".....mmmmms....", ".....kmmmk.....", "......mmms.....", "......mkk......", ".......c.......", ".....mcms......", "....mmcmms.....", "..mmmmmmmmmss..", "..mmmmmmmmmss..", "..mmmmmmmmmss..", "..mmmmmmmmsss..", "..msmmmmmmsss..", "...ssmmmmsss...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...kkk...kkk..."],
      ["...V.......V...", "..VV.......VV..", "...V.......V...", "....V.....V....", ".mm.........mm.", ".mmsm.....mssd.", "..mmsm...mssd..", "...mmmmmmmsd...", ".....mmmmms....", ".....mmmmms....", "......mmms.....", "......mms......", ".......m.......", ".....mmms......", "....mmmmss.....", "..mmmmmmmmmss..", "..mmmvvvvvmss..", "..mmvvvvvvvss..", "..mmvvvvvvvss..", "..msvvvvvvvss..", "...ssvvvvvss...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...kkk...kkk..."],
    ],
    C: [
      [".mm.........mm.", ".mpPm.....mPPs.", "..mmmmmmmmmss..", "....mkmmmks....", "....mmmmmms....", ".....mkkks.....", "......ccc......", ".....mcms......", "....mmcmms.....", ".mmmmmmmmmmmss.", ".mmmmmmmmmmmss.", ".mmmmmmmmmmsss.", ".mmmmmmmmmmsss.", ".msmmmmmmmsss..", "..ssmcccmsss...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...kkk...kkk..."],
      [".mm.........mm.", ".mmsm.....mssd.", "..mmmmmmmmmsd..", "....mmmmmms....", "....mmmmmms....", ".....mmmms.....", "......mms......", ".....mmms......", "....mmmmss.....", ".mmmmmmmmmmmss.", ".mmmmvvvvvmmss.", ".mmmvvvvvvvmss.", ".mmmvvvvvvvsss.", ".msmvvvvvvvss..", "..ssmvvvvvss...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...kkk...kkk..."],
      ["...v.......v...", "...vv.....vv...", "....v.....v....", "....v.....v....", ".mm.........mm.", ".mpPm.....mPPs.", "..mmmmmmmmmss..", "....mkmmmks....", "....mmmmmms....", ".....mkkks.....", "......ccc......", ".....mcms......", "....mmcmms.....", ".mmmmmmmmmmmss.", ".mmmmmmmmmmmss.", ".mmmmmmmmmmsss.", ".mmmmmmmmmmsss.", ".msmmmmmmmsss..", "..ssmcccmsss...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...kkk...kkk..."],
      ["...V.......V...", "..VV.......VV..", "...V.......V...", "....V.....V....", ".mm.........mm.", ".mmsm.....mssd.", "..mmmmmmmmmsd..", "....mmmmmms....", "....mmmmmms....", ".....mmmms.....", "......mms......", ".....mmms......", "....mmmmss.....", ".mmmmmmmmmmmss.", ".mmmmvvvvvmmss.", ".mmmvvvvvvvmss.", ".mmmvvvvvvvsss.", ".msmvvvvvvvss..", "..ssmvvvvvss...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...bms...msb...", "...kkk...kkk..."],
    ],
  };
  const RAD_BOCK_L = { ...RAD_FARG, v: 'ben1' }, RAD_BAK_L = { ...RAD_FARG }; // bakifrån är v den vita spegeln
  const RAD_BOCK_BAK_L = { ...RAD_FARG, v: 'ben3', V: 'ben1' };
  const RADJUR_HALL = (v, text) => PA_RAD(text, [
    [MED_KONTUR(RAD_KO), RAD_FARG], [MED_KONTUR(RAD_VER[v][0]), RAD_FARG], [MED_KONTUR(RAD_VER[v][1]), RAD_BAK_L],
    [MED_KONTUR(RAD_BOCK), RAD_BOCK_L], [MED_KONTUR(RAD_VER[v][2]), RAD_BOCK_L], [MED_KONTUR(RAD_VER[v][3]), RAD_BOCK_BAK_L]]);

  // Björns egen ritning (2026-11-04, ”ta bort den öppna munnen helt. Använd min version”): från sidan, framifrån och bakifrån
  const BJ_RITAD = [".......................k.k.k.k.............................................................................................", "......................ksksksksk............................................................................................", "..........kkkkkkkkkkkkkksssssk.................................k.k.k.k.k.....................kkk.k.k.kkkk..................", "........kksssssssssssssssssssskk...........................kkkkskskskskskkk.................kkkkkskskskkkk.................", "......kksssssssssssssssssssssssskkk.......................kkkrkssssssssmrkkk...............kksssssssssssskk...............k", ".....kssssssssssssssssssssssssssssskk.....................kksrrkssssssmrrrkk...............kksssksssskssskk...............k", "....ksssssssssssssssssssssssssssssssskkk.k...............ksmsrrkmssssmmrrrkrk.............ksskkksssssskkkssk.............ks", "...kssssssssssssssssssssssssssssssssssssksk.............ksssmkksssssssskkksrrk...........kssssssssssssssssssk...........kss", "...ksssssssssssssssssssssssssssssssssllssslk............kssssksssssssssskssrrk..........ksssssssssssssssssssrk.........ksss", "..kssssssssssssssssssssssssssssssssssllsssmk...........kssssmssmmssssmmssmsrrkk........kssssssssssssssssssssrk.........ksss", "..ksssssssssssssssssssssssssssssssssssmssssk...........kssssmsskmmssmmkssmsrrrk........kksssssssssssssssssssrrk.......kssss", ".kssssssssrssssssssssssssssssssssssssssmmmtk...........kssssmssssmssmssrrmsrrrk........kssssssssssssssssssssrrk.......kssss", ".kssssssssmrsssssssssssssssssssssrrssssskkttk..........kssssssssmssssmsrrssrrrk........kssssssssssssssssssssrrk.......kssss", "ksssssssssmrssssssssssmssssssssssrrssssssttttk.........kssssssssmkkkkmsrrssrrrk........kssssssssssssssssssssrrk.......kssss", "ksssssssssrmrssssssssmsssssssssssmrsssssstttllk........ksssssmmrmtkktmsrkssrrrk.......ksssssssssssssssssssssrrrk......kssss", ".kssssssssrmrssssssssmssssssssssmmmssssssstttk.........kssssssmrrttttrrksssrrrk.......ksssssssssssrrssssssssrrrk......kssss", ".kssssssssrmrrrsssssrssssssssssmmmmsssssssssk..........ksssssssmrtmrtrkssssrrrk........ksssssssssssrssssssssrrk.......kssss", ".kssssssssrmrrrrrrrrrssssssssssmmmmmmmssrrrk...........kssssssssmrrrrmsssssrrlk........ksssssssssssssssssssrrrk.......klsss", ".kssssssssrmrrrrrrrrrssssssssrmmllllkkmsssk............kssssssssrssssssssssrrlk........ksssssssrrssssrsssssrrrk.......klsss", ".kssssssssrmmrrrrrrrmssssssssrlllllk..kkkk.............krsssssssrssssssssssrrlk........ksssssssrrrrsrrsssssrrk........kllss", ".kssssssssrmmmmmmmmmmsssssssrllllllk...................klrssssssrssssssssssrrlk.........kssssssrrssssrsssssrrk........kllls", ".kssssssssmmmmmmmmmmmssssssrrllllllk...................klrssssssrssssssssssrrlk.........kssssssrrssssrsssssrrk........kllls", ".ksssssssrmmmmmmmmmkmssssssrlllllllk...................klrssssssrssssssssssrrlk.........kssssssrrssssrsssssrrk........kllls", ".kssssssrrllllllkkk.kssssssrlllllllk...................klrssssssrkkkkssssssrrlk.........kssssssrrssssrsssssrrk........kllls", ".kssssssrlllllllk...kssssssrllllllk....................klrssssssk....krssssrrlk.........kssssssrrssssrsssssrrk........kllls", ".ksssssrrlllllllk...ksssssskllllllk....................klrssssssk....krssssrrlk.........kssssssrsssssssssssrrk........kllls", ".ksssssrrlllllllk...ksssssskllllllk....................klrssssssk....krssssrrlk.........kssssssrkkkkkksssssrrk........kllls", ".ksssssrkllllllk.....kssssskklllllk....................kllrsssssk....krssssrllk.........kssssssrk....ksssssrrk........kllll", "..kssssskklllllk.....kssssskklllllk....................kllrsssssk....krssssklk..........klllllllk....klllllllk........kllll", "..ksssssskllllllkk...ksssssssllllllkkk..................kkssssssk....krsssskk...........klllllllk....klllllllk........klllV", "...ksrrrVrVllllVlVk...ksrtrVrVlllllVlVk...................sVsVskk.....ksVsVl............klllllllk....klllllllk........klllV", "....kkkkkkkkkkkkkk.....kkkkkkkkkkkkkkk...................VsVsVsk......ksVsVkV............klllllk......klllllk..........kllV"];
  const BJORN_HALL = { text: 'Din ritning: björnen från sidan, framifrån och bakifrån.', w: bredd(BJ_RITAD) + 8, h: BJ_RITAD.length + 8, rita: (B) => lagg(B, BJ_RITAD, BJ_FARG, 4, 4) };

  // Björns egen ritning (2026-11-04, ”min version”)
  const UNGE_RITAD = [".............kkk.kkk..........kk......kk..........kkk....kkk..", "............ksssksssk........ksskk..kkssk........kssskkkksssk.", ".......kkkk.ksmsssmsk.......ksmmskkkksmmsk.......kssskssksssk.", "....kkkssssssssssssssk......kssksssssskssk.......kssssssssssk.", "...ksssssssssssssssssk.......kksssssssskk.........kssssssssk..", "..kssssssssssssssskssk........kskssssksk..........kssssssssk..", ".kssssssssssssssssstttk.......ksssssssrk..........kssssssssk..", ".ksssssssssssssssssttkk......kksstkktsrkk........kssssssssssk.", ".ksssssssssssssssssstk.......ksksttttsksk.......ksssssssssssrk", ".kssssssssssssssssskk.......ksssksttskssrk......kssssrssrsssrk", "ksssssssssssssssskk.........kssssrsssssrrk......kssssssssssrrk", "ksssrrrrrrrssssrlk..........kssssrsssssrrk......kssssrsssssrrk", "ksssllkkkkkksssllk..........kssssrsssssrrk......kssssrrrsssrrk", "ksssllk....ksssllk...........ksssrsssssrk........ksssrsssssrk.", "kVVVllk....kVVVllk...........kVVVVssVVVVk........kllllssllllk.", "kkkkkkk....kkkkkkk...........kVVVkkkkVVVk........klllkkkklllk."];
  const UNGE_HALL = { text: 'Din ritning: björnungen från sidan, framifrån och bakifrån.', w: bredd(UNGE_RITAD) + 8, h: UNGE_RITAD.length + 8, rita: (B) => lagg(B, UNGE_RITAD, BJ_FARG, 4, 4) };

  // 6.5.3 den fällda björnen, som det fällda rådjuret: på sidan med huvudet på marken och ögat slutet, i Björns färger.
  // 0: benen utsträckta, 1: benen hopvikta under kroppen, 2: benen bundna ihop med rep (q), klar att släpas hem
  function bjornFalld(v) {
    const ben = v === 0 ? [[[30, 15], [35, 21.6]], [[25, 15.5], [29, 21.8]], [[12, 15], [7, 21.6]], [[16, 15.5], [12, 21.8]]]
      : v === 1 ? [[[30, 15], [31, 19.6], [35.4, 21]], [[25, 15.5], [26, 19.8], [29.6, 21.2]], [[12, 15], [11, 19.6], [6.6, 21]], [[16, 15.5], [15, 19.8], [11.4, 21.2]]]
        : [[[28, 15.5], [23.6, 21.4]], [[25, 16], [22.6, 21.6]], [[13, 15.5], [18.4, 21.4]], [[16, 16], [19.4, 21.6]]];
    return former(50, 24, [
      [och(linje(ben[1], 2.2, 1.9), linje(ben[3], 2.2, 1.9)), 'l'], // de bortre benen
      [och(ell(20, 11, 17.5, 6.8), ell(22, 7, 9, 3.6)), (x, y) => y > 14.5 ? 'r' : y < 6.4 && Math.floor(x) % 3 === 0 ? 'r' : 's'], // kroppen och pucken
      [och(punkt(18, 2), punkt(20, 2), punkt(22, 2), punkt(24, 2), punkt(26, 2)), 's'],
      [och(linje(ben[0], 2.6, 2.2), linje(ben[2], 2.6, 2.2)), (x, y) => y > 20.4 ? 'r' : 's'], // de närmaste benen
      [(x, y) => ben.slice(0, 3).some((b, i) => i !== 1 && Math.hypot(x - b[b.length - 1][0], y - b[b.length - 1][1]) < 1.8) && Math.floor(x) % 2 === 0, 'V'], // klorna
      ...(v === 2 ? [[(x, y) => Math.abs(x - 21) < 1.6 && y > 18.4 && y < 22.6, 'q']] : []), // repet runt benen
      [ell(38.5, 11, 2.2, 2), 'k'], [ell(38.5, 11, 1.3, 1.2), 's'], // örat
      [ell(41, 15.6, 6.2, 4.4), 'k'], [ell(41, 15.6, 5.4, 3.7), (x, y) => y > 17.4 ? 'r' : 's'], // huvudet på marken
      [ell(46, 16.8, 2.6, 1.9), 't'], [punkt(48, 16), 'k'], [(x, y) => Math.floor(y) === 18 && x > 44.5 && x < 47.5, 'r'], // nosen och munnen
      [och(punkt(41, 14), punkt(42, 14)), 'r'], // det slutna ögat
    ]);
  }
  const BJ_FALLD_L = { ...BJ_FARG, q: 'senap2' };

  // 6.5.1.3 fåglarna framifrån och bakifrån, i utseendet du valde (version 2: orren med vitt vingband och stor röd kam,
  // ripan i brun sommardräkt med vita vingar, duvan med vit fläck på halsen och rosa bröst), lika höga som sidobilden.
  // Framifrån näbben mot oss och ögonen på sidorna av huvudet; bakifrån orrens lyra som böjer ut åt sidorna över den vita
  // undersidan, ripans svarta stjärt och duvans mörka
  function fagelFram(art, bak) {
  const A = { ...ARTER[art], ...FAGEL_VAR[1][art] }, W = { orre: 15, ripa: 11, duva: 9 }[art], H = A.H, fot = H - 0.5, c = W / 2;
  const by = A.by, bry = A.ry, brx = art === 'orre' ? 3.6 : art === 'ripa' ? 3.7 : 2.5;
  const hy = by - A.ry - A.hals * 0.6 + 0.6, L = [];
  // stjärten bakom: orrens lyra böjer ut åt sidorna, ripans svarta och duvans mörka rakt ner
  if (art === 'orre' && bak) L.push([och(linje([[c - 1, by + 1], [c - 4.4, by + 0.4], [c - 6.6, by - 1.4], [c - 7.2, by - 0.2]], 0.9, 0.5), linje([[c + 1, by + 1], [c + 4.4, by + 0.4], [c + 6.6, by - 1.4], [c + 7.2, by - 0.2]], 0.9, 0.5)), 'd']);
  L.push([och(linje([[c - 1, by + bry - 0.6], [c - 1, fot - 0.3]], 0.4), linje([[c + 1, by + bry - 0.6], [c + 1, fot - 0.3]], 0.4)), art === 'ripa' ? 'f' : 'n']); // benen
  L.push([ell(c, by, brx, bry), (x, y) => {
    const kant = Math.abs(x - c) > brx - 1.1; // vingarna på sidorna
    if (art === 'orre') return !bak && y > by + bry * 0.5 && !kant ? 'm' : kant && y > by - 0.2 && y < by + 1.2 ? 'l' : kant ? 'm' : 'd';
    if (art === 'ripa') return kant ? 'l' : bak ? (y > by + bry * 0.4 ? 'm' : 'd') : y > by + bry * 0.2 ? 'l' : y > by - bry * 0.4 ? 'm' : 'd';
    return kant ? 'm' : !bak && y > by - 0.8 ? 'l' : y > by + 1 && bak ? 'm' : 'd';
  }]);
  if (bak && art === 'orre') L.push([ell(c, by + bry - 0.2, 1.6, 1.0), 's']); // den vita undersidan under lyran
  if (bak && art !== 'orre') L.push([rakt(c - 1, by + bry - 0.8, c + 1, by + bry + 0.6 + (art === 'duva' ? 0.6 : 0)), art === 'ripa' ? 's' : 'd']);
  L.push([rakt(c - A.hr * 0.8, hy, c + A.hr * 0.8, by - bry + 1), art === 'duva' ? 'a' : 'd'], [ell(c, hy, A.hr, A.hr * 0.9), art === 'duva' ? 'm' : 'd']); // halsen och huvudet
  if (!bak) {
    L.push([och(punkt(Math.floor(c - A.hr * 0.7), Math.floor(hy - 0.3)), punkt(Math.floor(c + A.hr * 0.7), Math.floor(hy - 0.3))), art === 'duva' ? 'k' : 'a']); // ögonen (orren och ripan den röda kammen)
    L.push([punkt(Math.floor(c), Math.floor(hy + 0.4)), 'n']); // näbben mot oss
    if (art === 'orre') L.push([och(punkt(Math.floor(c - A.hr * 0.7), Math.floor(hy - 1.3)), punkt(Math.floor(c + A.hr * 0.7), Math.floor(hy - 1.3))), 'a']);
    if (art === 'duva') L.push([och(punkt(Math.floor(c - A.hr * 0.9) , Math.floor(hy + A.hr)), punkt(Math.floor(c + A.hr * 0.9), Math.floor(hy + A.hr))), 'w']);
  } else if (art === 'orre') L.push([och(punkt(Math.floor(c - A.hr * 0.7) - 1, Math.floor(hy - 0.3)), punkt(Math.floor(c + A.hr * 0.7) + 1, Math.floor(hy - 0.3))), 'a']);
  return former(Math.ceil(W) + 0, H, L).filter(r => /[^.]/.test(r));
}
  const FAGEL_HALL = PA_RAD('Från sidan, framifrån och bakifrån: ripan och skogsduvan.', ['ripa', 'duva'].flatMap(a => {
    const L = { k: 'kol0', w: 'ben3', ...ARTER[a].L, ...(FAGEL_VAR[1][a].L || {}) };
    return [[fagelArt(a, 0, 1), L], [fagelFram(a, 0), L], [fagelFram(a, 1), L]];
  }), 4, 3);
  // orren omritad (Björn efter bildstil v163: "nej till orren, ja till de andra två"): bredare kropp och större huvud, den stora
  // röda kammen över ögonen och det vita vingbandet på båda sidor. Lyrans böjda fjädrar sticker ut på sidorna framifrån, och
  // bakifrån breder lyran ut sig över den vita undersidan
  function orreFram(bak) {
  const W = 17, H = 14, fot = H - 0.5, c = W / 2, by = 8.6, hy = 3.4, L = [];
  // lyran: de två böjda stjärtfjädrarna sticker ut på sidorna, bakifrån stora och utbredda
  const lyra = bak ? 1 : 0.7;
  L.push([och(linje([[c - 2, by + 1.2], [c - 5.6 * lyra - 1, by + 0.6], [c - 7.4 * lyra - 0.6, by - 1.6], [c - 7.8 * lyra - 0.4, by - 0.2]], 1.0, 0.5), linje([[c + 2, by + 1.2], [c + 5.6 * lyra + 1, by + 0.6], [c + 7.4 * lyra + 0.6, by - 1.6], [c + 7.8 * lyra + 0.4, by - 0.2]], 1.0, 0.5)), 'd']);
  if (bak) L.push([ell(c, by + 2.6, 2.4, 1.4), 's']); // den vita undersidan mellan lyrans fjädrar
  L.push([och(linje([[c - 1.2, by + 2.6], [c - 1.4, fot - 0.3]], 0.45), linje([[c + 1.2, by + 2.6], [c + 1.4, fot - 0.3]], 0.45)), 'n']); // benen
  L.push([ell(c, by, 4.4, 3.3), (x, y) => {
    const sida = Math.abs(x - c) > 2.6;
    if (sida && Math.abs(y - (by + 0.4)) < 0.6) return 'l'; // det vita vingbandet
    if (bak) return sida ? 'm' : y > by + 1.6 ? 'm' : 'd';
    return y < by - 1.6 && !sida ? 'm' : sida ? 'm' : 'd'; // glansen på bröstet
  }]);
  if (bak) L.push([ell(c, by + 2.8, 1.8, 1.0), 's']);
  L.push([rakt(c - 1.6, hy, c + 1.6, by - 2.4), 'd'], [ell(c, hy, 2.1, 2.0), 'd']); // halsen och huvudet
  L.push([och(rakt(c - 2.4, hy - 1.4, c - 0.6, hy - 0.2), rakt(c + 0.6, hy - 1.4, c + 2.4, hy - 0.2)), 'a']); // den stora röda kammen över ögonen
  if (!bak) L.push([rakt(c - 0.5, hy + 0.3, c + 0.5, hy + 1.6), 'n']); // näbben mot oss
  return former(W, H, L).filter(r => /[^.]/.test(r));
}
  const ORRE_L = { k: 'kol0', w: 'ben3', ...ARTER.orre.L, ...(FAGEL_VAR[1].orre.L || {}) };

  // 6.3.5.8 tornadons tre storlekar, ritade av samma kod (anim.js): tratten så bred som kärnan och dammet ut mot nära-zonen
  const TORNADOSCEN = { text: 'Liten, medel (som förut) och stor, nära varandra i storlek. Runt den stora virvlar damm och många vindstreck som går runt långt ut från tratten. Den rör sig som på kartan.', w: 260, h: 136, stor: true, liten: true, rutor: 96, takt: 230,
    rita: (B, P, slag) => {
      const T = window.TORNADOBILD; if (!T) return;
      T.gras(B);
      const fot = 128, f = T.bild(slag, 'tornado') / 8;
      [['liten', 24], ['medel', 84], ['stor', 188]].forEach(([s, cx]) => { const M = T.TNMATT(T.STORLEKAR[s].S); T.tornado(B, Math.round(cx - M.cx), fot - M.fot, f, s); });
    } };

  VAL.push(
    KORT('f6_radjur_hall', 'Rådjuret från tre håll', S + '6.5.1.2: rådjuret framifrån och bakifrån, ritat helt från början och bara utifrån bilden från sidan: samma färger, lika högt, ett huvud på sju rader, en kort hals med den ljusa strupen, fyra smala ben och bakifrån den vita spegeln. Hinden och sedan bocken med hornen. Din kommentar förra gången: ”rita tre helt nya versioner som bara är baserade på den från sidan och inte det du ritade nu”.', [
      RADJUR_HALL('A', 'Version 1: rakt framifrån, öronen snett uppåt och utåt.'),
      RADJUR_HALL('B', 'Version 2: ett smalare huvud med stora öron som ett V.'),
      RADJUR_HALL('C', 'Version 3: öronen nästan vågräta, en bredare bringa och den ljusa buken.')]),
    { id: 'f6_fagel_hall', namn: 'Fåglarna från tre håll', typ: 'janej', vad: S + '6.5.1.3: ripan och skogsduvan framifrån och bakifrån, i utseendet du valde (version 2).', versioner: [FAGEL_HALL] },
    { id: 'f6_bjorn_hall', namn: 'Björnen från tre håll', typ: 'janej', vad: S + '6.5.3: din björn framifrån och bakifrån, lika stor som sidobilden och i dina färger, och framifrån med munnen öppen när den anfaller.', versioner: [BJORN_HALL] },
    { id: 'f6_bjornunge_hall', namn: 'Björnungen från tre håll', typ: 'janej', vad: S + '6.5.3.2: björnungen du valde, framifrån och bakifrån.', versioner: [UNGE_HALL] },
    KORT('f6_bjorn_falld', 'Fälld björn', S + '6.5.3: den fällda björnen som ligger på marken innan den styckas, som det fällda rådjuret: på sidan med huvudet på marken och ögat slutet, i din björns färger.', [
      PA_MARK('Benen utsträckta.', bjornFalld(0), BJ_FALLD_L), PA_MARK('Benen hopvikta under kroppen.', bjornFalld(1), BJ_FALLD_L), PA_MARK('Benen bundna ihop med rep, klar att släpas hem.', bjornFalld(2), BJ_FALLD_L)]),
    // ---------- steg 5.5.5: den unga grodden i hel skala ----------
    ...(() => {
      const ikon = (B, k, x, y, s = 1) => { const r = IKONER.PIX[k], pal = IKONER.PAL[k] || {}; if (!r) return; const n = Math.round(r[0].length * s);
        for (let ty = 0; ty < n; ty++) for (let tx = 0; tx < n; tx++) { const ch = r[Math.floor(ty / s)][Math.floor(tx / s)], c = pal[ch]; if (ch === '.' || !c) continue; if (c.startsWith('rgba')) B.morka(x + tx, y + ty); else B.satt(x + tx, y + ty, B.P.fran(c)); } };
      return [
      { id: 'f5_grodd', namn: 'Den unga grodden i hel skala', typ: 'janej', vad: S + '5.5.5: grodden på fälten ritades den första halvan av växandet i halv skala (16 punkter i 8). Nu har den en egen bild på 8 punkter. Till vänster som förut, till höger den nya.', versioner: [{ text: 'Till vänster grodden i halv skala, till höger den nya bilden på 8 punkter, båda på en sådd jordruta.', w: 44, h: 22, rita: B => {
        const P = B.P, jord = P.i('jord', 1), fara = P.i('jord', 0);
        for (const x0 of [3, 25]) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) B.satt(x0 + x, 3 + y, (y + 1) % 4 === 0 && x > 0 && x < 15 ? fara : jord);
        if (IKONER.PIX.grodd) ikon(B, 'grodd', 7, 7, 0.5);
        if (IKONER.PIX.grodd_liten) ikon(B, 'grodd_liten', 29, 7, 1);
      } }] },
      ];
    })(),
    // ---------- 6.4.13: det som tornadon kastar flyger i en båge, och jordstigen den lämnar ----------
    ...(() => {
      const W = 96, H = 64;
      const mark = (B) => { const P = B.P; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) B.satt(x, y, P.i('oliv', ((x * 7 + y * 3) % 11 === 0) ? 1 : 2)); };
      const stig = (B, v) => { const P = B.P; // jordstigen snett över kortet nedtill
        for (let x = 0; x < W; x++) { const yc = 50 - Math.round(x / 12), b = v === 2 ? 5 : 3;
          for (let dy = -b; dy <= b; dy++) { const y = yc + dy; if (y < 0 || y >= H) continue;
            if (v === 0) B.satt(x, y, P.i('jord', (dy + x) % 3 === 0 ? 0 : 1));
            else if (v === 1) { if ((x * 5 + dy * 3) % 7 < 5) B.satt(x, y, P.i('jord', Math.abs(dy) === b ? 2 : 1)); else if (dy === -b) B.satt(x, y - 1, P.i('oliv', 3)); }
            else B.satt(x, y, P.i('jord', Math.abs(dy) >= b - 1 ? 2 : (dy % 2 ? 0 : 1))); } } };
      const sak = (B, k, x, y) => { const P = B.P, o = P.i('kol', 0);
        if (k === 'folk') { for (let dy = 0; dy < 7; dy++) for (let dx = 0; dx < 4; dx++) B.satt(x + dx, y + dy, dx === 0 || dx === 3 || dy === 0 || dy === 6 ? o : P.i('rost', 3)); B.satt(x + 1, y + 1, P.i('ben', 2)); B.satt(x + 2, y + 1, P.i('ben', 2)); }
        else if (k === 'glod') { for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) B.satt(x + dx, y + dy, P.i('senap', 3), true); }
        else for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) B.satt(x + dx, y + dy, dx === 0 || dx === 3 || dy === 0 || dy === 3 ? o : P.i('jord', 2)); };
      const bage = (v) => (B) => { mark(B); stig(B, v);
        const P = B.P, banor = [['folk', 10, 40, 60, 34, 18], ['sak', 20, 46, 84, 40, 14], ['glod', 34, 30, 70, 22, 22]];
        for (const [k, fx, fy, tx, ty, hojd] of banor) {
          const pos = (f) => [Math.round(fx + (tx - fx) * f), Math.round(fy + (ty - fy) * f - Math.sin(f * Math.PI) * hojd)];
          if (v === 0) for (let f = 0; f < 0.6; f += 0.06) { const [x, y] = pos(f); B.satt(x, y, P.i('kol', 1)); }
          if (v === 2) for (let f = 0.42; f < 0.6; f += 0.03) { const [x, y] = pos(f); B.satt(x + 1, y + 2, P.i('ben', 3)); }
          const [x, y] = pos(0.6); if (v === 1) { const [gx] = pos(0.6); const gy = Math.round(fy + (ty - fy) * 0.6) + 4; for (let dx = 0; dx < 4; dx++) B.morka(gx + dx, gy); }
          sak(B, k, x, y);
        } };
      return [KORT('f6_tornado_flyger', 'Det tornadon kastar, och jordstigen', S + '6.4.13: det som tornadon lyfter flyger i en båge till där det landar (en människa, en sak och en glöd), och efter tornadon syns en stig av uppriven jord där den gått fram, tills gräset vuxit igen. Platshållaren i spelet är den första versionen.', [
        { text: 'Version 1: en prickad bana bakom det som flyger, och jordstigen i fåror.', w: W, h: H, rita: bage(0) },
        { text: 'Version 2: ingen bana men en skugga på marken under, och jordstigen i lösa torvor med uppslitet gräs i kanten.', w: W, h: H, rita: bage(1) },
        { text: 'Version 3: ljusa fartstreck bakom, och en bredare jordstig med ljusa kanter.', w: W, h: H, rita: bage(2) }])];
    })(),
    // ---------- rövaren (Björn 2026-11-04: "Gör rövardelarna"): luvan eller duken och de mörka kläderna ----------
    ...(() => {
      const rov = (bonad, rock, arr, text) => ({ text, w: 4 + 64 + 3 + 64 + 6 + 5 * 15 + 2, h: 72, rita: B => {
        if (!window.ROVAREN) return; const R = window.ROVAREN(bonad, rock, arr);
        R.portratt.forEach((Q, n) => { for (let y = 0; y < Q.h; y++) for (let x = 0; x < Q.w; x++) { const c = Q.px[y * Q.w + x]; if (c >= 0) B.satt(4 + n * 67 + x, 4 + y, c); } });
        R.karta.forEach((F, n) => { const x0 = 4 + 2 * 67 + 4 + n * 15, fot = 66; for (let y = 0; y < F.h; y++) for (let dx = 0; dx < F.w; dx++) { const c = F.px[y * F.w + dx]; if (c >= 0) B.satt(x0 + dx, fot - F.h + 1 + y, c); } for (let dx = 2; dx < F.w - 2; dx++) B.morka(x0 + dx, fot + 1); });
      } });
      return [KORT('f6_rovare', 'Rövaren', S + '6.6.12: det som skiljer en rövare från en bybo, som nya delar i skaparen som bara rövarna bär: rövarluvan av kolsvart, slitet ylle med en smal springa för ögonen, rövarens duk över hjässan och över näsan och munnen, och ett mörkt, slitet skinn i rocken. Kvinnan och mannen i porträttet, och på kartan mannen framifrån, från sidan, bakifrån och i ett gångsteg, och kvinnan framifrån. Luvan och duken är ritade av API:t (bästa av tre).', [
        rov('bonad-9', 'rovarskinn', false, 'Version 1: rövarluvan och det mörka, slitna skinnet.'),
        rov('bonad-10', 'rovarskinn', false, 'Version 2: rövarens duk över hjässan och ansiktet, och det mörka skinnet.'),
        rov('bonad-9', 'vargskinn', true, 'Version 3: rövarluvan med en rock av vargskinn, och mannen med ett ärr och skägg.')])];
    })(),
  );
})();
