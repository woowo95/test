// svar på korten i 8.7 (strid): bågen, pilarna och slungan får var sitt kort, hornet och trumman likaså, och allt
// visas som sak, på bybon på kartan och i porträttet (som 7.1 Bära). Hjälmen (version 1) och rustningen (version 2)
// visas på bybon och i porträttet, och sköldens tre versioner likaså.
(() => {
  const { KORT, former, bredd, lagg } = window.F7;

  // ---------- färgerna: en bokstav per ramp och ton ('o' är konturen) ----------
  const L = {
    a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3', e: 'skiffer0', f: 'skiffer1', g: 'skiffer2', h: 'skiffer3',
    i: 'ben0', j: 'ben1', k: 'ben2', l: 'ben3', m: 'senap0', n: 'senap1', p: 'senap2', q: 'senap3',
    r: 'rost0', s: 'rost1', t: 'rost2', u: 'rost3', v: 'oliv1', w: 'oliv2', x: 'kol1', y: 'kol2', z: 'kol3', o: 'kol0',
  };
  const I = (P, ch) => typeof ch === 'number' ? ch : P.i(L[ch].slice(0, -1), +L[ch].slice(-1));
  // de gamla bilderna i 8.7 hade en egen legend; den här gör om dem till bokstäverna ovan
  const GAMMAL = { y: 'p', w: 'k', W: 'l', r: 't', s: 'f', S: 'g', T: 'h' };
  const gammal = rader => rader.map(r => [...r].map(c => GAMMAL[c] || c).join(''));

  // ---------- formerna ----------
  const ell = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  // ett rör längs en bruten linje: null utanför, annars t (0 … 1 längs linjen), q (0 i mitten, 1 i kanten) och
  // ljus (1 på sidan uppåt till vänster, -1 på sidan nedåt till höger)
  const ror = (pts, r0, r1 = r0) => (x, y) => {
    let bast = null;
    for (let n = 0; n < pts.length - 1; n++) {
      const [ax, ay] = pts[n], [bx, by] = pts[n + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
      const u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), t = (n + u) / (pts.length - 1), r = r0 + (r1 - r0) * t;
      const px = ax + u * dx, py = ay + u * dy, d = Math.hypot(x - px, y - py);
      if (d <= r && (!bast || d / r < bast.q)) bast = { t, q: d / r, ljus: d ? ((px - x) + (py - y)) / (d * Math.SQRT2) * (d / r) : 0 };
    }
    return bast;
  };
  // en båge från a till b, utbuktad bula punkter åt vänster om färdriktningen (sinus), i n steg
  const kurva = (a, b, bula, n = 16, extra = () => [0, 0]) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), nx = dy / len, ny = -dx / len;
    return [...Array(n + 1)].map((_, i) => { const t = i / n, s = bula * Math.sin(Math.PI * t), [ex, ey] = extra(t); return [a[0] + dx * t + nx * s + ex, a[1] + dy * t + ny * s + ey]; });
  };
  const ton3 = (l, ljus, mellan, mork, g = 0.3) => l > g ? ljus : l < -g ? mork : mellan;
  // fyll: kallar satt(x, y, bokstav) för varje punkt i rutan där f(x + 0.5, y + 0.5) ger en bokstav
  const fyll = (satt, x0, y0, x1, y1, f) => { for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) { const c = f(x + 0.5, y + 0.5); if (c) satt(x, y, c); } };
  // en liten bild (rader) som punkter; '.' är genomskinligt
  const sp = (satt, rader, dx, dy) => rader.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.') satt(dx + x, dy + y, c); }));
  const streck = (x0, y0, x1, y1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)), ut = []; for (let i = 0; i <= n; i++) { const t = n ? i / n : 0; ut.push([Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), t]); } return ut; };
  // en kurva som punkter (för kartfiguren): [x, y, t]
  const kurvPkt = (a, b, bula) => { const pts = kurva(a, b, bula, 40), set = new Map(); pts.forEach(([x, y], i) => { const k = Math.round(x) + ',' + Math.round(y); if (!set.has(k)) set.set(k, [Math.round(x), Math.round(y), i / 40]); }); return [...set.values()]; };

  // ---------- kartfiguren med det man har ----------
  // bybon är samma man i alla bilder (fröet FRO, med rock och bälte). mal(f) ritar med f.o (ovanpå), f.b (bakom: bara
  // där figuren inte finns) och f.p (bara på figuren, inte konturen), och läser figurens färg med f.las. Ytterkonturen
  // tas bort först och läggs sedan runt allt igen, som plaggen i 7.7.
  const FRO = 22, MF = 6;
  function figur(F, mal, P) {
    const W = F.w + 2 * MF, H = F.h + 2 * MF, g = new Array(W * H).fill(-1);
    for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) g[(y + MF) * W + x + MF] = F.px[y * F.w + x];
    const forr = g.slice(), ute = new Uint8Array(W * H), st = [];
    for (let x = 0; x < W; x++) st.push(x, (H - 1) * W + x);
    for (let y = 0; y < H; y++) st.push(y * W, y * W + W - 1);
    while (st.length) { const i = st.pop(); if (ute[i] || g[i] > 0) continue; ute[i] = 1; const x = i % W, y = (i / W) | 0; if (x > 0) st.push(i - 1); if (x < W - 1) st.push(i + 1); if (y > 0) st.push(i - W); if (y < H - 1) st.push(i + W); }
    for (let i = 0; i < g.length; i++) if (ute[i]) g[i] = -1;
    const g0 = g.slice();
    let under = false;
    const put = sorts => (x, y, ch) => {
      const X = x + MF, Y = y + MF; if (X < 0 || Y < 0 || X >= W || Y >= H) return; const i = Y * W + X;
      if (sorts === 'b' && forr[i] >= 0) return; // bakom: inte där figuren eller dess kontur är
      if (sorts === 'p' && g0[i] <= 0) return;
      g[i] = I(P, ch); if (y >= F.h) under = true;
    };
    mal({ o: put('o'), b: put('b'), p: put('p'), las: (x, y) => { const X = x + MF, Y = y + MF; return X < 0 || Y < 0 || X >= W || Y >= H ? -1 : g0[Y * W + X]; } });
    const ut = g.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (g[y * W + x] >= 0 || (!under && y >= F.h + MF)) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < W && Y < H && g[Y * W + X] >= 0; })) ut[y * W + x] = 0;
    }
    return { w: W, h: H, px: ut };
  }

  // ---------- porträttet med det man har ----------
  // mal(f): f.b bakom (bara där bakgrunden syns), f.f framför (över allt) och f.r på rocken (porträttets kropp börjar på
  // rad 48). Konturen läggs runt det som ritats, som i resten av porträttet.
  function portratt(B, x0, y0, mal) {
    const PR = window.PORTRATTEN; if (!PR) return;
    const m = PR.neutral('man'); m.alder = 'vuxen'; m.klader = { rock: 'harskinn', skor: true, balte: false };
    const Q = PR.portratt(m), W = Q.w, g = Q.px.slice(), typ = new Uint8Array(W * Q.h);
    const inne = (x, y) => x >= 2 && y >= 2 && x < W - 2 && y < Q.h - 2;
    const put = sorts => (x, y, ch) => {
      if (!inne(x, y)) return; const i = y * W + x, c0 = Q.px[i];
      if (sorts === 1 && (c0 >= 4 || c0 === 0)) return;
      if (sorts === 3 && (y < 48 || c0 < 4)) return;
      g[i] = I(B.P, ch); if (sorts !== 3) typ[i] = sorts;
    };
    mal({ b: put(1), f: put(2), r: put(3) });
    const ut = g.slice();
    for (let y = 2; y < Q.h - 2; y++) for (let x = 2; x < W - 2; x++) {
      const i = y * W + x; if (typ[i]) continue;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => typ[(y + dy) * W + x + dx]);
      if (n.includes(2) || (n.includes(1) && Q.px[i] < 4 && g[i] === Q.px[i])) ut[i] = 0;
    }
    for (let y = 0; y < Q.h; y++) for (let x = 0; x < W; x++) { const c = ut[y * W + x]; if (c >= 0) B.satt(x0 + x, y0 + y, c); }
  }

  // ---------- kortet: saken på marken, bybon på kartan och porträttet ----------
  // figurer: [riktning, armläge, mal]; port: mal till porträttet
  const KANT = 4, FOT = 64, PLATS = 22;
  function kort(text, sak, figurer, port) {
    const sw = sak ? bredd(sak) : 0, w = KANT + sw + 4 + figurer.length * PLATS + 2 + 64 + KANT, h = 72;
    return { text, w, h, rita: (B) => {
      if (sak) lagg(B, sak, L, KANT, FOT - sak.length);
      figurer.forEach(([rikt, arm, mal], n) => {
        const F = window.BYBO ? window.BYBO(FRO, rikt, 'sta', arm, null) : null; if (!F) return;
        const x0 = KANT + sw + 4 + n * PLATS + 4, y0 = FOT - 20;
        for (let x = 3; x < F.w - 3; x++) B.morka(x0 + x, y0 + F.h); // skuggan under fötterna
        const G = figur(F, mal, B.P);
        for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) { const c = G.px[y * G.w + x]; if (c >= 0) B.satt(x0 - MF + x, y0 - MF + y, c); }
      });
      if (port) portratt(B, w - KANT - 64, 4, port);
    } };
  }
  const byt = (kort, efter) => {
    const i = VAL.findIndex(s => s.id === kort.id);
    if (i >= 0) { VAL[i] = kort; return; }
    const e = VAL.findIndex(s => s.id === efter);
    if (e >= 0) VAL.splice(e + 1, 0, kort); else VAL.push(kort);
  };
  const JANEJ = (id, namn, vad, version) => ({ id, namn, typ: 'janej', vad, versioner: [version] });

  // ======================================================================================================
  // 8.7.6 bågen: 2 virke och 1 rep
  // ======================================================================================================
  // tra: ljus, mellan, mörk; grepp: lindningen mitt på; spets: ändarna; rep: strängen; rc: hur mycket ändarna böjer bakåt
  const BAGAR = [
    { tra: ['d', 'c', 'b'], grepp: 'b', spets: 'b', rep: 'k', rc: 0, bula: 4 }, // 1: enkel självbåge av ljust virke
    { tra: ['q', 'p', 'n'], grepp: 'a', spets: 'a', rep: 'l', rc: 0, bula: 3.6, band: 't' }, // 2: gul båge, lindat grepp, mörka ändar
    { tra: ['c', 'b', 'a'], grepp: 'p', spets: 'k', rep: 'k', rc: 1.6, bula: 2.8 }, // 3: mörk, lång båge med bakåtböjda ändar
  ];
  const BH = 22;
  const bageSak = (v) => {
    const o = BAGAR[v], xs = 7.5, y0 = 0.8, y1 = BH - 0.8;
    const ext = t => [o.rc ? -o.rc * Math.max(0, 1 - Math.min(t, 1 - t) / 0.14) ** 2 : 0, 0];
    const pts = kurva([xs, y0], [xs, y1], o.bula, 20, ext), stav = ror(pts, 0.9, 0.9);
    const topp = pts[0], botten = pts[pts.length - 1];
    return former(10, BH, [
      [ror([[topp[0] + 0.2, topp[1] + 0.6], [botten[0] + 0.2, botten[1] - 0.6]], 0.45), o.rep],
      [(x, y) => !!stav(x, y), (x, y) => { const r = stav(x, y); if (r.t < 0.07 || r.t > 0.93) return o.spets; if (Math.abs(r.t - 0.5) < 0.07) return o.grepp; if (o.band && Math.abs(Math.abs(r.t - 0.5) - 0.1) < 0.02) return o.band; return ton3(r.ljus, ...o.tra, 0.2); }],
    ]);
  };
  // på kartan: strängen och staven som punkter, ritade från a till b med utbuktningen bula
  const bageFig = (f, v, a, b, bula, satt = f.o, rep = f.b) => {
    const o = BAGAR[v];
    for (const [x, y] of streck(a[0], a[1], b[0], b[1])) rep(x, y, o.rep);
    for (const [x, y, t] of kurvPkt(a, b, bula)) satt(x, y, t < 0.08 || t > 0.92 ? o.spets : Math.abs(t - 0.5) < 0.08 ? o.grepp : t < 0.5 ? o.tra[1] : o.tra[2]);
  };
  const bageKort = (v, text) => {
    const o = BAGAR[v];
    return kort(text, bageSak(v), [
      ['fram', 'hanga', f => { const hand = f.las(2, 13); bageFig(f, v, [0, 5], [0, 20], 2); f.o(1, 13, hand); f.o(0, 13, hand); f.o(-1, 13, hand); }],
      ['sida', 'framfor', f => { const hand = f.las(9, 10); bageFig(f, v, [11, 3], [11, 17], -2); f.o(10, 10, hand); }],
      ['bak', 'hanga', f => bageFig(f, v, [12, 1], [1, 16], 2, f.o, f.o)],
    ], p => {
      // på ryggen, snett bakom huvudet: syns nere till vänster och uppe till höger
      const a = [3, 56], b = [60, 3], ext = t => { const k = o.rc ? -o.rc * 2.5 * Math.max(0, 1 - Math.min(t, 1 - t) / 0.12) ** 2 : 0; return [k * 0.6, k * 0.8]; };
      const pts = kurva(a, b, -o.bula * 3.2, 30, ext), stav = ror(pts, 2, 1.4), rep = ror([pts[0], pts[pts.length - 1]], 0.55);
      fyll(p.b, 2, 2, 61, 61, (x, y) => rep(x, y) ? o.rep : null);
      fyll(p.b, 2, 2, 61, 61, (x, y) => { const r = stav(x, y); if (!r) return null; if (r.t < 0.05 || r.t > 0.95) return o.spets; return ton3(r.ljus, ...o.tra); });
    });
  };
  byt(KORT('f8_bage', 'Bågen', 'Steg 8.7.6: bågen av 2 virke och 1 rep. Bågen har nu ett eget kort med tre versioner (pilarna och slungan har fått var sitt). Till vänster bågen som sak, sedan bybon på kartan: med bågen i handen framifrån, med armen sträckt framåt från sidan och med bågen på ryggen bakifrån, och sist i porträttet med bågen på ryggen. Din kommentar förra gången: ”Gör tre olika versioner av varje objekt och hur det ser ut på en person och i porträtt”', [
    bageKort(0, 'En enkel, böjd båge av ljust virke med en sträng av ljust rep.'),
    bageKort(1, 'En gul båge med ett grepp lindat i mörkt skinn, röda band intill och mörka ändar.'),
    bageKort(2, 'En lång, mörk båge med ändarna böjda bakåt och ett gult grepp av rep.'),
  ]), 'f8_bage');

  // ======================================================================================================
  // 8.7.6 pilarna: ved och flinta
  // ======================================================================================================
  // spets: rader för flintspetsen (5 breda), A och B: fjädrarnas två sidor, skaft, band: ett färgat band under fjädrarna
  const PILAR = [
    { spets: ['..h..', '.hgf.', '.hgf.', '..g..'], A: 'l', B: 'k', skaft: 'c', rep: null }, // 1: grå flinta, ljusa fjädrar
    { spets: ['..h..', '.hg..', '.hgf.', '.hgf.', '..g..'], A: 'g', B: 'f', skaft: 'd', band: 't', rep: 'p' }, // 2: grå fjädrar, rött band, buntade med rep
    { spets: ['..z..', '.zyx.', 'zyxxx', 'z...x'], A: 't', B: 's', skaft: 'c', rep: null, svart: true }, // 3: svart flinta med hullingar, röda fjädrar
  ];
  const pilRader = (v, langd) => {
    const o = PILAR[v], ut = [...o.spets];
    const fjader = [`.${o.A}${o.skaft}${o.B}.`, `${o.A}${o.A}${o.skaft}${o.B}${o.B}`, `${o.A}${o.A}${o.skaft}${o.B}${o.B}`, `${o.A}.${o.skaft}.${o.B}`, '..a..'];
    while (ut.length < langd - fjader.length - (o.band ? 1 : 0)) ut.push(`..${o.skaft}..`);
    if (o.band) ut.push(`..${o.band}..`);
    return [...ut, ...fjader];
  };
  const pilSak = (v) => {
    const o = PILAR[v], W = 13, H = 19, g = Array.from({ length: H }, () => Array(W).fill('.'));
    [[0, 1, 17], [4, 0, 19], [8, 2, 16]].forEach(([dx, dy, n]) => pilRader(v, n).forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.') g[dy + y][dx + x] = c; })));
    if (o.rep) for (const x of [2, 3, 4, 5, 6, 7, 8, 9, 10]) g[9][x] = x % 2 ? o.rep : 'n';
    const r = g.map(r => r.join(''));
    return former(W + 2, H + 2, [[(x, y) => (r[Math.floor(y) - 1] || '')[Math.floor(x) - 1] > '.', (x, y) => r[Math.floor(y) - 1][Math.floor(x) - 1]]]).filter(r => /[^.]/.test(r));
  };
  // en pil i porträttet: från skåran (a) mot spetsen (b), med fjädrarna närmast skåran
  const pilPort = (satt, v, a, b) => {
    const o = PILAR[v], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    fyll(satt, Math.min(a[0], b[0]) - 4, Math.min(a[1], b[1]) - 4, Math.max(a[0], b[0]) + 4, Math.max(a[1], b[1]) + 4, (x, y) => {
      const s = (x - a[0]) * ux + (y - a[1]) * uy, d = (x - a[0]) * -uy + (y - a[1]) * ux;
      if (s < 0 || s > len) return null;
      if (s < 1.6 && Math.abs(d) < 1.1) return 'a';
      if (s >= 1.6 && s < 11 && Math.abs(d) >= 0.6 && Math.abs(d) < 3.1 - s * 0.12) return d < 0 ? o.A : o.B;
      if (o.band && s >= 11.5 && s < 13 && Math.abs(d) < 1.1) return o.band;
      if (o.rep && s >= 20 && s < 22 && Math.abs(d) < 1.3) return o.rep;
      if (Math.abs(d) < 1) return d < 0 ? (o.skaft === 'c' ? 'd' : 'l') : o.skaft;
      return null;
    });
  };
  const pilKort = (v, text) => {
    const o = PILAR[v], skaft = o.skaft, fj = (f, x, y, n) => { f(x, y, o.A); f(x, y + 1, o.B); for (let k = 2; k < n; k++) f(x, y + k, skaft); };
    return kort(text, pilSak(v), [
      ['fram', 'hanga', f => { fj(f.b, 11, 2, 5); fj(f.b, 12, 3, 5); fj(f.b, 10, 1, 2); }],
      ['sida', 'hanga', f => { for (const [ax, ay, bx, by] of [[1, 1, 4, 14], [2, 0, 5, 13], [3, 1, 5, 9]]) streck(ax, ay, bx, by).forEach(([x, y], k) => f.b(x, y, k === 0 ? o.A : k === 1 ? o.B : skaft)); }],
      ['bak', 'hanga', f => { for (const [ax, ay, bx, by] of [[10, 0, 6, 13], [11, 1, 7, 14], [12, 2, 8, 14]]) streck(ax, ay, bx, by).forEach(([x, y], k) => f.o(x, y, k === 0 ? o.A : k === 1 ? o.B : skaft)); if (o.rep) { f.o(8, 7, o.rep); f.o(9, 7, o.rep); f.o(10, 7, o.rep); } }],
    ], p => { pilPort(p.b, v, [52, 7], [36, 60]); pilPort(p.b, v, [57, 11], [40, 61]); pilPort(p.b, v, [61, 17], [44, 61]); });
  };
  byt(KORT('f8_pil', 'Pilarna', 'Steg 8.7.6: pilarna av ved och flinta, ett eget kort. Till vänster tre pilar som sak, sedan bybon med pilarna i en bunt på ryggen (framifrån syns fjädrarna över axeln, från sidan bunten bakom ryggen och bakifrån hela bunten), och sist i porträttet med fjädrarna över axeln. Din kommentar förra gången: ”Gör tre olika versioner av varje objekt och hur det ser ut på en person och i porträtt”', [
    pilKort(0, 'Pilar med en grå flintspets och ljusa fjädrar.'),
    pilKort(1, 'Pilar med grå fjädrar och ett rött band under dem, buntade med ett rep.'),
    pilKort(2, 'Pilar med en svart flintspets med hullingar och röda fjädrar.'),
  ]), 'f8_bage');

  // ======================================================================================================
  // 8.7.6 slungan: läder och rep
  // ======================================================================================================
  // pung: ljus, mellan, mörk; rem: tonen (eller två toner som flätas); sten: en sten i pungen; ogla: en ögla för fingret
  const SLUNGOR = [
    { pung: ['d', 'c', 'b'], rem: ['k', 'k'] }, // 1: ljust läder och ljusa remmar
    { pung: ['c', 'b', 'a'], rem: ['p', 'n'], sten: true }, // 2: flätade gula remmar och en sten i pungen
    { pung: ['b', 'a', 'a'], rem: ['j', 'j'], ogla: true }, // 3: mörkt läder och en ögla i ena änden
  ];
  const slungSak = (v) => {
    const o = SLUNGOR[v], rem = (x, y) => (Math.floor(x) + Math.floor(y)) % 2 ? o.rem[0] : o.rem[1];
    const lista = [
      [ror([[5, 6.6], [1.5, 1.5]], 0.5), rem], [ror([[12, 6.6], [15.5, 1.5]], 0.5), rem],
      [ell(8.5, 7.4, 4.2, 2.2), (x, y) => y < 6.6 ? o.pung[0] : y > 8.4 ? o.pung[2] : x > 11 ? o.pung[2] : o.pung[1]],
    ];
    if (o.sten) lista.push([ell(8.5, 6.4, 1.6, 1.1), (x, y) => x < 8.5 ? 'h' : 'g']);
    if (o.ogla) lista.push([(x, y) => { const d = Math.hypot(x - 1.5, y - 1.6); return d < 1.6 && d > 0.6; }, 'j']);
    else lista.push([ell(1.5, 1.4, 0.9, 0.9), o.rem[1]]);
    lista.push([ell(15.5, 1.4, 0.9, 0.9), o.rem[1]]);
    return former(18, 11, lista);
  };
  const slungKort = (v, text, portText) => {
    const o = SLUNGOR[v], P0 = o.pung, R = o.rem;
    return kort(text, slungSak(v), [
      ['fram', 'hanga', f => { sp(f.o, [`${R[0]}..`, `${R[0]}.${R[1]}`, `${R[1]}.${R[0]}`, `${P0[0]}${P0[1]}${P0[2]}`, `.${P0[2]}.`], 11, 14); }],
      ['sida', 'lyfta', f => { sp(f.o, [`...${P0[0]}${P0[1]}`, `..${R[0]}${P0[1]}${P0[2]}`, `.${R[1]}${R[0]}..`, `${R[0]}....`], 8, -4); f.o(13, -2, 'l'); f.o(12, -5, 'l'); }],
      ['bak', 'hanga', f => { sp(f.o, [`${R[0]}.`, `${R[1]}${R[0]}`, `${P0[0]}${P0[1]}`, `${P0[2]}${P0[2]}`], 12, 11); }],
    ], p => {
      const rem = (x, y) => (Math.floor(x) + Math.floor(y)) % 2 ? R[0] : R[1];
      if (v === 0) { // runt halsen, med pungen på bröstet
        fyll(p.f, 2, 44, 61, 61, (x, y) => (ror([[19, 46], [26, 55]], 0.8)(x, y) || ror([[44, 46], [37, 55]], 0.8)(x, y)) ? rem(x, y) : null);
        fyll(p.f, 2, 44, 61, 61, (x, y) => ell(31.5, 56.5, 7, 3.4)(x, y) ? (y < 55 ? P0[0] : y > 58 ? P0[2] : x > 35 ? P0[2] : P0[1]) : null);
      } else if (v === 1) { // runt pannan, med pungen och stenen mitt på
        fyll(p.f, 2, 16, 61, 26, (x, y) => ror([[12, 23], [22, 20.6], [42, 20.6], [52, 23]], 1)(x, y) ? rem(x, y) : null);
        fyll(p.f, 2, 16, 61, 26, (x, y) => ell(31.5, 21, 6, 3.2)(x, y) ? (ell(31.5, 20.6, 2.6, 2)(x, y) ? (x < 31.5 ? 'h' : 'g') : y > 22.5 ? P0[2] : P0[1]) : null);
      } else { // över axeln och snett över bröstet, pungen vid höften
        fyll(p.f, 2, 44, 61, 61, (x, y) => (ror([[13, 49], [46, 62]], 0.8)(x, y) || ror([[15, 47], [48, 60]], 0.8)(x, y)) ? rem(x, y) : null);
        fyll(p.f, 2, 44, 61, 61, (x, y) => ell(50, 58, 6, 3.2)(x, y) ? (y < 56.5 ? P0[0] : x > 53 ? P0[2] : P0[1]) : null);
        fyll(p.f, 2, 44, 61, 61, (x, y) => { const d = Math.hypot(x - 15, y - 48); return d < 2.4 && d > 1 ? 'j' : null; });
      }
    });
  };
  byt(KORT('f8_slunga', 'Slungan', 'Steg 8.7.6: slungan av läder och rep, ett eget kort. Till vänster slungan som sak, sedan bybon på kartan: framifrån med slungan hängande ur handen, från sidan när han svingar den över huvudet och bakifrån instucken i bältet. Sist i porträttet, där den bärs olika i varje version. Din kommentar förra gången: ”Gör tre olika versioner av varje objekt och hur det ser ut på en person och i porträtt”', [
    slungKort(0, 'En pung av ljust läder med två ljusa remmar. I porträttet bärs den runt halsen.'),
    slungKort(1, 'Flätade gula remmar och en sten i pungen. I porträttet knuten runt pannan, som man bar slungor förr.'),
    slungKort(2, 'Mörkt läder och en ögla för fingret i ena remmen. I porträttet över axeln.'),
  ]), 'f8_pil');

  // ======================================================================================================
  // 8.7.11 hornet
  // ======================================================================================================
  // ton(t, ljus): bokstaven längs hornet (t 0 vid mynningen, 1 vid munstycket); band: där gula band sitter
  const HORN = [
    { ton: (t, l) => t > 0.9 ? 'b' : ton3(l, 'l', 'k', 'j'), rem: null }, // 1: ljust horn av ben med mörkt munstycke
    { ton: (t, l) => t > 0.9 ? 'b' : [0.3, 0.55].some(b => Math.abs(t - b) < 0.05) ? (l > 0 ? 'q' : 'p') : ton3(l, 'l', 'k', 'j'), rem: 'b' }, // 2: med gula band och en rem
    { ton: (t, l) => t > 0.72 ? (t > 0.88 ? 'x' : ton3(l, 'b', 'a', 'a')) : t > 0.55 ? ton3(l, 'k', 'j', 'i') : ton3(l, 'l', 'k', 'j'), rem: 'a', stor: true }, // 3: stort horn med mörk spets och en rem
  ];
  const hornSak = (v) => {
    const o = HORN[v], s = o.stor ? 1.15 : 1;
    const pts = [[2.6, 10.2], [6, 10], [9.5, 8.6], [12.2, 6.2], [13.8, 3.4], [14.4, 1.2]].map(([x, y]) => [x * s, y * s]), tub = ror(pts, 2.4 * s, 0.6);
    const lista = [];
    if (o.rem) lista.push([ror([[3.6 * s, 12.6 * s], [8, 13.6 * s], [12.5 * s, 9.5 * s]], 0.5), o.rem]);
    lista.push([(x, y) => !!tub(x, y), (x, y) => { const r = tub(x, y); return o.ton(r.t, r.ljus); }]);
    lista.push([ell(pts[0][0] - 0.3, pts[0][1], 0.9, 2.1 * s), 'x']);
    return former(Math.ceil(17 * s), Math.ceil(14 * s), lista);
  };
  // kartfiguren: hornet i små punkter. t längs hornet ger tonen
  const hornFig = (satt, v, pkt) => pkt.forEach(([x, y, t]) => satt(x, y, t < 0.15 ? 'x' : HORN[v].ton(t, t < 0.5 ? 0.5 : 0)));
  const hornKort = (v, text) => {
    const o = HORN[v], rem = o.rem || 'a';
    return kort(text, hornSak(v), [
      ['fram', 'hanga', f => { streck(10, 7, 3, 12).forEach(([x, y]) => f.p(x, y, rem)); hornFig(f.o, v, [[-1, 13, 0], [0, 13, 0.3], [0, 14, 0.4], [1, 14, 0.6], [2, 14, 0.8], [3, 13, 0.95]]); }],
      ['sida', 'hanga', f => {
        // armen lyfts till munnen: den hängande armen målas över med bålen, och en ny arm ritas upp till hakan
        const arm = f.las(7, 9), hand = f.las(7, 13);
        for (let y = 8; y <= 12; y++) f.o(7, y, f.las(6, y)); f.o(7, 13, f.las(6, 13));
        f.o(8, 7, arm); f.o(9, 6, arm); f.o(10, 5, hand);
        hornFig(f.o, v, [[11, 4, 0.95], [12, 4, 0.8], [13, 3, 0.6], [14, 3, 0.45], [15, 2, 0.3], [15, 1, 0.1], [16, 2, 0]]);
      }],
      ['bak', 'hanga', f => { streck(3, 7, 10, 12).forEach(([x, y]) => f.p(x, y, rem)); hornFig(f.o, v, [[14, 13, 0], [13, 13, 0.3], [13, 14, 0.4], [12, 14, 0.6], [11, 14, 0.8], [10, 13, 0.95]]); }],
    ], p => {
      // hänger i en rem över axlarna, tvärs över bröstet
      fyll(p.f, 2, 44, 61, 61, (x, y) => (ror([[13, 53], [19, 46]], 1)(x, y) || ror([[47, 54], [44, 46]], 1)(x, y)) ? rem : null);
      const tub = ror([[11, 54], [17, 58.5], [27, 60.5], [38, 59.5], [47, 55]], 3.6, 1.1);
      fyll(p.f, 2, 44, 61, 61, (x, y) => { const r = tub(x, y); return r ? o.ton(r.t, r.ljus) : null; });
      fyll(p.f, 2, 44, 61, 61, (x, y) => ell(10.4, 53.6, 1.5, 2.8)(x, y) ? 'x' : null);
    });
  };
  byt(KORT('f8_horn', 'Hornet', 'Steg 8.7.11: hornet hörs över hela kartan. Hornet har nu ett eget kort med tre versioner (trumman har fått ett eget). Till vänster hornet som sak, sedan bybon på kartan med hornet i en rem vid höften framifrån, när han blåser i det från sidan och bakifrån, och sist i porträttet med hornet hängande över bröstet. Din kommentar förra gången: ”Gör tre versioner av varje objekt”', [
    hornKort(0, 'Ett böjt horn av ljust ben med ett mörkt munstycke.'),
    hornKort(1, 'Ett horn med två gula band och en rem av mörkt läder.'),
    hornKort(2, 'Ett större horn som mörknar mot spetsen, med en rem.'),
  ]), 'f8_horn');

  // ======================================================================================================
  // 8.7.12 trumman
  // ======================================================================================================
  // 1: en trumma med skinn och snören i sicksack; 2: en flat ramtrumma med en målad sol och en klubba av ben;
  // 3: en urholkad stock med barken kvar och skinnet surrat med rep
  const trumSak = (v) => {
    if (v === 0) return former(16, 13, [
      [(x, y) => x > 2 && x < 13 && y > 3 && y < 11, (x, y) => { const k = Math.floor(x) - 3, r = Math.floor(y) - 4, zig = (k + (r % 2 ? 0 : 1)) % 3 === 0; return zig ? 'k' : x < 4.5 ? 'd' : x > 11 ? 'b' : 'c'; }],
      [ell(8, 11, 5, 1.6), (x, y) => x < 4.5 ? 'd' : x > 11 ? 'b' : 'c'],
      [ell(8, 3.4, 5, 2.2), (x, y) => ell(8, 3.2, 4, 1.4)(x, y) ? (x < 7 ? 'l' : 'k') : 'a'],
    ]);
    if (v === 1) return former(20, 16, [
      [ell(7.5, 8, 6.2, 7.2), (x, y) => ell(7.5, 8, 5, 6)(x, y) ? null : (x < 5 ? 'c' : 'b')],
      [ell(7.5, 8, 5, 6), (x, y) => { const X = Math.floor(x), Y = Math.floor(y);
        const sol = ['t.t.t', '.ttt.', 'tt.tt', '.ttt.', 't.t.t'][Y - 6]; if (sol && sol[X - 5] === 't') return 't'; // en sol
        if ((X === 4 && Y === 3) || (X === 10 && Y === 3) || (X === 4 && Y === 13) || (X === 10 && Y === 13)) return 's'; // fyra prickar
        return x < 6 ? 'l' : x > 10 ? 'j' : 'k'; }],
      [ror([[15, 14], [18.2, 2.5]], 0.5), 'k'], [ell(18.4, 2, 1.1, 1.1), 'l'],
    ]);
    return former(14, 16, [
      [(x, y) => x > 1.5 && x < 12.5 && y > 3 && y < 14, (x, y) => { const X = Math.floor(x), Y = Math.floor(y); if (Y === 5 || Y === 6) return Y === 5 ? 'p' : 'n'; return (X * 7 + Math.floor(Y / 3) * 3) % 5 === 0 ? 'c' : x < 3.5 ? 'c' : x > 11 ? 'a' : 'b'; }],
      [ell(7, 14, 5.5, 1.5), (x, y) => x < 3.5 ? 'c' : x > 11 ? 'a' : 'b'],
      [ell(7, 3.2, 5.5, 2.2), (x, y) => ell(7, 3, 4.3, 1.4)(x, y) ? (x < 6 ? 'l' : 'k') : 'j'],
    ]);
  };
  const TRUMFIG = [
    ['.oooooo.', 'ollkkkko', 'oaaaaaao', 'okckckco', 'ockckcko', 'okckckco', '.oooooo.'],
    null,
    ['.oooooo.', 'ollkkkko', 'ojjjjjjo', 'oppppppo', 'ocbbcbao', 'obcbbbao', 'obbcbaao', '.oooooo.'],
  ];
  const trumKort = (v, text) => kort(text, trumSak(v), v === 1 ? [
    ['fram', 'lyfta', f => { sp(f.o, ['.bb.', 'bklb', 'bktb', 'bklb', 'bltb', 'bklb', '.bb.'], -2, 9); f.o(12, -1, 'k'); f.o(13, -2, 'l'); }],
    ['sida', 'framfor', f => { sp(f.o, ['b.', 'bk', 'bt', 'bk', 'bl', 'bk', 'b.'], 10, 6); f.o(10, 10, f.las(9, 10)); }],
  ] : [
    ['fram', 'framfor', f => sp(f.o, TRUMFIG[v], 3, 11)],
    ['sida', 'framfor', f => sp(f.o, v === 0 ? ['llk', 'aaa', 'ckc', 'kck', 'ckc'] : ['llk', 'jjj', 'ppp', 'cba', 'bca', 'bba'], 9, 11)],
  ], p => {
    if (v === 1) { // ramtrumman hålls upp nere till vänster
      fyll(p.f, 2, 30, 30, 61, (x, y) => {
        if (!ell(12, 50, 11, 13)(x, y)) return null;
        if (!ell(12, 50, 9, 11)(x, y)) return x < 9 ? 'c' : 'b';
        const X = Math.floor(x), Y = Math.floor(y);
        const d = Math.hypot(x - 12, y - 50), vinkel = Math.atan2(y - 50, x - 12) / (Math.PI / 4), straleV = Math.abs(vinkel - Math.round(vinkel)) < 0.12;
        if ((d > 2.2 && d < 3.8) || (d > 5 && d < 7.6 && straleV)) return 't'; // solen och strålarna
        if ([[6, 41], [18, 41], [6, 59], [18, 59]].some(([px, py]) => Math.hypot(x - px - 0.5, y - py - 0.5) < 1)) return 's';
        return x < 8 ? 'l' : x > 17 ? 'j' : 'k';
      });
      return;
    }
    // trumman framför bröstet i en rem över axlarna
    const kropp = v === 0 ? (x, y) => { const k = Math.floor(x), r = Math.floor(y); return (k + r) % 6 === 0 || (k - r + 60) % 6 === 0 ? 'k' : x < 21 ? 'd' : x > 42 ? 'b' : 'c'; }
      : (x, y) => { const X = Math.floor(x), Y = Math.floor(y); if (Y === 55 || Y === 56) return Y === 55 ? 'q' : 'p'; return (X * 7 + Math.floor(Y / 3) * 3) % 5 === 0 ? 'c' : x < 21 ? 'c' : x > 42 ? 'a' : 'b'; };
    fyll(p.f, 2, 40, 61, 61, (x, y) => (ror([[19, 52], [21, 46]], 1)(x, y) || ror([[44, 52], [42, 46]], 1)(x, y)) ? 'a' : null);
    fyll(p.f, 2, 40, 61, 61, (x, y) => x > 17 && x < 46 && y > 52 ? kropp(x, y) : null);
    fyll(p.f, 2, 40, 61, 61, (x, y) => ell(31.5, 52, 14, 3.8)(x, y) ? (ell(31.5, 51.8, 12.6, 2.7)(x, y) ? (x < 27 ? 'l' : x > 40 ? 'j' : 'k') : v === 0 ? 'a' : 'j') : null);
  });
  byt(KORT('f8_trumma', 'Trumman', 'Steg 8.7.12: trumman hörs längre än ett rop. Trumman har nu ett eget kort med tre versioner. Till vänster trumman som sak, sedan bybon på kartan framifrån och från sidan, och sist i porträttet. Din kommentar förra gången: ”Gör tre versioner av varje objekt”', [
    trumKort(0, 'En trumma med skinn och snören i sicksack, som bärs framför magen.'),
    trumKort(1, 'En flat ramtrumma med en målad sol och en klubba av ben. Han håller den i ena handen och slår med den andra.'),
    trumKort(2, 'En urholkad stock med barken kvar och skinnet surrat med gult rep.'),
  ]), 'f8_horn');

  // ======================================================================================================
  // 8.7.2 hjälmen, version 1
  // ======================================================================================================
  const HJALM_SAK = gammal(['.....oooooo.....', '....obbbbbbo....', '...obcccccbbo...', '...obcccccbbo...', '...oooooooooo...', '...o........o...']);
  const hjalm = { text: 'Version 1, en enkel kalott med en kant: som sak, på bybon framifrån, från sidan och bakifrån, och i porträttet.' };
  Object.assign(hjalm, kort(hjalm.text, HJALM_SAK, [
    ['fram', 'hanga', f => sp(f.o, ['..dccb..', '.dccccb.', 'baaaaaaa'], 3, -1)],
    ['sida', 'hanga', f => sp(f.o, ['..dccb..', '.dccccb.', 'baaaaaaa'], 4, -1)],
    ['bak', 'hanga', f => sp(f.o, ['..dccb..', '.dccccb.', 'baaaaaaa'], 3, -1)],
  ], p => {
    // kalotten över skallen, med en mörk kant över pannan
    // kalotten är sydd av fyra stycken: sömmarna går från kanten upp mot hjässan
    fyll(p.f, 2, 2, 61, 26, (x, y) => {
      if (y > 23.5) return null;
      if (y > 20 && x > 11 && x < 52) return y > 22.5 ? 'a' : x < 16 ? 'c' : 'b'; // kanten
      if (!ell(31.5, 21.5, 19, 16.5)(x, y)) return null;
      const u = (x - 12.5) / 38, som = [-0.55, 0, 0.55].some(k => Math.abs((x - 31.5) - k * 19 * Math.sqrt(Math.max(0, 1 - ((21.5 - y) / 16.5) ** 2))) < 0.6);
      if (som && y > 7) return 'b';
      if (ell(24, 12, 5, 3.5)(x, y)) return 'd'; // ljuset uppe till vänster
      return u < 0.16 ? 'd' : u > 0.8 ? 'b' : 'c';
    });
  }));
  byt(JANEJ('f8_hjalm', 'Läderhjälmen', 'Steg 8.7.2: av 2 läder och 1 rep. Tar bort en del av slagen mot huvudet. Du valde version 1; här är den på bybon på kartan och i porträttet. Din kommentar förra gången: ”Visa hur den ser ut på en person och i porträttet”', hjalm), 'f8_hjalm');

  // ======================================================================================================
  // 8.7.1 rustningen, version 2
  // ======================================================================================================
  const RUST_SAK = gammal(['..oooo..oooo....', '.oaaaaooaaaao...', '.oabbbbbbbaao...', '..obbdbdbbbo....', '...obdbdbbo.....', '...obdbdbbo.....', '...obbbbbbo.....', '...oooooooo.....']);
  // fjällen på kartan: ljusa prickar i rader, förskjutna varannan rad; axlarna och överarmarna mörka
  const fjallFig = (f, xs, ys, armar) => {
    for (const y of ys) for (const x of xs) { if (y === 11) continue; f.p(x, y, x === xs[0] ? 'c' : x === xs[xs.length - 1] ? 'a' : (x + y) % 2 ? 'd' : 'b'); }
    for (const [x, y] of armar) f.p(x, y, 'a');
  };
  const rustning = kort('Version 2, pålagda bitar i rader som fjäll: som sak, på bybon framifrån, från sidan och bakifrån, och i porträttet.', RUST_SAK, [
    ['fram', 'hanga', f => fjallFig(f, [3, 4, 5, 6, 7, 8, 9, 10], [7, 8, 9, 10, 12, 13], [[2, 7], [2, 8], [2, 9], [11, 7], [11, 8], [11, 9], [3, 7], [10, 7]])],
    ['sida', 'hanga', f => fjallFig(f, [5, 6, 7, 8], [7, 8, 9, 10, 12, 13], [[7, 7], [7, 8], [7, 9]])],
    ['bak', 'hanga', f => fjallFig(f, [3, 4, 5, 6, 7, 8, 9, 10], [7, 8, 9, 10, 12, 13], [[2, 7], [2, 8], [2, 9], [11, 7], [11, 8], [11, 9], [3, 7], [10, 7]])],
  ], p => {
    // fjällen: halvrundade bitar 6 punkter breda och 4 höga, varannan rad förskjuten, med en mörk underkant
    fyll(p.r, 2, 48, 61, 61, (x, y) => {
      const X = Math.floor(x), Y = Math.floor(y);
      if (Y <= 49) return Y === 48 ? 'a' : 'b'; // kragen
      const rad = Math.floor((Y - 50) / 4), u = ((X + (rad % 2 ? 3 : 0)) % 6 + 6) % 6 + 0.5, w = (Y - 50) % 4 + 0.5;
      const axel = X < 14 || X > 49; // axelskydden: en ton mörkare
      const inne = ((u - 3) / 2.9) ** 2 + ((w + 0.6) / 4.2) ** 2 <= 1, kant = ((u - 3) / 2.1) ** 2 + ((w + 0.6) / 3.3) ** 2 > 1;
      if (!inne) return 'a';
      if (kant) return axel ? 'a' : 'b';
      if (axel) return u < 3 ? 'c' : 'b';
      return u < 2.5 && w < 2 ? 'd' : u > 4 ? 'b' : 'c';
    });
  });
  byt(JANEJ('f8_rustning', 'Läderrustningen', 'Steg 8.7.1: av 4 läder och 2 rep, på platsen yttre. Skyddar bålen och armarna. Du valde version 2; här är den på bybon på kartan och i porträttet. Din kommentar förra gången: ”Visa hur den ser ut på en person och i porträttet”', rustning), 'f8_rustning');

  // ======================================================================================================
  // 8.7.3 skölden: tidig järnålder utan järn, som skärvorna från Hjortspring. Helt av trä: en avlång sköld med en
  // ås (spina) längs mitten som blir en spolformad buckla av trä över handtaget, och ett handtag av trä bakom.
  // ======================================================================================================
  // yta: ljus, mellan, mörk på framsidan; as: åsen och bucklan; kant: lindning av rå hud; fog: brädornas fogar
  const SKOLDAR = [
    { rund: false, yta: ['d', 'c', 'b'], as: ['d', 'd', 'a'], kant: null, fog: false }, // 1: en bräda, ljust trä
    { rund: true, yta: ['c', 'c', 'b'], as: ['d', 'd', 'a'], kant: 'j', fog: true }, // 2: oval av tre brädor, lindad kant
    { rund: false, yta: ['t', 's', 'r'], as: ['d', 'c', 'a'], kant: 'j', fog: false }, // 3: målad med rödockra
  ];
  const hasha = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  // skölden på w × h punkter, längden längs y (ligg: längs x). m: sw åsens halva bredd, bw och bl bucklans halva
  // bredd och halva längd, r kantens bredd, korn ådringen (bara i stor storlek). Ljuset kommer uppifrån till vänster,
  // och bucklan kastar en skugga nedåt till höger.
  const skoldYta = (v, w, h, ligg, m) => (x, y) => {
    const o = SKOLDAR[v], [A, Lg, AW, LW] = ligg ? [y, x, h, w] : [x, y, w, h];
    const inne = (a, l) => { const u = Math.abs(a - AW / 2) / (AW / 2), t = Math.abs(l - LW / 2) / (LW / 2); return o.rund ? u ** 2.4 + t ** 2.4 <= 1 : u ** 6 + t ** 6 <= 1; };
    if (!inne(A, Lg)) return null;
    const da = A - AW / 2, dl = Lg - LW / 2, r = m.r;
    if (o.kant && [[r, 0], [-r, 0], [0, r], [0, -r]].some(([p, q]) => !inne(A + p, Lg + q))) return o.kant;
    const bred = d => m.bw * Math.max(0, 1 - (d / m.bl) ** 2), buckla = (a, d) => Math.abs(d) < m.bl && Math.abs(a) <= Math.max(bred(d), m.sw);
    if (buckla(da, dl)) {
      const bb = Math.max(bred(dl), 0.5), s = da / bb + dl / m.bl * 0.7;
      return s > 0.6 ? o.as[2] : s < -0.2 ? o.as[0] : o.as[1];
    }
    if (Math.abs(da) <= m.sw) return m.sw < 1 ? o.as[0] : da > m.sw / 3 ? o.as[2] : o.as[0];
    if (buckla(da - 1, dl - 1)) return o.yta[2];
    if (o.fog && [-1, 1].some(k => Math.abs(da - k * AW * 0.3) < 0.5)) return o.yta[2];
    if (m.korn && hasha(Math.floor(da), Math.floor(dl / 9)) < 0.05) return o.yta[2];
    if (!m.korn) return o.yta[1];
    return da > AW * 0.36 ? o.yta[2] : da < -AW * 0.36 ? o.yta[0] : o.yta[1];
  };
  const SMA = { sw: 0.5, bw: 1.5, bl: 2.6, r: 0.8 };
  const SKOLD_SAK = [0, 1, 2].map(v => { const t = skoldYta(v, 14, 5, true, SMA); return former(16, 7, [[(x, y) => !!t(x - 1, y - 1), (x, y) => t(x - 1, y - 1)]]); });
  // på kartan framifrån och bakifrån: 7 × 11 med kontur (den ovala 9 × 11)
  const SKOLD_FIG = [0, 1, 2].map(v => { const w = SKOLDAR[v].rund ? 7 : 5, t = skoldYta(v, w, 9, false, SMA); return former(w + 2, 11, [[(x, y) => !!t(x - 1, y - 1), (x, y) => t(x - 1, y - 1)]]); });
  // från sidan: brädans kant, och bucklan som sticker ut mitt på
  const SKOLD_SIDA = [0, 1, 2].map(v => { const o = SKOLDAR[v]; return [...Array(11)].map((_, y) => y === 0 || y === 10 ? o.as[1] + '.' : y >= 4 && y <= 6 ? o.as[1] + o.yta[1] + (y === 6 ? o.as[2] : o.as[1]) : o.as[1] + o.yta[1]); });
  const skoldKort = (v, text) => kort(text, SKOLD_SAK[v], [
    ['fram', 'hanga', f => sp(f.o, SKOLD_FIG[v], SKOLDAR[v].rund ? -4 : -3, 6)],
    ['sida', 'framfor', f => { sp(f.o, SKOLD_SIDA[v], 10, 5); f.o(10, 10, f.las(9, 10)); }],
    ['bak', 'hanga', f => sp(f.o, SKOLD_FIG[v], SKOLDAR[v].rund ? 3 : 4, 6)],
  ], p => {
    // skölden hålls upp framför bröstet nere till vänster, med bucklan över handen
    const x0 = 1, y0 = 36, t = skoldYta(v, SKOLDAR[v].rund ? 21 : 19, 40, false, { sw: 1.2, bw: 4, bl: 8, r: 1.6, korn: true });
    fyll(p.f, 0, 30, 30, 61, (x, y) => t(x - x0, y - y0));
  });
  byt(KORT('f8_skold', 'Skölden', 'Steg 8.7.3: av 3 ved och 1 rep, hålls i en hand och slits som ett redskap. Nu ritad om efter tidig järnålder, som sköldarna från Hjortspring: helt av trä utan järn, avlång, med en ås längs mitten som blir en spolformad buckla av trä över handtaget. Var och en visas också på bybon på kartan (i handen framifrån, framför sig från sidan och på ryggen bakifrån) och i porträttet, där han håller upp den framför bröstet. Din kommentar förra gången: ”Visa hur den ser ut på en person och i porträttet”', [
    skoldKort(0, 'Avlång med rundade hörn, av en enda bräda ljust trä.'),
    skoldKort(1, 'Oval, av tre brädor, med kanten lindad i rå hud.'),
    skoldKort(2, 'Avlång, målad med rödockra, med åsen och bucklan i omålat trä och kanten lindad i rå hud.'),
]), 'f8_skold');
})();
