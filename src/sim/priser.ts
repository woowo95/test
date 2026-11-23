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
  andel: number; // så stor del av en rads rikedom utom husen vill byn ha i gruppen (maten räknas i portioner för sig)
}
// varugrupperna (steg 11.6.1): kläderna hör till skinn och ull, smycken, tecken, masker och instrument till prydnad, och
// salt, malt, örter, salvor och rökelse till dryck och salt (det man kryddar, botar och firar med)
export const VARUGRUPPER = {
  mat: { andel: 0, namn: 'Mat', ikon: '🍖', mapp: ['Mat'], saker: ['korn', 'mjol', 'radjur', 'vildsvin', 'bjorn', 'slaktfar', 'slaktget', 'slaktko', 'slaktgris', 'vargdel', 'vildsvindel', 'radjurdel', 'bjorndel', 'varg', 'levfar', 'levget', 'levko', 'levoxe', 'levhast', 'kulting', 'levhons', 'rovfron', 'artfron', 'kalfron', 'linfron', 'jordgubbsplanta', 'appelplanta', 'kompost'] },
  bransle: { andel: 0.1, namn: 'Bränsle', ikon: '🔥', mapp: ['Bränsle'], saker: ['talg', 'brannolja', 'bivax'] },
  sten: { andel: 0.08, namn: 'Sten och flinta', ikon: '🪨', mapp: ['Sten'], saker: ['huggen_sten'] },
  skinn: { andel: 0.25, namn: 'Skinn och ull', ikon: '🧥', mapp: ['Kläder'], saker: ['remsa', 'skinn', 'farskinn', 'getskinn', 'svinskinn', 'kohud', 'vitskinn', 'vargskinn', 'radjursskinn', 'bjornskinn', 'lader', 'pergament', 'ull', 'ulltrad', 'ylle', 'fjadrar', 'lin', 'ratlin', 'lintyg'] },
  virke: { andel: 0.15, namn: 'Virke och rep', ikon: '🌲', saker: ['rep', 'trad', 'virke', 'plankor', 'tjara', 'benlim', 'mossa', 'las'] },
  redskap: { andel: 0.25, namn: 'Redskap och vapen', ikon: '🪓', mapp: ['Redskap'], saker: ['ben', 'djurhorn'] },
  dryck: { andel: 0.07, namn: 'Dryck och salt', ikon: '🧂', saker: ['salt', 'malt', 'rolleka', 'torrrolleka', 'salva', 'tval', 'rokelse', 'mara', 'vejde', 'vejdefron', 'krapp'] },
  prydnad: { andel: 0.1, namn: 'Prydnad', ikon: '✨', borjar: ['tecken_', 'halsband_', 'mask_'], saker: ['vargtand', 'blomma', 'leksak', 'trumma', 'benflojt', 'lyra', 'boll', 'bok'] },
} as const satisfies Record<string, VarugruppDef>;
export type VarugruppId = keyof typeof VARUGRUPPER;
// en prislärdom om en hel grupp har slaget "grupp:mat" (prisminnet, steg 11.6.4)
export const GRUPP = 'grupp:';
export const gruppSlag = (g: VarugruppId) => GRUPP + g;
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
import { gruppOf, isFood } from './saker';

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

// ---------- bristen i raden (steg 11.6.3) ----------
// En by i världen sparar gruppernas tillgång (r.varor, i grundvärde, utom maten som är radens mat i portioner) och husen
// (r.hus); rikedomen är summan. Byn vill ha sin rikedom utom husen fördelad efter gruppernas andel, och maten för PRIS.matDygn
// dygn. Samma formel som i huvudbyn: gruppens påslag ur bristen, gånger sakens eget. En sak har ett eget påslag bara när den
// avviker från sin grupp (r.egen): det som är sällsynt på byns mark börjar högre (PRIS.sallsynt) och det marken ger mycket av
// lägre (PRIS.vanligt), och det byn nyss köpt eller sålt flyttas (PRIS.salt per silver i värde). Varje dygn glöms det eget
// påslaget mot det marken ger med PRIS.glom av vägen, och en post som nått det tas bort. Inget pris slumpas.
import { VarldRad, radNr } from './radtal';
import { MARK_IDS, VARLDMARK } from './varldmark';
import { varldMark } from './varlden';
import { Varlden } from './varlden';
import { PERIODRADER } from './varldslag';
import { prisKrok } from './klaner';
import { portionerPerDygn, rikMal } from './rad';

export const RADPRIS = balans('radpris', {
  husAndel: 0.5, // så stor del av en rads rikedom är husen
  portion: 0.5, // en portion mat i grundvärde
  matDygn: 20, // en by i världen vill ha mat för så många dygn (år i spelet)
  sallsynt: 0.5, // det som är sällsynt på byns mark kostar så här mycket mer
  vanligt: 0.25, // det marken ger mycket av kostar så här mycket mindre
  salt: 0.01, // det byn köper sänker dess pris så här mycket per silver i värde, och det den säljer höjer det
  glom: 0.1, // det egna påslaget går så stor del av vägen tillbaka mot markens per dygn (ett år i spelet)
  markProd: 1, // en by gör så mycket mer i en grupp för varje sak i den som marken ger mycket av (och mindre för en sällsynt) (steg 11.6.7)
});
const ovriga = () => VARUGRUPP_IDS.filter(g => g !== 'mat');
// gruppernas tillgång ur rikedomen, för en rad som inte har några (en rad från före v532, en ny rad)
export function radVaror(r: VarldRad): Partial<Record<string, number>> {
  if (r.varor && r.hus !== undefined) return r.varor;
  const rik = r.tal.rikedom, hus = Math.round(rik * RADPRIS.husAndel), v: Partial<Record<string, number>> = {};
  let kvar = rik - hus;
  const D: Record<VarugruppId, VarugruppDef> = VARUGRUPPER;
  for (const g of ovriga()) { const n = Math.floor((rik - hus) * D[g].andel); v[g] = n; kvar -= n; }
  v.redskap = (v.redskap ?? 0) + kvar; // det som blir över av avrundningen
  r.hus = hus;
  return r.varor = v;
}
// rikedomen ur delarna
export const radRikedomUr = (r: VarldRad) => (r.hus ?? 0) + ovriga().reduce((n, g) => n + (r.varor?.[g] ?? 0), 0);
// det en by i världen vill ha i varje grupp, i samma mått som tillgången
export const radVill = (r: VarldRad, g: VarugruppId, rikMal: number) => g === 'mat' ? r.tal.folk * portionerPerDygn() * RADPRIS.matDygn : rikMal * (1 - RADPRIS.husAndel) * (VARUGRUPPER as Record<VarugruppId, VarugruppDef>)[g].andel;
export const radHar = (r: VarldRad, g: VarugruppId) => g === 'mat' ? r.tal.mat : radVaror(r)[g] ?? 0;
// förrådet i en rad (kodgenomgången, fynd 221): ta ur (aldrig under noll), lägga till, det som är över vad byn vill ha, och
// varugruppen en sak räknas i (det som inte hör till någon grupp är redskap)
export const radTaUr = (r: VarldRad, g: VarugruppId, n: number) => {
  if (g === 'mat') { r.tal.mat = Math.max(0, r.tal.mat - n); return; }
  const v = radVaror(r); v[g] = Math.max(0, (v[g] ?? 0) - n); r.tal.rikedom = radRikedomUr(r);
};
export const radLaggTill = (r: VarldRad, g: VarugruppId, n: number) => radTaUr(r, g, -n);
export const radOverskott = (r: VarldRad, g: VarugruppId) => Math.floor(radHar(r, g) - radVill(r, g, rikMal(r)));
export const sakGrupp = (sak: string): VarugruppId => gruppAv(sak) ?? 'redskap';
// det marken där byn ligger ger mycket av och har sällsynt: sakens påslag när inget annat hänt
const markCache = new WeakMap<VarldRad, { x?: number; y?: number; m?: { vanligt: readonly string[]; sallsynt: readonly string[] } }>();
function radMark(s: State, r: VarldRad) {
  let c = markCache.get(r);
  if (!c || c.x !== r.x || c.y !== r.y) {
    const v = varldMark(s);
    c = { x: r.x, y: r.y, m: v && r.x !== undefined && r.y !== undefined ? VARLDMARK[MARK_IDS[v.mark[r.y * v.w + r.x]]] : undefined };
    markCache.set(r, c);
  }
  return c.m;
}
// marken där byn ligger (VARLDMARK), eller inget utan världskarta
export function radMarkId(s: State, r: VarldRad): string | undefined {
  const v = varldMark(s);
  return v && r.x !== undefined && r.y !== undefined ? MARK_IDS[v.mark[r.y * v.w + r.x]] : undefined;
}
export function markPaslag(s: State, r: VarldRad, k: string): number {
  const m = radMark(s, r), sall = m ? m.sallsynt : r.syn?.sallsynt;
  return sall?.includes(k) ? 1 + RADPRIS.sallsynt : m?.vanligt.includes(k) ? 1 - RADPRIS.vanligt : 1;
}
// hur mycket byn gör i gruppen g jämfört med det den vill ha: mer för varje sak i gruppen som marken ger mycket av, mindre för
// varje sällsynt (steg 11.6.7)
export function markGrupp(s: State, r: VarldRad, g: VarugruppId): number {
  const m = radMark(s, r);
  if (!m) return 1;
  const n = m.vanligt.filter(k => gruppAv(k) === g).length - m.sallsynt.filter(k => gruppAv(k) === g).length;
  return clamp(1 + RADPRIS.markProd * n, 0.25, 3);
}
// gruppens påslag i en by i världen (huvudbyns rad räknas ur byn)
export function radGruppPaslag(s: State, r: VarldRad, g: VarugruppId): number {
  if (r.nr === s.varld?.huvud) return gruppPaslag(s, g);
  return paslag(radVill(r, g, rikMal(r)), radHar(r, g));
}
// sakens eget påslag i raden: posten om den finns, annars det marken ger
export const radSakPaslag = (s: State, r: VarldRad, k: string) => r.egen?.[k] ?? markPaslag(s, r, k);
// priset på saken k i raden som påslag på grundvärdet, mellan PRIS.min och PRIS.max
export function radPaslag(s: State, r: VarldRad, k: string): number {
  if (r.nr === s.varld?.huvud) return byPaslag(s, k);
  const g = gruppAv(k);
  if (!g) return 1;
  return clamp(radGruppPaslag(s, r, g) * radSakPaslag(s, r, k), PRIS.min, PRIS.max);
}
// byn i raden köper (upp = -1) eller säljer (upp = 1) saken k för värdet varde: dess eget påslag flyttas
export function radPrisAndras(s: State, r: VarldRad, k: string, varde: number, upp: 1 | -1) {
  if (r.nr === s.varld?.huvud || !gruppAv(k)) return;
  const v = clamp(radSakPaslag(s, r, k) + upp * RADPRIS.salt * varde, PRIS.min, PRIS.max);
  satt(s, r, k, v);
}
function satt(s: State, r: VarldRad, k: string, v: number) {
  v = Math.round(v * 1000) / 1000;
  if (Math.abs(v - markPaslag(s, r, k)) < 1e-9) { if (r.egen) { delete r.egen[k]; if (!Object.keys(r.egen).length) delete r.egen; } }
  else (r.egen ??= {})[k] = v;
}
// för scenarierna: priset på k i raden blir v (så långt det egna påslaget räcker)
export function sattRadPris(s: State, r: VarldRad, k: string, v: number) { const g = gruppAv(k); if (g) (r.egen ??= {})[k] = v / radGruppPaslag(s, r, g); }
// en gång om dygnet (ett år i spelet): de egna påslagen glöms mot markens, minst en tusendel
export function radPrisGlom(s: State, vl: Varlden) {
  for (const r of vl.rader ?? []) {
    if (!r.egen) continue;
    for (const k of Object.keys(r.egen)) {
      const v = r.egen[k], mal = markPaslag(s, r, k), d = mal - v;
      satt(s, r, k, Math.abs(d) <= 0.001 ? mal : v + Math.sign(d) * Math.max(0.001, Math.abs(d) * RADPRIS.glom));
    }
  }
}
PERIODRADER.push({ namn: 'radens priser', period: 'dygn', fn: (s, vl) => radPrisGlom(s, vl) });
// priset i en rad med numret nr
// raden r får n av saken k (n < 0: ger bort): maten i portioner, det andra i gruppens tillgång efter grundvärdet, och
// rikedomen följer. Silvret är radens silver
// ett rövarläger behåller det värdefulla det tagit som det är (steg 11.13.27, vaktat.ts)
export const radTarKrok = { behall: (_r: VarldRad, _k: string, _n: number) => false };
export function radTar(r: VarldRad, k: string, n: number) {
  if (!n) return;
  if (n > 0 && radTarKrok.behall(r, k, n)) return;
  if (k === 'silver') { r.tal.silver = Math.max(0, r.tal.silver + n); return; }
  const g = gruppAv(k);
  if (!g) return;
  if (g === 'mat') { r.tal.mat = Math.max(0, r.tal.mat + (isFood(k) ? n : Math.round(n * grundvarde(k) / RADPRIS.portion))); return; } // utsäde, plantor och levande djur räknas i portioner efter värdet
  const v = radVaror(r);
  v[g] = Math.max(0, (v[g] ?? 0) + Math.round(n * grundvarde(k)));
  r.tal.rikedom = radRikedomUr(r);
}

// klaner.ts frågar priserna genom sina krokar (minne.ts och handel.ts laddas före den här filen)
prisKrok.pris = (s, r, slag) => radPaslag(s, r, slag);
prisKrok.andras = (s, r, slag, varde, upp) => radPrisAndras(s, r, slag, varde, upp);
prisKrok.satt = (s, r, slag, v) => sattRadPris(s, r, slag, v);
prisKrok.radPris = (s, nr, sl) => { const r = radNr(s.varld ?? {}, nr); return !r ? 1 : sl.startsWith(GRUPP) ? radGruppPaslag(s, r, sl.slice(GRUPP.length) as VarugruppId) : radPaslag(s, r, sl); };
prisKrok.grupp = k => gruppAv(k);
prisKrok.gruppNamn = id => (VARUGRUPPER as Record<string, VarugruppDef>)[id]?.namn ?? id;
