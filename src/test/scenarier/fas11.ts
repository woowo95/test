// Scenarier för fas 11: världen.
import * as SIM from '../../sim';
import { SCENARIER, kor, testBy } from './hjalp';
import { farg, iPaletten } from '../../palett';
import { lasBy, minnesBas, sparaBy } from '../../ui/lagring';
import { readFileSync } from 'node:fs';
import * as VB from '../../ui/varldbild';

SCENARIER.bortafalt = {
  text: 'Borta från byn, fältet (steg 11.2.3): den som är borta är fortfarande bybo och äger sitt, men finns inte på bykartan, ritas inte och väljs inte till något, och kommer tillbaka med allt sitt',
  kor: () => {
    const s = SIM.cloneState(testBy(10)), vuxna = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= 18);
    const p = vuxna.sort((a, b) => b.id - a.id)[0], x = p.x, y = p.y;
    const ager = () => SIM.tingOf(s).filter(g => g.agare === p.id).map(g => g.id).sort().join(',');
    // det hen har på sig, inte bördan i händerna
    const bar = () => SIM.tingOf(s).filter(g => g.hos === p.id && !p.task?.ting?.includes(g.id)).map(g => g.id).sort().join(',');
    const agerFore = ager(), barFore = bar();
    SIM.gaBort(s, p);
    const borta = !SIM.living(s).includes(p) && SIM.alive(p) && SIM.ute(p);
    // sex timmar utan hen: ingen väljer hen till något (samtal, hjälp, strid), och hen gör inget själv
    let valdes = 0, gjorde = 0;
    kor(s, 6, () => {
      if (p.task) gjorde++;
      for (const q of SIM.living(s)) if (q.task && [q.task.med, q.task.fran, q.task.bar].includes(p.id)) valdes++; // fälten som pekar på en annan person
    });
    const stod = p.x === x && p.y === y;
    const agerUnder = ager();
    SIM.kommHem(p, x + 1, y);
    const barHem = bar(), hemma = SIM.living(s).includes(p) && !SIM.ute(p) && p.x === x + 1 && p.y === y;
    kor(s, 1);
    return [
      ['den som är borta är bybo men inte i byn', borta],
      [`hen gör inget i byn medan hen är borta (${gjorde} gånger)`, gjorde === 0 && stod],
      [`ingen i byn väljer hen till något (${valdes} gånger)`, valdes === 0],
      ['hen äger sitt medan hen är borta', agerUnder === agerFore],
      [`hen kommer hem till rutan, är i byn igen och har med sig det hen har på sig (${barFore.split(',').filter(Boolean).length} saker)`, hemma && barHem === barFore],
      ['hen är i byn och lever vidare efter en timme', SIM.living(s).includes(p) && !!p.task],
    ];
  },
};

SCENARIER.borta = {
  text: 'Borta från byn, genomgången (steg 11.2.4): den som är borta äter, dricker, röstar, smittas och väljs inte i byn, ingen finns på två ställen, och byn grundas inte om när alla är borta',
  kor: () => {
    const s = SIM.cloneState(testBy(10)), folk = SIM.living(s).sort((a, b) => a.id - b.id);
    const borta = folk.filter((_, i) => i % 2 === 1);
    for (const p of borta) SIM.gaBort(s, p);
    const fore = borta.map(p => ({ p, hunger: p.hunger, torst: p.torst, sjuk: JSON.stringify(p.sjuk ?? null), x: p.x, y: p.y }));
    const roster = () => SIM.vikter(s).map(v => v.p);
    let pekas = 0, tva = 0, roster0 = 0;
    const ids = new Set(borta.map(p => p.id));
    kor(s, 12, () => {
      for (const q of SIM.living(s)) {
        if (ids.has(q.id)) tva++;
        const t = q.task;
        if (t && [t.med, t.fran, t.bar, t.ref].some(id => ids.has(id as number))) pekas++;
      }
      if (roster().some(p => ids.has(p.id))) roster0++;
    });
    const orort = fore.every(f => f.p.hunger === f.hunger && f.p.torst === f.torst && JSON.stringify(f.p.sjuk ?? null) === f.sjuk && f.p.x === f.x && f.p.y === f.y);
    const lever = borta.every(p => SIM.alive(p) && SIM.ute(p) && s.people.includes(p));
    // alla går bort: byn är inte tom, för byborna lever
    const alla = SIM.living(s).concat(borta), nr = s.people.length; // också de som fötts medan hälften var borta
    for (const p of alla) SIM.gaBort(s, p);
    kor(s, 2);
    const inteOmgrundad = s.people.length === nr && alla.every(p => SIM.alive(p)) && SIM.living(s).length === 0;
    for (const p of alla) SIM.kommHem(p, p.x, p.y);
    kor(s, 1);
    return [
      ['de som är borta lever och är bybor', lever],
      [`den som är borta finns inte bland dem i byn (${tva} gånger)`, tva === 0],
      [`ingen i byn har ett arbete som pekar på den som är borta (${pekas} gånger)`, pekas === 0],
      [`den som är borta röstar inte i byn (${roster0} gånger)`, roster0 === 0],
      ['den som är borta äter, dricker, smittas och flyttar sig inte i byn', orort],
      ['när alla är borta grundas byn inte om och ingen ny kommer', inteOmgrundad],
      ['alla kommer hem och är i byn igen', SIM.living(s).length === alla.length],
    ];
  },
};

SCENARIER.varldmark = {
  text: 'Världens mark (steg 11.2.5): samma frö ger samma land, havet omger allt, den största landmassan är stor nog och över mitten, småöarna finns, och raderna i VARLDMARK är hela',
  kor: () => {
    const fron = Array.from({ length: 20 }, (_, i) => 1000 + i * 7919), V = SIM.VARLD;
    const varldar = fron.map(f => SIM.skapaVarldMark(f));
    const igen = SIM.skapaVarldMark(fron[0]), lika = igen.delfro === varldar[0].delfro && igen.mark.every((m, i) => m === varldar[0].mark[i]);
    const annan = varldar[1].mark.some((m, i) => m !== varldar[0].mark[i]);
    const former = varldar.map(v => SIM.formen(v));
    const kantHav = varldar.every(v => { for (let x = 0; x < v.w; x++) for (const y of [0, v.h - 1]) if (SIM.markAt(v, x, y) !== 'hav') return false; for (let y = 0; y < v.h; y++) for (const x of [0, v.w - 1]) if (SIM.markAt(v, x, y) !== 'hav') return false; return true; });
    const sorter = new Set(varldar.flatMap(v => [...new Set(v.mark)].map(m => SIM.MARK_IDS[m])));
    const rader = Object.values(SIM.VARLDMARK) as SIM.MarkDef[];
    const ratt = rader.every(r => [...r.vanligt, ...r.sallsynt].every(k => !!SIM.SAKER[k]) && iPaletten(farg(r.farg[0], r.farg[1])) && (r.land ? r.kostnad >= 1 && r.fram.includes('fots') : r.fram.length === 0));
    const minA = Math.min(...former.map(f => f.andel)), minO = Math.min(...former.map(f => f.oar));
    return [
      ['samma frö ger samma land, och ett annat frö ett annat', lika && annan],
      ['generatorns version sparas med marken', varldar.every(v => v.gen === SIM.VARLD_GEN && v.w === V.bredd && v.h === V.hojd)],
      ['havet omger allt: kanten är hav och ingen landmassa når den', kantHav && former.every(f => f.havRunt)],
      [`den största landmassan är minst ${V.storAndel * 100} % av kartan och över mitten (minst ${Math.round(minA * 100)} %)`, former.every(f => f.andel >= V.storAndel && f.mitten)],
      [`minst ${V.minOar} småöar i varje värld (minst ${minO})`, minO >= V.minOar],
      [`alla landets sorter finns (${[...sorter].join(', ')})`, ['hav', 'slatt', 'skog', 'tat', 'myr', 'berg'].every(k => sorter.has(k as SIM.MarkId))],
      ['raderna i VARLDMARK: sakerna finns, färgen är ur paletten, landet går att gå på och havet inte', ratt],
    ];
  },
};

SCENARIER.floder = {
  text: 'Floder och sjöar (steg 11.2.6): floderna börjar i bergen och rinner nedåt till havet eller en sjö, det övre loppet kommer före det breda nedre, och sjöarna ligger inne i landet',
  kor: () => {
    const varldar = Array.from({ length: 12 }, (_, i) => SIM.skapaVarldMark(2000 + i * 7919));
    let iVatten = 0, utan = 0, uppfor = 0, nedreForst = 0, kallaUtanBerg = 0, sjoVidKant = 0, nedre = 0, ovre = 0;
    const vatt = (v: SIM.VarldMark, i: number) => { const m = SIM.MARK_IDS[v.mark[i]]; return m === 'hav' || m === 'sjo'; };
    for (const v of varldar) {
      const n = v.w * v.h, fran = new Uint8Array(n);
      for (let i = 0; i < n; i++) if (v.flod[i] && v.ned[i] >= 0 && v.flod[v.ned[i]]) fran[v.ned[i]] = 1;
      for (let i = 0; i < n; i++) {
        const m = SIM.MARK_IDS[v.mark[i]];
        if (m === 'sjo' && (i % v.w === 0 || i < v.w)) sjoVidKant++;
        if (!v.flod[i]) continue;
        if (v.flod[i] === SIM.FLOD_NEDRE) nedre++; else ovre++;
        if (vatt(v, i)) iVatten++;
        if (!fran[i] && m !== 'berg') kallaUtanBerg++; // en källa (ingen flod rinner hit) ligger i bergen
        // följ vattnet: det når havet eller en sjö, rinner aldrig uppför (den fyllda höjden) och blir aldrig smalt igen
        let c = i, steg = 0;
        while (c >= 0 && !vatt(v, c) && steg++ < n) {
          const d = v.ned[c];
          if (d >= 0 && !vatt(v, d) && v.hojd![d] > v.hojd![c] + 0.6) uppfor++; // en sänka får fyllas, men inte ett berg
          if (d >= 0 && v.flod[c] === SIM.FLOD_NEDRE && v.flod[d] === SIM.FLOD_OVRE) nedreForst++;
          c = d;
        }
        if (c < 0 || !vatt(v, c)) utan++;
      }
    }
    const medSjo = varldar.filter(v => v.mark.some(m => SIM.MARK_IDS[m] === 'sjo')).length;
    const igen = SIM.skapaVarldMark(2000), lika = igen.flod.every((f, i) => f === varldar[0].flod[i]);
    return [
      [`floderna finns, med ett övre (${ovre} rutor) och ett brett nedre lopp (${nedre} rutor)`, ovre > 0 && nedre > 0],
      [`varje flod börjar i bergen (${kallaUtanBerg} källor utanför)`, kallaUtanBerg === 0],
      [`varje flod når havet eller en sjö (${utan} gör det inte)`, utan === 0],
      [`ingen flod rinner i havet eller i en sjö (${iVatten})`, iVatten === 0],
      [`ingen flod rinner uppför (${uppfor} gånger)`, uppfor === 0],
      [`det breda loppet blir aldrig smalt igen (${nedreForst} gånger)`, nedreForst === 0],
      [`sjöar finns i de flesta världar (${medSjo} av ${varldar.length}) och ligger inne i landet`, medSjo >= varldar.length / 2 && sjoVidKant === 0],
      ['samma frö ger samma floder', lika],
    ];
  },
};

SCENARIER.varldtillstand = {
  text: 'Världen bredvid byn (steg 11.2.7): byn utvecklas exakt som utan värld, världens frö rör inte byns slump, och världen sparas och laddas med byn',
  kor: async () => {
    const utan = SIM.cloneState(testBy(10)), med = SIM.cloneState(testBy(10));
    const slumpFore = JSON.stringify(med.rngs);
    SIM.medVarld(med);
    const slumpEfter = JSON.stringify(med.rngs), fro = med.varld!.fro;
    kor(utan, 6); kor(med, 6);
    const byn = (s: SIM.State) => { const o = JSON.parse(SIM.serialize(s)); delete o.varld; return JSON.stringify(o); };
    const lika = byn(utan) === byn(med);
    // världen följer med i sparningen, som en egen del inom sin gräns
    const delar = SIM.serializeParts(med), kb = new TextEncoder().encode(delar.varlden ?? '').length / 1024;
    const bas = minnesBas(); await sparaBy(bas, 'b', med);
    const ny = (await lasBy(bas, 'b'))!.by, a = SIM.varldMark(med)!, b = SIM.varldMark(ny)!;
    const ratt = SIM.skapaVarldMark(fro), samma = (x: SIM.VarldMark, y: SIM.VarldMark) => x.gen === y.gen && x.delfro === y.delfro && x.mark.every((m, i) => m === y.mark[i]) && x.flod.every((f, i) => f === y.flod[i]) && x.ned.every((n, i) => n === y.ned[i]);
    // en värld som sparats med en äldre generator behåller sitt land
    const gammal = SIM.cloneState(ny); gammal.varld!.mark.gen = 0;
    const kvar = SIM.varldMark(gammal)!;
    return [
      ['en testby har ingen värld', !testBy(10).varld && !SIM.varldMark(testBy(10))],
      ['världens frö räknas ur byns utan att röra byns slump', slumpFore === slumpEfter && fro === SIM.varldFro(med.seed) && fro !== med.seed],
      ['byn utvecklas exakt som utan värld (6 timmar)', lika],
      [`världen sparas som en egen del inom sin gräns (${kb.toFixed(0)} KB av ${SIM.delGrans('varlden')})`, kb > 0 && kb <= SIM.delGrans('varlden')],
      ['världen laddas med byn, exakt som den räknades fram', samma(a, ratt) && samma(b, ratt) && ny.varld!.fro === fro],
      ['en sparad värld behåller sitt land och sin version', kvar.gen === 0 && samma({ ...kvar, gen: ratt.gen }, ratt)],
      ['medVarld ger en by som har en värld samma värld', SIM.medVarld(ny) === ny.varld],
    ];
  },
};

SCENARIER.landmarken = {
  text: 'Landmärkena (steg 11.2.8): registret LANDMARKEN, platsen som en post i världen, var den får ligga, och bron, spången och den röjda passagen som ändrar kostnaden',
  kor: () => {
    const fro = SIM.varldFro(7), v = SIM.skapaVarldMark(fro), vl = SIM.packaVarld(fro, v), V = SIM.VARLD;
    const forst = (pass: (i: number) => boolean) => { for (let i = 0; i < v.w * v.h; i++) if (pass(i)) return { i, x: i % v.w, y: Math.floor(i / v.w) }; return undefined; };
    const m = (i: number) => SIM.MARK_IDS[v.mark[i]];
    const rader = SIM.LANDMARK_IDS.every(k => { const d = SIM.LANDMARKEN[k] as SIM.LandmarkDef; return d.mark.length > 0 && d.mark.every(x => SIM.VARLDMARK[x].land) && d.avst >= 1 && !!d.tecken; });
    const slatt = forst(i => m(i) === 'slatt' && !v.flod[i])!;
    const by = SIM.laggPlats(vl, v, 'by', slatt.x, slatt.y, 0);
    const forNara = !SIM.laggPlats(vl, v, 'by', slatt.x, slatt.y, 0) && !!SIM.hinder(vl, v, 'ruin', slatt.x + 1, slatt.y);
    const hav = forst(i => m(i) === 'hav')!, iHavet = !SIM.laggPlats(vl, v, 'by', hav.x, hav.y, 0);
    const spangSlatt = !!SIM.hinder(vl, v, 'spang', slatt.x + 10, slatt.y);
    // bron över det breda loppet
    const ledig = (i: number) => (vl.platser ?? []).every(p => Math.max(Math.abs(p.x - i % v.w), Math.abs(p.y - Math.floor(i / v.w))) >= 4);
    const fl = forst(i => v.flod[i] === SIM.FLOD_NEDRE && (m(i) === 'slatt' || m(i) === 'skog') && ledig(i))!;
    const fore = { vagn: SIM.rutKostnad(vl, v, fl.i, 'vagn'), fots: SIM.rutKostnad(vl, v, fl.i, 'fots') };
    const bro = SIM.laggPlats(vl, v, 'bro', fl.x, fl.y, 0);
    const efter = { vagn: SIM.rutKostnad(vl, v, fl.i, 'vagn'), fots: SIM.rutKostnad(vl, v, fl.i, 'fots') }, bas = SIM.VARLDMARK[m(fl.i)].kostnad;
    // spången över myren och den röjda passagen genom tät skog
    const myr = forst(i => m(i) === 'myr' && !v.flod[i] && ledig(i));
    const myrFore = myr ? SIM.rutKostnad(vl, v, myr.i, 'fots') : 0, myrVagn = myr ? SIM.rutKostnad(vl, v, myr.i, 'vagn') : 0;
    const spang = myr && SIM.laggPlats(vl, v, 'spang', myr.x, myr.y, 0);
    const tat = forst(i => m(i) === 'tat' && !v.flod[i] && ledig(i))!;
    const tatFore = SIM.rutKostnad(vl, v, tat.i, 'fots');
    SIM.laggPlats(vl, v, 'passage', tat.x, tat.y, 0);
    // en tillfällig plats upphör, och platserna följer med världen
    const sl2 = forst(i => m(i) === 'slatt' && !v.flod[i] && ledig(i))!;
    const lager = SIM.laggPlats(vl, v, 'handelslager', sl2.x, sl2.y, 0, { till: 100 });
    const antal = vl.platser!.length;
    SIM.platserUpphor(vl, 50); const kvar50 = vl.platser!.length;
    SIM.platserUpphor(vl, 100);
    const igen = JSON.parse(JSON.stringify(vl)) as SIM.Varlden;
    return [
      ['raderna i LANDMARKEN: marken finns och är land, avståndet och tecknet finns', rader],
      ['en by läggs på slätten, med nummer, frö och tid', !!by && by.nr === 1 && by.fro > 0 && by.fran === 0 && SIM.varldPlatsNr(vl, 1) === by],
      ['en plats får inte ligga för nära en annan, i havet eller på fel mark', forNara && iHavet && spangSlatt],
      [`bron släpper över vagnen och tar bort flodens kostnad (vagn ${fore.vagn} → ${efter.vagn}, till fots ${fore.fots} → ${efter.fots})`, !!bro && fore.vagn === Infinity && efter.vagn === bas && fore.fots === bas + V.flodNedre && efter.fots === bas],
      [`spången tar bort myrens kostnad (${myrFore} → ${myr ? SIM.rutKostnad(vl, v, myr.i, 'fots') : '–'}) men vagnen kommer inte fram`, !!spang && myrFore === 3 && myrVagn === Infinity && SIM.rutKostnad(vl, v, myr!.i, 'fots') === 1 && SIM.rutKostnad(vl, v, myr!.i, 'vagn') === Infinity],
      [`den röjda passagen gör tät skog till skog (${tatFore} → ${SIM.rutKostnad(vl, v, tat.i, 'fots')})`, tatFore === 2.5 && SIM.rutKostnad(vl, v, tat.i, 'fots') === 1.4 && SIM.rutKostnad(vl, v, tat.i, 'vagn') === 1.4],
      ['en tillfällig plats upphör vid sin tid', !!lager && kvar50 === antal && vl.platser!.length === antal - 1],
      ['platserna sparas med världen', JSON.stringify(igen.platser) === JSON.stringify(vl.platser) && igen.nastaPlats === vl.nastaPlats],
    ];
  },
};

SCENARIER.radtal = {
  text: 'Raden i tal (steg 11.2.9): RADTAL läser huvudbyns rad ur byn, en gång i timmen, i hela tal som stämmer med byn',
  kor: () => {
    const s = SIM.cloneState(testBy(10)), t0 = s.now;
    SIM.medVarld(s);
    kor(s, 3);
    const vl = s.varld!, r = vl.rader?.find(x => x.nr === vl.huvud);
    const skrevs = !!r && r.t > t0 && r.t <= s.now && s.now - r.t <= 3600 * 1000;
    SIM.skrivHuvudRad(s);
    const tal = r!.tal, hela = SIM.RADTAL_IDS.every(k => Number.isInteger(tal[k]) && tal[k] >= 0);
    const folk = s.people.filter(p => p.died === undefined && p.left === undefined && !p.gast).length;
    const silver = SIM.stacksOf(s).filter(a => a.k === 'silver' && SIM.isStored(s, a.x, a.y)).reduce((a, b) => a + b.n, 0);
    const vuxna = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vaktFran).length;
    const bara = SIM.cloneState(testBy(10)); // en by utan värld får ingen rad
    kor(bara, 2);
    return [
      ['huvudbyns rad skrivs av sig själv en gång i timmen', skrevs && vl.rader!.length === 1],
      [`talen är hela (${SIM.RADTAL_IDS.map(k => `${k} ${tal[k]}`).join(', ')})`, hela],
      ['folket är byborna', tal.folk === folk && folk > 0],
      ['maten är portionerna i byn', tal.mat === Math.floor(SIM.foodOf(s)) && tal.mat > 0],
      ['rikedomen är byns rikedom', tal.rikedom === Math.round(SIM.rikedom(s)) && tal.rikedom > 0],
      ['silvret är silvret i byns förråd', tal.silver === Math.floor(silver)],
      ['styrkan är de vuxna som kan slåss', tal.styrka > 0 && tal.styrka <= vuxna],
      ['en by utan värld får ingen rad', !bara.varld],
    ];
  },
};

SCENARIER.bysorter = {
  text: 'Bysorterna och radens fasta fält (steg 11.2.11): BYSORTER säger vad som gäller varje sort, och huvudbyns rad har sina fasta fält ur byn',
  kor: () => {
    const B = SIM.BYSORTER as Record<string, SIM.BysortDef>;
    const sorter = SIM.BYSORT_IDS.every(k => !!SIM.LANDMARKEN[B[k]!.plats]) && ['by', 'rovarlager', 'handelslager', 'utpost', 'ruin'].every(k => k in B);
    const regler = B.by!.barn && B.by!.egenMat && !B.by!.slut && !B.rovarlager!.barn && !B.rovarlager!.egenMat && B.rovarlager!.slut === 'folk'
      && B.handelslager!.slut === 'tid' && B.utpost!.moder && B.utpost!.slut === 'moder' && !B.ruin!.folk && SIM.BYSORT_IDS.every(k => B[k]!.folk || !B[k]!.barn);
    const s = SIM.cloneState(testBy(10));
    SIM.medVarld(s);
    kor(s, 2);
    const r = SIM.huvudRad(s)!, folk = s.people.filter(SIM.alive), led = SIM.ledareOf(s);
    const tek = SIM.TEKNIK.filter(t => folk.some(p => SIM.knows(p, t.id))).map(t => t.id);
    const troende = folk.filter(p => p.tro !== undefined).length;
    const ledOk = led ? r.ledare === 0 && r.fasta[0]?.id === led.id && r.fasta[0]?.roll === 'ledare' && r.fasta[0]?.namn === led.name : r.ledare === undefined && r.fasta.length === 0;
    const troOk = troende ? !!r.tro && Number.isInteger(r.tro.andel) && r.tro.andel > 0 && r.tro.andel <= 100 && r.tro.krig >= 0 && r.tro.krig <= 100 : !r.tro;
    return [
      ['BYSORTER har by, rövarläger, handelsläger, utpost och ruin, var och en med en plats i LANDMARKEN', sorter],
      ['sorternas regler: byn föder barn och skaffar mat, rövarlägret lever på byte och slutar med folket, handelslägret vid sin tid, utposten med moderbyn, ruinen har inget folk', regler],
      [`huvudbyns rad är en by med byns namn och när den grundades (${r.namn})`, r.sort === 'by' && r.namn === SIM.bynsNamn(s) && r.grundad === s.founded && r.lyder === undefined && r.fran === undefined],
      [`teknikerna är de byn kan (${r.tek.length})`, r.tek.length === tek.length && tek.every(id => r.tek.includes(id))],
      [`tron (${r.tro ? `${r.tro.namn}, ${r.tro.andel} %, krigisk ${r.tro.krig}` : 'ingen'})`, troOk],
      [`ledaren är en fast person (${led?.name ?? 'ingen ledare'})`, ledOk],
    ];
  },
};

SCENARIER.varldnamn = {
  text: 'Namnen i världen (steg 11.2.12): bynamn och platsnamn ur namnregistret, utan dubbletter, och samma värld får samma namn',
  kor: () => {
    const fro = SIM.varldFro(3), v = SIM.skapaVarldMark(fro);
    const lagg = () => {
      const vl = SIM.packaVarld(fro, v);
      // byarna och platserna, och sedan fyra gånger fler byar på de lämpliga rutorna, så att namnen prövas i en mycket tätare värld
      SIM.laggByar(vl, v); SIM.laggOvriga(vl, v);
      for (const i of SIM.byRutor(v)) if (SIM.hash3(fro, i, 77) < 4 * SIM.BYPLATS.byTathet) SIM.laggPlats(vl, v, 'by', i % v.w, Math.floor(i / v.w), 0);
      return vl;
    };
    const a = lagg(), b = lagg(), pl = a.platser ?? [];
    const namn = pl.map(p => p.namn), unika = new Set(namn);
    const byar = pl.filter(p => p.k === 'by'), kap = SIM.FORLED.length * SIM.VARLDNAMN.by.efter.length;
    const pa = (k: string) => pl.filter(p => p.k === k).length;
    // ett namn som redan finns väljs inte igen
    const upptagna = new Set<string>(), forsta = SIM.varldNamn(a, 'by', 1, upptagna); upptagna.add(forsta);
    const andra = SIM.varldNamn(a, 'by', 1, upptagna);
    const gudar = ['Tor', 'Oden', 'Frej', 'Freja', 'Loke', 'Balder', 'Njord', 'Tyr', 'Heimdal'];
    return [
      [`${pl.length} platser i en värld med fem gånger fler byar än vanligt, ${byar.length} byar (namnen räcker till ${kap} byar)`, pl.length > 100 && kap >= 2 * byar.length],
      [`inga dubbletter (${unika.size} namn, t.ex. ${byar.slice(0, 3).map(p => p.namn).join(', ')})`, unika.size === namn.length && namn.every(n => n.length > 2 && !/ \d+$/.test(n))],
      ['samma värld får samma namn', namn.length === (b.platser ?? []).length && namn.every((n, i) => n === b.platser![i]!.namn)],
      ['ett namn som redan finns väljs inte igen', forsta !== andra],
      ['varje sort får namn av sitt slag', SIM.LANDMARK_IDS.every(k => !pa(k) || pl.filter(p => p.k === k).every(p => SIM.VARLDNAMN[SIM.NAMNSLAG[k]].efter.some(e => p.namn.endsWith(e.trim()) || p.namn.endsWith(e.slice(1)))))],
      ['inga namn på verkliga gudar', !SIM.FORLED.some(f => gudar.includes(f))],
    ];
  },
};

SCENARIER.byplats = {
  text: 'Byarna placeras (steg 11.2.13): byplatserna efter mark och sötvatten med en täthet, och huvudbyn på en ledig plats med samma regler',
  kor: () => {
    const s = SIM.cloneState(testBy(10)), rng = JSON.stringify(s.rngs);
    const vl = SIM.medVarld(s), v = SIM.varldMark(s)!, byar = (vl.platser ?? []).filter(p => p.k === 'by');
    const r = SIM.huvudRad(s)!, hem = byar.find(p => p.by === r.nr);
    const rutor = SIM.byRutor(v), lamplig = new Set(rutor), vantat = rutor.length * SIM.BYPLATS.byTathet;
    const m = (p: { x: number; y: number }) => SIM.MARK_IDS[v.mark[p.y * v.w + p.x]];
    const enPerRuta = new Set(byar.map(p => p.y * v.w + p.x)).size === byar.length;
    // samma värld en gång till: samma byar på samma ställen
    const t = SIM.cloneState(testBy(10)), igen = (SIM.medVarld(t).platser ?? []).filter(p => p.k === 'by');
    return [
      [`${byar.length} byar, väntat ${vantat.toFixed(0)} ur ${rutor.length} lämpliga rutor och tätheten ${SIM.BYPLATS.byTathet}`, Math.abs(byar.length - 1 - vantat) <= 4 * Math.sqrt(vantat) + 1 && byar.length > 5],
      ['ingen by ligger i vatten eller på fel mark, och alla högst två rutor från sötvatten', byar.every(p => (m(p) === 'slatt' || m(p) === 'skog') && lamplig.has(p.y * v.w + p.x))],
      ['ingen by ligger på en annan bys karta', enPerRuta],
      [`huvudbyn ligger på en ledig byplats (${hem ? `${hem.x}, ${hem.y}` : 'ingen'})`, !!hem && r.x === hem.x && r.y === hem.y && lamplig.has(hem.y * v.w + hem.x) && hem.namn === r.namn],
      ['byns slump rörs inte', JSON.stringify(s.rngs) === rng],
      ['samma värld ger samma byar', igen.length === byar.length && igen.every((p, i) => p.x === byar[i]!.x && p.y === byar[i]!.y && p.namn === byar[i]!.namn)],
    ];
  },
};

SCENARIER.platser = {
  text: 'De övriga platserna (steg 11.2.14): heliga platser, gravhögar, runstenar, fyndplatser och rastplatser läggs ut efter sina rader i LANDMARKEN',
  kor: () => {
    const s = SIM.cloneState(testBy(10)), vl = SIM.medVarld(s), v = SIM.varldMark(s)!, pl = vl.platser ?? [];
    const D = (k: SIM.LandmarkId) => SIM.LANDMARKEN[k] as SIM.LandmarkDef;
    const sorter = SIM.LANDMARK_IDS.filter(k => D(k).tathet), land = Array.from(v.mark).filter(m => SIM.VARLDMARK[SIM.MARK_IDS[m]].land).length;
    const antal = (k: string) => pl.filter(p => p.k === k).length;
    const m = (p: SIM.VarldPlats) => SIM.MARK_IDS[v.mark[p.y * v.w + p.x]];
    const nara = pl.some((a, i) => pl.some((b, j) => j > i && Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) < Math.max(D(a.k).avst, D(b.k).avst)));
    const t = SIM.cloneState(testBy(10)), igen = SIM.medVarld(t).platser ?? [];
    return [
      [`sorterna med en täthet: ${sorter.map(k => `${k} ${antal(k)} (högst ${Math.round(D(k).tathet! * land)})`).join(', ')}`, sorter.length === 5 && sorter.every(k => antal(k) > 0 && antal(k) <= D(k).tathet! * land * 1.5 + 3)],
      ['varje plats ligger på mark som dess rad tillåter', pl.every(p => (D(p.k).mark as readonly string[]).includes(m(p)))],
      ['ingen plats ligger närmare en annan än raderna tillåter', !nara],
      ['namnen är unika', new Set(pl.map(p => p.namn)).size === pl.length],
      ['samma värld ger samma platser', igen.length === pl.length && igen.every((p, i) => p.k === pl[i]!.k && p.x === pl[i]!.x && p.y === pl[i]!.y)],
    ];
  },
};

SCENARIER.varldskarta = {
  text: 'Världskartan (steg 11.2.16): en knapp i sidhuvudet öppnar kartan, som ritar marken i färger, floderna och platserna med tecken ur paletten, och den går att dra och zooma',
  kor: () => {
    const s = SIM.cloneState(testBy(10)), vl = SIM.medVarld(s), v = SIM.varldMark(s)!, b = VB.ritaVarld(vl, v), K = VB.VK;
    const px = (x: number, y: number) => { const i = (y * b.w + x) * 4; return '#' + [0, 1, 2].map(j => b.data[i + j].toString(16).padStart(2, '0')).join(''); };
    const markFarg = (i: number) => { const [r, n] = SIM.VARLDMARK[SIM.MARK_IDS[v.mark[i]]].farg; return farg(r, n); };
    const hb = VB.huvudbynsPlats(vl);
    // marken: rutans hörn har marksortens färg (huvudbyn har sin ram där)
    let fel = 0;
    for (let i = 0; i < v.w * v.h; i++) { const x = i % v.w, y = Math.floor(i / v.w); if (px(x * K, y * K) !== (hb && hb.x === x && hb.y === y ? VB.RAMFARG : markFarg(i))) fel++; }
    // floderna: mitten av en flodruta har flodens färg, om ingen plats ligger där
    const platsRuta = new Set((vl.platser ?? []).map(p => p.y * v.w + p.x));
    let floder = 0, flodFel = 0;
    for (let i = 0; i < v.w * v.h; i++) if (v.flod[i] && v.ned[i] >= 0 && !platsRuta.has(i)) { floder++; if (px((i % v.w) * K + K / 2, Math.floor(i / v.w) * K + K / 2) !== VB.FLODFARG) flodFel++; }
    // platserna: tecknets punkter står på platsens ruta
    const ensam = (vl.platser ?? []).filter(p => SIM.varldPlatserPa(vl, p.x, p.y).length === 1);
    const harTecken = (namn: string, rx: number, ry: number) => VB.TECKEN[namn].every((r, y) => [...r].every((c, x) => c === '.' || x === 0 || y === 0 || x === K - 1 || y === K - 1 || px(rx * K + x, ry * K + y) === VB.TECKENPAL[c]));
    const platsFel = ensam.filter(p => !harTecken(SIM.LANDMARKEN[p.k].tecken, p.x, p.y));
    // marktecknen: träd, granar, tuvor och berg på en del av rutorna
    const medTecken = SIM.MARK_IDS.filter(k => (SIM.VARLDMARK[k] as SIM.MarkDef).tecken && v.mark.includes(SIM.MARK_IDS.indexOf(k)));
    const markTecken = medTecken.map(k => {
      let n = 0, av = 0;
      for (let i = 0; i < v.w * v.h; i++) if (SIM.MARK_IDS[v.mark[i]] === k && !v.flod[i] && !platsRuta.has(i)) { av++; if (VB.visarMarktecken(v, i % v.w, Math.floor(i / v.w)) && harTecken((SIM.VARLDMARK[k] as SIM.MarkDef).tecken!, i % v.w, Math.floor(i / v.w))) n++; }
      return { k, andel: av ? n / av : 0 };
    });
    // färgerna
    const farger = new Set<string>(); for (let i = 0; i < b.w * b.h; i += 7) farger.add(px(i % b.w, Math.floor(i / b.w)));
    const utanfor = [...farger].filter(f => !iPaletten(f));
    // tecknen finns för allt som har ett, i 16 × 16 punkter och med färger ur paletten
    const namn = [...new Set([...SIM.MARK_IDS.map(k => (SIM.VARLDMARK[k] as SIM.MarkDef).tecken), ...SIM.LANDMARK_IDS.map(k => SIM.LANDMARKEN[k].tecken), 'karta'].filter((x): x is string => !!x))];
    const saknas = namn.filter(n => !VB.TECKEN[n] || VB.TECKEN[n].length !== K || VB.TECKEN[n].some(r => r.length !== K || [...r].some(c => c !== '.' && !iPaletten(VB.TECKENPAL[c] ?? ''))));
    // vyn: hela kartan ryms, zoomen håller punkten under musen kvar, dra flyttar, och kartan går inte att dra bort
    const sw = 800, sh = 500, hel = VB.helaKartan(b.w, b.h, sw, sh);
    const ryms = b.w * hel.z <= sw + 1e-6 && b.h * hel.z <= sh + 1e-6 && Math.abs(Math.max(b.w * hel.z / sw, b.h * hel.z / sh) - 1) < 1e-6;
    const z1 = { x: 300, y: 200, z: 1 }, z2 = VB.zooma(z1, 2, 400, 250);
    const kvar = Math.abs((z1.x + 400 / z1.z) - (z2.x + 400 / z2.z)) < 1e-9 && Math.abs((z1.y + 250 / z1.z) - (z2.y + 250 / z2.z)) < 1e-9 && z2.z === 2;
    const dragen = VB.dra(z1, 100, -50), draOk = dragen.x === 200 && dragen.y === 250;
    const bort = VB.begransa({ x: -5000, y: 99999, z: 2 }, b.w, b.h, sw, sh), inne = bort.x === 0 && Math.abs(bort.y - (b.h - sh / 2)) < 1e-9;
    const zMax = VB.begransa({ x: 0, y: 0, z: 99 }, b.w, b.h, sw, sh).z === VB.ZOOM_MAX && VB.begransa({ x: 0, y: 0, z: 1e-6 }, b.w, b.h, sw, sh).z === hel.z;
    const rv = VB.rutaVid(z1, (5 * K + 3 - z1.x) * z1.z, (7 * K + 1 - z1.y) * z1.z), rutan = rv.x === 5 && rv.y === 7;
    const text = hb ? VB.rutaText(vl, v, hb.x, hb.y) : '';
    // knappen och rutan
    const kod = readFileSync(new URL('../../ui/varldskarta.ts', import.meta.url), 'utf8'), main = readFileSync(new URL('../../main.ts', import.meta.url), 'utf8');
    const knapp = /import '\.\/ui\/varldskarta'/.test(main) && /knapp\.id = 'calVarld'/.test(kod) && /\.nycklar/.test(kod) && /knapp\.addEventListener\('click'/.test(kod);
    const handelser = ['wheel', 'pointerdown', 'pointermove', 'pointerup'].every(h => kod.includes(`'${h}'`)) && /Escape/.test(kod);
    return [
      [`marken ritas i marksortens färg (${fel} rutor fel av ${v.w * v.h})`, fel === 0],
      [`floderna ritas längs vattnets väg (${floder} flodrutor, ${flodFel} fel)`, floder > 0 && flodFel === 0],
      [`platserna ritas med sina tecken (${ensam.length} platser, ${platsFel.length} fel${platsFel[0] ? `, t.ex. ${platsFel[0].k}` : ''})`, ensam.length > 0 && platsFel.length === 0 && !!hb],
      [`marktecknen står på en del av rutorna (${markTecken.map(m => `${m.k} ${Math.round(m.andel * 100)} %`).join(', ')})`, markTecken.length > 0 && markTecken.every(m => m.andel > 0.2 && m.andel < 0.8)],
      [`alla färger ur paletten (${farger.size} färger${utanfor.length ? `, utanför: ${utanfor.join(' ')}` : ''})`, utanfor.length === 0],
      [`varje tecken finns i 16 × 16 punkter (${namn.length} tecken${saknas.length ? `, saknas eller fel: ${saknas.join(', ')}` : ''})`, saknas.length === 0],
      [`huvudbyn har en ram, och dess ruta säger "Er by" (${text})`, !!hb && text.includes('Er by')],
      ['hela kartan ryms i rutan från början', ryms],
      ['zoomen håller punkten under musen kvar, och dra flyttar kartan', kvar && draOk],
      ['kartan går inte att dra bort, och zoomen har en gräns åt båda hållen', inne && zMax],
      ['en punkt på skärmen hittar sin världsruta', rutan],
      ['en knapp i sidhuvudet öppnar kartan, som går att dra och zooma med mus och fingrar och stängs med Esc', knapp && handelser],
    ];
  },
};

SCENARIER.varldslag = {
  text: 'Världens slag och slump (steg 11.2.17): perioderna (en timme och ett dygn) räknas från världens början i ordning, kön räknas vid sin tid, och slumpen är en hash, så levande läge och ikappräkning ger exakt samma värld',
  kor: () => {
    // provrader: varje period och varje post i kön skriver in sig i en logg och drar ur världens slump; posterna lägger nya poster
    const logg = new WeakMap<SIM.Varlden, string[]>(), skriv = (vl: SIM.Varlden, t: string) => { const l = logg.get(vl) ?? []; l.push(t); logg.set(vl, l); };
    const rader: SIM.PeriodRad[] = [
      { namn: 'prov timme', period: 'timme', fn: (_s, vl, n) => { skriv(vl, `t${n}:${SIM.antalUr(2.5, SIM.varldSlump(vl, 1, n, 1))}`); if (SIM.varldSlump(vl, 2, n, 2) < 0.3) SIM.laggIKo(vl, SIM.periodSlut(vl, 'timme', n) + Math.floor(SIM.varldSlump(vl, 3, n, 3) * 5 * 3600e3), 'prov', { sak: n }); } },
      { namn: 'prov dygn', period: 'dygn', fn: (_s, vl, n) => skriv(vl, `d${n}:${SIM.varldSlump(vl, 4, n, 4).toFixed(6)}`) },
    ];
    SIM.PERIODRADER.push(...rader);
    SIM.KOHANDELSER.prov = (_s, vl, p) => { skriv(vl, `k${p.sak}@${p.t}`); if ((p.sak ?? 0) % 2) SIM.laggIKo(vl, p.t + 1800e3, 'prov', { sak: (p.sak ?? 0) + 1000 }); };
    try {
      const ny = () => { const s = SIM.cloneState(testBy(10)); SIM.medVarld(s); return s; };
      const levande = ny(), ikapp = ny(), slut = levande.now + 4 * 86400e3 + 1234e3; // fyra dygn (fyra år i spelet)
      while (levande.now < slut) { levande.now = Math.min(slut, levande.now + 300e3); SIM.varldSteg(levande); }
      ikapp.now = slut; SIM.varldSteg(ikapp);
      const a = logg.get(levande.varld!) ?? [], b = logg.get(ikapp.varld!) ?? [];
      const lika = a.length > 0 && JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(levande.varld!.ko ?? []) === JSON.stringify(ikapp.varld!.ko ?? []);
      const vl = levande.varld!, timmar = SIM.periodNu(vl, 'timme', slut), dygn = SIM.periodNu(vl, 'dygn', slut);
      const antal = vl.perioder!.timme === timmar && vl.perioder!.dygn === dygn && a.filter(x => x[0] === 't').length === timmar && a.filter(x => x[0] === 'd').length === dygn;
      // ordningen: varje post i kön räknas vid sin tid, efter perioderna som slutat före den
      const tider = a.map(x => x[0] === 'k' ? Number(x.split('@')[1]) : SIM.periodSlut(vl, x[0] === 't' ? 'timme' : 'dygn', Number(x.slice(1).split(':')[0])));
      const iOrdning = tider.every((t, i) => i === 0 || t >= tider[i - 1]), poster = a.filter(x => x[0] === 'k').length;
      const kvar = (vl.ko ?? []).every(p => p.t > slut);
      // slumpen
      const sl = [0, 1, 2].map(i => SIM.varldSlump(vl, 7, 3, i)), igen = SIM.varldSlump(vl, 7, 3, 0) === sl[0];
      let summa = 0; for (let n = 0; n < 4000; n++) summa += SIM.antalUr(1.25, SIM.varldSlump(vl, 9, n, 5));
      const rng = JSON.stringify(levande.rngs) === JSON.stringify(ny().rngs);
      // en by utan värld
      const utan = SIM.cloneState(testBy(10)); utan.now += 86400e3; SIM.varldSteg(utan);
      const takt = SIM.TAKTER.some(r => r.namn === 'världen');
      return [
        [`levande läge och ikappräkning ger exakt samma värld (${a.length} händelser på fyra dygn, fyra år i spelet)`, lika],
        [`perioderna räknas från världens början, en i taget (${timmar} timmar, ${dygn} dygn)`, antal],
        [`kön räknas vid sin tid och i tidsordning med perioderna (${poster} poster)`, poster > 0 && iOrdning && kvar],
        ['slumpen är en hash: samma frö, sak, period och ärende ger samma tal, ett annat ärende ett annat', igen && sl[0] !== sl[1] && sl[1] !== sl[2]],
        [`ett väntat antal blir hela händelser (1,25 i snitt: ${(summa / 4000).toFixed(3)})`, Math.abs(summa / 4000 - 1.25) < 0.03],
        ['världen rör inte byns slump', rng],
        ['en by utan värld får ingen', !utan.varld],
        ['världen har sin rad i TAKTER', takt],
      ];
    } finally {
      for (const r of rader) SIM.PERIODRADER.splice(SIM.PERIODRADER.indexOf(r), 1);
      delete SIM.KOHANDELSER.prov;
    }
  },
};

SCENARIER.varldskronika = {
  text: 'Världens krönika (steg 11.2.19): registret VARLDSHANDELSER och krönikan där världens händelser skrivs i tidsordning, de stora för alltid och de små med ett tak',
  kor: () => {
    const s = SIM.cloneState(testBy(10)), vl = SIM.medVarld(s), r = vl.rader!.find(x => x.nr === vl.huvud)!;
    SIM.skrivHuvudRad(s);
    const forsta = vl.kronika?.[0], grundad = forsta?.k === 'grundad' && forsta.by === vl.huvud && forsta.t === s.founded;
    const text = forsta ? SIM.varldHandelseText(vl, forsta) : '';
    // många händelser: de stora står kvar, de små stannar vid taket och de äldsta små försvinner
    const by = vl.platser!.filter(p => p.k === 'by' && p.by === undefined).slice(0, 2);
    const t0 = s.now, tak = SIM.VARLDKRONIKA.smaTak;
    for (let i = 0; i < tak + 50; i++) SIM.varldHandelse(vl, i % 2 ? 'svalt' : 'farsot', t0 + i * 3600e3, { by: vl.huvud });
    for (let i = 0; i < 20; i++) SIM.varldHandelse(vl, 'krig', t0 + i * 7200e3, { by: vl.huvud, mot: 999 });
    SIM.varldHandelse(vl, 'karavan', t0 + (tak + 40) * 3600e3 - 1000, { plats: by[0]?.nr }); // i efterhand, mellan två andra
    const kr = vl.kronika!, sma = kr.filter(h => !SIM.VARLDSHANDELSER[h.k].stor), stora = kr.filter(h => SIM.VARLDSHANDELSER[h.k].stor);
    const iOrdning = kr.every((h, i) => i === 0 || h.t >= kr[i - 1].t);
    const aldstaBort = !sma.some(h => h.t < t0 + 50 * 3600e3 && h.k !== 'karavan') || sma.length === tak;
    const karavan = SIM.varldHandelseText(vl, kr.find(h => h.k === 'karavan') ?? kr[0]);
    const alla = SIM.VARLDHANDELSE_IDS.length === 12 && ['grundad', 'gattUnder', 'delad', 'nyLedare', 'krig', 'fred', 'forbund', 'svalt', 'farsot', 'rad', 'karavan', 'uppdrag'].every(k => k in SIM.VARLDSHANDELSER);
    // sparas med världen
    const igen = JSON.parse(JSON.stringify(vl)) as SIM.Varlden;
    return [
      ['registret har slagen grundad, gått under, delad, ny ledare, krig, fred, förbund, svält, farsot, räd, plundrad karavan och uppdrag', alla],
      [`huvudbyns grundande står först i världens krönika ("${text}")`, grundad && text.includes(r.namn) && !!r.namn],
      [`de stora sparas för alltid (${stora.length} stora)`, stora.length === 21],
      [`de små har ett tak (${sma.length} av högst ${tak}), och de äldsta försvinner först`, sma.length === tak && aldstaBort],
      [`krönikan står i tidsordning, också när en händelse skrivs i efterhand ("${karavan}")`, iOrdning && karavan.startsWith('En karavan plundras vid')],
      ['krönikan sparas med världen', igen.kronika?.length === kr.length],
    ];
  },
};
