// Scenarier för fas 11: världen.
import * as SIM from '../../sim';
import { SCENARIER, kor, korTills, testBy } from './hjalp';
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
    const finns = new Set(SIM.tingOf(s).map(g => g.id)), agerUnder = ager(), agerKvar = agerFore.split(',').filter(id => id && finns.has(Number(id))).join(','); // det som slitits ut under tiden finns inte längre (ett utlånat redskap)
    SIM.kommHem(s, p, x + 1, y);
    const barHem = bar(), hemma = SIM.living(s).includes(p) && !SIM.ute(p) && p.x === x + 1 && p.y === y;
    kor(s, 1);
    return [
      ['den som är borta är bybo men inte i byn', borta],
      [`hen gör inget i byn medan hen är borta (${gjorde} gånger)`, gjorde === 0 && stod],
      [`ingen i byn väljer hen till något (${valdes} gånger)`, valdes === 0],
      ['hen äger sitt medan hen är borta', agerUnder === agerKvar],
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
    for (const p of alla) SIM.kommHem(s, p, p.x, p.y);
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
  text: 'Världen bredvid byn (steg 11.2.7): varje by har en värld (steg 11.2.15), världens frö rör inte byns slump, samma frö ger samma värld, och världen sparas och laddas med byn',
  kor: async () => {
    const har = SIM.cloneState(testBy(10)), med = SIM.cloneState(testBy(10)); delete med.varld;
    const slumpFore = JSON.stringify(med.rngs);
    SIM.medVarld(med);
    const slumpEfter = JSON.stringify(med.rngs), fro = med.varld!.fro;
    const lika = JSON.stringify(har.varld!.mark) === JSON.stringify(med.varld!.mark) && JSON.stringify(har.varld!.platser!.map(p => [p.k, p.x, p.y])) === JSON.stringify(med.varld!.platser!.map(p => [p.k, p.x, p.y]));
    kor(med, 6);
    // världen följer med i sparningen, som en egen del inom sin gräns
    const delar = SIM.serializeParts(med), kb = new TextEncoder().encode(delar.varlden ?? '').length / 1024;
    const bas = minnesBas(); await sparaBy(bas, 'b', med);
    const ny = (await lasBy(bas, 'b'))!.by, a = SIM.varldMark(med)!, b = SIM.varldMark(ny)!;
    const ratt = SIM.skapaVarldMark(fro), samma = (x: SIM.VarldMark, y: SIM.VarldMark) => x.gen === y.gen && x.delfro === y.delfro && x.mark.every((m, i) => m === y.mark[i]) && x.flod.every((f, i) => f === y.flod[i]) && x.ned.every((n, i) => n === y.ned[i]);
    // en värld som sparats med en äldre generator behåller sitt land
    const gammal = SIM.cloneState(ny); gammal.varld!.mark.gen = 0;
    const kvar = SIM.varldMark(gammal)!;
    return [
      ['en testby har en värld', !!testBy(10).varld && !!SIM.varldMark(testBy(10))],
      ['världens frö räknas ur byns utan att röra byns slump', slumpFore === slumpEfter && fro === SIM.varldFro(med.seed) && fro !== med.seed],
      ['samma frö ger samma värld: marken och platserna', lika],
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
    const bara = SIM.cloneState(testBy(10)); delete bara.varld; // en by utan värld får ingen rad
    kor(bara, 2);
    return [
      ['huvudbyns rad skrivs av sig själv en gång i timmen', skrevs && vl.rader!.filter(x => x.nr === vl.huvud).length === 1 && !r!.syn],
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
      const utan = SIM.cloneState(testBy(10)); delete utan.varld; utan.now += 86400e3; SIM.varldSteg(utan);
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

SCENARIER.vagval = {
  text: 'Vägvalet (steg 11.2.20): den billigaste vägen på världens rutnät för ett färdsätt, sparad som en del av världen; vägen går runt berg och myr, och vagnen tar en annan väg än den som går',
  kor: () => {
    // en liten provvärld: slätt med ett bergsblock, ett myrblock och en vägg av tät skog med en lucka
    const nr = (k: SIM.MarkId) => SIM.MARK_IDS.indexOf(k);
    const prov = (rita: (x: number, y: number) => SIM.MarkId) => {
      const w = 30, h = 16, mark = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) mark[y * w + x] = nr(rita(x, y));
      const v: SIM.VarldMark = { gen: 1, fro: 1, delfro: 0, w, h, mark, flod: new Uint8Array(w * h), ned: new Int32Array(w * h).fill(-1) };
      return { v, vl: { fro: 1, mark: {} as SIM.Varlden['mark'] } as SIM.Varlden, i: (x: number, y: number) => y * w + x };
    };
    const har = (v: SIM.VarldMark, r: number[] | undefined, k: SIM.MarkId) => !!r?.some(i => v.mark[i] === nr(k));
    const berg = prov((x, y) => x >= 12 && x < 18 && y >= 4 && y < 12 ? 'berg' : 'slatt');
    const bv = SIM.billigasteVag(berg.vl, berg.v, berg.i(3, 8), berg.i(26, 8), 'fots');
    const myr = prov((x, y) => x >= 12 && x < 18 && y >= 4 && y < 12 ? 'myr' : 'slatt');
    const mv = SIM.billigasteVag(myr.vl, myr.v, myr.i(3, 8), myr.i(26, 8), 'fots');
    const tat = prov((x, y) => x === 15 && y > 1 ? 'tat' : 'slatt');
    const fots = SIM.billigasteVag(tat.vl, tat.v, tat.i(3, 12), tat.i(26, 12), 'fots'), vagn = SIM.billigasteVag(tat.vl, tat.v, tat.i(3, 12), tat.i(26, 12), 'vagn');
    const vagnAnnan = !!fots && !!vagn && har(tat.v, fots.rutor, 'tat') && !har(tat.v, vagn.rutor, 'tat') && vagn.rutor.some(i => i === tat.i(15, 0) || i === tat.i(15, 1)) && vagn.kostnad > fots.kostnad;
    const hav = prov((x) => x === 15 ? 'hav' : 'slatt'), ingen = SIM.billigasteVag(hav.vl, hav.v, hav.i(3, 3), hav.i(26, 3), 'fots');
    // i en riktig värld: från huvudbyn till en annan by
    const s = SIM.cloneState(testBy(10)), vl = SIM.medVarld(s), v = SIM.varldMark(s)!;
    const hb = vl.platser!.find(p => p.by === vl.huvud)!, a = hb.y * v.w + hb.x;
    let vag: SIM.VarldVag | undefined, mal: SIM.VarldPlats | undefined;
    vl.vagar = []; // grannätets vägar räknas inte här
    for (const p of vl.platser!.filter(q => q.k === 'by' && q !== hb).sort((p, q) => Math.hypot(p.x - hb.x, p.y - hb.y) - Math.hypot(q.x - hb.x, q.y - hb.y))) { vag = SIM.vagMellan(vl, v, a, p.y * v.w + p.x, 'fots', s.now); if (vag) { mal = p; break; } }
    const k = SIM.kostnader(vl, v, 'fots');
    const rutor = vag ? SIM.vagRutor(vag, v.w) : [];
    const stegOk = !!vag && rutor[0] === a && rutor.at(-1) === mal!.y * v.w + mal!.x && rutor.every((i, n) => n === 0 || Math.max(Math.abs(i % v.w - rutor[n - 1] % v.w), Math.abs(Math.floor(i / v.w) - Math.floor(rutor[n - 1] / v.w))) === 1);
    const summa = rutor.slice(1).reduce((t, i, n) => t + k[i] * (i % v.w !== rutor[n] % v.w && Math.floor(i / v.w) !== Math.floor(rutor[n] / v.w) ? Math.SQRT2 : 1), 0);
    const sparad = !!vag && SIM.vagMellan(vl, v, a, mal!.y * v.w + mal!.x, 'fots', s.now + 1) === vag && vl.vagar!.length === 1 && JSON.parse(JSON.stringify(vl)).vagar[0].steg === vag.steg;
    return [
      [`vägen går runt berget (kostnad ${bv?.kostnad.toFixed(1)})`, !!bv && !har(berg.v, bv.rutor, 'berg')],
      [`vägen går runt myren (kostnad ${mv?.kostnad.toFixed(1)})`, !!mv && !har(myr.v, mv.rutor, 'myr')],
      [`vagnen tar en annan väg än den som går: den som går tar sig genom den täta skogen (${fots?.kostnad.toFixed(1)}), vagnen går runt genom luckan (${vagn?.kostnad.toFixed(1)})`, vagnAnnan],
      ['över havet finns ingen väg', ingen === undefined],
      [`i världen går vägen från huvudbyn till ${mal?.namn ?? 'ingen by'} ruta för ruta (${rutor.length} rutor)`, stegOk],
      [`vägens kostnad är summan av rutorna (${vag?.kostnad} och ${summa.toFixed(3)})`, !!vag && Math.abs(vag.kostnad - summa) < 0.01],
      ['vägen sparas i världen och räknas inte om', sparad],
    ];
  },
};

SCENARIER.grannat = {
  text: 'Grannätet (steg 11.2.21): varje by får sina närmaste byar som går att nå, räknat i vägens kostnad, med väg och restid',
  kor: () => {
    const s = SIM.cloneState(testBy(10)), t0 = performance.now(), vl = SIM.medVarld(s), tid = performance.now() - t0, v = SIM.varldMark(s)!;
    const byar = vl.platser!.filter(p => p.k === 'by'), N = SIM.GRANNAT.antal;
    const alla = byar.every(p => Array.isArray(p.grannar) && p.grannar.length <= N);
    const fulla = byar.filter(p => p.grannar!.length === N).length;
    const sorterade = byar.every(p => p.grannar!.every((g, i) => i === 0 || g.kostnad >= p.grannar![i - 1].kostnad));
    const restid = byar.every(p => p.grannar!.every(g => Math.abs(g.dygn - g.kostnad / SIM.VARLD.gangPerDygn) < 0.006));
    // vägen finns för varje granne och går från byn till grannen
    const ruta = (nr: number) => { const q = SIM.varldPlatsNr(vl, nr)!; return q.y * v.w + q.x; };
    const vagar = byar.every(p => p.grannar!.every(g => { const w = vl.vagar!.find(x => x.fs === 'fots' && x.fran === p.y * v.w + p.x && x.till === ruta(g.nr)); return !!w && SIM.vagRutor(w, v.w).at(-1) === ruta(g.nr) && Math.abs(w.kostnad - g.kostnad) < 1e-9; }));
    // huvudbyns grannar är de närmaste: ingen annan by går att nå billigare än den sista grannen
    const hb = byar.find(p => p.by === vl.huvud)!, sista = hb.grannar!.at(-1)?.kostnad ?? Infinity, egna = new Set(hb.grannar!.map(g => g.nr));
    const narmare = byar.filter(q => q !== hb && !egna.has(q.nr)).filter(q => (SIM.billigasteVag(vl, v, hb.y * v.w + hb.x, q.y * v.w + q.x, 'fots')?.kostnad ?? Infinity) < sista - 1e-6);
    const inteFagel = byar.some(p => { const f = [...byar].filter(q => q !== p).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; return f && p.grannar![0] && p.grannar![0].nr !== f.nr; });
    const storlek = JSON.stringify(vl).length;
    return [
      [`varje by har högst ${N} grannar (${byar.length} byar, ${fulla} med alla ${N})`, alla && fulla > byar.length / 2],
      ['grannarna står i ordning efter vägens kostnad, med restiden i dygn (kostnaden delad med gången per dygn)', sorterade && restid],
      ['vägen till varje granne är sparad i världen och går fram till grannen', vagar],
      [`huvudbyns grannar är de närmaste att nå (${hb.grannar!.map(g => g.dygn).join(', ')} dygn till fots)`, hb.grannar!.length > 0 && narmare.length === 0],
      ['närmast räknas i vägens kostnad, inte fågelvägen (minst en by har en annan närmaste granne än den fågelvägen ger)', inteFagel],
      [`världen ryms i sin del av sparfilen (${Math.round(storlek / 1024)} kB av ${SIM.SPARGRANS.varlden} kB) och skapas på ${Math.round(tid)} ms`, storlek < SIM.SPARGRANS.varlden * 1024],
    ];
  },
};

SCENARIER.klanbort = {
  text: 'Grannklanerna blir världens byar (steg 11.2.15, grannbyar.ts): en ny by har en värld, och grannarna är byarna i dess grannät, med en rad i världen som bär förbindelsen (hållningen, personerna, priserna och restiden). Var de bor är marken och väderstrecket, och det sällsynta hos dem är det marken där har sällsynt. Handlarna kommer därifrån, oftare från de nära. Talen i raden följer grannbyn varje dygn. En sparad by från före v531 får sin värld, och grannklanerna blir byarna i grannätet med sina namn och allt de visste',
  kor: () => {
    const s = SIM.createState(6, Date.UTC(2026, 0, 1)), vl = s.varld, k = SIM.klanerOf(s);
    const h = vl?.platser?.find(p => p.by === vl.huvud), v = SIM.varldMark(s)!;
    const rad = (c: SIM.Klan) => vl?.rader?.find(r => r.nr === c.rad), plats = (c: SIM.Klan) => vl?.platser?.find(p => p.k === 'by' && p.by === c.rad);
    const varld = !!vl && !s.klaner && !!h && k.length === h.grannar!.length && k.length > 0;
    const rader = k.every(c => rad(c)?.syn === c && rad(c)!.namn === c.namn && plats(c)?.namn === c.namn && rad(c)!.x === plats(c)!.x);
    const dygn = k.every(c => c.dygn === h!.grannar!.find(g => g.nr === plats(c)!.nr)!.dygn);
    const RIKT = ['öster', 'sydost', 'söder', 'sydväst', 'väster', 'nordväst', 'norr', 'nordost'];
    const hem = k.every(c => { const m = SIM.VARLDMARK[SIM.MARK_IDS[v.mark[plats(c)!.y * v.w + plats(c)!.x]]]; return c.hem.startsWith(m.bestamd + ' i ') && RIKT.some(r => c.hem.endsWith(r)) && JSON.stringify(c.sallsynt) === JSON.stringify(m.sallsynt); });
    // handlarna: oftare från en by nära
    const t = SIM.cloneState(s), kt = SIM.klanerOf(t);
    for (const c of kt) c.inst = 0;
    kt[0].dygn = 0.5; for (const c of kt.slice(1)) c.dygn = 4;
    const fran = new Map<number, number>();
    for (let i = 0; i < 600; i++) { const x = SIM.handlarKlan(t)!; fran.set(x.klan.id, (fran.get(x.klan.id) ?? 0) + 1); }
    const nara = fran.get(kt[0].id) ?? 0, annan = (fran.get(kt[1].id) ?? 0);
    const narhet = SIM.narhet(kt[0]) === 1 && SIM.narhet(kt[1]) === SIM.KLAN.naraDygn / 4;
    // talen i raden följer grannbyn
    t.now += SIM.DAY; SIM.klanSteg(t, SIM.DAY / SIM.SEC);
    SIM.varldSteg(t);
    const foljer = kt.every(c => { const r = t.varld!.rader!.find(x => x.nr === c.rad)!; return r.tal.folk === c.folk && r.tal.styrka === c.styrka && r.tal.rikedom === c.resurser; });
    // en sparad by från före v531: grannklanerna (och en till än grannätet rymmer) blir byar i världen
    const g = SIM.cloneState(s), gamla = SIM.klanerOf(g).map(c => ({ ...c, rad: undefined, dygn: undefined, sallsynt: undefined, hem: SIM.KLAN_HEM_NAMN[1] }));
    const extra = { ...gamla[0], id: 99, namn: 'Extrafolket', personer: [] };
    g.klaner = [...gamla, extra]; delete g.varld; g.v = 55; g.klanNr = 99; SIM.migrate(g);
    const kg = SIM.klanerOf(g), ex = kg.find(c => c.id === 99);
    const migr = !g.klaner && kg.length === gamla.length + 1 && gamla.every(c => kg.some(x => x.id === c.id && x.namn === c.namn && x.inst === c.inst && x.rad !== undefined));
    const extraPlats = !!ex && ex.dygn !== undefined && g.varld!.platser!.some(p => p.k === 'by' && p.by === ex.rad && p.namn === 'Extrafolket');
    const laddad = SIM.klanById(g, gamla[0].id)?.namn === gamla[0].namn && JSON.parse(SIM.serialize(g)).klaner === undefined;
    // en ny grannby på den närmaste lediga byplatsen
    const n = SIM.cloneState(s), ny = SIM.nyGrannby(n, 10, 20, { namn: 'Nyfolket' }), np = n.varld!.platser!.find(p => p.by === ny.rad);
    const nyPlats = !!np && np.namn === 'Nyfolket' && !!np.grannar?.length && SIM.klanerOf(n).includes(ny) && ny.dygn !== undefined;
    return [
      [`en ny by har en värld och ${k.length} grannar, byarna i grannätet`, varld],
      ['varje granne har en rad i världen med förbindelsen, och platsen och raden heter som grannen', rader],
      [`restiden är grannätets (${k.map(c => c.dygn).join(', ')} dygn, år i spelet)`, dygn],
      [`var de bor är marken och väderstrecket, och det sällsynta är markens (${k.map(c => c.hem).join(', ')})`, hem],
      [`handlarna kommer oftare från en by nära (${nara} gånger från den på ett halvt dygn, ${annan} från en på fyra)`, narhet && nara > 3 * annan && annan > 0],
      ['talen i raden följer grannbyn varje dygn', foljer],
      ['i en sparad by från före v531 blir grannklanerna byar i världen, med namn, hållning och id', migr && laddad],
      ['en klan som grannätet inte rymmer får den närmaste lediga byplatsen', extraPlats],
      ['en ny grannby får den närmaste lediga byplatsen, med ett grannät', nyPlats],
    ];
  },
};

SCENARIER.rattkant = {
  text: 'Rätt kant (steg 11.2.22, grannbyar.ts): bykartan och världskartan hänger ihop med väderstrecken. Handlaren, främlingen och rövarna kommer in från den kant på bykartan som pekar mot grannbyn de kommer från, där en rak linje från elden mot grannbyn når kanten (eller närmaste land längs kanten), och går ut åt samma håll. Har byn ingen värld gäller den närmaste kanten',
  kor: () => {
    const s = SIM.createState(6, Date.UTC(2026, 0, 1)), vl = s.varld!, h = vl.platser!.find(p => p.by === vl.huvud)!, e = SIM.eldPlats(s);
    const kl = SIM.klanerOf(s), tiles = SIM.getMap(s.seed).tiles;
    const pa = (q: { x: number; y: number }) => q.x <= 0.31 || q.y <= 0.31 || q.x >= SIM.W - 0.31 || q.y >= SIM.H - 0.31;
    const vinkel = (k: SIM.Klan) => {
      const p = vl.platser!.find(q => q.by === k.rad)!, q = SIM.kantMot(s, k.id)!;
      const a = Math.atan2(p.y - h.y, p.x - h.x), b = Math.atan2(q.y - e.y - 0.5, q.x - e.x - 0.5);
      return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
    };
    const kanter = kl.map(k => SIM.kantMot(s, k.id));
    const paKant = kanter.every(q => !!q && pa(q) && tiles[Math.floor(q.y) * SIM.W + Math.floor(q.x)] !== SIM.T.Vatten);
    const ratt = kl.filter(k => vinkel(k) < 0.05).length; // de vars kant inte är vatten pekar exakt mot grannbyn
    const nara = kl.every(k => vinkel(k) < Math.PI / 2);
    // handlaren
    const a = SIM.cloneState(s); SIM.skickaHandlare(a);
    const ha = a.handlare!, hk = SIM.hp(a, ha).gast!.klan, hm = SIM.kantMot(a, hk)!;
    const handlare = !!ha && ha.fran.x === hm.x && ha.fran.y === hm.y && ha.ut.x === hm.x && ha.ut.y === hm.y;
    // främlingen in och ut
    const b = SIM.cloneState(s); for (const k of SIM.klanerOf(b)) k.inst = 20;
    const f = SIM.framling(b)!, fm = SIM.kantMot(b, f.gast!.klan)!;
    const framIn = f.x === fm.x && f.y === fm.y;
    f.gast!.fas = 'gar'; f.x = e.x + 0.5; f.y = e.y + 1.5;
    const d0 = Math.hypot(f.x - fm.x, f.y - fm.y); SIM.framlingSteg(b, 20);
    const framUt = Math.hypot(f.x - fm.x, f.y - fm.y) < d0;
    // rövarna
    const c = SIM.cloneState(s), rk = SIM.klanerOf(c)[1]; SIM.rovarnaKommer(c, 3, false, rk.id);
    const rm = SIM.kantMot(c, rk.id)!, rovare = !!c.rovare && c.rovare.x === rm.x && c.rovare.y === rm.y;
    // utan värld: den närmaste kanten
    const u = SIM.cloneState(s); delete u.varld;
    const utan = SIM.kantMot(u, kl[0].id) === undefined;
    return [
      [`kanten mot varje grannby ligger på bykartans kant, på land (${kanter.map(q => q ? `${q.x.toFixed(1)},${q.y.toFixed(1)}` : '–').join('; ')})`, paKant],
      [`kanten pekar från elden mot grannbyn (${ratt} av ${kl.length} exakt, resten närmaste land längs kanten)`, ratt > 0 && nara],
      ['handlaren kommer in från kanten mot sin grannby och går ut där', handlare],
      ['främlingen kommer in från kanten mot sin grannby och går hem åt det hållet', framIn && framUt],
      ['rövarna kommer in från kanten mot sin grannby', rovare],
      ['en by utan värld har ingen sådan kant (då gäller den närmaste)', utan],
    ];
  },
};

SCENARIER.barkraft = {
  text: 'Bärkraften (steg 11.3.1, rad.ts): en by i världen kan föda platsens grundtal (marken på rutan och runt den, och floderna) gånger det teknikerna ger, och kolumnen rad i TEKNIK säger vad varje teknik ger en by i världen',
  kor: () => {
    // en liten värld: slätt överallt, en flod genom mitten
    const w = 5, h = 5, slatt = SIM.MARK_IDS.indexOf('slatt'), berg = SIM.MARK_IDS.indexOf('berg');
    const v: SIM.VarldMark = { gen: 1, fro: 1, delfro: 1, w, h, mark: new Uint8Array(w * h).fill(slatt), flod: new Uint8Array(w * h), ned: new Int32Array(w * h).fill(-1) };
    const ren = SIM.grundtal(v, 2, 2);
    v.flod[2 * w + 2] = 1;
    const medFlod = SIM.grundtal(v, 2, 2);
    v.mark.fill(berg);
    const pabg = SIM.grundtal(v, 2, 2), kant = SIM.grundtal(v, 0, 0);
    const r: SIM.VarldRad = { nr: 1, sort: 'by', namn: 'Prov', x: 2, y: 2, grundad: 0, t: 0, tal: { folk: 10, mat: 0, rikedom: 0, silver: 0, styrka: 0 }, tek: [], fasta: [] };
    v.mark.fill(slatt); v.flod.fill(0);
    const utan = SIM.barkraft(v, r);
    r.tek = ['odling', 'tork'];
    const med = SIM.barkraft(v, r), vantat = ren * (1 + (SIM.TEK.odling!.rad!.barkraft ?? 0));
    // kolumnen i TEKNIK
    const kol: SIM.RadKolumn[] = ['barkraft', 'forvaring', 'styrka', 'rikedom'];
    const anvands = kol.every(k => SIM.TEKNIK.some(t => (t.rad?.[k] ?? 0) > 0));
    const rimliga = SIM.TEKNIK.every(t => Object.values(t.rad ?? {}).every(x => x > 0 && x <= 1));
    // en riktig värld: varje by med en plats kan föda några
    const s = SIM.createState(6, Date.UTC(2026, 0, 1)), vm = SIM.varldMark(s)!;
    const alla = s.varld!.rader!.filter(x => x.x !== undefined).map(x => Math.round(SIM.barkraft(vm, x)));
    return [
      [`slätt runt platsen föder ${ren}, och en flod ${medFlod - ren} till`, ren === 9 * SIM.VARLDMARK.slatt.barkraft && medFlod === ren + SIM.RAD.flod],
      [`berg föder mindre (${pabg}), och vid kartans kant räknas bara rutorna som finns (${kant})`, pabg < ren && kant === 4 * SIM.VARLDMARK.berg.barkraft],
      [`teknikerna ger mer bärkraft: ${utan} utan och ${med.toFixed(1)} med odling (torkningen ger förvaring, inte bärkraft)`, Math.abs(med - vantat) < 1e-9 && med > utan],
      ['kolumnen i TEKNIK har bärkraft, förvaring, styrka och rikedom, var och en mellan 0 och 1', anvands && rimliga],
      [`byarna i en ny värld kan föda några (${alla.join(', ')})`, alla.length > 0 && alla.every(x => x > 0)],
    ];
  },
};

SCENARIER.radmat = {
  text: 'Maten, födda och döda i raden (steg 11.3.2, rad.ts): en by i världen växer mot sin bärkraft, svälter när maten tar slut (och världens krönika får raden Svält), har alltid hela tal och räknas likadant i levande läge och ikappräkning; huvudbyns rad rör reglerna inte',
  kor: () => {
    const s = SIM.createState(6, Date.UTC(2026, 0, 1)), vl = s.varld!, v = SIM.varldMark(s)!;
    const rader = vl.rader!.filter(r => SIM.lever(vl, r));
    const [liten, trang] = rader, bk = (r: SIM.VarldRad) => SIM.barkraft(v, r);
    liten.tal.folk = 4; liten.tal.mat = 30;
    trang.tal.folk = Math.round(bk(trang) * 3); trang.tal.mat = 0;
    const huvud = vl.rader!.find(r => r.nr === vl.huvud)!, huvudFore = JSON.stringify(huvud.tal);
    const ikapp = SIM.cloneState(s);
    let hela = true, trangMin = trang.tal.folk;
    for (let h = 1; h <= 30 * 24; h++) { // 30 dygn (30 år i spelet), en timme i taget
      s.now += 3600e3; SIM.varldSteg(s);
      for (const r of vl.rader!) if (!SIM.RADTAL_IDS.every(k => Number.isInteger(r.tal[k]) && r.tal[k] >= 0)) hela = false;
      trangMin = Math.min(trangMin, trang.tal.folk);
    }
    ikapp.now = s.now; SIM.varldSteg(ikapp);
    const lika = JSON.stringify(vl.rader!.map(r => r.tal)) === JSON.stringify(ikapp.varld!.rader!.map(r => r.tal));
    const svalt = (vl.kronika ?? []).filter(h => h.k === 'svalt' && h.by === trang.nr).length;
    const foljer = rader.every(r => !r.syn || r.syn.folk === r.tal.folk);
    const tak = rader.every(r => r.tal.mat <= SIM.forradTak(r));
    return [
      [`en liten by växer mot sin bärkraft (4 → ${liten.tal.folk}, bärkraften ${Math.round(bk(liten))})`, liten.tal.folk > 8 && liten.tal.folk < bk(liten) * 1.5],
      [`en trång by utan mat svälter (${Math.round(bk(trang) * 3)} → ${trangMin}, Svält ${svalt} gånger i världens krönika)`, trangMin < bk(trang) * 2 && svalt > 0],
      ['talen är alltid hela och aldrig under noll', hela],
      ['maten ryms i förrådet', tak],
      ['levande läge och ikappräkning ger samma rader', lika],
      ['grannbyns folk följer raden', foljer],
      ['huvudbyns rad rör reglerna inte', JSON.stringify(huvud.tal) === huvudFore],
    ];
  },
};

SCENARIER.radrikedom = {
  text: 'Rikedom och styrka i raden (steg 11.3.3, rad.ts): rikedomen går mot teknikernas mål och sjunker i nöd, och styrkan går mot folket gånger andelen som kan slåss, mer med vapen och sköld och aldrig fler än folket',
  kor: () => {
    const s = SIM.createState(6, Date.UTC(2026, 0, 1)), vl = s.varld!, v = SIM.varldMark(s)!;
    const [fattig, rustad, nod] = vl.rader!.filter(r => SIM.lever(vl, r));
    for (const r of [fattig, rustad]) { r.tal.folk = Math.round(SIM.barkraft(v, r) * 0.8); r.tal.mat = SIM.forradTak(r); r.tal.rikedom = 0; r.tal.styrka = 0; }
    rustad.tek = ['timmervagg', 'skold', 'flintspjut'];
    nod.tal.folk = Math.round(SIM.barkraft(v, nod) * 3); nod.tal.mat = 0; nod.tal.rikedom = Math.round(SIM.rikMal(nod)); const fore = nod.tal.rikedom;
    const tid = (dygn: number, fn?: () => void) => { for (let h = 0; h < dygn * 24; h++) { s.now += 3600e3; SIM.varldSteg(s); fn?.(); } };
    let aldrigFler = true;
    tid(4, () => { for (const r of vl.rader!) if (r.tal.styrka > r.tal.folk) aldrigFler = false; });
    const nara = (r: SIM.VarldRad) => Math.abs(r.tal.rikedom - SIM.rikMal(r)) <= SIM.rikMal(r) * 0.2;
    const st = (r: SIM.VarldRad) => Math.abs(r.tal.styrka - SIM.styrkaMal(r)) <= 2;
    const hela = vl.rader!.every(r => Number.isInteger(r.tal.rikedom) && Number.isInteger(r.tal.styrka));
    const foljer = [fattig, rustad, nod].every(r => !r.syn || (r.syn.styrka === r.tal.styrka && r.syn.resurser === r.tal.rikedom));
    return [
      [`rikedomen går mot målet på några dygn (${fattig.tal.rikedom} av ${Math.round(SIM.rikMal(fattig))})`, nara(fattig)],
      [`hus och redskap sätter ett högre mål per person (${Math.round(SIM.rikMal(rustad) / rustad.tal.folk)} mot ${Math.round(SIM.rikMal(fattig) / fattig.tal.folk)})`, SIM.rikMal(rustad) / rustad.tal.folk > SIM.rikMal(fattig) / fattig.tal.folk && nara(rustad)],
      [`i nöd sjunker rikedomen (${fore} → ${nod.tal.rikedom})`, nod.tal.rikedom < fore / 2],
      [`styrkan går mot folket gånger andelen som kan slåss (${fattig.tal.styrka} av ${fattig.tal.folk}), mer med vapen och sköld (${rustad.tal.styrka} av ${rustad.tal.folk}; byarna kommer på tekniker under tiden)`, st(fattig) && st(rustad) && SIM.styrkaMal({ ...fattig, tal: { ...fattig.tal, folk: 20 }, tek: ['skold', 'flintspjut'] }) > SIM.styrkaMal({ ...fattig, tal: { ...fattig.tal, folk: 20 }, tek: [] })],
      ['styrkan är aldrig fler än folket, och talen är hela', aldrigFler && hela],
      ['grannbyns styrka och resurser följer raden', foljer],
    ];
  },
};

SCENARIER.byrelation = {
  text: 'Relationen mellan två byar (steg 11.3.4, byrel.ts): ett tal åt varje håll för par som mött varandra, grundläget ur tro och släktband, glömskan mot grundläget och registret BYHANDELSER',
  kor: () => {
    const s = SIM.createState(6, Date.UTC(2026, 0, 1)), vl = s.varld!;
    const [a, b, c] = vl.rader!.filter(r => SIM.lever(vl, r));
    const fore = SIM.relation(vl, a.nr, b.nr);
    a.tro = { namn: 'Solens väg', andel: 80, krig: 50 }; b.tro = { namn: 'Solens väg', andel: 60, krig: 20 }; c.tro = { namn: 'Bergets folk', andel: 70, krig: 90 };
    const samma = SIM.grundlage(vl, a.nr, b.nr), annan = SIM.grundlage(vl, c.nr, a.nr), annanA = SIM.grundlage(vl, a.nr, c.nr);
    const utanBand = SIM.grundlage(vl, a.nr, c.nr);
    SIM.nyttSlaktband(vl, a.nr, c.nr, 2);
    const medBand = SIM.grundlage(vl, a.nr, c.nr);
    SIM.mots(vl, a.nr, b.nr);
    const motts = SIM.relation(vl, a.nr, b.nr) === samma && SIM.relation(vl, b.nr, a.nr) === SIM.grundlage(vl, b.nr, a.nr);
    SIM.byHandelse(vl, 'gava', a.nr, b.nr, 3); // a ger b en gåva: b ser vänligare på a
    const gava = SIM.relation(vl, b.nr, a.nr)! - SIM.grundlage(vl, b.nr, a.nr), andraHallet = SIM.relation(vl, a.nr, b.nr) === samma;
    SIM.byHandelse(vl, 'plundring', c.nr, b.nr);
    const plund = SIM.relation(vl, b.nr, c.nr)!;
    SIM.byHandelse(vl, 'muta', a.nr, c.nr);
    const muta = (vl.mutor?.[`${c.nr}>${a.nr}`] ?? 0) === SIM.BYREL.muta;
    const k = a.syn!, i0 = k.inst;
    SIM.klanHandelse(vl, k, 'handel');
    const huvud = k.inst === i0 + SIM.BYREL.handel && SIM.relation(vl, a.nr, vl.huvud!) === k.inst;
    const b0 = SIM.relation(vl, b.nr, c.nr)!;
    let hela = true;
    for (let h = 0; h < 30 * 24; h++) { s.now += 3600e3; SIM.varldSteg(s); for (const v of Object.values(vl.rel ?? {})) if (!Number.isInteger(v) || v < -100 || v > 100) hela = false; }
    const glomt = SIM.relation(vl, b.nr, c.nr)!, mal = SIM.grundlage(vl, b.nr, c.nr);
    return [
      [`två byar som inte mött varandra har inget tal (${fore})`, fore === undefined],
      [`samma tro ger ett vänligt grundläge (${samma}), en annan tro ett ovänligt, mer för den krigiska (${annan} mot ${annanA})`, samma > 0 && annan < annanA && annanA < 0],
      [`släktband höjer grundläget (${utanBand} → ${medBand})`, medBand > utanBand],
      ['när byarna möts börjar talet åt båda hållen i grundläget', motts],
      [`en gåva gör mottagaren vänligare (+${gava}) och ändrar inte givarens syn`, gava === 3 * SIM.BYREL.gava && andraHallet],
      [`plundringen gör offret ovänligt (${plund})`, plund < SIM.grundlage(vl, b.nr, c.nr) - 10],
      ['mutan går till ledaren och sparas för sig', muta],
      ['huvudbyns förbindelse bär byns syn på huvudbyn', huvud],
      [`talet glöms mot grundläget (${b0} → ${glomt}, grundläget ${mal}), i hela tal mellan −100 och 100`, Math.abs(glomt - mal) < Math.abs(b0 - mal) / 2 && hela],
    ];
  },
};

SCENARIER.byflytt = {
  text: 'Flytten mellan byarna (steg 11.3.5, byflytt.ts): de som lämnar en trång eller hungrig by väljer bland byarna inom räckhåll efter trängsel, avstånd och relation, kommer fram efter restiden i hela tal, och till huvudbyn kommer de som främlingar',
  kor: () => {
    const s = SIM.createState(6, Date.UTC(2026, 0, 1)), vl = s.varld!, v = SIM.varldMark(s)!;
    const levande = vl.rader!.filter(r => SIM.lever(vl, r));
    // den trängsta byn: dubbelt så många som marken föder och ingen mat
    const tr = levande.find(r => SIM.flyttMal(vl, v, r).length >= 2 && r.syn)!;
    tr.tal.folk = Math.round(SIM.barkraft(v, tr) * 2); tr.tal.mat = 0;
    const mal = SIM.flyttMal(vl, v, tr), huvudMal = mal.some(m => m.r.nr === vl.huvud);
    const annan = mal.find(m => m.r.nr !== vl.huvud)!, vanlig = annan.vikt;
    SIM.mots(vl, tr.nr, annan.r.nr); vl.rel![`${tr.nr}>${annan.r.nr}`] = -80;
    const ovan = SIM.flyttMal(vl, v, tr).find(m => m.r.nr === annan.r.nr)?.vikt ?? 0;
    delete vl.rel![`${tr.nr}>${annan.r.nr}`]; delete vl.rel![`${annan.r.nr}>${tr.nr}`];
    const summa = () => vl.rader!.reduce((a, r) => a + (r.nr === vl.huvud ? 0 : r.tal.folk), 0) + (vl.ko ?? []).filter(p => p.typ === 'flytt').reduce((a, p) => a + p.data!.n, 0) + (vl.tillHuvud?.length ?? 0);
    const per = SIM.flyttPerDygn(tr), stor = levande.find(r => r !== tr)!, perStor = SIM.flyttPerDygn({ ...stor, tal: { ...stor.tal, folk: 12, mat: 1000 } });
    // bara flytten: maten och folket står still
    const fore = summa(), folk0 = tr.tal.folk, utan = vl.rader!.filter(r => r !== tr && r.nr !== vl.huvud).map(r => r.tal.folk);
    let ut = 0, hela = true, framlingar = 0;
    for (let n = 0; n < 72; n++) {
      const f = tr.tal.folk; SIM.radFlytt(s, vl, tr, 1000 + n); ut += f - tr.tal.folk;
      hela &&= Number.isInteger(tr.tal.folk) && tr.tal.folk >= 0;
    }
    const iKo = (vl.ko ?? []).filter(p => p.typ === 'flytt').length, mitt = summa();
    // tiden går tills alla kommit fram
    for (const p of [...vl.ko ?? []].filter(q => q.typ === 'flytt')) { vl.ko = vl.ko!.filter(q => q !== p); SIM.KOHANDELSER.flytt(s, vl, p); }
    framlingar = vl.tillHuvud?.length ?? 0;
    const efter = summa(), fram = vl.rader!.filter(r => r !== tr && r.nr !== vl.huvud).reduce((a, r, i) => a + r.tal.folk - utan[i], 0);
    const band = mal.some(m => SIM.slaktband(vl, tr.nr, m.r.nr) > (tr.fran === m.r.nr || m.r.fran === tr.nr ? SIM.BYREL.moderby : 0));
    // främlingarna kommer in i huvudbyn, och den som visas bort går hem igen
    const t0 = tr.tal.folk, gaster0 = s.people.filter(p => p.gast?.sort === 'framling').length;
    vl.tillHuvud = [tr.nr, tr.nr]; SIM.regulate(s, 1);
    const gaster = s.people.filter(p => p.gast?.sort === 'framling' && p.gast.hemRad === tr.nr);
    const g = gaster[0]; if (g) { g.gast!.ja = false; SIM.framlingBeslut(s, g); }
    return [
      [`en trång och hungrig by vill flytta mer (${per.toFixed(2)} per dygn) än en mätt och liten (${perStor.toFixed(2)})`, per > perStor * 3],
      [`byarna inom räckhåll (${mal.length}), huvudbyn är en av dem`, mal.length >= 2 && huvudMal],
      [`en by man inte tycker om väger mindre (${ovan.toFixed(2)} mot ${vanlig.toFixed(2)})`, ovan < vanlig / 2],
      [`på tre dygn flyttade ${ut} av ${folk0}, i ${iKo} grupper, i hela tal`, ut > 0 && iKo > 0 && hela],
      [`ingen försvinner på vägen (${fore} = ${mitt} = ${efter})`, fore === mitt && mitt === efter],
      [`de kom fram: ${fram} till byarna i världen och ${framlingar} till huvudbyn`, fram + framlingar === ut],
      ['varje flytt är ett släktband mellan byarna', band],
      [`till huvudbyn kommer de som främlingar (${gaster.length} av 2, ${gaster0} före), och den som visas bort går hem igen (${t0} → ${tr.tal.folk})`, gaster.length === 2 && tr.tal.folk === t0 + 1],
    ];
  },
};

SCENARIER.giftermal = {
  text: 'Giftermål med grannarna (steg 11.3.6, giftermal.ts): den som inte finner någon i byn kan gifta sig med någon i en vänlig grannby, och en av de två flyttar; radens folk ändras lika mycket, och släktbandet höjer relationen mellan byarna. De som flyttar ur byn går till en by i världen (steg 11.3.5)',
  kor: () => {
    const s = SIM.createState(6, Date.UTC(2026, 0, 1)), vl = s.varld!;
    const folk = SIM.living(s);
    // en vänlig grannby
    const k = SIM.klanerOf(s).find(c => c.rad !== undefined)!, r = vl.rader!.find(x => x.nr === k.rad)!;
    k.inst = 40; r.tal.folk = 20;
    const kan = SIM.giftBar(s).includes(k);
    k.inst = 0; const ovanlig = !SIM.giftBar(s).includes(k); k.inst = 40;
    // en ensam vuxen utan någon i byn: alla andra har en partner
    const p = folk.find(q => SIM.ageOf(q, s.now) >= 18)!;
    for (const q of folk) if (q !== p && q.partner === undefined) q.partner = -1;
    p.partner = undefined;
    const ensam = SIM.utanNagon(s).includes(p);
    const g0 = SIM.grundlage(vl, r.nr, vl.huvud!), f0 = r.tal.folk, pop0 = SIM.living(s).length;
    const q = SIM.giftermal(s, p, k, false)!;
    const in1 = !!q && q.partner === p.id && p.partner === q.id && r.tal.folk === f0 - 1 && SIM.living(s).length === pop0 + 1 && q.fran === k.id;
    const g1 = SIM.grundlage(vl, r.nr, vl.huvud!);
    // en annan ensam flyttar dit
    const p2 = SIM.living(s).find(x => x !== p && x !== q && SIM.ageOf(x, s.now) >= 18)!;
    p2.partner = undefined;
    const pop1 = SIM.living(s).length, barn = SIM.living(s).filter(c => SIM.isParent(p2, c) && SIM.ageOf(c, s.now) < SIM.ALDER.vuxen).length;
    SIM.giftermal(s, p2, k, true);
    const ut = p2.left !== undefined && r.tal.folk === f0 - 1 + 1 + barn && SIM.living(s).length === pop1 - 1 - barn;
    const g2 = SIM.grundlage(vl, r.nr, vl.huvud!);
    // det händer av sig självt: en ensam utan någon i byn och en vänlig grannby, många dygn
    const t = SIM.createState(6, Date.UTC(2026, 0, 1)), tk = SIM.klanerOf(t).find(c => c.rad !== undefined)!;
    tk.inst = 60; t.varld!.rader!.find(x => x.nr === tk.rad)!.tal.folk = 30;
    const tp = SIM.living(t).find(x => SIM.ageOf(x, t.now) >= 18)!;
    for (const x of SIM.living(t)) if (x !== tp) x.partner = -1;
    tp.partner = undefined;
    for (let h = 0; h < 40 * 24 && tp.partner === undefined && tp.left === undefined; h++) { t.now += 3600e3; SIM.giftSteg(t, 3600); }
    const sjalv = tp.partner !== undefined || tp.left !== undefined;
    // utflytten ur huvudbyn går till en by i världen
    const fran = () => (vl.ko ?? []).filter(x => x.typ === 'flytt' && x.data!.fran === vl.huvud && x.data!.n === 2).length, ko0 = fran();
    SIM.radKrok.utflytt(s, 2);
    const utflytt = fran() === ko0 + 1;
    return [
      ['en vänlig grannby går att gifta sig in i, en neutral inte', kan && ovanlig],
      ['den som inte finner någon i byn kan gifta sig utanför den', ensam],
      [`den nya kommer till byn och blir hens partner, och grannbyn har en färre (${f0} → ${f0 - 1})`, in1],
      [`bybon flyttar dit med sina barn (${barn}), och grannbyn får lika många`, ut],
      [`släktbanden höjer grundläget för relationen (${g0} → ${g1} → ${g2})`, g1 > g0 && g2 > g1],
      ['det händer av sig självt inom 40 dygn (40 år i spelet)', sjalv],
      ['de som flyttar ur byn går till en by i världen', utflytt],
    ];
  },
};

SCENARIER.nyby = {
  text: 'Nya byar (steg 11.3.7, byflytt.ts): en grupp som lämnar kan grunda en by på en ledig plats, oftare en stor grupp ur en stor by, och den nya byn minns sin moderby och kan en del av dess tekniker',
  kor: () => {
    const s = SIM.createState(6, Date.UTC(2026, 0, 1)), vl = s.varld!, v = SIM.varldMark(s)!;
    const r = vl.rader!.find(x => SIM.lever(vl, x))!;
    r.tal.folk = 40; r.tal.mat = 400;
    r.tek = ['flinta', 'flintyxa', 'fiskespjut', 'eldborr', 'korg', 'rep'].filter(id => SIM.TEK[id]);
    const liten = SIM.nyChans({ ...r, tal: { ...r.tal, folk: 8 } }, 1), stor = SIM.nyChans(r, 4);
    const n0 = vl.rader!.length, k0 = (vl.kronika ?? []).length, mat0 = r.tal.mat;
    r.tal.folk -= 4;
    const ny = SIM.nyBy(s, vl, r, 4, s.now)!;
    const plats = vl.platser!.find(p => p.by === ny?.nr);
    const tekOk = !!ny && ny.tek.every(id => r.tek.includes(id) && (SIM.TEK[id]?.krav ?? []).every(k => ny.tek.includes(k)));
    const dagar = plats && SIM.flyttMal(vl, v, r).find(m => m.r.nr === ny.nr);
    const krona = (vl.kronika ?? []).slice(k0).some(h => h.k === 'delad' && h.by === r.nr && h.mot === ny.nr);
    // av sig självt: en stor och trång by (som inte svälter) i 20 dygn
    const t = SIM.createState(11, Date.UTC(2026, 0, 1)), tv = t.varld!, tr = tv.rader!.find(x => SIM.lever(tv, x))!;
    tr.tal.folk = 60; tr.tal.mat = 10000;
    const tn0 = tv.rader!.length;
    for (let n = 0; n < 20 * 24; n++) SIM.radFlytt(t, tv, tr, 5000 + n);
    const nya = tv.rader!.filter(x => x.fran === tr.nr);
    return [
      [`en stor grupp ur en stor by grundar oftare en egen by (${stor.toFixed(2)} mot ${liten.toFixed(2)})`, stor > liten * 4],
      [`gruppen fick en plats och en rad (${n0} → ${vl.rader!.length} rader), med 4 personer`, !!ny && !!plats && vl.rader!.length === n0 + 1 && ny.tal.folk === 4],
      [`den nya byn minns sin moderby och de två är släkt (${SIM.slaktband(vl, ny.nr, r.nr)} band)`, ny.fran === r.nr && SIM.slaktband(vl, ny.nr, r.nr) > 0],
      [`den kan en del av moderbyns tekniker (${ny.tek.length} av ${r.tek.length}), och bara det vars krav den kan`, tekOk && ny.tek.length < r.tek.length + 1],
      [`den tog sin del av maten (${mat0} → ${r.tal.mat} + ${ny.tal.mat})`, r.tal.mat + ny.tal.mat === mat0 && ny.tal.mat > 0],
      ['den ligger inom räckhåll och moderbyn kan flytta dit', !!dagar],
      ['världens krönika: Delad', krona],
      [`av sig själv: en stor och trång by delas på 20 dygn (${tn0} → ${tv.rader!.length} rader, ${nya.length} nya ur den)`, nya.length >= 1],
    ];
  },
};

SCENARIER.undergang = {
  text: 'Undergången (steg 11.3.8, byflytt.ts): en by utan folk blir en ruin med det som fanns kvar i hela saker och får en rad i världens krönika; huvudbyn förlorar förbindelsen',
  kor: () => {
    const s = SIM.createState(6, Date.UTC(2026, 0, 1)), vl = s.varld!;
    const r = vl.rader!.find(x => SIM.lever(vl, x) && x.syn)!, annan = vl.rader!.find(x => SIM.lever(vl, x) && x !== r)!;
    r.tek = ['korg', 'yxa', 'rep', 'kniv'].filter(id => SIM.SAKER[id]); r.tal.rikedom = 600; r.tal.silver = 7; r.tal.mat = 50;
    const kl0 = SIM.klanerOf(s).length, k0 = (vl.kronika ?? []).length;
    r.tal.folk = 0;
    s.now += 3600e3; SIM.varldSteg(s);
    const plats = vl.platser!.find(p => p.by === r.nr);
    const kvar = r.kvar ?? {}, hela = Object.values(kvar).every(n => Number.isInteger(n) && n > 0);
    const saker = Object.keys(kvar).filter(k => k !== 'silver');
    const krona = (vl.kronika ?? []).slice(k0).some(h => h.k === 'gattUnder' && h.by === r.nr);
    const borta = SIM.klanerOf(s).length === kl0 - 1 && !SIM.klanerOf(s).includes(r.syn!);
    // ingen flyttar till en ruin, och den som var på väg dit går hem igen
    const hem0 = annan.tal.folk;
    SIM.KOHANDELSER.flytt(s, vl, { t: s.now, nr: 0, typ: 'flytt', sak: r.nr, data: { fran: annan.nr, n: 2 } });
    const tillRuin = SIM.flyttMal(vl, SIM.varldMark(s), annan).some(m => m.r.nr === r.nr);
    return [
      [`byn är en ruin, raden och platsen (${r.sort}, ${plats?.k})`, r.sort === 'ruin' && plats?.k === 'ruin' && !SIM.lever(vl, r)],
      [`det som fanns kvar är hela saker: ${Object.entries(kvar).map(([k, n]) => `${n} ${k}`).join(', ')}`, hela && kvar.silver === 7 && saker.length > 0 && saker.every(k => r.tek.includes(k))],
      ['maten har ruttnat och talen är noll', r.tal.mat === 0 && r.tal.rikedom === 0],
      ['världens krönika: Gått under', krona],
      ['huvudbyn förlorar förbindelsen med byn', borta],
      [`ingen flyttar dit, och de som var på väg går hem igen (${hem0} → ${annan.tal.folk})`, !tillRuin && annan.tal.folk === hem0 + 2],
    ];
  },
};

SCENARIER.radkunskap = {
  text: 'Kunskapen i raden (steg 11.3.9, rad.ts): nya tekniker efter nivåns mål, spridning vid vänlig kontakt och tekniker som tappas när för få kan dem',
  kor: () => {
    const s = SIM.createState(6, Date.UTC(2026, 0, 1)), vl = s.varld!;
    const [a, b] = vl.rader!.filter(r => SIM.lever(vl, r) && SIM.grannRader(vl, r, SIM.RAD.kontaktDygn).length);
    const m = SIM.grannRader(vl, a, SIM.RAD.kontaktDygn).find(x => x.nr !== vl.huvud && SIM.lever(vl, x))!;
    // stor och liten by, 20 dygn från ingenting
    const kor20 = (folk: number) => { const r = { ...a, tal: { ...a.tal, folk }, tek: [] as string[] }; for (let n = 0; n < 20; n++) SIM.radKunskap(vl, r, n); return r.tek; };
    const stor = kor20(20), liten = kor20(3);
    const ordning = stor.every(id => SIM.TEK[id].krav.every(k => stor.includes(k)));
    const niva1 = stor.filter(id => SIM.TEK[id].niva === 1).length, hogre = stor.filter(id => SIM.TEK[id].niva >= 3).length;
    // spridning: en teknik som grannen kan, med och utan vänskap
    const x = SIM.TEKNIK.find(t => t.niva === 4 && t.krav.length)!;
    const grund = (id: string): string[] => [...SIM.TEK[id].krav.flatMap(grund), id];
    const krav = [...new Set(x.krav.flatMap(grund))];
    m.tek = [...new Set([...krav, x.id])];
    const forsok = (rel: number) => { SIM.mots(vl, a.nr, m.nr); vl.rel![`${a.nr}>${m.nr}`] = rel; let ja = 0; for (let n = 0; n < 300; n++) { const r = { ...a, tal: { ...a.tal, folk: 20 }, tek: [...krav] }; SIM.radKunskap(vl, r, 100 + n); if (r.tek.includes(x.id)) ja++; } return ja; };
    const vanlig = forsok(40), ovanlig = forsok(-40);
    // tappa: en liten by tappar det som inget bygger på, aldrig det som något annat bygger på
    const t = { ...b, tal: { ...b.tal, folk: 2 }, tek: [...krav] };
    let aldrigBas = true, tappade = 0;
    for (let n = 0; n < 60; n++) {
      const fore = [...t.tek]; SIM.radKunskap(vl, t, 1000 + n);
      const bort = fore.filter(id => !t.tek.includes(id)); tappade += bort.length;
      if (bort.some(id => fore.some(o => SIM.TEK[o].krav.includes(id)))) aldrigBas = false;
    }
    // av sig själv: världen i tio dygn
    const fore = vl.rader!.filter(r => SIM.lever(vl, r)).reduce((n, r) => n + r.tek.length, 0);
    for (let h = 0; h < 10 * 24; h++) { s.now += 3600e3; SIM.varldSteg(s); }
    const efter = vl.rader!.filter(r => SIM.lever(vl, r)).reduce((n, r) => n + r.tek.length, 0);
    const hela = vl.rader!.every(r => r.tek.every(id => SIM.TEK[id].krav.every(k => r.tek.includes(k))));
    return [
      [`en by kommer på tekniker efter nivåns mål: på 20 dygn ${stor.length} (${niva1} på nivå 1, ${hogre} på nivå 3 eller högre)`, niva1 >= 3 && stor.length > niva1 && ordning],
      [`en liten by kommer på färre (${liten.length} mot ${stor.length})`, liten.length < stor.length],
      [`en vänlig granne sprider tekniken ${x.namn} (${vanlig} av 300 dygn mot ${ovanlig} utan vänskap)`, vanlig > ovanlig * 1.5 && vanlig > 30],
      [`en liten by tappar tekniker (${tappade} gånger på 60 dygn) men aldrig det som något annat bygger på`, tappade > 0 && aldrigBas],
      [`världen på tio dygn: ${fore} → ${efter} tekniker, och varje by kan kraven för det den kan`, efter > fore && hela],
    ];
  },
};

SCENARIER.radledare = {
  text: 'Ledaren och de fasta personerna (steg 11.3.10, radperson.ts): ledaren med en bybos egenskaper ur sin nyckel, bytet vid en känd tid och mutorna som förlorar hälften av sin verkan',
  kor: () => {
    const s = SIM.createState(6, Date.UTC(2026, 0, 1)), vl = s.varld!;
    // samma nyckel ger samma person
    const a = SIM.fastUr(12345, s.now, 'ledare'), b = SIM.fastUr(12345, s.now, 'ledare'), c = SIM.fastUr(54321, s.now, 'ledare');
    const lika = JSON.stringify([a, SIM.fastEgenskaper(a)]) === JSON.stringify([b, SIM.fastEgenskaper(b)]);
    const olika = JSON.stringify([a, SIM.fastEgenskaper(a)]) !== JSON.stringify([c, SIM.fastEgenskaper(c)]);
    const eg = SIM.fastEgenskaper(a)!, egOk = SIM.STATS.every(k => eg[k] >= 1 && eg[k] <= 20);
    // hur gamla ledarna blir: 400 nycklar
    const aldrar = Array.from({ length: 400 }, (_, i) => { const f = SIM.fastUr(i * 7919 + 1, 0, 'ledare'); return (f.dor! - f.fodd) / SIM.DAY; }).sort((x, y) => x - y);
    const median = aldrar[200];
    // världen: varje by med en ledare får en efter en timme, den första är hövdingen huvudbyn känner
    s.now += 3600e3; SIM.varldSteg(s);
    const med = vl.rader!.filter(r => SIM.lever(vl, r) && SIM.BYSORTER[r.sort].ledare);
    const alla = med.every(r => SIM.radLedare(r)?.roll === 'ledare');
    const r = med.find(x => x.syn)!, l0 = SIM.radLedare(r)!;
    const hovding = r.syn!.personer.find(q => q.roll === 'hovding');
    // en muta före bytet
    SIM.byHandelse(vl, 'muta', vl.huvud!, r.nr, 4);
    const muta = vl.mutor![`${r.nr}>${vl.huvud}`], inst0 = r.syn!.inst;
    // hållningen direkt: bytet tar bort hälften av mutan
    const kopia = structuredClone({ rader: vl.rader, mutor: vl.mutor, huvud: vl.huvud }) as typeof vl, kr = kopia.rader!.find(x => x.nr === r.nr)!;
    SIM.ledarBytet(kopia, r.nr);
    const instDirekt = kr.syn!.inst;
    // ledaren dör vid sin tid
    const k0 = (vl.kronika ?? []).length;
    s.now = l0.dor! + 1; r.tal.folk = Math.max(r.tal.folk, 10);
    SIM.varldSteg(s);
    const l1 = SIM.radLedare(r);
    const krona = (vl.kronika ?? []).slice(k0).some(h => h.k === 'nyLedare' && h.by === r.nr);
    const nyH = r.syn!.personer.filter(q => q.roll === 'hovding');
    return [
      ['samma nyckel ger samma person, en annan nyckel en annan', lika && olika],
      [`egenskaperna är en bybos (1–20): ${SIM.STATS.slice(0, 4).map(k => `${k} ${Math.round(eg[k])}`).join(', ')} …`, egOk],
      [`ledarna blir som byborna gamla: median ${Math.round(median)} år (fjärdedelarna ${Math.round(aldrar[100])}–${Math.round(aldrar[300])})`, median > 50 && median < 90 && aldrar[0] >= SIM.RADPERSON.ledareFran],
      [`varje by som ska ha en ledare har en efter en timme (${med.length} byar), och den första är hövdingen huvudbyn känner (${l0.namn})`, alla && !!hovding && hovding.namn === l0.namn],
      [`ledaren byts när hen dör (${l0.namn} → ${l1?.namn}), vid den kända tiden, och världens krönika får Ny ledare`, !!l1 && l1.nyckel !== l0.nyckel && l1.fodd < s.now && krona && r.fasta.length === 1],
      [`den nya ledaren är hövding i huvudbyns förbindelse (${nyH.map(q => q.namn).join(', ')})`, nyH.length === 1 && nyH[0].namn === l1?.namn],
      [`mutan förlorar hälften av sin verkan (${muta} → ${vl.mutor?.[`${r.nr}>${vl.huvud}`] ?? 0}, hållningen ${inst0} → ${instDirekt})`, (vl.mutor?.[`${r.nr}>${vl.huvud}`] ?? 0) === muta - Math.trunc(muta / 2) && instDirekt === inst0 - Math.trunc(muta / 2)],
    ];
  },
};

SCENARIER.radtro = {
  text: 'Tron i raden (steg 11.3.11, rad.ts): en by får en tro, andelen troende växer och en vänlig grannes tro sprids',
  kor: () => {
    const s = SIM.createState(6, Date.UTC(2026, 0, 1)), vl = s.varld!;
    const a = vl.rader!.find(r => SIM.lever(vl, r) && SIM.grannRader(vl, r, SIM.RAD.kontaktDygn).some(m => m.nr !== vl.huvud && SIM.lever(vl, m)))!;
    const m = SIM.grannRader(vl, a, SIM.RAD.kontaktDygn).find(x => x.nr !== vl.huvud && SIM.lever(vl, x))!;
    for (const r of vl.rader!) if (r.nr !== vl.huvud) delete r.tro;
    SIM.mots(vl, a.nr, m.nr);
    const rel = (v: number) => { vl.rel![`${a.nr}>${m.nr}`] = v; };
    // utan vänner: byn får en egen tro, och andelen växer
    rel(-40);
    const egen = { ...a, tro: undefined as SIM.RadTro | undefined };
    let dygnTill = -1;
    for (let n = 0; n < 40; n++) { SIM.radTro(vl, egen, n); if (egen.tro && dygnTill < 0) dygnTill = n + 1; }
    // spridning: grannen har en tro, med och utan vänskap
    m.tro = { namn: 'Grannens tro', andel: 40, krig: 80 };
    const forsok = (v: number) => { rel(v); let ja = 0; for (let n = 0; n < 300; n++) { const r = { ...a, tro: undefined as SIM.RadTro | undefined }; SIM.radTro(vl, r, 500 + n); if (r.tro?.namn === 'Grannens tro') ja++; } return ja; };
    const vanlig = forsok(40), ovanlig = forsok(-40);
    // en by med en egen tro får grannens som sin andra tro; den växer med kontakten och dör ut utan
    rel(40);
    const b = { ...a, tro: { namn: 'Byns tro', andel: 30, krig: 20 } as SIM.RadTro };
    let n = 1000; while (!b.tro.annan && n < 1300) SIM.radTro(vl, b, n++);
    const fick = b.tro.annan?.namn === 'Grannens tro';
    for (let i = 0; i < 10; i++) SIM.radTro(vl, b, n++);
    const vaxte = b.tro.annan?.andel ?? 0;
    rel(-40);
    for (let i = 0; i < 40 && b.tro.annan; i++) SIM.radTro(vl, b, n++);
    const doog = !b.tro.annan;
    // byter plats när den andra tron blir större
    const c = { ...a, tro: { namn: 'Byns tro', andel: 10, krig: 20, annan: { namn: 'Grannens tro', andel: 30, krig: 80 } } as SIM.RadTro };
    rel(40); SIM.radTro(vl, c, 2000);
    // av sig själv: världen i 20 dygn
    for (const r of vl.rader!) if (r.nr !== vl.huvud) delete r.tro;
    for (let h = 0; h < 20 * 24; h++) { s.now += 3600e3; SIM.varldSteg(s); }
    const levande = vl.rader!.filter(r => SIM.lever(vl, r)), medTro = levande.filter(r => r.tro);
    const hela = levande.every(r => !r.tro || (Number.isInteger(r.tro.andel) && r.tro.andel >= 0 && r.tro.andel <= 100 && (!r.tro.annan || r.tro.annan.andel <= r.tro.andel)));
    const namn = medTro.map(r => r.tro!.namn), krigiskt = levande.every(r => !r.tro || !r.syn || r.syn.krigisk === r.tro.krig);
    return [
      [`en by utan vänner får en egen tro (efter ${dygnTill} dygn, ${egen.tro?.namn}) och andelen växer (${egen.tro?.andel} %)`, dygnTill > 0 && !!egen.tro && egen.tro.namn !== 'Grannens tro' && egen.tro.andel >= SIM.RAD.troMal - 3],
      [`en vänlig grannes tro sprids (${vanlig} av 300 dygn mot ${ovanlig} utan vänskap)`, vanlig > 30 && ovanlig === 0],
      [`en by med en egen tro får grannens som sin andra tro, som växer med kontakten (${vaxte} %) och dör ut utan`, fick && vaxte > SIM.RAD.troStart && doog],
      [`blir den andra tron större byter de plats (${c.tro!.namn} ${c.tro!.andel} %, ${c.tro!.annan?.namn} ${c.tro!.annan?.andel} %)`, c.tro!.namn === 'Grannens tro' && c.tro!.annan?.namn === 'Byns tro'],
      [`världen på 20 dygn: ${medTro.length} av ${levande.length} byar har en tro (${[...new Set(namn)].join(', ')}), andelarna är hela procent och grannbyns krigiskhet följer tron`, medTro.length >= levande.length / 2 && hela && krigiskt],
    ];
  },
};

SCENARIER.splittring = {
  text: 'Splittringen (steg 11.3.12, byflytt.ts): andelen i byn med en annan tro än byns höjer chansen att en grupp bryter upp, och den nya byn får den andra tron',
  kor: () => {
    const s = SIM.createState(6, Date.UTC(2026, 0, 1)), vl = s.varld!;
    const r = vl.rader!.find(x => SIM.lever(vl, x))!;
    r.tal.folk = 20; r.tal.mat = 400;
    r.tro = { namn: 'Byns tro', andel: 40, krig: 20 };
    const utan = SIM.nyChans(r, 2);
    r.tro.annan = { namn: 'Den andra tron', andel: 30, krig: 90 };
    const med = SIM.nyChans(r, 2);
    // en grupp på fyra bryter upp: de med den andra tron går med
    r.tal.folk -= 4;
    const ny = SIM.nyBy(s, vl, r, 4, s.now)!;
    const kvar = r.tro.annan?.andel ?? 0, mor = r.tro.namn;
    // utan en annan tro tar gruppen med sig byns
    const b = vl.rader!.find(x => SIM.lever(vl, x) && x !== r && x !== ny && x.nr !== vl.huvud)!;
    b.tal.folk = 20; b.tal.mat = 400; b.tro = { namn: 'Bs tro', andel: 30, krig: 50 };
    b.tal.folk -= 3;
    const ny2 = SIM.nyBy(s, vl, b, 3, s.now);
    // av sig själv: samma stora och trånga by med och utan en stor andra tro, 20 dygn
    const delningar = (annan: boolean) => {
      const t = SIM.createState(11, Date.UTC(2026, 0, 1)), tv = t.varld!, tr = tv.rader!.find(x => SIM.lever(tv, x))!;
      tr.tro = { namn: 'Byns tro', andel: 35, krig: 20 };
      for (let n = 0; n < 20 * 24; n++) {
        tr.tal.folk = 60; tr.tal.mat = 10000; // byn hålls stor och trång
        if (annan) tr.tro.annan = { namn: 'Den andra tron', andel: 35, krig: 90 };
        SIM.radFlytt(t, tv, tr, 5000 + n);
      }
      const nya = tv.rader!.filter(x => x.fran === tr.nr);
      return { n: nya.length, andra: nya.filter(x => x.tro?.namn === 'Den andra tron').length };
    };
    const u = delningar(false), m = delningar(true);
    return [
      [`chansen att bryta upp växer med andelen med en annan tro (${utan.toFixed(3)} → ${med.toFixed(3)})`, med > utan * 1.5],
      [`den nya byn får den andra tron (${ny?.tro?.namn} ${ny?.tro?.andel} %), och moderbyn behåller sin (${mor}, den andra tron ${kvar} % kvar)`, ny?.tro?.namn === 'Den andra tron' && ny.tro.andel === 100 && mor === 'Byns tro' && kvar < 30],
      [`utan en annan tro tar gruppen med sig byns (${ny2?.tro?.namn})`, ny2?.tro?.namn === 'Bs tro'],
      [`av sig själv på 20 dygn: ${u.n} nya byar utan en annan tro, ${m.n} med (${m.andra} med den andra tron; de lediga platserna sätter gränsen)`, m.n >= u.n && m.andra > 0 && u.n > 0],
    ];
  },
};

SCENARIER.forhistoria = {
  text: 'Förhistorien (steg 11.3.13, forhistoria.ts): världen har levt FORHIST.ar år när huvudbyn grundas, med byar som vuxit, delats och gått under efter radens regler, en krönika och grannbyar som lever',
  env: { BALANS: 'karta.bredd=120,karta.hojd=120,start.klader=0,forhist.ar=100' },
  kor: () => {
    const s = SIM.createState(7, Date.UTC(2026, 0, 1)), vl = s.varld!;
    const fore = (vl.kronika ?? []).filter(h => h.t < s.founded), antal = (k: string) => fore.filter(h => h.k === k).length;
    const levande = vl.rader!.filter(r => SIM.lever(vl, r)), ruiner = vl.rader!.filter(r => r.nr !== vl.huvud && !SIM.lever(vl, r));
    // en gammal by kan mindre än en yngre: kunskapen följer slumpen, inte bara åldern
    const gamla = [...levande].sort((a, b) => a.grundad - b.grundad);
    const omvant = gamla.some((a, i) => gamla.slice(i + 1).some(b => b.grundad > a.grundad && b.tek.length > a.tek.length));
    const klaner = SIM.klanerOf(s), radAv = (k: SIM.Klan) => vl.rader!.find(r => r.nr === k.rad);
    const levandeKlaner = klaner.length > 0 && klaner.every(k => { const r = radAv(k); return !!r && SIM.lever(vl, r) && k.namn === r.namn; });
    // samma frö ger samma förhistoria
    const t = SIM.createState(7, Date.UTC(2026, 0, 1)), lika = JSON.stringify(t.varld!.rader) === JSON.stringify(vl.rader) && JSON.stringify(t.varld!.kronika) === JSON.stringify(vl.kronika);
    return [
      [`världen började ${SIM.FORHIST.ar} år före grundandet (${Math.round((s.founded - (vl.borjan ?? s.founded)) / SIM.DAY)} år)`, vl.borjan !== undefined && Math.round((s.founded - vl.borjan) / SIM.DAY) === SIM.FORHIST.ar],
      [`vid grundandet finns ${levande.length} byar och ${ruiner.length} ruiner, och krönikan har ${fore.length} händelser (grundad ${antal('grundad')}, delad ${antal('delad')}, gått under ${antal('gattUnder')})`, levande.length > 0 && ruiner.length > 0 && antal('delad') > 0 && antal('gattUnder') > 0],
      [`en gammal by kan mindre än en yngre (${gamla.length} byar med ${Math.min(...levande.map(r => r.tek.length))}–${Math.max(...levande.map(r => r.tek.length))} tekniker)`, omvant],
      [`huvudbyn har förbindelse med ${klaner.length} grannbyar, alla levande byar ur raden`, levandeKlaner],
      ['samma frö ger samma förhistoria', lika],
    ];
  },
};

SCENARIER.radvakt = {
  text: 'Vakten för raden (steg 11.3.14, radVakt i rad.ts): det stora testet larmar om ett tal i en rad som inte är helt, en by som växer utan gräns eller för många byar som gått under; en värld efter förhistorien är tyst',
  env: { BALANS: 'karta.bredd=120,karta.hojd=120,start.klader=0,forhist.ar=400' },
  kor: () => {
    const s = SIM.createState(5, Date.UTC(2026, 0, 1)), vl = s.varld!;
    const tyst = SIM.radVakt(s);
    for (let h = 0; h < 10 * 24; h++) { s.now += 3600e3; SIM.varldSteg(s); }
    const tystSen = SIM.radVakt(s);
    const larmar = (andra: (t: SIM.State) => void) => { const t = SIM.cloneState(s); andra(t); return SIM.radVakt(t).map(f => f[0]); };
    const by = (t: SIM.State) => t.varld!.rader!.find(r => SIM.lever(t.varld!, r))!;
    const decimal = larmar(t => { by(t).tal.mat += 0.5; });
    const stor = larmar(t => { by(t).tal.folk = 5000; });
    const ruiner = larmar(t => { for (const r of t.varld!.rader!) if (SIM.lever(t.varld!, r)) { r.sort = 'ruin'; r.tal.folk = 0; } });
    const byar = vl.rader!.filter(r => SIM.lever(vl, r)).length, ruin = vl.rader!.filter(r => r.sort === 'ruin').length;
    return [
      [`en värld efter förhistorien (${byar} byar, ${ruin} ruiner) är tyst, också efter tio dygn${tyst.length || tystSen.length ? `: ${[...tyst, ...tystSen].map(f => f[1]).join('; ')}` : ''}`, !tyst.length && !tystSen.length],
      [`ett tal som inte är helt larmar (${decimal.join(', ')})`, decimal.includes('radens tal')],
      [`en by som växer utan gräns larmar (${stor.join(', ')})`, stor.includes('raden växer utan gräns')],
      [`för många byar som gått under larmar (${ruiner.join(', ')})`, ruiner.includes('raderna dör ut')],
    ];
  },
};

SCENARIER.ort = {
  text: 'Platsen i minnet (steg 11.4.1, ort.ts): en plats i världen är en lärdom av slaget ort med nivåerna rykte, känt och besökt; en högre nivå ersätter en lägre, att höra om platsen igen stärker minnet, och en person minns högst ORT.max platser utöver de andra lärdomarna',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!, p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= 18)!;
    const andra = () => (p.lardomar ?? []).filter(l => l.k !== 'ort').length, andraFore = andra();
    const pl = vl.platser!.filter(q => q.by !== vl.huvud).slice(0, SIM.ORT.max + 2);
    const a = pl[0]!.nr;
    SIM.larOrt(s, p, a, SIM.O_RYKTE, 0.4, { src: 999, fr: 999 });
    const rykte = SIM.ortNiva(p, a) === SIM.O_RYKTE && SIM.findL(p, 'ort', a)?.fr === 999;
    SIM.larOrt(s, p, a, SIM.O_KANT, 0.3);
    const kant = SIM.ortNiva(p, a) === SIM.O_KANT && SIM.findL(p, 'ort', a)!.c >= 0.4 && SIM.findL(p, 'ort', a)?.fr === undefined;
    const c0 = SIM.findL(p, 'ort', a)!.c;
    SIM.larOrt(s, p, a, SIM.O_RYKTE, 0.2);
    const starkt = SIM.ortNiva(p, a) === SIM.O_KANT && SIM.findL(p, 'ort', a)!.c > c0;
    // fler platser än taket: de minst säkra trängs undan
    pl.slice(1).forEach((q, i) => SIM.larOrt(s, p, q.nr, SIM.O_BESOKT, 0.5 + i * 0.01));
    const orter = p.lardomar!.filter(l => l.k === 'ort');
    const minst = orter.every(l => l.a !== pl[1]!.nr && l.a !== a) || orter.every(l => l.a !== pl[1]!.nr && l.a !== pl[2]!.nr);
    const d = SIM.describe(s, orter.find(l => l.v === SIM.O_BESOKT)!);
    return [
      [`ett rykte är en lärdom av slaget ort med den som först berättade`, rykte],
      ['en högre nivå ersätter en lägre och tar bort ryktets förskjutning', kant],
      ['att höra om platsen igen på en lägre nivå sänker inte nivån men stärker minnet', starkt],
      [`högst ${SIM.ORT.max} platser (${orter.length}), och de minst säkra trängs undan`, orter.length === SIM.ORT.max && minst],
      [`de andra lärdomarna är kvar (${andra()} av ${andraFore})`, andra() === andraFore],
      [`lärdomen i ord: "${d.what}", ${d.src}`, d.what.includes(vl.platser!.find(q => q.nr === orter.find(l => l.v === SIM.O_BESOKT)!.a)!.namn) && d.src === 'egen resa'],
    ];
  },
};

SCENARIER.naromrade = {
  text: 'Närområdet (steg 11.4.2, ort.ts): platserna utan folk inom ORT.narDygn dygns gång är kända för var och en i byn utan att sparas, byns egen plats är besökt, en ny by känner inga andra byar, och den första handlaren gör sin hemby känd för den som pratar eller handlar med hen',
  kor: () => {
    const s = SIM.createState(6, Date.UTC(2026, 0, 1)), vl = s.varld!, hem = SIM.byPlats(vl, vl.huvud!)!;
    const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= 18)!;
    const avst = (q: SIM.VarldPlats) => Math.hypot(q.x - hem.x, q.y - hem.y) / SIM.VARLD.gangPerDygn;
    const natur = vl.platser!.filter(q => !(SIM.LANDMARKEN[q.k] as SIM.LandmarkDef).folk);
    const nara = natur.filter(q => avst(q) <= SIM.ORT.narDygn), langt = natur.filter(q => avst(q) > SIM.ORT.narDygn);
    const byar = vl.platser!.filter(q => q.k === 'by' && q !== hem);
    const sparat = (p.lardomar ?? []).filter(l => l.k === 'ort').length;
    const ingaByar = byar.every(q => SIM.living(s).every(b => SIM.kannerOrt(s, b, q.nr) === undefined));
    // handlaren kommer: den som pratar eller handlar med hen känner sedan hens hemby
    s.delning = { andel: 0 }; Object.assign(s.fire, { lit: true, fuel: 4, ring: true }); SIM.setAmount(s, 'ved', 40); s.nastaHandlare = s.now;
    for (let i = 0; i < 3000 && !(s.handlare && (s.handlare.fas === 'vantar' || s.handlare.fas === 'handlar')); i++) SIM.step(s, SIM.BEAT);
    const h = s.handlare, hemOrt = h && SIM.gastHemOrt(s, SIM.hp(s, h));
    const vuxna = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= 18);
    for (let i = 0; h && i < 20 && hemOrt !== undefined && !SIM.living(s).some(b => SIM.ortNiva(b, hemOrt) !== undefined); i++) {
      const a = vuxna[i % vuxna.length]!, g = SIM.hp(s, h);
      a.x = g.x + 1; a.y = g.y + 1; a.task = { act: 'samtal', phase: 'do', tx: a.x, ty: a.y, until: s.now + SIM.HOUR, carry: 0, dark: false, why: '' } as SIM.Task;
      SIM.pratMedHandlare(s, SIM.HANDEL.pratSek * 2);
    }
    const kanner = hemOrt === undefined ? [] : SIM.living(s).filter(b => SIM.ortNiva(b, hemOrt!) === SIM.O_KANT);
    return [
      [`byns egen plats är besökt`, SIM.kannerOrt(s, p, hem.nr) === SIM.O_BESOKT],
      [`platserna utan folk i närområdet är kända (${nara.length}) utan att sparas (${sparat} lärdomar)`, nara.every(q => SIM.kannerOrt(s, p, q.nr) === SIM.O_KANT) && sparat === 0],
      [`platserna längre bort är okända (${langt.length})`, langt.length > 0 && langt.every(q => SIM.kannerOrt(s, p, q.nr) === undefined)],
      [`en ny by känner ingen av de ${byar.length} andra byarna`, byar.length > 0 && ingaByar],
      [`handlaren kommer från en by i världen`, hemOrt !== undefined],
      [`den som pratat eller handlat med handlaren känner hens hemby (${kanner.map(b => b.name).join(', ')})`, kanner.length > 0],
    ];
  },
};

SCENARIER.ortblekna = {
  text: 'Platserna bleknar (steg 11.4.3, ortBleknar i ort.ts): minnet av en plats i världen sjunker per tid, långsammare ju högre nivån är, en nivå i taget, och dör med personen',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!, folk = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= 18), p = folk[0]!, q = folk[1]!;
    const [a, b, c] = vl.platser!.filter(x => x.by !== vl.huvud).map(x => x.nr);
    for (const x of [p, q]) { SIM.larOrt(s, x, a!, SIM.O_RYKTE, 1); SIM.larOrt(s, x, b!, SIM.O_KANT, 1); SIM.larOrt(s, x, c!, SIM.O_BESOKT, 1); }
    // timme för timme: när varje plats första gången sjunker en nivå eller glöms
    const forst: Record<number, number> = {}, niva0 = { [a!]: SIM.O_RYKTE, [b!]: SIM.O_KANT, [c!]: SIM.O_BESOKT };
    let hopp = false, sedan: number[] = [];
    for (let h = 24; h <= 24 * 3000 && Object.keys(forst).length < 3; h += 24) {
      SIM.forget(s, 24); // ett dygn i taget (glömskan är densamma i en timme i taget)
      for (const nr of [a!, b!, c!]) {
        const v = SIM.ortNiva(p, nr);
        if (forst[nr] === undefined && v !== niva0[nr]) { forst[nr] = h; if (v !== undefined && v !== niva0[nr]! - 1) hopp = true; if (nr === c) sedan = [v ?? -1]; }
      }
      if (h === 24) { s.now += SIM.HOUR; SIM.die(s, q, 'kyla'); }
    }
    const qKvar = (q.lardomar ?? []).some(l => l.k === 'ort');
    const kvot = forst[c!]! / forst[a!]!;
    return [
      [`ett rykte bleknar först (${Math.round(forst[a!]! / 24)} dygn), sedan en känd plats (${Math.round(forst[b!]! / 24)}) och sist en besökt (${Math.round(forst[c!]! / 24)})`, forst[a!]! < forst[b!]! && forst[b!]! < forst[c!]!],
      [`en besökt plats bleknar ${kvot.toFixed(1)} gånger så långsamt som ett rykte (${SIM.ORT.glomBesokt / SIM.ORT.glomRykte})`, Math.abs(kvot / (SIM.ORT.glomBesokt / SIM.ORT.glomRykte) - 1) < 0.05],
      [`en nivå i taget: den besökta platsen blev känd (${sedan[0]})`, !hopp && sedan[0] === SIM.O_KANT],
      ['ett rykte som bleknat är glömt', SIM.ortNiva(p, a!) === undefined],
      ['platserna dör med personen', !qKvar],
    ];
  },
};

SCENARIER.fjarran = {
  text: 'Platserna sprids i samtal (steg 11.4.4, berattaOrt i ort.ts): ämnet Fjärran platser i AMNEN, och ett led i berättandet tar bort en nivå: den som besökt en plats berättar, lyssnaren känner den, och nästa lyssnare har ett rykte med den som först berättade det',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!, [a, b, c] = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= 18);
    const nr = vl.platser!.find(x => x.k === 'by' && x.by !== vl.huvud)!.nr;
    SIM.larOrt(s, a!, nr, SIM.O_BESOKT, 1);
    SIM.samtalBorjar();
    SIM.berattaOrt(s, a!, b!, SIM.findL(a!, 'ort', nr)!, SIM.getRel(s, a!, b!));
    const amne = SIM.samtalAmne(s, a!, b!, 'prat');
    const lb = SIM.findL(b!, 'ort', nr);
    SIM.berattaOrt(s, b!, c!, lb!, SIM.getRel(s, b!, c!));
    const lc = SIM.findL(c!, 'ort', nr);
    SIM.berattaOrt(s, c!, a!, lc!, SIM.getRel(s, c!, a!)); // tillbaka till den som var där: hen har kvar sin nivå
    // i vanliga samtal (share i minne.ts): den som varit där berättar om platsen bland det andra hen vet
    const s2 = SIM.cloneState(testBy(3)), [resenar, ...andra] = SIM.living(s2).filter(q => SIM.ageOf(q, s2.now) >= 18);
    SIM.larOrt(s2, resenar!, nr, SIM.O_BESOKT, 1);
    for (let i = 0; i < 400; i++) { const q = andra[i % andra.length]!; SIM.share(s2, resenar!, q, SIM.getRel(s2, resenar!, q), SIM.SAMTALSSLAG['berättelse']); }
    const vet = andra.filter(q => SIM.ortNiva(q, nr) === SIM.O_KANT).length;
    return [
      [`samtalets ämne är Fjärran platser (${amne.k}: ${amne.o})`, amne.k === 'fjarran' && SIM.AMNEN.fjarran.namn === 'Fjärran platser'],
      [`den som hör det av den som varit där känner platsen, ett led bort (${lb?.v}, led ${lb?.led})`, lb?.v === SIM.O_KANT && lb.src === a!.id && lb.led === 1],
      [`nästa lyssnare har ett rykte, med den som först berättade det som rykte (${lc?.v}, led ${lc?.led})`, lc?.v === SIM.O_RYKTE && lc.fr === b!.id && lc.led === 2],
      ['den som varit där har kvar sin nivå', SIM.ortNiva(a!, nr) === SIM.O_BESOKT],
      [`i samtalen sprids platsen bland det andra man vet (${vet} av ${andra.length} känner den efter 400 berättelser)`, vet > 0],
    ];
  },
};

SCENARIER.ryktlage = {
  text: 'Ryktets läge (steg 11.4.5, ryktesLage i ort.ts): ett rykte är ett område med en radie och en förskjuten mitt, så att platsen alltid ligger inom området men inte i mitten; mitten räknas ur världens frö, platsen och den som först berättade',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!, p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= 18)!;
    const pl = vl.platser!.filter(x => x.by !== vl.huvud).slice(0, 20);
    let inom = 0, inteMitt = 0, n = 0, olika = 0;
    for (const q of pl) for (const fr of [3, 17, 41]) {
      const l = { k: 'ort', a: q.nr, v: SIM.O_RYKTE, c: 1, t: s.now, fr } as SIM.Lardom, o = SIM.ryktesLage(s, l)!, d = Math.hypot(q.x + 0.5 - o.x, q.y + 0.5 - o.y);
      n++; if (d < o.r) inom++; if (d >= SIM.ORT.ryktFran * o.r - 1e-9) inteMitt++;
      const o2 = SIM.ryktesLage(s, { ...l, fr: fr + 1 })!;
      if (Math.hypot(o2.x - o.x, o2.y - o.y) > 0.1) olika++;
    }
    const l = SIM.larOrt(s, p, pl[0]!.nr, SIM.O_RYKTE, 0.5, { fr: 5 }), a = SIM.ryktesLage(s, l)!, b = SIM.ryktesLage(s, { ...l })!;
    return [
      [`radien är en halv dags gång (${SIM.ryktesLage(s, l)!.r} världsrutor)`, a.r === SIM.ORT.ryktRadie * SIM.VARLD.gangPerDygn],
      [`platsen ligger alltid inom området (${inom} av ${n})`, inom === n],
      [`och aldrig i mitten (${inteMitt} av ${n})`, inteMitt === n],
      [`en annan första berättare ger en annan mitt (${olika} av ${n})`, olika > n * 0.9],
      ['samma rykte ligger på samma ställe', a.x === b.x && a.y === b.y],
    ];
  },
};

SCENARIER.bynvet = {
  text: 'Det byn vet (steg 11.4.6, raknaBynVet i ort.ts): sammanställningen av minnena hos dem som är hemma, med den högsta nivån, den senaste tiden och vilka som vet; räknad en gång i timmen och genast vid avfärd, hemkomst och dödsfall, med en rad i krönikan när en plats försvinner ur byns kunskap',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!, [a, b] = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= 18);
    const pl = vl.platser!.filter(x => x.by !== vl.huvud && !SIM.iNaromradet(s, x.nr)), nr = pl[0]!.nr, nr2 = pl[1]!.nr;
    SIM.larOrt(s, a!, nr, SIM.O_BESOKT, 1); SIM.larOrt(s, b!, nr, SIM.O_RYKTE, 1);
    SIM.raknaBynVet(s);
    const forst = SIM.bynKanner(s, nr);
    SIM.gaBort(s, a!);
    const ute = SIM.bynKanner(s, nr);
    SIM.kommHem(s, a!, a!.x, a!.y);
    const hem = SIM.bynKanner(s, nr);
    // a är ensam om nr2; när a dör försvinner platsen ur byns kunskap
    SIM.larOrt(s, a!, nr2, SIM.O_KANT, 1);
    const fore = SIM.bynKanner(s, nr2);
    SIM.larOrt(s, b!, pl[2]!.nr, SIM.O_KANT, 1);
    for (let i = 0; i < 4000 && !SIM.bynKanner(s, pl[2]!.nr); i++) SIM.step(s, SIM.BEAT);
    const timme = SIM.bynKanner(s, pl[2]!.nr);
    const n = (s.hist?.kronika ?? []).length;
    SIM.die(s, a!, 'kyla');
    const efter = SIM.bynKanner(s, nr2), rad = (s.hist?.kronika ?? []).slice(n).find(k => k[2] === 'forlust' && String(k[1]).includes('minns längre'));
    const hemma = SIM.bynKanner(s, vl.platser!.find(x => x.by === vl.huvud)!.nr), nara = vl.platser!.find(x => SIM.iNaromradet(s, x.nr) && x.by !== vl.huvud);
    return [
      [`den högsta nivån och vilka som vet (${forst?.v}, ${forst?.vem.length} vet)`, forst?.v === SIM.O_BESOKT && forst.vem.length === 2],
      [`den som är ute räknas inte (${ute?.v}, ${ute?.vem.length})`, ute?.v === SIM.O_RYKTE && ute.vem.length === 1],
      [`hemkomsten räknas genast (${hem?.v})`, hem?.v === SIM.O_BESOKT],
      [`en gång i timmen kommer nya minnen med (${!!timme})`, !!timme && !fore],
      [`när den enda som vet dör försvinner platsen, med en rad i krönikan ("${rad?.[1]}")`, !efter && !!rad],
      ['byns egen plats är besökt', hemma?.v === SIM.O_BESOKT],
      ['närområdet är känt', !nara || (SIM.bynKanner(s, nara.nr)?.v ?? -1) >= SIM.O_KANT],
    ];
  },
};

SCENARIER.kartlager = {
  text: 'Två lager på världskartan (steg 11.4.7, bynsKarta i ort.ts och ritaVarld i ui/varldbild.ts): det byn känner ritas tydligt, ryktena som grå områden och resten blekt, och en hemlig plats syns först när byn har ett rykte om den',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!, v = SIM.varldMark(s)!, K = VB.VK, [a, b] = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= 18);
    const langt = vl.platser!.filter(x => x.by !== vl.huvud && !SIM.iNaromradet(s, x.nr) && !(SIM.LANDMARKEN[x.k] as SIM.LandmarkDef).folk), kand = langt[0]!, rykt = langt.find(x => Math.hypot(x.x - kand.x, x.y - kand.y) > 4)!;
    SIM.larOrt(s, a!, kand.nr, SIM.O_KANT, 1); SIM.larOrt(s, b!, rykt.nr, SIM.O_RYKTE, 1, { fr: b!.id });
    // en hemlig plats långt borta
    const hx = rykt.x, hy = rykt.y, gom = { ...kand, nr: 99999, k: 'gomma' as const, namn: 'Gömman' }; // på den kända platsens ruta, långt från närområdet
    vl.platser!.push(gom);
    SIM.raknaBynVet(s);
    const kn = SIM.bynsKarta(s)!, hb = vl.platser!.find(x => x.by === vl.huvud)!;
    const kSet = new Set(vl.platser!.filter(x => (kn.niva(x.nr) ?? -1) >= SIM.O_KANT).map(x => x.y * v.w + x.x));
    const lag = (x: number, y: number) => VB.lager(kn, kSet, v.w, x, y);
    const o = kn.rykten.find(r => r.nr === rykt.nr);
    // ritat: en blek ruta har det ljusa mönstret, en känd ruta inte
    const bild = VB.ritaVarld(vl, v, kn), utan = VB.ritaVarld(vl, v);
    const px = (bb: typeof bild, x: number, y: number) => { const i = (y * bb.w + x) * 4; return `${bb.data[i]},${bb.data[i + 1]},${bb.data[i + 2]}`; };
    const hex = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',');
    let blek = -1, bx = 0, by = 0;
    for (let y = 0; y < v.h && blek < 0; y++) for (let x = 0; x < v.w; x++) if (lag(x, y) === 'blek' && !vl.platser!.some(q => q.x === x && q.y === y)) { blek = 1; bx = x; by = y; break; }
    const gomSynsFore = !VB.rutaText(vl, v, gom.x, gom.y, kn).includes('Gömma') && !SIM.syns(kn, gom); // kn frågar byn när den används
    SIM.larOrt(s, b!, gom.nr, SIM.O_RYKTE, 1, { fr: b!.id }); SIM.raknaBynVet(s);
    const kn2 = SIM.bynsKarta(s)!;
    return [
      [`närområdet och den kända platsen är tydliga (${lag(hb.x, hb.y)}, ${lag(kand.x, kand.y)})`, lag(hb.x, hb.y) === 'kant' && lag(kand.x, kand.y) === 'kant'],
      [`ryktet är ett grått område runt platsen (${o ? 'finns' : 'saknas'}, ${lag(Math.floor(o?.x ?? 0), Math.floor(o?.y ?? 0))})`, !!o && lag(Math.floor(o.x), Math.floor(o.y)) === 'rykte' && Math.hypot(hx + 0.5 - o.x, hy + 0.5 - o.y) < o.r],
      [`resten är blekt, med det ljusa mönstret (${px(bild, bx * K, by * K)})`, blek > 0 && px(bild, bx * K, by * K) === hex(VB.BLEKFARG) && px(utan, bx * K, by * K) !== hex(VB.BLEKFARG)],
      [`den kända platsens ruta ritas som förut`, px(bild, kand.x * K + 1, kand.y * K) === px(utan, kand.x * K + 1, kand.y * K)],
      [`en hemlig plats syns inte förrän byn har ett rykte om den `, gomSynsFore && SIM.syns(kn2, gom)],
      ['utan byns kunskap syns allt (som förut)', SIM.syns(undefined, gom)],
    ];
  },
};

SCENARIER.byhistorik = {
  text: 'Byarnas historik (steg 11.4.8, sparaHistorik och radVid i ort.ts): varje by sparar sina tal glest, en bild var femte dygn, de senaste tätt och äldre glesare, inom en gräns för storleken; det man tror om en by är bilden vid uppgiftens tid',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!;
    const r = vl.rader!.find(x => SIM.lever(vl, x))!;
    delete r.hist;
    const t0 = r.t, folk: number[] = [];
    // byn går 200 dygn: talen ändras varje dygn och historiken sparas varje timme
    for (let d = 0; d < 200; d++) for (let h = 0; h < 24; h++) {
      r.t = t0 + (d * 24 + h) * SIM.HOUR; r.tal.folk = 20 + d; if (h === 0) folk.push(r.tal.folk);
      SIM.sparaHistorik(s);
    }
    const h = r.hist!, luckor = h.slice(1).map((b, i) => (b.t - h[i]!.t) / SIM.DAY);
    const nya = luckor.slice(-3), gamla = luckor.slice(0, 3);
    const mitt = h[Math.floor(h.length / 2)]!, vid = SIM.radVid(r, mitt.t + SIM.DAY);
    const ruin = vl.rader!.find(x => x !== r && SIM.lever(vl, x))!; delete ruin.hist;
    ruin.t = t0; SIM.sparaHistorik(s); ruin.tal.folk = 0; ruin.t = t0 + 10 * SIM.DAY; SIM.sparaHistorik(s); ruin.t = t0 + 20 * SIM.DAY; SIM.sparaHistorik(s);
    return [
      [`högst ${SIM.ORT.histMax} bilder (${h.length})`, h.length === SIM.ORT.histMax],
      [`den första och den senaste finns kvar (${Math.round((h[0]!.t - t0) / SIM.DAY)} och ${Math.round((h[h.length - 1]!.t - t0) / SIM.DAY)} dygn)`, h[0]!.t === t0 && h[h.length - 1]!.t >= t0 + 195 * SIM.DAY],
      [`bilderna ligger på femte dygnen efter den första (${luckor.slice(1).join('/')})`, luckor.slice(1).every(x => Math.abs(x / 5 - Math.round(x / 5)) < 1e-6)],
      [`de senaste tätt och äldre glesare (${nya.join('/')} dygn mot ${gamla.join('/')})`, Math.max(...nya) < Math.min(...gamla)],
      [`det man tror är byns tal vid uppgiftens tid (${vid?.tal.folk} = ${mitt.tal.folk})`, vid?.tal.folk === mitt.tal.folk],
      [`en uppgift äldre än alla bilder ger den första`, SIM.radVid(r, t0 - SIM.DAY) === h[0]],
      [`en by som gått under sparas som borta och ändras inte mer (${ruin.hist!.length} bilder)`, ruin.hist!.length === 2 && !!ruin.hist![1]!.borta],
    ];
  },
};

SCENARIER.bynyhet = {
  text: 'Nyheterna (steg 11.4.9, trorOmBy och storForandring i ort.ts): det en person tror om en by är byns tal vid tiden för uppgiften, och nyare uppgifter där något stort ändrats (ny ledare, invånarna ändrade med mer än 30 %, svält, gått under) är en nyhet i två dygn som berättas hellre och förs vidare som en nyhet',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!, [a, b, c, d] = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= 18);
    const r = vl.rader!.find(x => SIM.lever(vl, x) && vl.platser!.some(q => q.by === x.nr))!, nr = vl.platser!.find(q => q.by === r.nr)!.nr;
    const t0 = s.now - 30 * SIM.DAY;
    r.hist = [{ t: t0, tal: { ...r.tal, folk: 20 }, led: 'Ulf' }, { t: t0 + 10 * SIM.DAY, tal: { ...r.tal, folk: 22 }, led: 'Ulf' }, { t: t0 + 20 * SIM.DAY, tal: { ...r.tal, folk: 22 }, led: 'Tora' }, { t: t0 + 25 * SIM.DAY, tal: { ...r.tal, folk: 40 }, led: 'Tora' }];
    const la = SIM.larOrt(s, a!, nr, SIM.O_KANT, 1, { t: t0 + SIM.HOUR }), tror = SIM.trorOmBy(s, la);
    SIM.larOrt(s, a!, nr, SIM.O_KANT, 1, { t: t0 + 11 * SIM.DAY }); const liten = SIM.nyhet(s, la); // 20 till 22: ingen nyhet
    SIM.larOrt(s, a!, nr, SIM.O_KANT, 1, { t: t0 + 21 * SIM.DAY }); const ledare = SIM.nyhet(s, la); // ny ledare
    const lb = SIM.larOrt(s, b!, nr, SIM.O_KANT, 1, { t: t0 + 11 * SIM.DAY });
    SIM.larOrt(s, b!, nr, SIM.O_KANT, 1, { t: t0 + 26 * SIM.DAY }); const folk = SIM.nyhet(s, lb), tror2 = SIM.trorOmBy(s, lb); // 22 till 40
    SIM.berattaOrt(s, b!, c!, lb, SIM.getRel(s, b!, c!)); const vidare = SIM.nyhet(s, SIM.findL(c!, 'ort', nr)!);
    const rykte = SIM.larOrt(s, d!, nr, SIM.O_RYKTE, 1);
    // vikten i samtalen: samma plats med och utan nyhet
    const vikt = (l: SIM.Lardom) => SIM.ORT.dela * (SIM.nyhet(s, l) ? SIM.ORT.nyVikt : 1);
    const vNy = vikt(lb);
    const s2 = s.now; s.now += 2 * SIM.DAY + SIM.HOUR; const sedan = SIM.nyhet(s, lb), vGammal = vikt(lb); s.now = s2;
    return [
      [`man tror byns tal vid uppgiftens tid (${tror?.tal.folk} invånare, ${tror?.led})`, tror?.tal.folk === 20 && tror.led === 'Ulf'],
      ['en liten ändring är ingen nyhet', !liten],
      ['en ny ledare är en nyhet', ledare],
      [`invånarna ändrade med mer än 30 % är en nyhet (${tror2?.tal.folk})`, folk && tror2?.tal.folk === 40],
      ['nyheten förs vidare som en nyhet', vidare],
      [`en nyhet berättas hellre (${vNy} mot ${vGammal})`, vNy === SIM.ORT.nyVikt * vGammal],
      ['efter två dygn är den ingen nyhet längre', !sedan],
      ['ett rykte ger bara sorten och namnet', SIM.trorOmBy(s, rykte) === undefined],
    ];
  },
};

SCENARIER.radort = {
  text: 'Radens kunskap om platser (steg 11.4.10, radKanner i ort.ts): en by i världen känner byarna i sitt grannät, har rykten om grannarnas grannar och har besökt sin egen plats och det dess handlare besökt',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!;
    const r = vl.rader!.find(x => SIM.lever(vl, x) && (SIM.byPlats(vl, x.nr)?.grannar?.length ?? 0) > 1)!, egen = SIM.byPlats(vl, r.nr)!;
    const g = egen.grannar![0]!, gg = SIM.varldPlatsNr(vl, g.nr)!.grannar!.map(y => y.nr).find(n => n !== egen.nr && !egen.grannar!.some(x => x.nr === n));
    const langt = vl.platser!.find(q => q.nr !== egen.nr && !egen.grannar!.some(x => x.nr === q.nr) && !egen.grannar!.some(x => SIM.varldPlatsNr(vl, x.nr)?.grannar?.some(y => y.nr === q.nr)))!;
    const fore = SIM.radKanner(vl, r, langt.nr);
    SIM.radBesoker(vl, r.nr, langt.nr); SIM.radBesoker(vl, r.nr, langt.nr);
    // en handlare från en grannby besöker huvudbyn
    const s2 = SIM.cloneState(testBy(3)), vl2 = s2.varld!, hb = SIM.byPlats(vl2, vl2.huvud!)!;
    for (const x of vl2.rader!) delete x.besokt;
    SIM.skickaHandlare(s2);
    const kl = s2.handlare && SIM.klanById(s2, SIM.hp(s2, s2.handlare).gast!.klan!), hr = kl?.rad !== undefined ? SIM.radNr(vl2, kl.rad) : undefined;
    return [
      ['byns egen plats är besökt', SIM.radKanner(vl, r, egen.nr) === SIM.O_BESOKT],
      ['byarna i grannätet är kända', SIM.radKanner(vl, r, g.nr) === SIM.O_KANT],
      [`grannarnas grannar är rykten (${gg !== undefined ? 'finns' : 'ingen'})`, gg === undefined || SIM.radKanner(vl, r, gg) === SIM.O_RYKTE],
      [`en plats långt borta är okänd tills någon från byn besökt den (${fore} → ${SIM.radKanner(vl, r, langt.nr)})`, fore === undefined && SIM.radKanner(vl, r, langt.nr) === SIM.O_BESOKT && r.besokt!.length === 1],
      [`handlarens by har besökt huvudbyn (${hr?.namn})`, !!hr && SIM.radKanner(vl2, hr, hb.nr) === SIM.O_BESOKT && !!hr.besokt?.includes(hb.nr)],
    ];
  },
};

SCENARIER.gastort = {
  text: 'Gästernas platser (steg 11.4.11, gastensPlatser i ort.ts): handlare och andra besökare har sin hemby som besökt och känner det deras by känner, så att byn i samtalen hör om platser den inte sett',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!;
    SIM.skickaHandlare(s);
    const h = s.handlare && SIM.hp(s, s.handlare), kl = h && SIM.klanById(s, h.gast!.klan!), r = kl?.rad !== undefined ? SIM.radNr(vl, kl.rad) : undefined;
    const hem = r && SIM.byPlats(vl, r.nr), ortL = (h?.lardomar ?? []).filter(l => l.k === 'ort');
    const somByn = ortL.every(l => r && SIM.radKanner(vl, r, l.a) === l.v);
    // handlaren berättar för en bybo om en plats bybon inte känner
    const b = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= 18)!, ny = ortL.find(l => l.a !== hem?.nr && SIM.kannerOrt(s, b, l.a) === undefined);
    if (ny && h) SIM.berattaOrt(s, h, b, ny, SIM.getRel(s, h, b));
    const f = SIM.framling(s), fOrt = (f?.lardomar ?? []).filter(l => l.k === 'ort');
    return [
      [`handlaren har sin hemby som besökt (${r?.namn})`, !!hem && SIM.ortNiva(h!, hem.nr) === SIM.O_BESOKT],
      [`och känner det hens by känner (${ortL.length} platser, högst ${SIM.ORT.max})`, ortL.length > 1 && ortL.length <= SIM.ORT.max && somByn],
      ['uppgifterna är från i dag', ortL.every(l => l.t === s.now)],
      [`en bybo hör om en plats hen inte sett (${ny ? SIM.ortNiva(b, ny.a) : 'ingen'})`, !!ny && SIM.ortNiva(b, ny.a) !== undefined],
      [`en främling känner också sin bys platser (${fOrt.length})`, !f || fOrt.length > 0],
    ];
  },
};

SCENARIER.byruta = {
  text: 'Byns ruta på världskartan (steg 11.4.12, platsRuta i ort.ts och ui/varldskarta.ts): spalterna Byn tror (med året och varifrån) och Sant nu, vilka som känner platsen och varningen Bara en vet',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!, [a, b] = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= 18);
    const r = vl.rader!.find(x => SIM.lever(vl, x) && vl.platser!.some(q => q.by === x.nr && !SIM.iNaromradet(s, q.nr)))!, nr = vl.platser!.find(q => q.by === r.nr)!.nr;
    const t0 = s.now - 20 * SIM.DAY;
    r.hist = [{ t: t0, tal: { ...r.tal, folk: 11 }, led: 'Ulf' }];
    const okand = SIM.platsRuta(s, nr);
    SIM.larOrt(s, a!, nr, SIM.O_KANT, 1, { t: t0 + SIM.HOUR, src: b!.id }); SIM.raknaBynVet(s);
    const en = SIM.platsRuta(s, nr)!;
    SIM.larOrt(s, b!, nr, SIM.O_RYKTE, 1); SIM.raknaBynVet(s);
    const tva = SIM.platsRuta(s, nr)!;
    const folk = en.rader.find(d => d.namn === 'Invånare'), led = en.rader.find(d => d.namn === 'Ledare');
    const egen = SIM.platsRuta(s, vl.platser!.find(q => q.by === vl.huvud)!.nr)!;
    return [
      [`en okänd plats har ingen spalt Byn tror (${okand?.niva ?? 'okänd'})`, !!okand && !okand.niva && okand.rader.every(d => d.tror === undefined) && okand.rader.length > 0],
      [`Byn tror är byns tal vid uppgiftens tid, Sant nu är talen nu (${folk?.tror} mot ${folk?.sant})`, folk?.tror === '11' && folk.sant === String(r.tal.folk) && led?.tror === 'Ulf'],
      [`året och varifrån (år ${en.ar}, ${en.kalla})`, en.ar === SIM.yearNo(s, t0 + SIM.HOUR) && !!en.kalla?.includes(b!.name)],
      [`vilka som vet (${en.vem.join(', ')}) och Bara en vet`, en.vem.length === 1 && en.vem[0] === a!.name && en.baraEn],
      [`två som vet: ingen varning (${tva.vem.length})`, tva.vem.length === 2 && !tva.baraEn],
      ['byns egen plats har ingen jämförelse', egen.egen && !egen.rader.length],
    ];
  },
};

SCENARIER.hortkronika = {
  text: 'Det byn hört i världens krönika (steg 11.4.13, hortHandelse och nyheten i ort.ts): en händelse är hörd när byns uppgifter om platsen är nyare än händelsen, och en nyhet som når byn skrivs i byns krönika med vem som kom med den och ger en notis, en gång',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!, [a, b, c] = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= 18);
    const r = vl.rader!.find(x => SIM.lever(vl, x) && vl.platser!.some(q => q.by === x.nr && !SIM.iNaromradet(s, q.nr)))!, nr = vl.platser!.find(q => q.by === r.nr)!.nr;
    const t0 = s.now - 20 * SIM.DAY;
    r.hist = [{ t: t0, tal: { ...r.tal, folk: 10 }, led: 'Ulf' }, { t: t0 + 10 * SIM.DAY, tal: { ...r.tal, folk: 10 }, led: 'Tora' }];
    const h = SIM.varldHandelse(vl, 'nyLedare', t0 + 10 * SIM.DAY, { by: r.nr }), egen = SIM.varldHandelse(vl, 'svalt', t0, { by: vl.huvud });
    SIM.larOrt(s, a!, nr, SIM.O_KANT, 1, { t: t0 + SIM.HOUR }); SIM.raknaBynVet(s);
    const fore = SIM.hortHandelse(s, h);
    const n0 = (s.hist?.kronika ?? []).length, notis0 = (s.notiser?.lista ?? []).reduce((x, n) => x + (n.id === 'nyhet' ? n.n : 0), 0);
    SIM.larOrt(s, a!, nr, SIM.O_KANT, 1, { t: t0 + 11 * SIM.DAY, src: b!.id }); // b kommer hem med nyheten
    SIM.larOrt(s, c!, nr, SIM.O_KANT, 1, { t: t0 + 11 * SIM.DAY, src: b!.id }); // samma nyhet en gång till
    const rader = (s.hist?.kronika ?? []).slice(n0).filter(k => k[2] === 'nyhet'), notiser = (s.notiser?.lista ?? []).reduce((x, n) => x + (n.id === 'nyhet' ? n.n : 0), 0) - notis0;
    SIM.raknaBynVet(s);
    return [
      ['det som händer i byn själv har den hört', SIM.hortHandelse(s, egen)],
      ['en händelse efter byns uppgifter är inte hörd', !fore],
      ['med nyare uppgifter är den hörd', SIM.hortHandelse(s, h)],
      [`nyheten skrivs i byns krönika med vem som kom med den ("${rader[0]?.[1]}")`, rader.length === 1 && String(rader[0]![1]).includes(b!.name) && String(rader[0]![1]).includes('ny ledare')],
      [`och ger en notis, en gång (${notiser})`, notiser === 1],
    ];
  },
};
SCENARIER.leder = {
  text: 'Lederna (steg 11.5.1, leder.ts): många färder ger en stig som är billigare att gå och ritas på världskartan, vägarna genom den räknas om, och en led som ingen går växer igen',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!, v = SIM.varldMark(s)!;
    const hb = SIM.byPlats(vl, vl.huvud!)!, g = hb.grannar![0]!, gp = vl.platser!.find(q => q.nr === g.nr)!;
    const a = hb.y * v.w + hb.x, b = gp.y * v.w + gp.x;
    const vag = SIM.vagMellan(vl, v, a, b, 'fots', s.now)!, rutor = SIM.vagRutor(vag, v.w), k0 = vag.kostnad, ver0 = vl.ledVer ?? 0;
    const t0 = s.now;
    for (let n = 0; n < 15; n++) SIM.trampa(vl, rutor, SIM.sallskapTyngd(1), t0 + n * SIM.HOUR); // femton vandrare
    SIM.raknaLeder(vl, v, t0 + 15 * SIM.HOUR);
    const mitt = rutor[Math.floor(rutor.length / 2)]!, klass = SIM.ledKlass(vl, mitt);
    const bild = VB.ritaVarld(vl, v), mx = (mitt % v.w) * VB.VK + VB.VK / 2, my = Math.floor(mitt / v.w) * VB.VK + VB.VK / 2, pi = (my * bild.w + mx) * 4;
    const hex = '#' + [0, 1, 2].map(c => bild.data[pi + c]!.toString(16).padStart(2, '0')).join('');
    const k1 = vag.kostnad;
    SIM.raknaLeder(vl, v, t0 + 200 * SIM.DAY); // 200 dygn utan färder
    return [
      ['en människa, ett packdjur och en vagn trampar 1, 2 och 4', SIM.sallskapTyngd(1, 1, 1) === 7],
      [`femton färder ger en stig mitt på vägen (${klass})`, klass === 'stig'],
      [`stigen ritas på världskartan (${hex})`, hex === VB.LEDFARG.stig],
      [`vägen räknades om och blev billigare (${k0} → ${k1})`, k1 < k0 && (vl.ledVer ?? 0) > ver0],
      ['en stig som ingen går växer igen och glöms', SIM.ledKlass(vl, mitt) === 'obanad' && !vl.leder?.[mitt]],
      ['marken utan leder ritas som förut', SIM.ledFart(vl, mitt) === 1],
    ];
  },
};
SCENARIER.sallskap = {
  text: 'Sällskapet och registret RESMAL (steg 11.5.2, resa.ts): ett sällskap är en post i världen med ledare, medlemmar, djur, mål, skäl, skede och packning, ingen är med i två, och det sparas med världen',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!, [a, b] = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= 18);
    const hb = SIM.byPlats(vl, vl.huvud!)!, mal = hb.grannar![0]!.nr;
    const sl = SIM.nyttSallskap(s, a!, mal, 'handel')!, igen = SIM.nyttSallskap(s, a!, mal, 'se');
    const med = SIM.foljMed(vl, sl, b!), tva = SIM.foljMed(vl, sl, b!);
    SIM.djurMed(sl, 7);
    const kopia = JSON.parse(JSON.stringify(s)) as SIM.State, k = kopia.varld!.sallskap![0]!;
    return [
      ['varje skäl har namn och mål', SIM.RESMAL_IDS.every(id => SIM.RESMAL[id].namn && SIM.RESMAL[id].mal.length > 0)],
      [`sällskapet har ledare, mål, skäl och skedet samlas (${sl.skede})`, sl.ledare === a!.id && sl.mal === mal && sl.skal === 'handel' && sl.skede === 'samlas' && sl.by === vl.huvud],
      ['ledaren kan inte leda två sällskap', !igen],
      ['en till följer med, men bara en gång', med && !tva && sl.medl.length === 2],
      ['ett djur följer med', sl.djur.includes(7)],
      ['sällskapet sparas med världen', k.id === sl.id && k.medl.join() === sl.medl.join() && SIM.sallskapFor(kopia.varld, b!.id)?.id === sl.id],
      [`blocket RESA har tiden att samla (${SIM.RESA.samlaSek} s)`, SIM.RESA.samlaSek > 0],
    ];
  },
};
SCENARIER.packning = {
  text: 'Packningens behov (steg 11.5.3, packbehov i resa.ts): maten, vattnet och fodret räknas ur dygnen, resenärerna, djuren och ledarens marginal, med bärförmågan som tak; en försiktig ledare tar med mer än en slarvig, och allt är hela saker',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!, [a, b, c] = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= 18);
    const hb = SIM.byPlats(vl, vl.huvud!)!, mal = hb.grannar![0]!.nr;
    const sl = SIM.nyttSallskap(s, a!, mal, 'handel')!; SIM.foljMed(vl, sl, b!);
    const pot = { ...a!.pot };
    a!.pot.mod = 18; a!.pot.flit = 3; const slarv = SIM.packbehov(s, sl)!;
    a!.pot.mod = 3; a!.pot.flit = 18; const fors = SIM.packbehov(s, sl)!;
    a!.pot = pot;
    // med ett djur och mot den bortersta platsen
    const djur = SIM.tamdjurOf(s)[0];
    if (djur) SIM.djurMed(sl, djur.id);
    const med = SIM.packbehov(s, sl)!;
    const ensam = SIM.nyttSallskap(s, c!, mal, 'handel')!;
    let langt: SIM.Packbehov | undefined;
    for (const p of [...vl.platser!].filter(q => q.k === 'by' && q.by !== vl.huvud).sort((x, y) => Math.hypot(y.x - hb.x, y.y - hb.y) - Math.hypot(x.x - hb.x, x.y - hb.y)).slice(0, 8)) {
      ensam.mal = p.nr; const x = SIM.packbehov(s, ensam);
      if (x && (!langt || x.dygn > langt.dygn)) langt = x;
    }
    const hela = [slarv, fors, med, langt].every(x => !x || [x.mat, x.vatten, x.foder].every(Number.isInteger));
    return [
      [`ledarens marginal: slarvig ${SIM.marginal({ ...a!, pot: { ...pot, mod: 18, flit: 3 } } as SIM.Person).toFixed(2)}, försiktig ${SIM.marginal({ ...a!, pot: { ...pot, mod: 3, flit: 18 } } as SIM.Person).toFixed(2)}`, true],
      [`två resenärer i ${slarv.dygn} dygn: den försiktiga tar ${fors.mat} portioner, den slarviga ${slarv.mat}`, fors.mat > slarv.mat && slarv.mat >= Math.floor(2 * SIM.RESA.matPerDygn * slarv.dygn)],
      [`ett djur behöver foder där det inte kan beta (${med.foder} hö) och bär (${med.bar} mot ${fors.bar})`, !djur || med.bar >= fors.bar],
      [`allt är hela saker`, hela],
      [`taket: den ensamma på lång resa (${langt?.dygn} dygn) bär högst sin bärförmåga (${langt?.vikt} av ${langt?.bar})`, !!langt && langt.vikt <= langt.bar && (langt.ryms || langt.mat < Math.ceil(SIM.RESA.matPerDygn * langt.dygn))],
    ];
  },
};
SCENARIER.insatser = {
  text: 'Boken över insatserna (steg 11.5.4, satsa i resa.ts): vem som satsat vad i sällskapet (egna saker, byns förråd, en annans djur) i hela saker med värde, och ägaren behöver inte följa med',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!, [a, b, c] = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= 18);
    const hb = SIM.byPlats(vl, vl.huvud!)!, sl = SIM.nyttSallskap(s, a!, hb.grannar![0]!.nr, 'handel')!; SIM.foljMed(vl, sl, b!);
    const egen = SIM.satsa(sl, a!.id, 'skinn', 20), by = SIM.satsa(sl, 'by', 'brod', 24.7), igen = SIM.satsa(sl, a!.id, 'skinn', 5), noll = SIM.satsa(sl, 'by', 'brod', 0.4);
    // en annans häst: c följer inte med
    const hast: SIM.Tamdjur = { id: SIM.TAM_ID0 + 99999, art: 'hast', born: s.now - 5 * SIM.DAY, hunger: 0, agare: c!.id, x: 1, y: 1 };
    s.tamdjur!.push(hast);
    const dj = SIM.satsaDjur(s, sl, hast.id), dj2 = SIM.satsaDjur(s, sl, hast.id), per = SIM.insatsPer(sl);
    return [
      [`egna saker med värde (${egen?.n} skinn, ${egen?.varde})`, !!egen && egen.n === 25 && egen === igen && egen.varde === Math.round(25 * SIM.grundvarde('skinn'))],
      [`ur byns förråd i hela saker (${by?.n} bröd)`, by?.n === 24 && by.agare === 'by' && !noll],
      [`en annans häst, en gång (${dj?.varde})`, !!dj && !dj2 && dj.agare === c!.id && dj.varde === SIM.tamArt('hast').varde && sl.djur.includes(hast.id)],
      ['ägaren till hästen följer inte med', !sl.medl.includes(c!.id) && per.get(c!.id) === dj?.varde],
      ['sakerna ligger i den gemensamma packningen', sl.pack.skinn === 25 && sl.pack.brod === 24],
      ['allt i boken är hela saker', sl.insatser.every(x => Number.isInteger(x.n) && Number.isInteger(x.varde))],
    ];
  },
};
SCENARIER.packskede = {
  text: 'Packningsskedet i byn (steg 11.5.5, borjaPacka och resaSteg i resa.ts): maten tas ur förrådet i hela saker, varje resenär går till samlingsplatsen vid byns utkant, djuren lastas, och sällskapet går ut längs linjen mot rätt kant och lämnar kartan',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!, [a, b] = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= 18 && SIM.kanGa(q));
    const hb = SIM.byPlats(vl, vl.huvud!)!, mal = hb.grannar![0]!.nr;
    const sl = SIM.nyttSallskap(s, a!, mal, 'handel')!; SIM.foljMed(vl, sl, b!);
    const hast: SIM.Tamdjur = { id: SIM.TAM_ID0 + 99999, art: 'hast', born: s.now - 5 * SIM.DAY, hunger: 0, agare: a!.id, x: a!.x, y: a!.y };
    s.tamdjur!.push(hast); SIM.satsaDjur(s, sl, hast.id);
    SIM.setAmount(s, 'brod', 40);
    const mat0 = SIM.foodOf(s), pb = SIM.packbehov(s, sl)!;
    const ok = SIM.borjaPacka(s, sl), tog = Math.round(mat0 - SIM.foodOf(s)), ut = sl.ut!;
    const samlaUte = SIM.utanforByn(s, ut.samla.x, ut.samla.y) >= 1;
    const vid = new Set<number>(); let lastad = false;
    korTills(s, () => sl.skede === 'ute', 12 * 3600, () => {
      for (const p of [a!, b!]) if (!SIM.ute(p) && Math.hypot(p.x - ut.samla.x, p.y - ut.samla.y) <= 2) vid.add(p.id);
      if (sl.skede === 'gar' && hast.x === ut.samla.x && hast.y === ut.samla.y) lastad = true;
    });
    const kant = ut.kant.x <= 1 || ut.kant.y <= 1 || ut.kant.x >= SIM.W - 2 || ut.kant.y >= SIM.H - 2;
    return [
      [`packningen tas ur förrådet: ${tog} portioner av ${pb.mat}, i hela saker`, ok && tog === pb.mat && sl.insatser.every(x => Number.isInteger(x.n))],
      ['maten är bokförd som insatser', sl.insatser.filter(x => !x.djur).reduce((t, x) => t + x.n, 0) >= pb.mat],
      [`samlingsplatsen ligger vid byns utkant och kanten vid kartans kant`, samlaUte && kant],
      [`båda gick till samlingsplatsen (${vid.size})`, vid.size === 2],
      ['djuren lastades vid samlingsplatsen', lastad],
      [`sällskapet lämnade kartan (${sl.skede})`, sl.skede === 'ute' && SIM.ute(a!) && SIM.ute(b!) && !SIM.living(s).includes(a!)],
      ['hästen är med på resan och inte i byn', hast.ute !== undefined && !SIM.tamdjurOf(s).includes(hast)],
    ];
  },
};

SCENARIER.vagbehov = {
  text: 'Behoven på vägen (steg 11.5.6, resaBehov i resa.ts): sällskapets mättnad, vätska och ork räknas var tionde minut för hela gruppen; maten går åt i hela saker, den som håller kortast först, vattnet ur säckarna på en torr sträcka och höet där djuren inte kan beta. En natt i köld utan tält kostar ork, och ett trött sällskap går långsammare',
  kor: () => {
    const s0 = SIM.cloneState(testBy(3)), vl0 = s0.varld!, [a, b] = SIM.living(s0).filter(q => SIM.ageOf(q, s0.now) >= 18);
    const hb = SIM.byPlats(vl0, vl0.huvud!)!, mal = hb.grannar![0]!.nr, v = SIM.varldMark(s0)!;
    // en kall natt de närmaste dygnen (klockan sex på morgonen efter)
    let natt = 0;
    for (let d = 1; d < 60 && !natt; d++) { const t = (Math.floor(s0.now / SIM.DAY) + d) * SIM.DAY + 3 * SIM.HOUR; if (SIM.temperature(s0, t) < SIM.RESA.koldFran - 6 && SIM.vaderNu(s0, t).nb === 0) natt = t + 3 * SIM.HOUR; }
    // en torr ruta där det inte går att beta
    let torr: number | undefined;
    for (let i = 0; i < v.w * v.h && torr === undefined; i++) { const m = SIM.VARLDMARK[SIM.MARK_IDS[v.mark[i]]]; if (!m.bete && !m.vatten && !v.flod[i]) torr = i; }
    const ny = (t: number, pack: Record<string, number>, ruta?: number) => {
      const s = SIM.cloneState(s0); s.now = t;
      const sl = SIM.nyttSallskap(s, s.people.find(q => q.id === a!.id)!, mal, 'handel')!; SIM.foljMed(s.varld!, sl, s.people.find(q => q.id === b!.id)!);
      sl.pack = { ...pack }; sl.skede = 'ute'; sl.ruta = ruta;
      return { s, sl };
    };
    // natten i köld, med och utan tält
    const utan = ny(natt - 6 * SIM.HOUR, {}), med = ny(natt - 6 * SIM.HOUR, { talt: 1 });
    utan.sl.behov = { matt: 1, vatska: 1, ork: 0.5, fulla: 0, foder: 0 }; med.sl.behov = { ...utan.sl.behov };
    utan.s.now = natt; med.s.now = natt; SIM.resaBehov(utan.s, 6 * SIM.HOUR); SIM.resaBehov(med.s, 6 * SIM.HOUR);
    // en dag i gång
    const dagT = Math.floor(s0.now / SIM.DAY) * SIM.DAY + SIM.DAY + 8 * SIM.HOUR, gang = ny(dagT, {});
    gang.s.now = dagT + 10 * SIM.HOUR; SIM.resaBehov(gang.s, 10 * SIM.HOUR);
    const fartUtvilad = SIM.orkFart(gang.sl); gang.sl.behov!.ork = 0.2; const fartTrott = SIM.orkFart(gang.sl);
    // maten, vattnet och höet under två dygn på en torr ruta utan bete, med en häst
    const lang = ny(dagT, { fisk: 2, brod: 10, vattensack: 2, torrgras: 6 }, torr);
    lang.sl.djur.push(SIM.TAM_ID0 + 99999);
    const fiskForst: boolean[] = [];
    for (let h = 1; h <= 48; h++) { lang.s.now = dagT + h * SIM.HOUR; SIM.resaBehov(lang.s, SIM.HOUR); fiskForst.push((lang.sl.pack.brod ?? 0) === 10 || !lang.sl.pack.fisk); }
    const p = lang.sl.pack, hel = Object.values(p).every(n => Number.isInteger(n));
    return [
      [`hittade en kall natt (${natt ? Math.round(SIM.temperature(s0, natt - 3 * SIM.HOUR)) : '–'} grader) och en torr ruta utan bete`, natt > 0 && torr !== undefined],
      [`en natt i köld utan tält kostar ork (${utan.sl.behov!.ork.toFixed(2)} mot ${med.sl.behov!.ork.toFixed(2)} med tält)`, utan.sl.behov!.ork < med.sl.behov!.ork - 0.05],
      [`en dag i gång sänker orken (${gang.sl.behov!.ork.toFixed(2)})`, gang.sl.behov!.ork < 0.6],
      [`ett trött sällskap går långsammare (fart ${fartTrott.toFixed(2)} mot ${fartUtvilad.toFixed(2)})`, fartTrott < fartUtvilad && fartTrott >= SIM.RESA.orkFartMin],
      [`maten går åt i hela saker, fisken (håller kortast) före brödet (kvar: ${JSON.stringify(p)})`, hel && !p.fisk && (p.brod ?? 0) < 10 && fiskForst.every(x => x)],
      [`vattnet ur säckarna på den torra sträckan (${lang.sl.behov!.fulla} fulla kvar)`, lang.sl.behov!.fulla === 0 && (lang.s.stat?.['resa dricker ur säcken'] ?? 0) >= 1],
      [`hästen äter hö där den inte kan beta (${p.torrgras ?? 0} kvar av 6)`, (p.torrgras ?? 0) <= 2],
      [`mättnaden hålls uppe av maten (${lang.sl.behov!.matt.toFixed(2)})`, lang.sl.behov!.matt > 0.3],
    ];
  },
};

SCENARIER.resfart = {
  text: 'Farten (steg 11.5.7, sallskapFart och gången i resa.ts): den långsammaste medlemmens fart gånger lastens, årstidens och orkens; ledens fart ligger i rutans kostnad. Ett sällskap med ett barn går långsammare, en stig går fortare än obanad mark, lasten bromsar, och sällskapet går fram, stannar och kommer hem',
  kor: () => {
    const s0 = SIM.cloneState(testBy(3)), vl0 = s0.varld!, vuxna = SIM.living(s0).filter(q => SIM.ageOf(q, s0.now) >= 20 && SIM.ageOf(q, s0.now) < 50 && SIM.personFart(s0, q) === 1);
    const barn = SIM.living(s0).find(q => SIM.ageOf(q, s0.now) < SIM.ALDER.vuxen && SIM.ageOf(q, s0.now) >= SIM.ALDER.gangBarn);
    const hb = SIM.byPlats(vl0, vl0.huvud!)!, mal = hb.grannar![0]!.nr;
    const dag0 = Math.floor(s0.now / SIM.DAY) * SIM.DAY + SIM.DAY + 7 * SIM.HOUR;
    const ny = (ids: number[], stig = false) => {
      const s = SIM.cloneState(s0); s.now = dag0;
      const folk = ids.map(id => s.people.find(q => q.id === id)!);
      const sl = SIM.nyttSallskap(s, folk[0]!, mal, 'handel')!; for (const p of folk.slice(1)) SIM.foljMed(s.varld!, sl, p);
      sl.ut = { samla: { x: 1, y: 1 }, kant: { x: 1, y: 1 } };
      for (const p of folk) SIM.gaBort(s, p);
      const hem = SIM.byPlats(s.varld!, sl.by)!, v = SIM.varldMark(s)!;
      sl.skede = 'ute'; sl.ruta = hem.y * v.w + hem.x;
      const vag = SIM.vagMellan(s.varld!, v, sl.ruta, s.varld!.platser!.find(p => p.nr === mal)!.y * v.w + s.varld!.platser!.find(p => p.nr === mal)!.x, 'fots', s.now)!;
      sl.vag = { fran: vag.fran, till: vag.till, steg: vag.steg }; sl.pos = 0; sl.gang = 0;
      if (stig) { const l = s.varld!.leder ??= {}; for (const i of SIM.vagenRutor(s, sl)) l[i] = [20, s.now, 1]; s.varld!.ledVer = (s.varld!.ledVer ?? 0) + 1; }
      return { s, sl, folk };
    };
    const kor = (x: { s: SIM.State }, tim: number) => { for (let h = 0; h < tim; h++) { x.s.now += SIM.HOUR; SIM.resaBehov(x.s, SIM.HOUR); } };
    const vuxen = ny([vuxna[0]!.id, vuxna[1]!.id]), medBarn = barn ? ny([vuxna[0]!.id, barn.id]) : undefined, stig = ny([vuxna[0]!.id, vuxna[1]!.id], true);
    const fV = SIM.sallskapFart(vuxen.s, vuxen.sl), fB = medBarn ? SIM.sallskapFart(medBarn.s, medBarn.sl) : 1;
    kor(vuxen, 2); if (medBarn) kor(medBarn, 2); kor(stig, 2);
    // hur stor del av vägen som är gången (rutorna och gången mot nästa)
    const del = (x: { s: SIM.State; sl: SIM.Sallskap }) => { const r = SIM.vagenRutor(x.s, x.sl), k = SIM.kostnader(x.s.varld!, SIM.varldMark(x.s)!, 'fots'), p = x.sl.pos!; return p >= r.length - 1 ? 1 : (p + x.sl.gang! / k[r[p + 1]]) / (r.length - 1); };
    const tung = ny([vuxna[0]!.id, vuxna[1]!.id]); tung.sl.pack = { brod: 36 }; const fL = SIM.lastFart(tung.s, tung.sl);
    // hela resan: fram, stanna och hem
    const hel = ny([vuxna[0]!.id, vuxna[1]!.id]), sett = new Set<string>();
    for (let h = 0; h < 60 * 24 && hel.sl.skede !== 'hemma'; h++) { kor(hel, 1); sett.add(hel.sl.skede); }
    const trampat = Object.keys(hel.s.varld!.leder ?? {}).length;
    return [
      [`ett barn går långsammare (${fB.toFixed(2)} mot ${fV.toFixed(2)})`, !!medBarn && fB < fV && fB === SIM.RESA.fartBarn * SIM.orkFart(medBarn.sl)],
      [`och kommer kortare på två timmar (${medBarn ? del(medBarn).toFixed(2) : '–'} mot ${del(vuxen).toFixed(2)} av vägen)`, !!medBarn && del(medBarn) < del(vuxen) && del(vuxen) < 1],
      [`en stig går fortare än obanad mark (${del(stig).toFixed(2)} mot ${del(vuxen).toFixed(2)} av vägen)`, del(stig) > del(vuxen)],
      [`lasten bromsar (${fL.toFixed(2)})`, fL < 1 && fL >= SIM.RESA.lastMin],
      [`sällskapet går fram, stannar och kommer hem (${[...sett].join(', ')})`, hel.sl.skede === 'hemma' && sett.has('framme') && sett.has('hemat')],
      ['resenärerna är hemma i byn igen', hel.folk.every(p => !SIM.ute(p))],
      [`resan trampade leden (${trampat} rutor)`, trampat > 2],
    ];
  },
};

SCENARIER.radbesok = {
  text: 'Besöket hos en rad (steg 11.5.8, radBesok i resa.ts): sällskapet som är framme säljer det det har med sig mot byns silver efter byns pris, köper mat för vägen hem, möter byns folk, får platsen som besökt och ändrar radens tal i hela saker',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!, [a, b] = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= 18);
    const hb = SIM.byPlats(vl, vl.huvud!)!;
    const mal = hb.grannar!.map(g => SIM.varldPlatsNr(vl, g.nr)).find(p => p?.k === 'by' && p.by !== undefined && SIM.radNr(vl, p.by)!.tal.folk > 0)!;
    const r = SIM.radNr(vl, mal.by)!;
    r.tal.silver = 60; r.tal.mat = Math.max(r.tal.mat, 100); // en granne med silver och mat
    const sl = SIM.nyttSallskap(s, a!, mal.nr, 'handel')!; SIM.foljMed(vl, sl, b!);
    sl.pack = { skinn: 12, brod: 1 }; sl.skede = 'framme';
    const fore = { ...r.tal }, inst0 = r.syn?.inst ?? 0, mott0 = r.fasta.filter(f => f.roll === 'mott').length;
    SIM.radBesok(s, sl, s.now);
    const heltal = Object.values(r.tal).every(Number.isInteger) && Object.values(sl.pack).every(Number.isInteger);
    const mat = SIM.FOOD.reduce((t, f) => t + (sl.pack[f] ?? 0), 0);
    return [
      [`en granne med folk (${mal.namn})`, !!mal],
      [`sällskapet sålde skinnen mot silver (${12 - (sl.pack.skinn ?? 0)} skinn, byns silver ${fore.silver} → ${r.tal.silver})`, (sl.pack.skinn ?? 0) < 12],
      [`och köpte mat för vägen hem (${mat} portioner, byns mat ${fore.mat} → ${r.tal.mat})`, mat > 1 && r.tal.mat < fore.mat],
      ['radens tal och packningen är hela saker', heltal],
      ['platsen är besökt för resenärerna (byns rad får veta det vid hemkomsten, steg 11.5.13)', [a!, b!].every(p => SIM.ortNiva(p, mal.nr) === SIM.O_BESOKT)],
      [`byn minns att den mött huvudbyns folk (${mott0} → ${r.fasta.filter(f => f.roll === 'mott').length})`, r.fasta.filter(f => f.roll === 'mott').length === Math.min(SIM.RESA.mott, mott0 + 1)],
      [`inställningen blev bättre (${inst0} → ${r.syn?.inst})`, !r.syn || r.syn.inst > inst0 || inst0 >= 100],
      [`dagboken har besöket (${sl.dagbok.length} rader)`, sl.dagbok.length >= 3],
    ];
  },
};

SCENARIER.andelar = {
  text: 'Hemkomsten och andelarna (steg 11.5.9, delaAndelar i resa.ts): insatserna går tillbaka till sina ägare, och bytet delas i hela saker efter fordran. Exemplet i avsnittet: tre resenärer tar med en annans häst (80), 24 bröd ur byns förråd och den enes 20 skinn (60); 18 bröd äts och skinnen blir 12 salt och 3 knivar (210)',
  kor: () => {
    const V: Record<string, number> = { brod: 1, skinn: 3, hast: 80, salt: 10, kniv: 30 }, varde = (k: string) => V[k] ?? 0;
    const A = 1, B = 2, C = 3, D = 4, HAST = 99;
    const ins: SIM.Insats[] = [{ agare: D, sak: 'hast', n: 1, varde: 80, djur: HAST }, { agare: 'by', sak: 'brod', n: 24, varde: 24 }, { agare: A, sak: 'skinn', n: 20, varde: 60 }];
    const a = SIM.delaAndelar(ins, [A, B, C], { brod: 6, salt: 12, kniv: 3 }, id => id === HAST, varde);
    const f = new Map(a.fordran), fick = (x: SIM.Agare) => a.byte.filter(b => b[0] === x).reduce((t, b) => t + b[2] * varde(b[1]), 0);
    const tillbaka = (x: SIM.Agare, sak: string) => a.tillbaka.find(t => t[0] === x && t[1] === sak)?.[2] ?? 0;
    const delat = a.byte.reduce((t, b) => t + b[2] * varde(b[1]), 0);
    // i en by: hemkomsten lägger insatserna och bytet i förrådet hos ägarna
    const s = SIM.cloneState(testBy(3)), [p, q] = SIM.living(s).filter(x => SIM.ageOf(x, s.now) >= 18), vl = s.varld!;
    const sl = SIM.nyttSallskap(s, p!, SIM.byPlats(vl, vl.huvud!)!.grannar![0]!.nr, 'handel')!; SIM.foljMed(vl, sl, q!);
    sl.insatser = [{ agare: 'by', sak: 'brod', n: 10, varde: 10 }]; sl.pack = { brod: 4, silver: 30 };
    const silver0 = SIM.amountOf(s, 'silver'), brod0 = SIM.amountOf(s, 'brod');
    SIM.hemkomst(s, sl, s.now);
    const fickSilver = Math.round(SIM.amountOf(s, 'silver') - silver0);
    return [
      [`hästen och 6 bröd går tillbaka (${tillbaka(D, 'hast')} häst, ${tillbaka('by', 'brod')} bröd)`, tillbaka(D, 'hast') === 1 && tillbaka('by', 'brod') === 6],
      [`det som gått åt är värt 78 och vinsten 132 (${a.gatt}, ${a.vinst})`, a.gatt === 78 && a.vinst === 132],
      [`andelarna: en per resenär och en per 40 i värde (A ${new Map(a.andelar).get(A)}, D ${new Map(a.andelar).get(D)})`, new Map(a.andelar).get(A) === 2 && new Map(a.andelar).get(D) === 2 && new Map(a.andelar).get(B) === 1 && !new Map(a.andelar).get('by')],
      [`fordran: A 104, B och C 22, D 44, byn 18 (${a.fordran.map(([x, v]) => `${x} ${v}`).join(', ')})`, f.get(A) === 104 && f.get(B) === 22 && f.get(C) === 22 && f.get(D) === 44 && f.get('by') === 18],
      [`bytet delas i hela knivar och hela salt, hela värdet (${delat} av 210)`, delat === 210 && a.byte.every(b => Number.isInteger(b[2]) && (b[1] === 'kniv' || b[1] === 'salt'))],
      [`den med störst fordran får de mest värda först (A fick ${fick(A)}: ${a.byte.filter(b => b[0] === A).map(b => `${b[2]} ${b[1]}`).join(', ')})`, a.byte.some(b => b[0] === A && b[1] === 'kniv')],
      [`ingen får mycket mer eller mindre än sin fordran (${[A, B, C, D, 'by' as const].map(x => Math.round(fick(x) - f.get(x)!)).join(', ')})`, [A, B, C, D, 'by' as const].every(x => Math.abs(fick(x) - f.get(x)!) <= 30)],
      [`hemma läggs bytet och insatserna i förrådet (${fickSilver} silver, bröd ${Math.round(SIM.amountOf(s, 'brod') - brod0)})`, fickSilver === 30 && Math.round(SIM.amountOf(s, 'brod') - brod0) === 4 && sl.skede === 'hemma'],
    ];
  },
};

SCENARIER.samlaresa = {
  lang: true,
  text: 'Att samla till en resa (steg 11.5.10, resaPlan och raden samlaResa i val.ts): en nyfiken och modig bybo som hört rykten om en plats samlar till en resa dit, med en poäng som vägs mot byns andra arbeten; en försiktig får lägre poäng, och i en by i nöd reser ingen',
  kor: () => {
    const s = SIM.cloneState(testBy(30)), vl = s.varld!, hem = SIM.byPlats(vl, vl.huvud!)!;
    const vuxna = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= 18 && SIM.ageOf(q, s.now) < 50 && SIM.kanGa(q) && !SIM.vilaHellre(q) && !SIM.isSick(q, s.now));
    const a = vuxna[0]!, b = vuxna[1]!;
    // en plats längre bort som ingen känner till, och som a hör rykten om
    const mal = vl.platser!.filter(q => q.nr !== hem.nr && (SIM.RESMAL.se.mal as readonly string[]).includes(q.k) && SIM.kannerOrt(s, a, q.nr) === undefined)
      .sort((x, y) => Math.hypot(x.x - hem.x, x.y - hem.y) - Math.hypot(y.x - hem.x, y.y - hem.y))[0]!;
    for (const p of SIM.living(s)) p.lardomar = (p.lardomar ?? []).filter(l => l.k !== 'ort' || l.v !== SIM.O_RYKTE);
    for (const p of [a, b]) SIM.larOrt(s, p, mal.nr, SIM.O_RYKTE, 1);
    a.pot.nyfikenhet = 18; a.pot.mod = 18; b.pot.nyfikenhet = 18; b.pot.mod = 3;
    const modig = SIM.resaPlan(s, a, 99, 99), forsiktig = SIM.resaPlan(s, b, 99, 99), nod = SIM.resaPlan(s, a, SIM.resaPlan(s, a, 99, 99)!.dygn * 0.1, 99);
    // a väger raderna på Förbättra: resan vinner, och a samlar och går till samlingsplatsen, där sällskapet packar
    const s1 = SIM.cloneState(s), a1 = s1.people.find(q => q.id === a.id)!;
    for (const f of SIM.FOOD) if (SIM.amountOf(s1, f) > 0) SIM.setAmount(s1, f, Math.max(SIM.amountOf(s1, f), 60));
    const kand = SIM.forbattraKandidater(s1, a1).sort((x, y) => y.sc - x.sc), vann = kand[0];
    if (vann?.id === 'samlaResa') vann.gor(); // valet: nästa gång a väljer går hen till samlingsplatsen (resaVal, nivån Tillfälle)
    const sl = s1.varld!.sallskap?.find(x => x.ledare === a1.id);
    korTills(s1, () => sl?.skede !== 'samlas', 12 * 3600);
    // samma by i nöd: maten är slut
    const s2 = SIM.cloneState(s);
    for (const f of SIM.FOOD) SIM.setAmount(s2, f, 0);
    korTills(s2, () => !!s2.varld!.sallskap?.length, 24 * 3600);
    return [
      [`a vill se ${mal.namn}, ${modig?.dygn} dygn borta (poäng ${modig?.sc.toFixed(3)})`, modig?.skal === 'se' && modig.mal === mal.nr && modig.sc > 0],
      [`den försiktiga får lägre poäng (${forsiktig?.sc.toFixed(3)})`, !!forsiktig && forsiktig.sc < modig!.sc],
      [`med mat för en kort tid hemma blir poängen låg (${nod?.sc.toFixed(3) ?? 0})`, (nod?.sc ?? 0) < modig!.sc * 0.2],
      [`resan vinner över de andra raderna på Förbättra (${kand.slice(0, 3).map(k => `${k.id} ${k.sc.toFixed(2)}`).join(', ')})`, vann?.id === 'samlaResa'],
      [`a samlade till resan och gick till samlingsplatsen, där sällskapet packade (${sl?.skede ?? 'inget sällskap'})`, !!sl && sl.mal === mal.nr && sl.skal === 'se' && (sl.skede === 'packar' || sl.skede === 'gar' || sl.skede === 'ute')],
      [`i en by utan mat samlar ingen till en resa (${s2.varld!.sallskap?.length ?? 0} sällskap)`, !s2.varld!.sallskap?.length],
    ];
  },
};

SCENARIER.kallelse = {
  text: 'Kallelsen (steg 11.5.11, kallelse och samlasSteg i resa.ts): ledaren kallar som vid björnjakten, och de villigaste följer med tills kraften räcker mot ledens fara; en kort och ofarlig resa går ledaren ensam, eftersom fler bara späder andelarna. Resenärerna går till samlingsplatsen; den som inte kommit inom en timme är inte med, och räcker inte kraften ställs resan in',
  kor: () => {
    const s0 = SIM.cloneState(testBy(30)), vl0 = s0.varld!, hem = SIM.byPlats(vl0, vl0.huvud!)!;
    const vuxna = SIM.living(s0).filter(q => SIM.ageOf(q, s0.now) >= 18 && SIM.ageOf(q, s0.now) < 50 && SIM.kanGa(q) && !SIM.vilaHellre(q) && !SIM.isSick(q, s0.now));
    for (const q of vuxna) { q.pot.mod = 16; q.pot.nyfikenhet = 14; }
    const vm = SIM.varldMark(s0)!, mal = vl0.platser!.filter(q => q.nr !== hem.nr && q.k !== 'by').sort((a, b) => Math.hypot(a.x - hem.x, a.y - hem.y) - Math.hypot(b.x - hem.x, b.y - hem.y)).find(q => SIM.vagDygn(s0, hem.y * vm.w + hem.x, q.y * vm.w + q.x))!;
    const plan = (fara: number): SIM.ResPlan => ({ mal: mal.nr, namn: mal.namn, skal: 'se', varde: 30, dygn: 6, fara, sc: 1, varor: [] });
    // en farlig resa: fler följer med tills kraften räcker
    const s1 = SIM.cloneState(s0), led1 = s1.people.find(q => q.id === vuxna[0]!.id)!;
    const sl1 = SIM.samlaResa(s1, led1, plan(0.3))!;
    const kraft1 = SIM.sallskapKraft(s1, sl1), utanSista = kraft1 - SIM.resKraft(s1, s1.people.find(q => q.id === sl1.medl.at(-1))!);
    // en ofarlig resa: ledaren går ensam
    const s2 = SIM.cloneState(s0), led2 = s2.people.find(q => q.id === vuxna[0]!.id)!;
    const sl2 = SIM.samlaResa(s2, led2, plan(0.01))!;
    // resenärerna går till samlingsplatsen och sällskapet packar
    korTills(s1, () => sl1.skede !== 'samlas' || !s1.varld!.sallskap!.includes(sl1), 2 * 3600);
    // en som sover länge kommer inte inom en timme: sällskapet går utan hen
    const s3 = SIM.cloneState(s0), led3 = s3.people.find(q => q.id === vuxna[0]!.id)!, b3 = s3.people.find(q => q.id === vuxna[1]!.id)!;
    const sl3 = SIM.samlaResa(s3, led3, plan(0.01))!; SIM.foljMed(s3.varld!, sl3, b3);
    b3.task = { act: 'sova', phase: 'do', tx: b3.x, ty: b3.y, until: s3.now + 3 * SIM.HOUR, carry: 0, dark: false, why: 'Sover' };
    korTills(s3, () => sl3.skede !== 'samlas' || !s3.varld!.sallskap!.includes(sl3), 2 * 3600);
    // kraften räcker inte: resan ställs in
    const s4 = SIM.cloneState(s0), led4 = s4.people.find(q => q.id === vuxna[0]!.id)!;
    const sl4 = SIM.samlaResa(s4, led4, plan(0.01))!; sl4.krav = 100;
    korTills(s4, () => !s4.varld!.sallskap!.includes(sl4), 2 * 3600);
    return [
      [`en farlig resa: sällskapet blir ${sl1.medl.length}, kraften ${kraft1.toFixed(2)} mot kravet ${sl1.krav}`, sl1.medl.length > 1 && kraft1 >= sl1.krav! && utanSista < sl1.krav!],
      [`en ofarlig resa går ledaren ensam (${sl2.medl.length})`, sl2.medl.length === 1],
      [`resenärerna gick till samlingsplatsen och sällskapet packar (${sl1.skede})`, sl1.skede !== 'samlas' && s1.varld!.sallskap!.includes(sl1)],
      [`den som sov kom inte inom en timme och är inte med (${sl3.skede}, ${sl3.medl.length} med)`, sl3.skede !== 'samlas' && !sl3.medl.includes(b3.id) && SIM.sallskapFor(s3.varld, b3.id) === undefined],
      [`när kraften inte räcker ställs resan in (${s4.stat?.['resa inställd'] ?? 0})`, !s4.varld!.sallskap!.includes(sl4) && (s4.stat?.['resa inställd'] ?? 0) >= 1],
    ];
  },
};

SCENARIER.sallskapkarta = {
  text: 'Sällskapet på världskartan (steg 11.5.12, sallskapLage och sallskapRuta i resa.ts, bilden i ui/varldbild.ts): sällskapet står mellan rutan det är på och nästa längs vägen, vänt åt sitt håll, och rör sig när det går; rutan har skälet, målet, skedet, medlemmarna, packningen och hur många dygn det är kvar',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!, v = SIM.varldMark(s)!;
    const [a, b] = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= 20 && SIM.ageOf(q, s.now) < 50 && SIM.personFart(s, q) === 1);
    const hb = SIM.byPlats(vl, vl.huvud!)!, malP = vl.platser!.find(p => p.nr === hb.grannar![0]!.nr)!;
    s.now = Math.floor(s.now / SIM.DAY) * SIM.DAY + SIM.DAY + 7 * SIM.HOUR;
    const sl = SIM.nyttSallskap(s, a!, malP.nr, 'handel')!; SIM.foljMed(vl, sl, b!);
    sl.ut = { samla: { x: 1, y: 1 }, kant: { x: 1, y: 1 } };
    for (const p of [a!, b!]) SIM.gaBort(s, p);
    sl.skede = 'ute'; sl.ruta = hb.y * v.w + hb.x; sl.pack = { brod: 12, skinn: 5 };
    const vag = SIM.vagMellan(vl, v, sl.ruta, malP.y * v.w + malP.x, 'fots', s.now)!;
    sl.vag = { fran: vag.fran, till: vag.till, steg: vag.steg }; sl.pos = 0; sl.gang = 0;
    const l0 = SIM.sallskapLage(s, sl)!;
    s.now += SIM.HOUR; SIM.resaBehov(s, SIM.HOUR);
    const l1 = SIM.sallskapLage(s, sl)!, rutor = SIM.vagenRutor(s, sl), pos = sl.pos ?? 0;
    const a1 = rutor[pos]!, b1 = rutor[Math.min(pos + 1, rutor.length - 1)]!;
    const mellan = Math.min(a1 % v.w, b1 % v.w) <= l1.x + 1e-9 && l1.x <= Math.max(a1 % v.w, b1 % v.w) + 1e-9 && Math.min(Math.floor(a1 / v.w), Math.floor(b1 / v.w)) <= l1.y + 1e-9 && l1.y <= Math.max(Math.floor(a1 / v.w), Math.floor(b1 / v.w)) + 1e-9;
    const ratt = l1.dx === Math.sign(b1 % v.w - a1 % v.w) && l1.dy === Math.sign(Math.floor(b1 / v.w) - Math.floor(a1 / v.w));
    const r = SIM.sallskapRuta(s, sl);
    const tecken = VB.TECKEN.sallskap!, iPal = tecken.length === VB.VK && tecken.every(rad => rad.length === VB.VK && [...rad].every(c => c === '.' || c in VB.TECKENPAL));
    return [
      [`sällskapet står mellan två rutor på vägen (${l1.x.toFixed(2)}, ${l1.y.toFixed(2)})`, mellan],
      [`och är vänt åt sitt håll (${l1.dx}, ${l1.dy})`, ratt && (l1.dx !== 0 || l1.dy !== 0)],
      [`det rör sig när det går (${l0.kvar} → ${l1.kvar} dygn kvar)`, l1.kvar < l0.kvar && (l1.x !== l0.x || l1.y !== l0.y)],
      [`rutan: ${r.titel}, ${r.skede}, ${r.ledare} med ${r.medl.join(', ')}, ${r.pack.map(([k, n]) => `${n} ${k}`).join(', ')}`, r.titel.includes(malP.namn) && r.skede === 'På väg dit' && r.ledare === a!.name && r.medl.includes(b!.name) && r.pack.length === 2 && r.kvar !== undefined],
      ['bilden är 16 × 16 punkter i paletten', iPal],
    ];
  },
};

SCENARIER.redogorelse = {
  text: 'Resans dagbok och redogörelsen (steg 11.5.13, dagbok och redogorelse i resa.ts): dagboken får raden när händelsen sker, och det stora en notis; byn hemma vet inget om resan förrän någon kommit hem, och då berättas den med en knapp till dagboken och delningen',
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!, [a, b] = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= 18);
    const hb = SIM.byPlats(vl, vl.huvud!)!;
    const mal = hb.grannar!.map(g => SIM.varldPlatsNr(vl, g.nr)).find(p => p?.k === 'by' && p.by !== undefined && SIM.radNr(vl, p.by)!.tal.folk > 0)!;
    const rad = SIM.radNr(vl, vl.huvud)!; rad.besokt = (rad.besokt ?? []).filter(n => n !== mal.nr);
    const sl = SIM.nyttSallskap(s, a!, mal.nr, 'handel')!; SIM.foljMed(vl, sl, b!);
    sl.pack = { skinn: 6 }; sl.insatser = [{ agare: a!.id, sak: 'skinn', n: 6, varde: 18 }]; sl.skede = 'framme';
    const resaRader = () => s.log.filter(l => l.resa === sl.id).length;
    const notisRader = () => (s.notiser?.lista ?? []).filter(n => n.id === 'resa').reduce((t, n) => t + n.n, 0);
    s.now += SIM.HOUR; const t1 = s.now;
    SIM.radBesok(s, sl, t1);
    const fram = sl.dagbok.find(d => d[2] === 'fram'), notis0 = notisRader();
    s.now += SIM.HOUR;
    SIM.dagbok(s, sl, 'fynd', 'Hittade en gammal kniv vid vägen.');
    const fynd = sl.dagbok[sl.dagbok.length - 1]!, notis1 = notisRader();
    const fore = { besokt: !!rad.besokt?.includes(mal.nr), logg: resaRader(), kand: !!SIM.redogorelseAv(s, sl.id) };
    s.now += SIM.HOUR;
    SIM.hemkomst(s, sl, s.now);
    const r = SIM.redogorelseAv(s, sl.id), rader = s.log.filter(l => l.resa === sl.id);
    const n = (s.notiser?.lista ?? []).find(x => x.id === 'resa' && x.resa?.includes(sl.id));
    return [
      [`dagboken fick besöket när det skedde (${fram ? 'ja' : 'nej'})`, !!fram && fram[0] === t1],
      [`ett vanligt besök ger ingen notis, ett fynd ger en (${notis0} → ${notis1})`, notis0 === 0 && notis1 === 1 && fynd[0] === s.now - SIM.HOUR && fynd[2] === 'fynd'],
      [`före hemkomsten vet byn inget: platsen är inte besökt för raden, ingen rad i händelserna, ingen redogörelse`, !fore.besokt && fore.logg === 0 && !fore.kand],
      [`vid hemkomsten blir platsen besökt för byns rad`, !!rad.besokt?.includes(mal.nr)],
      [`och resan berättas: en rad i händelserna och en notis med knappen till resan (${rader.length} rad${rader.length === 1 ? '' : 'er'}: ${rader[0]?.text ?? ''})`, rader.length === 1 && !!n],
      [`redogörelsen har dagboken och delningen (${r?.dagbok.length ?? 0} rader, bytet ${r?.delning?.varde ?? '–'})`, !!r && r.dagbok.length >= 4 && !!r.delning && r.dagbok.some(d => d[2] === 'hem')],
      [`allt i dagboken står i tidsordning`, sl.dagbok.every((d, i) => i === 0 || d[0] >= sl.dagbok[i - 1]![0])],
    ];
  },
};

SCENARIER.vaghandelser = {
  text: 'Vägens händelser (steg 11.5.14, VAGHANDELSER i resa.ts): de ofarliga raderna (gå vilse, oväder, tappad utrustning och fynd av mat) med risk per dygn, det som höjer den och färdigheten som sänker den (eller höjer ett fynd). Risken är en chans per tid, så korta och långa bitar ger lika många händelser, och sällskapet på vägen går med spelets egen klocka',
  kor: () => {
    const IDS = ['mat', 'ovader', 'tappad', 'vilse']; // de ofarliga raderna, räknade efter sitt slag i dagboken (sjukdomen och olyckan prövas i vagsjuk)
    const s0 = SIM.cloneState(testBy(3)), vl0 = s0.varld!, [a, b] = SIM.living(s0).filter(q => SIM.ageOf(q, s0.now) >= 20 && SIM.ageOf(q, s0.now) < 50);
    const mal = SIM.byPlats(vl0, vl0.huvud!)!.grannar![0]!.nr;
    const ny = () => {
      const s = SIM.cloneState(s0), p = s.people.find(q => q.id === a!.id)!, q = s.people.find(x => x.id === b!.id)!;
      const sl = SIM.nyttSallskap(s, p, mal, 'handel')!; SIM.foljMed(s.varld!, sl, q);
      sl.skede = 'ute'; sl.pack = { skinn: 5000, rep: 5000 };
      return { s, sl, p, q };
    };
    // vilse: obanad mark mot stig, och den som kan jakt
    const x = ny(), v = SIM.varldMark(x.s)!, i = SIM.byPlats(x.s.varld!, x.sl.by)!; x.sl.ruta = i.y * v.w + i.x;
    x.p.skill.jakt = 0; x.q.skill.jakt = 0;
    delete x.s.varld!.leder?.[x.sl.ruta]; x.s.varld!.ledVer = (x.s.varld!.ledVer ?? 0) + 1;
    const obanad = SIM.vagRisk(x.s, x.sl, 'vilse');
    (x.s.varld!.leder ??= {})[x.sl.ruta] = [20, x.s.now, 1];
    const stig = SIM.vagRisk(x.s, x.sl, 'vilse');
    x.p.skill.jakt = 20; const jagare = SIM.vagRisk(x.s, x.sl, 'vilse');
    x.p.skill.samla = 0; x.q.skill.samla = 0; const fynd0 = SIM.vagRisk(x.s, x.sl, 'mat'); x.p.skill.samla = 20; const fynd20 = SIM.vagRisk(x.s, x.sl, 'mat');
    // tusen dygn på vägen (utan att gå), i timmar och i tiominutersbitar: lika många händelser, nära risken gånger dygnen
    const kor = (bit: number) => {
      const y = ny(), n: Record<string, number> = {};
      for (const id of IDS) n[id] = 0;
      const rakna = () => { const c: Record<string, number> = {}; for (const [, , k] of y.sl.dagbok) if (k) c[k] = (c[k] ?? 0) + 1; return c; };
      let risk: Record<string, number> = {};
      for (let t = 0; t < 1000 * SIM.DAY; t += bit) {
        y.s.now = s0.now + t;
        if (t % SIM.DAY === 0) for (const id of IDS) risk[id] = (risk[id] ?? 0) + SIM.vagRisk(y.s, y.sl, id);
        SIM.vagHandelser(y.s, y.sl, y.s.now, bit); y.sl.forlorat = 0;
      }
      const c = rakna(); for (const id of IDS) n[id] = c[id] ?? 0;
      return { n, risk, heltal: Object.values(y.sl.pack).every(Number.isInteger), y };
    };
    const tim = kor(SIM.HOUR), tio = kor(10 * SIM.MIN);
    const nara = (k: string, r: { n: Record<string, number>; risk: Record<string, number> }) => Math.abs(r.n[k]! - r.risk[k]!) <= 4 * Math.sqrt(r.risk[k]!) + 3;
    const lika = IDS.every(k => Math.abs(tim.n[k]! - tio.n[k]!) <= 4 * Math.sqrt(tim.risk[k]!) + 3);
    // med spelets egen klocka: ett sällskap på väg kommer framåt
    const z = ny(); const zv = SIM.varldMark(z.s)!, hem = SIM.byPlats(z.s.varld!, z.sl.by)!, mp = z.s.varld!.platser!.find(p => p.nr === mal)!;
    for (const p of [z.p, z.q]) SIM.gaBort(z.s, p);
    z.sl.pack = { brod: 40 }; z.sl.ruta = hem.y * zv.w + hem.x;
    const vag = SIM.vagMellan(z.s.varld!, zv, z.sl.ruta, mp.y * zv.w + mp.x, 'fots', z.s.now)!;
    z.sl.vag = { fran: vag.fran, till: vag.till, steg: vag.steg }; z.sl.pos = 0; z.sl.gang = 0;
    const t0 = z.s.now; korTills(z.s, () => (z.sl.pos ?? 0) >= 2 || z.sl.skede !== 'ute', 30 * 3600);
    return [
      [`gå vilse: obanad mark ${obanad.toFixed(3)}, stig ${stig.toFixed(3)} per dygn`, Math.abs(obanad - 0.06) < 1e-9 && Math.abs(stig - 0.02) < 1e-9],
      [`den som kan jakt sänker risken (${stig.toFixed(3)} → ${jagare.toFixed(3)})`, jagare < stig],
      [`den som kan samla hittar oftare mat (${fynd0.toFixed(3)} → ${fynd20.toFixed(3)})`, fynd20 > fynd0],
      [`tusen dygn i timmar: ${IDS.map(k => `${k} ${tim.n[k]} (väntat ${Math.round(tim.risk[k]!)})`).join(', ')}`, IDS.every(k => nara(k, tim) && tim.n[k]! > 0)],
      [`i tiominutersbitar lika många: ${IDS.map(k => `${k} ${tio.n[k]}`).join(', ')}`, lika && IDS.every(k => nara(k, tio))],
      [`det tappade och det hittade är hela saker (${5000 - (tim.y.sl.pack.skinn ?? 0) + 5000 - (tim.y.sl.pack.rep ?? 0)} tappade, ${tim.y.sl.pack.bar ?? 0} bär)`, tim.heltal && (tim.y.sl.pack.bar ?? 0) > 0],
      [`spelets klocka flyttar sällskapet längs vägen (${z.sl.pos ?? 0} rutor på ${((z.s.now - t0) / SIM.HOUR).toFixed(1)} timmar)`, (z.sl.pos ?? 0) >= 2 || z.sl.skede !== 'ute'],
    ];
  },
};

SCENARIER.matslut = {
  text: 'När maten tar slut på vägen (steg 11.5.15, MATSLUT i resa.ts): ledaren väger att leta, vända, hungra eller slakta ett packdjur med en poäng: värdet av det som återstår av resan minus hungern minus det utvägen kostar. Nära hemmet med lite att vinna vänder sällskapet, långt bort i kylan slaktar en omtänksam ledare fåret, och en varm dag letar det; allt i hela saker',
  kor: () => {
    const s0 = SIM.cloneState(testBy(3)), vl0 = s0.varld!, [a, b] = SIM.living(s0).filter(q => SIM.ageOf(q, s0.now) >= 20 && SIM.ageOf(q, s0.now) < 50);
    const hb = SIM.byPlats(vl0, vl0.huvud!)!, v0 = SIM.varldMark(s0)!;
    // det mål som ligger längst bort och går att nå
    const mal = hb.grannar!.map(g => SIM.varldPlatsNr(vl0, g.nr)!).filter(p => p && SIM.vagMellan(vl0, v0, hb.y * v0.w + hb.x, p.y * v0.w + p.x, 'fots', s0.now)).sort((x, y) => Math.hypot(y.x - hb.x, y.y - hb.y) - Math.hypot(x.x - hb.x, x.y - hb.y))[0]!;
    const varm = (warm: boolean) => { for (let d = 1; d < 400; d++) { const t = (Math.floor(s0.now / SIM.DAY) + d) * SIM.DAY + 12 * SIM.HOUR; if ((SIM.temperature(s0, t) >= SIM.RESA.fyndVarm + 5) === warm && (warm || SIM.temperature(s0, t) < SIM.RESA.fyndVarm - 3)) return t; } return s0.now; };
    const ny = (t: number, o: { del: number; varde: number; far?: boolean; hemat?: boolean }) => {
      const s = SIM.cloneState(s0); s.now = t;
      const p = s.people.find(q => q.id === a!.id)!, q = s.people.find(x => x.id === b!.id)!;
      const sl = SIM.nyttSallskap(s, p, mal.nr, 'handel')!; SIM.foljMed(s.varld!, sl, q);
      for (const x of [p, q]) SIM.gaBort(s, x);
      const v = SIM.varldMark(s)!, h = hb.y * v.w + hb.x, m = mal.y * v.w + mal.x;
      const vag = o.hemat ? SIM.vagMellan(s.varld!, v, m, h, 'fots', s.now)! : SIM.vagMellan(s.varld!, v, h, m, 'fots', s.now)!;
      sl.skede = o.hemat ? 'hemat' : 'ute'; sl.vag = { fran: vag.fran, till: vag.till, steg: vag.steg };
      const r = SIM.vagenRutor(s, sl); sl.pos = Math.min(r.length - 2, Math.floor((r.length - 1) * o.del)); sl.ruta = r[sl.pos]; sl.gang = 0;
      sl.varde = o.varde; sl.pack = {}; sl.behov = { matt: 0.05, vatska: 1, ork: 1, fulla: 0, foder: 0 };
      if (o.far) {
        const d: SIM.Tamdjur = { ...(s.tamdjur?.[0] ?? {}), id: 900001, art: 'far', x: p.x, y: p.y, fodd: s.now - 3 * SIM.DAY } as SIM.Tamdjur;
        delete (d as { dog?: number }).dog; (s.tamdjur ??= []).push(d); SIM.djurMed(sl, d.id);
      }
      return { s, sl, p };
    };
    const forst = (x: { s: SIM.State; sl: SIM.Sallskap }) => SIM.matslutVal(x.s, x.sl).val[0]?.id;
    const nara = ny(varm(true), { del: 0.02, varde: 0 });
    const kallt = ny(varm(false), { del: 0.3, varde: 200, far: true }); kallt.p.pot.empati = 20; // en ledare som bryr sig om de andras hunger
    const leta = ny(varm(true), { del: 0.3, varde: 200 });
    const hemat = ny(varm(true), { del: 0.9, varde: 200, hemat: true });
    const val = [nara, kallt, leta, hemat].map(forst);
    // empatin väger hungern tyngre
    const e = ny(varm(true), { del: 0.3, varde: 200 }); e.p.pot.empati = 3; const hk3 = SIM.matLage(e.s, e.sl).hk; e.p.pot.empati = 18; const hk18 = SIM.matLage(e.s, e.sl).hk;
    // utfallen genom resaBehov: maten är slut och sällskapet är hungrigt
    const kor = (x: { s: SIM.State; sl: SIM.Sallskap }, tim: number) => { for (let h = 0; h < tim; h++) { x.s.now += SIM.HOUR; SIM.resaBehov(x.s, SIM.HOUR); } };
    const pos0 = nara.sl.pos; kor(nara, 1);
    kor(kallt, 1); const farDog = !!kallt.s.tamdjur!.find(d => d.id === 900001)?.dog;
    const kott = Object.entries(kallt.sl.pack).filter(([k]) => SIM.FOOD.includes(k));
    kor(leta, 1); const letat = leta.sl.dagbok.filter(d => d[1].includes('letade')).length;
    const beslut0 = leta.sl.dagbok.length; kor(leta, 3); const igen = leta.sl.dagbok.filter(d => d[1].startsWith('Maten tog slut')).length;
    return [
      [`ett mål långt bort (${mal.namn}, ${Math.round(Math.hypot(mal.x - hb.x, mal.y - hb.y))} rutor)`, !!mal],
      [`nära hemmet med lite att vinna vänder sällskapet (${val[0]}: ${SIM.matslutVal(nara.s, nara.sl).val.map(x => `${x.id} ${Math.round(x.sc)}`).join(', ')})`, val[0] === 'vanda' || nara.sl.skede !== 'ute'],
      [`långt bort i kylan slaktar en omtänksam ledare fåret (${val[1]}: ${SIM.matslutVal(kallt.s, kallt.sl).val.map(x => `${x.id} ${Math.round(x.sc)}`).join(', ')}, ${SIM.matLage(kallt.s, kallt.sl).kvar} dygn kvar)`, val[1] === 'slakta'],
      [`en varm dag letar det (${val[2]})`, val[2] === 'leta'],
      [`på väg hem kan det inte vända (${val[3]})`, val[3] !== 'vanda'],
      [`en ledare med empati väger hungern tyngre (${hk3.toFixed(1)} → ${hk18.toFixed(1)})`, hk18 > hk3],
      [`vände: sällskapet går hem (${nara.sl.skede}, ${pos0} → ${nara.sl.pos})`, nara.sl.skede === 'hemat' || nara.sl.skede === 'hemma'],
      [`slaktade: fåret är dött och köttet i hela saker i packningen (${kott.map(([k, n]) => `${n} ${k}`).join(', ')})`, farDog && kott.length > 0 && kott.every(([, n]) => Number.isInteger(n))],
      [`letade: tiden går förlorad (${letat} gång)`, letat === 1],
      [`ledaren väger inte igen förrän efter ${SIM.RESA.matOmTim} timmar (${beslut0} → ${leta.sl.dagbok.length} rader, ${igen} beslut)`, igen <= 1 + (leta.sl.pack.bar ? 0 : 0)],
    ];
  },
};

SCENARIER.vagsjuk = {
  text: 'Sjukdom och olycka på vägen (steg 11.5.16, VAGHANDELSER i resa.ts): en resenär får en riktig sjukdom eller skada, kroppen räknas på vägen som hemma, och den som kan läkekonsten bäst vårdar med det som finns i packningen (remsan, repet och grenarna tas ur den, i hela saker). Inget hamnar på byns karta, och den som dör skrivs i dagboken',
  kor: () => {
    const s0 = SIM.cloneState(testBy(3)), vl0 = s0.varld!, [a, b] = SIM.living(s0).filter(q => SIM.ageOf(q, s0.now) >= 20 && SIM.ageOf(q, s0.now) < 50);
    const hb = SIM.byPlats(vl0, vl0.huvud!)!, mal = hb.grannar![0]!.nr;
    const ny = (pack: Record<string, number>) => {
      const s = SIM.cloneState(s0), p = s.people.find(q => q.id === a!.id)!, q = s.people.find(x => x.id === b!.id)!;
      const sl = SIM.nyttSallskap(s, p, mal, 'handel')!; SIM.foljMed(s.varld!, sl, q);
      for (const x of [p, q]) { SIM.gaBort(s, x); delete x.skador; delete x.sjuk; x.blod = 1; }
      sl.skede = 'framme'; sl.framme = s.now; sl.pack = { brod: 50, vattensack: 4, ...pack }; sl.behov = { matt: 1, vatska: 1, ork: 1, fulla: 4, foder: 0 };
      const v = SIM.varldMark(s)!; sl.ruta = hb.y * v.w + hb.x;
      return { s, sl, p, q };
    };
    const kor = (x: { s: SIM.State }, tim: number) => { for (let h = 0; h < tim; h++) { x.s.now += SIM.HOUR; SIM.resaBehov(x.s, SIM.HOUR); } };
    // riskerna: sjukdom 0,03 per dygn och olycka 0,02 på stig, dubbelt på obanad mark
    const r = ny({}); r.p.skill.lakekonst = 0; r.q.skill.lakekonst = 0;
    delete r.s.varld!.leder?.[r.sl.ruta!]; r.s.varld!.ledVer = (r.s.varld!.ledVer ?? 0) + 1;
    const sjuk = SIM.vagRisk(r.s, r.sl, 'sjukdom'), obanad = SIM.vagRisk(r.s, r.sl, 'olycka');
    (r.s.varld!.leder ??= {})[r.sl.ruta!] = [20, r.s.now, 1]; const stig = SIM.vagRisk(r.s, r.sl, 'olycka');
    // ett stort sår i benet: den andra trycker, snör av och lägger förband med det i packningen
    const k = ny({ remsa: 2, rep: 1 }); k.p.skill.lakekonst = 10;
    const kv0 = SIM.kvarlevor(k.s).length, blod0 = JSON.stringify(k.s.blod ?? null);
    SIM.skada(k.s, k.q, 'benV', 'skarsar', 0.7, 'olycka', 'på resan');
    kor(k, 1);
    const w = k.q.skador?.find(x => x.k === 'skarsar');
    // ett benbrott: spjälas med grenarna ur packningen
    const br = ny({ grenar: 2, remsa: 1 }); br.p.skill.lakekonst = 10;
    SIM.skada(br.s, br.q, 'benH', 'benbrott', 0.5, 'olycka', 'på resan');
    kor(br, 1);
    const bw = br.q.skador?.find(x => x.k === 'benbrott');
    // olyckan och sjukdomen ur registret skrivs i dagboken och ger en notis
    const o = ny({}); SIM.VAGHANDELSER.olycka!.gor(o.s, o.sl, o.s.now); SIM.VAGHANDELSER.sjukdom!.gor(o.s, o.sl, o.s.now);
    const skadad = [o.p, o.q].filter(x => x.skador?.length).length, sjuka = [o.p, o.q].filter(x => x.sjuk).length;
    const notiser = (o.s.notiser?.lista ?? []).filter(n => n.id === 'resa' && n.resa?.includes(o.sl.id)).reduce((t, n) => t + n.n, 0);
    // sjukdomen räknas på vägen tills den gått över (eller dödat)
    const sj = ny({}); SIM.insjukna(sj.s, sj.q, 'forkylning'); sj.q.sjuk!.tecken = sj.s.now; sj.q.sjuk!.st = 0;
    let timmar = 0; for (; timmar < 40 * 24 && sj.q.sjuk && SIM.alive(sj.q); timmar++) kor(sj, 1);
    // den som förblöder dör på vägen: i dagboken, men ingen kropp på byns karta
    const d = ny({}); SIM.skada(d.s, d.q, 'huvud', 'krossar', 0.3, 'olycka', 'på resan'); d.q.blod = 0.01;
    const dkv = SIM.kvarlevor(d.s).length; kor(d, 1);
    return [
      [`riskerna: sjukdom ${sjuk.toFixed(3)}, olycka ${stig.toFixed(3)} på stig och ${obanad.toFixed(3)} på obanad mark per dygn`, Math.abs(sjuk - 0.03) < 1e-9 && Math.abs(stig - 0.02) < 1e-9 && Math.abs(obanad - 0.04) < 1e-9],
      [`det stora såret slutade blöda och fick förband ur packningen (blöder ${w?.b}, förband ${w?.f}, av ${w?.av !== undefined}; kvar ${JSON.stringify(k.sl.pack)})`, !!w && w.b === 0 && (w.f === 2 || w.av !== undefined) && (k.sl.pack.remsa ?? 0) < 2],
      [`benbrottet spjälades med grenarna ur packningen (spjäla ${bw?.spala}, satt ${bw?.satt ?? bw?.snett}; grenar kvar ${br.sl.pack.grenar ?? 0})`, !!bw?.spala && !br.sl.pack.grenar],
      [`packningen är hela saker`, [k, br].every(x => Object.values(x.sl.pack).every(Number.isInteger))],
      [`inget blod och ingen kroppsdel på byns karta (${SIM.kvarlevor(k.s).length - kv0} nya kvarlevor)`, SIM.kvarlevor(k.s).length === kv0 && JSON.stringify(k.s.blod ?? null) === blod0],
      [`olyckan och sjukdomen: ${skadad} skadad, ${sjuka} sjuk, ${o.sl.dagbok.filter(x => x[2] === 'skada').length} rader i dagboken, ${notiser} notiser`, skadad === 1 && sjuka >= 1 && o.sl.dagbok.filter(x => x[2] === 'skada').length === 2 && notiser >= 2],
      [`förkylningen räknas på vägen (${sj.q.sjuk ? 'fortfarande sjuk' : SIM.alive(sj.q) ? 'frisk' : 'död'} efter ${timmar} timmar)`, !sj.q.sjuk || !SIM.alive(sj.q)],
      [`den som förblöder dör på vägen (${SIM.alive(d.q) ? 'lever' : 'död'}, ${d.sl.dagbok.filter(x => x[2] === 'dod').length} rad i dagboken, ${SIM.kvarlevor(d.s).length - dkv} kroppar i byn)`, !SIM.alive(d.q) && d.sl.dagbok.some(x => x[2] === 'dod') && SIM.kvarlevor(d.s).length === dkv],
    ];
  },
};

SCENARIER.utvagar = {
  text: 'När någon blir långsam (steg 11.5.17, UTVAGAR i resa.ts): ledaren väger utvägarna (åka på vagnen, rida på ett djur, bår, släppa utrustning, rasta, vända, lämna personen, fortsätta) med en poäng: resans värde minus dygnen i den fart utvägen ger minus det den kostar. Med en häst rider den skadade, med tre friska bärs hen på en bår, en kall ledare lämnar den hen inte tycker om, och det som släpps blir en gömma på kartan som ligger kvar 20 dygn',
  kor: () => {
    const s0 = SIM.cloneState(testBy(3)), vl0 = s0.varld!, vuxna = SIM.living(s0).filter(q => SIM.ageOf(q, s0.now) >= 20 && SIM.ageOf(q, s0.now) < 50);
    const hb = SIM.byPlats(vl0, vl0.huvud!)!, v0 = SIM.varldMark(s0)!;
    const mal = hb.grannar!.map(g => SIM.varldPlatsNr(vl0, g.nr)!).filter(p => p && SIM.vagMellan(vl0, v0, hb.y * v0.w + hb.x, p.y * v0.w + p.x, 'fots', s0.now)).sort((x, y) => Math.hypot(y.x - hb.x, y.y - hb.y) - Math.hypot(x.x - hb.x, x.y - hb.y))[0]!;
    const ny = (antal: number, o: { hast?: boolean; pack?: Record<string, number> } = {}) => {
      const s = SIM.cloneState(s0), folk = vuxna.slice(0, antal).map(q => s.people.find(x => x.id === q.id)!);
      const sl = SIM.nyttSallskap(s, folk[0]!, mal.nr, 'handel')!; for (const q of folk.slice(1)) SIM.foljMed(s.varld!, sl, q);
      for (const x of folk) { SIM.gaBort(s, x); delete x.skador; delete x.sjuk; x.blod = 1; }
      const v = SIM.varldMark(s)!, vag = SIM.vagMellan(s.varld!, v, hb.y * v.w + hb.x, mal.y * v.w + mal.x, 'fots', s.now)!;
      sl.skede = 'ute'; sl.vag = { fran: vag.fran, till: vag.till, steg: vag.steg };
      const r = SIM.vagenRutor(s, sl); sl.pos = Math.floor((r.length - 1) * 0.3); sl.ruta = r[sl.pos]; sl.gang = 0;
      sl.varde = 200; sl.pack = { brod: 60, vattensack: 4, ...o.pack }; sl.behov = { matt: 1, vatska: 1, ork: 1, fulla: 4, foder: 0 };
      if (o.hast) {
        const d: SIM.Tamdjur = { ...(s.tamdjur?.[0] ?? {}), id: 900002, art: 'hast', x: folk[0]!.x, y: folk[0]!.y, fodd: s.now - 5 * SIM.DAY } as SIM.Tamdjur;
        delete (d as { dog?: number }).dog; (s.tamdjur ??= []).push(d); SIM.djurMed(sl, d.id);
      }
      // den sista bröt båda benen
      const sk = folk[antal - 1]!; for (const del of ['benV', 'benH'] as const) SIM.skada(s, sk, del, 'benbrott', 0.9, 'olycka', 'på resan');
      return { s, sl, folk, sk };
    };
    const forst = (x: { s: SIM.State; sl: SIM.Sallskap }) => SIM.utvagVal(x.s, x.sl)?.val[0]?.id;
    const visa = (x: { s: SIM.State; sl: SIM.Sallskap }) => SIM.utvagVal(x.s, x.sl)?.val.map(v => `${v.id} ${Math.round(v.sc)}`).join(', ');
    const hast = ny(2, { hast: true }), bar = ny(4), kall = ny(2), varm = ny(2);
    const fartSkadad = SIM.personFart(bar.s, bar.sk);
    kall.folk[0]!.pot.empati = 0; SIM.getRel(kall.s, kall.folk[0]!, kall.sk).op = -100;
    varm.folk[0]!.pot.empati = 20; SIM.getRel(varm.s, varm.folk[0]!, varm.sk).op = 80;
    const val = [hast, bar, kall, varm].map(forst), texter = [hast, bar, kall, varm].map(visa);
    // utfallen genom spelets eget steg
    const f0 = SIM.sallskapFart(bar.s, bar.sl);
    const kor = (x: { s: SIM.State }, tim: number) => { for (let h = 0; h < tim; h++) { x.s.now += SIM.HOUR; SIM.resaBehov(x.s, SIM.HOUR); } };
    kor(bar, 1); const f1 = SIM.sallskapFart(bar.s, bar.sl), buren = bar.sl.buren?.map(b => b[1]).join(',');
    kor(kall, 1); const ensam = kall.s.varld!.sallskap!.find(x => x !== kall.sl && x.medl.includes(kall.sk.id));
    // den som läkt går själv igen
    delete bar.sk.skador; bar.sk.men = []; kor(bar, 1); const gar = !bar.sl.buren;
    // släppa: en tung last, och det släppta blir en gömma
    const tung = ny(2, { pack: { sten: 30 } }); delete tung.sk.skador; tung.sl.pack.brod = 6;
    const lage = SIM.utvagLage(tung.s, tung.sl)!;
    SIM.UTVAGAR.slappa!.gor(tung.s, tung.sl, lage, tung.s.now);
    const gm = tung.s.varld!.gommor ?? [];
    const lastEfter = SIM.lastFart(tung.s, tung.sl);
    tung.s.now += 21 * SIM.DAY; SIM.resaBehov(tung.s, 600 * SIM.SEC);
    return [
      [`ett mål långt bort (${mal.namn})`, !!mal],
      [`den med brutna ben är långsam (${fartSkadad.toFixed(2)} mot gränsen ${SIM.RESA.langsam})`, fartSkadad < SIM.RESA.langsam],
      [`med en häst rider den skadade (${val[0]}: ${texter[0]})`, val[0] === 'djur'],
      [`med tre friska bärs hen på en bår (${val[1]}: ${texter[1]})`, val[1] === 'bar'],
      [`en kall ledare som inte tycker om hen lämnar hen (${val[2]}: ${texter[2]})`, val[2] === 'lamna'],
      [`en omtänksam ledare som tycker om hen lämnar hen inte (${val[3]}: ${texter[3]})`, val[3] !== 'lamna'],
      [`båren: sällskapet går fortare än i den skadades takt (${f0.toFixed(2)} → ${f1.toFixed(2)}, ${buren})`, buren === 'bar' && f1 > f0],
      [`den som lämnades går hem ensam (${ensam?.skede}, ${kall.sl.medl.includes(kall.sk.id) ? 'kvar' : 'ute ur sällskapet'})`, !!ensam && ensam.skede === 'hemat' && !kall.sl.medl.includes(kall.sk.id)],
      [`den som läkt går själv igen`, gar],
      [`den tunga lasten: ${Object.entries(lage.slapp).map(([k, n]) => `${n} ${k}`).join(', ')} släpps (värde ${Math.round(lage.slappVarde)}), lasten bromsar inte längre (${lastEfter.toFixed(2)})`, Object.keys(lage.slapp).length > 0 && lastEfter === 1 && Object.values(lage.slapp).every(Number.isInteger)],
      [`det släppta blir en gömma på rutan (${gm.length})`, gm.length === 1 && gm[0]!.ruta === tung.sl.ruta],
      [`gömman är borta efter ${SIM.RESA.gommaDygn} dygn (${tung.s.varld!.gommor?.length ?? 0} kvar)`, !(tung.s.varld!.gommor?.length)],
    ];
  },
};
