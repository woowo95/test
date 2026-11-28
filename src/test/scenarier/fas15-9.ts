// Scenarier för fas 15, grupp 9 (steg 15.1.96–15.1.104).
import * as SIM from '../../sim';
import { SCENARIER, testBy } from './hjalp';
import { foretagBy } from './fas14';

SCENARIER.affarstyrka = {
  text: 'Steg 15.1.96: affären byggs på det ägaren kan. En skicklig hantverkare som kan göra vattensäckar av skinnen i byn (det alla saknar) öppnar en affär som säljer dem och heter efter dem, och en bybo som varken har något över eller kan göra något öppnar ingen',
  kor: () => {
    const s = SIM.cloneState(testBy(25)); s.foretag = [];
    const K = 'vattensack', tek = SIM.SAKER[K]!.skaffa!.tek!;
    const vux = SIM.living(s).filter(q => !q.gast && SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen);
    const p = vux[0]!, q = vux.find(x => x !== p && !SIM.familjOf(s, p.id).includes(x))!;
    for (const x of SIM.living(s)) if (x.tek) delete x.tek[tek]; // bara hantverkaren kan göra vattensäckar
    (p.tek ??= {})[tek] = 1;
    const sk = SIM.fardighetFor(s, p, K); p.skill[sk] = 16; p.skill.handel = 6; q.skill[sk] = 16;
    SIM.setAmount(s, 'skinn', 20); SIM.setAmount(s, 'rep', 10);
    for (const x of vux) SIM.laggIn(s, 'silver', x === p || x === q ? 400 : 200, x.id);
    s.ting = (s.ting ?? []).filter(t => t.k !== K);
    for (const x of SIM.living(s)) x.bruk = undefined;
    const alla = SIM.living(s).filter(x => !x.gast && x !== p && SIM.saknarNu(s, x).includes(K)).length;
    const kan = SIM.kanSkaffaVaror(s, p, [K]).length > 0, kanInte = SIM.kanSkaffaVaror(s, q, [K]).length === 0;
    const varor = SIM.VERKSAMHETER.affar.varor(s, p.id), ingen = SIM.VERKSAMHETER.affar.varor(s, q.id).filter(k => !SIM.personPart(s, q).over([]).some(w => w.k === k));
    const pp = SIM.startPoang(s, p.id, ['affar']).poang;
    // den andra: inget över och inget hen kan göra
    const qOver = () => { s.ting = (s.ting ?? []).filter(t => t.agare !== q.id); for (const a of s.stackar ?? []) if (a.ag?.[q.id]) delete a.ag[q.id]; SIM.laggIn(s, 'silver', 400, q.id); };
    qOver(); const qVaror = SIM.VERKSAMHETER.affar.varor(s, q.id), qp = SIM.startPoang(s, q.id, ['affar']).poang;
    p.skill[sk] = 0; const osk = SIM.startPoang(s, p.id, ['affar']).poang; p.skill[sk] = 16;
    const f = SIM.starta(s, p.id, ['affar']);
    return [
      [`${alla} bybor saknar en vattensäck`, alla >= 3],
      [`hantverkaren kan göra vattensäckar, med färdigheten ${sk}; den andra kan inte`, kan && kanInte],
      [`hantverkarens affär kan sälja vattensäckar (${varor.join(', ')})`, varor.includes(K) && !ingen.includes(K)],
      [`den som varken har något över eller kan göra något har inga varor (${qVaror.join(', ') || 'inga'})`, qVaror.length === 0],
      [`hantverkarens poäng är positiv (${pp.toFixed(2)}), den andras inte (${qp.toFixed(2)})`, pp > 0 && qp <= 0],
      [`skickligheten ger mer (${pp.toFixed(2)} mot ${osk.toFixed(2)} utan den)`, pp > osk],
      [`affären heter efter vattensäckarna (${f.namn})`, /vattensäckar$/.test(f.namn)],
    ];
  },
};

SCENARIER.affarmal = {
  text: 'Steg 15.1.97: det en affär sålt av en vara blir ägarens förrådsmål för den, räknat ur försäljningen. Varan som säljer får ett mål och blir ägarens eget projekt, och en vara som aldrig sålt får inget mål',
  kor: () => {
    const { s, p, f } = foretagBy(['affar']);
    const fam = SIM.familjOf(s, p.id), F = { kyla: false, gras: 0 };
    // ett redskap ägaren kan göra
    const g = Object.keys(SIM.GORS).find(x => SIM.PROJEKT[x] && SIM.GORS[x]!.some(k => SIM.canMake(s, p, k)) && SIM.kanGoras(s, x as SIM.Act, p) && SIM.enTill(s, x as SIM.Act, p));
    if (!g) return [['ägaren kan göra något redskap', false]];
    const k = SIM.GORS[g]!.find(q => SIM.canMake(s, p, q))!, aldrig = Object.keys(SIM.GORS).find(x => x !== g)!;
    for (const t of s.ting ?? []) if (t.agare === p.id && SIM.GORS[g]!.includes(t.k)) t.agare = undefined as never; // ägaren har inga av dem själv
    f.saltVara = {};
    const utanMal = SIM.foretagMal(s, p.id, k), utanV = SIM.personVarde(s, g, fam, 0, p), utanVill = SIM.wantsTool(s, p, g);
    f.saltVara = { [k]: 4 };
    const mal = SIM.foretagMal(s, p.id, k), medV = SIM.personVarde(s, g, fam, 0, p), medVill = SIM.wantsTool(s, p, g), aldrigMal = SIM.foretagMal(s, p.id, SIM.GORS[aldrig]![0]!);
    const b = SIM.bastaProjekt(s, p, F, true);
    return [
      [`utan försäljning inget mål för ${k} (${utanMal})`, utanMal === 0],
      [`det sålda ger ägaren ett mål (${mal} ${k})`, mal >= 1],
      [`en vara som aldrig sålt får inget mål (${aldrigMal})`, aldrigMal === 0],
      [`projektet är värt mer för ägaren (${utanV.toFixed(3)} → ${medV.toFixed(3)})`, medV > utanV],
      [`ägaren vill göra ${k} när den säljer (${utanVill ? 'ville förut också' : 'ville inte förut'})`, medVill],
      [`ägarens eget projekt är det (${b?.k ?? 'inget'})`, b?.k === g],
    ];
  },
};

SCENARIER.prispervara = {
  text: 'Steg 15.1.98: priset gäller per vara. I en affär med två varor, där den ena säljer slut och den andra står kvar, blir den första dyrare och den andra billigare, och de som avstod räknas för varan de ville ha',
  kor: () => {
    const { s, f, vux } = foretagBy(['affar']);
    const G = SIM.saljPart(s, f)!, [a, b] = ['korg', 'rep'], A = SIM.varuNyckel('affar', a), B = SIM.varuNyckel('affar', b);
    const fore = [SIM.prisAv(s, f, 'affar', a, G), SIM.prisAv(s, f, 'affar', b, G)];
    f.pris = undefined; f.dag = { [A]: { salt: 5 } };
    for (const q of vux.slice(0, 3)) for (const g of SIM.fragat) g(s, q, f, 'affar', false, b); // de som ville ha repet men avstod
    const nej = f.dag[B]?.nej?.length ?? 0, nejA = f.dag[A]?.nej?.length ?? 0;
    for (let i = 0; i < 6; i++) { f.dag = { [A]: { salt: 5 }, [B]: { nej: vux.slice(0, 3).map(q => q.id) } }; for (const g of SIM.dygnet) g(s); }
    const efter = [SIM.prisAv(s, f, 'affar', a, G), SIM.prisAv(s, f, 'affar', b, G)], pris = (f as SIM.Foretag).pris;
    return [
      [`de som avstod räknas för repet (${nej}), inte för korgen (${nejA})`, nej === 3 && nejA === 0],
      [`korgen som säljer slut blir dyrare (${fore[0]} → ${efter[0]} silver, ${pris?.[A]?.toFixed(2)})`, (pris?.[A] ?? 1) > 1 && efter[0]! >= fore[0]!],
      [`repet som står kvar blir billigare (${pris?.[B]?.toFixed(2)})`, (pris?.[B] ?? 1) < 1],
      [`verksamheten har inget gemensamt pris (${Object.keys(f.pris ?? {}).join(', ')})`, pris?.affar === undefined],
    ];
  },
};

SCENARIER.hyllval = {
  text: 'Steg 15.1.99: hyllan väljs efter poäng. En vara på ett fullt varubord som ingen vill ha bärs tillbaka till förrådet och byts mot maten byborna saknar, och den som säljer vid hyllan övar handel som i andra byten',
  kor: () => {
    const { s, p, f, vux, fin } = foretagBy(['affar']);
    for (const q of s.people) q.task = undefined;
    for (const m of SIM.FOOD) if (m !== fin) SIM.setAmount(s, m, 0); // bara ägaren har mat, och de andra är hungriga
    const v1 = SIM.stationSite(s, 'varubord')!;
    s.stationer!.push({ id: s.nextStation = (s.nextStation ?? 0) + 1, k: 'varubord', x: v1.x, y: v1.y, rot: v1.rot, kvar: 0, inne: 1 } as unknown as SIM.Station); SIM.touch(s);
    const X = 'sten', rutor = v1.rot ? [{ x: v1.x, y: v1.y }, { x: v1.x, y: v1.y + 1 }] : [{ x: v1.x, y: v1.y }, { x: v1.x + 1, y: v1.y }];
    for (const r of rutor) s.stackar!.push({ k: X, n: 3, c: 1, x: r.x, y: r.y, ag: { [p.id]: 3 } }); // varubordet är fullt av sten
    SIM.touch(s);
    for (const q of vux) { SIM.laggIn(s, 'silver', 60, q.id); q.hunger = 0.3; q.bruk = undefined; }
    const val = SIM.attStalla(s, f), fullt = SIM.hyllan(s, f).filter(h => h.k === X).length;
    let tillbaka = false;
    for (let i = 0; i < 3 * 360 && !(SIM.hyllan(s, f).some(h => h.k === fin) && !SIM.hyllan(s, f).some(h => h.k === X)); i++) { SIM.step(s, 10); if (p.task?.act === 'stallaFram' && p.task.tillbaka) tillbaka = true; }
    const kvar = SIM.hyllan(s, f).filter(h => h.k === X).length, mat = SIM.hyllan(s, f).find(h => h.k === fin);
    // köpet vid hyllan är ett byte: säljaren övar handel och relationen växer
    const k = vux.find(q => SIM.kundVal(s, q, 'affar')), e = k && SIM.kundVal(s, k, 'affar');
    let hFore = 0, hEfter = 0, rFore = 0, rEfter = 0, kopt = false;
    if (k && e) {
      hFore = p.skill.handel; rFore = SIM.getRel(s, k, p).op;
      kopt = SIM.kopVid(s, f, k, { p: k.id, v: 'affar', k: e.k, n: e.n, t: s.now }, p);
      hEfter = p.skill.handel; rEfter = SIM.getRel(s, k, p).op;
    }
    return [
      [`varubordet är fullt av sten (${fullt} rutor), och det som ger minst ska bäras tillbaka (${val?.tillbaka ? val.k : 'inget'})`, fullt === 2 && !!val?.tillbaka && val.k === X],
      [`ägaren bar tillbaka stenen (${kvar} rutor kvar)`, tillbaka && kvar < 2],
      [`maten byborna saknar kom upp i stället (${mat ? `${mat.n} ${mat.k}` : 'ingen'})`, !!mat],
      [`en kund köpte vid hyllan (${e ? `${e.n} ${e.k}` : 'ingen kund'})`, kopt],
      [`säljaren övade handel (${hFore.toFixed(3)} → ${hEfter.toFixed(3)})`, hEfter > hFore],
      [`relationen växte (${rFore.toFixed(1)} → ${rEfter.toFixed(1)})`, rEfter > rFore],
    ];
  },
};
