// ---------- priserna (fas 11.6, Flera samhällen: Priset och handeln mellan byar) ----------
// Priset räknas per sak, i två led. Varje sak hör till en varugrupp i registret VARUGRUPPER. Gruppens påslag följer bristen i
// hela gruppen (det byn vill ha i buffert delat med det den har), och sakens eget påslag följer hur saken har det jämfört med
// sin grupp. Priset är grundvärdet gånger gruppens påslag gånger sakens, alltid mellan PRIS.min och PRIS.max. Så gör en
// missväxt all mat dyr på en gång, medan brist på just salt bara gör saltet dyrt. Inget pris slumpas.
import { SAKER, SAK_LIST } from './saker';
import { grundvarde } from './varde';

export interface VarugruppDef {
  namn: string; ikon: string;
  mapp?: readonly string[]; // sakerna i de här mapparna hör hit, om inget annat säger något
  borjar?: readonly string[]; // sakerna vars id börjar så hör hit (går före mappen)
  saker?: readonly string[]; // de här sakerna hör hit (går före allt annat)
}
// varugrupperna (steg 11.6.1): kläderna hör till skinn och ull, smycken, tecken, masker och instrument till prydnad, och
// salt, malt, örter, salvor och rökelse till dryck och salt (det man kryddar, botar och firar med)
export const VARUGRUPPER = {
  mat: { namn: 'Mat', ikon: '🍖', mapp: ['Mat'], saker: ['korn', 'mjol', 'radjur', 'vildsvin', 'bjorn', 'slaktfar', 'slaktget', 'slaktko', 'slaktgris', 'vargdel', 'vildsvindel', 'radjurdel', 'bjorndel', 'varg', 'levfar', 'levget', 'levko', 'levoxe', 'levhast', 'kulting', 'levhons', 'rovfron', 'artfron', 'kalfron', 'linfron', 'jordgubbsplanta', 'appelplanta', 'kompost'] },
  bransle: { namn: 'Bränsle', ikon: '🔥', mapp: ['Bränsle'], saker: ['talg', 'brannolja', 'bivax'] },
  sten: { namn: 'Sten och flinta', ikon: '🪨', mapp: ['Sten'], saker: ['huggen_sten'] },
  skinn: { namn: 'Skinn och ull', ikon: '🧶', mapp: ['Kläder'], saker: ['remsa', 'skinn', 'farskinn', 'getskinn', 'svinskinn', 'kohud', 'vitskinn', 'vargskinn', 'radjursskinn', 'bjornskinn', 'lader', 'pergament', 'ull', 'ulltrad', 'ylle', 'fjadrar', 'lin', 'ratlin', 'lintyg'] },
  virke: { namn: 'Virke och rep', ikon: '🪵', saker: ['rep', 'trad', 'virke', 'plankor', 'tjara', 'benlim', 'mossa'] },
  redskap: { namn: 'Redskap och vapen', ikon: '🪓', mapp: ['Redskap'], saker: ['ben', 'djurhorn'] },
  dryck: { namn: 'Dryck och salt', ikon: '🧂', saker: ['salt', 'malt', 'rolleka', 'salva', 'tval', 'rokelse'] },
  prydnad: { namn: 'Prydnad', ikon: '📿', borjar: ['tecken_', 'halsband_', 'mask_'], saker: ['vargtand', 'blomma', 'leksak', 'trumma', 'benflojt', 'lyra', 'boll', 'bok'] },
} as const satisfies Record<string, VarugruppDef>;
export type VarugruppId = keyof typeof VARUGRUPPER;
export const VARUGRUPP_IDS = Object.keys(VARUGRUPPER) as VarugruppId[];

// sakerna som har ett pris: allt med ett grundvärde utom silvret, som är priset självt
let medPris: string[] | undefined;
export const sakerMedPris = () => medPris ??= SAK_LIST.filter(k => k !== 'silver' && grundvarde(k) > 0);
// varje saks grupp, räknad en gång: först sakerna som står uppräknade, sedan början på id:t, sist mappen
let grupp: Map<string, VarugruppId> | undefined;
function gruppKarta() {
  if (grupp) return grupp;
  const g = new Map<string, VarugruppId>(), D: Record<VarugruppId, VarugruppDef> = VARUGRUPPER;
  for (const k of SAK_LIST) {
    const id = VARUGRUPP_IDS.find(v => D[v].saker?.includes(k)) ?? VARUGRUPP_IDS.find(v => D[v].borjar?.some(b => k.startsWith(b)))
      ?? VARUGRUPP_IDS.find(v => D[v].mapp?.includes(SAKER[k]?.mapp ?? ''));
    if (id) g.set(k, id);
  }
  return grupp = g;
}
// gruppen saken k hör till (undefined för det som inte har något pris)
export const gruppAv = (k: string): VarugruppId | undefined => gruppKarta().get(k);
// sakerna i gruppen g som har ett pris
const iGrupp = new Map<VarugruppId, string[]>();
export function sakerIGrupp(g: VarugruppId): string[] {
  let l = iGrupp.get(g);
  if (!l) iGrupp.set(g, l = sakerMedPris().filter(k => gruppAv(k) === g));
  return l;
}
