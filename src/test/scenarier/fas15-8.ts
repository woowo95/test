// Scenarier för fas 15, grupp 8 (steg 15.1.73–15.1.83): världens byar och omvärlden.
import * as SIM from '../../sim';
import { SCENARIER, testBy, varldEfter } from './hjalp';

// byn har precis det den vill ha av allt
const fyll = (r: SIM.VarldRad, ganger = 1) => {
  SIM.radVaror(r);
  for (const g of SIM.VARUGRUPP_IDS) if (g !== 'mat') r.varor![g] = ganger * Math.round(SIM.radVill(r, g, SIM.rikMal(r)));
  r.tal.mat = ganger * Math.round(SIM.radVill(r, 'mat', SIM.rikMal(r)));
  r.tal.rikedom = SIM.radRikedomUr(r);
};

SCENARIER.fardvag = {
  text: 'Steg 15.1.73: de som är ute på en färd räknas bort ur byns folk, och en ny färd kräver dubbelt så många lediga vuxna som bärare; den som skickar ser det som redan är på väg till mottagaren, i priset och i gåvan; färderna börjar utspridda över dygnet',
  kor: () => {
    const s = SIM.cloneState(testBy(10)), vl = s.varld!; vl.farder = [];
    const r = vl.rader!.find(x => SIM.lever(vl, x) && SIM.BYSORTER[x.sort].ledare && SIM.radGrannar(vl, x).some(g => g.nr !== vl.huvud))!;
    const dyr = SIM.radGrannar(vl, r).find(g => g.nr !== vl.huvud)!;
    SIM.mots(vl, r.nr, dyr.nr); SIM.mots(vl, dyr.nr, r.nr);
    r.tal.folk = 30; r.tal.styrka = 10; fyll(r); fyll(dyr);
    r.varor!.virke = 4 * Math.round(SIM.radVill(r, 'virke', SIM.rikMal(r))); r.tal.rikedom = SIM.radRikedomUr(r);
    dyr.varor!.virke = Math.round(SIM.radVill(dyr, 'virke', SIM.rikMal(dyr)) / 2); dyr.tal.silver = 500; dyr.tal.rikedom = SIM.radRikedomUr(dyr);
    const c = () => SIM.byCtx(s, vl, r, dyr);
    // färden går: bärarna räknas som ute
    const a0 = SIM.fardAffar(c())!, pris0 = SIM.radGruppPaslag(s, dyr, 'virke');
    const l0 = SIM.ledigaVuxna(vl, r);
    SIM.BYHANDLINGAR.handel.gor(c());
    const f = vl.farder!.find(x => x.fran === r.nr)!;
    const l1 = SIM.ledigaVuxna(vl, r), ute1 = SIM.radUte(vl, r.nr);
    // det som är på väg dit räknas i priset, och nästa affär blir mindre
    const pv = SIM.paVag(vl, dyr.nr, 'virke'), pris1 = SIM.radGruppPaslag(s, dyr, 'virke', pv), a1 = SIM.fardAffar(c());
    // för få lediga: ingen ny färd
    r.tal.styrka = SIM.radUte(vl, r.nr) + 2 * SIM.BYHANDLING.barare - 1; // en mindre än dubbelt så många lediga som bärare
    const fa = SIM.ledigaVuxna(vl, r), utan = !SIM.fardAffar(c()) && !SIM.gavaAffar(c()) && SIM.BYHANDLINGAR.besked.poang(c()) >= -1;
    r.tal.styrka += 1;
    const med = !!SIM.fardAffar(c());
    // flocken: aldrig fler än hälften av de lediga
    r.tal.styrka = 40; r.tal.folk = 60;
    const fl = SIM.flockStorlek(r, SIM.radUte(vl, r.nr)), led = SIM.ledigaVuxna(vl, r);
    // gåvan: det mottagaren saknar, inte bara det byn har mest av
    vl.farder = []; r.tal.styrka = 10; fyll(r, 2); fyll(dyr, 3); dyr.varor!.virke = 0; dyr.tal.rikedom = SIM.radRikedomUr(dyr);
    const gava = SIM.gavaAffar(c());
    // en värld i tio dygn: färderna börjar vid olika tider på dygnet
    const w = varldEfter(10, 10), wv = w.varld!;
    const tider = (wv.farder ?? []).filter(x => !x.handlare).map(x => ((x.t0 - wv.borjan!) % SIM.DAY) / SIM.DAY);
    const olika = new Set(tider.map(x => Math.floor(x * 24))).size;
    return [
      [`bärarna räknas bort ur de lediga (${l0} lediga före, ${l1} efter, ${ute1} ute)`, l1 === l0 - SIM.BYHANDLING.barare && ute1 === SIM.BYHANDLING.barare],
      [`priset hos mottagaren räknar med lasten på vägen (${pv} virke: ${pris0.toFixed(2)} → ${pris1.toFixed(2)}), och nästa affär är mindre (${a0.n} → ${a1?.n ?? 0})`, pv === f.n && pris1 < pris0 && (!a1 || a1.vinst < a0.vinst)],
      [`med ${fa} lediga (färre än dubbelt så många som bärarna) går ingen handel eller gåva, med en till går handeln`, utan && fa === 2 * SIM.BYHANDLING.barare - 1 && med],
      [`flocken är högst hälften av de lediga (${fl} av ${led})`, fl > 0 && fl * 2 <= led],
      [`gåvan är det mottagaren saknar (${gava?.g ?? 'ingen'})`, gava?.g === 'virke'],
      [`färden ger sig av vid en tid ur dygnet, inte vid valet (${((f.t0 - s.now) / 3600000).toFixed(1)} h efter)`, f.t0 >= s.now && f.t0 < s.now + SIM.DAY && SIM.fardLage(vl, f, f.t0 - 1, vl.mark.w) === undefined],
      [`i en värld börjar färderna under olika timmar på dygnet (${tider.length} färder, ${olika} olika timmar)`, tider.length < 3 || olika >= Math.min(3, tider.length)],
    ];
  },
};
