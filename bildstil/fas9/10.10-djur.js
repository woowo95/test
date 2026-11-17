// fas 10, system 10.10: fler djur och bina, tre versioner var: kon (steg 10.10.1), kälken (10.10.2), oxen, hästen och släden
// (10.10.3), vildsvinet (10.10.4), byggstenen, stenvägen och stenväggen (10.10.5–10.10.7), buren och grisen (10.10.13), vildboet
// (10.10.15), bikupan tom och med bin (10.10.16–10.10.17), bivaxet och skattningens symbol (10.10.20), bistickets tecken
// (10.10.22), vaxljuset (10.10.24), bisymbolen på fältet (10.10.25), det uppretade boets moln (10.10.27), djurens egenskaper
// (10.10.29) och vattenhon (10.10.30). Djuren från sidan på gräs som fåret och geten (9.8-djuren.js); stationerna och sakerna
// snett ovanifrån som kartans andra möbler.
(() => {
  const { KORT, former, ell, linje, tri, och, utan, punkt, rakt, poly, lagg, bredd, hash } = window.F7;
  const { L: LD, PAGRAS, sida, gras } = window.F98;
  const S = 'Steg ';
  // trä (jord), halm och vax (senap), sten (skiffer), vatten (skiffer ljust), kött och hud (rost), ben och snö (ben)
  const T = { a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3', y: 'senap0', h: 'senap1', H: 'senap2', g: 'senap3', k: 'skiffer0', K: 'skiffer1', l: 'skiffer2', m: 'skiffer3', r: 'rost0', R: 'rost1', q: 'rost2', Q: 'rost3', f: 'ben1', s: 'ben2', n: 'ben3', p: 'kol1', P: 'kol2', w: 'oliv1', W: 'oliv2', v: 'barr1' };
  const PA = (text, rader, legend = T, m = 4) => ({ text, w: bredd(rader) + 2 * m, h: rader.length + 2 * m, rita: B => lagg(B, rader, legend, m, m) });
  // flera bilder i rad, fötterna på samma rad
  const RAD = (text, delar, legend = T, m = 4, mellan = 4) => {
    const w = delar.reduce((s, r) => s + bredd(r), 0) + mellan * (delar.length - 1) + 2 * m, h = Math.max(...delar.map(r => r.length)) + 2 * m;
    return { text, w, h, rita: B => { let x = m; delar.forEach(r => { lagg(B, r, legend, x, h - m - r.length); x += bredd(r) + mellan; }); } };
  };
  const yta = (x0, y0, x1, y1, ljus, mork, mon, fram = 3) => [rakt(x0, y0, x1, y1), (x, y) => y >= y1 - fram ? mork : mon ? mon(x, y) : ljus];
  const djur = (text, rader, legend) => { const v = PAGRAS('', rader, legend); return { text, w: v.w, h: v.h, rita: v.rita }; };

  // ---------- kon (10.10.1): större än fåret, med juver och små horn ----------
  const KO = { W: 36, H: 23, ben: 6, kropp: 4.4, ruff: 3.8, huvud: 2.6, nos: 2.8, svans: 1.1, sank: 2.8, len: 10, xb: 6, ora: 'hang', svansLjus: true };
  const juver = p => [ell(p.xh + 3.2, p.bot + 0.3, 2.2, 1.3), 'u'];
  const ko = [
    sida({ ...KO, extra: p => [[och(ell(p.xh + 1, p.mitt - 1, 2.6, 2), ell(p.xb - 2.2, p.mitt + 1.2, 1.8, 1.4), ell(p.xh + 5, p.rygg + 1.2, 1.4, 1)), 'c'], juver(p), [linje([[p.hx - 0.4, p.hy - 2.2], [p.hx + 0.4, p.hy - 3.8]], 0.6, 0.4), 'c'], [ell(p.hx + 0.4, p.hy + 0.4, 0.8, 1.4), 'c']] }),
    sida({ ...KO, kropp: 4.6, extra: p => [[och(ell(p.xh - 0.5, p.mitt, 3.4, 3), ell(p.xb - 1, p.rygg + 1.8, 2, 1.6)), 'c'], juver(p), [linje([[p.hx - 0.6, p.hy - 2.2], [p.hx - 1.2, p.hy - 4]], 0.6, 0.4), 'c']] }),
    sida({ ...KO, ben: 5.5, huvud: 2.8, extra: p => [juver(p), [linje([[p.hx - 0.8, p.hy - 2], [p.hx - 2.2, p.hy - 4], [p.hx - 0.6, p.hy - 5.6]], 0.6, 0.4), 'c'], [linje([[p.hx + 0.4, p.hy - 2], [p.hx + 1.6, p.hy - 4.2], [p.hx + 0.6, p.hy - 5.6]], 0.6, 0.4), 'c']] }),
  ];
  // ---------- oxen och hästen (10.10.3) ----------
  const OXE = { W: 38, H: 24, ben: 6, kropp: 4.8, ruff: 4.4, huvud: 2.9, nos: 2.4, svans: 1.2, sank: 3, len: 11, xb: 6.5, ora: 'hang' };
  const oxe = [
    sida({ ...OXE, extra: p => [[linje([[p.hx - 0.4, p.hy - 2.4], [p.hx + 1.5, p.hy - 4.6], [p.hx + 3.6, p.hy - 4.2]], 0.9, 0.5), 'c'], [ell(p.xb - 1, p.rygg + 0.2, 2.4, 1.2), 'd']] }),
    sida({ ...OXE, kropp: 5, extra: p => [[linje([[p.hx - 0.4, p.hy - 2.4], [p.hx - 1.6, p.hy - 5], [p.hx + 0.4, p.hy - 7.4]], 0.9, 0.5), 'c']] }),
    sida({ ...OXE, ben: 6.6, huvud: 3.1, extra: p => [[linje([[p.hx - 0.6, p.hy - 2.2], [p.hx + 1, p.hy - 3.6]], 1.2, 0.7), 'c'], [ell(p.hx + 0.6, p.hy - 0.4, 1, 1.4), 'c']] }),
  ];
  const HAST = { W: 34, H: 27, ben: 8.5, kropp: 3.4, ruff: 2.4, huvud: 2.1, nos: 4.4, svans: 1.6, sank: -3.5, len: 9, xb: 6, oraH: 2.2, stromp: true };
  const man = (p, bred = 0.9) => [linje([[p.xb + 1.2, p.rygg - 0.2], [p.hx - 1.2, p.hy - 1.6]], bred, bred * 1.1), 'k'];
  const hast = [
    sida({ ...HAST, extra: p => [man(p), [linje([[p.xh - 3.4, p.rygg + 0.6], [p.xh - 5, p.rygg + 4], [p.xh - 5.2, p.bot + 3]], 1, 1.4), 'k']] }),
    sida({ ...HAST, kropp: 3.7, ben: 7.5, extra: p => [man(p, 1.3), [linje([[p.xh - 3.4, p.rygg + 0.6], [p.xh - 5.4, p.rygg + 3], [p.xh - 6, p.bot + 1.5]], 1.2, 1.6), 'k'], [ell(p.hx + 0.6, p.hy - 0.2, 0.6, 1.2), 'c']] }),
    sida({ ...HAST, nos: 4, huvud: 2.2, skimmel: true, extra: p => [man(p, 0.7), [linje([[p.xh - 3.4, p.rygg + 0.6], [p.xh - 4.6, p.rygg + 4.4], [p.xh - 4.4, p.bot + 4]], 0.8, 1.2), 'c']] }),
  ];
  // ---------- vildsvinet (10.10.4) och grisen (10.10.13) ----------
  const VS = { W: 30, H: 18, ben: 3.5, kropp: 4.2, ruff: 4.2, huvud: 2.8, nos: 4, svans: 0.7, sank: 2.6, len: 7, xb: 5, oraH: 1.8 };
  const bete = p => [tri([p.nx - 1.8, p.hy + 1.8], [p.nx - 0.8, p.hy - 0.2], [p.nx - 0.6, p.hy + 1.6]), 'c'];
  const vildsvin = [
    sida({ ...VS, extra: p => [[linje([[p.xh - 2.4, p.rygg + 0.2], [p.xb + 3, p.rygg - 0.8]], 1, 0.8), 'k'], bete(p)] }),
    sida({ ...VS, kropp: 4.6, ruff: 4.8, nos: 3.6, extra: p => [[linje([[p.xh - 1, p.rygg - 0.2], [p.xb + 3.4, p.rygg - 1.2]], 1.3, 1.1), 'k'], bete(p), [ell(p.nx - 0.4, p.hy + 1.2, 0.7, 0.9), 'k']] }),
    sida({ ...VS, ben: 4, kropp: 3.9, skimmel: true, extra: p => [[linje([[p.xh - 2.4, p.rygg + 0.2], [p.xb + 2.6, p.rygg - 0.6]], 0.8), 'k'], bete(p), [ell(p.hx + 1.4, p.hy + 1.2, 1.4, 0.9), 'c']] }),
  ];
  const GR = { W: 28, H: 17, ben: 3, kropp: 4.2, ruff: 4, huvud: 2.6, nos: 3, svans: 0.5, sank: 2.2, len: 7, xb: 5, oraH: 2 };
  const knorr = p => [linje([[p.xh - 3.6, p.rygg + 1.4], [p.xh - 5, p.rygg + 0.4], [p.xh - 5.4, p.rygg + 2], [p.xh - 4.4, p.rygg + 2.4]], 0.5), 'd'];
  const tryne = p => [ell(p.nx - 0.4, p.hy + 1.1, 0.8, 1.2), 'u'];
  const gris = [
    sida({ ...GR, extra: p => [knorr(p), tryne(p)] }),
    sida({ ...GR, ora: 'hang', extra: p => [[och(ell(p.xh + 1.5, p.mitt - 0.6, 2.4, 1.8), ell(p.xb - 1, p.rygg + 1.2, 1.4, 1)), 'k'], knorr(p), tryne(p)] }),
    sida({ ...GR, ben: 3.6, kropp: 3.9, nos: 3.4, skimmel: true, extra: p => [[linje([[p.xh - 2, p.rygg + 0.2], [p.xb + 2, p.rygg - 0.4]], 0.6), 'k'], knorr(p), tryne(p)] }),
  ];

  // ---------- kälken (10.10.2) och släden (10.10.3), snett ovanifrån, fören uppåt ----------
  const planka = (x, y) => (Math.floor(y) % 3 === 0 ? 'c' : 'd');
  const kalke = [
    // 1: tvärslåar på två medar som böjer upp i fören, dragrepet i en ögla framför
    former(14, 22, [[och(rakt(1, 5, 3, 21), rakt(11, 5, 13, 21), ell(2, 5, 1, 1.6), ell(12, 5, 1, 1.6)), 'b'], yta(3, 6, 11, 19, 'd', 'b', planka, 2), [linje([[3, 5], [7, 1], [11, 5]], 0.5), 'h']]),
    // 2: en bred och kort kälke med en hög ryggbåge bak, som en liten stol på medar
    former(22, 18, [[och(rakt(1, 6, 3, 17), rakt(19, 6, 21, 17)), 'a'], yta(3, 7, 19, 15, 'd', 'b', planka, 2), [linje([[3, 15], [3, 4], [11, 1], [19, 4], [19, 15]], 0.7), 'c'], [linje([[8, 7], [11, 3.5], [14, 7]], 0.4), 'h']]),
    // 3: en urholkad halv stock som en båt (en ackja), spetsig i fören
    former(14, 22, [[poly([[7, 1], [12.5, 7], [12.5, 20], [1.5, 20], [1.5, 7]]), (x, y) => (y > 18 ? 'a' : 'b')], [poly([[7, 4], [10.5, 8], [10.5, 17.5], [3.5, 17.5], [3.5, 8]]), (x, y) => (x < 5 ? 'b' : 'c')], [linje([[7, 2], [7, 0]], 0.5), 'h']]),
  ];
  const slade = [
    // 1: ett långt flak på två medar, och två skaklar framåt där djuret går
    former(42, 18, [[och(rakt(2, 2, 28, 4), rakt(2, 13, 28, 15)), 'a'], yta(3, 3, 27, 14, 'd', 'b', (x, y) => (Math.floor(x) % 4 === 0 ? 'c' : 'd'), 2), [och(linje([[27, 4], [41, 3]], 0.6), linje([[27, 13], [41, 14]], 0.6)), 'b'], [linje([[40, 3], [40, 14]], 0.4), 'c']]),
    // 2: en kort korgsläde med ett högt böjt ryggstöd bak och skaklar som går långt fram
    former(44, 26, [[poly([[2, 4], [10, 0], [12, 0], [12, 25], [10, 25], [2, 21]]), (x, y) => (x < 5 ? 'b' : 'c')], [rakt(12, 6, 26, 20), 'b'], yta(13, 7, 25, 19, 'd', 'b', null, 2), [och(linje([[25, 8], [43, 7]], 0.6), linje([[25, 18], [43, 19]], 0.6)), 'b']]),
    // 3: ett lastflak med fyra stolpar som håller lasset, och skaklar som möts i ett ok
    former(42, 18, [yta(3, 3, 27, 15, 'd', 'b', null, 2), [och(ell(4, 3, 1, 1), ell(26, 3, 1, 1), ell(4, 14, 1, 1), ell(26, 14, 1, 1)), 'a'], [och(linje([[27, 4], [38, 8]], 0.6), linje([[27, 14], [38, 10]], 0.6)), 'b'], [ell(39.5, 9, 1.6, 3), 'c']]),
  ];
  // ---------- buren (10.10.13): en fälla av grenar och rep i skogen ----------
  const galler = (s, f = 2) => (x, y) => (Math.floor(x) % s === 0 || Math.floor(y) % s === 0 ? 'b' : null);
  const bur = [
    // 1: en låda av korsade grenar med en fallucka framtill
    former(18, 16, [yta(1, 1, 17, 15, 'c', 'b', null, 5), [rakt(2, 2, 16, 10), galler(3)], [rakt(5, 10, 13, 15), (x, y) => (Math.floor(x) % 2 ? 'a' : 'b')], [linje([[9, 1], [9, -1]], 0.4), 'h']]),
    // 2: en uppochnervänd flätad korg som står på en pinne
    former(18, 16, [[ell(9, 7, 7.5, 6), (x, y) => ((Math.floor(x) + Math.floor(y)) % 3 === 0 ? 'b' : 'c')], [linje([[3, 13], [4, 15.5]], 0.5), 'a'], [linje([[14, 12], [14.5, 15.5]], 0.5), 'a'], [linje([[9, 13], [16, 15]], 0.3), 'h']]),
    // 3: en lång tunnel av grenar, öppen i ena änden
    former(26, 12, [[ell(13, 6, 12, 5), (x, y) => (Math.floor(x) % 3 === 0 ? 'b' : 'c')], [ell(23, 6, 2, 3.6), 'a'], [linje([[2, 2], [2, 10]], 0.6), 'b']]),
  ];

  // ---------- byggstenen (10.10.5): tung, huggen till vid berget ----------
  const byggsten = [
    // 1: ett rätt huggt block, toppen ovanifrån och framsidan mörkare
    former(18, 14, [[rakt(1, 1, 17, 8), (x, y) => (hash(Math.floor(x), Math.floor(y)) < 0.15 ? 'K' : 'l')], [rakt(1, 8, 17, 13), (x, y) => (hash(Math.floor(x), Math.floor(y), 3) < 0.2 ? 'k' : 'K')]]),
    // 2: en rundad sten där bara toppen är huggen platt
    former(16, 16, [[ell(8, 8.5, 7.5, 7), (x, y) => (y < 7 && Math.abs(x - 8) < 5 ? 'm' : x + y > 18 ? 'k' : 'K')], [rakt(4, 4, 12, 7), 'l']]),
    // 3: en lång häll, låg och bred
    former(22, 11, [[rakt(1, 1, 21, 7), (x, y) => (Math.floor(x + y * 2) % 7 === 0 ? 'K' : 'l')], [rakt(1, 7, 21, 10), 'K']]),
  ];
  // en bit väg, 2 × 2 rutor: stenar i ett mönster, jord i fogarna
  function vag(typ) {
    const W = 32, H = 32, g = [];
    for (let y = 0; y < H; y++) {
      let r = '';
      for (let x = 0; x < W; x++) {
        let c;
        if (typ === 0) { // oregelbundna hällar: närmaste av punkter i ett skakat rutnät
          const s = 8; let d1 = 1e9, d2 = 1e9, id = 0;
          for (let gy = Math.floor(y / s) - 1; gy <= Math.floor(y / s) + 1; gy++) for (let gx = Math.floor(x / s) - 1; gx <= Math.floor(x / s) + 1; gx++) {
            const px = gx * s + hash(gx, gy, 7) * s, py = gy * s + hash(gx, gy, 9) * s, d = (x - px) ** 2 + (y - py) ** 2;
            if (d < d1) { d2 = d1; d1 = d; id = gx * 31 + gy; } else if (d < d2) d2 = d;
          }
          c = Math.sqrt(d2) - Math.sqrt(d1) < 1.2 ? 'a' : ['K', 'l', 'm'][Math.floor(hash(id, 1) * 3)];
          if (c !== 'a' && Math.sqrt(d1) < 2.2 && hash(id, 2) < 0.5) c = 'm';
        } else if (typ === 1) { // huggna block i rader, förskjutna
          const rad = Math.floor(y / 6), xx = x + (rad % 2) * 5, blk = Math.floor(xx / 10);
          c = y % 6 === 5 || xx % 10 === 9 ? 'a' : y % 6 === 0 ? 'm' : ['K', 'l'][Math.floor(hash(blk, rad) * 2)];
        } else { // små runda kullerstenar tätt
          const s = 4, gx = Math.floor((x + (Math.floor(y / s) % 2) * 2) / s), gy = Math.floor(y / s), cx = gx * s + 2 - (Math.floor(y / s) % 2) * 2, cy = gy * s + 2;
          const d = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2;
          c = d > 3.4 ? (hash(gx, gy, 4) < 0.3 ? 'w' : 'a') : y + 0.5 < cy ? 'm' : ['K', 'l'][Math.floor(hash(gx, gy) * 2)];
        }
        r += c;
      }
      g.push(r);
    }
    return g;
  }
  const VAG = (text, typ) => ({ text, w: 40, h: 40, rita: B => { gras(B); lagg(B, vag(typ), T, 4, 4, false); } });
  // stenväggen: tre rutor vägg i rad, toppen ovanifrån och framsidan av staplad sten
  function vagg(typ) {
    const W = 48, H = 24, g = [];
    for (let y = 0; y < H; y++) {
      let r = '';
      for (let x = 0; x < W; x++) {
        let c;
        if (y < 6) c = typ === 2 && hash(x, y, 5) < 0.3 ? 'W' : (hash(x >> 1, y >> 1) < 0.3 ? 'm' : 'l');
        else if (typ === 0) { const rad = Math.floor((y - 6) / 4), xx = x + (rad % 2) * 4; c = (y - 6) % 4 === 3 || xx % 8 === 7 ? 'k' : (y - 6) % 4 === 0 ? 'l' : 'K'; }
        else { // fältsten: rundade stenar i olika storlek, lera eller mossa i fogarna
          const s = 6; let d1 = 1e9, d2 = 1e9, id = 0;
          for (let gy = Math.floor(y / s) - 1; gy <= Math.floor(y / s) + 1; gy++) for (let gx = Math.floor(x / s) - 1; gx <= Math.floor(x / s) + 1; gx++) {
            const px = gx * s + hash(gx, gy, 11) * s, py = gy * s + hash(gx, gy, 13) * s, d = (x - px) ** 2 + ((y - py) * 1.4) ** 2;
            if (d < d1) { d2 = d1; d1 = d; id = gx * 17 + gy; } else if (d < d2) d2 = d;
          }
          c = Math.sqrt(d2) - Math.sqrt(d1) < 1.3 ? (typ === 1 ? 'c' : 'w') : ['k', 'K', 'l'][Math.floor(hash(id, 3) * 3)];
        }
        r += c;
      }
      g.push(r);
    }
    return former(W, H, [[() => true, (x, y) => g[Math.floor(y)][Math.floor(x)]]]);
  }

  // ---------- bina ----------
  const bi = (x, y) => [[punkt(x, y), 'g'], [punkt(x + 1, y), 'p']];
  const svarm = (n, cx, cy, rx, ry, fro) => Array.from({ length: n }, (_, i) => bi(Math.round(cx + (hash(i, fro) - 0.5) * 2 * rx), Math.round(cy + (hash(i, fro + 1) - 0.5) * 2 * ry))).flat();
  const vildbo = [
    // 1: ett mörkt hål i stammen med bin som svärmar kring det
    former(20, 28, [[rakt(6, 0, 14, 28), (x, y) => (x < 8 ? 'a' : Math.floor(y) % 5 === 0 ? 'a' : 'b')], [ell(10, 11, 1.6, 2.4), 'p'], ...svarm(9, 10, 11, 7, 6, 1)]),
    // 2: en vaxkaka som hänger under en gren, med bin på
    former(22, 26, [[rakt(7, 0, 14, 26), (x, y) => (x < 9 ? 'a' : 'b')], [linje([[13, 6], [21, 3]], 1), 'b'], [ell(18, 10, 2.6, 4), (x, y) => (Math.floor(x + y) % 2 ? 'H' : 'g')], ...svarm(7, 18, 10, 4, 5, 3)]),
    // 3: en spricka i stammen där honungen rinner ut, och några bin
    former(20, 28, [[rakt(6, 0, 14, 28), (x, y) => (x < 8 ? 'a' : 'b')], [rakt(9, 7, 11, 16), 'p'], [linje([[10, 16], [10.5, 20]], 0.6), 'H'], ...svarm(6, 10, 11, 6, 7, 5)]),
  ];
  // bikupan: en halmkupa av hö på två grenar, tom och med bin vid flustret
  const kupa = (typ, binen) => {
    const lista = typ === 0
      ? [[rakt(1, 15, 19, 19), 'c'], [ell(10, 11, 8, 8), (x, y) => (Math.floor(y) % 3 === 0 ? 'h' : 'H')], [ell(10, 16.5, 1.6, 1), 'p']]
      : typ === 1
        ? [[rakt(1, 16, 19, 20), 'c'], [poly([[5, 3], [15, 3], [18, 17], [2, 17]]), (x, y) => (Math.floor(y) % 3 === 0 ? 'h' : 'H')], [poly([[3, 4], [10, -1], [17, 4]]), 'b'], [ell(10, 16, 1.6, 1), 'p']]
        : [[och(linje([[4, 16], [3, 22]], 0.6), linje([[16, 16], [17, 22]], 0.6), linje([[10, 17], [10, 22]], 0.6)), 'a'], [rakt(2, 14, 18, 17), 'c'], [ell(10, 9, 7, 7), (x, y) => (Math.floor(y + x / 4) % 3 === 0 ? 'h' : 'H')], [ell(10, 14.5, 1.4, 0.9), 'p']];
    return former(20, 23, [...lista, ...(binen ? svarm(6, 10, 15, 5, 3, typ + 9) : [])]);
  };
  const BIKUPA = (text, typ) => RAD(text, [kupa(typ, false), kupa(typ, true)]);
  const bivax = [
    former(14, 10, [[ell(7, 5, 6.5, 4), (x, y) => (y < 4 ? 'g' : 'H')], [ell(5, 3.5, 2, 1), 'n']]),
    former(14, 11, [[poly([[2, 2], [12, 1], [13, 8], [1, 10]]), (x, y) => (y < 4 ? 'g' : x > 10 ? 'h' : 'H')]]),
    former(10, 16, [[och(ell(5, 3, 4.5, 2), ell(5, 8, 4.5, 2), ell(5, 13, 4.5, 2)), (x, y) => (Math.floor(y) % 5 < 2 ? 'g' : 'H')], [och(rakt(0.5, 3, 9.5, 13)), (x, y) => (Math.floor(y) % 5 === 0 ? 'h' : 'H')]]),
  ];
  // skattningens symbol: en honungskaka och en kniv
  const vaxkaka = (cx, cy, r) => [ell(cx, cy, r, r * 0.8), (x, y) => ((Math.floor(x) + Math.floor(y) * 2) % 3 === 0 ? 'h' : 'g')];
  const skatta = [
    former(16, 16, [vaxkaka(6, 9, 5.5), [linje([[9, 1], [15, 9]], 0.7), 'm'], [linje([[13.5, 7], [15.5, 10]], 1.1), 'b']]),
    former(16, 16, [[rakt(1, 2, 15, 14), (x, y) => (Math.floor(x / 2 + y / 2) % 2 ? 'g' : 'H')], [tri([3, 14], [7, 14], [5, 16]), 'h']]),
    former(16, 16, [vaxkaka(8, 8, 6), [och(punkt(5, 6), punkt(9, 9), punkt(7, 11)), 'H'], [linje([[1, 15], [6, 10]], 0.6), 'm']]),
  ];
  // bistickets tecken: 16 punkter, på kroppen och i hälsofliken
  const bistick = [
    former(16, 16, [[ell(8, 9, 5, 4.4), (x, y) => (Math.hypot(x - 8, y - 9) < 2 ? 'R' : 'q')], [linje([[8, 9], [10, 4]], 0.4), 'p']]),
    former(16, 16, [[ell(5, 11, 3.6, 3.2), 'q'], [ell(11, 11, 3, 2.6), 'q'], [ell(8, 5, 3.6, 3.2), 'q'], [och(punkt(5, 11), punkt(11, 11), punkt(8, 5)), 'r']]),
    former(16, 16, [[utan(ell(8, 8, 6.5, 6.5), ell(8, 8, 4.6, 4.6)), 'R'], [ell(8, 8, 1.6, 1.6), 'r'], [linje([[8, 8], [13, 2]], 0.4), 'p']]),
  ];
  // vaxljuset, släckt och tänt (talgljuset är vitt och lågt; vaxet gult och längre)
  const ljus = (typ, tant) => {
    const flamma = tant ? [[ell(5, 2.6, 1.3, 2.4), (x, y) => (y > 3 ? 'n' : 'g')]] : [[linje([[5, 4.6], [5.4, 3.6]], 0.3), 'p']];
    const kropp = typ === 0 ? [[rakt(3, 5, 7, 17), (x, y) => (x < 4 ? 'H' : x > 6 ? 'h' : 'g')]]
      : typ === 1 ? [[rakt(4, 5, 6, 15), (x, y) => (x < 5 ? 'H' : 'g')], [och(rakt(6, 8, 7, 11), rakt(3, 11, 4, 13)), 'H'], [linje([[5, 15], [5, 18]], 0.5), 'k'], [linje([[2, 15.5], [8, 15.5]], 0.6), 'k']]
        : [[rakt(1.5, 9, 8.5, 17), (x, y) => (y < 10 ? 'n' : x < 3 ? 'H' : 'g')]];
    return former(10, 18, [...kropp, ...flamma, ...(typ === 1 ? [] : [[rakt(1, 16.5, 9, 18), 'c']])]);
  };
  const LJUS = (text, typ) => RAD(text, [ljus(typ, false), ljus(typ, true)]);
  // bisymbolen på fältrutan (16 punkter)
  const bisymbol = [
    former(16, 16, [[och(ell(5, 5, 3, 2.2), ell(11, 5, 3, 2.2)), 'n'], [ell(8, 9, 2.8, 4.4), (x, y) => (Math.floor(y) % 3 === 0 ? 'p' : 'g')], [ell(8, 4.2, 1.8, 1.4), 'p']]),
    former(16, 16, [[ell(6, 6, 3, 2.4), 'n'], [ell(8.5, 10, 5, 3), (x, y) => (Math.floor(x) % 3 === 0 ? 'p' : 'g')], [ell(13.5, 9, 1.6, 1.6), 'p'], [linje([[3, 10], [1, 11]], 0.4), 'p']]),
    former(16, 16, [[och(ell(8, 11, 1.8, 1.8), ell(5, 13, 1.8, 1.6), ell(11, 13, 1.8, 1.6), ell(8, 14.8, 1.6, 1.2)), 'Q'], [ell(8, 13, 1, 1), 'g'], [ell(8, 4.6, 3.4, 2), (x, y) => (Math.floor(x) % 2 ? 'p' : 'g')], [och(ell(6, 2.4, 1.6, 1.2), ell(10, 2.4, 1.6, 1.2)), 'n']]),
  ];
  // det uppretade boets moln: bin i en tät klunga kring boet, glesare utåt
  const moln = typ => former(36, 26, typ === 0
    ? svarm(40, 18, 13, 16, 11, 21)
    : typ === 1 ? [...svarm(26, 18, 13, 9, 7, 23), ...svarm(14, 18, 13, 16, 12, 25)]
      : [[ell(18, 13, 15, 11), (x, y) => (hash(Math.floor(x), Math.floor(y), 27) < 0.12 ? 'g' : hash(Math.floor(x), Math.floor(y), 29) < 0.08 ? 'p' : null)]], false);
  const MOLN = (text, typ) => ({ text, w: 44, h: 34, rita: B => { gras(B); lagg(B, vildbo[0], T, 12, 3); lagg(B, moln(typ), T, 4, 4, false); } });

  // ---------- djurens egenskaper (10.10.29): fem symboler på 16 punkter, i ordningen styrka, snabbhet, tålighet, mod, tamhet ----------
  const egenskaper = [
    [ // 1: oket, hoven med fartstreck, skölden, vildsvinshuvudet och handen med grimskaft
      former(16, 16, [[linje([[1, 6], [8, 3], [15, 6]], 1.4), 'b'], [och(linje([[4, 6], [4, 13]], 0.6), linje([[12, 6], [12, 13]], 0.6)), 'c']]),
      former(16, 16, [[poly([[6, 4], [12, 4], [14, 14], [4, 14]]), (x, y) => (y > 11 ? 'p' : 'b')], [och(rakt(0, 6, 3, 7), rakt(0, 9, 3, 10), rakt(1, 12, 4, 13)), 'n']]),
      former(16, 16, [[poly([[2, 2], [14, 2], [14, 8], [8, 15], [2, 8]]), (x, y) => (x < 8 ? 'K' : 'l')], [rakt(7, 3, 9, 13), 'H']]),
      former(16, 16, [[ell(8, 9, 6, 5), 'b'], [ell(8, 13, 3, 2), 'c'], [och(tri([4, 13], [5, 9], [6, 13]), tri([10, 13], [11, 9], [12, 13])), 'n'], [och(punkt(5, 7), punkt(10, 7)), 'p'], [och(tri([2, 6], [4, 1], [6, 5]), tri([10, 5], [12, 1], [14, 6])), 'a']]),
      former(16, 16, [[ell(7, 10, 5, 4.4), 'Q'], [och(rakt(3, 4, 5, 9), rakt(6, 3, 8, 8), rakt(9, 4, 11, 9)), 'Q'], [linje([[11, 10], [15, 2]], 0.6), 'h']]),
    ],
    [ // 2: en böjd arm, en springande tass, ett tjockt skinn, ett öga i en låga, ett djurhuvud som nosar på en hand
      former(16, 16, [[linje([[2, 15], [5, 9], [11, 7]], 1.8, 1.3), 'Q'], [ell(6.5, 8.4, 2.8, 2.1), (x, y) => (y < 8 ? 'n' : 'Q')], [ell(12.4, 5.4, 2, 2), 'q']]),
      former(16, 16, [[ell(9, 10, 3.5, 3), 'b'], [och(ell(5, 5, 1.4, 1.4), ell(9, 3.6, 1.4, 1.4), ell(13, 5, 1.4, 1.4)), 'b'], [och(rakt(0, 9, 3, 10), rakt(1, 12, 4, 13)), 'n']]),
      former(16, 16, [[poly([[3, 1], [13, 1], [15, 6], [13, 15], [3, 15], [1, 6]]), (x, y) => (Math.floor(x + y) % 4 === 0 ? 'c' : 'd')], [och(punkt(5, 5), punkt(10, 9), punkt(6, 12)), 'b']]),
      former(16, 16, [[poly([[8, 0], [14, 9], [11, 15], [5, 15], [2, 9]]), (x, y) => (y < 6 ? 'g' : 'R')], [ell(8, 10, 2.6, 1.8), 'n'], [ell(8, 10, 1, 1), 'p']]),
      former(16, 16, [[ell(5, 7, 4, 3.4), 'c'], [tri([7, 5], [12, 7], [7, 9]), 'c'], [ell(12, 12, 3.4, 2.6), 'Q'], [punkt(4, 6), 'p']]),
    ],
    [ // 3: siffror i form av staplar i fem färger, en enkel stapel per egenskap
      ...[['R', 12], ['g', 9], ['K', 11], ['r', 13], ['w', 7]].map(([c, n]) => former(16, 16, [[rakt(2, 2, 14, 14), 'n'], [rakt(4, 14 - n, 12, 14), c]])),
    ],
  ];
  const EG = (text, typ) => RAD(text, egenskaper[typ], T, 4, 3);

  // ---------- vattenhon (10.10.30): en ho huggen ur en stock, med vattnet i ----------
  const vatten = (x, y) => (Math.floor(x + y * 1.5) % 6 === 0 ? 'm' : 'l');
  const ho = [
    // 1: en urholkad stock med rundade ändar
    former(32, 14, [[ell(16, 7, 15.5, 6.5), (x, y) => (y > 10 ? 'a' : 'b')], [ell(16, 6, 12.5, 3.6), vatten], [och(ell(3, 7, 1.6, 4.6), ell(29, 7, 1.6, 4.6)), 'c']]),
    // 2: ett fyrkantigt tråg av plankor på två klossar
    former(32, 16, [yta(1, 1, 31, 13, 'd', 'b', null, 3), [rakt(3, 3, 29, 9), vatten], [och(rakt(4, 13, 7, 16), rakt(25, 13, 28, 16)), 'a']]),
    // 3: en halv stock på två stenar, kortare och djupare
    former(28, 15, [[och(ell(5, 12, 3, 2.6), ell(23, 12, 3, 2.6)), 'K'], [rakt(1, 2, 27, 12), (x, y) => (y > 9 ? 'b' : 'c')], [rakt(3, 3, 25, 8), vatten]]),
  ];

  // färgerna på djuren: d rygg, m sida, l buk, c ljust, k mörkt, u rosa
  const D = (d, m, l, c, k, u = 'rost3') => ({ d, m, l, c, k, u });
  VAL.push(
    KORT('f10_ko', 'Kon', S + '10.10.1: kon är ett betesdjur som köps av handlaren och ger mest mjölk och kött. Större än fåret och geten, med juver och små horn. Från sidan på gräs', [
      djur('Rödbrun med vita fläckar och en vit bläs.', ko[0], D('rost0', 'rost1', 'rost2', 'ben3', 'kol1')),
      djur('Svart och vit, med stora vita fält.', ko[1], D('kol1', 'kol2', 'skiffer1', 'ben3', 'kol0')),
      djur('Ljus fjällko i en enda färg, med lyrformade horn.', ko[2], D('ben1', 'ben2', 'ben3', 'ben3', 'kol1')),
    ]),
    KORT('f10_oxe', 'Oxen', S + '10.10.3: oxen är ett dragdjur som drar släden: billigare och starkare än hästen men långsammare. Större och tyngre än kon, utan juver. Från sidan på gräs', [
      djur('Brun med breda horn som böjer framåt och en puckel över bogen.', oxe[0], D('jord0', 'jord1', 'jord2', 'ben3', 'kol1')),
      djur('Nästan svart, med långa horn rakt upp.', oxe[1], D('kol1', 'kol2', 'jord0', 'ben2', 'kol0')),
      djur('Gråvit och högbent, med korta tjocka horn och en ljus mule.', oxe[2], D('skiffer2', 'skiffer3', 'ben2', 'ben3', 'kol1')),
    ]),
    KORT('f10_hast', 'Hästen', S + '10.10.3: hästen är ett dragdjur som drar släden, dyrare än oxen men snabbare. Högbent, med lång hals, man och svans. Från sidan på gräs', [
      djur('Brun med svart man och svans.', hast[0], D('jord1', 'jord2', 'jord3', 'kol1', 'kol1')),
      djur('Kraftig och mörk, med tjock man och en vit bläs.', hast[1], D('kol1', 'kol2', 'skiffer1', 'ben3', 'kol0')),
      djur('Ljus och spräcklig, med ljus svans och tunn man.', hast[2], D('senap2', 'senap3', 'ben2', 'ben3', 'jord1')),
    ]),
    KORT('f10_vildsvin', 'Vildsvinet', S + '10.10.4: vildsvinet lever i en flock om 3 till 6 i skogen och jagas. Lågt och tungt framtill, med borst längs ryggen och betar. Från sidan på gräs', [
      djur('Mörkt gråbrunt, med en rad borst och vita betar.', vildsvin[0], D('kol1', 'kol2', 'jord0', 'ben3', 'kol0')),
      djur('Rödbrunt och kraftigt framtill, med hög borstkam och svart tryne.', vildsvin[1], D('jord0', 'rost0', 'jord1', 'ben3', 'kol0')),
      djur('Grått och spräckligt, med ljus nos.', vildsvin[2], D('skiffer0', 'skiffer1', 'skiffer2', 'ben2', 'kol1')),
    ]),
    KORT('f10_gris', 'Grisen', S + '10.10.13: grisen är en kulting ur buren som växer upp i byn och går lös. Rund, med tryne och knorr på svansen. Från sidan på gräs', [
      djur('Rosa med knorr och spetsiga öron.', gris[0], D('rost2', 'rost3', 'ben3', 'ben3', 'kol1', 'rost1')),
      djur('Ljus med svarta fläckar och hängande öron.', gris[1], D('ben1', 'ben2', 'ben3', 'ben3', 'kol1', 'rost2')),
      djur('Rödbrun och borstig, högre på benen, som ett halvvilt svin.', gris[2], D('rost0', 'rost1', 'jord2', 'ben3', 'kol0', 'rost2')),
    ]),
    KORT('f10_kalke', 'Kälken', S + '10.10.2: kälken är ett redskap från snickarbänken som en människa drar efter sig, för det som är för tungt att bära. En ruta stor, snett ovanifrån med fören uppåt', [
      PA('Tvärslåar på två medar som böjer upp i fören, och dragrepet i en ögla', kalke[0]),
      PA('Ett flak med låga kanter, som en låda på medar', kalke[1]),
      PA('En urholkad halv stock som en båt, spetsig i fören', kalke[2]),
    ]),
    KORT('f10_slade', 'Släden', S + '10.10.3: släden är större än kälken och dras av oxen eller hästen mellan två skaklar. Den som kör går bredvid. Ungefär två och en halv ruta lång, snett ovanifrån med skaklarna åt höger', [
      PA('Ett långt flak på två medar och två raka skaklar', slade[0]),
      PA('Med en hög ryggbåge bak och kanter på sidorna', slade[1]),
      PA('Ett lastflak med fyra stolpar och skaklar som möts i ett ok', slade[2]),
    ]),
    KORT('f10_bur', 'Buren', S + '10.10.13: buren är en fälla från fångstbänken (4 grenar och 2 rep) som sätts ut i skogen och ibland fångar en kulting. En ruta stor', [
      PA('En låda av korsade grenar med en fallucka framtill', bur[0]),
      PA('En uppochnervänd flätad korg som står på en pinne', bur[1]),
      PA('En lång tunnel av grenar, öppen i ena änden', bur[2]),
    ]),
    KORT('f10_byggsten', 'Byggstenen', S + '10.10.5: byggstenen är en tung sten (40 vikt) som bryts och huggs till vid berget och körs hem på kälken eller släden. Snett ovanifrån, mindre än en ruta', [
      PA('Ett rätt huggt block med slät topp och mörkare framsida', byggsten[0]),
      PA('En rundad sten där bara toppen är huggen platt', byggsten[1]),
      PA('En lång, låg häll', byggsten[2]),
    ]),
    KORT('f10_stenvag', 'Stenlagd väg', S + '10.10.6: stenbron, en väg av byggstenar på gångstråken, en sten per ruta. Den ska inte likna stockvägen eller golvet. Här 2 × 2 rutor på gräs', [
      VAG('Oregelbundna flata hällar med jord i fogarna', 0),
      VAG('Huggna block i förskjutna rader', 1),
      VAG('Små runda kullerstenar tätt intill varandra, med lite gräs i fogarna', 2),
    ]),
    KORT('f10_stenvagg', 'Stenväggen', S + '10.10.7: en vägg av staplad sten, varmare än timmer och brinner inte. Väggen ses snett ovanifrån som timmerväggen: toppen och framsidan. Här tre rutor vägg i rad', [
      { text: 'Huggna block i jämna rader, förskjutna som tegel', w: 56, h: 32, rita: B => lagg(B, vagg(0), T, 4, 4) },
      { text: 'Rundade fältstenar med lera i fogarna', w: 56, h: 32, rita: B => lagg(B, vagg(1), T, 4, 4) },
      { text: 'Torrlagd fältsten med mossa i fogarna och på toppen', w: 56, h: 32, rita: B => lagg(B, vagg(2), T, 4, 4) },
    ]),
    KORT('f10_vildbo', 'Vildboet', S + '10.10.15: ett vildbo syns där vildbina är många och ett vuxet träd står, som bin kring stammen på sommaren och hösten. I spelet rör sig bina; här en stillbild av en bit av stammen', [
      PA('Ett mörkt hål i stammen med bin som svärmar kring det', vildbo[0]),
      PA('En vaxkaka som hänger under en gren, med bin på', vildbo[1]),
      PA('En spricka där honungen rinner ut, och några bin', vildbo[2]),
    ]),
    KORT('f10_bikupa', 'Bikupan', S + '10.10.16–10.10.17: halmkupan flätas av hö på två grenar och står i byns utkant. Till vänster tom, till höger med bin vid flustret (i spelet rör de sig). En ruta stor, snett ovanifrån', [
      BIKUPA('En rund kupa av halmrep på en bräda, med flustret nere framtill', 0),
      BIKUPA('En hög klockformad kupa med ett litet tak av näver', 1),
      BIKUPA('En kupa på en pall med tre ben', 2),
    ]),
    KORT('f10_bivax', 'Bivaxet', S + '10.10.20: bivaxet skärs ur kupan när honungen skattas, varannan kaka ger ett. Det blir ljus och byts. En liten sak', [
      PA('En rund kaka', bivax[0]),
      PA('Ett oregelbundet block', bivax[1]),
      PA('En trave tunna skivor', bivax[2]),
    ]),
    KORT('f10_skatta', 'Skattningens symbol', S + '10.10.20: symbolen för arbetet att skatta en kupa, över huvudet på den som skattar och i listan över arbeten. 16 punkter', [
      PA('En honungskaka och en kniv', skatta[0]),
      PA('En fyrkantig vaxkaka som droppar honung', skatta[1]),
      PA('En kaka med celler och en kniv som skär', skatta[2]),
    ]),
    KORT('f10_bistick', 'Bistickets tecken', S + '10.10.22: tecknet för bistick på kroppen och i hälsofliken, med antalet stick bredvid. 16 punkter', [
      PA('En röd svullnad med gaddet kvar', bistick[0]),
      PA('Tre små röda bulor', bistick[1]),
      PA('En röd ring kring sticket, med gaddet', bistick[2]),
    ]),
    KORT('f10_vaxljus', 'Vaxljuset', S + '10.10.24: vaxljuset görs av bivax med en veke av hö och brinner dubbelt så länge som talgljuset. Det står på bord och hyllor. Till vänster släckt, till höger tänt', [
      LJUS('Ett rakt gult ljus', 0),
      LJUS('Ett smalt doppat ljus med rinnande vax, på en spets av järn', 1),
      LJUS('Ett tjockt lågt ljus med ljus topp', 2),
    ]),
    KORT('f10_bisymbol', 'Bisymbolen på fältet', S + '10.10.25: symbolen på en fältruta som bina når och pollinerar. 16 punkter', [
      PA('Ett bi ovanifrån med vingarna utbredda', bisymbol[0]),
      PA('Ett bi från sidan, i flykt', bisymbol[1]),
      PA('Ett bi över en blomma', bisymbol[2]),
    ]),
    KORT('f10_biarg', 'Det uppretade boet', S + '10.10.27: ett uppretat bo sticker alla inom 3 rutor i 10 minuter. Bina ritas som ett moln kring boet, som rör sig i spelet. Här molnet kring ett vildbo', [
      MOLN('Ett jämnt moln av bin kring boet', 0),
      MOLN('En tät klunga närmast boet och glesare bin utåt', 1),
      MOLN('Ett glest moln av gula och mörka prickar', 2),
    ]),
    KORT('f10_tamhet', 'Symbolen Tamhet', S + '10.10.29: symbolen för hur tamt ett djur är, bland djurets egenskaper när man trycker på det. Styrka, snabbhet, tålighet och mod har redan sina symboler (musklen, tassen, skölden och svärdet), så bara tamheten ritas. 16 punkter', [
      EG('Oket, hoven med fartstreck, skölden, vildsvinshuvudet och handen med grimskaftet', 0),
      EG('En böjd arm, en springande tass, ett tjockt skinn, en låga och ett djur som nosar på en hand', 1),
      EG('En stapel per egenskap i var sin färg', 2),
    ]),
    KORT('f10_vattenho', 'Vattenhon', S + '10.10.30: vattenhon huggs ur en stock och står i hagen, med vattnet synligt i. Den rymmer 20 vatten. Två rutor lång, snett ovanifrån', [
      PA('En urholkad stock med rundade ändar', ho[0]),
      PA('Ett fyrkantigt tråg av plankor på två klossar', ho[1]),
      PA('En halv stock på två stenar, kortare och djupare', ho[2]),
    ]),
  );
  // den andra vinkeln av den valda kälken (version 1) och vattenhon (version 2), Björns svar 17-11: ”Måste finnas i två vinklar”
  // (bildstilens regel: det som kan vändas ritas åt båda håll). Kälken ligger med fören åt höger, hon står lodrätt.
  const kalkeLangs = former(22, 14, [[och(rakt(1, 1, 17, 3), rakt(1, 11, 17, 13), ell(17, 2, 1.6, 1), ell(17, 12, 1.6, 1)), 'b'], yta(2, 3, 16, 11, 'd', 'b', (x, y) => (Math.floor(x) % 3 === 0 ? 'c' : 'd'), 2), [linje([[17, 3], [21, 7], [17, 11]], 0.5), 'h']]);
  const hoLodrat = former(18, 34, [yta(1, 1, 17, 30, 'd', 'b', null, 3), [rakt(3, 3, 15, 26), vatten], [rakt(2, 30, 16, 34), 'a']]);
  VAL.push(
    { id: 'f10_kalke_vinklar', namn: 'Kälken åt båda håll', typ: 'janej', slag: [], vad: 'Kälken du valde (version 1) med fören uppåt, och samma kälke liggande med fören åt höger, så att den kan dras åt alla håll på kartan. Din kommentar: ”Måste finnas i två vinklar.” Byggs in i steg 11.14.1.',
      versioner: [RAD('Fören uppåt (din version 1) och fören åt höger.', [kalke[0], kalkeLangs])] },
    { id: 'f10_vattenho_vinklar', namn: 'Vattenhon åt båda håll', typ: 'janej', slag: [], vad: 'Vattenhon du valde (version 2), tråget av plankor på två klossar, liggande vågrätt och stående lodrätt. Din kommentar: ”Måste finnas i två riktningar.” Byggs in i steg 11.14.1.',
      versioner: [RAD('Vågrät (din version 2) och lodrät.', [ho[1], hoLodrat])] },
  );
})();
