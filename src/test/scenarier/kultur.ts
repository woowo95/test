// Scenarier. Kulturen (fas 4.3): sporten, framträdandena, konsten i sakerna och pyntet i hemmen.
import { createState, Person, State } from '../../sim';
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, klockan, kor, setFood } from './hjalp';

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
  text: 'Sporten (steg 4.3.1.1): när byn har ett överskott spelar de vuxna brottning och dragkamp på lekplatsen under fritiden. Det tränar närstrid och gör dem glada',
  kor: () => {
    const s = rikDag(3, { rep: 4 }), vill = vuxna(s).filter(q => SIM.sportVikt(s, q, 1) > 0).length;
    const f = rikDag(3, { rep: 4 }); setFood(f, 1);
    const vf = vuxna(f).filter(q => SIM.sportVikt(f, q, 1) > 0).length;
    // två samtalar när den tredje börjar en match, och följer med
    const g = rikDag(3, { rep: 4 }), med = vuxna(g).slice(0, 3), fore = med.map(q => q.skill.narstrid);
    fritid(g, med[1]!); fritid(g, med[2]!);
    spela(g, med[0]!);
    const sport0 = SIM.SPORT_AV[g.sport!.k]!.namn, foljer = med.filter(q => q.task?.act === 'sport').length;
    let sett = 0;
    kor(g, 2, () => { sett = Math.max(sett, med.filter(q => q.task?.act === 'sport' && q.task.phase === 'do').length); });
    const glad = med.filter(q => q.thoughts.some(t => t.text.startsWith('Spelade'))).length;
    const battre = med.filter((q, i) => q.skill.narstrid > fore[i]!).length;
    // när ingen har fritid följer ingen med, och det blir ingen match
    const e = rikDag(3, { rep: 4 }), ensam = !spela(e, vuxna(e)[0]!) && !e.sport;
    return [
      [`i en rik by vill ${vill} av ${vuxna(s).length} vuxna spela på fritiden`, vill === vuxna(s).length],
      ['när maten är knapp vill ingen spela', vf === 0],
      [`${foljer} går till ${sport0.toLowerCase()}en; ${(g.stat?.sportTim ?? 0).toFixed(1)} spelartimmar, högst ${sett} på planen samtidigt`, foljer === 3 && (g.stat?.sportTim ?? 0) >= 1 && sett >= 2],
      [`${glad} av tre är glada efter att ha spelat, och ${battre} blev bättre i närstrid`, glad >= 2 && battre >= 2],
      ['när ingen har fritid följer ingen med, och det blir ingen match', ensam],
    ];
  },
};

// en match i sporten k som börjar nu på lekplatsen, och de som går med i den
function match(s: State, k: string, med: Person[]) {
  const l = SIM.lekplats(s);
  s.sport = { k, x: l.x + l.w / 2, y: l.y + l.h / 2, start: s.now, slut: s.now + SIM.HOUR };
  for (const q of med) spela(s, q);
}
SCENARIER.sportsaker = {
  text: 'Sportens föremål (steg 4.3.1.2): byn gör ett mål, en boll och ett slagträ när den har vuxna nog, föremålen slits när man spelar, och den som vunnit flest matcher i en sport får det i sitt eftermäle',
  kor: () => {
    const s = rikDag(3, { rep: 4 });
    const vill = ['mal', 'boll', 'slagtra'].map(k => SIM.villAv(s, k));
    const utan = SIM.SPORTER.filter(d => d.foremal.length && !d.foremal.every(k => SIM.amountOf(s, k) >= 1)).map(d => d.id);
    const v = vuxna(s), a = v[0]!, b = v[1]!;
    a.skill.traff = 20; b.skill.traff = 0;
    SIM.newTing(s, 'mal', 1, a.id);
    let matcher = 0;
    for (let i = 0; i < 6; i++) {
      klockan(s, 10);
      match(s, 'kast', [a, b]); kor(s, 2); matcher++;
      if (i < 5) s.now += 20 * SIM.HOUR;
    }
    const mal = (s.ting ?? []).find(t => t.k === 'mal');
    return [
      [`byn vill ha ${vill.join(', ')} av målet, bollen och slagträet`, vill.every(n => n === 1)],
      [`utan föremålen kan byn inte spela ${utan.join(' och ')}`, utan.includes('kast') && utan.includes('bollspel')],
      [`${a.name} vann ${a.sportVinst?.kast ?? 0} av ${matcher} matcher i kast, ${b.name} ${b.sportVinst?.kast ?? 0}`, (a.sportVinst?.kast ?? 0) >= 5 && (a.sportVinst?.kast ?? 0) > (b.sportVinst?.kast ?? 0)],
      [`${a.name}s eftermäle: ${a.fame.join(', ') || 'inget'}`, a.fame.includes('Den bästa i kast mot mål') && s.sportBast?.kast === a.id],
      [`målet har slitits till ${mal ? mal.c.toFixed(2) : 'inget'}`, !!mal && mal.c < 1],
    ];
  },
};
