// ---------- gränssnittets bilder (steg 5.2.4.7, till 5.3.1.2, 5.3.1.4 och 5.3.3.1) och vektorbilderna (5.2.4.2) ----------
// Banden, emblemen, hörnen och vågbandet är Björns skisser efter v207 (avsnittet Gränssnittet), nu i hel skala som bilder
// i paletten (GUI i gui.json: rader och pal, som sakernas bilder). Runstenarna ritas här ur flikens färger och emblemet,
// så att varje flik har samma sten i tre lägen: stängd, öppen och blek. Vektorbilderna (framstegscirkeln, ringen runt en
// teknik eller ett redskap, tårtan över den vakna tiden) ritas punkt för punkt ur hur långt det kommit.
(() => {
  const SCEN = (w, h, rita) => ({ w, h, stor: true, rita });
  const fyll = (B, c) => { for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, c); };
  // en bild ur gui.json med övre vänstra hörnet i x, y; spegel vänder den åt vänster eller uppåt
  function bild(B, b, x, y, sx = false, sy = false) {
    for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) {
      const ch = b.rader[sy ? b.h - 1 - j : j][sx ? b.w - 1 - i : i];
      if (ch !== '.') B.satt(x + i, y + j, B.P.av(b.pal[ch]));
    }
  }
  // flikarnas färger: huvudfärg och andrafärg ur Starkare i paletten (Björns beslut efter v207; Tro är ett förslag)
  const FLIK = [
    ['kronika', 'Krönika', 'rost', 'kol'], ['seder', 'Seder', 'skiffer', 'senap'], ['styre', 'Styre', 'rost', 'senap'],
    ['teknik', 'Teknik', 'kol', 'rost'], ['forrad', 'Förråd', 'oliv', 'senap'], ['folket', 'Folket', 'barr', 'rost'], ['tro', 'Tro', 'senap', 'ben']];

  // ---------- runstenarna ----------
  // en båge i flikens huvudfärg runt en grå sten med emblemet; öppen: bågen i andrafärgen och stenen i huvudfärgen;
  // blek: allt i benets ljusa toner (fliken går inte att öppna än)
  const SW = 22, SH = 28;
  function runsten(B, x0, y0, flik, lage) {
    const P = B.P, [id, , hu, an] = flik, cx = (SW - 1) / 2, ry = 10;
    const ute = (x, y, r) => y >= ry ? Math.abs(x - cx) <= r : (x - cx) ** 2 + (y - ry) ** 2 <= r * r;
    const bleck = lage === 'blek', oppen = lage === 'oppen';
    const bage = oppen ? an : hu;
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
      if (!ute(x, y, 10.6)) continue;
      let c;
      if (y === SH - 1 || !ute(x, y, 9.6)) c = bleck ? P.i('ben', 0) : P.i('kol', 0); // konturen
      else if (ute(x, y, 6.6)) { // stenen
        if (y === SH - 2 || !ute(x, y, 5.8)) c = bleck ? P.i('ben', 1) : P.i('kol', 0);
        else if (bleck) c = P.i('ben', 2);
        else if (oppen) c = P.i(hu, x < cx - 3 ? 3 : 2);
        else c = x < cx - 3 ? P.i('ben', 1) : P.i('ben', 0);
      } else { // bågen: ljus till vänster, mörk till höger
        const t = x < cx - 4 ? 3 : x > cx + 4 ? 1 : 2;
        c = bleck ? P.i('ben', t > 2 ? 2 : 1) : P.i(bage, bage === 'kol' ? t : t);
      }
      B.satt(x0 + x, y0 + y, c);
    }
    const E = GUI.emblem[id], ew = E[0].length, eh = E.length, ex = x0 + Math.round(cx - (ew - 1) / 2), ey = y0 + 9 + Math.round((14 - eh) / 2);
    const ef = bleck ? P.i('senap', 1) : oppen ? P.i('kol', 0) : P.i(hu, hu === 'kol' ? 0 : 0);
    for (let j = 0; j < eh; j++) for (let i = 0; i < ew; i++) if (E[j][i] === '#') B.satt(ex + i, ey + j, ef);
  }
  const STENAR = SCEN(FLIK.length * (SW + 6) + 8, 3 * (SH + 6) + 6, B => {
    fyll(B, B.P.i('ben', 2));
    ['stangd', 'oppen', 'blek'].forEach((l, r) => FLIK.forEach((f, i) => runsten(B, 6 + i * (SW + 6), 5 + r * (SH + 6), f, l)));
  });

  // ---------- banden och emblemen överst i varje flik ----------
  const BANDEN = FLIK.filter(f => GUI.band[f[0]]);
  const BAND = SCEN(2 * 156 + 12, Math.ceil(BANDEN.length / 2) * 40 + 8, B => {
    const P = B.P; fyll(B, P.i('ben', 2));
    BANDEN.forEach((f, i) => {
      const x = 6 + (i % 2) * 156, y = 5 + Math.floor(i / 2) * 40;
      for (let yy = 0; yy < 36; yy++) for (let xx = 0; xx < 152; xx++) B.satt(x + xx, y + yy, xx === 0 || yy === 0 || xx === 151 || yy === 35 ? P.i('kol', 0) : P.i('ben', 3));
      const b = GUI.band[f[0]]; bild(B, b, x + Math.round((152 - b.w) / 2), y + 5);
    });
  });

  // ---------- vågbandet längst ner i raden överst ----------
  const VAG = SCEN(320, 64, B => {
    const P = B.P, t = GUI.vag;
    fyll(B, P.av(GUI.vagbg));
    for (let x = 0; x < B.w; x += t.w) bild(B, t, x, 22);
    for (let y = 22 + t.h; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, window.MARK ? window.MARK.grasPunkt(x, y + 300, P, 1) : P.i('oliv', 2));
    if (window.MARK) window.MARK.tuvor({ ...B, satt: (x, y, c) => y > 22 + t.h && B.satt(x, y, c) }, 1, () => true, 0.6);
  });

  // ---------- hörnen: tre versioner (Ormen, Ring med blad, Dubbel ögla) ----------
  const HORN = k => SCEN(350, 124, B => {
    const P = B.P, h = GUI.horn[k]; fyll(B, P.i('ben', 2));
    bild(B, h.grund, 8, Math.round((B.h - h.grund.h) / 2)); bild(B, h.seder, 8 + h.grund.w + 18, Math.round((B.h - h.seder.h) / 2));
  });

  // ---------- vektorbilderna som pixelbilder (5.2.4.2, till 5.3.2.2) ----------
  // vinkeln medsols från klockan tolv, 0 till 1
  const vinkel = (dx, dy) => { const a = Math.atan2(dx, -dy) / (2 * Math.PI); return a < 0 ? a + 1 : a; };
  // framstegscirkeln: en mörk bricka med ljus kant som fylls med gult medsols från klockan tolv
  function framsteg(B, cx, cy, r, p) {
    const P = B.P;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y); if (d > r + 0.3) continue;
      const kant = d > r - 0.9, fylld = p >= 1 || (p > 0 && vinkel(x + 0.0001, y) < p);
      B.satt(cx + x, cy + y, kant ? P.i('ben', 3) : fylld ? P.i('senap', 3) : P.i('kol', 0));
    }
  }
  const STEG = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
  const FRAMSTEG = SCEN(STEG.length * 22 + 8, 56, B => {
    const P = B.P;
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, y < 24 ? (window.MARK ? window.MARK.grasPunkt(x, y, P, 1) : P.i('oliv', 2)) : P.i('ben', 3));
    STEG.forEach((p, i) => { framsteg(B, 12 + i * 22, 11, 4, p); framsteg(B, 12 + i * 22, 39, 7, p); });
  });
  // ringen runt en teknik i teknikträdet eller ett redskap i handen: en linje som växer medsols från toppen
  function ring(B, x0, y0, s, p, fyrkant) {
    const P = B.P, c = (s - 1) / 2;
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) B.satt(x0 + x, y0 + y, P.i('ben', 2)); // knappen
    for (let y = 3; y < s - 3; y++) for (let x = 3; x < s - 3; x++) B.satt(x0 + x, y0 + y, P.i('ben', 3));
    // symbolen i mitten: en flintyxa i små drag
    const yx = ['..oo..', '.oddo.', 'odddo.', '.ooj..', '...j..', '...j..', '...j..'];
    yx.forEach((r, j) => [...r].forEach((ch, i) => ch !== '.' && B.satt(x0 + Math.round(c) - 3 + i, y0 + Math.round(c) - 3 + j, ch === 'o' ? P.i('kol', 0) : ch === 'd' ? P.i('skiffer', 2) : P.i('jord', 1))));
    for (let y = -1; y <= s; y++) for (let x = -1; x <= s; x++) {
      const dx = x - c, dy = y - c;
      let pa;
      if (fyrkant) { const r = 3, ax = Math.max(Math.abs(dx) - (c - r), 0), ay = Math.max(Math.abs(dy) - (c - r), 0), d = Math.hypot(ax, ay); pa = (Math.abs(dx) > c - 1.5 || Math.abs(dy) > c - 1.5) && d <= r + 0.5 && d >= r - 1.2; }
      else { const d = Math.hypot(dx, dy); pa = d <= c + 0.6 && d >= c - 1.4; }
      if (pa && p > 0 && vinkel(dx + 0.0001, dy) <= p) B.satt(x0 + x, y0 + y, P.i('rost', 2));
    }
  }
  const RINGAR = SCEN(6 * 30 + 8, 64, B => {
    const P = B.P; for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, P.i('ben', 3));
    [0, 0.2, 0.4, 0.6, 0.8, 1].forEach((p, i) => { ring(B, 6 + i * 30, 4, 22, p, false); ring(B, 6 + i * 30, 36, 22, p, true); });
  });
  // tårtan: delarna i flikens ordning, med en tunn linje i panelens färg mellan dem; den valda lyser och resten bleknar
  const TARTFARG = [['oliv', 3], ['senap', 3], ['rost', 2], ['skiffer', 3], ['jord', 3], ['barr', 2], ['ben', 1]];
  function tart(B, cx, cy, r, delar, vald = -1) {
    const P = B.P, tot = delar.reduce((a, b) => a + b, 0);
    const grans = []; let acc = 0; for (const d of delar) { acc += d / tot; grans.push(acc); }
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y); if (d > r + 0.3) continue;
      const a = vinkel(x + 0.0001, y), i = grans.findIndex(g => a < g), j = i < 0 ? delar.length - 1 : i;
      // linjen mellan två delar: nära en gräns i vinkel, mätt i punkter längs bågen
      const near = grans.some(g => { const dv = Math.abs(a - g); return Math.min(dv, 1 - dv) * 2 * Math.PI * d < 0.7; }) && d > 1;
      let c;
      if (d > r - 0.7) c = P.i('kol', 0);
      else if (near) c = P.i('ben', 3);
      else { const [ra, t] = TARTFARG[j % TARTFARG.length]; c = vald >= 0 && vald !== j ? P.i('ben', 1) : P.i(ra, t); }
      B.satt(cx + x, cy + y, c);
    }
  }
  const TARTA = SCEN(3 * 46 + 8, 50, B => {
    const P = B.P; for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, P.i('ben', 3));
    tart(B, 26, 25, 20, [40, 25, 15, 10, 6, 4]); tart(B, 72, 25, 20, [55, 30, 15]); tart(B, 118, 25, 20, [40, 25, 15, 10, 6, 4], 1);
  });

  const T = 'Steg 5.2.4.7: ', T2 = 'Steg 5.2.4.2, till 5.3.2.2: ';
  VAL.push(
    { id: 'g_runsten', stor: true, namn: 'Runstenarna', typ: 'janej', vad: T + 'flikarnas knappar (till 5.3.3.1) i hel skala, 22 × 28 punkter, efter skissen: en båge i flikens färg runt en grå sten med emblemet. Översta raden stängda, i mitten öppna (bågen i andrafärgen och stenen i huvudfärgen) och nederst bleka (fliken går inte att öppna än). Tros färger (senap och ben) är ett förslag. Person och Grannar har ingen sten än.',
      versioner: [{ text: 'Version 1: sju runstenar i tre lägen.', ...STENAR }] },
    { id: 'g_band', stor: true, namn: 'Flikarnas band och emblem', typ: 'janej', vad: T + 'banden och emblemen överst i flikarna (till 5.3.3.1) från dina skisser efter v207, nu som bilder i paletten i hel skala, 140 × 26 punkter: Seder (orm med två huvuden och vågen), Styre (ringkedja och högsätet), Teknik (smidd kedja, hammare och tång), Förråd (sädesax), Krönika (runband och runstenen) och Folket (människor hand i hand). Tro, Person och Grannar har inget band än.',
      versioner: [{ text: 'Version 1: de sex banden.', ...BAND }] },
    { id: 'g_vag', stor: true, namn: 'Vågbandet', typ: 'janej', vad: T + 'vågbandet längst ner i raden överst (till 5.3.1.2), spiraler i kol på beige med en linje under som ligger mot kartan. En ruta på 8 × 7 punkter som upprepas över hela bredden.',
      versioner: [{ text: 'Version 1: vågbandet mot kartan.', ...VAG }] },
    { id: 'g_horn', stor: true, namn: 'Hörnen på panelerna', typ: 'tre', vad: T + 'hörnen på panelerna (till 5.3.1.4), som sticker ut utanför ramen. De tre du sparade att fundera vidare på, i hel skala; till vänster i grundens färger och till höger i Seders färger.',
      versioner: [
        { text: 'Version 1: Ormen.', ...HORN('ormen') },
        { text: 'Version 2: Ring med blad.', ...HORN('ring') },
        { text: 'Version 3: Dubbel ögla.', ...HORN('ogla') }] },
    { id: 'v_framsteg', stor: true, namn: 'Framstegscirkeln', typ: 'janej', vad: T2 + 'cirkeln för det som inte är klart, i pixlar i stället för en vektorbild: en mörk bricka med ljus kant som fylls med gult medsols från klockan tolv. Överst på kartan (9 × 9 punkter), nederst i panelen (15 × 15), från tomt till fullt i åttondelar.',
      versioner: [{ text: 'Version 1: framstegscirkeln i pixlar.', ...FRAMSTEG }] },
    { id: 'v_ring', stor: true, namn: 'Ringen runt en teknik', typ: 'janej', vad: T2 + 'ringen runt en teknik i teknikträdet (hur nära den är) och runt ett redskap i handen (skicket), i pixlar: en linje i rost som växer medsols från toppen. Överst rund, nederst fyrkantig med rundade hörn som händernas rutor; 0, 20, 40, 60, 80 och 100 %.',
      versioner: [{ text: 'Version 1: ringarna i pixlar.', ...RINGAR }] },
    { id: 'v_tart', stor: true, namn: 'Tårtan över den vakna tiden', typ: 'janej', vad: T2 + 'tårtan i personens tid, i pixlar: varje del i en färg ur paletten, med en tunn ljus linje mellan delarna och en mörk kant. Till höger med en del vald: den lyser och de andra bleknar.',
      versioner: [{ text: 'Version 1: tårtan i pixlar.', ...TARTA }] },
  );
})();
