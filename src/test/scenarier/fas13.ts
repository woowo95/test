// Scenarier för fas 13.
import { readFileSync } from 'node:fs';
import * as SIM from '../../sim';
import { husPa } from './byggnader';
import { SCENARIER, byggare, klockan, kor, korTills, rovarGang, medBank, medHus, medVatska, nyInvanare, setFood, setMat, tandEld, testBy, utanWebblasare, vidStack } from './hjalp';
import { GRAFER, grafHtml } from '../../ui/graf';
import { setByn } from '../../ui/lage';
import { lasBy } from '../delby';
import { BEAT, START } from '../kor';
import { sakOrd } from '../../sim/ord';
import { allaGillar, kvall, upptrad } from './kultur';
import { BIT, rakna, stallMark } from '../../ui/mark';
import { delRad } from '../../ui/hjalp';
import { PIX } from '../../ikoner';
import { gaster } from '../../ui/gaster';
import { SKYLT, synligaSkyltar, type Skylt } from '../../ui/namnskyltar';

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

// materialet till en teknik (steg 2.12.5): stationens eget recept, och ett av materialen när saken görs av olika
SCENARIER.teknikmaterial = {
  text: 'Materialet som måste finnas för att man ska komma på en teknik: vävstolen kräver det den byggs av och inte tyg, och bältet rep eller läder',
  kor: () => {
    const m = (id: string) => JSON.stringify(SIM.materialOf(SIM.TEK[id])), s = SIM.createState(7, START); SIM.setAmount(s, 'rep', 10);
    return [
      [`ingen teknik för en station kräver annat än stationens recept (${m('vavstol')})`, SIM.TEKNIK.every(t => { const st = (SIM.STATIONER as Record<string, SIM.StationDef>)[t.id]; return !st || (SIM.SAKER as Record<string, unknown>)[t.id] !== undefined || SIM.materialOf(t).flat().every(k => k in st.av || k === st.verktyg); })],
      [`bältet kräver rep eller läder (${m('balte')})`, SIM.materialOf(SIM.TEK.balte).length === 1 && ['lader', 'rep'].every(k => SIM.materialOf(SIM.TEK.balte)[0].includes(k))],
      ['byn som bara har rep kan komma på bältet', SIM.hasMaterial(s, SIM.TEK.balte)],
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
      [`utan horn dricks vinet utan tanken (${utan})`, utan === 0],
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
  text: 'Tjäran skyddar trä som står ute: en tjärad brygga och en tjärad vägg slits hälften så fort, skyddet tar slut efter 10 dygn, en tjära räcker till sexton rutor nära varandra, bryggan är värd att tjära och ett redskap tjäras inte (steg 13.5.1)',
  kor: () => {
    const s = SIM.createState(1, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    klockan(s, 10);
    const by = SIM.bitsOf(s), x0 = Math.floor(p.x) + 6, y0 = Math.floor(p.y) + 6;
    let id = 900000;
    const bit = (k: 'vagg' | 'golv', m: string, x: number, y: number) => { const b = { id: id++, x, y, k, m, b: 1, mat: 1, c: 1 } as SIM.Bit; by.push(b); return b; };
    const brygga = Array.from({ length: 20 }, (_, i) => bit('golv', 'brygga', x0 + i % 5, y0 + Math.floor(i / 5))), vagg = [bit('vagg', 'timmer', x0, y0 + 10), bit('vagg', 'timmer', x0 + 5, y0 + 10)];
    // en tjära i en kruka
    const kruka = SIM.addTool(s, 'lerkruka_stor', p); kruka.hos = undefined; kruka.x = Math.floor(p.x); kruka.y = Math.floor(p.y);
    SIM.fyllVatska(s, 'tjara', 1, kruka);
    const val = SIM.tjaraVal(s, p);
    // tjärningen görs: bryggan först (den bästa), sexton rutor med en tjära
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
      [`en tjära tjärar sexton rutor av bryggan (${tjarade}) och krukan blir kvar tom`, tjarade === SIM.TJARA.rutor && tomKruka],
      [`den tjärade bryggan slits hälften så fort (${slit[0].toExponential(2)} mot ${slit[1].toExponential(2)})`, halv(slit[0], slit[1])],
      [`den tjärade väggen slits hälften så fort (${slit[2].toExponential(2)} mot ${slit[3].toExponential(2)})`, halv(slit[2], slit[3])],
      [`efter ${SIM.TJARA.dygn} dygn är skyddet slut`, slut],
      ['ett redskap tjäras inte', ingetRedskap],
      [`valet: poängen är det sparade värdet mot tjärans (${val ? val.slag + ' ' + val.sc.toFixed(2) : 'inget värt det'})`, !!val && val.sc > 0],
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
  text: 'Tvålen mot smittan: den som kan Smittan och är i samma hus som en sjuk som smittar hämtar 1 tvål i förrådet och tvättar sig en gång, och smittas och smittar hälften så lätt i ett dygn; den som bara sitter vid samma eld tvättar sig inte (steg 13.5.3 och 13.10.18)',
  kor: () => {
    const s = SIM.createState(5, START), [sjuk, p] = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen) as [SIM.Person, SIM.Person];
    klockan(s, 12); const h = medHus(s)!, golv = SIM.gridOf(s).rooms.find(r => r.hus === h.id)!.tiles;
    for (const q of SIM.living(s)) if (q !== sjuk && q !== p) { q.x = sjuk.x + 30; q.y = sjuk.y + 30; }
    sjuk.x = golv[0] % SIM.W + 0.5; sjuk.y = Math.floor(golv[0] / SIM.W) + 0.5;
    p.x = sjuk.x + 0.5; p.y = sjuk.y;
    SIM.insjukna(s, sjuk, 'massling'); sjuk.sjuk!.tecken = s.now; sjuk.sjuk!.st = 0; sjuk.sjuk!.grad = 0.4;
    SIM.learnK(p, 'smitta', 1, s.now);
    SIM.put(s, 'tval', 2, { 0: 2 });
    const fore = SIM.vardBehov(s, p, p)?.tvatt ?? false;
    const t = SIM.cloneState(s); SIM.smittaTimme(t, 1); // smittan prövas: p var bredvid
    const tp = SIM.living(t).find(q => q.id === p.id)!;
    tp.sjuk = undefined;
    const behov = SIM.vardBehov(t, tp, tp)?.tvatt ?? false, val = SIM.vardVal(t, tp, true)?.why ?? '';
    // vid samma eld men i inget hus: ingen tvätt
    const e = SIM.cloneState(s), [es, ep] = [sjuk, p].map(q => SIM.living(e).find(x => x.id === q.id)!), el = SIM.eldPlats(e);
    es.x = el.x - 0.9; es.y = el.y + 0.5; ep.x = el.x + 1.9; ep.y = el.y + 0.5; tandEld(e); SIM.smittaTimme(e, 1); ep.sjuk = undefined;
    const vidElden = SIM.vardBehov(e, ep, ep)?.tvatt ?? false;
    // i spelet: tvålen ligger i lagret, hämtas, och tvätten görs en gång
    const g = SIM.cloneState(t); g.people = g.people.filter(q => q.id === p.id || q.id === sjuk.id);
    const gp = SIM.living(g).find(q => q.id === p.id)!, gs = SIM.living(g).find(q => q.id === sjuk.id)!;
    gp.task = undefined; gp.hunger = gp.torst = gp.rest = gp.warm = 1; gp.toa = 1; gs.immun = { massling: 1 };
    const g0 = SIM.amountOf(g, 'tval'); let n = 0, forra = '', vard = 0, framme = 0, gick = 0;
    korTills(g, () => false, 3600, () => { const a = gp.task?.act ?? ''; if (a === 'varda' && forra !== 'varda') n++; if (gp.task?.hamta?.tval) gick++; if (a === 'varda' && gp.task?.phase === 'do' && !gp.task.site) { if (!framme) framme = g.now; vard = g.now - framme; } forra = a; gp.sjuk = undefined; });
    const gTval = g0 - SIM.amountOf(g, 'tval'), gTvattar = Number(g.stat?.tvalSmitta ?? 0);
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
      [`den som suttit vid samma eld tvättar sig inte (${vidElden})`, !vidElden],
      [`i spelet hämtas tvålen (${gick > 0}), hen tvättar sig en gång på en timme (${gTvattar}, valdes ${n}) och förrådet har en tvål mindre (${gTval})`, gick > 0 && gTvattar === 1 && n === 1 && gTval === 1],
      [`tvätten tar radens tid (${(vard / SIM.MIN).toFixed(1)} av 1 minut)`, vard <= 1.2 * SIM.MIN],
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
SCENARIER.syrat = {
  text: 'Surkål och surfisk (steg 13.6.2): 6 kål eller 6 fisk och 1 salt packas i en stor lerkruka och syras 3 dygn utan eld till 6 surkål eller surfisk, som håller 20 dygn; under 5 grader stannar syrningen utom inne i ett hus, och byn syrar det som annars ruttnar',
  kor: () => {
    const { SYRA, TILLVERKA, SAKER, amountOf, setAmount } = SIM;
    const dk = TILLVERKA.syra_kal, df = TILLVERKA.syra_fisk;
    const s = SIM.createState(1, START); klockan(s, 12);
    const p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= 18)!;
    (p.tek ??= {}).syrning = 1; (p.tek ??= {}).kruka = 1;
    s.fire.lit = false;
    const t = s.now;
    // en tid när det är varmt och en när det är kallt
    const hitta = (ok: (c: number) => boolean) => { for (let h = 0; h < 24 * 400; h++) { const u = t + h * SIM.HOUR; if (ok(SIM.temperature(s, u))) return u; } return t; };
    const varm = hitta(c => c >= 10), kall = hitta(c => c <= 0);
    const klar = (d: typeof dk) => { p.task = { act: d.act, phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '' } as SIM.Task; SIM.KLAR_FOR[d.act]!(s, p, p.task, 0); };
    // utan en stor lerkruka syras inget
    setMat(s, {}); setAmount(s, 'kal', 6); setAmount(s, 'salt', 2);
    klar(dk);
    const utanKruka = amountOf(s, 'kal') === 6;
    const kruka = SIM.addTool(s, 'lerkruka_stor', p); kruka.hos = undefined;
    // utan salt syras inget
    setAmount(s, 'salt', 0); klar(dk);
    const utanSalt = amountOf(s, 'kal') === 6 && !kruka.kok;
    setAmount(s, 'salt', 2);
    // byn vill syra kål när den har mer än den hinner äta
    setMat(s, { kal: 300 }); const villFore = SIM.syraVill(s, 'surkal', dk.n); setMat(s, {}); setAmount(s, 'kal', 6); setAmount(s, 'salt', 2);
    s.now = varm; klar(dk);
    const packad = kruka.kok?.r === 'surkal' && !!kruka.kok?.syr && amountOf(s, 'kal') === 0 && amountOf(s, 'salt') === 1;
    const upptagen = !SIM.karSomBlirLedig(s, 'lerkruka_stor');
    const iKruk = SIM.iKrukorna(s, 'surkal') === 6;
    // syras utan eld: efter nästan tre dygn finns inget, efter tre dygn finns sex surkål och krukan är ledig
    SIM.stepKok(s, (SYRA.dygn * 24 - 1) * 3600);
    const inteAn = amountOf(s, 'surkal') === 0 && !!kruka.kok;
    SIM.stepKok(s, 2 * 3600);
    const iK = (n: number) => kruka.kok?.klar === 1 && kruka.kok.n === n && !SIM.karSomBlirLedig(s, 'lerkruka_stor') && SIM.iKrukorna(s, 'surkal') === 0;
    const surkal = amountOf(s, 'surkal') === 6 && iK(6);
    // den som äter tar ur krukan (steg 13.10.44): den tömda krukan är ledig igen
    setAmount(s, 'surkal', 2); SIM.stepKok(s, 60); const halv = iK(2);
    setAmount(s, 'surkal', 0); SIM.stepKok(s, 60); const tom = !kruka.kok && !!SIM.karSomBlirLedig(s, 'lerkruka_stor');
    // fisken likadant
    setAmount(s, 'fisk', 6); klar(df);
    SIM.stepKok(s, (SYRA.dygn * 24 + 1) * 3600);
    const surfisk = amountOf(s, 'surfisk') === 6 && kruka.kok?.klar === 1;
    setAmount(s, 'surfisk', 0); SIM.stepKok(s, 60);
    // kallt ute: syrningen stannar; inne i ett hus går den
    setAmount(s, 'kal', 6); setAmount(s, 'salt', 1); s.now = kall; klar(dk);
    const kvar0 = kruka.kok?.kvar ?? 0;
    SIM.stepKok(s, 3600);
    const stannar = kruka.kok?.kvar === kvar0;
    medHus(s); s.now = kall;
    const rum = SIM.gridOf(s).rooms.find(r => r.tiles.length);
    let inne = false;
    if (rum) { const c = rum.tiles[0]; kruka.x = c % SIM.W; kruka.y = Math.floor(c / SIM.W); SIM.stepKok(s, 3600); inne = (kruka.kok?.kvar ?? kvar0) < kvar0; }
    const k = SAKER.surkal!, f = SAKER.surfisk!;
    return [
      [`6 kål eller 6 fisk och 1 salt i en stor lerkruka, ${dk.min} minuters arbete`, dk.kruka === 'lerkruka_stor' && dk.av.kal === 6 && dk.av.salt === 1 && df.av.fisk === 6 && dk.n === 6 && df.n === 6 && dk.min === 3],
      ['utan en stor lerkruka eller utan salt syras inget', utanKruka && utanSalt],
      [`byn vill syra kålen den inte hinner äta (${villFore})`, villFore >= 6],
      ['kålen packas i krukan utan eld, och krukan är upptagen medan den syras', packad && upptagen && iKruk],
      [`efter ${SYRA.dygn} dygn ligger 6 surkål kvar i krukan`, inteAn && surkal],
      ['den som äter tar ur krukan, och den tomma krukan är ledig igen', halv && tom],
      ['fisken blir surfisk på samma sätt', surfisk],
      [`under ${SYRA.kall} grader stannar syrningen ute (${stannar}, ${SIM.temperature(s).toFixed(0)} grader), men inne i ett hus går den (${inne})`, stannar && inne],
      ['surkålen och surfisken håller 20 dygn', k.haller === 20 && f.haller === 20],
    ];
  },
};
SCENARIER.cider = {
  text: 'Cider och äppelsaft (steg 13.6.3): 10 äpplen krossas utan vatten i bryggkaret och jäser 2 dygn till 5 cider i en stor lerkruka eller tunna, som håller 6 dygn och inte mognar; under matbufferten bryggs ingen cider, och saften krossas av bär eller äpplen, det byn har mest av',
  kor: () => {
    const { bryggVal, bryggKlar, stepBrygg, setAmount, amountOf, addTool, vatskaAv, VATSKOR, BRYGD, TILLVERKA, KLAR_FOR, MOGNAD } = SIM;
    const s = SIM.createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    p.tek = { ...(p.tek ?? {}), bryggkar: 1, kruka: 1 };
    const kar = { id: 997, k: 'bryggkar', x: 3, y: 3, kvar: 0 } as SIM.Station; s.stationer = [...(s.stationer ?? []), kar];
    setMat(s, {}); setAmount(s, 'appel', 12);
    // under matbufferten: äpplena är mat, och ingen cider bryggs
    const svalt = SIM.foodDays(s) < SIM.buffert(s, 'mat'), svBrygg = bryggVal(s, p);
    setAmount(s, 'torrkott', 400);
    const vald = bryggVal(s, p);
    // en tid då det är minst 10 grader i två dygn och en timme
    const t0 = s.now; let varm = t0;
    for (let d = 0; d < 400 * 24; d += 6) { const u = t0 + d * SIM.HOUR; let ok = true; for (let h = 0; h <= 50 && ok; h++) ok = SIM.temperature(s, u + h * SIM.HOUR) >= 10; if (ok) { varm = u; break; } }
    s.now = varm;
    bryggKlar(s, p, kar.id);
    const isats = kar.sats?.v === 'cider' && amountOf(s, 'appel') === 2 && kar.sats.n === 5;
    const tid = (h: number) => { for (let i = 0; i < h; i++) { s.now += SIM.HOUR; stepBrygg(s); } };
    tid(BRYGD.cider.dygn * 24 - 2); const inteAn = !kar.sats?.klar;
    tid(3); const jast = !!kar.sats?.klar;
    const kr = addTool(s, 'lerkruka_stor', p); kr.hos = undefined;
    bryggKlar(s, p, kar.id);
    const cider = vatskaAv(s, 'cider'), tomt = !kar.sats, iKruka = kr.inne?.v === 'cider';
    // saften: av äpplen när byn har fler äpplen än bär, i en mellanstor kruka
    setAmount(s, 'appel', 12); setAmount(s, 'bar', 3);
    const mk = addTool(s, 'lerkruka_mellan', p); mk.hos = undefined;
    KLAR_FOR[TILLVERKA.krossa_saft.act]!(s, p, p.task!, 0);
    const saft = vatskaAv(s, 'saft') === 5 && amountOf(s, 'appel') === 2 && amountOf(s, 'bar') === 3 && mk.inne?.v === 'saft';
    const hela = [cider, vatskaAv(s, 'saft'), amountOf(s, 'appel')].every(Number.isInteger);
    return [
      [`10 äpplen utan vatten, ${BRYGD.cider.dygn} dygn, 5 cider`, BRYGD.cider.av.appel === 10 && !BRYGD.cider.vatten && BRYGD.cider.dygn === 2 && BRYGD.cider.ger === 5],
      [`under matbufferten bryggs ingen cider (${svalt ? 'under' : 'över'}, ${svBrygg?.act ?? 'inget'}); med mat över bryggs den (${vald?.v})`, svalt && !svBrygg && vald?.act === 'brygga' && vald.v === 'cider'],
      ['äpplena läggs i karet', isats],
      [`satsen jäser i ${BRYGD.cider.dygn} dygn vid 10 grader och ger 5 cider i den stora krukan`, inteAn && jast && cider === 5 && tomt && iKruka],
      [`cidern håller ${VATSKOR.cider.haller} dygn, står i stora krukor eller tunnan och mognar inte`, VATSKOR.cider.haller === 6 && VATSKOR.cider.i.includes('tunna') && !MOGNAD.cider],
      ['saften krossas av 10 äpplen när byn har fler äpplen än bär, i en mellanstor kruka', saft],
      ['allt i hela saker', hela],
    ];
  },
};
SCENARIER.jarnhacka = {
  text: 'Järnhackan på fältet (steg 13.7.1): den som bereder fältet tar det lediga redskap som går fortast, och det redskapet slits: 4 minuter per ruta för hand, 1,5 med benspaden och 0,67 med järnhackan, som slits hälften så mycket som spaden; byn vill ha en järnhacka när den har ett fält',
  kor: () => {
    const { ODLING, beredRedskap, rutaKlar, addTool, tingOf, setAmount } = SIM;
    const s = SIM.createState(1, START); klockan(s, 10);
    const p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= 18)!;
    for (const t of tingOf(s).filter(t => t.k === 'benspade' || t.k === 'jarnhacka')) s.ting = s.ting!.filter(q => q !== t);
    const min = () => ODLING.beredaMin / (beredRedskap(s, p)?.fart ?? 1);
    const hand = min();
    const spade = addTool(s, 'benspade', p); spade.hos = undefined;
    const medSpade = min(), tarSpade = beredRedskap(s, p)?.k;
    const hacka = addTool(s, 'jarnhacka', p); hacka.hos = undefined;
    const medHacka = min(), tarHacka = beredRedskap(s, p)?.k;
    // en ruta på fältet grävs upp: hackan slits, inte spaden, och hälften så mycket som spaden skulle
    const f = { id: 1, x: 2, y: 2, w: 1, dir: 0, n: 1, agare: p.id, steg: 'bereda', klara: 0, kvar: 0, rord: s.now, r: [{ st: 'bereda' }] } as unknown as SIM.Falt;
    setAmount(s, 'kompost', 0);
    const h0 = hacka.c, s0 = spade.c;
    rutaKlar(s, p, f, 0);
    const hackaSlit = h0 - hacka.c, spadeOrord = spade.c === s0;
    s.ting = s.ting!.filter(q => q !== hacka);
    const f2 = { ...f, r: [{ st: 'bereda' }] } as unknown as SIM.Falt;
    rutaKlar(s, p, f2, 0);
    const spadeSlit = s0 - spade.c;
    // byn vill ha en järnhacka när den har ett fält och någon kan smida
    (p.tek ??= {}).smedja = 1;
    const utan = SIM.REDSKAPMAL.jarnhacka(s);
    s.falt = [f];
    const med = SIM.REDSKAPMAL.jarnhacka(s);
    const nara = (a: number, b: number) => Math.abs(a - b) < 0.01;
    return [
      [`för hand ${hand} minuter per ruta, med benspaden ${medSpade.toFixed(2)} och med järnhackan ${medHacka.toFixed(2)}`, nara(hand, 4) && nara(medSpade, 1.5) && nara(medHacka, 0.67)],
      [`den som bereder tar det snabbaste lediga redskapet (${tarSpade}, sedan ${tarHacka})`, tarSpade === 'benspade' && tarHacka === 'jarnhacka'],
      [`järnhackan slits (${hackaSlit.toFixed(4)}) och spaden inte, och hackan hälften så mycket som spaden (${spadeSlit.toFixed(4)})`, hackaSlit > 0 && spadeOrord && nara(hackaSlit * 2, spadeSlit)],
      [`byn vill ha en järnhacka när den har ett fält (${utan} → ${med})`, med === 1],
    ];
  },
};
SCENARIER.plog = {
  text: 'Plogen (steg 13.7.2): den som bereder fältet spänner det starkaste lediga dragdjuret för plogen när det går fortare än spaden, rutans tid följer djurets styrka, utan djur tas spaden, plogen väger inget i bördan så komposten kan bäras, plogen läggs i förrådet och djuret blir fritt efteråt, och djuret sliter sig vid en varg',
  kor: () => {
    const { ODLING, FORDON, beredRedskap, rutaKlar, addTool, tingOf, setAmount, newTing, nyttTamdjur, tamEg, taFordon, storeLoad, tamFaraSteg, spand, load, BYN, DAY } = SIM;
    const s = SIM.createState(1, START); klockan(s, 10);
    const p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= 18)!;
    s.tamdjur = [];
    for (const t of tingOf(s).filter(t => t.k === 'benspade' || t.k === 'jarnhacka' || t.k === 'plog')) s.ting = s.ting!.filter(q => q !== t);
    const spade = addTool(s, 'benspade', p); spade.hos = undefined;
    const plog = newTing(s, 'plog', 1, BYN); plog.x = Math.floor(p.x); plog.y = Math.floor(p.y);
    const utanDjur = beredRedskap(s, p)?.k;
    const oxe = nyttTamdjur(s, 'oxe', p.x, p.y, undefined, s.now - 4 * DAY), hast = nyttTamdjur(s, 'hast', p.x, p.y, undefined, s.now - 4 * DAY);
    const r = beredRedskap(s, p), starkast = tamEg(oxe).styrka >= tamEg(hast).styrka ? oxe : hast;
    const min = (d: SIM.Tamdjur) => ODLING.beredaMin / (FORDON.plog.falt! * tamEg(d).styrka), spMin = ODLING.beredaMin / SIM.BEREDA_REDSKAP().find(q => q.k === 'benspade')!.fart;
    // arbetet börjar: plogen och djuret tas med (som i val.ts)
    const task = { act: 'odla', tool: 'bereda', phase: 'go', tx: p.x, ty: p.y, until: s.now + 3600_000, carry: 0 } as SIM.Task;
    p.task = task; taFordon(s, p, task, r!.ting!, r!.djur);
    const bordan = load(task, s), spandNu = spand(s, r!.djur!);
    const f = { id: 1, x: 2, y: 2, w: 1, dir: 0, n: 1, agare: p.id, steg: 'bereda', klara: 0, kvar: 0, rord: s.now, r: [{ st: 'bereda' }] } as unknown as SIM.Falt;
    setAmount(s, 'kompost', 0);
    const c0 = plog.c, s0 = spade.c;
    rutaKlar(s, p, f, 0);
    const plogSlit = c0 - plog.c, spadeOrord = spade.c === s0, plojt = s.stat?.plojt ?? 0;
    // hemma igen: plogen i förrådet och djuret fritt
    storeLoad(s, task, p.x, p.y); p.task = undefined;
    const iForradet = plog.lass === undefined && plog.x !== undefined, fritt = !spand(s, r!.djur!);
    // vargen: djuret sliter sig från plogen
    const t2 = { ...task, ting: undefined } as SIM.Task; p.task = t2;
    const d = SIM.tamdjurOf(s).find(q => q.id === r!.djur)!;
    taFordon(s, p, t2, plog.id, d.id);
    s.vargar = [{ x: d.x + 0.5, y: d.y, vargar: [{}] }] as unknown as typeof s.vargar;
    tamFaraSteg(s, 1);
    const slitSig = plog.djur === undefined && (s.stat?.djurSlitSig ?? 0) > 0;
    return [
      [`utan dragdjur tas spaden (${utanDjur})`, utanDjur === 'benspade'],
      [`med en oxe och en häst spänns det starkaste för plogen (${r?.k}, ${r?.djur === oxe.id ? 'oxen' : r?.djur === hast.id ? 'hästen' : 'inget'})`, r?.k === 'plog' && r.djur === starkast.id],
      [`rutans tid följer djurets styrka: oxen ${min(oxe).toFixed(2)} och hästen ${min(hast).toFixed(2)} minuter, mot spadens ${spMin.toFixed(2)}`, min(oxe) < spMin && min(hast) < spMin && (min(oxe) < min(hast)) === (tamEg(oxe).styrka > tamEg(hast).styrka)],
      [`plogen väger inget i bördan (${bordan}), och djuret är förspänt (${spandNu})`, bordan === 0 && spandNu],
      [`plogen slits (${plogSlit.toFixed(4)}) och spaden inte, och rutan räknas som plöjd (${plojt})`, plogSlit > 0 && spadeOrord && plojt === 1],
      [`efter arbetet ligger plogen i förrådet (${iForradet}) och djuret är fritt (${fritt})`, iForradet && fritt],
      ['djuret blir rädt för vargen och sliter sig från plogen', slitSig],
    ];
  },
};
SCENARIER.fordongors = {
  text: 'Fordonen görs av byn (steg 13.7.3): kälken, släden, vagnen och plogen har raden som säger hur de görs (gors), och en by med tekniken, snickarbänken, materialet och ett dragdjur gör en kälke, en släde och en vagn när förrådsmålen vill ha dem',
  kor: () => {
    const { GORS, wantsTool, setAmount, nyttTamdjur, DAY } = SIM;
    const s = SIM.createState(1, START); klockan(s, 8); tandEld(s);
    medBank(s, 'snickarbank');
    for (const p of SIM.living(s)) Object.assign(p.tek ??= {}, { slade: 1, vagn: 1, snickarbank: 1 });
    const m = SIM.bynsMitt(s);
    nyttTamdjur(s, 'oxe', m.x, m.y, undefined, s.now - 4 * DAY);
    const p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= 18)!;
    const grupper = ['kalke', 'slade', 'vagn', 'plog'].every(k => GORS[k]?.includes(k));
    const fyll = (x: SIM.State) => { if (SIM.amountOf(x, 'virke') < 20) setAmount(x, 'virke', 40); if (SIM.amountOf(x, 'rep') < 15) setAmount(x, 'rep', 30); };
    fyll(s);
    const vill = ['kalke', 'slade', 'vagn'].map(g => wantsTool(s, p, g));
    const har = (k: string) => SIM.tingOf(s).filter(t => t.k === k).length;
    let tim = 0;
    for (; tim < 48 && !(har('kalke') && har('slade') && har('vagn')); tim++) kor(s, 1, fyll);
    return [
      ['kälken, släden, vagnen och plogen görs i var sin grupp', grupper],
      [`byn vill göra en kälke, en släde och en vagn (${vill.join('/')})`, vill.every(v => v)],
      [`byn gjorde en kälke (${har('kalke')}), en släde (${har('slade')}) och en vagn (${har('vagn')}) på ${tim} timmar`, har('kalke') > 0 && har('slade') > 0 && har('vagn') > 0],
      [`första gången står i statistiken (${s.stat?.kalkarGjorda ?? 0}/${s.stat?.sladarGjorda ?? 0}/${s.stat?.vagnarGjorda ?? 0})`, !!s.stat?.kalkarGjorda && !!s.stat?.sladarGjorda && !!s.stat?.vagnarGjorda],
    ];
  },
};
SCENARIER.angbild = {
  text: 'Slåtterängen syns på kartan (steg 13.7.4): ängens rutor där gräset vuxit sig högt ritas tätt med det höga gräset som redan finns på marken, och en ruta som slagits ritas som vanligt gräs',
  kor: () => {
    utanWebblasare();
    const W = 16, H = 16, n = W * H, BP = BIT * 16;
    const tiles = new Uint8Array(n).fill(SIM.T.Gras), cover = new Float32Array(n).fill(1), trees = new Float32Array(n);
    const hog = 2 * W + 2, slagen = 2 * W + 5;
    cover[slagen] = 0.5;
    const ang = new Uint8Array(n); ang[hog] = 1; ang[slagen] = 1;
    const jord = (t: number) => t === SIM.T.Gras;
    const bild = (medAng: boolean) => {
      stallMark({ W, H, tiles, cover, trees, vatten: SIM.T.Vatten, sand: SIM.T.Sand, sten: SIM.T.Sten, lera: SIM.T.Lera, jord, ...(medAng ? { ang, hog: SIM.HIGH } : {}) }, { ny: 2, gammal: 2, frac: 1 }, 0, 0, medAng ? 'ang' : 'utan', undefined);
      const px = new Int8Array(BP * BP); rakna(0, 0, px); return px;
    };
    const utan = bild(false), med = bild(true);
    // punkterna i rutan i (utan en rad överst, där tuvorna från rutan ovanför sticker in) som skiljer sig
    const skiljer = (i: number) => { let d = 0; const tx = (i % W) * 16, ty = Math.floor(i / W) * 16; for (let y = ty + 4; y < ty + 16; y++) for (let x = tx; x < tx + 16; x++) if (utan[y * BP + x] !== med[y * BP + x]) d++; return d; };
    const dHog = skiljer(hog), dSlagen = skiljer(slagen), dUtanfor = skiljer(8 * W + 8);
    return [
      [`ängens ruta med högt gräs har fler tuvor (${dHog} punkter ändrade)`, dHog > 20],
      [`den slagna rutan ritas som vanligt gräs (${dSlagen} punkter ändrade)`, dSlagen === 0],
      [`gräset utanför ängen ändras inte (${dUtanfor})`, dUtanfor === 0],
    ];
  },
};

// värmen och svalkan efter dokumentet (steg 13.8.1): VARMA för den som fryser, SVALKA på nivå 2 för den som är extremt varm,
// och en släckt eld är ingen fara när ingen fryser
SCENARIER.varma = {
  text: 'Steg 13.8.1: den extremt kalla sätter sig vid elden, den lite kalla tänder den eller hämtar ved, den som är för varm söker skugga, vatten eller tar av ett plagg, en slocknad eld är ingen fara i en varm by, och den som slöjdar i kylan stannar vid arbetet tills hen fryser',
  kor: () => {
    const VARMT = ['varma', 'tanda', 'elda', 'klaPa', 'dryck'];
    const fyll = (p: SIM.Person) => { p.rest = 1; p.toa = 1; p.torst = 1; p.hunger = 1; p.social = 1; };
    const by = (arstid: number, h: number) => { const s = SIM.createState(3, START); s.kal = SIM.nyKalender(s.now, arstid); klockan(s, h); SIM.setAmount(s, 'ved', 30); setFood(s, 60); return s; };
    let kall = by(0, 11); if (SIM.temperature(kall) > 2) kall = by(3, 11);
    const vuxen = (s: SIM.State) => SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen && SIM.ageOf(q, s.now) < 50)!;
    // extremt kall med en eld som brinner: sätter sig vid elden
    tandEld(kall, 3); let p = vuxen(kall); fyll(p); p.warm = SIM.KROPP.farligt - 0.05; SIM.chooseTask(kall, p);
    const extrem = p.task?.act ?? '-';
    // lite kall och elden slocknad: tänder den eller hämtar det som fattas
    Object.assign(kall.fire, { lit: false, fuel: 0 }); p = vuxen(kall); fyll(p); p.warm = SIM.KROPP.kallt - 0.01; SIM.chooseTask(kall, p);
    const lite = p.task?.act ?? '-';
    // inte frusen i kylan: arbetar vidare, fryser hen går hen till värmen
    tandEld(kall, 3); p = vuxen(kall); fyll(p); p.warm = SIM.KROPP.kallt + SIM.KROPP.latVarme + 0.05; SIM.chooseTask(kall, p);
    const arbetar = p.task?.act ?? '-';
    p.task = undefined; p.warm = SIM.KROPP.kallt - 0.05; SIM.chooseTask(kall, p);
    const fryser = (p.task as SIM.Task | undefined)?.act ?? '-';
    // extremt varm i solen på sommaren
    const varm = by(2, 14); p = vuxen(varm); fyll(p); p.warm = 1.9; SIM.chooseTask(varm, p);
    const het = p.task?.act ?? '-';
    // en slocknad eld i en varm by är ingen fara
    Object.assign(varm.fire, { lit: false, fuel: 0 }); for (const q of SIM.living(varm)) q.warm = 1;
    const fara = SIM.dangers(varm).kyla;
    return [
      [`den extremt kalla sätter sig vid elden som brinner (${extrem})`, extrem === 'varma'],
      [`den lite kalla tänder den släckta elden eller hämtar det som fattas (${lite})`, ['tanda', 'samla', 'ved', 'elda'].includes(lite)],
      [`den som inte fryser i kylan arbetar vidare (${arbetar}) och går till värmen när hen fryser (${fryser})`, !VARMT.includes(arbetar) && VARMT.includes(fryser)],
      [`den som är extremt varm i solen svalkar sig i skuggan, i ett hus, i vattnet eller tar av ett plagg (${het})`, ['svalka', 'bada', 'klaAv'].includes(het)],
      ['en slocknad eld är ingen fara när ingen fryser', !fara],
    ];
  },
};

// raderna står på sin nivå (steg 13.8.2)
SCENARIER.valordning = {
  text: 'Steg 13.8.2: raderna står på sin nivå. Den som blöder trycker på såret före maten, den törstiga dricker före maten, vakten går inte före den som räddar, rustningen hör till Fara, latrinen till lagningen, och örtplockningen vinner inte över maten när byn har ont om mat',
  kor: () => {
    const s = SIM.createState(1, START); s.kal = SIM.nyKalender(s.now, 2); klockan(s, 11);
    const vuxna = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen && SIM.ageOf(r, s.now) < 50), p = vuxna[0];
    const fyll = () => Object.assign(p, { rest: 1, toa: 1, torst: 1, hunger: 1, social: 1, warm: 1, task: undefined, skador: [], blod: 1 });
    // blöder och är mycket hungrig: trycker på såret
    fyll(); p.hunger = 0.05; SIM.skada(s, p, 'bal', 'sticksar', 0.5, 'blod', 'i en strid'); SIM.chooseTask(s, p);
    const blod = p.task?.why ?? '-';
    // mycket törstig och mycket hungrig: dricker först, för törsten dödar fortare (nöden i poäng, steg 13.8.9)
    fyll(); p.hunger = 0.05; p.torst = 0.01; SIM.chooseTask(s, p);
    const torst = p.task?.act ?? '-';
    // ordningen i registret
    const A = SIM.ARBETEN, i = (id: string) => A.findIndex(r => r.id === id), sist5 = Math.max(...A.map((r, j) => r.niva === 5 ? j : -1));
    const vakt = i('vakt') > sist5 && A[i('vakt')].niva === 6;
    const rusta = A[i('rusta')].niva === 1 && i('rusta') < i('skydd'), latrin = A[i('tomma_latrin')].niva === 7;
    // den mogna örten i krukan väntar medan byn har ont om mat
    p.tek = { ...(p.tek ?? {}), odling: 1 };
    const kr = SIM.addTool(s, 'lerkruka_liten', p); kr.hos = undefined; kr.x = Math.floor(p.x); kr.y = Math.floor(p.y); kr.vaxt = { g: 'rolleka', v: 1 };
    setFood(s, 0); fyll(); SIM.chooseTask(s, p);
    const ort = p.task?.act ?? '-';
    return [
      [`den som blöder och är hungrig trycker på såret (${blod})`, blod.includes('Trycker')],
      [`den farligt törstiga dricker före maten (${torst})`, torst !== 'ata' && torst !== 'maltid' && /dric|vatten|sno/i.test(torst)],
      ['vakten står på nivå 6 efter Rädda', vakt],
      ['rustningen hör till Försvara byn under Fara, och latrinen till lagningen under Tak', rusta && latrin],
      [`örtplockningen går inte före maten när byn har ont om mat (${ort})`, ort !== 'ortPlocka'],
    ];
  },
};

// Rädda är bara det som annars går förlorat (steg 13.8.3)
SCENARIER.raddarader = {
  text: 'Steg 13.8.3: Rädda är bara det som annars går förlorat. Av fältarbetet ligger bara skörden av det mogna på Rädda, att så, rensa och vattna hör till Försörjning, mjärden töms på Rädda först när den snart är full, och vatten till fältet och örtköket är ingen nöd',
  kor: () => {
    const s = SIM.createState(1, START); s.kal = SIM.nyKalender(s.now, 2); klockan(s, 10);
    const p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!; p.tek = { ...(p.tek ?? {}), odling: 1 };
    const falt = (st: 'vaxer', v: number, fu: number): SIM.Falt => ({ id: 1, x: Math.floor(p.x) + 3, y: Math.floor(p.y), w: 4, dir: 1, n: 8, agare: p.id, steg: 'vaxer', klara: 0, kvar: 0, rord: s.now, r: Array.from({ length: 8 }, () => ({ st, g: 'rovor' as const, v, fu })) } as SIM.Falt);
    // ett torrt fält som växer: arbetet finns, men inte på Rädda, och vattnet till det är ingen nöd
    let f = falt('vaxer', 0.2, 0.1); s.falt = [f]; SIM.sammanfatta(f);
    const kr = SIM.addTool(s, 'lerkruka_mellan', p); kr.hos = undefined;
    const vaxRadda = !!SIM.faltNu(s, p, true), vaxFors = !!SIM.faltNu(s, p, false) || !!SIM.vattenVal(s, p, 'odla');
    const nod = SIM.vattenVal(s, p), odla = SIM.vattenVal(s, p, 'odla');
    // ett moget fält: skörden ligger på Rädda
    f = falt('vaxer', 1, 0.9); f.r = f.r!.map(() => ({ st: 'mogen', g: 'rovor', m: 0 }) as never); s.falt = [f]; SIM.sammanfatta(f);
    const mogen = SIM.faltNu(s, p, true)?.tool;
    // mjärden med en fisk väntar, med fem töms den
    const m = SIM.sattUtMjarde(s, p)!; m.n = 1; m.fisk = { mort: 1 };
    const en = SIM.timTillFull(s, m);
    m.n = SIM.MJARDE.max - 1; m.fisk = { mort: m.n };
    const full = SIM.timTillFull(s, m);
    return [
      [`att vattna eller arbeta på ett fält som växer ligger inte på Rädda (${vaxRadda ? 'Rädda' : 'Försörjning'}), men under Försörjning (${vaxFors ? 'ja' : 'nej'})`, !vaxRadda && vaxFors],
      [`vatten till fältet är ingen nöd (${nod?.why ?? 'inget'}), men Försörjning (${odla?.why ?? 'inget'})`, !nod && !!odla?.falt],
      [`skörden av det mogna ligger på Rädda (${mogen ?? 'inget'})`, mogen === 'mogen'],
      [`mjärden med en fisk blir inte full på länge (${Math.round(en)} timmar), den nästan fulla snart (${Math.round(full)} timmar)`, en > SIM.VAL.vittjaTim && full < SIM.VAL.vittjaTim],
    ];
  },
};

// steg 13.8.4: det mjuka taket utan undantag
SCENARIER.mjukttak = {
  text: 'Steg 13.8.4: det mjuka taket utan undantag. Bufferten för maten räcker 4 dygn och för veden 3, taket är dubbelt så stort, grenar och hö hämtas allt mer sällan över taket men inte aldrig, grenarna från en stam bärs hem allt mer sällan ju mer byn har, sten och lera har ingen buffert utan hämtas till ett projekt, och ingen rad skickar alla till maten vid svält',
  kor: () => {
    const s = SIM.createState(1, START); klockan(s, 10); tandEld(s); setFood(s, 30); SIM.setAmount(s, 'ved', 300);
    const p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    const bm = SIM.onskatDygn('mat', 0), bv = SIM.onskatDygn('ved', 0), tm = SIM.lyxtak(s, 'mat') / SIM.buffert(s, 'mat'), tv = SIM.lyxtak(s, 'ved') / SIM.buffert(s, 'ved');
    // grenarna över taket: poängen på Förbättra sjunker men blir aldrig noll
    const tak = SIM.materialTak(s, 'grenar');
    const fylla = (n: number) => { SIM.setAmount(s, 'grenar', n); return SIM.forbattraKandidater(s, p).find(k => k.id === 'fylla_grenar')?.sc ?? 0; };
    const g = [0.5, 1, 2, 4].map(f => fylla(Math.ceil(tak * f)));
    // grenarna från en stam
    const t = { act: 'hugga', phase: 'do', tx: 0, ty: 0, until: s.now, carry: 0, why: '' } as unknown as SIM.Task;
    const med = [1, 2, 4].map(f => { SIM.setAmount(s, 'grenar', Math.ceil(tak * f)); return SIM.grenarMed(s, t); });
    // sten och lera: förbrukningen ger ingen buffert, grenarna och höet har en
    const m = { b: 50, t: 999 };
    const sten = SIM.materialBuffert(s, 'sten', m), lera = SIM.materialBuffert(s, 'lera', m), gren = SIM.materialBuffert(s, 'grenar', m);
    s.projektSaknar = { sten: { beh: 7, n: 7, b: 1 } };
    const stenProjekt = SIM.materialBuffert(s, 'sten', m);
    const fara = SIM.ARBETEN.some(a => a.id === 'fara');
    return [
      [`utan påbud räcker bufferten för maten ${bm} dygn och för veden ${bv} (år i spelet), och taken är ${tm} och ${tv} gånger bufferten`, bm === 4 && bv === 3 && Math.abs(tm - 2) < 1e-9 && Math.abs(tv - 2) < 1e-9],
      [`grenarna hämtas allt mer sällan över taket men inte aldrig (poäng vid halva, hela, dubbla och fyrdubbla taket: ${g.map(x => x.toFixed(3)).join(', ')})`, g[0] >= g[1] && g[1] > g[2] && g[2] > g[3] && g[3] > 0],
      [`grenarna från en stam följer med allt mer sällan (vid taket, dubbla och fyrdubbla: ${med.map(x => x.toFixed(2)).join(', ')})`, med[0] === 1 && med[1] < 1 && med[2] < med[1] && med[2] > 0],
      [`sten och lera har ingen buffert av förbrukningen (${sten}, ${lera}), grenarna har (${gren}), och stenen till ett projekt hämtas (${stenProjekt})`, sten < 50 && lera < 50 && gren === 50 && stenProjekt >= 7],
      ['ingen rad skickar alla vuxna till maten och veden vid svält och kyla', !fara],
    ];
  },
};

// steg 13.8.5: tändmaterialet efter det som fattas
SCENARIER.tandbehov = {
  text: 'Steg 13.8.5: tändmaterialet efter det som fattas. Behovet av hö och kvistar till elden räknas ur deras rad i FORRADSMAL och hur mycket som fattas, inte ur matens behov: en by med mycket tände och lite mat hämtar inte tände, och en by utan tände hämtar det fast maten räcker',
  kor: () => {
    const prov = (mat: number, tande: number) => {
      const s = SIM.createState(1, START); klockan(s, 10); SIM.setAmount(s, 'ved', 100); setFood(s, mat);
      SIM.setAmount(s, 'grenar', tande); SIM.setAmount(s, 'torrgras', tande);
      let n = 0, alla = 0;
      for (const p of SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)) {
        Object.assign(p, { rest: 1, toa: 1, torst: 1, hunger: 1, social: 1, warm: 1, task: undefined });
        SIM.chooseTask(s, p); alla++; if (p.task?.tandmat) n++;
      }
      return { n, alla };
    };
    const mycketTande = prov(0, 200), utanTande = prov(60, 0);
    return [
      [`en by med mycket tände och lite mat hämtar inget tände (${mycketTande.n} av ${mycketTande.alla} vuxna)`, mycketTande.n === 0],
      [`en by utan tände hämtar det fast maten räcker (${utanTande.n} av ${utanTande.alla} vuxna)`, utanTande.n > 0],
    ];
  },
};

// steg 13.8.6: alla trösklar i förrådsmålen
SCENARIER.trosklar = {
  text: 'Steg 13.8.6: alla trösklar i förrådsmålen. Vedens buffert är 1,5 gånger större inför och under istiden, höets reserv till elden växer i kylan, kolet hämtas bara när något behöver det, och de vilda fröna plockas efter vad fälten saknar',
  kor: () => {
    const s = SIM.createState(1, START); s.now = SIM.ageStart(s, 2) + 30 * SIM.HOUR; klockan(s, 13); // mitt på sommaren
    const sommar = SIM.buffert(s, 'ved'), hoSommar = SIM.tandBuffert(s, 'torrgras');
    const k = SIM.createState(1, START); k.now = SIM.ageStart(k, 0) + 30 * SIM.HOUR; klockan(k, 10);
    const vinter = SIM.buffert(k, 'ved'), hoVinter = SIM.tandBuffert(k, 'torrgras');
    // kolet: ingen buffert förrän ett projekt eller en eld med kol behöver det
    s.forbruk = { kol: 20 };
    const kolUtan = SIM.materialBuffert(s, 'kol', { b: 20, t: 99 });
    s.projektSaknar = { kol: { beh: 3, n: 3, b: 1 } };
    const kolMed = SIM.materialBuffert(s, 'kol', { b: 20, t: 99 });
    // fröna: brist när utsädet fattas, ingen när byn har nog
    const utsade = SIM.FROSORTER.reduce((n, f) => n + SIM.utsade(s, f), 0);
    for (const f of SIM.FROSORTER) SIM.setAmount(s, f, 0);
    const froUtan = SIM.froBrist(s);
    for (const f of SIM.FROSORTER) SIM.setAmount(s, f, SIM.utsade(s, f));
    const froMed = SIM.froBrist(s);
    return [
      [`vedens buffert inför istiden ${vinter.toFixed(2)} dygn mot ${sommar.toFixed(2)} på sommaren (år i spelet)`, Math.abs(vinter / sommar - SIM.FORRAD.kyla) < 1e-9],
      [`höets reserv till elden i kylan ${hoVinter} mot ${hoSommar}`, hoSommar === 0 || hoVinter > hoSommar],
      [`kolet har ingen buffert av förbrukningen (${kolUtan}), bara det som behövs (${kolMed})`, kolUtan === 0 && kolMed === 3],
      [`fröna fattas utan utsäde (${froUtan.toFixed(2)}, utsädet ${utsade}) och inte när byn har det (${froMed})`, (utsade === 0 || froUtan === 1) && froMed === 0],
    ];
  },
};

// steg 13.8.7: samma villkor för alla rader på Förbättra
SCENARIER.forbvillkor = {
  text: 'Steg 13.8.7: Förbättra har samma villkor för alla rader. Att bära ut sopor, att baka och slåttern gäller bara den som arbetar i dag och dämpas av kyla och svält, bygget dämpas inte längre utan yxa, och bryggningen, ullen, hamlingen, staketet och fågelskrämman vägs med poäng mot lärandet, prövandet och fritiden',
  kor: () => {
    const rad = (id: string) => SIM.ARBETEN.find(a => a.id === id);
    const forbRader = ['sopor', 'baka', 'slatterForb'].filter(id => rad(id)?.forb && rad(id)?.niva === 8);
    const vagda = ['brygga', 'klippa', 'hamla', 'staket', 'skramma'];
    const iPoang = vagda.filter(id => SIM.FORBATTRA.some(f => f.id === id) && !!rad(id)?.poang);
    // bagaren i en by med bakugn och mjöl: med mat i förrådet bakar någon, när byn svälter ingen
    const bak = (mat: number) => {
      const s = SIM.createState(1, START); klockan(s, 10);
      const ugn = { id: 992, k: 'bakugn', x: 2, y: 8, kvar: 0 } as SIM.Station; s.stationer = [...(s.stationer ?? []), ugn];
      SIM.setAmount(s, 'ved', 100); SIM.setAmount(s, 'grenar', 60); SIM.setAmount(s, 'torrgras', 60); SIM.setAmount(s, 'mjol', 20); setFood(s, mat);
      for (const k of ['mossa', 'sten', 'flinta']) SIM.setAmount(s, k, 40); for (const f of SIM.FROSORTER) SIM.setAmount(s, f, SIM.utsade(s, f)); // Försörjningen har det den behöver
      let n = 0, alla = 0;
      for (let varv = 0; varv < 20; varv++) for (const p of SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)) {
        p.tek = { ...(p.tek ?? {}), bakugn: 1 }; p.skill.matlagning = SIM.MATLAG.brannFull;
        if (varv === 0) medVatska(s, p, 'vattensack', 'vatten', 1);
        Object.assign(p, { rest: 1, toa: 1, torst: 1, hunger: 1, social: 1, warm: 1, task: undefined });
        SIM.chooseTask(s, p); alla++; if (p.task?.act === 'baka') n++;
        s.now += 5 * SIM.MIN;
      }
      return { n, alla };
    };
    const matt = bak(60), svalt = bak(0);
    // brusets spann: lärandet kan väga mer än bryggningen
    const V = SIM.VAL, hi = V.brusMin + V.brusSpann, lo = V.brusMin;
    return [
      [`att bära ut sopor, att baka och slåttern har Förbättras villkor (${forbRader.join(', ')})`, forbRader.length === 3],
      [`bygget dämpas inte längre utan yxa (${'byggUtanYxa' in V ? 'finns kvar' : 'borta'})`, !('byggUtanYxa' in V)],
      [`bryggningen, ullen, hamlingen, staketet och fågelskrämman vägs med poäng på Förbättra (${iPoang.join(', ')})`, iPoang.length === vagda.length],
      [`lärandet kan väga mer än bryggningen (lärandet upp till ${(V.forbLara * hi).toFixed(2)}, bryggningen ner till ${(V.forbBrygga * lo).toFixed(2)})`, V.forbLara * hi > V.forbBrygga * lo],
      [`med mat i förrådet bakar någon (${matt.n} av ${matt.alla} val)`, matt.n > 0],
      [`när byn svälter bakar ingen (${svalt.n} av ${svalt.alla} val)`, svalt.n === 0],
    ];
  },
};

SCENARIER.fritidrader = {
  text: 'Steg 13.8.8: fritiden har alla sina rader. Kvällsdrycken och framträdandet är rader i FRITID och dras med de andra i kvällens dragning, i stället för egna rader med egen chans före fritiden, så att framträdandet inte går före Rädda',
  kor: () => {
    const ids = SIM.ARBETEN.map(r => r.id), fr = (id: string) => SIM.FRITID.find(f => f.id === id);
    const egna = ['kvallsdryck', 'framtradande'].filter(id => ids.includes(id));
    // kvällen vid elden med öl i byn: de vuxna väljer många gånger från samma läge
    const s0 = SIM.createState(3, START); klockan(s0, 20); tandEld(s0); setFood(s0, 400); SIM.setAmount(s0, 'ved', 300);
    const vuxna0 = SIM.living(s0).filter(p => SIM.ageOf(p, s0.now) >= SIM.ALDER.vuxen);
    medVatska(s0, vuxna0[0]!, 'lerkruka_stor', 'ol', 10);
    const e = SIM.eldPlats(s0);
    for (const p of vuxna0) { p.x = e.x + 1.5; p.y = e.y + 0.5; p.rest = 1; }
    const n: Record<string, number> = {};
    let alla = 0;
    for (let i = 0; i < 60; i++) {
      const s = SIM.cloneState(s0); s.seed = (s.seed ?? 0) + i;
      for (const p of SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)) { p.task = undefined; SIM.chooseTask(s, p); alla++; const a = (p.task as SIM.Task | undefined)?.act ?? '-'; n[a] = (n[a] ?? 0) + 1; }
    }
    const kvall = ids.indexOf('kvall'), sistaRadda = Math.max(...SIM.ARBETEN.map((r, i) => r.niva === 5 ? i : -1));
    return [
      [`ingen egen rad för drycken eller framträdandet i ARBETEN (${egna.join(', ') || 'inga'})`, egna.length === 0],
      [`drycken och framträdandet är kvällsrader i FRITID (${fr('dryck')?.nar}, ${fr('framtradande')?.nar})`, fr('dryck')?.nar === 'natt' && fr('framtradande')?.nar === 'natt'],
      [`framträdandet väljs bara i kvällens rad, efter Rädda (raden kväll på plats ${kvall}, Rädda slutar på ${sistaRadda})`, kvall > sistaRadda],
      [`på kvällen dras drycken (${n.dryck ?? 0}) och framträdandet (${n.upptrada ?? 0}) bland de andra (${alla} val: ${Object.entries(n).map(([k, v]) => `${k} ${v}`).join(', ')})`, (n.dryck ?? 0) > 0 && (n.upptrada ?? 0) > 0 && (n.dryck ?? 0) < alla / 2],
    ];
  },
};

SCENARIER.nodpoang = {
  text: 'Steg 13.8.9: nöden i poäng och såret först. Inom nivå 2 vägs raderna efter hur nära döden de för, så att en svag törst inte går före en svår hunger. Den som blir anfallen tar hand om det först (från bina flyr man), och att trycka på sitt blödande sår kommer närmast efter, före alla andra faror',
  kor: () => {
    const s = SIM.createState(1, START); s.kal = SIM.nyKalender(s.now, 2); klockan(s, 11); setFood(s, 400);
    const p = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen && SIM.ageOf(r, s.now) < 50)[0]!;
    const fyll = () => Object.assign(p, { rest: 1, toa: 1, torst: 1, hunger: 1, social: 1, warm: 1, task: undefined, skador: [], blod: 1 });
    const sar = () => SIM.skada(s, p, 'bal', 'sticksar', 0.5, 'blod', 'i en strid');
    const val = () => { SIM.chooseTask(s, p); return `${p.task?.act ?? '-'}: ${p.task?.why ?? ''}`; };
    // svårt hungrig och lite törstig: äter först; mycket törstig och lite hungrig: dricker först
    fyll(); p.hunger = 0.03; p.torst = SIM.TORST.farligt - 0.01; const hunger = val();
    fyll(); p.hunger = SIM.KROPP.hungrig * SIM.VARDRATT.snal - 0.01; p.torst = 0.01; const torst = val();
    // bina: den som blöder och står vid ett uppretat bo flyr bina först
    fyll(); sar(); (s.retade ??= []).push({ x: Math.floor(p.x) + 1, y: Math.floor(p.y), slut: s.now + 10 * SIM.MIN, st: 1 }); const bin = val();
    s.retade = undefined;
    // vargarna kommer: den som blöder trycker på såret i stället för att söka skydd
    const vargar = (n: number) => { const id = s.vargNr = (s.vargNr ?? 0) + 1; (s.vargar ??= []).push({ id, vargar: Array.from({ length: n }, (_, j) => 10_000_000 + id * 8 + j), x: p.x + 3, y: p.y, mx: p.x + 3, my: p.y, gar: s.now + 48 * SIM.HOUR, hunger: 0.9, gor: 'anfaller', sedd: s.now } as SIM.Vargflock); };
    vargar(3); SIM.larma(s, 'varg', 3, [p]);
    fyll(); const utan = val();
    fyll(); sar(); const varg = val();
    s.vargar = undefined;
    const A = SIM.ARBETEN, i = (id: string) => A.findIndex(r => r.id === id);
    return [
      [`utan sår gör man det vargarna kräver när de kommer (${utan})`, /forsvar|gomma|hjalpaRovare|skydd|gom/.test(utan.split(':')[0]!)],
      [`den som blöder trycker på såret när vargarna kommer (${varg})`, /Trycker/.test(varg)],
      [`ordningen i Fara: brinner, bina, såret och sedan skyddet (${['brinner', 'binFly', 'blodar', 'skydd'].map(i).join(', ')})`, i('brinner') < i('binFly') && i('binFly') < i('blodar') && i('blodar') < i('skydd') && A[i('blodar')]!.niva === 1],
      [`striden tar den som blir biten: anfallet är en strid som valet inte avbryter (${SIM.ACTS.strid ? 'strid' : '-'})`, !!SIM.ACTS.strid],
      [`den svårt hungriga äter före den lite törstiga (${hunger})`, /ata|maltid/.test(hunger.split(':')[0]!)],
      [`den mycket törstiga dricker före den lite hungriga (${torst})`, !/ata|maltid/.test(torst.split(':')[0]!) && /dric|vatten|sno/i.test(torst)],
      [`den som blir stucken flyr bina före såret (${bin})`, bin.startsWith('flyBin')],
      ['raderna på nivå 2 har poäng', A.filter(r => r.niva === 2).every(r => !!r.poang)],
    ];
  },
};

SCENARIER.tillfallepoang = {
  text: 'Steg 13.8.10: tillfällen och grundbehov i poäng. Inom nivå 3 och 4 vägs raderna mot varandra med poäng och personligheten, så att den lata vilar tidigare än den flitiga. Bordet gör inte att man äter tidigare: man äter när man är hungrig och väljer bordet om det är nära nog. Den som skäms får handla på kvällen men går inte och lyssnar på framträdandet',
  kor: () => {
    const tk = (q: SIM.Person) => q.task as SIM.Task | undefined;
    const nivaer = SIM.ARBETEN.filter(r => r.niva === 3 || r.niva === 4), utan = nivaer.filter(r => !r.poang).map(r => r.id);
    // den lata och den flitiga lika trötta på dagen, mitt emellan deras gränser
    const s = SIM.createState(1, START); klockan(s, 11); setFood(s, 400); tandEld(s);
    const [lat, flitig] = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen && SIM.ageOf(r, s.now) < 50) as [SIM.Person, SIM.Person];
    lat.pot.flit = 0; flitig.pot.flit = 100;
    const lz = (p: SIM.Person) => 1 - SIM.duty(s, p), fyll = (p: SIM.Person) => Object.assign(p, { rest: 1, toa: 1, torst: 1, hunger: 1, social: 1, warm: 1, task: undefined });
    const val = (p: SIM.Person) => { p.task = undefined; SIM.chooseTask(s, p); return `${tk(p)?.act ?? '-'}: ${tk(p)?.why ?? ''}`; };
    fyll(lat); fyll(flitig);
    lat.rest = flitig.rest = SIM.KROPP.trottDag + SIM.KROPP.latVila * (lz(lat) + lz(flitig)) / 2;
    const vLat = val(lat), vFlit = val(flitig);
    // bordet: lite över hungrig äter ingen, med eller utan bord; hungrig väljer bordet när det är nära, annars maten
    const t = SIM.createState(1, START); klockan(t, 12); setFood(t, 400); tandEld(t);
    const p = SIM.living(t).filter(r => SIM.ageOf(r, t.now) >= SIM.ALDER.vuxen)[0]!;
    const matval = (hunger: number) => { Object.assign(p, { rest: 1, toa: 1, torst: 1, hunger, social: 1, warm: 1, task: undefined }); SIM.chooseTask(t, p); return tk(p)?.act ?? '-'; };
    const nastan = SIM.KROPP.hungrig + 0.05, hungrig = SIM.KROPP.hungrig - 0.02;
    const utanBordNastan = matval(nastan), utanBord = matval(hungrig);
    medBank(t, 'bord');
    const medBordNastan = matval(nastan), medBord = matval(hungrig);
    // den som skäms: lyssnar inte på framträdandet, men handlar (raden handla prövar inte skammen, och kön är skamfri)
    const { s: k, v } = kvall(); allaGillar(k, k.people);
    const [, skam] = v as [SIM.Person, SIM.Person]; skam.skam = k.now + SIM.DAY;
    upptrad(k, v[0]!);
    skam.task = undefined; SIM.chooseTask(k, skam);
    const lyssnar = tk(skam)?.act === 'lyssna' || tk(skam)?.act === 'skams' && !!SIM.ACTS.lyssna.social;
    const ovriga = v.slice(2).filter(q => { q.task = undefined; SIM.chooseTask(k, q); return tk(q)?.act === 'lyssna'; }).length;
    const handla = SIM.ARBETEN.find(r => r.id === 'handla')!, koSkamfri = !!SIM.ACTS.koa.skamfri;
    return [
      [`alla rader på nivå 3 och 4 har poäng (${utan.join(', ') || 'alla'})`, utan.length === 0],
      [`den lata vilar före den flitiga när de är lika trötta (lat ${lz(lat).toFixed(2)}: ${vLat}; flitig ${lz(flitig).toFixed(2)}: ${vFlit})`, vLat.includes('Är trött') && !vFlit.includes('Är trött')],
      [`lite över hungrig äter man inte, med eller utan bord (utan: ${utanBordNastan}, med: ${medBordNastan})`, !['ata', 'maltid'].includes(utanBordNastan) && !['ata', 'maltid'].includes(medBordNastan)],
      [`hungrig äter man vid bordet när det är nära, annars där maten ligger (med bord: ${medBord}, utan: ${utanBord})`, medBord === 'maltid' && utanBord === 'ata'],
      [`den som skäms går inte och lyssnar (${tk(skam)?.act}: ${tk(skam)?.why}), de andra gör det (${ovriga})`, !lyssnar && ovriga > 0],
      [`den som skäms får handla: raden handla prövar inte skammen och kön är skamfri (${koSkamfri})`, koSkamfri && !handla.prova.toString().includes('skams')],
    ];
  },
};

SCENARIER.somnen = {
  text: 'Steg 13.8.11: sömnen och vilan efter tröttheten. De gamla tröttnar fortare och sover när de är trötta, som alla andra, i stället för att sova på natten av en slump också när de är utvilade. Lusten att vila på dagen växer lite i taget ju tröttare man blir men är mindre än på kvällen, och en frisk vuxen orkar en arbetsdag med bara korta pauser',
  kor: () => {
    const tk = (q: SIM.Person) => q.task as SIM.Task | undefined;
    const egen = SIM.ARBETEN.some(r => r.id === 'gammalSover');
    // den gamla: utvilad på natten sover hen inte, trött gör hen det; och vilan sjunker fortare än hos en ung
    const s = SIM.createState(1, START); klockan(s, 23); setFood(s, 400); tandEld(s);
    const g = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)[0]!;
    g.born = s.now - 75 * SIM.DAY; // (ett dygn är ett år i spelet)
    const fyll = () => Object.assign(g, { rest: 1, toa: 1, torst: 1, hunger: 1, social: 1, warm: 1, task: undefined });
    const val = () => { g.task = undefined; SIM.chooseTask(s, g); return `${tk(g)?.act ?? '-'}: ${tk(g)?.why ?? ''}`; };
    let utvilad = 0; for (let i = 0; i < 20; i++) { fyll(); s.seed = (s.seed ?? 0) + 1; const x = val(); if (x.startsWith('sova') || /gammal|trött/i.test(x)) utvilad++; } // (en paus vid elden i mörkret tar alla vuxna)
    fyll(); g.rest = 0.08; const trott = val();
    const gammal = SIM.aldersTrott(75), ung = SIM.aldersTrott(30);
    // lusten att vila på dagen: växer med tröttheten, och är mindre än på kvällen
    const vila = SIM.FRITID.find(f => f.id === 'vila')!;
    const vikt = (rest: number, natt: boolean) => vila.vikt({ s, p: Object.assign(g, { rest }), v: { act: 'vila', why: '', dur: 0 }, a: 30, natt, lazy: 0, at: { x: g.x, y: g.y } } as unknown as Parameters<typeof vila.vikt>[0]);
    const dag = [0.9, 0.6, 0.4, 0.2].map(r => vikt(r, false)), kvall = vikt(0.4, true);
    // en arbetsdag i byn: de friska vuxna vilar bara korta stunder, och ingen blir så trött att hen måste vila
    const b = SIM.createState(1, START); klockan(b, 7); setFood(b, 400); tandEld(b);
    const vuxna = SIM.living(b).filter(r => SIM.ageOf(r, b.now) >= SIM.ALDER.vuxen && SIM.ageOf(r, b.now) < 50 && !SIM.isSick(r, b.now));
    for (const q of vuxna) q.rest = 1;
    let prov = 0, vilar = 0, maste = 0;
    kor(b, 10, () => { for (const q of vuxna) { if (!SIM.alive(q)) continue; prov++; const t = tk(q); if (t?.act === 'vila' || t?.act === 'sova') vilar++; if (t?.why === 'Är trött') maste++; } });
    return [
      ['ingen egen rad för de gamla som sover av en slump', !egen],
      [`den gamla tröttnar fortare (${gammal.toFixed(2)} gånger mot ${ung.toFixed(2)})`, gammal > 1.5 && ung === 1],
      [`utvilad på natten sover den gamla inte (${utvilad} av 20), trött gör hen det (${trott})`, utvilad === 0 && /vila|sova/.test(trott.split(':')[0])],
      [`lusten att vila på dagen växer med tröttheten (${dag.map(x => x.toFixed(2)).join(', ')}) och är mindre än på kvällen (${dag[2].toFixed(2)} mot ${kvall.toFixed(2)})`, dag[0] === 0 && dag[1] > 0 && dag[2] > dag[1] && dag[3] > dag[2] && kvall > dag[2]],
      [`en arbetsdag (kl. 7–17): de friska vuxna vilar ${Math.round(vilar / prov * 100)} % av tiden, och tvingas vila av tröttheten ${maste} gånger`, prov > 0 && vilar / prov < 0.3 && maste === 0],
    ];
  },
};

SCENARIER.egetmaterial = {
  text: 'Steg 13.8.12: projektet hämtar sitt eget material. Lera, virke och byggsten har ingen buffert, och det husen i byggplanen saknar hämtas av bygget när det byggs i stället för att räknas in i bufferten. Bygget som behöver virke väntar när ingen yxa finns eller kan göras, och personen gör något annat; en halvbyggd station väger mer än en ny men får inte högsta brådska',
  kor: () => {
    const tk = (q: SIM.Person) => q.task as SIM.Task | undefined;
    // ett planerat hus av timmer: virket det saknar är ingen buffert, men byn säljer det inte
    const s = SIM.createState(1, START); klockan(s, 10); setFood(s, 400); tandEld(s); SIM.setAmount(s, 'ved', 200);
    for (const p of SIM.living(s)) if (SIM.ageOf(p, s.now) >= 14) Object.assign((p.tek ??= {}), { yxa: 1, timmervagg: 1, klyvplats: 1 });
    s.byggSok = undefined; SIM.planBuild(s);
    const virkeBits = SIM.bitsOf(s).filter(b => b.b < 1 && SIM.MATERIAL[b.m]?.item === 'virke'), virkeHus = virkeBits.reduce((a, b) => a + Math.max(0, SIM.MATERIAL[b.m]!.n - b.mat), 0);
    SIM.setAmount(s, 'virke', 0); SIM.projektSaknarRakna(s); SIM.arbetsTimme(s);
    const buf = SIM.materialBuffert(s, 'virke'), proj = s.projektSaknar?.virke?.beh ?? 0;
    // utan yxa och utan att kunna göra en: den som annars byggde gör något annat
    const t = SIM.cloneState(s);
    t.ting = SIM.tingOf(t).filter(x => !x.k.includes('yxa'));
    for (const p of SIM.living(t)) if (p.tek) { delete p.tek.yxa; }
    let bygger = 0, vantar = 0, n = 0;
    for (const p of SIM.living(t).filter(q => SIM.ageOf(q, t.now) >= SIM.ALDER.vuxen)) {
      Object.assign(p, { rest: 1, toa: 1, torst: 1, hunger: 1, warm: 1, task: undefined }); SIM.chooseTask(t, p); n++;
      if (/Bygget/.test(tk(p)?.why ?? '')) bygger++;
      if (tk(p)) vantar++;
    }
    // en halvbyggd kista: bristen är högre än för en ny, men inte full; när byn svälter blir den liggande
    const k = SIM.createState(1, START); klockan(k, 10); tandEld(k); SIM.setAmount(k, 'ved', 200);
    const ny = SIM.stationBrist(k, 'kista' as SIM.StationSlag), agare = SIM.living(k).filter(q => SIM.ageOf(q, k.now) >= SIM.ALDER.vuxen)[0]!;
    const e0 = SIM.eldPlats(k), kista: SIM.Station = { id: (k.nextStation = (k.nextStation ?? 0) + 1), k: 'kista', x: Math.floor(e0.x) + 3, y: Math.floor(e0.y), kvar: 0, ag: agare.id };
    (k.stationer ??= []).push(kista); SIM.touch(k);
    kista.kvar = 60 * SIM.MIN; SIM.touch(k);
    const halv = SIM.stationBrist(k, 'kista' as SIM.StationSlag);
    setFood(k, 0);
    let kistVal = 0, m = 0;
    for (let i = 0; i < 10; i++) for (const p of SIM.living(k).filter(q => SIM.ageOf(q, k.now) >= SIM.ALDER.vuxen)) { k.seed = (k.seed ?? 0) + 1; Object.assign(p, { rest: 1, toa: 1, torst: 1, hunger: 0.6, warm: 1, task: undefined }); SIM.chooseTask(k, p); m++; if (tk(p)?.act === 'station' && tk(p)?.tool === 'kista') kistVal++; }
    return [
      [`virket till det planerade huset (${virkeHus} virke) räknas inte in i bufferten (${buf}), som bara är det projekten saknar (${proj})`, virkeHus > 0 && buf === proj && buf < virkeHus],
      [`utan yxa väntar bygget: ingen av ${n} vuxna går till det (${bygger}), och alla gör något annat (${vantar})`, n > 0 && bygger === 0 && vantar === n],
      [`en halvbyggd kista väger mer än en ny (${halv.toFixed(2)} mot ${ny.toFixed(2)}) men inte fullt`, halv > ny && halv < 1],
      [`när byn svälter blir den halvbyggda kistan liggande (${kistVal} av ${m} val)`, m > 0 && kistVal === 0],
    ];
  },
};

SCENARIER.ruttnarforst = {
  text: 'Steg 13.8.13: det som ruttnar går först. Av djuren i förrådet slaktas det som ruttnar först, som när man äter, i stället för det som står först i listan över djur. I kylan bärs det som ruttnar in som vanligt, och det andra som ligger ute bärs in mer sällan',
  kor: () => {
    const { DJUR, forstRuttnar, baraFara } = SIM;
    const s = SIM.createState(1, START); klockan(s);
    SIM.setAmount(s, 'vilt', 2); SIM.setAmount(s, 'fagel', 2);
    const skick = (k: string, c: number) => { for (const a of s.stackar ?? []) if (a.k === k) a.c = c; };
    const arter = [DJUR.kanin, DJUR.fagel];
    skick('vilt', 1); skick('fagel', 0.2);
    const forst1 = forstRuttnar(s, arter)?.art;
    skick('vilt', 0.2); skick('fagel', 1);
    const forst2 = forstRuttnar(s, arter)?.art;
    const kallt = { kyla: true, svalt: false }, varmt = { kyla: false, svalt: false };
    return [
      [`kaninen står först i listan, men fågeln som ruttnar först slaktas först (${forst1})`, forst1 === 'fagel'],
      [`när kaninen ruttnar först slaktas den först (${forst2})`, forst2 === 'kanin'],
      [`i kylan bärs fisken in som vanligt (${baraFara(kallt, 'fisk')}) och veden mer sällan (${baraFara(kallt, 'ved')})`, !baraFara(kallt, 'fisk') && baraFara(kallt, 'ved')],
      [`utan fara bärs båda in som vanligt`, !baraFara(varmt, 'fisk') && !baraFara(varmt, 'ved')],
    ];
  },
};

SCENARIER.nattvakt = {
  text: 'Steg 13.8.14: nattvakterna växer med byn. Antalet vakter på natten är en per tio som sover, minst en, och fler när hotet är större',
  kor: () => {
    const { living, ageOf } = SIM;
    const antal = (folk: number, hot?: (h: SIM.State) => void) => {
      const h = SIM.createState(4, START); klockan(h, 22);
      while (living(h).length < folk) nyInvanare(h, living(h).length % 2 ? 'm' : 'k', 30);
      while (living(h).length > folk) h.people.splice(h.people.indexOf(living(h).at(-1)!), 1);
      h.lastGuardDay = -1; h.vargar = undefined; h.rovarVila = undefined;
      for (const x of living(h)) { x.guardDay = undefined; x.varsel = undefined; Object.assign(x, { health: 1, sjuk: undefined, skador: [], hunger: 0.9, rest: 0.9, social: 0.9, toa: 0.9, torst: 0.9, warm: 0.9 }); x.task = undefined; }
      hot?.(h);
      const y = living(h).find(x => ageOf(x, h.now) >= 18)!; SIM.chooseTask(h, y);
      return living(h).filter(x => x.guardDay === h.lastGuardDay).length;
    };
    const tretti = antal(30), fem = antal(5), rovare = antal(30, h => { h.rovarVila = h.now; });
    return [
      [`en by med trettio som sover har tre vakter en lugn natt (${tretti})`, tretti === 3],
      [`en by med fem har en (${fem})`, fem === 1],
      [`när rövare nyss varit här vaktar fler (${rovare})`, rovare > tretti],
    ];
  },
};

SCENARIER.lagerpabud = {
  text: 'Steg 13.8.15: påbudet Förråden får alla material. Påbudet har ett tal per material i förrådsmålen, blandat med seden Förutseende, och över noll har materialet en buffert som växer med talet. En by med påbudet om stenlager har sten hemma, en by utan har ingen, och en by med seden Förutseende lagrar mer än en utan',
  lang: true,
  kor: () => {
    const { living, ageOf, ALDER, amountOf } = SIM;
    const by = (stenlager: number | undefined, sed = 0) => {
      const s = SIM.createState(3, START); klockan(s, 8); tandEld(s); setMat(s, { bar: 200 });
      s.seder.v.forsiktighet = sed;
      const l = living(s).find(p => ageOf(p, s.now) >= ALDER.vuxen)!;
      if (stenlager !== undefined) { s.styre = { historia: [{ id: l.id, namn: l.name, titel: 'Ålderman', fran: s.now }], oppna: [], ledare: l.id, sedan: s.now, titel: 'Ålderman', satt: 1, pabud: { lager_sten: stenlager } as never } as never; s.seder.v.rang = 1; }
      SIM.setAmount(s, 'sten', 0);
      const buf = SIM.materialBuffert(s, 'sten');
      kor(s, 24);
      return { buf, sten: amountOf(s, 'sten') };
    };
    const med = by(1), utan = by(undefined), forsiktig = by(undefined, 0.6), vanlig = by(undefined, 0);
    const ordet = SIM.PABUD_FRAGOR.find(f => f.id === 'forrad')?.tal.includes('lager_sten');
    return [
      [`påbudet Förråden har ett tal för stenen (${ordet})`, !!ordet],
      [`med påbudet om stenlager vill byn ha ${med.buf} sten och har ${med.sten} hemma efter ett dygn`, med.buf > 0 && med.sten > 0],
      [`utan påbudet vill byn inte ha något stenlager (${utan.buf}) och har ${utan.sten} hemma`, utan.buf === 0 && utan.sten < med.sten],
      [`en by med seden Förutseende vill ha mer (${forsiktig.buf}) än en utan (${vanlig.buf})`, forsiktig.buf > vanlig.buf],
    ];
  },
};

SCENARIER.strakbuske = {
  text: 'Steg 13.8.16: buskar och plantor i gångstråken röjs. En buske, en planta eller ett ungträd som står i ett stråk tas bort av projektet Röjning som träden där, först framför dörrarna, på lika lång tid som en fältruta och utan yxa',
  kor: () => {
    const s = SIM.createState(3, START); klockan(s, 8); tandEld(s); setMat(s, { bar: 300 });
    SIM.planBuild(s); medHus(s);
    const st = SIM.straken(s), g = SIM.groundOf(s), rutor = [...new Set(st.vagar.flatMap(v => v.rutor))].filter(i => st.ruta[i] === 1 && g.trees[i] < SIM.FOREST);
    const bi = rutor[Math.floor(rutor.length / 2)], pi = rutor.at(-1);
    if (bi !== undefined) { g.buske![bi] = SIM.BUSKE; g.cover[bi] = 1; }
    if (pi !== undefined && pi !== bi) g.trees[pi] = 0.1;
    for (const i of rutor) if (i !== bi && i !== pi) { g.buske![i] = SIM.BUSKE; g.cover[i] = 1; } // alla de andra rutorna i stråken också, så att inte allt hinner trampas ner
    const fore = { buske: bi !== undefined && SIM.arSly(g, bi), planta: pi !== undefined && SIM.arSly(g, pi) };
    const brist = SIM.slyBrist(s);
    let tim = 0, yxa = false;
    for (; tim < 5 * 24 && (SIM.arSly(g, bi!) || SIM.arSly(g, pi!) || !(s.stat?.slyRojt)); tim++) kor(s, 1, v => { for (const p of SIM.living(v)) if (p.task?.act === 'rojaSly' && p.task.tool) yxa = true; });
    return [
      [`en buske och en planta står i stråken (${fore.buske}, ${fore.planta}), och projektet Röjning har en brist (${brist.toFixed(2)})`, fore.buske && fore.planta && brist > 0],
      [`busken och plantan är borta efter ${tim} timmar (högst 5 dygn, 5 år i spelet)`, !SIM.arSly(g, bi!) && !SIM.arSly(g, pi!)],
      [`slyet röjdes ${s.stat?.slyRojt ?? 0} gånger (det andra kan trampas ner av dem som går där), utan yxa (${!yxa})`, (s.stat?.slyRojt ?? 0) >= 1 && !yxa],
    ];
  },
};

SCENARIER.sittvila = {
  text: 'Steg 13.8.18: vilan söker en plats att sitta eller ligga på. Den som vilar eller samtalar vid elden sätter sig på en ledig stubbe vid ett bord nära i stället för att stanna där hen står, och när alla platser är tagna står (eller ligger) de som blir över. Den som sitter vilar mer än den som står',
  kor: () => {
    const { living, spotFor, sittAt, eldPlats, bordPlatser } = SIM;
    const s = SIM.createState(4, START); klockan(s, 14);
    const f = eldPlats(s);
    const bord = { id: s.nextStation = (s.nextStation ?? 0) + 1, k: 'bord', x: f.x + 2, y: f.y + 1, kvar: 0 } as SIM.Station;
    (s.stationer ??= []).push(bord); SIM.touch(s);
    const platser = bordPlatser(bord).filter(q => !SIM.blocked(s, q.x + 0.5, q.y + 0.5)).length;
    const folk = living(s);
    while (folk.length < platser + 3) { nyInvanare(s, folk.length % 2 ? 'm' : 'k', 30); folk.splice(0, folk.length, ...living(s)); }
    for (const p of folk) { p.task = undefined; p.x = f.x + 0.5; p.y = f.y + 3; } // en bit från bordet, så att ingen står i vägen för platserna (trängseln, steg B.21)
    // var och en väljer i tur och ordning och går dit: de första sätter sig, de som blir över ligger eller står
    const valj = (act: SIM.Act, p: SIM.Person) => { const at = spotFor(s, act, p); p.task = { act, phase: 'go', tx: at.x, ty: at.y, until: s.now + SIM.HOUR, carry: 0, why: '' } as SIM.Task; p.x = at.x; p.y = at.y; return sittAt(s, at.x, at.y); };
    const vila = folk.slice(0, platser + 2).map(p => valj('vila', p));
    const satt = vila.filter(Boolean).length;
    const sistaStar = !vila.slice(platser).some(Boolean);
    for (const p of folk) { p.x = f.x + 0.5; p.y = f.y + 3; }
    // samtalet: med alla platser lediga sätter sig den som samtalar
    for (const p of folk) p.task = undefined;
    const samtal = valj('samtal', folk[0]!);
    // den som kommer till ett bord där en god vän sitter sätter sig där, och annars hellre vid ett eget bord (steg B.21)
    const s2 = SIM.createState(4, START); klockan(s2, 14); const f2 = eldPlats(s2), [a2, b2] = living(s2);
    const ba = { id: 901, k: 'bord', x: f2.x + 2, y: f2.y + 1, kvar: 0 } as SIM.Station, bb = { id: 902, k: 'bord', x: f2.x - 3, y: f2.y + 1, kvar: 0 } as SIM.Station;
    (s2.stationer ??= []).push(ba, bb); s2.nextStation = 903; SIM.touch(s2);
    const till = (op: number) => {
      const r = s2.rels[SIM.relKey(a2.id, b2.id)] ??= { op: 0 } as never; (r as { op: number }).op = op;
      const pa = bordPlatser(ba)[0]; a2.x = pa.x + 0.5; a2.y = pa.y + 0.5; a2.task = { act: 'vila', phase: 'do', tx: a2.x, ty: a2.y, until: s2.now + SIM.HOUR, carry: 0, why: '' } as SIM.Task;
      for (const q of living(s2)) if (q !== a2) { q.task = undefined; q.x = f2.x + 0.5; q.y = f2.y + 2.5; }
      for (const q of living(s2)) if (q !== a2 && q !== b2) { q.x = f2.x + 0.5; q.y = f2.y + 8; }
      const at = spotFor(s2, 'vila', b2); return !sittAt(s2, at.x, at.y) ? 'inget' : Math.hypot(at.x - a2.x, at.y - a2.y) <= 1.05 ? 'intill' : bordPlatser(ba).some(q => q.x === Math.floor(at.x) && q.y === Math.floor(at.y)) ? 'hos' : 'eget';
    };
    const van = till(60), framling = till(0);
    // vilan på platsen: den som sitter vilar mer än den som står
    const p = folk[0]!, q = folk[1]!, sp = bordPlatser(bord).find(r => !SIM.blocked(s, r.x + 0.5, r.y + 0.5))!;
    p.task = { act: 'vila', phase: 'do', tx: sp.x + 0.5, ty: sp.y + 0.5, until: s.now + SIM.HOUR, carry: 0, why: '' } as SIM.Task; p.x = sp.x + 0.5; p.y = sp.y + 0.5;
    q.task = { act: 'vila', phase: 'do', tx: f.x + 0.5, ty: f.y + 4.5, until: s.now + SIM.HOUR, carry: 0, why: '' } as SIM.Task; q.x = f.x + 0.5; q.y = f.y + 4.5;
    const sv = SIM.sittVila(s, p), qv = SIM.sittVila(s, q);
    return [
      [`bordet har ${platser} platser, och alla tas av de som vilar (${satt})`, platser > 0 && satt === platser],
      [`de två som blir över sitter inte (${vila.slice(platser).map(v => v ? 'sitter' : 'ligger').join(', ')})`, sistaStar],
      [`den som samtalar vid elden sätter sig på en ledig stubbe (${samtal})`, samtal],
      [`den som vilar sätter sig vid vännens bord (${van}) men inte intill den hen inte känner (${framling})`, ['hos', 'intill'].includes(van) && ['hos', 'eget'].includes(framling)],
      [`den som sitter på stubben vilar mer (${sv.toFixed(3)} per timme) än den som ligger på marken (${qv.toFixed(3)})`, sv > qv],
    ];
  },
};

SCENARIER.sedarv = {
  text: 'Steg 13.9.2: kulturen förstärker sig själv. Det en person drar sederna åt har en tredje del, byns sed. I en by med seden Krig drar ett barn med en fredlig personlighet mer åt Krig efter uppväxten än samma barn i en fredlig by, och barnen tar mer av byns sed än de vuxna',
  kor: () => {
    const s = SIM.createState(4, START); klockan(s, 12);
    const fred = { aggression: 4, mod: 6, empati: 16 };
    const barn = nyInvanare(s, 'k', 4), vuxen = nyInvanare(s, 'm', 30);
    Object.assign(barn.pot, fred); Object.assign(vuxen.pot, fred);
    const fore = SIM.drarSed(s, barn, 'krig');
    // tio dygn (tio år i spelet) i en by med seden Krig: seden hålls kvar, och var och en tar av den varje timme
    const lev = (krig: number) => { for (let h = 0; h < 240; h++) { s.seder.v.krig = krig; s.now += SIM.HOUR; SIM.stepSeder(s); } };
    lev(0.8);
    const krigBarn = SIM.drarSed(s, barn, 'krig'), krigVuxen = SIM.drarSed(s, vuxen, 'krig'), arvBarn = barn.sedArv?.krig ?? 0, arvVuxen = vuxen.sedArv?.krig ?? 0;
    // samma barn i en fredlig by
    barn.sedArv = {}; lev(-0.8);
    const fredBarn = SIM.drarSed(s, barn, 'krig');
    return [
      [`barnet drar åt Krig efter tio dygn i en krigisk by (${krigBarn.toFixed(2)}, ${fore.toFixed(2)} innan)`, krigBarn > fore],
      [`samma barn i en fredlig by drar mindre åt Krig (${fredBarn.toFixed(2)})`, fredBarn < krigBarn],
      [`barnet har tagit mer av byns sed (${arvBarn.toFixed(2)}) än den vuxna (${arvVuxen.toFixed(2)})`, arvBarn > arvVuxen * 2 && arvVuxen > 0],
      [`ändå drar det fredliga barnet åt Fred: personligheten väger mest (${krigBarn.toFixed(2)}), och den vuxna lite mer åt Fred (${krigVuxen.toFixed(2)})`, krigBarn < 0 && krigVuxen < krigBarn],
    ];
  },
};

SCENARIER.foljder = {
  text: 'Steg 13.9.3: följderna drar tillbaka. Varje sed har i sin rad i SEDER de upplevelser som drar den tillbaka. Den som fryser ihjäl medan byn har ved drar de andra åt Sammanhållning, en död i strid mot rövarna åt Fred, ett redskap hos handlaren som byn inte kan göra åt Förnyelse och maten som ruttnar i förrådet åt Dagens behov',
  kor: () => {
    const { living, SEDER, SED_LIST, UPPLEVELSER, upplevelseSed } = SIM;
    // registret: varje följd drar sin sed åt andra hållet än det extrema
    const rader = SED_LIST.flatMap(k => (SEDER[k].foljder ?? []).map(f => ({ k, f, v: upplevelseSed(f as SIM.UpplevelseTyp)?.[k] ?? 0 })));
    const ny = (s: SIM.State) => { while (living(s).length < 10) nyInvanare(s, living(s).length % 2 ? 'm' : 'k', 25); };
    const upp = (s: SIM.State, k: string) => living(s).filter(p => p.upp?.some(u => u.k === k)).length;
    // kylan: med och utan ved i byn
    const kyla = (ved: boolean) => {
      const s = SIM.createState(5, START); ny(s);
      if (!ved) for (const a of SIM.stacksOf(s)) if (a.k === 'ved') a.n = 0;
      if (ved && SIM.amountOf(s, 'ved') < 1) SIM.put(s, 'ved', 5);
      SIM.die(s, living(s)[0]!, 'kyla');
      return upp(s, 'frosIhjal');
    };
    const medVed = kyla(true), utanVed = kyla(false);
    // striden mot rövarna
    const s2 = SIM.createState(6, START); ny(s2); SIM.die(s2, living(s2)[0]!, 'rovare');
    const stupade = upp(s2, 'stupade');
    // handlaren med ett redskap ingen i byn kan göra
    const s3 = SIM.createState(7, START); ny(s3);
    const okand = Object.keys(SIM.SAKER).find(k => { const t = SIM.SAKER[k]!.skaffa?.tek; return SIM.SAKER[k]!.redskap && t && !living(s3).some(p => SIM.knows(p, t)); })!;
    SIM.grannRedskap(s3, [{ k: okand, n: 1 }, { k: 'yxa', n: 1 }]);
    const grann = upp(s3, 'grannRedskap');
    // maten som ruttnar i förrådet
    const s4 = SIM.createState(8, START); ny(s4);
    // tio gånger ruttnar köttet i förrådet: var gång har var och en en liten chans att minnas det
    for (let i = 0; i < 10; i++) { SIM.put(s4, 'kott', 3); for (const a of SIM.stacksOf(s4)) if (a.k === 'kott' && SIM.isStored(s4, a.x, a.y)) a.c = 1e-9; SIM.wearStore(s4, 3600); }
    const rutt = upp(s4, 'ruttnade');
    return [
      [`fem seder har följder, och varje följd drar sin sed (${rader.map(r => `${r.k}: ${r.f} ${r.v > 0 ? '+' : ''}${r.v}`).join(', ')})`, rader.length >= 5 && rader.every(r => r.v !== 0 && (UPPLEVELSER as Record<string, unknown>)[r.f] !== undefined)],
      [`den som frös ihjäl medan byn hade ved lämnade spår hos ${medVed} av de levande, och utan ved hos ${utanVed}`, medVed > 0 && utanVed === 0],
      [`den som dog i striden mot rövarna lämnade spår hos ${stupade}`, stupade > 0],
      [`${grann} såg ${okand} hos handlaren, som ingen i byn kan göra`, grann > 0],
      [`${rutt} såg maten ruttna i förrådet`, rutt > 0],
    ];
  },
};

SCENARIER.avvikare = {
  text: 'Steg 13.9.4: avvikaren. Den som drar en sed långt åt ett håll och har hög karisma talar för den i samtalen, och den som tycker om hen drar lite åt samma håll en tid, som ett rykte. En avvikare utan karisma övertygar ingen, och det bleknar efter några dygn',
  kor: () => {
    const { SED_LIST, sedOppen, drar, drarSed, talaForSed } = SIM;
    const s = SIM.createState(9, START); klockan(s, 12);
    const a = nyInvanare(s, 'm', 30), b = nyInvanare(s, 'k', 30), c = nyInvanare(s, 'k', 30);
    Object.assign(a.pot, { karisma: 18, aggression: 20, mod: 20, empati: 1, flit: 20, intelligens: 20, nyfikenhet: 20 });
    const d = drar(s, a), k = SED_LIST.filter(x => sedOppen(s, x)).sort((x, y) => Math.abs(d[y]) - Math.abs(d[x]))[0]!, rikt = Math.sign(d[k]);
    const fore = drarSed(s, b, k) * rikt;
    for (let i = 0; i < 10; i++) { talaForSed(s, a, b, 60); talaForSed(s, a, c, 5); }
    const efter = drarSed(s, b, k) * rikt, ovan = drarSed(s, c, k) * rikt;
    // en avvikare utan karisma
    const tyst = nyInvanare(s, 'm', 30), lyss = nyInvanare(s, 'k', 30);
    Object.assign(tyst.pot, { ...a.pot, karisma: 6 });
    const tFore = drarSed(s, lyss, k); for (let i = 0; i < 10; i++) talaForSed(s, tyst, lyss, 60);
    const tEfter = drarSed(s, lyss, k);
    s.now += 20 * SIM.DAY;
    const sedan = drarSed(s, b, k) * rikt;
    return [
      [`avvikaren drar ${k} långt (${d[k].toFixed(2)})`, Math.abs(d[k]) >= 1],
      [`vännen drar mer åt samma håll efter tio samtal (${fore.toFixed(2)} → ${efter.toFixed(2)})`, efter - fore > 0.2],
      [`den som inte tycker om hen påverkas inte (${(ovan - fore).toFixed(2)})`, Math.abs(ovan - drarSed(s, c, k) * rikt) < 1e-9 && ovan <= fore + 1e-9],
      [`avvikaren utan karisma övertygar ingen (${tFore.toFixed(2)} → ${tEfter.toFixed(2)})`, tFore === tEfter],
      [`efter 20 dygn (20 år i spelet) har det nästan bleknat (${sedan.toFixed(2)})`, sedan - fore < (efter - fore) * 0.1],
    ];
  },
};

SCENARIER.skalrorelse = {
  text: 'Steg 13.9.5: tron rör sig. Varje skala säger i sin rad i SKALOR vilka upplevelser som flyttar den och åt vilket håll, och när en troende är med om en av dem flyttas skalan: svält trots offren drar tron åt Försakelse, överflöd åt Fest, en seger över rövarna åt Krigisk och en bön i nöd som får svar åt Nuet',
  kor: () => {
    const { SKALOR, SKALA_IDS, UPPLEVELSER, skalaV, troOf, troUpplev, living } = SIM;
    const s = SIM.createState(10, START); klockan(s, 12);
    const p = living(s)[0]!; SIM.grunda(s, p, 'blixt');
    const tr = troOf(s, p.tro!)!;
    tr.sk = { prast: 50, livet: 50, forlat: 50, fest: 50, krig: 50, oppen: 50, sprid: 50 }; tr.natur = 50; tr.manga = 50;
    const fel = SKALA_IDS.flatMap(k => Object.keys(SKALOR[k].flyttas).filter(u => !(u in UPPLEVELSER)).map(u => `${k}: ${u}`));
    const v = (k: SIM.SkalaId) => skalaV(tr, k)!;
    troUpplev(s, p, 'svalt'); troUpplev(s, p, 'svalt');
    const fest = v('fest');
    troUpplev(s, p, 'overflod');
    const fest2 = v('fest');
    troUpplev(s, p, 'rovareBort'); const krig = v('krig');
    const livet0 = v('livet'); troUpplev(s, p, 'bonHjalpte'); const livet = v('livet');
    // den som inte tror flyttar inget
    const q = nyInvanare(s, 'k', 30); q.tro = undefined; const fore = JSON.stringify(tr.sk); troUpplev(s, q, 'svalt');
    return [
      [`alla skalor har upplevelser som flyttar dem, och alla finns i UPPLEVELSER (${fel.join(', ') || 'inga fel'})`, !fel.length && SKALA_IDS.every(k => Object.keys(SKALOR[k].flyttas).length > 0)],
      [`svälten drar tron åt Försakelse (50 → ${fest}), överflödet tillbaka åt Fest (${fest2})`, fest > 50 && fest2 < fest],
      [`segern över rövarna drar åt Krigisk (${krig}) och bönen som fick svar åt Nuet (${livet0} → ${livet})`, krig > 50 && livet < livet0],
      ['den som inte tror flyttar inget', JSON.stringify(tr.sk) === fore],
    ];
  },
};

SCENARIER.sparren = {
  text: 'Steg 13.9.6: spärren för den egna maten. Raden för egen mat är full när familjen har sin gräns (egenFull i FORRADSMAL, halva familjens buffert), så den som har mer än så går vidare till annat arbete. Den som har silver köper mat upp till gränsen av den som har mer, och den som säljer behåller lika mycket för sin egen familj. Den fattiga utan silver samlar själv.',
  kor: () => {
    const { MAT, FORRADSMAL, egenGrans, gain, ownsAmount, chooseTask, askForGift, payable } = SIM;
    const s = SIM.createState(5, START); klockan(s, 10); tandEld(s); setFood(s, 300); SIM.setAmount(s, 'ved', 80); s.delning = { andel: 0 };
    const halv = nyInvanare(s, 'm', 30), fattig = nyInvanare(s, 'k', 30), kopare = nyInvanare(s, 'm', 30), odlare = nyInvanare(s, 'k', 30);
    const grans = egenGrans(s, halv), dygn = MAT.kvar(s, halv), full = grans / (FORRADSMAL.mat.egenFull ?? 1);
    const egenMat = (q: SIM.Person) => { let n = 0; for (let i = 0; i < 30; i++) { q.task = undefined; chooseTask(s, q); if ((q.task as SIM.Task | undefined)?.why?.startsWith('Behöver egen mat')) n++; } return n; };
    // en familj med mer än gränsen men mindre än hela bufferten
    gain(s, halv, 'bar', Math.ceil((grans + full) / 2));
    const halvSamlar = egenMat(halv), fattigSamlar = egenMat(fattig);
    // köparen har silver och nästan ingen mat, odlaren mycket mat
    gain(s, kopare, 'silver', 40); gain(s, kopare, 'bar', 1); gain(s, odlare, 'bar', Math.ceil(grans) + 6);
    const odlarFore = ownsAmount(s, odlare, 'bar'), saljbart = payable(s, odlare, ['silver']).find(v => v.k === 'bar')?.n ?? 0;
    for (let i = 0; i < 10; i++) askForGift(s, kopare, odlare);
    const kopt = ownsAmount(s, kopare, 'bar'), odlarKvar = ownsAmount(s, odlare, 'bar');
    return [
      [`gränsen är halva familjens buffert (${grans.toFixed(1)} av ${full.toFixed(1)}, ett dygn är ${dygn.toFixed(1)})`, Math.abs(grans * 2 - full) < 1e-9 && grans > dygn],
      [`den med mat över gränsen (${ownsAmount(s, halv, 'bar')}) arbetar inte för egen mat (${halvSamlar} av 30)`, halvSamlar === 0],
      [`den fattiga utan mat och silver samlar själv (${fattigSamlar} av 30)`, fattigSamlar >= 5],
      [`köparen med silver köper mer än ett dygn, upp till gränsen (${kopt} mat, gränsen ${grans.toFixed(1)})`, kopt > dygn + 1 && kopt <= Math.ceil(grans) + 1],
      [`odlaren sålde (${odlarFore} → ${odlarKvar}) men behåller sin gräns (${saljbart} gick att sälja)`, odlarKvar < odlarFore && odlarKvar >= Math.floor(grans)],
    ];
  },
};

SCENARIER.hantverksfardighet = {
  text: 'Steg 13.9.7: hantverket får egna färdigheter. Smide, krukmakeri, vävning och sömnad är färdigheter, och varje handling i ACTS säger vilken den övar: smeden övar smide och inte vävning, lärlingen övar mästarens färdighet, och de nya färdigheterna börjar på hantverkets värde, också i en sparad by.',
  kor: () => {
    const { ACTS, HANT_SKILLS, hantSkill, tekSkill, TEK, living } = SIM;
    const s = SIM.createState(11, START); klockan(s, 10); tandEld(s);
    const smed = nyInvanare(s, 'm', 30);
    const start = HANT_SKILLS.every(k => smed.skill[k] === smed.skill.hantverk);
    // smeden arbetar vid smedjan en stund
    const fore = { ...smed.skill };
    smed.task = { act: 'smida', phase: 'do', tx: smed.x, ty: smed.y, until: s.now + 2 * SIM.HOUR, carry: 0 } as SIM.Task;
    for (let i = 0; i < 400 && smed.task?.act === 'smida'; i++) { smed.task.until = s.now + SIM.HOUR; SIM.step(s, BEAT); }
    const smide = smed.skill.smide - fore.smide, vav = smed.skill.vavning - fore.vavning, hant = smed.skill.hantverk - fore.hantverk;
    // lärlingen hos en sömmerska övar sömnad
    const larl = nyInvanare(s, 'k', 20), mast = nyInvanare(s, 'k', 40);
    larl.lar = { av: mast.id, tek: 'skinnklader' };
    const larSk = hantSkill(larl, { act: 'lara' } as SIM.Task);
    // en sparad by från före steget
    const g = SIM.createState(12, START); g.v = 68;
    for (const p of g.people) for (const k of HANT_SKILLS) delete (p.skill as Partial<Record<SIM.Skill, number>>)[k];
    SIM.migrate(g);
    const sparad = living(g).every(p => HANT_SKILLS.every(k => p.skill[k] === p.skill.hantverk));
    const utan = ['spinna', 'vava', 'lerkruka', 'garva', 'skjorta', 'smida', 'kola'].filter(a => !ACTS[a as SIM.Act]?.fardighet);
    return [
      [`de nya färdigheterna börjar på hantverkets värde (${smed.skill.hantverk.toFixed(2)})`, start],
      [`handlingarna säger sin färdighet (${utan.join(', ') || 'alla'})`, !utan.length && hantSkill(smed, { act: 'vava' } as SIM.Task) === 'vavning' && hantSkill(smed, { act: 'hantverk' } as SIM.Task) === 'hantverk'],
      [`smeden övar smide (+${smide.toFixed(3)}) och inte vävning (+${vav.toFixed(3)}) eller hantverk (+${hant.toFixed(3)})`, smide > 0 && vav === 0 && hant === 0],
      [`lärlingen hos sömmerskan övar ${larSk} (tekniken ${tekSkill(TEK.skinnklader!)})`, larSk === 'somnad'],
      ['en sparad by får de nya färdigheterna av hantverket', sparad],
    ];
  },
};

SCENARIER.kunnande = {
  text: 'Steg 13.9.8: skickligheten ger fart och kvalitet. Hur mycket skickligheten betyder följer sakens nivå (registret KUNNA): den skicklige smeden smider mycket fortare och bättre än nybörjaren, men vid korgen är skillnaden liten. Projekten räknas i den egna tiden, så den skicklige ser mer värde i det hen är bra på. Mängden i receptet ändras inte.',
  kor: () => {
    const { kunnaFart, kunnaVikt, rullaKvalitet, PROJEKT, PROJEKT_LIST, personVarde } = SIM;
    const s = SIM.createState(13, START); klockan(s, 10); tandEld(s);
    const smed = nyInvanare(s, 'm', 35), ny = nyInvanare(s, 'm', 35);
    for (const k of SIM.HANT_SKILLS) { smed.skill[k] = 15; ny.skill[k] = 2; }
    smed.skill.hantverk = 15; ny.skill.hantverk = 2;
    const fs = kunnaFart(s, smed, 'smida'), fn = kunnaFart(s, ny, 'smida');
    const ks = kunnaFart(s, smed, 'korg'), kn = kunnaFart(s, ny, 'korg');
    const q = (p: SIM.Person) => { let n = 0; for (let i = 0; i < 200; i++) n += rullaKvalitet(s, p, 0, 'smide', kunnaVikt('smida')); return n / 200; };
    const qs = q(smed), qn = q(ny);
    // ett projekt där skickligheten betyder mycket: det skickliga ser mer värde per timme
    const svar = PROJEKT_LIST.find(k => { const a = PROJEKT[k].arbete; return a && kunnaVikt(a.act, a.k) >= 0.5 && PROJEKT[k].kostnad(s) > a.min / 60 * SIM.ARBETE; });
    const vs = svar ? personVarde(s, svar, [smed], 1, smed) : 0, vn = svar ? personVarde(s, svar, [ny], 1, ny) : 0;
    return [
      [`smeden smider fortare än nybörjaren (${fs.toFixed(2)} mot ${fn.toFixed(2)} gånger receptets fart)`, fs > 1.5 && fn < 0.85],
      [`vid korgen är skillnaden liten (${ks.toFixed(2)} mot ${kn.toFixed(2)})`, ks - kn < 0.15],
      [`smeden gör bättre saker (kvalitet ${qs.toFixed(2)} mot ${qn.toFixed(2)})`, qs > qn + 0.5],
      [`projektet ${svar ?? '(inget)'} är mer värt för den skicklige (${vs.toExponential(2)} mot ${vn.toExponential(2)})`, !!svar && vs > vn],
    ];
  },
};

SCENARIER.sammabyte = {
  text: 'Steg 13.9.9: alla saker byts efter samma regler (registret BRUK i behov.ts). Den som saknar en rock köper den av den som sytt den, den som saknar lera till sitt arbete köper den av en granne, en kruka byts som en yxa, och handlaren värderar alla saker på samma sätt.',
  kor: () => {
    const { BRUK, brukAv, behovAv, askForGift, payable, personPart, newTing, tingOf, KLAD_SLAG, ownsAmount, gain, addHabit, getRel } = SIM;
    const s = SIM.createState(17, START); klockan(s, 10); tandEld(s);
    const vanner = (a: SIM.Person, b: SIM.Person) => { getRel(s, a, b).op = 30; getRel(s, b, a).op = 30; };
    // sömmerskan har sytt två rockar, och grannen fryser utan någon
    const som = nyInvanare(s, 'k', 35), kopare = nyInvanare(s, 'm', 30);
    const rock = KLAD_SLAG.find(k => k.startsWith('rock_'))!;
    newTing(s, rock, 1, som.id); newTing(s, rock, 1, som.id);
    gain(s, kopare, 'silver', 30); vanner(som, kopare);
    for (let i = 0; i < 20 && !tingOf(s).some(t => t.k === rock && t.agare === kopare.id); i++) { kopare.bruk = undefined; askForGift(s, kopare, som); }
    const fickRock = tingOf(s).some(t => t.k === rock && t.agare === kopare.id), somKvar = tingOf(s).filter(t => t.k === rock && t.agare === som.id).length;
    // krukmakaren gör krukor, och grannen har lera över
    const kruk = nyInvanare(s, 'k', 30), granne = nyInvanare(s, 'm', 30);
    addHabit(kruk, 'lerkruka', 30, 3); SIM.setAmount(s, 'lera', 0); s.delning = { andel: 0 }; gain(s, granne, 'lera', 12); gain(s, kruk, 'silver', 30); vanner(kruk, granne); // byn delar inget: grannen äger all sin lera
    const leraSaknas = brukAv('lera').saknar(s, kruk, 'lera'), leraFore = ownsAmount(s, kruk, 'lera');
    for (let i = 0; i < 20 && ownsAmount(s, kruk, 'lera') <= leraFore; i++) { kruk.bruk = undefined; askForGift(s, kruk, granne); }
    const leraKopt = ownsAmount(s, kruk, 'lera') - leraFore;
    // krukan och yxan följer samma rad
    const kruka = Object.keys(SIM.SAKER).find(k => k.startsWith('lerkruka_'))!;
    const sammaRad = brukAv(kruka) === brukAv('yxa');
    // handlaren ser samma värde och får rocken över bjuden som allt annat
    const sp = payable(s, som, []).some(v => v.k === rock), pv = personPart(s, kopare).varde(rock) === behovAv(s, kopare, rock);
    return [
      [`registret har en rad per bruk (${BRUK.map(r => r.id).join(', ')})`, BRUK.length >= 6],
      [`den som saknar en rock fick den av sömmerskan (${fickRock ? 'ja' : 'nej'}, hon har ${somKvar} kvar)`, fickRock && somKvar === 1],
      [`krukmakaren saknar lera till sitt arbete (${leraSaknas}) och köpte ${leraKopt} av grannen`, leraSaknas > 0 && leraKopt >= 1],
      [`krukan och yxan byts efter samma rad (${brukAv(kruka).id})`, sammaRad],
      [`handlaren värderar som bybon själv (${pv ? 'ja' : 'nej'}), och rocken hon har över kan hon byta bort (${sp ? 'ja' : 'nej'})`, pv && sp],
    ];
  },
};

SCENARIER.skicklighetsvakt = {
  text: 'Steg 13.9.10: vakten för skickligheten larmar när en handling som gör något saknar sin färdighet för fart och kvalitet, och när en sak som går åt i ett recept saknar sin rad i BRUK, som vakten för arbetstiderna',
  kor: () => {
    const nu = SIM.utanFardighet(), bruk = SIM.utanBruk();
    const ACTS = SIM.ACTS as Record<string, SIM.ActDef>;
    // en ny handling som gör en sak utan teknik och utan eget kunnande, och en med en färdighet som inte finns
    const utan = SIM.utanFardighet({ ...ACTS, provhantverk: { namn: 'Prövar', slag: 'hantverk', hantverk: true } as SIM.ActDef }, { ...SIM.GORS, provhantverk: ['provsak'] });
    const fel = SIM.utanFardighet({ ...ACTS, provhantverk: { namn: 'Prövar', slag: 'hantverk', hantverk: true, kunna: 0.5, fardighet: 'trolldom' } as unknown as SIM.ActDef }, SIM.GORS);
    const med = SIM.utanFardighet({ ...ACTS, provhantverk: { namn: 'Prövar', slag: 'hantverk', hantverk: true, kunna: 0.5, fardighet: 'smide' } as SIM.ActDef }, SIM.GORS);
    // en sak som går åt i ett recept men hamnar i det övriga
    const ovrig = Object.keys(SIM.SAKER).find(k => SIM.brukAv(k) === SIM.BRUK_OVRIGT)!;
    const brukLarm = SIM.utanBruk(k => k === ovrig);
    return [
      [`alla handlingar som gör något har sin färdighet och nivå (${nu.length ? nu.join('; ') : 'inget larm'})`, nu.length === 0],
      [`alla saker som går åt i ett recept har sin rad i BRUK (${bruk.length ? bruk.join('; ') : 'inget larm'})`, bruk.length === 0],
      [`vakten larmar för en handling utan nivå (${utan.join('; ') || 'inget larm'})`, utan.some(f => f.startsWith('provhantverk'))],
      [`och för en färdighet som inte finns (${fel.join('; ') || 'inget larm'})`, fel.some(f => f.startsWith('provhantverk'))],
      [`men inte när handlingen har både färdighet och kunnande`, !med.some(f => f.startsWith('provhantverk'))],
      [`och för en sak i receptet som ingen rad tar (${brukLarm.join('; ') || 'inget larm'})`, brukLarm.length === 1],
      [`skinnet, som går åt i recepten, är ett material i bruket (${SIM.brukAv('skinn').id})`, SIM.brukAv('skinn').id === 'material'],
    ];
  },
};

SCENARIER.bildmotiv = {
  text: 'Steg 13.9.15: bildstenar om fler händelser. Lusten att resa en bildsten kommer ur alla stora händelser personen varit med om eller minns (registret BILDMOTIV i bildsten.ts), och minskar för varje bildsten byn redan har om samma sorts händelse: i en by med många stenar om uppfinningar reser nästa ristare en sten om striden mot rövarna, och den som fått svar på en bön i nöd reser en sten om den',
  kor: () => {
    const s = SIM.createState(5, START); klockan(s, 10);
    const ristare = nyInvanare(s, 'm', 35), kampe = nyInvanare(s, 'k', 30), bedjare = nyInvanare(s, 'k', 40);
    for (const p of SIM.living(s)) { (p.tek ??= {}).stenhuggarplats = 1; p.bedrift = undefined; p.upp = (p.upp ?? []).filter(u => u.t === undefined); p.intryck = []; }
    // ristaren kom själv på något, och minns att kämpen stod kvar och slogs när rövarna kom
    ristare.bedrift = { h: 'pahittig', t: s.now, sak: 'krukan' };
    ristare.intryck = [{ om: kampe.id, namn: kampe.name, k: 'forsvarare', v: 0.6, c: 1, t: s.now, bev: [{ h: 'forsvarade', t: s.now, sett: true }] }] as SIM.Person['intryck'];
    const fore = SIM.runstenLust(s, ristare);
    // byn har redan fyra bildstenar om uppfinningar
    for (let i = 0; i < 4; i++) SIM.runstenarOf(s).push({ id: 100 + i, x: i, y: 0, t: s.now, slag: 'handelse', av: { id: 0, namn: 'Förr' }, om: { id: 0, namn: 'Förr' }, text: '', runor: '', bild: 1, motiv: 'uppfinning', ht: s.now - i });
    const efter = SIM.runstenLust(s, ristare);
    // den som fått svar på en bön i nöd
    (bedjare.upp ??= []).push({ k: 'bonHjalpte', a: 40, e: {}, v: 1, t: s.now }); // upplevelsen fastnar (upplev slumpar det)
    const bon = SIM.runstenLust(s, bedjare);
    // stenen reses: bilderna visar bönen
    SIM.setAmount(s, 'huggen_sten', 3);
    const at = SIM.runstenPlats(s)!; bedjare.x = at.x + 0.5; bedjare.y = at.y + 0.5;
    const n0 = s.runstenar!.length;
    if (bon) SIM.runstenKlar(s, bedjare, { act: 'runsten', phase: 'do', until: s.now, tool: bon.slag, ref: bon.om.id, tx: at.x + 0.5, ty: at.y + 0.5 } as SIM.Task);
    const sten = s.runstenar!.length > n0 ? s.runstenar![s.runstenar!.length - 1] : undefined;
    return [
      [`registret har en rad per sorts händelse (${Object.keys(SIM.BILDMOTIV).join(', ')}), och en strid väger mer än en uppfinning`, Object.keys(SIM.BILDMOTIV).length >= 6 && SIM.BILDMOTIV.strid.vikt > SIM.BILDMOTIV.uppfinning.vikt],
      [`utan stenar vill ristaren resa en sten (${fore?.motiv}, ${fore?.om.namn})`, fore?.slag === 'handelse'],
      [`med fyra stenar om uppfinningar blir det striden mot rövarna, om kämpen (${efter?.motiv}, ${efter?.om.namn}, ${efter?.vad})`, efter?.motiv === 'strid' && efter.om.id === kampe.id],
      [`den som fått svar på en bön i nöd vill resa en sten om den (${bon?.motiv}, ${bon?.vad})`, bon?.slag === 'handelse' && bon.motiv === 'helig'],
      [`och reser den: "${sten?.text}"`, !!sten && sten.bild === 1 && sten.motiv === 'helig' && /bön/i.test(sten.text)],
      ['samma händelse blir inte två stenar', SIM.runstenLust(s, bedjare)?.motiv !== 'helig'],
    ];
  },
};

SCENARIER.bildtext = {
  text: 'Steg 13.9.16: bildstenens text visar bilden. Rutan säger först vad bilderna föreställer och sedan vad de berättar; bilden byggs ur radens motiv i BILDMOTIV, ur det som hände och ibland ett slumpat motiv, väljs när stenen reses och sparas. Två stenar om samma sorts händelse får olika bilder, och texten nämner personerna och händelsen',
  kor: () => {
    const s = SIM.createState(9, START); klockan(s, 10);
    const folk = [nyInvanare(s, 'm', 35), nyInvanare(s, 'k', 32), nyInvanare(s, 'm', 40), nyInvanare(s, 'k', 28)];
    const texter: string[] = [];
    for (const p of SIM.living(s)) { (p.tek ??= {}).stenhuggarplats = 1; p.bedrift = undefined; p.upp = (p.upp ?? []).filter(u => u.t === undefined); p.intryck = []; }
    for (const [i, p] of folk.entries()) {
      p.bedrift = { h: 'bjorndodare', t: s.now - i * SIM.HOUR };
      const l = SIM.runstenLust(s, p);
      SIM.setAmount(s, 'huggen_sten', 3);
      const at = SIM.runstenPlats(s)!; p.x = at.x + 0.5; p.y = at.y + 0.5;
      if (l) SIM.runstenKlar(s, p, { act: 'runsten', phase: 'do', until: s.now, tool: l.slag, ref: l.om.id, tx: at.x + 0.5, ty: at.y + 0.5 } as SIM.Task);
      texter.push(s.runstenar?.[s.runstenar.length - 1]?.text ?? '');
    }
    const bilder = texter.map(t => t.split('. ')[0]);
    const sparad = s.runstenar?.[0]?.text, efter = SIM.runstenarOf(s)[0]?.text;
    return [
      [`fyra stenar om björnar reses (${texter.filter(Boolean).length})`, texter.filter(Boolean).length === 4],
      [`texten börjar med bilden och berättar sedan: "${texter[0]}"`, texter.every(t => /^Stenen visar .+\. .+/.test(t))],
      [`bilderna skiljer sig (${new Set(bilder).size} olika av ${bilder.length}: ${bilder.join(' | ')})`, new Set(bilder).size >= 2],
      ['texten nämner björnen och den som fällde den', texter.every((t, i) => /björn/.test(t) && t.includes(folk[i]!.name))],
      ['bilden sparas med stenen', !!sparad && sparad === efter],
    ];
  },
};

// ---------- granskningens fynd (steg 13.10.6–13.10.14) ----------
const MAR_BRA = { rest: 1, toa: 1, hunger: 1, social: 1, warm: 1, health: 1, torst: 1 };
const nyttVal = (s: SIM.State, p: SIM.Person, lage: Partial<SIM.Person> = {}) => { Object.assign(p, MAR_BRA, { task: undefined }, lage); SIM.chooseTask(s, p); return p.task as SIM.Task | undefined; };

SCENARIER.virkeattfa = {
  text: 'Steg 13.10.6: ett bygge som behöver virke väntar när virket inte går att få (ingen stam att klyva och inget träd att fälla), både för den som har en ledig yxa och för den som saknar en: ingen hugger ved eller samlar grenar till virket och ingen gör en yxa åt det. Går virket att få hämtas det',
  kor: () => {
    const s = SIM.createState(3, START); klockan(s, 10); setFood(s, 600); tandEld(s);
    SIM.setAmount(s, 'ved', 300); SIM.setAmount(s, 'grenar', 200); SIM.setAmount(s, 'torrgras', 200); SIM.setAmount(s, 'virke', 0); SIM.setAmount(s, 'flinta', 10);
    const vuxna = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
    for (const p of vuxna) (p.tek ??= {}).yxa = 1;
    // ett hus är planerat, och väggarna är av virke
    for (const p of vuxna) Object.assign(p.tek ??= {}, { timmervagg: 1, klyvplats: 1 });
    SIM.planBuild(s);
    for (const h of (s.hus ?? [])) for (let y = h.y - 1; y < h.y + h.h + 1; y++) for (let x = h.x - 1; x < h.x + h.w + 1; x++) SIM.groundOf(s).trees[y * SIM.W + x] = 0;
    SIM.touch(s);
    s.styre = { historia: [], oppna: [], sedan: s.now, titel: '', satt: 0, pabud: { bygg: 1 }, lagar: [], ledare: vuxna[0]!.id } as unknown as SIM.State['styre']; // byn har påbud om bygget, så att det väljs
    const virke = SIM.PROJEKT.virke!, uppgift = virke.uppgift;
    const prov = (gar: boolean, yxa: boolean) => {
      virke.uppgift = gar ? () => ({ act: 'klyva', text: 'Klyver virke ur en fälld stam.', tool: 'yxa', spot: { x: vuxna[0]!.x, y: vuxna[0]!.y } }) : () => undefined;
      s.ting = (s.ting ?? []).filter(t => t.k !== 'yxa' && t.k !== 'jarnyxa');
      if (yxa) for (const p of vuxna) { const t = SIM.addTool(s, 'yxa', p); t.hos = undefined; }
      const skal: string[] = [];
      for (let i = 0; i < 120; i++) { const p = vuxna[i % vuxna.length]!, t = nyttVal(s, p); if (/^Bygget behöver virke/.test(t?.why ?? '')) skal.push(t!.act); p.task = undefined; }
      virke.uppgift = uppgift;
      return skal;
    };
    const ja = prov(true, true), nej = prov(false, true), nejUtan = prov(false, false);
    const jobb = SIM.buildJob(s, vuxna[0]!);
    return [
      [`bygget saknar virke (${jobb?.item})`, jobb?.item === 'virke' && jobb.missing],
      [`går virket att få klyvs det till bygget (${ja.length} av 120 val: ${[...new Set(ja)].join(', ')})`, ja.length > 0 && ja.every(a => a === 'klyva')],
      [`finns varken stam eller träd väntar bygget (${nej.length} val med det skälet)`, nej.length === 0],
      [`också för den som saknar yxa: ingen yxa görs i onödan (${nejUtan.length} val)`, nejUtan.length === 0],
    ];
  },
};

SCENARIER.turmal = {
  text: 'Steg 13.10.7: turens mål gäller allt man går ut efter: tändmaterialet, höet och grenarna. Den som hämtar hö eller grenar säger det, går dit det finns, bär bara hem det, och turen slutar när händerna är fulla eller passet är slut, inte när förrådet räcker. Grenturen blir aldrig yxa eller torv',
  kor: () => {
    const ut: [string, boolean][] = [];
    for (const [k, namn] of [['torrgras', 'Samlar hö'], ['grenar', 'Samlar grenar']] as const) {
      const s = SIM.createState(4, START); klockan(s, 10); setFood(s, 400); tandEld(s);
      SIM.setAmount(s, 'torrgras', 400); SIM.setAmount(s, 'grenar', 400); SIM.setAmount(s, 'ved', 300); // förrådet räcker redan
      const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
      for (const q of SIM.living(s)) if (q !== p) q.task = { act: 'sova', phase: 'do', tx: q.x, ty: q.y, until: s.now + 5 * SIM.HOUR, carry: 0, why: '' } as SIM.Task;
      Object.assign(p, MAR_BRA);
      const at = SIM.tandStalle(s, p, [k])!;
      p.x = at.x; p.y = at.y;
      p.task = { act: 'samla', phase: 'do', tx: at.x, ty: at.y, until: s.now + 90 * SIM.MIN, carry: 0, why: 'Bygget behöver det', hamtar: k, dark: false } as SIM.Task;
      const t0 = p.task, n0 = SIM.taskName(t0), fore = SIM.amountOf(s, k), start = s.now;
      let med: Record<string, number> = {}, slut = 0, full = false;
      for (let i = 0; i < 600 && p.task === t0 && (t0.phase as string) !== 'back'; i++) { SIM.step(s, 10); if ((t0.phase as string) !== 'back') med = { ...t0.items }; slut = s.now; full = SIM.fullBorda(s, p, t0); }
      med = { ...med, ...(t0.items ?? {}) };
      ut.push([`${namn}: turen heter så (${n0})`, n0 === namn]);
      ut.push([`${namn}: hen bär bara hem det (${JSON.stringify(med)})`, (med[k] ?? 0) > 0 && Object.entries(med).every(([q, n]) => q === k || !(n > 0))]);
      ut.push([`${namn}: turen slutar när händerna är fulla eller passet är slut (${Math.round((slut - start) / SIM.MIN)} min, fullt: ${full ? 'ja' : 'nej'}), fast förrådet har ${fore}`, full || slut - start >= 85 * SIM.MIN]);
    }
    // grenarna till förrådet och byggena: alltid en samlartur, aldrig yxa eller torv
    ut.push(['grenar och hö är alltid turens mål, och veden aldrig', SIM.turMal({ act: 'samla', hamtar: 'grenar' } as SIM.Task)?.join() === 'grenar' && !SIM.turMal({ act: 'ved', hamtar: 'ved' } as SIM.Task)]);
    return ut;
  },
};

SCENARIER.minalder = {
  text: 'Steg 13.10.8: radernas minsta ålder prövas på ett ställe, och toaraderna gäller från småbarnens gräns (ALDER.smabarn): ett litet barn som är nödigt sover och går inte på toa, ett äldre barn går',
  kor: () => {
    const s = SIM.createState(2, START); klockan(s, 10); tandEld(s); setFood(s, 100);
    const litet = nyInvanare(s, 'k', 1), stort = nyInvanare(s, 'm', 5);
    const val = (p: SIM.Person, toa: number) => nyttVal(s, p, { toa })?.act;
    const a = [0.01, 0.1, 0.2].map(t => val(litet, t)), b = val(stort, 0.01);
    return [
      [`det lilla barnet går aldrig på toa (${a.join(', ')})`, a.every(x => x !== 'toa')],
      [`barnet på fem år går på toa (${b})`, b === 'toa'],
      ['raderna har gränsen, inte koden runt dem', SIM.ARBETEN.filter(r => r.id === 'toa' || r.id === 'toaGenast').every(r => r.minAlder === SIM.ALDER.smabarn)],
    ];
  },
};

SCENARIER.forstar = {
  text: 'Steg 13.10.9: den som förstår en teknik av något som hänt (kornet, ölet, mjödet och komposten) kan den, men ingen blir påhittig eller känd för den: byn får en rad, ingen notis och ingen rad i krönikan',
  kor: () => {
    const s = SIM.createState(3, START); klockan(s, 10);
    const folk = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
    for (const p of folk) (p.tek ??= {}).odling = 1;
    const fame = folk.map(p => p.fame.length), kr = s.hist?.kronika.length ?? 0, no = s.notiser?.lista.length ?? 0;
    SIM.upptack(s, SIM.TEK.sadesodling!, p => SIM.knows(p, 'odling'), 'sadesodling', p => `Byn har fått korn av handlarna, och ${p.name} förstår att det kan sås på fältet.`);
    const rader = s.log.filter(l => /kan sås på fältet/.test(JSON.stringify(l))).length;
    return [
      [`alla som odlar kan nu så korn (${folk.filter(p => SIM.knows(p, 'sadesodling')).length} av ${folk.length})`, folk.every(p => SIM.knows(p, 'sadesodling'))],
      [`byn får en rad (${rader})`, rader === 1],
      ['ingen är känd för det och ingen minns någon som påhittig', folk.every((p, i) => p.fame.length === fame[i] && p.bedrift?.h !== 'pahittig' && !(p.intryck ?? []).some(x => x.k === 'pahittig'))],
      ['ingen notis och ingen rad i krönikan', (s.hist?.kronika.length ?? 0) === kr && (s.notiser?.lista.length ?? 0) === no],
    ];
  },
};

SCENARIER.stenskal = {
  text: 'Steg 13.10.10: en enda funktion säger vad som fattas av stenarna och flintan och styr poängen, skälet och vad man letar efter. Det som hämtats ur förrådet till ett arbete är inte på väg hem; det en samlare bär är det. Ringen som saknas är skild från förrådsmålet, och skälet säger vad stenarna ska till',
  kor: () => {
    const s = SIM.createState(4, START); klockan(s, 10); tandEld(s);
    const [p, q] = SIM.living(s).filter(x => SIM.ageOf(x, s.now) >= SIM.ALDER.vuxen);
    SIM.setAmount(s, 'flinta', 20); SIM.setAmount(s, 'sten', 0); s.arbBehov = undefined;
    s.fire.ring = false; s.brasa = undefined; s.stackar = (s.stackar ?? []).filter(a => a.k !== 'sten');
    const ringSkal = SIM.stenTill(s), ring = SIM.ringenSaknas(s), mest = SIM.letaMest(s);
    // den som hämtat stenar till ett arbete bär dem inte hem; den som samlat dem gör det
    const fattas0 = SIM.letaFattas(s, 'sten');
    p!.task = { act: 'station', phase: 'do', tx: p!.x, ty: p!.y, until: s.now + SIM.HOUR, carry: 0, why: '', hamtad: 1, items: { sten: 3 } } as SIM.Task;
    const arbete = SIM.letaFattas(s, 'sten');
    p!.task = { act: 'samla', phase: 'back', tx: p!.x, ty: p!.y, until: s.now + SIM.HOUR, carry: 0, why: '', sok: 'sten', items: { sten: 3 } } as SIM.Task;
    const hem = SIM.letaFattas(s, 'sten');
    p!.task = undefined;
    // med ringen på plats: en lägereld till, och bara ett förrådsmål
    s.fire.ring = true;
    s.brasa = { vill: 1 } as NonNullable<SIM.State['brasa']>; const lager = SIM.stenTill(s), ringNu = SIM.ringenSaknas(s);
    s.brasa = undefined; s.projektSaknar = { sten: { beh: 4, n: 1, b: 1 } }; s.arbBehov = undefined;
    const bara = SIM.stenTill(s), needs = SIM.needStones(s), tinder = (() => { s.fire.lit = false; s.fire.fuel = 0; s.fire.emberUntil = undefined; SIM.setAmount(s, 'torrgras', 100); SIM.setAmount(s, 'grenar', 100); SIM.setAmount(s, 'ved', 100); return SIM.tinderNeeded(s); })();
    // skälet, uppgiften och det man letar efter är samma sak
    const par = new Set<string>();
    SIM.setAmount(s, 'flinta', 0); s.projektSaknar = undefined; s.arbBehov = undefined; tandEld(s); setFood(s, 400);
    for (let i = 0; i < 80; i++) { const t = nyttVal(s, q!); if (t?.sok) par.add(`${/behöver (flinta|stenar)/.exec(t.why ?? '')?.[1] ?? '?'}/${t.sok}`); q!.task = undefined; }
    return [
      [`utan ring och stenar saknas ringen${ringSkal}, och stenarna saknas helt (${mest?.k}, ${mest?.brist})`, ring && ringSkal === ' till en eldring' && mest?.k === 'sten' && mest.brist === 1],
      [`stenarna som hämtats till ett arbete räknas inte (fattas ${fattas0}, ${arbete}), de som bärs hem räknas (${hem})`, arbete === fattas0 && hem === fattas0 - 3],
      [`till en lägereld sägs det (${lager.trim()}), och ringen saknas inte`, lager === ' till en lägereld' && !ringNu],
      [`till något annat sägs bara stenar (fattas: ${needs ? 'ja' : 'nej'}), och ingen letar stenar för att tända elden`, bara === '' && !tinder],
      [`skälet och det man letar efter är samma sak (${[...par].join(', ')})`, par.size > 0 && [...par].every(x => x === 'flinta/flinta' || x === 'stenar/sten')],
    ];
  },
};

SCENARIER.frammetid = {
  text: 'Steg 13.10.12: passet vid grillen, stekhällen, torkställningen, rökeriet och slaktbänken räknas från att man kommit fram, som vården och gravandet: den som har långt att gå får lika lång tid vid stationen',
  kor: () => {
    const s = SIM.createState(4, START); klockan(s, 10); tandEld(s);
    const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    const acts = ['grilla', 'steka', 'torka', 'roka', 'slakta', 'rensa'] as SIM.Act[];
    const b = medBank(s, 'slaktbank'), at = SIM.vidStation(b);
    SIM.setAmount(s, 'vilt', 6); (p.tek ??= {}).slaktbank = 1; SIM.addTool(s, 'kniv', p);
    const tid = 12 * SIM.MIN;
    const prov = (vag: number) => {
      p.x = at.x; p.y = at.y;
      p.task = { act: 'slakta', phase: 'go', tx: at.x, ty: at.y, until: s.now + tid + SIM.GA_TID, arbTid: tid, carry: 0, why: '' } as SIM.Task;
      s.now += vag; SIM.startWork(s, p, p.task); const kvar = p.task!.until - s.now; p.task = undefined;
      return kvar;
    };
    const nara = prov(0), langt = prov(20 * SIM.MIN);
    return [
      [`handlingarna räknas från framkomsten (${acts.filter(a => SIM.ACTS[a].framme).join(', ')})`, acts.every(a => SIM.ACTS[a].framme && SIM.startsOnArrival(a))],
      [`den som gått i 20 minuter slaktar lika länge (${nara / SIM.MIN} och ${langt / SIM.MIN} minuter)`, nara === tid && langt === tid],
    ];
  },
};

SCENARIER.sjuktorst = {
  text: 'Steg 13.10.13: den som ligger sjuk eller är svag sover inte förbi törsten: lusten att dricka börjar där man blir törstig, växer med törsten och vinner över sömnen innan törsten är farlig. Den som bara är lite törstig sover vidare',
  kor: () => {
    const s = SIM.createState(5, START); klockan(s, 10); tandEld(s); setFood(s, 100);
    s.kal = SIM.nyKalender(s.now, 2);
    const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    const k = Object.keys(SIM.SJUKDOMAR).find(k => SIM.SJUKDOMAR[k as keyof typeof SIM.SJUKDOMAR].foljd.feber)!;
    const val = (torst: number) => nyttVal(s, p, { torst, sjuk: { k: k as SIM.SjukId, t0: s.now - SIM.HOUR, tecken: s.now - SIM.HOUR, grad: 0.95, mot: 0, r: 1 } });
    const ligger = (val(1), SIM.ligger(p, s.now));
    const rad = [0.45, 0.4, 0.3, 0.25, 0.2, 0.1].map(t => [t, val(t)?.act] as const);
    const drick = new Set(['dricka', 'dryck', 'smalta', 'ata_sno']), borjar = rad.find(([, a]) => drick.has(a ?? ''))?.[0] ?? 0;
    const svag = nyttVal(s, p, { torst: 0.2, sjuk: undefined, health: 0.15 })?.act;
    return [
      [`den sjuka ligger (${k}) och sover när hen inte är törstig`, ligger && val(1)?.act === 'sova'],
      [`törsten vinner över sömnen innan den är farlig (${rad.map(([t, a]) => `${t}: ${a}`).join(', ')})`, borjar > SIM.TORST.farligt && rad.filter(([t]) => t <= borjar).every(([, a]) => drick.has(a ?? ''))],
      [`men inte när hen bara är lite törstig (${rad[0]![1]} vid 0,45)`, rad[0]![1] === 'sova'],
      [`den svaga dricker också (${svag})`, drick.has(svag ?? '')],
    ];
  },
};

SCENARIER.eldalder = {
  text: 'Steg 13.10.14: eldens ålder räknas från när den senast tog sig: när glöden väcks börjar tiden om, och raden om att den slocknat säger den tiden',
  kor: () => {
    const s = SIM.createState(3, START); klockan(s, 10); SIM.setAmount(s, 'ved', 20);
    const f = s.fire, p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    Object.assign(f, { lit: true, fuel: 4, ring: true, litAt: s.now });
    s.now += 5 * SIM.HOUR;
    Object.assign(f, { lit: false, fuel: 0, emberUntil: s.now + SIM.HOUR });
    vidStack(s, p, 'ved');
    const t0 = s.now; SIM.addFuel(s, p, 3, f as never);
    const brinner = f.lit, litAt = f.litAt;
    return [['glöden väcks', !!brinner], [`tiden börjar om när glöden väcks (${((litAt ?? 0) - t0) / SIM.MIN} minuter)`, litAt === t0]];
  },
};

SCENARIER.delrad = {
  text: 'Steg 13.10.15: delraden visar namnet bara under den valda delen; de andra har sin symbol och namnet i sin title; graferna har en egen symbol',
  kor: () => {
    setByn(SIM.createState(3, START));
    const html = delRad('data-x', ['a', 'b', 'c'].map(id => ({ id, tecken: '*', namn: 'Del ' + id })), 'b'), css = readFileSync(new URL('../../template.html', import.meta.url), 'utf8');
    return [
      ['en del är vald', (html.match(/aria-selected="true"/g) ?? []).length === 1 && /data-x="b" aria-selected="true"/.test(html)],
      ['varje knapp har sitt namn i title', ['a', 'b', 'c'].every(id => html.includes(`title="Del ${id}"`))],
      ['namnet syns bara under den valda', /\.pdelar \.delnamn \{ display: none/.test(css) && /aria-selected="true"\] \.delnamn \{ display: block/.test(css)],
      ['graferna har en egen symbol', (PIX.sym_graf?.length ?? 0) === 16],
    ];
  },
};

// striden, brådskande system B
SCENARIER.vargbyte = {
  text: 'Steg B.11: vargarna börjar ingen ny strid mot den som redan ligger nere; efter segern äter flocken av den som dog eller drar sig undan. Närstriden övas av slagen och paraderna, så den som inte slagit blir inte skickligare',
  kor: () => {
    const prov = (seed: number, nere: boolean) => {
      const s = SIM.createState(seed, START); s.kal = SIM.nyKalender(s.now, 0); klockan(s, 12); SIM.setAmount(s, 'ved', 0); s.fire.lit = false;
      const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
      for (const q of SIM.living(s)) if (q !== p) { q.x = 4; q.y = 4; q.task = { act: 'sova', phase: 'do', tx: 4, ty: 4, until: s.now + 5 * SIM.HOUR, carry: 0 } as SIM.Task; }
      const e = SIM.eldPlats(s); Object.assign(p, SIM.freeNear(s, e.x + 14, e.y));
      if (nere) p.svimmat = true;
      p.task = { act: nere ? 'medvetslos' : 'vila', phase: 'do', tx: p.x, ty: p.y, until: s.now + 5 * SIM.HOUR, carry: 0 } as SIM.Task;
      const k0 = p.skill.narstrid, f: SIM.Vargflock = { id: 9001, vargar: [10_072_008, 10_072_009, 10_072_010], x: p.x + 3, y: p.y, mx: p.x + 3, my: p.y, gar: s.now + SIM.DAY, hunger: 0.95, gor: 'stryker' };
      s.vargar = [f];
      for (let i = 0; i < 400 && s.vargar; i++) { if (nere) { p.svimmat = true; p.blod = 1; } s.now += 1000; SIM.vargSteg(s, 1); if (s.kartStrider) break; }
      return { s, p, f, k0, strid: !!s.kartStrider?.length };
    };
    const liggande = [1, 2, 3, 4].map(n => prov(n, true)), staende = [1, 2, 3, 4].map(n => prov(n, false));
    // striderna mot dem som stod går till slutet
    const slut = staende.filter(q => q.strid).map(q => {
      const g = q.s.kartStrider![0]!, st = g.st;
      for (let n = 0; n < 3000 && q.s.kartStrider?.length; n++) { q.s.now += 1000; SIM.kartStridSteg(q.s, 1); }
      const k = st.kampar.find(x => x.pid === q.p.id)!;
      return { vann: st.slut?.vinnare, gor: q.f.gor, dog: q.p.died !== undefined, n: SIM.ovadeSlag(st, k), upp: q.p.skill.narstrid - q.k0 };
    });
    return [
      [`ingen strid börjar mot den som ligger (${liggande.filter(q => q.strid).length} av 4)`, liggande.every(q => !q.strid)],
      [`mot den som står ensam börjar den (${slut.length} av 4)`, slut.length >= 2],
      [`efter striden äter flocken eller drar sig undan (${slut.map(q => q.gor).join(', ')})`, slut.every(q => q.gor === 'flyr' || q.gor === 'ater' && q.dog)],
      [`närstriden växer med slagen (${slut.map(q => `${q.n}: ${q.upp.toFixed(3)}`).join(', ')})`, slut.every(q => q.dog || (q.n > 0) === (q.upp > 0))],
    ];
  },
};

SCENARIER.vaknar = {
  text: 'Steg B.12: den som svimmat och vaknar medan striden pågår blir liggande och dras inte in i striden igen, och den som bär hen till vården fortsätter bära',
  kor: () => {
    const prov = (seed: number, bars: boolean) => {
      const s = SIM.createState(seed, START); klockan(s, 12); nyInvanare(s, 'm', 30);
      const [a, c, b, d, v, ...ovriga] = SIM.living(s).filter(x => SIM.ageOf(x, s.now) >= SIM.ALDER.vuxen);
      for (const q of [...ovriga, ...(v ? [v] : [])]) { q.x = a.x + 30; q.y = a.y; q.task = undefined; }
      c.x = a.x; c.y = a.y + 1; b.x = a.x + 1.2; b.y = a.y; d.x = b.x; d.y = b.y + 1;
      for (const q of [a, b, c, d]) { q.pot.mod = 18; q.pot.aggression = 18; q.task = undefined; }
      const g = SIM.kartStridBorja(s, 'skada', [[a, c], [b, d]], 'för att pröva');
      const ett = () => { s.now += 500; SIM.kartStridSteg(s, 0.5); };
      ett(); const ka = g.st.kampar.find(k => k.pid === a.id)!; ka.lage = 'nere'; a.svimmat = true; a.task = { act: 'medvetslos', phase: 'do', tx: a.x, ty: a.y, until: s.now + SIM.HOUR, carry: 0 } as SIM.Task;
      ett();
      if (bars && v) { a.task = { act: 'buren', phase: 'do', tx: a.x, ty: a.y, until: s.now + SIM.HOUR, carry: 0, ref: v.id } as SIM.Task; v.x = a.x; v.y = a.y; v.task = { act: 'varda', phase: 'back', tx: a.x + 20, ty: a.y, until: s.now + SIM.HOUR, carry: 0, ref: a.id, bar: a.id } as SIM.Task; }
      const plats = { x: a.x, y: a.y };
      a.svimmat = undefined; if (a.task?.act === 'medvetslos') a.task = undefined;
      let strid = 0, acts = new Set<string>(), n = 0;
      for (let i = 0; i < 20 && !g.st.slut; i++) { ett(); n++; if (bars) { a.x += 0.2; plats.x = a.x; } if (a.task?.act === 'strid') strid++; acts.add(a.task?.act ?? '-'); SIM.kartStridMed(s, g, a, 0); }
      return { n, strid, acts: [...acts].join(', '), kvar: Math.hypot(a.x - plats.x, a.y - plats.y), finns: !bars || !!v };
    };
    const l = [1, 2, 3].map(n => prov(n, false)), b = [1, 2, 3].map(n => prov(n, true)).filter(x => x.finns);
    return [
      [`den som vaknar blir liggande (${l.map(x => x.acts).join('; ')}, ${l.map(x => x.n).join('/')} steg)`, l.every(x => x.n > 2 && x.strid === 0 && x.kvar < 1e-9 && x.acts === 'vila')],
      [`den som bärs bärs vidare (${b.map(x => x.acts).join('; ')})`, b.length > 0 && b.every(x => x.strid === 0 && x.acts === 'buren')],
    ];
  },
};

SCENARIER.kortvantan = {
  text: 'Steg B.27: gänget stannar på rastplatsen tills alla har kommit fram och sedan en kort stund, och anfaller inom fem minuter efter att den sista kommit fram',
  kor: () => {
    const prov = (seed: number) => {
      const s = lasBy('test/rovarby.json.gz'); klockan(s, 11); for (const c of SIM.klanerOf(s)) c.inst = -60;
      s.seed = (s.seed ?? 0) + seed * 7;
      const z = SIM.zoneOf(s)!, f = rovarGang(s, 4, { x: Math.min(SIM.W - 3, z.x + z.w + 25), y: z.y + z.h / 2 });
      f.vantat = false; f.test = false; f.rast = undefined;
      const fo = SIM.rovarna(s, f); fo[3].x = fo[0].x + 14; // en släpar efter
      let framme = -1, start = -1, borjade = -1, sist = 0;
      korTills(s, () => !!f.anfaller || !s.rovare, 1800, () => {
        if (s.rovareFler?.length) { s.rovareFler = undefined; s.rovare = f; }
        const r = f.rast, n = r ? fo.filter(q => Math.hypot(q.x - r.x, q.y - r.y) <= SIM.ROVARE.rastR * 1.5).length : 0;
        if (n > 0 && start < 0) start = s.now;
        if (n === fo.length && framme < 0) framme = s.now;
        if (f.vantat && borjade < 0) { borjade = s.now; sist = n; }
      });
      return { anf: !!f.anfaller, min: (s.now - framme) / SIM.MIN, slap: (framme - start) / 1000, sist, n: fo.length };
    };
    const l = [0, 1, 2, 3].map(prov);
    return [
      [`väntan börjar när alla är framme (${l.map(x => `${x.sist} av ${x.n}`).join(', ')}, den sista ${l.map(x => x.slap.toFixed(0)).join('/')} s efter den första)`, l.every(x => x.sist === x.n)],
      [`gänget anfaller inom fem minuter (${l.map(x => x.min.toFixed(1)).join(', ')} min)`, l.every(x => x.anf && x.min > 0.5 && x.min <= 5.2)],
    ];
  },
};

SCENARIER.gangsyns = {
  text: 'Steg B.28 och B.57: på dagen ses gänget på vägen till rastplatsen av den som är ute på den sidan av byn, på natten ofta först vid rastplatsen eller anfallet, och larmet går',
  kor: () => {
    const prov = (timme: number, seed: number) => {
      const s = rovarBy(timme, seed), m = SIM.malet(s), vt = SIM.vattenNu(s); let vid: { x: number; y: number } | undefined, bast = 0;
      for (let i = 0; i < 32; i++) for (let r = 45; r < 100; r++) { const x = Math.floor(m.x + Math.cos(i * Math.PI / 16 + seed) * r) + 0.5, y = Math.floor(m.y + Math.sin(i * Math.PI / 16 + seed) * r) + 0.5; if (SIM.inMap(x, y) && vt[Math.floor(y) * SIM.W + Math.floor(x)] !== SIM.T.Vatten && SIM.utanforByn(s, x, y) > bast) { bast = SIM.utanforByn(s, x, y); vid = { x, y }; } }
      const f = rovarGang(s, 4, vid!); f.vantat = false; f.rast = undefined; let framme = 0; const t0 = s.now;
      korTills(s, () => f.sedd !== undefined || !s.rovare, 2400, () => { ettGang(s, f); if (f.vantat && !framme) framme = s.now; });
      const sedd = f.sedd === undefined ? undefined : (f.sedd - t0) / SIM.MIN;
      SIM.step(s, 30); return { fore: sedd !== undefined && !framme, vid: sedd !== undefined && !f.anfaller, sedd, larm: SIM.living(s).filter(p => p.larm?.rovare).length };
    };
    const dag = [1, 2, 3, 4, 5, 6].map(i => prov(11, i)), natt = [1, 2, 3, 4, 5, 6].map(i => prov(1, i)), n = (l: typeof dag) => l.filter(x => x.fore).length, visa = (l: typeof dag) => l.map(x => x.sedd === undefined ? 'aldrig' : `${x.sedd.toFixed(1)} min${x.fore ? ' på vägen' : x.vid ? ' vid rastplatsen' : ' vid anfallet'}`).join(', ');
    return [
      [`på dagen ses gänget oftast innan det anfaller (${visa(dag)})`, dag.filter(x => x.vid).length >= 4],
      [`på natten mer sällan på vägen (${n(natt)} mot ${n(dag)}: ${visa(natt)})`, n(natt) < n(dag) || n(dag) === 0 && n(natt) === 0],
      [`larmet går (${dag.map(x => x.larm).join(', ')} vet)`, dag.filter(x => x.vid).every(x => x.larm > 0)],
    ];
  },
  lang: true,
};

SCENARIER.redo = {
  text: 'Steg B.29: efter larmet arbetar ingen vuxen med vanliga sysslor fast gänget ligger stilla, och vid en lång väntan står kämparna med vapen i raden innan gänget anfaller; nöden går före, och den som redan vet behöver inget nytt larm när striden börjar',
  kor: () => {
    const prov = (timme: number) => {
      const s = lasBy('test/rovarby.json.gz'); klockan(s, timme); for (const c of SIM.klanerOf(s)) c.inst = -60;
      const m = SIM.malet(s), vt = SIM.vattenNu(s);
      let vid: { x: number; y: number } | undefined;
      for (let r = 20; r < 70 && !vid; r++) for (let i = 0; i < 32 && !vid; i++) { const v = i * Math.PI / 16, x = Math.floor(m.x + Math.cos(v) * r) + 0.5, y = Math.floor(m.y + Math.sin(v) * r) + 0.5, u = SIM.inMap(x, y) ? SIM.utanforByn(s, x, y) : 0; if (u >= 16 && u < 20 && vt[Math.floor(y) * SIM.W + Math.floor(x)] !== SIM.T.Vatten && !SIM.bitAt(s, Math.floor(x), Math.floor(y))) vid = { x, y }; }
      const f = rovarGang(s, 3, vid!); f.vantat = true; f.till = s.now + 20 * SIM.MIN; f.rast = { x: vid!.x, y: vid!.y };
      const ser = SIM.living(s).find(p => SIM.vuxenKan(s, p) && p.task?.act !== 'sova') ?? SIM.living(s).find(p => SIM.vuxenKan(s, p))!;
      ser.task = undefined; Object.assign(ser, SIM.freeNear(s, vid!.x + (m.x - vid!.x) * 0.4, vid!.y + (m.y - vid!.y) * 0.4));
      const vuxna = () => SIM.living(s).filter(p => !p.gast && p.larm?.rovare && SIM.vuxenKan(s, p));
      let arb = 0, tot = 0; const acts: Record<string, number> = {};
      korTills(s, () => !!f.anfaller, 25 * 60, () => {
        if (s.rovareFler?.length) { s.rovareFler = undefined; s.rovare = f; }
        if (f.sedd === undefined || s.now - f.sedd < 3 * SIM.MIN) return; // larmet har gått runt och den som höll på är klar
        for (const p of vuxna()) { const ac = p.task?.act ?? '-'; tot++; if (SIM.ACTS[ac as SIM.Act]?.arbete) arb++; acts[ac] = (acts[ac] ?? 0) + 1; }
      });
      const k = SIM.living(s).filter(p => p.task?.act === 'forsvarRovare'), rad = SIM.radLinje(s, f), framme = k.filter(p => p.task!.phase === 'do');
      const langst = Math.max(0, ...framme.map(p => Math.min(Math.hypot(p.x - rad.mitten.x, p.y - rad.mitten.y), Math.hypot(p.x - rad.vantM.x, p.y - rad.vantM.y))));
      return { arb: arb / Math.max(1, tot), vet: vuxna().length, k: k.length, framme: framme.length, beva: k.filter(p => SIM.tingOf(s).some(x => x.hos === p.id && x.k in SIM.VAPEN)).length, langst, acts: Object.entries(acts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([x, n]) => `${x} ${Math.round(n / Math.max(1, tot) * 100)} %`).join(', ') };
    };
    const dag = prov(11), natt = prov(1);
    // nöden: den som är nära att törsta ihjäl går till vattnet, och den som bara är lite törstig gör sig redo
    const nod = (torst: number) => {
      const s = lasBy('test/rovarby.json.gz'); klockan(s, 11);
      const z = SIM.zoneOf(s)!, f = rovarGang(s, 3, { x: Math.min(SIM.W - 3, z.x + z.w + 25), y: z.y + z.h / 2 }); f.vantat = true; f.till = s.now + 20 * SIM.MIN; s.rovareFler = undefined;
      const p = SIM.living(s).find(q => !q.gast && SIM.vuxenKan(s, q))!; p.task = undefined; p.hunger = p.rest = 0.9; p.torst = torst; p.larm = { rovare: { t: s.now, vad: 'rovare', storlek: 3, led: 0, varnat: 1 } };
      SIM.chooseTask(s, p); return p.task as unknown as SIM.Task;
    };
    const t0 = nod(0.01).act, t1 = nod(0.6).act;
    // striden hörs
    const s = lasBy('test/rovarby.json.gz'); klockan(s, 11); for (const c of SIM.klanerOf(s)) c.inst = -60;
    const m = SIM.malet(s), f = rovarGang(s, 4, { x: m.x + 4, y: m.y }); f.vantat = true; s.rovareFler = undefined;
    const [q, o] = SIM.living(s).filter(p => !p.gast && SIM.vuxenKan(s, p)), gammal = s.now - 30 * SIM.MIN;
    q.larm = { rovare: { t: gammal, vad: 'rovare', storlek: 4, led: 0, varnat: 1 } };
    Object.assign(o, SIM.freeNear(s, q.x + 4, q.y)); const r = SIM.rovarna(s, f)[0]; r.x = o.x + 1; r.y = o.y;
    f.anfaller = true; f.anfallT = gammal - 1; SIM.kartStridBorja(s, 'skada', [[o], [r]], 'rövare vid byn', { typ: 'rovare', egen: true, flock: f.id });
    SIM.step(s, 3);
    const visa = (x: ReturnType<typeof prov>) => `${x.vet} vet, ${Math.round(x.arb * 100)} % arbetar, ${x.acts}; ${x.k} kämpar, ${x.framme} på plats, ${x.beva} med vapen, längst ${x.langst.toFixed(0)} rutor från raden`;
    return [
      [`dagen: ingen arbetar (${visa(dag)})`, dag.vet > 1 && dag.arb < 0.05],
      [`natten likadant (${visa(natt)})`, natt.vet > 1 && natt.arb < 0.05],
      ['kämparna står med vapen i raden innan gänget anfaller', dag.k >= 2 && dag.framme >= dag.k - 1 && dag.beva >= 1 && dag.langst < 8],
      [`nöden går före (nära att törsta ihjäl: ${t0}, lite törstig: ${t1})`, t0 === 'dricka' && ['forsvarRovare', 'hjalpaRovare', 'gomma'].includes(t1)],
      ['den som redan vet får inget nytt larm av striden', q.larm?.rovare?.t === gammal],
    ];
  },
};

SCENARIER.overraskning = {
  lang: true,
  text: 'Steg B.30: den som inte sett sin anfallare komma (mitt i ett arbete eller ovetande om gänget) värjer sig inte mot det första slaget, så ett snabbt anfall ger fler fulla träffar i början än ett långsamt mot samma by; en rövare på rastplatsen överraskas likadant, och vakten överraskas inte',
  kor: () => {
    const tal = { o: 0, n: 0 };
    const prov = (snabbt: boolean, n: number) => {
      const s = lasBy('test/rovarby.json.gz'); klockan(s, 11); for (const c of SIM.klanerOf(s)) c.inst = -60;
      s.seed = (s.seed ?? 0) + n * 7; s.kartStridNr = n;
      const m = SIM.malet(s), de = SIM.living(s).filter(p => !p.gast && SIM.vuxenKan(s, p)).slice(0, 4);
      const f = rovarGang(s, 4, { x: m.x, y: m.y }, { anfaller: true }); f.anfallT = s.now; if (s.rovareFler?.length) { s.rovareFler = undefined; s.rovare = f; }
      const rov = SIM.rovarna(s, f);
      de.forEach((p, i) => {
        p.health = 1; p.skador = []; p.blod = 1; p.larmRoll = undefined;
        Object.assign(p, SIM.freeNear(s, m.x + i * 2 - 3, m.y + 2)); Object.assign(rov[i], SIM.freeNear(s, p.x, p.y - 3));
        p.task = { act: snabbt ? 'hugga' : 'forsvarRovare', phase: 'do', tx: p.x, ty: p.y, until: s.now + SIM.HOUR, carry: 0, why: 'test' } as SIM.Task;
        p.larm = snabbt ? undefined : { rovare: { t: s.now - 5 * SIM.MIN, vad: 'rovare', storlek: 4, led: 0, varnat: 1 } };
      });
      const g = SIM.kartStridBorja(s, 'skada', [de, rov], 'rövare i byn', { typ: 'rovare', egen: true, flock: f.id });
      const o = g.st.kampar.filter(k => k.overraskad).map(k => k.sida);
      tal.o += snabbt ? o.length : 0; tal.n += snabbt ? 0 : o.length;
      let i = 0; while (!g.st.slut && i++ < 12) SIM.step(s, 1);
      const r = g.st.logg.filter(x => x.t <= 10), sida = (id?: number) => g.st.kampar.find(k => k.id === id)?.sida;
      return { traff: r.filter(x => x.h === 'traff' && sida(x.a) === 1).length, sida0: o.filter(x => x === 0).length };
    };
    const N = 12, l1 = Array.from({ length: N }, (_, i) => prov(true, i)), l2 = Array.from({ length: N }, (_, i) => prov(false, i)), sum = (l: typeof l1) => l.reduce((x, y) => x + y.traff, 0);
    // vakten och rövaren på rastplatsen
    const s = lasBy('test/rovarby.json.gz'); klockan(s, 11);
    const m = SIM.malet(s), [v, a] = SIM.living(s).filter(p => !p.gast && SIM.vuxenKan(s, p)), f = rovarGang(s, 2, { x: m.x, y: m.y }), rv = SIM.rovarna(s, f);
    v.task = { act: 'vakt', phase: 'do', tx: v.x, ty: v.y, until: s.now + SIM.HOUR, carry: 0, why: 'test' } as SIM.Task; a.task = { act: 'forsvarRovare', phase: 'go', tx: v.x, ty: v.y, until: s.now + SIM.HOUR, carry: 0, why: 'test' } as SIM.Task;
    a.larm = { rovare: { t: s.now - 5 * SIM.MIN, vad: 'rovare', storlek: 2, led: 0, varnat: 1 } }; rv[0].gast!.gor = 'rasta'; rv[1].gast!.gor = 'sla';
    const g = SIM.kartStridBorja(s, 'skada', [[v, a], rv], 'rövare vid byn', { typ: 'rovare', egen: true, flock: f.id }), ov = (p: SIM.Person) => !!g.st.kampar.find(k => k.pid === p.id)!.overraskad;
    // den som själv går in i striden mitt i ett arbete är inte överraskad (steg B.52)
    const b = SIM.living(s).find(p => !p.gast && SIM.vuxenKan(s, p) && p !== v && p !== a)!; b.task = { act: 'hugga', phase: 'do', tx: b.x, ty: b.y, until: s.now + SIM.HOUR, carry: 0, why: 'test' } as SIM.Task; SIM.kartStridMed(s, g, b, 0);
    return [
      [`i det snabba anfallet överraskas de som arbetar (${tal.o} av ${4 * N}), i det långsamma ingen (${tal.n})`, tal.o === 4 * N && tal.n === 0],
      [`fler fulla träffar på bybor de första tio sekunderna i det snabba (${sum(l1)} mot ${sum(l2)} på ${N} strider)`, sum(l1) > sum(l2) * 1.15],
      ['vakten och den som väntar överraskas inte, rövaren som rastar gör det, den som slår inte', !ov(v) && !ov(a) && ov(rv[0]) && !ov(rv[1])],
      ['den som själv går in i striden är inte överraskad', g.st.kampar.some(k => k.pid === b.id) && !ov(b)],
    ];
  },
};

SCENARIER.hjalpare = {
  text: 'Steg B.14: hjälparna står bakom kämparnas rad, inte framför den eller i ringen runt förrådet, och en rövare följer inte den som springer undan länge',
  kor: () => {
    const s = lasBy('test/rovarby.json.gz'); klockan(s, 11); for (const c of SIM.klanerOf(s)) c.inst = -60;
    const m = SIM.malet(s), vt = SIM.vattenNu(s), vux = SIM.living(s).filter(p => SIM.vuxenKan(s, p));
    let vid: { x: number; y: number } | undefined;
    for (let r = 26; r < 60 && !vid; r++) for (let i = 0; i < 32 && !vid; i++) { const v = i * Math.PI / 16, x = Math.floor(m.x + Math.cos(v) * r) + 0.5, y = Math.floor(m.y + Math.sin(v) * r) + 0.5; if (SIM.inMap(x, y) && vt[Math.floor(y) * SIM.W + Math.floor(x)] !== SIM.T.Vatten && !SIM.bitAt(s, x, y) && SIM.findPath(SIM.groundOf(s), x, y, m.x, m.y)) vid = { x, y }; }
    const f = rovarGang(s, 4, vid!, { anfaller: true }); f.sedd = s.now; f.anfallT = s.now;
    // fem vill slåss och fyra hjälper (modet), resten är borta
    const kvar = new Set(vux.slice(0, 9)); s.people = s.people.filter(p => kvar.has(p) || p.gast || p.died !== undefined);
    vux.forEach((p, i) => { p.health = 1; for (let k = 0; k < 4; k++) { const mod = Math.max(0.1, SIM.stat(p, 'mod', s.now)), v = i < vux.length - 3 ? 14 : (0.1 - (SIM.rovarVilja(s, p) - mod / 20)) * 20; p.pot.mod *= Math.max(0.1, v) / mod; } });
    for (const p of kvar) { p.task = undefined; p.larmRoll = undefined; Object.assign(p, SIM.freeNear(s, m.x + (p.id % 5) - 2, m.y + (p.id % 3) - 1)); p.larm = { rovare: { t: s.now, vad: 'rovare', storlek: 4, led: 0, varnat: 1 } }; }
    let bak = 0, fel = 0, langst = 0, storst = 0; const foljt = new Map<number, { x: number; y: number }>(), exempel: string[] = [];
    korTills(s, () => !s.rovare || f.gor === 'flyr', 900, () => {
      if (s.rovareFler?.length) { s.rovareFler = undefined; s.rovare = f; }
      const fol = SIM.living(s).filter(p => !p.gast), g = SIM.flockStrid(s, f);
      const rad: { x: number; y: number }[] = g ? g.st.kampar.filter(k => k.sida === 0 && k.lage === 'strid' && !k.hjalp && !k.backar) : fol.filter(p => p.task?.act === 'forsvarRovare' && p.task.phase === 'do');
      const hj = g ? g.st.kampar.filter(k => k.sida === 0 && k.lage === 'strid' && k.hjalp) : fol.filter(p => p.task?.act === 'hjalpaRovare' && p.task.phase === 'do') as { x: number; y: number }[];
      const rov = SIM.rovarna(s, f).filter(r => !r.gast!.flytt), narm = <T extends { x: number; y: number }>(l: T[], c: { x: number; y: number }) => [...l].sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
      if (rad.length && rov.length) for (const p of hj) { // bakom: längre från närmaste rövare än den närmaste kämpen är
        const c = narm(rad, p), q = narm(rov, p);
        if (Math.hypot(q.x - p.x, q.y - p.y) > Math.min(...rad.map(k => Math.hypot(q.x - k.x, q.y - k.y)))) bak++; else { fel++; if (exempel.length < 4) exempel.push(`${g ? 'strid' : 'väntar'}: rövaren ${(q.x - p.x).toFixed(0)},${(q.y - p.y).toFixed(0)}, kämpen ${(c.x - p.x).toFixed(0)},${(c.y - p.y).toFixed(0)}`); }
      }
      for (const r of rov) {
        if (['hota', 'taBorda', 'sla'].includes(r.gast!.gor ?? '') && !g?.st.kampar.some(k => k.pid === r.id)) { const a = foljt.get(r.id) ?? foljt.set(r.id, { x: r.x, y: r.y }).get(r.id)!; langst = Math.max(langst, Math.hypot(r.x - a.x, r.y - a.y)); } else foljt.delete(r.id);
      }
      for (const p of fol) if (p.task?.act === 'hjalpaRovare') storst = Math.max(storst, Math.hypot(p.x - m.x, p.y - m.y));
    });
    return [
      [`hjälparna står bakom raden (${bak} gånger bakom, ${fel} framför: ${exempel.join(', ')})`, bak > 20 && fel < bak * 0.1],
      [`ingen rövare följer någon långt (längst ${langst.toFixed(1)} rutor), och ingen hjälpare hamnar långt bort (${storst.toFixed(1)})`, langst < 25 && storst < 30],
    ];
  },
};

SCENARIER.gomda = {
  text: 'Steg B.15: de som gömmer sig vid elden står på olika rutor, och rövarna som går förbi drar inte in dem i en strid',
  kor: () => {
    const s = SIM.createState(6, START); klockan(s, 11); for (const c of SIM.klanerOf(s)) c.inst = -60;
    while (SIM.living(s).filter(p => SIM.vuxenKan(s, p)).length < 5) nyInvanare(s, 'k', 25);
    const e = SIM.eldPlats(s), vux = SIM.living(s).filter(p => SIM.vuxenKan(s, p)).slice(0, 5);
    s.people = s.people.filter(p => vux.includes(p));
    for (const p of vux) { p.pot.mod *= 0.05 / Math.max(0.1, SIM.stat(p, 'mod', s.now)); p.health = 0.8; p.task = undefined; Object.assign(p, SIM.freeNear(s, e.x + p.id % 4, e.y + 4)); }
    const f = rovarGang(s, 4, SIM.freeNear(s, e.x + 26, e.y + 3), { anfaller: true }); f.sedd = s.now; f.anfallT = s.now;
    for (const r of SIM.rovarna(s, f)) r.pot.aggression *= 18 / Math.max(0.1, SIM.stat(r, 'aggression', s.now));
    for (const p of vux) p.larm = { rovare: { t: s.now, vad: 'rovare', storlek: 4, led: 0, varnat: 1 } };
    let flest = 0, samma = 0, strid = 0; const gick = new Set<number>();
    korTills(s, () => !s.rovare, 600, () => {
      const g = vux.filter(p => p.task?.act === 'gomma' && p.task.phase === 'do');
      if (g.length > flest) flest = g.length;
      if (new Set(g.map(p => `${Math.floor(p.x)},${Math.floor(p.y)}`)).size < g.length) samma++;
      strid = Math.max(strid, SIM.kartStrider(s).flatMap(q => q.st.kampar).filter(k => vux.some(p => p.id === k.pid)).length);
      for (const r of SIM.rovarna(s, f)) if (vux.some(p => Math.hypot(p.x - r.x, p.y - r.y) < SIM.ROVARE.moter)) gick.add(r.id);
    });
    return [
      [`fem gömmer sig vid elden på olika rutor (flest ${flest}, samma ruta ${samma} gånger)`, flest === 5 && samma === 0],
      [`rövarna gick förbi nära (${gick.size}) och ingen drogs in i en strid (${strid})`, gick.size > 0 && strid === 0],
    ];
  },
};

SCENARIER.rastvag = {
  text: 'Steg B.16: gänget går runt byn till rastplatsen, från vilken kant det än kommer (by 1511 dygn 25)',
  kor: () => {
    const rader: string[] = []; let inne = 0, framme = 0, n = 0;
    for (const [kx, ky] of [[0.02, 0.5], [0.98, 0.5], [0.5, 0.02], [0.5, 0.98], [0.02, 0.02], [0.98, 0.98]]) {
      const s = lasBy('test/facit-byar/1511-25.json.gz'); for (const c of SIM.klanerOf(s)) c.inst = -60; s.rovareFler = undefined; s.rovare = undefined;
      const m = SIM.malet(s), vt = SIM.vattenNu(s); let at: { x: number; y: number } | undefined;
      for (let d = 0; d < 60 && !at; d++) { const x = Math.floor(kx * SIM.W + (m.x - kx * SIM.W) * d / 200) + 0.5, y = Math.floor(ky * SIM.H + (m.y - ky * SIM.H) * d / 200) + 0.5; if (vt[Math.floor(y) * SIM.W + Math.floor(x)] !== SIM.T.Vatten && SIM.findPath(SIM.groundOf(s), x, y, m.x, m.y)) at = { x, y }; }
      if (!at) continue;
      // från kanten, och från andra sidan byn sett från rastplatsen: rastplatsen bestäms på motsatt sida
      const f = rovarGang(s, 3); SIM.stallUpp(s, f, at.x, at.y); f.x = at.x; f.y = at.y; f.test = false;
      let in2 = 0;
      korTills(s, () => !!f.vantat || !s.rovare, 1200, () => { if (SIM.rovarna(s, f).some(r => SIM.iByn(s, r.x, r.y))) in2++; });
      n++; if (f.vantat) framme++; if (in2) inne++;
      rader.push(`${Math.round(at.x)},${Math.round(at.y)} → ${f.rast ? `${Math.round(f.rast.x)},${Math.round(f.rast.y)}` : '-'}${f.vantat ? '' : ' (ej framme)'}${in2 ? ` inne ${in2}` : ''}`);
    }
    // rastplatsen på andra sidan byn: vägen dit går runt
    const s = lasBy('test/facit-byar/1511-25.json.gz'), m = SIM.malet(s), f = rovarGang(s, 1); const sida: { x: number; y: number }[] = [];
    for (const v of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) for (let r = 20; r < 60; r++) { const x = Math.floor(m.x + Math.cos(v) * r), y = Math.floor(m.y + Math.sin(v) * r); if (!SIM.inMap(x, y)) break; if (SIM.utanforByn(s, x, y) >= 15 && SIM.vattenNu(s)[y * SIM.W + x] !== SIM.T.Vatten && SIM.findPath(SIM.groundOf(s), x + 0.5, y + 0.5, m.x, m.y)) { sida.push({ x: x + 0.5, y: y + 0.5 }); break; } }
    let runt = 0, par = 0, rakt = 0;
    for (const a of sida) for (const b of sida) if (a !== b) { const g = SIM.groundOf(s), p = SIM.findPath(g, a.x, a.y, b.x, b.y, false, undefined, SIM.runtByn(s, SIM.ROVARE.rundUt)), q = SIM.findPath(g, a.x, a.y, b.x, b.y), inn = (w: number[] | null) => !!w?.some(i => SIM.iByn(s, i % SIM.W, Math.floor(i / SIM.W))); par++; if (!inn(p)) runt++; if (!inn(q)) rakt++; }
    void f;
    return [
      [`gänget kommer till rastplatsen utan att gå genom byn (${rader.join('; ')})`, n >= 3 && framme === n && inne === 0],
      [`vägen mellan två sidor av byn går runt (${runt} av ${par}, förut ${rakt})`, par > 0 && runt > rakt && runt >= par * 0.7],
    ];
  },
};

SCENARIER.samlad = {
  text: 'Steg B.17: sex bybor som kommer till förrådet vid olika tider möter gänget tillsammans, och den som kommer till en strid som pågår går med i den',
  kor: () => {
    const s = lasBy('test/rovarby.json.gz'); klockan(s, 11); for (const c of SIM.klanerOf(s)) c.inst = -60;
    const m = SIM.malet(s), vt = SIM.vattenNu(s), g0 = SIM.groundOf(s);
    while (SIM.living(s).filter(p => !p.gast && SIM.vuxenKan(s, p)).length < 6) nyInvanare(s, 'm', 25);
    const sex = SIM.living(s).filter(p => !p.gast && SIM.vuxenKan(s, p)).sort((a, b) => SIM.stat(b, 'mod', s.now) - SIM.stat(a, 'mod', s.now)).slice(0, 6);
    s.people = s.people.filter(p => sex.includes(p) || p.gast);
    const plats = (r: number, v0: number) => { for (let i = 0; i < 64; i++) { const v = v0 + i * Math.PI / 32, x = Math.floor(m.x + Math.cos(v) * r) + 0.5, y = Math.floor(m.y + Math.sin(v) * r) + 0.5; if (SIM.inMap(x, y) && vt[Math.floor(y) * SIM.W + Math.floor(x)] !== SIM.T.Vatten && !SIM.bitAt(s, x, y) && SIM.findPath(g0, x, y, m.x, m.y)) return { x, y, v }; } throw Error('ingen plats'); };
    const fran = plats(34, 0), f = rovarGang(s, 6, fran, { anfaller: true }); f.sedd = s.now; f.anfallT = s.now;
    // en vid förrådet, de andra allt längre bort på andra sidan
    sex.forEach((p, i) => { const a = plats(i === 0 ? 1.5 : 3 + i * 8, fran.v + Math.PI + (i % 3 - 1) * 0.4); p.x = a.x; p.y = a.y; p.health = 1; p.blod = 1; p.skador = []; p.task = undefined; p.larmRoll = undefined; const mod = SIM.stat(p, 'mod', s.now); p.pot.mod *= 18 / Math.max(0.1, mod); p.born = s.now - 25 * SIM.DAY; p.larm = { rovare: { t: s.now, vad: 'rovare', storlek: 6, led: 0, varnat: 1 } }; });
    const vill = new Set<number>();
    let forsta: number | undefined, borjade = 0, vantade = false, med = 0, flest = 0;
    korTills(s, () => !s.rovare || (forsta !== undefined && s.now - forsta > 90000), 600, () => {
      if (s.rovareFler?.length) { s.rovareFler = undefined; s.rovare = f; }
      for (const p of sex) if (p.task?.act === 'forsvarRovare') vill.add(p.id);
      if (sex.some(p => p.task?.why === 'Väntar in de andra')) vantade = true;
      const st = SIM.kartStrider(s).filter(q => q.efter?.typ === 'rovare'); flest = Math.max(flest, st.length);
      if (!st.length) return;
      const n = new Set(st.flatMap(q => q.st.kampar).filter(k => k.sida === 0 && !k.hjalp).map(k => k.pid)).size;
      if (forsta === undefined) { forsta = s.now; }
      if (s.now - forsta <= 5000) borjade = Math.max(borjade, n);
      med = Math.max(med, n);
    });
    return [
      ['den som kommer först väntar in de andra', vantade],
      [`striden börjar med ${borjade} av sex (${vill.size} vill slåss) inom fem sekunder, och ${med} blir med i den (${flest} strid)`, borjade >= 4 && vill.size >= 5 && med >= vill.size && flest === 1],
    ];
  },
};

SCENARIER.overmakt = {
  text: 'Steg B.32: övermakten väger i viljan att möta gänget: en ensam vuxen mot fem rövare gömmer sig eller hjälper, och tre mot två möter dem',
  kor: () => {
    const prova = (byn: number, n: number) => {
      const s = lasBy('test/rovarby.json.gz'); klockan(s, 11); for (const c of SIM.klanerOf(s)) c.inst = -60;
      const z = SIM.zoneOf(s)!;
      const de: SIM.Person[] = []; // nya vuxna, utan småbarn och skador
      while (de.length < byn) { nyInvanare(s, 'm', 25); de.push(s.people[s.people.length - 1]); }
      const barn = SIM.living(s).filter(p => !p.gast && SIM.ageOf(p, s.now) < 12).slice(0, 1);
      s.people = s.people.filter(p => de.includes(p) || barn.includes(p) || p.gast);
      const f = rovarGang(s, n, { x: Math.min(SIM.W - 3, z.x + z.w + 25), y: z.y + z.h / 2 }, { anfaller: true }); f.sedd = s.now; f.anfallT = s.now;
      const m = SIM.malet(s);
      for (const p of de) { p.x = m.x + 1; p.y = m.y; p.health = 1; p.blod = 1; p.skador = []; p.task = undefined; p.larmRoll = undefined; p.gavSig = undefined; p.pot.mod = 11; p.larm = { rovare: { t: s.now, vad: 'rovare', storlek: n, led: 0, varnat: 1 } }; }
      const acts = new Set<string>(), roller = de.map(p => SIM.rollVid(s, p, 'rovare')); let moter = false, strid = false;
      korTills(s, () => !s.rovare, 300, () => {
        if (s.rovareFler?.length) { s.rovareFler = undefined; s.rovare = f; }
        for (const p of de) { if (p.task) acts.add(p.task.act); if (p.task?.act === 'forsvarRovare' && p.task.vantar === false) moter = true; }
        if (SIM.kartStrider(s).some(q => q.efter?.typ === 'rovare')) strid = true;
      });
      return { acts: [...acts], roller, moter, strid, over: SIM.overmakt(s, n, f, de) };
    };
    const en = prova(1, 5), tre = prova(3, 2);
    return [
      [`den ensamma mot fem (övermakt ${en.over.toFixed(1)}) möter dem inte: ${en.roller.join(', ')}, ${en.acts.join(', ')}`, en.roller[0] !== 'kampe' && !en.moter],
      [`tre mot två (övermakt ${tre.over.toFixed(1)}) möter dem: ${tre.roller.join(', ')}, ${tre.acts.join(', ')}`, tre.roller.filter(r => r === 'kampe').length >= 2 && (tre.moter || tre.strid)],
    ];
  },
};

SCENARIER.radriktning = {
  text: 'Steg B.33: raden vänds mot hållet gänget kommer ifrån och står still när rövarna rör sig vid förrådet, och de som går tillsammans räknas som samlade var de än är',
  kor: () => {
    const s = lasBy('test/rovarby.json.gz'); klockan(s, 11);
    const z = SIM.zoneOf(s)!, f = rovarGang(s, 4, { x: Math.min(SIM.W - 3, z.x + z.w + 25), y: z.y + z.h / 2 }, { anfaller: true });
    const rast = f.rast ?? (f.rast = { x: f.x, y: f.y }), a = SIM.radLinje(s, f), fo = SIM.rovarna(s, f);
    let flytt = 0, bak = 0;
    for (let i = 0; i < 16; i++) { // rövarna går runt målet
      fo.forEach((r, j) => { const v = i * Math.PI / 8 + j; r.x = a.mal.x + Math.cos(v) * (1 + j); r.y = a.mal.y + Math.sin(v) * (1 + j); });
      f.x = fo[0].x; f.y = fo[0].y;
      const b = SIM.radLinje(s, f); flytt = Math.max(flytt, Math.hypot(a.mitten.x - b.mitten.x, a.mitten.y - b.mitten.y)); bak = Math.max(bak, Math.hypot(a.vantM.x - b.vantM.x, a.vantM.y - b.vantM.y));
    }
    const nara = Math.hypot(a.mitten.x - rast.x, a.mitten.y - rast.y) < Math.hypot(a.mal.x - rast.x, a.mal.y - rast.y);
    const grupp = [[0, 0], [2, 0], [3, 2], [30, 0]].map(([x, y]) => ({ x: a.mal.x - 25 + x, y: a.mal.y + y }) as SIM.Person), sam = SIM.samladGrupp(grupp);
    return [
      ['raden står på den sida av målet som gänget kom ifrån', nara],
      [`raden står still när rövarna går runt förrådet (${flytt.toFixed(2)} rutor, väntplatsen ${bak.toFixed(2)})`, flytt < 0.1 && bak < 0.1],
      [`tre som går tillsammans långt från raden är samlade, den fjärde inte (${sam.length})`, sam.length === 3],
    ];
  },
};

SCENARIER.stridlogg = {
  text: 'Steg B.18: en strid där ingen slagit ett slag skrivs inte som en strid i loggen och krönikan, och rövarna har sin titel (Rövaren och namnet) i alla rader om dem',
  kor: () => {
    let rader = 0, utan = 0, namnfel = 0, tomma = 0, skrivna = 0, slagna = 0; const fel: string[] = [];
    for (const seed of [6, 7, 8, 9, 10, 11]) {
      const s = SIM.createState(seed, START); klockan(s, 11); for (const c of SIM.klanerOf(s)) c.inst = -60;
      const z = SIM.zoneOf(s)!, f = rovarGang(s, 4, { x: Math.min(SIM.W - 3, z.x + z.w + 14), y: z.y + z.h / 2 }, { anfaller: true }); f.sedd = s.now; f.anfallT = s.now;
      for (const p of SIM.living(s)) { p.pot.mod = 16; p.larm = { rovare: { t: s.now, vad: 'rovare', storlek: 4, led: 0, varnat: 1 } }; p.task = undefined; }
      for (let i = 0; i < 4; i++) SIM.newTing(s, 'fiskespjut', 1, SIM.BYN);
      if (seed >= 9) { for (const p of SIM.living(s)) p.pot.styrka = p.pot.uthallighet = 20; for (const q of SIM.rovarna(s, f)) { q.pot.styrka = q.pot.uthallighet = q.pot.smidighet = 3; q.pot.mod = 20; } } // rövarna faller, så att det skrivs rader om dem
      const namn = SIM.rovarna(s, f).map(r => r.name), sedda = new Set<object>(s.log);
      korTills(s, () => !s.rovare && !SIM.kartStrider(s).length, 1800, () => {
        for (const r of s.log) if (!sedda.has(r)) { sedda.add(r); for (const n of namn) if (new RegExp(`(^|[^A-Za-zÅÄÖåäö])${n}s?([^A-Za-zåäö]|$)`).test(r.text)) { rader++; if (!r.text.includes(`Rövaren ${n}`) && !r.text.includes(`Fången ${n}`)) { utan++; if (fel.length < 5) fel.push(r.text); } } }
      });
      slagna += s.log.filter(r => /slogs med .* rövare/.test(r.text)).length;
    }
    // en strid där rövarna flyr innan någon slagit
    {
      const s = SIM.createState(6, START); klockan(s, 11);
      const z = SIM.zoneOf(s)!, m = { x: z.x + z.w / 2, y: z.y + z.h / 2 };
      const p = SIM.living(s).find(q => SIM.vuxenKan(s, q))!, f = rovarGang(s, 2, { x: m.x + 4, y: m.y }, { anfaller: true }); f.sedd = s.now;
      Object.assign(p, SIM.freeNear(s, m.x, m.y));
      const g = SIM.kartStridBorja(s, 'skada', [[p], SIM.rovarna(s, f)], 'rövare vid byn', { typ: 'rovare', egen: true, flock: f.id });
      for (const k of g.st.kampar) if (k.sida === 1) k.lage = 'borta';
      const n0 = s.log.length, k0 = (s.hist?.kronika.length ?? 0); namnfel = g.st.kampar.filter(k => k.sida === 1 && !k.namn.startsWith('Rövaren ')).length;
      korTills(s, () => !SIM.kartStrider(s).includes(g), 600);
      tomma++; if (!g.st.logg.some(r => r.sl) && (s.log.slice(n0).some(r => /slogs/.test(r.text)) || (s.hist?.kronika.length ?? 0) > k0)) skrivna++;
      if (g.st.logg.some(r => r.sl)) tomma = 0;
    }
    return [
      [`rövarna har sin titel i alla rader (${rader} rader, ${utan} utan: ${fel.join(' | ')})`, rader >= 1 && utan === 0 && namnfel === 0],
      [`en strid utan slag skrivs inte (${skrivna} av ${tomma} skrevs)`, tomma === 1 && skrivna === 0],
      [`en strid med slag skrivs (${slagna})`, slagna > 0],
    ];
  },
};

// platserna och rörelsen i och runt en strid (stegen B.19 och B.20), mätta varje stridssteg
export function matStrid(n = 3, seeds = [6, 7, 8, 9]) {
  const m = { sek: 0, par: 0, nara: 0, tatt: 0, tattMax: 0, langt: 0, stridande: 0, mal: 0, steg: 0, vand: 0, ute: 0, uteVand: 0, uteMal: 0 }, h: Record<string, number> = {};
  for (const seed of seeds) {
    const s = SIM.createState(seed, START); klockan(s, 11); for (const c of SIM.klanerOf(s)) c.inst = -60;
    const z = SIM.zoneOf(s)!, f = rovarGang(s, n, { x: Math.min(SIM.W - 3, z.x + z.w + 14), y: z.y + z.h / 2 }, { anfaller: true }); f.sedd = s.now; f.anfallT = s.now;
    for (const p of SIM.living(s)) { p.pot.mod = 16; p.larm = { rovare: { t: s.now, vad: 'rovare', storlek: n, led: 0, varnat: 1 } }; p.task = undefined; }
    for (let i = 0; i < 4; i++) SIM.newTing(s, 'fiskespjut', 1, SIM.BYN);
    const fore = new Map<number, { x: number; y: number; dx: number; dy: number; mal?: string }>();
    korTills(s, () => !s.rovare && !SIM.kartStrider(s).length, 700, () => {
      const iSt = new Map<number, SIM.Kampe>();
      for (const g of SIM.kartStrider(s)) {
        const k = g.st.kampar.filter(q => q.lage === 'strid' && !g.fri?.includes(q.pid ?? -1)); for (const q of k) if (q.pid !== undefined) iSt.set(q.pid, q);
        m.sek++;
        for (const a of k) { let nn = 0; for (const b of k) if (a !== b) { const d = Math.hypot(a.x - b.x, a.y - b.y); if (d <= 2) nn++; if (a.id < b.id) { m.par++; if (d < 0.75) m.nara++; } } m.tatt = Math.max(m.tatt, nn + 1); if (nn + 1 >= 7) m.tattMax++;
          const o = g.st.kampar.find(q => q.id === a.mal); if (o && !a.hjalp && !a.backar && !a.ledare && !["fiskespjut","flintspjut","jarnspjut","bage","slunga","sten"].includes(a.vapen) && g.st.t > 15) { m.stridande++; if (Math.hypot(a.x - o.x, a.y - o.y) > 4) m.langt++; } }
      }
      for (const p of s.people.filter(q => q.died === undefined && (iSt.has(q.id) || q.gast))) {
        const k = iSt.get(p.id), b = fore.get(p.id), mal = k ? 'k' + k.mal : `${p.task?.act}:${Math.round(p.task?.tx ?? 0)},${Math.round(p.task?.ty ?? 0)}`;
        const dx = b ? p.x - b.x : 0, dy = b ? p.y - b.y : 0, l = Math.hypot(dx, dy);
        if (b && l > 0.02) { const L = Math.hypot(b.dx, b.dy), om = L > 0.02 && (dx * b.dx + dy * b.dy) < -0.5 * l * L; if (k) { m.steg++; if (om) { m.vand++; const o = k.hjalp ? 'hjalp' : k.backar ? 'backar' : k.skott ? 'kast' : k.ledare ? 'ledare' : 'annan'; h[o] = (h[o] ?? 0) + 1; } } else { m.ute++; if (om) { m.uteVand++; const o = 'ute:' + p.gast?.sort + ':' + p.gast?.gor + (b.mal !== mal ? ':nyttmal' : ''); h[o] = (h[o] ?? 0) + 1; } } }
        if (b && b.mal !== mal) { if (k) m.mal++; else m.uteMal++; }
        fore.set(p.id, { x: p.x, y: p.y, dx: l > 0.02 ? dx : b?.dx ?? 0, dy: l > 0.02 ? dy : b?.dy ?? 0, mal });
      }
    });
  }
  return { ...m, h };
}

SCENARIER.stridplats = {
  text: 'Steg B.19: kämparna står inte på varandra, den som slåss står vid sin motståndare, namnen på dem som slåss syns utan att täcka varandra, och rövaren i bilden är personen som slåss (med sitt vapen i handen)',
  kor: () => {
    const m = matStrid(5, [7, 8]);
    // åtta namn på fyra rutor: alla syns, och inga två täcker varandra
    const tat: Skylt[] = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, x: 100 + (i % 4) * 14, y: 100 + (i >> 2) * 15, w: 34, forst: 2, flytt: SKYLT.flytt }));
    const syns = synligaSkyltar(tat, 3), r = tat.filter(k => syns.has(k.id));
    const tacker = r.flatMap((a, i) => r.slice(i + 1).filter(b => Math.abs(a.x - b.x) < 34 && Math.abs(a.y - b.y) < SKYLT.hojd)).length;
    const s = SIM.createState(7, START); klockan(s, 11); setByn(s); utanWebblasare();
    const z = SIM.zoneOf(s)!, f = rovarGang(s, 3, { x: z.x + z.w / 2 + 6, y: z.y + z.h / 2 }, { anfaller: true });
    const ids = SIM.rovarna(s, f).map(q => q.id), iBild = gaster(s.now).map(g => g.id);
    return [
      [`kämparna står inte på varandra (${m.nara} av ${m.par} par närmare än 0,75 ruta)`, m.par > 100 && m.nara <= m.par * 0.002],
      [`den som slåss står vid sin motståndare (${m.langt} av ${m.stridande} gånger längre bort än fyra rutor)`, m.stridande > 100 && m.langt <= m.stridande * 0.005],
      [`alla åtta namnen syns och inga täcker varandra (${syns.size}, ${tacker})`, syns.size === 8 && tacker === 0],
      ['rövaren i bilden är personen i striden', ids.length === 3 && ids.every(id => iBild.includes(id))],
    ];
  },
};

SCENARIER.stridrorelse = {
  text: 'Steg B.20: rövarna rycker inte bakåt när de går utanför striden, och den som slåss byter inte mål varje sekund och går inte av och an',
  kor: () => {
    const m = matStrid(5, [6, 9]);
    return [
      [`rövarna utanför striden vänder sällan (${m.uteVand} av ${m.ute} steg)`, m.ute > 200 && m.uteVand <= m.ute * 0.02],
      [`den som slåss går inte av och an (${m.vand} av ${m.steg} steg)`, m.steg > 30 && m.vand <= m.steg * 0.1],
      [`målet byts sällan (${m.mal} gånger på ${m.sek} steg i striden)`, m.sek > 100 && m.mal <= m.sek * 0.08],
    ];
  },
};

// kodgenomgången av fas 13 (steg 13.10.20): det som granskningen hittade
SCENARIER.fallvittj = {
  lang: true,
  text: 'Fällorna vittjas som mjärden (steg 7.4.2, 7.5.10 och 13.8.3): en snara som slitits ut behåller sin fångst tills den vittjas, sedan är den borta, och en snara med en hare i vittjas av den som har tid',
  kor: () => {
    const s = SIM.cloneState(testBy(25)), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    s.mjardar = [];
    const m = SIM.sattUt(s, p, 'snara')!, n0 = SIM.FALLOR.snara.fangst, f = SIM.FALLOR.snara;
    f.fangst = 50; f.rik = () => 1;
    for (let i = 0; i < 200 && !SIM.trasig(m); i++) SIM.stepMjardar(s, 3600);
    f.fangst = n0; delete f.rik;
    const fangst = m.n, kvar = s.mjardar.includes(m), full = SIM.timTillFull(s, m) === 0;
    const vilt0 = SIM.amountOf(s, 'vilt') + SIM.amountOf(s, 'fagel');
    SIM.vittja(s, p, m);
    const fick = SIM.amountOf(s, 'vilt') + SIM.amountOf(s, 'fagel') - vilt0, borta = !s.mjardar.includes(m);
    // en snara med en enda hare i vittjas
    const m2 = SIM.sattUt(s, p, 'snara')!; m2.fisk = { vilt: 1 }; m2.n = 1;
    klockan(s, 9);
    const fore = s.stat?.mjardeVittjad ?? 0;
    kor(s, 24);
    return [
      [`den utslitna snaran har sin fångst kvar (${fangst}) och räknas som full`, fangst > 0 && kvar && full],
      [`den som vittjar får fångsten (${fick}), och den utslitna snaran är borta`, fick === fangst && borta],
      [`en snara med en hare i vittjas inom ett dygn (${(s.stat?.mjardeVittjad ?? 0) - fore})`, (s.stat?.mjardeVittjad ?? 0) > fore],
    ];
  },
};
SCENARIER.granskat13 = {
  text: 'Kodgenomgången av fas 13 (steg 13.10.20): staketets tjära följer staketet, och det redskap som bara är en fördel tas inte ur en grav',
  kor: () => {
    const s = SIM.cloneState(testBy(25)), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    const i = 4321; s.staket = [i]; s.tjarat = { [i]: s.now + SIM.DAY };
    SIM.rivStaket(s, i);
    const staket = !s.staket.length && s.tjarat[i] === undefined;
    // nålen i graven: den som syr lånar den inte därifrån
    s.ting = SIM.tingOf(s).filter(t => t.k !== 'jarnnal');
    const utan = SIM.ledigaRedskap(s, p, 'jarnnal');
    SIM.gravRedskap.n(s, p, 'jarnnal');
    const g = s.gravar?.[0]; if (g) g.saker = [{ k: 'jarnnal', n: 1, c: 1, t: s.now } as never];
    const fart = SIM.nalFart(s, p, 'rock');
    return [
      ['när staketet rivs är tjäran på rutan borta', staket],
      [`järnnålen i graven gör inte sömnaden snabbare (${utan}, ${fart})`, utan === 0 && fart === 1],
    ];
  },
};
SCENARIER.flyktvag = {
  text: 'Den som flyr kommer undan (steg B.31): hen väljer en väg förbi fienderna, runt en vän som slåss och runt en vägg, tar en annan tillflykt när vägen till den första är stängd, och springer bort från fienderna när ingen väg finns',
  kor: () => {
    const m = (id: number, sida: 0 | 1, x: number, y: number, fly: { x: number; y: number }, flyAndra?: { x: number; y: number }[]) => ({ id, namn: `${sida ? 'R' : 'B'}${id}`, sida, vapen: 'hand', klader: [] as string[], x, y, fart: 1, st: { styrka: 10, uthallighet: 10, mod: 20, skicklighet: 10, aggression: 10, smidighet: 10 }, fly, ...(flyAndra ? { flyAndra } : {}) }) as unknown as SIM.Uppstallning['kampar'][number];
    const prova = (vaggar: number[], flyr: ReturnType<typeof m>, andra: ReturnType<typeof m>[]) => {
      let ut = 0, sek = 0, stilla = 0;
      for (let fro = 1; fro <= 10; fro++) {
        const st = SIM.nyStrid({ karta: true, avsikt: 'skada', w: SIM.W, h: SIM.H, kampar: [flyr, ...andra] }, fro), k = st.kampar[0];
        k.lage = 'flykt';
        SIM.iVarlden(SIM.provVarld(undefined, new Set(vaggar)), () => {
          let t = 0, st0 = 0;
          while (!st.slut && k.lage === 'flykt' && t < 60) { const x = k.x, y = k.y; SIM.stridSteg(st); t += SIM.STRID.tick; if (Math.hypot(k.x - x, k.y - y) < 0.05) st0 += SIM.STRID.tick; }
          if ((k.lage as string) === 'borta') ut++;
          sek = Math.max(sek, t); stilla = Math.max(stilla, st0);
        });
      }
      return { ut, sek, stilla };
    };
    const hem = { x: 40, y: 20 }, bort = { x: 1, y: 20 };
    const vagg = Array.from({ length: 9 }, (_, i) => (16 + i) * SIM.W + 26);
    // en vän som slåss och en husvägg mellan hen och huset, och två fiender i vägen
    const a = prova(vagg, m(1, 0, 22, 20, hem), [m(2, 0, 23.4, 20, hem), m(3, 1, 24.2, 20, bort), m(4, 1, 23, 18.6, bort)]);
    // huset är inmurat: den andra tillflykten tas
    const mur = [-2, -1, 0, 1, 2].flatMap(d => [(18) * SIM.W + 40 + d, 22 * SIM.W + 40 + d, (20 + d) * SIM.W + 38, (20 + d) * SIM.W + 42]);
    const b = prova(mur, m(1, 0, 34, 20, hem, [{ x: 20, y: 20 }]), [m(2, 1, 34.9, 20, bort)]);
    // ingen tillflykt går att nå: bort från fienden, också bakåt från det håll hen annars skulle
    const c = prova(mur, m(1, 0, 34, 20, hem), [m(2, 1, 35, 20, bort), m(3, 1, 34.6, 20.8, bort)]);
    return [
      [`med en vän och en vägg i vägen kommer hen undan (${a.ut} av 10, högst ${a.sek} s, stilla ${a.stilla} s)`, a.ut === 10 && a.sek < 40 && a.stilla < 3],
      [`med huset stängt tar hen en annan tillflykt (${b.ut} av 10, högst ${b.sek} s)`, b.ut === 10 && b.sek < 40],
      [`utan en väg springer hen bort från fienderna (${c.ut} av 10, högst ${c.sek} s)`, c.ut === 10 && c.sek < 40],
    ];
  },
};

// fem rövare mot två bybor (steg B.34), mätta varje stridssteg från tre sekunder in
export function matOvertal(fro: number[], vaggar: number[] = []) {
  const m = { steg: 0, vand: 0, borta: 0, fast: 0, slog: 0, kampar: 0, vantar: 0, byten: 0 };
  for (const fr of fro) {
    const k = (id: number, sida: 0 | 1, x: number, y: number, vapen: string) => ({ id, namn: `${sida ? 'R' : 'B'}${id}`, sida, vapen, klader: [], x, y, fart: 1, st: { styrka: 10, uthallighet: 10, mod: 20, skicklighet: 10, aggression: 10, smidighet: 10 }, fly: { x: sida ? 60 : 4, y: 20 } }) as unknown as SIM.Uppstallning['kampar'][number];
    const st = SIM.nyStrid({ karta: true, avsikt: 'skada', w: SIM.W, h: SIM.H, kampar: [k(1, 0, 20, 20, 'fiskespjut'), k(2, 0, 20, 21, 'yxa'), ...[0, 1, 2, 3, 4].map(i => k(3 + i, 1, 27 + (vaggar.length ? 2 * (i >> 1) : i % 2), vaggar.length ? 19.2 + (i % 3) : 18 + i * 1.5, i % 2 ? 'kniv' : 'yxa'))] }, fr);
    for (const q of st.kampar) q.blod = 1;
    SIM.iVarlden(SIM.provVarld(undefined, new Set(vaggar)), () => {
      const fore = new Map<number, { x: number; y: number; dx: number; dy: number; mal?: number; fast: number; vand: number[] }>(), slog = new Set<number>();
      while (!st.slut && st.t < 120) {
        SIM.stridSteg(st);
        for (const q of st.kampar) {
          if (q.sida !== 1 || q.lage !== 'strid' || q.ligger || q.bocker || q.backar) { fore.delete(q.id); continue; }
          const o = st.kampar.find(z => z.id === q.mal), b = fore.get(q.id) ?? { x: q.x, y: q.y, dx: 0, dy: 0, mal: q.mal, fast: 0, vand: [] as number[] };
          const dx = q.x - b.x, dy = q.y - b.y, l = Math.hypot(dx, dy), L = Math.hypot(b.dx, b.dy), om = l > 0.02 && L > 0.02 && b.mal === q.mal && dx * b.dx + dy * b.dy < -0.5 * l * L; // den som byter mål får vända
          if (st.t > 3) {
            if (l > 0.02) { m.steg++; if (om) m.vand++; }
            if (b.mal !== q.mal) m.byten++;
            // längre än två rutor från sitt mål: går den av och an utan att komma närmare på tio sekunder?
            if (o && Math.hypot(q.x - o.x, q.y - o.y) > 2) { m.borta++; if (l <= 0.02 || b.mal !== q.mal) m.vantar++; if (om) b.vand = [...b.vand.filter(t => st.t - t < 10), st.t]; if (b.vand.length >= 2) m.fast++; }
          }
          fore.set(q.id, { x: q.x, y: q.y, dx: l > 0.02 ? dx : b.dx, dy: l > 0.02 ? dy : b.dy, mal: q.mal, fast: 0, vand: b.vand });
        }
        for (const r of st.logg) if ((r.h === 'traff' || r.h === 'miss' || r.h === 'parera' || r.h === 'duck') && r.a! > 2) slog.add(r.a!);
      }
      m.kampar += 5; m.slog += slog.size;
    });
  }
  return m;
}
SCENARIER.overtal = {
  text: 'De som inte når fram (steg B.34): när fem rövare anfaller två bybor vänder ingen fram och tillbaka, och den som inte får plats runt sitt mål väljer ett annat eller står lugnt kvar bakom',
  kor: () => {
    const fro = [1, 2, 3, 4, 5, 6], o = matOvertal(fro);
    // i en trång gränd får två plats i bredd
    const vra = Array.from({ length: 40 }, (_, i) => i + 5).flatMap(x => [18 * SIM.W + x, 22 * SIM.W + x]), v = matOvertal(fro, vra);
    return [
      [`på öppen mark vänder de sällan (${o.vand} av ${o.steg} steg)`, o.steg > 50 && o.vand <= o.steg * 0.05],
      [`... ingen av dem som står längre än två rutor bort går av och an (${o.fast} av ${o.borta})`, o.fast === 0],
      [`... och alla kommer till tals (${o.slog} av ${o.kampar} slog)`, o.slog >= o.kampar * 0.8],
      [`i en gränd vänder de sällan (${v.vand} av ${v.steg} steg)`, v.vand <= fro.length],
      [`... ingen av dem som inte når fram går av och an (${v.fast} av ${v.borta}, ${v.vantar} väntar eller byter mål)`, v.borta > 500 && v.fast === 0 && v.vantar >= v.borta * 0.9],
    ];
  },
};

SCENARIER.fulltfamiljehus = {
  text: 'Steg 13.10.21: i ett fullt familjehus behåller barnet som inte får plats sin bädd i byns hus; bädden bärs varken fram eller tillbaka under 24 timmar i spelet',
  kor: () => {
    const s = SIM.createState(6, START);
    klockan(s); medHus(s);
    const folk = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen), [a, b] = folk;
    for (let i = 0; i < 6 && SIM.stationSite(s, 'halmbadd'); i++) medBank(s, 'halmbadd');
    SIM.stepStationer(s);
    const barn = SIM.living(s).find(q => q !== a && q !== b && !!SIM.baddOf(s, q));
    const badd = barn && SIM.baddOf(s, barn);
    if (!barn || !badd) return [['någon har en bädd i byns hus', false]];
    // barnet är med i familjen, men familjens hus har inget golv kvar åt det: en sängplats åt föräldrarna
    barn.partner = undefined; barn.born = s.now - 10 * SIM.DAY; barn.mother = a.id; barn.father = b.id; a.partner = b.id; b.partner = a.id;
    const c = SIM.bynsMitt(s); let pl: { x: number; y: number } | undefined;
    const g = SIM.groundOf(s);
    for (let r = 8; r < 34 && !pl; r++) for (let dy = -r; dy <= r && !pl; dy++) for (let dx = -r; dx <= r && !pl; dx++) {
      let ok = true;
      for (let yy = -1; yy < 5 && ok; yy++) for (let xx = -1; xx < 5 && ok; xx++) ok = SIM.ledig(s, c.x + dx + xx, c.y + dy + yy) && g.trees[(c.y + dy + yy) * SIM.W + c.x + dx + xx] < SIM.FOREST;
      if (ok) pl = { x: c.x + dx, y: c.y + dy };
    }
    if (!pl) return [['en plats för familjens hus', false]];
    const h = husPa(s, pl.x, pl.y, 4, 4, true, { golv: 'jord', dorr: 1 });
    h.ag = a.id; h.fn = 'familjehus'; h.klar = s.now; SIM.touch(s);
    const i0 = SIM.sovPlats(s, barn), sov = i0 === undefined ? undefined : SIM.roomAt(s, i0 % SIM.W, Math.floor(i0 / SIM.W))?.hus;
    const platser = [a, b].filter(q => { const i = SIM.sovPlats(s, q); return i !== undefined && SIM.roomAt(s, i % SIM.W, Math.floor(i / SIM.W))?.hus === h.id; }).length;
    const egen = SIM.sovHus(s, barn) === h.id, x0 = badd.x, y0 = badd.y, buren = s.stat?.baddBuren ?? 0;
    for (let t = 0; t < 24; t++) { s.now += SIM.HOUR; SIM.stepStationer(s); }
    const kvar = SIM.stationerOf(s).find(t => t.id === badd.id);
    return [
      [`barnet hör till familjens hus (${egen}) men får sin sovplats i byns (hus ${sov}, familjens ${h.id}; ${platser} av föräldrarna sover i sitt)`, egen && sov !== undefined && sov !== h.id],
      [`bädden står kvar och är barnets (${kvar ? `${kvar.x},${kvar.y}, ägare ${kvar.ag}` : 'borta'})`, !!kvar && kvar.x === x0 && kvar.y === y0 && kvar.ag === barn.id],
      [`bädden har inte burits (${(s.stat?.baddBuren ?? 0) - buren} gånger)`, (s.stat?.baddBuren ?? 0) === buren],
    ];
  },
};

SCENARIER.tomtstam = {
  text: 'Steg 13.10.26: en fälld stam på tomten klyvs till virke när byn saknar det och huggs till ved när virket räcker; den som hugger den egna stammen, röjer och bygger väljer på samma sätt',
  kor: () => {
    const s = SIM.createState(6, START);
    const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    byggare(s); SIM.setAmount(s, 'yxa', 2);
    const k: SIM.Stock = { id: 97, x: p.x + 2, y: p.y, ved: 9, grenar: 0, av: p.id };
    s.stockar = [k];
    const spar = SIM.virkeKrok.mal;
    let saknas, racker, kort;
    try {
      SIM.virkeKrok.mal = () => SIM.amountOf(s, 'virke') + 10; saknas = SIM.PROJEKT.rojning.uppgift(s, p)?.act; kort = SIM.stamTill(s, { ...k, ved: 1 });
      SIM.virkeKrok.mal = () => 0; racker = SIM.PROJEKT.rojning.uppgift(s, p)?.act;
    } finally { SIM.virkeKrok.mal = spar; }
    return [
      [`saknas virke klyvs stammen (${saknas})`, saknas === 'klyva'],
      [`räcker virket huggs den till ved (${racker})`, racker === 'hugga'],
      [`en stam som är för kort till virke huggs till ved (${kort})`, kort === 'hugga'],
    ];
  },
};

SCENARIER.flintatand = {
  text: 'Steg 13.10.27: den som tänder elden med flinta behåller flintan när tändmaterialet tar slut och hämtar bara mer; flintan bärs till lagret en gång, när elden brinner',
  env: { BALANS: 'karta.bredd=120,karta.hojd=120,start.klader=0,eld.tandBas=-5,eld.flintSprack=0' },
  kor: () => {
    const s = SIM.createState(1, START);
    klockan(s);
    Object.assign(s.fire, { lit: false, fuel: 0, emberUntil: undefined, ring: true });
    s.ting = SIM.tingOf(s).filter(t => t.k !== 'eldstal' && t.k !== 'bagborr');
    for (const k of ['flinta', 'ved', 'grenar', 'torrgras', 'naver', 'kol']) SIM.setAmount(s, k, 0);
    SIM.setAmount(s, 'ved', 30); SIM.setAmount(s, 'grenar', 60); SIM.setAmount(s, 'torrgras', 60); SIM.setAmount(s, 'flinta', 1);
    const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    for (const q of SIM.living(s)) if (q !== p) { q.x = 5; q.y = 5; q.task = undefined; }
    const sp = SIM.vidEld(s, s.fire, 0.6, 1.3);
    p.task = { act: 'tanda', phase: 'go', tx: sp.x, ty: sp.y, until: s.now + 3 * SIM.HOUR, carry: 0, why: '' };
    let hamtningar = 0, varHamta = false, barForTidigt = 0, varFlinta = false, lit = false, efter = 0;
    for (let i = 0; i < 4 * 3600 && efter < 900; i++) {
        SIM.step(s, 1);
        const t = p.task, har = (t?.items?.flinta ?? 0) > 0, ham = t?.act === 'tanda' && !!t.hamta;
        if (ham && !varHamta) hamtningar++;
        if (hamtningar >= 2) p.skill.hantverk = 1000; // försöken misslyckas till en början (tandBas)
        if (varFlinta && !har && !s.fire.lit) barForTidigt++;
        varHamta = ham; varFlinta = har; lit ||= s.fire.lit; if (lit) efter++;
    }
    return [
      [`tändmaterialet hämtades mer än en gång (${hamtningar})`, hamtningar >= 2],
      [`elden tändes till slut (${lit})`, lit],
      [`flintan lades aldrig ifrån före dess (${barForTidigt} gånger)`, barForTidigt === 0],
    ];
  },
};

SCENARIER.langforlossning = {
  text: 'Steg 13.10.29: under en lång förlossning dricker modern byns drycker, någon bär vatten eller mat till henne, och hjälpen räknas bara medan hjälparen står kvar',
  kor: () => {
    const s = SIM.createState(1, START);
    klockan(s);
    const vuxna = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen), m = vuxna.find(r => r.sex === 'k')!, [g, q] = vuxna.filter(r => r !== m);
    tandEld(s, 8);
    const f = SIM.eldXY(s, s.fire);
    m.x = f.x + 2; m.y = f.y; g.x = m.x + 1; g.y = m.y;
    m.pregnantSince = s.now - 400 * SIM.DAY; m.pregnantBy = m.partner;
    SIM.borjaForlossning(s, m);
    m.foder = { f: 'fel', till: s.now + 8 * SIM.HOUR };
    m.task = { act: 'foder', phase: 'do', tx: m.x, ty: m.y, until: m.foder.till, carry: 0, why: 'Föder barn' };
    m.torst = 0.2; m.hunger = 0.2;
    const vv = SIM.vattenVal(s, q), mat = (setMat(s, { bar: 30 }), SIM.matTillFange(s, q));
    // hjälparen står kvar, sedan går hen
    m.foder.hjalp = g.id; g.task = { act: 'forlossa', phase: 'do', tx: g.x, ty: g.y, until: m.foder.till, carry: 0, ref: m.id, why: '' };
    SIM.step(s, SIM.KLOCKA.slag); const star = m.foder?.hjalp === g.id;
    g.task = { act: 'vila', phase: 'go', tx: g.x + 5, ty: g.y, until: s.now + SIM.HOUR, carry: 0, why: '' };
    SIM.step(s, SIM.KLOCKA.slag); const gick = m.foder?.hjalp === undefined || SIM.byId(s, m.foder.hjalp)?.task?.act === 'forlossa';
    // en kruka med kokt vatten hemma: modern dricker under förlossningen
    const kr = SIM.addTool(s, 'lerkruka_mellan', g); kr.inne = { v: 'kokt', n: 4, t: s.now };
    m.torst = 0.2; let drack = false, min = 1;
    for (let i = 0; i < 8 * 60 && m.foder; i++) { SIM.step(s, 60); min = Math.min(min, m.torst); drack ||= m.torst > 0.6; }
    return [
      [`någon vill bära vatten till henne (${vv?.why ?? 'inget val'})`, vv?.ref === m.id],
      [`någon vill bära mat till henne (${mat?.why ?? 'inget val'})`, mat?.ref === m.id],
      [`hjälpen räknas medan hjälparen står kvar (${star}) och inte när hen gått (${gick})`, star && gick],
      [`modern dricker under förlossningen (${s.stat?.foderDrack ?? 0} gånger ur byns drycker, lägst törst ${min.toFixed(2)})`, drack],
    ];
  },
};

// en plats på land minst fran rutor från målet, i byns närhet, dit man kan gå (scenarierna om rövarna)
function landVid(s: SIM.State, fran: number, prova: (x: number, y: number) => boolean = () => true) {
  const m = SIM.malet(s), vt = SIM.vattenNu(s);
  for (let r = fran; r < fran + 40; r++) for (let i = 0; i < 32; i++) {
    const v = i * Math.PI / 16, x = Math.floor(m.x + Math.cos(v) * r) + 0.5, y = Math.floor(m.y + Math.sin(v) * r) + 0.5;
    if (SIM.inMap(x, y) && vt[Math.floor(y) * SIM.W + Math.floor(x)] !== SIM.T.Vatten && !SIM.bitAt(s, x, y) && prova(x, y) && SIM.findPath(SIM.groundOf(s), x, y, m.x, m.y)) return { x, y };
  }
  return undefined;
}
// den sparade byn vid klockan timme, med ovänliga grannar
const rovarBy = (timme: number, n = 0) => { const s = lasBy('test/rovarby.json.gz'); klockan(s, timme); for (const c of SIM.klanerOf(s)) c.inst = -60; if (n) { s.seed = (s.seed ?? 0) + n * 7919; s.rngs = {}; } return s; };
const ettGang = (s: SIM.State, f: SIM.Rovarflock) => { if (s.rovareFler?.length) { s.rovareFler = undefined; s.rovare = f; } };
const vuxnaI = (s: SIM.State) => SIM.living(s).filter(p => !p.gast && SIM.vuxenKan(s, p));

SCENARIER.rastland = {
  text: 'Steg B.43: rövarna väljer platserna på rastplatsen på land, och den som står på isen går därifrån i stället för att försvinna: ett gäng med rastplatsen vid en frusen sjö har lika många rövare när anfallet börjar som när det kom fram',
  kor: () => {
    const s = rovarBy(11), vt = SIM.vattenNu(s), T = (x: number, y: number) => SIM.inMap(x, y) && vt[Math.floor(y) * SIM.W + Math.floor(x)] === SIM.T.Vatten;
    const vatten = (x: number, y: number) => { let n = 0; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (T(x + dx, y + dy)) n++; return n; };
    const vid = landVid(s, 28, (x, y) => vatten(x, y) >= 16)!, f = rovarGang(s, 5, vid); ettGang(s, f);
    f.vantat = true; f.till = s.now + 5 * SIM.MIN; const n = f.folk.length;
    // byborna är långt bort, så att ingen möter gänget under väntan
    { const m = SIM.malet(s); for (const p of SIM.living(s)) if (!p.gast) { Object.assign(p, SIM.freeNear(s, m.x - (vid.x - m.x) * 0.5, m.y - (vid.y - m.y) * 0.5)); p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: s.now + SIM.HOUR, carry: 0, why: 'test' } as SIM.Task; } }
    // en står redan ute på vattnet (isen)
    const fo = SIM.rovarna(s, f); let ute: { x: number; y: number } | undefined;
    for (let d = 1; d < 5 && !ute; d++) for (let i = 0; i < 16 && !ute; i++) { const x = vid.x + Math.cos(i) * d, y = vid.y + Math.sin(i) * d; if (T(x, y)) ute = { x, y }; }
    Object.assign(fo[0], ute); fo[0].gast!.path = undefined; fo[0].gast!.pk = undefined;
    let iVatten = 0, m = 0
    korTills(s, () => !!f.anfaller, 600, () => { ettGang(s, f); if (f.till - s.now < 3 * SIM.MIN) for (const r of SIM.rovarna(s, f)) { m++; if (T(r.x, r.y)) iVatten++; } });
    return [
      [`lika många vid anfallet (${f.folk.length} av ${n}, ${fo.filter(r => r.gast?.flytt).length} har gett upp)`, f.folk.length === n && !fo.some(r => r.gast?.flytt)],
      [`ingen står i vattnet de sista minuterna (${iVatten} av ${m})`, m > 0 && iVatten === 0],
    ];
  },
};

SCENARIER.fastrovare = {
  text: 'Steg B.44: gänget väntar bara på dem som är på väg: med en rövare som inte kommer fram till rastplatsen anfaller det ändå inom fem minuter efter att de andra kommit fram',
  kor: () => {
    const s = rovarBy(11), vid = landVid(s, 30)!, f = rovarGang(s, 4, vid); f.vantat = false; f.test = false; ettGang(s, f);
    const fo = SIM.rovarna(s, f), fast = fo[3], at = landVid(s, 45)!; let framme = -1;
    korTills(s, () => !!f.anfaller || !s.rovare, 900, () => {
      ettGang(s, f); fast.x = at.x; fast.y = at.y; fast.gast!.path = undefined; // kommer aldrig ur fläcken
      if (framme < 0 && fo.slice(0, 3).every(q => Math.hypot(q.x - f.rast!.x, q.y - f.rast!.y) <= SIM.ROVARE.rastR * 1.5)) framme = s.now;
    });
    return [[`gänget anfaller ${((s.now - framme) / SIM.MIN).toFixed(1)} min efter att de andra kommit fram`, !!f.anfaller && framme > 0 && s.now - framme <= 5.5 * SIM.MIN + SIM.ROVARE.stillSek * 1000]];
  },
};

SCENARIER.omringad = {
  text: 'Steg B.45: den som flyr tränger sig förbi en fiende när ingen annan väg finns: en rövare som flyr mellan tre bybor är sex rutor bort inom tio sekunder',
  kor: () => {
    const k = (id: number, sida: 0 | 1, x: number, y: number) => ({ id, namn: `${sida ? 'R' : 'B'}${id}`, sida, vapen: 'hand', klader: [], x, y, fart: 1, st: { styrka: 10, uthallighet: 10, mod: 20, skicklighet: 10, aggression: 10, smidighet: 10 }, fly: { x: sida ? 1 : 60, y: 20 } }) as unknown as SIM.Uppstallning['kampar'][number];
    const prov = (n: number, r: number, v0: number) => {
      let sek = 0, ut = 0;
      for (let fro = 1; fro <= 10; fro++) {
        const st = SIM.nyStrid({ karta: true, avsikt: 'skada', w: SIM.W, h: SIM.H, kampar: [k(1, 1, 40, 20), ...Array.from({ length: n }, (_, i) => k(2 + i, 0, 40 + Math.cos(v0 + i * 2 * Math.PI / n) * r, 20 + Math.sin(v0 + i * 2 * Math.PI / n) * r))] }, fro), q = st.kampar[0];
        q.lage = 'flykt';
        SIM.iVarlden(SIM.provVarld(undefined, new Set()), () => {
          let t = 0; const kvar = () => Math.min(...st.kampar.slice(1).filter(o => o.lage === 'strid').map(o => Math.hypot(o.x - q.x, o.y - q.y)));
          while (!st.slut && q.lage === 'flykt' && kvar() < 6 && t < 30) { SIM.stridSteg(st); t += SIM.STRID.tick; }
          if (q.lage !== 'nere' && q.lage !== 'dod' && t <= 10) ut++; sek = Math.max(sek, t);
        });
      }
      return { sek, ut };
    };
    const a = prov(3, 0.8, 0), b = prov(3, 0.8, 1), c = prov(3, 1.1, 2);
    return [[`mellan tre bybor kommer hen undan inom tio sekunder (${[a, b, c].map(x => `${x.ut} av 10, högst ${x.sek.toFixed(1)} s`).join('; ')})`, [a, b, c].every(x => x.ut >= 9)]];
  },
};

SCENARIER.lugnefter = {
  text: 'Steg B.46: ett larm räknas bara medan det är färskt, också varglarmet, och när det sista gänget lämnat kartan är byn tillbaka i sitt inom fem minuter',
  kor: () => {
    const s = rovarBy(11), f = rovarGang(s, 3, landVid(s, 30)!); ettGang(s, f); f.vantat = true; f.till = s.now + 20 * SIM.MIN;
    for (const p of SIM.living(s)) if (!p.gast) p.larm = { varg: { t: s.now - 5 * SIM.HOUR, vad: 'varg', storlek: 3, led: 0 }, rovare: { t: s.now, vad: 'rovare', storlek: 3, led: 1, varnat: 1 } };
    const REDO = ['forsvarRovare', 'hjalpaRovare', 'gomma'], redo = () => vuxnaI(s).filter(p => REDO.includes(p.task?.act ?? '')).length;
    korTills(s, () => false, 240, () => ettGang(s, f));
    const fore = redo(), vuxna = vuxnaI(s).length;
    // gänget ger upp och lämnar kartan
    for (const r of SIM.rovarna(s, f)) r.gast!.flytt = true; f.gor = 'flyr';
    korTills(s, () => !f.folk.length, 1800); s.rovare = undefined; s.rovareFler = undefined; const t0 = s.now;
    const sek = korTills(s, () => redo() === 0, 900, () => { s.rovare = undefined; s.rovareFler = undefined; });
    return [
      [`byn gör sig redo (${fore} av ${vuxna})`, fore >= vuxna * 0.6],
      [`tillbaka i sitt ${(sek / 60).toFixed(1)} minuter efter att gänget gått (${redo()} kvar redo)`, sek <= 300 && redo() === 0 && t0 > 0],
    ];
  },
};

SCENARIER.ettlarm = {
  text: 'Steg B.51: var och en varnar högst en gång för samma gäng, också när det går till anfall, när striden börjar och när det bär hem; ett gäng till är ett nytt larm',
  kor: () => {
    const s = rovarBy(11), f = rovarGang(s, 5, landVid(s, 30)!); ettGang(s, f); f.vantat = true; f.till = s.now + 2 * SIM.MIN;
    const n: Record<number, number> = {}, forr: Record<number, boolean> = {}; let slag = false;
    const se = () => { for (const p of SIM.living(s)) if (!p.gast) { const v = p.task?.act === 'varna' && p.task.phase === 'do'; if (v && !forr[p.id]) n[p.id] = (n[p.id] ?? 0) + 1; forr[p.id] = v; } slag ||= !!SIM.flockStrid(s, f); };
    const o = vuxnaI(s)[0]; o.task = undefined; Object.assign(o, SIM.freeNear(s, f.x + (SIM.malet(s).x - f.x) * 0.3, f.y + (SIM.malet(s).y - f.y) * 0.3));
    korTills(s, () => !f.folk.length, 2400, () => { ettGang(s, f); se(); });
    const v = Object.values(n);
    // ett gäng till, när larmet om det första är färskt
    const b = rovarBy(11), f1 = rovarGang(b, 2, landVid(b, 34)!); f1.vantat = true; f1.till = b.now + SIM.HOUR; b.rovareFler = undefined; b.rovare = f1;
    const q = vuxnaI(b)[0]; q.larm = { rovare: { t: b.now, vad: 'rovare', storlek: 2, led: 1, varnat: 1, om: [f1.id] } };
    const f2 = rovarGang(b, 2, { x: f1.x + 2, y: f1.y }); f2.vantat = true; f2.till = b.now + SIM.HOUR;
    for (const p of SIM.living(b)) if (!p.gast && p !== q) p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: b.now + SIM.HOUR, carry: 0, why: 'test' } as SIM.Task;
    q.task = { act: 'vakt', phase: 'do', tx: 0, ty: 0, until: b.now + SIM.HOUR, carry: 0, why: 'test' } as SIM.Task; Object.assign(q, SIM.freeNear(b, f1.x + 5, f1.y)); for (let i = 0; i < 120 && (q.larm?.rovare?.om?.length ?? 0) < 2; i++) SIM.rovarSteg(b, 1);
    return [
      [`striden kom (${slag}) och ${v.length} varnade, som mest ${Math.max(0, ...v)} gånger`, slag && v.length >= 1 && Math.max(...v) === 1],
      [`ett gäng till: larmet gäller båda (${q.larm?.rovare?.om?.length}) och hen varnar igen (${!q.larm?.rovare?.varnat})`, q.larm?.rovare?.om?.length === 2 && !q.larm.rovare.varnat],
    ];
  },
};

SCENARIER.seavstand = {
  text: 'Steg B.57: chansen att upptäcka gänget växer ju närmare det är jämfört med synhållet: på natten ses samma gäng senare än på dagen, bortom allas synhåll ses det inte alls, och ett snabbt nattanfall överraskar någon',
  kor: () => {
    // en vaken person ute på ett avstånd, gänget står still: hur många sekunder tills hen ser det
    const tid = (timme: number, d: number, n: number) => {
      const s = rovarBy(timme, n), vid = landVid(s, 40)!, f = rovarGang(s, 4, vid); ettGang(s, f); f.vantat = true; f.till = s.now + SIM.HOUR;
      const o = SIM.living(s).find(p => !p.gast && SIM.vuxenKan(s, p))!;
      for (const p of SIM.living(s)) if (!p.gast) { p.larm = undefined; p.task = { act: p === o ? 'samla' : 'sova', phase: 'do', tx: p.x, ty: p.y, until: s.now + SIM.HOUR, carry: 0, why: 'test' } as SIM.Task; }
      const m = SIM.malet(s), l = Math.hypot(m.x - vid.x, m.y - vid.y);
      for (let i = 1; i <= 600; i++) { for (const r of SIM.rovarna(s, f)) Object.assign(r, vid); Object.assign(o, { x: vid.x + (m.x - vid.x) / l * d, y: vid.y + (m.y - vid.y) / l * d }); SIM.rovarSteg(s, 1); if (o.larm?.rovare) return i; o.task!.until = s.now + SIM.HOUR; }
      return 600;
    };
    const med = (timme: number, d: number) => [0, 1, 2, 3, 4, 5, 6].map(n => tid(timme, d, n)).sort((a, b) => a - b)[3];
    const nara = med(11, 4), mitt = med(11, 13), langt = med(11, 22), natt = med(1, 13), bort = med(11, 48);
    // ett snabbt anfall: en är vaken och arbetar ute på gängets väg till förrådet, de andra sover, på natten och på dagen
    const snabbt = (timme: number) => {
      let over = 0, sag = 0;
      for (let n = 0; n < 12; n++) {
        const s = rovarBy(timme, n), m = SIM.malet(s), vid = landVid(s, 34)!, f = rovarGang(s, 5, vid); ettGang(s, f); f.vantat = true; f.till = s.now; s.kartStridNr = n; for (const q of SIM.rovarna(s, f)) q.pot.aggression = 16;
        const l = Math.hypot(vid.x - m.x, vid.y - m.y), o = vuxnaI(s)[0], pl = SIM.freeNear(s, m.x + (vid.x - m.x) / l * 8, m.y + (vid.y - m.y) / l * 8);
        for (const p of SIM.living(s)) if (!p.gast) p.task = { act: p === o ? 'samla' : 'sova', phase: 'do', tx: p.x, ty: p.y, until: s.now + SIM.HOUR, carry: 0, why: 'test' } as SIM.Task;
        Object.assign(o, pl); Object.assign(o.task!, { tx: pl.x, ty: pl.y });
        let t = 0, d = 0; // d = avståndet när gänget sågs
        const de = new Set<number>();
        korTills(s, () => !f.folk.length || t > 20, 300, () => { ettGang(s, f); if (!d && f.sedd !== undefined) d = Math.min(...SIM.rovarna(s, f).map(q => Math.hypot(q.x - pl.x, q.y - pl.y))); if (!t && !o.larm?.rovare) { Object.assign(o, pl); o.task = { act: 'samla', phase: 'do', tx: pl.x, ty: pl.y, until: s.now + SIM.HOUR, carry: 0, why: 'test' } as SIM.Task; } const g = SIM.flockStrid(s, f); if (g) { t++; for (const k of g.st.kampar) if (k.sida === 0 && k.overraskad) de.add(k.pid!); } });
        over += de.size; sag += f.sedd === undefined ? 0 : d;
      }
      return { over, sag: sag / 12 };
    };
    const n1 = snabbt(1), d1 = snabbt(11);
    return [
      [`dagen: ses fortare ju närmare (${nara} s på 4 rutor, ${mitt} s på 13, ${langt} s på 22)`, nara < mitt && mitt < langt && nara <= 20],
      [`natten senare än dagen på samma avstånd (${natt} mot ${mitt} s)`, natt > mitt],
      [`utanför synhållet ses det inte alls (${bort === 600 ? 'inte på tio minuter' : bort + ' s'})`, bort === 600],
      [`snabba nattanfall: ${n1.over} bybor överraskas i 12 anfall (på dagen ${d1.over}); gänget ses ${n1.sag.toFixed(0)} rutor bort (på dagen ${d1.sag.toFixed(0)})`, n1.over >= 2 && n1.over > d1.over && n1.sag < d1.sag],
    ];
  },
  lang: true,
};

SCENARIER.ingenvantan = {
  text: 'Steg B.47: om de egna räcker räknas likadant vid larmet och i mötet, och när alla på väg är framme och ändå inte räcker väljs rollen om: två kämpar mot sex rövare står inte kvar på väntplatsen',
  kor: () => {
    const prov = (n: number, kampar: number) => {
      const s = rovarBy(11, n), f = rovarGang(s, 6, landVid(s, 40)!); ettGang(s, f); f.vantat = true; f.till = s.now + SIM.HOUR; f.test = false;
      const v = vuxnaI(s).slice(0, kampar), m = SIM.malet(s);
      // de andra är borta: bara kämparna finns i byn
      for (const p of SIM.living(s)) if (!p.gast && !v.includes(p)) p.larmRoll = { hot: 'rovare', roll: 'gomd', v: s.larmV ?? 0, t: s.now + SIM.HOUR };
      v.forEach((p, i) => { Object.assign(p, SIM.freeNear(s, m.x + 4 + i, m.y)); p.pot.mod = 12; SIM.horLarm(p, { t: s.now, vad: 'rovare', storlek: 6, led: 1, varnat: 1, om: [f.id] }); p.larmRoll = { hot: 'rovare', roll: 'kampe', v: s.larmV ?? 0, t: s.now }; p.task = { act: 'forsvarRovare', phase: 'go', tx: m.x, ty: m.y, until: s.now + SIM.HOUR, carry: 0, why: 'test' } as SIM.Task; });
      let sist = 0; const t0 = s.now;
      korTills(s, () => false, 240, () => { ettGang(s, f); if (v.some(p => p.task?.act === 'forsvarRovare' && p.task.vantar)) sist = (s.now - t0) / 1000; });
      return { sist, roller: v.map(p => p.larmRoll?.roll ?? '-') };
    };
    const a = [0, 1, 2].map(n => prov(n, 2)), b = prov(0, 7);
    return [
      [`två mot sex väntar inte på ingen (väntar sist efter ${a.map(x => x.sist.toFixed(0)).join(', ')} s; ${a.map(x => x.roller.join('+')).join(', ')})`, a.every(x => x.sist < 90 && x.roller.every(r => r !== 'kampe'))],
      [`sju mot sex är kvar som kämpar (${b.roller.join(', ')})`, b.roller.filter(r => r === 'kampe').length >= 4],
    ];
  },
};

SCENARIER.undanhot = {
  text: 'Steg B.48: den som inte slåss väljer plats efter hotet där och på vägen dit: väntplatsen ligger inte mellan förrådet och gängets hemkant, den som gömmer sig vid elden gör det på sidan bort från gänget, och den som flytt från striden vårdas bort från gänget',
  kor: () => {
    const s = rovarBy(11), m = SIM.malet(s), f = rovarGang(s, 5, landVid(s, 30)!); ettGang(s, f); f.vantat = true; f.anfaller = true; f.test = false;
    const l = SIM.radLinje(s, f), h = SIM.kantMot(s, f.klan) ?? SIM.kanterna(m.x, m.y)[0];
    const vinkel = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) => { const u = [a.x - b.x, a.y - b.y], w = [c.x - b.x, c.y - b.y]; return Math.acos((u[0] * w[0] + u[1] * w[1]) / Math.max(1e-6, Math.hypot(u[0], u[1]) * Math.hypot(w[0], w[1]))) * 180 / Math.PI; };
    const hem = vinkel(l.vantM, l.mal, h), in_ = vinkel(l.vantM, l.mal, f.rast ?? f);
    // gänget plundrar vid förrådet
    for (const [i, r] of SIM.rovarna(s, f).entries()) Object.assign(r, SIM.freeNear(s, m.x + i % 3, m.y + Math.floor(i / 3)));
    const v = vuxnaI(s), p = v[0], d = (at: { x: number; y: number }) => Math.min(...SIM.rovarna(s, f).map(r => Math.hypot(r.x - at.x, r.y - at.y)));
    for (const q of SIM.living(s)) if (!q.gast) q.task = undefined;
    Object.assign(p, SIM.freeNear(s, m.x + 9, m.y + 1)); SIM.horLarm(p, { t: s.now, vad: 'rovare', storlek: 5, led: 1, varnat: 1, om: [f.id] });
    const g = SIM.gomSig(s, p, 'Rövare', 'rovare', SIM.HOUR)!;
    const utan = (() => { const la = p.larm; p.larm = undefined; const x = SIM.gomSig(s, p, 'Rövare', 'rovare', SIM.HOUR)!; p.larm = la; return x; })();
    // den sårade: förbanden ligger i förrådet bland rövarna
    SIM.setAmount(s, 'remsa', 4); SIM.skada(s, p, 'armV', 'skarsar', 0.7, 'rovare', 'prov');
    const egen = SIM.vardVal(s, p, true), hot = SIM.forbandHot(s, p);
    const t = egen && { act: 'varda', phase: 'go', tx: p.x, ty: p.y, ref: p.id, stanna: egen.stanna } as SIM.Task;
    const hamtar = t && SIM.vardHamtas(s, p, t);
    return [
      [`väntplatsen ligger inte på vägen hem (${hem.toFixed(0)}° från hemkanten, ${in_.toFixed(0)}° från rasten)`, hem > 60 && in_ > 60],
      [`gömslet ligger längre från gänget (${d(g.spot!).toFixed(1)} mot ${d(utan.spot!).toFixed(1)} rutor utan hotet)`, d(g.spot!) >= d(utan.spot!) && d(g.spot!) > d(p) - 1],
      [`den sårade går inte till förrådet bland rövarna efter förband (hotet ${hot.toFixed(2)}, ${JSON.stringify(SIM.vardBehov(s, p, p))}, tid kvar ${SIM.tidKvar(p).toFixed(2)} tim, stannar ${egen?.stanna}, hämtar ${JSON.stringify(hamtar)})`, !!egen?.stanna && !hamtar],
    ];
  },
};

SCENARIER.egenplats = {
  text: 'Steg B.49: var och en på sin plats: fem rövare som plundrar står på fem olika rutor, och raden står på fri mark mellan gänget och det som försvaras, var och en i sin ruta, inte i ett hus eller på lagret',
  kor: () => {
    const s = rovarBy(11), m = SIM.malet(s), f = rovarGang(s, 5, landVid(s, 30)!); ettGang(s, f); f.vantat = true; f.anfaller = true; f.test = false;
    for (const p of SIM.living(s)) if (!p.gast) { Object.assign(p, SIM.freeNear(s, SIM.clamp(m.x - 50, 2, SIM.W - 2), m.y)); p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: s.now + SIM.HOUR, carry: 0, why: 'test' } as SIM.Task; }
    for (const r of SIM.rovarna(s, f)) Object.assign(r, SIM.freeNear(s, m.x + 1, m.y + 1));
    SIM.setAmount(s, 'skinn', 80);
    let tog = 0, samma = 0;
    korTills(s, () => f.klar === true || tog > 30, 120, () => {
      ettGang(s, f); const ta = SIM.rovarna(s, f).filter(r => r.gast!.gor === 'ta' && Object.keys(r.gast!.bar ?? {}).length);
      if (ta.length < 2) return; tog++;
      if (new Set(ta.map(r => Math.floor(r.y) * SIM.W + Math.floor(r.x))).size < ta.length) samma++;
    });
    const tagna = SIM.rovarna(s, f).map(r => `${r.x.toFixed(1)},${r.y.toFixed(1)}`);
    // raden
    const s2 = rovarBy(11), f2 = rovarGang(s2, 2, landVid(s2, 40)!); ettGang(s2, f2); f2.vantat = true; f2.till = s2.now + SIM.HOUR; f2.test = false;
    const v = vuxnaI(s2).slice(0, 6);
    for (const p of SIM.living(s2)) if (!p.gast && !v.includes(p)) p.larmRoll = { hot: 'rovare', roll: 'gomd', v: s2.larmV ?? 0, t: s2.now + SIM.HOUR };
    for (const p of v) { p.pot.mod = 16; SIM.horLarm(p, { t: s2.now, vad: 'rovare', storlek: 2, led: 1, varnat: 1, om: [f2.id] }); p.larmRoll = { hot: 'rovare', roll: 'kampe', v: s2.larmV ?? 0, t: s2.now + SIM.HOUR }; p.task = undefined; Object.assign(p, { hunger: 0.9, torst: 0.9, toa: 0.9, rest: 0.9 }); }
    korTills(s2, () => false, 120, () => ettGang(s2, f2));
    const rad = v.filter(p => p.task?.act === 'forsvarRovare'), inne = rad.filter(p => SIM.roomAt(s2, Math.floor(p.x), Math.floor(p.y)) || SIM.zoneAt(s2, Math.floor(p.x), Math.floor(p.y)) >= 0);
    const rutor = new Set(rad.map(p => Math.floor(p.y) * SIM.W + Math.floor(p.x)));
    return [
      [`plundrarna står på olika rutor (${samma} av ${tog} slag delar två en ruta; ${tagna.join(' ')})`, tog > 0 && samma === 0],
      [`raden: ${rad.length} står i den, ${inne.length} i ett hus eller på lagret`, rad.length >= 3 && inne.length === 0],
      [`var och en i sin ruta (${rutor.size} av ${rad.length})`, rutor.size === rad.length],
    ];
  },
};

SCENARIER.vaninod = {
  text: 'Steg B.50: vännen i nöd: målvalet i striden väger in en vän som blöder eller har lite mod kvar: fyra bybor mot två rövare, där en femte står ensam mot den andra rövaren och blöder: någon av de fyra går dit',
  kor: () => {
    const m = (id: number, sida: 0 | 1, x: number, y = 7) => ({ id, namn: `K${id}`, sida, st: { styrka: 10, uthallighet: 14, mod: 14, smidighet: 10, skicklighet: 10 }, vapen: 'kniv' as SIM.Vapen, klader: [], fart: 1, x, y });
    const prov = (nod: boolean, fro: number) => {
      // fyra mot rövaren 11, och en ensam mot rövaren 12 tio rutor bort
      const st = SIM.nyStrid({ avsikt: 'skada', w: 40, h: 20, kampar: [m(1, 0, 9, 6), m(2, 0, 9, 7), m(3, 0, 9, 8), m(4, 0, 8, 7), m(5, 0, 16, 7), m(11, 1, 10, 7), m(12, 1, 17, 7)] }, fro);
      const ensam = st.kampar[4], r1 = st.kampar[5], r2 = st.kampar[6];
      ensam.mal = 12; r2.mal = 5; r1.mal = 1; for (let i = 0; i < 4; i++) st.kampar[i].mal = 11;
      if (nod) { ensam.skador = [{ d: 'bal', k: 'skarsar', g: 0.6, ny: 1 }]; ensam.blod = 0.8; ensam.modNu = 0.3; }
      for (let i = 0; i < 6; i++) SIM.stridSteg(st);
      return st.kampar.slice(0, 4).filter(k => k.mal === 12).length;
    };
    const ut = (nod: boolean) => [1, 2, 3, 4, 5, 6].map(f => prov(nod, f));
    const med = ut(true), utan = ut(false);
    return [
      [`någon av de fyra går till vännen som blöder (${med.join(', ')})`, med.filter(n => n > 0).length >= 5],
      [`fler än när vännen klarar sig (${utan.join(', ')})`, med.reduce((a, b) => a + b, 0) > utan.reduce((a, b) => a + b, 0)],
      [`alla fyra springer inte dit (${med.join(', ')})`, med.every(n => n < 4)],
    ];
  },
};

SCENARIER.gralmod = {
  text: 'Steg B.53: grälet blir slagsmål efter modet: en rädd bybo som grälar med en starkare slåss inte, två modiga kan göra det, och ingen som börjat drar sig undan före första slaget',
  kor: () => {
    const prov = (radd: boolean) => {
      let n = 0, avstar = 0;
      for (let i = 0; i < 400; i++) {
        const s = rovarBy(11, 1 + i % 7), [a, b] = vuxnaI(s);
        s.rngs = {}; s.seed += i * 31;
        a.pot.mod = radd ? 1 : 15; a.pot.styrka = radd ? 3 : 12; a.pot.aggression = 18; b.pot.mod = 15; b.pot.styrka = radd ? 18 : 12;
        for (const p of [a, b]) p.task = undefined;
        Object.assign(b, { x: a.x + 1, y: a.y });
        for (let j = 0; j < 200 && !s.kartStrider?.length; j++) SIM.gralBlirSlagsmal(s, a, b);
        const g = s.kartStrider?.[0]; if (!g) { if (i > 14) break; continue; }
        n++; for (let j = 0; j < 8 && !g.st.slut; j++) SIM.stridSteg(g.st);
        if (g.st.logg.some(r => r.h === 'avstar')) avstar++;
        if (n >= 10) break;
      }
      return { n, avstar };
    };
    const r = prov(true), m = prov(false);
    return [
      [`den rädda slåss inte (${r.n} slagsmål)`, r.n === 0],
      [`de modiga kan (${m.n} slagsmål)`, m.n >= 3],
      [`ingen drar sig undan före första slaget (${m.avstar})`, m.avstar === 0],
    ];
  },
};
