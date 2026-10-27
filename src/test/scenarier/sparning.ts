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
    const sist = h.tim[h.tim.length - 1], fodda = h.kronika.filter(k => k[1].endsWith('föddes.')).length;
    const delar = serializeParts(s), hd = Object.keys(delar).filter(d => d.startsWith('historik-'));
    const storst = Math.max(...hd.map(d => new TextEncoder().encode(delar[d]).length)); // byte, som molndokumentet räknar
    const ater = JSON.parse(joinParts(Object.values(delar))).hist;
    const utan = JSON.parse(serialize(s)); delete utan.hist;
    return [
      [`en rad i timmen den senaste veckan (${h.tim.length} timmar)`, timOk],
      [`äldre timmar är ett värde per dygn, utan luckor och fram till timmarna (${h.dygn.length} dygn)`, h.dygn.length >= 2 && ettPerDygn && fortsatt],
      ['nyckeltalen är rimliga (invånare, humör 0–1, skog som andel)', folkOk],
      [`födda och döda räknas upp som i byns statistik (${sist[i('fodda')]} födda, ${sist[i('doda')]} döda)`, sist[i('fodda')] === (s.stat?.fodda ?? 0) && sist[i('doda')] === (s.stat?.doda ?? 0)],
      [`krönikan har byns födslar och första eld (${h.kronika.length} rader)`, fodda === (s.stat?.fodda ?? 0) && h.kronika.some(k => k[1].includes('första eld')) === s.fire.lightings > 0],
      [`historiken sparas i en del per vecka (${hd.join(', ')}; största ${Math.round(storst / 1024)} KB av högst ${DOK_KB})`, hd.length === 2 && storst < DOK_KB * 1024 && !delar.byn.includes('"hist"')],
      ['delarna blir samma historik igen', isDeepStrictEqual(ater, JSON.parse(serialize(s)).hist)],
      ['historiken ändrar inget i byn', JSON.stringify(utan) === serialize(t)],
    ];
  },
};

SCENARIER.sparning = {
  text: 'Byn sparas i delar som var och en ryms i ett dokument i molnet, och delarna blir samma by igen',
  kor: () => {
    const s = createState(7, START);
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
    ];
    // En sparad och inläst by (städad med compact, sparad och läst in) fortsätter giltig med samma folk, förråd, hus och
    // redskap. Den fortsätter inte exakt som den som aldrig sparades: sparfilen avrundar talen till tre decimaler, och det
    // som räknas fram på nytt efter inläsningen kan skilja lite. Därför prövas bara att båda är giltiga och ligger nära
    (SIM as unknown as { compact?: (s: State) => void }).compact?.(s); // i grenen main städar step själv varje timme
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
    for (const q of living(g)) Object.assign(q, { toa: 1, warm: 1, rest: 1, health: 1, hunger: 1, task: undefined });
    g.lastGuardDay = -999;
    const vd = drag(g, 'val', () => chooseTask(g, vuxna()[0]));
    Object.assign(g.fire, { lit: false, fuel: 0, emberUntil: undefined, ring: true });
    setItems(g, { torrgras: 10, grenar: 10, flinta: 2 }); setAmount(g, 'ved', 10);
    for (const q of living(g)) q.task = undefined;
    const tandare = living(g).filter(q => ageOf(q, g.now) >= ALDER.ansvar).length;
    const ed = drag(g, 'eld', () => stepFire(g, 1, living(g)));
    const tande = living(g).some(q => q.task?.act === 'tanda');
    // var en person går (promenad, strand, flinta, trädet som fälls) väljs med personens egen följd, inte byns
    const h = createState(5, START), hv = () => living(h).filter(q => ageOf(q, h.now) >= ALDER.vuxen);
    h.now = new Date(h.now).setHours(10, 0, 0, 0); Object.assign(h.fire, { lit: true, fuel: 4, ring: true });
    for (const q of h.people) q.tek = { ...q.tek, yxa: 1 };
    const sett = new Set<string>();
    const hd = drag(h, 'val', () => {
      for (const [mat, flinta, ved] of [[200, 1, 50], [2, 0, 50], [200, 1, 0]]) {
        setFood(h, mat); setItems(h, { flinta, torrgras: 20, grenar: 20 }); setAmount(h, 'ved', ved);
        for (const q of hv()) addTool(h, 'yxa', q);
        for (let i = 0; i < 200; i++) {
          const p = hv()[i % hv().length];
          Object.assign(p, { toa: 1, warm: 1, rest: 1, health: 1, hunger: 1, social: 1, task: undefined });
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
