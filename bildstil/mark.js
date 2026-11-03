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
    for (let dx = -4; dx <= 4; dx++) if ((dx + fot) % 2 === 0) B.morka(Math.round(x) + dx + 1, fot + 1);
  }
  const folk = (B, lista) => lista.forEach(([x, fot, vast]) => vast ? spelare(B, x, fot, 1, 'oliv') : fram(B, x, fot));

  // en ruta upprepad: som jämförelse, så syns mönstret man vill undvika
  function upprepat(B) {
    const P = B.P;
    fyll(B, (x, y) => grasPunkt(x % 16, y % 16, P, 0));
    tuvor({ ...B, satt: (x, y, i) => { for (let a = x % 16; a < B.w; a += 16) for (let b = y % 16; b < B.h; b += 16) B.satt(a, b, i); }, morka: () => {} }, 0, (x, y) => x < 16 && y < 16);
  }
  function angen(B, v) {
    fyll(B, (x, y) => grasPunkt(x, y, B.P, v));
    tuvor(B, v, () => true);
    folk(B, [[70, 70, 0], [200, 120, 1], [250, 160, 0]]);
  }

  // ---------- granen: tre sätt att rita den ----------
  // h = höjden i punkter, sno = hur mycket snö på grenarna (0 till 1), v = versionen
  function gran(B, cx, by, h, v, sno = 0, s = 0) {
    const P = B.P;
    const skift = hash(cx, by, 401 + s) < 0.3 ? -1 : 0; // lite mörkare granar ibland
    const ton = t => I(P, 'barr', Math.max(0, Math.min(3, t + (t > 0 ? skift : 0))));
    const w2 = Math.max(1, Math.round(h * (v === 2 ? 0.3 : 0.28)));
    // skuggan på marken, snett till höger
    for (let dy = -2; dy <= 2; dy++) for (let dx = 0; dx <= w2 * 2; dx++) if ((dx + dy + by) % 2 === 0 && (dx - w2) ** 2 / (w2 * w2 + 1) + dy * dy / 5 < 1) B.morka(cx + dx, by + dy);
    const stam = Math.max(1, Math.round(h / 10));
    for (let y = 0; y < stam + 1; y++) { B.satt(cx, by - y, I(P, 'jord', 0)); if (h > 12) B.satt(cx - 1, by - y, I(P, 'jord', 1)); }
    if (h < 8) { // plantan: några barr
      for (let r = 0; r < h - 1; r++) { const hw = Math.floor(r / 2.2); for (let dx = -hw; dx <= hw; dx++) B.satt(cx + dx, by - h + r + 1, dx < 0 ? ton(2) : dx > 0 ? ton(0) : ton(1)); }
      B.satt(cx, by - h + 1, ton(3));
      return;
    }
    const hc = h - stam - 1, topp = by - h + 1;
    const snoP = (x, y, rel, rad) => sno > 0 && rel < 0.85 && hash(x, y, 406) < sno ? (rad === 0 ? I(P, 'ben', 3) : I(P, 'ben', 2)) : -1;
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
  // torrakan: en död gran, grå stam med korta grenstumpar och avbruten topp
  function torraka(B, cx, by, h, barr) {
    const P = B.P;
    for (let dx = 0; dx <= 6; dx++) if ((dx + by) % 2 === 0) B.morka(cx + dx, by + 1);
    for (let y = 0; y < h; y++) {
      const yy = by - y, w = y < h * 0.15 ? 1 : 0;
      B.satt(cx - 1, yy, I(P, 'skiffer', y > h - 3 ? 1 : 2)); B.satt(cx, yy, I(P, 'kol', 3)); if (w) B.satt(cx + 1, yy, I(P, 'kol', 2));
      if (hash(cx, yy, 420) < 0.12) B.satt(cx - 1, yy, I(P, 'ben', 0));
    }
    for (let k = 0; k < h * 0.7; k += 3) {
      const y = by - h + 4 + k, l = 1 + Math.floor(hash(k, cx, 421) * (2 + k / 6));
      for (const sida of [-1, 1]) if (hash(k, sida, 422) < 0.75) for (let i = 1; i <= l; i++) B.satt(cx + sida * i - (sida < 0 ? 1 : 0), y + Math.floor(i / 2), i === l ? I(P, 'kol', 2) : I(P, 'skiffer', 1));
      if (barr && hash(k, 7, 423) < 0.25) B.satt(cx + 2, y + 1, I(P, 'jord', 1)); // några bruna barr kvar
    }
    B.satt(cx, by - h, I(P, 'skiffer', 3)); B.satt(cx - 1, by - h + 1, I(P, 'ben', 0));
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
    for (let dy = -3; dy <= 3; dy++) for (let dx = -kw * 0.6; dx <= kw * 1.8; dx++) if ((Math.round(dx) + dy + by) % 2 === 0 && (dx - kw * 0.6) ** 2 / (kw * kw * 1.3 + 1) + dy * dy / 9 < 1 && tid !== 'vinter') B.morka(cx + dx, by + dy);
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
  // en torr björk: stammen avbruten, några grenstumpar
  function torrBjork(B, cx, by, h) {
    const P = B.P;
    bjorkStam(B, cx, by, h, by - h);
    for (let x = cx - 1; x <= cx + 1; x++) B.satt(x, by - h, hash(x, by, 520) < 0.5 ? I(P, 'jord', 1) : -1);
    grenar(B, cx, by - h * 0.7, Math.PI / 2 + 0.7, h * 0.18, 1, 521);
    grenar(B, cx + 1, by - h * 0.55, Math.PI / 2 - 0.8, h * 0.14, 1, 522);
    for (let y = by - h * 0.4; y > by - h; y -= 4) B.satt(cx + 1, y, I(P, 'jord', 0)); // svamp och sprickor
  }

  // ---------- en rad träd i alla stadier, med folk framför och bakom ----------
  const STADIER = [['planta', 6], ['ungträd', 15], ['vuxet', 31], ['gammalt', 46], ['jätteträd', 62]];
  function stadier(B, sort, v) {
    const P = B.P, fot = 100;
    fyll(B, (x, y) => grasPunkt(x, y, P, 0));
    tuvor(B, 0, () => true);
    const xs = [18, 46, 92, 156, 232], ting = [];
    STADIER.forEach(([, h], i) => { const x = xs[i], f = h > 40 ? 1 + hash(i, v, 530) * 0.08 : 1; ting.push([fot, () => sort === 'gran' ? gran(B, x, fot, Math.round(h * f), v, 0, i) : bjork(B, x, fot, Math.round(h * f), v, 'sommar', i)]); });
    ting.push([fot, () => sort === 'gran' ? torraka(B, 296, fot, 38, true) : torrBjork(B, 296, fot, 30)]);
    // en framför det vuxna trädet, en bakom det gamla och en bredvid jätteträdet
    ting.push([fot + 10, () => fram(B, 100, fot + 10)]);
    ting.push([fot - 12, () => spelare(B, 162, fot - 12, 1, 'oliv')]);
    ting.push([fot + 2, () => spelare(B, 258, fot + 2, 1, 'oliv')]);
    ting.sort((a, b) => a[0] - b[0]).forEach(t => t[1]());
  }

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
  function stigar(B, v) {
    const P = B.P;
    fyll(B, (x, y) => {
      const sd = stigAvst2(x, y) - (vn(x, y, 6, 561) - 0.5) * 3 - (Math.hypot(x - 160, y - 96) < 20 ? 7 : 0), r = hash(x, y, 562);
      if (v === 0) { // bar jord med mjuk kant, som i moodboarden
        if (sd < 3.5) return r < 0.24 ? I(P, 'jord', 1) : r > 0.8 ? I(P, 'jord', 3) : I(P, 'jord', 2);
        if (sd < 6.5 && hash(x, y, 563) < (6.5 - sd) / 3.5) return I(P, 'jord', 2);
        return grasPunkt(x, y, P, 0);
      }
      if (v === 1) { // två spår med en rand av gräs i mitten där stigen är bred
        const ad = Math.abs(sd - 2.2);
        if (sd < 5 && ad < 1.6 && !(sd < 1 && hash(x, y, 564) < 0.6)) return r < 0.3 ? I(P, 'jord', 1) : r > 0.85 ? I(P, 'jord', 3) : I(P, 'jord', 2);
        if (sd < 1) return r < 0.5 ? I(P, 'oliv', 0) : I(P, 'senap', 0);
        if (sd < 6 && hash(x, y, 565) < 0.3) return I(P, 'jord', 1);
        return grasPunkt(x, y, P, 0);
      }
      // nött gräs runt stigen, och småsten i den
      if (sd < 3) { const sten = r > 0.92; return sten ? I(P, 'skiffer', hash(x, y, 566) < 0.5 ? 2 : 3) : r < 0.3 ? I(P, 'jord', 1) : I(P, 'jord', 2); }
      if (sd < 11) { const t = (sd - 3) / 8; return bayer(x, y) > t * t ? (r < 0.35 ? I(P, 'senap', 0) : r < 0.6 ? I(P, 'senap', 1) : I(P, 'oliv', 2)) : grasPunkt(x, y, P, 0); }
      return grasPunkt(x, y, P, 0);
    });
    tuvor(B, 0, (x, y) => stigAvst2(x, y) > 9);
    ritaEld(B, 160, 92, B.P, {});
    folk(B, [[214, 92, 0], [120, 150, 1], [70, 104, 0]]);
  }

  // ---------- snön ----------
  function sno(B, v) {
    const P = B.P;
    fyll(B, (x, y) => {
      const vd = sjoAvst(x, y), r = hash(x, y, 571);
      if (vd < 1) { // isen
        let c = r < 0.24 ? I(P, 'skiffer', 2) : r > 0.8 ? I(P, 'ben', 1) : I(P, 'skiffer', 3);
                return c;
      }
      if (vd < 1.12) return r < 0.4 ? I(P, 'ben', 0) : I(P, 'ben', 1); // stranden under snön
      const sd = linjeAvst(x, y, [[-10, 150], [80, 130], [150, 110], [210, 50], [240, -10]]) - (vn(x, y, 5, 572) - 0.5) * 3;
      if (sd < 3) return bayer(x, y) < 0.45 ? I(P, 'jord', 1) : r < 0.5 ? I(P, 'ben', 0) : I(P, 'jord', 2);
      if (v === 0) return r < 0.24 ? I(P, 'ben', 1) : r > 0.8 ? I(P, 'ben', 3) : I(P, 'ben', 2);
      if (v === 1) { // drivor: blåskuggor på läsidan av vågor som blåsten gjort
        const d = vn(x, y, 30, 573), dn = vn(x + 2, y + 3, 30, 573);
        if (dn - d > 0.045 && hash(x, y, 578) < 0.7) return r < 0.5 ? I(P, 'skiffer', 3) : I(P, 'ben', 1);
        if (d - dn > 0.06 && hash(x, y, 579) < 0.5) return I(P, 'ben', 3);
        return r < 0.16 ? I(P, 'ben', 1) : I(P, 'ben', 2);
      }
      // tunn snö: gräset sticker upp där snön är tunn
      const tj = vn(x, y, 26, 574) * 0.7 + vn(x, y, 8, 575) * 0.3;
      if (tj < 0.3) return r < 0.3 ? I(P, 'oliv', 1) : r < 0.6 ? I(P, 'jord', 2) : I(P, 'ben', 0);
      if (tj < 0.38 && bayer(x, y) > (tj - 0.3) / 0.08) return r < 0.5 ? I(P, 'jord', 2) : I(P, 'ben', 0);
      return r < 0.24 ? I(P, 'ben', 1) : r > 0.85 ? I(P, 'ben', 3) : I(P, 'ben', 2);
    });
    // sprickor i isen: raka, hackiga linjer som grenar sig
    for (let k = 0; k < 7; k++) {
      let x = 150 + hash(k, 1, 580) * 160, y = 70 + hash(k, 2, 580) * 110, a = hash(k, 3, 580) * 6.28;
      const ga = (x, y, a, n, d) => { for (let i = 0; i < n; i++) { if (sjoAvst(x, y) > 0.94) return; B.satt(x, y, I(P, 'skiffer', 1)); if (hash(Math.round(x), Math.round(y), 581) < 0.25) B.satt(x + 1, y, I(P, 'ben', 1)); if (i % 6 === 5) a += (hash(i, k + d, 582) - 0.5) * 1.2; if (d < 2 && i % 14 === 13 && hash(i, k, 583) < 0.6) ga(x, y, a + (hash(i, k, 584) < 0.5 ? 0.9 : -0.9), n * 0.4, d + 1); x += Math.cos(a); y += Math.sin(a) * 0.8; } };
      ga(x, y, a, 30 + hash(k, 4, 580) * 40, 0);
    }
    if (v === 2) for (let k = 0; k < 500; k++) { // strån som sticker upp
      const x = Math.floor(hash(k, 1, 576) * W), y = Math.floor(hash(k, 2, 576) * H); if (sjoAvst(x, y) < 1.15) continue;
      B.satt(x, y, I(P, 'senap', 0)); B.satt(x, y - 1, I(P, 'senap', 1)); if (k % 2) B.satt(x + 1, y - 1, I(P, 'jord', 2));
    }
    // skuggigare snö under granarna
    const GR = [[20, 60, 30], [44, 40, 24], [64, 82, 34], [30, 120, 22], [100, 30, 28], [130, 56, 20]];
    for (const [gx, gy, h] of GR) for (let dy = -3; dy <= 3; dy++) for (let dx = -h * 0.35; dx <= h * 0.35; dx++) if (hash(gx + dx, gy + dy, 577) < 0.45) B.satt(gx + dx, gy + dy, v === 1 ? I(P, 'skiffer', 3) : I(P, 'ben', 0));
    const ting = GR.map(([x, y, h], i) => [y, () => gran(B, x, y, h, 0, 0.8, i)]);
    ting.push([126, () => spelare(B, 92, 126, 1, 'oliv')]);
    ting.push([104, () => spelare(B, 150, 104, 0, 'oliv')]);
    ting.sort((a, b) => a[0] - b[0]).forEach(t => t[1]());
  }

  // ---------- skogskanten i steg ----------
  // hur långt in i skogen en punkt är: över 0 i skogen, under 0 ute på gräset
  const skogE = (x, y) => 140 - (y - 96) * 0.35 + (vn(x, y, 46, 581) - 0.5) * 110 + (vn(x, y, 9, 582) - 0.5) * 12 - x;
  function skogskant(B, v) {
    const P = B.P;
    const steg = v === 0 ? [10, 0, -12, -28] : v === 1 ? [14, 0, -20, -44] : [6, 0, -7, -16];
    fyll(B, (x, y) => {
      const e = skogE(x, y), r = hash(x, y, 583);
      const skogsmark = () => { let c = r < 0.12 ? I(P, 'barr', 1) : r > 0.91 ? I(P, 'oliv', 1) : hash(x, y, 87) < 0.5 ? I(P, 'barr', 1) : I(P, 'oliv', 0); if (hash(x, y, 584) < 0.04) c = I(P, 'jord', 1); if (v === 2 && vn(x, y, 4, 585) > 0.7) c = hash(x, y, 586) < 0.6 ? I(P, 'oliv', 1) : I(P, 'oliv', 2); return c; }; // version 3: mossa
      const mork = () => r < 0.12 ? I(P, 'oliv', 0) : r > 0.91 ? I(P, 'oliv', 2) : I(P, 'oliv', 1);
      if (e > steg[0]) return skogsmark();
      if (e > steg[1]) return hash(x, y, 67) < 0.3 + (steg[0] - e) / (steg[0] - steg[1]) * 0.35 ? mork() : skogsmark();
      if (e > steg[2]) return hash(x, y, 68) < 0.18 ? skogsmark() : mork();
      if (e > steg[3]) return hash(x, y, 69) < (e - steg[3]) / (steg[2] - steg[3]) * 0.6 ? mork() : grasPunkt(x, y, P, 0);
      return grasPunkt(x, y, P, 0);
    });
    // högt mörkt gräs, och ormbunkar i version 2, längs kanten
    for (let k = 0; k < 1400; k++) {
      const x = Math.floor(hash(k, 5, 593) * W), y = Math.floor(hash(k, 6, 594) * H), e = skogE(x, y);
      if (e > steg[1] + 1 || e < steg[3] + 2) continue;
      const top = hash(k, 7) < 0.25 ? I(P, 'senap', 0) : I(P, 'oliv', 2);
      if (v === 1 && hash(k, 9) < 0.25) { // en ormbunke: blad ut åt båda hållen
        for (let i = -3; i <= 3; i++) { B.satt(x + i, y - 2 + Math.abs(i) * 0.5, Math.abs(i) > 2 ? I(P, 'oliv', 1) : I(P, 'oliv', 2)); B.satt(x + i, y - 1 + Math.abs(i) * 0.5, I(P, 'oliv', 0)); }
        continue;
      }
      if (v === 2 && hash(k, 9) < 0.06) { B.satt(x, y, I(P, 'skiffer', 1)); B.satt(x + 1, y, I(P, 'skiffer', 2)); B.satt(x, y - 1, I(P, 'skiffer', 3)); B.satt(x + 1, y - 1, I(P, 'skiffer', 2)); B.satt(x - 1, y, I(P, 'oliv', 1)); continue; } // sten med mossa
      B.satt(x, y, I(P, 'barr', 0)); B.satt(x, y - 1, I(P, 'oliv', 0)); B.satt(x, y - 2, top);
      if (hash(k, 8) < 0.5) { B.satt(x - 1, y - 1, I(P, 'oliv', 0)); B.satt(x - 1, y - 2, top); }
    }
    tuvor(B, 0, (x, y) => skogE(x, y) < steg[3]);
    // granarna: vuxna inne i skogen, unga i kanten, och en björk eller två
    const ting = [];
    for (let cy = 0; cy < 14; cy++) for (let cx = 0; cx < 12; cx++) {
      const x = cx * 14 + Math.floor(hash(cx, cy, 595) * 10), y = cy * 15 + Math.floor(hash(cx, cy, 596) * 8), e = skogE(x, y);
      if (e > 8 && hash(cx, cy, 597) < 0.62) ting.push([y, () => gran(B, x, y, 24 + Math.floor(hash(cx, cy, 598) * 14), 0, 0, cx)]);
      else if (e > steg[2] && e < 8 && hash(cx, cy, 599) < 0.7) ting.push([y, () => gran(B, x, y, 8 + Math.floor(hash(cx, cy, 600) * 6), 0, 0, cx)]);
    }
    ting.push([150, () => bjork(B, 150, 150, 30, 0)]);
    ting.push([132, () => spelare(B, 212, 132, 1, 'oliv')]);
    ting.push([86, () => spelare(B, 176, 86, 0, 'oliv')]);
    ting.sort((a, b) => a[0] - b[0]).forEach(t => t[1]());
  }

  // ---------- årstiderna i skogen: samma bit skog fyra gånger ----------
  const TIDER = ['var', 'sommar', 'host', 'vinter'];
  function grasTid(x, y, P, tid) {
    const c = grasPunkt(x, y, P, 0), t = c - P.i('oliv', 0);
    if (tid === 'var') return P.i('oliv', Math.min(3, t + (hash(x, y, 610) < 0.45 ? 1 : 0)));
    if (tid === 'host') { const brun = vn(x, y, 30, 609) * 0.5 + 0.25; return hash(x, y, 611) < brun * 0.6 ? [P.i('jord', 1), P.i('jord', 2), P.i('senap', 0), P.i('senap', 1)][t] : [P.i('oliv', 0), P.i('oliv', 0), P.i('oliv', 1), P.i('oliv', 2)][t]; }
    if (tid === 'vinter') { const r = hash(x, y, 612); return r < 0.24 ? P.i('ben', 1) : r > 0.8 ? P.i('ben', 3) : P.i('ben', 2); }
    return c;
  }
  function arstider(B, v) {
    const P = B.P, w = 160, h = 96;
    const BJ = [[30, 80, 30], [120, 76, 34], [76, 92, 18]], GR = [[60, 60, 34], [146, 50, 26], [10, 46, 22]];
    TIDER.forEach((tid, n) => {
      const ox = (n % 2) * w, oy = Math.floor(n / 2) * h;
      const D = { ...B, w, h, satt: (x, y, i, l) => { if (x >= 0 && y >= 0 && x < w && y < h) B.satt(ox + x, oy + y, i, l); }, get: (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? -1 : B.get(ox + x, oy + y), morka: (x, y) => { if (x >= 0 && y >= 0 && x < w && y < h) B.morka(ox + x, oy + y); } };
      fyll(D, (x, y) => {
        const sd = linjeAvst(x, y, [[-5, 70], [60, 76], [110, 66], [170, 72]]) - (vn(x, y, 5, 613) - 0.5) * 3;
        if (sd < 3) return tid === 'vinter' ? (bayer(x, y) < 0.45 ? P.i('jord', 1) : P.i('ben', 0)) : hash(x, y, 614) < 0.3 ? P.i('jord', 1) : P.i('jord', 2);
        return grasTid(x, y, P, tid);
      });
      if (tid !== 'vinter') tuvor(D, 0, () => true, 0.7);
      // vårens blommor och höstens löv på marken
      if (tid === 'var' || tid === 'host') for (let k = 0; k < 700; k++) {
        const x = Math.floor(hash(k, n, 615) * w), y = Math.floor(hash(k, n + 9, 615) * h);
        if (linjeAvst(x, y, [[-5, 70], [60, 76], [110, 66], [170, 72]]) < 4) continue;
        const nara = BJ.some(([bx, by, bh]) => Math.hypot((x - bx) / (bh * 0.5), (y - by) / 6) < 1);
        if (tid === 'var') {
          const tat = v === 1 ? vn(x, y, 14, 616) > 0.6 : true; // klungor
          if (!tat || hash(k, 1, 617) > (v === 1 ? 0.6 : v === 2 ? 0.34 : 0.16)) continue;
          const f = v === 2 ? [P.i('ben', 3), P.i('senap', 3), P.i('rost', 3)][k % 3] : k % 4 === 0 ? P.i('senap', 3) : P.i('ben', 3);
          D.satt(x, y, P.i('oliv', 1)); D.satt(x, y - 1, f); if (v === 1) { D.satt(x - 1, y - 1, f); D.satt(x, y - 2, f); D.satt(x, y - 1, P.i('senap', 3)); }
        } else {
          if (hash(k, 2, 618) > (nara ? 0.9 : v === 1 ? 0.12 : 0.3)) continue;
          const f = [P.i('senap', 2), P.i('senap', 1), P.i('rost', 2), P.i('senap', 3)][k % 4];
          D.satt(x, y, f); if (v === 2) { D.satt(x + 1, y, f); D.satt(x, y - 1, P.i('senap', 0)); } else if (k % 3 === 0) D.satt(x + 1, y, P.i('senap', 0));
        }
      }
      const ting = [];
      GR.forEach(([x, y, hh], i) => ting.push([y, () => gran(D, x, y, hh, 0, tid === 'vinter' ? (v === 2 ? 0.5 : 0.85) : 0, i)]));
      BJ.forEach(([x, y, hh], i) => ting.push([y, () => bjork(D, x, y, hh, v === 1 ? 1 : 0, tid, i)]));
      ting.sort((a, b) => a[0] - b[0]).forEach(t => t[1]());
      if (tid === 'vinter' && v === 1) for (let k = 0; k < 200; k++) D.satt(Math.floor(hash(k, 3, 619) * w), Math.floor(hash(k, 4, 619) * h), P.i('ben', 3)); // snöflingor
    });
    for (let y = 0; y < B.h; y++) { B.satt(w, y, P.i('kol', 0)); } for (let x = 0; x < B.w; x++) B.satt(x, h, P.i('kol', 0)); // ramar mellan årstiderna
  }

  const T = 'Steg 5.2.4.5, till ';
  const ARS = 'Vår uppe till vänster, sommar uppe till höger, höst nere till vänster och vinter nere till höger. ';
  VAL.push(
    { id: 'm_gras', stor: true, namn: 'Gräset', typ: 'tre', vad: T + '5.1.3.1: marken i pixlar, här 20 × 12 rutor gräs. Rutorna ritas inte som en bild som upprepas: varje punkt räknas ur sin plats på hela kartan, med stora fält av ljusare och mörkare gräs, korn punkt för punkt och tuvor som läggs ut med en slump som bara beror på platsen. Så blir kartan ett enda stort mönster, och två rutor är aldrig lika. Till jämförelse överst: samma ruta lagd om och om igen.',
      idag: SCEN(W, H, B => upprepat(B)), idagText: 'Samma ruta upprepad, det mönster som syns för tydligt och som vi undviker.',
      versioner: [
        { text: 'Korn som i moodboarden, och stora mörkare och ljusare fält med en tydlig kant.', ...SCEN(W, H, B => angen(B, 0)) },
        { text: 'Mjukare kant mellan fälten, klungor av högt gräs och någon vit blomma.', ...SCEN(W, H, B => angen(B, 1)) },
        { text: 'Korta strån med mörk fot och ljus topp överallt, gula blommor och mörka fläckar av klöver.', ...SCEN(W, H, B => angen(B, 2)) },
      ] },
    { id: 'm_vatten', stor: true, namn: 'Vattnet och stranden', typ: 'tre', vad: T + '5.1.3.1: sjön och stranden, 20 × 12 rutor. Strandkanten slingrar sig tvärs över rutorna, räknad ur avståndet till vattnet.',
      versioner: [
        { text: 'Som i moodboarden, som du gillade: djupt mörkt vatten, ljusare mot stranden, glitter i rader och en sandstrand.', ...SCEN(W, H, B => vatten(B, 0)) },
        { text: 'Bredare stenstrand, stenar som syns genom det grunda vattnet och vass i klungor.', ...SCEN(W, H, B => vatten(B, 1)) },
        { text: 'Mörkare vatten, en ljus rand där vattnet möter en smal lerig strand, och vass med kaveldun.', ...SCEN(W, H, B => vatten(B, 2)) },
      ] },
    { id: 'm_stig', stor: true, namn: 'Stigarna', typ: 'tre', vad: T + '5.1.3.1: stigarna som trampas upp mellan elden och det man går till, 20 × 12 rutor.',
      versioner: [
        { text: 'Bar jord med en mjuk kant av jord som tunnas ut i gräset, som i moodboarden.', ...SCEN(W, H, B => stigar(B, 0)) },
        { text: 'Två spår med en rand av torrt gräs i mitten, som en stig där man gått bredvid varandra.', ...SCEN(W, H, B => stigar(B, 1)) },
        { text: 'Smalare stig med småsten, och ett brett band av nött och gulnat gräs runt om.', ...SCEN(W, H, B => stigar(B, 2)) },
      ] },
    { id: 'm_sno', stor: true, namn: 'Snön', typ: 'tre', vad: T + '5.1.13: snön på marken i istiden, med isen på sjön, en stig och granar med snö på grenarna, 20 × 12 rutor.',
      versioner: [
        { text: 'Jämn snö med korn, som i moodboarden, och skuggigare snö under granarna.', ...SCEN(W, H, B => sno(B, 0)) },
        { text: 'Drivor som blåsten gjort, med kalla blågrå skuggor på läsidan.', ...SCEN(W, H, B => sno(B, 1)) },
        { text: 'Tunn snö där gräset och jorden syns i fläckar, och strån som sticker upp.', ...SCEN(W, H, B => sno(B, 2)) },
      ] },
    { id: 'm_skogskant', stor: true, namn: 'Skogskanten i steg', typ: 'tre', vad: T + '5.1.3.2: skogen går över i gräset i steg: skogsmark, skogsmark med gräs, mörkt högt gräs med unga granar och sist vanligt gräs. 20 × 12 rutor.',
      versioner: [
        { text: 'Som i moodboarden: stegen lika breda, högt gräs och unga granar i kanten.', ...SCEN(W, H, B => skogskant(B, 0)) },
        { text: 'Bredare steg, och ormbunkar bland det höga gräset.', ...SCEN(W, H, B => skogskant(B, 1)) },
        { text: 'Smalare steg, mossa i skogsmarken och stenar med mossa i kanten.', ...SCEN(W, H, B => skogskant(B, 2)) },
      ] },
    { id: 'm_gran', stor: true, namn: 'Granen i alla stadier', typ: 'tre', vad: T + '5.1.4 och 5.1.6: från vänster planta (under en halv ruta), ungträd (en ruta), vuxet (två rutor), gammalt (tre rutor), jätteträd (fyra rutor) och torrakan. En person står framför det vuxna trädet, en bakom det gamla och en bredvid jätteträdet.',
      versioner: [
        { text: 'Våningar av barr som i moodboarden, ljuset från vänster.', ...SCEN(W, 116, B => stadier(B, 'gran', 0)) },
        { text: 'Hängande grenar: varje våning böjer sig nedåt mot spetsarna.', ...SCEN(W, 116, B => stadier(B, 'gran', 1)) },
        { text: 'Glesare och oregelbunden: grenkransar med luft emellan, så att stammen syns.', ...SCEN(W, 116, B => stadier(B, 'gran', 2)) },
      ] },
    { id: 'm_bjork', stor: true, namn: 'Björken i alla stadier', typ: 'tre', vad: T + '5.1.4 och 5.1.6: från vänster planta, ungträd, vuxet, gammalt, jätteträd och en torr björk, på sommaren. Vit stam med svarta märken och mörk bark nedtill. En person framför, en bakom och en bredvid.',
      versioner: [
        { text: 'Kronan av runda klungor av blad, ljusa uppe till vänster.', ...SCEN(W, 116, B => stadier(B, 'bjork', 0)) },
        { text: 'Hängbjörk: bladen hänger i strängar och kronan är fransig nedtill.', ...SCEN(W, 116, B => stadier(B, 'bjork', 1)) },
        { text: 'Luftig krona av små samlingar blad, med grenarna synliga emellan.', ...SCEN(W, 116, B => stadier(B, 'bjork', 2)) },
      ] },
    { id: 'm_arstider', stor: true, namn: 'Skogen i fyra årstider', typ: 'tre', vad: T + '5.1.13: samma bit skog med granar, björkar och en stig. ' + ARS + 'Marken och granarna byter bara färger; björkarna gulnar (några blir röda) och är kala på vintern, snön ligger på granarnas grenar, löven ligger på marken på hösten och blommorna i gräset på våren.',
      versioner: [
        { text: 'Få blommor och löv, utspridda, och björkar med runda klungor.', ...SCEN(W, H, B => arstider(B, 0)) },
        { text: 'Blommorna i klungor, löven tätast under björkarna, hängbjörkar och snöfall på vintern.', ...SCEN(W, H, B => arstider(B, 1)) },
        { text: 'Blommor i tre färger, större löv och mindre snö på granarna.', ...SCEN(W, H, B => arstider(B, 2)) },
      ] },
  );
})();
