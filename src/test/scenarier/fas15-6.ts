// Scenarier för fas 15, grupp 6 av 15.1 (rövarna, vakten, blodet och huvudbyns rad).
import * as SIM from '../../sim';
import { SCENARIER, klockan, korTills, rovarGang } from './hjalp';
import { lasBy } from '../delby';

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
