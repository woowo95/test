// Björns svar 2026-11-17: valen flyttas till Valt och byggs in i steg 11.14.1 (fas 11:s inbyggnad av bildstilens val).
// Läses sist av svar/, efter z-ny.js. Ja i ett ja/nej-kort är val 1.
(() => {
  const B11 = (val, text) => ({ val, steg: '11.14.1', text: text ? text + ' Byggs in i steg 11.14.1.' : undefined });
  const ALLA = 'Alla tre används som variationer, så att djuren inte ser likadana ut.';
  Object.assign(BESLUT, {
    f7_klyvplats: B11(3),
    f7_ortkok: B11(1, 'Lägerelden från version 1, och bordet och torken från version 2.'),
    f9_vedhog: B11(3),
    f9_kk_strid: B11(2, 'Den första bilden i version 2, där vapnen ligger bakom skölden.'),
    f9_lerkrukor: B11(2),
    f9_snickarbank: B11(3),
    f9_vatskor: B11(1, 'Krukan i bilderna blir den lerkruka du valde (Lerkrukorna, version 2) i rätt storlek.'),
    f9_rokeri: B11(2), f9_malt: B11(3), f9_kvarnsten: B11(3), f9_bakugn: B11(3), f9_stekhall: B11(2), f9_staket: B11(3),
    f9_bonor: B11(1), f9_appeltrad: B11(1), f9_vaxtrest: B11(2), f9_sophog: B11(1), f9_kompost: B11(2),
    f9_hund: B11(1, ALLA), f9_valp: B11(1, ALLA), f9_far: B11(1, ALLA), f9_get: B11(1, ALLA),
    f10_altare: B11(1, 'Alla tre används som variationer.'),
    f9_hons: B11(3), f9_hostack: B11(1), f9_skara: B11(1), f9_ull: B11(1), f9_ulltrad: B11(3), f9_ylle: B11(2), f9_djurhorn: B11(3),
    f10_hogsate: B11(1), f10_bank: B11(1), f10_krubba: B11(1), f10_skinn: B11(1),
    f10_kalke: B11(1, 'Kälken liggande åt andra hållet står i kortet Kälken åt båda håll.'),
    f10_vattenho: B11(2, 'Hon lodrätt står i kortet Vattenhon åt båda håll.'),
    f10_slade: B11(1), f10_byggsten: B11(1), f10_stenvag: B11(1), f10_vildbo: B11(3), f10_skatta: B11(1),
    f10_bistick: B11(1), f10_bisymbol: B11(2), f10_biarg: B11(1),
    // stackarna i förrådet (stackar.js gör korten av sakerna som har stack: true)
    f9_naverask_stack: B11(1), f9_nat_stack: B11(1), f9_braxen_stack: B11(1), f9_sik_stack: B11(1),
    f9_appel_stack: B11(1), f9_brod_stack: B11(1), f9_jordgubbar_stack: B11(1), f9_kal_stack: B11(1),
    // byggdes i steg 10.11.1 med en annan version; Björn valde om när korten kom tillbaka i bildstil v242
    f7_fangstbank: B11(1, 'I steg 10.11.1 byggdes version 2 in; nu version 1.'),
    f9_foder: B11(1, 'I steg 10.11.1 byggdes en annan version in; nu version 1.'),
    f9_kat_soppa: B11(1, 'I steg 10.11.1 byggdes version 3 in; nu version 1.'),
    f9_sjal: B11(1, 'I steg 10.11.1 byggdes version 2 in; nu version 1.'),
    f9_tunika_ylle: B11(3, 'I steg 10.11.1 byggdes version 1 in; nu version 3.'),
  });
  // borttagna: fähuset byggs som de andra husen och den hamlade björken får inget eget utseende; heligt och djurens
  // egenskaper får symbolerna som redan finns (Tamhet ritas för sig); anfallen blir en knuff utan egna bilder
  const BORT = ['f9_fahus', 'f9_hamladbjork', 'f10_heligt', 'f10_bjorn_fram', 'f9_varg_anfall'];
  for (let i = VAL.length - 1; i >= 0; i--) if (BORT.includes(VAL[i].id)) VAL.splice(i, 1);
  BORT.forEach(id => (window.INBYGGT ||= new Set()).add(id));
})();
