// Gångfarten (steg 3.10.10). Allt som gör att någon går fortare eller långsammare är en rad i registret GANGFART, och farten
// är GANG.fart rutor i sekunden (en frisk vuxen på kort gräs eller en stig) gånger raderna. Kroppens rader (åldern, skadade
// ben och fötter, yrseln, att kravla och att bära någon) gäller hela vägen och räknas i kroppFaktor; markens rader (skog,
// gräs, sand, sten och saker på golvet) gäller rutan man går på (markFart och speedAt i vag.ts, som vägsökningen också
// frågar), och den smidiga tar igen en del av det marken tar, medan den klumpiga förlorar lika mycket mer (steg 3.7.6).
// Ingen går väldigt långsamt (steg 6.2.7): marken bromsar som mest till 0,75, barn och gamla går 0,75 av en vuxens fart, och
// skadade ben ger aldrig mindre än rorGolv. Den som inte kan gå kravlar i fast fart (krypFart, ungefär en ruta på två
// sekunder) som marken inte drar ner, och bara korta sträckor (kravlaMax; längre bort väntar hen på att bäras, val.ts).
// Personrutan visar raderna som drar ner farten just nu (gangDelar)
import { busksort } from './buskar';
import { balans } from './balans';
import { ALDER, ageOf, franMitt } from './folk';
import { kanGa, rorlighetSkador } from './halsa';
import { yrselFaktor } from './naring';
import { groundOf, tileOf } from './mark';
import { FOREST, Ground, HIGH, VAG, isSoil, markFart, speedAt } from './vag';
import { Person, State } from './typer';
import { SAKER } from './saker';
import { tingOf } from './agande';
import { snoPaMarken } from './vader';
import { snoSmalt } from './brand';
import { roofed } from './byggnad';

// Balanstalen (regel 8): farten för en frisk vuxen och det som gör den långsammare
export const GANG = balans('gang', {
  fart: 1.6, // rutor i sekunden för en frisk vuxen på kort gräs eller en stig
  fartBarn: 1.2, // ... för ett barn (under ALDER.gangBarn): 0,75 av en vuxens
  fartGammal: 1.2, // ... och för den gamla (över ALDER.gangGammal)
  rorGolv: 0.5, // skadade ben och fötter gör gången aldrig långsammare än så här (steg 3.10.10; förr 0,2, som händerna)
  krypFart: 0.3, // den som inte kan gå (HALSA.krypFel) kravlar med den här farten, i byn och i striden (steg 3.7.19), och marken drar inte ner den (steg 6.2.7)
  kravlaMax: 15, // ... men bara så här många rutor utanför byn; längre bort väntar hen på att bäras (steg 6.2.7)
  baraFart: 0.6, // den som bär någon går så här fort
  fartMark: [0, 0.9, 1, 1, 1, 0.9], // marken: vatten, sand, de två jordslagen, sten och torr sjöbotten (steg 3.8.2); som mest till 0,75 (steg 6.2.7)
  fartSkog: 0.75, // ... en ruta med skog
  fartUng: 0.85, // ... med ungskog
  fartHog: 0.9, // ... med högt gräs (kort gräs och stigar går man fortast på: 1)
  fartSaker: 0.9, // över lösa saker och högar på golvet (steg 2.3.6), gånger marken
  snoBroms: 0.05, // med snö på hela marken går man så här mycket långsammare ute; under tak inget (snöskorna tar bort det mesta, snoTar i PLAGG)
  smidTerr: 0.3, // i skog och snår (marken långsammare än 1) tar den smidiga igen så här stor del av det man förlorar, gånger (smidigheten − 10) / 10 (steg 3.7.6)
});

// en rad: namnet, symbolen och farten gånger detta (1 = ingen skillnad). kropp = gäller hela vägen; annars marken, för rutan i
// i marken g. text = vad det är just nu, när raden drar ner farten
export interface GangLage { s: State; p: Person; now: number; bar: boolean; g: Ground; i: number; sm: number }
interface GangRad { namn: string; tecken: string; kropp?: true; varde(l: GangLage): number; text?(l: GangLage): string }
const MARKNAMN = ['Vatten', 'Sand', 'Jord', 'Jord', 'Sten', 'Torr sjöbotten'];
// rutan utan saker och smidighet, och med (det steg.ts går med)
const utanSaker = (l: GangLage) => kanGa(l.p) ? markFart(l.g, l.i) || 1 : 1; // den som kravlar: marken drar inte ner farten
const medSaker = (l: GangLage) => utanSaker(l) * (kanGa(l.p) && l.g.lost?.[l.i] ? GANG.fartSaker : 1);
// snön på marken (steg 7.7.3): farten ute gånger detta, 1 när det inte ligger någon snö. Den som kravlar har redan sin fasta fart.
// Snöskorna tar bort det mesta (snoTar på plagget). Räknas en gång per gångsträcka; taket frågas för rutan (snoPaRutan)
export function snoFart(s: State, p: Person) {
  const sno = snoPaMarken(s);
  if (sno <= 0 || !kanGa(p)) return 1;
  let tar = 0;
  for (const t of tingOf(s)) if (t.bar === p.id) tar = Math.max(tar, SAKER[t.k]?.klad?.snoTar ?? 0);
  return 1 - GANG.snoBroms * sno * (1 - tar);
}
// runt en eld och vid en brand har snön smält (steg 10.2.51): bromsen gånger det som är kvar av snön på rutan
export const snoPaRutan = (s: State, p: Person, x: number, y: number) => { const f = snoFart(s, p); return f >= 1 || roofed(s, x, y) ? 1 : 1 - (1 - f) * (1 - snoSmalt(s, x, y)); };
export const GANGFART = {
  alder: { namn: 'Åldern', tecken: '🧒', kropp: true, varde: l => { const a = ageOf(l.p, l.now); return a < ALDER.gangBarn ? GANG.fartBarn / GANG.fart : a > ALDER.gangGammal ? GANG.fartGammal / GANG.fart : 1; }, text: l => ageOf(l.p, l.now) < ALDER.gangBarn ? 'Barn' : 'Gammal' },
  skador: { namn: 'Skadade ben och fötter', tecken: '🦵', kropp: true, varde: l => kanGa(l.p) ? rorlighetSkador(l.p) : 1 },
  yrsel: { namn: 'Yrsel (brist på mineraler)', tecken: '😵', kropp: true, varde: l => kanGa(l.p) ? yrselFaktor(l.p) : 1 },
  kryper: { namn: 'Kravlar: kan inte gå', tecken: '🐌', kropp: true, varde: l => kanGa(l.p) ? 1 : GANG.krypFart },
  bar: { namn: 'Bär någon', tecken: '🧍', kropp: true, varde: l => l.bar ? GANG.baraFart : 1 },
  mark: { namn: 'Marken', tecken: '🌲', varde: utanSaker, text: l => {
    const t = l.g.tiles[l.i];
    if (!isSoil(t)) return MARKNAMN[t] ?? 'Marken';
    return l.g.trees[l.i] >= FOREST ? 'Skog' : l.g.trees[l.i] >= VAG.ungskog ? 'Ungskog' : busksort(l.g, l.i)?.namn ?? (l.g.cover[l.i] >= HIGH ? 'Högt gräs' : 'Marken');
  } },
  sno: { namn: 'Snö på marken', tecken: '❄', varde: l => snoPaRutan(l.s, l.p, l.p.x, l.p.y) },
  saker: { namn: 'Saker på golvet', tecken: '📦', varde: l => kanGa(l.p) && l.g.lost?.[l.i] ? GANG.fartSaker : 1 },
  smidig: { namn: 'Smidigheten i skog och snår', tecken: '🤸', varde: l => { const sp0 = medSaker(l); return markFaktor(sp0, l.sm) / sp0; },
    text: l => l.sm > 0 ? 'Smidig: tar igen en del i skog och snår' : 'Klumpig: ännu långsammare i skog och snår' },
} satisfies Record<string, GangRad>;
export type GangOrsak = keyof typeof GANGFART;
const RADER = Object.values(GANGFART) as GangRad[], KROPP_RADER = RADER.filter(r => r.kropp);

// den smidigas del av det marken tar, för hela vägen; den klumpiga förlorar högst lika mycket som den smidigaste tar igen.
// Den som kravlar: 0 (marken räknas inte)
export const smidig = (p: Person, now: number) => kanGa(p) ? GANG.smidTerr * Math.max(-1, Math.min(1, franMitt(p, 'smidighet', now))) : 0;
// farten på rutan i marken g för den som går (1 för den som kravlar), med det den smidiga tar igen (steg.ts)
export const rutFart = (p: Person, g: Ground, i: number, sm: number) => kanGa(p) ? markFaktor(speedAt(g, i) || 1, sm) : 1;
// farten på rutan (speedAt i vag.ts, 1 i vatten), med det den smidiga tar igen
export const markFaktor = (sp0: number, sm: number) => sp0 < 1 ? Math.min(1, sp0 + (1 - sp0) * sm) : sp0;
// bär hen någon: en levande (bar), eller en död till graven (steg 8.5.1: grava på väg dit)
export const barKropp = (t: { bar?: number; act: string; phase: string } | undefined) => !!t && (t.bar !== undefined || t.act === 'grava' && t.phase === 'go');
// rutor i sekunden för kroppen: GANG.fart gånger kroppens rader (marken räknas för varje ruta i steg.ts)
export function kroppFart(p: Person, now: number, bar = false) {
  const l = { p, now, bar } as GangLage;
  let f = GANG.fart;
  for (const r of KROPP_RADER) f *= r.varde(l);
  return f;
}
// ... och som del av en frisk vuxens fart (1 = som en frisk vuxen som inte bär någon)
export const kroppFaktor = (p: Person, now: number, bar = false) => kroppFart(p, now, bar) / GANG.fart;
// personrutan: farten nu som del av en frisk vuxens på en stig, och raderna som ändrar den (v = farten gånger detta, minus 1)
export function gangDelar(s: State, p: Person) {
  const g = groundOf(s), i = tileOf(p.x, p.y);
  const l: GangLage = { s, p, now: s.now, bar: barKropp(p.task), g, i: Math.max(0, Math.min(g.tiles.length - 1, i)), sm: smidig(p, s.now) };
  const delar: { k: GangOrsak; namn: string; tecken: string; v: number }[] = [];
  let f = 1;
  for (const k of Object.keys(GANGFART) as GangOrsak[]) {
    const r: GangRad = GANGFART[k], v = r.varde(l);
    f *= v;
    if (Math.abs(v - 1) > 1e-9) delar.push({ k, namn: r.text?.(l) ?? r.namn, tecken: r.tecken, v: v - 1 });
  }
  return { fart: f, rutor: GANG.fart * f, delar };
}

// vakten i testerna (steg 9.2.101): den som ritas gående (kan gå, inte kravlar) ska inte röra sig under VAKT_DEL av en frisk
// vuxens fart om inte minst två saker saktar ner hen samtidigt (raderna i GANGFART som drar ner farten, och mörkret).
// steg.ts frågar lyss för varje bit av vägen när testerna satt den; i spelet är den tom
export const VAKT_DEL = 0.5;
export const gangVakt: { lyss?: (s: State, p: Person, rutor: number, mork: boolean) => void } = {};
export function gangLangsam(s: State, p: Person, rutor: number, mork: boolean): string | undefined {
  if (!kanGa(p) || rutor >= GANG.fart * VAKT_DEL) return undefined;
  const d = gangDelar(s, p).delar.filter(x => x.v < -1e-9), n = d.length + (mork ? 1 : 0);
  if (n >= 2) return undefined;
  return `${p.name} (${p.task?.act ?? 'inget'}) går ${rutor.toFixed(2)} rutor i sekunden: ${[...d.map(x => `${x.namn} ${Math.round((1 + x.v) * 100)} %`), ...(mork ? ['mörker'] : [])].join(', ') || 'inget saktar ner'}`;
}

// lek och sport (steg 9.2.91): man rör sig på platsen i sin vanliga gångfart (rutor i sekunden, kroppFart) till en ny punkt
// högst r rutor bort och står sedan still där tills nästa förflyttning, hellre än att glida runt mycket långsamt. Bara i bilden:
// punkterna kommer ur personens id och tiden t (millisekunder), så att bilden blir densamma varje gång
const lekHash = (a: number, b: number) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
export function lekGang(id: number, r: number, still: number, fart: number, t: number) {
  const L = still + 2 * r / Math.max(0.05, fart), k = t / 1000 + lekHash(id, 0.5) * L, i = Math.floor(k / L), u = k - i * L;
  const pkt = (j: number) => { const a = lekHash(id, j) * Math.PI * 2, d = r * Math.sqrt(lekHash(j, id + 0.3)); return { x: Math.cos(a) * d, y: Math.sin(a) * d }; };
  const a = pkt(i - 1), b = pkt(i), dist = Math.hypot(b.x - a.x, b.y - a.y), gang = dist / Math.max(0.05, fart);
  if (u >= gang) return { dx: b.x, dy: b.y, gar: false };
  const f = u / gang;
  return { dx: a.x + (b.x - a.x) * f, dy: a.y + (b.y - a.y) * f, gar: true };
}
