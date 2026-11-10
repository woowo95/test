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
import { foodOf, put } from './lager';
import { stat } from './folk';
import { DAY, Person, State } from './typer';

// en art av tamdjur. ord = en/ett, ett djur, flera, det bestämda; foder = det man matar djuret med, det bästa först (hela saker); bete = djuret betar i hagen (steg 9.8.4),
// och betet det helst äter; liv = hur många dygn (år i spelet) det lever, vuxen = när det är fullvuxet, varde = vad det är värt i
// silver (byns rikedom och arvet); ger = vad det ger (steg 9.8.5, 9.8.8, 9.8.14); id0 = djurens id börjar här (skilda från de vilda)
export interface TamArt { namn: string; ord: [string, string, string, string]; foder: readonly string[]; bete?: 'gras' | 'buskar'; liv: number; vuxen: number; varde: number; mattar: number; ikon: string }
export const TAMDJUR = {
  hund: { namn: 'Hund', ord: ['en', 'hund', 'hundar', 'hunden'], foder: ['slaktrens', 'kott', 'vargkott', 'gaddkott', 'braxkott'], liv: 12, vuxen: 1, varde: 30, mattar: 0.5, ikon: 'varg' },
  far: { namn: 'Får', ord: ['ett', 'får', 'får', 'fåret'], foder: ['torrgras'], bete: 'gras', liv: 10, vuxen: 1, varde: 25, mattar: 0.5, ikon: 'radjur' },
  get: { namn: 'Get', ord: ['en', 'get', 'getter', 'geten'], foder: ['torrgras'], bete: 'buskar', liv: 12, vuxen: 1, varde: 25, mattar: 0.5, ikon: 'radjur' },
} as const satisfies Record<string, TamArt>;
export type TamArtId = keyof typeof TAMDJUR;
export const TAM_LIST = Object.keys(TAMDJUR) as TamArtId[];
export const tamArt = (a: TamArtId): TamArt => TAMDJUR[a];

// ett tamdjur. hunger 0–1 (1 = svälter), svalt = timmar det svultit, agare = personen som äger det (ingen = byn), matad = hur
// mycket var och en matat det (hunden byter till den som matat mest, steg 9.8.3)
export interface Tamdjur { id: number; art: TamArtId; born: number; hunger: number; svalt?: number; agare?: number; x: number; y: number; matad?: Record<number, number>; lojal?: number; hage?: number; dog?: number; ull?: number; mjolk?: number; fahus?: number; kyla?: number } // fahus = huset djuret står i under istiden, kyla = timmar ute i istiden (steg 9.8.9)
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
    if (alder > a.liv * 0.8 && rnd(s, 'tamdjur') < 1 / (a.liv * 0.4 * 24)) { tamDor(s, d, 'alder'); continue; }
    if (d.art === 'hund') stepHund(s, d);
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
  if (d.art === 'hund' && d.agare === p.id) d.lojal = Math.min(1, (d.lojal ?? HUND.start) + HUND.mata);
  ovning(p, 'skotsel', TAM.ovning); gjort(s, p, 'matat');
  if (forstaGang(s, 'matatDjur')) log(s, `${p.name} matade byns ${tamArt(d.art).ord[1]} för första gången.`, 'world', [p.id]);
}
// vad byns djur är värda (byns rikedom, varde.ts) och vad en persons djur är värda (förmögenheten)
export const djurVarde = (s: State, agare?: number) => tamdjurOf(s).reduce((a, d) => a + (agare === undefined || d.agare === agare ? tamArt(d.art).varde : 0), 0);

// ---------- vargvalpen blir hund (steg 9.8.2, Djuren i detalj: Hunden) ----------
// Det finns ingen lya: i sällsynta fall går en valp med vargflocken (VALP.chans när flocken kommer, varg.ts), och när jägarna
// fäller flocken står valpen kvar. Svälter byn äts valpen som de andra vargarna, för behovsstegen går alltid före. Annars vill
// den av jägarna som har mest Empati ta den hem, och det lyckas efter jaktfärdigheten; en valp som inte fångas springer bort
export const VALP = balans('valp', {
  chans: 0.15, // chansen att en flock (minst två vargar) har en valp med sig
  svalt: 2, // byn svälter när maten i förrådet är mindre än så här många saker per människa
  fanga0: 0.3, fangaJakt: 0.05, // chansen att fånga valpen: fanga0 + fangaJakt × jakten (högst 0,95)
  kott: 3, // så mycket vargkött valpen ger när den äts
  lojal: 0.6, // hundens lojalitet mot den som bar hem den
});
export function vargValp(s: State, jagare: Person[]) {
  if (!jagare.length) return;
  const namn = jagare.map(p => p.name);
  if (foodOf(s) < living(s).length * VALP.svalt) {
    put(s, 'vargkott', VALP.kott); count(s, 'valpAten');
    log(s, `Vargflocken hade en valp. Byn svalt, och ${namn[0]} dödade den för köttet.`, 'world', jagare.map(p => p.id));
    return;
  }
  const p = [...jagare].sort((a, b) => stat(b, 'empati', s.now) - stat(a, 'empati', s.now) || a.id - b.id)[0];
  if (rnd(s, 'tamdjur') >= Math.min(0.95, VALP.fanga0 + VALP.fangaJakt * p.skill.jakt)) {
    count(s, 'valpBort');
    log(s, `Vargflocken hade en valp. ${p.name} försökte fånga den, men den sprang ut i skogen.`, 'world', [p.id]);
    return;
  }
  const h = nyttTamdjur(s, 'hund', p.x, p.y, p.id, s.now - 0.2 * DAY);
  h.lojal = VALP.lojal; count(s, 'valpFangad');
  log(s, `Vargflocken hade en valp. ${p.name} fångade den och bar hem den. Den blev byns ${forstaGang(s, 'forstaHund') ? 'första ' : ''}hund.`, 'world', [p.id]);
}

// ---------- hundens lojalitet och följe (steg 9.8.3, Djuren i detalj: Hunden) ----------
// Hunden är lojal mot en enda person. Lojaliteten (0–1) växer när ägaren matar den och är nära, och sjunker när den är hungrig
// eller lämnas; ingen egen träning. Ju lojalare, desto oftare följer den ägaren. Under gränsen byter den till den som matat den
// mer än ägaren, eller rymmer till skogen och blir varg igen. Dör ägaren går den till den som matat den mest, annars rymmer den
export const HUND = balans('hund', {
  start: 0.5, // lojaliteten hos en hund som saknar ett tal
  mata: 0.08, // lojaliteten växer så här mycket när ägaren matar den
  nara: 0.004, // och så här mycket i timmen när ägaren är nära
  naraR: 6, // nära: inom så här många rutor
  lamnad: 0.002, // den sjunker så här mycket i timmen när ägaren är långt borta
  hungrig: 0.01, // och så här mycket i timmen när den är hungrig (hunger minst 0,7)
  grans: 0.15, // under den här lojaliteten byter den ägare eller rymmer
  byte: 0.4, // lojaliteten mot den nya ägaren
  folj: 2, // en hund som följer håller sig inom så här många rutor från ägaren
});
const hundRymmer = (s: State, d: Tamdjur, varfor: string) => {
  count(s, 'hundRymde');
  log(s, `${varfor} Hunden sprang ut i skogen och blev varg igen.`, 'world', d.agare !== undefined ? [d.agare] : []);
  tamDor(s, d, 'rymde');
};
// den som matat hunden mest och lever (inte ägaren)
const mestMatat = (s: State, d: Tamdjur, utom?: number) => Object.entries(d.matad ?? {}).map(([id, n]) => [Number(id), n] as const)
  .filter(([id, n]) => id !== utom && n > 0 && byId(s, id)?.died === undefined).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
export function stepHund(s: State, d: Tamdjur) {
  const p = d.agare !== undefined ? byId(s, d.agare) : undefined;
  if (!p || p.died !== undefined) {
    const ny = mestMatat(s, d, d.agare);
    if (!ny) { hundRymmer(s, d, p ? `${p.name} var död, och ingen annan hade matat hunden.` : 'Ingen tog hand om hunden.'); return; }
    const q = byId(s, ny[0])!;
    d.agare = q.id; d.lojal = HUND.byte; count(s, 'hundArv');
    log(s, `${p ? `${p.name}s` : 'Byns'} hund gick till ${q.name}, som hade matat den mest.`, 'world', [q.id]);
    return;
  }
  let l = d.lojal ?? HUND.start;
  const dist = Math.hypot(d.x - p.x, d.y - p.y);
  l += dist <= HUND.naraR ? HUND.nara : -HUND.lamnad;
  if (d.hunger >= 0.7) l -= HUND.hungrig;
  d.lojal = l = Math.max(0, Math.min(1, l));
  if (l < HUND.grans) {
    const ny = mestMatat(s, d, p.id), egen = d.matad?.[p.id] ?? 0;
    if (ny && ny[1] > egen) {
      const q = byId(s, ny[0])!;
      d.agare = q.id; d.lojal = HUND.byte; count(s, 'hundBytte');
      log(s, `${p.name}s hund slutade lyda hen och följer nu ${q.name}, som matat den mer.`, 'world', [p.id, q.id]);
    } else hundRymmer(s, d, `${p.name} tog inte hand om sin hund.`);
    return;
  }
  // följer ägaren så ofta som lojaliteten säger, annars stannar den där den är
  if (rnd(s, 'tamdjur') < l) {
    const v = rnd(s, 'tamdjur') * Math.PI * 2, r = rnd(s, 'tamdjur') * HUND.folj;
    d.x = p.x + Math.cos(v) * r; d.y = p.y + Math.sin(v) * r;
    count(s, 'hundFoljer');
  }
}


// ---------- vakthunden (steg 9.8.11, Djuren i detalj: Hunden) ----------
// En hund som är lojal nog vaktar: den hör och vädrar rovdjur och anfallare längre bort än vakten ser, också i mörker och dimma,
// och skäller. Skallet väcker ägaren, som ser faran och ropar, och väcker byn som vakten gör (varg.ts och rovare.ts: ses).
export const VAKTHUND = balans('vakthund', {
  lojal: 0.6, // hunden vaktar när lojaliteten är minst så här stor
  hor: 32, // hunden hör och vädrar faran inom så här många rutor, dag som natt
});
// en vakthund som hör faran (avst: avståndet från hunden till faran), och ägaren som hör den skälla, eller undefined
export function hundSkaller(s: State, avst: (d: Tamdjur) => number) {
  for (const d of tamdjurOf(s)) {
    if (d.art !== 'hund' || (d.lojal ?? HUND.start) < VAKTHUND.lojal || d.fahus !== undefined || d.agare === undefined || avst(d) >= VAKTHUND.hor) continue;
    const p = byId(s, d.agare);
    if (!p || p.died !== undefined) continue;
    count(s, 'hundSkallde');
    if (forstaGang(s, 'hundSkallde')) log(s, `${p.name}s hund skällde: den hade hört något ute i mörkret.`, 'world', [p.id]);
    return { hund: d, p };
  }
  return undefined;
}

// ---------- djuren i fara (steg 9.8.12) ----------
// betesdjuren som står ute (inte i fähuset): dem kan vargarna ta och rövarna driva bort
export const tamUte = (s: State) => tamdjurOf(s).filter(d => tamArt(d.art).bete && d.fahus === undefined);
// rövarna driver bort djuret: det är borta ur byn
export function tamStulen(s: State, d: Tamdjur) {
  s.tamdjur = (s.tamdjur ?? []).filter(q => q !== d);
  count(s, 'boskapStulen');
}
