// ---------- animationerna (steg 5.2.4.8, till 5.1.9) ----------
// Få och generella delar som handlingarna pekar på (Björn 2026-11-04: inte en animation per sak). Tre register:
//   RORELSER: kroppens rörelser, som följder av kartfigurens armlägen (skapare.js) i fyra bilder: slå, stöta, plocka,
//             pyssla och kasta (gå och bära finns redan i kartfiguren)
//   REDSKAP:  redskapet i handen som skaft och huvud, ritat i armens riktning, så att ett nytt redskap är en rad
//   EFFEKTER: splitter (färgen efter materialet i MATERIAL), rök, gnistor, träffen, lågorna, glittret, vågorna och
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
  const HASTIGHET = { eld: 1, gnistor: 1, rok: 2, glitter: 3, vagor: 4, stranden: 8 };
  const EGNA = { vagor: 8 }; // effekter med fler än fyra egna bilder
  const bild = (slag, namn) => Math.floor(slag / HASTIGHET[namn]) % (EGNA[namn] || RUTOR);
  const SLAG = 96; // så många slag innan allt börjar om: delbart med alla hastigheter gånger bilderna (12, 32)
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
  function glitter(B, cx, cy, rx, ry, ruta) {
    for (let k = 0; k < 7; k++) {
      const a = hash(k, ruta, 900) * 6.28, d = Math.sqrt(hash(k, ruta, 901)), x = Math.round(cx + Math.cos(a) * rx * d * 0.8), y = Math.round(cy + Math.sin(a) * ry * d * 0.7);
      prick(B, x, y, 'ben', 3); if (k % 2) prick(B, x + 1, y, 'skiffer', 3);
    }
  }

  // stranden och vågorna: en sjö är en funktion i(x, y) (sant i vattnet), och avståndet till stranden räknas i punkter.
  // Vågorna är korta ljusa streck som rullar en punkt per bild och tänds och slocknar, och vid stranden sköljer en
  // skumrand upp på sanden och drar sig tillbaka, i samma fyra bilder som allt annat. Bara vattnet nära stranden och
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
  const iSjo = (x, y) => ((x - 178) / 64) ** 2 + ((y - 44) / 30) ** 2 + 0.07 * Math.sin(x * 0.31) + 0.06 * Math.sin(y * 0.47 + x * 0.13) < 1;
  let SJO = null;
  const EFFEKTKORT = { ...SCEN(210, 72, null), rutor: SLAG, rita: (B, P, slag) => {
    gras(B);
    if (!SJO) SJO = strandAvst(B, iSjo, 4);
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) {
      const a = SJO[y * B.w + x];
      if (a > 0) B.satt(x, y, a > 9 ? P.i(hash(x, y, 930) < 0.5 ? 'barr' : 'skiffer', 0) : a > 4 ? P.i('skiffer', 0) : P.i('skiffer', a > 2 ? 1 : 2));
      else if (a >= -3) B.satt(x, y, P.i(hash(x, y, 931) < 0.25 ? 'jord' : 'senap', hash(x, y, 931) < 0.25 ? 2 : 0)); // sanden
    }
    const cx = 26, cy = 50, rok1 = bild(slag, 'rok');
    ritaEld(B, cx, cy, P, { lagor: LAGOR[bild(slag, 'eld')] }); gnistor(B, cx, cy - 10, bild(slag, 'gnistor')); rok(B, cx, cy - 13, rok1, 30);
    hydda(B, 58, 58); rok(B, 69, 40, (rok1 + 2) % 4, 28);
    vagor(B, SJO, bild(slag, 'vagor'), 22); stranden(B, SJO, bild(slag, 'stranden')); glitter(B, 182, 46, 30, 14, bild(slag, 'glitter'));
  } };

  VAL.push(
    { id: 'a_rorelser', stor: true, namn: 'Rörelserna', typ: 'janej', vad: 'Steg 5.2.4.8 (till 5.1.9.4 och 5.1.9.5): fem generella rörelser i fyra bilder, som alla handlingar använder. Varje rad är en rörelse och varje ruta en handling som använder den. Slå: hugga, slå flinta, gräva och slåss. Stöta: fiska, slåss med spjut och slakta. Plocka: bär, svamp och ved. Pyssla (sittande): tälja, sy och skrapa skinn. Kasta: sten, spjut och snöboll. Redskapet ritas ur handen som skaft och huvud, och splittret får materialets färg (trä, sten, jord, vatten, blod). En ny handling blir en rad: rörelse, redskap, effekt och material.',
      versioner: [{ text: 'Version 1: de fem rörelserna med exempel.', ...RORELSEKORT }] },
    { id: 'a_effekter', stor: true, namn: 'Effekterna', typ: 'janej', vad: 'Steg 5.2.4.8 (till 5.1.9.1 och 5.1.9.2): lågorna, gnistorna och röken från elden, röken från rökhålet i en hydda (hyddan är en platshållare) små vågor och glitter på vattnet och vattnet som sköljer upp på stranden och drar sig tillbaka. Varje effekt har sin hastighet: elden fladdrar fort, röken stiger lugnare, glittret blinkar långsamt, en våg lever i sju sekunder och stranden sköljer upp och tillbaka på sju sekunder. Splittret och träffen syns på kortet Rörelserna. Träd och gräs svajar inte, för då skulle hela marken ritas om hela tiden.',
      versioner: [{ text: 'Version 1: eld, rök, vågor och stranden.', ...EFFEKTKORT }] },
  );
})();
