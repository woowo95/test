// namnskyltarna (steg 12.1.157, Kartbilden och panelerna: Namnskyltarna): varje kolonist på kartan har sitt namn i liten
// text vid figuren, och den som har en roll i byn en liten symbol vid namnet ur registret ROLLSYMBOLER. När kartan är
// utzoomad eller många står tätt göms namnen så att de inte täcker varandra. Ingen ritning här, så att scenariot namnskyltar
// prövar samma regler som bilden (ui/manniskor.ts ritar)
import { ledareOf, prastOf, troOf, type Person, type State } from '../sim';

// rollernas symboler, en rad per roll: har = om personen har rollen, ikon = bildens nyckel i ikoner.ts, namn = det som står
// vid musen. En roll till är en rad till; den första raden personen har ger symbolen
export const ROLLSYMBOLER: { id: string; namn: string; ikon: string; har: (s: State, p: Person) => boolean }[] = [
  { id: 'ledare', namn: 'Byns ledare', ikon: 'roll_ledare', har: (s, p) => ledareOf(s)?.id === p.id },
  { id: 'prast', namn: 'Prästen', ikon: 'roll_prast', har: (s, p) => { const tr = troOf(s, p.tro); return !!tr && prastOf(s, tr)?.id === p.id; } },
];
export const rollAv = (s: State, p: Person) => ROLLSYMBOLER.find(r => r.har(s, p));

// figurens ram i bildrutan (steg 12.1.262): mitten, översta och nedersta punkten, ur hur figuren ritas: platsen, ankaret (0 =
// övre vänstra hörnet, 0,5 = mitten), vridningen (0 eller en kvarts varv, den stående sängen) och spegelvändningen (sx = -1,
// den liggande sängen). Bilden ställer namnskylten och symbolen ur samma ram, så att den som ligger i en säng får namnet mitt
// under sig. Scenariot namnskyltar prövar den
export type FigurRitad = { x: number; y: number; ax: number; ay: number; rot: number; sx: number; w: number; h: number };
export function figurRam(f: FigurRitad): { x: number; topp: number; botten: number } {
  const lx = (0.5 - f.ax) * f.w * f.sx, ly = (0.5 - f.ay) * f.h, c = Math.cos(f.rot), sn = Math.sin(f.rot);
  const cx = f.x + lx * c - ly * sn, cy = f.y + lx * sn + ly * c;
  const hojd = Math.abs(f.h * c) + Math.abs(f.w * sn);
  return { x: cx, topp: cy - hojd / 2, botten: cy + hojd / 2 };
}

export const SKYLT = {
  hojd: 7, // textens höjd i världens punkter (en ruta är 16)
  minSkarm: 9, // namnen syns bara när texten blir minst så här många punkter hög på skärmen; annars är kartan för utzoomad
  luft: 1, // så många punkter i världen mellan två namn
  ikon: 8, // rollsymbolens storlek i världens punkter: symbolerna är 8 × 8 och ritas i hel skala
  avstand: 2, // så många punkter i världen mellan figuren och namnet, lika under fötterna som ovanför huvudet (steg 13.10.5)
};
// var namnet står: nederkanten på namnet under figuren (fot = figurens nedersta punkt), och nederkanten på namnet ovanför den
// valda (topp = det översta som ritas över hen: huvudet, det hen bär där eller symbolen över huvudet)
export const skyltUnder = (fot: number) => fot + SKYLT.avstand + SKYLT.hojd;
export const skyltOver = (topp: number) => topp - SKYLT.avstand;

// en skylt att placera: mitten av nederkanten (x, y) i världens punkter, bredden på texten och om den har en symbol. forst = går
// före de andra (den valda och den under musen har sin stora skylt; därefter rollerna)
export type Skylt = { id: number; x: number; y: number; w: number; ikon?: string; forst?: number };
// vilka skyltar som syns: inga när texten blir för liten på skärmen (skala = världens punkter till skärmens), annars i tur och
// ordning (forst, sedan id, så att samma namn står kvar från bild till bild) de som inte täcker en skylt som redan står
export function synligaSkyltar(skyltar: Skylt[], skala: number, upptaget: { x: number; y: number; w: number; h: number }[] = []): Set<number> {
  const ut = new Set<number>();
  if (SKYLT.hojd * skala < SKYLT.minSkarm) return ut;
  const tagna = [...upptaget], L = SKYLT.luft;
  for (const k of [...skyltar].sort((a, b) => (b.forst ?? 0) - (a.forst ?? 0) || a.id - b.id)) {
    const w = k.w + (k.ikon ? SKYLT.ikon + 1 : 0), r = { x: k.x - w / 2, y: k.y - SKYLT.hojd, w, h: SKYLT.hojd };
    if (tagna.some(o => r.x < o.x + o.w + L && o.x < r.x + r.w + L && r.y < o.y + o.h + L && o.y < r.y + r.h + L)) continue;
    tagna.push(r); ut.add(k.id);
  }
  return ut;
}
