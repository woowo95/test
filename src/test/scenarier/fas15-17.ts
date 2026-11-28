// Scenarier för fas 15, grupp 17 (steg 15.1.161–15.1.170).
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, klockan } from './hjalp';
import { foretagBy } from './fas14';

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
