// ---------- saker ----------
// Allt byn kan äga står här: mat, bränsle, sten och redskap. Lager, slitage, listorna i panelen och det som bärs hem
// frågar registret. En ny sak läggs till här (och får en ikon i ikoner.ts).
interface SakDef {
  namn: string;
  stack?: number; // en full börda: vad en normalstark vuxen bär. Saknas = ingen egen stack
  ruta?: number; // hur mycket som ryms i en stack på en ruta i lagret; saknas = en börda
  mapp?: string; // mappen i listan över allt byn äger
  mat?: number; // mat: i vilken ordning den äts, lägst först (det som förstörs fortast)
  ruttnar?: number; // mat och sådant som ruttnar som mat: hur fort, jämfört med annan mat
  slits?: number; // det som försvinner av skicket per timme
  blir?: { k: string; per: number }; // det den faller sönder till när skicket är slut, och hur många av den per styck
  redskap?: true; // räknas styckvis; skicket är hur mycket som finns kvar av redskapet
  grupp?: string; // redskap av samma slag som kan ersätta varandra (alla spjut), och görs på samma sätt (redskap.ts)
  trasig?: { stat: string; text?: string }; // när redskapet går sönder i arbetet: det som räknas, och texten första gången ({namn} = den som arbetade)
  dold?: true; // syns inte för invånarna
  i?: string; // ligger gömd i stackarna av det slaget (stack.dold) och har ingen egen stack
  skaffa?: Skaffa; // hur en skaffas; grundvärdet räknas ur det (varde.ts). Saknas = inget värde
}
// hur en sak skaffas: samlas i ett arbete (act, takten i handlingar.ts) eller på annat sätt (tid = arbetstimmar för en),
// eller görs av andra saker (av = så många av varje, min = minuters arbete; det är också så lång tid det tar att göra ett redskap
// eller ett rep, hälften så lång tid som före steg 1.5.13). tek = tekniken som behövs, sallsynt = svår att hitta
interface Skaffa { act?: string; tid?: number; av?: Record<string, number>; min?: number; tek?: string; sallsynt?: true }

// Ordningen är den stackarna läggs ut i, så den ska inte ändras (nya saker läggs sist)
const DEF = {
  bar: { namn: 'Bär', skaffa: { act: 'samla' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 4, ruttnar: 0.7 },
  rotter: { namn: 'Rötter', skaffa: { act: 'samla' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 5, ruttnar: 0.35 },
  kott: { namn: 'Kött', skaffa: { av: { vilt: 0.6 }, min: 3, tek: 'kniv' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 2, ruttnar: 0.8 }, // slaktat vilt (en kanin, 1,6 fällt vilt, ger 2,1 kött, ett ben och ett skinn); köttet håller längre än fisk
  fisk: { namn: 'Fiskkött', skaffa: { av: { abborre: 1 }, min: 2 }, stack: 25, ruta: 75, mapp: 'Mat', mat: 1, ruttnar: 2 },
  svamp: { namn: 'Svamp', skaffa: { act: 'samla' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 3, ruttnar: 1 },
  ved: { namn: 'Trä', skaffa: { act: 'hugga', tek: 'yxa' }, stack: 25, mapp: 'Bränsle', slits: 0.0004, blir: { k: 'grenar', per: 2 } },
  grenar: { namn: 'Grenar', skaffa: { act: 'ved' }, stack: 50, mapp: 'Bränsle', slits: 0.0006 },
  torrgras: { namn: 'Hö', skaffa: { tid: 0.4 }, stack: 50, mapp: 'Bränsle', slits: 0.0015 },
  kol: { namn: 'Kol', skaffa: { tid: 0.3 }, stack: 25, mapp: 'Bränsle' },
  flinta: { namn: 'Flinta', skaffa: { tid: 8, sallsynt: true }, stack: 10, mapp: 'Sten' },
  yxa: { namn: 'Flintyxa', skaffa: { av: { flinta: 1, grenar: 1 }, min: 60, tek: 'yxa' }, stack: 1, mapp: 'Redskap', slits: 0.0004, redskap: true },
  fiskespjut: { namn: 'Träspjut', skaffa: { av: { grenar: 1 }, min: 20, tek: 'fiskespjut' }, stack: 1, mapp: 'Redskap', slits: 0.001, redskap: true, grupp: 'spjut', trasig: { stat: 'spjutTrasiga', text: '{namn}s träspjut gick sönder. Träspjuten håller inte länge.' } },
  korg: { namn: 'Korg', skaffa: { av: { torrgras: 3 }, min: 20, tek: 'korg' }, stack: 1, mapp: 'Redskap', slits: 0.001, redskap: true, trasig: { stat: 'korgarTrasiga', text: '{namn}s korg gick sönder.' } },
  // giftig svamp som av misstag hamnat i förrådet bland den ätliga (fynd.ts). Den ligger i svampstacken och syns inte
  giftsvamp: { namn: 'Giftig svamp', ruttnar: 1, dold: true, i: 'svamp' },
  sten: { namn: 'Sten', skaffa: { tid: 0.8 }, stack: 10, mapp: 'Sten' },
  rep: { namn: 'Rep', skaffa: { av: { torrgras: 2 }, min: 30, tek: 'rep' }, stack: 20, mapp: 'Material', slits: 0.0003 },
  ben: { namn: 'Ben', skaffa: { av: { vilt: 0.15 }, min: 3, tek: 'kniv' }, stack: 20, mapp: 'Material' },
  flintspjut: { namn: 'Flintspjut', skaffa: { av: { flinta: 1, rep: 1, grenar: 1 }, min: 30, tek: 'flintspjut' }, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true, grupp: 'spjut', trasig: { stat: 'spjutTrasiga', text: '{namn}s flintspjut gick sönder.' } },
  metspo: { namn: 'Metspö', skaffa: { av: { rep: 1, ben: 1, grenar: 1 }, min: 30, tek: 'metspo' }, stack: 1, mapp: 'Redskap', slits: 0.0005, redskap: true, trasig: { stat: 'metspoTrasiga' } },
  // ett fällt djur, helt som det är (vilket djur det än är). En kanin fyller famnen, så stacken är en kanin
  vilt: { namn: 'Fällt vilt', skaffa: { act: 'jakt' }, stack: 1.6, ruta: 16, mapp: 'Mat', mat: 1.5, ruttnar: 1.1 },
  kniv: { namn: 'Flintkniv', skaffa: { av: { flinta: 1, grenar: 1 }, min: 20, tek: 'kniv' }, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true },
  skinn: { namn: 'Skinn', skaffa: { av: { vilt: 0.3 }, min: 5, tek: 'kniv' }, stack: 10, mapp: 'Material', slits: 0.0006 },
  // en hel fisk som den fångats (DJUR i redskap.ts). Den rensas vid elden till fiskkött (fisk), som är det man äter;
  // bara när inget annat finns äts den som den är
  abborre: { namn: 'Abborre', skaffa: { act: 'fiske' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 6, ruttnar: 2 },
  // ett redskap som någon har börjat göra men inte gjort klart (paborjat.ts). Det slits och värderas där, inte här
  paborjat: { namn: 'Påbörjat', stack: 1, mapp: 'Redskap', redskap: true },
} satisfies Record<string, SakDef>;

type Sak = keyof typeof DEF;
export const SAKER: Record<string, SakDef | undefined> = DEF;
export const SAK_LIST = Object.keys(DEF) as Sak[];
export const sak = (k: string) => SAKER[k];
export const sakNamn = (k: string) => SAKER[k]?.namn ?? k;
// namnet på ett ting: ett påbörjat redskap (paborjat.ts) heter som det ska bli
export const tingNamn = (t: { k: string; halv?: { gor: string } }) => t.halv ? `${sakNamn(t.halv.gor)} (inte klar)` : sakNamn(t.k);

export const STACK: Record<string, number> = Object.fromEntries(SAK_LIST.filter(k => SAKER[k]!.stack).map(k => [k, SAKER[k]!.stack!]));
export const STACK_ORDER = Object.keys(STACK);
export const RUTA: Record<string, number> = Object.fromEntries(STACK_ORDER.map(k => [k, SAKER[k]!.ruta ?? STACK[k]])); // hur mycket som ryms på en ruta
const STACK_STD = 25; // stackens och rutans storlek för ett slag som saknar egen (gamla sparfiler, prov)
export const stackOf = (k: string) => STACK[k] ?? STACK_STD;
export const rutaOf = (k: string) => RUTA[k] ?? STACK_STD;
export const FOOD = SAK_LIST.filter(k => SAKER[k]!.mat !== undefined).sort((a, b) => SAKER[a]!.mat! - SAKER[b]!.mat!) as string[]; // i den ordning de äts
export const isFood = (k: string) => SAKER[k]?.mat !== undefined;
export const isTool = (k: string) => !!SAKER[k]?.redskap;
export const REDSKAP_SLAG = SAK_LIST.filter(isTool); // alla redskapsslag, i registrets ordning
export const gruppOf = (k: string) => SAKER[k]?.grupp ?? k;
// mappar i listan över allt byn äger; maten med det som håller längst först
export const FOLDERS: { namn: string; k: string[] }[] = [...new Set(SAK_LIST.map(k => SAKER[k]!.mapp).filter(m => m))].map(namn => ({
  namn: namn!, k: SAK_LIST.filter(k => SAKER[k]!.mapp === namn).sort((a, b) => (SAKER[b]!.mat ?? 0) - (SAKER[a]!.mat ?? 0)),
}));
