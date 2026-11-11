import type * as PIXI from 'pixi.js';
import { type Kampe } from '../sim';
import { s, vidNyBy } from './lage';
import { nollstallSlag, streckNu, taEmotSlag } from './stridbild';
vidNyBy.push(nollstallSlag);

// Striderna på kartan i bilden (steg 10.1.5): slagen som sker ritas som streck mellan den som slår och den som träffas
const SLAG_SEK = 0.6; // så länge (spelets sekunder) ett djurs slag syns som ett slag i bilden
export const liggerK = (k: Kampe) => k.lage === 'nere' || k.lage === 'dod' || !!k.ligger;
// strecken (TS punkter per ruta) mellan den som slår och den som träffas (rött), missar (grått)
export function ritaSlagen(gr: PIXI.Graphics, nu: number, TS: number) {
  // striderna på kartan (steg 10.1.5): varje slag som skett, en gång, där de stod (ui/stridbild.ts)
  taEmotSlag(nu);
  for (const { h, kvar } of streckNu(nu)) {
    const traff = h.utfall === 'traff' || h.utfall === 'vada';
    gr.lineStyle(traff ? 2 : 1, traff ? 0xa14808 : 0xdad0bb, Math.max(0.2, kvar)).moveTo(h.fx * TS, h.fy * TS - 4).lineTo(h.mx * TS, h.my * TS - 4).lineStyle(0);
  }
}

// djuret i en strid på kartan (steg 10.1.17–10.1.18): platsen, om det ligger, och den det slår mot
export function djuretNu(art: 'bjorn' | 'varg', id: number, _nu?: number) {
  // striden på kartan (steg 10.1.17–10.1.18): djuret står där kämpen står
  for (const g of s.kartStrider ?? []) {
    const d = g.djur?.find(q => q.art === art && q.id === id);
    if (!d) continue;
    const k = g.st.kampar.find(x => x.id === d.k);
    if (!k || k.lage === 'borta') return undefined;
    const mal = k.mal !== undefined ? g.st.kampar.find(x => x.id === k.mal) : undefined;
    const tid = g.st.t, slag = [...g.st.logg].reverse().find(r => r.t >= tid - SLAG_SEK && r.t <= tid && r.a === k.id && (r.h === 'traff' || r.h === 'miss' || r.h === 'tog'));
    const offer = slag ? g.st.kampar.find(x => x.id === slag.b) : undefined;
    return { k, x: k.x, y: k.y, mot: mal ? { x: mal.x, y: mal.y } : undefined, ligger: liggerK(k), slar: offer ? { x: offer.x, y: offer.y } : undefined };
  }
  return undefined;
}
