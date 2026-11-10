// fas 9, system 9.8: de tama djuren på kartan (steg 9.8.1–9.8.4), tre versioner var: hunden, valpen, fåret, geten och hönsen. Från sidan, österut, stående på gräs; formerna som vargen i djur.js.
(() => {
  const { former, ell, linje, tri, och, punkt, lagg } = window.F7;
  const L = { o: 'kol0', k: 'kol1', K: 'kol2', N: 'kol3', a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3', e: 'senap0', f: 'senap1', g: 'senap2', h: 'senap3', r: 'rost0', s: 'rost1', t: 'rost2', u: 'rost3', y: 'oliv0', v: 'oliv1', w: 'oliv2', x: 'oliv3', A: 'barr0', B: 'barr1', C: 'barr2', D: 'barr3', P: 'skiffer0', Q: 'skiffer1', R: 'skiffer2', S: 'skiffer3', i: 'ben0', j: 'ben1', l: 'ben2', m: 'ben3' };
  const gras = B => { for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, B.P.i('oliv', (x * 7 + y * 3) % 5 === 0 ? 1 : 2)); };
  // en bild på gräs med marginal; skuggan läggs under sista raden
  const PAGRAS = (text, rader, legend = {}, m = 3) => { const w = Math.max(...rader.map(r => r.length)) + 2 * m, h = rader.length + 2 * m; return { text, w, h, rita: B => { gras(B); lagg(B, rader, { ...L, ...legend }, m, m); } }; };
  window.F98 = { L, gras, PAGRAS };

  // fyrbent djur från sidan; t ger måtten, pälsen i bokstäverna d (rygg), m (sida), l (buk), c (ljust), k (mörkt)
  function sida(t) {
    const W = t.W, H = t.H, fot = H - 1, ben = t.ben, bot = fot - ben, mitt = bot - t.kropp, rygg = mitt - t.kropp;
    const hx = W - 2 - t.nos - t.huvud, hy = rygg - 1 + t.sank, nx = hx + t.nos, xb = hx - (t.xb || 6), xh = xb - (t.len || 8);
    const brost = ell(xb, mitt + 0.4, 4.8, t.kropp + 0.4), hoft = ell(xh, mitt - 0.2, 4.2, t.kropp - 0.2);
    const midja = (x, y) => x > xh && x < xb && y > rygg + 0.3 && y < bot - 0.6 - Math.sin((x - xh) / (xb - xh) * Math.PI) * 1.4;
    const kropp = och(brost, hoft, midja);
    const hals = linje([[xb + 2, mitt], [hx - 1, hy + 0.8]], t.ruff, t.huvud);
    const huvud = ell(hx, hy, t.huvud + 0.4, t.huvud);
    const nos = och(tri([hx, hy - 0.9], [nx, hy + 0.9], [hx, hy + t.huvud * 0.9]), ell(nx - 0.6, hy + 1.1, 0.9, 0.7));
    const ora = t.ora === 'hang' ? tri([hx - 1.6, hy - t.huvud + 0.8], [hx + 0.6, hy - t.huvud + 0.6], [hx - 1.8, hy + 1.6])
      : tri([hx - 1.8, hy - t.huvud + 1], [hx + 1.2, hy - t.huvud + 1], [hx - 0.4, hy - t.huvud - (t.oraH || 3.2)]);
    const framBen = x => linje([[x, bot - 1], [x + 0.2, fot - 1.2], [x + 0.8, fot - 0.4]], 0.8, 0.65);
    const bakBen = x => linje([[x + 1.2, bot - 1.8], [x - 1.2, bot + ben * 0.55], [x - 0.6, fot - 1], [x + 0.2, fot - 0.4]], 1.4, 0.65);
    const svans = t.svansUpp ? linje([[xh - 3.2, rygg + 1.2], [xh - 4.4, rygg - 1.6], [xh - 3.4, rygg - 3.4]], 1, 1.6)
      : linje([[xh - 3.5, rygg + 1], [xh - 5.2, rygg + 3.4], [xh - 5.6, rygg + 6]], t.svans * 0.6, t.svans * 1.1);
    const ex = Math.floor(hx + 0.8), ey = Math.floor(hy - 0.3);
    const ton = (x, y) => { const u = (y - rygg) / (bot - rygg); return u < 0.3 ? 'd' : u < 0.72 ? 'm' : 'l'; };
    const lista = [
      [och(framBen(xb - 3), bakBen(xh - 2)), 'd'],
      [svans, t.svansLjus ? (x, y) => y > rygg + 4.6 ? 'c' : 'm' : 'd'],
      [kropp, t.skimmel ? (x, y) => (x * 3 + y * 5) % 7 === 0 ? 'l' : ton(x, y) : ton],
      [hals, (x, y) => y > mitt - 0.5 ? 'c' : y < rygg + 1 ? 'd' : 'm'],
      [och(framBen(xb), bakBen(xh + 1)), (x, y) => y > fot - 1.6 ? (t.stromp ? 'c' : 'l') : 'm'],
      [ora, t.ora === 'hang' ? 'd' : (x, y) => y < hy - t.huvud - 0.6 ? 'k' : 'm'],
      [huvud, (x, y) => y < hy - 0.6 ? 'm' : 'l'],
      [nos, (x, y) => x > nx - 1.4 && y < hy + 1.6 ? 'k' : y > hy + 0.8 ? 'c' : 'l'],
      [punkt(ex, ey), 'k'],
      ...(t.extra ? t.extra({ hx, hy, nx, rygg, mitt, bot, fot, xb, xh }) : []),
    ];
    return former(W, H, lista);
  }
  const HUND = { W: 33, H: 21, ben: 5.5, kropp: 3.2, ruff: 3.3, huvud: 2.7, nos: 4.2, svans: 1.9, sank: 0.4, len: 8 };
  const VALP = { W: 23, H: 14, ben: 3, kropp: 2.5, ruff: 2.6, huvud: 2.5, nos: 2.4, svans: 1.4, sank: 0.5, len: 5, xb: 4, oraH: 2.2 };
  const hund = [
    sida({ ...HUND }),
    sida({ ...HUND, ora: 'hang', svansUpp: true, nos: 3.6, stromp: true }),
    sida({ ...HUND, ben: 6.5, kropp: 2.8, huvud: 2.5, svans: 1.6, ruff: 3.8, len: 9, skimmel: true, extra: p => [[(x, y) => Math.floor(y) === Math.floor(p.mitt - 1) && x > p.xb + 1 && x < p.hx - 1.5, 'k']] }),
  ];
  const valp = [
    sida({ ...VALP }),
    sida({ ...VALP, ora: 'hang', nos: 2, huvud: 2.7, svansUpp: true }),
    sida({ ...VALP, ben: 3.5, kropp: 2.2, skimmel: true, stromp: true }),
  ];
  const GRA = { d: 'skiffer1', m: 'skiffer2', l: 'skiffer3', c: 'ben2', b: 'ben3' };
  const BRUN = { d: 'jord1', m: 'jord2', l: 'jord3', c: 'ben2', b: 'ben3' };
  const LJUS = { d: 'jord2', m: 'jord3', l: 'ben1', c: 'ben2', b: 'ben3' };
  const MORK = { d: 'kol1', m: 'skiffer0', l: 'skiffer1', c: 'ben1', b: 'ben2' };
  const SVART = { d: 'kol1', m: 'kol2', l: 'skiffer1', c: 'ben1' };
  const L2 = (p) => ({ ...p, a: 'senap3', b: 'ben3' });

  // fåret: ullen som en stor moln-kropp av ellipser, mörkt ansikte och smala ben
  function far(v) {
    const W = 26, H = 19, fot = H - 1, bot = fot - 4.5;
    const ull = och(ell(10, 8.5, 7.4, 5.6), ell(5.5, 9.4, 4, 4), ell(15, 8, 5.2, 5), ell(9, 6, 4, 3.4), ell(13.5, 5.6, 3.4, 3), ell(6.5, 6.8, 3, 2.8));
    const hx = 21.5, hy = 7.5;
    const ben = x => linje([[x, bot - 1], [x + 0.1, fot - 0.5]], 0.8, 0.7);
    const huvud = v === 1 ? och(ell(hx, hy, 2.4, 2.8), tri([hx + 1, hy - 1], [hx + 4.4, hy + 1.8], [hx, hy + 3.4])) : och(ell(hx, hy, 2.3, 2.6), tri([hx + 1, hy - 1], [hx + 4, hy + 1.4], [hx, hy + 3]));
    const hals = linje([[15, 9], [hx - 1, hy + 1]], 3, 2);
    const ora = tri([hx - 2.6, hy - 1], [hx - 0.4, hy - 1.4], [hx - 3.6, hy + 1.4]);
    const lista = [
      [och(ben(7), ben(17)), 'd'],
      [hals, 'k'],
      [ull, (x, y) => ((Math.floor(x) * 5 + Math.floor(y) * 3) % 7 === 0 ? (v === 2 ? 'b' : 'm') : y < 4.5 || (y < 7 && x > 9 && Math.floor(x / 3 + y / 3) % 2) ? 'm' : y > 11.5 ? (v === 2 ? 'b' : 'l') : 'l')],
      [och(ben(9.5), ben(19)), 'd'],
      [ora, v === 2 ? 'b' : 'k'],
      [huvud, (x, y) => y < hy - 1.6 ? 'l' : 'k'],
      [punkt(Math.floor(hx + 0.8), Math.floor(hy - 0.4)), 'c'],
      ...(v === 2 ? [[ell(hx - 0.6, hy - 2.6, 1.8, 1.1), 'l']] : []),
    ];
    return former(W, H, lista, true);
  }
  // geten: smal, med skägg under hakan, horn bakåt och en kort svans rakt upp
  function get(v) {
    const t = { W: 26, H: 20, ben: 7, kropp: 2.7, ruff: 2.5, huvud: 2.2, nos: 3.2, svans: 1.2, sank: 1.4, len: 7, xb: 5, svansUpp: true, ora: 'hang', skimmel: v === 2,
      extra: p => [
        // hornen: böjda bakåt från pannan
        [linje(v === 1 ? [[p.hx - 0.4, p.hy - 2], [p.hx - 1.2, p.hy - 5], [p.hx - 3.6, p.hy - 6.2]] : [[p.hx - 0.2, p.hy - 2], [p.hx - 0.6, p.hy - 4.4], [p.hx - 2.4, p.hy - 5.6]], 0.8, 0.5), v === 1 ? 'm' : 'c'],
        // skägget
        [tri([p.nx - 1.6, p.hy + 2], [p.nx - 0.4, p.hy + 2], [p.nx - 1.6, p.hy + (v === 2 ? 6 : 5)]), 'c'],
      ] };
    return sida(t);
  }
  const FAR = [far(0), far(1), far(2)], GET = [get(0), get(1), get(2)];

  // en höna från sidan: kropp, svans, huvud med kam, näbb och ben
  function hona(v) {
    const W = 11, H = 10;
    return former(W, H, [
      [linje([[4.4, 8], [4.4, 9.5]], 0.5), 'g'], [linje([[6.2, 8], [6.2, 9.5]], 0.5), 'g'],
      [tri([1, 3.5], [3.5, 4.5], [v === 1 ? 0.2 : 0.4, v === 1 ? 7 : 5.6]), (x, y) => v === 2 ? 'k' : v === 1 ? 'c' : 'm'],
      [ell(5.3, 6, 3.8, 2.8), (x, y) => v === 2 ? (y < 5.4 ? 'k' : 'd') : v === 1 ? (y < 5.4 ? 'l' : 'c') : (y < 5.4 ? 'd' : 'c')],
      [ell(7.6, 3.2, 1.5, 1.8), v === 2 ? 'k' : v === 1 ? 'l' : 'd'],
      [tri([8.4, 3.2], [10.6, 3.6], [8.6, 4.6]), 'h'],
      [och(punkt(7, 0), punkt(8, 0), punkt(7, 1)), 'r'],
      [punkt(8, 3), 'k'],
      [punkt(7, 5), 'r'],
    ]);
  }
  const HONA = [hona(0), hona(1), hona(2)];
  const HONSBG = (text, delar) => { const w = 28, h = 18; return { text, w, h, rita: B => { gras(B); for (const [r, x, y, lg] of delar) lagg(B, r, { ...L, ...lg }, x, y); } }; };
  const HK = { d: 'jord1', c: 'jord2', m: 'jord3', l: 'ben3', k: 'kol1', h: 'senap3', g: 'senap1', r: 'rost2' };
  const HV = { d: 'ben2', c: 'ben3', m: 'ben3', l: 'ben3', k: 'kol1', h: 'senap3', g: 'senap1', r: 'rost2' };
  const HM = { d: 'kol2', c: 'jord0', m: 'jord1', k: 'kol0', h: 'senap3', g: 'senap1', r: 'rost2' };

  VAL.push(
    { id: 'f9_hund', namn: 'Hunden', typ: 'tre', vad: 'Steg 9.8.3: hunden är en tämjd varg, fullvuxen: större än valpen, lik vargen men med mjukare drag. Bilden visar den från sidan, stående på gräs, i ungefär vargens storlek.', versioner: [
      { text: 'Grå som vargen men lättare byggd, med spetsiga öron och en hängande svans.', ...PAGRAS('', hund[0], GRA) },
      { text: 'Brun med hängande öron, kortare nos och svansen rest bakåt.', ...PAGRAS('', hund[1], BRUN) },
      { text: 'Ljus och spräcklig, högbent, med ett mörkt band över ryggen.', ...PAGRAS('', hund[2], LJUS) }].map(v => ({ text: v.text, w: v.w, h: v.h, rita: v.rita })) },
    { id: 'f9_valp', namn: 'Valpen', typ: 'tre', vad: 'Steg 9.8.2: valpen är en vargvalp som byn tagit hand om och som växer upp till hunden. Liten och rund, med stora tassar. Bilden visar den från sidan på gräs.', versioner: [
      { text: 'Grå, rund, med små spetsiga öron.', ...PAGRAS('', valp[0], GRA) },
      { text: 'Brun med hängande öron och rest svans.', ...PAGRAS('', valp[1], BRUN) },
      { text: 'Ljus, spräcklig och med ljusa tassar.', ...PAGRAS('', valp[2], LJUS) }].map(v => ({ text: v.text, w: v.w, h: v.h, rita: v.rita })) },
    { id: 'f9_far', namn: 'Får', typ: 'tre', vad: 'Steg 9.8.5: fåret är ett betesdjur som ger ull och kött. Bilden visar det från sidan på gräs: en ljus, tjock kropp av ull på smala ben och ett mörkt ansikte.', versioner: [
      { text: 'Vit ull med ljusgrå skuggor och ett mörkt ansikte.', ...PAGRAS('', FAR[0], { d: 'kol2', m: 'ben3', l: 'ben2', k: 'kol1', c: 'ben3' }) },
      { text: 'Gräddvit ull med skuggor i brunt och ett långt, brunt ansikte.', ...PAGRAS('', FAR[1], { d: 'jord0', m: 'ben3', l: 'ben1', k: 'jord1', c: 'ben3' }) },
      { text: 'Gråbrun ull med ljusa tovor och ett ljust ansikte med mörka öron.', ...PAGRAS('', FAR[2], { d: 'kol2', m: 'skiffer3', l: 'ben1', k: 'jord1', c: 'ben3', b: 'ben3' }) }].map(v => ({ text: v.text, w: v.w, h: v.h, rita: v.rita })) },
    { id: 'f9_get', namn: 'Get', typ: 'tre', vad: 'Steg 9.8.5: geten är ett betesdjur som ger mjölk och kött och äter det fåret lämnar. Bilden visar den från sidan på gräs: smal, med små horn, skägg och en kort svans rakt upp.', versioner: [
      { text: 'Vitgrå med små, korta horn och ett långt skägg.', ...PAGRAS('', GET[0], { d: 'ben1', m: 'ben2', l: 'ben3', c: 'ben3', k: 'kol1' }) },
      { text: 'Brun med stora, bakåtböjda horn.', ...PAGRAS('', GET[1], { d: 'jord1', m: 'jord2', l: 'jord3', c: 'ben2', k: 'kol1' }) },
      { text: 'Brokig, grå och vit, med ett långt, vitt skägg.', ...PAGRAS('', GET[2], { d: 'skiffer1', m: 'skiffer2', l: 'ben2', c: 'ben3', k: 'kol1' }) }].map(v => ({ text: v.text, w: v.w, h: v.h, rita: v.rita })) },
    { id: 'f9_hons', namn: 'Höns', typ: 'tre', vad: 'Steg 9.8.10: hönsen är en liten flock på två eller tre fåglar som går fritt vid byn och ger ägg. Bilden visar flocken på gräs.', versioner: [
      HONSBG('Tre bruna höns med röda kammar, en av dem med huvudet nere.', [[HONA[0], 3, 3, HK], [HONA[0], 15, 6, HK], [HONA[1], 9, 8, HV]]),
      HONSBG('Två vita höns, den ena stor och den andra liten.', [[HONA[1], 4, 5, HV], [HONA[1], 16, 7, HV]]),
      HONSBG('En mörk tupp och två bruna höns.', [[HONA[2], 2, 7, HM], [HONA[0], 11, 3, HK], [HONA[0], 17, 8, HK]])] },
  );
})();
