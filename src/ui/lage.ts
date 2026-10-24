import { FyndId, Grupp, Pile, State, pilesOf, useMap } from '../sim';
import type { FlikId } from './panel';

// det hela gränssnittet delar: byn som visas och vad spelaren har valt.
// Byn byts med setByn (ny by, testläget, inläst sparning); alla moduler ser då den nya
export let s: State;
export function setByn(n: State) { s = n; useMap(n); nyBild(); }
export const ui = {
  tab: 'folk' as FlikId,
  selected: undefined as number | undefined, // personen som visas i panelen
  hovered: undefined as number | undefined, // personen under musen
  follow: undefined as number | undefined, // personen kameran följer
  busy: false, // ikappräkning pågår
  sparFel: false, // senaste sparningen i artefaktens databas misslyckades
  testMode: false, // testläget: en kopia av byn som kan spolas fram
  lastPointer: 0, // när spelaren senast tryckte: panelen byts inte ut mitt i ett tryck
  hogAt: { x: 0, y: 0 }, // rutan med högar utanför lagret som visas i panelen
  lagerNr: 0, // vilken lagerplats som visas i panelen
  filter: undefined as Grupp | undefined, // värmekartan som visas på kartan
  filterArt: undefined as FyndId | undefined, // bara en art i gruppen, vald i teckenförklaringen
};

// stackarna räknas fram en gång per bildruta, inte för varje sak som ritas eller visas
let pileCache: Pile[] | undefined;
export const piles = () => pileCache ??= pilesOf(s);
export function nyBild() { pileCache = undefined; }
// högar utanför lagret på en ruta: det som inte fick plats och det som lagts på marken
export const outPilesAt = (x: number, y: number) => piles().filter(q => q.out && q.x === x && q.y === y);
