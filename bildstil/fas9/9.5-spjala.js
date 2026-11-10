// fas 9, system 9.5: spjälan (steg 9.5.28), tre versioner. Ett brutet ben eller en arm binds mellan två grenar med en remsa eller
// ett rep, och spjälan syns på delen. Här ett underben med spjälan, i 16 punkter per ruta, på marken.
(() => {
  const L = { o: 'kol0', h: 'senap2', H: 'senap3', s: 'rost2', b: 'jord1', c: 'jord2', d: 'jord3', w: 'ben3', W: 'ben2', r: 'rost1', x: 'skugga' };
  const mark = B => { for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, B.P.i('oliv', (x * 7 + y * 3) % 5 === 0 ? 1 : 2)); };
  const V = (text, rader) => ({ text, w: 24, h: 20, rita: B => { mark(B); ritaSprite(B, rader, L, 2, 2); } });
  VAL.push({ id: 'f9_spjala', namn: 'Spjälan', typ: 'tre', vad: 'Steg 9.5.28: ett brutet ben sätts och binds i en spjäla av två grenar och en remsa eller ett rep. Spjälan sitter tills brottet läkt till hälften, och den spjälade armen gör hen hälften så händig. Här ett underben med spjälan.', versioner: [
    V('Två raka grenar på var sida om benet, bundna med vita remsor på tre ställen.', [
      '..o..oooo..o......',
      '.obooshhsoobo.....',
      '.obowwwwwwobo.....',
      '.obooshhsoobo.....',
      '.obo.shhs.obo.....',
      '.obowwwwwwobo.....',
      '.obo.shhs.obo.....',
      '.obooshhsoobo.....',
      '.obowwwwwwobo.....',
      '..o..shhs..o......',
      '.....oHHo.........',
      '....ohhhho........',
      '....xxxxxx........',
    ]),
    V('Knotiga grenar med barken kvar, bundna med rep i kors.', [
      '..oo.oooo.oo......',
      '.ocdoshhsodco.....',
      '.odcrrhhrrcdo.....',
      '.ocdoshhsodco.....',
      '.odco.rr.ocdo.....',
      '.ocdorshrrdco.....',
      '.odcoshhsocdo.....',
      '.ocdrrhhrrdco.....',
      '..oo.shhs.oo......',
      '.....oHHo.........',
      '....ohhhho........',
      '....xxxxxx........',
    ]),
    V('En bred spjäla av kluvet trä som lindats helt med en lång remsa.', [
      '...oooooooo.......',
      '..owWwWwWwWo......',
      '..oWwWwWwWwo......',
      '..owWwWwWwWo......',
      '..oWwWwWwWwo......',
      '..owWwWwWwWo......',
      '..oWwWwWwWwo......',
      '..owWwWwWwWo......',
      '...oshhhhso.......',
      '....oHHHHo........',
      '...ohhhhhho.......',
      '...xxxxxxxx.......',
    ]),
  ] });
})();
