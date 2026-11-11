// API:ts nya versioner av valkorten (node bildstil/api/forslag.mjs, Björn efter bildstil v236): varje fil i
// bildstil/forslag/<kort>.json ersätter kortet med samma id i VAL med tre nya idéer, ritade av API:t var för sig.
// En version är data, inte kod: { ide, bilder: [{ namn, rader }], fram/sida/bak: { arm, framfor, bakom }, portratt:
// { framfor, bakom } }. Raderna är tecknen i PORTRATT.tecken ('.' är genomskinligt). Det som bärs ritas på kolonisten:
// framfor över figuren och bakom bara där figuren inte är, på en duk på 26 × 32 punkter där figuren (14 × 20) står
// med övre vänstra hörnet i (6, 6); i porträttet (64 × 64) går bakom bara på bakgrunden. Kontrollerna (kontroll.js)
// körs på korten som på alla andra.
(() => {
  if (typeof FORSLAG === 'undefined' || typeof VAL === 'undefined') return;
  const MF = 6, FW = 26, FH = 32, FRO = 22, FORE = 'Ritad av API:t: tre nya idéer, var och en ritad för sig utan att se de andra.';
  const idx = (P, ch) => { const t = PORTRATT.tecken[ch]; return ch !== '.' && t && /\d$/.test(t) ? P.i(t.slice(0, -1), +t.slice(-1)) : -1; };
  const bredd = r => Math.max(0, ...r.map(x => x.length));
  // en bild ur raderna, med övre vänstra hörnet i (x0, y0); villkor(x, y) säger var den får ritas
  const lagg = (B, rader, x0, y0, villkor = () => true) => (rader || []).forEach((r, y) => [...r].forEach((ch, x) => { const c = idx(B.P, ch); if (c >= 0 && villkor(x, y)) B.satt(x0 + x, y0 + y, c); }));

  // kolonisten på kartan i en riktning med det som bärs
  function figur(B, x0, y0, rikt, o) {
    const F = window.BYBO ? window.BYBO(FRO, rikt, 'sta', o?.arm || 'hanga', null) : null; if (!F) return;
    F.plats = { ox: x0 + MF, oy: y0 + MF }; // var figuren står, för kontrollen (kontroll.js hitta)
    const har = (x, y) => { const fx = x - MF, fy = y - MF; return fx >= 0 && fy >= 0 && fx < F.w && fy < F.h && F.px[fy * F.w + fx] >= 0; };
    for (let x = 3; x < F.w - 3; x++) B.morka(x0 + MF + x, y0 + MF + F.h); // skuggan under fötterna
    lagg(B, o?.bakom, x0, y0, (x, y) => !har(x, y));
    for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) { const c = F.px[y * F.w + x]; if (c >= 0) B.satt(x0 + MF + x, y0 + MF + y, c); }
    lagg(B, o?.framfor, x0, y0);
  }
  // porträttet med det som bärs (samma man som i svar/e-strid.js)
  const mannen = () => { const PR = window.PORTRATTEN; const m = PR.neutral('man'); m.alder = 'vuxen'; m.klader = { rock: 'harskinn', skor: true, balte: false }; return m; };
  function portratt(B, x0, y0, o) {
    const PR = window.PORTRATTEN; if (!PR) return;
    const Q = PR.portratt(mannen()); Q.plats = { ox: x0, oy: y0 };
    const bakgrund = (x, y) => Q.figur ? !Q.figur[y * Q.w + x] : (c => c >= 1 && c < 4)(Q.px[y * Q.w + x]);
    const inne = (x, y) => x >= 2 && y >= 2 && x < Q.w - 2 && y < Q.h - 2;
    for (let y = 0; y < Q.h; y++) for (let x = 0; x < Q.w; x++) { const c = Q.px[y * Q.w + x]; if (c >= 0) B.satt(x0 + x, y0 + y, c); }
    lagg(B, o?.bakom, x0, y0, (x, y) => inne(x, y) && bakgrund(x, y));
    lagg(B, o?.framfor, x0, y0, inne);
  }
  // en version: sakerna på rad, och det som bärs på kolonisten framifrån, från sidan, bakifrån och i porträttet
  // det som sitter ihop (ett staket, registret SLAG i kontroll.js): bitarna sätts ihop till en hage, 4 bitar längs och 2 på
  // varje sida; biten för sidorna heter "tvärs" (eller "sida"), annars används biten längs
  function hage(bilder) {
    const L = bilder[0].rader, T = (bilder.find(b => /tvär|sida|lodr/i.test(b.namn)) || bilder[0]).rader;
    const lw = bredd(L), lh = L.length, tw = bredd(T), th = T.length, w = 4 * lw + tw, h = lh + 2 * Math.max(th, lh) + 2;
    return { w, h, rita: (B, x0, y0) => {
      const steg = Math.max(th, lh), botten = y0 + h - lh;
      for (let k = 0; k < 4; k++) lagg(B, L, x0 + Math.floor(tw / 2) + k * lw, y0);
      for (let r = 0; r < 2; r++) for (const sx of [x0, x0 + 4 * lw]) lagg(B, T, sx, y0 + lh - 2 + r * steg - (th - steg));
      for (let k = 0; k < 4; k++) lagg(B, L, x0 + Math.floor(tw / 2) + k * lw, botten);
    } };
  }
  function version(v, hopsatt = false) {
    const bilder = (v.bilder || []).filter(b => b.rader?.length), bars = !!(v.fram || v.sida || v.bak || v.portratt);
    const H = hopsatt && bilder.length ? hage(bilder) : null;
    const sw = bilder.reduce((s, b) => s + bredd(b.rader) + 4, 0) + (H ? H.w + 8 : 0), hojd = Math.max(20, ...bilder.map(b => b.rader.length), H ? H.h : 0);
    const rikt = ['fram', 'sida', 'bak'].filter(r => v[r]);
    const w = 4 + sw + (bars ? rikt.length * FW + 2 + (v.portratt ? 64 : 0) : 0) + 4, h = bars ? 72 : hojd + 8;
    return { text: v.ide || '', w, h, rita: B => {
      const fot = h - 4; let x = 4;
      for (const b of bilder) { lagg(B, b.rader, x, fot - b.rader.length); x += bredd(b.rader) + 4; }
      if (H) { x += 4; H.rita(B, x, fot - H.h); x += H.w + 4; }
      if (!bars) return;
      for (const r of rikt) { figur(B, x, fot - 20 - MF, r, v[r]); x += FW; }
      if (v.portratt) portratt(B, w - 4 - 64, 4, v.portratt);
    } };
  }
  // kolonisten och porträttet som rader, för frågan till API:t (bildstil/api/forslag.mjs)
  function rader(B) {
    const T = PORTRATT.tecken, rev = {};
    for (const [ch, t] of Object.entries(T)) if (/\d$/.test(t)) rev[B.P.i(t.slice(0, -1), +t.slice(-1))] = ch;
    const ut = []; for (let y = 0; y < B.h; y++) { let r = ''; for (let x = 0; x < B.w; x++) { const c = B.px[y * B.w + x]; r += c >= 0 && rev[c] ? rev[c] : '.'; } ut.push(r); }
    return ut;
  }
  window.FORSLAGEN = {
    version,
    // kolonisten (26 × 32 med figuren i (6, 6)) och porträttet (64 × 64) som rader och PNG
    underlag(rikt, arm = 'hanga') {
      const P = PAL;
      if (rikt === 'portratt') { const B = Bild(64, 64, P); portratt(B, 0, 0, null); return { rader: rader(B), w: 64, h: 64 }; }
      const B = Bild(FW, FH, P); figur(B, 0, 0, rikt, { arm }); return { rader: rader(B), w: FW, h: FH };
    },
    // en version som PNG på gräset (skala gånger större), och under den sakerna i sitt sammanhang (bredvid en kolonist)
    png(v, skala = 4, slag = []) {
      const P = PAL, V = version(v, slag.includes('hopsatt')), B = markBild(V.w, V.h, P); V.rita(B, P, 0);
      let M = B; const S = (v.bilder || []).filter(b => b.rader?.length).map(b => KONTROLL.bildAvRader(b.rader)).sort((a, b) => b.w * b.h - a.w * a.h)[0];
      if (S && window.KONTROLL && S.w <= 96 && S.h <= 64) { const C = KONTROLL.iSpelet(S, P, slag), A = Bild(Math.max(B.w, C.w), B.h + 4 + C.h, P);
        for (let i = 0; i < A.px.length; i++) A.px[i] = P.i('kol', 0);
        for (const [D, y0] of [[B, 0], [C, B.h + 4]]) for (let y = 0; y < D.h; y++) for (let x = 0; x < D.w; x++) { const c = D.px[y * D.w + x]; if (c >= 0) A.satt(x, y0 + y, c); }
        M = A; }
      const c = document.createElement('canvas'); tillCanvas(M, c, 0); const t = document.createElement('canvas'); t.width = M.w * skala; t.height = M.h * skala;
      const g = t.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, t.width, t.height); return t.toDataURL('image/png').split(',')[1];
    },
    // behållarna som finns i spelet (Björn efter bildstil v237: inga nya behållare): den stora lerkrukan och näverasken
    behallarePng(skala = 4) {
      const lista = [typeof BILDFILER !== 'undefined' && BILDFILER.sym_kruka?.rader, FORSLAG.f9_naverask?.versioner?.[2]?.bilder?.[0]?.rader].filter(Boolean);
      return this.png({ bilder: lista.map((rader, i) => ({ namn: 'behållare ' + (i + 1), rader })) }, skala, ['ingen']);
    },
    // kolonisten framifrån, från sidan och bakifrån och porträttet, utan något, som PNG (underlaget för det som bärs)
    underlagPng(skala = 4) { return this.png({ fram: {}, sida: {}, bak: {}, portratt: {} }, skala); },
    // ett kort i valdelen som PNG (det nuvarande kortet, när det ska ändras)
    kortPng(id) { return KONTROLL.kortPng(id, 3); },
    // kortets text utan det som lagts till: API:ts rad först och historiken sist (förra kommentaren, Björns val)
    grund(vad = '') { return vad.split(FORE).join('').replace(/(Din kommentar förra gången|Du bad mig|Jag valde|Ritad av API:t).*$/s, '').trim(); },
    // kortets uppgifter för frågan
    info(id) { const s = VAL.find(x => x.id === id); if (!s) return null; const slag = KONTROLL.slagAv(s.namn, s.slag); return { id, namn: s.namn, vad: s.grund || window.FORSLAGEN.grund(s.vad), slag: s.slag || null, bars: slag.some(x => x.id === 'bars'), slagNamn: slag.map(x => x.id) }; },
    // kontrollerna på versionerna: fel per version (utom olika) och olika för hela kortet
    kontroll(d) { const r = KONTROLL.kort(window.FORSLAGEN.kort(d)).resultat.filter(x => !x.ok); return r.map(x => ({ version: x.version, kontroll: x.kontroll, text: x.text })); },
    // ett förslag (som det sparas) som ett kort, för kontrollen innan det sparas
    kort(d) {
      const hopsatt = Array.isArray(d.slag) ? d.slag.includes('hopsatt') : /^(staket|staketet|gärdsgård|gärdsgården|stängsel|stängslet|hägnad|hägnaden)$/i.test((d.namn || '').trim().split(/\s+/)[0]);
      return { id: d.kort, namn: d.namn, slag: d.slag, typ: 'tre', vad: d.vad, versioner: d.versioner.map(v => version(v, hopsatt)) };
    },
  };
  for (const d of Object.values(FORSLAG)) {
    const i = VAL.findIndex(s => s.id === d.kort), grund = d.om || window.FORSLAGEN.grund(d.vad);
    const vad = `${FORE} ${grund}${d.kommentar ? ' Din kommentar förra gången: ”' + d.kommentar + '”' : ''}`;
    const s = { ...window.FORSLAGEN.kort(d), vad, grund, ...(i >= 0 && VAL[i].slag ? { slag: VAL[i].slag } : {}) };
    if (i >= 0) VAL[i] = s; else VAL.push(s);
  }
})();
