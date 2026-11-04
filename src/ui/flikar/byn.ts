import { andligSyns } from '../../sim';
import { s, ui } from '../lage';
import { seder } from './seder';
import { religion } from './religion';
import { harHaft, pabudDel, styre } from './styre';
import type { Flik } from '../panel';

// fliken Byn (steg 5.3.3.2): hur byn styrs, i delar med en knapp var överst: sederna, tron bredvid sederna, påbuden och styret.
// En del som inte finns än (ingen tro, ingen ledare) har en blek knapp. Bandet överst är den öppna delens band (ui/runstenar.ts).
// Registret: en ny del är en rad i DELAR
interface Del { id: string; tecken: string; namn: string; band: string; html(): string; syns?(): boolean }
const DELAR: Del[] = [
  { id: 'seder', tecken: '⚖️', namn: 'Seder', band: 'seder', html: () => seder.html() },
  { id: 'tro', tecken: '✨', namn: 'Tro', band: 'religion', html: () => religion.html(), syns: () => andligSyns(s) },
  { id: 'pabud', tecken: '📜', namn: 'Påbud', band: 'styre', html: pabudDel, syns: harHaft },
  { id: 'styre', tecken: '👑', namn: 'Styre', band: 'styre', html: () => styre.html(), syns: harHaft },
];
const kan = (d: Del) => d.syns?.() ?? true;
const oppen = () => DELAR.find(d => d.id === ui.bynDel && kan(d)) ?? DELAR[0];

export const byn: Flik = {
  namn: 'Byn',
  band: () => oppen().band,
  html() {
    const del = oppen();
    return `<div class="pdelar" role="tablist">${DELAR.map(d => `<button type="button" role="tab" data-bdel="${d.id}" aria-selected="${d === del}"${kan(d) ? '' : ' disabled'} title="${d.namn}${kan(d) ? '' : ': finns inte än'}" aria-label="${d.namn}">${d.tecken}</button>`).join('')}</div>
      <h3>${del.namn}</h3>${del.html()}`;
  },
  klick(el) {
    const b = el.closest<HTMLButtonElement>('[data-bdel]');
    if (!b || b.disabled) return false;
    ui.bynDel = b.dataset.bdel!;
    return true;
  },
};
