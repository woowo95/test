// Björns svar 2026-11-17, inbyggda i steg 11.14.1 (fas 11:s inbyggnad av bildstilens val). Tamheten (f10_tamhet) ligger kvar i valdelen.
// Läses sist av svar/, efter z-ny.js. Ja i ett ja/nej-kort är val 1.
(() => {
  // inbyggda i steg 11.14.1: korten och deras beslut tas bort. Kälken och vattenhon åt båda håll vrids och speglas i spelet
  // (ikoner.ts), så de korten behövs inte heller. Stackarna ritas av spelets stackar (tatHog i foremal.ts), och sakerna vars
  // stackar Björn sagt ja till tas bort ur besluten (svar/z-beslut.js) så att stackar.js inte gör korten igen
  const STACK_SAKER = ['f9_naverask', 'f9_nat', 'f9_braxen', 'f9_sik', 'f9_appel', 'f9_brod', 'f9_jordgubbar', 'f9_kal'];
  const INBYGGT_11141 = ['f7_klyvplats', 'f7_ortkok', 'f9_vedhog', 'f9_kk_strid', 'f9_lerkrukor', 'f9_snickarbank', 'f9_vatskor',
    'f9_rokeri', 'f9_malt', 'f9_kvarnsten', 'f9_bakugn', 'f9_stekhall', 'f9_staket', 'f9_bonor', 'f9_appeltrad', 'f9_vaxtrest', 'f9_sophog',
    'f9_kompost', 'f9_hund', 'f9_valp', 'f9_far', 'f9_get', 'f10_altare', 'f9_hons', 'f9_hostack', 'f9_skara', 'f9_ull', 'f9_ulltrad',
    'f9_ylle', 'f9_djurhorn', 'f10_hogsate', 'f10_bank', 'f10_krubba', 'f10_skinn', 'f10_kalke', 'f10_vattenho', 'f10_slade',
    'f10_byggsten', 'f10_stenvag', 'f10_vildbo', 'f10_skatta', 'f10_bistick', 'f10_bisymbol', 'f10_biarg', 'f10_kalke_vinklar',
    'f10_vattenho_vinklar', 'f7_fangstbank', 'f9_foder', 'f9_kat_soppa', 'f9_sjal', 'f9_tunika_ylle',
    ...STACK_SAKER, ...STACK_SAKER.map(id => id + '_stack')];
  INBYGGT_11141.forEach(id => { delete BESLUT[id]; (window.INBYGGT ||= new Set()).add(id); });
  for (let i = VAL.length - 1; i >= 0; i--) if (INBYGGT_11141.includes(VAL[i].id)) VAL.splice(i, 1);
  // borttagna: fähuset byggs som de andra husen och den hamlade björken får inget eget utseende; heligt och djurens
  // egenskaper får symbolerna som redan finns (Tamhet ritas för sig); anfallen blir en knuff utan egna bilder
  const BORT = ['f9_fahus', 'f9_hamladbjork', 'f10_heligt', 'f10_bjorn_fram', 'f9_varg_anfall'];
  for (let i = VAL.length - 1; i >= 0; i--) if (BORT.includes(VAL[i].id)) VAL.splice(i, 1);
  BORT.forEach(id => (window.INBYGGT ||= new Set()).add(id));
})();
