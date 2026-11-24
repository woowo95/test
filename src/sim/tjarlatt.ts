import { balans } from './balans';
import { State } from './typer';

// ---------- tjäran som skydd (steg 13.5.1) ----------
// Talen och skyddets verkan, utan importer, så att slitaget i bygg.ts, hage.ts, agande.ts och lager.ts kan fråga dem utan
// importringar. Arbetet, poängen och vad som går att tjära står i tjara.ts
export const TJARA = balans('tjara', {
  min: 4, // minuter (ungefär ett dygn i spelet) för en sak eller rutorna, med 1 tjära
  rutor: 16, // så många rutor tjäras med en tjära; med fyra kostade tjäran alltid mer än skyddet sparade, så att inget tjärades
  nara: 3, // rutorna i samma tjärning ligger inom så här många rutor från den första
  dygn: 10, // skyddet håller så här många dygn (tio år i spelet) ...
  slit: 0.5, // ... och slitaget är så här mycket av det vanliga så länge
});
// slitaget gånger detta för det som är tjärat till tid (b.tj, t.tj, s.tjarat[ruta])
export const tjarFaktor = (s: State, tj?: number) => tj !== undefined && tj > s.now ? TJARA.slit : 1;
