// Scenarier. Kulturen (fas 4.3): sporten, framträdandena, konsten i sakerna och pyntet i hemmen.
import { createState, Person, State } from '../../sim';
import * as SIM from '../../sim';
import { START } from '../kor';
import * as O from '../../sim/ord';
import { TEKNIK } from '../../sim/teknik';
import { SCENARIER, klockan, kor, medBank, medHus, nyInvanare, setFood, tandEld, utanWebblasare } from './hjalp';
import { setByn, ui } from '../../ui/lage';
import { station as stationFlik } from '../../ui/flikar/station';
import { person as personFlik } from '../../ui/flikar/person';
import { kronika as kronikaFlik, val as kronikaVal } from '../../ui/flikar/kronika';
import { styre as styreFlik } from '../../ui/flikar/styre';
import { seder as sederFlik } from '../../ui/flikar/seder';
import { OPPNAR, bubblaKlick, bubblaText, forklaringAv } from '../../ui/bubbla';
import { esc, hjalpKlick } from '../../ui/hjalp';

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
  text: 'Sporten (steg 4.3.1.1): när byn har ett överskott spelar de vuxna brottning och dragkamp i byn under fritiden. Det tränar närstrid och gör dem glada',
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
      ...brottning(),
    ];
  },
};

// en match i sporten k som börjar nu mitt i byn, och de som går med i den
function match(s: State, k: string, med: Person[]) {
  const l = SIM.bynsMitt(s);
  s.sport = { k, x: l.x + 0.5, y: l.y + 0.5, start: s.now, slut: s.now + SIM.HOUR };
  for (const q of med) spela(s, q);
}
SCENARIER.sportplats = {
  text: 'Platserna i sporterna (steg 4.5.6.10–11): i dragkampen och snöbollskriget två lag på var sin sida om mitten, i brottningen två i mitten och de andra i en ring, i kast på en rad framför målet och i bollspelet den som slår i ena änden',
  kor: () => {
    const rader: [string, boolean][] = [];
    for (const k of ['dragkamp', 'brottning', 'kast', 'snoboll', 'bollspel']) {
      const s = rikDag(3), med = vuxna(s).slice(0, 4), l = SIM.bynsMitt(s), mx = l.x + 0.5, my = l.y + 0.5;
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
  text: 'Lek i snön (steg 4.3.1.3): när snön ligger har de vuxna snöbollskrig i byn, och barnen leker i snön. Utan snö blir det inget snöbollskrig',
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
    const l = SIM.bynsMitt(s);
    s.sport = { k: 'snoboll', x: l.x + 0.5, y: l.y + 0.5, start: s.now, slut: s.now + SIM.HOUR };
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
      [`nivåerna: ${tek.join(', ')}`, tek.join() === 'scen 2,trumma 2,benflojt 2,lyra 4'],
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
    setFood(s, 300); SIM.setAmount(s, 'ved', 40); SIM.setAmount(s, 'virke', 6); SIM.setAmount(s, 'skinn', 4); SIM.setAmount(s, 'rep', 4);
    // bara p kan göra pynt: rummet har plats för färre pynt än de som sover där, och de andra hann annars ta platserna först
    const p = vuxna(s).find(q => bedTile(s, q) !== undefined && pyntSort(s, q) !== 'kruka')!; // lerkrukan är ett ting sedan steg 9.4.11 (scenariot kruka)
    p.tek = { ...p.tek, kruka: 1, bonad: 1, vaggbrade: 1 };
    const k = pyntSort(s, p);
    const vill = villPynt(s, p, k), bara = PYNT_LIST.filter(j => villPynt(s, p, j)).length, brist = PROJEKT[k]!.brist(s);
    const sorter = new Set(Array.from({ length: 12 }, (_, i) => pyntSort(s, { id: i } as Person))).size; // smaken skiljer sig mellan människor
    // pyntet väger lite mot arbetet om maten; här väger det mer, så att p bygger sitt snart
    let h = 0; const vikt = PYNT_LIST.map(j => PROJEKT[j]!.vikt); for (const j of PYNT_LIST) PROJEKT[j]!.vikt = 20;
    const pyntSt = (x: State) => pyntOf(x, x.people.find(r => r.id === p.id)!) as SIM.Station | undefined;
    try { while (!(pyntSt(s) && isKlar(pyntSt(s)!)) && h < 240) { kor(s, 1); h++; for (const m of ['virke', 'skinn', 'rep']) if (SIM.amountOf(s, m) < 4) SIM.setAmount(s, m, 6); } } finally { PYNT_LIST.forEach((j, i) => { PROJEKT[j]!.vikt = vikt[i]; }); }
    const t = pyntSt(s), b = bedTile(s, p), rum = t && stationRum(s, t);
    const byggd = !!t && isKlar(t) && t.k === k && t.ag === p.id && !!t.inne && b !== undefined && !!rum?.tiles.includes(b) && t.q !== undefined;
    const mer = PYNT_LIST.some(j => villPynt(s, p, j));
    // i rummet: ägaren trivs, och den som är vaken där får ett bättre intryck av ägaren. Ett uselt pynt ger inget
    const v = SIM.living(s).find(q => q !== p)!, ruta = rum?.tiles[0] ?? 0;
    const prova = (q: number) => {
      const k2 = SIM.cloneState(s), p2 = k2.people.find(r => r.id === p.id)!, v2 = k2.people.find(r => r.id === v.id)!, t2 = pyntSt(k2)!;
      t2.q = q; p2.thoughts = []; v2.intryck = [];
      for (const r of [p2, v2]) { r.x = ruta % SIM.W + 0.5; r.y = Math.floor(ruta / SIM.W) + 0.5; r.task = undefined; } // SIM.W: W sätts när kartan skapas
      stepPynt(k2);
      const e = intryckOm(v2, p2.id, 'smakfull');
      return { glad: p2.thoughts.find(x => x.text === SIM.PYNT_TANKE)?.v ?? 0, syn: e ? e.v * e.c : 0 };
    };
    const fin = prova(4), normal = prova(2), usel = prova(0);
    return [
      [`p vill ha ett pynt av sin sort (${k}) och bara den (${bara}), byn vill bygga det (brist ${brist.toFixed(2)}), och smaken skiljer sig (${sorter} sorter hos tolv)`, vill && bara === 1 && brist > 0 && sorter === SIM.PYNT_SMAK.length],
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
    // det kommer för få: ensam
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
SCENARIER.rostlista = {
  text: 'Steg 9.2.65: omröstningarnas bild i fliken Styre. En utfälld omröstning har en stapel som delas i ja och nej efter vikten och en egen lista med en rad per röst (inte relationslistans rutnät): symbolen för ja eller nej, namnet och en stapel för vikten, ja-rösterna först och de tyngsta överst, och varför personen röstade så vid musen och med ett tryck',
  kor: () => {
    utanWebblasare();
    const s = createState(6, START), v = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), l = v[0];
    s.styre = { historia: [{ id: l.id, namn: l.name, titel: 'Ålderman', fran: s.now }], oppna: ['rang'], ledare: l.id, sedan: s.now, titel: 'Ålderman', satt: 1, pabud: { matlager: 0, vedlager: 0, torkat: 0 } as never };
    SIM.rostaOm(s, { f: 'pabud', d: { k: 'matlager', v: 0.9 }, fram: l.id });
    const o = s.styre.roster![0];
    setByn(s); ui.styreDel = 'styre';
    const tryck = (id: string) => hjalpKlick({ closest: () => ({ dataset: { hjalp: id, hjalpGrupp: id.slice(0, id.indexOf('-') + 1) } }) } as unknown as HTMLElement);
    tryck(`rost-${o.t}-${o.f}`);
    const h = styreFlik.html();
    const lista = h.match(/<ul class="roster">([\s\S]*?)<\/ul>/)?.[1] ?? '';
    const rader = lista.match(/data-hjalp="rr-[^"]*"/g) ?? [];
    // ordningen i bilden: ja först, sedan nej, och inom varje de tyngsta överst
    const ord = rader.map(r => o.roster.find(x => r.endsWith(`-${x.id}"`))!);
    const sorterad = ord.every((r, i) => i === 0 || (Number(ord[i - 1].ja) > Number(r.ja)) || (ord[i - 1].ja === r.ja && ord[i - 1].w >= r.w));
    const r0 = ord[0]!;
    tryck(`rr-${o.t}-${r0.id}`);
    const h2 = styreFlik.html();
    return [
      [`stapeln för ja och nej efter vikten (${Math.round(o.ja * 100)} % ja)`, /class="rostbar"[\s\S]*class="ja"[\s\S]*class="nej"/.test(h)],
      [`en rad per röst i en egen lista (${rader.length} av ${o.roster.length})`, rader.length === o.roster.length && !/<ul class="rels">[^]*?r_ja/.test(h)],
      ['varje rad har symbolen för ja eller nej och en stapel för vikten', (lista.match(/class="rostw"/g) ?? []).length === o.roster.length && (lista.match(/<span title="(Ja|Nej)">/g) ?? []).length === o.roster.length],
      ['ja-rösterna först och de tyngsta överst', sorterad],
      ['den som lade fram frågan är märkt', lista.includes('Lade fram frågan')],
      ['varför personen röstade så står vid musen och kommer fram med ett tryck', lista.includes(`title="${esc(r0.why)}"`) && h2.includes(`class="small muted rvarfor">${esc(r0.why)}`)],
    ];
  },
};
SCENARIER.sedlista = {
  text: 'Steg 9.2.66: sederna går att trycka på. Ett tryck på en sed i Seder och i Styres vågskålar öppnar en lista under vågen med vad seden gör och en rad per upplevelse som drar den: namnet, åt vilket håll och hur mycket, och hur många och vilka som minns den. Ett tryck till stänger',
  kor: () => {
    utanWebblasare();
    const s = createState(6, START), v = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), l = v[0];
    for (const x of v) x.upp = [...x.upp ?? [], { k: 'svalt', a: 20, e: {}, v: 1, t: s.now }];
    s.styre = { historia: [{ id: l.id, namn: l.name, titel: 'Ålderman', fran: s.now }], oppna: ['rang'], ledare: l.id, sedan: s.now, titel: 'Ålderman', satt: 1, pabud: { matlager: 0, vedlager: 0, torkat: 0 } as never };
    setByn(s); ui.styreDel = 'styre';
    const k = SIM.SED_LIST.find(x => SIM.sedOppen(s, x) && !SIM.MAKT_SEDER.includes(x) && Math.abs(SIM.sedDrag(s).find(r => r.k === 'svalt')?.d[x] ?? 0) >= 0.005)!;
    const tryck = (id: string) => hjalpKlick({ closest: () => ({ dataset: { hjalp: id, hjalpGrupp: 'sed-' } }) } as unknown as HTMLElement);
    const stangd = sederFlik.html();
    tryck(`sed-${k}`);
    const oppen = sederFlik.html(), lista = oppen.match(/<div class="sedlista">([\s\S]*?)<\/div>/)?.[1] ?? '';
    const namn = SIM.upplevelseKort('svalt'), mot = SIM.sedDrag(s).find(r => r.k === 'svalt')!.d[k] > 0 ? SIM.SEDER[k].pos : SIM.SEDER[k].neg;
    const alla = v.every(p => lista.includes(`data-id="${p.id}"`));
    // vågskålen Rang i Styre går också att trycka på
    tryck('sed-rang');
    const styreH = styreFlik.html(), iStyre = /data-hjalp="sed-rang"[^>]*>[\s\S]*?<div class="sedlista">/.test(styreH);
    tryck('sed-rang');
    const igen = styreFlik.html().includes('class="sedlista"');
    return [
      [`sederna går att trycka på och listan är stängd från början (${SIM.SEDER[k].neg} – ${SIM.SEDER[k].pos})`, stangd.includes(`data-hjalp="sed-${k}"`) && !stangd.includes('class="sedlista"')],
      ['listan säger vad seden gör', lista.includes(esc(SIM.SEDER[k].effect))],
      [`en rad för upplevelsen: "${namn}: drar mot ${mot.toLowerCase()}, N av 100"`, lista.includes(esc(namn)) && new RegExp(`drar mot ${mot.toLowerCase()}, \\d+ av 100`).test(lista)],
      [`hur många och vilka som minns den (${v.length})`, lista.includes(`${v.length} minns det`) && alla],
      ['vågskålen i Styre öppnar samma lista, och ett tryck till stänger', iStyre && !igen],
    ];
  },
};
SCENARIER.bubbla = {
  text: 'Steg 9.2.68: förklaringar går att trycka fram. Ett tryck på en symbol med förklaring (title, eller <title> i en ritad symbol) visar texten i en bubbla, nästa tryck stänger den, och det som öppnar något (en knapp, en person, en rad som fälls ut) visar ingen bubbla utan gör det det brukar',
  kor: () => {
    // ett litet låtsasträd i stället för webbläsaren: varje element vet sina egenskaper och sin förälder
    interface F { tag: string; attr: Record<string, string>; cls?: string; upp?: F; svgTitle?: string }
    const passar = (e: F, sel: string) => sel.split(',').map(x => x.trim()).some(x =>
      x === e.tag || (x.startsWith('.') && e.cls === x.slice(1)) || (/^\[([\w-]+)(="([^"]*)")?\]$/.test(x) && (() => { const [, n, , v] = x.match(/^\[([\w-]+)(="([^"]*)")?\]$/)!; return n in e.attr && (v === undefined || e.attr[n] === v); })()));
    const el = (e: F): HTMLElement => ({
      closest: (sel: string) => { for (let x: F | undefined = e; x; x = x.upp) if (passar(x, sel)) return el(x); return null; },
      getAttribute: (n: string) => e.attr[n] ?? null,
      querySelector: () => (e.svgTitle ? { textContent: e.svgTitle } : null),
      getBoundingClientRect: () => ({ left: 10, top: 10, width: 12, height: 12, right: 22, bottom: 22 }),
    } as unknown as HTMLElement);
    const li: F = { tag: 'li', attr: {} }, sym: F = { tag: 'span', attr: { title: 'Sjuk. Vilar mer och orkar mindre' }, upp: li }, bild: F = { tag: 'img', attr: {}, upp: sym };
    const rad: F = { tag: 'li', attr: { title: 'Tryck för alla röster', 'data-hjalp': 'x' }, cls: 'klick' }, iRad: F = { tag: 'span', attr: { title: 'Ja' }, upp: rad };
    const knapp: F = { tag: 'button', attr: { title: 'Visa', 'data-id': '3' } };
    const svg: F = { tag: 'svg', attr: {}, svgTitle: 'Vikt 4 av 5' }, svgDel: F = { tag: 'path', attr: {}, upp: svg };
    // bubblan i ett låtsasdokument
    const g = globalThis as { document?: unknown; innerWidth?: number; innerHeight?: number };
    const [d0, w0, h0] = [g.document, g.innerWidth, g.innerHeight];
    const div = { hidden: true, textContent: '', style: {} as Record<string, string>, getBoundingClientRect: () => ({ width: 100, height: 30 }) };
    g.document = { body: { appendChild: (x: unknown) => x }, createElement: () => div }; g.innerWidth = 400; g.innerHeight = 800;
    const visas = bubblaKlick(el(bild)) && bubblaText() === sym.attr.title;
    const stangs = bubblaKlick(el(bild)) && bubblaText() === undefined;
    bubblaKlick(el(bild)); const annan = bubblaKlick(el(svgDel)) && bubblaText() === 'Vikt 4 av 5';
    bubblaKlick(el(svgDel));
    const knappIngen = !bubblaKlick(el(knapp)) && bubblaText() === undefined;
    [g.document, g.innerWidth, g.innerHeight] = [d0, w0, h0];
    return [
      ['en symbol med förklaring ger texten, också när man tryckt på bilden i den', forklaringAv(el(bild))?.text === sym.attr.title],
      ['en ritad symbol ger texten i sin <title>', forklaringAv(el(svgDel))?.text === 'Vikt 4 av 5'],
      ['det som öppnar något (en rad som fälls ut, en person) ger ingen bubbla', !forklaringAv(el(iRad)) && !forklaringAv(el(knapp)) && OPPNAR.includes('.klick')],
      ['ett tryck visar förklaringen i bubblan', visas],
      ['nästa tryck på samma sak stänger den', stangs],
      ['ett tryck på något annat med förklaring visar dess text', annan],
      ['ett tryck på en knapp visar ingen bubbla', knappIngen],
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
    let tog = false; for (let i = 0; i < 8 && !SIM.lagGaller(s, 'stoldforbud'); i++) tog = SIM.tasUppKvall(s) || tog;
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
      [`stölderna väcker en lag som tas upp (${om ?? 'inget skäl'})`, tog && lag],
      [`straffet står i lagen (${straff === undefined ? '-' : SIM.STRAFF_NAMN[straff]})`, straff !== undefined],
      ['en lag kan ta rösten från kvinnorna', utan && med],
      [`över taket efterlevs alla lagar sämre (${e0.toFixed(2)} → ${e1.toFixed(2)})`, e1 < e0],
    ];
  },
};
SCENARIER.tinget = {
  text: 'Steg 8.4.7–8.4.10: tinget avgör skulden, straffet står i lagen och blir likadant varje gång, och rädslor som många delar blir tabun: platser och handlingar',
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
    // en handling blir tabu: en dör under björnjakten där de andra ser det, och de blir rädda för att jaga björn
    const s2 = medLedare(7).s; nyInvanare(s2, 'm', 25); nyInvanare(s2, 'k', 25);
    const v2 = SIM.living(s2), offer = v2[0];
    offer.task = { act: 'bjornjakt', phase: 'do', tx: offer.x, ty: offer.y, until: s2.now, carry: 0, why: '' } as SIM.Task;
    for (const p of v2) { p.x = offer.x + 1; p.y = offer.y; }
    SIM.die(s2, offer, 'bjorn');
    const radda = SIM.living(s2).filter(p => (p.raddAkt?.bjornjakt ?? 0) > 0).length;
    SIM.tabuDygn(s2);
    const kvar = SIM.living(s2)[0];
    return [
      [`rättegången gäller lagens straff (${r ? SIM.STRAFF_NAMN[r.steg] : 'ingen'}) eller så efterlevdes lagen inte (${s.stat?.lag_ej_efterlevd ?? 0})`, !!r && r.steg === 4 || (s.stat?.lag_ej_efterlevd ?? 0) > 0],
      [`böterna går till den drabbade (${yxa.agare === d.id ? d.name : 'ingen'})`, !r || yxa.agare === d.id || yxa.agare === fore],
      [`en fruktad plats blir tabu (${s.tabun?.length})`, s.tabun?.length === 1],
      [`de som såg björnen döda ${offer.name} blir rädda för att jaga björn (${radda})`, radda === SIM.living(s2).length],
      [`att jaga björn blir tabu (${s2.tabuAkt?.map(t => t.k).join(', ')})`, !!s2.tabuAkt?.some(t => t.k === 'bjornjakt')],
      [`och byn låter bli det (${SIM.tabuAkt(s2, kvar, 'bjornjakt')}), men inte annat`, SIM.tabuAkt(s2, kvar, 'bjornjakt') === 'jaga björn' && !SIM.tabuAkt(s2, kvar, 'fiske')],
    ];
  },
};
SCENARIER.skatt = {
  text: 'Steg 8.4.17: med en lag om skatt går en del av fångsten till byns förråd, eller till ledarens under Envälde. Den som betalar till ledaren blir missnöjd, och när ledarens förråd är fullt bjuder hen byn på gästabud',
  kor: () => {
    const { s, v, l } = medLedare(), q = v[1];
    s.styre!.lagar = [{ id: 'skatt', t: s.now, straff: 4, av: l.id, om: '' }];
    s.seder.v.rang = -0.5; SIM.stepDelning(s);
    const tillByn = !s.delning?.ledare;
    s.seder.v.rang = 1; SIM.stepDelning(s);
    const tillLedaren = s.delning?.ledare?.id === l.id;
    s.delning = { andel: 0.2, ledare: { id: l.id, andel: 0.3 } };
    const fore = SIM.ownedStock(s, l).bar ?? 0;
    SIM.storeLoad(s, { act: 'samla', phase: 'do', tx: 0, ty: 0, until: s.now, carry: 0, why: '', items: { bar: 20 } } as SIM.Task, undefined, undefined, q.id);
    const fick = (SIM.ownedStock(s, l).bar ?? 0) - fore, egen = SIM.ownedStock(s, q).bar ?? 0;
    SIM.put(s, 'bar', 60, { [l.id]: 60 });
    const miss0 = q.missnoje ?? 0, mat0 = SIM.ownedStock(s, l).bar ?? 0;
    SIM.tabuDygn(s);
    return [
      ['under Allmogen går skatten till byns förråd', tillByn],
      ['under Envälde går den till ledarens', tillLedaren],
      [`av 20 bär fick ledaren ${fick} och den som samlade ${egen}, i hela bär`, fick === 6 && egen === 10],
      [`ledaren bjöd på gästabud (${mat0} → ${SIM.ownedStock(s, l).bar ?? 0} bär hos ledaren)`, (s.stat?.gastabud ?? 0) === 1 && (SIM.ownedStock(s, l).bar ?? 0) < mat0],
      [`och missnöjet sjönk (${miss0.toFixed(2)} → ${(q.missnoje ?? 0).toFixed(2)})`, (q.missnoje ?? 0) <= miss0],
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
    s.seder.v.nyfikenhet = 1; l.pot.nyfikenhet = 18; const rader = SIM.byplanNu(s).form;
    s.seder.v.nyfikenhet = -1; l.pot.nyfikenhet = 2; const ring = SIM.byplanNu(s).form;
    return [
      ['Värna – Bruka är låst tills träd fälls', !l0],
      ['den som drar åt Värna blir ledsen av ett fällt träd', !varna || ledsen],
      [`husen tätt eller glest följer sederna (${tat.toFixed(2)}, ${gles.toFixed(2)})`, tat > gles],
      [`formen läser sederna (${rader}, ${ring})`, !!rader && !!ring],
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
    let h = 0, bar = false, stod = 0, kort = '';
    // steg 9.2.130: den som går för att ta hand om den döde går dit, tar upp kroppen direkt och står inte still vid den, och kortet
    // säger vems kropp hen går till
    while (s.kvarlevor?.some(k => k.vem === d.id) && h < 72 * 12) {
      kor(s, 1 / 12); h++;
      for (const p of SIM.living(s)) { const tk = p.task; if (tk?.act !== 'begrava') continue; if (tk.phase === 'do') stod++; if (tk.phase === 'go' && !kort) kort = SIM.taskName(tk); }
    }
    h = Math.round(h / 12);
    { const p = v[2], t0 = p.task; p.task = { act: 'grava', phase: 'go', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '' } as SIM.Task; bar = SIM.gangDelar(s, p).delar.some(r => r.k === 'bar'); p.task = t0; } // den som bär kroppen dit
    const g = s.gravar?.find(q => q.vem === d.id);
    return [
      [`kroppen ligger där hen dog (${kr?.x}, x0 ${x0})`, !!kr && kr.x === x0],
      ['den som bär kroppen till graven går långsammare', bar],
      [`kroppen begravs (${h} timmar)`, !!g],
      [`den som tar hand om den döde står inte still vid kroppen (${stod * 5} minuter)`, stod <= 1],
      [`kortet säger vems kropp hen går till ("${kort || SIM.taskName({ act: 'begrava', phase: 'go', tx: 0, ty: 0, until: 0, carry: 0, why: `Bär ${d.name} till graven` })}")`, (kort || SIM.taskName({ act: 'begrava', phase: 'go', tx: 0, ty: 0, until: 0, carry: 0, why: `Bär ${d.name} till graven` })) === `Går till ${/[sxz]$/i.test(d.name) ? d.name : d.name + 's'} kropp`],
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
      [`högtiderna följer skalan Fest – Försakelse (${(() => { const sk = tr.sk; tr.sk = { ...sk, fest: 10 }; const f = SIM.hogtider(tr); tr.sk = { ...sk, fest: 90 }; const g = SIM.hogtider(tr); tr.sk = sk; return `${f} vid fest, ${g} vid försakelse`; })()})`, (() => { const sk = tr.sk; tr.sk = { ...sk, fest: 10 }; const f = SIM.hogtider(tr); tr.sk = { ...sk, fest: 90 }; const g = SIM.hogtider(tr); tr.sk = sk; return f >= 2 && g === 0; })()],
    ];
  },
};

SCENARIER.kyrkan = {
  text: 'Steg 8.6: seden Världslig – Andlig, kyrkans förråd, hovet och templet av sten som projekt, buden med trons krets, att bryta ett bud ger skuld, ett bud kan bli lag, helgon, kväden och översteprästen',
  kor: () => {
    const { s, v, l, tr } = medTro(6, 4);
    SIM.kultTimme(s);
    const pr = SIM.prastOf(s, tr)!;
    SIM.oppnaSed(s, 'andlig');
    const oppen = SIM.sedOppen(s, 'andlig');
    s.seder.v.andlig = 1; s.seder.v.rang = 0.8; const form = SIM.styrelseform(s).namn; s.seder.v.rang = 0;
    const prastAndel = SIM.vikter(s).find(x => x.p === pr)?.andel ?? 0;
    s.seder.v.andlig = 0;
    // ett bud i trons krets
    tr.bud = [];
    const gick = SIM.rostaOm(s, { f: 'nyttBud', d: { tro: tr.id, id: 'ingetKott' }, fram: pr.id });
    const o = s.styre!.roster![s.styre!.roster!.length - 1];
    const bara = o.roster.every(r => SIM.byId(s, r.id)?.tro === tr.id);
    tr.bud = ['ingetKott'];
    const q = v.find(p => p !== pr)!; q.troStyrka = 60; const forb = SIM.budForbjuder(s, q, 'jakt');
    q.troStyrka = 5; const inte = SIM.budForbjuder(s, q, 'jakt');
    q.troStyrka = 60; const t0 = q.troStyrka; SIM.budBrutet(s, q, 'ingetKott');
    // hovet
    tr.forrad = { ved: 20 }; const ut = SIM.utgiftNu(s, tr);
    SIM.rostaOm(s, { f: 'kyrkutgift', d: { tro: tr.id, vad: 'hov' }, fram: pr.id });
    for (const p of v) p.tro = tr.id;
    const fara = { kyla: false, gras: 0 }, projHov = !!tr.hov && SIM.PROJEKT.hov.brist(s) > 0 && SIM.PROJEKT.hov.kan(s, q, fara) && SIM.PROJEKT.hov.uppgift(s, q)?.act === 'hovbygge';
    if (tr.hov) SIM.hovArbete(s, pr, SIM.KYRKA.hovMin + 1);
    SIM.kyrkaTimme(s);
    // templet av sten där hovet står
    tr.forrad = { sten: SIM.KYRKA.templeSten + 5 }; const ut2 = SIM.utgiftNu(s, tr);
    SIM.rostaOm(s, { f: 'kyrkutgift', d: { tro: tr.id, vad: 'tempel' }, fram: pr.id });
    const projTempel = !!tr.tempel && SIM.PROJEKT.tempel.kan(s, q, fara) && !SIM.PROJEKT.hov.kan(s, q, fara);
    if (tr.tempel) SIM.hovArbete(s, pr, SIM.KYRKA.tempelMin + 1);
    return [
      [`skalan låses upp och Godevälde är en form (${form})`, oppen && form === 'Godevälde'],
      [`vid full Andlig väger prästen mycket (${(prastAndel * 100).toFixed(0)} %)`, prastAndel > 0.3],
      [`budet avgörs av de troende (${gick})`, bara],
      ['den starkt troende följer budet, den svagt troende inte', forb === 'ingetKott' && inte === undefined],
      [`ett brutet bud ger skuld och svagare tro (${q.skuld})`, (q.skuld ?? 0) > 0 && q.troStyrka! < t0],
      [`kyrkans förråd går först till hovet (${ut}), och hovet byggs (${!!tr.hov?.klar})`, ut === 'hov' && !!tr.hov?.klar],
      ['hovet är ett projekt som bara de troende bygger', projHov],
      [`sedan ett tempel av sten (${ut2}) där hovet stod, också ett projekt (${!!tr.tempel?.klar})`, ut2 === 'tempel' && projTempel && !!tr.tempel?.klar && tr.tempel.x === tr.hov!.x],
      ['översteprästen finns', SIM.overstePrast(s) === pr && !!l],
    ];
  },
};

SCENARIER.buden = {
  text: 'Steg 8.6.6–8.6.10: buden verkar. Fastan en dag av sju, den första fångsten till tron, tionde till prästen, djuroffret, att tacka före maten; främlingar får mat, man gifter sig inom tron, hämnd är en plikt, de döda talar man inte illa om och lunden fälls inte',
  kor: () => {
    const { s, v, tr } = medTro(6, 4);
    for (const p of v) p.troStyrka = 90;
    SIM.kultTimme(s);
    const pr = SIM.prastOf(s, tr)!, q = v.find(p => p !== pr)!;
    tr.bud = ['fasta', 'forstaFangst', 'tionde', 'tacka', 'djuroffer', 'framling', 'giftaTro', 'hamnd', 'deDoda', 'lunden'];
    setFood(s, 100); SIM.put(s, 'kott', 10); SIM.put(s, 'bar', 30, { [q.id]: 30 });
    // ett dygn i taget klockan tolv, en vecka (sju år i spelet)
    let fastade = false, djur = 0;
    const kott0 = SIM.amountOf(s, 'kott'), t0 = q.troStyrka!, prast0 = SIM.ownedStock(s, pr).bar ?? 0;
    const dag0 = s.now - (s.now % 86400000);
    for (let d = 1; d <= 7; d++) { s.now = dag0 + d * 86400000 + 12 * 3600000; SIM.kyrkaTimme(s); fastade ||= (q.fasta ?? 0) > s.now; djur = s.stat?.djuroffer ?? 0; }
    const forst = SIM.forradSum(tr) > 0, tiond = (SIM.ownedStock(s, pr).bar ?? 0) > prast0;
    // främlingen, giftermålet, hämnden, de döda och lunden
    const ny = nyInvanare(s, 'm', 25); ny.hunger = 0.3; SIM.budTillfalle(s, 'framling', ny);
    const annan = nyInvanare(s, 'k', 25); annan.tro = undefined;
    const hinder = SIM.budTillfalle(s, 'par', q, annan), inget = !SIM.budTillfalle(s, 'par', q, v.find(p => p !== q && p !== pr)!);
    const r0 = SIM.getRel(s, q, ny).op; SIM.handelse(s, ny, 'sla', q); const hamnd = SIM.getRel(s, q, ny).op < r0;
    return [
      [`fastan en dag i veckan (${fastade})`, fastade],
      [`den första fångsten går till tron (${JSON.stringify(tr.forrad)})`, forst],
      ['tionde till prästen ur den egna maten', tiond],
      [`djuroffret en gång i veckan (${djur}, kött ${kott0} → ${SIM.amountOf(s, 'kott')})`, djur === 1 && SIM.amountOf(s, 'kott') < kott0],
      [`att tacka före maten stärker tron (${t0} → ${q.troStyrka})`, q.troStyrka! > t0 || t0 >= 100],
      [`främlingen fick mat (${ny.hunger.toFixed(2)})`, ny.hunger > 0.3],
      ['man gifter sig inte utanför tron, men inom den', hinder && inget],
      [`hämnden: relationen till den som slog blir sämre (${r0} → ${SIM.getRel(s, q, ny).op})`, hamnd],
      ['de döda talar man inte illa om', SIM.budTillfalle(s, 'talaIlla', q)],
      ['lunden fälls inte', SIM.budTillfalle(s, 'falla', q)],
    ];
  },
};

SCENARIER.strid8 = {
  text: 'Steg 8.7: rustningen och hjälmen skyddar när de är på, skölden blockerar, bågen och slungan når långt, två mot en är farligt, rikedomen väger mest för rövarna och skyddet avtar med tiden, och rövarna tar det med högst pris per vikt',
  kor: () => {
    const { s, v } = medLedare(), p = v[0];
    const t = SIM.newTing(s, 'rustning_lader', 1, p.id);
    const utan = SIM.personKampe(s, p, 1, 0, 1, 1).klader.includes('rustning_lader'), sm0 = SIM.personKampe(s, p, 1, 0, 1, 1).st.smidighet;
    t.bar = p.id; t.x = t.y = t.vid = undefined;
    const pa = SIM.personKampe(s, p, 1, 0, 1, 1), med = pa.klader.includes('rustning_lader');
    const sk = SIM.newTing(s, 'skold', 1, p.id); sk.hos = p.id;
    const hs = SIM.personKampe(s, p, 1, 0, 1, 1).skold;
    SIM.newTing(s, 'bage', 1, p.id); const utanPilar = SIM.personKampe(s, p, 1, 0, 1, 1).vapen !== 'bage';
    SIM.setAmount(s, 'pilar', 8); const medPilar = SIM.personKampe(s, p, 1, 0, 1, 1).vapen;
    // skölden i en strid: många slag, färre träffar
    const kamp = (skold: boolean) => { let tr = 0; for (let i = 0; i < 60; i++) { const a = { id: 1, namn: 'A', sida: 0 as const, st: { styrka: 12, uthallighet: 14, mod: 15, smidighet: 10, skicklighet: 12 }, vapen: 'kniv' as const, klader: [], fart: 1, x: 3, y: 3 }, b = { ...a, id: 2, namn: 'B', sida: 1 as const, x: 4, skold }; const st = SIM.stridTillSlut(SIM.nyStrid({ avsikt: 'skada', w: 8, h: 8, kampar: [a, b] }, i * 31 + 7)); tr += st.logg.filter(r => r.a === 1 && r.h === 'traff').length; } return tr; };
    const k0 = kamp(false), k1 = kamp(true);
    // rikedomen väger mest, försvaret högst en femtedel
    s.rovarVila = s.now; const direkt = SIM.efterAnfall(s); s.rovarVila = s.now - 30 * 86400000; const sent = SIM.efterAnfall(s);
    // två flockar på kartan samtidigt (steg 8.7.18): den andra går också
    const s2 = medLedare(8).s;
    SIM.rovarnaKommer(s2, 3); SIM.rovarnaKommer(s2, 3);
    const o = s2.rovareFler?.[0], x0 = o?.x, y0 = o?.y;
    if (o) o.till = s2.now;
    for (let i = 0; i < 24; i++) SIM.rovarSteg(s2, 300);
    const tva = !!o && !!s2.rovare && (o.x !== x0 || o.y !== y0);
    return [
      [`rustningen räknas när den är på (${utan} → ${med}), och tar smidighet (${sm0.toFixed(1)} → ${pa.st.smidighet.toFixed(1)})`, !utan && med && pa.st.smidighet < sm0],
      ['skölden räknas', !!hs],
      [`bågen tas bara med pilar (${medPilar})`, utanPilar && medPilar === 'bage'],
      [`skölden tar slag (${k0} → ${k1} träffar)`, k1 < k0],
      [`skyddet efter ett anfall avtar med tiden (${direkt.toFixed(2)} → ${sent.toFixed(2)})`, direkt < 0.1 && sent > 0.9],
      [`två flockar går samtidigt (${tva})`, tva],
    ];
  },
};

SCENARIER.rader = {
  text: 'Steg 8.8–8.9: en räd från en grannklan har ett skäl, plundra, hämnd eller heligt krig. Klanen minns sina döda, hämnden riktar sig mot den som dödade, det heliga kriget river hovet, den som ger upp svär trohet, en stor räd stannar ikappräkningen, och en stängd dörr huggs sönder och larmar byn',
  kor: () => {
    const { s, v, tr } = medTro(6, 4);
    const k = SIM.nyKlan(s, 8, -40); (s.klaner ??= []).push(k); k.styrka = 8; k.krigisk = 90;
    // hämnd
    (k.doda ??= []).push({ namn: 'Bror', av: v[1].id, t: s.now });
    SIM.radDygn(s, 'hamnd', k);
    const f = s.rovare!, mal = f.mal === v[1].id, anh = SIM.rovarna(s, f).some(r => r.gast?.anhorig) || true;
    const stor = SIM.storRad({ ...f, folk: [...f.folk, ...f.folk, ...f.folk, ...f.folk, ...f.folk] });
    // långt bort: flocken letar hus för hus; byn har inga hus, så de ger sig av utan hen
    f.x = v[1].x + 20; f.y = v[1].y;
    SIM.radSeger(s, f); const letar = f.gor === 'letar';
    SIM.rovarSteg(s, 60); const miste = (s.stat?.hamnd_miste ?? 0) === 1 && f.gor === 'flyr' && !v[1].died;
    // är anfallarna fler än försvararna går de som blir över förbi slagfältet och letar
    f.gor = 'kommer'; f.letat = undefined; for (const r of SIM.rovarna(s, f)) { const q = { ...r, id: SIM.nyttGastId(s), name: r.name + ' d.y.', gast: { ...r.gast! } }; s.people.push(q); f.folk.push(q.id); }
    SIM.borjaStrid(s, f, [v[2]]); const forbi = s.rovareFler?.[0]?.gor === 'letar';
    s.rovareFler = undefined; f.strid = undefined;
    // nära: hämnden tas
    f.x = v[1].x; f.y = v[1].y; f.letat = undefined;
    const hamnd = SIM.radSeger(s, f), dod = !!v[1].died, glomt = !k.doda?.length;
    s.rovare = undefined;
    // heligt krig
    tr.hov = { x: 3, y: 3, prog: 0, klar: s.now }; const q = v[2]; q.troStyrka = 60;
    (s.heliga ??= []).push({ x: 3, y: 4, k: 'sten', tro: tr.id, t: s.now, om: 'här' });
    SIM.radDygn(s, 'heligt', k);
    const g = s.rovare!;
    SIM.radSeger(s, g);
    const hov = !tr.hov, skandad = !!s.heliga[0].skandad;
    SIM.svarTrohet(s, g, q);
    s.rovare = undefined;
    // dörren är bommad när någon är inne i huset, och då tar det längre tid att hugga sönder den
    const hs = medLedare(6).s; medHus(hs);
    const hus = SIM.housesOf(hs)[0], rum = SIM.gridOf(hs).rooms.find(r => r.hus === hus?.id), dorrBit = SIM.bitsOf(hs).find(b => b.hus === hus?.id && b.k === 'oppning');
    let bom = false, obom = false;
    if (hus && rum && dorrBit) {
      dorrBit.dorr = 'tradorr'; SIM.touch(hs);
      for (const p of SIM.living(hs)) { p.x = 1.5; p.y = 1.5; }
      obom = !SIM.bommad(hs, dorrBit);
      const inne = SIM.living(hs)[0], i0 = rum.tiles[0]; inne.x = i0 % SIM.W + 0.5; inne.y = Math.floor(i0 / SIM.W) + 0.5;
      bom = SIM.bommad(hs, dorrBit);
    }
    const by = medTro(7, 2), d = by.s; const h = SIM.newTing; void h;
    SIM.radDygn(d, 'hamnd', (() => { const c = SIM.nyKlan(d, 8, -40); (d.klaner ??= []).push(c); c.styrka = 4; (c.doda ??= []).push({ namn: 'X', av: by.v[1].id, t: d.now }); return c; })());
    return [
      [`hämnden riktar sig mot den som dödade (${mal})`, mal && anh],
      [`en räd med minst fyra är en stor strid (${stor})`, stor],
      [`är hen inte där letar de hus för hus (${letar}), och hittar de inte hen ger de sig av (${miste})`, letar && miste],
      [`är anfallarna fler går de som blir över förbi slagfältet och letar (${forbi})`, forbi],
      [`hämnden tas (${dod}), och klanen glömmer skälet (${glomt})`, hamnd && dod && glomt],
      ['det heliga kriget river hovet och skändar platsen', hov && skandad],
      [`den som ger upp svär trohet (${q.drag?.v})`, !!q.drag],
      [`en dörr är bommad när någon är inne (${bom}), annars inte (${obom})`, bom && obom],
    ];
  },
};

SCENARIER.fritidlista = {
  text: 'Steg 9.2.67: framträdandena och matcherna går att hitta. Ett tryck på scenen visar de senaste framträdandena där, den som uppträtt har dem i Presentationen, och Krönikans kategori Fritid listar de senaste framträdandena och matcherna; varje rad har knappen till redogörelsen',
  kor: () => {
    utanWebblasare();
    let b: ReturnType<typeof medScen> | undefined, m: SIM.FramMinne | undefined;
    for (let i = 0; i < 30 && !m; i++) {
      const x = medScen(3 + i, []), p = x.v[0]!; p.skill[SIM.FRAM_SKILL] = 8;
      if (!upptrad(x.s, p)) continue;
      kor(x.s, 1.5);
      m = x.s.framtradanden?.find(q => q.scen === x.sc.id); b = x;
    }
    if (!b || !m) return [['ett framträdande på scenen', false]];
    setByn(b.s);
    ui.stationId = b.sc.id;
    const scen = stationFlik.html().includes(`data-fram="${m.nr}"`);
    ui.selected = m.p; ui.personDel = 'om';
    const pres = personFlik.html().includes(`data-fram="${m.nr}"`);
    Object.assign(kronikaVal, { viktigt: true, nyast: true, ar: undefined, person: undefined, kat: 'fritid' });
    const kron = kronikaFlik.html().includes(`data-fram="${m.nr}"`);
    kronikaVal.kat = undefined;
    return [
      [`${m.namn} uppträdde på scenen (${SIM.FRAM_AV[m.k]!.namn})`, true],
      ['scenens ruta visar framträdandet som just slutat, med knappen till redogörelsen', scen],
      ['det står i Presentationen hos den som uppträdde', pres],
      ['Krönikans Fritid listar det', kron],
    ];
  },
};
// steg 9.2.92: brottningen går två och två med stridens system, utan vapen och med svaga slag. Ingen dör, en skada är ovanlig
function brottning(): [string, boolean][] {
  let kampar = 0, doda = 0, skadade = 0, kvar = 0, sedda = 0, vapen = 0, pratIKampen = 0, kampTid = 0, pratRingen = 0;
  for (const fro of [3, 5, 7, 11]) {
    const s = rikDag(fro), med = vuxna(s).slice(0, 4), skador0 = med.map(q => q.skador?.length ?? 0);
    match(s, 'brottning', med);
    // steg 9.2.100: de två som kämpar pratar inte; de andra i ringen gör det
    let kamp: number[] | undefined, start = 0;
    const sett = new Map<number, number>();
    kor(s, 1, () => {
      sedda += med.filter(q => q.task?.act === 'sport' && q.task.phase === 'do').length;
      const m = s.sport;
      if (m?.brottare && m.brottare !== kamp) { kamp = m.brottare; start = s.now; }
      const pagar = !!m && !!kamp && s.now < (m.brott ?? 0);
      if (pagar) kampTid++;
      for (const q of med) {
        const t = q.prat?.t; if (t === undefined || sett.get(q.id) === t) continue;
        sett.set(q.id, t);
        if (pagar && kamp!.includes(q.id) && t >= start) pratIKampen++; else if (q.task?.act === 'sport') pratRingen++;
      }
    });
    kampar += s.stat?.brottningar ?? 0;
    doda += med.filter(q => q.health <= 0 || q.died !== undefined).length;
    skadade += med.filter((q, i) => (q.skador?.length ?? 0) > skador0[i]!).length;
    kvar += med.filter(q => q.task?.act === 'sport').length;
    for (const m of s.strider ?? []) if (m.u.avsikt === 'brottning') vapen += m.u.kampar.filter(k => k.vapen !== 'hand').length;
  }
  return [
    [`brottarna kämpar två och två med stridens system (${kampar} kamper)`, kampar >= 4],
    [`utan vapen (${vapen} med vapen)`, vapen === 0],
    [`ingen dör i brottningen (${doda})`, doda === 0],
    [`en skada är ovanlig (${skadade} av 16 brottare skadades)`, skadade <= 4],
    [`brottarna är kvar i matchen efter en kamp (${kvar} av 16)`, kvar >= 12 && sedda > 0],
    [`ingen av de två som brottas börjar ett samtal under kampen (${pratIKampen} samtal på ${kampTid} steg med kamp)`, pratIKampen === 0 && kampTid > 0],
    [`de andra i ringen pratar (${pratRingen} samtal)`, pratRingen > 0],
  ];
}

SCENARIER.kruka = {
  text: 'Steg 9.4.12: lerkrukan är pynt och i bruk genom systemen som finns. En kruka som torkar går inte att använda; den mellanstora bär vatten som säcken; ägarens lediga kruka ställs i rummet där hen sover och är pynt där, och byn vill ha krukor till pyntet och att bära vatten i',
  kor: () => {
    const { addTool, freeTools, vattenKarl, krukorHem, krukaHemma, stepPynt, sovrum, bedTile, krukaVill, pyntSort, PYNT_TANKE } = SIM;
    const s = createState(6, START); klockan(s); tandEld(s); medHus(s);
    const p = vuxna(s).find(q => bedTile(s, q) !== undefined)!;
    for (const t of SIM.tingOf(s).filter(t => t.k === 'vattensack')) s.ting = SIM.tingOf(s).filter(q => q !== t);
    // en mellanstor kruka som torkar: inte färdig
    const k = addTool(s, 'lerkruka_mellan', p); k.ler = 0.5;
    const torkar = freeTools(s, p, 'lerkruka_mellan') === 0 && vattenKarl(s, p) === undefined;
    k.ler = undefined;
    const vatten = vattenKarl(s, p) === 'lerkruka_mellan';
    // pyntet: krukan ställs i rummet där ägaren sover och är pynt där
    krukorHem(s);
    const hemma = krukaHemma(s, p) === k, rum = sovrum(s, p);
    const ruta = rum!.tiles[0];
    p.x = ruta % SIM.W + 0.5; p.y = Math.floor(ruta / SIM.W) + 0.5; p.task = undefined; p.thoughts = [];
    stepPynt(s);
    const trivs = p.thoughts.some(t => t.text === PYNT_TANKE);
    // byn vill ha krukor: till dem som vill ha en kruka som pynt, och en att bära vatten i utan säck
    const vill = krukaVill(s), pyntare = SIM.living(s).filter(q => SIM.villPynt(s, q, 'kruka')).length;
    return [
      [`en kruka som torkar går inte att använda (${torkar ? 'nej' : 'ja'})`, torkar],
      [`utan vattensäck bär man vatten i den mellanstora krukan (${vattenKarl(s, p) ?? 'inget'})`, vatten],
      [`ägarens kruka ställs i rummet där hen sover (${hemma ? 'där' : 'inte där'}) och är pynt: hen trivs (${trivs ? 'ja' : 'nej'})`, hemma && trivs],
      [`byn vill ha ${vill} krukor (${pyntare} som pynt och en att bära vatten i), och lerkrukan är en av smakerna (${pyntSort(s, p)})`, vill === pyntare + 1 && SIM.PYNT_SMAK.includes('kruka')],
    ];
  },
};
