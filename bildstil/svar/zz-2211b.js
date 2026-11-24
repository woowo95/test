// Björns svar 2026-11-22 (andra omgången): de valda korten byggs in i steg 12.6.1. Läses efter zz-2211.js. Ja i ett ja/nej-kort är val 1
(() => {
  const B = (val, text) => ({ val, steg: '12.6.1', text: text ? text + ' Byggs in i steg 12.6.1.' : undefined });
  Object.assign(BESLUT, {
    f10_kott_radjur: B(1), f9_bryggkar_drycker: B(1), f9_korn_stack: B(2), f11_pil_sidor: B(1), f12_sym_familj: B(1), f12_sym_hjul: B(3),
    f12_sym_kompass: B(3), f12_sym_rav: B(1),
    f11_sym_troshus: B(4, 'Bara kyrkan längst till höger i version 4, den med gaveltaket.'),
    f11_vagnrest: B(1, 'Det fanns två kort med en trasig vagn. Karavanens vagnar använder grundarnas trasiga vagn (kortet Grundarnas trasiga vagn), så det finns bara en trasig vagn att välja.'),
  });
})();
