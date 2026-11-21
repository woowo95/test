// Minnena som följer med överlämningen (steg 12.1.248): det byn räknat en gång i timmen och håller i ett minne utanför
// tillståndet (resans poäng, värdet på kartan, sakerna på golvet, blommorna byn vill ha), och kartorna oavrundade (marken,
// skogen, trädens ålder och uttagen). Sparfilen behöver dem inte, men arbetaren som räknar ikapp ska börja med exakt samma
// by som sidan, också mitt i en timme (overlamna i steg.ts). Varje minne är en rad här, som modulen själv lägger till.
import type { State } from './typer';

export interface Timminne { ut: (s: State) => unknown; in: (s: State, v: unknown) => void }
export const TIMMINNEN: Record<string, Timminne> = {};
// talen i en Float32Array eller Uint8Array som text, och tillbaka
export function binUt(a: Float32Array | Uint8Array): string {
  const b = new Uint8Array(a.buffer, a.byteOffset, a.byteLength), d: string[] = [];
  for (let i = 0; i < b.length; i += 8192) d.push(String.fromCharCode(...b.subarray(i, i + 8192)));
  return btoa(d.join(''));
}
export function binIn<T extends Float32Array | Uint8Array>(txt: string, typ: { new (b: ArrayBuffer): T }): T {
  const t = atob(txt), b = new Uint8Array(t.length);
  for (let i = 0; i < t.length; i++) b[i] = t.charCodeAt(i);
  return new typ(b.buffer);
}
export const timminnenUt = (s: State) => { const o: Record<string, unknown> = {}; for (const [k, m] of Object.entries(TIMMINNEN)) { const v = m.ut(s); if (v !== undefined) o[k] = v; } return JSON.stringify(o); };
export function timminnenIn(s: State, txt: string | undefined) {
  if (!txt) return;
  const o = JSON.parse(txt) as Record<string, unknown>;
  for (const [k, v] of Object.entries(o)) TIMMINNEN[k]?.in(s, v);
}
