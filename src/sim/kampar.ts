// Kämparna (steg 10.1.2, "Striden på kartan: Kämpar ur ett register" i designdokumentet): varje sort som kan slåss är en
// rad i registret KAMPAR. Människor, vargar, björnar och allt som kommer senare (en drake, hundra gnomer, väsen) är kämpar
// av samma slag, och striden (strid.ts) frågar raden i stället för att ha egna fall per djur. Raden säger kroppen (talen
// som en människa har som egenskaper), de naturliga vapnen (tänder, käftar, ramar; rader i VAPEN i strid.ts), skyddet
// (päls och hud: så stor del av varje träff det tar), farten och modet, och hur sorten bär sig åt i striden. En ny fiende
// är en ny rad här och nya vapen i VAPEN, inte ny kod i striden. Människans kropp står inte här: den kommer ur personen
// (personKampe i strid.ts).
import type { Vapen } from './strid';

export interface KampeSort {
  namn: string; art: string; // "Vargen" och "Varg"
  alder?: number; // den längsta åldern i år (steg 3.7.13)
  kropp?: { styrka: number; uthallighet: number; mod: number; smidighet: number; skicklighet: number }; // saknas för människan
  fart: number; // gånger STRID.fart
  vapen: Vapen[]; // de naturliga vapnen, det vanliga först
  skydd: number; // päls och hud tar så här stor del av varje träff (0–1)
  naturligt: boolean; // vapnet är en del av kroppen: det tappas aldrig, tas inte ifrån den där vapen inte får användas, och den tar inte upp något från marken
  parerar: boolean; // kan parera ett slag (duckar gör alla efter smidigheten)
  kryper: boolean; // kan bli liggande med skadade ben och krypa undan; de andra går så länge de lever
  raddar: boolean; // går till en vän som ligger och blöder
  avstar: boolean; // kan dra sig undan före första slaget när modet inte räcker
  leder: boolean; // kan vara ledare som går först
  flock: boolean; // en flock: när en av dem faller eller flyr tappar de andra mer mod (STRID.flock), och flykten räknas som ett fall
}
const manniska: KampeSort = { namn: 'Människan', art: 'Människa', fart: 1, vapen: ['hand'], skydd: 0, naturligt: false, parerar: true, kryper: true, raddar: true, avstar: true, leder: true, flock: false };
// ett djur: slåss med kroppen, parerar inte, kryper inte, räddar ingen och drar sig inte undan i förväg
const djur = (namn: string, art: string, alder: number, kropp: NonNullable<KampeSort['kropp']>, fart: number, vapen: Vapen): KampeSort =>
  ({ namn, art, alder, kropp, fart, vapen: [vapen], skydd: 0, naturligt: true, parerar: false, kryper: false, raddar: false, avstar: false, leder: false, flock: true });
export const KAMPAR = {
  manniska,
  kanin: djur('Haren', 'Hare', 6, { styrka: 2, uthallighet: 6, mod: 2, smidighet: 16, skicklighet: 4 }, 1.4, 'bett'),
  varg: djur('Vargen', 'Varg', 12, { styrka: 10, uthallighet: 14, mod: 10, smidighet: 16, skicklighet: 9 }, 1.5, 'vargbett'), // snabb och svår att träffa, duckar men parerar inte och biter hårt (steg 3.7.1)
  radjur: djur('Rådjuret', 'Rådjur', 10, { styrka: 4, uthallighet: 12, mod: 2, smidighet: 16, skicklighet: 4 }, 1.7, 'bett'),
  fagel: djur('Fågeln', 'Fågel', 5, { styrka: 1, uthallighet: 4, mod: 1, smidighet: 18, skicklighet: 2 }, 1.6, 'bett'),
  bjorn: djur('Björnen', 'Björn', 25, { styrka: 24, uthallighet: 22, mod: 14, smidighet: 8, skicklighet: 8 }, 1.1, 'bjornram'), // tung och långsam men slår hårt (steg 6.6.5)
  bjornunge: djur('Björnungen', 'Björnunge', 2, { styrka: 5, uthallighet: 6, mod: 4, smidighet: 10, skicklighet: 4 }, 1.2, 'vargbett'), // liten och svag, men björnen försvarar den (steg 6.6.5)
} satisfies Record<string, KampeSort>;
export type KampeSortId = keyof typeof KAMPAR;
export const KAMPE_LIST = Object.keys(KAMPAR) as KampeSortId[];
// raden för en sort; den som inte säger något är en människa
export const kampeSort = (sort?: string): KampeSort => (KAMPAR as Record<string, KampeSort>)[sort ?? 'manniska'] ?? manniska;
// det artens värden var i djurregistret förut (DJUR.strid): raden med kroppens tal utlagda och det vanliga vapnet
export interface DjurStrid { namn: string; art: string; alder: number; styrka: number; uthallighet: number; mod: number; smidighet: number; skicklighet: number; fart: number; vapen: Vapen }
export const djurStrid = (sort: string): DjurStrid => { const d = kampeSort(sort); return { namn: d.namn, art: d.art, alder: d.alder ?? 0, ...d.kropp!, fart: d.fart, vapen: d.vapen[0] }; };
// djuren i registret (allt utom människan)
export const STRIDSDJUR = () => KAMPE_LIST.filter(a => a !== 'manniska');
