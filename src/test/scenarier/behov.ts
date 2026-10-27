// Scenarier. Behov och val: behov, ved, aktivitet och fritid.
import { Person, createState, getRel, step, living, temperature, nyKalender, amountOf, capacity, load, isLight, T, FOOD, ageOf, getMap, HOUR, W, tileOf, stat, campCenter, KANIN, gain, takeFuel, ownsAmount, ownedSum, addTo, setAmount, needLadder, MAT, ownFor, takeMaterial, getable, fuelFor, STOLD_LINDRIG, STOLD_OP, BEAT, spar, isWork, ACTS } from '../../sim';
import { START, STEG_DYGN } from '../kor';
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
    // vanliga byar är fattiga de första dygnen, så det mesta av maten är byns och delas utan gåvor (delning.ts)
    let egen = 0, allt = 0;
    for (const seed of [1, 42]) { const v = createState(seed, START); for (let i = 0; i < 2 * STEG_DYGN; i++) step(v, BEAT); for (const k of FOOD) { egen += ownedSum(v, k); allt += amountOf(v, k); } }
    return [
      ['den hungrige tar inte en oväns mat innan nöden är stor', tarInte],
      ['byns mat går före andras', byns],
      ['ett barn får mat av sin förälder, som delar också det sista (och kan väckas)', foralder],
      ['en vän ger av det hen har över', van],
      ['den med mycket hög empati stjäl aldrig, inte ens döende', aldrig],
      ['den med låg empati stjäl när den svälter', stal],
      ['den bestulne märker det och relationen blir sämre', marker],
      [`man stjäl helst av den man inte tycker om (${ovan} av 40)`, ovan >= 28],
      [`i nya byar är det mesta av maten byns efter 2 dygn (2 år i spelet): ${(100 * egen / Math.max(1, allt)).toFixed(0)} % är någons eget`, allt > 0 && egen < allt / 2],
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
    const marker = Math.abs(getRel(s, b, a).op - (fore - STOLD_LINDRIG)) < 1e-9 && !b.stulet;
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
      [`den bestulne märker det, och relationen blir ${STOLD_LINDRIG} sämre (inte ${STOLD_OP})`, marker],
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
      // en timmes bärplockning med gångtiden ger ca 0,17 i medel för byarna 1–8 (uppmätt i v47, efter 1.5.13). Bandet är brett:
      // talet beror på årstiden och slumpen, och det ändras när balansen ses över. Provet ska bara fånga en stor ändring
      [`bärplockning ger ungefär lika mycket per timme som förut (${pl.toFixed(2)}, medel av åtta byar)`, pl > 0.1 && pl < 0.45],
    ];
  },
};

SCENARIER.fritid = {
  text: 'På fritiden tar folk promenader (de nyfikna och modiga längre bort), badar när det är varmt och sitter vid stranden',
  kor: () => {
    const folk: { d: number; v: number }[] = [];
    let prom = 0, bad = 0, badVarmt = true, n = 0, strand = 0, strandLand = true;
    for (const seed of [5, 6, 7, 8]) { // fyra byar, så att slumpen inte avgör
    const s = createState(seed, START), gang = new Map<number, number>(), sett = new WeakSet<object>();
    s.kal = nyKalender(s.now, 2); // sommar
    setFood(s, 40); setAmount(s, 'ved', 40); // gott ställt, tid över
    kor(s, 4 * 24, s => {
      for (const p of living(s)) {
        const t = p.task;
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
    ];
  },
};
