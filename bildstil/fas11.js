// fas 11: konceptbilden av världskartan, steg 11.1.9 (Världen och grannbyarna i designdokumentet).
// En liten värld genereras ur ett frö, som i spelet: en stor kontinent i mitten och fyra öar ute vid hörnen, höjd och fukt
// ur brus, floder från bergen till havet, sjöar, skog och myr, och platserna (byarna, läger, rövarläger, ruiner, en helig
// plats, en gravhög och en runsten). En ruta på världskartan (8 × 8 punkter här) är en bykarta; den egna byn har en ring.
// Kartan ritas med bläck på pergament, med ett runt gradnät som samlas i en kompassros, ett runband runt kanten och en
// stämpel, och papperet är lite böjt i kanterna och hålls av två händer. Det är den karta Björn valde; de andra är borttagna.
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
        const fin = o.fin ? (fbm(ux / 10, uy / 10, FRO + 160, 2) - 0.5) * o.fin : 0; // o.fin: en ojämnare kust, så att småöarna inte blir runda
        const lyft = (cx, cy, rx, ry) => { const d = Math.hypot((ux - W * cx) / (W * rx) + vx, (uy - H * cy) / (H * ry) + vy) + fin; return o.lyft - d * d * o.fall; };
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
    const landmassor = kont.map(c => { let sx = 0, sy = 0, n = 0; for (let i = 0; i < N; i++) if (del[i] === c) { sx += i % W; sy += (i / W) | 0; n++; } return { id: c, x: Math.round(sx / n), y: Math.round(sy / n), n }; });
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
    VARLD = { landmassor, del, hojd, typ, elv, avst, stigar, karavan, floder, platser, vagar, sjovagar, djupX: hav[0][0], djupY: hav[0][1], hav, vatten };
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
  function skinnRitning(B, papper, gron = false, ext = {}) {
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
      else if (gron && t === SKOG) { // skogen som en grön yta, tätare inne i skogen och glesare i kanten
        const kant = [1, -1, W, -W, 2, -2, 2 * W, -2 * W].some(d => V.typ[i + d] !== SKOG);
        if (bayer(x, y) < (kant ? 0.35 : 0.8)) c = g < 0.1 ? P.i('oliv', 2) : P.i('oliv', 3);
      }
      if (V.elv[i]) c = HAVL;
      B.satt(x, y, c);
    }
    const NAT = ext.gradnat === 'rund' ? rundNat(V) : ext.gradnat ? gradnat() : null;
    if (NAT) for (const [x, y] of NAT) B.satt(x, y, P.i('jord', 1)); // gradnätet: prickade linjer i brunt bläck över hela kartan
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
    platserna(B, V, { kontur: BLACK, by: P.i('rost', 1), egen: P.i('rost', 2), ljus: P.i('ben', 3), mork: P.i('jord', 1), sten: P.i('skiffer', 2), helig: P.i('senap', 1), talt: P.i('jord', 2), taltM: P.i('jord', 1), vag: P.i('jord', 1), sjovag: P.i('jord', 1), ring: P.i('rost', 1), namn: gron ? null : BLACK, djur: P.i('jord', 1), stig: P.i('jord', 0), packe: P.i('senap', 2) });
    if (ext.gradnat === 'rund') kompassros(B, V, BLACK);
    if (ext.stampel) stampel(B, V);
    if (ext.runband) runband(B, BLACK, ext.gradnat !== 'rund');
    else if (papper) for (const k of [0, 2]) for (let x = k; x < W - k; x++) for (let y = k; y < H - k; y++) if (x === k || y === k || x === W - 1 - k || y === H - 1 - k) B.satt(x, y, BLACK); // en dubbel bläckram
  }
  // gradnätet som på gamla kartor: lodräta och vågräta linjer på lika avstånd, prickade, som går genom hela kartan innanför runbandet
  const GX = 7, GY = 5, gradX = k => Math.round(W * k / (GX + 1)), gradY = k => Math.round(H * k / (GY + 1));
  function gradnat() {
    const ut = [];
    for (let k = 1; k <= GX; k++) for (let y = 10; y < H - 10; y++) if (y % 2 === 0) ut.push([gradX(k), y]);
    for (let k = 1; k <= GY; k++) for (let x = 10; x < W - 10; x++) if (x % 2 === 0) ut.push([x, gradY(k)]);
    return ut;
  }
  // runbandet med bläck: en ram av två bläcklinjer med runor emellan, ett streck där varje linje i gradnätet möter bandet och
  // en knut i varje hörn, som på en runsten
  function runband(B, BLACK, streck = true) {
    const P = B.P, R = 10;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = Math.min(x, y, W - 1 - x, H - 1 - y); if (k >= R) continue;
      const g = hash(x, y, 81);
      B.satt(x, y, k === 0 || k === R - 1 ? BLACK : k === 1 ? P.i('senap', 3) : g < 0.06 ? P.i('ben', 3) : g > 0.97 ? P.i('ben', 1) : P.i('ben', 2));
    }
    const nv = Math.floor((W - 28) / 4), nl = Math.floor((H - 28) / 4) - 1;
    runrad(B, 14, 3, nv, 11, BLACK); runrad(B, 14, H - 8, nv, 12, BLACK);
    runrad(B, 3, 14, nl, 14, BLACK, true); runrad(B, W - 8, 14, nl, 15, BLACK, true);
    if (streck) for (let k = 1; k <= GX; k++) for (const y of [R - 2, H - R + 1]) B.satt(gradX(k), y, BLACK);
    if (streck) for (let k = 1; k <= GY; k++) for (const x of [R - 2, W - R + 1]) B.satt(x, gradY(k), BLACK);
    for (const [x, y] of [[5, 5], [W - 5, 5], [5, H - 5], [W - 5, H - 5]]) glyf(B, ['.ooo.', 'oaoao', 'ooboo', 'oaoao', '.ooo.'], { o: BLACK, a: P.i('rost', 1), b: P.i('ben', 3) }, x, y);
  }

  // en fri plats ute i havet för kompassrosen och stämpeln: minst avstånd d till land, inte nära kanten, skeppen, havsormen
  // eller den andra platsen, och så nära önskade punkten (px, py) som möjligt
  function friHavsplats(V, d, px, py, undan = []) {
    let bast = null;
    for (let y = d + 12; y < H - d - 12; y++) for (let x = d + 12; x < W - d - 12; x++) {
      if (V.typ[y * W + x] !== HAV || V.avst[y * W + x] < d) continue;
      if (V.hav.some(([a, b]) => Math.hypot(a - x, b - y) < d + 8) || (x > V.djupX - 18 - d && x < V.djupX + 20 + d && Math.abs(y - V.djupY) < d + 6)) continue;
      if (undan.some(([a, b, r]) => Math.hypot(a - x, b - y) < r + d + 6)) continue;
      const e = Math.hypot(x - px, y - py); if (!bast || e < bast[2]) bast = [x, y, e];
    }
    return bast || [px, py, 0];
  }
  const ROS = 15;
  const rosPlats = V => V.ros || (V.ros = friHavsplats(V, ROS + 4, W * 0.2, H * 0.22));
  // det runda gradnätet: linjerna böjer sig och samlas i en cirkel runt kompassrosen; runt rosen går cirklar på lika avstånd,
  // och sexton linjer går ut från rosen i en svag båge mot kanten. Prickat, som det raka gradnätet.
  function rundNat(V) {
    const [cx, cy] = rosPlats(V), ut = [], inne = (x, y) => x >= 10 && y >= 10 && x < W - 10 && y < H - 10;
    const maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
    for (let r = ROS + 30; r < maxR; r += 42) { const n = Math.ceil(2 * Math.PI * r * 2); for (let k = 0; k < n; k++) if (Math.floor(k / 2) % 2 === 0) { const a = k / n * 2 * Math.PI, x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r); if (inne(x, y)) ut.push([x, y]); } }
    for (let j = 0; j < 16; j++) for (let t = (ROS + 3) * 2; t < maxR * 2; t++) {
      if (Math.floor(t / 2) % 2) continue;
      const r = t / 2, a = j / 16 * 2 * Math.PI + r / maxR * 0.45, x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r); // bågen: vinkeln växer lite med avståndet
      if (inne(x, y)) ut.push([x, y]);
    }
    return ut;
  }
  // kompassrosen där linjerna samlas: en dubbel ring och en stjärna med åtta uddar, de långa åt väderstrecken, norr i rött
  function kompassros(B, V, BLACK) {
    const P = B.P, [cx, cy] = rosPlats(V), R = ROS, L = R - 2;
    const udd = (x, y) => { // stjärnans uddar: smala trekanter ut från mitten, de långa åt väderstrecken
      const prov = (k, Ls, Wm) => {
        const f = k * Math.PI / 4, fram = x * Math.cos(f) + y * Math.sin(f), tvar = -x * Math.sin(f) + y * Math.cos(f);
        return fram >= -0.5 && fram <= Ls && Math.abs(tvar) <= Wm * (1 - Math.max(0, fram) / Ls) + 0.35 ? { inne: true, ljus: tvar > 0, norr: k === 6, lang: k % 2 === 0 } : null;
      };
      const a = Math.atan2(y, x), lang = ((Math.round(a / (Math.PI / 2)) % 4) + 4) % 4 * 2, kort = ((Math.round((a - Math.PI / 4) / (Math.PI / 2)) % 4) + 4) % 4 * 2 + 1;
      return prov(lang, L, 3) || prov(kort, L * 0.6, 2) || { inne: false }; // de långa uddarna först, de korta emellan
    };
    for (let y = -R - 1; y <= R + 1; y++) for (let x = -R - 1; x <= R + 1; x++) {
      const d = Math.hypot(x, y); if (d > R + 0.5) continue;
      let c = Math.abs(d - R) < 0.5 || Math.abs(d - (R - 3)) < 0.5 ? BLACK : P.i('ben', 2);
      const u = udd(x, y);
      if (u.inne) {
        const kant = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !udd(x + a, y + b).inne);
        c = kant ? BLACK : u.norr ? (u.ljus ? P.i('rost', 2) : P.i('rost', 1)) : u.ljus ? P.i('ben', 3) : u.lang ? P.i('jord', 1) : P.i('jord', 2);
      }
      B.satt(cx + x, cy + y, c);
    }
    glyf(B, ['#.#', '##.', '#.#', '#..', '#..'].map(r => r.replace(/#/g, 'o')), { o: BLACK }, cx, cy - R - 5); // en runa ovanför norr
  }
  // en gammaldags stämpel i rött bläck: två ringar, prickar runt om och en runa i mitten, lite sned och nött där bläcket inte tog
  function stampel(B, V) {
    const P = B.P, R = 15, [cx, cy] = friHavsplats(V, R + 2, W * 0.8, H * 0.82, [[...rosPlats(V).slice(0, 2), ROS]]), BL = P.i('rost', 1);
    const not = (x, y) => hash(x, y, 91) < 0.1 || fbm(x / 4, y / 4, 93, 2) < 0.22; // där bläcket inte tog
    const RUNA = ['##.', '#.#', '##.', '#.#', '#.#'];
    const bit = (x, y) => { // stämpelns mönster, mätt från mitten: två ringar, prickarna mellan dem och runan R dubbelt så stor
      const d = Math.hypot(x, y), a = Math.atan2(y, x);
      if ((d > R - 1.6 && d <= R + 0.4) || Math.abs(d - (R - 5)) < 0.6) return true;
      if (Math.abs(d - (R - 3)) < 0.8 && Math.abs(((a / (Math.PI / 6)) % 1 + 1) % 1 - 0.5) < 0.12) return true;
      const rx = Math.floor((x + 3) / 2), ry = Math.floor((y + 5) / 2);
      return ry >= 0 && ry < 5 && rx >= 0 && rx < 3 && RUNA[ry][rx] === '#';
    };
    const v = -0.25; // stämpeln sitter lite snett
    for (let Y = cy - R - 2; Y <= cy + R + 2; Y++) for (let X = cx - R - 2; X <= cx + R + 2; X++) {
      const dx = X - cx, dy = Y - cy, x = dx * Math.cos(v) + dy * Math.sin(v), y = -dx * Math.sin(v) + dy * Math.cos(v);
      if (bit(x, y) && !not(X, Y)) B.satt(X, Y, BL);
    }
  }

  // den vänstra handen: o kontur, 0–3 huden från djup skugga till ljus, n och m nageln; kolumn HAND_KANT är papperets kant.
  // Tummen med nageln och leden ligger på framsidan, pek- och långfingret går runt kanten och handleden snett ut ur bilden.
  const HAND = ["...................................................................", "...................................................................", "...................................................................", "...................................................................", "................................................oooo...............", ".............................................ooo333ooo.............", "............................................o333333333o............", "...........................................o33333332332o...........", "..........................................o3333222222222o..........", "..........................................o3332222222222o..........", "....................oooooo...............o333211111122221o.........", ".................ooo333333..............o333311mmmm112211o.........", "..............ooo333333333.............oo3331nmmmmmm12111o.........", "...........ooo333333332222.............o33321nnnmmmm12111o.........", ".........ooo33333332222222............o33321nnnmmmmm11111o.........", "......ooo33333333222222222...........oo33321nnmmmmmm11111o.........", "...ooo33333333222222222222...........o333221nnmmmmmm1111o..........", ".oo33333333222222222222222..........o3332221nmmmmmmm1111o..........", "o3333333222222222222222222.........o33332221nmmmmmm1111o...........", "33333322222222222222222222.........o33322221mmmmmm11111o...........", "33322222222222222222222222........o3332222221mmm111111o............", "32222222222222222222222222.......o33332222222111221111o............", "22222222222222222222222222......oo3332222222222221111o.............", "22222222222222222222222222......o33322222222222221111o.............", "22222222222222222222222221.....o33322222222222221111o..............", "22222222222222222222222111....oo33322222222222221111o..............", "22222222222222222222211111....o33022222222222221111o...............", "22222222222222222211111111...o333000222222222221111o...............", "2222222222222222111111111o..oo33320000222222221111o................", "2222222222222211111111ooo3..o333222200022222221111o................", "22222222222211111111ooo333.o333222222200022221111o.................", "222222222211111111oo333223o3333222222220000221111o.................", "2222222211111111oo33222222o333222222222220001111o..................", "21111111111111oo322222222o3332222222222222200011o..................", "111111111111oo2222222222o3333222222222222221101o...................", "1111111111oo22222222222oo3332222222222222221111o...................", "oo11111ooo2222222222222o3332222222222222221111o....................", "o3ooooo222222222222222o33322222222222222221111o....................", "333322222222222222222oo3332222222222222221111o.....................", "333222222222222222222o33322222222222222221111o.....................", "33222222222222222222o33322222222222222221111o......................", "3322222222222222222o333322222222222222221111o......................", "3322222222222222222o33322222222222222221111o.......................", "322222222222222222o333222222222222222221111o.......................", "322222222222222222o33322222222222222221111o........................", "22222222222222221oo33222222222222222221111o........................", "22222222222222111o33322222222222222221111o.........................", "2222222222221111oo33222222222222222221111o.........................", "o222211221111111oo3322222222222222221111oo.........................", "oo1111111111111o3o3322222222222222221111oo.........................", "2oo11111111111oo33o32222222222222221111o22o........................", "22ooo111111ooo2o33o22222222222222221111o11o........................", "2222oooooooo222o33o2222222222222221111o221o........................", "22222222222222o3332o222222222222211111o221o........................", "22222222222222o3332o22222122222211111o2211o........................", "22222222222222o33222o211211111111111oo2111o........................", "22222222222222o332222oo111111111111oo22111o........................", "22222222222222o3322222oo111111111oo2222111o........................", "22222222222222o332222222oooo11oooo22222111o........................", "222222222222222o322222222222oo222222221111o........................", "222222222222222o22222222222222222222221111o........................", "222222222222222o22222222222222222222221111o........................", "222222222222222o2222222222222222222221111o.........................", "2222222222222222o222222222222222222221111o.........................", "2222222222222222o22222222222222222221111o..........................", "22222222222222222o2222222222222222211111o..........................", "22222222222222222oo22222222222222211111o...........................", "222222222222222222o2112111222221111111oo...........................", "2222222222222222222o11111111111111111oo............................", "22222222222222222222oo11111111111111oo.............................", "222222222222222222222oo111111111111oo..............................", "22222222222222222222222oo1111111ooo................................", "2222222222222222222222211oooooooo..................................", "222222222222222222222221111........................................", "222222222222222222222221111........................................", "22222222222222222222221111o........................................", "22222222222222222222221111o........................................", "22222222222222222222211111o........................................", "2222222222222222222221111o.........................................", "2222222222222222222211111o.........................................", "222222222222222222211111o..........................................", "22222222222222222221111oo..........................................", "22222222222222222211111o...........................................", "2222222222222222211111oo...........................................", "222222222222222111111oo............................................", "222222222222221111111o.............................................", "12222222222211111111o..............................................", "1111222221111111111o...............................................", "111111111111111111o................................................", "1111111111111111oo.................................................", "111111111111111oo..................................................", "1111111111111ooo...................................................", "ooo111111oooooo....................................................", "22ooooooooo11o.....................................................", "2222222221111o.....................................................", "222222221111o......................................................", "222222221111o......................................................", "22222221111o.......................................................", "2222221111oo.......................................................", "2222221111o........................................................", "222221111o.........................................................", "222221111o........................................................."], HAND_KANT = 26;
  // kartan i stilen stil, med övre vänstra hörnet i (X0, Y0), där papperet finns (pap); ny: gröna skogar och blått vatten
  function kartanPa(B, stil, X0, Y0, pap, BW, ny, ext = {}) {
    const P = B.P, M = Bild(W, H, P);
    skinnRitning(M, true, ny, ext);
    if (ny) namnen(M, stil);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = M.get(x, y), X = X0 + x, Y = Y0 + y; if (v < 0 || !pap[Y * BW + X]) continue;
      B.satt(X, Y, v);
    }
  }
  // händerna, ritade punkt för punkt (HAND): tummen ligger på framsidan, fingrarna går runt kanten bakom och handleden går ut
  // ur bilden; den högra handen är den vänstra spegelvänd. exV och exH är kanterna händerna håller i, hy handens översta rad.
  // Tummen kastar en skugga på papperet.
  function handerna(B, pap, BW, exV, exH, hy) {
    const P = B.P, hud = [P.i('jord', 1), P.i('jord', 2), P.i('jord', 3), P.i('ben', 1)];
    const HL = { o: P.i('kol', 0), 0: hud[0], 1: hud[1], 2: hud[2], 3: hud[3], n: P.i('ben', 3), m: P.i('ben', 2) };
    for (const dir of [-1, 1]) {
      const ex = dir < 0 ? exV : exH, X = k => ex + (k - HAND_KANT) * -dir;
      const pkt = []; HAND.forEach((rad, y) => [...rad].forEach((ch, k) => { if (HL[ch] !== undefined) pkt.push([X(k), hy + y, HL[ch]]); }));
      const har = new Set(pkt.map(([x, y]) => x + ',' + y));
      for (const [x, y] of pkt) if (pap[(y + 2) * BW + x + 1] && !har.has((x + 1) + ',' + (y + 2)) && pap[y * BW + x]) B.morka(x + 1, y + 2);
      for (const [x, y, f] of pkt) B.satt(x, y, f);
    }
  }

  // ---------- namnen på kartan: påhittade namn vid byarna och på de stora landmassorna ----------
  // en liten bokstavsstil, 3 × 5 punkter (M och N är bredare); prickarna och ringen över Å, Ä och Ö står två rader ovanför
  const BOKST = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
    E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'], G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
    I: ['###', '.#.', '.#.', '.#.', '###'], J: ['..#', '..#', '..#', '#.#', '.#.'], K: ['#.#', '##.', '#..', '##.', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
    M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'],
    R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'], U: ['#.#', '#.#', '#.#', '#.#', '###'],
    V: ['#.#', '#.#', '#.#', '.#.', '.#.'], Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  };
  const OVER = { Å: ['A', '.#.'], Ä: ['A', '#.#'], Ö: ['O', '#.#'] };
  // punkterna i ett namn med övre vänstra hörnet i (x, y), i skalan k
  const namnPunkter = (namn, x, y, k = 1) => {
    const ut = []; let px = x;
    for (const ch of namn) {
      const [bas, over] = OVER[ch] || [ch, null], g = BOKST[bas]; if (!g) continue;
      const rader = over ? [over, '...', ...g] : ['...', '...', ...g];
      rader.forEach((rad, dy) => [...rad].forEach((c, dx) => { if (c === '#') for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) ut.push([px + dx * k + a, y + (dy - 2) * k + b]); }));
      px += (g[0].length + 1) * k;
    }
    return ut;
  };
  const namnBredd = (namn, k = 1) => [...namn].reduce((s, ch) => s + ((BOKST[(OVER[ch] || [ch])[0]] || ['...'])[0].length + 1) * k, 0) - k;
  const NAMN_FORE = ['ULV', 'BJÖRK', 'HJORT', 'ASK', 'STEN', 'KRÅK', 'ÖRN', 'EK', 'LIND', 'RAVN', 'TOR', 'HAM', 'GRIM', 'ODD', 'HAG', 'SVAL', 'TING', 'BRO', 'GRAN', 'HÄLL', 'MYR', 'SAND', 'VARG', 'FALK', 'LÖV', 'HED', 'FRÖ', 'ALV', 'SKOG', 'BÄCK'];
  const NAMN_EFTER = ['BY', 'VIK', 'STA', 'HEM', 'HOLM', 'NÄS', 'TORP', 'DAL', 'RUM', 'INGE', 'MARK', 'ÅS', 'BODA', 'LÖSA'];
  const LANDNAMN = ['ULVALAND', 'SOLMARK', 'GRANRIKE', 'ISHEIM', 'RAVNMARK', 'ASKLAND'];
  // färgerna per stil: namnen vid byarna (text, kant) och landets namn (stor, storKant)
  function namnen(M, stil) {
    const P = M.P, V = varld(), m = 12;
    const F = stil === 'black' ? { text: P.i('kol', 1), kant: P.i('ben', 3), stor: P.i('rost', 1), storKant: P.i('ben', 3) }
      : stil === 'farg' ? { text: P.i('ben', 3), kant: P.i('kol', 0), stor: P.i('senap', 3), storKant: P.i('kol', 0) }
      : { text: P.i('kol', 0), kant: P.i('ben', 2), stor: P.i('kol', 0), storKant: P.i('ben', 2) };
    const upptagen = V.platser.map(p => [p.x - 6, p.y - 5, p.x + 6, p.y + 5]);
    const ledig = ([a, b, c, d]) => a >= m && b >= m - 2 && c < W - m && d < H - m + 2 && upptagen.every(([e, f, g, h]) => c < e - 1 || a > g + 1 || d < f - 1 || b > h + 1);
    const skriv = (namn, x, y, k, text, kant) => {
      const pk = namnPunkter(namn, x, y, k), har = new Set(pk.map(([a, b]) => a + ',' + b));
      for (const [a, b] of pk) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) if (!har.has((a + dx) + ',' + (b + dy))) M.satt(a + dx, b + dy, kant);
      for (const [a, b] of pk) M.satt(a, b, text);
    };
    // landets namn, stort, nära mitten av landet där det är land under och inga platser i vägen; bara på land som är
    // en ö eller en kontinent, inte på land som fortsätter utanför kartan
    const kanten = new Set(); for (let x = 0; x < W; x++) kanten.add(V.del[x]).add(V.del[(H - 1) * W + x]); for (let y = 0; y < H; y++) kanten.add(V.del[y * W]).add(V.del[y * W + W - 1]);
    V.landmassor.filter(l => !kanten.has(l.id)).forEach((l, n) => {
      const namn = LANDNAMN[(n + Math.floor(hash(W, H, 72) * LANDNAMN.length)) % LANDNAMN.length], bw = namnBredd(namn, 2);
      let bast = null;
      for (let dy = -40; dy <= 40; dy += 3) for (let dx = -50; dx <= 50; dx += 4) {
        const x = l.x + dx - (bw >> 1), y = l.y + dy, rekt = [x - 4, y - 6, x + bw + 3, y + 12];
        if (!ledig(rekt)) continue;
        let land = 0; for (let k = 0; k < 9; k++) { const px = x + Math.round(bw * k / 8), py = y + 4; if (V.del[py * W + px] === l.id) land++; }
        if (land < 9) continue;
        const d = Math.hypot(dx, dy * 1.5); if (!bast || d < bast[0]) bast = [d, x, y, rekt];
      }
      if (!bast) return;
      skriv(namn, bast[1], bast[2], 2, F.stor, F.storKant); upptagen.push(bast[3]);
    });
    // byarnas namn: under byn, annars ovanför, till höger eller till vänster
    const tagna = new Set();
    for (const p of V.platser.filter(p => p.sort === 'egen' || p.sort === 'by')) {
      let namn, f = 0;
      do { const h = hash(p.rx + f, p.ry, 71), g = hash(p.rx, p.ry + f, 73); namn = NAMN_FORE[Math.floor(h * NAMN_FORE.length)] + NAMN_EFTER[Math.floor(g * NAMN_EFTER.length)]; f++; } while ((tagna.has(namn) || namn.length > 8) && f < 50);
      tagna.add(namn);
      const bw = namnBredd(namn);
      const forslag = [[p.x - (bw >> 1), p.y + 7], [p.x - (bw >> 1), p.y - 11], [p.x + 7, p.y - 2], [p.x - 7 - bw, p.y - 2]].map(([x, y]) => [x, y, [x - 2, y - 4, x + bw + 1, y + 6]]);
      const [x, y, rekt] = forslag.find(([, , rk]) => ledig(rk)) || forslag[0];
      skriv(namn, x, y, 1, F.text, F.kant); upptagen.push(rekt);
    }
  }

  // hur långt tummen når innanför papperets kant
  const TUMME = Math.max(...HAND.map(rad => rad.replace(/\.+$/, '').length)) - HAND_KANT;
  // ---------- kartan utrullad och lite böjd i kanterna, som två händer håller ----------
  // Kartan ligger nästan plant; bara sidorna böjer sig lite upp mot betraktaren, så att man ser att den brukar vara ihoprullad.
  // Där kanten böjer sig blir papperet lite bredare (närmare ögat), krönet är ljust och baksidan syns som en smal rand.
  // Händerna håller i sidorna med tummen på runbandet.
  function iBojd(stil, s, ext = {}) {
    const pm = Math.round(6 * s), c = Math.round(7 * s), lyft = 4, sid = 18;
    const mx = Math.max(pm, TUMME - 10);
    const PW = W + 2 * mx, PH = H + 2 * pm, BW = PW + 2 * sid, BH = PH + 2 * lyft + 10, x0 = sid, y0 = lyft + 5;
    const kantAv = x => Math.min(x - x0, x0 + PW - 1 - x), hojning = x => { const d = kantAv(x); return d < c ? Math.round(((c - d) / c) ** 2 * lyft) : 0; };
    const rita = B => {
      const P = B.P, pap = new Uint8Array(BW * BH);
      for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) { const g = hash(x, y, 61); B.satt(x, y, g < 0.05 ? P.i('jord', 0) : g < 0.13 ? P.i('kol', 1) : P.i('kol', 0)); }
      const pa = (x, y) => { if (x < x0 || x >= x0 + PW) return false; const h = hojning(x); return y >= y0 - h && y <= y0 + PH - 1 + h && !((y === y0 - h || y === y0 + PH - 1 + h) && kantAv(x) >= c && hash(x, y, 62) < 0.3); };
      for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) if (pa(x, y)) { pap[y * BW + x] = 1; const k = kantAv(x) < c ? 4 : 3; if (!pa(x + 2, y + k)) B.satt(x + 2, y + k, P.i('kol', 0)); } // skuggan på marken, längre där kanten lyfter
      for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
        if (!pap[y * BW + x]) continue;
        const g = hash(x, y, 63), h = hojning(x), k = Math.min(y - (y0 - h), y0 + PH - 1 + h - y), f = fbm(x / 18, y / 18, 91, 3), d = kantAv(x), hoger = x > x0 + PW / 2;
        let col = g < 0.05 ? P.i('ben', 3) : g > 0.97 ? P.i('ben', 1) : P.i('ben', 2);
        if (bayer(x, y) < (f - 0.5) * 1.6 || (k < 4 && bayer(x, y) < (4 - k) / 4 * 0.7)) col = P.i('senap', 3);
        if (d < c) { // den böjda kanten: baksidan som en smal rand, ett ljust krön och skugga in mot det plana
          const t = d / c; // 0 vid kanten, 1 där böjen börjar
          col = d === 0 ? P.i('jord', 1) : d === 1 ? P.i('ben', 1) : t < 0.4 ? (hoger ? P.i('ben', 2) : P.i('ben', 3)) : t < 0.65 ? (hoger && bayer(x, y) < 0.5 ? P.i('ben', 1) : P.i('ben', 2)) : bayer(x, y) < (hoger ? 0.75 : 0.45) ? P.i('ben', 1) : P.i('ben', 2);
          if (k === 0) col = P.i('jord', 1);
        }
        B.satt(x, y, col);
      }
      for (let y = y0; y < y0 + PH; y++) for (const x of [x0 + c, x0 + PW - 1 - c]) if (bayer(x, y) < 0.5) B.morka(x, y); // där böjen börjar
      kartanPa(B, stil, x0 + mx, y0 + pm, pap, BW, true, ext);
      handerna(B, pap, BW, x0, x0 + PW - 1, y0 + Math.round(PH / 2) - 40);
    };
    return { w: BW, h: BH, rita };
  }

  // ett utsnitt av bläckkartan på papper runt karavanen, med karavan nummer nr
  const utsnitt = (nr, w, h) => B => {
    const V = varld(), M = Bild(W, H, B.P); KNR = nr; skinnRitning(M, true); KNR = 0;
    const x0 = Math.max(0, Math.min(W - w, V.karavan.x - (w >> 1))), y0 = Math.max(0, Math.min(H - h, V.karavan.y - (h >> 1)));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) B.satt(x, y, M.get(x0 + x, y0 + y));
  };
  return { varld, iBojd, utsnitt };
  }

  // världskartan som den ska se ut: bläck på pergament, en stor kontinent i mitten med fyra öar ute vid hörnen, ett runt gradnät
  // som samlas i en kompassros, ett runband runt kanten och en gammaldags stämpel; papperet är lite böjt i kanterna
  const KW = 448, KH = 288;
  const K5 = karta(KW, KH, { kontinenter: [[0.5, 0.5, 0.4, 0.42], [0.09, 0.14, 0.035, 0.05], [0.92, 0.85, 0.04, 0.06], [0.08, 0.84, 0.03, 0.05], [0.91, 0.17, 0.03, 0.045]], fin: 0.15, lyft: 0.27, fall: 0.58, berg: 0.72, floder: 10, stigar: true, antal: { by: 16, lager: 7, rovare: 3, ruin: 5, helig: 2, hog: 3, runsten: 3 } });
  // version 1 som ligger nästan plant och bara är böjd i kanterna, med ett runt gradnät som samlas i en kompassros och en
  // gammaldags stämpel (Björn: "kartan bara är lite böjd i kanterna", "kordinatsträcken är kurvade och samlas i en cirkel",
  // "gör en gammaldags stämpel någon stans på kartan")
  const R6 = K5.iBojd('black', 1.4, { gradnat: 'rund', runband: true, stampel: true });
  VAL.push({
    id: 'f11_varldskarta_v1_bojd', namn: 'Världskartan böjd i kanterna, med kompassros och stämpel', typ: 'janej', stor: true, kol: true, karta: K5,
    vad: 'Steg 11.1.9 (koncept, långt fram). Din kommentar: pröva att kartan bara är lite böjd i kanterna, för att visa att den brukar vara ihoprullad; gör koordinatstrecken kurvade så att de samlas i en cirkel någonstans på kartan; gör en gammaldags stämpel någonstans på kartan. Här ligger kartan nästan plant, och bara sidorna böjer sig lite upp: papperet blir lite bredare där, krönet är ljust och baksidan syns som en smal rand. Strecken är cirklar runt en kompassros ute i havet, och sexton linjer går ut från rosen i en svag båge mot kanten. Rosen har åtta uddar, norr i rött. Stämpeln är röd, lite sned och nött, med två ringar, prickar och runan R i mitten. Samma karta som i kortet ovanför; det kortet står kvar.',
    versioner: [{ text: 'Bläck på pergament, böjd i kanterna, med kompassros, runt gradnät och stämpel.', w: R6.w, h: R6.h, kol: true, rita: R6.rita }],
  });
  // karavanen på väg längs en väg (Björn: "gör en ikon för en karavan som är påväg någonstans"): tre förslag, i ett utsnitt av bläckkartan
  VAL.push({
    id: 'f11_karavan', namn: 'Karavanen på världskartan', typ: 'tre', kol: true,
    vad: 'Steg 11.1.9 (koncept, långt fram). Din kommentar: gör en ikon för en karavan som är på väg någonstans. Karavanen står på den längsta vägen på världskartan, vänd mot byn den är på väg till; i spelet flyttar den sig längs vägen mellan byarna. Här är ett utsnitt av bläckkartan runt karavanen, i kartans egen skala och förstorat; karavanen på de stora kartorna är version 1.',
    versioner: [
      'Version 1: en oxkärra med kapell, dragen av en oxe.',
      'Version 2: två packhästar i rad, med packningen på ryggen.',
      'Version 3: en vandrare med en packe på ryggen som leder en packhäst.',
    ].map((text, k) => ({ text, w: 120, h: 72, kol: true, stor: true, liten: true, rita: K5.utsnitt(k, 120, 72) })),
  });
})();
