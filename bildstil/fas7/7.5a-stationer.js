// 7.5: stenhuggarplatsen och klyvplatsen (7.5.1) med det de gör, huggen sten och plankor, härden inne i huset (7.5.3)
// och leksakerna (7.5.4). Tre versioner av varje, i paletten och 16 punkter per ruta. Stationerna ritas som de godkända
// (slöjdbänken, slaktbänken, grillen): framifrån och lite ovanifrån, på gräset, med skugga under.
(() => {
  const { hash, KORT, former, ell, linje, tri, poly, och, utan, punkt, rakt, lagg, PA_MARK, PA_RAD, bildfil, gras } = window.F7;
  // en bokstav per ramp och ton (0 mörkast, 3 ljusast); 'o' är konturen
  const L = {
    a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3', e: 'senap0', f: 'senap1', g: 'senap2', h: 'senap3',
    r: 'rost0', s: 'rost1', t: 'rost2', u: 'rost3', v: 'ben0', w: 'ben1', x: 'ben2', y: 'ben3',
    K: 'kol1', l: 'kol2', m: 'kol3', Q: 'skiffer0', R: 'skiffer1', S: 'skiffer2', T: 'skiffer3',
    i: 'oliv0', j: 'oliv1', n: 'oliv2', p: 'oliv3', A: 'barr0', C: 'barr1', D: 'barr2', E: 'barr3',
  };
  const SK = ['Q', 'R', 'S', 'T'], JO = ['a', 'b', 'c', 'd'], BE = ['v', 'w', 'x', 'y'];
  const sp = (B, rader, x, y, skugga = true) => lagg(B, rader, L, x, y, skugga);
  const fx = Math.floor;
  const S = 'Steg ';

  // ---------- delarna ----------
  // en rå sten: rund, ljus uppe till vänster
  const rasten = (w, h, s = 0, R = SK) => former(w + 2, h + 2, [[ell(1 + w / 2, 1 + h / 2, w / 2, h / 2), (x, y) => {
    const u = (x - 1) / w * 0.7 + (y - 1) / h; if (hash(fx(x), fx(y), s) < 0.07) return R[1];
    return u < 0.5 ? R[3] : u < 1.0 ? R[2] : u < 1.35 ? R[1] : R[0];
  }]]);
  // en halvhuggen sten: rund till vänster, med en rak och ljus snittyta till höger
  const halvhuggen = (w, h, snitt, s = 0, R = SK) => former(w + 2, h + 2, [[utan(ell(1 + w / 2, 1 + h / 2, w / 2, h / 2), rakt(1 + snitt + 1, 0, 99, 99)), (x, y) => {
    if (x >= 1 + snitt) return y < 1 + h * 0.35 ? R[3] : R[2];
    const u = (x - 1) / w * 0.7 + (y - 1) / h; if (hash(fx(x), fx(y), s) < 0.07) return R[1];
    return u < 0.5 ? R[3] : u < 0.95 ? R[2] : u < 1.3 ? R[1] : R[0];
  }]]);
  // ett huggit block: ljus ovansida (tp rader), framsida i mellanton, högerkanten mörk och några mejselmärken
  const block = (w, h, tp, R = SK, s = 3) => former(w + 2, h + 2, [[rakt(1, 1, w + 1, h + 1), (x, y) => {
    if (y < 1 + tp) return x >= w ? R[2] : R[3];
    if (x >= w) return R[1];
    return hash(fx(x), fx(y), s) < 0.12 ? R[1] : R[2];
  }]]);
  // en planka sedd snett ovanifrån: ovansidan med ådring, kanten under och den ljusa ändan till höger
  const planka = (len, h = 2, s = 0) => former(len + 2, h + 3, [
    [rakt(1, 1, len + 1, h + 1), (x, y) => hash(fx(x / 3), fx(y), s) < 0.22 ? 'c' : 'd'],
    [rakt(1, h + 1, len + 1, h + 2), 'b'],
    [rakt(len, 1, len + 1, h + 2), (x, y) => y < h + 1 ? 'x' : 'w'],
  ]);
  // en stock som ligger: rund (ljus överkant, mörk underkant), barkfläckar och en ljus ända med årsringar till höger
  const stock = (len, d, s = 0, spricka = false) => former(len + 3, d + 2, [
    [rakt(1, 1, len + 1, d + 1), (x, y) => {
      const u = (y - 1) / d; if (spricka && fx(y) === 1 + fx(d * 0.4)) return 'a';
      if (hash(fx(x / 2), fx(y), s) < 0.1) return 'a';
      return u < 0.25 ? 'd' : u < 0.6 ? 'c' : u < 0.85 ? 'b' : 'a';
    }],
    [ell(len + 1, 1 + d / 2, 1.6, d / 2), (x, y) => Math.hypot((x - len - 1) * 2, (y - 1 - d / 2)) < 1.4 ? 'w' : 'x'],
  ]);
  // en kil av trä, spetsen nedåt
  const KIL = ['dc', 'dc', 'c.'];
  // en träklubba som ligger: huvudet till vänster och skaftet åt höger
  const klubba = former(12, 6, [[rakt(1, 1, 5, 5), (x, y) => y < 2 ? 'd' : x > 4 ? 'b' : 'c'], [rakt(5, 2.6, 11, 3.6), 'b']]);
  // en bänk: en planka på två ben, som slöjdbänken
  const bank = (len, hojd = 4, s = 0) => former(len + 2, hojd + 6, [
    [rakt(1, 1, len + 1, 3), (x, y) => hash(fx(x / 3), fx(y), s) < 0.25 ? 'c' : 'd'],
    [rakt(1, 3, len + 1, 4), 'b'],
    [och(rakt(2, 4, 4, 5 + hojd), rakt(len - 2, 4, len, 5 + hojd)), (x) => fx(x) % 2 ? 'a' : 'b'],
  ]);
  // stenflisor på marken runt en punkt
  const flisor = (B, cx, cy, rx, ry, n, s) => {
    for (let i = 0; i < n; i++) {
      const a = hash(i, s, 1) * Math.PI * 2, d = Math.sqrt(hash(i, s, 2));
      B.satt(Math.round(cx + Math.cos(a) * rx * d), Math.round(cy + Math.sin(a) * ry * d), B.P.i('skiffer', hash(i, s, 3) < 0.5 ? 2 : 3));
    }
  };
  // en liten låga med foten i (x, y), som i fas6.js
  function laga(B, x, y, hojd = 5) {
    for (let i = 0; i < hojd; i++) {
      const [ramp, ton] = i === 0 ? ['ben', 3] : i < hojd - 2 ? ['senap', 3 - (i > 2)] : ['rost', 2];
      B.satt(x, y - i, B.P.i(ramp, ton), true);
      if (i > 0 && i < hojd - 2) B.satt(x + (i % 2 ? -1 : 1), y - i, B.P.i('senap', 2), true);
    }
  }
  // glöd: röda och gula punkter som lyser
  const glod = (B, x0, y0, w, h, s) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const r = hash(x, y, s); B.satt(x, y, r < 0.25 ? B.P.i('kol', 1) : r < 0.6 ? B.P.i('rost', 1) : r < 0.85 ? B.P.i('rost', 2) : B.P.i('senap', 3), r >= 0.25); } };
  // elden i en härd: grå aska, två vedträn i kryss och glöd mellan dem (lågorna läggs ovanpå)
  const eld = (B, x0, y0, w, h, s) => {
    const P = B.P, cx = x0 + w / 2, cy = y0 + h / 2;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) B.satt(x, y, P.i('kol', hash(x, y, s) < 0.3 ? 2 : hash(x, y, s + 1) < 0.15 ? 3 : 1));
    for (let i = -w / 2 + 1; i < w / 2 - 1; i++) { const t = i / (w / 2); B.satt(Math.round(cx + i), Math.round(cy + t * h * 0.3), P.i('jord', 1)); B.satt(Math.round(cx + i), Math.round(cy - t * h * 0.3), P.i('jord', 2)); }
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const d = Math.hypot((x - cx) / w, (y - cy) / h); if (d < 0.32 && hash(x, y, s + 2) < 0.55) B.satt(x, y, P.i(d < 0.15 ? 'senap' : 'rost', d < 0.15 ? 3 : 2), true); }
  };
  // en människa på kartan, för skalan
  const bybo = (B, x0, fot, rikt = 'sida', arm = 'hanga') => {
    if (!window.BYBO) return;
    const F = window.BYBO(4242, rikt, 'sta', arm);
    for (let y = 0; y < F.h; y++) for (let dx = 0; dx < F.w; dx++) { const c = F.px[y * F.w + dx]; if (c >= 0) B.satt(x0 + dx, fot - F.h + y, c); }
    for (let dx = 0; dx < F.w; dx++) B.morka(x0 + dx, fot);
  };

  // ---------- 7.5.1 stenhuggarplatsen ----------
  function stenhuggare(B, v) {
    gras(B);
    if (v === 0) { // en stubbe att sitta på, ett stort block att hugga på och halvhuggna stenar
      window.MARK.stubbe(B, 9, 24, 9, 'gran', 0);
      flisor(B, 26, 25, 13, 4, 26, 11);
      sp(B, rasten(14, 9, 2), 16, 14); // huggblocket
      sp(B, block(5, 4, 2), 20, 11, false); // en sten som huggs på blocket
      sp(B, halvhuggen(7, 6, 4, 5), 33, 19);
      sp(B, block(6, 5, 2, SK, 8), 39, 22);
      sp(B, rasten(5, 4, 9), 2, 24);
    } else if (v === 1) { // stenen ligger på en låg träbock; råa stenar till vänster och färdiga block staplade till höger
      sp(B, rasten(6, 5, 1), 1, 18); sp(B, rasten(5, 4, 2), 6, 22); sp(B, rasten(7, 5, 3), 2, 25);
      flisor(B, 24, 27, 10, 3, 22, 5);
      sp(B, bank(16, 4, 4), 15, 15);
      sp(B, halvhuggen(10, 6, 7, 6), 18, 9, false);
      sp(B, block(7, 4, 2, SK, 1), 37, 22); sp(B, block(7, 4, 2, SK, 2), 38, 17, false);
    } else { // en låg flat häll att hugga på, en stock att sitta på bakom, stenar på rad och ett block med en mejsel
      sp(B, stock(14, 4, 2), 3, 6);
      sp(B, rasten(5, 4, 4), 22, 7); sp(B, rasten(6, 5, 5), 29, 6); sp(B, rasten(5, 4, 6), 37, 8);
      flisor(B, 22, 26, 14, 4, 28, 3);
      sp(B, former(24, 8, [[ell(12, 4, 11, 3.2), (x, y) => y < 4.4 ? (x < 9 ? 'T' : 'S') : y < 6.2 ? 'R' : 'Q']]), 9, 17);
      sp(B, block(7, 5, 2, SK, 4), 15, 13, false);
      sp(B, former(7, 4, [[linje([[1, 1.5], [5.5, 2.5]], 0.6), 'x']]), 24, 15, false); // mejseln av horn
      sp(B, rasten(3, 3, 7), 27, 17, false); // slagstenen
      sp(B, block(5, 4, 2, SK, 9), 40, 22);
    }
  }
  const STENHUGGARE = (text, v) => ({ text, w: 48, h: 32, rita: (B) => stenhuggare(B, v) });

  // ---------- 7.5.1 klyvplatsen ----------
  function klyvare(B, v) {
    gras(B);
    if (v === 0) { // stocken på två kubbar, kluven längs ovansidan med två kilar i sprickan; plankor och klubban framför
      window.MARK.stubbe(B, 11, 18, 7, 'gran', 0); window.MARK.stubbe(B, 33, 18, 7, 'gran', 0);
      sp(B, stock(30, 6, 1, true), 4, 8, false);
      sp(B, MED(KIL), 13, 7, false); sp(B, MED(KIL), 23, 7, false);
      sp(B, planka(20, 2, 3), 3, 23); sp(B, planka(18, 2, 4), 6, 20, false);
      sp(B, klubba, 31, 24);
    } else if (v === 1) { // en grov kubbe där en kort stock står och klyvs i två halvor; plankor staplade bredvid
      window.MARK.stubbe(B, 14, 25, 12, 'gran', 0);
      sp(B, former(12, 14, [
        [poly([[2, 13], [5.7, 13], [4.2, 1.5], [0.6, 2.5]]), (x, y) => y < 3.4 ? 'x' : x < 3 ? 'd' : 'c'],
        [poly([[6.3, 13], [10, 13], [11.4, 2.5], [7.8, 1.5]]), (x, y) => y < 3.4 ? 'w' : x > 9 ? 'b' : 'c'],
      ]), 8, 6, false);
      sp(B, MED(KIL), 13, 4, false);
      sp(B, planka(18, 2, 5), 27, 25); sp(B, planka(18, 2, 6), 28, 22, false); sp(B, planka(17, 2, 7), 29, 19, false);
      sp(B, klubba, 26, 9);
    } else { // en bock av korslagda störar med stocken i, kilar i stockens ända och kluvna plankor bredvid
      const kors = former(12, 18, [[linje([[1.5, 16.5], [10.5, 1.5]], 0.7), 'b'], [linje([[10.5, 16.5], [1.5, 1.5]], 0.7), 'c']]);
      sp(B, stock(28, 6, 2), 3, 9, false);
      sp(B, kors, 5, 6); sp(B, kors, 23, 6);
      sp(B, MED(['dc', 'dc']), 31, 13, false); sp(B, MED(['dc', 'c.']), 31, 17, false);
      sp(B, planka(14, 2, 8), 2, 26); sp(B, planka(16, 2, 9), 21, 27);
      sp(B, MED(KIL), 38, 24); sp(B, MED(KIL), 41, 25);
    }
  }
  const KLYVARE = (text, v) => ({ text, w: 48, h: 32, rita: (B) => klyvare(B, v) });
  function MED(rader) { // en liten handritad sak med kontur
    return former(rader[0].length + 2, rader.length + 2, [[(x, y) => (rader[fx(y) - 1] || '')[fx(x) - 1] > '.', (x, y) => rader[fx(y) - 1][fx(x) - 1]]]);
  }

  // ---------- 7.5.1 huggen sten och plankor ----------
  const HUGGEN = [
    block(6, 5, 2, JO, 5),
    block(9, 4, 1, SK, 6),
    former(10, 6, [[rakt(1, 1, 9, 5), (x, y) => { if (y < 2.2) return x >= 8 ? 'x' : 'y'; if (x >= 8) return 'w'; return hash(fx(x), fx(y), 4) < 0.1 ? 'l' : hash(fx(x), fx(y), 5) < 0.15 ? 'w' : 'x'; }]]),
  ];
  const HUGGEN_TEXT = ['Ett kantigt block i samma bruna sten som den runda stenen, med ljus ovansida och mejselmärken.', 'Ett längre grått block, som en byggsten till en vägg eller en härd.', 'En flat ljus häll med svarta korn, som en tröskel eller en golvsten.'];
  const PLANKOR_V = [
    { text: 'Två kluvna plankor på varandra, den övre lite förskjuten, med ljusa ändar.', w: 20, h: 14, rita: (B) => { sp(B, planka(12, 2, 1), 5, 6); sp(B, planka(12, 2, 2), 3, 3, false); } },
    { text: 'En enda bred planka med tydlig ådring och en kvist.', w: 22, h: 12, rita: (B) => { sp(B, former(16, 6, [[rakt(1, 1, 15, 4), (x, y) => fx(x) === 9 && fx(y) === 2 ? 'b' : hash(fx(x / 4), fx(y), 11) < 0.3 ? 'c' : 'd'], [rakt(1, 4, 15, 5), 'b'], [rakt(14, 1, 15, 5), (x, y) => y < 4 ? 'x' : 'w']]), 3, 3); } },
    { text: 'Tre smala plankor bundna med rep.', w: 20, h: 14, rita: (B) => { sp(B, planka(12, 1, 3), 4, 7); sp(B, planka(12, 1, 4), 4, 5, false); sp(B, planka(12, 1, 5), 4, 3, false); for (const x of [7, 13]) for (let y = 4; y <= 9; y++) B.satt(x, y, B.P.i('ben', y % 2 ? 2 : 1)); } },
  ];

  // ---------- 7.5.3 härden ----------
  // husets hörn uppe till vänster (timmerväggen och golvet), härden på golvet och röken som stiger mot rökhålet
  function harden(B, v) {
    bildfil(B, 'timmervagg', 0, 0);
    const x0 = 20, y0 = 22;
    if (v === 0) { // en fyrkant av huggna stenar, lika höga som golvet, med glöd och eld i mitten
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const kant = x < 3 || x > 12 || y < 3 || y > 12; if (!kant) continue;
        const fog = (x % 5 === 2 && (y < 3 || y > 12)) || (y % 5 === 2 && (x < 3 || x > 12));
        B.satt(x0 + x, y0 + y, fog ? B.P.i('kol', 1) : B.P.i('skiffer', x + y < 6 || (y < 3 && x < 12) || (x < 3 && y < 12) ? 3 : 2));
      }
      for (let x = -1; x <= 16; x++) { B.satt(x0 + x, y0 - 1, B.P.i('kol', 0)); B.satt(x0 + x, y0 + 16, B.P.i('kol', 0)); }
      for (let y = -1; y <= 16; y++) { B.satt(x0 - 1, y0 + y, B.P.i('kol', 0)); B.satt(x0 + 16, y0 + y, B.P.i('kol', 0)); }
      eld(B, x0 + 3, y0 + 3, 10, 10, 2);
      laga(B, x0 + 7, y0 + 9, 6); laga(B, x0 + 9, y0 + 10, 4); laga(B, x0 + 5, y0 + 10, 3);
      rok(B, x0 + 8, y0 - 1, 0);
    } else if (v === 1) { // en upphöjd härd: två varv huggna block, ovansidan och framsidan syns, elden på toppen
      const hx = 18, hy = 24, w = 20;
      for (let y = 0; y < 12; y++) for (let x = 0; x < w; x++) B.satt(hx + x, hy + y, B.P.i('skiffer', y < 2 ? 3 : 2));
      eld(B, hx + 3, hy + 2, w - 6, 5, 4);
      for (let k = 0; k < 2; k++) for (let x = 0; x < w; x++) { // framsidans två varv block
        const y = hy + 8 + k * 4; for (let dy = 0; dy < 4; dy++) B.satt(hx + x, y + dy, (x + k * 3) % 7 === 6 || dy === 3 ? B.P.i('kol', 1) : B.P.i('skiffer', dy === 0 ? 2 : 1));
      }
      for (let y = hy - 1; y <= hy + 16; y++) { B.satt(hx - 1, y, B.P.i('kol', 0)); B.satt(hx + w, y, B.P.i('kol', 0)); }
      for (let x = hx - 1; x <= hx + w; x++) { B.satt(x, hy - 1, B.P.i('kol', 0)); B.satt(x, hy + 16, B.P.i('kol', 0)); }
      for (let x = hx; x < hx + w + 2; x++) B.morka(x, hy + 17);
      laga(B, hx + 9, hy + 5, 7); laga(B, hx + 11, hy + 6, 5); laga(B, hx + 7, hy + 6, 4);
      rok(B, hx + 10, hy - 2, 1);
    } else { // stora hörnstenar och en flat häll framför; natt, så härden lyser upp rummet
      const hx = 20, hy = 21;
      const sten = (x, y, w, h, t) => { for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) B.satt(x + dx, y + dy, B.P.i('skiffer', dy === 0 || dx === 0 ? Math.min(3, t + 1) : t)); };
      for (const [x, y, w, h] of [[0, 0, 6, 5], [6, 0, 4, 3], [10, 0, 6, 5], [0, 5, 3, 6], [13, 5, 3, 6], [0, 11, 6, 5], [6, 13, 4, 3], [10, 11, 6, 5]]) sten(hx + x, hy + y, w, h, 2);
      eld(B, hx + 3, hy + 4, 10, 8, 6);
      sten(hx - 2, hy + 18, 20, 4, 2); // hällen framför
      laga(B, hx + 8, hy + 10, 7); laga(B, hx + 6, hy + 10, 5); laga(B, hx + 10, hy + 11, 4);
      for (const [x, y] of [[hx + 5, hy - 3], [hx + 11, hy - 6], [hx + 8, hy - 8]]) B.satt(x, y, B.P.i('senap', 3), true);
      morkt(B, hx + 8, hy + 6, 26, 2);
    }
  }
  function rok(B, x, y, s) { // röken stiger i en slinga upp mot rökhålet: ljusgråa punkter som glesnar uppåt
    for (let i = 0; i < 22; i++) {
      const yy = y - i, xx = x + Math.round(Math.sin(i / 3.2 + s) * 2);
      if (hash(i, s, 41) < 0.12 + i * 0.025) continue;
      B.satt(xx, yy, B.P.i('ben', i < 8 ? 2 : 1)); if (i % 3 === 0) B.satt(xx + 1, yy, B.P.i('ben', 1));
    }
  }
  function morkt(B, cx, cy, r, max = 4) { // natten runt ljuset, som i fas6.js
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) { const d = Math.hypot(x - cx, y - cy) / r, n = Math.floor(d * 2 + ((x + y) % 2) * 0.5 + ((x * 3 + y) % 4) * 0.12) - 1; for (let i = 0; i < Math.min(max, n); i++) B.morka(x, y); }
  }
  const HARDEN = (text, v) => ({ text, w: 48, h: 48, rita: (B) => harden(B, v) });

  // ---------- 7.5.4 leksakerna ----------
  const TRAFIGUR = [
    MED([ // en häst
      '.........dd',
      '........dcd',
      '.dddddddcc.',
      'ddcccccccb.',
      'd.cccccccb.',
      '..c.b..c.b.',
      '..c.b..c.b.',
    ]),
    MED([ // en människa med armarna utåt
      '..dd...',
      '..dcc..',
      '...c...',
      'ddddccb',
      '..dcc..',
      '..dcc..',
      '..dcc..',
      '..d.c..',
      '..d.b..',
    ]),
    MED([ // en fågel
      '..dd.....',
      '.dddc....',
      'cddcc...d',
      '...dcccdd',
      '...ccccc.',
      '....cbb..',
      '....b.b..',
    ]),
  ];
  const TRAFIGUR_TEXT = ['En snidad häst med lång hals och ett ljust huvud.', 'En liten snidad människa med armarna utåt.', 'En snidad fågel med näbben framåt och stjärten uppåt.'];
  const HALMDOCKA = [
    MED([ // klassisk: huvud, armar ut bundna vid händerna, kjol som vidgar sig
      '..hg..',
      '..gf..',
      '..ww..',
      'gwhgwg',
      '..hg..',
      '..ww..',
      '.hggf.',
      '.hgff.',
      'hggfff',
    ]),
    MED([ // en halmtofs på huvudet, armarna längs sidorna och en lång kjol
      '.h.g..',
      '..hg..',
      '.hhgf.',
      '.hggf.',
      '..ww..',
      '.hhgf.',
      'hhggff',
      'hhggff',
      '.wwww.',
      '.hggf.',
      'hhgfff',
      'hgffff',
    ]),
    MED([ // med en liten skinnkappa och ett rep om midjan
      '..hg..',
      '..gf..',
      '.cbbc.',
      'gcbbcf',
      '.cbbc.',
      '.wwww.',
      '.hggf.',
      'hggfff',
    ]),
  ];
  const HALMDOCKA_TEXT = ['Huvud, raka armar och en kjol av halm, bundna med rep vid halsen, händerna och midjan.', 'En halmtofs på huvudet, armarna längs sidorna och en lång kjol.', 'Med en liten kappa av skinn och ett rep om midjan.'];

  VAL.push(
    KORT('f7_stenhuggarplats', 'Stenhuggarplatsen', S + '7.5.1: platsen där man hugger sten till raka block, av 4 sten och 1 virke. Ett stort block att hugga på, något att sitta på, flisor på marken och stenar som är halvt och helt huggna.', [
      STENHUGGARE('En stubbe att sitta på, ett stort runt huggblock med en sten på och halvhuggna stenar till höger.', 0),
      STENHUGGARE('Stenen ligger på en låg träbock; råa stenar till vänster och färdiga block staplade till höger.', 1),
      STENHUGGARE('En låg flat häll med ett block, en mejsel och en slagsten; en stock att sitta på bakom och råa stenar på rad.', 2),
    ]),
    KORT('f7_klyvplats', 'Klyvplatsen', S + '7.5.1: platsen där en stock klyvs till plankor med kilar och en klubba, av 1 virke och 2 ved.', [
      KLYVARE('Stocken ligger på två kubbar, kluven längs ovansidan med två kilar i sprickan; plankor och klubban framför.', 0),
      KLYVARE('En kort stock står på en grov kubbe och klyvs i två halvor; tre plankor staplade bredvid.', 1),
      KLYVARE('Stocken ligger i två bockar av korslagda störar, med kilar i ändan; kluvna plankor och kilar på marken.', 2),
    ]),
    KORT('f7_huggen_sten', 'Huggen sten', S + '7.5.1: en ny sak från stenhuggarplatsen, ett rakt och kantigt huggit block (den vanliga stenen är rund).', HUGGEN.map((r, i) => PA_MARK(HUGGEN_TEXT[i], r, L))),
    KORT('f7_plankor', 'Plankor', S + '7.5.1: en ny sak från klyvplatsen, kluvna plankor (virket är en kantad stock).', PLANKOR_V),
    KORT('f7_harden', 'Härden', S + '7.5.3: eldstaden inne i huset, en fyrkant av huggna stenar på golvet med elden i, och ett rökhål i taket ovanför. Taket ritas inte, så röken som stiger visar var rökhålet är. Bilden visar husets hörn uppe till vänster.', [
      HARDEN('En fyrkant av huggna stenar i golvets höjd, med glöd och eld i mitten och röken som stiger rakt upp.', 0),
      HARDEN('En upphöjd härd av två varv block, med elden på toppen och röken som slingrar sig upp.', 1),
      HARDEN('Stora hörnstenar och en flat häll framför; på natten lyser härden upp rummet och gnistorna stiger.', 2),
    ]),
    KORT('f7_trafigur', 'Träfigur', S + '7.5.4: en leksak, en liten snidad figur av trä.', TRAFIGUR.map((r, i) => PA_MARK(TRAFIGUR_TEXT[i], r, L))),
    KORT('f7_halmdocka', 'Halmdocka', S + '7.5.4: en leksak, en docka av halm som bundits med rep till huvud, armar och kjol.', HALMDOCKA.map((r, i) => PA_MARK(HALMDOCKA_TEXT[i], r, L))),
  );
})();
