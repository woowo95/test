// Scenarier. Behov och val: behov, ved, aktivitet och fritid.
import { Person, createState, getRel, step, living, temperature, nyKalender, amountOf, capacity, load, isLight, T, FOOD, ageOf, getMap, HOUR, W, tileOf, stat, campCenter, KANIN, gain, takeFuel, ownsAmount, addTo, setAmount, needLadder, MAT, ownFor, takeMaterial, getable, fuelFor, DELA, BEAT, spar, isWork, ACTS, groundOf, varmeDelar, nyVarme, addTool, stepKlader, chooseTask, iSkugga, KROPP, spotFor, shoreOf, torstDelar, drickPlats, areaOf, halsaLage, describe, halsaSteg, skada, blodning, halsa, rorlighet, workRate, OLYCKOR, Act, HALSA, kanGa, gangFart, hemma, mossaFynd, chopStock, skadeLista, skadeText, delSkada, FORMAGOR, smarta, handighet, NARINGAR, NARING, naringOf, naringNu, naringSjunker, mattnad, sjunker, bristGrad, bristSteg, berattaBrist, onskan, matOrdning, takeFood, vilaTim, skorbjugg, NARINGBAL, DODSORSAKER, converse, Naring, STATIONER, TEKNIK, tingOf, vaderNu } from '../../sim';
import { cloneState, stepIs, stepVader, isCm, vattenGrader, halVal, halMin, drickVal, iIstiden, ageIndex, tidyTools } from '../../sim';
import { START, STEG_DYGN, STEG_TIM } from '../kor';
import { setMat, setFood, kor, klockan, tandEld, tomtForrad, treVuxna, bastaJaktruta, SCENARIER, rikBy } from './hjalp';

SCENARIER.behov = {
  text: 'Behovsstegen: den som behöver något tar sitt eget, sedan byns, ber sedan någon i närheten om det, och stjäl först när hen håller på att dö. Hög empati stjäl aldrig, man stjäl helst av den man inte tycker om, och den bestulne märker det.',
  kor: () => {
    const ny = () => {
      const s = createState(6, START);
      rikBy(s); setMat(s, {});
      const [a, b, c] = treVuxna(s, 0.3);
      s.people = [a, b, c];
      return { s, a, b, c };
    };
    // a är hungrig, b har mat men är ingen släkt och ovän: a tar inte b:s mat förrän nöden är stor
    let { s, a, b, c } = ny();
    getRel(s, a, b).op = -30; getRel(s, a, c).op = -30; c.x = 90;
    gain(s, b, 'bar', 5);
    needLadder(s, a, 1e6); const tarInte = ownFor(s, b, MAT) === 5 && a.hunger === 0.3;
    // byns mat går före gåvor och stöld
    addTo(s, 'bar', 2);
    needLadder(s, a, 1); const byns = a.hunger > 0.3 && ownFor(s, b, MAT) === 5;
    // ett barn ber sin förälder, som delar också det sista
    ({ s, a, b, c } = ny());
    a.mother = b.id; gain(s, b, 'bar', 1); b.task = { act: 'sova' } as any;
    needLadder(s, a, 1e6); const foralder = a.hunger > 0.3 && ownFor(s, b, MAT) < 0.5;
    // en vän ger det hen har över
    ({ s, a, b, c } = ny());
    getRel(s, a, b).op = 70; b.pot.empati = 20; gain(s, b, 'bar', 6);
    let van = false; for (let i = 0; i < 20 && !van; i++) { a.hunger = 0.3; needLadder(s, a, 1e6); van = a.hunger > 0.3; }
    // stöld i yttersta nöd: mycket hög empati stjäl aldrig, låg empati stjäl när den svälter
    ({ s, a, b, c } = ny());
    getRel(s, a, b).op = -30; gain(s, b, 'bar', 5);
    a.pot.empati = 20; a.hunger = 0; a.health = 0.02;
    needLadder(s, a, 1); const aldrig = ownFor(s, b, MAT) === 5;
    a.pot.empati = 1; a.health = 0.9;
    needLadder(s, a, 1); const stal = ownFor(s, b, MAT) < 5 && a.hunger > 0;
    // den bestulne märker det när hen äter av sitt eget
    const fore = getRel(s, a, b).op; b.hunger = 0.3; needLadder(s, b, 1);
    const marker = getRel(s, a, b).op < fore && !b.stulet;
    // man stjäl helst av den man inte tycker om
    let ovan = 0;
    for (let i = 0; i < 40; i++) {
      ({ s, a, b, c } = ny());
      gain(s, b, 'bar', 5); gain(s, c, 'bar', 5);
      getRel(s, a, b).op = -60; getRel(s, a, c).op = 60; a.pot.empati = 1; a.hunger = 0; a.health = 0.5;
      s.rngs = { dela: i * 7919 + 1 }; a.rngs = { dela: i * 7919 + 1 };
      needLadder(s, a, 1); if (ownFor(s, b, MAT) < 5) ovan++;
    }
    return [
      ['den hungrige tar inte en oväns mat innan nöden är stor', tarInte],
      ['byns mat går före andras', byns],
      ['ett barn får mat av sin förälder, som delar också det sista (och kan väckas)', foralder],
      ['en vän ger av det hen har över', van],
      ['den med mycket hög empati stjäl aldrig, inte ens döende', aldrig],
      ['den med låg empati stjäl när den svälter', stal],
      ['den bestulne märker det och relationen blir sämre', marker],
      [`man stjäl helst av den man inte tycker om (${ovan} av 40)`, ovan >= 28],
    ];
  },
};

SCENARIER.ved = {
  lang: true,
  text: 'Ved, material och redskap i behovsstegen: elden ägs av byn men man eldar bara med byns ved och sin egen. Den som fryser ber om ved, och stjäl den först när kylan håller på att döda. Material till ett arbete tas av sitt eget och byns, som gåva, och sist av andras (en lindrig stöld). Redskap lånas, ges och byts i samma steg.',
  kor: () => {
    const ny = () => {
      const s = createState(6, START);
      rikBy(s); tomtForrad(s);
      const [a, b, c] = treVuxna(s, 1, q => { q.warm = 1; q.pot.empati = 10; });
      s.people = [a, b, c];
      Object.assign(s.fire, { lit: true, fuel: 0.5, want: 5 });
      return { s, a, b, c };
    };
    // elden: byns ved och sin egen, inte andras
    let { s, a, b, c } = ny();
    getRel(s, a, b).op = 0; gain(s, b, 'ved', 4); gain(s, a, 'grenar', 5); addTo(s, 'ved', 1);
    const fv = fuelFor(s, a), far = Math.abs(fv - 3) < 1e-9; // 1 ved av byns + 5 grenar à 0,4
    takeFuel(s, 3, a);
    const intedras = ownsAmount(s, b, 'ved') === 4 && ownsAmount(s, a, 'grenar') < 1e-9;
    // den som fryser och inte har någon ved får den av en vän
    ({ s, a, b, c } = ny());
    getRel(s, b, a).op = 70; b.pot.empati = 20; gain(s, b, 'ved', 8);
    let fick = false; for (let i = 0; i < 20 && !fick; i++) { a.warm = 0.2; needLadder(s, a, 1e6); fick = ownsAmount(s, a, 'ved') > 0; }
    // i yttersta nöd hämtar den frysande någon annans ved till elden; hög empati gör det aldrig
    ({ s, a, b, c } = ny());
    getRel(s, a, b).op = -30; getRel(s, b, a).op = -30; gain(s, b, 'ved', 4);
    a.warm = 0.05; a.health = 0.02; a.pot.empati = 20; needLadder(s, a, 1);
    const aldrig = a.task?.act !== 'elda';
    a.pot.empati = 1; a.health = 0.5; needLadder(s, a, 1);
    const stjal = a.task?.act === 'elda' && a.task.fran === b.id;
    // material: sitt eget och byns först, sedan andras som en lindrig stöld som märks
    ({ s, a, b, c } = ny());
    getRel(s, a, b).op = -30; getRel(s, b, a).op = -30; c.x = 90;
    gain(s, a, 'flinta', 1); addTo(s, 'flinta', 1); gain(s, b, 'flinta', 3);
    takeMaterial(s, a, 'flinta', 2);
    const egetForst = ownsAmount(s, b, 'flinta') === 3 && ownsAmount(s, a, 'flinta') < 1e-9;
    takeMaterial(s, a, 'flinta', 1);
    const lindrig = ownsAmount(s, b, 'flinta') === 2 && !!b.stulet?.some(x => x.k === 'flinta' && x.l);
    const fore = getRel(s, b, a).op; takeMaterial(s, b, 'flinta', 1);
    const marker = Math.abs(getRel(s, b, a).op - (fore - DELA.stoldLindrig)) < 1e-9 && !b.stulet;
    a.pot.empati = 20;
    const hogEmp = getable(s, a, 'flinta') === 0;
    // vanliga byar: elden brinner och ingen fryser ihjäl
    let kyla = 0, eld = 0;
    for (const seed of [1, 42]) { const v = createState(seed, START); for (let i = 0; i < 10 * STEG_DYGN; i++) step(v, BEAT); kyla += v.people.filter(q => q.cause === 'av kyla').length; eld += v.fire.lit ? 1 : 0; }
    return [
      [`man eldar med byns ved och sin egen (${fv.toFixed(1)} ved, inte grannens 4)`, far],
      ['elden tar inte någon annans ved', intedras],
      ['den som fryser och inte har ved får den av en vän', fick],
      ['den med mycket hög empati tar aldrig någon annans ved, inte ens döende', aldrig],
      ['den som håller på att frysa ihjäl hämtar någon annans ved till elden', stjal],
      ['material tas av sitt eget och byns före andras', egetForst],
      ['andras material tas sist, som en lindrig stöld', lindrig],
      [`den bestulne märker det, och relationen blir ${DELA.stoldLindrig} sämre (inte ${DELA.stoldOp})`, marker],
      ['den med mycket hög empati tar inte andras material', hogEmp],
      [`ingen fryser ihjäl i två vanliga byar på 10 dygn (10 år i spelet) (${kyla})`, kyla === 0],
    ];
  },
};

SCENARIER.aktivitet = {
  text: 'Man bär hem efter en stunds arbete och går tillbaka till samma plats, bär aldrig för tungt, håller sig nära platsen och går aldrig i vattnet. Bärplockning ger lika mycket som förut',
  kor: () => {
    const s = createState(5, START);
    klockan(s); // mitt på dagen, så att ingen går hem för att det blir mörkt
    setAmount(s, 'ved', 20); tandEld(s, 0.5); // tänd eld och ved i förrådet, så att någon matar elden
    const m = getMap(s.seed);
    let utanfor = 0, vatten = 0, tungt = 0, eldMax = 0, arbete = 0;
    let prov: Person[] = [];
    spar.pa = true; spar.v = new WeakMap(); // vägen folk går spelas in som i spelet, så att hela vägen kan kontrolleras
    const vatt = (x: number, y: number) => m.tiles[Math.floor(y) * W + Math.floor(x)] === T.Vatten;
    for (let i = 0; i < 10 * 3600 / BEAT; i++) {
      step(s, BEAT);
      // en jägare, en som promenerar och en bärplockare, så att alla syns i provet. Den som avbryts (t.ex. för ett samtal) får uppgiften igen
      if (i === 12) prov = living(s).filter(p => ageOf(p, s.now) >= 16).slice(0, 3);
      if (i >= 12 && i < 12 * 7) {
        const c = campCenter(s), akt = ['jakt', 'promenad', 'samla'] as const;
        prov.forEach((p, j) => {
          if (p.task?.act === akt[j] || p.died !== undefined) return;
          let x = 0, y = 0;
          for (let r = 7; r < 30; r++) { x = c.x + 0.5 + (j === 1 ? -r : r); y = c.y + 0.5 + (j === 2 ? -r : r) * 0.3; if (!vatt(x, y)) break; }
          if (j === 0) { const b = bastaJaktruta(s, 20, c); if (b) { x = b.x; y = b.y; } } // jägaren går dit det finns mest vilt
          p.task = { act: akt[j], phase: 'go', tx: x, ty: y, until: s.now + 3 * HOUR, carry: 0, why: 'prov', dark: !isLight(s.now) };
        });
      }
      for (const e of s.fire.log) if (e.k === 'fyll' && e.t > s.now - BEAT * 1000) eldMax = Math.max(eldMax, e.n ?? 0); // varje påfyllning i takten
      for (const p of living(s)) {
        const t = p.task, v = spar.v.get(p) ?? [];
        for (let k = 0; k < v.length; k += 3) if (vatt(v[k + 1], v[k + 2])) vatten++;
        if (t?.phase === 'back' && t.act !== 'bara' && !(t.act === 'jakt' && load(t, s) <= KANIN + 0.01) && load(t, s) > capacity(s, p) / 3 + 0.05) tungt++; // bärandet av högar och en hel kanin får ta en full famn
        const r = t?.phase === 'do' ? ACTS[t.act].vandra?.r : undefined; // hur långt från platsen man rör sig (handlingar.ts)
        if (t && r && Math.hypot(p.x - t.tx, p.y - t.ty) > r + 0.6) utanfor++;
        if (t?.phase === 'do' && isWork(t.act)) arbete += BEAT / 3600;
      }
    }
    spar.pa = false;
    const turer = (s.stat?.turer as number) ?? 0;
    // bärplockning: vad en timme ger med gångtiden till platsen och hem
    // medel av åtta byar: i en enda by beror talet mycket på slumpen (0,05–0,24 för byarna 1–8 i v47)
    let pl = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const q = createState(seed, START); let tim = 0;
      for (let i = 0; i < 24 * 3600 / BEAT; i++) { step(q, BEAT); for (const p of living(q)) if (p.task?.act === 'samla') tim += BEAT / 3600; }
      pl += ((q.stat?.prod_samla as number) ?? 0) / Math.max(1, tim) / 8;
    }
    return [
      [`man bär hem efter en stunds arbete och går tillbaka (${turer} turer på ${Math.round(arbete)} arbetstimmar)`, turer > 20],
      [`ingen bär mer än en tredjedel av vad hen orkar från arbetet (${tungt} för tunga)`, tungt === 0],
      [`man håller sig nära platsen (${utanfor} gånger utanför)`, utanfor === 0],
      [`ingen går ut i vattnet, längs hela vägen (${vatten} punkter i vattnet)`, vatten === 0],
      [`elden matas med en famn i taget (högst ${eldMax.toFixed(1)})`, eldMax > 0 && eldMax <= 1 + 1e-9],
      // en timmes bärplockning med gångtiden ger ca 12,6 i medel för byarna 1–8 (uppmätt i v132, efter steg 2.12.4: en full
      // börda på 10–20 minuter). Bandet är brett: talet beror på årstiden och slumpen, och det ändras när balansen ses över.
      // Provet ska bara fånga en stor ändring
      [`bärplockning ger ungefär lika mycket per timme som förut (${pl.toFixed(2)}, medel av åtta byar)`, pl > 6 && pl < 30],
    ];
  },
};

SCENARIER.fritid = {
  text: 'På fritiden tar folk promenader (de nyfikna och modiga längre bort), badar när det är varmt och sitter vid stranden. Man vilar ut när det är mörkt och på dagen bara när man är mycket trött (steg 2.3.10)',
  kor: () => {
    const folk: { d: number; v: number }[] = [];
    let prom = 0, bad = 0, badVarmt = true, n = 0, strand = 0, strandLand = true;
    const vila = { dag: 0, dagN: 0, natt: 0, nattN: 0 }; // vuxnas tid i vila på dagen och när det är mörkt (steg 2.3.10)
    for (const seed of [5, 6, 7, 8]) { // fyra byar, så att slumpen inte avgör
    const s = createState(seed, START), gang = new Map<number, number>(), sett = new WeakSet<object>();
    s.kal = nyKalender(s.now, 2); // sommar
    setFood(s, 40); setAmount(s, 'ved', 40); // gott ställt, tid över
    kor(s, 4 * 24, s => {
      for (const p of living(s)) {
        const t = p.task;
        if (ageOf(p, s.now) >= 16) { const l = isLight(s.now), v = t?.act === 'vila' ? 1 : 0; if (l) { vila.dag += v; vila.dagN++; } else { vila.natt += v; vila.nattN++; } }
        if (t?.phase !== 'do') continue;
        const c = campCenter(s), ny = !sett.has(t); sett.add(t); // varje promenad, bad och stund vid stranden räknas en gång
        if (t.act === 'promenad') { if (ny) prom++; gang.set(p.id, Math.max(gang.get(p.id) ?? 0, Math.hypot(t.tx - c.x - 0.5, t.ty - c.y - 0.5))); }
        if (t.act === 'bada') { if (ny) bad++; if (temperature(s) < 14) badVarmt = false; }
        if (t.act === 'strand') { if (ny) strand++; if (getMap(s.seed).tiles[tileOf(p.x, p.y)] === T.Vatten) strandLand = false; }
      }
    });
    // längst bort: de mest nyfikna och modiga mot de minst
    folk.push(...s.people.filter(p => gang.has(p.id)).map(p => ({ d: gang.get(p.id)!, v: stat(p, 'nyfikenhet', s.now) + stat(p, 'mod', s.now) })));
    n = Math.max(n, gang.size);
    }
    folk.sort((a, b) => a.v - b.v);
    const h = Math.floor(folk.length / 2), snitt = (l: { d: number }[]) => l.length ? l.reduce((x, y) => x + y.d, 0) / l.length : 0;
    const lag = snitt(folk.slice(0, h)), hog = snitt(folk.slice(folk.length - h));
    return [
      [`folk tar promenader (${prom} promenader, upp till ${n} personer i en by)`, prom > 5 && n >= 3],
      [`nyfikna och modiga går längre (${hog.toFixed(1)} mot ${lag.toFixed(1)} rutor)`, hog > lag],
      [`folk badar på sommaren (${bad} bad)`, bad >= 2],
      ['man badar bara när det är varmt', badVarmt],
      [`folk sitter vid stranden (${strand} gånger)`, strand >= 2],
      ['den som sitter vid stranden sitter på land', strandLand],
      [`man vilar ut när det är mörkt (${(100 * vila.natt / vila.nattN).toFixed(0)} % av natten) och lite på dagen (${(100 * vila.dag / vila.dagN).toFixed(0)} %)`, vila.natt / vila.nattN > 2 * vila.dag / vila.dagN],
    ];
  },
};

SCENARIER.varm = {
  text: 'Steg 2.3.4: kroppen kan bli varmare än idealet: av solen på sommaren (inte i skugga under ett träd eller i ett hus), av kläderna när det är milt och av att sitta tätt vid elden. Under idealet är det som förut. Den som är för varm svalnar, tar av sig de varma kläderna (bältet sitter kvar), tar inte på sig nya, lockas till bad, och badet kyler. Tröttare blir hen först när hen är extremt varm (steg 2.10.20)',
  kor: () => {
    const s = createState(5, START);
    s.kal = nyKalender(s.now, 2); klockan(s, 14); // sommar, mitt på dagen
    for (let d = 0; d < 6 && vaderNu(s).moln > 0.1; d++) s.now += 24 * HOUR; // en klar dag (vädret, steg 2.11.1)
    const g = groundOf(s), p = living(s)[0], temp = temperature(s);
    // en ruta utan träd och en under träd
    const fri = (skog: boolean) => { for (let i = 0; i < g.trees.length; i++) if ((g.trees[i] > 0.5) === skog && getMap(s.seed).tiles[i] !== T.Vatten) return i; return -1; };
    const ute = fri(false), skog = fri(true);
    const satt = (i: number) => { p.x = i % W + 0.5; p.y = Math.floor(i / W) + 0.5; };
    satt(ute); const sol = varmeDelar(s, p, 0, new Map(), temp);
    satt(skog); const skugga = varmeDelar(s, p, 0, new Map(), temp);
    let w = 1; satt(ute); for (let h = 0; h < 3; h++) w = nyVarme(w, sol, 1);
    // under idealet som förut: elden, kylan och milt väder, aldrig över idealet
    const v0 = { ...sol, eld: 0.2, kyla: 0.1, mild: 0 };
    const under = Math.abs(nyVarme(0.5, v0, 1) - 0.6) < 1e-9 && nyVarme(0.95, { ...v0, eld: 1 }, 1) === 1;
    // över idealet svalnar man, aldrig under idealet
    const svalnar = nyVarme(1.5, { ...v0, eld: 0, kyla: 0, hetta: 0 }, 1) < 1.5 && nyVarme(1.05, { ...v0, eld: 0, kyla: 0, hetta: 0 }, 1) === 1;
    // för varm: kläderna tas av, bältet sitter kvar, och nya tas inte på i värmen
    const rock = addTool(s, 'skinnrock', p), balte = addTool(s, 'balte', p);
    rock.bar = p.id; balte.bar = p.id; rock.x = rock.y = balte.x = balte.y = undefined;
    p.warm = 1.6; stepKlader(s);
    const avtagen = rock.bar === undefined && balte.bar === p.id;
    p.warm = 1; stepKlader(s);
    const ejPa = rock.bar === undefined;
    // en tanke när man är för varm, och tröttare först när man är extremt varm (steg 2.10.20)
    // samma person i en kopia av byn med samma arbete ett slag, men bara för varm: bara den extrema värmen skiljer dem åt
    const lik = cloneState(s), pl = lik.people.find(q => q.id === p.id)!;
    for (const q of [p, pl]) { q.rest = 1; q.task = { act: 'ved', phase: 'do', tx: q.x, ty: q.y, until: s.now + HOUR, carry: 0, why: '' }; }
    p.warm = 1.9; pl.warm = (KROPP.forVarm + KROPP.extremVarm) / 2; step(s, BEAT); step(lik, BEAT);
    const trott = 1 - p.rest > (1 - pl.rest) * 1.5, tanke = p.thoughts.some(t => t.text === 'För varm');
    // badet kyler den som är för varm
    let badVarm = 0, maxVarm = 0;
    for (const seed of [5, 6, 7, 8, 10]) { // 8 och 10 sedan steg 2.10.6, då handarbetet flyttade från elden in i byn och by 7 slutade bada varm
      const b = createState(seed, START); b.kal = nyKalender(b.now, 2); klockan(b, 8);
      setFood(b, 40); setAmount(b, 'ved', 40);
      const sett = new WeakSet<object>();
      kor(b, 2 * 24, b => { for (const q of living(b)) { maxVarm = Math.max(maxVarm, q.warm); const t = q.task; if (t?.act === 'bada' && t.phase === 'do' && !sett.has(t)) { sett.add(t); if (q.warm > 1) badVarm++; } } });
    }
    return [
      [`solen värmer på sommaren (${Math.round(temp)} grader, ${sol.sol.toFixed(2)} i timmen, ${w.toFixed(2)} efter tre timmar)`, sol.sol > 0 && w > 1],
      ['under ett träd värmer inte solen', skugga.sol === 0],
      ['under idealet är det som förut', under],
      ['över idealet svalnar man, men aldrig under idealet', svalnar],
      ['den som är för varm tar av sig rocken men inte bältet', avtagen],
      ['i värmen tas rocken inte på igen', ejPa],
      ['den som är extremt varm blir tröttare och tänker på det', trott && tanke],
      [`folk blir varmare än idealet på sommaren (som mest ${maxVarm.toFixed(2)}) och badar då (${badVarm} bad)`, maxVarm > 1 && badVarm >= 1],
    ];
  },
};

SCENARIER.skugga = {
  text: 'Steg 2.3.13 och 2.10.20: den som är extremt varm i solen söker sig till skuggan under ett träd eller i ett hus och svalkar sig där, så som den som fryser söker sig till elden. Den som bara är för varm arbetar som vanligt. Står hen redan i skugga stannar hen där. I skuggan värmer solen inte, så kroppen svalnar. Den som vilar eller gör handarbete när hen är för varm gör det i skuggan nära elden',
  kor: () => {
    const s = createState(5, START);
    s.kal = nyKalender(s.now, 2); klockan(s, 14); // sommar, mitt på dagen
    const g = groundOf(s), p = living(s)[0], temp = temperature(s), m = getMap(s.seed);
    const fri = (skog: boolean) => { for (let i = 0; i < g.trees.length; i++) if ((g.trees[i] > KROPP.skugga) === skog && m.tiles[i] !== T.Vatten && (skog || g.trees.some((t, j) => t > KROPP.skugga && Math.hypot(j % W - i % W, Math.floor(j / W) - Math.floor(i / W)) < 6))) return i; return -1; };
    const satt = (i: number) => { p.x = i % W + 0.5; p.y = Math.floor(i / W) + 0.5; };
    const fyll = () => { p.rest = 1; p.toa = 1; p.torst = 1; p.hunger = 1; p.social = 1; };
    // för varm men inte extremt: arbetar som vanligt trots värmen (steg 2.10.20)
    satt(fri(false)); fyll(); p.warm = 1.6; chooseTask(s, p);
    const arbetar = p.task!.act !== 'svalka';
    // extremt varm i solen: söker skugga
    satt(fri(false)); fyll(); p.warm = 1.9; chooseTask(s, p);
    const t = p.task!, valde = t.act === 'svalka', iSkuggan = iSkugga(s, t.tx, t.ty), avst = Math.hypot(t.tx - p.x, t.ty - p.y);
    // framme i skuggan värmer solen inte, och kroppen svalnar
    const w0 = p.warm; kor(s, 1);
    const framme = p.task?.act === 'svalka' && iSkugga(s, p.x, p.y), sol = varmeDelar(s, p, 0, new Map(), temperature(s)).sol, svalnar = p.warm < w0;
    // står redan i skugga: stannar där
    satt(fri(true)); fyll(); p.warm = 1.9; chooseTask(s, p);
    const stannar = p.task!.act === 'svalka' && Math.hypot(p.task!.tx - p.x, p.task!.ty - p.y) < 1;
    // inte för varm: ingen svalka
    satt(fri(false)); fyll(); p.warm = 1; chooseTask(s, p);
    const inte = p.task!.act !== 'svalka';
    // vila och handarbete görs i skuggan nära elden eller byn när man är för varm
    p.warm = 1.6; const vs = spotFor(s, 'vila', p), hs = spotFor(s, 'hantverk', p), f = m.fire;
    const vilaSkugga = iSkugga(s, vs.x, vs.y) && iSkugga(s, hs.x, hs.y) && Math.hypot(hs.x - f.x, hs.y - f.y) <= 11;
    // på kvällen, när solen inte värmer, söker man ingen skugga
    klockan(s, 23); satt(fri(false)); fyll(); p.warm = 1.9; chooseTask(s, p);
    const kvall = p.task!.act !== 'svalka';
    // en by på sommaren: folk svalkar sig sällan, och då i skuggan
    let svalka = 0, iSol = 0, varmTim = 0;
    for (const seed of [5, 6, 7]) {
      const b = createState(seed, START); b.kal = nyKalender(b.now, 2); klockan(b, 8);
      setFood(b, 40); setAmount(b, 'ved', 40);
      const sett = new WeakSet<object>();
      kor(b, 2 * 24, b => { for (const q of living(b)) { if (q.warm > KROPP.forVarm) varmTim += 1 / STEG_TIM; const k = q.task; if (k?.act === 'svalka' && k.phase === 'do' && !sett.has(k)) { sett.add(k); svalka++; if (!iSkugga(b, q.x, q.y)) iSol++; } } });
    }
    return [
      ['den som är för varm men inte extremt varm arbetar trots värmen', arbetar],
      [`den som är extremt varm i solen (${Math.round(temp)} grader) söker skugga`, valde],
      [`skuggan ligger nära (${avst.toFixed(1)} rutor) under ett träd eller i ett hus`, iSkuggan && avst <= 10.5],
      ['i skuggan värmer solen inte, och kroppen svalnar', framme && sol === 0 && svalnar],
      ['den som redan står i skugga stannar där', stannar],
      ['den som inte är för varm söker ingen skugga', inte],
      ['den som är för varm vilar och gör handarbete i skuggan nära elden', vilaSkugga],
      ['när solen inte värmer söker man ingen skugga', kvall],
      [`på sommaren svalkar sig folk sällan (${svalka} gånger på ${Math.round(varmTim)} timmar som för varm, högst en gång per tre timmar), och då i skuggan (${iSol} i solen)`, iSol === 0 && svalka * 3 < Math.max(3, varmTim)],
    ];
  },
};

SCENARIER.torst = {
  text: 'Steg 2.4.1–2.4.2: törsten är ett eget behov. Den växer fortare för den som är för varm eller arbetar tungt, och långsammare i sömnen. Den törstige går och dricker vid vattnet (bär inte hem det) och undviker vatten hen tror är smutsigt; när isen ligger smälter man snö vid elden, och utan eld hugger man upp ett hål i isen. Smutsigt vatten kan ge ont i magen, man lär sig var vattnet är rent och berättar det för andra. Utan vatten tär törsten på hälsan',
  kor: () => {
    const s = createState(5, START);
    s.kal = nyKalender(s.now, 2); klockan(s, 10); // sommar
    const p = living(s)[0], sh = shoreOf(s.seed);
    const fyll = () => Object.assign(p, { rest: 1, toa: 1, hunger: 1, social: 1, warm: 1, health: 1, torst: 1, sickUntil: undefined, task: undefined });
    // takten: vaken, för varm, tungt arbete och sömn
    fyll(); const bas = torstDelar(p).takt;
    p.warm = 1.6; const varm = torstDelar(p).takt; p.warm = 1;
    p.task = { act: 'ved', phase: 'do', tx: p.x, ty: p.y, until: s.now + HOUR, carry: 0, why: '' }; const tungt = torstDelar(p).takt;
    p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: s.now + HOUR, carry: 0, why: '' }; const somn = torstDelar(p).takt;
    // törstig: går till stranden och dricker
    fyll(); p.torst = 0.3; chooseTask(s, p);
    const t = p.task!, valde = t.act === 'dricka', vidVatten = sh[tileOf(t.tx, t.ty)] === 1;
    const fore = drickPlats(s, p)!;
    kor(s, 1);
    const torstNu = p.torst, drack = torstNu > 0.7 && (s.stat?.drack ?? 0) >= 1, lard = p.lardomar?.find(l => l.k === 'vatten');
    // tror hen att vattnet där är smutsigt väljer hen ett annat ställe
    p.lardomar = [{ k: 'vatten', a: areaOf(fore.x, fore.y), v: 1, c: 1, t: s.now, led: 0 }];
    const efter = drickPlats(s, p)!, undviker = areaOf(efter.x, efter.y) !== areaOf(fore.x, fore.y);
    // utan vatten tär törsten på hälsan, och då läker man inte
    fyll(); p.torst = 0; const tar = halsaLage(p, s.now) === 'torst';
    // istiden: snö smälts vid elden, och utan eld hugger man upp isen
    const is = createState(6, START); is.kal = nyKalender(is.now, 0); klockan(is, 10); tandEld(is); is.is = { vatten: 0, cm: 3 }; // tunn is: den går att hugga upp med händerna (steg 2.11.3)
    const q = living(is)[0];
    Object.assign(q, { rest: 1, toa: 1, hunger: 1, social: 1, warm: 1, health: 1, torst: 0.3, task: undefined }); chooseTask(is, q);
    const sno = q.task!.act === 'smalta';
    is.fire.lit = false; q.task = undefined; q.warm = 1; chooseTask(is, q);
    const isen = q.task!.act === 'dricka' && /isen/.test(q.task!.why ?? '');
    // två dygn (två år i spelet) i tre byar: alla dricker, ingen törstar ihjäl, och lärdomarna om vattnet sprids
    let drickor = 0, magont = 0, dog = 0, hort = 0, maxTorstiga = 0;
    for (const seed of [5, 6, 7]) {
      const b = createState(seed, START); setFood(b, 60); setAmount(b, 'ved', 40);
      kor(b, 48, b => { maxTorstiga = Math.max(maxTorstiga, living(b).filter(x => x.torst <= 0).length); });
      drickor += (b.stat?.drack as number ?? 0) + (b.stat?.['smalt sno'] as number ?? 0); magont += b.stat?.['magont av vatten'] as number ?? 0; dog += b.stat?.['dog av törst'] as number ?? 0;
      hort += living(b).flatMap(x => x.lardomar ?? []).filter(l => l.k === 'vatten' && l.src !== undefined).length;
    }
    return [
      [`törsten växer ${bas.toFixed(3)} i timmen, ${varm.toFixed(3)} för den som är för varm, ${tungt.toFixed(3)} i tungt arbete och ${somn.toFixed(3)} i sömnen`, varm > bas && tungt > bas && somn < bas],
      [`den törstige går och dricker (${t.act}) vid vattnet`, valde && vidVatten],
      [`framme dricker hen (törsten ${torstNu.toFixed(2)}) och lär sig hur vattnet är där (${lard ? describe(s, lard).what : 'ingen lärdom'})`, drack && !!lard],
      ['den som tror att vattnet är smutsigt dricker någon annanstans', undviker],
      ['utan vatten tär törsten på hälsan', tar],
      ['i istiden smälts snö vid elden', sno],
      ['i istiden utan eld hugger man upp isen och dricker', isen],
      [`på två dygn i tre byar: ${drickor} gånger drack man, ${magont} fick ont i magen, ${hort} lärdomar om vattnet hade man hört av andra, ${dog} törstade ihjäl (som mest ${maxTorstiga} uttorkade samtidigt)`, drickor > 50 && dog === 0 && hort > 0],
    ];
  },
};

SCENARIER.is = {
  text: 'Steg 2.11.3: sjön har en egen temperatur som följer luftens långsamt. Isen lägger sig när vattnet kyls under noll, växer i kylan och smälter på våren. Den som fiskar eller dricker hugger först upp ett hål: tunn is med händerna, tjockare med en sten, och yxan, spjutet och spaden tar sig genom all is (tills isborren kommer). Fisket genom hålet är pimpling',
  kor: () => {
    // 36 dygn (36 år i spelet, drygt fem veckor i verkligheten) från våren, timme för timme: isen i varje tidsålder
    const s = createState(5, START), t0 = s.now;
    let cmIstid = -1, maxCm = 0, varStart = -1, cmVar = -1, varmSommar = 0, forstIs = -1;
    for (let h = 0; h < 36 * 24; h++) {
      s.now = t0 + h * HOUR; stepVader(s); stepIs(s);
      const ai = ageIndex(s), cm = isCm(s);
      if (forstIs < 0 && cm > 0) forstIs = ai;
      if (cmIstid < 0 && iIstiden(ai)) cmIstid = cm;
      if (iIstiden(ai)) maxCm = Math.max(maxCm, cm);
      if (ai === 2) varmSommar = Math.max(varmSommar, vattenGrader(s));
      if (cmIstid >= 0 && !iIstiden(ai) && varStart < 0) varStart = h;
      if (varStart >= 0 && h === varStart + 24) cmVar = cm; // ett dygn in i våren
    }
    // hålet: vad man har avgör hur tjock is man tar sig igenom och hur länge det tar
    const b = createState(6, START); b.kal = nyKalender(b.now, 0); klockan(b, 10);
    const p = living(b)[0];
    setAmount(b, 'sten', 0); for (const k of ['yxa', 'fiskespjut', 'flintspjut', 'benspade']) setAmount(b, k, 0); tidyTools(b);
    const med = (cm: number) => { b.is = { vatten: 0, cm }; return halVal(b, p)?.id ?? 'inget'; };
    const tunn = med(3), mellan = med(10), tjock = med(25);
    Object.assign(p, { rest: 1, toa: 1, hunger: 1, social: 1, warm: 1, health: 1, torst: 0.3, task: undefined });
    b.fire.lit = false; b.is = { vatten: 0, cm: 25 };
    const ingetVatten = drickVal(b, p) === undefined;
    setAmount(b, 'sten', 1); const sten = med(10);
    setAmount(b, 'yxa', 1); tidyTools(b); const yxa = med(25), minYxa = halMin(b, p);
    b.is = { vatten: 0, cm: 25 }; const dryck = drickVal(b, p), yxDryck = !!dryck && /hål i isen med yxan/.test(dryck.why);
    setAmount(b, 'yxa', 0); setAmount(b, 'fiskespjut', 1); tidyTools(b); const spjut = med(40);
    // två dygn (två år i spelet) i istiden med is på sjön: man pimplar
    let pimplade = 0, fiskade = 0;
    for (const seed of [5, 6, 7]) {
      const v = createState(seed, START); v.kal = nyKalender(v.now, 0); klockan(v, 8); tandEld(v); setFood(v, 10);
      v.is = { vatten: 0, cm: 15 };
      for (const q of living(v)) q.tek = { ...(q.tek ?? {}), fiskespjut: 1 };
      setAmount(v, 'fiskespjut', 2); tidyTools(v);
      kor(v, 48);
      pimplade += (v.stat?.pimplade as number ?? 0); fiskade += (v.stat?.fiskade as number ?? 0) + (v.stat?.fisk as number ?? 0);
    }
    return [
      [`isen lägger sig i slutet av hösten (tidsålder ${forstIs}) och är ${cmIstid.toFixed(0)} cm när istiden börjar`, forstIs === 3 && cmIstid > 5 && cmIstid < 25],
      [`isen blir som tjockast ${maxCm.toFixed(0)} cm`, maxCm > 25 && maxCm < 60],
      [`isen har gått upp ett dygn in i våren (${cmVar.toFixed(0)} cm kvar), och sjön blir ${varmSommar.toFixed(0)} grader på sommaren`, cmVar === 0 && varmSommar > 8],
      [`tunn is huggs upp med ${tunn}, 10 cm går inte utan något (${mellan}), men med en sten (${sten})`, tunn === 'hand' && mellan === 'inget' && sten === 'sten'],
      [`tjock is går inte med händerna (${tjock}), och då får den som är törstig inget vatten utan eld`, tjock === 'inget' && ingetVatten],
      [`yxan tar sig genom 25 cm (${yxa}, ${minYxa.toFixed(1)} minuter) och den törstige dricker genom hålet`, yxa === 'yxa' && minYxa > 0 && yxDryck],
      [`spjutet tar sig genom 40 cm (${spjut})`, spjut === 'spjut'],
      [`på två dygn i istiden i tre byar högg man upp hål i isen och pimplade (${pimplade} gånger)`, pimplade >= 2],
    ];
  },
};

SCENARIER.kropp = {
  text: 'Steg 2.5.1: kroppen har tio delar. Olyckor i farliga arbeten (jakt, trädfällning, huggning, slakt, rensning, flintslagning) ger skador i en del. Ett sår blöder tills det levrat sig, och ett mycket svårt sår kan förblöda; blodet kommer tillbaka. Skadade ben går långsammare och skadade händer arbetar långsammare. Skadorna läker, och hälsan som visas är en sammanfattning av kroppen',
  kor: () => {
    const s = createState(5, START);
    klockan(s, 10);
    const p = living(s)[0], MIN60 = 60;
    const fyll = () => Object.assign(p, { rest: 1, toa: 1, hunger: 1, social: 1, warm: 1, health: 1, torst: 1, blod: 1, skador: undefined, sickUntil: undefined, task: undefined });
    const timmar = (h: number) => { for (let i = 0; i < h * 60; i++) { const d = halsaSteg(s, p, MIN60); if (d) return d; } return undefined; };
    // en olycka under jakten ger en skada
    fyll(); p.task = { act: 'jakt', phase: 'do', tx: p.x, ty: p.y, until: s.now + 1000 * HOUR, carry: 0, why: '' };
    for (let i = 0; i < 2000 && !(s.stat?.skador); i++) halsaSteg(s, p, MIN60 * 30);
    const olycka = (s.stat?.skador ?? 0) >= 1;
    // ett lätt skärsår blöder en stund och levrar sig; ett mycket svårt kan förblöda
    fyll(); p.task = undefined; skada(s, p, 'handH', 'skarsar', 0.5, 'olycka', '');
    const blodNy = blodning(p), dogLatt = timmar(3), blodLatt = p.blod, levrat = blodning(p) === 0;
    const hFore = halsa(p);
    const laktTid = (() => { for (let h = 1; h <= 24; h++) { timmar(1); if (!p.skador) return h; } return 99; })();
    const blodTillbaka = p.blod;
    fyll(); skada(s, p, 'benV', 'skarsar', 1, 'olycka', '');
    const dogSvart = timmar(4);
    // skadade ben går långsammare, skadade händer arbetar långsammare
    fyll(); const fart0 = rorlighet(p), arb0 = workRate(s, p, 'samla');
    p.task = { act: 'slakta', phase: 'do', tx: p.x, ty: p.y, until: s.now + HOUR, carry: 0, why: '' };
    skada(s, p, 'benV', 'benbrott', 1, 'olycka', ''); skada(s, p, 'handH', 'skarsar', 0.8, 'olycka', '');
    const fart1 = rorlighet(p), arb1 = workRate(s, p, 'samla'), avbrot = p.task === undefined, halsa1 = halsa(p);
    // varje farligt arbete ger sina skador i sina delar
    const fel: string[] = [];
    for (const [act, o] of Object.entries(OLYCKOR)) {
      fyll(); s.stat = {}; p.task = { act: act as Act, phase: 'do', tx: p.x, ty: p.y, until: s.now + 1000 * HOUR, carry: 0, why: '' };
      for (let i = 0; i < 2000 && !s.stat.skador; i++) halsaSteg(s, p, MIN60 * 30);
      const w = p.skador?.[0];
      if (!s.stat.skador || (w && (!o!.typer.includes(w.k) || !o!.delar.includes(w.d)))) fel.push(act);
    }
    // en by i tio dygn (tio år i spelet, knappt en och en halv vecka i verkligheten): olyckor händer
    // olyckorna är sällsynta (ett par på tio dygn), så kontrollen gäller att byn gör farligt arbete där risken räknas, och att
    // skadorna inte blir många fler än risken säger
    const b = createState(1, START);
    let vantat = 0;
    kor(b, 240, v => { for (const q of living(v)) { const t = q.task, o = t?.phase === 'do' ? OLYCKOR[t.act] : undefined; if (!o) continue; const pd = ACTS[t!.act], sk = pd.arbete ?? (pd.hantverk ? 'hantverk' : undefined); vantat += o.risk * (1 - (sk ? q.skill[sk] : 0) / HALSA.skicklig) * BEAT / 3600; } });
    const skador = b.stat?.skador as number ?? 0, blod = b.stat?.['dog av blodförlust'] as number ?? 0;
    return [
      ['en olycka under jakten ger en skada', olycka],
      [`ett lätt skärsår blöder (${blodNy.toFixed(2)} i timmen), levrar sig och tar ${Math.round((1 - blodLatt) * 100)} % av blodet`, blodNy > 0 && !dogLatt && levrat && blodLatt < 1 && blodLatt > 0.6],
      [`skadan sänker hälsan som visas (${hFore.toFixed(2)})`, hFore < 1],
      [`det läker på ${laktTid} timmar, och blodet kommer tillbaka (${blodTillbaka.toFixed(2)})`, laktTid <= 13 && blodTillbaka > blodLatt],
      [`ett mycket svårt skärsår kan förblöda (${dogSvart ?? 'överlevde'})`, dogSvart === 'blod'],
      [`ett brutet ben går långsammare (${fart0.toFixed(2)} → ${fart1.toFixed(2)}), och ett skärsår i handen arbetar långsammare (${(arb1 / arb0).toFixed(2)} av farten)`, fart1 < fart0 && arb1 < arb0],
      [`en svår skada avbryter arbetet, och hälsan blir ${halsa1.toFixed(2)}`, avbrot && halsa1 < KROPP.svag + 0.2],
      [`olyckorna i ${Object.keys(OLYCKOR).join(', ')} ger sina skador i sina delar${fel.length ? ` (fel: ${fel.join(', ')})` : ''}`, !fel.length],
      [`på tio dygn i en by: ${skador} skador (risken säger ${vantat.toFixed(1)}), ${blod} förblödde`, vantat > 0.5 && skador <= 3 * vantat + 3],
    ];
  },
};

SCENARIER.vattensack = {
  text: 'Steg 2.10.1: vattensäcken sys av skinn vid slöjdbänken med bensylen. Med den hämtar en vuxen vatten åt den som inte kan gå och ligger hemma; utan säck får hen vatten av de andra, och när törsten blir farlig också om säcken inte kommer',
  kor: () => {
    const s = createState(5, START);
    klockan(s, 10); rikBy(s);
    const [p, q, r] = treVuxna(s, 1);
    const c = campCenter(s);
    const fyll = (x: Person, dx: number) => Object.assign(x, { rest: 1, toa: 1, hunger: 1, social: 1, warm: 1, health: 1, torst: 1, blod: 1, skador: undefined, sickUntil: undefined, task: undefined, x: c.x + 0.5 + dx, y: c.y + 2.5 });
    fyll(p, 0); fyll(q, 1); fyll(r, 2); r.x = c.x + 40;
    skada(s, p, 'benH', 'benbrott', 0.9, 'olycka', ''); p.skador![0].b = 0;
    const kanInte = !kanGa(p) && hemma(s, p);
    // utan säck: hen får vatten av de andra
    p.torst = 0.3; chooseTask(s, p); const utan = p.task?.act;
    // med säck: hen väntar, och en annan hämtar vatten i säcken
    const sack = addTool(s, 'vattensack', q);
    const akt = (x: Person) => (x.task as Person['task'])?.act;
    p.task = undefined; chooseTask(s, p); const vantar = akt(p);
    chooseTask(s, q); const hamtar = q.task?.act, tar = q.task?.tool;
    let fick = false;
    for (let i = 0; i < 4 * STEG_TIM && !fick; i++) { step(s, BEAT); p.torst = Math.min(p.torst, 0.3); if ((s.stat?.['bar vatten'] as number ?? 0) > 0) fick = true; }
    const sliten = (tingOf(s).find(t => t.id === sack.id)?.c ?? 0) < 1;
    // farligt törstig: de andra ger vatten ändå
    p.task = undefined; p.torst = 0.1; chooseTask(s, p); const farligt = akt(p);
    const fl = STATIONER.flatarbank, tek = TEKNIK.find(t => t.id === 'vattensack');
    return [
      ['den som har brutit benet kan inte gå och ligger hemma', kanInte],
      [`utan säck får hen vatten av de andra (${utan})`, utan === 'fatt'],
      [`med en säck i byn väntar hen på den (${vantar ?? 'inget'})`, vantar !== 'fatt' && vantar !== 'dricka'],
      [`en annan vuxen tar säcken och hämtar vatten (${hamtar}, ${tar})`, hamtar === 'vatten' && tar === 'vattensack'],
      [`vattnet kommer fram inom fyra timmar och säcken slits (${fick}, ${sliten})`, fick && sliten],
      [`farligt törstig får hen vatten av de andra ändå (${farligt})`, farligt === 'fatt'],
      ['säcken sys bara vid slöjdbänken med bensylen, och tekniken kommer efter skinnkläderna', !!fl.bara?.includes('vattensack') && fl.kraver?.vattensack === 'bensyl' && !!tek?.krav.includes('skinnklader')],
    ];
  },
};

SCENARIER.vard = {
  text: 'Steg 2.5.2: ett öppet sår kan bli infekterat, och utan vård blir det kallbrand och döden. Vården är en egen handling: man trycker på ett sår som blöder, lägger ett förband av mossa (som hittas när man letar i naturen och ibland på ett fällt träd) och rengör ett infekterat sår, på sig själv eller någon annan. Den som inte kan gå kravlar hem eller bärs hem, och man läker fortare när man vilar',
  lang: true,
  kor: () => {
    const s = createState(5, START);
    klockan(s, 10); rikBy(s);
    const [p, q] = treVuxna(s, 1, x => Object.assign(x, { rest: 1, toa: 1, social: 1, warm: 1, torst: 1, blod: 1, skador: undefined, sickUntil: undefined }));
    const c = campCenter(s);
    const fyll = (x: Person) => Object.assign(x, { rest: 1, toa: 1, hunger: 1, social: 1, warm: 1, health: 1, torst: 1, blod: 1, skador: undefined, sickUntil: undefined, task: undefined, x: c.x + 0.5, y: c.y + 2.5 });
    const timmar = (x: Person, h: number) => { for (let i = 0; i < h * 60; i++) { const d = halsaSteg(s, x, 60); if (d) return d; } return undefined; };
    // en infektion som inte rengörs blir kallbrand och dödar
    fyll(p); skada(s, p, 'benV', 'skarsar', 0.3, 'olycka', ''); p.skador![0].b = 0; p.skador![0].inf = 0;
    const dog = timmar(p, HALSA.infTim + 2), kall = (s.stat?.kallbrand ?? 0) >= 1;
    // en rengjord infektion går tillbaka, och såret läker sedan
    fyll(p); skada(s, p, 'benV', 'skarsar', 0.3, 'olycka', ''); p.skador![0].b = 0; p.skador![0].inf = 0.3; p.skador![0].ren = s.now + HALSA.renTim * HOUR;
    timmar(p, HALSA.renTim); const botad = p.skador?.[0]?.inf === undefined;
    // den som blöder trycker på sitt sår och lägger mossa på det
    fyll(p); fyll(q); q.x = c.x + 30; setAmount(s, 'mossa', 3);
    skada(s, p, 'handV', 'skarsar', 0.5, 'olycka', ''); p.task = undefined;
    chooseTask(s, p); const tk = () => p.task as Person['task']; const sjalvVal = tk()?.act === 'varda' && tk()?.ref === p.id;
    // (förbanden räknas i statistiken: de andra i byn hittar också mossa när de samlar)
    const forb0 = s.stat?.forband ?? 0;
    for (let i = 0; i < 40 * STEG_TIM && tk()?.act === 'varda'; i++) step(s, BEAT);
    const w = p.skador?.[0], trycktes = w?.b === 0, forband = w?.f === 1, mossa = amountOf(s, 'mossa'), lagda = (s.stat?.forband as number ?? 0) - forb0;
    // ett brutet ben: man kan inte gå, utan kravlar
    fyll(p); skada(s, p, 'benH', 'benbrott', 0.9, 'olycka', ''); const kryp = gangFart(p), kravlar = !kanGa(p) && kryp === HALSA.krypFart;
    // långt från lägret: en annan vuxen går dit och bär hem hen
    let lx = 0, ly = 0;
    for (let r = 14; r < 30 && !lx; r++) for (let a = 0; a < 16 && !lx; a++) {
      const x = c.x + 0.5 + Math.cos(a / 16 * Math.PI * 2) * r, y = c.y + 0.5 + Math.sin(a / 16 * Math.PI * 2) * r;
      if (x > 1 && y > 1 && x < W - 1 && y < W - 1 && getMap(s.seed).tiles[tileOf(x, y)] !== T.Vatten) { lx = x; ly = y; }
    }
    fyll(q); p.x = lx; p.y = ly; p.task = undefined; q.task = undefined;
    const langtBort = !hemma(s, p);
    const buren0 = s.stat?.['buren hem'] as number ?? 0; let hem = false;
    for (let i = 0; i < 12 * STEG_TIM && !hem; i++) { step(s, BEAT); if (tk()?.act !== 'buren' && hemma(s, p)) hem = true; }
    const bars = (s.stat?.['buren hem'] as number ?? 0) > buren0;
    // man läker fortare när man vilar
    fyll(p); skada(s, p, 'handV', 'krossar', 0.5, 'olycka', ''); p.skador![0].b = 0; timmar(p, 4); const vaken = p.skador![0].g;
    fyll(p); skada(s, p, 'handV', 'krossar', 0.5, 'olycka', ''); p.skador![0].b = 0; p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: s.now + 100 * HOUR, carry: 0, why: '' }; timmar(p, 4); const sover = p.skador![0].g;
    // mossa hittas i naturen och på ett fällt träd
    const t = { act: 'samla', phase: 'do', tx: p.x, ty: p.y, until: 0, carry: 0 } as const;
    setAmount(s, 'mossa', 0); const fynd = mossaFynd(s, { ...t }, 3600);
    const k = { id: 999, x: 1, y: 1, ved: 5, grenar: 2, mossa: 2 }; (s.stockar ??= []).push(k); const hugg = chopStock(s, 999, 1)?.mossa ?? 0;
    // en by i tolv dygn (tolv år i spelet, knappt två veckor i verkligheten): mossa hittas och såren vårdas
    // skadorna är få och slumpen avgör om ett sår behöver vård (by 1 fick bara en som inte blödde), så de första byarna prövas tills en har vårdat
    let b = createState(4, START); kor(b, 288);
    for (const n of [2, 3, 5]) { if ((b.stat?.vard ?? 0) > 0) break; b = createState(n, START); kor(b, 288); }
    const st = (n: string) => b.stat?.[n] as number ?? 0;
    return [
      [`ett infekterat sår som inte rengörs blir kallbrand och dödar (${dog ?? 'överlevde'})`, dog === 'kallbrand' && kall],
      ['ett rengjort infekterat sår blir friskt', botad],
      ['den som blöder väljer att vårda sitt sår', sjalvVal],
      [`blödningen stannar och ett förband av mossa läggs på (${lagda} förband, mossa kvar ${mossa})`, trycktes && forband && lagda === 1],
      [`den som har brutit benet kan inte gå och kravlar (${kryp} av farten)`, kravlar],
      [`den som inte kan gå långt från lägret bärs hem av en annan (${langtBort ? 'långt bort' : 'inte långt bort'}, bars ${bars}, hemma ${hem})`, langtBort && bars && hem],
      [`man läker fortare när man sover (${(0.5 - vaken).toFixed(3)} → ${(0.5 - sover).toFixed(3)} på fyra timmar)`, 0.5 - sover > 0.5 - vaken],
      [`mossa hittas när man letar (${fynd.toFixed(2)} i timmen) och när man hugger en fälld stam med mossa (${hugg})`, fynd > 0 && hugg === 2],
      [`på tolv dygn i en by: ${b.stat ? amountOf(b, 'mossa').toFixed(1) : 0} mossa, ${st('skador')} skador, ${st('vard')} vårdtillfällen (${st('vard av andra')} av andra), ${st('forband')} förband, ${st('infektioner')} infektioner, ${st('kallbrand')} kallbrand, ${st('buren hem')} burna hem`, st('vard') > 0 && amountOf(b, 'mossa') + st('forband') > 0],
    ];
  },
};

SCENARIER.halsoflik = {
  text: 'Steg 2.5.3: fliken Hälsa läser kroppen: varje skada som en rad med symbol, var den sitter, hur svår den är, om den blöder, vad som är gjort (förband, rengjort) och om den blir bättre eller sämre. Varje del i figuren får sin färg av hur skadad den är, och förmågorna (rörlighet, händighet, blod och smärta) visar sina värden och vad som sänker dem',
  kor: () => {
    const s = createState(5, START);
    const p = living(s)[0];
    Object.assign(p, { hunger: 1, torst: 1, health: 1, blod: 1, skador: undefined });
    const hel = skadeLista(p, s.now).length === 0 && Object.values(FORMAGOR).every(f => f.delar(p).length === 0) && delSkada(p, 'huvud') === 0;
    skada(s, p, 'handH', 'skarsar', 0.4, 'olycka', ''); skada(s, p, 'benV', 'benbrott', 0.8, 'olycka', '');
    const [sar, brott] = skadeLista(p, s.now);
    const sarRad = sar.namn === 'Skärsår i högra handen' && sar.bloder && sar.grad === 'svårt' && sar.battre && sar.tecken === '🔪';
    const brottRad = brott.namn === 'Benbrott i vänstra benet' && !brott.bloder && brott.grad === 'mycket svårt' && brott.tecken === '🦴';
    const farg = delSkada(p, 'benV') > delSkada(p, 'handH') && delSkada(p, 'handH') > 0 && delSkada(p, 'handV') === 0;
    // förmågorna: värdet är det simuleringen räknar med, och delarna visar var det kommer ifrån
    const rf = FORMAGOR.rorlighet, hf = FORMAGOR.handighet;
    const formagor = rf.varde(p) === rorlighet(p) && hf.varde(p) === handighet(p) && FORMAGOR.smarta.varde(p) === smarta(p)
      && Math.abs(1 + rf.delar(p).reduce((a, x) => a + x.v, 0) - rorlighet(p)) < 1e-9 && rf.delar(p).length === 1 && hf.delar(p).length === 1
      && FORMAGOR.blod.delar(p).length === 1 && FORMAGOR.smarta.delar(p).length === 2;
    // vården syns: förband och rengjort, och ett infekterat sår som inte rengörs blir sämre
    const w = p.skador![0]; w.f = 1; w.inf = 0.3;
    const smutsig = skadeLista(p, s.now)[0];
    w.ren = s.now + HOUR; const ren = skadeLista(p, s.now)[0];
    const vard = smutsig.tecken === '🦠' && !smutsig.battre && smutsig.gjort.includes('förband av mossa') && ren.battre && ren.gjort.includes('rengjort')
      && delSkada(p, 'handH') >= 0.3; // infektionen syns i figuren
    w.ren = s.now - 1; const gammal = skadeLista(p, s.now)[0]; // rengjordes för länge sedan: räknas inte längre
    w.inf = HALSA.kallbrand; const kall = skadeLista(p, s.now)[0];
    const text = skadeText(p, s.now);
    return [
      ['den som är hel har inget i listan och inget som sänker förmågorna', hel],
      [`ett skärsår blir en rad: ${sar.tecken} ${sar.namn}, ${sar.grad}, blöder, ${sar.gar}`, sarRad],
      [`ett benbrott blir en rad: ${brott.tecken} ${brott.namn}, ${brott.grad}, ${brott.gar}`, brottRad],
      [`delarna i figuren får färg av hur skadade de är (benet ${delSkada(p, 'benV').toFixed(2)}, handen ${delSkada(p, 'handH').toFixed(2)})`, farg],
      [`förmågorna visar simuleringens värden (rörlighet ${rf.varde(p).toFixed(2)}, händighet ${hf.varde(p).toFixed(2)}) och vad som sänker dem`, formagor],
      [`ett infekterat sår med förband visas som ${smutsig.gar}, och rengjort som ${ren.gar}`, vard],
      ['ett sår som rengjordes för länge sedan räknas inte som rengjort', !gammal.gjort.includes('rengjort') && !gammal.battre],
      [`kallbranden visas med ${kall.tecken} och blir sämre`, kall.tecken === '☠️' && !kall.battre],
      [`personrutans text läser samma rader (${text.length} rader)`, text.length === 2 && text[0].startsWith('Skärsår i högra handen')],
    ];
  },
};

SCENARIER.naring = {
  text: 'Steg 2.6.1: fem näringsvärden (energi, protein, fett, vitaminer, mineraler) fylls av maten efter vad den innehåller och sjunker olika fort. Mättnaden är en sammanfattning av dem: den sjunker som förut när inget värde är slut, och en portion höjer den lika mycket som förut när inget värde blir fyllt',
  kor: () => {
    const s = createState(5, START);
    const p = living(s)[0];
    // den som inte har några värden (en äldre sparning) har alla lika med mättnaden, och gränssnittet ändrar inget
    Object.assign(p, { hunger: 0.6, naring: undefined });
    const las = naringNu(p), orort = p.naring === undefined && NARINGAR.every(k => las[k] === 0.6);
    const n = naringOf(p), start = NARINGAR.every(k => n[k] === 0.6) && Math.abs(mattnad(n) - 0.6) < 1e-12;
    // på fyra timmar sjunker mättnaden som förut (fyra sextondelar), energin fortast och fettet långsammast
    naringSjunker(p, 4, KROPP.hungerTim);
    const sjonk = Math.abs(0.6 - p.hunger - 4 / KROPP.hungerTim) < 1e-9;
    const fortast = NARINGAR.every(k => n.energi <= n[k]) && NARINGAR.every(k => n.fett >= n[k]) && sjunker('energi', 16) > sjunker('fett', 16);
    // ett värde som är slut sjunker inte mer, och mättnaden sjunker då långsammare
    p.naring = { energi: 0, protein: 0.5, fett: 0.5, vitamin: 0.5, mineral: 0.5 }; p.hunger = mattnad(p.naring);
    const fore = p.hunger; naringSjunker(p, 1, KROPP.hungerTim);
    const slut = p.naring.energi === 0 && fore - p.hunger < 1 / KROPP.hungerTim;
    // äta: bär fyller vitaminerna mest, kött proteinet, och en portion höjer mättnaden med 0,55 när inget blir fyllt
    const at = (m: Record<string, number>, v: number) => {
      const q = living(s)[1]; Object.assign(q, { hunger: v, naring: undefined }); naringOf(q);
      rikBy(s); setMat(s, m); const fore = q.hunger; MAT.anvand(s, q);
      return { n: { ...q.naring! }, okt: q.hunger - fore };
    };
    const bar = at({ bar: 10 }, 0), kott = at({ kott: 10 }, 0), lag = at({ rotter: 10 }, 0.02);
    const barV = bar.n.vitamin > bar.n.protein && bar.n.vitamin > bar.n.energi;
    const kottP = kott.n.protein > kott.n.vitamin && kott.n.fett > bar.n.fett;
    const portion = Math.abs(lag.okt - 0.55) < 1e-9; // rötterna fyller inget värde helt när de börjar på 0,02
    const spill = bar.okt < 0.55 && bar.okt > 0.2; // bären fyller vitaminerna över taket, och det som går över försvinner
    // i byn: efter två dygn (två år i spelet) har alla värden, de ligger mellan 0 och 1 och mättnaden är deras sammanfattning
    const by = createState(3, START); kor(by, 48);
    const iByn = living(by).every(x => x.naring && NARINGAR.every(k => x.naring![k] >= 0 && x.naring![k] <= 1) && Math.abs(mattnad(x.naring) - x.hunger) < 1e-9);
    const olika = living(by).some(x => NARINGAR.some(k => Math.abs(x.naring![k] - x.hunger) > 0.05));
    return [
      ['den som inte har några värden läses som mättnaden, utan att något ändras', orort],
      ['värdena börjar lika med mättnaden', start],
      [`på fyra timmar sjunker mättnaden som förut (${(0.6 - p.hunger).toFixed(3)})`, sjonk],
      [`energin sjunker fortast och fettet långsammast (${NARINGAR.map(k => NARING[k].tecken + n[k].toFixed(2)).join(' ')})`, fortast],
      ['ett värde som är slut sjunker inte mer, och mättnaden sjunker långsammare', slut],
      [`bär ger mest vitaminer (${NARINGAR.map(k => NARING[k].tecken + bar.n[k].toFixed(2)).join(' ')})`, barV],
      [`kött ger mest protein och mer fett än bär (${NARINGAR.map(k => NARING[k].tecken + kott.n[k].toFixed(2)).join(' ')})`, kottP],
      [`en portion rötter höjer mättnaden med 0,55 (${lag.okt.toFixed(3)})`, portion],
      [`det som fyller ett värde över taket försvinner (bären höjde mättnaden med ${bar.okt.toFixed(2)})`, spill],
      ['i byn har alla fem värden mellan 0 och 1, och mättnaden är deras sammanfattning', iByn],
      ['i byn skiljer sig värdena från mättnaden efter vad man ätit', olika],
    ];
  },
};

SCENARIER.brist = {
  text: 'Steg 2.6.2: under en gräns ger ett näringsvärde brist. Bristen gör en sämre (trötthet, svaghet, fryser lätt, skörbjugg, yrsel och kramp), man äter helst det som fyller bristen, man längtar efter det och berättar om det, och den som vet att någon längtar efter något hämtar hellre den maten',
  kor: () => {
    const s = createState(5, START);
    const [p, q] = living(s);
    const satt = (x: Person, k?: Naring, v = 0) => { x.naring = { energi: 0.8, protein: 0.8, fett: 0.8, vitamin: 0.8, mineral: 0.8 }; if (k) x.naring[k] = v; x.hunger = mattnad(x.naring); };
    // hur stor bristen är
    satt(p, 'vitamin', NARINGBAL.brist); const ingen = bristGrad(p, 'vitamin') === 0;
    satt(p, 'vitamin', NARINGBAL.brist / 2); const halv = Math.abs(bristGrad(p, 'vitamin') - 0.5) < 1e-9;
    // det bristen gör: jämför med en som inte har någon brist
    satt(p); p.task = undefined; const arb0 = workRate(s, p, 'samla'), fart0 = rorlighet(p), vila0 = vilaTim(p), kyla0 = varmeDelar(s, p, 0.1, new Map(), -10).kyla;
    satt(p, 'protein'); const svag = workRate(s, p, 'samla') < arb0;
    satt(p, 'mineral'); const yr = rorlighet(p) < fart0 && workRate(s, p, 'samla') < arb0;
    const rf = FORMAGOR.rorlighet, delar = Math.abs(1 + rf.delar(p).reduce((a, x) => a + x.v, 0) - rorlighet(p)) < 1e-9 && rf.delar(p).length === 1;
    satt(p, 'energi'); const trott = vilaTim(p) < vila0;
    satt(p, 'fett'); const fryser = varmeDelar(s, p, 0.1, new Map(), -10).kyla > kyla0;
    satt(p, 'vitamin'); const skor = skorbjugg(p) > 0 && !!DODSORSAKER.skorbjugg;
    satt(p); const inget = skorbjugg(p) === 0;
    // man längtar efter det man saknar
    satt(p, 'vitamin'); p.thoughts = []; bristSteg(p, s.now);
    const langtar = p.thoughts.some(t => t.text === 'Längtar efter bär');
    // man äter helst det som fyller bristen
    const ord = matOrdning(p), forst = ord[0] === 'bar';
    satt(p, 'protein'); const kottForst = ['kott', 'fisk', 'abborre', 'vilt', 'grillkott', 'grillfisk', 'torrkott', 'torrfisk'].includes(matOrdning(p)[0]);
    satt(p); const vanlig = matOrdning(p) === FOOD;
    rikBy(s); setMat(s, { rotter: 10, bar: 10, kott: 10 }); satt(p, 'vitamin');
    const tar = takeFood(s, 0.3, p).per, tarBar = (tar.bar ?? 0) >= 0.3 - 1e-9;
    // man berättar om det, och den som vet hämtar hellre det
    satt(p, 'vitamin'); satt(q); q.langtan = undefined;
    const fore = onskan(q, 'samla', s.now) === 1;
    berattaBrist(p, q, s.now);
    const minns = ((q as Person).langtan?.vitamin ?? 0) > s.now, samla = onskan(q, 'samla', s.now), jakt = onskan(q, 'jakt', s.now);
    const hellre = samla > jakt && samla > 1 && onskan(q, 'ved', s.now) === 1;
    q.langtan = undefined; let hort = false;
    for (let i = 0; i < 20 && !hort; i++) { converse(s, p, [q]); hort = ((q as Person).langtan?.vitamin ?? 0) > s.now; }
    const glomt = (() => { satt(q); bristSteg(q, s.now + (NARINGBAL.minns + 1) * HOUR); return (q as Person).langtan === undefined; })();
    // i byn: efter tre dygn (tre år i spelet) längtar någon efter något, och inget omöjligt har hänt
    const by = createState(3, START); kor(by, 72);
    const iByn = living(by).some(x => x.langtan || x.thoughts.some(t => t.text.startsWith('Längtar efter')));
    return [
      ['inget under gränsen ger ingen brist', ingen],
      ['halva gränsen ger halv brist', halv],
      ['brist på protein: arbetet går långsammare', svag],
      ['brist på mineraler: gången och arbetet går långsammare', yr],
      ['fliken Hälsa visar yrseln som en del av rörligheten', delar],
      ['brist på energi: vilan sjunker fortare', trott],
      ['brist på fett: kylan biter mer', fryser],
      ['brist på vitaminer: skörbjugg, hälsan sjunker', skor],
      ['utan brist ingen skörbjugg', inget],
      ['den som har brist på vitaminer längtar efter bär', langtar],
      [`den som har brist på vitaminer äter helst bär (${ord.join(', ')})`, forst],
      ['den som har brist på protein äter helst kött eller fisk', kottForst],
      ['utan brist äts maten i den vanliga ordningen', vanlig],
      [`ur förrådet tar den som saknar vitaminer bären (${JSON.stringify(tar)})`, tarBar],
      ['den som inte vet något hämtar inte någon särskild mat hellre', fore],
      ['den som får höra det minns det', minns],
      [`och samlar hellre (${samla.toFixed(2)}) än jagar (${jakt.toFixed(2)}); veden ändras inte`, hellre],
      ['i ett samtal berättar man vad man längtar efter', hort],
      ['det glöms efter en tid', glomt],
      ['i byn längtar någon efter något, eller har hört att någon gör det', iByn],
      ['i byn har ingen fått något omöjligt', living(by).every(x => x.health >= 0 && x.health <= 1)],
    ];
  },
};
