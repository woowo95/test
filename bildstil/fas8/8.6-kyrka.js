// system 8.6: hovet av trä och templet av sten som tron bygger där hovet stod, tre versioner av varje som enkla pixelbilder.
(() => {
  const { KORT, lagg, gras } = window.F7;
  const L = { j: 'jord1', J: 'jord2', k: 'jord3', s: 'skiffer1', S: 'skiffer2', T: 'skiffer3', y: 'senap3', Y: 'senap2', r: 'rost2', g: 'oliv1', G: 'oliv2' };
  const PA = (rader, text) => ({ text, w: 24, h: 18, rita: B => { gras(B); lagg(B, rader, L, 4, 2, true); } });
  VAL.push(
    KORT('f8_hov', 'Hovet', 'Steg 8.6.14: trons första helgedom, ett hus av trä som de troende bygger av kyrkans förråd. Det står där tron föddes eller vid den heliga platsen.', [
      PA(['.......y........', '......oJo.......', '.....oJJJo......', '....oJJJJJo.....', '...oJJJJJJJo....', '..oJJJJJJJJJo...', '..oooooooooo....', '..ojjjjjjjjo....', '..ojjj..jjjo....', '..ojjj..jjjo....', '..oooo..oooo....', '................'], 'Ett litet hus av trä med brant tak och en gul knopp i nocken.'),
      PA(['......y.y.......', '.....oJJJJo.....', '....oJJJJJJo....', '...oJJJJJJJJo...', '..oJJJJJJJJJJo..', '..oooooooooooo..', '...ojjkjjkjjo...', '...ojjkjjkjjo...', '...ojjk..kjjo...', '...ojjk..kjjo...', '...oooo..oooo...', '................'], 'Bredare, med drakhuvuden av trä på gavlarna och stolpar i väggen.'),
      PA(['.......y........', '......oro.......', '.....oJrJo......', '....oJJrJJo.....', '...oJJJJJJJo....', '..oooooooooo....', '..ojrjjjjrjo....', '..ojjj..jjjo....', '..ojjj..jjjo....', '..ojjj..jjjo....', '..oooo..oooo....', '................'], 'Med röda ristningar i taket och vid dörren.'),
    ]),
    KORT('f8_tempel', 'Templet av sten', 'Steg 8.6.14: när kyrkans förråd har nog med sten bygger de troende ett tempel där hovet stod. Det tar längre tid än hovet.', [
      PA(['.......y........', '......oSo.......', '.....oSSSo......', '....oSSSSSo.....', '...oSSSSSSSo....', '..oooooooooo....', '..osTsTsTsTo....', '..osTs..sTso....', '..osTs..sTso....', '..osTs..sTso....', '..oooo..oooo....', '................'], 'Murat av grå sten i skift, med ett spetsigt tak av sten.'),
      PA(['......yYy.......', '.....oSSSo......', '....oSSSSSo.....', '...oooooooooo...', '...oTsTsTsTso...', '...os.s.s.s.so..', '...os.s.s.s.so..', '...os.s.s.s.so..', '...os.s..s.s.o..', '..oooooooooooo..', '..oSSSSSSSSSSo..', '................'], 'Pelare av sten på en sockel, med en gul symbol överst.'),
      PA(['................', '.......y........', '....ooooooooo...', '...oSSSSSSSSSo..', '..oSTTTTTTTTTSo.', '..oooooooooooo..', '...osSsSsSsSo...', '...osS....sSo...', '...osS....sSo...', '...osS....sSo...', '..gooo....ooog..', '.gGG........GGg.'], 'Lågt och brett, med en stor port och gräs runt foten.'),
    ]),
  );
})();
