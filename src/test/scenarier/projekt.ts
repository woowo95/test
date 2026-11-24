// Scenarier. Byns projekt (steg 2.2.7): byn väljer vad den bygger och gör efter vad den saknar.
import { createState, living, ageOf, ALDER, chooseTask, dangers, GORS, STATION_LIST, PROJEKT, PROJEKT_LIST, projekt, bastaProjekt, projektVarde, addTool, setAmount, State } from '../../sim';
import * as SIM from '../../sim';
import { START, STEG_TIM } from '../kor';
import { setItems, setFood, SCENARIER, medBank, kor, byggKlart } from './hjalp';
import { setByn } from '../../ui/lage';
import { pabudKort } from '../../ui/flikar/styre';

// en by där alla vuxna kan allt, med material till allt och elden tänd mitt på dagen
function by(seed: number) {
  const s = createState(seed, START);
  s.now = new Date(s.now).setHours(10, 0, 0, 0); Object.assign(s.fire, { lit: true, fuel: 3, ring: true });
  for (const q of s.people) q.tek = { ...q.tek, kniv: 1, korg: 1, rep: 1, yxa: 1, fiskespjut: 1 };
  setItems(s, { flinta: 30, torrgras: 30, grenar: 30, sten: 30 }); setAmount(s, 'ved', 300);
  for (const k of SIM.FROSORTER) setAmount(s, k, 50); // stenarna, flintan och fröna i förrådet (steg 13.8.6): annars tar raderna leta och fron platsen före projekten
  return s;
}
const vuxna = (s: State) => living(s).filter(q => ageOf(q, s.now) >= ALDER.vuxen);
// de vuxna väljer på dagen n gånger, utan egna behov; räknar hur ofta ett projekt blir valt som arbete (inte på fritiden)
function valjer(s: State, n: number) {
  const acts = new Set([...Object.keys(GORS), 'station', 'tvinna', 'lera']); // (leran till krukorna, steg 10.2.12)
  let proj = 0;
  for (let i = 0; i < n; i++) {
    const p = vuxna(s)[i % vuxna(s).length];
    Object.assign(p, { toa: 1, torst: 1, warm: 1, rest: 1, health: 1, hunger: 1, social: 1, task: undefined });
    chooseTask(s, p); if (p.task && acts.has(p.task.act) && p.task.why?.startsWith('Byn saknar')) proj++;
  }
  for (const q of vuxna(s)) q.task = undefined; // valen står kvar under varven, så att raderna får sina arbetare (steg 13.8.6)
  return proj;
}

SCENARIER.projekt = {
  text: 'Allt byn kan bygga eller göra av handarbete står i ett register med vad det väger och vad det kostar. Det byn saknar mest per arbete och material görs först, och tävlar med arbetet när ingen fara går före',
  kor: () => {
    const allt = Object.keys(GORS).every(g => PROJEKT[g]) && STATION_LIST.every(k => PROJEKT[k]) && !!PROJEKT.rep;
    const s = by(4), lista = projekt(s);
    const sorterad = lista.every((r, i) => i === 0 || lista[i - 1].varde >= r.varde);
    const p = vuxna(s)[0], b = bastaProjekt(s, p, dangers(s));
    const forsta = lista.find(r => PROJEKT[r.k].kan(s, p, dangers(s)));
    // har byn knivar nog saknar den inga
    const knivFore = projektVarde(s, 'kniv');
    for (let i = 0; i < 4; i++) addTool(s, 'kniv', p);
    const knivEfter = projektVarde(s, 'kniv'), ejListad = !projekt(s).some(r => r.k === 'kniv');
    // har byn slaktbänken saknar den ingen
    medBank(s, 'slaktbank');
    const bank = projektVarde(s, 'slaktbank') === 0;
    // på dagen tävlar projekten med arbetet när maten räcker, men inte när byn svälter eller fryser
    const m = by(5); setFood(m, 0); setAmount(m, 'torrkott', 300); for (const q of living(m)) SIM.gain(m, q, 'bar', 120); // byn och familjerna har mat (steg 6.2.20: var och en har sin buffert). Torkat kött: bufferten är drygt sju dygn och taket sexton (9.9.4), och bär ruttnar långt innan dess
    const mett = valjer(m, 200);
    const h = by(5); setFood(h, 0.1);
    const svalt = valjer(h, 200);
    const k = by(5); setFood(k, 200); Object.assign(k.fire, { lit: false, fuel: 0, emberUntil: undefined });
    for (const q of k.people) q.warm = 0.1; // alla fryser och elden är släckt: kylan är en fara
    const kyla = dangers(k).kyla, iKyla = bastaProjekt(k, vuxna(k)[0], dangers(k));
    const bara = !iKyla || iKyla.u?.act === 'tvinna' || iKyla.u?.act === 'lera'; // (repet och leran är inga redskap eller stationer)
    return [
      ['varje redskap, varje station och repet är ett projekt', allt],
      [`listan har det mest värda först (${lista.map(r => r.d.namn).join(', ')})`, lista.length >= 3 && sorterad],
      // eller ett mer värt projekt hen inte kan göra än, genom det som fattas till det (steg 6.2.19)
      [`den som har tid gör det mest värda hen kan (${b?.k ?? 'inget'}${b && b.k !== forsta?.k ? `, genom ${b.u?.act ?? b.sak}` : ''})`, !!b && (b.k === forsta?.k || !PROJEKT[b.k].kan(s, p, dangers(s)) && (!!b.u || !!b.sak))],
      [`när byn har knivar nog saknar den ingen (${knivFore.toFixed(2)} → ${knivEfter.toFixed(2)})`, knivFore > 0 && knivEfter === 0 && ejListad],
      ['när byn har en slaktbänk står den inte längre bland projekten', bank],
      [`på dagen görs projekt när maten räcker (${mett} av 200), inte när byn svälter (${svalt})`, mett > 0 && svalt === 0],
      [`när kylan är en fara görs inga redskap eller stationer (${iKyla?.k ?? 'inget'})`, kyla && bara],
    ];
  },
};

SCENARIER.jaget = {
  text: 'Jaget och familjen i projekten (steg 6.1.16, "Arbetsstationer och möbler" i designdokumentet): varje projekt räknar både vad byn saknar och vad personen själv och familjen saknar. Personens värde = byns värde × omtanken om byn + det egna (steg 10.5.2), och omtanken stiger med empatin och seden Sammanhållning och sjunker med Självförsörjning',
  kor: () => {
    const { personVarde, omtankeMed, familjOf, OMTANKE } = SIM;
    const s = by(4), p = vuxna(s)[0], fam = familjOf(s, p.id);
    // ingen i familjen har en kniv: det egna läggs till byns värde
    const by0 = projektVarde(s, 'kniv'), mitt = personVarde(s, 'kniv', fam, 1);
    // en annan familj äger knivar nog för byn: byn saknar ingen, men p:s familj saknar en
    const annan = vuxna(s).find(q => !fam.includes(q))!;
    for (let i = 0; i < 6; i++) addTool(s, 'kniv', annan);
    const byEfter = projektVarde(s, 'kniv'), egenEfter = personVarde(s, 'kniv', fam, 1);
    // när p äger en kniv saknar familjen ingen
    addTool(s, 'kniv', p);
    const harEgen = personVarde(s, 'kniv', fam, 1);
    // omtanken: empatin och seden
    const e = { ...p.pot }, sed = s.seder.v.gemenskap;
    p.pot.empati = 18; s.seder.v.gemenskap = 1; const sam = omtankeMed(s, p, 0);
    p.pot.empati = 3; s.seder.v.gemenskap = -1; const sjalv = omtankeMed(s, p, 0);
    p.pot = e; s.seder.v.gemenskap = sed;
    return [
      [`det egna läggs till byns värde (${by0.toFixed(2)} → ${mitt.toFixed(2)})`, mitt > by0],
      [`när byn har knivar nog men inte familjen är kniven ändå värd något för p (${byEfter.toFixed(2)}, ${egenEfter.toFixed(2)})`, byEfter === 0 && egenEfter > 0],
      [`när p äger en kniv saknar familjen ingen (${harEgen.toFixed(2)})`, harEgen === 0],
      [`omtanken om byn är hög med hög empati i en sammanhållen by (${sam.toFixed(2)}, högst ${OMTANKE.max}) och låg med låg empati och självförsörjning (${sjalv.toFixed(2)})`, sam > 1.4 && sam <= OMTANKE.max && sjalv < 0.6],
    ];
  },
};
SCENARIER.material = {
  text: 'Material som saknas (steg 6.1.17, "Arbetsordningen" i designdokumentet): projekten ligger på nivån Förbättra, och fattas ett material som går att hämta (skaffa.act i SAKER, hamtas i projekt.ts) blir hämtningen arbetet i stället för att projektet hoppas över, och det som saknas ärver nivån (steg 6.2.19)',
  kor: () => {
    const s = by(4), p = vuxna(s)[0], f = dangers(s);
    const med = bastaProjekt(s, p, f);
    setItems(s, { flinta: 0, torrgras: 0, grenar: 0 }); setAmount(s, 'ved', 0); setAmount(s, 'lera', 50); // (leran till krukorna finns: den grävs utan material, steg 10.2.12)
    const utan = bastaProjekt(s, p, f), yxa = SIM.fattas(s, p, 'yxa', f);
    const ho = (hamtar?: string) => { const t = by(4), q = vuxna(t)[0]; setItems(t, { torrgras: Math.ceil(SIM.materialBuffert(t, 'torrgras')) + 1, grenar: 50 }); q.task = { act: 'samla', phase: 'do', tx: q.x, ty: q.y, until: t.now + SIM.HOUR, carry: 0, why: "test", dark: false, hamtar }; return SIM.forageItems(t, q, 3600)?.torrgras ?? 0; };
    // höet ligger över bufferten men under taket (steg 6.2.14): över taket plockar ingen
    const hoFatt = ho('torrgras'), hoUtan = ho();
    return [
      [`med material finns ett projekt att göra (${med?.k}, uppgift ${med?.u?.act})`, !!med?.u],
      [`utan material blir det mest värda projektet en hämtning (${utan?.k} saknar ${utan?.sak}, arbetet ${utan?.sak ? SIM.hamtas(utan.sak)?.act : '-'})`, !!utan?.sak && !!SIM.hamtas(utan.sak) && !utan.u],
      [`yxan saknar flinta (${yxa})`, yxa === 'flinta'],
      // den som hämtar hö får hö också när förrådet har tändmaterial nog (annars plockade hen bär utan slut, knapphet efter 6.1.17)
      [`den som hämtar hö får hö fast förrådet har tändmaterial (${hoFatt.toFixed(2)} hö, ${hoUtan.toFixed(2)} för den som samlar mat)`, hoFatt > 0 && hoUtan === 0],
    ];
  },
};
SCENARIER.forbattra = {
  text: 'Förbättra är aldrig tom (steg 6.1.18): när maten och veden räcker och inget projekt finns prövar man sig fram mot en teknik, arbetar där en öppen teknik kan komma eller går i lära',
  lang: true,
  kor: () => {
    const s = createState(4, START);
    let sett = 0;
    kor(s, 12 * 24, v => { for (const p of living(v)) if (p.task?.why?.startsWith('Byn har det den behöver')) sett++; });
    const n = s.stat?.forbattra ?? 0;
    return [[`på 12 dygn (12 år i spelet) valdes Förbättra ${n} gånger (${sett} steg med skälet "Byn har det den behöver")`, n > 0 && sett > 0]];
  },
};
SCENARIER.arbetspabud = {
  text: 'Påbuden i arbetsordningen (steg 6.1.19): Bygg före allt låter bygget gå före Försörjningen med chansen påbudet, och Samla för vintern ger maten och veden fler arbetare',
  kor: () => {
    const s = by(4), l = vuxna(s)[0];
    setFood(s, 1); setAmount(s, 'ved', 1);
    s.styre = { historia: [], oppna: [], ledare: l.id, sedan: s.now, pabud: { bygg: -1, vinter: -1 } };
    SIM.arbetsTimme(s); const utan = { ...s.arbBehov!.arb }, byggUtan = SIM.pabud(s, 'bygg');
    s.styre.pabud = { bygg: 1, vinter: 1, matlager: 1, vedlager: 1 };
    SIM.arbetsTimme(s); const med = { ...s.arbBehov!.arb }, byggMed = SIM.pabud(s, 'bygg');
    // i ord i Styre (steg 9.2.123): hur ofta och hur många fler, inte procent; ledaren vill under det lägsta värdet: ingen pil
    setByn(s); const html = pabudKort();
    s.styre.pabud = { bygg: -1, vinter: -1 }; const lag = pabudKort();
    const ord = /<b>(alltid|ofta|ibland)<\/b>/.test(html) && /<b>(många fler|några fler)<\/b>/.test(html);
    return [
      [`påbuden står i ord i Styre (${html.match(/<b>[^<]*<\/b>/g)?.join(' ').replace(/<\/?b>/g, '') ?? '–'})`, ord],
      [`förrådsmålen står i år ("mat för N år", steg 11.1.65)`, /<b>mat för [\d,]+ år<\/b>/.test(html) && /<b>ved för [\d,]+ år<\/b>/.test(html)],
      ['ledaren vill under det lägsta värdet: ingen pil', !/[▲▼]/.test(lag.replace(/title="[^"]*"/g, ''))],
      [`Samla för vintern ger fler händer (mat ${utan.mat} → ${med.mat}, ved ${utan.ved} → ${med.ved})`, med.mat > utan.mat && med.ved >= utan.ved],
      [`Bygg före allt gäller bara när ledaren vill (${byggUtan.toFixed(2)} → ${byggMed.toFixed(2)})`, byggUtan <= 0 && byggMed > 0],
    ];
  },
};
SCENARIER.fullaforrad = {
  text: 'Förråden till taket (steg 6.2.15, mjukt tak i steg 10.2.4): på Förbättra fylls förråden mellan bufferten och taket i FORRADSMAL, och över taket allt mer sällan; en by med fulla förråd arbetar vidare mot nästa teknik. I en by som kan alla tekniker och inte saknar något projekt (projektens brist sätts till noll under provet, och vedens buffert halveras och taket sänks till bufferten, så att det ryms i lagret, alla har en sovplats under tak och byn delar all mat) fyller ingen på maten eller veden under en arbetsdag (8 timmar) när förråden nått taken, ingen samlar grenar eller hö över taket, och de vuxna får fritid. I samma by vars förråd bara når bufferten fylls de',
  lang: true,
  kor: () => {
    const brist = PROJEKT_LIST.map(k => PROJEKT[k].brist), egen = PROJEKT_LIST.map(k => PROJEKT[k].egen), ved = SIM.FORRADSMAL.ved as { matt: number; dygn: number }, vedMatt = ved.matt, vedDygn = ved.dygn;
    // inget projekt saknas, varken för byn eller för någon själv (det egna: en egen kista, egna kläder, som sedan steg 12.1.20 går att göra av läder)
    for (const k of PROJEKT_LIST) { PROJEKT[k].brist = () => 0; PROJEKT[k].egen = undefined; }
    ved.matt = 1; ved.dygn = vedDygn / 2;
    try {
      const fyll = (full: boolean) => {
        const s = by(4);
        for (const q of s.people) for (const t of SIM.TEKNIK) q.tek = { ...q.tek, [t.id]: 1 };
        s.delning = { andel: 1 }; // byn delar all mat, så att ingen familj fyller sin egen buffert (bufferten per jag, steg 6.2.20)
        // alla har en sovplats under tak från början och inget nytt hus planeras, så att bygget (nivå 7) inte tar tiden som provet gäller
        for (let i = 0; i < 6; i++) { s.byggSok = undefined; SIM.planBuild(s); if (!byggKlart(s)) break; }
        s.byggSok = Number.MAX_SAFE_INTEGER;
        SIM.arbetsTimme(s);
        const mat = full ? 1.5 * SIM.lyxtak(s, 'mat') : 1.1 * SIM.buffert(s, 'mat'), vd = full ? 1.3 * SIM.lyxtak(s, 'ved') : 0.8 * SIM.buffert(s, 'ved');
        setFood(s, 100); for (let i = 0; i < 40 && SIM.foodDaysAll(s) < mat; i++) setFood(s, SIM.foodOf(s) * 1.1);
        if (!full) for (let i = 0; i < 40 && SIM.foodDays(s) > mat; i++) setFood(s, SIM.foodOf(s) * 0.9);
        SIM.setAmount(s, 'ved', Math.ceil(vd * SIM.hearthOf(s.fire).burn * 24));
        SIM.arbetsTimme(s);
        if (full) setItems(s, { flinta: 6, torrgras: Math.ceil(SIM.materialTak(s, 'torrgras')) + 5, grenar: Math.ceil(SIM.materialTak(s, 'grenar')) + 5 });
        return s;
      };
      const full = fyll(true), halv = fyll(false);
      const vuxen = (q: SIM.Person, v: State) => ageOf(q, v.now) >= ALDER.vuxen;
      // det som fyller förråden mellan bufferten och taket (raden fylla). Den egna maten (bufferten per jag, steg 6.2.20), redskapen och
      // sängarna är andra rader; sängarna och repet drar hö och grenar, och taket för dem följer förbrukningen (steg 6.2.14)
      // förrådet som det var när slaget började: valet görs mitt i slaget, och andras bördor kan läggas in efter det i samma slag
      const prov = (s: State) => { const r = { matVed: 0, mer: 0, overTak: 0, alla: 0 }; const sett = new WeakSet<object>(), fore = { grenar: SIM.amountOf(s, 'grenar'), torrgras: SIM.amountOf(s, 'torrgras') }; kor(s, 8, v => { for (const q of living(v)) if (vuxen(q, v) && q.task && !sett.has(q.task)) {
        sett.add(q.task); r.alla++; const why = q.task.why ?? '';
        if (/^Mer (mat|ved) /.test(why)) r.matVed++;
        if (why.startsWith('Mer ')) r.mer++;
        const k = /^Mer (grenar|hö) /.exec(why)?.[1];
        const m = k === 'hö' ? 'torrgras' : 'grenar';
        if (k && fore[m] > SIM.materialTak(v, m) + 1e-9) r.overTak++; // över taket redan när slaget började
      } fore.grenar = SIM.amountOf(v, 'grenar'); fore.torrgras = SIM.amountOf(v, 'torrgras'); }); return r; };
      // en by med fulla förråd arbetar vidare mot nästa teknik (steg 10.2.4): en teknik som kommer i arbetet glöms, och de vuxna arbetar där den kan komma
      const tek = fyll(true), en = living(tek).find(q => vuxen(q, tek))!;
      const oppen = SIM.TEKNIK.find(x => { const sp = { ...en.tek }; for (const q of tek.people) if (q.tek) delete q.tek[x.id]; const ok = !!SIM.tekArbete(tek, en, a => SIM.WORK.includes(a)); if (!ok) for (const q of tek.people) q.tek = { ...(q.tek ?? {}), [x.id]: sp[x.id] ?? 1 }; return ok; });
      let tekUpp = 0; { const sett = new WeakSet<object>(); kor(tek, 8, v => { for (const q of living(v)) if (vuxen(q, v) && q.task && !sett.has(q.task)) { sett.add(q.task); if (/Kanske kommer/.test(q.task.why ?? '') || q.task.act === 'forsok') tekUpp++; } }); }
      // grenarna och höet mot taket (steg 13.8.4): samma mjuka kurva som maten och veden, så över taket väljs turen allt mer
      // sällan men slutar inte tvärt. Poängen för raden fylla_grenar vid bufferten, taket och dubbla taket, medel av 200 dragningar av bruset
      const tak = fyll(true), tq = living(tak).find(q => vuxen(q, tak))!;
      const fyllPoang = (n: number) => { setItems(tak, { grenar: Math.ceil(n) }); let sum = 0; for (let i = 0; i < 200; i++) sum += SIM.forbattraKandidater(tak, tq).find(x => x.id === 'fylla_grenar')?.sc ?? 0; return sum / 200; };
      const bG = SIM.materialBuffert(tak, 'grenar'), tG = Math.max(bG + 1, SIM.materialTak(tak, 'grenar')), kurva = [fyllPoang(bG), fyllPoang(tG), fyllPoang(2 * tG)];
      const pf = prov(full), ph = prov(halv);
      const fri = (v: State) => v.stat?.fullaForrad ?? 0;
      return [
        // det mjuka taket (steg 10.2.4): över taket fyller man sällan på, men det tar inte slut tvärt
        [`i den fulla byn fyller man sällan på maten eller veden (${pf.matVed} uppgifter av ${pf.alla}), i byn vid bufferten fylls förråden (${ph.mer})`, pf.matVed <= pf.alla * 0.15 && ph.mer > 0],
        [`en by med fulla förråd arbetar vidare mot nästa teknik (${oppen?.namn ?? 'ingen öppen teknik'}: ${tekUpp} uppgifter i arbetet där den kan komma)`, !!oppen && tekUpp > 0],
        [`grenarna fylls allt mer sällan över taket men inte aldrig (poängen ${kurva.map(x => x.toFixed(3)).join(' → ')} vid bufferten, taket och dubbla taket; ${pf.overTak + ph.overTak} turer över taket)`, kurva[0] > kurva[1] && kurva[1] > kurva[2] && kurva[2] > 0],
        // också byn vid bufferten når taken under dagen när den fyllt på, så antalen jämförs inte (steg 6.2.21)
        [`de vuxna i den fulla byn får fritid när inget finns kvar att göra (${fri(full)} gånger; ${fri(halv)} i byn vid bufferten när den fyllt på)`, fri(full) > 0],
      ];
    } finally {
      PROJEKT_LIST.forEach((k, i) => { PROJEKT[k].brist = brist[i]; PROJEKT[k].egen = egen[i]; });
      ved.matt = vedMatt; ved.dygn = vedDygn;
    }
  },
};

SCENARIER.omtanke = {
  text: 'Steg 10.5.2: omtanken. Det egna och familjens väger alltid 1, och byns arbete väger byns brist gånger omtanken om byn: 1 för en vanlig person, högre med empati, seden Sammanhållning och goda relationer i byn, lägre med Självförsörjning och osämja. Mot en bestämd person räknas samma tal med relationen till just hen, så att man hellre bygger på en väns hus än på en oväns',
  kor: () => {
    const s = by(4), p = vuxna(s)[0], fam = SIM.familjOf(s, p.id), andra = SIM.living(s).filter(q => q !== p);
    // en vanlig person med neutrala relationer i en by utan sed
    s.seder.v.gemenskap = 0; p.pot.empati = SIM.SED.mitt; for (const q of andra) { const r = s.rels[SIM.relKey(p.id, q.id)]; if (r) r.op = 0; }
    SIM.omtankeTimme(s); const vanlig = SIM.omtanke(s, p);
    // osams med byn: det egna går före byns. Byn saknar inga knivar men p:s familj saknar en
    const annan = vuxna(s).find(q => !fam.includes(q))!;
    for (let i = 0; i < 6; i++) addTool(s, 'kniv', annan);
    const f = dangers(s), vanligVal = bastaProjekt(s, p, f);
    for (const q of andra) if (!fam.includes(q)) SIM.getRel(s, p, q).op = -100;
    SIM.omtankeTimme(s); const osams = SIM.omtanke(s, p);
    const e0 = p.pot.empati; p.pot.empati = 3; s.seder.v.gemenskap = -1; SIM.omtankeTimme(s); const osamsSjalv = SIM.omtanke(s, p), osamsVal = bastaProjekt(s, p, f); p.pot.empati = e0; s.seder.v.gemenskap = 0;
    // en vän och en ovän: omtanken om var och en
    const [van, ovan] = andra.filter(q => !fam.includes(q));
    SIM.getRel(s, p, van).op = 80; SIM.getRel(s, p, ovan).op = -80;
    const omVan = SIM.omtankeOm(s, p, van.id), omOvan = SIM.omtankeOm(s, p, ovan.id), omFam = SIM.omtankeOm(s, p, p.id);
    // två hus på samma avstånd: p bygger på vännens
    const b = SIM.createState(4, START); b.now = new Date(b.now).setHours(10, 0, 0, 0);
    for (const q of b.people) q.tek = { ...q.tek, yxa: 1, timmervagg: 1, timmer: 1 };
    b.byggSok = undefined; SIM.planBuild(b); const h1 = SIM.housesOf(b).find(h => !h.klar);
    let h2: SIM.Hus | undefined;
    if (h1) { const kopia = SIM.bitsOf(b).filter(x => x.hus === h1.id); h2 = { ...h1, id: h1.id + 1000, namn: 'Kopian' }; SIM.housesOf(b).push(h2); for (const x of kopia) SIM.bitsOf(b).push({ ...x, id: x.id + 100000, hus: h2.id }); }
    const bp = vuxna(b)[0], bf = SIM.familjOf(b, bp.id), [bv, bo] = SIM.living(b).filter(q => q !== bp && !bf.includes(q) && SIM.ageOf(q, b.now) >= 18);
    if (h1 && h2) { h1.ag = bo.id; h2.ag = bv.id; SIM.getRel(b, bp, bv).op = 80; SIM.getRel(b, bp, bo).op = -80; }
    const jobb = SIM.buildJob(b, bp), paVan = !!jobb && jobb.bit.hus === h2?.id;
    // byns ved: samma by med Sammanhållning och med Självförsörjning, ett dygn
    const ved = (g: number) => { const v = SIM.cloneState(s); for (const q of SIM.living(v)) for (const r of SIM.living(v)) if (q !== r) { const x = v.rels[SIM.relKey(q.id, r.id)]; if (x) x.op = 0; } setAmount(v, 'ved', 2); let n = 0; kor(v, 24, w => { w.seder.v.gemenskap = g; setAmount(w, 'ved', 2); for (const q of SIM.living(w)) if (q.task?.act === 'ved' && q.task.why?.startsWith('Byn behöver ved')) n++; }); return n / STEG_TIM; }; // bara veden för byn, och bristen står kvar hela dygnet: ett försök att komma på något hugger också ved och fyller annars förrådet
    const vedSam = ved(1), vedSjalv = ved(-1);
    return [
      [`en vanlig person med neutrala relationer i en by utan sed har omtanken 1 (${vanlig.toFixed(2)})`, Math.abs(vanlig - 1) < 1e-9],
      [`osämja sänker omtanken (${osams.toFixed(2)}), och den som är osams med en självförsörjande by och har låg empati (${osamsSjalv.toFixed(2)}) gör det familjen saknar först (${osamsVal?.k}, annars ${vanligVal?.k})`, osams < 1 && osamsSjalv < osams && !!osamsVal && (PROJEKT[osamsVal.k].egen?.(s, fam, p) ?? 0) > 0 && osamsVal.k !== vanligVal?.k],
      [`omtanken om en vän är större än om en ovän, och familjen väger 1 (${omVan.toFixed(2)}, ${omOvan.toFixed(2)}, ${omFam})`, omVan > omOvan && omFam === 1],
      [`två hus på samma avstånd: man bygger på vännens (${jobb ? SIM.housesOf(b).find(h => h.id === jobb.bit.hus)?.namn : 'inget'})`, paVan],
      [`en by med Sammanhållning lägger fler timmar på byns ved än med Självförsörjning (${vedSam.toFixed(1)} mot ${vedSjalv.toFixed(1)} timmar)`, vedSam > vedSjalv],
    ];
  },
};
