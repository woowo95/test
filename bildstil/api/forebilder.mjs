// Förebilderna för ansiktet (steg 5.2.2.3), ritade av programmeringschatten och sparade som data i bildstil/delar/.
// Huvudformen räknas fram med samma matta skuggning som mallen (skapare.js: ljushet, ton, korn); resten är ritat för hand.
import fs from 'fs';
const ut = id => `bildstil/delar/${id}.json`;
const spara = (o) => { fs.writeFileSync(ut(o.id), JSON.stringify(o, null, 1) + '\n'); };
// ---- samma slump och skuggning som sida.js och skapare.js ----
const hash = (x, y, s = 0) => { const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); };
function vn(x, y, sk, s) {
  const fx = x / sk, fy = y / sk, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
  const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const LJUSET = [-0.62, -0.42, 0.66], NIVA = [-0.08, 0.4, 0.86];
const ljushet = (x, y, cx, cy, rx, ry) => { const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, nz = Math.sqrt(Math.max(0, 1 - Math.min(1, u * u + v * v))); return LJUSET[0] * u + LJUSET[1] * v + LJUSET[2] * nz; };
const ton = (l, x, y) => { const k = l + (vn(x, y, 2.2, 21) - 0.5) * 0.2; return k < NIVA[0] ? 0 : k < NIVA[1] ? 1 : k < NIVA[2] ? 2 : 3; };
// ---- huvudformen Rund: nedre ansiktet under ögonlinjen, för vuxna och för barn ----
function huvud(under) {
  const H = { cx: 32, cy: 30, rx: 15, ry: 20 }, U = [1, 0.95, 2.2];
  const inne = (x, y) => { const u = (x + 0.5 - H.cx) / H.rx, v = (y + 0.5 - H.cy) / H.ry; return v > 0 && (Math.abs(u) / (U[0] * under[0])) ** U[2] + (v / (U[1] * under[1])) ** 2 <= 1; };
  const kind = new Set(['22,37', '23,37', '22,38', '23,38', '40,37', '41,37', '40,38', '41,38']);
  const rader = [];
  for (let y = 31; y <= 51; y++) {
    let r = '';
    for (let x = 16; x <= 47; x++) {
      if (!inne(x, y)) { r += '.'; continue; }
      const t = ton(ljushet(x, y, H.cx, H.cy, H.rx, H.ry), x, y);
      r += (kind.has(x + ',' + y) ? 'ABCD' : 'abcd')[t];
    }
    rader.push(r);
  }
  while (rader.length && /^\.+$/.test(rader[rader.length - 1])) rader.pop();
  return { x: -16, y: 1, rader };
}
spara({ id: 'huvud-rund', ritad: 1, av: 'programmeringschatten, förebild', om: 'Det nedre ansiktet under ögonlinjen, med kinderna (A–D, röda i kylan). Skuggningen följer formen som mallens skalle.',
  bilder: { standard: huvud([1, 1]) }, barn: { standard: huvud([1.04, 0.78]) } });
// ---- örat (vänster på bilden; det högra är det speglade, en ton mörkare) ----
spara({ id: 'ora-2', ritad: 1, av: 'programmeringschatten, förebild', om: 'Mellanstort öra: ytterkanten i ljuset, en mörk båge i örat och en rund örsnibb.',
  bilder: { standard: { x: -2, y: -5, rader: [
    '..cc.',
    '.dcbb',
    'dcaab',
    'dcab.',
    'dcab.',
    'dbab.',
    'cbab.',
    'cbbc.',
    '.cbc.',
    '.cc..',
  ] } } });
// ---- näsan Rak: näsryggen ljus till vänster och skuggad till höger, spetsen och näsborrarna ----
spara({ id: 'nasa-1', ritad: 1, av: 'programmeringschatten, förebild', om: 'Rak näsa: ljus näsrygg till vänster, skuggad sida till höger, ljus spets och mörka näsborrar med en skugga under.',
  bilder: { standard: { x: -3, y: 1, rader: [
    '...db..',
    '...db..',
    '...cb..',
    '..dcb..',
    '.bdccb.',
    '.adccba',
    '..abba.',
  ] } },
  barn: { standard: { x: -2, y: 1, rader: [
    '..db.',
    '..cb.',
    '.dccb',
    '.abba',
  ] } } });
// ---- ögat Runda i fyra lägen (vänster på bilden; det högra är det speglade) ----
spara({ id: 'oga-1', ritad: 1, av: 'programmeringschatten, förebild', om: 'Runda ögon: mörkt övre ögonlock, vitan, iris i två toner och pupillen, och undre locket i huden.',
  bilder: {
    oppna: { x: -3, y: -2, rader: ['.aaaa.', 'avjiva', 'bvikvb', '.bccb.'] },
    glada: { x: -3, y: -2, rader: ['......', '.aaaa.', 'abjiba', '.cccc.'] },
    ledsna: { x: -3, y: -2, rader: ['bbb.a.', 'aaaava', 'bvikvb', '.bccb.'] },
    slutna: { x: -3, y: -2, rader: ['.bbbb.', '.cccc.', 'aaaaaa', '.bccb.'] },
  } });
// ---- ögonbrynet Raka i fyra lägen (vänster på bilden; tjockt inåt mot näsan, tunt utåt) ----
spara({ id: 'bryn-1', ritad: 1, av: 'programmeringschatten, förebild', om: 'Raka ögonbryn: tjockast inåt mot näsan, smalare ut mot tinningen, ljusare i överkanten.',
  bilder: {
    lugna: { x: -3, y: -3, rader: ['.......', '.......', '..ggggf', 'ffffeee', '.......', '.......'] },
    arga: { x: -3, y: -3, rader: ['.......', 'gg.....', 'ffgg...', '..ffgf.', '....eee', '.......'] },
    ledsna: { x: -3, y: -3, rader: ['.....gg', '...ggff', '.ggff..', 'ff.....', '.......', '.......'] },
    forvanade: { x: -3, y: -3, rader: ['..ggg..', '.gfffg.', 'ff...ff', '.......', '.......', '.......'] },
  } });
// ---- munnen Smal i sex lägen ----
spara({ id: 'mun-1', ritad: 1, av: 'programmeringschatten, förebild', om: 'Smal mun: en mörk rödbrun läpplinje (rost0) och underläppen i skugga; tänderna syns när den är glad, och den öppna munnen är mörk inuti.',
  bilder: {
    glad: { x: -4, y: -2, rader: ['........', 'r......r', '.rqqqqr.', '..rrrr..', '...bb...'] },
    nojd: { x: -4, y: -2, rader: ['........', 'r......r', '.rrrrrr.', '..bbbb..', '........'] },
    lugn: { x: -4, y: -2, rader: ['........', '........', '.arrrra.', '..bbbb..', '........'] },
    ledsen: { x: -4, y: -2, rader: ['........', '........', '..rrrr..', '.r.bb.r.', '........'] },
    arg: { x: -4, y: -2, rader: ['........', '........', 'rkkkkkkr', 'r.bbbb.r', '........'] },
    oppen: { x: -4, y: -2, rader: ['........', '...rr...', '..rkkr..', '..rkkr..', '...bb...'] },
  } });
console.log('ok', fs.readdirSync('bildstil/delar'));
