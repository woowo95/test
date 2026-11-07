// fas 8, system 8.1 Rättelser: det som görs om, en version som Björn säger ja eller nej till.
(() => {
  const { lagg, gras } = window.F7;
  const Z = { w: 'ben3' };
  const ZZZ = ['...wwwww', '......w.', '.....w..', '....wwww', 'www.....', '..w.....', '.w......', 'www.....'];
  const K = { o: 'kol0', k: 'kol1', j: 'jord1', J: 'jord2', a: 'rost3', b: 'rost2', c: 'rost1', d: 'jord0', f: 'ben1', g: 'skiffer2', h: 'jord3', i: 'jord2', l: 'jord1' };
  // torkställningen: två stolpar och en slå, och det som hänger i tre stadier: färskt, halvtorrt och torrt
  const TORK = [
    '.j....................j.',
    'JJJJJJJJJJJJJJJJJJJJJJJJ',
    '.j.a.a.a..b.b..d.d.d..j.',
    '.j.a.a.a..b.b..d.d.d..j.',
    '.j.a.a.a..b.b..d.d.d..j.',
    '.j.a.a.b..b.c..d.d.d..j.',
    '.j.b.b....c....o.d.o..j.',
    '.j....................j.',
  ];
  const FISK = [
    '.j....................j.',
    'JJJJJJJJJJJJJJJJJJJJJJJJ',
    '.j.g.g.g..i.i..l.l.l..j.',
    '.j.g.g.g..i.i..l.l.l..j.',
    '.j.f.f.f..h.h..i.i.i..j.',
    '.j.f.f.f..h.h..i.i.i..j.',
    '.j.f.f.f..h.h..i.i.i..j.',
    '.j.g.g.g..i.i..l.l.l..j.',
  ];
  VAL.push(
    { id: 'f8_zzz', namn: 'Zzz över den som sover', typ: 'janej', vad: 'Steg 8.1.1: Zzz ritades som streck. Nu är det en symbol i 8 punkter, på samma mörka ruta som de andra symbolerna över huvudet.', versioner: [
      { text: 'Två z, ett stort och ett litet, i ben 3.', w: 12, h: 12, rita: B => { gras(B); lagg(B, ZZZ, Z, 2, 2, true); } },
    ] },
    { id: 'f8_tork', namn: 'Det som torkar på ställningen', typ: 'janej', vad: 'Steg 8.1.9: köttet och fisken på torkställningen ritades med blandade färger. Nu är de pixlar i palettens färger, från färskt till vänster till torrt till höger.', versioner: [
      { text: 'Köttremsor: rött när det är färskt och mörkbrunt när det är torrt.', w: 28, h: 12, rita: B => { gras(B); lagg(B, TORK, K, 2, 2, true); } },
      { text: 'Fisk: ljus när den är färsk och mörkbrun när den är torr.', w: 28, h: 12, rita: B => { gras(B); lagg(B, FISK, K, 2, 2, true); } },
    ] },
  );
})();
