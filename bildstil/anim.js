// ---------- animationerna (steg 5.2.4.8, till 5.1.9) ----------
// Få och generella delar som handlingarna pekar på (Björn 2026-11-04: inte en animation per sak). Tre register:
//   RORELSER: kroppens rörelser, som följder av kartfigurens armlägen (skapare.js) i fyra bilder: slå, stöta, plocka,
//             pyssla och kasta (gå och bära finns redan i kartfiguren)
//   REDSKAP:  redskapet i handen som skaft och huvud, ritat i armens riktning, så att ett nytt redskap är en rad
//   BRANDEN:  ritad som en rörelse, lågor som tungor (TUNGOR) som slår ut, sex bilder
//   TORNADON: ritad som en rörelse från början, åtta bilder
//   EFFEKTER: splitter (färgen efter materialet i MATERIAL), rök, gnistor, träffen, lågorna, vågorna och
//             vattnet som sköljer på stranden (SKOLJ)
// En handling (HANDLINGAR, här bara exemplen på kortet) är en rörelse, ett redskap, en effekt och ett material. Alla
// rörelser har fyra bilder i samma takt, så att byn rör sig i samma rytm. Träd och gräs svajar inte: hela marken skulle
// då ritas om hela tiden (Björn 2026-11-04). Varje version är en scen med rutor: rita(B, P, ruta), och sidans klocka
// (ANIM i sida.js) byter bild.
(() => {
  const RUTOR = 4, TAKT = 230;
  const SCEN = (w, h, rita) => ({ w, h, stor: true, liten: true, rutor: RUTOR, takt: TAKT, rita });
  // hastigheten: varje effekt byter bild var n:e gång sidans klocka slår (TAKT ms). Elden fladdrar fort, vattnet rör sig
  // långsamt så att det inte stör. En ändrad hastighet är ett tal här. bild() ger effektens egen bild ur klockans slag.
  const HASTIGHET = { eld: 1, gnistor: 1, rok: 2, vagor: 4, stranden: 8, tornado: 1, brand: 1 };
  const EGNA = { vagor: 8, tornado: 8, brand: 6 }; // effekter med fler än fyra egna bilder
  const bild = (slag, namn) => Math.floor(slag / HASTIGHET[namn]) % (EGNA[namn] || RUTOR);
  const SLAG = 96; // så många slag innan allt börjar om: delbart med alla hastigheter gånger bilderna (32)
  const prick = (B, x, y, ramp, ton) => B.satt(Math.round(x), Math.round(y), B.P.i(ramp, ton));
  const gras = B => { for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, MARK.grasPunkt(x, y, B.P, 1)); MARK.tuvor(B, 1, () => true); };

  // ---------- rörelserna ----------
  // en bild: ben och arm i kartfiguren, riktningen redskapet pekar (r: framåt, nedåt), steg (1 träffen, 2 efteråt), ut
  // (kroppen en punkt fram eller bak) och för plocka och kasta om saken är i handen (hand) eller i luften (flyg 1 eller 2)
  const RORELSER = {
    sla: { namn: 'Slå', bilder: [{ arm: 'lyfta', r: [0, -1] }, { arm: 'lyfta', r: [-1, -1] }, { arm: 'sla', r: [1, 1], steg: 1 }, { arm: 'sla', r: [1, 1], steg: 2 }] },
    stota: { namn: 'Stöta', bilder: [{ arm: 'framfor', r: [1, 0] }, { arm: 'framfor', r: [1, 0], ut: -1 }, { arm: 'sla', r: [1, 0], ut: 1, steg: 1 }, { arm: 'sla', r: [1, 0], steg: 2 }] },
    plocka: { namn: 'Plocka', bilder: [{ arm: 'hanga' }, { ben: 'sitta', arm: 'hanga' }, { ben: 'sitta', arm: 'framfor', hand: true }, { arm: 'framfor', hand: true }] },
    pyssla: { namn: 'Pyssla', sitta: true, bilder: [{ arm: 'framfor', r: [1, 1] }, { arm: 'gang1', r: [1, 1], steg: 1 }, { arm: 'framfor', r: [1, 1] }, { arm: 'gang1', r: [1, 1], steg: 1 }] },
    kasta: { namn: 'Kasta', bilder: [{ arm: 'framfor', r: [1, -1], hand: true }, { arm: 'lyfta', r: [-1, -1], hand: true }, { arm: 'sla', r: [1, 0], flyg: 1 }, { arm: 'hanga', flyg: 2 }] },
  };

  // ---------- redskapen ----------
  // skaft: hur långt (punkter från handen), bak: hur långt bakom handen (spjutet hålls på mitten), huvud: formen i änden
  const REDSKAP = {
    yxa: { skaft: 3, huvud: 'blad' }, spade: { skaft: 5, huvud: 'spade' }, klubba: { skaft: 4, huvud: 'klubba' },
    spjut: { skaft: 7, bak: 3, huvud: 'spets' }, kniv: { skaft: 1, huvud: 'egg' }, nal: { skaft: 0, huvud: 'nal' },
    sten: { skaft: 0, huvud: 'sten' }, snoboll: { skaft: 0, huvud: 'snoboll' },
  };
  // huvudet i änden t, i riktningen r; m är dit slaget går (vinkelrätt mot skaftet)
  function huvud(B, form, t, r, m) {
    const at = (a, b, ramp, ton) => prick(B, t[0] + a, t[1] + b, ramp, ton);
    if (form === 'blad') { at(0, 0, 'skiffer', 1); at(m[0], m[1], 'skiffer', 2); at(m[0] - r[0], m[1] - r[1], 'skiffer', 2); at(2 * m[0], 2 * m[1], 'skiffer', 3); }
    if (form === 'spade') { at(0, 0, 'ben', 2); at(r[0], r[1], 'ben', 1); at(m[0], m[1], 'ben', 2); at(m[0] + r[0], m[1] + r[1], 'ben', 1); }
    if (form === 'klubba') { at(0, 0, 'jord', 3); at(m[0], m[1], 'jord', 2); at(-m[0], -m[1], 'jord', 2); at(r[0], r[1], 'jord', 3); }
    if (form === 'spets') { at(0, 0, 'skiffer', 3); at(r[0], r[1], 'skiffer', 2); }
    if (form === 'egg') { at(0, 0, 'skiffer', 3); at(r[0], r[1], 'skiffer', 3); }
    if (form === 'nal') at(0, 0, 'ben', 3);
    if (form === 'sten' || form === 'snoboll') { const [rp, a, b] = form === 'sten' ? ['jord', 2, 0] : ['ben', 3, 2]; at(0, 0, rp, a); at(1, 0, rp, b); at(0, 1, rp, b); at(1, 1, rp, b); }
  }
  // redskapet ur handen h i riktningen r; ger änden
  function redskap(B, id, h, r, fram) {
    const R = REDSKAP[id]; if (!R) return h;
    const rx = r[0] * fram, ry = r[1], n = R.skaft ? R.skaft + 1 : 0;
    for (let k = -(R.bak || 0); k <= R.skaft; k++) if (k) prick(B, h[0] + rx * k, h[1] + ry * k, 'jord', 2);
    const t = [h[0] + rx * n, h[1] + ry * n];
    huvud(B, R.huvud, t, [rx, ry], [-ry * fram, rx * fram]);
    return t;
  }

  // ---------- effekterna ----------
  const MATERIAL = { tra: [['senap', 3], ['jord', 3]], sten: [['skiffer', 3], ['ben', 2]], jord: [['jord', 1], ['jord', 2]], blod: [['rost', 1], ['rost', 2]], vatten: [['ben', 3], ['skiffer', 3]], sno: [['ben', 3], ['ben', 2]] };
  // splitter: steg 1 nära träffen, steg 2 längre bort och högre; liten: bara ett korn (det man pysslar med)
  function splitter(B, t, steg, mat, liten = false) {
    const M = MATERIAL[mat] || MATERIAL.tra, lista = liten ? [[1, -1]] : steg === 1 ? [[1, -2], [-1, -1], [2, 0]] : [[3, -4], [-2, -3], [4, -1]];
    lista.forEach(([dx, dy], i) => { const [rp, tn] = M[i % 2]; prick(B, t[0] + dx, t[1] + dy, rp, tn); });
  }
  function traff(B, x, y) {
    for (const [dx, dy, t] of [[0, 0, 3], [-1, 0, 3], [1, 0, 3], [0, -1, 3], [0, 1, 3], [-2, -2, 2], [2, -2, 2], [-2, 2, 2], [2, 2, 2]]) B.satt(x + dx, y + dy, B.P.i(t === 3 ? 'ben' : 'senap', 3), true);
  }
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

  // stranden och vågorna: en sjö är en funktion i(x, y) (sant i vattnet), och avståndet till stranden räknas i punkter.
  // Vågorna är korta ljusa streck som rullar en punkt per bild och tänds och slocknar, och vid stranden sköljer en
  // skumrand upp på sanden och drar sig tillbaka, långsamt (HASTIGHET). Bara vattnet nära stranden och
  // strecken ritas om, inte marken.
  function strandAvst(B, i, max) {
    const d = new Array(B.w * B.h).fill(-1);
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) {
      const vatt = i(x, y); let n = max + 1;
      for (let dy = -max; dy <= max && n > 1; dy++) for (let dx = -max; dx <= max; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= B.w || yy >= B.h) continue;
        if (i(xx, yy) !== vatt) n = Math.min(n, Math.max(Math.abs(dx), Math.abs(dy)));
      }
      d[y * B.w + x] = vatt ? n : -n; // positivt i vattnet, negativt på land
    }
    return d;
  }
  // vad som ritas i varje bild: avståndet till stranden (1 är vattnets yttersta punkt, -1 sandens första) och färgen
  const SKOLJ = [
    [[1, 'ben', 2], [2, 'skiffer', 3]],                       // vågen kommer in
    [[-1, 'ben', 3], [1, 'ben', 2], [2, 'skiffer', 2]],        // skummet uppe på sanden
    [[-1, 'jord', 1], [2, 'ben', 2], [3, 'skiffer', 2]],        // vattnet drar sig tillbaka, sanden är våt
    [[-2, 'jord', 1], [-1, 'jord', 1], [3, 'skiffer', 3]],      // nästa våg samlas längre ut
  ];
  function stranden(B, d, ruta) {
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) {
      const a = d[y * B.w + x], rad = SKOLJ[ruta].find(r => r[0] === a);
      if (rad && hash(Math.floor(x / 3), Math.floor(y / 2), 910 + ruta) > 0.2) prick(B, x, y, rad[1], rad[2]);
    }
  }
  // en våg lever i åtta egna bilder: den tänds, blir ljusast mitt i och slocknar medan den rullar en punkt per bild.
  // Vågorna är förskjutna mot varandra, så att de inte blinkar i takt; en våg flyttar tillbaka när den är släckt.
  const VAGTON = [-1, 1, 2, 3, 3, 2, 1, -1];
  function vagor(B, d, f, antal) {
    const i = (x, y) => (x >= 0 && y >= 0 && x < B.w && y < B.h ? d[y * B.w + x] : 0);
    for (let k = 0; k < antal; k++) {
      const g = (f + k * 3) % 8, ton = VAGTON[g]; if (ton < 0) continue;
      const x = Math.floor(hash(k, 1, 920) * B.w) + g, y = Math.floor(hash(k, 2, 920) * B.h);
      if (!(i(x - 1, y) > 3) || !(i(x + 5, y + 1) > 3)) continue;
      if (ton > 1) { prick(B, x - 1, y + 1, 'skiffer', 1); prick(B, x + 5, y + 1, 'skiffer', 1); } // flankerna en punkt lägre: en båge
      for (let j = 0; j < 5; j++) prick(B, x + j, y, 'skiffer', j === 2 ? ton : Math.max(1, ton - 1));
    }
  }

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
  // del: 'rok' bara röken, 'bild' bara lågorna (så att röken från flera rutor hamnar bakom alla lågorna), annars båda
  function brand(B, x0, y0, slag, v = 0, del) {
    const fas = Math.floor(hash(v, 5, 960) * 6);
    if (del !== 'rok') brandBild(B, x0, y0, (bild(slag, 'brand') + fas) % 6, v);
    if (del !== 'bild') rok(B, x0 + 7 + Math.round(hash(v, 6, 960) * 2 - 1), y0 + 1, (bild(slag, 'rok') + fas) % 4, 22 - Math.floor(hash(v, 7, 960) * 8));
  }

  // ---------- tornadon, ritad som en rörelse från början (Björn 2026-11-04: "gör om hela tornadon från början med
  // animationen inkorporerad") ----------
  // 32 × 48 punkter som på kartan, foten mitt nere. f (0–1) är hur långt varvet har kommit, på åtta bilder:
  // molnet överst virvlar i en spiral, tratten är en cylinder med ränder som går snett runt och flyttar sig ett varv,
  // tratten svajar mest längst ner, dammet vid foten virvlar runt i en ring och kvistar och löv flyger runt tratten,
  // framför den på ena sidan och bakom den på den andra. Allt utom dammet har en mörk kant.
  const S = 1.5; // storleken (Björn 2026-11-04: "gör den större"): 1,5 gånger kartans förra tornado, 48 × 72 punkter
  const TN = { w: 48, h: 72, cx: 23.5, fot: 65 };
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
  function tornado(B, x0, y0, f) {
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
    for (let y = 0; y < 26; y++) for (let x = 0; x < TN.w; x++) {
      const u = (x - TN.cx) / (15 * S), w = (y - 12) / (6.2 * S), r = Math.hypot(u, w), ang = Math.atan2(w, u);
      if (r > 0.9 + Math.sin(ang * 5 + v) * 0.1 + Math.sin(ang * 9 - v * 2) * 0.06) continue;
      const arm = Math.sin(ang * 2 + r * 7 - v * 2) + (hash(x >> 1, y, 983 + bnr) - 0.5) * 0.6;
      satt(ett, x, y, r < 0.16 ? P.i('kol', 2) : r > 0.8 ? P.i('skiffer', 1) : arm > 0.45 ? P.i('ben', 2) : arm < -0.3 ? P.i('skiffer', 1) : P.i('skiffer', 2));
    }
    // kanten runt molnet, med luckor, och bara en gles kant runt tratten så att den inte blir för ren
    const kant = ett.map(r => [...r]);
    for (let y = 0; y < TN.h; y++) for (let x = 0; x < TN.w; x++) if (ett[y][x] < 0 && hash(x, y, 984 + bnr) > (y < 9 * S ? 0.2 : 0.62) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (ett[y + dy]?.[x + dx] ?? -1) >= 0)) kant[y][x] = P.i('kol', 0);
    // dammet: ett moln av jord vid foten, korn som virvlar runt i en ring och damm som stiger i en spiral längs tratten
    for (let y = -11; y <= 5; y++) for (let x = -23; x <= 23; x++) {
      const e = (x / 23) ** 2 + (y / (y < 0 ? 10 : 6)) ** 2 + (Math.sin(Math.atan2(y, x) * 4 + v) * 0.18);
      if (e < 1 && hash(x, y, 970) < 1.2 - e) { const q = hash(x + bnr * 3, y, 971); prick(B, x0 + TN.cx + x, y0 + TN.fot + y, q < 0.2 ? 'ben' : 'jord', q < 0.2 ? 1 : q < 0.55 ? 3 : 2); }
    }
    const runt = (bak) => {
      for (let k = 0; k < 26; k++) { // ringen vid foten
        const a = v + k * 2 * Math.PI / 26 + (k % 2) * 0.2, R = S * (7 + (k % 4) * 2.2), si = Math.sin(a); if ((si < 0) !== bak) continue;
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
        const t = (f + k / 48) % 1, yy = TN.fot - 3 - t * 40, a = v * 2 + k * 2.4, si = Math.sin(a); if ((si < 0) !== bak) continue;
        const x = x0 + mitt(yy) + Math.cos(a) * (bredd(yy) + 1.5 + (k % 3)), y = y0 + yy + si * 1.5;
        prick(B, x, y, 'jord', t > 0.6 ? 2 : 3); if (k % 3 === 0 && t < 0.5) prick(B, x + 1, y, 'jord', 2); if (k % 4 === 1 && t < 0.35) prick(B, x, y - 1, 'jord', 3);
      }
      for (const [yy0, m, ut0, sort] of SKRAP) { const yy = yy0 * S, ut = ut0 * S; // kvistar, löv, stenar och gräs
        const a = v * m + yy * 1.9, si = Math.sin(a); if ((si < 0) !== bak) continue;
        const x = x0 + mitt(yy) + Math.cos(a) * (bredd(yy) + ut), y = y0 + yy + si * 2.5 + Math.sin(v + yy) * 1.2;
        const spegel = Math.cos(a) < 0 ? -1 : 1;
        for (const [dx, dy, ramp, ton] of SKRAPFORM[sort]) prick(B, x + dx * spegel, y + dy, ramp, ton);
      }
    };
    runt(true);
    kant.forEach((r, y) => r.forEach((c, x) => { if (c >= 0) B.satt(x0 + x, y0 + y, c); }));
    runt(false);
  }

  // ---------- det som står på marken i exemplen ----------
  function vatten(B, cx, cy, rx, ry) { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) { const e = (x / rx) ** 2 + (y / ry) ** 2; if (e <= 1) B.satt(cx + x, cy + y, B.P.i('skiffer', e > 0.7 ? 1 : y < 0 ? 0 : 1)); } }
  function knol(B, x, y) { for (const [dx, dy, t] of [[-1, 0, 1], [0, 0, 2], [1, 0, 1], [2, 0, 0], [-1, -1, 2], [0, -1, 3], [1, -1, 2], [0, -2, 2]]) B.satt(x + dx, y + dy, B.P.i('skiffer', t)); for (let dx = -1; dx <= 2; dx++) B.morka(x + dx, y + 1); }
  function grop(B, x, y) { for (let j = -2; j <= 2; j++) for (let i = -5; i <= 5; i++) if (i * i / 25 + j * j / 4 <= 1) B.satt(x + i, y + j, B.P.i('jord', j < 0 ? 0 : 1)); }
  function buske(B, x, y) {
    for (let j = -6; j <= 0; j++) for (let i = -5; i <= 5; i++) { const e = (i / 5.5) ** 2 + ((j + 3) / 3.6) ** 2; if (e <= 1) B.satt(x + i, y + j, B.P.i(e > 0.75 ? 'kol' : 'barr', e > 0.75 ? 0 : (i + j) % 3 ? 2 : 1)); }
    for (const [i, j] of [[-3, -3], [1, -4], [3, -2], [-1, -1]]) prick(B, x + i, y + j, 'rost', 2);
  }
  function svamp(B, x, y) { prick(B, x, y, 'ben', 3); prick(B, x, y - 1, 'ben', 2); for (let i = -1; i <= 1; i++) prick(B, x + i, y - 2, 'rost', i < 0 ? 2 : 1); prick(B, x, y - 3, 'rost', 2); B.morka(x - 1, y + 1); B.morka(x + 1, y + 1); }
  function pinne(B, x, y) { for (let i = 0; i < 5; i++) prick(B, x + i, y - (i > 2 ? 1 : 0), 'jord', i % 2 ? 1 : 2); B.morka(x + 1, y + 1); B.morka(x + 3, y + 1); }
  function skinn(B, x, y) { for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) prick(B, x + i, y + j, 'senap', j ? 1 : 2); }
  function hydda(B, x, by) {
    const P = B.P;
    for (let y = by - 8; y <= by; y++) for (let i = 0; i < 22; i++) {
      const kant = i === 0 || i === 21 || y === by, st = (by - y) % 3;
      let v = kant ? P.i('kol', 0) : P.i('jord', st);
      if (i >= 8 && i <= 12 && y >= by - 6 && !kant) v = i === 8 || i === 12 || y === by - 6 ? P.i('kol', 1) : P.i('kol', 0);
      B.satt(x + i, y, v);
    }
    for (let j = 0; j <= 9; j++) for (let i = -2 + j; i <= 23 - j; i++) {
      if (j === 9 && i >= 10 && i <= 12) continue;
      const kant = i === -2 + j || i === 23 - j || j === 0; B.satt(x + i, by - 9 - j, kant ? P.i('kol', 0) : (i + j * 3) % 7 === 0 ? P.i('oliv', 1) : P.i('oliv', j < 3 ? 2 : 3));
    }
    for (let i = 10; i <= 12; i++) B.satt(x + i, by - 18, P.i('kol', 0));
  }

  // ---------- en handling ----------
  // en bybo i kartfigurens läge; ger handen
  function figur(B, x, fot, fro, rikt, ben, arm) {
    if (!window.BYBO) return null;
    const F = window.BYBO(fro, rikt, ben, arm, null), x0 = Math.round(x) - (F.w >> 1), y0 = fot - F.h + 1;
    for (let dx = -3; dx <= 3; dx++) B.morka(Math.round(x) + dx, fot + 1);
    for (let y = 0; y < F.h; y++) for (let dx = 0; dx < F.w; dx++) { const v = F.px[y * F.w + dx]; if (v >= 0) B.satt(x0 + dx, y0 + y, v); }
    return F.hand ? [x0 + F.hand[0], y0 + F.hand[1]] : null;
  }
  // h: { rorelse, redskap, effekt, material, sak (det som plockas eller kastas), mal (det som står framför), rSla (en
  // annan riktning vid slaget) }; x och fot är var personen står i scenen
  function handling(B, h, x, fot, ruta, fro) {
    const R = RORELSER[h.rorelse], b = R.bilder[ruta], ben = b.ben || (R.sitta ? 'sitta' : 'sta');
    if (h.mal) h.mal(B, x, fot, b);
    const hand = figur(B, x + (b.ut || 0), fot, fro, 'sida', ben, b.arm); if (!hand) return;
    const r = (b.steg && h.rSla) || b.r || [0, 1], kastat = h.rorelse === 'kasta' && !b.hand;
    const t = h.redskap && !kastat ? redskap(B, h.redskap, hand, r, 1) : hand;
    if (b.hand && h.sak && !h.redskap) h.sak(B, hand[0], hand[1] + 1);
    if (b.flyg && h.sak) { const f = b.flyg; h.sak(B, hand[0] + (f === 1 ? 5 : 13), hand[1] - (f === 1 ? 3 : 1)); for (let k = 1; k < (f === 1 ? 3 : 6); k++) B.morka(hand[0] + k * 2, hand[1] + 6); }
    if (b.steg && h.effekt === 'splitter') splitter(B, t, b.steg, h.material, R.sitta);
    if (b.steg === 1 && h.effekt === 'traff') traff(B, t[0] + 1, t[1]);
  }
  // en motståndare som tar emot slaget: skyddar sig och knuffas bakåt efter träffen
  const motstandare = (avst, fro) => (B, x, fot, b) => { figur(B, x + avst + (b.steg === 2 ? 2 : 0), fot, fro, 'vast', 'sta', b.steg ? 'hanga' : 'framfor'); };

  const HANDLINGAR = { // exemplen på kortet: en rad per rörelse
    sla: [
      { namn: 'hugga', rorelse: 'sla', redskap: 'yxa', effekt: 'splitter', material: 'tra', mal: (B, x, fot) => MARK.stubbe(B, x + 9, fot, 7, 'gran', 0) },
      { namn: 'slå flinta', rorelse: 'sla', redskap: 'sten', effekt: 'splitter', material: 'sten', mal: (B, x, fot) => knol(B, x + 5, fot) },
      { namn: 'gräva', rorelse: 'sla', redskap: 'spade', effekt: 'splitter', material: 'jord', mal: (B, x, fot) => grop(B, x + 9, fot + 1) },
      { namn: 'slåss', rorelse: 'sla', redskap: 'klubba', effekt: 'traff', rSla: [1, 0], mal: motstandare(15, 7211) }],
    stota: [
      { namn: 'fiska', rorelse: 'stota', redskap: 'spjut', effekt: 'splitter', material: 'vatten', rSla: [1, 1], mal: (B, x, fot) => vatten(B, x + 16, fot + 1, 8, 3) },
      { namn: 'slåss med spjut', rorelse: 'stota', redskap: 'spjut', effekt: 'traff', mal: motstandare(19, 7311) },
      { namn: 'slakta', rorelse: 'stota', redskap: 'kniv', effekt: 'splitter', material: 'blod', rSla: [1, 1], mal: (B, x, fot) => { for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) prick(B, x + 6 + i, fot - j, j ? 'jord' : 'senap', j ? 2 : 1); } }],
    plocka: [
      { namn: 'plocka bär', rorelse: 'plocka', sak: (B, x, y) => prick(B, x, y, 'rost', 2), mal: (B, x, fot) => buske(B, x + 8, fot) },
      { namn: 'plocka svamp', rorelse: 'plocka', sak: (B, x, y) => { prick(B, x, y, 'rost', 2); prick(B, x, y + 1, 'ben', 3); }, mal: (B, x, fot, b) => { if (!b.hand) svamp(B, x + 5, fot); } },
      { namn: 'ta upp ved', rorelse: 'plocka', sak: (B, x, y) => { for (let i = -1; i <= 2; i++) prick(B, x + i, y, 'jord', 2); }, mal: (B, x, fot, b) => { if (!b.hand) pinne(B, x + 3, fot); } }],
    pyssla: [
      { namn: 'tälja', rorelse: 'pyssla', redskap: 'kniv', effekt: 'splitter', material: 'tra' },
      { namn: 'sy', rorelse: 'pyssla', redskap: 'nal', mal: (B, x, fot) => skinn(B, x + 2, fot - 6) },
      { namn: 'skrapa skinn', rorelse: 'pyssla', redskap: 'sten', effekt: 'splitter', material: 'blod', mal: (B, x, fot) => skinn(B, x + 5, fot - 1) }],
    kasta: [
      { namn: 'kasta sten', rorelse: 'kasta', redskap: 'sten', sak: (B, x, y) => huvud(B, 'sten', [x, y], [1, 0], [0, 1]) },
      { namn: 'kasta spjut', rorelse: 'kasta', redskap: 'spjut', sak: (B, x, y) => { for (let i = -4; i <= 3; i++) prick(B, x + i, y, 'jord', 2); prick(B, x + 4, y, 'skiffer', 3); prick(B, x + 5, y, 'skiffer', 2); } },
      { namn: 'kasta snöboll', rorelse: 'kasta', redskap: 'snoboll', sak: (B, x, y) => huvud(B, 'snoboll', [x, y], [1, 0], [0, 1]) }],
  };
  const CW = 46, CH = 34, RADER = Object.keys(HANDLINGAR);
  const RORELSEKORT = SCEN(CW * 4, CH * RADER.length + 2, (B, P, ruta) => {
    gras(B);
    RADER.forEach((rad, j) => HANDLINGAR[rad].forEach((h, i) => handling(B, h, i * CW + 12, j * CH + CH - 3, ruta, 5000 + j * 97 + i * 13)));
  });
  // sjön på kortet: en form, och färgerna är spelets vatten och strand (MARK.spelVatten), så att bara animationerna är
  // nya. Avståndet i punkter (strandAvst) blir rutor för färgerna och punkter för vågorna och skumranden.
  const iSjo = (x, y) => ((x - 180) / 60) ** 2 + ((y - 44) / 28) ** 2 + 0.07 * Math.sin(x * 0.31) + 0.06 * Math.sin(y * 0.47 + x * 0.13) < 1;
  let SJO = null, SJOAVST = null;
  const EFFEKTKORT = { ...SCEN(210, 72, null), rutor: SLAG, rita: (B, P, slag) => {
    gras(B);
    if (!SJO) {
      const geo = strandAvst(B, iSjo, 24);
      SJOAVST = geo.map((a, k) => MARK.spelSd(k % B.w, Math.floor(k / B.w), (a > 0 ? a - 0.5 : a + 0.5) / 16));
      SJO = strandAvst(B, (x, y) => SJOAVST[y * B.w + x] > 0, 4); // vågorna och skummet följer kanten som syns
    }
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) { const c = MARK.spelVatten(x, y, SJOAVST[y * B.w + x], P); if (c !== null) B.satt(x, y, c); }
    const cx = 26, cy = 50, rok1 = bild(slag, 'rok');
    ritaEld(B, cx, cy, P, { lagor: LAGOR[bild(slag, 'eld')] }); gnistor(B, cx, cy - 10, bild(slag, 'gnistor')); rok(B, cx, cy - 13, rok1, 30);
    hydda(B, 58, 58); rok(B, 69, 40, (rok1 + 2) % 4, 28);
    vagor(B, SJO, bild(slag, 'vagor'), 22); stranden(B, SJO, bild(slag, 'stranden'));
  } };

  const TORNADOKORT = { ...SCEN(104, 84, null), rutor: SLAG, rita: (B, P, slag) => { gras(B); tornado(B, 28, 6, bild(slag, 'tornado') / 8); } };
  const BRANDKORT = { ...SCEN(112, 56, null), rutor: SLAG, rita: (B, P, slag) => {
    gras(B);
    ritaGran(B, 84, 38, 26, P, { tid: 'dag' }); ritaGran(B, 100, 30, 20, P, { tid: 'dag' });
    const rutor = [[16, 36], [32, 22], [32, 38], [48, 38], [64, 24]];
    for (const del of ['rok', 'bild']) rutor.forEach(([x, y]) => brand(B, x, y, slag, (x * 31 + y * 17) % 101 / 101, del));
  } };
})();

