// hunden och valpen byggda av spelets varg (Björn efter bildstil v238: "utgå från hur vargen ser ut hunden ska se nästan
// lika dan ut", och valpen var samma djur i olika ställningar). Samma former som vargen i djur.js, med skalan t.s, mildare drag
// (inga tänder, inget gult öga), en annan päls och för två av dem en ringlad svans. Valpen i varje version är ungen av
// hunden i samma version: mindre, med större huvud och tjockare ben. Från sidan, framifrån och bakifrån, som vargen.
(() => {
  const D = window.DJURBILD; if (!D) return;
  const { lagg } = window.F7, gras = window.F98.gras;
  const legend = pals => { const L = {}; for (const [k, [r, t]] of Object.entries({ ...pals, ...D.FAST })) L[k] = r + t; return L; };
  const PALSAR = [
    ['grå som vargen', D.PALS.varg[1][1]],
    ['brun', D.PALS.varg[3][1]],
    ['svart med ljus buk', { o: ['kol', 0], d: ['kol', 1], m: ['kol', 2], l: ['jord', 2], c: ['ben', 2], b: ['ben', 3] }],
  ];
  const HUND = { ben: 6.8, kropp: 3.2, ruff: 3.4, huvud: 2.8, nos: 3.8, svans: 2.2, sank: 0.4, mask: false, s: 0.9 };
  const VALP = { ben: 5.6, kropp: 3.3, ruff: 3.2, huvud: 3.5, nos: 2.6, svans: 1.8, sank: 0, mask: false, s: 0.62, bt: 1.6 };
  const svansar = [{ krull: true }, {}, { krull: true }];
  const bild = (t, L) => { const v = D.vargen(t), b = r => Math.max(...r.map(x => x.length)), w = 3 + b(v.sida) + 4 + b(v.fram) + 4 + b(v.bak) + 3, h = Math.max(v.sida.length, v.fram.length) + 6;
    return { w, h, rita: B => { gras(B); let x = 3; for (const r of [v.sida, v.fram, v.bak]) { lagg(B, r, L, x, h - 3 - r.length); x += b(r) + 4; } } }; };
  const kort = (id, namn, vad, t, om) => ({ id, namn, typ: 'tre', vad, versioner: PALSAR.map(([p, pals], i) => ({ text: om(p, svansar[i]), ...bild({ ...t, ...svansar[i] }, legend(pals)) })) });
  const byt = k => { const i = VAL.findIndex(s => s.id === k.id); if (i >= 0) VAL[i] = k; else VAL.push(k); };
  byt(kort('f9_hund', 'Hunden', 'Steg 9.8.3: hunden är en tämjd varg, fullvuxen. Byggd av spelets varg med samma former, lite mindre och med mildare drag, från sidan, framifrån och bakifrån som vargen. Tre hundar som skiljer sig i päls och svans. Din kommentar förra gången: ”utgå från hur vargen ser ut hunden ska se nästan lika dan ut”',
    HUND, (p, s) => `Vargens former, ${p}, ${s.krull ? 'med svansen ringlad över ryggen' : 'med svansen hängande som vargens'}.`));
  byt(kort('f9_valp', 'Valpen', 'Steg 9.8.2: valpen är ungen som växer upp till hunden: samma former som hunden och vargen men liten, med större huvud och tjocka ben. Version 1–3 är ungarna till hundarna i samma version. Din kommentar förra gången: ”detta är samma djur i olika positioner. Felritat”',
    VALP, (p, s) => `Ungen till hund ${p === 'grå som vargen' ? 1 : p === 'brun' ? 2 : 3}: ${p}${s.krull ? ', svansen ringlad' : ''}.`));
})();
