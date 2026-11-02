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
// ---- huvudformen Rund: nedre ansiktet under ögonlinjen, för kvinnan, mannen och barnet ----
// kanten är en superellips: exponenten ex styr hur raka sidorna är och ey hur platt hakan är. Mannens är lite fyrkantigare
// (Björn efter 5.2.2.3: "alla mannens huvudformer ska vara lite mer fyrkantiga"): rakare sidor, bredare käke och plattare haka.
// Första försöket (ex 3,4, ey 2,8) var för kantigt ("ser konstig ut"): huvudet blev bredare vid käken än vid tinningarna
function huvud(under, { ex = 2.2, ey = 2 } = {}) {
  const H = { cx: 32, cy: 30, rx: 15, ry: 20 }, U = [1, 0.95];
  const inne = (x, y) => { const u = (x + 0.5 - H.cx) / H.rx, v = (y + 0.5 - H.cy) / H.ry; return v > 0 && (Math.abs(u) / (U[0] * under[0])) ** ex + (v / (U[1] * under[1])) ** ey <= 1; };
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
spara({ id: 'huvud-rund', ritad: 3, av: 'programmeringschatten, förebild', om: 'Det nedre ansiktet under ögonlinjen, med kinderna (A–D, röda i kylan). Skuggningen följer formen som mallens skalle. Mannen har en egen bild (man), lite fyrkantigare: lite rakare sidor, en aning bredare käke och plattare haka.',
  bilder: { standard: huvud([1, 1]) }, man: { standard: huvud([1.01, 1], { ex: 2.7, ey: 2.6 }) }, barn: { standard: huvud([1.04, 0.78]) } });
// ---- örat (vänster på bilden; det högra är det speglade, en ton mörkare) ----
// Omritat (Björn sa nej efter 5.2.2.3): förut en platt flik med en rak mörk rand; nu en rundad ytterkant i ljuset, en skål
// som böjer sig in mot huvudet, en tydlig örsnibb och mjukare skugga där örat möter huvudet
spara({ id: 'ora-2', ritad: 2, av: 'programmeringschatten, förebild', om: 'Mellanstort öra: en rundad ytterkant i ljuset, skålen i en båge in mot huvudet, en rund örsnibb och en mjuk skugga där örat möter huvudet.',
  bilder: { standard: { x: -2, y: -5, rader: [
    '.cd..',
    'dccb.',
    'dcbbb',
    'dbabb',
    'dbaab',
    'cbabb',
    'cbbb.',
    '.ccb.',
    '.ccb.',
    '..cb.',
  ] } } });
// ---- näsan Rak: näsryggen ljus till vänster och skuggad till höger, spetsen och näsborrarna ----
// En punkt åt vänster (Björn efter 5.2.2.3: näsorna satt inte mitt i ansiktet): ansiktets mitt ligger mellan x 31 och 32,
// alltså en halv punkt till vänster om fästpunkten, och förut låg näsryggen på 32–33
spara({ id: 'nasa-1', ritad: 2, av: 'programmeringschatten, förebild', om: 'Rak näsa: ljus näsrygg till vänster, skuggad sida till höger, ljus spets och mörka näsborrar med en skugga under.',
  bilder: { standard: { x: -4, y: 1, rader: [
    '...db..',
    '...db..',
    '...cb..',
    '..dcb..',
    '.bdccb.',
    '.adccba',
    '..abba.',
  ] } },
  barn: { standard: { x: -3, y: 1, rader: [
    '..db.',
    '..cb.',
    '.dccb',
    '.abba',
  ] } } });
// ---- ögat Runda i fyra lägen (vänster på bilden; det högra är det speglade) ----
spara({ id: 'oga-1', ritad: 3, av: 'programmeringschatten, förebild', om: 'Runda ögon: mörkt övre ögonlock, vitan, iris i två toner och pupillen, och undre locket i huden. De glada är öppna som de öppna, men kinden trycker upp undre locket i hörnen (Björn efter 5.2.2.3: mer öppna). Lite större efter Björn (5.2.2.3): 7 punkter brett och tre rader öppet.',
  bilder: {
    oppna: { x: -4, y: -3, rader: ['.aaaaa.', 'avjjiva', 'bvikkvb', '.vjiiv.', '.bcccb.'] },
    glada: { x: -4, y: -3, rader: ['.aaaaa.', 'avjjiva', 'bcikkcb', '.cdddc.', '.......'] },
    ledsna: { x: -4, y: -3, rader: ['bbbb.a.', 'aaaaava', 'bvjjivb', '.vikkv.', '.bcccb.'] },
    slutna: { x: -4, y: -3, rader: ['.......', '.bbbbb.', '.ccccc.', 'aaaaaaa', '.bcccb.'] },
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
spara({ id: 'mun-1', ritad: 2, av: 'programmeringschatten, förebild', om: 'Smal mun: en mörk rödbrun läpplinje (rost0) och underläppen i skugga; tänderna syns när den är glad, och den öppna munnen är mörk inuti. Omritad efter Björn (5.2.2.3): den glada, nöjda, lugna och ledsna är bredare, den lugna är rak och den ledsna sänker bara mungiporna lite.',
  bilder: {
    glad: { x: -5, y: -2, rader: ['..........', 'r........r', '.rqqqqqqr.', '..rrrrrr..', '...bbbb...'] },
    nojd: { x: -5, y: -2, rader: ['..........', 'r........r', '.rrrrrrrr.', '...bbbb...', '..........'] },
    lugn: { x: -5, y: -2, rader: ['..........', '..........', '.rrrrrrrr.', '...bbbb...', '..........'] },
    ledsen: { x: -5, y: -2, rader: ['..........', '..........', '..rrrrrr..', '.s.bbbb.s.', '..........'] },
    arg: { x: -4, y: -2, rader: ['........', '........', 'rkkkkkkr', 'r.bbbb.r', '........'] },
    oppen: { x: -4, y: -2, rader: ['........', '...rr...', '..rkkr..', '..rkkr..', '...bb...'] },
  } });
console.log('ok', fs.readdirSync('bildstil/delar'));

// ---- frisyren Halvlångt (steg 5.2.2.4) i två lager: bakhåret bakom huvudet och kroppen, framhåret med hjässan, luggen
// och sidorna framför öronen ner till käken. Formen är platshållarens; skuggningen är den matta från huvudet (ljus uppifrån
// vänster), och slingor i små lodräta klungor ger håret struktur utan glans. Punkterna räknas från fästpunkten har (32, 10).
function harTon(x, y, cx, cy, rx, ry, forskj = 0) {
  let t = ton(ljushet(x, y, cx, cy, rx, ry), x, y);
  const slinga = vn(x * 1.6, y * 0.32, 1.4, 31); // lodräta slingor: långsträckta klungor
  if (slinga > 0.74) t += 1; else if (slinga < 0.2 && t > 1) t -= 1; // få och mjuka: inga mörka prickar i det ljusa
  return 'efgh'[Math.max(0, Math.min(3, t + forskj))];
}
function lagerRader(punkt, x0, y0, x1, y1) {
  const rader = [];
  let minX = 99, maxX = -99, minY = 99, maxY = -99;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (punkt(x, y)) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  for (let y = minY; y <= maxY; y++) { let r = ''; for (let x = minX; x <= maxX; x++) r += punkt(x, y) || '.'; rader.push(r); }
  return { x: minX - 32, y: minY - 10, rader };
}
{
  const ell = (cx, cy, rx, ry) => (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  // bakhåret: en rundad massa bakom huvudet som når ner till hakan, mörkare än framhåret
  const bakInne = (x, y) => y >= 20 && y <= 51 && ell(32, 35, 19.5, 18.5)(x, y);
  const bak = (x, y) => bakInne(x, y) ? harTon(x, y, 32, 30, 19, 22, -1) : null;
  // framhåret: hjässan ner till hårfästet (luggen sveper snett åt höger), och sidorna framför öronen ner mot käken
  const harfaste = x => { const dx = Math.abs(x + 0.5 - 32); return dx >= 13.5 ? 32 : dx >= 10.5 ? 23 : Math.min(23, 19 + Math.max(0, x - 20) * 0.25); };
  const kapa = (x, y) => y < harfaste(x) && ell(32, 29.5, 16.5, 21.5)(x, y);
  const slut = 48;
  const sida = (x, y) => { const dx = Math.abs(x + 0.5 - 32); return y >= 19 && y <= slut - Math.max(0, dx - 15) && dx >= 12 && dx <= 18.5 - Math.max(0, y - slut + 3); };
  const fram = (x, y) => kapa(x, y) ? harTon(x, y, 32, 22, 17, 14) : sida(x, y) ? harTon(x, y, 32, 30, 18, 24) : null;
  spara({ id: 'har-5', ritad: 1, av: 'programmeringschatten, förebild', om: 'Halvlångt hår för båda: framhåret täcker hjässan och går ner framför öronen till käken, luggen sveper lite snett, och bakhåret syns bakom huvudet ner till hakan. Matt skuggning med ljus uppifrån vänster och slingor i små lodräta klungor.',
    bilder: { bakhar: lagerRader(bak, 0, 0, 63, 63), framhar: lagerRader(fram, 0, 0, 63, 63) } });
}
