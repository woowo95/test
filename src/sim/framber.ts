// Berättelsen om ett framträdande (steg 5.4.7.2, "Framträdandena" i designdokumentet): några meningar högst upp i
// redogörelsen (ui/flikar/fram.ts) om vad framträdandet handlade om och vilken mottagning det fick. Allt läses ur minnet som
// sparades när det hände (FramMinne i framtradande.ts), så att texten stämmer med rapporten under: formen och ämnet,
// budskapet och om ledaren betalade, publiken, hur bra det var (kvaliteten) och vad det ledde till (ledaren efter en
// hyllning eller ett hån, ryktet och tron). Spelets mallar f_* i BERATTELSER skriver texten; varianten väljs ur
// framträdandets nummer, så att samma framträdande alltid berättas likadant och ingen slump dras.
import type { State } from './typer';
import type { FramMinne } from './framtradande';
import { INSTRUMENT } from './framtradande';
import { balans } from './balans';
import { fyll, och, talOrd, valjVariant } from './berattelser';

export const FRAMBER = balans('framber', {
  bra: 0.9, // från den här kvaliteten (framKval × instrumentet, 0 till ungefär 3) var det ett gott framträdande
  dalig: 0.5, // under den här ett dåligt (då tycker publiken sämre om den som uppträdde, FRAM.op)
});

export function framBerattelse(s: State, m: FramMinne): string {
  const pub = m.publik ?? [], d = pub.reduce((a, x) => a + x.r1 - x.r0, 0);
  const ledd = pub.filter(x => x.l0 !== undefined), ld = ledd.reduce((a, x) => a + x.l1! - x.l0!, 0);
  const f = {
    namn: m.namn, form: m.k, amne: m.amne ?? 'det som hänt', inst: m.inst ? INSTRUMENT[m.inst]?.ord ?? m.inst : '', bud: m.bud ?? '',
    om: m.om ?? '', ledare: m.ledare ?? '', betalt: m.betalt ?? '', n: talOrd(m.n), nTal: m.n,
    bra: m.q >= FRAMBER.bra, dalig: m.q < FRAMBER.dalig, upp: d > 0, ner: d < 0,
    rykte: och(m.rykte ?? []), tro: och(m.tro ?? []),
  };
  const mening = (mall: 'f_start' | 'f_bud' | 'f_publik' | 'f_mott' | 'f_verkan' | 'f_inget', i: number, g = {}) => { const x = { ...f, ...g }; return fyll(valjVariant(s, mall, (m.nr ?? 0) * 16 + i, x, 0), x); };
  if (m.inget) return mening('f_inget', 0);
  const verkan = [
    m.bud === 'hylla' && ld > 0 ? 'hylla' : '', m.bud === 'hana' && m.ledare ? 'hana' : '',
    m.rykte?.length && m.om ? 'rykte' : '', m.tro?.length ? 'tro' : '',
  ].filter(Boolean);
  return [mening('f_start', 0), m.bud ? mening('f_bud', 1) : '', mening('f_publik', 2), mening('f_mott', 3), ...verkan.map((v, i) => mening('f_verkan', 4 + i, { verkan: v }))].filter(Boolean).join(' ');
}
