// ---------- karaktärsskaparen och granskningsläget (steg 5.2.2.1) ----------
// Porträttet (64 × 64) och kartfiguren (14 × 20) byggs av delarna i registret PORTRATT (portratt.json) i lager, med
// masker och färgbyte, så som Porträttens byggsätt säger. Inga delar är ritade än: varje del ritas här som en grå
// platshållare (enkla former) med färgnummer, så att lagren, maskerna och färgbytet går att pröva. När en del ritas på
// riktigt (5.2.2.3–5.2.2.7) får dess rad en bild och ett högre "ritad", och platshållaren används inte längre.
// Granskningsläget visar ett kort per del; Björns svar sparas i databasens samling 'val' som 'del-<id>'.
// Allt ligger i en funktion, så att namnen inte krockar med sida.js (som den läser: PAL, Bild, tillCanvas, markBild, hash, vn).
(() => {
  const PR = PORTRATT, P = PAL;
  const $ = s => document.querySelector(s);
  const SORT = Object.fromEntries(PR.sorter.map(s => [s.id, s]));
  const DEL = Object.fromEntries(PR.delar.map(d => [d.id, d]));
  const MALL = Object.fromEntries(PR.mallar.map(m => [m.id, m]));
  const HUMOR = Object.fromEntries(PR.humor.map(h => [h.id, h]));
  const ALDER = Object.fromEntries(PR.aldrar.map(a => [a.id, a]));
  const MATERIAL = Object.fromEntries(PR.material.map(m => [m.id, m]));
  const LAGEN = PR.lagen;
  const delarAv = sort => PR.delar.filter(d => d.sort === sort);
  // taggen kvinna, man eller båda (Porträttens byggsätt, beslut efter v281): en del passar en person när taggen är båda
  // eller personens kön, och för barn bara om delen finns på barn (barn: false på raden eller sorten)
  const konAv = d => d.kon || SORT[d.sort].kon || 'bada';
  const barnOk = d => d.barn ?? SORT[d.sort].barn ?? true;
  const passar = (d, mall, kon = mall === 'barn' ? null : mall) => (mall !== 'barn' || barnOk(d)) && (konAv(d) === 'bada' || !kon || konAv(d) === kon);
  const KONTEXT = { bada: 'för båda', kvinna: 'bara kvinnor', man: 'bara män' };
  // delens nummer i sin sort: talet i id:t (har-5 är nummer 5), så att ordningen i registret kan ändras
  const nr = d => { const m = /-(\d+)$/.exec(d.id); return m ? +m[1] - 1 : delarAv(d.sort).indexOf(d); };
  const mallAv = p => p.alder === 'barn' ? 'barn' : p.kon;
  const VALJ = ['huvudform', 'ora', 'nasa', 'oga', 'ogonbryn', 'mun', 'frisyr', 'skagg', 'huvudbonad', 'smycke', 'arr', 'blamarke', 'redskap'];
  const alternativ = (sort, mall, kon) => [...(SORT[sort].valfri ? [null] : []), ...delarAv(sort).filter(d => passar(d, mall, kon)).map(d => d.id)];
  const lagra = { las(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, skriv(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* utan lagring går det ändå */ } } };

  // ---------- personen ----------
  // en person i skaparen: mall (kön och ålder), en rad per sort, färgerna, humöret och läget
  function neutral(mall) {
    const n = PR.neutral;
    return {
      kon: mall === 'man' ? 'man' : 'kvinna', alder: mall === 'barn' ? 'barn' : 'ung',
      del: { huvudform: n.huvudform, ora: n.ora, nasa: n.nasa, oga: n.oga, ogonbryn: n.ogonbryn, mun: n.mun, frisyr: n.frisyr, skagg: null, huvudbonad: null, smycke: null, arr: null, blamarke: null, redskap: null },
      hud: n.hud, har: n.har, ogon: n.ogon, humor: n.humor, skonhet: 0, forband: [], ogonlapp: false, sjuk: false, kyla: false, blod: false,
      klader: { rock: null, skor: false, balte: false }, lagen: {}, lager: null, rynkor: null,
    };
  }
  // delarna som syns: en del som inte passar mallen byts mot den med samma nummer bland mallens, den gamla får sin äldre frisyr
  function effektiva(p) {
    const m = mallAv(p), d = {};
    for (const s of VALJ) {
      let id = p.del[s];
      if (id && !DEL[id]) id = null;
      if (id && !passar(DEL[id], m, p.kon)) { const alt = alternativ(s, m, p.kon).filter(Boolean); id = SORT[s].valfri ? null : alt[nr(DEL[id]) % alt.length] || null; }
      d[s] = id;
    }
    if (ALDER[p.alder].aldreFrisyr && d.frisyr && DEL[d.frisyr].aldre && passar(DEL[DEL[d.frisyr].aldre], m, p.kon)) d.frisyr = DEL[d.frisyr].aldre;
    if (m !== 'man') d.skagg = null;
    return d;
  }
  const skonLager = p => p.lager || delarAv('skonhet').filter(d => d.niva > 0 ? p.skonhet >= d.niva : p.skonhet <= d.niva).map(d => d.id);
  const rynkSteg = p => p.rynkor ?? (mallAv(p) === 'barn' ? 0 : ALDER[p.alder].rynkor);
  const lageAv = (p, sort) => p.lagen[sort] || HUMOR[p.humor][sort];

  // ---------- färgbytet ----------
  // en punkt är en kanal och en ton (hud2, har0, oga1, kind, vit, ett material som harskinn3) eller en fast färg (ben2)
  const KANALER = new Set(['hud', 'kind', 'har', 'oga', 'vit', ...PR.material.map(m => m.id)]);
  const ref = s => P.i(s.slice(0, -1), +s.slice(-1));
  function fargerFor(p, gratt) {
    const hud = PR.farger.hud[p.hud], har = ALDER[p.alder].grattHar && mallAv(p) !== 'barn' ? PR.farger.grattHar : PR.farger.har[p.har], oga = PR.farger.oga[p.ogon];
    const dod = HUMOR[p.humor].dod;
    const om = (i, k) => P.near([P.cols[i].lab[0] * k[0], P.cols[i].lab[1] * k[1], P.cols[i].lab[2] * k[2]]);
    const hudF = t => { const i = ref(hud.toner[t]); return dod ? om(i, [0.93, 0.2, 0.25]) : p.sjuk ? om(i, [1.03, 0.45, 0.5]) : i; };
    const cache = new Map();
    return kt => {
      if (cache.has(kt)) return cache.get(kt);
      const siffra = /\d$/.test(kt), k = siffra ? kt.slice(0, -1) : kt, t = siffra ? +kt.slice(-1) : 2;
      let i;
      if (gratt && KANALER.has(k)) i = ref(PR.farger.gratt[k === 'vit' ? 3 : k === 'oga' ? t + 1 : t]);
      else if (k === 'hud') i = hudF(t);
      else if (k === 'kind') i = p.kyla && !dod ? ref(t >= 2 ? hud.kyla : hud.kyla.slice(0, -1) + Math.max(0, +hud.kyla.slice(-1) - 1)) : hudF(t);
      else if (k === 'har') i = ref(har.toner[t]);
      else if (k === 'oga') i = ref(oga.toner[Math.min(t, 1)]);
      else if (k === 'vit') i = ref('ben2');
      else if (MATERIAL[k]) i = ref(MATERIAL[k].toner[t]);
      else i = ref(kt);
      cache.set(kt, i); return i;
    };
  }

  // ---------- att rita ----------
  function Duk(w, h) {
    const px = new Array(w * h).fill(null);
    return {
      w, h, px,
      satt(x, y, v) { x = Math.floor(x); y = Math.floor(y); if (v && x >= 0 && y >= 0 && x < w && y < h) px[y * w + x] = v; },
      get(x, y) { return x >= 0 && y >= 0 && x < w && y < h ? px[y * w + x] : null; },
    };
  }
  // matt skuggning (Björn efter 5.2.2.2: huvudena fick inte se glansiga ut). Formen räknas som en rundad kropp, och ljuset
  // kommer uppifrån vänster och lite framifrån, så att skuggan följer formen i stället för att ligga i raka band. Ljuset tar
  // nästan hela framsidan i grundtonen; den ljusaste tonen bara på det som vänder sig mot ljuset och den mörkaste bara längst
  // ut i skuggan. Gränserna mellan tonerna är korniga (bildstilens korn: ingen yta är slät), så att inget ser blankt ut
  const LJUSET = [-0.62, -0.42, 0.66];
  function ljushet(x, y, cx, cy, rx, ry) {
    const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, nz = Math.sqrt(Math.max(0, 1 - Math.min(1, u * u + v * v)));
    return LJUSET[0] * u + LJUSET[1] * v + LJUSET[2] * nz;
  }
  const NIVA = [-0.08, 0.4, 0.86]; // gränserna mellan ton 0–1, 1–2 och 2–3
  function ton(l, x, y) {
    const korn = (vn(x, y, 2.2, 21) - 0.5) * 0.2;
    const k = l + korn;
    return k < NIVA[0] ? 0 : k < NIVA[1] ? 1 : k < NIVA[2] ? 2 : 3;
  }
  // en form fylls med materialets fyra toner. mitt = [cx, cy, rx, ry] för skuggningen (annars formens ruta), forskj flyttar
  // alla toner ett steg, kontur ger formen en egen kant i ton 0 (konturen mot bakgrunden läggs annars på av porträttet)
  function fyll(d, inne, kanal, [x0, y0, x1, y1], { kontur = false, mitt = null, forskj = 0 } = {}) {
    const [cx, cy, rx, ry] = mitt || [(x0 + x1 + 1) / 2, (y0 + y1 + 1) / 2, Math.max(1, (x1 - x0 + 1) / 2), Math.max(1, (y1 - y0 + 1) / 2)];
    const ute = (x, y) => x >= 0 && y >= 0 && x < d.w && y < d.h && !inne(x, y);
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(d.h - 1, y1); y++) for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(d.w - 1, x1); x++) {
      if (!inne(x, y)) continue;
      const t = kontur && (ute(x - 1, y) || ute(x + 1, y) || ute(x, y - 1) || ute(x, y + 1)) ? 0 : ton(ljushet(x, y, cx, cy, rx, ry), x, y);
      d.satt(x, y, kanal + Math.max(0, Math.min(3, t + forskj)));
    }
  }
  const ellips = (cx, cy, rx, ry) => (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  function linje(d, x0, y0, x1, y1, v) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) { d.satt(x0, y0, v); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  const punkter = (d, lista, v) => lista.forEach(([x, y]) => d.satt(x, y, v));
  // punkter som ritades för det mindre huvudet i 5.2.2.1 (13 × 16 punkter) flyttas ut till mallarnas huvud (15 × 20)
  const S = (x, y) => [32 + (x - 32) * 15 / 13, 30 + (y - 30) * 1.25];

  // ---------- porträttet: geometrin ur mallen ----------
  const FORM = { smal: [0.86, 1.05, 1.7], bred: [1.05, 0.95, 3], rund: [1, 0.95, 2.2] };
  function geo(m, p) {
    const H = m.huvud, f = m.fast, sned = skonLager(p).includes('skon-sned');
    const flytt = (pt, k) => sned && k === 1 ? [pt[0], pt[1] + 1] : pt;
    const G = {
      m, H, ey: H.cy, topp: H.cy - H.ry, K: m.kropp, barn: m.id === 'barn', sned,
      oga: f.oga.map(flytt), bryn: f.ogonbryn.map(flytt), nasa: f.nasa, mun: f.mun, ora: f.ora, halsband: f.halsband[1],
      // huvudet: skallen ovanför ögonlinjen är lika i alla mallar och former; huvudformen ändrar käken och kinderna under den
      huvud(form) {
        const U = FORM[form] || FORM.rund;
        return (x, y) => {
          const u = (x + 0.5 - H.cx) / H.rx, v = (y + 0.5 - H.cy) / H.ry;
          if (v <= 0) return u * u + v * v <= 1;
          return (Math.abs(u) / (U[0] * H.under[0])) ** U[2] + (v / (U[1] * H.under[1])) ** 2 <= 1;
        };
      },
      hake(form) { const U = FORM[form] || FORM.rund; return Math.floor(H.cy + H.ry * U[1] * H.under[1] - 0.5); },
      skugga: [H.cx, H.cy, H.rx, H.ry],
      // zonerna som maskerna döljer, i mallens ordning: den första som träffar gäller
      zon(x, y) { for (const [id, ...rr] of m.zoner) for (const [a, b, c, e] of rr) if (x >= a && x <= c && y >= b && y <= e) return id; return null; },
    };
    return G;
  }
  // halsen och axlarna: halsen rak ner, axlarna sluttar ut från halsen och rundas mot armen
  const kroppInne = G => {
    const K = G.K;
    return (x, y) => {
      const dx = Math.abs(x + 0.5 - 32);
      if (y >= 36 && y < K.axel0 + 2 && dx <= K.hals) return true;
      if (y < K.axel0) return false;
      const t = Math.min(1, (y + 0.5 - K.axel0) / (K.axel1 - K.axel0));
      return dx <= K.hals + (K.bredd - K.hals) * (1 - (1 - t) ** 2.2);
    };
  };

  // ---------- porträttet: mallarna (ritade, steg 5.2.2.2) och de grå platshållarna för resten ----------
  const RITA = {
    // mallens kropp: halsen i skugga under hakan med en ljusare kant till vänster, axlarna och bröstet i ljuset uppifrån
    // vänster, halsgropen, nyckelbenen hos de vuxna och adamsäpplet hos mannen
    kropp(dk, G, hake) {
      const K = G.K, inne = kroppInne(G);
      fyll(dk, (x, y) => y >= K.axel0 && inne(x, y), 'hud', [0, K.axel0, 63, 63], { mitt: [32, K.axel0 + 8, K.bredd, 9] });
      for (let y = 36; y < K.axel0 + 3; y++) for (let x = 20; x < 44; x++) {
        const dx = x + 0.5 - 32; if (Math.abs(dx) > K.hals) continue;
        const t = y <= hake + 2 ? 0 : y >= K.axel0 ? 1 : dx < -K.hals + 1.6 ? 2 : dx > K.hals - 1.6 ? 0 : 1;
        dk.satt(x, y, 'hud' + t);
      }
      dk.satt(31, K.axel0 + 3, 'hud0'); dk.satt(32, K.axel0 + 3, 'hud0');
      if (K.nyckelben) for (let i = 0; i <= 9; i++) {
        const y = K.axel0 + 3 - Math.round(i * 0.22);
        dk.satt(29 - i, y, 'hud3'); dk.satt(29 - i, y + 1, 'hud1');
        dk.satt(34 + i, y, 'hud2'); dk.satt(34 + i, y + 1, 'hud0');
      }
      if (K.adamsapple) { dk.satt(31, hake + 3, 'hud3'); dk.satt(31, hake + 4, 'hud2'); dk.satt(32, hake + 4, 'hud0'); }
    },
    // skallen: överdelen av huvudet ner till ögonlinjen, densamma i alla mallar
    skalle(dk, G) { const inne = G.huvud('rund'); fyll(dk, (x, y) => y + 0.5 <= G.ey + 0.5 && inne(x, y), 'hud', [12, 6, 52, G.ey], { mitt: G.skugga }); },
    huvudform(dk, G, d) {
      const inne = G.huvud(d.form);
      fyll(dk, (x, y) => y > G.ey && inne(x, y), 'hud', [12, G.ey, 52, 58], { mitt: G.skugga });
      for (const [x, y] of [[22, 37], [23, 37], [22, 38], [23, 38], [40, 37], [41, 37], [40, 38], [41, 38]]) { const v = dk.get(x, y); if (v) dk.satt(x, y, 'kind' + v.slice(-1)); }
    },
    ora(dk, G, d) {
      const v = nr(d), [rx, ry] = [[2.4, 4.2], [2.9, 5], [3.8, 5.4]][v];
      G.ora.forEach(([ex, ey], s) => {
        const cx = ex + (v === 2 ? (s ? 1 : -1) : 0), inne = (x, y) => ellips(cx, ey, rx, ry)(x, y) && (s ? x + 0.5 >= 45 : x + 0.5 <= 19);
        fyll(dk, inne, 'hud', [cx - 5, ey - 6, cx + 5, ey + 6], { mitt: [cx, ey - 1, rx, ry], forskj: s ? -1 : 0 });
        linje(dk, cx + (s ? -0.6 : 0.4), ey - 2, cx + (s ? -0.6 : 0.4), ey + 1, 'hud0');
      });
    },
    nasa(dk, G, d) {
      const v = nr(d), barn = G.barn;
      const len = [6, 6, 6, 5, 8, 5, 7, 8, 5, 7][v] - (barn ? 2 : 0), b = Math.max(1, [2, 1, 3, 2, 2, 2, 2, 3, 3, 1][v] - (barn ? 1 : 0));
      const top = G.nasa[1], yb = top + len;
      linje(dk, 33, top + 1, 33 + (v === 6 ? 1 : 0), yb - 1, 'hud1');
      if (v === 6) { dk.satt(31, top + 3, 'hud3'); dk.satt(34, top + 3, 'hud1'); }
      dk.satt(31, yb - 1, 'hud3');
      for (let x = 32 - b; x <= 31 + b; x++) dk.satt(x, yb, 'hud1');
      dk.satt(32 - b - 1, yb, 'hud0'); dk.satt(32 + b, yb, 'hud0');
      if (v === 5) { dk.satt(32 - b, yb, 'hud0'); dk.satt(31 + b, yb, 'hud0'); }
      if (v === 7) { dk.satt(30, yb - 1, 'hud3'); dk.satt(34, yb - 1, 'hud1'); }
    },
    oga(dk, G, d, p) {
      const v = nr(d), lage = lageAv(p, 'oga');
      const w = [6, 6, 5, 7, 6, 6][v], h = [4, 3, 2, 4, 3, 3][v];
      G.oga.forEach(([ex, ey], s) => {
        const x0 = ex - Math.floor(w / 2), x1 = x0 + w - 1, yt = ey - Math.ceil(h / 2), yb = yt + h - 1;
        const yttre = s ? x1 : x0, lyft = v === 5 ? 1 : 0;
        if (v === 4) for (let x = x0; x <= x1; x++) dk.satt(x, yt - 1, 'hud1');
        if (lage === 'slutna') { for (let x = x0; x <= x1; x++) dk.satt(x, ey, 'hud0'); dk.satt(yttre, ey + 1, 'hud0'); return; }
        if (lage === 'glada') {
          for (let x = x0; x <= x1; x++) { const u = Math.abs(x + 0.5 - ex) / (w / 2); dk.satt(x, ey - (u < 0.7 ? 1 : 0), 'hud0'); }
          dk.satt(ex - 1, ey, 'oga1'); dk.satt(ex, ey, 'oga0'); return;
        }
        const ledsen = lage === 'ledsna';
        for (let y = yt + (ledsen ? 1 : 0); y <= yb; y++) for (let x = x0; x <= x1; x++) {
          const u = (x + 0.5 - ex) / (w / 2), vv = (y + 0.5 - (yt + yb + 1) / 2) / (h / 2 + 0.3);
          if (u * u + vv * vv <= 1.15) dk.satt(x, y, 'vit');
        }
        for (let y = yt + (ledsen ? 1 : 0); y <= yb; y++) { dk.satt(ex - 1, y, 'oga1'); dk.satt(ex, y, 'oga0'); }
        if (h >= 3) dk.satt(ex, Math.min(yb, ey), 'kol0');
        for (let x = x0; x <= x1; x++) {
          const yl = ledsen ? yt + ((s ? x1 - x : x - x0) < w / 2 ? 1 : 0) + (x === yttre ? 1 : 0) : yt - (x === yttre ? lyft : 0);
          dk.satt(x, yl, 'hud0');
        }
      });
    },
    ogonbryn(dk, G, d, p) {
      const v = nr(d), lage = lageAv(p, 'ogonbryn');
      const len = [7, 7, 8, 6, 8][v], tjock = [1, 1, 2, 1, 2][v], bage = [0, 1, 0, 0, 1][v];
      G.bryn.forEach(([bx, by], s) => {
        const x0 = bx - Math.floor(len / 2);
        for (let i = 0; i < len; i++) {
          const t = i / (len - 1), inre = s ? 1 - t : t, mitt = Math.abs(t - 0.5) < 0.3 ? 1 : 0;
          const dy = lage === 'arga' ? Math.round(2 * inre) : lage === 'ledsna' ? -Math.round(2 * inre) : lage === 'forvanade' ? -2 - mitt : 0;
          const y = by + dy - bage * mitt;
          dk.satt(x0 + i, y, tjock > 1 ? 'har2' : 'har1');
          if (tjock > 1) dk.satt(x0 + i, y + 1, 'har1');
          if (v === 4 && hash(x0 + i, y, 3) > 0.6) dk.satt(x0 + i, y - 1, 'har2');
        }
      });
    },
    mun(dk, G, d, p) {
      const v = nr(d), lage = lageAv(p, 'mun'), base = G.mun[1];
      const w = [8, 10, 8, 8, 6, 8][v] - (G.barn ? 2 : 0), tjock = [1, 1, 2, 0, 1, 1][v];
      const x0 = 32 - w / 2, x1 = 31 + w / 2;
      if (lage === 'oppen') {
        fyll(dk, ellips(32, base + 0.5, 2.6, 2), 'kol', [28, base - 2, 35, base + 2], { forskj: -1 });
        for (let x = 30; x <= 33; x++) dk.satt(x, base + 2, 'hud1');
        return;
      }
      const off = t => {
        const a = Math.abs(t);
        if (lage === 'glad') return a > 0.65 ? -1 : a < 0.35 ? 1 : 0;
        if (lage === 'nojd') return a > 0.7 ? -1 : 0;
        if (lage === 'ledsen' || lage === 'arg') return a > 0.65 ? 1 : 0;
        return 0;
      };
      for (let x = x0; x <= x1; x++) {
        const t = (x + 0.5 - 32) / (w / 2), y = base + off(t) + (v === 5 && t > 0.6 ? 1 : 0);
        dk.satt(x, y, lage === 'arg' ? 'kol0' : 'hud0');
        if (Math.abs(t) < 0.6) for (let k = 1; k <= tjock; k++) dk.satt(x, y + k, 'hud1');
      }
      if (lage === 'glad') for (let x = 30; x <= 33; x++) dk.satt(x, base, 'ben2');
    },
    bakhar(dk, G, d) {
      const v = nr(d) + 1, form = d.karta;
      if (form === 'halvlangt' || v === 23) fyll(dk, (x, y) => y >= 24 && y <= 52 && ellips(32, 36, 19.5, 19)(x, y), 'har', [11, 18, 53, 53], { forskj: -1 });
      if (form === 'langt' && v !== 19) fyll(dk, (x, y) => y >= 22 && Math.abs(x + 0.5 - 32) <= 19.5 - Math.max(0, 24 - y) * 0.5, 'har', [11, 22, 53, 63], { forskj: -1 });
      if (v === 19) fyll(dk, (x, y) => x >= 48 && x <= 52 && ellips(50, 42, 3, 15)(x, y), 'har', [46, 26, 54, 58]);
      if (v === 13) fyll(dk, (x, y) => x >= 47 && x <= 50 && y >= 40 && y <= 61, 'har', [47, 40, 50, 61]);
      if (v === 17) fyll(dk, ellips(32, 48, 15, 5), 'har', [16, 42, 48, 54], { forskj: -1 });
    },
    framhar(dk, G, d) {
      const v = nr(d) + 1, form = d.karta;
      if (form === 'flint') return;
      const lugg = [2, 7, 15].includes(v) ? 1 : [6, 10, 13].includes(v) ? 2 : [12, 17, 18, 19, 20, 22].includes(v) ? 3 : 0;
      const lockig = [4, 8, 11, 7].includes(v), tunt = v === 21, snagg = v === 3 || v === 22;
      const kort = form === 'kort' || form === 'knut' || form === 'flata';
      const harfaste = x => {
        const dx = Math.abs(x + 0.5 - 32);
        if (dx >= 13.5) return snagg ? 24 : kort ? 29 : 32;
        if (dx >= 10.5) return 23;
        if (lugg === 1) return 24;
        if (lugg === 3) return 18;
        if (lugg === 0) return Math.min(23, 19 + Math.max(0, x - 20) * 0.25);
        return 21;
      };
      const brus = (x, y) => lockig ? (vn(x, y, 2.5, 11) - 0.5) * 2.4 : 0;
      const kalufs = v === 23 ? 3 : 0;
      const kapa = (x, y) => y < harfaste(x) && ((x + 0.5 - 32) / (16.5 + brus(x, y) * 0.4)) ** 2 + ((y + 0.5 - 29.5 + (y < 18 ? kalufs : 0)) / (21.5 + brus(x, y) * 0.4 + (snagg ? -1.5 : 0))) ** 2 <= 1
        && !(v === 22 && Math.abs(x + 0.5 - 32) > 10) && !(tunt && hash(x, y, 5) < 0.42);
      fyll(dk, kapa, 'har', [13, 4, 51, 33], { mitt: [32, 22, 17, 14] });
      if (v === 22) for (let y = 19; y <= 30; y++) for (const x of [17, 18, 46, 47]) if (hash(x, y, 9) < 0.5) dk.satt(x, y, 'har1');
      if (lugg === 2) for (let y = 11; y <= 20; y++) dk.satt(31, y, 'har0');
      // sidorna: halvlångt till hakan, långt framöver bröstet
      if (form === 'halvlangt' || form === 'langt') {
        const slut = form === 'langt' ? (v === 19 ? 36 : 62) : 50;
        const sida = (x, y) => { const dx = Math.abs(x + 0.5 - 32) + brus(x, y) * 0.5; return y >= 19 && y <= slut - Math.max(0, dx - 15) && dx >= 12 && dx <= 18.5 - Math.max(0, y - slut + 3); };
        fyll(dk, sida, 'har', [12, 19, 52, slut], { mitt: [32, 30, 18, 24] });
      }
      // flätor: en lång rad små flätdelar med växlande toner
      const flata = (x0, y0, x1, y1) => { for (let i = 0; i <= 11; i++) { const t = i / 11, x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t); fyll(dk, ellips(x + 0.5, y + 0.5, 2.2, 1.7), 'har', [x - 3, y - 2, x + 3, y + 2]); } };
      if (v === 14) { flata(18, 34, 17, 62); flata(46, 34, 47, 62); }
      if (v === 15) flata(19, 34, 15, 62);
      if (v === 16) for (let x = 18; x <= 46; x += 3) fyll(dk, ellips(x + 0.5, 15.5 + Math.abs(x - 32) * 0.2, 2.2, 1.7), 'har', [x - 3, 11, x + 3, 22]);
      if (v === 18 || v === 20) fyll(dk, ellips(32, 9, 6.5, 4.5), 'har', [24, 3, 40, 14]);
      if (v === 20) for (let x = 26; x <= 38; x++) dk.satt(x, 13, x % 2 ? 'senap2' : 'senap1');
    },
    skagg(dk, G, d) {
      const v = nr(d) + 1, inne = G.huvud('rund'), hy = G.mun[1], hake = G.hake('rund');
      const kak = (x, y, tj) => inne(x, y) && y >= 35 && !inne(x + (x < 32 ? tj : -tj), y - tj);
      if ([1, 4, 5, 10].includes(v)) {
        const ned = v === 4 ? 62 : v === 5 ? 60 : 54, bred = v === 10 ? 1.5 : 0;
        const form = (x, y) => { const dx = Math.abs(x + 0.5 - 32); return (inne(x, y) && y >= 35 && (dx > 7 || y >= hy - 3)) || (y >= hake - 3 && y <= ned && dx <= 12 + bred - (y - hake + 3) * 0.45 + (v === 10 ? (hash(x, y, 4) - 0.5) * 2 : 0)); };
        fyll(dk, form, 'har', [14, 35, 50, ned], { mitt: [32, 44, 15, 12] });
        if (v === 5) for (let y = hake + 1; y <= 59; y++) dk.satt(y % 2 ? 31 : 32, y, 'har0');
      }
      if (v === 2 || v === 6 || v === 8) {
        const form = (x, y) => v === 2 ? kak(x, y, 3) : (y >= hy + 4 && y <= hy + 9 && Math.abs(x + 0.5 - 32) <= 4.5 - (y - hy - 4) * 0.6);
        fyll(dk, form, 'har', [14, 35, 50, 54]);
      }
      if (v === 7) for (let y = 35; y <= 52; y++) for (let x = 14; x <= 50; x++) if (kak(x, y, 3) && hash(x, y, 8) < 0.45) dk.satt(x, y, 'har1');
      if (v === 3 || v === 8) fyll(dk, (x, y) => y >= hy - 4 && y <= hy - 3 && Math.abs(x + 0.5 - 32) <= 6 - (y === hy - 3 ? 0 : 1), 'har', [25, hy - 4, 39, hy - 3]);
      if (v === 9) fyll(dk, (x, y) => y >= 24 && y <= 42 && Math.abs(x + 0.5 - 32) >= 11.5 && Math.abs(x + 0.5 - 32) <= 14.5 && inne(x, y), 'har', [16, 24, 48, 42]);
    },
    huvudbonad(dk, G, d) {
      const v = nr(d) + 1;
      if (v === 1) { fyll(dk, (x, y) => y <= 18 && ellips(32, 24, 17.5, 15.5)(x, y), 'skiffer', [13, 7, 51, 18]); fyll(dk, (x, y) => y >= 18 && y <= 22 && Math.abs(x + 0.5 - 32) <= 17.2, 'jord', [14, 18, 50, 22]); }
      if (v === 2) { fyll(dk, (x, y) => y <= 19 && ellips(32, 14, 11, 8)(x, y), 'jord', [20, 5, 44, 19]); fyll(dk, (x, y) => y >= 17 && y <= 23 && ellips(32, 20.5, 22, 2.8)(x, y), 'jord', [9, 17, 55, 23]); }
      if (v === 3 || v === 7) {
        const ram = v === 3 ? [21, 25, 12.5, 16.5] : [20, 23.5, 13, 17.5];
        fyll(dk, (x, y) => y <= 58 && ellips(32, 31, ram[0], ram[1])(x, y) && !(y >= 21 && ellips(32, 35, ram[2], ram[3])(x, y)), v === 3 ? 'jord' : 'oliv', [10, 5, 54, 58]);
      }
      if (v === 4) fyll(dk, (x, y) => y >= 19 && y <= 21 && ellips(32, 30, 16, 21)(x, y), 'rost', [15, 19, 49, 21]);
      if (v === 5) { fyll(dk, (x, y) => y >= 14 && y <= 15 && ellips(32, 29.5, 16.5, 21.5)(x, y), 'senap', [14, 14, 50, 15]); linje(dk, 48, 16, 50, 26, 'senap1'); linje(dk, 49, 16, 52, 24, 'senap2'); }
      if (v === 6) fyll(dk, (x, y) => (y <= 24 && ellips(32, 21, 19 + (hash(x, y, 6) - 0.5), 14)(x, y)) || (y >= 23 && y <= 38 && Math.abs(x + 0.5 - 32) >= 14.5 && Math.abs(x + 0.5 - 32) <= 19), 'ben', [12, 6, 52, 38]);
      if (v === 8) for (let x = 16; x <= 47; x++) { const y = 14 + Math.round(Math.abs(x + 0.5 - 32) * 0.17); dk.satt(x, y, 'oliv' + (x % 3 ? 1 : 2)); dk.satt(x, y + 1, 'oliv0'); if (x % 4 === 1) dk.satt(x, y - 1, 'senap3'); }
    },
    smycke(dk, G, d) {
      const v = nr(d) + 1;
      if (d.plats === 'hals') for (let x = 21; x <= 42; x++) {
        const y = G.halsband + Math.round(((x + 0.5 - 32) / 10) ** 2 * 3);
        if (v === 1) dk.satt(x, y, x % 2 ? 'ben3' : 'rost2');
        if (v === 2) { dk.satt(x, y, x % 3 ? 'jord0' : 'ben2'); if (x % 3 === 0) dk.satt(x, y + 1, 'ben1'); }
        if (v === 3) { dk.satt(x, y, 'jord1'); if (x % 3 === 1) { dk.satt(x, y + 1, 'ben3'); dk.satt(x, y + 2, 'ben2'); } }
      }
      if (v === 4) { punkter(dk, [[17, 27], [16, 30], [17, 33], [18, 36]], 'ben3'); punkter(dk, [[18, 29], [17, 32]], 'rost3'); }
      if (v === 5) for (const x of [17, 19]) linje(dk, x, 23, x - 1, 34, 'rost2');
      if (v === 6) { linje(dk, 38, 11, 47, 6, 'ben2'); linje(dk, 38, 12, 47, 7, 'ben1'); }
      if (v === 7) punkter(dk, [[15, 40], [15, 41], [15, 42]], 'ben2');
      if (v === 8) { dk.satt(15, 40, 'kol0'); dk.satt(15, 41, 'rost3'); dk.satt(15, 42, 'ben3'); }
    },
    rynkor(dk, G, steg) {
      [[22, 29, 20, 28], [22, 31, 20, 32], [41, 29, 43, 28], [41, 31, 43, 32]].forEach(([a, b, c, e]) => linje(dk, a, b, c, e, 'hud1'));
      for (let x = 26; x <= 37; x++) dk.satt(x, 21, 'hud1');
      if (steg > 1) {
        for (let x = 27; x <= 36; x++) dk.satt(x, 23, 'hud1');
        const nb = G.nasa[1] + 6, mb = G.mun[1];
        linje(dk, 28, nb, 26, mb, 'hud1'); linje(dk, 35, nb, 37, mb, 'hud1');
        for (let x = 23; x <= 28; x++) dk.satt(x, 33, 'hud1');
        for (let x = 35; x <= 40; x++) dk.satt(x, 33, 'hud1');
      }
    },
    arr(dk, G, d) {
      const L = [[[35, 23, 37, 27]], [[39, 34, 42, 38]], [[29, 32, 35, 34]], [[34, 39, 35, 44]], [[30, 45, 33, 45]], [[25, 18, 30, 20]], [[24, 25, 27, 34]], [[20, 38, 25, 43]], [[22, 34, 25, 37], [25, 34, 22, 37]], [[23, 26, 40, 40]]][nr(d)];
      L.forEach(([a, b, c, e]) => { const [x0, y0] = S(a, b), [x1, y1] = S(c, e); linje(dk, x0, y0 + 1, x1, y1 + 1, 'hud1'); linje(dk, x0, y0, x1, y1, 'hud3'); });
    },
    blamarke(dk, G, d) {
      const ring = nr(d) === 0 ? (x, y) => ellips(38, 30, 5.5, 4.5)(x, y) && !ellips(38, 30, 4, 3)(x, y) : ellips(...S(23, 37), 2.9, 2.5);
      for (let y = 22; y <= 46; y++) for (let x = 16; x <= 48; x++) if (ring(x, y)) dk.satt(x, y, hash(x, y, 2) < 0.5 ? 'skiffer1' : 'rost1');
    },
    blod(dk, G) {
      punkter(dk, [[24, 17], [24, 18], [23, 19], [23, 20], [23, 21], [23, 22]], 'rost1'); dk.satt(22, 23, 'rost0');
      const nb = G.nasa[1] + 7; dk.satt(31, nb, 'rost1'); dk.satt(31, nb + 1, 'rost0'); dk.satt(36, G.mun[1] + 1, 'rost1');
    },
    forband(dk, G, d) {
      const hake = G.hake('rund');
      if (d.id === 'forband-huvud') { fyll(dk, (x, y) => y >= 18 && y <= 21 && ellips(32, 30, 16.5, 21.5)(x, y), 'ben', [14, 18, 50, 21]); punkter(dk, [[26, 19], [27, 19]], 'rost1'); }
      if (d.id === 'forband-oga') fyll(dk, (x, y) => { const ax = 33, ay = 18, bx = 46, by = 40, t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2))); return Math.hypot(x - (ax + (bx - ax) * t), y - (ay + (by - ay) * t)) <= 2.3 && ellips(32, 31, 16.5, 21)(x, y); }, 'ben', [28, 14, 50, 44]);
      if (d.id === 'forband-kake') fyll(dk, (x, y) => { const dx = Math.abs(x + 0.5 - 32); return (dx >= 13.5 && dx <= 16.5 && y >= 14 && y <= hake - 2) || (y >= 8 && y <= 10 && dx <= 13) || (y >= hake - 1 && y <= hake + 2 && dx <= 12 - (y - hake + 1)); }, 'ben', [14, 7, 50, hake + 3]);
    },
    ogonlapp(dk) { linje(dk, 34, 28, 18, 21, 'jord0'); linje(dk, 42, 28, 47, 26, 'jord0'); fyll(dk, ellips(38, 30, 4.5, 3.5), 'kol', [33, 26, 44, 34], { forskj: -1 }); },
    klader(dk, G, p) {
      if (!p.klader.rock) return;
      const k = kroppInne(G), s0 = G.K.axel0;
      fyll(dk, (x, y) => y >= s0 - 1 && k(x, y) && !(y < s0 + 8 && Math.abs(x + 0.5 - 32) < 2 + (y - s0 + 1) * 0.6), p.klader.rock, [0, s0 - 1, 63, 63], { mitt: [32, s0 + 8, G.K.bredd, 9] });
    },
    redskap(dk, G, d, fram) {
      const lang = !!d.lang;
      if (lang !== !fram) return;
      if (lang) {
        linje(dk, 59, 63, 49, 3, 'jord2'); linje(dk, 60, 63, 50, 3, 'jord1');
        if (d.form === 'spjut') fyll(dk, (x, y) => y >= 0 && y <= 5 && Math.abs(x + 0.5 - 49.5 - y * 0.15) <= (y + 1) * 0.35, d.sak === 'flintspjut' ? 'skiffer' : 'jord', [47, 0, 52, 5]);
        if (d.form === 'spo') linje(dk, 49, 3, 43, 22, 'ben1');
        return;
      }
      if (d.form === 'yxa') { linje(dk, 51, 63, 56, 47, 'jord2'); linje(dk, 52, 63, 57, 47, 'jord1'); fyll(dk, (x, y) => x >= 53 && x <= 60 && y >= 42 && y <= 48, 'skiffer', [53, 42, 60, 48]); }
      if (d.form === 'kniv') { linje(dk, 53, 63, 55, 57, 'jord1'); linje(dk, 55, 56, 58, 49, 'skiffer3'); linje(dk, 56, 56, 59, 50, 'skiffer1'); }
      if (d.form === 'spade') { linje(dk, 51, 63, 55, 48, 'ben1'); fyll(dk, ellips(56.5, 44, 3, 4), 'ben', [53, 40, 60, 48]); }
      if (d.form === 'tra') for (let k = 0; k < 3; k++) linje(dk, 50 + k, 63, 56 + k, 44, 'jord' + (k + 1));
    },
    skonhet(dk, G, d, p) {
      if (d.id === 'skon-fransar') G.oga.forEach(([ex, ey], s) => { const x = s ? ex + 3 : ex - 4; dk.satt(x, ey - 2, 'kol0'); dk.satt(x + (s ? 1 : -1), ey - 3, 'kol0'); });
      if (d.id === 'skon-glans') punkter(dk, [[24, 13], [25, 12], [26, 12]], 'ben3');
      if (d.id === 'skon-lappar') { const b = G.mun[1]; for (let x = 30; x <= 33; x++) dk.satt(x, b + 2, 'hud1'); dk.satt(31, b + 1, 'rost3'); dk.satt(32, b + 1, 'rost3'); }
      if (d.id === 'skon-tander' && ['glad', 'oppen'].includes(lageAv(p, 'mun'))) { const b = G.mun[1]; dk.satt(31, b, 'kol0'); dk.satt(33, b + (lageAv(p, 'mun') === 'oppen' ? -1 : 0), 'kol0'); }
      if (d.id === 'skon-varta') { const [x, y] = S(39, 38).map(Math.round); dk.satt(x, y, 'jord1'); dk.satt(x + 1, y, 'jord0'); dk.satt(x, y - 1, 'jord2'); }
      if (d.id === 'skon-hud') punkter(dk, [[22, 34], [24, 38], [41, 33], [39, 37], [36, 22], [27, 21], [25, 40]].map(([x, y]) => S(x, y)), 'rost1');
    },
  };

  // ---------- ritade delar (bildstil/delar/<id>.json, steg 5.2.2.3) ----------
  // en ritad del har en bild per läge (standard när delen bara har ett), och en egen bild för barnmallen när den behövs
  // (barn) och för mannen (man: huvudformerna är lite fyrkantigare, Björn efter 5.2.2.3).
  // Bildens x och y räknas från fästpunkten; delar som finns i par (öron, ögon, ögonbryn) ritas för vänster sida på bilden,
  // och den högra är den speglade (kring ansiktets mitt), för öronen en ton mörkare
  const ritadBild = (id, mall, lage) => { const D = DELAR[id]; if (!D) return null; const b = (mall === 'barn' && D.barn) || (mall === 'man' && D.man) || D.bilder; return b[lage || 'standard'] || b.standard || Object.values(b)[0]; };
  const skifta = (v, n) => n ? v.slice(0, -1) + Math.max(0, Math.min(3, +v.slice(-1) + n)) : v;
  function ritaBild(dk, bild, [ax, ay], { spegel = false, forskj = 0, dy = 0 } = {}) {
    bild.rader.forEach((rad, j) => [...rad].forEach((ch, i) => {
      const v = PR.tecken[ch]; if (!v) return;
      let x = Math.floor(ax) + bild.x + i; const y = Math.floor(ay) + bild.y + j + dy;
      if (spegel) x = 63 - x;
      dk.satt(x, y, skifta(v, forskj));
    }));
  }
  // en sorts del: den ritade bilden om den finns, annars platshållaren
  function delen(dk, G, d, p, sort) {
    const R2 = SORT[sort].ritas, f = G.m.fast, mall = G.m.id;
    if (!DELAR[d.id] || !R2) return RITA[sort](dk, G, d, p);
    const lage = SORT[sort].lagen ? lageAv(p, sort) : null, bild = ritadBild(d.id, mall, lage);
    const fast = R2.fast === 'huvud' ? [G.H.cx, G.H.cy] : f[R2.fast];
    if (!R2.par) return ritaBild(dk, bild, fast);
    ritaBild(dk, bild, fast[0]);
    ritaBild(dk, bild, fast[0], { spegel: true, forskj: R2.par === 'spegel-mork' ? -1 : 0, dy: G.sned ? 1 : 0 });
  }

  // vilka delar som ritar i vilket lager, med maskbar (döljs av maskerna) och utom (zoner delen aldrig ritar i).
  // bara = 'mall' ritar bara mallen (skallen och kroppen) med den runda huvudformen
  function bidragen(p, del, G, opt = {}) {
    const B = {}, lagg = (L, rita, o = {}) => (B[L] = B[L] || []).push({ rita, ...o });
    const D = s => del[s] ? DEL[del[s]] : null;
    const hf = opt.bara ? DEL['huvud-rund'] : D('huvudform');
    lagg('kropp', dk => RITA.kropp(dk, G, G.hake(hf.form)));
    lagg('huvud', dk => RITA.skalle(dk, G));
    lagg('huvud', dk => delen(dk, G, hf, p, 'huvudform'));
    if (opt.bara) return B;
    lagg('klader', dk => RITA.klader(dk, G, p));
    lagg('oron', dk => delen(dk, G, D('ora'), p, 'ora'), { maskbar: true });
    const rs = rynkSteg(p); if (rs > 0) lagg('rynkor', dk => RITA.rynkor(dk, G, rs));
    if (D('arr')) lagg('arr', dk => RITA.arr(dk, G, D('arr')));
    if (D('blamarke')) lagg('blamarke', dk => RITA.blamarke(dk, G, D('blamarke')));
    if (p.blod) lagg('blod', dk => RITA.blod(dk, G));
    lagg('ogon', dk => delen(dk, G, D('oga'), p, 'oga'), { maskbar: true });
    lagg('ogonbryn', dk => delen(dk, G, D('ogonbryn'), p, 'ogonbryn'));
    lagg('nasa', dk => delen(dk, G, D('nasa'), p, 'nasa'));
    if (D('skagg')) lagg('skagg', dk => RITA.skagg(dk, G, D('skagg')), { utom: SORT.skagg.utom });
    lagg('mun', dk => delen(dk, G, D('mun'), p, 'mun'));
    const fr = D('frisyr');
    if (fr) { lagg('bakhar', dk => RITA.bakhar(dk, G, fr), { maskbar: true }); lagg('framhar', dk => RITA.framhar(dk, G, fr), { maskbar: true }); }
    for (const id of skonLager(p)) {
      const d = DEL[id]; if (!d.lager || (id === 'skon-glans' && (!fr || fr.karta === 'flint'))) continue;
      lagg(d.lager, dk => RITA.skonhet(dk, G, d, p), { maskbar: !!d.maskbar });
    }
    if (D('smycke')) lagg('smycke', dk => RITA.smycke(dk, G, D('smycke')), { maskbar: !!D('smycke').maskbar });
    if (D('huvudbonad')) lagg('huvudbonad', dk => RITA.huvudbonad(dk, G, D('huvudbonad')));
    for (const id of p.forband) if (DEL[id]) lagg('forband', dk => RITA.forband(dk, G, DEL[id]));
    if (p.ogonlapp) lagg('ogonlapp', dk => RITA.ogonlapp(dk));
    if (D('redskap')) { lagg('redskapBak', dk => RITA.redskap(dk, G, D('redskap'), false)); lagg('redskapFram', dk => RITA.redskap(dk, G, D('redskap'), true)); }
    return B;
  }

  // porträttstilen (5.2.1) som regler för hela bilden: konturen mot bakgrunden i kolets mörkaste ton, en mörkare kant där
  // två lager med olika ljushet möts, varmt sken från elden på vänsterkanten, bakgrunden i kolets ramp och en rostig järnram
  const LUM = P.cols.map(c => 0.3 * c.rgb[0] + 0.59 * c.rgb[1] + 0.11 * c.rgb[2]);
  const MORK = P.cols.map(c => P.av(blanda(c.hex, SVART, 0.4)));
  const GLOD = P.cols.map(c => P.av(blanda(c.hex, '#f0a050', 0.3)));
  const ZONFARG = { oron: 'rost2', 'oga-v': 'skiffer3', 'oga-h': 'skiffer3', mun: 'rost3', skalle: 'senap2', lugg: 'oliv2', sidor: 'barr3' };
  function portratt(p, opt = {}) {
    const m = MALL[mallAv(p)], G = geo(m, p), del = effektiva(p), W = 64;
    const kt = new Array(W * W).fill(null), ag = new Array(W * W).fill(null);
    const masker = new Set();
    if (!opt.bara) for (const id of [del.huvudbonad, p.ogonlapp ? 'ogonlapp' : null, ...p.forband]) if (id && DEL[id]?.maskar) DEL[id].maskar.forEach(z => masker.add(z));
    const B = bidragen(p, del, G, opt);
    for (const L of PR.lager) for (const b of B[L] || []) {
      const dk = Duk(W, W); b.rita(dk);
      for (let i = 0; i < dk.px.length; i++) {
        const v = dk.px[i]; if (!v) continue;
        const z = (b.maskbar || b.utom) ? G.zon(i % W, (i / W) | 0) : null;
        if (z && b.maskbar && masker.has(z)) continue;
        if (z && b.utom && b.utom.includes(z)) continue;
        kt[i] = v; ag[i] = L;
      }
    }
    const F = fargerFor(p, opt.gratt), ut = Bild(W, W, P), idx = new Int16Array(W * W).fill(-1);
    for (let i = 0; i < kt.length; i++) if (kt[i]) idx[i] = F(kt[i]);
    const fig = i => i >= 0 && idx[i] >= 0;
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!fig(i)) {
        const kant = (x > 0 && fig(i - 1)) || (x < W - 1 && fig(i + 1)) || (y > 0 && fig(i - W)) || (y < W - 1 && fig(i + W));
        const r = Math.hypot(x - W * 0.3, y - W * 0.45) / W;
        ut.px[i] = P.i('kol', kant ? 0 : r < 0.4 ? 2 : r < 0.66 ? 1 : 0);
        continue;
      }
      let v = idx[i];
      const skiljer = j => fig(j) && ag[j] !== ag[i] && Math.abs(LUM[idx[j]] - LUM[v]) > 55;
      if ((x < W - 1 && skiljer(i + 1)) || (y < W - 1 && skiljer(i + W))) v = MORK[v];
      else if (x > 0 && !fig(i - 1)) v = GLOD[v];
      ut.px[i] = v;
    }
    if (opt.zoner) {
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const z = G.zon(x, y); if (z && (x + y) % 2 === 0) ut.px[y * W + x] = ref(ZONFARG[z]); }
      const f = m.fast, pts = [...f.oga, ...f.ogonbryn, f.nasa, f.mun, ...f.ora, f.har, f.skagg, f.halsband, f.redskap];
      for (const [px, py] of pts) { const x = Math.round(px - 0.5), y = Math.round(py); for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) ut.satt(x + dx, y + dy, dx || dy ? P.i('ben', 3) : P.i('kol', 0)); }
    }
    // rostig järnram med nitar
    for (let k = 0; k < W; k++) for (const [x, y] of [[k, 0], [k, 1], [k, W - 2], [k, W - 1], [0, k], [1, k], [W - 2, k], [W - 1, k]]) ut.satt(x, y, P.i('jord', 0));
    for (const [a, b] of [[0, 0], [W - 2, 0], [0, W - 2], [W - 2, W - 2]]) for (let k = 0; k < 4; k++) ut.satt(a + (k & 1), b + (k >> 1), P.i('rost', 1));
    return ut;
  }

  // ---------- kartfiguren (14 × 20): mallarna ritade i steg 5.2.2.2 ----------
  // kroppen delas i zoner (huvud, bål, armar, händer, ben, fötter); kläderna målar sina zoner, och bara det som sticker ut
  // (håret, huvudbonaden, rocken nedanför bålen, redskapet) ritas för sig. Varje zon får ljus till vänster och skugga till
  // höger, och konturen runt figuren är kolets mörkaste ton. Kvinnan har smalare axlar och bredare höfter, mannen bredare
  // axlar, barnet kortare kropp och ben. Västerut är österut speglad, och den som ligger är den stående figuren framifrån
  // vriden ett kvarts varv. Sju armlägen (beslut, Björn efter 5.2.2.1)
  function kartFigur(p, riktIn, ben, arm, opt = {}) {
    const spegel = riktIn === 'vast', rikt = spegel ? 'sida' : riktIn;
    const m = MALL[mallAv(p)], K = m.karta, del = effektiva(p), kvinna = m.id === 'kvinna', barn = m.id === 'barn';
    const W = 14, H = 20, kt = new Array(W * H).fill(null), zn = new Array(W * H).fill(null);
    const satt = (x, y, v, z = null) => { if (x < 0 || y < 0 || x >= W || y >= H) return; kt[y * W + x] = v; zn[y * W + x] = z; };
    const sitt = ben === 'sitta' ? 2 : 0;
    const h = K.huvud + sitt, b0 = K.bal[0] + sitt, b1 = K.bal[1] + sitt, l0 = K.ben[0], l1 = K.ben[1];
    const [x0, x1] = K.bredd, [aL, aR] = K.armar;
    const rock = p.klader.rock, farg = z => (rock && (z === 'bal' || z === 'armar')) ? rock : (z === 'fotter' && p.klader.skor ? 'harskinn' : 'hud');
    const zon = (lista, z) => lista.forEach(([x, y, hand]) => satt(x, y, hand ? 'hud' : farg(z), hand ? 'hand' : z));
    let hand = null;
    // benen och fötterna
    const benL = [], fot = [];
    if (rikt !== 'sida') {
      if (ben === 'sitta') {
        for (let y = l0 + sitt; y <= Math.min(l0 + sitt + 1, 18); y++) for (let x = x0 - 1; x <= x1 + 1; x++) benL.push([x, y]);
        for (let y = l0 + sitt + 2; y <= 18; y++) for (const x of [x0 - 1, x0, x1, x1 + 1]) benL.push([x, y]);
        for (const x of [x0 - 1, x0, x1, x1 + 1]) fot.push([x, 19]);
      } else {
        const lyft = s => (ben === 'gang1' && s === 0) || (ben === 'gang2' && s === 1) ? 1 : 0;
        const par = barn ? [[x0, x0 + 1], [x1 - 1, x1]] : [[x0, x0 + 1], [x1 - 1, x1]];
        par.forEach((xs, s) => { for (let y = l0; y <= l1 - lyft(s); y++) xs.forEach(x => benL.push([x, y])); xs.forEach(x => fot.push([x, l1 + 1 - lyft(s)])); fot.push([s ? xs[1] + 1 : xs[0] - 1, l1 + 1 - lyft(s)]); });
        for (let y = l0; y <= l0 + 1; y++) for (let x = x0 + 2; x <= x1 - 2; x++) benL.push([x, y]);
      }
    } else if (ben === 'sitta') {
      for (let y = l0 + sitt; y <= l0 + sitt + 1 && y <= 18; y++) for (let x = 6; x <= 10; x++) benL.push([x, y]);
      for (let y = l0 + sitt + 2; y <= 18; y++) benL.push([9, y], [10, y]);
      fot.push([9, 19], [10, 19], [11, 19]);
    } else if (ben === 'sta') {
      for (let y = l0; y <= l1; y++) benL.push([6, y], [7, y]);
      fot.push([6, l1 + 1], [7, l1 + 1], [8, l1 + 1]);
    } else {
      for (let y = l0; y <= l1; y++) { const t = (y - l0) / Math.max(1, l1 - l0), o = Math.round(t * 2); benL.push([7 + o, y], [6 - o, y]); }
      fot.push([9, l1 + 1], [10, l1 + 1], [3, l1 + 1], [4, l1 + 1]);
    }
    zon(benL, 'ben'); zon(fot, 'fotter');
    // armen som syns bakom kroppen från sidan
    if (rikt === 'sida' && (arm === 'gang1' || arm === 'gang2')) zon(arm === 'gang1' ? [[5, b0 + 1], [4, b0 + 2], [4, b0 + 3, 1]] : [[8, b0 + 1], [9, b0 + 2], [9, b0 + 3, 1]], 'armar');
    // bålen: mannens axlar en punkt bredare, kvinnans höfter en punkt bredare
    const bal = [];
    if (rikt === 'sida') { for (let y = b0; y <= b1; y++) for (let x = barn ? 6 : 5; x <= 8; x++) bal.push([x, y]); if (kvinna) bal.push([4, b1], [4, b1 - 1]); }
    else {
      for (let y = b0; y <= b1; y++) for (let x = x0; x <= x1; x++) bal.push([x, y]);
      if (K.axlar) for (let y = b0; y <= b0 + 1; y++) bal.push([x0 - 1, y], [x1 + 1, y]);
      if (kvinna) for (let y = b1 - 1; y <= b1; y++) bal.push([x0 - 1, y], [x1 + 1, y]);
    }
    zon(bal, 'bal');
    if (rock && DEL['plagg-rock'].lang) zon(rikt === 'sida' ? [5, 6, 7, 8, 9].flatMap(x => [[x, l0], [x, l0 + 1]]) : [...Array(x1 - x0 + 3)].flatMap((_, i) => [[x0 - 1 + i, l0], [x0 - 1 + i, l0 + 1], ...(ben === 'sitta' ? [] : [[x0 - 1 + i, l0 + 2]])]).filter(([, y]) => y <= 18), 'bal');
    // armarna: kvinnans händer når höfterna
    const kort = kvinna ? 1 : 0;
    const armLista = (x, s) => {
      const in1 = s ? -1 : 1, ut = [];
      const rak = (n = 0) => { for (let y = b0; y <= b1 - n - kort; y++) ut.push([x, y]); ut.push([x, b1 + 1 - n - kort, 1]); };
      if (s === 1 && arm === 'lyfta') { for (let y = b0; y >= h; y--) ut.push([x, y]); ut.push([x, h - 1, 1]); }
      else if (s === 1 && arm === 'sla') ut.push([x, b0], [x, b0 + 1], [x + 1, b0 + 2], [x + 1, b0 + 3], [x + 2, b0 + 4, 1]);
      else if (arm === 'bara') ut.push([x, b0], [x, b0 + 1], [x, b0 + 2], [x + in1, b0 + 3, 1]);
      else if (arm === 'framfor') ut.push([x, b0], [x, b0 + 1], [x, b0 + 2], [x + in1, b0 + 3], [x + 2 * in1, b0 + 3, 1]);
      else if ((arm === 'gang1' && s === 0) || (arm === 'gang2' && s === 1)) rak(1);
      else rak();
      return ut;
    };
    if (rikt === 'sida') {
      const A = {
        hanga: [...[...Array(b1 - b0 + 1 - kort)].map((_, i) => [7, b0 + i]), [7, b1 + 1 - kort, 1]],
        gang1: [[7, b0], [7, b0 + 1], [8, b0 + 2], [8, b0 + 3], [9, b0 + 4, 1]],
        gang2: [[6, b0], [6, b0 + 1], [5, b0 + 2], [5, b0 + 3], [4, b0 + 4, 1]],
        bara: [[7, b0], [7, b0 + 1], [8, b0 + 2], [9, b0 + 2], [10, b0 + 2, 1]],
        lyfta: [[7, b0], ...[...Array(b0 - h + 1)].map((_, i) => [8, b0 - 1 - i]), [8, h - 1, 1]],
        sla: [[7, b0], [8, b0 + 1], [9, b0 + 2], [10, b0 + 3], [11, b0 + 4, 1]],
        framfor: [[7, b0], [7, b0 + 1], [7, b0 + 2], [8, b0 + 3], [9, b0 + 3, 1]],
      }[arm] || [];
      zon(A, 'armar'); hand = A[A.length - 1];
    } else {
      zon(armLista(aL, 0), 'armar');
      const R = armLista(aR, 1); zon(R, 'armar'); hand = R[R.length - 1];
    }
    if (p.klader.balte) (rikt === 'sida' ? [5, 6, 7, 8] : [...Array(x1 - x0 + 1)].map((_, i) => x0 + i)).forEach(x => { if (zn[(b1 - 1) * W + x] === 'bal') satt(x, b1 - 1, 'rep', 'balte'); });
    // huvudet: skallen ur mallen, käken efter huvudformen, ögonen som en punkt var
    const kak = (DEL[del.huvudform] || DEL['huvud-rund']).kartbild[rikt === 'sida' ? 'sida' : 'fram'];
    for (let y = h; y <= h + 5; y++) for (let x = 4; x <= 9; x++) {
      const xx = rikt === 'sida' ? x + 1 : x;
      if (y === h && (x === 4 || x === 9)) continue;
      if (y >= h + 4 && kak[y - h - 4][x - 4] !== 'X') continue;
      satt(xx, y, 'hud', 'huvud');
    }
    if (rikt === 'sida') satt(11, h + 3, 'hud', 'huvud');
    // tonerna: ljus till vänster i varje zon, skugga till höger
    for (let i = 0; i < kt.length; i++) {
      if (!kt[i] || /\d$/.test(kt[i])) continue;
      const x = i % W, z = zn[i], same = j => j >= 0 && j < kt.length && zn[j] === z && kt[j];
      kt[i] = kt[i] + (x > 0 && !same(i - 1) ? 3 : x < W - 1 && !same(i + 1) ? 1 : 2);
    }
    const slutna = opt.slutna || ['sover', 'dod'].includes(p.humor);
    if (rikt !== 'bak') for (const [ox, oy] of SORT.oga.kartbild[rikt]) satt((rikt === 'sida' ? 5 : 4) + ox, h + oy, slutna ? 'hud1' : 'oga0');
    if (opt.bara) return kartUt(p, kt, W, H, spegel, opt);
    // skägget
    const sk = del.skagg ? DEL[del.skagg].karta : null;
    if (sk && rikt === 'fram') {
      if (sk === 'helskagg') { for (let x = 4; x <= 9; x++) { satt(x, h + 4, 'har2'); if (x > 4 && x < 9) satt(x, h + 5, 'har1'); } satt(6, h + 6, 'har1'); satt(7, h + 6, 'har1'); }
      if (sk === 'kort') for (let x = 5; x <= 8; x++) satt(x, h + 5, 'har1');
      if (sk === 'mustasch') { satt(6, h + 4, 'har1'); satt(7, h + 4, 'har1'); }
    }
    if (sk && rikt === 'sida') {
      if (sk === 'helskagg') { for (let x = 8; x <= 10; x++) { satt(x, h + 4, 'har2'); satt(x, h + 5, 'har1'); } satt(9, h + 6, 'har1'); }
      if (sk === 'kort') for (let x = 8; x <= 10; x++) satt(x, h + 5, 'har1');
      if (sk === 'mustasch') satt(10, h + 4, 'har1');
    }
    // håret efter frisyrens kartform
    const hf = del.frisyr ? DEL[del.frisyr].karta : 'flint';
    const bonad = del.huvudbonad ? DEL[del.huvudbonad].karta : null;
    const H2 = (x, y) => satt(x, y, y === h - 1 || y === h ? 'har3' : 'har2');
    if (hf !== 'flint') {
      if (rikt === 'fram') {
        for (let x = 4; x <= 9; x++) H2(x, h); satt(4, h + 1, 'har2'); satt(9, h + 1, 'har1');
        if (hf === 'halvlangt' || hf === 'langt') for (let y = h + 1; y <= h + (hf === 'langt' ? 9 : 5); y++) { satt(3, y, 'har2'); satt(10, y, 'har1'); }
        if (hf === 'flata') for (let y = h + 2; y <= h + 9; y++) satt(3, y, y % 2 ? 'har1' : 'har2');
        if (hf === 'knut') for (let x = 5; x <= 8; x++) H2(x, h - 1);
      } else if (rikt === 'bak') {
        const ned = hf === 'langt' ? h + 9 : hf === 'halvlangt' ? h + 6 : h + 4;
        for (let y = h; y <= ned; y++) for (let x = 4; x <= 9; x++) satt(x, y, x === 9 ? 'har1' : y === h ? 'har3' : 'har2');
        if (hf === 'flata') for (let y = h + 5; y <= h + 11; y++) { satt(6, y, 'har2'); satt(7, y, 'har1'); }
        if (hf === 'knut') for (let x = 5; x <= 8; x++) { satt(x, h + 3, 'har1'); satt(x, h + 4, 'har1'); }
      } else {
        for (let x = 5; x <= 10; x++) H2(x, h);
        for (let y = h + 1; y <= h + 3; y++) { satt(5, y, 'har2'); satt(6, y, 'har2'); }
        if (hf === 'halvlangt' || hf === 'langt') for (let y = h + 1; y <= h + (hf === 'langt' ? 9 : 5); y++) { satt(4, y, 'har2'); satt(5, y, 'har2'); satt(6, y, y > h + 3 ? 'har1' : 'har2'); }
        if (hf === 'flata') for (let y = h + 3; y <= h + 10; y++) satt(4, y, y % 2 ? 'har1' : 'har2');
        if (hf === 'knut') { satt(4, h + 1, 'har2'); satt(4, h + 2, 'har1'); satt(3, h + 1, 'har1'); }
      }
    }
    if (bonad) {
      const mat = { 'bonad-1': 'skiffer', 'bonad-2': 'jord', 'bonad-3': 'jord', 'bonad-4': 'rost', 'bonad-5': 'senap', 'bonad-6': 'ben', 'bonad-7': 'oliv', 'bonad-8': 'oliv' }[del.huvudbonad];
      const s = rikt === 'sida' ? 1 : 0, xa = 4 + s, xb = 9 + s;
      if (bonad === 'mossa') for (let y = h - 1; y <= h + 1; y++) for (let x = xa - (y === h + 1 ? 1 : 0); x <= xb + (y === h + 1 && !s ? 1 : 0); x++) satt(x, y, mat + (y === h - 1 ? 3 : 2));
      if (bonad === 'hatt') { for (let x = xa - 2; x <= xb + 2; x++) satt(x, h + 1, mat + 1); for (let y = h - 1; y <= h; y++) for (let x = xa; x <= xb; x++) satt(x, y, mat + 2); }
      if (bonad === 'huva') for (let y = h - 1; y <= h + 6; y++) for (let x = xa - 1; x <= xb + 1; x++) {
        const ansikte = rikt === 'fram' ? x >= 5 && x <= 8 && y >= h + 2 && y <= h + 5 : rikt === 'sida' ? x >= 8 && y >= h + 2 && y <= h + 5 : false;
        if (!ansikte && !(rikt === 'sida' && x > 10)) satt(x, y, mat + (x === xa - 1 ? 3 : 2));
      }
      if (bonad === 'band') for (let x = xa; x <= xb; x++) satt(x, h + 1, mat + 2);
    }
    for (const id of p.forband) {
      const k = DEL[id]?.karta;
      if (k === 'huvud') for (let x = rikt === 'sida' ? 5 : 4; x <= (rikt === 'sida' ? 10 : 9); x++) satt(x, h + 1, 'ben3');
      if (k === 'oga' && rikt !== 'bak') punkter({ satt }, rikt === 'sida' ? [[9, h + 2], [8, h + 1]] : [[8, h + 2], [7, h + 1], [9, h + 3]], 'ben3');
      if (k === 'kake') punkter({ satt }, rikt === 'sida' ? [[8, h + 5], [9, h + 5], [10, h + 5]] : [[4, h + 4], [9, h + 4], [5, h + 5], [6, h + 5], [7, h + 5], [8, h + 5]], 'ben3');
    }
    if (p.ogonlapp && rikt !== 'bak') { if (rikt === 'fram') { satt(8, h + 2, 'kol0'); satt(7, h + 1, 'jord0'); } else satt(9, h + 2, 'kol0'); }
    if (arm === 'bara') for (let y = b0 + 1; y <= b0 + 3; y++) for (let x = rikt === 'sida' ? 9 : x0; x <= (rikt === 'sida' ? 12 : x1); x++) satt(x, y, 'jord' + (y === b0 + 1 ? 3 : 2));
    if (del.redskap && hand) {
      const d = DEL[del.redskap], [hx, hy] = hand;
      if (d.lang) { for (let y = hy - 7; y <= hy + 4; y++) satt(hx, y, 'jord2'); satt(hx, hy - 8, d.sak === 'flintspjut' ? 'skiffer3' : 'jord3'); }
      else {
        for (let k = 1; k <= 3; k++) satt(hx, hy - k, d.form === 'kniv' && k > 1 ? 'skiffer3' : 'jord2');
        if (d.form === 'yxa') { satt(hx + 1, hy - 3, 'skiffer2'); satt(hx + 1, hy - 2, 'skiffer1'); }
        if (d.form === 'spade') { satt(hx, hy - 4, 'ben2'); satt(hx + 1, hy - 4, 'ben1'); }
      }
    }
    return kartUt(p, kt, W, H, spegel, opt);
  }
  // speglingen, den liggande figuren och täcket, konturen och färgerna
  function kartUt(p, kt, W, H, spegel, opt) {
    let ut = { w: W, h: H, kt };
    if (spegel) ut.kt = kt.map((_, i) => kt[((i / W) | 0) * W + (W - 1 - (i % W))]);
    if (opt.ligga) {
      const n = new Array(W * H).fill(null);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) n[x * H + (H - 1 - y)] = ut.kt[y * W + x];
      ut = { w: H, h: W, kt: n };
      if (opt.tacke) for (let y = 1; y <= 12; y++) for (let x = 0; x <= 13; x++) ut.kt[y * H + x] = 'ben' + (y === 1 || x === 13 ? 3 : y === 12 ? 1 : 2);
    }
    const kont = ut.kt.slice();
    for (let y = 0; y < ut.h; y++) for (let x = 0; x < ut.w; x++) {
      if (ut.kt[y * ut.w + x]) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < ut.w && Y < ut.h && ut.kt[Y * ut.w + X]; })) kont[y * ut.w + x] = 'kol0';
    }
    const F = fargerFor(p, opt.gratt), B = Bild(ut.w, ut.h, P);
    for (let i = 0; i < kont.length; i++) if (kont[i]) B.px[i] = F(kont[i]);
    return B;
  }
  // figuren på gräset, med två punkters marginal
  function kartBild(p, rikt, ben, arm, opt = {}) {
    const F = kartFigur(p, rikt, ben, arm, opt), M = markBild(F.w + 4, F.h + 4, P, 420, 400);
    for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) { const v = F.px[y * F.w + x]; if (v >= 0) M.satt(x + 2, y + 2, v); }
    return M;
  }
  const duk = (B, skala, etikett) => { const c = document.createElement('canvas'); tillCanvas(B, c, skala); c.setAttribute('aria-label', etikett); c.setAttribute('role', 'img'); return c; };
  // kartfiguren i alla riktningar och lägen, som en tabell (skaparen och mallarnas kort)
  const LAGESKOLUMNER = [
    ['Står', 'sta', 'hanga'], ['Gångsteg 1', 'gang1', 'gang1'], ['Gångsteg 2', 'gang2', 'gang2'], ['Sitter', 'sitta', 'hanga'],
    ['Bär', 'sta', 'bara'], ['Lyfter', 'sta', 'lyfta'], ['Slår', 'sta', 'sla'], ['Framför kroppen', 'sitta', 'framfor'],
  ];
  function lagesTabell(q, opt = {}) {
    const tab = document.createElement('div'); tab.className = 'sk-lagen';
    const huvudrad = document.createElement('div'); huvudrad.className = 'sk-lrad sk-lhuvud';
    huvudrad.innerHTML = '<span></span>' + LAGESKOLUMNER.map(([t]) => `<span>${t}</span>`).join('');
    tab.append(huvudrad);
    for (const r of PR.karta.riktningar) {
      const rad = document.createElement('div'); rad.className = 'sk-lrad';
      rad.insertAdjacentHTML('beforeend', `<span>${r.namn}<small>${r.om}</small></span>`);
      for (const [t, ben, arm] of LAGESKOLUMNER) {
        const f = document.createElement('div');
        if (ben === 'sitta' && r.id === 'bak') { f.className = 'sk-tom'; f.textContent = '–'; }
        else f.append(duk(kartBild(q, r.id, ben, arm, opt), 3, `${r.namn}, ${t}`));
        rad.append(f);
      }
      tab.append(rad);
    }
    const omslag = document.createElement('div'); omslag.className = 'sk-tabell'; omslag.append(tab);
    return omslag;
  }

  // ---------- slump och arv ----------
  const slumpFran = s => () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const valj = (r, a) => a[Math.floor(r() * a.length)];
  const viktat = (r, par) => { const sum = par.reduce((s, [, v]) => s + v, 0); let x = r() * sum; for (const [k, v] of par) { x -= v; if (x < 0) return k; } return par[par.length - 1][0]; };
  const radAv = (r, sort, mall, kon) => { const a = alternativ(sort, mall, kon).filter(Boolean); return a.length ? valj(r, a) : null; };
  function slumpPerson(r, o = {}) {
    const p = neutral('kvinna');
    p.kon = o.kon || (r() < 0.5 ? 'kvinna' : 'man');
    p.alder = o.alder || viktat(r, [['barn', 2], ['ung', 3], ['vuxen', 4], ['gammal', 2]]);
    const m = mallAv(p);
    for (const s of ['huvudform', 'ora', 'nasa', 'oga', 'ogonbryn', 'mun', 'frisyr']) p.del[s] = radAv(r, s, m, p.kon);
    p.del.skagg = m === 'man' && r() < 0.65 ? radAv(r, 'skagg', m, p.kon) : null;
    p.del.huvudbonad = r() < 0.2 ? radAv(r, 'huvudbonad', m, p.kon) : null;
    p.del.smycke = r() < 0.25 ? radAv(r, 'smycke', m, p.kon) : null;
    p.del.arr = r() < 0.15 ? radAv(r, 'arr', m, p.kon) : null;
    p.del.blamarke = r() < 0.06 ? radAv(r, 'blamarke', m, p.kon) : null;
    p.del.redskap = r() < 0.35 ? radAv(r, 'redskap', m, p.kon) : null;
    p.hud = Math.floor(r() * PR.farger.hud.length);
    p.har = viktat(r, PR.farger.har.map((f, i) => [i, f.sallsynt ? 0.6 : 2]));
    p.ogon = Math.floor(r() * PR.farger.oga.length);
    p.humor = viktat(r, [['glad', 2], ['nojd', 3], ['lugn', 4], ['ledsen', 1.5], ['arg', 1], ['radd', 0.5], ['sover', 0.4]]);
    p.skonhet = viktat(r, [[-2, 1], [-1, 2], [0, 6], [1, 2], [2, 1]]);
    p.forband = r() < 0.06 ? [radAv(r, 'forband', m, p.kon)] : [];
    p.ogonlapp = r() < 0.03; p.sjuk = r() < 0.08; p.kyla = r() < 0.1; p.blod = r() < 0.05;
    p.klader = { rock: r() < 0.55 ? viktat(r, [['harskinn', 3], ['vargskinn', 1]]) : null, skor: r() < 0.5, balte: r() < 0.35 };
    return p;
  }
  // arvet (Porträttens byggsätt): varje del och färg från mamman eller pappan med lika stor chans, en gång på tio en
  // annan rad. Frisyren ärvs inte: barnet får en bland barnmallens, och en bland den vuxna mallens när det blir ungt
  function barnAv(a, b, r) {
    const c = neutral('barn'), fran = (x, y) => r() < 0.5 ? x : y;
    c.kon = r() < 0.5 ? 'kvinna' : 'man';
    for (const s of ['huvudform', 'ora', 'nasa', 'oga', 'ogonbryn', 'mun']) c.del[s] = r() < 0.1 ? radAv(r, s, 'barn', c.kon) : fran(a.del[s], b.del[s]);
    const far = a.kon === 'man' ? a : b.kon === 'man' ? b : null;
    c.anlag = { skagg: far && far.del.skagg && r() >= 0.1 ? far.del.skagg : radAv(r, 'skagg', 'man', 'man') };
    c.hud = r() < 0.1 ? Math.floor(r() * PR.farger.hud.length) : fran(a.hud, b.hud);
    c.har = r() < 0.1 ? Math.floor(r() * PR.farger.har.length) : fran(a.har, b.har);
    c.ogon = r() < 0.1 ? Math.floor(r() * PR.farger.oga.length) : fran(a.ogon, b.ogon);
    c.del.frisyr = radAv(r, 'frisyr', 'barn', c.kon);
    c.anlag.frisyr = radAv(r, 'frisyr', c.kon, c.kon);
    c.humor = viktat(r, [['glad', 3], ['nojd', 3], ['lugn', 3], ['ledsen', 1]]);
    return c;
  }
  const somUng = c => { const u = JSON.parse(JSON.stringify(c)); u.alder = 'ung'; u.del.frisyr = c.anlag.frisyr; if (u.kon === 'man') u.del.skagg = c.anlag.skagg; return u; };

  // ---------- skaparen ----------
  let p = lagra.las('skapare-person') || slumpPerson(slumpFran(7), { alder: 'vuxen' });
  const ny = neutral('kvinna');
  p = { ...ny, ...p, del: { ...ny.del, ...(p.del || {}) }, klader: { ...ny.klader, ...(p.klader || {}) }, lagen: {}, lager: null, rynkor: null };
  let gratt = false, gangRikt = 'fram', spelar = !matchMedia('(prefers-reduced-motion: reduce)').matches, gangSteg = 0, gangTimer = null;
  const andrat = () => { lagra.skriv('skapare-person', p); ritaSkaparen(); };

  const GRUPPER = [
    ['Mallen och färgerna', ['mall', 'hud', 'har', 'ogon']],
    ['Ansiktet', ['huvudform', 'ora', 'nasa', 'oga', 'ogonbryn', 'mun']],
    ['Håret och huvudet', ['frisyr', 'skagg', 'huvudbonad', 'smycke']],
  ];
  const STEGNAMN = { mall: 'Mall', hud: 'Hudton', har: 'Hårfärg', ogon: 'Ögonfärg' };
  function stegText(k) {
    if (k === 'mall') { const L = ['kvinna', 'man', 'barn']; return [MALL[mallAv(p)].namn, L.indexOf(mallAv(p)) + 1, 3]; }
    if (k === 'hud' || k === 'har' || k === 'ogon') { const lista = PR.farger[k === 'ogon' ? 'oga' : k]; const namn = k === 'har' && ALDER[p.alder].grattHar && mallAv(p) !== 'barn' ? lista[p[k]].namn + ' (grått nu)' : lista[p[k]].namn; return [namn, p[k] + 1, lista.length]; }
    const lista = alternativ(k, mallAv(p), p.kon), id = effektiva(p)[k], i = lista.indexOf(id ?? null);
    return [id ? DEL[id].namn : SORT[k].valfri, i + 1, lista.length];
  }
  function stega(k, d) {
    if (k === 'mall') {
      const L = ['kvinna', 'man', 'barn'], m = L[(L.indexOf(mallAv(p)) + d + 3) % 3];
      if (m === 'barn') p.alder = 'barn'; else { p.kon = m; if (p.alder === 'barn') p.alder = 'ung'; }
    } else if (k === 'hud' || k === 'har' || k === 'ogon') { const n = PR.farger[k === 'ogon' ? 'oga' : k].length; p[k] = (p[k] + d + n) % n; }
    else { const lista = alternativ(k, mallAv(p), p.kon), i = lista.indexOf(effektiva(p)[k] ?? null); p.del[k] = lista[(i + d + lista.length) % lista.length]; }
    andrat();
  }
  const stegRad = (k, namn) => `<div class="sk-steg"><span class="sk-namn">${namn}</span><button type="button" data-steg="${k}" data-d="-1" aria-label="Föregående: ${namn}">‹</button><output id="sk-ut-${k}" aria-live="polite"></output><button type="button" data-steg="${k}" data-d="1" aria-label="Nästa: ${namn}">›</button></div>`;
  const chips = (k, namn, lista) => `<div class="sk-rad"><span class="sk-namn">${namn}</span><div class="sk-chips" role="group" aria-label="${namn}">${lista.map(([v, t]) => `<button type="button" data-chip="${k}" data-v="${v}">${t}</button>`).join('')}</div></div>`;
  function byggValjare() {
    let html = '';
    for (const [rubrik, nycklar] of GRUPPER) html += `<div class="sk-grupp"><h3>${rubrik}</h3>${nycklar.map(k => stegRad(k, STEGNAMN[k] || SORT[k].en)).join('')}</div>`;
    html += `<div class="sk-grupp"><h3>Läget</h3>
      ${chips('humor', 'Humör', PR.humor.map(h => [h.id, h.namn]))}
      ${chips('kon', 'Kön', [['kvinna', 'Kvinna'], ['man', 'Man']])}
      ${chips('alder', 'Ålder', PR.aldrar.map(a => [a.id, a.namn]))}
      ${chips('skonhet', 'Skönhet', PR.skonhet.map(s => [s.niva, s.namn]))}</div>`;
    html += `<div class="sk-grupp"><h3>Skador och kropp</h3>${stegRad('arr', 'Ärr')}${stegRad('blamarke', 'Blåmärke')}
      ${chips('forband', 'Förband', delarAv('forband').map(d => [d.id, d.namn]))}
      ${chips('flagga', 'Kroppen', [['ogonlapp', 'Ögonlapp'], ['sjuk', 'Sjuk'], ['kyla', 'Kyla'], ['blod', 'Blod']])}</div>`;
    html += `<div class="sk-grupp"><h3>Kläder och redskap</h3>
      ${chips('rock', 'Rock', [['', 'Ingen'], ...DEL['plagg-rock'].material.map(m => [m, MATERIAL[m].namn])])}
      ${chips('plagg', 'Mer', [['skor', 'Skor'], ['balte', 'Bälte']])}
      ${stegRad('redskap', 'Redskap')}</div>`;
    $('#sk-val').innerHTML = html;
  }
  function visaValjare() {
    for (const k of ['mall', 'hud', 'har', 'ogon', ...VALJ]) {
      const ut = $('#sk-ut-' + k); if (!ut) continue;
      const [namn, i, n] = stegText(k);
      ut.innerHTML = `${namn} <small>${i}/${n}</small>`;
    }
    document.querySelectorAll('#sk-val [data-chip]').forEach(b => {
      const k = b.dataset.chip, v = b.dataset.v;
      const pa = k === 'kon' ? p.kon === v : k === 'humor' ? p.humor === v : k === 'alder' ? p.alder === v : k === 'skonhet' ? String(p.skonhet) === v : k === 'forband' ? p.forband.includes(v)
        : k === 'flagga' ? !!p[v] : k === 'rock' ? (p.klader.rock || '') === v : k === 'plagg' ? !!p.klader[v] : false;
      b.setAttribute('aria-pressed', String(pa));
    });
  }
  function chip(k, v) {
    if (k === 'kon') p.kon = v;
    if (k === 'humor') p.humor = v;
    if (k === 'alder') p.alder = v;
    if (k === 'skonhet') p.skonhet = +v;
    if (k === 'forband') p.forband = p.forband.includes(v) ? p.forband.filter(x => x !== v) : [...p.forband, v];
    if (k === 'flagga') p[v] = !p[v];
    if (k === 'rock') p.klader.rock = v || null;
    if (k === 'plagg') p.klader[v] = !p.klader[v];
    andrat();
  }
  function ritaSkaparen() {
    visaValjare();
    const por = $('#sk-portratt'), fig = $('#sk-figur');
    tillCanvas(portratt(p, { gratt }), por, 4);
    tillCanvas(kartBild(p, 'fram', 'sta', 'hanga', { gratt }), fig, 8);
    $('#sk-text').textContent = beskriv(p);
    // alla lägen
    const tab = $('#sk-lagen'); tab.textContent = ''; tab.append(lagesTabell(p, { gratt }));
    const lig = $('#sk-ligga'); lig.textContent = '';
    for (const [t, o] of [['Ligger', {}], ['Ligger under fällen', { tacke: true }]]) {
      const f = document.createElement('figure'); f.append(duk(kartBild(p, 'fram', 'sta', 'hanga', { gratt, ligga: true, slutna: true, ...o }), 3, t));
      f.insertAdjacentHTML('beforeend', `<figcaption>${t}</figcaption>`); lig.append(f);
    }
    ritaGang();
  }
  // gången i rörelse: gångsteg 1, stå, gångsteg 2, stå
  const GANG = [['gang1', 'gang1'], ['sta', 'hanga'], ['gang2', 'gang2'], ['sta', 'hanga']];
  function ritaGang() {
    const [ben, arm] = GANG[gangSteg % 4];
    tillCanvas(kartBild(p, gangRikt, ben, arm, { gratt }), $('#sk-gang'), 6);
    document.querySelectorAll('[data-gangrikt]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.gangrikt === gangRikt)));
    $('#sk-spela').textContent = spelar ? 'Stanna' : 'Gå';
    $('#sk-spela').setAttribute('aria-pressed', String(spelar));
  }
  function spela() { clearInterval(gangTimer); if (spelar) gangTimer = setInterval(() => { gangSteg++; ritaGang(); }, 260); }
  function beskriv(q) {
    const del = effektiva(q), m = MALL[mallAv(q)];
    const delar = ['huvudform', 'frisyr', 'skagg', 'huvudbonad'].filter(s => del[s]).map(s => `${SORT[s].en.toLowerCase()}: ${DEL[del[s]].namn.toLowerCase()}`);
    return `${m.namn}, ${ALDER[q.alder].namn.toLowerCase()}, ${HUMOR[q.humor].namn.toLowerCase()}. ${delar.join(', ')}. Hud ${PR.farger.hud[q.hud].namn.toLowerCase()}, hår ${PR.farger.har[q.har].namn.toLowerCase()}, ögon ${PR.farger.oga[q.ogon].namn.toLowerCase()}.`;
  }

  // föräldrarna och fem barn; tjugo bybor
  let foraldraFro = 11, barnFro = 21, byFro = 31, somUnga = false;
  let foraldrar = [slumpPerson(slumpFran(foraldraFro), { kon: 'kvinna', alder: 'vuxen' }), slumpPerson(slumpFran(foraldraFro + 1), { kon: 'man', alder: 'vuxen' })];
  const kopia = q => JSON.parse(JSON.stringify(q));
  function personKnapp(q, etikett, skala = 2) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'sk-person';
    b.append(duk(portratt(q, { gratt }), skala, etikett)); b.title = 'Visa i skaparen';
    b.addEventListener('click', () => { p = { ...kopia(q), lagen: {}, lager: null, rynkor: null }; andrat(); $('#skapare').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); });
    return b;
  }
  function ritaFamilj() {
    ['#sk-mor', '#sk-far'].forEach((s, i) => { const e = $(s); e.textContent = ''; e.append(personKnapp(foraldrar[i], i ? 'Förälder 2' : 'Förälder 1')); });
    const r = slumpFran(barnFro), lista = $('#sk-barn'); lista.textContent = '';
    for (let i = 0; i < 5; i++) { const c = barnAv(foraldrar[0], foraldrar[1], r); lista.append(personKnapp(somUnga ? somUng(c) : c, 'Barn ' + (i + 1))); }
    $('#sk-somunga').setAttribute('aria-pressed', String(somUnga));
  }
  function ritaByn() {
    const r = slumpFran(byFro), lista = $('#sk-byn'); lista.textContent = '';
    for (let i = 0; i < 20; i++) lista.append(personKnapp(slumpPerson(r), 'Bybo ' + (i + 1), 1));
  }

  // ---------- databasen: Björns svar (samlingen val) och de sparade kombinationerna ----------
  let DBS = null; const SVARDEL = {}; let KOMBOS = [];
  async function anslut() {
    const st = [$('#gr-status'), $('#sk-sparstatus')];
    st.forEach(e => { e.textContent = 'Ansluter till sidans databas …'; });
    try { DBS = await window.claude?.use?.('db'); } catch (e) { DBS = null; }
    if (!DBS) { st.forEach(e => { e.textContent = 'Svaren och kombinationerna går bara att spara när sidan är öppen i Claude och du är inloggad.'; }); visaGranskning(); visaKombos(); return; }
    $('#gr-status').textContent = 'Ditt svar sparas direkt.'; $('#sk-sparstatus').textContent = '';
    DBS.collection('val').onSnapshot(snap => {
      for (const k of Object.keys(SVARDEL)) delete SVARDEL[k];
      snap.docs.forEach(d => { if (d.exists && d.id.startsWith('del-')) SVARDEL[d.id.slice(4)] = d.data(); });
      visaGranskning();
    }, () => { $('#gr-status').textContent = 'Kontakten med databasen bröts. Ladda om sidan.'; });
    DBS.collection('kombinationer').onSnapshot(snap => {
      KOMBOS = snap.docs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.nar).localeCompare(String(a.nar)));
      visaKombos();
    }, () => { $('#sk-sparstatus').textContent = 'Kontakten med databasen bröts. Ladda om sidan.'; });
    visaGranskning(); visaKombos();
  }
  async function sparaKombo() {
    const ta = $('#sk-kommentar'), st = $('#sk-sparstatus');
    if (!DBS) { st.textContent = 'Det går bara att spara när sidan är öppen i Claude och du är inloggad.'; return; }
    const person = kopia({ ...p, lagen: undefined, lager: undefined, rynkor: undefined });
    try { await DBS.collection('kombinationer').add({ person, kommentar: ta.value.trim(), text: beskriv(p), nar: new Date().toISOString() }); ta.value = ''; st.textContent = 'Sparat.'; }
    catch (e) { st.textContent = 'Kunde inte spara. Har du rätt att ändra sidan?'; }
  }
  function visaKombos() {
    const lista = $('#sk-sparade'); lista.textContent = '';
    if (!KOMBOS.length) { lista.innerHTML = '<p class="not">Inga sparade kombinationer än.</p>'; return; }
    for (const k of KOMBOS.slice(0, 12)) {
      const f = document.createElement('div'); f.className = 'sk-kombo';
      const n0 = neutral('kvinna'), q = { ...n0, ...k.person, del: { ...n0.del, ...(k.person?.del || {}) }, klader: { ...n0.klader, ...(k.person?.klader || {}) }, lagen: {}, lager: null, rynkor: null };
      f.append(personKnapp(q, 'Sparad kombination', 1));
      const t = document.createElement('p'); t.innerHTML = `<b>${new Date(k.nar).toLocaleDateString('sv-SE')}</b>`; t.append(document.createTextNode(k.kommentar || k.text || ''));
      f.append(t); lista.append(f);
    }
  }

  // ---------- granskningsläget ----------
  // ett kort per del, i registrets ordning (den ordning delarna ritas): mallarna, ansiktet, färgerna, håret och resten
  const KORT = [];
  for (const s of PR.sorter) {
    if (s.rader === 'mallar') PR.mallar.forEach(m => KORT.push({ id: 'mall-' + m.id, sort: s, rad: m, namn: m.namn, ritad: m.ritad || 0, mallar: [m.id] }));
    else if (s.rader?.startsWith('farger.')) { const k = s.rader.split('.')[1]; PR.farger[k].forEach((f, i) => KORT.push({ id: 'farg-' + k + '-' + f.id, sort: s, rad: f, i, namn: f.namn, ritad: f.ritad || 0 })); }
    else delarAv(s.id).forEach(d => KORT.push({ id: d.id, sort: s, rad: d, namn: d.namn, ritad: d.ritad || 0 }));
  }
  KORT.forEach((k, i) => {
    k.forebild = i === 0 || KORT[i - 1].sort !== k.sort;
    if (k.mallar) { k.vem = k.mallar.map(m => ({ mall: m, kon: m === 'man' ? 'man' : 'kvinna' })); return; }
    const t = k.rad.sort ? konAv(k.rad) : 'bada', barn = k.rad.sort ? barnOk(k.rad) : true;
    k.kon = k.rad.sort ? t : null; k.barn = barn;
    k.vem = [...(t === 'bada' ? ['kvinna', 'man'] : [t]).map(m => ({ mall: m, kon: m })), ...(barn ? [{ mall: 'barn', kon: t === 'man' ? 'man' : 'kvinna' }] : [])];
  });
  // granskningen visar bara de ritade delarna (Björn efter 5.2.2.3: sidan var förvirrande); de grå platshållarna kommer dit när de ritas
  const GKORT = KORT.filter(k => k.ritad > 0);
  let grFilter = lagra.las('granskning-filter') || 'obesvarade', grId = lagra.las('granskning-kort') || GKORT[0]?.id, grVantar = null;
  const svarFor = k => { const s = SVARDEL[k.id]; return s && (s.ritad ?? 0) === k.ritad ? s : null; };
  const lage = k => { const s = svarFor(k); return !s ? 'obesvarad' : s.svar === 'ja' || s.svar === 'nej' ? s.svar : 'kommentar'; };
  const synlig = k => grFilter === 'alla' || lage(k) === 'obesvarad' || k.id === grId;
  function granskPerson(k, mall, kon = mall === 'man' ? 'man' : 'kvinna') {
    const q = neutral(mall); q.kon = kon;
    for (const [s, id] of Object.entries(k.sort.granskaMed || {})) if (DEL[id] && passar(DEL[id], mall, kon)) q.del[s] = id;
    switch (k.sort.id) {
      case 'mall': break;
      case 'hudton': q.hud = k.i; break;
      case 'harfarg': q.har = k.i; break;
      case 'ogonfarg': q.ogon = k.i; break;
      case 'skonhet': q.lager = [k.rad.id]; if (k.rad.id === 'skon-tander') q.humor = 'glad'; break;
      case 'rynkor': q.rynkor = k.rad.steg; q.alder = 'vuxen'; break;
      case 'forband': q.forband = [k.rad.id]; break;
      case 'ogonlapp': q.ogonlapp = true; break;
      case 'klader': q.klader = { rock: k.rad.plagg === 'rock' ? k.rad.material[0] : null, skor: k.rad.plagg === 'skor', balte: k.rad.plagg === 'balte' }; break;
      default: q.del[k.sort.id] = k.rad.id;
    }
    return q;
  }
  function bildRad(rubrik, bilder) {
    const g = document.createElement('div'); g.className = 'gr-mall';
    g.insertAdjacentHTML('beforeend', `<b>${rubrik}</b>`);
    const r = document.createElement('div'); r.className = 'gr-rad';
    for (const [B, skala, text] of bilder) { const f = document.createElement('figure'); f.append(duk(B, skala, text)); f.insertAdjacentHTML('beforeend', `<figcaption>${text}</figcaption>`); r.append(f); }
    g.append(r); return g;
  }
  function granskBilder(k) {
    const ut = document.createElement('div'); ut.className = 'gr-bilder';
    const lagen = k.sort.lagen ? LAGEN[k.sort.lagen] : null;
    if (k.sort.id === 'mall') {
      const q = granskPerson(k, k.rad.id);
      ut.append(bildRad('I porträttet', [[portratt(q, { bara: 'mall' }), 2, 'Mallen ensam, med den runda huvudformen'], [portratt(q, { bara: 'mall', zoner: true }), 2, 'Fästpunkterna och zonerna'], [portratt(q), 2, 'Med det neutrala ansiktet']]));
      const z = document.createElement('p'); z.className = 'not';
      z.textContent = 'Zonerna: skallen gul, luggen grön, sidorna mörkgröna, öronen röda, ögonen blå och munnens ruta orange. De ljusa korsen är fästpunkterna: ögonen, ögonbrynen, näsan, munnen, öronen, håret och huvudbonaden (överst), skägget, halsbandet och redskapet.';
      ut.append(z);
      const g = document.createElement('div'); g.className = 'gr-mall'; g.insertAdjacentHTML('beforeend', '<b>På kartan: kroppen utan delar, i alla riktningar och lägen</b>');
      g.append(lagesTabell(granskPerson(k, k.rad.id), { bara: 'mall' }));
      ut.append(g);
      ut.append(bildRad('Liggande', [[kartBild(q, 'fram', 'sta', 'hanga', { ligga: true, slutna: true, bara: 'mall' }), 3, 'Ligger'], [kartBild(q, 'fram', 'sta', 'hanga', { ligga: true, slutna: true, tacke: true, bara: 'mall' }), 3, 'Ligger under fällen']]));
      return ut;
    }
    const vemNamn = v => v.mall === 'barn' && k.kon && k.kon !== 'bada' ? (v.kon === 'man' ? 'Barn (pojke)' : 'Barn (flicka)') : MALL[v.mall].namn;
    for (const v of k.vem) {
      const mall = v.mall, bilder = [];
      if (lagen) for (const l of lagen) {
        const q = granskPerson(k, mall, v.kon);
        q.lagen[k.sort.id] = l.id;
        if (k.sort.id === 'mun') { const h = PR.humor.find(x => x.mun === l.id); if (h) q.humor = h.id; }
        bilder.push([portratt(q), 2, l.namn]);
      }
      else bilder.push([portratt(granskPerson(k, mall, v.kon)), 2, vemNamn(v)]);
      ut.append(bildRad(lagen ? vemNamn(v) + ': ' + (k.sort.id === 'mun' ? 'munnen i sina sex lägen, med ögonen och ögonbrynen i samma humör' : 'i alla fyra lägen') : vemNamn(v), bilder));
    }
    if (k.sort.harfarger) {
      const v0 = k.vem[0], bilder = [0, 2, 4, 5].map(i => { const q = granskPerson(k, v0.mall, v0.kon); q.har = i; return [portratt(q), 2, PR.farger.har[i].namn]; });
      ut.append(bildRad('I fyra hårfärger', bilder));
    }
    if (k.sort.karta) {
      const mall = k.vem[0].mall, q = granskPerson(k, mall, k.vem[0].kon);
      const lista = k.sort.id === 'redskap' ? [['fram', 'sta', 'hanga', 'Framifrån'], ['sida', 'sta', 'lyfta', 'Lyfter'], ['sida', 'sta', 'sla', 'Slår'], ['fram', 'sta', 'bara', 'Bär']]
        : k.sort.id === 'mall' ? [['fram', 'sta', 'hanga', 'Framifrån'], ['bak', 'sta', 'hanga', 'Bakifrån'], ['sida', 'sta', 'hanga', 'Från sidan'], ['sida', 'gang1', 'gang1', 'Går'], ['fram', 'sitta', 'hanga', 'Sitter']]
          : k.sort.id === 'klader' ? [['fram', 'sta', 'hanga', 'Framifrån'], ['bak', 'sta', 'hanga', 'Bakifrån'], ['sida', 'sta', 'hanga', 'Från sidan'], ['sida', 'gang1', 'gang1', 'Går']]
            : [['fram', 'sta', 'hanga', 'Framifrån'], ['bak', 'sta', 'hanga', 'Bakifrån'], ['sida', 'sta', 'hanga', 'Från sidan']];
      const bilder = lista.map(([r, b, a, t]) => [kartBild(q, r, b, a), 4, t]);
      if (k.sort.id === 'mall') bilder.push([kartBild(q, 'fram', 'sta', 'hanga', { ligga: true, slutna: true }), 4, 'Ligger']);
      ut.append(bildRad('På kartan' + (MALL[mall] && k.vem.length > 1 ? ' (' + MALL[mall].namn.toLowerCase() + ')' : ''), bilder));
    } else ut.insertAdjacentHTML('beforeend', '<p class="not">Syns inte på kartan.</p>');
    return ut;
  }
  // korten man har sett, så att Förra går tillbaka till kortet man nyss var på, också när det är besvarat
  // (Björn efter 5.2.2.3: förut hoppade Förra över det besvarade kortet till ett helt annat)
  const grSett = [];
  function flytta(steg, svarat = false) {
    if (steg < 0 && grSett.length) { grId = grSett.pop(); lagra.skriv('granskning-kort', grId); visaGranskning(true); return; }
    const fran = grId, i = GKORT.findIndex(k => k.id === grId);
    for (let n = 1; n <= GKORT.length; n++) {
      const k = GKORT[(i + steg * n + GKORT.length * n) % GKORT.length];
      if (grFilter === 'alla' || lage(k) === 'obesvarad') { grId = k.id; break; }
      if (svarat && n === GKORT.length) break;
    }
    if (steg > 0 && grId !== fran) grSett.push(fran);
    lagra.skriv('granskning-kort', grId); visaGranskning(true);
  }
  let senastVisad = null;
  function visaGranskning(nyttKort = false) {
    if (!$('#grkort')) return;
    const alla = GKORT.length, obesv = GKORT.filter(k => lage(k) === 'obesvarad').length;
    document.querySelectorAll('[data-grfilter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.grfilter === grFilter)));
    $('#gr-antal-obesvarade').textContent = obesv; $('#gr-antal-alla').textContent = alla;
    // sorterna med hur många som är godkända
    const sorter = $('#gr-sorter'); sorter.textContent = '';
    for (const s of PR.sorter) {
      const ks = GKORT.filter(k => k.sort === s); if (!ks.length) continue;
      const ja = ks.filter(k => lage(k) === 'ja').length, kom = ks.filter(k => ['kommentar', 'nej'].includes(lage(k))).length;
      const b = document.createElement('button'); b.type = 'button'; b.dataset.grsort = s.id;
      b.className = ja === ks.length ? 'klar' : kom ? 'kommenterad' : '';
      b.innerHTML = `${s.namn} <small>${ja}/${ks.length}</small>`;
      if (GKORT.find(k => k.id === grId)?.sort === s) b.setAttribute('aria-current', 'true');
      sorter.append(b);
    }
    let k = GKORT.find(x => x.id === grId) || GKORT[0];
    const kort = $('#grkort');
    if (!k) { kort.className = 'grkort'; kort.innerHTML = '<p>Inget att granska just nu.</p>'; senastVisad = null; return; }
    if (grFilter === 'obesvarade' && !obesv && lage(k) !== 'obesvarad') {
      kort.className = 'grkort'; kort.innerHTML = '<p>Alla kort är besvarade.</p><p><button type="button" class="gr-knapp" data-grfilter="alla">Visa alla kort</button></p>'; senastVisad = null; return;
    }
    const st = lage(k), s = SVARDEL[k.id], forra = !svarFor(k) && s && s.kommentar ? s.kommentar : k.rad.forra || null;
    const synliga = GKORT.filter(synlig), pos = synliga.indexOf(k) + 1;
    const nav = `<nav class="gr-nav" aria-label="Bläddra bland korten"><button type="button" class="gr-knapp" data-grsteg="-1">‹ Förra</button><span>${pos} av ${synliga.length}</span><button type="button" class="gr-knapp" data-grsteg="1">Nästa ›</button></nav>`;
    if (nyttKort || senastVisad !== k.id || !kort.querySelector('.gr-bilder')) {
      const vad = k.sort.id === 'mall' ? k.rad.vad + ' Mallen är kroppen, halsen, axlarna och skallen, med fästpunkterna där delarna sitter och zonerna som maskerna döljer.'
        : k.rad.toner ? `Färgen ${k.namn.toLowerCase()}: tonerna ${k.rad.toner.join(', ')} ur paletten, på det neutrala ansiktet.`
          : `${k.sort.en} på ett helt ansikte, där resten är detsamma för alla delar av sorten.`;
      kort.innerHTML = `${nav}<header><span class="typ">${k.sort.namn} · steg ${k.sort.steg}${k.kon ? ' · ' + KONTEXT[k.kon] + (k.barn ? '' : ', inte barn') : ''}${k.forebild ? ' · förebild' : ''}${k.ritad ? '' : ' · grå platshållare'}</span>
        <h3>${k.sort.en}: ${k.namn}</h3><p class="not">${vad}${k.ritad ? (k.sort.id === 'mall' ? ' Mallen är ritad; ansiktets delar och håret på bilderna är ännu grå platshållare.' : '') : ' Delen är inte ritad än: bilden är en platshållare, och ett svar nu gäller bara platshållaren.'}</p>
        ${forra ? `<p class="forra">Din kommentar förra gången: ${forra.replace(/</g, '&lt;')}</p>` : ''}</header>
        <div class="gr-svar"><div class="gr-svarknappar"><button type="button" class="gr-ja" data-grsvar="ja">Ja</button><button type="button" class="gr-nej" data-grsvar="nej">Nej</button></div>
        <label for="gr-kommentar">Kommentar: vad ska ändras?</label><textarea id="gr-kommentar" rows="3" placeholder="Skriv gärna vad som ska ändras, till exempel: munnen ska vara bredare när hon är glad"></textarea>
        <button type="button" class="gr-knapp" data-grsvar="kommentar">Skicka kommentaren</button></div>
        <p class="gr-sparat" aria-live="polite"></p>${nav}`;
      kort.querySelector('header').after(granskBilder(k));
      const ta = kort.querySelector('#gr-kommentar'); ta.value = svarFor(k)?.kommentar || '';
      senastVisad = k.id;
    } else kort.querySelectorAll('.gr-nav span').forEach(e => { e.textContent = `${pos} av ${synliga.length}`; });
    kort.className = 'grkort ' + st;
    const sparat = kort.querySelector('.gr-sparat'), sv = svarFor(k);
    sparat.textContent = grVantar === k.id ? 'Sparar …' : sv ? (sv.svar === 'ja' ? 'Godkänd.' : sv.svar === 'nej' ? 'Nej: ritas om.' : 'Kommentaren är sparad.') + ' ' + new Date(sv.nar).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' }) : '';
    kort.querySelectorAll('[data-grsvar]').forEach(b => { b.disabled = !DBS; b.setAttribute('aria-pressed', String(sv?.svar === b.dataset.grsvar)); });
    kort.querySelector('#gr-kommentar').disabled = !DBS;
  }
  async function svara(svar) {
    const k = KORT.find(x => x.id === grId); if (!k || !DBS) return;
    const ta = $('#gr-kommentar'), kommentar = ta ? ta.value.trim() : '';
    if (svar === 'kommentar' && !kommentar) { $('#grkort .gr-sparat').textContent = 'Skriv först vad som ska ändras.'; ta?.focus(); return; }
    const data = { svar, kommentar, nar: new Date().toISOString(), ritad: k.ritad, del: k.id };
    SVARDEL[k.id] = data; grVantar = k.id; visaGranskning();
    try { await DBS.doc('val/del-' + k.id).set(data); grVantar = null; visaGranskning(); setTimeout(() => { if (grId === k.id) flytta(1, true); }, 450); }
    catch (e) { grVantar = null; delete SVARDEL[k.id]; visaGranskning(); $('#grkort .gr-sparat').textContent = 'Kunde inte spara. Har du rätt att ändra sidan?'; }
  }

  // ---------- att starta ----------
  function starta() {
    if (!$('#skapare')) return;
    byggValjare();
    const riktn = $('#sk-riktning');
    const RN = { fram: 'Söderut', bak: 'Norrut', sida: 'Österut', vast: 'Västerut' };
    riktn.innerHTML = PR.karta.riktningar.map(r => `<button type="button" data-gangrikt="${r.id}">${RN[r.id] || r.namn}</button>`).join('');
    document.addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.steg) stega(t.dataset.steg, +t.dataset.d);
      else if (t.dataset.chip) chip(t.dataset.chip, t.dataset.v);
      else if (t.dataset.gangrikt) { gangRikt = t.dataset.gangrikt; ritaGang(); }
      else if (t.id === 'sk-spela') { spelar = !spelar; spela(); ritaGang(); }
      else if (t.id === 'sk-slumpa') { p = slumpPerson(slumpFran((Math.random() * 2 ** 31) | 0)); andrat(); }
      else if (t.id === 'sk-gratt') { gratt = !gratt; t.setAttribute('aria-pressed', String(gratt)); ritaSkaparen(); ritaFamilj(); ritaByn(); }
      else if (t.id === 'sk-spara') sparaKombo();
      else if (t.dataset.forelder) { const i = +t.dataset.forelder; foraldrar[i] = t.dataset.hur === 'ta' ? { ...kopia(p), lagen: {}, lager: null, rynkor: null } : slumpPerson(slumpFran(++foraldraFro * 7 + i), { kon: i ? 'man' : 'kvinna', alder: 'vuxen' }); ritaFamilj(); }
      else if (t.id === 'sk-nyabarn') { barnFro++; ritaFamilj(); }
      else if (t.id === 'sk-somunga') { somUnga = !somUnga; ritaFamilj(); }
      else if (t.id === 'sk-nyaby') { byFro++; ritaByn(); }
      else if (t.dataset.grfilter) { grFilter = t.dataset.grfilter; lagra.skriv('granskning-filter', grFilter); if (grFilter === 'obesvarade' && GKORT.length && lage(GKORT.find(k => k.id === grId) || GKORT[0]) !== 'obesvarad') flytta(1, true); else visaGranskning(true); }
      else if (t.dataset.grsort) { if (grId) grSett.push(grId); grId = GKORT.find(k => k.sort.id === t.dataset.grsort && (grFilter === 'alla' || lage(k) === 'obesvarad'))?.id || GKORT.find(k => k.sort.id === t.dataset.grsort).id; lagra.skriv('granskning-kort', grId); visaGranskning(true); $('#grkort').scrollIntoView({ block: 'start' }); }
      else if (t.dataset.grsteg) { flytta(+t.dataset.grsteg); if (t.closest('.gr-nav:last-child')) $('#grkort').scrollIntoView({ block: 'start' }); }
      else if (t.dataset.grsvar) svara(t.dataset.grsvar);
    });
    ritaSkaparen(); ritaFamilj(); ritaByn(); spela();
    if (!GKORT.some(k => k.id === grId)) grId = GKORT[0]?.id;
    visaGranskning(true);
    anslut();
  }
  starta();
  // för skriptet som ritar med API:t (bildstil/api/rita.mjs): det öppnar sidan, lägger in en ny del och tar bilden
  window.PORTRATTEN = { portratt, kartBild, neutral, granskPerson, KORT, provaDel(id, data) { DELAR[id] = data; }, png(B, skala = 4) { const c = document.createElement('canvas'); tillCanvas(B, c, 0); const s = document.createElement('canvas'); s.width = B.w * skala; s.height = B.h * skala; const g = s.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, s.width, s.height); return s.toDataURL('image/png'); } };
})();
