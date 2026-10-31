// Kläderna (steg 3.10.12, "Plagg och material" i designdokumentet): ett klädesplagg är ett plagg av ett material. Plaggen
// står i PLAGG: platsen på kroppen (PLATSER i utrustning.ts), hur mycket material det tar (mangd, i bitar: ett kaninskinn är
// en bit, ett vargskinn två), vad mer det sys med (med), hur varmt och slitstarkt det är i sig, vad det väger, tekniken och
// tiden, vilka slags material det kan göras av och vad det skyddar i striden (SKYDD i strid.ts). Materialen står i
// KLADMATERIAL: saken i förrådet (saker.ts), slaget, och hur mycket varmare, slitstarkare, tyngre och mer skyddande det är än
// ett kaninskinn. Varje plagg av varje material som passar blir en sak i saker.ts (kladSaker): rock_vargskinn heter "Rock
// av vargskinn", och dess värme, hållbarhet och vikt är plaggets tal gånger materialets. Värdet räknas ur receptet
// (varde.ts), och kvaliteten läggs ovanpå (kvalitet.ts). Ett nytt material (björnskinn, läder, ull) blir en rad i KLADMATERIAL
// och kan genast bli alla plagg av sitt slag; ett nytt plagg blir en rad i PLAGG och en handling (handlingar.ts) med
// plaggets nyckel. Bilden är plaggets ritning i materialets färger (ikoner.ts).
// Den som syr väljer material (valMaterial) i ordningen kylan, striden, det som saknas, det som finns gott om, värdet och
// sist smak och anseende ("Valet av material"); läget tas fram i redskap.ts (materialLage). Filen frågar inget annat i
// spelet, så att saker.ts kan läsa den när sakerna läggs upp.
import type { Kroppsdel } from './halsa';
import type { SakDef } from './saker';
import { balans } from './balans';

export const KLADER = balans('klader', {
  vinterVarm: 1.5, // ett material minst så här varmt (gånger kaninskinnet) håller bäraren varm nog när kylan kommer (punkt 1)
  hotTim: 48, // vargar sedda nära byn eller en strid i byn för högst så här många timmar sedan: byn hotas (punkt 2)
  gottOm: 2, // det finns gott om ett material när det räcker till så här många plagg till, utöver det som behövs (punkt 4)
  dyrt: 1.5, // ett plagg som kostar så här många gånger det billigaste är dyrt och sparas (punkt 5)
  skyddTak: 0.9, // ett plagg tar som mest så här stor del av en skada (kodgenomgången 3.10.25: talet stod löst)
});

export type MaterialSlag = 'skinn' | 'lader' | 'tyg' | 'flatat';
type Skadeslag = 'hugg' | 'stick' | 'slag' | 'bett';
// ett plagg. namn = hur plagget börjar ("Rock" i "Rock av vargskinn"), ord = i en mening ("en rock", "ett par skor"),
// verb = vad den som gör det gör, plats = platsen på kroppen, mangd = bitar material, med = det mer plagget görs med (hela
// saker), varme = så stor del mindre kyla av ett kaninskinn, dygn = hur många dygn (år i spelet) det håller på kroppen, vikt =
// kg av ett kaninskinn, min = minuters arbete, krok = redskapet hänger i plagget när man bär (bältet, steg 2.3.3), tung = svårt
// att ducka i (STRID.duckTung), skydd = kroppsdelarna det täcker och hur stor del av skadan det tar per slag i ett kaninskinn
interface PlaggDef {
  namn: string; ord: string; verb: 'Syr' | 'Flätar'; plats: string; mangd: number; med?: Record<string, number>;
  varme: number; dygn: number; vikt: number; tek: string; min: number; slag: MaterialSlag[];
  krok?: true; tung?: true; skydd?: { delar: Kroppsdel[]; tar: Partial<Record<Skadeslag, number>> };
  forsta: string; fame?: string; // loggen första gången ({namn} = den som gjorde det, {plagg} = plaggets namn i en mening) och det hen minns för
}
const PLAGG_DEF = {
  rock: { namn: 'Rock', ord: 'en rock', verb: 'Syr', plats: 'yttre', mangd: 3, med: { rep: 1 }, varme: 0.25, dygn: 4, vikt: 2, tek: 'skinnklader', min: 5, slag: ['skinn'], tung: true,
    skydd: { delar: ['bal', 'armV', 'armH'], tar: { hugg: 0.25, stick: 0.15, slag: 0.2, bett: 0.3 } },
    forsta: '{namn} sydde byns första {plagg}. Den som har den på sig fryser mindre.', fame: 'Sydde byns första {plagg}' },
  skor: { namn: 'Skor', ord: 'ett par skor', verb: 'Syr', plats: 'fotter', mangd: 1, med: { rep: 1 }, varme: 0.1, dygn: 3, vikt: 0.6, tek: 'skinnklader', min: 5, slag: ['skinn'],
    skydd: { delar: ['fotV', 'fotH'], tar: { hugg: 0.2, stick: 0.2, slag: 0.1, bett: 0.3 } },
    forsta: '{namn} sydde byns första par {plagg}.' },
  balte: { namn: 'Bälte', ord: 'ett bälte', verb: 'Flätar', plats: 'balte', mangd: 2, varme: 0, dygn: 10, vikt: 0.2, tek: 'balte', min: 5, slag: ['flatat'], krok: true,
    forsta: '{namn} flätade byns första {plagg}. Redskapet hänger i det, och båda händerna är fria att bära med.' },
} satisfies Record<string, PlaggDef>;
export type Plagg = keyof typeof PLAGG_DEF;
export const PLAGG: Record<Plagg, PlaggDef> = PLAGG_DEF;
export const PLAGG_LIST = Object.keys(PLAGG_DEF) as Plagg[];

// ett material. sak = saken i förrådet, namn = i plaggets namn ("av vargskinn"), bit = hur många bitar en sak räcker till,
// varme/hallbar/vikt/skydd = gånger kaninskinnets. Värdet är sakens (varde.ts)
interface MaterialDef { sak: string; namn: string; slag: MaterialSlag; bit: number; varme: number; hallbar: number; vikt: number; skydd: number }
const KLADMATERIAL_DEF = {
  kaninskinn: { sak: 'skinn', namn: 'harskinn', slag: 'skinn', bit: 1, varme: 1, hallbar: 1, vikt: 1, skydd: 1 },
  vargskinn: { sak: 'vargskinn', namn: 'vargskinn', slag: 'skinn', bit: 2, varme: 1.8, hallbar: 1, vikt: 1.5, skydd: 1.2 }, // tjockare än kaninens (steg 3.7.14): varmare, tyngre och skyddar mer
  rep: { sak: 'rep', namn: 'rep', slag: 'flatat', bit: 1, varme: 1, hallbar: 1, vikt: 1, skydd: 1 },
} satisfies Record<string, MaterialDef>;
export type KladMaterial = keyof typeof KLADMATERIAL_DEF;
export const KLADMATERIAL: Record<KladMaterial, MaterialDef> = KLADMATERIAL_DEF;
export const KLADMATERIAL_LIST = Object.keys(KLADMATERIAL_DEF) as KladMaterial[];

// plaggen av varje material som passar: nyckeln i saker.ts, plagget och materialet
export const kladNyckel = (pl: Plagg, m: KladMaterial) => `${pl}_${m}`;
export const KLADER_AV: { k: string; plagg: Plagg; mat: KladMaterial }[] = PLAGG_LIST.flatMap(pl => KLADMATERIAL_LIST.filter(m => PLAGG[pl].slag.includes(KLADMATERIAL[m].slag)).map(m => ({ k: kladNyckel(pl, m), plagg: pl, mat: m })));
const AV = new Map(KLADER_AV.map(r => [r.k, r]));
export const kladAv = (k: string) => AV.get(k);
// så många saker av materialet plagget tar (hela saker: ett vargskinn räcker till två bitar)
export const materialTill = (pl: Plagg, m: KladMaterial) => Math.ceil(PLAGG[pl].mangd / KLADMATERIAL[m].bit);
// receptet: materialet och det mer plagget görs med
export const receptAv = (pl: Plagg, m: KladMaterial): Record<string, number> => {
  const r: Record<string, number> = { ...(PLAGG[pl].med ?? {}) }, sak = KLADMATERIAL[m].sak;
  r[sak] = (r[sak] ?? 0) + materialTill(pl, m);
  return r;
};
export const kladNamn = (pl: Plagg, m: KladMaterial) => `${PLAGG[pl].namn} av ${KLADMATERIAL[m].namn}`;
// det plagget skyddar i striden: plaggets skydd gånger materialets, aldrig mer än det mesta en träff kan tas (0,9)
export function kladSkyddStrid(k: string) {
  const r = kladAv(k), sk = r && (PLAGG[r.plagg] as PlaggDef).skydd;
  if (!r || !sk) return undefined;
  const f = KLADMATERIAL[r.mat].skydd;
  return { delar: sk.delar, tar: Object.fromEntries(Object.entries(sk.tar).map(([sl, v]) => [sl, Math.min(KLADER.skyddTak, v! * f)])) as Partial<Record<Skadeslag, number>> };
}
// saken i förrådet som plagget k görs av (rocken av vargskinn: vargskinnet)
export const materialSak = (k: string) => { const r = kladAv(k); return r && KLADMATERIAL[r.mat].sak; };
export const kladTung = (k: string) => { const r = kladAv(k); return !!r && !!(PLAGG[r.plagg] as PlaggDef).tung; };

// sakerna i saker.ts (SakDef där): ett plagg är ett redskap i mappen Kläder, i gruppen med plaggets nyckel, som görs vid
// slöjdbänken (stationer.ts) och slits som de andra redskapen
export function kladSaker() {
  const r: Record<string, SakDef> = {};
  for (const { k, plagg: pl, mat: m } of KLADER_AV) {
    const P: PlaggDef = PLAGG[pl], M = KLADMATERIAL[m], namn = kladNamn(pl, m), iMening = `${P.namn.toLowerCase()} av ${M.namn}`;
    r[k] = {
      namn, skaffa: { av: receptAv(pl, m), min: P.min, slag: 'stor', tek: P.tek }, vikt: +(P.vikt * M.vikt).toFixed(3), stack: 1, mapp: 'Kläder', slits: 0.0003, redskap: true, grupp: pl,
      klad: { plats: P.plats, varme: +(P.varme * M.varme).toFixed(4), dygn: P.dygn * M.hallbar, ...(P.krok ? { krok: true } : {}) },
      gors: { text: `${P.verb} ${P.ord} av ${M.namn}.`, stat: k, forsta: P.forsta.replace('{plagg}', iMening), ...(P.fame ? { fame: P.fame.replace('{plagg}', iMening) } : {}) },
    };
  }
  return r;
}

// ---------- valet av material ----------
// läget för ett material: varme = plaggets värme av det, skydd = materialets skydd, kvar = hur många saker av det som finns
// kvar när det här plagget gjorts, behovs = hur många som behövs till annat viktigt (dörrar, plagg som andra saknar), till =
// hur många saker ett plagg tar, varde = vad plagget kostar (varde.ts)
export interface MaterialLage { k: string; varme: number; skydd: number; kvar: number; behovs: number; till: number; varde: number }
// läget i byn: kyla = vintern närmar sig eller någon fryser, hot = vargar nära eller en strid nyligen, fin = den som syr åt
// sig själv har gott anseende och tar ett finare material när inget annat skiljer
export interface ValLage { kyla: boolean; hot: boolean; fin: boolean }
// det material den som syr väljer bland ks (alla går att göra nu): varje punkt väger mer än alla efter den
export function valMaterial(ks: MaterialLage[], l: ValLage): string | undefined {
  if (ks.length <= 1) return ks[0]?.k;
  const billigast = Math.min(...ks.map(m => m.varde));
  const varmNog = (m: MaterialLage) => m.varme >= Math.max(...ks.map(x => x.varme)) - 1e-9 || kladVarmNog(m);
  const punkter: ((m: MaterialLage) => number)[] = [
    m => l.kyla && !varmNog(m) ? 1 : 0, // (1) kylan: ett material som håller bäraren varm nog, annars det varmaste
    m => l.hot ? -m.skydd : 0, // (2) striden: det som skyddar mest
    m => m.kvar < m.behovs ? 1 : 0, // (3) det som saknas sparas
    m => m.kvar - m.behovs >= KLADER.gottOm * m.till ? 0 : 1, // (4) det som finns gott om används först
    m => m.varde > billigast * KLADER.dyrt ? 1 : 0, // (5) det dyra sparas till byten och gåvor
    m => l.fin ? -m.varde : m.varde, // (6) smak och anseende: den ansedda tar det finare, annars det billigare
  ];
  return [...ks].sort((a, b) => { for (const f of punkter) { const d = f(a) - f(b); if (d) return d; } return 0; })[0].k;
}
// varmt nog i kylan: materialet är så varmt som ett vinterplagg behöver (KLADER.vinterVarm), eller plagget värmer inte alls
const kladVarmNog = (m: MaterialLage) => { const r = kladAv(m.k); return !!r && (KLADMATERIAL[r.mat].varme >= KLADER.vinterVarm || PLAGG[r.plagg].varme === 0); };
