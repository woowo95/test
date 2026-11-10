// Kontrollerna och sammanhanget för alla bildförslag (Björn efter bildstil v235): samma kontroller och samma sammanhang
// oavsett varifrån bilden kommer: programmeringschattens egna ritningar i valdelen (VAL i fas*.js och svar/), API:ts bilder
// (bilder.json, bilder/<id>.json och api/bilder.mjs) och allt annat som ritas. Sidan kör dem på varje valkort och visar
// resultatet som symboler (✓ eller ⚠, texten när man håller över eller trycker); API-skripten kör dem genom sidan
// (window.KONTROLL) och ritar om det som inte går igenom; node bildstil/kontrollera.mjs kör dem på allt före publiceringen
// och sparar sammanhangen som bilder, som Claude tittar på innan sidan publiceras.
//
// Registret SLAG säger vilka slags saker som finns och vilka kontroller som gäller dem. En sak får sitt slag ur ord i namnet,
// eller uttryckligen: slag: ['station'] på raden i VAL eller bilder.json (en tom lista: inga kontroller av form). Kontrollen
// att versionerna skiljer sig i form gäller alla kort med flera versioner.
(() => {
  const SLAG = [
    { id: 'symmetrisk', namn: 'Symmetrisk', ord: /kruk|skål|sköld|tunna|tunnor|kärl|kopp|kann[ae]\b|bägar|urna|flask|kittel|hink|ämbar|bytta|krus|bunke|bryggkar/i,
      kontroller: ['symmetri'], text: 'En kruka, en skål, en sköld eller en tunna är symmetrisk på riktigt och har en spegelsymmetrisk form; bara ljuset och kornet skiljer sidorna åt.' },
    { id: 'station', namn: 'Station', ord: /bänk|bord\b|bordet|station|härd|bädd|städ|ässja|ugn|rökeri|kista|säng|stekhäll/i,
      kontroller: ['perspektiv'], text: 'Stationer, bänkar, bord, bäddar och härdar ses snett ovanifrån: en yta ovanifrån och en mörkare framkant, aldrig rakt från sidan. Formen är annars fri.' },
    { id: 'bars', namn: 'Bärs', ord: /rem\b|remmen|båge|bågen|koger|säck|sele|väska|pung|kappa|mantel|sjal|tunika|skjorta|bälte|plagg|protes|förband|spjäla|remsa/i,
      kontroller: ['huvudet', 'allaHall'], text: 'Det man bär sitter som det logiskt gör: remmar och strängar går runt kroppen, aldrig genom huvudet eller ansiktet, och det visas på kolonisten i alla fyra riktningar och i porträttet.' },
    { id: 'plagg', namn: 'Plagg', ord: /kappa|mantel|sjal|tunika|skjorta|plagg|tröja|rock\b|kjol|byxor|klänning/i, kontroller: [], halsen: true,
      text: 'Ett plagg får gå upp till halsen: kragen och sjalen täcker halsen och hakan, men aldrig ansiktet.' },
    { id: 'mark', namn: 'Mark', ord: /^(hage|hagen|äng|ängen|slåtteräng|slåtterängen|åker|åkern|fält|fältet|ruta|rutan)$/i, kontroller: [], utom: ['olika'],
      text: 'En markruta fyller hela rutan, så versionerna skiljer sig i mönstret och inte i formen.' },
    { id: 'huvud', namn: 'På huvudet', ord: /huva|hatt|mössa|hjälm|luva|bonad|krona|krans|pannband|ögonlapp/i, kontroller: [], utom: ['huvudet'],
      text: 'Det som sitter på huvudet får täcka huvudet.' },
  ];
  const KONTROLLNAMN = { symmetri: 'Symmetrisk form', perspektiv: 'Snett ovanifrån', huvudet: 'Inget genom huvudet', allaHall: 'På kolonisten åt alla håll', olika: 'Versionerna skiljer sig i form' };
  const GRANS = { symmetri: 0.86, olika: 0.9, ytan: 0.4, ben: 0.45, framkant: 0.04 };

  // vilka slag en sak har: uttryckligen (slag på raden) eller ur orden i namnet
  function slagAv(namn = '', slag = null) {
    if (Array.isArray(slag)) return SLAG.filter(s => slag.includes(s.id));
    // orden prövas på det första ordet i namnet (huvudordet: Lerkrukans tre storlekar, inte Talgljus på bordet)
    const forsta = (namn.trim().split(/\s+/)[0] || '');
    const ut = SLAG.filter(s => s.ord.test(forsta));
    return ut.some(s => s.id === 'huvud') ? ut.filter(s => s.id !== 'bars' || /rem|båge|koger|säck/i.test(namn)) : ut;
  }
  const kontrollerAv = slag => { const k = new Set(slag.flatMap(s => s.kontroller)); for (const s of slag) for (const u of s.utom || []) k.delete(u); return k; };

  // ---------- bilderna som masker ----------
  const P0 = () => PAL;
  const ljus = (P, i) => P.cols[i].lab[0];
  // beskär en bild till det som är ritat
  function beskar(B) {
    let x0 = B.w, y0 = B.h, x1 = -1, y1 = -1;
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) if (B.px[y * B.w + x] >= 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    const w = x1 - x0 + 1, h = y1 - y0 + 1, px = new Int16Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px[y * w + x] = B.px[(y + y0) * B.w + x + x0];
    return { w, h, px, x0, y0, P: B.P || P0() };
  }
  const fylld = C => { let n = 0; for (const v of C.px) if (v >= 0) n++; return n / C.px.length; };
  // en bild i API:ts tecken (bilder.json: porträttens fasta färger, . är genomskinligt)
  function bildAvRader(rader) {
    const T = PORTRATT.tecken, P = P0(), w = Math.max(...rader.map(r => r.length)), h = rader.length, B = Bild(w, h, P);
    rader.forEach((r, y) => [...r].forEach((ch, x) => { const t = T[ch]; if (ch !== '.' && t && /\d$/.test(t)) B.satt(x, y, P.i(t.slice(0, -1), +t.slice(-1))); }));
    return B;
  }

  // ---------- kontrollerna ----------
  // symmetri: formen (det ritade, inte färgerna) speglad kring sin mitt täcker sig själv
  function symmetri(B) {
    const C = beskar(B); if (!C || C.w < 5 || C.h < 5) return null;
    let bast = 0;
    for (const sk of [-1, 0, 1]) {
      let snitt = 0, union = 0;
      for (let y = 0; y < C.h; y++) for (let x = 0; x < C.w; x++) {
        const a = C.px[y * C.w + x] >= 0, xs = C.w - 1 - x + sk, b = xs >= 0 && xs < C.w && C.px[y * C.w + xs] >= 0;
        if (a && b) snitt++; if (a || b) union++;
      }
      bast = Math.max(bast, union ? snitt / union : 1);
    }
    const ok = bast >= GRANS.symmetri;
    return { ok, varde: +bast.toFixed(2), text: ok ? `Formen är symmetrisk (${Math.round(bast * 100)} %).` : `Formen är inte symmetrisk: bara ${Math.round(bast * 100)} % av den täcker sig själv speglad (minst ${Math.round(GRANS.symmetri * 100)} %). Rita vänster och höger sida lika, och låt bara ljuset skilja dem.` };
  }
  // perspektivet för stationer: en yta ovanifrån (en lång följd breda rader), en mörkare framkant längst ner i den och
  // korta ben under. En sidovy har en smal skiva och långa ben; en ren framifrånvy har ingen mörkare framkant
  function perspektiv(B) {
    const C = beskar(B); if (!C || C.h < 6) return null;
    const P = C.P, cov = [], lum = [];
    for (let y = 0; y < C.h; y++) { let n = 0, s = 0; for (let x = 0; x < C.w; x++) { const v = C.px[y * C.w + x]; if (v >= 0) { n++; s += ljus(P, v); } } cov.push(n / C.w); lum.push(n ? s / n : 0); }
    let a = -1, b = -1, ba = -1, bb = -2;
    for (let y = 0; y <= C.h; y++) { if (y < C.h && cov[y] >= 0.55) { if (a < 0) a = y; b = y; } else if (a >= 0) { if (b - a > bb - ba) { ba = a; bb = b; } a = -1; } }
    // höga delar vid bakkanten (stolpar, ramar) räknas inte: ytan jämförs med höjden från den första breda raden
    const forsta = cov.findIndex(c => c >= 0.55), hojd = C.h - Math.max(0, forsta);
    const yta = bb - ba + 1, under = C.h - 1 - bb, fel = [];
    if (yta < GRANS.ytan * hojd) fel.push(`ingen yta ovanifrån: bara ${Math.max(0, yta)} av ${hojd} rader är breda, som en skiva sedd från sidan`);
    if (under > Math.max(6, GRANS.ben * C.h)) fel.push(`benen eller det under ytan är ${under} punkter höga, som från sidan (högst 6, bara stumpar)`);
    if (yta >= 7) {
      const med = (y0, y1) => { let s = 0, n = 0; for (let y = y0; y <= y1; y++) { s += lum[y] * cov[y]; n += cov[y]; } return n ? s / n : 0; };
      const topp = med(ba + 1, bb - 3), kant = med(bb - 2, bb);
      if (topp - kant < GRANS.framkant * Math.max(topp, 1e-6)) fel.push('ingen mörkare framkant under ytan, som en vy rakt framifrån');
    }
    return { ok: !fel.length, text: fel.length ? 'Inte snett ovanifrån: ' + fel.join('; ') + '.' : 'Snett ovanifrån: en yta ovanifrån och en mörkare framkant.' };
  }
  // formen jämförd mellan två bilder (0–1): det ritade (masken) och gränserna mellan material, en punkts nåd. Färgerna räknas
  // inte: en version som bara har andra färger eller toner är samma form
  function kanter(C) {
    const e = new Uint8Array(C.w * C.h), r = i => C.px[i] < 0 ? -1 : C.px[i] >> 2;
    for (let y = 0; y < C.h; y++) for (let x = 0; x < C.w; x++) { const i = y * C.w + x; if (C.px[i] < 0) continue; if ((x + 1 < C.w && r(i + 1) !== r(i)) || (y + 1 < C.h && r(i + C.w) !== r(i)) || x === 0 || y === 0 || x === C.w - 1 || y === C.h - 1 || r(i - 1) !== r(i) || r(i - C.w) !== r(i)) e[i] = 1; }
    return e;
  }
  function likhet(A, B) {
    const a = beskar(A), b = beskar(B); if (!a || !b) return 0;
    const W = Math.max(a.w, b.w), H = Math.max(a.h, b.h);
    if ((a.w * a.h) / (b.w * b.h) < 0.6 || (b.w * b.h) / (a.w * a.h) < 0.6) return 0.3;
    const lagg = (C, f) => { const ut = new Int16Array(W * H).fill(-1), ox = (W - C.w) >> 1, oy = (H - C.h) >> 1; for (let y = 0; y < C.h; y++) for (let x = 0; x < C.w; x++) ut[(y + oy) * W + x + ox] = f[y * C.w + x]; return ut; };
    const ma = lagg(a, a.px), mb = lagg(b, b.px), ea = lagg(a, kanter(a)), eb = lagg(b, kanter(b));
    let snitt = 0, union = 0;
    for (let i = 0; i < W * H; i++) { const x = ma[i] >= 0, y = mb[i] >= 0; if (x && y) snitt++; if (x || y) union++; }
    const nara = (e, i) => { const x = i % W, y = (i / W) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && e[Y * W + X] > 0) return true; } return false; };
    let na = 0, ta = 0, nb = 0, tb = 0;
    for (let i = 0; i < W * H; i++) { if (ea[i] > 0) { na++; if (nara(eb, i)) ta++; } if (eb[i] > 0) { nb++; if (nara(ea, i)) tb++; } }
    const kant = na + nb ? (ta + tb) / (na + nb) : 1, iou = union ? snitt / union : 1;
    if (!(fylld(a) > 0.9 && fylld(b) > 0.9)) return 0.5 * iou + 0.5 * kant;
    // en hel scen med egen mark: bara det som skiljer de två åt (och en punkt runt det) jämförs, så att marken inte räknas
    const D = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) if (ma[i] !== mb[i]) D[i] = 1;
    let n1 = 0, t1 = 0, s1 = 0, u1 = 0;
    for (let i = 0; i < W * H; i++) {
      if (!nara(D, i)) continue;
      if (ea[i] > 0) { n1++; if (nara(eb, i)) t1++; } if (eb[i] > 0) { n1++; if (nara(ea, i)) t1++; }
    }
    return n1 ? t1 / n1 : 1;
  }
  function olika(bilder) {
    const ut = [];
    for (let j = 1; j < bilder.length; j++) for (let i = 0; i < j; i++) {
      const l = likhet(bilder[i], bilder[j]);
      if (l >= GRANS.olika) ut.push({ ok: false, version: j + 1, text: `Version ${j + 1} har nästan samma form som version ${i + 1} (${Math.round(l * 100)} % lika): versionerna ska vara olika idéer i form eller byggsätt, inte andra färger.` });
    }
    return ut;
  }

  // ---------- kolonisterna och porträtten i en ritning ----------
  // var en figur (ur BYBO, SMABARN eller porträttet) ligger i ritningen: den plats där flest av dess punkter är oförändrade
  function hitta(B, F) {
    if (F.plats) return F.plats; // den som ritat figuren har sagt var (forslag.js): kläder kan täcka den så att den inte känns igen
    const pts = []; for (let i = 0; i < F.px.length; i++) if (F.px[i] >= 0) pts.push(i);
    if (!pts.length || F.w > B.w || F.h > B.h) return null;
    const prov = pts.filter((_, k) => k % Math.max(1, (pts.length / 24) | 0) === 0);
    let bast = null, bn = 0;
    for (let oy = 0; oy <= B.h - F.h; oy++) for (let ox = 0; ox <= B.w - F.w; ox++) {
      let n = 0; for (const i of prov) if (B.px[(oy + ((i / F.w) | 0)) * B.w + ox + (i % F.w)] === F.px[i]) n++;
      if (n < prov.length * 0.6) continue;
      n = 0; for (const i of pts) if (B.px[(oy + ((i / F.w) | 0)) * B.w + ox + (i % F.w)] === F.px[i]) n++;
      if (n > bn) { bn = n; bast = { ox, oy }; }
    }
    return bast && bn >= pts.length * 0.55 ? bast : null;
  }
  // ritningen utan kolonisternas och porträttens oförändrade punkter: kvar blir det som ritats på dem och sakerna bredvid
  function utanFigurer(R) {
    const B = Bild(R.B.w, R.B.h, R.B.P); B.px.set(R.B.px);
    for (const [F, pl] of R.hittade) for (let i = 0; i < F.px.length; i++) {
      const j = (pl.oy + ((i / F.w) | 0)) * B.w + pl.ox + (i % F.w);
      if (F.px[i] >= 0 && B.px[j] === F.px[i]) B.px[j] = -1;
    }
    return B;
  }
  // huvudet utan de nedersta raderna (halsen och hakan), för plagg som går upp till halsen
  function utanHalsen(mask, w, n) {
    let sist = -1; for (let i = 0; i < mask.length; i++) if (mask[i]) sist = (i / w) | 0;
    return mask.map((m, i) => m && ((i / w) | 0) <= sist - n ? 1 : 0);
  }
  // det som ritats över huvudet (kartfiguren) eller ansiktet (porträttet)
  function overHuvudet(B, F, plats, mask) {
    let n = 0; for (let i = 0; i < F.px.length; i++) if (mask[i] && F.px[i] >= 0 && B.px[(plats.oy + ((i / F.w) | 0)) * B.w + plats.ox + (i % F.w)] !== F.px[i]) n++;
    return n;
  }

  // ---------- en version ritad för kontrollen: utan bakgrund, med kolonisterna, porträtten och småbilderna inspelade ----------
  function spela(v, P) {
    const B = Bild(Math.max(1, v.w), Math.max(1, v.h), P), rec = { sprites: [], figurer: [], portratt: [] };
    const oS = window.ritaSprite, oBybo = window.BYBO, oSma = window.SMABARN, PR = window.PORTRATTEN, oPort = PR && PR.portratt;
    window.ritaSprite = (D, rader, legend, x0, y0, l) => { if (D === B) { const w = Math.max(...rader.map(r => r.length)), S = Bild(w, rader.length, P); oS(S, rader, legend, 0, 0, l); rec.sprites.push(S); } return oS(D, rader, legend, x0, y0, l); };
    if (oBybo) window.BYBO = (...a) => { const F = oBybo(...a); rec.figurer.push({ F, rikt: a[1] }); return F; };
    if (oSma) window.SMABARN = (...a) => { const F = oSma(...a); rec.figurer.push({ F, rikt: a[1] }); return F; };
    if (oPort) PR.portratt = (...a) => { const Q = oPort(...a); rec.portratt.push(Q); return Q; };
    try { v.rita(B, P, 0); } catch (e) { rec.fel = e.message; }
    finally { window.ritaSprite = oS; if (oBybo) window.BYBO = oBybo; if (oSma) window.SMABARN = oSma; if (oPort) PR.portratt = oPort; }
    return { B, ...rec };
  }
  // sakerna i en ritning: de sammanhängande ritade delarna utom kolonisterna och porträtten; är ritningen en hel scen med
  // egen mark används småbilderna (ritaSprite) i stället
  function saker(R) {
    const { B } = R, w = B.w, h = B.h, bort = new Uint8Array(w * h);
    for (const [F, pl] of R.hittade) for (let i = 0; i < F.px.length; i++) if (F.px[i] >= 0) { const x = pl.ox + (i % F.w), y = pl.oy + ((i / F.w) | 0); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h) bort[Y * w + X] = 1; } }
    const sedd = new Uint8Array(w * h), ut = [];
    for (let s = 0; s < w * h; s++) {
      if (sedd[s] || bort[s] || B.px[s] < 0) continue;
      const stack = [s], del = []; sedd[s] = 1;
      while (stack.length) { const i = stack.pop(); del.push(i); const x = i % w, y = (i / w) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy, j = Y * w + X; if (X >= 0 && Y >= 0 && X < w && Y < h && !sedd[j] && !bort[j] && B.px[j] >= 0) { sedd[j] = 1; stack.push(j); } } }
      if (del.length < 20) continue;
      let x0 = w, y0 = h, x1 = 0, y1 = 0; for (const i of del) { const x = i % w, y = (i / w) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const S = Bild(x1 - x0 + 1, y1 - y0 + 1, B.P); for (const i of del) S.px[(((i / w) | 0) - y0) * S.w + (i % w) - x0] = B.px[i];
      ut.push(S);
    }
    const scen = ut.some(S => S.w * S.h >= 0.6 * w * h && fylld(S) > 0.85);
    return scen ? { scen: true, lista: R.sprites.filter(S => S.px.reduce((n, v) => n + (v >= 0), 0) >= 20) } : { scen: false, lista: ut };
  }

  // ---------- ett kort: alla kontroller på alla versioner ----------
  // s: { id, namn, versioner: [{ w, h, rita }], slag?, typ }. Ger en lista med { kontroll, version, ok, text }
  function kort(s, P = P0()) {
    const slag = slagAv(s.namn, s.slag), k = kontrollerAv(slag), ut = [], ritade = [];
    s.versioner.forEach((v, n) => {
      if (!v.rita) return;
      const R = spela(v, P); ritade.push(R.B);
      if (R.fel) { ut.push({ kontroll: 'ritas', version: n + 1, ok: false, text: 'Ritningen kraschar: ' + R.fel }); return; }
      R.hittade = [];
      for (const { F } of R.figurer) { const pl = hitta(R.B, F); if (pl) R.hittade.push([F, pl, 'karta']); }
      for (const Q of R.portratt) { const pl = hitta(R.B, Q); if (pl) R.hittade.push([Q, pl, 'portratt']); }
      if (R.hittade.length) ritade[ritade.length - 1] = utanFigurer(R); // versionerna jämförs på det som bärs, inte på kolonisten
      const { scen, lista } = saker(R);
      if (k.has('symmetri')) for (const S of lista) { const r = symmetri(S); if (r) ut.push({ kontroll: 'symmetri', version: n + 1, ...r }); }
      if (k.has('perspektiv')) { const stor = lista.slice().sort((a, b) => b.w * b.h - a.w * a.h)[0]; const r = stor && !scen && perspektiv(stor); if (r) ut.push({ kontroll: 'perspektiv', version: n + 1, ...r }); }
      if (k.has('huvudet')) for (const [F, pl, sort] of R.hittade) {
        let mask = sort === 'karta' ? F.huvud : F.ansikte; if (!mask) continue;
        if (slag.some(x => x.halsen)) mask = utanHalsen(mask, F.w, sort === 'karta' ? 2 : 6);
        const over = overHuvudet(R.B, F, pl, mask);
        ut.push({ kontroll: 'huvudet', version: n + 1, ok: over === 0, text: over === 0 ? (sort === 'karta' ? 'Inget går över kolonistens huvud.' : 'Inget går över ansiktet i porträttet.') : `${over} punkter är ritade över ${sort === 'karta' ? 'kolonistens huvud' : 'ansiktet i porträttet'}: en rem eller sträng går runt kroppen, aldrig genom huvudet.` });
      }
      if (k.has('allaHall')) {
        const hall = new Set(R.figurer.filter(f => R.hittade.some(([F]) => F === f.F)).map(f => f.rikt)), saknas = [];
        for (const [r, t] of [['fram', 'framifrån'], ['sida', 'från sidan'], ['bak', 'bakifrån']]) if (!hall.has(r) && !(r === 'sida' && hall.has('vast'))) saknas.push(t);
        if (!R.hittade.some(h => h[2] === 'portratt')) saknas.push('i porträttet');
        if (n === 0 || saknas.length) ut.push({ kontroll: 'allaHall', version: n + 1, ok: !saknas.length, text: saknas.length ? 'Visas inte på kolonisten ' + saknas.join(', ') + '.' : 'Visas på kolonisten åt alla håll och i porträttet.' });
      }
    });
    if (ritade.length > 1 && s.typ !== 'janej' && !slag.some(x => (x.utom || []).includes('olika'))) { const o = olika(ritade); ut.push(...o.map(x => ({ kontroll: 'olika', ...x }))); if (!o.length) ut.push({ kontroll: 'olika', version: 0, ok: true, text: 'Versionerna skiljer sig i form.' }); }
    return { slag: slag.map(x => x.id), resultat: ut };
  }
  // en enda bild i API:ts tecken (bilder.mjs och rita.mjs): kontrollerna som gäller den, utan olika
  function rader(o) {
    const slag = slagAv(o.namn || '', o.slag || null);
    const k = kontrollerAv([...new Set(slag)]), B = bildAvRader(o.rader), ut = [];
    if (k.has('symmetri')) { const r = symmetri(B); if (r) ut.push({ kontroll: 'symmetri', ...r }); }
    if (k.has('perspektiv')) { const r = perspektiv(B); if (r) ut.push({ kontroll: 'perspektiv', ...r }); }
    return ut;
  }
  const olikaRader = lista => olika(lista.map(bildAvRader));

  // ---------- sammanhanget: varje version i spelets storlek på gräset, bredvid en kolonist och godkända saker ----------
  const GODKANDA = () => typeof BILDER === 'undefined' ? [] : ['yxa', 'ved', 'kniv'].filter(id => BILDER.bilder.find(b => b.id === id)?.godkand && BILDFILER[id]);
  function klistra(M, S, x0, y0) { for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) { const v = S.px[y * S.w + x]; if (v >= 0) M.satt(x0 + x, y0 + y, v); } }
  function iSpelet(S, P = P0()) {
    const F = window.BYBO ? window.BYBO(1, 'fram', 'sta', 'hanga', null) : null, g = GODKANDA().map(id => bildAvRader(BILDFILER[id].rader));
    const W = 6 + (F ? F.w + 6 : 0) + S.w + 6 + g.reduce((s, G) => s + G.w + 4, 0) + 4, H = Math.max(S.h, F ? F.h : 0, 16) + 10, M = markBild(W, H, P, 410, 430);
    let x = 6; const fot = H - 4;
    if (F) { klistra(M, F, x, fot - F.h); for (let d = 3; d < F.w - 3; d++) M.morka(x + d, fot); x += F.w + 6; }
    for (let yy = 0; yy < S.h; yy++) for (let xx = 0; xx < S.w; xx++) if (S.px[yy * S.w + xx] >= 0 && !(yy + 1 < S.h && xx + 1 < S.w && S.px[(yy + 1) * S.w + xx + 1] >= 0)) M.morka(x + xx + 1, fot - S.h + yy + 1);
    klistra(M, S, x, fot - S.h); x += S.w + 6;
    for (const G of g) { klistra(M, G, x, fot - G.h); x += G.w + 4; }
    return M;
  }
  // sammanhanget för ett kort: en bild per version av den största saken, eller null när versionen är en hel scen
  function sammanhang(s, P = P0()) {
    return s.versioner.map(v => {
      if (!v.rita) return null;
      const R = spela(v, P); R.hittade = [];
      for (const { F } of R.figurer) { const pl = hitta(R.B, F); if (pl) R.hittade.push([F, pl]); }
      for (const Q of R.portratt) { const pl = hitta(R.B, Q); if (pl) R.hittade.push([Q, pl]); }
      const { scen, lista } = saker(R); if (scen || !lista.length) return null;
      const S = lista.slice().sort((a, b) => b.px.reduce((n, x) => n + (x >= 0), 0) - a.px.reduce((n, x) => n + (x >= 0), 0))[0];
      return S.w > 96 || S.h > 64 ? null : iSpelet(S, P);
    });
  }

  // ---------- på valkortet: symbolerna och sammanhanget ----------
  function visa(s, el, P = P0()) {
    let r; try { r = kort(s, P); } catch (e) { r = { slag: [], resultat: [{ kontroll: 'ritas', ok: false, text: 'Kontrollen kraschade: ' + e.message }] }; }
    s.kontroll = r;
    const fel = r.resultat.filter(x => !x.ok), d = document.createElement('details'); d.className = 'kontroll' + (fel.length ? ' fel' : '');
    const sym = fel.length ? '⚠' : '✓', namn = [...new Set(r.resultat.map(x => x.kontroll))].map(k => KONTROLLNAMN[k] || k);
    d.innerHTML = `<summary title="${fel.length ? fel.length + ' saker bryter mot reglerna' : 'Kontrollerna gick igenom'}"><span aria-hidden="true">${sym}</span> <span class="vh">${fel.length ? 'Kontrollerna hittade fel' : 'Kontrollerna gick igenom'}</span></summary>`;
    const ul = document.createElement('ul');
    for (const x of (fel.length ? fel : r.resultat).slice(0, 12)) { const li = document.createElement('li'); li.textContent = (x.ok ? '✓ ' : '⚠ ') + (x.version ? 'Version ' + x.version + ': ' : '') + (KONTROLLNAMN[x.kontroll] || x.kontroll) + '. ' + x.text; ul.append(li); }
    if (!r.resultat.length) { const li = document.createElement('li'); li.textContent = 'Inga kontroller gäller den här saken' + (r.slag.length ? '' : ' (inget slag i registret)') + '.'; ul.append(li); }
    d.append(ul); el.querySelector('header')?.append(d);
    // sammanhanget under varje version
    let bilder = []; try { bilder = sammanhang(s, P); } catch (e) { bilder = []; }
    el.querySelectorAll('.alternativ > figure.alt:not(.idag):not(.din)').forEach((f, i) => {
      const M = bilder[i]; if (!M) return;
      const c = document.createElement('canvas'); tillCanvas(M, c, 2); c.className = 'i-spelet'; c.title = 'I spelets storlek på gräset, bredvid en kolonist och godkända saker'; c.setAttribute('aria-label', c.title);
      f.querySelector('.bilder')?.append(c);
    });
  }

  // ---------- för kontrollera.mjs: allt på en gång ----------
  function allt() {
    const ut = [];
    for (const s of VAL) { const r = kort(s); ut.push({ id: s.id, namn: s.namn, slag: r.slag, fel: r.resultat.filter(x => !x.ok), antal: r.resultat.length }); }
    if (typeof BILDFILER !== 'undefined') for (const [id, d] of Object.entries(BILDFILER)) {
      const rad = BILDER.bilder.find(b => b.id === id); if (!rad || !d.rader) continue;
      const lista = d.versioner ? d.versioner.map(v => v.rader) : [d.rader];
      const fel = lista.flatMap((r, n) => rader({ ...rad, rader: r }).filter(x => !x.ok).map(x => ({ ...x, version: lista.length > 1 ? n + 1 : 0 })));
      if (lista.length > 1) fel.push(...olikaRader(lista).map(x => ({ kontroll: 'olika', ...x })));
      ut.push({ id: 'bild:' + id, namn: rad.namn, fel, antal: 1 });
    }
    return ut;
  }
  // ett korts versioner och sammanhang som en PNG, för Claude att titta på före publiceringen
  function kortPng(id, skala = 3) {
    const s = VAL.find(x => x.id === id); if (!s) return null;
    const P = P0(), bitar = [];
    s.versioner.forEach((v, i) => { if (!v.rita) return; const B = markBild(v.w, v.h, P); try { v.rita(B, P, 0); } catch (e) {} bitar.push(B); });
    sammanhang(s, P).forEach(M => { if (M) bitar.push(M); });
    const G = 4, W = Math.max(...bitar.map(B => B.w)), H = bitar.reduce((n, B) => n + B.h + G, 0), A = Bild(W, H, P);
    for (let i = 0; i < A.px.length; i++) A.px[i] = P.i('kol', 0);
    let y = 0; for (const B of bitar) { klistra(A, B, 0, y); y += B.h + G; }
    const c = document.createElement('canvas'); tillCanvas(A, c, 0); const t = document.createElement('canvas'); t.width = A.w * skala; t.height = A.h * skala;
    const g = t.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, t.width, t.height); return t.toDataURL('image/png').split(',')[1];
  }

  // en API-ritning (rader) i sitt sammanhang som PNG: på gräset bredvid en kolonist och godkända saker (bilder.mjs granskning)
  function iSpeletPng(rader, skala = 4) {
    const M = iSpelet(bildAvRader(rader)), c = document.createElement('canvas'); tillCanvas(M, c, 0);
    const t = document.createElement('canvas'); t.width = M.w * skala; t.height = M.h * skala;
    const g = t.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, t.width, t.height); return t.toDataURL('image/png').split(',')[1];
  }

  // ---------- API:ts tre versioner som valkort (node bildstil/api/bilder.mjs tre …) ----------
  // en bild med versioner i bilder/<id>.json (versioner: [{ ide, rader }]) och utan Björns val blir ett kort i valdelen
  if (typeof BILDFILER !== 'undefined' && typeof VAL !== 'undefined') for (const [id, d] of Object.entries(BILDFILER)) {
    if (!Array.isArray(d.versioner) || d.vald) continue;
    const rad = BILDER.bilder.find(b => b.id === id); if (!rad) continue;
    VAL.push({ id: 'bild_' + id, namn: rad.namn, typ: 'tre', slag: rad.slag, vad: `Ritad av API:t: ${rad.vad}. Tre idéer, var och en ritad för sig.${d.kommentar ? ' Din kommentar förra gången: ' + d.kommentar : ''}`,
      versioner: d.versioner.map(v => ({ text: v.ide || '', w: Math.max(...v.rader.map(r => r.length)) + 4, h: v.rader.length + 4, rita: B => klistra(B, bildAvRader(v.rader), 2, 2) })) });
  }

  window.KONTROLL = { SLAG, KONTROLLNAMN, GRANS, slagAv, symmetri, perspektiv, likhet, olika, bildAvRader, kort, rader, olikaRader, sammanhang, iSpelet, iSpeletPng, visa, allt, kortPng };
})();
