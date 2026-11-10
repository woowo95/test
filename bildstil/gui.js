// ---------- gränssnittets bilder (steg 5.2.4.7, till 5.3.1.2, 5.3.1.4 och 5.3.3.1) och vektorbilderna (5.2.4.2) ----------
// Banden, emblemen, hörnen och vågbandet är Björns skisser efter v207 (avsnittet Gränssnittet), nu i hel skala som bilder
// i paletten (GUI i gui.json: rader och pal, som sakernas bilder). Runstenarna ritas här ur flikens färger och emblemet,
// så att varje flik har samma sten i tre lägen: stängd, öppen och blek. Vektorbilderna (framstegscirkeln, ringen runt en
// teknik eller ett redskap, tårtan över den vakna tiden) ritas punkt för punkt ur hur långt det kommit.
(() => {
  const SCEN = (w, h, rita) => ({ w, h, stor: true, rita });
  const fyll = (B, c) => { for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, c); };
  // en bild ur gui.json med övre vänstra hörnet i x, y; spegel vänder den åt vänster eller uppåt
  function bild(B, b, x, y, sx = false, sy = false) {
    for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) {
      const ch = b.rader[sy ? b.h - 1 - j : j][sx ? b.w - 1 - i : i];
      if (ch !== '.') B.satt(x + i, y + j, B.P.av(b.pal[ch]));
    }
  }
  // flikarnas färger: huvudfärg och andrafärg ur Starkare i paletten (Björns beslut efter v207; Tro i barr och senap är Björns val q_tro)
  const FLIK = [
    ['kronika', 'Krönika', 'rost', 'kol'], ['seder', 'Seder', 'skiffer', 'senap'], ['styre', 'Styre', 'rost', 'senap'],
    ['teknik', 'Teknik', 'kol', 'rost'], ['forrad', 'Förråd', 'oliv', 'senap'], ['folket', 'Folket', 'barr', 'rost'], ['tro', 'Tro', 'barr', 'senap']]; // Tro i barr och senap (Björns val q_tro)

  // ---------- runstenarna ----------
  // en båge i flikens huvudfärg runt en grå sten med emblemet; öppen: bågen i andrafärgen och stenen i huvudfärgen;
  // blek: allt i benets ljusa toner (fliken går inte att öppna än)
  const SW = 22, SH = 28;
  function runsten(B, x0, y0, flik, lage) {
    const P = B.P, [id, , hu, an] = flik, cx = (SW - 1) / 2, ry = 10;
    const ute = (x, y, r) => y >= ry ? Math.abs(x - cx) <= r : (x - cx) ** 2 + (y - ry) ** 2 <= r * r;
    const bleck = lage === 'blek', oppen = lage === 'oppen';
    const bage = oppen ? an : hu;
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
      if (!ute(x, y, 10.6)) continue;
      let c;
      if (y === SH - 1 || !ute(x, y, 9.6)) c = bleck ? P.i('ben', 0) : P.i('kol', 0); // konturen
      else if (ute(x, y, 6.6)) { // stenen
        if (y === SH - 2 || !ute(x, y, 5.8)) c = bleck ? P.i('ben', 1) : P.i('kol', 0);
        else if (bleck) c = P.i('ben', 2);
        else if (oppen) c = P.i(hu, x < cx - 3 ? 3 : 2);
        else c = x < cx - 3 ? P.i('ben', 1) : P.i('ben', 0);
      } else { // bågen: ljus till vänster, mörk till höger
        const t = x < cx - 4 ? 3 : x > cx + 4 ? 1 : 2;
        c = bleck ? P.i('ben', t > 2 ? 2 : 1) : P.i(bage, bage === 'kol' ? t : t);
      }
      B.satt(x0 + x, y0 + y, c);
    }
    const E = flik[4] || GUI.emblem[id], ew = E[0].length, eh = E.length, ex = x0 + Math.round(cx - (ew - 1) / 2), ey = y0 + 9 + Math.round((14 - eh) / 2);
    const ef = bleck ? P.i('senap', 1) : oppen ? P.i('kol', 0) : P.i(hu, hu === 'kol' ? 0 : 0);
    for (let j = 0; j < eh; j++) for (let i = 0; i < ew; i++) if (E[j][i] === '#') B.satt(ex + i, ey + j, ef);
  }
  const STENAR = SCEN(FLIK.length * (SW + 6) + 8, 3 * (SH + 6) + 6, B => {
    fyll(B, B.P.i('ben', 2));
    ['stangd', 'oppen', 'blek'].forEach((l, r) => FLIK.forEach((f, i) => runsten(B, 6 + i * (SW + 6), 5 + r * (SH + 6), f, l)));
  });

  // ---------- banden och emblemen överst i varje flik ----------
  const BANDEN = FLIK.filter(f => GUI.band[f[0]]);
  const BAND = SCEN(2 * 156 + 12, Math.ceil(BANDEN.length / 2) * 40 + 8, B => {
    const P = B.P; fyll(B, P.i('ben', 2));
    BANDEN.forEach((f, i) => {
      const x = 6 + (i % 2) * 156, y = 5 + Math.floor(i / 2) * 40;
      for (let yy = 0; yy < 36; yy++) for (let xx = 0; xx < 152; xx++) B.satt(x + xx, y + yy, xx === 0 || yy === 0 || xx === 151 || yy === 35 ? P.i('kol', 0) : P.i('ben', 3));
      const b = GUI.band[f[0]]; bild(B, b, x + Math.round((152 - b.w) / 2), y + 5);
    });
  });

  // ---------- vågbandet längst ner i raden överst ----------
  const VAG = SCEN(320, 64, B => {
    const P = B.P, t = GUI.vag;
    fyll(B, P.av(GUI.vagbg));
    for (let x = 0; x < B.w; x += t.w) bild(B, t, x, 22);
    for (let y = 22 + t.h; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, window.MARK ? window.MARK.grasPunkt(x, y + 300, P, 1) : P.i('oliv', 2));
    if (window.MARK) window.MARK.tuvor({ ...B, satt: (x, y, c) => y > 22 + t.h && B.satt(x, y, c) }, 1, () => true, 0.6);
  });

  // hörnen: Björn valde Ormen (inbyggd i spelet i steg 5.3.1.4, v333, via guitillspelet.cjs). Ring med blad och Dubbel
  // ögla ligger kvar i gui.json (horn.ring, horn.ogla) om Björn ångrar sig.

  // ---------- vektorbilderna som pixelbilder (5.2.4.2; inbyggda i 5.3.2.2, src/ui/framsteg.ts, och borttagna ur valdelen) ----------
  // vinkeln medsols från klockan tolv, 0 till 1
  const vinkel = (dx, dy) => { const a = Math.atan2(dx, -dy) / (2 * Math.PI); return a < 0 ? a + 1 : a; };
  // framstegscirkeln: en mörk bricka med ljus kant som fylls med gult medsols från klockan tolv
  function framsteg(B, cx, cy, r, p) {
    const P = B.P;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y); if (d > r + 0.3) continue;
      const kant = d > r - 0.9, fylld = p >= 1 || (p > 0 && vinkel(x + 0.0001, y) < p);
      B.satt(cx + x, cy + y, kant ? P.i('ben', 3) : fylld ? P.i('senap', 3) : P.i('kol', 0));
    }
  }
  const STEG = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
  const FRAMSTEG = SCEN(STEG.length * 22 + 8, 56, B => {
    const P = B.P;
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, y < 24 ? (window.MARK ? window.MARK.grasPunkt(x, y, P, 1) : P.i('oliv', 2)) : P.i('ben', 3));
    STEG.forEach((p, i) => { framsteg(B, 12 + i * 22, 11, 4, p); framsteg(B, 12 + i * 22, 39, 7, p); });
  });
  // ringen runt en teknik i teknikträdet eller ett redskap i handen: en linje som växer medsols från toppen
  function ring(B, x0, y0, s, p, fyrkant) {
    const P = B.P, c = (s - 1) / 2;
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) B.satt(x0 + x, y0 + y, P.i('ben', 2)); // knappen
    for (let y = 3; y < s - 3; y++) for (let x = 3; x < s - 3; x++) B.satt(x0 + x, y0 + y, P.i('ben', 3));
    // symbolen i mitten: en flintyxa i små drag
    const yx = ['..oo..', '.oddo.', 'odddo.', '.ooj..', '...j..', '...j..', '...j..'];
    yx.forEach((r, j) => [...r].forEach((ch, i) => ch !== '.' && B.satt(x0 + Math.round(c) - 3 + i, y0 + Math.round(c) - 3 + j, ch === 'o' ? P.i('kol', 0) : ch === 'd' ? P.i('skiffer', 2) : P.i('jord', 1))));
    for (let y = -1; y <= s; y++) for (let x = -1; x <= s; x++) {
      const dx = x - c, dy = y - c;
      let pa;
      if (fyrkant) { const r = 3, ax = Math.max(Math.abs(dx) - (c - r), 0), ay = Math.max(Math.abs(dy) - (c - r), 0), d = Math.hypot(ax, ay); pa = (Math.abs(dx) > c - 1.5 || Math.abs(dy) > c - 1.5) && d <= r + 0.5 && d >= r - 1.2; }
      else { const d = Math.hypot(dx, dy); pa = d <= c + 0.6 && d >= c - 1.4; }
      if (pa && p > 0 && vinkel(dx + 0.0001, dy) <= p) B.satt(x0 + x, y0 + y, P.i('rost', 2));
    }
  }
  const RINGAR = SCEN(6 * 30 + 8, 64, B => {
    const P = B.P; for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, P.i('ben', 3));
    [0, 0.2, 0.4, 0.6, 0.8, 1].forEach((p, i) => { ring(B, 6 + i * 30, 4, 22, p, false); ring(B, 6 + i * 30, 36, 22, p, true); });
  });
  // tårtan: delarna i flikens ordning, med en tunn linje i panelens färg mellan dem; den valda lyser och resten bleknar
  const TARTFARG = [['oliv', 3], ['senap', 3], ['rost', 2], ['skiffer', 3], ['jord', 3], ['barr', 2], ['ben', 1]];
  function tart(B, cx, cy, r, delar, vald = -1) {
    const P = B.P, tot = delar.reduce((a, b) => a + b, 0);
    const grans = []; let acc = 0; for (const d of delar) { acc += d / tot; grans.push(acc); }
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y); if (d > r + 0.3) continue;
      const a = vinkel(x + 0.0001, y), i = grans.findIndex(g => a < g), j = i < 0 ? delar.length - 1 : i;
      // linjen mellan två delar: nära en gräns i vinkel, mätt i punkter längs bågen
      const near = grans.some(g => { const dv = Math.abs(a - g); return Math.min(dv, 1 - dv) * 2 * Math.PI * d < 0.7; }) && d > 1;
      let c;
      if (d > r - 0.7) c = P.i('kol', 0);
      else if (near) c = P.i('ben', 3);
      else { const [ra, t] = TARTFARG[j % TARTFARG.length]; c = vald >= 0 && vald !== j ? P.i('ben', 1) : P.i(ra, t); }
      B.satt(cx + x, cy + y, c);
    }
  }
  const TARTA = SCEN(3 * 46 + 8, 50, B => {
    const P = B.P; for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, P.i('ben', 3));
    tart(B, 26, 25, 20, [40, 25, 15, 10, 6, 4]); tart(B, 72, 25, 20, [55, 30, 15]); tart(B, 118, 25, 20, [40, 25, 15, 10, 6, 4], 1);
  });


  // ---------- frågorna till Björn (5.2.4.7, Saknas): Tro, Person, Grannar och Förråd ----------
  // Förslag till band och emblem för flikarna som saknar dem. Ett band är en remsa på 140 × 26 punkter: ett mönster
  // som upprepas på båda sidor och en medaljong i mitten med emblemet, i flikens två färger.
  const mask = (w, h, rita) => { const g = Array.from({ length: h }, () => Array(w).fill('.')); rita((x, y) => { if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = '#'; }); return g.map(r => r.join('')); };
  const EMB = {
    huvud: ['....###....', '...#####...', '...#####...', '...#####...', '....###....', '...........', '..#######..', '.#########.', '.#########.', '.#########.'],
    hand: ['...#.#.#...', '...#.#.#...', '.#.#.#.#...', '.#.#.#.#...', '.#######.#.', '.#######.#.', '.#########.', '..#######..', '...#####...', '...#####...'],
    oga: ['...#####...', '.##.....##.', '#...###...#', '#..#####..#', '#..##.##..#', '#...###...#', '.##.....##.', '...#####...'],
    hus: mask(13, 10, s => { for (const x0 of [0, 7]) { for (let y = 0; y < 3; y++) for (let x = 2 - y; x <= 3 + y; x++) s(x0 + x, y); for (let y = 3; y < 8; y++) for (let x = 1; x <= 4; x++) if (!(y > 4 && (x === 2 || x === 3))) s(x0 + x, y); } for (let x = 0; x < 13; x++) s(x, 9); }),
    pilar: mask(13, 9, s => { for (let x = 1; x < 12; x++) { s(x, 2); s(x, 6); } for (let i = 0; i < 3; i++) { s(11 - i, 2 - i); s(11 - i, 2 + i); s(1 + i, 6 - i); s(1 + i, 6 + i); } }),
    graf: mask(11, 10, s => { [[1, 6], [4, 3], [7, 5], [10, 1]].forEach(([x, y0]) => { for (let y = y0; y < 9; y++) { s(x - 1, y); s(x, y); } }); for (let x = 0; x < 11; x++) s(x, 9); }), // staplar: Byns tal (steg 9.3.2)
    stig: mask(13, 10, s => { for (let y = 0; y < 3; y++) for (let x = 9 - y; x <= 10 + y; x++) s(x, y); for (let y = 3; y < 6; y++) for (let x = 8; x <= 11; x++) if (!(y > 3 && (x === 9 || x === 10))) s(x, y); [[7, 7], [5, 8], [3, 8], [1, 9], [6, 6]].forEach(([x, y]) => { s(x, y); s(x + 1, y); }); }),
  };
  // mönstren på sidorna: ritar en ruta med vänstra kanten i x och mittlinjen i cy
  const MONSTER = {
    sol: { steg: 12, rita: (B, x, cy, hu, an) => { const P = B.P; for (let y = -4; y <= 4; y++) for (let i = -4; i <= 4; i++) { const d = Math.hypot(i, y); if (d <= 2.4) B.satt(x + 6 + i, cy + y, P.i(hu, 3)); else if (d <= 3.3) B.satt(x + 6 + i, cy + y, P.i('kol', 0)); else if (d <= 4.4 && (i === 0 || y === 0 || Math.abs(i) === Math.abs(y))) B.satt(x + 6 + i, cy + y, P.i(an, 1)); } } },
    ranka: { steg: 8, rita: (B, x, cy, hu, an, n) => { const P = B.P; for (let i = 0; i < 8; i++) B.satt(x + i, cy, P.i('kol', 0)); const upp = n % 2 ? -1 : 1; for (let k = 1; k <= 3; k++) { B.satt(x + 3 + k - 1, cy + upp * k, P.i(hu, 2)); B.satt(x + 4 + k - 1, cy + upp * k, P.i(hu, 3)); } B.satt(x + 1, cy - upp, P.i(an, 2)); } },
    flata: { steg: 10, rita: (B, x, cy, hu, an) => { const P = B.P; for (let i = 0; i < 10; i++) { const a = Math.round(Math.sin(i / 10 * 2 * Math.PI) * 3.4), b = -a; B.satt(x + i, cy + a, P.i(hu, 2)); B.satt(x + i, cy + a + 1, P.i(hu, 3)); if (i < 4 || i > 6) { B.satt(x + i, cy + b, P.i(an, 2)); B.satt(x + i, cy + b + 1, P.i(an, 3)); } } } },
    fot: { steg: 9, rita: (B, x, cy, hu, an, n) => { const P = B.P, y0 = cy + (n % 2 ? -3 : 1); for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) if (!(j === 0 && i !== 1)) B.satt(x + 2 + i, y0 + j, P.i(hu, j === 0 ? 2 : 1)); [0, 2, 4].forEach(i => B.satt(x + 1 + i, y0 - 2, P.i(an, 2))); } },
    parlor: { steg: 6, rita: (B, x, cy, hu, an, n) => { const P = B.P; for (let i = 0; i < 6; i++) B.satt(x + i, cy, P.i('kol', 0)); const r = n % 3 ? 1.6 : 2.4; for (let y = -3; y <= 3; y++) for (let i = -3; i <= 3; i++) if (Math.hypot(i, y) <= r) B.satt(x + 3 + i, cy + y, P.i(n % 3 ? an : hu, Math.hypot(i + 0.8, y + 0.8) < 1 ? 3 : 2)); } },
    hyddor: { steg: 11, rita: (B, x, cy, hu, an) => { const P = B.P; for (let y = 0; y < 4; y++) for (let i = 3 - y; i <= 4 + y; i++) B.satt(x + 1 + i, cy - 4 + y, P.i(hu, 2)); for (let y = 0; y < 4; y++) for (let i = 1; i <= 6; i++) B.satt(x + 1 + i, cy + y, y > 0 && (i === 3 || i === 4) ? P.i('kol', 0) : P.i(an, 2)); for (let i = 0; i < 11; i++) B.satt(x + i, cy + 4, P.i('kol', 0)); } },
    stenar: { steg: 7, rita: (B, x, cy, hu, an, n) => { const P = B.P; for (let i = 0; i < 7; i++) if (i % 2) B.satt(x + i, cy + 2, P.i(an, 1)); for (let y = -2; y <= 1; y++) for (let i = 0; i < 4; i++) if (!((y === -2 || y === 1) && (i === 0 || i === 3))) B.satt(x + 1 + i, cy + y - (n % 2), P.i(hu, y < 0 ? 3 : 2)); } },
  };
  function nyttBand(B, x, y, hu, an, monster, E) { // en panel på 152 × 36 med bandet i mitten
    const P = B.P;
    for (let yy = 0; yy < 36; yy++) for (let xx = 0; xx < 152; xx++) B.satt(x + xx, y + yy, xx === 0 || yy === 0 || xx === 151 || yy === 35 ? P.i('kol', 0) : P.i('ben', 3));
    const M = MONSTER[monster], cy = y + 18, cx = x + 76;
    // symmetriskt (Björn efter bildstil v125): vänster sida ritas från medaljongen och utåt, och höger sida är den speglad
    const spegel = { ...B, satt: (xx, yy, c) => { B.satt(xx, yy, c); B.satt(2 * cx - xx, yy, c); } };
    for (let n = 0, xx = cx - 15 - M.steg; xx >= x + 8; xx -= M.steg, n++) M.rita(spegel, xx, cy, hu, an, n);
    for (let j = -12; j <= 12; j++) for (let i = -12; i <= 12; i++) { const d = Math.hypot(i, j); if (d > 12.4) continue; B.satt(cx + i, cy + j, d > 11.4 ? P.i('kol', 0) : d > 9.6 ? P.i(hu, 2) : d > 8.8 ? P.i(an, 2) : P.i('ben', 3)); }
    const ew = E[0].length, eh = E.length;
    for (let j = 0; j < eh; j++) for (let i = 0; i < ew; i++) if (E[j][i] === '#') B.satt(cx - (ew >> 1) + i, cy - (eh >> 1) + j, P.i(hu, hu === 'senap' || hu === 'ben' ? 0 : 1));
  }
  // ett förslag: stängd och öppen runsten och bandet
  const FORSLAG = (id, hu, an, monster, emb) => SCEN(2 * (SW + 4) + 160 + 8, 46, B => {
    fyll(B, B.P.i('ben', 2)); const f = [id, '', hu, an, EMB[emb] || GUI.emblem[emb]];
    runsten(B, 5, 9, f, 'stangd'); runsten(B, 5 + SW + 4, 9, f, 'oppen'); nyttBand(B, 2 * (SW + 4) + 8, 5, hu, an, monster, f[4]);
  });
  // till spelet (5.3.3.1): guitillspelet.cjs kör den här filen och ritar runstenarna och banden med samma funktioner
  if (typeof window !== 'undefined') window.GUIRITA = { runsten, nyttBand, FLIK, EMB, SW, SH };
  const T = 'Steg 5.2.4.7: ';
  // runstenarna, banden och Tros, Personens och Grannarnas förslag är inbyggda i spelet (5.3.3.1, v338) och borttagna ur valdelen;
  // scenerna STENAR och BAND och FORSLAG ligger kvar som referens
  // vågbandet (g_vag) är inbyggt i spelet (5.3.1.2, v355) och borttaget ur valdelen; scenen VAG ligger kvar som referens
})();
