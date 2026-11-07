// system 8.7: rustningen, hjälmen, skölden, bågen, slungan, hornet och trumman, tre versioner av varje som enkla pixelbilder.
(() => {
  const { KORT, lagg, gras } = window.F7;
  const L = { a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3', s: 'skiffer1', S: 'skiffer2', T: 'skiffer3', y: 'senap2', w: 'ben2', W: 'ben3', r: 'rost2' };
  const PA = (rader, text) => ({ text, w: 24, h: 20, rita: B => { gras(B); lagg(B, rader, L, 4, 2, true); } });
  VAL.push(
    KORT('f8_rustning', 'Läderrustningen', 'Steg 8.7.1: av 4 läder och 2 rep, på platsen yttre. Skyddar bålen och armarna.', [
      PA(['..oooo..oooo....', '.obbbboobbbbo...', '.obcccccccbbo...', '..oSbccccbSo....', '...obccccbo.....', '...obccccbo.....', '...obccccbo.....', '...oooooooo.....'], 'En väst av mörkt läder med snören i sidorna.'),
      PA(['..oooo..oooo....', '.oaaaaooaaaao...', '.oabbbbbbbaao...', '..obbdbdbbbo....', '...obdbdbbo.....', '...obdbdbbo.....', '...obbbbbbo.....', '...oooooooo.....'], 'Pålagda bitar i rader, som fjäll.'),
      PA(['..oooo..oooo....', '.occccooccc o...', '.occddddddcco...', '..ocdddddco.....', '...ocdddco......', '...ocdddco......', '...ooooooo......', '................'].map(r => r.replace(' ', 'c')), 'Ljust läder, kort och öppet i sidorna.'),
    ]),
    KORT('f8_hjalm', 'Läderhjälmen', 'Steg 8.7.2: av 2 läder och 1 rep. Tar bort en del av slagen mot huvudet.', [
      PA(['.....oooooo.....', '....obbbbbbo....', '...obcccccbbo...', '...obcccccbbo...', '...oooooooooo...', '...o........o...'], 'En enkel kalott med en kant.'),
      PA(['.....oooooo.....', '....oaaaaaao....', '...oabbbbbbao...', '...oabbbbbbao...', '...oooooooooo...', '...ob......bo...'], 'Mörk och med kindskydd.'),
      PA(['......oSSo......', '.....oSbbSo.....', '....obcccbbo....', '...obcccccbbo...', '...oooooooooo...'], 'Med en förstärkt rand över hjässan.'),
    ]),
    KORT('f8_skold', 'Skölden', 'Steg 8.7.3: av 3 ved och 1 rep, hålls i en hand och slits som ett redskap.', [
      PA(['....oooooooo....', '...occccccccо...'.replace('о', 'o'), '..occccyyccccо..'.replace('о', 'o'), '..occcyyyycccо..'.replace('о', 'o'), '..occccyyccccо..'.replace('о', 'o'), '...occccccccо...'.replace('о', 'o'), '....oooooooo....'], 'Rund, av brädor, med en gul knopp.'),
      PA(['...oooooooooo...', '...occdccdccо...'.replace('о', 'o'), '...occdccdccо...'.replace('о', 'o'), '...occdccdccо...'.replace('о', 'o'), '...occdccdccо...'.replace('о', 'o'), '...occdccdccо...'.replace('о', 'o'), '...oooooooooo...'], 'Fyrkantig, av plankor.'),
      PA(['....oooooooo....', '...orrrrcccco...', '..orrrrrccccco..', '..orrrrrccccco..', '..orrrrrccccco..', '...orrrrcccco...', '....oooooooo....'], 'Rund och halvt målad i rött.'),
    ]),
    KORT('f8_bage', 'Bågen, pilarna och slungan', 'Steg 8.7.6: bågen av 2 virke och 1 rep, pilarna av ved och flinta, slungan av läder och rep.', [
      PA(['...oo...........', '..obbo..........', '..ob.o..w.......', '..ob..o.w.......', '..ob...ow.......', '..ob..o.w.......', '..ob.o..w.......', '..obbo..........', '...oo...........'], 'En enkel böjd båge med ett spänt rep.'),
      PA(['...........w....', '..........w.....', '.........w......', '........w.......', '.......w........', '......w.........', '.....Tw.........', '....TTb.........'], 'En pil med flintspets.'),
      PA(['................', '.o............o.', '..o..........o..', '...o........o...', '....oocccccoo...', '.....occccco....', '......ooooo.....'], 'En slunga av läder med två remmar.'),
    ]),
    KORT('f8_horn', 'Hornet och trumman', 'Steg 8.7.11–8.7.12: hornet hörs över hela kartan och trumman längre än ett rop.', [
      PA(['................', '............oo..', '..........ooWo..', '.......oooWWWo..', '....oooWWWWWo...', '..ooWWWWWooo....', '.oWWWooo........', '.ooo............'], 'Ett böjt horn av ben.'),
      PA(['....oooooooo....', '...oWWWWWWWWo...', '...oooooooooo...', '...obcbcbcbco...', '...ocbcbcbcbo...', '...obcbcbcbco...', '....oooooooo....'], 'En trumma med skinn och snören.'),
      PA(['............oo..', '..........ooyo..', '.......oooWWWo..', '....oooWWWWWo...', '..ooWWWyyooo....', '.oWWWooo........', '.ooo............'], 'Ett horn med gula band.'),
    ]),
  );
})();
