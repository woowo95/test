import { tal } from './ord';
import { State } from './typer';
import { Tro, gudarOf, tolkning, troende } from './religion';
import { HELIGA_PLATSER, heligaFor } from './kult';
import { BUD } from './kyrka';
import { troshusAv } from './troshus';
import { byId } from './folk';

// Trons berättelse växer med tron (steg 11.1.23): ett stycke för varje sak tron har fått, i den ordning de brukar komma, så att en
// personlig tro har ett par meningar och en kyrka en hel berättelse. Varje rad i registret säger om tron har saken och skriver
// stycket ur det tron har nu. Läser bara: inget sparas och ingen slump dras
const och = (xs: string[]) => xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} och ${xs[xs.length - 1]}`;
export interface TroStycke { id: string; har(s: State, tr: Tro): boolean; text(s: State, tr: Tro): string }
export const TROSTYCKEN: TroStycke[] = [
  { id: 'tecknet', har: () => true, text: (_s, tr) => tr.ber ?? tolkning(tr) },
  { id: 'namnet', har: (_s, tr) => !!tr.namn, text: (s, tr) => { const n = troende(s, tr).length; return `Tron fick namnet ${tr.namn} år ${tr.ar}, och ${n === 1 ? 'en tror' : `${tal(n)} tror`} på den nu.`; } },
  { id: 'gudarna', har: (_s, tr) => gudarOf(tr).length > 1, text: (_s, tr) => `Den har ${tal(gudarOf(tr).length)} gudar: ${och(gudarOf(tr).map(g => g.namn))}.` },
  { id: 'platsen', har: (s, tr) => heligaFor(s, tr).length > 0, text: (s, tr) => `${och(heligaFor(s, tr).map(h => HELIGA_PLATSER[h.k].namn))} är ${heligaFor(s, tr).length > 1 ? 'dess heliga platser' : 'dess heliga plats'}.` },
  { id: 'prasten', har: (s, tr) => !!byId(s, tr.prast), text: (s, tr) => `${byId(s, tr.prast)!.name} är dess präst.` },
  { id: 'buden', har: (_s, tr) => !!tr.bud?.length, text: (_s, tr) => `De troende följer ${tr.bud!.length === 1 ? 'ett bud' : `${tal(tr.bud!.length)} bud`}: ${och(tr.bud!.map(b => (BUD[b.id as keyof typeof BUD]?.namn ?? b.id).toLowerCase()))}.` },
  { id: 'hogtiden', har: (_s, tr) => !!tr.bud?.some(b => b.id === 'hogtid'), text: () => 'En gång om året firar de högtid.' },
  { id: 'huset', har: (s, tr) => troshusAv(s, tr).length > 0, text: (s, tr) => `Tron har ${troshusAv(s, tr).length === 1 ? `ett hus, ${troshusAv(s, tr)[0].namn}` : `${tal(troshusAv(s, tr).length)} hus`}.` },
  { id: 'helgonen', har: (_s, tr) => !!tr.helgon?.length, text: (_s, tr) => `Den minns ${tr.helgon!.length === 1 ? 'helgonet' : 'helgonen'} ${och(tr.helgon!.map(h => h.namn))}.` },
];
export const trosBerattelse = (s: State, tr: Tro) => TROSTYCKEN.filter(d => d.har(s, tr)).map(d => d.text(s, tr)).join(' ');
