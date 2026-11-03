// ---------- djuren på kartan och pälsens färger (steg 5.2.4.6, till 5.1.11) ----------
// Djuren ritas från tre håll, som kartfiguren: framifrån (söderut), bakifrån (norrut) och från sidan (österut); västerut
// är sidan speglad. Bokstäverna i ritningen är pälsens toner, inte färger: o kontur, d mörk, m mellan, l ljus, c gräddvit,
// b vit, k svart (nos, ögon, klor), r rosa. Pälsen är en tabell från bokstav till färg, så en ny färgvariant är en ny rad
// i PALS och ingen ny ritning (5.1.11: små skillnader mellan djuren av samma art, räknade ur djurets id).
(() => {
  const SCEN = (w, h, rita) => ({ w, h, stor: true, rita });
  // pälsarna: [ramp, ton] per bokstav
  const PALS = {
    varg: [
      ['Grå', { o: ['skiffer', 0], d: ['skiffer', 1], m: ['skiffer', 2], l: ['skiffer', 3], c: ['ben', 2], b: ['ben', 3] }],
      ['Ljusare', { o: ['skiffer', 0], d: ['skiffer', 2], m: ['skiffer', 3], l: ['ben', 1], c: ['ben', 2], b: ['ben', 3] }],
      ['Mörkare', { o: ['kol', 0], d: ['skiffer', 0], m: ['skiffer', 1], l: ['skiffer', 2], c: ['ben', 1], b: ['ben', 2] }],
      ['Brunare', { o: ['jord', 0], d: ['jord', 1], m: ['ben', 0], l: ['ben', 1], c: ['ben', 2], b: ['ben', 3] }],
    ],
    kanin: [
      ['Brun', { o: ['jord', 0], d: ['jord', 1], m: ['jord', 2], l: ['jord', 3], c: ['ben', 2], b: ['ben', 3] }],
      ['Ljusare', { o: ['jord', 0], d: ['jord', 2], m: ['jord', 3], l: ['ben', 1], c: ['ben', 2], b: ['ben', 3] }],
      ['Mörkare', { o: ['kol', 0], d: ['jord', 0], m: ['jord', 1], l: ['jord', 2], c: ['ben', 1], b: ['ben', 2] }],
      ['Gråare', { o: ['jord', 0], d: ['kol', 2], m: ['ben', 0], l: ['ben', 1], c: ['ben', 2], b: ['ben', 3] }],
    ],
  };
  const FAST = { k: ['kol', 0], r: ['rost', 2] };

  // ---------- vargen ----------
  const VARG_FRAM = [
    '..o......o..',
    '.olo....omo.',
    '.olloooommo.',
    '.olllllmmmo.',
    '.okmlllmkmo.',
    '..omlllmmo..',
    '..oocbbcoo..',
    '...ockkco...',
    '..ocbbbbco..',
    '.odcbbbbcdo.',
    '.odmcbbcmdo.',
    '.odmmccmmdo.',
    '..omo..omo..',
    '..odo..odo..',
    '..odo..odo..',
    '..oko..oko..'];
  const VARG_BAK = [
    '..o......o..',
    '.olo....omo.',
    '.olloooommo.',
    '.olllllmmmo.',
    '..olllmmmo..',
    '..ollllmmo..',
    '.odlllllmdo.',
    '.odmllllmdo.',
    '.odmmllmmdo.',
    '.odmmoommdo.',
    '.oddolmoddo.',
    '..omolmomo..',
    '..odolmodo..',
    '..odomdodo..',
    '..odookodo..',
    '..oko..oko..'];
  const VARG = [
    { // version 1: låg och kompakt, huvudet i ryggens höjd och svansen rakt ned
      sida: [
        '...................o.o..',
        '..................olol..',
        '....ooooooooooooooomlmo.',
        '..oollllllllllllllmmkmmo',
        '.oldlllmmllllllmmmmmmmko',
        '.odmmmmmmmmmmmmmmmbbboo.',
        'odmmmmmmmmmmmmmmmmbbo...',
        'odo.odmmmmmmmmmmmdbo....',
        'odo.oddmmmmmmmmmmddo....',
        'odo..oddddddddddddo.....',
        '.ko..omdo.....omdo......',
        '.....od.od....od.od.....',
        '.....od.od....od.od.....',
        '.....ok.ok....ok.ok.....'],
      fram: VARG_FRAM, bak: VARG_BAK },
    { // version 2: huvudet högt på en hals och en yvig svans som hänger i en båge
      sida: [
        '....................o.o...',
        '...................olol...',
        '...................ommlo..',
        '..................omlmkmo.',
        '..oooooooooooooooomlmmmmko',
        '.ollllllllllllllllmmmbboo.',
        'oldlllmmlllllllmmmmbbo....',
        'odmmmmmmmmmmmmmmmmbbo.....',
        'oddmmmmmmmmmmmmmmdbo......',
        'odmooddmmmmmmmmmmddo......',
        'odmo.oddddddddddddo.......',
        '.odo.omdo.....omdo........',
        '..ko.od.od....od.od.......',
        '.....od.od....od.od.......',
        '.....ok.ok....ok.ok.......'],
      fram: [
        '..o......o..',
        '.olo....omo.',
        '.olmo..omlo.',
        '.olloooommo.',
        '.olllllmmmo.',
        '.okmlllmkmo.',
        '..omlllmmo..',
        '..oocbbcoo..',
        '...ockkco...',
        '..ocbbbbco..',
        '.odcbbbbcdo.',
        '.odmmccmmdo.',
        '..omo..omo..',
        '..odo..odo..',
        '..odo..odo..',
        '..oko..oko..'],
      bak: [
        '..o......o..',
        '.olo....omo.',
        '.olmo..omlo.',
        '.olloooommo.',
        '.olllllmmmo.',
        '..olllmmmo..',
        '.odlllllmdo.',
        '.odmllllmdo.',
        '.odmmllmmdo.',
        '.oddmlmmddo.',
        '.oddomdoddo.',
        '..omdmmdmo..',
        '..odommodo..',
        '..ododdodo..',
        '..odookodo..',
        '..oko..oko..'] },
  ];
  // version 3: som version 2 men med en mörkare sadel över ryggen, en ljus mask kring nosen och yvigare hals (raggig päls)
  const sadel = (rader, lista) => rader.map((r, y) => { let s = r.split(''); for (const [yy, x0, x1, fran, till] of lista) if (yy === y) for (let x = x0; x <= x1; x++) if (s[x] === fran) s[x] = till; return s.join(''); });
  VARG.push({
    sida: sadel(VARG[1].sida, [[5, 3, 15, 'l', 'd'], [6, 6, 13, 'l', 'd'], [6, 3, 5, 'l', 'm'], [4, 19, 20, 'm', 'c'], [5, 17, 18, 'm', 'c'], [7, 16, 17, 'm', 'c'], [8, 15, 16, 'm', 'l']]),
    fram: sadel(VARG[1].fram, [[5, 3, 3, 'm', 'c'], [5, 7, 7, 'm', 'c'], [6, 3, 4, 'm', 'c'], [6, 7, 8, 'm', 'c'], [10, 1, 2, 'd', 'l'], [10, 9, 10, 'd', 'm']]),
    bak: sadel(VARG[1].bak, [[4, 2, 9, 'l', 'd'], [6, 3, 8, 'l', 'd'], [7, 4, 7, 'l', 'd'], [8, 5, 6, 'l', 'd']]),
  });

  // ---------- haren (spelets kanin) ----------
  const KANIN = [
    { // version 1: sitter med öronen rakt upp
      sida: [
        '........o.o.',
        '.......olol.',
        '.......olol.',
        '......ommmo.',
        '..ooooomlkmo',
        '.ommlllmmmmo',
        'obmlllllmmo.',
        'obmmmmmmmdo.',
        '.oddmmmmddo.',
        '..oko.ooko..'],
      fram: [
        '.o....o.',
        'olo..olo',
        'olo..olo',
        '.omoomo.',
        'omlllmmo',
        'okmllmko',
        '.omcrmo.',
        'omcbbcmo',
        'odcbbcdo',
        '.okooko.'],
      bak: [
        '.o....o.',
        'olo..olo',
        'olo..olo',
        '.omoomo.',
        'omllllmo',
        'omllllmo',
        'odlllmdo',
        'odmbbmdo',
        'oddbbddo',
        '.oko.ko.'] },
    { // version 2: längre öron med svarta spetsar, som en skogshare, och höga bakben
      sida: [
        '.........k.k',
        '........olol',
        '........olol',
        '.......olol.',
        '.......ommmo',
        '..oooooomlkm',
        '.ommllllmmmo',
        'obmllllllmo.',
        'obmmmmmmmdo.',
        '.oddmmmmddo.',
        '.odko.ooko..'],
      fram: [
        '.k....k.',
        'olo..olo',
        'olo..olo',
        'olo..olo',
        '.omoomo.',
        'omlllmmo',
        'okmllmko',
        '.omcrmo.',
        'omcbbcmo',
        'odcbbcdo',
        '.okooko.'],
      bak: [
        '.k....k.',
        'olo..olo',
        'olo..olo',
        'olo..olo',
        '.omoomo.',
        'omllllmo',
        'omllllmo',
        'odlllmdo',
        'odmbbmdo',
        'oddbbddo',
        '.oko.ko.'] },
    { // version 3: hukar lågt med öronen bakåt längs ryggen, rund och kompakt
      sida: [
        '..oooooo....',
        '.ollllmlo...',
        'oooooooomoo.',
        '.ommllllmmko',
        'obmllllllmmo',
        'obmmmmmmmmo.',
        '.oddddmmddo.',
        '..ok..oko...'],
      fram: [
        'oo....oo',
        'olo..olo',
        '.omoomo.',
        'omlllmmo',
        'okmllmko',
        '.omcrmo.',
        'odcbbcdo',
        '.okooko.'],
      bak: [
        'oo....oo',
        'olo..olo',
        '.omoomo.',
        'omllllmo',
        'odlllmdo',
        'odmbbmdo',
        'oddbbddo',
        '.oko.ko.'] },
  ];

  // ritar en ritning med foten (nedersta raden) på fot och mitten på x, i en päls; spegel = västerut
  function djur(B, rader, x, fot, pals, spegel = false) {
    const P = B.P, w = rader[0].length, h = rader.length, x0 = Math.round(x) - (w >> 1);
    for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
      const ch = rader[y][spegel ? w - 1 - i : i], f = pals[ch] || FAST[ch];
      if (f) B.satt(x0 + i, fot - h + 1 + y, P.i(f[0], f[1]));
    }
    for (let i = 1; i < w - 1; i++) B.morka(x0 + i + 1, fot + 1); // skuggan under djuret
  }
  // marken: referensgräset (mark.js)
  function gras(B) {
    const M = window.MARK;
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, M.grasPunkt(x + 40, y + 900, B.P, 1));
    M.tuvor(B, 1, () => true, 0.5);
  }
  // kortets scen: överst människan och djuret från fyra håll, nederst djuret från sidan i alla pälsar
  function scen(art, v) {
    const R = (art === 'varg' ? VARG : KANIN)[v], pals = PALS[art], sw = R.sida[0].length, fw = R.fram[0].length;
    const steg = Math.max(sw, 18) + 6, w = Math.max(16 + fw + 8 + fw + 8 + sw + 8 + sw + 10, pals.length * steg + 10), h = art === 'varg' ? 76 : 60;
    return SCEN(w, h, B => {
      gras(B);
      const p0 = pals[0][1], fot = art === 'varg' ? 30 : 26;
      let x = 9;
      window.MARK.fram(B, x, fot); x += 8 + (fw >> 1) + 2;
      djur(B, R.fram, x, fot, p0); x += fw + 6;
      djur(B, R.bak, x, fot, p0); x += (fw >> 1) + 6 + (sw >> 1);
      djur(B, R.sida, x, fot, p0); x += sw + 6;
      djur(B, R.sida, x, fot, p0, true);
      const fot2 = h - 6;
      pals.forEach(([, pal], i) => djur(B, R.sida, 6 + (sw >> 1) + i * steg, fot2, pal, i % 2 === 1));
    });
  }
  const T = 'Steg 5.2.4.6, till 5.1.11: ';
  const OM = ' Överst: en vuxen människa framifrån för storleken, sedan djuret framifrån (söderut), bakifrån (norrut), från sidan (österut) och speglat (västerut). Nederst fyra pälsar, små skillnader i färgen som räknas ur djurets id: ';
  VAL.push(
    { id: 'djur_varg', stor: true, namn: 'Vargen', typ: 'tre', vad: T + 'den levande vargen i verklig storlek, nästan lika lång som en vuxen är lång (den fällda vargen du valt är 22 × 10 punkter). I spelet nu en liten varg på 16 × 16 punkter, bara från sidan.' + OM + PALS.varg.map(p => p[0].toLowerCase()).join(', ') + '.',
      versioner: [
        { text: 'Version 1: låg och kompakt, huvudet i ryggens höjd och svansen rakt ned.', ...scen('varg', 0) },
        { text: 'Version 2: huvudet högt på en hals och en yvig svans i en båge.', ...scen('varg', 1) },
        { text: 'Version 3: som version 2 med en mörk sadel över ryggen och en ljus mask kring nosen (raggigare).', ...scen('varg', 2) }] },
    { id: 'djur_kanin', stor: true, namn: 'Haren (kaninen)', typ: 'tre', vad: T + 'haren som springer på kartan (spelets kanin), i samma bruna toner som det fällda viltet du valt. I spelet nu 8 × 8 punkter, bara från sidan.' + OM + PALS.kanin.map(p => p[0].toLowerCase()).join(', ') + '.',
      versioner: [
        { text: 'Version 1: sitter med öronen rakt upp.', ...scen('kanin', 0) },
        { text: 'Version 2: längre öron med svarta spetsar, som en skogshare.', ...scen('kanin', 1) },
        { text: 'Version 3: hukar lågt med öronen bakåt längs ryggen.', ...scen('kanin', 2) }] },
  );
})();
