// Bestskaparen: den legendariska besten av delar i lager, sedd från sidan (och spegelvänd).
// Varje lager är en rad i registret LAGER med sina delar. En del ritar former (masker) i ett material;
// färgerna ger varje material en ramp och en grundton. Alla delar skuggas på samma sätt: ljus uppifrån
// och från vänster, skugga nedåt, kolkontur runt varje del. Delar på bortre sidan ritas en ton mörkare.
(() => {
  const W = 136, H = 99, OY = 15, G = 74 + OY; // scenen i punkter; G är marken där fötterna står, OY ger plats åt vingarna
  const P = PAL;

  // ---------- former: en mask (Uint8Array W × H) ----------
  const tom = () => new Uint8Array(W * H);
  const fyll = (f, m = tom()) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (f(x + 0.5, y + 0.5)) m[y * W + x] = 1; return m; };
  const ell = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const poly = pts => (x, y) => {
    let inne = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inne = !inne;
    }
    return inne;
  };
  // en böjd lem eller svans: punkter med en radie var, rundad mellan dem
  const kapsel = (pts, r) => (x, y) => {
    for (let n = 0; n < pts.length - 1; n++) {
      const [ax, ay] = pts[n], [bx, by] = pts[n + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
      const u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
      const rr = r[n] + (r[n + 1] - r[n]) * u;
      if (Math.hypot(x - ax - u * dx, y - ay - u * dy) <= rr) return true;
    }
    return false;
  };
  const strack = (x, y, [ax, ay], [bx, by]) => {
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
    return { d: Math.hypot(x - ax - u * dx, y - ay - u * dy), u, sida: Math.sign(dx * (y - ay) - dy * (x - ax)) };
  };
  const eller = (...f) => (x, y) => f.some(g => g(x, y));
  const utom = (f, g) => (x, y) => f(x, y) && !g(x, y);
  const ihop = (...m) => { const u = tom(); m.forEach(a => a && a.forEach((v, i) => { if (v) u[i] = 1; })); return u; };
  const flytta = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
  // punkten t (0–1) längs en linje av punkter
  const langs = (pts, t) => {
    const L = []; let s = 0;
    for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); L.push(d); s += d; }
    let k = t * s;
    for (let i = 0; i < L.length; i++) { if (k <= L[i] || i === L.length - 1) { const u = L[i] ? Math.min(1, k / L[i]) : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u]; } k -= L[i]; }
    return pts[pts.length - 1];
  };
  // översta punkten i masken i varje kolumn (ryggen)
  const ryggen = (m, x0, x1) => { const r = []; for (let x = Math.round(x0); x <= Math.round(x1); x++) { for (let y = 0; y < H; y++) if (m[y * W + x]) { r.push([x, y]); break; } } return r; };

  // ---------- färgerna: material → ramp och grundton ----------
  const FARGER = [
    { id: 'skog', namn: 'Skog och glöd', text: 'mörkgrön kropp, horn av ben, rostiga plattor och gula ögon som lyser',
      m: { kropp: ['barr', 2], horn: ['ben', 2], skal: ['jord', 2], platta: ['rost', 2], hard: ['senap', 1], man: ['senap', 0], tecken: ['senap', 3], hinna: ['rost', 1], fjader: ['jord', 2], oga: ['senap', 3], mun: ['rost', 0], tand: ['ben', 3], klo: ['ben', 1], slem: ['oliv', 3], mossa: ['oliv', 2], kristall: ['skiffer', 3], glod: ['senap', 3], benrest: ['ben', 2], hal: ['rost', 0], flack: ['jord', 1] } },
    { id: 'aska', namn: 'Aska och blod', text: 'kolsvart kropp, horn av ben, blodröda hinnor och tecken och röda ögon som lyser',
      m: { kropp: ['kol', 2], horn: ['ben', 2], skal: ['skiffer', 1], platta: ['rost', 1], hard: ['skiffer', 2], man: ['rost', 1], tecken: ['rost', 3], hinna: ['rost', 0], fjader: ['skiffer', 1], oga: ['rost', 3], mun: ['rost', 0], tand: ['ben', 3], klo: ['ben', 2], slem: ['skiffer', 3], mossa: ['oliv', 1], kristall: ['rost', 3], glod: ['rost', 3], benrest: ['ben', 2], hal: ['rost', 0], flack: ['oliv', 1] } },
  ];

  // ---------- kroppen bestämmer var allt annat sitter ----------
  // h, f: höften och bogen där benen börjar; svans: svansroten; nacke: halsens början och slut (huvudet sitter i slutet);
  // vinge: vingens rot; mitt: mitt på ryggen; lang: hur långt bak och fram skal och plattor räcker.
  // Kroppsformer som inte är fyrbenta: former (fler former i bålen, t.ex. en orms kropp), benpar (lederna för benen,
  // [x, y, 'bak' | 'fram'], om de inte är höften och bogen), delar (kroppens egna delar, t.ex. ett snäckskal: former,
  // material, z 'bak' | 'skal' | 'ovan', rygg om plattorna ska stå på dem) och utan (lagren som inte passar kroppen;
  // de ritas inte och är gråa i väljaren). Allt i kroppens koordinater, utan OY.
  const KROPPAR = [
    { id: 'rovdjur', namn: 'Rovdjur', text: 'tunga skuldror, smal midja och huvudet lågt framåt',
      bal: [[38, 46], [44, 39], [54, 40], [62, 35], [70, 28], [78, 28], [84, 33], [87, 42], [84, 52], [76, 56], [66, 53], [56, 51], [48, 53], [40, 52], [35, 49]],
      nacke: [[80, 36], [92, 43]], nackeR: [9, 6.5], h: [46, 46], f: [77, 47], svans: [38, 44], vinge: [72, 32], lang: [42, 84] },
    { id: 'odla', namn: 'Ödla', text: 'lång och låg, med magen nära marken och halsen rak fram',
      bal: [[34, 56], [40, 50], [52, 47], [66, 47], [78, 49], [85, 54], [84, 60], [74, 64], [56, 65], [42, 64], [35, 61]],
      nacke: [[80, 53], [93, 50]], nackeR: [7.5, 5.5], h: [44, 59], f: [76, 59], svans: [36, 56], vinge: [66, 49], lang: [38, 84] },
    { id: 'orm', namn: 'Lindorm', text: 'en orm utan ben som ligger i bågar längs marken och reser framkroppen', ny: true, utan: ['ben', 'svans'],
      former: [{ typ: 'kapsel', pts: [[5, 71], [13, 69], [22, 66], [30, 60], [38, 57], [46, 61], [54, 66], [62, 64], [69, 57], [74, 49], [77, 43]], r: [1, 2.4, 3.8, 4.8, 5.4, 6, 6.6, 7, 7, 6.8, 6.5] }],
      nacke: [[77, 45], [89, 34]], nackeR: [6.5, 5.5], h: [42, 61], f: [64, 63], svans: [9, 70], vinge: [57, 58], lang: [26, 80] },
    { id: 'snigel', namn: 'Snäckbest', text: 'en jättesnigel på en slemmig fot, med ett snäckskal i spiral på ryggen', ny: true, utan: ['ben', 'svans', 'skal'],
      former: [{ typ: 'kapsel', pts: [[20, 71], [30, 68.5], [46, 67], [64, 67], [75, 64.5], [82, 58]], r: [2, 4.5, 6, 6, 5.8, 5.4] }],
      nacke: [[81, 61], [89, 50]], nackeR: [5.5, 5], h: [40, 67], f: [70, 65], svans: [22, 70], vinge: [52, 26], lang: [32, 74],
      delar: [{ former: [{ typ: 'ell', c: [51, 44], r: [21, 20] }], mat: 'skal', z: 'skal', rygg: true,
        // spiralen: en mörk fåra och en ljus kant som vrider sig in mot mitten, och mynningen nertill fram
        monster(x, y) {
          const dx = x + 0.5 - 51, dy = y + 0.5 - 44 - OY, rr = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
          if (rr < 2) return -1;
          const t = rr / 6.6 - a / (2 * Math.PI), f = t - Math.floor(t);
          if (f < 0.11) return -2;
          if (f < 0.24) return -1;
          if (f > 0.86) return 1;
          return (Math.floor(rr * 1.4 + a * 3) % 5 === 0) ? -1 : 0;
        } }] },
  ];

  // ---------- delarna i varje lager ----------
  // en del ger en lista av { mask, mat, far, kontur, monster(x, y, v), lyser, z }; z bestämmer ordningen (lågt först)
  const Z = { farVinge: 0, farBen: 1, farHorn: 2, platta: 3, svans: 4, kropp: 5, skal: 6, klubba: 7, man: 8, hard: 9, ben: 10, harBen: 11, vinge: 12, huvud: 13, tecken: 14, horn: 15, oga: 16 };

  const BEN = [
    { id: 'klor', namn: 'Klor', text: 'böjda rovdjursben på tårna, med klor',
      ben(J, bak, far) {
        const dy = G - J[1], fy = far ? G - 2 : G - 1;
        const pts = bak ? [J, [J[0] + 5, J[1] + dy * 0.38], [J[0] - 3, fy - 8], [J[0] + 1, fy - 1]] : [J, [J[0] - 3, J[1] + dy * 0.45], [J[0] + 1, fy - 5], [J[0] + 3, fy - 1]];
        const r = bak ? [7.5, 5, 3.4, 3] : [7, 5, 4, 3];
        // tårna var för sig (tre, den bakersta först), med krökta klor
        const [tx, ty] = pts[3], tar = [], klor = [];
        for (let i = 0; i < 3; i++) {
          const x = tx - 1 + i * 2.8;
          tar.push({ mask: fyll(ell(x, fy - 2, 2.2, 2.2)), mat: 'kropp', z: 0.05 + i * 0.01 });
          klor.push(poly([[x + 1.2, fy - 3], [x + 3.6, fy - 1.6], [x + 3.4, fy + 0.7], [x + 2.5, fy - 0.6], [x + 1.4, fy - 1]]));
        }
        const fot = ell(tx, fy - 3, 2.8, 2.2);
        const [a0, a1, a2, a3] = pts;
        // muskeln på låret, en ljus knöl på leden och tvärplattor på skenan och vristen
        const monster = (x, y, v) => {
          const s3 = strack(x, y, a2, a3);
          if (s3.d <= r[2] + 0.6) return y % 2 === 0 ? -1 : 1;
          if (Math.hypot(x - a1[0], y - a1[1]) < 1.8) return 1;
          const s1 = strack(x, y, a0, a1);
          if (s1.u > 0.15 && s1.u < 0.95 && s1.sida === (bak ? 1 : -1)) { const k = s1.d - r[0] * 0.38; if (k > 0 && k < 1.1) return -1; if (k > -1.1 && k <= 0) return 1; }
          const s2 = strack(x, y, a1, a2);
          if (s2.u > 0.2 && s2.u < 0.85 && s2.sida === (bak ? -1 : 1)) { const k = s2.d - r[1] * 0.3; if (k > 0 && k < 1) return -1; if (k > -1 && k <= 0) return 1; }
          return null;
        };
        return { mask: fyll(eller(kapsel(pts, r), fot)), monster, extra: [...tar, { mask: fyll(eller(...klor)), mat: 'klo', z: 0.1 }], leder: [pts[1], pts[2]], skena: [pts[2], pts[3]] };
      } },
    { id: 'pelare', namn: 'Pelare', text: 'tjocka raka ben som stolpar, med breda fötter och naglar',
      ben(J, bak, far) {
        const fy = far ? G - 2 : G - 1, dy = fy - J[1];
        const pts = bak ? [J, [J[0] - 1, J[1] + dy * 0.5], [J[0] + 1, fy - 3]] : [J, [J[0] + 1, J[1] + dy * 0.5], [J[0], fy - 3]];
        const fot = poly([[pts[2][0] - 6, fy - 4], [pts[2][0] + 6, fy - 4], [pts[2][0] + 7, fy], [pts[2][0] - 6, fy]]);
        const naglar = [-3, 0, 3].map(i => poly([[pts[2][0] + i + 0.5, fy - 2], [pts[2][0] + i + 3, fy - 2], [pts[2][0] + i + 3, fy], [pts[2][0] + i + 0.5, fy]]));
        // veck runt underbenet, en muskel på låret och en mörk kant där foten börjar
        const monster = (x, y, v) => {
          if (y >= fy - 4 && y <= fy - 3) return -1;
          if (y > fy - 3) return y === fy ? -1 : null;
          if (y > pts[0][1] + 4) { const k = (y + Math.round(Math.sin(x * 0.9) * 0.7)) % 3; return k === 0 ? -1 : k === 1 ? 1 : 0; }
          const s1 = strack(x, y, pts[0], pts[1]);
          if (s1.u > 0.2 && s1.u < 0.9 && Math.abs(x - pts[0][0] + (bak ? 2.5 : -2.5)) < 0.6) return -1;
          return null;
        };
        return { mask: fyll(eller(kapsel(pts, [7.5, 6.5, 6]), fot)), monster, extra: [{ mask: fyll(eller(...naglar)), mat: 'klo', kontur: false, z: 0.1 }], leder: [pts[1], [pts[2][0], pts[2][1] - 2]], skena: [pts[1], pts[2]] };
      } },
  ];

  // texturen: ytan på kroppen, halsen, käken, svansen och benen. yta(x, y, v, du, dl, dr, h) ger en tonändring
  // (h är formens höjd i den kolumnen); form(mask) får ändra konturen, och droppar() ger slemmets droppar
  const kant = (m, x, y) => x < 0 || y < 0 || x >= W || y >= H || !m[y * W + x];
  // celler: den närmaste och näst närmaste punkten i ett skakat rutnät med sidan s (för sten, sprickor och vårtor)
  const celler = (x, y, s, fro) => {
    const gx = Math.floor(x / s), gy = Math.floor(y / s); let d1 = 1e9, d2 = 1e9, px = 0, py = 0, id = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = (gx + i + 0.15 + hash(gx + i, gy + j, fro) * 0.7) * s, cy = (gy + j + 0.15 + hash(gx + i, gy + j, fro + 1) * 0.7) * s, d = Math.hypot(x - cx, y - cy);
      if (d < d1) { d2 = d1; d1 = d; px = cx; py = cy; id = (gx + i) * 1000 + gy + j; } else if (d < d2) d2 = d;
    }
    return { d1, d2, px, py, id };
  };
  // överst i masken ovanför punkten (hur långt ner i formen den ligger)
  const djup = (m, x, y) => { let k = 0; while (y - k - 1 >= 0 && m[(y - k - 1) * W + x]) k++; return k; };
  const klipp = (m, f) => { const u = tom(); for (let i = 0; i < m.length; i++) if (m[i] && f(i % W, (i / W) | 0)) u[i] = 1; return u; };
  const vartor = (x, y) => {
    // vårtor i olika storlek: ljus knöl med en ljusare prick uppe till vänster och en mörk ring runt, mörkast under
    const c = celler(x, y, 7, 70);
    if (hash(c.id, 0, 71) > 0.85) return 0;
    const r = 1.4 + hash(c.id, 1, 72) * 1.5;
    if (c.d1 < r) return (x - c.px + y - c.py < -r * 0.6) ? 2 : 1;
    if (c.d1 < r + 1.1) return y >= c.py ? -2 : -1;
    return 0;
  };
  const TEXTURER = [
    { id: 'pals', namn: 'Päls', text: 'tjock päls med tofsar som sticker ut bakåt längs ryggen och hänger under magen',
      yta(x, y, v, du, dl) {
        // hårstrån som ligger bakåt och nedåt, i korta tag
        if (du === 0 || dl === 0) return 0;
        const k = (x + y) % 4, tag = hash(Math.floor((x - y) / 3), Math.floor((x + y) / 4), 3);
        if (tag < 0.3) return 0;
        return k === 0 ? -1 : k === 1 && v < 0.5 ? 1 : 0;
      },
      form(m) {
        const u = m.slice(), satt = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < G - 2) u[y * W + x] = 1; };
        for (let y = 1; y < H - 1; y++) for (let x = 3; x < W; x++) {
          if (!m[y * W + x]) continue;
          const q = hash(x >> 2, y >> 2, 6);
          // tofsar på ryggen pekar bakåt och uppåt, under magen hänger de bakåt och nedåt
          if (kant(m, x, y - 1) && x % 4 === 0 && q < 0.75) { satt(x - 1, y - 1); satt(x - 2, y - 1); satt(x - 2, y - 2); satt(x - 3, y - 2); if (q < 0.35) satt(x - 4, y - 3); }
          if (kant(m, x, y + 1) && x % 4 === 0 && y < G - 6 && q < 0.8) { satt(x, y + 1); satt(x - 1, y + 1); satt(x - 1, y + 2); satt(x - 2, y + 3); if (q < 0.4) satt(x - 2, y + 4); }
        }
        return u;
      } },
    { id: 'fjall', namn: 'Fjäll', text: 'små fjäll i rader, förskjutna som tegel på ett tak',
      yta(x, y, v, du, dl) {
        if (du === 0 || dl === 0) return 0;
        const rad = Math.floor(y / 3), cx = (x + (rad % 2) * 2) % 4, cy = y % 3;
        if (cy === 2 && cx !== 0) return -1;
        if (cy === 0 && cx === 2 && v < 0.5) return 1;
        return 0;
      } },
    { id: 'skinn', namn: 'Skinn', text: 'slät och bar hud, utan fjäll eller hår',
      yta: () => 0 },
    { id: 'slem', namn: 'Slem', text: 'blank och våt, med glänsande fläckar och slem som droppar under magen och käken',
      yta(x, y, v, du, dl) {
        if (du === 1 && v < 0.3) return 1;
        if (v < 0.45 && hash(x >> 1, y >> 1, 7) < 0.1) return 2;
        if (v < 0.55 && (x - y) % 7 === 0 && hash(x >> 2, y >> 2, 8) < 0.5) return 1;
        if (du > 0 && dl > 0 && hash(x, y, 11) < 0.012) return 2;
        return 0;
      },
      droppar(m) {
        const d = tom();
        for (let y = 1; y < H - 1; y++) for (let x = 0; x < W; x++) {
          if (!m[y * W + x] || !kant(m, x, y + 1) || y > G - 5) continue;
          const q = hash(x, y, 12);
          if (q < 0.14 && !d[y * W + x - 1]) { const l = 1 + Math.floor(q * 30); for (let k = 1; k <= l && y + k < G - 1; k++) d[(y + k) * W + x] = 1; }
        }
        return d;
      } },
    { id: 'fjadrar', namn: 'Fjädrar', text: 'små fjädrar som ligger bakåt i rader, med fransar under magen',
      yta(x, y, v, du, dl) {
        if (du === 0 || dl === 0) return 0;
        // fjädrarna ligger i rader som är förskjutna en halv fjäder och lutar bakåt (spetsen åt vänster och nedåt):
        // en rundad mörk kant nedtill och ljust strax ovanför kanten
        const rad = Math.floor(y / 6), cy = y % 6, cx = (x + (rad % 2) * 3 + (cy >> 2) + 600) % 6;
        const kant = [-1, 3, 4, 5, 4, 3][cx];
        if ((cx === 0 && cy <= 2) || cy === kant) return -2;
        if (cy === kant - 1 && cx >= 1 && cx <= 4) return 1;
        return 0;
      },
      form(m) {
        const u = m.slice(), satt = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < G - 2) u[y * W + x] = 1; };
        for (let y = 1; y < H - 1; y++) for (let x = 2; x < W; x++) {
          if (!m[y * W + x]) continue;
          if (kant(m, x, y + 1) && x % 3 === 0 && y < G - 6) { satt(x, y + 1); satt(x - 1, y + 1); satt(x - 1, y + 2); }
          if (kant(m, x, y - 1) && x % 5 === 0) satt(x - 1, y - 1);
        }
        return u;
      } },
    { id: 'bark', namn: 'Bark och mossa', text: 'skrovlig bark med djupa fåror, mossa på ryggen och lav i fläckar',
      yta(x, y, v, du) {
        if (du === 0) return 0;
        const w = Math.round(Math.sin(x * 0.25 + hash(x >> 3, 0, 40) * 6) * 1.5), k = (((y + w) % 4) + 4) % 4;
        if (hash(x, y, 22) < 0.008) return 2;
        if (hash(x >> 2, (y + w) >> 2, 41) < 0.25) return 0;
        return k === 0 ? -2 : k === 1 && v < 0.6 ? 1 : 0;
      },
      extra(kropp) {
        // mossan växer överst på ryggen, halsen och svansen, och sticker upp i små tuvor
        const mossa = klipp(kropp, (x, y) => djup(kropp, x, y) <= 2 + Math.floor(hash(x >> 2, 0, 42) * 4) && hash(x >> 3, y >> 3, 43) < 0.7);
        for (let i = W; i < mossa.length; i++) if (mossa[i] && !kropp[i - W] && hash(i, 0, 44) < 0.4) mossa[i - W] = 1;
        return [{ mask: mossa, mat: 'mossa', kontur: false, z: Z.kropp + 0.3, monster: (x, y) => (hash(x, y, 21) < 0.3 ? 1 : hash(x, y, 21) > 0.75 ? -1 : 0) }];
      } },
    { id: 'sten', namn: 'Sten', text: 'sprucken som ett berg, i kantiga block, med kristaller som växer ur ryggen',
      yta(x, y) {
        const c = celler(x, y, 7, 50);
        if (c.d2 - c.d1 < 0.9) return -2;
        if (celler(x, y - 2, 7, 50).id !== c.id) return 1;
        if (hash(x, y, 51) < 0.04) return -1;
        return 0;
      },
      extra(kropp, A) {
        const r = ryggen(kropp, A.svans[0] - 2, A.nacke[1][0] - 4), d = [];
        r.forEach(([x, y], i) => {
          if (i % 9 !== 4 || hash(x, 0, 52) < 0.2) return;
          for (const [dx, l, lut] of [[0, 7 + hash(x, 1, 53) * 5, -1], [3, 4 + hash(x, 2, 53) * 3, 1]]) {
            const cx = x + dx, t = [cx + lut * l * 0.25, y - l];
            d.push({ mask: fyll(poly([[cx - 2, y + 3], [cx - 2, y - 1], t, [cx + 2, y - 1], [cx + 2, y + 3]])), mat: 'kristall', z: Z.platta + 0.5, monster: xx => (xx < t[0] ? 1 : -1) });
          }
        });
        return d;
      } },
    { id: 'kitin', namn: 'Kitin', text: 'blankt insektsskal i hårda segment, med en glansrand',
      yta(x, y, v, du, dl, dr, h, d) {
        if (d && d.sida) { const k = y % 5, w = dl / Math.max(1, dl + dr); return k === 0 ? -2 : k === 1 ? -1 : w > 0.15 && w < 0.3 ? 2 : 0; }
        const k = (((x + Math.round(v * 3)) % 7) + 7) % 7;
        if (k === 0) return -2;
        if (k === 1) return -1;
        if (v > 0.12 && v < 0.24) return 2;
        return 0;
      } },
    { id: 'glod', namn: 'Glödande sprickor', text: 'mörk hud som stelnad lava, med sprickor som glöder',
      yta(x, y, v, du) {
        if (du === 0) return 0;
        const c = celler(x, y, 9, 60);
        return c.d2 - c.d1 < 2.4 ? 0 : -1;
      },
      extra(kropp, A, ben) {
        const alla = ihop(kropp, ...ben);
        const m = klipp(alla, (x, y) => { const c = celler(x, y, 9, 60); return c.d2 - c.d1 < 0.9 && hash(c.id, 0, 61) < 0.75 && !kant(alla, x, y - 1) && !kant(alla, x, y + 1); });
        return [{ mask: m, mat: 'glod', kontur: false, lyser: true, z: Z.kropp + 0.4 }];
      } },
    { id: 'padda', namn: 'Paddhud', text: 'knottrig hud med vårtor och stora mörka fläckar',
      yta(x, y, v, du, dl) {
        return vartor(x, y);
      },
      extra(kropp, A, ben) {
        // stora fläckar i en egen färg, som på en giftpadda
        const alla = ihop(kropp, ...ben);
        const m = klipp(alla, (x, y) => { const f = celler(x, y, 11, 74); return f.d1 < 2.8 + hash(f.id, 1, 76) * 1.8 && hash(f.id, 0, 75) < 0.6 && !kant(alla, x, y - 1) && !kant(alla, x - 1, y); });
        return [{ mask: m, mat: 'flack', kontur: false, z: Z.kropp + 0.3, monster: (x, y, v) => vartor(x, y) + (v > 0.6 ? -1 : 0) }];
      },
      form(m) {
        const u = m.slice();
        for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) if (m[y * W + x] && kant(m, x, y - 1) && hash(x >> 1, y, 73) < 0.18) u[(y - 1) * W + x] = 1;
        return u;
      } },
    { id: 'rutten', namn: 'Ruttnande', text: 'trasig hud med sjuka fläckar och hål där revbenen och halskotorna syns',
      yta(x, y, v, du, dl) {
        if (hash(x >> 2, y >> 2, 80) < 0.28 && bayer(x, y) < 0.6) return -1;
        if (hash(x, y, 81) < 0.012) return -2;
        return 0;
      },
      form(m, lem) {
        if (lem) return m;
        const u = m.slice();
        for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
          if (!m[y * W + x]) continue;
          if (kant(m, x, y - 1) || kant(m, x, y + 1)) {
            const q = hash(x >> 1, y, 82);
            if (q < 0.12) { u[y * W + x] = 0; if (q < 0.05) u[(y + (kant(m, x, y - 1) ? 1 : -1)) * W + x] = 0; }
          }
        }
        return u;
      },
      extra(kropp, A) {
        const d = [];
        const hal = (cx, cy, rx, ry, ben) => {
          const m = klipp(kropp, (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1 - (hash(x, y, 83) - 0.5) * 0.5);
          d.push({ mask: m, mat: 'hal', z: Z.kropp + 0.6 });
          d.push({ mask: klipp(m, ben), mat: 'benrest', kontur: false, z: Z.kropp + 0.7, monster: (x, y) => (kant(m, x, y - 1) ? 1 : 0) });
        };
        const hx = (A.h[0] + A.f[0]) / 2 + 2, hy = ryggen(kropp, hx, hx)[0][1] + 9;
        hal(hx, hy, 8.5, 5, (x, y) => (x + Math.round((y - hy) * 0.5)) % 4 === 0);
        const [n0, n1] = A.nacke, nx = (n0[0] + n1[0]) / 2, ny = (n0[1] + n1[1]) / 2;
        hal(nx, ny, 3.5, 2.6, (x, y) => Math.abs(y - ny) < 1 && x % 3 !== 0);
        return d;
      } },
  ];

  const HUVUDEN = [
    { id: 'gap', namn: 'Gap', text: 'långt rovdjurshuvud med öppet gap och huggtänder',
      huvud([nx, ny]) {
        const skalle = poly([[nx - 5, ny - 6], [nx + 3, ny - 9], [nx + 10, ny - 7], [nx + 21, ny - 3], [nx + 24, ny], [nx + 23, ny + 2.5], [nx + 9, ny + 3], [nx + 1, ny + 7], [nx - 5, ny + 5]]);
        const kak = poly([[nx + 1, ny + 5], [nx + 9, ny + 5], [nx + 20, ny + 8], [nx + 18, ny + 10.5], [nx + 6, ny + 10], [nx, ny + 9]]);
        const gap = poly([[nx + 7, ny + 2.5], [nx + 23, ny + 2], [nx + 20, ny + 8.5], [nx + 8, ny + 6]]);
        const tand = (x, y, ner, l = 2.4) => poly(ner ? [[x - 0.6, y], [x + 1.4, y], [x + 0.4, y + l]] : [[x - 0.6, y], [x + 1.4, y], [x + 0.4, y - l]]);
        const tander = eller(tand(nx + 11, ny + 2.6, true), tand(nx + 14, ny + 2.6, true), tand(nx + 17, ny + 2.5, true), tand(nx + 20.5, ny + 2.4, true, 4.2), tand(nx + 13, ny + 7.2, false), tand(nx + 16.5, ny + 8, false));
        return { delar: [{ mask: fyll(gap), mat: 'mun', z: Z.huvud - 0.3, kontur: false }, { mask: fyll(kak), mat: 'kropp', z: Z.huvud - 0.2 }, { mask: fyll(tander), mat: 'tand', z: Z.huvud + 0.1, kontur: false }],
          skalle: fyll(skalle), oga: [nx + 11, ny - 3], horn: [nx + 5, ny - 7], nos: [nx + 21, ny - 1], panna: [nx + 9, ny - 7] };
      } },
    { id: 'nabb', namn: 'Näbb', text: 'rund skalle med en krokig näbb av horn',
      huvud([nx, ny]) {
        const skalle = poly([[nx - 5, ny - 6], [nx + 2, ny - 10], [nx + 10, ny - 9], [nx + 15, ny - 4], [nx + 15, ny + 3], [nx + 9, ny + 7], [nx, ny + 7], [nx - 5, ny + 4]]);
        const ovre = poly([[nx + 12, ny - 6], [nx + 19, ny - 5], [nx + 24, ny - 1], [nx + 25, ny + 5], [nx + 22.5, ny + 2], [nx + 13, ny + 1.5]]);
        const nedre = poly([[nx + 12, ny + 2.5], [nx + 21, ny + 2.5], [nx + 18, ny + 6], [nx + 12, ny + 6]]);
        return { delar: [{ mask: fyll(nedre), mat: 'horn', z: Z.huvud + 0.1 }, { mask: fyll(ovre), mat: 'horn', z: Z.huvud + 0.2 }],
          skalle: fyll(skalle), oga: [nx + 9, ny - 3], horn: [nx + 3, ny - 8], nos: null, panna: [nx + 7, ny - 8] };
      } },
  ];

  const HORN = [
    { id: 'bakat', namn: 'Bakåtböjda', text: 'stora horn som böjer sig bakåt i en båge, med ringar',
      horn: ([ax, ay]) => kapsel([[ax, ay], [ax - 1.5, ay - 4.5], [ax - 5, ay - 8], [ax - 10.5, ay - 9.5], [ax - 15, ay - 7], [ax - 16.5, ay - 3]], [3, 2.6, 2.2, 1.7, 1.2, 0.6]) },
    { id: 'framat', namn: 'Framåt', text: 'tjurhorn som går upp och pekar framåt',
      horn: ([ax, ay]) => kapsel([[ax, ay], [ax + 0.5, ay - 4], [ax + 2.5, ay - 7.5], [ax + 6.5, ay - 9.5], [ax + 11, ay - 9]], [3, 2.6, 2, 1.3, 0.6]) },
  ];

  const VINGAR = [
    { id: 'lader', namn: 'Läderving', text: 'fladdermusvinge av hud mellan långa fingrar',
      vinge([rx, ry]) {
        const arm = [[rx, ry], [rx - 5, ry - 14], [rx + 1, ry - 30]], v = arm[2];
        const tippar = [[rx - 13, ry - 33], [rx - 25, ry - 26], [rx - 31, ry - 13], [rx - 25, ry - 1]];
        const hinna = [[rx, ry], v];
        let forra = v;
        tippar.forEach((t, i) => { if (i) hinna.push([(forra[0] + t[0]) / 2 + (v[0] - (forra[0] + t[0]) / 2) * 0.22, (forra[1] + t[1]) / 2 + (v[1] - (forra[1] + t[1]) / 2) * 0.22]); hinna.push(t); forra = t; });
        hinna.push([rx - 13, ry + 3]);
        const fingrar = eller(...tippar.map(t => kapsel([v, t], [1.3, 0.6])));
        return [{ mask: fyll(poly(hinna)), mat: 'hinna', monster: (x, y) => ((x + y * 2) % 9 === 0 ? -1 : 0) },
          { mask: fyll(eller(kapsel(arm, [3, 2.2, 1.6]), fingrar)), mat: 'kropp' },
          { mask: fyll(poly([[v[0], v[1] - 1], [v[0] + 2, v[1] - 5], [v[0] + 2, v[1]]])), mat: 'klo' }];
      } },
    { id: 'fjader', namn: 'Fjäderving', text: 'stor fågelvinge med långa pennor',
      vinge([rx, ry]) {
        const arm = [[rx, ry], [rx - 6, ry - 13], [rx - 2, ry - 28]], [wx, wy] = arm[2];
        const f = [];
        for (let k = 0; k < 11; k++) {
          const t = k / 10, b = langs(arm, 0.15 + t * 0.85), l = 12 + t ** 1.3 * 18, vinkel = 1.0 - t * 1.55;
          f.push(kapsel([b, [b[0] - Math.cos(vinkel) * l, b[1] + Math.sin(vinkel) * l]], [3.2, 1.6]));
        }
        // pennorna skiljs åt av mörka streck ut från handleden, och spetsarna är mörkare
        const pennor = { mask: fyll(eller(...f)), mat: 'fjader', monster: (x, y) => {
          const d = Math.hypot(x - wx, y - wy), a = Math.atan2(y - wy, x - wx) * 9 / Math.PI;
          return (d > 7 && a - Math.floor(a) < 0.16 ? -1 : 0) + (d > 24 ? -1 : 0);
        } };
        const tackfjadrar = { mask: fyll(kapsel(arm, [5.5, 5, 3.5])), mat: 'fjader', ton: 1, monster: (x, y) => ((y % 3 === 0 && (x + (y >> 1)) % 4 !== 0) ? -1 : 0) };
        const delar = [pennor, tackfjadrar];
        return delar;
      } },
  ];

  const SVANSAR = [
    { id: 'piska', namn: 'Piska', text: 'lång svans som smalnar av som en piska',
      svans: ([bx, by]) => ({ mask: fyll(kapsel([[bx, by], [bx - 9, by + 4], [bx - 17, by + 11], [bx - 24, by + 13], [bx - 29, by + 9], [bx - 30, by + 4]], [6, 5, 3.6, 2.4, 1.4, 0.6])), spets: [bx - 30, by + 4] }) },
    { id: 'klubba', namn: 'Klubba', text: 'tjock svans med en klubba av ben längst ut',
      svans: ([bx, by]) => ({ mask: fyll(kapsel([[bx, by], [bx - 8, by + 5], [bx - 16, by + 10], [bx - 21, by + 12]], [6.5, 5.5, 4, 3])), klubba: [bx - 26, by + 12] }) },
  ];

  const SKAL = [
    { id: 'kupol', namn: 'Kupol', text: 'högt välvt sköldpaddsskal med plattor',
      skal(K, bal) {
        const [x0, x1] = K.lang, cx = (x0 + x1) / 2 - 2, rx = (x1 - x0) / 2 + 1, topp = ryggen(bal, cx, cx)[0][1];
        const cy = topp + 8, ry = 15;
        const m = fyll((x, y) => ell(cx, cy, rx, ry)(x, y) && y <= cy + 2);
        return { mask: m, monster: (x, y, v) => { const rad = Math.floor((y - (cy - ry)) / 6), xx = x + (rad % 2) * 4; return y >= cy ? -1 : ((y - (cy - ry)) % 6 === 0 || xx % 8 === 0) && v > 0.08 ? -1 : 0; } };
      } },
    { id: 'band', namn: 'Bälten', text: 'pansar i band över ryggen, som en bältdjur',
      skal(K, bal) {
        const [x0, x1] = K.lang, rygg = ryggen(bal, x0 - 1, x1 - 6);
        const m = tom();
        for (const [x, y] of rygg) for (let yy = y - 3; yy <= y + 6; yy++) if (yy >= 0) m[yy * W + x] = 1;
        return { mask: m, monster: x => ((x - x0) % 5 === 4 ? -2 : (x - x0) % 5 === 0 ? 1 : 0) };
      } },
  ];

  const PLATTOR = [
    { id: 'plattor', namn: 'Ryggplattor', text: 'stora plattor i rad längs ryggen',
      plattor(rygg) {
        const f = [];
        rygg.forEach(([x, y], i) => {
          if (i % 7 !== 3) return;
          const mitt = 1 - Math.abs(i / rygg.length - 0.5) * 2, h = 6 + mitt * 8 + (i % 14 === 3 ? 2 : 0);
          f.push(poly([[x - 4, y + 4], [x - 4, y - h * 0.45], [x - 2, y - h], [x + 2.5, y - h * 0.65], [x + 3.5, y + 4]]));
        });
        return { mask: fyll(eller(...f)), monster: (x, y, v, du, dl, dr) => (dl === 0 || dr === 0 ? -1 : 0) };
      } },
    { id: 'taggar', namn: 'Taggar', text: 'en rad vassa taggar längs ryggen, nacken och svansen', hela: true,
      plattor(rygg) {
        const f = [];
        rygg.forEach(([x, y], i) => {
          if (i % 4 !== 1) return;
          const h = 5 + (1 - Math.abs(i / rygg.length - 0.55) * 2) * 4;
          f.push(poly([[x - 2, y + 3], [x - 3.5, y - h], [x + 2, y + 3]]));
        });
        return { mask: fyll(eller(...f)) };
      } },
  ];

  const HARDA = [
    { id: 'knolar', namn: 'Knölar', text: 'hårda knölar på pannan, kinden, skuldran och lederna',
      hard(A) {
        const pkt = [[A.panna[0] - 3, A.panna[1] + 1, 2], [A.panna[0] + 1, A.panna[1], 1.7], [A.oga[0] + 3, A.oga[1] + 6, 1.7], [A.oga[0] - 3, A.oga[1] + 4, 1.4],
          [A.vinge[0] + 2, A.vinge[1] + 3, 2.2], [A.vinge[0] - 4, A.vinge[1] + 3, 1.8], ...A.leder.map(([x, y]) => [x + 1, y, 2]), [A.svans[0] - 6, A.svans[1] - 2, 1.6]];
        return fyll(eller(...pkt.map(([x, y, r]) => ell(x, y, r, r))));
      } },
    { id: 'benpansar', namn: 'Benpansar', text: 'plattor av ben på pannan, nosen, bogen och skenbenen',
      hard(A) {
        const [px, py] = A.panna, f = [poly([[px - 6, py + 2], [px - 3, py - 2], [px + 6, py - 1], [px + 8, py + 2], [px, py + 3]])];
        if (A.nos) f.push(poly([[A.nos[0] - 5, A.nos[1] - 2], [A.nos[0] - 1, A.nos[1] - 4.5], [A.nos[0] + 1, A.nos[1] - 1.5], [A.nos[0] - 4, A.nos[1]]]));
        const [fx, fy] = A.f; f.push(poly([[fx - 6, fy - 8], [fx + 2, fy - 11], [fx + 7, fy - 6], [fx + 3, fy - 2], [fx - 5, fy - 3]]));
        A.skenor.forEach(([a, b]) => f.push(kapsel([[a[0] + 2, a[1] + 1], [b[0] + 2, b[1] - 2]], [1.6, 1.4])));
        return fyll(eller(...f));
      } },
  ];

  const PRYDNADER = [
    { id: 'man', namn: 'Man', text: 'en tjock, taggig man från huvudet ner över halsen och bogen',
      pryd(A) {
        const [n0, n1] = A.nacke, linje = [[A.panna[0] - 4, A.panna[1] + 1], [(n0[0] + n1[0]) / 2, (n0[1] + n1[1]) / 2 - 6], [n0[0] - 3, n0[1] - 4]];
        const f = [kapsel(linje, [3.5, 5.5, 4])];
        for (let k = 0; k <= 9; k++) {
          const [x, y] = langs(linje, k / 9), l = 6 + (k % 3) * 2;
          f.push(poly([[x - 2.5, y], [x - l * 0.8, y - l * 0.55], [x + 2.5, y - 1]]));
          f.push(poly([[x - 2, y + 2], [x - l * 0.5, y + l * 0.9], [x + 2, y + 3]]));
        }
        return { mask: fyll(eller(...f)), mat: 'man', z: Z.man, monster: (x, y, v) => ((x * 2 + y) % 5 === 0 || v > 0.75 ? -1 : 0) };
      } },
    { id: 'tecken', namn: 'Lysande tecken', text: 'tecken som lyser i mörkret, på sidan, halsen och svansen',
      pryd(A, kropp) {
        const f = [];
        const [h, fo] = [A.h, A.f];
        for (let k = 0; k < 3; k++) {
          const x = h[0] + 6 + k * 8, y = (h[1] + fo[1]) / 2 - 6;
          f.push(kapsel([[x + 3, y - 5], [x, y], [x + 3, y + 5]], [0.6, 0.6, 0.6]));
        }
        f.push(kapsel([[A.nacke[0][0] - 1, A.nacke[0][1] - 1], [A.nacke[1][0] - 2, A.nacke[1][1] - 2]], [0.6, 0.6]));
        if (A.svansSpets || A.klubbaPkt) { const s = A.svansSpets || A.klubbaPkt; f.push(kapsel([[A.svans[0] - 4, A.svans[1] + 1], [(A.svans[0] + s[0]) / 2, (A.svans[1] + s[1]) / 2 + 3]], [0.55, 0.55])); }
        const m = fyll(eller(...f)); m.forEach((v, i) => { if (v && !kropp[i]) m[i] = 0; });
        return { mask: m, mat: 'tecken', z: Z.tecken, kontur: false, lyser: true };
      } },
  ];

  // ---------- det API:t ritat (bildstil/bestar/<lager>.json, från bildstil/api/bestar.mjs) ----------
  // API:t ritar inga färdiga bilder. Det ger former och mönster som data, och koden här gör om dem till delar i lagren,
  // så att de skuggas och sitter ihop med resten precis som de handgjorda. En del med en grupp som redan finns är en
  // version av den (texturerna); annars är den en ny del. Former: {typ:'poly',pts}, {typ:'kapsel',pts,r} eller
  // {typ:'ell',c,r}, med punkterna i förhållande till delens fästpunkt. Mönster: {rader:['..-+', …], skift}, där
  // = - . + * är tonändringarna −2 … +2 och skift flyttar varje rad av rutor så många punkter åt sidan.
  const TECKEN = { '=': -2, '-': -1, '.': 0, '+': 1, '*': 2 };
  const MATERIAL = Object.keys(FARGER[0].m);
  const formAv = (s, dx = 0, dy = 0) => {
    if (!s) return () => false;
    if (s.typ === 'poly' && s.pts?.length >= 3) return poly(flytta(s.pts, dx, dy));
    if (s.typ === 'kapsel' && s.pts?.length >= 2) return kapsel(flytta(s.pts, dx, dy), s.pts.map((_, i) => s.r?.[i] ?? s.r?.[s.r.length - 1] ?? 1));
    if (s.typ === 'ell' && s.c && s.r) return ell(s.c[0] + dx, s.c[1] + dy, s.r[0], s.r[1] ?? s.r[0]);
    return () => false;
  };
  const formerAv = (lista, dx = 0, dy = 0) => eller(...[].concat(lista || []).map(s => formAv(s, dx, dy)));
  // tomt = null låter texturen synas där mönstret har en punkt (benen)
  const monsterAv = (m, tomt = 0) => {
    const R = m?.rader?.filter(r => typeof r === 'string' && r.length);
    if (!R?.length) return null;
    const h = R.length, w = Math.max(...R.map(r => r.length)), sk = Math.round(m.skift || 0);
    return (x, y) => { const rad = Math.floor(y / h), r = R[((y % h) + h) % h], c = r[(((x + rad * sk) % w) + w) % w]; return c in TECKEN && c !== '.' ? TECKEN[c] : tomt; };
  };
  const matAv = (m, annars) => (MATERIAL.includes(m) ? m : annars);
  // lagren som en kroppsform får vara utan
  const KAN_SAKNAS = ['ben', 'svans', 'vingar', 'horn', 'skal', 'plattor', 'hard', 'pryd'];
  // fästpunkterna som förhårdnader och prydnader kan sitta vid; led och skena finns en gång per ben
  const ankare = (A, n) => {
    if (n === 'led') return A.leder;
    if (n === 'skena') return A.skenor.map(s => s[0]);
    if (n === 'nacke0') return [A.nacke[0]];
    if (n === 'nacke1') return [A.nacke[1]];
    if (n === 'spets') return [A.svansSpets || A.klubbaPkt].filter(Boolean);
    return A[n] ? [A[n]] : [];
  };
  const FASTEN = ['panna', 'oga', 'nos', 'hornet', 'nacke0', 'nacke1', 'rygg', 'f', 'h', 'vinge', 'svans', 'spets', 'led', 'skena'];
  // ---------- ögonen ----------
  // ett öga är en lista av delar räknade från ögats punkt på huvudet (0,0 är ögats vänstra punkt): enskilda punkter (pkt) eller
  // former, i ett material och en ton (kol är konturens svarta: ögonbrynet och hålan). Allt klipps till huvudet och kroppen.
  // De handgjorda är skrivna i samma form som API:ts, så att de ritas på samma sätt.
  function ogonDelar(lista, [ox, oy], klipp) {
    return (lista || []).map((p, i) => {
      const m = p.former ? fyll(formerAv(p.former, ox + 0.5, oy + 0.5)) : tom();
      for (const q of p.pkt || []) { const x = Math.round(ox + q[0]), y = Math.round(oy + q[1]); if (x >= 0 && y >= 0 && x < W && y < H) m[y * W + x] = 1; }
      if (klipp) m.forEach((v, k) => { if (v && !klipp[k]) m[k] = 0; });
      return { mask: m, mat: p.mat === 'kol' ? 'kol' : matAv(p.mat, 'oga'), ton: typeof p.ton === 'number' ? p.ton : 0, lyser: !!p.lyser, kontur: !!p.kontur, monster: monsterAv(p.monster), z: Z.oga + i * 0.01 };
    });
  }
  // runt varje punkt i lista: punkterna ovanför och till vänster (en mörk håla)
  const halaRunt = lista => { const s = new Set(lista.map(String)), ut = []; for (const [x, y] of lista) for (const q of [[x, y - 1], [x - 1, y], [x - 1, y - 1], [x + 1, y - 1]]) if (!s.has(String(q)) && !ut.some(u => String(u) === String(q))) ut.push(q); return ut; };
  const MORK = { mat: 'kol' };
  const OGON = [
    { id: 'djupt', namn: 'Djupa', text: 'små ögon djupt under en mörk panna, och de lyser',
      delar: [{ ...MORK, pkt: [[-1, -1], [0, -1], [1, -1], [2, -1], [-1, 0]] }, { mat: 'oga', lyser: true, pkt: [[0, 0], [1, 0]] }] },
    { id: 'spalt', namn: 'Spalter', text: 'en smal lysande spalt i en mörk håla, som hos en orm', ny: true,
      delar: [{ ...MORK, pkt: [[-1, -1], [0, -1], [1, -1], [2, -1], [3, -1], [-1, 0], [3, 0], [0, 1], [1, 1], [2, 1]] }, { mat: 'oga', lyser: true, pkt: [[0, 0], [1, 0], [2, 0]] }] },
    { id: 'manga', namn: 'Många', text: 'en klunga små lysande ögon, som hos en spindel', ny: true,
      delar: [{ ...MORK, pkt: halaRunt([[0, 0], [3, 0], [1, -2], [-2, -1], [2, 2]]) }, { mat: 'oga', lyser: true, pkt: [[0, 0], [3, 0], [1, -2], [-2, -1], [2, 2]] }] },
    { id: 'rad', namn: 'Ögonrad', text: 'tre par ögon i rad bakåt längs huvudet', ny: true,
      delar: [{ ...MORK, pkt: [[-1, -1], [0, -1], [1, -1], [2, -1], [-5, 0], [-4, 0], [-3, 0], [-9, 1], [-8, 1], [-7, 1]] }, { mat: 'oga', lyser: true, pkt: [[0, 0], [1, 0], [-4, 1], [-3, 1], [-8, 2], [-7, 2]] }] },
    { id: 'blind', namn: 'Blinda', text: 'mjölkvita ögon utan pupill, som inte lyser: besten är blind och luktar sig fram', ny: true,
      delar: [{ ...MORK, pkt: [[-1, -2], [0, -2], [1, -2], [2, -2], [-1, -1], [2, -1]] }, { mat: 'tand', ton: -1, pkt: [[0, -1], [1, -1], [0, 0], [1, 0]] }] },
    { id: 'hala', namn: 'Tomma hålor', text: 'tomma ögonhålor som på en dödskalle, med en glödande punkt längst in', ny: true,
      delar: [{ mat: 'kol', pkt: [[-1, -1], [0, -1], [1, -1], [2, -1], [-1, 0], [0, 0], [2, 0], [0, 1], [1, 1]] }, { mat: 'oga', lyser: true, pkt: [[1, 0]] }] },
  ].map(d => ({ ...d, ogon: (o, klipp) => ogonDelar(d.delar, o, klipp) }));

  const tillApi = {
    textur(d) {
      const kr = monsterAv(d.monster), be = monsterAv(d.ben) || kr, fri = d.kanter !== true;
      const t = { yta(x, y, v, du, dl, dr, h, del) { if (fri && (du === 0 || dl === 0)) return 0; const f = del && del.sida ? be : kr; return f ? f(x, y) : 0; } };
      const KANT = { tofsar: 'pals', fransar: 'fjadrar', knolar: 'padda', trasig: 'rutten' };
      if (KANT[d.kant]) t.form = TEXTURER.find(x => x.id === KANT[d.kant]).form;
      if (d.kant === 'droppar') t.droppar = TEXTURER.find(x => x.id === 'slem').droppar;
      const pa = (d.pa || []).slice(0, 3);
      if (pa.length) t.extra = (kropp, A, ben) => {
        const alla = ihop(kropp, ...ben);
        return pa.map((o, i) => {
          const s = Math.max(3, Math.min(16, o.storlek || 8)), fro = 90 + i * 7, tat = o.tathet ?? 0.6;
          let m;
          if (o.typ === 'sprickor') m = klipp(alla, (x, y) => { const c = celler(x, y, s, fro); return c.d2 - c.d1 < 0.9 && hash(c.id, 0, fro + 1) < tat && !kant(alla, x, y - 1) && !kant(alla, x, y + 1); });
          else if (o.typ === 'rygg') {
            m = klipp(kropp, (x, y) => djup(kropp, x, y) <= Math.round(s / 3) + Math.floor(hash(x >> 2, 0, fro) * s / 3) && hash(x >> 3, y >> 3, fro + 1) < tat);
            if (o.tuvor) for (let k = W; k < m.length; k++) if (m[k] && !kropp[k - W] && hash(k, 0, fro + 2) < 0.4) m[k - W] = 1;
          } else m = klipp(alla, (x, y) => { const f = celler(x, y, s, fro); return f.d1 < s * (0.2 + 0.2 * hash(f.id, 1, fro + 1)) && hash(f.id, 0, fro + 2) < tat && !kant(alla, x, y - 1) && !kant(alla, x - 1, y); });
          return { mask: m, mat: matAv(o.mat, 'flack'), kontur: !!o.kontur, lyser: !!o.lyser, z: Z.kropp + 0.3 + i * 0.05, monster: monsterAv(o.monster) };
        });
      };
      return t;
    },
    farg: d => ({ m: Object.fromEntries(MATERIAL.map(k => { const v = d.m?.[k]; return [k, Array.isArray(v) && RAMPER.some(r => r[0] === v[0]) ? [v[0], Math.max(0, Math.min(3, v[1] | 0))] : FARGER[0].m[k]]; })) }),
    kropp: d => ({ bal: d.bal, former: d.former, nacke: d.nacke, nackeR: d.nackeR, h: d.h, f: d.f, svans: d.svans, vinge: d.vinge, lang: d.lang,
      benpar: Array.isArray(d.benpar) && d.benpar.length ? d.benpar.filter(b => Array.isArray(b) && b.length >= 2).map(b => [b[0], b[1], b[2] === 'bak' ? 'bak' : 'fram']) : undefined,
      utan: (d.utan || []).filter(l => KAN_SAKNAS.includes(l)),
      delar: (d.delar || []).map(p => ({ former: p.former, mat: matAv(p.mat, 'skal'), z: ['bak', 'skal', 'ovan'].includes(p.z) ? p.z : 'skal', rygg: !!p.rygg, kontur: p.kontur !== false, lyser: !!p.lyser, monster: monsterAv(p.monster) || undefined })) }),
    horn: d => ({ horn: ([ax, ay]) => formerAv(d.former, ax, ay), monster: monsterAv(d.monster) || undefined }),
    svans: d => ({ svans: ([bx, by]) => ({ mask: fyll(formerAv(d.former, bx, by)), spets: d.spets ? [bx + d.spets[0], by + d.spets[1]] : undefined,
      delar: (d.delar || []).map((p, i) => ({ mask: fyll(formerAv(p.former, bx, by)), mat: matAv(p.mat, 'hard'), kontur: p.kontur !== false, lyser: !!p.lyser, monster: monsterAv(p.monster), z: Z.klubba + i * 0.01 })) }) }),
    huvud: d => ({ huvud([nx, ny]) {
      const pkt = p => (p ? [Math.round(nx + p[0]), Math.round(ny + p[1])] : null);
      return { delar: (d.delar || []).map((p, i) => ({ mask: fyll(formerAv(p.former, nx, ny)), mat: matAv(p.mat, 'kropp'), kontur: p.kontur !== false, lyser: !!p.lyser, monster: monsterAv(p.monster) || undefined, z: Z.huvud + (p.fore ? 0.1 : -0.3) + i * 0.01 })),
        skalle: fyll(formerAv(d.skalle, nx, ny)), oga: pkt(d.oga), horn: pkt(d.horn) || pkt(d.panna), nos: pkt(d.nos), panna: pkt(d.panna) || pkt(d.oga) };
    } }),
    ben: d => ({ ben(J, bak, far) {
      const fy = far ? G - 2 : G - 1, L = (bak ? d.bak : d.fram) || d.fram || d.bak, dy = fy - J[1];
      const pts = L.pts.map(([dx, t]) => [J[0] + dx, J[1] + t * dy]), [tx] = pts[pts.length - 1];
      const r = pts.map((_, i) => L.r?.[i] ?? 3), n = pts.length;
      return { mask: fyll(eller(kapsel(pts, r), formerAv(d.fot, tx, fy))), monster: monsterAv(d.monster, null),
        extra: (d.tar || []).map((p, i) => ({ mask: fyll(formerAv(p.former, tx, fy)), mat: matAv(p.mat, 'klo'), kontur: p.kontur !== false, z: 0.05 + i * 0.01 })),
        leder: [pts[Math.min(1, n - 1)], pts[Math.min(2, n - 1)]], skena: [pts[n - 2] || pts[0], pts[n - 1]] };
    } }),
    vingar: d => ({ vinge: ([rx, ry]) => (d.delar || []).map(p => ({ mask: fyll(formerAv(p.former, rx, ry)), mat: matAv(p.mat, 'hinna'), monster: monsterAv(p.monster), kontur: p.kontur !== false })) }),
    skal: d => ({ skal(K, bal) {
      const [x0, x1] = K.lang, a = x0 + (x1 - x0) * (d.fran ?? 0), b = x0 + (x1 - x0) * (d.till ?? 1);
      let m;
      if (d.typ === 'kupol') {
        const cx = (a + b) / 2, rx = (b - a) / 2 + 1, topp = ryggen(bal, cx, cx)[0][1], cy = topp + (d.under ?? 8), ry = (d.hojd ?? 7) + (d.under ?? 8);
        m = fyll((x, y) => ell(cx, cy, rx, ry)(x, y) && y <= cy + 2);
      } else {
        m = tom();
        for (const [x, y] of ryggen(bal, a, b)) for (let yy = y - (d.over ?? 3); yy <= y + (d.under ?? 6); yy++) if (yy >= 0 && yy < H) m[yy * W + x] = 1;
      }
      return { mask: m, monster: monsterAv(d.monster) };
    } }),
    plattor: d => ({ hela: d.fran === 'svans', plattor(rygg) {
      const f = [], n = Math.max(2, Math.round(d.avstand || 6)), [h0, h1] = d.hojd || [5, 10], b = d.bredd || 3;
      const form = d.form?.length >= 3 ? d.form : [[-1, 0.4], [0, -1], [1, 0.4]];
      rygg.forEach(([x, y], i) => {
        if (i % n !== Math.floor(n / 2)) return;
        const mitt = 1 - Math.abs(i / rygg.length - 0.5) * 2, h = h0 + (h1 - h0) * mitt;
        f.push(poly(form.map(([u, v]) => [x + u * b, y + v * h])));
      });
      return { mask: fyll(eller(...f)), monster: monsterAv(d.monster) };
    } }),
    ogon: d => ({ ogon: (o, klipp) => ogonDelar(d.delar, o, klipp) }),
    hard: d => ({ hard: A => fyll(eller(...(d.delar || []).flatMap(p => ankare(A, p.ankare).map(([ax, ay]) => formerAv(p.former, ax, ay))))) }),
    pryd: d => ({ pryd: (A, kropp) => (d.delar || []).map((p, i) => {
      const m = fyll(eller(...ankare(A, p.ankare).map(([ax, ay]) => formerAv(p.former, ax, ay))));
      if (p.inomKroppen) m.forEach((v, k) => { if (v && !kropp[k]) m[k] = 0; });
      const mat = matAv(p.mat, 'man');
      return { mask: m, mat, kontur: p.kontur !== false, lyser: !!p.lyser, monster: monsterAv(p.monster), z: (p.bak ? Z.platta : mat === 'man' ? Z.man : Z.tecken) + i * 0.01 };
    }) }),
  };
  const API = typeof BESTDATA !== 'undefined' ? BESTDATA : {};
  const REG = { kropp: KROPPAR, ben: BEN, huvud: HUVUDEN, ogon: OGON, horn: HORN, vingar: VINGAR, svans: SVANSAR, textur: TEXTURER, skal: SKAL, plattor: PLATTOR, hard: HARDA, pryd: PRYDNADER, farg: FARGER };
  // avtrycket ändras när delen ritas om, så att Björns svar på den förra versionen inte gäller den nya
  const avtryck = t => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const apiDel = (lager, d) => ({ ...tillApi[lager](d), id: d.id, namn: d.namn, text: d.text, grupp: d.grupp || d.id, api: true, avtryck: avtryck(JSON.stringify(d)), forra: d.forra || null });
  for (const [lager, fil] of Object.entries(API)) {
    if (!REG[lager] || !tillApi[lager]) continue;
    for (const d of fil.delar || []) { try { REG[lager].push(apiDel(lager, d)); } catch (e) { console.warn('bestskaparen: kunde inte läsa', lager, d.id, e); } }
  }
  // kropparna (de handgjorda och API:ts) är skrivna utan OY och flyttas ner här
  // (formerna i former och delar flyttas när de ritas)
  const nerOY = K => {
    if (K.bal) K.bal = flytta(K.bal, 0, OY);
    K.nacke = flytta(K.nacke, 0, OY);
    for (const k of ['h', 'f', 'svans', 'vinge']) K[k] = [K[k][0], K[k][1] + OY];
    K.benpar = K.benpar ? K.benpar.map(([x, y, s]) => [x, y + OY, s]) : [[...K.h, 'bak'], [...K.f, 'fram']];
  };
  KROPPAR.forEach(nerOY);

  // ---------- registret: lagren i den ordning de väljs ----------
  const LAGER = [
    { id: 'kropp', namn: 'Kropp', delar: KROPPAR, maste: true },
    { id: 'ben', namn: 'Ben', delar: BEN, maste: true },
    { id: 'huvud', namn: 'Huvud', delar: HUVUDEN, maste: true },
    { id: 'ogon', namn: 'Ögon', delar: OGON, maste: true },
    { id: 'horn', namn: 'Horn', delar: HORN, ofta: 0.4 },
    { id: 'vingar', namn: 'Vingar', delar: VINGAR, ofta: 0.08 },
    { id: 'svans', namn: 'Svans', delar: SVANSAR, maste: true },
    { id: 'textur', namn: 'Textur', delar: TEXTURER, maste: true },
    { id: 'skal', namn: 'Skal', delar: SKAL, ofta: 0.15 },
    { id: 'plattor', namn: 'Plattor', delar: PLATTOR, ofta: 0.25 },
    { id: 'hard', namn: 'Förhårdnader', delar: HARDA, ofta: 0.2 },
    { id: 'pryd', namn: 'Prydnader', delar: PRYDNADER, ofta: 0.2 },
    { id: 'farg', namn: 'Färger', delar: FARGER, maste: true },
  ];
  const delAv = (val, id) => { const L = LAGER.find(l => l.id === id); return L.delar.find(d => d.id === val[id]) || null; };
  // lagren som den valda kroppen är utan (de ritas inte, men valet står kvar till nästa kropp)
  const utanFor = val => new Set(delAv(val, 'kropp')?.utan || []);
  const passar = (val, id) => !utanFor(val).has(id);
  const dels = (val, id) => (passar(val, id) ? delAv(val, id) : null);

  // ---------- en del i bilden: kontur, skuggning och mönster ----------
  function mala(L, d, fr) {
    // materialet kol är konturens svarta (ögonhålor och bryn) och står utanför färgschemat
    const [ramp, b0] = d.mat === 'kol' ? ['kol', 0] : fr.m[d.mat] || fr.m.kropp, b = b0 - (d.far ? 1 : 0) + Math.round(d.ton || 0), m = d.mask;
    const lagst = ramp === 'kol' && d.mat !== 'kol' ? 1 : 0, kl = t => Math.max(lagst, Math.min(3, t));
    const inne = (x, y) => x >= 0 && y >= 0 && x < W && y < H && m[y * W + x];
    if (d.kontur !== false) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!m[y * W + x]) continue;
      for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!inne(x + a, y + c)) L.satt(x + a, y + c, P.i('kol', 0));
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!m[y * W + x]) continue;
      let du = 0, dd = 0, dl = 0, dr = 0;
      while (inne(x, y - du - 1) && du < 40) du++;
      while (inne(x, y + dd + 1) && dd < 40) dd++;
      while (inne(x - dl - 1, y) && dl < 40) dl++;
      while (inne(x + dr + 1, y) && dr < 40) dr++;
      const h = du + dd + 1, v = h > 1 ? du / (h - 1) : 0, q = bayer(x, y);
      let t = b;
      if (h <= 2) t = du === 0 ? b + 1 : b;
      else if (d.sida && dl + dr >= 3) {
        // benen skuggas som rundade pelare: ljusa till vänster, mörka till höger
        const w = dl / (dl + dr);
        if (du === 0 || w < 0.2 || (w < 0.32 && q < (0.32 - w) / 0.12)) t = b + 1;
        else if (dl + dr >= 7 && w > 0.86) t = b - 2;
        else if (w > 0.62 || (w > 0.52 && q < (w - 0.52) / 0.1)) t = b - 1;
      } else {
        if (du === 0 || v < 0.16 || (v < 0.28 && q < (0.28 - v) / 0.12)) t = b + 1;
        else if (h >= 9 && v > 0.84) t = b - 2;
        else if (v > 0.6 || (v > 0.5 && q < (v - 0.5) / 0.1)) t = b - 1;
        if (dl === 0 && h >= 4 && v < 0.6) t = Math.max(t, b + 1);
        if (dr === 0 && h >= 4 && t > b - 1 && du > 0) t = b - 1;
      }
      if (d.monster) t += d.monster(x, y, v, du, dl, dr, h, d);
      L.satt(x, y, P.i(ramp, kl(t)), !!d.lyser);
    }
  }

  // ---------- hela besten ----------
  function delarna(val) {
    const K = dels(val, 'kropp'), BE = dels(val, 'ben'), HU = dels(val, 'huvud'), HO = dels(val, 'horn'), VI = dels(val, 'vingar');
    const SV = dels(val, 'svans'), SK = dels(val, 'skal'), PL = dels(val, 'plattor'), HA = dels(val, 'hard'), PR = dels(val, 'pryd');
    const D = [], TX = dels(val, 'textur'), hud = (...a) => TX.yta(...a);
    const lagg = (d, z, extra = {}) => D.push({ mat: 'kropp', ...d, z: d.z ?? z, ...extra });
    // kroppen: bålen, halsen, skallen och svansen är en form, utan kontur mellan dem
    const bal = fyll(eller(K.bal ? poly(K.bal) : () => false, formerAv(K.former, 0, OY))), nacke = fyll(kapsel(K.nacke, K.nackeR));
    const hu = HU.huvud(K.nacke[1]), sv = SV ? SV.svans(K.svans) : { mask: null };
    const kropp = ihop(bal, nacke, hu.skalle, sv.mask);
    const kroppF = TX.form ? TX.form(kropp) : kropp;
    lagg({ mask: kroppF, monster: hud }, Z.kropp);
    if (TX.droppar) lagg({ mask: TX.droppar(ihop(kropp, ...hu.delar.filter(d => d.mat === 'kropp').map(d => d.mask))), mat: 'slem', kontur: false }, Z.kropp + 0.5);
    hu.delar.forEach(d => lagg(d.mat === 'kropp' ? { ...d, monster: hud } : d, Z.huvud));
    if (sv.klubba) {
      const [cx, cy] = sv.klubba;
      lagg({ mask: fyll(eller(ell(cx, cy, 6, 5), poly([[cx - 2, cy - 4], [cx, cy - 9], [cx + 2, cy - 4]]), poly([[cx - 5, cy - 1], [cx - 10, cy - 2], [cx - 5, cy + 2]]), poly([[cx - 2, cy + 4], [cx - 1, cy + 8], [cx + 2, cy + 4]]))), mat: 'hard' }, Z.klubba);
    }
    if (sv.delar) sv.delar.forEach(p => lagg(p, Z.klubba));
    // kroppens egna delar (skal och annat som hör till kroppsformen)
    const egna = (K.delar || []).map(p => ({ mask: fyll(formerAv(p.former, 0, OY)), mat: p.mat, kontur: p.kontur, lyser: p.lyser, rygg: p.rygg,
      monster: p.mat === 'kropp' ? hud : p.monster, z: p.z === 'bak' ? Z.platta - 0.5 : p.z === 'ovan' ? Z.man - 0.5 : Z.skal - 0.1 }));
    egna.forEach(p => lagg(p, p.z));
    // benen: de bortre lite förskjutna och mörkare (en kropp kan ha fler benpar, eller inga)
    const leder = [], skenor = [], narBen = [], benplats = [];
    if (BE) for (const far of [true, false]) for (const [x, y, s] of K.benpar) { const bak = s === 'bak'; benplats.push([[x, y], bak, far, far ? (bak ? 5 : -5) : 0]); }
    for (const [J, bak, far, dx] of benplats) {
      const b = BE.ben([J[0] + dx, J[1] - (far ? 1 : 0)], bak, far);
      const zb = far ? Z.farBen : Z.ben;
      const bm = TX.form ? TX.form(b.mask, true) : b.mask;
      if (!far) narBen.push(bm);
      lagg({ mask: bm, far, sida: true, monster: (...a) => { const m = b.monster?.(...a); return m ?? hud(...a); } }, zb);
      b.extra.forEach(e => lagg({ ...e, far, z: zb + (e.z ?? 0.1), monster: e.mat === 'kropp' ? hud : e.monster }, zb));
      if (!far) { leder.push(...b.leder); skenor.push(b.skena); }
    }
    // skalet och plattorna längs ryggen
    let rygg = ihop(bal, ...egna.filter(p => p.rygg).map(p => p.mask));
    if (SK) { const s = SK.skal(K, bal); lagg({ mask: s.mask, mat: 'skal', monster: s.monster }, Z.skal); rygg = ihop(rygg, s.mask); }
    if (PL) {
      const rx0 = PL.hela ? K.svans[0] - 10 : K.lang[0], rx1 = PL.hela ? K.nacke[1][0] - 2 : K.lang[1] - 4;
      const r = ryggen(ihop(rygg, nacke, PL.hela ? sv.mask : null), rx0, rx1);
      const p = PL.plattor(r); lagg({ mask: p.mask, mat: 'platta', monster: p.monster }, Z.platta);
    }
    // hornen: det bortre bakom huvudet
    if (HO) {
      lagg({ mask: fyll(HO.horn([hu.horn[0] + 3, hu.horn[1] + 1])), mat: 'horn', far: true }, Z.farHorn);
      lagg({ mask: fyll(HO.horn(hu.horn)), mat: 'horn', monster: HO.monster || ((x, y) => ((x + y) % 3 === 0 ? -1 : 0)) }, Z.horn);
    }
    // vingarna: den bortre bakom allt
    if (VI) {
      VI.vinge([K.vinge[0] + 5, K.vinge[1] - 3]).forEach((d, i) => lagg({ ...d, far: true }, Z.farVinge + i * 0.01));
      VI.vinge(K.vinge).forEach((d, i) => lagg(d, Z.vinge + i * 0.01));
    }
    const mx = Math.round((K.lang[0] + K.lang[1]) / 2);
    const A = { h: K.h, f: K.f, nacke: K.nacke, vinge: K.vinge, svans: K.svans, svansSpets: sv.spets, klubbaPkt: sv.klubba, oga: hu.oga, panna: hu.panna, nos: hu.nos, hornet: hu.horn, rygg: ryggen(bal, mx, mx)[0], leder, skenor };
    if (TX.extra) TX.extra(kroppF, A, narBen).forEach(d => lagg(d, d.z));
    if (HA) lagg({ mask: HA.hard(A), mat: 'hard' }, Z.hard);
    if (PR) [].concat(PR.pryd(A, kropp)).forEach(p => lagg(p, p.z));
    // ögonen, klippta till huvudet och kroppen
    const OG = dels(val, 'ogon') || OGON[0];
    OG.ogon(hu.oga, ihop(kropp, ...hu.delar.map(d => d.mask))).forEach(d => lagg(d, d.z));
    return D.sort((a, b) => a.z - b.z);
  }

  function ritaBest(val, spegel) {
    const fr = dels(val, 'farg'), L = Bild(W, H, P);
    for (const d of delarna(val)) mala(L, d, fr);
    const S = markBild(W, H, P), fx = x => spegel ? W - 1 - x : x;
    // skuggan på marken under besten
    let x0 = W, x1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (L.get(x, y) >= 0) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    for (let y = G - 2; y <= G + 2; y++) for (let x = x0 + 4; x <= x1 - 4; x++) {
      const u = (x - (x0 + x1) / 2) / ((x1 - x0) / 2 - 2), w = (y - G) / 2.5;
      if (u * u + w * w <= 1 && (x + y) % 2 === 0) S.morka(fx(x), y);
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = L.get(x, y); if (v >= 0) S.satt(fx(x), y, v, !!L.sken[y * W + x]); }
    // en människa bredvid, så att storleken syns (en ruta är 16 punkter)
    ritaPerson(S, 0, spegel ? 3 : W - 17, G - 17);
    return S;
  }

  // ---------- sidan ----------
  const rot = document.getElementById('bestskapare');
  if (!rot) return;
  const val = Object.fromEntries(LAGER.map(l => [l.id, l.maste ? l.delar[0].id : null]));
  val.horn = 'bakat';
  let spegel = false;
  const duk = rot.querySelector('#bs-bild'), text = rot.querySelector('#bs-text'), valen = rot.querySelector('#bs-val');
  const beskriv = v => LAGER.filter(l => passar(v, l.id)).map(l => { const d = l.delar.find(x => x.id === v[l.id]); return `${l.namn}: ${d ? d.namn.toLowerCase() : 'inget'}`; }).join(' · ');
  // delarna Björn sagt nej till syns inte i väljaren och slumpas inte; de godkända får ✓ (granskningen nedan fyller i dem)
  const NEJ = new Set(), JA = new Set(), nyckel = (l, d) => l + '/' + d;
  // versionerna av en handgjord del (samma grupp) står direkt efter den
  const ordna = ds => { const g = new Map(); ds.forEach(d => { const k = d.grupp || d.id; if (!g.has(k)) g.set(k, []); g.get(k).push(d); }); return [...g.values()].flat(); };
  const valbara = l => ordna(l.delar.filter(d => !NEJ.has(nyckel(l.id, d.id)) || val[l.id] === d.id));
  function visa() {
    tillCanvas(ritaBest(val, spegel), duk, 0);
    text.textContent = beskriv(val);
    valen.querySelectorAll('button[data-lager]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.del === (val[b.dataset.lager] ?? ''))));
    // lagren som kroppen är utan blir gråa
    const K = delAv(val, 'kropp');
    valen.querySelectorAll('.sk-rad[data-rad]').forEach(r => {
      const ut = !passar(val, r.dataset.rad);
      r.classList.toggle('sk-utan', ut);
      r.querySelector('.sk-namn').title = ut ? `Passar inte med kroppen ${K.namn.toLowerCase()}` : '';
      r.querySelectorAll('button').forEach(b => { b.disabled = ut; });
    });
  }
  // väljaren: en knapp per del i registret (de handgjorda, versionerna och API:ts delar), byggs om när svaren ändras
  function byggValjare() {
    valen.textContent = '';
    for (const l of LAGER) {
      const rad = document.createElement('div'); rad.className = 'sk-rad'; rad.dataset.rad = l.id;
      const n = document.createElement('span'); n.className = 'sk-namn'; n.textContent = l.namn;
      const chips = document.createElement('div'); chips.className = 'sk-chips';
      const knapp = (del, namn, titel) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.lager = l.id; b.dataset.del = del; b.textContent = namn; if (titel) b.title = titel; chips.append(b); };
      if (!l.maste) knapp('', 'Inget');
      valbara(l).forEach((d, i) => knapp(d.id, `${i + 1} ${d.namn}${JA.has(nyckel(l.id, d.id)) ? ' ✓' : ''}`, `${d.text}${d.api ? ' (ritad av Claude API:t)' : ''}`));
      rad.append(n, chips); valen.append(rad);
    }
  }
  byggValjare();
  valen.addEventListener('click', e => {
    const b = e.target.closest('button[data-lager]'); if (!b) return;
    val[b.dataset.lager] = b.dataset.del || null;
    visa();
  });
  rot.querySelector('#bs-spegla').addEventListener('click', e => { spegel = !spegel; e.currentTarget.setAttribute('aria-pressed', String(spegel)); visa(); });
  // alla lager utom ett får en slumpad del (utom = null slumpar alla)
  // (kroppen väljs bland dem som passar med den del som står kvar). Lagren som inte måste finnas kommer med så ofta
  // som deras tal ofta säger (vingar sällan), i slumpad ordning, och högst DETALJER av dem samtidigt, så att besten
  // inte får alla lager på en gång.
  const DETALJER = 2;
  const slumpaUtom = (v, utom) => {
    const ta = l => { let m = l.delar.filter(d => !NEJ.has(nyckel(l.id, d.id))); if (l.id === 'kropp' && utom) m = m.filter(d => !(d.utan || []).includes(utom)); return m.length ? m[Math.floor(Math.random() * m.length)].id : null; };
    for (const l of LAGER) if (l.maste && l.id !== utom) v[l.id] = ta(l);
    const fria = LAGER.filter(l => !l.maste && l.id !== utom).sort(() => Math.random() - 0.5);
    let n = utom && !LAGER.find(l => l.id === utom).maste ? 1 : 0;
    for (const l of fria) {
      const med = n < DETALJER && passar(v, l.id) && Math.random() < l.ofta;
      v[l.id] = med ? ta(l) : null;
      if (v[l.id]) n++;
    }
    return v;
  };
  rot.querySelector('#bs-slumpa').addEventListener('click', () => { slumpaUtom(val, null); visa(); });
  visa();

  // ---------- spara kombinationen (samlingen bestar) ----------
  let DB = null, SPARADE = [];
  const st = rot.querySelector('#bs-status'), lista = rot.querySelector('#bs-sparade');
  function visaSparade() {
    lista.textContent = '';
    if (!SPARADE.length) { lista.innerHTML = '<p class="not">Inga sparade bestar än.</p>'; return; }
    for (const k of SPARADE.slice(0, 12)) {
      const f = document.createElement('div'); f.className = 'bs-sparad';
      const b = document.createElement('button'); b.type = 'button'; b.className = 'gr-knapp'; b.title = 'Visa besten i skaparen';
      const c = document.createElement('canvas'); c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'Sparad best');
      const v = { ...val, ...(k.val || {}) };
      tillCanvas(ritaBest(v, false), c, 0); b.append(c);
      b.addEventListener('click', () => { Object.assign(val, v); visa(); duk.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
      const t = document.createElement('p'); t.innerHTML = `<b>${new Date(k.nar).toLocaleDateString('sv-SE')}</b> `; t.append(document.createTextNode(k.kommentar || k.text || ''));
      f.append(b, t); lista.append(f);
    }
  }
  (async () => {
    st.textContent = 'Ansluter till sidans databas …';
    try { DB = await window.claude?.use?.('db'); } catch (e) { DB = null; }
    if (!DB) { st.textContent = 'Bestarna går bara att spara när sidan är öppen i Claude och du är inloggad.'; visaSparade(); return; }
    st.textContent = '';
    DB.collection('bestar').onSnapshot(snap => {
      SPARADE = snap.docs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.nar).localeCompare(String(a.nar)));
      visaSparade();
    }, () => { st.textContent = 'Kontakten med databasen bröts. Ladda om sidan.'; });
    DB.collection('val').onSnapshot(snap => {
      for (const k of Object.keys(SVAR)) delete SVAR[k];
      snap.docs.forEach(d => { if (d.exists && d.id.startsWith('best-')) SVAR[d.id] = d.data(); });
      bkValjare(); bkVisa();
    }, () => { bkStatus('Kontakten med databasen bröts. Ladda om sidan.'); });
    bkVisa();
  })();
  rot.querySelector('#bs-spara').addEventListener('click', async () => {
    const ta = rot.querySelector('#bs-kommentar');
    if (!DB) { st.textContent = 'Det går bara att spara när sidan är öppen i Claude och du är inloggad.'; return; }
    try { await DB.collection('bestar').add({ val: { ...val }, kommentar: ta.value.trim(), text: beskriv(val), nar: new Date().toISOString() }); ta.value = ''; st.textContent = 'Sparat.'; }
    catch (e) { st.textContent = 'Kunde inte spara. Har du rätt att ändra sidan?'; }
  });
  // ---------- granskningen: ett kort per ny del (API:ts och de nya handgjorda) ----------
  // Björns svar sparas i samlingen val som 'best-<lager>-<del>' med delens avtryck: ritas delen om står kortet obesvarat
  // igen, med hans förra kommentar överst. 🎲 byter alla andra delar, så att delen syns på olika bestar.
  const BKORT = LAGER.flatMap(l => l.delar.map(d => ({ id: `best-${l.id}-${d.id}`, lager: l, del: d, avtryck: d.avtryck || 'hand' })));
  const SVAR = {}, gr = rot.querySelector('#bs-kort'), sett = [];
  let bkFilter = 'obesvarade', bkId = BKORT[0]?.id, bkVal = null, bkVantar = null, bkVisad = null;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const bkSvar = k => { const s = SVAR[k.id]; return s && s.avtryck === k.avtryck ? s : null; };
  const bkLage = k => { const s = bkSvar(k); return !s ? 'obesvarad' : s.svar === 'ja' || s.svar === 'nej' ? s.svar : 'kommentar'; };
  const bkStatus = t => { const e = gr.querySelector('.gr-sparat'); if (e) e.textContent = t; };
  // versionen av en handgjord del (texturerna) visas bredvid den handgjorda
  const handFor = k => (k.del.grupp && k.del.grupp !== k.del.id ? k.lager.delar.find(x => x.id === k.del.grupp) : null);
  function bkRita() {
    const k = BKORT.find(x => x.id === bkId); if (!k) return;
    const [a, b] = gr.querySelectorAll('.bs-kortbilder canvas'), h = handFor(k);
    if (a) tillCanvas(ritaBest(bkVal, false), a, 0);
    if (b && h) tillCanvas(ritaBest({ ...bkVal, [k.lager.id]: h.id }, false), b, 0);
    const t = gr.querySelector('.bs-kortbeskriv'); if (t) t.textContent = beskriv(bkVal);
  }
  function bkFlytta(steg, svarat = false) {
    if (steg < 0 && sett.length) { bkId = sett.pop(); bkVisa(true); return; }
    const fran = bkId, i = BKORT.findIndex(k => k.id === bkId);
    for (let n = 1; n <= BKORT.length; n++) {
      const k = BKORT[(i + steg * n + BKORT.length * n) % BKORT.length];
      if (bkFilter === 'alla' || bkLage(k) === 'obesvarad') { bkId = k.id; break; }
      if (svarat && n === BKORT.length) break;
    }
    if (steg > 0 && bkId !== fran) sett.push(fran);
    bkVisa(true);
  }
  function bkVisa(nytt = false) {
    const obesv = BKORT.filter(k => bkLage(k) === 'obesvarad').length;
    rot.querySelector('#bs-antal-obesv').textContent = obesv; rot.querySelector('#bs-antal-alla').textContent = BKORT.length;
    rot.querySelectorAll('[data-bsfilter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.bsfilter === bkFilter)));
    const k = BKORT.find(x => x.id === bkId) || BKORT[0];
    const lk = rot.querySelector('#bs-lagerknappar'); lk.textContent = '';
    for (const l of LAGER) {
      const ks = BKORT.filter(x => x.lager === l); if (!ks.length) continue;
      const ja = ks.filter(x => bkLage(x) === 'ja').length, kom = ks.filter(x => ['kommentar', 'nej'].includes(bkLage(x))).length;
      const b = document.createElement('button'); b.type = 'button'; b.dataset.bslager = l.id;
      b.className = ja === ks.length ? 'klar' : kom ? 'kommenterad' : ''; b.innerHTML = `${esc(l.namn)} <small>${ja}/${ks.length}</small>`;
      if (k?.lager === l) b.setAttribute('aria-current', 'true');
      lk.append(b);
    }
    if (!k) { gr.className = 'grkort'; gr.innerHTML = '<p>Inget att granska just nu.</p>'; bkVisad = null; return; }
    bkId = k.id;
    if (bkFilter === 'obesvarade' && !obesv && bkLage(k) !== 'obesvarad') {
      gr.className = 'grkort'; gr.innerHTML = '<p>Alla kort är besvarade.</p><p><button type="button" class="gr-knapp" data-bsfilter="alla">Visa alla kort</button></p>'; bkVisad = null; return;
    }
    const synliga = BKORT.filter(x => bkFilter === 'alla' || bkLage(x) === 'obesvarad' || x.id === bkId), pos = synliga.indexOf(k) + 1;
    const nav = `<nav class="gr-nav" aria-label="Bläddra bland korten"><button type="button" class="gr-knapp" data-bssteg="-1">‹ Förra</button><span>${pos} av ${synliga.length}</span><button type="button" class="gr-knapp" data-bssteg="1">Nästa ›</button></nav>`;
    if (nytt || bkVisad !== k.id || !gr.querySelector('.bs-kortbilder')) {
      bkVal = { ...val, [k.lager.id]: k.del.id };
      if (!passar(bkVal, k.lager.id)) bkVal.kropp = KROPPAR.find(d => !(d.utan || []).includes(k.lager.id)).id;
      const h = handFor(k), s = SVAR[k.id], forra = !bkSvar(k) && s?.kommentar ? s.kommentar : k.del.forra;
      gr.innerHTML = `${nav}<header><span class="typ">${esc(k.lager.namn)} · ${k.del.api ? 'ritad av Claude API:t' : 'handgjord'}${h ? ' · version av ' + esc(h.namn.toLowerCase()) : ''}</span>
        <h3>${esc(k.del.namn)}</h3><p class="not">${esc(k.del.text)}</p>${forra ? `<p class="forra">Din kommentar förra gången: ${esc(forra)}</p>` : ''}</header>
        <div class="bs-kortbilder"><figure><canvas role="img" aria-label="${esc(k.del.namn)} på besten"></canvas><figcaption>${esc(k.del.namn)}</figcaption></figure>${h ? `<figure><canvas role="img" aria-label="Den handgjorda på samma best"></canvas><figcaption>Den handgjorda</figcaption></figure>` : ''}</div>
        <p class="not bs-kortbeskriv"></p>
        <div class="sk-knapprad"><button type="button" class="gr-knapp" data-bsslumpa title="Byt alla andra delar">🎲 Slumpa resten</button><button type="button" class="gr-knapp" data-bsiskaparen title="Visa den här besten i skaparen ovanför">Till skaparen</button></div>
        <div class="gr-svar"><div class="gr-svarknappar"><button type="button" class="gr-ja" data-bssvar="ja">Ja</button><button type="button" class="gr-nej" data-bssvar="nej">Nej</button></div>
        <label for="bs-gr-kommentar">Kommentar: vad ska ändras?</label><textarea id="bs-gr-kommentar" rows="3" placeholder="Till exempel: fjällen är för små och syns inte på den svarta besten"></textarea>
        <button type="button" class="gr-knapp" data-bssvar="kommentar">Skicka kommentaren</button></div>
        <p class="gr-sparat" aria-live="polite"></p>${nav}`;
      gr.querySelector('#bs-gr-kommentar').value = bkSvar(k)?.kommentar || '';
      bkVisad = k.id; bkRita();
    } else gr.querySelectorAll('.gr-nav span').forEach(e => { e.textContent = `${pos} av ${synliga.length}`; });
    gr.className = 'grkort ' + bkLage(k);
    const sv = bkSvar(k);
    bkStatus(!DB ? 'Svaren går bara att spara när sidan är öppen i Claude och du är inloggad.' : bkVantar === k.id ? 'Sparar …'
      : sv ? (sv.svar === 'ja' ? 'Godkänd.' : sv.svar === 'nej' ? 'Nej: tas bort eller ritas om.' : 'Kommentaren är sparad.') + ' ' + new Date(sv.nar).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' }) : '');
    gr.querySelectorAll('[data-bssvar]').forEach(b => { b.disabled = !DB; b.setAttribute('aria-pressed', String(sv?.svar === b.dataset.bssvar)); });
    gr.querySelector('#bs-gr-kommentar').disabled = !DB;
  }
  // väljaren ovanför följer svaren: nej tas bort, ja får ✓
  function bkValjare() {
    NEJ.clear(); JA.clear();
    for (const k of BKORT) { const l = bkLage(k); if (l === 'nej') NEJ.add(nyckel(k.lager.id, k.del.id)); if (l === 'ja') JA.add(nyckel(k.lager.id, k.del.id)); }
    byggValjare(); visa();
  }
  async function bkSvara(svar) {
    const k = BKORT.find(x => x.id === bkId); if (!k || !DB) return;
    const ta = gr.querySelector('#bs-gr-kommentar'), kommentar = ta ? ta.value.trim() : '';
    if (svar === 'kommentar' && !kommentar) { bkStatus('Skriv först vad som ska ändras.'); ta?.focus(); return; }
    const data = { svar, kommentar, nar: new Date().toISOString(), avtryck: k.avtryck, lager: k.lager.id, del: k.del.id, namn: k.del.namn };
    const forut = SVAR[k.id]; SVAR[k.id] = data; bkVantar = k.id; bkValjare(); bkVisa();
    try { await DB.doc('val/' + k.id).set(data); bkVantar = null; bkVisa(); setTimeout(() => { if (bkId === k.id) bkFlytta(1, true); }, 450); }
    catch (e) { bkVantar = null; if (forut) SVAR[k.id] = forut; else delete SVAR[k.id]; bkVisa(); bkStatus('Kunde inte spara. Har du rätt att ändra sidan?'); }
  }
  rot.querySelector('#bs-granska').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.bssteg) bkFlytta(+b.dataset.bssteg);
    else if (b.dataset.bsfilter) { bkFilter = b.dataset.bsfilter; bkVisa(true); }
    else if (b.dataset.bslager) { const k = BKORT.find(x => x.lager.id === b.dataset.bslager && (bkFilter === 'alla' || bkLage(x) === 'obesvarad')) || BKORT.find(x => x.lager.id === b.dataset.bslager); if (k) { sett.push(bkId); bkId = k.id; bkVisa(true); } }
    else if ('bsslumpa' in b.dataset) { const k = BKORT.find(x => x.id === bkId); slumpaUtom(bkVal, k.lager.id); bkRita(); }
    else if ('bsiskaparen' in b.dataset) { Object.assign(val, bkVal); visa(); duk.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    else if (b.dataset.bssvar) bkSvara(b.dataset.bssvar);
  });
  bkVisa();
  // för bildstil/api/bestar.mjs: en del från API:t ritad i besten, som png, med det som inte stämmer
  function prov(lager, d, over = {}, skala = 4, spegel = false) {
    const L = LAGER.find(x => x.id === lager), fel = [];
    let del;
    try { del = apiDel(lager, d); } catch (e) { return { fel: ['kunde inte läsas: ' + e.message] }; }
    L.delar.push(del);
    try {
      const v = { ...val, ...over, [lager]: del.id }, B = Bild(W, H, P);
      const fr = dels(v, 'farg');
      for (const x of delarna(v)) mala(B, x, fr);
      let x0 = W, x1 = -1, y0 = H, ute = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (B.get(x, y) >= 0) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); if (x === 0 || x === W - 1 || y === 0) ute++; }
      if (ute) fel.push(`besten går utanför bilden (${ute} punkter vid kanten)`);
      if (x1 > W - 20) fel.push(`besten går in i människan till höger (x ${x1}, högst ${W - 20})`);
      return { png: png(ritaBest(v, spegel), skala), fel, ruta: [x0, y0, x1] };
    } catch (e) { return { fel: ['kraschade: ' + e.message] }; }
    finally { L.delar.pop(); }
  }
  // en handgjord del eller hela besten som png (underlaget för API:t)
  function png(S, skala) {
    const a = document.createElement('canvas'), c = document.createElement('canvas'); tillCanvas(S, a, 0);
    c.width = S.w * skala; c.height = S.h * skala; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(a, 0, 0, c.width, c.height);
    return c.toDataURL('image/png').split(',')[1];
  }
  function bild(over = {}, skala = 4, spegel = false) { return png(ritaBest({ ...val, ...over }, spegel), skala); }
  window.BESTAR = { LAGER, ritaBest, val, visa, prov, bild, MATERIAL, FASTEN };
})();
