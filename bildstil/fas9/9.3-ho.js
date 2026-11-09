// fas 9, system 9.3: höet på rutan (steg 9.3.4), tre versioner. Tändmaterialet ligger som hela saker på rutan, och höet får en
// bild per antal: en, två eller tre tuvor (en tuva per åtta hö). Här visas varje version med en, två och tre tuvor bredvid varandra,
// på en gräsruta i 16 punkter.
(() => {
  const L = { o: 'kol0', h: 'senap2', H: 'senap3', y: 'senap1', b: 'jord2', B: 'jord1', x: 'skugga' };
  // tre gräsrutor bredvid varandra (48 × 16 punkter) med en kant runt, och tuvorna på fasta platser i varje ruta
  const rutor = (B, tuva) => {
    for (let y = 0; y < 20; y++) for (let x = 0; x < 52; x++) B.satt(x, y, B.P.i('oliv', (x * 7 + y * 3) % 5 === 0 ? 1 : 2));
    const platser = [[[5, 6]], [[2, 3], [8, 9]], [[1, 2], [8, 4], [4, 10]]];
    platser.forEach((pl, r) => pl.forEach(([x, y]) => ritaSprite(B, tuva, L, 2 + r * 16 + x, 2 + y)));
  };
  VAL.push(
    { id: 'f9_ho', namn: 'Höet på rutan', typ: 'tre', vad: 'Steg 9.3.4: hö och kvistar till elden ligger som hela saker på rutan, och höet syns som en, två eller tre tuvor efter hur mycket som ligger där (en tuva per åtta hö). En tomplockad ruta har ingen tuva. Här en, två och tre tuvor på var sin gräsruta.', versioner: [
      { text: 'En liten gul tuva med strån som spretar (som platshållaren i spelet).', w: 52, h: 20, rita: B => rutor(B, [
        'h.H.h',
        '.hHh.',
        '..H..',
      ]) },
      { text: 'En lös hög av torrt hö, ljusare i toppen och med skugga under.', w: 52, h: 20, rita: B => rutor(B, [
        '..yy..',
        '.yhHh.',
        'hHhhHh',
        'xxxxxx',
      ]) },
      { text: 'En liten kärve hö bunden med ett strå, som står upp.', w: 52, h: 20, rita: B => rutor(B, [
        'h.y.h',
        '.hyh.',
        '.BbB.',
        '.hHh.',
        'h.H.h',
      ]) },
    ] },
  );
})();
