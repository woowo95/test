// Scenarier. Sparning, historik och slumpföljder.
import { isDeepStrictEqual } from 'node:util';
import { Person, createState, addTool, getRel, step, living, serializeParts, joinParts, serialize, cloneState, amountOf, ageOf, DAY, State, migrate, die, housesOf, sumOf, setAmount, foodOf, STACK_ORDER, rnd, STROMMAR, Strom, BEAT, spar, SPARVERSION, tingOf, fnId, ALDER, stepFire, chooseTask } from '../../sim';
import * as SIM from '../../sim';
import { DOK_KB, START, STEG_DYGN, korBy } from '../kor';
import { kanonisk } from '../pool';
import { setItems, setFood, Koll, kor, SCENARIER } from './hjalp';

SCENARIER.historik = {
  lang: true,
  text: 'Byns historik: nyckeltalen varje timme den senaste veckan, sedan ett värde per dygn, och viktiga händelser i krönikan. Den sparas i en del per vecka och ändrar inget i byn',
  kor: () => {
    const s = createState(3, START), t = createState(3, START);
    for (let i = 0; i < 10 * STEG_DYGN; i++) { step(s, BEAT); step(t, BEAT); t.hist = undefined; } // t: utan historik
    const h = s.hist!, i = (id: string) => h.tal.indexOf(id) + 1;
    const timOk = h.tim.length >= 7 * 24 && h.tim.length <= 8 * 24 && h.tim[0][0] >= s.now - 8 * DAY;
    const dagar = h.dygn.map(r => Math.floor(r[0] / DAY)), ettPerDygn = dagar.every((d, k) => k === 0 || d === dagar[k - 1] + 1);
    const fortsatt = h.dygn.length > 0 && Math.floor(h.tim[0][0] / DAY) === dagar[dagar.length - 1] + 1;
    const folkOk = [...h.tim, ...h.dygn].every(r => r[i('folk')] >= 0 && r[i('folk')] <= 40 && r[i('humor')] >= 0 && r[i('humor')] <= 1 && r[i('skog')] > 0 && r[i('skog')] < 1);
    const sist = h.tim[h.tim.length - 1], fodda = h.kronika.filter(k => k[2] === 'k_fodd').length;
    const delar = serializeParts(s), hd = Object.keys(delar).filter(d => d.startsWith('historik-'));
    const storst = Math.max(...hd.map(d => new TextEncoder().encode(delar[d]).length)); // byte, som molndokumentet räknar
    const ater = JSON.parse(joinParts(Object.values(delar))).hist;
    const utan = JSON.parse(serialize(s)); delete utan.hist;
    // krönikans text beror inte på historiken: samma händelse ger samma text fast krönikan är kortare (kronikaBer)
    const ka = cloneState(s), kb = cloneState(s), p0 = living(s)[0];
    kb.hist!.kronika = kb.hist!.kronika.slice(0, 1);
    for (const k of [ka, kb]) for (let n = 0; n < 8; n++) SIM.kronikaBer(k, 'k_forstaEld', p0.id + n, SIM.personFalt(p0));
    const eldSerie = SIM.historikSerie(s, 'eld');
    const sammaText = isDeepStrictEqual(ka.hist!.kronika.slice(-8).map(r => r[1]), kb.hist!.kronika.slice(-8).map(r => r[1]));
    return [
      [`en rad i timmen den senaste veckan (${h.tim.length} timmar)`, timOk],
      [`äldre timmar är ett värde per dygn, utan luckor och fram till timmarna (${h.dygn.length} dygn)`, h.dygn.length >= 2 && ettPerDygn && fortsatt],
      ['nyckeltalen är rimliga (invånare, humör 0–1, skog som andel)', folkOk],
      [`födda och döda räknas upp som i byns statistik (${sist[i('fodda')]} födda, ${sist[i('doda')]} döda)`, sist[i('fodda')] === (s.stat?.fodda ?? 0) && sist[i('doda')] === (s.stat?.doda ?? 0)],
      [`krönikan har byns födslar och första eld (${h.kronika.length} rader)`, fodda === (s.stat?.fodda ?? 0) && h.kronika.some(k => k[2] === 'k_forstaEld') === s.fire.lightings > 0],
      [`historiken sparas i en del per vecka (${hd.join(', ')}; största ${Math.round(storst / 1024)} KB av högst ${DOK_KB})`, hd.length === 2 && storst < DOK_KB * 1024 && !delar.byn.includes('"hist"')],
      ['delarna blir samma historik igen', isDeepStrictEqual(ater, JSON.parse(serialize(s)).hist)],
      ['historiken ändrar inget i byn', JSON.stringify(utan) === serialize(t)],
      ['krönikans text beror inte på hur lång krönikan är', sammaText],
      // graferna (steg 5.4.1) läser serien: ett värde per dygn och sedan per timme, i tidsordning, från byns början till nu
      [`grafens serie för veden på elden går från byns början till nu (${eldSerie.length} punkter)`, eldSerie.length === h.dygn.length + h.tim.length && eldSerie.every((p, k) => k === 0 || p[0] > eldSerie[k - 1][0]) && eldSerie[0][0] < s.founded + DAY && eldSerie[eldSerie.length - 1][1] === sist[i('eld')]],
    ];
  },
};

SCENARIER.notisispelet = {
  text: 'Notiserna i spelet (steg 5.4.3.3): det som händer i byn (födslar, död, ny kunskap, nya hus, flyttar, ledare, faror) blir notiser, och de ligger kvar när byn laddas igen',
  lang: true,
  kor: () => {
    const s = createState(3, START);
    for (let i = 0; i < 8 * STEG_DYGN; i++) step(s, BEAT);
    const L = s.notiser?.lista ?? [], st = s.stat ?? {}, har = (id: string) => L.some(n => n.id === id);
    const rader = (id: string) => L.filter(n => n.id === id).reduce((a, n) => a + n.n, 0);
    const tek = Object.keys(st).filter(k => k.startsWith('tek_')).length;
    const delar = serializeParts(s), ater = migrate(JSON.parse(joinParts(Object.values(delar))));
    const kvar = isDeepStrictEqual(ater.notiser, JSON.parse(serialize(s)).notiser);
    return [
      [`byn har fått notiser (${L.length} st: ${[...new Set(L.map(n => n.id))].join(', ')})`, L.length > 0],
      [`varje födsel är en rad i en notis (${rader('fodd')} rader, ${st.fodda ?? 0} födda)`, rader('fodd') === (st.fodda ?? 0)],
      [`varje död är en rad i en notis (${rader('dod')} rader, ${st.doda ?? 0} döda)`, rader('dod') === (st.doda ?? 0)],
      [`ny kunskap blir en notis (${tek} tekniker)`, har('teknik') === tek > 0],
      [`ett nytt hus blir en notis (${housesOf(s).filter(h => h.klar || h.varKlar).length} färdiga hus)`, har('hus') === housesOf(s).some(h => h.klar || h.varKlar)],
      ['ingen notis har fler rader än den rymmer', L.every(n => n.rader.length <= SIM.NOTIS.rader && n.n >= n.rader.length)],
      ['notiserna ligger kvar när byn laddas igen', !!delar.notiser && kvar],
    ];
  },
};

SCENARIER.notiser = {
  text: 'Notiserna (steg 5.4.3.1, sim/notiser.ts): samma sort samma dygn blir en notis med flera rader, en ny dygn eller sort blir en ny, de är olästa tills de läses, den viktigaste kommer först, och de sparas i en egen del och blir samma igen',
  kor: () => {
    const s = createState(3, START);
    for (let i = 0; i < STEG_DYGN / 4; i++) step(s, BEAT);
    s.notiser = undefined; // byns egna notiser (steg 5.4.3.3) tas bort, så att bara scenariots räknas
    const [a, b] = living(s), utan = serialize(s);
    SIM.notis(s, 'fodd', `${a.name} fick ett barn.`, [a.id]);
    SIM.notis(s, 'fodd', `${b.name} fick ett barn.`, [b.id, a.id]);
    SIM.notis(s, 'byte', 'Ett byte.');
    const ett = s.notiser!.lista.length, f = s.notiser!.lista[0];
    s.now += DAY;
    SIM.notis(s, 'fodd', 'Ännu ett barn.');
    SIM.notis(s, 'dod', `${a.name} dog.`, [a.id], { x: 3, y: 4 });
    const olasta = SIM.olasta(s), forst = SIM.notiserNu(s)[0];
    SIM.lasNotis(s, f.nr);
    const efterLas = SIM.olasta(s);
    for (let i = 0; i < SIM.NOTIS.rader + 5; i++) SIM.notis(s, 'byte', `Byte ${i}.`);
    const byte = s.notiser!.lista.find(n => n.id === 'byte' && n.ar === SIM.kalender(s).ar)!;
    const delar = serializeParts(s), ater = JSON.parse(joinParts(Object.values(delar))).notiser, sammaIgen = isDeepStrictEqual(ater, JSON.parse(serialize(s)).notiser);
    let fel = false; try { SIM.notis(s, 'finnsinte', 'x'); } catch { fel = true; }
    const fore = s.notiser!.lista.length; SIM.taBortNotis(s, f.nr); const enMindre = s.notiser!.lista.length === fore - 1;
    SIM.taBortNotis(s); const tomma = s.notiser!.lista.length === 0;
    return [
      ['samma sort samma dygn blir en notis med flera rader och alla som den gäller', ett === 2 && f.n === 2 && f.rader.length === 2 && f.ids.length === 2],
      [`ett nytt dygn eller en ny sort blir en ny notis (${s.notiser ? fore : 0} st)`, fore === 5],
      [`de är olästa tills de läses (${olasta} olästa, ${efterLas} efter en läst)`, olasta === 4 && efterLas === 3],
      ['den viktigaste kommer först (döden)', forst.id === 'dod' && !!forst.plats],
      [`en ihopslagen notis behåller de senaste raderna men räknar alla (${byte.n} st)`, byte.rader.length === SIM.NOTIS.rader && byte.n === SIM.NOTIS.rader + 5 && byte.rader[byte.rader.length - 1] === `Byte ${SIM.NOTIS.rader + 4}.`],
      ['de sparas i en egen del och blir samma igen', !!delar.notiser && !delar.byn.includes('"notiser"') && sammaIgen],
      ['en by utan notiser sparas som förut', !utan.includes('"notiser"')],
      ['en okänd sort är ett fel', fel],
      ['de tas bort en och en eller alla', enMindre && tomma],
    ];
  },
};

SCENARIER.sparning = {
  lang: true,
  text: 'Byn sparas i delar som var och en ryms i ett dokument i molnet, och delarna blir samma by igen',
  kor: () => {
    const s = createState(11, START); // by 7, 9 och 10 svälter ut efter några dygn (2.10.9, 2.12.4); byn ska inte vara på väg att dö
    kor(s, 3 * 24);
    const delar = serializeParts(s), hel = serialize(s);
    const ater = JSON.parse(joinParts(Object.values(delar))), ny = migrate(JSON.parse(joinParts(Object.values(delar))));
    const kb = Object.fromEntries(Object.entries(delar).map(([d, t]) => [d, Math.round(t.length / 1024)]));
    // en by från före v40 (sparversion 1) med gamla fält från gången i levande läget uppgraderas en gång, i nummerordning
    const gammal = JSON.parse(hel), gp = gammal.people.find((p: Person) => p.task);
    gammal.v = 1; Object.assign(gp.task, { fynd: 2, wx: 1, wy: 1, hold: 5, stint: 3 }); (gp.rngs ??= {}).levande = 7;
    migrate(gammal);
    const uppgr = gammal.v === SPARVERSION && !['fynd', 'wx', 'wy', 'hold', 'stint'].some(k => k in gp.task) && !('levande' in gp.rngs);
    const igen = JSON.stringify(gammal); migrate(gammal);
    // en sparfil från före v40 där redskapen bara fanns som summor i s.items, bredvid annat: varje helt redskap blir ett ting
    const forr = JSON.parse(hel); delete forr.ting; delete forr.stackar; forr.items = { yxa: 2, grenar: 7 }; forr.v = 1;
    for (const p of forr.people) p.task = undefined;
    const fm = migrate(forr), yxor = tingOf(fm).filter(t => t.k === 'yxa').length, gamlaGrenar = amountOf(fm, 'grenar');
    // sparningen bara läser: en by som sparas varje timme som gränssnittet gör (serialize och serializeParts) blir samma
    // by som en som aldrig sparas. Två döda med en relation: den städas bort i timblocket (compact, steg.ts) i båda
    const sparaSomUI = (v: State) => { serialize(v); serializeParts(v); };
    const a = createState(8, START), b = createState(8, START);
    for (const v of [a, b]) { const [x, y] = living(v); getRel(v, x, y).op = 30; die(v, x, 'olycka'); die(v, y, 'olycka'); }
    const relDoda = Object.keys(a.rels).length;
    for (let h = 0; h < 3 * 24; h++) { kor(a, 1); kor(b, 1); sparaSomUI(b); }
    // oavsett i vilken ordning fälten skrivs (kanonisk): sparningen lägger kartorna packade i byn (packGround), och det första sparandet bestämmer var i texten
    const sparLika = kanonisk(serialize(a)) === kanonisk(serialize(b)), dodaStadat = Object.keys(a.rels).every(k => k.split('-').map(Number).some(id => living(a).some(q => q.id === id)));
    const forst: Koll[] = [
      [`en by som sparas varje timme blir samma by som en som inte sparas (tre dygn)`, sparLika],
      [`relationer mellan två döda städas bort i simuleringen (${relDoda} relationer före)`, dodaStadat],
      [`byn delas i ${Object.keys(delar).join(', ')} (${Object.entries(kb).map(([d, n]) => `${d} ${n} KB`).join(', ')})`, ['byn', 'folket', 'kartor', 'loggen'].every(d => d in delar) && delar.folket.includes('"people"') && !delar.byn.includes('"people"')],
      ['delarna blir samma by igen', isDeepStrictEqual(ater, JSON.parse(hel)) && ny.people.length === s.people.length && ny.now === s.now],
      [`en gammal by uppgraderas till sparversion ${SPARVERSION} och gamla fält försvinner`, uppgr],
      [`redskapen i en sparfil från före v40 blir ting (${yxor} yxor av 2, ${gamlaGrenar} grenar av 7)`, yxor === 2 && Math.abs(gamlaGrenar - 7) < 1e-6],
      ['en uppgraderad by ändras inte av att uppgraderas igen', JSON.stringify(gammal) === igen],
      [`en ny by har den senaste sparversionen (${s.v})`, s.v === SPARVERSION],
      // näringsvärdena och mättnaden avrundas var för sig; profilen får inte jämnas ut till mättnaden vid inläsningen
      ['näringsvärdena är kvar efter inläsningen', ny.people.every((p: Person) => !p.naring || SIM.naringNu(p) === p.naring) && ny.people.some((p: Person) => p.naring && new Set(Object.values(p.naring)).size > 1)],
    ];
    // En sparad och inläst by (sparad och läst in) fortsätter giltig med samma folk, förråd, hus och
    // redskap. Den fortsätter inte exakt som den som aldrig sparades: sparfilen avrundar talen till tre decimaler, och det
    // som räknas fram på nytt efter inläsningen kan skilja lite. Därför prövas bara att båda är giltiga och ligger nära
    const txt = serialize(s), inl = migrate(JSON.parse(txt));
    const folk = (q: State) => living(q).map(p => `${p.id} ${p.name}`).join();
    const saker = (q: State) => JSON.stringify([housesOf(q).map(h => [h.id, h.klar, fnId(h)]), tingOf(q).map(g => [g.k, g.agare]).sort()]);
    const forrad = STACK_ORDER.every(k => Math.abs(amountOf(s, k) - amountOf(inl, k)) < 0.01);
    const sammaFil = kanonisk(serialize(inl)) === kanonisk(txt), sammaBy = folk(s) === folk(inl) && forrad && saker(s) === saker(inl), n0 = living(inl).length;
    // stacken och ägarnas delar avrundas var för sig: delarna får ändå aldrig bli mer än stacken i den inlästa byn
    const kop = cloneState(s), st0 = kop.stackar![0], [ag1, ag2] = living(kop);
    st0.n = 6.2494; st0.ag = { [ag1.id]: 0.5806, [ag2.id]: 5.6688 };
    const st1 = cloneState(kop).stackar![0], agSum = sumOf(st1.ag);
    const fs = korBy(s.seed, 2, undefined, s), fi = korBy(s.seed, 2, undefined, inl);
    const nara = `${living(s).length} och ${living(inl).length} invånare, mat ${foodOf(s).toFixed(0)} och ${foodOf(inl).toFixed(0)}, trä ${amountOf(s, 'ved').toFixed(0)} och ${amountOf(inl, 'ved').toFixed(0)}`;
    return [
      ...forst,
      ['en sparad och inläst by blir samma sparfil igen', sammaFil],
      [`ägarnas delar blir inte mer än stacken efter avrundningen (${agSum.toFixed(3)} av ${st1.n})`, agSum <= st1.n + 1e-9],
      [`den inlästa byn har samma folk (${n0}), förråd, hus och redskap`, sammaBy],
      [`båda fortsätter två dygn (två år i spelet) utan vaktlarm${[...fs.vakter, ...fi.vakter].length ? `: ${[...fs.vakter, ...fi.vakter].join('; ')}` : ''}`, !fs.vakter.length && !fi.vakter.length],
      [`och ligger nära varandra: ${nara}`, Math.abs(living(s).length - living(inl).length) <= 2],
    ];
  },
};

// hur många slumptal f drar ur byns följd k (varje tal flyttar följden lika långt, slump.ts)
function drag(s: State, k: Strom, f: () => void) {
  rnd(s, k); // följden finns
  const fore = s.rngs![k]!; f();
  let x = fore, n = 0;
  while (x !== s.rngs![k] && n < 1e5) { x = (x + 0x6d2b79f5) | 0; n++; }
  return n;
}
SCENARIER.slump = {
  lang: true,
  text: 'Varje system och varje person har en egen slumpföljd, och det som bara syns i spelet rör aldrig byns följder',
  kor: () => {
    const serie = (s: State, k: Strom, p?: Person) => Array.from({ length: 5 }, () => rnd(s, k, p));
    const a = createState(5, START), b = createState(5, START), pa = living(a)[0], pb = living(b)[0];
    for (let i = 0; i < 100; i++) rnd(b, 'eld'); // ett system drar fler tal i den ena byn
    const lika = isDeepStrictEqual(serie(a, 'val'), serie(b, 'val')) && isDeepStrictEqual(serie(a, 'arbete', pa), serie(b, 'arbete', pb));
    const c = createState(5, START), olika = new Set([...Object.keys(STROMMAR).map(k => serie(c, k as Strom)[0]), ...living(c).map(p => serie(c, 'val', p)[0])]);
    // spelet spelar in vägen folk går för att rita den (spar), och det får inte ändra något i byn
    const d = createState(9, START), e = createState(9, START);
    spar.pa = true; spar.v = new WeakMap();
    for (let i = 0; i < 12 * 24; i++) step(d, BEAT);
    spar.pa = false;
    for (let i = 0; i < 12 * 24; i++) step(e, BEAT);
    const inspelning = serialize(d) === serialize(e);
    // nattens vakt och den som tänder elden väljs med ett slumptal per kandidat, inte i sorteringens jämförelser (då beror
    // antalet slumptal på webbläsarens sorteringsalgoritm)
    const g = createState(5, START), vuxna = () => living(g).filter(q => ageOf(q, g.now) >= ALDER.vaktFran && ageOf(q, g.now) < ALDER.vaktTill);
    while (vuxna().length < 4) g.people.push({ ...structuredClone(vuxna()[0]), id: g.nextId++, task: undefined, rngs: undefined });
    g.now = new Date(g.now).setHours(23, 0, 0, 0);
    for (const q of living(g)) Object.assign(q, { toa: 1, torst: 1, warm: 1, rest: 1, health: 1, hunger: 1, task: undefined });
    g.lastGuardDay = -999;
    const vd = drag(g, 'val', () => chooseTask(g, vuxna()[0]));
    Object.assign(g.fire, { lit: false, fuel: 0, emberUntil: undefined, ring: true });
    setItems(g, { torrgras: 10, grenar: 10, flinta: 2 }); setAmount(g, 'ved', 10);
    for (const q of living(g)) q.task = undefined;
    const tandare = living(g).filter(q => ageOf(q, g.now) >= ALDER.ansvar).length;
    const ed = drag(g, 'eld', () => stepFire(g, 1, living(g)));
    const tande = living(g).some(q => q.task?.act === 'tanda');
    // var en person går (promenad, strand, flinta, trädet som fälls) väljs med personens egen följd, inte byns
    const h = createState(6, START), hv = () => living(h).filter(q => ageOf(q, h.now) >= ALDER.vuxen);
    h.now = new Date(h.now).setHours(10, 0, 0, 0); Object.assign(h.fire, { lit: true, fuel: 4, ring: true });
    h.delning = { andel: 1 }; // byn delar all mat, så att ingen familj behöver samla egen mat (maten läggs hos byn här)
    for (const q of h.people) q.tek = { ...q.tek, yxa: 1 };
    const sett = new Set<string>();
    const hd = drag(h, 'val', () => {
      for (const [mat, flinta, ved] of [[200, 1, 50], [200, 0, 50], [200, 1, 0]]) {
        setFood(h, mat); setItems(h, { flinta, torrgras: 20, grenar: 20 }); setAmount(h, 'ved', ved);
        for (const q of hv()) addTool(h, 'yxa', q);
        for (let i = 0; i < 200; i++) {
          const p = hv()[i % hv().length];
          Object.assign(p, { toa: 1, torst: 1, warm: 1, rest: 1, health: 1, hunger: 1, social: 1, task: undefined });
          chooseTask(h, p); if (p.task) sett.add(p.task.sok ? 'flinta' : p.task.act); p.task = undefined;
        }
      }
    });
    const valen = ['promenad', 'strand', 'flinta', 'falla'];
    return [
      [`var en person går väljs med personens egen slumpföljd (${hd} tal ur byns, för ${valen.filter(a => sett.has(a)).join(', ')})`, hd === 0 && valen.every(a => sett.has(a))],
      [`nattens vakt väljs med ett slumptal per vuxen (${vd} tal för ${vuxna().length} vuxna)`, vd === vuxna().length && living(g).some(q => q.guardDay !== undefined && q.guardDay === g.lastGuardDay)],
      [`den som tänder elden väljs med ett slumptal per kandidat (${ed} tal för ${tandare} och platsen)`, tande && ed === tandare + 1],
      ['fler slumptal i ett system ändrar inte slumpen i de andra', lika],
      [`varje system och varje person får egna tal (${olika.size} olika av ${Object.keys(STROMMAR).length + living(c).length})`, olika.size === Object.keys(STROMMAR).length + living(c).length],
      ['spelets inspelning av gångvägarna ändrar inget i byn (ett dygn)', inspelning],
    ];
  },
};

SCENARIER.karta = {
  text: 'Steg 2.10.9: en ny by får kartan 120 × 120. En äldre by (80 × 50) får den stora kartan när den laddas: den gamla kartan ligger kvar i mitten och ser ut som förut, och allt i byn flyttas lika mycket',
  kor: () => {
    const ny = createState(4, START), nyOk = ny.W === 120 && ny.H === 120 && !ny.kart;
    const s = createState(4, START, { W: 80, H: 50 });
    kor(s, 30);
    for (let d = 0; d < 120 && !Object.keys(s.sjoar ?? {}).length; d++) kor(s, 1); // tills någon fiskat i en sjö (upp till fem dygn: sedan steg 3.10.9 fiskar byn mindre när förrådet räcker)
    SIM.useMap(s);
    const txt = serialize(s), m0 = SIM.getMap(s.seed), f0 = { ...m0.fire }, tiles0 = m0.tiles.slice(), g0 = SIM.groundOf(s);
    const cover0 = g0.cover.slice(), trees0 = g0.trees.slice(), tagen0 = SIM.takenOf(s), sjo0 = SIM.sjoarna(s.seed).id.slice();
    const folk0 = s.people.map(p => ({ x: p.x, y: p.y, tx: p.task?.tx, ty: p.task?.ty }));
    const stack0 = (s.stackar ?? []).map(a => ({ x: a.x, y: a.y }));
    const lard0 = s.people.map(p => (p.lardomar ?? []).map(l => ({ x: (l.a % 10) * 8, y: Math.floor(l.a / 10) * 8 })));
    const sjoar0 = Object.keys(s.sjoar ?? {}).map(Number).map(k => sjo0.indexOf(k));
    const t = migrate(JSON.parse(txt)), ox = t.kart?.x ?? 0, oy = t.kart?.y ?? 0, ny0 = (i: number) => (i % 80 + ox) + (Math.floor(i / 80) + oy) * 120;
    const m1 = SIM.getMap(t.seed), g1 = SIM.groundOf(t), tagen1 = SIM.takenOf(t), sjo1 = SIM.sjoarna(t.seed).id;
    const storlek = t.W === 120 && t.H === 120 && ox % 8 === 0 && oy % 8 === 0 && ox > 0 && oy > 0;
    let fel = 0;
    for (let i = 0; i < 80 * 50; i++) {
      const j = ny0(i);
      if (m1.tiles[j] !== tiles0[i] || Math.abs(g1.cover[j] - cover0[i]) > 0.003 || Math.abs(g1.trees[j] - trees0[i]) > 0.003) fel++;
      for (const k of Object.keys(tagen0) as (keyof typeof tagen0)[]) if (Math.abs(tagen1[k]![j] - tagen0[k]![i]) > 0.003) fel++;
    }
    const eld = m1.fire.x === f0.x + ox && m1.fire.y === f0.y + oy;
    const lika = (a: number, b: number) => Math.abs(a - b) < 0.002; // sparfilen avrundar lägena
    const folk = t.people.every((p, n) => lika(p.x, folk0[n].x + ox) && lika(p.y, folk0[n].y + oy) && (folk0[n].tx === undefined || (lika(p.task!.tx, folk0[n].tx! + ox) && lika(p.task!.ty, folk0[n].ty! + oy))));
    const stackar = (t.stackar ?? []).every((a, n) => lika(a.x, stack0[n].x + ox) && lika(a.y, stack0[n].y + oy)) && stack0.length === (t.stackar ?? []).length;
    const lardomar = t.people.every((p, n) => (p.lardomar ?? []).every((l, k) => SIM.areaOf(lard0[n][k].x + ox, lard0[n][k].y + oy) === l.a));
    const sjoar = sjoar0.length > 0 && sjoar0.every(i => i >= 0 && t.sjoar?.[sjo1[ny0(i)]] !== undefined);
    // utanför den gamla kartan: orörd mark med skog, och sjöar och sten som bruset ger
    let skog = 0, land = 0;
    for (let y = 0; y < 120; y++) for (let x = 0; x < 120; x++) if (x < ox || y < oy || x >= ox + 80 || y >= oy + 50) { const i = y * 120 + x; if (m1.tiles[i] !== SIM.T.Vatten) land++; if (g1.trees[i] >= 0.5) skog++; }
    // en gång: byn flyttas inte igen när den sparas och laddas på nytt, och den lever vidare på den stora kartan
    const u = migrate(JSON.parse(serialize(t))), engang = u.kart?.x === ox && u.kart?.y === oy && SIM.getMap(u.seed).fire.x === m1.fire.x;
    kor(u, 24);
    const lever = u.people.every(p => p.died !== undefined || p.left !== undefined || (SIM.inMap(p.x, p.y) && Number.isFinite(p.x)));
    return [
      [`en ny by får kartan 120 × 120 (${ny.W} × ${ny.H})`, nyOk],
      [`den äldre byn får kartan 120 × 120 med den gamla kartan i mitten, på hela lärdomsområden (hörnet ${ox}, ${oy})`, storlek],
      [`den gamla kartan ser ut som förut: marken, stigarna, skogen och det som tagits ur platserna (${fel} fel)`, fel === 0],
      ['elden ligger på samma ställe på den gamla kartan', eld],
      ['människorna och det de är på väg till flyttas lika mycket', folk],
      [`stackarna flyttas lika mycket (${stack0.length})`, stackar],
      ['lärdomarna gäller samma rutor som förut', lardomar],
      [`sjöarnas fiske följer med sjön (${sjoar0.length} sjöar)`, sjoar],
      [`utanför den gamla kartan fortsätter landet med skog (${land} rutor land, ${skog} med skog)`, land > 3000 && skog > 1000],
      ['byn flyttas en gång: den ligger kvar när den sparas och laddas igen', engang],
      ['byn lever vidare på den stora kartan', lever],
    ];
  },
};

SCENARIER.kartminne = {
  text: 'Kartan över tid (steg 5.4.5.2): en bild av kartan per dygn (ett år i spelet) i historiken, med marken, stigarna, skogen, fälten och det som byggts men utan folk. Bilder äldre än fyra veckor glesas ut till en per vecka. De sparas i veckans del och visas i krönikan under Kartan, där ett reglage går fram och tillbaka genom åren',
  kor: () => {
    const s = createState(3, START), e = SIM.eldPlats(s);
    s.hist ??= { tal: [], tim: [], dygn: [], kronika: [] };
    const tom = SIM.kartrutor(s), forstGras = tom.findIndex((k, i) => (k === 'h' || k === 'k') && Math.abs(i % SIM.W - e.x) > 3);
    const wx = forstGras % SIM.W, wy = Math.floor(forstGras / SIM.W);
    (s.byggen ??= []).push({ id: 9001, x: wx, y: wy, k: 'vagg', m: 'timmer', b: 1, mat: 0, c: 1 } as SIM.Bit, { id: 9002, x: wx + 1, y: wy, k: 'golv', m: 'jord', b: 0, mat: 0, c: 1 } as SIM.Bit);
    const r = SIM.kartrutor(s), p = SIM.packaKarta(r);
    const bokstaver = new Set(SIM.KARTRUTA.map(k => k.k));
    // en bild per dygn: samma dygn ger ingen ny, nästa dygn en till
    const t0 = s.now;
    SIM.kartminneSteg(s); SIM.kartminneSteg(s); const n1 = s.hist.kartor!.length;
    s.now += DAY; SIM.kartminneSteg(s); const n2 = s.hist.kartor!.length;
    // 40 dygn (40 år i spelet): de som är äldre än fyra veckor blir en per vecka
    for (let d = 2; d <= 40; d++) { s.now = t0 + d * DAY; SIM.kartminneSteg(s); }
    const k = s.hist.kartor!, grans = s.now - SIM.GLES;
    const gamla = k.filter(b => b[0] < grans), veckor = new Set(gamla.map(b => Math.floor((b[0] - s.founded) / SIM.WEEK)));
    const nya = k.filter(b => b[0] >= grans);
    const delar = SIM.histParts(s, s.hist), ater = SIM.joinHist(Object.values(delar));
    return [
      [`bilden packas och läses tillbaka likadant (${Math.round(p.length / 1024 * 10) / 10} KB för ${SIM.W}×${SIM.H} rutor)`, isDeepStrictEqual(SIM.lasKarta(p), r) && p.length < 20 * 1024],
      ['bara registrets slag på bilden (inga människor eller djur)', r.every(x => bokstaver.has(x))],
      ['vatten, gräs och skog finns på bilden', ['v', 's'].every(x => r.includes(x)) && (r.includes('h') || r.includes('k'))],
      ['en byggd vägg syns, ett golv som inte påbörjats syns inte', r[wy * SIM.W + wx] === 'w' && r[wy * SIM.W + wx + 1] !== 'g'],
      ['elden syns där den är', r[Math.floor(e.y) * SIM.W + Math.floor(e.x)] === 'e'],
      [`en bild per dygn (${n1} samma dygn, ${n2} dygnet efter)`, n1 === 1 && n2 === 2],
      [`äldre än fyra veckor en per vecka (${gamla.length} gamla bilder i ${veckor.size} veckor, ${nya.length} nya)`, gamla.length === veckor.size && nya.length >= 28 && nya.length <= 29],
      ['bilderna sparas i veckans del och blir samma igen', isDeepStrictEqual(ater.kartor, k)],
    ];
  },
};
