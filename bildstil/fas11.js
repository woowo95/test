// fas 11: tecknen på världskartan som kom med resorna (11.4 och 11.5): sällskapet som är ute på resa, gömman (packning som
// lämnats kvar), graven efter den som dog på vägen, vagnen och knappen som öppnar världskartan. 16 × 16 punkter per ruta som
// spelets världskarta, i spelets färger (TECKENPAL i src/ui/varldbild.ts), på marken bredvid ett träd och ett berg ur spelet.
(() => {
  const L = { k: 'kol0', K: 'kol3', j: 'jord1', J: 'jord2', l: 'jord3', y: 'senap3', Y: 'senap1', r: 'rost2', R: 'rost1', g: 'oliv1', G: 'oliv3', b: 'barr1', B: 'barr3', d: 'skiffer1', s: 'skiffer2', S: 'skiffer3', w: 'ben3', W: 'ben1' };
  const TRAD = ['', '', '', '......GGG', '....GGGGGgg', '...GGGGGgggg', '...GGGGgggggg', '....GGgggggg', '.....gggggg', '.......jj', '.......jj', '......kjjk'];
  const BERG = ['', '', '.......kk', '......kwwk', '.....kwwSdk', '....kSSSSddk', '...kSSSSdddk', '...kSSSdddddk', '..kSSSSddddddk', '..kSSSddddddddk', '.kkkkkkkkkkkkkk'];
  const fyll = (B, w, h, ramp, ton) => { const i = B.P.i(ramp, ton); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) B.satt(x, y, i); };
  // på världskartan: tre rutor i rad, träd, saken och berg, på gräsmark
  const PA_KARTAN = (text, rader) => ({ text, w: 16 * 3 + 8, h: 16 + 8, rita: (B) => {
    fyll(B, 56, 24, 'oliv', 2);
    ritaSprite(B, TRAD, L, 4, 4); ritaSprite(B, rader, L, 20, 4); ritaSprite(B, BERG, L, 36, 4);
  } });
  // knappen: en ruta i panelens mörka färg med en ram
  const KNAPP = (text, rader) => ({ text, w: 24, h: 24, rita: (B) => {
    fyll(B, 24, 24, 'kol', 1); const ram = B.P.i('kol', 2);
    for (let i = 0; i < 24; i++) { B.satt(i, 0, ram); B.satt(i, 23, ram); B.satt(0, i, ram); B.satt(23, i, ram); }
    ritaSprite(B, rader, L, 4, 4);
  } });
  const KORT = (id, namn, vad, versioner) => ({ id, namn, typ: 'tre', vad, versioner });

  VAL.push(
    KORT('f11_sallskap', 'Sällskapet på resa', 'Steg 11.5: ett sällskap som är ute på resa syns på världskartan där det är just nu och flyttar sig en ruta i taget. Bilden visar det mellan ett träd och ett berg ur spelet.', [
      PA_KARTAN('Två vandrare i rad med packning på ryggen.', ['', '', '.....kk......kk.', '....kwwk....kwwk', '....kwwk....kwwk', '..kk.kk...kk.kk.', '.kJJkrrk.kJJkrrk', '.kJlkrrk.kJlkrrk', '.kJJkrrk.kJJkrrk', '..kkkrrk..kkkrrk', '....kjjk....kjjk', '....k.k.....k.k.', '....k..k...k..k.', '...kk..kk.kk..kk']),
      PA_KARTAN('Tre små figurer på led, den främsta med en vandringsstav.', ['', '', '', '', '.kk...kk...kk..J', 'kwwk.kwwk.kwwk.J', '.kk...kk...kk..J', 'kRRk.kggk.krrkkJ', 'kRRk.kggk.krrk.J', 'kjjk.kjjk.kjjk.J', 'k..k.k..k.k..k.J', 'kk.kkk.kkk.kk..J']),
      PA_KARTAN('En större vandrare med ett knyte på en stång över axeln och en väska vid höften.', ['', '', '.....kk.........', '....kwwk........', '....kwwk...kkkk.', '.....kk...kJJJJk', '...kkrrkjjkJlJJk', '..kJkrrk..kJJJJk', '..kJkrrk...kkkk.', '...kkrrk........', '....kjjk........', '....k..k........', '...k....k.......', '..kk....kk......']),
    ]),
    KORT('f11_gomma', 'Gömman', 'Steg 11.5: packning som ett sällskap lämnat kvar ute i världen (en gömma) syns på världskartan tills någon hämtar den. Bilden visar den mellan ett träd och ett berg ur spelet.', [
      PA_KARTAN('Ett knyte ombundet med rep.', ['', '', '', '', '', '......kkkk......', '....kkJJJJkk....', '...kJJJyJJJJk...', '...kJJyyyJJJk...', '..kJJJJyJJJJJk..', '..kJlJJyJJJlJk..', '..kJJJJyJJJJJk..', '...kkkkkkkkkk...']),
      PA_KARTAN('Ett röse av stenar där knytet sticker fram.', ['', '', '', '', '', '.......kk.......', '......kSdk......', '.....kkkkkk.....', '....kSSdkSdk....', '...kkkkJJkkkk...', '..kSSdkJlkSSdk..', '..kSddkkkkSddk..', '.kkkkkkkkkkkkkk.']),
      PA_KARTAN('En käpp med en röd lapp över en grävd fläck.', ['', '', '', '.......Jrr......', '.......JrRr.....', '.......Jrr......', '.......J........', '.......J........', '.......J........', '....kkkJkkk.....', '..kjjJJJJJjjk...', '.kjJJlJJJlJJjk..', '..kjjjjjjjjjk...']),
    ]),
    KORT('f11_grav', 'Graven ute i världen', 'Steg 11.5: den som dör på en resa begravs där, och graven syns på världskartan. I spelet är den nu ett kryss. Bilden visar den mellan ett träd och ett berg ur spelet.', [
      PA_KARTAN('En gräsbevuxen hög med en rest sten.', ['', '', '', '.......kk.......', '......kSSk......', '......kSdk......', '......kSdk......', '......kSdk......', '....kkkSdkkk....', '..kkgGGkkGGgkk..', '.kgGGGGGGGGGGgk.', 'kgggGGGGGGGGgggk', 'kkkkkkkkkkkkkkkk']),
      PA_KARTAN('En låg stenhäll i gräset.', ['', '', '', '', '', '', '...kkkkkkkkkk...', '..kSSSSSSSSSdk..', '.kSSSSSSSSSdddk.', '.kdddddddddddk..', '.kkkkkkkkkkkkk..', 'g..G........G.g.']),
      PA_KARTAN('En hög av nygrävd jord med en trästolpe och ett rött band.', ['', '', '', '.......kk.......', '......kJJk......', '......kRRk......', '......kJJk......', '......kJlk......', '......kJlk......', '...kkkkJlkkkk...', '..kjjjjkkjjjjk..', '.kjJJJJJJJJJJjk.', 'kjJJJJlJJJlJJJjk', 'kkkkkkkkkkkkkkkk']),
    ]),
    KORT('f11_vagn', 'Vagnen', 'Steg 11.5: ett sällskap som har en vagn drar den med sig, och en vagn som lämnats kvar syns på världskartan. Bilden visar den mellan ett träd och ett berg ur spelet.', [
      PA_KARTAN('En tvåhjulig kärra från sidan med säckar på flaket och skaklar framåt.', ['', '', '', '', '....kkk.kkk.....', '...kwwWkwwWk....', '...kWWWkWWWk....', '.kkkkkkkkkkkkkkk', '.kJlJJJJJlJJk...', '.kkkkkkkkkkk....', '....kjJjk.......', '...kjJkJjk......', '....kjJjk.......', '.....kkk........']),
      PA_KARTAN('En tom handkärra med höga sidor och två hjul.', ['', '', '', '', '..kkkkkkkkkk....', '..kJJJJJJJJk....', '..kJlJJJJlJk....', '..kkkkkkkkkkkkkk', '...kj....kj.....', '..kjJk..kjJk....', '...kj....kj.....']),
      PA_KARTAN('En fyrhjulig vagn med ett tak av ljust tyg.', ['', '', '', '....kkkkkkk.....', '...kwwwwwwwk....', '..kwWwwwwwWwk...', '..kwwwwwwwwwk...', '.kkkkkkkkkkkkk..', '.kJJJJJJJJJJJkkk', '.kkkkkkkkkkkkk..', '..kjk.....kjk...', '.kjJjk...kjJjk..', '..kjk.....kjk...']),
    ]),
    KORT('f11_kartknapp', 'Knappen till världskartan', 'Steg 11.4: knappen i spelet som öppnar världskartan. Bilden visar den som en knapp i panelen.', [
      KNAPP('En rulle pergament som är utrullad, med skog, sjö och en väg.', ['', '', '', '.kkk........kkk.', 'kwWWkkkkkkkkWWwk', 'kWwkwwwwwwwwkwWk', 'kWwkwGGwwsswkwWk', 'kWwkwwGwJssWkwWk', 'kWwkwwwJJwwWkwWk', 'kWwkwSwwwGGWkwWk', 'kWwkwwwwwGGWkwWk', 'kwWWkkkkkkkkWWwk', '.kkk........kkk.']),
      KNAPP('En vikt karta med två veck och ett rött kryss.', ['', '', '', '.kkkkkkkkkkkkkk.', '.kwwwWwwwwWwwwk.', '.kwGGWwsswWrwrk.', '.kwGwWwwssWwrwk.', '.kwwwWJwwwWrwrk.', '.kwSwWJJwwWwwwk.', '.kSSSWwJwwWwGGk.', '.kwwwWwwwwWwGGk.', '.kkkkkkkkkkkkkk.']),
      KNAPP('Ett fyrkantigt pergament med en kompassros.', ['', '', '', '..kkkkkkkkkkkk..', '..kwwwwwwwwwWk..', '..kwwwwRwwwwWk..', '..kwwwwRwwwwWk..', '..kwwwkRkwwwWk..', '..kwRRRkdddwWk..', '..kwwwkdkwwwWk..', '..kwwwwdwwwwWk..', '..kwwwwdwwwwWk..', '..kWWWWWWWWWWk..', '..kkkkkkkkkkkk..']),
    ]),
  );
})();

// fas 11: grundarnas trasiga vagn (steg 11.6.13). Grundarna kom långt bortifrån med en vagn som gick sönder där byn ligger;
// den står i lagret på startplatsen med de första sakerna i och är förvaring. Ingen bygger en sådan. En ruta (16 × 16 punkter),
// snett ovanifrån som stationerna, på gräs.
(() => {
  const L = { k: 'kol0', K: 'kol3', j: 'jord1', J: 'jord2', l: 'jord3', y: 'senap3', Y: 'senap1', r: 'rost2', R: 'rost1', g: 'oliv1', G: 'oliv3', b: 'barr1', B: 'barr3', d: 'skiffer1', s: 'skiffer2', S: 'skiffer3', w: 'ben3', W: 'ben1' };
  const PA = (text, rader) => ({ text, w: 24, h: 24, rita: (B) => {
    const g = B.P.i('oliv', 2); for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) B.satt(x, y, g);
    ritaSprite(B, rader, L, 4, 4);
  } });
  VAL.push({ id: 'f11_vagnsvrak', namn: 'Grundarnas trasiga vagn', typ: 'tre', slag: ['station'], vad: 'Steg 11.6.13: grundarna kom långt bortifrån, och deras vagn gick sönder där byn ligger. Den står i lagret på startplatsen med de första sakerna i och rymmer tre stackar. Ingen bygger en sådan. En ruta stor, snett ovanifrån som stationerna, på gräs', versioner: [
    PA('En tvåhjulig kärra som tappat ena hjulet och lutar på axeln; hjulet ligger bredvid, och en säck ligger kvar på flaket.', [
      '', '', '',
      '.kkkkkkkkkk.....',
      '.kJJJJJJJJk.....',
      '.kJkkwwkJJk.....',
      '.kJkwWwwkJk.....',
      '.kJkkkkkkJk.....',
      '.kJJJyyJJJk.....',
      '.kjjjjjjjjkkkkk.',
      '.kkkkkkkkkkjjjjk',
      'kJJk......kkkkk.',
      'kjlk............',
      'kJJk..kkk.......',
      '.kk..kjJjk......',
      '......kkk.......',
    ]),
    PA('En liten fyrhjulig vagn med ett tak av ljust tyg; framaxeln har gått av så att framänden sjunkit, och en bit av hjulet ligger i gräset.', [
      '',
      '...kkkkkkk......',
      '..kwwwwwwwk.....',
      '.kwWwwwwWwwk....',
      '.kwwwwkkwwwk....',
      '.kwwwk..kwwk....',
      '.kkkkkkkkkkkk...',
      '.kJJJJJJJJJJk...',
      '.kJlJJJJJJlJk...',
      '.kjjjjjjjjjjkk..',
      '.kkkkkkkkkkkjjk.',
      'kJk.kJk..kjjjjk.',
      'klk.klk...kkkk..',
      'kJk.kJk.........',
      '.k...k...kJJJk..',
      '.........kkkkk..',
    ]),
    PA('Ett lågt flak som vilar på ett hjul och en sten; det andra hjulet har lossnat och lutar mot kanten. Ett knyte och en säck ombundna med rep.', [
      '', '', '', '',
      '...kkk..kkkk....',
      '..kwwWk.kJJJk...',
      '..kwWWkkyJlJk...',
      'kkkkkkkkkkkkkkk.',
      'kJJJJJJJJJJJJJk.',
      'kJlJJJJJJJJlJJk.',
      'kjjjjjjjjjjjjjk.',
      'kkkkkkkkkkkkkkk.',
      '.kJk....kSdk..kk',
      '.kjk...kSSddkkJk',
      '.kJk...kkkkkkJjk',
      '..k.........kkk.',
    ]),
  ] });
})();

// fas 11: sändebudets symbol (steg 11.6.23). Ett bud bär byns besked till en granne, och en granne skickar sina bud hit.
// Symbolen står i resans dagbok när beskedet framförs, i gästens ruta och i notisen. I spelet är den nu en emoji (📜).
// Visad som en knapp i panelen.
(() => {
  const L = { k: 'kol0', K: 'kol3', j: 'jord1', J: 'jord2', l: 'jord3', r: 'rost2', R: 'rost1', w: 'ben3', W: 'ben1' };
  const fyll = (B, w, h, f, i) => { const c = B.P.i(f, i); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) B.satt(x, y, c); };
  const KNAPP = (text, rader) => ({ text, w: 24, h: 24, rita: (B) => {
    fyll(B, 24, 24, 'kol', 1); const ram = B.P.i('kol', 2);
    for (let i = 0; i < 24; i++) { B.satt(i, 0, ram); B.satt(i, 23, ram); B.satt(0, i, ram); B.satt(23, i, ram); }
    ritaSprite(B, rader, L, 4, 4);
  } });
  VAL.push({ id: 'f11_sandebud', namn: 'Sändebudets symbol', typ: 'tre', slag: ['symbol'], vad: 'Steg 11.6.23: byns sändebud bär ett vänligt eller ovänligt besked till en grannby, och grannbyarnas bud kommer hit som gäster. Symbolen står i resans dagbok, i gästens ruta och i notisen. Bilden visar den som en knapp i panelen.', versioner: [
    KNAPP('En budkavle: en snidad trästav med skåror, snett över rutan, med en röd snodd knuten runt mitten.', [
      '.............kk.',
      '............kllk',
      '...........klJk.',
      '..........kjJk..',
      '.........klJk...',
      '........kRRkr...',
      '.......kRrk.r...',
      '......klJk..r...',
      '.....kjJk.......',
      '....klJk........',
      '...kjJk.........',
      '..klJk..........',
      '.kJJk...........',
      '..kk............',
    ]),
    KNAPP('En hoprullad näverrulle, vit med näverns mörka streck, ombunden med en röd snodd vars ändar hänger ner.', [
      '', '', '', '',
      '...kkkkkkkkkkk..',
      '..kwwkwwRrwwwkk.',
      '.kWwwwwwRrwkwkWk',
      '.kwwwkwwRrwwwkwk',
      '.kWwwwwwRrwwwkWk',
      '..kwwwkwRrwkwkk.',
      '...kkkkkkkkkkk..',
      '........rr......',
      '.......r..r.....',
    ]),
    KNAPP('En liten träbricka med inristade runor och ett hål upptill, där en röd snodd är trädd att bära den i.', [
      '',
      '.......rr.......',
      '......r..r......',
      '......r..r......',
      '...kkkkkkkkkk...',
      '..kJJJJrrJJJJk..',
      '..kJlJJJJJJlJk..',
      '..kJkJkJJkJkJk..',
      '..kJkkJJJkkJJk..',
      '..kJkJkJJkJkJk..',
      '..kJJJJJJJJJJk..',
      '..kJkJJkJkJJJk..',
      '..kJkkJkkJkJJk..',
      '..kjjjjjjjjjjk..',
      '...kkkkkkkkkk...',
    ]),
  ] });
})();

// fas 11: kartbladet (steg 11.7.1). En karta är ett blad pergament med platser i världen som ritaren känner: en sjö, en stig och
// märken där byarna ligger. Symbolen står i listan över skrifterna i krönikan och på bladet i förrådet. I spelet är den nu
// platshållaren karta. Visad som en knapp i panelen.
(() => {
  const L = { k: 'kol0', w: 'ben3', W: 'ben2', b: 'skiffer2', B: 'skiffer1', j: 'jord1', r: 'rost1', g: 'oliv2' };
  const fyll = (B, w, h, f, i) => { const c = B.P.i(f, i); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) B.satt(x, y, c); };
  const KNAPP = (text, rader) => ({ text, w: 24, h: 24, rita: (B) => {
    fyll(B, 24, 24, 'kol', 1); const ram = B.P.i('kol', 2);
    for (let i = 0; i < 24; i++) { B.satt(i, 0, ram); B.satt(i, 23, ram); B.satt(0, i, ram); B.satt(23, i, ram); }
    ritaSprite(B, rader, L, 4, 4);
  } });
  VAL.push({ id: 'f11_kartblad', namn: 'Kartbladet', typ: 'tre', slag: ['symbol'], vad: 'Steg 11.7.1: den som minns platser i världen ritar dem på ett blad pergament, högst sex platser, och den som läser kartan känner sedan platserna. Symbolen står i listan över skrifterna och på bladet i förrådet. Bilden visar den som en knapp i panelen.', versioner: [
    KNAPP('Ett platt blad med det övre högra hörnet vikt, och på bladet en sjö, en slingrande stig, en dunge och tre röda kryss där platserna ligger.', [
      '................',
      '.kkkkkkkkkkkk...',
      '.kwwwwwwwwwwWk..',
      '.kwwbbbwwwwwWWk.',
      '.kwbbBbbwwwkkkk.',
      '.kwwbbbwwwwwwwk.',
      '.kwwwwwjwwwgwwk.',
      '.kwwwwjwwwgggwk.',
      '.kwwwjwwwwwgwwk.',
      '.kwwjwwwwwwwwwk.',
      '.kwwjjwwwwrwrwk.',
      '.kwwwwjjjwwrwwk.',
      '.kwwwwwwwjrwrwk.',
      '.kWwwwwwwwwwwWk.',
      '.kkkkkkkkkkkkkk.',
    ]),
    KNAPP('En halvt utrullad karta: bladet rullat runt en stav i var ände, och mellan rullarna en sjö, en skog, en stig och en röd prick.', [
      '',
      '',
      '.kkk........kkk.',
      'kWwWkkkkkkkkWwWk',
      'kWwWwwwwbbbwWwWk',
      'kWwWwgwwbBbwWwWk',
      'kWwWgggwwbwwWwWk',
      'kWwWwgwjwwwwWwWk',
      'kWwWwwjwjwwwWwWk',
      'kWwWwjwwwjwrWwWk',
      'kWwWwrwwwwjwWwWk',
      'kWwWwwwwwwwwWwWk',
      'kWwWkkkkkkkkWwWk',
      '.kkk........kkk.',
    ]),
    KNAPP('Ett blad vikt i tre delar, där mittdelen ligger lite lägre och i skugga, och en stig som går över vecken mellan tre röda märken.', [
      '',
      '',
      '.kkkkkk....kkkk.',
      '.kwwwwwkkkkwwwk.',
      '.kwrwwwWWbbwwwk.',
      '.kwwjwwWbbbbwwk.',
      '.kwwwjwWWbbwrwk.',
      '.kwwwjjWWWWjwwk.',
      '.kwwwwwjjWjwwwk.',
      '.kwgwwwWWjWwwwk.',
      '.kgggwwWWWjwrwk.',
      '.kwgwwwWWWWwwwk.',
      '.kwwwwwkkkkwwwk.',
      '.kkkkkk....kkkk.',
    ]),
  ] });
})();

// Steg 11.8.16 och 11.8.17: märket för ett uppdrag på världskartan och ryktet äventyrare. Platshållarna i spelet är en liten
// rulle med rött sigill (varldbild.ts, TECKEN.uppdrag) och i_aventyrare (ikoner.ts). Visade som knappar i panelen
(() => {
  const L = { k: 'kol0', w: 'ben3', W: 'ben2', j: 'jord1', J: 'jord2', r: 'rost1', R: 'rost2', g: 'oliv2', s: 'skiffer2', S: 'skiffer1', h: 'hud2' };
  const fyll = (B, w, h, f, i) => { const c = B.P.i(f, i); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) B.satt(x, y, c); };
  const KNAPP = (text, rader) => ({ text, w: 24, h: 24, rita: (B) => {
    fyll(B, 24, 24, 'kol', 1); const ram = B.P.i('kol', 2);
    for (let i = 0; i < 24; i++) { B.satt(i, 0, ram); B.satt(i, 23, ram); B.satt(0, i, ram); B.satt(23, i, ram); }
    ritaSprite(B, rader, L, 4, 4);
  } });
  VAL.push({ id: 'f11_uppdragmarke', namn: 'Uppdragets märke på världskartan', typ: 'tre', slag: ['symbol'], vad: 'Steg 11.8.16: på världskartan får en plats med ett uppdrag som byn känner till ett litet märke, så att man ser var det finns något att hämta eller någon att hjälpa. Märket ligger ovanpå platsens tecken och måste synas på både skog, slätt och berg. Bilden visar det som en knapp i panelen.', versioner: [
    KNAPP('En hoprullad pergamentsrulle snett över rutan, knuten med ett rött band och ett runt rött sigill i mitten.', [
      '................',
      '..........kkk...',
      '.........kwwWk..',
      '........kwwWWk..',
      '.......kwwWWk...',
      '......kwwRRk....',
      '.....kwwRrrRk...',
      '....kwwWRrrRk...',
      '...kwwWWkRRk....',
      '..kwwWWk........',
      '.kwwWWk.........',
      '.kWWWk..........',
      '..kkk...........',
    ]),
    KNAPP('En hög, smal stång nedstucken i marken med en röd vimpel i toppen, som en flagga där uppdraget väntar.', [
      '................',
      '....kk..........',
      '....kJkkkkk.....',
      '....kJrrrrRk....',
      '....kJrrrRRRk...',
      '....kJrrrrRk....',
      '....kJkkkkk.....',
      '....kJk.........',
      '....kJk.........',
      '....kJk.........',
      '....kJk.........',
      '...kkJkk........',
      '..kjjjjjk.......',
      '...kkkkk........',
    ]),
    KNAPP('Ett rött runt sigill av vax med ett utropstecken i ljust, som om det var en stämpel på kartan.', [
      '................',
      '.....kkkkkk.....',
      '....kRrrrrRk....',
      '...kRrrwwrrRk...',
      '..kRrrrwwrrrRk..',
      '..kRrrrwwrrrRk..',
      '..kRrrrwwrrrRk..',
      '..kRrrrwwrrrRk..',
      '..kRrrrrrrrrRk..',
      '..kRrrrwwrrrRk..',
      '...kRrrwwrrRk...',
      '....kRRRRRRk....',
      '.....kkkkkk.....',
    ]),
  ] });
  VAL.push({ id: 'f11_aventyrare', namn: 'Ryktet äventyrare', typ: 'tre', slag: ['symbol'], vad: 'Steg 11.8.17: den som klarat ett uppdrag ute i världen får ryktet äventyrare i byn. Symbolen står vid ryktet i personens ruta och i berättelserna. Bilden visar den som en knapp i panelen.', versioner: [
    KNAPP('En vandringsstav med en knut i toppen och en liten knyte hängande från den, som den som varit långt borta bär.', [
      '................',
      '.........kkk....',
      '........kJjJk...',
      '........kjJjk...',
      '.........kJkk...',
      '.........kJkwk..',
      '........kJkwWwk.',
      '........kJkwWwk.',
      '.......kJk.kwk..',
      '.......kJk..k...',
      '......kJk.......',
      '......kJk.......',
      '.....kJk........',
      '.....kkk........',
    ]),
    KNAPP('En stig som slingrar sig från rutans nedre kant upp mot ett berg med snö på toppen, och en liten röd flagga på toppen.', [
      '................',
      '........k.......',
      '.......krk......',
      '.......kRrk.....',
      '.......kk.......',
      '......kwwk......',
      '.....kwSwwk.....',
      '....kSSsSwSk....',
      '...kSsSSsSsSk...',
      '..kssSjjSsssSk..',
      '..kkkkjkkkkkkk..',
      '.....kjk........',
      '......kjk.......',
      '.......kjk......',
    ]),
    KNAPP('En öppnad rulle med en bock i rött på, ett uppdrag som är klart.', [
      '................',
      '..kkkkkkkkkkk...',
      '.kWwwwwwwwwwWk..',
      '.kkwwwwwwwwwkk..',
      '..kwwwwwwwwrk...',
      '..kwwwwwwwrRk...',
      '..kwwwwwwrRwk...',
      '..kwrwwwrRwwk...',
      '..kwRrwrRwwwk...',
      '..kwwRrRwwwwk...',
      '..kwwwRwwwwwk...',
      '.kkwwwwwwwwwkk..',
      '.kWwwwwwwwwwWk..',
      '..kkkkkkkkkkk...',
    ]),
  ] });
})();

// Steg 11.9.2: världskartan på pergament. Ett utsnitt av spelets riktiga världskarta (värld 7), överst som den ritas nu och
// nederst på pergament (src/ui/pergament.ts). Punkterna kommer från spelets kod: npx tsx bildstil/varldkarta.ts ger
// varldkarta.json, där varje punkt är färgens nummer i paletten.
(() => {
  const RAMPER = ['kol', 'jord', 'senap', 'rost', 'oliv', 'barr', 'skiffer', 'ben'], K = VARLDKARTA;
  VAL.push({ id: 'f11_pergament', namn: 'Världskartan på pergament', typ: 'janej', slag: [], vad: 'Steg 11.9.2: världskartan ritas som en gammal karta på pergament: landet ljust, kusten ett bläckstreck med ett eko ute i havet, havet blått med vågstreck, floderna som slingrande linjer, lövträd i skogen, granar tätt i den täta skogen, tuvor och vattenstreck på myren och berg med en skuggsida. Rutorna syns inte längre, kusten och kanterna mellan marksorterna är rundade. Överst som kartan ser ut i spelet nu, nederst förslaget, samma utsnitt av en värld ur spelet. Platsernas tecken, namnen, kompassrosen och ramen kommer i nästa steg. Ja eller nej?', versioner: [{ text: 'Överst den nuvarande världskartan, nederst samma utsnitt på pergament.', w: K.w, h: K.h * 2 + 4, rita: B => {
    const rad = (rader, y0) => rader.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const n = parseInt(r[x], 32); B.satt(x, y0 + y, B.P.i(RAMPER[n >> 2], n & 3)); } });
    rad(K.nu, 0); rad(K.ny, K.h + 4);
  } }] });
})();

// Steg 11.9.3: platsernas tecken på pergamentkartan (en per sort i LANDMARKEN), tre idéer: bläckbilder från sidan,
// kartsymboler som på gamla kartor och små sköldar med sortens färg och ett märke. Alla femton på ett stycke pergament,
// i ordningen by, handelsläger, rövarläger, utpost, ruin, helig plats, gravhög, runsten, fyndplats, karavanrest, gömma,
// bro, spång, röjd passage och rastplats.
(() => {
  const L = { o: 'kol1', a: 'ben3', b: 'ben1', r: 'rost1', R: 'rost2', j: 'jord2', J: 'jord1', g: 'oliv2', G: 'oliv1', s: 'skiffer2', d: 'skiffer1', y: 'senap2' };
  const SORTER = ['by', 'handelslager', 'rovarlager', 'utpost', 'ruin', 'helig', 'gravhog', 'runsten', 'fyndplats', 'karavanrest', 'gomma', 'bro', 'spang', 'passage', 'rastplats'];
  const BLACK = {
    by: ['.....oo.....', '....oaao....', '...oaaaao...', '..oaaaaaao..', '.oaaaaaaaao.', 'oooooooooooo', '.oaaaaaaaao.', '.oaaarraaao.', '.oaaarraaao.', '.oooooooooo.'],
    handelslager: ['.....r......', '.....rr.....', '.....o......', '....oao.....', '...oaoao....', '..oaaoaao...', '.oaaaoaaao..', 'oaaaaoaaaao.', 'ooooooooooo.'],
    rovarlager: ['o.........o.', '.o.......o..', '..o.....o...', '...o...o....', '....o.o.....', '.....o......', '....oro.....', '...orrro....', '..o.rrr.o...', '.o..ooo..o..'],
    utpost: ['..o.o.o.o...', '..ooooooo...', '..oaaaaao...', '..ooooooo...', '...oa.ao....', '...o.o.o....', '...oo.oo....', '...o.o.o....', '..oo...oo...', '.oo.....oo..'],
    ruin: ['..oo........', '..oao...oo..', '..oao...oao.', '..oaoo..oao.', '..oaaoooaao.', '..oaoaaoaao.', '..oooooooooo', '.b...b...b..'],
    helig: ['.....oo.....', '..o.oaao.o..', '....oaao....', '.o..oaro..o.', '....oaao....', '....oaao....', '...oaaaao...', '..oooooooo..'],
    gravhog: ['.....o......', '....oao.....', '...ooooo....', '..oagagao...', '.oaaaaaaao..', 'oaagaaagaao.', 'oooooooooooo'],
    runsten: ['...oooo.....', '..oaaaao....', '..oaraao....', '..oarrao....', '..oaraao....', '..oaarao....', '..oaraao....', '..oaaaao....', '.oooooooo...'],
    fyndplats: ['.r.......r..', '..r.....r...', '...r...r....', '....r.r.....', '.....r......', '....r.r.....', '...r...r....', '..r.....r...', '.r.......r..'],
    karavanrest: ['...ooooo....', '..o..o..o...', '.o...o...o..', '.o.o.o.o.o..', '.ooooooooo..', '.o.o.o.o.o..', '.o...o...o..', '..o..o..o...', '...ooooo....'],
    gomma: ['....o.o.....', '.....o......', '....ooo.....', '...oaaao....', '..oaaaaao...', '..oaajaao...', '..oaaaaao...', '...ooooo....'],
    bro: ['oooooooooooo', 'oaoaoaoaoaoa', 'oooooooooooo', 'oo........oo', 'o..........o', '.ssss..ssss.'],
    spang: ['............', 'oooooooooooo', 'oajojaojajoo', 'oooooooooooo', '.o...o...o..', 'ss.ss.ss.ss.'],
    passage: ['......oo....', '.....oaao...', '....o.ooo...', '...o..oo....', '..o.........', '.oooooooo...', '.ojjjjjjo...', '.ojjjjjjo...', 'oooooooooo..'],
    rastplats: ['.....r......', '....rr......', '....rrr.....', '...rryrr....', '...o.o.o....', '..o.o.o.o...', '.oo.ooo.oo..'],
  };
  const SYMBOL = {
    by: ['...oooo...', '..o....o..', '.o..oo..o.', '.o.oooo.o.', '.o.oooo.o.', '.o..oo..o.', '..o....o..', '...oooo...'],
    handelslager: ['....o.....', '...o.o....', '..o...o...', '.o..o..o..', 'o.......o.', 'ooooooooo.'],
    rovarlager: ['...rrrr...', '..r....r..', '.r.o..o.r.', '.r..oo..r.', '.r..oo..r.', '.r.o..o.r.', '..r....r..', '...rrrr...'],
    utpost: ['.o........', '.orr......', '.or.......', '.o........', 'oooooo....', 'o....o....', 'o.oo.o....', 'o....o....', 'oooooo....'],
    ruin: ['oo.oo.oo', 'o......o', '........', 'o......o', 'o......o', '........', 'o......o', 'oo.oo.oo'],
    helig: ['....o....', '.o..o..o.', '..o.o.o..', '...ooo...', 'oooo.oooo', '...ooo...', '..o.o.o..', '.o..o..o.', '....o....'],
    gravhog: ['...ooo...', '.ooooooo.', 'ooooooooo', '.........', 'ooooooooo'],
    runsten: ['..ooo..', '..o.o..', '..ooo..', '..o.o..', '..ooo..', '..o.o..', 'ooooooo'],
    fyndplats: ['o.....o', '.o...o.', '..o.o..', '...r...', '..o.o..', '.o...o.', 'o.....o'],
    karavanrest: ['..ooo..', '.o.o.o.', 'o..o..o', 'ooooooo', 'o..o..o', '.o.o.o.', '..ooo..'],
    gomma: ['...o...', '..o.o..', '.o.o.o.', 'o.ooo.o', '.o.o.o.', '..o.o..', '...o...'],
    bro: ['o........o', '.oooooooo.', '..........', '.oooooooo.', 'o........o'],
    spang: ['o.o.o.o.o.o', 'ooooooooooo', 'o.o.o.o.o.o'],
    passage: ['o.......o', 'oo.....oo', 'o.o...o.o', 'o..o.o..o', 'o...o...o'],
    rastplats: ['...r...', '..rrr..', '.rrrrr.', 'ooooooo'],
  };
  const SKOLD = ['ooooooooooo', 'offfffffffo', 'offfffffffo', 'offfffffffo', 'offfffffffo', 'offfffffffo', 'offfffffffo', '.offfffffo.', '.offfffffo.', '..offfffo..', '...offfo...', '....ooo....'];
  const MARKE = {
    by: ['r', ['..a..', '.aaa.', 'aaaaa', '.a.a.', '.aaa.']], handelslager: ['y', ['..a..', '.a.a.', 'a...a', 'aaaaa', '.....']],
    rovarlager: ['d', ['a...a', '.a.a.', '..a..', '.a.a.', 'a...a']], utpost: ['j', ['a.a.a', 'aaaaa', '.aaa.', '.a.a.', '.a.a.']],
    ruin: ['s', ['a...a', 'a.a.a', 'a.a.a', 'aaaaa', '.....']], helig: ['g', ['..a..', '.a.a.', 'a.a.a', '.a.a.', '..a..']],
    gravhog: ['G', ['.....', '.aaa.', 'aaaaa', '.....', 'aaaaa']], runsten: ['s', ['.aa..', '.a.a.', '.aa..', '.a.a.', '.aa..']],
    fyndplats: ['y', ['.....', '..a..', '.aaa.', '..a..', '.....']], karavanrest: ['j', ['.aaa.', 'a.a.a', 'aaaaa', 'a.a.a', '.aaa.']],
    gomma: ['J', ['.a.a.', '..a..', '.aaa.', 'aaaaa', '.aaa.']], bro: ['j', ['aaaaa', 'a...a', 'a...a', '.....', '.....']],
    spang: ['s', ['.....', 'a.a.a', 'aaaaa', 'a.a.a', '.....']], passage: ['G', ['...aa', '..aaa', '.a.a.', 'a....', '.....']],
    rastplats: ['r', ['..a..', '.aa..', '.aaa.', 'aaaaa', 'a.a.a']],
  };
  const skold = k => { const [f, m] = MARKE[k]; return SKOLD.map((r, y) => [...r].map((c, x) => { if (c !== 'f') return c; const mc = m[y - 2]?.[x - 3]; return mc === 'a' ? 'a' : f; }).join('')); };
  // ett tecken mitt i en ruta på 16 × 16 punkter
  const mitt = (B, rader, cx, cy) => { const h = rader.length, w = Math.max(...rader.map(r => r.length)); ritaSprite(B, rader, L, cx + ((16 - w) >> 1), cy + ((16 - h) >> 1)); };
  const VERSION = (text, rad) => ({ text, w: 5 * 20 + 4, h: 3 * 20 + 4, rita: B => {
    const P = B.P;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 104; x++) { const g = ((x * 374761393 + y * 668265263) >>> 0) % 97; B.satt(x, y, g < 3 ? P.i('ben', 1) : P.i('ben', 2)); }
    SORTER.forEach((k, i) => mitt(B, rad(k), 4 + (i % 5) * 20, 4 + Math.floor(i / 5) * 20));
  } });
  VAL.push({ id: 'f11_platstecken', namn: 'Platsernas tecken på pergamentkartan', typ: 'tre', slag: [], vad: 'Steg 11.9.3: varje sort av plats i världen får ett eget tecken på pergamentkartan. Alla femton på ett stycke pergament, från vänster och nedåt: by, handelsläger, rövarläger, utpost, ruin, helig plats, gravhög, runsten, fyndplats, karavanrest, gömma, bro, spång, röjd passage och rastplats. Namnen står under tecknen på kartan.', versioner: [
    VERSION('Bläckbilder från sidan: ett hus, ett tält med vimpel, korsade spjut över en eld, ett vakttorn, en rasad mur, en rest sten, en hög, en runsten, ett rött kryss, ett vagnshjul, ett knyte, en bro, en spång, en yxa i en stubbe och en lägereld, i bläck med lite rött.', k => BLACK[k]),
    VERSION('Kartsymboler som på gamla kartor: ringar, trianglar, streck och prickar i bläck, med rött för rövarna, fynden och elden.', k => SYMBOL[k]),
    VERSION('Små sköldar i sortens färg med ett ljust märke: röd för byn, gul för handeln och fynden, mörk för rövarna, brun för det som byggs, grön för de heliga platserna och gravarna.', skold),
  ] });
})();

// Steg 11.9.4: kartans utsmyckning: ramen, kompassrosen och bilderna i havet, tre idéer, ritade på samma utsnitt av
// pergamentkartan som kortet f11_pergament (en värld ur spelet). Kompassrosen står i havet uppe till vänster och bilden i
// havet uppe till höger.
(() => {
  const RAMPER = ['kol', 'jord', 'senap', 'rost', 'oliv', 'barr', 'skiffer', 'ben'], K = VARLDKARTA, W = K.w, H = K.h;
  const bas = B => K.ny.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const n = parseInt(r[x], 32); B.satt(x, y, B.P.i(RAMPER[n >> 2], n & 3)); } });
  const linje = (B, x0, y0, x1, y1, f) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let t = 0; t <= n; t++) B.satt(Math.round(x0 + (x1 - x0) * t / n), Math.round(y0 + (y1 - y0) * t / n), f); };
  const ring = (B, cx, cy, r, f, gles = 1) => { const n = Math.ceil(r * 8); for (let a = 0; a < n; a++) if (a % gles === 0) B.satt(Math.round(cx + Math.cos(a / n * 2 * Math.PI) * r), Math.round(cy + Math.sin(a / n * 2 * Math.PI) * r), f); };
  const skiva = (B, cx, cy, r, f) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) B.satt(cx + x, cy + y, f); };
  const sprite = (B, rader, leg, x0, y0) => rader.forEach((r, y) => [...r].forEach((c, x) => { if (leg[c] !== undefined) B.satt(x0 + x, y0 + y, leg[c]); }));
  const RUNOR = [['#.#', '##.', '#.#', '#..', '#..'], ['##.', '#.#', '#.#', '#.#', '#.#'], ['#..', '##.', '#.#', '##.', '#..'], ['##.', '#.#', '##.', '#.#', '#.#'], ['#.#', '##.', '#..', '#..', '#..'], ['#.#', '.#.', '###', '.#.', '#.#'], ['.#.', '.##', '##.', '.#.', '.#.'], ['.#.', '.#.', '.#.', '.#.', '.#.'], ['..#', '.#.', '#..', '.#.', '..#'], ['##.', '#.#', '##.', '#.#', '##.']];
  const CX = 44, CY = 72, SX = 262, SY = 14; // kompassrosen och havets bild

  // version 1: runbandet, en åttauddig ros med röd nordspets och en havsorm
  function v1(B) {
    const P = B.P, BL = P.i('kol', 1), PA = P.i('ben', 2), LJ = P.i('ben', 3), RO = P.i('rost', 1), SK = P.i('jord', 2);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = Math.min(x, y, W - 1 - x, H - 1 - y); if (k < 9) B.satt(x, y, k === 0 || k === 8 ? BL : k === 1 ? P.i('senap', 3) : PA); }
    let i = 0;
    for (let x = 12; x < W - 14; x += 4) RUNOR[(i++ * 7) % RUNOR.length].forEach((r, dy) => [...r].forEach((c, dx) => { if (c === '#') { B.satt(x + dx, 2 + dy, BL); B.satt(x + dx, H - 7 + dy, BL); } }));
    for (let y = 12; y < H - 14; y += 4) RUNOR[(i++ * 3) % RUNOR.length].forEach((r, dy) => [...r].forEach((c, dx) => { if (c === '#') { B.satt(2 + dy, y + dx, BL); B.satt(W - 7 + dy, y + dx, BL); } }));
    for (const [x, y] of [[4, 4], [W - 5, 4], [4, H - 5], [W - 5, H - 5]]) { skiva(B, x, y, 3, RO); ring(B, x, y, 3, BL); B.satt(x, y, LJ); }
    ring(B, CX, CY, 9, BL, 2);
    for (let k = 0; k < 8; k++) { // åtta uddar: de fyra stora längre, ljus och mörk halva
      const a = k / 8 * 2 * Math.PI - Math.PI / 2, L = k % 2 ? 9 : 15, w = k % 2 ? 2 : 3;
      const ex = CX + Math.cos(a) * L, ey = CY + Math.sin(a) * L, px = -Math.sin(a) * w, py = Math.cos(a) * w;
      for (let t = 0; t <= 1; t += 0.04) for (let s = 0; s <= 1; s += 0.1) {
        const bx = CX + px * (1 - s) * (1 - t), by = CY + py * (1 - s) * (1 - t);
        B.satt(Math.round(bx + (ex - CX) * t * (1 - s * 0) ), Math.round(by + (ey - CY) * t), k === 0 ? RO : LJ);
        B.satt(Math.round(CX - px * (1 - s) * (1 - t) + (ex - CX) * t), Math.round(CY - py * (1 - s) * (1 - t) + (ey - CY) * t), k === 0 ? P.i('rost', 0) : SK);
      }
      linje(B, Math.round(CX + px), Math.round(CY + py), Math.round(ex), Math.round(ey), BL); linje(B, Math.round(CX - px), Math.round(CY - py), Math.round(ex), Math.round(ey), BL);
    }
    skiva(B, CX, CY, 1, BL);
    // havsormen: tre bågar och ett huvud
    const G = P.i('barr', 2);
    for (let k = 0; k < 3; k++) for (let a = 0; a <= 10; a++) { const x = SX + k * 11 + a, y = SY + 8 - Math.round(Math.sin(a / 10 * Math.PI) * 6); B.satt(x, y, BL); B.satt(x, y + 1, G); B.satt(x, y + 2, BL); }
    sprite(B, ['..ooo.', '.oggro', 'oggggo', '.ooggo', '...oo.'], { o: BL, g: G, r: RO }, SX + 33, SY + 2);
    for (let x = SX - 2; x < SX + 40; x += 3) B.satt(x, SY + 11, P.i('skiffer', 2));
  }
  // version 2: en dubbel bläcklinje med små rutor i hörnen, en ros som en ring med kors och röd pil, och ett långskepp
  function v2(B) {
    const P = B.P, BL = P.i('kol', 1), PA = P.i('ben', 3), RO = P.i('rost', 1);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = Math.min(x, y, W - 1 - x, H - 1 - y); if (k < 6) B.satt(x, y, k === 1 || k === 4 ? BL : PA); }
    for (const [x, y] of [[0, 0], [W - 6, 0], [0, H - 6], [W - 6, H - 6]]) for (let dy = 0; dy < 6; dy++) for (let dx = 0; dx < 6; dx++) B.satt(x + dx, y + dy, dx === 0 || dy === 0 || dx === 5 || dy === 5 ? BL : dx > 1 && dx < 4 && dy > 1 && dy < 4 ? RO : PA);
    skiva(B, CX, CY, 11, PA); ring(B, CX, CY, 11, BL); ring(B, CX, CY, 7, BL, 3);
    linje(B, CX - 15, CY, CX + 15, CY, BL); linje(B, CX, CY + 15, CX, CY - 4, BL);
    sprite(B, ['...o...', '..oro..', '..oro..', '.orrro.', '.orrro.', 'orrrrro', '...o...'], { o: BL, r: RO }, CX - 3, CY - 18);
    for (const [x, y] of [[CX + 16, CY - 2], [CX - 19, CY - 2], [CX - 1, CY + 16]]) skiva(B, x + 1, y + 2, 1, BL);
    // långskeppet: skrovet med drakhuvud, masten och ett randigt segel
    const J = P.i('jord', 2), JM = P.i('jord', 1), W3 = P.i('ben', 3);
    sprite(B, [
      '..............o..............',
      '.........ooooooooooooo.......',
      '.........oRwRwRwRwRwRo.......',
      '.........oRwRwRwRwRwRo.......',
      '.........oRwRwRwRwRwRo.......',
      '.........oRwRwRwRwRwRo.......',
      '.........ooooooooooooo.......',
      'oo............o.............o',
      'ojo...........o............oj',
      '.ojoooooooooooooooooooooooojo.',
      '..ojJjJjJjJjJjJjJjJjJjJjJjo..',
      '...oooooooooooooooooooooooo...',
    ], { o: BL, R: RO, w: W3, j: J, J: JM }, SX, SY);
    for (let x = SX - 3; x < SX + 34; x++) if (x % 4 !== 0) B.satt(x, SY + 12, P.i('skiffer', 2));
  }
  // version 3: ett band av flätverk i brunt, solkorset som kompass och en val som blåser
  function v3(B) {
    const P = B.P, BL = P.i('kol', 1), J = P.i('jord', 2), JL = P.i('jord', 3), JM = P.i('jord', 1), PA = P.i('ben', 2), Y = P.i('senap', 2), YL = P.i('senap', 3);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = Math.min(x, y, W - 1 - x, H - 1 - y); if (k >= 8) continue;
      const u = (k === Math.min(y, H - 1 - y)) ? x : y; // längs bandet
      const a = (u + k) % 8, b = (u - k + 64) % 8; // två strängar som korsar varandra
      B.satt(x, y, k === 0 || k === 7 ? BL : a < 2 ? (Math.floor((u + k) / 8) % 2 ? JL : J) : b < 2 ? JM : PA);
    }
    skiva(B, CX, CY, 12, PA); ring(B, CX, CY, 12, BL); ring(B, CX, CY, 11, Y);
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) for (let t = -11; t <= 11; t++) { B.satt(CX + dx * t, CY + dy * t, BL); B.satt(CX + dx * t + dy, CY + dy * t + dx, YL); }
    sprite(B, ['..o..', '.oyo.', 'oyyyo', '.ooo.'], { o: BL, y: P.i('rost', 1) }, CX - 2, CY - 17);
    skiva(B, CX, CY, 2, Y); ring(B, CX, CY, 2, BL);
    // valen med en stråle
    const S = P.i('skiffer', 1), SL = P.i('skiffer', 3), V = P.i('ben', 3);
    sprite(B, [
      '......v.v.v.................',
      '.......vvv..................',
      '........v...................',
      '......oooooo................',
      '...oooSSSSSSoooo............',
      '..oSSSSSSSSSSSSSooo.....oo..',
      '.oSSoSSSSSSSSSSSSSSoo..oSo..',
      '.oSSSSSSSSSSSSSSSSSSSooSo...',
      '.oLLLLLLLLLSSSSSSSSSSSSo....',
      '..ooLLLLLLLLLLLLSSSSoo.oSo..',
      '....oooooooooooooooo....oo..',
    ], { o: BL, S, L: SL, v: V }, SX, SY);
    for (let x = SX - 2; x < SX + 30; x += 2) B.satt(x, SY + 12, P.i('skiffer', 2));
  }
  const VERSION = (text, f) => ({ text, w: W, h: H, rita: B => { bas(B); f(B); } });
  VAL.push({ id: 'f11_utsmyckning', namn: 'Pergamentkartans ram, kompassros och havets bilder', typ: 'tre', slag: [], vad: 'Steg 11.9.4: pergamentkartan får en ram runt kanten, en kompassros och bilder ute i havet, som på gamla kartor. Samma utsnitt av en värld ur spelet i alla tre; rosen står i havet uppe till vänster och bilden i havet uppe till höger. I spelet står rosen och bilderna där det finns öppet hav.', versioner: [
    VERSION('Ett runband runt kanten med runor mellan två bläcklinjer och röda knutar i hörnen, en åttauddig ros med röd nordspets och en havsorm.', v1),
    VERSION('En enkel dubbel bläcklinje med små rutor i hörnen, en ros som en ring med kors och en röd pil mot norr, och ett långskepp med randigt segel.', v2),
    VERSION('Ett band av brunt flätverk runt kanten, solkorset i guld som kompass med en röd spets mot norr, och en val som blåser.', v3),
  ] });
})();

// fas 11: ruinens murar och karavanens vagnrest på den lilla kartan (steg 11.13.26). När ett sällskap kommer till en ruin står
// byns hus kvar som murar med luckor där de rasat, och det som finns kvar ligger inne i husen; vid en karavanrest ligger de
// trasiga vagnarna. En ruta (16 × 16 punkter) per murbit och vagn, snett ovanifrån som kartan, på gräs. Muren visas som ett
// helt hus på 5 × 4 rutor med luckor, som spelet lägger den.
(() => {
  const L = { k: 'kol0', K: 'kol1', j: 'jord1', J: 'jord2', l: 'jord3', y: 'senap3', g: 'oliv1', G: 'oliv2', O: 'oliv3', d: 'skiffer1', s: 'skiffer2', S: 'skiffer3', w: 'ben3', '^': 'skugga' };
  const gras = (B, w, h) => { const g = B.P.i('oliv', 2); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) B.satt(x, y, g); };
  const LUCKA = [0, 3, 8, 11]; // rutorna runt huset där muren rasat (i ordningen medurs från hörnet uppe till vänster)
  const HUS = (text, rader) => ({ text, w: 96, h: 80, rita: (B) => {
    gras(B, 96, 80);
    const kant = []; for (let x = 0; x < 5; x++) kant.push([x, 0]); for (let y = 1; y < 4; y++) kant.push([4, y]); for (let x = 3; x >= 0; x--) kant.push([x, 3]); for (let y = 2; y >= 1; y--) kant.push([0, y]);
    kant.forEach(([x, y], i) => { if (!LUCKA.includes(i)) ritaSprite(B, rader, L, 8 + x * 16, 4 + y * 16); });
  } });
  VAL.push({ id: 'f11_ruinmur', namn: 'Ruinens rasade mur', typ: 'tre', slag: [], vad: 'Steg 11.13.26: på den lilla kartan för en ruin står byns hus kvar som murar, med luckor där de rasat. Det som finns kvar av byns saker ligger inne i husen. En ruta per murbit, snett ovanifrån som kartan, på gräs; här ett helt hus på 5 × 4 rutor med fyra luckor', versioner: [
    HUS('En torrmur av gråsten: kantiga stenar staplade i två lager med fogar, ovansidan ljus och framsidan mörkare, och en sten som fallit ner framför.', [
      '', '', '', '',
      '..kkkk.kkkkk....',
      '.kSSSSkSSSSSk.kk',
      'kSSsSSkSsSSSkkSk',
      'kssssskssssskSsk',
      'kkkkkkkkkkkkkkkk',
      'kdsdkdsddkdsdkdk',
      'kddkdddkddddkddk',
      'kkkkkkkkkkkkkkkk',
      'kdddkdsddkddsddk',
      'kkkkkkkkkkkkkkkk',
      '.^^^^^^^^^^kkk^.',
      '..........kSsk..',
    ]),
    HUS('Murkna timmerstockar som legat i knut: tre stockar på varandra, den mittersta avbruten, med mossa på den översta och i springorna.', [
      '', '', '', '',
      '.gGgg...........',
      'kkkkkkkkkkkkkkk.',
      'kJJlJJJJJlJJJJJk',
      'kjjjjjjjjjjjjjjk',
      'kkkkkkkkkkkkkkk.',
      '.kJJJJlJJJJk....',
      '.kjjjjjjjjjk.gG.',
      'kkkkkkkkkkkkkkkk',
      'kJJJJJJJlJJJJJJk',
      'kjjjjjjjjjjjjjjk',
      'kkkkkkkkkkkkkkkk',
      '.^^^^^^^^^^^^^^.',
    ]),
    HUS('En låg vall av jord och torv där väggen stått, övervuxen med gräs, med en och annan sten som sticker upp ur jorden.', [
      '', '', '', '', '', '',
      '....kkkkkkk.....',
      '..kkGGgGGGGkk...',
      '.kGGgGGGGgGGGk..',
      'kGgGGGkkGGGgGGk.',
      'kgggggkSkggggggk',
      'kJJjJJkskJJJjJJk',
      'kjJJjJJkJjJJJjjk',
      '.kkkkkkkkkkkkkk.',
      '..^^^^^^^^^^^^..',
      '',
    ]),
  ] });
  // gravhögen (steg 11.13.28): 3 × 2 rutor vid mitten av den lilla kartan, gåvorna ligger inne i den. Raderna räknas ur formen,
  // som är symmetrisk kring mitten
  const HOG = (text, rader) => ({ text, w: 64, h: 48, rita: (B) => { gras(B, 64, 48); ritaSprite(B, rader, L, 8, 8); } });
  const kupol = (W, H, cy, rx, ry, extra) => {
    const g = Array.from({ length: H }, () => Array(W).fill('.')), cx = (W - 1) / 2, fot = ry * 0.4; // foten är en ellips sedd snett ovanifrån
    const inne = (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / (y < cy ? ry : fot)) ** 2 <= 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (inne(x, y)) {
        const lj = ((x - cx + rx * 0.2) / (rx * 0.55)) ** 2 + ((y - cy + ry * 0.55) / (ry * 0.35)) ** 2 <= 1; // ljuset på toppen
        const nere = y >= cy + fot - 2;
        g[y][x] = lj ? 'O' : nere ? 'j' : y > cy - ry * 0.1 ? 'g' : 'G';
      } else if (inne(x, y - 1) || inne(x, y + 1) || inne(x - 1, y) || inne(x + 1, y)) g[y][x] = 'k';
    }
    for (let x = 0; x < W; x++) for (let y = H - 1; y > 0; y--) if (g[y - 1][x] === 'k' && g[y][x] === '.') { g[y][x] = '^'; break; }
    if (extra) extra(g, cx, cy, fot);
    return g.map(r => r.join(''));
  };
  const sten = (g, x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) g[y + j][x + i] = j === 0 ? 'S' : i === 0 || i === w - 1 || j === h - 1 ? 'k' : j < 2 ? 'S' : 's'; };
  VAL.push({ id: 'f11_gravhog', namn: 'Gravhögen i världen', typ: 'tre', slag: [], vad: 'Steg 11.13.28: på den lilla kartan för en gravhög står högen vid mitten, 3 × 2 rutor. Gravgåvorna ligger inne i den och syns inte. Den som kommer dit kan bryta upp den och ta gåvorna, om tron, seden och ryktet tillåter. Snett ovanifrån som kartan, på gräs', versioner: [
    HOG('En rund kupol av torv, gräsbevuxen, högst i mitten och ljusast där solen når toppen, med en mörk jordkant vid foten.', kupol(48, 32, 20, 21, 17)),
    HOG('En flatare hög med en krans av gråsten runt foten, som hålls på plats av stenarna; gräset växer mellan dem.', kupol(48, 32, 19, 19, 13, (g, cx, cy, fot) => { for (let i = 0; i <= 8; i++) { const a = Math.PI * i / 8, x = Math.round(cx - 2 + Math.cos(a) * 20), y = Math.round(cy + Math.sin(a) * (fot + 1)) - 1; if (y >= 0 && y + 3 < 32 && x >= 0 && x + 4 < 48) sten(g, x, y, 4, 3); } })),
    HOG('En låg och lång hög, som en uppochnedvänd båt, med en upprest sten mitt på toppen som märker graven.', kupol(48, 32, 22, 23, 9, (g, cx, cy) => { sten(g, Math.round(cx) - 2, cy - 19, 5, 13); })),
  ] });
  const VAGN = (text, rader) => ({ text, w: 24, h: 24, rita: (B) => { gras(B, 24, 24); ritaSprite(B, rader, L, 4, 4); } });
  VAL.push({ id: 'f11_vagnrest', namn: 'Karavanens trasiga vagn', typ: 'tre', slag: [], vad: 'Steg 11.13.26: där rövare plundrat en karavan ligger vagnarna kvar, och det rövarna lämnade ligger bredvid. Den lilla kartan för karavanresten har två vagnar. En ruta stor, snett ovanifrån som kartan, på gräs. Den ska se annorlunda ut än grundarnas vagn i byn, som gått sönder av sig själv', versioner: [
    VAGN('Vagnen har vält på sidan: botten med de två axlarna vänd mot betraktaren, ett hjul uppe i luften och det andra under, och en sönderslagen låda bredvid.', [
      '', '',
      '...........kkk..',
      '..........kJ.Jk.',
      '.kkkkkkkkkkkJk..',
      '.kJJJJJJJJk.Jk..',
      '.kkkkkkkkkkkkk..',
      '.kjjjjjjjjjjk...',
      '.kkkkkkkkkkkk...',
      '.kJJJJJJJJJJk...',
      '.kkkkkkkkkkkkkk.',
      '.^^^^^^^^^^kJJk.',
      '..........kjJjk.',
      '...........kkk..',
    ]),
    VAGN('En bränd vagn: svarta bräder som ligger isär i en fyrkant, ett halvt hjul och grå aska mellan dem, och ett järnbeslag som blivit kvar.', [
      '', '', '',
      '..kKKKk..kKKk...',
      '..kkkkk..kkkk...',
      '.kK.sss.s.ssKk..',
      '.kK.s.sss.s.Kk..',
      '.kK..ss.sss.Kk..',
      '.kK.sss.s.dsKk..',
      '..kkk.kKKKkk....',
      '.kKk...kkkk.....',
      'kKkKk...........',
      'kk.kk...........',
      '.^^^^^^^^^......',
    ]),
    VAGN('Vagnen står kvar men är plundrad: flaket är tomt och sidobrädan nerslagen, skakeln bruten och liggande i gräset, och en tom säck hänger över kanten.', [
      '', '',
      '.kkkkkkkkkkk....',
      '.kJJJJJJJJJk....',
      '.kJjjjjjjjJk....',
      '.kJjjjjjjjJkw...',
      '.kJjjjjjjjJkww..',
      '.kJJJJJJJJJkwk..',
      '.kkkkkkkkkkkk...',
      'kJk.....kJk.....',
      'klk.....klk.kkkk',
      'kJk.....kJkkJJJk',
      '.k.......k..kkkk',
      '.^^^^^^^^^......',
    ]),
  ] });
})();

// steg 11.1.16 och 11.1.22: symbolerna i panelerna som delade en annan betydelses symbol (en symbol per betydelse): pilarna åt
// sidorna i Seder (pilen upp vriden ett kvarts varv) och Trons bud, trons hus, kyrkans förråd, de troende, helgonen och de
// heliga kvädena. En version av varje, ja eller nej
(() => {
  const L = { o: 'kol0', k: 'kol2', r: 'rost2', R: 'rost3', d: 'rost1', y: 'senap2', Y: 'senap3', z: 'senap1', j: 'jord1', J: 'jord2', b: 'jord3', w: 'ben3', W: 'ben2', s: 'skiffer2', S: 'skiffer3', q: 'skiffer1' };
  const botten = (B, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) B.satt(x, y, B.P.i('ben', 2)); };
  const ruta = (B, rader) => { botten(B, 20, 20); ritaSprite(B, rader, L, 2, 2); };
  // pilen upp (godkänd, sym_pil_upp) vriden ett kvarts varv medsols: pilen åt höger; speglad: åt vänster
  const UPP = { rader: ['.......M.......', '......MPM......', '.....MOOPM.....', '....MOOONNM....', '...MOOOONNNM...', '..MOOOOONNNNM..', '.MOOOOOONNNNNM.', 'MMMMMMMMMMMMMMM', '...............'], pal: { M: '#353204', P: '#898b4c', O: '#647025', N: '#4b4f00' } };
  const H0 = UPP.rader.length, W0 = UPP.rader[0].length;
  const hoger = Array.from({ length: W0 }, (_, y) => Array.from({ length: H0 }, (_, x) => UPP.rader[H0 - 1 - x][y]).join(''));
  const vanster = hoger.map(r => [...r].reverse().join(''));
  const pil = (B, rader, x0, y0) => rader.forEach((r, y) => [...r].forEach((ch, x) => { const c = UPP.pal[ch]; if (c) B.satt(x0 + x, y0 + y, B.P.fran(c)); }));
  const S = 'Steg 11.1.22: en symbol per betydelse. I Tro delade den här saken symbol med något annat (skriftrullen, folket eller gnistorna), och nu får den en egen. Symbolen i 16 punkter på panelens botten. Ja eller nej?';
  VAL.push(
    { id: 'f11_pil_sidor', sym: ['sym_pil_vanster', 'sym_pil_hoger'], namn: 'Pilarna åt sidorna i Seder', typ: 'janej', vad: 'Steg 11.1.16: pilarna vid upplevelserna i Seder (åt vilket håll en upplevelse drar seden, en till tre pilar) blir pixelsymboler. De är den godkända pilen upp, vriden ett kvarts varv: till vänster en pil åt vänster, sedan en åt höger och sist tre i rad, som när en upplevelse drar starkt. Ja eller nej?', versioner: [{ text: 'Pilen upp vriden ett kvarts varv: åt vänster, åt höger och tre åt höger i rad.', w: 72, h: 20, rita: B => { botten(B, 72, 20); pil(B, vanster, 2, 2); pil(B, hoger, 16, 2); for (let i = 0; i < 3; i++) pil(B, hoger, 34 + i * 12, 2); } }] },
    { id: 'f11_sym_bud', sym: 'sym_bud', namn: 'Trons bud', typ: 'janej', vad: S, versioner: [{ text: 'En rundad stenhäll med ristade runor i rader.', w: 20, h: 20, rita: B => ruta(B, [
      '................', '.....oooooo.....', '...ooSSSSSSoo...', '..oSSSSSSSSSso..', '..oSqqSqSqqsso..', '..oSSSSSSSSsso..', '..oSqSqqSqSsso..', '..oSSSSSSSssso..',
      '..oSqqSSqqssso..', '..oSSSSSSsssso..', '..oSqSqqSqssso..', '..oSSSSssssssso..', '..osssssssssso..', '...oooooooooo...', '................', '................']) }] },
    { id: 'f11_sym_troshus', sym: 'sym_troshus', namn: 'Trons hus', typ: 'janej', vad: S, versioner: [{ text: 'Ett litet gudahus med brant tak av rött trä, ett guldtecken i nocken och en mörk dörr.', w: 20, h: 20, rita: B => ruta(B, [
      '................', '.......oo.......', '......oYyo......', '.......oo.......', '......oRro......', '.....oRrrdo.....', '....oRrrrrdo....', '...oRrrrrrrdo...',
      '..oooooooooooo..', '...obJJJJJJjo...', '...obJoooJJjo...', '...obJokoJJjo...', '...obJokoJJjo...', '...obJokoJJjo...', '...oooooooooo...', '................']) }] },
    { id: 'f11_sym_kyrkoforrad', sym: 'sym_kyrkoforrad', namn: 'Kyrkans förråd', typ: 'janej', vad: S, versioner: [{ text: 'En kista av trä med järnband och ett guldtecken på framsidan.', w: 20, h: 20, rita: B => ruta(B, [
      '................', '................', '...oooooooooo...', '..obbbbbbbbbJo..', '..obJJJJJJJJjo..', '..okkkkkkkkkko..', '..obbbboobbbjo..', '..obbboYyobbjo..',
      '..obbboyzobbjo..', '..oJJJJooJJJjo..', '..okkkkkkkkkko..', '..ojjjjjjjjjjo..', '..oooooooooooo..', '................', '................', '................']) }] },
    { id: 'f11_sym_troende', sym: 'sym_troende', namn: 'De troende', typ: 'janej', vad: S, versioner: [{ text: 'En människa i lång dräkt med båda armarna lyfta mot himlen.', w: 20, h: 20, rita: B => ruta(B, [
      '.o............o.', 'owo..........owo', 'owo...oooo...owo', '.owo.oRRRro.owo.', '.owo.oRRrro.owo.', '..owo.orro.owo..', '..obJooooooJjo..', '...obJbbbbJjo...',
      '....obbbbbjo....', '....obbbbJjo....', '...obbbbbJJjo...', '...obbbbJJjjo...', '..obbbbJJJjjjo..', '..oooooooooooo..', '................', '................']) }] },
    { id: 'f11_sym_helgon', sym: 'sym_helgon', namn: 'Helgonet', typ: 'janej', vad: S, versioner: [{ text: 'Ett huvud med en gyllene ring ovanför.', w: 20, h: 20, rita: B => ruta(B, [
      '....oooooooo....', '...oYYyyyyyzo...', '...oyoooooozo...', '....oooooooo....', '.....oooooo.....', '....oWwwwWWo....', '....owwwwWWo....', '....owowwoWo....',
      '....owwwwWWo....', '....oWwwwWWo....', '.....oWWWWo.....', '...oooooooooo...', '..obbbbbbbbJJo..', '..obbbbbbbJJjo..', '..oooooooooooo..', '................']) }] },
    { id: 'f11_sym_kvade', sym: 'sym_kvade', namn: 'De heliga kvädena', typ: 'janej', vad: S, versioner: [{ text: 'En lyra av trä med strängar.', w: 20, h: 20, rita: B => ruta(B, [
      '................', '.oooooooooooooo.', '.obbbbbbbbbbbJo.', '.oboooooooooJjo.', '.obo.w.w.w.oJjo.', '.obo.w.w.w.oJjo.', '.obo.w.w.w.oJjo.', '.obo.w.w.w.oJjo.',
      '..obow.w.woJjo..', '..obow.w.woJjo..', '...obowwwoJjo...', '...obooooJJjo...', '....obbbbJjo....', '.....oooooo.....', '................', '................']) }] },
  );
})();
