// ---------- saker ----------
// Allt byn kan äga står här: mat, bränsle, sten och redskap. Lager, slitage, listorna i panelen och det som bärs hem
// frågar registret. En ny sak läggs till här (och får en ikon i ikoner.ts).
export interface SakDef {
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
  varde?: number; // vad en (ett styck, en portion) är värd, ungefär i arbete; byns rikedom är summan (delning.ts). Saknas = 0
}

// Ordningen är den stackarna läggs ut i, så den ska inte ändras (nya saker läggs sist)
const DEF = {
  bar: { namn: 'Bär', varde: 1, stack: 25, ruta: 75, mapp: 'Mat', mat: 4, ruttnar: 0.7 },
  rotter: { namn: 'Rötter', varde: 1, stack: 25, ruta: 75, mapp: 'Mat', mat: 5, ruttnar: 0.35 },
  kott: { namn: 'Kött', varde: 1.5, stack: 25, ruta: 75, mapp: 'Mat', mat: 2, ruttnar: 0.8 }, // slaktat vilt; köttet håller längre än fisk
  fisk: { namn: 'Fisk', varde: 1, stack: 25, ruta: 75, mapp: 'Mat', mat: 1, ruttnar: 2 },
  svamp: { namn: 'Svamp', varde: 1, stack: 25, ruta: 75, mapp: 'Mat', mat: 3, ruttnar: 1 },
  ved: { namn: 'Trä', varde: 1, stack: 25, mapp: 'Bränsle', slits: 0.0004, blir: { k: 'grenar', per: 2 } },
  grenar: { namn: 'Grenar', varde: 0.5, stack: 50, mapp: 'Bränsle', slits: 0.0006 },
  torrgras: { namn: 'Hö', varde: 0.3, stack: 50, mapp: 'Bränsle', slits: 0.0015 },
  kol: { namn: 'Kol', varde: 2, stack: 25, mapp: 'Bränsle' },
  flinta: { namn: 'Flinta', varde: 3, stack: 10, mapp: 'Sten' },
  yxa: { namn: 'Flintyxa', varde: 30, stack: 1, mapp: 'Redskap', slits: 0.0004, redskap: true },
  fiskespjut: { namn: 'Träspjut', varde: 10, stack: 1, mapp: 'Redskap', slits: 0.001, redskap: true, grupp: 'spjut', trasig: { stat: 'spjutTrasiga', text: '{namn}s träspjut gick sönder. Träspjuten håller inte länge.' } },
  korg: { namn: 'Korg', varde: 15, stack: 1, mapp: 'Redskap', slits: 0.001, redskap: true, trasig: { stat: 'korgarTrasiga', text: '{namn}s korg gick sönder.' } },
  // giftig svamp som av misstag hamnat i förrådet bland den ätliga (fynd.ts). Den ligger i svampstacken och syns inte
  giftsvamp: { namn: 'Giftig svamp', ruttnar: 1, dold: true, i: 'svamp' },
  sten: { namn: 'Sten', varde: 1, stack: 10, mapp: 'Sten' },
  rep: { namn: 'Rep', varde: 3, stack: 20, mapp: 'Material', slits: 0.0003 },
  ben: { namn: 'Ben', varde: 1, stack: 20, mapp: 'Material' },
  flintspjut: { namn: 'Flintspjut', varde: 25, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true, grupp: 'spjut', trasig: { stat: 'spjutTrasiga', text: '{namn}s flintspjut gick sönder.' } },
  metspo: { namn: 'Metspö', varde: 15, stack: 1, mapp: 'Redskap', slits: 0.0005, redskap: true, trasig: { stat: 'metspoTrasiga' } },
  // ett fällt djur, helt som det är (vilket djur det än är). En kanin fyller famnen, så stacken är en kanin
  vilt: { namn: 'Fällt vilt', varde: 15, stack: 1.6, ruta: 16, mapp: 'Mat', mat: 1.5, ruttnar: 1.1 },
  kniv: { namn: 'Flintkniv', varde: 20, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true },
  skinn: { namn: 'Skinn', varde: 5, stack: 10, mapp: 'Material', slits: 0.0006 },
} satisfies Record<string, SakDef>;

export type Sak = keyof typeof DEF;
export const SAKER: Record<string, SakDef | undefined> = DEF;
export const SAK_LIST = Object.keys(DEF) as Sak[];
export const sak = (k: string) => SAKER[k];
export const sakNamn = (k: string) => SAKER[k]?.namn ?? k;

export const STACK: Record<string, number> = Object.fromEntries(SAK_LIST.filter(k => SAKER[k]!.stack).map(k => [k, SAKER[k]!.stack!]));
export const STACK_ORDER = Object.keys(STACK);
export const RUTA: Record<string, number> = Object.fromEntries(STACK_ORDER.map(k => [k, SAKER[k]!.ruta ?? STACK[k]])); // hur mycket som ryms på en ruta
export const FOOD = SAK_LIST.filter(k => SAKER[k]!.mat !== undefined).sort((a, b) => SAKER[a]!.mat! - SAKER[b]!.mat!) as string[]; // i den ordning de äts
export const isFood = (k: string) => SAKER[k]?.mat !== undefined;
export const isTool = (k: string) => !!SAKER[k]?.redskap;
export const gruppOf = (k: string) => SAKER[k]?.grupp ?? k;
// mappar i listan över allt byn äger; maten med det som håller längst först
export const FOLDERS: { namn: string; k: string[] }[] = [...new Set(SAK_LIST.map(k => SAKER[k]!.mapp).filter(m => m))].map(namn => ({
  namn: namn!, k: SAK_LIST.filter(k => SAKER[k]!.mapp === namn).sort((a, b) => (SAKER[b]!.mat ?? 0) - (SAKER[a]!.mat ?? 0)),
}));
