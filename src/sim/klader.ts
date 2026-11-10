import { RECEPT } from './recept';
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

export type MaterialSlag = 'skinn' | 'lader' | 'tyg' | 'ull' | 'flatat' | 'smycke'; // ull: ylletyget (steg 9.8.14), som tyget men också till kappan, manteln och sjalen
type Skadeslag = 'hugg' | 'stick' | 'slag' | 'bett';
// ett plagg. namn = hur plagget börjar ("Rock" i "Rock av vargskinn"), ord = i en mening ("en rock", "ett par skor"),
// verb = vad den som gör det gör, plats = platsen på kroppen, mangd = bitar material, med = det mer plagget görs med (hela
// saker), varme = så stor del mindre kyla av ett kaninskinn, dygn = hur många dygn (år i spelet) det håller på kroppen, vikt =
// kg av ett kaninskinn, min = minuters arbete, krok = så många redskap hänger i plagget (bältet, steg 2.3.3; två krokar sedan steg 7.1.1),
// axel = så många av redskapen som hänger på axeln bärs i plagget (axelremmen, steg 7.1.2), rygg = så mycket (i vikt) av
// bördan som ryms i plagget på ryggen, lika för alla (ryggsäcken, steg 7.1.3), tung = svårt
// att ducka i (STRID.duckTung), skydd = kroppsdelarna det täcker och hur stor del av skadan det tar per slag i ett kaninskinn
interface PlaggDef {
  namn: string; ord: string; verb: 'Syr' | 'Flätar'; plats: string; mangd: number; med?: Record<string, number>;
  varme: number; dygn: number; vikt: number; tek: string; min: number; slag: MaterialSlag[]; smid?: number; // smid = så mycket smidighet plagget tar (steg 8.7.1)
  krok?: number; axel?: number; rygg?: number; tung?: true; snoTar?: number; // snoTar = så stor del av det snön bromsar som plagget tar bort (snöskorna, steg 7.7.3; snoFart i gang.ts)
  skydd?: { delar: Kroppsdel[]; tar: Partial<Record<Skadeslag, number>> };
  forsta: string; fame?: string; // loggen första gången ({namn} = den som gjorde det, {plagg} = plaggets namn i en mening) och det hen minns för
}
const PLAGG_DEF = {
  rock: { namn: 'Rock', ord: 'en rock', verb: 'Syr', plats: 'yttre', mangd: RECEPT.rock.mangd, med: RECEPT.rock.av, varme: 0.25, dygn: 4, vikt: 10, tek: 'skinnklader', min: RECEPT.rock.min, slag: ['skinn'], tung: true,
    skydd: { delar: ['bal', 'armV', 'armH'], tar: { hugg: 0.25, stick: 0.15, slag: 0.2, bett: 0.3 } },
    forsta: '{namn} sydde byns första {plagg}. Den som har den på sig fryser mindre.', fame: 'Sydde byns första {plagg}' },
  skor: { namn: 'Skor', ord: 'ett par skor', verb: 'Syr', plats: 'fotter', mangd: RECEPT.skor.mangd, med: RECEPT.skor.av, varme: 0.1, dygn: 3, vikt: 3, tek: 'skinnklader', min: RECEPT.skor.min, slag: ['skinn'],
    skydd: { delar: ['fotV', 'fotH'], tar: { hugg: 0.2, stick: 0.2, slag: 0.1, bett: 0.3 } },
    forsta: '{namn} sydde byns första par {plagg}.' },
  balte: { namn: 'Bälte', ord: 'ett bälte', verb: 'Flätar', plats: 'balte', mangd: RECEPT.balte.mangd, varme: 0, dygn: 10, vikt: 1, tek: 'balte', min: RECEPT.balte.min, slag: ['flatat'], krok: 2,
    forsta: '{namn} flätade byns första {plagg}. Redskapen hänger i det, och båda händerna är fria att bära med.' },
  axelrem: { namn: 'Axelrem', ord: 'en axelrem', verb: 'Syr', plats: 'axelrem', mangd: RECEPT.axelrem.mangd, med: RECEPT.axelrem.av, varme: 0, dygn: 10, vikt: 1, tek: 'axelrem', min: RECEPT.axelrem.min, slag: ['skinn'], axel: 1,
    forsta: '{namn} sydde byns första {plagg}. Spjutet hänger på axeln, och båda händerna är fria att bära med.' }, // steg 7.1.2
  byxor: { namn: 'Byxor', ord: 'ett par byxor', verb: 'Syr', plats: 'ben', mangd: RECEPT.byxor.mangd, med: RECEPT.byxor.av, varme: 0.15, dygn: 4, vikt: 5, tek: 'skinnklader', min: RECEPT.byxor.min, slag: ['skinn', 'lader'],
    skydd: { delar: ['benV', 'benH'], tar: { hugg: 0.2, stick: 0.15, slag: 0.15, bett: 0.25 } }, forsta: '{namn} sydde byns första par {plagg}.' }, // steg 7.7.1
  mossa: { namn: 'Mössa', ord: 'en mössa', verb: 'Syr', plats: 'huvud', mangd: RECEPT.mossa.mangd, varme: 0.1, dygn: 4, vikt: 1, tek: 'skinnklader', min: RECEPT.mossa.min, slag: ['skinn', 'lader'],
    skydd: { delar: ['huvud'], tar: { hugg: 0.15, stick: 0.1, slag: 0.15, bett: 0.2 } }, forsta: '{namn} sydde byns första {plagg}.' }, // steg 7.7.2
  snoskor: { namn: 'Snöskor', ord: 'ett par snöskor', verb: 'Syr', plats: 'fotter', mangd: RECEPT.snoskor.mangd, med: RECEPT.snoskor.av, varme: 0.1, dygn: 3, vikt: 3, tek: 'skinnklader', min: RECEPT.snoskor.min, slag: ['skinn'], snoTar: 0.8,
    skydd: { delar: ['fotV', 'fotH'], tar: { hugg: 0.2, stick: 0.2, slag: 0.1, bett: 0.3 } }, forsta: '{namn} gjorde byns första par {plagg}. Snön saktar dem nästan inte.' }, // steg 7.7.3
  prastdrakt: { namn: 'Prästdräkt', ord: 'en prästdräkt', verb: 'Syr', plats: 'yttre', mangd: RECEPT.prastdrakt.mangd, med: RECEPT.prastdrakt.av, varme: 0.15, dygn: 12, vikt: 4, tek: 'skinnklader', min: RECEPT.prastdrakt.min, slag: ['skinn'],
    forsta: '{namn} sydde en {plagg} åt prästen. Den behövs vid offer och fester.' }, // steg 8.5.15
  tecken: { namn: 'Trons tecken', ord: 'ett trons tecken', verb: 'Syr', plats: 'smycke', mangd: RECEPT.tecken.mangd, med: RECEPT.tecken.av, varme: 0, dygn: 20, vikt: 0.2, tek: 'skinnklader', min: RECEPT.tecken.min, slag: ['smycke'],
    forsta: '{namn} gjorde ett {plagg}. De troende bär det gärna.' }, // steg 8.5.15
  mask: { namn: 'Schamanens mask', ord: 'en mask', verb: 'Syr', plats: 'huvud', mangd: RECEPT.mask.mangd, varme: 0, dygn: 15, vikt: 1, tek: 'skinnklader', min: RECEPT.mask.min, slag: ['skinn'],
    forsta: '{namn} gjorde en mask åt schamanen.' }, // steg 8.5.17
  rustning: { namn: 'Läderrustning', ord: 'en läderrustning', verb: 'Syr', plats: 'yttre', mangd: RECEPT.rustning.mangd, med: RECEPT.rustning.av, varme: 0.1, dygn: 12, vikt: 8, smid: 2, tek: 'rustning', min: RECEPT.rustning.min, slag: ['lader'],
    skydd: { delar: ['bal', 'armV', 'armH'], tar: { hugg: 0.5, stick: 0.5, slag: 0.33, bett: 0.4 } }, forsta: '{namn} sydde byns första {plagg}.' }, // steg 8.7.1
  hjalm: { namn: 'Läderhjälm', ord: 'en läderhjälm', verb: 'Syr', plats: 'huvud', mangd: RECEPT.hjalm.mangd, med: RECEPT.hjalm.av, varme: 0.05, dygn: 12, vikt: 1.5, tek: 'rustning', min: RECEPT.hjalm.min, slag: ['lader'],
    skydd: { delar: ['huvud'], tar: { slag: 0.33, hugg: 0.2, stick: 0.2 } }, forsta: '{namn} sydde byns första {plagg}.' }, // steg 8.7.2
  mantel: { namn: 'Mantel', ord: 'en mantel', verb: 'Syr', plats: 'yttre', mangd: RECEPT.mantel.mangd, med: RECEPT.mantel.av, varme: 0.2, dygn: 12, vikt: 5, tek: 'skinnklader', min: RECEPT.mantel.min, slag: ['skinn', 'ull'],
    forsta: '{namn} sydde en {plagg} åt ledaren. Den följer ämbetet, inte personen.' }, // steg 8.3.14
  halsband: { namn: 'Halsband', ord: 'ett halsband', verb: 'Syr', plats: 'smycke', mangd: RECEPT.halsband.mangd, med: RECEPT.halsband.av, varme: 0, dygn: 20, vikt: 0.2, tek: 'skinnklader', min: RECEPT.halsband.min, slag: ['smycke'],
    forsta: '{namn} trädde byns första {plagg}. Den som bär det får anseende.' }, // steg 7.7.5
  tunika: { namn: 'Tunika', ord: 'en tunika', verb: 'Syr', plats: 'yttre', mangd: RECEPT.tunika.mangd, varme: 0.1, dygn: 5, vikt: 2, tek: 'vavstol', min: RECEPT.tunika.min, slag: ['tyg', 'ull'],
    skydd: { delar: ['bal'], tar: { hugg: 0.05, stick: 0.05, slag: 0.05, bett: 0.05 } }, forsta: '{namn} sydde byns första {plagg}.' }, // steg 7.7.10
  skjorta: { namn: 'Skjorta', ord: 'en skjorta', verb: 'Syr', plats: 'inre', mangd: RECEPT.skjorta.mangd, varme: 0.05, dygn: 5, vikt: 1, tek: 'vavstol', min: RECEPT.skjorta.min, slag: ['tyg', 'ull'],
    skydd: { delar: ['bal'], tar: { hugg: 0.03, stick: 0.03, slag: 0.03, bett: 0.03 } }, forsta: '{namn} sydde byns första {plagg}.' },
  // ullens plagg (steg 9.8.15): kappan, den varmaste klädnaden över kroppen, och sjalen över axlarna
  kappa: { namn: 'Kappa', ord: 'en kappa', verb: 'Syr', plats: 'yttre', mangd: RECEPT.kappa.mangd, varme: 0.3, dygn: 6, vikt: 3, tek: 'vavstol', min: RECEPT.kappa.min, slag: ['ull'],
    skydd: { delar: ['bal', 'armV', 'armH'], tar: { hugg: 0.08, stick: 0.05, slag: 0.1, bett: 0.1 } }, forsta: '{namn} sydde byns första {plagg} av ylle. Den är varm som en päls men lättare.' },
  sjal: { namn: 'Sjal', ord: 'en sjal', verb: 'Syr', plats: 'axlar', mangd: RECEPT.sjal.mangd, varme: 0.1, dygn: 6, vikt: 0.5, tek: 'vavstol', min: RECEPT.sjal.min, slag: ['ull'],
    forsta: '{namn} sydde byns första {plagg}. Den värmer axlarna.' },
  ryggsack: { namn: 'Ryggsäck', ord: 'en ryggsäck', verb: 'Syr', plats: 'rygg', mangd: RECEPT.ryggsack.mangd, med: RECEPT.ryggsack.av, varme: 0, dygn: 10, vikt: 2, tek: 'ryggsack', min: RECEPT.ryggsack.min, slag: ['skinn'], rygg: 20,
    forsta: '{namn} sydde byns första {plagg}. Den som samlar plockar rakt ner i den och bär dubbelt så mycket.' }, // steg 7.1.3
} satisfies Record<string, PlaggDef>;
export type Plagg = keyof typeof PLAGG_DEF;
export const PLAGG: Record<Plagg, PlaggDef> = PLAGG_DEF;
export const PLAGG_LIST = Object.keys(PLAGG_DEF) as Plagg[];

// ett material. sak = saken i förrådet, namn = i plaggets namn ("av vargskinn"), bit = hur många bitar en sak räcker till,
// varme/hallbar/vikt/skydd = gånger kaninskinnets, finhet = hur fint det är (den ansedda tar det finaste, punkt 6). Värdet
// är sakens (varde.ts)
interface MaterialDef { sak: string; namn: string; slag: MaterialSlag; bit: number; varme: number; hallbar: number; vikt: number; skydd: number; finhet: number }
const KLADMATERIAL_DEF = {
  kaninskinn: { sak: 'skinn', namn: 'harskinn', slag: 'skinn', bit: 1, varme: 1, hallbar: 1, vikt: 1, skydd: 1, finhet: 0 },
  vargskinn: { sak: 'vargskinn', namn: 'vargskinn', slag: 'skinn', bit: 2, varme: 1.8, hallbar: 1, vikt: 1.5, skydd: 1.2, finhet: 1 }, // tjockare än kaninens (steg 3.7.14): varmare, tyngre och skyddar mer
  bjornskinn: { sak: 'bjornskinn', namn: 'björnskinn', slag: 'skinn', bit: 2, varme: 2.6, hallbar: 1.3, vikt: 2, skydd: 1.5, finhet: 2 }, // steg 6.6.6: det tjockaste skinnet, den varmaste klädern och skyddar mer än vargskinnet
  lader: { sak: 'lader', namn: 'läder', slag: 'lader', bit: 1, varme: 1.3, hallbar: 1.5, vikt: 1.2, skydd: 1.4, finhet: 1 }, // steg 7.7.6
  lintyg: { sak: 'lintyg', namn: 'lin', slag: 'tyg', bit: 1, varme: 1, hallbar: 1, vikt: 1, skydd: 1, finhet: 2 }, // steg 7.7.9
  ylle: { sak: 'ylle', namn: 'ylle', slag: 'ull', bit: 1, varme: 2, hallbar: 1.2, vikt: 1.2, skydd: 1.1, finhet: 2 }, // steg 9.8.14: varmare än linet
  benband: { sak: 'ben', namn: 'ben', slag: 'smycke', bit: 1, varme: 0, hallbar: 1, vikt: 1, skydd: 0, finhet: 0 }, // halsbandet (steg 7.7.5)
  tandband: { sak: 'vargtand', namn: 'vargtänder', slag: 'smycke', bit: 1, varme: 0, hallbar: 1, vikt: 1, skydd: 0, finhet: 2 },
  rep: { sak: 'rep', namn: 'rep', slag: 'flatat', bit: 1, varme: 1, hallbar: 1, vikt: 1, skydd: 1, finhet: 0 },
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
      namn, skaffa: { av: receptAv(pl, m), min: P.min, slag: 'stor', tek: P.tek }, vikt: +(P.vikt * M.vikt).toFixed(3), stack: 1, mapp: 'Kläder', slits: 0.0003, redskap: true, grupp: pl, ...(P.ord === `ett ${P.namn.toLowerCase()}` ? { ett: true as const } : {}),
      klad: { plats: P.plats, varme: +(P.varme * M.varme).toFixed(4), dygn: P.dygn * M.hallbar, ...(P.krok ? { krok: P.krok } : {}), ...(P.axel ? { axel: P.axel } : {}), ...(P.rygg ? { rygg: P.rygg } : {}), ...(P.snoTar ? { snoTar: P.snoTar } : {}) },
      gors: { text: `${P.verb} ${P.ord} av ${M.namn}.`, stat: k, forsta: P.forsta.replace('{plagg}', iMening), ...(P.fame ? { fame: P.fame.replace('{plagg}', iMening) } : {}) },
    };
  }
  return r;
}

// ---------- valet av material ----------
// läget för ett material: varme = plaggets värme av det, skydd = materialets skydd, kvar = hur många saker av det som finns
// kvar när det här plagget gjorts, behovs = hur många som behövs till annat viktigt (dörrar, plagg som andra saknar), till =
// hur många saker ett plagg tar, finhet = materialets (KLADMATERIAL), varde = vad plagget kostar (varde.ts)
export interface MaterialLage { k: string; varme: number; skydd: number; kvar: number; behovs: number; till: number; finhet: number; varde: number }
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
    m => l.fin ? -m.finhet : m.finhet, // (6) smak och anseende: den ansedda tar det finare materialet, andra det enklare
    m => l.fin ? -m.varde : m.varde, // ... och sist värdet: den ansedda tar det dyrare plagget, andra det billigare
  ];
  return [...ks].sort((a, b) => { for (const f of punkter) { const d = f(a) - f(b); if (d) return d; } return 0; })[0].k;
}
// varmt nog i kylan: materialet är så varmt som ett vinterplagg behöver (KLADER.vinterVarm), eller plagget värmer inte alls
const kladVarmNog = (m: MaterialLage) => { const r = kladAv(m.k); return !!r && (KLADMATERIAL[r.mat].varme >= KLADER.vinterVarm || PLAGG[r.plagg].varme === 0); };
