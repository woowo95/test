// fas 7:s nya bilder i valdelen, tre versioner av varje (som fas6.js), i paletten och 16 punkter per ruta.
// Den här filen har det gemensamma: formerna (som fas6.js), att lägga en bild på marken och korten, och stockvägen och
// bryggan. Varje system i fas 7 har sin egen fil i fas7/ (7.1-bara.js, 7.3-skjul.js …), som bygg.cjs läser i nummerordning
// efter den här, och som hämtar det gemensamma ur window.F7.
(() => {
  const hash = (a, b, c = 0) => { let n = (a * 374761393 + b * 668265263 + c * 1274126177) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const KORT = (id, namn, vad, versioner, extra = {}) => ({ id, namn, typ: 'tre', vad, versioner, ...extra });

  // ---------- formerna (som fas6.js och vargen i djur.js) ----------
  // varje form är en funktion (x, y) => sant inne i formen; former() fyller dem i ordning (de senare ovanpå) med en
  // bokstav eller en funktion som ger bokstaven, och lägger konturen 'o' runt allt
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
  // en färdig rad-bild får samma mörka kontur som allt som ritas med former
  const MED_KONTUR = rader => former(rader[0].length + 2, rader.length + 2, [[(x, y) => (rader[Math.floor(y) - 1] || '')[Math.floor(x) - 1] > '.', (x, y) => rader[Math.floor(y) - 1][Math.floor(x) - 1]]]).filter(r => /[^.]/.test(r));

  // ---------- att rita på kortet ----------
  // legenden: bokstav till 'ramp' + ton (0 mörkast, 3 ljusast), t.ex. { w: 'ben3', j: 'jord1' }; 'o' är konturen (kol0)
  function lagg(B, rader, legend, x0, y0, skugga = true) {
    ritaSprite(B, rader, { o: 'kol0', ...legend }, x0, y0);
    if (!skugga) return;
    const sista = rader.length - 1;
    [...rader[sista]].forEach((c, x) => { if (c !== '.') { B.morka(x0 + x, y0 + sista + 1); } });
  }
  // en sak på marken, i ett kort som är bilden plus marginal
  const PA_MARK = (text, rader, legend, m = 4) => {
    const w = bredd(rader) + m * 2, h = rader.length + m * 2;
    return { text, w, h, rita: (B) => lagg(B, rader, legend, m, m) };
  };
  // en rad bilder bredvid varandra, fötterna på samma rad: [rader, legend] per bild
  const PA_RAD = (text, bilder, m = 4, mellan = 4) => {
    const w = bilder.reduce((s, [r]) => s + bredd(r), 0) + mellan * (bilder.length - 1) + m * 2, h = Math.max(...bilder.map(([r]) => r.length)) + m * 2;
    return { text, w, h, rita: (B) => { let x = m; for (const [r, L] of bilder) { lagg(B, r, L, x, h - m - r.length); x += bredd(r) + mellan; } } };
  };
  // en godkänd bild ur bildstil/bilder (BILDFILER, t.ex. 'ved', 'tork', 'timmervagg') ritad i (x0, y0)
  const bildfil = (B, id, x0, y0) => { const o = BILDFILER[id]; if (!o) return; o.rader.forEach((r, y) => [...r].forEach((ch, x) => { const c = o.pal[ch]; if (ch === '.' || !c) return; if (c.startsWith('rgba')) B.morka(x0 + x, y0 + y); else B.satt(x0 + x, y0 + y, B.P.fran(c)); })); };
  // marken: gräs (och strand och vatten) som i spelet, ur mark.js
  const gras = (B, x0 = 0, y0 = 0, w = B.w, h = B.h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) B.satt(x, y, window.MARK.grasPunkt(x, y, B.P, 0)); };

  // ---------- 7.3.7 stockvägen ----------
  // Björn 2026-11-04: "en stockväg … ska kunna vara olika bred och även läggas som en hel plattform till ett torg. Det ska
  // vara distinkt från trägolv inomhus". Trägolvet är platta, mörka plankor i rutans mönster; vägen är stockar som ligger
  // tvärs över färdriktningen, med rundning (ljus överkant, mörk underkant), bark och ändar som syns i kanten.
  // Scenen i rutor (en byggd väg är alltid 2–3 rutor bred, 7.3.7; torget börjar på 10 × 10 rutor, 7.3.13): ett hörn
  // av torget, en väg tre rutor bred från vänster och en två rutor bred uppifrån.
  // 'h' = man färdas i sidled (stockarna står lodrätt i bilden), 'v' = man färdas uppåt och nedåt (stockarna ligger vågrätt)
  const R = 16, VW = 12, VH = 10;
  const DELAR = [[6, 3, 6, 7, 'h'], [0, 4, 6, 3, 'h'], [8, 0, 2, 3, 'v']];
  const delOf = (x, y, D = DELAR) => D.find(([tx, ty, w, h]) => x >= tx * R && x < (tx + w) * R && y >= ty * R && y < (ty + h) * R);
  // versionerna: t = stockens bredd i punkter, ton(u, d, ...) = färgen tvärs över stocken (u) och från änden (d)
  const VAGAR = [
    { // 0: runda, gråa och väderbitna stockar tätt intill varandra, ändarna sticker ut ojämnt
      t: 4, ut: 2, rals: false,
      ton: (P, u, d, log, x, y) => d === 0 ? P.i('ben', u === 3 ? 0 : 2) : u === 3 ? P.i('kol', 1) : hash(log, y, 3) < 0.07 ? P.i('kol', 2) : P.i(u === 0 ? 'ben' : u === 1 ? 'ben' : 'kol', u === 0 ? 1 : u === 1 ? 0 : 3),
    },
    { // 1: kluvna halvstockar med den flata sidan upp, ljusare, och en kantstock längs båda sidorna som håller dem på plats
      t: 5, ut: 0, rals: true,
      ton: (P, u, d, log, x, y) => u === 4 ? P.i('kol', 1) : u === 0 ? P.i('jord', 3) : u === 3 ? P.i('jord', 1) : hash(log, Math.floor(y / 3), 7) < 0.18 ? P.i('jord', 1) : P.i('jord', 2),
    },
    { // 2: runda stockar med glipor där jorden syns, mossa på några och ändarna ojämna
      t: 5, ut: 3, rals: false,
      ton: (P, u, d, log, x, y) => {
        if (u === 4) return hash(x, y, 11) < 0.3 ? P.i('oliv', 1) : P.i('jord', 0);
        if (d === 0) return P.i('senap', u === 1 || u === 2 ? 2 : 1);
        if (u < 2 && hash(log, Math.floor(y / 4), 5) < 0.16) return P.i('oliv', u === 0 ? 2 : 1);
        return u === 0 ? P.i('jord', 3) : u === 3 ? P.i('jord', 0) : hash(log, y, 9) < 0.08 ? P.i('jord', 0) : P.i('jord', u === 1 ? 2 : 1);
      },
    },
  ];
  function stockvag(B, v) {
    const P = B.P, V = VAGAR[v], ritad = new Set();
    const satt = (x, y, c) => { B.satt(x, y, c); ritad.add(x + ',' + y); };
    for (let y = 0; y < VH * R; y++) for (let x = 0; x < VW * R; x++) {
      const del = delOf(x, y); if (!del) continue;
      const h = del[4] === 'h', tvars = h ? x : y, langs = h ? y : x; // tvärs över stockarna och längs dem
      const log = Math.floor(tvars / V.t), u = tvars % V.t;
      const ute = k => !(h ? delOf(x, y + k) : delOf(x + k, y)); // är punkten k steg längs stocken utanför vägen
      const fore = ute(-1), efter = ute(1);
      // kantstocken längs vägen (version 1): tre punkter rund, längs med färden, ljus överst och mörk underst
      if (V.rals) {
        const upp = [0, 1, 2].find(k => ute(-k - 1)), ner = [0, 1, 2].find(k => ute(k + 1));
        const p = upp !== undefined ? upp : ner !== undefined ? 2 - ner : -1;
        if (p >= 0) { satt(x, y, P.i('jord', [3, 2, 0][p])); continue; }
      }
      const d = fore || efter ? 0 : 1;
      satt(x, y, V.ton(P, u, d, log + (h ? 0 : 500), x, y));
      // ändarna sticker ut utanför vägen, olika långt för varje stock
      if (V.ut && u < V.t - 1 && (fore || efter)) {
        const n = Math.floor(hash(log + (h ? 0 : 500), fore ? 1 : 2, v) * (V.ut + 1));
        for (let k = 1; k <= n; k++) { const xx = h ? x : x + (fore ? -k : k), yy = h ? y + (fore ? -k : k) : y; satt(xx, yy, V.ton(P, u, k === n ? 0 : 1, log + (h ? 0 : 500), xx, yy)); }
      }
    }
    // en skugga under och till höger om vägen, så att den ligger ovanpå marken
    for (const k of ritad) { const [x, y] = k.split(',').map(Number); if (!ritad.has(x + ',' + (y + 1))) B.morka(x, y + 1); }
  }
  const STOCKVAG = (text, v) => ({ text, w: VW * R, h: VH * R, rita: (B) => stockvag(B, v) });

  // tre nya av version 3 (Björn 2026-11-04: "gör tre versioner till utgå från version 3 ha kvar originalet men lägg till mer
  // ojämnheter och gräs som växer upp emellan"): stockar som är olika tjocka, ändar som slutar olika långt (också innanför
  // kanten), glipor med gräs och tuvor som växer in över stockarnas kanter. o: hur mycket av varje
  //   tjock: stockarnas tjocklek (minst, antal steg), glipa: gliporna (minst, antal steg), gras: gräs i gliporna (andel),
  //   tuva: gräs som växer över kanten, ut/in: hur långt ändarna kan sticka ut eller sluta innanför, sjunk: andel stockar
  //   som sjunkit ner och är mörkare, mossa: andel fläckar mossa
  const OJAMNA = [
    { tjock: [4, 3], glipa: [1, 2], gras: 0.75, tuva: 0.12, ut: 4, in: 2, sjunk: 0.12, mossa: 0.16 },
    { tjock: [4, 2], glipa: [1, 3], gras: 0.9, tuva: 0.22, ut: 3, in: 3, sjunk: 0.2, mossa: 0.22 },
    { tjock: [3, 4], glipa: [1, 2], gras: 0.85, tuva: 0.35, ut: 5, in: 4, sjunk: 0.28, mossa: 0.32 },
  ];
  // D: vägens delar (rutor), fast: punkter som räknas som väg fast de inte ritas här (bryggan, så att stockarna går ända fram)
  function ojamn(B, v, D = DELAR, fast = () => false) {
    const P = B.P, o = OJAMNA[v], ritad = new Set();
    const satt = (x, y, c) => { B.satt(x, y, c); ritad.add(x + ',' + y); };
    // stockarna tvärs över vägen: var och en med egen tjocklek och glipa, samma för hela kartan i varje riktning
    const stockar = h => { const L = []; let p = 0, n = 0; while (p < 1000) { const t = o.tjock[0] + Math.floor(hash(n, 1, v + (h ? 0 : 50)) * o.tjock[1]), g = o.glipa[0] + Math.floor(hash(n, 2, v + (h ? 0 : 50)) * o.glipa[1]); for (let k = 0; k < t + g; k++) L[p + k] = [n, k, t]; p += t + g; n++; } return L; };
    const SH = stockar(true), SV = stockar(false);
    const gras = (x, y, h) => hash(h ? x : y, Math.floor((h ? y : x) / 3), 31) < 0.4 ? P.i('oliv', 2) : P.i('oliv', 1); // strån på längden i glipan
    const stock = (u, t, log, x, y, slut) => {
      const sj = hash(log, 3, v) < o.sjunk; // en stock som sjunkit ner i marken: en ton mörkare
      if (slut) return P.i('senap', u > 0 && u < t - 1 ? (sj ? 1 : 2) : 1);
      if (u < 2 && hash(log, Math.floor(y / 4) + Math.floor(x / 4) * 7, 5) < o.mossa) return P.i('oliv', u === 0 ? 2 : 1);
      const ton = u === 0 ? 3 : u === t - 1 ? 0 : hash(x, y, 9) < 0.08 ? 0 : u === 1 ? 2 : 1;
      return P.i('jord', Math.max(0, ton - (sj ? 1 : 0)));
    };
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) {
      const del = delOf(x, y, D); if (!del) continue;
      const h = del[4] === 'h', tvars = h ? x : y;
      const [log0, u, t] = (h ? SH : SV)[tvars], log = log0 + (h ? 0 : 500);
      const ute = k => { const xx = h ? x : x + k, yy = h ? y + k : y; return !delOf(xx, yy, D) && !fast(xx, yy); };
      if (u >= t) { if (hash(log, Math.floor((h ? y : x) / 5), 13) < o.gras) satt(x, y, gras(x, y, h)); else satt(x, y, P.i('jord', 0)); continue; } // glipan: gräs i bitar, jord emellan
      // ändarna: varje stock slutar olika långt, ibland innanför kanten så att marken syns
      const fore = [...Array(o.in + 1).keys()].find(k => ute(-k - 1)), efter = [...Array(o.in + 1).keys()].find(k => ute(k + 1));
      const inF = Math.floor(hash(log, 6, v) * (o.in + 1)) - Math.floor(o.in / 2), inE = Math.floor(hash(log, 7, v) * (o.in + 1)) - Math.floor(o.in / 2);
      if (fore !== undefined && fore < inF) continue;
      if (efter !== undefined && efter < inE) continue;
      const slut = (fore !== undefined && fore === Math.max(0, inF)) || (efter !== undefined && efter === Math.max(0, inE));
      // gräs som växer upp över stockens kant
      if ((u === 0 || u === t - 1 || (u === 1 && hash(log, Math.floor((h ? y : x) / 3), 19) < 0.4)) && hash(log + u * 7, Math.floor((h ? y : x) / 3), 17) < o.tuva) { satt(x, y, gras(x, y, h)); continue; } // tuvor in över kanten
      satt(x, y, stock(u, t, log, x, y, slut));
      if (slut && (fore === 0 || efter === 0) && inF <= 0 && inE <= 0) { // ändar som sticker ut utanför vägen
        const f = fore === 0, n = Math.floor(hash(log, f ? 1 : 2, v + 9) * (o.ut + 1));
        for (let k = 1; k <= n; k++) { const xx = h ? x : x + (f ? -k : k), yy = h ? y + (f ? -k : k) : y; satt(xx, yy, stock(u, t, log, xx, yy, k === n)); }
      }
    }
    for (const k of ritad) { const [x, y] = k.split(',').map(Number); if (!ritad.has(x + ',' + (y + 1))) B.morka(x, y + 1); }
  }
  const OJAMN = (text, v) => ({ text, w: VW * R, h: VH * R, rita: (B) => ojamn(B, v) });

  // ---------- 7.3.9 bryggan ----------
  // Björn 2026-11-04: "bygg en brygga. Den ska vara ganska lik trävägen. Den ska funka att sätta ihop med trävägen utan
  // mellanrum". Steg 7.3.9: en brygga är 1 ruta bred, börjar på en strandruta och går 2–4 rutor rakt ut i vattnet.
  // Scenen: gräs, en stockväg två rutor bred längs stranden (den valda stockvägen, version 2) och bryggan fyra rutor ut från
  // den. Bryggans stockar ligger tvärs över färdriktningen som vägens, i samma bruna toner, så att de hör ihop; det som skiljer
  // är vattnet under (i gliporna och skuggan) och pålarna den står på.
  const STRAND = 4.5, VAGEN = [[0, 2, VW, 2, 'h']], BX = 6, BY = 4, BL = 4; // bryggan: ruta BX, rutorna BY till BY + BL - 1
  const iBrygga = (x, y) => x >= BX * R && x < (BX + 1) * R && y >= BY * R && y < (BY + BL) * R;
  // versionerna: tjock/glipa som stockvägen, ut: hur långt ändarna sticker ut, balk: bärande bjälkar längs kanterna som syns
  // i gliporna, palar: var pålarna står ('hörn' i varje ruta, 'slut' bara längst ut), mossa: andel fläckar mossa
  const BRYGGOR = [
    { tjock: [4, 3], glipa: [0, 2], ut: 2, balk: false, palar: 'hörn', mossa: 0.08 },
    { tjock: [4, 2], glipa: [1, 2], ut: 1, balk: true, palar: 'hörn', mossa: 0.04 },
    { tjock: [3, 4], glipa: [0, 3], ut: 3, balk: true, palar: 'slut', mossa: 0.18 },
  ];
  function brygga(B, v) {
    const P = B.P, o = BRYGGOR[v], M = window.MARK, bryggan = new Set();
    const satt = (x, y, c) => { B.satt(x, y, c); bryggan.add(x + ',' + y); };
    // marken: gräs, stranden och vattnet som i spelet
    const sd = (x, y) => M.spelSd(x, y, y / R - STRAND);
    for (let y = 0; y < VH * R; y++) for (let x = 0; x < VW * R; x++) { const c = M.spelVatten(x, y, sd(x, y), P); B.satt(x, y, c !== null ? c : M.grasPunkt(x, y, P, 0)); }
    M.tuvor(B, 0, (x, y) => sd(x, y) < -0.9 && !delOf(x, y, VAGEN));
    ojamn(B, 0, VAGEN, iBrygga); // stockvägen, med stockarna ända fram till bryggan
    // bryggans stockar, uppifrån och ner, med egna tjocklekar och glipor
    const x0 = BX * R, x1 = (BX + 1) * R - 1, y1 = (BY + BL) * R;
    let y = BY * R, n = 0;
    while (y < y1) {
      const t = Math.min(y1 - y, o.tjock[0] + Math.floor(hash(n, 1, v + 70) * o.tjock[1])), g = o.glipa[0] + Math.floor(hash(n, 2, v + 70) * o.glipa[1]);
      const sj = hash(n, 3, v + 70) < 0.15; // en stock som är mörkare än de andra
      const uL = Math.floor(hash(n, 4, v + 70) * (o.ut + 1)), uR = Math.floor(hash(n, 5, v + 70) * (o.ut + 1));
      for (let u = 0; u < t; u++) for (let x = x0 - uL; x <= x1 + uR; x++) {
        const slut = x === x0 - uL || x === x1 + uR;
        let c;
        if (slut) c = P.i('senap', u > 0 && u < t - 1 ? (sj ? 1 : 2) : 1);
        else if (u < 2 && hash(n, Math.floor(x / 4), 5 + v) < o.mossa) c = P.i('oliv', u === 0 ? 2 : 1);
        else { const ton = u === 0 ? 3 : u === t - 1 ? 0 : hash(x, y + u, 9) < 0.08 ? 0 : u === 1 ? 2 : 1; c = P.i('jord', Math.max(0, ton - (sj ? 1 : 0))); }
        satt(x, y + u, c);
      }
      // glipan: vattnet syns, i skugga, och bjälkarna under stockarna längs kanterna
      for (let u = t; u < t + g && y + u < y1; u++) for (let x = x0; x <= x1; x++) {
        const k = x - x0;
        if (o.balk && (k === 1 || k === 2 || k === 13 || k === 14)) satt(x, y + u, P.i('jord', k === 1 || k === 13 ? 1 : 0));
        else B.morka(x, y + u);
      }
      y += t + g; n++;
    }
    // pålarna: runda och avsågade, lite utanför bryggans kanter, med en mörk spegelbild i vattnet under
    const pale = (px, py) => {
      for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 3; dx++) {
        const kant = dx !== 1 || dy === 0 || dy === 3;
        satt(px + dx, py + dy, dy === 3 ? P.i('kol', 1) : kant ? P.i('jord', 0) : P.i('senap', dy === 1 ? 2 : 1));
      }
      for (let k = 4; k < 7; k++) B.morka(px + 1, py + k);
    };
    for (let ty = BY; ty < BY + BL; ty++) {
      const sista = ty === BY + BL - 1;
      if (ty === BY) continue; // första rutan vilar på stranden
      if (o.palar === 'hörn' || sista) { pale(x0 - o.ut - 3, ty * R + (sista ? 9 : 6)); pale(x1 + o.ut + 1, ty * R + (sista ? 9 : 6)); }
    }
    // skuggan på vattnet under och till höger om bryggan
    for (const k of [...bryggan]) {
      const [x, y] = k.split(',').map(Number);
      for (const [dx, dy] of [[0, 1], [0, 2], [1, 1], [1, 2], [2, 2]]) { const q = (x + dx) + ',' + (y + dy); if (!bryggan.has(q) && y + dy >= y1 - 2 + (iBrygga(x, y) ? 0 : -999) && sd(x + dx, y + dy) > 0) { B.morka(x + dx, y + dy); bryggan.add(q); } }
    }
    for (let yy = BY * R; yy < y1 + 2; yy++) for (const xx of [x1 + o.ut + 1, x1 + o.ut + 2]) { const q = xx + ',' + yy; if (!bryggan.has(q) && sd(xx, yy) > 0) { B.morka(xx, yy); bryggan.add(q); } }
  }
  const BRYGGA = (text, v) => ({ text, w: VW * R, h: VH * R, rita: (B) => brygga(B, v) });

  VAL.push(
    KORT('f7_stockvag', 'Stockvägen', 'Steg 7.3.7: en väg av stockar som byn lägger på gångstråken, med stockarna tvärs över färdriktningen så att den inte liknar trägolvet inne. Bilden visar vägen tre och två rutor bred och ett hörn av torget. Du valde version 3; den står kvar som den var, och de tre nya utgår från den. Din kommentar förra gången: ”gör tre versioner till utgå från version 3 ha kvar originalet men lägg till mer ojämnheter och gräs som växer upp emellan”.', [
      STOCKVAG('Version 3 som förut: bruna runda stockar med glipor där jorden syns, mossa på några och ojämna ändar.', 2),
      OJAMN('Stockar som är olika tjocka, gräs i de flesta gliporna och ändar som slutar olika långt.', 0),
      OJAMN('Bredare glipor fulla av gräs, fler tuvor över kanterna och några stockar som sjunkit ner och är mörkare.', 1),
      OJAMN('Den äldsta: gräset växer in över stockarna, mycket mossa, många sjunkna stockar och ändar som slutar långt innanför kanten.', 2)]),
    KORT('f7_brygga', 'Bryggan', 'Steg 7.3.9: en brygga en ruta bred som byn bygger av virke från stranden rakt ut i vattnet, två till fyra rutor. Den är byggd som stockvägen du valde (version 2), med stockarna tvärs över, och sitter ihop med vägen utan mellanrum. Bilden visar vägen längs stranden och bryggan fyra rutor ut.', [
      BRYGGA('Täta stockar som vägens, ändar som sticker ut lite olika och en påle vid varje ruta.', 0),
      BRYGGA('Smala glipor där vattnet syns, bjälkarna under som bär stockarna och en påle vid varje ruta.', 1),
      BRYGGA('Den äldsta: olika tjocka stockar, bredare glipor, mossa och pålar bara längst ut.', 2)]),
  );

  // det gemensamma till filerna i fas7/. Stockvägen du valde är version 2 på kortet, ojamn(B, 0, delar): delar är
  // [rutaX, rutaY, bredd, höjd, 'h' | 'v'] i rutor ('h' = man färdas i sidled), och fast(x, y) säger vilka punkter utanför
  // delarna som ändå räknas som väg (så att stockarna går ända fram)
  window.F7 = { hash, KORT, ell, linje, tri, poly, och, utan, punkt, rakt, former, bredd, MED_KONTUR, lagg, PA_MARK, PA_RAD, bildfil, gras, R, ojamn, brygga };
})();
