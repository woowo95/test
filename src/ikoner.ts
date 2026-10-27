// ikoner för föremål: små pixelbilder (8×8) som används både på kartan och i listorna
// varje tecken är en pixel, '.' är genomskinlig

// slagen av arbete ritas ljust i en färg (vattnet blått)
const AKT = { w: '#f4efe0', a: '#9fc6e8' };
// vädrets symboler (steg 2.11.1): samma färger för alla sex
const VADER_PAL = { K: '#61767a', S: '#dad0bb', W: '#dad0bb', a: '#906f0f', b: '#b2921b', c: '#d8b25f', d: '#8a9c9e', k: '#3e5156', o: '#24201d', s: '#bdb39b', v: '#bdb39b', w: '#a0947d', y: '#d8b25f' };
const PAL: Record<string, Record<string, string>> = {
  bar: { r: '#8a4ad8', R: '#b88aff', d: '#4e2280', g: '#4f8a3a' },
  rotter: { o: '#9a6a3e', O: '#c99a62', d: '#5e3c20', g: '#5f9a44' },
  kott: { r: '#9c3328', R: '#d26a56', w: '#eee2c8' },
  kanin: { b: '#9a7650', B: '#c8a478', w: '#f2ece0', k: '#1a1a1a', p: '#d88a8a' },
  fisk: { p: '#e89a7a', P: '#f6c8b0', w: '#fff2e6', s: '#c06a4a' },
  abborre: { g: '#6f7c34', G: '#a7b45a', k: '#2c3216', r: '#d4602c', w: '#e6dcae', e: '#111111' },
  svamp: { c: '#a0502e', C: '#d99060', s: '#ebe0c6', S: '#c4b694' },
  spindling: { c: '#c8361a', C: '#f07a44', s: '#e2c9a0', S: '#b8935e' },
  ved: { b: '#6a4426', B: '#8f603a', Y: '#dcb87e', y: '#a07a46' },
  grenar: { b: '#7a5a36', B: '#9c7848', g: '#5f8a3e' },
  torrgras: { y: '#d8c070', Y: '#f0dc94', t: '#8a6a3a' },
  kol: { k: '#24201c', K: '#4f4842' },
  flinta: { g: '#8f9396', G: '#c9cdd0', d: '#5f6366' },
  sten: { k: '#6a6e72', K: '#a4a9ae', d: '#4a4e52' },
  yxa: { h: '#7a5a36', g: '#8f9396', G: '#c9cdd0' },
  fiskespjut: { h: '#8a6a40', H: '#b08a58', w: '#e8d0a0' },
  flintspjut: { h: '#8a6a40', g: '#8f9396', G: '#c9cdd0', r: '#c8b07a' },
  rep: { y: '#c8b07a', Y: '#e8d4a0', d: '#8a7448' },
  ben: { w: '#e8e2d0', W: '#fffaf0', d: '#b8ae98' },
  vilt: { b: '#9a7650', B: '#c8a478', w: '#f2ece0', k: '#1a1a1a', r: '#9c3328' },
  kniv: { h: '#7a5a36', H: '#9c7848', g: '#8f9396', G: '#c9cdd0' },
  // kläderna och bensylen (steg 2.3.2; Björn valde kläderna efter v89, bensylen är en platshållare)
  bensyl: { w: '#efe6cc', W: '#fff8e6', d: '#b8a882' },
  skinnrock: { d: '#5e4026', w: '#d8c8a8', W: '#efe4cc', B: '#b48a5e', b: '#8a6440' },
  skinnskor: { w: '#d8c8a8', d: '#5e4026', B: '#b48a5e', s: '#f2ead2' },
  balte: { e: '#8a7448', Y: '#e8d4a0', y: '#c8b07a', d: '#5e4026' },
  mossa: { l: '#b4cc6a', G: '#7fa850', g: '#4f7a36', B: '#b48a5e', m: '#2f4a22' },
  // latrinen och benspaden (steg 2.7.2, Björn valde P6 och S1c/S1g efter v85)
  latrin: { o: '#8a6a40', O: '#b08a58', d: '#4a3018', k: '#24160a' },
  latrin_karta: { o: '#8a6a40', O: '#b08a58', d: '#4a3018', k: '#24160a' },
  // grillställningen och den grillade maten (steg 2.8.1; Björn valde 1b för kartan och symbolerna efter v89)
  grill: { w: '#5a3a1e', O: '#d0aa70', L: '#b07a45', W: '#8b5a2b', q: '#5e4226', f: '#e8862a', F: '#f6c24a', g: '#8a8f94', G: '#5e6266' },
  // brasan (steg 2.9.1; Björn valde symbolen och kartbilden efter v89)
  brasa: { w: '#5a3a1e', W: '#8b5a2b', Y: '#c9a46a', f: '#e2702e', F: '#ffd36b', V: '#fff2c0', h: '#b0b5b8', g: '#8a8f94', G: '#5e6266' },
  brasa_karta: { h: '#d6dadc', g: '#9a9fa4', G: '#4e5256', a: '#3a352f', b: '#1e1915', N: '#34383c' },
  grill_karta: { w: '#5a3a1e', W: '#8b5a2b', L: '#b07a45', O: '#d0aa70', q: '#5e4226', D: '#2a1c12', x: 'rgba(0,0,0,.30)' },
  grillfisk: { o: '#6e3418', B: '#dc9a52', c: '#3c2010', b: '#b8682e' },
  grillkott: { o: '#4a1c10', R: '#a85a32', c: '#2c140a', r: '#7e3a1e', w: '#e8d2a8' },
  // torkställningen och den torkade maten (steg 2.8.2; Björn valde 4a, fiskhäck med A-ramar, för kartan, och symbolerna efter v89; torkad fisk väntar på Björns val)
  tork: { w: '#5a3a1e', O: '#d0aa70', L: '#b07a45', M: '#cf5e48', m: '#9b3428', c: '#4e2418', W: '#8b5a2b' },
  tork_karta: { w: '#5a3a1e', W: '#8b5a2b', L: '#b07a45', O: '#d0aa70', x: 'rgba(0,0,0,.30)' },
  torrkott: { r: '#4e2418', R: '#6e3a26', w: '#cbb48e', o: '#24100a', h: '#9a6040' },
  torrfisk: { p: '#7a5030', P: '#a07048', w: '#d8c098', s: '#583820' },
  // de vilda grödorna, fröna och odlingen (steg 2.10.2, platshållare i bildstilens palett)
  vildkorn: { s: '#694902', y: '#906f0f', Y: '#b2921b', L: '#d8b25f', o: '#4b4f00' },
  arter: { o: '#353204', g: '#4b4f00', G: '#647025', L: '#898b4c', y: '#b2921b' },
  fron: { G: '#898b4c', L: '#d8b25f', Y: '#b2921b', g: '#647025', o: '#24201d', y: '#906f0f' },
  odling: { k: '#3f2415', j: '#5e3c24', J: '#7d5b40', g: '#4b4f00', G: '#647025', L: '#898b4c' },
  // grödorna från fälten och grodden på fältet (steg 2.10.3, platshållare i bildstilens palett)
  rovor: { B: '#bdb39b', G: '#647025', L: '#898b4c', R: '#a14808', W: '#dad0bb', b: '#a0947d', g: '#4b4f00', r: '#742a01' },
  korn: { J: '#7d5b40', L: '#d8b25f', Y: '#b2921b', j: '#5e3c24', k: '#3f2415', s: '#694902', y: '#906f0f' },
  // toa-högen (steg 2.10.5, platshållare efter stankslingan på kartan, ui/smuts.ts)
  toa: { C: '#7d5b40', V: '#898b4c', c: '#5e3c24', k: '#3f2415', v: '#d8b25f' },
  grodd: { g: '#4b4f00', G: '#647025', L: '#898b4c' },
  ...Object.fromEntries(['klart', 'moln', 'regn', 'sno', 'blast', 'aska'].map(k => ['vader_' + k, VADER_PAL])),
  vattensack: { B: '#8a9c9e', J: '#7d5b40', L: '#987e62', b: '#61767a', j: '#5e3c24', o: '#24201d', s: '#906f0f', y: '#b2921b' },
  benspade: { h: '#7a5a36', H: '#9c7848', y: '#c8b07a', Y: '#e8d4a0', w: '#e8e2d0', W: '#fffaf0', d: '#b8ae98', R: '#d8d0bc' },
  skinnklader: { b: '#8a6440', B: '#b48a5e', d: '#5e4026', w: '#d8c8a8' },
  slaktbank: { b: '#7a5a36', B: '#a8824e', d: '#4e3420', r: '#9c3328' },
  flatarbank: { b: '#7a5a36', B: '#a8824e', d: '#4e3420', y: '#c8ac5c', Y: '#ecd890', o: '#9a7444', O: '#d0aa70' },
  // stationerna på kartan i blandperspektiv (ovansidan och framsidan): lika breda som rutorna de tar (8 punkter per ruta,
  // stationer.ts); de som är högre än rutan sticker upp över rutan ovanför (foremal.ts)
  slaktbank_karta: { b: '#4a3320', B: '#33231a', w: '#5a3a1e', W: '#8b5a2b', L: '#b07a45', H: '#d0a26a', r: '#9a1f1f', R: '#5e1010', Y: '#c02a2a', x: 'rgba(0,0,0,0.30)' },
  flatarbank_karta: { D: '#2a1c12', d: '#4a3320', w: '#5a3a1e', W: '#8b5a2b', L: '#b07a45', H: '#d0a26a', o: '#9a7444', O: '#d0aa70', q: '#5e4226', x: 'rgba(0,0,0,0.30)' },
  // halmbädden och sittplatsen vid slöjdbänken (steg 2.2.5; Björn valde kartbilderna efter v89, symbolen i listan är en platshållare)
  halmbadd: { y: '#d8c070', Y: '#f0dc94', t: '#8a6a3a', b: '#6a4a2a' },
  halmbadd_karta: { q: '#a88a48', t: '#7a5e34', Y: '#ecd890', y: '#c8ac5c', x: 'rgba(0,0,0,0.30)' },
  sittplats: { r: '#a07040', C: '#ecc890', c: '#d0a46c', b: '#5e4026', B: '#86603a', d: '#3a2614', x: 'rgba(0,0,0,0.30)' },
  // borden (steg 2.2.15; Björn valde kartbilderna efter v89). Stubbarna runt dem är sittplatsen ovan
  bord: { w: '#5a3a1e', W: '#8b5a2b', L: '#b07a45', H: '#d0a26a', b: '#6a4a2a', B: '#9c7848', d: '#4a3018' },
  bord2: { w: '#5a3a1e', W: '#8b5a2b', L: '#b07a45', H: '#d0a26a', b: '#6a4a2a', B: '#9c7848', d: '#4a3018' },
  bord3: { w: '#5a3a1e', W: '#8b5a2b', L: '#b07a45', H: '#d0a26a', b: '#6a4a2a', B: '#9c7848', d: '#4a3018' },
  bord_karta: { H: '#d0a26a', w: '#5a3a1e', L: '#b07a45', W: '#8b5a2b', b: '#5e4026', B: '#86603a', d: '#3a2614', x: 'rgba(0,0,0,0.30)' },
  bord2_karta: { H: '#d0a26a', w: '#5a3a1e', L: '#b07a45', W: '#8b5a2b', b: '#5e4026', B: '#86603a', d: '#3a2614', x: 'rgba(0,0,0,0.30)' },
  bord3_karta: { H: '#d0a26a', w: '#5a3a1e', L: '#b07a45', W: '#8b5a2b', b: '#5e4026', B: '#86603a', d: '#3a2614', x: 'rgba(0,0,0,0.30)' },
  // förvaringen (steg 2.3.6; Björn valde kartbilderna efter v89)
  hylla: { w: '#5a3a1e', W: '#8b5a2b', L: '#b07a45', y: '#c8ac5c', g: '#8a8a80', r: '#c9a86a' },
  hylla_karta: { W: '#8b5a2b', w: '#4a3018', L: '#b07a45', r: '#c8b07a', x: 'rgba(0,0,0,.30)' },
  kista: { w: '#5a3a1e', W: '#8b5a2b', L: '#b07a45', H: '#d0a26a', g: '#6a6a60' },
  kista_karta: { f: '#9a7650', s: '#24160a', F: '#d4b07e', z: '#3e2a18', W: '#7e4e24', w: '#2e1c0c', x: 'rgba(0,0,0,.35)' },
  stall: { w: '#5a3a1e', W: '#8b5a2b', L: '#b07a45', g: '#8a8a80', G: '#b4b4aa' },
  stall_karta: { W: '#8b5a2b', L: '#b07a45', w: '#4a3018', x: 'rgba(0,0,0,.30)' },
  // skinnfällen i halmbädden (steg 2.2.14; Björn valde kartbilden efter v89)
  skinnfall: { b: '#8a6440', B: '#b48a5e', d: '#5e4026', w: '#d8c8a8' },
  skinnfall_karta: { z: '#4e3c2e', S: '#a08870', s: '#7c6450', f: '#5e4a3a' },
  // skinndörren i dörröppningen (steg 2.2.16; Björn valde kartbilden efter v89)
  skinndorr: { p: '#4a3018', b: '#8a6440', B: '#b48a5e', d: '#5e4026' },
  skinndorr_karta: { e: '#d8b480', E: '#efd3a0', o: '#6a4a2a', O: '#9c7848', S: '#a08870', s: '#7c6450', Z: '#36281e', z: '#4e3c2e', d: '#4a3018' },
  skinn: { b: '#8a6440', B: '#b48a5e', d: '#5e4026' },
  metspo: { h: '#8a6a40', y: '#c8b07a', w: '#e8e2d0' },
  korg: { t: '#6e4e2e', o: '#9a6a3e', O: '#c99a62', d: '#5e3c20' },
  risvagg: { p: '#5a3c22', b: '#8a6a40', B: '#b08a58' },
  timmervagg: { d: '#4a3018', b: '#8a5e34', B: '#b8885a', e: '#d8b480' },
  hogolv: { y: '#d8c070', Y: '#f0dc94', d: '#7a5a3a' },
  tragolv: { b: '#a07446', B: '#c09060', d: '#5a3c22' },
  paborjat: { w: '#f2ece0', d: '#2a241e', y: '#e0b050' },
  a_samla: AKT,
  a_odla: AKT,
  a_jaga: AKT,
  a_fiska: AKT,
  a_tra: AKT,
  a_bygga: AKT,
  a_hantverk: AKT,
  a_bara: AKT,
  a_elda: AKT,
  a_leka: AKT,
  // Björns valda symboler efter v89 (steg v91): handlingar (a_), skador (s_), näring (n_) och brister (b_)
  brasa_ved_karta: { Y: '#c9a46a', w: '#5a3a1e', W: '#8b5a2b', b: '#1e1915' },
  brasa_eld_karta: { f: '#e2702e', F: '#ffd36b', V: '#fff2c0', W: '#8b5a2b', w: '#5a3a1e', b: '#1e1915' },
  brasa_glod_karta: { u: 'rgba(225,225,225,.30)', E: '#e8582a', k: '#1a1714', e: '#b3361e' },
  a_svalka: { w: '#f4efe0', a: '#9fc6e8', y: '#f2d27a', r: '#e0604e' },
  a_dricka: { w: '#f4efe0', a: '#9fc6e8', y: '#f2d27a', r: '#e0604e' },
  a_fatt: { w: '#f4efe0', a: '#9fc6e8', y: '#f2d27a', r: '#e0604e' },
  a_smalta: { w: '#f4efe0', a: '#9fc6e8', y: '#f2d27a', r: '#e0604e' },
  a_vatten: { w: '#dad0bb', a: '#8a9c9e' }, // steg 2.10.1, platshållare i bildstilens palett
  a_varda: { w: '#f4efe0', a: '#9fc6e8', y: '#f2d27a', r: '#e0604e' },
  verkstad: { l: '#6a4426', O: '#d0aa70', L: '#9a6a3e', B: '#b48a5e', b: '#8a6440', n: '#eef4fa', k: '#5e6266', d: '#3a2614' },
  s_skarsar: { E: '#c9cdd0', r: '#b02a22', e: '#8f9396', H: '#9c7848', h: '#7a5a36', m: '#6a1612' },
  s_bett: { m: '#6a1612', r: '#b02a22', R: '#e04a3a', w: '#ece4cc', W: '#fffaf0', b: '#b4a688' },
  s_klos: { w: '#ece4cc', b: '#b4a688', r: '#b02a22', R: '#e04a3a', m: '#6a1612' },
  s_benbrott: { W: '#fffaf0', w: '#ece4cc', b: '#b4a688', r: '#b02a22' },
  s_krossar: { r: '#b02a22', R: '#e04a3a', e: '#8f9396', E: '#c9cdd0', o: '#6a5a52' },
  s_inf: { g: '#8aa83a', G: '#c4cc50', q: '#3e4a1a' },
  s_forb: { Z: '#7fa850', u: '#c8b07a', z: '#4f7a36', x: '#2f4a22' },
  s_ren: { a: '#5a9ad0', f: '#f8f4e8', F: '#ffe9a0', A: '#bfe0f6', c: '#2e5e8e' },
  s_kall: { g: '#4a2a52', G: '#6e3a7a', q: '#1e1022' },
  n_energi: { A: '#fbe27a', a: '#e8b828', D: '#9a6a14' },
  b_energi: { D: '#9a6a14', a: '#e8b828' },
  n_protein: { A: '#ea9580', a: '#c04a38', D: '#74261c' },
  b_protein: { D: '#74261c', a: '#c04a38' },
  n_fett: { A: '#fff3d2', a: '#e2c88e', D: '#9c7e40' },
  b_fett: { D: '#9c7e40', a: '#e2c88e' },
  n_vitamin: { g: '#5f9a44', G: '#8cc068', a: '#7e44c8', A: '#b88cf2', D: '#46207a' },
  b_vitamin: { D: '#46207a', a: '#7e44c8' },
  n_mineral: { A: '#eaf5fb', a: '#9ab8cc', D: '#52728a' },
  b_mineral: { D: '#52728a', a: '#9ab8cc' },
};

const PIX: Record<string, string[]> = {
  // korgen visas över huvudet på den som plockar bär: flätad, med handtag
  korg: [
    '..tttt..',
    '.t....t.',
    '.t....t.',
    'dOoOoOod',
    'doOoOoOd',
    '.dOoOod.',
    '.doOoOd.',
    '..dddd..',
  ],
  bar: [
    '....g...',
    '...gg...',
    '.Rr.Rr..',
    '.rd.rd..',
    'Rr.Rr.Rr',
    'rd.rd.rd',
    '..Rr....',
    '..rd....',
  ],
  rotter: [
    '.....g.g',
    '......g.',
    '....oOo.',
    '...oOoo.',
    '..oOood.',
    '.oOood..',
    '.ood....',
    'd.d.....',
  ],
  kott: [
    '..rrr...',
    '.rRRrr..',
    '.rRrrrr.',
    '.rrrrrr.',
    '..rrrrw.',
    '....rwww',
    '.....ww.',
    '........',
  ],
  kanin: [
    '.b.b....',
    '.bpb....',
    '.bBb....',
    'bkBBbb..',
    'bBBBBBb.',
    '.bBBBBbw',
    '..bBBbbw',
    '..b..b..',
  ],
  // fiskkött: en rensad bit fisk, ljus med fettränder
  fisk: [
    '........',
    '..ppppp.',
    '.pPPPPPs',
    'pPwPwPPs',
    'pPPPPPs.',
    '.pwPwPs.',
    '..sss...',
    '........',
  ],
  // en abborre: grönaktig med mörka ränder och röda fenor
  abborre: [
    '........',
    '..kkk...',
    '.gGkGk.r',
    'GeGkGkrr',
    'GGgkGkrr',
    '.wwwww.r',
    '..r.r...',
    '........',
  ],
  svamp: [
    '..cccc..',
    '.cCCccc.',
    'cCcccccc',
    'cccccccc',
    '...sS...',
    '...sS...',
    '...sS...',
    '..ssSS..',
  ],
  spindling: [
    '..cccc..',
    '.cCCccc.',
    'cCcccccc',
    'cccccccc',
    '...sS...',
    '...sS...',
    '...sS...',
    '..ssSS..',
  ],
  ved: [
    '........',
    '..bbbbbb',
    '.YYbBBbb',
    'YyYbbbbb',
    'YYYbbbBb',
    '.YYbbbbb',
    '..bbbbbb',
    '........',
  ],
  grenar: [
    '.......b',
    '..g...b.',
    '..bB.b..',
    '....bb..',
    '...bb.g.',
    '..b..b..',
    '.b......',
    'b.......',
  ],
  torrgras: [
    '.Y.y.Y..',
    '.y.yY.y.',
    '..yYyy..',
    '..yyYy..',
    '..tttt..',
    '..yYyy..',
    '.y.yY.y.',
    'y..yy..y',
  ],
  kol: [
    '........',
    '........',
    '...kk...',
    '..kKkk..',
    '.kkkkkk.',
    'kkKkkKkk',
    '.kkkkkk.',
    '........',
  ],
  flinta: [
    '........',
    '....g...',
    '...gGg..',
    '..gGggg.',
    '.gGgggd.',
    'gggggdd.',
    '.ggdddd.',
    '........',
  ],
  sten: [
    '........',
    '........',
    '..KKk...',
    '.KkkkdKk',
    '.kkkddkk',
    '..ddd.kd',
    '........',
    '........',
  ],
  yxa: [
    '....GGg.',
    '...GggG.',
    '..hGggg.',
    '..h.gg..',
    '.h......',
    '.h......',
    'h.......',
    'h.......',
  ],
  // stockar lagda på varandra, med ändarna synliga
  timmervagg: [
    'eBbbbbBe',
    'dddddddd',
    'eBbbbbBe',
    'dddddddd',
    'eBbbbbBe',
    'dddddddd',
    'eBbbbbBe',
    'dddddddd',
  ],
  // flätade grenar mellan pinnar
  risvagg: [
    'p..p..p.',
    'pBbpBbpB',
    'pbBpbBpb',
    'pBbpBbpB',
    'pbBpbBpb',
    'pBbpBbpB',
    'pbBpbBpb',
    'p..p..p.',
  ],
  hogolv: [
    '........',
    '........',
    '........',
    '.Y.y.Y..',
    'yYyYyYyY',
    'YyYyYyYy',
    'dddddddd',
    '........',
  ],
  // en vass pinne: spetsen täljd ljus
  fiskespjut: [
    '.......w',
    '......wH',
    '.....Hh.',
    '....Hh..',
    '...Hh...',
    '..Hh....',
    '.Hh.....',
    'h.......',
  ],
  // spjut med flintspets surrad med rep
  flintspjut: [
    '......Gg',
    '.....rG.',
    '....h...',
    '...h....',
    '..h.....',
    '.h......',
    'h.......',
    '........',
  ],
  // en bukt rep med tvinnade varv och en lös ände
  rep: [
    '..dYyd..',
    '.dYydYy.',
    'dYy..ydY',
    'Yy....Yy',
    'yd....yd',
    'dYy..ydY',
    '.ydYydY.',
    '..YydY.d',
  ],
  // ett ben
  ben: [
    '......Ww',
    '.....wWd',
    '....wd..',
    '...wd...',
    '..wd....',
    'Ww......',
    'wd......',
    '........',
  ],
  // ett fällt djur som ligger på sidan
  vilt: [
    '........',
    '........',
    'b.......',
    'bb.bBBb.',
    'kbBBBBBb',
    '.bBBBBbw',
    '..b.bb.r',
    '........',
  ],
  // slaktbänken (stationer.ts): en bänkskiva av trä på två ben, med en fläck blod
  slaktbank: [
    '........',
    '........',
    'BBBrBBBB',
    'bbbbbbbb',
    '.d....d.',
    '.d....d.',
    '.d....d.',
    '.d....d.',
  ],
  // slaktbänken, tre rutor bred (Björn valde efter v55): en kluven stock med barken framtill, på raka ben av runda grenar,
  // och blod som rinner över kanten ner i en pöl. Den är 11 punkter hög och sticker upp över rutan ovanför
  slaktbank_karta: [
    '.bbbbbbbbbbbbbbbbbbbbbb.',
    'bHHHHHHHHHHHHHHHHHHHHHHb',
    'bLWWYYYYLLLLrLLLLLWWWWLb',
    'bLLrrRRRRrrWWWWWWLLLLLLb',
    'bbbbbbbbbbbbbbbbbbbbbbbb',
    'BbbbbRbrbRbbbbbbbbbbbbbB',
    '.BBBBRBBBBBBBBBBBBBBBBB.',
    '..BBB.R............BBB..',
    '..wwb.R............wwb..',
    '..wwRRRRRR....R....wwb..',
    '.xxrrrrrrrrRrxxxxxxxxxxx',
  ],
  // flätarbänken (slöjdbänken), två rutor bred (Björn valde nr 4a efter v55): två plankor på raka ben, två stolpar med ett
  // rep spänt emellan och en skåra framtill där bensylen ska ligga (den finns inte än, 2.3.2). 16 punkter hög
  flatarbank_karta: [
    '.D............D.',
    '.wOooOooOooOoow.',
    '.wq..........qw.',
    '.w............w.',
    '.w............w.',
    '.wddddddddddddw.',
    'dHHHHHHHWHHHHHHd',
    'dLLLLLLLWLDDDDDd',
    'dLLLLLLLWLLLLLLd',
    'dddddddddddddddd',
    'wWWWWWWWWWWWWWWw',
    '.wwwwwwwwwwwwww.',
    '.DD..........DD.',
    '.wd..........wd.',
    '.wd..........wd.',
    '.xxxxxxxxxxxxxxx',
  ],
  // halmbädden i listorna: en ram av grenar med hö på
  halmbadd: [
    '........',
    '........',
    '..yYyY..',
    '.yYYyYy.',
    'tyYyYyYt',
    'bbbbbbbb',
    '.b....b.',
    '........',
  ],
  // halmbädden på kartan (Björn valde 2 efter v89, höhög på golvet): två rutor lång, huvudänden till vänster
  halmbadd_karta: [
    '................',
    '.q..qqq.tqqqqqq.',
    '.YYYYyyYqYyyYtYq',
    '.YYYyqYYYyYyyyYt',
    '.YYyyYYytYyYtty.',
    '.YYYYYyYyyYqYYY.',
    '.tq.tttt.q.q..t.',
    '.qqqqtqqqqqqttt.',
    '.tt.t..t.....t..',
    '.xxxxxxxxxxxxxx.',
  ],
  // hyllan i listorna: en ram av trä med två hyllplan och saker på (platshållare)
  hylla: [
    'W......W',
    'WyyrgryW',
    'WLLLLLLW',
    'WgyyrygW',
    'WLLLLLLW',
    'WryygyrW',
    'WLLLLLLW',
    'w......w',
  ],
  // hyllan på kartan (Björn valde 1 efter v89, stegehylla med rep): sticker upp över rutan ovanför. Det som ligger i den ritas ovanpå
  hylla_karta: [
    'W......W',
    'w......w',
    'w......w',
    'w......w',
    'rLLLLLLr',
    'w......w',
    'w......w',
    'w......w',
    'rLLLLLLr',
    'w......w',
    'w......w',
    'w......w',
    'rLLLLLLr',
    'xxxxxxxx',
  ],
  // kistan i listorna: en låda av trä med lock och beslag (platshållare)
  kista: [
    '........',
    '.HHHHHH.',
    'LLLLLLLL',
    'WWWggWWW',
    'WLLggLLW',
    'WLLLLLLW',
    'wwwwwwww',
    '........',
  ],
  // kistan på kartan (Björn valde 5, skinnklädd kista, med högre kontrast efter v89)
  kista_karta: [
    '........',
    '........',
    '........',
    '........',
    'ffsffsff',
    'fFsffsff',
    'ffsfFsff',
    'zfsffsfz',
    'WfsWWsfW',
    'WWsWWsWW',
    'wwwwwwww',
    'xxxxxxxx',
  ],
  // redskapsstället i listorna: en ställning med ett spjut och en yxa (platshållare)
  stall: [
    '..G..g..',
    '.gGg.g..',
    'WWGWWgWW',
    '..L..L..',
    '..L..L..',
    'WWLWWLWW',
    '..L..L..',
    '.w....w.',
  ],
  // redskapsstället på kartan (Björn valde lutställ 1 efter v89): en slå att luta redskapen mot. Redskapen ritas ovanpå
  stall_karta: [
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    'WLLLLLLW',
    'w......w',
    'w......w',
    'w......w',
    'xxxxxxxx',
  ],
  // skinnfällen i listorna: ett hopvikt täcke av skinn med pälskant (platshållare)
  skinnfall: [
    '........',
    '........',
    '.wwwwww.',
    'bBBbBBbd',
    'BbBBbBBd',
    'bBBbBBbd',
    '.dddddd.',
    '........',
  ],
  // ett bord med två stubbar framför (platshållare)
  bord: [
    '........',
    'HHHHHHHH',
    'LLLLLLLL',
    'WWWWWWWW',
    '.w....w.',
    '.w....w.',
    'BB....BB',
    'bb....bb',
  ],
  // bordet med stubbar på båda sidor (platshållare)
  bord2: [
    'BB....BB',
    'bb....bb',
    'HHHHHHHH',
    'LLLLLLLL',
    'WWWWWWWW',
    '.w....w.',
    'BB....BB',
    'bb....bb',
  ],
  // långbordet: en längre skiva med tre stubbar framför (platshållare)
  bord3: [
    '........',
    'HHHHHHHH',
    'LLLLLLLL',
    'WWWWWWWW',
    'w......w',
    'w......w',
    'BB.BB.BB',
    'bb.bb.bb',
  ],
  // det lilla bordet uppifrån (Björn valde 3 efter v89, skiva på stubbar): 2 × 1 rutor. Stubbarna runt det ritas för sig
  bord_karta: [
    '..HHHHHHHHHHHw..',
    '.LLLLLLLwLLLLLL.',
    '.WWWWWWWWWWWWWW.',
    '.HHHHHHHHHHwHHH.',
    '.LLLLLwLLLLLLLL.',
    '.wwwwwwwwwwwwww.',
    '.bBbxxxxxxxxbBb.',
    '.dbdxxxxxxxxdbd.',
  ],
  // bordet uppifrån, 2 × 2 rutor (Björn valde 3 efter v89)
  bord2_karta: [
    '..HHHHHHHHHHHw..',
    '.LLLLLLLwLLLLLL.',
    '.WWWWWWWWWWWWWW.',
    '.HHHHHHHHHHwHHH.',
    '.LLLLLwLLLLLLLL.',
    '.WWWWWWWWWWWWWW.',
    '.HHHHHHHHwHHHHH.',
    '.LLLwLLLLLLLLLL.',
    '.WWWWWWWWWWWWWW.',
    '.HHHHHHwHHHHHHH.',
    '.LwLLLLLLLLLLLL.',
    '.WWWWWWWWWWWWWW.',
    '.HHHHwHHHHHHHHH.',
    '.wwwwwwwwwwwwww.',
    '.bBbxxxxxxxxbBb.',
    '.dbdxxxxxxxxdbd.',
  ],
  // långbordet uppifrån, 3 × 2 rutor (Björn valde 3 efter v89)
  bord3_karta: [
    '..HHHHHHHHHHHwHHHHHHHH..',
    '.LLLLLLLwLLLLLLLLLLLLwL.',
    '.WWWWWWWWWWWWWWWWWWWWWW.',
    '.HHHHHHHHHHwHHHHHHHHHHH.',
    '.LLLLLwLLLLLLLLLLLLwLLL.',
    '.WWWWWWWWWWWWWWWWWWWWWW.',
    '.HHHHHHHHwHHHHHHHHHHHHw.',
    '.LLLwLLLLLLLLLLLLwLLLLL.',
    '.WWWWWWWWWWWWWWWWWWWWWW.',
    '.HHHHHHwHHHHHHHHHHHHwHH.',
    '.LwLLLLLLLLLLLLwLLLLLLL.',
    '.WWWWWWWWWWWWWWWWWWWWWW.',
    '.HHHHwHHHHHHHHHHHHwHHHH.',
    '.wwwwwwwwwwwwwwwwwwwwww.',
    '.bBbxxxxxxxbBbxxxxxxbBb.',
    '.dbdxxxxxxxdbdxxxxxxdbd.',
  ],
  // skinnfällen över halmbädden på kartan (Björn valde 2 efter v89): täcker bädden utom huvudänden
  skinnfall_karta: [
    '................',
    '.......zzzzzzz..',
    '......zSsssSssz.',
    '......fffffffff.',
    '......fffffffff.',
    '......zsSsssSsz.',
    '.......zzzzzzz..',
    '................',
    '................',
    '................',
  ],
  // skinndörren i listorna: en hud som hänger från en stång (platshållare)
  skinndorr: [
    'pppppppp',
    '.bBbBbB.',
    '.BbBbBb.',
    '.bBbBbB.',
    '.BbBbBb.',
    '.bBbBbB.',
    '.dBbBbd.',
    '..d..d..',
  ],
  // skinndörren på kartan (Björn valde 3 efter v89, två flikar): huden hänger från en stång mellan dörrposterna, delad på mitten. I en vägg som går uppåt ritas den vriden
  skinndorr_karta: [
    '........',
    'eoOooOoe',
    'EeSsZsSE',
    'EsSsZSsE',
    'esSsZssd',
    'dSsSZsSd',
    '.sSZzSs.',
    '..zZzz..',
  ],
  // en stubbe att sitta på (Björn valde 1 efter v89, kort stock): vid slöjdbänken och runt borden, en ruta stor (skala 2)
  sittplats: [
    '........',
    '..rrrr..',
    '.rCccCr.',
    '.rcrrcr.',
    '.rCccCr.',
    '.bBbbBb.',
    '.dbBbbd.',
    '..xxxx..',
  ],
  // latrinen (Björn valde P6): en rund grop med en kant av uppgrävd jord runt om, ingen jordhög. Den mörknar när den fylls
  // (foremal.ts)
  latrin: [
    '........',
    '..oOOo..',
    '.oddddO.',
    'oddkkddo',
    'odkkkkdo',
    '.oddddo.',
    '..oooo..',
    '........',
  ],
  latrin_karta: [
    '........',
    '..oOOo..',
    '.oddddO.',
    'oddkkddo',
    'odkkkkdo',
    '.oddddo.',
    '..oooo..',
    '........',
  ],
  // brasan (Björn valde symbol 2, kåtan, efter v89): ved rest som en kåta med elden i, stenar runt
  brasa: [
    '..w..W..',
    '...wY...',
    '..wfFW..',
    '..wFFW..',
    '.wfFVfW.',
    '.wffFfW.',
    'hgwffWgh',
    'GG.GG.GG',
  ],
  // kartbilden (Björn valde 4, härd av hällar, med tydligare stenar efter v89): veden, elden och glöden ritas ovanpå (foremal.ts)
  brasa_karta: [
    '........',
    '........',
    '.hggghg.',
    'hgGGGGgh',
    'gGabbaGg',
    'Gabbbbag',
    'gabbbbaG',
    'hgabbagh',
    '.gghggg.',
    '.NNGNNN.',
  ],
  // grillställningen (Björn valde 1 efter v89): spettet med vev över elden mellan två klykor
  grill: [
    'w.w.w.w.',
    'OLLOLLLL',
    '.w...w.L',
    '.W...W.q',
    '.w.f.w..',
    '.wfFfw..',
    '.WFfFW..',
    '.wgGgw..',
  ],
  // kartbilden (Björn valde 1b): tre rutor bred, spettet med vev på högra sidan, elden i mittrutan syns igenom
  grill_karta: [
    '...w.w............w.w...',
    '..DOLLOLLOLLOLLOLLOLLOL.',
    '....w..............w..L.',
    '....W..............W..L.',
    '....w..............w..Lq',
    '....w..............w....',
    '....W..............W....',
    '....w..............w....',
    '....w..............w....',
    '....W..............W....',
    '....w..............w....',
    '....w..............w....',
    '....W..............W....',
    '....x..............x....',
    '........................',
    '........................',
  ],
  // grillad fisk (Björn valde 2 efter v89): fiskköttet med grillränder
  grillfisk: [
    '........',
    '..ooooo.',
    '.oBcBBco',
    'oBcBBcBo',
    'ocBBcBo.',
    '.bBcbbo.',
    '..ooo...',
    '........',
  ],
  // grillat kött (Björn valde 1 efter v89): köttbiten med benet, brun och grillrandig
  grillkott: [
    '..ooo...',
    '.oRRco..',
    '.oRcRro.',
    '.ocRrco.',
    '..orrow.',
    '....owww',
    '.....ww.',
    '........',
  ],
  // torkställningen (Björn valde 1 efter v89): en slå mellan två A med köttremsor
  tork: [
    'w.w..w.w',
    'OLOLLOLO',
    '.wMmMmw.',
    'w.mMmM.w',
    'w.MmMc.w',
    'w.wM.m.w',
    'w.wm.w.w',
    'W.W..W.W',
  ],
  // kartbilden (Björn valde 4a): två rutor bred, sticker upp över raden ovanför. Maten som hänger ritas i foremal.ts
  tork_karta: [
    '.w.w........w.w.',
    'OLwLOLLOLLOLLwLO',
    '..w..........w..',
    '.w.w........w.w.',
    '.w.w........w.w.',
    '.W.W........W.W.',
    'w...w......w...w',
    'w...w......w...w',
    'W...W......W...W',
    'w...w......w...w',
    'x...x......x...x',
    '................',
  ],
  // torkat kött (Björn valde 1 efter v89): mörka, skrynkliga remsor
  torrkott: [
    'r....Rr.',
    'r.Rr.Rr.',
    'w.Ro.Rh.',
    'Rr.Rr.Rr',
    'Rr.Rr.Rr',
    'Ro.wo.Ro',
    '.Rr.Rr..',
    '....Rr..',
  ],
  torrfisk: [
    '........',
    '..ppppp.',
    '.pPsPsPs',
    'pPwPsPPs',
    'pPsPsPs.',
    '.psPwPs.',
    '..sss...',
    '........',
  ],
  // vildkornet (steg 2.10.2, platshållare i bildstilens palett, 16 punkter): tre strån med ax som böjer sig
  vildkorn: [
    '.....L..........',
    '....LY.....L....',
    '....YL....LY....',
    '...LY.L...YL....',
    '...YL.Y..LY.L...',
    '....YL...YLY....',
    '.....y...LY.....',
    '.....y..Y.y.....',
    '.....y....y.L...',
    '......y...y.YL..',
    '......y..y.LY...',
    '......y..y..y...',
    '.......y.y.y....',
    '.......yyyy.....',
    '......o.yy.o....',
    '.....oo.ss.oo...',
  ],
  // de vilda ärterna (steg 2.10.2, platshållare): en öppen balja med ärter och en klänge
  arter: [
    '..........gg....',
    '.........g..g...',
    '.........g......',
    '........gg......',
    '.......g........',
    '......oGo.......',
    '.....oGGGo......',
    '....oGLGLGo.....',
    '...oGLyLyLGo....',
    '..oGLyLyLGGo....',
    '..oGyLyLGGo.....',
    '.oGGLyLGGo......',
    '.oGGGGGGo.......',
    '..ooGGoo........',
    '....oo..........',
    '................',
  ],
  // fröna (steg 2.10.2, Björn valde version 3 efter v102): stora frön med mörk kant, korn och ärter var för sig
  fron: [
    '................',
    '................',
    '...oo......oo...',
    '..oLYo....oGGo..',
    '..oYYo...oGGgo..',
    '..oYyo...oGggo..',
    '..oyyo....oggo..',
    '...oo......oo...',
    '................',
    '.......oo.......',
    '......oLYo......',
    '......oYyo...oo.',
    '......oYyo..oGGo',
    '......oyyo..oGgo',
    '.......oo....oo.',
    '................',
  ],
  // odlingen (steg 2.10.2, platshållare): en grodd i en fåra i jorden
  odling: [
    '................',
    '................',
    '........LG......',
    '.......LGGG.....',
    '..GL...LGG......',
    '.GGGL...G.......',
    '..GGG..G........',
    '....G.G.........',
    '.....GG.........',
    '.....g..........',
    '.....g..........',
    'JJJJJjJJJJJJJJJJ',
    'jjjjjjjjjjjjjjjj',
    'JJkkkJJJJkkkJJJJ',
    'jjjjjjjjjjjjjjjj',
    'kkkkkkkkkkkkkkkk',
  ],
  // rovorna (steg 2.10.3, Björn valde version 1 efter v102): en vit rova med lila topp och blasten uppe
  rovor: [
    '....g......g....',
    '...gGg....gLg...',
    '...gGLg..gGLg...',
    '....gGLggGLg....',
    '.....gGGGGg.....',
    '.......gg.......',
    '.....rRRRRr.....',
    '....rRRRRRRr....',
    '...rRRRRRRRRr...',
    '...bBWWWWWWBb...',
    '...bBWWWWWWBb...',
    '...bBBWWWWBBb...',
    '....bBBWWBBb....',
    '.....bbBBbb.....',
    '.......bb.......',
    '.......b........',
  ],
  // kornet (steg 2.10.3, Björn valde version 1 efter v102): en fyllig kärve med ett rep om
  korn: [
    '..L..L..L..L....',
    '.LYLLYLLYLLYL...',
    '.YLYYLYYLYYLY...',
    '..YyYyYyYyYy....',
    '...yYyYyYyY.....',
    '....yYyYyY......',
    '....kjJJJjk.....',
    '....kJjjjJk.....',
    '.....yYyYy......',
    '.....yyYyy......',
    '....yyYyYyy.....',
    '....yYyyyYy.....',
    '...yyY.y.Yyy....',
    '..yyY..y..Yyy...',
    '..sy..sy..ys....',
    '.ss...s....ss...',
  ],
  // toa-högen (steg 2.10.5, Björn sa ja efter v102): en brun hög med en grön stank som stiger upp
  toa: [
    '................',
    '.......v........',
    '.....vV.........',
    '....V...v.......',
    '.....V...v......',
    '......vV..v.....',
    '.........vV.....',
    '.......vV.......',
    '................',
    '.......cCc......',
    '......cCCcc.....',
    '.....ccCcccc....',
    '....kcccCccck...',
    '...kccccccccck..',
    '....kkkkkkkkk...',
    '................',
  ],
  // grodden på fältet (steg 2.10.3, platshållare): ritas på varje ruta medan grödan växer
  grodd: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....LL..LL.....',
    '....LGGg.GGL....',
    '.....gGG.Gg.....',
    '.......gGg......',
    '........g.......',
    '........g.......',
    '................',
    '................',
  ],
  // vattensäcken (steg 2.10.1, Björn valde version 2 efter v102): en liggande säck med rem, det droppar ur halsen
  // vädrets symboler (steg 2.11.1, Björn valde version 2 efter v102): klart, mulet, regn, snö, blåst och åska med mörk kontur, 10 × 10 punkter
  vader_klart: [
    '....o.....',
    '..ooaoo...',
    '.oaoboao..',
    '.oobcboo..',
    'oabcccbao.',
    '.oobcboo..',
    '.oaoboao..',
    '..ooaoo...',
    '....o.....',
    '..........',
  ],
  vader_moln: [
    '..........',
    '....oo....',
    '...owwo...',
    '..owWWwo..',
    '.owWWWWwo.',
    'owWWWWWWwo',
    'owwwwwwwwo',
    '.oooooooo.',
    '..........',
    '..........',
  ],
  vader_regn: [
    '...oo.....',
    '..owwoo...',
    '.owWWwwo..',
    'owWWWWWwo.',
    'owwwwwwwo.',
    '.odoodoo..',
    '..odoodo..',
    '.odoodo...',
    '..o..o....',
    '..........',
  ],
  vader_sno: [
    '....o.....',
    '..oosoo...',
    '.osososo..',
    '.oosssoo..',
    'osssSssso.',
    '.oosssoo..',
    '.osososo..',
    '..oosoo...',
    '....o.....',
    '..........',
  ],
  vader_blast: [
    '..........',
    '.ooooo....',
    'ovvvvvo...',
    '.ooooovo..',
    'ovvvvvvo..',
    '.oooooooo.',
    '..ovvvvvvo',
    '.ovoooooo.',
    '..ovvo....',
    '...oo.....',
  ],
  vader_aska: [
    '...oo.....',
    '..okkoo...',
    '.okKKkko..',
    'okKKKKKko.',
    'okkkykkko.',
    '.oooyyoo..',
    '..oyyo....',
    '...oyo....',
    '..oyo.....',
    '...o......',
  ],
  vattensack: [
    '................',
    '...ssssssssss...',
    '..s..........s..',
    '..s..........s..',
    '..s.ooooooo..s..',
    '..sojJJLLJJoo...',
    '..ojJJLLJJJJjoyo',
    '.ojJJJJJJJJJjyyo',
    '.ojJJJJJJJJjjoyo',
    '.ojjJJJJJJjjo.o.',
    '..ojjjjjjjjo....',
    '...oooooooo...b.',
    '..............b.',
    '.............bBb',
    '.............bbb',
    '................',
  ],
  // benspaden (Björn valde S1g efter v85): snett uppåt höger som de andra redskapen, tre ben som ett rakt avskuret blad lika
  // mycket åt båda hållen kring skaftet, bundna med rep
  benspade: [
    '.....WR.',
    '....WwwR',
    '....Ywwd',
    '....Hyd.',
    '...Hh...',
    '..Hh....',
    '.Hh.....',
    'Hh......',
  ],
  // en bänk med en tuss hö och ett nystan rep
  flatarbank: [
    '........',
    '.yY..oO.',
    'yYYy.OoO',
    'BBBBBBBB',
    'bbbbbbbb',
    '.d....d.',
    '.d....d.',
    '.d....d.',
  ],
  // en bensyl: ett smalt ben, slipat till en spets (platshållare)
  bensyl: [
    '........',
    '......W.',
    '.....Ww.',
    '....ww..',
    '...ww...',
    '..ww....',
    '.dwd....',
    '.dd.....',
  ],
  // skinnrocken (Björn valde 2 efter v89): en rock med pälskrage och fransar
  skinnrock: [
    '..dwwd..',
    '.dwWWwd.',
    '.dBbbBd.',
    'dBBbBBBd',
    'dBbBBbBd',
    'BBBbBBbB',
    'bBbBBbBb',
    'd.d.d.d.',
  ],
  // mossan (Björn valde M4 efter v89): en tuss mossa bunden med snöre
  mossa: [
    '........',
    '.lGlGlG.',
    'GgGBgGgG',
    'gGgBGgGg',
    'BBBBBBBB',
    'gGgBgGgm',
    '.mgBmgm.',
    '........',
  ],
  // bältet (Björn valde 1 efter v89): ett flätat rep i en ring med en knut
  balte: [
    '..eYeY..',
    '.Ye..eY.',
    'Ye....eY',
    'y......y',
    'Ye....eY',
    '.eYeYey.',
    '...dd...',
    '...y.y..',
  ],
  // skinnskorna (Björn valde 1 efter v89): två skor med pälskant, den ena bakom den andra
  skinnskor: [
    '........',
    '...ww...',
    '...dBs..',
    '...dBBBd',
    'ww.ddddd',
    'dBs.....',
    'dBBBBd..',
    'dddddd..',
  ],
  // skinnkläderna som teknik: rocken och skorna (platshållare)
  skinnklader: [
    '.ww.....',
    'BbbB....',
    'BBBB....',
    'B..B....',
    '....Bb..',
    '....BBb.',
    '...BBBBb',
    '...ddddd',
  ],
  // en kort flintkniv med smalt blad och ett skaft på snedden (Björn valde K4 efter v55)
  kniv: [
    '........',
    '........',
    '........',
    '.....Gg.',
    '....Gg..',
    '...hg...',
    '..Hh....',
    '.H......',
  ],
  // ett utbrett djurskinn med huvud, ben och svans
  skinn: [
    '...dd...',
    'b..BB..b',
    'bbBBBBbb',
    '..BBdB..',
    '..BdBB..',
    '..BBBB..',
    'bbBBBBbb',
    'b..bb..b',
  ],
  // ett böjt spö med lina och en krok av ben
  metspo: [
    '.....hh.',
    '...hh..h',
    '..h....y',
    '.h.....y',
    '.h.....y',
    'h......y',
    'h....w.y',
    'h.....w.',
  ],
  // golv av plankor
  tragolv: [
    'BbbbdBbb',
    'bbbbdbbb',
    'dddddddd',
    'bbdBbbbb',
    'bbdbbbbb',
    'dddddddd',
    'Bbbbbdbb',
    'bbbbbdbb',
  ],
  // inte klart (paborjat.ts): framstegscirkeln (Björn valde A2 efter v55), här halvfylld. På kartan och i panelerna ritas
  // den med hur långt arbetet kommit (foremal.ts, framstegSvg nedan)
  paborjat: [
    '..wwww..',
    '.wddyyw.',
    'wdddyyyw',
    'wdddyyyw',
    'wddddddw',
    'wddddddw',
    '.wddddw.',
    '..wwww..',
  ],
  // slagen av arbete (SLAG i handlingar.ts): enfärgade bilder över huvudet, olika alla sakers symboler
  // en grodd i jorden
  a_odla: [
    '........',
    'ww....ww',
    'www..www',
    '.ww..ww.',
    '..wwww..',
    '...ww...',
    '...ww...',
    '.wwwwww.',
  ],
  // en hand som plockar
  a_samla: [
    '.w.w.w..',
    '.w.w.w..',
    '.wwwww.w',
    '.wwwwwww',
    '.wwwwww.',
    '..wwww..',
    '..wwww..',
    '........',
  ],
  // ett sikte
  a_jaga: [
    '...w....',
    '.wwwww..',
    '.w.w.w..',
    'www.www.',
    '.w.w.w..',
    '.wwwww..',
    '...w....',
    '........',
  ],
  // en krok över vågor
  a_fiska: [
    '....w...',
    '....w...',
    '....w...',
    '.w..w...',
    '.w..w...',
    '..ww....',
    'a.a.a.a.',
    '.a.a.a.a',
  ],
  // ett träd
  a_tra: [
    '...w....',
    '..www...',
    '.wwwww..',
    '..www...',
    '.wwwww..',
    'wwwwwww.',
    '...w....',
    '...w....',
  ],
  // ett hus
  a_bygga: [
    '...w....',
    '..w.w...',
    '.w...w..',
    'wwwwwww.',
    '.w...w..',
    '.w.w.w..',
    '.w.w.w..',
    '.wwwww..',
  ],
  // en klubba
  a_hantverk: [
    '.wwwww..',
    '.wwwww..',
    '...w....',
    '...w....',
    '...w....',
    '...w....',
    '...w....',
    '........',
  ],
  // en pil ner i en låda
  a_bara: [
    '...w....',
    '...w....',
    '.w.w.w..',
    '..www...',
    'w..w..w.',
    'w.....w.',
    'wwwwwww.',
    '........',
  ],
  // en låga
  a_elda: [
    '...w....',
    '..ww....',
    '..www.w.',
    '.wwwwww.',
    '.ww.www.',
    '.w...ww.',
    '..www...',
    '........',
  ],
  // en boll
  a_leka: [
    '..www...',
    '.w.www..',
    'w.wwwww.',
    'wwwwwww.',
    'wwwwwww.',
    '.wwwww..',
    '..www...',
    '........',
  ],
  // veden i brasan när den inte brinner
  brasa_ved_karta: [
    '........',
    '........',
    '........',
    '........',
    '........',
    '..Yw.W..',
    '...WWw..',
    '..W.....',
    '........',
    '........',
  ],
  // lågorna när brasan brinner
  brasa_eld_karta: [
    '........',
    '....f...',
    '...fF...',
    '...fFf..',
    '..fFVf..',
    '..fFFf..',
    '...WWw..',
    '..W.....',
    '........',
    '........',
  ],
  // glöden när brasan nästan brunnit ut
  brasa_glod_karta: [
    '........',
    '........',
    '....u...',
    '...u....',
    '........',
    '...EE...',
    '..keeE..',
    '........',
    '........',
    '........',
  ],
  // svalkar sig (Björn valde 2 efter v89): solen bakom en trädkrona
  a_svalka: [
    'y.y.....',
    '.yy.www.',
    'yyywwwww',
    '.yywwwww',
    'y.wwwwww',
    '...wwww.',
    '.....w..',
    '.....w..',
  ],
  // dricker (Björn valde 1 efter v89): vatten i kupade händer. Samma bild när man får vatten av de andra
  a_dricka: [
    '...a....',
    '........',
    'w.w..w.w',
    'waaaaaaw',
    'waaaaaaw',
    '.wwwwww.',
    '..wwww..',
    '........',
  ],
  // dricker (Björn valde 1 efter v89): vatten i kupade händer. Samma bild när man får vatten av de andra
  a_fatt: [
    '...a....',
    '........',
    'w.w..w.w',
    'waaaaaaw',
    'waaaaaaw',
    '.wwwwww.',
    '..wwww..',
    '........',
  ],
  // hämtar vatten i säcken (steg 2.10.1, platshållare i bildstilens palett, 16 punkter): säcken som en kontur och en droppe
  a_vatten: [
    '................',
    '......ww........',
    '.....w..w.......',
    '......ww........',
    '.....w..w.......',
    '....w....w......',
    '...w......w.....',
    '..w........w....',
    '..w........w....',
    '..w........w..a.',
    '..w........w..a.',
    '...w......w..aaa',
    '....w....w...aaa',
    '.....wwww.....a.',
    '................',
    '................',
  ],
  // smälter snö (Björn valde 2 efter v89): en snöflinga som blir en droppe
  a_smalta: [
    'w.w.w...',
    '.www....',
    'wwwww...',
    '.www..a.',
    'w.w.w.a.',
    '.....aaa',
    '.....aaa',
    '......a.',
  ],
  // vårdar (Björn valde läkekorset efter v89)
  a_varda: [
    '..www...',
    '..www...',
    'wwwwwww.',
    'wwwrwww.',
    'wwwwwww.',
    '..www...',
    '..www...',
    '........',
  ],
  // verkstaden, rummets funktion (Björn valde 4 efter v89): en slöjdbänk med tvinnstolpar
  verkstad: [
    'lOLOLOLl',
    'l......l',
    'l......l',
    'BBBBBBBB',
    'bbbbbnkb',
    'dddddddd',
    '.d....d.',
    '.d....d.',
  ],
  // skärsår: en flintkniv med blod
  s_skarsar: [
    '.......E',
    '......Er',
    '.....Ee.',
    '....Eer.',
    '...Ee...',
    '..H...r.',
    '.Hh.....',
    'hh....m.',
  ],
  // bett: huggtänder som droppar
  s_bett: [
    'mrrrrrrm',
    'rRRrrRRr',
    '.wW..wW.',
    '.wb..wb.',
    '..b..b..',
    '..r..r..',
    '........',
    '..r..m..',
  ],
  // klösmärken: tre klor
  s_klos: [
    'w..w..w.',
    'b..b..b.',
    'r..r..r.',
    '.r..r..r',
    '.r..r..r',
    '.R..R..R',
    '.m..m..m',
    '........',
  ],
  // benbrott: ett ben som brutits av
  s_benbrott: [
    'Ww......',
    'wWw.....',
    '.wWb....',
    '..wbr...',
    '...rWw..',
    '....wWb.',
    '...r.bWw',
    '......ww',
  ],
  // krossår: en sten med blodstänk
  s_krossar: [
    '.....r..',
    '.r....R.',
    '...rR..r',
    '.eEEEe..',
    'eEEeeeeo',
    'eeeeeooo',
    '.oooooo.',
    '........',
  ],
  // infektion (Björn valde den gröna klumpen)
  s_inf: [
    '...g.g..',
    '.gGGGGg.',
    '.GqGGGg.',
    'gGGGqGGg',
    '.GGqGGg.',
    '.gGGGqg.',
    '..g.gg..',
    '........',
  ],
  // förband av mossa (Björn valde 2): en tuss mossa bunden med snöre
  s_forb: [
    '........',
    '.ZuZZuZ.',
    'ZzuzZuzZ',
    'zZuZzuZz',
    'zzuzzuzx',
    'xzuzzuzx',
    '.xuxxux.',
    '........',
  ],
  // rengjort (Björn valde 2): en vattendroppe med en glimt
  s_ren: [
    '..a...f.',
    '..aa.fFf',
    '.aAaa.f.',
    '.aAaaa..',
    'aAAaaac.',
    'aAaaacc.',
    '.aaacc..',
    '..ccc...',
  ],
  // kallbrand: samma klump som infektionen, lila och mörkare (Björn efter v89)
  s_kall: [
    '...g.g..',
    '.gGGGGg.',
    '.GqGGGg.',
    'gGGGqGGg',
    '.GGqGGg.',
    '.gGGGqg.',
    '..g.gg..',
    '........',
  ],
  // energi: en blixt
  n_energi: [
    '....Aa..',
    '...Aa...',
    '..Aa....',
    '.AaaaaD.',
    '....aD..',
    '...aD...',
    '..aD....',
    '.aD.....',
  ],
  // brist på energi: samma form som en tom kontur, fylld bara i botten
  b_energi: [
    '....DD..',
    '...DD...',
    '..DD....',
    '.DDDDDD.',
    '....DD..',
    '...DD...',
    '..aa....',
    '.aa.....',
  ],
  // protein: en köttbit
  n_protein: [
    '........',
    '..AAa...',
    '.AaaaAa.',
    'AaaAaaaa',
    'aaaaaaaD',
    '.aaaaaDD',
    '..aDDD..',
    '........',
  ],
  // brist på protein: samma form som en tom kontur, fylld bara i botten
  b_protein: [
    '........',
    '..DDD...',
    '.D...DD.',
    'D......D',
    'D......D',
    '.aaaaaaa',
    '..aaaa..',
    '........',
  ],
  // fett: en droppe
  n_fett: [
    '...A....',
    '..AAa...',
    '..Aaa...',
    '.AAaaa..',
    '.Aaaaaa.',
    '.aaaaaD.',
    '..aaDD..',
    '...DD...',
  ],
  // brist på fett: samma form som en tom kontur, fylld bara i botten
  b_fett: [
    '...D....',
    '..D.D...',
    '..D.D...',
    '.D...D..',
    '.D....D.',
    '.D....D.',
    '..aaaa..',
    '...aa...',
  ],
  // vitamin: ett bär
  n_vitamin: [
    '.....gG.',
    '....gG..',
    '..aaga..',
    '.aAAaaa.',
    '.aAaaaaD',
    '.aaaaaaD',
    '..aaaaD.',
    '...DDD..',
  ],
  // brist på vitamin: samma form som en tom kontur, fylld bara i botten
  b_vitamin: [
    '.....DD.',
    '....DD..',
    '..DDDD..',
    '.D..D.D.',
    '.D.....D',
    '.D.....D',
    '..aaaaa.',
    '...aaa..',
  ],
  // mineral: en kristall
  n_mineral: [
    '........',
    '..AAaa..',
    '.AAAaaa.',
    'AAAAaaaD',
    '.aaaaDD.',
    '..aaDD..',
    '...aD...',
    '........',
  ],
  // brist på mineral: samma form som en tom kontur, fylld bara i botten
  b_mineral: [
    '........',
    '..DDDD..',
    '.D....D.',
    'D......D',
    '.D....D.',
    '..aaaa..',
    '...aa...',
    '........',
  ],
};

// ---------- lägerelden (Björn valde efter v92: nr 1, stor stenring med stjärnved, men enklare) ----------
// Två rutor bred och två och en halv hög: raderna 4–19 är de två rutorna, 0–3 luften ovanför där lågorna sticker upp.
// Tio stenar i en ring runt en askcirkel, och fyra vedträn som ligger in mot mitten som en stjärna, helt innanför stenarna.
// Bilderna räknas fram här, en per läge: LAGERELD_LAGEN, med och utan stenringen (den läggs första gången elden tänds)
export const LAGERELD_LAGEN = ['tom', 'ny', 'lite', 'lite2', 'stort', 'stort2', 'glod', 'kol'] as const;
export type LagereldLage = typeof LAGERELD_LAGEN[number];
export const lagereldId = (l: LagereldLage, ring: boolean) => `lagereld_${l}${ring ? '' : '_utan'}_karta`;
const ELD_PAL = {
  h: '#b0b5b8', g: '#8a8f94', G: '#5e6266', N: '#6a6e72', a: '#4b4640', A: '#625c55', b: '#2d2620', k: '#1a1714', c: '#3a3530', C: '#55504a',
  w: '#5a3a1e', W: '#8b5a2b', Y: '#c9a46a', D: '#2a1c12', j: '#7a5a36',
  f: '#e2702e', F: '#ffd36b', V: '#fff2c0', e: '#b3361e', E: '#e8582a',
  u: 'rgba(225,225,225,.30)', U: 'rgba(225,225,225,.16)', o: 'rgba(255,170,70,.20)', O: 'rgba(255,190,90,.34)',
};
function lagereldRader(l: LagereldLage, ring: boolean) {
  const G = 16, H = 20, CX = 8, CY = 12, g: string[][] = Array.from({ length: H }, () => Array(G).fill('.'));
  const hs = (a: number, b: number) => { const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return h - Math.floor(h); };
  const set = (x: number, y: number, k: string) => { x = Math.round(x); y = Math.round(y); if (g[y] && x >= 0 && x < G) g[y][x] = k; };
  const S = (x: number, y: number, rows: string[]) => rows.forEach((r, j) => [...r].forEach((k, i) => { if (k !== '.') set(x + i, y + j, k); }));
  const ellips = (rx: number, ry: number, yo: number, f: (d: number, x: number, y: number) => string | undefined) => {
    for (let y = 4; y < H; y++) for (let x = 0; x < G; x++) { const d = ((x + 0.5 - CX) / rx) ** 2 + ((y + 0.5 - CY - yo) / ry) ** 2; const k = d <= 1 ? f(d, x, y) : undefined; if (k) set(x, y, k); }
  };
  const brinner = l === 'lite' || l === 'lite2' || l === 'stort' || l === 'stort2', stor = l === 'stort' || l === 'stort2', fro = l.endsWith('2') ? 7 : 3;
  // skenet på marken runt en eld som brinner
  if (brinner) ellips(7.8, 7.6, 0, d => stor && d < 0.35 ? 'O' : 'o');
  // askcirkeln och den mörka mitten
  ellips(5.2, 4.4, 0, (d, x, y) => d <= 0.62 ? 'b' : hs(x, y) < 0.25 ? 'A' : 'a');
  // stenarna: de bakom elden först, de framför sist
  const STEN = [['hhg', 'gGN'], ['.hg', 'gGN'], ['hg.', 'GNN']];
  const stenar = (bak: boolean) => {
    if (!ring) return;
    for (let i = 0; i < 10; i++) {
      const a = 0.3 + i * 2 * Math.PI / 10, s = STEN[i % 3];
      if ((Math.sin(a) < 0.05) !== bak) continue;
      S(Math.round(CX + Math.cos(a) * 5.8 - s[0].length / 2 + 0.5), Math.round(CY + Math.sin(a) * 4.9 - 1), s);
    }
  };
  stenar(true);
  // veden: fyra vedträn två punkter tjocka, från mitten ut till strax innanför stenarna, med en ljus snittyta i änden.
  // Den del som brunnit är svart
  if (l !== 'tom' && l !== 'kol') {
    const kol = l === 'glod' ? 0.75 : stor ? 0.45 : 0, r1 = l === 'glod' ? 3.2 : 4;
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 4 + i * Math.PI / 2 + 0.2, x0 = CX - 0.5 + Math.cos(a) * 1.2, y0 = CY - 0.5 + Math.sin(a) * 1.0;
      const x1 = CX - 0.5 + Math.cos(a) * r1, y1 = CY - 0.5 + Math.sin(a) * r1 * 0.8, ligg = Math.abs(x1 - x0) >= Math.abs(y1 - y0);
      const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
      for (let t = 0; t <= n; t++) {
        const x = x0 + (x1 - x0) * t / n, y = y0 + (y1 - y0) * t / n, brand = t / n < kol;
        set(x, y, brand ? 'D' : 'W'); set(x + (ligg ? 0 : 1), y + (ligg ? 1 : 0), brand ? 'k' : 'w');
      }
      set(x1, y1, 'Y'); set(x1 + (ligg ? 0 : 1), y1 + (ligg ? 1 : 0), 'j');
    }
  }
  // lågan: bred w och hög h med foten på raden by. Två bilder per storlek, som byts så att elden fladdrar
  const flamma = (by: number, w: number, h: number) => {
    const hw = w / 2;
    for (let x = Math.floor(CX - hw); x < Math.ceil(CX + hw); x++) {
      const dx = (x + 0.5 - CX) / hw; if (Math.abs(dx) > 1) continue;
      const top = Math.max(1, Math.round(h * (1 - dx * dx * 0.85) * (0.55 + 0.45 * hs(x + fro, fro * 3))));
      for (let j = 0; j < top; j++) { const r = j / top; set(x, by - j, Math.abs(dx) < 0.25 && r < 0.35 ? 'V' : Math.abs(dx) < 0.5 && r < 0.65 ? 'F' : j === top - 1 && top > 3 ? 'E' : 'f'); }
    }
  };
  if (brinner && !stor) { flamma(CY + 1, 5, 7); set(8, 4 + (fro & 1), 'u'); }
  if (stor) { flamma(CY + 2, 8, 13); set(5, 1, 'u'); set(10, fro & 1, 'U'); set(11, 2, 'u'); }
  if (l === 'glod') {
    ellips(2.2, 2, -0.5, () => 'k');
    for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 0.4 + (i % 4) * 0.55; set(CX - 0.5 + Math.cos(a) * r * 1.5, CY - 0.5 + Math.sin(a) * r * 1.2, i % 2 ? 'e' : 'E'); }
    set(CX - 1, CY - 5, 'u'); set(CX, CY - 7, 'U');
  }
  if (l === 'kol') { ellips(3.8, 3, 0.3, (d, x, y) => d < 0.7 ? (hs(x, y) < 0.3 ? 'C' : hs(x, y) < 0.6 ? 'c' : 'k') : 'k'); set(CX - 1, CY - 2, 'C'); }
  stenar(false);
  return g.map(r => r.join(''));
}
for (const l of LAGERELD_LAGEN) for (const ring of [true, false]) { PIX[lagereldId(l, ring)] = lagereldRader(l, ring); PAL[lagereldId(l, ring)] = ELD_PAL; }

const canvases: Record<string, HTMLCanvasElement> = {};
const urls: Record<string, string> = {};

// pixelbilden som canvas, 8×8
export function iconCanvas(k: string) {
  if (canvases[k]) return canvases[k];
  const rows = PIX[k], pal = PAL[k], c = document.createElement('canvas'); c.width = rows?.[0]?.length ?? 8; c.height = rows?.length ?? 8; // 8×8, utom stationernas kartbilder
  const g = c.getContext('2d')!;
  if (rows) rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.' && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
  return (canvases[k] = c);
}
export const hasIcon = (k: string) => !!PIX[k];
// framstegscirkeln för det som inte är klart (Björn valde A2 efter v55): en mörk bricka med vit kant som fylls med gult,
// medsols från klockan tolv, ju längre arbetet kommit (p från 0 till 1)
export function framstegSvg(p: number, size = 10) {
  const f = Math.min(1, Math.max(0, p)), a = f * 2 * Math.PI, x = 8 + 5.6 * Math.sin(a), y = 8 - 5.6 * Math.cos(a);
  const kil = f >= 0.999 ? '<circle cx="8" cy="8" r="5.6" fill="#e0b050"/>' : f > 0 ? `<path d="M8 8V2.4A5.6 5.6 0 ${a > Math.PI ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}Z" fill="#e0b050"/>` : '';
  return `<svg class="ikon" width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="rgba(28,24,20,0.88)" stroke="#f2ece0" stroke-width="1.4"/>${kil}</svg>`;
}
// kvalitetens märke (steg 2.2.2, platshållare tills Björn valt i bildstilen): usel ett rostrött kryss, slarvig ett grått
// streck, normal inget, fin en liten guldprick, mästerverk en guldruta och det perfekta mästerverket en guldstjärna.
// 8 × 8 punkter; m = mörk kant, g = guld, l = ljus, r = rost, s = grå
const KV_PIX: readonly (readonly string[] | undefined)[] = [
  ['........', '.rr..rr.', '..rrrr..', '...rr...', '..rrrr..', '.rr..rr.', '........', '........'],
  ['........', '........', '........', '.ssssss.', '........', '........', '........', '........'],
  undefined,
  ['........', '........', '...mm...', '..mggm..', '..mggm..', '...mm...', '........', '........'],
  ['...mm...', '..mggm..', '.mglggm.', 'mglggggm', 'mggggggm', '.mggggm.', '..mggm..', '...mm...'],
  ['...gg...', '...gg...', 'gggllggg', '.gglggg.', '..gggg..', '.ggmmgg.', '.gm..mg.', '........'],
];
const KV_FARG: Record<string, string> = { m: '#2a1f16', g: '#e0b050', l: '#fff3c8', r: '#b0402a', s: '#9a948a' };
export function kvSvg(q: number | undefined, size = 10) {
  const rows = KV_PIX[q ?? 2];
  if (!rows) return '';
  let r = '';
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (KV_FARG[ch]) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${KV_FARG[ch]}"/>`; }));
  return `<svg class="ikon kvmark" width="${size}" height="${size}" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
// ikonen som <img> för listorna
export function iconImg(k: string, size = 16) {
  if (!hasIcon(k)) return '';
  urls[k] ??= iconCanvas(k).toDataURL();
  return `<img class="ikon" src="${urls[k]}" width="${size}" height="${size}" alt="">`;
}
// en symbol i gränssnittet: pixelbilden k om den finns, annars tecknet (emojin i registret)
export const tecknet = (k: string, alt: string, size = 16) => hasIcon(k) ? iconImg(k, size) : alt;
