// Scenarier för fas 15, grupp 6 av 15.1 (rövarna, vakten, blodet och huvudbyns rad).
import * as SIM from '../../sim';
import { SCENARIER, klockan, korTills, rovarGang } from './hjalp';
import { lasBy } from '../delby';
import { START } from '../kor';
import { husPa } from './byggnader';

// den sparade byn vid klockan timme, med ovänliga grannar
const rovarBy = (timme: number) => { const s = lasBy('test/rovarby.json.gz'); klockan(s, timme); for (const c of SIM.klanerOf(s)) c.inst = -60; return s; };
const ettGang = (s: SIM.State, f: SIM.Rovarflock) => { s.rovareFler = undefined; s.rovare = f; };
const vuxnaI = (s: SIM.State) => SIM.living(s).filter(p => !p.gast && SIM.vuxenKan(s, p));
// en ruta på land nära kartans kant, som går att nå från byn, och punkten på kanten där man går ut
function vidKanten(s: SIM.State) {
  const m = SIM.malet(s), vt = SIM.vattenNu(s), g = SIM.groundOf(s);
  for (const [x, y, ux, uy] of [[1.5, m.y, 0.3, 0], [SIM.W - 1.5, m.y, SIM.W - 0.3, 0], [m.x, 1.5, 0, 0.3], [m.x, SIM.H - 1.5, 0, SIM.H - 0.3]]) {
    const at = SIM.freeNear(s, x, y);
    if (vt[Math.floor(at.y) * SIM.W + Math.floor(at.x)] !== SIM.T.Vatten && SIM.findPath(g, at.x, at.y, m.x, m.y)) return { ...at, ut: { x: ux || at.x, y: uy || at.y } };
  }
  return undefined;
}

SCENARIER.gangflyr = {
  text: 'Steg 15.1.57: gängets läge räknas ur dem som är kvar. Två rövare: den ena flyr ut ur kartan medan den andra slåss. Läget är "slass" i varje slag medan striden pågår, och de som gömt sig förblir gömda',
  kor: () => {
    const s = rovarBy(11), m = SIM.malet(s), f = rovarGang(s, 2, SIM.freeNear(s, m.x + 6, m.y), { anfaller: true }); ettGang(s, f); f.sedd = s.now; f.anfallT = s.now;
    const [r1, r2] = SIM.rovarna(s, f), kant = vidKanten(s)!;
    for (const p of SIM.living(s)) if (!p.gast) p.larm = { rovare: { t: s.now, vad: 'rovare', storlek: 2, led: 0, varnat: 1, om: [f.id] } };
    korTills(s, () => false, 60, () => ettGang(s, f)); // byn gör sig redo: några gömmer sig
    // den ena slåss med en bybo, den andra har lämnat striden och flyr från kanten
    if (!SIM.flockStrid(s, f)) { const v = vuxnaI(s).filter(p => p.task?.act !== 'gomma').sort((a, b) => SIM.stat(b, 'mod', s.now) - SIM.stat(a, 'mod', s.now))[0]!; Object.assign(v, SIM.freeNear(s, r1.x + 1, r1.y)); v.task = undefined; SIM.kartStridBorja(s, 'skada', [[v], [r1, r2]], 'rövare vid byn', { typ: 'rovare', egen: true, flock: f.id }); }
    const g = SIM.flockStrid(s, f)!;
    for (const k of g.st.kampar) if (k.pid === r2.id) k.lage = 'borta';
    (g.fri ??= []).push(r2.id);
    r1.gast!.flytt = undefined; r1.gast!.nojd = undefined; f.klar = undefined; // den som slåss har inte gett upp
    r2.x = kant.x; r2.y = kant.y; r2.gast!.flytt = true; r2.gast!.ut = kant.ut; // ut genom den närmaste kanten r2.gast!.varStrid = undefined; r2.task = undefined;
    const gomda = vuxnaI(s).filter(p => p.task?.act === 'gomma').map(p => p.id);
    let slag = 0, fel = 0, gick: number | undefined, kvarGomda = -1; const lagen = new Set<string>();
    const slass = () => { const st = SIM.flockStrid(s, f); return !!st && !st.st.slut && f.folk.includes(r1.id) && !r1.gast!.flytt; };
    korTills(s, () => !slass() || (gick !== undefined && s.now > gick + 30 * SIM.SEC), 600, () => {
      ettGang(s, f);
      if (gick === undefined && !f.folk.includes(r2.id)) gick = s.now;
      if (slass()) { slag++; lagen.add(f.gor); if (f.gor !== 'slass') fel++; if (gick !== undefined) kvarGomda = gomda.filter(id => SIM.byId(s, id)?.task?.act === 'gomma').length; }
    });
    return [
      [`den ena rövaren gick ut ur kartan under striden (${gick !== undefined})`, gick !== undefined && kvarGomda >= 0],
      [`läget är "slass" i varje slag medan striden pågår (${slag - fel} av ${slag}; ${[...lagen].join(', ')})`, slag > 0 && fel === 0],
      [`de som gömt sig förblir gömda (${kvarGomda} av ${gomda.length} en halv minut efter)`, gomda.length > 0 && kvarGomda === gomda.length],
    ];
  },
};

// ett förrådshus intill målet i rövarbyn, som gänget plundrar
function medForradshus(s: SIM.State) {
  const m0 = SIM.malet(s), g = SIM.groundOf(s), x = Math.floor(m0.x) - 3, y = Math.floor(m0.y) - 3;
  for (let yy = y - 2; yy < y + 10; yy++) for (let xx = x - 2; xx < x + 10; xx++) g.trees[yy * SIM.W + xx] = 0;
  husPa(s, x, y, 7, 7, true, { fn: 'forrad' as SIM.Hus['fn'] });
  return { x: x + 3.5, y: y + 3.5 };
}
const radd = (s: SIM.State, p: SIM.Person) => { p.pot.mod *= 0.05 / Math.max(0.1, SIM.stat(p, 'mod', s.now)); p.larmRoll = undefined; };

SCENARIER.gomplats = {
  text: 'Steg 15.1.58: de gömda gömmer sig inte där gänget plundrar. Faran på själva platsen jämförs, huset mot elden, och huset dämpar den. När gänget plundrar ett hus gömmer sig ingen där, och den som redan gömt sig där går till en tryggare plats',
  kor: () => {
    const s = rovarBy(11), mitt = medForradshus(s), rum = SIM.roomAt(s, Math.floor(mitt.x), Math.floor(mitt.y));
    const f = rovarGang(s, 3, SIM.freeNear(s, mitt.x + 30, mitt.y), { anfaller: true }); ettGang(s, f); f.sedd = s.now;
    const [a, b] = vuxnaI(s); radd(s, a); radd(s, b);
    for (const p of [a, b]) { p.larm = { rovare: { t: s.now, vad: 'rovare', storlek: 3, led: 0, varnat: 1, om: [f.id] } }; p.task = undefined; }
    // a har gömt sig i huset medan gänget var långt borta
    const inne = SIM.freeNear(s, mitt.x - 1, mitt.y - 1); Object.assign(a, inne);
    a.task = { act: 'gomma', phase: 'do', tx: inne.x, ty: inne.y, until: s.now + SIM.HOUR, carry: 0, why: 'prov', hot: 'rovare' } as SIM.Task;
    SIM.rovarSteg(s, 1);
    const fore = SIM.byId(s, a.id)?.task?.act === 'gomma' && SIM.roomAt(s, Math.floor(a.task!.tx), Math.floor(a.task!.ty)) === rum;
    // gänget kommer in i huset och plundrar
    for (const [i, r] of SIM.rovarna(s, f).entries()) Object.assign(r, SIM.freeNear(s, mitt.x + i - 1, mitt.y + 1));
    const rovInne = SIM.rovarna(s, f).filter(r => SIM.roomAt(s, Math.floor(r.x), Math.floor(r.y)) === rum).length;
    SIM.rovarSteg(s, 1);
    const valdeOm = a.task?.act !== 'gomma';
    if (!a.task) SIM.chooseTask(s, a);
    const aSpot = a.task ? { x: a.task.tx, y: a.task.ty } : a, aRum = SIM.roomAt(s, Math.floor(aSpot.x), Math.floor(aSpot.y));
    // b väljer ett gömställe nu
    const sk = SIM.gomSig(s, b, 'Rövare', 'rovare', SIM.HOUR), bRum = sk?.spot && SIM.roomAt(s, Math.floor(sk.spot.x), Math.floor(sk.spot.y));
    const nara = (at: { x: number; y: number }) => Math.min(...SIM.rovarna(s, f).map(r => Math.hypot(r.x - at.x, r.y - at.y)));
    return [
      [`hen gömde sig i huset medan gänget var långt borta (${fore})`, fore],
      [`gänget plundrar i huset (${rovInne} av 3 inne)`, rovInne === 3],
      [`den som gömt sig i huset väljer om (${valdeOm}) och går till en plats utanför det (${a.task?.act}: ${a.task?.why}, ${nara(aSpot).toFixed(1)} rutor från gänget)`, valdeOm && aRum !== rum && nara(aSpot) > 4],
      [`den som gömmer sig nu gömmer sig inte i huset (${sk?.why}, ${sk?.spot ? nara(sk.spot).toFixed(1) : '-'} rutor från gänget)`, !!sk && bRum !== rum],
    ];
  },
};

SCENARIER.flyktvard = {
  text: 'Steg 15.1.60: den som flytt vårdar sig inte intill fienden. Med ett rövarlarm väljer den som vårdar sig själv den tryggaste platsen (där hen står, en bit bort, vid elden eller i sängen), med faran mätt som för de gömda, och den som flytt med ett sår vårdar sig längre från rövarna än hen stod när hen flydde',
  kor: () => {
    const s = rovarBy(11), e = SIM.eldPlats(s), f = rovarGang(s, 2, SIM.freeNear(s, e.x + 24, e.y), { anfaller: true }); ettGang(s, f); f.sedd = s.now;
    const rov = SIM.rovarna(s, f).map(r => ({ r, x: r.x, y: r.y }));
    const p = vuxnaI(s)[0]!, fran = SIM.freeNear(s, rov[0].x - 3, rov[0].y);
    for (const q of SIM.living(s)) if (!q.gast && q !== p) q.task = { act: 'sova', phase: 'do', tx: q.x, ty: q.y, until: s.now + SIM.HOUR, carry: 0, why: 'prov' } as SIM.Task;
    Object.assign(p, fran); p.task = undefined; p.gavSig = s.now; // hen har just flytt ur striden
    p.larm = { rovare: { t: s.now, vad: 'rovare', storlek: 2, led: 0, varnat: 1, om: [f.id] } };
    p.skador = [{ d: 'armV', k: 'skarsar', g: 0.5, b: 1 }];
    const nara = (at: { x: number; y: number }) => Math.min(...SIM.rovarna(s, f).map(r => Math.hypot(r.x - at.x, r.y - at.y)));
    const d0 = nara(p), v = SIM.vardVal(s, p, true);
    let vid: { x: number; y: number } | undefined;
    korTills(s, () => !!vid || !(p.skador ?? []).some(w => w.b > 0), 300, () => {
      ettGang(s, f); for (const o of rov) { o.r.x = o.x; o.r.y = o.y; } // gänget står kvar
      for (const q of SIM.living(s)) if (!q.gast && q !== p) q.task = { act: 'sova', phase: 'do', tx: q.x, ty: q.y, until: s.now + SIM.HOUR, carry: 0, why: 'prov' } as SIM.Task;
      if (p.task?.act === 'varda' && p.task.phase !== 'go') vid = { x: p.x, y: p.y };
    });
    vid ??= { x: p.x, y: p.y };
    return [
      [`hen vårdar sig själv (${v?.why ?? 'inget'})`, !!v && v.ref === p.id],
      [`platsen hen väljer ligger längre från rövarna (${v ? nara(v.spot).toFixed(1) : '-'} rutor) än där hen stod (${d0.toFixed(1)})`, !!v && nara(v.spot) > d0 + 3],
      [`hen vårdar sig där, längre från rövarna (${nara(vid).toFixed(1)} rutor, såret ${(p.skador ?? []).some(w => w.b > 0) ? 'blöder' : 'blöder inte'})`, nara(vid) > d0 + 3],
    ];
  },
};

SCENARIER.vaktute = {
  text: 'Steg 15.1.61: vakten står ute. Vaktens plats (vid elden, stoppen på rundan och platsen när vakten väljs) är den lediga rutan utan rum närmast platsen vid elden, så i en by där ett hus står intill elden står vakten utomhus',
  kor: () => {
    const s = SIM.createState(6, START); klockan(s, 22);
    const e = SIM.eldPlats(s), g = SIM.groundOf(s);
    for (let yy = e.y - 5; yy < e.y + 6; yy++) for (let xx = e.x - 1; xx < e.x + 10; xx++) g.trees[yy * SIM.W + xx] = 0;
    husPa(s, e.x + 2, e.y - 3, 6, 7, true); // huset intill elden: ringen runt elden går in i det
    const ringInne = Array.from({ length: 16 }, (_, i) => SIM.freeNear(s, e.x + 0.5 + Math.cos(i * Math.PI / 8) * SIM.ACTS.vakt.radie!, e.y + 0.5 + Math.sin(i * Math.PI / 8) * SIM.ACTS.vakt.radie!)).filter(at => SIM.roomAt(s, Math.floor(at.x), Math.floor(at.y))).length;
    const p = vuxnaI(s)[0]!; let val = 0, valInne = 0;
    for (let i = 0; i < 40; i++) { const at = SIM.spotFor(s, 'vakt', p); val++; if (SIM.roomAt(s, Math.floor(at.x), Math.floor(at.y))) valInne++; }
    // vakten går sin runda en natt och stannar vid elden ibland
    p.task = { act: 'vakt', phase: 'do', tx: p.x, ty: p.y, until: s.now + 8 * SIM.HOUR, carry: 0, why: 'prov' } as SIM.Task;
    let mal = 0, malInne = 0, vidEld = 0; const sett = new Set<string>();
    for (let i = 0; i < 4000 && p.task?.act === 'vakt'; i++) {
      SIM.vaktSteg(s, p, p.task); s.now += 10 * SIM.SEC;
      const k = `${p.task.tx},${p.task.ty}`; if (sett.has(k)) continue; sett.add(k);
      mal++; if (p.task.vidEld) vidEld++; if (SIM.roomAt(s, Math.floor(p.task.tx), Math.floor(p.task.ty))) malInne++;
    }
    return [
      [`ringen runt elden går in i huset (${ringInne} av 16 platser inne)`, ringInne > 0],
      [`platsen när vakten väljs är utomhus (${val - valInne} av ${val})`, valInne === 0],
      [`stoppen på rundan och vid elden är utomhus (${mal - malInne} av ${mal}, ${vidEld} vid elden)`, mal > 5 && vidEld > 0 && malInne === 0],
    ];
  },
};

SCENARIER.dorrlarm = {
  text: 'Steg 15.1.63: larmet från dörren gäller gänget som hugger. Den som är närmast dörren och hör hugget ropar, larmet gäller det gänget, och ett andra gäng som kommer senare får ett eget larm när det syns',
  kor: () => {
    const s = rovarBy(11), mitt = medForradshus(s), b = SIM.bitsOf(s).find(q => q.m === 'oppning' && Math.hypot(q.x - mitt.x, q.y - mitt.y) < 6)!; b.dorr = 'tradorr';
    const f1 = rovarGang(s, 2, SIM.freeNear(s, b.x + 0.5, b.y + 2.5), { anfaller: true }); f1.vantat = true; f1.till = s.now + SIM.HOUR; ettGang(s, f1);
    const folk = SIM.living(s).filter(p => !p.gast), nara = folk.map(p => ({ p, d: Math.hypot(p.x - b.x - 0.5, p.y - b.y - 0.5) })).sort((x, y) => x.d - y.d)[0].p;
    for (const p of folk) p.larm = undefined;
    const hugger = SIM.huggDorr(s, f1, SIM.living(s), b);
    const forsta = nara.larm?.rovare, alla = folk.filter(p => p.larm?.rovare);
    // ett gäng till kommer senare, och en vakt ser det
    const f2 = rovarGang(s, 2, SIM.freeNear(s, mitt.x + 40, mitt.y)); f2.vantat = true; f2.till = s.now + SIM.HOUR;
    const q = folk.find(p => p !== nara && p.larm?.rovare && SIM.vuxenKan(s, p)) ?? folk.find(p => SIM.vuxenKan(s, p))!;
    for (const p of SIM.living(s)) if (!p.gast && p !== q) p.task = { act: 'sova', phase: 'do', tx: p.x, ty: p.y, until: s.now + SIM.HOUR, carry: 0, why: 'prov' } as SIM.Task;
    q.task = { act: 'vakt', phase: 'do', tx: 0, ty: 0, until: s.now + SIM.HOUR, carry: 0, why: 'prov' } as SIM.Task; Object.assign(q, SIM.freeNear(s, f2.x - 5, f2.y));
    const omFore = [...(q.larm?.rovare?.om ?? [])];
    for (let i = 0; i < 120 && !q.larm?.rovare?.om?.includes(f2.id); i++) SIM.rovarSteg(s, 1);
    return [
      [`gänget hugger dörren (${hugger})`, hugger],
      [`den närmast dörren ropar, och larmet gäller gänget som hugger (${forsta ? `om ${JSON.stringify(forsta.om)}` : 'inget'})`, !!forsta && forsta.led === 0 && forsta.om?.length === 1 && forsta.om[0] === f1.id],
      [`de som hörde har larmet om det gänget (${alla.filter(p => p.larm!.rovare!.om?.includes(f1.id)).length} av ${alla.length})`, alla.length > 1 && alla.every(p => p.larm!.rovare!.om?.includes(f1.id))],
      [`vakten visste om det första gänget (${JSON.stringify(omFore)}) och får ett eget larm om det andra när det syns (${JSON.stringify(q.larm?.rovare?.om)})`, omFore.includes(f1.id) && !!q.larm?.rovare?.om?.includes(f2.id)],
    ];
  },
};
