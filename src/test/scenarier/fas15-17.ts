// Scenarier för fas 15, grupp 17 (steg 15.1.161–15.1.170).
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, klockan, kor, medBank, nyInvanare, setMat, tandEld, testBy, utanWebblasare } from './hjalp';
import { foretagBy } from './fas14';
import { hus as husFlik } from '../../ui/flikar/hus';
import { setByn, ui } from '../../ui/lage';
import { hasIcon } from '../../ikoner';
import { hjalpKlick, stangAllaHjalp } from '../../ui/hjalp';

SCENARIER.latrinko = {
  text: 'Steg 15.1.162: kön till latrinen är ingen brist. Den som väntar på en upptagen latrin köar eller går till en annan, och hur många latriner byn behöver räknas över dygnet (SMUTS.latrinPer): en grävd latrin räknas efter hur stor del av dygnets besök den rymmer, så en by med 18 invånare har högst fyra latriner på 20 dygn. Kön ger ingen brist, och väntan förlänger bara besöket',
  kor: () => {
    const s = SIM.createState(1, START); klockan(s, 8);
    while (SIM.living(s).length < 18) nyInvanare(s, SIM.living(s).length % 2 ? 'm' : 'k', 25);
    const folk = SIM.living(s), per = SIM.latrinBesokDygn(folk.length) / 144;
    // byn gräver en ny latrin när bristen säger det, och den är klar en timme senare (en i taget, som ett projekt)
    let mest = 0, besok = 0, n = 0, grav: number | undefined;
    for (let i = 0; i < 20 * 144; i++) {
      s.now += 10 * SIM.MIN;
      if (grav !== undefined && s.now >= grav) { const t = medBank(s, 'latrin'); t.klar = s.now; grav = undefined; }
      if (grav === undefined && SIM.latrinBrist(s) > 0) grav = s.now + SIM.HOUR;
      for (besok += per; besok >= 1; besok--) {
        const p = folk[n++ % folk.length]!, l = SIM.latrinFor(s, p);
        if (l) { p.x = l.x + 0.5; p.y = l.y + 0.5; } SIM.toaBesok(s, p, l?.id);
      }
      mest = Math.max(mest, SIM.latriner(s).length + (grav !== undefined ? 1 : 0));
    }
    // kön: två väntar vid samma latrin, och bristen är densamma som utan kön
    const l = SIM.latriner(s).find(SIM.isKlar) ?? medBank(s, 'latrin'), [a, b] = folk as [SIM.Person, SIM.Person];
    const fore = SIM.latrinBrist(s);
    for (const q of [a, b]) Object.assign(q, { x: l.x + 0.5, y: l.y + 0.5, task: { act: 'toa', phase: 'do', tx: l.x + 0.5, ty: l.y + 0.5, until: s.now + 10 * SIM.MIN, carry: 0, why: '', ref: l.id } });
    a.task!.prog = 0;
    const iKo = SIM.latrinUpptagen(s, l, b), med = SIM.latrinBrist(s);
    return [
      [`byn med ${folk.length} invånare har högst fyra latriner på 20 dygn (som mest ${mest}, byn vill ha ${Math.ceil(folk.length / SIM.SMUTS.latrinPer)} i bruk)`, mest <= 4 && mest >= 3],
      [`${s.stat?.latrinbesok ?? 0} besök i latrinerna, och fläckar bara innan den första var grävd (${s.stat?.['toafläckar'] ?? 0})`, (s.stat?.latrinbesok ?? 0) > 900 && (s.stat?.['toafläckar'] ?? 0) <= 5],
      [`den som köar ger ingen brist (${SIM.kortTal(fore)} utan kön, ${SIM.kortTal(med)} med)`, iKo && med === fore],
    ];
  },
};

SCENARIER.bjorngris = {
  text: 'Steg 15.1.166: björnen tar grisar. En gris som går lös nära björnen, utan någon vaken bredvid, tas med en chans per tid (samma prov som vargen, vaktat i tamdjur.ts); en gris i fähuset tas inte, och inte en med en vaken bredvid',
  kor: () => {
    const prova = (hur: 'ute' | 'fahus' | 'vaken') => {
      const s = SIM.createState(6, START);
      let t0: number | undefined;
      for (let t = s.now; t < s.now + 60 * SIM.DAY && t0 === undefined; t += 20 * SIM.MIN) if (SIM.bjornarOf(s, t).some(d => d.art === 'bjorn')) t0 = t;
      if (t0 === undefined) return undefined;
      s.now = t0;
      const folk = SIM.living(s), vakt = folk[0]!;
      for (const q of folk) q.task = { act: 'sova', phase: 'do', tx: q.x, ty: q.y, until: s.now + 30 * SIM.HOUR, carry: 0 };
      const b0 = SIM.bjornarOf(s).find(d => d.art === 'bjorn')!, g = SIM.nyttTamdjur(s, 'gris', b0.x + 1.5, b0.y);
      let min = 0, bjornNara = 0;
      for (; min < 24 * 60 && SIM.tamdjurOf(s).includes(g); min++) {
        s.now += SIM.MIN;
        const b = SIM.bjornarOf(s).find(d => d.art === 'bjorn');
        if (!b) continue;
        bjornNara++;
        g.x = b.x + 1.5; g.y = b.y; if (hur === 'fahus') g.fahus = 1;
        if (hur === 'vaken') { vakt.task = undefined; vakt.x = g.x + 1; vakt.y = g.y + 1; const ar = SIM.yearNo(s, s.now); if (s.bjornMott?.ar !== ar) s.bjornMott = { ar, ids: [] }; if (!s.bjornMott.ids.includes(vakt.id)) s.bjornMott.ids.push(vakt.id); }
        SIM.bjornSteg(s, 60);
      }
      return { tagen: !SIM.tamdjurOf(s).includes(g), min, bjornNara, stat: s.stat?.bjornTogGris ?? 0 };
    };
    const ute = prova('ute'), inne = prova('fahus'), vaken = prova('vaken');
    if (!ute || !inne || !vaken) return [['ett ögonblick med björnen', false]];
    return [
      [`björnen tar grisen som går lös nära den inom ett dygn (efter ${ute.min} minuter, björnen nära i ${ute.bjornNara})`, ute.tagen && ute.stat === 1],
      [`grisen i fähuset tas inte (björnen nära i ${inne.bjornNara} minuter)`, !inne.tagen && inne.bjornNara > 60],
      [`grisen med en vaken bredvid tas inte (björnen nära i ${vaken.bjornNara} minuter)`, !vaken.tagen && vaken.bjornNara > 60],
    ];
  },
};

SCENARIER.hundvarg = {
  text: 'Steg 15.1.168: vakthunden skrämmer vargarna. En lojal hund nära djuret räknas som en vaken vakt för flocken, på dubbla avståndet (VAKTHUND.skrammer × VARG.vaken), så en hungrig flock tar inte ett får med en lojal hund bredvid men tar ett utan',
  kor: () => {
    const varg = (hund: number | undefined) => {
      const s = SIM.createState(3, START); klockan(s, 2); s.kal = SIM.nyKalender(s.now, SIM.ISTID);
      const folk = SIM.living(s);
      for (const q of folk) q.task = { act: 'sova', phase: 'do', tx: q.x, ty: q.y, until: s.now + 20 * SIM.HOUR, carry: 0 };
      const c = SIM.bynsMitt(s), d = SIM.nyttTamdjur(s, 'far', c.x + 12, c.y);
      if (hund !== undefined) { const h = SIM.nyttTamdjur(s, 'hund', d.x + 1, d.y + 1, folk[0]!.id); h.lojal = hund; }
      const f: SIM.Vargflock = { id: s.vargNr = 1, vargar: [10_000_008, 10_000_009], x: d.x + 10, y: d.y, mx: d.x + 10, my: d.y, gar: s.now + 48 * SIM.HOUR, hunger: 0.9, gor: 'stryker', sedd: s.now };
      (s.vargar ??= []).push(f);
      let i = 0;
      for (; i < 1500 && SIM.tamdjurOf(s).includes(d); i++) { s.now += 10 * SIM.SEC; SIM.vargSteg(s, 10); }
      return { tagen: !SIM.tamdjurOf(s).includes(d), min: Math.round(i / 6) };
    };
    const utan = varg(undefined), med = varg(0.9), olojal = varg(0.3);
    return [
      [`flocken tar fåret utan hund (efter ${utan.min} minuter)`, utan.tagen],
      ['flocken tar inte fåret med en lojal hund bredvid på fyra timmar', !med.tagen],
      [`en hund som inte är lojal skyddar inte fåret (${olojal.tagen ? 'taget' : 'kvar'})`, olojal.tagen],
    ];
  },
};

SCENARIER.viltbestand = {
  text: 'Steg 15.1.169: viltet kan jagas ut. Rådjurens och vildsvinens bestånd kring byn minskar med varje fällt djur och växer tillbaka per tid (raden viltet i TAKTER), och flockens storlek följer beståndet: en by som fäller många rådjur ser mindre flockar efter tio dygn, och de växer till igen när jakten slutar',
  kor: () => {
    const flockar = (s: SIM.State) => SIM.radjurGrupper(s).reduce((a, g) => a + g.n, 0);
    const kor10 = (s: SIM.State, jaga: boolean, dygn = 10) => {
      let falld = 0;
      for (let i = 0; i < dygn * 144; i++) {
        s.now += 10 * SIM.MIN; SIM.viltSteg(s, 600);
        if (jaga && i % 36 === 0) { const d = SIM.radjurOf(s)[0]; if (d) { SIM.dodaDjur(s, d.id); falld++; } } // ett rådjur var sjätte timme
      }
      return falld;
    };
    const jagad = SIM.createState(3, START), fri = SIM.cloneState(jagad);
    const fore = flockar(jagad), falld = kor10(jagad, true); kor10(fri, false);
    const efter = flockar(jagad), friN = flockar(fri), bJ = SIM.viltBestand(jagad, 'radjur'), bF = SIM.viltBestand(fri, 'radjur');
    kor10(jagad, false, 20);
    const igen = SIM.viltBestand(jagad, 'radjur');
    return [
      [`byn fällde ${falld} rådjur på tio dygn, och beståndet sjönk (${SIM.kortTal(bJ)} mot ${SIM.kortTal(bF)} utan jakt)`, falld >= 5 && bJ < 0.6],
      [`flockarna är mindre där byn jagar (${efter} rådjur mot ${friN} utan jakt, ${fore} när byn grundades)`, efter < friN && efter < fore],
      [`där ingen jagar växer beståndet till sig (${SIM.kortTal(bF)})`, bF > 1.05],
      [`när jakten slutar växer beståndet till igen på tjugo dygn (${SIM.kortTal(bJ)} till ${SIM.kortTal(igen)})`, igen > bJ + 0.2],
      ['vildsvinen har ett eget bestånd', SIM.viltBestand(jagad, 'vildsvin') > 1],
    ];
  },
};

SCENARIER.stallfoder = {
  text: 'Steg 15.1.170: riddjuret behöver foder. En gäst med riddjur köper foder i stallet, och det födda riddjuret bär hen hem i ryttarens fart; en gäst vars riddjur inte får foder blir missnöjd, som av en måltid hen inte fick. Andelen gäster med riddjur är ett tal (FGAST.ridande), som stallet också räknar med',
  kor: () => {
    const { s, p, f, r, disk } = foretagBy(['servering']), W = SIM.W, k = SIM.klanerOf(s).find(q => q.rad !== undefined)!, rad = s.varld!.rader!.find(q => q.nr === k.rad)!;
    for (const q of SIM.living(s)) { q.task = undefined; (q.tek ??= {}).snickarbank = 1; }
    rad.tal.silver = 300; k.inst = 0;
    s.stationer = (s.stationer ?? []).filter(q => !(q.k === 'krubba' && r.tiles.includes(q.y * W + q.x))); SIM.touch(s);
    SIM.utoka(s, f, ['stall']);
    const q = SIM.stationSite(s, 'krubba');
    if (q) { s.stationer!.push({ id: s.nextStation = (s.nextStation ?? 0) + 1, k: 'krubba', x: q.x, y: q.y, rot: q.rot, kvar: 0, inne: 1 } as unknown as SIM.Station); SIM.touch(s); }
    s.finhet = { ...s.finhet, [SIM.rumNyckel(SIM.foretagRum(s, f)[0])]: 0.6 };
    SIM.put(s, 'torrgras', 3, { [p.id]: 3 }); f.pris = { ...f.pris, stall: 0.5 };
    const gast = () => { const g = SIM.nyForetagsgast(s, f, k, 'rik')!; g.gast!.riddjur = 1; g.gast!.varor = undefined; g.gast!.silver = 50; const o = SIM.koPlats(s, disk); g.x = o.x; g.y = o.y; g.gast!.fas = 'pratar'; return g; };
    // gästen med riddjur köper foder
    const a = gast(), oppet = SIM.oppna(s, f).includes('stall'), e = SIM.erbjudandet(s, a, 'stall', f);
    const kopt = SIM.iHelaForradet(() => SIM.kopVid(s, f, a, { p: a.id, v: 'stall', k: 'djurvard', n: 1, t: s.now }, p)), fodd = a.gast!.rodd === 1 && a.gast!.riddjur === undefined;
    // den vars riddjur inte får foder: stallet har inget foder kvar, och hen har redan köpt allt hen ville
    SIM.put(s, 'torrgras', -SIM.ownsId(s, p.id, 'torrgras'), { [p.id]: -SIM.ownsId(s, p.id, 'torrgras') });
    const b = gast(); b.gast!.gjort = SIM.FGAST.kop; b.gast!.bemott = { v: 0.5, n: 1 };
    const u0 = s.stat?.riddjurUtanFoder ?? 0; SIM.foretagsgastSteg(s, 1);
    const missnojd = (b.gast!.bemott?.v ?? 0) / (b.gast!.bemott?.n ?? 1) < 0.5 && (s.stat?.riddjurUtanFoder ?? 0) === u0 + 1 && b.gast!.fas === 'gar';
    // på väg hem: den med fött riddjur går fortare
    a.gast!.fas = 'gar'; a.gast!.gor = undefined; a.x = b.x; a.y = b.y; a.task = undefined;
    const fran = { ax: a.x, ay: a.y, bx: b.x, by: b.y };
    for (let i = 0; i < 20; i++) { s.now += 1000; SIM.foretagsgastSteg(s, 1); }
    const da = Math.hypot(a.x - fran.ax, a.y - fran.ay), db = Math.hypot(b.x - fran.bx, b.y - fran.by);
    return [
      [`stallet har öppet (${oppet}), och gästen med riddjur vill köpa foder (${e?.k ?? 'inget'})`, oppet && e?.k === 'djurvard'],
      [`hen köper, och riddjuret är fött (${kopt}, ${fodd})`, kopt && fodd],
      [`gästen vars riddjur inte fick foder blir missnöjd (${SIM.kortTal((b.gast!.bemott?.v ?? 0) / (b.gast!.bemott?.n ?? 1))}) och går hem`, missnojd],
      [`det födda riddjuret bär gästen hem fortare (${SIM.kortTal(da)} mot ${SIM.kortTal(db)} rutor på 20 sekunder)`, da > db * 1.3],
      [`stallet räknar med samma andel ridande som gästerna kommer med (${SIM.FGAST.ridande})`, !('ridande' in SIM.VERK)],
    ];
  },
};

SCENARIER.hovarde = {
  text: 'Steg 15.1.165: vattenhon och skäran väger det som står på spel. Projektet ärver värdet av det som hänger på det (spel i ProjektDef, registret SPEL i projekt.ts): vattenhon djuren som väntar på vatten, mer ju törstigare de är, och skäran betesdjuren som inte klarar vintern utan höet som saknas. En by med törstiga får i en hage utan vatten bygger vattenhon inom ett dygn, och en by med äng och för lite hö gör en skära',
  kor: () => {
    // en testby med får i en hage som inte når vattnet (som hageUtanVatten i fas10.ts, men i en by med alla sina projekt)
    const hageBy = () => {
      const b = SIM.cloneState(testBy(15, x => SIM.living(x).length >= 10 && SIM.temperature(x) > 8)); klockan(b, 8);
      const p = SIM.living(b).filter(r => SIM.ageOf(r, b.now) >= SIM.ALDER.vuxen)[0]!;
      SIM.setAmount(b, 'levfar', 3); SIM.stepBoskap(b);
      for (const q of SIM.living(b)) (q.tek ??= {}).staket = 1;
      SIM.setAmount(b, 'grenar', 400); SIM.setAmount(b, 'rep', 4);
      const mat = SIM.hageUppgift(b, p); if (mat?.ref === -1) SIM.hageKlar(b, p, -1);
      for (let v = SIM.hageVal(b, p), n = 0; v && n < 200; v = SIM.hageVal(b, p), n++) SIM.hageKlar(b, p, v.i);
      const h = SIM.hagarOf(b)[0];
      if (h) for (const d of SIM.tamdjurOf(b)) if (SIM.tamArt(d.art).bete) { d.hage = h.id; d.x = h.x + 1.5; d.y = h.y + 1.5; }
      return { b, h };
    };
    const plats = (s: SIM.State, k: string) => SIM.projekt(s).findIndex(r => r.k === k) + 1;
    // vattenhon
    const { b, h } = hageBy();
    if (!h || SIM.hageVidVatten(b, h)) return [['en testby med får i en hage utan vatten', false]];
    for (const d of SIM.tamdjurOf(b)) { d.torst = 1; d.torstTim = 6; }
    const p0 = plats(b, 'vattenho'), spel0 = SIM.hoSpel(b);
    SIM.setAmount(b, 'virke', Math.max(SIM.amountOf(b, 'virke'), 4));
    let tim = 0;
    for (; tim < 24 && !SIM.hoarOf(b).some(SIM.isKlar); tim++) kor(b, 1);
    // skäran
    const s = hageBy().b, c = SIM.bynsMitt(s);
    s.angar = [{ id: 1, x: Math.floor(c.x) + 8, y: Math.floor(c.y) + 8, w: 4, h: 4 }]; SIM.setAmount(s, 'torrgras', 0);
    s.ting = SIM.tingOf(s).filter(t => !SIM.GORS.skara?.includes(t.k)); SIM.setAmount(s, 'flinta', Math.max(SIM.amountOf(s, 'flinta'), 4));
    for (const q of SIM.living(s)) (q.tek ??= {}).kniv = 1;
    const p1 = plats(s, 'skara'), spel = SIM.hoFattas(s);
    let st = 0;
    for (; st < 24 && !SIM.tingOf(s).some(t => SIM.GORS.skara?.includes(t.k)); st++) kor(s, 1);
    return [
      [`vattenhon står på plats ${p0} av ${SIM.projekt(b).length} när fåren törstar (${SIM.kortTal(spel0)} silver på spel)`, p0 >= 1 && p0 <= 3],
      [`vattenhon byggs inom ett dygn (${tim} timmar)`, SIM.hoarOf(b).some(SIM.isKlar) && tim < 24],
      [`skäran står på plats ${p1} med äng och utan hö (${SIM.kortTal(spel)} silver på spel)`, p1 >= 1 && p1 <= 10 && spel > 0],
      [`en skära görs inom ett dygn (${st} timmar)`, SIM.tingOf(s).some(t => SIM.GORS.skara?.includes(t.k))],
    ];
  },
};

SCENARIER.affarruta = {
  text: 'Steg 15.1.163: affärens ruta visar vad den gör. Husets ruta för en affär visar med symboler om varje verksamhet har öppet, vad den säljer, priset i silver och kön (platshållarna sym_oppet, sym_stangt och sym_ko), och texten kommer fram när man trycker',
  kor: () => {
    const { s, p, f } = foretagBy(['servering']);
    const g = SIM.living(s).find(q => q !== p && !SIM.familjOf(s, p.id).includes(q) && SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    (f.ko ??= []).push({ p: g.id, v: 'servering', k: SIM.FOOD.find(k => SIM.ownsId(s, p.id, k) >= 1)!, n: 1, t: s.now });
    utanWebblasare(); setByn(s); ui.husId = f.hus!;
    const html = husFlik.html!(), a = SIM.affarLage(s, f), namn = SIM.VERKSAMHETER.servering!.namn;
    hjalpKlick({ closest: () => ({ dataset: { hjalp: `affar-${f.hus}` } }) } as unknown as HTMLElement); // trycket på frågetecknet
    const tryckt = husFlik.html!(); stangAllaHjalp();
    // stängt: utan disk
    const d = SIM.diskarAv(s, f)[0]!; s.stationer = s.stationer!.filter(t => t !== d); SIM.touch(s);
    const stangd = husFlik.html!();
    return [
      [`rutan visar att serveringen har öppet (${a.verk.map(r => `${r.v}: ${r.oppet}`).join(', ')})`, html.includes(`aria-label="${namn}: öppet"`) && hasIcon('sym_oppet')],
      [`och kön med en som väntar (${a.ko})`, html.includes('aria-label="1 i kön"') && hasIcon('sym_ko')],
      [`varorna med priset i silver (${a.verk[0]?.varor.map(w => `${w.k} ${w.pris}`).join(', ')})`, (a.verk[0]?.varor.length ?? 0) > 0 && a.verk[0]!.varor.every(w => w.pris >= 1) && hasIcon('silver')],
      ['texten om affären kommer fram först när man trycker', /Vad affären gör/.test(html) && !html.includes(`${namn}: öppet, säljer`) && tryckt.includes(`${namn}: öppet, säljer`) && tryckt.includes('väntar i kön')],
      ['utan disk är den stängd', stangd.includes(`aria-label="${namn}: stängt"`) && hasIcon('sym_stangt')],
    ];
  },
};

SCENARIER.jaktsamling = {
  text: 'Steg 15.1.167: jägarna samlas före djuret, om det behövs. Mätningen: hur ofta den som kallar till jakt möter djuret ensam, mot vargflocken och mot björnen. Den som kallar går före, men väntar vid djuret in de andra (jaktSamlas, VARG.samlasTim och BJORNJAKT.samlasTim), och flocken anfaller inte den som har jägare nära. Den som kallar möter djuret ensam i högst en av tio jakter. Mätt i steget: ingen av åtta vargjakter och ingen av tio björnjakter, så inget byggdes',
  kor: () => {
    // den första striden med djuret: hur många människor som var med, och om den som kallade var ensam
    const forsta = (s: SIM.State, art: string, kallar: number, timmar: number, slut: () => boolean) => {
      for (let i = 0; i < timmar * 360 && !slut(); i++) {
        SIM.step(s, 10); // striden kan börja och sluta inom fem minuter
        const g = SIM.kartStrider(s).find(x => x.djur?.some(d => d.art === art));
        if (g) { const folk = g.st.kampar.filter(k => k.pid !== undefined).map(k => k.pid!); return { n: folk.length, ensam: folk.length === 1 && folk[0] === kallar }; }
      }
      return undefined;
    };
    // vargarna: en by i istiden med fem vuxna med spjut och en flock på två som just setts
    const varg: { n: number; ensam: boolean }[] = [], vargUtan: string[] = [], bjornUtan: string[] = [];
    for (let seed = 1; seed <= 10; seed++) {
      const s = SIM.createState(seed, START); s.kal = SIM.nyKalender(s.now, 0); klockan(s, 10); tandEld(s);
      for (const [x, a] of [['m', 30], ['k', 28], ['m', 35], ['k', 24], ['m', 40]] as const) nyInvanare(s, x, a);
      setMat(s, { vilt: 60, bar: 60 });
      for (const q of SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= 18 && SIM.ageOf(q, s.now) < 55)) { SIM.addTool(s, 'flintspjut', q).hos = q.id; q.pot.mod = 14; }
      const c = SIM.bynsMitt(s), id = s.vargNr = 1;
      const f: SIM.Vargflock = { id, vargar: [10_000_008, 10_000_009], x: c.x + 14, y: c.y, mx: c.x + 14, my: c.y, gar: s.now + 48 * SIM.HOUR, hunger: 0.5, gor: 'stryker', sedd: s.now };
      (s.vargar ??= []).push(f);
      for (let i = 0; i < 40 && !f.jagare; i++) SIM.jaktBeslut(s, f, SIM.living(s));
      const k = f.jagare?.map(i => SIM.byId(s, i)!).find(q => q.task?.why === 'Kallar till vargjakt');
      if (!k) continue;
      const r = forsta(s, 'varg', k.id, 4, () => !f.jagare && !SIM.kartStrider(s).length && f.gor === 'flyr');
      if (r) varg.push(r); else vargUtan.push(`${f.gor}/${s.stat?.vargjaktFlydde ?? 0}/${s.stat?.vargstrid ?? 0}`);
    }
    // björnen: som i scenariot bjornjakt, sex vuxna med spjut och en björn som just setts
    const bjorn: { n: number; ensam: boolean }[] = [];
    const s0 = SIM.createState(6, START);
    let t0: number | undefined;
    for (let t = s0.now; t < s0.now + 60 * SIM.DAY && t0 === undefined; t += 20 * SIM.MIN) { const b = SIM.bjornarOf(s0, t); if (b.length === 1 && SIM.isLight(t) && SIM.isLight(t + 4 * SIM.HOUR)) t0 = t; }
    const json = JSON.stringify(s0);
    for (let f = 0; f < 10 && t0 !== undefined; f++) {
      const s = SIM.migrate(JSON.parse(json)); s.now = t0 + f * 7 * SIM.MIN;
      for (let r = 0; r < f * 13; r++) SIM.rnd(s, 'bjorn');
      for (const [x, a] of [['m', 30], ['k', 28], ['m', 35], ['k', 24], ['m', 40], ['k', 33]] as const) nyInvanare(s, x, a);
      setMat(s, { vilt: 30, bar: 30 });
      const vuxna = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= 18 && SIM.ageOf(q, s.now) < 50);
      for (const q of vuxna) { SIM.addTool(s, 'flintspjut', q).hos = q.id; SIM.addTool(s, 'kniv', q).hos = q.id; q.pot.mod = 18; q.pot.styrka = 16; }
      s.bjornJakt = { ar: SIM.yearNo(s, s.now), sedd: s.now, sag: vuxna[0]!.id };
      for (let i = 0; i < 30 && !s.bjornJakt?.jagare; i++) { s.bjornJakt!.timme = undefined; SIM.bjornSteg(s); }
      const kallar = s.bjornJakt?.kallare;
      if (kallar === undefined) continue;
      const r = forsta(s, 'bjorn', kallar, 5, () => (s.stat?.bjornjaktGick ?? 0) > 0);
      if (r) bjorn.push(r); else bjornUtan.push(`${s.stat?.bjornjaktGick ?? 0}/${s.stat?.bjornstrid ?? 0}`);
    }
    const ensamV = varg.filter(r => r.ensam).length, ensamB = bjorn.filter(r => r.ensam).length;
    const snitt = (l: { n: number }[]) => l.length ? SIM.kortTal(l.reduce((a, r) => a + r.n, 0) / l.length) : '–';
    return [
      [`vargjakter med strid: ${varg.length}, den som kallade var ensam i ${ensamV} (i snitt ${snitt(varg)} jägare i striden; utan strid ${vargUtan.join(' ')})`, varg.length >= 5 && ensamV * 10 <= varg.length],
      [`björnjakter med strid: ${bjorn.length}, den som kallade var ensam i ${ensamB} (i snitt ${snitt(bjorn)} jägare i striden; utan strid ${bjornUtan.join(' ')})`, bjorn.length >= 3 && ensamB * 10 <= bjorn.length],
    ];
  },
};
