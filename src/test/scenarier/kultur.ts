// Scenarier. Kulturen (fas 4.3): sporten, framträdandena, konsten i sakerna och pyntet i hemmen.
import { createState, Person, State } from '../../sim';
import * as SIM from '../../sim';
import { START } from '../kor';
import * as O from '../../sim/ord';
import { TEKNIK } from '../../sim/teknik';
import { SCENARIER, byggKlart, byggare, medTroshus, satKyrka, klockan, kor, korTills, medBank, medHus, nyInvanare, setFood, tandEld, tomtForrad, treVuxna, utanWebblasare } from './hjalp';
import { setByn, ui } from '../../ui/lage';
import { station as stationFlik } from '../../ui/flikar/station';
import { person as personFlik } from '../../ui/flikar/person';
import { kronika as kronikaFlik, val as kronikaVal } from '../../ui/flikar/kronika';
import { styre as styreFlik } from '../../ui/flikar/styre';
import { seder as sederFlik } from '../../ui/flikar/seder';
import { OPPNAR, bubblaKlick, bubblaText, forklaringAv } from '../../ui/bubbla';
import { esc, hjalpKlick } from '../../ui/hjalp';

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
  text: 'Sporten (steg 4.3.1.1 och 10.7.12): när byn har ett överskott spelar de vuxna brottning och dragkamp. Den som vill spela ropar, och de inom hörhåll som vill avbryter det de gör och kommer, men faror går före. Platsen är öppen mark som räcker för sporten. Det tränar närstrid och gör dem glada',
  kor: () => {
    const s = rikDag(3, { rep: 4 }), vill = vuxna(s).filter(q => SIM.sportVikt(s, q, 1) > 0).length;
    const f = rikDag(3, { rep: 4 }); setFood(f, 1);
    const vf = vuxna(f).filter(q => SIM.sportVikt(f, q, 1) > 0).length, lust = (x: State) => vuxna(x).reduce((a, q) => a + SIM.sportVikt(x, q, 1), 0); // (överskottet är en faktor, steg 10.2.43)
    // en samtalar och en hugger ved när den tredje ropar: båda kommer, och vedhuggaren avbryter arbetet
    const g = rikDag(3, { rep: 4 }), med = vuxna(g).slice(0, 3), fore = med.map(q => q.skill.narstrid), hugg = med[2]!;
    fritid(g, med[1]!); hugg.pot.styrka = hugg.pot.smidighet = 20;
    hugg.task = { act: 'hugga', phase: 'do', tx: hugg.x, ty: hugg.y, until: g.now + SIM.HOUR, carry: 0, dark: false };
    spela(g, med[0]!);
    const sport0 = g.sport ? SIM.SPORT_AV[g.sport.k]!.namn : 'ingen', ilista = med.slice(1).filter(q => g.sport?.lista?.includes(q.id)).length, avbrot = hugg.task?.act !== 'hugga';
    let sett = 0, kom = 0, glad = 0; // (glädjen varar en timme: den räknas medan det körs)
    kor(g, 2, () => { sett = Math.max(sett, med.filter(q => q.task?.act === 'sport' && q.task.phase === 'do').length); if (hugg.task?.act === 'sport') kom = 1; glad = Math.max(glad, med.filter(q => q.thoughts.some(t => /^(Vann|Förlorade) /.test(t.text))).length); });
    const battre = med.filter((q, i) => q.skill.narstrid > fore[i]!).length;
    // den som fryser farligt värmer sig först
    const h = rikDag(3, { rep: 4 }); tandEld(h);
    const hv = vuxna(h), fr = hv[1]!; for (const q of hv) q.pot.styrka = q.pot.smidighet = 20;
    fr.warm = SIM.KROPP.farligt - 0.1;
    spela(h, hv[0]!);
    const frLista = !!h.sport?.lista?.includes(fr.id); fr.task = undefined; SIM.chooseTask(h, fr);
    const frAkt = ((q: Person) => q.task?.act)(fr);
    // ingen vill: den som ropade blir ledsen, ingen avbryts och det blir ingen match
    const e = rikDag(3, { rep: 4 }), ev = vuxna(e);
    for (const q of ev.slice(1)) { q.pot.styrka = q.pot.smidighet = 0; fritid(e, q); q.pot.styrka = q.pot.smidighet = 0; }
    const ensam = !spela(e, ev[0]!) && !e.sport && ev.slice(1).every(q => q.task?.act === 'samtal');
    const ledsen = ev[0]!.thoughts.some(t => t.text === 'Ingen ville spela' && t.v < 0);
    // platsen: öppen mark i hela ytan, och alla platser för de flesta spelarna inom ytan
    const p = rikDag(3); medHus(p); const pv = vuxna(p), tr = SIM.groundOf(p).trees;
    const platser = SIM.SPORTER.map(d => {
      const at = SIM.sportPlats(p, pv[0]!, d);
      if (!at) return `${d.id}: ingen`;
      let oppet = true;
      for (let j = at.y - d.yta; j <= at.y + d.yta; j++) for (let i = at.x - d.yta; i <= at.x + d.yta; i++) {
        if ((i - at.x) ** 2 + (j - at.y) ** 2 > d.yta * d.yta + d.yta) continue;
        if (SIM.roomAt(p, i + 0.5, j + 0.5) || SIM.bitAt(p, i, j) || tr[j * SIM.W + i]! >= 0.5) oppet = false;
      }
      const m: SIM.Match = { k: d.id, x: at.x + 0.5, y: at.y + 0.5, start: p.now, slut: p.now + SIM.HOUR };
      const d0 = Math.max(...Array.from({ length: d.max }, (_, i) => { const u = SIM.platsFor(p, { ...pv[0]!, id: 9000 + i }, m); return Math.hypot(u.x - m.x, u.y - m.y); }));
      return `${d.id}: ${oppet ? 'öppet' : 'STÄNGT'}, längst ${d0.toFixed(1)} av ${d.yta}`;
    });
    return [
      [`i en rik by vill ${vill} av ${vuxna(s).length} vuxna spela på fritiden`, vill === vuxna(s).length],
      [`när maten är knapp vill man spela mycket mindre (${lust(f).toFixed(2)} mot ${lust(s).toFixed(2)}, ${vf} vill alls)`, lust(f) < lust(s) * 0.5],
      [`${ilista} av två vill vara med i ${sport0.toLowerCase()}en, och vedhuggaren ${avbrot ? 'avbröt arbetet' : 'högg vidare'} och ${kom ? 'kom' : 'kom inte'}`, ilista === 2 && avbrot && kom === 1],
      [`${(g.stat?.sportTim ?? 0).toFixed(1)} spelartimmar, högst ${sett} på planen samtidigt`, (g.stat?.sportTim ?? 0) >= 0.4 && sett >= 2],
      [`${glad} av tre är glada eller ledsna efter matchen, och ${battre} blev bättre i närstrid`, glad >= 2 && battre >= 2],
      [`den som fryser farligt ${frLista ? 'ville vara med' : 'ville inte'} men ${frAkt === 'varma' ? 'värmer sig först' : 'gör ' + frAkt}`, frLista && frAkt === 'varma'],
      [`när ingen vill blir det ingen match och ingen avbryts; den som ropade ${ledsen ? 'är ledsen' : 'är inte ledsen'} (${e.stat?.sportIngen ?? 0} gånger ingen)`, ensam && ledsen && (e.stat?.sportIngen ?? 0) === 1],
      [`platserna: ${platser.join('; ')}`, platser.every(x => / öppet, längst/.test(x) && Number(x.match(/längst ([\d.]+) av (\d)/)![1]) <= Number(x.match(/av (\d)/)![1]) + 0.5)],
      ...brottning(),
    ];
  },
};

// en match i sporten k som börjar nu mitt i byn, och de som går med i den
function match(s: State, k: string, med: Person[]) {
  const l = SIM.bynsMitt(s);
  s.sport = { k, x: l.x + 0.5, y: l.y + 0.5, start: s.now, slut: s.now + SIM.HOUR };
  for (const q of med) spela(s, q);
}
SCENARIER.tavling = {
  text: 'Tävlingen med pris (steg 10.7.20): en ledare med svagt stöd sätter upp sin minst värda lediga sak som pris när någon samlar till en match. Vinnaren äger saken, spelarna tycker bättre om ledaren, vinnaren får titeln och en rad i krönikan, och redogörelsen säger priset och givaren. Utan ledig sak blir det en vanlig match, och finns saken inte kvar delas inget ut',
  kor: () => {
    const by = (seed: number) => {
      const s = rikDag(seed, { rep: 4 }), v = vuxna(s), l = v[0]!;
      s.styre = { historia: [{ id: l.id, namn: l.name, titel: 'Ålderman', fran: s.now }], oppna: ['rang'], ledare: l.id, sedan: s.now, titel: 'Ålderman', satt: 1, pabud: {} as never };
      for (const t of s.ting ?? []) if (t.agare === l.id) t.agare = SIM.BYN;
      const kniv = SIM.newTing(s, 'kniv', 1, l.id);
      for (const q of v) fritid(s, q);
      return { s, v, l, kniv };
    };
    // samla tills ledaren sätter upp kniven (chansen 0,3 gånger 1 - legitimiteten)
    const samla = (s: State, p: Person, ggr = 60) => { for (let i = 0; i < ggr; i++) { s.sport = undefined; if (spela(s, p) && (s.sport as SIM.Match | undefined)?.pris) return true; } return false; };
    const a = by(3), leg = SIM.legitimitet(a.s).v, p = a.v[1]!;
    const fick = samla(a.s, p);
    const med = SIM.living(a.s).filter(q => q.task?.act === 'sport' && q !== a.l);
    const op0 = med.reduce((x, q) => x + SIM.getRel(a.s, q, a.l).op, 0);
    korTills(a.s, () => !!a.s.matcher?.length, 3 * 3600);
    const mm = a.s.matcher?.at(-1), op1 = med.reduce((x, q) => x + SIM.getRel(a.s, q, a.l).op, 0);
    const vinn = a.s.people.find(q => q.id === a.kniv.agare), ber = mm ? SIM.matchBerattelse(a.s, mm) : '';
    const titel = vinn?.fame.find(f => f.startsWith('Vann tävlingen')), kron = (a.s.hist?.kronika ?? []).some(k => /tävlingen/.test(k[1]));
    // utan ledig sak: ingen tävling
    const b = by(4); b.kniv.agare = b.v[2]!.id;
    const utan = samla(b.s, b.v[1]!, 40);
    // saken finns inte kvar när matchen är slut
    const c = by(5); samla(c.s, c.v[1]!); const harPris = !!(c.s.sport as SIM.Match | undefined)?.pris; c.kniv.agare = c.v[3]!.id;
    korTills(c.s, () => !!c.s.matcher?.length, 3 * 3600);
    const mc = c.s.matcher?.at(-1);
    return [
      [`ledaren (legitimitet ${leg.toFixed(2)}) satte upp ${a.s.matcher?.at(-1)?.pris?.sak ?? 'inget'} som pris`, fick && mm?.pris?.k === 'kniv'],
      [`vinnaren äger kniven: ${vinn?.name ?? 'ingen'} (${mm?.vnamn ?? mm?.vinnLag ?? '-'} vann)`, !!vinn && mm?.pris?.fick === vinn.id && (mm.vinnare === vinn.id)],
      [`spelarna tycker bättre om ledaren (${op0.toFixed(0)} → ${op1.toFixed(0)} för ${med.length})`, med.length > 0 && op1 - op0 >= med.length * SIM.SPORT.tavlingTack * 0.5],
      [`titeln ${titel ?? 'ingen'} och en rad i krönikan`, (!!titel || vinn === a.l) && kron],
      [`redogörelsen säger priset och givaren: ${ber}`, ber.includes('kniv') && ber.includes(a.l.name) && !/\{|undefined/.test(ber)],
      ['utan ledig sak blir det en vanlig match', !utan && (b.s.stat?.tavlingar ?? 0) === 0],
      [`saken fanns inte kvar: ingen fick den (${mc ? SIM.matchBerattelse(c.s, mc) : '-'})`, harPris && !!mc?.pris && mc.pris.fick === undefined && c.kniv.agare === c.v[3]!.id],
    ];
  },
};
SCENARIER.sportplats = {
  text: 'Platserna i sporterna (steg 4.5.6.10–11): i dragkampen och snöbollskriget två lag på var sin sida om mitten, i brottningen två i mitten och de andra i en ring, i kast på en rad framför målet och i bollspelet den som slår i ena änden',
  kor: () => {
    const rader: [string, boolean][] = [];
    for (const k of ['dragkamp', 'brottning', 'kast', 'snoboll', 'bollspel']) {
      const s = rikDag(3), med = vuxna(s).slice(0, 4), l = SIM.bynsMitt(s), mx = l.x + 0.5, my = l.y + 0.5;
      match(s, k, med);
      const p = med.map(q => ({ x: q.task!.tx - mx, y: q.task!.ty - my })), d = p.map(o => Math.hypot(o.x, o.y));
      const f = (o: { x: number; y: number }) => `${o.x.toFixed(1)},${o.y.toFixed(1)}`;
      const ok = k === 'dragkamp' ? p.filter(o => o.x < 0).length === 2 && p.filter(o => o.x > 0).length === 2
        : k === 'brottning' ? d[0]! < 0.8 && d[1]! < 0.8 && d[2]! > 1.2 && d[3]! > 1.2
        : k === 'kast' ? p.every(o => Math.abs(o.x - p[0]!.x) < 0.6) && new Set(p.map(o => Math.round(o.y * 2))).size === 4 && SIM.kastMal(s.sport!).x - mx > 1
        : k === 'snoboll' ? p.filter(o => o.x < -1.5).length === 2 && p.filter(o => o.x > 1.5).length === 2
        : p[0]!.x < -2 && p.slice(1).every(o => o.x > p[0]!.x + 1);
      rader.push([`${SIM.SPORT_AV[k]!.namn}: ${p.map(f).join('  ')} (rutor från mitten)`, ok]);
    }
    return rader;
  },
};
SCENARIER.lag = {
  text: 'Lagen och vinnaren (steg 10.7.14): i dragkampen slumpas två lag när matchen börjar, och när tiden är slut vinner laget med högst summa av färdighet och slump. Det starkare laget vinner oftast men inte alltid, och alla i laget får vinsten',
  kor: () => {
    let ber = '', starkVann = 0, avgjorda = 0, skillnad = 0, vinster = 0, vinnare = 0, gar = 0, klara = 0;
    for (let i = 0; i < 20; i++) {
      const s = rikDag(3 + i, { rep: 4 }), med = vuxna(s).slice(0, 4), fard = [12, 10, 8, 6];
      med.forEach((q, j) => { q.skill.narstrid = fard[j]!; q.pot.styrka = q.pot.smidighet = 20; });
      match(s, 'dragkamp', med);
      let sett = false;
      korTills(s, () => !!s.matcher?.length, 3600, () => { const m = s.sport; if (m?.igang && !m.avgjord && med.some(q => q.task?.act === 'sport' && q.task.phase === 'go' && m.lag?.[q.id] !== undefined)) sett = true; });
      const mm = s.matcher?.find(x => !x.installd && x.vinnLag !== undefined);
      if (!mm) continue;
      klara++; if (sett) gar++; ber = SIM.matchBerattelse(s, mm);
      const lag = ([0, 1] as const).map(l => mm.spelare.filter(x => x.l === l));
      skillnad = Math.max(skillnad, Math.abs(lag[0]!.length - lag[1]!.length));
      const f = lag.map(l => l.reduce((a, x) => a + x.f, 0));
      if (f[0] !== f[1]) { avgjorda++; if ((f[0]! > f[1]!) === (mm.vinnLag === 0)) starkVann++; }
      vinnare += lag[mm.vinnLag!]!.length;
      vinster += med.reduce((a, q) => a + (q.sportVinst?.dragkamp ?? 0), 0);
    }
    return [
      [`${klara} av 20 matcher avgjordes mellan två lag, som skilde sig med högst ${skillnad} spelare`, klara >= 15 && skillnad <= 1],
      [`det starkare laget vann ${starkVann} av ${avgjorda}`, starkVann > avgjorda * 0.55 && starkVann < avgjorda],
      [`alla i vinnarlaget fick vinsten (${vinster} vinster, ${vinnare} i vinnarlagen)`, vinster === vinnare && vinnare > 0],
      [`matchen fortsatte medan spelarna gick till sin sida (i ${gar} av ${klara})`, gar >= 1],
      [`berättelsen nämner laget: ${ber}`, /aget med/.test(ber) && !/\{|undefined/.test(ber)],
    ];
  },
};
SCENARIER.matchpublik = {
  text: 'Publiken (steg 10.7.16): den som har fritid när en match pågår kan gå dit och titta, också den som är för gammal för att spela. Publiken står i en ring utanför spelarnas yta, blir glad när matchen avgörs, står i redogörelsen och berättelsen och går när matchen är slut',
  kor: () => {
    const s = rikDag(3), v = vuxna(s), med = v.slice(0, 2), w = v[2]!, gammal = v[3]!;
    gammal.born = s.now - 60 * SIM.DAY;
    for (const q of [w, gammal]) q.task = undefined;
    const vikt = [SIM.tittaVikt(s, w, 1)]; // ingen match: ingen vikt
    match(s, 'brottning', med);
    vikt.push(SIM.tittaVikt(s, w, 1), SIM.tittaVikt(s, med[0]!, 1), SIM.tittaVikt(s, gammal, 1), SIM.sportVikt(s, gammal, 1));
    const titta = (q: Person) => { const t = SIM.tittaVal(s, q); if (t) q.task = { act: 'titta', phase: 'go', tx: t.spot.x, ty: t.spot.y, until: s.now + t.dur, carry: 0, ref: t.ref, tool: t.tool, dark: false, why: t.why }; return !!t; };
    const valde = titta(w) && titta(gammal);
    const m = s.sport!, d = SIM.SPORT_AV.brottning!;
    let utanfor = true, sag = 0, medIMatchen = false;
    korTills(s, () => !!s.matcher?.length, 3600, () => {
      for (const q of [w, gammal]) if (q.task?.act === 'titta' && q.task.phase === 'do') { sag++; if (Math.hypot(q.x - m.x, q.y - m.y) < d.yta + 0.4 || Object.values(m.platser ?? {}).some(u => Math.hypot(u.x - q.x, u.y - q.y) < 0.4)) utanfor = false; }
      if ([w, gammal].some(q => q.task?.act === 'sport' || m.lista?.includes(q.id) || m.platser?.[q.id])) medIMatchen = true;
    });
    const mm = s.matcher?.[0], ber = mm ? SIM.matchBerattelse(s, mm) : '';
    const glad = [w, gammal].filter(q => q.thoughts.some(t => t.text === 'Såg brottning' && t.v > 0)).length;
    kor(s, 0.25);
    const kvar = [w, gammal].filter(q => q.task?.act === 'titta').length;
    return [
      [`vikten att titta: ${vikt.map(x => x.toFixed(2)).join(', ')} (utan match, under en match, för en spelare, för en över ${SIM.SPORT.alderTill} som inte får spela: titta och spela)`, vikt[0] === 0 && vikt[1]! > 0 && vikt[2] === 0 && vikt[3]! > 0 && vikt[4] === 0],
      [`två går och tittar (${valde ? 'ja' : 'nej'}) och står där i ${sag} steg, utanför spelarnas yta och platser`, valde && sag > 0 && utanfor],
      [`ingen i publiken går med i matchen`, !medIMatchen],
      [`publiken i redogörelsen: ${mm?.publik?.map(x => x.namn).join(', ') ?? 'ingen'}`, !!mm && !mm.installd && mm.publik?.length === 2],
      [`${glad} av 2 i publiken blev glada när matchen avgjordes`, glad === 2],
      [`berättelsen nämner publiken: ${ber}`, ber.includes(w.name) && /hejade|hejade på/.test(ber) && !/\{|undefined/.test(ber)],
      [`publiken går när matchen är slut (${kvar} kvar)`, kvar === 0],
    ];
  },
};
SCENARIER.sportsaker = {
  text: 'Sportens föremål (steg 4.3.1.2): byn gör ett mål, en boll och ett slagträ när den har vuxna nog, föremålen slits när man spelar, och den som vunnit flest matcher i en sport får det i sitt eftermäle. Sporterna är rader i registret, och bågskyttet (steg 10.7.21) spelas med var sin egen båge, som slits',
  kor: () => {
    const s = rikDag(3, { rep: 4 });
    const vill = ['mal', 'boll', 'slagtra'].map(k => SIM.villAv(s, k));
    const utan = SIM.SPORTER.filter(d => d.foremal.length && !d.foremal.every(k => SIM.amountOf(s, k) >= 1)).map(d => d.id);
    const v = vuxna(s), a = v[0]!, b = v[1]!;
    a.skill.traff = 20; b.skill.traff = 0;
    SIM.newTing(s, 'mal', 1, a.id);
    let matcher = 0;
    for (let i = 0; i < 6; i++) {
      klockan(s, 10); tandEld(s); // elden brinner, så att ingen går från matchen för att tända den
      match(s, 'kast', [a, b]); kor(s, 2); matcher++;
      if (i < 5) s.now += 20 * SIM.HOUR;
    }
    const mal = (s.ting ?? []).find(t => t.k === 'mal');
    // bågskyttet (steg 10.7.21): med var sin egen båge, målet och pilarna; utan egen båge går ingen med
    const bs = rikDag(3), [x1, x2, x3] = vuxna(bs) as [Person, Person, Person];
    SIM.newTing(bs, 'mal', 1, SIM.BYN); SIM.setAmount(bs, 'pilar', 10);
    for (const t of (bs.ting ?? []).filter(t => t.k === 'bage')) t.agare = SIM.BYN; // ingen äger en båge
    const lanad = SIM.newTing(bs, 'bage', 1, SIM.BYN);
    match(bs, 'bagskytte', [x1, x2]); const utanB = [x1, x2].filter(q => q.task?.act === 'sport').length;
    bs.sport = undefined; lanad.agare = x3.id;
    const bagar = [x1, x2].map(q => SIM.newTing(bs, 'bage', 1, q.id)), traff0 = x1.skill.traff + x2.skill.traff;
    klockan(bs, 10); tandEld(bs); match(bs, 'bagskytte', [x1, x2]);
    const namn = x1.task ? SIM.taskName(x1.task) : '';
    kor(bs, 1.5);
    const bm = bs.matcher?.find(x => x.k === 'bagskytte'), slit = bagar.filter(t => t.c < 1).length, traff1 = x1.skill.traff + x2.skill.traff;
    const radOk = SIM.SPORTER.every(d => SIM.ACTS.sport.verktyg?.[d.id] === d.gor && SIM.ACTS.titta.verktyg?.[d.id] === d.titta && !!SIM.UPPSTALL[d.upp]);
    return [
      ['varje sport är en rad: uppgiftens namn, uppställningen och bilden står i registret', radOk],
      [`utan egen båge går ingen med i bågskyttet (${utanB} gick med)`, utanB === 0],
      [`bågskyttet blev av (${bm?.k ?? 'ingen'}, ${namn}): ${slit} av två bågar slitna, träffsäkerheten ${traff0.toFixed(2)} → ${traff1.toFixed(2)}`, bm?.k === 'bagskytte' && namn === 'Skjuter mot målet' && slit === 2 && traff1 > traff0],
      [`byn vill ha ${vill.join(', ')} av målet, bollen och slagträet`, vill.every(n => n === 1)],
      [`utan föremålen kan byn inte spela ${utan.join(' och ')}`, utan.includes('kast') && utan.includes('bollspel')],
      [`${a.name} vann ${a.sportVinst?.kast ?? 0} av ${matcher} matcher i kast, ${b.name} ${b.sportVinst?.kast ?? 0}`, (a.sportVinst?.kast ?? 0) >= 5 && (a.sportVinst?.kast ?? 0) > (b.sportVinst?.kast ?? 0)],
      [`${a.name}s eftermäle: ${a.fame.join(', ') || 'inget'}`, a.fame.includes('Den bästa i kast mot mål') && s.sportBast?.kast === a.id],
      [`målet har slitits till ${mal ? mal.c.toFixed(2) : 'inget'}`, !!mal && mal.c < 1],
    ];
  },
};

SCENARIER.snoboll = {
  text: 'Lek i snön (steg 4.3.1.3): när snön ligger har de vuxna snöbollskrig i byn, och barnen leker i snön. Utan snö blir det inget snöbollskrig',
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
    const l = SIM.bynsMitt(s);
    s.sport = { k: 'snoboll', x: l.x + 0.5, y: l.y + 0.5, start: s.now, slut: s.now + SIM.HOUR };
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
// p försöker uppträda tills hen gör det (eller det inte går): som om hen prövat många kvällar klockan 18 till nu
export function upptrad(s: State, p: Person, ganger = 300) {
  for (let i = 0; i < ganger; i++) {
    delete p.framProv;
    const fr = SIM.framVal(s, p);
    if (fr?.act === 'upptrada') { p.task = { act: 'upptrada', phase: 'go', tx: fr.spot?.x ?? p.x, ty: fr.spot?.y ?? p.y, until: s.now + fr.dur, carry: 0, ref: fr.ref, tool: fr.tool, dark: true, why: fr.why }; return true; }
  }
  return false;
}
SCENARIER.framtradande = {
  text: 'Framträdandena (steg 4.3.2.1 och 10.7.9): på kvällen kallar den som vill uppträda, högst en gång per kväll, och väntar 15 minuter vid scenen eller elden. De som vill lyssna avbryter det de gör och går dit, också den som arbetar långt bort; den som sover väcks inte, och den som fryser farligt värmer sig först. Publiken sitter vid scenen. Publiken blir glad, framträdandet får en kort text, och den som uppträder övar',
  kor: () => {
    const { s, v } = kvall(), p = v[0]!, fore = p.skill[SIM.FRAM_SKILL];
    for (const q of s.people) for (const r of s.people) if (q !== r) SIM.getRel(s, q, r).op = 100; // alla vill lyssna
    // en som arbetar långt bort, en som sover och en som fryser farligt
    const [, borta, sover, fryser] = v as [Person, Person, Person, Person];
    const f0 = SIM.eldPlats(s);
    borta.x = Math.max(1, f0.x - 25); borta.y = f0.y + 0.5; borta.task = { act: 'hantverk', phase: 'do', tx: borta.x, ty: borta.y, until: s.now + 3 * SIM.HOUR, carry: 0, dark: !SIM.isLight(s.now) };
    sover.task = { act: 'vila', phase: 'do', tx: sover.x, ty: sover.y, until: s.now + 8 * SIM.HOUR, carry: 0, dark: !SIM.isLight(s.now), why: 'Är trött' }; sover.rest = 0.05; sover.toa = 1; // sover hela framträdandet
    fryser.warm = SIM.KROPP.farligt - 0.05;
    const borjar = upptrad(s, p), d = s.fram ? SIM.FRAM_AV[s.fram.k]!.namn : 'inget', lista = s.fram?.lista ?? [];
    const avbrot = !borta.task, sov = sover.task?.act === 'vila';
    SIM.chooseTask(s, fryser); const varmer = fryser.task?.act === 'varma';
    kor(s, 0.25);
    const lyss = v.slice(1).filter(q => q.task?.act === 'lyssna').length, bortaKom = borta.task?.act === 'lyssna', sovKom = sover.task?.act === 'lyssna';
    kor(s, 1.5);
    const glad = v.slice(1).filter(q => q.thoughts.some(t => t.text.startsWith('Lyssnade på'))).length;
    const minne = s.framtradanden?.at(-1);
    // samma kväll blir det inget till, och inte heller på dagen
    const igen = !upptrad(s, v[1]!);
    const dag = kvall(3, 11), pDag = !upptrad(dag.s, dag.v[0]!);
    // publiken sitter vid scenen: framför den, inte bakom en vägg
    const m = medScen(3, []), mp = m.v[0]!;
    for (const q of m.s.people) for (const r of m.s.people) if (q !== r) SIM.getRel(m.s, q, r).op = 100;
    upptrad(m.s, mp); kor(m.s, 0.3);
    const vid = SIM.vidStation(m.sc), pub = m.v.slice(1).filter(q => q.task?.act === 'lyssna');
    const nara = pub.filter(q => Math.hypot(q.task!.tx - vid.x, q.task!.ty - vid.y) <= 6 && q.task!.ty > vid.y && !SIM.blocked(m.s, q.task!.tx, q.task!.ty)).length;
    // en ny by kan bara kväda: ingen behöver något mer
    const ny = createState(9, START), kan = SIM.FRAMTRADANDEN.filter(x => !x.instrument && !(x.min ?? 0)).map(x => x.id);
    return [
      [`${p.name} kallar till ett framträdande (${d}), och ${lista.length} av ${v.length - 1} vill lyssna`, borjar && lista.length >= v.length - 2],
      [`efter väntan lyssnar ${lyss} av ${v.length - 1}`, lyss >= 1],
      [`den som arbetar långt bort avbryter (${avbrot ? 'ja' : 'nej'}) och kommer (${bortaKom ? 'ja' : 'nej'})`, avbrot && bortaKom],
      [`den som sover väcks inte (${sov ? 'sover' : 'vaknade'}) och sover vidare medan hen är trött (${sovKom ? 'gick dit' : 'sover'})`, sov && !sovKom],
      [`den som fryser farligt värmer sig först (${fryser.task?.act})`, varmer],
      [`${glad} i publiken är glada efteråt`, glad >= 2],
      [`texten: ${minne?.text ?? 'ingen'}`, !!minne && minne.n >= 2 && minne.text.includes(p.name)],
      [`${p.name} övade ${SIM.FRAM_SKILL} (${fore.toFixed(2)} → ${p.skill[SIM.FRAM_SKILL].toFixed(2)})`, p.skill[SIM.FRAM_SKILL] > fore],
      ['samma kväll blir det inget framträdande till', igen],
      ['på dagen blir det inget', pDag],
      [`vid scenen sitter ${nara} av ${pub.length} i publiken framför den`, pub.length >= 2 && nara === pub.length],
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
SCENARIER.forelasning = {
  text: 'Steg 10.6.9: föreläsningens ämne. Föreläsningen handlar om en sak som föreläsaren kan och andra i byn saknar, en teknik på nivå 1 eller 2 eller en färdighet, och alla som lyssnar kommer säkert framåt i just den, mer ju längre och bättre föreläsningen är. Den som inte kan något som någon annan saknar kan inte föreläsa',
  kor: () => {
    const { s, v } = kvall(), p = v[0]!, pub = v.slice(1, 5);
    const lika = (x: Person) => { for (const k of SIM.SKILLS) x.skill[k] = 5; };
    for (const q of s.people) lika(q);
    // en teknik på nivå 2 som bara p kan, och vars krav alla kan
    const t2 = TEKNIK.find(t => t.niva === 2 && t.krav.length > 0)!, t3 = TEKNIK.find(t => t.niva === 3)!;
    for (const q of s.people) { q.tek ??= {}; for (const k of [...t2.krav, ...t3.krav]) q.tek[k] = 1; delete q.tek[t2.id]; delete q.tek[t3.id]; }
    p.tek![t2.id] = 1;
    const amne = SIM.forelasAmne(s, p);
    const fore = pub.map(q => JSON.stringify({ tek: { ...q.tek, [t2.id]: 0 }, skill: q.skill }));
    s.fram = { lar: amne, k: 'forelasning', p: p.id, start: s.now, slut: s.now + SIM.HOUR, publik: pub.map(q => q.id), text: 'x', da: 'x', amne: 'x' };
    p.task = { act: 'upptrada', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '', ref: s.now, tool: 'forelasning' };
    SIM.upptradaKlar(s, p, p.task);
    const fram = pub.map(q => q.tek?.[t2.id] ?? 0), efter = pub.map(q => JSON.stringify({ tek: { ...q.tek, [t2.id]: 0 }, skill: q.skill }));
    // texten i ett riktigt framträdande nämner ämnet
    let text = '';
    for (let i = 0; i < 40 && !text; i++) { const k = kvall(3 + i), a = k.v[0]!; for (const q of k.s.people) { lika(q); q.tek ??= {}; for (const x of t2.krav) q.tek[x] = 1; delete q.tek[t2.id]; } a.tek![t2.id] = 1; a.skill[SIM.FRAM_SKILL] = 8; if (upptrad(k.s, a) && k.s.fram!.k === 'forelasning') text = k.s.fram!.text; }
    // bara nivå 3: inget ämne, och då ingen föreläsning
    delete p.tek![t2.id]; p.tek![t3.id] = 1;
    const tre = SIM.forelasAmne(s, p);
    let aldrig = true;
    for (let i = 0; i < 40; i++) { const k = kvall(3 + i), a = k.v[0]!; for (const q of k.s.people) { lika(q); q.skill[SIM.FRAM_SKILL] = 8; } for (const q of k.s.people) if (q !== a) { q.tek ??= {}; for (const x of Object.keys(a.tek ?? {})) q.tek[x] = 1; } if (upptrad(k.s, a) && k.s.fram!.k === 'forelasning') aldrig = false; }
    const fr = SIM.TEKNIK.find(t => t.id === t2.id)!.namn.toLowerCase();
    return [
      [`ämnet är tekniken på nivå 2 som bara föreläsaren kan (${amne && 'tek' in amne ? amne.tek : 'inget'})`, !!amne && 'tek' in amne && amne.tek === t2.id],
      [`fyra åhörare får samma framsteg i ${fr} (${fram.map(x => x.toFixed(2)).join(', ')})`, fram.every(x => x > 0 && Math.abs(x - fram[0]!) < 1e-9)],
      ['och i inget annat', efter.every((x, i) => x === fore[i])],
      [`texten nämner ämnet (${text || 'ingen föreläsning'})`, text.includes(O.goraUtan(t2))],
      [`en teknik på nivå 3 väljs aldrig (${tre ? 'ett ämne' : 'inget ämne'})`, !tre],
      ['den som inte kan något andra saknar föreläser aldrig', aldrig],
    ];
  },
};

SCENARIER.lagskrift = {
  text: 'Steg 10.6.10: skrivna lagar. En lag som står skriven på en runsten, ett blad eller i en lagbok behöver byn inte hålla i minnet, så varje skriven lag höjer taket för antalet lagar med ett, upp till 12. Ändras straffet eller tas lagen bort räknas skriften inte, och påbudet Skriv ner lagarna styr hur gärna det görs',
  kor: () => {
    const s = createState(6, START), v = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen), p = v[0]!;
    for (const r of v) { r.sorg = []; r.bedrift = undefined; r.tro = undefined; }
    p.tek = { ...(p.tek ?? {}), stenhuggarplats: 1 };
    const ids = Object.keys(SIM.LAGAR), lag = (id: string) => ({ id, t: s.now, straff: SIM.LAGAR[id]!.straff, av: p.id, om: 'x' });
    s.styre = { historia: [], oppna: [] } as NonNullable<State['styre']>;
    s.styre!.lagar = ids.slice(0, 6).map(lag);
    const tak0 = SIM.lagTak(s);
    const rista = () => { const l = SIM.runstenLust(s, p), at = SIM.runstenPlats(s)!; if (l?.slag !== 'lag') return; SIM.runstenKlar(s, p, { act: 'runsten', phase: 'do', tx: at.x + 0.5, ty: at.y + 0.5, until: s.now, carry: 0, why: '', tool: 'lag', ref: l.om.id }); };
    rista(); rista();
    const stenar = (s.runstenar ?? []).filter(r => r.lag).length, tak2 = SIM.lagTak(s);
    s.runstenar = s.runstenar!.slice(1);
    const tak1 = SIM.lagTak(s);
    const kvar = s.runstenar![0]!.lag!, l = s.styre!.lagar!.find(x => x.id === kvar.id)!;
    l.straff = (l.straff + 1) % SIM.STRAFF_NAMN.length;
    const takStraff = SIM.lagTak(s);
    l.straff = kvar.straff;
    s.styre!.lagar = s.styre!.lagar!.filter(x => x !== l);
    const takBort = SIM.lagTak(s), skrivenBort = SIM.skrivenLag(s, { ...l });
    // tretton skrivna lagar: taket blir aldrig över 12
    const t = createState(6, START); t.styre = { historia: [], oppna: [] } as NonNullable<State['styre']>; t.styre!.lagar = ids.slice(0, 13).map(lag);
    t.runstenar = t.styre!.lagar!.map((x, i) => ({ id: i + 1, x: i, y: 0, t: t.now, slag: 'lag' as const, av: { id: p.id, namn: p.name }, om: { id: i, namn: x.id }, text: '', runor: '', lag: { id: x.id, straff: x.straff } }));
    const takMax = SIM.lagTak(t);
    // påbudet på lägsta: ingen vill skriva
    const ledare = v[1]!;
    s.styre = { historia: [{ id: ledare.id, namn: ledare.name, titel: 'Ålderman', fran: s.now }], oppna: ['rang'], ledare: ledare.id, sedan: s.now, titel: 'Ålderman', satt: 1, pabud: { matlager: 0, vedlager: 0, torkat: 0, lagskrift: -1 } as never, lagar: ids.slice(0, 6).map(lag) } as NonNullable<State['styre']>;
    const lagst = SIM.lagSkrivVikt(s), lustLagst = SIM.runstenLust(s, p)?.slag;
    return [
      [`med sex lagar och taket ${tak0} ristas två lagar, och taket blir ${tak2}`, tak0 === 6 && stenar === 2 && tak2 === 8],
      [`en sten rivs och taket blir ${tak1}`, tak1 === 7],
      [`ett ändrat straff gör att skriften inte räknas (taket ${takStraff})`, takStraff === 6],
      [`en borttagen lag räknas inte heller (taket ${takBort}, men stenen står kvar)`, takBort === 6 && (s.runstenar?.length ?? 0) === 1 && skrivenBort],
      [`taket går aldrig över 12 (${takMax} med 13 skrivna lagar)`, takMax === 12],
      [`med påbudet på lägsta skriver ingen (vikten ${lagst}, ${lustLagst ?? 'ingen lust'})`, lagst === 0 && lustLagst !== 'lag'],
    ];
  },
};

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
      if (!upptrad(b.s, p) || b.s.fram!.inst !== 'lyra' || b.s.fram!.grupp) continue; // ensam (gruppen prövas i framgrupp)
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
      [`nivåerna: ${tek.join(', ')}`, tek.join() === 'scen 3,trumma 2,benflojt 2,lyra 4'], // scenen kräver klyvplatsen (steg 10.2.90)
    ];
  },
};

SCENARIER.framgrupp = {
  text: 'Steg 10.7.11: flera uppträder tillsammans. När den som kallar valt sång, musik eller teater kan andra som vill stå på scenen med hen, och kvaliteten blir den bästas plus en fjärdedel av de andras, gånger det bästa instrumentet. Alla i gruppen övar och står i minnet, och varje instrument som spelats slits. Tal, föreläsning och kväde görs bara ensam',
  kor: () => {
    let m: SIM.FramMinne | undefined, bast = 0, ovat = 0, n = 0, slitna = 0, ensam = 0, ensamGrupp = 0;
    for (let i = 0; i < 60 && !m; i++) {
      const x = medScen(3 + i, ['lyra', 'trumma']), [p, q] = x.v as [Person, Person];
      for (const a of x.s.people) for (const b of x.s.people) if (a !== b) SIM.getRel(x.s, a, b).op = 100;
      p.skill[SIM.FRAM_SKILL] = 8; q.skill[SIM.FRAM_SKILL] = 7; q.pot.karisma = 20;
      if (!upptrad(x.s, p)) continue;
      const f = x.s.fram!;
      if (!SIM.FRAM_AV[f.k]!.grupp) { ensam++; if (f.grupp?.length) ensamGrupp++; continue; }
      if (!f.grupp?.length || !f.inst) continue;
      const folk = [p, ...f.grupp.map(g => SIM.byId(x.s, g.id)!)], fore = folk.map(z => z.skill[SIM.FRAM_SKILL]);
      kor(x.s, 1.5);
      const mm = x.s.framtradanden?.at(-1);
      if (!mm || mm.inget || !mm.grupp?.length) continue;
      m = mm; n = folk.length;
      const inst = [f.inst, ...f.grupp.map(g => g.inst)].filter((k): k is string => !!k);
      bast = Math.max(...folk.map(z => SIM.framKval(x.s, z))) * Math.max(...inst.map(k => SIM.INSTRUMENT[k]!.kval));
      ovat = folk.filter((z, j) => z.skill[SIM.FRAM_SKILL] > fore[j]!).length;
      slitna = (x.s.ting ?? []).filter(t => (t.k === 'lyra' || t.k === 'trumma') && t.c < 1).length;
    }
    // tal, föreläsning och kväde görs alltid ensam
    for (let i = 0; i < 40; i++) {
      const x = kvall(3 + i), p = x.v[0]!;
      for (const a of x.s.people) for (const b of x.s.people) if (a !== b) SIM.getRel(x.s, a, b).op = 100;
      p.skill[SIM.FRAM_SKILL] = 8; for (const q of x.v.slice(1)) q.pot.karisma = 20;
      if (!upptrad(x.s, p)) continue;
      if (SIM.FRAM_AV[x.s.fram!.k]!.grupp) continue; // teatern kan göras i grupp
      ensam++; if (x.s.fram!.grupp?.length) ensamGrupp++;
    }
    return [
      [`en grupp på ${n} uppträdde (${m?.k ?? 'ingen'}): ${m?.text ?? ''}`, !!m && n >= 2 && !!m.grupp?.length],
      [`kvaliteten ${m?.q ?? 0} är högre än den bästa ensam med det bästa instrumentet (${bast.toFixed(2)})`, !!m && m.q > bast + 0.01],
      [`${ovat} av ${n} i gruppen övade`, n >= 2 && ovat === n],
      [`gruppen står i minnet (${m?.grupp?.map(g => g.namn).join(', ') ?? 'ingen'}) och i berättelsen`, !!m?.grupp?.length && m.grupp.every(g => m!.text.includes(g.namn))],
      [`${slitna} av två instrument slits`, slitna === 2 || (m?.grupp?.length ?? 0) > 0 && m!.k === 'sang' && slitna >= 1],
      [`ett tal, en föreläsning eller ett kväde görs ensam (${ensamGrupp} i grupp av ${ensam})`, ensam >= 5 && ensamGrupp === 0],
    ];
  },
};
// p uppträder (med budskapet hen väljer) och framträdandet går till slut: texten och budskapet
function framfor(s: State, p: Person) {
  if (!upptrad(s, p)) return undefined;
  const bud = s.fram!.bud, text = s.fram!.text;
  kor(s, 1.5);
  return { bud, text };
}
const snitt = (s: State, l: Person, qs: Person[]) => qs.reduce((a, q) => a + SIM.getRel(s, q, l).op, 0) / qs.length;
SCENARIER.budskap = {
  text: 'Budskapen (steg 4.3.2.3): den som uppträder väljer budskapet efter sina egna intryck och sin tro. Om en person sprids ryktet till publiken, en hyllning gör att publiken tycker bättre om ledaren och ett hån sämre, och ledaren tycker sämre om den som hånar. Ledaren kan förbjuda hån som påbud. Ett budskap om tron kan övertyga någon',
  kor: () => {
    // om en person: ett barn som inte sitter vid elden, och som den som uppträder tror är en tjuv
    const a = kvall(), p = a.v[0]!, q = SIM.living(a.s).find(x => SIM.ageOf(x, a.s.now) < SIM.ALDER.vuxen) ?? a.v[a.v.length - 1]!;
    if (q.task?.act === 'samtal') q.task = undefined;
    p.intryck = [{ om: q.id, namn: q.name, k: 'tjuv', v: 1.5, c: 1, t: a.s.now }];
    const pa = framfor(a.s, p), hort = a.v.slice(1).filter(b => b !== q && SIM.intryckOm(b, q.id, 'tjuv')).length;
    // om ledaren: hyllning och hån
    const styr = (op: number, ban = false) => {
      const k = kvall(8), u = k.v[0]!, l = k.v[1]!, andra = k.v.slice(2);
      k.s.styre = { ledare: l.id, historia: [], oppna: [], ...(ban ? { pabud: { matlager: 0, vedlager: 0, torkat: 0, han: -1 } } : {}) } as unknown as typeof k.s.styre;
      SIM.getRel(k.s, u, l).op = op; for (const q of andra) SIM.getRel(k.s, q, u).op = 50; // publiken vill lyssna (steg 10.7.9)
      const tillat = SIM.hanTillat(k.s), fore = snitt(k.s, l, andra), r = framfor(k.s, u);
      return { bud: r?.bud, text: r?.text ?? '', d: snitt(k.s, l, andra) - fore, led: SIM.getRel(k.s, u, l).op, tillat };
    };
    const hy = styr(60), ha = styr(-60), fri = styr(-60).tillat, ban = styr(-60, true).tillat;
    // om tron: den som uppträder tror starkt, och de andra är andliga men tror inte på något
    let tro = 0, overtygad = 0, troText = '';
    for (let i = 0; i < 20; i++) {
      const t = kvall(3 + i), u = t.v[0]!;
      t.s.tron = [{ id: 1, grundare: u.id, gnamn: u.name, t: t.s.now, k: 'blixt', bakom: 'Den som bor i åskmolnen', vill: 'att man tystnar när det mullrar', svek: 'blixten slår ner', natur: 50, manga: 50, bekr: t.s.now, ar: 0 } as SIM.Tro];
      u.tro = 1; u.troStyrka = 100; u.andlig = 100; u.pot.karisma = 20; // en karismatisk predikant, så att slumpen inte avgör
      for (const b of t.v.slice(1)) { b.andlig = 100; b.tro = undefined; }
      const r = framfor(t.s, u);
      if (r?.bud === 'tro') { tro++; troText = r.text; overtygad += t.v.slice(1).filter(b => b.tro === 1).length; }
    }
    return [
      [`om en person (${pa?.bud ?? 'inget'}): ${pa?.text ?? ''} ${hort} av ${a.v.length - 1} i publiken hörde ryktet`, pa?.bud === 'person' && hort >= 1],
      [`hyllning (${hy.bud}): ${hy.text} Publiken tycker ${hy.d.toFixed(1)} bättre om ledaren`, hy.bud === 'hylla' && hy.d > 0],
      [`hån (${ha.bud}): ${ha.text} Publiken tycker ${(-ha.d).toFixed(1)} sämre om ledaren, och ledaren och den som hånade har ${ha.led.toFixed(0)}`, ha.bud === 'hana' && ha.d < 0 && ha.led < -60],
      [`när ledaren förbjudit hån är hånet tillåtet till ${ban.toFixed(2)} mot ${fri.toFixed(2)} utan förbud`, ban < fri],
      [`om tron ${tro} av 20 gånger (${troText}), och ${overtygad} blev övertygade`, tro >= 10 && overtygad >= 1],
    ];
  },
};
SCENARIER.bestalld = {
  text: 'Beställda framträdanden (steg 4.3.2.4): ledaren betalar den som ska uppträda med en hel sak ur sin egen egendom, och framträdandet hyllar då ledaren. Ledaren ger den minst värda lediga saken, inget när hen inget har, och den som avskyr ledaren tackar nej',
  kor: () => {
    // vid: om ledaren har något att betala med; op: vad den som uppträder tycker om ledaren
    const forsok = (seed: number, vid: boolean, op: number) => {
      const k = kvall(seed), u = k.v[0]!, l = k.v[1]!;
      k.s.styre = { ledare: l.id, historia: [], oppna: [] } as unknown as typeof k.s.styre;
      for (const t of SIM.tingOf(k.s)) if (t.agare === l.id) t.agare = SIM.BYN;
      const kniv = vid ? SIM.newTing(k.s, 'kniv', 1, l.id) : undefined, yxa = vid ? SIM.newTing(k.s, 'yxa', 1, l.id) : undefined;
      SIM.getRel(k.s, u, l).op = op;
      const fore = k.s.stat?.framBestalld ?? 0, r = framfor(k.s, u), betalt = (k.s.stat?.framBestalld ?? 0) > fore;
      return { r, betalt, kniv: kniv?.agare === u.id, yxa: yxa?.agare === u.id, minne: k.s.framtradanden?.at(-1)?.betalt };
    };
    let ja: ReturnType<typeof forsok> | undefined, n = 0, tomt = 0, nej = 0;
    for (let i = 0; i < 30; i++) {
      const f = forsok(3 + i, true, 0);
      if (f.r) n++;
      if (f.betalt && !ja) ja = f;
      if (forsok(3 + i, false, 0).betalt) tomt++;
      if (forsok(3 + i, true, -60).betalt) nej++;
    }
    return [
      [`ledaren beställer ibland (${ja ? 'ja' : 'aldrig'} på ${n} framträdanden): ${ja?.r?.text ?? ''}`, !!ja],
      [`det beställda hyllar ledaren (${ja?.r?.bud})`, ja?.r?.bud === 'hylla'],
      [`ledaren betalar med kniven, den minst värda, och behåller yxan (minnet säger ${ja?.minne})`, !!ja?.kniv && !ja.yxa && ja.minne === 'kniv'],
      [`en ledare utan egendom beställer inget (${tomt} gånger)`, tomt === 0],
      [`den som avskyr ledaren tackar nej (${nej} gånger)`, nej === 0],
    ];
  },
};
SCENARIER.kyrkfram = {
  text: 'Kyrkans framträdanden (steg 10.7.18): en tro som står åt Sprider sig röstar om att betala ett framträdande, kyrkan lägger undan två hela saker av det den har mest av, och den troende som nästa gång uppträder med ett budskap får dem som sin egendom och talar om tron. Redogörelsen säger vem som betalade och med vad',
  kor: () => {
    const tro = (s: State, u: Person, sprid: number) => {
      s.tron = [{ id: 1, grundare: u.id, gnamn: u.name, t: s.now, k: 'blixt', bakom: 'Den som bor i åskmolnen', vill: 'att man tystnar när det mullrar', svek: 'blixten slår ner', natur: 50, manga: 50, bekr: s.now, ar: 0, sk: { sprid, prast: 50, oppen: 50 } } as SIM.Tro];
      for (const q of vuxna(s)) { q.tro = 1; q.troStyrka = 80; q.andlig = 90; }
      const tr = s.tron[0]!, k = SIM.kyrkaId(1);
      SIM.put(s, 'bar', 5, { [k]: 5 }); SIM.put(s, 'sten', 3, { [k]: 3 });
      return tr;
    };
    // omröstningen: med Sprider sig är framträdandet det som väger tyngst, med Ärvs finns det inte
    const a = kvall(3), tA = tro(a.s, a.v[0]!, 15), vad = SIM.utgiftNu(a.s, tA);
    const b = kvall(3), tB = tro(b.s, b.v[0]!, 85), vadArvs = SIM.utgiftNu(b.s, tB);
    const gick = SIM.rostaOm(a.s, { f: 'kyrkutgift', d: { tro: 1, vad: 'fram' }, fram: a.v[0]!.id });
    const lagt = tA.framPris;
    // utbetalningen: den troende som uppträder med ett budskap
    let fick = '', bud: string | undefined, kvar = -1, eget = 0, minne: SIM.FramMinne | undefined, ber = '', forsok = 0;
    for (let i = 0; i < 20 && !fick; i++) {
      const k = kvall(3 + i), tr = tro(k.s, k.v[0]!, 15), u = k.v[1]!;
      for (const q of k.v) for (const r of k.v) if (q !== r) SIM.getRel(k.s, q, r).op = 100; // alla vill lyssna
      tr.framPris = 'bar'; forsok++;
      const fore = SIM.ownsAmount(k.s, u, 'bar');
      if (!upptrad(k.s, u) || !k.s.fram?.kyrka) continue;
      fick = k.s.fram.betalt ?? ''; bud = k.s.fram.bud; kvar = SIM.kyrkansAv(k.s, tr, 'bar'); eget = SIM.ownsAmount(k.s, u, 'bar') - fore;
      kor(k.s, 1.5);
      minne = k.s.framtradanden?.at(-1); ber = minne ? SIM.framBerattelse(k.s, minne) : '';
      if (tr.framPris) fick = 'kvar';
    }
    return [
      [`kyrkans utgift med Sprider sig: ${vad}, med Ärvs: ${vadArvs ?? 'ingen'}`, vad === 'fram' && vadArvs !== 'fram'],
      [`de troende röstade ${gick ? 'ja' : 'nej'}, och kyrkan lade undan ${lagt ?? 'inget'} (det den har mest av)`, !!gick && lagt === 'bar'],
      [`den som uppträdde fick ${fick || 'inget'} (${forsok} försök): ${eget} bär till sin egendom, kyrkan har ${kvar} kvar`, eget === SIM.KYRKA.framPris && kvar === 5 - SIM.KYRKA.framPris],
      [`budskapet handlar om tron eller en död troende (${bud})`, bud === 'tro' || bud === 'person'],
      [`redogörelsen säger vem som betalade: ${minne?.kyrka ?? 'ingen'} med ${minne?.betalt ?? 'inget'}. ${ber}`, !!minne?.kyrka && /två/.test(minne.betalt ?? '') && !/\{|undefined/.test(ber)],
    ];
  },
};
SCENARIER.skaldskap = {
  text: 'Skaldskapen (steg 4.3.2.5): färdigheten för att uppträda. Den börjar av berättandet, växer när man uppträder och när man berättar i samtalen, och gör framträdandet bättre och fler former möjliga',
  lang: true,
  kor: () => {
    const ny = createState(9, START), start = ny.people.every(p => Math.abs(p.skill.skaldskap - p.skill.berattande * SIM.SKALD_START) < 1e-9);
    const { s, v } = kvall(), p = v[0]!;
    p.skill.skaldskap = 0; const lag = SIM.framKval(s, p), kanLag = SIM.FRAMTRADANDEN.filter(d => (d.min ?? 0) <= p.skill.skaldskap).length;
    p.skill.skaldskap = 10; const hog = SIM.framKval(s, p), kanHog = SIM.FRAMTRADANDEN.filter(d => (d.min ?? 0) <= p.skill.skaldskap).length;
    p.skill.skaldskap = 3; upptrad(s, p); kor(s, 1.5); const efter = p.skill.skaldskap, ggr = p.gjort?.t.upptradt ? 1 : 0;
    // i samtalen: de som berättar men aldrig uppträder blir också bättre
    let vaxte = 0;
    for (const seed of [5, 6, 7]) { // tre byar: i en enda by kan några berättelser avgöra
      const d = rikDag(seed);
      for (const q of SIM.living(d)) q.skill.berattande = Math.max(q.skill.berattande, 10); // vana berättare väljer oftare att berätta vid elden på kvällen
      const fore = new Map(SIM.living(d).map(q => [q.id, q.skill.skaldskap]));
      kor(d, 48);
      vaxte += SIM.living(d).filter(q => !q.gjort?.t.upptradt && (q.skill.skaldskap ?? 0) > (fore.get(q.id) ?? Infinity)).length;
    }
    return [
      [`färdigheten heter ${SIM.SKILL_NAMES[SIM.FRAM_SKILL]}`, SIM.FRAM_SKILL === 'skaldskap' && SIM.SKILL_NAMES.skaldskap === 'Skaldskap'],
      ['de nya i byn börjar med hälften av sitt berättande', start],
      [`skaldskap 0 ger kvaliteten ${lag.toFixed(2)} och ${kanLag} former, skaldskap 10 ger ${hog.toFixed(2)} och ${kanHog}`, hog > lag && kanHog > kanLag],
      [`den som uppträder övar (3 → ${efter.toFixed(2)}, räknat ${ggr})`, efter > 3 && ggr === 1],
      [`${vaxte} som aldrig uppträtt blev bättre av att berätta i samtalen på två dygn i tre byar`, vaxte >= 1],
    ];
  },
};
SCENARIER.konst = {
  text: 'Konsten i sakerna (steg 4.3.3): ett mästerverk (inte kläderna) får ristningar eller en målning av en person eller händelse som göraren minns, helst en död. Motivet står i berättelsen om saken, höjer värdet och gör att byn minns den döde längre',
  kor: () => {
    const s = rikDag(3), [g, d, a] = vuxna(s) as [Person, Person, Person];
    SIM.die(s, d, 'sjukdom');
    g.intryck = [{ om: d.id, namn: d.name, k: 'vargdodare', v: 1, c: 1, t: s.now, bev: [{ h: 'vargdodare', t: s.now, sett: true }] }];
    // mästerverk tills ett får ett motiv (det avgörs av sakens id)
    let yxa: SIM.Ting | undefined, utan = 0;
    for (let i = 0; i < 10 && !yxa; i++) { const t = SIM.newTing(s, 'yxa', 1, g.id); t.q = 4; SIM.sakMinne(s, g, t); if (t.ber?.mo) yxa = t; else utan++; }
    const ber = yxa ? SIM.sakBerattelse(s, yxa, 'Yxa') : '';
    const vanlig = SIM.newTing(s, 'yxa', 1, g.id); vanlig.q = 4;
    const vMed = yxa ? SIM.tingVarde(yxa) : 0, vUtan = SIM.tingVarde(vanlig);
    // kläderna får ingen konst, och ingen konst utan något att minnas
    let klad = 0; for (let i = 0; i < 10; i++) { const t = SIM.newTing(s, 'rock_kaninskinn', 1, g.id); t.q = 4; SIM.sakMinne(s, g, t); if (t.ber?.mo) klad++; }
    let tomt = 0; for (let i = 0; i < 10; i++) { const t = SIM.newTing(s, 'kniv', 1, a.id); t.q = 4; a.intryck = []; SIM.sakMinne(s, a, t); if (t.ber?.mo) tomt++; }
    // minnet av den döde: med och utan saken som visar hen
    const minns = (medSak: boolean) => {
      const k = SIM.cloneState(s), p = k.people.find(q => q.id === a.id)!;
      p.intryck = [{ om: d.id, namn: d.name, k: 'vargdodare', v: 1, c: 1, t: k.now }];
      for (const t of k.ting ?? []) if (t.ber) { if (!medSak) delete t.ber.mo; delete t.ber.lo; } // bara bilden: en sak gjord i sorg håller också minnet uppe (steg 10.6.15)
      SIM.glomRykten(k, 24 * 5);
      return p.intryck?.[0]?.c ?? 0;
    };
    const med = minns(true), utanSak = minns(false);
    return [
      [`ett mästerverk får ett motiv (${utan} utan först): ${ber}`, !!yxa && /visar|ristat|målat/.test(ber) && ber.includes(d.name)],
      [`motivet är händelsen (${yxa?.ber?.mo?.b?.h}) med den döde ${d.name}`, yxa?.ber?.mo?.om === d.id && yxa.ber.mo.b?.h === 'vargdodare'],
      [`värdet ${vMed.toFixed(1)} mot ${vUtan.toFixed(1)} utan konst`, vMed > vUtan],
      [`kläderna får ingen konst (${klad} av 10), och ingen konst när göraren inget minns (${tomt} av 10)`, klad === 0 && tomt === 0],
      [`byn minns den döde längre med saken: säkerheten ${med.toFixed(2)} mot ${utanSak.toFixed(2)} efter fem dygn`, med > utanSak],
    ];
  },
};

SCENARIER.bildyta = {
  text: 'Steg 10.7.1: bildytor och bildstenar. Skölden är en bildyta och får en målad bild av det göraren minns redan från fin kvalitet, andra saker först som mästerverk; ett intryck med en händelse bakom väger dubbelt, så att bilden helst visar en händelse, och den döda som visas bleknar långsammare. En runsten om en händelse huggs med bilder i stället för runor: en bildsten',
  kor: () => {
    const s = rikDag(3), [g, d1, d2, a] = vuxna(s) as [Person, Person, Person, Person];
    SIM.die(s, d1, 'sjukdom'); SIM.die(s, d2, 'sjukdom');
    const minnen = (): Person['intryck'] => [
      { om: d1.id, namn: d1.name, k: 'vargdodare', v: 1.5, c: 1, t: s.now }, // starkare, men utan en händelse
      { om: d2.id, namn: d2.name, k: 'vargdodare', v: 1, c: 1, t: s.now, bev: [{ h: 'vargdodare', t: s.now, sett: true }] },
    ];
    g.intryck = minnen();
    const skold = SIM.newTing(s, 'skold', 1, g.id); skold.q = 3; SIM.sakMinne(s, g, skold);
    const ber = SIM.sakBerattelse(s, skold, 'Sköld');
    // en fin kniv är ingen bildyta och får ingen bild
    const kniv = SIM.newTing(s, 'kniv', 1, g.id); kniv.q = 3; SIM.sakMinne(s, g, kniv);
    // den döda på skölden bleknar långsammare
    const minns = (med: boolean) => {
      const k = SIM.cloneState(s), p = k.people.find(q => q.id === a.id)!;
      p.intryck = [{ om: d2.id, namn: d2.name, k: 'vargdodare', v: 1, c: 1, t: k.now }];
      if (!med) for (const t of k.ting ?? []) if (t.ber) delete t.ber.mo;
      SIM.glomRykten(k, 24 * 5);
      return p.intryck?.[0]?.c ?? 0;
    };
    const med = minns(true), utan = minns(false);
    // en sten om en bedrift blir en bildsten
    const b = medLedare(), s2 = b.s, h = b.v[1];
    klockan(s2, 8); setFood(s2, 400); SIM.setAmount(s2, 'ved', 300); SIM.setAmount(s2, 'huggen_sten', 3);
    for (const p of b.v) { (p.tek ??= {}).stenhuggarplats = 1; p.sorg = []; p.bedrift = undefined; }
    SIM.handelse(s2, h, 'bjorndodare', undefined, undefined, b.v[2], 2);
    const ingenAnnan = () => { for (const p of SIM.living(s2)) { if (p !== h) p.bedrift = undefined; p.sorg = []; } };
    korTills(s2, () => !!s2.runstenar?.length, 72 * 3600, ingenAnnan);
    const r = s2.runstenar?.[0];
    return [
      [`en fin sköld får en målad bild (${ber})`, !!skold.ber?.mo && skold.ber.mo.mal === 1 && /målning/i.test(ber)],
      [`bilden visar helst en händelse: ${skold.ber?.mo?.namn} som fällde en varg, inte den starkare ${d1.name} utan händelse`, skold.ber?.mo?.om === d2.id && skold.ber.mo.b?.h === 'vargdodare' && ber.includes(d2.name) && ber.includes('dödade en varg')],
      ['en fin kniv får ingen bild, och den fina sköldens berättelse är bara bilden', !kniv.ber?.mo && !ber.includes('mästerverk')],
      [`den döda på skölden bleknar långsammare: säkerheten ${med.toFixed(2)} mot ${utan.toFixed(2)} efter fem dygn`, med > utan],
      [`en sten om en händelse är en bildsten (${r ? SIM.runstenRubrik(r) : 'ingen sten'}: "${r?.text}")`, !!r && r.slag === 'handelse' && r.bild === 1 && r.runor === '' && /bilderna/.test(r.text) && SIM.runstenRubrik(r).includes('bildsten')],
    ];
  },
};

// den vävda mattan (steg 10.7.6): smaken per sort, storleken efter lusten och tyget, ett golv man går över och som annat står på
function matta(): [string, boolean][] {
  const { PROJEKT, isKlar, bedTile, mattaVal, mattaAt, stationAt, stationerOf, stationDef, villPynt, gillarPynt, pyntSort, hash3, MATTOR, PYNT } = SIM;
  // smaken för krukan och bonaden är densamma som förut, då en sort valdes ur ett enda tal (nu en rad per sort)
  const s = createState(6, START); klockan(s); tandEld(s); medHus(s);
  const lika = Array.from({ length: 60 }, (_, i) => i).every(i => pyntSort(s, { id: i } as Person) === ['kruka', 'bonad'][Math.floor(hash3(s.seed, i, 43) * 2)]);
  const gillar = Array.from({ length: 60 }, (_, i) => gillarPynt(s, { id: i } as Person, 'matta')).filter(Boolean).length;
  setFood(s, 300); SIM.setAmount(s, 'ved', 40); SIM.setAmount(s, 'lintyg', 20);
  const p = vuxna(s).find(q => bedTile(s, q) !== undefined && gillarPynt(s, q, 'matta'))!;
  for (const q of vuxna(s)) if (q !== p) q.tek = { ...q.tek }; p.tek = { ...p.tek, matta: 1 };
  const k = mattaVal(s, p) ?? '', d = stationDef(k), vill = villPynt(s, p, k), fin = !!d?.pyntQ && d.av.lintyg !== undefined;
  // utan tyg och med ett pynt redan väljer p en mindre matta
  const s2 = SIM.cloneState(s), p2 = s2.people.find(r => r.id === p.id)!;
  SIM.setAmount(s2, 'lintyg', 0); s2.now += 1; // ett annat ögonblick: mattans val räknas om
  const krukan = SIM.newTing(s2, 'lerkruka_liten', 1, p2.id), rum2 = SIM.sovrum(s2, p2)!, g0 = rum2.tiles.find(i => !stationAt(s2, i % SIM.W, Math.floor(i / SIM.W)))!;
  krukan.x = g0 % SIM.W; krukan.y = Math.floor(g0 / SIM.W);
  const liten = mattaVal(s2, p2) ?? '', mindre = !!liten && (stationDef(liten)!.w * stationDef(liten)!.h) < (d ? d.w * d.h : 0);
  // p väver sin matta
  let h = 0; const vikt = PROJEKT[k]!.vikt; PROJEKT[k]!.vikt = 20;
  const mitt = () => stationerOf(s).find(t => t.ag === p.id && stationDef(t.k)?.golv);
  try { while (!(mitt() && isKlar(mitt()!)) && h < 240) { kor(s, 1); h++; if (SIM.amountOf(s, 'lintyg') < 6) SIM.setAmount(s, 'lintyg', 20); } } finally { PROJEKT[k]!.vikt = vikt; }
  const t = mitt(), rum = t && SIM.stationRum(s, t), b = bedTile(s, p);
  const byggd = !!t && isKlar(t) && !!t.inne && b !== undefined && !!rum?.tiles.includes(b);
  // ett golv: rutorna har ingen station, man går över dem, och en annan möbel får stå på mattan
  const rutor = t ? Array.from({ length: stationDef(t.k)!.w * stationDef(t.k)!.h }, (_, i) => ({ x: t.x + i % stationDef(t.k)!.w, y: t.y + Math.floor(i / stationDef(t.k)!.w) })) : [];
  const golv = !!t && rutor.every(r => mattaAt(s, r.x, r.y) === t && stationAt(s, r.x, r.y) !== t && !SIM.blocked(s, r.x + 0.5, r.y + 0.5));
  const lediga = rutor.filter(r => !stationAt(s, r.x, r.y) && !SIM.sittAt(s, r.x, r.y) && !(s.stackar ?? []).some(a => a.x === r.x && a.y === r.y) && !SIM.tingOf(s).some(q => q.x === r.x && q.y === r.y));
  const site = !!rum && lediga.length > 0 && lediga.every(r => SIM.golvLedigt(s, rum, r.x, r.y));
  // den stora och den runda mattan är ett steg finare som pynt
  const steg = (k: string, q: number) => {
    const x = SIM.cloneState(s), o = x.people.find(r => r.id === p.id)!, st = stationerOf(x).find(z => z.id === t!.id)!;
    st.k = k; st.q = q; o.thoughts = []; x.ting = (x.ting ?? []).filter(z => !(z.k.startsWith('lerkruka_') && z.agare === o.id));
    for (const z of stationerOf(x)) if (z !== st && z.ag === o.id && stationDef(z.k)?.pynt) z.ag = undefined;
    o.x = st.x + 0.5; o.y = st.y + 0.5; o.task = undefined; SIM.stepPynt(x);
    return o.thoughts.find(z => z.text === SIM.PYNT_TANKE)?.v ?? 0;
  };
  const gl = t ? steg('matta_liten_lin', 2) : 0, gs = t ? steg('matta_stor_lin', 2) : 0, gr = t ? steg('matta_rund_ylle', 2) : 0;
  return [
    [`smaken per sort: krukan och bonaden som förut (${lika ? 'samma' : 'annan'} hos 60), och ${gillar} av 60 tycker om mattor`, lika && gillar > 15 && gillar < 45],
    [`p, som tycker om mattor, vill väva en fin matta när det finns tyg (${k}, ${Object.keys(MATTOR).length} storlekar)`, vill && fin],
    [`utan tyg och med en kruka hemma väljer p en mindre (${liten || 'ingen'})`, mindre],
    [`p väver mattan på ${h} timmar (ungefär ${h / 2} månader i spelet) och lägger den i rummet där p sover`, byggd],
    [`mattan ligger som ett golv: rutorna har ingen station, man går över dem, och en bonad kan stå på den`, golv && !!site],
    [`den stora och den runda är ett steg finare som pynt (humör +${(gl * 100).toFixed(1)} %, +${(gs * 100).toFixed(1)} %, +${(gr * 100).toFixed(1)} %)`, gl === PYNT.glad[2] && gs === PYNT.glad[3] && gr === PYNT.glad[3]],
  ];
}
SCENARIER.pynt = {
  text: 'Pynt i hemmen (steg 4.3.4): var och en som är vuxen och sover inne bygger ett pynt åt sig själv (en lerkruka eller en bonad, efter smaken), och lusten efter ett till avtar, i rummet där hen sover. Ägaren trivs där, och de som ser det får ett bättre intryck av ägaren, mer ju finare det är. Den vävda mattan (steg 10.7.6): smaken räknas per sort, storleken efter lusten och bristen på tyg, och mattan ligger som ett golv som man går över och som annat står på; den stora och den runda är ett steg finare',
  kor: () => {
    const { PROJEKT, PYNT_LIST, isKlar, pyntOf, pyntSort, villPynt, bedTile, stationRum, stepPynt, intryckOm } = SIM;
    const s = createState(6, START); klockan(s); tandEld(s); medHus(s);
    setFood(s, 300); SIM.setAmount(s, 'ved', 40); SIM.setAmount(s, 'virke', 6); SIM.setAmount(s, 'skinn', 4); SIM.setAmount(s, 'rep', 4);
    // bara p kan göra pynt: rummet har plats för färre pynt än de som sover där, och de andra hann annars ta platserna först
    const p = vuxna(s).find(q => bedTile(s, q) !== undefined && pyntSort(s, q) !== 'kruka' && !SIM.gillarPynt(s, q, 'matta'))!; // mattan prövas för sig nedan (steg 10.7.6); lerkrukan är ett ting sedan steg 9.4.11 (scenariot kruka)
    p.tek = { ...p.tek, kruka: 1, bonad: 1 };
    const k = pyntSort(s, p);
    const vill = villPynt(s, p, k), bara = PYNT_LIST.filter(j => villPynt(s, p, j)).length, brist = PROJEKT[k]!.brist(s);
    const sorter = new Set(Array.from({ length: 12 }, (_, i) => pyntSort(s, { id: i } as Person))).size; // smaken skiljer sig mellan människor
    // pyntet väger lite mot arbetet om maten; här väger det mer, så att p bygger sitt snart
    let h = 0; const vikt = PYNT_LIST.map(j => PROJEKT[j]!.vikt); for (const j of PYNT_LIST) PROJEKT[j]!.vikt = 20;
    const pyntSt = (x: State) => pyntOf(x, x.people.find(r => r.id === p.id)!) as SIM.Station | undefined;
    try { while (!(pyntSt(s) && isKlar(pyntSt(s)!)) && h < 240) { kor(s, 1); h++; for (const m of ['virke', 'skinn', 'rep']) if (SIM.amountOf(s, m) < 4) SIM.setAmount(s, m, 6); } } finally { PYNT_LIST.forEach((j, i) => { PROJEKT[j]!.vikt = vikt[i]; }); }
    const t = pyntSt(s), b = bedTile(s, p), rum = t && stationRum(s, t);
    const byggd = !!t && isKlar(t) && t.k === k && t.ag === p.id && !!t.inne && b !== undefined && !!rum?.tiles.includes(b) && t.q !== undefined;
    const mer = PYNT_LIST.some(j => villPynt(s, p, j)) ? SIM.pyntLust(s, p) : 0; // lusten efter ett pynt till avtar (steg 10.2.43)
    // i rummet: ägaren trivs, och den som är vaken där får ett bättre intryck av ägaren. Ett uselt pynt ger inget
    const v = SIM.living(s).find(q => q !== p)!, ruta = rum?.tiles[0] ?? 0;
    const prova = (q: number, extra?: number) => {
      const k2 = SIM.cloneState(s), p2 = k2.people.find(r => r.id === p.id)!, v2 = k2.people.find(r => r.id === v.id)!, t2 = pyntSt(k2)!;
      t2.q = q; p2.thoughts = []; v2.intryck = [];
      if (extra !== undefined) k2.stationer!.push({ ...t2, id: 1e6, q: extra }); // ett pynt till i samma rum (steg 10.7.2)
      for (const x of SIM.stationerOf(k2)) if (x.ag === p2.id && SIM.stationDef(x.k)?.pynt) x.q = q; // lusten efter ett till kan ha gett ett pynt till (steg 10.2.43)
      k2.ting = (k2.ting ?? []).filter(x => !(x.k.startsWith('lerkruka_') && x.agare === p2.id)); // bara pyntet som prövas (en kruka hemma är också ett pynt)
      for (const r of [p2, v2]) { r.x = ruta % SIM.W + 0.5; r.y = Math.floor(ruta / SIM.W) + 0.5; r.task = undefined; } // SIM.W: W sätts när kartan skapas
      stepPynt(k2);
      const e = intryckOm(v2, p2.id, 'smakfull');
      return { glad: p2.thoughts.find(x => x.text === SIM.PYNT_TANKE)?.v ?? 0, syn: e ? e.v * e.c : 0 };
    };
    const fin = prova(4), normal = prova(2), usel = prova(0), tva = prova(4, 3);
    // lerkrukans utseenden (steg 10.7.2): två krukor ritas olika, och en kruka med rölleka ritas med växten
    const k1 = SIM.newTing(s, 'lerkruka_liten', 1, p.id), k2 = SIM.newTing(s, 'lerkruka_liten', 1, p.id), k3 = SIM.newTing(s, 'lerkruka_liten', 1, p.id);
    k3.vaxt = { g: 'rolleka', v: 1 };
    const b1 = SIM.krukaBild(k1), b2 = SIM.krukaBild(k2), b3 = SIM.krukaBild(k3);
    const v1 = SIM.tingVarde(k1), v2 = SIM.tingVarde(k2);
    const m = matta();
    return [
      [`p vill ha ett pynt av sin sort (${k}) och bara den (${bara}), byn vill bygga det (brist ${brist.toFixed(2)}), och smaken skiljer sig (${sorter} sorter hos tolv)`, vill && bara === 1 && brist > 0 && sorter === 2],
      [`p bygger sitt pynt på ${h} timmar (ungefär ${h / 2} månader i spelet), inne i rummet där p sover, med en kvalitet`, byggd],
      [`lusten efter ett pynt till avtar (${mer.toFixed(2)} mot 1 utan)`, !!t && mer <= SIM.STATION.pyntAvtar + 1e-9],
      [`ägaren trivs i rummet: humör +${(fin.glad * 100).toFixed(0)} % med ett mästerverk, +${(normal.glad * 100).toFixed(0)} % med ett normalt`, fin.glad > normal.glad && normal.glad > 0],
      [`den som ser det får intrycket smakfull: ${fin.syn.toFixed(3)} med ett mästerverk, ${normal.syn.toFixed(3)} med ett normalt`, fin.syn > normal.syn && normal.syn > 0],
      [`ett uselt pynt ger ingenting (${usel.glad}, ${usel.syn})`, usel.glad === 0 && usel.syn === 0],
      [`det finaste pyntet i rummet räknas: med ett fint pynt till är intrycket ${tva.syn.toFixed(3)} som med mästerverket ensamt (${fin.syn.toFixed(3)})`, Math.abs(tva.syn - fin.syn) < 1e-9 && tva.glad === fin.glad],
      [`två krukor ritas olika (${b1.ikon}, ${b2.ikon}) och har samma värde (${v1.toFixed(1)}, ${v2.toFixed(1)})`, b1.ikon !== b2.ikon && v1 === v2],
      [`krukan med rölleka ritas med växten (${b3.vaxt?.g}, vuxen ${b3.vaxt?.v})`, b3.vaxt?.g === 'rolleka' && b3.vaxt.v === 1 && !b1.vaxt],
      ...m,
    ];
  },
};

SCENARIER.framrapport = {
  text: 'Framträdandets redogörelse (steg 5.4.7.1): när framträdandet slutar sparas vem, formen, publiken och mottagningen (glädjen, vad publiken tycker om den som uppträdde före och efter, ryktet, ledaren efter en hyllning, vilka tron övertygade), och raden i Händelser och notisen pekar dit. Kommer ingen säger redogörelsen det. Högst upp en berättelse i löpande text ur det som hände (steg 5.4.7.2)',
  kor: () => {
    const { s, v } = kvall(), p = v[0]!;
    upptrad(s, p); kor(s, 1.5);
    const m = s.framtradanden?.at(-1), rad = s.log.find(l => l.fram !== undefined && l.fram === m?.nr);
    const n = s.notiser?.lista.find(x => x.id === 'fram'), nIdx = n?.fram?.indexOf(m?.nr ?? -1) ?? -1;
    const ok = !!m?.publik && m.publik.length === m.n && m.publik.every(x => Number.isInteger(x.r0) && Number.isInteger(x.r1));
    // en hyllning: publiken om ledaren före och efter
    const k = kvall(5), u = k.v[0]!, l = k.v[1]!;
    k.s.styre = { ledare: l.id, historia: [], oppna: [] } as unknown as typeof k.s.styre;
    SIM.getRel(k.s, u, l).op = 60;
    let hy: SIM.FramMinne | undefined;
    if (upptrad(k.s, u)) { kor(k.s, 1.5); hy = k.s.framtradanden?.at(-1); }
    const hyl = hy?.publik?.filter(x => x.l0 !== undefined) ?? [];
    // tron: någon i publiken övertygas
    let tro: string[] = [], troM: SIM.FramMinne | undefined, troS = s;
    for (let i = 0; i < 20 && !tro.length; i++) {
      const t = kvall(3 + i), w = t.v[0]!;
      t.s.tron = [{ id: 1, grundare: w.id, gnamn: w.name, t: t.s.now, k: 'blixt', bakom: 'Den som bor i åskmolnen', vill: 'att man tystnar när det mullrar', svek: 'blixten slår ner', natur: 50, manga: 50, bekr: t.s.now, ar: 0 } as SIM.Tro];
      w.tro = 1; w.troStyrka = 100; w.andlig = 100; w.pot.karisma = 20;
      for (const b of t.v.slice(1)) { b.andlig = 100; b.tro = undefined; }
      if (!upptrad(t.s, w)) continue;
      kor(t.s, 1.5);
      const tm = t.s.framtradanden?.at(-1);
      if (tm?.bud === 'tro' && tm.tro?.length) { tro = tm.tro.filter(x => t.v.find(b => b.name === x)?.tro === 1); troM = tm; troS = t.s; }
    }
    // ingen kom: alla sover, och efter 15 minuters väntan ställs det in (steg 10.7.9)
    const e = kvall(7), ep = e.v[0]!;
    let inget: SIM.FramMinne | undefined, vantat = 0;
    if (upptrad(e.s, ep)) { for (const q of e.s.people) if (q !== ep) q.task = { act: 'sova', phase: 'do', tx: q.x, ty: q.y, until: e.s.now + 3 * SIM.HOUR, carry: 0, dark: true }; const t0 = e.s.now; for (let i = 0; i < 400 && e.s.fram; i++) SIM.step(e.s, 10); vantat = (e.s.now - t0) / SIM.MIN; inget = e.s.framtradanden?.at(-1); }
    const inglog = e.s.log.find(x => x.fram === inget?.nr), ledsen = ep.thoughts.some(t => t.text === 'Ingen kom och lyssnade' && t.v < 0);
    // berättelsen högst upp (steg 5.4.7.2): skriven ur minnet, stabil, med den som uppträdde, ledaren och den som övertygades
    const b0 = m ? SIM.framBerattelse(s, m) : '', bh = hy ? SIM.framBerattelse(k.s, hy) : '', bt = troM ? SIM.framBerattelse(troS, troM) : '', bi = inget ? SIM.framBerattelse(e.s, inget) : '';
    const hel = (x: string) => x.length > 0 && !/\{|undefined|NaN/.test(x);
    return [
      [`minnet nr ${m?.nr}: ${m?.n} lyssnade, glädje ${m?.glad}, publiken före och efter i hela tal`, ok && (m?.glad ?? 0) > 0],
      [`raden i Händelser pekar på framträdandet: ${rad?.text ?? 'ingen'}`, !!rad],
      [`notisen (Folket) pekar på det på rad ${nIdx + 1}`, !!n && nIdx >= 0 && n.fram!.length === n.rader.length],
      [`hyllningen: ledaren ${hy?.ledare ?? 'ingen'}, ${hyl.length} i publiken med före och efter (${hyl.map(x => `${x.l0}→${x.l1}`).join(', ')})`, hy?.bud === 'hylla' && hy.ledare === l.name && hyl.length >= 1 && hyl.every(x => x.l1! >= x.l0!) && hyl.some(x => x.l1! > x.l0!)],
      [`tron övertygade ${tro.join(', ') || 'ingen'}`, tro.length >= 1],
      [`ingen kom: ${inglog?.text ?? 'ingen rad'}`, !!inget?.inget && inget.n === 0 && !!inglog],
      [`det ställdes in efter ${vantat.toFixed(0)} minuters väntan, och ${ep.name} ${ledsen ? 'har' : 'saknar'} tanken`, vantat >= 14 && vantat <= 17 && ledsen && (e.s.stat?.framInstallt ?? 0) === 1],
      [`berättelsen: ${b0}`, hel(b0) && b0.includes(p.name) && b0 === SIM.framBerattelse(s, m!)],
      [`berättelsen om hyllningen: ${bh}`, hel(bh) && bh.includes(l.name)],
      [`berättelsen om tron: ${bt}`, hel(bt) && tro.some(x => bt.includes(x))],
      [`berättelsen när ingen kom: ${bi}`, hel(bi) && bi.includes(ep.name)],
    ];
  },
};

SCENARIER.matchrapport = {
  text: 'Matchens sammanställning (steg 5.4.8.1): när matchen avgörs sparas sporten, hur länge den varade, spelarna med färdigheten i sportens färdighet, vem som vann och glädjen, och raden i Händelser och notisen pekar dit. Kommer det för få säger sammanställningen att det blev ingen match. Högst upp en berättelse ur det som hände (steg 5.4.8.2)',
  kor: () => {
    const s = rikDag(3, { rep: 4 }), v = vuxna(s), a = v[0]!, b = v[1]!;
    a.skill.traff = 18; b.skill.traff = 2;
    SIM.newTing(s, 'mal', 1, a.id);
    match(s, 'kast', [a, b]);
    const tanke = (q: Person, r: RegExp) => q.thoughts.find(x => r.test(x.text) && x.until > s.now);
    korTills(s, () => !!s.matcher?.some(x => !x.installd), 3 * 3600);
    const m0 = s.matcher?.find(x => !x.installd), vq = m0?.vinnare === a.id ? a : b, fq = vq === a ? b : a;
    const vt = tanke(vq, /^Vann kast/), ft = tanke(fq, /^Förlorade kast/);
    kor(s, 1.2);
    const borta = !tanke(vq, /^Vann/) && !tanke(fq, /^Förlorade/);
    kor(s, 1);
    const m = s.matcher?.find(x => !x.installd), rad = s.log.find(l => l.match !== undefined && l.match === m?.nr);
    const n = s.notiser?.lista.find(x => x.id === 'match'), nIdx = n?.match?.indexOf(m?.nr ?? -1) ?? -1;
    const fa = m?.spelare.find(x => x.id === a.id);
    // glad eller ledsen (steg 10.7.15): tanken hos vinnaren och förloraren, borta efter en timme

    // det kommer för få: ensam
    const e = rikDag(5), ep = vuxna(e)[0]!;
    match(e, 'dragkamp', [ep]);
    for (const q of SIM.living(e)) if (q !== ep) q.task = { act: 'sova', phase: 'do', tx: q.x, ty: q.y, until: e.now + 3 * SIM.HOUR, carry: 0, dark: true };
    kor(e, 1.5);
    const ingenTanke = !ep.thoughts.some(x => /^(Vann|Förlorade) /.test(x.text));
    const im = e.matcher?.at(-1), ilog = e.log.find(l => l.match === im?.nr);
    // berättelsen högst upp (steg 5.4.8.2): skriven ur minnet, stabil, med vinnaren; en skräll när den svagare vinner
    const hel = (x: string) => x.length > 0 && !/\{|undefined|NaN/.test(x);
    const ber = m ? SIM.matchBerattelse(s, m) : '', iber = im ? SIM.matchBerattelse(e, im) : '';
    const sk = m ? { ...m, nr: 7, vinnare: b.id, vnamn: b.name, spelare: m.spelare.map(x => ({ ...x, v: x.id === b.id ? 20 : 19.5 })) } : undefined, sber = sk ? SIM.matchBerattelse(s, sk) : '';
    return [
      [`minnet nr ${m?.nr}: ${m?.k}, ${m ? Math.round((m.slut - m.t) / SIM.MIN) : 0} minuter, ${m?.spelare.map(x => `${x.namn} ${x.f}`).join(', ')}, vann ${m?.vnamn}, glädje ${m?.glad}`, !!m && m.k === 'kast' && m.spelare.length >= 2 && fa?.f === 18 && !!m.vnamn && m.slut > m.t && m.glad > 0],
      [`matchen varade ${m ? ((m.slut - m.t) / SIM.MIN).toFixed(0) : '?'} minuter från att den började (steg 10.7.13)`, !!m && m.slut - m.t >= 10 * SIM.MIN - 1 && m.slut - m.t <= 20 * SIM.MIN + 1],
      [`${vq.name} tänker ${vt?.text ?? 'inget'} (${vt?.v}), ${fq.name} ${ft?.text ?? 'inget'} (${ft?.v}), och båda är borta en timme efter matchen`, !!vt && vt.v > 0 && !!ft && ft.v < 0 && ft.v > -vt.v && borta],
      [`raden i Händelser pekar på matchen: ${rad?.text ?? 'ingen'}`, !!rad],
      [`notisen (Folket) pekar på den på rad ${nIdx + 1}`, !!n && nIdx >= 0 && n.match!.length === n.rader.length],
      [`för få: ${ilog?.text ?? 'ingen rad'}, och ingen blev glad eller ledsen`, !!im?.installd && !im.vinnare && im.spelare.length === 1 && !!ilog && ingenTanke],
      [`berättelsen: ${ber}`, hel(ber) && ber.includes(a.name) && ber === SIM.matchBerattelse(s, m!)],
      [`när den svagare vinner jämnt: ${sber}`, hel(sber) && sber.includes(b.name) && sber.includes(a.name)],
      [`när det kom för få: ${iber}`, hel(iber) && iber.includes(ep.name) || /ingen|för få|tom/.test(iber)],
    ];
  },
};

SCENARIER.ord = {
  text: 'Ordlagret (steg 6.7.1, src/sim/ord.ts): tal skrivs med ord, sakerna med rätt artikel och form, teknikerna som vad man kan göra, listor fogas med komma och och, och skador med grad och genus',
  kor: () => {
    const utanGora = TEKNIK.filter(t => !O.GORA[t.id]).map(t => t.id);
    return [
      [`tal: ${O.tal(3)}, ${O.tal(1, true)}, ${O.tal(40)}, ${O.tal(500)}`, O.tal(3) === 'tre' && O.tal(1, true) === 'ett' && O.tal(40) === 'många' && O.tal(500) === 'otaliga'],
      [`listor: "${O.och(['Åsa', 'Bo', 'Ylva'])}" och "${O.lista(['A', 'B', 'C', 'D', 'E', 'F'])}"`, O.och(['Åsa', 'Bo', 'Ylva']) === 'Åsa, Bo och Ylva' && O.lista(['A', 'B', 'C', 'D', 'E', 'F']) === 'A, B och fyra till'],
      [`saker: "${O.antal(1, 'kott')}", "${O.antal(3, 'kott')}", "${O.antal(1, 'radjur')}"`, O.antal(1, 'kott') === 'en bit harkött' && O.antal(3, 'kott') === 'tre bitar harkött' && O.antal(1, 'radjur').startsWith('ett ')],
      [`varje teknik har ett "att göra" (saknas: ${utanGora.join(', ') || 'inga'}); t.ex. "${O.gora(TEKNIK[0]!)}"`, utanGora.length === 0],
      [`skador: "${O.skada('ett blåmärke', 0.1)}", "${O.skada('en blödning', 0.5)}", "${O.skada('ett skärsår', 0.9)}"`, O.skada('ett blåmärke', 0.1) === 'ett lätt blåmärke' && O.skada('en blödning', 0.5) === 'en svår blödning' && O.skada('ett skärsår', 0.9) === 'ett mycket svårt skärsår'],
      [`pronomen: ${O.han({ sex: 'k' })}/${O.honom({ sex: 'm' })}/${O.hans({ sex: 'k' })}`, O.han({ sex: 'k' }) === 'hon' && O.honom({ sex: 'm' }) === 'honom' && O.hans({ sex: 'k' }) === 'hennes'],
    ];
  },
};

SCENARIER.omrostning = {
  text: 'Steg 8.3.1–8.3.3: allt byn avgör är en fråga i FRAGOR. Klockan 20 röstar alla vuxna efter åsikter och intresse, summan av vikterna avgör, och vid Envälde väger nästan bara ledaren. Omröstningarna sparas',
  kor: () => {
    const s = createState(6, START), v = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), l = v[0];
    (s.styre = { historia: [{ id: l.id, namn: l.name, titel: 'Ålderman', fran: s.now }], oppna: ['rang'], ledare: l.id, sedan: s.now, titel: 'Ålderman', satt: 1, pabud: { matlager: 0, vedlager: 0, torkat: 0 } as never });
    const allmoge = SIM.vikter(s), lika = Math.max(...allmoge.filter(x => x.p !== l).map(x => x.andel));
    s.seder.v.rang = 1;
    const envalde = SIM.vikter(s), led = envalde.find(x => x.p === l)!.andel;
    s.seder.v.rang = 0;
    const fr = { f: 'pabud', d: { k: 'matlager', v: 0.9 }, fram: l.id };
    SIM.rostaOm(s, fr);
    const o = s.styre!.roster![0];
    const allaVuxna = o.roster.length === v.length && o.roster.every(r => r.why);
    // en fråga i kön tas upp klockan 20, och ett ja gör det raden säger
    s.seder.v.rang = 1;
    SIM.laggFram(s, 'pabud', { k: 'vedlager', v: 0.7 }, l); SIM.laggFram(s, 'pabud', { k: 'vedlager', v: 0.7 }, l);
    const iKo = s.styre!.fragor!.length;
    SIM.rostKvall(s);
    const satt = s.styre!.pabud!.vedlager === 0.7;
    return [
      [`vid Allmogen väger ingen annan än ledaren mycket (högst ${(lika * 100).toFixed(0)} %)`, lika < 0.4],
      [`vid Envälde väger ledaren nästan allt (${(led * 100).toFixed(0)} %)`, led > 0.85],
      [`alla vuxna röstar, och varje röst har ett skäl (${o.roster.length})`, allaVuxna],
      ['samma fråga läggs inte fram två gånger', iKo === 1],
      ['frågan avgörs vid elden och ett ja gör det raden säger', satt],
    ];
  },
};
SCENARIER.rostlista = {
  text: 'Steg 9.2.65: omröstningarnas bild i fliken Styre. En utfälld omröstning har en stapel som delas i ja och nej efter vikten och en egen lista med en rad per röst (inte relationslistans rutnät): symbolen för ja eller nej, namnet och en stapel för vikten, ja-rösterna först och de tyngsta överst, och varför personen röstade så vid musen och med ett tryck',
  kor: () => {
    utanWebblasare();
    const s = createState(6, START), v = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), l = v[0];
    s.styre = { historia: [{ id: l.id, namn: l.name, titel: 'Ålderman', fran: s.now }], oppna: ['rang'], ledare: l.id, sedan: s.now, titel: 'Ålderman', satt: 1, pabud: { matlager: 0, vedlager: 0, torkat: 0 } as never };
    SIM.rostaOm(s, { f: 'pabud', d: { k: 'matlager', v: 0.9 }, fram: l.id });
    const o = s.styre.roster![0];
    setByn(s); ui.styreDel = 'styre';
    const tryck = (id: string) => hjalpKlick({ closest: () => ({ dataset: { hjalp: id, hjalpGrupp: id.slice(0, id.indexOf('-') + 1) } }) } as unknown as HTMLElement);
    tryck(`rost-${o.t}-${o.f}-${o.fram}`);
    const h = styreFlik.html();
    const lista = h.match(/<ul class="roster">([\s\S]*?)<\/ul>/)?.[1] ?? '';
    const rader = lista.match(/data-hjalp="rr-[^"]*"/g) ?? [];
    // ordningen i bilden: ja först, sedan nej, och inom varje de tyngsta överst
    const ord = rader.map(r => o.roster.find(x => r.endsWith(`-${x.id}"`))!);
    const sorterad = ord.every((r, i) => i === 0 || (Number(ord[i - 1].ja) > Number(r.ja)) || (ord[i - 1].ja === r.ja && ord[i - 1].w >= r.w));
    const r0 = ord[0]!;
    tryck(`rr-${o.t}-${r0.id}`);
    const h2 = styreFlik.html();
    return [
      [`stapeln för ja och nej efter vikten (${Math.round(o.ja * 100)} % ja)`, /class="rostbar"[\s\S]*class="ja"[\s\S]*class="nej"/.test(h)],
      [`en rad per röst i en egen lista (${rader.length} av ${o.roster.length})`, rader.length === o.roster.length && !/<ul class="rels">[^]*?r_ja/.test(h)],
      ['varje rad har symbolen för ja eller nej och en stapel för vikten', (lista.match(/class="rostw"/g) ?? []).length === o.roster.length && (lista.match(/<span title="(Ja|Nej)">/g) ?? []).length === o.roster.length],
      ['ja-rösterna först och de tyngsta överst', sorterad],
      ['den som lade fram frågan är märkt', lista.includes('Lade fram frågan')],
      ['varför personen röstade så står vid musen och kommer fram med ett tryck', lista.includes(`title="${esc(r0.why)}"`) && h2.includes(`class="small muted rvarfor">${esc(r0.why)}`)],
    ];
  },
};
SCENARIER.sedlista = {
  text: 'Steg 9.2.66: sederna går att trycka på. Ett tryck på en sed i Seder och i Styres vågskålar öppnar en lista under vågen med vad seden gör och en rad per upplevelse som drar den: namnet, åt vilket håll och hur mycket, och hur många och vilka som minns den. Ett tryck till stänger',
  kor: () => {
    utanWebblasare();
    const s = createState(6, START), v = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), l = v[0];
    for (const x of v) x.upp = [...x.upp ?? [], { k: 'svalt', a: 20, e: {}, v: 1, t: s.now }];
    s.styre = { historia: [{ id: l.id, namn: l.name, titel: 'Ålderman', fran: s.now }], oppna: ['rang'], ledare: l.id, sedan: s.now, titel: 'Ålderman', satt: 1, pabud: { matlager: 0, vedlager: 0, torkat: 0 } as never };
    setByn(s); ui.styreDel = 'styre';
    const k = SIM.SED_LIST.find(x => SIM.sedOppen(s, x) && !SIM.MAKT_SEDER.includes(x) && Math.abs(SIM.sedDrag(s).find(r => r.k === 'svalt')?.d[x] ?? 0) >= 0.005)!;
    const tryck = (id: string) => hjalpKlick({ closest: () => ({ dataset: { hjalp: id, hjalpGrupp: 'sed-' } }) } as unknown as HTMLElement);
    const stangd = sederFlik.html();
    tryck(`sed-${k}`);
    const oppen = sederFlik.html(), lista = oppen.match(/<div class="sedlista">([\s\S]*?)<\/div>/)?.[1] ?? '';
    const namn = SIM.upplevelseKort('svalt'), mot = SIM.sedDrag(s).find(r => r.k === 'svalt')!.d[k] > 0 ? SIM.SEDER[k].pos : SIM.SEDER[k].neg;
    const alla = v.every(p => lista.includes(`data-id="${p.id}"`));
    // vågskålen Rang i Styre går också att trycka på
    tryck('sed-rang');
    const styreH = styreFlik.html(), iStyre = /data-hjalp="sed-rang"[^>]*>[\s\S]*?<div class="sedlista">/.test(styreH);
    tryck('sed-rang');
    const igen = styreFlik.html().includes('class="sedlista"');
    return [
      [`sederna går att trycka på och listan är stängd från början (${SIM.SEDER[k].neg} – ${SIM.SEDER[k].pos})`, stangd.includes(`data-hjalp="sed-${k}"`) && !stangd.includes('class="sedlista"')],
      ['listan säger vad seden gör', lista.includes(esc(SIM.SEDER[k].effect))],
      [`en rad för upplevelsen: "${namn}: drar mot ${mot.toLowerCase()}, N av 100"`, lista.includes(esc(namn)) && new RegExp(`drar mot ${mot.toLowerCase()}, \\d+ av 100`).test(lista)],
      [`hur många och vilka som minns den (${v.length})`, lista.includes(`${v.length} minns det`) && alla],
      ['vågskålen i Styre öppnar samma lista, och ett tryck till stänger', iStyre && !igen],
    ];
  },
};
SCENARIER.bubbla = {
  text: 'Steg 9.2.68: förklaringar går att trycka fram. Ett tryck på en symbol med förklaring (title, eller <title> i en ritad symbol) visar texten i en bubbla, nästa tryck stänger den, och det som öppnar något (en knapp, en person, en rad som fälls ut) visar ingen bubbla utan gör det det brukar',
  kor: () => {
    // ett litet låtsasträd i stället för webbläsaren: varje element vet sina egenskaper och sin förälder
    interface F { tag: string; attr: Record<string, string>; cls?: string; upp?: F; svgTitle?: string }
    const passar = (e: F, sel: string) => sel.split(',').map(x => x.trim()).some(x =>
      x === e.tag || (x.startsWith('.') && e.cls === x.slice(1)) || (/^\[([\w-]+)(="([^"]*)")?\]$/.test(x) && (() => { const [, n, , v] = x.match(/^\[([\w-]+)(="([^"]*)")?\]$/)!; return n in e.attr && (v === undefined || e.attr[n] === v); })()));
    const el = (e: F): HTMLElement => ({
      closest: (sel: string) => { for (let x: F | undefined = e; x; x = x.upp) if (passar(x, sel)) return el(x); return null; },
      getAttribute: (n: string) => e.attr[n] ?? null,
      querySelector: () => (e.svgTitle ? { textContent: e.svgTitle } : null),
      getBoundingClientRect: () => ({ left: 10, top: 10, width: 12, height: 12, right: 22, bottom: 22 }),
    } as unknown as HTMLElement);
    const li: F = { tag: 'li', attr: {} }, sym: F = { tag: 'span', attr: { title: 'Sjuk. Vilar mer och orkar mindre' }, upp: li }, bild: F = { tag: 'img', attr: {}, upp: sym };
    const rad: F = { tag: 'li', attr: { title: 'Tryck för alla röster', 'data-hjalp': 'x' }, cls: 'klick' }, iRad: F = { tag: 'span', attr: { title: 'Ja' }, upp: rad };
    const knapp: F = { tag: 'button', attr: { title: 'Visa', 'data-id': '3' } };
    const svg: F = { tag: 'svg', attr: {}, svgTitle: 'Vikt 4 av 5' }, svgDel: F = { tag: 'path', attr: {}, upp: svg };
    // bubblan i ett låtsasdokument
    const g = globalThis as { document?: unknown; innerWidth?: number; innerHeight?: number };
    const [d0, w0, h0] = [g.document, g.innerWidth, g.innerHeight];
    const div = { hidden: true, textContent: '', style: {} as Record<string, string>, getBoundingClientRect: () => ({ width: 100, height: 30 }) };
    g.document = { body: { appendChild: (x: unknown) => x }, createElement: () => div }; g.innerWidth = 400; g.innerHeight = 800;
    const visas = bubblaKlick(el(bild)) && bubblaText() === sym.attr.title;
    const stangs = bubblaKlick(el(bild)) && bubblaText() === undefined;
    bubblaKlick(el(bild)); const annan = bubblaKlick(el(svgDel)) && bubblaText() === 'Vikt 4 av 5';
    bubblaKlick(el(svgDel));
    const knappIngen = !bubblaKlick(el(knapp)) && bubblaText() === undefined;
    [g.document, g.innerWidth, g.innerHeight] = [d0, w0, h0];
    return [
      ['en symbol med förklaring ger texten, också när man tryckt på bilden i den', forklaringAv(el(bild))?.text === sym.attr.title],
      ['en ritad symbol ger texten i sin <title>', forklaringAv(el(svgDel))?.text === 'Vikt 4 av 5'],
      ['det som öppnar något (en rad som fälls ut, en person) ger ingen bubbla', !forklaringAv(el(iRad)) && !forklaringAv(el(knapp)) && OPPNAR.includes('.klick')],
      ['ett tryck visar förklaringen i bubblan', visas],
      ['nästa tryck på samma sak stänger den', stangs],
      ['ett tryck på något annat med förklaring visar dess text', annan],
      ['ett tryck på en knapp visar ingen bubbla', knappIngen],
    ];
  },
};
SCENARIER.makten = {
  text: 'Steg 8.3.4–8.3.12: Förtjänst – Härkomst och Förlikning – Fejd låses upp och börjar där byn lutar, tronföljden följer sederna, formen har tidens namn, missnöjet växer och bleknar, och en fraktion som väger mer än legitimiteten avsätter ledaren fredligt eller slåss',
  kor: () => {
    const ny = () => {
      const s = createState(6, START), v = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
      for (const p of v) (p.tek ??= {}).ledarskap = 1;
      return { s, v };
    };
    const { s, v } = ny(), l = v[0];
    s.styre = { historia: [{ id: l.id, namn: l.name, titel: 'Ålderman', fran: s.now }], oppna: ['rang'], ledare: l.id, sedan: s.now, titel: 'Ålderman', satt: 1, pabud: {} as never, lugn: 0 };
    SIM.oppnaSed(s, 'fejd');
    const oppen = SIM.sedOppen(s, 'fejd');
    // former
    s.seder.v.rang = 0.8; s.seder.v.fortjanst = 0.5; s.seder.v.fejd = 0; const kung = SIM.styrelseform(s).namn;
    s.seder.v.fortjanst = -0.5; s.seder.v.fejd = 0.5; const envalde = SIM.styrelseform(s).namn;
    s.seder.v.rang = 0; s.seder.v.fortjanst = 0; s.seder.v.fejd = 0; const ting = SIM.styrelseform(s).namn;
    // tronföljden
    s.seder.v.fortjanst = 0.6; const arv = SIM.tronfoljd(s);
    s.seder.v.fortjanst = 0; s.seder.v.fejd = 0.8; const strid = SIM.tronfoljd(s);
    s.seder.v.fejd = 0; const val = SIM.tronfoljd(s);
    // missnöjet växer av svält och bleknar
    const q = v[1]; q.warm = 1; q.hunger = 0.01; SIM.missnojeTimme(s); const m1 = q.missnoje ?? 0;
    q.hunger = 1; for (let i = 0; i < 24 * 30; i++) SIM.missnojeTimme(s);
    // fraktionen avsätter fredligt vid Förlikning
    for (const p of v.slice(1)) p.missnoje = 1;
    s.styre.lugn = 0;
    for (const r of Object.keys(s.rels)) s.rels[r].op = -50;
    s.styre.frak = { led: v[1].id, med: v.slice(1).map(p => p.id) };
    SIM.missnojeTimme(s);
    const avsatt = s.styre.ledare !== l.id && s.styre.historia[s.styre.historia.length - 1].slut === 'avsattes';
    return [
      [`skalan låses upp (${oppen})`, oppen],
      [`formerna har tidens namn: ${kung}, ${envalde}, ${ting}`, kung === 'Kungadöme' && envalde === 'Envälde' && ting === 'Folkting'],
      [`tronföljden följer sederna: ${arv}, ${strid}, ${val}`, arv === 'arv' && strid === 'strid' && val === 'val'],
      [`missnöjet växer av svält (${m1.toFixed(3)}) och bleknar (${(q.missnoje ?? 0).toFixed(3)})`, m1 > 0 && (q.missnoje ?? 0) < m1],
      ['en fraktion som väger mer än legitimiteten avsätter ledaren fredligt vid Förlikning', avsatt],
    ];
  },
};

SCENARIER.mantel = {
  text: 'Steg 8.3.13–8.3.15: ett förbud mot hån är en fråga, och går den igenom rivs scenen. Ledarens mantel följer ämbetet, och ett halsband ger anseende, ett finare mer',
  kor: () => {
    const s = createState(6, START), v = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), l = v[0], q = v[1];
    s.styre = { historia: [{ id: l.id, namn: l.name, titel: 'Ålderman', fran: s.now }], oppna: ['rang'], ledare: l.id, sedan: s.now, titel: 'Ålderman', satt: 1 };
    s.seder.v.rang = 1;
    const t0 = SIM.hanTillat(s);
    SIM.laggFram(s, 'hanforbud', { led: l.id }, l); SIM.rostKvall(s);
    const forbud = !!s.styre.hanForbud && SIM.hanTillat(s) === 0 && t0 >= 0;
    // manteln
    const m = SIM.newTing(s, 'mantel_kaninskinn', 1, -1), man = () => s.ting!.find(t => t.k === 'mantel_kaninskinn')!;
    SIM.stepKlader(s); const paLedaren = man().bar === l.id;
    s.styre.ledare = q.id; SIM.stepKlader(s); const nasta = man().bar === q.id;
    // halsbandet
    const a0 = SIM.ryktbarhet(s, v[2].id).a;
    const h = SIM.newTing(s, 'halsband_benband', 1, -1); const hb = s.ting!.filter(t => t.k === 'halsband_benband').pop()!; hb.bar = v[2].id; hb.x = hb.y = undefined;
    const a1 = SIM.ryktbarhet(s, v[2].id).a;
    hb.k = 'halsband_tandband'; const a2 = SIM.ryktbarhet(s, v[2].id).a;
    return [
      ['förbudet mot hån går igenom och stoppar hånet', forbud],
      ['ledaren har på sig manteln', paLedaren && !!m],
      ['manteln går till nästa ledare', nasta],
      [`ett halsband ger anseende, ett finare mer (${a0.toFixed(2)} → ${a1.toFixed(2)} → ${a2.toFixed(2)})`, a1 > a0 && a2 > a1 && !!h],
    ];
  },
};

const medLedare = (seed = 6) => {
  const s = createState(seed, START), v = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), l = v[0];
  for (const p of v) { (p.tek ??= {}).ledarskap = 1; p.tek.lag = 1; }
  s.styre = { historia: [{ id: l.id, namn: l.name, titel: 'Ålderman', fran: s.now }], oppna: ['rang'], ledare: l.id, sedan: s.now, titel: 'Ålderman', satt: 1, pabud: {} as never };
  return { s, v, l };
};
SCENARIER.lagar = {
  text: 'Steg 8.4.1–8.4.6: en lag är ett påbud eller förbud med ett straff, som stiftas i omröstningen. Ur det som hänt väcks förslag, det med högst prioritet tas upp, taket håller nere antalet, och en lag kan ta bort rösten',
  kor: () => {
    const { s, v, l } = medLedare();
    s.seder.v.rang = 1; l.pot.empati = 16; // ledaren väger allt, så att frågan går igenom
    const fore = SIM.framlaggare(s).length;
    (s.stat ??= {}).rykte_stold = 10;
    let tog = false; for (let i = 0; i < 8 && !SIM.lagGaller(s, 'stoldforbud'); i++) tog = SIM.tasUppKvall(s) || tog;
    const lag = SIM.lagGaller(s, 'stoldforbud'), om = s.styre!.roster?.[s.styre!.roster!.length - 1]?.varfor;
    s.seder.v.rang = -0.5;
    const manga = SIM.framlaggare(s).length;
    // straffet står i lagen
    s.seder.v.rang = 1;
    const straff = SIM.lagarNu(s)[0]?.straff;
    // rösten
    s.styre!.lagar!.push({ id: 'rostKvinnor', t: s.now, straff: 0, av: l.id, om: '' });
    const k = v.find(p => p.sex === 'k')!, m = v.find(p => p.sex === 'm')!;
    const utan = SIM.utanRost(s, k), med = !SIM.utanRost(s, m);
    // taket: över taket efterlevs lagarna sämre
    const e0 = SIM.efterlevs(s);
    for (const id of Object.keys(SIM.LAGAR)) if (!SIM.lagGaller(s, id)) s.styre!.lagar!.push({ id, t: s.now, straff: 0, av: l.id, om: '' });
    const e1 = SIM.efterlevs(s);
    return [
      [`vid Envälde får bara ledaren lägga fram (${fore}), vid Allmogen fler (${manga})`, fore === 1 && manga > 1],
      [`stölderna väcker en lag som tas upp (${om ?? 'inget skäl'})`, tog && lag],
      [`straffet står i lagen (${straff === undefined ? '-' : SIM.STRAFF_NAMN[straff]})`, straff !== undefined],
      ['en lag kan ta rösten från kvinnorna', utan && med],
      [`över taket efterlevs alla lagar sämre (${e0.toFixed(2)} → ${e1.toFixed(2)})`, e1 < e0],
    ];
  },
};
SCENARIER.tinget = {
  text: 'Steg 8.4.7–8.4.10: tinget avgör skulden, straffet står i lagen och blir likadant varje gång, och den som sett någon dö av en farlig handling blir rädd för den',
  kor: () => {
    const { s, v, l } = medLedare(), q = v[1], d = v[2];
    s.seder.v.rang = 1;
    s.styre!.lagar = [{ id: 'stoldforbud', t: s.now, straff: 4, av: l.id, om: '' }];
    // ledaren såg stölden
    SIM.handelse(s, q, 'stold', d, 'en yxa');
    for (const p of v) p.intryck = p.intryck ?? [];
    (l.intryck ??= []).push({ om: q.id, namn: q.name, k: 'tjuv', v: 1, c: 1, t: s.now, bev: [{ h: 'stold', t: s.now, mot: d.id, motNamn: d.name, sett: true }] });
    const yxa = SIM.newTing(s, 'yxa', 1, q.id), fore = yxa.agare;
    klockan(s);
    s.now = s.now - (s.now % 86400000) + 20 * 3600000;
    for (let i = 0; i < 20 && !(s.styre!.ratt?.length); i++) { SIM.stepStyre(s); }
    const r = s.styre!.ratt?.[0];
    // en dör under björnjakten där de andra ser det, och de blir rädda för att jaga björn
    const s2 = medLedare(7).s; nyInvanare(s2, 'm', 25); nyInvanare(s2, 'k', 25);
    const v2 = SIM.living(s2), offer = v2[0];
    offer.task = { act: 'bjornjakt', phase: 'do', tx: offer.x, ty: offer.y, until: s2.now, carry: 0, why: '' } as SIM.Task;
    for (const p of v2) { p.x = offer.x + 1; p.y = offer.y; }
    SIM.die(s2, offer, 'bjorn');
    const radda = SIM.living(s2).filter(p => (p.raddAkt?.bjornjakt ?? 0) > 0).length;
    SIM.lagDygn(s2);
    const kvar = SIM.living(s2)[0]; kvar.pot.mod = 1; // (den fega låter bli det hen är rädd för)
    return [
      [`rättegången gäller lagens straff (${r ? SIM.STRAFF_NAMN[r.steg] : 'ingen'}) eller så efterlevdes lagen inte (${s.stat?.lag_ej_efterlevd ?? 0})`, !!r && r.steg === 4 || (s.stat?.lag_ej_efterlevd ?? 0) > 0],
      [`böterna går till den drabbade (${yxa.agare === d.id ? d.name : 'ingen'})`, !r || yxa.agare === d.id || yxa.agare === fore],
      [`de som såg björnen döda ${offer.name} blir rädda för att jaga björn (${radda})`, radda === SIM.living(s2).length],
      [`den som är rädd nog låter bli det (${SIM.raddFor(s2, kvar, 'bjornjakt')}), men inte annat (steg 10.2.41: inget tabu för hela byn)`, SIM.raddFor(s2, kvar, 'bjornjakt') === 'jaga björn' && !SIM.raddFor(s2, kvar, 'fiske') && !('tabuAkt' in s2)],
    ];
  },
};
SCENARIER.skatt = {
  text: 'Steg 10.5.3: skattelagen tar en procent av det varje vuxen över 18 år äger, en gång per dygn (ett år i spelet), till byns förråd. Man betalar med hela saker och silver, först det man har över. Medan lagen gäller ger ingen en del av det hen skaffar till byn, men gåvor till den i nöd finns kvar',
  kor: () => {
    const { s } = medLedare();
    tomtForrad(s); s.ting = [];
    const [a, b, c] = treVuxna(s, 0, q => { q.warm = 1; q.habit = {}; q.pot.empati = 10; });
    s.people = [a, b, c];
    for (const q of [a, b]) q.born = s.now - 30 * SIM.DAY;
    c.born = s.now - 16 * SIM.DAY;
    s.delning = { andel: 0 };
    SIM.put(s, 'silver', 200, { [a.id]: 200 }); SIM.put(s, 'silver', 40, { [b.id]: 40 }); SIM.put(s, 'silver', 100, { [c.id]: 100 });
    const kniv = SIM.addTool(s, 'kniv', b); kniv.hos = b.id;
    const silver = (p: Person) => SIM.ownsAmount(s, p, 'silver'), byns = () => SIM.amountOf(s, 'silver') - SIM.ownedSum(s, 'silver');
    // utan lag ingen skatt
    SIM.skattDygn(s, SIM.DAY);
    const utan = silver(a) === 200 && silver(b) === 40 && byns() === 0;
    SIM.stepDelning(s); const delningFore = s.delning?.andel ?? 0;
    // med lag
    s.styre!.lagar = [{ id: 'skatt', t: s.now - 2 * SIM.DAY, straff: 4, av: a.id, om: '' }];
    const skuldA = SIM.skattAv(s, a, SIM.DAY), skuldB = SIM.skattAv(s, b, SIM.DAY);
    SIM.skattDygn(s, SIM.DAY);
    const betaltA = 200 - silver(a), betaltB = 40 - silver(b);
    // ingen delning medan lagen gäller, men en hungrig anhörig får ändå en gåva
    SIM.stepDelning(s); const delningLag = s.delning?.andel ?? 0;
    SIM.gain(s, a, 'bar', 20);
    const allt = SIM.ownsAmount(s, a, 'bar') === 20;
    b.mother = a.id; b.hunger = 0.9;
    for (let i = 0; i < 20 && SIM.ownsAmount(s, b, 'bar') <= 0; i++) SIM.askForGift(s, a, b);
    const gava = SIM.ownsAmount(s, b, 'bar') > 0;
    // när lagen tas bort slutar skatten och delningen är tillbaka
    s.styre!.lagar = [];
    const a0 = silver(a), byn0 = byns();
    SIM.skattDygn(s, SIM.DAY); SIM.stepDelning(s);
    return [
      ['utan lag tas ingen skatt', utan],
      [`med lag betalar en med silver exakt (${betaltA} silver för en skatt på ${skuldA.toFixed(2)}), och byns förråd växer lika mycket (${byn0})`, betaltA > 0 && Math.abs(betaltA - skuldA) <= 0.5 && byn0 === betaltA + betaltB],
      [`den första nivån går före: silvret (${betaltB} för ${skuldB.toFixed(2)}) och inte kniven i handen`, betaltB > 0 && Math.abs(betaltB - skuldB) <= 0.5 && kniv.agare === b.id && kniv.hos === b.id],
      [`en 16-åring betalar inget (${silver(c)} silver kvar)`, silver(c) === 100],
      [`ingen delning medan lagen gäller (${delningFore.toFixed(2)} → ${delningLag}), alla 20 bär blev hens egna`, delningFore > 0 && delningLag === 0 && allt],
      ['men en hungrig anhörig får ändå en gåva', gava],
      [`byns statistik räknar skatten (${(s.stat?.skattVarde ?? 0).toFixed(0)}) och loggen har en rad`, (s.stat?.skattVarde ?? 0) === byn0 && s.log.some(e => e.text.startsWith('Skatten gav byns förråd'))],
      [`när lagen tas bort slutar skatten (${a0} → ${silver(a)}) och delningen är tillbaka (${(s.delning?.andel ?? 0).toFixed(2)})`, silver(a) === a0 && byns() === byn0 && (s.delning?.andel ?? 0) > 0],
    ];
  },
};
SCENARIER.skattetal = {
  text: 'Steg 10.5.4: skattelagens tal (procenten, åldern och två ribbor) ändras var för sig med en omröstning. Var och en vill ha ett eget värde efter vad hen äger och hur hen lutar mot Sammanhållning; under Envälde går ledarens förslag igenom. Över den övre ribban är procenten den dubbla, och den som betalar mer än hen tycker är rätt blir missnöjd',
  kor: () => {
    const { s } = medLedare();
    tomtForrad(s); s.ting = [];
    const folk = SIM.living(s).slice(0, 5), [rik, ...fattiga] = folk;
    s.people = folk;
    for (const p of folk) { p.mother = p.father = p.partner = undefined; p.born = s.now - 30 * SIM.DAY; p.missnoje = 0; (p.tek ??= {}).ledarskap = 1; p.tek.lag = 1; }
    s.styre!.ledare = fattiga[0].id; s.seder.v.rang = -0.5; s.delning = { andel: 0 };
    SIM.put(s, 'silver', 500, { [rik.id]: 500 });
    [5, 10, 10, 10].forEach((n, i) => SIM.put(s, 'silver', n, { [fattiga[i].id]: n }));
    s.styre!.lagar = [{ id: 'skatt', t: s.now - 2 * SIM.DAY, straff: 4, av: rik.id, om: '' }];
    const lag = () => s.styre!.lagar!.find(l => l.id === 'skatt')!;
    const fattigast = fattiga[0], fore = SIM.skattAv(s, fattigast, SIM.DAY);
    // en fattig majoritet röstar fram en undre ribba, och den fattigaste slipper skatt
    const forslag = SIM.TAS_UPP.find(r => r.id === 'lagtal')!.lista(s, fattigast).find(f => f.fr.d.k === 'undre');
    const gickUndre = !!forslag && SIM.rostaOm(s, forslag.fr);
    const undre = lag().tal?.undre ?? 0, efter = SIM.skattAv(s, fattigast, SIM.DAY);
    // under Envälde går ledarens förslag igenom
    s.styre!.ledare = rik.id; s.seder.v.rang = 1; rik.pot.empati = 2; rik.upp = []; // (en rik som lutar mot Självförsörjning vill ha lägre procent)
    const fram = SIM.framlaggare(s), rikF = SIM.TAS_UPP.find(r => r.id === 'lagtal')!.lista(s, rik).find(f => f.fr.d.k === 'procent');
    const gickRik = !!rikF && SIM.rostaOm(s, rikF.fr), procent = lag().tal?.procent ?? 0.05;
    const pabjod = s.log.some(e => e.text.startsWith(`${rik.name} påbjöd`));
    // den rika betalar dubbel procent över den övre ribban
    lag().tal = { procent: 0.05, undre: 0, ovre: 200 };
    const e = SIM.efterlevs(s), dubbel = SIM.skattAv(s, rik, SIM.DAY) / e, vantat = 0.05 * 200 + 0.05 * SIM.SKATT.hogGanger * 300;
    // en ändrad procent ändrar beloppet
    lag().tal = { procent: 0.1, undre: 0, ovre: 200 };
    const dubbelt = SIM.skattAv(s, rik, SIM.DAY) / e;
    // den som vill ha lägre procent blir missnöjd
    lag().tal = { procent: 0.2 };
    SIM.skattDygn(s, SIM.DAY);
    return [
      [`en fattig majoritet röstar fram en undre ribba (${undre})`, gickUndre && undre > 0],
      [`och den fattigaste slipper skatt (${fore.toFixed(2)} → ${efter.toFixed(2)})`, fore > 0 && efter === 0],
      [`under Envälde lägger bara ledaren fram (${fram.length}) och hens förslag går igenom (procenten ${Math.round(procent * 100)} %)`, fram.length === 1 && fram[0] === rik && gickRik && procent < 0.05],
      ['och loggen säger att ledaren påbjöd den', pabjod],
      [`den rika betalar dubbel procent över den övre ribban (${dubbel.toFixed(1)}, väntat ${vantat.toFixed(1)})`, Math.abs(dubbel - vantat) < 1e-6],
      [`en ändrad procent ändrar beloppet (${dubbel.toFixed(1)} → ${dubbelt.toFixed(1)})`, Math.abs(dubbelt - 2 * dubbel) < 1e-6],
      [`den som vill ha lägre procent blir missnöjd (${(rik.missnoje ?? 0).toFixed(3)})`, (rik.missnoje ?? 0) > 0],
    ];
  },
};
SCENARIER.sederfas8 = {
  text: 'Steg 8.4.11–8.4.15: sederna Krig och fred och Värna – Bruka låses upp när det de styr finns; Värna gör folk ledsna av fällda träd. Talen i Byggplanen följer sederna och ledaren',
  kor: () => {
    const { s, v, l } = medLedare();
    const l0 = SIM.sedOppen(s, 'natur');
    SIM.oppnaSed(s, 'natur');
    const varna = v.find(p => SIM.drar(s, p).natur < -0.2);
    SIM.naturTanke(s, 'Ett träd fälldes');
    const ledsen = !!varna?.thoughts.some(t => t.text === 'Ett träd fälldes');
    s.seder.v.gemenskap = 1; const tat = SIM.byplanNu(s).tat; s.seder.v.gemenskap = -1; const gles = SIM.byplanNu(s).tat;
    s.seder.v.nyfikenhet = 1; l.pot.nyfikenhet = 18; const rader = SIM.byplanNu(s).form;
    s.seder.v.nyfikenhet = -1; l.pot.nyfikenhet = 2; const ring = SIM.byplanNu(s).form;
    return [
      ['Värna – Bruka är låst tills träd fälls', !l0],
      ['den som drar åt Värna blir ledsen av ett fällt träd', !varna || ledsen],
      [`husen tätt eller glest följer sederna (${tat.toFixed(2)}, ${gles.toFixed(2)})`, tat > gles],
      [`formen läser sederna (${rader}, ${ring})`, !!rader && !!ring],
    ];
  },
};

// en by med en tro som har tyngd för bud av storleken `storlek` (steg 10.3.8): en gammal tro med ivriga troende, och fler vuxna
// troende när byns egna inte räcker
const medTro = (seed = 6, storlek = 2) => {
  const x = medLedare(seed), { s, v } = x;
  const tr: SIM.Tro = { id: 1, grundare: v[0].id, gnamn: v[0].name, t: s.now - SIM.TYNGD.alderDygn * SIM.DAY, ar: 1, k: 'drom', bakom: 'Rösten', vill: 'att man lyssnar', svek: 'det blir tyst', natur: 60, manga: 40, bekr: s.now, x: Math.floor(v[0].x), y: Math.floor(v[0].y), namn: 'Rösternas väg' };
  s.tron = [tr];
  if (storlek >= 2) tr.bud = [{ id: 'prast', t: s.now }]; // en tro som rymmer budet har en präst (steg 10.3.12)
  while (v.length < SIM.tyngdFor(storlek)) { const p = nyInvanare(s, v.length % 2 ? 'k' : 'm', 30); (p.tek ??= {}).ledarskap = 1; p.tek.lag = 1; v.push(p); }
  for (const p of v) { p.tro = 1; p.troStyrka = 100; p.andlig = 80; p.pot.karisma = 14; }
  return { ...x, tr };
};
SCENARIER.graven = {
  text: 'Steg 8.5.1 och 8.5.7: kroppen blir en sak där personen dog, en vuxen bär den till gravplatsen och gräver, och graven blir en ruta. Att se kroppen sänker humöret, mer för den som stod nära',
  kor: () => {
    const { s, v } = medLedare(), d = v[1], x0 = Math.floor(d.x);
    klockan(s, 10); tandEld(s); setFood(s, 200);
    SIM.die(s, d, 'alderdom');
    const kr = s.kvarlevor?.find(k => k.k === 'kropp' && k.vem === d.id), kx = kr?.x; // där den låg när hen dog; kroppen bärs sedan
    let h = 0, bar = false, stod = 0, kort = '';
    // steg 9.2.130: den som går för att ta hand om den döde går dit, tar upp kroppen direkt och står inte still vid den, och kortet
    // säger vems kropp hen går till
    while (s.kvarlevor?.some(k => k.vem === d.id) && h < 72 * 12) {
      kor(s, 1 / 12); h++;
      for (const p of SIM.living(s)) { const tk = p.task; if (tk?.act !== 'begrava') continue; if (tk.phase === 'do') stod++; if (tk.phase === 'go' && !kort) kort = SIM.taskName(tk); }
    }
    h = Math.round(h / 12);
    { const p = v[2], t0 = p.task; p.task = { act: 'grava', phase: 'go', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '' } as SIM.Task; bar = SIM.gangDelar(s, p).delar.some(r => r.k === 'bar'); p.task = t0; } // den som bär kroppen dit
    const g = s.gravar?.find(q => q.vem === d.id);
    return [
      [`kroppen ligger där hen dog (${kx}, x0 ${x0})`, !!kr && kx === x0],
      ['den som bär kroppen till graven går långsammare', bar],
      [`kroppen begravs (${h} timmar)`, !!g],
      [`den som tar hand om den döde står inte still vid kroppen (${stod * 5} minuter)`, stod <= 1],
      [`kortet säger vems kropp hen går till ("${kort || SIM.taskName({ act: 'begrava', phase: 'go', tx: 0, ty: 0, until: 0, carry: 0, why: `Bär ${d.name} till graven` })}")`, (kort || SIM.taskName({ act: 'begrava', phase: 'go', tx: 0, ty: 0, until: 0, carry: 0, why: `Bär ${d.name} till graven` })) === `Går till ${/[sxz]$/i.test(d.name) ? d.name : d.name + 's'} kropp`],
      ['graven är en ruta som man kan fråga efter', !!g && SIM.gravAt(s, g.x, g.y) === g],
    ];
  },
};
// begraver d direkt: kroppen blir en grav där p står (steg 10.4.2)
function begrav(s: State, p: Person, d: Person) {
  SIM.die(s, d, 'alderdom');
  const kr = s.kvarlevor!.find(k => k.k === 'kropp' && k.vem === d.id)!;
  SIM.gravKlar(s, p, { act: 'grava', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, ref: kr.id, why: '' } as SIM.Task);
  return s.gravar!.find(g => g.vem === d.id)!;
}
SCENARIER.gravvard = {
  text: 'Steg 10.4.2: graven är först en jordhög, och den som minns den döda gör vården. Utan tro en gravstolpe innan byn har plankor och sedan en gravbräda; med tro blir raden som drar mest sed vid den första begravningen, de stora får en gravhög, den ovärdiga ingen, och utan material står jordhögen kvar',
  kor: () => {
    // utan tro: en gravstolpe, gjord av någon som minns den döda
    const a = medLedare(), s = a.s, d = a.v[1];
    klockan(s, 9); tandEld(s); setFood(s, 400); SIM.setAmount(s, 'ved', 300); SIM.setAmount(s, 'virke', 6); SIM.setAmount(s, 'plankor', 0);
    for (const p of s.people) if (p.tek) delete p.tek.klyvplats;
    for (const q of SIM.living(s)) if (q !== d) SIM.handelse(s, d, 'bjorndodare', undefined, undefined, q, 2);
    const g = begrav(s, a.v[0], d), hog = !g.vard, forst = SIM.vardFor(s, g);
    let h = 0; while (!g.vard && h < 48 * 12) { kor(s, 1 / 12); h++; }
    const virke = SIM.amountOf(s, 'virke');
    SIM.setAmount(s, 'plankor', 3);
    const g2 = begrav(s, a.v[0], a.v[2]), brada = SIM.vardFor(s, g2);
    // utan material står jordhögen kvar
    SIM.setAmount(s, 'plankor', 0); SIM.setAmount(s, 'virke', 0);
    const p = a.v[0], tk = { act: 'gravvard', phase: 'do', tx: g2.x, ty: g2.y, until: s.now + SIM.HOUR, carry: 0, tool: 'gravbrada', ref: g2.vem, why: '' } as SIM.Task;
    p.task = tk; SIM.gravvardBorja(s, p, tk); const utan = !p.task && !g2.vard;
    // en ovärdig grav får ingen vård
    const bov = a.v[3]; bov.brottsling = true as never; const g3 = bov ? begrav(s, a.v[0], bov) : undefined;
    // med tro: naturen ger gravstolpen som sed
    const b = medTro(6, 1); b.tr.natur = 20; SIM.setAmount(b.s, 'virke', 4);
    const gb = begrav(b.s, b.v[0], b.v[1]), sedB = b.tr.bud?.find(x => x.id === 'gravStolpe'), vardB = SIM.vardFor(b.s, gb);
    // livet efter och festen: gravhuset som sed, och ledaren får en gravhög
    const c = medTro(6, 2); c.tr.sk = { ...c.tr.sk, livet: 90, fest: 20 }; SIM.setAmount(c.s, 'virke', 4); SIM.setAmount(c.s, 'plankor', 4);
    const led = c.v[1]; led.ledde = true;
    const gc = begrav(c.s, c.v[0], led), budC = (c.tr.bud ?? []).map(x => x.id), vardC = SIM.vardFor(c.s, gc);
    const gd = begrav(c.s, c.v[0], c.v[2]), vardD = SIM.vardFor(c.s, gd);
    return [
      ['graven är först en jordhög', hog && !!g],
      [`utan tro och plankor blir det en gravstolpe (${forst})`, forst === 'gravstolpe'],
      [`den som minns den döda gör vården (${g.vard}, ${h * 5} minuter, virke ${virke} av 6)`, g.vard === 'gravstolpe' && virke === 5],
      [`när byn har plankor blir det en gravbräda (${brada})`, brada === 'gravbrada'],
      ['utan material står jordhögen kvar', utan],
      [`den ovärdiga får ingen vård (${g3 && SIM.vardFor(s, g3)})`, !!g3 && SIM.vardFor(s, g3) === undefined],
      [`en tro nära naturen får gravstolpen som sed vid första begravningen (${vardB})`, !!sedB && vardB === 'gravstolpe'],
      [`en tro som ser mot livet efter får gravhuset och gravhögen som seder (${budC.filter(x => x.startsWith('grav')).join(', ')})`, budC.includes('gravhus') && budC.includes('gravhog')],
      [`ledaren är stor och får en gravhög (${vardC}), de andra gravhuset (${vardD})`, !!gc.stor && vardC === 'gravhog' && !gd.stor && vardD === 'gravhus'],
    ];
  },
};
SCENARIER.stengrav = {
  text: 'Steg 10.4.3: stengravarna. Utan tro blir det en gravsten när byn har en huggen sten, och stenen tas när ristningen börjar; en tro går från trä till sten när tyngden räcker, och de stora får en skeppssättning',
  kor: () => {
    const a = medLedare(), s = a.s, d = a.v[1];
    klockan(s, 9); tandEld(s); setFood(s, 400); SIM.setAmount(s, 'ved', 300); SIM.setAmount(s, 'huggen_sten', 2);
    for (const q of SIM.living(s)) if (q !== d) SIM.handelse(s, d, 'bjorndodare', undefined, undefined, q, 2);
    const g = begrav(s, a.v[0], d), forst = SIM.vardFor(s, g);
    let h = 0; while (!g.vard && h < 48 * 12) { kor(s, 1 / 12); h++; }
    const sten = SIM.amountOf(s, 'huggen_sten');
    // en tro med tyngd för bud av storlek 2 som kan hugga sten: stensättningen går före stockramen, skeppssättningen före gravhögen
    const c = medTro(6, 2); c.tr.natur = 50; c.tr.sk = { ...c.tr.sk, oppen: 90, livet: 90, fest: 20 };
    SIM.setAmount(c.s, 'sten', 20); SIM.setAmount(c.s, 'huggen_sten', 4); SIM.setAmount(c.s, 'virke', 4);
    const led = c.v[1]; led.ledde = true;
    const gc = begrav(c.s, c.v[0], led), budC = (c.tr.bud ?? []).map(x => x.id), vardC = SIM.vardFor(c.s, gc);
    // en by som inte kan hugga sten stannar vid trä
    const e = medTro(6, 2); e.tr.natur = 50; e.tr.sk = { ...e.tr.sk, oppen: 90 }; SIM.setAmount(e.s, 'sten', 20); SIM.setAmount(e.s, 'huggen_sten', 0); SIM.setAmount(e.s, 'virke', 4);
    for (const p of e.s.people) if (p.tek) delete p.tek.stenhuggarplats;
    begrav(e.s, e.v[0], e.v[1]); const budE = (e.tr.bud ?? []).map(x => x.id);
    return [
      [`utan tro och med en huggen sten blir det en gravsten (${forst})`, forst === 'gravsten'],
      [`stenen ristas vid graven (${g.vard}, ${h * 5} minuter, huggen sten ${sten} av 2)`, g.vard === 'gravsten' && sten === 1],
      [`en tro med tyngd väljer sten (${budC.filter(x => /grav|sattning|stock/.test(x)).join(', ')})`, budC.includes('stensattning') && budC.includes('skeppssattning') && !budC.includes('stockram')],
      [`ledaren får en skeppssättning (${vardC})`, vardC === 'skeppssattning'],
      [`en by som inte kan hugga sten stannar vid trä (${budE.filter(x => /grav|sattning|stock/.test(x)).join(', ')})`, budE.includes('stockram') && !budE.includes('stensattning')],
    ];
  },
};
SCENARIER.gravtext = {
  text: 'Steg 10.4.4: när vården är klar ristar den som gjorde den en text ur sitt minne: namnet, relationen och de två händelser som väger tyngst, eller bara namnet från den som inte kände hen. En jordhög har ingen text',
  kor: () => {
    const a = medLedare(), s = a.s, d = a.v[1], w = a.v[2], fram = a.v[3];
    klockan(s, 9); SIM.setAmount(s, 'virke', 6);
    if (w.partner !== undefined) { const o = SIM.byId(s, w.partner); if (o) o.partner = undefined; w.partner = undefined; }
    if (d.partner !== undefined) { const o = SIM.byId(s, d.partner); if (o) o.partner = undefined; d.partner = undefined; }
    SIM.pair(s, w, d, true);
    SIM.handelse(s, d, 'bjorndodare', undefined, undefined, w, 2); SIM.handelse(s, d, 'vargdodare', undefined, undefined, w, 2); SIM.handelse(s, d, 'gava', w, 'en fisk', w, 2);
    const g = begrav(s, a.v[0], d), jord = g.text;
    const tk = { act: 'gravvard', phase: 'do', tx: g.x, ty: g.y, until: s.now, carry: 0, tool: 'gravstolpe', ref: g.vem, why: '' } as SIM.Task;
    w.task = tk; SIM.gravvardBorja(s, w, tk); SIM.gravvardKlar(s, w, tk);
    const forst = g.text;
    // den som inte kände hen ristar bara namnet
    const e = a.v[4] ?? nyInvanare(s, 'm', 30), g2 = begrav(s, a.v[0], e);
    fram.intryck = (fram.intryck ?? []).filter(x => x.om !== e.id);
    const tk2 = { ...tk, ref: g2.vem } as SIM.Task; fram.task = tk2; SIM.gravvardBorja(s, fram, tk2); SIM.gravvardKlar(s, fram, tk2);
    // texten ändras inte när minnet bleknar
    w.intryck = []; const sen = g.text;
    return [
      ['en jordhög har ingen text', jord === undefined],
      [`texten har namnet, relationen och två händelser ("${forst}")`, !!forst && forst.startsWith(d.name + ', ' + O.gen(w.name) + ' ' + (d.sex === 'k' ? 'hustru' : 'man')) && forst.includes('dödade en björn') && forst.includes(' och ') && (g.textBev?.length ?? 0) === 2],
      [`skribenten sparas (${g.textAv?.namn})`, g.textAv?.id === w.id],
      [`den som inte kände hen ristar bara namnet ("${g2.text}")`, g2.text === e.name],
      ['texten ändras inte när minnet bleknar', sen === forst],
    ];
  },
};
SCENARIER.runsten = {
  text: 'Steg 10.6.1: runstenen. Den som sörjer en nära anhörig och kan hugga sten reser en sten med 3 huggna stenar på byns kant; den som går förbi läser den och får intrycket i andra hand, den döda glöms långsammare, stenen står kvar för elden och för allt som byggs, och utan sorg eller bedrift reses ingen',
  kor: () => {
    const a = medLedare(), s = a.s, d = a.v[1], w = a.v[2], annan = a.v[3];
    klockan(s, 8); setFood(s, 400); SIM.setAmount(s, 'ved', 300); SIM.setAmount(s, 'huggen_sten', 3);
    for (const p of a.v) (p.tek ??= {}).stenhuggarplats = 1;
    if (w.partner !== undefined) { const o = SIM.byId(s, w.partner); if (o) o.partner = undefined; w.partner = undefined; }
    if (d.partner !== undefined) { const o = SIM.byId(s, d.partner); if (o) o.partner = undefined; d.partner = undefined; }
    SIM.pair(s, w, d, true);
    SIM.handelse(s, d, 'bjorndodare', undefined, undefined, w, 2);
    const utan = SIM.runstenLust(s, annan) === undefined && SIM.runstenLust(s, w) === undefined;
    SIM.die(s, d, 'alderdom');
    const lust = SIM.runstenLust(s, w);
    const ingenBedrift = () => { for (const p of SIM.living(s)) p.bedrift = undefined; }; // det som kommer på något under tiden vill resa en sten om det
    korTills(s, () => !!s.runstenar?.length, 72 * 3600, () => { ingenBedrift(); for (const g of s.gravar ?? []) g.ovardig = true; }); // graven får ingen vård och ingen gravtext, som annars tar lusten
    const r = s.runstenar?.[0], sten = SIM.amountOf(s, 'huggen_sten');
    // en inflyttad som aldrig kände den döda går förbi
    const ny = nyInvanare(s, 'k', 30);
    if (r) { ny.x = r.x + 1.5; ny.y = r.y + 0.5; }
    ny.task = undefined; SIM.runstenTimme(s);
    const e = ny.intryck?.find(x => x.om === d.id);
    // den döda glöms långsammare: samma minne med och utan stenen
    const minns = (med: boolean) => {
      const sp = s.runstenar; if (!med) s.runstenar = []; const q = ny; q.paminnd = undefined;
      q.intryck = [{ om: d.id, namn: d.name, k: 'bjorndodare', v: 0.6, c: 1, t: s.now }] as SIM.Person['intryck']; SIM.glomRykten(s, 72);
      const c = q.intryck?.[0]?.c ?? 0; s.runstenar = sp; return c;
    };
    const med = minns(true), utanSten = minns(false);
    // stenen står kvar: ingen station, inget hus och ingen lagerplats på rutan, och elden tar den inte
    const kvar = !!r && !SIM.usable(s, r.x, r.y) && !SIM.stationAt(s, r.x, r.y);
    if (r) { for (let i = 0; i < 3; i++) SIM.tand(s, r.y * SIM.W + r.x, 'blixt', 1); korTills(s, () => false, 600); }
    const brann = !s.runstenar?.some(q => q === r);
    // en till som varken sörjer eller har en bedrift reser ingen
    const fore = s.runstenar?.length ?? 0; SIM.setAmount(s, 'huggen_sten', 6); korTills(s, () => false, 12 * 3600, ingenBedrift);
    return [
      ['utan sorg eller bedrift finns ingen lust', utan],
      [`den som sörjer sin partner vill resa en sten (${lust?.slag} ${Math.round((lust?.w ?? 0) * 100) / 100})`, lust?.slag === 'minne' && lust.om.id === d.id],
      [`stenen reses med 3 huggna stenar ("${r?.text}", ${r?.runor}, sten kvar ${sten})`, !!r && r.av.id === w.id && r.om.id === d.id && sten === 0 && r.text.includes('dödade en björn') && /[ᚠ-ᛪ]/.test(r.runor)],
      ['den som reste stenen ger en notis och en rad i krönikan', !!s.notiser?.lista.some(n => n.id === 'runsten') && !!s.hist?.kronika.some(k => k[2] === 'runsten')],
      [`en inflyttad som går förbi får intrycket i andra hand (${e?.k}, led ${e?.led}, källa ${e?.src === w.id ? 'ristaren' : e?.src})`, !!e && e.k === 'bjorndodare' && e.src === w.id && e.led === 1],
      [`den döda glöms långsammare (säkerheten efter tre dygn ${Math.round(med * 100)} % med stenen, ${Math.round(utanSten * 100)} % utan)`, med > utanSten],
      ['inget annat kan stå på stenens ruta', kvar],
      ['elden tar inte stenen', !brann],
      [`ingen sten reses utan sorg eller bedrift (${(s.runstenar?.length ?? 0) - fore} nya)`, (s.runstenar?.length ?? 0) === fore],
    ];
  },
};
SCENARIER.heligsten = {
  text: 'Steg 10.6.2: den heliga stenen. Prästen som kan stenhuggning ristar trons heliga kväden på en runsten med 3 huggna stenar, stenen hamnar vid den heliga platsen och bär kvädet som det löd, en troende som går förbi får tanken och en otroende ingen, och lusten sjunker när stenen står',
  kor: () => {
    const { s, v, tr } = medTro(6, 2), pr = v[0];
    klockan(s, 8); setFood(s, 400); SIM.setAmount(s, 'ved', 300); SIM.setAmount(s, 'huggen_sten', 3);
    tr.prast = pr.id; (pr.tek ??= {}).stenhuggarplats = 1;
    tr.kvade = { t: s.now, text: 'Rösten vill att man lyssnar.', av: pr.id };
    const hx = Math.floor(pr.x) + 5, hy = Math.floor(pr.y) + 3;
    (s.heliga ??= []).push({ x: hx, y: hy, k: 'fodd' as SIM.HeligPlats['k'], tro: tr.id, t: s.now, om: 'där tron föddes' });
    const fore = SIM.runstenLust(s, pr), kvade = tr.kvade.text;
    const ingenBedrift = () => { for (const p of SIM.living(s)) { p.bedrift = undefined; p.sorg = undefined; } tr.prast = pr.id; };
    korTills(s, () => !!s.runstenar?.length, 48 * 3600, ingenBedrift);
    const r = s.runstenar?.[0], sten = SIM.amountOf(s, 'huggen_sten'), avst = r ? Math.hypot(r.x - hx, r.y - hy) : Infinity;
    // en troende och en otroende går förbi
    const tro = v[1], otro = nyInvanare(s, 'k', 30); otro.tro = undefined;
    for (const q of [tro, otro]) { q.thoughts = []; q.task = undefined; if (r) { q.x = r.x + 1.5; q.y = r.y + 0.5; } }
    SIM.runstenTimme(s);
    const las = (q: SIM.Person) => !!q.thoughts?.some(x => x.text === 'Läste de heliga kvädena');
    const efter = SIM.runstenLust(s, pr);
    return [
      [`prästen vill rista kvädet (${fore?.slag} ${Math.round((fore?.w ?? 0) * 100) / 100})`, fore?.slag === 'helig' && fore.om.id === tr.id],
      [`prästen ristar kvädet med 3 huggna stenar ("${r?.text}", ${r?.runor}, sten kvar ${sten})`, !!r && r.slag === 'helig' && r.tro === tr.id && r.av.id === pr.id && r.text === kvade && sten === 0 && /[ᚠ-ᛪ]/.test(r.runor)],
      [`stenen står vid den heliga platsen (${Math.round(avst * 10) / 10} rutor)`, avst <= SIM.SKRIFT.heligR],
      ['en troende som går förbi får tanken', las(tro)],
      ['en otroende får ingen', !las(otro)],
      [`lusten sjunker när stenen står (${Math.round((fore?.w ?? 0) * 100) / 100} → ${Math.round((efter?.w ?? 0) * 100) / 100})`, (efter?.w ?? 0) < (fore?.w ?? 0)],
    ];
  },
};
SCENARIER.pergament = {
  text: 'Steg 10.6.4: pergament och bläck. Tekniken kräver garvning och stenhuggning och kommer man på vid garvningsställningen; där, och bara där, blir 1 skinn 4 blad pergament (5 min). Bläck är sot av 1 kol gnidet med vatten (2 min) i en liten lerkruka, som rymmer bläck till 2 blad. Ett tomt blad är lätt, slits dubbelt så fort som skinn och brinner',
  kor: () => {
    const { KLAR_FOR, TILLVERKA, TEK, SAKER, STATIONER, VATSKOR, setAmount, amountOf, addTool, vatskaAv } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    const tek = TEK.pergament!;
    p.tek = { ...(p.tek ?? {}), pergament: 1, garvning: 1, stenhuggarplats: 1 };
    setAmount(s, 'skinn', 3);
    const uppgift = (act: string) => ({ act, phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '' }) as any;
    KLAR_FOR[TILLVERKA.gora_pergament!.act]!(s, p, uppgift('gora_pergament'), 0);
    const blad = amountOf(s, 'pergament'), skinn = amountOf(s, 'skinn');
    const st = STATIONER.garvning!;
    setAmount(s, 'kol', 2);
    addTool(s, 'vattensack', p).inne = { v: 'vatten', n: 1 };
    const kr = addTool(s, 'lerkruka_liten', p); kr.hos = undefined;
    KLAR_FOR[TILLVERKA.riva_black!.act]!(s, p, uppgift('riva_black'), 0);
    const black = vatskaAv(s, 'black'), kol = amountOf(s, 'kol');
    const kvot = SAKER.pergament!.slits! / SAKER.skinn!.slits!;
    return [
      [`tekniken kräver garvning och stenhuggning och kommer man på vid garvningsställningen (${tek.krav.join(', ')}; ${tek.forsok?.vid.join(', ')})`, tek.krav.includes('garvning') && tek.krav.includes('stenhuggarplats') && !!tek.forsok?.vid.includes('garvning')],
      [`vid garvningsställningen, och bara där, blir 1 skinn 4 blad (${blad} blad, ${3 - skinn} skinn åtgick, ${TILLVERKA.gora_pergament!.min} min)`, blad === 4 && skinn === 2 && st.bara!.includes('gora_pergament') && Object.entries(STATIONER).every(([id, d]) => id === 'garvning' || !(d.gor as string[] | undefined)?.includes('gora_pergament'))],
      [`1 kol och vatten ger bläck till 2 blad i den lilla krukan (${black} bläck i ${kr.inne?.v ?? 'ingen'}, ${2 - kol} kol åtgick, ${TILLVERKA.riva_black!.min} min)`, black === 2 && kol === 1 && kr.inne?.v === 'black' && VATSKOR.black.i.includes('lerkruka_liten')],
      [`ett blad är lätt (${SAKER.pergament!.vikt}), slits ute dubbelt så fort som skinn (${kvot.toFixed(2)} gånger) och brinner`, (SAKER.pergament!.vikt ?? 1) < 0.2 && Math.abs(kvot - 2) < 0.01 && !SAKER.pergament!.brinnerInte],
    ];
  },
};

SCENARIER.skriva = {
  text: 'Steg 10.6.5: att skriva och läsa. Den som kommer åt ett blad och bläck skriver på fritiden, på dagen och i ljuset vid elden (3 minuter, 1 blad och 1 dos bläck), oftare ju högre färdigheten är. Det skrivna bladet är skrivarens, och andra läser det där det ligger (2 minuter) när det har något nytt för dem',
  kor: () => {
    const { skrivVal, lasVal, skrivKlar, lasKlar, setAmount, amountOf, addTool, fyllVatska, vatskaAv, tingOf, lightLevel, findL, SKRIFT } = SIM;
    const s = createState(1, START), v = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen);
    const [p, q, o] = v as [Person, Person, Person];
    for (const r of v) { r.sorg = []; r.bedrift = undefined; r.intryck = []; r.lardomar = []; }
    const lar = { k: 'fara' as const, a: 3, v: 1, c: 0.9, t: s.now, om: 'Ulv dog där' };
    p.lardomar = [{ ...lar }]; o.lardomar = [{ ...lar }];
    p.skill.berattande = 15; o.skill.berattande = 0;
    while (lightLevel(s.now) < 1) s.now += SIM.HOUR;
    const at = { x: p.x, y: p.y };
    setAmount(s, 'pergament', 2);
    const utanBlack = skrivVal(s, p, at);
    const kr = addTool(s, 'lerkruka_liten', p); kr.hos = undefined; fyllVatska(s, 'black', 2, kr);
    const med = skrivVal(s, p, at)?.w ?? 0, utanSkill = skrivVal(s, o, at)?.w ?? 0;
    p.task = { act: 'skriva', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '' };
    skrivKlar(s, p);
    SIM.placeTools(s);
    const blad = tingOf(s).find(t => t.k === 'blad');
    const vill = lasVal(s, q);
    lasKlar(s, q, { act: 'lasa', phase: 'do', tx: q.x, ty: q.y, until: s.now, carry: 0, why: '', ref: blad?.id });
    const l = findL(q, 'fara', 3);
    const igen = lasVal(s, q), vet = lasVal(s, o);
    // utan ljus: mitt i natten, långt från elden
    while (lightLevel(s.now) > 0) s.now += SIM.HOUR;
    if (blad) { blad.x = 1; blad.y = 1; }
    const r = v[3]!; r.lardomar = []; r.intryck = [];
    const morkSkriv = skrivVal(s, p, { x: 1.5, y: 1.5 }), morkLas = lasVal(s, r);
    return [
      [`utan bläck skriver ingen (${utanBlack ? 'skriver' : 'ingen'})`, !utanBlack],
      [`en berättare med blad och bläck vill skriva mer än en utan färdighet (${med.toFixed(2)} mot ${utanSkill.toFixed(2)})`, med > 0 && med > utanSkill],
      [`bladet är skrivarens, och ett blad och en dos bläck gick åt (${blad?.agare === p.id ? 'skrivarens' : 'inte'}: ${blad?.skrift?.titel}; ${amountOf(s, 'pergament')} blad och ${vatskaAv(s, 'black')} bläck kvar, ${SKRIFT.skrivMin} min)`, blad?.agare === p.id && amountOf(s, 'pergament') === 1 && vatskaAv(s, 'black') === 1],
      [`en annan vill läsa bladet och får lärdomen med skrivaren som källa (${vill ? vill.why : 'vill inte'}; ${l ? `källa ${l.src === p.id ? p.name : l.src}, säkerhet ${l.c}` : 'ingen lärdom'})`, !!vill && l?.src === p.id && l.c === lar.c],
      [`den som redan vet det läser inte (${igen || vet ? 'läser' : 'läser inte'})`, !igen && !vet],
      [`utan ljus varken skrivs eller läses det (${morkSkriv ? 'skriver' : 'skriver inte'}, ${morkLas ? 'läser' : 'läser inte'})`, !morkSkriv && !morkLas],
    ];
  },
};

SCENARIER.bok = {
  text: 'Steg 10.6.6: böcker. Vid snickarbänken, och bara där, binds 8 blad mellan 2 plankor till en tom bok (5 minuter), som fylls del för del, högst 8 delar av samma slag. Den som kan en teknik skriver en handbok, helst om det få i byn kan, och den som läser den lär sig tekniken utan lärare, så att konsten inte dör med den sista som kunde den',
  kor: () => {
    const { skrivKlar, lasKlar, skrivLust, bokPlats, runstenTimme, setAmount, amountOf, addTool, fyllVatska, tingOf, lightLevel, knows, STATIONER, SKRIFT } = SIM;
    const s = createState(1, START), v = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen);
    const [p, q] = v as [Person, Person];
    for (const r of v) { r.sorg = []; r.bedrift = undefined; r.intryck = []; r.lardomar = []; }
    while (lightLevel(s.now) < 1) s.now += SIM.HOUR;
    for (const r of v) if (r.tek) delete r.tek.garvning;
    p.tek = { ...(p.tek ?? {}), bok: 1, garvning: 1, kniv: 1, skinnklader: 1 }; q.tek = { ...(q.tek ?? {}), kniv: 1, skinnklader: 1 };
    p.skill.berattande = 15;
    setAmount(s, 'pergament', 8); setAmount(s, 'plankor', 2);
    SIM.makeTool(s, p, 'bok'); delete p.tek.bok; // bara garvningen kan hen ensam
    SIM.placeTools(s);
    const bok = tingOf(s).find(t => t.k === 'bok');
    const bara = (STATIONER.snickarbank!.bara as string[]).includes('bok');
    const kr = addTool(s, 'lerkruka_liten', p); kr.hos = undefined; fyllVatska(s, 'black', 2, kr);
    const lust = skrivLust(s, p);
    p.task = { act: 'skriva', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '' };
    skrivKlar(s, p);
    const del = bok?.delar?.[0];
    const annat = bokPlats(s, 'poesi');
    p.died = s.now; runstenTimme(s);
    const kr2 = !!s.hist?.kronika.some(k => String(k[1]).includes('konsten står kvar'));
    let n = 0;
    while (!knows(q, 'garvning') && n < 100) { lasKlar(s, q, { act: 'lasa', phase: 'do', tx: q.x, ty: q.y, until: s.now, carry: 0, why: '', ref: bok?.id }); n++; }
    return [
      [`8 blad och 2 plankor ger boken vid snickarbänken, och bara där (${bok ? 'en bok' : 'ingen bok'}, ${amountOf(s, 'pergament')} blad och ${amountOf(s, 'plankor')} plankor kvar)`, !!bok && amountOf(s, 'pergament') === 0 && amountOf(s, 'plankor') === 0 && bara],
      [`den som ensam kan garvning skriver en del om tekniken i boken (${lust?.slag ?? 'ingen lust'}: ${del?.titel ?? 'ingen del'})`, del?.slag === 'kunskap' && del.tek === 'garvning' && (bok?.delar?.length ?? 0) <= SKRIFT.bokDelar],
      [`en del av ett annat slag tas inte emot (${annat ? 'tas emot' : 'tas inte emot'})`, !annat],
      [`hen dör, och krönikan säger att konsten står kvar i boken (${kr2 ? 'ja' : 'nej'})`, kr2],
      [`en annan läser och kan tekniken (${knows(q, 'garvning') ? `efter ${n} läsningar` : 'kan den inte'}), långsammare än i ett samtal (${SKRIFT.bokLar} mot ${SIM.TEKTAL.larFramsteg} per gång)`, knows(q, 'garvning') && n > 1 && SKRIFT.bokLar < SIM.TEKTAL.larFramsteg],
    ];
  },
};

SCENARIER.skriftkvalitet = {
  text: 'Steg 10.6.7: skriftens kvalitet, rullad på slagets färdighet när skriften skrivs, avgör hur mycket av innehållet som når läsaren. En dålig skrift ger lärdomen med lägre säkerhet och bara en del av en teknik, och ibland en överdrift eller underdrift som slås en gång när den skrivs och står kvar i texten för alla läsare',
  kor: () => {
    const { skrivKlar, lasKlar, setAmount, addTool, fyllVatska, tingOf, lightLevel, findL, SKRIFT } = SIM;
    const s = createState(1, START), v = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen);
    const [p, q, o, r2] = v as [Person, Person, Person, Person];
    for (const r of v) { r.sorg = []; r.bedrift = undefined; r.intryck = []; r.lardomar = []; }
    while (lightLevel(s.now) < 1) s.now += SIM.HOUR;
    const lar = { k: 'fara' as const, a: 3, v: 1, c: 0.9, t: s.now, om: 'Ulv dog där' };
    const kr = addTool(s, 'lerkruka_liten', p); kr.hos = undefined;
    const skrivEtt = () => { p.lardomar = [{ ...lar }]; setAmount(s, 'pergament', 1); fyllVatska(s, 'black', 2, kr); p.task = { act: 'skriva', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '' }; skrivKlar(s, p); SIM.placeTools(s); return tingOf(s).filter(t => t.k === 'blad').at(-1); };
    const las = (r: Person, id?: number) => lasKlar(s, r, { act: 'lasa', phase: 'do', tx: r.x, ty: r.y, until: s.now, carry: 0, why: '', ref: id });
    // samma innehåll i usel och fin kvalitet
    p.skill.berattande = 15;
    const a = skrivEtt()!, b = SIM.newTing(s, 'blad', 1, p.id); b.skrift = { ...a.skrift! }; SIM.placeTools(s);
    a.skrift!.q = 0; delete a.skrift!.fel; a.skrift!.lar = { ...lar }; b.skrift!.q = 4; delete b.skrift!.fel; b.skrift!.lar = { ...lar };
    las(q, a.id); las(o, b.id);
    const cU = findL(q, 'fara', 3)?.c ?? 0, cF = findL(o, 'fara', 3)?.c ?? 0;
    for (const t of [a, b]) s.ting = s.ting!.filter(x => x !== t);
    // en usel skrift med fel: två läsare får samma fel
    p.skill.berattande = 0; q.lardomar = []; o.lardomar = [];
    let fel: typeof a | undefined, n = 0;
    while (!fel && n < 80) { const t = skrivEtt(); n++; if (t?.skrift?.fel && t.skrift.lar) fel = t; else if (t) s.ting = s.ting!.filter(x => x !== t); }
    las(q, fel?.id); las(o, fel?.id);
    const vq = findL(q, 'fara', 3)?.v, vo = findL(o, 'fara', 3)?.v;
    // en usel handbok
    for (const r of v) if (r.tek) delete r.tek.garvning;
    r2.tek = { ...(r2.tek ?? {}), kniv: 1, skinnklader: 1 };
    const hb = SIM.newTing(s, 'blad', 1, p.id);
    hb.skrift = { slag: 'kunskap', av: { id: p.id, namn: p.name }, t: s.now, titel: 'Om garvning', text: '', tek: 'garvning', q: 0 };
    SIM.placeTools(s);
    let m = 0; while (SIM.lasNytta(r2, hb.skrift) > 0 && m < 100) { las(r2, hb.id); m++; }
    const del = r2.tek?.garvning ?? 0;
    return [
      [`en usel skrift ger lärdomen med lägre säkerhet än en fin (${cU.toFixed(2)} mot ${cF.toFixed(2)})`, cU > 0 && cU < cF && Math.abs(cU - lar.c * SKRIFT.nar[0]!) < 1e-9],
      [`en usel skrift får ibland ett fel när den skrivs (${fel ? `efter ${n} skrifter, gånger ${fel.skrift!.fel}` : 'inget fel'})`, !!fel],
      [`två läsare av den dåliga texten får samma fel (${vq} och ${vo}, rätt är ${lar.v})`, vq !== undefined && vq === vo && vq !== lar.v],
      [`en usel handbok tar läsaren bara en del av vägen (${del.toFixed(2)} efter ${m} läsningar, kan ${SIM.knows(r2, 'garvning') ? 'den' : 'den inte'})`, del > 0 && del <= SKRIFT.nar[0]! + 1e-9 && !SIM.knows(r2, 'garvning') && m < 100],
    ];
  },
};

SCENARIER.heligverkan = {
  text: 'Steg 10.6.3: de heliga skrifternas verkan. Samma tro med och utan helig sten: chansen att sprida tron i ett samtal, hur mycket en profets syn flyttar skalorna, rösterna för att ta bort ett bud och chansen till en ny tro, och verkan försvinner när stenen är borta',
  kor: () => {
    const { s, v, tr } = medTro(6, 2), a = v[0], b = nyInvanare(s, 'k', 30);
    b.tro = undefined; b.andlig = 90;
    const r = SIM.getRel(s, a, b), bud = { tro: tr.id, id: 'prast' };
    const motstandare = nyInvanare(s, 'm', 30); motstandare.tro = undefined; motstandare.andlig = 0;
    const mat = () => ({ sprid: SIM.spridChans(s, tr, a, b, r, 1), ...SIM.profetTal(tr), bort: SIM.FRAGOR.taBortBud.rost(s, motstandare, bud).v });
    SIM.runstenTimme(s); const utan = mat();
    SIM.runstenarOf(s).push({ id: 1, x: 2, y: 2, t: s.now, slag: 'helig', av: { id: a.id, namn: a.name }, om: { id: tr.id, namn: 'Rösternas väg' }, tro: tr.id, text: 'Rösten vill att man lyssnar.', runor: SIM.runor('Rösten vill att man lyssnar.') });
    SIM.runstenTimme(s); const med = mat();
    s.runstenar = []; SIM.runstenTimme(s); const borta = mat();
    const f = (x: number) => Math.round(x * 1e6) / 1e6, g = (x: number) => Math.round(x * 100) / 100;
    return [
      [`tron sprids lättare (${f(utan.sprid)} → ${f(med.sprid)})`, Math.abs(med.sprid / utan.sprid - SIM.SKRIFT.heligSprid) < 1e-9],
      [`synen flyttar skalorna mindre (${utan.skala} → ${med.skala})`, med.skala === utan.skala * SIM.SKRIFT.heligTrog],
      [`buden är svårare att rösta bort (${g(utan.bort)} → ${g(med.bort)})`, utan.bort > 0 && Math.abs(med.bort - utan.bort * SIM.SKRIFT.heligTrog) < 1e-9],
      [`profeten grundar oftare en ny tro (${utan.nyTro} → ${g(med.nyTro)})`, Math.abs(med.nyTro - utan.nyTro * SIM.SKRIFT.heligNyTro) < 1e-9],
      ['verkan försvinner när skriften är borta', JSON.stringify(borta) === JSON.stringify(utan)],
    ];
  },
};
// d dör, och p bär hen och begraver: kroppens väg och samlingen ur buden som gällde när hen dog (steg 10.4.5)
function begravHela(s: State, p: Person, d: Person) {
  SIM.die(s, d, 'alderdom');
  const kr = s.kvarlevor!.find(k => k.k === 'kropp' && k.vem === d.id)!;
  const tk = { act: 'begrava', phase: 'do', tx: kr.x, ty: kr.y, until: s.now, carry: 0, ref: kr.id, why: '' } as SIM.Task;
  p.task = tk; SIM.kroppUpp(s, p, tk); p.x = tk.tx; p.y = tk.ty;
  const tid = tk.arbTid ?? 0; s.ritualKo = [];
  SIM.gravKlar(s, p, tk); p.task = undefined;
  return { kr, tid, g: s.gravar?.find(g => g.vem === d.id), r: s.ritualKo[0] };
}
SCENARIER.begravning = {
  text: 'Steg 10.4.5: begravningens former. Kroppens väg (jorden, bålet med fyra ved och en timme till, vattnet där kroppen sänks) och samlingen (den enkla, den tysta med familjen, den vanliga med trosfränderna) blir trons seder när en troende dör och sparas på kroppen; en kropp väntar en stund innan någon bär den',
  kor: () => {
    // bålet: natur och fest
    const a = medTro(6, 2); a.tr.natur = 15; a.tr.sk = { ...a.tr.sk, fest: 15, livet: 50 }; SIM.setAmount(a.s, 'ved', 20);
    const d1 = a.v[1], ved0 = SIM.amountOf(a.s, 'ved');
    const b1 = begravHela(a.s, a.v[0], d1), ved1 = SIM.amountOf(a.s, 'ved');
    const vantar = (b1.kr.naraT ?? 0) >= a.s.now - 1 || (b1.kr.annanT ?? 0) > b1.kr.t;
    // utan ved blir det jorden, och den troende som begraver bryter budet
    SIM.setAmount(a.s, 'ved', 0); const brutna = a.s.stat?.bud_brutet ?? 0;
    const b2 = begravHela(a.s, a.v[0], a.v[2]);
    // den tysta: försakelse
    const c = medTro(6, 2); c.tr.natur = 60; c.tr.sk = { ...c.tr.sk, fest: 85 };
    const b3 = begravHela(c.s, c.v[0], c.v[1]), tyst = !!b3.r?.tyst;
    const vemTyst = b3.r ? SIM.RITUALER.begravning.vem(c.s, { ...b3.r, start: 0, slut: 0 }) : [];
    // den vanliga
    const e = medTro(6, 2); e.tr.natur = 60; e.tr.sk = { ...e.tr.sk, fest: 45 };
    const b4 = begravHela(e.s, e.v[0], e.v[1]);
    // vattnet (byn 6 har vatten inom räckhåll)
    const w = medTro(6, 2); w.tr.natur = 5; w.tr.sk = { ...w.tr.sk, fest: 90 };
    const b5 = begravHela(w.s, w.v[0], w.v[1]), sankt = w.s.sankta?.find(q => q.vem === w.v[1].id);
    // utan tro: den enkla, utan samling
    const u = medLedare(), du = u.v[1], barn = u.v.find(q => SIM.isParent(q, du) || SIM.isParent(du, q) || q.partner === du.id);
    const b6 = begravHela(u.s, u.v[0], du);
    return [
      [`bålet blir sed och sparas på kroppen (${b1.kr.bud?.join(', ')})`, !!b1.kr.bud?.includes('bal')],
      [`bålet tar fyra ved och en timme till (${ved0 - ved1} ved, ${Math.round(b1.tid / SIM.HOUR * 10) / 10} timmar, ${b1.g?.stil})`, ved0 - ved1 === 4 && b1.g?.stil === 'bal' && b1.tid >= 2 * SIM.HOUR],
      ['kroppen väntar en stund innan någon bär den', vantar],
      [`utan ved blir det jorden och budet bryts (${b2.g?.stil})`, b2.g?.stil === 'jord' && (a.s.stat?.bud_brutet ?? 0) > brutna],
      [`den tysta samlar bara familjen (${vemTyst.length} av ${SIM.living(c.s).length})`, tyst && c.tr.bud!.some(x => x.id === 'tystBegr') && vemTyst.every(q => SIM.isParent(q, c.v[1]) || SIM.isParent(c.v[1], q) || q.partner === c.v[1].id || c.v[1].partner === q.id)],
      [`den vanliga samlar trosfränderna (${e.tr.bud!.filter(x => /Begr/.test(x.id)).map(x => x.id).join(', ')})`, !!b4.r && !b4.r.tyst && e.tr.bud!.some(x => x.id === 'vanligBegr')],
      [`vattnet: kroppen sänks och sjön minns hen (${w.tr.bud!.filter(x => /vatten|bal/.test(x.id)).map(x => x.id).join(', ')}, ${b5.g ? 'en grav' : 'ingen grav'})`, w.tr.bud!.some(x => x.id === 'vattenGrav') && !b5.g && !!sankt && Math.round(b5.tid / SIM.MIN) === 30],
      [`utan tro: ingen samling, och familjen får humör (${b6.g?.stil})`, !b6.r && !!b6.g && (!barn || barn.thoughts.some(x => x.text.includes('begravdes')))],
    ];
  },
};
SCENARIER.bonen = {
  text: 'Steg 8.5.2–8.5.4: bönen är fritid för den troende och ger humör och tro, bönen i nöd låses upp av andligheten och tron, och en bön som hjälpte eller inte hjälpte blir en upplevelse',
  kor: () => {
    const { s, v } = medTro(), p = v[1];
    const vikt = SIM.bonVikt(s, p);
    const t0 = p.troStyrka!;
    SIM.bonKlar(s, p, { tool: 'vardag' });
    const b = SIM.bonFritid(s, p);
    setFood(s, 0);
    const n = SIM.bonNod(s, p);
    const u = v[2]; u.troStyrka = 10; const inte = SIM.bonNod(s, u);
    p.bonVan = { t: s.now, o: 'svalt' }; setFood(s, 500); SIM.kultTimme(s);
    return [
      [`den andlige ber gärna (${vikt.toFixed(2)})`, vikt > 0.5],
      ['bönen stärker tron', p.troStyrka! > t0 || t0 >= 100],
      ['en vardagsbön om dagen', b === undefined],
      [`bönen i nöd för den som tror nog (${n?.o})`, n?.id === 'nod' && !inte],
      ['en bön som hjälpte räknas', (s.stat?.bon_hjalpte ?? 0) === 1],
    ];
  },
};
SCENARIER.ritualer = {
  text: 'Steg 8.5.5–8.5.14 och 10.3.3: en plats blir helig ur en händelse och där fälls och byggs inget, prästen utses efter skalan, och ritualerna är bud: ingen högtid utan bud, högtiden i sin tidsålder, gillets mat, fastan, offret av den som följer budet, och bröllopet med och utan trons välsignelse',
  kor: () => {
    const { s, v, tr } = medTro(6, 3);
    tr.bud = [{ id: 'prast', t: s.now }];
    SIM.kultTimme(s);
    const k = SIM.heligaKandidater(s, tr)[0]; SIM.FRAGOR.nyttBud.gor(s, { tro: tr.id, id: 'helig', v: SIM.heligVarde(k.x, k.y) }, undefined);
    const h = s.heliga?.[0], ingen = !!h && !SIM.usable(s, h.x, h.y);
    const pr = SIM.prastOf(s, tr);
    // ritualen körs till slut: alla i v är med
    const hogtidNu = () => [s.ritual, ...(s.ritualKo ?? [])].find(r => r?.k === 'hogtid');
    const korRitual = () => { if (!s.ritual) { const k = s.ritualKo?.find(r => r.k === 'hogtid'); if (k?.fran) { s.now = Math.max(s.now, k.fran); SIM.ritualTimme(s); } } const r = s.ritual as SIM.Ritual | undefined; if (r?.k !== 'hogtid') return undefined; for (const p of SIM.living(s)) if (p.tro === r.tro) p.task = { act: 'ritual', phase: 'do', tx: r.x, ty: r.y, until: r.slut, carry: 0, why: '' } as SIM.Task; s.now = r.slut; SIM.ritualTimme(s); return r; };
    const tom = () => { s.ritualKo = []; s.ritual = undefined; tr.hogtid = undefined; };
    // ingen högtid utan bud
    tom(); SIM.kultTimme(s); const utanBud = !hogtidNu();
    // en högtid i en annan tidsålder firas inte nu, tidsålderns firas
    const ai = SIM.ageIndex(s);
    tom(); tr.bud = [{ id: 'hogtid', v: SIM.hogtidVarde((ai + 1) % 4, 'gille'), t: s.now }]; SIM.kultTimme(s); const fel = !hogtidNu();
    tom(); tr.bud = [{ id: 'hogtid', v: SIM.hogtidVarde(ai, 'gille'), t: s.now }, { id: 'offer', t: s.now }]; SIM.kultTimme(s); const ratt = hogtidNu();
    // gillet: maten ur kyrkans egendom först; offret av den som följer budet (stark tro), inte av den svagt troende
    satKyrka(s, tr, { bar: 20 });
    const [q, svag] = v.filter(p => p !== pr); q.troStyrka = 60; svag.troStyrka = 5;
    for (const p of v) SIM.put(s, 'bar', 5, { [p.id]: 5 });
    const egen0 = SIM.ownedStock(s, q).bar ?? 0, svag0 = SIM.ownedStock(s, svag).bar ?? 0, gille0 = s.stat?.gille_mat ?? 0, mat0 = q.hunger;
    q.hunger = 0.2; const h0 = q.hunger;
    const rg = korRitual();
    const gille = (s.stat?.gille_mat ?? 0) - gille0, kyrkanTom = 20 - SIM.kyrkansAv(s, tr, 'bar') === gille;
    const offrat = egen0 - (SIM.ownedStock(s, q).bar ?? 0), svagOffrat = svag0 - (SIM.ownedStock(s, svag).bar ?? 0);
    // fastan: ett dygn utan mat, och tron 4
    tom(); tr.bud = [{ id: 'hogtid', v: SIM.hogtidVarde(ai, 'fasta'), t: s.now }]; const t0 = q.troStyrka!;
    SIM.kultTimme(s); const rf = korRitual();
    const fastar = (q.fasta ?? 0) > s.now, troFasta = q.troStyrka! - t0;
    // bröllopet: byns fest utan bud, vid den heliga platsen och med tro när tron välsignar det
    tom(); tr.bud = []; SIM.nyRitual(s, 'brollop', { om: [v[0].id, v[1].id], namn: 'Bröllopet' }); s.ritual = undefined; SIM.ritualTimme(s);
    const utan = s.ritual as SIM.Ritual | undefined, val = SIM.ritualVal(s, v[2]);
    tom(); tr.bud = [{ id: 'valsigna', t: s.now }, ...(tr.bud ?? []).filter(b => b.id === 'helig')]; SIM.nyRitual(s, 'brollop', { om: [v[0].id, v[1].id], namn: 'Bröllopet' }); s.ritual = undefined; SIM.ritualTimme(s);
    const med = s.ritual as SIM.Ritual | undefined, hp = SIM.helig(s, tr);
    return [
      [`platsen där tron föddes blir helig när budet antas (${h ? SIM.HELIGA_PLATSER[h.k].namn : 'ingen'}), och där byggs inget`, ingen],
      [`prästen utses (${pr?.name}), ${pr ? SIM.prastSort(tr, pr.sex) : ''}`, !!pr],
      ['ingen högtid utan bud', utanBud],
      [`högtiden firas i sin tidsålder (${ratt?.namn}), inte i en annan`, fel && !!ratt && ratt.namn === SIM.hogtidNamn(SIM.hogtidVarde(ai, 'gille'))],
      [`gillet: en hel mat per närvarande, ur kyrkans egendom först (${gille} mat, ${q.name} ${h0.toFixed(2)} → ${q.hunger.toFixed(2)})`, !!rg && gille >= v.length && kyrkanTom && q.hunger > h0 && mat0 >= 0],
      [`offret tar en hel mat av den som följer budet (${offrat}), inte av den svagt troende (${svagOffrat})`, offrat === 1 && svagOffrat === 0],
      [`fastan: ett dygn utan mat och tron ${troFasta.toFixed(0)}`, !!rf && fastar && (troFasta >= 4 || q.troStyrka! >= 100)],
      [`bröllopet utan bud är byns fest vid elden utan tron (${utan?.namn})`, utan?.k === 'brollop' && utan.tro === undefined && !!val],
      ['bröllopet med budet hålls vid trons heliga plats', med?.k === 'brollop' && med.tro === tr.id && !!hp && Math.abs(med.x - hp.x) < 3 && Math.abs(med.y - hp.y) < 3],
      [`högtiderna följer skalan Fest – Försakelse (${(() => { const sk = tr.sk; tr.sk = { ...sk, fest: 10 }; const f = SIM.hogtider(tr); tr.sk = { ...sk, fest: 90 }; const g = SIM.hogtider(tr); tr.sk = sk; return `${f} vid fest, ${g} vid försakelse`; })()})`, (() => { const sk = tr.sk; tr.sk = { ...sk, fest: 10 }; const f = SIM.hogtider(tr); tr.sk = { ...sk, fest: 90 }; const g = SIM.hogtider(tr); tr.sk = sk; return f >= 2 && g === 0; })()],
    ];
  },
};

SCENARIER.fest = {
  text: 'Festen vid högtiden (steg 10.7.19): en högtid med gille blir en fest för hela byn. Gillet börjar klockan 16, alla kommer utom de vars egen tro är sluten, och festdagen ger fler matcher och framträdanden; den som hör musik dansar. Maten dras i hela saker och räknas som måltider, och notisen fest säger hur många som åt, vem som uppträdde och vem som vann. Fastan hålls som förut',
  kor: () => {
    const { s, v, tr } = medTro(6, 3);
    setFood(s, 400); SIM.setAmount(s, 'ved', 300); SIM.setAmount(s, 'rep', 4); klockan(s, 7); tandEld(s);
    medBank(s, 'scen'); SIM.nyttVid(s, SIM.newTing(s, 'trumma', 1, SIM.BYN)); SIM.newTing(s, 'boll', 1, SIM.BYN); SIM.newTing(s, 'slagtra', 1, SIM.BYN);
    for (const q of s.people) { q.pot.styrka = q.pot.smidighet = 16; q.skill[SIM.FRAM_SKILL] = Math.max(q.skill[SIM.FRAM_SKILL], 6); for (const r of s.people) if (q !== r) SIM.getRel(s, q, r).op = 60; }
    // en utan tro och en med en annan, sluten tro
    const [, utanTro, sluten] = v.filter(q => q !== SIM.prastOf(s, tr));
    utanTro.tro = undefined; utanTro.troStyrka = 0;
    const tr2: SIM.Tro = { ...tr, id: 2, namn: 'Den stängda dörren', bud: [], sk: { oppen: 95 } }; s.tron!.push(tr2); sluten.tro = 2;
    const ai = SIM.ageIndex(s);
    s.ritualKo = []; s.ritual = undefined; tr.hogtid = undefined;
    tr.bud = [...(tr.bud ?? []), { id: 'hogtid', v: SIM.hogtidVarde(ai, 'gille'), t: s.now }];
    satKyrka(s, tr, { bar: 30 });
    SIM.kultTimme(s);
    const ko = s.ritualKo?.find(r => r.k === 'hogtid'), fest = s.fest, dag = Math.floor(s.now / SIM.DAY);
    const vem = ko ? SIM.RITUALER.hogtid.vem(s, ko as SIM.Ritual) : [];
    const kyrka0 = SIM.kyrkansAv(s, tr, 'bar'), atit0 = s.stat?.atit ?? 0, gille0 = s.stat?.gille_mat ?? 0, match0 = s.stat?.sportMatcher ?? 0, fram0 = s.framNr ?? 0;
    let festFram = 0, festMatch = 0, startTim = -1, dans = 0;
    kor(s, 18, x => {
      if (SIM.festNu(x)) { festFram = (x.framNr ?? 0) - fram0; festMatch = (x.stat?.sportMatcher ?? 0) - match0; dans = x.stat?.festDans ?? 0; }
      if (startTim < 0 && x.ritual?.k === 'hogtid') startTim = Math.floor(SIM.hourOf(x.now));
    });
    const gille = (s.stat?.gille_mat ?? 0) - gille0, atit = (s.stat?.atit ?? 0) - atit0, kyrka = kyrka0 - SIM.kyrkansAv(s, tr, 'bar');
    const n = s.notiser?.lista.find(x => x.id === 'fest'), text = n?.rader.at(-1) ?? '';
    // dansen: på festdagen dansar de som hör musik eller sång
    let dansade = '';
    for (let i = 0; i < 20 && !dansade; i++) {
      const m = medScen(3 + i, ['trumma']), u = m.v[0]!;
      for (const q of m.s.people) for (const r of m.s.people) if (q !== r) SIM.getRel(m.s, q, r).op = 100;
      u.skill[SIM.FRAM_SKILL] = 12;
      m.s.fest = { tro: 1, namn: 'Festen', dag: Math.floor(m.s.now / SIM.DAY), x: u.x, y: u.y, at: 0, fram: [], vann: {} };
      if (!upptrad(m.s, u) || !m.s.fram?.inst) continue;
      kor(m.s, 1.5, x => { for (const q of SIM.living(x)) { const t = q.thoughts?.find(h => h.text.startsWith('Dansade')); if (t) dansade = `${q.name}: ${t.text}`; } });
    }
    // fastan: bara de troende, ingen fest
    const f = medTro(7, 3); f.s.ritualKo = []; f.s.ritual = undefined; f.tr.hogtid = undefined;
    f.tr.bud = [...(f.tr.bud ?? []), { id: 'hogtid', v: SIM.hogtidVarde(SIM.ageIndex(f.s), 'fasta'), t: f.s.now }];
    const annan = f.v[1]!; annan.tro = undefined;
    SIM.kultTimme(f.s);
    const r0 = f.s.ritual as SIM.Ritual | undefined, fr = r0?.k === 'hogtid' ? r0 : f.s.ritualKo?.find(r => r.k === 'hogtid');
    const fvem = fr ? SIM.RITUALER.hogtid.vem(f.s, fr as SIM.Ritual) : [];
    return [
      [`gillet köas till klockan ${ko?.fran !== undefined ? SIM.hourOf(ko.fran) : '-'} och började ${startTim}, och festdagen är i dag`, !!ko && SIM.hourOf(ko.fran ?? 0) === 16 && startTim === 16 && fest?.dag === dag],
      [`alla kommer utom den med en sluten tro (${vem.length} av ${SIM.living(s).length}, ${utanTro.name} utan tro ${vem.includes(utanTro) ? 'med' : 'inte med'}, ${sluten.name} ${vem.includes(sluten) ? 'med' : 'inte med'})`, vem.includes(utanTro) && !vem.includes(sluten) && vem.length === SIM.living(s).filter(q => !q.gast).length - 1],
      [`maten i hela saker: ${gille} mat vid gillet, kyrkan gav ${kyrka} och resten åt sin egen, och måltiderna räknas (${atit.toFixed(1)} portioner)`, gille >= 4 && kyrka >= 1 && kyrka <= gille && Number.isInteger(kyrka) && atit >= gille],
      [`under festdagen ${festMatch} matcher och ${festFram} framträdanden, ${dans} dansade`, festMatch >= 1 && festFram >= 1],
      [`notisen fest: ${text}`, !!n && text.startsWith(SIM.hogtidNamn(SIM.hogtidVarde(ai, 'gille'))) && /åt vid gillet/.test(text) && /vann/.test(text) && !s.fest],
      [`den som hör musik dansar (${dansade || 'ingen'})`, !!dansade],
      [`fastan hålls bara av de troende, utan fest (${fvem.length} av ${SIM.living(f.s).length})`, !!fr && fr.form === 'fasta' && !fvem.includes(annan) && !f.s.fest],
    ];
  },
};
SCENARIER.heligplats = {
  text: 'Steg 10.3.10: den heliga platsen är ett bud. Ingen plats blir helig utan omröstning, bönen hålls vid elden före och vid den närmaste platsen inom 15 rutor efter, de troende vill ha platsen nära hemmet, bönen i nöd som fick svar ger en kandidat också utan präst, ingen fjärde plats föreslås, platsen räknar bönerna och en sparad by behåller sina platser som bud',
  kor: () => {
    const { s, v, tr } = medTro(6, 1);
    tr.bud = []; tr.prast = undefined; const p = v[1];
    for (let i = 0; i < 24; i++) { s.now += SIM.HOUR; tr.prast = undefined; SIM.kultTimme(s); }
    const ingen = !(s.heliga ?? []).some(h => h.tro === tr.id), kand = SIM.heligaKandidater(s, tr);
    const eld = SIM.eldPlats(s), fore = SIM.bonFritid(s, p)?.spot, vidElden = !!fore && Math.hypot(fore.x - eld.x, fore.y - eld.y) < 5;
    // budet antas: platsen blir helig och bönen hålls där
    const val = SIM.heligVarde(kand[0].x, kand[0].y);
    const nara = SIM.budRost(s, v[0], tr, 'helig', val).delar.find(d => d.k === 'intresse')!.v;
    SIM.FRAGOR.nyttBud.gor(s, { tro: tr.id, id: 'helig', v: val }, undefined);
    const h = s.heliga!.find(q => q.tro === tr.id)!, helgad = !!h && tr.bud!.some(b => b.id === 'helig' && b.v === val);
    p.x = h.x + 3.5; p.y = h.y + 3.5; p.bonD = undefined;
    const efter = SIM.bonFritid(s, p)?.spot, vidPlatsen = !!efter && Math.abs(efter.x - (h.x + 0.5)) < 1 && Math.abs(efter.y - (h.y + 1.5)) < 1;
    p.x = h.x + 30; p.y = h.y; const langt = SIM.bonFritid(s, p)?.spot, langtElden = !!langt && Math.hypot(langt.x - eld.x, langt.y - eld.y) < 5;
    // bönen räknas där den hålls
    p.x = h.x + 0.5; p.y = h.y + 1.5; p.task = { act: 'ritual', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '' } as SIM.Task;
    SIM.bonKlar(s, p, { tool: 'vardag' }); const boner = h.boner ?? 0;
    // bönen i nöd som fick svar ger en kandidat också utan präst
    const q = v[2]; q.bonVan = { t: s.now, o: 'svalt', x: h.x + 6, y: h.y + 2 }; setFood(s, 500); tr.prast = undefined; const utanPrast = !SIM.prastOf(s, tr); SIM.kultTimme(s);
    const svar = tr.heligKand?.some(k => k.x === h.x + 6 && k.y === h.y + 2) && SIM.heligaKandidater(s, tr).some(k => k.x === h.x + 6);
    // ingen fjärde plats
    SIM.helga(s, tr, h.x + 6, h.y + 2, 'här'); SIM.helga(s, tr, h.x - 8, h.y, 'där');
    const tal = SIM.trosTalare(s, tr) ?? v[0], tre = !SIM.TROS_UPP.flatMap(r => r.lista(s, tr, tal)).some(f => f.fr.f === 'nyttBud' && f.fr.d.id === 'helig');
    // en vanhelgad plats förlorar sitt bud men visas kvar
    SIM.vanhelgaPlats(s, h); const vanh = !tr.bud!.some(b => b.id === 'helig' && b.v === val) && s.heliga!.includes(h);
    // en sparad by behåller sina platser som bud
    const g = JSON.parse(SIM.serialize(s)); g.v = 43; for (const t of g.tron) t.bud = [];
    const ny = SIM.migrate(g), ntr = SIM.troOf(ny, tr.id)!, sparad = (ntr.bud ?? []).filter(b => b.id === 'helig').length === 2;
    return [
      [`ingen plats blir helig utan omröstning (${kand.length} kandidat, först ${kand[0]?.om})`, ingen && kand[0]?.om === 'där tron föddes'],
      ['bönen hålls vid elden innan tron har en plats', vidElden],
      [`den som bor nära vill ha platsen (${nara.toFixed(2)})`, nara > 0],
      ['budet gör platsen helig', helgad],
      ['bönen hålls vid platsen inom 15 rutor, och vid elden längre bort', vidPlatsen && langtElden],
      [`platsen räknar bönerna (${boner})`, boner === 1],
      ['bönen i nöd som fick svar ger en kandidat utan präst', !!svar && utanPrast],
      ['ingen fjärde plats föreslås, bara ett byte', tre],
      ['en vanhelgad plats förlorar sitt bud och visas kvar', vanh],
      ['en sparad by behåller sina platser som bud', sparad],
    ];
  },
};

SCENARIER.prastregel = {
  text: 'Steg 10.3.11: prästens bud. Utan bud blir den bästa präst oavsett kön, med budet Bara män bara en man, den som redan är präst sitter kvar, den som stängs ute röstar emot, dräkten sys först med budet, och ritualen prästen leder ger mindre tro när dräkten saknas',
  kor: () => {
    const { s, v, tr } = medTro(6, 2);
    tr.bud = [{ id: 'prast', t: s.now }]; tr.prast = undefined;
    const k = v.find(p => p.sex === 'k')!, m = v.find(p => p.sex === 'm')!;
    for (const p of v) p.andlig = 30;
    k.andlig = 100; k.pot.karisma = 20; m.andlig = 90;
    SIM.kultTimme(s); const utanBud = tr.prast === k.id;
    // den sittande sitter kvar när budet antas
    tr.bud = [{ id: 'prast', t: s.now }, { id: 'prastMan', t: s.now }]; SIM.kultTimme(s); const kvar = tr.prast === k.id;
    // en ny präst utses: bara en man
    tr.prast = undefined; SIM.kultTimme(s); const man = tr.prast === m.id;
    // den som stängs ute röstar emot
    tr.bud = []; const emot = SIM.budRost(s, k, tr, 'prastMan').delar.find(d => d.k === 'intresse')!.v;
    const grupp = (() => { const fore = SIM.budForslag(s, tr, 'prastMan').length; tr.bud = [{ id: 'prastKvinna', t: s.now }]; return fore === 1 && SIM.ersatter(s, tr, { id: 'prastMan' })?.id === 'prastKvinna'; })();
    // dräkten sys först med budet
    tr.bud = []; tr.prast = m.id; const utanDrakt = SIM.REDSKAPMAL.prastdrakt(s) + SIM.REDSKAPMAL.mask(s);
    tr.bud = [{ id: 'drakt', t: s.now }]; const medDrakt = SIM.REDSKAPMAL.prastdrakt(s) + SIM.REDSKAPMAL.mask(s);
    // ritualen: tro med och utan dräkt
    const ritual = (bar: boolean) => {
      for (const t of SIM.tingOf(s)) if (t.bar === m.id) t.bar = undefined;
      if (bar) { const d = SIM.addTool(s, 'prastdrakt_kaninskinn', m); d.bar = m.id; d.x = d.y = undefined; }
      const q = v.find(p => p !== m && p !== k)!; q.troStyrka = 50;
      q.task = { act: 'ritual', phase: 'do', tx: q.x, ty: q.y, until: s.now + SIM.HOUR, carry: 0, why: '' } as SIM.Task;
      s.ritual = { k: 'leddBon', tro: tr.id, start: s.now - SIM.HOUR, slut: s.now, x: q.x, y: q.y }; SIM.ritualTimme(s);
      return q.troStyrka - 50;
    };
    const med = ritual(true), utan = ritual(false);
    const g = JSON.parse(SIM.serialize(s)); g.v = 44; g.tron[0].bud = []; g.tron[0].prastRegel = 'k'; g.tron[0].prast = m.id;
    const ntr = SIM.migrate(g).tron![0], sparad = SIM.budIn(ntr, 'prastKvinna') && SIM.budIn(ntr, 'drakt') && !('prastRegel' in ntr);
    return [
      ['utan bud blir den bästa präst oavsett kön', utanBud],
      ['den sittande prästen sitter kvar när budet antas', kvar],
      ['med budet Bara män blir bara en man präst', man],
      [`den som stängs ute röstar emot (${emot.toFixed(2)})`, emot < 0],
      ['bara ett bud om vem som får bli präst: det andra är ett byte', grupp],
      [`dräkten sys först med budet (${utanDrakt} → ${medDrakt})`, utanDrakt === 0 && medDrakt === 1],
      ['i en sparad by blir regeln ett bud och en tro med präst har dräkten', sparad],
      [`ritualen ger mindre tro när dräkten saknas (${med.toFixed(2)} med, ${utan.toFixed(2)} utan)`, med > 0 && Math.abs(utan * 3 - med) < 0.01],
    ];
  },
};

SCENARIER.prastbud = {
  text: 'Steg 10.3.12: prästen är ett bud. Ingen präst utan budet Tron ska ha en präst, den främsta bland de troende lägger fram det när tron varken har präst eller profet, en präst utses efter ett ja, en ny väljs när prästen dör, och en sparad by med en levande präst har budet',
  kor: () => {
    const { s, v, tr } = medTro(6, 2);
    tr.bud = []; tr.prast = undefined;
    for (const p of v) p.profet = undefined;
    SIM.kultTimme(s); const ingen = !SIM.prastOf(s, tr);
    const tal = SIM.trosTalare(s, tr)!, forslag = SIM.TROS_UPP.flatMap(r => r.lista(s, tr, tal)).filter(f => f.prio > 0).sort((a, b) => b.prio - a.prio);
    const fram = forslag.some(f => f.fr.d.id === 'prast');
    SIM.FRAGOR.nyttBud.gor(s, { tro: tr.id, id: 'prast' }, tal); SIM.kultTimme(s);
    const pr = SIM.prastOf(s, tr), utsedd = !!pr && pr === tal;
    if (pr) SIM.die(s, pr, 'alderdom');
    SIM.kultTimme(s); const ny = SIM.prastOf(s, tr), nyVald = !!ny && ny !== pr;
    const g = JSON.parse(SIM.serialize(s)); g.v = 45; g.tron[0].bud = [];
    const sparad = SIM.budIn(SIM.migrate(g).tron![0], 'prast');
    return [
      ['ingen präst utan budet', ingen],
      [`den främsta bland de troende lägger fram budet (${tal?.name}: ${forslag.slice(0, 3).map(f => f.fr.d.id).join(', ')})`, fram],
      [`en präst utses efter ett ja (${pr?.name})`, utsedd],
      [`en ny väljs när prästen dör (${ny?.name})`, nyVald],
      ['en sparad by med en levande präst har budet', sparad],
    ];
  },
};

SCENARIER.budbort = {
  text: 'Steg 10.3.13: buden ändras och tas bort. Ett bud som den som talar ogillar röstas bort, spärren håller, Bara män ersätter Bara kvinnor, en närmare plats ersätter den minst använda, ett bud tas bort mitt i en ritual utan fel, och lagen ur ett borttaget bud tas upp i lagarna',
  kor: () => {
    const { s, v, l, tr } = medTro(6, 4);
    SIM.kultTimme(s);
    const pr = SIM.prastOf(s, tr)!;
    for (const p of v) p.troStyrka = 10;
    // prästen ogillar att präster lever ogifta
    tr.bud = [{ id: 'prast', t: s.now - 5 * SIM.DAY }, { id: 'ogifta', t: s.now - 5 * SIM.DAY }, { id: 'lunden', t: s.now }];
    const lista = SIM.TROS_UPP.flatMap(r => r.lista(s, tr, pr)).filter(f => f.fr.f === 'taBortBud' && f.prio > 0);
    const foreslar = lista.some(f => f.fr.d.id === 'ogifta');
    const gick = SIM.rostaOm(s, { f: 'taBortBud', d: { tro: tr.id, id: 'ogifta' }, fram: pr.id });
    const borta = gick && !SIM.budIn(tr, 'ogifta') && SIM.budIn(tr, 'prast');
    // spärren: ett bud som just antagits föreslås inte bort
    const sparr = !lista.some(f => f.fr.d.id === 'lunden');
    // ett byte: Bara män i stället för Bara kvinnor
    tr.bud.push({ id: 'prastKvinna', t: s.now });
    const man = v.find(p => p.sex === 'm' && p !== pr) ?? v[0];
    const byte = SIM.TROS_UPP.flatMap(r => r.lista(s, tr, man)).find(f => f.fr.f === 'bytBud' && f.fr.d.id === 'prastMan');
    SIM.FRAGOR.bytBud.gor(s, { tro: tr.id, id: 'prastMan', gid: 'prastKvinna' }, man);
    const bytt = !!byte && byte.fr.d.gid === 'prastKvinna' && SIM.budIn(tr, 'prastMan') && !SIM.budIn(tr, 'prastKvinna');
    // en ny plats när tron har tre: den minst använda byts ut
    const x0 = Math.floor(v[0].x), y0 = Math.floor(v[0].y);
    for (const [dx, n] of [[0, 5], [4, 0], [-4, 3]] as const) { SIM.FRAGOR.nyttBud.gor(s, { tro: tr.id, id: 'helig', v: SIM.heligVarde(x0 + dx, y0 + 6) }, undefined); const h = s.heliga!.find(q => q.x === x0 + dx && q.y === y0 + 6); if (h) h.boner = n; }
    tr.heligKand = [{ x: x0 + 1, y: y0 - 4, t: s.now - 100 * SIM.DAY, om: 'där bönen fick svar' }];
    const g = SIM.ersatter(s, tr, { id: 'helig', v: SIM.heligVarde(x0 + 1, y0 - 4) });
    if (g) SIM.FRAGOR.bytBud.gor(s, { tro: tr.id, id: 'helig', v: SIM.heligVarde(x0 + 1, y0 - 4), gid: g.id, gv: g.v }, undefined);
    const platser = SIM.heligaFor(s, tr), plats = g?.v === SIM.heligVarde(x0 + 4, y0 + 6) && platser.length === 3 && platser.some(h => h.x === x0 + 1) && !platser.some(h => h.x === x0 + 4);
    // mitt i en ritual
    const ai = SIM.ageIndex(s), hv = SIM.hogtidVarde(ai, 'gille');
    tr.bud.push({ id: 'hogtid', v: hv, t: s.now }); s.ritual = undefined; s.ritualKo = [];
    SIM.nyRitual(s, 'hogtid', { tro: tr.id, namn: SIM.hogtidNamn(hv), form: 'gille' }); SIM.nyRitual(s, 'hogtid', { tro: tr.id, namn: SIM.hogtidNamn(hv), form: 'gille' });
    SIM.ritualTimme(s); const igang = !!s.ritual;
    SIM.taBortBud(s, tr, { id: 'hogtid', v: hv });
    let fel = '';
    try { s.now = ((s.ritual as SIM.Ritual | undefined)?.slut ?? s.now) + 1; SIM.ritualTimme(s); } catch (e) { fel = String(e); }
    const ritual = igang && !fel && !SIM.budIn(tr, 'hogtid') && !s.ritualKo?.some(r => r.k === 'hogtid');
    // lagen ur ett borttaget bud
    const st = SIM.styreAv(s); st.lagar = [{ id: 'bud_ingetKott', t: s.now, straff: 4, av: -1, om: '' }];
    tr.bud.push({ id: 'ingetKott', t: s.now }); SIM.taBortBud(s, tr, { id: 'ingetKott' });
    const lag = SIM.lagarNu(s).some(x => x.id === 'bud_ingetKott') && SIM.TAS_UPP.flatMap(r => r.lista(s, l)).some(f => f.fr.f === 'bortlag' && f.fr.d.id === 'bud_ingetKott');
    return [
      [`den som talar föreslår att ta bort ett bud hen ogillar (${lista.map(f => f.fr.d.id).join(', ')})`, foreslar],
      ['de troende röstar bort budet', borta],
      ['spärren: ett nytt bud föreslås inte bort', sparr],
      ['Bara män ersätter Bara kvinnor', bytt],
      [`en närmare plats ersätter den minst använda (${g?.v})`, plats],
      [`ett bud tas bort mitt i en ritual utan fel${fel ? ` (${fel})` : ''}`, ritual],
      ['lagen ur budet står kvar och tas upp i lagarna', lag],
    ];
  },
};

SCENARIER.dop = {
  text: 'Steg 10.3.4: dopet och vuxenblivandet är bud. Med buden samlas byn efter en födsel och när någon fyller 14, utan buden händer inget, tvillingar får en ritual tillsammans, och den ungas tro stärks mer än de andras',
  kor: () => {
    const { s, v, tr } = medTro(6, 2);
    const mor = v.find(p => p.sex === 'k' && SIM.ageOf(p, s.now) >= 18)!, far = v.find(p => p.sex === 'm' && SIM.ageOf(p, s.now) >= 18);
    const tom = () => { s.ritualKo = []; s.ritual = undefined; };
    const fod = () => { const b = SIM.newPerson(s, 'k', s.now, mor, far); b.x = mor.x; b.y = mor.y; s.people.push(b); return b; };
    const ritualer = (k: string) => [s.ritual, ...(s.ritualKo ?? [])].filter(r => r?.k === k) as SIM.Ritual[];
    // utan bud: ingen ritual
    tr.bud = []; tom(); fod(); SIM.kultTimme(s); const utan = ritualer('dop').length === 0;
    s.now += 3600000;
    // med budet: dopet efter en födsel, tvillingar tillsammans
    tr.bud = [{ id: 'dop', t: s.now }, { id: 'vuxen', t: s.now }]; tom();
    const a = fod(), b = fod(); SIM.kultTimme(s);
    const dop = ritualer('dop');
    // vuxenblivandet: en ung som just fyllt 14
    s.now += 3600000; tom();
    const ung = v.find(p => p !== mor && p !== far)!; ung.born = s.now - SIM.ALDER.vuxen * 86400000 - 30 * 60000;
    for (const p of v) p.troStyrka = 50;
    SIM.kultTimme(s);
    const r = s.ritual as SIM.Ritual | undefined;
    if (r?.k === 'vuxen') { for (const p of SIM.living(s)) if (SIM.ritualVal(s, p)) p.task = { act: 'ritual', phase: 'do', tx: r.x, ty: r.y, until: r.slut, carry: 0, why: '' } as SIM.Task; s.now = r.slut; SIM.ritualTimme(s); }
    const annan = v.find(p => p !== ung && p.tro === tr.id)!;
    return [
      ['utan budet händer inget när ett barn föds', utan],
      [`med budet samlas byn efter födseln, och tvillingarna får en ritual (${dop.map(x => x.namn).join(', ')})`, dop.length === 1 && dop[0].namn!.includes(a.name) && dop[0].namn!.includes(b.name) && dop[0].tro === tr.id],
      [`byn samlas när någon fyller 14 (${r?.namn})`, r?.k === 'vuxen' && r.om?.[0] === ung.id],
      [`den ungas tro stärks mer än de andras (${ung.troStyrka} mot ${annan.troStyrka})`, ung.troStyrka! > annan.troStyrka! && annan.troStyrka! > 50],
    ];
  },
};

SCENARIER.dodessaker = {
  text: 'Steg 10.3.5: den dödes saker är bud. Utan bud ärvs det den döde bar, med Gravgåvor följer den finaste saken hen och resten ärvs, och med Det den döde bar följer med ärvs inget av det burna. Graven minns sakerna',
  kor: () => {
    const fall = (bud: SIM.BudId[]) => {
      const { s, v, tr } = medTro(6, 3);
      tr.bud = bud.map(id => ({ id, t: s.now }));
      const d = v.find(p => SIM.ageOf(p, s.now) >= 20)!;
      const yxa = SIM.newTing(s, 'yxa', 1, d.id); yxa.bar = d.id; yxa.q = 4;
      const kniv = SIM.newTing(s, 'kniv', 1, d.id); kniv.bar = d.id; kniv.q = 1;
      SIM.die(s, d, 'alderdom');
      const kvar = (t: SIM.Ting) => (s.ting ?? []).includes(t), kr = s.kvarlevor?.find(k => k.k === 'kropp' && k.vem === d.id);
      return { yxa: kvar(yxa), kniv: kvar(kniv), med: kr?.med ?? [] };
    };
    const utan = fall([]), gava = fall(['gravgava']), allt = fall(['medfolj']);
    return [
      ['utan bud ärvs det den döde bar', utan.yxa && utan.kniv && !utan.med.length],
      [`med Gravgåvor följer den finaste saken (${gava.med.join(', ')}) och resten ärvs`, !gava.yxa && gava.kniv && gava.med.length === 1 && gava.med[0] === 'yxa'],
      [`med Det den döde bar följer med ärvs inget av det burna (${allt.med.join(', ')})`, !allt.yxa && !allt.kniv && allt.med.length === 2],
    ];
  },
};

SCENARIER.orena = {
  text: 'Steg 10.3.6: fiendens saker är orena. Utan bud tas vapen och plagg hem med sin kvalitet, med budet tar den troende bara bytet och en som inte tror tar resten',
  kor: () => {
    const { s, v, tr } = medTro(6, 3);
    const fiende = () => { const k = { id: (s.nextKvar = (s.nextKvar ?? 0) + 1), k: 'fiende' as const, x: Math.floor(v[0].x) + 2, y: Math.floor(v[0].y), t: s.now, vem: -1, namn: 'Rövaren', text: 'Rövaren', saker: { bar: 2 }, ting: [{ k: 'yxa', c: 0.6, q: 3 }, { k: 'rock_vargskinn', c: 0.4 }] }; (s.kvarlevor ??= []).push(k); return k; };
    const avrusta = (p: SIM.Person) => { const val = SIM.avrustaVal(s, p); if (!val) return false; SIM.avrustaKlar(s, p, { act: 'avrusta', ref: val.ref } as SIM.Task); return true; };
    const ting0 = (s.ting ?? []).length;
    // utan bud: allt tas hem, med kvalitet och slitage
    tr.bud = []; const a = fiende(); avrusta(v[1]);
    const nya = (s.ting ?? []).slice(ting0), yxa = nya.find(t => t.k === 'yxa');
    const allt = !a.ting && !a.saker && !!yxa && yxa.q === 3 && Math.abs(yxa.c - 0.6) < 1e-9 && nya.some(t => t.k === 'rock_vargskinn');
    // med budet: den troende tar bara bytet, en som inte tror tar resten
    tr.bud = [{ id: 'orena', t: s.now }]; const q = v[1]; q.troStyrka = 60;
    const b = fiende(); avrusta(q);
    const bara = !b.saker && b.ting?.length === 2, igen = !SIM.avrustaVal(s, q);
    const annan = v[2]; annan.tro = undefined; avrusta(annan);
    return [
      [`utan bud tas vapen och plagg hem med sin kvalitet (${nya.map(t => `${t.k} ${t.c.toFixed(1)}`).join(', ')})`, allt],
      ['med budet tar den troende bara bytet och rör inte fiendens saker', bara && igen],
      ['en som inte tror tar resten', !b.ting],
    ];
  },
};

SCENARIER.helgonminne = {
  text: 'Steg 10.7.4: helgon ur minnet. Helgon blir den döda som byn fortfarande berättar om: ryktbar bland de levande (KYRKA.helgonRykte) med gott anseende, och av flera den ryktbaraste. Ett kväde, ett framträdande, en bild eller en sten om den döda håller minnet uppe',
  kor: () => {
    const s = rikDag(3), v = vuxna(s);
    const [u, d1, d2] = v;
    s.tron = [{ id: 1, grundare: u.id, gnamn: u.name, t: s.now, k: 'blixt', bakom: 'Den som bor i åskmolnen', vill: 'att man tystnar när det mullrar', svek: 'blixten slår ner', natur: 50, manga: 50, bekr: s.now, ar: 0 } as SIM.Tro];
    for (const d of [d1, d2]) { d.tro = 1; d.died = s.now - (SIM.KYRKA.helgonDygn + 1) * SIM.DAY; d.fame = []; delete d.intryck; }
    for (const k of Object.keys(s.rels)) { const [a, b] = k.split('-').map(Number); if ([d1.id, d2.id].includes(a) || [d1.id, d2.id].includes(b)) delete s.rels[k]; }
    const levande = SIM.living(s);
    for (const p of levande) p.intryck = [d1, d2].map(d => ({ om: d.id, namn: d.name, k: 'generos' as SIM.IntryckTyp, v: 1, c: 1, t: s.now }));
    const r0 = [SIM.ryktbarhet(s, d1.id).r, SIM.ryktbarhet(s, d2.id).r];
    // fyrtio dygn: om d1 kväds det varje dygn, d2 glöms
    for (let h = 0; h < 24 * 40; h += 4) {
      s.now += 4 * SIM.HOUR;
      if (h % 24 === 0) for (const p of SIM.living(s)) SIM.paminn(s, p, d1.id);
      SIM.glomRykten(s, 4);
    }
    const r1 = [SIM.ryktbarhet(s, d1.id).r, SIM.ryktbarhet(s, d2.id).r];
    SIM.helgonDygn(s);
    const h = s.tron![0].helgon ?? [];
    // av två som båda är ryktbara blir den ryktbaraste helgon
    const s2 = rikDag(3), w = vuxna(s2), [u2, e1, e2] = w;
    s2.tron = [{ ...s.tron![0], grundare: u2.id, gnamn: u2.name, helgon: undefined }];
    for (const d of [e1, e2]) { d.tro = 1; d.died = s2.now - (SIM.KYRKA.helgonDygn + 1) * SIM.DAY; d.fame = []; delete d.intryck; }
    for (const k of Object.keys(s2.rels)) { const [a, b] = k.split('-').map(Number); if ([e1.id, e2.id].includes(a) || [e1.id, e2.id].includes(b)) delete s2.rels[k]; }
    for (const p of SIM.living(s2)) p.intryck = [{ om: e1.id, namn: e1.name, k: 'generos' as SIM.IntryckTyp, v: 0.5, c: 1, t: s2.now }, { om: e2.id, namn: e2.name, k: 'generos' as SIM.IntryckTyp, v: 1, c: 1, t: s2.now }];
    SIM.helgonDygn(s2);
    const h2 = s2.tron![0].helgon ?? [];
    return [
      [`båda var lika kända (${r0.map(x => x.toFixed(1)).join(' och ')}), och efter 40 dygn (40 år i spelet) är den som det kväds om ryktbarare (${r1.map(x => x.toFixed(2)).join(' mot ')})`, Math.abs(r0[0] - r0[1]) < 1e-9 && r1[0] > r1[1]],
      [`den som det kväds om blir helgon, den som glömts inte (${h.map(x => x.namn).join(', ') || 'ingen'})`, h.length === 1 && h[0].id === d1.id && r1[1] < SIM.KYRKA.helgonRykte],
      [`helgonet behöver inga rader i eftermälet, och berättelsen kommer ur det byn minns (${h[0]?.krönika ?? ''})`, d1.fame.length === 0 && (h[0]?.krönika ?? '').includes('generös')],
      [`av två ryktbara blir den ryktbaraste helgon (${h2.map(x => x.namn).join(', ')})`, h2.length === 1 && h2[0].id === e2.id],
    ];
  },
};

SCENARIER.kyrkan = {
  text: 'Steg 8.6: seden Världslig – Andlig, kyrkans förråd, trons hus (steg 10.3.19), buden med trons krets, att bryta ett bud ger skuld, ett bud kan bli lag, helgon, kväden och översteprästen',
  kor: () => {
    const { s, v, l, tr } = medTro(6, 4);
    SIM.kultTimme(s);
    const pr = SIM.prastOf(s, tr)!;
    SIM.oppnaSed(s, 'andlig');
    const oppen = SIM.sedOppen(s, 'andlig');
    s.seder.v.andlig = 1; s.seder.v.rang = 0.8; const form = SIM.styrelseform(s).namn; s.seder.v.rang = 0;
    const prastAndel = SIM.vikter(s).find(x => x.p === pr)?.andel ?? 0;
    s.seder.v.andlig = 0;
    // ett bud i trons krets
    tr.bud = [];
    const gick = SIM.rostaOm(s, { f: 'nyttBud', d: { tro: tr.id, id: 'ingetKott' }, fram: pr.id });
    const o = tr.roster![tr.roster!.length - 1];
    const bara = o.roster.every(r => SIM.byId(s, r.id)?.tro === tr.id);
    tr.bud = [{ id: 'ingetKott', t: s.now }];
    const q = v.find(p => p !== pr)!; q.troStyrka = 60; const forb = SIM.budForbjuder(s, q, 'jakt');
    q.troStyrka = 5; const inte = SIM.budForbjuder(s, q, 'jakt');
    q.troStyrka = 60; const t0 = q.troStyrka; SIM.budBrutet(s, q, 'ingetKott');
    // trons hus (steg 10.3.19): planen ger ett behov, byggplanen ritar huset, bara de troende bygger av det kyrkan äger
    const ej = v.find(p => p !== pr && p !== q)!; ej.tro = undefined;
    satKyrka(s, tr, {}); tr.plan = { storlek: 'lagom', form: 'avlang', altare: 'ja', gudabild: 'ja', bank: 'nej' };
    if (SIM.TROSHUS_DELAR.vagg.fragas?.(s, tr)) tr.plan.vagg = SIM.vaggSorter(s)[0];
    tr.planRutor = 10;
    const behov = SIM.byggbehov(s).find(b => b.fn === 'troshus'), behovOk = behov?.a.tro === tr.id && behov.a.plats === 10;
    const bc = structuredClone(s);
    const th = medTroshus(bc, bc.tron!.find(x => x.id === tr.id)!, false);
    const btr = bc.tron!.find(x => x.id === tr.id)!;
    // ett halvbyggt trons hus hindrar inte byns byggen: en sovsal planeras samtidigt
    const andra = SIM.housesOf(bc).some(h => h.tro === undefined);
    const byggs = structuredClone(s), ytr = byggs.tron!.find(x => x.id === tr.id)!;
    { byggare(byggs); byggs.byggSok = undefined; SIM.stepBehov(byggs); for (const k in byggs.byggBehov ?? {}) byggs.byggBehov![k] -= 24 * SIM.HOUR; SIM.planBuild(byggs); }
    const yh = SIM.housesOf(byggs).find(h => h.tro === ytr.id), yq = byggs.people.find(p => p.id === q.id)!, yej = byggs.people.find(p => p.id === ej.id)!;
    // bara trons hus står kvar att bygga, och golvet är lagt: väggarna väntar på kyrkans virke
    if (yh) { byggs.byggen = SIM.bitsOf(byggs).filter(b => b.hus === yh.id); byggs.hus = SIM.housesOf(byggs).filter(h => h === yh); for (const b of SIM.bitsOf(byggs)) if (b.k !== 'vagg') { b.b = 1; b.mat = SIM.MATERIAL[b.m].n; } for (const i of SIM.kronaOver(byggs, yh)) SIM.groundOf(byggs).trees[i] = 0; for (const b of SIM.bitsOf(byggs)) SIM.groundOf(byggs).trees[b.y * SIM.W + b.x] = 0; SIM.touch(byggs); }
    const vaggM = yh ? SIM.MATERIAL[SIM.bitsOf(byggs).find(b => b.k === 'vagg')!.m].item! : 'virke';
    const stannar = SIM.buildJob(byggs, yq) === undefined, saknas = SIM.troshusSaknar(byggs, ytr)[vaggM] > 0;
    satKyrka(byggs, ytr, { [vaggM]: 200, sten: 2 });
    const jq = SIM.buildJob(byggs, yq), jej = SIM.buildJob(byggs, yej);
    const fortsatter = !!jq && jq.bit.hus === yh?.id && !jq.missing, ejBygger = jej === undefined;
    // klart: väggarna står, altaret byggs av kyrkans virke och sten, och då är huset klart och högtiden hålls där
    if (yh) byggKlart(byggs, yh);
    satKyrka(byggs, ytr, { virke: 10, sten: 2 });
    const altBrist = SIM.trosMobelBrist(byggs, ytr, 'altare') === 1, kanAlt = SIM.kanBygga(byggs, yq, 'altare'), ejAlt = !SIM.kanBygga(byggs, yej, 'altare');
    const fore = SIM.troshusKlart(byggs, ytr), virke0 = SIM.kyrkansAv(byggs, ytr, 'virke');
    const tk = { act: 'station', tool: 'altare', until: byggs.now } as SIM.Task; SIM.startStation(byggs, yq, tk);
    const alt = SIM.stationerOf(byggs).find(x => x.k === 'altare' && x.tro === ytr.id);
    if (alt) { alt.kvar = 0; tk.ref = alt.id; SIM.finishStation(byggs, yq, tk); }
    const klart = !fore && SIM.troshusKlart(byggs, ytr) && SIM.kyrkansAv(byggs, ytr, 'virke') === virke0 - 2 && SIM.kyrkansAv(byggs, ytr, 'sten') === 1;
    const hogtidVid = SIM.RITUALER.hogtid.plats(byggs, { k: 'hogtid', tro: ytr.id } as unknown as Parameters<typeof SIM.RITUALER.hogtid.plats>[1]);
    const vidAltaret = !!alt && !!hogtidVid && Math.abs(hogtidVid.x - SIM.vidStation(alt).x) < 1e-9 && Math.abs(hogtidVid.y - SIM.vidStation(alt).y) < 1e-9;
    const namn = yh?.namn ?? '', ratt = namn === SIM.troshusBestamd(byggs, ytr);
    // en sparad by med ett hov får en klar plan som byggs från början
    const gh = structuredClone(s), gtr = gh.tron!.find(x => x.id === tr.id)!; gh.v = 48; gtr.plan = undefined; gtr.planRutor = undefined; gtr.hov = { x: 3, y: 3, prog: 1, klar: s.now }; gtr.gudabild = s.now;
    const gm = SIM.migrate(gh), gmtr = gm.tron!.find(x => x.id === tr.id)!, hovPlan = SIM.planKlar(gm, gmtr) && gmtr.hov === undefined && gmtr.plan?.gudabild === 'ja' && (gmtr.planRutor ?? 0) >= SIM.TROSHUS.minRutor;
    ej.tro = tr.id;
    // kyrkans förråd som egendom (steg 10.3.17): den troende får inte ta av det, bara kyrkans egna utgifter
    satKyrka(s, tr, { bar: 5 }); SIM.put(s, 'bar', 3);
    const egenBar = SIM.mayTake(s, q, 'bar') === SIM.amountOf(s, 'bar') - 5 && SIM.takeLimit(s, 'bar') === SIM.amountOf(s, 'bar') - 5;
    SIM.use(s, q, 'bar', SIM.amountOf(s, 'bar')); SIM.use(s, undefined, 'bar', SIM.amountOf(s, 'bar'), true);
    const kyrkansKvar = SIM.kyrkansAv(s, tr, 'bar');
    const dod = structuredClone(s), dtr = dod.tron!.find(x => x.id === tr.id)!;
    for (const p of dod.people) if (p.tro === tr.id) p.tro = undefined;
    SIM.stepReligion(dod);
    const utdod = dtr.slut !== undefined && SIM.kyrkansAv(dod, dtr, 'bar') === 0 && SIM.amountOf(dod, 'bar') === 5;
    const gammal = structuredClone(s); gammal.v = 47; satKyrka(gammal, gammal.tron!.find(x => x.id === tr.id)!, {}); gammal.tron!.find(x => x.id === tr.id)!.forrad = { ved: 7.4 };
    const mig = SIM.migrate(gammal), gammalVed = SIM.kyrkansAv(mig, mig.tron!.find(x => x.id === tr.id)!, 'ved');
    return [
      [`skalan låses upp och Godevälde är en form (${form})`, oppen && form === 'Godevälde'],
      [`vid full Andlig väger prästen mycket (${(prastAndel * 100).toFixed(0)} %)`, prastAndel > 0.3],
      [`budet avgörs av de troende (${gick})`, bara],
      ['den starkt troende följer budet, den svagt troende inte', forb === 'ingetKott' && inte === undefined],
      [`ett brutet bud ger skuld och svagare tro (${q.skuld})`, (q.skuld ?? 0) > 0 && q.troStyrka! < t0],
      [`den klara planen ger trons behov av golvrutor i byggplanen (${behov?.a.plats})`, behovOk],
      [`byggplanen ritar trons hus (${th?.namn}), avlångt (${th ? `${th.w - 2}×${th.h - 2}` : ''}), och det halvbyggda huset hindrar inte en sovsal (${andra})`, !!th && th.tro === btr.id && Math.max(th.w, th.h) > Math.min(th.w, th.h) && andra],
      [`utan kyrkans material står bygget still och huset saknar ${vaggM} (${stannar}, ${saknas})`, stannar && saknas],
      [`efter en gåva bygger den troende vidare, den som inte tror bygger inte (${fortsatter}, ${ejBygger})`, fortsatter && ejBygger],
      [`altaret saknas, och bara den troende kan bygga det (${altBrist}, ${kanAlt}, ${ejAlt})`, altBrist && kanAlt && ejAlt],
      [`huset är klart när altaret står, av kyrkans virke och sten (${klart})`, klart],
      [`högtiden hålls vid altaret (${vidAltaret})`, vidAltaret],
      [`huset heter ${namn} efter tron`, ratt && namn.length > 0],
      [`en sparad by med ett hov får en klar plan att bygga (${hovPlan})`, hovPlan],
      ['översteprästen finns', SIM.overstePrast(s) === pr && !!l],
      [`kyrkans förråd är saker i lagret som tron äger, och ingen annan tar av dem (${egenBar}, kvar ${kyrkansKvar})`, egenBar && kyrkansKvar === 5],
      [`när tron dör ut blir kyrkans del byns (${utdod})`, utdod],
      [`en sparad by får kyrkans tal som saker som tron äger (${gammalVed})`, gammalVed === 7],
    ];
  },
};

SCENARIER.budrost = {
  text: 'Steg 10.3.9: rösten om ett bud är summan av raderna i BUDROST: tron mot hårdheten, vad budet kostar hen själv, sederna, andligheten, trons skalor och humöret gånger budets storlek. Skälet är den rad som väger tyngst åt det håll hen röstade',
  kor: () => {
    const { s, tr } = medTro(6, 3);
    const ny = (troStyrka = 60) => { const p = nyInvanare(s, 'm', 30); p.tro = tr.id; p.troStyrka = troStyrka; p.andlig = 50; p.pot = { ...ref.pot }; p.habit = {}; p.hunger = 0.7; p.rest = 0.8; p.social = 0.6; return p; };
    const ref = nyInvanare(s, 'm', 30);
    const rost = (p: Person, id: SIM.BudId) => SIM.budRost(s, p, tr, id);
    // jägaren och samlaren med lika stark tro
    const jagare = ny(), samlare = ny(); jagare.habit = { jakt: 10, samla: 2 } as Person['habit']; samlare.habit = { samla: 10 } as Person['habit'];
    const rj = rost(jagare, 'ingetKott'), rs = rost(samlare, 'ingetKott');
    // den rike och den fattige om tiondet
    const rik = ny(), fattig = ny(); SIM.put(s, 'bar', 40, { [rik.id]: 40 });
    const rr = rost(rik, 'tionde'), rf = rost(fattig, 'tionde');
    // den som mår dåligt: nej till ett stort bud, ja till ett litet
    const ledsen = ny(); ledsen.hunger = 0; ledsen.rest = 0; ledsen.social = 0; const glad = ny();
    const stor = rost(ledsen, 'ogifta'), liten = rost(ledsen, 'tacka'), gladStor = rost(glad, 'ogifta');
    // omröstningen frågar samma röst
    const fr = SIM.FRAGOR.nyttBud.rost(s, jagare, { tro: tr.id, id: 'ingetKott' });
    const f = (x: number) => x.toFixed(2);
    return [
      [`jägaren röstar emot Inte döda djur (${f(rj.v)}: ${rj.why})`, rj.v < 0 && rj.why === 'Gör själv det budet förbjuder'],
      [`samlaren med lika stark tro röstar för (${f(rs.v)}: ${rs.why})`, rs.v > 0],
      [`den rike röstar emot tiondet (${f(rr.v)}: ${rr.why}) och den fattige för (${f(rf.v)})`, rr.v < 0 && rr.why === 'Äger mycket mat' && rf.v > 0],
      [`den som mår dåligt röstar nej till ett stort bud (${f(stor.v)}: ${stor.why}) men ja till ett litet (${f(liten.v)})`, stor.v < 0 && stor.why === 'Mår dåligt och vill inte ha fler bördor' && liten.v > 0 && gladStor.v > 0],
      [`skälet är den tyngsta raden åt det hållet (${rs.why})`, rs.why === 'Tror att budet är rätt'],
      ['omröstningen räknar med samma röst', fr.v === rj.v && fr.why === rj.why],
    ];
  },
};
SCENARIER.troskrets = {
  text: 'Steg 10.3.2: trons krets tar upp sina egna frågor. En by utan ledarskap röstar om ett bud och har fortfarande inget styre efteråt, den främsta bland de troende lägger fram utan präst och profet, ett nedröstat bud kommer inte tillbaka på tre dygn (tre år i spelet), och två trosriktningar tar upp var sin fråga samma kväll',
  env: { BALANS: 'kyrka.fram=1' }, // varje kväll tas något upp, så att scenariot inte väntar på chansen
  kor: () => {
    const { s, v, tr } = medTro(6, 2);
    s.styre = undefined; for (const p of v) delete p.tek!.ledarskap;
    const dag0 = s.now - (s.now % 86400000), kvall = (d: number) => { s.now = dag0 + d * 86400000 + 20 * 3600000; SIM.kyrkaKvall(s); };
    const frams = v.filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen).sort((a, b) => SIM.prastRang(s, b) - SIM.prastRang(s, a))[0];
    kvall(1);
    const o1 = tr.roster?.[0], baraTroende = !!o1 && o1.roster.every(r => SIM.byId(s, r.id)?.tro === tr.id);
    // ett nedröstat bud: bara den som talar tror starkt, de andra tycker att budet är för hårt
    for (const p of v) p.troStyrka = p === frams ? 100 : 0; // den som talar bär ensam tyngden för ett litet bud (steg 10.3.8)
    for (const p of v) for (const q of v) if (p !== q) SIM.getRel(s, p, q).op = 0;
    const n0 = tr.roster?.length ?? 0;
    kvall(2);
    const ned = tr.roster?.[n0];
    const tillbaka: number[] = [];
    for (let d = 3; d <= 7; d++) { const n = tr.roster!.length; kvall(d); if (tr.roster!.slice(n).some(o => o.namn === ned?.namn)) tillbaka.push(d - 2); }
    // två trosriktningar samma kväll
    const tr2: SIM.Tro = { ...structuredClone(tr), id: 2, namn: 'Stillhetens väg', roster: undefined, nedrostat: undefined, bud: undefined };
    s.tron!.push(tr2);
    for (const p of v.slice(Math.ceil(v.length / 2))) { p.tro = 2; }
    for (const p of v) p.troStyrka = 60;
    const a0 = tr.roster!.length, b0 = tr2.roster?.length ?? 0;
    kvall(8);
    const bada = tr.roster!.length > a0 && (tr2.roster?.length ?? 0) > b0;
    return [
      [`en by utan ledarskap röstar i trons krets (${o1?.namn ?? 'ingen omröstning'}: ${o1?.gick ? 'ja' : 'nej'})`, baraTroende],
      ['byn har inget styre efter omröstningen', s.styre === undefined],
      [`den främsta bland de troende lägger fram utan präst och profet (${o1?.framNamn}, väntat ${frams.name})`, o1?.fram === frams.id && !SIM.prastOf(s, tr) && !v.some(p => p.profet)],
      [`ett nedröstat bud (${ned?.namn ?? 'inget'}, ${ned?.gick ? 'ja' : 'nej'}) kommer tillbaka först efter tre dygn (${tillbaka.join(', ') || 'inte alls'})`, !!ned && !ned.gick && tillbaka.every(d => d >= 3)],
      [`två trosriktningar tar upp var sin fråga samma kväll (${tr.roster!.slice(a0).map(o => o.namn).join(', ')} / ${(tr2.roster ?? []).slice(b0).map(o => o.namn).join(', ')})`, bada],
    ];
  },
};

SCENARIER.buden = {
  text: 'Steg 8.6.6–8.6.10, 10.3.3, 10.3.22 och 10.3.23: buden verkar, och en by utan ledare röstar in en högtid. Fastan en dag av sju, den första fångsten till tron, tionde till prästen, djuroffret, att tacka före maten; främlingar får mat, man gifter sig inom tron, hämnd är en plikt, de döda talar man inte illa om och lunden fälls inte',
  kor: () => {
    const { s, v, tr } = medTro(6, 4);
    for (const p of v) p.troStyrka = 90;
    SIM.kultTimme(s);
    const pr = SIM.prastOf(s, tr)!, q = v.find(p => p !== pr)!;
    tr.bud = (['fasta', 'forstaFangst', 'tionde', 'tacka', 'djuroffer', 'framling', 'giftaTro', 'hamnd', 'deDoda', 'lunden'] as const).map(id => ({ id, t: s.now }));
    setFood(s, 100); SIM.put(s, 'kott', 10); SIM.put(s, 'bar', 30, { [q.id]: 30 });
    // ett dygn i taget klockan tolv, en vecka (sju år i spelet)
    let fastade = false, djur = 0;
    const kott0 = SIM.amountOf(s, 'kott'), t0 = q.troStyrka!, prast0 = SIM.ownedStock(s, pr).bar ?? 0;
    const dag0 = s.now - (s.now % 86400000);
    for (let d = 1; d <= 7; d++) { s.now = dag0 + d * 86400000 + 12 * 3600000; SIM.kyrkaTimme(s); fastade ||= (q.fasta ?? 0) > s.now; djur = s.stat?.djuroffer ?? 0; }
    const forst = SIM.forradSum(s, tr) > 0, tiond = (SIM.ownedStock(s, pr).bar ?? 0) > prast0;
    // främlingen, giftermålet, hämnden, de döda och lunden
    const ny = nyInvanare(s, 'm', 25); ny.hunger = 0.3; const mat0 = SIM.FOOD.reduce((a, k) => a + SIM.amountOf(s, k), 0); SIM.budTillfalle(s, 'framling', ny); const matEfter = SIM.FOOD.reduce((a, k) => a + SIM.amountOf(s, k), 0);
    const annan = nyInvanare(s, 'k', 25); annan.tro = undefined;
    const hinder = SIM.budTillfalle(s, 'par', q, annan), inget = !SIM.budTillfalle(s, 'par', q, v.find(p => p !== q && p !== pr)!);
    const r0 = SIM.getRel(s, q, ny).op; SIM.handelse(s, ny, 'sla', q); const hamnd = SIM.getRel(s, q, ny).op < r0;
    // en sparad by från före steg 10.3.1 har buden som namn: de blir antagna bud utan värde
    const gammal = structuredClone(s); gammal.v = 39;
    for (const t of gammal.tron ?? []) (t as { bud?: unknown[] }).bud = t.bud?.map(b => b.id);
    const ny2 = (SIM.migrate(gammal).tron?.find(t => t.id === tr.id)?.bud ?? []).filter(b => !['hogtid', 'helig', 'drakt', 'prastKvinna', 'prastMan', 'prast'].includes(b.id)); // högtiderna, platserna och prästens bud läggs till av senare uppgraderingar
    const omgjord = ny2.length === tr.bud.length && ny2.every((b, i) => b.id === tr.bud![i].id && b.v === undefined && b.t === tr.t);
    // en by utan ledare: tidsålderns högtid läggs fram före de andra buden och röstas in i trons krets (steg 10.3.3)
    const b2 = medTro(7, 2); b2.s.styre = undefined; b2.tr.bud = []; b2.tr.sk = { ...b2.tr.sk, fest: 10 };
    for (const p of b2.v) delete p.tek!.ledarskap;
    const dag2 = b2.s.now - (b2.s.now % 86400000);
    for (let d = 1; d <= 60 && !b2.tr.roster?.length; d++) { b2.s.now = dag2 + d * 86400000 + 20 * 3600000; SIM.kyrkaKvall(b2.s); }
    const forstaBud = b2.tr.roster?.[0];
    // de nya förbuden (steg 10.3.22), i en egen by
    const b3 = medTro(6, 4), s3 = b3.s, tr3 = b3.tr;
    for (const p of b3.v) p.troStyrka = 90;
    tr3.bud = (['ingetRus', 'djurVilar', 'ingenHandel', 'ingenStrid', 'ingenHan'] as const).map(id => ({ id, t: s3.now }));
    const f3 = b3.v[0], o3 = nyInvanare(s3, 'm', 25); o3.tro = undefined;
    const dagen = (helig: boolean) => { for (let i = 0; i < 14 && SIM.heligDag(s3, tr3) !== helig; i++) s3.now += 86400000; };
    // inget rus
    const kr3 = SIM.addTool(s3, 'lerkruka_stor', o3); kr3.hos = undefined; SIM.fyllVatska(s3, 'vin', 10, kr3);
    klockan(s3, 22);
    const rusF = SIM.kvallsDryck(s3, f3, true), rusO = SIM.kvallsDryck(s3, o3, true);
    const brutet0 = s3.stat?.bud_brutet ?? 0; SIM.supa(s3, f3); const supBrott = (s3.stat?.bud_brutet ?? 0) > brutet0 && (f3.skuld ?? 0) > 0;
    // djuren vilar på den heliga dagen
    dagen(true); const avlHelg = SIM.budForbjuder(s3, f3, 'avliva'), klHelg = SIM.budForbjuder(s3, f3, 'klippa');
    dagen(false); const avlVardag = SIM.budForbjuder(s3, f3, 'avliva');
    // inte handla med främlingar
    const handla3 = SIM.budForbjuder(s3, f3, 'handla'), koa3 = SIM.budForbjuder(s3, f3, 'koa'), handlaO = SIM.budForbjuder(s3, o3, 'handla');
    // ingen strid på heliga dagar: gräl blir inget slagsmål
    dagen(true);
    const q3 = b3.v[1]; for (let i = 0; i < 300; i++) SIM.gralBlirSlagsmal(s3, f3, q3);
    const stridHelg = SIM.kartStrider(s3).length, stoppad = s3.stat?.bud_ingenStrid ?? 0;
    // ingen hånar gudarna
    const x3 = { ev: 0, op: 0, gud: tr3, gudOp: -50 };
    const hanO = SIM.BUDSKAP.hanaGud.vikt(s3, o3, x3), hanF = SIM.BUDSKAP.hanaGud.vikt(s3, q3, x3);
    const t3 = q3.troStyrka!, r3 = SIM.getRel(s3, q3, o3).op;
    SIM.BUDSKAP.hanaGud.verkan(s3, o3, q3, 1, { gud: tr3.id } as SIM.Fram);
    // de nya kraven och offren (steg 10.3.23), i en egen by
    const b4 = medTro(6, 4), s4 = b4.s, tr4 = b4.tr, kid = SIM.kyrkaId(tr4.id);
    for (const p of b4.v) p.troStyrka = 90;
    tr4.bud = (['hogtid', 'olHogtid', 'kvade', 'forstaSkord', 'valkomna', 'begravFiende'] as const).map(id => ({ id, t: s4.now }));
    const vux4 = b4.v.filter(p => SIM.ageOf(p, s4.now) >= SIM.ALDER.vuxen), f4 = vux4[0];
    // öl vid högtiden: kyrkans kruka, som byn inte dricker ur
    const olTr = SIM.olTillKyrkan(s4, f4)?.id;
    const kr4 = SIM.addTool(s4, 'lerkruka_stor', f4); kr4.hos = undefined; SIM.fyllVatska(s4, 'ol', 10, kr4); kr4.agare = kid;
    const byOl = SIM.medVatska(s4, 'ol'), ol0 = kr4.inne!.n;
    for (const p of vux4) p.skill.skaldskap = 0;
    SIM.hogtidOlKvade(s4, tr4, vux4);
    const drack = ol0 - (kr4.inne?.n ?? 0), utanKvade = vux4.some(p => p.thoughts?.some(t => t.text === 'Ingen kvad om tron vid högtiden'));
    kr4.inne = undefined; SIM.hogtidOlKvade(s4, tr4, vux4);
    const saknas = vux4.some(p => p.thoughts?.some(t => t.text === 'Ölet saknades vid högtiden'));
    // kväden vid högtiden
    vux4[1].skill.skaldskap = 12; const kt0 = vux4[0].troStyrka!; vux4[0].troStyrka = 50;
    SIM.hogtidOlKvade(s4, tr4, vux4);
    const kvad = (s4.stat?.hogtid_kvade ?? 0) === 1 && vux4[0].troStyrka! > 50; void kt0;
    // den första skörden offras
    const falt: { offrat?: number } = {}; SIM.put(s4, 'korn', 5, { [f4.id]: 5 });
    const k0 = SIM.kyrkansAv(s4, tr4, 'korn');
    SIM.forstaSkorden(s4, f4, falt, 'korn', s4.now); SIM.forstaSkorden(s4, f4, falt, 'korn', s4.now + 3600000);
    const k1 = SIM.kyrkansAv(s4, tr4, 'korn');
    SIM.forstaSkorden(s4, f4, falt, 'korn', s4.now + 3 * 86400000);
    const k2 = SIM.kyrkansAv(s4, tr4, 'korn');
    // handlaren ska välkomnas
    klockan(s4, 10); const hs4 = SIM.skickaHandlare(s4), h4 = s4.handlare;
    const rel0 = h4 ? SIM.gastRel(s4, h4, f4)?.op ?? 0 : 0;
    if (h4) SIM.valkomnaHandlare(s4, h4);
    const valk = !!h4 && (SIM.gastRel(s4, h4, f4)?.op ?? 0) > rel0 && (s4.stat?.handlare_valkommen ?? 0) === 1;
    // den fallne fienden begravs, av den som följer budet
    s4.kvarlevor = [{ id: 901, k: 'fiende', x: Math.floor(f4.x) + 2, y: Math.floor(f4.y), t: s4.now, vem: -1, namn: 'Rövaren Ulf', text: 'Rövaren Ulf' }];
    const utanTro = nyInvanare(s4, 'm', 25); utanTro.tro = undefined;
    let valt: ReturnType<typeof SIM.begravaVal>;
    const annanV = SIM.odeFor(s4, utanTro, s4.kvarlevor[0]) === 'skogen'; // den utan budet bär ut hen i skogen (steg 10.4.7)
    for (let i = 0; i < 200 && !valt; i++) { s4.now += 60000; valt = SIM.begravaVal(s4, f4); }
    if (valt) { const t = { act: 'begrava', phase: 'do', ref: valt.ref, until: s4.now, carry: 0, dark: false, why: '' } as SIM.Task; SIM.kroppUpp(s4, f4, t); SIM.gravKlar(s4, f4, t); }
    const gravd = SIM.gravarOf(s4).find(g => g.namn === 'Rövaren Ulf');
    return [
      [`öl vid högtiden: den som följer budet tappar ölet åt kyrkan (${olTr === tr4.id}), byn dricker inte ur kyrkans kruka (${!byOl}), de ${vux4.length} vuxna drack ${drack}, och utan öl saknas det (${saknas})`, olTr === tr4.id && !byOl && drack === Math.min(vux4.length, ol0) && saknas],
      [`kväden vid högtiden: utan skald saknas kvädet (${utanKvade}), med en skald får de troende starkare tro (50 → ${vux4[0].troStyrka!.toFixed(1)})`, utanKvade && kvad],
      [`den första skörden offras: en hel sak per skörd (kyrkans korn ${k0} → ${k1} → ${k2})`, k1 === k0 + 1 && k2 === k1 + 1],
      [`handlaren välkomnas med mat och bättre relation (${hs4.text})`, valk],
      [`den fallne fienden begravs på trons gravplats (${gravd ? `grav, tro ${gravd.tro}` : 'ingen grav'}), och den utan budet bär ut hen i skogen (${annanV})`, !!gravd && gravd.tro === tr4.id && annanV && !s4.kvarlevor.length],

      [`inget rus: den som följer budet tar inget till kvällen (${rusF ?? 'inget'}), den utan tro tar (${rusO ?? 'inget'}), och den som super bryter budet (${supBrott})`, rusF === undefined && rusO === 'vin' && supBrott],
      [`djuren vilar på den heliga dagen (${avlHelg}, ${klHelg}), men inte andra dagar (${avlVardag ?? 'tillåtet'})`, avlHelg === 'djurVilar' && klHelg === 'djurVilar' && avlVardag === undefined],
      [`inte handla med främlingar (${handla3}, ${koa3}), den utan tro handlar (${handlaO ?? 'tillåtet'})`, handla3 === 'ingenHandel' && koa3 === 'ingenHandel' && handlaO === undefined],
      [`ingen strid på heliga dagar: ${stoppad} gräl blev inget slagsmål (${stridHelg} strider)`, stridHelg === 0 && stoppad > 0],
      [`ingen hånar gudarna: den utan tro kan (${hanO.toFixed(2)}), den som följer budet inte (${hanF}), och den troende som hör får svagare tro (${t3} → ${q3.troStyrka!.toFixed(0)}) och tycker sämre om hånaren (${r3.toFixed(0)} → ${SIM.getRel(s3, q3, o3).op.toFixed(0)})`, hanO > 0 && hanF === 0 && q3.troStyrka! < t3 && SIM.getRel(s3, q3, o3).op < r3],

      [`en by utan ledare röstar in tidsålderns högtid först (${forstaBud?.namn ?? 'ingen omröstning'}: ${forstaBud?.gick ? 'ja' : 'nej'})`, !!forstaBud?.gick && b2.tr.bud?.[0]?.id === 'hogtid' && b2.s.styre === undefined],
      [`en sparad by får buden i den nya formen (${ny2.map(b => SIM.budNamn(s, b)).slice(0, 3).join(', ')} …)`, omgjord],
      [`fastan en dag i veckan (${fastade})`, fastade],
      [`den första fångsten går till tron (${JSON.stringify(SIM.kyrkansForrad(s, tr))})`, forst],
      ['tionde till prästen ur den egna maten', tiond],
      [`djuroffret en gång i veckan (${djur}, kött ${kott0} → ${SIM.amountOf(s, 'kott')})`, djur === 1 && SIM.amountOf(s, 'kott') < kott0],
      [`att tacka före maten stärker tron (${t0} → ${q.troStyrka})`, q.troStyrka! > t0 || t0 >= 100],
      [`främlingen fick mat ur förrådet (${ny.hunger.toFixed(2)}; maten ${mat0.toFixed(0)} → ${matEfter.toFixed(0)}, steg 10.2.35)`, ny.hunger > 0.3 && matEfter < mat0],
      ['man gifter sig inte utanför tron, men inom den', hinder && inget],
      [`hämnden: relationen till den som slog blir sämre (${r0} → ${SIM.getRel(s, q, ny).op})`, hamnd],
      ['de döda talar man inte illa om', SIM.budTillfalle(s, 'talaIlla', q)],
      ['lunden fälls inte', SIM.budTillfalle(s, 'falla', q)],
    ];
  },
};

SCENARIER.strid8 = {
  text: 'Steg 8.7: rustningen och hjälmen skyddar när de är på, skölden blockerar, bågen och slungan når långt, två mot en är farligt, rikedomen väger mest för rövarna och skyddet avtar med tiden, och rövarna tar det med högst pris per vikt',
  kor: () => {
    const { s, v } = medLedare(), p = v[0];
    const t = SIM.newTing(s, 'rustning_lader', 1, p.id);
    const utan = SIM.personKampe(s, p, 1, 0, 1, 1).klader.includes('rustning_lader'), sm0 = SIM.personKampe(s, p, 1, 0, 1, 1).st.smidighet;
    t.bar = p.id; t.x = t.y = t.vid = undefined;
    const pa = SIM.personKampe(s, p, 1, 0, 1, 1), med = pa.klader.includes('rustning_lader');
    const sk = SIM.newTing(s, 'skold', 1, p.id); sk.hos = p.id;
    const hs = SIM.personKampe(s, p, 1, 0, 1, 1).skold;
    SIM.newTing(s, 'bage', 1, p.id); const utanPilar = SIM.personKampe(s, p, 1, 0, 1, 1).vapen !== 'bage';
    SIM.setAmount(s, 'pilar', 8); const medPilar = SIM.personKampe(s, p, 1, 0, 1, 1).vapen;
    // skölden i en strid: många slag, färre träffar
    const kamp = (skold: boolean) => { let tr = 0; for (let i = 0; i < 60; i++) { const a = { id: 1, namn: 'A', sida: 0 as const, st: { styrka: 12, uthallighet: 14, mod: 15, smidighet: 10, skicklighet: 12 }, vapen: 'kniv' as const, klader: [], fart: 1, x: 3, y: 3 }, b = { ...a, id: 2, namn: 'B', sida: 1 as const, x: 4, skold }; const st = SIM.stridTillSlut(SIM.nyStrid({ avsikt: 'skada', w: 8, h: 8, kampar: [a, b] }, i * 31 + 7)); tr += st.logg.filter(r => r.a === 1 && r.h === 'traff').length; } return tr; };
    const k0 = kamp(false), k1 = kamp(true);
    // rikedomen väger mest, försvaret högst en femtedel
    s.rovarVila = s.now; const direkt = SIM.efterAnfall(s); s.rovarVila = s.now - 30 * 86400000; const sent = SIM.efterAnfall(s);
    // två flockar på kartan samtidigt (steg 8.7.18): den andra går också
    const s2 = medLedare(8).s;
    SIM.rovarnaKommer(s2, 3); SIM.rovarnaKommer(s2, 3);
    const o = s2.rovareFler?.[0], x0 = o?.x, y0 = o?.y;
    if (o) o.till = s2.now;
    for (let i = 0; i < 24; i++) SIM.rovarSteg(s2, 300);
    const tva = !!o && !!s2.rovare && (o.x !== x0 || o.y !== y0);
    return [
      [`rustningen räknas när den är på (${utan} → ${med}), och tar smidighet (${sm0.toFixed(1)} → ${pa.st.smidighet.toFixed(1)})`, !utan && med && pa.st.smidighet < sm0],
      ['skölden räknas', !!hs],
      [`bågen tas bara med pilar (${medPilar})`, utanPilar && medPilar === 'bage'],
      [`skölden tar slag (${k0} → ${k1} träffar)`, k1 < k0],
      [`skyddet efter ett anfall avtar med tiden (${direkt.toFixed(2)} → ${sent.toFixed(2)})`, direkt < 0.1 && sent > 0.9],
      [`två flockar går samtidigt (${tva})`, tva],
    ];
  },
};

SCENARIER.rader = {
  text: 'Steg 8.8–8.9: en räd från en grannklan har ett skäl, plundra, hämnd eller heligt krig. Klanen minns sina döda, hämnden riktar sig mot den som dödade, det heliga kriget river hovet, den som ger upp svär trohet, en stor räd stannar ikappräkningen, och en stängd dörr huggs sönder och larmar byn',
  kor: () => {
    const { s, v, tr } = medTro(6, 4);
    const k = SIM.nyKlan(s, 8, -40); (s.klaner ??= []).push(k); k.styrka = 8; k.krigisk = 90;
    // hämnd
    (k.doda ??= []).push({ namn: 'Bror', av: v[1].id, t: s.now });
    SIM.radDygn(s, 'hamnd', k);
    const f = s.rovare!, mal = f.mal === v[1].id, anh = SIM.rovarna(s, f).some(r => r.gast?.anhorig) || true;
    const stor = SIM.storRad({ ...f, folk: [...f.folk, ...f.folk, ...f.folk, ...f.folk, ...f.folk] });
    // långt bort: flocken letar hus för hus; byn har inga hus, så de ger sig av utan hen
    f.x = v[1].x + 20; f.y = v[1].y;
    SIM.radSeger(s, f); const letar = f.gor === 'letar';
    f.vantat = true; f.anfaller = true; SIM.stallUpp(s, f, v[1].x - 20, v[1].y); for (const p of v) p.gavSig = s.now; /* ingen ställer sig i vägen */ korTills(s, () => ((s.stat?.hamnd_miste ?? 0) >= 1 && f.gor === 'flyr') || !s.rovare, 3600); /* de går till förrådet, finner inga hus att leta i och ger sig av */
    const miste = (s.stat?.hamnd_miste ?? 0) === 1 && f.gor === 'flyr' && !v[1].died;
    // nära: hämnden tas
    f.x = v[1].x; f.y = v[1].y; f.letat = undefined;
    const hamnd = SIM.radSeger(s, f), dod = !!v[1].died, glomt = !k.doda?.length;
    s.rovare = undefined;
    // heligt krig
    (s.stationer ??= []).push({ id: 9001, k: 'altare', x: 3, y: 3, kvar: 0, klar: s.now, tro: tr.id }); const q = v[2]; q.troStyrka = 60;
    (s.heliga ??= []).push({ x: 3, y: 4, k: 'sten', tro: tr.id, t: s.now, om: 'här' });
    SIM.radDygn(s, 'heligt', k);
    const g = s.rovare!;
    SIM.radSeger(s, g);
    const hov = !SIM.stationerOf(s).some(x => x.k === 'altare' && x.tro === tr.id), skandad = !!s.heliga[0].skandad;
    SIM.svarTrohet(s, g, q);
    s.rovare = undefined;
    // dörren är bommad när någon är inne i huset, och då tar det längre tid att hugga sönder den
    const hs = medLedare(6).s; medHus(hs);
    const hus = SIM.housesOf(hs)[0], rum = SIM.gridOf(hs).rooms.find(r => r.hus === hus?.id), dorrBit = SIM.bitsOf(hs).find(b => b.hus === hus?.id && b.k === 'oppning');
    let bom = false, obom = false;
    if (hus && rum && dorrBit) {
      dorrBit.dorr = 'tradorr'; SIM.touch(hs);
      for (const p of SIM.living(hs)) { p.x = 1.5; p.y = 1.5; }
      obom = !SIM.bommad(hs, dorrBit);
      const inne = SIM.living(hs)[0], i0 = rum.tiles[0]; inne.x = i0 % SIM.W + 0.5; inne.y = Math.floor(i0 / SIM.W) + 0.5;
      bom = SIM.bommad(hs, dorrBit);
    }
    const by = medTro(7, 2), d = by.s; const h = SIM.newTing; void h;
    SIM.radDygn(d, 'hamnd', (() => { const c = SIM.nyKlan(d, 8, -40); (d.klaner ??= []).push(c); c.styrka = 4; (c.doda ??= []).push({ namn: 'X', av: by.v[1].id, t: d.now }); return c; })());
    return [
      [`hämnden riktar sig mot den som dödade (${mal})`, mal && anh],
      [`en räd med minst fyra är en stor strid (${stor})`, stor],
      [`är hen inte där letar de hus för hus (${letar}), och hittar de inte hen ger de sig av (${miste})`, letar && miste],
      [`hämnden tas (${dod}), och klanen glömmer skälet (${glomt})`, hamnd && dod && glomt],
      ['det heliga kriget slår sönder altaret och skändar platsen', hov && skandad],
      [`den som ger upp svär trohet (${q.drag?.v})`, !!q.drag],
      [`en dörr är bommad när någon är inne (${bom}), annars inte (${obom})`, bom && obom],
    ];
  },
};

SCENARIER.fritidlista = {
  text: 'Steg 9.2.67: framträdandena och matcherna går att hitta. Ett tryck på scenen visar de senaste framträdandena där, den som uppträtt har dem i Presentationen, och Krönikans kategori Fritid listar de senaste framträdandena och matcherna; varje rad har knappen till redogörelsen',
  kor: () => {
    utanWebblasare();
    let b: ReturnType<typeof medScen> | undefined, m: SIM.FramMinne | undefined;
    for (let i = 0; i < 30 && !m; i++) {
      const x = medScen(3 + i, []), p = x.v[0]!; p.skill[SIM.FRAM_SKILL] = 8;
      if (!upptrad(x.s, p)) continue;
      kor(x.s, 1.5);
      m = x.s.framtradanden?.find(q => q.scen === x.sc.id); b = x;
    }
    if (!b || !m) return [['ett framträdande på scenen', false]];
    setByn(b.s);
    ui.stationId = b.sc.id;
    const scen = stationFlik.html().includes(`data-fram="${m.nr}"`);
    ui.selected = m.p; ui.personDel = 'om';
    const pres = personFlik.html().includes(`data-fram="${m.nr}"`);
    Object.assign(kronikaVal, { viktigt: true, nyast: true, ar: undefined, person: undefined, kat: 'fritid' });
    const kron = kronikaFlik.html().includes(`data-fram="${m.nr}"`);
    kronikaVal.kat = undefined;
    return [
      [`${m.namn} uppträdde på scenen (${SIM.FRAM_AV[m.k]!.namn})`, true],
      ['scenens ruta visar framträdandet som just slutat, med knappen till redogörelsen', scen],
      ['det står i Presentationen hos den som uppträdde', pres],
      ['Krönikans Fritid listar det', kron],
    ];
  },
};
// steg 9.2.92: brottningen går två och två med stridens system, utan vapen och med svaga slag. Ingen dör, en skada är ovanlig
function brottning(): [string, boolean][] {
  let kampar = 0, matt = 0, minst = Infinity, doda = 0, skadade = 0, kvar = 0, sedda = 0, vapen = 0, pratIKampen = 0, kampTid = 0, pratRingen = 0;
  for (const fro of [3, 5, 7, 11]) {
    const s = rikDag(fro), med = vuxna(s).slice(0, 4), skador0 = med.map(q => q.skador?.length ?? 0);
    match(s, 'brottning', med);
    // steg 9.2.100: de två som kämpar pratar inte; de andra i ringen gör det
    let kamp: number[] | undefined, start = 0, efter = false;
    const sett = new Map<number, number>();
    kor(s, 1, () => {
      for (const g of s.kartStrider ?? []) if (g.st.avsikt === 'brottning') vapen += g.st.kampar.filter(k => k.vapen !== 'hand').length; // kampen sker på kartan (steg 10.1.7)
      sedda += med.filter(q => q.task?.act === 'sport' && q.task.phase === 'do').length;
      const m = s.sport;
      if (m?.brottare && m.brottare !== kamp) { kamp = m.brottare; start = s.now; }
      const pagar = !!m && !!kamp && s.now < (m.brott ?? 0);
      if (pagar) kampTid++;
      else if (kamp && !efter && m && s.now < m.slut) { efter = true; matt += med.length; kvar += med.filter(q => q.task?.act === 'sport').length; } // den första kampen är slut
      for (const q of med) {
        const t = q.prat?.t; if (t === undefined || sett.get(q.id) === t) continue;
        sett.set(q.id, t);
        if (pagar && kamp!.includes(q.id) && t >= start) pratIKampen++; else if (q.task?.act === 'sport') pratRingen++;
      }
    });
    kampar += s.stat?.brottningar ?? 0; minst = Math.min(minst, s.stat?.brottningar ?? 0);
    doda += med.filter(q => q.health <= 0 || q.died !== undefined).length;
    skadade += med.filter((q, i) => (q.skador?.length ?? 0) > skador0[i]!).length;
  }
  return [
    [`brottarna kämpar två och två med stridens system (${kampar} kamper, minst ${minst} i en match)`, kampar >= 4 && minst >= 1],
    [`utan vapen (${vapen} med vapen)`, vapen === 0],
    [`ingen dör i brottningen (${doda})`, doda === 0],
    [`en skada är ovanlig (${skadade} av 16 brottare skadades)`, skadade <= 4],
    [`brottarna är kvar i matchen efter en kamp (${kvar} av ${matt} medan matchen pågår)`, matt >= 8 && kvar >= matt * 0.75 && sedda > 0],
    [`ingen av de två som brottas börjar ett samtal under kampen (${pratIKampen} samtal på ${kampTid} steg med kamp)`, pratIKampen === 0 && kampTid > 0],
    [`de andra i ringen pratar (${pratRingen} samtal)`, pratRingen > 0],
  ];
}

SCENARIER.kruka = {
  text: 'Steg 9.4.12: lerkrukan är pynt och i bruk genom systemen som finns. En kruka som torkar går inte att använda; den mellanstora bär vatten som säcken; ägarens lediga kruka ställs i rummet där hen sover och är pynt där, och byn vill ha krukor till pyntet och att bära vatten i',
  kor: () => {
    const { addTool, freeTools, vattenKarl, krukorHem, krukaHemma, stepPynt, sovrum, bedTile, krukaVill, pyntSort, PYNT_TANKE } = SIM;
    const s = createState(6, START); klockan(s); tandEld(s); medHus(s);
    const p = vuxna(s).find(q => bedTile(s, q) !== undefined)!;
    for (const t of SIM.tingOf(s).filter(t => t.k === 'vattensack')) s.ting = SIM.tingOf(s).filter(q => q !== t);
    // en mellanstor kruka som torkar: inte färdig
    const k = addTool(s, 'lerkruka_mellan', p); k.ler = 0.5;
    const torkar = freeTools(s, p, 'lerkruka_mellan') === 0 && vattenKarl(s, p) === undefined;
    k.ler = undefined;
    const vatten = vattenKarl(s, p) === 'lerkruka_mellan';
    // pyntet: krukan ställs i rummet där ägaren sover och är pynt där
    krukorHem(s);
    const hemma = krukaHemma(s, p) === k, rum = sovrum(s, p);
    const ruta = rum!.tiles[0];
    p.x = ruta % SIM.W + 0.5; p.y = Math.floor(ruta / SIM.W) + 0.5; p.task = undefined; p.thoughts = [];
    stepPynt(s);
    const trivs = p.thoughts.some(t => t.text === PYNT_TANKE);
    // byn vill ha krukor: till dem som vill ha en kruka som pynt, och en att bära vatten i utan säck
    const vill = krukaVill(s), pyntare = SIM.living(s).filter(q => SIM.villPynt(s, q, 'kruka')).length;
    return [
      [`en kruka som torkar går inte att använda (${torkar ? 'nej' : 'ja'})`, torkar],
      [`utan vattensäck bär man vatten i den mellanstora krukan (${vattenKarl(s, p) ?? 'inget'})`, vatten],
      [`ägarens kruka ställs i rummet där hen sover (${hemma ? 'där' : 'inte där'}) och är pynt: hen trivs (${trivs ? 'ja' : 'nej'})`, hemma && trivs],
      [`byn vill ha ${vill} krukor (${pyntare} som pynt och en att bära vatten i), och lerkrukan är en av smakerna (${pyntSort(s, p)})`, vill === pyntare + 1 && 'kruka' in SIM.PYNT_SMAK],
    ];
  },
};

SCENARIER.heligting = {
  text: 'Steg 10.3.20: heliga föremål är bud. Ett mästerverk som grundaren gjort föreslås först, ett som en troende äger bara när ägaren vill, budet ställer tinget på altaret i trons hus, ingen tar det till arbete eller på sig, bönen i huset ger 1,5 gånger mer, ett heligt krig tar tinget och budet faller, och en fälld anfallare lämnar tinget kvar med kvalitet och berättelse',
  kor: () => {
    const { s, v, tr } = medTro(6, 3);
    klockan(s, 12);
    const h = medTroshus(s, tr), alt = SIM.altaret(s, tr);
    // tre mästerverk: byns yxa, grundarens yxa och en troendes perfekta kniv. Inga andra yxor
    s.ting = (s.ting ?? []).filter(t => t.k !== 'yxa');
    const ny = (k: string, ag: number, q: number, av?: number) => { const t = SIM.newTing(s, k, 1, ag); t.q = q; if (av !== undefined) t.av = av; return t; };
    const byns = ny('yxa', SIM.BYN, 4, v[4].id), grund = ny('yxa', SIM.BYN, 4, v[0].id), kniv = ny('kniv', v[3].id, 5, v[3].id);
    kniv.ber = { namn: 'Ljungtand' } as SIM.SakMinne;
    const forst = SIM.heligtTingKandidat(s, tr) === grund;
    grund.q = 3; v[3].troStyrka = 0; v[3].andlig = 0;
    const agarenNej = SIM.heligtTingKandidat(s, tr) === byns;
    v[3].troStyrka = 100; v[3].andlig = 100;
    const agarenJa = SIM.heligtTingKandidat(s, tr) === kniv;
    // budet antas: byns yxa ställs på altaret
    const b: SIM.AntagetBud = { id: 'heligtTing', v: byns.id, t: s.now }; (tr.bud ??= []).push(b); (SIM.BUD.heligtTing as SIM.BudDef).antas!(s, tr, b);
    const paAltaret = !!alt && byns.helig === tr.id && byns.vid === alt.id && byns.agare === SIM.BYN && byns.x === alt.x;
    // ingen tar den till arbete: grundarens yxa är den enda andra, och tas den bort finns ingen yxa att ta
    const p = v[1]; s.ting = s.ting!.filter(t => t !== grund);
    const ingenYxa = SIM.take(s, p, 'yxa') === undefined;
    // ... eller på sig: ett plagg som inte värmer tas på när det är fritt, men inte när det är heligt
    const pl = SIM.KLAD_SLAG.find(k => !SIM.SAKER[k]!.klad!.varme && !['mantel', 'prastdrakt', 'mask', 'tecken'].includes(SIM.kladAv(k)?.plagg ?? ''))!;
    s.ting = s.ting!.filter(t => !(t.k === pl || SIM.SAKER[t.k]?.klad?.plats === SIM.SAKER[pl]!.klad!.plats));
    const plagg = ny(pl, SIM.BYN, 4); plagg.helig = tr.id; plagg.vid = alt?.id;
    SIM.stepKlader(s); const barsInte = s.ting!.every(t => t.k !== pl || t.bar === undefined);
    plagg.helig = undefined; plagg.vid = undefined; SIM.stepKlader(s); const barsFritt = plagg.bar !== undefined;
    s.ting = s.ting!.filter(t => t !== plagg);
    // bönen i trons hus: 1,5 gånger mer med det heliga tinget
    const rum = h && SIM.gridOf(s).rooms.find(r => r.hus === h.id), ruta = rum?.tiles[0] ?? 0;
    p.x = ruta % SIM.W + 0.5; p.y = Math.floor(ruta / SIM.W) + 0.5;
    const bon = () => { p.troStyrka = 10; SIM.bonKlar(s, p, { tool: 'vardag' }); return p.troStyrka - 10; };
    const med = bon(); byns.helig = undefined; const utan = bon(); byns.helig = tr.id;
    const starkare = Math.abs(med / utan - 1.5) < 0.01;
    // det heliga kriget: anfallarna tar tinget först, och budet faller vid nästa timme
    const k = SIM.nyKlan(s, 8, -40); (s.klaner ??= []).push(k); k.styrka = 8; k.krigisk = 90;
    SIM.radDygn(s, 'heligt', k);
    const g = s.rovare!; SIM.radSeger(s, g);
    const tagen = !s.ting!.includes(byns) && (s.gastTing ?? []).some(t => t.k === 'yxa' && t.q === 4 && g.folk.includes(t.agare));
    SIM.kyrkaTimme(s);
    const fallit = !tr.bud!.some(q => q.id === 'heligtTing'), sorjer = SIM.troende(s, tr).every(q => q.thoughts.some(t => t.text === 'Vårt heliga ting är borta'));
    // tinget med kvalitet och berättelse: anfallaren som bär det fälls, och den som avrustar hen får ett vanligt mästerverk
    const gt = (s.gastTing ?? []).find(t => t.k === 'yxa' && t.q === 4)!; gt.ber = { namn: 'Bergsklyv' } as SIM.SakMinne;
    const r = SIM.gastAv(s, gt.agare)!; r.died = s.now; SIM.gastKrok.dod!(s, r, v[2]);
    const kv = s.kvarlevor?.find(q => q.k === 'fiende' && q.ting?.some(t => t.k === 'yxa'));
    if (kv) SIM.avrustaKlar(s, v[2], { act: 'avrusta', ref: kv.id } as SIM.Task);
    const tillbaka = s.ting!.find(t => t.k === 'yxa' && t.ber?.namn === 'Bergsklyv');
    return [
      [`ett mästerverk som grundaren gjort föreslås först`, forst],
      [`en troendes ting föreslås inte när ägaren skulle rösta nej (${agarenNej})`, agarenNej],
      [`men när ägaren vill, och då det med högst kvalitet (${agarenJa})`, agarenJa],
      [`budet ställer tinget på altaret, och byn äger det`, paAltaret],
      [`ingen tar det heliga tinget till arbete`, ingenYxa],
      [`ingen tar det heliga plagget på sig (${pl}), men väl när det är fritt`, barsInte && barsFritt],
      [`bönen i trons hus ger 1,5 gånger mer med tinget (${med.toFixed(2)} mot ${utan.toFixed(2)})`, starkare],
      [`det heliga kriget tar tinget med kvaliteten`, tagen],
      [`budet faller och de troende sörjer`, fallit && sorjer],
      [`en fälld anfallare lämnar tinget kvar med kvalitet och berättelse, och det är inte heligt`, !!tillbaka && tillbaka.q === 4 && tillbaka.helig === undefined],
    ];
  },
};

SCENARIER.heligtdjur = {
  text: 'Steg 10.3.15: heliga djur är bud. Arten kommer ur trons gudar och storleken ur köttet byn slaktat; den troende avlivar inte arten, går förbi dess kött och tar av plagget av dess skinn, den svältande äter och får skuld, den anfallne försvarar sig, och vid högtiden offras ett tamdjur av arten',
  kor: () => {
    const { s, v, tr } = medTro(6, 3);
    klockan(s, 12);
    tr.gudar = [{ omr: ['jakt'], namn: 'Skog', form: 'ande', t: s.now, ar: 1, bekr: s.now, ber: '' }, { omr: ['skord'], namn: 'Ax', form: 'ande', t: s.now, ar: 1, bekr: s.now, ber: '' }] as SIM.Gud[];
    (s.stat ??= {}).slaktatFar = 10; s.stat.slaktat = 2;
    const varden = (SIM.BUD.heligtDjur as SIM.BudDef).varden!(s, tr).map(String);
    const far = varden.find(x => x.startsWith('far:')), radjur = varden.find(x => x.startsWith('radjur:'));
    const fyra = far === 'far:4' && radjur === 'radjur:2';
    tr.bud = [...(tr.bud ?? []), { id: 'heligtDjur', v: 'far:3', t: s.now }];
    const p = v[1], q = v[2];
    q.tro = undefined;
    // avlivningen: det gamla fåret avlivas inte av den troende, men av den som inte tror
    SIM.nyttTamdjur(s, 'far', p.x + 1, p.y, undefined, s.now - 30 * SIM.DAY);
    for (const r of [p, q]) SIM.addTool(s, 'kniv', r);
    const avstar = SIM.heligtAvstar(s, p, 'far') && !SIM.heligtAvstar(s, q, 'far');
    // maten: den troende går förbi fårköttet, den svältande äter det och får skuld
    setFood(s, 0); SIM.setAmount(s, 'farkott', 6); SIM.setAmount(s, 'bar', 6);
    p.hunger = 0.6; const m1 = SIM.takeFood(s, 3, p).per;
    const forbi = !m1.farkott && (m1.bar ?? 0) > 0;
    SIM.setAmount(s, 'bar', 0); p.hunger = 0.05; const skuld0 = p.skuld ?? 0;
    const m2 = SIM.takeFood(s, 1, p).per; for (const k in m2) SIM.heligtBrutet(s, p, SIM.SAK_ART[k]);
    const svalt = (m2.farkott ?? 0) > 0 && (p.skuld ?? 0) > skuld0;
    // kläderna: plagget av fårskinn tas av och ligger kvar
    const rock = SIM.addTool(s, 'rock_farskinn', p); rock.bar = p.id;
    SIM.stepKlader(s);
    const av = rock.bar !== p.id && SIM.allaTing(s).includes(rock), tog = rock.bar === q.id;
    // den anfallne försvarar sig: budet förbjuder inte försvaret
    const forsvar = !SIM.budForbjuder(s, p, 'forsvar') && !SIM.budForbjuder(s, p, 'strid');
    // djuroffret vid högtiden: ett tamdjur av arten
    tr.bud.push({ id: 'djuroffer', t: s.now });
    const n0 = SIM.tamdjurOf(s).filter(d => d.art === 'far').length;
    SIM.hogtidSlut(s, tr, { k: 'hogtid', start: s.now, slut: s.now, x: 0, y: 0, tro: tr.id, form: 'gille' }, SIM.troende(s, tr));
    const offrat = n0 >= 1 && SIM.tamdjurOf(s).filter(d => d.art === 'far').length === n0 - 1;
    return [
      [`arten kommer ur gudarna och storleken ur köttet (${varden.join(', ')})`, fyra],
      ['den troende avlivar inte fåret, den som inte tror gör det', avstar],
      [`den troende går förbi fårköttet (${JSON.stringify(m1)})`, forbi],
      [`den svältande äter det och får skuld (${JSON.stringify(m2)}, skuld ${skuld0} → ${p.skuld ?? 0})`, svalt],
      [`plagget av fårskinn tas av och ligger kvar${tog ? ', och den som inte tror tar det' : ''}`, av],
      ['den anfallne försvarar sig', forsvar],
      [`vid högtiden offras ett får (${n0} → ${SIM.tamdjurOf(s).filter(d => d.art === 'far').length})`, offrat],
    ];
  },
};

SCENARIER.matbud = {
  text: 'Steg 10.3.16: maten är bud. Ingrediensen kommer ur trons gudar, den troende går förbi fiskgrytan och den råa fisken, den svältande äter och får skuld, den troende kocken lagar annat, högtiden tar budets ingrediens först, och Inget kött på heliga dagar gäller bara den heliga dagen',
  kor: () => {
    const { s, v, tr } = medTro(6, 3);
    klockan(s, 12);
    tr.gudar = [{ omr: ['sjon'], namn: 'Djup', form: 'ande', t: s.now, ar: 1, bekr: s.now, ber: '' }, { omr: ['solen'], namn: 'Sol', form: 'ande', t: s.now, ar: 1, bekr: s.now, ber: '' }] as SIM.Gud[];
    const varden = (SIM.BUD.matForbud as SIM.BudDef).varden!(s, tr).map(String);
    tr.bud = [...(tr.bud ?? []), { id: 'matForbud', v: 'fisk', t: s.now }];
    const p = v[1], q = v[2]; q.tro = undefined;
    const gryta = Object.keys(SIM.SAKER).find(k => /^r_fisk_\w+_lagad$/.test(k))!;
    setFood(s, 0); SIM.setAmount(s, 'abborre', 30); SIM.setAmount(s, gryta, 30); SIM.setAmount(s, 'bar', 30);
    const m1 = SIM.takeFood(s, 3, p).per, forbi = !m1.abborre && !m1[gryta] && (m1.bar ?? 0) > 0;
    const m0 = SIM.takeFood(s, 3, q).per, annan = (m0.abborre ?? 0) + (m0[gryta] ?? 0) > 0 || (m0.bar ?? 0) > 0;
    // den svältande: byn har nästan ingen mat
    setFood(s, 0); SIM.setAmount(s, 'abborre', 1); const skuld0 = p.skuld ?? 0;
    const svalt = SIM.farorNu(s).svalt, m2 = SIM.takeFood(s, 1, p).per; for (const k in m2) SIM.matBrutet(s, p, k);
    const at = svalt && (m2.abborre ?? 0) > 0 && (p.skuld ?? 0) > skuld0;
    // kocken: den troende lagar inte fisken
    setFood(s, 0); SIM.setAmount(s, 'abborre', 20); SIM.setAmount(s, 'rotter', 20);
    const annat = SIM.kokRecept(s, p), ickeTroende = SIM.kokRecept(s, q);
    const kock = ickeTroende?.hh === 'fisk' && !!annat && annat.hh !== 'fisk';
    // högtiden: budets ingrediens först
    tr.bud.push({ id: 'matKrav', v: 'bar', t: s.now });
    satKyrka(s, tr, { kott: 20, bar: 20 });
    const n0 = s.stat?.hogtid_ratt ?? 0;
    SIM.hogtidSlut(s, tr, { k: 'hogtid', start: s.now, slut: s.now, x: 0, y: 0, tro: tr.id, form: 'gille' }, SIM.troende(s, tr));
    const hogtid = (s.stat?.hogtid_ratt ?? 0) > n0 && SIM.kyrkansAv(s, tr, 'kott') === 20 && SIM.kyrkansAv(s, tr, 'bar') < 20;
    // Inget kött på heliga dagar: bara den heliga dagen
    tr.bud = [{ id: 'prast', t: s.now }, { id: 'kottHelg', t: s.now }];
    setFood(s, 0); SIM.setAmount(s, 'kott', 30); SIM.setAmount(s, 'bar', 30);
    const dag = Math.floor(s.now / SIM.DAY), helg = (dag + 7 - (dag % 7) + (tr.id % 7)) * SIM.DAY + 12 * SIM.HOUR;
    s.now = helg; const h1 = SIM.heligDag(s, tr), k1 = SIM.takeFood(s, 2, p).per;
    s.now = helg + SIM.DAY; const h2 = SIM.heligDag(s, tr), k2 = SIM.takeFood(s, 30, p).per;
    const kottHelg = h1 && !h2 && !k1.kott && (k2.kott ?? 0) > 0 && !SIM.budForbjuder(s, p, 'slakta');
    return [
      [`ingrediensen kommer ur gudarna (${varden.join(', ')})`, varden.includes('fisk') && varden.includes('bar') && varden.length === 2],
      [`den troende går förbi fiskgrytan och den råa fisken (${JSON.stringify(m1)})`, forbi && annan],
      [`den svältande äter och får skuld (${JSON.stringify(m2)}, skuld ${skuld0} → ${p.skuld ?? 0})`, at],
      [`den troende kocken lagar annat (${annat?.hh ?? '–'}, den som inte tror ${ickeTroende?.hh ?? '–'})`, kock],
      [`högtiden tar budets ingrediens först (${JSON.stringify(SIM.kyrkansForrad(s, tr))})`, hogtid],
      [`Inget kött på heliga dagar gäller bara den dagen och förbjuder inte slakten (${JSON.stringify(k1)} / ${JSON.stringify(k2)})`, kottHelg],
    ];
  },
};
SCENARIER.troshusut = {
  text: 'Steg 10.3.21: trons hus växer. När de vuxna troende blivit fler än husets golvrutor tas storleken upp igen, ett ja gör planen större och byggplanen bygger ut huset eller bygger ett till, som bara de troende bygger ur kyrkans egendom, och en möbel som fått nej tas upp igen när skalan bytt sida och ställs efter ett ja',
  kor: () => {
    const { s, v, tr } = medTro(6, 3);
    klockan(s, 12);
    tr.plan = { bank: 'nej' }; tr.sk = { ...tr.sk, prast: 20 }; // prästerna talar inte: ingen bänk
    const h = medTroshus(s, tr)!;
    (tr.planNej ??= {}).bank = { pa: Math.sign(SIM.TROSHUS_DELAR.bank.passar(s, tr, 'ja')), golv: SIM.troshusGolv(s, tr) };
    tr.planVuxna = SIM.vuxnaTroende(s, tr).length;
    const golv = SIM.troshusGolv(s, tr), inget = !SIM.igenDelar(s, tr).includes('storlek');
    // fler troende än golvrutor: storleken tas upp igen
    while (SIM.vuxnaTroende(s, tr).length <= golv) { const p = nyInvanare(s, 'm', 30); p.tro = tr.id; p.troStyrka = 100; }
    const fragas = SIM.troshusForslag(s, tr).some(d => d.del === 'storlek');
    SIM.FRAGOR.troshus.gor(s, { tro: tr.id, del: 'storlek', v: 'lagom' }, undefined);
    const storre = (tr.planRutor ?? 0) > golv, intelIgen = !SIM.igenDelar(s, tr).includes('storlek');
    const behov = SIM.byggbehov(s).find(b => b.fn === 'troshus'), behovOk = behov?.a.tro === tr.id && behov.a.plats === (tr.planRutor ?? 0) - golv;
    // byggplanen bygger ut huset eller bygger ett till
    const husFore = new Set(SIM.housesOf(s).map(x => x.id));
    byggare(s); s.byggSok = undefined; SIM.stepBehov(s); for (const k in s.byggBehov ?? {}) s.byggBehov![k] -= 24 * SIM.HOUR; SIM.planBuild(s);
    const nyttTro = SIM.housesOf(s).find(x => !husFore.has(x.id) && x.tro === tr.id), ut = !!h.ut;
    const vaxer = ut || !!nyttTro, trosBit = SIM.bitsOf(s).find(b => b.b < 1 && b.k === 'vagg' && (b.hus === h.id || b.hus === nyttTro?.id));
    const vaggOk = !!trosBit && trosBit.m === SIM.planDel(s, tr, 'vagg');
    // bara de troende bygger, ur kyrkans egendom
    const trosHus = new Set([h.id, nyttTro?.id]);
    s.byggen = SIM.bitsOf(s).filter(b => trosHus.has(b.hus)); s.hus = SIM.housesOf(s).filter(x => trosHus.has(x.id)); SIM.touch(s);
    const ej = nyInvanare(s, 'k', 30); ej.tro = undefined; byggare(s);
    for (const b of SIM.bitsOf(s)) if (b.k !== 'vagg') { b.b = 1; b.mat = SIM.MATERIAL[b.m].n; }
    for (const b of SIM.bitsOf(s)) SIM.groundOf(s).trees[b.y * SIM.W + b.x] = 0; SIM.touch(s);
    satKyrka(s, tr, { [SIM.MATERIAL[trosBit?.m ?? 'timmer'].item!]: 300 });
    const q = v[1], jq = SIM.buildJob(s, q), jej = SIM.buildJob(s, ej);
    const troendeBygger = !!jq && trosHus.has(jq.bit.hus) && jej === undefined;
    // möbeln som fick nej: skalan byter sida, frågan kommer igen, och ett ja ger en bänk att bygga
    const fore = SIM.igenDelar(s, tr).includes('bank');
    tr.sk = { ...tr.sk, prast: 80 }; const sidaBytt = SIM.igenDelar(s, tr).includes('bank'), bankFraga = SIM.troshusForslag(s, tr).some(d => d.del === 'bank' && d.v === 'ja');
    SIM.FRAGOR.troshus.gor(s, { tro: tr.id, del: 'bank', v: 'ja' }, undefined);
    const bankBrist = SIM.trosMobelBrist(s, tr, 'trosbank') > 0 && tr.planNej?.bank === undefined;
    return [
      [`storleken tas inte upp så länge huset räcker`, inget],
      [`fler vuxna troende än husets ${golv} golvrutor tar upp storleken igen`, fragas],
      [`ett ja gör planen större (${tr.planRutor} golvrutor) och frågan vilar sedan`, storre && intelIgen],
      [`raden troshus svarar med det som fattas (${behov?.a.plats})`, behovOk],
      [`byggplanen bygger ut huset eller bygger ett till (${ut ? 'utbyggnad' : nyttTro ? 'nytt hus' : 'inget'})`, vaxer],
      [`med planens vägg (${trosBit?.m})`, vaggOk],
      [`bara de troende bygger, ur kyrkans egendom`, troendeBygger],
      [`bänken som fick nej tas upp igen när skalan bytt sida (${fore} → ${sidaBytt})`, !fore && sidaBytt && bankFraga],
      [`ett ja ställer en ny bänk`, bankBrist],
    ];
  },
};

SCENARIER.troshusplan = {
  text: 'Steg 10.3.18: planen för trons hus bestäms del för del i trons krets ur TROSHUS_DELAR (storleken, formen, väggarna när byn kan bygga flera slags, och en fråga per möbel). Skalorna avgör vilket val som läggs fram, ett nej ger ett annat val en annan kväll, och namnet är den första raden i TROSHUSNAMN som passar',
  kor: () => {
    const { s, tr } = medTro(6, 3);
    tr.bud = [{ id: 'prast', t: s.now }]; tr.sk = { ...tr.sk, fest: 10, prast: 80 }; tr.manga = 80; tr.natur = 60;
    const pr = SIM.trosTalare(s, tr)!;
    const basta = () => { const l = SIM.TROS_UPP.find(r => r.id === 'troshus')!.lista(s, tr, pr).filter(f => f.prio > 0 && (tr.nedrostat?.[f.fr.f + ':' + JSON.stringify(f.fr.d)] ?? 0) <= s.now); return l.sort((a, b) => b.prio - a.prio)[0]?.fr.d; };
    const forst = basta();
    // ett nej: samma val vilar, och nästa gång läggs ett annat fram
    (tr.nedrostat ??= {})['troshus:' + JSON.stringify(forst)] = s.now + 3 * SIM.DAY;
    const sedan = basta();
    tr.nedrostat = {};
    // kvällarna tills planen är klar; frågorna om planen kommer i registrets ordning
    const dag0 = s.now - (s.now % SIM.DAY), ordning: string[] = [];
    for (let d = 1; d <= 400 && !SIM.planKlar(s, tr); d++) {
      s.now = dag0 + d * SIM.DAY + 20 * SIM.HOUR;
      SIM.kyrkaKvall(s);
      for (const k of Object.keys(tr.plan ?? {})) if (!ordning.includes(k)) ordning.push(k);
    }
    const iOrdning = ordning.join(',') === 'storlek,form,altare,gudabild,bank';
    const namn = SIM.troshusNamn(s, tr);
    tr.manga = 20; tr.natur = 20; const helgedom = SIM.troshusNamn(s, tr);
    tr.natur = 60; tr.plan = { ...tr.plan, storlek: 'trangt' }; const ve = SIM.troshusNamn(s, tr);
    return [
      [`Fest lägger fram rymligt först (${forst?.v}), och efter ett nej något annat (${sedan?.v})`, forst?.del === 'storlek' && forst.v === 'rymligt' && sedan?.del === 'storlek' && sedan.v !== 'rymligt'],
      [`frågorna kommer i ordning, och väggarna frågas inte när byn bara kan bygga ett slags (${ordning.join(', ')})`, iOrdning],
      [`planen blir klar och sparas på tron (${SIM.planText(s, tr)})`, SIM.planKlar(s, tr) && tr.plan?.form === 'avlang'],
      [`namnet följer skalorna: en enda gud och präster ger ${namn}, naturens andar ${helgedom}, ett trångt hus ${ve}`, namn === 'Kyrka' && helgedom === 'Helgedom' && ve === 'Vé'],
    ];
  },
};
SCENARIER.gravplats = {
  text: 'Steg 10.4.6: gravplatsen efter tron. Raderna i GRAVPLATSER (nära byn, i skogsbrynet, nära sjön, djupt i skogen, långt från byn, vid den heliga platsen) är bud som blir trons sed när den första troende dör, så att också hen hamnar där; avståndet märks bara som gångtid',
  kor: () => {
    const plats = (natur: number, sk: Partial<Record<SIM.SkalaId, number>>) => {
      const a = medTro(6, 2); a.tr.natur = natur; a.tr.sk = { ...a.tr.sk, ...sk };
      const b = begravHela(a.s, a.v[0], a.v[1]), bud = a.tr.bud?.find(x => /^grav(Nara|Bryn|Sjo|Djup|Langt|Helig)$/.test(x.id))?.id;
      // platsen, också när kroppen sänktes eller brändes (då ligger trons gravplats där nästa grav hamnar)
      const k = bud && (Object.keys(SIM.GRAVPLATSER) as SIM.PlatsId[]).find(q => SIM.GRAVPLATSER[q].bud === bud);
      const c = b.g ?? (k ? SIM.gravPlats(a.s, a.tr, [bud!]) : undefined);
      return { a, b, bud, c, ut: c ? SIM.utanforByn(a.s, c.x, c.y) : -1, tid: b.tid };
    };
    const nara = plats(85, { livet: 50 }), bryn = plats(20, { livet: 50 }), djup = plats(10, { oppen: 100, livet: 50 }), langt = plats(50, { forlat: 95, livet: 50 });
    const skog = (() => { const g = djup.c; if (!g) return 0; let n = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (SIM.isForest(djup.a.s, (g.y + dy) * SIM.W + g.x + dx)) n++; return n; })();
    // den heliga platsen går före
    const h = medTro(6, 2); h.tr.natur = 85;
    const k = SIM.heligaKandidater(h.s, h.tr)[0]; SIM.FRAGOR.nyttBud.gor(h.s, { tro: h.tr.id, id: 'helig', v: SIM.heligVarde(k.x, k.y) }, undefined);
    const hp = h.s.heliga?.find(q => q.tro === h.tr.id), bh = begravHela(h.s, h.v[0], h.v[1]);
    // ett andra dödsfall hamnar på samma plats
    const b2 = begravHela(langt.a.s, langt.a.v[0], langt.a.v[2]);
    return [
      [`nära byn för Människa (${nara.bud}, ${nara.ut.toFixed(1)} rutor utanför)`, nara.bud === 'gravNara' && Math.abs(nara.ut - SIM.GRAV.avst) <= 2],
      [`i skogsbrynet för Natur (${bryn.bud}, ${bryn.ut.toFixed(1)} rutor utanför)`, bryn.bud === 'gravBryn' && bryn.ut <= SIM.GRAV.avst + 4],
      [`djupt i skogen för Natur och Sluten (${djup.bud}, ${djup.ut.toFixed(1)} rutor utanför, ${skog} av 25 skog runt graven)`, djup.bud === 'gravDjup' && djup.ut >= 6 && skog >= 12],
      [`långt från byn för Straffande (${langt.bud}, ${langt.ut.toFixed(1)} rutor utanför)`, langt.bud === 'gravLangt' && langt.ut >= 11],
      [`längre bort är längre att bära: gångtiden syns bara i vägen (grävtiden ${Math.round(langt.tid / SIM.MIN)} mot ${Math.round(nara.tid / SIM.MIN)} min)`, langt.tid === nara.tid || !langt.b.g || !nara.b.g],
      [`vid den heliga platsen när tron har en (${h.tr.bud?.find(x => x.id.startsWith('grav'))?.id})`, !!hp && h.tr.bud!.some(x => x.id === 'gravHelig') && !!bh.g && Math.hypot(bh.g.x - hp.x, bh.g.y - hp.y) <= 4],
      [`nästa grav hamnar på samma plats (${b2.g ? Math.round(Math.hypot(b2.g.x - langt.b.g!.x, b2.g.y - langt.b.g!.y)) : '–'} rutor från den första)`, !!b2.g && !!langt.b.g && Math.hypot(b2.g.x - langt.b.g.x, b2.g.y - langt.b.g.y) <= 4],
    ];
  },
};
SCENARIER.utburen = {
  text: 'Steg 10.4.7: registret ODEN. Utan tro får byns egna en grav, brottslingen en ovärdig grav på en egen plats dubbelt så långt ut, och den fallne fienden bärs ut i skogen (minst 8 rutor utanför byns område) och läggs ner där på 2 minuter; kroppen ligger kvar och ruttnar som förut och tas inte upp igen',
  kor: () => {
    const a = medLedare(), s = a.s, p = a.v[0];
    klockan(s, 10);
    // fienden: sakerna först, sedan ut i skogen
    s.kvarlevor = [{ id: 901, k: 'fiende', x: Math.floor(p.x) + 2, y: Math.floor(p.y), t: s.now - SIM.DAY, vem: -1, namn: 'Rövaren Ulf', text: 'Rövaren Ulf', saker: { bar: 2 } }];
    const forst = SIM.begravaVal(s, p);
    SIM.avrustaKlar(s, p, { act: 'avrusta', ref: 901 } as SIM.Task);
    const valt = SIM.begravaVal(s, p);
    const t = { act: 'begrava', phase: 'do', ref: 901, until: s.now, carry: 0, why: '' } as SIM.Task;
    p.task = t; SIM.kroppUpp(s, p, t); const min = Math.round((t.arbTid ?? 0) / SIM.MIN), dit = { x: Math.floor(t.tx!), y: Math.floor(t.ty!) };
    p.x = t.tx!; p.y = t.ty!; SIM.gravKlar(s, p, t); p.task = undefined;
    const k = s.kvarlevor!.find(q => q.id === 901), ut = k ? SIM.utanforByn(s, k.x, k.y) : -1, skog = k ? SIM.isForest(s, k.y * SIM.W + k.x) : false;
    const igen = SIM.begravaVal(s, a.v[1]);
    // den ruttnar bort som förut
    s.now = k!.t + 6 * SIM.DAY + SIM.HOUR; SIM.kvarTimme(s); const borta = !s.kvarlevor?.some(q => q.id === 901);
    // brottslingen: en ovärdig grav dubbelt så långt ut
    const b = medLedare(), d = b.v[1]; d.brottsling = true as never;
    const ov = begravHela(b.s, b.v[0], d), van = begravHela(b.s, b.v[0], b.v[2]);
    const utOv = ov.g ? SIM.utanforByn(b.s, ov.g.x, ov.g.y) : -1, utVan = van.g ? SIM.utanforByn(b.s, van.g.x, van.g.y) : -1;
    return [
      ['sakerna fienden bar tas om hand först', !forst && !!valt],
      [`fienden bärs ut i skogen och läggs ner på ${min} minuter (${ut.toFixed(1)} rutor utanför byn, ${skog ? 'skog' : 'ingen skog'}, ${dit.x},${dit.y})`, min === 2 && !!k?.utburen && ut >= 8 && !s.gravar?.some(g => g.namn === 'Rövaren Ulf')],
      ['kroppen i skogen tas inte upp igen', !igen],
      ['och ruttnar bort efter 6 dygn som förut', borta],
      [`brottslingen får en ovärdig grav dubbelt så långt ut (${utOv.toFixed(1)} mot ${utVan.toFixed(1)} rutor)`, !!ov.g?.ovardig && !ov.r && utOv >= 2 * SIM.GRAV.avst - 2 && utVan <= SIM.GRAV.avst + 2],
    ];
  },
};
SCENARIER.gravbesok = {
  text: 'Steg 10.4.8: besök och gåvor vid graven. Den som minns eller sörjer en död går på fritiden till graven, lusten växer tillbaka på ett dygn, minnet bleknar långsammare efter besöket, gåvan är den minst värda saken hen får ta, en sliten grav lagas när materialet finns, och en grav som vuxit igen helt tas bort; den som sänkts får besöken vid stranden',
  kor: () => {
    const a = medLedare(), s = a.s, d = a.v[1];
    klockan(s, 10); setFood(s, 400); SIM.setAmount(s, 'virke', 4); SIM.setAmount(s, 'rolleka', 5);
    const p = a.v.find(q => q !== d && (q.partner === d.id || SIM.isParent(q, d) || SIM.isParent(d, q))) ?? a.v[0];
    const b = begravHela(s, a.v[0], d), g = b.g!;
    g.vard = 'gravstolpe';
    // en vecka senare: minnet och sorgen finns kvar
    const val = SIM.gravbesokVal(s, p), annan = a.v.find(q => q !== p && q !== d && !(q.intryck ?? []).some(e => e.om === d.id) && !SIM.nara(s, q, d.id));
    const utan = annan ? SIM.gravbesokVal(s, annan) : undefined;
    const t = { act: 'gravbesok', phase: 'do', ref: d.id, until: s.now, carry: 0, why: '' } as SIM.Task;
    SIM.gravbesokKlar(s, p, t);
    const efter = SIM.gravbesokVal(s, p), stod = p.thoughts.some(x => x.text === 'Stod vid graven');
    s.now += SIM.DAY; const igen = SIM.gravbesokVal(s, p);
    // minnet bleknar långsammare efter besöket
    const q = a.v.find(o => o !== p && o !== d)!, e = { om: d.id, namn: d.name, k: 'elak' as SIM.IntryckTyp, v: 1, c: 1, t: s.now };
    p.intryck = [{ ...e }]; q.intryck = [{ ...e }]; SIM.paminn(s, p, d.id);
    SIM.glomRykten(s, 72); const cp = p.intryck?.[0]?.c ?? 0, cq = q.intryck?.[0]?.c ?? 0;
    // gåvan: den minst värda av det hen får ta
    setFood(s, 0); SIM.setAmount(s, 'kott', 3); // röllekan är värd mindre än köttet
    let gavor = 0; for (let i = 0; i < 40 && !gavor; i++) { SIM.gravbesokKlar(s, p, t); gavor = g.gavor ?? 0; }
    const rolleka = SIM.amountOf(s, 'rolleka');
    // en sliten gravstolpe lagas med ett virke
    g.t = s.now - 20 * SIM.DAY; g.lagad = undefined; p.gravBesok = undefined; const skick0 = SIM.gravSkick(s, g);
    const lv = SIM.gravbesokVal(s, p), virke0 = SIM.amountOf(s, 'virke');
    SIM.gravbesokKlar(s, p, { ...t, tool: lv?.laga ? 'laga' : undefined });
    const lagad = SIM.gravSkick(s, g) === 1 && SIM.amountOf(s, 'virke') === virke0 - 1;
    // en grav som vuxit igen helt tas bort
    g.t = s.now - 100 * SIM.DAY; g.lagad = undefined; SIM.gravDygn(s); const borta = !s.gravar?.some(x => x.vem === d.id);
    // den sänkta: besöken vid stranden
    (s.sankta ??= []).push({ vem: d.id, namn: d.name, x: 5, y: 5, t: s.now, sjo: 0 }); p.gravBesok = undefined;
    const sv = SIM.gravbesokVal(s, p);
    return [
      [`den som stod hen nära vill gå till graven (${val?.why}, lust ${val?.w.toFixed(2)})`, !!val && val.w > 0 && Math.abs(val.spot.x - g.x - 0.5) < 1e-6],
      [`den som inte minns hen går inte dit (${annan ? (utan ? 'går' : 'går inte') : 'ingen sådan'})`, !utan],
      ['besöket ger tröst, och lusten växer tillbaka på ett dygn', stod && !efter && !!igen],
      [`minnet bleknar långsammare efter besöket (${cp.toFixed(3)} mot ${cq.toFixed(3)})`, cp > cq],
      [`en gåva läggs ibland: den minst värda saken (${gavor} gåva, röllekan ${rolleka} av 5, köttet ${SIM.amountOf(s, 'kott')} av 3)`, gavor === 1 && rolleka === 4 && SIM.amountOf(s, 'kott') === 3],
      [`en sliten grav lagas med material (skick ${skick0.toFixed(2)} → ${lagad ? '1' : 'olagad'}, ${lv?.min} min)`, skick0 < 0.5 && !!lv?.laga && lv.min === 5 && lagad],
      ['en grav som vuxit igen helt tas bort', borta],
      [`den sänkta får besöken vid stranden (${sv?.why})`, !!sv && sv.spot.x === 5.5],
    ];
  },
};

SCENARIER.minnesed = {
  text: 'Steg 10.4.9: legender drar sederna. Minnet av en död drar sederna hos den som minns hen, åt det håll INTRYCK:s sedkolumn pekar och starkare ju starkare minnet är (hjälpsam mot Sammanhållning, våldsam bort från Fejd), minnen av levande drar inte, alla minnen tillsammans drar högst 0,5 per sed, fliken Seder visar "Minnet av" den döda, och den som kommer på en teknik ses som påhittig',
  kor: () => {
    const a = medLedare(), s = a.s, alla = SIM.living(s), p = a.v[1], lev = a.v[2], [d, ond] = alla.filter(q => q !== p && q !== lev && q !== a.l);
    s.styre!.oppna.push('fejd', 'krig');
    const e = (om: Person, k: SIM.IntryckTyp, v = 1) => ({ om: om.id, namn: om.name, k, v, c: 1, t: s.now });
    p.intryck = [e(d, 'hjalpsam'), e(lev, 'hjalpsam'), e(ond, 'valdsam')];
    const fore = SIM.drar(s, p);
    d.died = s.now; ond.died = s.now;
    const efter = SIM.drar(s, p), steg = SIM.SED.minneSteg;
    const gem = efter.gemenskap - fore.gemenskap, fejd = efter.fejd - fore.fejd;
    // ett svagare minne drar mindre
    p.intryck = [e(d, 'hjalpsam', 0.5), e(ond, 'valdsam')];
    const svag = SIM.drar(s, p).gemenskap - fore.gemenskap;
    // många minnen drar tillsammans högst minneMax
    const borta = [9001, 9002, 9003].map(id => ({ id, name: 'Borta' + id }) as Person); // de som inte finns kvar i byn räknas som döda
    p.intryck = [d, ond, ...borta].map(q => e(q, 'hjalpsam'));
    const tak = SIM.drar(s, p).gemenskap - fore.gemenskap;
    // fliken Seder: raden Minnet av …
    p.intryck = [e(d, 'hjalpsam')];
    const rad = SIM.sedDrag(s).find(r => r.om?.id === d.id);
    utanWebblasare(); setByn(s); const syns = sederFlik.html().includes(`Minnet av ${d.name}`);
    // den som kommer på en teknik ses som påhittig av dem som ser det
    const tek = TEKNIK.find(t => SIM.canThink(lev, t))!, vittne = p;
    vittne.x = lev.x + 1; vittne.y = lev.y; vittne.task = undefined;
    SIM.learn(s, lev, tek);
    const pah = SIM.intryckOm(vittne, lev.id, 'pahittig');
    return [
      [`minnet av den hjälpsamma döda drar mot Sammanhållning 2 (${gem.toFixed(3)} mot ${2 * steg})`, Math.abs(gem - 2 * steg) < 1e-9],
      [`minnet av den våldsamma drar bort från Fejd (${fejd.toFixed(3)})`, Math.abs(fejd + steg) < 1e-9],
      [`ett svagare minne drar mindre (${svag.toFixed(3)} mot ${gem.toFixed(3)})`, svag > 0 && svag < gem],
      [`många minnen drar tillsammans högst ${SIM.SED.minneMax} (${tak.toFixed(3)} av ${10 * steg} med 5 döda)`, Math.abs(tak - SIM.SED.minneMax) < 1e-9],
      [`fliken Seder visar minnet av ${d.name} (${rad ? 'en rad' : 'ingen rad'}, ${syns ? 'syns' : 'syns inte'})`, !!rad && rad.d.gemenskap > 0 && syns],
      [`den som kommer på ${tek?.namn.toLowerCase()} ses som påhittig (${pah ? pah.v.toFixed(2) : 'nej'})`, !!pah && pah.v > 0],
    ];
  },
};

SCENARIER.tystnad = {
  text: 'Steg 10.4.10: påbudet om tystnad. Ledaren lägger fram det mot den hen tycker sämst om bland dem byn talar mest om, levande eller död, byn röstar som om andra påbud, och när det gäller berättas minnen om personen mer sällan, mindre sällan ju mer man tyckte om hen, men inte aldrig; fliken Styre visar vem det gäller',
  kor: () => {
    const a = medLedare(), s = a.s, l = a.l, alla = SIM.living(s), [x, y] = alla.filter(q => q !== l);
    l.pot.empati = 3;
    // byn talar om x (våldsam) och om y (hjälpsam); ledaren tycker illa om x
    for (const q of alla) if (q !== x && q !== y) q.intryck = [{ om: x.id, namn: x.name, k: 'valdsam', v: 1, c: 1, t: s.now }, { om: y.id, namn: y.name, k: 'hjalpsam', v: 1, c: 1, t: s.now }];
    SIM.getRel(s, l, x).op = -60; SIM.getRel(s, l, y).op = 40;
    const vem = SIM.PABUD.tystnad.vem!(s, l), asikt = SIM.PABUD.tystnad.asikt(s, l, x.id);
    // förslaget och omröstningen
    const forslag = SIM.TAS_UPP.find(r => r.id === 'pabud')!.lista(s, l).find(f => f.fr.d.k === 'tystnad');
    const gick = forslag ? SIM.rostaOm(s, forslag.fr) : false;
    const st = s.styre!, pv = SIM.pabud(s, 'tystnad');
    // den som ogillar x berättar mer sällan, den som gillade hen nästan som förut, men ingen aldrig
    const ovan = alla.find(q => q !== l && q !== x && q !== y)!, van = y;
    SIM.getRel(s, van, x).op = 100;
    const fOvan = SIM.tystFaktor(s, ovan, x.id), fVan = SIM.tystFaktor(s, van, x.id), fY = SIM.tystFaktor(s, ovan, y.id);
    // också om en död
    x.died = s.now; const fDod = SIM.tystFaktor(s, ovan, x.id); x.died = undefined;
    utanWebblasare(); setByn(s); ui.styreDel = 'pabud';
    const html = styreFlik.html(), visas = html.includes(`${x.name} nämns`);
    return [
      [`ledaren vill tysta den hen tycker sämst om bland dem byn talar mest om (${SIM.byId(s, vem!)?.name ?? 'ingen'}, åsikten ${asikt.toFixed(2)})`, vem === x.id && asikt > 0],
      [`ledaren lägger fram påbudet och byn röstar (${forslag ? forslag.varfor : 'inget förslag'}; ${gick ? 'gick igenom' : 'röstades ned'})`, !!forslag && forslag.fr.d.om === x.id && gick && st.tystnad?.id === x.id && pv > 0],
      [`minnen om ${x.name} berättas mer sällan (${fOvan.toFixed(2)}), mindre sällan av den som tyckte om hen (${fVan.toFixed(2)}), men aldrig inte alls; andra som förut (${fY})`, fOvan < 1 && fOvan > 0 && fVan === 1 && fY === 1],
      [`påbudet gäller också när ${x.name} är död (${fDod.toFixed(2)})`, Math.abs(fDod - fOvan) < 0.2 && fDod < 1],
      [`fliken Styre visar vem påbudet gäller (${visas ? 'ja' : 'nej'})`, visas],
    ];
  },
};

SCENARIER.overdrift = {
  text: 'Steg 10.4.11: överdriften i framträdandena. Ett kväde, en sång eller en teater om en person ändrar gärningen mer än ett samtal (formens tal), större när den som uppträder beundrar personen och mindre när hen ogillar hen; versionen räknas en gång så att alla som lyssnar får samma, den som bara hört en större version dras halva vägen ner, den som såg det själv ertappar en överdrift men inte en nedtoning, och redogörelsen säger om gärningen gjordes större eller tonades ned',
  kor: () => {
    const a = kvall(), s = a.s, p = a.v[0]!, x = SIM.living(s).find(q => !a.v.includes(q)) ?? a.v[a.v.length - 1]!;
    const e = { om: x.id, namn: x.name, k: 'hjalpsam' as SIM.IntryckTyp, v: 0.4, c: 1, t: s.now };
    const medel = (op: number, g: number) => { SIM.getRel(s, p, x).op = op; let m = 0; for (let i = 0; i < 400; i++) m += SIM.scenVersion(s, p, e, g); return m / 400 - e.v; };
    const samtal = medel(80, 1), kvade = medel(80, SIM.FRAM_AV.kvade!.vrid ?? 1), teater = medel(80, SIM.FRAM_AV.teater!.vrid ?? 1), ogillar = medel(-80, 2);
    // alla som lyssnar får samma version; den som hört mer dras halva vägen ner; den som såg det ertappar bara en överdrift
    const [b1, b2, b3] = SIM.living(s).filter(q => q !== p && q !== x), b4 = b1;
    SIM.getRel(s, p, x).op = 0;
    for (const b of [b1, b2, b3]) b.intryck = [];
    b3.intryck = [{ ...e, v: 1, led: 2, src: b2.id }];
    SIM.beratta(s, p, b1, e, SIM.getRel(s, p, b1), 0.8); SIM.beratta(s, p, b2, e, SIM.getRel(s, p, b2), 0.8);
    const lika = SIM.intryckOm(b1, x.id, 'hjalpsam')?.v === SIM.intryckOm(b2, x.id, 'hjalpsam')?.v;
    SIM.beratta(s, p, b3, e, SIM.getRel(s, p, b3), 0.4);
    const ner = SIM.intryckOm(b3, x.id, 'hjalpsam')?.v ?? 0, nerVantat = 1 - (1 - 0.4 * (x.died === undefined ? 1 : SIM.RYKTE.dodBer)) * SIM.RYKTE.scenNed;
    b4.intryck = [{ ...e, v: 0.4 }];
    SIM.beratta(s, p, b4, b4.intryck[0], SIM.getRel(s, p, b4), 0.1); const tonadIngenLogn = !SIM.intryckOm(b4, p.id, 'logn');
    SIM.beratta(s, p, b4, { ...e }, SIM.getRel(s, p, b4), 1.5); const ertappad = !!SIM.intryckOm(b4, p.id, 'logn');
    // ett helt kväde om personen: redogörelsen säger om gärningen gjordes större eller tonades ned
    let vrid = 0, text = '';
    for (let i = 0; i < 20 && !vrid; i++) {
      const k = kvall(3 + i), u = k.v[0]!, y = SIM.living(k.s).find(q => !k.v.includes(q)) ?? k.v[k.v.length - 1]!;
      if (y.task?.act === 'samtal') y.task = undefined;
      u.intryck = [{ om: y.id, namn: y.name, k: 'hjalpsam', v: 0.5, c: 1, t: k.s.now }]; SIM.getRel(k.s, u, y).op = 100;
      if (!upptrad(k.s, u) || k.s.fram!.bud !== 'person') continue;
      kor(k.s, 1.5);
      const m = k.s.framtradanden?.[k.s.framtradanden.length - 1];
      vrid = m?.vrid ?? 0; text = vrid ? (vrid > 0 ? 'större' : 'nedtonad') : '';
    }
    return [
      [`ett kväde ändrar gärningen mer än ett samtal, en teater ännu mer (${samtal.toFixed(3)}, ${kvade.toFixed(3)}, ${teater.toFixed(3)})`, kvade > samtal * 1.6 && teater > kvade],
      [`den som ogillar personen tonar ned gärningen (${ogillar.toFixed(3)})`, ogillar < 0],
      [`alla som lyssnar får samma version (${lika ? 'ja' : 'nej'})`, lika],
      [`den som bara hört en större version dras halva vägen ner (${ner.toFixed(2)}, väntat ${nerVantat.toFixed(2)})`, Math.abs(ner - nerVantat) < 1e-9],
      [`den som såg det ertappar en överdrift men inte en nedtoning (${tonadIngenLogn ? 'ingen' : 'en'} lögnare vid nedtoningen, ${ertappad ? 'ertappad' : 'inte ertappad'} vid överdriften)`, tonadIngenLogn && ertappad],
      [`redogörelsen för kvädet säger om gärningen gjordes större (${text || 'inget'})`, vrid === 1],
    ];
  },
};
SCENARIER.gravol = {
  text: 'Steg 10.4.12: vaka, sorgkväde och gravöl, tre bud som läggs till begravningen. Vid vakan sitter de nära hos kroppen från kl. 20 kvällen efter dödsfallet, och den som följer budet bär inte kroppen före vakan; den troende som gör det ändå bryter budet. Vid sorgkvädet sprider trons skald sitt minne av den döda till alla i samlingen, och gravölet är en fest för byns vuxna med mat och öl ur kyrkans egendom, som inte hålls när det inte räcker',
  kor: () => {
    const a = medTro(6, 4), s = a.s, tr = a.tr, kid = SIM.kyrkaId(tr.id);
    tr.bud = (['prast', 'vanligBegr', 'vaka', 'sorgkvade', 'gravol'] as const).map(id => ({ id, t: s.now }));
    const vux = a.v.filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), d = vux[1], skald = vux[2], barare = vux[0], van = vux[3];
    for (const p of a.v) p.skill.skaldskap = 0;
    skald.skill.skaldskap = 12; SIM.getRel(s, van, d).op = 60;
    SIM.handelse(s, d, 'bjorndodare', undefined, undefined, skald, 2);
    klockan(s, 10); SIM.die(s, d, 'alderdom');
    const kr = s.kvarlevor!.find(k => k.k === 'kropp' && k.vem === d.id)!;
    const vk = s.ritualKo?.find(r => r.k === 'vaka'), kl = vk?.fran !== undefined ? new Date(vk.fran).getHours() : -1;
    // den som följer budet väntar med graven
    s.now += 3 * SIM.HOUR; kr.naraT = kr.annanT = s.now - 1;
    const fore = SIM.begravaVal(s, barare);
    // den troende som inte följer budet (svag tro) bär hen ändå och bryter budet
    const svag = vux[4] ?? nyInvanare(s, 'm', 30); svag.tro = tr.id; svag.troStyrka = 0;
    const svagV = SIM.begravaVal(s, svag), b0 = s.stat?.bud_brutet ?? 0;
    const tk0 = { act: 'begrava', phase: 'do', tx: kr.x, ty: kr.y, until: s.now, carry: 0, ref: kr.id, why: '' } as SIM.Task;
    svag.task = tk0; SIM.kroppUpp(s, svag, tk0); const brot = (s.stat?.bud_brutet ?? 0) > b0;
    kr.bars = undefined; kr.ode = undefined; svag.task = undefined;
    // vakan kl. 20: de nära samlas hos kroppen
    klockan(s, 20); s.ritual = undefined; SIM.ritualTimme(s);
    const vr = s.ritual as SIM.Ritual | undefined, vem = vr ? SIM.RITUALER.vaka.vem(s, vr) : [];
    for (const p of vem) p.task = { act: 'ritual', phase: 'do', until: s.now + 9 * SIM.HOUR, carry: 0, why: '' } as SIM.Task;
    s.now = (vr?.slut ?? s.now); SIM.ritualTimme(s);
    const vakat = vem.some(p => p.thoughts.some(t => t.text === `Vakan för ${d.name}`));
    for (const p of a.v) p.task = undefined;
    const efter = SIM.begravaVal(s, barare);
    // begravningen: samlingen och gravölet i kön
    const tk = { act: 'begrava', phase: 'do', tx: kr.x, ty: kr.y, until: s.now, carry: 0, ref: kr.id, why: '' } as SIM.Task;
    barare.task = tk; SIM.kroppUpp(s, barare, tk); barare.x = tk.tx!; barare.y = tk.ty!; s.ritualKo = []; SIM.gravKlar(s, barare, tk); barare.task = undefined;
    const ko = (s.ritualKo ?? []).map(r => r.k).join(', ');
    // sorgkvädet: skaldens minne till alla i samlingen
    const lyss = vux.filter(p => p !== skald && p !== d && p.died === undefined), visste = lyss.filter(p => p.intryck?.some(e => e.om === d.id)).length;
    s.ritual = undefined; SIM.ritualTimme(s); const br = s.ritual as SIM.Ritual | undefined, inte0 = s.stat?.ritual_inte_gravol ?? 0;
    for (const p of [skald, ...lyss]) p.task = { act: 'ritual', phase: 'do', until: s.now + 9 * SIM.HOUR, carry: 0, why: '' } as SIM.Task;
    s.now = br?.slut ?? s.now; SIM.ritualTimme(s); // gravölet står näst i kön och börjar direkt, men kyrkan har ingen mat eller öl
    const utan = !s.ritual && (s.stat?.ritual_inte_gravol ?? 0) === inte0 + 1;
    const hordes = lyss.filter(p => p.intryck?.some(e => e.om === d.id)).length;
    for (const p of a.v) p.task = undefined;
    // med mat och öl: en hel mat per två och en öl var
    const n = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen).length;
    satKyrka(s, tr, { bar: n });
    const krukor = [0, 1].map(() => { const k = SIM.addTool(s, 'lerkruka_stor', barare); k.hos = undefined; SIM.fyllVatska(s, 'ol', 10, k); k.agare = kid; return k; });
    const olNu = () => krukor.reduce((x, k) => x + (k.inne?.n ?? 0), 0);
    SIM.nyRitual(s, 'gravol', { tro: tr.id, om: [d.id], namn: `Gravölet efter ${d.name}` }); SIM.ritualTimme(s);
    const gr = s.ritual as SIM.Ritual | undefined, med = gr ? SIM.RITUALER.gravol.vem(s) : [];
    for (const p of SIM.living(s)) p.task = undefined;
    for (const p of med) p.task = { act: 'ritual', phase: 'do', until: s.now + 9 * SIM.HOUR, carry: 0, why: '' } as SIM.Task;
    const bar0 = SIM.kyrkansAv(s, tr, 'bar'), ol0 = olNu();
    s.now = gr?.slut ?? s.now; SIM.ritualTimme(s);
    const at = bar0 - SIM.kyrkansAv(s, tr, 'bar'), drack = ol0 - olNu();
    return [
      [`vakan väntar i kön till kl. 20 (${kl})`, kl === 20 && kr.vaka === vk?.fran],
      ['den som följer budet bär inte kroppen före vakan', !fore],
      [`den troende som bär hen ändå bryter budet (${svagV ? 'bär' : 'bär inte'})`, !!svagV && brot],
      [`de nära sitter hos kroppen (${vem.map(p => p.name).join(', ')}, ${vr?.x},${vr?.y})`, !!vr && vr.k === 'vaka' && vem.includes(van) && vr.x === kr.x && vr.y === kr.y && vakat],
      ['efter vakan bärs hen till graven', !!efter],
      [`samlingen och gravölet står i kön (${ko})`, ko === 'begravning, gravol'],
      [`sorgkvädet sprider skaldens minne till samlingen (${visste} → ${hordes} av ${lyss.length})`, hordes === lyss.length && hordes > visste && (s.stat?.sorgkvade ?? 0) === 1],
      ['gravölet hålls inte utan kyrkans mat och öl', utan],
      [`gravölet: byns vuxna vid elden, en mat per två och en öl var (${med.length} vuxna, ${at} mat, ${drack} öl)`, gr?.k === 'gravol' && med.length === n && at === Math.ceil(n / 2) && drack === n],
    ];
  },
};
SCENARIER.skandning = {
  text: 'Steg 10.4.13: vem som får en grav och vem som skändas. Buden Bara byns egna och Bara den med gott namn bär främlingen och den illa ansedda ut i skogen, och budet De ovärdiga skändas ger brottslingen, den ökända och fienden trons skändning, vald efter skalorna (åt djuren, bål utan rit, vattnet eller vid stigen). Den som tar hand om kroppen följer sin egen tros bud; den som stod den döda nära räknar det en storlek större och bryter det oftare. En skändad kropp är värre att se, och en gäst som ser den gör sin klan ovänligare',
  kor: () => {
    const a = medTro(6, 4), s = a.s, tr = a.tr;
    tr.natur = 40; tr.sk = { ...tr.sk, krig: 80, oppen: 80 };
    const sk: SIM.AntagetBud = { id: 'skanda', t: s.now }; SIM.BUD.skanda.antas!(s, tr, sk);
    tr.bud = [{ id: 'prast', t: s.now }, sk, { id: 'egnaGrav', t: s.now }, { id: 'gottNamn', t: s.now }];
    // en annan tro, Natur: åt djuren
    const tr2 = { ...tr, id: 2, natur: 10, sk: { ...tr.sk, krig: 20, oppen: 30 } }, sk2: SIM.AntagetBud = { id: 'skanda', t: s.now }; SIM.BUD.skanda.antas!(s, tr2, sk2);
    const vux = a.v.filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), p = vux[0], w = vux[2], q2 = vux[3];
    const utan = nyInvanare(s, 'm', 30); utan.tro = undefined;
    const begrav = (vem: Person, k: SIM.Kvarleva) => { const tk = { act: 'begrava', phase: 'do', tx: k.x, ty: k.y, until: s.now, carry: 0, ref: k.id, why: '' } as SIM.Task; vem.task = tk; SIM.kroppUpp(s, vem, tk); return tk; };
    // brottslingen skändas vid stigen; den som ser det och gästen som ser det
    const d1 = vux[1]; d1.brottsling = true; SIM.die(s, d1, 'alderdom');
    const k1 = s.kvarlevor!.find(k => k.vem === d1.id)!; k1.naraT = k1.annanT = s.now - 1;
    const tk1 = begrav(p, k1), dit = { x: Math.floor(tk1.tx!), y: Math.floor(tk1.ty!) }, ut = SIM.utanforByn(s, dit.x, dit.y);
    const klan = SIM.nyKlan(s, 20, 10), g = SIM.nyGast(s, { id: SIM.nyttGastId(s), namn: 'Gäst', sex: 'm', fodd: s.now - 30 * SIM.DAY, rad: { sort: 'handlare', klan: klan.id }, x: dit.x + 1.5, y: dit.y + 0.5, nyckel: 4243 }); s.people.push(g);
    w.x = dit.x + 0.5; w.y = dit.y + 1.5; p.x = tk1.tx!; p.y = tk1.ty!; const inst0 = klan.inst;
    SIM.gravKlar(s, p, tk1); p.task = undefined;
    const kvar = s.kvarlevor!.find(k => k.vem === d1.id), sag = !!w.sedSkand?.includes(k1.id) && w.thoughts.some(t => /skänd/.test(t.text));
    const inst1 = klan.inst; SIM.sagSkandad(s, g, kvar!); const inst2 = klan.inst;
    // den som går förbi ser den
    q2.x = dit.x + 0.5; q2.y = dit.y - 1.5; SIM.kvarTimme(s); const forbi = q2.thoughts.find(t => /skänd/.test(t.text));
    // den som följer budet tar inte upp den, den utan tro ger hen en grav
    const foljaren = SIM.begravaVal(s, p), utanVal = SIM.begravaVal(s, utan);
    // fienden: bål utan rit i en tro som drar mot Människa
    tr.natur = 80; tr.sk = { ...tr.sk, krig: 60, oppen: 60 }; const sk3: SIM.AntagetBud = { id: 'skanda', t: s.now }; SIM.BUD.skanda.antas!(s, tr, sk3); sk.v = sk3.v;
    SIM.setAmount(s, 'ved', 10); const ved0 = SIM.amountOf(s, 'ved');
    s.kvarlevor!.push({ id: 991, k: 'fiende', x: Math.floor(p.x) + 2, y: Math.floor(p.y), t: s.now, vem: -1, namn: 'Rövaren Ulf', text: 'Rövaren Ulf' });
    const tk3 = begrav(p, s.kvarlevor!.find(k => k.id === 991)!); p.x = tk3.tx!; p.y = tk3.ty!; SIM.gravKlar(s, p, tk3); p.task = undefined;
    const bal = !s.kvarlevor!.some(k => k.id === 991) && ved0 - SIM.amountOf(s, 'ved') === 4 && !s.gravar?.some(x => x.namn === 'Rövaren Ulf');
    // främlingen: bara byns egna får en grav
    const g2 = SIM.nyGast(s, { id: SIM.nyttGastId(s), namn: 'Främling', sex: 'k', fodd: s.now - 30 * SIM.DAY, rad: { sort: 'handlare', klan: klan.id }, x: p.x, y: p.y, nyckel: 4244 }); s.people.push(g2);
    SIM.gastDor(s, g2, 'av kyla'); const kg = s.kvarlevor!.find(k => k.vem === g2.id);
    const gastF = kg && SIM.odeFor(s, p, kg), gastU = kg && SIM.odeFor(s, utan, kg);
    // den illa ansedda: bara den med gott namn får en grav; partnern räknar budet en storlek större
    tr.bud = tr.bud.filter(b => b.id !== 'skanda'); // utan budet om de ovärdiga: den illa ansedda är ingen skändning
    const e = vux[4], f = vux[5];
    if (f.partner !== undefined) { const o = SIM.byId(s, f.partner); if (o) o.partner = undefined; f.partner = undefined; }
    if (e.partner !== undefined) { const o = SIM.byId(s, e.partner); if (o) o.partner = undefined; e.partner = undefined; }
    SIM.pair(s, f, e, true); f.troStyrka = 60;
    for (const q of SIM.living(s)) if (q !== e) (q.intryck ??= []).push({ om: e.id, namn: e.name, k: 'elak', v: 1, c: 1, t: s.now });
    const an = SIM.ryktbarhet(s, e.id).a; SIM.die(s, e, 'alderdom'); const ke = s.kvarlevor!.find(k => k.vem === e.id)!;
    const illaF = SIM.odeVal(s, p, ke), illaP = SIM.odeVal(s, f, ke);
    return [
      [`skändningen väljs efter skalorna när budet antas (${sk2.v}, ${SIM.ODEN[sk.v as SIM.OdeId]?.namn ?? sk.v})`, sk2.v === 'djuren' && sk3.v === 'balRit'],
      [`brottslingen skändas vid stigen, strax utanför byns område (${ut.toFixed(1)} rutor ut)`, !!kvar && kvar.k === 'skandad' && ut >= 1 && ut < 3 && !s.gravar?.some(x => x.vem === d1.id)],
      ['den som ser skändningen minns den', sag],
      [`gästen som ser den gör sin klan ovänligare, en gång per kropp (${inst0} → ${inst1} → ${inst2})`, inst1 === inst0 - 5 && inst2 === inst1],
      [`den som går förbi mår sämre än av en död (${forbi?.v})`, !!forbi && (forbi.v ?? 0) <= -0.2 + 1e-9],
      [`den som följer budet tar inte upp den skändade, den utan tro ger hen en grav (${foljaren ? 'tar' : 'tar inte'}, ${utanVal ? 'tar' : 'tar inte'})`, !foljaren && !!utanVal],
      ['fienden: bål utan rit tar fyra ved och inget blir kvar', bal],
      [`främlingen bärs ut av den som följer budet och begravs av den utan tro (${kg?.k}, ${gastF}, ${gastU})`, kg?.k === 'framling' && gastF === 'skogen' && gastU === 'grav'],
      [`den illa ansedda (${an.toFixed(1)}) bärs ut av den som följer budet, och partnern begraver hen och bryter budet (${illaF.ode}, ${illaP.ode}/${illaP.brot})`, an < 0 && illaF.ode === 'skogen' && illaP.ode === 'grav' && illaP.brot === 'gottNamn'],
    ];
  },
};

SCENARIER.kanda = {
  text: 'Steg 10.6.14: kända och ökända. Byns samlade minne av en person väger in när någon väljer vem hen pratar, kväder, avbildar, ristar eller skriver om. När en högtid eller en ledd bön slutar berättar prästen för alla som är med om en död hen minns, och om de ökända bara när trons bud tillåter det. En sak gjord i sorg får inskriptionen "Till minne av" och den dödas namn',
  kor: () => {
    const { s, v, tr } = medTro(6, 2);
    const ny = (om: number, namn: string, k: SIM.IntryckTyp): SIM.Intryck => ({ om, namn, k, v: 1, c: 1, t: s.now });
    // två döda som berättaren minns lika starkt: den ena minns hela byn (ökänd), den andra bara berättaren
    const a = v[1], b = v[2];
    for (const p of v) p.intryck = [];
    a.intryck = [ny(9001, 'Ulv', 'valdsam'), ny(9002, 'Grim', 'valdsam')];
    for (const p of v.slice(3)) p.intryck = [ny(9001, 'Ulv', 'valdsam')];
    SIM.kandaRakna(s);
    const vUlv = SIM.kandVikt(s, 9001), vGrim = SIM.kandVikt(s, 9002);
    const ggr: Record<number, number> = {};
    let n = 0;
    for (let i = 0; i < 3000; i++) {
      b.intryck = [];
      SIM.skvaller(s, a, b, SIM.getRel(s, a, b), true);
      const e = b.intryck?.[0]; if (e) { ggr[e.om] = (ggr[e.om] ?? 0) + 1; n++; }
    }
    const andel = n ? (ggr[9001] ?? 0) / n : 0;
    // prästen efter en ledd bön: alla som är med och saknade intrycket får det
    SIM.kultTimme(s);
    const pr = SIM.prastOf(s, tr)!;
    const med = v.filter(p => p !== pr).slice(0, 3);
    const bon = (intryck: SIM.Intryck[]) => {
      pr.intryck = intryck;
      for (const q of med) q.intryck = [];
      for (const q of [pr, ...med]) q.task = { act: 'ritual', phase: 'do', tx: q.x, ty: q.y, until: s.now + SIM.HOUR, carry: 0, why: '' } as SIM.Task;
      s.ritual = { k: 'leddBon', tro: tr.id, start: s.now - SIM.HOUR, slut: s.now, x: pr.x, y: pr.y }; SIM.ritualTimme(s);
      return med.filter(q => SIM.intryckOm(q, intryck[0].om)).length;
    };
    const gott = bon([ny(9003, 'Sigrun', 'hjalpsam')]);
    const varnar = bon([ny(9004, 'Ulv', 'valdsam')]);
    tr.bud = [...(tr.bud ?? []), { id: 'deDoda', t: s.now }];
    const tiger = bon([ny(9004, 'Ulv', 'valdsam')]);
    // en sak gjord i sorg
    const g = v[3], d = nyInvanare(s, g.sex === 'm' ? 'k' : 'm', 30);
    g.partner = d.id; d.partner = g.id;
    SIM.die(s, d, 'forkylning');
    const t = { id: 777, k: 'yxa', q: 4 } as { id: number; k: string; q?: number; ber?: SIM.SakMinne };
    SIM.sakMinne(s, g, t);
    const text = SIM.sakBerattelse(s, t, 'yxa');
    return [
      [`byns minne väger in (Ulv ${vUlv.toFixed(2)}, Grim ${vGrim.toFixed(2)})`, vUlv > vGrim && vGrim > 1],
      [`en ökänd död väljs oftare i skvallret än en som bara berättaren minns lika starkt (Ulv ${ggr[9001] ?? 0}, Grim ${ggr[9002] ?? 0} av ${n}; den mest omtalade tar ${Math.round(andel * 100)} % av ämnena)`, (ggr[9001] ?? 0) > (ggr[9002] ?? 0)],
      [`efter en ledd bön med präst har de som var med fått prästens minne av en död (${gott} av ${med.length})`, gott === med.length],
      [`utan budet varnar prästen för de ökända (${varnar} av ${med.length})`, varnar === med.length],
      [`med budet att inte tala illa om de döda varnar prästen inte (${tiger})`, tiger === 0],
      [`en sak gjord i sorg bär texten "Till minne av ${d.name}" (${text})`, text.includes('Till minne av ' + d.name)],
    ];
  },
};

SCENARIER.minnesdetaljer = {
  text: 'Steg 10.6.15: minnets detaljer. Hur många händelser man minns om en död följer hur starkt minnet är, minst 1 och högst 3 per sak hen var känd för, och när minnet bleknar faller de en i taget, den minst viktiga först. En påminnelse (graven, runstenen, boken, kvädet) gör minnet säkrare och kan lägga tillbaka en händelse som den själv bär, och en klenod i byn gör att minnet bleknar långsammare',
  kor: () => {
    const { s, v, tr } = medTro(6, 2);
    const b = (h: string, t: number) => ({ h, t: s.now - t * SIM.HOUR, sett: true }) as SIM.Bevis;
    const ny = (om: number, vv: number, bev: SIM.Bevis[]): SIM.Intryck => ({ om, namn: 'Ulv', k: 'valdsam', v: vv, c: 1, t: s.now, bev });
    for (const p of v) p.intryck = [];
    const w = v[1];
    const stark = ny(9001, 1.5, [b('sla', 4), b('drap', 3), b('misshandel', 2), b('sla', 1)]), svag = ny(9002, 0.3, [b('sla', 4), b('misshandel', 2)]);
    w.intryck = [stark, svag];
    SIM.glomRykten(s, 0.01);
    const n0 = [stark.bev!.length, svag.bev!.length];
    // med tiden: en i taget, den minst viktiga först
    const vikt = (x: SIM.Bevis) => SIM.HANDELSER[x.h].vikt;
    let enITaget = true, minstForst = true; const foll: string[] = [];
    for (let i = 0; i < 400 && w.intryck?.includes(stark); i++) {
      const fore = stark.bev!.slice();
      SIM.glomRykten(s, 24);
      const kvar = stark.bev!;
      if (kvar.length === fore.length) continue;
      if (fore.length - kvar.length !== 1) enITaget = false;
      const borta = fore.filter(x => !kvar.includes(x));
      for (const x of borta) { foll.push(x.h); if (kvar.some(y => vikt(y) < vikt(x))) minstForst = false; }
    }
    // kvädet ger tillbaka en händelse som skalden minns
    for (const p of v) p.intryck = [];
    const skald = v[2];
    tr.bud = [...(tr.bud ?? []), { id: 'sorgkvade', t: s.now }];
    skald.skill[SIM.FRAM_SKILL] = 20;
    const egen = ny(9003, 1, [b('sla', 4), b('misshandel', 2)]);
    w.intryck = [egen]; skald.intryck = [ny(9003, 1, [b('drap', 3)])];
    SIM.sorgkvade(s, tr, 9003, [skald, w]);
    const tillbaka = egen.bev!.some(x => x.h === 'drap');
    // en klenod i byn: minnet av göraren bleknar långsammare
    const d = nyInvanare(s, 'm', 40); SIM.die(s, d, 'forkylning');
    const blekna = (klenod: boolean) => {
      s.ting = (s.ting ?? []).filter(t => t.av !== d.id);
      if (klenod) { const t = SIM.addTool(s, 'yxa', v[3]); t.q = 5; t.av = d.id; }
      const e = ny(d.id, 1, [b('sla', 4)]); w.intryck = [e]; w.paminnd = undefined;
      SIM.glomRykten(s, 24 * 5);
      return e.c;
    };
    const med = blekna(true), utan = blekna(false);
    return [
      [`ett starkt minne behåller 3 händelser och ett svagt 1 (${n0.join(' och ')})`, n0[0] === 3 && n0[1] === 1],
      [`med tiden faller händelserna en i taget, den minst viktiga först (${foll.join(', ')})`, enITaget && minstForst && foll.length >= 2],
      [`ett kväde ger tillbaka en händelse som skalden minns (${egen.bev!.map(x => x.h).join(', ')})`, tillbaka],
      [`med en klenod i byn bleknar minnet långsammare (${med.toFixed(2)} mot ${utan.toFixed(2)} efter fem dygn)`, med > utan],
    ];
  },
};

SCENARIER.vinterpals = {
  text: 'Vit vinterpäls (steg 10.7.22): en hare som slaktas under istiden ger ett vitt harskinn i stället för ett vanligt. Det syr kläder som är lite varmare, så kylan väljer det. I snön syns den som har vit rock och mössa mindre för bytet på jakten och för vargarna; på bar mark ingen skillnad',
  kor: () => {
    const slakta = (istid: boolean) => {
      const s = createState(1, START); klockan(s, 10);
      for (let t = s.now; t < s.now + 400 * SIM.DAY; t += SIM.HOUR) if (SIM.iIstiden(SIM.ageIndex(s, t)) === istid) { s.now = t; break; }
      const p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
      SIM.setAmount(s, 'vilt', 2); SIM.setAmount(s, 'kniv', 1); SIM.setAmount(s, 'skinn', 0); (p.tek ??= {}).kniv = 1;
      s.stationer = [...(s.stationer ?? []), { id: 991, k: 'slaktbank', x: 3, y: 3, kvar: 0 } as SIM.Station];
      SIM.bearbeta(s, p, SIM.DJUR.kanin, 1);
      return { s, p, vit: SIM.amountOf(s, 'vitskinn'), brun: SIM.amountOf(s, 'skinn') };
    };
    const vinter = slakta(true), sommar = slakta(false);
    // plaggen av vitt harskinn: varmare än av harskinn, och kylan väljer det
    const rv = SIM.SAKER.rock_vitskinn?.klad, rk = SIM.SAKER.rock_kaninskinn?.klad;
    const lage = (k: string, varme: number): SIM.MaterialLage => ({ k, varme, skydd: 1, kvar: 5, behovs: 0, till: 4, finhet: 0, varde: 10 });
    const valt = SIM.valMaterial([lage('kaninskinn', rk?.varme ?? 0), lage('vitskinn', rv?.varme ?? 0)], { kyla: true, hot: false, fin: false });
    // klädd i vitt i snön
    const { s, p } = vinter;
    const pa = (k: string) => { const t = SIM.newTing(s, k, 1, p.id); t.bar = p.id; return t; };
    (s.vader ??= { fukt: 0, sno: 0 } as never).sno = 0;
    const barMark = SIM.doljISno(s, p);
    s.vader!.sno = 1;
    const utan = SIM.doljISno(s, p), serUtan = SIM.vargSer(s, p, SIM.VARG.ser * 0.7);
    pa('rock_vitskinn'); const rock = SIM.doljISno(s, p);
    pa('mossa_vitskinn'); const bada = SIM.doljISno(s, p), serVit = SIM.vargSer(s, p, SIM.VARG.ser * 0.7), serNara = SIM.vargSer(s, p, SIM.VARG.ser * 0.5);
    s.vader!.sno = 0; const barVit = SIM.doljISno(s, p);
    return [
      [`en hare som slaktas under istiden ger ett vitt harskinn (${vinter.vit} vita, ${vinter.brun} vanliga)`, vinter.vit >= 1 && vinter.brun === 0],
      [`resten av året ett vanligt (${sommar.vit} vita, ${sommar.brun} vanliga)`, sommar.vit === 0 && sommar.brun >= 1],
      [`rocken av vitt harskinn är varmare (${rv?.varme} mot ${rk?.varme}) och kylan väljer den (${valt})`, !!rv && !!rk && rv.varme > rk.varme && valt === 'vitskinn'],
      [`i snön döljer den vita rocken ${rock.toFixed(1)} och med mössan ${bada.toFixed(1)}; utan vitt ${utan}`, Math.abs(rock - SIM.UTRUSTNING.doljYttre) < 1e-9 && Math.abs(bada - 1) < 1e-9 && utan === 0],
      [`på bar mark döljer inget (${barMark}, ${barVit})`, barMark === 0 && barVit === 0],
      [`vargarna ser den som är klädd i vitt i snön på kortare håll (${(SIM.VARG.ser * 0.7).toFixed(1)} rutor: ${serUtan} utan vitt, ${serVit} i vitt; ${SIM.VARG.ser * 0.5} rutor: ${serNara})`, serUtan && !serVit && serNara],
    ];
  },
};

SCENARIER.dryckval = {
  text: 'Dryckernas register (steg 10.7.23): varje dryck är en rad i VATSKOR med hur mycket den släcker, om den värmer, hur gärna den dricks mot törsten och på kvällen och hur stark den är. Mot törsten dricker man det med högst värde plus smaken, på kvällen det med högst kvällsvärde, och kvällsdrycken är en chans per tid',
  kor: () => {
    const s = rikDag(3), p = vuxna(s)[0]!;
    const kruka = (v: SIM.VatskaId, k = 'lerkruka_stor') => { const t = SIM.addTool(s, k, p); t.hos = undefined; SIM.fyllVatska(s, v, 4, t); return t; };
    kruka('kokt'); kruka('saft', 'lerkruka_mellan');
    const forst = SIM.dryckFor(s, p); // saften är värd mer än det kokta
    (p.smak ??= {})['m:saft'] = -1; const avsmak = SIM.dryckFor(s, p); // med avsmak för saft tar hen det kokta
    delete p.smak['m:saft'];
    // dricka: törsten och tanken ur raden
    p.torst = 0.2; const saft0 = SIM.vatskaAv(s, 'saft'); SIM.drickHemma(s, p, 'saft');
    const slackt = Math.abs(p.torst - (0.2 + SIM.DRYCK.slacker)) < 1e-9 && SIM.vatskaAv(s, 'saft') === saft0 - 1 && p.thoughts.some(t => t.text === 'Drack saft');
    // på kvällen: vinet är värt mer än ölet, och med smak för öl tar hen ölet
    kruka('ol'); kruka('vin');
    klockan(s, 21);
    const kv = SIM.kvallsDryck(s, p, true);
    p.smak['m:ol'] = 1; const kvOl = SIM.kvallsDryck(s, p, true);
    // registret: alla drycker har en rad, och bara de med alkohol tas på kvällen
    const rader = SIM.DRYCKER.every(k => !!SIM.dryckAv(k)?.stat) && SIM.DRYCKER.filter(k => SIM.dryckAv(k)!.kvall !== undefined).every(k => (SIM.dryckAv(k)!.alkohol ?? 0) > 0);
    // chansen per tid: lika många drycker per natt med frågor var 10:e och var 30:e minut
    const perNatt = (min: number) => {
      let n = 0;
      for (let natt = 0; natt < 400; natt++) { s.now += SIM.DAY; klockan(s, 19); for (let t = 0; t < 2 * 60; t += min) { s.now += min * SIM.MIN; if (SIM.kvallsChans(s, p)) { n++; break; } } }
      return n / 400;
    };
    const tio = perNatt(10), trettio = perNatt(30);
    // ölet släcker lite törst och ger rus
    p.torst = 0.2; p.rus = 0; SIM.drickHemma(s, p, 'ol');
    const ol = p.torst > 0.2 && (p.rus ?? 0) > 0;
    return [
      [`mot törsten tar man saften före det kokta vattnet (${forst})`, forst === 'saft'],
      [`med avsmak för saft tar man det kokta (${avsmak})`, avsmak === 'kokt'],
      ['saften släcker törsten och ger sin tanke, ur raden', slackt],
      [`på kvällen vinet före ölet (${kv}), med smak för öl ölet (${kvOl})`, kv === 'vin' && kvOl === 'ol'],
      ['varje dryck har en rad, och bara de med alkohol tas på kvällen', rader],
      [`kvällsdrycken är en chans per tid (${(tio * 100).toFixed(0)} % med frågor var 10:e minut, ${(trettio * 100).toFixed(0)} % var 30:e)`, Math.abs(tio - trettio) < 0.1 && Math.abs(tio - (1 - (1 - SIM.RUS.kvall) ** 2)) < 0.1],
      ['ölet släcker lite törst och ger rus', ol],
    ];
  },
};
