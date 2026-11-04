// Berättelsen om en affär med handlaren (steg 5.4.6.2, "Hur handeln syns" i designdokumentet): några meningar högst upp i
// redogörelsen (ui/flikar/filt.ts) om hur handeln gick, vilka argument de hade och hur det slutade. Argumenten är rader i
// registret HANDELSARG och väljs ur det som verkligen fanns i affären (varornas kvalitet, bybons behov, årstiden, relationen,
// kemin, egenskaperna och färdigheten i Handel) när handlaren svarar första gången (svar i handel.ts), och sparas med
// bytet (ByteMinne.arg). Spelets mallar h_* i BERATTELSER skriver texten; varianten väljs ur bytets nummer, så att samma
// affär alltid berättas likadant och ingen slump dras.
import type { ByteMinne, Person, State } from './typer';
import type { GastRel } from './gastrel';
import { stat } from './folk';
import { foreIstiden, iIstiden, kalender } from './tid';
import { balans } from './balans';
import { sakNamn } from './saker';
import { NORMAL } from './kvalitet';
import { fyll, talOrd, valjVariant } from './berattelser';

// det argumenten frågar efter: kunden, handlarens skicklighet, det kunden vill ha (q = kvaliteten), hur mycket kunden
// behöver ett slag (som Part.varde), relationen och hur mycket handlaren gillar kunden (−1 till 1)
export interface ArgLage { s: State; p: Person; byn: boolean; salj: boolean; kop: { k: string; q?: number }[]; varde: (k: string) => number; handel: number; hHandel: number; rel?: GastRel; gill: number }
// registret: id (mallen h_arg har varianter för det), vem som för fram det och när det finns i affären. Ordningen är
// ordningen i berättelsen
export const HANDELSARG: { id: string; vem: 'kund' | 'handlare'; om: (l: ArgLage) => boolean }[] = [
  { id: 'byn', vem: 'kund', om: l => l.byn },
  { id: 'kemiGod', vem: 'kund', om: l => (l.rel?.chem ?? 0) > ARG.kemi },
  { id: 'kemiDalig', vem: 'handlare', om: l => (l.rel?.chem ?? 0) < -ARG.kemi },
  { id: 'vanner', vem: 'kund', om: l => (l.rel?.n ?? 0) > 0 && l.gill > ARG.vanner },
  { id: 'fint', vem: 'handlare', om: l => !l.salj && l.kop.some(w => (w.q ?? NORMAL) > NORMAL) },
  { id: 'slitet', vem: 'kund', om: l => !l.salj && l.kop.some(w => (w.q ?? NORMAL) < NORMAL) },
  { id: 'behov', vem: 'handlare', om: l => !l.salj && l.kop.some(w => l.varde(w.k) >= ARG.behov) },
  { id: 'vinter', vem: 'handlare', om: l => foreIstiden(kalender(l.s).ai) },
  { id: 'istid', vem: 'kund', om: l => iIstiden(kalender(l.s).ai) },
  { id: 'smicker', vem: 'kund', om: l => stat(l.p, 'karisma', l.s.now) >= ARG.charm },
  { id: 'skicklig', vem: 'kund', om: l => l.handel >= l.hHandel + ARG.skicklig },
  { id: 'langt', vem: 'handlare', om: () => true }, // handlaren har alltid gått långt
];
export const ARG = balans('handelsber', {
  kemi: 0.4, // kemin (−1 till 1) från vilken de kom bra (eller dåligt) överens
  vanner: 0.2, // vänner sedan sist: de har gjort affärer förut och handlaren gillar kunden så här mycket (−1 till 1)
  behov: 2, // kunden saknar varan: hen behöver en till så här mycket (Part.varde; som DELA.saknar)
  charm: 13, // kunden smickrar från den här karisman
  skicklig: 3, // kunden pressar priset: så här många nivåer bättre i Handel än handlaren
  max: 3, // högst så här många argument i berättelsen
});

// argumenten i affären (svar i handel.ts): de som finns, i registrets ordning
export const handelsArg = (l: ArgLage) => HANDELSARG.filter(a => a.om(l)).map(a => a.id);

// berättelsen: inledningen, högst ARG.max argument (det sista om handlaren blev irriterad, annars handlarens "långa väg"
// bara när inget annat finns att säga), stämningen och slutet
export function handelBerattelse(s: State, b: ByteMinne): string {
  const f0 = b.forsok?.[0];
  if (!f0) return '';
  const salj = f0.vill[0]?.k === 'silver', vara = sakNamn((salj ? f0.bud : f0.vill)[0]?.k ?? '').toLowerCase();
  const nej = b.forsok!.filter(f => !f.ja).length, d = b.rel ? b.rel[1] - b.rel[0] : 0;
  const f = { kund: b.an, handlare: b.bn, vara, salj, byn: b.arg?.includes('byn') ?? false, bud: talOrd(b.forsok!.length), nej: talOrd(nej), nejTal: nej, upp: d > 0, ner: d < 0, avbruten: !!b.avbruten };
  let arg = (b.arg ?? []).filter(a => a !== 'langt');
  if (arg.length > ARG.max) arg = [...arg.slice(0, ARG.max - (arg.includes('irriterad') ? 1 : 0)), ...arg.includes('irriterad') ? ['irriterad'] : []];
  if (!arg.length && b.arg?.includes('langt')) arg = ['langt'];
  const mening = (mall: 'h_start' | 'h_arg' | 'h_stamning' | 'h_slut', i: number, g = {}) => { const x = { ...f, ...g }; return fyll(valjVariant(s, mall, b.nr * 16 + i, x, 0), x); };
  return [mening('h_start', 0), ...arg.map((a, i) => mening('h_arg', i + 1, { arg: a })), mening('h_stamning', 8), mening('h_slut', 9)].join(' ');
}
