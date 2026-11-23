// Scenarier för fas 13.
import * as SIM from '../../sim';
import { SCENARIER, klockan, medBank, nyInvanare, testBy, utanWebblasare } from './hjalp';
import { GRAFER, grafHtml } from '../../ui/graf';
import { setByn } from '../../ui/lage';
import { START } from '../kor';
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
