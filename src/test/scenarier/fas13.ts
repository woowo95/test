// Scenarier för fas 13.
import * as SIM from '../../sim';
import { SCENARIER, klockan, medBank, nyInvanare } from './hjalp';
import { START } from '../kor';

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
  text: 'Steg 13.1.8: det första järnet ur blästerugnen och byns första smedja blir händelser i krönikan (mallarna k_forstaJarn och k_forstaSmedja, fyra varianter var), bara första gången',
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
      ['mallarna har tre eller fyra varianter var', [B.k_forstaJarn, B.k_forstaSmedja].every(v => v.length >= 3 && v.length <= 4)],
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
