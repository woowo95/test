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
  // Omritad (Björn efter förebilden i 5.2.2.4: "ser konstig ut"): förut var sidorna raka plattor med en platt axel vid
  // tinningarna och en rak lugg, som en hjälm. Nu en sammanhängande rundad form från hjässan ner till käken som vidgar sig
  // lite nertill, en lugg med mjuk kant som sveper åt höger, och slingorna bara ljusa (inga mörka ränder).
  const dX = x => Math.abs(x + 0.5 - 32);
  const yttre = (x, y) => {                                       // hårets ytterform runt huvudet
    if (y + 0.5 <= 31) return ((x + 0.5 - 32) / 19) ** 2 + ((y + 0.5 - 31) / 23) ** 2 <= 1;
    const ned = 46 + Math.round((vn(x, 0, 2, 41) - 0.5) * 2);       // nederkanten lite ojämn
    return dX(x) <= 19 + (y - 31) * 0.1 && y <= ned - Math.max(0, dX(x) - 17.5) * 1.2;
  };
  const harfaste = x => {                                          // luggens nederkant: sveper från vänster till höger
    const t = Math.max(0, Math.min(1, (x - 19) / 26));
    return Math.round(18.5 + t * 3.5 + (vn(x, 3, 1.6, 17) - 0.5) * 2.2);
  };
  const sida = (x, y) => y >= 19 && dX(x) >= 12.5 - Math.min(1, (y - 19) * 0.15) && yttre(x, y);
  const fram = (x, y) => {
    if (!yttre(x, y)) return null;
    if (y < harfaste(x) && dX(x) < 14) return harTon2(x, y, 32, 20, 18, 14);
    if (y < 20 || sida(x, y)) return harTon2(x, y, 32, 30, 19, 23);
    return null;
  };
  const bak = (x, y) => yttre(x, y) ? harTon2(x, y, 32, 31, 19, 23, -1) : null;
  spara({ id: 'har-5', ritad: 2, av: 'programmeringschatten, förebild', om: 'Halvlångt hår för båda: en rundad form från hjässan ner till käken som vidgar sig lite nertill, framhåret täcker hjässan och går ner framför öronen, luggen har en mjuk kant och sveper lite åt höger, och bakhåret syns bakom huvudet. Matt skuggning med ljus uppifrån vänster och några ljusa slingor. Omritad efter Björn (5.2.2.4: förra såg ut som en hjälm).',
    bilder: { bakhar: lagerRader(bak, 0, 0, 63, 63), framhar: lagerRader(fram, 0, 0, 63, 63) } });
}
// slingorna i den omritade frisyren: bara ljusa klungor, aldrig mörka ränder
function harTon2(x, y, cx, cy, rx, ry, forskj = 0) {
  let t = ton(ljushet(x, y, cx, cy, rx, ry), x, y);
  if (vn(x * 1.6, y * 0.32, 1.4, 31) > 0.76 && t < 3) t += 1;
  return 'efgh'[Math.max(0, Math.min(3, t + forskj))];
}

// ---- skägget Helskägg (steg 5.2.2.4), på mannens käke: kinderna nedanför kindbenen, mustaschen över munnen och skägget
// under hakan. Munnens ruta lämnas fri av programmet (utom: mun). Punkterna räknas från fästpunkten skagg (32, 43).
{
  const H = { cx: 32, cy: 30, rx: 15, ry: 20 }, U = [1.01, 0.95], ex = 2.7, ey = 2.6; // mannens runda huvudform
  const kaken = (x, y) => { const u = (x + 0.5 - H.cx) / H.rx, v = (y + 0.5 - H.cy) / H.ry; return v > 0 && (Math.abs(u) / U[0]) ** ex + (v / U[1]) ** ey <= 1; };
  const hake = Math.floor(H.cy + H.ry * U[1] - 0.5);
  const inne = (x, y) => {
    const dx = Math.abs(x + 0.5 - 32);
    const kind = kaken(x, y) && y >= 36 && (dx > 7.5 || y >= 40);         // kinderna och runt munnen
    const under = y >= hake - 3 && y <= 55 && dx <= 12.5 - (y - hake + 3) * 0.42 + (vn(x, y, 1.5, 7) - 0.5) * 1.2; // under hakan, lite ojämnt
    const kant = kaken(x, y) && !kaken(x + (x < 32 ? 2 : -2), y - 2) && y >= 34;  // en tunn rand längs käken upp mot örat
    // mustaschen (Björn efter förebilden i 5.2.2.4: skäggigare på överläppen): tre rader under näsan och mungipor som går
    // ner bredvid munnen; munnens ruta lämnas fri av programmet
    const mustasch = (y >= 39 && y <= 41 && dx <= 7.5 - (y === 39 ? 1 : 0)) || (dx >= 5.5 && dx <= 8.5 && y >= 41 && y <= 45);
    return kind || under || kant || mustasch;
  };
  const skagg = (x, y) => inne(x, y) ? harTon(x, y, 32, 44, 15, 12) : null;
  const b = lagerRader(skagg, 0, 0, 63, 63);
  spara({ id: 'skagg-1', ritad: 2, av: 'programmeringschatten, förebild', om: 'Helskägg på mannens käke: kinderna, en tjock mustasch under näsan med mungipor som går ner, och skägget under hakan, lite ojämnt nertill. Matt skuggning med ljus uppifrån vänster och slingor som håret.',
    bilder: { standard: { x: b.x, y: b.y + 10 - 43, rader: b.rader } } });
}

// ---- huvudbonaden Mössa (steg 5.2.2.4): en stickad mössa i skiffer över skallen med en uppvikt kant i jord. Maskerna
// (skalle, lugg) döljer håret under. Punkterna räknas från fästpunkten huvudbonad (32, 10).
{
  const ell = (cx, cy, rx, ry) => (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  const kropp = (x, y) => y <= 18 && ell(32, 24, 17.5, 15.5)(x, y);
  const kant = (x, y) => y >= 17 && y <= 21 && Math.abs(x + 0.5 - 32) <= 17.4 - (y === 21 ? 0.6 : 0);
  const tonPa = (x, y, cx, cy, rx, ry, ramp) => { let t = ton(ljushet(x, y, cx, cy, rx, ry), x, y); if ((x + (y >> 1)) % 3 === 0 && t > 0 && t < 3) t -= hash(x, y, 4) < 0.5 ? 1 : 0; return ramp[Math.max(0, Math.min(3, t))]; };
  const mossa = (x, y) => kant(x, y) ? tonPa(x, y, 32, 18, 18, 4, 'EFGH') : kropp(x, y) ? tonPa(x, y, 32, 12, 17, 12, 'QRST') : null;
  const b = lagerRader(mossa, 0, 0, 63, 63);
  spara({ id: 'bonad-1', ritad: 1, av: 'programmeringschatten, förebild', om: 'Stickad mössa i skiffer med en uppvikt kant i jord. Matt skuggning med ljus uppifrån vänster och ett glest stickmönster i snedrader. Döljer håret på skallen och luggen (maskerna).',
    bilder: { standard: b } });
}

// ---- smycket Benhalsband (steg 5.2.2.4): ett mörkt snöre med benbitar i en båge runt halsen, lägst mitt på bröstet.
// Omritat (Björn efter förebilden: "man ser inte benen"): benet har samma toner som huden, så bitarna är nu större (två
// punkter breda och tre till fyra höga) och har mörk skugga till höger och under. Punkterna räknas från fästpunkten
// halsband (32, 57).
{
  const punkter = {};
  const satt = (x, y, v) => { punkter[x + ',' + y] = v; };
  const bage = x => 57 - Math.round(((x + 0.5 - 32) / 11) ** 2 * 4);
  for (let x = 20; x <= 43; x++) satt(x, bage(x), x < 32 ? 'E' : 'k');
  for (const [x, lang] of [[22, 3], [26, 3], [30, 4], [34, 3], [38, 3]]) { // fem benbitar som hänger från snöret
    const y = bage(x) + 1;
    for (let j = 0; j < lang; j++) { satt(x, y + j, j === 0 ? 'w' : j === lang - 1 ? 'p' : 'q'); satt(x + 1, y + j, j === 0 ? 'q' : 'p'); }
    for (let j = 1; j <= lang; j++) satt(x + 2, y + j - 1, 'E');           // skuggan till höger
    satt(x, y + lang, 'E'); satt(x + 1, y + lang, 'E');                    // och under
  }
  const b = lagerRader((x, y) => punkter[x + ',' + y] || null, 0, 0, 63, 63);
  spara({ id: 'smycke-2', ritad: 2, av: 'programmeringschatten, förebild', om: 'Benhalsband: ett mörkt snöre i en båge runt halsen med fem benbitar, ljusa uppåt vänster och med mörk skugga till höger och under så att de syns mot huden, och en lite längre bit i mitten.',
    bilder: { standard: { x: b.x, y: b.y + 10 - 57, rader: b.rader } } });
}

// ---- skönhetens lager: Ögonfransar (steg 5.2.2.5), förebild för lagren. Tre små mörka fransar som pekar ut och upp vid
// ögats yttre hörn ovanför locket (vänster öga på bilden; det högra är det speglade). Från fästpunkten oga (26, 30).
spara({ id: 'skon-fransar', ritad: 1, av: 'programmeringschatten, förebild', om: 'Ögonfransar: tre små mörka fransar i kol som pekar ut och upp vid ögats yttre hörn ovanför locket. Ritas för vänster öga; det högra är det speglade.',
  bilder: { standard: { x: -6, y: -5, rader: ['k.....', '.k.k..', '..l...'] } } });

// ---- rynkorna Steg 1 (steg 5.2.2.5), förebild: tunna linjer i hudens mörka toner. Kråkfötter vid ögonvrårna, en svag
// linje i pannan och veck från näsvingarna mot mungiporna. Från fästpunkten huvud (32, 30); ljuset från vänster, så linjerna
// till vänster är ljusare (b) och till höger mörkare (a).
{
  const P = {};
  const satt = (x, y, v) => { P[x + ',' + y] = v; };
  for (const [x, y] of [[20, 29], [19, 30], [20, 31]]) satt(x, y, 'b');           // kråkfötter vänster
  for (const [x, y] of [[43, 29], [44, 30], [43, 31]]) satt(x, y, 'a');           // och höger
  for (let x = 27; x <= 36; x++) if (x !== 31) satt(x, 21 + (x === 27 || x === 36 ? 1 : 0), x < 32 ? 'b' : 'a'); // pannan
  for (const [x, y] of [[27, 38], [26, 39], [26, 40], [25, 41]]) satt(x, y, 'b'); // från näsvingen mot mungipan
  for (const [x, y] of [[36, 38], [37, 39], [37, 40], [38, 41]]) satt(x, y, 'a');
  const b = lagerRader((x, y) => P[x + ',' + y] || null, 0, 0, 63, 63);
  spara({ id: 'rynkor-1', ritad: 1, av: 'programmeringschatten, förebild', om: 'Rynkor steg 1: kråkfötter vid ögonvrårna, en svag linje i pannan och veck från näsvingarna mot mungiporna, tunna linjer i hudens mörka toner (ljusare till vänster mot ljuset).',
    bilder: { standard: { x: b.x, y: b.y + 10 - 30, rader: b.rader } } });
}

// ---- skadorna (steg 5.2.2.6), förebilder. Från fästpunkten huvud (32, 30).
{
  const bild = (P) => { const b = lagerRader((x, y) => P[x + ',' + y] || null, 0, 0, 63, 63); return { x: b.x, y: b.y + 10 - 30, rader: b.rader }; };
  // ärret Över ögonbrynet: en ljus upphöjd linje snett genom vänster ögonbryn, med en mörk skugga under
  const A = {};
  for (let i = 0; i <= 7; i++) { const x = 22 + i, y = 21 + i; A[x + ',' + y] = 'd'; if (i < 7) A[x + ',' + (y + 1)] = i % 2 ? 'a' : 'b'; } // genom brynet, som får ett glapp
  spara({ id: 'arr-1', ritad: 1, av: 'programmeringschatten, förebild', om: 'Ärr över ögonbrynet: en ljus upphöjd linje snett genom vänster ögonbryn, med en mörk skugga under som visar att den står upp.',
    bilder: { standard: bild(A) } });
  // blåmärket Runt ögat: en matt ring i skiffer och mörk rost runt vänster öga, mörkast närmast ögat
  const B = {};
  for (let y = 25; y <= 35; y++) for (let x = 19; x <= 33; x++) {
    const u = (x + 0.5 - 26) / 5.2, v = (y + 0.5 - 30.5) / 4.9, r = u * u + v * v; // rundare efter Björn (5.2.2.6, version 4)
    if (r > 1) continue;
    // matt och dämpat: mörk rost och hudens mörkaste ton, med lite skiffer närmast ögat (förra blev en blå ring)
    // blåare efter Björn (5.2.2.6): mörkt blått (skiffer) närmast ögat, blått och mörk rost utåt, glest i kanten
    // mer subtilt efter Björn (5.2.2.6): blått närmast ögat, glest och blandat med hudens mörka toner utåt
    // ännu mer subtilt (version 4): glesare, mer av hudens egna mörka toner och mindre blått
    const h = hash(x, y, 3), t = r < 0.35 ? (h < 0.5 ? 'R' : h < 0.85 ? 'b' : null) : r < 0.7 ? (h < 0.25 ? 'R' : h < 0.55 ? 'b' : null) : (h < 0.2 ? 'b' : null);
    if (t) B[x + ',' + y] = t;
  }
  spara({ id: 'blamarke-1', ritad: 4, av: 'programmeringschatten, förebild', om: 'Blåmärke runt ögat: runt och subtilt, blått i skiffer närmast ögat och glest blandat med hudens mörka toner utåt. Ögat ritas ovanpå.',
    bilder: { standard: bild(B) } });
  // förbandet Runt huvudet: ett linneband över pannan som följer huvudets rundning, skuggat nedåt, med en liten blodfläck
  const C = {};
  for (let x = 16; x <= 47; x++) {
    const dx = (x + 0.5 - 32) / 16, ned = Math.round(dx * dx * 2.5), y0 = 18 + ned;
    for (let j = 0; j <= 3; j++) C[x + ',' + (y0 + j)] = j === 0 ? (x < 32 ? 'w' : 'q') : j === 3 ? 'p' : (hash(x, j, 9) < 0.25 ? 'p' : (x < 32 ? 'q' : 'p'));
  }
  // blodigare efter Björn (5.2.2.6): en större fläck som sugits upp i linnet, mörkast i mitten, och en droppe som runnit ner
  for (let y = 18; y <= 23; y++) for (let x = 19; x <= 28; x++) {
    if (!C[x + ',' + y]) continue; const r = ((x + 0.5 - 23.5) / 4.5) ** 2 + ((y + 0.5 - 20.5) / 2.2) ** 2;
    if (r < 0.35) C[x + ',' + y] = 'r'; else if (r < 0.8) C[x + ',' + y] = 's'; else if (r < 1.1 && hash(x, y, 6) < 0.6) C[x + ',' + y] = 't';
  }
  C['22,23'] = 's'; C['22,24'] = 'r'; C['22,25'] = 'r';
  spara({ id: 'forband-huvud', ritad: 2, av: 'programmeringschatten, förebild', om: 'Förband runt huvudet: ett linneband över pannan som följer huvudets rundning, ljust upptill och skuggat nedåt, med en stor blodfläck till vänster som sugits upp i linnet och en droppe som runnit ner.',
    bilder: { standard: bild(C) } });
}

// ---- plagget Rock (steg 5.2.2.7), förebild. Omritad två gånger: först en slät tröja i hudens färg (nej), sedan en tunika
// med V-ringning ("ser konstig ut"). Nu en stängd skinnrock som täcker axlarna och bröstet upp till halsen, med en hög lurvig
// pälskrage runt halsen och en överlappande kant snett ner över bröstet. Ritas i materialkanalen (x, y, z, Z = mat0–mat3),
// som får personens material. En bild per mall. Från fästpunkten halsband (32, 57).
{
  const MALLAR = JSON.parse(fs.readFileSync('bildstil/portratt.json', 'utf8')).mallar;
  const rock = K => {
    const s0 = K.axel0, dX = x => Math.abs(x + 0.5 - 32);
    const kropp = (x, y) => {
      if (y < s0 - 1) return false;
      const t = Math.min(1, Math.max(0, (y + 0.5 - s0) / (K.axel1 - s0)));
      return dX(x) <= K.hals + 1.5 + (K.bredd + 0.5 - K.hals - 1.5) * (1 - (1 - t) ** 2.2);
    };
    const krage = (x, y) => y >= s0 - 5 && y <= s0 + 1 && dX(x) <= K.hals + 3 - (y < s0 - 3 ? 1 : 0); // hög krage runt halsen
    const P = {};
    for (let y = s0 - 5; y <= 63; y++) for (let x = 0; x <= 63; x++) {
      const iKrage = krage(x, y), iKropp = kropp(x, y);
      if (!iKrage && !iKropp) continue;
      let t;
      if (iKrage) t = 2 + (hash(x, y, 2) < 0.45 ? 1 : 0) - (x > 32 && hash(x, y, 3) < 0.4 ? 1 : 0);             // ljus lurvig päls
      else {
        t = Math.min(2, ton(ljushet(x, y, 32, s0 + 8, K.bredd, 9), x, y));
        if ((x + Math.floor(y / 2)) % 4 === 0 && hash(x, y, 5) < 0.4) t = Math.max(0, t - 1);                    // korta strån i skinnet
        const kant = 33 - Math.round((y - s0 - 1) * 0.25);                                                        // den överlappande kanten
        if (y > s0 + 1 && x === kant) t = 0; else if (y > s0 + 1 && x === kant - 1) t = Math.min(3, t + 1);
      }
      P[x + ',' + y] = 'xyzZ'[Math.max(0, Math.min(3, t))];
    }
    const b = lagerRader((x, y) => P[x + ',' + y] || null, 0, 0, 63, 63);
    return { standard: { x: b.x, y: b.y + 10 - 57, rader: b.rader } };
  };
  const K = id => MALLAR.find(m => m.id === id).kropp;
  spara({ id: 'plagg-rock', ritad: 3, av: 'programmeringschatten, förebild', om: 'Stängd skinnrock över axlarna och bröstet upp till halsen, med en hög lurvig pälskrage och en överlappande kant snett ner över bröstet, och korta strån i skinnet; i materialkanalen, så att den blir harskinn eller vargskinn efter personen. En bild per mall. Omritad efter Björn (5.2.2.7: förra såg konstig ut).',
    bilder: rock(K('kvinna')), man: rock(K('man')), barn: rock(K('barn')) });
}

// ---- redskapet Flintyxa (steg 5.2.2.7), förebild i porträttet. Redskapen bärs på ryggen (Björn efter 5.2.2.7): skaftet
// går snett bakom ryggen och huvudet sticker upp bakom axeln bredvid huvudet. Ritas bakom personen (lagret redskapBak).
// Stort: ett tjockt skaft i jord med ljus kant, ett kilformat flinthuvud i skiffer, slätt skuggat med ljus egg, och en
// korsad surrning av rep. Från fästpunkten redskap (54, 52).
{
  const P = {};
  const satt = (x, y, v) => { P[x + ',' + y] = v; };
  // version 5 efter Björn (5.2.2.7): mer diagonalt över ryggen och lägre, så att det inte sticker upp lika långt.
  // Skaftet går från nere till vänster bakom ryggen upp mot höger axel; huvudet sitter tvärs över skaftets topp,
  // med en kort nacke och ett blad som vidgas mot eggen.
  const sx = 47, sy = 38, lut = 0.5;                // skaftets topp och lutning (punkter åt höger per punkt uppåt)
  for (let y = sy - 1; y <= 63; y++) { const x = Math.round(sx - (y - sy) * lut);
    for (let d = -1; d <= 2; d++) satt(x + d, y, d < 0 ? 'H' : d < 2 ? 'G' : 'E');
    if ((y - sy) % 4 === 0) satt(x + 2, y, 'H'); }    // tjockare där lutningen gör trappsteg
  const L = Math.hypot(lut, 1), ax = 1 / L * 1, ay = lut / L; // huvudets axel, vinkelrät mot skaftet: åt höger och lite nedåt
  for (let y = sy - 12; y <= sy + 16; y++) for (let x = sx - 8; x <= 63; x++) {
    const dx = x + 0.5 - (sx + 0.5), dy = y + 0.5 - (sy + 1.5), u = dx * ax + dy * ay, v = -dx * ay + dy * ax; // u längs huvudet, v tvärs
    if (u < -3.5 || u > 11) continue; const h = u < 0 ? 2.4 : 2.4 + u * 0.5; if (Math.abs(v) > h) continue; // större och längre ner efter Björn (version 5)
    const vv = v / h;
    satt(x, y, u > 9.6 ? (vv < 0.2 ? 'T' : 'S') : u < -2.5 ? 'Q' : vv < -0.45 ? 'S' : vv > 0.45 ? 'Q' : (hash(x, y, 9) < 0.18 ? 'S' : 'R'));
  }
  for (let y = sy - 1; y <= sy + 6; y++) { const x0 = Math.round(sx - (y - sy) * lut); for (let x = x0 - 1; x <= x0 + 2; x++) satt(x, y, y % 2 ? 'L' : 'K'); } // surrningen: ränder av mörkt rep runt skaftet
  const b = lagerRader((x, y) => P[x + ',' + y] || null, 0, 0, 63, 63);
  spara({ id: 'redskap-yxa', ritad: 5, av: 'programmeringschatten, förebild', om: 'Flintyxa på ryggen: ett tjockt skaft i jord snett bakom ryggen, och ett stort kilformat flinthuvud i skiffer med ljus egg och korsad surrning som sticker upp bakom axeln bredvid huvudet. Huvudet sitter tvärs över skaftets topp, med kort nacke och ett blad som vidgas mot eggen. Omritad efter Björn (5.2.2.7: större, på ryggen; sedan: ser fortfarande konstigt ut; sedan: mer diagonalt och lägre; sedan: större och längre ner, får täckas av personen; sedan: ännu längre ner).',
    bilder: { standard: { x: b.x - 22, y: b.y + 10 - 52, rader: b.rader } } });
}

