// Björns svar på fyra kort (grodden, den som brinner, siffrorna och det som torkar): nya versioner som byter ut korten i VAL
// med samma id. Ritfunktionerna som behövs är kopierade hit ur fas6.js och fas8/8.1-rattelser.js (de är inte exporterade).
(() => {
  const S = 'Steg ';
  const byt = kort => { const i = VAL.findIndex(s => s.id === kort.id); if (i >= 0) VAL[i] = kort; else VAL.push(kort); };
  // en bild ur bilder/ (rader och pal med hexfärger) i (x0, y0), med färgerna bytta enligt byt (hex till hex) och vriden ett
  // kvarts varv om vrid är 'hoger' (medsols) eller 'vanster' (motsols)
  const vriden = (rader, vrid) => {
    const h = rader.length, w = rader[0].length;
    if (vrid === 'hoger') return Array.from({ length: w }, (_, y) => Array.from({ length: h }, (_, x) => rader[h - 1 - x][y]).join(''));
    if (vrid === 'vanster') return Array.from({ length: w }, (_, y) => Array.from({ length: h }, (_, x) => rader[x][w - 1 - y]).join(''));
    return rader;
  };
  const bildMed = (B, o, x0, y0, farg = {}, vrid) => {
    if (!o) return { w: 0, h: 0 };
    const r = vriden(o.rader, vrid);
    r.forEach((rad, y) => [...rad].forEach((ch, x) => { const c = o.pal[ch]; if (ch === '.' || !c) return; B.satt(x0 + x, y0 + y, B.P.av(farg[c] || c)); }));
    return { w: r[0].length, h: r.length };
  };

  // ---------- steg 5.5.5: den unga grodden i hel skala ----------
  // ny ritning: grodden som just vecklar ut sig. Det vänstra hjärtbladet ligger lågt ut åt sidan, det högra reser sig snett
  // uppåt och bär fortfarande fröskalet på spetsen, stjälken går rakt ner i en liten spricka i jorden
  {
    const ikon = (B, k, x, y, s = 1) => { const r = IKONER.PIX[k], pal = IKONER.PAL[k] || {}; if (!r) return; const n = Math.round(r[0].length * s);
      for (let ty = 0; ty < n; ty++) for (let tx = 0; tx < n; tx++) { const ch = r[Math.floor(ty / s)][Math.floor(tx / s)], c = pal[ch]; if (ch === '.' || !c) continue; if (c.startsWith('rgba')) B.morka(x + tx, y + ty); else B.satt(x + tx, y + ty, B.P.fran(c)); } };
    const GRODD = [
      '.....hH.',
      '....LLHh',
      '...LGGL.',
      'LLLgg...',
      '.GGg....',
      '...g....',
      '...g....',
      '..dJd...',
    ];
    byt({ id: 'f5_grodd', namn: 'Den unga grodden i hel skala', typ: 'janej', vad: S + '5.5.5: grodden på fälten ritades den första halvan av växandet i halv skala (16 punkter i 8). Nu har den en egen bild på 8 punkter, ritad på nytt: grodden som just vecklar ut sig. Det vänstra hjärtbladet ligger lågt ut åt sidan, det högra reser sig snett uppåt med fröskalet kvar på spetsen, och stjälken går ner i en liten spricka i jorden. Till vänster som förut, i mitten den nya och till höger den mogna rovan.', versioner: [{ text: 'Till vänster grodden i halv skala, i mitten den nya bilden på 8 punkter och till höger den mogna rovan, alla mitt på en sådd jordruta.', w: 66, h: 22, rita: B => {
      const P = B.P, jord = P.i('jord', 1), fara = P.i('jord', 0);
      for (const x0 of [3, 25, 47]) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) B.satt(x0 + x, 3 + y, (y + 1) % 4 === 0 && x > 0 && x < 15 ? fara : jord);
      if (IKONER.PIX.grodd) ikon(B, 'grodd', 7, 7, 0.5);
      const L = { L: P.i('oliv', 3), G: P.i('oliv', 2), g: P.i('oliv', 1), H: P.i('ben', 2), h: P.i('jord', 3), d: P.i('jord', 0), J: P.i('jord', 2) };
      GRODD.forEach((r, y) => [...r].forEach((ch, x) => { if (L[ch] !== undefined) B.satt(29 + x, 7 + y, L[ch]); }));
      { const o = BILDFILER.rovor; if (o) o.rader.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.' && o.pal[ch]) B.satt(47 + ((16 - r.length) >> 1) + x, 3 + ((16 - o.rader.length) >> 1) + y, P.fran(o.pal[ch])); })); }
    } }] });
  }

  // ---------- 6.4.16: den som brinner, version 1 med fladdrande lågor ----------
  {
    const W = 96, H = 48, RUTOR = 4, TAKT = 140;
    const mark = (B) => { const P = B.P; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) B.satt(x, y, P.i('oliv', ((x * 5 + y * 3) % 13 === 0) ? 1 : 2)); };
    // bybornas riktiga figurer (window.BYBO, samma som i spelet), stående med fötterna i (x, fot)
    const folk = (B, x, fot, fro, arm = 'hanga') => { if (!window.BYBO) return { w: 8, h: 24 };
      const F = window.BYBO(fro, 'fram', 'sta', arm);
      for (let y = 0; y < F.h; y++) for (let dx = 0; dx < F.w; dx++) { const c = F.px[y * F.w + dx]; if (c >= 0) B.satt(x - (F.w >> 1) + dx, fot - F.h + 1 + y, c); }
      for (let dx = -(F.w >> 1); dx < F.w - (F.w >> 1); dx++) B.morka(x + dx, fot + 1);
      return F; };
    // en låga med foten i (x, y) som fladdrar: i varje bild (f, 0–3) är den olika hög, toppen slår åt sidan, tungorna vid
    // sidan byter sida och ibland slits en lös flamma av överst. Ljus kärna, gul mitt och röd spets som förut
    const HOJD = [0, 2, 1, -1], SVAJ = [0, 1, 0, -1];
    function laga(B, x, y, hojd, f) {
      const P = B.P, h = hojd + HOJD[f], sv = SVAJ[f];
      for (let i = 0; i < h; i++) {
        const dx = i >= h - 3 ? sv : 0, [ramp, ton] = i === 0 ? ['ben', 3] : i < h - 2 ? ['senap', 3 - (i > 2)] : ['rost', 2];
        B.satt(x + dx, y - i, P.i(ramp, ton), true);
        if (i > 0 && i < h - 2) B.satt(x + dx + ((i + f) % 2 ? -1 : 1), y - i, P.i('senap', 2), true);
      }
      if (f === 1) B.satt(x + sv * 2, y - h - 1, P.i('rost', 2), true); // en lös flamma som slits av
      if (f === 2) B.satt(x - 1, y - h, P.i('rost', 1), true);
    }
    const scen = (B, P, ruta) => {
      mark(B);
      const fot = 44, F = folk(B, 24, fot, 4242), h = F.h, w = F.w >> 1;
      [[-w + 1, 0.62, 9], [w - 2, 0.62, 9], [-1, 0.95, 7], [1, 0.97, 9], [-w, 0.42, 7], [w - 1, 0.42, 7]].forEach(([dx, dy, l], k) => laga(B, 24 + dx, fot - Math.round(h * dy), l, (ruta + k * 3) % RUTOR));
      const G = folk(B, 70, fot, 777);
      [[-(G.w >> 1) + 1, 0.65, 10], [(G.w >> 1) - 2, 0.5, 7]].forEach(([dx, dy, l], k) => laga(B, 70 + dx, fot - Math.round(G.h * dy), l, (ruta + k * 2 + 1) % RUTOR));
    };
    byt({ id: 'f6_brinner', namn: 'Den som brinner', typ: 'janej', vad: S + '6.4.16: en människa som börjar brinna i en eldsvåda: lågor på kläderna tills elden är släckt. Hen rullar på marken, går i vattnet eller sliter av sig plagget, och de som står nära hjälper till. Du valde version 1, och nu är lågorna animerade: varje låga växer och krymper, toppen slår åt sidan och ibland slits en lös flamma av. Lågorna fladdrar var och en i sin takt, så att de inte blinkar samtidigt. Din kommentar förra gången: "Utgå från version 1 gör elden animerad"', versioner: [
      { text: 'Version 1 med fladdrande lågor på axlarna, armarna och i håret, fyra bilder.', w: W, h: H, rutor: RUTOR, takt: TAKT, rita: (B, P, ruta = 0) => scen(B, P, ruta) },
    ] });
  }

  // ---------- 6.9.18: siffrorna tillsammans med texten i Pixelify Sans ----------
  // Raderna står som i spelets paneler: ljus text på den mörka panelen. Bokstäverna (och mellanslag, komma och procent)
  // skrivs med Pixelify Sans i den storlek där typsnittets punkter blir ungefär en punkt här (11 px), utan utjämning;
  // siffrorna och kolonet med det föreslagna pixeltypsnittet, med foten på samma baslinje som bokstäverna.
  // Typsnittet laddas från Google Fonts; versionen ritas om varje sekund (två lika bilder), så att den blir rätt när det kommit.
  {
    const SIFF_SILK = { 0: ['.###.', '#..##', '#.#.#', '##..#', '.###.'], 1: ['.#', '##', '.#', '.#', '.#'], 2: ['####.', '....#', '.###.', '#....', '#####'], 3: ['####.', '....#', '.###.', '....#', '####.'], 4: ['#...#', '#...#', '#####', '....#', '....#'], 5: ['#####', '#....', '####.', '....#', '####.'], 6: ['.###.', '#....', '####.', '#...#', '.###.'], 7: ['#####', '....#', '...#.', '..#..', '..#..'], 8: ['.###.', '#...#', '.###.', '#...#', '.###.'], 9: ['.###.', '#...#', '.####', '....#', '.###.'] };
    const SIFF_EGEN = { 0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'], 1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'], 2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'], 3: ['.###.', '#...#', '....#', '..##.', '....#', '#...#', '.###.'], 4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'], 5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'], 6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'], 7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'], 8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'], 9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'] };
    const SIFF_SMAL = { 0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['###', '..#', '###', '#..', '###'], 3: ['###', '..#', '.##', '..#', '###'], 4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '###', '..#', '###'], 6: ['###', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'], 8: ['###', '#.#', '###', '#.#', '###'], 9: ['###', '#.#', '###', '..#', '###'] };
    // storleken och förskjutningen där typsnittets former hamnar bäst på hela punkter (prövat: minst halvtäckta punkter)
    const STORLEK = 10.8125, DX = 0.375, DY = -0.125, K = 8, RAD = 12, BAS = 9; // radavståndet och baslinjen i raden (punkter från radens topp)
    const typsnitt = s => s + 'px "Pixelify Sans"';
    const RADER = ['Ved 12', 'Hälsa 85 %', 'Dag 3, 14:05', 'Bär 2 ved, 16 vikt', 'Torkat kött 1038'];
    let duk = null;
    const harTypsnitt = () => { try { return document.fonts.check(typsnitt(16)); } catch (e) { return false; } };
    // texten t i Pixelify Sans med vänsterkanten i x och foten på raden ovanför y; ger bredden i punkter. Texten skrivs
    // åtta gånger större och varje punkt blir text om minst hälften av den är täckt, så att inget blir utjämnat
    function skriv(B, t, x, y, farg) {
      if (!harTypsnitt()) { try { document.fonts.load(typsnitt(16)); } catch (e) { /* laddas senare */ } }
      duk ??= document.createElement('canvas');
      const g = duk.getContext('2d', { willReadFrequently: true }); g.font = typsnitt(STORLEK);
      const bred = Math.round(g.measureText(t).width), w = bred + 3, hog = 16;
      duk.width = w * K; duk.height = hog * K; g.font = typsnitt(STORLEK * K); g.fillStyle = '#000'; g.textBaseline = 'alphabetic';
      g.fillText(t, DX * K, (12 + DY) * K);
      const d = g.getImageData(0, 0, w * K, hog * K).data;
      for (let yy = 0; yy < hog; yy++) for (let xx = 0; xx < w; xx++) {
        let s = 0; for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) s += d[((yy * K + a) * w * K + xx * K + b) * 4 + 3];
        if (s >= K * K * 255 / 2) B.satt(x + xx, y - 12 + yy, farg);
      }
      return bred;
    }
    const SIFFROR = (text, F) => {
      const w = 124, h = RADER.length * RAD + 8;
      return { text, w, h, rutor: 2, takt: 1000, rita: B => {
        const P = B.P, bak = P.i('kol', 1), farg = P.i('ben', 3);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) B.satt(x, y, x === 0 || y === 0 || x === w - 1 || y === h - 1 ? P.i('kol', 0) : bak);
        RADER.forEach((t, r) => {
          const bas = 4 + r * RAD + BAS + 1; let x = 5;
          for (const del of t.match(/[0-9:]+|[^0-9:]+/g)) {
            if (!/^[0-9:]/.test(del)) { x += skriv(B, del, x, bas, farg); continue; }
            for (const c of del) {
              const hojd = F[0].length;
              if (c === ':') { B.satt(x, bas - hojd + Math.floor(hojd / 2) - 1, farg); B.satt(x, bas - 2, farg); x += 2; continue; }
              F[c].forEach((rad, j) => [...rad].forEach((ch, i) => { if (ch === '#') B.satt(x + i, bas - hojd + j, farg); }));
              x += F[c][0].length + 1;
            }
          }
        });
      } };
    };
    byt({ id: 'f6_siffror', namn: 'Siffrorna', typ: 'tre', vad: S + '6.9.18: siffrorna i spelet (tiden, förrådet, graferna) får ett eget litet pixeltypsnitt i stället för Pixelify Sans. Nu står siffrorna i rader som i spelet, tillsammans med texten i Pixelify Sans: ljust på den mörka panelen, bokstäverna i Pixelify Sans och bara siffrorna (och kolonet) i det nya typsnittet. Din kommentar förra gången: "Visa siffrorna tillsammans med text från den andra fonten vi använder"', versioner: [
      SIFFROR('Som Silkscreen, som står i spelet nu: fem punkter höga och fyrkantiga, lägre än bokstäverna; ettan är smalare än de andra.', SIFF_SILK),
      SIFFROR('Egenritade i samma storlek som Pixelify Sans: sju punkter höga som de stora bokstäverna, och alla lika breda, så att talen står i raka kolumner.', SIFF_EGEN),
      SIFFROR('Smala som Tiny5: fem punkter höga och tre breda, alla lika breda; får plats där det är trångt.', SIFF_SMAL),
    ] });
  }

  // ---------- 8.1.9: det som torkar på ställningen ----------
  // Ställningen är den godkända kartbilden (bilder/tork), och det som hänger är samma bilder som ligger i lagret (bilder/kott,
  // fisk och abborre), hängda i stjärten (fisken) och i ett snöre (köttet), vridna ett kvarts varv. Medan det torkar byts
  // färgerna steg för steg mot det torra: köttet mot det torkade köttets bruna färger i lagret, fisken mot gråbrunt
  {
    const HALV = {
      '#521100': '#3f2415', '#742a01': '#521100', '#a14808': '#742a01', '#bd753e': '#a14808', '#dad0bb': '#bdb39b', '#bdb39b': '#a0947d', '#a0947d': '#987e62',
      '#898b4c': '#647025', '#647025': '#4b4f00', '#353204': '#353204',
    };
    const TORR = {
      '#521100': '#3f2415', '#742a01': '#3f2415', '#a14808': '#5e3c24', '#bd753e': '#7d5b40', '#dad0bb': '#bdb39b', '#bdb39b': '#987e62', '#a0947d': '#7e7362',
      '#898b4c': '#987e62', '#647025': '#7d5b40', '#353204': '#5e3c24', '#21290d': '#3f2415',
    };
    // köttet: samma bruna som det torkade köttet i lagret (bilder/torrkott)
    const TORR_KOTT = { ...TORR, '#742a01': '#5e3c24', '#a14808': '#7d5b40', '#bd753e': '#987e62' };
    const stallning = (B, x0, y0, byt, bytK) => {
      bildMed(B, BILDFILER.tork, x0, y0);
      const snore = B.P.i('jord', 2);
      // köttet, fisken och abborren under slån (slåns underkant är rad 6 i bilden), med ett snöre eller stjärten i slån
      const saker = [['kott', 8, 'hoger', bytK], ['fisk', 14, 'vanster', byt], ['abborre', 19, 'vanster', byt]];
      for (const [id, x, vrid, f] of saker) {
        const m = bildMed(B, BILDFILER[id], x0 + x, y0 + 8, f, vrid);
        B.satt(x0 + x + (m.w >> 1), y0 + 7, snore);
      }
    };
    byt({ id: 'f8_tork', namn: 'Det som torkar på ställningen', typ: 'janej', vad: 'Steg 8.1.9: köttet och fisken på torkställningen ritades med blandade färger. Nu hänger samma bilder som i lagret på ställningen (köttet, fisken och abborren), och bara färgerna ändras medan de torkar: från färskt till vänster, halvtorrt i mitten och torrt till höger. Det torkade köttet får samma bruna färger som det torkade köttet i lagret. Din kommentar förra gången: "Gör samma symbol som används i lagret men ändra färgerna när det är torkat"', versioner: [
      { text: 'Tre ställningar: färskt, halvtorrt och torrt. Köttet hänger i ett snöre, fisken och abborren i stjärten.', w: 112, h: 34, rita: B => {
        window.F7.gras(B);
        stallning(B, 4, 4, {}, {});
        stallning(B, 40, 4, HALV, HALV);
        stallning(B, 76, 4, TORR, TORR_KOTT);
      } },
    ] });
  }
})();
