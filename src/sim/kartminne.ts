import { eldPlats } from './karta';
import { groundOf, markslag } from './mark';
import { faltRutor } from './odling';
import { DAY, H, State, T, W, WEEK } from './typer';

// ---------- kartans minne (steg 5.4.5.2) ----------
// En gång per dygn (ett år i spelet) sparas en bild av kartan (äldre än fyra veckor en per vecka): marken, stigarna, skogen och det som byggts, utan folk och
// djur. Bilderna ligger i historiken (s.hist.kartor, sparas med veckans del) och visas i ui/kartminne.ts, där man drar
// fram och tillbaka genom åren. Bara minne: simuleringen läser dem aldrig (scenariot kartminne).
// Registret: vad en ruta kan vara på bilden, med en bokstav i den packade bilden. Det som står längre ner går före
// (en vägg på ett fält är en vägg). Ett nytt slag är en rad här och en färg i ui/kartminne.ts.
export const KARTRUTA: { k: string; id: string; namn: string }[] = [
  { k: 'v', id: 'vatten', namn: 'Vatten' },
  { k: 'a', id: 'sand', namn: 'Sand' },
  { k: 'n', id: 'sten', namn: 'Berg' },
  { k: 'l', id: 'lera', namn: 'Torr sjöbotten' },
  { k: 's', id: 'skog', namn: 'Skog' },
  { k: 'u', id: 'ung', namn: 'Ungskog' },
  { k: 'h', id: 'hog', namn: 'Högt gräs' },
  { k: 'k', id: 'kort', namn: 'Kort gräs' },
  { k: 'b', id: 'bar', namn: 'Stig och bar jord' },
  { k: 'f', id: 'falt', namn: 'Fält' },
  { k: 'g', id: 'golv', namn: 'Golv' },
  { k: 'w', id: 'vagg', namn: 'Vägg' },
  { k: 't', id: 'station', namn: 'Bänkar och ställningar' },
  { k: 'e', id: 'eld', namn: 'Elden' },
];
const MARK_K: Record<string, string> = { skog: 's', ung: 'u', hog: 'h', kort: 'k', bar: 'b' };
const TILE_K: Partial<Record<T, string>> = { [T.Vatten]: 'v', [T.Sand]: 'a', [T.Sten]: 'n', [T.Lera]: 'l' };

// kartan just nu, en bokstav per ruta (rad för rad)
export function kartrutor(s: State): string[] {
  const g = groundOf(s), r: string[] = new Array(W * H);
  for (let i = 0; i < W * H; i++) r[i] = TILE_K[g.tiles[i] as T] ?? MARK_K[markslag(g, i)];
  const satt = (x: number, y: number, k: string) => { if (x >= 0 && y >= 0 && x < W && y < H) r[Math.floor(y) * W + Math.floor(x)] = k; };
  for (const f of s.falt ?? []) for (const i of faltRutor(f)) if (i >= 0 && i < W * H) r[i] = 'f';
  for (const b of s.byggen ?? []) if (b.b > 0) satt(b.x, b.y, b.k === 'vagg' ? 'w' : 'g'); // påbörjat syns; en öppning är en lucka i väggen
  for (const st of s.stationer ?? []) if (!st.inne) satt(st.x, st.y, 't');
  const e = eldPlats(s); satt(e.x, e.y, 'e');
  return r;
}
// packad: samma bokstav i följd skrivs med antalet före ("12s3b"), så att en bild tar några kilobyte
export function packaKarta(r: string[]): string {
  let ut = '';
  for (let i = 0; i < r.length;) { let j = i + 1; while (j < r.length && r[j] === r[i]) j++; ut += (j - i > 1 ? j - i : '') + r[i]; i = j; }
  return ut;
}
export function lasKarta(p: string): string[] {
  const r: string[] = [];
  for (const m of p.matchAll(/(\d*)(\D)/g)) { const n = m[1] ? +m[1] : 1; for (let i = 0; i < n; i++) r.push(m[2]); }
  return r;
}
// i historikSteg: en bild när ett nytt dygn börjat (och den första när byn grundats)
export function kartminneSteg(s: State) {
  const h = s.hist; if (!h) return;
  const k = (h.kartor ??= []), dygn = Math.floor(s.now / DAY);
  if (k.length && Math.floor(k[k.length - 1][0] / DAY) === dygn) return;
  k.push([Math.round(s.now), packaKarta(kartrutor(s))]);
  // äldre än GLES glesas bilderna ut till en per vecka (den första i varje sjudagarsblock räknat från grundandet, som inte alltid börjar när tidsåldern gör), så att sparningen inte växer för fort
  const grans = s.now - GLES, vecka = (b: [number, string]) => Math.floor((b[0] - s.founded) / WEEK);
  for (let i = k.length - 1; i > 0; i--) if (k[i][0] < grans && vecka(k[i]) === vecka(k[i - 1])) k.splice(i, 1);
}
export const GLES = 4 * WEEK; // fyra veckor (28 år i spelet): så länge finns en bild per dygn
