// ---------- marken och träden (steg 5.2.4.5): tre versioner av varje del, i stora sammanhang ----------
// Marken ritas inte som rutor som upprepas. Varje punkt räknas ur sin plats på hela kartan (världens koordinater):
// stora fält av ljusare och mörkare gräs (långsamma vågor), korn punkt för punkt, och tuvor, blommor och stenar som
// läggs ut med en slump som bara beror på platsen. Då blir kartan ett enda stort mönster utan skarvar, och två rutor
// gräs är aldrig lika. Kanterna mellan gräs, vatten, strand, stig och skog räknas ur avståndet till det andra, inte
// ur rutans form, så att de slingrar sig tvärs över rutorna.
(() => {
  const W = 320, H = 192; // 20 × 12 rutor
  const I = (P, r, t) => P.i(r, t);
  const SCEN = (w, h, rita) => ({ w, h, stor: true, rita });
  const fyll = (B, f) => { for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, f(x, y)); };
  const ar = (B, v, ...ramper) => ramper.some(r => v >= B.P.i(r, 0) && v <= B.P.i(r, 3));
  // avståndet från en punkt till en linje av punkter
  function linjeAvst(x, y, L) {
    let best = 1e9;
    for (let i = 0; i < L.length - 1; i++) {
      const [ax, ay] = L[i], [bx, by] = L[i + 1], dx = bx - ax, dy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
      best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
    }
    return best;
  }

  // ---------- gräset ----------
  // tre sätt att räkna en punkt gräs ur platsen. fält = de stora ljusare och mörkare fälten
  function grasPunkt(x, y, P, v) {
    const falt = vn(x, y, 56, 301) * 0.6 + vn(x, y, 19, 302) * 0.4, r = hash(x, y, 303);
    // fälten ändrar bara hur många mörka och ljusa korn det är, inte grundtonen: låg kontrast på stora ytor
    const lo = I(P, 'oliv', 1), mid = I(P, 'oliv', 2), hi = I(P, 'oliv', 3);
    const morkt = 0.02 + (1 - falt) ** 1.6 * 0.5, ljust = 0.985 - falt ** 1.6 * 0.24;
    if (v === 0) return r < morkt ? lo : r > ljust ? hi : mid;
    if (v === 1) { // fälten mjukare: kanten mellan dem är rastrerad, och korn i båda
      const t = (falt - 0.3) / 0.25, m = t < 0 ? 0.5 : t > 1 ? 0 : (1 - t) * 0.5; // andelen mörka punkter i rastret
      if (bayer(x, y) < m && r > 0.2) return lo;
      return r < 0.1 ? lo : r > 0.93 ? hi : mid;
    }
    // strån: korta lodräta streck, mörk fot och ljus topp
    const s = hash(x, y - 1, 304);
    const p = 0.05 + falt * 0.2;
    if (hash(x, y, 304) < p) return hi;
    if (s < p) return lo;
    if (r < (1 - falt) * 0.25) return lo;
    return r < 0.04 ? lo : mid;
  }
  // tuvor, blommor och stenar som ligger på gräset, utlagda på ett rutnät med slump i varje cell (aldrig samma ställe)
  function tuvor(B, v, ok, tat = 1) {
    const P = B.P;
    for (let cy = 0; cy * 6 < B.h + 6; cy++) for (let cx = 0; cx * 7 < B.w + 7; cx++) {
      const x = cx * 7 + Math.floor(hash(cx, cy, 311) * 7), y = cy * 6 + Math.floor(hash(cx, cy, 312) * 6);
      if (!ok(x, y)) continue;
      const r = hash(cx, cy, 313), klump = vn(x, y, 22, 314);
      if (v === 1 && klump > 0.68 && r < 0.8 * tat) { // klungor av högt gräs
        const top = hash(cx, cy, 315) < 0.12 ? I(P, 'senap', 0) : I(P, 'oliv', 3);
        for (let k = 0; k < 3; k++) { const xx = x + k - 1, hh = 2 + ((k + cx) % 2); B.satt(xx, y, I(P, 'oliv', 0)); for (let j = 1; j < hh; j++) B.satt(xx + (k - 1) * (j > 1 ? 1 : 0), y - j, j === hh - 1 ? top : I(P, 'oliv', 1)); }
        continue;
      }
      if (r < 0.32 * tat) { // en tuva: två strån
        const top = I(P, 'oliv', 3);
        B.satt(x, y, I(P, 'oliv', 0)); B.satt(x, y - 1, top); B.satt(x + 1, y - 1, I(P, 'oliv', 0)); B.satt(x + 1, y - 2, top);
      } else if (r < 0.345 * tat && v > 0) { // en liten blomma
        B.satt(x, y, I(P, 'oliv', 0)); B.satt(x, y - 1, v === 1 ? I(P, 'ben', 3) : I(P, 'senap', 3));
      } else if (r > 0.994) { // en liten sten, brun som stenen
        B.satt(x, y, I(P, 'jord', 1)); B.satt(x + 1, y, I(P, 'jord', 0)); B.satt(x, y - 1, I(P, 'jord', 3)); B.satt(x + 1, y - 1, I(P, 'jord', 2)); B.morka(x + 1, y + 1); B.morka(x + 2, y);
      } else if (v === 2 && r > 0.93) { // klöver: en mörk rund fläck av blad
        for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) < 3) B.satt(x + dx, y + dy, (dx + dy) < 0 ? I(P, 'oliv', 2) : I(P, 'oliv', 1));
      }
    }
  }
  // folket på bilden: de vanliga kartfigurerna, i ordning efter hur långt ner de står
  let FN = 0;
  function fram(B, x, fot) { // en kartfigur framifrån
    if (!window.BYBO) return; const F = window.BYBO(3000 + (FN++ % 30) * 7919, 'fram', 'sta', 'hanga');
    for (let y = 0; y < F.h; y++) for (let dx = 0; dx < F.w; dx++) { const v = F.px[y * F.w + dx]; if (v >= 0) B.satt(Math.round(x) - (F.w >> 1) + dx, fot - F.h + 1 + y, v); }
    for (let dx = -4; dx <= 4; dx++) B.morka(Math.round(x) + dx + 1, fot + 1);
  }
  const folk = (B, lista) => lista.forEach(([x, fot, vast]) => vast ? spelare(B, x, fot, 1, 'oliv') : fram(B, x, fot));

  // ---------- granen: tre sätt att rita den ----------
  // h = höjden i punkter, sno = hur mycket snö på grenarna (0 till 1), v = versionen
  function gran(B, cx, by, h, v, sno = 0, s = 0) {
    const P = B.P;
    const skift = hash(cx, by, 401 + s) < 0.3 ? -1 : 0; // lite mörkare granar ibland
    const ton = t => I(P, 'barr', Math.max(0, Math.min(3, t + (t > 0 ? skift : 0))));
    const w2 = Math.max(1, Math.round(h * (v === 2 ? 0.3 : 0.28)));
    // skuggan på marken, snett till höger
    for (let dy = -2; dy <= 2; dy++) for (let dx = 0; dx <= w2 * 2; dx++) if ((v === 3 || (dx + dy + by) % 2 === 0) && (dx - w2) ** 2 / (w2 * w2 + 1) + dy * dy / 5 < 1) B.morka(cx + dx, by + dy);
    const stam = Math.max(1, Math.round(h / 10));
    for (let y = 0; y < stam + 1; y++) { B.satt(cx, by - y, I(P, 'jord', 0)); if (h > 12) B.satt(cx - 1, by - y, I(P, 'jord', 1)); }
    if (h < 8) { // plantan: några barr
      for (let r = 0; r < h - 1; r++) { const hw = Math.floor(r / 2.2); for (let dx = -hw; dx <= hw; dx++) B.satt(cx + dx, by - h + r + 1, dx < 0 ? ton(2) : dx > 0 ? ton(0) : ton(1)); }
      B.satt(cx, by - h + 1, ton(3));
      return;
    }
    const hc = h - stam - 1, topp = by - h + 1;
    const snoP = (x, y, rel, rad) => sno > 0 && rel < 0.85 && hash(x, y, 406) < sno ? (rad === 0 ? I(P, 'ben', 3) : I(P, 'ben', 2)) : -1;
    if (v === 3) { // version 1 renare och lite osymmetrisk: varje våning olika lång åt vänster och höger och lite förskjuten
      for (let r = 0; r < hc; r++) {
        const k = Math.floor(r / 5), tier = (r % 5) / 4, y = topp + r;
        const aL = 0.78 + hash(k, cx, 700 + s) * 0.5, aR = 0.78 + hash(k, cx, 701 + s) * 0.5;
        const off = k > 0 && k < hc / 5 - 1 ? Math.round((hash(k, cx, 702 + s) - 0.5) * 2.2) : 0;
        const bas = (r / hc) * w2 * (0.55 + 0.45 * tier), hl = Math.round(bas * aL), hr = Math.round(bas * aR);
        for (let dx = -hl; dx <= hr; dx++) {
          const rel = dx < 0 ? dx / (hl || 1) : dx / (hr || 1);
          const kant = dx === -hl || dx === hr || (r % 5 === 4 && Math.abs(rel) > 0.35);
          const sl = 0.55 - rel * 0.35 - tier * 0.25 + (vn(cx + dx, y, 4, 703 + s) - 0.5) * 0.12;
          let c = kant ? ton(0) : sl > 0.62 ? ton(3) : sl > 0.4 ? ton(2) : sl > 0.18 ? ton(1) : ton(0);
          if (sno > 0 && r % 5 < 2 && rel < 0.8 && vn(cx + dx, y, 3, 406 + s) < sno * 0.8) c = r % 5 === 0 ? I(P, 'ben', 3) : I(P, 'ben', 2);
          B.satt(cx + off + dx, y, c);
        }
      }
      return;
    }
    if (v === 0) { // som i moodboarden: våningar av barr, ljuset från vänster
      for (let r = 0; r < hc; r++) {
        const tier = (r % 5) / 4, hw = Math.max(0, Math.round((r / hc) * w2 * (0.55 + 0.45 * tier))), y = topp + r;
        for (let dx = -hw; dx <= hw; dx++) {
          const kant = Math.abs(dx) === hw || (r % 5 === 4 && hash(cx + dx, y, 3) < 0.5), rel = hw ? dx / hw : 0;
          const sl = 0.55 - rel * 0.35 - tier * 0.25 + (hash(cx + dx, y, 4) - 0.5) * 0.18;
          let c = kant ? ton(0) : sl > 0.62 ? ton(3) : sl > 0.4 ? ton(2) : sl > 0.18 ? ton(1) : ton(0);
          if (r % 5 < 2) { const sn = snoP(cx + dx, y, rel, r % 5); if (sn >= 0) c = sn; }
          B.satt(cx + dx, y, c);
        }
      }
    } else if (v === 1) { // breda kjolar: få våningar som hänger ned mot spetsarna, ljus ovansida och mörk undersida
      const n = Math.max(2, Math.round(hc / 7)), vh = hc / n;
      for (let k = 0; k < n; k++) {
        const y0 = topp + Math.round(k * vh * 0.86), bred = Math.max(1, w2 * 1.2 * ((k + 1) / n)), B0 = Math.round(bred);
        for (let dx = -B0; dx <= B0; dx++) {
          const rel = dx / bred, ov = y0 + Math.round(Math.abs(rel) * vh * 0.6), ned = y0 + Math.round(vh * 1.05 + rel * rel * 3 + (hash(cx + dx, k, 407) < 0.35 ? 1 : 0));
          for (let y = ov; y <= ned; y++) {
            const j = y - ov;
            let c = y === ned ? ton(0) : j === 0 ? (rel < 0.3 ? ton(3) : ton(2)) : j < 3 ? (rel < -0.2 ? ton(2) : rel < 0.4 ? ton(1) : ton(1)) : (rel < -0.3 ? ton(1) : ton(0));
            if (hash(cx + dx, y, 408) < 0.08 && c !== ton(0)) c = ton(0);
            if (j < 2) { const sn = snoP(cx + dx, y, rel, j); if (sn >= 0) c = sn; }
            B.satt(cx + dx, y, c);
          }
        }
      }
    } else { // gles och oregelbunden: tunna grenkransar med luft emellan, stammen syns
      for (let y = topp + 2; y < by - stam; y++) { B.satt(cx, y, I(P, 'jord', 0)); if (h > 30) B.satt(cx - 1, y, I(P, 'jord', 1)); }
      const n = Math.max(3, Math.round(hc / 4.5));
      for (let k = 0; k < n; k++) {
        const y = topp + Math.round((k / n) * hc) + 1, f = (k + 1.5) / (n + 0.5);
        for (const sida of [-1, 1]) {
          const lang = Math.max(1, Math.round(w2 * 1.1 * f * (0.5 + hash(cx + sida, k, 409) * 0.7)));
          for (let i = 1; i <= lang; i++) {
            const x = cx + sida * i, yy = y + Math.round(i * 0.4), rel = sida * i / (w2 || 1);
            B.satt(x, yy, i > lang - 2 ? ton(0) : ton(1)); // grenen
            if (hash(x, yy, 410) < 0.8) { const sn = snoP(x, yy - 1, rel, 0); B.satt(x, yy - 1, sn >= 0 ? sn : sida < 0 ? ton(3) : ton(2)); } // barren ovanpå
            if (hash(x, yy, 411) < 0.6) B.satt(x, yy + 1, ton(0)); // barren under
            if (i < lang * 0.6 && h > 24 && hash(x, yy, 412) < 0.5) B.satt(x, yy + 2, ton(0));
          }
        }
      }
      B.satt(cx, topp, ton(3)); B.satt(cx, topp + 1, ton(2)); B.satt(cx - 1, topp + 2, ton(2)); B.satt(cx + 1, topp + 2, ton(1));
    }
  }
  // torrakan: en död gran med alla grenar kvar men inga barr: grå stam, kransar av kala grenar som hänger ned
  // mot spetsarna, kortare uppåt, och en avbruten topp (Björn efter bildstil v112)
  function torraka(B, cx, by, h) {
    const P = B.P, w2 = Math.round(h * 0.3);
    for (let dx = 0; dx <= w2; dx++) B.morka(cx + dx, by + 1);
    for (let y = 0; y < h; y++) { const yy = by - y; B.satt(cx - 1, yy, I(P, 'ben', 0)); B.satt(cx, yy, I(P, 'kol', 3)); }
    B.satt(cx, by - h, I(P, 'ben', 0)); B.satt(cx + 1, by - h + 1, I(P, 'kol', 3)); // den avbrutna toppen
    const n = Math.round(h / 4.5);
    for (let k = 0; k < n; k++) {
      const y = by - Math.round(h * 0.14) - Math.round(k * (h * 0.82) / n), f = 1 - k / n;
      for (const sida of [-1, 1]) {
        if (hash(k, sida + cx, 421) < 0.14) continue; // en gren som fallit av
        const lang = Math.max(2, Math.round(w2 * (0.35 + f * 0.75) * (0.75 + hash(k, sida, 422) * 0.5)));
        for (let i = 1; i <= lang; i++) {
          const x = cx + (sida < 0 ? -1 : 0) + sida * i, yy = y + Math.round(i * i / (lang * 2.2)); // grenen böjer sig nedåt
          B.satt(x, yy, i > lang - 2 ? I(P, 'jord', 1) : I(P, 'kol', 3));
          if (i > 2 && i % 3 === 0 && i < lang - 1) { B.satt(x + sida, yy + 1, I(P, 'jord', 1)); } // små kvistar
        }
      }
    }
  }

  // ---------- björken: vit stam med svarta märken, kronan på tre sätt ----------
  function bjorkStam(B, cx, by, h, top) {
    const P = B.P, w = h < 14 ? 1 : h < 36 ? 2 : 3;
    for (let y = by; y >= top; y--) for (let i = 0; i < w; i++) {
      const x = cx - (w >> 1) + i, nere = by - y < h * 0.12 && h > 20;
      let c = i === w - 1 && w > 1 ? I(P, 'ben', 1) : i === 0 ? I(P, 'ben', 3) : I(P, 'ben', 2);
      if (nere) c = hash(x, y, 431) < 0.5 ? I(P, 'kol', 2) : I(P, 'kol', 1);
      else if (hash(Math.floor(y / 2), cx, 432) < 0.18 && hash(x, y, 433) < 0.8) c = I(P, 'kol', 1); // de svarta märkena
      B.satt(x, y, c);
    }
  }
  // kala grenar: grenar som delar sig, tunnare utåt (vintern, och det som syns mellan bladen)
  function grenar(B, x, y, vinkel, lang, djup, s) {
    const P = B.P;
    for (let i = 0; i < lang; i++) { const xx = x + Math.cos(vinkel) * i, yy = y - Math.sin(vinkel) * i; B.satt(xx, yy, djup > 2 ? I(P, 'ben', 1) : djup > 1 ? I(P, 'kol', 3) : I(P, 'jord', 1)); }
    if (djup <= 0 || lang < 3) return;
    const ex = x + Math.cos(vinkel) * lang, ey = y - Math.sin(vinkel) * lang;
    const a = 0.45 + hash(x, y, s) * 0.3;
    grenar(B, ex, ey, vinkel + a, lang * 0.68, djup - 1, s + 1);
    grenar(B, ex, ey, vinkel - a * 0.9, lang * 0.62, djup - 1, s + 2);
    if (djup > 2 && hash(x, y, s + 3) < 0.5) grenar(B, ex, ey, vinkel - 0.1, lang * 0.5, djup - 2, s + 4); // hängande skott
  }
  // blad: färgen byts med årstiden (lov = ramp och toner)
  const LOV = {
    var: ['oliv', [0, 1, 3, 3]], sommar: ['oliv', [0, 1, 2, 3]], host: ['senap', [0, 1, 2, 3]], hostrod: ['rost', [0, 1, 2, 3]],
  };
  function bjork(B, cx, by, h, v, tid = 'sommar', s = 0) {
    const P = B.P;
    const lov = tid === 'host' && hash(cx, by, 440 + s) < 0.3 ? LOV.hostrod : LOV[tid] || LOV.sommar;
    const L = t => I(P, lov[0], lov[1][t]);
    const kh = h < 10 ? h * 0.7 : h * 0.68, kw = Math.max(2, h * (v === 1 ? 0.24 : 0.3)), ky = by - h + kh / 2; // kronans mitt
    const r2 = (x, y) => ((x - cx) / kw) ** 2 + ((y - ky) / (kh / 2)) ** 2;
    // skuggan
    for (let dy = -3; dy <= 3; dy++) for (let dx = -kw * 0.6; dx <= kw * 1.8; dx++) if ((v === 3 || (Math.round(dx) + dy + by) % 2 === 0) && (dx - kw * 0.6) ** 2 / (kw * kw * 1.3 + 1) + dy * dy / 9 < 1 && tid !== 'vinter') B.morka(cx + dx, by + dy);
    const K = new Map(); // kronan: först alla blad, sedan ritas de med en mörk kant där det är luft bredvid
    bjorkStam(B, cx, by, h, by - Math.round(h * (tid === 'vinter' ? 0.85 : 0.55)));
    if (h < 8) { // plantan: några blad på en pinne
      if (tid === 'vinter') { B.satt(cx - 1, by - h + 2, I(P, 'jord', 1)); B.satt(cx + 1, by - h + 3, I(P, 'jord', 1)); return; }
      for (const [dx, dy, t] of [[-1, 1, 2], [1, 2, 1], [0, 0, 3], [-1, 3, 1], [1, 0, 2]]) B.satt(cx + dx, by - h + dy, L(t));
      return;
    }
    if (tid === 'vinter' || v === 2) { // grenarna (på vintern hela kronan, annars det som syns mellan bladen)
      const top = by - Math.round(h * 0.55);
      grenar(B, cx, top, Math.PI / 2 + 0.25, h * 0.24, h > 30 ? 4 : 3, 450 + s);
      grenar(B, cx, top, Math.PI / 2 - 0.35, h * 0.22, h > 30 ? 4 : 3, 460 + s);
      grenar(B, cx, top + h * 0.12, Math.PI / 2 + 0.9, h * 0.16, 2, 470 + s);
      grenar(B, cx, top + h * 0.1, Math.PI / 2 - 0.95, h * 0.15, 2, 480 + s);
      if (tid === 'vinter') return;
    }
    if (v === 3) { // version 1 renare: klungorna utan slumpkant, en ren mörk kant bara nedtill och till höger
      const n = Math.round(5 + h / 4.5), kl = [];
      for (let k = 0; k < n; k++) { const a = hash(k, cx, 490 + s) * 6.28, d = Math.sqrt(hash(k, cx, 491 + s)) * 0.72; kl.push([cx + Math.cos(a) * kw * d, ky + Math.sin(a) * kh / 2 * d, Math.max(2, h * (0.12 + hash(k, cx, 492 + s) * 0.07))]); }
      kl.sort((a, b) => a[1] - b[1]);
      for (const [bx, byy, r] of kl) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.hypot(dx, dy * 1.15) / r > 1) continue;
        const sl = -(dx + dy) / (2 * r) + 0.1 - ((byy - ky) / kh) * 0.6;
        K.set((Math.round(bx + dx)) + "," + Math.round(byy + dy), sl > 0.35 ? L(3) : sl > -0.1 ? L(2) : L(1));
      }
      const har = (x, y) => K.has(x + "," + y);
      for (const [k, c] of K) { const [x, y] = k.split(",").map(Number); if ([har(x + 1, y), har(x - 1, y), har(x, y + 1), har(x, y - 1)].filter(Boolean).length < 2) continue; B.satt(x, y, !har(x + 1, y) || !har(x, y + 1) ? L(0) : c); }
      return;
    }
    if (v === 0) { // klungor av blad, ljusa uppe till vänster
      const n = Math.round(4 + h / 5);
      const kl = [];
      for (let k = 0; k < n; k++) { const a = hash(k, cx, 490 + s) * 6.28, d = Math.sqrt(hash(k, cx, 491 + s)) * 0.78; kl.push([cx + Math.cos(a) * kw * d, ky + Math.sin(a) * kh / 2 * d, Math.max(2, h * (0.1 + hash(k, cx, 492 + s) * 0.08))]); }
      kl.sort((a, b) => a[1] - b[1]);
      for (const [bx, byy, r] of kl) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const d = Math.hypot(dx, dy * 1.15) / r + (hash(bx + dx, byy + dy, 493) - 0.5) * 0.35; if (d > 1) continue;
        const sl = -(dx + dy) / (2 * r) + 0.1 - ((byy - ky) / kh) * 0.6;
        K.set((Math.round(bx + dx)) + "," + Math.round(byy + dy), d > 0.86 ? L(0) : sl > 0.35 ? L(3) : sl > -0.05 ? L(2) : L(1));
      }
    } else if (v === 1) { // hängbjörken: bladen hänger i strängar, fransig nederkant
      for (let x = Math.floor(cx - kw); x <= cx + kw; x++) {
        const rel = (x - cx) / kw; if (Math.abs(rel) > 1) continue;
        const ovan = ky - kh / 2 * Math.sqrt(1 - rel * rel) * 0.95, ned = ky + kh / 2 * (0.75 + hash(x, cx, 501) * 0.35) * Math.sqrt(1 - rel * rel * 0.6);
        for (let y = Math.round(ovan); y <= ned; y++) {
          const strang = hash(x, 0, 502 + s), t = (y - ovan) / (ned - ovan + 1);
          if (t > 0.6 && hash(x, Math.floor(y / 2), 503) < (t - 0.6) * 1.6) continue; // luft mellan strängarna nedtill
          const sl = -rel * 0.5 - t * 0.6 + 0.55 + (strang - 0.5) * 0.4;
          K.set(x + "," + y, y >= ned - 0.5 ? L(0) : sl > 0.55 ? L(3) : sl > 0.2 ? L(2) : sl > -0.1 ? L(1) : L(0));
        }
      }
    } else { // luftig: små samlingar av blad med grenar och luft emellan
      for (let y = Math.floor(ky - kh / 2); y <= ky + kh / 2; y++) for (let x = Math.floor(cx - kw); x <= cx + kw; x++) {
        const d = r2(x, y) + (vn(x, y, 3, 511 + s) - 0.5) * 0.9; if (d > 1) continue;
        const klump = vn(x, y, 2.6, 512 + s); if (klump < 0.42) continue;
        const sl = -(x - cx) / kw * 0.4 - (y - ky) / kh * 0.8 + (klump - 0.6) * 1.2;
        K.set(x + "," + y, klump < 0.47 ? L(0) : sl > 0.45 ? L(3) : sl > 0.05 ? L(2) : L(1));
      }
    }
    for (const [k, c] of K) { const [x, y] = k.split(",").map(Number); const luft = !K.has(x + 1 + "," + y) || !K.has(x + "," + (y + 1)) || (!K.has(x - 1 + "," + y) && hash(x, y, 520) < 0.5); B.satt(x, y, luft ? L(0) : c); }
  }
  // en torr björk: stammen och alla grenar utan löv, toppen avbruten, några grenar brutna, barken flagnar och
  // tickor på stammen (Björn efter bildstil v112)
  function torrBjork(B, cx, by, h) {
    const P = B.P, top = by - Math.round(h * 0.6);
    for (let dx = 0; dx <= 8; dx++) B.morka(cx + dx, by + 1);
    bjorkStam(B, cx, by, h, by - Math.round(h * 0.88));
    for (let y = by - Math.round(h * 0.88); y < by; y += 3) if (hash(cx, y, 523) < 0.3) B.satt(cx, y, I(P, 'jord', 1)); // barken flagnar
    for (const [dy, l] of [[0.3, 1], [0.42, 2]]) { const y = by - Math.round(h * dy); B.satt(cx + l % 2 + 1, y, I(P, 'jord', 2)); B.satt(cx + l % 2 + 2, y, I(P, 'jord', 1)); B.satt(cx + l % 2 + 1, y + 1, I(P, 'jord', 0)); } // tickor
    grenar(B, cx, top, Math.PI / 2 + 0.3, h * 0.26, 3, 530);
    grenar(B, cx, top, Math.PI / 2 - 0.4, h * 0.24, 3, 540);
    grenar(B, cx, top + h * 0.14, Math.PI / 2 + 0.95, h * 0.14, 1, 550); // en bruten gren
    grenar(B, cx, top + h * 0.1, Math.PI / 2 - 1.0, h * 0.18, 2, 560);
  }


  // ---------- en rad träd i alla stadier, med folk framför och bakom ----------
  const STADIER = [['planta', 6], ['ungträd', 15], ['vuxet', 31], ['gammalt', 46], ['jätteträd', 62]];
  // ---------- vattnet och stranden ----------
  function sjoAvst(x, y) { return ((x - 236) / 118) ** 2 + ((y - 128) / 78) ** 2 + (vn(x, y, 22, 541) - 0.5) * 0.3 + (vn(x, y, 7, 542) - 0.5) * 0.08; }
  function vatten(B, v) {
    const P = B.P;
    const kant = v === 0 ? 1.14 : v === 1 ? 1.2 : 1.08;
    fyll(B, (x, y) => {
      const vd = sjoAvst(x, y), r = hash(x, y, 543);
      if (vd < 1) {
        if (v === 0) { // som i moodboarden
          const djup = vd < 0.55 ? (bayer(x, y) < (0.55 - vd) * 3 ? I(P, 'barr', 0) : I(P, 'skiffer', 0)) : vd < 0.85 ? I(P, 'skiffer', 1) : I(P, 'skiffer', 2);
          if (y % 5 === 0 && vn(x, y, 4, 33) > 0.62) return vd < 0.6 ? I(P, 'skiffer', 1) : I(P, 'skiffer', 3);
          return djup;
        }
        if (v === 1) { // grunt vatten med sten som syns genom ytan
          if (vd > 0.82 && vn(x, y, 3, 544) > 0.66) return vd > 0.92 ? I(P, 'skiffer', 3) : I(P, 'skiffer', 2);
          const t = vd < 0.5 ? 0 : vd < 0.8 ? 1 : 2, gl = vn(x, y, 5, 545) > 0.7 && (y + Math.floor(x / 6)) % 4 === 0;
          return gl ? I(P, 'skiffer', Math.min(3, t + 1)) : t === 0 ? (r < 0.3 ? I(P, 'barr', 0) : I(P, 'skiffer', 0)) : I(P, 'skiffer', t);
        }
        // mörkt och djupt, och en ljus rand längs stranden
        if (vd > 0.9 && vd < 0.95 && hash(Math.floor(x / 3), y, 546) < 0.7) return I(P, 'skiffer', 3);
        if (vd > 0.95) return I(P, 'jord', 0);
        const t = vd < 0.65 ? 0 : 1;
        if (y % 4 === 0 && vn(x, y, 6, 547) > 0.6) return I(P, 'skiffer', t + 1);
        return t === 0 ? (bayer(x, y) < 0.6 ? I(P, 'barr', 0) : I(P, 'skiffer', 0)) : (bayer(x, y) < 0.3 ? I(P, 'skiffer', 0) : I(P, 'skiffer', 1));
      }
      if (vd < kant) {
        if (v === 0) return r < 0.24 ? I(P, 'jord', 2) : r > 0.8 ? I(P, 'senap', 1) : I(P, 'senap', 0);
        if (v === 1) { const sten = vn(x, y, 3, 548); if (sten > 0.62) return sten > 0.72 ? I(P, 'skiffer', 3) : I(P, 'skiffer', 2); return r < 0.3 ? I(P, 'jord', 2) : r < 0.85 ? I(P, 'senap', 0) : I(P, 'jord', 3); }
        return r < 0.4 ? I(P, 'jord', 1) : r < 0.8 ? I(P, 'jord', 0) : I(P, 'oliv', 0); // lerig strand
      }
      if (vd < kant + 0.08 && hash(x, y, 549) < 0.5) return v === 2 ? I(P, 'oliv', 0) : I(P, 'senap', 0);
      return grasPunkt(x, y, P, 0);
    });
    tuvor(B, 0, (x, y) => sjoAvst(x, y) > kant + 0.06);
    if (v === 1 || v === 2) { // vass i strandkanten
      for (let k = 0; k < 7000; k++) {
        const x = Math.floor(hash(k, 1, 550) * W), y = Math.floor(hash(k, 2, 550) * H), vd = sjoAvst(x, y);
        if (vd < (v === 1 ? 0.9 : 0.86) || vd > (v === 1 ? 1.0 : 1.04) || vn(x, y, 14, 551) < 0.55) continue;
        const hh = 4 + Math.floor(hash(k, 3) * 4);
        for (let j = 0; j < hh; j++) B.satt(x + (j > hh - 3 && k % 2 ? 1 : 0), y - j, j === hh - 1 ? I(P, 'senap', 1) : j > hh - 3 ? I(P, 'oliv', 2) : I(P, 'oliv', 0));
        if (v === 2 && k % 3 === 0) { B.satt(x, y - hh, I(P, 'jord', 1)); B.satt(x, y - hh - 1, I(P, 'jord', 0)); } // kaveldun
      }
    }
    const ting = [];
    for (const [x, y, h] of [[20, 60, 30], [44, 40, 24], [64, 82, 34], [30, 120, 22]]) ting.push([y, () => gran(B, x, y, h, 0)]);
    ting.push([98, () => spelare(B, 120, 98, 0, 'oliv')]);
    ting.push([180, () => spelare(B, 96, 180, 1, 'oliv')]);
    ting.sort((a, b) => a[0] - b[0]).forEach(t => t[1]());
  }

  // ---------- stigarna ----------
  const STIGAR = [[[160, 96], [196, 80], [250, 70], [330, 60]], [[160, 96], [130, 130], [110, 170], [100, 200]], [[160, 96], [120, 84], [60, 90], [-10, 80]], [[160, 96], [210, 128], [250, 170], [270, 200]]];
  const stigAvst2 = (x, y) => Math.min(...STIGAR.map(L => linjeAvst(x, y, L)));
  // ---------- skogskanten i steg ----------
  // hur långt in i skogen en punkt är: över 0 i skogen, under 0 ute på gräset
  const skogE = (x, y) => 140 - (y - 96) * 0.35 + (vn(x, y, 46, 581) - 0.5) * 110 + (vn(x, y, 9, 582) - 0.5) * 12 - x;
  // ---------- renare (Björn efter bildstil v111: "för smutsigt, pixligt och prickigt") ----------
  // Inga lösa punkter med slump i varje punkt: ytorna är hela och lugna, och skillnaderna kommer av stora fläckar med
  // en ren kant (en långsam våg som skärs av) och av små saker som ritas hela (tuvor, strån, blommor).
  const flack = (x, y, sk, s, grans) => vn(x, y, sk, s) * 0.75 + vn(x, y, sk / 3, s + 1) * 0.25 > grans;
  // ett kort streck i stället för en lös punkt: lodrätt (strån) eller vågrätt (jord, sten, barr), två punkter långt
  const strack = (x, y, s, p) => hash(x, y, s) < p ? 1 : hash(x, y - 1, s) < p ? 2 : 0;
  const vagstreck = (x, y, s, p) => hash(x, y, s) < p || hash(x - 1, y, s) < p;
  function grasRen(x, y, P, niva = 1) { // gräset du valde (version 2): fält med ren men ojämn kant, och korta strån i stället för korn
    const lo = I(P, 'oliv', 1), mid = I(P, 'oliv', 2), hi = I(P, 'oliv', 3);
    if (niva === 0) { // som i bildstil v112: nästan utan korn
      if (flack(x, y, 44, 301, 0.64)) return hash(x, y, 303) < 0.004 ? mid : lo;
      return hash(x, y, 303) < 0.004 ? hi : hash(x, y - 1, 303) < 0.004 ? lo : mid;
    }
    const kant = (vn(x, y, 4, 305) - 0.5) * 0.05; // kanten fransar sig lite, utan lösa punkter
    if (flack(x, y, 44, 301, 0.64 + kant)) { // mörkare fält
      const st = strack(x, y, 306, 0.014); if (st) return st === 1 ? mid : I(P, 'oliv', 0);
      return lo;
    }
    const tat = 0.008 + vn(x, y, 20, 307) * 0.02; // tätare strån på sina ställen
    const st = strack(x, y, 303, tat); if (st) return st === 1 ? hi : lo;
    return mid;
  }
  function tuvorRen(B, ok, tat = 1, niva = 1) { // klungor av högt gräs, ett och annat strå och en vit blomma
    const P = B.P, gx = niva ? 11 : 12, gy = niva ? 10 : 11;
    if (!niva) tat *= 0.8;
    for (let cy = 0; cy * gy < B.h + gy; cy++) for (let cx = 0; cx * gx < B.w + gx; cx++) {
      const x = cx * gx + Math.floor(hash(cx, cy, 311) * gx), y = cy * gy + Math.floor(hash(cx, cy, 312) * gy);
      if (!ok(x, y)) continue;
      const r = hash(cx, cy, 313);
      if (vn(x, y, 30, 314) > 0.62 && r < 0.75 * tat) { // klunga av högt gräs: fyra strån
        for (let k = 0; k < 4; k++) { const xx = x + k - 1, hh = 2 + ((k * 3 + cx) % 3 === 0 ? 2 : 1); for (let j = 0; j < hh; j++) B.satt(xx + (j === hh - 1 ? (k < 2 ? -1 : 1) * (hh > 3 ? 1 : 0) : 0), y - j, j === 0 ? I(P, 'oliv', 0) : j === hh - 1 ? I(P, 'oliv', 3) : I(P, 'oliv', 1)); }
      } else if (r < 0.2 * tat) { // en tuva: två strån
        B.satt(x, y, I(P, 'oliv', 0)); B.satt(x, y - 1, I(P, 'oliv', 3)); B.satt(x + 1, y, I(P, 'oliv', 0)); B.satt(x + 1, y - 1, I(P, 'oliv', 1)); B.satt(x + 1, y - 2, I(P, 'oliv', 3));
      } else if (r < 0.23 * tat) { // en vit blomma
        B.satt(x, y, I(P, 'oliv', 0)); B.satt(x, y - 1, I(P, 'ben', 3)); B.satt(x - 1, y - 1, I(P, 'ben', 2)); B.satt(x + 1, y - 1, I(P, 'ben', 2)); B.satt(x, y - 2, I(P, 'ben', 2));
      }
    }
  }
  // stigarna (version 1): jämn bar jord med en ren kant, en mörkare rand av nött gräs längs kanten och få stenar
  function stigarRen(B) {
    const P = B.P;
    fyll(B, (x, y) => {
      const sd = stigAvst2(x, y) - (vn(x, y, 10, 561) - 0.5) * 3 - (Math.hypot(x - 160, y - 96) < 20 ? 7 : 0);
      if (sd < 3.5) { const r = hash(x, y, 562); return r < 0.1 ? I(P, 'jord', 1) : r > 0.93 ? I(P, 'jord', 3) : flack(x, y, 9, 562, 0.68) ? I(P, 'jord', 3) : I(P, 'jord', 2); } // korn lika tätt som i gräset
      if (sd < 4.5) return I(P, 'jord', 1);
      return grasPunkt(x, y, P, 1);
    });
    for (let k = 0; k < 40; k++) { // några stenar i stigen
      const x = Math.floor(hash(k, 1, 567) * W), y = Math.floor(hash(k, 2, 567) * H);
      if (stigAvst2(x, y) > 1.5 || Math.hypot(x - 160, y - 96) < 24) continue;
      B.satt(x, y, I(P, 'jord', 0)); B.satt(x + 1, y, I(P, 'jord', 0)); B.satt(x, y - 1, I(P, 'jord', 1));
    }
    tuvor(B, 1, (x, y) => stigAvst2(x, y) > 9);
    ritaEld(B, 160, 92, B.P, {});
    folk(B, [[214, 92, 0], [120, 150, 1], [70, 104, 0]]);
  }
  // snön (version 2): drivor med hela blågrå skuggor på läsidan, slät is och en jämn stig
  function snoRen(B) {
    const P = B.P;
    const GR = [[20, 60, 30], [44, 40, 24], [64, 82, 34], [30, 120, 22], [100, 30, 28], [130, 56, 20]];
    fyll(B, (x, y) => {
      const vd = sjoAvst(x, y);
      if (vd < 1) { // isen: slät, med ljusare fläckar där snön blåst upp
        if (vd > 0.93) return I(P, 'skiffer', 2);
        { const r = hash(x, y, 571); return r < 0.06 ? I(P, 'skiffer', 2) : r > 0.96 ? I(P, 'ben', 1) : flack(x, y, 20, 571, 0.7) ? I(P, 'skiffer', 2) : I(P, 'skiffer', 3); }
      }
      if (vd < 1.08) return I(P, 'ben', 1); // stranden under snön
      const sd = linjeAvst(x, y, [[-10, 150], [80, 130], [150, 110], [210, 50], [240, -10]]) - (vn(x, y, 8, 572) - 0.5) * 3;
      if (sd < 3) return I(P, 'ben', 0);
      if (sd < 4) return I(P, 'ben', 1);
      if (GR.some(([gx, gy, h]) => ((x - gx - 2) / (h * 0.38)) ** 2 + ((y - gy) / 3.5) ** 2 < 1)) return I(P, 'ben', 1); // skuggan under granarna
      const driva = (x, y) => vn(x * 0.45, y, 18, 573) > 0.62; // drivorna: långa och smala, i blåstens riktning
      if (driva(x, y)) return I(P, 'ben', 3);
      if (driva(x, y - 1) || driva(x, y - 2)) return I(P, 'ben', 1); // skuggan under drivan
      if (vagstreck(x, y, 574, 0.02)) return I(P, 'ben', 1); // små skavlar
      const r = hash(x, y, 575); return r < 0.08 ? I(P, 'ben', 1) : r > 0.95 ? I(P, 'ben', 3) : I(P, 'ben', 2); // korn lika tätt som i gräset
    });
    // sprickor i isen: få, raka och sammanhängande
    for (let k = 0; k < 4; k++) {
      let x = 170 + hash(k, 1, 580) * 130, y = 80 + hash(k, 2, 580) * 90, a = hash(k, 3, 580) * 6.28;
      for (let i = 0; i < 26 + hash(k, 4, 580) * 26; i++) { if (sjoAvst(x, y) > 0.9) break; B.satt(x, y, I(P, 'skiffer', 1)); if (i % 9 === 8) a += (hash(i, k, 582) - 0.5) * 1.1; x += Math.cos(a); y += Math.sin(a) * 0.8; }
    }
    const ting = GR.map(([x, y, h], i) => [y, () => gran(B, x, y, h, 3, 0.8, i)]);
    ting.push([126, () => spelare(B, 92, 126, 1, 'oliv')]);
    ting.push([104, () => spelare(B, 150, 104, 0, 'oliv')]);
    ting.sort((a, b) => a[0] - b[0]).forEach(t => t[1]());
  }
  // skogskanten (version 1): lika breda steg, varje steg en hel yta med en slingrande kant
  function skogskantRen(B) {
    const P = B.P, steg = [10, 0, -12, -28];
    fyll(B, (x, y) => {
      const e = skogE(x, y) + (vn(x, y, 7, 590) - 0.5) * 8; // kanten mellan stegen slingrar sig i stora bågar
      const skogsmark = () => vagstreck(x, y, 588, 0.02) ? I(P, 'jord', 0) : strack(x, y, 589, 0.012) === 1 ? I(P, 'oliv', 1) : flack(x, y, 14, 584, 0.62) ? I(P, 'oliv', 0) : I(P, 'barr', 1);
      const mork = () => { const st = strack(x, y, 591, 0.015); return st === 1 ? I(P, 'oliv', 3) : st === 2 ? I(P, 'oliv', 0) : flack(x, y, 16, 585, 0.66) ? I(P, 'oliv', 2) : I(P, 'oliv', 1); };
      if (e > steg[0]) return skogsmark();
      if (e > steg[1]) return flack(x, y, 11, 586, 0.5) ? mork() : skogsmark(); // skogsmark med fläckar av gräs
      if (e > steg[2]) return mork();
      if (e > steg[3]) return flack(x, y, 11, 587, 0.5) ? mork() : grasPunkt(x, y, P, 1); // fläckar av mörkt gräs i gräset
      return grasPunkt(x, y, P, 1);
    });
    // högt mörkt gräs längs kanten, i klungor
    for (let k = 0; k < 900; k++) {
      const x = Math.floor(hash(k, 5, 593) * W), y = Math.floor(hash(k, 6, 594) * H), e = skogE(x, y);
      if (e > steg[1] + 1 || e < steg[3] + 2 || vn(x, y, 12, 595) < 0.5) continue;
      const top = hash(k, 7) < 0.2 ? I(P, 'senap', 0) : I(P, 'oliv', 2);
      B.satt(x, y, I(P, 'oliv', 0)); B.satt(x, y - 1, I(P, 'oliv', 0)); B.satt(x, y - 2, top);
      B.satt(x + 1, y, I(P, 'oliv', 0)); B.satt(x + 1, y - 1, top);
    }
    tuvor(B, 1, (x, y) => skogE(x, y) < steg[3] - 6);
    const ting = [];
    for (let cy = 0; cy < 14; cy++) for (let cx = 0; cx < 12; cx++) {
      const x = cx * 14 + Math.floor(hash(cx, cy, 595) * 10), y = cy * 15 + Math.floor(hash(cx, cy, 596) * 8), e = skogE(x, y);
      if (e > 8 && hash(cx, cy, 597) < 0.62) ting.push([y, () => gran(B, x, y, 24 + Math.floor(hash(cx, cy, 598) * 14), 3, 0, cx * 13 + cy)]);
      else if (e > steg[2] && e < 8 && hash(cx, cy, 599) < 0.7) ting.push([y, () => gran(B, x, y, 8 + Math.floor(hash(cx, cy, 600) * 6), 3, 0, cx * 13 + cy)]);
    }
    ting.push([150, () => bjork(B, 150, 150, 30, 3)]);
    ting.push([132, () => spelare(B, 212, 132, 1, 'oliv')]);
    ting.push([86, () => spelare(B, 176, 86, 0, 'oliv')]);
    ting.sort((a, b) => a[0] - b[0]).forEach(t => t[1]());
  }
  // träden i alla stadier på det renare gräset
  function stadierRen(B, sort) {
    const P = B.P, fot = 100;
    fyll(B, (x, y) => grasPunkt(x, y, P, 1));
    tuvor(B, 1, () => true);
    const xs = [18, 46, 92, 156, 232], ting = [];
    STADIER.forEach(([, h], i) => { const x = xs[i], f = h > 40 ? 1 + hash(i, 3, 530) * 0.08 : 1; ting.push([fot, () => sort === 'gran' ? gran(B, x, fot, Math.round(h * f), 3, 0, i) : bjork(B, x, fot, Math.round(h * f), 3, 'sommar', i)]); });
    ting.push([fot, () => sort === 'gran' ? torraka(B, 296, fot, 40) : torrBjork(B, 296, fot, 34)]);
    ting.push([fot + 10, () => fram(B, 100, fot + 10)]);
    ting.push([fot - 12, () => spelare(B, 162, fot - 12, 1, 'oliv')]);
    ting.push([fot + 2, () => spelare(B, 258, fot + 2, 1, 'oliv')]);
    ting.sort((a, b) => a[0] - b[0]).forEach(t => t[1]());
  }


  // ---------- årstiderna (Björn efter bildstil v116): varje godkänt träd på våren, hösten och vintern ----------
  // Sommaren är det godkända. Marken följer gräset som är referensen; på hösten vissnar det i fläckar och löven
  // ligger under björkarna, och på vintern ligger snön som på kortet Snön.
  function tidMark(B, tid) {
    const P = B.P;
    if (tid === 'vinter') return fyll(B, (x, y) => { const driva = (x, y) => vn(x * 0.45, y, 18, 573) > 0.64; if (driva(x, y)) return I(P, 'ben', 3); if (driva(x, y - 1) || driva(x, y - 2)) return I(P, 'ben', 1); const r = hash(x, y, 575); return r < 0.08 ? I(P, 'ben', 1) : r > 0.95 ? I(P, 'ben', 3) : I(P, 'ben', 2); });
    fyll(B, (x, y) => {
      const c = grasPunkt(x, y, P, 1);
      if (tid === 'host' && flack(x, y, 16, 720, 0.68)) return I(P, 'senap', Math.max(0, tonAv(c) - 1)); // vissnat gräs
      return c;
    });
    tuvor(B, 1, () => true);
    if (tid === 'var') for (let k = 0; k < 160; k++) { const x = Math.floor(hash(k, 1, 721) * B.w), y = Math.floor(hash(k, 2, 721) * B.h); B.satt(x, y, I(P, k % 3 ? 'senap' : 'ben', 3)); } // vårblommor
  }
  // snö på allt som vänder sig uppåt (grenar och kvistar), eller ljusa skott i spetsarna på granen
  function tidTrad(B, rita, tid, sort) {
    const L = lager({ ...B, morka: B.morka }, rita), P = B.P, M = L.M;
    for (const [k, c] of M) {
      const [x, y] = k.split(',').map(Number);
      let n = c;
      if (tid === 'vinter' && !M.has(x + ',' + (y - 1)) && !somRamp(P, c, 'ben') && hash(x, y, 722) < 0.75) n = I(P, 'ben', 3);
      if (tid === 'var' && sort === 'gran' && somRamp(P, c, 'barr') && (!M.has((x - 1) + ',' + y) || !M.has((x + 1) + ',' + y)) && hash(x, y, 723) < 0.7) n = I(P, 'oliv', 3); // årets nya skott
      B.satt(x, y, n);
    }
  }
  function stadierTid(B, sort, tid) {
    const P = B.P, fot = 100;
    tidMark(B, tid);
    const xs = [18, 46, 92, 156, 232], ting = [];
    const lov = tid === 'vinter' ? 'vinter' : tid; // björkens löv: ljusa på våren, gula och några röda på hösten, inga på vintern
    STADIER.forEach(([, h], i) => {
      const x = xs[i], f = h > 40 ? 1 + hash(i, 3, 530) * 0.08 : 1, hh = Math.round(h * f);
      ting.push([fot, () => {
        if (sort === 'gran') tidTrad(B, D => gran(D, x, fot, hh, 3, tid === 'vinter' ? 0.8 : 0, i), tid, 'gran');
        else {
          tidTrad(B, D => bjork(D, x, fot, hh, 3, lov, i), tid, 'bjork');
          if (tid === 'host' && hh > 8) for (let k = 0; k < hh * 1.5; k++) { const a = hash(k, i, 724) * 6.28, d = Math.sqrt(hash(k, i, 725)) * hh * 0.4; B.satt(Math.round(x + Math.cos(a) * d), Math.round(fot + 2 + Math.sin(a) * d * 0.35), I(P, hash(k, i, 726) < 0.25 ? 'rost' : 'senap', 2 + (k % 2))); } // fallna löv
        }
      }]);
    });
    ting.push([fot, () => tidTrad(B, D => sort === 'gran' ? torraka(D, 296, fot, 40) : torrBjork(D, 296, fot, 34), tid, sort)]);
    ting.push([fot + 10, () => fram(B, 100, fot + 10)]);
    ting.push([fot - 12, () => spelare(B, 162, fot - 12, 1, 'oliv')]);
    ting.push([fot + 2, () => spelare(B, 258, fot + 2, 1, 'oliv')]);
    ting.sort((a, b) => a[0] - b[0]).forEach(t => t[1]());
  }
  const TIDNAMN = { var: 'våren', host: 'hösten', vinter: 'vintern' };
  const TIDTEXT = {
    gran: { var: 'Barren som på sommaren, med ljusa nya skott ytterst på grenarna. Marken med vårblommor.', host: 'Granen är som på sommaren; gräset har vissnat i fläckar.', vinter: 'Snö på våningarna och på torrakans grenar, och marken under snö.' },
    bjork: { var: 'Ljusa nyutslagna löv.', host: 'Gula löv och några röda björkar, löv som fallit under kronan, och vissnat gräs i fläckar.', vinter: 'Kala grenar med snö ovanpå, och marken under snö.' },
  };

  // ---------- årstiderna för de fallna träden, stubbarna och skogen efter en brand (Björn efter bildstil v118) ----------
  // Samma modeller som du valde (fallet träd version 2, stubbe version 1, brandens version 1); på hösten har den
  // fallna björken gula löv, på vintern ligger snö ovanpå allt, och stubbarna får en mössa av snö.
  function snoMossa(B, cx, by, d) { // snön på snittytan: samma ellips som ytan, lite större, ljus ovanpå och grå i kanten nedtill
    const P = B.P, r = d / 2 + 0.6, hh = Math.max(2, Math.round(d * 0.5)), ey = Math.max(1, d * 0.28) + 0.6;
    for (let y = -Math.ceil(ey) - 1; y <= Math.ceil(ey); y++) for (let x = Math.floor(-r); x <= Math.ceil(r); x++) {
      const e = (x / r) ** 2 + ((y + 0.6) / (ey + 0.4)) ** 2; if (e > 1) continue;
      B.satt(cx + x, by - hh + y, y > ey * 0.4 ? I(P, 'ben', 2) : I(P, 'ben', 3));
    }
  }
  function fallnaTid(B, tid) {
    const P = B.P;
    tidMark(B, tid);
    const st = (x, y, d, sort) => { stubbe(B, x, y, d, sort, 0); if (tid === 'vinter') snoMossa(B, x, y, d); };
    const ting = [];
    ting.push([70, () => { st(40, 70, 7, 'gran'); fallet(B, 44, 66, 46, 'gran', 1, 1, 2, tid); }]);
    ting.push([150, () => { st(170, 150, 5, 'bjork'); fallet(B, 174, 147, 40, 'bjork', 1, 1, 4, tid); }]);
    ting.push([120, () => { st(300, 120, 4, 'gran'); fallet(B, 296, 117, 26, 'gran', 1, -1, 5, tid); }]);
    STUBBAR.forEach(([, d], i) => ting.push([176, () => st(30 + i * 22, 176, d, i % 2 ? 'bjork' : 'gran')]));
    ting.push([104, () => fram(B, 120, 104)]);
    ting.push([176, () => spelare(B, 250, 176, 1, 'oliv')]);
    ting.sort((a, b) => a[0] - b[0]).forEach(t => t[1]());
  }
  function brandVinter(B) { // vintern efter branden: snö över askan, svarta torrakor med snö på grenarna, levande skog till vänster
    const P = B.P, brant = (x, y) => (x - 70) * 0.9 + (vn(x, y, 40, 680) - 0.5) * 90 + (vn(x, y, 9, 681) - 0.5) * 10;
    tidMark(B, 'vinter');
    fyll(B, (x, y) => { const c = B.get(x, y); return brant(x, y) > 0 && vagstreck(x, y, 683, 0.01) && hash(x, y, 684) < 0.25 ? I(P, 'kol', hash(x, y, 686) < 0.5 ? 0 : 1) : c; }); // förkolnade kvistar som sticker upp ur snön
    const ting = [];
    for (let cy = 0; cy < 8; cy++) for (let cx = 0; cx < 11; cx++) {
      const x = cx * 30 + Math.floor(hash(cx, cy, 695) * 18), y = 30 + cy * 24 + Math.floor(hash(cx, cy, 696) * 10), b = brant(x, y);
      if (hash(cx, cy, 697) > 0.55 || y > 196) continue;
      const h = 26 + Math.floor(hash(cx, cy, 698) * 22), bj = hash(cx, cy, 699) < 0.35, s = cx * 11 + cy;
      if (b > 4) ting.push([y, () => tidTrad(B, D => bj ? brandBjork(D, x, y, Math.round(h * 0.85), 0, s) : brandGran(D, x, y, h, 0, s), 'vinter', 'bjork')]);
      else if (b < -14) ting.push([y, () => bj ? tidTrad(B, D => bjork(D, x, y, Math.round(h * 0.85), 3, 'vinter', s), 'vinter', 'bjork') : gran(B, x, y, h, 3, 0.8, s)]);
    }
    ting.push([150, () => spelare(B, 190, 150, 1, 'oliv')]);
    ting.sort((a, b) => a[0] - b[0]).forEach(t => t[1]());
  }
  const T = 'Steg 5.2.4.5, till ';
  // ---------- fler träd (Björn efter bildstil v114): varianter, brända träd, stubbar och fallna träd ----------
  // Ett träd ritas först i ett eget lager (en karta från punkt till färg) och läggs sedan ut med en ändring:
  // bredare eller smalare, högre eller lägre, lutande, ljusare eller mörkare barr och blad, eller liggande.
  function lager(B, rita) {
    const M = new Map(), D = { ...B, satt: (x, y, i) => { if (i >= 0) M.set(Math.round(x) + ',' + Math.round(y), i); }, get: (x, y) => { const v = M.get(Math.round(x) + ',' + Math.round(y)); return v === undefined ? -1 : v; }, morka: () => {} };
    rita(D);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const k of M.keys()) { const [x, y] = k.split(',').map(Number); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { M, x0, x1, y0, y1, get: (x, y) => { const v = M.get(Math.round(x) + ',' + Math.round(y)); return v === undefined ? -1 : v; } };
  }
  const rampAv = (P, i) => Math.floor(i / 4), tonAv = i => i % 4;
  const somRamp = (P, i, namn) => rampAv(P, i) === rampAv(P, P.i(namn, 0));
  // lägger ut ett lager: bred = bredden, hog = höjden, lut = punkter åt sidan i toppen, ton = ett steg ljusare eller mörkare (bara barr och blad)
  function utLager(B, L, cx, by, o = {}) {
    const P = B.P, bred = o.bred || 1, hog = o.hog || 1, lut = o.lut || 0, h = by - L.y0 + 1;
    const yt0 = by - Math.ceil((by - L.y0) * hog) - 1;
    for (let ty = yt0; ty <= L.y1 + 1; ty++) {
      const upp = (by - ty) / hog, sy = by - upp, f = Math.max(0, upp / h), dx = lut * f * f;
      for (let tx = cx - Math.ceil((cx - L.x0) * bred) - Math.abs(lut) - 2; tx <= cx + Math.ceil((L.x1 - cx) * bred) + Math.abs(lut) + 2; tx++) {
        const sx = cx + (tx - cx - dx) / bred;
        let c = L.get(sx, sy); if (c < 0) continue;
        if (o.ton && (somRamp(P, c, 'barr') || somRamp(P, c, 'oliv'))) c = c - tonAv(c) + Math.max(0, Math.min(3, tonAv(c) + o.ton));
        if (o.farg) { const n = o.farg(c, tx, ty, upp / h); if (n === null) continue; c = n; }
        B.satt(tx, ty, c);
      }
    }
  }
  const skugga = (B, cx, by, w) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -1; dx <= w * 2; dx++) if ((dx - w * 0.7) ** 2 / (w * w + 1) + dy * dy / 5 < 1) B.morka(cx + dx, by + dy); };

  // ---------- varianter ----------
  // niva 0: bara storleken, bredden och tonen; 1: dessutom lutning och kala nedre grenar (granen) eller en krona åt
  // ena sidan (björken); 2: dessutom dubbeltopp, krokig topp, två eller tre stammar och hängande grenar.
  function granVariant(B, cx, by, h, niva, s) {
    const r = k => hash(s, k, 640 + niva);
    const o = { bred: 0.82 + r(1) * 0.36, hog: 0.88 + r(2) * 0.24, ton: r(3) < 0.25 ? -1 : r(3) > 0.8 ? 1 : 0 };
    if (niva >= 1) o.lut = (r(4) - 0.5) * (niva === 2 ? 9 : 5);
    const kal = niva >= 1 && r(5) < 0.45 ? 0.12 + r(6) * 0.2 : 0; // de nedersta grenarna har dött
    const dubbel = niva === 2 && r(7) < 0.3;
    skugga(B, cx, by, Math.round(h * 0.28 * o.bred));
    const L = lager(B, D => {
      gran(D, cx, by, h, 3, 0, s);
      if (dubbel) gran(D, cx + 2, by - Math.round(h * 0.62), Math.round(h * 0.4), 3, 0, s + 7); // en andra topp
    });
    if (kal) { // de döda grenarna: korta grå grenar där barren fallit
      o.farg = (c, x, y, f) => f < kal && !somRamp(B.P, c, 'jord') ? null : c;
      const P = B.P, n = Math.round(h * kal / 3);
      for (let k = 0; k < n; k++) for (const sida of [-1, 1]) { const y = by - Math.round(h * 0.12) - k * 3, l = Math.round(h * 0.2 * (0.6 + hash(k, sida, s) * 0.6)); for (let i = 1; i <= l; i++) B.satt(cx + sida * i, y + Math.round(i * i / (l * 2.5)), i > l - 2 ? I(P, 'jord', 1) : I(P, 'kol', 3)); }
    }
    utLager(B, L, cx, by, o);
  }
  function bjorkVariant(B, cx, by, h, niva, s) {
    const r = k => hash(s, k, 660 + niva);
    const o = { bred: 0.82 + r(1) * 0.4, hog: 0.88 + r(2) * 0.24, ton: r(3) < 0.25 ? -1 : r(3) > 0.8 ? 1 : 0 };
    if (niva >= 1) o.lut = (r(4) - 0.5) * (niva === 2 ? 14 : 8); // kronan åt ena sidan, mot ljuset
    const stammar = niva === 2 && r(5) < 0.4 ? (r(6) < 0.5 ? 2 : 3) : 1;
    skugga(B, cx, by, Math.round(h * 0.3 * o.bred));
    const L = lager(B, D => {
      if (stammar === 1) bjork(D, cx, by, h, 3, 'sommar', s);
      else for (let k = stammar - 1; k >= 0; k--) bjork(D, cx + (k - (stammar - 1) / 2) * Math.max(3, h * 0.12), by, Math.round(h * (1 - k * 0.14)), 3, 'sommar', s + k * 5);
    });
    if (niva === 2 && r(8) < 0.5) { // hängande grenar: kronan dras ut nedåt i strängar
      const P = B.P;
      for (const [k, c] of [...L.M]) { const [x, y] = k.split(',').map(Number); if (y > L.y1 - (L.y1 - L.y0) * 0.45 && somRamp(P, c, 'oliv') && hash(x, 0, s + 671) < 0.35 && !L.M.has(x + ',' + (y + 1))) for (let j = 1; j <= 2 + Math.floor(hash(x, 1, s) * 4); j++) L.M.set(x + ',' + (y + j), I(P, 'oliv', j > 2 ? 0 : 1)); }
      L.y1 += 6;
    }
    utLager(B, L, cx, by, o);
  }
  function lund(B, sort, niva) { // en dunge där inget träd är likt ett annat
    const P = B.P;
    fyll(B, (x, y) => grasPunkt(x, y, P, 1)); tuvor(B, 1, () => true);
    const ting = [];
    const pl = [[16, 62, 30], [52, 70, 38], [92, 58, 28], [128, 74, 44], [170, 64, 32], [206, 76, 40], [244, 60, 30], [284, 72, 42], [30, 128, 46], [74, 134, 34], [118, 126, 30], [160, 138, 48], [204, 130, 36], [248, 136, 44], [296, 128, 32]];
    pl.forEach(([x, y, h], i) => ting.push([y, () => sort === 'gran' ? granVariant(B, x, y, h, niva, i * 17 + 3) : bjorkVariant(B, x, y, Math.round(h * 0.9), niva, i * 17 + 3)]));
    ting.push([100, () => spelare(B, 140, 100, 1, 'oliv')]);
    ting.sort((a, b) => a[0] - b[0]).forEach(t => t[1]());
  }

  // ---------- efter en skogsbrand ----------
  // marken: svart och grå aska i hela fläckar, förkolnade kvistar som korta streck, och bränt gult gräs i kanten
  function brandMark(B, v) {
    const P = B.P;
    const brant = (x, y) => (x - 70) * 0.9 + (vn(x, y, 40, 680) - 0.5) * 90 + (vn(x, y, 9, 681) - 0.5) * 10; // över 0 är bränt
    fyll(B, (x, y) => {
      const b = brant(x, y);
      if (b < -10) return grasPunkt(x, y, P, 1);
      if (b < 0) return flack(x, y, 10, 682, 0.5) ? I(P, 'senap', 0) : I(P, 'jord', 1); // svett gräs
      if (vagstreck(x, y, 683, 0.012)) return I(P, 'kol', 0); // förkolnade kvistar
      if (v === 2 && hash(x, y, 684) < 0.0015 && b > 30) return I(P, 'rost', 3); // glöd
      return flack(x, y, 18, 685, 0.6) ? I(P, 'ben', 0) : flack(x, y, 26, 686, 0.6) ? I(P, 'kol', 2) : I(P, 'kol', 3); // grå aska och svart jord
    });
    return brant;
  }
  const svart = (P, c) => I(P, 'kol', tonAv(c) >= 3 ? 1 : 0);
  function brandGran(B, cx, by, h, v, s) {
    const P = B.P;
    if (v === 0) { const L = lager(B, D => torraka(D, cx, by, h)); utLager(B, L, cx, by, { farg: c => svart(P, c) }); return; } // helt svart, alla grenar kvar
    if (v === 1) { // svart nedtill, bruna döda barr kvar upptill
      const L = lager(B, D => gran(D, cx, by, h, 3, 0, s)), T = lager(B, D => torraka(D, cx, by, h));
      utLager(B, T, cx, by, { farg: (c, x, y, f) => f > 0.55 ? null : svart(P, c) });
      utLager(B, L, cx, by, { farg: (c, x, y, f) => f < 0.5 ? (somRamp(P, c, 'jord') ? I(P, 'kol', 1) : null) : f < 0.6 ? (hash(x, y, 690) < 0.5 ? I(P, 'kol', 1) : I(P, 'jord', 0)) : somRamp(P, c, 'barr') ? I(P, tonAv(c) > 1 ? 'rost' : 'jord', tonAv(c) > 2 ? 1 : 0) : I(P, 'kol', 1) });
      return;
    }
    // avbruten och svart, med glöd kvar vid foten
    const kvar = 0.4 + hash(cx, s, 691) * 0.25, L = lager(B, D => torraka(D, cx, by, h));
    utLager(B, L, cx, by, { farg: (c, x, y, f) => f > kvar + (hash(x, 0, 692) - 0.5) * 0.08 ? null : svart(P, c) });
    B.satt(cx, by - Math.round(h * kvar) - 1, I(P, 'kol', 0));
    for (const [dx, dy] of [[-1, 0], [1, -1], [0, -3]]) B.satt(cx + dx, by + dy, I(P, dy ? 'rost' : 'senap', 3));
  }
  function brandBjork(B, cx, by, h, v, s) {
    const P = B.P;
    if (v === 0) { const L = lager(B, D => torrBjork(D, cx, by, h)); utLager(B, L, cx, by, { farg: c => svart(P, c) }); return; }
    if (v === 1) { // stammen svart nedtill och vit upptill, några bruna blad kvar
      const T = lager(B, D => torrBjork(D, cx, by, h)), L = lager(B, D => bjork(D, cx, by, h, 3, 'sommar', s));
      utLager(B, T, cx, by, { farg: (c, x, y, f) => f < 0.45 ? svart(P, c) : c });
      utLager(B, L, cx, by, { farg: (c, x, y) => somRamp(P, c, 'oliv') && vn(x, y, 4, 693 + s) > 0.55 ? I(P, 'jord', tonAv(c) > 2 ? 2 : tonAv(c) > 1 ? 1 : 0) : null });
      return;
    }
    const kvar = 0.45 + hash(cx, s, 694) * 0.2, L = lager(B, D => torrBjork(D, cx, by, h));
    utLager(B, L, cx, by, { farg: (c, x, y, f) => f > kvar ? null : svart(P, c) });
    for (const [dx, dy] of [[1, 0], [-1, -2]]) B.satt(cx + dx, by + dy, I(P, 'rost', 3));
  }
  function brand(B, v) {
    const brant = brandMark(B, v), ting = [];
    for (let cy = 0; cy < 8; cy++) for (let cx = 0; cx < 11; cx++) {
      const x = cx * 30 + Math.floor(hash(cx, cy, 695) * 18), y = 30 + cy * 24 + Math.floor(hash(cx, cy, 696) * 10), b = brant(x, y);
      if (hash(cx, cy, 697) > 0.55 || y > 196) continue;
      const h = 26 + Math.floor(hash(cx, cy, 698) * 22), bj = hash(cx, cy, 699) < 0.35, s = cx * 11 + cy;
      if (b > 4) ting.push([y, () => bj ? brandBjork(B, x, y, Math.round(h * 0.85), v, s) : brandGran(B, x, y, h, v, s)]);
      else if (b < -14) ting.push([y, () => bj ? bjorkVariant(B, x, y, Math.round(h * 0.85), 0, s) : granVariant(B, x, y, h, 0, s)]);
    }
    ting.push([150, () => spelare(B, 190, 150, 1, 'oliv')]);
    ting.sort((a, b) => a[0] - b[0]).forEach(t => t[1]());
  }

  // ---------- stubbar ----------
  // d = stammens bredd. Granen har brun bark, björken vit med svarta märken; snittytan är gråbrun med årsringar
  function stubbe(B, cx, by, d, sort, v) {
    const P = B.P, r = d / 2, hh = Math.max(2, Math.round(d * (v === 1 ? 0.7 : 0.5))), ey = Math.max(1, d * 0.28);
    for (let dx = -1; dx <= d + 1; dx++) B.morka(cx - r + dx + 2, by + 1);
    const bark = (x, y, sida) => sort === 'gran' ? I(P, 'jord', sida < -0.3 ? 2 : sida > 0.4 ? 0 : 1) : hash(Math.floor(y / 2), x, 700) < 0.2 ? I(P, 'kol', 1) : I(P, 'ben', sida < -0.3 ? 3 : sida > 0.4 ? 1 : 2);
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { // sidan med barken
      const rel = (x - cx) / (r + 0.01); if (Math.abs(rel) > 1) continue;
      const topp = by - hh - Math.round(ey * Math.sqrt(1 - rel * rel)) * 0 , botten = by + Math.round(ey * 0.6 * Math.sqrt(1 - rel * rel));
      const sned = v === 1 ? Math.round(rel * d * 0.35) : 0; // yxhugget: snittytan lutar
      for (let y = by - hh + sned; y <= botten; y++) B.satt(x, y, bark(x, y, rel));
      if (sort === 'gran' && hash(x, by, 701) < 0.3) B.satt(x, botten, I(P, 'jord', 0));
    }
    // snittytan: en ellips ovanpå
    for (let y = -Math.ceil(ey); y <= Math.ceil(ey); y++) for (let x = Math.floor(-r); x <= Math.ceil(r); x++) {
      const e = (x / (r + 0.01)) ** 2 + (y / ey) ** 2; if (e > 1) continue;
      const sned = v === 1 ? Math.round(x / (r + 0.01) * d * 0.35) : 0;
      const ring = Math.sqrt((x / (r + 0.01)) ** 2 + (y / ey) ** 2);
      let c = e > 0.75 ? (sort === 'gran' ? I(P, 'jord', 1) : I(P, 'ben', 1)) : (Math.round(ring * Math.max(2, d / 3)) % 2 ? I(P, 'jord', 2) : I(P, 'jord', 3));
      if (v === 2) c = e > 0.75 ? I(P, 'oliv', 1) : (Math.round(ring * Math.max(2, d / 3)) % 2 ? I(P, 'kol', 3) : I(P, 'ben', 0)); // gammal: grå, mossa i kanten
      B.satt(cx + x, by - hh + y + sned, c);
    }
    if (v === 1) { // flisor från yxan
      for (const [dx, dy] of [[r + 2, 1], [r + 4, 0], [-r - 3, 1]]) { B.satt(cx + dx, by + dy, I(P, 'jord', 3)); B.satt(cx + dx + 1, by + dy, I(P, 'jord', 2)); }
    }
    if (v === 2 && d > 4) { B.satt(cx - r + 1, by - 1, I(P, 'oliv', 2)); B.satt(cx - r + 1, by, I(P, 'oliv', 1)); B.satt(cx + r - 1, by - hh + 1, I(P, 'oliv', 2)); } // mossa
  }
  const STUBBAR = [['ungträd', 3], ['vuxet', 5], ['gammalt', 8], ['jätteträd', 12]];
  function stubbar(B, v) {
    const P = B.P;
    fyll(B, (x, y) => grasPunkt(x, y, P, 1)); tuvor(B, 1, () => true);
    STUBBAR.forEach(([, d], i) => { stubbe(B, 30 + i * 38, 50, d, 'gran', v); stubbe(B, 30 + i * 38, 100, d, 'bjork', v); stubbe(B, 220 + (i % 2) * 50, 50 + Math.floor(i / 2) * 50, d, i % 2 ? 'bjork' : 'gran', v); });
    folk(B, [[180, 100, 0]]);
  }

  // ---------- fallna träd: samma bild om det huggits ner eller blåst omkull ----------
  // Trädet ligger med foten vid stubben och toppen åt sidan. v 0: rakt åt sidan; 1: åt sidan och tillplattat (kronan
  // pressad mot marken, lägre och bredare); 2: fallet snett bort från den som tittar (kortare, toppen längre bort)
  function fallet(B, cx, by, h, sort, v, at, s, tid = 'sommar') {
    const P = B.P, L = lager(B, D => sort === 'gran' ? gran(D, cx, by, h, 3, 0, s) : bjork(D, cx, by, h, 3, tid, s));
    if (v === 2) { // bort från betraktaren: trädet blir kort i bilden, toppen längre bort och lite åt sidan
      skugga(B, cx, by - Math.round(h * 0.2), Math.round(h * 0.25));
      utLager(B, L, cx, by, { hog: 0.42, bred: 1.05, lut: at * 6 });
      return;
    }
    const sq = v === 1 ? 0.7 : 1; // hur mycket kronans bredd trycks ihop när den ligger på marken
    const ut = [];
    for (let ty = by - Math.ceil(h * 0.35 * sq) - 2; ty <= by + Math.ceil(h * 0.35 * sq) + 2; ty++) for (let k = 0; k <= h + 2; k++) {
      const c = L.get(cx - at * (ty - by) / sq, by - k); if (c >= 0) ut.push([cx + at * (k + 1), ty, c]);
    }
    const har = new Set(ut.map(([x, y]) => x + ',' + y));
    for (const [x, y] of ut) if (!har.has(x + ',' + (y + 2))) { B.morka(x, y + 2); B.morka(x + 1, y + 2); } // skuggan under stocken och kronan
    for (const [x, y, c] of ut) B.satt(x, y, tid === 'vinter' && !har.has(x + ',' + (y - 1)) && !somRamp(P, c, 'ben') && hash(x, y, 730) < 0.8 ? I(P, 'ben', 3) : c); // på vintern snö ovanpå stocken och grenarna
  }
  function fallna(B, v) {
    const P = B.P;
    fyll(B, (x, y) => grasPunkt(x, y, P, 1)); tuvor(B, 1, () => true);
    const ting = [];
    ting.push([70, () => { stubbe(B, 40, 70, 7, 'gran', 0); fallet(B, 44, 66, 46, 'gran', v, 1, 2); }]);
    ting.push([150, () => { stubbe(B, 170, 150, 5, 'bjork', 0); fallet(B, 174, 147, 40, 'bjork', v, 1, 4); }]);
    ting.push([120, () => { stubbe(B, 300, 120, 4, 'gran', 0); fallet(B, 296, 117, 26, 'gran', v, -1, 5); }]);
    ting.push([60, () => granVariant(B, 150, 60, 34, 0, 9)]);
    ting.push([104, () => fram(B, 120, 104)]);
    ting.push([176, () => spelare(B, 250, 176, 1, 'oliv')]);
    ting.sort((a, b) => a[0] - b[0]).forEach(t => t[1]());
  }

})();
