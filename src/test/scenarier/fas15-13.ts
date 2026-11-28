// Scenarier för fas 15, grupp 13 (steg 15.1.121–15.1.128).
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, klockan, nyInvanare } from './hjalp';

// en by med tio vuxna vars läggning i seden k står långt ut åt hållet rikt, och byns sed i taget
function taketsBy(seed: number, k: SIM.Sed, rikt: number, pot: Partial<SIM.Person['pot']>) {
  const s = SIM.createState(seed, START); klockan(s, 12);
  while (SIM.living(s).length < 10) nyInvanare(s, SIM.living(s).length % 2 ? 'm' : 'k', 30);
  for (const p of SIM.living(s)) { Object.assign(p.pot, pot); p.sedArv = { [k]: rikt }; }
  s.seder.v[k] = rikt; s.seder.at = s.now;
  return s;
}
const vuxenUpp = (s: SIM.State, p: SIM.Person, k: SIM.UpplevelseTyp) => { (p.upp ??= []).push({ k, a: Math.floor(SIM.ageOf(p, s.now)), e: {}, v: 1, t: s.now }); };
const lev = (s: SIM.State, dygn: number) => { for (let i = 0; i < dygn * 4; i++) { s.now += SIM.DAY / 4; SIM.stepSeder(s); } };

SCENARIER.sedrorelse = {
  text: 'Steg 15.1.121: läggningen har en gräns per person, och det man varit med om ligger utanför den. En by vars sed Självförsörjning står i taget flyttar sig mot Sammanhållning när flera i byn ser någon frysa ihjäl medan andra har ved, och en by utan följderna står kvar',
  kor: () => {
    const k: SIM.Sed = 'gemenskap', pot = { empati: 1 };
    const utan = taketsBy(21, k, -1, pot), med = taketsBy(21, k, -1, pot);
    const p0 = SIM.living(med)[0]!, lagg = SIM.drarSed(med, p0, k);
    for (const p of SIM.living(med)) vuxenUpp(med, p, 'frosIhjal');
    const efterUpp = SIM.drarSed(med, p0, k), mal = SIM.sederTarget(med)[k], malUtan = SIM.sederTarget(utan)[k];
    lev(utan, 6); lev(med, 6);
    return [
      [`seden ${k} är öppen`, SIM.sedOppen(med, k)],
      [`läggningen stannar vid gränsen (${lagg.toFixed(2)}) fast personligheten och byns sed drar längre`, lagg === -1],
      [`upplevelsen ligger utanför gränsen (${efterUpp.toFixed(2)})`, efterUpp > -1 + 0.15],
      [`byns mål flyttar sig från taket med följderna (${mal.toFixed(2)}) men inte utan (${malUtan.toFixed(2)})`, mal > -0.95 && malUtan === -1],
      [`efter sex dygn har seden rört sig mot Sammanhållning (${med.seder.v[k].toFixed(2)}), och utan följderna står den kvar (${utan.seder.v[k].toFixed(2)})`, med.seder.v[k] > -0.95 && utan.seder.v[k] <= -0.99],
    ];
  },
};

// byns första vuxna leder byn, och seden k är öppen
const oppna = (s: SIM.State, k: SIM.Sed) => { const l = SIM.living(s)[0]!; s.styre = { historia: [{ id: l.id, namn: l.name, titel: 'Ålderman', fran: s.now }], oppna: [k], ledare: l.id, sedan: s.now, titel: 'Ålderman', satt: 1 } as never; };

SCENARIER.foljder2 = {
  text: 'Steg 15.1.123: följderna minns. Var och en minns varje följd, en gång per händelse och inte en gång per livsdel. En krigisk by som mister tre i strid i rad drar seden Krig tydligt mot Fred, och efter 15 dygn (15 år i spelet) har följden bleknat',
  kor: () => {
    const k: SIM.Sed = 'krig', pot = { aggression: 20, mod: 20, empati: 1 };
    const s = taketsBy(23, k, 1, pot); oppna(s, k);
    while (SIM.living(s).length < 14) nyInvanare(s, SIM.living(s).length % 2 ? 'm' : 'k', 30);
    for (const p of SIM.living(s)) { Object.assign(p.pot, pot); p.sedArv = { [k]: 1 }; }
    const mal0 = SIM.sederTarget(s)[k], v0 = s.seder.v[k];
    for (let i = 0; i < 3; i++) SIM.die(s, SIM.living(s).at(-1)!, 'rovare');
    const kvar = SIM.living(s), f = (p: SIM.Person) => p.foljd?.v[k] ?? 0;
    const flera = kvar.filter(p => f(p) < -0.25).length, mal1 = SIM.sederTarget(s)[k], snitt = kvar.reduce((a, p) => a + SIM.drarSed(s, p, k), 0) / kvar.length;
    const fNu = () => kvar.reduce((a, p) => a + (p.foljd ? f(p) * Math.exp(-(s.now - p.foljd.t) / (SIM.SED.foljdDygn * SIM.DAY)) : 0), 0) / kvar.length;
    const f0 = fNu();
    lev(s, 6); const v6 = s.seder.v[k];
    lev(s, 9); const f15 = fNu(), mal15 = SIM.sederTarget(s)[k];
    // en död i strid utan ett stridslag (drap) är också en följd
    const s2 = taketsBy(24, k, 1, pot); oppna(s2, k); SIM.die(s2, SIM.living(s2).at(-1)!, 'drap');
    const drap = SIM.living(s2).filter(p => (p.foljd?.v[k] ?? 0) < 0).length;
    return [
      [`${flera} av ${kvar.length} minns mer än en av de tre (följden fastnar en gång per händelse)`, flera >= 2],
      [`byns mål för Krig flyttas tydligt (${mal0.toFixed(2)} → ${mal1.toFixed(2)}; läggningen och följderna i snitt ${snitt.toFixed(2)})`, mal1 < mal0 - 0.15],
      [`seden har rört sig mot Fred efter sex dygn (${v0.toFixed(2)} → ${v6.toFixed(2)})`, v6 < v0 - 0.05],
      [`efter 15 dygn har följden bleknat (${f0.toFixed(2)} → ${f15.toFixed(2)} i snitt), och målet går tillbaka mot det första (${mal1.toFixed(2)} → ${mal15.toFixed(2)})`, Math.abs(f15) < Math.abs(f0) * 0.45 && mal15 > mal1 + 0.1],
      [`den som dör av drap i en strid ger också följden stupade (${drap} minns)`, drap > 0],
    ];
  },
};

// en by med tio vuxna som alla tror på samma tro, med alla skalor på 50
function troBy(seed: number) {
  const s = SIM.createState(seed, START); klockan(s, 12);
  while (SIM.living(s).length < 10) nyInvanare(s, SIM.living(s).length % 2 ? 'm' : 'k', 30);
  const g = SIM.living(s)[0]!; SIM.grunda(s, g, 'blixt');
  const tr = SIM.troOf(s, g.tro!)!;
  for (const p of SIM.living(s)) { p.tro = tr.id; p.troStyrka = 80; }
  tr.sk = { prast: 50, livet: 50, forlat: 50, fest: 50, krig: 50, oppen: 50, sprid: 50 }; tr.natur = 50; tr.manga = 50;
  return { s, tr };
}
// timmar timmar i följd där tillst gäller för alla (eller bara de första n), med stepUppvaxt varje timme
const timmar = (s: SIM.State, n: number, tillst: (p: SIM.Person) => void) => { for (let i = 0; i < n; i++) { for (const p of SIM.living(s)) { tillst(p); p.health = 0.3; } s.now += SIM.HOUR; SIM.stepUppvaxt(s); } };

SCENARIER.troskala = {
  text: 'Steg 15.1.124: trons skalor flyttas per händelse. En svår vinter där de troende är nära att frysa ihjäl flyttar skalan Fest – Försakelse mot Försakelse, och en svältperiod flyttar den en gång när svälten börjar och inte varje timme. En händelse i hela byn flyttar skalan lika mycket i en liten by som i en stor',
  kor: () => {
    const fest = (tr: SIM.Tro) => SIM.skalaV(tr, 'fest')!;
    // vintern: alla fryser i tio timmar
    const a = troBy(31); timmar(a.s, 10, p => { p.warm = SIM.KROPP.frysdod - 0.05; p.hunger = 0.9; });
    const vinter = fest(a.tr) - 50, flyttVinter = a.s.stat?.skalaFlytt ?? 0;
    // svälten: 24 timmar och 48 timmar ger samma flytt
    const b = troBy(32); timmar(b.s, 24, p => { p.hunger = 0; p.warm = 0.9; }); const svalt24 = fest(b.tr) - 50;
    timmar(b.s, 24, p => { p.hunger = 0; p.warm = 0.9; }); const svalt48 = fest(b.tr) - 50;
    // svälten tar slut och börjar igen: då flyttas den en gång till
    timmar(b.s, 2, p => { p.hunger = 0.9; p.warm = 0.9; }); timmar(b.s, 3, p => { p.hunger = 0; p.warm = 0.9; }); const igen = fest(b.tr) - 50;
    // samma upplevelse hos alla i en by med tre troende och i en med tio: skalan flyttas lika mycket
    const liten = troBy(33), stor = troBy(33);
    for (const p of SIM.living(liten.s).slice(3)) p.tro = undefined;
    for (const x of [liten, stor]) for (const p of SIM.living(x.s)) if (p.tro !== undefined) SIM.troUpplev(x.s, p, 'svalt', 0.5);
    const dl = fest(liten.tr) - 50, ds = fest(stor.tr) - 50;
    return [
      [`vintern flyttade skalan mot Försakelse (${vinter.toFixed(2)} steg, ${flyttVinter} flyttar)`, vinter > 0 && flyttVinter > 0 && flyttVinter <= 10],
      [`svälten flyttade skalan (${svalt24.toFixed(2)} steg efter ett dygn) och inte mer ett dygn till (${svalt48.toFixed(2)})`, svalt24 > 0 && Math.abs(svalt48 - svalt24) < 1e-9],
      [`en ny svält flyttar den igen (${igen.toFixed(2)})`, igen > svalt48],
      [`samma händelse hos alla flyttar skalan lika mycket med tre troende (${dl.toFixed(2)}) som med tio (${ds.toFixed(2)})`, dl > 0 && Math.abs(dl - ds) < 1e-9],
    ];
  },
};

SCENARIER.tvivel = {
  text: 'Steg 15.1.125: tron kan svikta och lämnas. Den som offrat och strax efter får en motgång tvivlar, tvivlet bleknar efter några dygn, en bön som inte hjälper sänker tron mer ju mer man tvivlar, och den vars tro blir svagare än 10 lämnar den. Hen kan sedan nås av en tro som vem som helst',
  kor: () => {
    const { s, tr } = troBy(41), folk = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
    const [a, b, c] = folk as [SIM.Person, SIM.Person, SIM.Person];
    // a offrade i går, b för länge sedan; sedan kommer en motgång
    a.offrade = s.now - SIM.DAY; b.offrade = s.now - 5 * SIM.DAY;
    SIM.svikKrok.motgang(s);
    const ta = a.tvivel ?? 0, tb = b.tvivel ?? 0;
    // tvivlet bleknar på några dygn (år i spelet)
    SIM.tvivelTimme(s, 5 * 24); const ta5 = a.tvivel ?? 0;
    SIM.tvivelTimme(s, 25 * 24); const ta30 = a.tvivel ?? 0;
    // c ber för någon som sedan dör: bönen hjälpte inte, och tron sviktar
    const sjuk = folk[3]!; c.troStyrka = 20; c.tvivel = 2;
    c.bonVan = { t: s.now, o: 'nara', vem: sjuk.id };
    SIM.die(s, sjuk, 'sjukdom');
    const tc = c.tvivel ?? 0;
    SIM.kultTimme(s, 1);
    const styrka = c.troStyrka ?? 0, tc2 = c.tvivel ?? 0;
    SIM.tvivelTimme(s, 4);
    const lamnat = c.tro === undefined, stat = s.stat?.lamnade_tron ?? 0;
    return [
      [`den som offrade i går tvivlar efter motgången (${ta.toFixed(2)}), den som offrade för fem dygn sedan inte (${tb.toFixed(2)})`, ta >= 1 && tb === 0],
      [`tvivlet bleknar: ${ta.toFixed(2)} → ${ta5.toFixed(2)} efter fem dygn → ${ta30.toFixed(2)} efter 30`, ta5 < ta * 0.7 && ta30 < ta * 0.1],
      [`den som bett för den döda sörjer och tvivlar (2 → ${tc.toFixed(2)}), och bönen som inte hjälpte tvivlar hen mer (${tc2.toFixed(2)})`, tc >= 3 && tc2 >= tc + 1],
      [`bönen som inte hjälpte sänkte tron från 20 till ${styrka.toFixed(1)}`, styrka < 10],
      [`den vars tro blev svagare än 10 lämnade den (${lamnat ? 'utan tro' : 'tror'}, ${stat} lämnade)`, lamnat && stat >= 1 && tr.id !== undefined],
    ];
  },
};

SCENARIER.andearv = {
  text: 'Steg 15.1.126: andligheten förs vidare från byn. Ett barns andlighet är en del föräldrarnas snitt och resten byns andlighet, vägd med inflytandet bland de vuxna, och lite slump. Barnen till samma föräldrar blir andligare i en andlig by än i en världslig, och barnen skiljer sig från varandra',
  kor: () => {
    const barnI = (andlig: number) => {
      const s = SIM.createState(51, START);
      while (SIM.living(s).length < 12) nyInvanare(s, SIM.living(s).length % 2 ? 'm' : 'k', 30);
      const vuxna = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
      for (const p of vuxna) { p.andlig = andlig; p.upp = []; }
      const mor = vuxna.find(p => p.sex === 'k')!, far = vuxna.find(p => p.sex === 'm')!;
      mor.andlig = 50; far.andlig = 50;
      const by = SIM.byAndlighet(s);
      const barn = Array.from({ length: 40 }, (_, i) => SIM.andlighet(s, SIM.newPerson(s, i % 2 ? 'm' : 'k', s.now, mor, far)));
      return { by, snitt: barn.reduce((a, v) => a + v, 0) / barn.length, min: Math.min(...barn), max: Math.max(...barn) };
    };
    const a = barnI(90), v = barnI(10);
    return [
      [`byns andlighet följer de vuxna (${a.by.toFixed(0)} i den andliga byn, ${v.by.toFixed(0)} i den världsliga)`, a.by > 70 && v.by < 30],
      [`barnen blir andligare i den andliga byn (${a.snitt.toFixed(0)}) än i den världsliga (${v.snitt.toFixed(0)})`, a.snitt - v.snitt > 20],
      [`barnen skiljer sig från varandra (${a.min}–${a.max} i den andliga byn)`, a.max - a.min >= 15],
    ];
  },
};

SCENARIER.prastbrot = {
  text: 'Steg 15.1.127: prästen som bryter ett bud. De troende som ser trons präst bryta ett bud tvivlar och kan minnas det, skalan Präst flyttas mot Var och en, och brottet blir ett rykte: den troende som hör det tvivlar också. Ett bud som en vanlig troende bryter drabbar bara hen själv',
  kor: () => {
    const { s, tr } = troBy(61), folk = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
    const pr = folk[0]!, nara = folk.slice(1, 4), borta = folk[5]!;
    tr.prast = pr.id; tr.bud = [{ id: 'ingetRus', t: s.now }];
    for (const p of folk) { p.task = undefined; p.tvivel = undefined; }
    for (const q of nara) { q.x = pr.x + 1; q.y = pr.y; }
    borta.x = pr.x + 40; borta.y = pr.y + 40;
    // en vanlig troende bryter budet först
    SIM.budBrutet(s, nara[0]!, 'ingetRus');
    const vanlig = folk.filter(p => p !== nara[0] && (p.tvivel ?? 0) > 0).length;
    const prast0 = SIM.skalaV(tr, 'prast')!;
    SIM.budBrutet(s, pr, 'ingetRus');
    const sag = nara.filter(q => (q.tvivel ?? 0) >= 1).length, minns = nara.filter(q => q.upp?.some(u => u.k === 'prastBrot')).length, prast1 = SIM.skalaV(tr, 'prast')!;
    const bortaFore = borta.tvivel ?? 0;
    // den som såg det berättar för den som var borta
    const e = nara[1]!.intryck!.find(x => x.k === 'hycklare' && x.om === pr.id)!;
    SIM.beratta(s, nara[1]!, borta, e, SIM.getRel(s, nara[1]!, borta));
    const hort = borta.tvivel ?? 0;
    return [
      [`när en vanlig troende bryter budet tvivlar ingen annan (${vanlig})`, vanlig === 0],
      [`${sag} av ${nara.length} som såg prästen bryta budet tvivlar, och ${minns} minns det`, sag === nara.length],
      [`skalan Präst flyttas mot Var och en (${prast0.toFixed(2)} → ${prast1.toFixed(2)})`, prast1 < prast0],
      [`den som var långt borta såg inget (${bortaFore}), men tvivlar när hen hör om det (${hort})`, bortaFore === 0 && hort >= 1],
    ];
  },
};

// en by med tolv vuxna med samma läggning och en ledare som satt sedan i dag
function styrdBy(seed: number) {
  const s = SIM.createState(seed, START); klockan(s, 12);
  while (SIM.living(s).length < 12) nyInvanare(s, SIM.living(s).length % 2 ? 'm' : 'k', 30);
  const folk = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), l = folk[0]!;
  for (const p of folk) Object.assign(p.pot, { ...l.pot });
  s.styre = { historia: [{ id: l.id, namn: l.name, titel: 'Ålderman', fran: s.now }], oppna: [], ledare: l.id, sedan: s.now, titel: 'Ålderman', satt: 1, vintrar: 2, vunna: 0, forlorade: 0, folk0: SIM.living(s).length } as never;
  return { s, l, folk };
}

SCENARIER.maktslit = {
  text: 'Steg 15.1.128: makten nöts. En ledare som förlorar strider mot rövarna och sitter många vintrar tappar legitimitet, de missnöjda stöder hen mindre, och missnöjet över sederna är ett eget minne som växer långsamt, inte nollas när ledaren byts, och till sist ger en fraktion',
  kor: () => {
    const a = styrdBy(71), st = a.s.styre!;
    const ny = SIM.legitimitet(a.s);
    st.forlorade = 3; const forlust = SIM.legitimitet(a.s);
    st.forlorade = 0; st.vintrar = 14; const gammal = SIM.legitimitet(a.s);
    st.vintrar = 2; for (const p of a.folk.slice(1)) p.missnoje = 0.4; const missnojda = SIM.legitimitet(a.s);
    for (const p of a.folk) p.missnoje = undefined;
    // sederna står långt från vad alla drar åt: missnöjet över sederna växer i 60 dygn (60 år i spelet)
    const b = styrdBy(72), d = SIM.drar(b.s, b.folk[1]!);
    for (const k of SIM.SED_LIST) b.s.seder.v[k] = d[k] >= 0 ? -1 : 1;
    const agg = (n: number) => b.folk.slice(1).reduce((x, p) => x + (p.sedAgg ?? 0), 0) / n;
    let agg10 = 0, fore = 0;
    for (let i = 1; i <= 60 * 6 && !(b.s.stat?.fraktion); i++) {
      b.s.now += 4 * SIM.HOUR; SIM.missnojeTimme(b.s, 4);
      if (i === 60) { agg10 = agg(b.folk.length - 1); SIM.missnojeNoll(b.s); fore = agg(b.folk.length - 1); b.s.styre!.lugn = undefined; }
    }
    const dygn = (b.s.now - a.s.now) / SIM.DAY, frak = b.s.stat?.fraktion ?? 0;
    return [
      [`förlorade strider sänker framgången under noll och legitimiteten (${ny.v.toFixed(2)} → ${forlust.v.toFixed(2)}, framgången ${forlust.fram.toFixed(2)})`, forlust.fram < 0 && forlust.v < ny.v],
      [`efter 14 vintrar har makten nötts (vintrarnas del ${ny.vint.toFixed(2)} → ${gammal.vint.toFixed(2)})`, gammal.vint < ny.vint * 0.25 && gammal.v < ny.v],
      [`de missnöjda stöder ledaren mindre (stödet ${ny.stod.toFixed(2)} → ${missnojda.stod.toFixed(2)})`, missnojda.stod < ny.stod - 0.1],
      [`missnöjet över sederna står kvar när ledaren byts (${agg10.toFixed(2)} → ${fore.toFixed(2)} efter tio dygn)`, agg10 > 0.2 && Math.abs(fore - agg10) < 1e-9],
      [`till sist bildas en fraktion av det långa missnöjet över sederna (efter ${dygn.toFixed(0)} dygn)`, frak > 0],
    ];
  },
};
