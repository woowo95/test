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
    var: ['oliv', [0, 2, 3, 3]], sommar: ['oliv', [0, 1, 2, 3]], host: ['senap', [0, 1, 2, 3]], hostrod: ['rost', [0, 1, 2, 3]],
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
  function grasRen(x, y, P) { // gräset du valde (version 2), utan rastret och nästan utan korn
    const lo = I(P, 'oliv', 1), mid = I(P, 'oliv', 2), hi = I(P, 'oliv', 3);
    if (flack(x, y, 44, 301, 0.64)) { // mörkare fält med ren kant
      if (hash(x, y, 303) < 0.004) return mid;
      return lo;
    }
    if (hash(x, y, 303) < 0.004) return hi; // ett och annat strå
    if (hash(x, y - 1, 303) < 0.004) return lo;
    return mid;
  }
  function tuvorRen(B, ok, tat = 1) { // klungor av högt gräs, ett och annat strå och en vit blomma
    const P = B.P;
    for (let cy = 0; cy * 11 < B.h + 11; cy++) for (let cx = 0; cx * 12 < B.w + 12; cx++) {
      const x = cx * 12 + Math.floor(hash(cx, cy, 311) * 12), y = cy * 11 + Math.floor(hash(cx, cy, 312) * 11);
      if (!ok(x, y)) continue;
      const r = hash(cx, cy, 313);
      if (vn(x, y, 30, 314) > 0.62 && r < 0.75 * tat) { // klunga av högt gräs: fyra strån
        for (let k = 0; k < 4; k++) { const xx = x + k - 1, hh = 2 + ((k * 3 + cx) % 3 === 0 ? 2 : 1); for (let j = 0; j < hh; j++) B.satt(xx + (j === hh - 1 ? (k < 2 ? -1 : 1) * (hh > 3 ? 1 : 0) : 0), y - j, j === 0 ? I(P, 'oliv', 0) : j === hh - 1 ? I(P, 'oliv', 3) : I(P, 'oliv', 1)); }
      } else if (r < 0.16 * tat) { // en tuva: två strån
        B.satt(x, y, I(P, 'oliv', 0)); B.satt(x, y - 1, I(P, 'oliv', 3)); B.satt(x + 1, y, I(P, 'oliv', 0)); B.satt(x + 1, y - 1, I(P, 'oliv', 1)); B.satt(x + 1, y - 2, I(P, 'oliv', 3));
      } else if (r < 0.19 * tat) { // en vit blomma
        B.satt(x, y, I(P, 'oliv', 0)); B.satt(x, y - 1, I(P, 'ben', 3)); B.satt(x - 1, y - 1, I(P, 'ben', 2)); B.satt(x + 1, y - 1, I(P, 'ben', 2)); B.satt(x, y - 2, I(P, 'ben', 2));
      }
    }
  }
  // stigarna (version 1): jämn bar jord med en ren kant, en mörkare rand av nött gräs längs kanten och få stenar
  function stigarRen(B) {
    const P = B.P;
    fyll(B, (x, y) => {
      const sd = stigAvst2(x, y) - (vn(x, y, 10, 561) - 0.5) * 3 - (Math.hypot(x - 160, y - 96) < 20 ? 7 : 0);
      if (sd < 3.5) return flack(x, y, 9, 562, 0.68) ? I(P, 'jord', 3) : I(P, 'jord', 2);
      if (sd < 4.5) return I(P, 'jord', 1);
      return grasRen(x, y, P);
    });
    for (let k = 0; k < 40; k++) { // några stenar i stigen
      const x = Math.floor(hash(k, 1, 567) * W), y = Math.floor(hash(k, 2, 567) * H);
      if (stigAvst2(x, y) > 1.5 || Math.hypot(x - 160, y - 96) < 24) continue;
      B.satt(x, y, I(P, 'jord', 0)); B.satt(x + 1, y, I(P, 'jord', 0)); B.satt(x, y - 1, I(P, 'jord', 1));
    }
    tuvorRen(B, (x, y) => stigAvst2(x, y) > 9);
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
        return flack(x, y, 20, 571, 0.7) ? I(P, 'skiffer', 2) : I(P, 'skiffer', 3);
      }
      if (vd < 1.08) return I(P, 'ben', 1); // stranden under snön
      const sd = linjeAvst(x, y, [[-10, 150], [80, 130], [150, 110], [210, 50], [240, -10]]) - (vn(x, y, 8, 572) - 0.5) * 3;
      if (sd < 3) return I(P, 'ben', 0);
      if (sd < 4) return I(P, 'ben', 1);
      if (GR.some(([gx, gy, h]) => ((x - gx - 2) / (h * 0.38)) ** 2 + ((y - gy) / 3.5) ** 2 < 1)) return I(P, 'ben', 1); // skuggan under granarna
      const driva = (x, y) => vn(x * 0.45, y, 18, 573) > 0.62; // drivorna: långa och smala, i blåstens riktning
      if (driva(x, y)) return I(P, 'ben', 3);
      if (driva(x, y - 1) || driva(x, y - 2)) return I(P, 'ben', 1); // skuggan under drivan
      return I(P, 'ben', 2);
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
      const skogsmark = () => flack(x, y, 14, 584, 0.62) ? I(P, 'oliv', 0) : I(P, 'barr', 1);
      const mork = () => flack(x, y, 16, 585, 0.66) ? I(P, 'oliv', 2) : I(P, 'oliv', 1);
      if (e > steg[0]) return skogsmark();
      if (e > steg[1]) return flack(x, y, 11, 586, 0.5) ? mork() : skogsmark(); // skogsmark med fläckar av gräs
      if (e > steg[2]) return mork();
      if (e > steg[3]) return flack(x, y, 11, 587, 0.5) ? mork() : grasRen(x, y, P); // fläckar av mörkt gräs i gräset
      return grasRen(x, y, P);
    });
    // högt mörkt gräs längs kanten, i klungor
    for (let k = 0; k < 900; k++) {
      const x = Math.floor(hash(k, 5, 593) * W), y = Math.floor(hash(k, 6, 594) * H), e = skogE(x, y);
      if (e > steg[1] + 1 || e < steg[3] + 2 || vn(x, y, 12, 595) < 0.5) continue;
      const top = hash(k, 7) < 0.2 ? I(P, 'senap', 0) : I(P, 'oliv', 2);
      B.satt(x, y, I(P, 'oliv', 0)); B.satt(x, y - 1, I(P, 'oliv', 0)); B.satt(x, y - 2, top);
      B.satt(x + 1, y, I(P, 'oliv', 0)); B.satt(x + 1, y - 1, top);
    }
    tuvorRen(B, (x, y) => skogE(x, y) < steg[3] - 6);
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
    fyll(B, (x, y) => grasRen(x, y, P));
    tuvorRen(B, () => true, 0.6);
    const xs = [18, 46, 92, 156, 232], ting = [];
    STADIER.forEach(([, h], i) => { const x = xs[i], f = h > 40 ? 1 + hash(i, 3, 530) * 0.08 : 1; ting.push([fot, () => sort === 'gran' ? gran(B, x, fot, Math.round(h * f), 3, 0, i) : bjork(B, x, fot, Math.round(h * f), 3, 'sommar', i)]); });
    ting.push([fot, () => sort === 'gran' ? torraka(B, 296, fot, 40) : torrBjork(B, 296, fot, 34)]);
    ting.push([fot + 10, () => fram(B, 100, fot + 10)]);
    ting.push([fot - 12, () => spelare(B, 162, fot - 12, 1, 'oliv')]);
    ting.push([fot + 2, () => spelare(B, 258, fot + 2, 1, 'oliv')]);
    ting.sort((a, b) => a[0] - b[0]).forEach(t => t[1]());
  }

  const T = 'Steg 5.2.4.5, till ';
  VAL.push(
    { id: 'm_gras', stor: true, namn: 'Gräset', typ: 'janej', vad: T + '5.1.3.1: gräset du valde (version 2), ritat renare efter din kommentar: inget raster mellan fälten och nästan inga lösa korn. Fälten har en ren kant, och det som syns i gräset är hela saker: klungor av högt gräs, tuvor och en och annan vit blomma. Din kommentar förra gången (om alla korten): ”mycket är lite för smutsigt eller pixligt eller för prickigt”.',
      versioner: [{ text: 'Version 1: gräset renare.', ...SCEN(W, H, B => { fyll(B, (x, y) => grasRen(x, y, B.P)); tuvorRen(B, () => true); folk(B, [[70, 70, 0], [200, 120, 1], [250, 160, 0]]); }) }] },
    { id: 'm_stig', stor: true, namn: 'Stigarna', typ: 'janej', vad: T + '5.1.3.1: stigarna du valde (version 1), renare: jämn bar jord med en ren kant och en mörkare rand av nött gräs längs kanten, några stenar, och gräset som ovan. Din kommentar förra gången: ”Men bilden ser för prickig ut”.',
      versioner: [{ text: 'Version 1: stigarna renare.', ...SCEN(W, H, B => stigarRen(B)) }] },
    { id: 'm_sno', stor: true, namn: 'Snön', typ: 'janej', vad: T + '5.1.13: drivorna du valde (version 2), renare: skuggorna på läsidan är hela ytor i stället för prickar, isen är slät med några raka sprickor, och stigen och skuggan under granarna är jämna. Din kommentar förra gången: ”Men bilden ser för prickig ut”.',
      versioner: [{ text: 'Version 1: snön renare.', ...SCEN(W, H, B => snoRen(B)) }] },
    { id: 'm_skogskant', stor: true, namn: 'Skogskanten i steg', typ: 'janej', vad: T + '5.1.3.2: stegen du valde (version 1), renare: varje steg är en hel yta med en slingrande kant i stället för prickar som blandas, och det höga gräset står i klungor. Din kommentar förra gången: ”Men bilden ser för prickig ut”.',
      versioner: [{ text: 'Version 1: skogskanten renare.', ...SCEN(W, H, B => skogskantRen(B)) }] },
    { id: 'm_gran', stor: true, namn: 'Granen i alla stadier', typ: 'janej', vad: T + '5.1.4 och 5.1.6: våningarna du gillade (version 1), nu osymmetriska: varje våning är olika lång åt vänster och höger och lite förskjuten, så att ingen gran är spegelvänd. Mindre slump i barren. Från vänster planta, ungträd, vuxet, gammalt, jätteträd och torrakan, nu med alla grenar kvar men inga barr. Din kommentar förra gången: ”Jag gillar version 1 bäst men den ser för perfekt ut. Gör det lite osymmetrisk”.',
      versioner: [{ text: 'Version 1: granen osymmetrisk.', ...SCEN(W, 116, B => stadierRen(B, 'gran')) }] },
    { id: 'm_bjork', stor: true, namn: 'Björken i alla stadier', typ: 'janej', vad: T + '5.1.4 och 5.1.6: klungorna du gillade (version 1), med en ren mörk kant bara nedtill och till höger, där skuggan är (ljuset från vänster ovanifrån), och inga mörka ringar inne i kronan. Från vänster planta, ungträd, vuxet, gammalt, jätteträd och en torr björk med alla grenar men inga löv. Din kommentar förra gången: ”Jag gillar version 1 bäst men trädkronans mörka konturer ser slarviga ut”.',
      versioner: [{ text: 'Version 1: björken med ren kant.', ...SCEN(W, 116, B => stadierRen(B, 'bjork')) }] },
    { id: 'm_vatten', stor: true, namn: 'Vattnet och stranden', typ: 'tre', vad: T + '5.1.3.1: sjön och stranden, 20 × 12 rutor. Strandkanten slingrar sig tvärs över rutorna, räknad ur avståndet till vattnet.',
      versioner: [
        { text: 'Som i moodboarden, som du gillade: djupt mörkt vatten, ljusare mot stranden, glitter i rader och en sandstrand.', ...SCEN(W, H, B => vatten(B, 0)) },
        { text: 'Bredare stenstrand, stenar som syns genom det grunda vattnet och vass i klungor.', ...SCEN(W, H, B => vatten(B, 1)) },
        { text: 'Mörkare vatten, en ljus rand där vattnet möter en smal lerig strand, och vass med kaveldun.', ...SCEN(W, H, B => vatten(B, 2)) },
      ] },
  );
})();
