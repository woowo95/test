// Björns svar i valdelen: de val som är bestämda. De flyttas till Valt och byggs in i spelet i steg 8.10.1.
(() => {
  // Björns egna ritningar (samlingen ritningar), som blir de valda versionerna
  const EGEN = (text, r) => ({ text, w: r.rader[0].length, h: r.rader.length, rita: (B) => {
    if (!window.RITA_BILD) return;
    const b = window.RITA_BILD(r); for (let k = 0; k < b.px.length; k++) if (b.px[k] >= 0) B.px[k] = b.px[k];
  } });
  const lagg = (id, v) => { const s = VAL.find(s => s.id === id); if (!s) return 0; s.versioner.push(v); return s.versioner.length; };
  const rust = lagg('f7_laderrustning', EGEN('Din ritning efter version 3, utan något på armarna.', {"pal": {"U": "#7e7362", "V": "#a0947d", "W": "#bdb39b", "k": "#24201d", "m": "#372f25", "r": "#3f2415", "s": "#5e3c24", "t": "#7d5b40", "u": "#987e62"}, "rader": ["......................................................", "......................................................", "......................................................", "......................................................", "......................................................", "......................................................", "......................................................", "....................................kkkkkk............", "...................................kssssssk...........", "...................................krVVVVmk...........", "...................................kWrVVruk...........", "..................................kkWVVVVukk..........", ".................................kuuuVmmVtttk.........", "................................kttssVVVVttssk........", "................................kttssttttttssk........", ".....kkk......kkk................kWuutsttssWk.........", "....kusskkkkkksusk...............kWkutsttskWk.........", "....kussuttttssusk...............kukutsttsksk.........", "....uussuttttssuss...............kWkutsttskWk.........", "....kussutsstssusk...............kukuttttsksk.........", ".....kkuutsstsskkk...............kWkWVVVVukWk.........", "......kuutsstssk..................kkWVVVVukk..........", "......kuutsstssk...................kWukkWuk...........", "......kuutsstssk...................kWukkWuk...........", "......kuutsstssk...................kWukkWuk...........", "......kuuttttssk...................kWukkWuk...........", ".......kkkkkkkk...................kUtskkUtsk..........", "......................................................", "......................................................", "......................................................", "......................................................"]}));
  const slanda = lagg('f7_slanda', EGEN('Din ritning efter version 1.', {"pal": {"R": "#3e5156", "S": "#61767a", "T": "#8a9c9e", "V": "#a0947d", "W": "#bdb39b", "X": "#dad0bb", "k": "#24201d", "s": "#5e3c24", "t": "#7d5b40"}, "rader": ["...............", "...............", "...............", "...............", "......ksk......", "......ktk......", "......ktk......", "......ktk......", ".....kXXVk.....", "....kXXWWVk....", "....kXXXXVk....", "....kXXWWVk....", ".....kXXVk.....", ".....kktkk.....", "....kTTSSSk....", ".....kRRRk.....", "......ktk......", "......ktk......", "......ktk......", "...............", "...............", "...............", "...............", "..............."]}));
  const B = (val, text) => ({ val, steg: '8.10.1', text: text ? text + ' Byggs in i steg 8.10.1.' : undefined });
  Object.assign(BESLUT, {
    f6_lagerton: B(1),
    f6_nattfarg: B(1),
    f8_zzz: B(1),
    f7_ryggsack: B(1),
    f7_linfron: B(1),
    f7_hus: B(2),
    f7_tval: B(3),
    f7_rolleka: B(1, 'Version 1 och 2 används båda, som variationer av örten, och symbolen (saken) tas från version 2.'),
  });
  if (rust) BESLUT.f7_laderrustning = B(rust, 'Din egen ritning, men utan något på armarna: armarna ritas som bybons egna.');
  if (slanda) BESLUT.f7_slanda = B(slanda, 'Din egen ritning.');
})();
