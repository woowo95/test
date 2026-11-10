import type { Skill, Stat, Task } from './typer';

// ---------- handlingar ----------
// Allt en person kan göra står här, med det som skiljer handlingarna åt. Resten av koden frågar registret i stället för
// att ha egna listor. En ny handling läggs till här; det som händer när den är klar står i KLAR i steg.ts, och när den
// väljs står i val.ts.
// Sedan steg 1.5.13 går allt man skaffar 1,5 gånger så fort: bär, rötter, svamp, vilt, fisk, grenar, trä, hö, sten och flinta,
// och att fälla ett träd. Sedan steg 2.3.9 ytterligare 1,5 gånger så fort (2,25 gånger raderna), så att byn kommer igång fortare.
// Takten i raderna nedan (bas) är den gamla; arbetet (workRate i ekonomi.ts) och värdet (varde.ts)
// räknar med SNABBARE. Att göra en sak tar sin tid i saker.ts (skaffa.min)
export const SNABBARE = 2.25;
// Ett redskap som hjälper i ett arbete. Raderna står med det bästa först
export interface RedskapDef {
  namn?: string; // det som står att personen gör med redskapet
  tar?: string; // det som läggs till i skälet när redskapet tas
  ger?: number; // så mycket mer arbetet ger med redskapet (det man bedömer i valet av arbete, och i fisket bara där)
  don?: 'spjut' | 'metspo'; // fiske: hur fisken fångas (fynd.ts)
  bete?: true; // fiske: mask grävs fram och sätts på kroken
  napp?: number; hall?: number; // fiske: chansen att det nappar per försök, och att fisken sitter kvar när den nappat (fynd.ts, handFish)
  haller?: number; // hur länge redskapet håller: så många av det handlingen slits per (slits.enhet), oberoende av hur fort arbetet går (steg 2.3.12)
  rotter?: number; // samla: så många gånger fler rötter man gräver fram med redskapet (benspaden, steg 2.7.2)
  kravs?: true; // arbetet går inte utan redskapet: går det sönder slutar man (ett träd står kvar halvfällt)
}
// slagen av arbete: symbolen över huvudet visar vad man håller på med, aldrig samma symbol som en sak eller ett redskap
// (ikoner.ts har dem som 'a_' + slaget; vila ritas som z som stiger). Samtal har ingen: det syns som pratbubblor
export const SLAG = {
  samla: 'Samlar', jaga: 'Jagar', fiska: 'Fiskar', tra: 'Hämtar trä', bygga: 'Bygger', hantverk: 'Gör hantverk',
  bara: 'Bär', elda: 'Sköter elden', odla: 'Odlar', vila: 'Vilar', prata: 'Pratar', leka: 'Leker',
} as const;
type Slag = keyof typeof SLAG;
export const slagIkon = (k: Slag) => k === 'vila' ? 'zzz' : k === 'prata' ? undefined : 'a_' + k;
// pixelsymbolen över huvudet: slagets, annars handlingens egen (ikon)
export const actIkon = (a: Act) => { const sl = ACTS[a].slag; return sl ? slagIkon(sl) : ACTS[a].ikon; };
// tecknet för ett slag som inte har en pixelbild (personrutans tårtdiagram); handlingar utan slag har sitt eget (tecken)
export const SLAG_TECKEN: Partial<Record<Slag, string>> = { vila: '💤', prata: '💬' };

interface ActDef {
  namn: string; // det som står att personen gör
  verktyg?: Record<string, string>; // namnet när ett visst slag av bygge eller hantverk görs (task.tool)
  redskap?: Record<string, RedskapDef>; // redskapen som används i arbetet (sakerna i saker.ts), det bästa först
  // vad redskapet slits per (steg 2.3.12): enhet är ordet i inforutan. per 'ger' = för det arbetet ger (workStep i steg.ts);
  // per 'gang' = en gång för varje träd, kanin, fiskeförsök eller djur, där det blir klart; utan per slits det inte här (hugga: trädet slet redan när det fälldes)
  slits?: { enhet: string; per?: 'ger' | 'gang' };
  syn?: true; // arbetet går sämre för den som ser dåligt (steg 8.2.2)
  yrke?: string; // den som gör detta klart mer än andra kallas så (yrkestaggarna, YRKEN i seder.ts)
  slag?: Slag; // slaget av arbete, som syns som en symbol över huvudet medan den görs (SLAG)
  tecken?: string; // symbolen för en handling utan slag (personrutans tårtdiagram över tiden)
  ikon?: string; // pixelsymbolen över huvudet för en handling utan slag (ikoner.ts), t.ex. toa (steg 3.10.3)
  verb?: string; // vid en bänk (steg 3.10.3): det man gör, kort, som i "Arkiv rensar" och saken bredvid. Saknas = gör
  under?: Partial<Record<Task['phase'], string>>; // undertexten efter namnet på väg dit, där och på väg hem (underText, steg 3.10.3)
  // arbete för byn: färdigheten som övas. Är den samma som handlingen väljs arbetet i val.ts efter byns behov
  arbete?: Skill;
  bas?: number; sasong?: number[]; egenskap?: Stat; // hur mycket en arbetstimme ger, per tidsålder, och egenskapen som hjälper
  fart?: number; // samlandet (steg 2.12.4): så många gånger fortare går arbetet, både det platsen ger och det man hittar där (svamp, mossa, frön), så att en full börda samlas på 10–20 minuter. Platsen töms lika mycket per bär, så man går vidare till nästa buske (nastaBuske i val.ts)
  // arbetet fyller byns förråd av mat eller ved, och förrådet avgör hur mycket arbetet behövs (bestWork i val.ts, steg 2.12.3)
  behov?: 'mat' | 'ved';
  tand?: true; // den som gör arbetet samlar också tändmaterial åt en släckt eld
  vid?: 'vatten'; // görs vid vattnet: går bara när man når det (genom isen bara med ett hål), och för hand ger det lite (FANGST.handFiske)
  ger?: string; // det som bärs hem (en sak i saker.ts)
  takt?: number; // hur mycket arbetet ger jämfört med grundtakten; saknas = det platsen har kvar (resurs)
  resurs?: 'samla' | 'jakt' | 'fiske'; // platsen har ett förråd som tar slut och som man minns (fynd.ts, minne.ts)
  hand?: { napp: number; hall: number }; // fiske utan redskap: samma tal som napp och hall i redskapets rad
  hemVarje?: true; // varje fångst bärs hem på en gång (fisket)
  runda?: { stopp: [number, number]; r: number; leta: string; plock: string; hel?: true };
  tur?: { r: number; stopp: [number, number]; se: number }; // promenaden (steg 6.2.8, turSteg i steg.ts): man går i vanlig fart mellan punkter på land inom r rutor från platsen man valt, och vid en del av dem (se, 0–1) stannar man stopp[0]–stopp[1] sekunder och ser sig omkring // rundan (steg 4.5.6.1): man går i full fart från ruta till ruta inom r rutor och stannar stopp[0]–stopp[1] sekunder där det finns något att plocka; gången räknas som arbete. leta och plock är undertexterna (underText). hel: varje stopp ger en hel sak i handen (steg 6.1.3): arbetet mot nästa sak räknas medan man letar, och man stannar först där den är klar
  vandra?: { r: number; h0: number; h1: number; v: number }; // rörelse på platsen (bara det som visas, och lite slitage): radie, stilla h0–h1 sekunder, fart
  tungt?: true; // tröttar mer än att bara vara vaken
  vila?: true; // man återhämtar sig
  hantverk?: true; // övar hantverk
  ovar?: Skill; // en färdighet till som övas (grilla övar matlagning, matlagning.ts); personrutan visar den som övad just nu
  social?: true; // man samtalar med dem som är nära
  tyst?: true; // men pratar inte under den (steg 9.2.100): ritualen; sporten säger det för varje sport (SportDef.tyst)
  skamfri?: true; // skammen (straffet skam, styre.ts) byter inte ut den: måltiden och det som skyddar (värmen, skuggan, vakten, försvaret)
  varmer?: true; // görs för att bli varm: ett rum väljs bara om det är minst lika varmt som vid elden (varmareInne)
  dygn?: true; // avbryts när dag blir natt eller natt blir dag
  stilla?: true; // står still på platsen (ingen småjustering i bilden)
  vapen?: true; // har sitt vapen i handen hela tiden (vakt.ts: taVapen; agande.ts: tidyTools)
  framme?: true; // arbetstiden räknas från att man kommit fram (startsOnArrival i paborjat.ts), så att vägen dit inte äter av den
  // var den görs (val.ts): runt elden, vid kolhögen, sovplats, var som helst i byn (lek), ute på marken (skog är förvalt) eller vid
  // stationen där handlingen görs (stationer.ts; runt elden så länge byn inte har någon)
  // eller vid ett bord (en ledig plats, steg 2.2.15; vid elden om det inte finns någon)
  // eller i skuggan under ett träd eller i ett hus nära den som är för varm (steg 2.3.13)
  plats?: 'elden' | 'kol' | 'sang' | 'lek' | 'ang' | 'strand' | 'avsides' | 'skog' | 'station' | 'bord' | 'skugga';
  radie?: number; // avstånd från elden, för plats 'elden'
  fortsatter?: readonly Larmslag[]; // larmen som inte avbryter handlingen (brand.ts, tornado.ts, varg.ts)
  nodFri?: true; // nöden (toa) avbryter den inte (steg.ts)
  gast?: readonly import('./gast').GastSort[]; // en gästs egen handling (steg 9.2.113, gastvardag.ts): bara de sorterna gör den, aldrig byborna
}
export type Larmslag = 'brand' | 'tornado' | 'varg';
// avbryter larmet om en eldsvåda, en tornado eller vargar handlingen? (kodgenomgången 3.10.25: tre listor med namn blev en
// egenskap i registret)
export const larmAvbryter = (act: string, larm: Larmslag) => !(ACTS as Record<string, ActDef>)[act]?.fortsatter?.includes(larm);

const DEF = {
  samla: { syn: true, namn: 'Samlar bär och rötter', yrke: 'Samlare', slag: 'samla', redskap: { korg: { namn: 'Samlar bär och rötter med korg', tar: 'Tar en korg.', ger: 1.9, haller: 32 }, benspade: { namn: 'Gräver rötter med spaden', tar: 'Tar benspaden.', rotter: 2, haller: 40 } }, slits: { enhet: 'bär och rötter', per: 'ger' }, arbete: 'samla', behov: 'mat', tand: true, bas: 0.4, sasong: [0.4, 1.0, 1.25, 1.4], egenskap: 'uthallighet', ger: 'bar', resurs: 'samla', fart: 100, runda: { stopp: [2, 5], r: 3, leta: 'letar efter bär', plock: 'plockar bär' }, tungt: true, dygn: true, plats: 'ang' },
  jakt: { syn: true, namn: 'Jagar', yrke: 'Jägare', redskap: { flintspjut: { namn: 'Jagar med spjut', tar: 'Tar ett flintspjut.', ger: 2.5, haller: 20 }, fiskespjut: { namn: 'Jagar med spjut', tar: 'Tar ett träspjut.', ger: 2.5, haller: 5 } }, slits: { enhet: 'harar', per: 'gang' }, slag: 'jaga', arbete: 'jakt', behov: 'mat', bas: 0.35, sasong: [0.7, 0.9, 1.0, 1.15], egenskap: 'mod', ger: 'vilt', resurs: 'jakt', vandra: { r: 3, h0: 3, h1: 10, v: 0.7 }, tungt: true, dygn: true, plats: 'ang' },
  fiske: { syn: true, namn: 'Fiskar med händerna', yrke: 'Fiskare', slag: 'fiska', hand: { napp: 0.06, hall: 0.15 }, redskap: { metspo: { namn: 'Metar', tar: 'Tar ett metspö och gräver fram mask.', ger: 4.3, don: 'metspo', bete: true, napp: 0.17, hall: 0.65, haller: 200 }, flintspjut: { namn: 'Fiskar med spjut', tar: 'Tar ett flintspjut.', ger: 4.3, don: 'spjut', napp: 0.13, hall: 0.5, haller: 240 }, fiskespjut: { namn: 'Fiskar med spjut', tar: 'Tar ett träspjut.', ger: 4.3, don: 'spjut', napp: 0.13, hall: 0.5, haller: 60 } }, slits: { enhet: 'fiskeförsök', per: 'gang' }, arbete: 'fiske', behov: 'mat', vid: 'vatten', bas: 0.4, sasong: [0.45, 1.0, 1.1, 1.0], egenskap: 'uthallighet', ger: 'abborre', takt: 0, resurs: 'fiske', hemVarje: true, tungt: true, dygn: true, plats: 'strand' },
  ved: { namn: 'Samlar grenar', yrke: 'Trähuggare', slag: 'tra', arbete: 'ved', behov: 'ved', bas: 1.3, sasong: [0.9, 1, 1, 1], egenskap: 'styrka', ger: 'grenar', takt: 60, vandra: { r: 2, h0: 3, h1: 10, v: 0.6 }, runda: { stopp: [3, 6], r: 3, leta: 'letar efter grenar', plock: 'plockar grenar', hel: true }, tungt: true, dygn: true, plats: 'skog' },
  leka: { namn: 'Leker', slag: 'leka', vandra: { r: 2, h0: 2, h1: 6, v: 1.3 }, social: true, dygn: true, plats: 'lek' },
  // sporten (steg 4.3.1, sport.ts): på en plats i byn under fritiden; task.tool är sporten och task.ref matchens start
  sport: { namn: 'Spelar', verktyg: { brottning: 'Brottas', dragkamp: 'Drar i dragkampen', kast: 'Kastar mot målet', bollspel: 'Spelar bollspel', snoboll: 'Kastar snöboll' }, slag: 'leka', vandra: { r: 2, h0: 2, h1: 6, v: 1.3 }, social: true, dygn: true, plats: 'lek' },
  vila: { namn: 'Vilar', yrke: 'Dagdrivare', slag: 'vila', vila: true, dygn: true, plats: 'sang' },
  samtal: { namn: 'Samtalar vid elden', slag: 'prata', vila: true, social: true, dygn: true, plats: 'elden' },
  maltid: { namn: 'Äter vid bordet', tecken: '🍽️', vila: true, social: true, skamfri: true, dygn: true, stilla: true, plats: 'bord' }, // steg 2.2.15
  // framträdandena (steg 4.3.2, framtradande.ts): på kvällen vid elden; task.tool är formen och task.ref när det började
  upptrada: { namn: 'Uppträder', verktyg: { kvade: 'Kväder', tal: 'Håller tal', forelasning: 'Föreläser', teater: 'Spelar teater', sang: 'Sjunger', musik: 'Spelar musik' }, slag: 'prata', dygn: true, stilla: true, plats: 'elden' },
  lyssna: { namn: 'Lyssnar', tecken: '👂', vila: true, dygn: true, stilla: true, plats: 'elden' },
  beratta: { namn: 'Berättar vid elden', yrke: 'Berättare', slag: 'prata', social: true, dygn: true, plats: 'elden' },
  hantverk: { namn: 'Gör handarbete', yrke: 'Hantverkare', slag: 'hantverk', verktyg: { rep: 'Tvinnar rep' }, vila: true, hantverk: true, social: true, dygn: true, stilla: true, plats: 'elden' },
  vakt: { namn: 'Håller vakt', yrke: 'Väktare', tecken: '👁️', social: true, skamfri: true, dygn: true, stilla: true, vapen: true, plats: 'elden', radie: 2.6, fortsatter: ['varg'] as const },
  // när vargar är nära (steg 3.7.15, varg.ts): de svaga gömmer sig i huset, de modiga väntar med vapen vid elden
  gomma: { namn: 'Gömmer sig', tecken: '🫣', dygn: true, stilla: true, plats: 'sang', fortsatter: ['varg'] as const },
  forsvar: { namn: 'Väntar på vargarna med vapen', tecken: '🛡️', social: true, skamfri: true, dygn: true, stilla: true, vapen: true, plats: 'elden', radie: 2.2, fortsatter: ['varg'] as const },
  // mot rövare (steg 9.2.74, rovare.ts): man väntar vid förrådet, dit rövarna är på väg, och platsen sätts i rovarSkydd
  budRovare: { namn: 'Hämtar folk', tecken: '🏃', social: true, skamfri: true, dygn: true, fortsatter: ['varg'] as const }, // budbäraren (steg 9.2.117)
  hjalpaRovare: { namn: 'Håller sig bakom kämparna', tecken: '🤲', social: true, skamfri: true, dygn: true, stilla: true, fortsatter: ['varg'] as const }, // steg 9.2.116
  forsvarRovare: { namn: 'Väntar på rövarna med vapen', tecken: '🛡️', social: true, skamfri: true, dygn: true, stilla: true, vapen: true, fortsatter: ['varg'] as const },
  sova: { namn: 'Sover', slag: 'vila', under: { go: 'går och lägger sig' }, vila: true, stilla: true, plats: 'sang' },
  elda: { namn: 'Lägger ved på elden', yrke: 'Eldvaktare', slag: 'elda', under: { go: 'hämtar ved', back: 'bär ved till elden' }, ger: 'ved' },
  tanda: { namn: 'Försöker tända elden', yrke: 'Eldvaktare', slag: 'elda' },
  flyttaeld: { namn: 'Flyttar elden', yrke: 'Eldvaktare', slag: 'elda', tungt: true }, // steg 2.10.4: släcker elden och bär stenarna till en ny eldplats (eldflytt.ts)
  varma: { namn: 'Värmer sig vid elden', tecken: '♨️', vila: true, social: true, skamfri: true, varmer: true, plats: 'elden' },
  svalka: { namn: 'Svalkar sig i skuggan', tecken: '🌳', vila: true, social: true, skamfri: true, dygn: true, stilla: true, plats: 'skugga' }, // steg 2.3.13
  toa: { namn: 'Går avsides på toa', tecken: '{sym_toa}', ikon: 'a_toa', verb: 'är på toa', plats: 'avsides', nodFri: true },
  dricka: { namn: 'Dricker vid vattnet', tecken: '🥤' }, // steg 2.4.1: platsen väljs i torst.ts
  smalta: { namn: 'Smälter snö vid elden och dricker', tecken: '🫗', plats: 'elden' }, // i istiden, när sjön är frusen
  // vården (steg 2.5.2, halsa.ts): platsen är den skadade, och den som inte kan gå bärs hem eller får vatten där hen ligger
  varda: { namn: 'Vårdar', tecken: '🩹', under: { back: 'bär den skadade' }, stilla: true, framme: true, fortsatter: ['brand', 'tornado', 'varg'] as const },
  // tron och graven (system 8.5, kult.ts och kvarlevor.ts)
  hovbygge: { namn: 'Bygger hovet', slag: 'bygga', tungt: true, framme: true, stilla: true }, // steg 8.6.14
  be: { namn: 'Ber', tecken: '✨', ikon: 'a_be', framme: true, stilla: true, skamfri: true },
  ritual: { namn: 'Är med på en ritual', tecken: '✨', ikon: 'a_be', stilla: true, social: true, tyst: true, dygn: true },
  begrava: { namn: 'Går för att ta hand om en död', tecken: '✨', ikon: 'a_be', framme: true, stilla: true },
  grava: { namn: 'Gräver en grav', slag: 'bygga', tungt: true, framme: true, stilla: true, redskap: { benspade: { tar: 'Tar benspaden.', haller: 40 } }, slits: { enhet: 'gravar', per: 'gang' } },
  foder: { namn: 'Föder barn', tecken: '🧒', stilla: true, nodFri: true, fortsatter: ['brand', 'tornado', 'varg'] as const }, // steg 9.5.29
  forlossa: { namn: 'Hjälper till vid en förlossning', tecken: '🩹', stilla: true }, // steg 9.5.29
  medvetslos: { namn: 'Ligger medvetslös', tecken: '✨', stilla: true, fortsatter: ['brand', 'tornado', 'varg'] as const, nodFri: true },
  buren: { namn: 'Bärs hem', tecken: '🫂', stilla: true, fortsatter: ['brand', 'tornado', 'varg'] as const, nodFri: true },
  fatt: { namn: 'Får vatten av de andra', tecken: '🥤', stilla: true, fortsatter: ['brand', 'tornado', 'varg'] as const },
  // vattensäcken (steg 2.10.1, torst.ts): fylls vid vattnet och bärs till den som inte kan gå. Den slits en gång per tur
  vatten: { namn: 'Hämtar vatten', tecken: '🫗', under: { go: 'fyller vattensäcken', back: 'bär vatten' }, redskap: { vattensack: { tar: 'Tar vattensäcken.', haller: 150, kravs: true }, lerkruka_mellan: { tar: 'Tar en lerkruka.', haller: 150 } }, slits: { enhet: 'turer med vatten', per: 'gang' }, framme: true }, // eller i en mellanstor lerkruka (steg 9.4.12)
  kol: { namn: 'Hämtar kol ur den slocknade elden', tecken: '⚫', plats: 'kol' },
  falla: { namn: 'Fäller ett träd med yxa', yrke: 'Trähuggare', slag: 'tra', redskap: { yxa: { haller: 85, kravs: true } }, slits: { enhet: 'träd', per: 'gang' }, arbete: 'ved', takt: 0, tungt: true, framme: true },
  hugga: { namn: 'Hugger ved av ett fällt träd', yrke: 'Trähuggare', slag: 'tra', redskap: { yxa: { haller: 85, kravs: true } }, slits: { enhet: 'träd' }, arbete: 'ved', ger: 'ved', takt: 20, tungt: true },
  // virket (steg 4.5.5.2): kluvna stockar ur en fälld stam, till stationerna och möblerna. Ett projekt (projekt.ts)
  klyva: { namn: 'Klyver virke ur ett fällt träd', yrke: 'Trähuggare', slag: 'tra', redskap: { yxa: { haller: 85, kravs: true } }, slits: { enhet: 'träd' }, arbete: 'ved', ger: 'virke', takt: 5, tungt: true },
  yxa: { namn: 'Gör en yxa av en pinne och flinta', slag: 'hantverk', hantverk: true, plats: 'station' },
  spjut: { namn: 'Täljer ett spjut', verktyg: { flintspjut: 'Gör ett flintspjut' }, slag: 'hantverk', hantverk: true, verb: 'täljer', plats: 'station' },
  metspo: { namn: 'Gör ett metspö', slag: 'hantverk', hantverk: true, plats: 'station' },
  kniv: { namn: 'Gör en flintkniv', slag: 'hantverk', hantverk: true, plats: 'station' },
  slakta: { namn: 'Slaktar vilt med kniven', slag: 'hantverk', redskap: { kniv: { haller: 250, kravs: true } }, slits: { enhet: 'djur', per: 'gang' }, hantverk: true, social: true, stilla: true, verb: 'slaktar', plats: 'station' },
  promenad: { namn: 'Tar en promenad', tecken: '🚶', tur: { r: 10, stopp: [20, 90], se: 0.35 }, dygn: true },
  bada: { namn: 'Badar i sjön', tecken: '🏊', dygn: true },
  bara: { namn: 'Bär in saker till lagret', slag: 'bara' },
  strand: { namn: 'Sitter vid stranden och ser ut över vattnet', tecken: '🌊', dygn: true },
  hugga_sten: { namn: 'Hugger sten', slag: 'hantverk', hantverk: true, verb: 'hugger', plats: 'station' }, // vid stenhuggarplatsen (steg 7.5.1)
  klyva_plank: { namn: 'Klyver plankor', slag: 'hantverk', hantverk: true, verb: 'klyver', plats: 'station' }, // vid klyvplatsen
  koka_vatten: { namn: 'Kokar vatten', slag: 'hantverk', hantverk: true, verb: 'kokar', plats: 'station' }, // i en lerkruka vid elden eller i örtköket (steg 9.5.25)
  krossa_saft: { namn: 'Gör saft', slag: 'hantverk', hantverk: true, verb: 'krossar bär', plats: 'elden' }, // bär till saft i en lerkruka (steg 9.6.9)
  koka_te: { namn: 'Kokar örtte', slag: 'hantverk', hantverk: true, verb: 'kokar', plats: 'station' }, // vid örtköket, annars vid elden (steg 9.5.8)
  koka_salva: { namn: 'Kokar salva', slag: 'hantverk', hantverk: true, verb: 'kokar', plats: 'station' }, // vid örtköket (steg 7.6)
  koka_tjara: { namn: 'Kokar tjära', slag: 'hantverk', hantverk: true, verb: 'kokar', plats: 'station' },
  koka_lim: { namn: 'Kokar benlim', slag: 'hantverk', hantverk: true, verb: 'kokar', plats: 'station' },
  koka_tval: { namn: 'Kokar tvål', slag: 'hantverk', hantverk: true, verb: 'kokar', plats: 'station' },
  garva: { namn: 'Garvar ett skinn', slag: 'hantverk', hantverk: true, verb: 'garvar', plats: 'station' }, // vid garvningsställningen (steg 7.7.6)
  spinna: { namn: 'Spinner lintråd', slag: 'hantverk', hantverk: true, verb: 'spinner', plats: 'elden', redskap: { slanda: { tar: 'Tar sländan.', haller: 60 } }, slits: { enhet: 'tråd', per: 'gang' } }, // med sländan, var som helst (steg 7.7.8)
  vava: { namn: 'Väver lintyg', slag: 'hantverk', hantverk: true, verb: 'väver', plats: 'station' }, // vid vävstolen (steg 7.7.9)
  gor_leksak: { namn: 'Täljer en leksak', slag: 'hantverk', hantverk: true, verb: 'täljer', plats: 'station' }, // steg 7.5.4; vid snickarbänken om byn har en (steg 9.4.5), annars vid elden
  snara: { namn: 'Gör en snara', slag: 'hantverk', hantverk: true, verb: 'gör', plats: 'station' }, // vid fångstbänken (steg 7.5.10)
  grop: { namn: 'Gräver en fångstgrop', slag: 'hantverk', hantverk: true, verb: 'gräver', plats: 'station' }, // steg 7.5.11
  byxor: { namn: 'Syr byxor', slag: 'hantverk', hantverk: true, stilla: true, verb: 'syr', plats: 'station' }, // steg 7.7
  mossa: { namn: 'Syr en mössa', slag: 'hantverk', hantverk: true, stilla: true, verb: 'syr', plats: 'station' },
  snoskor: { namn: 'Gör snöskor', slag: 'hantverk', hantverk: true, stilla: true, verb: 'gör', plats: 'station' },
  prastdrakt: { namn: 'Syr prästens dräkt', slag: 'hantverk', hantverk: true, stilla: true, verb: 'syr', plats: 'station' }, tecken: { namn: 'Gör ett trons tecken', slag: 'hantverk', hantverk: true, stilla: true, verb: 'gör', plats: 'station' }, mask: { namn: 'Gör schamanens mask', slag: 'hantverk', hantverk: true, stilla: true, verb: 'gör', plats: 'station' },
  koka_rokelse: { namn: 'Kokar rökelse', slag: 'hantverk', hantverk: true, verb: 'kokar', plats: 'station' }, koka_olja: { namn: 'Kokar brännolja', slag: 'hantverk', hantverk: true, verb: 'kokar', plats: 'station' }, // steg 8.5.16
  rustning: { namn: 'Syr en läderrustning', slag: 'hantverk', hantverk: true, stilla: true, verb: 'syr', plats: 'station' }, hjalm: { namn: 'Syr en läderhjälm', slag: 'hantverk', hantverk: true, stilla: true, verb: 'syr', plats: 'station' },
  skold: { namn: 'Gör en sköld', slag: 'hantverk', hantverk: true, plats: 'station' }, bage: { namn: 'Gör en pilbåge', slag: 'hantverk', hantverk: true, plats: 'station' }, slunga: { namn: 'Gör en slunga', slag: 'hantverk', hantverk: true, plats: 'station' }, horn: { namn: 'Gör ett horn', slag: 'hantverk', hantverk: true, plats: 'station' },
  gor_pilar: { namn: 'Gör pilar', slag: 'hantverk', hantverk: true, verb: 'gör', plats: 'station' },
  avrusta: { namn: 'Tar av den fallne det hen bar', tecken: '✨', ikon: 'a_be', framme: true, stilla: true }, rusta: { namn: 'Hämtar sin rustning', tecken: '✨', ikon: 'a_be', framme: true, stilla: true }, // steg 8.7.5, 8.7.8
  mantel: { namn: 'Syr ledarens mantel', slag: 'hantverk', hantverk: true, stilla: true, verb: 'syr', plats: 'station' }, // steg 8.3.14
  halsband: { namn: 'Trär ett halsband', slag: 'hantverk', hantverk: true, stilla: true, verb: 'trär', plats: 'station' },
  tunika: { namn: 'Syr en tunika', slag: 'hantverk', hantverk: true, stilla: true, verb: 'syr', plats: 'station' },
  skjorta: { namn: 'Syr en skjorta', slag: 'hantverk', hantverk: true, stilla: true, verb: 'syr', plats: 'station' },
  mjarde: { namn: 'Flätar en mjärde', slag: 'hantverk', hantverk: true, verb: 'flätar', plats: 'station' }, // bara vid fångstbänken (stationer.ts, steg 7.4.2)
  vittja: { namn: 'Vittjar mjärden', slag: 'fiska', verb: 'vittjar', plats: 'skog' },
  korg: { namn: 'Flätar en korg av hö', slag: 'hantverk', hantverk: true, verb: 'flätar', plats: 'station' }, // bara vid slöjdbänken (stationer.ts)
  bensyl: { namn: 'Slipar en bensyl', slag: 'hantverk', hantverk: true, verb: 'slipar', plats: 'station' }, // steg 2.3.2
  rock: { namn: 'Syr en rock', slag: 'hantverk', hantverk: true, stilla: true, verb: 'syr', plats: 'station' }, // bara vid slöjdbänken med bensylen (stationer.ts). Plaggen heter som i PLAGG (klader.ts, steg 3.10.12)
  skor: { namn: 'Syr skor', slag: 'hantverk', hantverk: true, stilla: true, verb: 'syr', plats: 'station' },
  balte: { namn: 'Flätar ett bälte', slag: 'hantverk', hantverk: true, verb: 'flätar', plats: 'station' }, // steg 2.3.3
  axelrem: { namn: 'Syr en axelrem', slag: 'hantverk', hantverk: true, stilla: true, verb: 'syr', plats: 'station' }, // vid slöjdbänken (steg 7.1.2)
  ryggsack: { namn: 'Syr en ryggsäck', slag: 'hantverk', hantverk: true, stilla: true, verb: 'syr', plats: 'station' }, // vid slöjdbänken med bensylen (steg 7.1.3)
  boll: { namn: 'Syr en boll', slag: 'hantverk', hantverk: true, verb: 'syr', plats: 'station' }, // sportens föremål (steg 4.3.1.2, sport.ts)
  handla: { namn: 'Handlar med handlaren', slag: 'prata', stilla: true }, // byns handel vid handlarens filt (steg 4.4.1.3, handel.ts): task.ref är handlarens id. Inte social: den som handlar pratar bara med handlaren (steg 4.5.7.5)
  koa: { namn: 'Står i kö till handlaren', slag: 'prata', social: true, stilla: true }, // kön till handlaren (steg 4.5.7.5, handel.ts): de som väntar får prata med varandra
  slagtra: { namn: 'Täljer ett slagträ', slag: 'hantverk', hantverk: true, verb: 'täljer', plats: 'station' },
  skara_remsor: { namn: 'Skär remsor', slag: 'hantverk', hantverk: true, verb: 'skär', plats: 'elden' }, skara_lin: { namn: 'Skär remsor av lin', slag: 'hantverk', hantverk: true, verb: 'skär', plats: 'elden' }, nal: { namn: 'Slipar en bennål', slag: 'hantverk', hantverk: true, verb: 'slipar', plats: 'station' }, // förbanden (steg 9.5.15)
  krycka: { namn: 'Täljer en krycka', slag: 'hantverk', hantverk: true, verb: 'täljer', plats: 'station' }, traben: { namn: 'Täljer ett träben', slag: 'hantverk', hantverk: true, verb: 'täljer', plats: 'station' }, krok: { namn: 'Gör en krok', slag: 'hantverk', hantverk: true, verb: 'gör', plats: 'station' }, ogonlapp: { namn: 'Skär en ögonlapp', slag: 'hantverk', hantverk: true, verb: 'skär', plats: 'station' }, // proteserna (steg 9.5.11)
  naverask: { namn: 'Viker en näverask', slag: 'hantverk', hantverk: true, verb: 'viker', plats: 'station' }, // vid slöjdbänken om byn har en, annars för hand (steg 9.4.13)
  lerkruka: { namn: 'Bygger upp en lerkruka', slag: 'hantverk', hantverk: true, verb: 'formar', plats: 'elden' }, // steg 9.4.11, kruka.ts
  slanda: { namn: 'Gör en slända', slag: 'hantverk', hantverk: true, verb: 'gör', plats: 'station' }, // steg 7.7.8
  fackla: { namn: 'Gör en fackla', slag: 'hantverk', hantverk: true, verb: 'binder', plats: 'station' }, // steg 6.3.6 (ljus.ts)
  trumma: { namn: 'Gör en trumma', slag: 'hantverk', hantverk: true, verb: 'spänner', plats: 'station' },
  benflojt: { namn: 'Skär en benflöjt', slag: 'hantverk', hantverk: true, verb: 'skär', plats: 'station' },
  lyra: { namn: 'Gör en lyra', slag: 'hantverk', hantverk: true, verb: 'täljer', plats: 'station' },
  mal: { namn: 'Binder ett mål', slag: 'hantverk', hantverk: true, verb: 'binder', plats: 'station' },
  benspade: { namn: 'Gör en benspade', slag: 'hantverk', hantverk: true, plats: 'station' }, // bara vid slöjdbänken (steg 2.7.2)
  vattensack: { namn: 'Syr en vattensäck', slag: 'hantverk', hantverk: true, stilla: true, verb: 'syr', plats: 'station' }, // bara vid slöjdbänken med bensylen (steg 2.10.1)
  lara: { namn: 'Går i lära', slag: 'hantverk', hantverk: true, stilla: true, verb: 'går i lära', plats: 'elden' }, // lärlingen arbetar bredvid sin mästare (teknik.ts, steg 4.2.3.3); platsen sätts i valet
  forsok: { namn: 'Prövar sig fram', yrke: 'Mästare', slag: 'hantverk', hantverk: true, stilla: true, verb: 'prövar', plats: 'elden' }, // vid försöksplatsen för en teknik på nivå 4–5 (teknik.ts, steg 4.2.1.1); stationen sätts i valet
  tvinna: { namn: 'Tvinnar rep', yrke: 'Hantverkare', slag: 'hantverk', vila: true, hantverk: true, social: true, dygn: true, stilla: true, verb: 'tvinnar', plats: 'station' }, // vid slöjdbänken, annars för hand inne i byn (vid elden när det är kallt, steg 2.10.6)
  rensa: { namn: 'Rensar fisk', slag: 'hantverk', hantverk: true, social: true, stilla: true, verb: 'rensar', plats: 'station' },
  roka: { namn: 'Röker kött och fisk', slag: 'hantverk', hantverk: true, ovar: 'matlagning', stilla: true, verb: 'röker', plats: 'station' }, // rökeriet (matlagning.ts, steg 9.6.8)
  koka_mat: { namn: 'Lagar mat i krukan', slag: 'hantverk', hantverk: true, ovar: 'matlagning', social: true, stilla: true, verb: 'lagar mat', plats: 'elden' }, // en rätt i lerkrukan, som sedan står på elden (matlagning.ts, steg 9.6.3)
  grilla: { namn: 'Grillar mat över elden', slag: 'hantverk', hantverk: true, ovar: 'matlagning', social: true, stilla: true, verb: 'grillar', plats: 'station' }, // bara på grillställningen när elden brinner (matlagning.ts, steg 2.8.1)
  torka: { namn: 'Hänger upp mat på torkställningen', slag: 'hantverk', hantverk: true, stilla: true, verb: 'hänger upp', plats: 'station' }, // och tar ner det som torkat (matlagning.ts, steg 2.8.2)
  bygga: { namn: 'Bygger', yrke: 'Byggare', slag: 'bygga', verktyg: { laga: 'Lagar en vägg', lagaGolv: 'Lagar golvet', golv: 'Lägger golv', vagg: 'Bygger en vägg' }, hantverk: true, tungt: true, stilla: true },
  station: { namn: 'Bygger en station', slag: 'bygga', verktyg: { slaktbank: 'Bygger en slaktbänk', flatarbank: 'Bygger en slöjdbänk', halmbadd: 'Bäddar en halmbädd', hylla: 'Bygger en hylla', kista: 'Bygger en kista', stall: 'Bygger ett redskapsställ', latrin: 'Gräver en latrin', grill: 'Sätter upp en grillställning', tork: 'Sätter upp en torkställning', bord: 'Bygger ett litet bord', bord2: 'Bygger ett bord', bord3: 'Bygger ett långbord', brasa: 'Lägger en ring till en lägereld', bonad: 'Gör en bonad', vaggbrade: 'Snidar ett väggbräde' }, hantverk: true, stilla: true, plats: 'station', framme: true }, // stationer.ts; task.tool = slaget. En ny station får en rad i verktyg (STATIONER kan inte läsas här: cirkulärt)
  // fälten (steg 2.10.3, odling.ts): steget på fältet är task.tool, och arbetet sparas i fältet om det avbryts
  odla: { namn: 'Odlar', slag: 'odla', verktyg: { roja: 'Röjer ett fält', bereda: 'Gräver upp jorden på fältet', sa: 'Sår', mogen: 'Skördar' }, tungt: true, stilla: true, framme: true },
  dorr: { namn: 'Hänger en dörr', slag: 'bygga', verktyg: { skinndorr: 'Hänger en hud i dörröppningen', tradorr: 'Hänger en dörr av trä i dörröppningen' }, hantverk: true, stilla: true, framme: true }, // i en öppning (DORRAR i byggnad.ts, steg 2.2.16); task.tool = sorten
  talgljus: { namn: 'Gör ett talgljus', slag: 'hantverk', hantverk: true, verb: 'doppar', plats: 'station' },
  ljus: { namn: 'Ställer fram ett ljus', slag: 'bygga', hantverk: true, stilla: true, framme: true }, // på ett bord eller en hylla inne (ljus.ts, steg 6.3.8)
  // skogsvården (steg 6.5.2, skogsvard.ts): en planta grävs upp och bärs dit byn vill ha skog
  plantera: { namn: 'Flyttar en planta', slag: 'odla', under: { go: 'går till plantan', do: 'gräver upp plantan', back: 'bär plantan' }, redskap: { benspade: { tar: 'Tar benspaden.', haller: 40 } }, slits: { enhet: 'plantor', per: 'gang' }, tungt: true, framme: true },
  lera: { namn: 'Gräver lera', slag: 'samla', arbete: 'samla', redskap: { benspade: { tar: 'Tar benspaden.', haller: 40 } }, slits: { enhet: 'turer', per: 'gang' }, tungt: true, framme: true }, // vid stranden (lera.ts, steg 9.4.10)
  stubbe: { namn: 'Gräver bort en stubbe', slag: 'odla', redskap: { benspade: { tar: 'Tar benspaden.', haller: 40 } }, slits: { enhet: 'stubbar', per: 'gang' }, tungt: true, framme: true }, // där något ska byggas (skog.ts, steg 6.5.7)
  flyttStation: { namn: 'Flyttar en station', slag: 'bygga', hantverk: true, stilla: true, framme: true, tungt: true }, // närmare dem som använder den (stationer.ts, steg 9.4.8)
  flyttLager: { namn: 'Märker ut en lagerplats', slag: 'bygga', stilla: true, framme: true }, // en lagerplats flyttas närmare byns mitt (lager.ts, steg 9.4.7)
  uppsatt: { namn: 'Sätter upp en fackla', slag: 'bygga', hantverk: true, stilla: true, framme: true }, // där folk ofta är vakna i mörker (ljus.ts, steg 6.3.7)
  tillbehor: { namn: 'Gör ett tillbehör', slag: 'hantverk', verktyg: { skinnfall: 'Lägger en skinnfäll i halmbädden' }, hantverk: true, stilla: true, framme: true }, // till en station eller möbel (TILLBEHOR i stationer.ts); task.tool = sorten
  // utbrotten (steg 3.2.2, humor.ts): den som mår mycket dåligt brister ut. Platsen väljs i val.ts (utbrottVal). Symbolen är gradens
  // (steg 3.10.13), och över huvudet utbrottets egen (task.tool, utbIkon i humor.ts)
  grata: { namn: 'Gråter för sig själv', tecken: '😢', ikon: 'utb1', dygn: true, stilla: true, plats: 'avsides' },
  tjura: { namn: 'Tjurar för sig själv', tecken: '😤', ikon: 'utb1', dygn: true, stilla: true, plats: 'avsides' },
  skams: { namn: 'Skäms och håller sig undan', tecken: '😔', dygn: true, stilla: true, plats: 'avsides' }, // straffet skam (steg 3.5.3, styre.ts)
  elak: { namn: 'Är elak mot någon', tecken: '😠', ikon: 'utb2', dygn: true, stilla: true },
  skvallra: { namn: 'Snackar skit om någon', tecken: '🗣️', ikon: 'utb2', dygn: true, stilla: true }, // steg 3.3.3 (rykten.ts)
  krossa: { namn: 'Slår sönder något', tecken: '💥', ikon: 'utb2', dygn: true, stilla: true },
  undan: { namn: 'Går undan för tornadon', tecken: '🌪️', stilla: true, fortsatter: ['brand', 'tornado'] as const }, // steg 3.8.4 (tornado.ts)
  // eldsvådorna (steg 3.8.5, brand.ts): de vuxna släcker en eld nära byn, med vattensäcken (fylls vid vattnet och töms över
  // elden) eller med händerna, och de andra går undan
  slacka: { namn: 'Släcker elden', tecken: '🧯', under: { go: 'hämtar vatten', back: 'bär vatten till elden' }, redskap: { vattensack: { namn: 'Släcker elden med vattensäcken', tar: 'Tar vattensäcken.', haller: 150 } }, slits: { enhet: 'turer med vatten', per: 'gang' }, tungt: true, framme: true, fortsatter: ['brand'] as const },
  flyEld: { namn: 'Går undan för elden', tecken: '🔥', stilla: true, fortsatter: ['brand'] as const },
  // den som brinner släcker sig själv, och de som står nära hjälper till (steg 6.4.16, brand.ts)
  slackaSig: { namn: 'Släcker elden i kläderna', tecken: '🔥', stilla: true, fortsatter: ['brand'] as const },
  hjalpaBrinnande: { namn: 'Släcker elden på någon', tecken: '🧯', stilla: true, fortsatter: ['brand'] as const },
  fly: { namn: 'Flyr ut i skogen', tecken: '🏃', ikon: 'utb2', vandra: { r: 3, h0: 1, h1: 3, v: 1.1 }, dygn: true },
  badd: { namn: 'Ligger i bädden och orkar inte gå upp', tecken: '🛌', ikon: 'utb3', vila: true, dygn: true, stilla: true, plats: 'sang' }, // steg 3.2.3
  slut: { namn: 'Gör slut', tecken: '💔', ikon: 'utb3', dygn: true, stilla: true },
  sla: { namn: 'Slår någon', tecken: '👊', ikon: 'utb3', verktyg: { misshandel: 'Misshandlar någon', drap: 'Slår ihjäl någon' }, dygn: true, stilla: true },
  strid: { namn: 'Slåss', tecken: '⚔️', stilla: true, fortsatter: ['brand', 'tornado', 'varg'] as const, nodFri: true }, // steg 3.7.2 (strid.ts): står kvar i striden medan de andra behoven väntar
  bjornjakt: { namn: 'Jagar björn', slag: 'jaga', ger: 'bjorn', tungt: true, fortsatter: ['brand', 'tornado', 'varg'] as const }, // steg 6.6.6 (bjorn.ts): en stor grupp med spjut, och den fällda björnen styckas och bärs hem
  vargjakt: { namn: 'Jagar varg', slag: 'jaga', ger: 'varg', tungt: true, fortsatter: ['brand', 'tornado', 'varg'] as const }, // steg 3.7.1 (varg.ts): ledaren samlar jägare, och den fällda vargen bärs hem
  // gästernas egna handlingar (steg 9.2.113, gastvardag.ts): sorten är kravet
  gastKommer: { namn: 'Går till byn', tecken: '🚶', gast: ['handlare', 'rovare', 'framling'] as const },
  gastVantar: { namn: 'Väntar', tecken: '🕓', stilla: true, gast: ['handlare', 'rovare', 'framling'] as const },
  gastHandla: { namn: 'Handlar vid filten', slag: 'prata', stilla: true, gast: ['handlare'] as const },
  plundra: { namn: 'Plundrar byn', tecken: '💰', gast: ['rovare'] as const },
  gastFly: { namn: 'Flyr från byn', tecken: '🏃', gast: ['rovare', 'framling'] as const },
  gaHem: { namn: 'Går hem', tecken: '🚶', gast: ['handlare', 'rovare', 'framling'] as const },
  skrika: { namn: 'Skriker och gråter', tecken: '😭', ikon: 'utb1', dygn: true, stilla: true }, // barnens (steg 3.2.4)
} satisfies Record<string, ActDef>;

export type Act = keyof typeof DEF;
export const ACTS: Record<Act, ActDef> = DEF;
export const ACT_LIST = Object.keys(DEF) as Act[];
export const ACT_NAMES = Object.fromEntries(ACT_LIST.map(a => [a, ACTS[a].namn])) as Record<Act, string>;
export const isWork = (a: Act) => ACTS[a].arbete !== undefined;
// arbetena som väljs efter byns behov (de andra är sätt att göra dem, t.ex. att fälla och hugga är vedarbete med yxa)
export const WORK = ACT_LIST.filter(a => ACTS[a].arbete === a);
// den som prövar sig fram säger vad hen försöker komma på (steg 9.2.106; teknik.ts sätter texterna när modulen laddas)
export const forsokVad: Record<string, string> = {};
// den som gömmer sig gör det för hotet (steg 9.2.121), som står först i skälet (vargSkydd i varg.ts)
const gomFor = (why = '') => /^Rövar/.test(why) ? 'Gömmer sig för rövarna' : /^Varg/.test(why) ? 'Gömmer sig för vargarna' : /^Björn/.test(why) ? 'Gömmer sig för björnen' : undefined;
// den som går till en död säger vems kropp (steg 9.2.130): skälet är "Bär Kamar till graven"
const tillKroppen = (why = '') => { const m = /^Bär (.+) till graven/.exec(why); return m ? `Går till ${/[sxz]$/i.test(m[1]) ? m[1] : m[1] + 's'} kropp` : undefined; };
// den som sitter vid stranden ser ut över sjön eller tjärnen hen sitter vid, eller isen (steg 9.2.131; skälet sätts i val.ts)
const strandVy = (why = '') => /^Ser ut över /.test(why) ? `Sitter vid stranden och ${why.charAt(0).toLowerCase()}${why.slice(1)}` : undefined;
export const taskName = (t: Task) => (t.act === 'gomma' ? gomFor(t.why) : t.act === 'strand' ? strandVy(t.why) : t.act === 'begrava' && t.phase === 'go' ? tillKroppen(t.why) : undefined) || (t.act === 'forsok' && t.tool && forsokVad[t.tool] ? `Försöker komma på ${forsokVad[t.tool]}` : undefined) || (t.tool && (ACTS[t.act].redskap?.[t.tool]?.namn ?? ACTS[t.act].verktyg?.[t.tool])) || ACTS[t.act].namn;
// undertexten (steg 3.10.3): det uppgiften är i just nu, kort, som i "Jagar: letar efter byte". Handlingens rad (under) först,
// annars på väg dit, med material till bygget och hem med det som bärs. Jakten efter försöket (jakt.ts)
export function underText(t: Task): string | undefined {
  if (t.act === 'jakt') return t.carry > 0 ? 'bär hem bytet' : t.phase === 'go' && t.leta === 'grupp' ? 'går mot hararna' : t.phase === 'do' && t.jf ? 'smyger på byte' : 'letar efter byte';
  const rd = ACTS[t.act].runda;
  // rundan (steg 4.5.6.1), också när man letar stenar och flinta (steg 4.5.6.3)
  if (rd && t.phase === 'do') return t.sok ? t.hopp ? 'letar efter stenar och flinta' : 'letar bland stenarna' : t.hopp ? rd.leta : rd.plock;
  if (t.skiljs && t.phase === 'go') return 'går ifrån samtalet'; // steg 4.5.6.7
  const u = ACTS[t.act].under?.[t.phase];
  if (u) return u;
  const bar = t.carry > 0 || Object.values(t.items ?? {}).some(n => n > 0);
  if (t.phase === 'go') return t.site ? 'hämtar material' : t.act === 'bygga' && bar ? 'bär material till bygget' : 'på väg';
  return t.phase === 'back' ? bar ? 'bär hem' : 'går hem' : undefined;
}
// namnet och undertexten: "Jagar: letar efter byte"
export const taskText = (t: Task) => { const u = underText(t); return u ? `${taskName(t)}: ${u}` : taskName(t); };
// det man gör vid en bänk (steg 3.10.3), som i "Arkiv rensar"
export const verbOf = (a: Act) => ACTS[a].verb ?? 'gör';
// redskapet en uppgift använder (task.tool kan också vara t.ex. vagg eller rep, eller det spjut som görs) och dess rad
export const toolRow = (t?: Task) => t?.tool ? ACTS[t.act].redskap?.[t.tool] : undefined;
export const usesTool = (t?: Task) => toolRow(t) ? t!.tool : undefined;
// handlingarna där redskapet används, i registrets ordning (tabellen byggs en gång)
const ACTS_AV: Record<string, Act[]> = {};
for (const a of ACT_LIST) for (const k in ACTS[a].redskap ?? {}) (ACTS_AV[k] ??= []).push(a);
const INGA: readonly Act[] = [];
export const actsOf = (k: string): readonly Act[] => ACTS_AV[k] ?? INGA;
