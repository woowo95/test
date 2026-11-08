// Björns svar på kläderna och det man bär: axelremmen, bältet, byxorna, skjortan, snöskorna, halsbandet och mössan.
// Varje kort byter ut kortet med samma id i VAL. Ritfunktionerna är kopierade ur fas7/7.1-bara.js, 7.7a-skinn-och-lader.js
// och 7.7b-lin.js (de är inte exporterade), och ändrade där Björn bett om det.
(() => {
  const { hash, KORT, ell, linje, poly, och, utan, punkt, rakt, former, bredd, lagg, MED_KONTUR } = window.F7;
  const byt = (kort) => { const i = VAL.findIndex(s => s.id === kort.id); if (i >= 0) VAL[i] = kort; else VAL.push(kort); };
  const JANEJ = (id, namn, vad, version) => ({ id, namn, typ: 'janej', vad, versioner: [version] });
  const fg = (B, s) => B.P.i(s.slice(0, -1), +s.slice(-1));

  // =====================================================================================================================
  // ur 7.1-bara.js: bybon på kartan med det som bärs (bakom, over, pa) och porträttet
  // =====================================================================================================================
  const FRO = 1, MED_ROCK = 22;
  const streck = (x0, y0, x1, y1, farg) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)), ut = []; for (let i = 0; i <= n; i++) { const t = n ? i / n : 0; ut.push([Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), typeof farg === 'function' ? farg(i, n) : farg]); } return ut; };
  const spegla = L => L.map(([x, y, c]) => [13 - x, y, c]);
  const bybo = (rikt, ben = 'sta', arm = 'hanga', fro = FRO) => window.BYBO ? window.BYBO(fro, rikt, ben, arm, null) : null;
  function figur(B, F, x0, y0, { bakom = [], over = [], pa = [] } = {}) {
    if (!F) return;
    const M = 8, W = F.w + 2 * M, H = F.h + 2 * M, g = new Array(W * H).fill(-1), fig = new Array(W * H).fill(false), egen = new Array(W * H).fill(false);
    const i = (x, y) => (y + M) * W + x + M, inne = (x, y) => x >= -M && y >= -M && x < F.w + M && y < F.h + M;
    for (const [x, y, c] of bakom) if (inne(x, y)) { g[i(x, y)] = fg(B, c); egen[i(x, y)] = true; }
    for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) { const c = F.px[y * F.w + x]; if (c >= 0) { g[i(x, y)] = c; fig[i(x, y)] = true; egen[i(x, y)] = false; } }
    for (const [x, y, c] of over) if (inne(x, y)) { g[i(x, y)] = fg(B, c); if (!fig[i(x, y)]) egen[i(x, y)] = true; }
    for (const [x, y, c] of pa) if (inne(x, y) && fig[i(x, y)] && F.px[y * F.w + x] !== fg(B, 'kol0')) g[i(x, y)] = fg(B, c);
    const ut = g.slice(), kol = fg(B, 'kol0');
    for (let y = -M; y < F.h + M; y++) for (let x = -M; x < F.w + M; x++) if (g[i(x, y)] < 0 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inne(x + dx, y + dy) && egen[i(x + dx, y + dy)])) ut[i(x, y)] = kol;
    for (let y = -M; y < F.h + M; y++) for (let x = -M; x < F.w + M; x++) { const c = ut[i(x, y)]; if (c >= 0) B.satt(x0 + x, y0 + y, c); }
    for (let x = 3; x < F.w - 3; x++) B.morka(x0 + x, y0 + F.h);
  }
  // porträttet (64 × 64): opt ändrar delarna, andra(x, y, c) ger en ny ton eller null, person ändrar personen (hud, hår)
  function portratt(B, x0, y0, opt, andra = () => null, person = {}) {
    const PR = window.PORTRATTEN; if (!PR) return;
    const m = PR.neutral('man'); m.alder = 'vuxen'; m.klader = { rock: 'harskinn', skor: true, balte: false }; Object.assign(m.del, opt); Object.assign(m, person);
    const Q = PR.portratt(m);
    for (let y = 0; y < Q.h; y++) for (let x = 0; x < Q.w; x++) { const c = Q.px[y * Q.w + x]; if (c < 0) continue; const n = andra(x, y, c); B.satt(x0 + x, y0 + y, n ? fg(B, n) : c); }
  }
  const band = (ax, ay, bx, by, b, farg) => (x, y) => {
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy), t = ((x + 0.5 - ax) * dx + (y + 0.5 - ay) * dy) / (L * L), s = ((x + 0.5 - ax) * -dy + (y + 0.5 - ay) * dx) / L + b / 2;
    return t >= 0 && t <= 1 && s >= 0 && s < b ? farg(Math.floor(s), t, x, y) : null;
  };
  const paRock = (f, y0 = 49) => (x, y, c) => y >= y0 && y < 62 && x >= 2 && x < 62 && c >= 4 ? f(x, y) : null;
  const KANT = 4, TOPP = 8;
  function kort(text, sak, figurer, port) {
    const sw = sak ? bredd(sak[0]) : 0, fw = figurer.length * 18, w = KANT + sw + (sak ? 6 : 0) + fw + (port ? 66 : 0) + KANT, h = Math.max(TOPP + 20 + 6, port ? 72 : 0);
    return { text, w, h, rita: (B) => {
      const fot = port ? 50 : h - 6;
      if (sak) lagg(B, sak[0], sak[1], KANT, fot - sak[0].length);
      figurer.forEach(([F, lager], n) => figur(B, F(), KANT + sw + (sak ? 6 : 0) + n * 18 + 2, fot - 19, lager));
      if (port) portratt(B, w - KANT - 64, 4, port[0], port[1]);
    } };
  }

  // ---------- 7.1.2 axelremmen: version 1, remmen över ena axeln ----------
  // Björn: "Se till att bältet går över ena axeln på den lilla karaktären". Framifrån går remmen från höger axel (bybons
  // vänstra) snett över bröstet ner till andra höften, bakifrån åt andra hållet, och från sidan över axeln och snett ner
  // över bröstet. Spjutet på ryggen ligger som förut, parallellt med remmen.
  const spjut = (x0, y0, x1, y1) => streck(x0, y0, x1, y1, i => i === 0 ? 'skiffer3' : i === 1 ? 'skiffer2' : 'jord2');
  const remSak = () => [former(14, 9, [[utan(ell(7, 4.5, 6.5, 4), ell(7, 4.5, 4, 1.8)), (x, y) => y < 3 ? 'L' : y > 6 ? 'm' : 'l'], [rakt(9, 6, 12, 9), 'r']]), { L: 'jord1', l: 'jord0', m: 'kol1', r: 'ben2' }];
  // remmen: mörk, med en ljusare punkt där den ligger över axeln
  const rem = (pts) => pts.map(([x, y], n) => [x, y, n === 0 ? 'jord1' : 'jord0']);
  // närmare halsen än förut på den lilla bybon (Björn: "Den ska sitta lite närmre halsen i lilla vyn"), och längre ut i porträttet
  const axelFram = { bakom: spjut(12, -4, 0, 17), pa: rem([[9, 7], [8, 8], [7, 9], [6, 10], [5, 11], [4, 12], [4, 13]]), over: [[9, 6, 'jord1'], [10, 6, 'jord0']] };
  const axelBak = { over: [...spjut(1, -4, 12, 16), [4, 6, 'jord1'], [3, 6, 'jord0']], pa: rem([[4, 7], [5, 8], [6, 9], [7, 10], [8, 11], [9, 12], [9, 13]]) };
  const axelSida = { over: [...spjut(2, -4, 5, 16), [6, 6, 'jord1'], [7, 6, 'jord0']], pa: rem([[6, 7], [7, 8], [7, 9], [8, 10], [8, 11], [8, 12]]) };
  const axelPort = paRock(band(49, 48, 38, 64, 4, s => ['ben1', 'jord1', 'jord0', 'kol0'][s]));
  byt(JANEJ('f7_axelrem', 'Axelremmen', 'Steg 7.1.2: axelremmen av skinn bär ett långt redskap på ryggen. Du valde version 1, den smala, mörka remmen av skinn. På den lilla bybon går remmen nu över ena axeln och snett över bröstet ner till den andra höften (bakifrån åt andra hållet), parallellt med spjutet på ryggen. Till vänster remmen som sak, sedan bybon framifrån, från sidan, bakifrån och i ett gångsteg, och sist i porträttet som förut. Nu sitter remmen närmare halsen på den lilla bybon och längre ut på axeln i porträttet. Din kommentar förra gången: ”Den ska sitta lite närmre halsen i lilla vyn. Och lite längre bort från halsen i porträttet.”',
    kort('En smal, mörk rem av skinn över ena axeln och snett över bröstet.', remSak(), [[() => bybo('fram'), axelFram], [() => bybo('sida'), axelSida], [() => bybo('bak'), axelBak], [() => bybo('sida', 'gang1', 'gang1'), axelSida]], [{ redskap: 'redskap-flintspjut' }, axelPort])));

  // ---------- 7.1.4 bältet med krokarna, utan redskapen ----------
  // Björn: "Verktygen i bältet behöver inte synas". Tre nya bälten på bybon med rock, utan kniven och yxan: bältet går runt
  // midjan (rad 11 på kartfiguren) bakom armarna. Som sak ligger det i en ring.
  const ring = (w, h, ton, extra = []) => former(w, h, [[utan(ell(w / 2, h / 2, w / 2 - 0.6, h / 2 - 0.6), ell(w / 2, h / 2 - 0.4, w / 2 - 3, h / 2 - 2.6)), ton], ...extra]);
  const krok = (x, y, ton) => [linje([[x, y], [x, y - 2.2], [x + 1, y - 2.8], [x + 1.8, y - 2.2]], 0.5), ton];
  // ett bälte på figuren: rader(x, y) ger tonen för punkten i bältet (eller null), xs är bältets punkter i varje riktning
  const XS = { fram: [4, 5, 6, 7, 8, 9], sida: [5, 6, 7, 8], bak: [4, 5, 6, 7, 8, 9] };
  const balteLager = (rader, ton, extra = {}) => {
    const ut = {};
    for (const r of ['fram', 'sida', 'bak']) {
      const pa = [];
      for (const y of rader) for (const x of XS[r]) { const t = ton(x, y, r); if (t) pa.push([x, y, t]); }
      ut[r] = { pa: [...pa, ...((extra[r] || {}).pa || [])], over: (extra[r] || {}).over || [] };
    }
    ut.vast = { pa: spegla(ut.sida.pa), over: spegla(ut.sida.over) };
    return ut;
  };
  const BALTE = [
    { // 1: ett tvinnat rep som i spelet, med två små krokar av böjda grenar vid höfterna
      sak: () => [ring(18, 9, (x, y) => (Math.floor(x) + Math.floor(y)) % 2 ? 'R' : 'r', [krok(5.5, 7, 'k'), krok(11.5, 7, 'k')]), { R: 'senap2', r: 'senap1', k: 'jord1' }],
      lager: balteLager([11], (x) => x % 2 ? 'senap2' : 'senap1', {
        fram: { pa: [[4, 12, 'jord3'], [9, 12, 'jord3']] }, bak: { pa: [[4, 12, 'jord3'], [9, 12, 'jord3']] }, sida: { pa: [[8, 12, 'jord3']] } }),
    },
    { // 2: ett brett bälte av mörkt skinn med ett spänne av ben framtill
      sak: () => [ring(18, 9, (x, y) => y < 2.5 ? 'L' : y > 6.5 ? 'm' : 'l', [[rakt(7.5, 6, 10.5, 9), (x, y) => y < 7 || x < 8.5 ? 'B' : 'b']]), { L: 'jord1', l: 'jord0', m: 'kol1', B: 'ben3', b: 'ben1' }],
      lager: balteLager([11, 12], (x, y, r) => r === 'fram' && (x === 6 || x === 7) ? (x === 6 ? 'ben3' : 'ben1') : y === 11 ? 'jord1' : 'jord0', {
        sida: { pa: [[8, 11, 'ben2'], [8, 12, 'ben1']] } }),
    },
    { // 3: ett flätat rep i två färger, knutet i sidan med två ändar som hänger ner
      sak: () => [ring(18, 9, (x, y) => (Math.floor(x) + (y < 4.5 ? 0 : 1)) % 2 ? 'R' : 'r', [[linje([[13, 6.5], [14, 8.5]], 0.6), 'R'], [linje([[12, 7], [12.5, 9]], 0.6), 'r'], [ell(12.6, 6.4, 1.2, 1), 'k']]), { R: 'ben2', r: 'senap1', k: 'senap2' }],
      lager: balteLager([11], (x) => x % 2 ? 'ben2' : 'senap1', {
        fram: { pa: [[8, 11, 'senap2'], [8, 12, 'ben2'], [9, 12, 'senap1'], [8, 13, 'senap1']] },
        bak: { pa: [[5, 11, 'senap2'], [5, 12, 'ben2'], [4, 12, 'senap1'], [5, 13, 'senap1']] },
        sida: { pa: [[7, 11, 'senap2'], [7, 12, 'ben2'], [8, 12, 'senap1'], [7, 13, 'senap1']] } }),
    },
  ];
  // Björn valde version 1 (det tvinnade repet, som redan är byggt i spelet) och vill se bältet i ett sammanhang i lagret, och
  // mindre som symbol där. Symbolen är nu lika stor som de andra sakerna i förrådet (en fjärdedel av en ruta, 8 × 8 punkter):
  // en liten ring av tvinnat rep med två krokar som hänger under. Bilden visar tre rutor av förrådet på marken, med fyra saker på
  // varje som i spelet, och bybon med bältet på sig bredvid.
  // konturen bara utanför, så att gräset syns i hålet; krokarna hänger under ringen
  const balteSym = ['..oooo..', '.onpnpo.', 'op....no', 'on....po', '.opnpno.', '.odoodo.', '..o..o..'];
  const LAGRET = [['rep', 'skinn', 'flinta', 'kniv'], ['grenar', 'BALTE', 'sten', 'kott'], ['fisk', 'svamp', 'torrgras', 'BALTE']];
  byt(JANEJ('f7_balte', 'Bältet', 'Steg 7.1.4: bältet med krokarna, som bybon bär två redskap i så att händerna är fria. Du valde version 1, det tvinnade repet som redan är bältet i spelet. Som symbol i förrådet är bältet nu lika litet som de andra sakerna där (en fjärdedel av en ruta): en ring av tvinnat rep med två krokar som hänger under. Bilden visar tre rutor av förrådet med fyra saker på varje, två av dem bälten, och bybon med bältet på sig bredvid. Din kommentar förra gången: ”visa bältet i ett sammanhang när det ligger i ett lager. Gör bältet mindre som symbol i lagret”', {
    text: 'Bältet som en liten symbol bland de andra sakerna i förrådet, och på bybon bredvid.', w: 4 + 48 + 6 + 14 + 4, h: 4 + 22 + 3, rita: (B) => {
      window.F7.gras(B);
      const y0 = 4 + 22 - 16 - 1;
      LAGRET.forEach((l, t) => l.forEach((k, j) => {
        const x = 4 + t * 16 + (j % 2) * 8, y = y0 + Math.floor(j / 2) * 8;
        if (k === 'BALTE') lagg(B, balteSym, L, x, y); else if (typeof ritaIkon === 'function') ritaIkon(B, k, x, y);
      }));
      const b = window.BYBO ? window.BYBO(MED_ROCK, 'fram', 'sta', 'hanga', null, { balte: false, krokar: 0 }) : null;
      figur(B, b, 4 + 48 + 6, 4 + 22 - 20, BALTE[0].lager.fram);
    } }));
  // =====================================================================================================================
  // ur 7.7a-skinn-och-lader.js: plaggen på kartfiguren och som sak
  // =====================================================================================================================
  const L = {
    a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3', e: 'skiffer0', f: 'skiffer1', g: 'skiffer2', h: 'skiffer3',
    i: 'ben0', j: 'ben1', k: 'ben2', l: 'ben3', m: 'senap0', n: 'senap1', p: 'senap2', q: 'senap3',
    r: 'rost0', s: 'rost1', t: 'rost2', u: 'rost3', x: 'kol1', y: 'kol2', z: 'kol3',
  };
  const RAMP = { kanin: 'abcd', varg: 'efgh', ben: 'ijkl', senap: 'mnpq', rost: 'rstu', lader: 'abcd' };
  const T = (mat, t) => RAMP[mat][Math.max(0, Math.min(3, t))];
  const I = (P, ch) => { const v = L[ch]; return P.i(v.slice(0, -1), +v.slice(-1)); };
  const sida = (x, x0, x1) => { const u = (x - x0) / Math.max(1, x1 - x0); return u < 0.22 ? 3 : u > 0.78 ? 1 : 2; };
  const pals = (mat, x0, x1, s = 1) => (x, y) => { const t = sida(x, x0, x1), r = hash(Math.floor(x), Math.floor(y), s); return T(mat, r < 0.16 ? t + 1 : r > 0.86 ? t - 1 : t); };
  const slat = (mat, x0, x1) => (x) => T(mat, sida(x, x0, x1));
  const rep = (x, y) => (Math.floor(x) + Math.floor(y)) % 2 ? 'k' : 'j';
  const M = 3;
  function kladd(F, mal, P) {
    const W = F.w + 2 * M, H = F.h + 2 * M, g = new Array(W * H).fill(-1);
    for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) g[(y + M) * W + x + M] = F.px[y * F.w + x];
    const ute = new Uint8Array(W * H), st = [];
    for (let x = 0; x < W; x++) st.push(x, (H - 1) * W + x);
    for (let y = 0; y < H; y++) st.push(y * W, y * W + W - 1);
    while (st.length) { const i = st.pop(); if (ute[i] || g[i] > 0) continue; ute[i] = 1; const x = i % W, y = (i / W) | 0; if (x > 0) st.push(i - 1); if (x < W - 1) st.push(i + 1); if (y > 0) st.push(i - W); if (y < H - 1) st.push(i + W); }
    for (let i = 0; i < g.length; i++) if (ute[i]) g[i] = -1;
    let under = false;
    const satt = (x, y, c) => { const X = x + M, Y = y + M; if (X < 0 || Y < 0 || X >= W || Y >= H) return; g[Y * W + X] = c; if (y >= F.h && c >= 0) under = true; };
    const las = (x, y) => { const X = x + M, Y = y + M; return X < 0 || Y < 0 || X >= W || Y >= H ? -1 : g[Y * W + X]; };
    mal(satt, las, P, ch => I(P, ch));
    const ut = g.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (g[y * W + x] >= 0 || (!under && y >= F.h + M)) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < W && Y < H && g[Y * W + X] >= 0; })) ut[y * W + x] = 0;
    }
    return { w: W, h: H, px: ut, fot: F.h - 1 + M };
  }
  const MAN = 1;
  const figurPlagg = (mal, P, fro, rikt = 'fram') => { const F = window.BYBO && window.BYBO(fro || MAN, rikt, 'sta', 'hanga', null); return F ? kladd(F, mal, P) : null; };
  const sno = (B) => { for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) { const r = hash(x, y, 77); B.satt(x, y, B.P.i(r < 0.03 ? 'skiffer' : 'ben', r < 0.03 ? 3 : r < 0.14 ? 2 : 3)); } };
  // ett plagg i porträttet: lista är former i porträttets punkter (64 × 64) som får konturen, tunt ritas efteråt utan kontur.
  // Allt hålls innanför ramen (x och y 2–61)
  // paKropp: det tunna ritas bara på personen, inte på bakgrunden (färgerna 0–3)
  const PORT = (lista, tunt = [], person = {}, paKropp = false) => (B, x0, y0) => {
    const ram = (f) => (x, y) => x >= 2 && x < 62 && y >= 2 && y < 62 && f(x, y);
    const g = former(64, 64, lista.map(([f, t]) => [ram(f), t])), h = tunt.length ? former(64, 64, tunt.map(([f, t]) => [ram(f), t]), false) : null;
    portratt(B, x0, y0, {}, (x, y, c) => {
      if (x < 2 || x >= 62 || y < 2 || y >= 62) return null;
      const t = h && h[y][x] !== '.' && (!paKropp || c >= 4) ? h[y][x] : g[y][x];
      return t === '.' ? null : t === 'o' ? 'kol0' : L[t];
    }, person);
  };
  // kortet: saken till vänster, figurerna med fötterna på samma rad och sist porträttet (om det finns)
  const SCEN = (text, rader, figurer = [], opt = {}) => {
    const m = 4, mellan = 7, fw = 14 + 2 * M, sw = rader ? bredd(rader) : 0, pw = opt.port ? 64 + mellan : 0;
    const h = Math.max(Math.max(rader ? rader.length : 0, figurer.length ? 20 + M : 0) + 2 * m, opt.port ? 72 : 0), fot = h - m - 1;
    const w = m + sw + (rader && figurer.length ? mellan : 0) + figurer.length * (fw + 1) + pw + m;
    return { text, w, h, rita: (B) => {
      if (opt.sno) sno(B);
      if (rader) lagg(B, rader, L, m, fot - rader.length + 1);
      figurer.forEach(([mal, fro, rikt], n) => {
        const G = figurPlagg(mal, B.P, fro, rikt); if (!G) return;
        const x0 = m + sw + (rader ? mellan : 0) + n * (fw + 1), y0 = fot - G.fot;
        for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) { const c = G.px[y * G.w + x]; if (c >= 0) B.satt(x0 + x, y0 + y, c); }
        let sista = -1; for (let y = G.h - 1; y >= 0 && sista < 0; y--) for (let x = 0; x < G.w; x++) if (G.px[y * G.w + x] >= 0) { sista = y; break; }
        for (let x = 0; x < G.w; x++) if (G.px[sista * G.w + x] >= 0) B.morka(x0 + x, y0 + sista + 1);
      });
      if (opt.port) opt.port(B, w - m - 64, Math.floor((h - 64) / 2));
    } };
  };
  const zon = (satt, C, xs, ys, f) => { for (const y of ys) for (const x of xs) { const ch = f(x, y); if (ch) satt(x, y, C(ch)); } };
  const fran = (a, b) => [...Array(b - a + 1)].map((_, i) => a + i);

  // ---------- 7.7.1 byxorna: formen från version 3, enfärgade ----------
  // Björn: "Använd formen från version 3 men gör dem enfärgade". Långa byxor av läder, bara ljus och skugga i samma bruna
  // ton: utan pälskanten i linningen och nertill och utan snörningen längs sidorna.
  const byxSak = () => {
    const ned = 11, form = poly([[1.5, 1], [9.5, 1], [10.2, ned + 0.5], [6.3, ned + 0.5], [5.5, 4.5], [4.7, ned + 0.5], [0.8, ned + 0.5]]);
    return former(12, ned + 2, [
      [form, (x) => slat('lader', 1, 10)(x)],
      [rakt(1.5, 1, 9.5, 2), (x) => (x < 3 ? 'c' : x > 8.5 ? 'a' : 'b')], // linningen: en söm, en ton mörkare
      [och(punkt(5, 3), punkt(5, 4)), 'b']]); // sömmen mellan benen
  };
  const byxFig = (satt, las, P, C) => {
    const ben = (x) => T('lader', x === 4 || x === 8 ? 3 : 2);
    zon(satt, C, [4, 5, 8, 9], fran(12, 18), (x, y) => (x === 9 || x === 5) && y > 13 ? 'b' : ben(x));
    zon(satt, C, [6, 7], fran(12, 14), (x, y) => y === 14 ? 'b' : ben(x));
    zon(satt, C, fran(4, 9), [12], (x) => (x === 4 ? 'c' : 'b'));
  };
  byt(JANEJ('f7_byxor', 'Byxorna', 'Steg 7.7.1: byxor som sys av 2 skinn och 1 rep och håller benen varma i kylan. Du valde version 3; formen är densamma, men byxorna är nu enfärgade: brunt läder med bara ljus och skugga, utan pälskanten i linningen och nertill och utan snörningen längs sidorna. Bilden visar byxorna som sak och på en bybo. Din kommentar förra gången: "Använd formen från version 3 men gör dem enfärgade"',
    SCEN('Långa byxor av enfärgat brunt läder.', byxSak(), [[byxFig]])));

  // ---------- 7.7.2 mössan: samma tre, och i porträttet ----------
  const mossSak = (v) => {
    if (v === 3) return former(10, 8, [ // version 3 smalare: pälskanten sticker inte ut lika långt på sidorna
      [ell(5, 3.6, 3.4, 3.2), slat('lader', 1.6, 8.4)],
      [och(rakt(1.4, 4.5, 8.6, 7.2), ell(5, 4.6, 4, 1.5)), pals('varg', 1.4, 8.6, 11)],
      [rakt(1.4, 4.5, 8.6, 5.4), (x, y) => (hash(Math.floor(x), 7, 2) < 0.5 ? 'h' : 'g')],
      [och(punkt(5, 0), punkt(4, 1)), 'b']]);
    if (v === 0) return former(11, 9, [
      [och(ell(5.5, 3.6, 4.4, 3.4), rakt(1.1, 3.6, 9.9, 5.6), rakt(1.1, 5, 3, 7.6), rakt(8, 5, 9.9, 7.6)), pals('kanin', 1, 10, 6)],
      [rakt(1.1, 4.6, 9.9, 5.6), (x, y) => (Math.floor(x) % 3 ? 'd' : 'c')],
      [och(punkt(1, 8), punkt(9, 8)), 'k']]);
    if (v === 1) return former(12, 12, [
      [poly([[1.5, 10.5], [2.5, 5], [4.5, 2], [7, 0.8], [9.2, 1.4], [8, 2.6], [9.5, 10.5]]), pals('varg', 1.5, 9.5, 8)],
      [ell(9.6, 2.6, 1.3, 1.3), (x, y) => (y < 2.6 ? 'h' : 'g')],
      [rakt(1.2, 8.2, 9.8, 10.5), (x, y) => (hash(Math.floor(x), Math.floor(y), 12) < 0.5 ? 'h' : 'g')]]);
    return former(12, 8, [
      [ell(6, 3.6, 3.6, 3.2), slat('lader', 2.5, 9.5)],
      [och(rakt(0.8, 4.5, 11.2, 7.2), ell(6, 4.6, 5.3, 1.5)), pals('varg', 1, 11, 11)],
      [rakt(0.8, 4.5, 11.2, 5.4), (x, y) => (hash(Math.floor(x), 7, 2) < 0.5 ? 'h' : 'g')],
      [och(punkt(6, 0), punkt(5, 1)), 'b']]);
  };
  const mossFig = (v) => (satt, las, P, C) => {
    if (v === 0) {
      zon(satt, C, fran(5, 8), [-1], (x) => T('kanin', sida(x, 5, 8)));
      zon(satt, C, fran(4, 9), [0, 1], (x, y) => { const r = hash(x, y, 31); const t = sida(x, 4, 9); return T('kanin', r < 0.2 ? t + 1 : t); });
      zon(satt, C, fran(3, 10), [2], (x) => (x % 3 ? 'd' : 'c'));
      zon(satt, C, [3, 10], [3, 4], (x) => T('kanin', x === 3 ? 3 : 1));
      zon(satt, C, [3, 10], [5], () => 'k');
    } else if (v === 1) {
      const pr = [[7, -4], [8, -4], [6, -3], [7, -3], [9, -3], [5, -2], [6, -2], [7, -2], [8, -2], [10, -2]];
      for (const [x, y] of pr) satt(x, y, C(T('varg', x === 10 ? 2 : sida(x, 5, 9))));
      satt(10, -3, C('h')); satt(11, -2, C('g')); satt(11, -1, C('f'));
      zon(satt, C, fran(4, 9), [-1, 0, 1], (x, y) => { const r = hash(x, y, 41); const t = sida(x, 4, 9); return T('varg', r < 0.2 ? t + 1 : r > 0.85 ? t - 1 : t); });
      zon(satt, C, fran(3, 10), [2], (x) => T('varg', x < 5 ? 2 : 1));
    } else {
      const k0 = v === 3 ? 4 : 3, k1 = v === 3 ? 9 : 10; // version 3 smalare: kanten går inte ut över huvudets sidor
      zon(satt, C, fran(5, 8), [-2], (x) => T('lader', sida(x, 5, 8)));
      zon(satt, C, fran(4, 9), [-1, 0], (x) => T('lader', sida(x, 4, 9)));
      zon(satt, C, fran(k0, k1), [1], (x) => (x % 2 ? 'h' : 'g'));
      zon(satt, C, fran(k0, k1), [2], (x) => T('varg', sida(x, k0, k1)));
    }
  };
  // mössan i porträttet: huvudet når från rad 7 till hakan vid rad 47, x 13–51; pannan börjar vid rad 16
  const pmossa = (v) => {
    const fur = (mat, x0, x1, seed) => (x, y) => { const r = hash(Math.floor(x), Math.floor(y), seed), t = sida(x, x0, x1); return T(mat, r < 0.16 ? t + 1 : r > 0.86 ? t - 1 : t); };
    if (v === 0) return PORT([ // rund av kaninskinn med öronlappar och band som knyts under hakan
      [och(utan(ell(32, 21, 20.5, 17), (x, y) => y > 21), poly([[11.5, 20], [20.5, 20], [20.5, 30], [18.5, 37.5], [14, 37.5], [11.5, 32]]), poly([[43.5, 20], [52.5, 20], [52.5, 32], [50, 37.5], [45.5, 37.5], [43.5, 30]])), fur('kanin', 11, 53, 6)],
      [utan(rakt(11.5, 16, 52.5, 22), rakt(20.5, 20, 43.5, 30)), (x, y) => { const r = hash(Math.floor(x), Math.floor(y), 9); return y < 17 ? 'd' : x > 46 ? (r < 0.5 ? 'b' : 'c') : r < 0.6 ? 'd' : 'c'; }],
      // banden av ljust skinn från lapparna ner under hakan, knutna i en rosett
      [och(linje([[16, 37], [18.5, 43], [24, 47.6], [30.5, 49.5]], 0.75), linje([[48, 37], [45.5, 43], [40, 47.6], [33.5, 49.5]], 0.75)), (x, y) => (x > 32 ? 'j' : 'k')],
      [och(ell(32, 49.8, 1.6, 1.4), linje([[31, 50.5], [29.5, 53.5]], 0.6), linje([[33, 50.5], [34.5, 53.5]], 0.6)), (x, y) => (x < 31.5 && y < 50.5 ? 'l' : x > 33 ? 'j' : 'k')],
    ], [], { har: 5 });
    if (v === 1) return PORT([ // hög och spetsig av vargskinn, toppen faller åt sidan
      [och(poly([[11, 21], [14, 13], [20, 7], [28, 3.5], [37, 3], [43, 6], [48, 12], [53, 21]]), linje([[34, 4], [44, 2.8], [52, 4.5], [57, 9], [58.5, 15], [58, 20]], 3.6, 1.6)), (x, y) => {
        const r = hash(Math.floor(x), Math.floor(y), 41), skugga = x > 43 && y > 7 && y < 14 && x < 53; // skuggan under toppen som faller ner
        const t = skugga ? 1 : x > 54 ? (x < 57 ? 2 : 1) : sida(x, 11, 53); return T('varg', r < 0.16 ? t + 1 : r > 0.86 ? t - 1 : t); }],
      [ell(57.8, 22, 2.4, 2.4), (x, y) => (x < 57.5 && y < 22 ? 'h' : 'g')],
      [och(rakt(10, 16, 54, 22), ell(32, 16, 22, 2)), (x, y) => (hash(Math.floor(x / 2), Math.floor(y), 12) < 0.5 ? 'h' : 'g')],
      [rakt(10, 21, 54, 22), (x) => (x > 46 ? 'e' : 'f')],
    ], [], { har: 5 });
    const sm = v === 3, a0 = sm ? 12 : 9, a1 = sm ? 52 : 55; // version 3 smalare: kanten slutar vid huvudets sidor (x 13–51)
    return PORT([ // en kulle av läder med en bred, uppvikt pälskant
      [utan(ell(32, 15, 17.5, 12.5), (x, y) => y > 16), (x) => slat('lader', 15, 49)(x)],
      [och(rakt(a0, 13, a1, 22), ell(32, 13.5, sm ? 20 : 23, 3), ell(a0 + 0.5, 17.5, 1.5, 4.5), ell(a1 - 0.5, 17.5, 1.5, 4.5)), (x, y) => { const r = hash(Math.floor(x), Math.floor(y), 11); const t = sida(x, a0 - 1, a1 + 1); return T('varg', r < 0.18 ? t + 1 : r > 0.84 ? t - 1 : t); }],
      [rakt(a0 + 1, 12, a1 - 1, 14), (x, y) => (hash(Math.floor(x), 7, 2) < 0.5 ? 'h' : 'g')],
      [rakt(a0 + 1, 21, a1 - 1, 22), (x) => (x > 46 ? 'e' : 'f')],
    ], [[och(punkt(32, 4), punkt(31, 5), punkt(32, 6), punkt(31, 7), punkt(32, 8)), 'a'], [och(punkt(24, 7), punkt(40, 7)), 'b']], { har: 5 });
  };
  // ---------- 7.7.2 mössan: version 2, ritad på nytt som sak och på kartfiguren ----------
  // Björn valde version 2 (kullen av läder med en kant av vargpäls) och tyckte att porträttet var bra, men att mössan såg
  // konstig ut på den lilla bybon och som sak. Porträttet är detsamma. På kartan låg pälskanten i två ljusa rader över
  // ögonen och såg ut som glasögon: nu är kullen tre rader över huvudet och kanten en enda rad pälstoner över pannan,
  // ovanför ögonen. Som sak är mössan större och tydligare: en kulle av brunt läder, ljus till vänster, med en söm
  // och en knut i toppen, och en bred kant av grå vargpäls med ojämn ovankant.
  const mossSak2 = () => MED_KONTUR([
    '......ab......',
    '....dccbbb....',
    '...dccbbbba...',
    '..ddccbbbbba..',
    '..dcccbbbbba..',
    '.hghhghggfgf..',
    'hhghgghgfgffe.',
    'hgghggfgffefe.',
    '.ffffffeeeee..',
  ]);
  const mossFig2 = (satt, las, P, C) => {
    zon(satt, C, fran(5, 8), [-2], (x) => T('lader', sida(x, 5, 8)));
    zon(satt, C, fran(4, 9), [-1, 0], (x) => T('lader', sida(x, 4, 9)));
    zon(satt, C, fran(4, 9), [1], (x) => (x < 6 ? (x % 2 ? 'g' : 'h') : x > 8 ? 'f' : hash(x, 1, 12) < 0.5 ? 'g' : 'f'));
  };
  byt(JANEJ('f7_mossa', 'Mössan', 'Steg 7.7.2: en mössa av 1 skinn som håller huvudet varmt. Du valde version 2, kullen av läder med en kant av vargpäls. Porträttet är detsamma. På bybon på kartan ligger pälskanten nu i en rad över pannan, ovanför ögonen, i stället för två ljusa rader som såg ut som glasögon, och som sak är mössan större och tydligare: läderkullen med en söm och en knut i toppen och en bred kant av grå vargpäls. Din kommentar förra gången: ”den ser bra ut i portsättet men konstigt på den lilla gubben och som föremål i lagret.”',
    SCEN('Mössan av läder och vargpäls som sak, på en bybo på kartan och i porträttet.', mossSak2(), [[mossFig2, 5]], { port: pmossa(3) })));

  // ---------- 7.7.3 snöskorna: tvåans symbol, från olika håll ----------
  // Björn: "Använd tvåans symbol. Visa hur dem ser ut från olika vinklar". Snöskon är lång som en racket med grenarna knutna
  // i en svans bak. Framifrån pekar den runda spetsen mot oss (under fötterna); bakifrån pekar svansen mot oss och den runda
  // delen syns bakom benen; från sidan ligger skon lång och platt i snön med svansen bak och spetsen lite uppböjd fram.
  const SNOSKO = ['..cbb..', '.ck.kb.', 'c.k.k.b', 'cdddcbb', 'ck.k.kb', 'chggfbb', 'ck.k.kb', 'cdddcbb', '.ck.kb.', '.c.k.b.', '..ckb..', '..jkj..', '..cb...', '...b...'];
  const ytter = (rader) => {
    const w = bredd(rader) + 2, h = rader.length + 2, g = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (rader[y - 1] || '')[x - 1] || '.'));
    const ute = Array.from({ length: h }, () => Array(w).fill(false)), st = [[0, 0]];
    while (st.length) { const [x, y] = st.pop(); if (x < 0 || y < 0 || x >= w || y >= h || ute[y][x] || g[y][x] !== '.') continue; ute[y][x] = true; st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
    return g.map((r, y) => r.map((c, x) => (ute[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx] && g[y + dy][x + dx] !== '.') ? 'o' : c)).join(''));
  };
  const snoSak = () => { const s = SNOSKO, w = bredd(s); return ytter(s.map(r => r.padEnd(w, '.') + '.' + r.padEnd(w, '.'))); };
  // en sko per fot: [rader, x för radens första punkt per fot, första raden]. Punkterna ritas bara där figuren inte är
  // (benen och fötterna står framför skon), och under fötterna överallt
  // 'l' är snön som syns i hålen i flätan
  // mindre än förut på figuren (Björn: "Gör snöskorna lite mindre på karaktären"): fem punkter breda framifrån och bakifrån,
  // och från sidan tre rader i stället för fyra
  const SNOVY = {
    fram: { rader: ['.cbb.', 'ckldb', 'cdddb', '.abb.'], x: [2, 8], y: 18 },
    bak: { rader: ['.cbb.', 'cklkb', 'cdddb', '.ckb.', '..jk.', '..b..'], x: [2, 8], y: 16 },
    sida: { rader: ['...cbbbbbbbbb.', 'jkcdlkdklklkbb', '..abbbbbbbbba.'], x: [-1], y: 19 },
  };
  const snoFig = (rikt) => (satt, las, P, C) => {
    const V = SNOVY[rikt];
    for (const x0 of V.x) V.rader.forEach((r, dy) => [...r].forEach((ch, dx) => { const x = x0 + dx, y = V.y + dy; if (ch !== '.' && (y > 19 || las(x, y) < 0)) satt(x, y, C(ch)); }));
    // skorna av vargskinn som binds fast på snöskon
    const fotter = rikt === 'sida' ? [6, 7, 8] : [3, 4, 5, 8, 9, 10];
    zon(satt, C, fotter, [19], (x) => T('varg', fotter.indexOf(x) % 3 === 0 ? 3 : fotter.indexOf(x) % 3 === 2 ? 1 : 2));
  };
  byt(JANEJ('f7_snoskor', 'Snöskorna', 'Steg 7.7.3: snöskor av flätade grenar, rep och skinn, så att man inte sjunker ner i djup snö. Du valde version 2, den långa som en racket med grenarna knutna i en svans bak; symbolen är tvåans. Bybon på snöskorna från tre håll: framifrån (spetsen mot oss), bakifrån (svansen mot oss) och från sidan (skon lång och platt i snön). Nu är snöskorna mindre på bybon. Din kommentar förra gången: ”Gör snöskorna lite mindre på karaktären”',
    SCEN('Paret som sak, och bybon på snöskorna framifrån, bakifrån och från sidan.', snoSak(), [[snoFig('fram'), 4, 'fram'], [snoFig('bak'), 4, 'bak'], [snoFig('sida'), 4, 'sida']], { sno: true })));

  // ---------- 7.7.5 halsbandet: samma tre, och i porträttet ----------
  const HALS = [
    { text: 'Tre små ben på ett tvinnat rep.', delar: ['ben', 'ben', 'ben'] },
    { text: 'Tre vargtänder, den mittersta störst, med repet knutet runt roten.', delar: ['tand', 'tandL', 'tand'] },
    { text: 'En stor vargtand i mitten mellan två ben, med knutar på repet mellan dem.', delar: ['ben', 'tandL', 'ben'], knut: true },
  ];
  const halsSak = (v) => {
    const o = HALS[v], lista = [];
    lista.push([och(utan(ell(6.5, 0.5, 5.6, 6.2), ell(6.5, -0.4, 4.6, 6.2)), punkt(1, 0), punkt(11, 0)), rep]);
    const fasten = [[3.5, 5.6], [6.5, 6.8], [9.5, 5.6]];
    o.delar.forEach((d, n) => {
      const [fx, fy] = fasten[n], x0 = Math.floor(fx), y0 = Math.floor(fy);
      if (d === 'ben') lista.push([och(rakt(x0 - 1, y0, x0 + 1, y0 + 1), punkt(x0, y0 + 1), punkt(x0, y0 + 2), rakt(x0 - 1, y0 + 3, x0 + 1, y0 + 4)), (x, y) => (x < x0 ? 'l' : y < y0 + 3 ? 'k' : 'j')]);
      if (d === 'tand') lista.push([och(rakt(x0 - 1, y0, x0 + 1, y0 + 2), punkt(x0, y0 + 2), punkt(x0, y0 + 3)), (x, y) => (y < y0 + 1 ? 'q' : x < x0 ? 'l' : y > y0 + 2 ? 'j' : 'k')]);
      if (d === 'tandL') lista.push([och(rakt(x0 - 1, y0, x0 + 1, y0 + 3), punkt(x0, y0 + 3), punkt(x0, y0 + 4), punkt(x0 + 1, y0 + 5)), (x, y) => (y < y0 + 1 ? 'q' : x < x0 ? 'l' : y > y0 + 3 ? 'j' : 'k')]);
    });
    if (o.knut) lista.push([och(punkt(5, 6), punkt(8, 6), punkt(1, 3), punkt(11, 3)), 'b']);
    return former(14, 14, lista);
  };
  const halsFig = (v) => (satt, las, P, C) => {
    const t = HALS[v];
    satt(5, 8, C('j')); satt(8, 8, C('j')); satt(6, 9, C('k')); satt(7, 9, C('k'));
    const mitt = t.delar[1], sidor = t.delar[0];
    satt(6, 10, C('l')); satt(6, 11, C('k'));
    if (mitt === 'tandL') satt(7, 10, C('l'));
    if (sidor === 'ben') { satt(5, 9, C('l')); satt(8, 9, C('l')); } else { satt(5, 9, C('k')); satt(8, 9, C('k')); }
  };
  // halsbandet i porträttet: repet kommer fram under hakan på båda sidor (rad 48; hakan går ner till rad 47, x 22–38) och
  // hänger i en båge ner över pälskragen och bröstet, med den lägsta punkten mitt på bröstet (x 31, där rocken möts). Repet
  // är en punkt tjockt, tvinnat i två toner, med en mörk skugga snett under på rocken. Sakerna hänger rakt ner från repet:
  // den mittersta längst ner och de två andra högre upp på bågen, så som tyngden drar dem
  const HDEL = {
    ben: ['lkj', '.k.', '.k.', '.k.', 'lkj'],
    tand: ['qqq', 'lkj', 'lkj', '.kj', '.k.'],
    tandL: ['qqqq', 'lkkj', 'lkkj', '.kj.', '.k..'],
  };
  const phals = (v) => {
    const o = HALS[v], xc = 31, hw = 11.5, topp = 47.5, djup = 8.2, HAKA = 48;
    const ry = x => topp + djup * (1 - Math.abs((x - xc) / hw) ** 2.4);
    const tunt = Array.from({ length: 64 }, () => Array(64).fill('.')), del = Array.from({ length: 64 }, () => Array(64).fill('.'));
    const repRad = {};
    let n = 0;
    for (let x = Math.floor(xc - hw); x < Math.ceil(xc + hw); x++) {
      const a = Math.round(ry(x)), b = Math.round(ry(x + 1));
      const rader = b > a ? fran(a, b - 1) : b < a ? fran(b + 1, a) : [a];
      repRad[x] = Math.max(...rader);
      for (const y of rader) if (y >= HAKA) tunt[y][x] = n++ % 2 ? 'j' : 'l';
    }
    // skuggan under repet
    for (let y = 62; y >= 0; y--) for (let x = 0; x < 64; x++) if ('jl'.includes(tunt[y][x]) && tunt[y + 1][x] === '.') tunt[y + 1][x] = 'a';
    // sakerna: mitten av saken under repets punkt
    const plats = [-6.5, 0, 6.5];
    o.delar.forEach((d, i) => {
      const S = HDEL[d], w = S[0].length, cx = Math.round(xc + plats[i]), x0 = cx - Math.floor(w / 2), y0 = repRad[cx] + 1;
      S.forEach((r, dy) => [...r].forEach((ch, dx) => { if (ch !== '.') { del[y0 + dy][x0 + dx] = ch; if (tunt[y0 + dy][x0 + dx] === 'a') tunt[y0 + dy][x0 + dx] = '.'; } }));
    });
    // knutarna på repet mellan sakerna
    if (o.knut) for (const dx of [-3, 3]) { const x = Math.round(xc + dx), y = repRad[x]; tunt[y][x] = 'a'; tunt[y][x + 1] = 'b'; }
    const ur = g => [(x, y) => g[Math.floor(y)][Math.floor(x)] !== '.', (x, y) => g[Math.floor(y)][Math.floor(x)]];
    return PORT([ur(del)], [ur(tunt)], { hud: 3, har: 1 }, true);
  };
  byt(KORT('f7_halsband', 'Halsbandet', 'Steg 7.7.5: ett halsband av rep med vargtänder, en prydnad. Tänderna från version 2, och nu följer snöret halsen i porträttet i stället för att hänga i en vid båge över rocken. Bilden visar halsbandet som sak, på en bybo på kartan och i porträttet. Din kommentar förra gången: ”Halsbandet följer inte halsen men tänderna är snygga i version 2”', [
    SCEN('Tre vargtänder på ett snöre som ligger tätt runt halsens nederdel.', halsSak(1), [[halsFig(1), 4242]], { port: phals(1, 'tat') }),
    SCEN('Tre vargtänder på ett snöre som följer halsen ner mot nyckelbenen.', halsSak(1), [[halsFig(1), 4242]], { port: phals(1, 'halsen') })]));

  // =====================================================================================================================
  // ur 7.7b-lin.js: skjortan
  // =====================================================================================================================
  const LB = {
    W: 'ben3', w: 'ben2', v: 'ben1', V: 'ben0', J: 'jord3', j: 'jord2', k: 'jord1', K: 'jord0',
    Y: 'senap3', y: 'senap2', t: 'senap1', T: 'senap0', G: 'oliv3', g: 'oliv2', h: 'oliv1', H: 'oliv0',
    A: 'skiffer3', a: 'skiffer2', b: 'skiffer1', B: 'skiffer0', R: 'rost3', r: 'rost2', q: 'rost1', Q: 'rost0',
    C: 'kol3', c: 'kol2', d: 'kol1',
  };
  const GRA = { ...LB, W: 'ben2', w: 'ben1', v: 'ben0' };
  const RAD = (text, delar, m = 4, mellan = 5) => {
    const matt = delar.map(d => Array.isArray(d) ? [bredd(d[0]), d[0].length] : [d.w, d.h]);
    const w = matt.reduce((s, [a]) => s + a, 0) + mellan * (delar.length - 1) + m * 2, h = Math.max(...matt.map(([, b]) => b)) + m * 2 + 1;
    return { text, w, h, rita: B => { let x = m; delar.forEach((d, i) => { const [dw, dh] = matt[i], y = h - m - 1 - dh; if (Array.isArray(d)) lagg(B, d[0], d[1], x, y); else d.rita(B, x, y); x += dw + mellan; }); } };
  };
  const FIGUR = (over, Lg) => ({ w: 14, h: 20, rita: (B, x0, y0) => {
    if (!window.BYBO) return;
    const F = window.BYBO(17, 'fram', 'sta', 'hanga', null);
    for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) { const c = F.px[y * F.w + x]; if (c >= 0) B.satt(x0 + x, y0 + y, c); }
    over.forEach((r, i) => [...r].forEach((ch, x) => { if (ch === '.') return; const t = ch === 'o' ? 'kol0' : Lg[ch]; if (t) B.satt(x0 + x, y0 + 7 + i, fg(B, t)); }));
    for (let x = 3; x < 11; x++) B.morka(x0 + x, y0 + 20);
  } });
  // version 1 (förra kortet: långa ärmar och en dragsko i halsen, av grått, oblekt lin) med smalare höfter: nertill är
  // skjortan lika bred som bålen, i stället för en punkt bredare på varje sida
  const skjortaSak = MED_KONTUR(['.WW.jj.wv.', 'WWWW..wwvv', 'WW.WjWwv.v', 'WW.WjWwv.v', 'W..WWwwv.v', '...WWwwv..', '...WWwvv..']);
  const skjortaFig = ['..WWWj.jwwv...', '..WWWWjwwwvv..', '..W.WWjwwv.v..', '..W.WWwwwv.v..', '..W.WWwwwv.v..', '..W.WWwwwv.v..', '....WWwwwv....', '....WWwwvv....'];
  byt(JANEJ('f7_skjorta', 'Skjortan', 'Steg 7.7.11: skjortan, sydd av 2 lintyg: ett kortare och tunnare plagg än tunikan, på platsen inre (under rocken). Du valde version 1; nu är den inte bredare över höfterna än över bröstet, både som sak och på människan på kartan. Bilden visar den som sak och på en människa på kartan framifrån. Din kommentar förra gången: "Gör om version 1 så den inte är så bred över höfterna"',
    RAD('Långa ärmar och en dragsko i halsen, av grått, oblekt lin, rak nertill.', [[skjortaSak, GRA], FIGUR(skjortaFig, GRA)], 4, 6)));
})();
