// Björns svar 2026-11-25: de valda korten byggs in i steg 13.10.1. Läses efter zz-2411.js. Ja i ett ja/nej-kort är val 1
(() => {
  const B = (val, text) => ({ val, steg: '13.10.1', text: text ? text + ' Byggs in i steg 13.10.1.' : undefined });
  Object.assign(BESLUT, {
    bild_barsele_lader: B(3), bild_jarn: B(3), bild_jarnhjalm_jarn: B(3), bild_kudde: B(3), bild_smedja: B(1), bild_stovlar_lader: B(1),
    bild_ylletacke: B(2), f10_kott_bjorn: B(3), f10_kott_fagel: B(1), f10_kott_far: B(3), f10_kott_get: B(1), f11_gravhog: B(1),
    f11_sym_bud: B(1), f12_fliknamn: B(3), f12_roll_prast: B(1), f12_sym_kedja: B(1), f12_sym_las: B(1), f12_sym_ljus: B(1),
    f12_sym_ol: B(3), f12_sym_ort: B(1), f12_sym_scen: B(1), f12_sym_vilt: B(3), f13_dryckeshorn: B(1), f13_farger: B(1),
    f13_graf: B(2), f13_surfisk: B(3), f13_torrappel: B(3), f13_torrrolleka: B(1), f13_torrsvamp: B(3), f14_disk: B(3),
    f14_varubord: B(1),
    bild_ost: B(9, 'Din egen ritning av osten.'),
    bild_stol: B(1, 'Stolen framifrån; från sidan och bakifrån ritas den om efter den här (korten Stolen från sidan och Stolen bakifrån).'),
  });
})();
