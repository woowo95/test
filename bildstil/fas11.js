// fas 11: konceptbilder av världskartan (Björn 2026-11-05: "kan vi börja jobba på konceptbilder till världskartan").
// Idéerna står i designdokumentet under Flera samhällen, tribut och diplomati (Världen och grannbyarna), steg 11.1.9.
// En liten värld genereras ur ett frö, som i spelet: höjd och fukt ur brus, hav i väster och söder, berg i nordost,
// floder från bergen till havet, sjöar, skog och myr, och platserna (byarna, läger, rövarläger, ruiner, en helig
// plats, en gravhög och en runsten). Samma värld ritas i tre stilar. En ruta på världskartan (8 × 8 punkter här) är en
// bykarta; den egna byn har en ring runt sig.
// Kortet f11_varldskarta_o (Björn: kartan ska kännas större, med hav runt den stora ön i mitten) ritar en större värld
// med samma kod: dubbelt så stor åt varje håll, en ö mitt i havet och fler platser. De första kartorna ritas som förut.
(() => {
  const RUTA = 8, FRO = 11;
  const hash = (a, b, c = 0) => { let n = (a * 374761393 + b * 668265263 + c * 1274126177) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const brus = (x, y, s) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, y, s, okt = 4) => { let v = 0, a = 0.5, f = 1, sum = 0; for (let i = 0; i < okt; i++) { v += a * brus(x * f, y * f, s + i * 17); sum += a; a *= 0.5; f *= 2; } return v / sum; };

  const HAV = 0, SLATT = 1, SKOG = 2, BERG = 3, MYR = 4, SJO = 5;
  // en karta: W × H punkter; o = en stor ö mitt i havet (antalet floder och platser står i o), annars den första kartan
  let KNR = 0;
  function karta(W, H, o) {
  // ---------- världen ----------
  let VARLD = null;
  function varld() {
    if (VARLD) return VARLD;
    const N = W * H, hojd = new Float32Array(N), typ = new Uint8Array(N), elv = new Uint8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const z = o && o.zoom || 1, ux = W / 2 + (x - W / 2) / z, uy = H / 2 + (y - H / 2) / z; // inzoomat: samma värld, större
      let h = fbm(ux / 46, uy / 46, FRO) * 0.62 + fbm(ux / 13, uy / 13, FRO + 50, 3) * 0.38;
      if (o) { // ön (eller kontinenterna): landet stiger mot mitten och sjunker under havet långt innan kanten
        const vx = (fbm(ux / 40, uy / 40, FRO + 120, 2) - 0.5) * 0.35, vy = (fbm(ux / 40, uy / 40, FRO + 140, 2) - 0.5) * 0.35;
        const lyft = (cx, cy, rx, ry) => { const d = Math.hypot((ux - W * cx) / (W * rx) + vx, (uy - H * cy) / (H * ry) + vy); return o.lyft - d * d * o.fall; };
        h += o.kontinenter ? Math.max(...o.kontinenter.map(k => lyft(...k))) : lyft(0.5, 0.5, o.rx, o.ry);
        const kant = Math.min(x, y, W - 1 - x, H - 1 - y); if (kant < 24) h -= (24 - kant) / 24 * 0.25; // havet längs hela kanten
      } else {
        h += (x / W - 0.45) * 0.5 - (y / H - 0.4) * 0.22;
        const kant = Math.min(x, H - 1 - y); if (kant < 14) h -= (14 - kant) / 14 * 0.2;
      }
      hojd[y * W + x] = h;
    }
    const HAVNIVA = 0.4, BERGNIVA = o ? o.berg : 0.69;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const z = o && o.zoom || 1, ux = W / 2 + (x - W / 2) / z, uy = H / 2 + (y - H / 2) / z;
      const i = y * W + x, h = hojd[i], f = fbm(ux / 20, uy / 20, FRO + 30, 3);
      if (h < HAVNIVA) typ[i] = HAV;
      else if (h > BERGNIVA) typ[i] = BERG;
      else if (fbm(ux / 9, uy / 9, FRO + 90, 2) > 0.74 && h > HAVNIVA + 0.06 && h < BERGNIVA - 0.04) typ[i] = SJO;
      else if (f > 0.56 && h < HAVNIVA + 0.09) typ[i] = MYR;
      else if (f > 0.47 || h > BERGNIVA - 0.07) typ[i] = SKOG;
      else typ[i] = SLATT;
    }
    // floderna: på ett grövre rutnät från de högsta punkterna i bergen, alltid till den lägsta grannen som inte besökts
    const G = 4, GW = W / G, GH = H / G, gh = (gx, gy) => hojd[(gy * G + 2) * W + gx * G + 2];
    const kallor = [];
    for (let gy = 1; gy < GH - 1; gy++) for (let gx = 1; gx < GW - 1; gx++) if (typ[(gy * G + 2) * W + gx * G + 2] === BERG) kallor.push([gh(gx, gy) + hash(gx, gy, 5) * 0.05, gx, gy]);
    kallor.sort((a, b) => b[0] - a[0]);
    const valda = [];
    for (const [, gx, gy] of kallor) { if (valda.length >= (o ? o.floder : 4)) break; if (valda.every(([ax, ay]) => Math.abs(ax - gx) + Math.abs(ay - gy) > 12)) valda.push([gx, gy]); }
    const floder = [];
    for (const [sx, sy] of valda) {
      let gx = sx, gy = sy; const sedd = new Set([gx + ',' + gy]), vag = [[gx, gy]];
      for (let s = 0; s < 120; s++) {
        let bast = null;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
          const nx = gx + dx, ny = gy + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || sedd.has(nx + ',' + ny)) continue;
          const v = gh(nx, ny) + hash(nx, ny, 7) * 0.02 + (dx && dy ? 0.004 : 0);
          if (!bast || v < bast[0]) bast = [v, nx, ny];
        }
        if (!bast) break;
        [, gx, gy] = bast; sedd.add(gx + ',' + gy); vag.push([gx, gy]);
        if (typ[(gy * G + 2) * W + gx * G + 2] === HAV) break;
      }
      // punkterna mellan rutornas mitt, med en liten slingring
      const pts = vag.map(([gx, gy], k) => [gx * G + 2 + (k && k < vag.length - 1 ? Math.round((hash(gx, gy, 9) - 0.5) * 3) : 0), gy * G + 2 + (k && k < vag.length - 1 ? Math.round((hash(gx, gy, 10) - 0.5) * 3) : 0)]);
      floder.push(pts);
      for (let k = 0; k < pts.length - 1; k++) {
        const [ax, ay] = pts[k], [bx, by] = pts[k + 1], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) || 1;
        for (let t = 0; t <= n; t++) {
          const x = Math.round(ax + (bx - ax) * t / n), y = Math.round(ay + (by - ay) * t / n);
          const bred = k > pts.length * 0.6 ? 2 : 1;
          for (let dy = 0; dy < bred; dy++) for (let dx = 0; dx < bred; dx++) { const i = (y + dy) * W + x + dx; if (x + dx < W && y + dy < H && typ[i] !== HAV) elv[i] = 1; }
        }
      }
    }
    // avståndet till kusten (i havet och sjöarna) och till vattnet (på land)
    const avst = new Int16Array(N).fill(999), ko = [];
    const vatten = i => typ[i] === HAV || typ[i] === SJO;
    for (let i = 0; i < N; i++) if (!vatten(i)) { avst[i] = 0; ko.push(i); }
    for (let k = 0; k < ko.length; k++) { const i = ko[k], x = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (avst[j] > avst[i] + 1) { avst[j] = avst[i] + 1; ko.push(j); } } }
    // landmassorna: varje sammanhängande land (sjöarna räknas till landet); de stora är kontinenterna
    const del = new Int16Array(N).fill(-1), storlek = [];
    for (let s0 = 0; s0 < N; s0++) {
      if (typ[s0] === HAV || del[s0] >= 0) continue;
      const id = storlek.length, q = [s0]; del[s0] = id;
      for (let k = 0; k < q.length; k++) { const i = q[k], x = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (typ[j] !== HAV && del[j] < 0) { del[j] = id; q.push(j); } } }
      storlek.push(q.length);
    }
    const kont = storlek.map((n, id) => n >= 1500 ? id : -1).filter(id => id >= 0);
    // platserna, på rutnätet där en ruta är en bykarta
    const RW = W / RUTA, RH = H / RUTA, ruttyp = (rx, ry) => typ[(ry * RUTA + 4) * W + rx * RUTA + 4];
    const narVatten = (rx, ry) => { for (let y = ry * RUTA - 4; y < ry * RUTA + 12; y++) for (let x = rx * RUTA - 4; x < rx * RUTA + 12; x++) { if (x < 0 || y < 0 || x >= W || y >= H) continue; const i = y * W + x; if (vatten(i) || elv[i]) return true; } return false; };
    const flodI = (rx, ry) => { for (let y = ry * RUTA; y < ry * RUTA + RUTA; y++) for (let x = rx * RUTA; x < rx * RUTA + RUTA; x++) if (elv[y * W + x]) return true; return false; };
    const platser = [], fri = (rx, ry, d) => platser.every(p => Math.abs(p.rx - rx) + Math.abs(p.ry - ry) >= d);
    const rutor = []; for (let ry = 1; ry < RH - 1; ry++) for (let rx = 1; rx < RW - 1; rx++) rutor.push([hash(rx, ry, 21), rx, ry]);
    rutor.sort((a, b) => a[0] - b[0]);
    const valj = (sort, antal, ok, d) => { let n = 0; for (const [, rx, ry] of rutor) { if (n >= antal) break; if (ok(rx, ry) && fri(rx, ry, d)) { platser.push({ sort, rx, ry, x: rx * RUTA + 4, y: ry * RUTA + 4 }); n++; } } };
    const land = (rx, ry) => { const t = ruttyp(rx, ry); return t === SLATT || t === SKOG; };
    const iMitten = o && o.kontinenter ? (rx, ry) => rx > RW * 0.12 && rx < RW * 0.88 && ry > RH * 0.15 && ry < RH * 0.85 : o ? (rx, ry) => rx > RW * 0.3 && rx < RW * 0.7 && ry > RH * 0.3 && ry < RH * 0.7 : (rx, ry) => rx > 8 && rx < 22 && ry > 5 && ry < 15;
    valj('egen', 1, (rx, ry) => land(rx, ry) && flodI(rx, ry) && iMitten(rx, ry), 0); // den egna byn: en flod rinner genom byn
    if (!platser.length) valj('egen', 1, (rx, ry) => land(rx, ry) && narVatten(rx, ry), 0);
    const A = o ? o.antal : { by: 5, lager: 3, rovare: 1, ruin: 2, helig: 1, hog: 1, runsten: 1 };
    valj('by', A.by, (rx, ry) => land(rx, ry) && narVatten(rx, ry), 5);
    const delAv = p => del[(p.ry * RUTA + 4) * W + p.rx * RUTA + 4];
    if (o && o.kontinenter) for (const c of kont) if (!platser.some(p => (p.sort === 'by' || p.sort === 'egen') && delAv(p) === c)) valj('by', 1, (rx, ry) => land(rx, ry) && del[(ry * RUTA + 4) * W + rx * RUTA + 4] === c, 3); // varje kontinent har en by
    valj('lager', A.lager, land, 3);
    valj('rovare', A.rovare, (rx, ry) => ruttyp(rx, ry) === SKOG && platser.every(p => p.sort !== 'egen' || Math.abs(p.rx - rx) + Math.abs(p.ry - ry) > 8), 3);
    valj('ruin', A.ruin, (rx, ry) => ruttyp(rx, ry) !== HAV && ruttyp(rx, ry) !== SJO, 3);
    valj('helig', A.helig, (rx, ry) => land(rx, ry) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => ruttyp(rx + dx, ry + dy) === BERG), 3);
    valj('hog', A.hog, land, 3);
    valj('runsten', A.runsten, land, 3);
    // vägarna: varje by till sin närmaste granne, en gång per par
    const byar = platser.filter(p => p.sort === 'egen' || p.sort === 'by'), vagar = [], par = new Set();
    const sammaLand = (a, b) => !(o && o.kontinenter) || delAv(a) === delAv(b);
    for (const a of byar) {
      const b = byar.filter(q => q !== a && sammaLand(a, q)).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[0];
      if (!b) continue;
      const k = [a, b].map(p => p.rx + ',' + p.ry).sort().join('|'); if (!par.has(k)) { par.add(k); vagar.push([a, b]); }
    }
    // vägarna längs marken (o.stigar): den billigaste vägen över land, runt bergen och sjöarna, över floderna på broar
    const stigar = [];
    if (o && o.stigar) {
      const kost = i => { const t = typ[i]; return t === HAV || t === SJO ? 0 : t === BERG ? 14 : elv[i] ? 7 : t === MYR ? 4 : t === SKOG ? 1.8 : 1; };
      const dist = new Float32Array(N), fran = new Int32Array(N);
      for (const [a, b] of vagar) {
        dist.fill(Infinity); const s0 = a.y * W + a.x, mal = b.y * W + b.x; dist[s0] = 0; fran[s0] = -1;
        const hog = [[0, s0]], upp = (k) => { while (k > 0) { const f = (k - 1) >> 1; if (hog[f][0] <= hog[k][0]) break; [hog[f], hog[k]] = [hog[k], hog[f]]; k = f; } };
        const ner = () => { const top = hog[0], sist = hog.pop(); if (hog.length) { hog[0] = sist; let k = 0; for (;;) { const l = 2 * k + 1, rr = l + 1; let m = k; if (l < hog.length && hog[l][0] < hog[m][0]) m = l; if (rr < hog.length && hog[rr][0] < hog[m][0]) m = rr; if (m === k) break; [hog[m], hog[k]] = [hog[k], hog[m]]; k = m; } } return top; };
        while (hog.length) {
          const [d, i] = ner(); if (d > dist[i]) continue; if (i === mal) break;
          const x = i % W, y = (i / W) | 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
            const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            const j = ny * W + nx, k = kost(j); if (!k) continue;
            const nd = d + k * (dx && dy ? 1.41 : 1) + hash(nx, ny, 85) * 0.3; if (nd < dist[j]) { dist[j] = nd; fran[j] = i; hog.push([nd, j]); upp(hog.length - 1); }
          }
        }
        if (dist[mal] === Infinity || dist[mal] > 3.2 * Math.hypot(b.x - a.x, b.y - a.y) + 20) continue; // för långt runt: ingen väg
        const vag = []; for (let i = mal; i >= 0; i = fran[i]) vag.push([i % W, (i / W) | 0]);
        stigar.push(vag.reverse());
      }
    }
    // karavanen: mitt på den längsta vägen, på väg mot byn i andra änden
    let karavan = null;
    if (stigar.length) {
      const v = stigar.reduce((a, b) => (b.length > a.length ? b : a)), k = Math.round(v.length * 0.45), f = v[Math.min(v.length - 1, k + 4)], e = v[Math.max(0, k - 4)];
      karavan = { x: v[k][0], y: v[k][1], hoger: f[0] >= e[0], spar: v.slice(Math.max(0, k - 16), Math.max(0, k - 6)) };
    }
    // sjövägarna: från varje kontinent till den närmaste andra, mellan de två byar som ligger närmast varandra; ett skepp på varje
    const sjovagar = [], skepp = [];
    if (o && o.kontinenter) {
      const sedda = new Set();
      for (const c of kont) {
        let bast = null;
        for (const a of byar) if (delAv(a) === c) for (const b of byar) { const cb = delAv(b); if (cb === c || !kont.includes(cb)) continue; const d = Math.hypot(a.x - b.x, a.y - b.y); if (!bast || d < bast[0]) bast = [d, a, b]; }
        if (!bast) continue;
        const k = [c, delAv(bast[2])].sort().join('|'); if (sedda.has(k)) continue; sedda.add(k);
        const [, a, b] = bast; sjovagar.push([a, b]);
        let mx = -1, mp = null; const n = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) || 1;
        for (let t = 0; t <= n; t++) { const x = Math.round(a.x + (b.x - a.x) * t / n), y = Math.round(a.y + (b.y - a.y) * t / n), i = y * W + x; if (typ[i] === HAV && avst[i] > mx) { mx = avst[i]; mp = [x, y]; } }
        if (mp) skepp.push(mp);
      }
    }
    // havsormen och skeppet: i det djupaste havet
    let djup = 0, djupI = 0; for (let i = 0; i < N; i++) if (typ[i] === HAV && avst[i] > djup && i % W > 40 && i % W < W - 50 && ((i / W) | 0) > 30 && ((i / W) | 0) < H - 35) { djup = avst[i]; djupI = i; }
    const hav = [[djupI % W, (djupI / W) | 0]];
    if (o) { // på ön: tre ställen långt ute i havet men inne på skinnet, långt från varandra
      hav.length = 0;
      const pa = i => { const x = i % W, y = (i / W) | 0; return Math.cbrt((Math.abs(x - W / 2) / (W / 2)) ** 3 + (Math.abs(y - H / 2) / (H / 2)) ** 3) < 0.8; };
      const kand = []; for (let i = 0; i < N; i++) if (typ[i] === HAV && avst[i] > 8 && pa(i)) kand.push([avst[i] + hash(i % W, (i / W) | 0, 12) * 6, i % W, (i / W) | 0]);
      kand.sort((a, b) => b[0] - a[0]);
      for (const [, x, y] of kand) { if (hav.length >= 3) break; if (hav.every(([ax, ay]) => Math.hypot(ax - x, ay - y) > W / 4)) hav.push([x, y]); }
    }
    hav.push(...skepp);
    VARLD = { hojd, typ, elv, avst, stigar, karavan, floder, platser, vagar, sjovagar, djupX: hav[0][0], djupY: hav[0][1], hav, vatten };
    return VARLD;
  }

  // ---------- symbolerna (o = kontur, a = fyllning, b = ljust, c = mörkt) ----------
  const SYM = {
    by: ['...o...', '..oao..', '.oaaao.', 'oaaaaao', '.obcbo.', '.obcbo.', '.ooooo.'],
    egen: ['....o....', '...oao...', '..oaaao..', '.oaaaaao.', 'oaaaaaaao', '.obbcbbo.', '.obbcbbo.', '.ooooooo.'],
    lager: ['...o...', '..oao..', '.oaaco.', 'oaaacco', 'ooooooo'],
    rovare: ['...o...', '..oco..', '.occco.', 'occccco', 'ooooooo'],
    ruin: ['.o...o.', 'oa..oa.', 'oa..oao', 'oaooaao', 'ooooooo'],
    helig: ['..b.b..', '.b...b.', 'b..a..b', '.b...b.', '..b.b..'],
    hog: ['..ooo..', '.oaaao.', 'oaabaao', 'ooooooo'],
    runsten: ['.oo.', 'obao', 'oaao', 'obao', 'oaao', 'oooo'],
    berg: ['...o...', '..obo..', '.obbco.', '.obbcco', 'obbbcco'],
    gran: ['.a.', 'aaa', 'aaa', '.c.'],
    skepp: ['....o....', '...oao...', '..oaaao..', '....o....', 'oo..o..oo', '.oooooo..'],
  };
  const glyf = (B, rader, leg, cx, cy, spegel = false) => {
    const h = rader.length, w = rader[0].length, x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2);
    rader.forEach((r, y) => [...r].forEach((ch, x) => { if (leg[ch] !== undefined) B.satt(x0 + (spegel ? w - 1 - x : x), y0 + y, leg[ch]); }));
  };
  // karavanen på väg (o kontur, b kapellet, p packningen, a vagnen och kläderna, c djuren, d hjulnavet, k ansiktet), vänd åt höger
  const KARAVANER = [
    ['..ooooo.........', '.obbbbbo........', 'obbbbbbbo...o.o.', 'obbbbbbbo.oooooo', 'oaaaaaaaooccccco', 'oaaaaaaao.cccccc', 'ooooooooo.occcoo', '.odo.odo..o.o.o.', '.ooo.ooo..o.o.o.'], // en oxkärra med kapell
    ['..........o.......o', '..ooo....oco.ooo.oc', '.opppo...occopppooc', '.opppocccccoopppoco', '..occcccccco.occcco', '..oo.oo..oo..oo.oo.', '..o..o...o...o..o..'], // två packhästar i rad
    ['...o..........oo', '..oko.......oocco', '..opo.ooo..ooccc.', '.opppoopppooooo..', '..oao.occcccco...', '..oao..oo..oo....', '..o.o..o...o.....'], // en vandrare som leder en packhäst
  ];
  // runorna (yngre futharken, 3 × 5), bara som prydnad och namn
  const RUNOR = [
    ['#.#', '##.', '#.#', '#..', '#..'], ['##.', '#.#', '#.#', '#.#', '#.#'], ['#..', '##.', '#.#', '##.', '#..'],
    ['##.', '#.#', '##.', '#.#', '#.#'], ['#.#', '##.', '#..', '#..', '#..'], ['#.#', '.#.', '###', '.#.', '#.#'],
    ['.#.', '.##', '##.', '.#.', '.#.'], ['.#.', '.#.', '.#.', '.#.', '.#.'], ['..#', '.#.', '#..', '.#.', '..#'],
    ['.#.', '#.#', '.#.', '.#.', '.#.'], ['##.', '#.#', '##.', '#.#', '##.'], ['##.', '#.#', '#..', '#..', '#..'],
  ];
  const runrad = (B, x, y, n, frö, farg, lodratt = false) => {
    for (let k = 0; k < n; k++) {
      const r = RUNOR[Math.floor(hash(k, frö, 33) * RUNOR.length)];
      r.forEach((rad, dy) => [...rad].forEach((ch, dx) => { if (ch === '#') lodratt ? B.satt(x + 4 - dy, y + k * 4 + dx, farg) : B.satt(x + k * 4 + dx, y + dy, farg); }));
    }
  };
  const linje = (B, a, b, f, steg = 1, av = 1) => { const n = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) || 1; for (let t = 0; t <= n; t++) if (t % steg < av) f(Math.round(a.x + (b.x - a.x) * t / n), Math.round(a.y + (b.y - a.y) * t / n)); };
  const ring = (B, cx, cy, r, farg, prickar = false) => { for (let a = 0; a < 64; a++) { if (prickar && a % 4 > 1) continue; B.satt(Math.round(cx + Math.cos(a / 64 * 2 * Math.PI) * r), Math.round(cy + Math.sin(a / 64 * 2 * Math.PI) * r), farg); } };
  const platsLegend = (P, sort, stil) => {
    const ut = { o: stil.kontur, a: stil.by, b: stil.ljus, c: stil.mork };
    if (sort === 'rovare') ut.c = P.i('rost', 0);
    if (sort === 'helig') { ut.b = stil.sten; ut.a = stil.helig; }
    if (sort === 'egen') { ut.a = stil.egen; }
    if (sort === 'ruin' || sort === 'runsten' || sort === 'hog') { ut.a = stil.sten; ut.b = stil.ljus; }
    if (sort === 'lager') { ut.a = stil.talt; ut.c = stil.taltM; }
    return ut;
  };
  // gemensamt för alla stilar: floderna, vägarna, platserna, den egna byns ring och namnen
  function platserna(B, V, stil) {
    const P = B.P;
    for (const [a, b] of V.sjovagar) linje(B, a, b, (x, y) => { const t = V.typ[y * W + x]; if (t === HAV) B.satt(x, y, stil.sjovag); }, 5, 3); // sjövägarna, streckade över havet
    if (V.stigar.length) for (const v of V.stigar) v.forEach(([x, y], k) => { // vägarna längs marken: hela ritade sträck, två punkter breda, med broar över floderna
      const f = v[Math.min(v.length - 1, k + 1)], e = v[Math.max(0, k - 1)], ligg = Math.abs(f[0] - e[0]) >= Math.abs(f[1] - e[1]);
      const bredvid = ligg ? [x, y + 1] : [x + 1, y], vat = (x, y) => V.typ[y * W + x] === HAV || V.typ[y * W + x] === SJO;
      if (V.elv[y * W + x]) { B.satt(x, y, stil.kontur); if (!vat(...bredvid)) B.satt(...bredvid, stil.kontur); }
      else { B.satt(x, y, stil.stig || stil.vag); if (!vat(...bredvid) && !V.elv[bredvid[1] * W + bredvid[0]]) B.satt(...bredvid, stil.stig || stil.vag); }
    });
    else for (const [a, b] of V.vagar) linje(B, a, b, (x, y) => { const i = y * W + x; if (V.typ[i] === HAV || V.typ[i] === SJO) { if ((x + y) % 4 === 0) B.satt(x, y, stil.sjovag); } else B.satt(x, y, stil.vag); }, 3, 1);
    for (const p of V.platser) {
      if (p.sort === 'egen') ring(B, p.x, p.y, 8, stil.ring, true);
      glyf(B, SYM[p.sort], platsLegend(P, p.sort, stil), p.x, p.y);
      if (stil.namn && (p.sort === 'egen' || p.sort === 'by')) runrad(B, p.x - 6, p.y + 6, 3, p.rx * 31 + p.ry, stil.namn);
    }
    const kv = V.karavan;
    if (kv) { const g = KARAVANER[KNR]; glyf(B, g, { o: stil.kontur, b: stil.ljus, p: stil.packe || stil.helig, a: stil.by, c: stil.djur || stil.mork, d: stil.sten, k: stil.ljus }, kv.x, kv.y - Math.floor(g.length / 2) + 1, !kv.hoger); }
  }

  // ---------- version 1: skinnkartan, med bläck på ett spänt skinn ----------
  const skinn = B => skinnRitning(B, false);
  function skinnRitning(B, papper) {
    const P = B.P, V = varld(), cx = W / 2, cy = H / 2;
    const BLACK = P.i('kol', 1), HAVL = P.i('skiffer', 1), EKO = P.i('skiffer', 2);
    const inne = papper ? () => 0 : (x, y) => { const d = (Math.abs(x - cx) / (W / 2 - 3)) ** 3 + (Math.abs(y - cy) / (H / 2 - 3)) ** 3; return Math.cbrt(d) + (fbm(x / 9, y / 9, 77, 2) - 0.5) * 0.14; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = inne(x, y); if (d > 1) continue;
      const i = y * W + x, t = V.typ[i], g = hash(x, y, 3);
      let c = d > 0.95 ? P.i('jord', 1) : d > 0.88 ? P.i('jord', 3) : g < 0.12 ? P.i('ben', 1) : g > 0.94 ? P.i('ben', 3) : P.i('ben', 2);
      if ((t === HAV || t === SJO) && papper) { // på papperet är vattnet målat blått
        const a = V.avst[i];
        c = a > 14 && bayer(x, y) < 0.3 ? P.i('skiffer', 2) : g > 0.985 ? P.i('ben', 3) : P.i('skiffer', 3);
        if (a === 1) c = BLACK;
        else if (a === 3 && t === HAV) c = P.i('skiffer', 2);
        else if (a > 4 && (y + Math.round(Math.sin(x / 3 + y * 0.7) * 1.2)) % 4 === 0 && hash(Math.floor(x / 7), y, 4) > 0.15) c = HAVL;
      } else if (t === HAV || t === SJO) {
        const a = V.avst[i];
        if (a === 1) c = BLACK;
        else if (a === 3 && t === HAV) c = EKO;
        else if (a > 4 && (y + Math.round(Math.sin(x / 3 + y * 0.7) * 1.2)) % (o ? 4 : 5) === 0 && hash(Math.floor(x / 7), y, 4) > (o ? 0.15 : 0.35)) c = HAVL;
      } else if (t === MYR && y % 3 === 0 && (x + y) % 6 < 2) c = P.i('oliv', 1);
      if (V.elv[i]) c = HAVL;
      B.satt(x, y, c);
    }
    // bergen och granarna som små tecken, i ett glest mönster
    for (let gy = 4; gy < H - 4; gy += 6) for (let gx = 4; gx < W - 4; gx += 7) {
      const x = gx + Math.floor(hash(gx, gy, 1) * 4), y = gy + Math.floor(hash(gx, gy, 2) * 3), i = y * W + x;
      if (inne(x, y) > 0.86) continue;
      if (V.typ[i] === BERG) glyf(B, SYM.berg, { o: BLACK, b: P.i('ben', 2), c: P.i('jord', 2) }, x, y);
      else if (V.typ[i] === SKOG && !V.elv[i]) glyf(B, ['..o..', '.o.o.', 'o...o', '..o..'], { o: P.i('barr', 1) }, x, y);
    }
    // havsormen
    const sx = V.djupX - 10, sy = V.djupY;
    for (let k = 0; k < 3; k++) for (let a = 0; a <= 8; a++) { const x = sx + k * 7 + a * 0.6, y = sy - Math.round(Math.sin(a / 8 * Math.PI) * 3); B.satt(Math.round(x), y, BLACK); B.satt(Math.round(x), y + 1, P.i('barr', 2)); }
    glyf(B, ['.oo.', 'oaao', '.oao', '..o.'], { o: BLACK, a: P.i('barr', 2) }, sx + 23, sy - 3);
    for (const [x, y] of V.hav.slice(1)) glyf(B, SYM.skepp, { o: BLACK, a: P.i('ben', 3) }, x, y);
    platserna(B, V, { kontur: BLACK, by: P.i('rost', 1), egen: P.i('rost', 2), ljus: P.i('ben', 3), mork: P.i('jord', 1), sten: P.i('skiffer', 2), helig: P.i('senap', 1), talt: P.i('jord', 2), taltM: P.i('jord', 1), vag: P.i('jord', 1), sjovag: P.i('jord', 1), ring: P.i('rost', 1), namn: BLACK, djur: P.i('jord', 1), stig: P.i('jord', 0), packe: P.i('senap', 2) });
    if (papper) for (const k of [0, 2]) for (let x = k; x < W - k; x++) for (let y = k; y < H - k; y++) if (x === k || y === k || x === W - 1 - k || y === H - 1 - k) B.satt(x, y, BLACK); // en dubbel bläckram
  }

  // ---------- version 2: färgkartan, i spelets färger med en flätad ram ----------
  function farg(B) {
    const P = B.P, V = varld();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, t = V.typ[i], g = hash(x, y, 5), a = V.avst[i];
      let c;
      if (t === HAV) c = a <= 2 ? P.i('skiffer', 2) : a <= 7 ? P.i('skiffer', 1) : a <= 14 ? P.i('barr', 1) : P.i('barr', 0);
      else if (t === SJO) c = a <= 1 ? P.i('skiffer', 2) : P.i('skiffer', 1);
      else if (t === BERG) c = g < 0.2 ? P.i('skiffer', 1) : P.i('skiffer', 2);
      else if (t === SKOG) c = g < 0.25 ? P.i('barr', 1) : P.i('barr', 2);
      else if (t === MYR) c = (x + y * 2) % 5 === 0 ? P.i('skiffer', 1) : g < 0.3 ? P.i('oliv', 1) : P.i('oliv', 2);
      else c = g < 0.15 ? P.i('oliv', 1) : g > 0.9 ? P.i('oliv', 3) : P.i('oliv', 2);
      if (t !== HAV && t !== SJO && V.typ[i - 1] === HAV || t !== HAV && t !== SJO && [1, -1, W, -W].some(d => V.typ[i + d] === HAV)) c = P.i('senap', 2); // stranden
      if ((t === HAV) && a > 3 && g < 0.03) c = P.i('skiffer', 2); // vågor
      if (V.elv[i]) c = P.i('skiffer', 3);
      B.satt(x, y, c);
    }
    for (let gy = 3; gy < H - 3; gy += 5) for (let gx = 3; gx < W - 3; gx += 5) {
      const x = gx + Math.floor(hash(gx, gy, 1) * 3), y = gy + Math.floor(hash(gx, gy, 2) * 3), i = y * W + x;
      if (V.typ[i] === SKOG && !V.elv[i]) glyf(B, SYM.gran, { a: P.i('barr', 3), c: P.i('jord', 0) }, x, y);
    }
    for (let gy = 4; gy < H - 4; gy += 6) for (let gx = 4; gx < W - 4; gx += 7) {
      const x = gx + Math.floor(hash(gx, gy, 1) * 4), y = gy + Math.floor(hash(gx, gy, 2) * 3), i = y * W + x;
      if (V.typ[i] === BERG) glyf(B, ['...b...', '..bbo..', '.oaaco.', '.oaacco', 'oaaacco'], { o: P.i('kol', 1), a: P.i('skiffer', 3), b: P.i('ben', 3), c: P.i('skiffer', 0) }, x, y);
    }
    // rutnätet där en ruta är en bykarta, prickat på land
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x % RUTA === 0 || y % RUTA === 0) && (x + y) % 2 === 0 && V.typ[y * W + x] !== HAV) B.morka(x, y);
    const egen = V.platser.find(p => p.sort === 'egen');
    for (let k = 0; k <= RUTA; k++) for (const [x, y] of [[egen.rx * RUTA + k, egen.ry * RUTA], [egen.rx * RUTA + k, egen.ry * RUTA + RUTA], [egen.rx * RUTA, egen.ry * RUTA + k], [egen.rx * RUTA + RUTA, egen.ry * RUTA + k]]) B.satt(x, y, P.i('senap', 3));
    for (const [x, y] of V.hav) glyf(B, SYM.skepp, { o: P.i('kol', 0), a: P.i('ben', 2) }, x, y);
    platserna(B, V, { kontur: P.i('kol', 0), by: P.i('rost', 2), egen: P.i('senap', 3), ljus: P.i('jord', 3), mork: P.i('jord', 0), sten: P.i('ben', 1), helig: P.i('senap', 2), talt: P.i('jord', 3), taltM: P.i('jord', 1), vag: P.i('jord', 1), sjovag: P.i('ben', 2), ring: P.i('senap', 3), djur: P.i('jord', 1), stig: P.i('jord', 0) });
    // ramen: ett flätat band
    const R = 6;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = Math.min(x, y, W - 1 - x, H - 1 - y); if (k >= R) continue;
      const u = (x + y) % 8, v = (x - y + 800) % 8, ovan = ((Math.floor((x + y) / 8) + Math.floor((x - y + 800) / 8)) % 2) === 0;
      let c = P.i('jord', 0);
      if (k === 0 || k === R - 1) c = P.i('kol', 0);
      else if (u < 2 && (ovan || v >= 2)) c = u === 0 ? P.i('senap', 3) : P.i('senap', 1);
      else if (v < 2) c = v === 0 ? P.i('senap', 2) : P.i('senap', 0);
      B.satt(x, y, c);
    }
  }

  // ---------- version 3: ristad i trä, med ett runband som på en runsten ----------
  function tra(B) {
    const P = B.P, V = varld(), R = 10;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, t = V.typ[i], adr = fbm(x / 60, y / 2.5, 41, 3), vat = t === HAV || t === SJO;
      let c = adr > 0.66 ? P.i('jord', 2) : P.i('jord', 3);
      if (vat) {
        c = adr > 0.66 ? P.i('kol', 2) : P.i('jord', 0);
        if (V.avst[i] > 2 && (y + Math.round(Math.sin(x / 4) * 1.5)) % 6 === 0) c = P.i('jord', 1);
      } else {
        const upp = V.vatten(i - W) || V.vatten(i - 1), ner = V.vatten(i + W) || V.vatten(i + 1);
        if (upp) c = P.i('senap', 3); else if (ner) c = P.i('kol', 1);
        if (t === MYR && (x * 3 + y) % 7 === 0) c = P.i('kol', 2);
      }
      if (V.elv[i]) c = V.elv[i - W] ? P.i('kol', 1) : P.i('kol', 2);
      B.satt(x, y, c);
    }
    for (let gy = 4; gy < H - 4; gy += 6) for (let gx = 4; gx < W - 4; gx += 7) {
      const x = gx + Math.floor(hash(gx, gy, 1) * 4), y = gy + Math.floor(hash(gx, gy, 2) * 3), i = y * W + x;
      if (V.typ[i] === BERG) glyf(B, ['...o...', '..obo..', '.ob.co.', 'ob...co'], { o: P.i('kol', 1), b: P.i('senap', 3), c: P.i('jord', 0) }, x, y);
      else if (V.typ[i] === SKOG && !V.elv[i]) glyf(B, ['.o.', 'o.o', '.o.', '.o.'], { o: P.i('kol', 2) }, x, y);
    }
    if (o) for (const [x, y] of V.hav) glyf(B, SYM.skepp, { o: P.i('kol', 1), a: P.i('jord', 2) }, x, y);
    platserna(B, V, { kontur: P.i('kol', 0), by: P.i('senap', 2), egen: P.i('senap', 3), ljus: P.i('ben', 3), mork: P.i('jord', 0), sten: P.i('ben', 1), helig: P.i('senap', 2), talt: P.i('senap', 1), taltM: P.i('jord', 0), vag: P.i('kol', 2), sjovag: P.i('kol', 2), ring: P.i('senap', 3), namn: P.i('kol', 0), stig: P.i('kol', 1) });
    // runbandet: en orm runt kanten med runor i, huvudet nere till vänster och svansen nere till höger
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = Math.min(x, y, W - 1 - x, H - 1 - y); if (k >= R) continue;
      let c = k === 0 ? P.i('kol', 0) : k === 1 || k === R - 1 ? P.i('kol', 1) : k === 2 || k === R - 2 ? P.i('jord', 3) : P.i('ben', 1);
      B.satt(x, y, c);
    }
    const RUN = P.i('kol', 1);
    const nv = Math.floor((W - 28) / 4), nl = Math.floor((H - 28) / 4) - 1;
    runrad(B, 14, 3, nv, 1, RUN); runrad(B, 14, H - 8, nv, 2, RUN);
    runrad(B, 2, 14, nl, 4, RUN, true); runrad(B, W - 8, 14, nl, 5, RUN, true);
    // en knut i varje hörn
    for (const [x, y] of [[5, 5], [W - 5, 5], [5, H - 5], [W - 5, H - 5]]) glyf(B, ['.ooo.', 'oaoao', 'ooboo', 'oaoao', '.ooo.'], { o: P.i('kol', 0), a: P.i('senap', 2), b: P.i('senap', 3) }, x, y);
  }

  // den vänstra handen: o kontur, 0–3 huden från djup skugga till ljus, n och m nageln; kolumn HAND_KANT är papperets kant.
  // Tummen med nageln och leden ligger på framsidan, pek- och långfingret går runt kanten och handleden snett ut ur bilden.
  const HAND = ["...................................................................", "...................................................................", "...................................................................", "...................................................................", "................................................oooo...............", ".............................................ooo333ooo.............", "............................................o333333333o............", "...........................................o33333332332o...........", "..........................................o3333222222222o..........", "..........................................o3332222222222o..........", "....................oooooo...............o333211111122221o.........", ".................ooo333333..............o333311mmmm112211o.........", "..............ooo333333333.............oo3331nmmmmmm12111o.........", "...........ooo333333332222.............o33321nnnmmmm12111o.........", ".........ooo33333332222222............o33321nnnmmmmm11111o.........", "......ooo33333333222222222...........oo33321nnmmmmmm11111o.........", "...ooo33333333222222222222...........o333221nnmmmmmm1111o..........", ".oo33333333222222222222222..........o3332221nmmmmmmm1111o..........", "o3333333222222222222222222.........o33332221nmmmmmm1111o...........", "33333322222222222222222222.........o33322221mmmmmm11111o...........", "33322222222222222222222222........o3332222221mmm111111o............", "32222222222222222222222222.......o33332222222111221111o............", "22222222222222222222222222......oo3332222222222221111o.............", "22222222222222222222222222......o33322222222222221111o.............", "22222222222222222222222221.....o33322222222222221111o..............", "22222222222222222222222111....oo33322222222222221111o..............", "22222222222222222222211111....o33022222222222221111o...............", "22222222222222222211111111...o333000222222222221111o...............", "2222222222222222111111111o..oo33320000222222221111o................", "2222222222222211111111ooo3..o333222200022222221111o................", "22222222222211111111ooo333.o333222222200022221111o.................", "222222222211111111oo333223o3333222222220000221111o.................", "2222222211111111oo33222222o333222222222220001111o..................", "21111111111111oo322222222o3332222222222222200011o..................", "111111111111oo2222222222o3333222222222222221101o...................", "1111111111oo22222222222oo3332222222222222221111o...................", "oo11111ooo2222222222222o3332222222222222221111o....................", "o3ooooo222222222222222o33322222222222222221111o....................", "333322222222222222222oo3332222222222222221111o.....................", "333222222222222222222o33322222222222222221111o.....................", "33222222222222222222o33322222222222222221111o......................", "3322222222222222222o333322222222222222221111o......................", "3322222222222222222o33322222222222222221111o.......................", "322222222222222222o333222222222222222221111o.......................", "322222222222222222o33322222222222222221111o........................", "22222222222222221oo33222222222222222221111o........................", "22222222222222111o33322222222222222221111o.........................", "2222222222221111oo33222222222222222221111o.........................", "o222211221111111oo3322222222222222221111oo.........................", "oo1111111111111o3o3322222222222222221111oo.........................", "2oo11111111111oo33o32222222222222221111o22o........................", "22ooo111111ooo2o33o22222222222222221111o11o........................", "2222oooooooo222o33o2222222222222221111o221o........................", "22222222222222o3332o222222222222211111o221o........................", "22222222222222o3332o22222122222211111o2211o........................", "22222222222222o33222o211211111111111oo2111o........................", "22222222222222o332222oo111111111111oo22111o........................", "22222222222222o3322222oo111111111oo2222111o........................", "22222222222222o332222222oooo11oooo22222111o........................", "222222222222222o322222222222oo222222221111o........................", "222222222222222o22222222222222222222221111o........................", "222222222222222o22222222222222222222221111o........................", "222222222222222o2222222222222222222221111o.........................", "2222222222222222o222222222222222222221111o.........................", "2222222222222222o22222222222222222221111o..........................", "22222222222222222o2222222222222222211111o..........................", "22222222222222222oo22222222222222211111o...........................", "222222222222222222o2112111222221111111oo...........................", "2222222222222222222o11111111111111111oo............................", "22222222222222222222oo11111111111111oo.............................", "222222222222222222222oo111111111111oo..............................", "22222222222222222222222oo1111111ooo................................", "2222222222222222222222211oooooooo..................................", "222222222222222222222221111........................................", "222222222222222222222221111........................................", "22222222222222222222221111o........................................", "22222222222222222222221111o........................................", "22222222222222222222211111o........................................", "2222222222222222222221111o.........................................", "2222222222222222222211111o.........................................", "222222222222222222211111o..........................................", "22222222222222222221111oo..........................................", "22222222222222222211111o...........................................", "2222222222222222211111oo...........................................", "222222222222222111111oo............................................", "222222222222221111111o.............................................", "12222222222211111111o..............................................", "1111222221111111111o...............................................", "111111111111111111o................................................", "1111111111111111oo.................................................", "111111111111111oo..................................................", "1111111111111ooo...................................................", "ooo111111oooooo....................................................", "22ooooooooo11o.....................................................", "2222222221111o.....................................................", "222222221111o......................................................", "222222221111o......................................................", "22222221111o.......................................................", "2222221111oo.......................................................", "2222221111o........................................................", "222221111o.........................................................", "222221111o........................................................."], HAND_KANT = 26;
  // ---------- kartan på ett riktigt papper som två händer håller ----------
  // stil 'black': skinnkartans bläck direkt på papperet; 'farg': den målade kartan; 'tryck': träkartan tryckt som ett träsnitt.
  // s är skalan på händerna och kanterna. Papperet har vikningar, ett hundöra, gulnade kanter och en fläck.
  function iHander(stil, s) {
    const pm = Math.round(6 * s), sid = 18, topp = 4, botten = 4;
    const PW = W + 2 * pm, PH = H + 2 * pm, BW = PW + 2 * sid, BH = PH + topp + botten, x0 = sid, y0 = topp;
    const rita = B => {
      const P = B.P, pap = new Uint8Array(BW * BH), hud = [P.i('jord', 1), P.i('jord', 2), P.i('jord', 3), P.i('ben', 1)], KONTUR = P.i('kol', 0);
      // marken långt nedanför: mörk skogsbotten
      for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) { const g = hash(x, y, 61); B.satt(x, y, g < 0.05 ? P.i('jord', 0) : g < 0.13 ? P.i('kol', 1) : P.i('kol', 0)); }
      // papperet: ojämna kanter, ett hundöra uppe till höger
      const c = Math.round(11 * s), hundora = (x, y) => { const a = x0 + PW - 1 - x, b = y - y0; return a >= 0 && b >= 0 && a + b < c; };
      const pa = (x, y) => x >= x0 && y >= y0 && x < x0 + PW && y < y0 + PH && !hundora(x, y) && !((x === x0 || y === y0 || x === x0 + PW - 1 || y === y0 + PH - 1) && hash(x, y, 62) < 0.25);
      for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) if (pa(x, y)) { pap[y * BW + x] = 1; if (!pa(x + 2, y + 3)) B.satt(x + 2, y + 3, P.i('kol', 0)); } // skuggan på marken
      for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
        if (!pap[y * BW + x]) continue;
        const g = hash(x, y, 63), k = Math.min(x - x0, y - y0, x0 + PW - 1 - x, y0 + PH - 1 - y);
        let f = g < 0.05 ? P.i('ben', 3) : g > 0.97 ? P.i('ben', 1) : P.i('ben', 2);
        if (k < 4 && bayer(x, y) < (4 - k) / 4 * 0.7) f = P.i('senap', 3); // gulnat längs kanten
        B.satt(x, y, f);
      }
      // kartan
      const M = Bild(W, H, P);
      if (stil === 'black') skinnRitning(M, true); else if (stil === 'farg') farg(M); else tra(M);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const v = M.get(x, y), X = x0 + pm + x, Y = y0 + pm + y; if (v < 0 || !pap[Y * BW + X]) continue;
        if (stil === 'tryck') { // träsnittet: det som är upphöjt i brädan tar färgen, det urskurna blir papper; trycket är lite ojämnt
          const r = v >> 2, t = v & 3;
          if (r === 0 || (r === 1 && t === 0)) { if (hash(X, Y, 64) > 0.06) B.satt(X, Y, P.i('kol', 1)); }
          else if (r === 1 && t === 1) B.satt(X, Y, P.i('ben', 1));
        } else B.satt(X, Y, v);
      }
      // vikningarna: kartan har legat hopvikt i tre delar på bredden och två på höjden
      const vx = [x0 + Math.round(PW / 3), x0 + Math.round(PW * 2 / 3)], vy = y0 + Math.round(PH / 2);
      for (const cx of vx) for (let y = y0; y < y0 + PH; y++) if (pap[y * BW + cx]) { B.morka(cx, y); if (pap[y * BW + cx + 1] && B.get(cx + 1, y) === P.i('ben', 2)) B.satt(cx + 1, y, P.i('ben', 3)); }
      for (let x = x0; x < x0 + PW; x++) if (pap[vy * BW + x]) { B.morka(x, vy); if (B.get(x, vy + 1) === P.i('ben', 2)) B.satt(x, vy + 1, P.i('ben', 3)); }
      for (const cx of vx) for (let d = -2; d <= 2; d++) if (hash(cx, d, 65) < 0.6) B.satt(cx + d, vy + (d & 1), P.i('ben', 1)); // slitet där vikningarna korsas
      // en fläck, en ring som efter en kopp
      const fx = x0 + Math.round(PW * 0.82), fy = y0 + Math.round(PH * 0.8), fr = 7 * s;
      for (let y = fy - fr - 2; y <= fy + fr + 2; y++) for (let x = fx - fr - 2; x <= fx + fr + 2; x++) { const d = Math.hypot(x - fx, y - fy); if (Math.abs(d - fr) < 0.8 && pap[y * BW + x] && hash(x, y, 66) < 0.8) B.morka(x, y); }
      // hundörat: hörnet vikt framåt, papperets baksida syns
      for (let y = y0; y < y0 + c + 1; y++) for (let x = x0 + PW - c - 1; x < x0 + PW; x++) {
        const a = x0 + PW - 1 - x, b = y - y0; if (a > c || b > c || a + b < c) continue;
        B.satt(x, y, a === c || b === c ? P.i('kol', 1) : a + b === c ? P.i('ben', 3) : P.i('ben', 1));
        if (a + b === c && !pap[(y + 1) * BW + x - 1]) B.satt(x - 1, y + 1, P.i('kol', 0));
      }
      // händerna, ritade punkt för punkt (HAND): tummen ligger på framsidan mitt på sidan, fingrarna går runt kanten bakom papperet
      // och handleden går ut ur bilden; den högra handen är den vänstra spegelvänd. Tummen kastar en skugga på papperet.
      const HL = { o: KONTUR, 0: hud[0], 1: hud[1], 2: hud[2], 3: hud[3], n: P.i('ben', 3), m: P.i('ben', 2) };
      const hy = y0 + Math.round(PH / 2) - 40; // tummen mitt på kanten
      for (const dir of [-1, 1]) {
        const ex = dir < 0 ? x0 : x0 + PW - 1, X = k => ex + (k - HAND_KANT) * -dir;
        const pkt = []; HAND.forEach((rad, y) => [...rad].forEach((ch, k) => { if (HL[ch] !== undefined) pkt.push([X(k), hy + y, HL[ch]]); }));
        const har = new Set(pkt.map(([x, y]) => x + ',' + y));
        for (const [x, y] of pkt) if (pap[(y + 2) * BW + x + 1] && !har.has((x + 1) + ',' + (y + 2)) && pap[y * BW + x]) B.morka(x + 1, y + 2);
        for (const [x, y, f] of pkt) B.satt(x, y, f);
      }
    };
    return { w: BW, h: BH, rita };
  }

  // ett utsnitt av bläckkartan på papper runt karavanen, med karavan nummer nr
  const utsnitt = (nr, w, h) => B => {
    const V = varld(), M = Bild(W, H, B.P); KNR = nr; skinnRitning(M, true); KNR = 0;
    const x0 = Math.max(0, Math.min(W - w, V.karavan.x - (w >> 1))), y0 = Math.max(0, Math.min(H - h, V.karavan.y - (h >> 1)));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) B.satt(x, y, M.get(x0 + x, y0 + y));
  };
  return { varld, skinn, farg, tra, iHander, utsnitt };
  }

  const K1 = karta(240, 160, null);
  VAL.push({
    id: 'f11_varldskarta', namn: 'Världskartan', typ: 'tre', stor: true, kol: true,
    vad: 'Steg 11.1.9 (koncept, långt fram): världskartan i fornnordisk stil, inget jordklot. Världen är genererad ur ett frö, som den blir i spelet: hav i väster och söder, berg i nordost, floder från bergen till havet, sjöar, skog och myr. En ruta på kartan (8 × 8 punkter här) är en bykarta. Den egna byn har en ring runt sig, och en flod rinner genom den. Platserna: grannbyarna (hus), läger (tält), ett rövarläger (mörkt tält), ruiner, en helig plats (stenring), en gravhög och en runsten; de prickade linjerna är vägarna mellan byarna. Runorna är bara prydnad och byarnas namn. Samma värld i tre stilar.',
    versioner: [
      { text: 'Version 1: skinnkartan. Ritad med bläck på ett spänt skinn: havet som vågiga streck och en dubbel kustlinje, bergen och granarna som små tecken, en havsorm i havet och byarnas namn i runor.', w: 240, h: 160, kol: true, rita: K1.skinn },
      { text: 'Version 2: färgkartan. I spelets färger: djupt och grunt hav, stränder, skog, myr och berg med snö, ett skepp i havet och en flätad ram. Rutnätet visar bykartorna, och den egna byns ruta har en gul kant.', w: 240, h: 160, kol: true, rita: K1.farg },
      { text: 'Version 3: ristad i trä. Landet är upphöjt och havet urskuret i en bräda, byarna är inlagda i mässing och runt kanten går ett runband med knutar i hörnen, som på en runsten.', w: 240, h: 160, kol: true, rita: K1.tra },
    ],
  });

  // kartorna på papper i händerna (Björn: "gör så alla kartor är riktiga papper och att man ser att händer håller i kartan")
  const PAPPER_TEXT = ['Version 1: bläck på papper. Skinnkartans bläckteckning direkt på papperet, med en dubbel bläckram. Havet och sjöarna är målade blå.', 'Version 2: den målade kartan. Färgkartan med sin flätade ram, målad på papperet.', 'Version 3: tryckt som ett träsnitt. Träkartan tryckt på papperet: det som är upphöjt i brädan blir svart, det urskurna blir papper, och trycket är lite ojämnt.'];
  const PAPPER_VAD = ' Kartan är ett riktigt papper som två stora händer håller mitt på sidorna: tummarna med naglarna ligger på framsidan, fingrarna går runt kanten bakom papperet och handlederna går snett ut ur bilden. Bilden är inzoomad, så att kartan fyller den. Din kommentar förra gången: händerna skulle vara mycket större och hålla mitt på kanterna, inte längst ner. Papperet är vikt i tre delar på bredden och två på höjden, ett hörn har vikts till ett hundöra, kanterna har gulnat och det finns en ring efter en kopp.';
  const papperKort = (id, namn, K, s, vad) => {
    const v = ['black', 'farg', 'tryck'].map((st, k) => { const h = K.iHander(st, s); return { text: PAPPER_TEXT[k], w: h.w, h: h.h, kol: true, rita: h.rita }; });
    VAL.push({ id, namn, typ: 'tre', stor: true, kol: true, vad, karta: K, versioner: v });
  };
  papperKort('f11_varldskarta_papper', 'Världskartan på papper', K1, 1, 'Steg 11.1.9 (koncept, långt fram). Din kommentar: alla kartor ska vara riktiga papper, och man ska se att händer håller i kartan. Här är de första kartorna (kortet Världskartan) på papper; de gamla korten står kvar.' + PAPPER_VAD);

  // den större kartan: en stor ö i mitten med hav runt om, fler byar, läger och platser
  const OW = 384, OH = 256;
  const O2 = { rx: 0.42, ry: 0.4, lyft: 0.27, fall: 0.58, berg: 0.72, floder: 8, antal: { by: 12, lager: 7, rovare: 3, ruin: 5, helig: 2, hog: 3, runsten: 3 } };
  const K2 = karta(OW, OH, O2), K2z = karta(OW, OH, { ...O2, zoom: 1.2, stigar: true }); // K2z: samma ö, inzoomad, med vägar längs marken
  VAL.push({
    id: 'f11_varldskarta_o', namn: 'Världskartan, en stor ö', typ: 'tre', stor: true, kol: true, karta: K2,
    vad: 'Steg 11.1.9 (koncept, långt fram). Din kommentar: kartan ska kännas större, med hav runt den stora ön i mitten; de första kartorna står kvar i kortet ovanför. Här är världen dubbelt så stor åt varje håll som på de första kartorna (en ruta, 8 × 8 punkter, är fortfarande en bykarta): en stor ö med hav runt om och några små öar utanför kusten. Floderna rinner från bergen inne på ön ut i havet. Den egna byn ligger inne på ön med en flod genom byn, och runt den finns tolv grannbyar, sju läger, tre rövarläger, fem ruiner, två heliga platser, tre gravhögar och tre runstenar. Samma tre stilar som förut.',
    versioner: [
      { text: 'Version 1: skinnkartan. Ön ritad med bläck på ett spänt skinn, med en havsorm och skepp ute i havet.', w: OW, h: OH, kol: true, rita: K2.skinn },
      { text: 'Version 2: färgkartan. Ön i spelets färger, med djupt hav runt om, skepp, rutnätet över bykartorna och den flätade ramen.', w: OW, h: OH, kol: true, rita: K2.farg },
      { text: 'Version 3: ristad i trä. Ön upphöjd och havet urskuret i brädan, med inristade skepp och runbandet runt kanten.', w: OW, h: OH, kol: true, rita: K2.tra },
    ],
  });
  papperKort('f11_varldskarta_o_papper', 'Världskartan, en stor ö, på papper', K2z, 1.4, 'Steg 11.1.9 (koncept, långt fram). Din kommentar: alla kartor ska vara riktiga papper, och man ska se att händer håller i kartan. Här är den stora ön (kortet Världskartan, en stor ö) på papper, lite inzoomad så att ön fyller mer av kartan; de gamla korten står kvar. Din kommentar förra gången: gå tillbaka till småbergen och gör vägarna tydligare med ritade sträck, inte prickade. Bergen är åter de små bergen. Vägarna är hela ritade sträck som går längs marken mellan grannbyarna, runt bergen och sjöarna, och över floderna på broar. På den längsta vägen går en karavan mot byn i andra änden (kortet Karavanen på världskartan har tre förslag på karavanen).' + PAPPER_VAD);

  // världen med kontinenter: fyra landmassor med hav emellan, så att det kan finnas båtar; sjövägar mellan kontinenterna
  const KW = 448, KH = 288;
  const K3 = karta(KW, KH, { kontinenter: [[0.24, 0.33, 0.23, 0.28], [0.71, 0.28, 0.24, 0.24], [0.36, 0.77, 0.21, 0.21], [0.82, 0.74, 0.16, 0.21]], lyft: 0.27, fall: 0.58, berg: 0.72, floder: 10, stigar: true, antal: { by: 16, lager: 8, rovare: 3, ruin: 6, helig: 3, hog: 3, runsten: 4 } });
  papperKort('f11_varldskarta_k_papper', 'Världskartan med kontinenter, på papper', K3, 1.4, 'Steg 11.1.9 (koncept, långt fram). Din kommentar: det hade varit kul med kontinenter, så att det kan finnas båtar i spelet. Här är en värld med fyra kontinenter och hav emellan. Varje kontinent har byar och vägar; mellan kontinenterna går sjövägar (de streckade linjerna över havet) från de byar som ligger närmast varandra, och på varje sjöväg seglar ett skepp. Den egna byn ligger på en av kontinenterna med en flod genom byn. Din kommentar förra gången: gå tillbaka till småbergen och gör vägarna tydligare med ritade sträck, inte prickade. Bergen är åter de små bergen. Vägarna är hela ritade sträck som går längs marken mellan grannbyarna, runt bergen och sjöarna, och över floderna på broar. På den längsta vägen går en karavan mot byn i andra änden (kortet Karavanen på världskartan har tre förslag på karavanen).' + PAPPER_VAD);
  // karavanen på väg längs en väg (Björn: "gör en ikon för en karavan som är påväg någonstans"): tre förslag, i ett utsnitt av bläckkartan
  VAL.push({
    id: 'f11_karavan', namn: 'Karavanen på världskartan', typ: 'tre', kol: true,
    vad: 'Steg 11.1.9 (koncept, långt fram). Din kommentar: gör en ikon för en karavan som är på väg någonstans. Karavanen står på den längsta vägen på kartan med kontinenterna, vänd mot byn den är på väg till; i spelet flyttar den sig längs vägen mellan byarna. Här är ett utsnitt av bläckkartan runt karavanen, i kartans egen skala och förstorat; karavanen på de stora kartorna är version 1.',
    versioner: [
      'Version 1: en oxkärra med kapell, dragen av en oxe.',
      'Version 2: två packhästar i rad, med packningen på ryggen.',
      'Version 3: en vandrare med en packe på ryggen som leder en packhäst.',
    ].map((text, k) => ({ text, w: 120, h: 72, kol: true, stor: true, liten: true, rita: K3.utsnitt(k, 120, 72) })),
  });
})();
