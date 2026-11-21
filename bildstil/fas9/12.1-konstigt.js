// fas 12, steg 12.1.41: symbolen för knappen Det här är konstigt, som står i rutan för en person, en sak, en station eller ett
// hus och öppnar en rad att skriva i. En version, ja eller nej.
(() => {
  const L = { o: 'kol0', k: 'kol2', w: 'ben3', W: 'ben2', s: 'skiffer2', S: 'skiffer3', j: 'jord1', J: 'jord2', b: 'jord3', r: 'rost2' };
  const ruta = (B, rader) => { for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) B.satt(x, y, B.P.i('ben', 2)); ritaSprite(B, rader, L, 2, 2); };
  VAL.push(
    { id: 'f12_konstigt', namn: 'Det här är konstigt', typ: 'janej', vad: 'Steg 12.1.41: en liten symbol i rutan för en person, en sak, en station eller ett hus. Ett tryck öppnar en rad där du skriver vad som ser konstigt ut, och spelet sparar en rapport med byn så att en chatt kan undersöka det. Symbolen i 16 punkter på panelens botten. Ja eller nej?',
      versioner: [{ text: 'Ett förstoringsglas av mörkt järn med ljust glas och ett skaft av trä snett nedåt höger.', w: 20, h: 20, rita: B => ruta(B, [
        '................',
        '....oooooo......',
        '...oSwwwsso.....',
        '..oSwwwssss o...',
        '..oSwwssssso....',
        '..oswssssssoo...',
        '..osssssssso....',
        '..osssssssso....',
        '...osssssso.....',
        '....oooooojo....',
        '..........ojJo..',
        '...........ojJo.',
        '............ojJo',
        '.............obo',
        '..............o.',
        '................',
      ].map(r => r.replace(/ /g, '.'))) }] },
  );
})();
