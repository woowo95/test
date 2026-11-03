// ---------- animationerna (steg 5.2.4.8, till 5.1.9.1, 5.1.9.4 och 5.1.9.5) ----------
// Små rörelser i en fast takt, som inte ändrar spelets räkning: elden och röken, arbetena (hugga, gräva, slå flinta) och
// striden. Folket är kartfiguren från 5.2.2 (window.BYBO i skapare.js), elden är lägerelden (ritaEld i sida.js) och marken
// och stubbarna är marken från 5.2.4.5 (window.MARK i mark.js). Varje version är en scen med rutor: rita(B, P, ruta) ritar
// en bild och sidans klocka (ANIM i sida.js) byter bild med versionens takt. Scenen visas tre gånger större och i kartans
// storlek bredvid.
(() => {
  const SCEN = (w, h, rutor, takt, rita) => ({ w, h, stor: true, liten: true, rutor, takt, rita });
  const gras = B => { for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, MARK.grasPunkt(x, y, B.P, 1)); MARK.tuvor(B, 1, () => true); };
  // redskapen i handen, ritade här i stället för i kartfiguren så att de inte klipps av när armen lyfts över huvudet:
  // punkterna från handen [framåt, nedåt, ramp, ton] för varje arm. Saknas armen används hanga
  const S = 'skiffer', J = 'jord';
  const REDSKAP = {
    yxa: { hanga: [[0, 1, J, 2], [0, 2, J, 2], [0, 3, J, 1], [1, 3, S, 2], [1, 2, S, 1]],
      lyfta: [[0, -1, J, 2], [0, -2, J, 2], [0, -3, J, 2], [0, -4, J, 1], [-1, -4, S, 2], [-2, -4, S, 3], [-1, -3, S, 1], [-2, -3, S, 2]],
      sla: [[1, 1, J, 2], [2, 2, J, 2], [3, 3, J, 1], [4, 3, S, 2], [4, 4, S, 3], [3, 4, S, 1], [5, 4, S, 2]],
      framfor: [[1, -1, J, 2], [2, -2, J, 2], [3, -2, S, 2], [3, -3, S, 3], [2, -3, S, 1]] },
    spade: { hanga: [[0, 1, J, 2], [0, 2, J, 2], [0, 3, J, 2], [0, 4, 'ben', 2], [1, 4, 'ben', 1]],
      lyfta: [[1, -1, J, 2], [2, -2, J, 2], [3, -3, J, 2], [4, -4, 'ben', 2], [5, -4, 'ben', 1], [4, -5, 'ben', 2], [5, -5, J, 3], [4, -6, J, 2], [5, -6, J, 1]],
      sla: [[1, 1, J, 2], [1, 2, J, 2], [2, 3, J, 2], [2, 4, J, 2], [2, 5, 'ben', 2], [3, 5, 'ben', 1], [2, 6, 'ben', 2], [3, 6, 'ben', 1]],
      framfor: [[1, -1, J, 2], [2, -2, J, 2], [3, -3, 'ben', 2], [4, -3, 'ben', 1], [3, -4, J, 3]] },
    sten: { hanga: [[0, 1, J, 1], [1, 1, J, 0]], lyfta: [[0, -1, J, 2], [1, -1, J, 1], [0, -2, J, 3], [1, -2, J, 2]], sla: [[0, 1, J, 2], [1, 1, J, 1], [0, 2, J, 1], [1, 2, J, 0]] },
    tra: { hanga: [[0, 1, J, 2], [0, 2, J, 2], [0, 3, J, 3], [1, 3, J, 2]],
      lyfta: [[0, -1, J, 2], [0, -2, J, 2], [0, -3, J, 3], [0, -4, J, 3], [-1, -4, J, 2], [-1, -3, J, 2]],
      sla: [[1, 0, J, 2], [2, 0, J, 2], [3, 0, J, 3], [4, 0, J, 3], [4, -1, J, 2], [5, 0, J, 2]],
      framfor: [[1, -1, J, 2], [2, -2, J, 2], [3, -3, J, 3], [3, -4, J, 2]] },
    spjut: { hanga: [...[-7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4].map(d => [0, d, J, 2]), [0, -8, S, 3], [0, -9, S, 2]],
      lyfta: [...[-4, -3, -2, -1, 1, 2, 3, 4, 5].map(d => [d, 0, J, 2]), [6, 0, S, 3], [7, 0, S, 2]],
      framfor: [...[-4, -3, -2, -1, 1, 2, 3, 4, 5].map(d => [d, 1, J, 2]), [6, 1, S, 3], [7, 1, S, 2]],
      sla: [...[-1, 1, 2, 3, 4, 5, 6, 7, 8].map(d => [d, 0, J, 2]), [9, 0, S, 3], [10, 0, S, 2]] },
  };
  // en bybo med fötterna på raden fot, mitt på x, med redskapet (REDSKAP) i handen; ger handens punkt på bilden
  function figur(B, x, fot, fro, rikt, ben, arm, redskap = null) {
    if (!window.BYBO) return null;
    const F = window.BYBO(fro, rikt, ben, arm, null), x0 = Math.round(x) - (F.w >> 1), y0 = fot - F.h + 1;
    for (let dx = -3; dx <= 3; dx++) B.morka(Math.round(x) + dx, fot + 1);
    for (let y = 0; y < F.h; y++) for (let dx = 0; dx < F.w; dx++) { const v = F.px[y * F.w + dx]; if (v >= 0) B.satt(x0 + dx, y0 + y, v); }
    if (!F.hand) return null;
    const hx = x0 + F.hand[0], hy = y0 + F.hand[1], fram = rikt === 'vast' ? -1 : 1, R = REDSKAP[redskap];
    if (R) for (const [dx, dy, ramp, ton] of R[arm] || R.hanga) B.satt(hx + dx * fram, hy + dy, B.P.i(ramp, ton));
    return [hx, hy];
  }
  const prick = (B, x, y, ramp, ton) => B.satt(Math.round(x), Math.round(y), B.P.i(ramp, ton));
  // en liten rökpuff: större och ljusare ju högre den kommit (f från 0 vid skorstenen till 1 där den är borta)
  function puff(B, x, y, f) {
    const r = f < 0.25 ? 1.6 : f < 0.6 ? 2.5 : 3.2, ton = f < 0.35 ? 1 : f < 0.75 ? 2 : 3;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      if (f > 0.8 && (dx + dy + Math.round(y)) % 2) continue; // glesnar innan den försvinner
      prick(B, x + dx, y + dy, dy < 0 || dx < 0 ? 'skiffer' : 'kol', dy < 0 || dx < 0 ? ton : Math.min(3, ton + 1));
    }
  }
  // röken: puffar med jämna mellanrum som stiger s punkter per ruta; efter n rutor har varje puff kommit dit nästa var,
  // så att rörelsen går runt utan hack. vind flyttar den åt sidan högre upp
  function rok(B, x, y, ruta, n, s, hojd, vind) {
    const steg = n * s;
    for (let k = 0; k * steg < hojd; k++) {
      const upp = k * steg + ruta * s; if (upp > hojd) continue;
      const f = upp / hojd; puff(B, x + Math.sin(f * 3 + 0.5) * 1.5 + vind * f * f * 10, y - upp, f);
    }
  }
  // en hydda av timmer med torvtak och rökhål, 22 punkter bred; rökhålet på (x + 11, by - 17)
  function hydda(B, x, by) {
    const P = B.P;
    for (let y = by - 8; y <= by; y++) for (let i = 0; i < 22; i++) {
      const kant = i === 0 || i === 21 || y === by, stock = (by - y) % 3;
      let v = kant ? P.i('kol', 0) : stock === 0 ? P.i('jord', 0) : stock === 1 ? P.i('jord', 1) : P.i('jord', 2);
      if (i >= 8 && i <= 12 && y >= by - 6 && !kant) v = i === 8 || i === 12 || y === by - 6 ? P.i('kol', 1) : P.i('kol', 0); // dörren
      B.satt(x + i, y, v);
    }
    for (let j = 0; j <= 9; j++) for (let i = -2 + j; i <= 23 - j; i++) { // taket
      const y = by - 9 - j, kant = i === -2 + j || i === 23 - j || j === 0;
      if (j === 9 && i >= 10 && i <= 12) continue; // rökhålet
      B.satt(x + i, y, kant ? P.i('kol', 0) : (i + j * 3) % 7 === 0 ? P.i('oliv', 1) : j < 3 ? P.i('oliv', 2) : P.i('oliv', 3));
    }
    for (let i = 10; i <= 12; i++) B.satt(x + i, by - 18, P.i('kol', 0));
  }

  // ---------- elden och röken (5.1.9.1) ----------
  // lågornas höjd per ruta. Lugn: samma form som andas; livlig: kolumnerna byter plats; vind: lågorna lutar åt höger
  const LAGOR = {
    lugn: [[2, 4, 7, 9, 6, 4, 2], [2, 5, 7, 8, 7, 4, 2], [3, 4, 8, 9, 6, 5, 2], [2, 4, 6, 9, 7, 4, 3], [2, 5, 7, 10, 6, 4, 2], [3, 4, 7, 8, 7, 5, 2]],
    livlig: [[2, 4, 7, 9, 6, 4, 2], [3, 6, 8, 6, 9, 3, 2], [2, 5, 10, 7, 6, 5, 3], [4, 3, 7, 10, 5, 6, 2], [2, 6, 6, 9, 8, 3, 3], [3, 4, 9, 7, 10, 4, 2]],
  };
  function eldScen(stil) {
    return SCEN(112, 62, 6, stil === 'lugn' ? 220 : 150, (B, P, r) => {
      gras(B);
      hydda(B, 72, 54);
      const cx = 32, cy = 46, vind = stil === 'vind';
      ritaEld(B, cx, cy, P, { lagor: LAGOR[stil === 'lugn' ? 'lugn' : 'livlig'][r] });
      if (vind) for (let k = 0; k < 7; k++) { const h = LAGOR.livlig[r][k]; for (let j = Math.floor(h / 2); j < h; j++) { const x = cx - 3 + k, y = cy - j, d = Math.round((j - h / 2) * 0.5); if (d > 0) { B.satt(x + d, y, B.P.i(j > h * 0.75 ? 'rost' : 'senap', 2), true); B.satt(x, y, B.P.i('senap', j > h * 0.75 ? 1 : 3), true); } } }
      if (stil === 'livlig') for (let k = 0; k < 3; k++) { const upp = ((r + k * 2) % 6) * 3, x = cx - 1 + ((k * 5 + r) % 5) - 2; prick(B, x, cy - 10 - upp, upp > 9 ? 'rost' : 'senap', upp > 9 ? 1 : 3); } // gnistor
      rok(B, cx + (vind ? 2 : 0), cy - 13, r, 6, stil === 'lugn' ? 1 : 2, stil === 'lugn' ? 24 : 34, vind ? 1.2 : 0.2);
      rok(B, 83, 36, (r + 3) % 6, 6, 1, stil === 'lugn' ? 22 : 30, vind ? 1.2 : 0.2);
    });
  }

  // ---------- arbetena (5.1.9.4) ----------
  // tre arbeten bredvid varandra: hugga (yxan mot en stubbe), gräva (spaden mot en grop) och slå flinta (sittande, en
  // slagsten mot en flintknöl på marken). Varje version är en följd av armens lägen; det som flyger syns vid slaget
  const FOLJD = {
    tva: [['lyfta', 0], ['sla', 1]],
    fyra: [['lyfta', 0], ['lyfta', 0], ['sla', 1], ['sla', 2]],
    svep: [['lyfta', 0], ['sla', 1], ['sla', 2], ['framfor', 0]],
  };
  function arbeteScen(stil) {
    const F = FOLJD[stil];
    return SCEN(176, 52, F.length, stil === 'tva' ? 420 : 200, (B, P, r) => {
      gras(B);
      const [arm, slag] = F[r], fot = 42;
      // hugga: stubben framför figuren, där yxan träffar; flisor ljusa som det nya träet
      MARK.stubbe(B, 38, fot, 7, 'gran', 0);
      const h1 = figur(B, 28, fot, 5101, 'sida', 'sta', arm, 'yxa');
      if (stil === 'svep' && slag === 1 && h1) for (const [dx, dy] of [[-1, -5], [0, -3], [2, -1]]) prick(B, h1[0] + dx, h1[1] + dy, 'ben', 3); // svepet
      if (slag) for (const [dx, dy] of slag === 1 ? [[2, -3], [5, -5], [6, -2]] : [[4, -7], [8, -8], [9, -4]]) { prick(B, 38 + dx, fot - 5 + dy, 'senap', 3); prick(B, 39 + dx, fot - 5 + dy, 'jord', 3); }
      // gräva: gropen där spaden går ner och högen bakom; jordklumpar flyger upp ur gropen vid slaget
      for (let y = -2; y <= 2; y++) for (let x = -5; x <= 5; x++) if (x * x / 25 + y * y / 4 <= 1) B.satt(96 + x, fot + 1 + y, P.i('jord', y < 0 ? 0 : 1));
      for (let y = -4; y <= 0; y++) for (let x = -5; x <= 5; x++) if (x * x / 25 + (y + 0.5) ** 2 / 16 <= 1) B.satt(108 + x, fot + 2 + y, P.i('jord', y === -4 ? 3 : x < 0 ? 2 : 1));
      const h2 = figur(B, 88, fot, 5203, 'sida', 'sta', arm === 'framfor' ? 'hanga' : arm, 'spade');
      if (slag) for (const [dx, dy] of slag === 1 ? [[2, -3], [5, -5]] : [[6, -8], [9, -6], [11, -3]]) { prick(B, 96 + dx, fot - 1 + dy, 'jord', 1); prick(B, 97 + dx, fot - 1 + dy, 'jord', 2); }
      // slå flinta: sittande; flintknölen på marken framför och slagstenen i handen
      const kx = 148, ky = fot - 1;
      for (const [dx, dy, t] of [[-1, 0, 1], [0, 0, 2], [1, 0, 1], [2, 0, 0], [-1, -1, 2], [0, -1, 3], [1, -1, 2], [0, -2, 2]]) B.satt(kx + dx, ky + dy, P.i('skiffer', t));
      for (let dx = -1; dx <= 2; dx++) B.morka(kx + dx, ky + 1);
      figur(B, 140, fot, 5307, 'sida', 'sitta', arm === 'framfor' ? 'hanga' : arm, 'sten');
      if (slag) for (const [dx, dy] of slag === 1 ? [[3, -3], [-2, -4]] : [[6, -5], [-4, -6], [5, 0]]) prick(B, kx + dx, ky - 2 + dy, 'skiffer', 3);
      if (stil === 'svep' && slag === 1) for (const [dx, dy] of [[0, -4], [2, -3], [-2, -3]]) prick(B, kx + dx, ky - 1 + dy, 'ben', 3); // slaget lyser
    });
  }

  // ---------- striden (5.1.9.5) ----------
  // två bybor mot varandra, den till vänster med slagträ och den till höger med spjut. En följd av lägen för båda och
  // var träffen syns: [vänsters arm, högers arm, träff (0, vänster träffar, höger träffar), vänsters steg, högers steg]
  const STRID = {
    tva: [['lyfta', 'framfor', 0, 0, 0], ['sla', 'hanga', 1, 0, 0]],
    knuff: [['lyfta', 'framfor', 0, 0, 0], ['sla', 'hanga', 1, 2, 3], ['hanga', 'lyfta', 0, 0, 2], ['framfor', 'sla', 2, -2, 0]],
    dans: [['hanga', 'hanga', 0, 0, 0, 'gang1'], ['lyfta', 'framfor', 0, 1, 0, 'gang2'], ['sla', 'hanga', 1, 3, 3, 'sta'], ['hanga', 'lyfta', 0, 0, 2, 'gang1'], ['framfor', 'sla', 2, -2, 0, 'sta'], ['hanga', 'hanga', 0, 0, 0, 'gang2']],
  };
  function blixt(B, x, y) { // träffen: en liten stjärna
    for (const [dx, dy, t] of [[0, 0, 3], [-1, 0, 3], [1, 0, 3], [0, -1, 3], [0, 1, 3], [-2, -2, 2], [2, -2, 2], [-2, 2, 2], [2, 2, 2], [-3, 0, 2], [3, 0, 2]]) B.satt(x + dx, y + dy, B.P.i(t === 3 ? 'ben' : 'senap', 3), true);
  }
  function dammet(B, x, fot) { for (const [dx, dy] of [[-4, 0], [-2, -1], [3, -1], [5, 0]]) { B.morka(x + dx, fot + dy); prick(B, x + dx, fot + dy - 1, 'jord', 3); } }
  function stridScen(stil) {
    const F = STRID[stil];
    return SCEN(96, 44, F.length, stil === 'tva' ? 400 : 230, (B, P, r) => {
      gras(B);
      const [aV, aH, traff, sV, sH, ben] = F[r], fot = 36, xv = 38 + sV, xh = 58 + sH;
      figur(B, xv, fot, 6101, 'sida', ben || 'sta', aV, 'tra');
      figur(B, xh, fot, 6211, 'vast', ben === 'gang1' ? 'gang2' : ben === 'gang2' ? 'gang1' : 'sta', aH, 'spjut');
      if (traff === 1) blixt(B, xh - 3, fot - 14);
      if (traff === 2) blixt(B, xv + 3, fot - 13);
      if (stil === 'dans' && traff) dammet(B, traff === 1 ? xh : xv, fot);
    });
  }

  const T = 'Steg 5.2.4.8 (till 5.1.9): ';
  VAL.push(
    { id: 'a_eld', stor: true, namn: 'Elden och röken', typ: 'tre', vad: T + 'lägerelden fladdrar och röken stiger från elden och från rökhålet i en hydda (5.1.9.1). Sex bilder som går runt. Hyddan är en platshållare; husen ritas för sig.',
      versioner: [
        { text: 'Version 1: lugn. Lågorna andas lite, röken stiger långsamt och rakt.', ...eldScen('lugn') },
        { text: 'Version 2: livlig. Lågorna byter höjd fortare, gnistor stiger och röken går högre.', ...eldScen('livlig') },
        { text: 'Version 3: i vind. Lågorna och röken lutar åt höger.', ...eldScen('vind') }] },
    { id: 'a_arbete', stor: true, namn: 'Arbetena', typ: 'tre', vad: T + 'hugga (yxan mot en stubbe), gräva (spaden vid en grop) och slå flinta (sittande, en slagsten mot flintknölen), med kartfiguren från 5.2.2 (5.1.9.4). Flisor, jord och flintsplitter flyger vid slaget.',
      versioner: [
        { text: 'Version 1: två bilder, upp och ner, långsamt.', ...arbeteScen('tva') },
        { text: 'Version 2: fyra bilder: upp, håller kvar, slår och det flyger längre.', ...arbeteScen('fyra') },
        { text: 'Version 3: fyra bilder med ett ljust svep vid slaget och armen tillbaka framför kroppen.', ...arbeteScen('svep') }] },
    { id: 'a_strid', stor: true, namn: 'Striden', typ: 'tre', vad: T + 'två bybor mot varandra, med slagträ och spjut (5.1.9.5). En ljus stjärna där slaget träffar.',
      versioner: [
        { text: 'Version 1: två bilder: den till vänster lyfter och slår, den andra skyddar sig.', ...stridScen('tva') },
        { text: 'Version 2: fyra bilder: de slår växelvis och den som träffas knuffas bakåt.', ...stridScen('knuff') },
        { text: 'Version 3: sex bilder: de trampar, slår växelvis, knuffas bakåt och dammet yr.', ...stridScen('dans') }] },
  );
})();
