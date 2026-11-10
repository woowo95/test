// Nya versioner efter Björns svar i steg 9.9.1. Läses sist av svar/ (efter z-beslut.js, som tar bort korten som byggts in).
// Varje kort byter ut kortet med samma id i VAL.
(() => {
  const byt = kort => { const i = VAL.findIndex(s => s.id === kort.id); if (i >= 0) VAL[i] = kort; else VAL.push(kort); };
  const hitta = id => VAL.find(s => s.id === id);
  // palettens tecken (ett per färg, ramp × 4 + ton), som bilderna i bilder/ använder
  const TK = () => BILDER.tecken;
  const ritaTk = (B, rader, x0, y0) => rader.forEach((r, y) => [...r].forEach((c, x) => { if (c === '.') return; const i = TK().indexOf(c); if (i >= 0) B.satt(x0 + x, y0 + y, i); }));
  // en version som ritas om med en funktion på varje punkts färg (index i paletten: ramp × 4 + ton) eller speglas
  const omfarga = (v, text, f) => ({ ...v, text, rita: (B, P, r) => { v.rita(B, P, r); for (let k = 0; k < B.px.length; k++) { const i = B.px[k]; if (i >= 0) B.px[k] = f(i); } } });
  const spegla = (v, text) => ({ ...v, text, rita: (B, P, r) => { v.rita(B, P, r); for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w >> 1; x++) { const a = y * B.w + x, b = y * B.w + B.w - 1 - x, t = B.px[a]; B.px[a] = B.px[b]; B.px[b] = t; } } });
  const RAMP = { kol: 0, jord: 1, senap: 2, rost: 3, oliv: 4, barr: 5, skiffer: 6, ben: 7 };
  const ton = (ramp, t) => RAMP[ramp] * 4 + t;

  // ---------- klyvplatsen: fler versioner av version 3 (version 3 är inbyggd i spelet) ----------
  { const k = hitta('f7_klyvplats'), v3 = k && k.versioner[2];
    if (v3) byt({ id: 'f7_klyvplats', namn: 'Klyvplatsen', typ: 'tre',
      vad: 'Steg 7.5.1: klyvplatsen. Du valde version 3, den låga klyvbänken med en kluven halva fasthållen, och version 3 är nu byggd i spelet. Här fler versioner av version 3: samma bänk, stock och plankor, med små ändringar i virket och i hur det står. Din kommentar förra gången: ”gör fler versioner av version 3”',
      versioner: [
        spegla(v3, 'Version 3 vänd åt andra hållet: bänken med den kluvna halvan till höger och stocken med kilarna till vänster.'),
        omfarga(v3, 'Version 3 med nyhugget, ljusare virke: det bruna blir ett steg ljusare, som nykluvet trä.', i => { const r = i >> 2, t = i & 3; return r === 1 && t < 3 ? i + 1 : i; }),
        omfarga(v3, 'Version 3 med gammalt, grått virke: bänken och plankorna har stått ute länge och blivit gråa.', i => { const r = i >> 2, t = i & 3; return r === 1 ? ton('skiffer', Math.min(3, t)) : i; }),
      ] });
  }

  // ---------- krönikans kategori Strid: fler versioner av version 2 (version 2 är inbyggd i spelet) ----------
  { const L = '................';
    const ruta = (B, rader) => { for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) B.satt(x, y, B.P.i('ben', 2)); ritaTk(B, rader, 2, 2); };
    // stenyxan och spjutet i kors med blod, i tecknen ur palettens ordning (k kol, t jord, S T R skiffer, G F rost)
    const V = (text, rader) => ({ text, w: 20, h: 20, rita: B => ruta(B, rader) });
    const bas = ['..kk............', '.kSSk.....kkk...', '.kSSSk...kTTSk..', '.kSSk....kTSSSk.', '.kSktk....kSSRk.', '..k.ktk..ktSRRRk', '....Gttkkttkkkk.', '....Gkttttk.....', '...FF.kttk..G...', '.....kttttk.....', '....kttkkttk....', '...kttk..kttk...', '..kttk.G..kttk..', '.kttk..F...ktk..', '.ktk........ktk.', '..k..........k..'];
    const speg = bas.map(r => [...r].reverse().join(''));
    const rent = bas.map(r => r.replace(/[GF]/g, '.'));
    const mer = ['..kk............', '.kSSk.....kkk...', '.kSSSk...kTTSk..', '.kGGk....kTGSSk.', '.kSGtk....kSGRk.', '..k.ktk..ktGRRRk', '....Gttkkttkkkk.', '....Gkttttk.....', '...FF.kttk..G...', '....GkttttkG.F..', '....kttkkttk....', '...kttk..kttk...', '..kttk.G..kttk..', '.kttk..F...ktk..', '.ktk..F.....ktk.', '..k..........k..'];
    byt({ id: 'f9_kk_strid', namn: 'Krönikans kategori Strid', typ: 'tre',
      vad: 'Steg 9.2.73: krönikans kategorier får var sin symbol i en rad överst i Krönikan. Du valde version 2, en stenyxa och ett spjut i kors med blod som droppar, och den är nu byggd i spelet. Här fler versioner av version 2. Din kommentar förra gången: ”gör fler versioner på version 2”',
      versioner: [
        V('Version 2 spegelvänd: yxan till höger och spjutet till vänster, med blodet som förut.', speg),
        V('Version 2 utan blod: yxan och spjutet rena, som före en strid.', rent),
        V('Version 2 med mer blod: fler droppar och rött längs yxans egg och spjutspetsen.', mer),
      ] });
  }

  // ---------- krönikans kategori Tro: lik symbolen i flikens runsten (emblemet i gui.json) ----------
  { const EMB = ['.....#.....', '.#...#...#.', '..#.###.#..', '...#####...', '#####.#####', '...#####...', '..#.###.#..', '.#...#...#.', '.....#.....'];
    const ruta = (B, rita) => { for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) B.satt(x, y, B.P.i('ben', 2)); rita(B, 2, 2); };
    const k = (ramp, t) => ton(ramp, t);
    // emblemets punkter, skalade (nära som i runstenen) och med en mörk kontur runt
    const emblem = (B, x0, y0, sk, fyll, kant) => {
      const w = Math.round(11 * sk), h = Math.round(9 * sk), mask = (x, y) => x >= 0 && y >= 0 && x < w && y < h && EMB[Math.floor(y / sk)][Math.floor(x / sk)] === '#';
      for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) if (!mask(x, y) && (mask(x + 1, y) || mask(x - 1, y) || mask(x, y + 1) || mask(x, y - 1))) B.satt(x0 + x, y0 + y, kant);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask(x, y)) B.satt(x0 + x, y0 + y, fyll(x, y, w, h));
    };
    const V = (text, rita) => ({ text, w: 20, h: 20, rita: B => ruta(B, rita) });
    byt({ id: 'f9_kk_tro', namn: 'Krönikans kategori Tro', typ: 'tre',
      vad: 'Steg 9.2.73: krönikans kategorier får var sin symbol i en rad överst i Krönikan. Nu ritade efter symbolen i runstenen som symboliserar tro (solen med strålar, flikens emblem): samma form, med samma strålar och hål i mitten. Din kommentar förra gången: ”gör den mer lik symbolen i runstenen som symboliserar tro”',
      versioner: [
        V('Runstenens emblem i guld, med mörk kontur: samma sol med strålar åt åtta håll och hål i mitten.', (B, x, y) => emblem(B, x + 2, y + 3, 1, (a, b, w, h) => B.P.i('senap', a + b > (w + h) / 2 ? 2 : 3), B.P.i('kol', 0))),
        V('Emblemet som på runstenen: mörkgrönt på en ljus skiva med grön kant, flikens egna färger.', (B, x, y) => {
          for (let yy = 0; yy < 16; yy++) for (let xx = 0; xx < 16; xx++) { const d = Math.hypot(xx - 7.5, yy - 7.5); if (d < 7.7) B.satt(x + xx, y + yy, d > 6.2 ? B.P.i('barr', 1) : B.P.i('ben', 3)); else if (d < 8.7) B.satt(x + xx, y + yy, B.P.i('kol', 0)); }
          emblem(B, x + 3, y + 4, 1, () => B.P.i('barr', 0), B.P.i('ben', 3));
        }),
        V('Emblemet större, med tjockare strålar, i guld med mörk kontur.', (B, x, y) => emblem(B, x + 0, y + 1, 1.45, (a, b, w, h) => B.P.i('senap', a + b > (w + h) / 2 ? 2 : 3), B.P.i('kol', 0))),
      ] });
  }

  // ---------- vedhögen i lagret: lite mer mörkbrun ----------
  { const k = hitta('f9_vedhog');
    if (k) {
      // det ljusa träet (ben och senap) blir brunt i jordens toner; barken och kolet förblir mörka
      const brun = i => { const r = i >> 2, t = i & 3; return r === RAMP.ben || r === RAMP.senap ? ton('jord', Math.min(3, t === 3 ? 3 : t)) : i; };
      byt({ ...k, vad: k.vad.replace(/ Din kommentar förra gången: .*$/, '') + ' Din kommentar förra gången: ”gör den lite mer mörkbrun”',
        versioner: k.versioner.map(v => omfarga(v, v.text + ' Nu i mörkare brunt: det ljusa träet har blivit brunt.', brun)) });
    }
  }

  // ---------- samtalets ämne maten: en ny version ----------
  { const L = { k: 'kol0', r: 'rost2', R: 'rost3', y: 'senap1', Y: 'senap2', j: 'jord2', s: 'skiffer2', b: 'skiffer1' };
    const bubbla = (B, rader) => {
      const P = B.P;
      for (let y = 0; y < 18; y++) for (let x = 0; x < 20; x++) B.satt(x, y, P.i('oliv', 2));
      for (let y = 2; y < 13; y++) for (let x = 4; x < 16; x++) { const horn = (x === 4 || x === 15) && (y === 2 || y === 12); if (!horn) B.satt(x, y, (x === 4 || x === 15 || y === 2 || y === 12) ? P.i('kol', 2) : P.i('ben', 3)); }
      B.satt(7, 13, P.i('ben', 3)); B.satt(6, 13, P.i('kol', 2)); B.satt(8, 13, P.i('kol', 2)); B.satt(7, 14, P.i('kol', 2));
      ritaSprite(B, rader, L, 6, 4);
    };
    const gammal = hitta('f9_amne_mat');
    byt({ id: 'f9_amne_mat', namn: 'Samtalets ämne: Maten', typ: 'janej',
      vad: 'Steg 9.2.10: pratbubblorna har en enda storlek, den lilla, och varje ämne får en symbol i 8 punkter. Maten ritas nu som en lerskål med rött kött och rötter i, i stället för köttbiten på benet. Ja eller nej? Din kommentar förra gången: nej, utan kommentar.',
      versioner: [{ text: 'Ämnet maten: en lerskål med mat i, med ånga som stiger.', w: 20, h: 18, rita: B => bubbla(B, ['..b..b..', '.b..b...', '.rRrRYy.', 'kkkkkkkk', '.kjjjjk.', '.kjjjjk.', '..kjjk..', '..kkkk..']) }] });
  }

  // ---------- den unga grodden: en ny version ----------
  { const gammal = hitta('f5_grodd');
    if (gammal) {
      const GRODD = ['..L..L..', '.LGL.LGL', '.LGGLGGL', '..gGGg..', '...gg...', '...gg...', '...g....', '..dJd...'];
      const lag = gammal.versioner[0], rita0 = lag.rita;
      const ny = { text: 'Till vänster grodden i halv skala, i mitten den nya bilden på 8 punkter och till höger den mogna rovan: en grodd med två hjärtblad som sträcker sig åt var sitt håll över en kort stjälk.', w: lag.w, h: lag.h, rita: (B, P, r) => {
        rita0(B, P, r);
        // den förra grodden täcks av jordens ruta och den nya ritas ovanpå
        const jord = P.i('jord', 1), fara = P.i('jord', 0);
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) B.satt(25 + x, 3 + y, (y + 1) % 4 === 0 && x > 0 && x < 15 ? fara : jord);
        const C = { L: P.i('oliv', 3), G: P.i('oliv', 2), g: P.i('oliv', 1), h: P.i('jord', 3), d: P.i('jord', 0), J: P.i('jord', 2) };
        GRODD.forEach((rr, y) => [...rr].forEach((ch, x) => { if (C[ch] !== undefined) B.satt(29 + x, 7 + y, C[ch]); }));
      } };
      byt({ ...gammal, vad: gammal.vad.replace(/ Din kommentar förra gången: .*$/, '') + ' Din kommentar förra gången: nej, utan kommentar. Nu en ny grodd: två hjärtblad som sträcker sig åt var sitt håll.', versioner: [ny] });
    }
  }
})();
