// Folket i bild (steg 5.2.3.2): porträttet (64 × 64) och kartfiguren (14 × 20) ur porträttgeneratorn (ui/utseende.ts och
// src/portrattkarna.ts), så att samma person ser likadan ut i porträttraden, i panelen, på personkortet och på kartan.
// Ersätter figurerna ur Porträttstilar (5.1.3.3). Bara palettens färger; konturen är kolets mörkaste ton, och benets
// ljusaste för den man valt. Bilderna sparas efter hur personen ser ut, så att de bara ritas om när något ändrats.
import * as PIXI from 'pixi.js';
import { FARGER } from '../palett';
import { KARNA } from '../portrattkarna';
import type { Skapad } from './utseende';

export type Rikt = 'fram' | 'bak' | 'sida' | 'vast';
export type Ben = 'sta' | 'gang1' | 'gang2' | 'sitta';
export type Arm = 'hanga' | 'gang1' | 'gang2' | 'bara' | 'lyfta' | 'sla' | 'framfor';
// kartfigurens läge (Kartfigurens lägen): riktningen, benen och armarna, och om hen ligger (med täcke när hen sover i en bädd)
export interface Lage { rikt: Rikt; ben: Ben; arm: Arm; ligga?: boolean; tacke?: boolean }
interface Bild { w: number; h: number; px: Int16Array }
const RGBA = FARGER.map(h => parseInt(h.slice(1), 16));
function canvasAv(B: Bild) {
  const c = document.createElement('canvas'); c.width = B.w; c.height = B.h;
  const g = c.getContext('2d')!, img = g.createImageData(B.w, B.h), d = img.data;
  for (let i = 0; i < B.px.length; i++) {
    const v = B.px[i]; if (v < 0) continue;
    const n = RGBA[v]; d[i * 4] = n >> 16; d[i * 4 + 1] = (n >> 8) & 255; d[i * 4 + 2] = n & 255; d[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
// den valda: konturen (kolets mörkaste ton mot det tomma) blir benets ljusaste
function ljusKontur(B: Bild) {
  const px = B.px.slice(), tom = (x: number, y: number) => x < 0 || y < 0 || x >= B.w || y >= B.h || B.px[y * B.w + x] < 0;
  for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) if (B.px[y * B.w + x] === 0 && (tom(x - 1, y) || tom(x + 1, y) || tom(x, y - 1) || tom(x, y + 1))) px[y * B.w + x] = FARGER.length - 1;
  return { ...B, px };
}
const MAX = 3000; // så många bilder sparas; sedan börjar det om (personerna åldras och byter läge)
const figurer = new Map<string, PIXI.Texture>(), portratt = new Map<string, string>();
// handen i figurens bild (punkter från övre vänstra hörnet), till redskapen i arbetena (steg 5.1.9.4, ui/arbetsbild.ts)
const hander = new WeakMap<PIXI.Texture, [number, number]>();
export const figurHand = (t: PIXI.Texture) => hander.get(t);
export function figurTex(q: Skapad, l: Lage, vald: boolean) {
  const k = JSON.stringify(q) + JSON.stringify(l) + vald;
  let t = figurer.get(k);
  if (!t) {
    if (figurer.size > MAX) figurer.clear();
    const B: Bild = KARNA.kartFigur(q, l.rikt, l.ben, l.arm, { ligga: l.ligga, tacke: l.tacke });
    t = PIXI.Texture.from(canvasAv(vald ? ljusKontur(B) : B), { scaleMode: PIXI.SCALE_MODES.NEAREST });
    figurer.set(k, t);
    const h = (B as Bild & { hand?: [number, number] | null }).hand; if (h) hander.set(t, h);
  }
  return t;
}
// porträttet som bildadress, till raden, panelen och personkortet
export function portrattUrl(q: Skapad) {
  const k = JSON.stringify(q);
  let u = portratt.get(k);
  if (!u) {
    if (portratt.size > MAX) portratt.clear();
    u = canvasAv(KARNA.portratt(q)).toDataURL();
    portratt.set(k, u);
  }
  return u;
}
// en bild i HTML: porträttet i punkter, utan utjämning
export const portrattImg = (q: Skapad, cls: string) => `<img class="pf ${cls}" src="${portrattUrl(q)}" alt="" width="64" height="64">`;

// kartfiguren i panelen (steg 5.3.4.3): samma figur som på kartan, framifrån och stående, som rutor i en svg. Med delar
// får varje kroppsdel (ur porträttgeneratorns zoner: huvud, bål, armar, händer, ben, fötter) sin egen grupp med egen färg
// och egna attribut, så att Kropp kan färga de skadade delarna och visa vad som är fel när man trycker
export interface FigurDelar { del(zon: string, x: number): string | undefined; farg(del: string, ton: number): string; attr(del: string): string; titel(del: string): string }
export function figurSvg(q: Skapad, cls: string, namn: string, delar?: FigurDelar) {
  const B: Bild & { zon?: (string | null)[] } = KARNA.kartFigur(q, 'fram', 'sta', 'hanga', { zoner: !!delar });
  const grupper = new Map<string, string>();
  for (let i = 0; i < B.px.length; i++) {
    const v = B.px[i]; if (v < 0) continue;
    const x = i % B.w, y = (i / B.w) | 0, z = B.zon?.[i], d = z && delar ? delar.del(z, x) : undefined;
    grupper.set(d ?? '', (grupper.get(d ?? '') ?? '') + `<rect x="${x}" y="${y}" width="1" height="1" fill="${d ? delar!.farg(d, v) : FARGER[v]}"/>`);
  }
  const inne = [...grupper].map(([d, r]) => d ? `<g ${delar!.attr(d)}><title>${delar!.titel(d)}</title>${r}</g>` : r).join('');
  return `<svg class="${cls}" viewBox="0 0 ${B.w} ${B.h}" shape-rendering="crispEdges" role="img" aria-label="${namn}">${inne}</svg>`;
}
