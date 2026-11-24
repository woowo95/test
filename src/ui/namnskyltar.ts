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
  // platserna ett namn på den som slåss får stå på, i tur och ordning: åt sidan (-1 vänster, 1 höger om figuren, 0 mitt för) och
  // hur långt från platsen under fötterna (världens punkter): under, över huvudet, bredvid figuren och sedan snett bredvid
  flytt: [[0, 0], [0, -29], [-1, -8], [1, -8], [-1, -18], [1, -18], [-1, 2], [1, 2], [-1, -26], [1, -26], [0, 8], [0, -37]] as [number, number][],
  figur: [5, 18], // en figur som slåss: halva bredden och höjden, som namnen helst inte täcker
  avstand: 2, // så många punkter i världen mellan figuren och namnet, lika under fötterna som ovanför huvudet (steg 13.10.5)
};
// var namnet står: nederkanten på namnet under figuren (fot = figurens nedersta punkt), och nederkanten på namnet ovanför den
// valda (topp = det översta som ritas över hen: huvudet, det hen bär där eller symbolen över huvudet)
export const skyltUnder = (fot: number) => fot + SKYLT.avstand + SKYLT.hojd;
export const skyltOver = (topp: number) => topp - SKYLT.avstand;

// en skylt att placera: mitten av nederkanten (x, y) i världens punkter, bredden på texten och om den har en symbol. forst = går
// före de andra (den valda och den under musen har sin stora skylt; därefter rollerna). flytt = platserna namnet får stå på (SKYLT.flytt), för dem som slåss (steg B.19)
export type Skylt = { id: number; x: number; y: number; w: number; ikon?: string; forst?: number; flytt?: [number, number][] };
// vilka skyltar som syns: inga när texten blir för liten på skärmen (skala = världens punkter till skärmens), annars i tur och
// ordning (forst, sedan id, så att samma namn står kvar från bild till bild) de som inte täcker en skylt som redan står
export function synligaSkyltar(skyltar: Skylt[], skala: number, upptaget: { x: number; y: number; w: number; h: number }[] = []): Set<number> {
  const ut = new Set<number>();
  if (SKYLT.hojd * skala < SKYLT.minSkarm) return ut;
  const tagna = [...upptaget], L = SKYLT.luft, [fb, fh] = SKYLT.figur;
  // figurerna som slåss, där de står (innan namnen flyttas)
  const figurer = skyltar.filter(k => k.flytt).map(k => ({ id: k.id, x: k.x - fb, y: k.y - SKYLT.hojd - SKYLT.avstand - fh, w: 2 * fb, h: fh }));
  for (const k of [...skyltar].sort((a, b) => (b.forst ?? 0) - (a.forst ?? 0) || a.id - b.id)) {
    const w = k.w + (k.ikon ? SKYLT.ikon + 1 : 0), ram = ([sida, dy]: [number, number]) => ({ x: k.x + sida * (w / 2 + fb + 1) - w / 2, y: k.y + dy - SKYLT.hojd, w, h: SKYLT.hojd });
    type Ram = ReturnType<typeof ram>;
    const krock = (r: Ram, o: Ram) => r.x < o.x + o.w + L && o.x < r.x + r.w + L && r.y < o.y + o.h + L && o.y < r.y + r.h + L;
    const fria = (k.flytt ?? [[0, 0] as [number, number]]).map(ram).filter(r => !tagna.some(o => krock(r, o)));
    if (!fria.length) continue;
    // den första lediga platsen som täcker minst av figurerna
    const tackt = (r: Ram) => figurer.reduce((a, o) => a + Math.max(0, Math.min(r.x + r.w, o.x + o.w) - Math.max(r.x, o.x)) * Math.max(0, Math.min(r.y + r.h, o.y + o.h) - Math.max(r.y, o.y)), 0);
    const r = k.flytt ? fria.reduce((a, b) => (tackt(b) < tackt(a) ? b : a)) : fria[0];
    tagna.push(r); ut.add(k.id); k.x = r.x + w / 2; k.y = r.y + SKYLT.hojd;
  }
  return ut;
}
