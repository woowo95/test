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
// Den som syr väljer material (valMaterial) med kylan, striden, det som saknas, det som finns gott om, värdet och smak och
// anseende vägda ihop (vikterna i KLADER, steg 10.2.38) ("Valet av material"); läget tas fram i redskap.ts (materialLage). Filen frågar inget annat i
// spelet, så att saker.ts kan läsa den när sakerna läggs upp.
import type { Kroppsdel } from './halsa';
import type { SakDef } from './saker';
import { balans } from './balans';

export const KLADER = balans('klader', {
  naken: -0.15, // humöret för den som är helt naken (steg 10.2.72): kläderna är nästan ett grundbehov ...
  nakenDel: -0.05, // ... och för varje del (fötterna, benen, överkroppen) som saknar plagg
  // ett plagg som klär en av delarna är värt mer i projekten (projekt.ts): 1 + så här mycket gånger tanken det tar bort (nakenDel),
  // så att byn syr det som gör folk olyckliga att sakna
  humorVarde: 100,
  kylaVikt: 1.5, // ett plagg som värmer väger så här mycket mer i projekten när kylan är som störst (coldOf 1, steg 10.2.71)
  vinterVarm: 1.5, // ett material minst så här varmt (gånger kaninskinnet) håller bäraren varm nog när kylan kommer (punkt 1)
  hotTim: 48, // vargar sedda nära byn eller en strid i byn för högst så här många timmar sedan: byn hotas (punkt 2)
  gottOm: 2, // det finns gott om ett material när det räcker till så här många plagg till, utöver det som behövs (punkt 4)
  dyrt: 1.5, // ett plagg som kostar så här många gånger det billigaste är dyrt och sparas (punkt 5)
  skyddTak: 0.9, // ett plagg tar som mest så här stor del av en skada (kodgenomgången 3.10.25: talet stod löst)
  // vikterna i valet av material (valMaterial, steg 10.2.38): punkterna vägs ihop, och de första väger mest
  vKyla: 8, vHot: 5, vSaknas: 3, vGottOm: 2, vDyrt: 1.5, vFin: 1, vVarde: 0.5,
  // klädseln (steg 12.1.149): vad man har på sig väljs med en poäng per plagg. Värmen gånger hur kallt det är (positivt under
  // valIdeal grader, negativt över, per valSpann grader), skyddet i striden, finheten (anseendet), och att inte lämna en del
  // naken. Ett plagg tas på när poängen är över valByte och av när den är under −valByte, så att det inte byts fram och tillbaka
  valIdeal: 20, valSpann: 10, valVarme: 1, valSkydd: 0.05, valFin: 0.02, valNaken: 1, valByte: 0.01,
  // det plagget bär åt en (steg 12.1.191): per krok i bältet och plats på axelremmen, per vikt i ryggsäcken; plaggen som hör
  // till en roll (masken och prästens dräkt åt prästen, trons tecken åt den troende) och smyckena som bärs för att synas
  valBar: 0.1, valRygg: 0.005, valSele: 0.3, valRoll: 0.1, valPynt: 0.05,
});

// platserna på kroppen där den som saknar plagg känner sig naken (stepNaken i steg.ts): skjortan och rocken klär överkroppen
export const NAKEN_PLATS: Record<string, string> = { fotter: 'fotter', ben: 'ben', inre: 'kropp', yttre: 'kropp' };
export type MaterialSlag = 'skinn' | 'lader' | 'tyg' | 'ull' | 'flatat' | 'smycke' | 'metall' | 'halm'; // halm: hattens hö (steg 12.1.34) // metall: järnet i hjälmen och brynjan (steg 12.2.9) // ull: ylletyget (steg 9.8.14), som tyget men också till kappan, manteln och sjalen
type Skadeslag = 'hugg' | 'stick' | 'slag' | 'bett';
// ett plagg. namn = hur plagget börjar ("Rock" i "Rock av vargskinn"), ord = i en mening ("en rock", "ett par skor"),
// plats = platsen på kroppen, mangd = bitar material, med = det mer plagget görs med (hela
// saker), varme = så stor del mindre kyla av ett kaninskinn, dygn = hur många dygn (år i spelet) det håller på kroppen, vikt =
// kg av ett kaninskinn, min = minuters arbete, krok = så många redskap hänger i plagget (bältet, steg 2.3.3; två krokar sedan steg 7.1.1),
// axel = så många av redskapen som hänger på axeln bärs i plagget (axelremmen, steg 7.1.2), rygg = så mycket (i vikt) av
// bördan som ryms i plagget på ryggen, lika för alla (ryggsäcken, steg 7.1.3), tung = svårt
// att ducka i (STRID.duckTung), skydd = kroppsdelarna det täcker och hur stor del av skadan det tar per slag i ett kaninskinn
interface PlaggDef {
  namn: string; ord: string; plats: string; grupp?: string; // grupp = plaggets grupp när det ersätter ett annat (stövlarna hör till skorna, steg 13.2.2)
  mangd: number; med?: Record<string, number>;
  varme: number; dygn: number; vikt: number; tek: string; min: number; slag: MaterialSlag[]; smid?: number; // smid = så mycket smidighet plagget tar (steg 8.7.1)
  gravgava?: true; // får följa den döda i graven och läggas på den vid ett besök (SakDef, steg 13.1.6)
  krok?: number; axel?: number; rygg?: number; sele?: true; tung?: true; snoTar?: number; // snoTar = så stor del av det snön bromsar som plagget tar bort (snöskorna, steg 7.7.3; snoFart i gang.ts)
  skydd?: { delar: Kroppsdel[]; tar: Partial<Record<Skadeslag, number>> };
  station?: string; // stationen där plagget görs, när det inte görs vid slöjdbänken (hjälmen och brynjan smids i smedjan, steg 12.2.9)
  forsta: string; fame?: string; // loggen första gången ({namn} = den som gjorde det, {plagg} = plaggets namn i en mening) och det hen minns för
}
const PLAGG_DEF = {
  rock: { namn: 'Rock', ord: 'en rock', plats: 'yttre', mangd: RECEPT.rock.mangd, med: RECEPT.rock.av, varme: 0.25, dygn: 4, vikt: 10, tek: 'skinnklader', min: RECEPT.rock.min, slag: ['skinn'], tung: true,
    skydd: { delar: ['bal', 'armV', 'armH'], tar: { hugg: 0.25, stick: 0.15, slag: 0.2, bett: 0.3 } },
    forsta: '{namn} sydde byns första {plagg}. Den som har den på sig fryser mindre.', fame: 'Sydde byns första {plagg}' },
  skor: { namn: 'Skor', ord: 'ett par skor', plats: 'fotter', mangd: RECEPT.skor.mangd, med: RECEPT.skor.av, varme: 0.1, dygn: 3, vikt: 3, tek: 'skinnklader', min: RECEPT.skor.min, slag: ['skinn', 'lader'],
    skydd: { delar: ['fotV', 'fotH'], tar: { hugg: 0.2, stick: 0.2, slag: 0.1, bett: 0.3 } },
    forsta: '{namn} sydde byns första par {plagg}.' },
  // stövlarna (steg 13.2.2, Fler kläder: Läder): läder som sys till skor med skaft, i skornas grupp. De skyddar fötterna och
  // benen och håller dubbelt så länge som skorna
  stovlar: { namn: 'Stövlar', ord: 'ett par stövlar', plats: 'fotter', grupp: 'skor', mangd: RECEPT.stovlar.mangd, med: RECEPT.stovlar.av, varme: 0.15, dygn: 6, vikt: 4, tek: 'garvning', min: RECEPT.stovlar.min, slag: ['lader'],
    skydd: { delar: ['fotV', 'fotH', 'benV', 'benH'], tar: { hugg: 0.2, stick: 0.2, slag: 0.1, bett: 0.3 } },
    forsta: '{namn} sydde byns första par {plagg}. De håller länge och skyddar benen.' },
  balte: { namn: 'Bälte', ord: 'ett bälte', plats: 'balte', mangd: RECEPT.balte.mangd, varme: 0, dygn: 10, vikt: 1, tek: 'balte', min: RECEPT.balte.min, slag: ['flatat', 'lader'], krok: 2,
    forsta: '{namn} gjorde byns första {plagg}. Redskapen hänger i det, och båda händerna är fria att bära med.' },
  axelrem: { namn: 'Axelrem', ord: 'en axelrem', plats: 'axelrem', mangd: RECEPT.axelrem.mangd, med: RECEPT.axelrem.av, varme: 0, dygn: 10, vikt: 1, tek: 'axelrem', min: RECEPT.axelrem.min, slag: ['skinn', 'lader'], axel: 1,
    forsta: '{namn} sydde byns första {plagg}. Spjutet hänger på axeln, och båda händerna är fria att bära med.' }, // steg 7.1.2
  byxor: { namn: 'Byxor', ord: 'ett par byxor', plats: 'ben', mangd: RECEPT.byxor.mangd, med: RECEPT.byxor.av, varme: 0.15, dygn: 4, vikt: 5, tek: 'skinnklader', min: RECEPT.byxor.min, slag: ['skinn', 'lader'],
    skydd: { delar: ['benV', 'benH'], tar: { hugg: 0.2, stick: 0.15, slag: 0.15, bett: 0.25 } }, forsta: '{namn} sydde byns första par {plagg}.' }, // steg 7.7.1
  mossa: { namn: 'Mössa', ord: 'en mössa', plats: 'huvud', mangd: RECEPT.mossa.mangd, varme: 0.1, dygn: 4, vikt: 1, tek: 'skinnklader', min: RECEPT.mossa.min, slag: ['skinn', 'lader'],
    skydd: { delar: ['huvud'], tar: { hugg: 0.15, stick: 0.1, slag: 0.15, bett: 0.2 } }, forsta: '{namn} sydde byns första {plagg}.' }, // steg 7.7.2
  snoskor: { namn: 'Snöskor', ord: 'ett par snöskor', plats: 'fotter', mangd: RECEPT.snoskor.mangd, med: RECEPT.snoskor.av, varme: 0.1, dygn: 3, vikt: 3, tek: 'skinnklader', min: RECEPT.snoskor.min, slag: ['skinn'], snoTar: 0.8,
    skydd: { delar: ['fotV', 'fotH'], tar: { hugg: 0.2, stick: 0.2, slag: 0.1, bett: 0.3 } }, forsta: '{namn} gjorde byns första par {plagg}. Snön saktar dem nästan inte.' }, // steg 7.7.3
  prastdrakt: { namn: 'Prästdräkt', ord: 'en prästdräkt', plats: 'yttre', mangd: RECEPT.prastdrakt.mangd, med: RECEPT.prastdrakt.av, varme: 0.15, dygn: 12, vikt: 4, tek: 'skinnklader', min: RECEPT.prastdrakt.min, slag: ['skinn'],
    forsta: '{namn} sydde en {plagg} åt prästen. Den behövs vid offer och fester.' }, // steg 8.5.15
  tecken: { namn: 'Trons tecken', ord: 'ett trons tecken', plats: 'smycke', mangd: RECEPT.tecken.mangd, med: RECEPT.tecken.av, varme: 0, dygn: 20, vikt: 0.2, tek: 'skinnklader', min: RECEPT.tecken.min, slag: ['smycke'],
    forsta: '{namn} gjorde ett {plagg}. De troende bär det gärna.' }, // steg 8.5.15
  mask: { namn: 'Schamanens mask', ord: 'en mask', plats: 'huvud', mangd: RECEPT.mask.mangd, varme: 0, dygn: 15, vikt: 1, tek: 'skinnklader', min: RECEPT.mask.min, slag: ['skinn'],
    forsta: '{namn} gjorde en mask åt schamanen.' }, // steg 8.5.17
  rustning: { namn: 'Läderrustning', ord: 'en läderrustning', plats: 'yttre', mangd: RECEPT.rustning.mangd, med: RECEPT.rustning.av, varme: 0.1, dygn: 12, vikt: 8, smid: 2, tek: 'rustning', min: RECEPT.rustning.min, slag: ['lader'],
    skydd: { delar: ['bal', 'armV', 'armH'], tar: { hugg: 0.5, stick: 0.5, slag: 0.33, bett: 0.4 } }, forsta: '{namn} sydde byns första {plagg}.' }, // steg 8.7.1
  hjalm: { namn: 'Läderhjälm', ord: 'en läderhjälm', plats: 'huvud', mangd: RECEPT.hjalm.mangd, med: RECEPT.hjalm.av, varme: 0.05, dygn: 12, vikt: 1.5, tek: 'rustning', min: RECEPT.hjalm.min, slag: ['lader'],
    skydd: { delar: ['huvud'], tar: { slag: 0.33, hugg: 0.2, stick: 0.2 } }, forsta: '{namn} sydde byns första {plagg}.' }, // steg 8.7.2
  mantel: { namn: 'Mantel', ord: 'en mantel', plats: 'yttre', mangd: RECEPT.mantel.mangd, med: RECEPT.mantel.av, varme: 0.2, dygn: 12, vikt: 5, tek: 'skinnklader', min: RECEPT.mantel.min, slag: ['skinn', 'ull'],
    forsta: '{namn} sydde en {plagg} åt ledaren. Den följer ämbetet, inte personen.' }, // steg 8.3.14
  halsband: { namn: 'Halsband', ord: 'ett halsband', plats: 'smycke', mangd: RECEPT.halsband.mangd, med: RECEPT.halsband.av, varme: 0, dygn: 20, vikt: 0.2, tek: 'skinnklader', min: RECEPT.halsband.min, slag: ['smycke'],
    forsta: '{namn} trädde byns första {plagg}. Den som bär det får anseende.' }, // steg 7.7.5
  tunika: { namn: 'Tunika', ord: 'en tunika', plats: 'yttre', mangd: RECEPT.tunika.mangd, varme: 0.1, dygn: 5, vikt: 2, tek: 'vavstol', min: RECEPT.tunika.min, slag: ['tyg', 'ull'],
    skydd: { delar: ['bal'], tar: { hugg: 0.05, stick: 0.05, slag: 0.05, bett: 0.05 } }, forsta: '{namn} sydde byns första {plagg}.' }, // steg 7.7.10
  skjorta: { namn: 'Skjorta', ord: 'en skjorta', plats: 'inre', mangd: RECEPT.skjorta.mangd, varme: 0.05, dygn: 5, vikt: 1, tek: 'vavstol', min: RECEPT.skjorta.min, slag: ['tyg', 'ull'],
    skydd: { delar: ['bal'], tar: { hugg: 0.03, stick: 0.03, slag: 0.03, bett: 0.03 } }, forsta: '{namn} sydde byns första {plagg}.' },
  // ullens plagg (steg 9.8.15): kappan, den varmaste klädnaden över kroppen, och sjalen över axlarna
  kappa: { namn: 'Kappa', ord: 'en kappa', plats: 'yttre', mangd: RECEPT.kappa.mangd, varme: 0.3, dygn: 6, vikt: 3, tek: 'vavstol', min: RECEPT.kappa.min, slag: ['ull'],
    skydd: { delar: ['bal', 'armV', 'armH'], tar: { hugg: 0.08, stick: 0.05, slag: 0.1, bett: 0.1 } }, forsta: '{namn} sydde byns första {plagg}. Den är varm som en päls men lättare.' },
  sjal: { namn: 'Sjal', ord: 'en sjal', plats: 'axlar', mangd: RECEPT.sjal.mangd, varme: 0.1, dygn: 6, vikt: 0.5, tek: 'vavstol', min: RECEPT.sjal.min, slag: ['ull'],
    forsta: '{namn} sydde byns första {plagg}. Den värmer axlarna.' },
  // vapensmidet (steg 12.2.9, Järnet: Järnsakerna): järnhjälmen och ringbrynjan smids i smedjan av järn med läder under
  jarnhjalm: { namn: 'Järnhjälm', ord: 'en järnhjälm', plats: 'huvud', mangd: RECEPT.jarnhjalm.mangd, med: RECEPT.jarnhjalm.av, varme: 0.05, dygn: 40, vikt: 2.5, tek: 'vapensmide', min: RECEPT.jarnhjalm.min, slag: ['metall'], station: 'smedja',
    skydd: { delar: ['huvud'], tar: { hugg: 0.7, stick: 0.6, slag: 0.6 } }, forsta: '{namn} smidde byns första {plagg}.' },
  ringbrynja: { namn: 'Ringbrynja', ord: 'en ringbrynja', plats: 'yttre', mangd: RECEPT.ringbrynja.mangd, med: RECEPT.ringbrynja.av, varme: 0, dygn: 40, vikt: 12, smid: 3, tek: 'vapensmide', min: RECEPT.ringbrynja.min, slag: ['metall'], station: 'smedja', tung: true,
    skydd: { delar: ['bal', 'armV', 'armH'], tar: { hugg: 0.85, stick: 0.6, slag: 0.35, bett: 0.8 } }, forsta: '{namn} smidde byns första {plagg}. Den är det dyraste byn kan göra.' },
  // smycket av järn (steg 12.2.10, Pynt och smycken): ett spänne som smids i smedjan och bärs som halsbandet
  spanne: { gravgava: true, namn: 'Spänne', ord: 'ett spänne', plats: 'smycke', mangd: RECEPT.spanne.mangd, varme: 0, dygn: 40, vikt: 0.2, tek: 'smedja', min: RECEPT.spanne.min, slag: ['metall'], station: 'smedja',
    forsta: '{namn} smidde byns första {plagg}. Den som bär det får anseende.' },
  // det svala plagget (steg 12.1.34, Värmen och plaggen): hatten flätas av hö vid slöjdbänken och kyler mest (värmen gånger
  // materialets, som för halmen är under noll)
  hatt: { namn: 'Hatt', ord: 'en hatt', plats: 'huvud', mangd: RECEPT.hatt.mangd, varme: 0.15, dygn: 3, vikt: 0.5, tek: 'korg', min: RECEPT.hatt.min, slag: ['halm'],
    forsta: '{namn} flätade byns första {plagg}. Den skuggar huvudet i värmen.' },
  ryggsack: { namn: 'Ryggsäck', ord: 'en ryggsäck', plats: 'rygg', mangd: RECEPT.ryggsack.mangd, med: RECEPT.ryggsack.av, varme: 0, dygn: 10, vikt: 2, tek: 'ryggsack', min: RECEPT.ryggsack.min, slag: ['skinn', 'lader'], rygg: 20,
    forsta: '{namn} sydde byns första {plagg}. Den som samlar plockar rakt ner i den och bär dubbelt så mycket.' }, // steg 7.1.3
  // bärselen (steg 13.2.3): modern bär sitt spädbarn i den till arbetet och kan amma det där (barsele.ts)
  barsele: { namn: 'Bärsele', ord: 'en bärsele', plats: 'brost', mangd: RECEPT.barsele.mangd, med: RECEPT.barsele.av, varme: 0, dygn: 10, vikt: 1, tek: 'skinnklader', min: RECEPT.barsele.min, slag: ['skinn', 'lader'], sele: true,
    forsta: '{namn} sydde byns första {plagg}. Nu kan modern ha sitt lilla barn med sig till arbetet.' },
} satisfies Record<string, PlaggDef>;
export type Plagg = keyof typeof PLAGG_DEF;
export const PLAGG: Record<Plagg, PlaggDef> = PLAGG_DEF;
export const PLAGG_LIST = Object.keys(PLAGG_DEF) as Plagg[];

// ett material. sak = saken i förrådet, namn = i plaggets namn ("av vargskinn"), bit = hur många bitar en sak räcker till,
// varme/hallbar/vikt/skydd = gånger kaninskinnets (värmen under noll: ett svalt material, som kyler lika mycket som kaninskinnet
// värmer, steg 12.1.34), finhet = hur fint det är (den ansedda tar det finaste, punkt 6). Värdet
// är sakens (varde.ts)
interface MaterialDef { sak: string; namn: string; slag: MaterialSlag; bit: number; varme: number; hallbar: number; vikt: number; skydd: number; finhet: number; dolj?: number } // dolj = hur väl materialet döljer bäraren i snön (steg 10.7.22; doljISno i utrustning.ts)
const KLADMATERIAL_DEF = {
  kaninskinn: { sak: 'skinn', namn: 'harskinn', slag: 'skinn', bit: 1, varme: 1, hallbar: 1, vikt: 1, skydd: 1, finhet: 0 },
  vitskinn: { sak: 'vitskinn', namn: 'vitt harskinn', slag: 'skinn', bit: 1, varme: 1.2, hallbar: 1, vikt: 1, skydd: 1, finhet: 0, dolj: 1 }, // harens vinterpäls (steg 10.7.22): lite varmare och vit
  vargskinn: { sak: 'vargskinn', namn: 'vargskinn', slag: 'skinn', bit: 2, varme: 1.8, hallbar: 1, vikt: 1.5, skydd: 1.2, finhet: 1 }, // tjockare än kaninens (steg 3.7.14): varmare, tyngre och skyddar mer
  bjornskinn: { sak: 'bjornskinn', namn: 'björnskinn', slag: 'skinn', bit: 2, varme: 2.6, hallbar: 1.3, vikt: 2, skydd: 1.5, finhet: 2 }, // steg 6.6.6: det tjockaste skinnet, den varmaste klädern och skyddar mer än vargskinnet
  farskinn: { sak: 'farskinn', namn: 'fårskinn', slag: 'skinn', bit: 1, varme: 1.4, hallbar: 1, vikt: 1.2, skydd: 1, finhet: 0 }, // fårets och getens skinn (steg 10.3.14): fårskinnet med ullen är varmare än harens
  getskinn: { sak: 'getskinn', namn: 'getskinn', slag: 'skinn', bit: 1, varme: 1.1, hallbar: 1.2, vikt: 1.1, skydd: 1.1, finhet: 0 },
  svinskinn: { sak: 'svinskinn', namn: 'svinskinn', slag: 'skinn', bit: 1, varme: 0.9, hallbar: 1.4, vikt: 1.3, skydd: 1.3, finhet: 0 }, // vildsvinets borstiga skinn (steg 10.10.4): tåligt men inte så varmt
  radjursskinn: { sak: 'radjursskinn', namn: 'rådjursskinn', slag: 'skinn', bit: 1, varme: 1.2, hallbar: 1.2, vikt: 1.1, skydd: 1.1, finhet: 1 }, // rådjurets skinn: tunt och smidigt, lite varmare och tåligare än harens
  kohud: { sak: 'kohud', namn: 'kohud', slag: 'skinn', bit: 3, varme: 1.2, hallbar: 1.6, vikt: 1.6, skydd: 1.4, finhet: 0 }, // kons hud (steg 10.10.1): tjock, tung och tålig, och stor: den räcker till tre bitar som tre harskinn (steg 13.2.1)
  lader: { sak: 'lader', namn: 'läder', slag: 'lader', bit: 1, varme: 0.7, hallbar: 1.5, vikt: 1.2, skydd: 1.4, finhet: 1 }, // steg 7.7.6; utan pälsen värmer det mindre än skinnet (steg 13.2.2)
  lintyg: { sak: 'lintyg', namn: 'lin', slag: 'tyg', bit: 1, varme: -1, hallbar: 1, vikt: 1, skydd: 1, finhet: 2 }, // steg 7.7.9; linet är svalt (steg 12.1.34): skjortan av lin kyler lite
  ylle: { sak: 'ylle', namn: 'ylle', slag: 'ull', bit: 1, varme: 2, hallbar: 1.2, vikt: 1.2, skydd: 1.1, finhet: 2 }, // steg 9.8.14: varmare än linet
  benband: { sak: 'ben', namn: 'ben', slag: 'smycke', bit: 1, varme: 0, hallbar: 1, vikt: 1, skydd: 0, finhet: 0 }, // halsbandet (steg 7.7.5)
  tandband: { sak: 'vargtand', namn: 'vargtänder', slag: 'smycke', bit: 1, varme: 0, hallbar: 1, vikt: 1, skydd: 0, finhet: 2 },
  fjaderband: { sak: 'fjadrar', namn: 'fjädrar', slag: 'smycke', bit: 3, varme: 0, hallbar: 1, vikt: 1, skydd: 0, finhet: 1 }, // steg 10.7.7: en fågels fjädrar räcker till ett halsband
  halm: { sak: 'torrgras', namn: 'halm', slag: 'halm', bit: 1, varme: -1, hallbar: 1, vikt: 1, skydd: 0, finhet: 0 }, // hattens hö (steg 12.1.34): svalt
  rep: { sak: 'rep', namn: 'rep', slag: 'flatat', bit: 1, varme: 1, hallbar: 1, vikt: 1, skydd: 1, finhet: 0 },
  jarn: { sak: 'jarn', namn: 'järn', slag: 'metall', bit: 1, varme: 1, hallbar: 1, vikt: 1, skydd: 1, finhet: 1 }, // hjälmen och brynjan (steg 12.2.9): plaggens tal gäller som de står
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
// verbet hör till materialet (Plagg och material): skinn, läder, tyg och ull sys, rep och halm flätas, metall smids och smycken träs
export const SLAG_VERB: Record<MaterialSlag, string> = { skinn: 'Syr', lader: 'Syr', tyg: 'Syr', ull: 'Syr', flatat: 'Flätar', halm: 'Flätar', metall: 'Smider', smycke: 'Trär' };
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
// värmer plagget av något av sina material (steg 12.1.34): bara de plaggen skyddar mot kylan i projekten
export const plaggVarmer = (pl: string) => KLADER_AV.some(r => r.plagg === pl && PLAGG[r.plagg].varme * KLADMATERIAL[r.mat].varme > 0);
export const kladTung = (k: string) => { const r = kladAv(k); return !!r && !!(PLAGG[r.plagg] as PlaggDef).tung; };

// sakerna i saker.ts (SakDef där): ett plagg är ett redskap i mappen Kläder, i gruppen med plaggets nyckel, som görs vid
// slöjdbänken (stationer.ts) och slits som de andra redskapen
export function kladSaker() {
  const r: Record<string, SakDef> = {};
  for (const { k, plagg: pl, mat: m } of KLADER_AV) {
    const P: PlaggDef = PLAGG[pl], M = KLADMATERIAL[m], namn = kladNamn(pl, m), iMening = `${P.namn.toLowerCase()} av ${M.namn}`;
    r[k] = {
      namn, skaffa: { av: receptAv(pl, m), min: P.min, slag: 'stor', tek: P.tek }, vikt: +(P.vikt * M.vikt).toFixed(3), stack: 1, mapp: 'Kläder', slits: 0.0003, redskap: true, grupp: P.grupp ?? pl, ...(P.ord.startsWith('ett par ') ? { par: true as const } : {}), ...(P.gravgava ? { gravgava: true as const } : {}), ...(P.ord === `ett ${P.namn.toLowerCase()}` ? { ett: true as const } : {}),
      klad: { plats: P.plats, varme: +(P.varme * M.varme).toFixed(4), dygn: P.dygn * M.hallbar, ...(P.krok ? { krok: P.krok } : {}), ...(P.axel ? { axel: P.axel } : {}), ...(P.rygg ? { rygg: P.rygg } : {}), ...(P.sele ? { sele: true as const } : {}), ...(P.snoTar ? { snoTar: P.snoTar } : {}), ...((M as MaterialDef).dolj ? { dolj: (M as MaterialDef).dolj } : {}) },
      gors: { text: `${SLAG_VERB[M.slag]} ${P.ord} av ${M.namn}.`, stat: k, forsta: P.forsta.replace('{plagg}', iMening), ...(P.fame ? { fame: P.fame.replace('{plagg}', iMening) } : {}) },
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
// det material den som syr väljer bland ks (alla går att göra nu): punkterna vägs ihop med vikterna i KLADER (steg 10.2.38),
// lägst summa vinner. De första punkterna väger mest, men flera senare kan tillsammans väga upp en tidigare
export function valMaterial(ks: MaterialLage[], l: ValLage): string | undefined {
  if (ks.length <= 1) return ks[0]?.k;
  const billigast = Math.min(...ks.map(m => m.varde));
  // skyddet, finheten och värdet räknas från det minsta (0) till det största (1) bland materialen
  const del = (f: (m: MaterialLage) => number) => { const v = ks.map(f), lo = Math.min(...v), hi = Math.max(...v); return (m: MaterialLage) => hi - lo > 1e-12 ? (f(m) - lo) / (hi - lo) : 0; };
  const skydd = del(m => m.skydd), finhet = del(m => m.finhet), varde = del(m => m.varde);
  const varmNog = (m: MaterialLage) => m.varme >= Math.max(...ks.map(x => x.varme)) - 1e-9 || kladVarmNog(m);
  const summa = (m: MaterialLage) =>
    KLADER.vKyla * (l.kyla && !varmNog(m) ? 1 : 0) // (1) kylan: ett material som håller bäraren varm nog, annars det varmaste
    + KLADER.vHot * (l.hot ? -skydd(m) : 0) // (2) striden: det som skyddar mest
    + KLADER.vSaknas * (m.kvar < m.behovs ? 1 : 0) // (3) det som saknas sparas
    + KLADER.vGottOm * (m.kvar - m.behovs >= KLADER.gottOm * m.till ? 0 : 1) // (4) det som finns gott om används först
    + KLADER.vDyrt * (m.varde > billigast * KLADER.dyrt ? 1 : 0) // (5) det dyra sparas till byten och gåvor
    + KLADER.vFin * (l.fin ? -finhet(m) : finhet(m)) // (6) smak och anseende: den ansedda tar det finare materialet, andra det enklare
    + KLADER.vVarde * (l.fin ? -varde(m) : varde(m)); // ... och värdet: den ansedda tar det dyrare plagget, andra det billigare
  let b = ks[0], bv = summa(b);
  for (const m of ks.slice(1)) { const v = summa(m); if (v < bv - 1e-12) { b = m; bv = v; } }
  return b.k;
}
// varmt nog i kylan: materialet är så varmt som ett vinterplagg behöver (KLADER.vinterVarm), eller plagget värmer inte alls
const kladVarmNog = (m: MaterialLage) => { const r = kladAv(m.k); return !!r && (KLADMATERIAL[r.mat].varme >= KLADER.vinterVarm || PLAGG[r.plagg].varme === 0); };
