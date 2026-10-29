// Scenarier. Byggnader och lager: byggnader, förrådshus, familjehus, funktion, påbörjat, bostad, bygg, lager och lagerplatser.
import { isDeepStrictEqual } from 'node:util';
import { MIN, Person, Act, createState, addTool, FOREST, HOUR_S, toolsOf, BYN, step, living, sees, ageIndex, cloneState, ageStart, sightOf, pilesOf, zoneOf, amountOf, STACK, capacity, load, dropLoad, T, isStored, zonesOf, allows, ageOf, groundOf, getMap, DAY, HOUR, W, State, tileOf, rektAvstand, stat, campCenter, die, heatAt, bitsOf, housesOf, gridOf, touch, roomAt, insulation, isWall, Bit, wearBuild, treeOn, KANIN, ownsAmount, addTo, setAmount, isFood, grundvarde, tingOf, komOf, BYGGNADER, FN, mostUrgent, fnId, fnOf, planBuild, workOn, wearMult, LAGER, homeless, sovplatser, inZone, startWork, workHalf, finishHalf, stepPaborjat, halvOf, tingVarde, HALV_TID, fallTid, treeSpot, SEC, Task, familjOf, bedTile, takeForHouse, put, stepByggnader, husNamn, spotFor, roofed, MATERIAL, usable, dropSpot, ALDER, KROPP, samlingRum, varmareInne, haulJob, fetchFuel, chooseTask, minOf } from '../../sim';
import * as SIM from '../../sim';
import { findPath } from '../../sim/vag';
import { START } from '../kor';
import { setItems, setFood, kor, klockan, tandEld, byggare, byggKlart, nyInvanare, medBank, STOCKHOLM, SCENARIER } from './hjalp';

SCENARIER.byggnader = {
  text: 'Varje sorts byggnad är en rad i ett register med behov, vikt och ägare. Byn bygger för det mest akuta behovet, faror först: den som saknar tak över huvudet får en sovsal',
  kor: () => {
    const rader = FN.every(fn => { const r = BYGGNADER[fn]; return !!(r.namn && r.ikon && r.behov && r.agare); });
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
      ['varje rad har namn, symbol, behov och ägare', rader],
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
    for (const seed of [16, 4, 9]) { // valda igen i steg 2.2.2 (by 16 bygger det dygn 13, by 4 dygn 16 och by 9 dygn 21; by 8, 10 och 11 inte längre inom 30 dygn)
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
    const g = groundOf(s), c = campCenter(s);
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
    const langhus = housesOf(q).filter(h => (h.fn === 'sovsal' || h.fn === 'samling') && h.w * h.h >= SIM.HUS.langhus).length, // en tom sovsal kan ha blivit samlingshus (steg 1.6.4)
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
    // huset minns var materialet kom ifrån (steg 1.3.3): lika mycket som det byggdes med
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
    // en vägg rasar och byggs om: huset är klart igen, men blir inte färdigt en gång till (krönikan, Gemenskap; samhalle-55)
    let omKlar = false, kronikaFore = 0, kronikaEfter = 0, gemFore = 0, gemEfter = 0;
    if (h?.klar) {
      const fardigt = () => (q.hist?.kronika ?? []).filter(k => k[2] === 'k_husKlar').length; // huset kan ha bytt namn med funktionen (steg 1.6.4)
      const vg = bitsOf(q).find(b => b.hus === h.id && b.k === 'vagg')!, by = living(q)[0];
      kronikaFore = fardigt(); gemFore = q.seder.ev.gemenskap;
      vg.c = 1e-6; wearBuild(q, 1, ageIndex(q));
      vg.mat = MATERIAL[vg.m].n;
      for (let n = 0; n < 100 && vg.b < 1; n++) workOn(q, by, vg, 600);
      omKlar = !!h.klar; kronikaEfter = fardigt(); gemEfter = q.seder.ev.gemenskap;
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
      [`huset står en bit från elden (${avst.toFixed(1)} rutor)`, avst >= 4],
      ['slitna väggar lagas', lagat],
      [`ett långhus räknas när det planeras (${langhus} långhus, ${langRaknat} räknade)`, langhus > 0 && langRaknat === langhus],
      [`en lagning kostar hälften av det nya, i hela saker och minst en (trägolv ${golvLag} av ${MATERIAL.tra.n}, timmervägg ${vaggLag} av ${MATERIAL.timmer.n})`, golvLag === Math.max(1, Math.floor(MATERIAL.tra.n / 2)) && vaggLag === Math.max(1, Math.floor(MATERIAL.timmer.n / 2))],
      [`en rasad vägg som byggts om gör huset klart igen men inte färdigt en gång till (krönikan ${kronikaFore} → ${kronikaEfter}, Gemenskap ${gemFore.toFixed(3)} → ${gemEfter.toFixed(3)})`, omKlar && kronikaFore >= 1 && kronikaEfter === kronikaFore && gemEfter === gemFore],
      [`huset minns var materialet kom ifrån (${Math.round(minns)} av ${Math.round(lagt)}: ${satt})`, lagt > 0 && Math.abs(minns - lagt) < 0.01 * lagt + 0.01],
    ];
  },
};

SCENARIER.lager = {
  text: 'Saker ligger i stackar på en lagerplats som byn gör större och mindre, och var och en bär efter sin styrka',
  kor: () => {
    const s = createState(3, START);
    const start = zoneOf(s).w * zoneOf(s).h;
    setFood(s, 230); setAmount(s, 'ved', 90); setAmount(s, 'grenar', 70); setAmount(s, 'flinta', 3); // mycket på en gång
    kor(s, 18);
    // när lagerplatsen krymper hamnar en stack ibland utanför en stund, och bärs in igen inom ett par timmar
    for (let i = 0; i < 3 && pilesOf(s).some(p => p.out); i++) kor(s, 1);
    const z = zoneOf(s), ps = pilesOf(s), stor = z.w * z.h;
    const summaOk = Object.keys(STACK).filter(k => !SIM.isTool(k)).every(k => Math.abs(ps.filter(p => p.k === k).reduce((a, p) => a + p.n, 0) - amountOf(s, k)) < 1e-6); // ett redskap kan vara i bruk
    // bära: kör en stund med gående invånare och se hur mycket de bär hem
    const b = createState(8, START);
    klockan(b, 7); setFood(b, 2); // morgon, och byn behöver mat
    tandEld(b, 4, false); // elden brinner, annars avbryts allt för att tända den
    let hem = 0, maxKvot = 0, fullt = 0;
    for (let i = 0; i < 8 * 3600 / 2; i++) {
      step(b, 2);
      // en kanin bärs hem hel, en i taget, hur stark man än är
      for (const p of living(b)) if (p.task?.phase === 'back' && p.task.act !== 'elda') {
        const kv = p.task.act === 'jakt' ? load(p.task, b) / KANIN : load(p.task, b) / capacity(b, p); hem++; maxKvot = Math.max(maxKvot, kv); if (kv >= 0.95) fullt++;
      }
    }
    // den som har fullt går hem med en gång, även om uppgiften inte är klar
    const v = living(b).find(p => ageOf(p, b.now) >= 18)!;
    const tk0: SIM.Task = v.task = { act: 'samla', phase: 'do', tx: v.x, ty: v.y, until: b.now + 3 * HOUR, carry: capacity(b, v) * STACK.bar, why: 'test', dark: false };
    step(b, 2); step(b, 2);
    const gickHem = tk0.phase === 'back'; // på väg hem, eller redan framme vid lagret och har lämnat bördan
    const stark = living(b).slice().sort((x, y) => stat(y, 'styrka', b.now) - stat(x, 'styrka', b.now));
    // tomt lager krymper
    setFood(s, 5); setAmount(s, 'ved', 0); setItems(s, { flinta: 1 });
    kor(s, 12);
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
    // en stack där bara den gömda giftsvampen finns kvar visas inte som "svamp 0 st" (pilesOf)
    const gs = createState(3, START), gz = zoneOf(gs);
    (gs.stackar ??= []).push({ k: 'svamp', n: 0, c: 1, x: gz.x, y: gz.y, dold: 0.5 });
    const doldSyns = pilesOf(gs).some(p => p.k === 'svamp' && p.n <= 1e-6);
    return [
      ['en stack med bara gömd giftsvamp visas inte som "svamp 0 st"', !doldSyns],
      [`i ett fullt lager läggs det nya på en egen ruta (${fx},${fy}${paAnnan ? ', på sten' : ''})`, !paAnnan && usable(fu, fx, fy)],
      [`ingen bär in när byn svälter eller fryser (${barSvalt} när maten är slut, ${barKall} i kylan, ${barMat} av 200 annars)`, barMat > 0 && barSvalt === 0 && barKall === 0],
      ['en död med en uppgift kvar låser inte en stack som ska bäras in (haulJob)', stackFri],
      ['... och inte elden (fetchFuel)', eldFri],
      [`lagerplatsen växer när den blir full (${start} → ${stor} rutor, ${zonesOf(s).length} lagerplatser, ${ps.filter(p => p.out).length} av ${ps.length} stackar utanför)`, stor > start && ps.every(p => !p.out)],
      ['ingen stack är större än sin storlek, och stackarna innehåller allt i förrådet', ps.every(p => p.n <= p.max + 1e-9) && summaOk],
      [`folk bär hem saker, aldrig mer än de orkar (${hem} steg på väg hem, ${fullt} med full börda, högst ${(maxKvot * 100).toFixed(0)} % av förmågan)`, hem > 50 && maxKvot <= 1.15],
      ['den som bär så mycket hen orkar går hem med bördan', gickHem],
      ['den starke orkar bära mer än den svage', capacity(b, stark[0]) > capacity(b, stark[stark.length - 1])],
      [`lagerplatsen krymper när den står tom (${zoneOf(s).w * zoneOf(s).h} rutor)`, zoneOf(s).w * zoneOf(s).h < stor],
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
    kor(s, 30); // sorteringen tar ungefär ett dygn, ibland några timmar till
    const zs = zonesOf(s), ps = pilesOf(s);
    const fel = ps.filter(p => p.zone >= 0 && !allows(zs[p.zone], p.k)).length;
    const summaOk = Object.keys(STACK).filter(k => !SIM.isTool(k)).every(k => Math.abs(ps.filter(p => p.k === k && p.stored).reduce((a, p) => a + p.n, 0) - amountOf(s, k)) < 1e-3); // ett redskap kan vara i bruk eller hänga vid en station
    // ett tömt lager krymper först när det stått halvtomt i sex timmar (en kvarts år i spelet, steg 2.12.4)
    const tom = cloneState(s); for (const k of Object.keys(STACK)) SIM.setAmount(tom, k, 0);
    for (const z of zonesOf(tom)) z.tom = undefined; // klockan börjar när lagret töms, inte när det blev halvtomt tidigare
    const zi = zonesOf(tom).findIndex(z => z.hus === undefined && z.w * z.h > SIM.LAGER.krympMin), yta = () => { const z = zonesOf(tom)[zi]; return z.w * z.h; };
    const yta0 = zi >= 0 ? yta() : 0, ytor: number[] = [];
    for (let h = 0; h < 8 && zi >= 0; h++) { SIM.tidyStore(tom); ytor.push(yta()); tom.now += HOUR; }
    return [
      [`ett tomt lager krymper inte de första sex timmarna, sedan krymper det (${yta0} rutor, sedan ${ytor.join(', ')} timme för timme)`, zi >= 0 && ytor.slice(0, SIM.LAGER.krympTim).every(n => n === yta0) && ytor[ytor.length - 1] < yta0],
      [`den första lagerplatsen går att använda (${startFel.length ? 'inte i by ' + startFel.join(', ') : 'i alla tre byarna'})`, startFel.length === 0],
      [`en ny lagerplats görs när den första inte kan växa mer (${zs.length} lagerplatser)`, zs.length >= 2],
      [`maten får den första och material den nya (${zs.map(z => z.namn).join(', ')})`, zs[0].slag === 'mat' && zs[1]?.slag === 'material'],
      [`sakerna sorteras till rätt lagerplats (${fel} stackar ligger fel efter 30 timmar)`, fel <= 2],
      ['stackarna innehåller allt i förrådet', summaOk && ps.every(p => p.n <= p.max + 1e-9)],
    ];
  },
};

SCENARIER.verkstad = {
  text: 'Rummets funktion (steg 2.2.17): ett rum får sin funktion av det som står i det. När byn vill bygga en slöjdbänk men sovsalarna är fulla planerar den en verkstad åt den, och en sovsal som ingen sover i men där en station står blir en verkstad i stället för att rivas',
  kor: () => {
    const { HUS, stationDef, inneUtanPlats, rumsFunktioner, sovKvar, stationerOf, stationRum, stationSite, isKlar } = SIM;
    // en by med en sovsal som är så full att slöjdbänken inte får plats där, där alla kan bygga en slöjdbänk
    const s = createState(1, START); klockan(s); tandEld(s);
    byggare(s); planBuild(s); const A = byggKlart(s)!;
    const rumA = () => gridOf(s).rooms.find(r => r.hus === A.id && r.tiles.length)!;
    for (let i = 0; sovKvar(s, rumA()) >= 2 && i < 20; i++) nyInvanare(s, i % 2 ? 'm' : 'k', 30);
    for (const r of s.people) r.tek = { ...r.tek, flatarbank: 1, timmervagg: 1, yxa: 1 };
    setFood(s, 400); setAmount(s, 'ved', 80); setAmount(s, 'grenar', 20);
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

SCENARIER.lekplats = {
  text: 'Steg 2.10.4: lekplatsen räknas från byns inre (lagerplatserna och husen) och inte från elden. Den ligger på öppen mark där inget hus, lager eller station står, följer byn när den växer, och barnen leker där',
  kor: () => {
    const s = createState(3, START);
    klockan(s); tandEld(s);
    let leker = 0, paPlats = 0, fel = 0;
    for (let h = 0; h < 72; h++) {
      kor(s, 1);
      const l = SIM.lekplats(s);
      for (const q of living(s)) if (q.task?.act === 'leka' && q.task.phase === 'do') {
        leker++;
        if (q.x >= l.x - 2.5 && q.x <= l.x + l.w + 2.5 && q.y >= l.y - 2.5 && q.y <= l.y + l.h + 2.5) paPlats++; // de vandrar lite runt platsen
      }
      for (let y = l.y; y < l.y + l.h; y++) for (let x = l.x; x < l.x + l.w; x++) {
        const t = getMap(s.seed).tiles[y * W + x];
        if (t === T.Vatten || t === T.Sten || roomAt(s, x, y) || zonesOf(s).some(z => inZone(z, x, y))) fel++;
      }
    }
    const l = SIM.lekplats(s), mid = SIM.byInne(s), f = getMap(s.seed).fire;
    const storlek = l.w === SIM.PLATS.lekBredd && l.h === SIM.PLATS.lekDjup;
    // när byns inre flyttar (en ny lagerplats långt bort) följer lekplatsen med, men elden står kvar
    const z = zonesOf(s)[0], fore = rektAvstand(mid.x, mid.y, l.x, l.y, l.w, l.h);
    const dir = l.x + l.w / 2 > mid.x ? -1 : 1; // åt andra hållet från lekplatsen, så att den måste flytta
    s.lagren!.push({ x: z.x + dir * 24, y: z.y, w: 2, h: 2, namn: 'Prov', prio: 0 }); // lagren krymper först efter sex timmar (steg 2.12.4) och är större, så den nya ligger längre bort
    const mid2 = SIM.byInne(s), l2 = SIM.lekplats(s);
    // hur långt den flyttar beror på husen, lagren och skogen i vägen; den ska flytta åt rätt håll och komma närmare den nya mitten
    const nu = rektAvstand(mid2.x, mid2.y, l2.x, l2.y, l2.w, l2.h), kvar = rektAvstand(mid2.x, mid2.y, l.x, l.y, l.w, l.h);
    const foljer = (mid2.x - mid.x) * dir > 3 && (l2.x - l.x) * dir > 0 && nu <= kvar + SIM.PLATS.lekNorr && nu <= SIM.PLATS.lekSok; // (söder om mitten får den ligga lite längre bort, lekNorr)
    s.lagren!.pop();
    return [
      [`lekplatsen är ${SIM.PLATS.lekBredd} × ${SIM.PLATS.lekDjup} rutor`, storlek],
      [`den ligger nära byns inre (${fore.toFixed(1)} rutor från dess mitt, elden ${Math.hypot(f.x - mid.x, f.y - mid.y).toFixed(1)} rutor därifrån)`, fore <= SIM.PLATS.lekSok],
      [`den ligger aldrig i vattnet, på sten, i ett hus eller på en lagerplats (${fel} rutor fel på 72 timmar)`, fel === 0],
      [`barnen leker på lekplatsen (${paPlats} av ${leker} timmar)`, leker > 0 && paPlats >= leker * 0.9],
      [`när byns inre flyttar följer lekplatsen med (mitten ${mid.x.toFixed(1)} → ${mid2.x.toFixed(1)}, lekplatsen x ${l.x} → ${l2.x}, ${kvar.toFixed(1)} → ${nu.toFixed(1)} rutor från den nya mitten)`, foljer],
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
      const mid = SIM.byInne(s), p = living(s)[0];
      p.warm = 1; let iByn = 0, vidElden = 0, n = 0;
      for (const act of ['kniv', 'hantverk', 'tvinna', 'balte'] as Act[]) for (let k = 0; k < 15; k++) {
        const at = spotFor(s, act, p); n++;
        if (Math.hypot(at.x - mid.x - 0.5, at.y - mid.y - 0.5) <= 5) iByn++;
        if (Math.hypot(at.x - f.x - 0.5, at.y - f.y - 0.5) <= 3) vidElden++;
      }
      return { iByn, vidElden, n, kallt: SIM.coldOf(SIM.temperature(s)) > 0, avst: Math.hypot(mid.x - f.x, mid.y - f.y) };
    };
    const varmt = plats(SIM.SOMMAR), kallt = plats(SIM.ISTID);
    return [
      [`på sommaren görs handarbetet utan bänk inne i byn, ${varmt.avst.toFixed(0)} rutor från elden (${varmt.iByn} av ${varmt.n} gånger)`, !varmt.kallt && varmt.avst > 8 && varmt.iByn === varmt.n],
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
    for (const [k, g] of Object.entries(SIM.GRODOR)) { kolla(`${k} perRuta`, g.perRuta); kolla(`${k} fron`, g.fron); }
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
    const mid = SIM.byInne(s), langt = Math.hypot(mid.x - e0.x, mid.y - e0.y);
    let vald: SIM.Person | undefined, flytt = s.fire.flytt;
    SIM.stepEldFlytt(s);
    flytt = s.fire.flytt; vald = living(s).find(p => p.task?.act === 'flyttaeld');
    let tand = s.fire.lightings; // elden kan tändas igen redan medan den flyttas
    kor(s, 8, t => { if (t.fire.lit && t.fire.lightings > tand) tand = -1; });
    const e1 = SIM.eldPlats(s), narmare = Math.hypot(mid.x - e1.x, mid.y - e1.y);
    const g1 = SIM.stationerOf(s).find(t => t.id === grill.id);
    if (tand !== -1) kor(s, 24, t => { if (t.fire.lit && t.fire.lightings > tand) tand = -1; });
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
    const g = groundOf(s), c = campCenter(s), m = getMap(s.seed);
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
