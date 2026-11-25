// Scenarier för fas 14.
import * as SIM from '../../sim';
import { SCENARIER, testBy } from './hjalp';

SCENARIER.finhet = {
  text: 'Steg 14.1.1: varje rum har en finhet ur möblernas kvalitet, väggarna, golvet, ytan per person, pyntet, ljuset, värmen och smutsen',
  kor: () => {
    const s = SIM.cloneState(testBy(25)), rum = SIM.gridOf(s).rooms.filter(r => r.tiles.length && SIM.sovplatser(s, r) > 0);
    SIM.finhetTimme(s);
    const alla = rum.map(r => SIM.finhetAv(s, r)), r = rum[0];
    const tal = () => SIM.finhetDelar(s, r), del = (id: string) => tal().delar.find(d => d.id === id)!;
    const fore = tal().tal;
    // bättre möbler
    const i = new Set(r.tiles), mob = SIM.stationerOf(s).filter(t => i.has(t.y * SIM.W + t.x) && SIM.stationDef(t.k)?.mobel && !SIM.stationDef(t.k)?.pynt);
    for (const t of mob) t.q = 0;
    const usel = tal().tal; for (const t of mob) t.q = 5; const fin = tal().tal; for (const t of mob) t.q = 2;
    // smuts på golvet
    const ren = tal().tal;
    s.flackar = [...(s.flackar ?? []), ...r.tiles.slice(0, 4).map(j => ({ i: j, k: 'blod', n: 1, t: s.now }))];
    const smuts = del('smuts').v, smutsTal = tal().tal;
    s.flackar = [];
    // väggar av sten
    const g = SIM.gridOf(s), m0 = r.walls.map(w => g.at.get(w)!.m), vagg0 = del('vagg').v;
    for (const w of r.walls) if (g.at.get(w)!.k === 'vagg') g.at.get(w)!.m = 'sten';
    const vagg1 = del('vagg').v; r.walls.forEach((w, n) => { g.at.get(w)!.m = m0[n]; });
    return [
      [`alla rum har en finhet mellan 0 och 1 (${alla.map(x => x?.toFixed(2)).join(', ')})`, alla.length > 0 && alla.every(x => x !== undefined && x >= 0 && x <= 1)],
      [`bättre möbler gör rummet finare (${mob.length} möbler: ${usel.toFixed(2)} → ${fin.toFixed(2)})`, mob.length > 0 && fin > usel],
      [`smutsen drar ner (${smuts.toFixed(2)}: ${ren.toFixed(2)} → ${smutsTal.toFixed(2)})`, smuts > 0 && smutsTal < ren],
      [`stenväggar är finare än timmer (${vagg0.toFixed(2)} → ${vagg1.toFixed(2)})`, vagg1 > vagg0],
      [`finheten räknas i TAKTER och delarna väger mer än noll (${fore.toFixed(2)})`, SIM.TAKTER.some(t => t.namn === 'rummens finhet') && SIM.FINHET_DELAR.every(d => d.vikt() !== 0)],
    ];
  },
};

SCENARIER.stada = {
  text: 'Steg 14.1.2: den som bor i rummet städar det: rutan tar en halv minut, smutsen på den försvinner och hen går till nästa tills golvet är rent',
  kor: () => {
    const s = SIM.cloneState(testBy(25)), m = 60000;
    const rum = SIM.gridOf(s).rooms.filter(r => r.tiles.length && SIM.sovplatser(s, r) > 0);
    const bor = (r: typeof rum[number]) => SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen && SIM.sovrum(s, q) === r && !q.gast);
    const r = rum.find(x => bor(x))!, p = bor(r)!, annan = SIM.living(s).find(q => SIM.sovrum(s, q) !== r && SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen && !q.gast && !SIM.familjOf(s, SIM.husById(s, r.hus)?.ag).includes(q));
    s.flackar = []; s.blod = [];
    const rent = SIM.stadaVal(s, p), fri = r.tiles.slice(0, 4);
    s.flackar = fri.slice(0, 2).map(i => ({ k: 'toa', i, n: 1, t: s.now }));
    s.blod = fri.slice(2).map(i => ({ x: i % SIM.W + 0.5, y: Math.floor(i / SIM.W) + 0.5, f: 'pol' as never, m: 1, t: s.now }));
    const dirty = SIM.smutsRutor(s, r).size, del0 = SIM.finhetDelar(s, r).tal, d = SIM.stadaVal(s, p), a = annan && SIM.stadaVal(s, annan);
    const rn = d!.rum, egen = d!.sc;
    // hen städar: uppgiften sätts som valet gör, och byn går en stund
    const u = SIM.stadaUppgift(d!); p.toa = 1; p.hunger = 0;
    p.x = u.spot.x; p.y = u.spot.y;
    p.task = { act: 'stada', phase: 'go', tx: u.spot.x, ty: u.spot.y, until: s.now + 60 * m, arbTid: u.min * m, carry: 0, why: u.text, ref: u.ref };
    const t0 = s.now; let s1 = s.now;
    for (let k = 0; k < 300 && p.task?.act === 'stada'; k++) { s.now += 2000; SIM.step(s, 2); s1 = s.now; }
    const kvar = SIM.smutsRutor(s, r).size, min = (s1 - t0) / m;
    return [
      [`ett rent rum ger inget att städa (${rent ? 'val' : 'inget'})`, !rent],
      [`blod och toaletternas fläckar räknas som smuts (${dirty} rutor)`, dirty === 4],
      [`den som bor där vill städa det smutsiga rummet (${egen.toFixed(2)}), någon annan mindre (${a ? a.sc.toFixed(2) : '–'})`, rn === r && egen > 0 && (!a || a.rum !== r || a.sc < egen)],
      [`alla rutorna städas, en halv minut var (${kvar} kvar, ${min.toFixed(1)} min)`, kvar === 0 && min >= 4 * SIM.STADA.min - 0.1 && min <= 4],
      [`rummet är finare rent (${del0.toFixed(2)} → ${SIM.finhetDelar(s, r).tal.toFixed(2)})`, SIM.finhetDelar(s, r).tal > del0],
      [`det räknas i byns statistik (${s.stat?.stadat ?? 0})`, (s.stat?.stadat ?? 0) >= 1],
    ];
  },
};

SCENARIER.forvantan = {
  text: 'Steg 14.1.3: den rika, ledaren och den kända förväntar sig ett finare rum; under förväntan ger en dålig tanke och över en god, och finheten syns i husets pris',
  kor: () => {
    const s = SIM.cloneState(testBy(25)), rum = SIM.gridOf(s).rooms.filter(r => r.tiles.length && r.hus !== undefined && SIM.sovplatser(s, r) > 0), r = rum[0];
    const p = SIM.living(s).find(q => !q.gast && SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen && s.styre?.ledare !== q.id)!;
    const med = (w: number) => { p.forv = { f: w, w }; return SIM.forvantanAv(s, p); };
    const fattig = med(20), rik = med(2000), van = med(150);
    const l0 = s.styre?.ledare; if (s.styre) s.styre.ledare = p.id; const ledare = SIM.forvantanAv(s, p); if (s.styre) s.styre.ledare = l0;
    SIM.finhetTimme(s); SIM.forvantanTimme(s);
    const f = SIM.finhetAv(s, r)!, tankar = () => p.thoughts.filter(t => t.k === 'rumFint' || t.k === 'rumEnkelt');
    p.thoughts = []; p.finForv = f + 0.3; SIM.forvantanTanke(s, p, r); const dalig = tankar()[0];
    p.thoughts = []; p.finForv = Math.max(0, f - 0.3); SIM.forvantanTanke(s, p, r); const god = tankar()[0];
    const h = SIM.husById(s, r.hus)!, pris = () => SIM.saljPris(s, h), satt = (v: number) => { for (const k in s.finhet) s.finhet![k] = v; };
    satt(0.1); const billig = pris(); satt(0.9); const dyr = pris();
    const barn = SIM.living(s).filter(q => SIM.ageOf(q, s.now) < SIM.ALDER.vuxen && !q.gast);
    return [
      [`den rika väntar sig mer än den fattiga (${fattig.toFixed(2)} < ${van.toFixed(2)} < ${rik.toFixed(2)})`, fattig < van && van < rik],
      [`ledaren väntar sig mer (${van.toFixed(2)} → ${ledare.toFixed(2)})`, !s.styre || ledare > van],
      [`ett rum under förväntan ger en dålig tanke (${dalig?.k})`, dalig?.k === 'rumEnkelt'],
      [`ett rum över förväntan ger en god tanke (${god?.k}, rummets finhet ${f.toFixed(2)})`, god?.k === 'rumFint'],
      [`ett finare hus kostar mer (${billig.toFixed(0)} → ${dyr.toFixed(0)})`, dyr > billig],
      [`alla har en förväntan, också barnen (${barn.length} barn)`, SIM.living(s).every(q => q.finForv !== undefined)],
    ];
  },
};

SCENARIER.foretag = {
  text: 'Steg 14.1.5: ett företag är en ägare, ett hus och verksamheter utan egen kassa; det startas när det lönar sig, huset byggs med byggsystemet och företaget följer huset när det ärvs',
  kor: () => {
    const s = SIM.cloneState(testBy(25));
    s.foretag = [];
    const vux = SIM.living(s).filter(q => !q.gast && SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen), kan = (q: typeof vux[number]) => SIM.startPoang(s, q.id, ['servering']).poang;
    const p = [...vux].sort((x, y) => kan(y) - kan(x))[0], arvinge = vux.find(q => q !== p)!;
    const spara = JSON.stringify(s.foretag), utan = SIM.startPoang(s, p.id, ['servering']);
    // gott om mat som är god nog, och kunder som kan betala
    const fin = SIM.FOOD.find(k => SIM.maltidsNiva(k) === 'fin')!;
    SIM.laggIn(s, fin, 400, p.id);
    for (const q of vux) SIM.laggIn(s, 'silver', 200, q.id);
    const med = SIM.startPoang(s, p.id, ['servering']), b = SIM.bastaStart(s);
    const hi = SIM.efterfragan(s, 'servering', p.id);
    const f = SIM.starta(s, p.id, ['servering']), kvar = SIM.efterfragan(s, 'servering', arvinge.id);
    const a = SIM.foretagKrok.akut(s), bygger = SIM.BYGGNADER.naringshus.akut!(s);
    // huset: ett som är klart och blir ägarens
    const h = SIM.housesOf(s).find(x => x.klar && x.tro === undefined && SIM.gridOf(s).rooms.some(r => r.hus === x.id && r.tiles.length > 5))!;
    const fn0 = h.fn; h.fn = 'naringshus' as never; h.ag = p.id;
    SIM.foretagTimme(s);
    const fick = f.hus === h.id, klarAkut = SIM.foretagKrok.akut(s).v, bordrum = SIM.foretagBord.rum(s);
    h.ag = arvinge.id; SIM.foretagTimme(s); const arvt = f.ag === arvinge.id;
    h.fn = fn0; SIM.foretagTimme(s); const utanHus = f.hus === undefined;
    return [
      [`utan kunder som kan betala lönar det sig inte (${utan.poang.toFixed(2)}, ${spara})`, utan.poang <= 0],
      [`med god mat och kunder med silver lönar det sig (${med.poang.toFixed(2)}, ${med.kunder.toFixed(1)} kunder per dygn)`, med.poang > 0],
      [`någon i byn skulle starta ett (${b ? b.verk.join('+') + ' ' + b.poang.toFixed(2) : 'ingen'})`, !!b],
      [`det som redan säljs efterfrågas inte en gång till (${hi.kunder.toFixed(1)} → ${kvar.kunder.toFixed(1)})`, kvar.kunder < hi.kunder],
      [`huset blir ett bygge för ägaren (akut ${a.v}, ägare ${a.ag === p.id})`, a.v > 0 && a.ag === p.id && bygger.v === a.v],
      [`huset blir företagets när det är klart (${fick}), och inget mer byggs (${klarAkut})`, fick && klarAkut === 0],
      [`företagets rum vill ha platser vid bord (${bordrum[0]?.folk ?? 0})`, bordrum.length === 1 && bordrum[0].folk >= 2],
      [`företaget följer huset när det ärvs`, arvt],
      [`när huset får en annan funktion saknar företaget hus`, utanHus],
      [`registret har raderna servering och dryck`, !!SIM.VERKSAMHETER.servering && !!SIM.VERKSAMHETER.dryck],
    ];
  },
};
