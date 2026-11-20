// Förlossningen (steg 9.5.29, Hälsosystemet i detalj: Förlossningen): födseln är en händelse som tar tid. När tiden är inne lägger
// sig modern (handlingen foder), ropar på hjälp, och förloppet dras ur registret FORLOPP. Hjälpen är en rad i vårdregistret (VARD.forlossa
// i halsa.ts, steg 12.1.82) som valet av aktivitet väger: brådskan är som en blödning när förloppet gått fel, annars som ett sår. Hjälparen stannar (handlingen forlossa),
// och hjälparens vårdkvalitet (Läkekonst, egna födslar, Rena händer, värmen, kokat vatten och remsor) sänker riskerna för modern och
// barnet. När tiden gått föds barnet (birth i liv.ts), och texten om förloppet står i notisen, Händelser och krönikan
import { balans } from './balans';
import { alive, byId, count } from './folk';
import { avbryt } from './lager';
import { kn } from './kunskap';
import { getable } from './behov';
import { tingOf } from './agande';
import { roomAt } from './byggnad';
import { bedFor } from './bygg';
import { rnd } from './slump';
import { HOUR, Person, State } from './typer';

export interface ForloppDef { namn: string; p: number; tim: number; mor: number; barn: number; text: string; tva?: true; fel?: true } // fel = det har gått fel: hjälpen brådskar som vid en blödning
export const FORLOPP: Record<string, ForloppDef> = {
  vanlig: { namn: 'Vanlig', p: 0.65, tim: 2, mor: 0.005, barn: 0.01, text: 'Förlossningen gick som den skulle.' },
  lang: { namn: 'Lång', p: 0.12, tim: 6, mor: 0.02, barn: 0.05, text: 'Förlossningen var lång och tung.' },
  fel: { namn: 'Barnet låg fel', p: 0.06, tim: 8, mor: 0.15, barn: 0.4, text: 'Barnet låg fel, och det var svårt att få ut det.', fel: true },
  blodning: { namn: 'Blödning efteråt', p: 0.08, tim: 3, mor: 0.15, barn: 0, text: 'Modern blödde mycket efteråt.', fel: true },
  tidigt: { namn: 'För tidigt', p: 0.05, tim: 2, mor: 0.01, barn: 0.4, text: 'Barnet kom för tidigt och var litet.' },
  tvillingar: { namn: 'Tvillingar', p: 0.02, tim: 4, mor: 0.05, barn: 0.15, text: 'Det blev tvillingar.', tva: true },
  dodfott: { namn: 'Dödfött', p: 0.02, tim: 3, mor: 0.02, barn: 1, text: 'Barnet var dött när det föddes.' },
};
export const FORLOPP_LIST = Object.keys(FORLOPP);
export const FORL = balans('forlossning', {
  vard: 0.6, // en hjälpare med full vårdkvalitet sänker riskerna så här mycket (gånger kvaliteten)
  lake: 0.08, egna: 0.1, rena: 0.15, varm: 0.1, kokt: 0.1, remsa: 0.1, // vårdkvaliteten: per poäng i Läkekonst, per eget barn (högst 3), och för det andra
  fel: 0.25, // när förloppet gått fel räknas avståndet till modern så här mycket kortare i valet av vem som vårdas (som en blödning med en kvarts timme kvar)
  morRisk: 1, // modernas risk gånger detta (för scenarierna)
});
// hjälparens vårdkvalitet (0–1) vid modern m
export function vardKvalitet(s: State, g: Person | undefined, m: Person) {
  if (!g) return 0;
  const egna = Math.min(3, s.people.filter(q => q.mother === g.id).length);
  const v = FORL.lake * g.skill.lakekonst + FORL.egna * egna + (kn(g, 'renahander') >= 0.5 ? FORL.rena : 0) + (roomAt(s, m.x, m.y) ? FORL.varm : 0) + (tingOf(s).some(t => t.inne?.v === 'kokt') ? FORL.kokt : 0) + (getable(s, g, 'remsa') >= 1 ? FORL.remsa : 0);
  return Math.min(1, v);
}
// tiden är inne: förloppet dras, modern lägger sig och ropar på hjälp
export function borjaForlossning(s: State, m: Person) {
  let x = rnd(s, 'halsa', m), f = FORLOPP_LIST[0];
  for (const k of FORLOPP_LIST) { x -= FORLOPP[k].p; if (x <= 0) { f = k; break; } }
  const till = s.now + FORLOPP[f].tim * HOUR, bad = bedFor(s, m) ?? { x: m.x, y: m.y };
  m.foder = { f, till }; m.ropT = s.now;
  avbryt(s, m);
  m.task = { act: 'foder', phase: 'go', tx: bad.x, ty: bad.y, until: till, carry: 0, why: 'Föder barn' };
  count(s, 'forlossning_' + f);
}
// riskerna med hjälpen: modern dör, barnet dör (för födseln i liv.ts)
export function forlossRisk(s: State, m: Person) {
  const fo = m.foder, f = FORLOPP[fo?.f ?? 'vanlig'], g = fo?.hjalp !== undefined ? byId(s, fo.hjalp) : undefined;
  const q = vardKvalitet(s, g && alive(g) ? g : undefined, m), minska = 1 - FORL.vard * q;
  return { f, mor: f.mor * minska * FORL.morRisk, barn: f.barn * minska * (FORL.morRisk > 1 ? 0 : 1), tva: !!f.tva };
}
// brådskan i vården (bradska i halsa.ts): när förloppet gått fel som en blödning (FORL.fel), annars som ett vanligt sår
export const forlossBradska = (q: Person) => q.foder && FORLOPP[q.foder.f]?.fel ? FORL.fel : 1;
