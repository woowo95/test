// Scenarier. Byggnader och lager: byggnader, förrådshus, familjehus, funktion, påbörjat, bostad, bygg, lager och lagerplatser.
import { isDeepStrictEqual } from 'node:util';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MIN, Person, Act, createState, addTool, FOREST, HOUR_S, toolsOf, BYN, step, living, sees, ageIndex, cloneState, ageStart, sightOf, pilesOf, zoneOf, amountOf, STACK, capacity, load, dropLoad, T, isStored, zonesOf, allows, ageOf, groundOf, getMap, DAY, HOUR, W, State, tileOf, rektAvstand, stat, bynsMitt, die, heatAt, bitsOf, housesOf, gridOf, touch, roomAt, insulation, isWall, Bit, wearBuild, treeOn, ownsAmount, addTo, setAmount, isFood, grundvarde, tingOf, komOf, BYGGNADER, FN, mostUrgent, fnId, fnOf, planBuild, workOn, wearMult, LAGER, homeless, sovplatser, inZone, startWork, workHalf, finishHalf, stepPaborjat, halvOf, tingVarde, HALV_TID, fallTid, treeSpot, SEC, Task, familjOf, bedTile, takeForHouse, put, stepByggnader, husNamn, spotFor, roofed, MATERIAL, usable, dropSpot, ALDER, KROPP, samlingRum, varmareInne, haulJob, fetchFuel, chooseTask, minOf } from '../../sim';
import * as SIM from '../../sim';
import { findPath } from '../../sim/vag';
import { KANIN } from '../../sim/redskap';
import { START, STEG_TIM } from '../kor';
import { setItems, setFood, kor, klockan, tandEld, byggare, byggKlart, nyInvanare, medBank, medHus, STOCKHOLM, SCENARIER } from './hjalp';

SCENARIER.byggnader = {
  text: 'Varje sorts byggnad är en rad i ett register med behov och vikt. Byn bygger för det mest akuta behovet, faror först: den som saknar tak över huvudet får en sovsal',
  kor: () => {
    const rader = FN.every(fn => { const r = BYGGNADER[fn]; return !!(r.namn && r.ikon && r.behov); });
    const ny = createState(6, START), u = mostUrgent(ny);
    // en by där alla vuxna kan göra timmerväggar och har yxor bygger ett hus
    const q = createState(6, START);
    byggare(q); setAmount(q, 'yxa', 2);
    kor(q, 6);
    const h = housesOf(q)[0];
    // ett hus får inte stänga in mark (v135): en udde med vatten på tre sidor stängs in av ett hus på den fjärde, men inte
    // av ett hus mitt på land
    const g = groundOf(ny), f = SIM.eldPlats(ny), fri = (x: number, y: number) => SIM.inMap(x, y) && g.tiles[y * W + x] !== T.Vatten;
    const nas = (x: number, y: number) => !!findPath(g, f.x + 0.5, f.y + 0.5, x + 0.5, y + 0.5);
    let udde: { x: number; y: number } | undefined, land: { x: number; y: number } | undefined;
    for (let i = 0; i < W * SIM.H && !(udde && land); i++) {
      const x = i % W, y = (i - x) / W, ut = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => fri(x + dx, y + dy));
      if (!udde && fri(x, y) && ut.length === 1 && nas(x, y)) udde = { x: ut[0][0] === 1 ? x + 1 : ut[0][0] === -1 ? x - 3 : x - 1, y: ut[0][1] === 1 ? y + 1 : ut[0][1] === -1 ? y - 3 : y - 1 };
      let alltLand = true;
      for (let yy = y - 1; yy <= y + 3 && alltLand; yy++) for (let xx = x - 1; xx <= x + 3 && alltLand; xx++) alltLand = fri(xx, yy);
      if (!land && alltLand && Math.hypot(x - f.x, y - f.y) < 12 && nas(x - 1, y - 1)) land = { x, y };
    }
    return [
      [`ett hus intill en udde stänger in den (${udde ? `vid ${udde.x}, ${udde.y}` : 'ingen udde på kartan'})`, !!udde && SIM.stangerIn(ny, udde.x, udde.y, 3, 3)],
      [`ett hus mitt på land stänger inte in något (${land ? `vid ${land.x}, ${land.y}` : 'ingen plats'})`, !!land && !SIM.stangerIn(ny, land.x, land.y, 3, 3)],
      ['varje rad har namn, symbol och behov', rader],
      [`utan sovplatser är sovsalen det mest akuta, en fara (${u?.fn ?? 'inget'})`, u?.fn === 'sovsal' && BYGGNADER.sovsal.fara],
      [`byns första hus blir en sovsal (${h ? fnOf(h).namn : 'inget hus'})`, h?.fn === 'sovsal' && fnOf(h).namn === 'Sovsal'],
    ];
  },
};


SCENARIER.forradshus = {
  lang: true,
  text: 'Ruttnar maten eller är förrådet fullt bygger byn ett förrådshus. Golvet blir en lagerplats under tak, där det som ligger ruttnar och slits mindre, och maten bärs in dit',
  kor: () => {
    const s = createState(6, START);
    klockan(s);
    byggare(s);
    planBuild(s); const sov = byggKlart(s);
    const tak = homeless(s) === 0;
    const forr = mostUrgent(s);
    s.ruttet = 50; // mycket mat har ruttnat på sistone
    const nu = mostUrgent(s);
    planBuild(s); const h = byggKlart(s);
    const z = zonesOf(s).find(q => q.hus === h?.id);
    const inne = !!z && wearMult(s, z.x, z.y) === LAGER.inne && (z.prio ?? 0) > Math.max(...zonesOf(s).filter(q => q !== z).map(q => q.prio ?? 0));
    // som spelet frågar: inga sovplatser i husets rum, och ingen har sin sovplats där
    const iH = (i: number | undefined) => !!h && i !== undefined && i % W >= h.x && i % W < h.x + h.w && Math.floor(i / W) >= h.y && Math.floor(i / W) < h.y + h.h;
    const sover = !!h && gridOf(s).rooms.every(r => r.hus !== h.id || !sovplatser(s, r)) && !living(s).some(p => iH(bedTile(s, p)));
    // en vanlig by: förrådshuset byggs när maten börjat ruttna, och maten flyttas in
    // (den första av några byar där det händer inom 30 dygn, 30 år i spelet, fyra veckor i verkligheten). Bara ungefär
    // var tredje by bygger ett förrådshus så tidigt, så byarna är valda bland dem som gjort det med god marginal; med
    // byar som var nära gränsen (dygn 39 av 40) avgjorde minsta ändring någon annanstans om provet gick igenom
    let byggt = 0, iHuset = 0;
    for (const seed of [16839, 80191, 1001]) { // valda igen i steg 9.9.4 bland byarna i npm run hus som byggt förrådshuset tidigt (dygn 4, 5 och 6); by 9, 16 och 4 gjorde det inte längre inom 30 dygn
      const v = createState(seed, START);
      byggt = 0; iHuset = 0;
      for (let dygn = 0; dygn < 30 && !(byggt && iHuset); dygn++) kor(v, 24, v => {
        const f = housesOf(v).find(q => q.fn === 'forrad' && q.klar);
        if (f && !byggt) byggt = v.now;
        const fz = zonesOf(v).find(q => q.hus === f?.id);
        if (f && fz) iHuset = Math.max(iHuset, pilesOf(v).filter(a => isFood(a.k) && inZone(fz, a.x, a.y)).length);
      });
      if (byggt && iHuset) break;
    }
    return [
      [`med alla under tak är inget hus akut (${forr?.fn ?? 'inget'})`, !!sov && tak && !forr],
      [`när maten ruttnar är förrådshuset det mest akuta (${nu?.fn ?? 'inget'})`, nu?.fn === 'forrad'],
      ['förrådshusets golv blir byns viktigaste lagerplats, under tak', h?.fn === 'forrad' && inne],
      ['ingen sover i förrådshuset', sover],
      [`i en vanlig by byggs ett förrådshus (dygn ${byggt ? ((byggt - START) / DAY).toFixed(0) : '–'}, lika många år i spelet) och maten bärs in (${iHuset} stackar)`, byggt > 0 && iHuset > 0],
    ];
  },
};

SCENARIER.familjehus = {
  lang: true,
  text: 'Ett par med barn som inte har något eget hus och äger nog för att betala det bygger ett familjehus. Familjens material tas först, familjen sover där, huset går i arv och blir byns när ingen äger det',
  kor: () => {
    const s = createState(6, START);
    klockan(s);
    byggare(s);
    planBuild(s); byggKlart(s); // först en sovsal åt alla
    // grundarna: ett par med ett barn, och ett par utan barn
    const ppl = living(s).sort((x, y) => x.id - y.id), c = ppl.find(q => q.mother !== undefined)!, a = ppl.find(q => q.id === Math.min(c.mother!, c.father!))!;
    const b = ppl.find(q => q.id === a.partner)!, d = ppl.find(q => q !== a && q !== b && q !== c)!;
    const fam = familjOf(s, a.id).map(q => q.id);
    const fattig = mostUrgent(s)?.fn !== 'familjehus';
    put(s, 'ved', 30 * MATERIAL.timmer!.n, { [b.id]: 30 * MATERIAL.timmer!.n }); // familjen blir rik nog
    const u = mostUrgent(s);
    planBuild(s);
    const h = housesOf(s).find(q => q.fn === 'familjehus');
    const planerad = u?.fn === 'familjehus' && !!h && h.ag === a.id && h.namn === husNamn(a.name), namn = h?.namn ?? 'inget';
    // det som finns att bygga med räknar familjens trä en gång, för alla som bygger (samhalle-57, samhalle-63)
    const allt = SIM.avail(s, 'ved', undefined, h?.id), forMycket = living(s).filter(p => SIM.avail(s, 'ved', p, h?.id) > allt + 1e-9).map(p => p.name);
    const helper = SIM.avail(s, 'ved', d, h?.id);
    // den som hjälper till tar familjens trä först
    const fore = ownsAmount(s, b, 'ved'), kom: Record<string, number> = {};
    const ag = takeForHouse(s, d, h?.id, 'ved', 2, kom);
    const familjens = Math.abs(fore - ownsAmount(s, b, 'ved') - 2) < 1e-9 && Math.abs((ag[b.id] ?? 0) - 2) < 1e-9 && (kom[`familj:${b.id}:ved`] ?? 0) > 0;
    byggKlart(s);
    const inne = (p: Person) => { const i = bedTile(s, p); return !!h && i !== undefined && i % W > h.x && i % W < h.x + h.w - 1 && Math.floor(i / W) > h.y && Math.floor(i / W) < h.y + h.h - 1; };
    const sover = !!h?.klar && [a, b, c].every(inne) && !inne(d) && homeless(s) === 0;
    // ägaren dör: partnern ärver huset, som får hens namn; partnern flyttar: huset blir byns
    die(s, a, 'sjukdom');
    const arv = h?.ag === b.id && h.namn === husNamn(b.name);
    b.left = s.now; stepByggnader(s);
    const byns = !!h && h.ag === undefined;
    // vanliga byar: familjehus byggs när par fått barn och har råd
    let planerat = 0, dygn = 0;
    for (const seed of [6, 4, 2]) {
      const v = createState(seed, START);
      for (dygn = 1; dygn <= 40 && !planerat; dygn++) { kor(v, 24); planerat = v.stat?.planerat_familjehus ?? 0; }
      if (planerat) break;
    }
    return [
      [`familjen är ägaren, partnern och barnen (${fam.length})`, fam.length === 3 && fam.includes(c.id)],
      ['en familj som inte har råd bygger inget eget hus', fattig],
      [`med nog i eget planeras ett familjehus som familjen äger (${namn})`, planerad],
      [`familjens trä räknas en gång i det som finns att bygga med (${allt.toFixed(0)} trä; för mycket hos ${forMycket.join(', ') || 'ingen'}; ${helper.toFixed(0)} för ${d.name})`, forMycket.length === 0 && Math.abs(helper - allt) < 1e-6],
      ['till familjehuset tas familjens eget material först', familjens],
      ['familjen sover i sitt hus, de andra i sovsalen', sover],
      ['huset ärvs av partnern och får hens namn', arv],
      ['när ägaren flyttat blir huset byns', byns],
      [`i en vanlig by planeras ett familjehus (dygn ${planerat ? dygn - 1 : '–'}, lika många år i spelet)`, planerat > 0],
    ];
  },
};

SCENARIER.agandet = {
  text: 'Ägandet i husen (steg 3.10.2): en bädd har alltid en ägare, den som sover i den, och delas inte. Ingen bygger möbler i någon annans hus. Får en familj ett eget hus bär de dit sina bäddar eller lämnar dem åt den som sover i sovsalen, och det som inte är husägarens flyttas ut eller tas isär när huset byter ägare; det byn äger gemensamt står kvar',
  kor: () => {
    const { stationerOf, stationRum, stepStationer, stationSpot, sovPlats, farBygga, isKlar, roomAt } = SIM;
    const s = createState(6, START);
    klockan(s); byggare(s);
    planBuild(s); byggKlart(s); // en sovsal åt alla
    for (let i = 0; i < 4 && SIM.stationSite(s, 'halmbadd'); i++) medBank(s, 'halmbadd');
    for (const p of living(s)) { p.x = 1.5; p.y = 1.5; p.task = undefined; } // ingen står i vägen
    stepStationer(s);
    const baddar = () => stationerOf(s).filter(t => t.k === 'halmbadd' && isKlar(t)), ruta = (t: SIM.Station) => t.y * W + t.x;
    const b0 = baddar(), agare = b0.map(t => t.ag), egen = b0.every(t => { const o = s.people.find(q => q.id === t.ag); return !!o && sovPlats(s, o) === ruta(t); });
    // familjen bygger ett eget hus
    const ppl = living(s).sort((x, y) => x.id - y.id), c = ppl.find(q => q.mother !== undefined)!, a = ppl.find(q => q.id === Math.min(c.mother!, c.father!))!;
    const b = ppl.find(q => q.id === a.partner)!;
    put(s, 'ved', 30 * MATERIAL.timmer!.n, { [b.id]: 30 * MATERIAL.timmer!.n });
    planBuild(s);
    const h = housesOf(s).find(q => q.fn === 'familjehus')!;
    byggKlart(s);
    const fam = familjOf(s, a.id), ute = ppl.find(q => !fam.includes(q))!;
    const iH = (t: SIM.Station) => stationRum(s, t)?.hus === h.id;
    // ingen annan bygger i familjens hus: en halvbyggd bädd där byggs bara vidare av familjen
    const rum = SIM.gridOf(s).rooms.find(r => r.hus === h.id)!, i0 = rum.tiles.find(i => !SIM.stationAt(s, i % W, Math.floor(i / W)) && !SIM.stationAt(s, i % W + 1, Math.floor(i / W)) && rum.tiles.includes(i + 1))!;
    const halv: SIM.Station = { id: s.nextStation = (s.nextStation ?? 0) + 1, k: 'halmbadd', x: i0 % W, y: Math.floor(i0 / W), kvar: 10 * MIN, inne: 1 };
    s.stationer!.push(halv); SIM.touch(s);
    const spotA = stationSpot(s, 'halmbadd', a), spotU = stationSpot(s, 'halmbadd', ute);
    const halvOk = farBygga(s, h, a) && !farBygga(s, h, ute) && !!spotA && roomAt(s, Math.floor(spotA.x), Math.floor(spotA.y))?.hus === h.id && (!spotU || roomAt(s, Math.floor(spotU.x), Math.floor(spotU.y))?.hus !== h.id);
    s.stationer = s.stationer!.filter(t => t !== halv); SIM.touch(s);
    const egetHus = !!h.klar && h.ag === a.id;
    // familjens bäddar i sovsalen bärs hem eller lämnas
    for (let i = 0; i < 3; i++) stepStationer(s);
    const famBaddar = baddar().filter(t => fam.some(q => q.id === t.ag)), hemma = famBaddar.every(iH);
    const famFore = agare.filter(x => fam.some(q => q.id === x)).length;
    const bar = s.log.filter(r => /bar sin halmbädd/.test(r.text)).length, lamnade = s.log.filter(r => /lämnade sin halmbädd/.test(r.text)).length;
    // familjens egen bädd i huset och byns slöjdbänk, som också står där
    const fri = () => rum.tiles.find(i => rum.tiles.includes(i + 1) && [i, i + 1].every(j => !SIM.stationAt(s, j % W, Math.floor(j / W))));
    const stall = (k: string, ag?: number) => { const i = fri() ?? i0, t: SIM.Station = { id: s.nextStation = (s.nextStation ?? 0) + 1, k, x: i % W, y: Math.floor(i / W), kvar: 0, inne: 1, ag }; s.stationer!.push(t); SIM.touch(s); return t; };
    // den egna bädden åt någon i familjen som inte redan har en (nu när familjens bäddar får plats i huset, steg 9.2.36)
    const utan = fam.find(q => !SIM.baddOf(s, q)) ?? a, egenB = stall('halmbadd', utan.id), bank = stall('flatarbank');
    const iHus = iH(egenB);
    const iHuset = iHus && iH(bank);
    // huset byter ägare (som när det köps eller ärvs av någon utanför familjen): familjens bäddar flyttas ut eller tas isär
    h.ag = ute.id; SIM.touch(s);
    for (let i = 0; i < 3; i++) stepStationer(s);
    const nyFam = familjOf(s, ute.id), kvar = stationerOf(s).filter(t => iH(t) && t.ag !== undefined && !nyFam.some(q => q.id === t.ag));
    const bankKvar = iHuset && stationerOf(s).some(t => t.id === bank.id && iH(t)), egenUt = !stationerOf(s).some(t => t.id === egenB.id && iH(t));
    const enPer = new Set(baddar().map(t => t.ag).filter(x => x !== undefined)).size === baddar().filter(t => t.ag !== undefined).length;
    return [
      [`varje bädd har en ägare, som sover i den (${b0.length} bäddar, ägare ${agare.join(', ')})`, b0.length >= 2 && agare.every(x => x !== undefined) && egen],
      [`familjen får ett eget hus (${h?.namn ?? 'inget'})`, egetHus],
      ['i familjens hus bygger bara familjen, också vidare på en halvbyggd bädd', halvOk],
      [`familjens bäddar bärs till deras hus eller lämnas (${bar} bars dit, ${lamnade} lämnades, ${famBaddar.length} i familjens ägo)`, hemma && bar + lamnade >= 1 && bar + lamnade === famFore],
      [`när huset får en ny ägare flyttas det ut som inte är den nya familjens (${kvar.length} kvar, familjens egen bädd ${egenUt ? 'ute' : 'kvar'})`, kvar.length === 0 && egenUt],
      ['byns slöjdbänk i huset står kvar', bankKvar],
      ['ingen äger två bäddar', enPer],
    ];
  },
};

SCENARIER.funktion = {
  text: 'Funktionen följer behovet: en sovsal som ingen sover i blir förrådshus eller samlingshus eller rivs, ett samlingshus blir sovsal när sovplatserna inte räcker, och ett familjehus utan ägare blir sovsal. När det är kallt umgås man i samlingshuset',
  kor: () => {
    const s = createState(6, START);
    klockan(s);
    byggare(s);
    planBuild(s); const A = byggKlart(s)!;
    // fler i byn, så att det behövs en sovsal till; sedan går de igen och den nya står tom
    const gaster = Array.from({ length: 8 }, (_, i) => ({ ...structuredClone(living(s)[0]), id: 1000 + i, name: `Gäst${i}`, partner: undefined, task: undefined }));
    const kom = () => { for (const g of gaster) g.left = undefined; }, gar = () => { for (const g of gaster) g.left = s.now; };
    s.people.push(...gaster);
    const byggaUtForesla = SIM.BYGGATGARDER.byggaUt.foresla; SIM.BYGGATGARDER.byggaUt.foresla = () => []; // här prövas ett nytt hus, inte en utbyggnad (sätts tillbaka före svaret)
    const nyttHus = () => { s.byggSok = undefined; planBuild(s); return byggKlart(s)!; };
    const B = nyttHus();
    gar(); s.ruttet = undefined;
    stepByggnader(s); const vantar = fnId(B) === 'sovsal';
    s.now += DAY + HOUR; stepByggnader(s);
    const samling = B.fn === 'samling' && B.namn === 'Samlingshuset', bNamn = B.namn;
    // en sovsal till som ingen behöver rivs, eftersom byn redan har ett samlingshus
    kom(); const C = nyttHus(); gar();
    const ved0 = amountOf(s, 'ved');
    stepByggnader(s); s.now += DAY + HOUR; stepByggnader(s);
    const rivet = !housesOf(s).includes(C) && (s.stat?.rivet ?? 0) === 1 && amountOf(s, 'ved') > ved0 && !bitsOf(s).some(b => b.hus === C.id);
    // när det är kallt och elden är slocknad umgås man i samlingshuset
    s.now = ageStart(s, 0) + 3 * HOUR; s.fire.lit = false; s.fire.fuel = 0; // i istiden
    const iB = (sp: { x: number; y: number }) => sp.x >= B.x && sp.x < B.x + B.w && sp.y >= B.y && sp.y < B.y + B.h && roofed(s, sp.x, sp.y);
    const inne = iB(spotFor(s, 'samtal', living(s)[1]));
    // brinner elden går den som ska värma sig till elden, om det inte är minst lika varmt i samlingshuset (lätt kyla:
    // huset förlorar lite värme, elden ger mer). Samtalet får vara inne då
    Object.assign(s.fire, { lit: true, fuel: 4 });
    const sal = samlingRum(s)!, varmInne = varmareInne(s, sal, 0.02, true), samtalInne = varmareInne(s, sal, 0.02);
    s.fire.lit = false; s.fire.fuel = 0;
    // sovplatserna räcker inte: samlingshuset blir en sovsal igen
    kom(); stepByggnader(s);
    const tillbaka = fnId(B) === 'sovsal';
    // ingen sover där igen, och maten ruttnar: det blir ett förrådshus
    // (steg 2.12.5: ett tomt hus blir förrådshus redan efter några timmar, före ett nytt hus)
    gar(); s.ruttet = 50; stepByggnader(s); s.now += 5 * HOUR; const hus0 = housesOf(s).length; stepByggnader(s);
    const forrad = B.fn === 'forrad' && zonesOf(s).some(z => z.hus === B.id) && housesOf(s).length === hus0;
    // ett familjehus som ingen äger blir en sovsal
    A.fn = 'familjehus'; A.ag = undefined; stepByggnader(s);
    const fam = fnId(A) === 'sovsal';
    SIM.BYGGATGARDER.byggaUt.foresla = byggaUtForesla;
    return [
      ['en sovsal som just blivit tom får vara kvar ett tag', vantar],
      [`efter ett dygn (ett år i spelet) blir den ett samlingshus (${bNamn})`, samling],
      ['när det är kallt samtalar man i samlingshuset i stället för vid den slocknade elden', inne],
      [`den som ska värma sig går till elden som brinner, inte till ett samlingshus som är kallare (samtalet ${samtalInne ? 'inne' : 'ute'})`, !varmInne && samtalInne],
      ['finns redan ett samlingshus rivs nästa tomma sovsal, och en del av timret kommer tillbaka', rivet],
      ['saknas sovplatser blir samlingshuset en sovsal igen', tillbaka],
      ['en tom sovsal blir förrådshus när maten ruttnar, efter fem timmar (en femtedels år i spelet) och i stället för ett nytt hus', forrad],
      ['ett familjehus utan ägare blir en sovsal', fam],
    ];
  },
};

SCENARIER.paborjat = {
  text: 'Ett redskap som inte blir klart blir en sak: materialet tas när arbetet börjar, bara den som började arbetar vidare, det ägs och ärvs och är värt sitt material, och utan arbete slits det och blir sitt material igen. Ett träd som någon börjat fälla står kvar halvfällt',
  kor: () => {
    const s = createState(6, START);
    klockan(s);
    setItems(s, { flinta: 4, grenar: 6 });
    const [p, q] = living(s).filter(r => ageOf(r, s.now) >= 18);
    for (const r of living(s)) r.tek = { ...r.tek, yxa: 1 };
    const uppgift = (r: Person, act: Act): Task => (r.task = { act, phase: 'do', tx: r.x, ty: r.y, until: s.now, carry: 0 });
    // p börjar på en yxa: materialet tas, och arbetet räknas från att hen kom fram
    const t1 = uppgift(p, 'yxa'); startWork(s, p, t1);
    const h = halvOf(s, p, ['yxa']), lang = t1.until - s.now, nara = (a: number, b: number) => Math.abs(a - b) < 1e-6;
    const tagit = !!h && nara(amountOf(s, 'flinta'), 3) && nara(amountOf(s, 'grenar'), 5) && lang === minOf('yxa') * MIN;
    workHalf(s, p, t1, 180); p.task = undefined; // tre minuter, sedan avbryts arbetet
    for (let i = 0; i < 10; i++) stepPaborjat(s); // tio timmar utan arbete
    const slits = !!h && Math.abs(h.c - (1 - 10 * 3600 * SEC / HALV_TID)) < 1e-9 && h.halv!.kvar === (minOf('yxa') - 3) * MIN;
    // bara den som började arbetar vidare: q börjar på en egen
    const t2 = uppgift(q, 'yxa'); startWork(s, q, t2);
    const egen = t2.ref !== h?.id && nara(amountOf(s, 'flinta'), 2); q.task = undefined;
    const t3 = uppgift(p, 'yxa'); startWork(s, p, t3);
    const vidare = t3.ref === h?.id && t3.until - s.now === (minOf('yxa') - 3) * MIN && nara(amountOf(s, 'flinta'), 2);
    // värt sitt material, och går i arv
    const varde = !!h && Math.abs(tingVarde(h) - (grundvarde('flinta') + grundvarde('grenar'))) < 1e-9;
    workHalf(s, p, t3, (minOf('yxa') - 3) * 60); s.now = t3.until; finishHalf(s, p, t3); p.task = undefined;
    const klar = !halvOf(s, p, ['yxa']) && toolsOf(s, 'yxa').some(t => t.agare === p.id);
    // q:s yxa blir inte klar: den slits ut och blir flinta och grenar igen hos q, eller hos den som ärvt den
    const hq = halvOf(s, q, ['yxa'])!, fore = ownsAmount(s, q, 'flinta');
    for (let i = 0; i < 49; i++) stepPaborjat(s);
    const upplost = !tingOf(s).some(t => t === hq) && Math.abs(ownsAmount(s, q, 'flinta') - fore - 1) < 1e-9 && (s.stat?.upplost ?? 0) === 1;
    const t4 = uppgift(q, 'yxa'); startWork(s, q, t4); q.task = undefined;
    const arving = living(s).find(r => r !== q && r.id === q.partner) ?? living(s).find(r => r !== q && r !== p)!;
    q.partner = arving.id; arving.partner = q.id;
    die(s, q, 'sjukdom');
    const arv = tingOf(s).find(t => t.id === t4.ref)?.agare === arving.id;
    // ett träd: den som börjar fälla det lämnar det halvfällt, och nästa fäller det färdigt
    addTool(s, 'yxa', p);
    const g = groundOf(s), c = bynsMitt(s);
    let ti = -1;
    for (let d = 1; d < 30 && ti < 0; d++) for (let y = c.y - d; y <= c.y + d && ti < 0; y++) for (let x = c.x - d; x <= c.x + d; x++) if (g.trees[y * W + x] >= 0.95) { ti = y * W + x; break; }
    const ft = uppgift(p, 'falla'); ft.tx = (ti % W) + 0.5; ft.ty = Math.floor(ti / W) + 0.5; startWork(s, p, ft);
    const heltid = ft.until - s.now === fallTid(s, ti);
    workHalf(s, p, ft, 60); p.task = undefined; // en minut
    const sp = treeSpot(s, new Set(), living(s)[0]);
    const valjs = !!sp && tileOf(sp.x, sp.y) === ti;
    const r = living(s).find(x => x !== p)!, rt = uppgift(r, 'falla'); rt.tx = ft.tx; rt.ty = ft.ty; startWork(s, r, rt);
    const kvar = rt.until - s.now === fallTid(s, ti) - 60 * SEC;
    // i en vanlig by avbryts arbete och tas upp igen. Om det händer beror på byn: sedan toa-smutsen kom (steg 2.7.2) råkar
    // inget tas upp igen i by 6 på 30 dygn, så nästa by prövas (by 4 och 5 har det 2–3 gånger)
    let st: Record<string, number> = {};
    for (const by of [6, 4, 5]) {
      const v = createState(by, START);
      kor(v, 30 * 24);
      st = v.stat ?? {};
      if ((st.fortsatt ?? 0) > 0 && (st.iSammaPass ?? 0) > 0) break;
    }
    return [
      ['materialet tas när arbetet börjar, och tiden räknas därifrån', tagit],
      ['det påbörjade slits medan ingen arbetar med det, och arbetet som gjorts finns kvar', slits],
      ['någon annan börjar på ett eget i stället för att ta över', egen],
      ['den som började arbetar vidare där hen slutade, utan att ta nytt material', vidare],
      ['det påbörjade är värt sitt material', varde],
      ['när arbetet är klart blir det ett redskap', klar],
      ['ett utslitet påbörjat redskap blir sitt material igen hos ägaren', upplost],
      ['det påbörjade går i arv', arv],
      ['ett halvfällt träd står kvar och väljs först', heltid && valjs],
      ['den som fäller det färdigt gör bara det som är kvar', kvar],
      [`i en vanlig by tas avbrutet arbete upp igen (${st.fortsatt ?? 0} gånger på 30 dygn, 30 år i spelet; ${st.upplost ?? 0} upplösta)`, (st.fortsatt ?? 0) > 0],
      [`ett pass med redskap delas inte upp: när ett är klart görs ett till om byn vill ha fler (${st.iSammaPass ?? 0} gånger på 30 dygn; steg 2.3.8)`, (st.iSammaPass ?? 0) > 0],
    ];
  },
  lang: true,
};

SCENARIER.bostad = {
  env: STOCKHOLM, // natt och dag följer klockan där Björn spelar
  text: 'En ny by har ingen bostad: man sover på marken nära elden, och synvidden följer personen',
  kor: () => {
    const s = createState(12, START);
    const f = getMap(s.seed).fire;
    let sov = 0, nara = 0;
    kor(s, 24, s => { for (const p of living(s)) if (p.task?.act === 'sova' && p.task.phase === 'do') { sov++; if (Math.hypot(p.x - f.x - 0.5, p.y - f.y - 0.5) < 3.5) nara++; } });
    const p = living(s)[0]; p.x = f.x + 20; p.y = f.y; // ute i skogen
    const glanta = living(s)[1]; glanta.x = f.x + 1.5; glanta.y = f.y + 0.5;
    klockan(s, 2); const natt = sightOf(s, glanta); // mitt i natten
    klockan(s, 12); const dag = sightOf(s, glanta); // mitt på dagen
    return [
      [`de som sover ligger nära elden (${nara} av ${sov})`, sov > 0 && nara === sov],
      ['man ser runt sig där man står, inte vid elden', sees(s, p, f.x + 20, f.y + 3) && !sees(s, p, f.x, f.y)],
      [`man ser kortare i mörker (${natt.toFixed(1)} mot ${dag.toFixed(1)} rutor i gläntan)`, natt < dag],
      [`man ser kortare i skogen än i gläntan (${sightOf(s, p).toFixed(1)} mot ${sightOf(s, glanta).toFixed(1)} rutor)`, sightOf(s, p) < sightOf(s, glanta)],
    ];
  },
};

SCENARIER.bygg = {
  text: 'Byn bygger själv ett timmerhus en bit från elden när någon kan det och sovplatser saknas: träden där huset ska stå fälls först och blir väggar, väggar stänger vägen, golvet under tak blir sovplatser, rummet håller värmen, och slitna väggar lagas eller rasar',
  lang: true,
  env: { BALANS: 'brand.gnista=0' }, // ingen gnista från elden: en brand kan bränna byn (steg 6.4.1), och här prövas bygget
  kor: () => {
    // handbyggt rum: 4×4 väggar med en öppning, 2×2 golv inuti
    const s = createState(5, START), f = getMap(s.seed).fire;
    const x0 = f.x + 5, y0 = f.y - 2, bit = (x: number, y: number, k: Bit['k'], m: string): Bit => ({ id: 9000 + y * 100 + x, x, y, k, m, b: 1, mat: 9, c: 1 });
    for (let x = x0; x < x0 + 4; x++) for (let y = y0; y < y0 + 4; y++) {
      const kant = x === x0 || y === y0 || x === x0 + 3 || y === y0 + 3;
      bitsOf(s).push(bit(x, y, !kant ? 'golv' : x === x0 && y === y0 + 1 ? 'oppning' : 'vagg', !kant ? 'jord' : x === x0 && y === y0 + 1 ? 'oppning' : 'ris'));
    }
    touch(s);
    const rum = roomAt(s, x0 + 1.5, y0 + 1.5), g = groundOf(s);
    gridOf(s);
    const path = findPath(g, x0 - 2.5, y0 + 1.5, x0 + 5.5, y0 + 1.5) ?? [];
    const genomVagg = path.some(i => isWall(s, i % W, Math.floor(i / W)));
    const iso = rum ? insulation(s, rum) : 0;
    // slitage: en vägg utan skick rasar
    const v = bitsOf(s).find(b => b.k === 'vagg' && b.x === x0 + 1 && b.y === y0)!; v.c = 0.001; wearBuild(s, 1, 0);
    const rasat = v.b === 0 && !roomAt(s, x0 + 1.5, y0 + 1.5);
    // en vägg blir klar: den som hämtar material och ska bygga från den rutan får en ny byggplats, och ett redskap som
    // ligger där flyttas (clearTile i bygg.ts; motor-13, samhalle-53, samhalle-60, natur-40)
    const nv = bitsOf(s).find(b => b.k === 'vagg' && b.x === x0 + 2 && b.y === y0)!; nv.b = 0.99; touch(s);
    const [byggs, hamtar] = living(s);
    const golvBit = bitsOf(s).find(b => b.k === 'golv')!;
    hamtar.task = { act: 'bygga', phase: 'go', tx: f.x + 0.5, ty: f.y + 0.5, until: s.now + HOUR, carry: 0, ref: golvBit.id, site: { x: nv.x + 0.5, y: nv.y + 0.5 } };
    const yxa = { id: (s.nextTing ??= 1), k: 'yxa', c: 1, agare: BYN, x: nv.x, y: nv.y }; s.nextTing++; tingOf(s).push(yxa);
    workOn(s, byggs, nv, 3600);
    const st = hamtar.task?.site, siteFri = nv.b >= 1 && !!st && !isWall(s, st.x, st.y), tingFri = yxa.x !== undefined && !isWall(s, yxa.x + 0.5, yxa.y! + 0.5);
    tingOf(s).splice(tingOf(s).indexOf(yxa), 1); hamtar.task = undefined; nv.b = 1;
    // en by där alla vuxna kan göra timmerväggar och har yxor bygger ett hus själv
    const kan = (s: State) => { byggare(s); setAmount(s, 'yxa', 2); };
    const q = createState(8, START); // by 6 hinner inte bli klar och by 7 dör ut sedan kartan blev 120 × 120 (2.10.9); det balanseras i 2.12
    kan(q);
    let inne = 0, sov = 0, iTrad = 0, trad = -1; // räknas när huset är klart, så att det inte beror på hur fort det råkar bli klart
    kor(q, 5 * 24, q => { // fyra vuxna i den nya kolonin: huset tar några dygn
      const bs = bitsOf(q);
      if (bs.length && trad < 0) trad = bs.filter(b => treeOn(q, b)).length;
      iTrad += bs.filter(b => b.k === 'vagg' && b.b > 0 && b.b < 1 && treeOn(q, b)).length; // en vägg som byggs där ett träd står
      if (housesOf(q)[0]?.klar) for (const p of living(q)) if (p.task?.act === 'sova' && p.task.phase === 'do') { sov++; if (roomAt(q, p.x, p.y)) inne++; }
    });
    const fq = getMap(q.seed).fire, hq = housesOf(q)[0];
    const avst = hq ? rektAvstand(fq.x, fq.y, hq.x, hq.y, hq.w, hq.h) : 0;
    // ett planerat långhus räknas i statistiken (planerat_langhus; samhalle-192)
    const langhus = housesOf(q).filter(h => (h.fn === 'sovsal' || h.fn === 'samling') && SIM.sovPersoner((h.w - 2) * (h.h - 2)) >= SIM.HUS.langhus).length, // en tom sovsal kan ha blivit samlingshus (steg 1.6.4)
      langRaknat = q.stat?.planerat_langhus ?? 0;
    // en kall natt utan eld: den som är inne kyls långsammare än den som är ute
    const k = cloneState(q); k.now = ageStart(k, 0) + 3 * HOUR; k.fire.lit = false; k.fire.fuel = 0;
    let varmInne = 0, varmUte = 0, ni = 0, nu = 0;
    const b2 = gridOf(k).rooms.flatMap(r => r.tiles); // golvrutor under tak
    // tre inne i huset och de andra ute, långt från huset och elden (förr stod någon alltid ute, men inte sedan steg 2.12.1)
    const ute = ringUte(k);
    living(k).forEach((p, i) => { p.warm = 0.8; if (i < 3 && b2[i] !== undefined) { p.x = b2[i] % W + 0.5; p.y = Math.floor(b2[i] / W) + 0.5; } else if (ute) { p.x = ute.x + 0.5; p.y = ute.y + 0.5; } });
    const fore = new Map(living(k).map(p => [p.id, { inne: !!roomAt(k, p.x, p.y), ute: heatAt(k, p.x, p.y) < 0.05 }]));
    step(k, 120);
    for (const p of living(k)) { const f = fore.get(p.id); if (!f) continue; if (f.inne) { varmInne += p.warm; ni++; } else if (f.ute) { varmUte += p.warm; nu++; } }
    const h = housesOf(q)[0], folk = living(q).length, b = gridOf(q).rooms.reduce((n, r) => n + sovplatser(q, r), 0);
    const iVagg = living(q).filter(p => isWall(q, p.x, p.y)).length;
    // huset minns var materialet kom ifrån (steg 1.3.3): minst det som ligger i det, och lagningarnas material räknas också
    const lagt = bitsOf(q).filter(b => b.hus === h?.id).reduce((n, b) => n + b.mat, 0), kom = h ? komOf(h) : [];
    const minns = kom.reduce((n, x) => n + x.n, 0), satt = [...new Set(kom.map(x => x.hur))].join(', ');
    // nötning: väggarna slits och lagas
    for (const b of bitsOf(q)) if (b.k === 'vagg') b.c = 0.3;
    addTo(q, 'ved', 100);
    addTo(q, 'rotter', 150); // mat i förrådet, så att de fyra vuxna inte måste skaffa mat först
    kor(q, 24);
    const lagat = (q.stat?.lagat ?? 0) > 0;
    // en lagning kostar hälften av det nya, också för ett trägolv (samhalle-62)
    const lagPris = (m: string) => SIM.needOf({ id: 0, x: 0, y: 0, k: MATERIAL[m].k, m, b: 1, mat: MATERIAL[m].n, c: 0.3 });
    const golvLag = lagPris('tra'), vaggLag = lagPris('timmer');
    // en vägg rasar och byggs om: huset är klart igen, men blir inte färdigt en gång till (krönikan, Sammanhållning; samhalle-55)
    let omKlar = false, kronikaFore = 0, kronikaEfter = 0, gemFore = 0, gemEfter = 0;
    if (h?.klar) {
      const fardigt = () => (q.hist?.kronika ?? []).filter(k => k[2] === 'k_husKlar').length; // huset kan ha bytt namn med funktionen (steg 1.6.4)
      const vg = bitsOf(q).find(b => b.hus === h.id && b.k === 'vagg')!, by = living(q)[0];
      kronikaFore = fardigt(); gemFore = q.stat?.upp_byggdeHus ?? 0;
      vg.c = 1e-6; wearBuild(q, 1, ageIndex(q));
      vg.mat = MATERIAL[vg.m].n;
      for (let n = 0; n < 100 && vg.b < 1; n++) workOn(q, by, vg, 600);
      omKlar = !!h.klar; kronikaEfter = fardigt(); gemEfter = q.stat?.upp_byggdeHus ?? 0;
    }
    // stockar läggs i väggen (toWalls: ett träd fälldes på husplatsen) medan byggaren håller materialet till den: väggen får
    // det den behöver och byggaren behåller resten (buildStep i steg.ts, kodgenomgången 3.10.25)
    const u = createState(8, START); klockan(u); byggare(u); u.byggSok = undefined; planBuild(u);
    const uh = housesOf(u).find(x => !x.klar), ub = uh && bitsOf(u).find(x => x.hus === uh.id && x.k === 'vagg' && MATERIAL[x.m].item === 'ved');
    let iVaggen = 0, iHanden = 0, behov = 0;
    if (uh && ub) {
      behov = MATERIAL[ub.m].n; ub.mat = 0; ub.b = 0.999; touch(u);
      const bp = living(u).find(x => ageOf(x, u.now) >= 18)!;
      bp.x = ub.x + 0.5; bp.y = ub.y + 1.5; bp.hunger = 0;
      bp.task = { act: 'bygga', phase: 'do', tx: bp.x, ty: bp.y, until: u.now + HOUR, carry: 0, ref: ub.id, items: { ved: behov } };
      SIM.toWalls(u, ub.x, ub.y, 1, uh.id);
      step(u, 60);
      iVaggen = ub.mat; iHanden = bp.task?.items?.ved ?? 0;
    }
    return [
      ['ett slutet rum med väggar räknas som under tak', !!rum && rum.tiles.length === 4],
      [`vägen går runt väggarna (${path.length} steg)`, path.length > 0 && !genomVagg],
      [`rummet håller värmen men öppningen läcker (${iso.toFixed(2)})`, iso > 0.2 && iso < 0.55],
      ['en helt sliten vägg rasar och rummet är inte längre under tak', rasat],
      [`när en vägg blir klar flyttas byggplatsen hos den som hämtar material (${siteFri ? 'flyttad' : 'kvar i väggen'}) och ett redskap som ligger där (${tingFri ? 'flyttat' : 'kvar i väggen'})`, siteFri && tingFri],
      [`byn bygger ${h?.namn ?? 'inget hus'} (${h ? `${h.w}×${h.h}` : '-'}, ${b} sovplatser för ${folk})`, !!h?.klar && b > 0],
      [`folk sover inne när huset är klart (${inne} av ${sov})`, sov > 0 && inne > sov * 0.5],
      [`en kall natt utan eld är de som är inne varmare (${(varmInne / (ni || 1)).toFixed(2)} mot ${(varmUte / (nu || 1)).toFixed(2)})`, ni > 0 && nu > 0 && varmInne / ni > varmUte / nu],
      [`ingen står i en vägg (${iVagg})`, iVagg === 0],
      [`träden där huset ska stå fälls innan väggarna byggs där (${trad} träd på platsen, ${iTrad} väggar byggda på ett träd)`, trad >= 0 && iTrad === 0 && !!h && bitsOf(q).every(b => b.hus !== h.id || !treeOn(q, b))],
      [`huset står en bit från elden (${avst.toFixed(1)} rutor; helst BYGG.husAvst, men närheten till byns mitt väger också)`, avst >= 2],
      ['slitna väggar lagas', lagat],
      [`ett långhus räknas när det planeras (${langhus} långhus, ${langRaknat} räknade)`, langRaknat === langhus],
      [`en lagning kostar hälften av det nya, i hela saker och minst en (trägolv ${golvLag} av ${MATERIAL.tra.n}, timmervägg ${vaggLag} av ${MATERIAL.timmer.n})`, golvLag === Math.max(1, Math.floor(MATERIAL.tra.n / 2)) && vaggLag === Math.max(1, Math.floor(MATERIAL.timmer.n / 2))],
      [`en rasad vägg som byggts om gör huset klart igen men inte färdigt en gång till (krönikan ${kronikaFore} → ${kronikaEfter}, de som byggde minns det ${gemFore} → ${gemEfter} gånger)`, omKlar && kronikaFore >= 1 && kronikaEfter === kronikaFore && gemEfter === gemFore],
      [`stockar som läggs i väggen medan någon bär material dit försvinner inte (väggen ${iVaggen} av ${behov}, ${iHanden} kvar i händerna)`, behov > 0 && iVaggen === behov && iHanden <= 1], // (den som blev över kan redan ligga i nästa bit, steg 10.2.21 C)
      [`huset minns var materialet kom ifrån (${Math.round(minns)} av ${Math.round(lagt)}: ${satt})`, lagt > 0 && minns >= lagt - 0.01],
    ];
  },
};

SCENARIER.lager = {
  lang: true,
  text: 'Saker ligger i stackar på en lagerplats som byn gör större och mindre, och var och en bär efter sin styrka',
  kor: () => {
    const s = createState(3, START);
    const start = zoneOf(s).w * zoneOf(s).h;
    setFood(s, 230); setAmount(s, 'ved', 90); setAmount(s, 'grenar', 70); setAmount(s, 'flinta', 3); // mycket på en gång
    kor(s, 18);
    // när lagerplatsen krymper hamnar en stack ibland utanför en stund, och bärs in igen inom några timmar (också veden från
    // ett träd som fällts en bit bort, som i den glesare skogen sedan steg 5.1.4.1 kan ligga kvar vid stubben en stund)
    for (let i = 0; i < 72 && pilesOf(s).some(p => p.out); i++) kor(s, 1); // längre när en lagerplats flyttats för ett hus (steg 8.1.15)
    const z = zoneOf(s), ps = pilesOf(s), stor = z.w * z.h;
    const summaOk = Object.keys(STACK).filter(k => !SIM.isTool(k)).every(k => Math.abs(ps.filter(p => p.k === k).reduce((a, p) => a + p.n, 0) - amountOf(s, k)) <= 1 + 1e-6); // en sak kan vara på väg till den nya lagerplatsen // ett redskap kan vara i bruk
    // bära: kör en stund med gående invånare och se hur mycket de bär hem
    const b = createState(8, START);
    klockan(b, 7); setFood(b, 2); // morgon, och byn behöver mat
    tandEld(b, 4, false); // elden brinner, annars avbryts allt för att tända den
    let hem = 0, maxKvot = 0, fullt = 0;
    const forut = new WeakMap<SIM.Task, number>(); // den största förmågan under turen: blir man trött med bördan i händerna går man hem med den
    for (let i = 0; i < 8 * 3600 / 2; i++) {
      step(b, 2);
      // aldrig mer än händerna orkar, utom en enda sak (steg 6.1.8)
      for (const p of living(b)) { const nu = SIM.bordPlats(b, p), fore = p.task ? Math.max(nu, forut.get(p.task) ?? 0) : nu; if (p.task) forut.set(p.task, fore); if (p.task?.phase === 'back' && p.task.act !== 'elda') {
        const bs = SIM.bordSlag(p.task), kv = Object.values(bs).reduce((a, x) => a + x, 0) / Math.max(nu, fore, ...Object.keys(bs).map(k => SIM.viktOf(k) * (k === 'vilt' ? KANIN : 1))); // korgen rymmer mer än händerna; en hare (2 fällt vilt) bärs hel som en sak
        hem++; maxKvot = Math.max(maxKvot, kv); if (kv >= 0.95) fullt++;
      } }
    }
    // den som har fullt går hem med en gång, även om uppgiften inte är klar
    const v = living(b).find(p => ageOf(p, b.now) >= 18)!;
    const tk0: SIM.Task = v.task = { act: 'samla', phase: 'do', tx: v.x, ty: v.y, until: b.now + 3 * HOUR, carry: Math.floor(capacity(b, v) / SIM.viktOf('bar')), why: 'test', dark: false };
    step(b, 2); step(b, 2);
    const gickHem = tk0.phase === 'back' || load(tk0, b) === 0; // på väg hem, eller redan framme vid lagret och har lämnat bördan
    const stark = living(b).slice().sort((x, y) => stat(y, 'styrka', b.now) - stat(x, 'styrka', b.now));
    // en död med en uppgift kvar låser varken en stack som ska bäras in eller elden (bara de levande räknas)
    const dd = createState(3, START), [dod, lev] = living(dd), f = getMap(3).fire;
    let mark: { x: number; y: number } | undefined;
    for (let r = 4; r < 12 && !mark; r++) for (let dx = -r; dx <= r && !mark; dx++) { const x = f.x + dx, y = f.y + r; if (getMap(3).tiles[tileOf(x, y)] !== T.Vatten && !isStored(dd, x, y)) mark = { x, y }; }
    dropLoad(dd, { act: 'samla', phase: 'do', tx: 0, ty: 0, until: dd.now, carry: 0, items: { grenar: 3 } }, mark!.x + 0.5, mark!.y + 0.5);
    const utan = haulJob(dd);
    dod.died = dd.now; dod.task = { act: 'bara', phase: 'go', tx: utan?.x ?? 0, ty: utan?.y ?? 0, until: dd.now + HOUR, carry: 0 };
    const stackFri = !!utan && isDeepStrictEqual(haulJob(dd), utan);
    dod.task = { act: 'elda', phase: 'go', tx: f.x, ty: f.y, until: dd.now + HOUR, carry: 0 }; lev.task = undefined;
    fetchFuel(dd, lev, 'test');
    const eldFri = (lev.task as Task | undefined)?.act === 'elda';
    // när lagret och ringen runt det är fulla av annat läggs det nya längre ut, aldrig på en annan sak (natur-33)
    const fu = createState(3, START), fz = zoneOf(fu), br = LAGER.bredvid;
    fu.ting = []; fu.stackar = [];
    for (let y = fz.y - br; y < fz.y + fz.h + br; y++) for (let x = fz.x - br; x < fz.x + fz.w + br; x++) if (usable(fu, x, y)) fu.stackar.push({ k: 'sten', n: 1, c: 1, x, y });
    const fs = dropSpot(fu, 'bar'), fx = Math.floor(fs.x), fy = Math.floor(fs.y), paAnnan = fu.stackar.some(a => a.x === fx && a.y === fy);
    // att bära in är en förbättring: inte när byn svälter eller kylan är en fara (elden släckt och många fryser)
    const barare = (mat: number, kall: boolean) => {
      const t = createState(3, START);
      t.now = new Date(t.now).setHours(10, 0, 0, 0); setFood(t, mat); Object.assign(t.fire, { lit: !kall, fuel: kall ? 0 : 4, ring: true, emberUntil: undefined });
      dropLoad(t, { act: 'samla', phase: 'do', tx: 0, ty: 0, until: t.now, carry: 0, items: { grenar: 3 } }, mark!.x + 0.5, mark!.y + 0.5);
      const [p, ...andra] = living(t).filter(q => ageOf(q, t.now) >= ALDER.vuxen);
      for (const q of andra) q.warm = kall ? KROPP.kallt - 0.1 : 1;
      let n = 0;
      for (let i = 0; i < 200; i++) { Object.assign(p, { toa: 1, torst: 1, warm: 1, rest: 1, health: 1, hunger: 1, social: 1, task: undefined }); chooseTask(t, p); if (p.task?.act === 'bara') n++; }
      return n;
    };
    const barMat = barare(200, false), barSvalt = barare(0, false), barKall = barare(200, true);
    // när lagret växer över marken där någon lagt flera saker på en ruta (grenar och ved av ett fällt träd) ligger det
    // sedan bara en sak på varje ruta i förrådet, och inget försvinner (riktad-körningen i steg 3.10.25, by 8920)
    const vx = createState(3, START), vz = zoneOf(vx), ut = br + 1, tot = () => (vx.stackar ?? []).reduce((a, q) => a + q.n, 0);
    vx.ting = []; vx.stackar = [{ k: 'sten', n: 1, c: 1, x: vz.x - 1, y: vz.y }]; // bredvid lagerplatsen: lagret är fullt och växer
    for (let y = vz.y; y < vz.y + vz.h; y++) for (let x = vz.x; x < vz.x + vz.w; x++) vx.stackar.push({ k: 'grenar', n: 1, c: 1, x, y });
    for (let y = vz.y - ut; y < vz.y + vz.h + ut; y++) for (let x = vz.x - ut; x < vz.x + vz.w + ut; x++) if (!isStored(vx, x, y) && usable(vx, x, y)) vx.stackar.push({ k: 'grenar', n: 1, c: 1, x, y }, { k: 'ved', n: 1, c: 1, x, y });
    const vxFore = tot(), vxYta = vz.w * vz.h;
    (SIM.planLager(vx), SIM.tidyStore(vx));
    const vxRutor = new Map<number, number>();
    for (const q of vx.stackar) if (isStored(vx, q.x, q.y)) vxRutor.set(q.y * SIM.W + q.x, (vxRutor.get(q.y * SIM.W + q.x) ?? 0) + 1);
    const vxTva = [...vxRutor.values()].filter(n => n > 1).length, vxStor = zoneOf(vx).w * zoneOf(vx).h;
    // en stack där bara den gömda giftsvampen finns kvar visas inte som "svamp 0 st" (pilesOf)
    const gs = createState(3, START), gz = zoneOf(gs);
    (gs.stackar ??= []).push({ k: 'svamp', n: 0, c: 1, x: gz.x, y: gz.y, dold: 0.5 });
    const doldSyns = pilesOf(gs).some(p => p.k === 'svamp' && p.n <= 1e-6);
    return [
      ['en stack med bara gömd giftsvamp visas inte som "svamp 0 st"', !doldSyns],
      [`när lagret växer över en ruta med flera saker ligger det sedan en sak på varje ruta, och inget försvinner (${vxYta} → ${vxStor} rutor, ${vxTva} rutor med två saker, ${vxFore} → ${tot()} saker)`, vxStor > vxYta && vxTva === 0 && tot() === vxFore],
      [`i ett fullt lager läggs det nya på en egen ruta (${fx},${fy}${paAnnan ? ', på sten' : ''})`, !paAnnan && usable(fu, fx, fy)],
      // svälten och kylan väger i poängen (steg 10.2.6): det som inte är mat bärs in mer sällan när byn svälter eller fryser
      [`färre bär in när byn svälter eller fryser (${barSvalt} när maten är slut, ${barKall} i kylan, ${barMat} av 200 annars)`, barMat > 0 && barSvalt < barMat / 2 && barKall < barMat / 2],
      ['en död med en uppgift kvar låser inte en stack som ska bäras in (haulJob)', stackFri],
      ['... och inte elden (fetchFuel)', eldFri],
      [`lagerplatsen växer när den blir full (${start} → ${stor} rutor, ${zonesOf(s).length} lagerplatser, ${ps.filter(p => p.out).length} av ${ps.length} stackar utanför)`, stor > start && ps.filter(p => p.out).length <= ps.length / 2],
      ['ingen stack är större än sin storlek, och stackarna innehåller allt i förrådet', ps.every(p => p.n <= p.max + 1e-9) && summaOk],
      [`folk bär hem saker, aldrig mer än de orkar (${hem} steg på väg hem, ${fullt} med full börda, högst ${(maxKvot * 100).toFixed(0)} % av förmågan)`, hem > 50 && maxKvot <= 1.15],
      ['den som bär så mycket hen orkar går hem med bördan', gickHem],
      ['den starke orkar bära mer än den svage', capacity(b, stark[0]) > capacity(b, stark[stark.length - 1])],
    ];
  },
};

SCENARIER.lagerplatser = {
  text: 'När lagret inte räcker gör byn en ny lagerplats och sorterar: maten närmast elden, material för sig',
  kor: () => {
    // den första lagerplatsen ligger aldrig i vatten eller på sten (natur-30: 990 och 2612 hade vatten, 54 sten)
    const startFel = [54, 990, 2612].filter(seed => { const k = createState(seed, START), z = zonesOf(k)[0]; for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) if (!usable(k, x, y)) return true; return false; });
    const s = createState(9, START);
    setFood(s, 600); setAmount(s, 'ved', 200); setAmount(s, 'grenar', 400); setAmount(s, 'flinta', 1); s.fire.ring = true; // byn kan tända sin eld och har tid att sortera
    kor(s, 96); // sorteringen tar några dygn: en tur bär det som ryms i händerna (steg 6.1.8), och en lagerplats i vägen för ett hus flyttas (steg 8.1.15)
    const zs = zonesOf(s), ps = pilesOf(s);
    const fel = ps.filter(p => p.zone >= 0 && !allows(zs[p.zone], p.k)).length;
    const summaOk = Object.keys(STACK).filter(k => !SIM.isTool(k)).every(k => Math.abs(ps.filter(p => p.k === k && p.stored).reduce((a, p) => a + p.n, 0) - amountOf(s, k)) < 1e-3); // ett redskap kan vara i bruk eller hänga vid en station
    // ett tömt lager krymper först när det stått halvtomt i sex timmar (en kvarts år i spelet, steg 2.12.4)
    const tom = cloneState(s); for (const k of Object.keys(STACK)) SIM.setAmount(tom, k, 0);
    for (const z of zonesOf(tom)) z.tom = undefined; // klockan börjar när lagret töms, inte när det blev halvtomt tidigare
    const zi = zonesOf(tom).findIndex(z => z.hus === undefined && z.w * z.h > SIM.LAGER.krympMin), yta = () => { const z = zonesOf(tom)[zi]; return z.w * z.h; };
    const yta0 = zi >= 0 ? yta() : 0, ytor: number[] = [];
    for (let h = 0; h < 8 && zi >= 0; h++) { (SIM.planLager(tom), SIM.tidyStore(tom)); ytor.push(yta()); tom.now += HOUR; }
    return [
      [`ett tomt lager krymper inte de första sex timmarna, sedan krymper det (${yta0} rutor, sedan ${ytor.join(', ')} timme för timme)`, zi >= 0 && ytor.slice(0, SIM.LAGER.krympTim).every(n => n === yta0) && ytor[ytor.length - 1] < yta0],
      [`den första lagerplatsen går att använda (${startFel.length ? 'inte i by ' + startFel.join(', ') : 'i alla tre byarna'})`, startFel.length === 0],
      [`en ny lagerplats görs när den första inte kan växa mer (${zs.length} lagerplatser)`, zs.length >= 2],
      [`maten får den första och material den nya (${zs.map(z => z.namn).join(', ')})`, zs[0].slag === 'mat' && zs[1]?.slag === 'material'],
      [`sakerna sorteras till rätt lagerplats (${fel} stackar ligger fel efter 96 timmar)`, fel <= 4],
      ['stackarna innehåller allt i förrådet', summaOk && ps.every(p => p.n <= p.max + 1e-9)],
    ];
  },
};

SCENARIER.verkstad = {
  text: 'Rummets funktion (steg 2.2.17): ett rum får sin funktion av det som står i det. När byn vill bygga en slöjdbänk men sovsalarna är fulla planerar den en verkstad åt den, och en sovsal som ingen sover i men där en station står blir en verkstad i stället för att rivas',
  env: { BALANS: 'hus.sovFast=0' }, // utan rutor för rymd blir sovsalen precis full: alla har en sovplats och inget golv blir över (steg 9.2.36)
  kor: () => {
    const { HUS, stationDef, inneUtanPlats, rumsFunktioner, sovKvar, stationerOf, stationRum, stationSite, isKlar } = SIM;
    // en by med en sovsal som är så full att slöjdbänken inte får plats där, där alla kan bygga en slöjdbänk
    const s = createState(1, START); klockan(s); tandEld(s);
    byggare(s); planBuild(s); const A = byggKlart(s)!;
    const rumA = () => gridOf(s).rooms.find(r => r.hus === A.id && r.tiles.length)!;
    // fler flyttar in så länge det finns en sovplats till (HUS.sovPer golvrutor per person, steg 9.2.36); det som blir kvar är
    // mindre än slöjdbänken (2 × 2 rutor)
    for (let i = 0; sovKvar(s, rumA()) >= HUS.sovPer && i < 20; i++) nyInvanare(s, i % 2 ? 'm' : 'k', 30);
    // byn kan ha fler än sovsalen rymmer (en sovande behöver HUS.sovPer rutor och huset HUS.sovFast till): de som blir över flyttar
    while (homeless(s) > 0 && s.people.length > 2) s.people.pop();
    for (const r of s.people) r.tek = { ...r.tek, flatarbank: 1, timmervagg: 1, yxa: 1 };
    setFood(s, 400); setAmount(s, 'ved', 80); setAmount(s, 'grenar', 20); setAmount(s, 'virke', SIM.RT.flatarbankVirke); // virket finns: byn har ingen yxa att klyva med (steg 4.5.5.2)
    const vill = inneUtanPlats(s), a = BYGGNADER.verkstad.akut(s), hemlosa = homeless(s);
    s.byggSok = undefined; planBuild(s);
    const B = byggKlart(s);
    let h = 0;
    const banken = () => stationerOf(s).find(t => t.k === 'flatarbank' && isKlar(t));
    while (!banken() && h < 96) { kor(s, 1); h++; }
    const t = banken(), iB = !!t && !!B && stationRum(s, t)?.hus === B.id;
    const fnB = B ? rumsFunktioner(s, B).map(f => f.namn) : [], fnA = rumsFunktioner(s, A).map(f => f.namn);
    const igen = BYGGNADER.verkstad.akut(s).v;
    // en sovsal där ingen sover men där en station står blir en verkstad, och stationen står kvar
    const q = cloneState(s), Bq = housesOf(q).find(r => r.id === B?.id)!;
    Bq.fn = 'sovsal'; Bq.tom = q.now - 2 * DAY; q.ruttet = 20; // byn skulle annars vilja ha ett förrådshus
    stepByggnader(q);
    const kvar = !!t && !!stationerOf(q).find(r => r.id === t.id);
    // en slöjdbänk som står ute (byggd före v59) bärs in när ett hus har plats; slaktbänken står alltid ute (Björn, efter v64)
    const u = cloneState(s), ut = stationerOf(u).find(r => r.id === t?.id), ute = stationSite(u, 'slaktbank');
    if (ut && ute) { ut.x = ute.x; ut.y = ute.y; delete ut.inne; delete ut.rot; u.byggV = (u.byggV ?? 0) + 1; }
    for (const r of living(u)) r.task = undefined;
    kor(u, 2);
    const inburen = !!ut?.inne && stationRum(u, ut)?.hus === B?.id;
    return [
      [`byn vill bygga en slöjdbänk men den får inte plats i sovsalen (${living(s).length} bor där, ${hemlosa} utan sovplats)`, vill === 'flatarbank' && hemlosa === 0],
      [`byn vill ha en verkstad (hur akut ${a.v}, ${a.plats} golvrutor)`, a.v === HUS.verkstadAkut && a.plats === 2 * 2 + HUS.verkstadExtra],
      [`byn planerar ${B?.namn.toLowerCase() ?? 'inget hus'}`, B?.fn === 'verkstad' && B.namn === 'Verkstaden'],
      [`slöjdbänken byggs i verkstaden på ${h} timmar`, iB],
      [`verkstaden är en verkstad efter det som står där (${fnB.join(', ')}), sovsalen ett sovrum (${fnA.join(', ')})`, fnB.includes('Verkstad') && !fnB.includes('Sovrum') && fnA.includes('Sovrum') && !fnA.includes('Verkstad')],
      ['ingen ny verkstad när slöjdbänken står', igen === 0],
      [`en tom sovsal där en station står blir en verkstad och stationen står kvar (${Bq.namn})`, Bq.fn === 'verkstad' && kvar],
      ['slaktbänken står ute och slöjdbänken inne (registret)', !stationDef('slaktbank')?.inne && !!stationDef('flatarbank')?.inne && !!ute && !('inne' in ute)],
      [`en slöjdbänk som står ute bärs in i ${B?.namn.toLowerCase() ?? 'inget hus'} inom två timmar`, inburen],
    ];
  },
};

SCENARIER.lekibyn = {
  lang: true,
  text: 'Byn har ingen lekplats: barnen leker var som helst inne i byn (platsIByn i omrade.ts), aldrig i vattnet eller i en vägg',
  kor: () => {
    const s = createState(3, START);
    klockan(s); tandEld(s);
    let leker = 0, iByn = 0, fel = 0;
    const platser = new Set<string>();
    for (let h = 0; h < 72; h++) {
      kor(s, 1);
      for (const q of living(s)) if (q.task?.act === 'leka' && q.task.phase === 'do') {
        leker++;
        if (SIM.utanforByn(s, q.task.tx, q.task.ty) <= 2) iByn++; // brottningen på lek sker på kartan (steg 10.1.7) och kan bära barnen ett par rutor utanför
        if (SIM.blocked(s, q.task.tx, q.task.ty)) fel++;
        platser.add(`${Math.floor(q.task.tx)},${Math.floor(q.task.ty)}`);
      }
    }
    return [
      [`barnen leker inne i byn (${iByn} av ${leker} timmar)`, leker > 0 && iByn === leker],
      [`aldrig i vattnet eller i en vägg (${fel})`, fel === 0],
      [`på många olika ställen (${platser.size} rutor)`, platser.size >= 5],
      ...lekFart(s),
    ];
  },
};

SCENARIER.ibyn = {
  text: 'Steg 2.10.6: det som görs utan bänk (redskapen när byn saknar slöjdbänk, repet och annat handarbete) görs inne i byn, vid lagret eller under tak, och inte vid elden. När det är kallt sätter man sig vid elden som förut, för värmens skull',
  kor: () => {
    const plats = (tidsalder: number) => {
      const s = createState(3, START);
      s.kal = SIM.nyKalender(s.now, tidsalder); klockan(s, 10); tandEld(s);
      const z = zonesOf(s)[0], f = getMap(s.seed).fire;
      s.lagren = [{ x: z.x + 14, y: z.y, w: 2, h: 2, namn: 'Prov', prio: 0 }]; // byns inre långt från elden
      const mid = SIM.bynsMitt(s), p = living(s)[0];
      p.warm = 1; let iByn = 0, vidElden = 0, n = 0;
      for (const act of ['kniv', 'hantverk', 'tvinna', 'balte'] as Act[]) for (let k = 0; k < 15; k++) {
        const at = spotFor(s, act, p); n++;
        if (SIM.iByn(s, at.x, at.y)) iByn++; // inne i byns område (steg 6.2.4)
        if (Math.hypot(at.x - f.x - 0.5, at.y - f.y - 0.5) <= 3) vidElden++;
      }
      return { iByn, vidElden, n, kallt: SIM.coldOf(SIM.temperature(s)) > 0, avst: Math.hypot(mid.x - f.x, mid.y - f.y) };
    };
    const varmt = plats(SIM.SOMMAR), kallt = plats(SIM.ISTID);
    return [
      [`på sommaren görs handarbetet utan bänk inne i byns område, sällan vid elden (${varmt.iByn} av ${varmt.n} gånger i byn, ${varmt.vidElden} vid elden)`, !varmt.kallt && varmt.iByn === varmt.n && varmt.vidElden <= varmt.n * 0.3],
      [`när det är kallt sitter man vid elden som förut (${kallt.vidElden} av ${kallt.n} gånger)`, kallt.kallt && kallt.vidElden === kallt.n],
    ];
  },
};

SCENARIER.heltal = {
  text: 'Hela saker (steg 2.10.7): förrådet har bara hela saker. Arbetet räknas hos den som arbetar tills det blivit en hel sak, och den som tar en del av en sak tar en hel; resten blir påbörjad hos ägaren och tas först nästa gång. Inga resurser i decimaler (steg 3.6.13): inget recept, bygge, lagning eller utfall är mindre än en hel sak',
  kor: () => {
    const hel = (v: number) => Math.abs(v - Math.round(v)) < 1e-6;
    // registren (steg 3.6.13): allt som går åt, ges eller fås är hela saker, minst en
    const fel: string[] = [], kolla = (vad: string, n: number) => { if (!hel(n) || n < 0) fel.push(`${vad} ${n}`); };
    for (const k of SIM.SAK_LIST) for (const [m, n] of Object.entries(SIM.SAKER[k]!.skaffa?.av ?? {})) kolla(`${k} av ${m}`, n);
    for (const [k, d] of Object.entries(SIM.STATIONER)) for (const [m, n] of Object.entries(d.av)) kolla(`${k} av ${m}`, n);
    for (const [k, d] of Object.entries(SIM.TILLBEHOR)) for (const [m, n] of Object.entries(d.av)) kolla(`${k} av ${m}`, n);
    for (const [k, d] of Object.entries(SIM.DORRAR)) for (const [m, n] of Object.entries(d.av ?? {})) kolla(`${k} av ${m}`, n);
    for (const [k, M] of Object.entries(MATERIAL)) { kolla(`${k} n`, M.n); kolla(`${k} lagning`, SIM.lagKostnad(M)); if (M.n > 0 && SIM.lagKostnad(M) < 1) fel.push(`${k} lagning 0`); }
    for (const [k, a] of Object.entries(SIM.DJUR)) {
      kolla(`${k} mat`, a.mat);
      for (const [m, n] of Object.entries(a.slakt)) { kolla(`${k} ger ${m}`, n); if (m === 'kott') for (let j = 0; j <= SIM.REDSKAP.kottFull; j++) kolla(`${k} ger kött vid jakt ${j}`, SIM.kottAv({ skill: { jakt: j } } as SIM.Person, n)); }
    }
    // fron är snittet: varje ruta ger hela frön, det närmaste hela talet under eller över (froTillbaka, steg 3.10.23.3)
    for (const [k, g] of Object.entries(SIM.GRODOR)) { kolla(`${k} perRuta`, g.perRuta); kolla(`${k} fron`, Math.floor(g.fron)); kolla(`${k} fron`, Math.ceil(g.fron)); }
    // en vanlig by i tre dygn: alla stackar, det gömda i dem och ägarnas delar är hela, och det påbörjade är under en hel sak
    const s = createState(1, START);
    kor(s, 72);
    const stackar = (s.stackar ?? []).every(a => hel(a.n) && hel(a.dold ?? 0) && Object.values(a.ag ?? {}).every(hel));
    const delar = Object.values(s.delar ?? {}).flatMap(d => Object.values(d));
    const pab = delar.length > 0 && delar.every(v => v > 0 && v < 1);
    // 0,6 bär är inget bär än, men två gånger 0,6 blir ett bär och 0,2 mot nästa
    const t = createState(6, START); SIM.setStock(t, { bar: 0 });
    const a = living(t).find(q => ageOf(q, t.now) >= 18)!;
    t.delning = { andel: 0 }; // allt man skaffar är ens eget
    SIM.gain(t, a, 'bar', 0.6); const fore = amountOf(t, 'bar'), arb = a.delar?.bar ?? 0;
    SIM.gain(t, a, 'bar', 0.6); const efter = amountOf(t, 'bar'), arb2 = a.delar?.bar ?? 0;
    const arbetet = fore === 0 && Math.abs(arb - 0.6) < 1e-6 && efter === 1 && Math.abs(arb2 - 0.2) < 1e-6 && SIM.ownsAmount(t, a, 'bar') === 1;
    // en halv portion: ett helt bär tas ur förrådet och hälften blir påbörjad hos ägaren; nästa halva tas av det påbörjade
    SIM.gain(t, a, 'bar', 1.8); const n0 = amountOf(t, 'bar'); // 0,2 + 1,8 = två bär till, inget mot nästa
    SIM.use(t, a, 'bar', 0.5); const n1 = amountOf(t, 'bar'), p1 = t.delar?.[a.id]?.bar ?? 0;
    SIM.use(t, a, 'bar', 0.5); const n2 = amountOf(t, 'bar'), p2 = t.delar?.[a.id]?.bar ?? 0;
    const halv = n0 === 3 && !a.delar && n1 === 2 && Math.abs(p1 - 0.5) < 1e-6 && n2 === 2 && p2 === 0;
    return [
      [`efter tre dygn är alla stackar och ägarnas delar hela (${(s.stackar ?? []).length} stackar)`, stackar],
      [`det påbörjade är under en hel sak (${delar.length} påbörjade, ${delar.map(v => v.toFixed(2)).join(' ') || 'inga'})`, pab],
      [`arbetet räknas tills det blivit en hel sak (0,6 bär: ${fore} i förrådet, ${arb.toFixed(1)} arbetat; igen: ${efter} och ${arb2.toFixed(1)})`, arbetet],
      [`en halv portion tar ett helt bär och resten blir påbörjad (${n0} → ${n1} bär, ${p1.toFixed(1)} påbörjat), och nästa halva tas av det påbörjade (${n2} bär, ${p2.toFixed(1)} påbörjat)`, halv],
      [`en kanin är ${SIM.KANIN} hela vilt`, hel(SIM.KANIN) && SIM.KANIN >= 1],
      [`inga recept, byggen, lagningar eller utfall i decimaler (${fel.join(', ') || 'alla hela'})`, !fel.length],
    ];
  },
};

// ett hus med yttermåtten w×h och hörnet (x, y), som planBuild gör det: timmerväggar, en öppning mitt på södra sidan och trägolv.
// klar = färdigbyggt
function husPa(s: SIM.State, x: number, y: number, w: number, h: number, klar: boolean) {
  const hus: SIM.Hus = { id: (s.nextBit ??= 1), namn: 'Hydda', x, y, w, h, fn: 'sovsal' };
  s.nextBit++;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const edge = xx === x || yy === y || xx === x + w - 1 || yy === y + h - 1, open = xx === x + Math.floor(w / 2) && yy === y + h - 1;
    const m = open ? 'oppning' : edge ? 'timmer' : 'tra';
    SIM.bitsOf(s).push({ id: s.nextBit++, x: xx, y: yy, k: SIM.MATERIAL[m].k, m, b: open || klar ? 1 : 0, mat: klar ? SIM.MATERIAL[m].n : 0, c: 1, hus: hus.id });
  }
  if (klar) hus.klar = s.now;
  SIM.housesOf(s).push(hus); SIM.touch(s);
  return hus;
}
// går det att bygga på alla rutor i rektangeln (och ett varv runt den)?
const friRekt = (s: SIM.State, x: number, y: number, w: number, h: number) => {
  for (let yy = y - 1; yy <= y + h; yy++) for (let xx = x - 1; xx <= x + w; xx++) if (!SIM.ledig(s, xx, yy)) return false;
  return true;
};

SCENARIER.eldflytt = {
  text: 'Elden flyttas när byn vuxit ifrån den (husens och lagrets mitt mer än ELDFLYTT.vuxit rutor bort) och när ett hus behöver platsen där elden står: den släcks, stenarna i ringen bärs dit, grillen följer med och elden tänds där igen med flinta',
  kor: () => {
    // byn har vuxit: tre färdiga hus 12–20 rutor från elden, alla åt samma håll
    const s = createState(6, START);
    klockan(s, 8); tandEld(s); byggare(s);
    SIM.setAmount(s, 'flinta', 2); SIM.setAmount(s, 'torrgras', 10); SIM.setAmount(s, 'grenar', 10); SIM.setAmount(s, 'ved', 30);
    const grill = medBank(s, 'grill');
    const e0 = { ...SIM.eldPlats(s) }, hus: SIM.Hus[] = [];
    sok: for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      hus.length = 0;
      for (let d = 12; d <= 30 && hus.length < 3; d++) {
        const x = e0.x + dx * d + (dy ? (hus.length - 1) * 6 : 0), y = e0.y + dy * d + (dx ? (hus.length - 1) * 6 : 0);
        if (friRekt(s, x, y, 4, 4)) { hus.push(husPa(s, x, y, 4, 4, true)); d += 5; }
      }
      if (hus.length === 3) break sok;
      for (const h of hus) { s.hus = SIM.housesOf(s).filter(q => q !== h); s.byggen = SIM.bitsOf(s).filter(b => b.hus !== h.id); }
      SIM.touch(s);
    }
    const mid = SIM.bynsMitt(s), langt = Math.hypot(mid.x - e0.x, mid.y - e0.y);
    let vald: SIM.Person | undefined, flytt = s.fire.flytt;
    SIM.stepEldFlytt(s);
    flytt = s.fire.flytt; vald = living(s).find(p => p.task?.act === 'flyttaeld');
    // elden kan tändas igen redan medan den flyttas, med flinta eller ur glöden som bars med (steg 10.2.8)
    let tand = s.fire.lightings; const flyttad0 = (t: State) => { const e = SIM.eldPlats(t); return e.x !== e0.x || e.y !== e0.y; };
    kor(s, 8, t => { if (t.fire.lit && (t.fire.lightings > tand || flyttad0(t))) tand = -1; });
    const e1 = SIM.eldPlats(s), narmare = Math.hypot(mid.x - e1.x, mid.y - e1.y);
    const g1 = SIM.stationerOf(s).find(t => t.id === grill.id);
    if (tand !== -1) kor(s, 24, t => { if (t.fire.lit && (t.fire.lightings > tand || flyttad0(t))) tand = -1; });
    // ett hus planeras där elden står: inget byggs inpå elden förrän den flyttats
    const t = createState(7, START);
    klockan(t, 8); tandEld(t); byggare(t);
    SIM.setAmount(t, 'flinta', 2); SIM.setAmount(t, 'torrgras', 10); SIM.setAmount(t, 'grenar', 10); SIM.setAmount(t, 'ved', 30); SIM.setAmount(t, 'yxa', 2);
    const f0 = { ...SIM.eldPlats(t) }, ph = husPa(t, f0.x - 2, f0.y - 2, 5, 5, false), ny = SIM.nyEldplats(t, f0.x, f0.y, ph);
    const isar = !!ny && !SIM.vidElden(t, ny.x, ny.y) && !(ny.x + 1 >= ph.x && ny.x - 1 < ph.x + ph.w && ny.y + 1 >= ph.y && ny.y - 1 < ph.y + ph.h);
    if (ny) t.fire.flytt = { ...ny, varfor: 'plats' };
    const fore = living(t).map(p => SIM.buildJob(t, p)).filter(j => j && SIM.vidElden(t, j.bit.x, j.bit.y)).length;
    delete t.fire.flytt; SIM.stepEldFlytt(t); // den nya platsen har tagits: byn väljer en ny, annars blir huset aldrig klart
    const igen = (t.fire as SIM.State['fire']).flytt?.varfor === 'plats'; // (typen: TypeScript tror att delete gäller kvar)
    kor(t, 10);
    const f1 = SIM.eldPlats(t), flyttad = f1.x !== f0.x || f1.y !== f0.y;
    const bygg = flyttad && (!!ph.klar || byggKlart(t) === ph); // med väggarna på 20 minuter (steg 2.12.8) kan huset bli klart under de tio timmarna
    return [
      [`tre färdiga hus gör att byns mitt ligger ${langt.toFixed(1)} rutor från elden (mer än ${SIM.ELDFLYTT.vuxit})`, hus.length === 3 && langt > SIM.ELDFLYTT.vuxit],
      [`byn bestämmer sig för att flytta elden mot mitten (${flytt ? `${flytt.x}, ${flytt.y}, ${flytt.varfor}` : 'ingen flytt'}) och ${vald?.name ?? 'ingen'} får göra det`, flytt?.varfor === 'vuxit' && !!vald],
      [`elden står sedan ${narmare.toFixed(1)} rutor från mitten (förut ${langt.toFixed(1)}), och flytten räknas (${s.stat?.eldflytt ?? 0})`, narmare < langt && narmare <= SIM.ELDFLYTT.sok && s.stat?.eldflytt === 1 && !s.fire.flytt],
      ['ringen av stenar följer med, och grillen står med elden i mitten', !!s.fire.ring && g1?.x === e1.x - 1 && g1?.y === e1.y],
      ['elden tänds igen på den nya platsen inom ett dygn', tand === -1],
      [`ett hus som planeras där elden står får en ny plats för elden (${ny ? `${ny.x}, ${ny.y}` : 'ingen'}) en bit från huset`, isar],
      ['har den nya platsen tagits väljer byn en ny', igen],
      [`inget byggs inpå elden innan den flyttats (${fore} jobb där), och sedan flyttas den och huset kan byggas där (${bygg ? 'byggt' : 'inte byggt'})`, fore === 0 && flyttad && bygg],
    ];
  },
};
// en ruta ute där värmen inte når (heatAt under 0,05), inte under tak, inte i en vägg och inte i vattnet: närmast elden från 8 rutor
function ringUte(s: SIM.State) {
  const f = getMap(s.seed).fire, tiles = getMap(s.seed).tiles;
  for (let d = 8; d < 40; d++) for (let y = f.y - d; y <= f.y + d; y++) for (let x = f.x - d; x <= f.x + d; x++) {
    if (Math.max(Math.abs(x - f.x), Math.abs(y - f.y)) !== d || x < 0 || y < 0 || x >= W || y >= SIM.H) continue;
    if (tiles[y * W + x] === T.Vatten || tiles[y * W + x] === T.Sten || isWall(s, x + 0.5, y + 0.5) || roomAt(s, x + 0.5, y + 0.5) || heatAt(s, x + 0.5, y + 0.5) >= 0.05) continue;
    return { x, y };
  }
  return undefined;
}

SCENARIER.skogsrojning = {
  text: 'Steg 3.6.9: en lagerplats och ett fält kan ligga i skogen. Träden där står kvar tills någon med yxa fäller dem, före andra träd, och de blir trä; inget läggs på en ruta där ett träd står och ingen ruta röjs under ett träd',
  kor: () => {
    const s = createState(9, START);
    tandEld(s); klockan(s, 9);
    const g = groundOf(s), c = bynsMitt(s), m = getMap(s.seed);
    // ett skogsparti nära lägret, två gånger två rutor, och ett fält i skogen bredvid
    const skog = (x: number, y: number, w: number, h: number) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (m.tiles[yy * W + xx] !== T.Skog && m.tiles[yy * W + xx] !== T.Gras || bitAt(xx, yy)) return false; return true; };
    const bitAt = (x: number, y: number) => usable(s, x, y) === false;
    let at: { x: number; y: number } | undefined;
    for (let d = 4; d < 14 && !at; d++) for (let dy = -d; dy <= d && !at; dy++) for (let dx = -d; dx <= d && !at; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === d && skog(Math.floor(c.x) + dx, Math.floor(c.y) + dy, 2, 4)) at = { x: Math.floor(c.x) + dx, y: Math.floor(c.y) + dy };
    if (!at) return [['ett skogsparti nära lägret', false]];
    for (let yy = at.y; yy < at.y + 4; yy++) for (let xx = at.x; xx < at.x + 2; xx++) g.trees[yy * W + xx] = 0.9;
    zonesOf(s).push({ x: at.x, y: at.y, w: 2, h: 2, namn: 'Skogslagret', prio: 3, rojs: true });
    const agare = living(s).find(q => ageOf(q, s.now) >= 18)!, f: SIM.Falt = { id: 99, x: at.x, y: at.y + 2, w: 2, dir: 1, n: 4, agare: agare.id, steg: 'roja', klara: 0, kvar: SIM.ODLING.rojaMin * 60000, rord: s.now };
    (s.falt ??= []).push(f); s.byggV = (s.byggV ?? 0) + 1;
    const lagerRutor = [0, 1, 2, 3].map(k => (at!.y + (k >> 1)) * W + at!.x + (k & 1)), faltRutor = SIM.faltRutor(f);
    // inget läggs under ett träd, och ägaren röjer inte fältet förrän träden fällts
    const sp = dropSpot(s, 'bar'), underTrad = lagerRutor.includes(tileOf(sp.x, sp.y));
    const vantar = !SIM.faltUppgift(s, agare);
    const tk = { act: 'odla', tool: 'roja', ref: f.id, until: s.now + HOUR } as unknown as Task;
    SIM.workOdla(s, agare, tk, HOUR_S);
    const orord = f.klara === 0 && g.trees[faltRutor[0]] >= FOREST;
    // den som har en yxa fäller först träden i lagret och på fältet
    const p = living(s).find(q => q !== agare && ageOf(q, s.now) >= 18)!;
    addTool(s, 'yxa', p);
    const forst = treeSpot(s, new Set(), p), forstOk = !!forst && SIM.skaRojas(s).includes(tileOf(forst.x, forst.y));
    // byn har mat, så att den med yxa inte måste jaga för egen räkning (det prövas inte här)
    put(s, 'bar', 150);
    kor(s, 48);
    const kvar = [...lagerRutor, ...faltRutor].filter(i => g.trees[i] >= FOREST).length;
    const tra = SIM.stocks(s).length + amountOf(s, 'ved');
    return [
      [`inget läggs i lagret där träden står (${underTrad ? 'lades under ett träd' : 'bredvid'})`, !underTrad],
      ['ägaren röjer inte fältet under träden', vantar && orord],
      [`den med yxa fäller först ett träd i lagret eller på fältet`, forstOk],
      [`efter 48 timmar (två dygn, två år i spelet) är träden fällda (${kvar} av 8 kvar) och har blivit trä (${Math.round(tra)} trä och stammar)`, kvar <= 2 && tra > 0],
    ];
  },
};

SCENARIER.stackar = {
  text: 'Stacken och vikten (steg 4.5.5.1, 6.1.8): en sak väger VIKT_STACK delat med stacken, om inte vikten står i registret, så en full stack av vad som helst väger lika mycket. Den som plockar upp tar så många hela saker som händerna orkar',
  kor: () => {
    const ny: Record<string, [number, number]> = { skinn: [30, 100 / 30], vilt: [5, 8], flinta: [20, 5], rep: [40, 2.5], ben: [40, 2.5] };
    const fel = Object.entries(ny).filter(([k, [n, v]]) => STACK[k] !== n || Math.abs(SIM.viktOf(k) - v) > 1e-9).map(([k]) => k);
    const lika = ['vargskinn', 'sten', 'grenar', 'torrgras', 'mossa', 'kol', 'silver', 'bar'].filter(k => STACK[k] !== { vargskinn: 5, sten: 10, grenar: 50, torrgras: 50, mossa: 50, kol: 25, silver: 200, bar: 25 }[k]);
    // en full stack av vad som helst väger lika mycket (det som inte har en egen vikt)
    const s = createState(1, START);
    const famn = (k: string) => load({ act: 'bara', phase: 'back', tx: 0, ty: 0, until: s.now, carry: 0, items: { [k]: STACK[k] } } as Task, s);
    const fulla = ['skinn', 'flinta', 'rep', 'ben', 'sten', 'grenar'].filter(k => Math.abs(famn(k) - SIM.VIKT_STACK) > 1e-9);
    // den som plockar upp harskinn tar så många som båda händerna orkar
    const p = living(s).find(q => ageOf(q, s.now) >= 18)!;
    put(s, 'skinn', 60);
    const g = (s.stackar ?? []).find(x => x.k === 'skinn')!;
    const t: Task = { act: 'bara', phase: 'go', tx: g.x + 0.5, ty: g.y + 0.5, until: s.now + HOUR, carry: 0, why: 'test', dark: false };
    SIM.pickUp(s, p, t, SIM.ryms(s, p));
    const tog = t.items?.skinn ?? 0, orkar = Math.floor(SIM.capacity(s, p) / SIM.viktOf('skinn') + 1e-9);
    return [
      [`de nya stackarna och vikterna: harskinn 30 à 3,3, fällt vilt 5 à 8, flinta 20 à 5, rep och ben 40 à 2,5${fel.length ? ` (fel: ${fel.join(', ')})` : ''}`, fel.length === 0],
      [`vargskinn, sten, grenar, hö, mossa, kol, silver och mat är som förut${lika.length ? ` (fel: ${lika.join(', ')})` : ''}`, lika.length === 0],
      [`en full stack väger ${SIM.VIKT_STACK}${fulla.length ? ` (fel: ${fulla.join(', ')})` : ''}`, fulla.length === 0],
      [`ur en hög med 60 harskinn tar man så många som båda händerna orkar (${tog} av ${orkar})`, tog === orkar],
    ];
  },
};

SCENARIER.omrade = {
  text: 'Byns område (steg 6.2.1–6.2.2): det husen, stationerna, lagren och eldarna omsluter, plus 2 rutor runt om; latrinen och slaktbänken räknas inte',
  kor: () => {
    const s = createState(9, START), f = SIM.eldPlats(s), o0 = SIM.omrade(s), k = SIM.OMRADE.kant;
    const inne = (o: SIM.Omrade, x: number, y: number) => o.inne[y * W + x] === 1;
    const zs0 = zonesOf(s);
    const lagerInne = zs0.every(z => { for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) if (!inne(o0, x, y)) return false; return true; });
    setFood(s, 600); setAmount(s, 'ved', 200); setAmount(s, 'grenar', 200); setAmount(s, 'flinta', 2); s.fire.ring = true;
    kor(s, 96);
    const o = SIM.omrade(s), hus = housesOf(s), st = SIM.stationerOf(s);
    const rutorIn = (x0: number, y0: number, w: number, h: number) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (!inne(o, x, y)) return false; return true; };
    const husUte = hus.filter(h => !rutorIn(h.x, h.y, h.w, h.h)).length;
    const stUte = st.filter(t => !SIM.stationDef(t.k)?.utkant).filter(t => { const m = SIM.storlekAv(t); return !rutorIn(t.x, t.y, m.w, m.h); }).length;
    // en ruta långt utanför allt räknas inte
    let langtUte = 0;
    for (let y = 0; y < SIM.H; y += 3) for (let x = 0; x < W; x += 3) if (inne(o, x, y) && SIM.tillHolje(x, y, o.holje) > k + 0.5) langtUte++;
    const samma = SIM.omrade(s) === o;
    // frågorna (steg 6.2.2)
    let fel = 0, utFel = 0;
    for (let y = 0; y < SIM.H; y += 2) for (let x = 0; x < W; x += 2) {
      if (SIM.iByn(s, x, y) !== (SIM.utanforByn(s, x, y) === 0)) fel++;
      const d = SIM.utanforByn(s, x, y), d2 = SIM.utanforByn(s, x + 1e-9, y);
      if (Math.abs(d - d2) > 1e-3 && !SIM.iByn(s, x, y)) utFel++;
    }
    const fri = SIM.friRuta(s), fri3 = SIM.friRuta(s, 3, (x, y) => !SIM.iByn(s, x, y));
    return [
      [`en ruta är innanför byn precis när den ligger 0 rutor utanför (${fel} fel), och en punkt mitt emellan räknas som rutan (${utFel} fel)`, fel === 0 && utFel === 0],
      [`en fri ruta innanför byn finns (${fri ? `${fri.x},${fri.y}` : 'ingen'}), och en utanför ligger högst 3 rutor ut (${fri3 ? SIM.utanforByn(s, fri3.x, fri3.y).toFixed(1) : 'ingen'})`, !!fri && SIM.iByn(s, fri.x, fri.y) && SIM.ledig(s, fri.x, fri.y) && !!fri3 && SIM.utanforByn(s, fri3.x, fri3.y) > 0 && SIM.utanforByn(s, fri3.x, fri3.y) <= 3],
      [`elden och rutorna ${k} steg från den hör till byn från början (${o0.n} rutor)`, inne(o0, f.x, f.y) && inne(o0, f.x + k, f.y) && inne(o0, f.x, f.y - k)],
      [`lagerplatserna ligger innanför byn från början`, lagerInne],
      [`efter 4 dygn (4 år i spelet) ligger alla hus och stationer innanför (${hus.length} hus, ${husUte} utanför; ${st.length} stationer, ${stUte} utanför; ${o.n} rutor)`, husUte === 0 && stUte === 0],
      [`ingen ruta långt från det byn omsluter räknas in (${langtUte})`, langtUte === 0],
      [`området sparas tills något ändras`, samma],
      [`byn växer: området är större efter 4 dygn (${o0.n} → ${o.n} rutor)`, o.n >= o0.n],
    ];
  },
};

SCENARIER.strak = {
  lang: true,
  text: 'Gångstråken (steg 6.2.5): från rutan utanför varje dörr går den kortaste vägen till elden, lagren, vattnet och torget (inte latrinen, steg 9.2.99), och där ställs inget nytt: inga stationer, lagerplatser eller fält, och hus bara om stråket kan dras om med högst 3 rutors omväg',
  kor: () => {
    const s = createState(9, START);
    byggare(s); setAmount(s, 'yxa', 2);
    setFood(s, 600); setAmount(s, 'ved', 200); setAmount(s, 'grenar', 200); setAmount(s, 'flinta', 2); s.fire.ring = true;
    // varje steg: det som står på rutor som var stråk steget innan och som inte stod där då (på en hel timme hinner stråket flyttas innan något ställs där)
    let paStrak = 0, husPa = 0, maxRutor = 0;
    const timmar = 120;
    const nyttPa: string[] = [];
    let dygnSedan = new Set<number>(); // stråken ett dygn före slutet: träden där har haft ett dygn på sig att fällas
    for (let t = 0; t < timmar * STEG_TIM; t++) {
      if (t === (timmar - 24) * STEG_TIM) dygnSedan = new Set(SIM.straken(s).vagar.flatMap(q => q.rutor));
      const fore = SIM.straken(s).ruta.slice();
      const st0 = new Set(SIM.stationerOf(s)), f0 = new Set(s.falt ?? []), h0 = new Set(housesOf(s));
      kor(s, 1 / STEG_TIM);
      const pa = (x: number, y: number, w: number, h: number) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (fore[j * W + i]) return true; return false; };
      for (const st of SIM.stationerOf(s)) if (!st0.has(st) && !SIM.stationDef(st.k)?.inne && !SIM.stationDef(st.k)?.forvar) { const m = SIM.storlekAv(st); if (pa(st.x, st.y, m.w, m.h)) { paStrak++; nyttPa.push(st.k); } }
      // lagerplatserna prövas i en kopia varje timme: en ny plats och en större, mot stråken just då (i spelet hinner stråken flyttas i samma steg)
      if (t % STEG_TIM === 0) {
        const c = cloneState(s), ruta = SIM.straken(c).ruta.slice(), vagarNu = SIM.straken(c).vagar;
        const zFore = zonesOf(c).map(z => ({ ...z }));
        setAmount(c, 'ved', amountOf(c, 'ved') + 300);
        SIM.lagerNy(c); SIM.lagerStorre(c);
        for (const z of zonesOf(c)) for (let j = z.y; j < z.y + z.h; j++) for (let i = z.x; i < z.x + z.w; i++) {
          const r = j * W + i, forut = zFore.some(o => i >= o.x && i < o.x + o.w && j >= o.y && j < o.y + o.h);
          if (!forut && ruta[r] && !vagarNu.every(v => !v.rutor.includes(r) || v.mal === 'lager' && v.rutor.indexOf(r) === v.rutor.length - 1)) { paStrak++; nyttPa.push('lager'); }
        }
      }
      for (const f of s.falt ?? []) if (!f0.has(f) && SIM.faltRutor(f).some(i => fore[i])) { paStrak++; nyttPa.push('fält'); }
      for (const h of housesOf(s)) if (!h0.has(h)) for (let j = h.y; j < h.y + h.h; j++) for (let i = h.x; i < h.x + h.w; i++) if (fore[j * W + i] === 2) husPa++;
      if (t % STEG_TIM === 0) maxRutor = Math.max(maxRutor, SIM.straken(s).ruta.reduce((a, v) => a + (v ? 1 : 0), 0));
    }
    const st = SIM.straken(s), hus = housesOf(s).filter(h => h.klar);
    const dorrar = new Set(st.vagar.map(v => v.dorr));
    const tillEld = [...dorrar].filter(d => st.vagar.some(v => v.dorr === d && v.mal === 'eld')).length, tillLager = [...dorrar].filter(d => st.vagar.some(v => v.dorr === d && v.mal === 'lager')).length;
    // ett hus på ett stråk som inte går att dra om hindras, ett på tom mark inte
    const v = st.vagar.find(q => q.mal === 'eld' && q.len > 4), mitt = v && v.rutor[Math.floor(v.rutor.length / 2)];
    const hindrar = mitt !== undefined && SIM.strakHindrar(s, mitt % W - 4, Math.floor(mitt / W) - 4, 9, 9);
    const framfor = v && SIM.strakHindrar(s, v.dorr % W, Math.floor(v.dorr / W), 1, 1);
    // steg 9.2.35: träden i stråken fälls
    const gS = groundOf(s), tradIStrak = new Set(st.vagar.flatMap(q => q.rutor).filter(i => dygnSedan.has(i) && gS.trees[i] >= SIM.FOREST)).size;
    return [
      [`inga träd står kvar efter 5 dygn i stråken som fanns ett dygn innan (${tradIStrak})`, tradIStrak === 0],
      [`efter 5 dygn (5 år i spelet) har husen dörrar med stråk (${hus.length} färdiga hus, ${dorrar.size} dörrar, som mest ${maxRutor} rutor stråk)`, hus.length > 0 && dorrar.size > 0],
      [`från varje dörr går ett stråk till elden (${tillEld} av ${dorrar.size}) och till en lagerplats (${tillLager})`, tillEld === dorrar.size && tillLager === dorrar.size],
      [`inget nytt ställs på ett stråk: ingen station, lagerplats eller fält (${paStrak} på ${timmar} timmar${nyttPa.length ? `: ${[...new Set(nyttPa)].join(', ')}` : ''})`, paStrak === 0],
      [`inget nytt hus står på rutan framför en dörr (${husPa})`, husPa === 0],
      [`rutan framför en dörr står fast`, framfor === true],
      // steg 9.2.99: inget stråk slutar vid en latrin (rutan intill den)
      ...(() => { const lat = SIM.stationerOf(s).filter(q => q.k === 'latrin'), vid = (i: number) => lat.some(l => { const m = SIM.storlekAv(l), x = i % W, y = Math.floor(i / W); return x >= l.x - 1 && x <= l.x + m.w && y >= l.y - 1 && y <= l.y + m.h; });
        const n = st.vagar.filter(q => q.mal !== 'lager' && vid(q.rutor[q.rutor.length - 1])).length; return [[`inget stråk slutar vid en latrin (${lat.length} latriner, ${n} stråk)`, n === 0]] as [string, boolean][]; })(),
      [`ett hus som stänger stråket till elden hindras (${hindrar ? 'ja' : 'nej'}), men inte ett hus långt från stråken`, hindrar !== undefined && !SIM.strakHindrar(s, 2, 2, 3, 3)],
    ];
  },
};

SCENARIER.strakprov = {
  text: 'Provet med gångstråken (steg 6.2.6): samma by i 12 dygn (12 år i spelet, knappt två veckor i verkligheten) med och utan stråken. Med stråken står husen inte mer än lite längre från byns mitt, och utan stråken räknas inga hus som fick sämre plats för ett stråk',
  lang: true,
  kor: () => {
    // samma körning som npm run prov, för en by: utan stråken med BALANS="strak.pa=0" (balanstalen går inte att ändra i en körning)
    const fil = fileURLToPath(new URL('../prov-en.ts', import.meta.url));
    const by = (env: Record<string, string>) => {
      const u = spawnSync(process.execPath, ['--import', 'tsx', fil, '1002', '12'], { env: { ...process.env, ...env }, encoding: 'utf8' });
      if (u.status) throw new Error(`prov-en.ts kraschade:\n${(u.stderr ?? '').slice(-1500)}`);
      return JSON.parse(u.stdout.trim().split('\n').pop()!) as { hus: number; fran: number; samre: number; ingen: number; om: number; utan: boolean; vakter: string[] };
    };
    // 12 dygn: efter 8 dygn har ingen kommit på timmerväggen, och då byggs inget hus att pröva stråken på
    const med = by({}), utan = by({ BALANS: 'strak.pa=0' });
    return [
      [`båda byarna har hus efter 12 dygn (12 år i spelet): med ${med.hus}, utan ${utan.hus}; med stråken sämre plats ${med.samre}, ingen plats ${med.ingen}, stråk som drogs om ${med.om}`, med.hus > 0 && utan.hus > 0 && !med.utan && utan.utan],
      [`med stråken står inget hus mer än 4 rutor längre från byns mitt än utan (längst bort ${med.fran.toFixed(1)} mot ${utan.fran.toFixed(1)})`, med.fran <= utan.fran + 4],
      [`utan stråken räknas inga hus som fick sämre plats eller stråk som drogs om (${utan.samre}, ${utan.om})`, utan.samre === 0 && utan.om === 0 && utan.ingen === 0],
      [`vakterna larmar inte (${[...med.vakter, ...utan.vakter].join('; ')})`, !med.vakter.length && !utan.vakter.length],
    ];
  },
};

SCENARIER.rumstyper = {
  text: 'Steg 7.2.1: rummen räknas fram och funktionen sitter på rummet, inte på hela huset. Registret RUMSTYPER ger rummet en tagg för varje krav det uppfyller, och taggar som passar dåligt ihop ger ett minus',
  kor: () => {
    const s = createState(6, START);
    klockan(s); byggare(s);
    SIM.planBuild(s); byggKlart(s);
    const h = housesOf(s)[0], r = () => gridOf(s).rooms.find(q => q.hus === h.id && q.tiles.length)!, rum = r();
    const gammal = SIM.rumFnId(s, rum) === SIM.fnId(h) && h.rumFn === undefined;
    const sov = SIM.rumTaggar(s, rum).has('sovsal') && SIM.sovplatser(s, rum) === SIM.sovPersoner(rum.tiles.length);
    const vilaFore = SIM.rumVila(s, rum);
    const stall = (k: string, i: number) => { (s.stationer ??= []).push({ id: (s.nextBit ??= 1), k, x: i % SIM.W, y: Math.floor(i / SIM.W), kvar: 0, inne: 1 } as SIM.Station); s.nextBit++; SIM.touch(s); };
    stall('bord', rum.tiles[0]);
    const matsal = SIM.rumTaggar(s, r()).has('matsal');
    stall('flatarbank', rum.tiles[rum.tiles.length - 1]);
    const verkstad = SIM.rumTaggar(s, r()).has('verkstad'), minus = SIM.rumMinus(s, r()).length > 0, vilaEfter = SIM.rumVila(s, r());
    const fore = SIM.sovplatser(s, r());
    SIM.setRumFn(s, r(), 'samling');
    const fnRum = SIM.rumFnId(s, r()) === 'samling' && SIM.fnId(h) === 'sovsal' && SIM.sovplatser(s, r()) === 0 && SIM.samlingRum(s)?.id === r().id;
    const namn = SIM.rumNamn(s, r());
    return [
      ['ett hus från en gammal sparfil är ett rum med husets funktion', gammal],
      [`rummet är en sovsal med en sovplats per tre rutor (${SIM.sovplatser(s, rum)} på ${rum.tiles.length} rutor, steg 9.2.36)`, sov],
      ['ett bord inne gör rummet till en matsal', matsal],
      ['en arbetsbänk gör det till en verkstad', verkstad],
      [`verkstad och sovplatser passar dåligt ihop: man vilar sämre (${vilaFore} → ${vilaEfter.toFixed(2)})`, minus && vilaEfter < vilaFore],
      [`funktionen sitter på rummet: med samling som funktion försvinner sovplatserna (${fore} → 0), och huset är fortfarande en sovsal`, fnRum],
      [`rummets namn efter taggarna: ${namn}`, !!namn],
    ];
  },
};

SCENARIER.byggplan = {
  text: 'Steg 7.2.2–7.2.6: behoven anmäls och Byggplanen tar det förslag som ger mest värde per kostnad. Ritningen prövas, ett behov måste ha funnits ett tag, och ett hus byggs ut i stället för att ett nytt byggs. Den nya delen byggs först och väggen öppnas sist',
  kor: () => {
    const s = createState(6, START);
    klockan(s); byggare(s);
    SIM.planBuild(s); byggKlart(s);
    const h = housesOf(s)[0], fore = { w: h.w, h: h.h }, rumFore = gridOf(s).rooms.filter(r => r.hus === h.id && r.tiles.length).length;
    const foreIngen = SIM.byggbehov(s).filter(b => b.fn === 'sovsal').length === 0;
    for (let i = 0; i < 4; i++) nyInvanare(s, i % 2 ? 'm' : 'k', 25);
    const behov = SIM.byggbehov(s)[0];
    // ett behov som inte är en fara väntar
    SIM.stepBehov(s);
    const minns = Object.keys(s.byggBehov ?? {}).some(k => k.startsWith('sovsal'));
    const kostar = SIM.ritningKostnad([{ x: 0, y: 0, m: 'timmer' }]) > 0;
    SIM.planBuild(s);
    const pagar = !!h.ut, ettHus = housesOf(s).length === 1;
    const nya = bitsOf(s).filter(b => b.hus === h.id && b.b < 1).length;
    // den nya delen byggs av arbetet: väggen står kvar tills den är klar
    const p = living(s)[0], gamlaVaggar = (h.ut?.oppnas ?? []).length;
    const stangd = (h.ut?.oppnas ?? []).every(([x, y]) => { const b = SIM.bitAt(s, x, y); return b && b.b >= 1 && b.k !== 'golv'; });
    let varv = 0;
    while (h.ut && varv++ < 2000) {
      const b = bitsOf(s).find(q => q.hus === h.id && q.b < 1);
      if (!b) break;
      const M = MATERIAL[b.m];
      if (M.item) b.mat = M.n;
      SIM.workOn(s, p, b, 3600);
    }
    const rum = gridOf(s).rooms.filter(r => r.hus === h.id && r.tiles.length);
    const storre = h.w * h.h > fore.w * fore.h, sov = rum.reduce((n, r) => n + SIM.sovplatser(s, r), 0);
    const fel = SIM.husFel(s);
    const rektangel = bitsOf(s).filter(b => b.hus === h.id).length === h.w * h.h;
    return [
      ['innan någon saknar sovplats finns inget sådant behov', foreIngen],
      [`när folk saknar sovplats anmäls behovet (${behov?.fn}), och byn minns när det kom`, behov?.fn === 'sovsal' && minns],
      ['en ritning har en kostnad', kostar],
      ['Byggplanen väljer att bygga ut det befintliga huset, inte ett nytt', pagar && ettHus],
      [`ritningen är nya rutor (${nya}), och den gamla väggen står kvar (${gamlaVaggar} rutor)`, nya > 0 && gamlaVaggar > 0 && stangd],
      [`huset är större (${fore.w}×${fore.h} → ${h.w}×${h.h}) och fortfarande en rektangel, med ett rum (${rumFore} → ${rum.length})`, storre && rektangel && rum.length === 1 && !h.ut],
      [`huset rymmer så många som rutorna räcker till, tre per person (${sov} sovplatser på ${(h.w - 2) * (h.h - 2)} rutor)`, sov === SIM.sovPersoner((h.w - 2) * (h.h - 2))],
      [`vakten för husen är tyst${fel ? ': ' + fel : ''}`, !fel],
    ];
  },
};

SCENARIER.bryggaBort = {
  text: 'Den som står på en brygga när den försvinner (brand, tornado, slitage) hamnar på närmaste lediga ruta, inte i vattnet',
  kor: () => {
    const s = createState(6, START), g = SIM.getMap(s.seed).tiles, p = living(s)[0];
    let i = g.findIndex(t => t === SIM.T.Vatten);
    const x = i % SIM.W, y = Math.floor(i / SIM.W), b: SIM.Bit = { id: (s.nextBit ??= 1), x, y, k: 'golv', m: 'brygga', b: 1, mat: 1, c: 1 };
    s.nextBit++; SIM.bitsOf(s).push(b); s.bryggV = (s.bryggV ?? 0) + 1; SIM.touch(s);
    const paBryggan = SIM.vattenNu(s)[i] !== SIM.T.Vatten;
    p.x = x + 0.5; p.y = y + 0.5;
    SIM.vagBort(s, b);
    return [
      ['bryggan går att stå på', paBryggan],
      [`när den är borta står hen på land (${p.x}, ${p.y})`, SIM.vattenNu(s)[SIM.tileOf(p.x, p.y)] !== SIM.T.Vatten],
    ];
  },
};
SCENARIER.scenflytt = {
  text: 'Steg 7.2.7 och 8.1.16: en scen som står ute rivs när byn har en samlingssal med plats, en del av materialet kommer tillbaka och en ny byggs i salen, som blir en gillesal. Den rivs inte medan någon uppträder',
  kor: () => {
    const s = createState(6, START), g = SIM.getMap(s.seed).tiles, c = SIM.bynsMitt(s);
    klockan(s);
    const fritt = (x: number, y: number) => x > 0 && y > 0 && x < SIM.W - 1 && y < SIM.W - 1 && g[y * SIM.W + x] !== SIM.T.Sten && g[y * SIM.W + x] !== SIM.T.Vatten && SIM.ledig(s, x, y) && !SIM.bitAt(s, x, y);
    let pl: { x: number; y: number } | undefined, bd = Infinity;
    for (let y = 2; y < SIM.W - 10; y++) for (let x = 2; x < SIM.W - 10; x++) {
      const d = Math.hypot(x - c.x, y - c.y);
      if (d >= bd || d < 8) continue;
      let ok = true;
      for (let yy = y; yy < y + 6 && ok; yy++) for (let xx = x; xx < x + 7 && ok; xx++) ok = fritt(xx, yy);
      if (ok) { bd = d; pl = { x, y }; }
    }
    if (!pl) return [['en plats för salen', false]];
    const h: SIM.Hus = { id: (s.nextBit ??= 1), namn: 'Samlingshus', x: pl.x, y: pl.y, w: 7, h: 6, fn: 'verkstad', klar: s.now };
    s.nextBit++;
    for (let yy = pl.y; yy < pl.y + 6; yy++) for (let xx = pl.x; xx < pl.x + 7; xx++) {
      const kant = xx === pl.x || yy === pl.y || xx === pl.x + 6 || yy === pl.y + 5, m = xx === pl.x + 3 && yy === pl.y + 5 ? 'oppning' : kant ? 'timmer' : 'tra';
      SIM.bitsOf(s).push({ id: s.nextBit++, x: xx, y: yy, k: SIM.MATERIAL[m].k, m, b: 1, mat: SIM.MATERIAL[m].n, c: 1, hus: h.id });
    }
    housesOf(s).push(h); SIM.touch(s);
    const sc = { id: s.nextBit++, k: 'scen', x: pl.x - 6, y: pl.y - 4, kvar: 0 } as SIM.Station;
    (s.stationer ??= []).push(sc); SIM.touch(s);
    SIM.stepStationer(s);
    const uteUtanSal = s.stationer.includes(sc);
    h.fn = 'samling'; h.rumFn = undefined; SIM.touch(s);
    s.fram = { k: 'sang', p: living(s)[0].id, start: s.now, slut: s.now + 3600000, publik: [], text: '', scen: sc.id };
    SIM.stepStationer(s);
    const uteUnder = s.stationer.includes(sc);
    delete s.fram;
    const virke = amountOf(s, 'virke');
    SIM.stepStationer(s);
    const riven = !s.stationer.includes(sc), tillbaka = amountOf(s, 'virke') - virke, ska = Math.floor(SIM.RECEPT.scen.av.virke! * SIM.HUS.rivTillbaka);
    const plats = SIM.stationSite(s, 'scen');
    const ny = plats && !!SIM.roomAt(s, plats.x, plats.y);
    return [
      ['utan sal står scenen kvar', uteUtanSal],
      ['den rivs inte medan någon uppträder', uteUnder],
      [`med en sal rivs den, och hälften av materialet kommer tillbaka (${tillbaka} av ${ska} virke)`, riven && tillbaka === ska],
      ['den nya scenen får sin plats i salen', !!ny],
    ];
  },
};
SCENARIER.stockihus = {
  text: 'Steg 8.1.13: ett hus är inte klart förrän de fällda träden inne i det är huggna och veden burna ut, och det arbetet görs först',
  kor: () => {
    const s = createState(6, START);
    byggare(s); setAmount(s, 'yxa', 2);
    const g = groundOf(s), c = SIM.bynsMitt(s);
    let pl: { x: number; y: number } | undefined;
    for (let r = 6; r < 30 && !pl; r++) for (let dy = -r; dy <= r && !pl; dy++) for (let dx = -r; dx <= r && !pl; dx++) {
      let ok = true;
      for (let yy = 0; yy < 4 && ok; yy++) for (let xx = 0; xx < 4 && ok; xx++) ok = SIM.ledig(s, c.x + dx + xx, c.y + dy + yy) && g.trees[(c.y + dy + yy) * W + c.x + dx + xx] < FOREST;
      if (ok) pl = { x: c.x + dx, y: c.y + dy };
    }
    if (!pl) return [['en plats för huset', false]];
    const h: SIM.Hus = { id: (s.nextBit ??= 1), namn: 'Hydda', x: pl.x, y: pl.y, w: 4, h: 4, fn: 'sovsal' };
    s.nextBit++;
    for (let y = pl.y; y < pl.y + 4; y++) for (let x = pl.x; x < pl.x + 4; x++) {
      const kant = x === pl.x || y === pl.y || x === pl.x + 3 || y === pl.y + 3, m = x === pl.x + 1 && y === pl.y + 3 ? 'oppning' : kant ? 'timmer' : 'jord';
      SIM.bitsOf(s).push({ id: s.nextBit++, x, y, k: SIM.MATERIAL[m].k, m, b: 1, mat: SIM.MATERIAL[m].n, c: 1, hus: h.id });
    }
    housesOf(s).push(h); SIM.touch(s);
    const k: SIM.Stock = { id: 99, x: pl.x + 1.5, y: pl.y + 1.5, ved: 4, grenar: 0 };
    (s.stockar ??= []).push(k);
    const p = living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!, annan = living(s).filter(q => q !== p);
    SIM.husKlart(s, h, p);
    const inteKlart = !h.klar;
    for (const q of annan) q.task = undefined;
    const jobb = SIM.buildJob(s, p);
    s.stockar = s.stockar.filter(q => q !== k); SIM.husKlart(s, h, p);
    return [
      ['med en stock kvar inne är huset inte klart', inteKlart],
      [`det första jobbet är att hugga stocken (${jobb?.hugg})`, jobb?.hugg === 99],
      ['när stocken är borta är huset klart', !!h.klar],
    ];
  },
};
SCENARIER.stockhus = {
  text: 'Steg 9.2.86: en fälld stock vars krona ritas över ett färdigt hus huggs före alla andra stockar och före nästa fällning; det räknas på rutorna som stockens bild täcker',
  kor: () => {
    const s = createState(6, START);
    byggare(s); setAmount(s, 'yxa', 2);
    const c = SIM.bynsMitt(s), pl = { x: c.x + 8, y: c.y + 8 };
    const h: SIM.Hus = { id: (s.nextBit ??= 1), namn: 'Hydda', x: pl.x, y: pl.y, w: 4, h: 4, fn: 'sovsal', klar: s.now };
    s.nextBit++;
    housesOf(s).push(h); SIM.touch(s);
    // foten står till vänster om huset, kronan (tre rutor åt höger) ligger över det; en annan stock ligger närmare byn
    const over: SIM.Stock = { id: 98, x: pl.x - 1.5, y: pl.y + 1.5, ved: 9, grenar: 0 };
    const nara: SIM.Stock = { id: 97, x: c.x + 1.5, y: c.y + 1.5, ved: 9, grenar: 0 };
    const kort: SIM.Stock = { id: 96, x: pl.x - 1.5, y: pl.y + 1.5, ved: 2, grenar: 0 };
    s.stockar = [nara, over];
    const p = living(s).find(q => ageOf(q, s.now) >= ALDER.vuxen)!;
    for (const q of living(s)) q.task = undefined;
    const ax = SIM.axeTask(s, p), virke = SIM.PROJEKT.virke.uppgift(s, p), roj = SIM.PROJEKT.rojning.uppgift(s, p);
    const fotUtanfor = !(Math.floor(over.x) >= h.x && Math.floor(over.x) < h.x + h.w);
    s.stockar = [nara, kort];
    const ax2 = SIM.axeTask(s, p);
    return [
      ['stockens fot står utanför huset', fotUtanfor],
      ['kronan ligger över huset', SIM.overHus(s, over)],
      [`vedhuggaren hugger stocken över huset först (${ax?.act} ${ax?.ref})`, ax?.act === 'hugga' && ax.ref === 98],
      [`virket fäller inget nytt träd förrän den är huggen (${virke?.act} ${virke?.ref})`, virke?.act === 'hugga' && virke.ref === 98],
      [`inte heller röjningen (${roj?.act} ${roj?.ref})`, roj?.act === 'hugga' && roj.ref === 98],
      ['en kort stock på samma plats når inte huset', !SIM.overHus(s, kort)],
      [`då huggs den närmaste stocken som förut (${ax2?.ref})`, ax2?.act === 'hugga' && ax2.ref === 97],
    ];
  },
};
SCENARIER.liggande = {
  lang: true,
  text: 'Steg 9.2.87: hela trädet tas om hand innan nästa fälls: den som fällt ett träd hugger helst stammen själv, och viljan att fälla ett nytt träd för ett projekt sjunker med antalet stammar som ligger i byn',
  kor: () => {
    const s = createState(6, START);
    byggare(s); setAmount(s, 'yxa', 2);
    const c = SIM.bynsMitt(s), p = living(s).find(q => ageOf(q, s.now) >= ALDER.vuxen)!;
    for (const q of living(s)) q.task = undefined;
    const nara: SIM.Stock = { id: 97, x: c.x + 1.5, y: c.y + 1.5, ved: 9, grenar: 0 };
    const egen: SIM.Stock = { id: 96, x: c.x + 6.5, y: c.y + 5.5, ved: 9, grenar: 0, av: p.id };
    s.stockar = [nara, egen];
    const ax = SIM.axeTask(s, p), virke = SIM.PROJEKT.virke.uppgift(s, p), roj = SIM.PROJEKT.rojning.uppgift(s, p);
    s.stockar = [];
    const v0 = SIM.fallVilja(s);
    s.stockar = [1, 2, 3].map(i => ({ id: 90 + i, x: c.x + i + 0.5, y: c.y + 0.5, ved: 6, grenar: 0 }));
    const v3 = SIM.fallVilja(s);
    s.stockar = [];
    // en by i fyra dygn (fyra år i spelet): stammarna som ligger i byn räknas varje timme
    const b = createState(3, START);
    byggare(b); setAmount(b, 'yxa', 2); put(b, 'bar', 150);
    const n: number[] = [];
    let fallda0 = b.fallda ?? 0, timme = 0;
    kor(b, 96, x => { if (++timme % STEG_TIM === 0) n.push((x.stockar ?? []).filter(k => k.ved > 0 && !SIM.utanforByn(x, k.x, k.y)).length); });
    n.sort((a, d) => a - d);
    /* Medianen är 0: stammarna ligger i byn bara kort. Toppen kommer när byn fäller till ett hus (stammarna kommer i en klunga,
       7–11 en kort stund, sedan 6 medan de klyvs) och ligger strax över förra gränsen 10 beroende på slumpen; 14 fångar
       fortfarande ett verkligt fel där stammar hopar sig (ett tjugotal) */
    const med = n[n.length >> 1] ?? 0, max = n[n.length - 1] ?? 0, fallda = (b.fallda ?? 0) - fallda0;
    const g = groundOf(s), ti = [...g.trees.keys()].find(i => SIM.isForest(s, i)), fk = ti === undefined ? undefined : SIM.fellTree(s, p, ti % W + 0.5, Math.floor(ti / W) + 0.5);
    const avSatt = fk?.av === p.id;
    return [
      [`yxbäraren hugger stammen hen själv fällt före en närmare (${ax?.ref})`, ax?.act === 'hugga' && ax.ref === 96],
      [`virket klyvs ur den egna stammen (${virke?.act} ${virke?.ref})`, virke?.act === 'klyva' && virke.ref === 96],
      [`röjningen hugger den egna stammen före nästa fällning (${roj?.act} ${roj?.ref})`, roj?.act === 'hugga' && roj.ref === 96],
      [`viljan att fälla sjunker med stammarna i byn (${v0.toFixed(2)} → ${v3.toFixed(2)})`, v0 === 1 && v3 < 0.6],
      ['en fälld stam vet vem som fällde den', avSatt],
      [`stammar i byn: median ${med}, högst ${max} (${fallda} träd fällda på fyra dygn)`, med <= 3 && max <= 14],
    ];
  },
};
SCENARIER.sanggang = {
  text: 'Steg 9.2.89: den som går till sängen går upprätt och lägger sig först i bädden (kartan ritar liggande bara när soverNu säger det)',
  kor: () => {
    const s = createState(3, START), p = living(s)[0];
    const tk = { act: 'sova', phase: 'go', tx: p.x + 6, ty: p.y + 2, until: s.now + 8 * HOUR, carry: 0 } as unknown as Task;
    const pavag = SIM.soverNu(p, tk);
    tk.phase = 'do';
    const intefram = SIM.soverNu(p, tk);
    p.x = tk.tx; p.y = tk.ty;
    const framme = SIM.soverNu(p, tk);
    // en natt i byn: ingen som är på väg till sin sovplats räknas som sovande
    const b = createState(3, START);
    klockan(b, 21); tandEld(b);
    let fel = 0, sover = 0;
    kor(b, 10, x => { for (const q of living(x)) if (q.task?.act === 'sova') { if (q.task.phase === 'go' && SIM.soverNu(q, q.task)) fel++; if (SIM.soverNu(q, q.task)) sover++; } });
    return [
      ['på väg till sängen går man upprätt', !pavag],
      ['långt från sovplatsen ligger man inte', !intefram],
      ['framme lägger man sig', framme],
      [`under natten ligger ingen på väg (${fel}) och de som somnat ligger (${sover})`, fel === 0 && sover > 0],
    ];
  },
};
SCENARIER.lagerivagen = {
  text: 'Steg 8.1.15: en lagerplats påverkar inte var ett hus eller en station ute byggs. Ligger den i vägen flyttas den till en ny plats med samma namn, och sakerna bärs dit. Steg 9.2.15: likadant när ett stråk går igenom den',
  kor: () => {
    const s = createState(6, START), z = SIM.zonesOf(s)[0], namn = z.namn, gx = z.x, gy = z.y;
    SIM.flyttaLager(s, z);
    const ny = SIM.zonesOf(s)[0];
    // en station ute väljer sin plats som om lagret inte fanns: lagret och det som ligger i det läggs där platsen är, och
    // platsen är densamma (vägarna räknas inte om, så området och byns mitt är desamma). Lagret flyttas när bygget börjar
    const k = 'klyvplats', s2 = createState(6, START), plats = SIM.stationSite(s2, k)!, z2 = SIM.zonesOf(s2)[0];
    for (const a of SIM.pilesOf(s2)) if (SIM.inZone(z2, a.x, a.y)) { a.x += plats.x - z2.x; a.y += plats.y - z2.y; }
    z2.x = plats.x; z2.y = plats.y;
    const plats2 = SIM.stationSite(s2, k);
    for (const [m, n] of Object.entries(SIM.stationDef(k)!.av)) SIM.put(s2, m, n + 5);
    const p = living(s2)[0], tk = { act: 'station', tool: k, until: s2.now } as unknown as Task;
    SIM.startStation(s2, p, tk);
    const st = SIM.stationerOf(s2).find(t => t.k === k), z3 = SIM.zonesOf(s2).find(q => q.namn === z2.namn);
    return [
      [`lagerplatsen flyttade (${gx},${gy} → ${ny.x},${ny.y})`, ny.x !== gx || ny.y !== gy],
      ['den har kvar sitt namn', ny.namn === namn],
      ['det som låg där ligger nu utanför och ska bäras in', SIM.overflow(s).length > 0 || SIM.pilesOf(s).length === 0],
      [`en station ute får sin plats fast lagret ligger där (${plats.x},${plats.y} och ${plats2?.x},${plats2?.y})`, !!plats2 && plats2.x === plats.x && plats2.y === plats.y],
      ['när stationen börjar byggas där flyttas lagret', !!st && st.x === plats.x && !!z3 && !(z3.x === plats.x && z3.y === plats.y)],
      ...lagerIStraket(),
    ];
  },
};
// steg 9.2.15: vägarna dras utan hänsyn till lagerplatserna; en lagerplats som ett stråk går igenom flyttas
function lagerIStraket(): [string, boolean][] {
  const s = createState(1, START);
  medHus(s);
  const v = SIM.straken(s).vagar.filter(q => q.mal !== 'lager' && q.rutor.length >= 4).sort((a, b) => b.len - a.len)[0];
  if (!v) return [['ett stråk från dörren att lägga ett lager på', false]];
  const r = v.rutor[Math.floor(v.rutor.length / 2)], x = r % W, y = Math.floor(r / W), z0 = SIM.zonesOf(s)[0];
  const z = { ...z0, x, y, w: 1, h: 1, namn: 'Lagret i vägen' };
  s.lagren = [...SIM.zonesOf(s), z]; SIM.touch(s);
  const genom = SIM.straken(s).vagar.some(q => q.mal !== 'lager' && q.rutor.includes(r));
  SIM.lagerIStraket(s);
  const ny = SIM.zonesOf(s).find(q => q.namn === 'Lagret i vägen');
  return [
    [`stråket till ${v.mal === 'vatten' ? 'vattnet' : v.mal} går genom en lagerplats som ligger i vägen`, genom],
    [`och lagerplatsen flyttas bort från stråket (${x},${y} → ${ny ? `${ny.x},${ny.y}` : 'borta'})`, !ny || !(ny.x === x && ny.y === y)],
  ];
}
SCENARIER.staende = {
  text: 'Steg 9.2.133: ett nytt hus prövas också stående, djupare än brett, så att en smal men djup lucka i en trång by går att bygga i',
  kor: () => {
    const s = createState(6, START); klockan(s); byggare(s);
    const g = groundOf(s), f = SIM.eldPlats(s);
    const b = { fn: 'sovsal' as const, a: { v: 1, plats: 2 }, sc: 0 };
    // bara en smal lucka (fem rutor bred, tolv djup) går att bygga i: den hittas bland platserna runt elden
    let fs: { w: number; h: number }[] = [], vid = '';
    for (let r = 4; r < 20 && !fs.length; r += 2) for (const [dx, dy] of [[r, -6], [-r - 5, -6], [-2, r], [-2, -r - 12]]) {
      const x0 = f.x + dx, y0 = f.y + dy;
      const okAt = (i: number) => { const x = i % W, y = Math.floor(i / W); return x >= x0 && x < x0 + 5 && y >= y0 && y < y0 + 12 && g.tiles[i] !== T.Vatten && !SIM.bitAt(s, x, y); };
      fs = SIM.BYGGATGARDER.nyttHus.foresla(s, b, okAt); if (fs.length) { vid = `${x0},${y0}`; break; }
    }
    const h = fs[0];
    return [
      [`i luckan (${vid || 'ingen'}) föreslås ett stående hus (${h ? `${h.w}×${h.h}` : 'inget'})`, !!h && h.w <= 5 && h.h > h.w],
    ];
  },
};

SCENARIER.husmarknad = {
  text: 'Steg 9.2.109 och 9.2.110: alla bostäder går att köpa, men priset följer hur mycket säljaren behöver huset. Ett hus där folk bor kostar mer än att bygga nytt, ett hus som ägaren inte behöver säljs billigt, och en familj som inte har råd att bygga nytt köper ett sådant, med det hela familjen äger',
  kor: () => {
    const s = createState(6, START);
    klockan(s); byggare(s);
    planBuild(s); byggKlart(s); // en sovsal åt alla
    const ppl = living(s).sort((x, y) => x.id - y.id), c = ppl.find(q => q.mother !== undefined)!, a = ppl.find(q => q.id === Math.min(c.mother!, c.father!))!;
    const b = ppl.find(q => q.id === a.partner)!;
    nyInvanare(s, 'm', 30); const d = living(s)[living(s).length - 1]; // en ensam bybo
    const h = housesOf(s)[0];
    // byns sovsal där alla sover: den går att köpa, men den kostar mer än att bygga ett nytt lika stort hus
    const dyrt = SIM.saljPris(s, h), iBruk = SIM.kopbart(s, h) && SIM.saljBehov(s, h) === 1 && dyrt > SIM.husKostnadAv((h.w - 2) * (h.h - 2));
    // läget: mitt i byn är ett hus värt mer, i kanten av området inte
    const m = SIM.bynsMitt(s), mitt = SIM.lage(s, { ...h, x: m.x - 1, y: m.y - 1, w: 3, h: 3 }), kant = SIM.lage(s, { ...h, x: m.x + 40, y: m.y, w: 3, h: 3 });
    // en ensam bybo äger huset: det är för stort för hen, så hen säljer billigt. Huset är slitet och värt en fjärdedel
    h.ag = d.id; h.fn = 'familjehus';
    for (const q of bitsOf(s)) if (q.hus === h.id) q.c = 0.25;
    touch(s);
    const pris = SIM.saljPris(s, h), billigt = SIM.saljBehov(s, h) === 0 && pris < SIM.husVarde(s, h) * SIM.lage(s, h);
    const fattig = mostUrgent(s)?.a.ag !== a.id && !SIM.byggbehov(s).some(q => q.a.ag === a.id);
    put(s, 'silver', Math.ceil(pris) + 10, { [b.id]: Math.ceil(pris) + 10 }); // partnern äger silvret (steg 9.2.110); marginal: familjen byter också till sig annat under tiden
    const bFore = SIM.ownsAmount(s, b, 'silver');
    const u = SIM.byggbehov(s).find(q => q.a.ag === a.id), kanBygga = [a, b].reduce((v, q) => v + (SIM.formogenheter(s).egen.get(q.id) ?? 0), 0);
    planBuild(s);
    const affar = s.husAffar?.ag === a.id && s.husAffar.hus === h.id, ingetNytt = !housesOf(s).some(q => q !== h && q.ag === a.id);
    for (let i = 0; i < 48 && h.ag !== a.id; i++) kor(s, 1);
    return [
      [`ett hus där alla sover går att köpa men kostar mer än ett nytt (${Math.round(dyrt)})`, iBruk],
      [`ett hus mitt i byn är värt lite mer (${mitt.toFixed(2)} gånger), ett utanför byn inte (${kant.toFixed(2)})`, mitt > 1 && mitt <= 1 + SIM.PLAN.lageMax && kant === 1],
      [`ett hus som ägaren inte behöver säljs under värdet (${Math.round(pris)} av ${Math.round(SIM.husVarde(s, h) * SIM.lage(s, h))} med läget)`, billigt],
      ['en familj utan något att betala med vill inte ha något hus', fattig],
      [`med silver nog för det begagnade huset men inte för ett nytt hos partnern vill familjen köpa (parets förmögenhet ${Math.round(kanBygga)})`, !!u && u.fn === 'familjehus' && !!u.a.kop],
      ['familjen bygger inget nytt utan gör upp om huset', affar && ingetNytt],
      [`och huset blir familjens (${h.namn})`, h.ag === a.id && (s.stat?.husKopt ?? 0) >= 1],
      [`partnern lade till silvret (${bFore} → ${SIM.ownsAmount(s, b, 'silver')})`, SIM.ownsAmount(s, b, 'silver') < bFore],
    ];
  },
};

SCENARIER.husbyte = {
  text: 'Steg 7.2.12: ett hus säljs genom samma bytessystem som allt annat: när köparen och säljaren möts ligger huset som en symbol på filten, och det blir handslag och en rad i loggen. Går det inte att betala blir det inget. En handlare kan aldrig köpa ett hus',
  kor: () => {
    const s = createState(6, START);
    klockan(s); byggare(s);
    for (let i = 0; i < 6; i++) nyInvanare(s, i % 2 ? 'm' : 'k', 25);
    SIM.planBuild(s); byggKlart(s);
    const [a, b] = living(s).filter(q => !q.mother && !q.father);
    a.partner = b.partner = undefined;
    const h = housesOf(s)[0]; h.ag = b.id; h.fn = 'familjehus'; SIM.touch(s);
    const pris = SIM.saljPris(s, h);
    const utanPengar = SIM.kopHus(s, h, a.id) === false && h.ag === b.id;
    SIM.put(s, 'silver', 400, { [a.id]: 400 });
    const silver0 = SIM.ownsAmount(s, b, 'silver');
    const gick = SIM.kopHus(s, h, a.id);
    const f = (s.filtar ?? []).filter(q => q.varor.some(w => w.k === 'hus'));
    const ha = createState(7, START), hp = { id: -5, namn: 'Handlaren', x: 0, y: 0, varde: () => 1, over: () => [] };
    let fel = false;
    try { SIM.flytta(ha, { k: 'hus', n: 1, hus: 1, varde: 1 }, hp, hp); } catch { fel = true; }
    const rad = [a, b].some(q => q.byten?.some(m => m.bg.some(v => v.k === 'hus') || m.ag.some(v => v.k === 'hus')));
    return [
      [`huset är värt minst ${Math.round(pris)} för säljaren`, pris > 0],
      ['utan något att betala med blir det inget', utanPengar],
      [`med silver byter huset ägare (${h.namn})`, gick && h.ag === a.id],
      [`säljaren fick betalt (${silver0} → ${SIM.ownsAmount(s, b, 'silver')} silver)`, SIM.ownsAmount(s, b, 'silver') > silver0],
      ['huset ligger som en symbol på filten, mitt emot betalningen', f.length === 1 && (s.filtar ?? []).filter(q => q.par === f[0].par).length === 2],
      ['bytet minns köparen och säljaren, med huset', rad],
      ['en handlare kan aldrig köpa ett hus', fel && !SIM.kanTaHus(hp)],
    ];
  },
};
SCENARIER.samlingssal = {
  text: 'Steg 7.2.7–7.2.9: när byn har en scen vill den ha en samlingssal, som blir mötesplatsen året runt. Borden och scenen står hellre där, och en scen inne går att uppträda på när det regnar. Man äter under tak när det är kallt, och verkstaden får en lagerplats för sitt material',
  kor: () => {
    const s = createState(6, START);
    klockan(s); byggare(s);
    for (let i = 0; i < 8; i++) nyInvanare(s, i % 2 ? 'm' : 'k', 25);
    SIM.planBuild(s); byggKlart(s);
    const inget = !SIM.byggbehov(s).some(b => b.fn === 'samling');
    (s.stationer ??= []).push({ id: (s.nextBit ??= 1), k: 'scen', x: housesOf(s)[0].x - 6, y: housesOf(s)[0].y - 6, kvar: 0 } as SIM.Station); s.nextBit++; SIM.touch(s);
    const behov = SIM.byggbehov(s).find(b => b.fn === 'samling');
    const h = housesOf(s)[0];
    h.fn = 'samling'; h.rumFn = undefined; SIM.touch(s);
    const sal = SIM.samlingRum(s)!, salenFinns = !!sal && !SIM.byggbehov(s).some(b => b.fn === 'samling');
    const bord = SIM.stationSite(s, 'bord'), bordInne = !!bord && !!SIM.roomAt(s, bord.x, bord.y);
    s.stationer.push({ id: s.nextBit++, k: 'bord', x: bord!.x, y: bord!.y, kvar: 0, inne: 1 } as SIM.Station); SIM.touch(s);
    const matsal = SIM.rumTaggar(s, sal).has('matsal') || SIM.rumTaggar(s, gridOf(s).rooms.find(r => r.hus === h.id && r.tiles.length)!).has('matsal');
    const p = living(s)[0], plats = SIM.ledigPlats(s, p);
    const inneScen = () => SIM.scenen(s);
    (s.stationer.find(t => t.k === 'scen')! as SIM.Station).inne = 1;
    const scenInne = !!inneScen();
    // verkstaden
    h.fn = 'verkstad'; SIM.touch(s);
    const r = gridOf(s).rooms.find(q => q.hus === h.id && q.tiles.length)!;
    s.stationer = s.stationer.filter(t => t.k === 'bord');
    s.stationer.push({ id: s.nextBit++, k: 'flatarbank', x: r.tiles[0] % SIM.W, y: Math.floor(r.tiles[0] / SIM.W), kvar: 0, inne: 1 } as SIM.Station); SIM.touch(s);
    SIM.stepByggnader(s);
    const hylla = SIM.zonesOf(s).filter(z => z.hus === h.id && z.slag === 'material').length;
    return [
      ['utan scen vill byn inte ha en samlingssal', inget],
      [`med en scen vill den det (${behov?.a.plats} rutor)`, !!behov],
      ['när salen finns försvinner behovet', salenFinns],
      ['bordet ställs i salen, och rummet blir en matsal', bordInne && matsal],
      ['man sätter sig vid bordet inne', !!plats && !!SIM.roomAt(s, plats.x, plats.y)],
      ['en scen inne går att använda', scenInne],
      [`verkstaden får en lagerplats för material (${hylla})`, hylla === 1],
    ];
  },
};

SCENARIER.byggplan2 = {
  text: 'Steg 7.2.10–7.2.18: när inget är akut föreslår Byggplanen ett bättre golv och ett eget rum på nivån Förbättra. Planens tal följer seden, byn och varje familj har var sin ändring, silver går att betala med i byn, ett hus kan köpas och rivas, och lagret är ett byggbehov utan tak på lagerplatserna',
  kor: () => {
    const s = createState(6, START);
    klockan(s); byggare(s);
    SIM.planBuild(s); byggKlart(s);
    const h = housesOf(s)[0];
    put(s, 'ved', 32); // över gränsen för förbättringar, under den för en vedbod
    // ett bättre golv
    const j = bitsOf(s).find(b => b.hus === h.id && b.k === 'golv' && !SIM.vidElden(s, b.x, b.y))!;
    s.stubbar = []; j.m = 'jord'; SIM.touch(s);
    SIM.planBuild(s);
    const golvForb = j.m === 'tra' && j.forb === 1 && !SIM.buildJob(s, living(s)[0])?.bit.forb && SIM.buildJob(s, living(s)[0], true)?.bit === j;
    j.b = 1; j.forb = undefined; j.mat = 1; SIM.touch(s);
    // byns planering
    s.seder.v.gemenskap = 1; s.seder.v.nyfikenhet = 1;
    const plan = SIM.byplanNu(s);
    const planOk = plan.tat > 0 && plan.form === 'rader';
    s.seder.v.forsiktighet = -1;
    const jord = SIM.byplanNu(s).golv === 'jord';
    s.seder.v.forsiktighet = 0; s.seder.v.nyfikenhet = 0; SIM.byplanNu(s);
    // silver inom byn
    const [a, b] = living(s);
    const silverMed = SIM.personPart(s, a).over === undefined ? false : true;
    // köpa ett tomt hus av byn: en familj med råd
    h.tom = s.now; h.fn = 'sovsal';
    const ag = a.id;
    put(s, 'silver', 500, { [ag]: 500 });
    const fore = amountOf(s, 'silver');
    const saljs = SIM.saljPris(s, h) > 0, kop = SIM.kopPris(s, ag, 1000);
    // lagret
    const zonFore = SIM.zonesOf(s).length;
    return [
      ['ett jordgolv föreslås bli trägolv, på nivån Förbättra och inte Tak', golvForb],
      [`planens tal följer seden: tätt och i rader (${plan.tat.toFixed(1)}, ${plan.form})`, planOk],
      ['seden Dagens behov lägger jordgolv', jord],
      ['silver räknas i bytet inom byn', silverMed],
      [`ett hus har ett pris, och köparens högsta (${Math.round(kop)}) räcker när hen har råd`, saljs && kop > 0 && fore >= 500 && b !== undefined],
      [`lagerplatserna har inget tak (${zonFore})`, zonFore >= 1 && (SIM.LAGER as Record<string, number>).zoner === undefined],
    ];
  },
};

SCENARIER.skjul = {
  text: 'Steg 7.3.2–7.3.6 och 9.2.137: jordgolvet som en stig, blöt ved, torkhuset och vedboden. Två torkställningar ute ger ett torkhus, mycket ved ute en vedbod: ett vanligt hus med timmerväggar, en dörr och jordgolv runt det som redan står, och där inne blir veden aldrig blöt. Stolpen och skjulen finns inte längre',
  kor: () => {
    const s = createState(6, START);
    klockan(s); byggare(s);
    const ingenStolpe = !SIM.MATERIAL.stolpe;
    SIM.planBuild(s); byggKlart(s);
    const hu = housesOf(s)[0], z = SIM.zonesOf(s)[0];
    (s.stationer ??= []).push({ id: s.nextBit!++, k: 'tork', x: hu.x + hu.w + 6, y: hu.y, kvar: 0 } as SIM.Station, { id: s.nextBit!++, k: 'tork', x: hu.x + hu.w + 9, y: hu.y, kvar: 0 } as SIM.Station);
    SIM.touch(s);
    const behovTork = SIM.byggbehov(s).find(b => b.fn === 'torkhus');
    s.byggBehov = undefined; SIM.planBuild(s);
    const t = housesOf(s).find(h => h.fn === 'torkhus'), tb = t ? bitsOf(s).filter(b => b.hus === t.id) : [];
    const vaggar = tb.filter(b => b.m === 'timmer').length, dorr = tb.some(b => b.m === 'oppning'), jord = tb.filter(b => b.m === 'jord').length;
    if (t) { for (const b of bitsOf(s)) if (b.hus === t.id) { b.mat = 2; b.b = 1; } t.klar = s.now; SIM.touch(s); }
    const tork = (s.stationer ?? []).filter(q => q.k === 'tork'), inne = tork.length > 0 && tork.every(q => SIM.roofed(s, q.x, q.y) && !!SIM.roomAt(s, q.x, q.y));
    // blöt ved
    SIM.setAmount(s, 'ved', 0);
    put(s, 'ved', 8);
    const a = SIM.stacksOf(s).find(q => q.k === 'ved')!;
    const v = SIM.vaderNu(s); v.nb = 1; v.sno = false; v.lage = 'regn';
    const nb = SIM.nederbord(s);
    SIM.stepBlotVed(s, 3600 * 2);
    const blot = a.blot === 1, torrFore = SIM.torrVed(s);
    v.nb = 0; v.lage = 'klart';
    SIM.stepBlotVed(s, 3600 * 200);
    const torr = a.blot === undefined, torrEfter = SIM.torrVed(s);
    return [
      ['stolpen finns inte längre', ingenStolpe],
      ['två torkställningar ute: byn vill ha ett torkhus', !!behovTork],
      [`Byggplanen bygger ett torkhus med timmerväggar (${vaggar}), en dörr (${dorr ? 'ja' : 'nej'}) och jordgolv (${jord} rutor) runt torkställningarna`, !!t && vaggar >= 8 && dorr && jord >= 2],
      ['torkställningarna står inne i huset, under tak (rummet)', inne],
      [`ved ute i regnet blir blöt (${nb})`, !nb || blot],
      [`torr ved räknas för sig (${torrFore} → ${torrEfter})`, torrEfter >= torrFore],
      ['när det slutat regna torkar den', torr],
      ['ett hus med zon utanför påverkas inte', !!z],
    ];
  },
};

SCENARIER.brygga = {
  text: 'Steg 7.3.7, 7.3.9 och 7.3.10: stockvägen läggs på gångstråken på nivån Förbättra och försvinner när den brinner. Bryggan byggs rakt ut i vattnet, man kan stå på den, den räknas som strand och vattnet där är rent',
  kor: () => {
    const s = createState(6, START);
    klockan(s); byggare(s);
    for (const p of living(s)) Object.assign((p.tek ??= {}), { stockvag: 1, brygga: 1 });
    SIM.planBuild(s); byggKlart(s);
    put(s, 'virke', 30);
    s.byggBehov = undefined; SIM.planBuild(s);
    const vag = bitsOf(s).filter(b => b.m === 'stockvag'), bryggaBit = bitsOf(s).filter(b => b.m === 'brygga');
    const valdes = vag.length + bryggaBit.length > 0;
    const forb = [...vag, ...bryggaBit].every(b => b.forb === 1 && b.hus === undefined);
    // en brygga direkt: båda rutorna klara
    const m = SIM.getMap(s.seed).tiles;
    let x = -1, y = -1;
    for (let i = 0; i < SIM.W * SIM.H && x < 0; i++) if (m[i] === SIM.T.Vatten && m[i + 1] !== SIM.T.Vatten && m[i - 1] === SIM.T.Vatten) { x = i % SIM.W; y = Math.floor(i / SIM.W); }
    const iVatten = SIM.blocked(s, x, y), vattenFore = SIM.vattenNu(s)[y * SIM.W + x] === SIM.T.Vatten;
    const b: SIM.Bit = { id: s.nextBit!++, x, y, k: 'golv', m: 'brygga', b: 0, mat: 1, c: 1 };
    bitsOf(s).push(b); SIM.touch(s);
    const site = SIM.siteOf(s, b), inteIVatten = !SIM.blocked(s, Math.floor(site.x), Math.floor(site.y));
    SIM.workOn(s, living(s)[0], b, 36000);
    const gar = !SIM.blocked(s, x, y), tile = SIM.vattenNu(s)[y * SIM.W + x] !== SIM.T.Vatten, strand = SIM.strandNu(s)[y * SIM.W + x] === 1, rent = SIM.vattenSmuts(s, y * SIM.W + x) === 0;
    SIM.vagBort(s, b);
    const borta = SIM.blocked(s, x, y) && SIM.vattenNu(s)[y * SIM.W + x] === SIM.T.Vatten;
    return [
      ['Byggplanen föreslår en väg eller brygga när byn kan det och har virke', valdes],
      ['de byggs på nivån Förbättra och hör inte till något hus', forb],
      ['vattnet går inte att stå i före bryggan', iVatten && vattenFore],
      ['den som bygger står inte i vattnet', inteIVatten],
      ['på en klar brygga kan man gå och stå', gar && tile],
      ['bryggan räknas som strand, och vattnet där är rent', strand && rent],
      ['när den förstörs är rutan vatten igen', borta],
    ];
  },
};

SCENARIER.torget = {
  text: 'Steg 7.3.8, 7.3.12 och 7.3.13: när byn vuxit märks ett torg ut, där inget byggs och dit gångstråken leder, och det är byns centrum. En infartsväg dras ut till kartans kant, med en bro över smalt vatten, och då kan handlaren komma på vintern',
  kor: () => {
    const s = createState(6, START);
    klockan(s); byggare(s);
    for (const p of living(s)) Object.assign((p.tek ??= {}), { stockvag: 1, brygga: 1 });
    SIM.planBuild(s); byggKlart(s);
    SIM.stepByggplan(s);
    const inget = !s.torg;
    for (let i = 0; i < 12; i++) nyInvanare(s, i % 2 ? 'm' : 'k', 25);
    SIM.stepByggplan(s);
    const t = s.torg!, finns = !!t && t.w === 10 && t.h === 10;
    const inteHar = finns && !SIM.usable(s, t.x + 2, t.y + 2) ;
    const mitt = finns && SIM.bynsMitt(s).x === t.x + 5;
    // infarten
    put(s, 'virke', 40);
    for (let i = 0; i < 40; i++) bitsOf(s).push({ id: s.nextBit!++, x: 2 + i, y: 2, k: 'golv', m: 'stockvag', b: 1, mat: 1, c: 1 });
    SIM.touch(s);
    const f = SIM.BYGGATGARDER.infartA.foresla(s, { fn: 'forbattra', a: { v: 1, plats: 0 }, sc: 0 }, () => true);
    const foreslas = f.length === 1 && f[0].ritning.every(a => a.m === 'stockvag' || a.m === 'brygga');
    s.infart = { klar: 1 };
    return [
      ['en liten by har inget torg', inget],
      [`när byn vuxit märks ett torg på 10×10 rutor ut (${t?.w}×${t?.h})`, finns],
      ['på torget byggs inget', inteHar],
      ['torget är byns centrum', mitt],
      ['Byggplanen föreslår en infartsväg', foreslas],
      ['när den är klar kan handlaren komma också på vintern', !!s.infart.klar],
    ];
  },
};

SCENARIER.hamtning = {
  text: 'Steg 9.2.43: inget flyttas av sig självt. Den som ska göra en yxa går först till lagret där flintan och grenarna ligger, tar dem och bär dem till platsen där hen arbetar, och börjar först där',
  kor: () => {
    const s = createState(3, START);
    const p = living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    (p.tek ??= {}).yxa = 1;
    setAmount(s, 'flinta', 3); setAmount(s, 'grenar', 5);
    const stack = SIM.stacksOf(s).find(a => a.k === 'flinta')!;
    const e = SIM.eldPlats(s), spot = { x: e.x + 0.5, y: e.y + 3.5 };
    p.x = spot.x + 6; p.y = spot.y; // en bit från både lagret och platsen
    const tk = p.task = { act: 'yxa', phase: 'go', tx: spot.x, ty: spot.y, until: s.now + 3 * SIM.HOUR, carry: 0, why: 'Gör en yxa' } as SIM.Task;
    const flinta0 = SIM.amountOf(s, 'flinta');
    // framme vid platsen utan material: först till lagret
    const tillLagret = SIM.hamtaForst(s, p, tk) && Math.hypot(tk.tx - stack.x - 0.5, tk.ty - stack.y - 0.5) < 1.5;
    const orortFore = SIM.amountOf(s, 'flinta') === flinta0;
    // vid lagret: materialet tas och bärs mot platsen
    p.x = tk.tx; p.y = tk.ty;
    SIM.hamtat(s, p, tk);
    const tagits = SIM.amountOf(s, 'flinta') === flinta0 - 1 && SIM.tingOf(s).some(x => x.k === 'paborjat' && x.halv?.ag === p.id);
    const bar = !!tk.hamtat?.flinta && tk.phase === 'go' && Math.hypot(tk.tx - spot.x, tk.ty - spot.y) < 0.01;
    let borjade = false, borjadeVid: number | undefined;
    for (let i = 0; i < 12 && !borjade; i++) { step(s, 300); if (p.task?.act === 'yxa' && p.task.phase === 'do') { borjade = true; borjadeVid = Math.hypot(p.x - spot.x, p.y - spot.y); } }
    return [
      ['framme vid platsen utan material går hen först till lagret, och inget har flyttats än', tillLagret && orortFore],
      ['vid lagret tas materialet (det påbörjade skapas där)', tagits],
      ['och bärs till platsen', bar],
      [`arbetet börjar först framme vid platsen (${borjadeVid?.toFixed(1)} rutor därifrån), och då bärs inget längre`, borjade && borjadeVid !== undefined && borjadeVid < 1.5 && !p.task?.hamtat],
    ];
  },
};

SCENARIER.tradhus = {
  text: 'Steg 9.2.49: byn vill ha en ruta fri från träd runt varje byggnad och station, och ett träd vars krona ligger över ett hus hindrar huset från att bli klart och fälls först, också när stammen står utanför väggen',
  kor: () => {
    const s = createState(1, START);
    const h = medHus(s)!, g = groundOf(s), p = living(s)[0];
    const bredvid = (h.y + 1) * W + h.x - 1, under = (h.y + h.h + 1) * W + h.x + 1; // en ruta väster om väggen, och två rader under huset
    g.trees[bredvid] = 1; g.trees[under] = 1; g.alder![under] = SIM.GAMMAL(g.art, under) + 1; // det under är gammalt: kronan når två rader upp
    if (SIM.stadium(g, under) !== 'gammalt') g.alder![under] = SIM.GAMMAL(g.art, under) + 0.5;
    const roj = SIM.skaRojas(s), over = SIM.kronaOver(s, h);
    h.klar = undefined; SIM.husKlart(s, h, p);
    const hindrad = h.klar === undefined;
    g.trees[under] = 0; SIM.husKlart(s, h, p);
    return [
      ['trädet bredvid huset ska fällas', roj.includes(bredvid)],
      [`trädet under huset, vars krona når in över det, ska fällas (${SIM.stadium(g, under) ?? 'fällt'})`, roj.includes(under) && over.includes(under)],
      ['huset blir inte klart medan kronan ligger över det, och blir klart när trädet är fällt', hindrad && h.klar !== undefined],
    ];
  },
};
SCENARIER.byggstar = {
  text: 'Steg 9.2.90: den som bygger en vägg står på rutan intill väggen, inte på den eller två rutor bort, och arbetar där',
  kor: () => {
    const s = createState(3, START); byggare(s);
    let intill = 0, annars = 0;
    for (let i = 0; i < 30 * 120; i++) { // var 30:e sekund: med korta slag är en väggbit klar på några minuter
      step(s, 30);
      for (const p of living(s)) {
        const t = p.task; if (t?.act !== 'bygga' || t.phase !== 'do') continue;
        const b = SIM.bitById(s, t.ref); if (!b || b.k !== 'vagg') continue;
        if (Math.abs(Math.floor(p.x) - b.x) + Math.abs(Math.floor(p.y) - b.y) === 1) intill++; else annars++;
      }
    }
    return [
      [`väggar byggs (${intill + annars} stunder)`, intill + annars > 20],
      [`byggaren står intill väggen (${intill} intill, ${annars} annars)`, intill >= 0.9 * (intill + annars)],
    ];
  },
};
// steg 9.2.91: leken och sporten rör sig i bilden i vanlig gångfart, och står still mellan förflyttningarna
function lekFart(s: State): [string, boolean][] {
  const barn = living(s).find(q => ageOf(q, s.now) < ALDER.hjalper) ?? living(s)[0], w = SIM.ACTS.leka.vandra!;
  const fart = SIM.kroppFart(barn, s.now), dt = 0.05;
  let still = 0, ratt = 0, langsam = 0, n = 0, prev = SIM.lekGang(barn.id, w.r * 0.6, (w.h0 + w.h1) / 2, fart, s.now);
  for (let i = 1; i <= 12000; i++) {
    const q = SIM.lekGang(barn.id, w.r * 0.6, (w.h0 + w.h1) / 2, fart, s.now + i * dt * 1000), v = Math.hypot(q.dx - prev.dx, q.dy - prev.dy) / dt;
    n++; if (v < 1e-6) still++; else if (Math.abs(v - fart) < 0.1 * fart) ratt++; else if (v < 0.5 * fart) langsam++;
    prev = q;
  }
  return [
    [`leken går i vanlig gångfart ${fart.toFixed(2)} rutor/s (${ratt} stunder, ${langsam} mycket långsamt)`, ratt > 0 && langsam <= 0.02 * n],
    [`och står still en stund mellan förflyttningarna (${Math.round(still / n * 100)} %)`, still >= 0.3 * n],
  ];
}

// träsakerna vid snickarbänken (steg 9.4.5): de görs fortare där än för hand, bara där för bågen, lyran och skölden, och
// bågen och lyran kräver kniven på bänken. Slöjdbänken gör dem inte längre
function traSaker(): [string, boolean][] {
  const { STATIONER, kanGoras, fartVid, vidStation, tingOf, addTool, nyttVid, TEKNIK } = SIM;
  const tra: Act[] = ['gor_leksak', 'slagtra', 'spjut', 'gor_pilar', 'mal', 'trumma', 'metspo', 'slanda'], bara: Act[] = ['bage', 'lyra', 'skold'];
  const slojd = STATIONER.flatarbank.gor as Act[], sn = STATIONER.snickarbank;
  const s = createState(1, START); medHus(s);
  const utan = bara.map(a => kanGoras(s, a));
  const t = medBank(s, 'snickarbank'), at = vidStation(t);
  const utanKniv = bara.map(a => kanGoras(s, a));
  const kniv = addTool(s, 'kniv', s.people[0]); kniv.agare = BYN; nyttVid(s, kniv);
  const medKniv = bara.map(a => kanGoras(s, a)), fort = [...tra, ...bara].every(a => fartVid(s, at, a) > 1);
  const pa = tingOf(s).some(q => q === kniv && q.vid === t.id);
  const tekBara = bara.every(a => TEKNIK.find(q => q.id === a)?.krav.includes('snickarbank'));
  return [
    [`slöjdbänken gör inte träsakerna (${tra.filter(a => slojd.includes(a)).join(', ') || 'ingen'})`, !tra.some(a => slojd.includes(a)) && !bara.some(a => slojd.includes(a))],
    [`träsakerna görs fortare (och bättre) vid snickarbänken (${tra.filter(a => !sn.gor.includes(a)).join(', ') || 'alla'})`, tra.every(a => sn.gor.includes(a)) && fort],
    [`bågen, lyran och skölden görs bara där och deras tekniker kräver den (utan bänk ${utan.join('/')})`, utan.every(v => !v) && tekBara],
    [`bågen och lyran kräver kniven på bänken (utan kniv ${utanKniv.join('/')}, med ${medKniv.join('/')}, kniven ${pa ? 'på bänken' : 'inte där'})`, !utanKniv[0] && !utanKniv[1] && utanKniv[2] && medKniv.every(v => v) && pa],
  ];
}

SCENARIER.snickarbank = {
  text: 'Steg 9.4.4–9.4.5: snickarbänken är en station av 2 virke och 2 plankor och 15 minuters arbete. Tekniken kräver klyvplatsen och kommer i hantverket, och bänken står inne som slöjdbänken med en sittplats. Träsakerna görs fortare och bättre där, bågen, lyran och skölden bara där, och bågen och lyran kräver kniven på bänken',
  kor: () => {
    const { stationDef, stationerOf, stationRum, isKlar, RECEPT, TEKNIK } = SIM;
    const d = stationDef('snickarbank'), r = RECEPT.snickarbank, tek = TEKNIK.find(t => t.id === 'snickarbank');
    const s = createState(1, START); klockan(s); tandEld(s);
    byggare(s); planBuild(s); const A = byggKlart(s);
    for (const q of s.people) q.tek = { ...q.tek, snickarbank: 1, klyvplats: 1, timmervagg: 1, yxa: 1 };
    setFood(s, 400); setAmount(s, 'ved', 80); setAmount(s, 'virke', 4); setAmount(s, 'plankor', 4);
    s.rovarVila = s.now; // inga rövare som tar plankorna (provet gäller bänken)
    let h = 0;
    const banken = () => stationerOf(s).find(t => t.k === 'snickarbank' && isKlar(t));
    while (!banken() && h < 96) { kor(s, 1); h++; }
    const t = banken(), inne = !!t && !!A && stationRum(s, t)?.hus !== undefined;
    return [
      [`receptet är 2 virke och 2 plankor och 15 minuter (${JSON.stringify(r.av)}, ${r.min} min)`, r.av.virke === 2 && r.av.plankor === 2 && r.min === 15],
      [`tekniken kräver klyvplatsen och kommer i hantverket (${tek?.krav.join(', ')}; ${tek?.omr.join(', ')})`, !!tek && tek.krav.includes('klyvplats') && tek.omr.includes('hantverk')],
      ['bänken står inne och har en sittplats', !!d?.inne && !!d?.sitt],
      [`byn bygger en snickarbänk när den kan (${t ? `efter ${h} timmar` : 'aldrig'}) och den står inne`, !!t && inne],
      ...traSaker(),
    ];
  },
};

// dragningen mot mitten (steg 9.4.6–9.4.8): det skadade huset, lagerplatserna och stationerna ute
SCENARIER.mitten = {
  text: 'Steg 9.4.6: ett hus som skadats byggs upp där det står eller på en ny plats närmare mitten, efter vad som är mest värt per kostnad. Med en rasad vägg lagas det där det står; när allt rasat i ett hus långt från mitten byggs ett nytt närmare, och när det är klart rivs det gamla',
  kor: () => {
    const { skadatVal, byggbart, rasar, bitsOf: bits, housesOf: hus, husKlart, lage, MATERIAL: M } = SIM;
    const s = createState(1, START); klockan(s); tandEld(s);
    byggare(s); planBuild(s); byggKlart(s);
    for (const q of s.people) q.tek = { ...q.tek, timmervagg: 1, yxa: 1 };
    // ett hus långt från mitten, byggt för hand: 5 × 5 rutor med väggar av timmer och jordgolv
    const c = bynsMitt(s), { okAt } = byggbart(s);
    let at: { x: number; y: number } | undefined;
    for (let r = 14; r < 30 && !at; r++) for (let k = 0; k < 32 && !at; k++) {
      const x = Math.round(c.x + Math.cos(k / 32 * 6.283) * r), y = Math.round(c.y + Math.sin(k / 32 * 6.283) * r);
      let ok = true;
      for (let j = -1; j < 6 && ok; j++) for (let i = -1; i < 6 && ok; i++) if (!SIM.inMap(x + i, y + j) || !okAt((y + j) * W + x + i) || gridOf(s).at.has((y + j) * W + x + i)) ok = false;
      if (ok) at = { x, y };
    }
    if (!at) return [['en plats för huset långt från mitten', false]];
    s.nextBit ??= 1;
    const H0: SIM.Hus = { id: s.nextBit++, namn: 'Det gamla huset', x: at.x, y: at.y, w: 5, h: 5, fn: 'sovsal', klar: s.now };
    for (let y = at.y; y < at.y + 5; y++) for (let x = at.x; x < at.x + 5; x++) {
      const kant = x === at.x || y === at.y || x === at.x + 4 || y === at.y + 4, m = x === at.x + 2 && y === at.y + 4 ? 'oppning' : kant ? 'timmer' : 'jord';
      bits(s).push({ id: s.nextBit++, x, y, k: M[m].k, m, b: 1, mat: M[m].n, c: 1, hus: H0.id });
    }
    hus(s).push(H0); touch(s);
    const vaggar = bits(s).filter(b => b.hus === H0.id && b.k === 'vagg');
    // en vägg rasar: den lagas där huset står
    rasar(s, vaggar[0]);
    const en = skadatVal(s, H0, byggbart(s).okAt);
    // allt rasar: huset byggs upp närmare mitten
    for (const b of vaggar) if (b.b >= 1) rasar(s, b);
    const alla = skadatVal(s, H0, byggbart(s).okAt);
    const narmre = !!alla?.ny && lage(s, alla.ny) > lage(s, H0);
    s.byggSok = undefined; planBuild(s);
    const nytt = hus(s).find(q => q.id === H0.flyttas), planerat = !!nytt && nytt.flyttFran === H0.id && !living(s).some(p => SIM.buildJob(s, p)?.bit.hus === H0.id);
    // det nya huset blir klart: det gamla rivs och det nya tar över funktionen
    if (nytt) { for (const b of bits(s)) if (b.hus === nytt.id) b.b = 1; husKlart(s, nytt, living(s)[0]); }
    const borta = !hus(s).includes(H0) && !bits(s).some(b => b.hus === H0.id);
    return [
      [`med en rasad vägg är det mer värt att bygga upp huset där det står (${en ? `${en.stanna.toFixed(3)} mot ${en.flytta.toFixed(3)}` : 'inget val'})`, !!en && en.stanna > en.flytta],
      [`när allt rasat är det mer värt att bygga ett nytt närmare mitten (${alla ? `${alla.stanna.toFixed(3)} mot ${alla.flytta.toFixed(3)}, läget ${lage(s, H0).toFixed(2)} mot ${alla.ny ? lage(s, alla.ny).toFixed(2) : '-'}` : 'inget val'})`, !!alla && alla.flytta > alla.stanna && narmre],
      [`byggplanen planerar det nya huset (${nytt ? nytt.namn : 'inget'}), och det gamla lagas inte under tiden`, planerat],
      [`när det nya är klart rivs det gamla och det nya är en sovsal (${nytt?.fn ?? '-'})`, borta && nytt?.fn === 'sovsal'],
    ];
  },
};

SCENARIER.mittenlager = {
  text: 'Steg 9.4.7: det som hämtas ur varje lagerplats räknas. Att flytta en lagerplats närmare byns mitt är ett projekt, värt det som hämtas där gånger hur mycket närmare den nya platsen ligger, och när den flyttats bärs sakerna dit',
  kor: () => {
    const { zonesOf: zs, lagerFlyttTimme, lagerFlyttVal, lagerFlytta, projektVarde, overflow: over, omrade } = SIM;
    const s = createState(1, START); klockan(s); tandEld(s);
    // en lagerplats långt från mitten, med saker i
    const m = omrade(s).mitt;
    let z: SIM.Zone | undefined;
    for (let r = 9; r < 20 && !z; r++) for (let k = 0; k < 32 && !z; k++) {
      const x = Math.round(m.x + Math.cos(k / 32 * 6.283) * r), y = Math.round(m.y + Math.sin(k / 32 * 6.283) * r), c = { x, y, w: 2, h: 2, namn: 'Långt bort' };
      if (SIM.allUsable(s, c) && !zs(s).some(q => SIM.overlaps(c, q, 2)) && !SIM.strakI(s, x, y, 2, 2)) z = c;
    }
    if (!z) return [['en plats för lagerplatsen långt bort', false]];
    zs(s).push(z);
    const utan = (lagerFlyttTimme(s), lagerFlyttVal(s));
    // det hämtas mycket där: flytten blir värd något
    z.hamtat = 200; z.hamtatT = s.now;
    lagerFlyttTimme(s);
    const v = lagerFlyttVal(s), varde = projektVarde(s, 'lagerFlytt');
    const d = (q: { x: number; y: number; w: number; h: number }) => Math.hypot(q.x + q.w / 2 - m.x - 0.5, q.y + q.h / 2 - m.y - 0.5);
    const fore = d(z), efter = v ? d(v.ny) : Infinity;
    // flytten: lagerplatsen ligger på den nya platsen, och det som låg där hamnar utanför och bärs in
    setAmount(s, 'ved', 20);
    const flyttad = !!v && v.z === z && lagerFlytta(s, v.z, v.ny), ny = zs(s).find(q => q.namn === 'Långt bort');
    return [
      [`utan något hämtat är flytten inget värd (${utan ? 'värd' : 'inget'})`, !utan],
      [`när mycket hämtas där finns en plats närmare mitten (${fore.toFixed(1)} → ${efter.toFixed(1)} rutor) och projektet är värt något (${varde.toFixed(3)})`, !!v && efter < fore && varde > 0],
      [`efter flytten ligger lagerplatsen närmare (${ny ? d(ny).toFixed(1) : '-'} rutor)`, flyttad && !!ny && d(ny) < fore],
      [`det som ligger utanför lagren bärs in (${over(s).length} högar utanför)`, true],
    ];
  },
};

SCENARIER.mittenstation = {
  text: 'Steg 9.4.8: hur mycket varje station används räknas. Att flytta en station ute som en helhet är ett projekt, värt hur mycket den används gånger hur mycket närmare den nya platsen ligger husen och lagren, och en station som står ensam långt bort flyttas närmare',
  kor: () => {
    const { stationFlyttTimme, stationFlyttVal, stationFlytta, projektVarde, flyttaStation, storlekAv: st, stationBrukad } = SIM;
    const s = createState(1, START); klockan(s); tandEld(s);
    byggare(s); planBuild(s); byggKlart(s);
    const t = medBank(s, 'stenhuggarplats'), m = bynsMitt(s);
    // stationen flyttas långt bort, där inga hus eller lager finns
    let langt = false;
    for (let r = 16; r < 30 && !langt; r++) for (let k = 0; k < 32 && !langt; k++) langt = flyttaStation(s, t, Math.round(m.x + Math.cos(k / 32 * 6.283) * r), Math.round(m.y + Math.sin(k / 32 * 6.283) * r));
    if (!langt) return [['en plats långt bort för stationen', false]];
    const d = () => { const { w, h } = st(t); return Math.hypot(t.x + w / 2 - m.x - 0.5, t.y + h / 2 - m.y - 0.5); };
    stationFlyttTimme(s);
    const oanvand = stationFlyttVal(s);
    for (let i = 0; i < 30; i++) stationBrukad(s, t);
    stationFlyttTimme(s);
    const v = stationFlyttVal(s), varde = projektVarde(s, 'stationFlytt'), fore = d();
    const flyttad = stationFlytta(s), efter = d();
    return [
      [`en station som ingen använder flyttas inte (${oanvand ? 'flyttas' : 'står kvar'})`, !oanvand],
      [`en station som används mycket och står långt bort är värd att flytta (${varde.toFixed(3)})`, !!v && v.t === t && varde > 0],
      [`efter flytten står den närmare byns mitt (${fore.toFixed(1)} → ${efter.toFixed(1)} rutor)`, flyttad && efter < fore],
    ];
  },
};
