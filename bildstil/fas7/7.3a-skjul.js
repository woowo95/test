// 7.3 Skjulen: stolpen, den blöta veden, torkhuset och vedboden. Skjulen har tak men inga väggar; som husen ritas de
// utan tak, och ytan under taket är skuggad. Golvet, torkställningarna, veden, timmerväggen och elden är de godkända bilderna
(() => {
  const { KORT, ell, rakt, och, former, lagg, bildfil, gras } = window.F7;
  const R = 16;
  const bit = (B, id, sx, sy, w, h, dx, dy) => { const o = BILDFILER[id]; if (!o) return; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const ch = (o.rader[sy + y] || '')[sx + x], c = o.pal[ch]; if (!ch || ch === '.' || !c) continue; if (c.startsWith('rgba')) B.morka(dx + x, dy + y); else B.satt(dx + x, dy + y, B.P.fran(c)); } };
  const morkt = (B, x, y, w, h) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) B.morka(xx, yy); };

  // ---------- 7.3.1 stolpen ----------
  // en stolpe står mitt i sin ruta; dx, dy: var bilden börjar i rutan (en stående stolpe når upp över rutan)
  const STOLPAR = [
    { // 1: en rund stolpe sedd ovanifrån, med årsringarna i ändträet som hörnen i timmerväggen
      bild: () => former(12, 12, [[ell(6, 6, 5.6, 5.6), (x, y) => { const d = Math.hypot(x - 6, y - 6); return d > 4.4 ? (x + y < 10 ? 'B' : x + y > 14 ? 'b' : 'K') : d < 1.2 ? 'm' : Math.floor(d * 1.3) % 2 ? 'r' : (x + y < 11 ? 'L' : 'R'); }]]),
      legend: { B: 'jord2', K: 'jord1', b: 'jord0', L: 'ben3', R: 'ben2', r: 'ben1', m: 'jord1' }, dx: 2, dy: 2,
    },
    { // 2: en stående rund stolpe med barken kvar, ändträet ljust överst
      bild: () => former(8, 25, [[rakt(0.5, 2.5, 7.5, 24.5), (x, y) => x < 2.5 ? 'L' : x > 5.5 ? 'm' : (Math.floor(y) * 3 + Math.floor(x)) % 7 === 0 ? 'm' : 'K'], [ell(4, 2.6, 3.5, 2.1), (x, y) => Math.hypot((x - 4) / 1.6, y - 2.6) < 0.9 ? 'r' : 'R']]),
      legend: { L: 'jord2', K: 'jord1', m: 'jord0', R: 'ben2', r: 'ben1' }, dx: 4, dy: -10,
    },
    { // 3: en bilad, fyrkantig stolpe med stenar kilade runt foten
      bild: () => former(12, 25, [[rakt(2, 0.5, 10, 3), (x, y) => y < 1.5 ? 'R' : 'r'], [rakt(2, 3, 10, 23), (x, y) => x < 4 ? 'L' : x > 8 ? 'm' : Math.floor(y) % 6 === 2 && x > 5 ? 'K' : 'l'], [och(ell(2.2, 22.6, 2.2, 1.8), ell(9.8, 22.8, 2.2, 1.7), ell(6, 23.4, 2.6, 1.5)), (x, y) => y < 22.4 ? 'S' : x > 8 || y > 23.6 ? 's' : 'T']]),
      legend: { R: 'ben2', r: 'ben1', L: 'jord3', l: 'jord2', K: 'jord1', m: 'jord0', S: 'skiffer3', T: 'skiffer2', s: 'skiffer1' }, dx: 2, dy: -10,
    },
  ];
  const stolpe = (B, v, x, y) => { const s = STOLPAR[v]; lagg(B, s.bild(), s.legend, x + s.dx, y + s.dy); };
  // en ruta markerad med en svag ram, så att man ser vad en ruta är
  const ram = (B, x, y, w = R, h = R) => { for (let i = 0; i < w; i += 2) { B.morka(x + i, y); B.morka(x + i, y + h - 1); } for (let i = 0; i < h; i += 2) { B.morka(x, y + i); B.morka(x + w - 1, y + i); } };
  const stolpKort = (text, v) => ({ text, w: 7 * R + 8, h: 5 * R + 4, rita: (B) => {
    const o = { x: 4, y: 4 };
    ram(B, o.x, o.y + 3 * R); stolpe(B, v, o.x, o.y + 3 * R);
    // fyra i en fyrkant, tre rutor mellan stolparna: de bakre först
    for (const ty of [1, 4]) for (const tx of [2, 5]) stolpe(B, v, o.x + tx * R, o.y + ty * R);
  } });

  // ---------- 7.3.4 den blöta veden ----------
  // en vedhög som i spelet (upp till fyra vedträn i en hög); den blöta är mörkare och har en droppe
  const hog = (B, x0, y0, blot) => {
    const VED = BILDFILER.ved;
    const hw = Math.max(2, VED.w >> 1), hh = Math.max(2, VED.h >> 1);
    const bx = x0 + ((R - VED.w - hw) >> 1), by = y0 + ((R - 3 - VED.h - hh) >> 1) + 1;
    for (const [ox, oy] of [[0, 0], [hw, -1], [-1, hh], [hw - 1, hh + 1]]) {
      bildfil(B, 'ved', bx + ox, by + oy);
      if (blot) VED.rader.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.' && ch !== 'E') { B.morka(bx + ox + x, by + oy + y); B.morka(bx + ox + x, by + oy + y); } }));
    }
    return { bx, by };
  };
  // tre droppar
  const LITEN = ['..o..', '.oLo.', '.oLSo', 'oLSSo', 'oSSso', 'oSsso', '.ooo.'], LITEN_F = { L: 'skiffer3', S: 'skiffer2', s: 'skiffer1' };
  const DROPPE = [
    (B, x, y) => bildfil(B, 'sym_droppe', x + 4, y - 15),
    (B, x, y, h) => {
      lagg(B, LITEN, LITEN_F, x + 12, y - 4, false);
      for (const [dx, dy] of [[2, 1], [7, 0], [4, 4], [9, 5]]) B.satt(h.bx + dx, h.by + dy, B.P.i('skiffer', 3));
    },
    (B, x, y) => {
      lagg(B, former(12, 13, [[ell(6, 5.5, 5.5, 5), 'V'], [(px, py) => py >= 9 && py < 12.5 && px > 2.5 && px < 2.5 + (12.5 - py) * 0.9, 'V']]), { V: 'ben3' }, x + 7, y - 13, false);
      lagg(B, LITEN, LITEN_F, x + 11, y - 11, false);
    },
  ];
  const vedKort = (text, v) => ({ text, w: 4 * R + 8, h: 2 * R + 16, rita: (B) => {
    const x0 = 4, y0 = 14;
    hog(B, x0, y0, false);
    const h = hog(B, x0 + 2 * R, y0, true);
    DROPPE[v](B, x0 + 2 * R, y0, h);
  } });

  // ---------- 7.3.5 torkhuset ----------
  // stolpar i hörnen (och en i mitten på en sida som är längre än fyra rutor), jordgolv och två torkställningar under taket.
  // Taket ritas inte; ytan under det är skuggad. Versionerna visar taket på tre sätt
  // skuggan läggs på golvet först, så att det som står under taket syns; sedan ritas taket på versionens sätt
  const TAK = [
    // 1: bara skuggan under taket
    () => {},
    // 2: skuggan och takfoten: en smal kant av halm runt taket, som det enda man ser av taket
    (B, x, y, w, h) => {
      const k = (xx, yy, i) => B.satt(xx, yy, B.P.i('senap', i));
      for (let xx = x; xx < x + w; xx++) { k(xx, y, xx % 3 ? 2 : 1); k(xx, y + 1, xx % 3 === 1 ? 2 : 1); k(xx, y + h - 2, xx % 3 ? 1 : 0); B.satt(xx, y + h - 1, B.P.i('kol', 0)); }
      for (let yy = y; yy < y + h; yy++) { k(x, yy, yy % 3 ? 2 : 1); k(x + 1, yy, 1); k(x + w - 2, yy, yy % 3 ? 1 : 0); B.satt(x + w - 1, yy, B.P.i('kol', 0)); }
      for (let xx = x - 1; xx <= x + w; xx++) B.satt(xx, y - 1, B.P.i('kol', 0));
      for (let yy = y; yy < y + h; yy++) B.satt(x - 1, yy, B.P.i('kol', 0));
    },
    // 3: taket ritat som strån av halm i rader, tätast mitt på och genomskinligt ut mot kanterna, så att det under syns
    (B, x, y, w, h) => {
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
        if ((yy - y) % 3) continue;
        const kant = Math.min(xx - x, x + w - 1 - xx, yy - y, y + h - 1 - yy), tat = kant < 3 ? 0 : kant < 8 ? 0.25 : 0.5;
        const r = (((Math.floor(xx / 3) * 73856093) ^ (yy * 19349663)) >>> 0) % 1000 / 1000;
        if (r < tat) B.satt(xx, yy, B.P.i('senap', xx % 3 === 0 ? 2 : 1));
      }
    },
  ];
  const torkKort = (text, v) => ({ text, w: 7 * R + 8, h: 4 * R + 18, rita: (B) => {
    const TW = 6, TH = 3, x = 12, y = 14, ut = 3; // ytan 6 × 3 rutor; taket når ut 3 punkter utanför stolparna
    for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) bildfil(B, 'golv_jord', x + tx * R, y + ty * R);
    morkt(B, x - ut, y - ut, TW * R + 2 * ut, TH * R + 2 * ut);
    bildfil(B, 'tork', x + R - 4, y + 12); bildfil(B, 'tork', x + 3 * R + 4, y + 12);
    TAK[v](B, x - ut, y - ut, TW * R + 2 * ut, TH * R + 2 * ut);
    // stolparna: hörnen och mitten på de långa sidorna, de bakre först
    for (const ty of [0, TH - 1]) for (const tx of [0, TW / 2 - 0.5, TW - 1]) stolpe(B, 1, x + tx * R + (tx === 0 ? -4 : tx === TW - 1 ? 4 : 0), y + ty * R + (ty === 0 ? -3 : 3));
  } });

  // ---------- 7.3.6 vedboden ----------
  // ett tak som byggs ut från en husvägg och vilar på två stolpar, med veden under, nära elden
  const timmerhus = (B, x0, y0, tw, th, dorr) => {
    for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) bildfil(B, 'golv_tra', x0 + tx * R, y0 + ty * R);
    for (let tx = 1; tx < tw - 1; tx++) { bit(B, 'timmervagg', 16 + (tx % 2) * 16, 0, R, R, x0 + tx * R, y0); if (tx !== dorr) bit(B, 'timmervagg', 34 + (tx % 2) * 4, 48, R, R, x0 + tx * R, y0 + (th - 1) * R); }
    for (let ty = 1; ty < th - 1; ty++) { bit(B, 'timmervagg', 0, 16 + (ty % 2) * 16, R, R, x0, y0 + ty * R); bit(B, 'timmervagg', 48, 16 + (ty % 2) * 16, R, R, x0 + (tw - 1) * R, y0 + ty * R); }
    bit(B, 'timmervagg', 0, 0, R, R, x0, y0); bit(B, 'timmervagg', 48, 0, R, R, x0 + (tw - 1) * R, y0);
    bit(B, 'timmervagg', 0, 48, R, R, x0, y0 + (th - 1) * R); bit(B, 'timmervagg', 48, 48, R, R, x0 + (tw - 1) * R, y0 + (th - 1) * R);
  };
  // veden staplad i en lång trave: vedträna i förband, ändarna mot oss
  const trave = (B, x, y, n, rader) => { for (let r = rader - 1; r >= 0; r--) for (let i = 0; i < n; i++) bildfil(B, 'ved', x + i * 9 + (r % 2) * 4, y + r * 3); };
  const VEDBOD = [
    (B, x, y) => { for (let tx = 0; tx < 4; tx++) hog(B, x + tx * R, y + 2, false); for (let tx = 0; tx < 3; tx++) hog(B, x + 8 + tx * R, y + R + 2, false); },
    (B, x, y) => { trave(B, x + 2, y + 2, 6, 4); hog(B, x + 4, y + R + 6, false); hog(B, x + 2 * R + 4, y + R + 6, false); },
    (B, x, y) => { trave(B, x + 2, y + 2, 6, 3); for (let tx = 0; tx < 3; tx++) hog(B, x + 4 + tx * 18, y + R + 4, false); },
  ];
  const vedbodKort = (text, v) => ({ text, w: 7 * R + 8, h: 6 * R + 8, rita: (B) => {
    const x = 4, y = 4;
    timmerhus(B, x, y, 7, 3, -1);
    // boden: rutorna 1–4 nedanför husets nedre vägg, två rutor djup; taket når ut 3 punkter
    const bx = x + R, by = y + 3 * R, bw = 4 * R, bh = 2 * R, ut = 3;
    morkt(B, bx - ut, by, bw + 2 * ut, bh + ut);
    VEDBOD[v](B, bx, by);
    TAK[v](B, bx - ut, by, bw + 2 * ut, bh + ut);
    stolpe(B, 1, bx - 4, by + bh - R + 3); stolpe(B, 1, bx + bw - R + 4, by + bh - R + 3);
    bildfil(B, 'lagereld_stort', x + 5 * R + 6, y + 4 * R + 2);
  } });

  // stolparna i ett rum: trägolv, timmervägg bak och två stolpar mitt i rummet
  const rumKort = (text, v) => ({ text, w: 7 * R, h: 6 * R, rita: (B) => {
    for (let ty = 0; ty < 6; ty++) for (let tx = 0; tx < 7; tx++) bildfil(B, ty === 0 ? 'timmervagg' : 'golv_tra', tx * R, ty * R);
    for (const tx of [1.5, 4.5]) stolpe(B, v, tx * R, 3 * R);
  } });
  VAL.push(KORT('f7_blot_ved', 'Blöt ved', 'Steg 7.3.4: ved som blivit blöt i regnet eller snön. Till vänster en torr vedhög och till höger en blöt: mörkare och med en droppe. Versionerna visar droppen på tre sätt.', [
    vedKort('Droppsymbolen ovanför högen.', 0),
    vedKort('En liten droppe intill högen och blanka vattenpärlor på vedträna.', 1),
    vedKort('En liten pratbubbla med en droppe i, ovanför högen.', 2),
  ]));
  VAL.push(KORT('f7_torkhus', 'Torkhuset', 'Steg 7.3.5: torkhuset, ett tak utan väggar där byn torkar kött, fisk och skinn i regn. Stolpar i hörnen och mitt på de långa sidorna, jordgolv och två torkställningar under. Taket ritas inte, som på husen, och ytan under det är skuggad; versionerna visar taket på tre sätt.', [
    torkKort('Bara skuggan under taket visar var det är.', 0),
    torkKort('Skuggan och takfoten, en smal kant av halm runt taket.', 1),
    torkKort('Taket ritat som halm, men glest och allt glesare ut mot kanterna, så att det under syns.', 2),
  ]));
  VAL.push(KORT('f7_vedbod', 'Vedboden', 'Steg 7.3.6: vedboden, ett tak som byggs ut från en husvägg och vilar på två stolpar, med veden under så att den håller sig torr, nära elden. Taket visas på samma tre sätt som torkhusets.', [
    vedbodKort('Vedhögar på rad under taket; bara skuggan visar taket.', 0),
    vedbodKort('Veden staplad i en lång trave mot väggen och två högar framför; skuggan och takfoten av halm.', 1),
    vedbodKort('En lägre trave mot väggen och högar framför; taket ritat som gles halm.', 2),
  ]));
})();
