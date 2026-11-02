// Scenarier. Kulturen (fas 4.3): sporten, framträdandena, konsten i sakerna och pyntet i hemmen.
import { createState, Person, State } from '../../sim';
import * as SIM from '../../sim';
import { START } from '../kor';
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
      klockan(s, 10);
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
  kor: () => {
    const ny = createState(9, START), start = ny.people.every(p => Math.abs(p.skill.skaldskap - p.skill.berattande * SIM.SKALD_START) < 1e-9);
    const { s, v } = kvall(), p = v[0]!;
    p.skill.skaldskap = 0; const lag = SIM.framKval(s, p), kanLag = SIM.FRAMTRADANDEN.filter(d => (d.min ?? 0) <= p.skill.skaldskap).length;
    p.skill.skaldskap = 10; const hog = SIM.framKval(s, p), kanHog = SIM.FRAMTRADANDEN.filter(d => (d.min ?? 0) <= p.skill.skaldskap).length;
    p.skill.skaldskap = 3; upptrad(s, p); kor(s, 1.5); const efter = p.skill.skaldskap, ggr = p.gjort?.t.upptradt ? 1 : 0;
    // i samtalen: de som berättar men aldrig uppträder blir också bättre
    let vaxte = 0;
    for (const seed of [5, 6, 7]) { // tre byar: i en enda by kan några berättelser avgöra
      const d = rikDag(seed), fore = new Map(SIM.living(d).map(q => [q.id, q.skill.skaldskap]));
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
