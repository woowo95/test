// hur figuren står i bilden (steg 10.2.55): sitter, går eller står. Ingen ritning här, så att testet (scenariot stalle) kan
// gå igenom en by med samma regler som bilden. Sittanimationen visas bara på en sittplats (en stubbe eller stol vid ett bord,
// stationRutor i stationer.ts) eller på stolen vid en bänk, och gåanimationen bara när figuren flyttat sig sedan förra bilden
import { sittAt, type State } from '../sim';

// handlingarna man gör sittande när det finns en plats att sitta på; annars står man
export const SITTA = new Set(['maltid', 'samtal', 'vila', 'lyssna', 'beratta']);
export type Stalle = 'sitta' | 'ga' | 'sta' | 'ligga';
// gor = handlingen hen gör på platsen (fasen do), vidBank = hen arbetar på stolen vid en bänk, rorde = figuren har flyttat
// sig sedan förra bilden
export function stalle(s: State, l: { ligger: boolean; gor?: string; x: number; y: number; vidBank: boolean; rorde: boolean }): Stalle {
  if (l.ligger) return 'ligga';
  if (l.vidBank || l.gor && SITTA.has(l.gor) && sittAt(s, l.x, l.y)) return 'sitta';
  if (l.gor === 'vila') return 'ligga'; // vilan utan sittplats: man ligger på marken, aldrig stående (steg 10.2.76)
  return l.rorde ? 'ga' : 'sta';
}
