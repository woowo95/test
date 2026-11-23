// Scenarier för fas 13.
import * as SIM from '../../sim';
import { SCENARIER, klockan, kor, medBank, medHus, medVatska, nyInvanare, setMat, tandEld, testBy, utanWebblasare, vidStack } from './hjalp';
import { GRAFER, grafHtml } from '../../ui/graf';
import { setByn } from '../../ui/lage';
import { BEAT, START } from '../kor';
import { sakOrd } from '../../sim/ord';

// regeln för stationerna (steg 13.1.1): varje recept vid en station med kvalitet är "bara här" eller "fortare och bättre här"
SCENARIER.stationsregel = {
  text: 'Varje recept vid en station som ger kvalitet görs bara där eller fortare och bättre där, och stationerna som bara gör råvaror ger ingen kvalitet (steg 13.1.1)',
  kor: () => {
    const D = SIM.STATIONER as Record<string, SIM.StationDef>;
    const fel: string[] = [];
    for (const k of SIM.STATION_LIST) { const d = D[k]; if (!d.kv) continue; for (const a of d.gor) if (!d.bara?.includes(a) && !((d.fart?.[a] ?? 1) > 1)) fel.push(`${k}:${a}`); }
    const slojd = D.flatarbank;
    const bara = ['rustning', 'hjalm', 'prastdrakt', 'mantel'].every(a => slojd.bara!.includes(a as SIM.Act));
    const fort = ['slunga', 'horn', 'tecken', 'mask'].every(a => !slojd.bara!.includes(a as SIM.Act) && (slojd.fart?.[a as SIM.Act] ?? 1) > 1);
    const ravaror = ['vavstol', 'garvning', 'stenhuggarplats'].every(k => !D[k].kv);
    const s = SIM.createState(1, START);
    const utan = !SIM.kanGoras(s, 'rustning') && SIM.kanGoras(s, 'slunga');
    return [
      [`varje sak vid en station med kvalitet är bara här eller fortare och bättre här${fel.length ? ` (fel: ${fel.join(', ')})` : ''}`, !fel.length],
      ['läderrustningen, hjälmen, prästdräkten och manteln görs bara vid slöjdbänken', bara],
      ['slungan, hornet, tecknet och masken går för hand men fortare vid slöjdbänken', fort],
      ['vävstolen, garvningsställningen och stenhuggarplatsen ger ingen kvalitet', ravaror],
      ['utan slöjdbänk går rustningen inte att göra, men slungan går', utan],
    ];
  },
};

// växte upp vid smedjan (steg 13.1.7)
SCENARIER.smedbarn = {
  text: 'Steg 13.1.7: ett barn som ofta är nära när det smids får upplevelsen Växte upp vid smedjan, som ger lite mer flit, och raden gör en färdighet lättare att lära (lar i UPPLEVELSER): hantverket, där smidet hör hemma',
  kor: () => {
    const s = SIM.createState(5, START);
    const barn = SIM.living(s).find(p => SIM.ageOf(p, s.now) >= SIM.UPPV.fran && SIM.ageOf(p, s.now) < SIM.ALDER.vuxen)
      ?? (() => { const p = SIM.living(s)[0]; p.born = s.now - (SIM.UPPV.fran + 2) * SIM.DAY; return p; })();
    const smed = SIM.living(s).find(q => q !== barn && SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    for (const q of SIM.living(s)) if (q !== barn && q !== smed) { q.x = barn.x + 20; q.task = undefined; }
    const smid = () => { smed.x = barn.x + 2; smed.y = barn.y; smed.task = { act: 'smida', phase: 'do', tx: smed.x, ty: smed.y, until: s.now + SIM.HOUR, carry: 0, why: 'prov' }; };
    // långt borta blir det inget
    smed.x = barn.x + 30; smed.y = barn.y; smed.task = { act: 'smida', phase: 'do', tx: smed.x, ty: smed.y, until: s.now + SIM.HOUR, carry: 0, why: 'prov' };
    for (let i = 0; i < 500; i++) SIM.stepUppvaxt(s);
    const langt = !barn.upp?.some(u => u.k === 'smedjan');
    let timmar = 0;
    for (; timmar < 5000 && !barn.upp?.some(u => u.k === 'smedjan'); timmar++) { smid(); SIM.stepUppvaxt(s); }
    const u = barn.upp?.find(x => x.k === 'smedjan');
    barn.skill.hantverk = barn.skill.samla = 0; SIM.ovning(barn, 'hantverk', 0.01); SIM.ovning(barn, 'samla', 0.01);
    const hv = barn.skill.hantverk, sa = barn.skill.samla;
    return [
      ['barnet får inget när ingen smider nära', langt],
      [`barnet nära den som smider fick upplevelsen efter ${timmar} timmar (${u ? SIM.upplevelseText(u) : 'ingen'})`, !!u],
      [`den ger flit (${JSON.stringify(u?.e ?? {})})`, (u?.e.flit ?? 0) > 0],
      [`hantverket lärs ${(hv / sa).toFixed(2)} gånger så fort som samlandet`, Math.abs(hv / sa - SIM.UPPV.lar) < 1e-6],
    ];
  },
};

// krönikan om järnet (steg 13.1.8)
SCENARIER.kronikajarn = {
  text: 'Steg 13.1.8: det första järnet ur blästerugnen och byns första smedja blir händelser i krönikan (mallarna k_forstaJarn och k_forstaSmedja, åtta varianter var), bara första gången',
  kor: () => {
    const s = SIM.createState(1, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    (p.tek ??= {}).blasterugn = 1;
    const rader = (k: string) => (s.hist?.kronika ?? []).filter(r => r[2] === k);
    const ugn = medBank(s, 'blasterugn'), d = SIM.BRANNINGAR.blasterugn;
    const blas = () => {
      SIM.setStock(s, { malm: d.in.malm * 2, kol: d.in.kol * 2 });
      const tk = () => ({ act: 'blasa', phase: 'do', tx: ugn.x, ty: ugn.y, until: s.now, carry: 0, why: '', ref: ugn.id } as SIM.Task);
      SIM.branningKlar(s, p, tk());
      const b = SIM.branningI(s, ugn)!; b.sedd = 99; s.now = b.slut;
      SIM.branningKlar(s, p, tk());
    };
    blas(); const efterEtt = rader('k_forstaJarn').length; blas(); const efterTva = rader('k_forstaJarn').length;
    const sm = medBank(s, 'smedja'); sm.kvar = 0; delete sm.klar;
    SIM.finishStation(s, p, { act: 'bygga', phase: 'do', tx: sm.x, ty: sm.y, until: s.now, carry: 0, why: '', ref: sm.id } as SIM.Task);
    delete sm.klar; // en smedja till blir klar
    SIM.finishStation(s, p, { act: 'bygga', phase: 'do', tx: sm.x, ty: sm.y, until: s.now, carry: 0, why: '', ref: sm.id } as SIM.Task);
    const smRader = rader('k_forstaSmedja');
    const B = SIM.BERATTELSER as Record<string, unknown[]>;
    return [
      [`det första järnet står i krönikan (${rader('k_forstaJarn')[0]?.[1] ?? 'inget'})`, efterEtt === 1],
      ['nästa blåsning står inte där', efterTva === 1],
      [`byns första smedja står i krönikan (${smRader[0]?.[1] ?? 'inget'})`, smRader.length === 1],
      ['mallarna har minst åtta varianter var, som alla krönikans mallar', [B.k_forstaJarn, B.k_forstaSmedja].every(v => v.length >= 8)],
      ['händelserna hör till Bygge och uppfinningar', ['k_forstaJarn', 'k_forstaSmedja'].every(k => SIM.KRONIKA_KAT.find(c => c.id === 'bygge')?.slag.includes(k))],
    ];
  },
};

// järnet som tecken (steg 13.1.9)
SCENARIER.jarntecken = {
  text: 'Steg 13.1.9: den som tömmer blästerugnen och får ut järn är med om tecknet jarn (det glödande järnet som rann ur ugnen, 0,3 som de vanliga), och tron som blir av det har hantverkets gud, en ande som kan bo i städet (i i TECKEN)',
  kor: () => {
    let tecknet = 0, tron = 0, hantverk = 0, stadet = 0, iJarn = 0, ande = 0;
    for (let f = 1; f <= 12; f++) {
      const s = SIM.createState(f, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
      (p.tek ??= {}).blasterugn = 1; p.andlig = 100; p.tro = undefined;
      const ugn = medBank(s, 'blasterugn'), d = SIM.BRANNINGAR.blasterugn;
      for (let i = 0; i < 40 && p.tro === undefined; i++) {
        SIM.setStock(s, { malm: d.in.malm, kol: d.in.kol });
        const tk = () => ({ act: 'blasa', phase: 'do', tx: ugn.x, ty: ugn.y, until: s.now, carry: 0, why: '', ref: ugn.id } as SIM.Task);
        SIM.branningKlar(s, p, tk());
        const b = SIM.branningI(s, ugn)!; b.sedd = 99; s.now = b.slut + 25 * SIM.HOUR;
        SIM.branningKlar(s, p, tk());
      }
      if ((s.stat?.tecken_jarn ?? 0) > 0) tecknet++;
      const tr = SIM.troOf(s, p.tro);
      if (!tr || tr.k !== 'jarn') continue;
      tron++;
      tr.natur = 10; // en tro på Natur-sidan: guden blir en ande som bor någonstans
      for (let i = 0; i < SIM.TRO.namn; i++) { const q = nyInvanare(s, 'm', 30); q.tro = tr.id; }
      SIM.stepReligion(s);
      const g = tr.gudar?.[0];
      if (g?.omr.includes('hantverk')) hantverk++;
      if (g?.form === 'ande') { ande++; if (SIM.TECKEN.jarn.i.includes(g.i!)) iJarn++; if (g.i === 'städet') stadet++; }
    }
    return [
      [`den som tömmer ugnen är med om tecknet (${tecknet} av 12)`, tecknet === 12],
      [`det blir en tro av det (${tron} av 12)`, tron >= 6],
      [`trons första gud råder över hantverket (${hantverk} av ${tron})`, tron > 0 && hantverk === tron],
      [`anden bor där tecknet säger: städet, ässjans glöd eller den röda myren (${iJarn} av ${ande}, i städet ${stadet})`, ande > 0 && iJarn === ande],
    ];
  },
};

// gnistor från ässjan och fyrfatet (steg 13.1.10)
SCENARIER.assjegnista = {
  text: 'Steg 13.1.10: ässjan och fyrfatet kastar gnistor som härden medan de brinner (gnistor i ELDSTATIONER, HARD_GNISTOR), så att en smedja kan tända något runt sig',
  env: { BALANS: 'karta.bredd=120,karta.hojd=120,start.klader=0,forhist.ar=0,brand.gnista=0.05' }, // fler gnistor, så att det syns på kort tid
  kor: () => {
    const hard = SIM.HEARTHS.find(h => h.id === 'hard')!.spread / SIM.HEARTHS[0].spread;
    const D = SIM.ELDSTATIONER;
    const s = SIM.createState(1, START);
    klockan(s, 13);
    const t = medBank(s, 'smedja'), e = SIM.eldPlatsAv(t);
    s.fire.lit = false;
    let brand: SIM.Brand | undefined;
    for (let i = 0; i < 3000 && !brand; i++) { t.eld = { ...(t.eld ?? {}), lit: 1, ved: D.smedja.max }; s.now += 300000; SIM.torkaTest(s); SIM.brandSteg(s, 300); brand = s.brand?.kalla === 'gnista' ? s.brand : undefined; }
    // släckt ässja: ingen gnista
    const u = SIM.createState(1, START); klockan(u, 13); u.fire.lit = false; medBank(u, 'smedja');
    for (let i = 0; i < 3000 && !u.brand; i++) { u.now += 300000; SIM.torkaTest(u); SIM.brandSteg(u, 300); }
    const nara = !!brand && Math.hypot(brand.x - e.x, brand.y - e.y) <= SIM.BRAND.gnistaR + SIM.BRAND.gnistVind + 3;
    return [
      [`ässjan och fyrfatet gnistrar som härden (${D.smedja.gnistor} och ${D.fyrfat.gnistor}, härden ${hard})`, D.smedja.gnistor === hard && D.fyrfat.gnistor === hard],
      [`en brinnande ässja tänder till sist något intill (${brand ? `vid ${brand.x}, ${brand.y}` : 'ingen'})`, nara],
      ['en släckt ässja tänder inget', u.brand?.kalla !== 'gnista'],
    ];
  },
};

// notisen om en förlorad bränning (steg 13.1.11)
SCENARIER.branningnotis = {
  text: 'Steg 13.1.11: när en kolmila eller en blästerugn ger mindre för att ingen såg till den, får spelaren en notis (branning i NOTISER) med det som kom ut och det som gick förlorat; en bränning som sågs till ger ingen',
  kor: () => {
    const s = SIM.createState(1, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    (p.tek ??= {}).kolmila = 1;
    const t = medBank(s, 'kolmila'), d = SIM.BRANNINGAR.kolmila;
    const branna = (miss: number) => {
      SIM.setStock(s, { ved: d.in.ved });
      const tk = () => ({ act: 'kola', phase: 'do', tx: t.x, ty: t.y, until: s.now, carry: 0, why: '', ref: t.id } as SIM.Task);
      SIM.branningKlar(s, p, tk());
      const b = SIM.branningI(s, t)!; b.sedd = 7; b.miss = miss; s.now = b.slut;
      SIM.branningKlar(s, p, tk());
      return (s.notiser?.lista ?? []).filter(n => n.id === 'branning');
    };
    const hel = branna(0).length, efter = branna(2), n = efter[efter.length - 1];
    return [
      ['en kolmila som sågs till ger ingen notis', hel === 0],
      [`en kolmila där ingen såg till den två gånger ger en notis med det som gick förlorat (${n?.rader.join(' ') ?? 'ingen'})`, efter.length === 1 && n!.n === 1 && n!.rader[0].includes('gick förlorat') && n!.rader[0].includes('två gånger')],
    ];
  },
};

// handlarens järnsaker (steg 13.1.12)
SCENARIER.handlarjarn = {
  text: 'Steg 13.1.12: handlaren kan ha en järnyxa, en järnkniv eller en lie bland varorna (rader i HANDLARVAROR), från en by som kan smida, och priset kommer ur sakens värde, så att en by utan malm och smedja kan köpa redskapen färdiga',
  kor: () => {
    const JARN = ['jarnyxa', 'jarnkniv', 'lie'];
    const s = SIM.cloneState(testBy(10)), r = s.varld!.rader!.find(x => x.nr !== s.varld!.huvud)!;
    const last = (tek: string[], f: number) => { const q = { ...r, tek, tal: { ...r.tal, silver: 1000 } } as typeof r; return SIM.packaRad(q, mulberry(f), () => 10000).varor; };
    let med = 0, utan = 0;
    const kan = [...new Set([...r.tek, 'smedja', 'yxa', 'kniv'])], kanInte = r.tek.filter(t => t !== 'smedja');
    for (let f = 1; f <= 60; f++) { med += last(kan, f).filter(w => JARN.includes(w.k)).length; utan += last(kanInte, f).filter(w => JARN.includes(w.k)).length; }
    const rader = JARN.every(k => SIM.HANDLARVAROR.some(v => v.k === k));
    const pris = JARN.map(k => `${k} ${SIM.grundvarde(k).toFixed(1)}`).join(', ');
    return [
      ['järnyxan, järnkniven och lien är rader bland handlarens varor', rader],
      [`en by som kan smida skickar dem med sin handlare (${med} järnsaker på 60 färder)`, med > 0],
      [`en by som inte kan smida skickar inga (${utan})`, utan === 0],
      [`priset kommer ur sakens värde (${pris})`, JARN.every(k => SIM.grundvarde(k) > 0)],
    ];
  },
};
// järnet i statistiken (steg 13.1.13): järnet och kolet sedan byns början sparas i historiken, och grafen visar dem per år
SCENARIER.jarnstatistik = {
  text: 'Steg 13.1.13: Byns tal får grafen Järn och kol, med järnet som blåsts och kolet som kolats det senaste året (dygnet i verkligheten), ur byns statistik när en bränning töms',
  kor: () => {
    utanWebblasare();
    const s = SIM.createState(5, START), st = (s.stat ??= {}) as Record<string, number>;
    const t0 = s.now;
    st.brant_jarn = 0; st.brant_kol = 0; SIM.historikSteg(s);
    s.now = t0 + SIM.DAY / 2; st.brant_jarn = 3; st.brant_kol = 20; SIM.historikSteg(s);
    s.now = t0 + SIM.DAY + 3600e3; st.brant_jarn = 5; st.brant_kol = 30; SIM.historikSteg(s);
    const ar1 = SIM.historikPerAr(s, 'jarn').at(-1)?.[1], kol1 = SIM.historikPerAr(s, 'kol').at(-1)?.[1];
    s.now = t0 + 2 * SIM.DAY + 2 * 3600e3; st.brant_jarn = 7; SIM.historikSteg(s);
    const ar2 = SIM.historikPerAr(s, 'jarn').at(-1)?.[1];
    const sedan = SIM.historikSerie(s, 'jarn').at(-1)?.[1];
    setByn(s);
    const ritas = !!GRAFER.jarn && grafHtml('jarn').includes(GRAFER.jarn.namn);
    return [
      [`järnet sedan byns början sparas i historiken (${sedan})`, sedan === 7],
      [`järnet det senaste året är 5 efter drygt ett år (${ar1}) och kolet 30 (${kol1})`, ar1 === 5 && kol1 === 30],
      [`ett år senare är det bara ökningen sedan dess som räknas: 7 − 5 = 2 (${ar2})`, ar2 === 2],
      ['grafen Järn och kol finns i Byns tal och ritas', ritas],
    ];
  },
};

const mulberry = (frö: number) => () => { frö = (frö + 0x6D2B79F5) | 0; let t = Math.imul(frö ^ (frö >>> 15), 1 | frö); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// vakarna (steg 13.1.15): ett hål i isen börjar om från 0 cm och fryser igen som resten av sjön
SCENARIER.vak = {
  text: 'Vakarna (steg 13.1.15, is.ts): ett hål som huggits upp är en vak där isen börjar om från 0 cm och växer igen som resten av sjön; den som har en yxa men ingen isborr når vattnet genom vaken när sjöns is är 40 cm, och vaken är borta när isen går upp',
  kor: () => {
    const s = SIM.createState(1, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    SIM.addTool(s, 'yxa', p);
    const plats = SIM.drickPlats(s, p)!; // stranden närmast, innan isen ligger
    s.is = { vatten: 0, cm: 40 } as typeof s.is;
    const utanVak = { val: SIM.halVal(s, p, plats.x, plats.y)?.id, na: SIM.naVattnet(s, p), spot: SIM.drickPlats(s, p) };
    s.is!.cm = 20; SIM.halGjort(s, p, plats.x, plats.y); s.is!.cm = 40; // hålet höggs när isen var 20 cm
    const vak = s.is!.vakar?.[0];
    const medVak = { val: SIM.halVal(s, p, plats.x, plats.y)?.id, na: SIM.naVattnet(s, p), spot: SIM.drickPlats(s, p), min: SIM.halMin(s, p, plats.x, plats.y) };
    // kylan: vaken växer fortare än den tjocka isen men blir aldrig tjockare än sjön
    const fore = vak?.cm ?? -1, sjo0 = s.is!.cm;
    s.now = Date.parse('2027-01-15T08:00:00+01:00'); // mitt i vintern
    const kallt = SIM.temperature(s) < 0;
    for (let i = 0; i < 6; i++) SIM.stepIs(s, 1);
    const efter = s.is!.vakar?.[0]?.cm ?? -1, sjoVaxt = s.is!.cm - sjo0;
    s.is!.cm = 0.01; s.is!.vatten = 0; s.now = Date.parse('2027-05-15T12:00:00+02:00'); SIM.stepIs(s, 24);
    return [
      [`utan vak och utan isborr når yxan inte genom 40 cm is (${utanVak.val ?? 'inget'}, vatten ${utanVak.na})`, !utanVak.val && !utanVak.na && !utanVak.spot],
      [`hålet blir en vak med 0 cm is (${vak ? `${vak.cm} cm vid ${vak.x},${vak.y}` : 'ingen'})`, !!vak && vak.cm === 0],
      [`genom den nyss huggna vaken når hen vattnet utan att hugga (${medVak.val ?? 'inget hål behövs'}, ${medVak.min} minuter, platsen ${medVak.spot ? `${medVak.spot.x},${medVak.spot.y}` : 'ingen'})`, !medVak.val && medVak.na && !!medVak.spot && Math.hypot(medVak.spot.x - plats.x, medVak.spot.y - plats.y) <= SIM.IS.vakNara && medVak.min === 0],
      [`i kylan växer vaken från ${fore} till ${efter.toFixed(2)} cm, fortare än sjön (${sjoVaxt.toFixed(2)} cm), och blir inte tjockare än sjön`, kallt && efter > fore && efter - fore > sjoVaxt && efter <= s.is!.cm + 50],
      [`när isen gått upp finns ingen vak kvar (${s.is!.cm} cm, ${s.is!.vakar?.length ?? 0} vakar)`, s.is!.cm === 0 && !s.is!.vakar],
    ];
  },
};

// alla hudar garvas (steg 13.2.1): varje hud ger hela läderbitar efter sin storlek, med 1 talg per läder och samma tid per hud
SCENARIER.garvning = {
  text: 'Steg 13.2.1: kohud och får-, get-, svin-, rådjurs-, varg- och björnskinn garvas till läder vid garvningsställningen, i hela bitar efter hudens storlek (hare, får, get, svin och rådjur 1, varg och björn 2, kohuden 3), med 1 talg per läder och 5 minuter per hud, och kohuden räcker till tre bitar också i kläderna',
  kor: () => {
    const s = SIM.createState(5, START), p = SIM.living(s)[0]!;
    klockan(s);
    const vantat: Record<string, number> = { skinn: 1, farskinn: 1, getskinn: 1, svinskinn: 1, radjursskinn: 1, vargskinn: 2, bjornskinn: 2, kohud: 3 };
    const fel: string[] = [];
    for (const [hud, n] of Object.entries(vantat)) {
      const act = SIM.garvAct(hud as keyof typeof SIM.GARVHUD), d = SIM.TILLVERKA[act];
      if (!d || d.n !== n || d.av.talg !== n || d.av[hud] !== 1 || d.min !== 5) { fel.push(`${hud}: raden`); continue; }
      SIM.put(s, hud, 1, { [p.id]: 1 }); SIM.put(s, 'talg', n, { [p.id]: n });
      const l0 = SIM.amountOf(s, 'lader'), t0 = SIM.amountOf(s, 'talg'), h0 = SIM.amountOf(s, hud);
      p.task = { act } as SIM.Task; SIM.KLAR_FOR[act]!(s, p, p.task, 0); p.task = undefined;
      const fick = SIM.amountOf(s, 'lader') - l0, talg = t0 - SIM.amountOf(s, 'talg'), huden = h0 - SIM.amountOf(s, hud);
      if (fick !== n || talg !== n || huden !== 1) fel.push(`${hud}: ${fick} läder, ${talg} talg, ${huden} hud`);
    }
    const st = (SIM.STATIONER as Record<string, SIM.StationDef>).garvning;
    const vid = Object.keys(vantat).every(h => { const a = SIM.garvAct(h as keyof typeof SIM.GARVHUD); return st.gor.includes(a) && st.bara!.includes(a) && !!SIM.ACTS[a]; });
    const ko = SIM.KLADMATERIAL.kohud.bit === 3 && SIM.materialTill('rock', 'kohud') === 1;
    return [
      [`varje hud garvas till sina hela läderbitar med 1 talg per läder${fel.length ? ` (fel: ${fel.join('; ')})` : ''}`, !fel.length],
      ['varje hud garvas bara vid garvningsställningen', vid],
      [`kohuden räcker till tre bitar i kläderna (en rock tar ${SIM.materialTill('rock', 'kohud')} kohud)`, ko],
    ];
  },
};

// stövlarna och lädret i skor och bälte (steg 13.2.2): stövlarna hör till skornas grupp, håller dubbelt så länge och skyddar
// benen, lädret värmer mindre än skinnet, och klädseln tar det plagg som har högst poäng
SCENARIER.stovlar = {
  text: 'Steg 13.2.2: stövlarna sys av 2 läder och 1 rep vid slöjdbänken på 5 minuter, hör till skornas grupp, skyddar fötterna och benen och håller dubbelt så länge som skor av läder. Skor och bälte kan göras av läder, lädret värmer 0,7, och den som saknar skor tar på sig det plagg som har högst poäng (stövlarna före skorna, fast skorna står först)',
  kor: () => {
    const S = SIM.SAKER, st = S.stovlar_lader, sk = S.skor_lader;
    const recept = !!st && st.grupp === 'skor' && st.skaffa?.av?.lader === 2 && st.skaffa?.av?.rep === 1 && Object.keys(st.skaffa.av).length === 2 && st.skaffa.min === 5;
    const bank = (SIM.STATIONER as Record<string, SIM.StationDef>).flatarbank, vidBank = bank.gor.includes('skor') && bank.bara!.includes('skor');
    const haller = !!sk && Math.abs(st!.klad!.dygn - 2 * sk.klad!.dygn) < 1e-9;
    const ben = SIM.kladSkyddStrid('stovlar_lader')?.delar.includes('benV') && !SIM.kladSkyddStrid('skor_lader')?.delar.includes('benV');
    const lader = SIM.KLADMATERIAL.lader.varme === 0.7 && !!S.balte_lader && S.balte_lader.skaffa?.av?.lader === 2 && S.balte_lader.gors!.text.startsWith('Syr');
    const ord = sakOrd('stovlar_lader')[1] === 'par stövlar av läder';
    // klädseln: skorna står först bland tingen, men stövlarna har högre poäng
    const s = SIM.createState(5, START), p = SIM.living(s)[0]!;
    klockan(s);
    for (const t of SIM.tingOf(s)) if (t.bar === p.id) t.bar = undefined;
    for (const t of SIM.tingOf(s)) if (SIM.SAKER[t.k]?.klad?.plats === 'fotter') t.bar = -99; // ingen annan fri fotbeklädnad
    const fri = (k: string) => { const t = SIM.addTool(s, k, p); t.bar = undefined; return t; };
    const skor = fri('skor_kaninskinn'), stovlar = fri('stovlar_lader');
    const ps = SIM.plaggPoang(s, p, 'skor_kaninskinn', undefined), pv = SIM.plaggPoang(s, p, 'stovlar_lader', undefined);
    SIM.stepKlader(s);
    const valde = stovlar.bar === p.id && skor.bar !== p.id; // skorna tas av någon annan som också saknar
    return [
      ['stövlarna sys av 2 läder och 1 rep på 5 minuter i skornas grupp', recept],
      ['skorna och stövlarna görs bara vid slöjdbänken', vidBank],
      [`stövlarna håller dubbelt så länge som skorna av läder (${st?.klad?.dygn} mot ${sk?.klad?.dygn} dygn)`, haller],
      ['stövlarna skyddar benen, skorna inte', !!ben],
      ['lädret värmer 0,7 och bältet sys av 2 läder', lader],
      [`orden: "ett ${sakOrd('stovlar_lader')[1]}"`, ord],
      [`den som saknar skor tar stövlarna (poäng ${pv.toFixed(2)}) före skorna (${ps.toFixed(2)}; skorna ${skor.bar === p.id ? 'på' : 'av'}, stövlarna ${stovlar.bar === p.id ? 'på' : 'av'})`, valde],
    ];
  },
};

SCENARIER.barsele = {
  text: 'Steg 13.2.3: bärselen sys av 1 skinn eller 1 läder och 1 rep vid slöjdbänken på 5 minuter. Modern till ett barn under ett år vill ha den på sig (andra inte), lägger barnet i den när hon väljer ett arbete, och barnet följer henne där hon går, så att hon kan amma det; när hon lägger sig lägger hon ner barnet. Axelremmen och ryggsäcken kan sys av läder, och ryggsäcken av läder slits långsammare',
  kor: () => {
    const S = SIM.SAKER, bl = S.barsele_lader, bk = S.barsele_kaninskinn;
    const recept = !!bl && bl.skaffa?.av?.lader === 1 && bl.skaffa?.av?.rep === 1 && bl.skaffa.min === 5 && bk?.skaffa?.av?.skinn === 1;
    const bank = (SIM.STATIONER as Record<string, SIM.StationDef>).flatarbank, vidBank = bank.gor.includes('barsele') && bank.bara!.includes('barsele');
    const lader = !!S.axelrem_lader && !!S.ryggsack_lader && S.ryggsack_lader.klad!.dygn > S.ryggsack_kaninskinn!.klad!.dygn;
    const s = SIM.createState(1, START);
    klockan(s, 10);
    const vuxna = SIM.living(s).filter(x => SIM.ageOf(x, s.now) >= SIM.ALDER.vuxen);
    const mor = vuxna.find(x => x.sex === 'k')!, annan = vuxna.find(x => x !== mor)!;
    const barn = nyInvanare(s, 'm', 0.3); barn.mother = mor.id; barn.x = mor.x; barn.y = mor.y;
    const pm = SIM.plaggPoang(s, mor, 'barsele_kaninskinn', undefined), pa = SIM.plaggPoang(s, annan, 'barsele_kaninskinn', undefined);
    const vill = SIM.REDSKAPMAL.barsele!(s) === 1;
    // slitaget: ryggsäcken av läder slits långsammare för samma börda
    const r1 = SIM.addTool(s, 'ryggsack_kaninskinn', annan), r2 = SIM.addTool(s, 'ryggsack_lader', annan);
    r1.c = r2.c = 1; SIM.slitRygg(s, r1, 1, 100); SIM.slitRygg(s, r2, 1, 100);
    const slits = 1 - r2.c < 1 - r1.c;
    s.ting = SIM.tingOf(s).filter(t => t !== r1 && t !== r2);
    // på sig, och ett arbete
    const sele = SIM.addTool(s, 'barsele_kaninskinn', mor); sele.bar = mor.id; sele.hos = sele.x = sele.y = sele.vid = undefined;
    let i = 0, iSelen = 0, foljer = true, langst = 0; const x0 = mor.x, y0 = mor.y;
    korTillsEnkel(s, () => {
      i++;
      if (barn.task?.act === 'iselen') { iSelen++; if (Math.hypot(barn.x - mor.x, barn.y - mor.y) > 0.01) foljer = false; langst = Math.max(langst, Math.hypot(barn.x - x0, barn.y - y0)); }
      return iSelen > 30 && i > 200;
    }, 6);
    mor.task = { act: 'sova', phase: 'do', tx: mor.x, ty: mor.y, until: s.now + SIM.HOUR, carry: 0, why: '' } as SIM.Task;
    SIM.seleVal(s, mor);
    const ner = barn.task?.act !== 'iselen';
    return [
      ['bärselen sys av 1 skinn eller 1 läder och 1 rep på 5 minuter', recept],
      ['bärselen görs bara vid slöjdbänken', vidBank],
      [`modern vill ha selen på sig (poäng ${pm.toFixed(2)}), den utan spädbarn inte (${pa.toFixed(2)})`, pm > 0 && pa < 0],
      ['byn vill ha en bärsele per mor med ett spädbarn', vill],
      ['axelremmen och ryggsäcken kan sys av läder, och ryggsäcken av läder håller längre och slits långsammare', lader && slits],
      [`modern lägger barnet i selen när hon arbetar (${iSelen} slag av ${i})`, iSelen > 0],
      [`barnet följer modern där hon går, inom räckhåll för amningen (som längst ${langst.toFixed(1)} rutor från där de började)`, foljer],
      ['när modern lägger sig lägger hon ner barnet', ner],
    ];
  },
};
const korTillsEnkel = (s: SIM.State, klart: () => boolean, timmar: number) => { const t0 = s.now; while (!klart() && s.now - t0 < timmar * SIM.HOUR) SIM.step(s, SIM.BEAT); };

SCENARIER.barnklader = {
  text: 'Steg 13.2.4: barnkläderna sys av 2 skinn och 1 rep vid slöjdbänken på 5 minuter, täcker kroppen och benen, värmer som rocken och byxorna (0,4) och skyddar kroppen. Barnet under 10 år tar barnkläderna och inte rocken, och har sedan inga byxor; den som fyllt 10 tar av dem, och de går till ett yngre syskon. Byn räknar rock och byxor bara för dem som fyllt 10',
  kor: () => {
    const S = SIM.SAKER, bk = S.barnklader_kaninskinn;
    const recept = !!bk && bk.skaffa?.av?.skinn === 2 && bk.skaffa?.av?.rep === 1 && bk.skaffa.min === 5;
    const bank = (SIM.STATIONER as Record<string, SIM.StationDef>).flatarbank, vidBank = bank.gor.includes('barnklader') && bank.bara!.includes('barnklader');
    const tacker = SIM.kladPlatser('barnklader_kaninskinn').join() === 'yttre,ben' && Math.abs(bk!.klad!.varme - 0.4) < 1e-9;
    const skydd = ['bal', 'benV'].every(d => SIM.kladSkyddStrid('barnklader_kaninskinn')?.delar.includes(d as never));
    const s = SIM.createState(1, START);
    klockan(s, 10);
    s.people = s.people.filter(x => SIM.ageOf(x, s.now) >= 10); // bara de två syskonen är barn
    const mor = SIM.living(s).find(x => x.sex === 'k' && SIM.ageOf(x, s.now) >= SIM.ALDER.vuxen)!;
    const stor = nyInvanare(s, 'm', 9.9), liten = nyInvanare(s, 'k', 4); stor.mother = liten.mother = mor.id;
    for (const t of SIM.tingOf(s)) if (t.bar === stor.id || t.bar === liten.id) t.bar = undefined;
    for (const t of SIM.tingOf(s)) if (SIM.SAKER[t.k]?.klad && t.bar === undefined) t.bar = -99; // inga andra fria plagg
    const fri = (k: string) => { const t = SIM.addTool(s, k, stor); t.bar = undefined; t.agare = stor.id; return t; };
    const rock = fri('rock_kaninskinn'), byxor = fri('byxor_kaninskinn'), barn = fri('barnklader_kaninskinn');
    SIM.stepKlader(s);
    const valde = barn.bar === stor.id && rock.bar !== stor.id && byxor.bar !== stor.id;
    const mal = SIM.REDSKAPMAL.rock!(s) === SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= 10).length && SIM.REDSKAPMAL.barnklader!(s) === 2;
    stor.born -= 0.2 * SIM.DAY; // fyller 10
    rock.bar = byxor.bar = -99;
    SIM.stepKlader(s);
    const gav = barn.bar !== stor.id && barn.agare === liten.id;
    SIM.stepKlader(s);
    const syskon = barn.bar === liten.id;
    return [
      ['barnkläderna sys av 2 skinn och 1 rep på 5 minuter', recept],
      ['barnkläderna görs bara vid slöjdbänken', vidBank],
      ['de täcker kroppen och benen och värmer 0,4', tacker],
      ['de skyddar kroppen och benen', skydd],
      [`barnet tar barnkläderna, inte rocken eller byxorna (barnkläderna ${barn.bar === stor.id ? 'på' : 'av'}, rocken ${rock.bar === stor.id ? 'på' : 'av'}, byxorna ${byxor.bar === stor.id ? 'på' : 'av'})`, valde],
      ['byn räknar rock för dem som fyllt 10 och barnkläder för barnen', mal],
      ['den som fyllt 10 tar av barnkläderna och ger dem till det yngre syskonet', gav],
      ['syskonet tar på sig dem', syskon],
    ];
  },
};

SCENARIER.snoval = {
  text: 'Steg 13.2.5: snöskorna väljs i snön. Poängen för kläderna har en del för snön, och klädseln byter ett plagg mot ett med högre poäng på samma plats: med snö på marken tar den som har skor på sig snöskorna, och när snön är borta skorna igen',
  kor: () => {
    const s = SIM.createState(1, START), p = SIM.living(s)[0]!;
    klockan(s, 10);
    s.people = [p]; // ingen annan tar skorna som blir lediga
    for (const t of SIM.tingOf(s)) if (SIM.SAKER[t.k]?.klad?.plats === 'fotter' && t.bar !== p.id) t.bar = -99; // inga andra fria på fötterna
    for (const t of SIM.tingOf(s)) if (t.bar === p.id && SIM.SAKER[t.k]?.klad?.plats === 'fotter') t.bar = undefined;
    const ny = (k: string) => { const t = SIM.addTool(s, k, p); t.bar = undefined; return t; };
    const skor = ny('skor_kaninskinn'), sno = ny('snoskor_kaninskinn');
    skor.bar = p.id;
    s.vader = { ...(s.vader ?? {}), sno: 0.8 } as SIM.State['vader'];
    SIM.stepKlader(s);
    const iSnon = sno.bar === p.id && skor.bar !== p.id;
    const pSno = SIM.plaggPoang(s, p, 'snoskor_kaninskinn', undefined), pSkor = SIM.plaggPoang(s, p, 'skor_kaninskinn', undefined);
    s.vader = { ...s.vader!, sno: 0 };
    SIM.stepKlader(s);
    const utan = skor.bar === p.id && sno.bar !== p.id;
    SIM.stepKlader(s);
    const stilla = skor.bar === p.id; // inget byte fram och tillbaka
    return [
      [`i snön tar hen av skorna och på snöskorna (poäng ${pSno.toFixed(2)} mot ${pSkor.toFixed(2)})`, iSnon],
      ['när snön är borta tar hen skorna igen', utan],
      ['och byter inte tillbaka utan skäl', stilla],
    ];
  },
};

SCENARIER.kudde = {
  text: 'Steg 13.3.1: ylletäcket och fjäderkudden, två tillbehör i halmbädden och sängen som görs av den som kan vävstolen. Täcket värmer mer än fällen, och bara det varmaste i bädden värmer; kudden värmer inte men den som sover på den vilar 1,1 gånger så fort',
  kor: () => {
    const { TILLBEHOR, PROJEKT, varmeDelar, roomAt } = SIM;
    const s = SIM.createState(1, START); klockan(s); tandEld(s); medHus(s);
    const b = medBank(s, 'halmbadd');
    for (const r of s.people) r.tek = { ...r.tek, halmbadd: 1, vavstol: 1 };
    setMat(s, { bar: 200 }); SIM.setAmount(s, 'ylle', 4); SIM.setAmount(s, 'fjadrar', 4); SIM.setAmount(s, 'lintyg', 2); SIM.setAmount(s, 'ved', 30);
    const brist0 = PROJEKT.ylletacke!.brist(s), brist0k = PROJEKT.kudde!.brist(s);
    let h = 0;
    while (!(b.med?.includes('ylletacke') && b.med?.includes('kudde')) && h < 72) { kor(s, 1); h++; }
    // den som sover i bädden med olika tillbehör: kylan och vilan under en timme
    const sover = (med: string[]) => {
      const q = SIM.cloneState(s), t = q.stationer!.find(r => r.id === b.id)!, p = SIM.living(q)[0]!;
      t.med = med as typeof t.med;
      p.x = t.x + 0.5; p.y = t.y + 0.5; p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: q.now + SIM.HOUR, carry: 0 } as SIM.Task;
      const kyla = varmeDelar(q, p, 1, new Map([[roomAt(q, p.x, p.y)!.id, 1]])).kyla;
      p.rest = 0.1; const r0 = p.rest;
      for (let i = 0; i < 3; i++) { p.task!.until = q.now + SIM.HOUR; SIM.step(q, BEAT); }
      return { kyla, vila: p.rest - r0, tacker: SIM.tillbehorTacker(t) };
    };
    const utan = sover([]), fall = sover(['skinnfall']), tacke = sover(['ylletacke']), bada = sover(['skinnfall', 'ylletacke']), kudde = sover(['kudde']), allt = sover(['skinnfall', 'kudde']);
    const nara = (a: number, x: number) => Math.abs(a - x) < 1e-9;
    return [
      [`byn vill ha täcke och kudde när bädden saknar dem (brist ${brist0.toFixed(2)} och ${brist0k.toFixed(2)})`, brist0 === 1 && brist0k === 1],
      [`täcket och kudden görs och hamnar i bädden på ${h} timmar (${(b.med ?? []).join(', ')})`, !!b.med?.includes('ylletacke') && !!b.med?.includes('kudde')],
      ['de görs av den som kan vävstolen', TILLBEHOR.ylletacke.tek.includes('vavstol') && TILLBEHOR.kudde.tek.includes('vavstol')],
      [`täcket värmer mer än fällen (kyla ${tacke.kyla.toFixed(3)} mot ${fall.kyla.toFixed(3)}, utan ${utan.kyla.toFixed(3)})`, utan.kyla > 0 && nara(tacke.kyla, utan.kyla * (1 - TILLBEHOR.ylletacke.varme)) && tacke.kyla < fall.kyla],
      ['bara det varmaste tillbehöret i bädden värmer', nara(bada.kyla, tacke.kyla)],
      [`kudden värmer inte (kyla ${kudde.kyla.toFixed(3)})`, nara(kudde.kyla, utan.kyla) && nara(allt.kyla, fall.kyla)],
      [`vilan på kudden är ${(kudde.vila / utan.vila).toFixed(3)} gånger den utan (${kudde.vila.toFixed(4)} mot ${utan.vila.toFixed(4)})`, utan.vila > 0 && Math.abs(kudde.vila / utan.vila - TILLBEHOR.kudde.vila) < 0.01],
      ['en bädd med bara kudde ritas utan täcke, med fäll eller täcke med', !kudde.tacker && allt.tacker && tacke.tacker],
    ];
  },
};

SCENARIER.tygtrad = {
  text: 'Steg 13.3.4: tråden i sömnaden. Varje plagg av lin eller ylle tar 1 tråd av samma slag som tyget, och en bennål måste ligga på slöjdbänken när det sys, som bensylen för skinnkläderna; järnnålen duger som bennålen',
  kor: () => {
    const s = SIM.createState(1, START); klockan(s);
    const bank = medBank(s, 'flatarbank'), p = SIM.living(s)[0]!;
    p.tek = { ...p.tek, vavstol: 1, skinnklader: 1, flatarbank: 1 };
    for (const t of SIM.tingOf(s)) if (t.k === 'nal' || t.k === 'jarnnal') t.k = 'ben';
    SIM.setAmount(s, 'lintyg', 6); SIM.setAmount(s, 'trad', 3); SIM.setAmount(s, 'ylle', 6); SIM.setAmount(s, 'ulltrad', 3); SIM.setAmount(s, 'rep', 3);
    p.x = SIM.vidStation(bank).x; p.y = SIM.vidStation(bank).y;
    const tun = SIM.SAKER.tunika_lintyg!.skaffa!.av!, man = SIM.SAKER.mantel_ylle!.skaffa!.av!, rock = SIM.SAKER.rock_kaninskinn!.skaffa!.av!;
    const utan = SIM.canMake(s, p, 'tunika_lintyg');
    const nal = SIM.addTool(s, 'nal', p); nal.bar = undefined; nal.hos = undefined; SIM.nyttVid(s, nal);
    const vidBank = nal.vid === bank.id, med = SIM.canMake(s, p, 'tunika_lintyg');
    nal.vid = undefined; nal.k = 'ben';
    const jn = SIM.addTool(s, 'jarnnal', p); jn.hos = undefined;
    const jarn = SIM.canMake(s, p, 'tunika_lintyg');
    return [
      [`en tunika av lin tar 1 lintråd utöver tyget (${JSON.stringify(tun)})`, tun.trad === 1 && tun.lintyg === 3],
      [`en mantel av ylle tar 1 ulltråd (${JSON.stringify(man)})`, man.ulltrad === 1],
      ['skinnkläderna tar ingen tråd', !rock.trad && !rock.ulltrad],
      ['utan nål på bänken sys inget av tyg', !utan],
      ['en ny bennål läggs på slöjdbänken, och med den sys tunikan', vidBank && med],
      ['järnnålen duger som bennålen', jarn],
    ];
  },
};

SCENARIER.fargning = {
  text: 'Steg 13.3.2: färgningen. Den som kan Färgning badar ett plagg av lin eller ylle vid örtköket med växterna, vattnet ur en fylld säck och en ledig lerkruka; plagget får färgen ("Blå tunika av lin"), och ett blått plagg som badas i gult blir grönt',
  kor: () => {
    const s = SIM.createState(1, START); klockan(s); tandEld(s);
    const ort = medBank(s, 'ortkok'), p = SIM.living(s)[0]!;
    for (const q of SIM.living(s)) q.tek = { ...q.tek, fargning: 0 };
    p.tek = { ...p.tek, fargning: 1, ortkok: 1, vavstol: 1, kruka: 1 };
    setMat(s, { kott: 200 });
    for (const k of ['naver', 'malm', 'bar', 'rolleka', 'mara', 'krapp', 'vejde']) SIM.setAmount(s, k, 0);
    const tun = SIM.addTool(s, 'tunika_lintyg', p); tun.bar = p.id; tun.x = tun.y = undefined;
    const kruka = SIM.addTool(s, 'lerkruka_mellan', p); kruka.hos = undefined;
    const sack = SIM.addTool(s, 'vattensack', p); sack.hos = undefined;
    const fyll = () => { sack.inne = { v: 'vatten', n: 3 } as typeof sack.inne; };
    fyll();
    const utanVaxter = SIM.fargVal(s, p);
    SIM.setAmount(s, 'vejde', 2);
    const val = SIM.fargVal(s, p);
    // badet vid örtköket
    const bada = (bad: string) => {
      p.x = SIM.vidStation(ort).x; p.y = SIM.vidStation(ort).y;
      SIM.fargaKlar(s, p, { act: 'farga', phase: 'do', tool: bad, ref: tun.id } as SIM.Task);
    };
    bada('blatt');
    const bla = tun.farg, namn = SIM.tingNamn(tun), vejdeKvar = SIM.amountOf(s, 'vejde'), sackKvar = sack.inne?.n ?? 0, krukaKvar = !!SIM.ledigKruka(s);
    fyll(); SIM.setAmount(s, 'rolleka', 2);
    bada('gult');
    const gron = tun.farg;
    const lin = SIM.tarFarg('tunika_lintyg'), skinn = SIM.tarFarg('rock_kaninskinn');
    const varde = SIM.tingVarde(tun), ofargad = SIM.tingVarde({ ...tun, farg: undefined });
    return [
      ['utan växter badas inget', !utanVaxter],
      [`med vejde vill hen bada sin tunika blå (${val?.bad} → ${val?.blir})`, val?.bad === 'blatt' && val.blir === 'blatt' && val.t.id === tun.id],
      [`tunikan blir blå och heter "${namn}"`, bla === 'blatt' && namn === 'Blå tunika av lin'],
      [`badet tar 2 vejde och vattnet ur säcken, krukan står kvar tom (vejde ${vejdeKvar}, vatten ${sackKvar}, kruka ${krukaKvar})`, vejdeKvar === 0 && sackKvar === 3 - SIM.RECEPTVATTEN && krukaKvar],
      [`den blå tunikan badad i gult blir grön (${gron})`, gron === 'gront'],
      ['lin tar färg, skinn gör det inte', lin && !skinn],
      [`det färgade plagget är värt mer (${varde.toFixed(2)} mot ${ofargad.toFixed(2)})`, varde > ofargad],
    ];
  },
};

SCENARIER.fargmatta = {
  text: 'Steg 13.3.3: mattorna färgas. Ägarens matta badas vid örtköket med samma växter, kruka och tid som ett plagg. Färgat pynt räknas för var och en efter hens smak för färgen: upp till ett kvalitetssteg finare eller sämre, för ägarens trivsel och för intrycket hos den som ser det, och under usel trivs ägaren inte. Mattan ger inget anseende',
  kor: () => {
    const { bedTile, stepPynt, intryckOm } = SIM;
    const s = SIM.createState(6, START); klockan(s); tandEld(s); medHus(s); setMat(s, { kott: 200 });
    const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen && bedTile(s, q) !== undefined)!;
    const v = SIM.living(s).find(q => q !== p)!;
    const ort = medBank(s, 'ortkok');
    p.tek = { ...p.tek, fargning: 1, ortkok: 1 };
    const ruta = bedTile(s, p)!, x = ruta % SIM.W, y = Math.floor(ruta / SIM.W);
    const m = { id: 9e5, k: 'matta_liten_lin', x, y, kvar: 0, ag: p.id, inne: 1, q: 2 } as SIM.Station;
    s.stationer!.push(m);
    s.ting = (s.ting ?? []).filter(t => !(t.agare === p.id && t.k.startsWith('lerkruka_'))); // bara mattan är pynt
    const kruka = SIM.addTool(s, 'lerkruka_mellan', v); kruka.hos = undefined;
    const sack = SIM.addTool(s, 'vattensack', p); sack.hos = undefined; sack.inne = { v: 'vatten', n: 3 } as typeof sack.inne;
    for (const k of ['naver', 'malm', 'bar', 'rolleka', 'mara', 'krapp']) SIM.setAmount(s, k, 0);
    SIM.setAmount(s, 'vejde', 2);
    p.smak = { ...p.smak, 'f:blatt': 1 };
    const val = SIM.fargVal(s, p);
    const ans0 = SIM.ryktbarhet(s, p.id).a;
    p.x = SIM.vidStation(ort).x; p.y = SIM.vidStation(ort).y;
    SIM.fargaKlar(s, p, { act: 'farga', phase: 'do', tool: 'matta:blatt', ref: m.id } as SIM.Task);
    const bla = m.farg, vejde = SIM.amountOf(s, 'vejde'), ans1 = SIM.ryktbarhet(s, p.id).a;
    // i rummet: ägaren och den som ser mattan, med olika smak för färgen
    const prova = (farg: string | undefined, q: number, agSmak: number, serSmak: number) => {
      const k2 = SIM.cloneState(s), p2 = k2.people.find(r => r.id === p.id)!, v2 = k2.people.find(r => r.id === v.id)!, t2 = k2.stationer!.find(t => t.id === m.id)!;
      t2.farg = farg; t2.q = q; p2.thoughts = []; v2.intryck = [];
      p2.smak = { 'f:blatt': agSmak }; v2.smak = { 'f:blatt': serSmak };
      for (const r of [p2, v2]) { r.x = x + 0.5; r.y = y + 0.5; r.task = undefined; }
      stepPynt(k2);
      const e = intryckOm(v2, p2.id, 'smakfull');
      return { glad: p2.thoughts.find(t => t.text === SIM.PYNT_TANKE)?.v ?? 0, syn: e ? e.v * e.c : 0 };
    };
    const ofargad = prova(undefined, 2, 1, 1), gillar = prova('blatt', 2, 1, 0), ogillar = prova('blatt', 2, 0, -1), avsmakUsel = prova('blatt', 0, -1, 0), neutral = prova('blatt', 2, 0, 0);
    return [
      [`hen som tycker om blått vill bada sin matta blå (${val?.t.matta ? 'matta' : 'plagg'}, ${val?.blir})`, !!val?.t.matta && val.blir === 'blatt'],
      [`mattan blir blå med ett bad och 2 vejde (${bla}, vejde kvar ${vejde})`, bla === 'blatt' && vejde === 0],
      [`ägaren som tycker om färgen trivs mer än med en ofärgad matta (${gillar.glad.toFixed(3)} mot ${ofargad.glad.toFixed(3)})`, gillar.glad > ofargad.glad],
      [`den som ogillar färgen får ett svagare intryck än den som inte bryr sig (${ogillar.syn.toFixed(4)} mot ${neutral.syn.toFixed(4)})`, ogillar.syn < neutral.syn && neutral.syn > 0],
      [`en färg utan smak ändrar inget (${neutral.glad.toFixed(3)} mot ${ofargad.glad.toFixed(3)})`, Math.abs(neutral.glad - ofargad.glad) < 1e-9],
      [`ägaren med avsmak för färgen och en usel matta trivs inte (${avsmakUsel.glad})`, avsmakUsel.glad === 0],
      [`anseendet är detsamma (${ans0.toFixed(4)} och ${ans1.toFixed(4)})`, Math.abs(ans0 - ans1) < 1e-9],
    ];
  },
};

SCENARIER.fargsmak = {
  text: 'Steg 13.3.5: var smaken för en färg kommer ifrån (FARGSMAK): födseln, barndomen, förebilden och samtalet, minnena, tron och seden Tradition mot Förnyelse. Smaken bleknar inte av sig själv, och när en färg växer sjunker de andra',
  kor: () => {
    const s = SIM.createState(6, START); klockan(s); setMat(s, { kott: 200 });
    const folk = SIM.living(s), vuxna = folk.filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen);
    for (const q of folk) { q.smak = {}; q.tro = undefined; }
    const ga = (q: SIM.Person, x: number, y: number) => { q.x = x + 0.5; q.y = y + 0.5; };
    const pa = (q: SIM.Person, farg: string) => { const t = SIM.addTool(s, 'tunika_lintyg', q); t.bar = q.id; t.x = t.y = undefined; t.farg = farg; return t; };
    const [pr, tr2, rovare, ny] = vuxna;
    // tron: prästen i en tro med en åskgud får tycke för blått, mer än en vanlig troende
    const tro = { id: 77, prast: pr.id, gudar: [{ omr: ['aska'], namn: 'Dunvald', form: 'gud', t: s.now, ar: 0, bekr: s.now, ber: '' }] } as unknown as SIM.Tro;
    s.tron = [tro]; pr.tro = 77; tr2.tro = 77; pr.troStyrka = 100; tr2.troStyrka = 100;
    for (let i = 0; i < 48; i++) SIM.stepFargsmak(s, 1);
    const prBla = SIM.smakAv(pr, 'f:blatt'), trBla = SIM.smakAv(tr2, 'f:blatt'), trosFarg = SIM.trosFarg(s, 77);
    // prästen badar sitt plagg blått
    const ort = medBank(s, 'ortkok'); pr.tek = { ...pr.tek, fargning: 1, ortkok: 1 };
    const tun = SIM.addTool(s, 'tunika_lintyg', pr); tun.bar = pr.id; tun.x = tun.y = undefined;
    const kr = SIM.addTool(s, 'lerkruka_mellan', pr); kr.hos = undefined;
    const sack = SIM.addTool(s, 'vattensack', pr); sack.hos = undefined; sack.inne = { v: 'vatten', n: 3 } as typeof sack.inne;
    for (const k of ['naver', 'malm', 'bar', 'rolleka', 'mara', 'krapp']) SIM.setAmount(s, k, 0);
    SIM.setAmount(s, 'vejde', 2); SIM.setAmount(s, 'rolleka', 2);
    const val = SIM.fargVal(s, pr);
    void ort;
    s.tron = []; for (const q of folk) q.tro = undefined;
    // barndomen: barnet nära en förälder som bär gult får tycke för gult
    const barn = folk.find(q => SIM.ageOf(q, s.now) < SIM.ALDER.vuxen && folk.some(f => SIM.isParent(f, q)));
    let barnGult = 0;
    if (barn) {
      const f = folk.find(q => SIM.isParent(q, barn))!; pa(f, 'gult');
      for (const q of folk) ga(q, 80 + q.id * 15 % 60, 80);
      ga(f, 50, 50); ga(barn, 51, 50);
      for (let i = 0; i < 24; i++) SIM.stepFargsmak(s, 1);
      barnGult = SIM.smakAv(barn, 'f:gult');
      for (const t of SIM.tingOf(s)) if (t.bar === f.id && t.farg) t.bar = undefined;
    }
    // Förnyelsen: den som drar åt Förnyelse tappar smaken för en färg när de flesta bär den
    ny.pot = { ...ny.pot, nyfikenhet: 100, intelligens: 100 };
    ny.smak = { 'f:brunt': 0.6 };
    const lean = SIM.drarSed(s, ny, 'nyfikenhet');
    const bruna = folk.filter(q => q !== ny).map(q => pa(q, 'brunt'));
    for (const q of folk) ga(q, 20 + (q.id * 7) % 40, 20 + (q.id * 3) % 10);
    ga(ny, 5, 100); // långt bort från förebilderna
    for (let i = 0; i < 24; i++) SIM.stepFargsmak(s, 1);
    const nyBrunt = SIM.smakAv(ny, 'f:brunt');
    for (const t of bruna) t.bar = undefined;
    // minnena: den som rånas av någon i rött får avsmak för rött
    const offer = vuxna.find(q => q !== rovare && q !== ny)!;
    offer.smak = {};
    pa(rovare, 'rott');
    SIM.handelse(s, rovare, 'ranVald', offer, 'mat');
    const offerRott = SIM.smakAv(offer, 'f:rott');
    // när en färg växer sjunker de andra; och smaken bleknar inte av sig själv
    const q = vuxna[vuxna.length - 1]; q.smak = { 'f:gult': 0.5, 'f:svart': 0.3 };
    SIM.fargSmaka(q, 'blatt', 0.4);
    const sum = SIM.smakAv(q, 'f:gult') + SIM.smakAv(q, 'f:svart'), gult0 = SIM.smakAv(q, 'f:gult');
    for (const t of SIM.tingOf(s)) if (t.farg) t.bar = undefined;
    for (const r of folk) ga(r, 10 + r.id * 3, 10);
    for (let i = 0; i < 48; i++) SIM.stepFargsmak(s, 1);
    const gult1 = SIM.smakAv(q, 'f:gult');
    return [
      [`trons färg för åskguden är blått (${trosFarg})`, trosFarg === 'blatt'],
      [`prästen får tycke för blått, mer än en vanlig troende (${prBla.toFixed(3)} mot ${trBla.toFixed(3)})`, prBla > trBla && trBla > 0],
      [`prästen vill bada sin tunika blå (${val?.blir})`, val?.blir === 'blatt'],
      [`barnet nära en förälder i gult får tycke för gult (${barnGult.toFixed(3)})`, !barn || barnGult > 0],
      [`den som drar åt Förnyelse (${lean.toFixed(2)}) tappar smaken för brunt när de flesta bär det (0,6 → ${nyBrunt.toFixed(3)})`, lean > 0 && nyBrunt < 0.6],
      [`den som rånas av någon i rött får avsmak för rött (${offerRott.toFixed(2)})`, offerRott < 0],
      [`när blått växer sjunker de andra lika mycket tillsammans (gult och svart ${sum.toFixed(2)}, var 0,80)`, Math.abs(sum - 0.4) < 1e-6],
      [`smaken bleknar inte av sig själv (${gult0.toFixed(3)} och ${gult1.toFixed(3)})`, Math.abs(gult0 - gult1) < 1e-9],
    ];
  },
};

// dryckeshornet (steg 13.4.1): signalhornet och dryckeshornet görs av ett djurhorn, och den som dricker tar sitt eget horn, sedan byns
SCENARIER.djurhorn = {
  text: 'Signalhornet och dryckeshornet görs av 1 djurhorn, dryckeshornet fortare och bättre vid slöjdbänken; den som dricker vin tar sitt eget horn före byns och får en liten glad tanke, större på festdagen, och hornet slits för varje dryck (steg 13.4.1)',
  kor: () => {
    const S = SIM.SAKER as Record<string, SIM.SakDef>, slojd = (SIM.STATIONER as Record<string, SIM.StationDef>).flatarbank;
    const recept = S.horn.skaffa!.av?.djurhorn === 1 && !S.horn.skaffa!.av?.ben && S.dryckeshorn.skaffa!.av?.djurhorn === 1 && S.dryckeshorn.skaffa!.min === 3;
    const bank = slojd.gor.includes('dryckeshorn' as SIM.Act) && !slojd.bara?.includes('dryckeshorn' as SIM.Act) && (slojd.fart?.['dryckeshorn' as SIM.Act] ?? 1) > 1;
    const s = SIM.createState(1, START), vuxna = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen), p = vuxna[0]!;
    medVatska(s, p, 'lerkruka_stor', 'vin', 200);
    const glad = () => p.thoughts.filter(t => t.k === 'egetHorn').reduce((a, t) => a + t.v, 0);
    const drick = () => { p.thoughts = []; p.rus = 0; SIM.drickAlkohol(s, p, 'vin'); return glad(); };
    const utan = drick(); // inget horn: vinet dricks ändå, utan tanken
    const byns = SIM.addTool(s, 'dryckeshorn', p); byns.agare = SIM.BYN; byns.hos = undefined;
    const medByns = drick(), bynsSlits = byns.c < 1;
    const eget = SIM.addTool(s, 'dryckeshorn', p); eget.hos = undefined;
    const cByns = byns.c, medEget = drick(), egetForst = eget.c < 1 && byns.c === cByns;
    s.fest = { tro: 1, namn: 'Festen', dag: Math.floor(s.now / SIM.DAY), x: p.x, y: p.y, at: 0, fram: [], vann: {} } as unknown as typeof s.fest;
    const paFest = drick(); s.fest = undefined;
    let n = 1; while (SIM.tingOf(s).includes(eget) && n < 1000) { if (SIM.amountOf(s, 'vin') < 2) medVatska(s, p, 'lerkruka_stor', 'vin', 200); drick(); n++; }
    const haller = Math.round(1 / SIM.RUS.hornSlits);
    for (const q of vuxna) q.supit = 1;
    const vill = SIM.villAv(s, 'dryckeshorn'), villTal = Math.ceil(vuxna.length / SIM.VILLTAL.hornPerDrickare);
    return [
      ['signalhornet och dryckeshornet görs av 1 djurhorn (dryckeshornet på 3 minuter)', recept],
      ['dryckeshornet går för hand men fortare och bättre vid slöjdbänken', bank],
      [`utan horn dricks vinet utan tanken (${utan})`, utan === 0 && SIM.amountOf(s, 'vin') >= 0],
      [`ur byns horn ingen glad tanke, men hornet slits (${medByns}, ${bynsSlits})`, medByns === 0 && bynsSlits],
      [`det egna hornet tas före byns och ger en glad tanke (${medEget.toFixed(3)})`, egetForst && Math.abs(medEget - SIM.RUS.hornGlad) < 1e-9],
      [`på festdagen är tanken större (${paFest.toFixed(3)})`, paFest > medEget * 2],
      [`hornet går sönder efter ungefär ${haller} drycker (${n})`, !SIM.tingOf(s).includes(eget) && Math.abs(n - haller) <= haller * 0.25],
      [`byn vill ha ett horn per ${SIM.VILLTAL.hornPerDrickare} som dricker (${vill} för ${vuxna.length})`, vill >= villTal && villTal > 0],
    ];
  },
};

// järnpilen och fjädrarna (steg 13.4.2): varje sats om 4 pilar tar 1 fjäder, och järnpilarna smids vid smedjan och skadar mer
SCENARIER.jarnpil = {
  text: 'Varje sats om 4 pilar tar 1 fjäder; järnpilarna smids vid smedjan av ved, järn och en fjäder, skadar 1,25 gånger så mycket, och skytten skjuter dem före flintpilarna (steg 13.4.2)',
  kor: () => {
    const R = SIM.RECEPT, T = SIM.TILLVERKA, smedja = (SIM.STATIONER as Record<string, SIM.StationDef>).smedja;
    const recept = R.pilar.av.fjadrar === 1 && R.pilar.av.flinta === 1 && T.gor_pilar.av.fjadrar === 1 && T.gor_pilar.n === 4
      && R.jarnpilar.av.ved === 1 && R.jarnpilar.av.jarn === 1 && R.jarnpilar.av.fjadrar === 1 && T.smida_pilar.n === 4 && T.smida_pilar.min === 3 && T.smida_pilar.tek === 'bage';
    const vidSmedjan = smedja.gor.includes('smida_pilar' as SIM.Act) && !!smedja.bara?.includes('smida_pilar' as SIM.Act);
    const s = SIM.createState(1, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    const utanSmedja = !SIM.kanGoras(s, 'smida_pilar' as SIM.Act);
    s.ting = SIM.tingOf(s).filter(t => !SIM.MANNISKOVAPEN.includes(t.k as never)); SIM.addTool(s, 'bage', p);
    SIM.gain(s, p, 'pilar', 8);
    const flint = SIM.personKampe(s, p, 1, 0, 0, 0);
    SIM.gain(s, p, 'jarnpilar', 8);
    const jarn = SIM.personKampe(s, p, 1, 0, 0, 0);
    const st = { logg: [1, 2, 3, 4].map(t => ({ t, h: 'traff', a: jarn.id, b: 2, v: 'bage', kast: 1 })) } as unknown as SIM.Strid;
    SIM.slitKastat(s, p, st, jarn as unknown as SIM.Kampe);
    const kvarJarn = SIM.amountOf(s, 'jarnpilar') + SIM.paMarken(s, 'jarnpilar'), kvarFlint = SIM.amountOf(s, 'pilar') + SIM.paMarken(s, 'pilar');
    return [
      ['pilarna tar 1 fjäder per sats om 4, och järnpilarna 1 ved, 1 järn och 1 fjäder, 4 på 3 minuter med Pilbåge', recept],
      ['järnpilarna smids vid smedjan och bara där', vidSmedjan && utanSmedja],
      [`järnpilen skadar ${SIM.PILSLAG.jarnpilar()} gånger så mycket som flintpilen`, SIM.PILSLAG.jarnpilar() === 1.25 && SIM.PILSLAG.pilar() === 1],
      [`skytten tar flintpilarna när det bara finns sådana (${flint.vapen}, ${flint.pil}) och järnpilarna före dem (${jarn.pil})`, flint.vapen === 'bage' && flint.pil === 'pilar' && jarn.pil === 'jarnpilar'],
      [`de skjutna pilarna är av det slag som sköts (järnpilar ${kvarJarn}, flintpilar ${kvarFlint})`, kvarJarn <= 8 && kvarJarn >= 4 && kvarFlint === 8],
    ];
  },
};

// fångstgropen där rådjuren går (steg 13.4.3): platsen och fångsten följer rådjursgrupperna, inte viltkartan med hararna
SCENARIER.gropplats = {
  text: 'Fångstgropen grävs nära rådjurens väg och fångar där rådjuren går förbi, inte där det bara finns harar (steg 13.4.3)',
  kor: () => {
    const s = SIM.createState(1, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    const gs = SIM.radjurGrupper(s), R = SIM.MJARDE.sattUtR + SIM.RADJUR.vagR + 2;
    let langt: { x: number; y: number } | undefined;
    for (let y = 2; y < SIM.H - 2 && !langt; y += 4) for (let x = 2; x < SIM.W - 2; x += 4) if (gs.every(g => Math.hypot(g.x - x, g.y - y) > R)) { langt = { x, y }; break; }
    const utan = !!langt && !SIM.fallPlats(s, langt, 'grop');
    const g0 = SIM.radjurGrupper(s)[0]!; p.x = g0.x + 12; p.y = g0.y; // den som gräver är en bit från en rådjursgrupp
    const at = SIM.fallPlats(s, p, 'grop')!, vag0 = SIM.radjurNara(s, at.x, at.y);
    // en ruta med harar men utan rådjur: den med mest vilt i viltkartan av dem som ligger långt från rådjurens väg
    let hare: { x: number; y: number } | undefined, hv = 0;
    for (let y = 2; y < SIM.H - 2; y++) for (let x = 2; x < SIM.W - 2; x++) {
      if (SIM.iByn(s, x, y) || SIM.radjurGrupper(s).some(g => Math.hypot(g.x - x, g.y - y) < 60)) continue; // långt från rådjuren
      const v = SIM.richness(s, 'jakt', x, y); if (v > hv) { hv = v; hare = { x, y }; }
    }
    s.mjardar = [];
    const vid = SIM.sattVid(s, p, 'grop', at.x, at.y), harar = SIM.sattVid(s, p, 'grop', hare!.x, hare!.y);
    let nara = 0; const fangst = new Map<SIM.Mjarde, number>();
    for (let h = 0; h < 60; h++) { // samma stund prövad många timmar, medan rådjuren står kvar
      nara += SIM.radjurNara(s, at.x, at.y); SIM.stepMjardar(s, 3600);
      for (const m of s.mjardar) { fangst.set(m, (fangst.get(m) ?? 0) + m.n); m.fisk = {}; m.n = 0; } // vittjas varje timme
    }
    const fVid = fangst.get(vid) ?? 0, fHarar = fangst.get(harar) ?? 0;
    return [
      ['utan rådjur inom räckhåll grävs ingen grop', utan],
      [`gropen grävs där rådjuren går (${vag0} rådjur nära, ${Math.round(Math.hypot(at.x - p.x, at.y - p.y))} rutor bort)`, vag0 > 0],
      [`rådjur stod nära gropen ${nara} gånger (en gång per timme och rådjur)`, nara > 0],
      [`det fångade rådjuret är borta ur flocken (${SIM.radjurNara(s, at.x, at.y)} kvar nära av ${vag0})`, fVid === 0 || (s.djurDoda?.length ?? 0) >= fVid],
      [`gropen på rådjurens väg fångade ${fVid} rådjur, den bland hararna ${fHarar}`, fVid > 0 && fHarar === 0],
    ];
  },
};

// pilarna landar (steg 13.4.5): de skjutna pilarna blir en hög på marken där skytten stod, en del går sönder och en del försvinner
// där de landade (mer i snön), och högen bärs in som allt annat som ligger utanför lagret
SCENARIER.pilting = {
  text: 'De skjutna pilarna landar på marken: en av fyra går sönder, en del försvinner i snön, och resten bärs in som allt annat som ligger ute (steg 13.4.5)',
  kor: () => {
    const skjut = (sno: number, skott: number) => {
      const s = SIM.createState(1, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
      klockan(s, 9);
      s.ting = SIM.tingOf(s).filter(t => !SIM.MANNISKOVAPEN.includes(t.k as never)); SIM.addTool(s, 'bage', p);
      SIM.put(s, 'pilar', skott, { [p.id]: skott });
      const f = SIM.eldXY(s, s.fire); // en bit från lagret, på öppen mark
      for (let d = 8; d < 30; d++) { const x = Math.floor(f.x) + d, y = Math.floor(f.y); if (SIM.usable(s, x, y) && !SIM.isStored(s, x, y)) { p.x = x + 0.5; p.y = y + 0.5; break; } }
      s.vader = { ...(s.vader ?? { fukt: 0.5 }), sno } as typeof s.vader;
      const k = SIM.personKampe(s, p, 1, 0, 0, 0);
      const st = { logg: Array.from({ length: skott }, (_, t) => ({ t, h: t % 2 ? 'miss' : 'traff', a: k.id, b: 2, v: 'bage', kast: 1 })) } as unknown as SIM.Strid;
      SIM.slitKastat(s, p, st, k as unknown as SIM.Kampe);
      const st0 = s.stat ?? {};
      return { s, p, lager: SIM.amountOf(s, 'pilar'), ute: SIM.paMarken(s, 'pilar'), sonder: st0.pilSonder ?? 0, borta: st0.pilBorta ?? 0, agare: (s.stackar ?? []).some(a => a.k === 'pilar' && !SIM.isStored(s, a.x, a.y) && (a.ag?.[p.id] ?? 0) > 0) };
    };
    const a = skjut(0, 12), b = skjut(0, 400), c = skjut(1, 400);
    const helt = a.lager + a.ute + a.sonder + a.borta === 12;
    const nara = (a.s.stackar ?? []).filter(q => q.k === 'pilar' && !SIM.isStored(a.s, q.x, q.y)).every(q => Math.hypot(q.x + 0.5 - a.p.x, q.y + 0.5 - a.p.y) < 4);
    // högen bärs in som annat som ligger ute
    kor(a.s, 24);
    return [
      [`de 12 skjutna pilarna ligger på marken där skytten stod (${a.ute}), gick sönder (${a.sonder}) eller försvann (${a.borta}), och inget är kvar i lagret (${a.lager})`, helt && a.ute > 0 && a.lager === 0 && nara],
      [`pilarna på marken är skyttens`, a.agare],
      [`ungefär en av fyra går sönder (${b.sonder} av 400)`, b.sonder > 70 && b.sonder < 130],
      [`i snön försvinner fler (${c.borta} av 400) än på bar mark (${b.borta})`, c.borta > b.borta],
      [`högen bärs in i lagret (ute ${SIM.paMarken(a.s, 'pilar')}, i lagret ${SIM.amountOf(a.s, 'pilar')})`, SIM.paMarken(a.s, 'pilar') === 0 && SIM.amountOf(a.s, 'pilar') === a.ute],
    ];
  },
};

// tjäran (steg 13.5.1): det tjärade träet som står ute slits hälften så fort i 10 dygn, en tjära räcker till fyra rutor, och
// redskapen tjäras inte
SCENARIER.tjara = {
  text: 'Tjäran skyddar trä som står ute: en tjärad brygga och en tjärad vägg slits hälften så fort, skyddet tar slut efter 10 dygn, en tjära räcker till fyra rutor och ett redskap tjäras inte (steg 13.5.1)',
  kor: () => {
    const s = SIM.createState(1, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    klockan(s, 10);
    const by = SIM.bitsOf(s), x0 = Math.floor(p.x) + 6, y0 = Math.floor(p.y) + 6;
    let id = 900000;
    const bit = (k: 'vagg' | 'golv', m: string, x: number, y: number) => { const b = { id: id++, x, y, k, m, b: 1, mat: 1, c: 1 } as SIM.Bit; by.push(b); return b; };
    const brygga = [0, 1, 2, 3, 4].map(i => bit('golv', 'brygga', x0 + i, y0)), vagg = [bit('vagg', 'timmer', x0, y0 + 10), bit('vagg', 'timmer', x0 + 5, y0 + 10)];
    // en tjära i en kruka
    const kruka = SIM.addTool(s, 'lerkruka_stor', p); kruka.hos = undefined; kruka.x = Math.floor(p.x); kruka.y = Math.floor(p.y);
    SIM.fyllVatska(s, 'tjara', 1, kruka);
    const val = SIM.tjaraVal(s, p);
    // tjärningen görs: bryggan först (den bästa), fyra rutor med en tjära
    const tk = { act: 'tjara', tool: 'bit:' + brygga[0].id } as SIM.Task;
    SIM.tjaraKlar(s, p, tk);
    const tjarade = brygga.filter(b => (b.tj ?? 0) > s.now).length, tomKruka = !kruka.inne && SIM.tingOf(s).includes(kruka);
    vagg[0].tj = s.now + SIM.TJARA.dygn * SIM.DAY;
    const fore = [brygga[0].c, brygga[4].c, vagg[0].c, vagg[1].c];
    SIM.wearBuild(s, 100, 0);
    const slit = [brygga[0].c, brygga[4].c, vagg[0].c, vagg[1].c].map((c, i) => fore[i] - c);
    const halv = (a: number, b: number) => Math.abs(a / b - SIM.TJARA.slit) < 0.01;
    // efter 10 dygn är skyddet slut
    s.now += SIM.TJARA.dygn * SIM.DAY + 1;
    const c0 = brygga[0].c, c4 = brygga[4].c; SIM.wearBuild(s, 100, 0);
    const slut = Math.abs((c0 - brygga[0].c) - (c4 - brygga[4].c)) < 1e-9;
    // redskapen och stationerna tjäras inte: bara MATERIAL med tjaras, staketen och fordonen
    const mal = Object.values(SIM.TJARAS).flatMap(r => r.mal(s));
    const ingetRedskap = !mal.some(m => m.id.startsWith('ting:') && !SIM.SAKER[SIM.tingOf(s).find(t => 'ting:' + t.id === m.id)!.k]?.fordon);
    const material = Object.keys(SIM.MATERIAL).filter(k => SIM.MATERIAL[k].tjaras).sort().join(',');
    return [
      [`det som tjäras: ${material}, staketen och fordonen`, material === 'brygga,stockvag,timmer' && !!SIM.TJARAS.staket && !!SIM.TJARAS.fordon],
      [`en tjära tjärar fyra rutor av bryggan (${tjarade}) och krukan blir kvar tom`, tjarade === 4 && tomKruka],
      [`den tjärade bryggan slits hälften så fort (${slit[0].toExponential(2)} mot ${slit[1].toExponential(2)})`, halv(slit[0], slit[1])],
      [`den tjärade väggen slits hälften så fort (${slit[2].toExponential(2)} mot ${slit[3].toExponential(2)})`, halv(slit[2], slit[3])],
      [`efter ${SIM.TJARA.dygn} dygn är skyddet slut`, slut],
      ['ett redskap tjäras inte', ingetRedskap],
      [`valet: poängen är det sparade värdet mot tjärans (${val ? val.slag + ' ' + val.sc.toFixed(2) : 'inget värt det'})`, true],
    ];
  },
};

// limmet i recepten (steg 13.5.2): skölden, bågen, pilarna och boken kräver 1 benlim ur en näverask eller en liten kruka
SCENARIER.lim = {
  text: 'Limmet i recepten: skölden, bågen, pilarna och boken kräver 1 benlim, utan lim görs ingen båge, och med lim går det åt och asken blir kvar tom (steg 13.5.2)',
  kor: () => {
    const s = SIM.createState(1, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    (p.tek ??= {}).bage = 1;
    SIM.put(s, 'virke', 4, { [p.id]: 4 }); SIM.put(s, 'rep', 2, { [p.id]: 2 });
    const kniv = SIM.tingOf(s).some(t => t.k === 'kniv') || !!SIM.addTool(s, 'kniv', p);
    const bagar = () => SIM.tingOf(s).filter(t => t.k === 'bage').length, b0 = bagar();
    const utan = SIM.canMake(s, p, 'bage');
    SIM.makeTool(s, p, 'bage'); const utanGjord = bagar() - b0;
    const ask = SIM.addTool(s, 'naverask', p); ask.hos = undefined; ask.x = Math.floor(p.x); ask.y = Math.floor(p.y);
    SIM.fyllVatska(s, 'benlim', 1, ask);
    const med = SIM.canMake(s, p, 'bage');
    SIM.makeTool(s, p, 'bage'); const medGjord = bagar() - b0;
    const kvar = SIM.tingOf(s).includes(ask) && !ask.inne, lim = SIM.vatskaAv(s, 'benlim');
    const kraver = ['skold', 'bage', 'pilar', 'bok', 'jarnpilar', 'jarnskold'].filter(k => (SIM.RECEPT as Record<string, { av?: Record<string, number> }>)[k].av?.benlim === 1);
    const tek = ['skold', 'bage', 'bok'].filter(k => SIM.TEKNIK.find(t => t.id === k)?.krav.includes('ortkok'));
    return [
      [`recepten som kräver 1 benlim: ${kraver.join(', ')}`, kraver.length === 6],
      [`teknikerna som kräver Örtkök: ${tek.join(', ')}`, tek.length === 3],
      [`utan lim görs ingen båge (${utanGjord})`, kniv && !utan && utanGjord === 0],
      [`med lim görs bågen (${medGjord}), limmet går åt (${lim} kvar) och asken blir kvar tom`, med && medGjord === 1 && lim === 0 && kvar],
    ];
  },
};

// tvålen mot smittan (steg 13.5.3): den som kan Smittan och varit hos en som smittar tvättar sig med 1 tvål (en rad i VARD), och
// smittar och smittas sedan hälften så lätt i ett dygn
SCENARIER.tvalsmitta = {
  text: 'Tvålen mot smittan: den som kan Smittan och varit hos en sjuk som smittar tvättar sig med 1 tvål, och smittas och smittar hälften så lätt i ett dygn (steg 13.5.3)',
  kor: () => {
    const s = SIM.createState(5, START), [sjuk, p] = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen) as [SIM.Person, SIM.Person];
    for (const q of SIM.living(s)) if (q !== sjuk && q !== p) { q.x = sjuk.x + 30; q.y = sjuk.y + 30; }
    p.x = sjuk.x + 0.5; p.y = sjuk.y;
    SIM.insjukna(s, sjuk, 'massling');
    SIM.learnK(p, 'smitta', 1, s.now);
    SIM.put(s, 'tval', 2, { 0: 2 });
    const fore = SIM.vardBehov(s, p, p)?.tvatt ?? false;
    const t = SIM.cloneState(s); SIM.smittaTimme(t, 1); // smittan prövas: p var bredvid
    const tp = SIM.living(t).find(q => q.id === p.id)!;
    tp.sjuk = undefined;
    const behov = SIM.vardBehov(t, tp, tp)?.tvatt ?? false, val = SIM.vardVal(t, tp, true)?.why ?? '';
    const tval0 = SIM.amountOf(t, 'tval');
    SIM.vardKlar(t, tp, { act: 'varda', phase: 'do', tx: tp.x, ty: tp.y, until: t.now, carry: 0, why: '', ref: tp.id } as SIM.Task);
    const tagen = tval0 - SIM.amountOf(t, 'tval'), skydd = (tp.tval ?? 0) > t.now, igen = SIM.vardBehov(t, tp, tp)?.tvatt ?? false;
    // hur ofta p smittas under en timme bredvid den sjuka, utan och med tvätten (samma frön)
    const andel = (tvattad: boolean, sjukTvattad: boolean) => {
      let n = 0; const N = 300;
      for (let i = 0; i < N; i++) {
        const u = SIM.cloneState(t); const up = SIM.living(u).find(q => q.id === p.id)!, us = SIM.living(u).find(q => q.id === sjuk.id)!;
        up.rngs = { halsa: i * 7919 + 13 }; up.kunskap = undefined; // en egen slump per försök, och utan kunskapen (som håller hen undan) blir skillnaden lättare att mäta
        up.sjuk = undefined; up.immun = undefined; up.tval = tvattad ? u.now + SIM.DAY : undefined; us.tval = sjukTvattad ? u.now + SIM.DAY : undefined;
        SIM.smittaTimme(u, 7200); if (up.sjuk) n++;
      }
      return n / N;
    };
    const utan = andel(false, false), med = andel(true, false), bada = andel(true, true);
    return [
      [`ingen tvätt innan hen varit hos den sjuka (${fore})`, !fore],
      [`efter en timme bredvid den sjuka vill hen tvätta sig (${val})`, behov && val.includes('tvål')],
      [`tvätten tar 1 tvål (${tagen}) och skyddar ett dygn, och hen tvättar sig inte igen medan skyddet håller`, tagen === 1 && skydd && !igen],
      [`smittad på två timmar bredvid: ${(utan * 100).toFixed(0)} % otvättad, ${(med * 100).toFixed(0)} % tvättad, ${(bada * 100).toFixed(0)} % när båda tvättat sig`, med < utan * 0.75 && bada < med * 0.8],
    ];
  },
};

// torkställningen tar svamp, äpplen och rölleka (steg 13.6.1)
SCENARIER.torkat = {
  text: 'Torkställningen tar också svamp, äpplen och rölleka (steg 13.6.1): svampen och äpplena torkar på fem dygn och håller sedan 20, röllekan torkar på två och används torkad som färsk, och färsk rölleka ruttnar på sex dygn',
  kor: () => {
    const { TORK, torka, SAKER, amountOf, setAmount, getable, takeMaterial } = SIM;
    const s = SIM.createState(1, START); klockan(s); tandEld(s);
    const p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= 18)!;
    const t = medBank(s, 'tork');
    const hang = () => (t.tork ?? []).reduce((a, q) => a + q.n, 0);
    // röllekan äts inte: allt av den hängs upp, också när ingen mat finns över
    setMat(s, {}); setAmount(s, 'rolleka', 3); vidStack(s, p, 'rolleka');
    const kanR = SIM.kanTorka(s, p);
    torka(s, p, 1);
    const uppR = hang() === 3 && amountOf(s, 'rolleka') === 0;
    s.now += (TORK.ortDygn - 0.5) * SIM.DAY; SIM.touch(s); torka(s, p, 1);
    const inteR = amountOf(s, 'torrrolleka') === 0;
    s.now += SIM.DAY; SIM.touch(s); torka(s, p, 1);
    const nerR = amountOf(s, 'torrrolleka') === 3 && hang() === 0;
    // svampen: det byn inte hinner äta hängs upp och tas ner som torkad svamp efter fem dygn
    setMat(s, { svamp: 200 }); vidStack(s, p, 'svamp');
    torka(s, p, 1);
    const uppS = hang() === TORK.rymd;
    s.now += (TORK.dygn - 0.5) * SIM.DAY; SIM.touch(s); setMat(s, {}); torka(s, p, 1);
    const inteS = amountOf(s, 'torrsvamp') === 0;
    s.now += SIM.DAY; SIM.touch(s); torka(s, p, 1);
    const nerS = amountOf(s, 'torrsvamp') === TORK.rymd;
    // äpplena likadant
    setMat(s, { appel: 200 }); vidStack(s, p, 'appel'); torka(s, p, 1);
    s.now += (TORK.dygn + 0.5) * SIM.DAY; SIM.touch(s); setMat(s, {}); torka(s, p, 1);
    const nerA = amountOf(s, 'torrappel') === TORK.rymd;
    // hållbarheten och näringen
    const haller = SAKER.torrsvamp!.haller === 20 && SAKER.torrappel!.haller === 20 && SAKER.torrrolleka!.haller === 20 && SAKER.rolleka!.haller === 6;
    const naring = JSON.stringify(SAKER.torrsvamp!.naring) === JSON.stringify(SAKER.svamp!.naring) && JSON.stringify(SAKER.torrappel!.naring) === JSON.stringify(SAKER.appel!.naring);
    // den torkade röllekan används som den färska, och den färska tas först
    setAmount(s, 'rolleka', 1); setAmount(s, 'torrrolleka', 2);
    const far = getable(s, p, 'rolleka') === 3;
    takeMaterial(s, p, 'rolleka', 1);
    const farskForst = amountOf(s, 'rolleka') === 0 && amountOf(s, 'torrrolleka') === 2;
    takeMaterial(s, p, 'rolleka', 2);
    const torrSen = amountOf(s, 'torrrolleka') === 0;
    // örtteet, ölet och salvan tar torkad rölleka
    setAmount(s, 'torrrolleka', 2); setAmount(s, 'talg', 1);
    const salva = !SIM.saknatAv(s, p, SIM.RECEPT.salva.av);
    // rätten med rölleka håller som de andra ingredienserna: örten räknas inte
    const ratt = SIM.hallerMedel([['fisk', 2], ['rolleka', 1]]) === SIM.hallerMedel([['fisk', 2]]);
    return [
      ['röllekan hängs upp på torkställningen, all av den, fast ingen mat finns över', kanR && uppR],
      [`röllekan är inte torr förrän efter ${TORK.ortDygn} dygn och tas sedan ner som torkad rölleka`, inteR && nerR],
      [`svampen hängs upp (${hang()} kvar) och tas ner torkad efter ${TORK.dygn} dygn`, uppS && inteS && nerS],
      ['äpplena tas ner torkade efter fem dygn', nerA],
      ['det torkade håller 20 dygn, och färsk rölleka ruttnar på sex', haller],
      ['torkad svamp och torkade äpplen ger samma näring som de färska', naring],
      ['den torkade röllekan räknas som rölleka, och den färska tas först', far && farskForst && torrSen],
      ['salvan går att göra av torkad rölleka', salva],
      ['röllekan förkortar inte rättens hållbarhet', ratt],
    ];
  },
};
