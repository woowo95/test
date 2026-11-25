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

// steg 14.1.7: ägaren anställer den som betjänar när kunder fått gå
SCENARIER.anstalld = {
  text: 'Steg 14.1.7: ägaren anställer med dagsarbetet när hens timmar inte räcker och kunderna som går är värda mer än lönen; den anställda betjänar',
  kor: () => {
    const { s, p, f } = foretagBy(), utan = SIM.DAGSVERK.foretag.bud(s).length;
    SIM.laggIn(s, 'silver', 40, p.id);
    f.salt = { servering: 6 }; f.vinst = 9; f.lamnat = 6;
    const bud = SIM.DAGSVERK.foretag.bud(s)[0];
    for (const q of s.people) q.anst = undefined;
    SIM.anstallDygn(s);
    const a = s.anst?.find(q => q.arb === 'foretag'), q = a && SIM.byId(s, a.p), w = q ? SIM.betjanar(s, q, f) : 0;
    // den anställda kallas till disken när ägaren sover
    let kallad = false;
    if (q) {
      const k = SIM.living(s).find(x => x !== q && x !== p && SIM.kundVal(s, x, 'servering')), e = k && SIM.kundVal(s, k, 'servering');
      if (k && e) { const st = SIM.stallIKo(s, k, e); k.x = st.spot.x; k.y = st.spot.y; k.task = { act: 'koaDisk', phase: 'do', tx: k.x, ty: k.y, until: s.now + 8 * 60000, carry: 0, why: '', ref: f.id }; }
      p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: s.now + 3600000, carry: 0, why: '' };
      q.task = undefined;
      kallad = SIM.betjanVal(s, q)?.f === f;
      f.ko = [];
    }
    if (a) { a.verk = 1; a.tim = 1; }
    const s0 = q ? SIM.ownsAmount(s, q, 'silver') : 0;
    SIM.lonDygn(s);
    f.lamnat = 0;
    return [
      [`utan kunder som går anställs ingen (${utan})`, utan === 0],
      [`budet följer det kunderna hade gett (${bud?.tim.toFixed(0)} per timme, högst ${bud?.timMax?.toFixed(2)} timmar)`, !!bud && bud.tim * bud.timMax! > 1 && bud.mal === f.id],
      [`någon anställs för mindre än det är värt (${q?.name}, ${a?.lon} silver)`, !!a && a.lon >= 1 && a.lon <= bud.tim * bud.timMax!],
      [`den anställda betjänar och väljer disken (${w})`, w === 1 && kallad],
      [`lönen betalas (${q ? SIM.ownsAmount(s, q, 'silver') - s0 : 0})`, !!q && SIM.ownsAmount(s, q, 'silver') - s0 === a!.lon],
      [`räcker timmarna igen görs inget bud (${SIM.DAGSVERK.foretag.bud(s).length})`, SIM.DAGSVERK.foretag.bud(s).length === 0],
    ];
  },
};

// en by med ett företag: ett hus med disk och bord (också för de andra scenarierna)
export function foretagBy(verk = ['servering'], silver = 60) {
  const s = SIM.cloneState(testBy(25)), W = SIM.W;
  const vux = SIM.living(s).filter(q => !q.gast && SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen && SIM.kanGa(q));
  const p = vux[0];
  const r = [...SIM.gridOf(s).rooms].filter(x => x.hus !== undefined && SIM.husById(s, x.hus)?.klar && SIM.husById(s, x.hus)!.tro === undefined).sort((a, b) => b.tiles.length - a.tiles.length)[0];
  const h = SIM.husById(s, r.hus)!, i = new Set(r.tiles);
  h.fn = 'naringshus' as never; h.ag = p.id;
  s.stationer = s.stationer!.filter(t => !i.has(t.y * W + t.x));
  s.lagren = (s.lagren ?? []).filter(z => !i.has(z.y * W + z.x));
  s.stackar = (s.stackar ?? []).filter(a => !i.has(Math.floor(a.y) * W + Math.floor(a.x)));
  const stall = (k: string, x: number, y: number) => { const t = { id: s.nextStation = (s.nextStation ?? 0) + 1, k, x, y, kvar: 0, inne: 1 } as unknown as SIM.Station; s.stationer!.push(t); SIM.touch(s); return t; };
  const ok = (x: number, y: number) => [0, 1].every(d => i.has(y * W + x + d));
  const d0 = r.tiles.find(t => ok(t % W, Math.floor(t / W)) && i.has(t + W) && i.has(t + W + 1))!;
  const disk = stall('disk', d0 % W, Math.floor(d0 / W));
  const b0 = [...r.tiles].reverse().find(t => ok(t % W, Math.floor(t / W)) && (Math.floor(t / W) > disk.y + 2 || Math.abs(t % W - disk.x) > 2))!;
  stall('bord', b0 % W, Math.floor(b0 / W));
  const fin = SIM.FOOD.find(k => SIM.maltidsNiva(k) === 'fin')!;
  SIM.laggIn(s, fin, 300, p.id);
  for (const q of vux) if (q !== p) SIM.laggIn(s, 'silver', silver, q.id);
  s.foretag = []; const f = SIM.starta(s, p.id, verk); SIM.foretagTimme(s);
  return { s, p, f, h, r, disk, fin, vux: vux.filter(q => q !== p && !SIM.familjOf(s, p.id).includes(q)) };
}

SCENARIER.kassa = {
  text: 'Steg 14.1.6: kunden köper maten vid disken när den är mer värd än den kostar, väntar där tills någon betjänar, och går om det dröjer för länge; poängen för att betjäna växer med kön och väntan',
  kor: () => {
    const { s, p, f, disk, fin, vux } = foretagBy(), m = 60000, kan = vux.filter(q => SIM.kundVal(s, q, 'servering')), k = kan[0], k2 = kan[1];
    const oppet = SIM.oppna(s, f), e = SIM.kundVal(s, k, 'servering');
    const dyr = (() => { f.pris = { servering: 50 }; const x = SIM.kundVal(s, k, 'servering'); f.pris = undefined; return x; })();
    const stalla = (q: typeof k, dt = 0) => { const x = SIM.kundVal(s, q, 'servering'); if (!x) return false; const o = SIM.stallIKo(s, q, x); q.x = o.spot.x; q.y = o.spot.y; q.task = { act: 'koaDisk', phase: 'do', tx: o.spot.x, ty: o.spot.y, until: s.now + o.dur - dt, carry: 0, why: o.why, ref: o.ref }; f.ko![f.ko!.length - 1].t = s.now - dt; return true; };
    if (e) stalla(k);
    const p1 = SIM.betjanPoang(s, p, f);
    f.ko![0].t -= 4 * m; const p2 = SIM.betjanPoang(s, p, f);
    if (k2) stalla(k2); const p3 = SIM.betjanPoang(s, p, f);
    const platser = new Set((f.ko ?? []).map(r => { const q = SIM.byId(s, r.p)!; return `${Math.floor(q.x)},${Math.floor(q.y)}`; }));
    const annan = vux.find(q => q !== k && q !== k2), pa = annan ? SIM.betjanPoang(s, annan, f) : 0;
    // ägaren kallas till disken, väljer att betjäna och kunden får sin mat
    const silver0 = SIM.ownsAmount(s, k, 'silver'), varor0 = SIM.ownsId(s, p.id, fin), hung0 = k.hunger = 0.4;
    const b = SIM.betjanVal(s, p);
    p.task = { act: 'betjana', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '', ref: f.id };
    for (const a of s.stackar!) if (a.k === fin) { a.x = Math.floor(p.x); a.y = Math.floor(p.y); } // maten ligger framme vid disken
    SIM.touch(s);
    SIM.betjanaKlar(s, p, p.task!); p.task = undefined;
    const mat = k.hunger > hung0, betalt = silver0 - SIM.ownsAmount(s, k, 'silver'), salt = f.salt?.servering ?? 0, sitter = k.task?.act;
    // den andra väntar för länge
    const l0 = f.lamnat ?? 0; if (k2?.task) SIM.koaKlar(s, k2, k2.task);
    // i spelet: byn går och någon köper själv
    const s2 = foretagBy(); let kopt = 0;
    for (const q of s2.vux) { q.hunger = 0.25; q.task = undefined; }
    s2.p.task = undefined; s2.p.hunger = 1;
    for (let j = 0; j < 1800 && !kopt; j++) { s2.s.now += 2000; SIM.step(s2.s, 2); kopt = s2.s.stat?.foretagSalt ?? 0; }
    return [
      [`serveringen är öppen med bord och disk (${oppet.join(',')})`, oppet.includes('servering')],
      [`kunden vill köpa (${e?.k} för ${e?.pris.toFixed(1)}, vinner ${e?.net.toFixed(2)}), men inte till femtio gånger priset`, !!e && !dyr],
      [`poängen för att betjäna växer med väntan och kön (${p1.toFixed(2)} < ${p2.toFixed(2)} < ${p3.toFixed(2)})`, p1 > 0 && p1 < p2 && p2 < p3],
      [`kunderna står på varsin plats i kön (${platser.size})`, platser.size === 2],
      [`flera vill köpa (${kan.length})`, kan.length >= 2],
      [`bara den som arbetar i företaget betjänar (${pa})`, pa === 0],
      [`ägaren väljer att betjäna (${b?.f.namn})`, b?.f === f],
      [`kunden äter och betalar, och det sålda räknas (${betalt} silver, ${salt}, ${(varor0 - SIM.ownsId(s, p.id, fin)).toFixed(1)} mat)`, mat && salt === 1 && varor0 - SIM.ownsId(s, p.id, fin) >= 0.9],
      [`kunden sätter sig vid bordet (${sitter})`, sitter === 'maltid'],
      [`den som väntat för länge går, med en dålig tanke (${(f.lamnat ?? 0) - l0})`, (f.lamnat ?? 0) === l0 + 1 && k2!.thoughts.some(t => t.k === 'vantadeForgaves')],
      [`i byn köper någon själv (${kopt} köp, gått ${s2.s.stat?.koLamnat ?? 0})`, kopt > 0],
      [`disken är en station av virke`, disk.k === 'disk' && !!SIM.stationDef('disk')?.av],
    ];
  },
};

// steg 14.1.8: affären säljer det som ligger på varubordet
SCENARIER.affar = {
  text: 'Steg 14.1.8: ägaren ställer fram det hen har över och som andra saknar på varubordet, kunden betalar vid disken och får saken, och det andra i byn bär inte bort det som är framme',
  kor: () => {
    const { s, p, f, vux } = foretagBy(['affar']);
    for (const q of s.people) q.task = undefined;
    const v1 = SIM.stationSite(s, 'varubord')!;
    const brist0 = SIM.foretagBord.varuBrist(s), utan = SIM.oppna(s, f).includes('affar');
    const vb = { id: s.nextStation = (s.nextStation ?? 0) + 1, k: 'varubord', x: v1.x, y: v1.y, rot: v1.rot, kvar: 0, inne: 1 } as unknown as SIM.Station; s.stationer!.push(vb); SIM.touch(s);
    const vr = (i: number) => vb.rot ? { x: vb.x, y: vb.y + i } : { x: vb.x + i, y: vb.y };
    // de andra har inget metspö längre, och ägaren har två
    const k = 'metspo', utanKniv = (b: SIM.State) => { b.ting = SIM.tingOf(b).filter(t => t.k !== k); for (const q of SIM.living(b)) q.bruk = undefined; };
    utanKniv(s);
    const kund = vux.find(q => { const t = SIM.addTool(s, k, p); const ja = SIM.vilMangd(s, q, k) > 0; s.ting = SIM.tingOf(s).filter(x => x !== t); return ja; });
    const a1 = SIM.addTool(s, k as never, p), a2 = SIM.addTool(s, k as never, p); a2.agare = a1.agare = p.id;
    SIM.placeTools(s); for (const q of vux) SIM.saknarNu(s, q);
    const val = SIM.stallaVal(s, p), annan = vux.find(q => q !== kund)!, va = SIM.stallaVal(s, annan);
    const gor = (h: SIM.HyllVara) => {
      p.x = h.x + 0.5; p.y = h.y + 0.5; p.task = { act: 'stallaFram', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '', ref: f.id, tool: h.k } as SIM.Task;
      SIM.stallaKlar(s, p, p.task); const d = SIM.backSpot(s, p.task); p.task.phase = 'back'; p.task.tx = d.x; p.task.ty = d.y;
      const ok = SIM.stallaFramme(s, p.task); p.task = undefined; return ok;
    };
    const ok = val ? gor(val.h) : false, hylla = SIM.hyllan(s, f), pa = hylla.every(h => vr(0).x === h.x && vr(0).y === h.y || vr(1).x === h.x && vr(1).y === h.y);
    const lagrad = SIM.isStored(s, vb.x, vb.y), vakt = SIM.lagerVakt(s), bar = SIM.haulJob(s), ute = bar && Math.floor(bar.x) === vb.x && Math.floor(bar.y) === vb.y;
    // en hög: virke som någon saknar
    SIM.stacksOf(s).push({ k: 'virke', n: 6, c: 1, ...vr(1), ag: { [p.id]: 6 } }); SIM.changed(s);
    const kanske = kund && SIM.kundVal(s, kund, 'affar'), dyr = (() => { f.pris = { affar: 80 }; const x = kund && SIM.kundVal(s, kund, 'affar'); f.pris = undefined; return x; })();
    let kopt = false, betalt = 0, bytt = false;
    if (kund && kanske) {
      const o = SIM.stallIKo(s, kund, kanske); kund.x = o.spot.x; kund.y = o.spot.y; kund.task = { act: 'koaDisk', phase: 'do', tx: kund.x, ty: kund.y, until: s.now + 480000, carry: 0, why: '', ref: f.id };
      const n0 = SIM.ownsAmount(s, p, 'silver');
      p.task = { act: 'betjana', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '', ref: f.id };
      SIM.betjanaKlar(s, p, p.task); kopt = (f.salt?.affar ?? 0) === 1; betalt = SIM.ownsAmount(s, p, 'silver') - n0;
      bytt = kanske.k === 'virke' ? (kund.task?.items?.virke ?? 0) > 0 : SIM.tingOf(s).some(t => t.k === kanske.k && t.agare === kund.id);
    }
    // högen köps och bärs hem av kunden
    const h = SIM.hyllan(s, f).find(q => q.k === 'virke')!; annan.task = undefined;
    const tog = h ? SIM.taVaran(s, f, annan, h, 2) : 0, kvar = SIM.hyllan(s, f).find(q => q.k === 'virke')?.n ?? 0, bars = annan.task as SIM.Task | undefined;
    // i spelet: byn går och någon köper själv
    const s2 = foretagBy(['affar']); utanKniv(s2.s); for (const q of s2.vux) { q.habit = { ...q.habit, fiske: 200 } as never; q.task = undefined; } s2.s.stationer!.push({ ...vb } as never); SIM.touch(s2.s);
    for (let i = 0; i < 12; i++) { const t = SIM.addTool(s2.s, k, s2.p); t.agare = s2.p.id; if (!i) { t.x = vb.x; t.y = vb.y; } } SIM.placeTools(s2.s); SIM.touch(s2.s);
    let stallt = 0, salt = 0;
    for (let j = 0; j < 7200 && !(stallt && salt); j++) { s2.s.now += 2000; SIM.step(s2.s, 2); stallt = s2.s.stat?.stalltFram ?? 0; salt = s2.s.stat?.foretagSalt_affar ?? 0; }
    return [
      [`utan varubord är affären stängd och vill ha ett (${brist0})`, !utan && brist0 === 1],
      [`ägaren vill ställa fram det någon saknar (${val?.h.k}, ${val?.sc.toFixed(2)}), en annan inte`, !!val && !va],
      [`det ställs på varubordet (${hylla.map(x => x.k).join(',')})`, ok && pa && hylla.length === 1],
      [`varubordet hör till förrådet, men ingen bär bort det som är framme (${vakt.join(';')})`, lagrad && !ute && !vakt.length],
      [`affären är öppen`, SIM.oppna(s, f).includes('affar')],
      [`den som saknar något köper (${kanske?.k} för ${kanske?.pris}), men inte till åttio gånger priset`, !!kanske && !dyr],
      [`köpet blir av (${betalt} silver) och saken är kundens`, kopt && bytt],
      [`en hög tas ur affären och bärs hem (${tog}, kvar ${kvar})`, tog === 2 && kvar >= 3 && bars?.items?.virke === 2 && bars.phase === 'back'],
      [`i byn ställs varor fram och köps (${stallt}, ${salt})`, stallt > 0 && salt > 0],
    ];
  },
};

// steg 14.1.9: två serveringar i byn (foretagBy ger den ena, det största huset kvar blir den andra)
export function tvaForetag() {
  const b = foretagBy(), { s, vux, fin } = b, W = SIM.W;
  const p2 = vux[0], r2 = [...SIM.gridOf(s).rooms].filter(x => x.hus !== undefined && x.hus !== b.h.id && SIM.husById(s, x.hus)?.klar && SIM.husById(s, x.hus)!.tro === undefined).sort((a, c) => c.tiles.length - a.tiles.length)[0];
  const h2 = SIM.husById(s, r2.hus)!, i = new Set(r2.tiles);
  h2.fn = 'naringshus' as never; h2.ag = p2.id;
  s.stationer = s.stationer!.filter(t => !i.has(t.y * W + t.x));
  s.lagren = (s.lagren ?? []).filter(z => !i.has(z.y * W + z.x));
  s.stackar = (s.stackar ?? []).filter(a => !i.has(Math.floor(a.y) * W + Math.floor(a.x)));
  const f2 = SIM.starta(s, p2.id, ['servering']); SIM.touch(s); SIM.foretagTimme(s);
  for (const k of ['disk', 'bord']) { const t = SIM.stationSite(s, k); if (t && i.has(t.y * W + t.x)) { s.stationer!.push({ id: s.nextStation = (s.nextStation ?? 0) + 1, k, x: t.x, y: t.y, rot: t.rot, kvar: 0, inne: 1 } as unknown as SIM.Station); SIM.touch(s); } }
  if (!s.stationer!.some(t => t.k === 'bord' && i.has(t.y * W + t.x))) { const j = r2.tiles.find(t => i.has(t + 1) && i.has(t + W) && !s.stationer!.some(q => Math.abs(q.x - t % W) < 2 && Math.abs(q.y - Math.floor(t / W)) < 2))!; s.stationer!.push({ id: s.nextStation = (s.nextStation ?? 0) + 1, k: 'bord', x: j % W, y: Math.floor(j / W), kvar: 0, inne: 1 } as unknown as SIM.Station); SIM.touch(s); }
  SIM.laggIn(s, fin, 300, p2.id);
  return { ...b, f2, r2, p2, vux: vux.filter(q => q !== p2 && !SIM.familjOf(s, p2.id).includes(q)) };
}
SCENARIER.konkurrens = {
  text: 'Steg 14.1.9: kunden väljer företaget efter priset och finheten mot sin förväntan, liknande företag delar kunderna, priset följer dem som köper och avstår, och ägaren gör rummet finare när kunderna väntat sig det',
  kor: () => {
    const { s, p, f, f2, r, r2, vux } = tvaForetag(), oppna = [f, f2].map(x => SIM.oppna(s, x).includes('servering'));
    const nyckel = (x: typeof r) => SIM.rumNyckel(x);
    const satt = (a: number, b: number) => { s.finhet = { ...s.finhet, [nyckel(r)]: a, [nyckel(r2)]: b }; };
    for (const q of vux) { q.finForv = 0.3; q.hunger = 0.4; }
    const val = (x: typeof f) => vux.filter(q => SIM.kundVal(s, q, 'servering')?.f === x).length;
    satt(0.3, 0.3); f.pris = { servering: 1 }; f2.pris = { servering: 1 };
    f.dag = f2.dag = f.gap = f2.gap = undefined; const lika = [val(f), val(f2)], nej = (f2 as SIM.Foretag).dag?.servering?.nej?.length ?? 0;
    f.pris = { servering: 2.5 }; const dyr = [val(f), val(f2)];
    satt(0.9, 0.1); f.pris = { servering: 1 }; const fint = [val(f), val(f2)];
    // den kräsne går till det fina och dyra, den som inte väntar sig något till det billiga
    satt(0.95, 0.15); f.pris = { servering: 2 }; f2.pris = { servering: 0.8 };
    vux.forEach((q, i) => { q.finForv = i % 2 ? 0.55 : 0.05; });
    const nisch = [val(f), val(f2)];
    // priset: köper alla går det upp, avstår alla går det ner
    f.pris = f2.pris = undefined; f.dag = { servering: { salt: 6, nej: [1] } }; f2.dag = { servering: { salt: 0, nej: [1, 2, 3] } };
    f.gap = { n: 4, v: 1.2, vem: [] };
    for (const g of SIM.dygnet) g(s);
    const upp = f.pris!.servering, ner = f2.pris!.servering, finare = SIM.foretagBord.finare(s, p);
    const G = SIM.saljPart(s, f)!, fin = SIM.varorAv(s, f, 'servering', G)[0];
    f.pris = { servering: 0.01 }; const golv = SIM.prisAv(s, f, 'servering', fin, G), eget = SIM.grundvarde(fin) * G.varde(fin);
    f.enkelt = 0; const nojd = SIM.foretagBord.finare(s, p);
    return [
      [`båda serveringarna är öppna (${oppna.join(',')})`, oppna.every(Boolean)],
      [`lika företag delar kunderna (${lika.join(' och ')} av ${vux.length})`, lika[0] > 0 && lika[1] > 0],
      [`den som valt det andra räknas som den som avstod (${nej})`, nej > 0],
      [`blir det ena dyrare går kunderna till det andra (${dyr.join(' och ')})`, dyr[0] < lika[0] && dyr[1] >= lika[1]],
      [`det finare rummet drar kunderna (${fint.join(' och ')})`, fint[0] > lika[0]],
      [`det dyra fina och det billiga enkla har var sina kunder (${nisch.join(' och ')})`, nisch[0] > 0 && nisch[1] > 0],
      [`priset går upp när många köper och ner när de avstår (${upp.toFixed(2)}, ${ner.toFixed(2)})`, upp > 1 && ner < 1],
      [`ingen säljer under det varan är värd för ägaren (${golv} mot ${eget.toFixed(2)})`, golv >= eget - 1e-9],
      [`ägaren vill göra rummet finare när kunderna väntat sig det (${finare?.lust.toFixed(2)}), annars inte`, !!finare && finare.r.hus === r.hus && !nojd],
    ];
  },
};

SCENARIER.foretagsrykte = {
  text: 'Steg 14.1.10: varje besök ger ett omdöme (kvaliteten, priset, finheten och väntan), omdömena är företagets rykte, de sprids i samtalen och till grannbyarna, och kunden går hellre dit hen var nöjd',
  kor: () => {
    const { s, f, f2, r, vux } = tvaForetag(), [a, b] = vux, c = SIM.living(s).find(q => q !== a && q !== b && q.id !== f.ag)!;
    for (const q of vux) { q.finForv = 0.3; q.hunger = 0.4; }
    s.finhet = { ...s.finhet, [SIM.rumNyckel(r)]: 0.3 };
    const om = (o: Partial<SIM.Besok>) => SIM.omdomeAv({ s, p: a, f, v: 'servering', far: 4, net: 1.6, kv: 1, vantat: 4, ...o });
    const mitt = om({}), kv = om({ kv: 1.5 }), pris = om({ net: 0.4 }), kort = om({ vantat: 0.2 });
    const fint = (() => { s.finhet![SIM.rumNyckel(r)] = 0.8; const x = om({}); s.finhet![SIM.rumNyckel(r)] = 0.3; return x; })();
    for (const g of SIM.omdome) g(s, a, f, { v: 'servering', far: 4, net: 3.8, kv: 1.5, vantat: 0.2 });
    for (const g of SIM.omdome) g(s, b, f2);
    const gott = a.omd![f.id].v, daligt = b.omd![f2.id].v, rykt = SIM.ryktet(s, f), rykt2 = SIM.ryktet(s, f2);
    // samtalet: den som inte varit där hör, den som varit där ändrar sig mindre
    SIM.berattaForetag(s, a, c); const horde = c.omd?.[f.id]?.v ?? 0;
    b.omd![f.id] = { v: 0, n: 4 }; SIM.berattaForetag(s, a, b); const varit = b.omd![f.id].v; delete b.omd![f.id];
    // valet: allt lika utom det man tycker
    f.pris = f2.pris = undefined; a.omd = { [f.id]: { v: 1, n: 1 } }; const valG = SIM.tycker.reduce((x, g) => x + g(s, a, f, 'servering'), 0); a.omd = { [f.id]: { v: -1, n: 1 } }; const valD = SIM.tycker.reduce((x, g) => x + g(s, a, f, 'servering'), 0);
    // grannbyn, med den som reser och med gästen som går hem
    a.omd = { [f.id]: { v: 0.9, n: 2 } }; for (const g of SIM.motkrok) g(s, 5, [a]); const by = SIM.ryktetI(f, 5), by2 = SIM.ryktetI(f, 6);
    const k = SIM.klanerOf(s).find(q => q.rad !== undefined); let hem = 0;
    if (k) { const g = { ...a, omd: undefined, gast: { sort: 'framling', klan: k.id } } as unknown as typeof a; if (g) { g.omd = { [f2.id]: { v: -0.8, n: 1 } }; SIM.hemkrok.forEach(q => q(s, g)); hem = SIM.ryktetI(f2, k.rad!); } }
    // ett stängt företag glöms
    s.foretag = s.foretag!.filter(q => q !== f2); for (const g of SIM.dygnet) g(s);
    return [
      [`kvaliteten, priset, finheten och väntan gör omdömet (${[mitt, kv, pris, fint, kort].map(x => x.toFixed(2)).join(', ')})`, kv > mitt && pris < mitt && fint > mitt && kort > mitt],
      [`det goda besöket ger ett gott omdöme och den som gick utan ett dåligt (${gott.toFixed(2)}, ${daligt.toFixed(2)})`, gott > 0.4 && daligt < -0.3],
      [`omdömena är företagets rykte (${rykt?.toFixed(2)}, ${rykt2?.toFixed(2)})`, rykt === gott && rykt2 === daligt],
      [`i samtalet hör den andra om det (${horde.toFixed(2)}), den som varit där själv ändrar sig mindre (${varit.toFixed(2)})`, horde > varit && varit > 0],
      [`man går hellre dit man var nöjd (${valG.toFixed(2)} mot ${valD.toFixed(2)})`, valG > valD + 0.5],
      [`grannbyn hör av den som reser (${by.toFixed(2)}), en annan by inte (${by2})`, by > 0 && by2 === 0],
      [`och av gästen som går hem (${hem.toFixed(2)})`, !k || hem < 0],
      ['det man tyckt om ett stängt företag glöms', b.omd?.[f2.id] === undefined],
    ];
  },
};
