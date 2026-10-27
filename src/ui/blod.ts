import * as PIXI from 'pixi.js';
import { Blodflack, ageIndex, blodNu, blodOf } from '../sim';
import { s, ui } from './lage';
import { TS } from './scen';

// blodet på marken (blod.ts), utseende 3 som Björn valde efter v92: pölar med stänk runt om och släpspår. Alla fläckar ritas
// i ett och samma fält med 8 × 8 punkter på rutan, så att pölar som ligger nära varandra flyter ihop till en större. Färsk är
// pölen mörkröd med mörk kant och blank mitt, efter ett dygn brun och genomskinlig, och när den nästan är borta bara prickar.
// På snö (istiden) blir det en rosa rand runt pölen. De minsta stänken och spårets ände försvinner först
const P = TS / 8;
const FARG: Record<string, [number, number]> = {
  1: [0x8a1212, 1], 2: [0xc8463a, 1], 3: [0x5a0c0c, 1],
  5: [0x701a12, 0.66], 6: [0x460e08, 0.72], 7: [0x622819, 0.32], 0: [0x501e12, 0.22],
  p: [0xd23c48, 0.45], q: [0xcd5a69, 0.22],
};
const hash = (a: number, b: number) => { const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return h - Math.floor(h); };
const krymp = (v: number) => v > 0.7 ? 1 : v > 0.3 ? 0.82 : 0.6;
const droppFarg = (v: number) => v > 0.7 ? '1' : v > 0.3 ? '5' : '7';
const key = (x: number, y: number) => x * 4096 + y; // punkterna utanför kartan (x eller y under 0) ritas inte

export function ritaBlod(g: PIXI.Graphics) {
  const fl = blodOf(s);
  if (!fl.length) return;
  const now = ui.nu, sno = ageIndex(s) === 0;
  // pölarna: klickar (metabollar) som flyter ihop. Sett snett ovanifrån är de lite tillplattade (0,72). Fältet faller brant
  // (fjärde potens), så att klickar som ligger på varandra inte blir en stor rund skiva men nära klickar flyter ihop. Det
  // samlas bara där det märks, punkt för punkt, med hur färskt blodet är där
  const falt = new Map<number, [number, number]>(), klickar: { x: number; y: number; r: number; v: number; mitt: boolean }[] = [];
  const prick = new Map<number, string>(); // stänk, droppar och spår: en färg per punkt
  const satt = (x: number, y: number, k: string) => { if (x >= -0.5 && y >= -0.5) prick.set(key(Math.round(x), Math.round(y)), k); };
  const klick = (x: number, y: number, r: number, v: number, mitt = false) => {
    klickar.push({ x, y, r, v, mitt });
    const R = Math.ceil(r * 2.7);
    for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
      const px = Math.round(x) + i, py = Math.round(y) + j, dx = px - x, dy = (py - y) / 0.72;
      const q = r * r / (dx * dx + dy * dy + 0.01), f = q * q;
      if (f < 0.02 || px < 0 || py < 0) continue;
      const k = key(px, py), a = falt.get(k);
      if (a) { a[0] += f; a[1] += f * v; } else falt.set(k, [f, f * v]);
    }
  };
  for (const b of fl) {
    const v = blodNu(b, now);
    if (v <= 0) continue;
    rita(b, v, b.x * 8, b.y * 8, klick, satt);
  }
  // vilka punkter som är pöl: fältet över 1, med lite brus i kanten
  const inn = new Map<number, number>();
  for (const [k, [f, fv]] of falt) {
    const x = Math.floor(k / 4096), y = k % 4096;
    if (f * (1 + (hash(x, y) - 0.5) * 0.7) >= 1) inn.set(k, fv / f);
  }
  const ar = (x: number, y: number) => inn.has(key(x, y));
  const ut = new Map<string, number[]>();
  const lagg = (x: number, y: number, k: string) => { let l = ut.get(k); if (!l) ut.set(k, l = []); l.push(x, y); };
  // på snö: en rosa rand utanför pölen där blodet sugits upp
  if (sno) for (const [k, v] of inn) {
    if (v < 0.3) continue;
    const x0 = Math.floor(k / 4096), y0 = k % 4096;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = x0 + dx, y = y0 + dy;
      if (x < 0 || y < 0 || ar(x, y) || prick.has(key(x, y))) continue;
      let n = 0; for (let ey = -1; ey <= 1; ey++) for (let ex = -1; ex <= 1; ex++) if (ar(x + ex, y + ey)) n++;
      prick.set(key(x, y), v > 0.7 && n > 2 ? 'p' : 'q');
    }
  }
  for (const [k, c] of prick) if (!inn.has(k)) lagg(Math.floor(k / 4096), k % 4096, c);
  // pölen: mörk kant och blank mitt när den är färsk, brun och genomskinlig efter ett dygn, prickig när den nästan är borta
  for (const [k, v] of inn) {
    const x = Math.floor(k / 4096), y = k % 4096, e = !ar(x - 1, y) || !ar(x + 1, y) || !ar(x, y - 1) || !ar(x, y + 1);
    if (v > 0.7) lagg(x, y, e ? '3' : '1');
    else if (v > 0.3) lagg(x, y, e ? '6' : '5');
    else if (hash(x + 3, y) < 0.6) lagg(x, y, '7');
  }
  // glans: två ljusa punkter uppe till vänster i de stora färska pölarna
  for (const b of klickar) if (b.mitt && b.v > 0.7 && b.r >= 3) {
    const x = Math.round(b.x - b.r * 0.45), y = Math.round(b.y - b.r * 0.4);
    if (ar(x, y) && ar(x + 1, y)) { lagg(x, y, '2'); lagg(x + 1, y, '2'); }
  }
  for (const [k, l] of ut) {
    const f = FARG[k];
    if (!f) continue;
    g.beginFill(f[0], f[1]);
    for (let i = 0; i < l.length; i += 2) g.drawRect(l[i]! * P, l[i + 1]! * P, P, P);
    g.endFill();
  }
}

// en fläck: klickarna i pölens fält och punkterna för stänk, droppar och spår. Allt i punkter (8 på rutan), och bara efter
// fläckens plats, så att den ser likadan ut varje gång den ritas
function rita(b: Blodflack, v: number, cx: number, cy: number, klick: (x: number, y: number, r: number, v: number, mitt?: boolean) => void, satt: (x: number, y: number, k: string) => void) {
  const h = (i: number, j: number) => hash(cx * 3.1 + i, cy * 1.7 + j), sq = Math.sqrt(b.m);
  if (b.f === 'pol') {
    const r = 3 * sq * krymp(v);
    klick(cx, cy, r, v, true);
    const n = b.m > 1 ? 3 : 2; // klickar runt om gör pölen ojämn, fler i en stor
    for (let i = 0; i < n; i++) {
      const vk = h(i, 1) * Math.PI * 2, d = r * (0.6 + 0.4 * h(i, 2));
      klick(cx + Math.cos(vk) * d * 1.2, cy + Math.sin(vk) * d * 0.8, r * (0.4 + 0.25 * h(i, 3)), v);
    }
    return;
  }
  if (b.f === 'stank') {
    // prickar runt platsen, några dubbla bort från mitten. Åt ett håll om fläcken har en riktning
    const n = Math.round(5 + 7 * b.m);
    for (let i = 0; i < n; i++) {
      const vk = b.a !== undefined ? b.a + (h(i, 1) - 0.5) * 2.2 : h(i, 1) * Math.PI * 2, d = 1.5 + h(i, 2) * (3 + 3 * sq), t = h(i, 3);
      if (!(v > 0.7 || (v > 0.3 && t > 0.55) || t > 0.85)) continue;
      const x = cx + Math.cos(vk) * d * 1.3, y = cy + Math.sin(vk) * d * 0.75;
      satt(x, y, droppFarg(v));
      if (t > 0.6 && v > 0.3) satt(x + Math.sign(Math.cos(vk)), y + (Math.abs(Math.sin(vk)) > 0.7 ? Math.sign(Math.sin(vk)) : 0), droppFarg(v * 0.7 + 0.05));
    }
    if (b.m > 1.5) klick(cx, cy, 1.2 * sq * krymp(v), v); // mycket stänk har en liten pöl i mitten
    return;
  }
  if (b.f === 'droppar') {
    const n = Math.round(2 + 3 * b.m);
    for (let i = 0; i < n; i++) {
      const vk = h(i, 1) * Math.PI * 2, d = h(i, 2) * (1.5 + 1.5 * sq), t = h(i, 3);
      if (v < 0.3 && t < 0.5) continue;
      satt(cx + Math.cos(vk) * d * 1.3, cy + Math.sin(vk) * d * 0.75, droppFarg(v));
    }
    return;
  }
  // släpspåret: två strimmor där något dragits bort, glesare längre bort och kortare när det bleknar
  const a = b.a ?? 0, L = 8 + 10 * sq, synlig = v > 0.7 ? 1 : v > 0.3 ? 0.6 : 0.35, nx = -Math.sin(a), ny = Math.cos(a);
  for (let i = 0; i <= L; i++) {
    const f = i / L;
    if (f > synlig || h(i, 7) < f * 0.55) continue;
    const w = Math.sin(f * 7) * 0.6, x = cx + Math.cos(a) * i * 1.1 + nx * w, y = cy + Math.sin(a) * i * 0.8 + ny * w;
    satt(x, y, v > 0.7 ? (f < 0.4 ? '1' : '3') : v > 0.3 ? '6' : '7');
    if (h(i, 9) > 0.35 + f * 0.4) satt(x + nx * 1.6, y + ny * 1.6, v > 0.7 ? '3' : v > 0.3 ? '5' : '0');
  }
}
