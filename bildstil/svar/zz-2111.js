// Björns val, inbyggda i steg 12.6.1 (fas 12:s inbyggnad av bildstilens val). Läses sist av svar/, efter zz-2011b.js.
// Platsernas tecken, ramen och havets bilder, pergamentet och ruinens mur ligger kvar i valdelen tills de byggs in (steg 12.6.9)
(() => {
  const INBYGGT_1261 = ['f9_orte', 'f9_ol', 'f9_vin', 'f9_mjolk', 'f9_amne_mat', 'f11_sym_helgon', 'f11_sym_kvade', 'f11_sym_kyrkoforrad',
    'f11_sym_troende', 'f9_notter', 'f9_lovkarve', 'f10_bikupa', 'f10_vaxljus', 'f9_kk_tro', 'f11_kartknapp', 'f11_vagn', 'f11_kartblad',
    'f11_sandebud', 'f11_uppdragmarke', 'f11_aventyrare', 'f9_bryggkar', 'f9_ortkruka', 'f10_gudabild', 'f11_gomma', 'f10_nal', 'f10_gris',
    'f10_ko', 'f10_vildsvin', 'f9_hage', 'f9_salt', 'f12_jarngruva', 'f12_sederband', 'f9_lok_stack', 'f9_ortkruka_mellan',
    'f10_gudabild_fler', 'f11_grav', 'f11_gomma_fler'];
  INBYGGT_1261.forEach(id => { delete BESLUT[id]; (window.INBYGGT ||= new Set()).add(id); });
  for (let i = VAL.length - 1; i >= 0; i--) if (INBYGGT_1261.includes(VAL[i].id)) VAL.splice(i, 1);
})();
