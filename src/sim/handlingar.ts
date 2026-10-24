import type { Skill, Stat, Task } from './typer';

// ---------- handlingar ----------
// Allt en person kan göra står här, med det som skiljer handlingarna åt. Resten av koden frågar registret i stället för
// att ha egna listor. En ny handling läggs till här; det som händer när den är klar står i KLAR i steg.ts, och när den
// väljs står i val.ts.
// Ett redskap som hjälper i ett arbete. Raderna står med det bästa först
export interface RedskapDef {
  namn?: string; // det som står att personen gör med redskapet
  tar?: string; // det som läggs till i skälet när redskapet tas
  ger?: number; // så mycket mer arbetet ger med redskapet (det man bedömer i valet av arbete, och i fisket bara där)
  fynd?: number; // levande läge: så många fler fynd innan bördan bärs hem
  don?: 'spjut' | 'metspo'; // fiske: hur fisken fångas (fynd.ts)
  bete?: true; // fiske: mask grävs fram och sätts på kroken
  haller?: number; // hur länge redskapet håller: så många enheter av arbetet (slits, och för fiske försök)
}
export interface ActDef {
  namn: string; // det som står att personen gör
  verktyg?: Record<string, string>; // namnet när ett visst slag av bygge eller hantverk görs (task.tool)
  redskap?: Record<string, RedskapDef>; // redskapen som används i arbetet (sakerna i saker.ts), det bästa först
  slits?: number; // så många sekunders arbete som är en enhet slitage på redskapet (saknas = per försök eller djur)
  ikon?: string; // symbolen för handlingen, t.ex. i teknikträdet (ikoner.ts)
  mark?: string; // symbolen över huvudet medan den görs ('zzz' är sömn)
  // arbete för byn: färdigheten som övas. Är den samma som handlingen väljs arbetet i val.ts efter byns behov
  arbete?: Skill;
  bas?: number; sasong?: number[]; egenskap?: Stat; // hur mycket en arbetstimme ger, per tidsålder, och egenskapen som hjälper
  ger?: string; // det som bärs hem (en sak i saker.ts)
  takt?: number; // hur mycket arbetet ger jämfört med grundtakten; saknas = det platsen har kvar (resurs)
  resurs?: 'samla' | 'jakt' | 'fiske'; // platsen har ett förråd som tar slut och som man minns (fynd.ts, minne.ts)
  fara?: { risk: number; text: string }; // chans per timme att dö i en olycka (mindre för den skicklige)
  fynd?: [number, number]; // levande läge: så många fynd innan bördan bärs hem
  levande?: number; // levande läge: avkastningen jämkad för gångtiden (npm run likhet)
  vandra?: { r: number; h0: number; h1: number; v: number }; // rörelse på platsen: radie, stilla h0–h1 sekunder, fart
  tungt?: true; // tröttar mer än att bara vara vaken
  vila?: true; // man återhämtar sig
  hantverk?: true; // övar hantverk
  social?: true; // man samtalar med dem som är nära
  dygn?: true; // avbryts när dag blir natt eller natt blir dag
  stilla?: true; // står still på platsen (ingen småjustering)
  // var den görs (val.ts): runt elden, vid kolhögen, sovplats, lekplatsen eller ute på marken (skog är förvalt)
  plats?: 'elden' | 'kol' | 'sang' | 'lek' | 'ang' | 'strand' | 'avsides' | 'skog';
  radie?: number; // avstånd från elden, för plats 'elden'
}

const DEF = {
  samla: { namn: 'Samlar bär och rötter', mark: 'korg', redskap: { korg: { namn: 'Samlar bär och rötter med korg', tar: 'Tar en korg.', ger: 1.15, fynd: 2.5, haller: 40 } }, slits: 3600, ikon: 'bar', arbete: 'samla', bas: 0.65, sasong: [0.4, 1.0, 1.25, 1.4], egenskap: 'uthallighet', ger: 'bar', resurs: 'samla', fynd: [3, 5], levande: 1.08, vandra: { r: 2, h0: 3, h1: 10, v: 0.6 }, tungt: true, dygn: true, plats: 'ang' },
  jakt: { namn: 'Jagar', redskap: { flintspjut: { namn: 'Jagar med spjut', tar: 'Tar ett flintspjut.', ger: 1.4, haller: 240 }, fiskespjut: { namn: 'Jagar med spjut', tar: 'Tar ett träspjut.', ger: 1.4, haller: 60 } }, slits: 300, mark: 'kanin', ikon: 'kanin', arbete: 'jakt', bas: 0.62, sasong: [0.7, 0.9, 1.0, 1.15], egenskap: 'mod', ger: 'vilt', resurs: 'jakt', fara: { risk: 0.0008, text: 'under en jakt' }, levande: 0.8, vandra: { r: 3, h0: 3, h1: 10, v: 0.7 }, tungt: true, dygn: true, plats: 'ang' },
  fiske: { namn: 'Fiskar med händerna', mark: 'fisk', redskap: { metspo: { namn: 'Metar', tar: 'Tar ett metspö och gräver fram mask.', ger: 2.4, don: 'metspo', bete: true, haller: 200 }, flintspjut: { namn: 'Fiskar med spjut', tar: 'Tar ett flintspjut.', ger: 2.4, don: 'spjut', haller: 240 }, fiskespjut: { namn: 'Fiskar med spjut', tar: 'Tar ett träspjut.', ger: 2.4, don: 'spjut', haller: 60 } }, ikon: 'fisk', arbete: 'fiske', bas: 0.72, sasong: [0.45, 1.0, 1.1, 1.0], egenskap: 'uthallighet', ger: 'fisk', takt: 0, resurs: 'fiske', levande: 0.8, tungt: true, dygn: true, plats: 'strand' },
  ved: { namn: 'Samlar grenar', mark: 'korg', ikon: 'grenar', arbete: 'ved', bas: 1.3, sasong: [0.9, 1, 1, 1], egenskap: 'styrka', ger: 'grenar', takt: 2, fynd: [3, 5], levande: 0.99, vandra: { r: 2, h0: 3, h1: 10, v: 0.6 }, tungt: true, dygn: true, plats: 'skog' },
  leka: { namn: 'Leker', vandra: { r: 2, h0: 2, h1: 6, v: 1.3 }, social: true, dygn: true, plats: 'lek' },
  vila: { namn: 'Vilar', mark: 'zzz', vila: true, dygn: true, plats: 'sang' },
  samtal: { namn: 'Samtalar vid elden', vila: true, social: true, dygn: true, plats: 'elden' },
  beratta: { namn: 'Berättar vid elden', social: true, dygn: true, plats: 'elden' },
  hantverk: { namn: 'Gör handarbete', verktyg: { rep: 'Tvinnar rep' }, ikon: 'korg', vila: true, hantverk: true, social: true, dygn: true, stilla: true, plats: 'elden' },
  vakt: { namn: 'Håller vakt', social: true, dygn: true, stilla: true, plats: 'elden', radie: 2.6 },
  sova: { namn: 'Sover', mark: 'zzz', vila: true, stilla: true, plats: 'sang' },
  elda: { namn: 'Lägger trä på elden', ger: 'ved' },
  tanda: { namn: 'Försöker tända elden' },
  varma: { namn: 'Värmer sig vid elden', vila: true, social: true, plats: 'elden' },
  toa: { namn: 'Går avsides på toa', plats: 'avsides' },
  kol: { namn: 'Hämtar kol ur den slocknade elden', plats: 'kol' },
  falla: { namn: 'Fäller ett träd med yxa', mark: 'yxa', redskap: { yxa: {} }, arbete: 'ved', takt: 0, tungt: true },
  hugga: { namn: 'Hugger trä av ett fällt träd', mark: 'yxa', redskap: { yxa: {} }, arbete: 'ved', ger: 'ved', takt: 1.5, levande: 0.77, tungt: true },
  yxa: { namn: 'Gör en yxa av en pinne och flinta', mark: 'flinta', hantverk: true, plats: 'elden' },
  spjut: { namn: 'Täljer ett spjut', verktyg: { flintspjut: 'Gör ett flintspjut' }, mark: 'fiskespjut', hantverk: true, plats: 'elden' },
  metspo: { namn: 'Gör ett metspö', mark: 'metspo', hantverk: true, plats: 'elden' },
  kniv: { namn: 'Gör en flintkniv', mark: 'kniv', hantverk: true, plats: 'elden' },
  slakta: { namn: 'Slaktar vilt med kniven', mark: 'kniv', redskap: { kniv: { haller: 250 } }, ikon: 'kniv', hantverk: true, social: true, stilla: true, plats: 'elden' },
  promenad: { namn: 'Tar en promenad', vandra: { r: 4, h0: 1, h1: 4, v: 0.8 }, dygn: true },
  bada: { namn: 'Badar i sjön', dygn: true },
  bara: { namn: 'Bär in saker till lagret' },
  strand: { namn: 'Sitter vid stranden och ser ut över vattnet', dygn: true },
  korg: { namn: 'Flätar en korg av hö', mark: 'torrgras', hantverk: true, plats: 'elden' },
  bygga: { namn: 'Bygger', mark: 'bygga', verktyg: { laga: 'Lagar en vägg', golv: 'Lägger golv', vagg: 'Bygger en vägg' }, ikon: 'bygga', hantverk: true, tungt: true, stilla: true },
} satisfies Record<string, ActDef>;

export type Act = keyof typeof DEF;
export const ACTS: Record<Act, ActDef> = DEF;
export const ACT_LIST = Object.keys(DEF) as Act[];
export const ACT_NAMES = Object.fromEntries(ACT_LIST.map(a => [a, ACTS[a].namn])) as Record<Act, string>;
export const isWork = (a: Act) => ACTS[a].arbete !== undefined;
// arbetena som väljs efter byns behov (de andra är sätt att göra dem, t.ex. att fälla och hugga är vedarbete med yxa)
export const WORK = ACT_LIST.filter(a => ACTS[a].arbete === a);
export const taskName = (t: Task) => (t.tool && (ACTS[t.act].redskap?.[t.tool]?.namn ?? ACTS[t.act].verktyg?.[t.tool])) || ACTS[t.act].namn;
// redskapet en uppgift använder (task.tool kan också vara t.ex. vagg eller rep, eller det spjut som görs) och dess rad
export const toolRow = (t?: Task) => t?.tool ? ACTS[t.act].redskap?.[t.tool] : undefined;
export const usesTool = (t?: Task) => toolRow(t) ? t!.tool : undefined;
// handlingarna där redskapet används
export const actsOf = (k: string) => ACT_LIST.filter(a => ACTS[a].redskap?.[k]);
