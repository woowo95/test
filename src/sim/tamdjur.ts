// ---------- de tama djuren (fas 9.8, Djuren i detalj) ----------
// De tama djuren är rader i registret TAMDJUR, som de vilda arterna i DJUR (redskap.ts): hunden, fåren och getterna är
// individer med art, ålder, hunger och ägare (s.tamdjur), hönsen en flock (steg 9.8.10). Inga personligheter, ingen avel på
// egenskaper och inga djursjukdomar i fas 9. Ett djur ägs som ett redskap, av en person (agare) eller av byn (ingen agare), och
// ärvs som redskapen (arv.ts); byns rikedom räknar djuren (varde.ts). Djurskötsel är en färdighet som växer när man matar,
// mjölkar, klipper och vallar, så att någon blir byns herde. Allt stegas en gång i timmen (stepTamdjur, steg.ts), likadant i
// båda lägena, med byns följd 'tamdjur'.
import { balans } from './balans';
import { ALDER, ageOf, byId, count, forstaGang, gjort, living, log, ovning } from './folk';
import { getable, takeMaterial } from './behov';
import { rnd } from './slump';
import { DAY, Person, State } from './typer';

// en art av tamdjur. ord = en/ett, ett djur, flera, det bestämda; foder = det man matar djuret med, det bästa först (hela saker); bete = djuret betar i hagen (steg 9.8.4),
// och betet det helst äter; liv = hur många dygn (år i spelet) det lever, vuxen = när det är fullvuxet, varde = vad det är värt i
// silver (byns rikedom och arvet); ger = vad det ger (steg 9.8.5, 9.8.8, 9.8.14); id0 = djurens id börjar här (skilda från de vilda)
export interface TamArt { namn: string; ord: [string, string, string, string]; foder: readonly string[]; bete?: 'gras' | 'buskar'; liv: number; vuxen: number; varde: number; mattar: number; ikon: string }
export const TAMDJUR = {
  hund: { namn: 'Hund', ord: ['en', 'hund', 'hundar', 'hunden'], foder: ['slaktrens', 'kott', 'vargkott', 'gaddkott', 'braxkott'], liv: 12, vuxen: 1, varde: 30, mattar: 0.5, ikon: 'varg' },
  far: { namn: 'Får', ord: ['ett', 'får', 'får', 'fåret'], foder: [], bete: 'gras', liv: 10, vuxen: 1, varde: 25, mattar: 0.5, ikon: 'radjur' },
  get: { namn: 'Get', ord: ['en', 'get', 'getter', 'geten'], foder: [], bete: 'buskar', liv: 12, vuxen: 1, varde: 25, mattar: 0.5, ikon: 'radjur' },
} as const satisfies Record<string, TamArt>;
export type TamArtId = keyof typeof TAMDJUR;
export const TAM_LIST = Object.keys(TAMDJUR) as TamArtId[];
export const tamArt = (a: TamArtId): TamArt => TAMDJUR[a];

// ett tamdjur. hunger 0–1 (1 = svälter), svalt = timmar det svultit, agare = personen som äger det (ingen = byn), matad = hur
// mycket var och en matat det (hunden byter till den som matat mest, steg 9.8.3)
export interface Tamdjur { id: number; art: TamArtId; born: number; hunger: number; svalt?: number; agare?: number; x: number; y: number; matad?: Record<number, number>; lojal?: number; hage?: number; dog?: number }
export const TAM_ID0 = 900_000_000; // tamdjurens id ligger över alla vilda djurs (djur.ts)

export const TAM = balans('tamdjur', {
  hungerTim: 1 / 24, // hungern växer så här mycket i timmen: ett djur behöver äta en gång om dygnet
  matas: 0.5, // den som sköter djuren matar dem när hungern är minst så här stor
  svaltTim: 48, // ett djur som svultit (hunger 1) så här många timmar dör
  mataMin: 6, // minuter det tar att mata ett djur
  ovning: 0.04, // djurskötseln växer så här mycket när man matar
  mataR: 30, // den som sköter djuren går högst så här långt (rutor) för att mata dem
});

export const tamdjurOf = (s: State) => (s.tamdjur ??= []).filter(d => d.dog === undefined);
export const tamAlder = (s: State, d: Tamdjur) => (s.now - d.born) / DAY;
export const tamNamn = (d: Tamdjur) => tamArt(d.art).namn;
// ett nytt djur av arten, fött nu (eller born), ägt av agare
export function nyttTamdjur(s: State, art: TamArtId, x: number, y: number, agare?: number, born = s.now): Tamdjur {
  const l = (s.tamdjur ??= []), id = TAM_ID0 + l.reduce((m, d) => Math.max(m, d.id - TAM_ID0 + 1), 0);
  const d: Tamdjur = { id, art, born, hunger: 0, x, y, agare };
  l.push(d); count(s, `tam_${art}`);
  return d;
}
// djuret dör (av hunger, ålder eller ett rovdjur) och tas bort ur byn
export function tamDor(s: State, d: Tamdjur, orsak: string) {
  d.dog = s.now; s.tamdjur = (s.tamdjur ?? []).filter(q => q !== d);
  count(s, `tamDog_${orsak}`);
  const a = tamArt(d.art), q = d.agare !== undefined ? byId(s, d.agare) : undefined;
  log(s, `${q ? `${q.name}s ` : 'Byns '}${a.ord[1]} dog ${orsak === 'svalt' ? 'av hunger' : orsak === 'alder' ? 'av ålder' : orsak}.`, 'world', q ? [q.id] : []);
}
// vad djuret äter av det som finns, det bästa först (undefined: inget att ge det)
export const foderFor = (s: State, p: Person, d: Tamdjur) => tamArt(d.art).foder.find(k => getable(s, p, k) >= 1);

// en timme för djuren: hungern växer, det svultna och det gamla dör
export function stepTamdjur(s: State) {
  for (const d of tamdjurOf(s)) {
    d.hunger = Math.min(1, d.hunger + TAM.hungerTim);
    d.svalt = d.hunger >= 1 ? (d.svalt ?? 0) + 1 : 0;
    if (d.svalt >= TAM.svaltTim) { tamDor(s, d, 'svalt'); continue; }
    const a = tamArt(d.art), alder = tamAlder(s, d);
    if (alder > a.liv * 0.8 && rnd(s, 'tamdjur') < 1 / (a.liv * 0.4 * 24)) tamDor(s, d, 'alder');
  }
}

// ---------- att mata djuren ----------
// Den som äger ett hungrigt djur (eller den som sköter byns djur) och har foder ger det en sak foder. Djurskötseln växer
export function mataVal(s: State, p: Person) {
  if (ageOf(p, s.now) < ALDER.vuxen) return undefined;
  let b: Tamdjur | undefined, bd = Infinity;
  for (const d of tamdjurOf(s)) {
    if (d.hunger < TAM.matas || (d.agare !== undefined && d.agare !== p.id && byId(s, d.agare)?.died === undefined) || !foderFor(s, p, d)) continue;
    if (living(s).some(q => q !== p && q.task?.act === 'mata' && q.task.ref === d.id)) continue;
    const dd = Math.hypot(d.x - p.x, d.y - p.y) - d.hunger * 10;
    if (Math.hypot(d.x - p.x, d.y - p.y) <= TAM.mataR && dd < bd) { b = d; bd = dd; }
  }
  return b;
}
export function mataKlar(s: State, p: Person, ref?: number) {
  const d = tamdjurOf(s).find(q => q.id === ref);
  if (!d) return;
  const k = foderFor(s, p, d);
  if (!k) return;
  takeMaterial(s, p, k, 1);
  d.hunger = Math.max(0, d.hunger - tamArt(d.art).mattar * 2);
  (d.matad ??= {})[p.id] = (d.matad[p.id] ?? 0) + 1;
  ovning(p, 'skotsel', TAM.ovning); gjort(s, p, 'matat');
  if (forstaGang(s, 'matatDjur')) log(s, `${p.name} matade byns ${tamArt(d.art).ord[1]} för första gången.`, 'world', [p.id]);
}
// vad byns djur är värda (byns rikedom, varde.ts) och vad en persons djur är värda (förmögenheten)
export const djurVarde = (s: State, agare?: number) => tamdjurOf(s).reduce((a, d) => a + (agare === undefined || d.agare === agare ? tamArt(d.art).varde : 0), 0);
