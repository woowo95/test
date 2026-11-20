// Björns svar 2026-11-20: de valda korten byggs in i steg 12.6.1 (fas 12:s inbyggnad av bildstilens val). Läses sist av svar/,
// efter zz-1711.js och före fas11.js, så korten i fas 11 och förslagen i forslag/ får sina beslut när valdelen delas (delaVal).
// Ja i ett ja/nej-kort är val 1.
(() => {
  const B = (val, text) => ({ val, steg: '12.6.1', text: text ? text + ' Byggs in i steg 12.6.1.' : undefined });
  Object.assign(BESLUT, {
    f9_orte: B(1), f9_ol: B(1), f9_vin: B(1), f9_mjolk: B(1), f9_amne_mat: B(1),
    f11_sym_helgon: B(1), f11_sym_kvade: B(1), f11_sym_kyrkoforrad: B(1), f11_sym_troende: B(1),
    f9_notter: B(1), f9_lovkarve: B(3), f10_bikupa: B(1), f10_vaxljus: B(2), f9_kk_tro: B(1),
    f11_kartknapp: B(1), f11_vagn: B(1), f11_kartblad: B(2), f11_sandebud: B(2), f11_uppdragmarke: B(2), f11_aventyrare: B(2),
    f9_bryggkar: B(1, 'Dryckerna i gluggen visas i kortet Jäskaret med dryckerna.'),
    f9_ortkruka: B(1, 'Röllekan i den mellanstora krukan visas i kortet Örtkrukan, också den mellanstora.'),
    f10_gudabild: B(1, 'Alla tre gudabilderna används, som olika gudar. Fem till ritas i kortet Gudabilden, fler.'),
    f11_gomma: B(3, 'Fem symboler till för en väska eller en större förvaring ritas i kortet Gömman, fler symboler.'),
  });

  const EGEN = (text, r) => ({ text, w: r.rader[0].length, h: r.rader.length, rita: (B) => { if (!window.RITA_BILD) return; const b = window.RITA_BILD(r); for (let k = 0; k < b.px.length; k++) if (b.px[k] >= 0) B.px[k] = b.px[k]; } });

  // nålen på kartan: Björns egen ritning (”min ritning”), vald
  const nal = VAL.find(s => s.id === 'f10_nal');
  if (nal) {
    nal.versioner.push(EGEN('Din ritning av nålen: en rund röd knopp med ljus sida uppe till vänster och en grå nål.', {
      pal: { G: '#a14808', H: '#bd753e', R: '#3e5156', k: '#24201d' },
      rader: ['.................', '.................', '.................', '.................', '......kkkkk......', '.....kHHGGGk.....',
        '....kHHHGGGGk....', '....kHHHGGGGk....', '....kGGGGGGGk....', '....kGGGGGGGk....', '.....kGGGGGk.....', '......kkRkk......',
        '.......kRk.......', '.......kRk.......', '.......kRk.......', '.......kRk.......', '.......kRk.......', '.......kRk.......',
        '.......kRk.......', '.................', '.................', '.................', '.................'],
    }));
    BESLUT.f10_nal = B(nal.versioner.length, 'Din egen ritning.');
  }

  // de små barnens porträtt (10.2.54): byggda av porträttdelar som redan finns, valda så att barnen ser yngre ut: runt huvud,
  // små öron, knappnäsa eller kort näsa, liten mun, stora eller vidöppna ögon, glesa eller tunna bryn och korta, rufsiga frisyrer
  const smabarn = VAL.find(s => s.id === 'f10_smabarn');
  if (smabarn) {
    const BARN = [
      ['kvinna', 0, 1, { huvudform: 'huvud-rund', ora: 'ora-1', nasa: 'nasa-15', oga: 'oga-4', ogonbryn: 'bryn-9', mun: 'mun-5', frisyr: 'har-18' }],
      ['man', 2, 3, { huvudform: 'huvud-rund', ora: 'ora-1', nasa: 'nasa-4', oga: 'oga-10', ogonbryn: 'bryn-4', mun: 'mun-5', frisyr: 'har-23' }],
      ['kvinna', 4, 0, { huvudform: 'huvud-rund', ora: 'ora-1', nasa: 'nasa-15', oga: 'oga-1', ogonbryn: 'bryn-9', mun: 'mun-5', frisyr: 'har-7' }],
    ];
    Object.assign(smabarn, {
      vad: 'Steg 10.2.54: barn upp till fem år får ett eget, enklare porträtt med få varianter; hårfärgen och hudfärgen följer med när barnet växer. Nu byggt av porträttdelarna som redan finns, valda så att barnen ser yngre ut: runt huvud, små öron, knappnäsa, liten mun, stora ögon, glesa bryn och korta rufsiga frisyrer. Din kommentar förra gången: ”Vi gör små barnens porträtt genom att kombinera delar som vi gjort tidigare. Barnen ska se ännu yngre ut också”',
      versioner: [{
        text: 'Tre små barn av delar som redan finns: runt huvud, små öron, knappnäsa eller kort näsa, liten mun, stora, vidöppna eller runda ögon, glesa eller tunna bryn, och en knut på hjässan, en kalufs eller rufsigt hår',
        w: 3 * 64 + 4 * 4, h: 64 + 8,
        rita: B => {
          const PR = window.PORTRATTEN; if (!PR) return;
          BARN.forEach(([kon, har, hud, del], i) => {
            const m = PR.neutral(kon); m.alder = 'barn'; m.har = har; m.hud = hud; Object.assign(m.del, del);
            const Q = PR.portratt(m);
            for (let y = 0; y < Q.h; y++) for (let x = 0; x < Q.w; x++) { const c = Q.px[y * Q.w + x]; if (c >= 0) B.satt(4 + i * 68 + x, 4 + y, c); }
          });
        },
      }],
    });
  }
})();
