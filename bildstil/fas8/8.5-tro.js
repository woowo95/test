// system 8.5: kroppen och graven, de heliga platserna och trons saker, tre versioner av varje som enkla pixelbilder.
(() => {
  const { KORT, lagg, gras } = window.F7;
  const L = { a: 'ben1', b: 'ben2', c: 'ben3', j: 'jord0', J: 'jord1', k: 'jord2', s: 'skiffer1', S: 'skiffer2', T: 'skiffer3', r: 'rost1', R: 'rost2', g: 'oliv1', G: 'oliv2', y: 'senap3', Y: 'senap2' };
  const PA = (rader, text) => ({ text, w: 24, h: 18, rita: B => { gras(B); lagg(B, rader, L, 4, 3, true); } });
  VAL.push(
    KORT('f8_kropp', 'Den döda kroppen', 'Steg 8.5.1: kroppen ligger där personen dog tills någon bär den till graven.', [
      PA(['................', '.....oo.........', '....obbo...oo...', '....obboooocco..', '..oocccccccccoo.', '..oocccccccccoo.', '....obboooocco..', '....obbo...oo...', '.....oo.........'], 'En människa på rygg, i ljusa kläder.'),
      PA(['................', '......oooooooo..', '.....ojjjjjjjjo.', '...oojjjjjjjjjo.', '..obbjjjjjjjjjo.', '..obbjjjjjjjjjo.', '...oojjjjjjjjjo.', '.....ojjjjjjjjo.', '......oooooooo..'], 'Täckt av ett skinn, bara huvudet syns.'),
      PA(['................', '................', '...ooo......oo..', '..obbbo...oocco.', '..obbboooocccco.', '...oooccccccoo..', '.....oooooooo...', '................', '................'], 'På sidan, med knäna uppdragna.'),
    ]),
    KORT('f8_grav', 'Graven', 'Steg 8.5.1: graven är en ruta på gravplatsen, som 10.1.3 bygger vidare på.', [
      PA(['................', '......oSSo......', '......oSSo......', '....jjoSSojj....', '...jJJJJJJJJj...', '..jJJJJJJJJJJj..', '..jJJJkJJJkJJj..', '..jjjjjjjjjjjj..'], 'En kulle av jord med en liten sten.'),
      PA(['................', '................', '.....ooooo......', '....oTTTTSo.....', '....oTTTTSo.....', '....oTTTTSo.....', '...jjjjjjjjj....', '..jJJJJJJJJJj...'], 'En upprest sten på jorden.'),
      PA(['................', '................', '.....kkkkk......', '...kkJJJJJkk....', '..kJJJJJJJJJk...', '..kJJJGGJJJJk...', '..kJJGGGGJJJk...', '...kkkkkkkkk....'], 'En låg hög med gräs på toppen.'),
    ]),
    KORT('f8_helig', 'De heliga platserna', 'Steg 8.5.5: en ruta som blivit helig ur en händelse. Sorten följer vad som står där: stenen, vattnet, lunden eller trädet. Bilden visar stenen; de andra följer samma stil.', [
      PA(['.......y........', '......oSo.......', '.....oSSso......', '.....oSSso......', '....oSSSsso.....', '....oSSSsso.....', '...oSSSSssso....', '...oooooooo.....'], 'En grå sten med en gul punkt ovanpå.'),
      PA(['.......y........', '......yYy.......', '.....oSSso......', '.....oSySo......', '....oSSyssso....', '....oSSSsso.....', '...oSSSSssso....', '...oooooooo.....'], 'En sten med ett ristat tecken i guld.'),
      PA(['......y.y.......', '.....oSSSo......', '....oSSSSso.....', '....oSrSSso.....', '....oSSSrso.....', '...oSSSSSsso....', '..gg.oooooo.gg..', '.gGGg......gGGg.'], 'En sten med röda märken och gräs runt foten.'),
    ]),
    KORT('f8_drakt', 'Prästens dräkt, trons tecken och schamanens mask', 'Steg 8.5.15 och 8.5.17: dräkten behövs vid offer och fester, tecknet bär de troende, och masken bär schamanen. Bilden är ett förslag på hur de ser ut i förrådet.', [
      PA(['....oooooo......', '...occccccoo....', '..occccccccco...', '..occyyyycco....', '..occyyyycco....', '..occcccccco....', '..occcccccco....', '...oooooooo.....'], 'En ljus dräkt med en gul bård.'),
      PA(['................', '.....oyyo.......', '....oyYYyo......', '....oyYYyo......', '.....oyyo.......', '......oo........', '................', '................'], 'Trons tecken, ett gult smycke.'),
      PA(['....oooooooo....', '...oJJJJJJJJo...', '..oJJcoJJocJJo..', '..oJJJJJJJJJJo..', '..oJJrrrrrrJJo..', '...oJJJJJJJJo...', '....oJJJJJJo....', '.....oooooo.....'], 'En mask av trä med vita ögon och en röd mun.'),
    ]),
    KORT('f8_rokelse', 'Rökelse och brännolja', 'Steg 8.5.16: rökelse till tron och brännolja till lamporna, som görs i örtköket.', [
      PA(['.......b........', '......b.........', '.......b........', '.....oooooo.....', '....oJJJJJJo....', '....oJJJJJJo....', '.....oooooo.....', '................'], 'En skål med rök som stiger.'),
      PA(['......oo........', '.....oSSo.......', '.....oSSo.......', '....oSSSSo......', '...oSSSSSSo.....', '...oSSSSSSo.....', '....oSSSSo......', '.....oooo.......'], 'En lerflaska med olja.'),
      PA(['................', '...oo.....oo....', '..oyYo...oSSo...', '..oyYo...oSSo...', '..oyYo..oSSSSo..', '..oooo..oSSSSo..', '.........oooo...', '................'], 'Rökelsen som en gul klump och oljan i en flaska.'),
    ]),
  );
})();
