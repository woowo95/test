import { ANIMTAKT } from '../animbilder';
import { W } from '../sim';

// liv i bilden (steg 5.1.9): animationerna ur bildstilen (5.2.4.8, bildstil/anim.js), ritade i förväg i src/animbilder.ts
// (bildstil/animtillspelet.cjs) och valda efter klockan, så att spelets räkning aldrig ändras. Bildstilens klocka slår var
// TAKT ms (230), och varje effekt byter bild var HASTIGHET:e slag: elden och gnistorna varje slag, röken vartannat,
// vågorna vart fjärde och stranden vart åttonde. Alla animationer följer samma klocka, så att byn rör sig i samma rytm.
// Bilderna heter an_<id> i ikoner.ts. Bara utseende.
export type Effekt = keyof typeof ANIMTAKT.hastighet;
// hur många egna bilder varje effekt har
export const BILDER: Record<Effekt, number> = { eld: 4, gnistor: 4, rok: 4, vagor: 8, stranden: 4, tornado: 8, brand: 6 };
// klockans slag just nu (webbläsarens tid)
export const slag = (ms = performance.now()) => Math.floor(ms / ANIMTAKT.takt);
// effektens bild just nu; forskjut flyttar var i rörelsen den börjar (så att två bränder inte fladdrar i takt)
export const animBild = (e: Effekt, ms?: number, forskjut = 0) => (Math.floor(slag(ms) / ANIMTAKT.hastighet[e]) + forskjut) % BILDER[e];

// lägerelden som brinner: spelets bild med bildstilens lågor (stor eller liten eld), och gnistorna och röken ovanför.
// x och y är bildens övre vänstra hörn (gropens mitt i ANIMTAKT.eld)
export const eldBild = (lage: 'stort' | 'lite', ms?: number) => `an_eld_${lage}_${animBild('eld', ms)}`;
export const gnistBild = (ms?: number) => `an_gnistor_${animBild('gnistor', ms)}`;
export const rokBild = (ms?: number, forskjut = 0) => `an_rok_${animBild('rok', ms, forskjut)}`;
// tornadon: åtta bilder, foten i ANIMTAKT.tornado
export const tornadoBild = (ms?: number, storlek: 'liten' | 'medel' | 'stor' = 'medel') => `an_tornado_${storlek === 'medel' ? '' : storlek + '_'}${animBild('tornado', ms)}`;
// var foten är i bilden för storleken (steg 6.4.15)
export const tornadoFot = (storlek: 'liten' | 'medel' | 'stor' = 'medel') => ANIMTAKT.tornadoStorlek[storlek];
// branden på en ruta: varianten och var i rörelsen den börjar räknas ur rutan (i, som i bildstilen ur rutans plats)
const brandVariant = (i: number) => (((i % W) * 31 + Math.floor(i / W) * 17) % 101) % ANIMTAKT.brandVarianter;
export const brandBild = (i: number, ms?: number) => `an_brand_${brandVariant(i)}_${animBild('brand', ms)}`;
export const brandRok = (i: number, ms?: number) => `an_brandrok_${brandVariant(i)}_${animBild('rok', ms)}`;
