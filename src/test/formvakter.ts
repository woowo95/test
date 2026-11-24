// Vakterna för formen (steg 12.1.43, Att hitta felen: Vakterna för formen). Det i panelerna som går att mäta utan att någon
// tittar mäts av npm run utseende i varje flik och i personens ruta, på datorn och i mobilen, i ljust och mörkt läge. Registret
// FORMVAKTER har en rad per vakt; mätningen görs i sidan (FORM_MATA, en text som utseende.ts kör med page.evaluate) och
// larmet säger fliken, saken och måttet. Gränserna står i FORM. Det som larmar i dag listas för Björn och rättas i egna steg;
// vakterna gör inte utseendets felkod röd (FORM_FEL=1 gör det)
export const FORM = {
  rubrikRader: 2, // en rubrik, en knapp eller en etikett bryts på högst så här många rader
  minPx: 11, // den minsta textstorleken i punkter
  kontrast: 4.5, kontrastStor: 3, // den minsta kontrasten mot bakgrunden (WCAG), och för text från 18 punkter
  finger: 24, fingerMobil: 32, // en knapp är minst så här stor (punkter) åt båda håll, på datorn och i mobilen
  knappGap: 2, // och minst så här långt från nästa knapp
  linje: 3, // kanter i samma rad eller kolumn som skiljer sig med 1 till så här många punkter
  avstand: 3, // avstånden mellan saker av samma slag i en lista skiljer sig med mer än så här många punkter
  max: 4, // så här många exempel per vakt och flik
};
export const FORMVAKTER: { id: string; namn: string }[] = [
  { id: 'utanfor', namn: 'Text som sticker ut ur eller klipps av sin ruta' },
  { id: 'rader', namn: 'En rubrik, knapp eller etikett bryts på för många rader' },
  { id: 'ensamt', namn: 'Ett ensamt ord på sista raden' },
  { id: 'delat', namn: 'Ett ord som delas på två rader' },
  { id: 'liten', namn: 'Text mindre än den minsta storleken' },
  { id: 'kontrast', namn: 'Text med för svag kontrast mot sin bakgrund' },
  { id: 'palett', namn: 'Färger utanför paletten i panelerna' },
  { id: 'finger', namn: 'Knappar mindre än ett finger' },
  { id: 'tata', namn: 'Knappar tätare än gränsen' },
  { id: 'overlapp', namn: 'Knappar eller namn som ligger över varandra' },
  { id: 'sidled', namn: 'Rullning i sidled' },
  { id: 'rullning', namn: 'En rullning inuti en rullning' },
  { id: 'kanter', namn: 'Kanter i samma rad eller kolumn som skiljer sig några punkter' },
  { id: 'avstand', namn: 'Olika avstånd mellan saker av samma slag' },
  { id: 'emoji', namn: 'Emoji bland pixelsymbolerna' },
  { id: 'skala', namn: 'Bilder ritade i en annan skala än hel' },
  { id: 'forklaring', namn: 'Symboler utan förklaring' },
  { id: 'tom', namn: 'Tomma rubriker och flikar' },
];
export interface FormLarm { vakt: string; flik: string; sak: string; matt: string }

// mätningen i sidan: ({ pal, form, flik, mobil, topp }) => FormLarm[]; topp mäter sidhuvudet och runstenarna i stället för panelerna. Paletten som tal (0xRRGGBB). Bara det som syns i panelerna
export const FORM_MATA = `({ pal, form, flik, mobil, topp }) => {
  const P = new Set(pal), ut = [], antal = {};
  const larm = (vakt, el, matt) => { antal[vakt] = (antal[vakt] || 0) + 1; if (antal[vakt] > form.max) return; ut.push({ vakt, flik, sak: namn(el), matt }); };
  const namn = el => { if (!el || !el.tagName) return ''; const t = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').replace(/\\s+/g, ' ').trim().slice(0, 40); return el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/)[0] : '') + (t ? ' "' + t + '"' : ''); };
  const syns = el => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const c = getComputedStyle(el); return c.visibility !== 'hidden' && c.display !== 'none' && +c.opacity > 0.05; };
  const rgb = v => { const m = /rgba?\\(([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)(?:,\\s*([\\d.]+))?/.exec(v || ''); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : undefined; };
  const tal = c => (Math.round(c.r) << 16) | (Math.round(c.g) << 8) | Math.round(c.b);
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bakgrund = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c && c.a > 0.5) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  const paneler = [...document.querySelectorAll(topp ? 'header, nav.tabs' : '.panel:not([hidden]) .panelkropp')].filter(syns);
  const EMOJI = /\\p{Extended_Pictographic}/u;
  for (const pan of paneler) {
    const alla = [...pan.querySelectorAll('*')].filter(syns);
    if (!(pan.innerText || '').trim() && !pan.querySelector('img,svg,canvas')) larm('tom', pan, 'fliken är tom');
    if (pan.scrollWidth > pan.clientWidth + 1) larm('sidled', pan, 'rullar i sidled: ' + pan.scrollWidth + ' mot ' + pan.clientWidth + ' punkter');
    const pr = pan.getBoundingClientRect();
    // det som syns av en knapp: rutan och det som står i den (namnet kan vara bredare än rutan)
    const yta = b => {
      let l = 1e9, r = -1e9, t = 1e9, bo = -1e9; const med = q => { if (q.width > 0 && q.height > 0) { l = Math.min(l, q.left); r = Math.max(r, q.right); t = Math.min(t, q.top); bo = Math.max(bo, q.bottom); } };
      med(b.getBoundingClientRect());
      // texten i knappen; inte märken som ligger i hörnet (absolute) och inte text som klipps av sin ruta (den larmar utanfor för)
      const ga = e => { const c = getComputedStyle(e); if (e !== b && c.position === 'absolute' || c.overflowX === 'hidden') return; for (const n of e.childNodes) { if (n.nodeType === 1) ga(n); else if (n.nodeType === 3 && n.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(n); for (const q of rg.getClientRects()) med(q); } } };
      ga(b); return { l, r, t, b: bo };
    };
    const knappar = alla.filter(el => el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || topp && el.closest('header') && el.parentElement && el.parentElement.matches('header, .cal, .nycklar') && !el.matches('.cal, .nycklar')), ytor = knappar.map(yta);
    for (let i = 0; i < knappar.length; i++) {
      const A = ytor[i], bb = knappar[i].getBoundingClientRect();
      if (topp && (A.r > pr.right + 1 || A.l < pr.left - 1 || pan.tagName === 'HEADER' && (A.b > pr.bottom + 1 || A.t < pr.top - 1))) larm('utanfor', knappar[i], 'sticker ut ur ' + pan.tagName.toLowerCase());
      else if (A.r - bb.right > 1 || bb.left - A.l > 1) larm('overlapp', knappar[i], 'namnet är ' + Math.round(A.r - A.l) + ' punkter brett och knappen ' + Math.round(bb.width));
      for (let j = i + 1; j < knappar.length; j++) { if (knappar[i].contains(knappar[j]) || knappar[j].contains(knappar[i])) continue; const B = ytor[j], w = Math.min(A.r, B.r) - Math.max(A.l, B.l), h = Math.min(A.b, B.b) - Math.max(A.t, B.t); if (w > 1 && h > 1) larm('overlapp', knappar[j], 'ligger ' + Math.round(w) + ' × ' + Math.round(h) + ' punkter över ' + namn(knappar[i])); }
    }
    for (const el of alla) {
      const c = getComputedStyle(el), r = el.getBoundingClientRect(), egenText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      // text som sticker ut eller klipps
      if (egenText && (r.right > pr.right + 1 || r.left < pr.left - 1)) larm('utanfor', el, 'sticker ut ' + Math.round(Math.max(r.right - pr.right, pr.left - r.left)) + ' punkter ur panelen');
      if (egenText && (c.overflow === 'hidden' || c.overflowX === 'hidden' || c.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 1) larm('utanfor', el, 'klipps: ' + el.scrollWidth + ' mot ' + el.clientWidth + ' punkter');
      // en rubrik, knapp eller etikett på för många rader
      const lh = parseFloat(c.lineHeight) || parseFloat(c.fontSize) * 1.25;
      if (/^(H[1-6]|BUTTON|LABEL)$/.test(el.tagName) && !el.matches('.runsten') || el.classList.contains('etik')) { const rg = document.createRange(); rg.selectNodeContents(el); const tops = new Set([...rg.getClientRects()].filter(q => q.width > 0 && q.height > 4).map(q => Math.round(q.top / (lh * 0.8)))); if (tops.size > form.rubrikRader && (el.innerText || '').trim()) larm('rader', el, tops.size + ' rader text'); }
      // ett ensamt ord på sista raden
      if (el.tagName === 'P' && egenText && r.height > lh * 1.5) {
        const rg = document.createRange(), tn = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).pop();
        if (tn) { const ord = [...tn.textContent.matchAll(/\\S+/g)]; if (ord.length >= 3) { const topp = i => { rg.setStart(tn, ord[i].index); rg.setEnd(tn, ord[i].index + ord[i][0].length); return Math.round(rg.getBoundingClientRect().top); }; const sist = topp(ord.length - 1); if (sist !== topp(ord.length - 2) && el.lastChild === tn) larm('ensamt', el, 'ordet "' + ord[ord.length - 1][0] + '" ensamt på sista raden'); } }
      }
      // ett ord som delas på två rader (bryts mitt i ordet)
      if (egenText) {
        const rg = document.createRange();
        for (const tn of [...el.childNodes].filter(n => n.nodeType === 3)) for (const o of tn.textContent.matchAll(/[^\s\u00ad-]{4,}/g)) {
          rg.setStart(tn, o.index); rg.setEnd(tn, o.index + o[0].length);
          const tops = new Set([...rg.getClientRects()].filter(q => q.width > 0).map(q => Math.round(q.top)));
          if (tops.size > 1) { larm('delat', el, 'ordet "' + o[0] + '" delas på ' + tops.size + ' rader'); break; }
        }
      }
      // liten text och svag kontrast
      if (egenText) {
        const px = parseFloat(c.fontSize);
        if (px < form.minPx) larm('liten', el, px + ' punkter');
        const f = rgb(c.color), b = bakgrund(el);
        if (f && c.textShadow === 'none') { const k = (Math.max(lum(f), lum(b)) + 0.05) / (Math.min(lum(f), lum(b)) + 0.05), stor = px >= 18 || (px >= 14 && +c.fontWeight >= 700); if (k < (stor ? form.kontrastStor : form.kontrast)) larm('kontrast', el, 'kontrasten ' + k.toFixed(2)); }
      }
      // färger utanför paletten
      for (const [k, v] of [['färgen', c.color], ['bakgrunden', c.backgroundColor], ['kanten', c.borderTopStyle !== 'none' && parseFloat(c.borderTopWidth) > 0 ? c.borderTopColor : '']]) {
        const x = rgb(v); if (x && x.a > 0.5 && !P.has(tal(x)) && (k !== 'färgen' || egenText)) larm('palett', el, k + ' #' + tal(x).toString(16).padStart(6, '0'));
      }
      // knappar
      if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
        const min = mobil ? form.fingerMobil : form.finger;
        if (Math.min(r.width, r.height) < min) larm('finger', el, Math.round(r.width) + ' × ' + Math.round(r.height) + ' punkter');
        const nasta = el.nextElementSibling;
        if (nasta && /^(BUTTON)$/.test(nasta.tagName) && syns(nasta)) { const q = nasta.getBoundingClientRect(), gap = Math.max(q.left - r.right, q.top - r.bottom); if (gap >= 0 && gap < form.knappGap) larm('tata', el, Math.round(gap) + ' punkter till nästa knapp'); }
      }
      // en rullning inuti en rullning
      if (/(auto|scroll)/.test(c.overflowY) && el.scrollHeight > el.clientHeight + 1) larm('rullning', el, 'rullar inuti panelen');
      // emoji
      if (egenText && [...el.childNodes].some(n => n.nodeType === 3 && EMOJI.test(n.textContent))) larm('emoji', el, 'emoji: ' + [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').match(/\\p{Extended_Pictographic}/gu).join(''));
      // bilder i en skala som inte är hel
      if (el.tagName === 'IMG' && el.naturalWidth) { const sk = r.width * devicePixelRatio / el.naturalWidth; if (Math.abs(sk - Math.round(sk)) > 0.02) larm('skala', el, 'skalan ' + sk.toFixed(2)); }
      // symboler utan förklaring
      if ((el.tagName === 'IMG' || el.tagName === 'svg') && !el.closest('[title],[aria-label],[data-i]') && !(el.parentElement && (el.parentElement.innerText || '').trim())) larm('forklaring', el, 'ingen title eller aria-label');
      // tomma rubriker
      if (/^H[1-6]$/.test(el.tagName) && !(el.innerText || '').trim() && !el.querySelector('img,svg')) larm('tom', el, 'tom rubrik');
      // syskon av samma slag: kanter och avstånd
      const kids = [...el.children].filter(syns);
      if (kids.length >= 3) {
        const slag = k => k.tagName + '.' + (typeof k.className === 'string' ? k.className.trim().split(/\\s+/)[0] : '');
        const lika = kids.filter(k => slag(k) === slag(kids[0]));
        if (lika.length >= 3) {
          const rr = lika.map(k => k.getBoundingClientRect());
          const kolumn = rr.every(q => Math.abs(q.left - rr[0].left) < 12) && rr.some((q, i) => i && q.top > rr[i - 1].top);
          if (kolumn) {
            const vansterKant = rr.map(q => Math.round(q.left)), d = Math.max(...vansterKant) - Math.min(...vansterKant);
            if (d >= 1 && d <= form.linje) larm('kanter', lika[vansterKant.indexOf(Math.max(...vansterKant))], 'vänsterkanten ' + d + ' punkter från de andras');
            const gap = rr.slice(1).map((q, i) => q.top - rr[i].bottom);
            if (gap.length >= 2 && Math.max(...gap) - Math.min(...gap) > form.avstand && Math.min(...gap) >= 0) larm('avstand', el, 'avstånden ' + Math.round(Math.min(...gap)) + ' till ' + Math.round(Math.max(...gap)) + ' punkter');
          }
        }
      }
    }
  }
  return ut;
}`;
