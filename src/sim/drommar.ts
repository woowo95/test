// Drömmarna (steg 12.1.132): den som sover kan drömma, och den som vaknat har drömmen som en tanke, en god dröm eller en
// mardröm. Registret DROMMAR har en rad per dröm: vad som ger den (vikt, hur mycket personen bär på det nu) och tanken den
// blir (en rad i TANKAR). Drömmen kommer ur det personen bär på: den som sörjer drömmer om den döde, den som nyss varit i
// fara får mardrömmar, och den som har det bra drömmer gott. En gång i timmen (raden drommar i TAKTER, steg.ts) drömmer den
// som sover med chansen DROM.perTim per sovtimme, och den som vaknat får tanken. Drömmen som ingen kan förklara är något
// annat: den är ett tecken för den mycket andliga (TRO.drom i religion.ts).
import { balans } from './balans';
import { alive } from './folk';
import { moodOf } from './humor';
import { rnd } from './slump';
import { TankeId, tanke, tankeText } from './tankar';
import { HOUR_S, Person, State } from './typer';

export const DROM = balans('drommar', {
  perTim: 0.06, // chansen per sovtimme att den som bär på något drömmer om det (ungefär var tredje natt)
  gott: 0.7, // humöret från vilket man har det bra och drömmer gott
});

// det som räknas som fara: den som har någon av de här tankarna kvar kan få mardrömmar
const FARA: TankeId[] = ['anfollsVargar', 'klaradeVargar', 'slogsRovare', 'drevBortRovare', 'hotadRovare', 'sagBjorn', 'sagBjornUngar', 'anfollsBjorn', 'sagBjornSlass', 'anfollsVildsvin', 'falldeVildsvin', 'husetBrann', 'svalter'];
let faraText: Set<string> | undefined;
const iFara = (p: Person, now: number) => { faraText ??= new Set(FARA.map(k => (tankeText as (k: TankeId) => string)(k))); return p.thoughts.some(t => t.until > now && faraText!.has(t.text)); };
// den döde som p sörjer, den senaste (sorgen i liv.ts)
const sorjer = (p: Person) => p.sorg?.length ? [...p.sorg].sort((a, b) => b.t0 - a.t0)[0] : undefined;

export interface DromDef { tanke: TankeId; vikt: (s: State, p: Person) => number }
export const DROMMAR = {
  sorg: { tanke: 'dromdeOm', vikt: (_s, p) => sorjer(p) ? 1 : 0 },
  mardrom: { tanke: 'mardrom', vikt: (s, p) => iFara(p, s.now) ? 1 : 0 },
  gott: { tanke: 'godDrom', vikt: (s, p) => moodOf(p, s.now) >= DROM.gott ? 1 : 0 },
} satisfies Record<string, DromDef>;
export type DromId = keyof typeof DROMMAR;

// en gång i timmen: den som sover kan drömma, den som vaknat har drömmen kvar som tanke
export function drommar(s: State, dt: number) {
  for (const p of s.people) {
    if (!alive(p)) continue;
    if (p.task?.act !== 'sova') {
      if (p.drom) { const d = p.drom; delete p.drom; if (d.k === 'sorg') tanke(p, 'dromdeOm', s.now, { namn: d.namn ?? '' }); else tanke(p, DROMMAR[d.k].tanke as 'godDrom', s.now); }
      continue;
    }
    const v = (Object.keys(DROMMAR) as DromId[]).map(k => [k, (DROMMAR[k] as DromDef).vikt(s, p)] as const).filter(([, w]) => w > 0);
    if (!v.length || rnd(s, 'drom', p) >= 1 - Math.exp(-DROM.perTim * dt / HOUR_S)) continue;
    let x = rnd(s, 'drom', p) * v.reduce((a, [, w]) => a + w, 0), k = v[0][0];
    for (const [id, w] of v) { if (x < w) { k = id; break; } x -= w; }
    p.drom = { k, ...(k === 'sorg' ? { namn: sorjer(p)!.namn } : {}) };
  }
}
