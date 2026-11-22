// Björns svar 2026-11-22: de valda korten byggs in i steg 12.6.1. Läses efter zz-2111.js. Ja i ett ja/nej-kort är val 1
(() => {
  const B = (val, text) => ({ val, steg: '12.6.1', text: text ? text + ' Byggs in i steg 12.6.1.' : undefined });
  Object.assign(BESLUT, {
    f10_bivax: B(1), f10_bur: B(1), f10_oxe: B(1), f10_snokruka: B(2), f10_tamhet: B(3), f11_sallskap: B(1), f12_konstigt: B(1),
    f10_stenvagg: B(1, 'Den tredje väggen på kortet, kallmuren med de ojämna stenarna och de rättade fogarna.'),
  });
})();
