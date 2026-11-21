// Björns andra svar 2026-11-20: de valda korten byggs in i steg 12.6.1 (fas 12:s inbyggnad av bildstilens val). Läses efter
// zz-2011.js. Ja i ett ja/nej-kort är val 1. Björns egna ritningar ligger som sista versionen i förslagskorten (forslag/).
(() => {
  const B = (val, text) => ({ val, steg: '12.6.1', text: text ? text + ' Byggs in i steg 12.6.1.' : undefined });
  Object.assign(BESLUT, {
    f10_gris: B(1), f10_ko: B(1), f10_vildsvin: B(1), f9_hage: B(1), f9_salt: B(1), f11_platstecken: B(1), f12_jarngruva: B(1),
    f12_sederband: B(1), f11_ruinmur: B(1), f11_utsmyckning: B(1), f9_lok_stack: B(1), f9_ortkruka_mellan: B(1),
    f11_pergament: B(1, 'Stilen gäller; kartan i ramen är hela världen, den stora kontinenten i mitten och småöarna runt om.'),
    f10_gudabild_fler: B(1, 'Alla fem gudabilderna används, som olika gudar.'),
    f11_grav: B(4, 'Din egen ritning.'),
    f11_gomma_fler: B(6, 'Din egen ritning.'),
  });
  // de små barnens porträtt (10.2.54): Björn vill ha helt nya delar för nästan nyfödda barn, som han går igenom i granskningen.
  // Kortet tas bort tills delarna är ritade; de kommer som egna kort i granskningen
  const i = VAL.findIndex(s => s.id === 'f10_smabarn'); if (i >= 0) VAL.splice(i, 1);
  // köttet: Björn ville ha ett eget kort per sorts kött (f10_kott_radjur, _far, _get, _fagel, _bjorn i forslag/), så det
  // gemensamma kortet tas bort
  const j = VAL.findIndex(s => s.id === 'f10_kott'); if (j >= 0) VAL.splice(j, 1);
})();
