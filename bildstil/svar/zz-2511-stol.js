// Stolen från alla håll (2026-11-25): den valda stolen (v1) framifrån bredvid den nya ritningen från sidan och bakifrån, på ett
// ja/nej-kort. Korten Stolen från sidan och Stolen bakifrån (bild_stol_sida, bild_stol_bak) ersätts av det här kortet
(() => {
  const ids = ['stol', 'stol_sida', 'stol_bak'];
  const rader = id => id === 'stol' ? BILDFILER.stol.versioner[0].rader : BILDFILER[id].versioner[0].rader;
  VAL.push({ id: 'bild_stol_hall', namn: 'Stolen från alla håll', typ: 'janej',
    vad: 'Ritad för hand: den valda stolen (version 1) framifrån till vänster, och samma stol sedd från sidan i mitten och bakifrån till höger. Från sidan syns ryggbrädan som en smal kant som går ner i det bakre benet; bakifrån syns ryggbrädans släta baksida och fällen mellan stolparna. Din kommentar förra gången: samma stol som den valda, sedd från sidan och bakifrån.',
    versioner: [{ text: 'Framifrån, från sidan och bakifrån.', w: 2 + 14 + 4 + 14 + 4 + 14 + 2, h: 24,
      rita: B => ids.forEach((id, i) => { const S = KONTROLL.bildAvRader(rader(id));
        for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) { const v = S.px[y * S.w + x]; if (v >= 0) B.satt(2 + i * 18 + x, 2 + y, v); } }) }] });
  // de gamla korten för sidan och baksidan kommer inte tillbaka (tas bort i delaVal)
  ['bild_stol_sida', 'bild_stol_bak'].forEach(id => (window.INBYGGT ||= new Set()).add(id));
})();
