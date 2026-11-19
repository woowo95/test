// ---------- animationerna (steg 5.2.4.8, till 5.1.9) ----------
// De godkända animationerna som spelet hämtar med animtillspelet.cjs: elden, röken, gnistorna, branden (lågor som tungor,
// TUNGOR, sex bilder), tornadon (en rörelse från början, åtta bilder) och klockan (TAKT, HASTIGHET). Rörelserna, redskapen
// och korten med exemplen är inbyggda i spelet (v350–v354, src/ui/arbetsbild.ts och src/ui/mark.ts) och borttagna här.
(() => {
  const RUTOR = 4, TAKT = 230;
  // hastigheten: varje effekt byter bild var n:e gång sidans klocka slår (TAKT ms). Elden fladdrar fort, vattnet rör sig
  // långsamt så att det inte stör. En ändrad hastighet är ett tal här. bild() ger effektens egen bild ur klockans slag.
  const HASTIGHET = { eld: 1, gnistor: 1, rok: 2, vagor: 4, stranden: 8, tornado: 1, brand: 1 };
  const EGNA = { vagor: 8, tornado: 8, brand: 6 }; // effekter med fler än fyra egna bilder
  const bild = (slag, namn) => Math.floor(slag / HASTIGHET[namn]) % (EGNA[namn] || RUTOR);
  const prick = (B, x, y, ramp, ton) => B.satt(Math.round(x), Math.round(y), B.P.i(ramp, ton));

  function puff(B, x, y, f) {
    const r = f < 0.25 ? 1.6 : f < 0.6 ? 2.5 : 3.2, ton = f < 0.35 ? 1 : f < 0.75 ? 2 : 3;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      if (f > 0.8 && (dx + dy + Math.round(y)) % 2) continue;
      const ljus = dy < 0 || dx < 0; prick(B, x + dx, y + dy, ljus ? 'skiffer' : 'kol', ljus ? ton : Math.min(3, ton + 1));
    }
  }
  // röken: en puff var åttonde punkt som stiger två punkter per bild, så att den går runt på fyra bilder
  function rok(B, x, y, ruta, hojd) {
    for (let k = 0; k * 8 < hojd; k++) { const upp = k * 8 + ruta * 2; if (upp > hojd) continue; const f = upp / hojd; puff(B, x + Math.sin(f * 3 + 0.5) * 1.5, y - upp, f); }
  }
  function gnistor(B, x, y, ruta) { for (let k = 0; k < 3; k++) { const upp = ((ruta + k * 2) % 4) * 3, gx = x + ((k * 5 + ruta) % 5) - 2; prick(B, gx, y - upp, upp > 6 ? 'rost' : 'senap', upp > 6 ? 1 : 3); } }
  const LAGOR = [[2, 4, 7, 9, 6, 4, 2], [3, 6, 8, 6, 9, 3, 2], [2, 5, 10, 7, 6, 5, 3], [4, 3, 7, 10, 5, 6, 2]];

  // ---------- branden, ritad som en rörelse (Björn 2026-11-04: "gör så formen på elden ändras med animationen så att det
  // ser ut som att lågorna slår ut och ändras") ----------
  // En ruta som brinner (16 × 16 punkter, färgerna från den godkända branden): lågorna är tungor (TUNGOR) som var och en
  // växer, slår ut åt sidan och krymper i sin egen takt på sex bilder, och ibland slits toppen av och flyger upp som en
  // lös låga. Kärnan är ljus, kanten orange och mörkröd längst ner, och glöden ligger i botten. v (0–1, i spelet ur
  // rutans plats) gör varje brand olik de andra: tungornas höjd och plats, spegelvänd eller inte och var i rörelsen den börjar.
  const BRANDFARG = { kant: '#24201d', yttre: '#a14808', mork: '#742a01', karna: '#d8b25f', glod: '#2f261d' };
  // en tunga: plats i rutan (x), höjd, halva bredden, hur långt toppen slår åt sidan och varv per rörelse
  const TUNGOR = [[7.5, 10, 3.4, 2.2, 1], [11, 7, 2.2, 1.8, 2], [4, 5.5, 2, 1.6, 2], [9, 4, 1.6, 1.2, 1]];
  const BRANDBAS = 13;
  function brandBild(B, x0, y0, b, v) {
    const P = B.P, W = 16, H = 16, g = Array.from({ length: H }, () => Array(W).fill(0)), sp = hash(v, 1, 960) < 0.5 ? 1 : -1;
    const fas = k => hash(v, 10 + k, 960) * 6.28, d = 2 * Math.PI * b / 6;
    const tungor = TUNGOR.map(([x, h, w, slag, m], k) => {
      const puls = Math.sin(d * m + fas(k)), hojd = h * (0.62 + 0.5 * (puls * 0.5 + 0.5)) * (0.85 + hash(v, 20 + k, 960) * 0.3);
      return { x: 7.5 + (x - 7.5) * sp + (hash(v, 30 + k, 960) - 0.5) * 2, hojd, w, slag: slag * Math.sin(d * m * (k % 2 ? 1 : -1) + fas(k) * 1.7), puls };
    });
    for (const t of tungor) for (let y = BRANDBAS; y > BRANDBAS - t.hojd - 1; y--) {
      const q = (BRANDBAS - y) / t.hojd; if (q > 1) continue;
      const cx = t.x + t.slag * q * q, hw = t.w * (1 - q ** 1.6) * (1 + 0.25 * Math.sin(q * 9 + d)) + 0.4;
      for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
        if (x < 1 || x > W - 2 || y < 1) continue; const u = Math.abs(x - cx) / hw; if (u > 1) continue;
        g[y][x] = Math.max(g[y][x], u < 0.5 && q < 0.75 ? 3 : q < 0.25 && u > 0.6 ? 1 : 2);
      }
      // toppen slits av: en lös låga ovanför när tungan är som högst
      if (t.puls > 0.6 && t.hojd > 5) { const ly = Math.round(BRANDBAS - t.hojd - 2), lx = Math.round(t.x + t.slag * 1.3); if (ly > 0) { g[ly][lx] = 2; if (ly - 1 > 0 && t.puls > 0.85) g[ly - 1][lx] = 2; } }
    }
    for (let x = 2; x < W - 2; x++) if (g[BRANDBAS][x] || g[BRANDBAS - 1][x]) { g[BRANDBAS + 1][x] = 4; } // glöden
    const farg = [null, BRANDFARG.mork, BRANDFARG.yttre, BRANDFARG.karna, BRANDFARG.glod];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (g[y][x]) B.satt(x0 + x, y0 + y, P.av(farg[g[y][x]]));
      else if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (g[y + dy]?.[x + dx] ?? 0) > 0)) B.satt(x0 + x, y0 + y, P.av(BRANDFARG.kant));
    }
  }

  // ---------- tornadon, ritad som en rörelse från början (Björn 2026-11-04: "gör om hela tornadon från början med
  // animationen inkorporerad") ----------
  // 32 × 48 punkter som på kartan, foten mitt nere. f (0–1) är hur långt varvet har kommit, på åtta bilder:
  // molnet överst virvlar i en spiral, tratten är en cylinder med ränder som går snett runt och flyttar sig ett varv,
  // tratten svajar mest längst ner, dammet vid foten virvlar runt i en ring och kvistar och löv flyger runt tratten,
  // framför den på ena sidan och bakom den på den andra. Allt utom dammet har en mörk kant.
  // storleken S (Björn 2026-11-04: "gör den större"): medel är 1,5 gånger kartans förra tornado, 48 × 72 punkter. De tre
  // storlekarna (steg 6.3.5.8, en rad var i spelets register) ritas av samma kod: tratten och molnet så breda som kärnan
  // (liten 1 ruta, medel 3, stor 5) och dammet vid foten ut mot nära-zonen (2, 3 och 5 rutor från mitten), räknat så att
  // medel är som förut. TNMATT ger bildens mått och foten för en storlek.
  // Björn 2026-11-04 (efter bildstil v162): "gör så det bara är liten skillnad i storlek. Gör så det är extremt mycket damm och
  // streck runt den största tornadon": bilden skiljer sig lite (S), medan mer ger den stora ett dammoln och många streck.
  // Sedan (Björn efter bildstil v163): "ta bort lite damm men lägg till fler streck som går runt längre bort från tornadon"
  const STORLEKAR = { liten: { S: 1.25, damm: 3, mer: 0 }, medel: { S: 1.5, damm: 3.5, mer: 0 }, stor: { S: 1.8, damm: 5, mer: 1 } };
  const TNMATT = S => { const w = Math.round(32 * S), h = Math.round(48 * S); return { w, h, cx: w / 2 - 0.5, fot: h - Math.round(7 * S / 1.5) }; };
  const TN = TNMATT(1.5);
  // det som flyger runt (Björn 2026-11-04: "mer kaosartad och mindre clean, mer saker som virvlar runt"): höjd, varv per
  // rörelse (negativt åt andra hållet), avstånd utanför tratten och vad det är
  const SKRAP = [
    [13, 1, 3, 'kvist'], [17, 2, 5, 'lov'], [20, -1, 2, 'sten'], [23, 1, 6, 'gras'], [26, 2, 3, 'kvist'], [28, 1, 4, 'lov2'],
    [31, -1, 5, 'lov'], [33, 2, 2, 'sten'], [35, 1, 6, 'kvist'], [37, 3, 3, 'gras'], [39, -2, 4, 'lov2'], [19, 3, 7, 'sten'], [15, -1, 6, 'gren'], [30, 2, 7, 'gren'], [41, 1, 5, 'gras'], [24, -2, 4, 'kvist'],
  ];
  // vinden (Björn 2026-11-04: "sträck utanför tornadon som swishar runt"): höjd, varv per rörelse, avstånd utanför
  // tratten, längd i punkter och ljus eller mörk
  const VIND = [[14, 1, 7, 16, 1], [21, -1, 9, 14, 0], [27, 2, 8, 16, 1], [34, 1, 10, 14, 1], [38, -2, 6, 12, 0], [18, 2, 11, 12, 1], [31, -1, 7, 14, 0], [10, 1, 10, 16, 1]];
  const SKRAPFORM = {
    kvist: [[0, 0, 'jord', 1], [1, -1, 'jord', 2], [2, -1, 'jord', 1], [-1, 1, 'kol', 0]],
    lov: [[0, 0, 'oliv', 2], [1, 0, 'oliv', 3], [0, 1, 'barr', 1]], lov2: [[0, 0, 'senap', 2], [1, -1, 'senap', 1]],
    gren: [[-2, 1, 'kol', 0], [-1, 1, 'jord', 1], [0, 0, 'jord', 2], [1, 0, 'jord', 1], [2, -1, 'jord', 2], [3, -1, 'kol', 0], [1, -1, 'oliv', 2]],
    sten: [[0, 0, 'skiffer', 2], [1, 0, 'skiffer', 0], [0, 1, 'kol', 0]], gras: [[0, 0, 'oliv', 1], [0, -1, 'oliv', 2], [1, -2, 'senap', 1]],
  };
  function tornado(B, x0, y0, f, storlek = 'medel') {
    const { S, damm, mer } = STORLEKAR[storlek], TN = TNMATT(S), sk = S / 1.5, DR = 23 * damm / 3.5; // sk: skalan mot medel, DR: dammets radie
    const P = B.P, ett = Array.from({ length: TN.h }, () => Array(TN.w).fill(-1)), v = 2 * Math.PI * f, bnr = Math.round(f * 8) % 8;
    const satt = (g, x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < TN.w && y < TN.h) g[y][x] = c; };
    const mitt = y => TN.cx + Math.sin(v + y / (7 * S)) * 1.8 * S * (y / TN.fot) ** 1.3 + Math.sin(v * 2 + y / (3 * S)) * 0.5 * S; // svajet, ryckigt
    // kanten (Björn 2026-11-04: "behöver inte vara lika vågig men den kan vara lite mer odefinierad"): bredden gungar bara lite,
    // men ytterst glesnar tratten ut i lösa punkter som virvlar med varvet
    const bredd = y => S * (2.2 + 9.5 * Math.max(0, 1 - (y - 10 * S) / (TN.fot - 8 * S)) ** 1.5) + Math.sin(y * 0.9 + v * 2) * 0.45 + Math.sin(y * 0.3 - v) * 0.4;
    // tratten: en cylinder med ränder snett runt, brutna av brus, och jord som sugits upp i den nedre delen
    for (let y = Math.round(9 * S); y <= TN.fot - 1; y++) {
      const cx = mitt(y), w = bredd(y);
      for (let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x++) {
        const u = (x - cx) / w; if (Math.abs(u) > 1) continue;
        if (Math.abs(u) > 0.72 && hash(x, y, 986 + bnr) < (Math.abs(u) - 0.72) * 2.6) continue; // kanten glesnar
        const rand = Math.sin(3 * Math.asin(u) + y * 0.37 - v) + (hash(x >> 1, y, 980 + bnr) - 0.5) * 0.9;
        let c = rand > 0.35 ? P.i('ben', 2) : rand < -0.4 ? P.i('skiffer', 1) : P.i('skiffer', 2);
        if (u > 0.78) c = P.i('skiffer', 1); else if (u < -0.82 && rand <= 0.35) c = P.i('skiffer', 3); // ljuset från vänster
        if (hash(x, y, 981 + bnr) < 0.16 * (y / TN.fot) ** 2) c = P.i('jord', hash(x, y, 982) < 0.5 ? 1 : 2);
        satt(ett, x, y, c);
      }
      for (let k = 0; k < 3; k++) { // lösa punkter strax utanför kanten
        const sida = hash(y, k, 987 + bnr) < 0.5 ? -1 : 1, ut = w + 1 + hash(y, k, 988 + bnr) * 3;
        if (hash(y, k, 989 + bnr) < 0.55) satt(ett, cx + sida * ut, y, P.i('skiffer', hash(y, k, 990) < 0.5 ? 1 : 2));
      }
    }
    // molnet: en platt virvel ovanför med trasig kant och slingor
    for (let y = 0; y < Math.round(26 * sk); y++) for (let x = 0; x < TN.w; x++) {
      const u = (x - TN.cx) / (15 * S), w = (y - 8 * S) / (6.2 * S), r = Math.hypot(u, w), ang = Math.atan2(w, u);
      if (r > 0.9 + Math.sin(ang * 5 + v) * 0.1 + Math.sin(ang * 9 - v * 2) * 0.06) continue;
      const arm = Math.sin(ang * 2 + r * 7 - v * 2) + (hash(x >> 1, y, 983 + bnr) - 0.5) * 0.6;
      satt(ett, x, y, r < 0.16 ? P.i('kol', 2) : r > 0.8 ? P.i('skiffer', 1) : arm > 0.45 ? P.i('ben', 2) : arm < -0.3 ? P.i('skiffer', 1) : P.i('skiffer', 2));
    }
    // kanten runt molnet, med luckor, och bara en gles kant runt tratten så att den inte blir för ren
    const kant = ett.map(r => [...r]);
    for (let y = 0; y < TN.h; y++) for (let x = 0; x < TN.w; x++) if (ett[y][x] < 0 && hash(x, y, 984 + bnr) > (y < 9 * S ? 0.2 : 0.62) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (ett[y + dy]?.[x + dx] ?? -1) >= 0)) kant[y][x] = P.i('kol', 0);
    // dammet: ett moln av jord vid foten, korn som virvlar runt i en ring och damm som stiger i en spiral längs tratten
    for (let y = Math.round(-11 * sk); y <= Math.round(5 * sk); y++) for (let x = -Math.round(DR); x <= Math.round(DR); x++) {
      const e = (x / DR) ** 2 + (y / ((y < 0 ? 10 : 6) * DR / 23)) ** 2 + (Math.sin(Math.atan2(y, x) * 4 + v) * 0.18);
      if (e < 1 && hash(x, y, 970) < 1.2 - e) { const q = hash(x + bnr * 3, y, 971); prick(B, x0 + TN.cx + x, y0 + TN.fot + y, q < 0.2 ? 'ben' : 'jord', q < 0.2 ? 1 : q < 0.55 ? 3 : 2); }
    }
    const runt = (bak) => {
      for (let k = 0; k < 26; k++) { // ringen vid foten
        const a = v + k * 2 * Math.PI / 26 + (k % 2) * 0.2, R = DR / 23 * 1.5 * (7 + (k % 4) * 2.2), si = Math.sin(a); if ((si < 0) !== bak) continue;
        const x = x0 + TN.cx + Math.cos(a) * R, y = y0 + TN.fot + si * R * 0.32 - (k % 3) * 1.5;
        prick(B, x, y, k % 3 === 0 ? 'ben' : 'jord', k % 3 === 0 ? 1 : 3); prick(B, x + 1, y, 'jord', 2); if (k % 2) prick(B, x, y - 1, 'jord', 3);
      }
      for (const [hojd, m, ut, langd, ljus] of VIND) { // vinden: streck som sveper runt tratten
        for (let i = 0; i < langd; i++) {
          const yy = hojd * S, R = bredd(yy) + ut * S, a = v * m + hojd * 0.7 - i * 0.9 / R * Math.sign(m), si = Math.sin(a); if ((si < 0) !== bak) continue;
          const x = x0 + mitt(yy) + Math.cos(a) * R, y = y0 + yy + si * 1.6 - i * 0.1;
          prick(B, x, y, ljus ? 'ben' : 'skiffer', ljus ? (i < langd / 2 ? 3 : 2) : (i < langd / 2 ? 3 : 2));
        }
      }
      for (let k = 0; k < 48; k++) { // dammet som stiger längs tratten
        const t = (f + k / 48) % 1, yy = TN.fot - 3 - t * 40 * sk, a = v * 2 + k * 2.4, si = Math.sin(a); if ((si < 0) !== bak) continue;
        const x = x0 + mitt(yy) + Math.cos(a) * (bredd(yy) + 1.5 + (k % 3)), y = y0 + yy + si * 1.5;
        prick(B, x, y, 'jord', t > 0.6 ? 2 : 3); if (k % 3 === 0 && t < 0.5) prick(B, x + 1, y, 'jord', 2); if (k % 4 === 1 && t < 0.35) prick(B, x, y - 1, 'jord', 3);
      }
      for (const [yy0, m, ut0, sort] of SKRAP) { const yy = yy0 * S, ut = ut0 * S; // kvistar, löv, stenar och gräs
        const a = v * m + yy * 1.9, si = Math.sin(a); if ((si < 0) !== bak) continue;
        const x = x0 + mitt(yy) + Math.cos(a) * (bredd(yy) + ut), y = y0 + yy + si * 2.5 + Math.sin(v + yy) * 1.2;
        const spegel = Math.cos(a) < 0 ? -1 : 1;
        for (const [dx, dy, ramp, ton] of SKRAPFORM[sort]) prick(B, x + dx * spegel, y + dy, ramp, ton);
      }
      if (!mer) return;
      // den stora: ett tjockt moln av jord som virvlar runt foten högt upp längs tratten, och många vindstreck runt om
      for (let y = Math.round(-48 * sk); y <= Math.round(6 * sk); y++) for (let x = -Math.round(DR * 1.45); x <= Math.round(DR * 1.45); x++) {
        const ang = Math.atan2(y, x), e = (x / (DR * 1.45)) ** 2 + (y / (y < 0 ? 44 * sk : 7 * sk)) ** 2 + Math.sin(ang * 5 + v * 1.5) * 0.14 + Math.sin(ang * 3 - v) * 0.1;
        if (e >= 1 || (y < -4 && Math.abs(x) < bredd(TN.fot + y) - 1)) continue; // tratten syns genom dammet
        if ((hash(x, y, 975 + bnr) < 0.5) !== bak) continue; // hälften bakom tratten, hälften framför
        if (hash(x + bnr * 5, y, 976) > (1.15 - e) * 0.75) continue;
        const q = hash(x, y + bnr * 7, 977); prick(B, x0 + TN.cx + x, y0 + TN.fot + y, q < 0.25 ? 'ben' : 'jord', q < 0.25 ? (q < 0.1 ? 3 : 1) : q < 0.6 ? 3 : 2);
      }
      for (let k = 0; k < 96; k++) { // vindstreck: bågar runt tratten i alla höjder
        const yy = TN.fot * (0.15 + 0.85 * ((k * 0.37) % 1)), m = k % 2 ? 1 : -1.5, ut = (4 + (k % 11) * 4.2) * sk, langd = 8 + (k % 4) * 4, ljus = k % 3 !== 1;
        for (let i = 0; i < langd; i++) {
          const R = bredd(yy) + ut, a = v * m + k * 1.3 - i * 0.9 / R * Math.sign(m), si = Math.sin(a); if ((si < 0) !== bak) continue;
          prick(B, x0 + mitt(yy) + Math.cos(a) * R, y0 + yy + si * 2 - i * 0.12, ljus ? 'ben' : 'skiffer', i < langd / 2 ? 3 : 2);
        }
      }
    };
    runt(true);
    kant.forEach((r, y) => r.forEach((c, x) => { if (c >= 0) B.satt(x0 + x, y0 + y, c); }));
    runt(false);
  }

})();
