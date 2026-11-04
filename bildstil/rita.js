// ---------- ritaren (Björn 2026-11-04): rita egna bilder eller ändra färdiga, bara i palettens 32 färger ----------
// En bild är w × h punkter, varje punkt ett index i paletten (PAL.cols) eller -1 (genomskinlig). Den kan börja tom eller
// som en färdig bild: sakerna och symbolerna (BILDFILER, namnen i BILDER), gränssnittets band, hörn och vågband (GUI),
// spelets äldre symboler (IKONER) och de egna ritningarna. Färger utanför paletten blir den närmaste i paletten. Det
// sparade hamnar i databasen (samlingen ritningar) som rader och pal, samma form som bilder/*.json, så att Claude kan
// läsa det med ArtifactData och bygga in det.
(() => {
  const P = PAL, N = P.cols.length, TECKEN = BILDER.tecken; // ett tecken per färg i raderna
  let B = { w: 16, h: 16, px: new Array(256).fill(-1) }, farg = 2 * 4 + 2, verktyg = 'penna', fran = 'tom', angra = [], ritningar = {}, RDB = null;
  const $r = s => document.querySelector('#rita ' + s);

  // ---------- bilderna att börja från ----------
  const ur = (w, h, varde) => { const px = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px.push(varde(x, y)); return { w, h, px }; };
  function franRader(rader, pal, lik = P.av) {
    const h = rader.length, w = Math.max(...rader.map(r => r.length));
    return ur(w, h, (x, y) => { const ch = rader[y][x]; const c = ch && ch !== '.' && pal[ch]; if (!c) return -1; return c.startsWith('rgba') ? P.i('kol', 0) : lik(c); });
  }
  const KALLOR = { // grupp → id → { namn, bild() }
    'Tom': Object.fromEntries([[16, 16], [32, 16], [16, 32], [32, 32], [48, 48], [64, 32]].map(([w, h]) => ['tom' + w + 'x' + h, { namn: `Tom ${w} × ${h}`, bild: () => ur(w, h, () => -1) }])),
    'Saker och symboler': Object.fromEntries(BILDER.bilder.filter(b => BILDFILER[b.id]?.rader).map(b => [b.id, { namn: b.namn || b.id, bild: () => franRader(BILDFILER[b.id].rader, BILDFILER[b.id].pal) }])),
    'Gränssnittet': {
      ...Object.fromEntries(Object.entries(GUI.band).map(([k, v]) => ['band_' + k, { namn: 'Bandet ' + k, bild: () => franRader(v.rader, v.pal) }])),
      ...Object.fromEntries(Object.entries(GUI.horn).map(([k, v]) => ['horn_' + k, { namn: 'Hörnet ' + k, bild: () => franRader((v.grund || v).rader, (v.grund || v).pal) }])),
      vag: { namn: 'Vågbandet', bild: () => franRader(GUI.vag.rader, GUI.vag.pal) } },
    'Spelets äldre symboler': Object.fromEntries(Object.keys(IKONER.PIX).map(k => [k, { namn: k, bild: () => franRader(IKONER.PIX[k], IKONER.PAL[k] || {}, P.fran) }])),
  };

  // ---------- rutnätet ----------
  let ZOOM = 16;
  function rutor() {
    const c = $r('#rita-duk'), bredd = Math.min(560, c.parentElement.clientWidth || 560);
    ZOOM = Math.max(4, Math.min(48, Math.floor(bredd / B.w), Math.floor(560 / B.h)));
    c.width = B.w * ZOOM; c.height = B.h * ZOOM; c.style.width = c.width + 'px';
    const g = c.getContext('2d');
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) {
      const v = B.px[y * B.w + x];
      if (v < 0) { g.fillStyle = (x + y) % 2 ? '#2c2722' : '#35302a'; } else g.fillStyle = P.cols[v].hex;
      g.fillRect(x * ZOOM, y * ZOOM, ZOOM, ZOOM);
    }
    if (ZOOM >= 8) {
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1; g.beginPath();
      for (let x = 1; x < B.w; x++) { g.moveTo(x * ZOOM + 0.5, 0); g.lineTo(x * ZOOM + 0.5, c.height); }
      for (let y = 1; y < B.h; y++) { g.moveTo(0, y * ZOOM + 0.5); g.lineTo(c.width, y * ZOOM + 0.5); }
      g.stroke();
      g.strokeStyle = 'rgba(228,217,195,0.35)'; g.beginPath(); // var sextonde punkt: en ruta på kartan
      for (let x = 16; x < B.w; x += 16) { g.moveTo(x * ZOOM + 0.5, 0); g.lineTo(x * ZOOM + 0.5, c.height); }
      for (let y = 16; y < B.h; y += 16) { g.moveTo(0, y * ZOOM + 0.5); g.lineTo(c.width, y * ZOOM + 0.5); }
      g.stroke();
    }
    forhand();
  }
  // förhandsvisningen: på gräs i kartans storlek och dubbelt, och på mörkt
  function forhand() {
    const Mg = markBild(B.w + 8, B.h + 8, P);
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) { const v = B.px[y * B.w + x]; if (v >= 0) Mg.satt(x + 4, y + 4, v); }
    const Mk = kolBild(B.w + 4, B.h + 4, P);
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) { const v = B.px[y * B.w + x]; if (v >= 0) Mk.satt(x + 2, y + 2, v); }
    const [a, b, c] = ['#rita-gras1', '#rita-gras2', '#rita-mork'].map(s => $r(s));
    tillCanvas(Mg, a, 1); tillCanvas(Mg, b, 2); tillCanvas(Mk, c, 2);
  }

  // ---------- att rita ----------
  const spara = () => { angra.push(B.px.slice()); if (angra.length > 80) angra.shift(); };
  function fyll(x, y, ny) {
    const gammal = B.px[y * B.w + x]; if (gammal === ny) return;
    const stack = [[x, y]];
    while (stack.length) { const [i, j] = stack.pop(); if (i < 0 || j < 0 || i >= B.w || j >= B.h || B.px[j * B.w + i] !== gammal) continue; B.px[j * B.w + i] = ny; stack.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]); }
  }
  function punkt(e) { const c = $r('#rita-duk'), r = c.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * B.w), Math.floor((e.clientY - r.top) / r.height * B.h)]; }
  let ritar = false, sist = null;
  function vid(x, y) {
    if (x < 0 || y < 0 || x >= B.w || y >= B.h) return;
    if (verktyg === 'pipett') { const v = B.px[y * B.w + x]; if (v >= 0) { farg = v; valjVerktyg('penna'); visaPalett(); } return; }
    if (verktyg === 'fyll') { fyll(x, y, farg); rutor(); return; }
    const ny = verktyg === 'sudd' ? -1 : farg;
    const linje = sist ? Math.max(Math.abs(x - sist[0]), Math.abs(y - sist[1])) : 0; // dra en linje så att inga punkter hoppas över
    for (let k = 0; k <= linje; k++) { const t = linje ? k / linje : 1, i = Math.round(sist ? sist[0] + (x - sist[0]) * t : x), j = Math.round(sist ? sist[1] + (y - sist[1]) * t : y); B.px[j * B.w + i] = ny; }
    sist = [x, y]; rutor();
  }

  // ---------- paletten och knapparna ----------
  function visaPalett() {
    const p = $r('#rita-palett'); p.textContent = '';
    RAMPER.forEach(([namn, om], r) => {
      const rad = document.createElement('div'); rad.className = 'rita-ramp';
      for (let t = 0; t < 4; t++) {
        const i = r * 4 + t, k = document.createElement('button');
        k.type = 'button'; k.style.background = P.cols[i].hex; k.title = `${namn} ${t} (${om})`; k.setAttribute('aria-label', `${namn} ${t}`);
        k.setAttribute('aria-pressed', String(i === farg && verktyg !== 'sudd'));
        k.onclick = () => { farg = i; if (verktyg === 'sudd' || verktyg === 'pipett') valjVerktyg('penna'); visaPalett(); };
        rad.append(k);
      }
      p.append(rad);
    });
    $r('#rita-vald').style.background = P.cols[farg].hex; $r('#rita-vald').title = RAMPER[farg >> 2][0] + ' ' + (farg & 3);
  }
  function valjVerktyg(v) { verktyg = v; document.querySelectorAll('#rita [data-verktyg]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.verktyg === v))); visaPalett(); }
  function nyBild(b, id) { spara(); B = { w: b.w, h: b.h, px: b.px.slice() }; fran = id; $r('#rita-storlek').textContent = `${B.w} × ${B.h}`; rutor(); }
  function flytta(dx, dy) { spara(); const n = new Array(B.px.length).fill(-1); for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) { const X = x - dx, Y = y - dy; if (X >= 0 && Y >= 0 && X < B.w && Y < B.h) n[y * B.w + x] = B.px[Y * B.w + X]; } B.px = n; rutor(); }
  function spegla() { spara(); const n = B.px.slice(); for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) n[y * B.w + x] = B.px[y * B.w + B.w - 1 - x]; B.px = n; rutor(); }
  function storlek(w, h) { spara(); const n = new Array(w * h).fill(-1); for (let y = 0; y < Math.min(h, B.h); y++) for (let x = 0; x < Math.min(w, B.w); x++) n[y * w + x] = B.px[y * B.w + x]; B = { w, h, px: n }; $r('#rita-storlek').textContent = `${w} × ${h}`; rutor(); }

  // ---------- att spara ----------
  const slug = s => s.toLowerCase().replace(/å|ä/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60) || 'ritning';
  function tillRader() { // samma form som bilder/*.json: rader med ett tecken per färg och pal från tecknet till färgen
    const pal = {}, rader = [];
    for (let y = 0; y < B.h; y++) { let r = ''; for (let x = 0; x < B.w; x++) { const v = B.px[y * B.w + x]; if (v < 0) r += '.'; else { r += TECKEN[v]; pal[TECKEN[v]] = P.cols[v].hex; } } rader.push(r); }
    return { rader, pal };
  }
  async function sparaRitning() {
    const status = $r('#rita-status'), namn = $r('#rita-namn').value.trim();
    if (!namn) { status.textContent = 'Skriv ett namn på bilden först.'; $r('#rita-namn').focus(); return; }
    if (!RDB) { status.textContent = 'Det går bara att spara när sidan är öppen i Claude och du är inloggad.'; return; }
    const id = slug(namn);
    try { await RDB.doc('ritningar/' + id).set({ namn, kommentar: $r('#rita-kommentar').value.trim(), w: B.w, h: B.h, ...tillRader(), fran, tid: Date.now() }); status.textContent = `Sparad som ”${namn}”. Claude kan nu läsa den.`; }
    catch (e) { status.textContent = 'Det gick inte att spara: ' + (e?.message || e); }
  }
  function visaRitningar() {
    const lista = $r('#rita-mina'); lista.textContent = '';
    const alla = Object.entries(ritningar).sort((a, b) => (b[1].tid || 0) - (a[1].tid || 0));
    if (!alla.length) { lista.innerHTML = '<p class="not">Inga sparade bilder än.</p>'; return; }
    for (const [id, r] of alla) {
      const f = document.createElement('figure'); f.className = 'rita-mitt';
      const c = document.createElement('canvas'), bild = franRader(r.rader, r.pal), K = kolBild(bild.w, bild.h, P);
      bild.px.forEach((v, i) => { if (v >= 0) K.px[i] = v; }); tillCanvas(K, c, Math.max(1, Math.min(4, Math.floor(64 / bild.w))));
      const cap = document.createElement('figcaption'); cap.textContent = r.namn + (r.kommentar ? ': ' + r.kommentar : '');
      const oppna = document.createElement('button'); oppna.type = 'button'; oppna.textContent = 'Öppna';
      oppna.onclick = () => { nyBild(bild, 'ritning:' + id); $r('#rita-namn').value = r.namn; $r('#rita-kommentar').value = r.kommentar || ''; $r('#rita-duk').scrollIntoView({ block: 'nearest' }); };
      const bort = document.createElement('button'); bort.type = 'button'; bort.textContent = 'Ta bort';
      bort.onclick = async () => { if (!confirm(`Ta bort ”${r.namn}”?`)) return; try { await RDB.doc('ritningar/' + id).delete(); } catch (e) { $r('#rita-status').textContent = 'Det gick inte att ta bort: ' + (e?.message || e); } };
      const kn = document.createElement('div'); kn.className = 'knappar'; kn.append(oppna, bort);
      f.append(c, cap, kn); lista.append(f);
    }
  }

  // ---------- att bygga delen ----------
  function bygg() {
    const val = $r('#rita-fran');
    for (const [grupp, poster] of Object.entries(KALLOR)) {
      const og = document.createElement('optgroup'); og.label = grupp;
      for (const [id, p] of Object.entries(poster).sort((a, b) => grupp === 'Tom' ? 0 : a[1].namn.localeCompare(b[1].namn, 'sv'))) { const o = document.createElement('option'); o.value = grupp + '|' + id; o.textContent = p.namn; og.append(o); }
      val.append(og);
    }
    val.value = 'Tom|tom16x16';
    $r('#rita-oppna').onclick = () => { const [g, id] = val.value.split('|'); nyBild(KALLOR[g][id].bild(), id); };
    document.querySelectorAll('#rita [data-verktyg]').forEach(b => { b.onclick = () => valjVerktyg(b.dataset.verktyg); });
    $r('#rita-angra').onclick = () => { const f = angra.pop(); if (!f) return; if (f.length !== B.px.length) { angra.push(f); return; } B.px = f; rutor(); };
    $r('#rita-spegla').onclick = spegla;
    document.querySelectorAll('#rita [data-flytta]').forEach(b => { b.onclick = () => { const [dx, dy] = b.dataset.flytta.split(',').map(Number); flytta(dx, dy); }; });
    document.querySelectorAll('#rita [data-storre]').forEach(b => { b.onclick = () => { const [dw, dh] = b.dataset.storre.split(',').map(Number); const w = Math.max(4, Math.min(128, B.w + dw)), h = Math.max(4, Math.min(128, B.h + dh)); if (w !== B.w || h !== B.h) storlek(w, h); }; });
    $r('#rita-rensa').onclick = () => { spara(); B.px.fill(-1); rutor(); };
    $r('#rita-spara').onclick = sparaRitning;
    const c = $r('#rita-duk');
    c.addEventListener('pointerdown', e => { e.preventDefault(); c.setPointerCapture(e.pointerId); spara(); ritar = true; sist = null; vid(...punkt(e)); });
    c.addEventListener('pointermove', e => { if (ritar && verktyg !== 'fyll' && verktyg !== 'pipett') vid(...punkt(e)); });
    const slut = () => { ritar = false; sist = null; };
    c.addEventListener('pointerup', slut); c.addEventListener('pointercancel', slut);
    addEventListener('resize', rutor);
    valjVerktyg('penna'); $r('#rita-storlek').textContent = `${B.w} × ${B.h}`; rutor(); visaRitningar();
    ansluta();
  }
  async function ansluta() {
    const status = $r('#rita-status');
    try { RDB = await window.claude?.use?.('db'); } catch (e) { RDB = null; }
    if (!RDB) { status.textContent = 'Du kan rita, men det går bara att spara när sidan är öppen i Claude och du är inloggad.'; return; }
    RDB.collection('ritningar').onSnapshot(snap => {
      ritningar = {}; snap.docs.forEach(d => { if (d.exists) ritningar[d.id] = d.data(); }); visaRitningar(); window.VAL_RITNINGAR?.(ritningar);
    }, () => { status.textContent = 'Kontakten med databasen bröts. Ladda om sidan.'; });
  }
  // att rita på ett förslag i valdelen (Björn 2026-11-04): kortets knapp öppnar versionen här, med namnet ifyllt, och det
  // sparade får fran 'val:<sak>:<version>', så att kortet visar ritningen och Claude vet vilket förslag den ändrar
  window.RITA_PA = (bild, franId, namn) => {
    nyBild(bild, franId); $r('#rita-namn').value = namn; $r('#rita-kommentar').value = '';
    $r('#rita-status').textContent = 'Rita på förslaget och tryck Spara. Skriv gärna i kommentaren vad du ändrat.';
    document.querySelector('#rita').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  window.RITA_BILD = r => franRader(r.rader, r.pal);
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', bygg); else bygg();
})();
