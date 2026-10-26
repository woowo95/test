import { clamp } from './slump';
import { Person } from './typer';

// Kunskap är det en person kan, till exempel att skilja kantarellen från spindlingen.
// Den är alltid rätt och glöms bara långsamt om den inte används (se minne.ts).
// Registret: namn = det som står i personens lista, larAv = texten i loggen när någon lärt sig det av en annan
// ("X har lärt sig av Y att …"; minne.ts). Att lära sig själv står i systemet som ger kunskapen (svampen i fynd.ts)
export const KUNSKAPER: Record<string, { namn: string; larAv?: string } | undefined> = {
  svamp: { namn: 'Skilja kantarellen från den giftiga orangea spindlingen', larAv: 'skilja kantarellen från den giftiga spindlingen' },
};
export const kn = (p: Person, k: string) => p.kunskap?.[k]?.v ?? 0;
export function learnK(p: Person, k: string, dv: number, now: number) {
  const e = ((p.kunskap ??= {})[k] ??= { v: 0, t: now });
  e.v = clamp(e.v + dv, 0, 1); e.t = now;
  return e.v;
}
export function useK(p: Person, k: string, now: number) { const e = p.kunskap?.[k]; if (e) e.t = now; }
