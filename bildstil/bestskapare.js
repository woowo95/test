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
      m: { kropp: ['barr', 2], horn: ['ben', 2], skal: ['jord', 2], platta: ['rost', 2], hard: ['senap', 1], man: ['senap', 0], tecken: ['senap', 3], hinna: ['rost', 1], fjader: ['jord', 2], oga: ['senap', 3], mun: ['rost', 0], tand: ['ben', 3], klo: ['ben', 1] } },
    { id: 'aska', namn: 'Aska och blod', text: 'kolsvart kropp, horn av ben, blodröda hinnor och tecken och röda ögon som lyser',
      m: { kropp: ['kol', 2], horn: ['ben', 2], skal: ['skiffer', 1], platta: ['rost', 1], hard: ['skiffer', 2], man: ['rost', 1], tecken: ['rost', 3], hinna: ['rost', 0], fjader: ['skiffer', 1], oga: ['rost', 3], mun: ['rost', 0], tand: ['ben', 3], klo: ['ben', 2] } },
  ];

  // ---------- kroppen bestämmer var allt annat sitter ----------
  // h, f: höften och bogen där benen börjar; svans: svansroten; nacke: halsens början och slut (huvudet sitter i slutet);
  // vinge: vingens rot; mitt: mitt på ryggen; lang: hur långt bak och fram skal och plattor räcker
  const KROPPAR = [
    { id: 'rovdjur', namn: 'Rovdjur', text: 'tunga skuldror, smal midja och huvudet lågt framåt',
      bal: [[38, 46], [44, 39], [54, 40], [62, 35], [70, 28], [78, 28], [84, 33], [87, 42], [84, 52], [76, 56], [66, 53], [56, 51], [48, 53], [40, 52], [35, 49]],
      nacke: [[80, 36], [92, 43]], nackeR: [9, 6.5], h: [46, 46], f: [77, 47], svans: [38, 44], vinge: [72, 32], lang: [42, 84] },
    { id: 'odla', namn: 'Ödla', text: 'lång och låg, med magen nära marken och halsen rak fram',
      bal: [[34, 56], [40, 50], [52, 47], [66, 47], [78, 49], [85, 54], [84, 60], [74, 64], [56, 65], [42, 64], [35, 61]],
      nacke: [[80, 53], [93, 50]], nackeR: [7.5, 5.5], h: [44, 59], f: [76, 59], svans: [36, 56], vinge: [66, 49], lang: [38, 84] },
  ];
  for (const K of KROPPAR) { K.bal = flytta(K.bal, 0, OY); K.nacke = flytta(K.nacke, 0, OY); for (const k of ['h', 'f', 'svans', 'vinge']) K[k] = [K[k][0], K[k][1] + OY]; }

  // ---------- delarna i varje lager ----------
  // en del ger en lista av { mask, mat, far, kontur, monster(x, y, v), lyser, z }; z bestämmer ordningen (lågt först)
  const Z = { farVinge: 0, farBen: 1, farHorn: 2, platta: 3, svans: 4, kropp: 5, skal: 6, klubba: 7, man: 8, hard: 9, ben: 10, harBen: 11, vinge: 12, huvud: 13, tecken: 14, horn: 15, oga: 16 };

  const BEN = [
    { id: 'klor', namn: 'Klor', text: 'böjda rovdjursben på tårna, med klor',
      ben(J, bak, far) {
        const dy = G - J[1], fy = far ? G - 2 : G - 1;
        const pts = bak ? [J, [J[0] + 5, J[1] + dy * 0.38], [J[0] - 3, fy - 8], [J[0] + 1, fy - 1]] : [J, [J[0] - 3, J[1] + dy * 0.45], [J[0] + 1, fy - 5], [J[0] + 3, fy - 1]];
        const r = bak ? [7.5, 5, 3.4, 3] : [7, 5, 4, 3];
        const tass = ell(pts[3][0] + 1.5, fy - 1.5, 4, 2.2);
        const klor = [0, 1, 2].map(i => poly([[pts[3][0] + 3 + i * 1.5, fy - 2], [pts[3][0] + 5.5 + i * 1.5, fy + 0.6], [pts[3][0] + 4 + i * 1.5, fy - 0.5]]));
        return { mask: fyll(eller(kapsel(pts, r), tass)), extra: [{ mask: fyll(eller(...klor)), mat: 'klo' }], leder: [pts[1], pts[2]], skena: [pts[2], pts[3]] };
      } },
    { id: 'pelare', namn: 'Pelare', text: 'tjocka raka ben som stolpar, med breda fötter och naglar',
      ben(J, bak, far) {
        const fy = far ? G - 2 : G - 1, dy = fy - J[1];
        const pts = bak ? [J, [J[0] - 1, J[1] + dy * 0.5], [J[0] + 1, fy - 3]] : [J, [J[0] + 1, J[1] + dy * 0.5], [J[0], fy - 3]];
        const fot = poly([[pts[2][0] - 6, fy - 4], [pts[2][0] + 6, fy - 4], [pts[2][0] + 7, fy], [pts[2][0] - 6, fy]]);
        const naglar = [-3, 0, 3].map(i => poly([[pts[2][0] + i + 0.5, fy - 2], [pts[2][0] + i + 3, fy - 2], [pts[2][0] + i + 3, fy], [pts[2][0] + i + 0.5, fy]]));
        return { mask: fyll(eller(kapsel(pts, [7.5, 6.5, 6]), fot)), extra: [{ mask: fyll(eller(...naglar)), mat: 'klo', kontur: false }], leder: [pts[1], [pts[2][0], pts[2][1] - 2]], skena: [pts[1], pts[2]] };
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
          skalle: fyll(skalle), oga: [nx + 11, ny - 4], horn: [nx + 5, ny - 7], nos: [nx + 21, ny - 1], panna: [nx + 9, ny - 7] };
      } },
    { id: 'nabb', namn: 'Näbb', text: 'rund skalle med en krokig näbb av horn',
      huvud([nx, ny]) {
        const skalle = poly([[nx - 5, ny - 6], [nx + 2, ny - 10], [nx + 10, ny - 9], [nx + 15, ny - 4], [nx + 15, ny + 3], [nx + 9, ny + 7], [nx, ny + 7], [nx - 5, ny + 4]]);
        const ovre = poly([[nx + 12, ny - 6], [nx + 19, ny - 5], [nx + 24, ny - 1], [nx + 25, ny + 5], [nx + 22.5, ny + 2], [nx + 13, ny + 1.5]]);
        const nedre = poly([[nx + 12, ny + 2.5], [nx + 21, ny + 2.5], [nx + 18, ny + 6], [nx + 12, ny + 6]]);
        return { delar: [{ mask: fyll(nedre), mat: 'horn', z: Z.huvud + 0.1 }, { mask: fyll(ovre), mat: 'horn', z: Z.huvud + 0.2 }],
          skalle: fyll(skalle), oga: [nx + 9, ny - 4], horn: [nx + 3, ny - 8], nos: null, panna: [nx + 7, ny - 8] };
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
    { id: 'taggar', namn: 'Taggar', text: 'en rad vassa taggar längs ryggen, nacken och svansen',
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

  // ---------- registret: lagren i den ordning de väljs ----------
  const LAGER = [
    { id: 'kropp', namn: 'Kropp', delar: KROPPAR, maste: true },
    { id: 'ben', namn: 'Ben', delar: BEN, maste: true },
    { id: 'huvud', namn: 'Huvud', delar: HUVUDEN, maste: true },
    { id: 'horn', namn: 'Horn', delar: HORN },
    { id: 'vingar', namn: 'Vingar', delar: VINGAR },
    { id: 'svans', namn: 'Svans', delar: SVANSAR, maste: true },
    { id: 'skal', namn: 'Skal', delar: SKAL },
    { id: 'plattor', namn: 'Plattor', delar: PLATTOR },
    { id: 'hard', namn: 'Förhårdnader', delar: HARDA },
    { id: 'pryd', namn: 'Prydnader', delar: PRYDNADER },
    { id: 'farg', namn: 'Färger', delar: FARGER, maste: true },
  ];
  const dels = (val, id) => { const L = LAGER.find(l => l.id === id); return L.delar.find(d => d.id === val[id]) || null; };

  // ---------- en del i bilden: kontur, skuggning och mönster ----------
  function mala(L, d, fr) {
    const [ramp, b0] = fr.m[d.mat] || fr.m.kropp, b = b0 - (d.far ? 1 : 0) + Math.round(d.ton || 0), m = d.mask;
    const lagst = ramp === 'kol' ? 1 : 0, kl = t => Math.max(lagst, Math.min(3, t));
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
      else {
        if (du === 0 || v < 0.16 || (v < 0.28 && q < (0.28 - v) / 0.12)) t = b + 1;
        else if (h >= 9 && v > 0.84) t = b - 2;
        else if (v > 0.6 || (v > 0.5 && q < (v - 0.5) / 0.1)) t = b - 1;
        if (dl === 0 && h >= 4 && v < 0.6) t = Math.max(t, b + 1);
        if (dr === 0 && h >= 4 && t > b - 1 && du > 0) t = b - 1;
      }
      if (d.monster) t += d.monster(x, y, v, du, dl, dr);
      L.satt(x, y, P.i(ramp, kl(t)), !!d.lyser);
    }
  }

  // ---------- hela besten ----------
  function delarna(val) {
    const K = dels(val, 'kropp'), BE = dels(val, 'ben'), HU = dels(val, 'huvud'), HO = dels(val, 'horn'), VI = dels(val, 'vingar');
    const SV = dels(val, 'svans'), SK = dels(val, 'skal'), PL = dels(val, 'plattor'), HA = dels(val, 'hard'), PR = dels(val, 'pryd');
    const D = [];
    const lagg = (d, z, extra = {}) => D.push({ mat: 'kropp', ...d, z: d.z ?? z, ...extra });
    // kroppen: bålen, halsen, skallen och svansen är en form, utan kontur mellan dem
    const bal = fyll(poly(K.bal)), nacke = fyll(kapsel(K.nacke, K.nackeR));
    const hu = HU.huvud(K.nacke[1]), sv = SV.svans(K.svans);
    const kropp = ihop(bal, nacke, hu.skalle, sv.mask);
    lagg({ mask: kropp }, Z.kropp);
    hu.delar.forEach(d => lagg(d, Z.huvud));
    if (sv.klubba) {
      const [cx, cy] = sv.klubba;
      lagg({ mask: fyll(eller(ell(cx, cy, 6, 5), poly([[cx - 2, cy - 4], [cx, cy - 9], [cx + 2, cy - 4]]), poly([[cx - 5, cy - 1], [cx - 10, cy - 2], [cx - 5, cy + 2]]), poly([[cx - 2, cy + 4], [cx - 1, cy + 8], [cx + 2, cy + 4]]))), mat: 'hard' }, Z.klubba);
    }
    // benen: de bortre lite förskjutna och mörkare
    const leder = [], skenor = [];
    for (const [J, bak, far, dx] of [[K.h, true, true, 5], [K.f, false, true, -5], [K.h, true, false, 0], [K.f, false, false, 0]]) {
      const b = BE.ben([J[0] + dx, J[1] - (far ? 1 : 0)], bak, far);
      lagg({ mask: b.mask, far }, far ? Z.farBen : Z.ben);
      b.extra.forEach(e => lagg({ ...e, far }, far ? Z.farBen + 0.1 : Z.ben + 0.1));
      if (!far) { leder.push(...b.leder); skenor.push(b.skena); }
    }
    // skalet och plattorna längs ryggen
    let rygg = ihop(bal);
    if (SK) { const s = SK.skal(K, bal); lagg({ mask: s.mask, mat: 'skal', monster: s.monster }, Z.skal); rygg = ihop(bal, s.mask); }
    if (PL) {
      const rx0 = PL.id === 'taggar' ? K.svans[0] - 10 : K.lang[0], rx1 = PL.id === 'taggar' ? K.nacke[1][0] - 2 : K.lang[1] - 4;
      const r = ryggen(ihop(rygg, nacke, PL.id === 'taggar' ? sv.mask : null), rx0, rx1);
      const p = PL.plattor(r); lagg({ mask: p.mask, mat: 'platta', monster: p.monster }, Z.platta);
    }
    // hornen: det bortre bakom huvudet
    if (HO) {
      lagg({ mask: fyll(HO.horn([hu.horn[0] + 3, hu.horn[1] + 1])), mat: 'horn', far: true }, Z.farHorn);
      lagg({ mask: fyll(HO.horn(hu.horn)), mat: 'horn', monster: (x, y) => ((x + y) % 3 === 0 ? -1 : 0) }, Z.horn);
    }
    // vingarna: den bortre bakom allt
    if (VI) {
      VI.vinge([K.vinge[0] + 5, K.vinge[1] - 3]).forEach((d, i) => lagg({ ...d, far: true }, Z.farVinge + i * 0.01));
      VI.vinge(K.vinge).forEach((d, i) => lagg(d, Z.vinge + i * 0.01));
    }
    const A = { h: K.h, f: K.f, nacke: K.nacke, vinge: K.vinge, svans: K.svans, svansSpets: sv.spets, klubbaPkt: sv.klubba, oga: hu.oga, panna: hu.panna, nos: hu.nos, leder, skenor };
    if (HA) lagg({ mask: HA.hard(A), mat: 'hard' }, Z.hard);
    if (PR) { const p = PR.pryd(A, kropp); lagg(p, p.z); }
    // ögat: litet och djupt under en mörk panna, och det lyser
    const [ox, oy] = hu.oga, oga = tom(), bryn = tom();
    oga[oy * W + ox] = 1; oga[oy * W + ox + 1] = 1;
    for (let x = ox - 1; x <= ox + 2; x++) bryn[(oy - 1) * W + x] = 1;
    bryn[oy * W + ox - 1] = 1;
    lagg({ mask: bryn, mat: 'kropp', ton: -9, kontur: false }, Z.oga);
    lagg({ mask: oga, mat: 'oga', kontur: false, lyser: true }, Z.oga + 0.1);
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
  Object.assign(val, { horn: 'bakat', plattor: 'taggar' });
  let spegel = false;
  const duk = rot.querySelector('#bs-bild'), text = rot.querySelector('#bs-text'), valen = rot.querySelector('#bs-val');
  const beskriv = v => LAGER.map(l => { const d = l.delar.find(x => x.id === v[l.id]); return `${l.namn}: ${d ? d.namn.toLowerCase() : 'inget'}`; }).join(' · ');
  function visa() {
    tillCanvas(ritaBest(val, spegel), duk, 0);
    text.textContent = beskriv(val);
    valen.querySelectorAll('button[data-lager]').forEach(b => b.setAttribute('aria-pressed', String((val[b.dataset.lager] ?? '') === b.dataset.del)));
  }
  for (const l of LAGER) {
    const rad = document.createElement('div'); rad.className = 'sk-rad';
    const n = document.createElement('span'); n.className = 'sk-namn'; n.textContent = l.namn;
    const chips = document.createElement('div'); chips.className = 'sk-chips';
    const knapp = (del, namn, titel) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.lager = l.id; b.dataset.del = del; b.textContent = namn; if (titel) b.title = titel; chips.append(b); };
    if (!l.maste) knapp('', 'Inget');
    l.delar.forEach((d, i) => knapp(d.id, `${i + 1} ${d.namn}`, d.text));
    rad.append(n, chips); valen.append(rad);
  }
  valen.addEventListener('click', e => { const b = e.target.closest('button[data-lager]'); if (!b) return; val[b.dataset.lager] = b.dataset.del || null; visa(); });
  rot.querySelector('#bs-spegla').addEventListener('click', e => { spegel = !spegel; e.currentTarget.setAttribute('aria-pressed', String(spegel)); visa(); });
  rot.querySelector('#bs-slumpa').addEventListener('click', () => {
    for (const l of LAGER) { const m = l.delar.map(d => d.id); if (!l.maste) m.push(null); val[l.id] = m[Math.floor(Math.random() * m.length)]; }
    visa();
  });
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
  })();
  rot.querySelector('#bs-spara').addEventListener('click', async () => {
    const ta = rot.querySelector('#bs-kommentar');
    if (!DB) { st.textContent = 'Det går bara att spara när sidan är öppen i Claude och du är inloggad.'; return; }
    try { await DB.collection('bestar').add({ val: { ...val }, kommentar: ta.value.trim(), text: beskriv(val), nar: new Date().toISOString() }); ta.value = ''; st.textContent = 'Sparat.'; }
    catch (e) { st.textContent = 'Kunde inte spara. Har du rätt att ändra sidan?'; }
  });
  window.BESTAR = { LAGER, ritaBest, val, visa };
})();
