// ---------- gränssnittets bilder (steg 5.2.4.7, till 5.3.1.2, 5.3.1.4 och 5.3.3.1) ----------
// Banden, emblemen, hörnen och vågbandet är Björns skisser efter v207 (avsnittet Gränssnittet), nu i hel skala som bilder
// i paletten (GUI i gui.json: rader och pal, som sakernas bilder). Runstenarna ritas här ur flikens färger och emblemet,
// så att varje flik har samma sten i tre lägen: stängd, öppen och blek.
(() => {
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

  // hörnen: Björn valde Ormen (inbyggd i spelet i steg 5.3.1.4, v333, via guitillspelet.cjs). Ring med blad och Dubbel
  // ögla ligger kvar i gui.json (horn.ring, horn.ogla) om Björn ångrar sig.

  // ---------- banden och emblemen för Tro, Person, Grannar och Förråd (5.2.4.7) ----------
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
  // till spelet (5.3.3.1): guitillspelet.cjs kör den här filen och ritar runstenarna och banden med samma funktioner
  if (typeof window !== 'undefined') window.GUIRITA = { runsten, nyttBand, FLIK, EMB, SW, SH };
  // runstenarna, banden, vågbandet och framstegscirkeln, ringen och tårtan är inbyggda i spelet (5.3.3.1, 5.3.1.2 och 5.3.2.2)
  // och borttagna ur valdelen
})();
