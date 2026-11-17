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

// ---------- huvudbyns pris per sak (steg 11.6.2) ----------
// Bristen är det byn vill ha i buffert delat med det den har, med PRIS.utjamna lagt till båda (så att ett tomt förråd inte ger
// ett oändligt pris), upphöjt till PRIS.elast. Maten och bränslet räknas i dygn (förrådsmålen i forradsmal.ts: bufferten mot
// det förrådet räcker till); de andra grupperna i grundvärde, summerat över sakerna byn har ett mål för (materialen efter
// förbrukningen, redskapen och kläderna efter REDSKAPMAL). En sak utan eget mål följer sin grupp. Priset är grundvärdet gånger
// gruppens påslag gånger sakens, där sakens påslag är sakens brist delad med gruppens; så länge inget tak nås blir priset
// sakens egen brist, och då höjer brist på en sak bara den, medan brist i hela gruppen höjer alla.
import { balans } from './balans';
import { clamp } from './slump';
import { State } from './typer';
import { amountOf } from './lager';
import { arMaterial, buffert, materialBuffert, REDSKAPMAL, villAv, Materialslag } from './forradsmal';
import { foodDaysAll } from './ekonomi';
import { woodDays } from './eld';
import { gruppOf } from './saker';

export const PRIS = balans('pris', {
  min: 0.5, max: 2.5, // priset (och vart och ett av påslagen) håller sig mellan de här, gånger grundvärdet
  elast: 0.5, // bristen upphöjd till så mycket blir påslaget: dubbelt så stor brist gör priset ungefär 1,4 gånger högre
  utjamna: 1, // läggs till både det byn vill ha och det den har (i saker, dygn eller grundvärde)
});
const paslag = (vill: number, har: number) => clamp(((vill + PRIS.utjamna) / (har + PRIS.utjamna)) ** PRIS.elast, PRIS.min, PRIS.max);

// redskapsgrupperna (gruppOf) och sakerna i dem som har ett pris
let redGrupper: Map<string, string[]> | undefined;
const iRedGrupp = (g: string) => (redGrupper ??= sakerMedPris().reduce((m, k) => { const r = gruppOf(k); if (r in REDSKAPMAL) m.set(r, [...(m.get(r) ?? []), k]); return m; }, new Map<string, string[]>())).get(g) ?? [];
// det byn vill ha och har av saken k (i saker), eller undefined när byn inte har något mål för den
export function villOchHar(s: State, k: string): [number, number] | undefined {
  if (arMaterial(k)) return [materialBuffert(s, k as Materialslag), amountOf(s, k)];
  const g = gruppOf(k);
  if (g in REDSKAPMAL) return [villAv(s, g), iRedGrupp(g).reduce((n, x) => n + amountOf(s, x), 0)];
  return undefined;
}
// gruppens brist i huvudbyn: [vill, har]
export function gruppBrist(s: State, g: VarugruppId): [number, number] {
  if (g === 'mat') return [buffert(s, 'mat'), foodDaysAll(s)];
  if (g === 'bransle') return [buffert(s, 'ved'), woodDays(s)];
  let vill = 0, har = 0;
  for (const k of sakerIGrupp(g)) {
    const vh = villOchHar(s, k);
    if (!vh) continue;
    const v = grundvarde(k);
    vill += vh[0] * v; har += vh[1] * v;
  }
  return [vill, har];
}
// gruppens påslag i huvudbyn
export const gruppPaslag = (s: State, g: VarugruppId) => { const [v, h] = gruppBrist(s, g); return paslag(v, h); };
// sakens eget påslag i huvudbyn: sakens brist mot gruppens, 1 för en sak utan eget mål (mat och bränsle räknas som grupp)
export function sakPaslag(s: State, k: string, gp = gruppPaslag(s, gruppAv(k)!)): number {
  const g = gruppAv(k);
  if (!g || g === 'mat' || g === 'bransle') return 1;
  const vh = villOchHar(s, k);
  return vh ? clamp(paslag(vh[0], vh[1]) / gp, PRIS.min, PRIS.max) : 1;
}
// priset i huvudbyn som påslag på grundvärdet (1 = grundvärdet), mellan PRIS.min och PRIS.max
export function byPaslag(s: State, k: string): number {
  const g = gruppAv(k);
  if (!g) return 1;
  const gp = gruppPaslag(s, g);
  return clamp(gp * sakPaslag(s, k, gp), PRIS.min, PRIS.max);
}
// priset i silver
export const byPris = (s: State, k: string) => grundvarde(k) * byPaslag(s, k);
