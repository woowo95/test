// Arbetena i bild (steg 5.1.9.4): bildstilens rörelser, redskap och effekter (anim.js, steg 5.2.4.8), så att den som
// hugger, gräver eller slår flinta syns göra det. Få och generella delar (Björn 2026-11-04: inte en animation per sak):
//   RORELSER: kroppens rörelse i fyra bilder, som kartfigurens armlägen (slå, stöta, plocka, pyssla och kasta)
//   REDSKAP:  redskapet i handen som skaft och huvud, ritat ur handen i armens riktning (ett nytt redskap är en rad)
//   MATERIAL: färgerna på splittret (trä, sten, jord, blod, vatten, snö)
//   ARBETEN:  en rad per handling i spelet: rörelsen, redskapet, effekten och materialet
// Bilden väljs efter animationernas klocka (ui/animation.ts), en bild per slag och förskjutet per person, så att byn rör sig
// i samma rytm men inte i takt. Bara utseende: spelets räkning ändras inte.
import * as PIXI from 'pixi.js';
import { farg, fargTal } from '../palett';
import type { Arm, Ben } from './folkbild';

type Ramp = 'kol' | 'jord' | 'senap' | 'rost' | 'oliv' | 'barr' | 'skiffer' | 'ben';
type Ton = [Ramp, number];
// en bild: ben och arm i kartfiguren, riktningen redskapet pekar (r: framåt, nedåt), steg (1 träffen, 2 efteråt), ut
// (kroppen en punkt fram eller bak) och för plocka och kasta om saken är i handen (hand)
export interface RorelseBild { arm: Arm; ben?: Ben; r?: [number, number]; steg?: 1 | 2; ut?: number; hand?: boolean }
export const RORELSER: Record<string, { namn: string; sitta?: boolean; bilder: RorelseBild[] }> = {
  sla: { namn: 'Slå', bilder: [{ arm: 'lyfta', r: [0, -1] }, { arm: 'lyfta', r: [-1, -1] }, { arm: 'sla', r: [1, 1], steg: 1 }, { arm: 'sla', r: [1, 1], steg: 2 }] },
  stota: { namn: 'Stöta', bilder: [{ arm: 'framfor', r: [1, 0] }, { arm: 'framfor', r: [1, 0], ut: -1 }, { arm: 'sla', r: [1, 0], ut: 1, steg: 1 }, { arm: 'sla', r: [1, 0], steg: 2 }] },
  plocka: { namn: 'Plocka', bilder: [{ arm: 'hanga' }, { ben: 'sitta', arm: 'hanga' }, { ben: 'sitta', arm: 'framfor', hand: true }, { arm: 'framfor', hand: true }] },
  pyssla: { namn: 'Pyssla', sitta: true, bilder: [{ arm: 'framfor', r: [1, 1] }, { arm: 'gang1', r: [1, 1], steg: 1 }, { arm: 'framfor', r: [1, 1] }, { arm: 'gang1', r: [1, 1], steg: 1 }] },
  kasta: { namn: 'Kasta', bilder: [{ arm: 'framfor', r: [1, -1], hand: true }, { arm: 'lyfta', r: [-1, -1], hand: true }, { arm: 'sla', r: [1, 0] }, { arm: 'hanga' }] },
};
// skaft: hur långt (punkter från handen), bak: hur långt bakom handen (spjutet hålls på mitten), huvud: formen i änden
export const REDSKAP: Record<string, { skaft: number; bak?: number; huvud: string }> = {
  yxa: { skaft: 3, huvud: 'blad' }, spade: { skaft: 5, huvud: 'spade' }, klubba: { skaft: 4, huvud: 'klubba' },
  spjut: { skaft: 7, bak: 3, huvud: 'spets' }, kniv: { skaft: 1, huvud: 'egg' }, nal: { skaft: 0, huvud: 'nal' },
  sten: { skaft: 0, huvud: 'sten' }, snoboll: { skaft: 0, huvud: 'snoboll' },
};
export const MATERIAL: Record<string, [Ton, Ton]> = {
  tra: [['senap', 3], ['jord', 3]], sten: [['skiffer', 3], ['ben', 2]], jord: [['jord', 1], ['jord', 2]],
  blod: [['rost', 1], ['rost', 2]], vatten: [['ben', 3], ['skiffer', 3]], sno: [['ben', 3], ['ben', 2]],
};
// det som plockas och syns i handen
const SAKER: Record<string, (p: (dx: number, dy: number, t: Ton) => void) => void> = {
  bar: p => p(0, 0, ['rost', 2]),
  pinne: p => { for (let i = -1; i <= 2; i++) p(i, 0, ['jord', 2]); },
};
// en handling i spelet: rörelsen, redskapet, effekten (splitter), materialet, saken i handen och riktningen vid slaget
export interface Arbete { rorelse: keyof typeof RORELSER; redskap?: string; effekt?: 'splitter' | 'traff'; material?: string; sak?: string; rSla?: [number, number] }
const HUGGA: Arbete = { rorelse: 'sla', redskap: 'yxa', effekt: 'splitter', material: 'tra' };
const FLINTA: Arbete = { rorelse: 'sla', redskap: 'sten', effekt: 'splitter', material: 'sten' };
export const ARBETEN: Record<string, Arbete> = {
  falla: HUGGA, hugga: HUGGA, klyva: HUGGA,                        // hugga
  krossa: FLINTA, yxa: FLINTA, kniv: FLINTA, spjut: FLINTA,          // slå flinta (och sten)
  odla: { rorelse: 'sla', redskap: 'spade', effekt: 'splitter', material: 'jord' }, // gräva
  bygga: { rorelse: 'sla', redskap: 'klubba', effekt: 'splitter', material: 'tra' },
  dorr: { rorelse: 'sla', redskap: 'klubba', effekt: 'splitter', material: 'tra' },
  slakta: { rorelse: 'stota', redskap: 'kniv', effekt: 'splitter', material: 'blod', rSla: [1, 1] },
  samla: { rorelse: 'plocka', sak: 'bar' },
  ved: { rorelse: 'plocka', sak: 'pinne' },
};
// striden (steg 5.1.9.5): rörelsen och redskapet efter vapnet i striden (VAPEN i sim/strid.ts), och träffen i stället för splitter
const SLASS = (redskap?: string): Arbete => ({ rorelse: 'sla', redskap, effekt: 'traff', rSla: [1, 0] });
const STOTA = (redskap: string): Arbete => ({ rorelse: 'stota', redskap, effekt: 'traff' });
export const STRIDBILD: Record<string, Arbete> = {
  hand: SLASS(), sten: SLASS('sten'), yxa: SLASS('yxa'), benspade: SLASS('spade'), klubba: SLASS('klubba'),
  kniv: STOTA('kniv'), fiskespjut: STOTA('spjut'), flintspjut: STOTA('spjut'),
};

// bilden just nu för handlingen: benen, armen och var kroppen står (ut)
export function arbetsBild(a: Arbete, ruta: number) {
  const R = RORELSER[a.rorelse], b = R.bilder[ruta % 4];
  return { b, ben: (b.ben ?? (R.sitta ? 'sitta' : 'sta')) as Ben, arm: b.arm };
}

// redskapet, saken och splittret ur handen (hx, hy i världen), fram = 1 åt höger och -1 åt vänster, k = figurens storlek
export function ritaArbete(g: PIXI.Graphics, a: Arbete, b: RorelseBild, hx: number, hy: number, fram: number, k: number) {
  const p = (x: number, y: number, t: Ton) => g.beginFill(fargTal(farg(t[0], t[1] as 0 | 1 | 2 | 3))).drawRect(hx + x * k, hy + y * k, k, k).endFill();
  let t: [number, number] = [0, 0];
  const r = (b.steg && a.rSla) || b.r || [0, 1];
  if (a.redskap) { // skaftet och huvudet i armens riktning; m är dit slaget går (vinkelrätt mot skaftet)
    const R = REDSKAP[a.redskap], rx = r[0] * fram, ry = r[1], n = R.skaft ? R.skaft + 1 : 0;
    for (let i = -(R.bak ?? 0); i <= R.skaft; i++) if (i) p(rx * i, ry * i, ['jord', 2]);
    t = [rx * n, ry * n];
    const m = [-ry * fram, rx * fram], at = (dx: number, dy: number, tn: Ton) => p(t[0] + dx, t[1] + dy, tn);
    switch (R.huvud) {
      case 'blad': at(0, 0, ['skiffer', 1]); at(m[0], m[1], ['skiffer', 2]); at(m[0] - rx, m[1] - ry, ['skiffer', 2]); at(2 * m[0], 2 * m[1], ['skiffer', 3]); break;
      case 'spade': at(0, 0, ['ben', 2]); at(rx, ry, ['ben', 1]); at(m[0], m[1], ['ben', 2]); at(m[0] + rx, m[1] + ry, ['ben', 1]); break;
      case 'klubba': at(0, 0, ['jord', 3]); at(m[0], m[1], ['jord', 2]); at(-m[0], -m[1], ['jord', 2]); at(rx, ry, ['jord', 3]); break;
      case 'spets': at(0, 0, ['skiffer', 3]); at(rx, ry, ['skiffer', 2]); break;
      case 'egg': at(0, 0, ['skiffer', 3]); at(rx, ry, ['skiffer', 3]); break;
      case 'nal': at(0, 0, ['ben', 3]); break;
      case 'sten': case 'snoboll': { const [rp, a1, b1]: [Ramp, number, number] = R.huvud === 'sten' ? ['jord', 2, 0] : ['ben', 3, 2]; at(0, 0, [rp, a1]); at(1, 0, [rp, b1]); at(0, 1, [rp, b1]); at(1, 1, [rp, b1]); break; }
    }
  }
  if (b.hand && a.sak && !a.redskap) SAKER[a.sak]?.((dx, dy, tn) => p(dx, dy + 1, tn));
  // splittret: steg 1 nära träffen, steg 2 längre bort och högre; när man pysslar bara ett korn
  if (b.steg && a.effekt === 'splitter') {
    const M = MATERIAL[a.material ?? 'tra'] ?? MATERIAL.tra, liten = RORELSER[a.rorelse].sitta;
    const lista = liten ? [[1, -1]] : b.steg === 1 ? [[1, -2], [-1, -1], [2, 0]] : [[3, -4], [-2, -3], [4, -1]];
    lista.forEach(([dx, dy], i) => p(t[0] + dx * fram, t[1] + dy, M[i % 2]));
  }
  // träffen: en ljus stjärna där slaget tar, bara i själva träffen (som bildstilens traff)
  if (b.steg === 1 && a.effekt === 'traff') {
    const x = t[0] + fram, y = t[1];
    for (const [dx, dy, ljus] of [[0, 0, 1], [-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1], [-2, -2, 0], [2, -2, 0], [-2, 2, 0], [2, 2, 0]]) p(x + dx, y + dy, ljus ? ['ben', 3] : ['senap', 3]);
  }
}
