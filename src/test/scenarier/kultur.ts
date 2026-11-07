// Scenarier. Kulturen (fas 4.3): sporten, framträdandena, konsten i sakerna och pyntet i hemmen.
import { createState, Person, State } from '../../sim';
import * as SIM from '../../sim';
import { START } from '../kor';
import * as O from '../../sim/ord';
import { TEKNIK } from '../../sim/teknik';
import { SCENARIER, klockan, kor, medBank, medHus, setFood, tandEld } from './hjalp';

// en by med ett stort överskott av mat och ved, på förmiddagen
export function rikDag(seed = 3, mer: Record<string, number> = {}): State {
  const s = createState(seed, START);
  klockan(s, 9);
  setFood(s, 400); SIM.setAmount(s, 'ved', 300);
  for (const [k, n] of Object.entries(mer)) SIM.setAmount(s, k, n);
  return s;
}

// q börjar en match eller går med i den som väntar, som om hen valt det på fritiden
export function spela(s: State, q: Person) {
  const sp = SIM.sportVal(s, q);
  if (sp) q.task = { act: 'sport', phase: 'go', tx: sp.spot.x, ty: sp.spot.y, until: s.now + sp.dur, carry: 0, ref: sp.ref, tool: sp.tool, dark: false, why: sp.why };
  return !!sp;
}
// q sitter och samtalar vid elden (har fritid), och är stark och smidig så att hen följer med när någon börjar en match
export const fritid = (s: State, q: Person) => { q.pot.styrka = q.pot.smidighet = 20; q.task = { act: 'samtal', phase: 'do', tx: q.x, ty: q.y, until: s.now + SIM.HOUR, carry: 0, dark: false }; };
const vuxna = (s: State) => SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen);

SCENARIER.sport = {
  text: 'Sporten (steg 4.3.1.1): när byn har ett överskott spelar de vuxna brottning och dragkamp på lekplatsen under fritiden. Det tränar närstrid och gör dem glada',
  kor: () => {
    const s = rikDag(3, { rep: 4 }), vill = vuxna(s).filter(q => SIM.sportVikt(s, q, 1) > 0).length;
    const f = rikDag(3, { rep: 4 }); setFood(f, 1);
    const vf = vuxna(f).filter(q => SIM.sportVikt(f, q, 1) > 0).length;
    // två samtalar när den tredje börjar en match, och följer med
    const g = rikDag(3, { rep: 4 }), med = vuxna(g).slice(0, 3), fore = med.map(q => q.skill.narstrid);
    fritid(g, med[1]!); fritid(g, med[2]!);
    spela(g, med[0]!);
    const sport0 = SIM.SPORT_AV[g.sport!.k]!.namn, foljer = med.filter(q => q.task?.act === 'sport').length;
    let sett = 0;
    kor(g, 2, () => { sett = Math.max(sett, med.filter(q => q.task?.act === 'sport' && q.task.phase === 'do').length); });
    const glad = med.filter(q => q.thoughts.some(t => t.text.startsWith('Spelade'))).length;
    const battre = med.filter((q, i) => q.skill.narstrid > fore[i]!).length;
    // när ingen har fritid följer ingen med, och det blir ingen match
    const e = rikDag(3, { rep: 4 }), ensam = !spela(e, vuxna(e)[0]!) && !e.sport;
    return [
      [`i en rik by vill ${vill} av ${vuxna(s).length} vuxna spela på fritiden`, vill === vuxna(s).length],
      ['när maten är knapp vill ingen spela', vf === 0],
      [`${foljer} går till ${sport0.toLowerCase()}en; ${(g.stat?.sportTim ?? 0).toFixed(1)} spelartimmar, högst ${sett} på planen samtidigt`, foljer === 3 && (g.stat?.sportTim ?? 0) >= 1 && sett >= 2],
      [`${glad} av tre är glada efter att ha spelat, och ${battre} blev bättre i närstrid`, glad >= 2 && battre >= 2],
      ['när ingen har fritid följer ingen med, och det blir ingen match', ensam],
    ];
  },
};

// en match i sporten k som börjar nu på lekplatsen, och de som går med i den
function match(s: State, k: string, med: Person[]) {
  const l = SIM.lekplats(s);
  s.sport = { k, x: l.x + l.w / 2, y: l.y + l.h / 2, start: s.now, slut: s.now + SIM.HOUR };
  for (const q of med) spela(s, q);
}
SCENARIER.sportplats = {
  text: 'Platserna i sporterna (steg 4.5.6.10–11): i dragkampen och snöbollskriget två lag på var sin sida om mitten, i brottningen två i mitten och de andra i en ring, i kast på en rad framför målet och i bollspelet den som slår i ena änden',
  kor: () => {
    const rader: [string, boolean][] = [];
    for (const k of ['dragkamp', 'brottning', 'kast', 'snoboll', 'bollspel']) {
      const s = rikDag(3), med = vuxna(s).slice(0, 4), l = SIM.lekplats(s), mx = l.x + l.w / 2, my = l.y + l.h / 2;
      match(s, k, med);
      const p = med.map(q => ({ x: q.task!.tx - mx, y: q.task!.ty - my })), d = p.map(o => Math.hypot(o.x, o.y));
      const f = (o: { x: number; y: number }) => `${o.x.toFixed(1)},${o.y.toFixed(1)}`;
      const ok = k === 'dragkamp' ? p.filter(o => o.x < 0).length === 2 && p.filter(o => o.x > 0).length === 2
        : k === 'brottning' ? d[0]! < 0.8 && d[1]! < 0.8 && d[2]! > 1.2 && d[3]! > 1.2
        : k === 'kast' ? p.every(o => Math.abs(o.x - p[0]!.x) < 0.6) && new Set(p.map(o => Math.round(o.y * 2))).size === 4 && SIM.kastMal(s.sport!).x - mx > 1
        : k === 'snoboll' ? p.filter(o => o.x < -1.5).length === 2 && p.filter(o => o.x > 1.5).length === 2
        : p[0]!.x < -2 && p.slice(1).every(o => o.x > p[0]!.x + 1);
      rader.push([`${SIM.SPORT_AV[k]!.namn}: ${p.map(f).join('  ')} (rutor från mitten)`, ok]);
    }
    return rader;
  },
};
SCENARIER.sportsaker = {
  text: 'Sportens föremål (steg 4.3.1.2): byn gör ett mål, en boll och ett slagträ när den har vuxna nog, föremålen slits när man spelar, och den som vunnit flest matcher i en sport får det i sitt eftermäle',
  kor: () => {
    const s = rikDag(3, { rep: 4 });
    const vill = ['mal', 'boll', 'slagtra'].map(k => SIM.villAv(s, k));
    const utan = SIM.SPORTER.filter(d => d.foremal.length && !d.foremal.every(k => SIM.amountOf(s, k) >= 1)).map(d => d.id);
    const v = vuxna(s), a = v[0]!, b = v[1]!;
    a.skill.traff = 20; b.skill.traff = 0;
    SIM.newTing(s, 'mal', 1, a.id);
    let matcher = 0;
    for (let i = 0; i < 6; i++) {
      klockan(s, 10); tandEld(s); // elden brinner, så att ingen går från matchen för att tända den
      match(s, 'kast', [a, b]); kor(s, 2); matcher++;
      if (i < 5) s.now += 20 * SIM.HOUR;
    }
    const mal = (s.ting ?? []).find(t => t.k === 'mal');
    return [
      [`byn vill ha ${vill.join(', ')} av målet, bollen och slagträet`, vill.every(n => n === 1)],
      [`utan föremålen kan byn inte spela ${utan.join(' och ')}`, utan.includes('kast') && utan.includes('bollspel')],
      [`${a.name} vann ${a.sportVinst?.kast ?? 0} av ${matcher} matcher i kast, ${b.name} ${b.sportVinst?.kast ?? 0}`, (a.sportVinst?.kast ?? 0) >= 5 && (a.sportVinst?.kast ?? 0) > (b.sportVinst?.kast ?? 0)],
      [`${a.name}s eftermäle: ${a.fame.join(', ') || 'inget'}`, a.fame.includes('Den bästa i kast mot mål') && s.sportBast?.kast === a.id],
      [`målet har slitits till ${mal ? mal.c.toFixed(2) : 'inget'}`, !!mal && mal.c < 1],
    ];
  },
};

SCENARIER.snoboll = {
  text: 'Lek i snön (steg 4.3.1.3): när snön ligger har de vuxna snöbollskrig på lekplatsen, och barnen leker i snön. Utan snö blir det inget snöbollskrig',
  kor: () => {
    let sno = 0, utan = 0;
    for (let i = 0; i < 12; i++) {
      for (const snoar of [true, false]) {
        const s = rikDag(3 + i); (s.vader ??= { fukt: 0, sno: 0 }).sno = snoar ? 5 : 0;
        const v = vuxna(s);
        fritid(s, v[1]!); fritid(s, v[2]!);
        if (spela(s, v[0]!) && s.sport?.k === 'snoboll') { if (snoar) sno++; else utan++; }
      }
    }
    const s = rikDag(3); (s.vader ??= { fukt: 0, sno: 0 }).sno = 5;
    const v = vuxna(s);
    fritid(s, v[1]!);
    const l = SIM.lekplats(s);
    s.sport = { k: 'snoboll', x: l.x + l.w / 2, y: l.y + l.h / 2, start: s.now, slut: s.now + SIM.HOUR };
    const fore = v.slice(0, 2).map(q => q.skill.traff);
    spela(s, v[0]!); spela(s, v[1]!);
    kor(s, 2);
    const battre = v.slice(0, 2).filter((q, i) => q.skill.traff > fore[i]!).length;
    const b = rikDag(3); (b.vader ??= { fukt: 0, sno: 0 }).sno = 5;
    const lekar = SIM.living(b).filter(x => SIM.ageOf(x, b.now) < SIM.ALDER.hjalper);
    for (const q of lekar) { q.task = undefined; SIM.chooseTask(b, q); }
    const iSnon = lekar.filter(q => q.task?.why === 'Är barn och leker i snön').length;
    return [
      [`i snön blev det snöbollskrig i ${sno} av 12 byar när någon började en match, utan snö i ${utan}`, sno >= 3 && utan === 0],
      [`${battre} av två blev bättre i träffsäkerhet av snöbollskriget`, battre === 2],
      [`${iSnon} av ${lekar.length} små barn leker i snön`, lekar.length > 0 && iSnon > 0],
    ];
  },
};

// en kväll vid elden: de vuxna utom den första sitter och samtalar vid elden (har fritid)
export function kvall(seed = 3, timme = 20) {
  const s = rikDag(seed); klockan(s, timme); tandEld(s);
  const f = SIM.eldPlats(s), v = vuxna(s);
  v.slice(1).forEach((q, i) => { q.x = f.x + 0.5 + Math.cos(i) * 2; q.y = f.y + 0.5 + Math.sin(i) * 2; q.task = { act: 'samtal', phase: 'do', tx: q.x, ty: q.y, until: s.now + SIM.HOUR, carry: 0, dark: true }; });
  return { s, v };
}
// p försöker uppträda tills hen gör det (eller det inte går): som om hen valt vad hen gör på kvällen många gånger
export function upptrad(s: State, p: Person, ganger = 300) {
  for (let i = 0; i < ganger; i++) {
    const fr = SIM.framVal(s, p, q => ({ x: q.x, y: q.y }));
    if (fr?.act === 'upptrada') { p.task = { act: 'upptrada', phase: 'go', tx: fr.spot?.x ?? p.x, ty: fr.spot?.y ?? p.y, until: s.now + fr.dur, carry: 0, ref: fr.ref, tool: fr.tool, dark: true, why: fr.why }; return true; }
  }
  return false;
}
SCENARIER.framtradande = {
  text: 'Framträdandena (steg 4.3.2.1): på kvällen uppträder någon vid elden för dem som sitter där, högst en gång per kväll. Ett kväde går från början; publiken blir glad, framträdandet får en kort text, och den som uppträder övar',
  kor: () => {
    const { s, v } = kvall(), p = v[0]!, fore = p.skill[SIM.FRAM_SKILL];
    const borjar = upptrad(s, p), d = s.fram ? SIM.FRAM_AV[s.fram.k]!.namn : 'inget';
    const lyss = v.slice(1).filter(q => q.task?.act === 'lyssna').length;
    kor(s, 1.5);
    const glad = v.slice(1).filter(q => q.thoughts.some(t => t.text.startsWith('Lyssnade på'))).length;
    const minne = s.framtradanden?.[0];
    // samma kväll blir det inget till, och inte heller på dagen eller utan publik
    const igen = !upptrad(s, v[1]!);
    const dag = kvall(3, 11), pDag = !upptrad(dag.s, dag.v[0]!);
    const ensam = rikDag(3); klockan(ensam, 20); const pEnsam = !upptrad(ensam, vuxna(ensam)[0]!);
    // en ny by kan bara kväda: ingen behöver något mer
    const ny = createState(9, START), kan = SIM.FRAMTRADANDEN.filter(x => !x.instrument && !(x.min ?? 0)).map(x => x.id);
    return [
      [`${p.name} börjar ett framträdande (${d}), och ${lyss} av ${v.length - 1} vid elden lyssnar`, borjar && lyss === v.length - 1],
      [`${glad} i publiken är glada efteråt`, glad >= 2],
      [`texten: ${minne?.text ?? 'ingen'}`, !!minne && minne.n >= 2 && minne.text.includes(p.name)],
      [`${p.name} övade ${SIM.FRAM_SKILL} (${fore.toFixed(2)} → ${p.skill[SIM.FRAM_SKILL].toFixed(2)})`, p.skill[SIM.FRAM_SKILL] > fore],
      ['samma kväll blir det inget framträdande till', igen],
      ['på dagen och utan publik blir det inget', pDag && pEnsam],
      [`från början finns ${kan.join(', ')} (${ny.people.length} invånare)`, kan.includes('kvade')],
    ];
  },
};

// en kväll vid elden med en färdig scen och instrumenten ks vid den (byns)
function medScen(seed: number, ks: string[]) {
  const k = kvall(seed);
  const sc = medBank(k.s, 'scen');
  for (const i of ks) SIM.nyttVid(k.s, SIM.newTing(k.s, i, 1, SIM.BYN));
  return { ...k, sc };
}
SCENARIER.scen = {
  text: 'Scenen och instrumenten (steg 4.3.2.2): byn vill ha en trumma, en benflöjt och en lyra till scenen när den finns. Med ett instrument vid scenen blir det sång och musik där, lyran ger mest glädje, och utan scen bara kväden, tal, föreläsningar och teater',
  kor: () => {
    const utan = kvall(), villUtan = ['trumma', 'benflojt', 'lyra'].map(k => SIM.villAv(utan.s, k));
    const med = medScen(3, []), vill = ['trumma', 'benflojt', 'lyra'].map(k => SIM.villAv(med.s, k));
    // utan instrument blir det aldrig sång eller musik, med lyran ofta, och på scenen
    let utanInst = 0, medLyra = 0, paScen = 0, sangFlojt = 0, flojt = 0;
    for (let i = 0; i < 30; i++) {
      const a = kvall(3 + i); a.v[0]!.skill[SIM.FRAM_SKILL] = 8;
      if (upptrad(a.s, a.v[0]!) && SIM.FRAM_AV[a.s.fram!.k]!.instrument) utanInst++;
      const b = medScen(3 + i, ['lyra']); b.v[0]!.skill[SIM.FRAM_SKILL] = 8;
      if (upptrad(b.s, b.v[0]!) && b.s.fram!.inst === 'lyra') { medLyra++; const t = b.v[0]!.task!; if (Math.abs(t.tx - SIM.vidStation(b.sc).x) < 0.01) paScen++; }
      const c = medScen(3 + i, ['benflojt']); c.v[0]!.skill[SIM.FRAM_SKILL] = 8;
      if (upptrad(c.s, c.v[0]!) && c.s.fram!.inst) { flojt++; if (c.s.fram!.k === 'sang') sangFlojt++; }
    }
    // ett framträdande med lyran: glädjen är större och lyran slits
    let n = 0, q = 0, kval = 0, slits = 1, text = '';
    for (let i = 0; i < 30 && !n; i++) {
      const b = medScen(3 + i, ['lyra']), p = b.v[0]!; p.skill[SIM.FRAM_SKILL] = 8;
      if (!upptrad(b.s, p) || b.s.fram!.inst !== 'lyra') continue;
      kval = SIM.framKval(b.s, p);
      kor(b.s, 1.5);
      const m = b.s.framtradanden?.[0];
      if (!m) continue;
      n = m.n; q = m.q; text = m.text; slits = (b.s.ting ?? []).find(t => t.k === 'lyra')?.c ?? 0;
    }
    const tek = ['scen', 'trumma', 'benflojt', 'lyra'].map(k => `${k} ${SIM.TEK[k]!.niva}`);
    return [
      [`utan scen vill byn ha ${villUtan.join(', ')} trummor, benflöjter och lyror; med scenen ${vill.join(', ')}`, villUtan.every(x => x === 0) && vill.every(x => x === 1)],
      [`utan instrument ${utanInst} gånger sång eller musik av 30, med lyran vid scenen ${medLyra}, ${paScen} av dem på scenen`, utanInst === 0 && medLyra >= 3 && paScen === medLyra],
      [`med bara benflöjten ${flojt} gånger musik och ${sangFlojt} sång (till flöjten kan man inte sjunga)`, flojt >= 2 && sangFlojt === 0],
      [`med lyran är kvaliteten ${q} mot ${kval.toFixed(2)} utan, för ${n} som lyssnar: ${text}`, n >= 2 && q > kval * 1.2 && text.includes('lyran')],
      [`lyran slits (${slits.toFixed(2)} kvar)`, slits < 1 && slits > 0],
      [`nivåerna: ${tek.join(', ')}`, tek.join() === 'scen 2,trumma 2,benflojt 2,lyra 3'],
    ];
  },
};

// p uppträder (med budskapet hen väljer) och framträdandet går till slut: texten och budskapet
function framfor(s: State, p: Person) {
  if (!upptrad(s, p)) return undefined;
  const bud = s.fram!.bud, text = s.fram!.text;
  kor(s, 1.5);
  return { bud, text };
}
const snitt = (s: State, l: Person, qs: Person[]) => qs.reduce((a, q) => a + SIM.getRel(s, q, l).op, 0) / qs.length;
SCENARIER.budskap = {
  text: 'Budskapen (steg 4.3.2.3): den som uppträder väljer budskapet efter sina egna intryck och sin tro. Om en person sprids ryktet till publiken, en hyllning gör att publiken tycker bättre om ledaren och ett hån sämre, och ledaren tycker sämre om den som hånar. Ledaren kan förbjuda hån som påbud. Ett budskap om tron kan övertyga någon',
  kor: () => {
    // om en person: ett barn som inte sitter vid elden, och som den som uppträder tror är en tjuv
    const a = kvall(), p = a.v[0]!, q = SIM.living(a.s).find(x => SIM.ageOf(x, a.s.now) < SIM.ALDER.vuxen) ?? a.v[a.v.length - 1]!;
    if (q.task?.act === 'samtal') q.task = undefined;
    p.intryck = [{ om: q.id, namn: q.name, k: 'tjuv', v: 1.5, c: 1, t: a.s.now }];
    const pa = framfor(a.s, p), hort = a.v.slice(1).filter(b => b !== q && SIM.intryckOm(b, q.id, 'tjuv')).length;
    // om ledaren: hyllning och hån
    const styr = (op: number, ban = false) => {
      const k = kvall(5), u = k.v[0]!, l = k.v[1]!, andra = k.v.slice(2);
      k.s.styre = { ledare: l.id, historia: [], oppna: [], ...(ban ? { pabud: { matlager: 0, vedlager: 0, torkat: 0, han: -1 } } : {}) } as unknown as typeof k.s.styre;
      SIM.getRel(k.s, u, l).op = op;
      const tillat = SIM.hanTillat(k.s), fore = snitt(k.s, l, andra), r = framfor(k.s, u);
      return { bud: r?.bud, text: r?.text ?? '', d: snitt(k.s, l, andra) - fore, led: SIM.getRel(k.s, u, l).op, tillat };
    };
    const hy = styr(60), ha = styr(-60), fri = styr(-60).tillat, ban = styr(-60, true).tillat;
    // om tron: den som uppträder tror starkt, och de andra är andliga men tror inte på något
    let tro = 0, overtygad = 0, troText = '';
    for (let i = 0; i < 20; i++) {
      const t = kvall(3 + i), u = t.v[0]!;
      t.s.tron = [{ id: 1, grundare: u.id, gnamn: u.name, t: t.s.now, k: 'blixt', bakom: 'Den som bor i åskmolnen', vill: 'att man tystnar när det mullrar', svek: 'blixten slår ner', natur: 50, manga: 50, bekr: t.s.now, ar: 0 } as SIM.Tro];
      u.tro = 1; u.troStyrka = 100; u.andlig = 100;
      for (const b of t.v.slice(1)) { b.andlig = 100; b.tro = undefined; }
      const r = framfor(t.s, u);
      if (r?.bud === 'tro') { tro++; troText = r.text; overtygad += t.v.slice(1).filter(b => b.tro === 1).length; }
    }
    return [
      [`om en person (${pa?.bud ?? 'inget'}): ${pa?.text ?? ''} ${hort} av ${a.v.length - 1} i publiken hörde ryktet`, pa?.bud === 'person' && hort >= 1],
      [`hyllning (${hy.bud}): ${hy.text} Publiken tycker ${hy.d.toFixed(1)} bättre om ledaren`, hy.bud === 'hylla' && hy.d > 0],
      [`hån (${ha.bud}): ${ha.text} Publiken tycker ${(-ha.d).toFixed(1)} sämre om ledaren, och ledaren och den som hånade har ${ha.led.toFixed(0)}`, ha.bud === 'hana' && ha.d < 0 && ha.led < -60],
      [`när ledaren förbjudit hån är hånet tillåtet till ${ban.toFixed(2)} mot ${fri.toFixed(2)} utan förbud`, ban < fri],
      [`om tron ${tro} av 20 gånger (${troText}), och ${overtygad} blev övertygade`, tro >= 10 && overtygad >= 1],
    ];
  },
};
SCENARIER.bestalld = {
  text: 'Beställda framträdanden (steg 4.3.2.4): ledaren betalar den som ska uppträda med en hel sak ur sin egen egendom, och framträdandet hyllar då ledaren. Ledaren ger den minst värda lediga saken, inget när hen inget har, och den som avskyr ledaren tackar nej',
  kor: () => {
    // vid: om ledaren har något att betala med; op: vad den som uppträder tycker om ledaren
    const forsok = (seed: number, vid: boolean, op: number) => {
      const k = kvall(seed), u = k.v[0]!, l = k.v[1]!;
      k.s.styre = { ledare: l.id, historia: [], oppna: [] } as unknown as typeof k.s.styre;
      for (const t of SIM.tingOf(k.s)) if (t.agare === l.id) t.agare = SIM.BYN;
      const kniv = vid ? SIM.newTing(k.s, 'kniv', 1, l.id) : undefined, yxa = vid ? SIM.newTing(k.s, 'yxa', 1, l.id) : undefined;
      SIM.getRel(k.s, u, l).op = op;
      const fore = k.s.stat?.framBestalld ?? 0, r = framfor(k.s, u), betalt = (k.s.stat?.framBestalld ?? 0) > fore;
      return { r, betalt, kniv: kniv?.agare === u.id, yxa: yxa?.agare === u.id, minne: k.s.framtradanden?.at(-1)?.betalt };
    };
    let ja: ReturnType<typeof forsok> | undefined, n = 0, tomt = 0, nej = 0;
    for (let i = 0; i < 30; i++) {
      const f = forsok(3 + i, true, 0);
      if (f.r) n++;
      if (f.betalt && !ja) ja = f;
      if (forsok(3 + i, false, 0).betalt) tomt++;
      if (forsok(3 + i, true, -60).betalt) nej++;
    }
    return [
      [`ledaren beställer ibland (${ja ? 'ja' : 'aldrig'} på ${n} framträdanden): ${ja?.r?.text ?? ''}`, !!ja],
      [`det beställda hyllar ledaren (${ja?.r?.bud})`, ja?.r?.bud === 'hylla'],
      [`ledaren betalar med kniven, den minst värda, och behåller yxan (minnet säger ${ja?.minne})`, !!ja?.kniv && !ja.yxa && ja.minne === 'kniv'],
      [`en ledare utan egendom beställer inget (${tomt} gånger)`, tomt === 0],
      [`den som avskyr ledaren tackar nej (${nej} gånger)`, nej === 0],
    ];
  },
};
SCENARIER.skaldskap = {
  text: 'Skaldskapen (steg 4.3.2.5): färdigheten för att uppträda. Den börjar av berättandet, växer när man uppträder och när man berättar i samtalen, och gör framträdandet bättre och fler former möjliga',
  lang: true,
  kor: () => {
    const ny = createState(9, START), start = ny.people.every(p => Math.abs(p.skill.skaldskap - p.skill.berattande * SIM.SKALD_START) < 1e-9);
    const { s, v } = kvall(), p = v[0]!;
    p.skill.skaldskap = 0; const lag = SIM.framKval(s, p), kanLag = SIM.FRAMTRADANDEN.filter(d => (d.min ?? 0) <= p.skill.skaldskap).length;
    p.skill.skaldskap = 10; const hog = SIM.framKval(s, p), kanHog = SIM.FRAMTRADANDEN.filter(d => (d.min ?? 0) <= p.skill.skaldskap).length;
    p.skill.skaldskap = 3; upptrad(s, p); kor(s, 1.5); const efter = p.skill.skaldskap, ggr = p.gjort?.t.upptradt ? 1 : 0;
    // i samtalen: de som berättar men aldrig uppträder blir också bättre
    let vaxte = 0;
    for (const seed of [5, 6, 7]) { // tre byar: i en enda by kan några berättelser avgöra
      const d = rikDag(seed);
      for (const q of SIM.living(d)) q.skill.berattande = Math.max(q.skill.berattande, 10); // vana berättare väljer oftare att berätta vid elden på kvällen
      const fore = new Map(SIM.living(d).map(q => [q.id, q.skill.skaldskap]));
      kor(d, 48);
      vaxte += SIM.living(d).filter(q => !q.gjort?.t.upptradt && (q.skill.skaldskap ?? 0) > (fore.get(q.id) ?? Infinity)).length;
    }
    return [
      [`färdigheten heter ${SIM.SKILL_NAMES[SIM.FRAM_SKILL]}`, SIM.FRAM_SKILL === 'skaldskap' && SIM.SKILL_NAMES.skaldskap === 'Skaldskap'],
      ['de nya i byn börjar med hälften av sitt berättande', start],
      [`skaldskap 0 ger kvaliteten ${lag.toFixed(2)} och ${kanLag} former, skaldskap 10 ger ${hog.toFixed(2)} och ${kanHog}`, hog > lag && kanHog > kanLag],
      [`den som uppträder övar (3 → ${efter.toFixed(2)}, räknat ${ggr})`, efter > 3 && ggr === 1],
      [`${vaxte} som aldrig uppträtt blev bättre av att berätta i samtalen på två dygn i tre byar`, vaxte >= 1],
    ];
  },
};
SCENARIER.konst = {
  text: 'Konsten i sakerna (steg 4.3.3): ett mästerverk (inte kläderna) får ristningar eller en målning av en person eller händelse som göraren minns, helst en död. Motivet står i berättelsen om saken, höjer värdet och gör att byn minns den döde längre',
  kor: () => {
    const s = rikDag(3), [g, d, a] = vuxna(s) as [Person, Person, Person];
    SIM.die(s, d, 'sjukdom');
    g.intryck = [{ om: d.id, namn: d.name, k: 'vargdodare', v: 1, c: 1, t: s.now, bev: [{ h: 'vargdodare', t: s.now, sett: true }] }];
    // mästerverk tills ett får ett motiv (det avgörs av sakens id)
    let yxa: SIM.Ting | undefined, utan = 0;
    for (let i = 0; i < 10 && !yxa; i++) { const t = SIM.newTing(s, 'yxa', 1, g.id); t.q = 4; SIM.sakMinne(s, g, t); if (t.ber?.mo) yxa = t; else utan++; }
    const ber = yxa ? SIM.sakBerattelse(s, yxa, 'Yxa') : '';
    const vanlig = SIM.newTing(s, 'yxa', 1, g.id); vanlig.q = 4;
    const vMed = yxa ? SIM.tingVarde(yxa) : 0, vUtan = SIM.tingVarde(vanlig);
    // kläderna får ingen konst, och ingen konst utan något att minnas
    let klad = 0; for (let i = 0; i < 10; i++) { const t = SIM.newTing(s, 'rock_kaninskinn', 1, g.id); t.q = 4; SIM.sakMinne(s, g, t); if (t.ber?.mo) klad++; }
    let tomt = 0; for (let i = 0; i < 10; i++) { const t = SIM.newTing(s, 'kniv', 1, a.id); t.q = 4; a.intryck = []; SIM.sakMinne(s, a, t); if (t.ber?.mo) tomt++; }
    // minnet av den döde: med och utan saken som visar hen
    const minns = (medSak: boolean) => {
      const k = SIM.cloneState(s), p = k.people.find(q => q.id === a.id)!;
      p.intryck = [{ om: d.id, namn: d.name, k: 'vargdodare', v: 1, c: 1, t: k.now }];
      if (!medSak) for (const t of k.ting ?? []) if (t.ber) delete t.ber.mo;
      SIM.glomRykten(k, 24 * 5);
      return p.intryck?.[0]?.c ?? 0;
    };
    const med = minns(true), utanSak = minns(false);
    return [
      [`ett mästerverk får ett motiv (${utan} utan först): ${ber}`, !!yxa && /visar|ristat|målat/.test(ber) && ber.includes(d.name)],
      [`motivet är händelsen (${yxa?.ber?.mo?.b?.h}) med den döde ${d.name}`, yxa?.ber?.mo?.om === d.id && yxa.ber.mo.b?.h === 'vargdodare'],
      [`värdet ${vMed.toFixed(1)} mot ${vUtan.toFixed(1)} utan konst`, vMed > vUtan],
      [`kläderna får ingen konst (${klad} av 10), och ingen konst när göraren inget minns (${tomt} av 10)`, klad === 0 && tomt === 0],
      [`byn minns den döde längre med saken: säkerheten ${med.toFixed(2)} mot ${utanSak.toFixed(2)} efter fem dygn`, med > utanSak],
    ];
  },
};

SCENARIER.pynt = {
  text: 'Pynt i hemmen (steg 4.3.4): var och en som är vuxen och sover inne bygger ett pynt åt sig själv (en lerkruka, en bonad eller ett snidat väggbräde, efter smaken), högst ett, i rummet där hen sover. Ägaren trivs där, och de som ser det får ett bättre intryck av ägaren, mer ju finare det är',
  kor: () => {
    const { PROJEKT, PYNT_LIST, isKlar, pyntOf, pyntSort, villPynt, bedTile, stationRum, stepPynt, intryckOm } = SIM;
    const s = createState(6, START); klockan(s); tandEld(s); medHus(s);
    for (const r of s.people) r.tek = { ...r.tek, kruka: 1, bonad: 1, vaggbrade: 1 };
    setFood(s, 300); SIM.setAmount(s, 'ved', 40); SIM.setAmount(s, 'virke', 6); SIM.setAmount(s, 'skinn', 4); SIM.setAmount(s, 'rep', 4);
    const p = vuxna(s).find(q => bedTile(s, q) !== undefined)!, k = pyntSort(s, p);
    const vill = villPynt(s, p, k), bara = PYNT_LIST.filter(j => villPynt(s, p, j)).length, brist = PROJEKT[k]!.brist(s);
    const sorter = new Set(Array.from({ length: 12 }, (_, i) => pyntSort(s, { id: i } as Person))).size; // smaken skiljer sig mellan människor
    // pyntet väger lite mot arbetet om maten; här väger det mer, så att p bygger sitt snart
    let h = 0; const vikt = PYNT_LIST.map(j => PROJEKT[j]!.vikt); for (const j of PYNT_LIST) PROJEKT[j]!.vikt = 20;
    try { while (!(pyntOf(s, p) && isKlar(pyntOf(s, p)!)) && h < 72) { kor(s, 1); h++; } } finally { PYNT_LIST.forEach((j, i) => { PROJEKT[j]!.vikt = vikt[i]; }); }
    const t = pyntOf(s, p), b = bedTile(s, p), rum = t && stationRum(s, t);
    const byggd = !!t && isKlar(t) && t.k === k && t.ag === p.id && !!t.inne && b !== undefined && !!rum?.tiles.includes(b) && t.q !== undefined;
    const mer = PYNT_LIST.some(j => villPynt(s, p, j));
    // i rummet: ägaren trivs, och den som är vaken där får ett bättre intryck av ägaren. Ett uselt pynt ger inget
    const v = SIM.living(s).find(q => q !== p)!, ruta = rum?.tiles[0] ?? 0;
    const prova = (q: number) => {
      const k2 = SIM.cloneState(s), p2 = k2.people.find(r => r.id === p.id)!, v2 = k2.people.find(r => r.id === v.id)!, t2 = pyntOf(k2, p2)!;
      t2.q = q; p2.thoughts = []; v2.intryck = [];
      for (const r of [p2, v2]) { r.x = ruta % SIM.W + 0.5; r.y = Math.floor(ruta / SIM.W) + 0.5; r.task = undefined; } // SIM.W: W sätts när kartan skapas
      stepPynt(k2);
      const e = intryckOm(v2, p2.id, 'smakfull');
      return { glad: p2.thoughts.find(x => x.text === SIM.PYNT_TANKE)?.v ?? 0, syn: e ? e.v * e.c : 0 };
    };
    const fin = prova(4), normal = prova(2), usel = prova(0);
    return [
      [`p vill ha ett pynt av sin sort (${k}) och bara den (${bara}), byn vill bygga det (brist ${brist.toFixed(2)}), och smaken skiljer sig (${sorter} sorter hos tolv)`, vill && bara === 1 && brist > 0 && sorter === PYNT_LIST.length],
      [`p bygger sitt pynt på ${h} timmar (ungefär ${h / 2} månader i spelet), inne i rummet där p sover, med en kvalitet`, byggd],
      ['högst ett pynt var', !!t && !mer],
      [`ägaren trivs i rummet: humör +${(fin.glad * 100).toFixed(0)} % med ett mästerverk, +${(normal.glad * 100).toFixed(0)} % med ett normalt`, fin.glad > normal.glad && normal.glad > 0],
      [`den som ser det får intrycket smakfull: ${fin.syn.toFixed(3)} med ett mästerverk, ${normal.syn.toFixed(3)} med ett normalt`, fin.syn > normal.syn && normal.syn > 0],
      [`ett uselt pynt ger ingenting (${usel.glad}, ${usel.syn})`, usel.glad === 0 && usel.syn === 0],
    ];
  },
};

SCENARIER.framrapport = {
  text: 'Framträdandets redogörelse (steg 5.4.7.1): när framträdandet slutar sparas vem, formen, publiken och mottagningen (glädjen, vad publiken tycker om den som uppträdde före och efter, ryktet, ledaren efter en hyllning, vilka tron övertygade), och raden i Händelser och notisen pekar dit. Kommer ingen säger redogörelsen det. Högst upp en berättelse i löpande text ur det som hände (steg 5.4.7.2)',
  kor: () => {
    const { s, v } = kvall(), p = v[0]!;
    upptrad(s, p); kor(s, 1.5);
    const m = s.framtradanden?.at(-1), rad = s.log.find(l => l.fram !== undefined && l.fram === m?.nr);
    const n = s.notiser?.lista.find(x => x.id === 'fram'), nIdx = n?.fram?.indexOf(m?.nr ?? -1) ?? -1;
    const ok = !!m?.publik && m.publik.length === m.n && m.publik.every(x => Number.isInteger(x.r0) && Number.isInteger(x.r1));
    // en hyllning: publiken om ledaren före och efter
    const k = kvall(5), u = k.v[0]!, l = k.v[1]!;
    k.s.styre = { ledare: l.id, historia: [], oppna: [] } as unknown as typeof k.s.styre;
    SIM.getRel(k.s, u, l).op = 60;
    let hy: SIM.FramMinne | undefined;
    if (upptrad(k.s, u)) { kor(k.s, 1.5); hy = k.s.framtradanden?.at(-1); }
    const hyl = hy?.publik?.filter(x => x.l0 !== undefined) ?? [];
    // tron: någon i publiken övertygas
    let tro: string[] = [], troM: SIM.FramMinne | undefined, troS = s;
    for (let i = 0; i < 20 && !tro.length; i++) {
      const t = kvall(3 + i), w = t.v[0]!;
      t.s.tron = [{ id: 1, grundare: w.id, gnamn: w.name, t: t.s.now, k: 'blixt', bakom: 'Den som bor i åskmolnen', vill: 'att man tystnar när det mullrar', svek: 'blixten slår ner', natur: 50, manga: 50, bekr: t.s.now, ar: 0 } as SIM.Tro];
      w.tro = 1; w.troStyrka = 100; w.andlig = 100;
      for (const b of t.v.slice(1)) { b.andlig = 100; b.tro = undefined; }
      if (!upptrad(t.s, w)) continue;
      kor(t.s, 1.5);
      const tm = t.s.framtradanden?.at(-1);
      if (tm?.bud === 'tro' && tm.tro?.length) { tro = tm.tro.filter(x => t.v.find(b => b.name === x)?.tro === 1); troM = tm; troS = t.s; }
    }
    // ingen kom: publiken går därifrån innan framträdandet börjar
    const e = kvall(7), ep = e.v[0]!;
    let inget: SIM.FramMinne | undefined;
    if (upptrad(e.s, ep)) { for (const q of e.v.slice(1)) q.task = { act: 'sova', phase: 'do', tx: q.x, ty: q.y, until: e.s.now + 3 * SIM.HOUR, carry: 0, dark: true }; kor(e.s, 1.5); inget = e.s.framtradanden?.at(-1); }
    const inglog = e.s.log.find(x => x.fram === inget?.nr);
    // berättelsen högst upp (steg 5.4.7.2): skriven ur minnet, stabil, med den som uppträdde, ledaren och den som övertygades
    const b0 = m ? SIM.framBerattelse(s, m) : '', bh = hy ? SIM.framBerattelse(k.s, hy) : '', bt = troM ? SIM.framBerattelse(troS, troM) : '', bi = inget ? SIM.framBerattelse(e.s, inget) : '';
    const hel = (x: string) => x.length > 0 && !/\{|undefined|NaN/.test(x);
    return [
      [`minnet nr ${m?.nr}: ${m?.n} lyssnade, glädje ${m?.glad}, publiken före och efter i hela tal`, ok && (m?.glad ?? 0) > 0],
      [`raden i Händelser pekar på framträdandet: ${rad?.text ?? 'ingen'}`, !!rad],
      [`notisen (Folket) pekar på det på rad ${nIdx + 1}`, !!n && nIdx >= 0 && n.fram!.length === n.rader.length],
      [`hyllningen: ledaren ${hy?.ledare ?? 'ingen'}, ${hyl.length} i publiken med före och efter (${hyl.map(x => `${x.l0}→${x.l1}`).join(', ')})`, hy?.bud === 'hylla' && hy.ledare === l.name && hyl.length >= 1 && hyl.every(x => x.l1! >= x.l0!) && hyl.some(x => x.l1! > x.l0!)],
      [`tron övertygade ${tro.join(', ') || 'ingen'}`, tro.length >= 1],
      [`ingen kom: ${inglog?.text ?? 'ingen rad'}`, !!inget?.inget && inget.n === 0 && !!inglog],
      [`berättelsen: ${b0}`, hel(b0) && b0.includes(p.name) && b0 === SIM.framBerattelse(s, m!)],
      [`berättelsen om hyllningen: ${bh}`, hel(bh) && bh.includes(l.name)],
      [`berättelsen om tron: ${bt}`, hel(bt) && tro.some(x => bt.includes(x))],
      [`berättelsen när ingen kom: ${bi}`, hel(bi) && bi.includes(ep.name)],
    ];
  },
};

SCENARIER.matchrapport = {
  text: 'Matchens sammanställning (steg 5.4.8.1): när matchen avgörs sparas sporten, hur länge den varade, spelarna med färdigheten i sportens färdighet, vem som vann och glädjen, och raden i Händelser och notisen pekar dit. Kommer det för få säger sammanställningen att det blev ingen match. Högst upp en berättelse ur det som hände (steg 5.4.8.2)',
  kor: () => {
    const s = rikDag(3, { rep: 4 }), v = vuxna(s), a = v[0]!, b = v[1]!;
    a.skill.traff = 18; b.skill.traff = 2;
    SIM.newTing(s, 'mal', 1, a.id);
    match(s, 'kast', [a, b]); kor(s, 2);
    const m = s.matcher?.at(-1), rad = s.log.find(l => l.match !== undefined && l.match === m?.nr);
    const n = s.notiser?.lista.find(x => x.id === 'match'), nIdx = n?.match?.indexOf(m?.nr ?? -1) ?? -1;
    const fa = m?.spelare.find(x => x.id === a.id);
    // det kommer för få: ensam på lekplatsen
    const e = rikDag(5), ep = vuxna(e)[0]!;
    match(e, 'dragkamp', [ep]);
    for (const q of SIM.living(e)) if (q !== ep) q.task = { act: 'sova', phase: 'do', tx: q.x, ty: q.y, until: e.now + 3 * SIM.HOUR, carry: 0, dark: true };
    kor(e, 1.5);
    const im = e.matcher?.at(-1), ilog = e.log.find(l => l.match === im?.nr);
    // berättelsen högst upp (steg 5.4.8.2): skriven ur minnet, stabil, med vinnaren; en skräll när den svagare vinner
    const hel = (x: string) => x.length > 0 && !/\{|undefined|NaN/.test(x);
    const ber = m ? SIM.matchBerattelse(s, m) : '', iber = im ? SIM.matchBerattelse(e, im) : '';
    const sk = m ? { ...m, nr: 7, vinnare: b.id, vnamn: b.name, spelare: m.spelare.map(x => ({ ...x, v: x.id === b.id ? 20 : 19.5 })) } : undefined, sber = sk ? SIM.matchBerattelse(s, sk) : '';
    return [
      [`minnet nr ${m?.nr}: ${m?.k}, ${m ? Math.round((m.slut - m.t) / SIM.MIN) : 0} minuter, ${m?.spelare.map(x => `${x.namn} ${x.f}`).join(', ')}, vann ${m?.vnamn}, glädje ${m?.glad}`, !!m && m.k === 'kast' && m.spelare.length === 2 && fa?.f === 18 && !!m.vnamn && m.slut > m.t && m.glad > 0],
      [`raden i Händelser pekar på matchen: ${rad?.text ?? 'ingen'}`, !!rad],
      [`notisen (Folket) pekar på den på rad ${nIdx + 1}`, !!n && nIdx >= 0 && n.match!.length === n.rader.length],
      [`för få: ${ilog?.text ?? 'ingen rad'}`, !!im?.installd && !im.vinnare && im.spelare.length === 1 && !!ilog],
      [`berättelsen: ${ber}`, hel(ber) && ber.includes(a.name) && ber === SIM.matchBerattelse(s, m!)],
      [`när den svagare vinner jämnt: ${sber}`, hel(sber) && sber.includes(b.name) && sber.includes(a.name)],
      [`när det kom för få: ${iber}`, hel(iber) && iber.includes(ep.name) || /ingen|för få|tom/.test(iber)],
    ];
  },
};

SCENARIER.ord = {
  text: 'Ordlagret (steg 6.7.1, src/sim/ord.ts): tal skrivs med ord, sakerna med rätt artikel och form, teknikerna som vad man kan göra, listor fogas med komma och och, och skador med grad och genus',
  kor: () => {
    const utanGora = TEKNIK.filter(t => !O.GORA[t.id]).map(t => t.id);
    return [
      [`tal: ${O.tal(3)}, ${O.tal(1, true)}, ${O.tal(40)}, ${O.tal(500)}`, O.tal(3) === 'tre' && O.tal(1, true) === 'ett' && O.tal(40) === 'många' && O.tal(500) === 'otaliga'],
      [`listor: "${O.och(['Åsa', 'Bo', 'Ylva'])}" och "${O.lista(['A', 'B', 'C', 'D', 'E', 'F'])}"`, O.och(['Åsa', 'Bo', 'Ylva']) === 'Åsa, Bo och Ylva' && O.lista(['A', 'B', 'C', 'D', 'E', 'F']) === 'A, B och fyra till'],
      [`saker: "${O.antal(1, 'kott')}", "${O.antal(3, 'kott')}", "${O.antal(1, 'radjur')}"`, O.antal(1, 'kott') === 'en bit harkött' && O.antal(3, 'kott') === 'tre bitar harkött' && O.antal(1, 'radjur').startsWith('ett ')],
      [`varje teknik har ett "att göra" (saknas: ${utanGora.join(', ') || 'inga'}); t.ex. "${O.gora(TEKNIK[0]!)}"`, utanGora.length === 0],
      [`skador: "${O.skada('ett blåmärke', 0.1)}", "${O.skada('en blödning', 0.5)}", "${O.skada('ett skärsår', 0.9)}"`, O.skada('ett blåmärke', 0.1) === 'ett lätt blåmärke' && O.skada('en blödning', 0.5) === 'en svår blödning' && O.skada('ett skärsår', 0.9) === 'ett mycket svårt skärsår'],
      [`pronomen: ${O.han({ sex: 'k' })}/${O.honom({ sex: 'm' })}/${O.hans({ sex: 'k' })}`, O.han({ sex: 'k' }) === 'hon' && O.honom({ sex: 'm' }) === 'honom' && O.hans({ sex: 'k' }) === 'hennes'],
    ];
  },
};

SCENARIER.omrostning = {
  text: 'Steg 8.3.1–8.3.3: allt byn avgör är en fråga i FRAGOR. Klockan 20 röstar alla vuxna efter åsikter och intresse, summan av vikterna avgör, och vid Envälde väger nästan bara ledaren. Omröstningarna sparas',
  kor: () => {
    const s = createState(6, START), v = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), l = v[0];
    (s.styre = { historia: [{ id: l.id, namn: l.name, titel: 'Ålderman', fran: s.now }], oppna: ['rang'], ledare: l.id, sedan: s.now, titel: 'Ålderman', satt: 1, pabud: { matlager: 0, vedlager: 0, torkat: 0 } as never });
    const allmoge = SIM.vikter(s), lika = Math.max(...allmoge.filter(x => x.p !== l).map(x => x.andel));
    s.seder.v.rang = 1;
    const envalde = SIM.vikter(s), led = envalde.find(x => x.p === l)!.andel;
    s.seder.v.rang = 0;
    const fr = { f: 'pabud', d: { k: 'matlager', v: 0.9 }, fram: l.id };
    SIM.rostaOm(s, fr);
    const o = s.styre!.roster![0];
    const allaVuxna = o.roster.length === v.length && o.roster.every(r => r.why);
    // en fråga i kön tas upp klockan 20, och ett ja gör det raden säger
    s.seder.v.rang = 1;
    SIM.laggFram(s, 'pabud', { k: 'vedlager', v: 0.7 }, l); SIM.laggFram(s, 'pabud', { k: 'vedlager', v: 0.7 }, l);
    const iKo = s.styre!.fragor!.length;
    SIM.rostKvall(s);
    const satt = s.styre!.pabud!.vedlager === 0.7;
    return [
      [`vid Allmogen väger ingen annan än ledaren mycket (högst ${(lika * 100).toFixed(0)} %)`, lika < 0.4],
      [`vid Envälde väger ledaren nästan allt (${(led * 100).toFixed(0)} %)`, led > 0.85],
      [`alla vuxna röstar, och varje röst har ett skäl (${o.roster.length})`, allaVuxna],
      ['samma fråga läggs inte fram två gånger', iKo === 1],
      ['frågan avgörs vid elden och ett ja gör det raden säger', satt],
    ];
  },
};
SCENARIER.makten = {
  text: 'Steg 8.3.4–8.3.12: Förtjänst – Härkomst och Förlikning – Fejd låses upp och börjar där byn lutar, tronföljden följer sederna, formen har tidens namn, missnöjet växer och bleknar, och en fraktion som väger mer än legitimiteten avsätter ledaren fredligt eller slåss',
  kor: () => {
    const ny = () => {
      const s = createState(6, START), v = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
      for (const p of v) (p.tek ??= {}).ledarskap = 1;
      return { s, v };
    };
    const { s, v } = ny(), l = v[0];
    s.styre = { historia: [{ id: l.id, namn: l.name, titel: 'Ålderman', fran: s.now }], oppna: ['rang'], ledare: l.id, sedan: s.now, titel: 'Ålderman', satt: 1, pabud: {} as never, lugn: 0 };
    SIM.oppnaSed(s, 'fejd');
    const oppen = SIM.sedOppen(s, 'fejd');
    // former
    s.seder.v.rang = 0.8; s.seder.v.fortjanst = 0.5; s.seder.v.fejd = 0; const kung = SIM.styrelseform(s).namn;
    s.seder.v.fortjanst = -0.5; s.seder.v.fejd = 0.5; const envalde = SIM.styrelseform(s).namn;
    s.seder.v.rang = 0; s.seder.v.fortjanst = 0; s.seder.v.fejd = 0; const ting = SIM.styrelseform(s).namn;
    // tronföljden
    s.seder.v.fortjanst = 0.6; const arv = SIM.tronfoljd(s);
    s.seder.v.fortjanst = 0; s.seder.v.fejd = 0.8; const strid = SIM.tronfoljd(s);
    s.seder.v.fejd = 0; const val = SIM.tronfoljd(s);
    // missnöjet växer av svält och bleknar
    const q = v[1]; q.warm = 1; q.hunger = 0.01; SIM.missnojeTimme(s); const m1 = q.missnoje ?? 0;
    q.hunger = 1; for (let i = 0; i < 24 * 30; i++) SIM.missnojeTimme(s);
    // fraktionen avsätter fredligt vid Förlikning
    for (const p of v.slice(1)) p.missnoje = 1;
    s.styre.lugn = 0;
    for (const r of Object.keys(s.rels)) s.rels[r].op = -50;
    s.styre.frak = { led: v[1].id, med: v.slice(1).map(p => p.id) };
    SIM.missnojeTimme(s);
    const avsatt = s.styre.ledare !== l.id && s.styre.historia[s.styre.historia.length - 1].slut === 'avsattes';
    return [
      [`skalan låses upp (${oppen})`, oppen],
      [`formerna har tidens namn: ${kung}, ${envalde}, ${ting}`, kung === 'Kungadöme' && envalde === 'Envälde' && ting === 'Folkting'],
      [`tronföljden följer sederna: ${arv}, ${strid}, ${val}`, arv === 'arv' && strid === 'strid' && val === 'val'],
      [`missnöjet växer av svält (${m1.toFixed(3)}) och bleknar (${(q.missnoje ?? 0).toFixed(3)})`, m1 > 0 && (q.missnoje ?? 0) < m1],
      ['en fraktion som väger mer än legitimiteten avsätter ledaren fredligt vid Förlikning', avsatt],
    ];
  },
};

SCENARIER.mantel = {
  text: 'Steg 8.3.13–8.3.15: ett förbud mot hån är en fråga, och går den igenom rivs scenen. Ledarens mantel följer ämbetet, och ett halsband ger anseende, ett finare mer',
  kor: () => {
    const s = createState(6, START), v = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), l = v[0], q = v[1];
    s.styre = { historia: [{ id: l.id, namn: l.name, titel: 'Ålderman', fran: s.now }], oppna: ['rang'], ledare: l.id, sedan: s.now, titel: 'Ålderman', satt: 1 };
    s.seder.v.rang = 1;
    const t0 = SIM.hanTillat(s);
    SIM.laggFram(s, 'hanforbud', { led: l.id }, l); SIM.rostKvall(s);
    const forbud = !!s.styre.hanForbud && SIM.hanTillat(s) === 0 && t0 >= 0;
    // manteln
    const m = SIM.newTing(s, 'mantel_kaninskinn', 1, -1), man = () => s.ting!.find(t => t.k === 'mantel_kaninskinn')!;
    SIM.stepKlader(s); const paLedaren = man().bar === l.id;
    s.styre.ledare = q.id; SIM.stepKlader(s); const nasta = man().bar === q.id;
    // halsbandet
    const a0 = SIM.ryktbarhet(s, v[2].id).a;
    const h = SIM.newTing(s, 'halsband_benband', 1, -1); const hb = s.ting!.filter(t => t.k === 'halsband_benband').pop()!; hb.bar = v[2].id; hb.x = hb.y = undefined;
    const a1 = SIM.ryktbarhet(s, v[2].id).a;
    hb.k = 'halsband_tandband'; const a2 = SIM.ryktbarhet(s, v[2].id).a;
    return [
      ['förbudet mot hån går igenom och stoppar hånet', forbud],
      ['ledaren har på sig manteln', paLedaren && !!m],
      ['manteln går till nästa ledare', nasta],
      [`ett halsband ger anseende, ett finare mer (${a0.toFixed(2)} → ${a1.toFixed(2)} → ${a2.toFixed(2)})`, a1 > a0 && a2 > a1 && !!h],
    ];
  },
};

const medLedare = (seed = 6) => {
  const s = createState(seed, START), v = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), l = v[0];
  for (const p of v) { (p.tek ??= {}).ledarskap = 1; p.tek.lag = 1; }
  s.styre = { historia: [{ id: l.id, namn: l.name, titel: 'Ålderman', fran: s.now }], oppna: ['rang'], ledare: l.id, sedan: s.now, titel: 'Ålderman', satt: 1, pabud: {} as never };
  return { s, v, l };
};
SCENARIER.lagar = {
  text: 'Steg 8.4.1–8.4.6: en lag är ett påbud eller förbud med ett straff, som stiftas i omröstningen. Ur det som hänt väcks förslag, det med högst prioritet tas upp, taket håller nere antalet, och en lag kan ta bort rösten',
  kor: () => {
    const { s, v, l } = medLedare();
    s.seder.v.rang = 1; l.pot.empati = 16; // ledaren väger allt, så att frågan går igenom
    const fore = SIM.framlaggare(s).length;
    (s.stat ??= {}).rykte_stold = 10;
    const tog = SIM.tasUppKvall(s);
    const lag = SIM.lagGaller(s, 'stoldforbud'), om = s.styre!.roster?.[s.styre!.roster!.length - 1]?.varfor;
    s.seder.v.rang = -0.5;
    const manga = SIM.framlaggare(s).length;
    // straffet står i lagen
    s.seder.v.rang = 1;
    const straff = SIM.lagarNu(s)[0]?.straff;
    // rösten
    s.styre!.lagar!.push({ id: 'rostKvinnor', t: s.now, straff: 0, av: l.id, om: '' });
    const k = v.find(p => p.sex === 'k')!, m = v.find(p => p.sex === 'm')!;
    const utan = SIM.utanRost(s, k), med = !SIM.utanRost(s, m);
    // taket: över taket efterlevs lagarna sämre
    const e0 = SIM.efterlevs(s);
    for (const id of Object.keys(SIM.LAGAR)) if (!SIM.lagGaller(s, id)) s.styre!.lagar!.push({ id, t: s.now, straff: 0, av: l.id, om: '' });
    const e1 = SIM.efterlevs(s);
    return [
      [`vid Envälde får bara ledaren lägga fram (${fore}), vid Allmogen fler (${manga})`, fore === 1 && manga > 1],
      [`stölderna väcker en lag som tas upp (${om ?? 'inget skäl'})`, tog && lag && !!om],
      [`straffet står i lagen (${straff === undefined ? '-' : SIM.STRAFF_NAMN[straff]})`, straff !== undefined],
      ['en lag kan ta rösten från kvinnorna', utan && med],
      [`över taket efterlevs alla lagar sämre (${e0.toFixed(2)} → ${e1.toFixed(2)})`, e1 < e0],
    ];
  },
};
SCENARIER.tinget = {
  text: 'Steg 8.4.7–8.4.10: tinget avgör skulden, straffet står i lagen och blir likadant varje gång, och rädslor som många delar blir tabun',
  kor: () => {
    const { s, v, l } = medLedare(), q = v[1], d = v[2];
    s.seder.v.rang = 1;
    s.styre!.lagar = [{ id: 'stoldforbud', t: s.now, straff: 4, av: l.id, om: '' }];
    // ledaren såg stölden
    SIM.handelse(s, q, 'stold', d, 'en yxa');
    for (const p of v) p.intryck = p.intryck ?? [];
    (l.intryck ??= []).push({ om: q.id, namn: q.name, k: 'tjuv', v: 1, c: 1, t: s.now, bev: [{ h: 'stold', t: s.now, mot: d.id, motNamn: d.name, sett: true }] });
    const yxa = SIM.newTing(s, 'yxa', 1, q.id), fore = yxa.agare;
    klockan(s);
    s.now = s.now - (s.now % 86400000) + 20 * 3600000;
    for (let i = 0; i < 20 && !(s.styre!.ratt?.length); i++) { SIM.stepStyre(s); }
    const r = s.styre!.ratt?.[0];
    // tabu
    const a = 77; for (const p of v) (p.lardomar ??= []).push({ k: 'fara', a, v: 0.8, c: 0.8, t: s.now, led: 0, om: 'något hände' });
    SIM.tabuDygn(s);
    return [
      [`rättegången gäller lagens straff (${r ? SIM.STRAFF_NAMN[r.steg] : 'ingen'}) eller så efterlevdes lagen inte (${s.stat?.lag_ej_efterlevd ?? 0})`, !!r && r.steg === 4 || (s.stat?.lag_ej_efterlevd ?? 0) > 0],
      [`böterna går till den drabbade (${yxa.agare === d.id ? d.name : 'ingen'})`, !r || yxa.agare === d.id || yxa.agare === fore],
      [`en fruktad plats blir tabu (${s.tabun?.length})`, s.tabun?.length === 1],
    ];
  },
};
SCENARIER.sederfas8 = {
  text: 'Steg 8.4.11–8.4.15: sederna Krig och fred, Ägande och delning och Värna – Bruka låses upp när det de styr finns; Värna gör folk ledsna av fällda träd. Talen i Byggplanen följer sederna och ledaren',
  kor: () => {
    const { s, v, l } = medLedare();
    const l0 = SIM.sedOppen(s, 'natur');
    SIM.oppnaSed(s, 'natur');
    const varna = v.find(p => SIM.drar(s, p).natur < -0.2);
    SIM.naturTanke(s, 'Ett träd fälldes');
    const ledsen = !!varna?.thoughts.some(t => t.text === 'Ett träd fälldes');
    s.seder.v.gemenskap = 1; const tat = SIM.byplanNu(s).tat; s.seder.v.gemenskap = -1; const gles = SIM.byplanNu(s).tat;
    s.seder.v.nyfikenhet = 1; const rader = SIM.byplanNu(s).form;
    s.seder.v.nyfikenhet = -1; l.pot.nyfikenhet = 2; const ring = SIM.byplanNu(s).form;
    return [
      ['Värna – Bruka är låst tills träd fälls', !l0],
      ['den som drar åt Värna blir ledsen av ett fällt träd', !varna || ledsen],
      [`husen tätt eller glest följer sederna (${tat.toFixed(2)}, ${gles.toFixed(2)})`, tat > gles],
      [`ring eller rader följer sederna (${rader}, ${ring})`, rader === 'rader' && ring === 'ring'],
    ];
  },
};

const medTro = (seed = 6, niva = 2) => {
  const x = medLedare(seed), { s, v } = x;
  const tr: SIM.Tro = { id: 1, grundare: v[0].id, gnamn: v[0].name, t: s.now, ar: 1, k: 'drom', bakom: 'Rösten', vill: 'att man lyssnar', svek: 'det blir tyst', natur: 60, manga: 40, bekr: s.now, x: Math.floor(v[0].x), y: Math.floor(v[0].y), niva, namn: 'Rösternas väg' };
  s.tron = [tr];
  for (const p of v) { p.tro = 1; p.troStyrka = 60; p.andlig = 80; p.pot.karisma = 14; }
  return { ...x, tr };
};
SCENARIER.graven = {
  text: 'Steg 8.5.1 och 8.5.7: kroppen blir en sak där personen dog, en vuxen bär den till gravplatsen och gräver, och graven blir en ruta. Att se kroppen sänker humöret, mer för den som stod nära',
  kor: () => {
    const { s, v } = medLedare(), d = v[1], x0 = Math.floor(d.x);
    klockan(s, 10); tandEld(s); setFood(s, 200);
    SIM.die(s, d, 'alderdom');
    const kr = s.kvarlevor?.find(k => k.k === 'kropp' && k.vem === d.id);
    let h = 0;
    while (s.kvarlevor?.some(k => k.vem === d.id) && h < 72) { kor(s, 1); h++; }
    const g = s.gravar?.find(q => q.vem === d.id);
    return [
      [`kroppen ligger där hen dog (${kr?.x}, x0 ${x0})`, !!kr && kr.x === x0],
      [`kroppen begravs (${h} timmar)`, !!g],
      ['graven är en ruta som man kan fråga efter', !!g && SIM.gravAt(s, g.x, g.y) === g],
    ];
  },
};
SCENARIER.bonen = {
  text: 'Steg 8.5.2–8.5.4: bönen är fritid för den troende och ger humör och tro, bönen i nöd låses upp av andligheten och tron, och en bön som hjälpte eller inte hjälpte blir en upplevelse',
  kor: () => {
    const { s, v } = medTro(), p = v[1];
    const vikt = SIM.bonVikt(s, p);
    const t0 = p.troStyrka!;
    SIM.bonKlar(s, p, { tool: 'vardag' });
    const b = SIM.bonFritid(s, p);
    setFood(s, 0);
    const n = SIM.bonNod(s, p);
    const u = v[2]; u.troStyrka = 10; const inte = SIM.bonNod(s, u);
    p.bonVan = { t: s.now, o: 'svalt' }; setFood(s, 500); SIM.kultTimme(s);
    return [
      [`den andlige ber gärna (${vikt.toFixed(2)})`, vikt > 0.5],
      ['bönen stärker tron', p.troStyrka! > t0 || t0 >= 100],
      ['en vardagsbön om dagen', b === undefined],
      [`bönen i nöd för den som tror nog (${n?.o})`, n?.id === 'nod' && !inte],
      ['en bön som hjälpte räknas', (s.stat?.bon_hjalpte ?? 0) === 1],
    ];
  },
};
SCENARIER.ritualer = {
  text: 'Steg 8.5.5–8.5.14: en plats blir helig ur en händelse och där fälls och byggs inget, ritualerna samlar dem de gäller, prästen utses efter skalan, profeten ändrar tron och tron kan bytas när den svikit en',
  kor: () => {
    const { s, v, tr } = medTro(6, 3);
    SIM.kultTimme(s);
    const h = s.heliga?.[0], ingen = !!h && !SIM.usable(s, h.x, h.y);
    const pr = SIM.prastOf(s, tr);
    SIM.nyRitual(s, 'brollop', { om: [v[0].id, v[1].id], namn: 'Bröllopet' });
    s.ritual = undefined; SIM.ritualTimme(s);
    const r = s.ritual as SIM.Ritual | undefined, val = SIM.ritualVal(s, v[2]);
    return [
      [`platsen där tron föddes blir helig (${h ? SIM.HELIGA_PLATSER[h.k].namn : 'ingen'}), och där byggs inget`, ingen],
      [`prästen utses (${pr?.name}), ${pr ? SIM.prastSort(tr, pr.sex) : ''}`, !!pr],
      [`bröllopet samlar byn (${r?.namn})`, r?.k === 'brollop' && !!val],
      [`högtiderna följer skalan (${SIM.hogtider(tr)})`, SIM.hogtider(tr) >= 0],
    ];
  },
};
