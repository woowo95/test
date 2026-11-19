// ---------- marken och träden (steg 5.2.4.5): tre versioner av varje del, i stora sammanhang ----------
// Marken ritas inte som rutor som upprepas. Varje punkt räknas ur sin plats på hela kartan (världens koordinater):
// stora fält av ljusare och mörkare gräs (långsamma vågor), korn punkt för punkt, och tuvor, blommor och stenar som
// läggs ut med en slump som bara beror på platsen. Då blir kartan ett enda stort mönster utan skarvar, och två rutor
// gräs är aldrig lika. Kanterna mellan gräs, vatten, strand, stig och skog räknas ur avståndet till det andra, inte
// ur rutans form, så att de slingrar sig tvärs över rutorna.
(() => {
  const I = (P, r, t) => P.i(r, t);

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
  // en kartfigur framifrån (svar/c-stationer.js ställer folk på sina bilder med den)
  let FN = 0;
  function fram(B, x, fot) { // en kartfigur framifrån
    if (!window.BYBO) return; const F = window.BYBO(3000 + (FN++ % 30) * 7919, 'fram', 'sta', 'hanga');
    for (let y = 0; y < F.h; y++) for (let dx = 0; dx < F.w; dx++) { const v = F.px[y * F.w + dx]; if (v >= 0) B.satt(Math.round(x) - (F.w >> 1) + dx, fot - F.h + 1 + y, v); }
    for (let dx = -4; dx <= 4; dx++) B.morka(Math.round(x) + dx + 1, fot + 1);
  }

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

  // vattnet och stranden som i spelet (src/ui/mark.ts, version 1, sommar): sd är avståndet till stranden i rutor,
  // positivt i vattnet. Ger null där det är gräs. Fas 7:s kort ritar sjön med den här.
  // spelSd: kanten slingrar sig som i spelet; spelVatten tar det slingrade avståndet
  const spelSd = (x, y, sd) => (sd > -1.8 && sd < 2.6 ? sd + (vn(x, y, 22, 541) - 0.5) * 0.9 + (vn(x, y, 7, 542) - 0.5) * 0.25 : sd);
  function spelVatten(x, y, sd, P) {
    const r = hash(x, y, 543);
    if (sd > 0) {
      if (sd < 0.28 && vn(x, y, 3, 544) > 0.66) return sd < 0.12 ? I(P, 'skiffer', 3) : I(P, 'skiffer', 2);
      const dj = sd > 1.3 ? 0 : sd > 0.42 ? 1 : 2, gl = vn(x, y, 5, 545) > 0.7 && (y + Math.floor(x / 6)) % 4 === 0;
      return gl ? I(P, 'skiffer', Math.min(3, dj + 1)) : dj === 0 ? (r < 0.3 ? I(P, 'barr', 0) : I(P, 'skiffer', 0)) : I(P, 'skiffer', dj);
    }
    if (sd > -0.6) { const sten = vn(x, y, 3, 548); return sten > 0.62 ? (sten > 0.72 ? I(P, 'skiffer', 3) : I(P, 'skiffer', 2)) : r < 0.3 ? I(P, 'jord', 2) : r < 0.85 ? I(P, 'senap', 0) : I(P, 'jord', 3); }
    if (sd > -0.75 && hash(x, y, 549) < 0.5) return I(P, 'senap', 0);
    return null;
  }

  // ---------- snön på stubbarna (Björn efter bildstil v118): på vintern får stubbarna en mössa av snö ----------
  function snoMossa(B, cx, by, d) { // snön på snittytan: samma ellips som ytan, lite större, ljus ovanpå och grå i kanten nedtill
    const P = B.P, r = d / 2 + 0.6, hh = Math.max(2, Math.round(d * 0.5)), ey = Math.max(1, d * 0.28) + 0.6;
    for (let y = -Math.ceil(ey) - 1; y <= Math.ceil(ey); y++) for (let x = Math.floor(-r); x <= Math.ceil(r); x++) {
      const e = (x / r) ** 2 + ((y + 0.6) / (ey + 0.4)) ** 2; if (e > 1) continue;
      B.satt(cx + x, by - hh + y, y > ey * 0.4 ? I(P, 'ben', 2) : I(P, 'ben', 3));
    }
  }
  // ---------- fler träd (Björn efter bildstil v114): varianter, stubbar och fallna träd ----------
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

  window.MARK = { grasPunkt, tuvor, fram, granVariant, bjorkVariant, stubbe, fallet, snoMossa, spelSd, spelVatten }; // marken och kartfiguren till djurens kort (djur.js)
})();
