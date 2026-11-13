// hur figuren står i bilden (steg 10.2.55): sitter, går eller står. Ingen ritning här, så att testet (scenariot stalle) kan
// gå igenom en by med samma regler som bilden. Sittanimationen visas bara på en sittplats (en stubbe eller stol vid ett bord,
// stationRutor i stationer.ts) eller på stolen vid en bänk, och gåanimationen bara när figuren flyttat sig sedan förra bilden
import { blocked, sittAt, stationAt, type State } from '../sim';

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

// stå vid arbetet (steg 10.2.78): den som arbetar med en ruta (fäller ett träd, hugger eller klyver en stam, gräver bort en stubbe)
// står på en ruta intill, helst söder om den, och är vänd mot den. Simuleringen har arbetet på rutan; bilden ställer figuren bredvid
export const RUTA_ARBETEN = new Set(['falla', 'hugga', 'klyva', 'stubbe']);
export type Riktning = 'fram' | 'bak' | 'sida' | 'vast';
const SIDOR: [number, number, Riktning][] = [[0, 1, 'bak'], [-1, 0, 'sida'], [1, 0, 'vast'], [0, -1, 'fram']]; // rutan intill och hållet mot arbetet
export function vidArbetet(s: State, gor: string | undefined, x: number, y: number): { x: number; y: number; rikt: Riktning } | undefined {
  if (!gor || !RUTA_ARBETEN.has(gor)) return undefined;
  const rx = Math.floor(x), ry = Math.floor(y);
  for (const [dx, dy, rikt] of SIDOR) { const nx = rx + dx, ny = ry + dy; if (!blocked(s, nx + 0.5, ny + 0.5) && !stationAt(s, nx + 0.5, ny + 0.5)) return { x: nx + 0.5, y: ny + 0.5, rikt }; }
  return { x: rx + 0.5, y: ry + 1.5, rikt: 'bak' };
}
