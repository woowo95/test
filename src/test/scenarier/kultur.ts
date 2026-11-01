// Scenarier. Kulturen (fas 4.3): sporten, framträdandena, konsten i sakerna och pyntet i hemmen.
import { createState, Person, State } from '../../sim';
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, klockan, kor, medBank, setFood, tandEld } from './hjalp';

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
